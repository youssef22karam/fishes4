// debug: per-failing-fish eye placement numbers
import './headless.mjs';
import * as THREE from 'three';
import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname), eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { FG } = await import(eng('fishgen.js')); const { initProcGen, randomFish } = await import(eng('procgen.js')); const COH = await import(eng('coherence.js'));
initProcGen(FG);
const N = +process.env.N || 120; let shown = 0;
for (let i = 0; i < N; i++) {
  const f = randomFish(); const fish = FG.buildFish(JSON.parse(JSON.stringify(f.genome)), { quality: 'med' });
  const v = COH.auditCoherence(fish, THREE).filter(x => /^EYE/.test(x.code));
  if (v.length) {
    const bm = fish.bm, lm = bm.lm, sp = bm.spine, NS = sp.length - 1, g = bm.g;
    const info = bm.eyes[0]; let best = 1e9, bi = 0; for (let k = 0; k <= NS; k++) { const d = (sp[k].x - info.center.x) ** 2 + (sp[k].y - info.center.y) ** 2; if (d < best) { best = d; bi = k; } }
    console.log(f.lineage, 'plan', bm.a.family, 'disc', !!bm.disc, 'flat', !!bm.law.flat, '| lm.eye', lm.eye.toFixed(4), 'measured u', (bi / NS).toFixed(4), 'R/L', (info.R / bm.L).toFixed(4), 'gill', lm.gillStart.toFixed(4), 'eyeU', g.head.eyeU.toFixed(3), 'eyeV', g.head.eyeV.toFixed(2), 'h', g.head.lengthFrac.toFixed(3), 'side', g.head.eyeSide);
    console.log('   ', v.slice(0, 2).map(x => x.msg).join(' | '));
  }
  fish.dispose();
}
