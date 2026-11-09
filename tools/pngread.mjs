/* Minimal PNG reader for audit metrics (8-bit RGB/RGBA, non-interlaced —
   exactly what the headless-chrome screenshots are). Returns { w, h, data }
   with data a Uint8Array of RGBA quads. */
import { inflateSync } from 'node:zlib';

export function readPng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a png');
  let off = 8, w = 0, h = 0, depth = 0, ctype = 0, interlace = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off), type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ctype = data[9]; interlace = data[12]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (depth !== 8 || interlace !== 0 || !(ctype === 2 || ctype === 6)) throw new Error(`unsupported png depth=${depth} ctype=${ctype} interlace=${interlace}`);
  const bpp = ctype === 6 ? 4 : 3, stride = w * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  const out = new Uint8Array(w * h * 4);
  let rp = 0;
  const prev = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const ft = raw[rp++], row = raw.subarray(rp, rp + stride); rp += stride;
    const cur = new Uint8Array(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      let v = row[x];
      if (ft === 1) v = (v + a) & 255; else if (ft === 2) v = (v + b) & 255;
      else if (ft === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (ft === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255; }
      cur[x] = v;
    }
    for (let x = 0; x < w; x++) {
      const si = x * bpp, di = (y * w + x) * 4;
      out[di] = cur[si]; out[di + 1] = cur[si + 1]; out[di + 2] = cur[si + 2]; out[di + 3] = bpp === 4 ? cur[si + 3] : 255;
    }
    prev.set(cur);
  }
  return { w, h, data: out };
}

/** WP5 blockiness: mean luminance-gradient magnitude on 8-px grid lines vs
   off them. Natural imagery ≈ 1.0; axis-aligned block artefacts spike it. */
export function blockiness(img) {
  const { w, h, data } = img, lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = (data[i * 4] * 299 + data[i * 4 + 1] * 587 + data[i * 4 + 2] * 114) / 1000;
  let gOn = 0, nOn = 0, gOff = 0, nOff = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const g = Math.abs(lum[y * w + x + 1] - lum[y * w + x - 1]) + Math.abs(lum[(y + 1) * w + x] - lum[(y - 1) * w + x]);
    if (x % 8 === 0 || y % 8 === 0) { gOn += g; nOn++; } else { gOff += g; nOff++; }
  }
  return (gOn / Math.max(1, nOn)) / Math.max(1e-9, gOff / Math.max(1, nOff));
}
