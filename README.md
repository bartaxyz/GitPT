# GitPT

**AI commit messages, built for on-device models.** Free and private on Apple Foundation Models — or bring OpenAI, Anthropic, OpenRouter, or any local model (Ollama, LM Studio).

![GitPT generating a commit message on-device](assets/demo.gif)

<sub>Recorded with Apple Foundation Models running on-device — the diff is summarized to fit its small (~4k token) context window.</sub>

## Install

```bash
npm install -g gitpt
```

## Use

```bash
gitpt setup     # pick a provider — Apple needs no API key
gitpt add .
gitpt commit    # AI commit message from your staged diff
```

Review or edit, and it commits. `gitpt` wraps git, so every other command (`status`, `push`, `checkout`, …) passes straight through.

## Models

Switch anytime with `gitpt model`:

- **Apple Foundation Models** — on-device, no key, fully private (macOS 27+)
- **OpenAI** · **Anthropic** · **OpenRouter** — bring an API key
- **Local** — any OpenAI-compatible endpoint (Ollama, LM Studio, …)

Big diffs are summarized to fit small context windows, and each provider keeps its own key.

## More

- `gitpt pr create` — AI pull-request title + description (needs the `gh` CLI)
- Commitlint-aware — generated messages follow your repo's rules

## License

MIT
