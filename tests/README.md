# Quality test suite

Manual, model-backed tests for the Apple Foundation Models provider and the
diff-summarization pipeline.

```bash
npm run test:quality
```

These tests run the real on-device `fm` model, so:

- They require **macOS 27+** with the `fm` CLI. On any other platform the suite
  prints `SKIPPED` and exits `0`.
- They are **not** run in CI (no macOS 27 runners) and are not part of
  `npm test` (which stays a fast typecheck).
- They temporarily set the GitPT config to the Apple `system` model and restore
  your previous config afterwards.

## What it checks

**Hard assertions** (deterministic — fail the suite):

- token counting and the reported context window (4096),
- a diff that already fits is returned unchanged,
- an over-budget diff is summarized to fit the window and ends up smaller,
- lockfiles are condensed to a one-line note rather than enumerated.

**Soft assertions** (non-deterministic model output — reported, never fail):

- the generated commit message is non-empty, single-line, and uses
  conventional-commit format.

The generated commit message is printed per fixture for manual review, since
response quality can't be asserted deterministically.

## Fixtures

`tests/fixtures/*.patch` are unified diffs covering the cases that matter:

- **Real diffs** pulled from GitPT's own git history (`01`–`05`): a focused
  bugfix, a small feature, a multi-file feature, a feature with a real
  dependency/lockfile change, and a refactor. These exercise message quality on
  real code.
- **Synthetic diffs** (`06`, `07`) for pure mechanics: an extreme lockfile churn
  and a single oversized file (hunk splitting).

`expectations.json` maps each fixture to its origin commit, the real commit
message (reference), and what a good message should mention — printed during the
run so generated vs. reference can be compared by eye.

Add new `.patch` files (and optionally an `expectations.json` entry) and they
are picked up automatically.
