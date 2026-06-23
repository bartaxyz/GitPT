import { test, expect } from "vitest";
import { maskApiKey } from "../../src/utils/maskApiKey.js";

test("masks a long key showing first 4 and last 4", () => {
  expect(maskApiKey("1234567890abcdef")).toBe("1234...cdef");
});

test("masks a short key entirely", () => {
  expect(maskApiKey("abc")).toBe("***");
});

test("masks a key of exactly 10 chars entirely", () => {
  expect(maskApiKey("0123456789")).toBe("**********");
});

test("handles an empty string", () => {
  expect(maskApiKey("")).toBe("");
});
