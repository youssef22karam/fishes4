// Round 6H.3b probe — ventral / inferior mouth corner on the BUILT mesh.
//   node tools/reassemble.mjs && node tools/r6h3b.mjs [SEED ...]          (default: the four named seeds)
//   env STRESS=n   additionally builds n random fish per stressed lineage family (ancient / shark / ray / cat) and reports any MOUTH_CORNER_OPEN
// For every named seed: rebuild the stored genome exactly as verify does (fromSeed → buildFish 'med'), run the shared audit (coherence.js L6) and list each free
// pocket edge in the corner region with the constructor group that owns it (hood/floor rings, cheek wall R/L, …), the wall row/column, its station u / mcU and depth.
import './headless.mjs';
import * as THREE from 'three';
import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname), eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { FG } = await import(eng('fishgen.js')); const { initProcGen, fromSeed, randomFish } = await import(eng('procgen.js'));
const COH = await import(eng('coherence.js')); const { jawEnv } = await import(eng('teethgeo.js'));
initProcGen(FG);
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const NAMED = ['3SB1GD9P', 'EGRWC5YJ', 'T08KPND9', 'V66HKTNW'];
const seeds = process.argv.slice(2).length ? process.argv.slice(2) : NAMED;

/* same weld / free-edge rule as coherence.js mouthSeal, but every free edge in the corner region is reported (owner group, depth) */
function cornerEdges(fish) {
  const bm = fish.bm, pocket = fish.group.children.find(m => m.userData && m.userData.groups && m.userData.mouthPart); if (!pocket) return { none: true, list: [] };
  const geo = pocket.geometry, P = geo.getAttribute('position'), idx = geo.index.array, A = geo.getAttribute('aBody'), grp = geo.userData.groups || pocket.userData.groups;
  const q = bm.L * 1e-6, W = new Map(), EC = new Map(), ends = new Map(), tri = new Map();
  const id = i => { const k = Math.round(P.getX(i) / q) + ',' + Math.round(P.getY(i) / q) + ',' + Math.round(P.getZ(i) / q); if (!W.has(k)) W.set(k, W.size); return W.get(k); };
  for (let k = 0; k < idx.length; k += 3) for (let e = 0; e < 3; e++) { const a = id(idx[k + e]), b = id(idx[k + (e + 1) % 3]); if (a === b) continue; const kk = a < b ? a * 1e7 + b : b * 1e7 + a; EC.set(kk, (EC.get(kk) || 0) + 1); ends.set(kk, [idx[k + e], idx[k + (e + 1) % 3]]); tri.set(kk, k / 3); }
  const hl = bm.h * bm.L, ee = {}, list = [];
  for (const [kk, c] of EC) {
    if (c !== 1) continue; const [a, b] = ends.get(kk), m = { x: (P.getX(a) + P.getX(b)) / 2, y: (P.getY(a) + P.getY(b)) / 2, z: (P.getZ(a) + P.getZ(b)) / 2 };
    const len = Math.hypot(P.getX(a) - P.getX(b), P.getY(a) - P.getY(b), P.getZ(a) - P.getZ(b)); if (len < 1e-4 * hl) continue;
    if (A.getX(a) < bm.mcU * .7) continue;
    jawEnv(bm, { clamp }, m.x, m.y, ee); const depth = Math.min(ee.dUp - ee.ly, ee.ly + ee.dDn, ee.hw - Math.abs(m.z));
    const t = tri.get(kk), g = (grp || []).find(r => t >= r.a && t < r.b);
    list.push({ group: g ? g.name : '?', tri: t, a, b, ua: A.getX(a) / bm.mcU, ub: A.getX(b) / bm.mcU, depth: depth / hl, bad: depth > .03 * hl, z: m.z / hl });
  }
  return { list, hl };
}
const describe = fish => { const bm = fish.bm, M = bm.law.mouth; return `pos=${fish.bm.g.mouth.position || '-'} type=${bm.g.mouth.type} constr=${M.construction} mcU=${bm.mcU.toFixed(4)} hingeU=${bm.hingeU || 0} jawStartU=${bm.jawStartU.toFixed(4)} tipF=${bm.tipF.toFixed(3)} cornerF=${bm.cornerF.toFixed(3)}`; };

let named = 0, namedBad = 0;
for (const s of seeds) {
  const f = fromSeed(s), fish = FG.buildFish(JSON.parse(JSON.stringify(f.genome)), { quality: 'med' });
  try {
    const v = COH.auditCoherence(fish, THREE).filter(x => x.code === 'MOUTH_CORNER_OPEN'), r = cornerEdges(fish), bad = r.list.filter(e => e.bad);
    named++; if (v.length || bad.length) namedBad++;
    console.log(`${s} ${f.lineage}  ${describe(fish)}\n  audit: ${v.length ? v.map(x => x.msg).join(' | ') : 'no MOUTH_CORNER_OPEN'}   free corner edges (any depth): ${r.list.length}, inside head (>0.03 HL): ${bad.length}`);
    for (const e of r.list.slice(0, 12)) console.log(`    ${e.bad ? 'BAD ' : 'ok  '}${e.group.padEnd(18)} tri ${e.tri}  v ${e.a}-${e.b}  u/mcU ${e.ua.toFixed(3)}-${e.ub.toFixed(3)}  z/HL ${e.z.toFixed(3)}  depth/HL ${e.depth.toFixed(3)}`);
  } finally { fish.dispose(); }
}
console.log(`NAMED: ${named - namedBad}/${named} seeds with zero free edges inside the head at the mouth corner`);

const STRESS = +process.env.STRESS || 0;
if (STRESS) {
  for (const clade of ['ancient', 'shark', 'ray', 'cat']) {
    let n = 0, hit = 0; const ex = [];
    for (let i = 0; i < STRESS; i++) {
      let f; try { f = randomFish(clade); } catch (e) { continue; }
      const fish = FG.buildFish(JSON.parse(JSON.stringify(f.genome)), { quality: 'med' });
      try { n++; const v = COH.auditCoherence(fish, THREE).filter(x => x.code === 'MOUTH_CORNER_OPEN'); if (v.length) { hit++; if (ex.length < 6) ex.push(f.seed + ' ' + f.lineage + ' ' + v[0].msg); } } finally { fish.dispose(); }
    }
    console.log(`STRESS ${clade.padEnd(8)} built ${n}  MOUTH_CORNER_OPEN ${hit}` + (ex.length ? '\n   ' + ex.join('\n   ') : ''));
  }
}
/* POP=n  deterministic populations (seeds 'PA'+i over every clade, and the first n subterminal / inferior mouths from seeds 'PV'+i): per fish the audit's L6 hit, the
   strict by-construction metric (free pocket edges in the corner region at ANY depth), the round-4 centre-plane standing sheets, and a fingerprint of the pocket mesh.
   SAVE=file writes the table; BASE=file compares against an earlier table (how many pockets changed, and where). */
const POP = +process.env.POP || 0;
if (POP) {
  const { readFileSync, writeFileSync } = await import('node:fs');
  const fp = fish => { const p = fish.group.children.find(m => m.userData && m.userData.groups && m.userData.mouthPart); if (!p) return 'none'; let h = 2166136261; const eat = a => { const b = new Uint8Array(a.buffer, a.byteOffset, a.byteLength); for (let i = 0; i < b.length; i++) h = Math.imul(h ^ b[i], 16777619) >>> 0; }; eat(p.geometry.getAttribute('position').array); eat(p.geometry.index.array); eat(p.geometry.getAttribute('aBody').array); return h.toString(16); };
  const T = {}, tot = { all: [0, 0, 0, 0], ventral: [0, 0, 0, 0] };
  const run = (set, seed) => { let f; try { f = fromSeed(seed); } catch (e) { return false; } const type = f.genome.mouth.type; if (set === 'ventral' && !/^(subterminal|inferior)$/.test(type)) return false;
    const fish = FG.buildFish(JSON.parse(JSON.stringify(f.genome)), { quality: 'med' });
    try { const hit = COH.auditCoherence(fish, THREE).some(x => x.code === 'MOUTH_CORNER_OPEN'), r = cornerEdges(fish), sh = FG.centreAudit(fish.bm).sheets; const t = tot[set];
      t[0]++; t[1] += hit ? 1 : 0; t[2] += r.list.length ? 1 : 0; t[3] += sh; T[set + ':' + seed] = { lin: f.lineage, type, hit, free: r.list.length, sheets: sh, fp: fp(fish) }; } finally { fish.dispose(); }
    return true; };
  for (let i = 0; i < POP; i++) run('all', 'PA' + (i * 2654435 + 11).toString(36).toUpperCase());
  for (let i = 0, n = 0; n < POP && i < POP * 40; i++) if (run('ventral', 'PV' + (i * 2654435 + 13).toString(36).toUpperCase())) n++;
  for (const [k, t] of Object.entries(tot)) console.log(`POP ${k.padEnd(8)} fish ${t[0]}  MOUTH_CORNER_OPEN ${t[1]}  fish with ANY free corner edge ${t[2]}  centre-plane standing sheets ${t[3]}`);
  if (process.env.SAVE) writeFileSync(process.env.SAVE, JSON.stringify(T));
  if (process.env.BASE) { const B = JSON.parse(readFileSync(process.env.BASE, 'utf8')), ch = Object.keys(T).filter(k => B[k] && B[k].fp !== T[k].fp), by = {};
    for (const k of ch) by[T[k].type] = (by[T[k].type] || 0) + 1;
    console.log(`changed pockets vs BASE: ${ch.length}/${Object.keys(T).length}  by mouth type ${JSON.stringify(by)}`);
    for (const k of ch.slice(0, 10)) console.log(`   ${k} ${T[k].lin} ${T[k].type}  free ${B[k].free}->${T[k].free}  hit ${B[k].hit}->${T[k].hit}  sheets ${B[k].sheets}->${T[k].sheets}`); }
}
process.exit(namedBad ? 1 : 0);
