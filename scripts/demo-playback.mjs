// A small terminal-style label, drawn directly into PNG frames.
const glyphs = {
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  x: ['00000', '00000', '10001', '01010', '00100', '01010', '10001'],
};

export function drawPlaybackSpeed(png, speed) {
  const label = `${speed}x`;
  const scale = 2;
  const left = png.width - 24 - (label.length * 6 - 1) * scale;
  const top = png.height - 24 - 7 * scale;
  for (const [index, char] of [...label].entries()) {
    const glyph = glyphs[char];
    if (!glyph) throw new Error(`Unsupported playback label: ${label}`);
    for (let y = 0; y < 7 * scale; y++) {
      for (let x = 0; x < 5 * scale; x++) {
        if (glyph[Math.floor(y / scale)][Math.floor(x / scale)] !== '1') continue;
        const offset = ((top + y) * png.width + left + index * 6 * scale + x) * 4;
        png.data.set([153, 153, 153, 255], offset);
      }
    }
  }
  return png;
}
