#!/usr/bin/env node
// Regenerate assets/demo.gif: record a real gitpt run with VHS, then speed up
// only the on-device summarization wait.  Needs macOS 27+ with `fm`, `vhs` on
// PATH (brew install vhs), and gitpt linked (npm run build && npm link).
//   npm run build:demo

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { PNG } from "pngjs";

const TAPE = "assets/demo.tape";
const RAW = "assets/demo.gif";
const FPS = 25;
const SPEEDUP = 6;

const ffmpeg = (args) => execFileSync(ffmpegPath, args, { stdio: "ignore" });

const configPath = join(
  process.env.XDG_CONFIG_HOME || join(homedir(), ".config"),
  "configstore",
  "gitpt.json"
);

const withAppleConfig = (fn) => {
  const backup = existsSync(configPath) ? readFileSync(configPath, "utf8") : null;
  const current = backup ? JSON.parse(backup) : {};
  writeFileSync(
    configPath,
    JSON.stringify({ ...current, provider: "apple", model: "system" }, null, "\t")
  );
  try {
    return fn();
  } finally {
    if (backup !== null) writeFileSync(configPath, backup);
  }
};

// Wait frame: nothing rendered below the spinner line, prompt lines unchanged.
const isWait = (png, prevTop) => {
  const { width, height, data } = png;
  const ink = (x, y) => {
    const i = (y * width + x) * 4;
    return data[i] + data[i + 1] + data[i + 2] > 240;
  };
  const belowSpinner = Math.floor(height * 0.2);
  for (let y = belowSpinner; y < height; y += 2)
    for (let x = 0; x < width; x += 3) if (ink(x, y)) return { wait: false, top: prevTop };

  const top0 = Math.floor(height * 0.05);
  const top1 = Math.floor(height * 0.13);
  let top = 0;
  for (let y = top0; y < top1; y += 2)
    for (let x = 0; x < width; x += 3) top = (top + (ink(x, y) ? x * 31 + y : 0)) | 0;
  return { wait: prevTop !== null && top === prevTop, top };
};

const work = mkdtempSync(join(tmpdir(), "gitpt-demo-"));
const framesDir = join(work, "frames");
const cutDir = join(work, "cut");

try {
  console.log("Recording with VHS...");
  withAppleConfig(() => execFileSync("vhs", [TAPE], { stdio: "inherit" }));

  console.log("Extracting frames...");
  cpSync(RAW, join(work, "raw.gif"));
  execFileSync("mkdir", ["-p", framesDir, cutDir]);
  ffmpeg(["-y", "-i", join(work, "raw.gif"), "-vsync", "0", join(framesDir, "g%05d.png")]);

  const frames = readdirSync(framesDir).filter((f) => f.endsWith(".png")).sort();
  console.log(`Classifying ${frames.length} frames...`);
  const keep = [];
  let prevTop = null;
  let waitRun = 0;
  for (let i = 0; i < frames.length; i++) {
    const png = PNG.sync.read(readFileSync(join(framesDir, frames[i])));
    const { wait, top } = isWait(png, prevTop);
    prevTop = top;
    if (wait) {
      if (waitRun % SPEEDUP === 0) keep.push(frames[i]);
      waitRun++;
    } else {
      waitRun = 0;
      keep.push(frames[i]);
    }
  }
  console.log(`Keeping ${keep.length}/${frames.length} frames.`);

  keep.forEach((f, i) =>
    cpSync(join(framesDir, f), join(cutDir, `f${String(i).padStart(5, "0")}.png`))
  );

  console.log("Encoding final gif...");
  ffmpeg([
    "-y",
    "-framerate",
    String(FPS),
    "-i",
    join(cutDir, "f%05d.png"),
    "-filter_complex",
    "[0:v]split[s0][s1];[s0]palettegen=stats_mode=full[p];" +
      "[s1][p]paletteuse=dither=bayer:bayer_scale=3",
    RAW,
  ]);
  console.log(`Done: ${RAW}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
