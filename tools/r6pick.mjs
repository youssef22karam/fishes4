// Round-6A disc-plan seed picker. node tools/r6pick.mjs [N]  -> prints disc seeds by lineage/axes
import './headless.mjs';
import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname), eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { FG } = await import(eng('fishgen.js')); const { initProcGen, fromSeed } = await import(eng('procgen.js')); initProcGen(FG);
const N = +(process.argv[2] || 1500), out = [];
for (let i = 0; i < N; i++) { const seed = 'Q' + (i * 7919 + 13).toString(36).toUpperCase(); let f; try { f = fromSeed(seed); } catch { continue; }
  const g = f.genome, ax = FG.axesOf(g); if (ax.plan.family !== 'ray') continue;
  out.push({ seed, lin: f.lineage || f.clade, w: +g.body.width.toFixed(2), fin: g.fins.pectoral.shape, sp: g.head.special, pat: g.skin.pattern, caud: g.fins.caudal.present, len: +g.body.length.toFixed(2), tail: +g.head.specialLen.toFixed(2) }); }
console.log(out.length); for (const o of out.slice(0, 40)) console.log(JSON.stringify(o));
