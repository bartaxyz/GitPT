export const userPrompt = (context: string) => `
Generate a pull request title and description for the following changes:

${context}

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
