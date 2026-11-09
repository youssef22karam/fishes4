import './headless.mjs';
import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname), eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { FG } = await import(eng('fishgen.js')); const { initProcGen, fromSeed } = await import(eng('procgen.js')); initProcGen(FG);
const MOUTH = await import(eng('mouthgeo.js')); const f = fromSeed(process.argv[2] || 'Q1CW5'), fish = FG.buildFish(JSON.parse(JSON.stringify(f.genome)), { quality: 'med' });
const bm = fish.bm, m = fish.group.children.find(c => c.userData.layer === 'walls'), geo = m.geometry, P = geo.getAttribute('position'), W = geo.getAttribute('aBody'), I = geo.index;
const piv = fish.parts.jaw && { x: fish.parts.jaw.material.uniforms.uJawPivot.value.x, y: fish.parts.jaw.material.uniforms.uJawPivot.value.y }; const ang = fish.parts.jaw.material.uniforms.uJawOpenMax.value;
console.log('pivot', piv, 'open', ang);
const Mr = 4 * 35, K = 34; const pz = i => { const w = W.getW(i), a = -ang * w, c = Math.cos(a), s = Math.sin(a), dx = P.getX(i) - piv.x, dy = P.getY(i) - piv.y; return [piv.x + c * dx - s * dy, piv.y + s * dx + c * dy, P.getZ(i)]; };
// Mr columns: [0..K]=R up (hinge→front), [K+1..2K+1]=Lf up, [2K+2..3K+2]=Lf low (hinge→front), [3K+3..4K+3]=R low
const col = j => j <= K ? 'Rup' + (K - j) : j <= 2 * K + 1 ? 'Lup' + (j - K - 1) : j <= 3 * K + 2 ? 'Llow' + (3 * K + 2 - j) : 'Rlow' + (j - 3 * K - 3);
for (const i of [0, 1, 2, 3, 4]) { const row = []; for (let j = 0; j < Mr; j++) { const v = pz(i * Mr + j); row.push([j, col(j), v[0].toFixed(3), v[1].toFixed(3), v[2].toFixed(3)]); } 
  const fr = row.filter(r => [K, K + 1, 2 * K + 1, 2 * K + 2, 3 * K + 2, 3 * K + 3, 0, 4 * K + 3].includes(r[0])); console.log('ring', i); fr.forEach(r => console.log('  ', r.join(' '))); }
// front projection: which triangle is frontmost at sample points on the centre line?
const tris = []; const gr = m.userData.groups;
for (let t = 0; t < I.count / 3; t++) { const a = [0, 1, 2].map(k => pz(I.getX(t * 3 + k))); const g = gr.find(g => t >= g.a && t < g.b); tris.push({ a, g: g.name, t: t - g.a }); }
const inT = (p, a) => { const s = (p0, p1, p2) => (p0[0] - p2[0]) * (p1[1] - p2[1]) - (p1[0] - p2[0]) * (p0[1] - p2[1]); const q = [p[0], p[1]], A = [a[0][2], a[0][1]], B = [a[1][2], a[1][1]], C = [a[2][2], a[2][1]], d1 = s(q, A, B), d2 = s(q, B, C), d3 = s(q, C, A); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
for (const y of [-.11, -.09, -.07, -.05, -.03, -.01]) for (const z of [0, .01, .03, .06]) { let best = null; for (const T of tris) if (inT([z, y], T.a)) { const x = (T.a[0][0] + T.a[1][0] + T.a[2][0]) / 3; if (!best || x > best.x) best = { x, g: T.g, t: T.t, ring: Math.floor(T.t / 2 / Mr), col: Math.floor(T.t / 2) % Mr }; } console.log('y', y, 'z', z, best ? `${best.g} x=${best.x.toFixed(3)} ring ${best.ring} col ${best.col} (${col(best.col)})` : '—'); }
