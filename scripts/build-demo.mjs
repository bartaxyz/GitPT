#!/usr/bin/env node
// Regenerate assets/demo.gif: record a real gitpt run with VHS, then speed up
// only the generation phase. Needs macOS 27+ with `fm`, `vhs` on
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
import { drawPlaybackSpeed, renderPlaybackLabels } from "./demo-playback.mjs";
import { findGenerationRange } from "./demo-generation.mjs";

const TAPE = "assets/demo.tape";
const RAW = "assets/demo.gif";
const FPS = 25;
const SPEEDUP = 6;

const ffmpeg = (args) => execFileSync(
  ffmpegPath && existsSync(ffmpegPath) ? ffmpegPath : "ffmpeg",
  args,
  { stdio: "ignore" }
);

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

const work = mkdtempSync(join(tmpdir(), "gitpt-demo-"));
const framesDir = join(work, "frames");
const cutDir = join(work, "cut");

try {
  console.log("Recording with VHS...");
  withAppleConfig(() => execFileSync("vhs", [TAPE], { stdio: "inherit" }));

  const labels = renderPlaybackLabels(readFileSync(TAPE, "utf8"), work, [SPEEDUP]);

  console.log("Extracting frames...");
  cpSync(RAW, join(work, "raw.gif"));
  execFileSync("mkdir", ["-p", framesDir, cutDir]);
  ffmpeg(["-y", "-i", join(work, "raw.gif"), "-vsync", "0", join(framesDir, "g%05d.png")]);

  const frames = readdirSync(framesDir).filter((f) => f.endsWith(".png")).sort();
  const { start, end } = findGenerationRange(frames, (frame) =>
    PNG.sync.read(readFileSync(join(framesDir, frame)))
  );
  const keep = frames.flatMap((frame, i) => {
    const accelerated = i >= start && i < end;
    if (accelerated && (i - start) % SPEEDUP !== 0) return [];
    return [{ frame, accelerated }];
  });
  console.log(`Keeping ${keep.length}/${frames.length} frames.`);

  keep.forEach(({ frame, accelerated }, i) => {
    const png = PNG.sync.read(readFileSync(join(framesDir, frame)));
    if (accelerated) drawPlaybackSpeed(png, SPEEDUP, labels);
    writeFileSync(
      join(cutDir, `f${String(i).padStart(5, "0")}.png`),
      PNG.sync.write(png)
    );
  });

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
