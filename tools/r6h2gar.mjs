// Round 6H.2 gar-lineage eye-band check.   node tools/reassemble.mjs && node tools/r6h2gar.mjs
//   1. the 37 seeds Muse listed (+ every gar seed in the 10,000 uniqueness stream, + N extra gar seeds) resolve through fromSeed;
//   2. each resolved fish: FG.violations() empty, shared audit (analytic AND built-mesh) clean, eye anatomy measured on the BUILT head:
//        eye centre inside the head span, forward of the gill front, above the jaw line (centre above the spine axis, mouth corner
//        not behind the eye's front edge), cornea visible (EYE_SLICED class clean);
//   3. the feasible band exists for the whole gar envelope (h × eyeSize corners) and the sampler's eyeU never leaves it;
//   4. mutants and offspring of gar roots (mesh-audited gate) resolve without falling back to the parent.
import './headless.mjs';
import * as THREE from 'three';
import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname), eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { FG } = await import(eng('fishgen.js')); const P = await import(eng('procgen.js')); const G = await import(eng('genome.js')); const COH = await import(eng('coherence.js')); const { eyeBand } = await import(eng('eyeband.js')); const { envelope } = await import(eng('clades.js'));
P.initProcGen(FG);
const LISTED = '68A1F55C F8046E25 EA8547A5 6A559A97 60DCB156 7DCAF494 7F32B763 6E22FFF6 3330024C E352446D 9F08B11A 5E11DD70 CE33D46F A64DC7A3 8FB61B40 3AC1C6ED F2260BDB 6BBC7766 8755A046 69733C5F 875E118B F0C47722 3192FDF1 2CDA5475 9CEB748F E5546FE2 C7C8A3BF 22485CF0 4D1AA71B 112EBBDF E239A558 4E7A2C59 C97E04AF BE9A6F80 72B696D8 CC061253 8A9E65C9'.split(' ');
const EXTRA = +process.env.EXTRA || 150, seeds = new Set(LISTED);
for (let i = 0; i < 10000; i++) { const s = G.hashHex('uniq' + i).slice(0, 8).toUpperCase().replace(/[ILOU]/g, c => ({ I: '1', L: '1', O: '0', U: 'V' }[c])); if (P.peekClade(s).lineage === 'gar') seeds.add(s); }
for (let i = 0, n = 0; n < EXTRA && i < 100000; i++) { const s = G.hashHex('gar' + i).slice(0, 8).toUpperCase().replace(/[ILOU]/g, c => ({ I: '1', L: '1', O: '0', U: 'V' }[c])); if (P.peekClade(s).lineage === 'gar') { seeds.add(s); n++; } }
let fail = 0, ok = 0, listedOk = 0, maxAtt = 0; const bad = [], stat = { u: [], gap: [], mc: [] };
for (const s of seeds) {
  let f; try { f = P.fromSeed(s); } catch (e) { fail++; bad.push(s + ' UNRESOLVED'); continue; }
  const g = f.genome, v = FG.violations(g); if (v.length) { fail++; bad.push(s + ' violations ' + v.length); continue; }
  const fish = FG.buildFish(JSON.parse(JSON.stringify(g)), { quality: 'med' }); const A = COH.auditCoherence(fish, THREE), bm = fish.bm, lm = bm.lm; const eyes = bm.eyes;
  const aboveAxis = eyes.every(e => { let b = 1e9, y = 0; for (const p of bm.spine) { const d = Math.abs(p.x - e.center.x); if (d < b) { b = d; y = p.y; } } return e.center.y > y; });
  const eyeOnHead = lm.eye - bm.eyeR / bm.L > 0 && lm.eye + bm.eyeR / bm.L <= lm.operculum, fwdGill = lm.eye + .5 * bm.eyeR / bm.L <= lm.gillStart + 1e-9, jawOk = lm.mouthCorner <= lm.eye - bm.eyeR / bm.L + 1e-6;
  if (A.length || !aboveAxis || !eyeOnHead || !fwdGill || !jawOk) { fail++; bad.push(`${s} audit=${A.map(x => x.code).join(',')} above=${aboveAxis} onHead=${eyeOnHead} fwdGill=${fwdGill} jaw=${jawOk}`); fish.dispose(); continue; }
  stat.u.push(g.head.eyeU); stat.gap.push((lm.gillStart - lm.eye) / g.head.lengthFrac); stat.mc.push(lm.mouthCorner / g.head.lengthFrac);
  maxAtt = Math.max(maxAtt, f.attempts); ok++; if (LISTED.includes(s)) listedOk++; fish.dispose();
}
console.log(`gar seeds checked: ${seeds.size}  ok: ${ok}  fail: ${fail}  (Muse's 37 listed: ${listedOk}/37 resolve + clean)  max gate attempts: ${maxAtt}`);
const mm = a => `${Math.min(...a).toFixed(3)}–${Math.max(...a).toFixed(3)}`;
console.log(`built-head eye position / head: ${mm(stat.u)}   gill-front gap (÷ head): ${mm(stat.gap)}   mouth corner / head: ${mm(stat.mc)}`);
/* band existence over the whole envelope */
const env = envelope('pike', 'gar'); let empty = 0, tot = 0, outside = 0;
for (const h of [env.r.headLen[0], (env.r.headLen[0] + env.r.headLen[1]) / 2, env.r.headLen[1]]) for (const es of [env.r.eyeSize[0], env.r.eyeSize[1]]) { const b = eyeBand(h, es, 'both'); tot++; if (!(b.hi > b.lo + .1)) empty++; }
for (let i = 0; i < 4000; i++) { const t = G.sampleTraits(G.makeRng('band' + i), 'pike', 'gar'), b = eyeBand(t.headLen, t.eyeSize, t.eyeSide); if (t.eyeU > b.seat + 1e-12 || t.eyeU < b.lo - 1e-12) outside++; }
console.log(`feasible band: ${tot - empty}/${tot} envelope corners have a band wider than .1 of the head;  4000 sampled gar traits outside the band: ${outside}`);
/* mutants / offspring */
let mutOk = 0, mutFall = 0, kidOk = 0, kidFall = 0; const roots = [...seeds].slice(0, 40);
for (let i = 0; i < roots.length; i++) { const a = P.fromSeed(roots[i]), b = P.fromSeed(roots[(i + 7) % roots.length]); const m = P.mutateFish(a); (m.hash === a.hash ? mutFall++ : mutOk++); const c = P.breedFish(a, b); (c.hash === a.hash ? kidFall++ : kidOk++); }
console.log(`mutants (mesh-audited gate): ${mutOk} new / ${mutFall} fell back to parent;  offspring: ${kidOk} new / ${kidFall} fell back`);
for (const b of bad.slice(0, 10)) console.log('  ' + b);
const pass = !fail && !empty && !outside && listedOk === 37; console.log(pass ? 'GAR EYE BAND PASS' : 'GAR EYE BAND FAIL'); process.exit(pass ? 0 : 1);
