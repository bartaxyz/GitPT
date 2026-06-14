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

diff --git a/packages/react-dom/src/__tests__/ReactDOMViewTransition-test.js b/packages/react-dom/src/__tests__/ReactDOMViewTransition-test.js
index 1c5b43a18acd..a44b3f5235ee 100644
--- a/packages/react-dom/src/__tests__/ReactDOMViewTransition-test.js
+++ b/packages/react-dom/src/__tests__/ReactDOMViewTransition-test.js
@@ -18,6 +18,7 @@ let act;
 let assertLog;
 let Scheduler;
 let textCache;
+let startTransition;
 
 describe('ReactDOMViewTransition', () => {
   let container;
@@ -31,6 +32,7 @@ describe('ReactDOMViewTransition', () => {
     assertLog = require('internal-test-utils').assertLog;
     Suspense = React.Suspense;
     ViewTransition = React.ViewTransition;
+    startTransition = React.startTransition;
     if (gate(flags => flags.enableSuspenseList)) {
       SuspenseList = React.unstable_SuspenseList;
     }
@@ -176,4 +178,288 @@ describe('ReactDOMViewTransition', () => {
     expect(container.textContent).toContain('Card 2');
     expect(container.textContent).toContain('Card 3');
   });
+
+  describe('ViewTransition event callbacks', () => {
+    let originalGetBoundingClientRect;
+    let originalGetAnimations;
+    let originalAnimate;
+    let originalStartViewTransition;
+
+    beforeEach(() => {
+      // Save originals
+      originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
+      originalGetAnimations = Element.prototype.getAnimations;
+      originalAnimate = Element.prototype.animate;
+      originalStartViewTransition = document.startViewTransition;
+
+      // Mock CSS.escape if it doesn't exist
+      if (typeof CSS === 'undefined') {
+        global.CSS = {escape: str => str};
+      } else if (!CSS.escape) {
+        CSS.escape = str => str;
+      }
+
+      // Mock document.fonts
+      if (!document.fonts) {
+        Object.defineProperty(document, 'fonts', {
+          value: {status: 'loaded', ready: Promise.resolve()},
+          configurable: true,
+        });
+      }
+
+      // Mock getAnimations on Element.prototype (Web Animations API)
+      Element.prototype.getAnimations = function () {
+        return [];
+      };
+
+      // Mock animate on Element.prototype (Web Animations API)
+      Element.prototype.animate = function () {
+        return {cancel() {}, finished: Promise.resolve()};
+      };
+
+      // Mock getBoundingClientRect to return content-length-based sizes
+      // so that hasInstanceChanged can detect updates when text changes.
+      Element.prototype.getBoundingClientRect = function () {
+        const text = this.textContent || '';
+        const width = text.length * 10 + 10;
+        const height = 20;
+        return new DOMRect(0, 0, width, height);
+      };
+
+      // Mock document.startViewTransition
+      document.startViewTransition = function ({update}) {
+        update();
+        return {
+          ready: Promise.resolve(),
+          finished: Promise.resolve(),
+          skipTransition() {},
+        };
+      };
+    });
+
+    afterEach(() => {
+      Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
+      Element.prototype.getAnimations = originalGetAnimations;
+      Element.prototype.animate = originalAnimate;
+      if (originalStartViewTransition) {
+        document.startViewTransition = originalStartViewTransition;
+      } else {
+        delete document.startViewTransition;
+      }
+    });
+
+    // @gate enableViewTransition
+    it('fires onEnter when a ViewTransition mounts', async () => {
+      const onEnter = jest.fn();
+      const startViewTransitionSpy = jest.fn(document.startViewTransition);
+      document.startViewTransition = startViewTransitionSpy;
+
+      function App({show}) {
+        if (!show) {
+          return null;
+        }
+        return (
+          <ViewTransition onEnter={onEnter}>
+            <div>Hello</div>
+          </ViewTransition>
+        );
+      }
+
+      const root = ReactDOMClient.createRoot(container);
+
+      // Initial render without the ViewTransition
+      await act(() => {
+        root.render(<App show={false} />);
+      });
+      expect(onEnter).not.toHaveBeenCalled();
+      expect(startViewTransitionSpy).not.toHaveBeenCalled();
+
+      // Mount the ViewTransition inside startTransition
+      await act(() => {
+        startTransition(() => {
+          root.render(<App show={true} />);
+        });
+      });
+
+      expect(startViewTransitionSpy).toHaveBeenCalled();
+      expect(onEnter).toHaveBeenCalledTimes(1);
+    });
+
+    // @gate enableViewTransition
+    it('fires onExit when a ViewTransition unmounts', async () => {
+      const onExit = jest.fn();
+
+      function App({show}) {
+        if (!show) {
+          return null;
+        }
+        return (
+          <ViewTransition onExit={onExit}>
+            <div>Goodbye</div>
+          </ViewTransition>
+        );
+      }
+
+      const root = ReactDOMClient.createRoot(container);
+
+      // Initial render with the ViewTransition
+      await act(() => {
+        startTransition(() => {
+          root.render(<App show={true} />);
+        });
+      });
+      expect(onExit).not.toHaveBeenCalled();
+
+      // Unmount the ViewTransition inside startTransition
+      await act(() => {
+        startTransition(() => {
+          root.render(<App show={false} />);
+        });
+      });
+
+      expect(onExit).toHaveBeenCalledTimes(1);
+    });
+
+    // @gate enableViewTransition
+    it('fires onUpdate when content inside a ViewTransition changes', async () => {
+      const onUpdate = jest.fn();
+      const onEnter = jest.fn();
+
+      function App({text}) {
+        return (
+          <ViewTransition onUpdate={onUpdate} onEnter={onEnter}>
+            <div>{text}</div>
+          </ViewTransition>
+        );
+      }
+
+      const root = ReactDOMClient.createRoot(container);
+
+      // Initial render
+      await act(() => {
+        startTransition(() => {
+          root.render(<App text="Short" />);
+        });
+      });
+
+      onEnter.mockClear();
+      expect(onUpdate).not.toHaveBeenCalled();
+
+      // Update content inside startTransition (different text length
+      // produces different getBoundingClientRect values in our mock)
+      await act(() => {
+        startTransition(() => {
+          root.render(<App text="Much longer content here" />);
+        });
+      });
+
+      expect(onUpdate).toHaveBeenCalledTimes(1);
+      // onEnter should NOT fire on an update
+      expect(onEnter).not.toHaveBeenCalled();
+    });
+
+    // @gate enableViewTransition
+    it('fires onShare for paired named transitions instead of onEnter/onExit', async () => {
+      const onShareA = jest.fn();
+      const onExitA = jest.fn();
+      const onShareB = jest.fn();
+      const onEnterB = jest.fn();
+
+      function App({page}) {
+        if (page === 'a') {
+          return (
+            <ViewTransition
+              key="a"
+              name="hero"
+              onShare={onShareA}
+              onExit={onExitA}>
+              <div>Page A</div>
+            </ViewTransition>
+          );
+        }
+        return (
+          <ViewTransition
+            key="b"
+            name="hero"
+            onShare={onShareB}
+            onEnter={onEnterB}>
+            <div>Page B</div>
+          </ViewTransition>
+        );
+      }
+
+      const root = ReactDOMClient.createRoot(container);
+
+      // Render page A
+      await act(() => {
+        startTransition(() => {
+          root.render(<App page="a" />);
+        });
+      });
+
+      // Clear any enter callbacks from initial mount
+      onShareA.mockClear();
+      onExitA.mockClear();
+      onShareB.mockClear();
+      onEnterB.mockClear();
+
+      // Switch from page A to page B inside startTransition
+      await act(() => {
+        startTransition(() => {
+          root.render(<App page="b" />);
+        });
+      });
+
+      // onShare should fire on the exiting side (page A)
+      expect(onShareA).toHaveBeenCalledTimes(1);
+      // onExit should NOT fire when share takes precedence
+      expect(onExitA).not.toHaveBeenCalled();
+      // onEnter should NOT fire on the entering side when paired
+      expect(onEnterB).not.toHaveBeenCalled();
+    });
+
+    // @gate enableViewTransition
+    it('fires onEnter when Suspense content resolves', async () => {
+      const onEnter = jest.fn();
+
+      function App() {
+        return (
+          <ViewTransition onEnter={onEnter}>
+            <Suspense fallback={<div>Loading...</div>}>
+              <div>
+                <AsyncText text="Loaded" />
+              </div>
+            </Suspense>
+          </ViewTransition>
+        );
+      }
+
+      const root = ReactDOMClient.createRoot(container);
+
+      // Initial render - content suspends
+      await act(() => {
+        startTransition(() => {
+          root.render(<App />);
+        });
+      });
+
+      assertLog(['Suspend! [Loaded]', 'Suspend! [Loaded]']);
+      // onEnter fires for the fallback appearing
+      const enterCallsAfterFallback = onEnter.mock.calls.length;
+      onEnter.mockClear();
+
+      // Resolve the suspended content
+      await act(() => {
+        resolveText('Loaded');
+      });
+      assertLog(['Loaded']);
+
+      expect(container.textContent).toBe('Loaded');
+      // The reveal of the resolved content should trigger enter
+      // (or it may have triggered on the initial fallback mount)
+      expect(
+        onEnter.mock.calls.length + enterCallsAfterFallback,
+      ).toBeGreaterThanOrEqual(1);
+    });
+  });
 });


