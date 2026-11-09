// debug: which mesh occludes the cornea on a one-sided plan
import './headless.mjs';
import * as THREE from 'three';
import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname), eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { FG } = await import(eng('fishgen.js')); const { initProcGen, randomFish } = await import(eng('procgen.js')); const COH = await import(eng('coherence.js')); const EYE = await import(eng('eyegeo.js'));
initProcGen(FG); if (process.env.NOSHIFT) globalThis.__NOSHIFT = 1;
let found = 0;
for (let i = 0; i < (+process.env.N || 800) && found < 3; i++) {
  const f = randomFish(); if (f.genome.head.eyeSide !== 'left' && f.genome.head.eyeSide !== 'right') continue;
  const fish = FG.buildFish(JSON.parse(JSON.stringify(f.genome)), { quality: 'med' });
  const v = COH.auditCoherence(fish, THREE).filter(x => /visible|seat/.test(x.msg));
  if (v.length) {
    found++; const bm = fish.bm; console.log(f.seed, v.map(x => x.msg).join('|'));
    const occ = []; fish.group.traverse(m => { if (m.isMesh && !m.isInstancedMesh && (m === fish.parts.body || m.userData.eyeSkin || m === fish.parts.jaw || m === fish.parts.operculum || m === fish.parts.upperJaw)) occ.push(m); });
    fish.group.updateMatrixWorld(true); const rc = new THREE.Raycaster(), fr = {}; bm.frame(bm.lm.eye, fr);
    bm.eyes.forEach((i, k) => {
      const a = i.axis.clone().normalize(), c = i.center, R = i.R, fwd = new THREE.Vector3(-fr.tx, -fr.ty, 0), fp = fwd.addScaledVector(a, -fwd.dot(a)).normalize(), t1 = new THREE.Vector3().crossVectors(a, fp).normalize();
      const cams = [a.clone(), a.clone().multiplyScalar(Math.cos(.61)).addScaledVector(fp, Math.sin(.61))]; const hit = {};
      cams.forEach((cd, ci) => { for (let q = 0; q <= 24; q++) {
        const al = q === 0 ? 0 : EYE.LIMBUS * ((1 + (q - 1) % 3) / 3) * .97, be = ((q - 1) / 3 | 0) / 8 * Math.PI * 2;
        const d = a.clone().multiplyScalar(Math.cos(al)).addScaledVector(fp, Math.sin(al) * Math.cos(be)).addScaledVector(t1, Math.sin(al) * Math.sin(be));
        if (d.dot(cd) < .25) continue; const p = c.clone().addScaledVector(d, R * 1.01), o = p.clone().addScaledVector(cd, bm.L * .6), dir = p.clone().sub(o), dist = dir.length(); dir.normalize();
        rc.set(o, dir); rc.far = dist - R * .004; const h = rc.intersectObjects(occ, false); if (h.length) { const m = h[0].object; const n = m === fish.parts.body ? 'body' : m.userData.eyeSkin ? 'eyeSkin' : m === fish.parts.jaw ? 'jaw' : m === fish.parts.operculum ? 'operc' : 'upperJaw'; const hp = h[0].point; console.log('    q',q,'cam',ci,'p',p.x.toFixed(4),p.y.toFixed(4),p.z.toFixed(4),'hit',hp.x.toFixed(4),hp.y.toFixed(4),hp.z.toFixed(4),'headDepth',(EYE.headDepthAt(bm,p.clone(),(x,a,b)=>x<a?a:x>b?b:x)/R).toFixed(3),'axis',a.x.toFixed(2),a.y.toFixed(2),a.z.toFixed(2),'face',h[0].face&&h[0].face.normal.toArray().map(x=>x.toFixed(2)).join(','));
 hit['cam' + ci + ':' + n + ':q' + q + ':al' + al.toFixed(2) + ':depth/R' + ((dist - h[0].distance) / R).toFixed(3) + ':be' + be.toFixed(2)] = 1; } } });
      console.log('  eye', k, 'center', c.x.toFixed(3), c.y.toFixed(3), c.z.toFixed(3), 'R', R.toFixed(4), 'protr', i.protrusion.toFixed(3), 'seatExtra', (i.seatExtra || 0).toFixed(3), JSON.stringify(hit));
    });
  }
  fish.dispose();
}
