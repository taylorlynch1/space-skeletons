// Generates public/favicon.png (64x64) and public/apple-touch-icon.png
// (180x180) from a 16x16 pixel skull. No dependencies. Re-run with:
//   node scripts/make-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

// palette matches the game: bg #1a0301, bone #e9e3d2, sockets #15131c,
// lava orange #ff7a2a, gold #caa052
const PALETTE = {
  ".": [0x1a, 0x03, 0x01, 255],
  "W": [0xe9, 0xe3, 0xd2, 255],
  "S": [0xc4, 0xb8, 0x9c, 255],
  "B": [0x15, 0x13, 0x1c, 255],
  "O": [0xff, 0x7a, 0x2a, 255],
  "g": [0xca, 0xa0, 0x52, 255],
  "s": [0x6e, 0x5a, 0x4e, 255]
};

const GRID = [
  "................",
  "..s.........s...",
  "......s.........",
  "....WWWWWWWW....",
  "...WWWWWWWWWS...",
  "..WWWWWWWWWWSS..",
  "..WWWWWWWWWWSS..",
  "..WBBBWWWWBBBS..",
  "..WBOBWWWWBOBS..",
  "..WWWWWBBWWWSS..",
  "...WWWWBBWWWS...",
  "...WWWWWWWWWS...",
  "....WWBWWBWW....",
  "....WWBWWBWW....",
  ".s..............",
  "...........s...."
];

function gridToPixels(grid) {
  return grid.map(row => [...row].map(ch => PALETTE[ch]));
}

// nearest-neighbor scale, then center inside size x size with bg padding
function renderRGBA(grid, scale, size) {
  const px = gridToPixels(grid);
  const art = grid.length * scale;
  const pad = Math.floor((size - art) / 2);
  if (pad < 0) throw new Error("scale too big for size " + size);
  const bg = PALETTE["."];
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const gy = Math.floor((y - pad) / scale);
      const gx = Math.floor((x - pad) / scale);
      const inArt = y >= pad && x >= pad && gy < grid.length && gx < grid[0].length;
      const c = inArt ? px[gy][gx] : bg;
      buf.set(c, (y * size + x) * 4);
    }
  }
  return buf;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(rgba, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

mkdirSync("public", { recursive: true });
writeFileSync("public/favicon.png", encodePNG(renderRGBA(GRID, 4, 64), 64));
writeFileSync("public/apple-touch-icon.png", encodePNG(renderRGBA(GRID, 11, 180), 180));
console.log("wrote public/favicon.png (64x64) and public/apple-touch-icon.png (180x180)");
