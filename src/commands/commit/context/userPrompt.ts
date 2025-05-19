export const userPrompt = (diff: string) => `
Generate a single-line commit message for the following git diff:

${diff}
`;
