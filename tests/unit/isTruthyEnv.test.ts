import { test, expect } from "vitest";
import { isTruthyEnv } from "../../src/config.js";

// GITPT_DEBUG (a podobné) má být "zapnuto" pro libovolnou non-empty hodnotu
// kromě explicitně vypínajících.

test("'1' zapíná", () => expect(isTruthyEnv("1")).toBe(true));
test("'true' zapíná", () => expect(isTruthyEnv("true")).toBe(true));
test("'yes' zapíná", () => expect(isTruthyEnv("yes")).toBe(true));
test("'0' nezapíná", () => expect(isTruthyEnv("0")).toBe(false));
test("'false' nezapíná", () => expect(isTruthyEnv("false")).toBe(false));
test("'off' nezapíná", () => expect(isTruthyEnv("off")).toBe(false));
test("undefined nezapíná", () => expect(isTruthyEnv(undefined)).toBe(false));
test("prázdný řetězec nezapíná", () => expect(isTruthyEnv("")).toBe(false));
