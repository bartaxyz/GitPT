# Record a real end-to-end gitpt flow on Apple Foundation Models.
#   vhs assets/demo.tape    (run from repo root; writes assets/demo.gif)
# Needs macOS 27+ with `fm`, and gitpt set to Apple: gitpt model

Output assets/demo.gif

Set Shell "zsh"
Set FontSize 18
Set Width 1200
Set Height 520
Set Padding 24
Set TypingSpeed 55ms
Set Theme "Catppuccin Mocha"

Hide
Type "export EDITOR=vim VISUAL=vim"
Enter
Type `REPO="$PWD"`
Enter
Type `rm -rf /tmp/gitpt-demo && mkdir -p /tmp/gitpt-demo && cd /tmp/gitpt-demo || exit 1`
Enter
Type "git init -q && git config user.email demo@example.com && git config user.name 'GitPT Demo'"
Enter
Type "git commit -q --allow-empty -m 'chore: init'"
Enter
Type "mkdir src"
Enter
Type `cp "$REPO"/assets/demo-src/*.ts src/`
Enter
# Warm the model so the recording isn't a cold start.
Type "echo hi | fm respond --no-stream --model system >/dev/null 2>&1"
Enter
Sleep 14s
Type "clear"
Enter
Show

Type "gitpt add ."
Enter
Sleep 1.5s
Type "gitpt commit"
Enter

# Summarization (build-demo.mjs speeds up only this wait).
Sleep 24s

Sleep 2s
Enter
Sleep 4s
Type ":wq"
Enter
Sleep 4s
