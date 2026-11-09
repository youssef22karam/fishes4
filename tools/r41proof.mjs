// Round 4.1 numeric proof from the saved crops.  node tools/r41proof.mjs <dir> [seed...]
//  footprint_<seed>  = render with the body skin hidden: the pixels the interior (walls magenta / lower jaw blue) covers = the aperture silhouette
//  ident_<seed>      = same view with the skin drawn (red, lower-jaw discard kept)
//  skinInside  = skin (red) pixels lying inside the aperture footprint, after ignoring a 2-px lip-thickness rim  -> must be 0 (a divider bar would be hundreds)
//  blackInside = pure-black (NaN-shaded) pixels inside the footprint in the ordinary render front_<seed>_jaw1_crop.png -> must be 0 (single continuous opening)
import { createRequire } from 'node:module'; import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url); const { PNG } = require('/tmp/pw/node_modules/pngjs');
const dir = process.argv[2] || 'docs/shots/after41'; const seeds = process.argv.slice(3).length ? process.argv.slice(3) : ['Q1CW5', 'QZTAI'];
const rd = f => PNG.sync.read(readFileSync(f));
for (const s of seeds) {
  const fp = rd(`${dir}/footprint_${s}_jaw1_crop.png`), id = rd(`${dir}/ident_${s}_jaw1_crop.png`), nm = rd(`${dir}/front_${s}_jaw1_crop.png`), W = fp.width, H = fp.height;
  const at = (im, x, y) => { const i = (y * W + x) * 4; return [im.data[i], im.data[i + 1], im.data[i + 2]]; };
  const near = (p, r, g, b) => Math.abs(p[0] - r) < 6 && Math.abs(p[1] - g) < 6 && Math.abs(p[2] - b) < 6;
  const inFp = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (near(at(fp, x, y), 255, 0, 255) || near(at(fp, x, y), 0, 0, 255));
  const eroded = (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (!inFp(x + dx, y + dy)) return false; return true; };
  let area = 0, skin = 0, skinRaw = 0, black = 0, blackRaw = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!inFp(x, y)) continue; area++; const sk = near(at(id, x, y), 255, 0, 0), q = at(nm, x, y), bl = q[0] + q[1] + q[2] <= 6; if (sk) skinRaw++; if (bl) blackRaw++; if (eroded(x, y, 2)) { if (sk) skin++; if (bl) black++; } }
  console.log(`${dir} ${s}: aperture footprint ${area} px | body-skin px inside: ${skin} (raw incl. 2-px lip rim ${skinRaw}) | pure-black NaN px inside: ${black} (raw ${blackRaw})`);
}
