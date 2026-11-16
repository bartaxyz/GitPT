import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import { findGenerationRange } from "../../scripts/demo-generation.mjs";

const frame = (...lines) => {
  const png = new PNG({ width: 1200, height: 520 });
  for (const line of lines) {
    for (let y = 24 + (line - 1) * 21; y < 24 + line * 21; y++) {
      for (let x = 60; x < 180; x++) {
        png.data.set([255, 255, 255, 255], (y * png.width + x) * 4);
      }
    }
  }
  return png;
};
const range = (frames) => findGenerationRange(frames, (png) => png);

describe("demo generation phase", () => {
  it("excludes typing and stays in generation until success", () => {
    const frames = [frame(), frame(1), frame(1, 2), frame(1, 2, 3),
      frame(1, 2, 3), frame(1, 2, 3, 4), frame(1, 2, 3, 4, 5), frame(1)];
    expect(range(frames)).toEqual({ start: 3, end: 6 });
  });

  it("does not treat a cursor on the success line as completion", () => {
    const cursor = frame(1, 2, 3, 4);
    for (let y = 108; y < 129; y++) {
      for (let x = 24; x < 36; x++) {
        cursor.data.set([255, 255, 255, 255], (y * cursor.width + x) * 4);
      }
    }
    expect(range([frame(1, 2), cursor, frame(1, 2, 3, 4, 5)]))
      .toEqual({ start: 1, end: 2 });
  });

  it("fails instead of speeding up an unknown layout", () => {
    expect(() => range([frame(1, 2)])).toThrow("generation phase");
    expect(() => range([frame(1, 2, 3)])).toThrow("generation phase");
  });
});
