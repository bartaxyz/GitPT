import { test, expect } from "vitest";
import { MARGIN, fitBudget } from "../../src/llm/budget.js";

test("fitBudget = floor((window - reserved) * MARGIN)", () => {
  expect(fitBudget(10000, 1024)).toBe(Math.floor((10000 - 1024) * MARGIN));
});

test("větší rezerva → menší rozpočet", () => {
  expect(fitBudget(10000, 2000)).toBeLessThan(fitBudget(10000, 1024));
});

test("výsledek je celé číslo (zaokrouhlené dolů)", () => {
  expect(Number.isInteger(fitBudget(8193, 1000))).toBe(true);
});

test("MARGIN je 0.9", () => {
  expect(MARGIN).toBe(0.9);
});
