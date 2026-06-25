import { test } from "node:test";
import assert from "node:assert";

import { HOOK_SCRIPT } from "../../dist/commands/hook/index.js";

// Hook se spouští před KAŽDÝM commitem. Když by selhal, git commit zruší.
// Tyhle testy hlídají, že nainstalovaný hook commit nikdy nezablokuje.

test("hook nikdy nezablokuje commit (končí na || true)", () => {
  assert.ok(HOOK_SCRIPT.includes("|| true"));
});

test("gitpt se spustí jen když je v PATH (command -v gitpt)", () => {
  assert.ok(HOOK_SCRIPT.includes("command -v gitpt"));
});
