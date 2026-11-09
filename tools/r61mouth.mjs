import './headless.mjs';
import * as THREE from 'three';
import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname), eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { FG } = await import(eng('fishgen.js')); const { initProcGen, randomFish } = await import(eng('procgen.js')); const COH = await import(eng('coherence.js'));
initProcGen(FG);
const N = +process.env.N || 600; let hits = 0;
for (let i = 0; i < N; i++) {
  const f = randomFish(); const fish = FG.buildFish(JSON.parse(JSON.stringify(f.genome)), { quality: 'med' }); const v = COH.auditCoherence(fish, THREE).filter(x => x.code === 'MOUTH_CORNER_OPEN');
  if (v.length) { hits++; const g = f.genome, m = g.mouth; console.log(f.seed, f.lineage, v[0].msg, '| type', m.type, 'gape', m.gape.toFixed(2), 'jawRatio', m.jawRatio && m.jawRatio.toFixed(2), 'h', g.head.lengthFrac.toFixed(3), 'cheek', g.head.cheek, 'teeth', m.teeth, 'special', g.head.special); }
  fish.dispose();
}
console.log('hits', hits, '/', N);
