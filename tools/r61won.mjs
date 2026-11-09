import './headless.mjs';
import * as THREE from 'three';
import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname), eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { FG } = await import(eng('fishgen.js')); const { initProcGen } = await import(eng('procgen.js')); const COH = await import(eng('coherence.js'));
initProcGen(FG);
const HABS = ['coralReef', 'openOcean', 'cave', 'mountainStream', 'rockyShore', 'seagrass', 'slowRiver', 'hadal'].filter(h => !FG.HABITATS || FG.HABITATS[h]);
const N = +process.env.N || 300; const errs = {};
for (let i = 0; i < N; i++) {
  let w; try { w = FG.wonderCandidate(HABS[i % HABS.length], 'rb' + i); } catch (e) { const k = 'cand: ' + String(e.message).slice(0, 90); errs[k] = (errs[k] || 0) + 1; continue; }
  const c = w.c; let fish; try { fish = FG.buildFish(JSON.parse(JSON.stringify(c)), { quality: 'med' }); const v = COH.auditCoherence(fish, THREE); if (v.length) { const bm = fish.bm; console.log('  [', i, 'disc', !!bm.disc, 'flat', !!bm.law.flat, 'family', bm.a.family, 'gills', bm.a.gills, 'eyeV', c.head.eyeV.toFixed(2), 'eyeU', c.head.eyeU.toFixed(2), 'protr', bm.eyes.map(e => e.protrusion.toFixed(2) + '/' + (e.seatExtra||0).toFixed(2)).join(','), 'R/depth', (bm.eyeR / bm.maxD).toFixed(2), 'roll', c.body.roll, 'width', c.body.width.toFixed(2), 'ventralFlat', c.body.ventralFlat, ']'); } if (v.length) console.log(c.meta.name, v.slice(0, 2).map(x => x.msg).join('|'), 'eyeSide', c.head.eyeSide); fish.dispose(); } catch (e) { const k = 'audit: ' + String(e.message).slice(0, 90) + (process.env.STACK ? '\n' + e.stack.split('\n').slice(1, 4).join('\n') : ''); errs[k] = (errs[k] || 0) + 1; }
}
console.log(errs);
