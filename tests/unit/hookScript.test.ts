import { test, expect } from "vitest";
import { HOOK_SCRIPT } from "../../src/commands/hook/index.js";

// The hook runs before EVERY commit. If it fails, git aborts the commit.
// These tests guard that the installed hook never blocks a commit.

test("hook never blocks a commit (ends with || true)", () => {
  expect(HOOK_SCRIPT).toContain("|| true");
});

test("gitpt only runs when it's on PATH (command -v gitpt)", () => {
  expect(HOOK_SCRIPT).toContain("command -v gitpt");
});
