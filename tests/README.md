# Apple Foundation Models test suite

Manual, model-backed tests for the Apple Foundation Models provider and the
diff-summarization pipeline. This suite is Apple-specific: it runs the on-device
`fm` model. Other providers would get their own suite alongside it.

```bash
npm run test:apple
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
  conventional-commit format;
- its type matches the fixture's expected `type` (when set);
- it mentions at least one of the fixture's expected `mentions` keywords.

The generated commit message is printed per fixture for manual review, since
response quality can't be asserted deterministically.

## Benchmark

```bash
npm run bench:apple            # 3 runs per fixture (default)
BENCH_RUNS=5 npm run bench:apple
```

The benchmark measures **commit-message quality** rather than pass/fail. For each
fixture it computes the context once, samples the final generation `BENCH_RUNS`
times, and scores each message in two buckets:

- **Guardrail** — `format`: a valid single-line conventional subject within 72
  chars. This should always read ~100%; a drop means something *broke*, not that
  quality dipped. It is **not** part of the headline.
- **Quality** (the headline) — mean of:
  - **type** — matches the expected conventional type. `expectations.json` may
    list a *set* (`"type": ["perf","refactor"]`) where the type is genuinely
    ambiguous (the diff rarely encodes the author's intent).
  - **mention** — contains an expected keyword (a weak proxy; embedding-based
    similarity is the planned replacement).

It prints a per-fixture table (`format` guardrail + `type`/`mention` + `quality`)
and the sampled messages. The committed `results.md` snapshots mean a re-run's git
diff *is* the before/after. Use it to validate edits to
`commit/context/systemPrompt.ts`.

## Snapshots and the CI gate

A successful benchmark run writes one directory per fixture under
`tests/snapshots/<fixture>/`:

- `prompt.md` — the **assembled** prompt actually sent, as `## System` +
  `## User`. The system block is `systemPrompt` **plus the commitlint rules**
  (built by the shared `buildCommitPrompt`, so it can't drift from the real
  command); the user block is `userPrompt(diff)` with the raw diff inlined.
  Deterministic — only changes when the prompt or that fixture changes.
- `results.md` — the scores table + sampled messages. Non-deterministic; its
  git diff across runs *is* the results delta (e.g. v1 → v2).

Both are human-readable and diffable in a PR. (Summarization is intentionally
out of scope: for over-budget diffs the prompt snapshot uses the raw diff, not
the per-run summary.)

CI (`.github/workflows/ci.yml` → `npm run check:prompt`) is **deterministic and
model-free**: it re-renders each fixture's `prompt.md` from source and fails if
any differs, or if a fixture was added/removed. So the prompt (or a fixture)
can't change without a fresh local benchmark and updated snapshots. The benchmark
itself stays local — only the prompt check runs in CI.

## Fixtures

`tests/fixtures/*.patch` are unified diffs, deliberately kept lean — each one
either trips the model or exercises a mechanic. All-green, low-signal cases were
pruned. The set is non-contiguous (gaps are pruned fixtures); numbers are stable
so snapshots don't churn.

- **Real diffs** from GitPT's own git history (`01`, `03`, `05`, `09`): a focused
  bugfix, an over-budget multi-file feature (summarization path), a refactor, and
  a multi-file fix.
- **Synthetic diffs** (`06`, `07`, `20`) for specific behaviours: an extreme
  lockfile churn (condensing), a single oversized file (hunk splitting), and a
  multi-file removal where the model mislabels dead-code cleanup as a `fix` and
  misses the feature actually removed.
- **External MIT diffs** (`12`, `13`, `15`, `18`) — real commits from
  MIT-licensed repos (see `ATTRIBUTION.md`), each a type/subject the model tends
  to get wrong (perf-vs-refactor, test, post-unmount fix, dynamic prefix).

`expectations.json` maps each fixture to its origin commit, the real commit
message (reference), the expected conventional `type` (a *set* when genuinely
ambiguous), and what a good message should mention — printed during the run so
generated vs. reference can be compared by eye.

Add new `.patch` files (and optionally an `expectations.json` entry) and they
are picked up automatically.
