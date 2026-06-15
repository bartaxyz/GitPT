export const summarySystemPrompt = `
You are condensing a fragment of a git diff so a commit message can be written afterwards.

For each changed file, output its path, then 1 to 3 bullets describing the key changes:

<path>
- <key change>
- <key change>

Rules:
- 1 to 3 bullets per file, most significant first. Use a single bullet for a small or single-purpose change; use more only when the file genuinely does several distinct things. Skip trivial edits.
- Keep each bullet under ~12 words.
- Describe the functional change (what was added, removed, refactored, or fixed), not file mechanics.
- Output ONLY the paths and their bullets. No preamble, no commentary, no code fences, no headings, no blank lines.
`;

export const summaryUserPrompt = (diffChunk: string) => `
Summarize the changes in this git diff fragment:

${diffChunk}
`;
