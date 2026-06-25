import { test, expect } from "vitest";
import { HOOK_SCRIPT } from "../../src/commands/hook/index.js";

// Hook se spouští před KAŽDÝM commitem. Když by selhal, git commit zruší.
// Tyhle testy hlídají, že nainstalovaný hook commit nikdy nezablokuje.

test("hook nikdy nezablokuje commit (končí na || true)", () => {
  expect(HOOK_SCRIPT).toContain("|| true");
});

test("gitpt se spustí jen když je v PATH (command -v gitpt)", () => {
  expect(HOOK_SCRIPT).toContain("command -v gitpt");
});
