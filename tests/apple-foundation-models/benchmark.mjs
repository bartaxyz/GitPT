import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import {
  distDir,
  fixturesDir,
  importDist,
  isSupported,
  withConfig,
} from "./harness.mjs";

const snapshotsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "snapshots"
);

if (!isSupported()) {
  console.log(
    chalk.yellow(
      "SKIPPED: benchmark needs the Apple Foundation Models CLI ('fm') on macOS 27+."
    )
  );
  process.exit(0);
}

if (!existsSync(join(distDir, "config.js"))) {
  console.error(
    chalk.red("dist/ not built. Run `npm run bench:apple` (it builds first).")
  );
  process.exit(1);
}

const { prepareCommitContext } = await importDist("commands/commit/summarizeDiff.js");
const { generateCommitMessage } = await importDist("commands/commit/generateCommitMessage.js");
const { buildCommitPrompt } = await importDist("commands/commit/context/buildPrompt.js");

const RUNS = Math.max(1, Number(process.env.BENCH_RUNS) || 3);
const MAX_LEN = 72;
const CONVENTIONAL = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\(.+\))?!?: .+/;
const COLUMNS = ["format", "type", "mention"];
const QUALITY = ["type", "mention"];
const CONCURRENCY = Math.max(1, Number(process.env.BENCH_CONCURRENCY) || 6);

const pool = async (items, limit, fn) => {
  const out = Array.from({ length: items.length });
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return out;
};

const expectations = JSON.parse(
  readFileSync(join(fixturesDir, "expectations.json"), "utf-8")
);
const FILTER = process.env.BENCH_FILTER || "";
const fixtures = readdirSync(fixturesDir)
  .filter((f) => f.endsWith(".patch") && f.includes(FILTER))
  .sort();

const scoreMessage = (message, expected) => {
  const checks = {
    format:
      CONVENTIONAL.test(message) &&
      !message.includes("\n") &&
      message.length <= MAX_LEN,
  };
  const type = (message.match(/^(\w+)(\(.+\))?!?:/) || [])[1];
  if (expected?.type) {
    const accepted = Array.isArray(expected.type) ? expected.type : [expected.type];
    checks.type = accepted.includes(type);
  }
  if (expected?.mentions) {
    const lower = message.toLowerCase();
    checks.mention = expected.mentions.some((m) => lower.includes(m));
  }
  return checks;
};

const pct = (passed, total) =>
  total === 0 ? null : Math.round((100 * passed) / total);
const cell = (value) => (value === null ? "-" : `${value}%`).padStart(8);
const tint = (text, value) => {
  if (value === null) return chalk.gray(text);
  if (value >= 80) return chalk.green(text);
  if (value >= 50) return chalk.yellow(text);
  return chalk.red(text);
};

const fmtMs = (ms) => {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
};

const renderPrompt = (diff) => {
  const { system, user } = buildCommitPrompt(diff);
  return `## System\n\n${system}\n\n## User\n\n${user}\n`;
};

const renderResults = (file, scores, messages) => {
  const ref = expectations[file]?.reference;
  const cols = [...COLUMNS, "quality"];
  return [
    `# ${file}`,
    "",
    "- model: apple/system",
    `- runs: ${RUNS}`,
    ...(ref ? [`- reference: \`${ref}\``] : []),
    "",
    `| ${cols.join(" | ")} |`,
    `| ${cols.map(() => "---").join(" | ")} |`,
    `| ${cols.map((k) => (scores[k] == null ? "-" : `${scores[k]}%`)).join(" | ")} |`,
    "",
    "## Samples",
    "",
    ...messages.map((m) => `- \`${m}\``),
    "",
  ].join("\n");
};

const passed = await withConfig({ provider: "apple", model: "system" }, async () => {
  console.log(chalk.bold("\nApple Foundation Models - commit message benchmark"));
  console.log(
    chalk.gray(
      `model: system   runs per fixture: ${RUNS}   concurrency: ${CONCURRENCY}\n`
    )
  );

  const t0 = Date.now();

  const contexts = [];
  for (const file of fixtures) {
    const diff = readFileSync(join(fixturesDir, file), "utf-8");
    contexts.push({ file, diff, context: await prepareCommitContext(diff) });
  }
  const summarizeMs = Date.now() - t0;

  const tasks = [];
  contexts.forEach((_, fi) => {
    for (let i = 0; i < RUNS; i++) tasks.push(fi);
  });
  let done = 0;
  const genStart = Date.now();
  const generated = await pool(tasks, CONCURRENCY, async (fi) => {
    const message = (await generateCommitMessage(contexts[fi].context)).trim();
    process.stdout.write(chalk.gray(`\r  generating ${++done}/${tasks.length}   `));
    return { fi, message };
  });
  process.stdout.write("\n");
  const generateMs = Date.now() - genStart;

  const messagesByFixture = contexts.map(() => []);
  for (const g of generated) messagesByFixture[g.fi].push(g.message);

  const results = contexts.map(({ file, diff }, fi) => {
    const expected = expectations[file];
    const messages = messagesByFixture[fi];
    const agg = {};
    const total = {};
    for (const message of messages) {
      for (const [key, ok] of Object.entries(scoreMessage(message, expected))) {
        agg[key] = (agg[key] || 0) + (ok ? 1 : 0);
        total[key] = (total[key] || 0) + 1;
      }
    }
    const scores = {};
    for (const key of Object.keys(total)) scores[key] = pct(agg[key], total[key]);
    let qp = 0;
    let qt = 0;
    for (const key of QUALITY) {
      if (total[key]) {
        qp += agg[key];
        qt += total[key];
      }
    }
    scores.quality = pct(qp, qt);
    return { file, diff, messages, scores, agg, total };
  });

  const width = 36 + 8 * COLUMNS.length + 9;
  console.log(
    "\n" +
      chalk.bold(
        "  " +
          "fixture".padEnd(36) +
          COLUMNS.map((k) => k.padStart(8)).join("") +
          "quality".padStart(9)
      )
  );
  console.log(chalk.gray("  " + "-".repeat(width)));

  const grand = {};
  const grandTotal = {};
  for (const { file, scores, agg, total } of results) {
    for (const key of Object.keys(total)) {
      grand[key] = (grand[key] || 0) + agg[key];
      grandTotal[key] = (grandTotal[key] || 0) + total[key];
    }
    const cols = COLUMNS.map((k) => tint(cell(scores[k] ?? null), scores[k] ?? null)).join("");
    console.log("  " + file.padEnd(36) + cols + tint(cell(scores.quality), scores.quality).padStart(9));
  }

  console.log(chalk.gray("  " + "-".repeat(width)));
  const overallOf = (keys) => {
    let p = 0;
    let t = 0;
    for (const k of keys) {
      p += grand[k] || 0;
      t += grandTotal[k] || 0;
    }
    return pct(p, t);
  };
  const overallCols = COLUMNS.map((k) => {
    const value = overallOf([k]);
    return tint(cell(value), value);
  }).join("");
  const overallQuality = overallOf(QUALITY);
  console.log(
    "  " +
      chalk.bold("overall".padEnd(36)) +
      overallCols +
      tint(chalk.bold(cell(overallQuality)), overallQuality).padStart(9)
  );
  console.log(
    chalk.gray(
      "\n  format = guardrail (should read 100%); quality = mean(type, mention)"
    )
  );

  for (const { file, diff, messages, scores } of results) {
    const dir = join(snapshotsDir, file.replace(/\.patch$/, ""));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "prompt.md"), renderPrompt(diff));
    writeFileSync(join(dir, "results.md"), renderResults(file, scores, messages));
  }
  console.log(
    chalk.gray("\nSnapshots updated: tests/snapshots/<fixture>/prompt.md + results.md")
  );
  console.log(
    chalk.gray(
      `Runtime: ${fmtMs(Date.now() - t0)}  (summarize ${fmtMs(summarizeMs)} | ` +
        `generate ${fmtMs(generateMs)} for ${tasks.length} gens @ concurrency ${CONCURRENCY})`
    )
  );

  return true;
});

process.exit(passed ? 0 : 1);
