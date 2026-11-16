import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";

// Render labels through VHS so they use the recording's font and text renderer.
export function renderPlaybackLabels(tape, work, speeds) {
  const settings = tape.split("\n").filter((line) =>
    /^Set (FontFamily|FontSize|LetterSpacing|LineHeight|Width|Height) /.test(line)
  );
  const labels = new Map();
  for (const speed of speeds) {
    const path = join(work, `speed-${speed}`);
    writeFileSync(`${path}.tape`, [
      `Output "${path}.gif"`,
      'Set Shell "bash"',
      ...settings,
      'Set Padding 0',
      'Set Theme "UltraDark"',
      'Hide',
      `Type \`PS1=''; printf '\\033[2J\\033[H\\033[38;2;153;153;153m${speed}x\\033[0m'; tput civis\``,
      'Enter',
      'Sleep 500ms',
      'Show',
      'Sleep 500ms',
      `Screenshot "${path}.png"`,
      'Sleep 500ms',
      '',
    ].join("\n"));
    execFileSync("vhs", [`${path}.tape`], { stdio: "inherit" });
    const png = PNG.sync.read(readFileSync(`${path}.png`));
    let left = png.width, top = png.height, right = -1, bottom = -1;
    for (let y = 0; y < png.height; y++) {
      for (let x = 0; x < png.width; x++) {
        const i = (y * png.width + x) * 4;
        if (png.data[i] + png.data[i + 1] + png.data[i + 2] === 0) continue;
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
    if (right < left) throw new Error(`VHS rendered an empty ${speed}x label`);
    const label = new PNG({ width: right - left + 1, height: bottom - top + 1 });
    PNG.bitblt(png, label, left, top, label.width, label.height, 0, 0);
    labels.set(speed, label);
  }
  return labels;
}

export function drawPlaybackSpeed(png, speed, labels) {
  const label = labels.get(speed);
  if (!label) throw new Error(`Missing ${speed}x playback label`);
  PNG.bitblt(label, png, 0, 0, label.width, label.height,
    png.width - 24 - label.width, png.height - 24 - label.height);
  return png;
}
