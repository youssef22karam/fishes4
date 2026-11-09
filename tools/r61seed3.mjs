import './headless.mjs';
import * as THREE from 'three';
import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname), eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { FG } = await import(eng('fishgen.js')); const { initProcGen, fromSeed } = await import(eng('procgen.js')); const COH = await import(eng('coherence.js'));
initProcGen(FG);
const f = fromSeed(process.env.SEED); const fish = FG.buildFish(JSON.parse(JSON.stringify(f.genome)), { quality: 'med' }); const bm = fish.bm;
console.log(COH.auditCoherence(fish, THREE).map(x => x.code + ' ' + x.msg));
const pocket = fish.group.children.find(m => m.userData && m.userData.groups && m.userData.mouthPart); const P = pocket.geometry.getAttribute('position'), idx = pocket.geometry.index.array, A = pocket.geometry.getAttribute('aBody');
console.log('groups', JSON.stringify(pocket.userData.groups), 'mcU', bm.mcU, 'h', bm.h, 'L', bm.L);
const q = bm.L * 1e-6, W = new Map(), EC = new Map(), ends = new Map(), tri = new Map();
const id = i => { const k = Math.round(P.getX(i) / q) + ',' + Math.round(P.getY(i) / q) + ',' + Math.round(P.getZ(i) / q); if (!W.has(k)) W.set(k, W.size); return W.get(k); };
for (let k = 0; k < idx.length; k += 3) for (let e = 0; e < 3; e++) { const a = id(idx[k + e]), b = id(idx[k + (e + 1) % 3]); if (a === b) continue; const kk = a < b ? a * 1e7 + b : b * 1e7 + a; EC.set(kk, (EC.get(kk) || 0) + 1); ends.set(kk, [idx[k + e], idx[k + (e + 1) % 3]]); tri.set(kk, k / 3); }
const grp = pocket.userData.groups;
for (const [kk, c] of EC) { if (c !== 1) continue; const [a, b] = ends.get(kk); const t = tri.get(kk); const gname = grp.find(g => t >= g.a && t < g.b);
  console.log('free edge tri', t, gname && gname.name, 'a', a, 'b', b, 'A.x', A.getX(a).toFixed(4), A.getX(b).toFixed(4), 'pos a', [P.getX(a), P.getY(a), P.getZ(a)].map(x => x.toFixed(4)).join(','), 'pos b', [P.getX(b), P.getY(b), P.getZ(b)].map(x => x.toFixed(4)).join(','), 'len', Math.hypot(P.getX(a) - P.getX(b), P.getY(a) - P.getY(b), P.getZ(a) - P.getZ(b)).toFixed(5), 'w', A.getW(a).toFixed(2), A.getW(b).toFixed(2)); }
