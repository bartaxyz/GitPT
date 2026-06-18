import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import chalk from "chalk";
import {
  createReporter,
  distDir,
  fixturesDir,
  importDist,
  isSupported,
  withConfig,
} from "./harness.mjs";

if (!isSupported()) {
  console.log(
    chalk.yellow(
      "SKIPPED: needs the Apple Foundation Models CLI ('fm') on macOS 27+.\n" +
        "Not run in CI (no macOS 27 runners); exits 0 here."
    )
  );
  process.exit(0);
}

if (!existsSync(join(distDir, "config.js"))) {
  console.error(
    chalk.red("dist/ not built. Run `npm run test:apple` (it builds first).")
  );
  process.exit(1);
}

const { prepareCommitContext } = await importDist("commands/commit/summarizeDiff.js");
const { generateCommitMessage } = await importDist("commands/commit/generateCommitMessage.js");
const { countTokens, getContextWindow, RESERVED_OUTPUT_TOKENS } = await importDist("llm/tokenCount.js");
const { systemPrompt } = await importDist("commands/commit/context/systemPrompt.js");
const { userPrompt } = await importDist("commands/commit/context/userPrompt.js");

const CONTEXT_WINDOW = await getContextWindow();
const PROMPT_BUDGET = CONTEXT_WINDOW - RESERVED_OUTPUT_TOKENS;
const CONVENTIONAL = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\(.+\))?!?: .+/;

/** Tokens the real commit prompt uses for a given context string. */
const promptTokens = (context) => countTokens(`${systemPrompt}\n\n${userPrompt(context)}`);

const report = createReporter();

const checkUnits = () => {
  report.section("Unit: token counting and context window");
  report.hard(CONTEXT_WINDOW === 4096, "Apple on-device context window is 4096");
  report.hard(countTokens("hello world") > 0, "countTokens is positive for non-empty input");
  report.hard(
    countTokens("x".repeat(2000)) > countTokens("x".repeat(100)),
    "countTokens grows with input length"
  );
};

const checkFixture = async (file, expected) => {
  report.section(`Fixture: ${file}`);
  if (expected) {
    report.info("origin", expected.origin);
    report.info("reference message", expected.reference);
    report.info("should mention", expected.shouldMention);
  }

  const diff = readFileSync(join(fixturesDir, file), "utf-8");
  const diffTokens = countTokens(diff);
  const overBudget = promptTokens(diff) > PROMPT_BUDGET;
  report.info("diff tokens", diffTokens);
  report.info("over budget", overBudget);

  const context = await prepareCommitContext(diff);

  if (overBudget) {
    const contextTokens = promptTokens(context);
    report.hard(
      contextTokens <= PROMPT_BUDGET,
      `summarized prompt fits the window (${contextTokens} <= ${PROMPT_BUDGET})`
    );
    report.hard(
      countTokens(context) < diffTokens,
      "summarized context is smaller than the diff"
    );
  } else {
    report.hard(context === diff, "diff fits, so context is returned unchanged");
  }

  if (diff.includes("package-lock.json")) {
    report.hard(
      context.includes("dependency lockfile updated"),
      "lockfile condensed to a one-line note"
    );
    report.hard(
      !context.includes('"resolved": "https'),
      "raw lockfile entries not enumerated"
    );
  }

  const message = (await generateCommitMessage(context)).trim();
  report.info("commit message", chalk.cyan(message));
  report.soft(
    message.length > 0 &&
      !message.includes("\n") &&
      CONVENTIONAL.test(message) &&
      message.length <= 72,
    "guardrail: valid conventional subject (<=72, single line)"
  );

  const type = (message.match(/^(\w+)(\(.+\))?!?:/) || [])[1];
  if (expected?.type) {
    const accepted = Array.isArray(expected.type) ? expected.type : [expected.type];
    report.soft(
      accepted.includes(type),
      `type is one of [${accepted.join(", ")}] (got '${type ?? "?"}')`
    );
  }
  if (expected?.mentions) {
    const lower = message.toLowerCase();
    report.soft(
      expected.mentions.some((m) => lower.includes(m)),
      `mentions one of [${expected.mentions.join(", ")}]`
    );
  }
};

const loadExpectations = () => {
  const path = join(fixturesDir, "expectations.json");
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf-8")) : {};
};

const passed = await withConfig({ provider: "apple", model: "system" }, async () => {
  checkUnits();

  const expectations = loadExpectations();
  const filter = process.env.BENCH_FILTER || "";
  const fixtures = readdirSync(fixturesDir)
    .filter((file) => file.endsWith(".patch") && file.includes(filter))
    .sort();

  for (const file of fixtures) {
    try {
      await checkFixture(file, expectations[file]);
    } catch (error) {
      report.hard(false, `${file} threw: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return report.summary();
});

process.exit(passed ? 0 : 1);
