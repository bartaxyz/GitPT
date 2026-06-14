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

diff --git a/packages/svelte/src/internal/client/reactivity/sources.js b/packages/svelte/src/internal/client/reactivity/sources.js
index f374f6a26bf1..218941ab672a 100644
--- a/packages/svelte/src/internal/client/reactivity/sources.js
+++ b/packages/svelte/src/internal/client/reactivity/sources.js
@@ -32,7 +32,6 @@ import {
 } from '#client/constants';
 import * as e from '../errors.js';
 import { legacy_mode_flag, tracing_mode_flag } from '../../flags/index.js';
-import { includes } from '../../shared/utils.js';
 import { tag_proxy } from '../dev/tracing.js';
 import { get_error } from '../../shared/dev.js';
 import { component_context, is_runes } from '../context.js';
@@ -158,7 +157,7 @@ export function set(source, value, should_proxy = false) {
 		(!untracking || (active_reaction.f & EAGER_EFFECT) !== 0) &&
 		is_runes() &&
 		(active_reaction.f & (DERIVED | BLOCK_EFFECT | ASYNC | EAGER_EFFECT)) !== 0 &&
-		(current_sources === null || !includes.call(current_sources, source))
+		(current_sources === null || !current_sources.has(source))
 	) {
 		e.state_unsafe_mutation();
 	}
diff --git a/packages/svelte/src/internal/client/runtime.js b/packages/svelte/src/internal/client/runtime.js
index 87abbd71b69a..8d70eee43cd6 100644
--- a/packages/svelte/src/internal/client/runtime.js
+++ b/packages/svelte/src/internal/client/runtime.js
@@ -90,18 +90,14 @@ export function set_active_effect(effect) {
 /**
  * When sources are created within a reaction, reading and writing
  * them within that reaction should not cause a re-run
- * @type {null | Source[]}
+ * @type {null | Set<Source>}
  */
 export let current_sources = null;
 
 /** @param {Value} value */
 export function push_reaction_value(value) {
 	if (active_reaction !== null && (!async_mode_flag || (active_reaction.f & DERIVED) !== 0)) {
-		if (current_sources === null) {
-			current_sources = [value];
-		} else {
-			current_sources.push(value);
-		}
+		(current_sources ??= new Set()).add(value);
 	}
 }
 
@@ -202,7 +198,7 @@ function schedule_possible_effect_self_invalidation(signal, effect, root = true)
 	var reactions = signal.reactions;
 	if (reactions === null) return;
 
-	if (!async_mode_flag && current_sources !== null && includes.call(current_sources, signal)) {
+	if (!async_mode_flag && current_sources !== null && current_sources.has(signal)) {
 		return;
 	}
 
@@ -540,7 +536,7 @@ export function get(signal) {
 		// we don't add the dependency, because that would create a memory leak
 		var destroyed = active_effect !== null && (active_effect.f & DESTROYED) !== 0;
 
-		if (!destroyed && (current_sources === null || !includes.call(current_sources, signal))) {
+		if (!destroyed && (current_sources === null || !current_sources.has(signal))) {
 			var deps = active_reaction.deps;
 
 			if ((active_reaction.f & REACTION_IS_UPDATING) !== 0) {


