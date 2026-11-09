// Round-3 seed picker (axes only): node tools/r3pick.mjs  → docs/shots/after3/picks.json
import './headless.mjs';
import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path'; import { mkdirSync, writeFileSync } from 'node:fs';
const root = resolve(new URL('..', import.meta.url).pathname), eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { FG } = await import(eng('fishgen.js')); const { initProcGen, fromSeed } = await import(eng('procgen.js')); initProcGen(FG);
const cells = {}, hetero = []; 
for (let i = 0; i < 2600; i++) {
  const seed = 'S3' + (i * 7919 + 5).toString(36).toUpperCase(); let f; try { f = fromSeed(seed); } catch { continue; }
  const g = f.genome, ax = FG.axesOf(g); if (!g.fins.caudal.present) continue;
  const fish = FG.buildFish(JSON.parse(JSON.stringify(g)), { quality: 'med' }), t = fish.info.tail; if (!t) continue;
  const key = ax.plan.family + '|' + ax.swim; (cells[key] ||= []).push({ seed, type: t.type, fam: t.family });
  if (t.family === 'heterocercal') hetero.push({ seed, r: t.lobeRatio });
}
hetero.sort((a, b) => a.r - b.r); const hp = hetero.length ? [hetero[0], hetero[hetero.length >> 1], hetero[hetero.length - 1]] : [];
const keys = Object.keys(cells).sort(), side = [], grid = [];
for (const k of keys) { const seen = new Set(); for (const c of cells[k]) { if (!seen.has(c.type) && seen.size < 3) { seen.add(c.type); grid.push({ ...c, cell: k }); } } if (cells[k][0]) side.push({ ...cells[k][0], cell: k }); }
for (let r = 1; grid.length < 44 && r < 40; r++) for (const k of keys) { const c = cells[k][r * 7 % cells[k].length]; if (c && !grid.some(x => x.seed === c.seed) && grid.length < 44) grid.push({ ...c, cell: k }); }
mkdirSync('docs/shots/after3', { recursive: true });
writeFileSync('docs/shots/after3/picks.json', JSON.stringify({ side: side.slice(0, 16), hetero: hp, grid: grid.slice(0, 44), cells: keys.length }, null, 1));
console.log('cells', keys.length, 'side', side.length, 'grid', grid.length, 'hetero', hp.map(h => h.seed + ':' + h.r.toFixed(2)).join(' '));
