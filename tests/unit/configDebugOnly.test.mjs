import { test } from "node:test";
import assert from "node:assert";

import { DEBUG_ONLY } from "../../dist/commands/config.js";

// `gitpt config` schovává v normálním režimu jen pole z DEBUG_ONLY.
// Hlídáme, že tam contextWindow NENÍ (je to reálné uživatelské nastavení).

test("contextWindow se zobrazuje i mimo debug (není v DEBUG_ONLY)", () => {
  assert.ok(!DEBUG_ONLY.has("contextWindow"));
});

test("debug zůstává jen pro debug mód", () => {
  assert.ok(DEBUG_ONLY.has("debug"));
});
