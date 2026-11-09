// Round-4 centre-plane diagnosis:  node tools/r4diag.mjs [seed ...]   — names the geometry that stands on the centre plane in the front of the open mouth
import './headless.mjs';
import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname), eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { FG } = await import(eng('fishgen.js')); const { initProcGen, fromSeed } = await import(eng('procgen.js')); initProcGen(FG);
for (const seed of process.argv.slice(2).length ? process.argv.slice(2) : ['Q1CW5', 'QZTAI']) {
  const f = fromSeed(seed), fish = FG.buildFish(JSON.parse(JSON.stringify(f.genome)), { quality: 'med' }), r = FG.centreAudit(fish.bm);
  console.log(seed, 'head width', r.hw.toFixed(4), 'sheets', r.sheets, 'transverse', r.transverse, 'tris fwd', r.tris); for (const [k, v] of Object.entries(r.byGroup)) console.log('   ', k.padEnd(20), JSON.stringify(v));
}
