# GitPT

GitPT (Git Prompt Tool) is a git command alias that writes your commit messages with an LLM, built for on-device models. Use it anywhere you use git: every command it doesn't change passes straight through, so you can replace git with it and lose nothing. The one command that changes is `commit`, which writes the message for you.

Big remote models already write commits fine. The harder case is the small local model on your machine (Apple's Foundation Models, Ollama, LM Studio), which holds only a few thousand tokens. A real diff is much larger, so GitPT summarizes it file by file until it fits the model's context window, then writes the message from that summary. Remote APIs (OpenAI, Anthropic, OpenRouter) work too.

![GitPT generating a commit message](assets/demo.gif)

<sub>The diff is summarized to fit the model's context window before the message is written.</sub>

## Install

```bash
npm install -g gitpt
```

## Setup

```bash
gitpt setup     # pick a model
```

Optional: alias git so GitPT runs everywhere you already type git.

```bash
alias git=gitpt
```

## Use

With plain git, you write the message yourself:

```bash
git add .
git commit -m "fix: handle empty staged diff"   # you write the message
```

With GitPT, you don't:

```bash
gitpt add .
gitpt commit                                    # GitPT writes it from the diff
```

`gitpt commit` reads your staged diff, writes the message, and opens it in your editor. Save and close to commit.

## Commands

- `gitpt commit`: write a commit message from staged changes. Respects `-m` and your commitlint rules.
- `gitpt model`: pick or switch the model. Each provider keeps its own key.
- `gitpt setup` / `gitpt config` / `gitpt reset`: configure, show, or clear settings.
- `gitpt pr create`: draft a pull request title and description with the `gh` CLI (experimental).

## Models

- **On-device**: Apple's Foundation Models on macOS 27 or later (no API key), or any OpenAI-compatible local server such as Ollama or LM Studio.
- **Remote**: OpenAI, Anthropic, OpenRouter. Bring an API key.

## Requests and bugs

Want a feature or hit a bug? [Open an issue](https://github.com/bartaxyz/GitPT/issues).

## License

MIT
