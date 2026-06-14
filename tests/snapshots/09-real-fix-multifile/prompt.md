## System


You are a helpful assistant that generates concise, informative Git commit messages.

Follow these strict rules:
1. Use conventional commit format: type: description
2. Types are: feat, fix, docs, style, refactor, test, chore
3. NO scopes in parentheses - do not use feat(scope)
4. Keep the entire message under 100 characters
5. Use present tense (e.g., "add feature" not "added feature")
6. Be brief but descriptive about WHAT changed
7. Do not include detailed explanations

Critical Rules:
- Return a SINGLE LINE commit message only, with no additional explanations or paragraphs
- Do NOT include a detailed message body section, just the commit title line
- Do NOT use multiple lines, even for a single message

Examples of Good Commit Messages:
- feat: add user authentication system
- fix: resolve crash when opening settings menu
- refactor: simplify data processing pipeline
- docs: update installation instructions in README
- chore: update npm dependencies to latest versions
- style: fix indentation in CSS files
- test: add unit tests for payment processing
- perf: optimize database queries for faster loading
- build: update webpack configuration
- ci: fix GitHub Actions workflow

Examples of Bad Commit Messages:
- added login screen                    ❌ (missing type prefix)
- feat(auth): implement OAuth login     ❌ (using scope parentheses)
- This is a really long commit message that exceeds the limit and contains too much information ❌ (too long)
- feat: Adding user auth
  
  This implements the login page...     ❌ (contains multiple lines)
- "fix: update styling"                 ❌ (includes quotes)


Follow the conventional commit format (type(scope): message)



## User


Generate a single-line commit message for the following git diff:

diff --git a/src/commands/pr/context/userPrompt.ts b/src/commands/pr/context/userPrompt.ts
index 64329dc..42c63a4 100644
--- a/src/commands/pr/context/userPrompt.ts
+++ b/src/commands/pr/context/userPrompt.ts
@@ -1,6 +1,8 @@
-export const userPrompt = `
+export const userPrompt = (context: string) => `
 Generate a pull request title and description for the following changes:
 
+${context}
+
 Format your response exactly like this example:
 Title: Add user authentication with JWT
 Description: 
diff --git a/src/commands/pr/generatePRDetails.ts b/src/commands/pr/generatePRDetails.ts
index 8c8b930..79f9ae3 100644
--- a/src/commands/pr/generatePRDetails.ts
+++ b/src/commands/pr/generatePRDetails.ts
@@ -12,7 +12,7 @@ export const generatePRDetails = async (): Promise<{
   const { model } = getConfig();
 
   const context = getPRContext().join("\n\n");
-  const userPromptWithContext = [userPrompt, context].join("\n\n");
+  const userPromptWithContext = userPrompt(context);
 
   const llmClient = getLLMClient();
 
diff --git a/src/llm/index.ts b/src/llm/index.ts
index 997654f..2347b29 100644
--- a/src/llm/index.ts
+++ b/src/llm/index.ts
@@ -15,8 +15,6 @@ export const getLLMClient = (options?: {
     baseURLOverride ?? customLLMEndpoint ?? OPENROUTER_API_URL
   );
 
-  console.log({ baseURL });
-
   return new openai.OpenAI({
     apiKey,
     baseURL,


