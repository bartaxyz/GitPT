import { test, expect } from "vitest";
import {
  hasFlag,
  isAmend,
  isAllowEmpty,
  skipsStagedGuard,
} from "../../src/commands/commit/commitFlags.js";

test("hasFlag najde flag i ve tvaru --flag=hodnota", () => {
  expect(hasFlag(["--amend"], "--amend")).toBe(true);
  expect(hasFlag(["--author=Foo"], "--author")).toBe(true);
  expect(hasFlag(["--no-verify"], "--amend")).toBe(false);
});

test("isAmend rozpozná --amend", () => {
  expect(isAmend(["--amend"])).toBe(true);
  expect(isAmend(["--allow-empty"])).toBe(false);
  expect(isAmend([])).toBe(false);
});

test("isAllowEmpty rozpozná --allow-empty", () => {
  expect(isAllowEmpty(["--allow-empty"])).toBe(true);
  expect(isAllowEmpty(["--amend"])).toBe(false);
});

test("skipsStagedGuard platí pro --amend i --allow-empty, jinak ne", () => {
  expect(skipsStagedGuard(["--amend"])).toBe(true);
  expect(skipsStagedGuard(["--allow-empty"])).toBe(true);
  expect(skipsStagedGuard(["--no-verify"])).toBe(false);
  expect(skipsStagedGuard([])).toBe(false);
});
