/* ROUND 7 §9 audit — validate7 over named seeds + a random population,
   the gill-signature census with its axis-correlation table, the cavity
   depth distribution, and (with --shots <dir>) the WP5 blockiness metric
   over rendered head shots. Exit code non-zero on any failed gate.
   Usage: node tools/r7audit.mjs [--shots docs/upgrade/r7-shots]   env: N=1000 */
import './headless.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { FG } from '../src/engine/fishgen.js';
import { initProcGen, fromSeed, randomFish } from '../src/engine/procgen.js';
import { validate7, gillAxisRow } from '../src/engine/validate7.js';
import { gillPlan } from '../src/engine/gillplan.js';
import { readPng, blockiness } from './pngread.mjs';

initProcGen(FG);
const N = Math.max(20, parseInt(process.env.N || '1000', 10));
const NAMED = ['QOG9_', 'QUK8_', 'Q1CW5', 'QZTAI', 'Q10BMF', 'Y93Q_', 'LLLL2', 'BBBB2', 'Q8NMY', 'H2W9X'];
let failures = 0;
const fail = (code, msg) => { failures++; console.log('  FAIL', code, msg); };

/* ── named seeds: full per-fish checks, hero quality ── */
console.log('R7AUDIT named seeds (' + NAMED.length + ')');
const depths = [];
for (const s of NAMED) {
  const f = fromSeed(s);
  const fish = FG.buildFish(JSON.parse(JSON.stringify(f.genome ?? f)), { quality: 'hero' });
  for (const c of validate7(fish.bm, fish, null)) {
    if (!c.ok) fail(c.code, s + ' ' + c.note + ' = ' + c.value);
    else console.log('  ok  ', c.code, s, '=', c.value);
  }
  if (fish.bm.law.mouth.construction === 'jawed') depths.push(Math.min(fish.bm.g.mouth.cavityDepth, 0.62));
  fish.dispose();
}

/* ── population: census + axis table + per-fish checks (med quality) ── */
console.log('R7AUDIT population N=' + N);
const sigs = new Map(), axis = new Map();
let checked = 0, checkFails = 0;
for (let i = 0; i < N; i++) {
  const rf = randomFish();
  const fish = FG.buildFish(JSON.parse(JSON.stringify(rf.genome)), { quality: 'med' });
  const bm = fish.bm;
  for (const c of validate7(bm, fish, null)) if (!c.ok) { checkFails++; if (checkFails <= 8) fail(c.code, (rf.seed || i) + ' ' + c.note + ' = ' + c.value); }
  const plan = gillPlan(bm, bm.g, fish.parts.hyperGenome || null);
  const sig = fish.parts.hyper ? fish.parts.hyper.gillSignature : plan.signature(null, 0, 0);
  sigs.set(sig, (sigs.get(sig) || 0) + 1);
  const row = gillAxisRow(bm, null), a = axis.get(row) || { n: 0, fil: 0, rak: 0 };
  a.n++; a.fil += plan.filMul; a.rak += plan.rakerCount != null ? plan.rakerCount : bm.g ? 0 : 0;
  axis.set(row, a);
  if (bm.law.mouth.construction === 'jawed') depths.push(Math.min(bm.g.mouth.cavityDepth, 0.62));
  fish.dispose(); checked++;
}
console.log('  per-fish check failures: ' + checkFails + ' / ' + checked);
console.log('  gill signatures: ' + sigs.size + ' distinct in ' + checked + ' fish');
const censusGate = Math.min(500, Math.max(8, Math.round(checked * .5)));   /* full-strength (500) at the standard N=1000 sample; smoke runs scale down */
if (sigs.size < censusGate) fail('R7_GILL_CENSUS', 'only ' + sigs.size + ' distinct signatures in ' + checked + ' fish (gate ' + censusGate + '; design target ≥500 per 10,000)');
console.log('  axis correlation (mean filament multiplier by class):');
for (const [k, a] of axis) console.log('    ' + k.padEnd(20), 'n=' + a.n, 'filMul=' + (a.fil / a.n).toFixed(2), a.rak ? 'meanPlanRakers=' + (a.rak / a.n).toFixed(0) : '');
depths.sort((x, y) => x - y);
const median = depths[Math.floor(depths.length / 2)] || 0;
console.log('  cavity depth median (jawed): ' + median.toFixed(3) + '  p10=' + (depths[Math.floor(depths.length * .1)] || 0).toFixed(3) + '  p90=' + (depths[Math.floor(depths.length * .9)] || 0).toFixed(3));
if (median < 0.4) fail('R7_CAVITY_MEDIAN', 'median funnel depth ' + median.toFixed(3) + ' < 0.40 of head length');

/* ── WP5 blockiness over rendered shots (optional) ── */
const si = process.argv.indexOf('--shots');
if (si > 0) {
  const dir = process.argv[si + 1];
  console.log('R7AUDIT blockiness over ' + dir);
  for (const f of readdirSync(dir).filter(x => x.endsWith('.png')).sort()) {
    const b = blockiness(readPng(readFileSync(dir + '/' + f)));
    console.log('  ', f, 'grid/offgrid edge ratio =', b.toFixed(3));
    if (b > 1.30) fail('R7_BLOCKINESS', f + ' ratio ' + b.toFixed(3) + ' > 1.30');
  }
}

console.log(failures ? 'R7AUDIT FAIL (' + failures + ')' : 'R7AUDIT PASS');
process.exit(failures ? 1 : 0);
