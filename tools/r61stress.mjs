// targeted stress: per-lineage coherence census (standard path). env: CL="ray flat box shark" PER=60
import './headless.mjs';
import * as THREE from 'three';
import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname), eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { FG } = await import(eng('fishgen.js')); const { initProcGen, randomFish } = await import(eng('procgen.js')); const COH = await import(eng('coherence.js'));
initProcGen(FG);
const CL = (process.env.CL || 'ray flat box shark').split(' '), PER = +process.env.PER || 60;
for (const cl of CL) {
  let n = 0, bad = 0, worstBuried = 0; const by = {}; const ex = [];
  for (let i = 0; i < PER; i++) {
    const f = randomFish(cl); const fish = FG.buildFish(JSON.parse(JSON.stringify(f.genome)), { quality: 'med' }); const v = COH.auditCoherence(fish, THREE); n++;
    if (v.length) { bad++; for (const x of v) by[x.code] = (by[x.code] || 0) + 1; if (ex.length < 3) ex.push(f.seed + ' ' + f.lineage + ' ' + v[0].msg); }
    for (const x of v) { const m = /buried ([\d.]+) R/.exec(x.msg); if (m) worstBuried = Math.max(worstBuried, +m[1]); }
    fish.dispose();
  }
  console.log(cl.padEnd(6), 'n', n, 'bad', bad, JSON.stringify(by), 'worstBuried', worstBuried, ex.join(' || '));
}
