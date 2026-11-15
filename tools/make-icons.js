// Draws Claudex's mark (a plain prompt sign: a chevron and an underscore on a dark tile) as public/logo.svg and the PNG icons.
// Node stdlib only: each pixel's coverage comes from the distance to the shapes, PNGs are written with zlib + CRC32.
// Run: node tools/make-icons.js
const fs = require("fs"), path = require("path"), zlib = require("zlib");
const OUT = path.join(__dirname, "..", "public");
const BG = [31, 31, 30], FG = [232, 230, 227], ACCENT = [46, 196, 182];
const W = 0.085;  // stroke width, as a share of the tile
const CHEVRON = [[[0.30, 0.33], [0.49, 0.50]], [[0.49, 0.50], [0.30, 0.67]]], BAR = [[0.55, 0.67], [0.73, 0.67]];

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="rgb(${BG})"/><g fill="none" stroke-width="${W * 64}" stroke-linecap="round" stroke-linejoin="round"><path d="M${CHEVRON[0][0].map((v) => v * 64).join(" ")}L${CHEVRON[0][1].map((v) => v * 64).join(" ")}L${CHEVRON[1][1].map((v) => v * 64).join(" ")}" stroke="rgb(${FG})"/><path d="M${BAR[0].map((v) => v * 64).join(" ")}L${BAR[1].map((v) => v * 64).join(" ")}" stroke="rgb(${ACCENT})"/></g></svg>\n`;
fs.writeFileSync(path.join(OUT, "logo.svg"), svg);

const segDist = (px, py, [[ax, ay], [bx, by]]) => { const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))); return Math.hypot(px - ax - t * dx, py - ay - t * dy); };
const boxDist = (px, py, r) => { const qx = Math.abs(px - 0.5) - 0.5 + r, qy = Math.abs(py - 0.5) - 0.5 + r; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; };
const cover = (d, px) => Math.max(0, Math.min(1, 0.5 - d / px));  // d: signed distance in tile units, px: one pixel in tile units
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (buf) => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4), crc = Buffer.alloc(4), td = Buffer.concat([Buffer.from(type), data]); len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };

function png(size, rounded) {
  const px = 1 / size, raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) * px, v = (y + 0.5) * px;
      const tile = rounded ? cover(boxDist(u, v, 0.22), px) : 1;
      let c = BG;
      c = mix(c, FG, cover(Math.min(...CHEVRON.map((s) => segDist(u, v, s))) - W / 2, px));
      c = mix(c, ACCENT, cover(segDist(u, v, BAR) - W / 2, px));
      const o = y * (size * 4 + 1) + 1 + x * 4; raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2]; raw[o + 3] = Math.round(tile * 255);
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
for (const s of [32, 64, 180, 192, 512]) fs.writeFileSync(path.join(OUT, `icon-${s}.png`), png(s, s !== 180));  // 180 is the iPhone home-screen icon: iOS rounds it itself
console.log("wrote public/logo.svg and public/icon-{32,64,180,192,512}.png");
