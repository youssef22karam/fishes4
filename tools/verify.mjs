// Runnable verification report:  node tools/reassemble.mjs && node tools/verify.mjs
//   env: UNIQ=10000 (seeds)  COH=1000 (fish)  SAMPLE=1000 (near-duplicate sample)
import './headless.mjs';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const { FG } = await import(pathToFileURL(resolve(root, 'src/engine/fishgen.js')).href);
const eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { initProcGen, fromSeed, randomFish, mutateFish, breedFish, STATS } = await import(eng('procgen.js'));
const { combinatorics, CLADE_IDS, CLADES, envelope } = await import(eng('clades.js'));
const { traitDistance, makeRng, hashHex } = await import(eng('genome.js'));
const { validate, INVARIANTS, checkTraits } = await import(eng('validate.js'));
initProcGen(FG);

const UNIQ = +process.env.UNIQ || 10000, COH = +process.env.COH || 1000, SAMPLE = +process.env.SAMPLE || 1000;
const line = (c = '─') => console.log(c.repeat(78));
const pct = (a, b) => `${a}/${b}`;
let exit = 0;

/* ───────── 0. combinatorics ───────── */
line('═'); console.log(' ICHTHYOGEN PROCEDURAL GENOME — VERIFICATION REPORT'); line('═');
const C = combinatorics(8);
console.log('\n[0] TRAIT-SPACE ARITHMETIC');
console.log(`  continuous axes: ${C.contAxes}  (each counted at only ${C.levels} perceptibly distinct levels)`);
console.log(`  discrete axes:   ${C.discAxes}  option universe: ${Object.entries(C.discSizes).map(([k, v]) => k + '×' + v).join(' ')}`);
console.log(`  full axis product            = ${C.levels}^${C.contAxes} × Π(discrete) = 10^${C.logUnion.toFixed(1)}`);
console.log(`  inside clade envelopes only  = Σ over ${C.perClade.length} lineages of Π(envelope levels) = 10^${C.logEnvelopeSum.toFixed(1)}`);
console.log(`  smallest lineage envelope    = 10^${Math.min(...C.perClade.map(c => c.log10)).toFixed(1)}  (${C.perClade.sort((a, b) => a.log10 - b.log10)[0].lineage})`);
console.log(`  requirement ≥ 10^9           → ${C.logEnvelopeSum >= 9 ? 'PASS' : 'FAIL'}  (10,000 fish = 10^4, a 10^${(C.logEnvelopeSum - 4).toFixed(0)}-fold undersample)`);
if (C.logEnvelopeSum < 9) exit = 1;

/* ───────── 1. uniqueness ───────── */
console.log(`\n[1] UNIQUENESS — ${UNIQ} seeds`);
let t0 = performance.now(); const hashes = new Set(), seeds = [], fishSample = [], perClade = {};
let attempts = 0, failedSeeds = 0;
for (let i = 0; i < UNIQ; i++) {
  const seed = hashHex('uniq' + i).slice(0, 8).toUpperCase().replace(/[ILOU]/g, c => ({ I: '1', L: '1', O: '0', U: 'V' }[c]));
  let f; try { f = fromSeed(seed); } catch (e) { failedSeeds++; continue; }
  seeds.push(seed); hashes.add(f.hash); attempts += f.attempts; perClade[f.clade] = (perClade[f.clade] || 0) + 1;
  if (i % Math.max(1, Math.floor(UNIQ / SAMPLE)) === 0 && fishSample.length < SAMPLE) fishSample.push(f.traits);
}
const dt = (performance.now() - t0) / 1000;
console.log(`  generated ${seeds.length} (failed to resolve: ${failedSeeds}) in ${dt.toFixed(1)} s  (${(dt * 1000 / UNIQ).toFixed(2)} ms/genome incl. gate)`);
console.log(`  distinct genome hashes: ${hashes.size}/${UNIQ}   distinct seeds: ${new Set(seeds).size}   mean gate attempts/seed: ${(attempts / seeds.length).toFixed(2)}`);
const uOk = hashes.size === UNIQ; if (!uOk) exit = 1;
let minD = 9, minPair = null, under = 0, sum = 0, pairs = 0; const TH = .02;
for (let i = 0; i < fishSample.length; i++) for (let j = i + 1; j < fishSample.length; j++) { const d = traitDistance(fishSample[i], fishSample[j]); sum += d; pairs++; if (d < minD) { minD = d; minPair = [i, j]; } if (d < TH) under++; }
console.log(`  trait-distance on ${fishSample.length} fish (${pairs} pairs): min=${minD.toFixed(4)} mean=${(sum / pairs).toFixed(3)}  pairs under ${TH}: ${under}`);
const nnMin = []; for (let i = 0; i < Math.min(fishSample.length, 300); i++) { let m = 9; for (let j = 0; j < fishSample.length; j++) if (j !== i) m = Math.min(m, traitDistance(fishSample[i], fishSample[j])); nnMin.push(m); }
nnMin.sort((a, b) => a - b); console.log(`  nearest-neighbour distance: min=${nnMin[0].toFixed(3)} p10=${nnMin[Math.floor(nnMin.length * .1)].toFixed(3)} median=${nnMin[nnMin.length >> 1].toFixed(3)}`);
const ndOk = under === 0; if (!ndOk) exit = 1;
console.log(`  clade mix: ${Object.entries(perClade).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + (100 * v / seeds.length).toFixed(1) + '%').join(', ')}`);
let det = 0; for (let i = 0; i < 60; i++) { const a = fromSeed(seeds[i]), b = fromSeed(seeds[i]); if (a.hash === b.hash && JSON.stringify(a.traits) === JSON.stringify(b.traits)) det++; }
console.log(`  determinism (same seed → same fish): ${pct(det, 60)}`); if (det !== 60) exit = 1;
console.log(`  UNIQUENESS RESULT: ${uOk && ndOk ? 'PASS' : 'FAIL'}`);

/* ───────── 2. coherence ───────── */
console.log(`\n[2] COHERENCE — ${COH} generated fish across ${CLADE_IDS.length} clades (gate re-run on the stored genome + mesh audit)`);
const perInv = Object.fromEntries(INVARIANTS.map(i => [i, 0])); let all = 0, geoOk = 0, mut = 0, mutOk = 0, bred = 0, bredOk = 0;
const times = [], bad = []; const cladeCount = {};
const fishList = [];
const strat = Math.floor(COH * .6 / CLADE_IDS.length);
for (let i = 0; i < COH; i++) {
  const filter = i < strat * CLADE_IDS.length ? CLADE_IDS[i % CLADE_IDS.length] : undefined;
  const f = randomFish(filter); fishList.push(f); cladeCount[f.clade] = (cladeCount[f.clade] || 0) + 1;
  const rep = validate(f.traits, f.genome, FG);
  for (const inv of INVARIANTS) if (rep.passed[inv]) perInv[inv]++;
  /* real geometry audit: build the mesh, check symmetry / root attachment / budget / unrepaired constraints */
  const tb = performance.now(); let fish = null, geo = { errors: ['build failed'] };
  try { fish = FG.buildFish(f.genome, { quality: 'med' }); times.push(performance.now() - tb); geo = FG.checkFishGeometry(fish); } catch (e) { geo = { errors: ['build threw ' + e.message] }; }
  const eyeMeshes = fish ? fish.group.children.filter(m => m.userData && m.userData.eyeball).length : -1;
  if (fish) fish.dispose();
  if (!geo.errors.length) geoOk++;
  if (rep.ok && !geo.errors.length) all++; else bad.push(`${f.seed} ${f.lineage} ${[...rep.failures.map(x => x.msg), ...geo.errors].slice(0, 2).join(' | ')}`);
}
for (let i = 0; i < 250; i++) { const a = fishList[i % fishList.length], m = mutateFish(a); mut++; const e = envelope(m.clade, m.lineage); if (validate(m.traits, m.genome, FG).ok && !checkTraits(m.traits).length && m.clade === a.clade) mutOk++; }
for (let i = 0; i < 250; i++) { const a = fishList[(i * 7) % fishList.length], b = fishList[(i * 13 + 5) % fishList.length], c = breedFish(a, b); bred++; if (validate(c.traits, c.genome, FG).ok && !checkTraits(c.traits).length) bredOk++; }
console.log('  clade coverage: ' + CLADE_IDS.map(c => `${c}:${cladeCount[c] || 0}`).join(' '));
console.log('  invariant                                  passed');
const labels = { tail: 'tail family by plan, outline/aspect/peduncle/keel by swim axis, lobe ratio bounds', plan: 'flattened plan: eyes+spiracles top, mouth+5 gill pairs bottom, slender tail', symmetry: 'bilateral symmetry (flatfish: real asymmetry only)', eyes: '2 eyes, on head, embedded, 3–15% of head', appendages: 'every appendage attached on the body', fins: 'standard fin set, stations, sizes', mouth_gills: 'one mouth+jaw, teeth inside, gills behind head', profile: 'smooth profile, no kinks/twist/self-intersect', colour: 'natural colour, photophores deep-sea only', envelope: 'every axis inside its clade envelope' };
for (const inv of INVARIANTS) console.log(`  ${(inv + ' — ' + labels[inv]).padEnd(60)} ${pct(perInv[inv], COH)}`);
console.log(`  mesh audit (symmetry, fin roots on skin, tri budget, 0 unrepaired rules)   ${pct(geoOk, COH)}`);
console.log(`  mutate ×${mut}: stays in envelope & valid ${pct(mutOk, mut)}    breed ×${bred}: clamped & valid ${pct(bredOk, bred)}`);
times.sort((a, b) => a - b);
console.log(`  mesh build @ gallery quality ('med'): median ${times[times.length >> 1].toFixed(1)} ms  p95 ${times[Math.floor(times.length * .95)].toFixed(1)} ms  max ${times[times.length - 1].toFixed(1)} ms`);
console.log(`  gate: ${STATS.accepted} accepted / ${STATS.rejected} rejected genomes during this run`);
const top = Object.entries(STATS.byInvariant).sort((a, b) => b[1] - a[1]).slice(0, 8); if (top.length) console.log('  top rejection reasons (these were resampled, never rendered):\n    ' + top.map(([k, v]) => v + '× ' + k).join('\n    '));
console.log(`  COHERENCE RESULT: ${all}/${COH}  ${all === COH && mutOk === mut && bredOk === bred ? 'PASS' : 'FAIL'}`);
if (all !== COH || mutOk !== mut || bredOk !== bred) { exit = 1; console.log('  failing examples:\n    ' + bad.slice(0, 12).join('\n    ')); }
line('═'); console.log(exit ? ' OVERALL: FAIL' : ' OVERALL: PASS'); line('═');
process.exit(exit);
