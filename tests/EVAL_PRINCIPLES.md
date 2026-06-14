# Eval principles

Guiding principles for how we evaluate GitPT's AI output (commit messages today,
more later). Draft — to be refined.

## Philosophy

- **Evaluate the product, not the model.** Score the real task (a diff → a commit
  message), not abstract model benchmarks. The only question that matters is
  whether the output is useful to the user.
- **Programmatic checks gate; judgment grades.** Keep two layers: cheap
  deterministic assertions (format, length, type) that can hard-fail, and a
  quality layer (rubric / LLM-judge) that grades the parts rules can't see.
- **Soft signals warn, never fail.** Non-deterministic model output is reported
  and tracked, never used to fail a build.

## Scoring

- **Don't trust reference matching.** Real commit messages are noisy, and
  keyword/BLEU overlap correlates weakly with human judgment. Measure whether the
  message captures **what changed and why**, not whether it matches a reference.
- **Score criterion-by-criterion.** Analytic rubrics (what, why, type, concise)
  beat a single opaque score — they tell you *which* dimension regressed.
- **Categorize failures.** Track failure modes (wrong type, wrong headline,
  hallucination, too long, style) — not just a number — so trends are diagnostic.

## Non-determinism

- **Sample, don't single-shot.** Run each case several times and report rates,
  with confidence intervals once the dataset is large enough.
- **Make eval runs deterministic.** Use greedy / `temperature: 0` for benchmarking
  so before/after and cross-model numbers are comparable with fewer samples.

## Cross-model

- **Scoring must be model-agnostic.** Comparing models needs a scorer that doesn't
  depend on the model under test.
- **The judge is stronger than the judged.** Never let a model grade itself or its
  peers; use a fixed, more capable judge, and validate it against human labels
  before trusting it.

## Cost and speed are first-class

- **Quality is one axis.** Also measure latency (time to process a diff) and cost
  per generation. Quality-per-cost decides defaults, not quality alone.

## Process

- **Snapshot prompts and results.** Version each prompt (text + hash) and append
  every run to a results history, so "are we improving?" is a diff of numbers tied
  to a prompt diff — not a vibe.
- **Grow the dataset toward statistical signal.** Start small, mine more cases from
  real history, auto-derive expectations where possible, and tag cases by scenario.

## CI

- **Portable eval can gate; local eval cannot.** Cloud-model evals run anywhere and
  may fail CI only on a catastrophic regression (a hard floor). Platform-specific
  evals (e.g. on-device Apple FM) stay local and feed the same history.
