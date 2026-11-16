import { afterEach, expect, test, vi } from "vitest";
import type { GitPTConfig } from "../../src/config.js";
import { AppleProvider } from "../../src/llm/providers/apple/index.js";
import { probeModel } from "../../src/llm/providers/apple/models.js";

vi.mock("../../src/config.js", () => ({ saveConfig: vi.fn() }));
vi.mock("../../src/llm/providers/apple/models.js", () => ({
  CANDIDATE_MODELS: [{ id: "system", name: "Apple On-Device Foundation Model" }],
  probeModel: vi.fn(),
}));

afterEach(() => vi.restoreAllMocks());

test("shows the underlying CLI error when setup finds no available models", async () => {
  const reason = "License not accepted. Run sudo fm license.";
  vi.mocked(probeModel).mockReturnValue({ available: false, reason });
  vi.spyOn(console, "log").mockImplementation(() => {});
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(process, "exit").mockImplementation(() => {
    throw new Error("setup exited");
  });

  await expect(AppleProvider.setup({} as GitPTConfig)).rejects.toThrow("setup exited");
  expect(error.mock.calls.flat().join("\n")).toContain(
    `Apple On-Device Foundation Model: ${reason}`
  );
});
