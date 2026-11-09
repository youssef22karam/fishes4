// Random-sample COHERENCE CENSUS (round 6H).   node tools/reassemble.mjs && node tools/randaudit.mjs [label]
//   env: STD=300 (random standard genomes)  WON=300 (Wonder/hybrid candidates)  ROOT=<project root>  OUT=docs/census
// Standard sample: production randomFish() (same path the Random button / verify uses).  Wonder sample: production wonderCandidate(habitat, seed) (the exact generator the
// Random=Wonder button rolls 12 of).  Every fish is built (gallery quality) and put through the SHARED audit (src/engine/coherence.js, laws L1-L6); violations are counted PER CLASS.
//   standard            : genomes exactly as produced
//   wonder RAW          : every candidate the generator rolls, before any filter
//   wonder SHIPPED      : candidates that pass the production filter (violations + structuralAudit) - what the button can actually show
// Exit 1 unless every class is ZERO for standard and wonder-shipped.
import './headless.mjs';
import * as THREE from 'three';
import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path'; import { mkdirSync, writeFileSync } from 'node:fs';
const root = resolve(process.env.ROOT || new URL('..', import.meta.url).pathname), eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { FG } = await import(eng('fishgen.js')); const { initProcGen, randomFish } = await import(eng('procgen.js')); const COH = await import(pathToFileURL(resolve(new URL('..', import.meta.url).pathname, 'src/engine/coherence.js')).href);
initProcGen(FG);
const STD = +process.env.STD || 300, WON = +process.env.WON || 300, label = process.argv[2] || 'run', outDir = resolve(process.env.OUT || 'docs/census');
const HABS = ['coralReef', 'openOcean', 'cave', 'mountainStream', 'rockyShore', 'seagrass', 'slowRiver', 'hadal'].filter(h => !FG.HABITATS || FG.HABITATS[h]);
const audit = g => { const fish = FG.buildFish(JSON.parse(JSON.stringify(g)), { quality: 'med' }); try { return COH.auditCoherence(fish, THREE); } finally { fish.dispose(); } };
const R = { label, std: { n: 0, byClass: COH.countByClass([]), fishWith: 0, examples: [] }, wonRaw: { n: 0, unviable: 0, byClass: COH.countByClass([]), fishWith: 0, examples: [] }, wonShipped: { n: 0, byClass: COH.countByClass([]), fishWith: 0, examples: [] } };
const tally = (S, v, tag) => { S.n++; if (v.length) { S.fishWith++; if (S.examples.length < 8) S.examples.push(tag + ' ' + v.slice(0, 2).map(x => x.code + ': ' + x.msg).join(' | ')); } COH.countByClass(v, S.byClass); };
let t0 = Date.now();
for (let i = 0; i < STD; i++) { const f = randomFish(); tally(R.std, audit(f.genome), f.seed + ' ' + f.lineage); }
console.log('standard done', ((Date.now() - t0) / 1000).toFixed(0) + 's');
t0 = Date.now();
for (let i = 0; i < WON; i++) {
  let w; try { w = FG.wonderCandidate(HABS[i % HABS.length], 'ra' + label + ':' + i); } catch (e) { R.wonRaw.unviable++; continue; }
  const c = w.c; let v; try { v = audit(c); } catch (e) { R.wonRaw.unviable++; continue; }
  const tag = c.meta.name; tally(R.wonRaw, v, tag);
  let ok = false; try { ok = !FG.violations(c).length && !FG.structuralAudit(c).length; } catch (e) { ok = false; }
  if (ok) tally(R.wonShipped, v, tag);
}
console.log('wonder done', ((Date.now() - t0) / 1000).toFixed(0) + 's');
mkdirSync(outDir, { recursive: true }); writeFileSync(`${outDir}/randaudit-${label}.json`, JSON.stringify(R, null, 1));
const row = (n, S) => `  ${n.padEnd(16)} n=${String(S.n).padEnd(4)} fish-with-violation=${String(S.fishWith).padEnd(4)} ` + COH.CODES.map(c => `${c}=${S.byClass[c]}`).join(' ');
console.log(`\nRANDOM-SAMPLE COHERENCE CENSUS [${label}]\n` + row('standard', R.std) + '\n' + row('wonder RAW', R.wonRaw) + `  (unviable draws: ${R.wonRaw.unviable})\n` + row('wonder SHIPPED', R.wonShipped));
for (const k of ['std', 'wonRaw', 'wonShipped']) if (R[k].examples.length) console.log(` examples ${k}:\n   ` + R[k].examples.slice(0, 4).join('\n   '));
const bad = Object.values(R.std.byClass).some(x => x) || Object.values(R.wonShipped.byClass).some(x => x);
console.log(bad ? 'RANDAUDIT FAIL' : 'RANDAUDIT PASS'); process.exit(bad ? 1 : 0);
