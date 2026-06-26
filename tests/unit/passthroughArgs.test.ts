import { test, expect } from "vitest";
import type { Command } from "commander";
import { passthroughArgs } from "../../src/commands/passthroughArgs.js";

// "Falešná" command — napodobí jen to, co passthroughArgs potřebuje:
//   .args   = tokeny navíc (co uživatel napsal a nejsou to gitpt options)
//   .name() = jméno příkazu (např. "commit")
// `as unknown as Command` jen řekne TypeScriptu: "ber to jako command".
const fakeCommand = (args: string[] | undefined, name = "commit") =>
  ({ args, name: () => name }) as unknown as Command;

test("předá průchozí flag jako --allow-empty", () => {
  expect(passthroughArgs(fakeCommand(["--allow-empty"]))).toEqual(["--allow-empty"]);
});

test("předá víc flagů najednou", () => {
  expect(passthroughArgs(fakeCommand(["--allow-empty", "--no-verify"]))).toEqual([
    "--allow-empty",
    "--no-verify",
  ]);
});

test("odfiltruje vlastní jméno příkazu (commit)", () => {
  expect(passthroughArgs(fakeCommand(["commit", "--amend"]))).toEqual(["--amend"]);
});

test("vrátí prázdné pole, když nejsou žádné argumenty", () => {
  expect(passthroughArgs(fakeCommand(undefined))).toEqual([]);
});
