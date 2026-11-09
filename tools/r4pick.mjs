// Round-4 seed picker (axes only): prints one seed per plan family + deep-band + rigid + spotted.  node tools/r4pick.mjs
import './headless.mjs';
import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname), eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { FG } = await import(eng('fishgen.js')); const { initProcGen, fromSeed } = await import(eng('procgen.js')); initProcGen(FG);
const P = { side: [], fam: {} };
for (let i = 0; i < 1500; i++) { const seed = 'Q' + (i * 7919 + 13).toString(36).toUpperCase(); let f; try { f = fromSeed(seed); } catch { continue; } const g = f.genome, ax = FG.axesOf(g), fam = ax.plan.family, s = g.skin;
  if (ax.plan.flat >= 1 || g.head.eyeSide === 'none') continue;
  if (!P.fam[fam]) { P.fam[fam] = seed; }
  if (!P.deep && ax.dark && s.photophores > 0 && g.mouth.gape > .3) P.deep = seed;
  if (!P.rigid && (s.scale === 'plates' || s.scale === 'scutes' || s.scale === 'ganoid' || ax.plan.solid) && ax.plan.flat < .5) P.rigid = seed;
  if (!P.spot && s.pattern === 'spots' && s.patternStrength > .5 && !ax.dark && ax.plan.flat === 0) P.spot = seed;
  if (!P.stripe && (s.pattern === 'stripes' || s.pattern === 'bars') && !ax.dark && ax.plan.flat === 0) P.stripe = seed; }
console.log(JSON.stringify(P));
