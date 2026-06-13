export const userPrompt = (context: string, template?: string) => {
  const intro = `Generate a pull request title and description for the following changes:

${context}`;

  if (template) {
    return `${intro}

This repository provides the pull request description template below. Use it to structure the description:
- Keep its section headings, ordering, and any checklists or tables intact.
- Fill each section in based on the changes above.
- Remove HTML comments (\`<!-- ... -->\`) — they are author instructions, not content.
- For checklists, tick (\`[x]\`) items the changes satisfy and leave the rest unchecked.
- Omit a section only if it clearly does not apply.

--- PR TEMPLATE START ---
${template}
--- PR TEMPLATE END ---

Format your response exactly like this:
Title: <concise title following the title rules>
Description:
<the filled-in template, in Markdown>
`;
  }

  return `${intro}

Format your response exactly like this example:
Title: Add user authentication with JWT
Description:
## Summary
This PR adds user authentication using JWT tokens.

## Changes
- Implement login and registration endpoints
- Add JWT generation and validation
- Update user model with password hashing
- Add authorization middleware

## How to test
1. Register a new user with \`/api/register\`
2. Login with the new user credentials
3. Use the returned token to access protected endpoints
`;
};
