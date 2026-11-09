// Round-6A DISC-PLAN AUDIT.  node tools/reassemble.mjs && node tools/r6audit.mjs      (env UNIQ = seeds scanned, default 10000)
// Samples every disc-plan fish (plan family 'ray') among the validation seeds (same seed list as tools/verify.mjs) and checks the built meshes:
//  (a) thickness: wing/edge thickness > 0 everywhere (fraction of disc width) and centre >= 4x edge
//  (b) opacity: every material of the fish is non-transparent with alpha uniform 0, no margin-fin mesh, body loft is a CLOSED manifold (no hole to see through)
//  (c) underside: one ventral mouth below the mid-plane + exactly 5 gill-slit pairs on the underside; spiracles on top; cephalic lobes only when the axes call for them
import './headless.mjs';
import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname), eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { FG } = await import(eng('fishgen.js')); const { initProcGen, fromSeed } = await import(eng('procgen.js')); const { hashHex } = await import(eng('genome.js')); const D = await import(eng('discgeo.js')); initProcGen(FG);
const N = +process.env.UNIQ || 10000, bad = [], S = { disc: 0, minFrac: 9, minRatio: 1e9, minCentreFrac: 9, wingMinFrac: 9, transparent: 0, holes: 0, fin: 0, mouthOk: 0, gillsOk: 0, spirOk: 0, ceph: 0, cephExpected: 0, tris: 0 };
for (let i = 0; i < N; i++) {
  const seed = hashHex('uniq' + i).slice(0, 8).toUpperCase().replace(/[ILOU]/g, c => ({ I: '1', L: '1', O: '0', U: 'V' }[c]));
  let f; try { f = fromSeed(seed); } catch { continue; } if (FG.axesOf(f.genome).plan.family !== 'ray') continue;
  S.disc++; const fish = FG.buildFish(JSON.parse(JSON.stringify(f.genome)), { quality: 'med' }), bm = fish.bm; S.tris = Math.max(S.tris, fish.info.tris);
  const T = D.thicknessProbe(bm); S.minFrac = Math.min(S.minFrac, T.minFrac); S.wingMinFrac = Math.min(S.wingMinFrac, T.wingMin / T.W); S.minRatio = Math.min(S.minRatio, T.centreOverEdge); S.minCentreFrac = Math.min(S.minCentreFrac, T.centre / T.W);
  if (!(T.minFrac > 0)) bad.push(seed + ' wing thickness 0'); if (T.centreOverEdge < 4) bad.push(seed + ' centre/edge ' + T.centreOverEdge.toFixed(2));
  /* (b) */
  let tr = 0; fish.group.traverse(m => { if (m.isMesh && m.material) { const mat = m.material; if (mat.transparent && mat !== fish.materials.fin && !mat.userData.glass && !(mat.uniforms && mat.uniforms.uEyeCol)) tr++; } });
  if (fish.materials.body.transparent || fish.materials.jaw.transparent || fish.materials.body.uniforms.uTrans.value !== 0) tr++; if (tr) { S.transparent++; bad.push(seed + ' transparent material'); }
  if ((fish.info.attachments || []).some(a => a.kind === 'pectoral')) { S.fin++; bad.push(seed + ' margin fin present'); }
  const gi = fish.parts.body.geometry.index.array, edges = new Map(); for (let k = 0; k < gi.length; k += 3) for (let e = 0; e < 3; e++) { const a = gi[k + e], b = gi[k + (e + 1) % 3], key = a < b ? a * 1e6 + b : b * 1e6 + a; edges.set(key, (edges.get(key) || 0) + 1); }
  let open = 0; for (const c of edges.values()) if (c !== 2) open++; if (open) { S.holes++; bad.push(seed + ' open edges ' + open); }
  /* (c) */
  const dm = fish.parts.discMouth && fish.parts.discMouth.userData.discMouth, gm = fish.parts.gills && fish.parts.gills.userData.discGills;
  if (dm && dm.ventral && dm.y < 0) S.mouthOk++; else bad.push(seed + ' no ventral mouth');
  const per = [0, 0]; if (gm) for (const s of gm.slits) { if (s.y < 0) per[s.side > 0 ? 1 : 0]++; }
  if (gm && gm.pairs === 5 && per[0] === 5 && per[1] === 5) S.gillsOk++; else bad.push(seed + ' gill slits ' + per);
  const nos = fish.parts.marks.userData.nostrils, sp = nos.filter(n => n.type === 1); if (sp.length === 2 && sp.every(n => n.ny > .3 && n.y > 0)) S.spirOk++; else bad.push(seed + ' spiracles');
  const want = D.cephalicWanted(bm), have = (fish.parts.cephalic || []).length; S.cephExpected += want ? 1 : 0; S.ceph += have ? 1 : 0; if (want !== (have === 2)) bad.push(seed + ' cephalic mismatch');
}
/* cephalic lobes appear when the forward-margin axis calls for them (head.special 'horns'): force the axis on one disc genome and off on another */
const probe = fromSeed(hashHex('uniq0').slice(0, 8)); let cephForced = 'n/a';
for (let i = 0; i < 4000; i++) { const seed = 'Z' + i.toString(36); let f; try { f = fromSeed(seed); } catch { continue; } if (FG.axesOf(f.genome).plan.family !== 'ray') continue;
  const g1 = JSON.parse(JSON.stringify(f.genome)), g2 = JSON.parse(JSON.stringify(f.genome)); g2.head.special = 'horns', g2.head.specialLen = .12;
  const a = FG.buildFish(g1, { quality: 'med' }), b = FG.buildFish(g2, { quality: 'med' }); cephForced = `off:${(a.parts.cephalic || []).length} on:${(b.parts.cephalic || []).length}`; if ((a.parts.cephalic || []).length !== 0 || (b.parts.cephalic || []).length !== 2) bad.push('forced cephalic ' + cephForced); break; }
console.log(JSON.stringify({ seedsScanned: N, discFish: S.disc, minWingEdgeThicknessOverWidth: +S.minFrac.toFixed(5), minWingAnyOverWidth: +S.wingMinFrac.toFixed(5), minCentreOverWidth: +S.minCentreFrac.toFixed(4), minCentreOverEdge: +S.minRatio.toFixed(2), transparentMaterials: S.transparent, marginFins: S.fin, fishWithOpenEdges: S.holes, ventralMouthOk: S.mouthOk, fivePairGillsOk: S.gillsOk, spiraclesTopOk: S.spirOk, cephalicLobesNaturalPopulation: S.ceph, cephalicForcedAxis: cephForced, maxTris: S.tris }, null, 1));
console.log('violations:', bad.length, bad.slice(0, 8)); console.log(bad.length ? 'DISC AUDIT FAIL' : 'DISC AUDIT PASS'); process.exit(bad.length ? 1 : 0);
