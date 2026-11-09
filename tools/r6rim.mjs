// Eye-rim over-cap census (rimH / eye diameter > SKIN_RIM_MAX = .06) over the validation seeds.  node tools/r6rim.mjs [fish=1000]
import './headless.mjs';
import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname), eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { FG } = await import(eng('fishgen.js')); const { initProcGen, fromSeed } = await import(eng('procgen.js')); const { hashHex } = await import(eng('genome.js')); initProcGen(FG);
const N = +process.argv[2] || 1000; let eyes = 0, over = 0, disc = 0, discOver = 0;
for (let i = 0; i < N; i++) { const seed = hashHex('uniq' + i * 10).slice(0, 8).toUpperCase().replace(/[ILOU]/g, c => ({ I: '1', L: '1', O: '0', U: 'V' }[c])); let f; try { f = fromSeed(seed); } catch { continue; }
  const fish = FG.buildFish(JSON.parse(JSON.stringify(f.genome)), { quality: 'med' }), inf = fish.bm.eyes || []; const isD = !!fish.bm.disc;
  for (const e of inf) { if (typeof e.rimH !== 'number') continue; eyes++; if (isD) disc++; if (e.rimH > .06 + 1e-9) { over++; if (isD) discOver++; } } }
console.log(`eye rim over-cap ${over}/${eyes} (disc plan: ${discOver}/${disc})`);
