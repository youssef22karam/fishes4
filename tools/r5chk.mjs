// quick geometry audit for given seeds: node tools/r5chk.mjs SEED [SEED...]
import './headless.mjs';
import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname), eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { FG } = await import(eng('fishgen.js')); const { initProcGen, fromSeed } = await import(eng('procgen.js')); initProcGen(FG);
for (const s of process.argv.slice(2)) { const f = fromSeed(s), g = f.genome, ax = FG.axesOf(g); const fish = FG.buildFish(g, { quality: 'med' }); const r = FG.checkFishGeometry(fish), bm = fish.bm;
  console.log(s, ax.plan.family, g.meta.niche, g.mouth.type, 'barb', g.head.barbels, bm.barbelPlan && bm.barbelPlan.layout, 'jawStart/h', (bm.jawStartU / bm.h).toFixed(3), 'mc/h', (bm.mcU / bm.h).toFixed(2), r.errors.length ? r.errors : 'OK'); }
