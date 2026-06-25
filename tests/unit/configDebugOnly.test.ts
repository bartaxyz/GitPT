import { test, expect } from "vitest";
import { DEBUG_ONLY } from "../../src/commands/config.js";

// `gitpt config` schovává v normálním režimu jen pole z DEBUG_ONLY.
// Hlídáme, že tam contextWindow NENÍ (je to reálné uživatelské nastavení).

test("contextWindow se zobrazuje i mimo debug (není v DEBUG_ONLY)", () => {
  expect(DEBUG_ONLY.has("contextWindow")).toBe(false);
});

test("debug zůstává jen pro debug mód", () => {
  expect(DEBUG_ONLY.has("debug")).toBe(true);
});
