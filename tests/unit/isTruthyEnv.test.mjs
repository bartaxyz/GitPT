import { test } from "node:test";
import assert from "node:assert";

import { isTruthyEnv } from "../../dist/config.js";

// GITPT_DEBUG (a podobné) má být "zapnuto" pro libovolnou non-empty hodnotu
// kromě explicitně vypínajících.

test("'1' zapíná", () => assert.strictEqual(isTruthyEnv("1"), true));
test("'true' zapíná", () => assert.strictEqual(isTruthyEnv("true"), true));
test("'yes' zapíná", () => assert.strictEqual(isTruthyEnv("yes"), true));
test("'0' nezapíná", () => assert.strictEqual(isTruthyEnv("0"), false));
test("'false' nezapíná", () => assert.strictEqual(isTruthyEnv("false"), false));
test("'off' nezapíná", () => assert.strictEqual(isTruthyEnv("off"), false));
test("undefined nezapíná", () => assert.strictEqual(isTruthyEnv(undefined), false));
test("prázdný řetězec nezapíná", () => assert.strictEqual(isTruthyEnv(""), false));
