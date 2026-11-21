import ora from "ora";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { getConfig } from "../../config.js";
import { getProvider } from "../../llm/registry.js";
import { countTokens } from "../../llm/tokenCount.js";
import { fitBudget } from "../../llm/budget.js";
import {
  summarySystemPrompt as defaultSystemPrompt,
  summaryUserPrompt   as defaultUserPrompt,
} from "./context/summaryPrompt.js";
import { systemPrompt } from "./context/systemPrompt.js";
import { userPrompt } from "./context/userPrompt.js";

const MAX_REDUCE_PASSES = 3;

const LOW_SIGNAL_PATTERNS: Array<{ test: RegExp; note: string }> = [
  { test: /(^|\/)package-lock\.json$/, note: "dependency lockfile updated" },
  { test: /(^|\/)npm-shrinkwrap\.json$/, note: "dependency lockfile updated" },
  { test: /(^|\/)yarn\.lock$/, note: "dependency lockfile updated" },
  { test: /(^|\/)pnpm-lock\.yaml$/, note: "dependency lockfile updated" },
  { test: /\.lock$/, note: "dependency lockfile updated" },
  { test: /(^|\/)(dist|build|out|coverage)\//, note: "generated output updated" },
  { test: /\.min\.(js|css)$/, note: "minified asset updated" },
  { test: /\.(snap)$/, note: "test snapshot updated" },
  { test: /(^|\/)snapshots?\//, note: "test snapshot updated" },
  { test: /\.(patch|diff)$/, note: "patch file updated" },
];

const lowSignalNote = (file: string): string | null =>
  LOW_SIGNAL_PATTERNS.find((p) => p.test.test(file))?.note ?? null;

interface Block {
  file: string;
  content: string;
  tokens: number;
}

interface Chunk {
  files: string[];
  content: string;
}

export interface CommitContext {
  /** Framed context for the final commit-message LLM call (with header). */
  framed: string;
  /** Raw per-file summary lines + low-signal notes, header-free. */
  entries: string[];
}

/** 
 * Expand `~/` and resolve relative paths against the CWD. 
 */
const resolvePromptPath = (p: string): string => {
  if (p === "~" || p.startsWith("~/")) {
    return resolve(homedir(), p.slice(2));
  }
  return resolve(p);
};

const readPromptFile = (path: string): string => {
  const full = resolvePromptPath(path);
  try {
    return readFileSync(full, "utf-8").trim();
  } catch (err) {
    throw new Error(
      `GitPT: could not read prompt file "${path}" (resolved to "${full}"): ${
        (err as Error).message
      }`,
    );
  }
};

/**
 * Load the effective system prompt and user‑prompt template once per run.
 * Returns `{ system, userTemplate }` where `userTemplate` is `null` when the
 * default (function) prompt should be used.
 */
const loadPrompts = (): { system: string; userTemplate: string | null } => {
  const cfg = getConfig();
  const system = cfg.summarySystemPromptPath
    ? readPromptFile(cfg.summarySystemPromptPath)
    : defaultSystemPrompt;
  const userTemplate = cfg.summaryUserPromptPath
    ? readPromptFile(cfg.summaryUserPromptPath)
    : null;
  return { system, userTemplate };
};

const buildUserPrompt = (template: string | null, content: string): string => {
  if (template === null) return defaultUserPrompt(content);
  // Support an optional {{diff}} (or {{chunk}}) placeholder.
  if (template.includes("{{diff}}") || template.includes("{{chunk}}")) {
    return template
      .replaceAll("{{diff}}", content)
      .replaceAll("{{chunk}}", content);
  }
  // No placeholder → append the diff so the file is still self‑contained.
  return `${template}\n\n${content}`;
};

const finalPromptTokens = (context: string): number =>
  countTokens(`${systemPrompt}\n\n${userPrompt(context)}`);

const splitIntoFileBlocks = (diff: string): string[] =>
  diff.split(/(?=^diff --git )/m).filter((part) => part.trim().length > 0);

const fileNameOf = (block: string): string => {
  const match = block.match(/^diff --git a\/(.+?) b\//m);
  return match ? match[1] : "changes";
};

const truncateToBudget = (file: string, content: string, budget: number): string => {
  if (countTokens(content) <= budget) return content;

  const marker = `\n... [truncated ${file} to fit context] ...\n`;
  let keep = content.length;
  let truncated = content;

  while (countTokens(truncated) > budget && keep > 200) {
    keep = Math.floor(keep * 0.7);
    truncated = content.slice(0, keep) + marker;
  }

  return truncated;
};

const splitBlockByHunks = (file: string, content: string, budget: number): Chunk[] => {
  const firstHunk = content.search(/^@@ /m);
  if (firstHunk < 0) {
    return [{ files: [file], content: truncateToBudget(file, content, budget) }];
  }

  const header = content.slice(0, firstHunk);
  const hunks = content
    .slice(firstHunk)
    .split(/(?=^@@ )/m)
    .filter((h) => h.length > 0);

  const chunks: Chunk[] = [];
  let current = "";

  const flush = () => {
    if (current) {
      chunks.push({ files: [file], content: truncateToBudget(file, header + current, budget) });
      current = "";
    }
  };

  for (const hunk of hunks) {
    if (current && countTokens(header + current + hunk) > budget) flush();
    current += hunk;
  }
  flush();

  return chunks;
};

const packChunks = (blocks: Block[], budget: number): Chunk[] => {
  const chunks: Chunk[] = [];
  let files: string[] = [];
  let content = "";
  let tokens = 0;

  const flush = () => {
    if (content) {
      chunks.push({ files, content });
      files = [];
      content = "";
      tokens = 0;
    }
  };

  for (const block of blocks) {
    if (block.tokens > budget) {
      flush();
      chunks.push(...splitBlockByHunks(block.file, block.content, budget));
      continue;
    }

    if (content && tokens + block.tokens > budget) flush();

    files.push(block.file);
    content += block.content;
    tokens += block.tokens;
  }
  flush();

  return chunks;
};

const summarizeChunk = async (
  content: string,
  prompts: { system: string; userTemplate: string | null },
): Promise<string> => {
  const provider = getProvider();
  const message = await provider.complete({
    system: prompts.system,
    user: buildUserPrompt(prompts.userTemplate, content),
    maxTokens: provider.maxOutputTokens,
  });
  return message.trim();
};

export const prepareCommitContext = async (diff: string): Promise<CommitContext> => {
  const reserved = getProvider().maxOutputTokens;
  const window = await getProvider().getContextWindow();
  if (!Number.isFinite(window)) return { framed: diff, entries: [] };

  const promptBudget = fitBudget(window, reserved);
  const skipFinal = getConfig().skipFinalSummarization === true;

  // Only short-circuit when the final LLM call will actually run — otherwise
  // we still need per-file summaries to emit as a change list.
  if (!skipFinal && finalPromptTokens(diff) <= promptBudget) {
    return { framed: diff, entries: [] };
  }

  const spinner = ora({ text: "Analyzing diff size..." }).start();

  try {
    const blocks: Block[] = splitIntoFileBlocks(diff).map((content) => ({
      file: fileNameOf(content),
      content,
      tokens: countTokens(content),
    }));
    const totalTokens = blocks.reduce((sum, b) => sum + b.tokens, 0);

    const sourceBlocks = blocks.filter((b) => !lowSignalNote(b.file));
    const lowSignalLines = blocks
      .map((b) => {
        const note = lowSignalNote(b.file);
        return note ? `${b.file}: ${note}` : null;
      })
      .filter((line): line is string => line !== null);

    // Load prompts once; use the *actual* prompts (custom or default)
    // for the summarisation-call overhead calculation.
    const prompts = loadPrompts();
    const summaryOverhead = countTokens(
      `${prompts.system}\n\n${prompts.userTemplate ?? defaultUserPrompt("")}`
    );
    const chunkBudget = fitBudget(window, reserved + summaryOverhead);

    const chunks = packChunks(sourceBlocks, chunkBudget);
    const condensedNote = lowSignalLines.length
      ? `, ${lowSignalLines.length} generated file(s) condensed`
      : "";
    spinner.text = `Diff is large (~${totalTokens} tokens). Summarizing ${sourceBlocks.length} source file(s) in ${chunks.length} chunk(s)${condensedNote}...`;

    const summaries: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      spinner.text = `Summarizing to fit the context window (~${window} tokens) — chunk ${i + 1}/${chunks.length}...`;
      summaries.push(await summarizeChunk(chunk.content, prompts));
    }

    const header = `The lines below are per-file summaries of a single commit. Treat them as one related change and write a commit message describing the overall change (not just one file):`;
    let combined = [...summaries.filter(Boolean), ...lowSignalLines].join("\n");

    const framed = () => `${header}\n${combined}`;

    let pass = 0;
    while (finalPromptTokens(framed()) > promptBudget && pass < MAX_REDUCE_PASSES) {
      pass++;
      const lineBlocks: Block[] = combined
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map((line) => ({
          file: "summary",
          content: `${line}\n`,
          tokens: countTokens(line),
        }));
      const reduceChunks = packChunks(lineBlocks, chunkBudget);

      const reduced: string[] = [];
      for (let i = 0; i < reduceChunks.length; i++) {
        spinner.text = `Condensing summary (pass ${pass}, ${i + 1}/${reduceChunks.length})...`;
        reduced.push(await summarizeChunk(reduceChunks[i].content, prompts));
      }
      combined = reduced.filter(Boolean).join("\n");
    }

    if (finalPromptTokens(framed()) > promptBudget) {
      // Budget against the *final commit-message* prompts, not the
      // summarisation prompts: systemPrompt + userPrompt + header.
      const headerTokens = countTokens(
        `${systemPrompt}\n\n${userPrompt(`${header}\n`)}`
      );
      combined = truncateToBudget("summary", combined, promptBudget - headerTokens);
    }

    spinner.succeed(
      `Summarized ${blocks.length} file(s) to fit the context window: ~${totalTokens} → ~${countTokens(framed())} tokens`
    );

    const entries = combined
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return { framed: framed(), entries };
  } catch (error) {
    spinner.fail("Failed to summarize diff");
    throw error;
  }
};
