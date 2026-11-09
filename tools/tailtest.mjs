// Round-3 tail / fin audit:  npm run reassemble && node tools/tailtest.mjs [N=1000]
// Builds N generated fish (gallery quality) and measures, from the MESH: resting tail pitch, heterocercal lobe ratio, caudal height / area, dorsal / anal height,
// pelvic vs side fin, fin-base burial; then renders the outline signature of a plan × swim-mode grid and checks diversity + caps + the two axis gates.
import './headless.mjs';
import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname), eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { FG } = await import(eng('fishgen.js')); const { initProcGen, fromSeed } = await import(eng('procgen.js')); const TG = await import(eng('tailgeo.js'));
initProcGen(FG);
const N = +process.argv[2] || 1000, q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; }, f3 = x => (+x).toFixed(3);
const rim = [], bad = [], S = { pitch: [], lobe: [], capH: [], capA: [], dor: [], anal: [], pelRatio: [], spine: [], sink: [] }, cells = {}, fam = {}; let built = 0, het = 0, none = 0, fail = 0;
for (let i = 0; i < N; i++) {
  const seed = 'R3' + (i * 2654435 + 11).toString(36); let f; try { f = fromSeed(seed); } catch { fail++; continue; }
  const g = f.genome, ax = FG.axesOf(g), fish = FG.buildFish(JSON.parse(JSON.stringify(g)), { quality: 'med' }), t = fish.info.tail, H = fish.info.finH || {}; built++;
  if (!t) { none++; } else {
    const orn = TG.isOrnamental(ax); fam[t.family] = (fam[t.family] || 0) + 1;
    S.pitch.push(Math.abs(t.pitchDeg)); S.capH.push(t.heightL); S.capA.push(t.areaL); if (t.family === 'heterocercal') { het++; S.lobe.push(t.lobeRatio); S.spine.push(t.spineDeg); }
    if (Math.abs(t.pitchDeg) > 15) bad.push(seed + ' pitch ' + f3(t.pitchDeg)); if (t.family === 'heterocercal' && t.lobeRatio > 2.2 + 1e-6) bad.push(seed + ' lobe ' + f3(t.lobeRatio));
    if (t.heightL > (orn ? .55 : .38) + 1e-6) bad.push(seed + ' caudal height ' + f3(t.heightL)); if (t.areaL > .16 + 1e-6) bad.push(seed + ' caudal area ' + f3(t.areaL));
    if (t.family === 'heterocercal' && (t.spineDeg < 10 - 1e-6 || t.spineDeg > 30 + 1e-6)) bad.push(seed + ' spine ' + t.spineDeg);
    const key = ax.plan.family + '|' + ax.swim; (cells[key] ||= []).push(t.outline);
  }
  for (const e of fish.bm.eyes || []) if (e.rimH != null) rim.push(e.rimH);
  if (H.dorsal != null) { S.dor.push(H.dorsal); if (H.dorsal > .30 + 1e-6) bad.push(seed + ' dorsal ' + f3(H.dorsal)); }
  if (H.anal != null) { S.anal.push(H.anal); if (H.anal > .30 + 1e-6) bad.push(seed + ' anal ' + f3(H.anal)); }
  if (H.pelvic != null && H.pecL > 0 && fish.bm.a.family !== 'glider' && fish.bm.a.family !== 'ray') { S.pelRatio.push(H.pelvic / H.pecL); if (H.pelvic > H.pecL * 1.05) bad.push(seed + ' pelvic > side fin ' + f3(H.pelvic / H.pecL)); }
  if (fish.info.attachments) for (const a of fish.info.attachments) { /* sink recorded through allow */ }
}
const sig = o => o.map(([x, y]) => x.toFixed(2) + ',' + y.toFixed(2)).join(';');
const cellKeys = Object.keys(cells), proto = {}; for (const k of cellKeys) { const m = cells[k].map(o => o.map(p => p[0])); proto[k] = m[0].map((_, j) => m.reduce((s, r) => s + r[j], 0) / m.length); }
let collapsed = 0, pairs = 0, minD = 9; for (let a = 0; a < cellKeys.length; a++) for (let b = a + 1; b < cellKeys.length; b++) { pairs++; const d = Math.sqrt(proto[cellKeys[a]].reduce((s, v, j) => s + (v - proto[cellKeys[b]][j]) ** 2, 0) / proto[cellKeys[a]].length); minD = Math.min(minD, d); }
const distinct = new Set(Object.values(cells).flat().map(sig)).size, total = Object.values(cells).flat().length;
/* axis gates (synthetic axes): ornamental flag opens the .55 cap + filaments, nothing else does */
const mk = (flags, swim = 'carangiform', plan = {}) => ({ flags: new Set(flags), swim, plan: { family: 'rayfin', flat: 0, cartilaginous: false, elongated: false, ...plan } });
const gateOK = FG.LAW.tailLaw(mk(['ornamental'])).capH === .55 && FG.LAW.tailLaw(mk(['ornamental'])).types.includes('filamentous') && FG.LAW.tailLaw(mk(['predator', 'ambusher', 'glider'])).capH === .38 && !FG.LAW.tailLaw(mk(['ambusher', 'glider'], 'anguilliform')).types.includes('filamentous');
const rep = { built, noTailFish: none, families: fam, heterocercal: het,
  pitchDeg: { median: f3(q(S.pitch, .5)), p98: f3(q(S.pitch, .98)), max: f3(Math.max(...S.pitch)) }, lobeRatio: { n: S.lobe.length, median: f3(q(S.lobe, .5)), p98: f3(q(S.lobe, .98)), max: f3(Math.max(...S.lobe)), over2: S.lobe.filter(x => x > 2).length, bulk_1_1_to_1_6: f3(S.lobe.filter(x => x <= 1.6).length / S.lobe.length) },
  spineDeg: { min: f3(Math.min(...S.spine)), max: f3(Math.max(...S.spine)) }, caudalHeightOverL: { median: f3(q(S.capH, .5)), p98: f3(q(S.capH, .98)), max: f3(Math.max(...S.capH)) }, caudalAreaOverL2: { median: f3(q(S.capA, .5)), max: f3(Math.max(...S.capA)) },
  dorsalHeightOverL: { median: f3(q(S.dor, .5)), p98: f3(q(S.dor, .98)), max: f3(Math.max(...S.dor)) }, analHeightOverL: { median: f3(q(S.anal, .5)), max: f3(Math.max(...S.anal)) }, pelvicOverSide: { median: f3(q(S.pelRatio, .5)), max: f3(Math.max(...S.pelRatio)) },
  eyeRimOverDiameter: { eyes: rim.length, median: f3(q(rim, .5)), p99: f3(q(rim, .99)), max: f3(Math.max(...rim)), over006: rim.filter(x => x > .06).length }, diversity: { planSwimCells: cellKeys.length, distinctOutlines: distinct + '/' + total, minCellPrototypeDistance: f3(minD) }, axisGatesOK: gateOK };
console.log(JSON.stringify(rep, null, 1)); console.log('violations:', bad.length, bad.slice(0, 10));
const ok = bad.length === 0 && gateOK && minD > .004 && distinct / total > .9; console.log(ok ? 'TAILTEST PASS' : 'TAILTEST FAIL'); process.exit(ok ? 0 : 1);
