// Round-4 centre-plane mouth audit over a population:  node tools/r4audit.mjs [N=400] [--save file]   → offending standing-sheet triangle counts
import './headless.mjs';
import { writeFileSync } from 'node:fs'; import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname), eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { FG } = await import(eng('fishgen.js')); const { initProcGen, fromSeed } = await import(eng('procgen.js')); initProcGen(FG);
const N = +process.argv[2] || 400, sv = process.argv.indexOf('--save') > 0 ? process.argv[process.argv.indexOf('--save') + 1] : null;
let tri = 0, fish = 0, bad = 0, audited = 0; const by = {}, seeds = {};
for (const s of ['Q1CW5', 'QZTAI']) { const f = fromSeed(s), b = FG.buildFish(JSON.parse(JSON.stringify(f.genome)), { quality: 'med' }), r = FG.centreAudit(b.bm); seeds[s] = r.sheets; }
for (let i = 0; i < N; i++) { const seed = 'R4' + (i * 2654435 + 7).toString(36); let f; try { f = fromSeed(seed); } catch { continue; } fish++;
  const b = FG.buildFish(JSON.parse(JSON.stringify(f.genome)), { quality: 'med' }), r = FG.centreAudit(b.bm); if (!r.tris) continue; audited++; tri += r.sheets; if (r.sheets) bad++;
  for (const [k, v] of Object.entries(r.byGroup)) by[k] = (by[k] || 0) + v.sheets; }
const out = { fish, audited, fishWithOffenders: bad, offendingTriangles: tri, byGroup: by, named: seeds };
console.log(JSON.stringify(out)); if (sv) writeFileSync(sv, JSON.stringify(out, null, 1));
