import './headless.mjs';
import * as THREE from 'three';
import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname), eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { FG } = await import(eng('fishgen.js')); const { initProcGen, fromSeed } = await import(eng('procgen.js')); const COH = await import(eng('coherence.js')); const EYE = await import(eng('eyegeo.js'));
initProcGen(FG);
const f = fromSeed(process.env.SEED); const fish = FG.buildFish(JSON.parse(JSON.stringify(f.genome)), { quality: 'med' }); const bm = fish.bm;
console.log(COH.auditCoherence(fish, THREE).map(x => x.code + ' ' + x.msg));
const cl = (x, a, b) => x < a ? a : x > b ? b : x;
// scan body mesh vs analytic around eye1: sample points along z at the hit x,y
const rc = new THREE.Raycaster(); const body = fish.parts.body; fish.group.updateMatrixWorld(true);
for (const [x, y] of [[.1870, .0205], [.1941, .0175], [.1892, .0209], [.18, .02], [.17, .02]]) {
  rc.set(new THREE.Vector3(x, y, .5), new THREE.Vector3(0, 0, -1)); rc.far = 2; const h = rc.intersectObject(body, false);
  // analytic: largest z with headDepthAt>0
  let za = 0; for (let z = 0; z < .1; z += .0002) if (EYE.headDepthAt(bm, new THREE.Vector3(x, y, z), cl) > 0) za = z;
  console.log('x,y', x, y, 'mesh top z', h.length ? h[0].point.z.toFixed(4) : '-', 'analytic top z', za.toFixed(4));
}
console.log('lm', JSON.stringify({ eye: bm.lm.eye, mc: bm.lm.mouthCorner, op: bm.lm.operculum, gs: bm.lm.gillStart }), 'L', bm.L, 'headX', bm.headX, 'law.eye', JSON.stringify(bm.law.eye));
