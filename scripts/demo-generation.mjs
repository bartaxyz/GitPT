// The demo has two command lines, then generation output. The fifth line is
// the success message. Ignore the left edge so a cursor is not mistaken for text.
export function findGenerationRange(frames, readFrame) {
  const hasText = (png, line) => {
    const top = 24 + (line - 1) * 21;
    let ink = 0;
    for (let y = top; y < top + 21; y += 2) {
      for (let x = 48; x < png.width - 24; x += 3) {
        const i = (y * png.width + x) * 4;
        if (png.data[i] + png.data[i + 1] + png.data[i + 2] > 240) ink++;
      }
    }
    return ink > 8;
  };
  let start = null;
  for (let i = 0; i < frames.length; i++) {
    const png = readFrame(frames[i]);
    if (start === null && hasText(png, 3)) start = i;
    if (start !== null && hasText(png, 5)) return { start, end: i };
  }
  throw new Error("Could not find the demo's generation phase. Check its terminal layout.");
}
