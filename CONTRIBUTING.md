# Contributing

Thanks for working on GitPT. This page covers setup, the checks to run, and how to send a change.

## Setup

```bash
git clone https://github.com/bartaxyz/GitPT.git
cd GitPT
npm install
npm run build
npm link        # point the global `gitpt` at this checkout
```

After `npm link`, the `gitpt` on your PATH runs your build. Rebuild after editing source with `npm run build`, or run `npx tsc --watch` while you work. Undo the link with `npm unlink -g gitpt`.

## Checks

CI runs these three. Pass them before opening a pull request.

```bash
npm test             # type-check (tsc --noEmit)
npm run build        # compile to dist/
npm run check:prompt # verify the commit-prompt snapshots
```

The Apple Foundation Models evals run the real on-device model, so they need macOS 27 or later and are skipped in CI:

```bash
npm run test:apple   # correctness checks against fixture diffs
npm run bench:apple  # message-quality benchmark
```

## Project layout

- `src/commands/`: the CLI commands (`commit`, `pr`, `setup`, `model`, `config`, `reset`).
- `src/llm/providers/`: one folder per provider. A provider extends the base class in `providers/base.ts` and registers in `registry.ts`. Provider-specific logic lives here; nothing else in the codebase branches on the provider.
- `src/commands/commit/summarizeDiff.ts`: the map/reduce that fits a large diff into a small context window.
- `tests/`: the snapshot check and the Apple eval suite with its fixtures.

To add a provider, copy a folder under `src/llm/providers/`, implement the class, and add it to the `PROVIDERS` array in `registry.ts`.

## Commits and pull requests

GitPT uses [Conventional Commits](https://www.conventionalcommits.org/). The type prefix drives the released version:

```
feat: detect the context window for local models
fix: handle an empty staged diff
docs: clarify local-endpoint setup
```

Use `feat!:` or a `BREAKING CHANGE:` footer for a breaking change.

You can write these with GitPT: `gitpt add .` then `gitpt commit`. For the pull request itself, `gitpt pr create` drafts a title and description from your commits.

## Releases

Maintainers publish by drafting a GitHub Release with a new tag, for example `v1.7.0`. The publish workflow builds the package, pushes it to npm, and commits the bumped `package.json` back to the repo.

## Rebuilding the demo

`npm run build:demo` re-records `assets/demo.gif`. It needs macOS 27 with the `fm` CLI and VHS (`brew install vhs`); the rest of the tooling is in devDependencies. The script records a real run, then speeds up only the on-device summarization wait.
