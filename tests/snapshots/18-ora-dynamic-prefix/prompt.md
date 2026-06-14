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

diff --git a/index.js b/index.js
index 60a94d0..8c76d42 100644
--- a/index.js
+++ b/index.js
@@ -188,8 +188,12 @@ class Ora {
 
 	#updateLineCount() {
 		const columns = this.#stream.columns ?? 80;
-		const fullPrefixText = this.#getFullPrefixText(this.#prefixText, '-');
-		const fullSuffixText = this.#getFullSuffixText(this.#suffixText, '-');
+
+		// Use simple approximations for line calculation to avoid calling functions
+		const prefixText = typeof this.#prefixText === 'function' ? '' : this.#prefixText;
+		const suffixText = typeof this.#suffixText === 'function' ? '' : this.#suffixText;
+		const fullPrefixText = (typeof prefixText === 'string' && prefixText !== '') ? prefixText + '-' : '';
+		const fullSuffixText = (typeof suffixText === 'string' && suffixText !== '') ? '-' + suffixText : '';
 		const fullText = ' '.repeat(this.#indent) + fullPrefixText + '--' + this.#text + '--' + fullSuffixText;
 
 		this.#lineCount = 0;
@@ -238,9 +242,9 @@ class Ora {
 			frame = chalk[this.color](frame);
 		}
 
-		const fullPrefixText = (typeof this.#prefixText === 'string' && this.#prefixText !== '') ? this.#prefixText + ' ' : '';
+		const fullPrefixText = this.#getFullPrefixText(this.#prefixText, ' ');
 		const fullText = typeof this.text === 'string' ? ' ' + this.text : '';
-		const fullSuffixText = (typeof this.#suffixText === 'string' && this.#suffixText !== '') ? ' ' + this.#suffixText : '';
+		const fullSuffixText = this.#getFullSuffixText(this.#suffixText, ' ');
 
 		return fullPrefixText + frame + fullText + fullSuffixText;
 	}
diff --git a/test.js b/test.js
index 1ab9238..073b68e 100644
--- a/test.js
+++ b/test.js
@@ -1120,3 +1120,119 @@ test('multiline text with very small console height', t => {
 
 	spinner.stop();
 });
+
+test('frame() should display dynamic prefixText returned by function', t => {
+	let counter = 0;
+	const spinner = ora({
+		text: 'loading',
+		prefixText: () => `Step ${++counter}:`,
+		color: false,
+	});
+
+	const frame1 = spinner.frame();
+	const frame2 = spinner.frame();
+
+	t.true(frame1.includes('Step 1:'));
+	t.true(frame2.includes('Step 2:'));
+	t.not(frame1, frame2);
+});
+
+test('frame() should display dynamic suffixText returned by function', t => {
+	let counter = 0;
+	const spinner = ora({
+		text: 'loading',
+		suffixText: () => `(${++counter}%)`,
+		color: false,
+	});
+
+	const frame1 = spinner.frame();
+	const frame2 = spinner.frame();
+
+	t.true(frame1.includes('(1%)'));
+	t.true(frame2.includes('(2%)'));
+	t.not(frame1, frame2);
+});
+
+test('frame() should display both dynamic prefixText and suffixText from functions', t => {
+	let prefixCounter = 0;
+	let suffixCounter = 0;
+	const spinner = ora({
+		text: 'processing',
+		prefixText: () => `Batch ${++prefixCounter}:`,
+		suffixText: () => `[${++suffixCounter} items]`,
+		color: false,
+	});
+
+	const frame1 = spinner.frame();
+	const frame2 = spinner.frame();
+
+	t.true(frame1.includes('Batch 1:'));
+	t.true(frame1.includes('[1 items]'));
+	t.true(frame2.includes('Batch 2:'));
+	t.true(frame2.includes('[2 items]'));
+	t.not(frame1, frame2);
+});
+
+test('frame() should handle mixed static and dynamic text', t => {
+	let counter = 0;
+	const spinner = ora({
+		text: 'uploading',
+		prefixText: '[SERVER]',
+		suffixText: () => `${++counter}/10`,
+		color: false,
+	});
+
+	const frame1 = spinner.frame();
+	const frame2 = spinner.frame();
+
+	t.true(frame1.includes('[SERVER]'));
+	t.true(frame1.includes('1/10'));
+	t.true(frame2.includes('[SERVER]'));
+	t.true(frame2.includes('2/10'));
+});
+
+test('frame() should handle empty strings returned by functions', t => {
+	let callCount = 0;
+	const spinner = ora({
+		text: 'test',
+		prefixText() {
+			callCount++;
+			return callCount <= 1 ? '' : 'prefix';
+		},
+		suffixText: () => '',
+		color: false,
+	});
+
+	const frame1 = spinner.frame();
+	const frame2 = spinner.frame();
+
+	// First call returns empty string, should have no prefix
+	t.is(frame1.trim(), '⠋ test');
+	// Second call returns 'prefix', should include it
+	t.true(frame2.includes('prefix'));
+});
+
+test('frame() functions should only be called during frame() execution, not during construction', t => {
+	let constructorCalls = 0;
+
+	const spinner = ora({
+		text: 'test',
+		prefixText() {
+			constructorCalls++;
+			return `Called ${constructorCalls}`;
+		},
+		color: false,
+	});
+
+	// Functions should not be called during construction
+	t.is(constructorCalls, 0);
+
+	// Functions should be called when frame() is executed
+	const frame1 = spinner.frame();
+	t.is(constructorCalls, 1);
+	t.true(frame1.includes('Called 1'));
+
+	const frame2 = spinner.frame();
+	t.is(constructorCalls, 2);
+	t.true(frame2.includes('Called 2'));
+});


