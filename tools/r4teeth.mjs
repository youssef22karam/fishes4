import './headless.mjs';
import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname), eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { FG } = await import(eng('fishgen.js')); const { initProcGen, fromSeed } = await import(eng('procgen.js')); initProcGen(FG);
const f = fromSeed(process.argv[2] || 'Q1CW5'), fish = FG.buildFish(JSON.parse(JSON.stringify(f.genome)), { quality: 'med' });
const t = fish.parts.teeth; console.log('instances', t.count, 'geo verts', t.geometry.getAttribute('position').count, Object.keys(t.geometry.attributes), Object.keys(t.userData));
const info = t.userData.teethInfo; const hl = t.userData.hl; console.log('hl', hl);
info.forEach((k, i) => { if (Math.abs(k.root.z) < .08 * hl) console.log(i, 'root', k.root.toArray().map(v => v.toFixed(4)), 'tip?', k.tip && k.tip.toArray().map(v => v.toFixed(4)), 'len', k.len.toFixed(4), 'rad', k.rad.toFixed(4), Object.keys(k).join(',')); });
console.log('total teeth', info.length);
