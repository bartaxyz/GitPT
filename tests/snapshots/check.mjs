import { existsSync, readFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import chalk from "chalk";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const fixturesDir = join(here, "..", "fixtures");
const buildPromptPath = join(root, "dist/commands/commit/context/buildPrompt.js");

if (!existsSync(buildPromptPath)) {
  console.error(chalk.red("dist/ not built. Run `npm run build` first."));
  process.exit(1);
}

const { buildCommitPrompt } = await import(pathToFileURL(buildPromptPath).href);

const renderPrompt = (diff) => {
  const { system, user } = buildCommitPrompt(diff);
  return `## System\n\n${system}\n\n## User\n\n${user}\n`;
};

const fixtures = readdirSync(fixturesDir)
  .filter((f) => f.endsWith(".patch"))
  .sort();

const stale = [];
const expected = new Set();

for (const fixture of fixtures) {
  const base = fixture.replace(/\.patch$/, "");
  expected.add(base);
  const snapshotPath = join(here, base, "prompt.md");
  if (!existsSync(snapshotPath)) {
    stale.push(`${base}/prompt.md (missing)`);
    continue;
  }
  const diff = readFileSync(join(fixturesDir, fixture), "utf-8");
  if (readFileSync(snapshotPath, "utf-8").trim() !== renderPrompt(diff).trim()) {
    stale.push(`${base}/prompt.md`);
  }
}

const dirs = readdirSync(here, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);
for (const d of dirs) {
  if (!expected.has(d)) stale.push(`${d}/ (orphaned - fixture removed)`);
}

if (stale.length > 0) {
  console.error(chalk.red("Prompt snapshots are out of date:"));
  for (const s of stale) console.error(chalk.gray(`  - ${s}`));
  console.error(
    chalk.yellow(
      "\nThe prompt or a fixture changed without a fresh benchmark.\n" +
        "Run `npm run bench:apple` locally (macOS 27) and commit tests/snapshots/."
    )
  );
  process.exit(1);
}

console.log(
  chalk.green(`Prompt snapshots up to date (${fixtures.length} fixtures).`)
);
