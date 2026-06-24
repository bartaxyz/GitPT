import { importDist } from "../apple-foundation-models/harness.mjs";

/**
 * Resolve whether the local-model benchmark can run, shared by the local runner
 * and the run-all runner so the availability logic lives in one place.
 *
 * Returns one of:
 *   { state: "ready", expected, endpoint, config }  → safe to benchmark
 *   { state: "skip", reason }                        → not configured / server down
 *   { state: "wrong-model", reason }                 → server up, expected model not loaded
 */
export const localModelStatus = async () => {
  const { getConfig } = await importDist("config.js");
  const { customLLMEndpoint: endpoint, model } = getConfig();

  // Pinned to one model; default to the configured one, allow an override.
  const expected = process.env.BENCH_MODEL || model;

  if (!endpoint || !expected) {
    return {
      state: "skip",
      reason: "no local endpoint/model configured (run `gitpt setup`)",
    };
  }

  let models = null;
  try {
    const origin = new URL(endpoint).origin;
    const res = await fetch(`${origin}/api/v0/models`);
    if (res.ok) models = (await res.json())?.data ?? [];
  } catch {
    models = null;
  }

  if (models === null) {
    return { state: "skip", reason: `local server not reachable at ${endpoint}` };
  }

  const loaded = models.filter((m) => m.state === "loaded").map((m) => m.id);
  if (!loaded.includes(expected)) {
    return {
      state: "wrong-model",
      reason: `expected "${expected}" but loaded: ${loaded.join(", ") || "(none)"}`,
    };
  }

  return {
    state: "ready",
    expected,
    endpoint,
    config: { provider: "local", model: expected, customLLMEndpoint: endpoint },
  };
};
