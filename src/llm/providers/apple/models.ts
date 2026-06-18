import { spawnSync } from "child_process";

export const CANDIDATE_MODELS = [
  {
    id: "system",
    name: "Apple On-Device Foundation Model",
    context_length: 4096,
  },
  { id: "pcc", name: "Private Cloud Compute (PCC)" },
];

export const probeModel = (
  modelId: string
): { available: boolean; reason?: string } => {
  const result = spawnSync("fm", ["available", "--model", modelId], {
    encoding: "utf-8",
  });

  if (result.error) {
    return { available: false, reason: "fm-missing" };
  }

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  const available =
    /available/i.test(output) && !/not available|error/i.test(output);

  return { available, reason: output.trim() };
};

export const isAppleModelAvailable = (modelId: string): boolean =>
  probeModel(modelId).available;
