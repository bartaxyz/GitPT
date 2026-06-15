# GitPT

**AI commit messages, built for on-device models.**

![GitPT generating a commit message on-device with Apple Foundation Models](assets/demo.gif)

Runs free and private on Apple Foundation Models, with nothing leaving your Mac. Works with any local or remote model (OpenRouter, Ollama, LM Studio) too. Unlike tools that assume a giant cloud model, GitPT summarizes and condenses your diff to fit small on-device context windows.

Every other git command passes straight through, so `gitpt` is a drop-in replacement for `git`.

## Install

```bash
npm install -g gitpt
# or run once with: npx gitpt
```

## Quick start (on-device, macOS 27+)

```bash
gitpt setup      # choose "Apple Foundation Models" — no API key needed
gitpt add .
gitpt commit     # generates a message from your staged diff, on-device
```

Review or edit the suggested message, and it commits. That's the whole loop, fully offline.

## Models

Switch backends anytime with `gitpt model`:

### Apple Foundation Models (recommended, macOS 27+)

Runs through the built-in `fm` CLI: no API key, no network, fully private. Select **Apple Foundation Models** in `gitpt setup` or `gitpt model`.

> The on-device model has a small context window (~4096 tokens). GitPT summarizes and condenses large diffs to fit, so it works even on big commits.

### OpenRouter

Use any model on [OpenRouter](https://openrouter.ai/) with an API key:

```bash
gitpt setup      # enter your OpenRouter key, then pick a model
```

Small models such as `openai/gpt-4.1-mini` work well (large context, fast, cheap).

### Local LLM

Any OpenAI-compatible endpoint works, including [Ollama](https://ollama.ai/), [LM Studio](https://lmstudio.ai/), [LocalAI](https://localai.io/), and llama.cpp. Select it in `gitpt model`.

## Commits

```bash
gitpt commit                  # generate a message from staged changes
gitpt commit -m "feat: ..."   # skip generation, use your own message
gitpt commit --amend          # any git commit flag works
```

GitPT analyzes your staged diff, generates a message, validates it against commitlint (if configured), and lets you edit before committing.

## Pull requests

With the GitHub CLI (`gh`) installed:

```bash
gitpt pr create                 # AI title + description from your commits
gitpt pr create --draft
gitpt pr create --base develop
gitpt pr create --title "..."   # supply your own title
```

## Using GitPT as a git replacement

Any command GitPT doesn't enhance is passed straight to git, with all flags preserved:

```bash
gitpt status
gitpt checkout -b new-feature
gitpt log --oneline --graph
```

## Commitlint

If your repo uses [commitlint](https://commitlint.js.org/), GitPT detects the config automatically, generates messages that follow your rules, and regenerates if validation fails, so AI messages match your conventions without manual fixups.

## Development

```bash
git clone https://github.com/bartaxyz/GitPT.git
cd GitPT
npm install
npm run build
npm link
```

## License

MIT
