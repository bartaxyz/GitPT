# assets/demo.tape — record a REAL `gitpt commit` powered by Apple Foundation Models.
#
#   brew install vhs        # https://github.com/charmbracelet/vhs
#   vhs assets/demo.tape    # run from the repo root; writes assets/demo.gif
#
# Requirements:
#   - macOS 27+ with the on-device `fm` CLI
#   - gitpt on PATH, configured to Apple Foundation Models:  gitpt model
#
# Runs in a throwaway repo (mktemp), so it never touches your real projects.

Output assets/demo.gif

Set Shell "zsh"
Set FontSize 18
Set Width 1200
Set Height 760
Set Padding 24
Set TypingSpeed 55ms
Set Theme "Catppuccin Mocha"

# --------------------------------------------------------------------------
# Hidden setup: a throwaway repo with one realistic staged change.
# --------------------------------------------------------------------------
Hide

Type `cd "$(mktemp -d)"`
Enter
Type "git init -q && git commit -q --allow-empty -m 'chore: init'"
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

# the change the demo will commit: guard against a missing session
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
Type "gitpt add ."
Enter
Type "clear"
Enter

Show

# --------------------------------------------------------------------------
# The demo: generate a commit message on-device.
# --------------------------------------------------------------------------
Type "gitpt commit"
Sleep 600ms
Enter

# Real on-device generation happens here. Tune to your machine's speed.
Sleep 7s

# Hold on the generated message so viewers can read it.
Sleep 3s

# --------------------------------------------------------------------------
# Optional: showing summarization on a large diff
# --------------------------------------------------------------------------
# For the "built for on-device" story, stage a big multi-file change instead so
# the "Summarizing chunk 1/N..." spinner appears. That stretch records in real
# time, so speed just that segment up afterwards with ffmpeg — split it out,
# 4x it, and re-concat (adjust the 3s..9s window to where summarization runs):
#
#   ffmpeg -i assets/demo.gif -filter_complex \
#     "[0:v]trim=0:3,setpts=PTS-STARTPTS[a]; \
#      [0:v]trim=3:9,setpts=0.25*(PTS-STARTPTS)[b]; \
#      [0:v]trim=9,setpts=PTS-STARTPTS[c]; \
#      [a][b][c]concat=n=3:v=1[v]" -map "[v]" assets/demo-fast.gif
