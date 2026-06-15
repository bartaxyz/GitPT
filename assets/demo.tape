# assets/demo.tape — record a REAL end-to-end `gitpt` flow on Apple Foundation Models.
#
#   brew install vhs        # https://github.com/charmbracelet/vhs
#   vhs assets/demo.tape    # run from the repo root; writes assets/demo.gif
#
# Requirements:
#   - macOS 27+ with the on-device `fm` CLI
#   - gitpt on PATH, configured to Apple Foundation Models:  gitpt model
#
# Runs in a dedicated throwaway repo at /tmp/gitpt-demo (wiped + recreated each
# run, and guarded with `|| exit 1`), so it never touches your real projects.

Output assets/demo.gif

Set Shell "zsh"
Set FontSize 18
Set Width 1200
Set Height 400
Set Padding 24
Set TypingSpeed 55ms
Set Theme "Catppuccin Mocha"

# --------------------------------------------------------------------------
# Hidden setup: a throwaway repo with one unstaged change ready to commit.
# --------------------------------------------------------------------------
Hide

Type "export EDITOR=vim VISUAL=vim"
Enter
Type `rm -rf /tmp/gitpt-demo && mkdir -p /tmp/gitpt-demo && cd /tmp/gitpt-demo || exit 1`
Enter
Type "git init -q && git config user.email demo@example.com && git config user.name 'GitPT Demo'"
Enter
Type "git commit -q --allow-empty -m 'chore: init'"
Enter
Type "mkdir src"
Enter

# committed "before" version
Type "cat > src/session.ts <<'EOF'"
Enter
Type "export function isSessionValid(session: { expiresAt: number }): boolean {"
Enter
Type "  return session.expiresAt > Date.now();"
Enter
Type "}"
Enter
Type "EOF"
Enter
Type "git add -A && git commit -q -m 'feat: add session validation'"
Enter

# the unstaged change we'll add + commit in the demo: guard a missing session
Type "cat > src/session.ts <<'EOF'"
Enter
Type "export function isSessionValid(session?: { expiresAt: number }): boolean {"
Enter
Type "  if (!session) {"
Enter
Type "    return false;"
Enter
Type "  }"
Enter
Type "  return session.expiresAt > Date.now();"
Enter
Type "}"
Enter
Type "EOF"
Enter
Type "clear"
Enter

Show

# --------------------------------------------------------------------------
# The demo: stage, generate a message on-device, accept it, commit.
# --------------------------------------------------------------------------
Type "gitpt add ."
Enter
Sleep 1.5s

Type "gitpt commit"
Enter

# Real on-device generation happens here. Tune to your machine's speed.
Sleep 9s

# Accept the suggestion: Enter opens $EDITOR (vim) pre-filled with the message...
Enter
Sleep 2s

# ...then :wq writes it and quits, which commits.
Type ":wq"
Enter
Sleep 3s
