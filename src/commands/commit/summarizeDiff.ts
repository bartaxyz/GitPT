import ora from "ora";
import { getProvider } from "../../llm/registry.js";
import {
  countTokens,
  getContextWindow,
  RESERVED_OUTPUT_TOKENS,
} from "../../llm/tokenCount.js";
import { summarySystemPrompt, summaryUserPrompt } from "./context/summaryPrompt.js";
import { systemPrompt } from "./context/systemPrompt.js";
import { userPrompt } from "./context/userPrompt.js";

const MARGIN = 0.9;
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

const summarizeChunk = async (content: string): Promise<string> => {
  const message = await getProvider().complete({
    system: summarySystemPrompt,
    user: summaryUserPrompt(content),
    maxTokens: 400,
  });

  return message.trim();
};

export const prepareCommitContext = async (diff: string): Promise<string> => {
  const window = getContextWindow();
  if (!Number.isFinite(window)) return diff;

  const fitBudget = Math.floor((window - RESERVED_OUTPUT_TOKENS) * MARGIN);
  if (finalPromptTokens(diff) <= fitBudget) return diff;

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

    const summaryOverhead = countTokens(
      `${summarySystemPrompt}\n\n${summaryUserPrompt("")}`
    );
    const chunkBudget = Math.floor(
      (window - RESERVED_OUTPUT_TOKENS - summaryOverhead) * MARGIN
    );

    const chunks = packChunks(sourceBlocks, chunkBudget);
    const condensedNote = lowSignalLines.length
      ? `, ${lowSignalLines.length} generated file(s) condensed`
      : "";
    spinner.text = `Diff is large (~${totalTokens} tokens). Summarizing ${sourceBlocks.length} source file(s) in ${chunks.length} chunk(s)${condensedNote}...`;

    const summaries: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      spinner.text = `Summarizing chunk ${i + 1}/${chunks.length}: ${chunk.files.join(", ")}`;
      summaries.push(await summarizeChunk(chunk.content));
    }

    const header = `The lines below are per-file summaries of a single commit. Treat them as one related change and write a commit message describing the overall change (not just one file):`;
    let combined = [...summaries.filter(Boolean), ...lowSignalLines].join("\n");

    const framed = () => `${header}\n${combined}`;

    let pass = 0;
    while (finalPromptTokens(framed()) > fitBudget && pass < MAX_REDUCE_PASSES) {
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
        reduced.push(await summarizeChunk(reduceChunks[i].content));
      }
      combined = reduced.filter(Boolean).join("\n");
    }

    if (finalPromptTokens(framed()) > fitBudget) {
      const headerTokens = countTokens(`${systemPrompt}\n\n${userPrompt(`${header}\n`)}`);
      combined = truncateToBudget("summary", combined, fitBudget - headerTokens);
    }

    spinner.succeed(
      `Summarized ${blocks.length} file(s): ~${totalTokens} → ~${countTokens(framed())} tokens`
    );

    return framed();
  } catch (error) {
    spinner.fail("Failed to summarize diff");
    throw error;
  }
};
