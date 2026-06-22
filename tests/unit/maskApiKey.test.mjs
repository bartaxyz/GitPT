import { test } from "node:test";
import assert from "node:assert";

// Import the COMPILED function from dist/ (Node can't run .ts directly,
// so we always `npm run build` before running these tests).
import { maskApiKey } from "../../dist/utils/maskApiKey.js";

// Each test() checks one case. assert.strictEqual(actual, expected) makes the
// test FAIL unless the two values are exactly equal.

test("masks a long key showing first 4 and last 4", () => {
  assert.strictEqual(maskApiKey("1234567890abcdef"), "1234...cdef");
});

test("masks a short key entirely", () => {
  assert.strictEqual(maskApiKey("abc"), "***");
});

test("masks a key of exactly 10 chars entirely", () => {
  assert.strictEqual(maskApiKey("0123456789"), "**********");
});

test("handles an empty string", () => {
  assert.strictEqual(maskApiKey(""), "");
});
