// Round-6A quick probe: node tools/r6probe.mjs <seed>
import './headless.mjs';
import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname), eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { FG } = await import(eng('fishgen.js')); const { initProcGen, fromSeed } = await import(eng('procgen.js')); const D = await import(eng('discgeo.js')); initProcGen(FG);
const f = FG.buildFish(JSON.parse(JSON.stringify(fromSeed(process.argv[2] || 'Q8NMY').genome)), { quality: 'med' });
console.log(Object.keys(f.parts), f.info.tris, JSON.stringify(D.thicknessProbe(f.bm)), JSON.stringify(f.info.bounds.min), JSON.stringify(f.info.bounds.max));
console.log(JSON.stringify(FG.checkFishGeometry ? FG.checkFishGeometry(f) : 'nocheck').slice(0, 300));
