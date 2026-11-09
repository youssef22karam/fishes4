// Round 5B: radius-continuity probe of the head-body and body-peduncle junctions.  node tools/r5prof.mjs <seed,...> [dump]
// Samples bm.section on a fine station grid and reports the largest station-to-station step of each radius (dUp, dDn, w) relative to its local value, inside each junction span,
// and the largest change of the radial SLOPE (a kink).  Also the lofted-mesh normal angle jump between neighbouring rings.
import './headless.mjs';
import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname), eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { FG } = await import(eng('fishgen.js')); const { initProcGen, fromSeed } = await import(eng('procgen.js')); initProcGen(FG);
export function probe(seed, dump) {
  const f = fromSeed(seed), g = f.genome, fish = FG.buildFish(JSON.parse(JSON.stringify(g)), { quality: 'med' }), bm = fish.bm, s = {}, N = 4000, du = 1 / N;
  const spans = { head: [bm.h * .55, bm.h * 1.6], ped: [Math.max(.5, bm.g.body.pedU - .14), Math.min(.99, bm.g.body.pedU + .05)] }, out = {};
  for (const [name, [a, b]] of Object.entries(spans)) {
    let prev = null, jump = 0, kink = 0, at = 0, pk = null; const rows = [];
    for (let u = a; u <= b; u += du) { bm.section(u, s); const v = [s.dUp, s.dDn, s.w]; if (prev) { for (let i = 0; i < 3; i++) { const d = (v[i] - prev.v[i]) / Math.max(1e-9, (v[i] + prev.v[i]) / 2); jump = Math.max(jump, Math.abs(d)); if (pk) { const k = Math.abs(d - pk[i]); if (k > kink) { kink = k; at = u; } } } pk = prev.v.map((x, i) => (v[i] - x) / Math.max(1e-9, (v[i] + x) / 2)); } prev = { v }; if (dump && Math.round((u - a) / du) % 40 === 0) rows.push([+u.toFixed(4), ...v.map(x => +(x / bm.L).toFixed(5))]); }
    out[name] = { stepMax: +jump.toExponential(2), kinkMax: +kink.toExponential(2), kinkAt: +at.toFixed(4) }; if (dump) out[name].rows = rows;
  }
  return { seed, h: +bm.h.toFixed(3), ped: +bm.g.body.pedU.toFixed(3), op: +bm.lm.operculum.toFixed(3), fam: bm.a.family, gills: bm.a.gills, ...out };
}
if (process.argv[2]) for (const sd of process.argv[2].split(',')) console.log(JSON.stringify(probe(sd, process.argv[3] === 'dump')));
