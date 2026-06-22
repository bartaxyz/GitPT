import { test } from "node:test";
import assert from "node:assert";

import { maskApiKey } from "../../dist/utils/maskApiKey.js";

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
