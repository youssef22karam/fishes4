import './headless.mjs';
import * as THREE from 'three';
import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname), eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { FG } = await import(eng('fishgen.js')); const { initProcGen, fromSeed } = await import(eng('procgen.js')); const COH = await import(eng('coherence.js'));
initProcGen(FG);
const f = fromSeed(process.env.SEED); const fish = FG.buildFish(JSON.parse(JSON.stringify(f.genome)), { quality: 'med' }); const bm = fish.bm;
console.log(COH.auditCoherence(fish, THREE).map(x => x.code + ' ' + x.msg), 'protr', bm.eyes.map(e => e.protrusion.toFixed(3) + '/' + (e.seatExtra || 0).toFixed(3)), 'R/maxD', (bm.eyeR / bm.maxD).toFixed(3), 'eyeSize', f.genome.head.eyeSize);
