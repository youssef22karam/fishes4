// Blind-ish selector for the close-up screenshot sets: scans seeds, reads ONLY the generator's axes, buckets them.
// node tools/pickseeds.mjs [N]  → prints JSON {bucket: [seed,...]}
import './headless.mjs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname);
const { FG } = await import(pathToFileURL(resolve(root, 'src/engine/fishgen.js')).href);
const { fromSeed } = await import(pathToFileURL(resolve(root, 'src/engine/procgen.js')).href);
const procui = await import(pathToFileURL(resolve(root, 'src/engine/procgen.js')).href);
const N = +process.argv[2] || 3000, per = +process.argv[3] || 3;
const B = {};
const add = (k, s) => { (B[k] ||= []).length < per && B[k].push(s); };
for (let i = 0; i < N; i++) {
  const seed = 'Q' + (i * 7919 + 13).toString(36).toUpperCase();
  let f; try { f = fromSeed(seed); } catch (e) { continue; }
  const g = f.genome, ax = FG.axesOf(g), m = FG.LAW.mouthLaw(ax), e = FG.LAW.eyeLaw(ax), t = FG.LAW.tailLaw ? FG.LAW.tailLaw(ax, g) : null;
  if (ax.plan.flat < 1) {
    add('mouth:' + m.construction + (m.construction === 'jawed' ? (ax.flags.has('ambusher') ? ':ambush' : m.picking ? ':picking' : ':other') : ''), seed);
    add('mouth:orient:' + m.orientation, seed);
  }
  add('eye:' + e.regime + (e.placement !== 'lateral' ? ':' + e.placement : '') + ':' + e.pupil, seed);
  if (ax.plan.flat === 0 && !ax.plan.cartilaginous) add('swim:' + ax.swim, seed);
  if (ax.plan.cartilaginous && ax.plan.flat < 1) add('hetero', seed);
  add('flat:' + ax.plan.flat, seed);
  if (ax.plan.flat === 0) add('fin:' + ax.swim, seed);
}
console.log(JSON.stringify(B, null, 1));
