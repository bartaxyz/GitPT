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

diff --git a/src/routes/article.loader.ts b/src/routes/article.loader.ts
index a1b2c3d..e4f5a6b 100644
--- a/src/routes/article.loader.ts
+++ b/src/routes/article.loader.ts
@@ -14,7 +14,6 @@ export interface ArticleLoaderData {
   article: Article | null;
   author: Author | null;
   dehydratedState?: DehydratedState;
-  prefersDark?: boolean;
   relatedSlugs?: string[];
   tags?: string[];
 }
@@ -41,8 +40,8 @@ export const buildCanonical = (slug: string): string => {
   return `https://example.com/articles/${slug}`;
 };

-export const meta: MetaFunction = ({ data: loaderData, location, matches, params }) => {
-  const { article, author, prefersDark, tags } = (loaderData ?? {}) as ArticleLoaderData;
+export const meta: MetaFunction = ({ data: loaderData, location, params }) => {
+  const { article, author, tags } = (loaderData ?? {}) as ArticleLoaderData;
   const title = article?.title ?? 'Articles';
   const description = article?.excerpt ?? '';
   const { slug } = params;
@@ -58,17 +57,6 @@ export const meta: MetaFunction = ({ data: loaderData, location, matches, params
     slug: slug ?? '',
   });

-  const rootData = matches.find((match) => match.id === 'root')?.data as { theme?: string } | undefined;
-  const logoColor = rootData?.theme === 'dark' ? 'white' : 'black';
-  const logoVariant = prefersDark ? 'inverted' : 'default';
-  const logoPreload = {
-    as: 'image',
-    fetchPriority: 'high',
-    href: `/images/logo/${logoColor}-${logoVariant}.png`,
-    rel: 'preload',
-    tagName: 'link' as const,
-  };
-
   return [
     { title },
     { content: description, name: 'description' },
@@ -76,7 +64,6 @@ export const meta: MetaFunction = ({ data: loaderData, location, matches, params
     { content: title, property: 'og:title' },
     { content: description, property: 'og:description' },
     ...(canonical ? [{ href: canonical, rel: 'canonical', tagName: 'link' }] : []),
-    logoPreload,
     ...preloadLinks,
   ];
 };
diff --git a/src/routes/article.server.ts b/src/routes/article.server.ts
index 1122334..5566778 100644
--- a/src/routes/article.server.ts
+++ b/src/routes/article.server.ts
@@ -33,7 +33,6 @@ export async function loader({ params, request }: LoaderArgs) {
   }

   const cookie = request.headers.get('cookie');
-  const prefersDark = /theme=dark/.test(cookie ?? '');
   const requestInit = cookie ? { headers: { cookie } } : undefined;

   try {
@@ -52,7 +51,6 @@ export async function loader({ params, request }: LoaderArgs) {
         article,
         author,
         dehydratedState: dehydrate(queryClient),
-        prefersDark,
         relatedSlugs,
         tags,
       });
@@ -71,7 +69,6 @@ export async function loader({ params, request }: LoaderArgs) {
       article,
       author,
       dehydratedState: dehydrate(queryClient),
-      prefersDark,
       relatedSlugs,
       tags,
     });


