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

diff --git a/packages/runtime-core/__tests__/apiAsyncComponent.spec.ts b/packages/runtime-core/__tests__/apiAsyncComponent.spec.ts
index 5dc78cdb431..fb7fb7752e9 100644
--- a/packages/runtime-core/__tests__/apiAsyncComponent.spec.ts
+++ b/packages/runtime-core/__tests__/apiAsyncComponent.spec.ts
@@ -442,6 +442,90 @@ describe('api: defineAsyncComponent', () => {
     expect(serializeInner(root)).toBe('resolved')
   })
 
+  test('should not call errorHandler after unmount (timeout)', async () => {
+    const Foo = defineAsyncComponent({
+      loader: () => new Promise(() => {}),
+      timeout: 50,
+    })
+
+    const show = ref(true)
+    const root = nodeOps.createElement('div')
+    const handler = vi.fn()
+    const app = createApp({
+      render: () => (show.value ? h(Foo) : null),
+    })
+    app.config.errorHandler = handler
+    app.mount(root)
+
+    show.value = false
+    await nextTick()
+
+    await timeout(60)
+    expect(handler).not.toHaveBeenCalled()
+  })
+
+  test('should not call errorHandler after unmount (loader error)', async () => {
+    const Foo = defineAsyncComponent({
+      loader: () => Promise.reject(new Error('load failed')),
+    })
+
+    const show = ref(true)
+    const root = nodeOps.createElement('div')
+    const handler = vi.fn()
+    const app = createApp({
+      render: () => (show.value ? h(Foo) : null),
+    })
+    app.config.errorHandler = handler
+    app.mount(root)
+
+    show.value = false
+    await nextTick()
+
+    await timeout()
+    expect(handler).not.toHaveBeenCalled()
+  })
+
+  test('should retry loader after rejected loader is ignored after unmount', async () => {
+    let reject!: (err: Error) => void
+    let resolve!: (comp: Component) => void
+
+    const loader = vi.fn(
+      () =>
+        new Promise<Component>((_resolve, _reject) => {
+          resolve = _resolve
+          reject = _reject
+        }),
+    )
+
+    const Foo = defineAsyncComponent({ loader })
+    const show = ref(true)
+    const root = nodeOps.createElement('div')
+    const handler = vi.fn()
+
+    const app = createApp({
+      render: () => (show.value ? h(Foo) : null),
+    })
+    app.config.errorHandler = handler
+    app.mount(root)
+
+    show.value = false
+    await nextTick()
+
+    reject(new Error('load failed'))
+    await timeout()
+
+    expect(handler).not.toHaveBeenCalled()
+
+    show.value = true
+    await nextTick()
+
+    expect(loader).toHaveBeenCalledTimes(2)
+
+    resolve!(() => 'resolved')
+    await timeout()
+    expect(serializeInner(root)).toBe('resolved')
+  })
+
   test('with suspense', async () => {
     let resolve: (comp: Component) => void
     const Foo = defineAsyncComponent(
diff --git a/packages/runtime-core/src/apiAsyncComponent.ts b/packages/runtime-core/src/apiAsyncComponent.ts
index e594944718a..66cb15a27ac 100644
--- a/packages/runtime-core/src/apiAsyncComponent.ts
+++ b/packages/runtime-core/src/apiAsyncComponent.ts
@@ -11,6 +11,7 @@ import { isFunction, isObject } from '@vue/shared'
 import type { ComponentPublicInstance } from './componentPublicInstance'
 import { type VNode, createVNode } from './vnode'
 import { defineComponent } from './apiDefineComponent'
+import { onUnmounted } from './apiLifecycle'
 import { warn } from './warning'
 import { ref } from '@vue/reactivity'
 import { ErrorCodes, handleError } from './errorHandling'
@@ -201,14 +202,24 @@ export function defineAsyncComponent<
       const error = ref()
       const delayed = ref(!!delay)
 
+      let timeoutTimer: ReturnType<typeof setTimeout> | undefined
+      let delayTimer: ReturnType<typeof setTimeout> | undefined
+
+      onUnmounted(() => {
+        if (timeoutTimer != null) clearTimeout(timeoutTimer)
+        if (delayTimer != null) clearTimeout(delayTimer)
+      })
+
       if (delay) {
-        setTimeout(() => {
+        delayTimer = setTimeout(() => {
+          if (instance.isUnmounted) return
           delayed.value = false
         }, delay)
       }
 
       if (timeout != null) {
-        setTimeout(() => {
+        timeoutTimer = setTimeout(() => {
+          if (instance.isUnmounted) return
           if (!loaded.value && !error.value) {
             const err = new Error(
               `Async component timed out after ${timeout}ms.`,
@@ -221,6 +232,7 @@ export function defineAsyncComponent<
 
       load()
         .then(() => {
+          if (instance.isUnmounted) return
           loaded.value = true
           if (instance.parent && isKeepAlive(instance.parent.vnode)) {
             // parent is keep-alive, force update so the loaded component's
@@ -229,6 +241,10 @@ export function defineAsyncComponent<
           }
         })
         .catch(err => {
+          if (instance.isUnmounted) {
+            pendingRequest = null
+            return
+          }
           onError(err)
           error.value = err
         })


