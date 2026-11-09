// Round 4.1: count NaN / zero-length vertex normals and NaN positions in the interior (walls) geometry. node tools/r41nan.mjs <seed...>
import { createRequire } from 'node:module'; import { resolve } from 'node:path';
const require = createRequire(import.meta.url); const { chromium } = require('/tmp/pw/node_modules/playwright');
const seeds = process.argv.slice(2).length ? process.argv.slice(2) : ['Q1CW5'];
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const pg = await br.newPage({ viewport: { width: 640, height: 480 } });
await pg.goto('file://' + resolve('dist/index.html')); await pg.waitForFunction(() => window.FG && window.FG.proc && window.FG.shoot, null, { timeout: 30000 }); await pg.waitForTimeout(1500);
for (const s of seeds) { await pg.evaluate(s => { window.FG.proc.showSeed(s); }, s); await pg.waitForTimeout(300);
  console.log(s, JSON.stringify(await pg.evaluate(() => { const f = window.FG.shoot.App.fish, out = []; f.group.children.forEach((m, i) => { if (!m.userData.groups) return; const G = m.geometry, P = G.attributes.position.array, N = G.attributes.normal.array, A = G.attributes.aBody.array; let nanN = 0, zeroN = 0, nanP = 0, nanA = 0; for (let k = 0; k < P.length; k += 3) { if (!isFinite(P[k] + P[k + 1] + P[k + 2])) nanP++; if (!isFinite(N[k] + N[k + 1] + N[k + 2])) nanN++; else if (Math.hypot(N[k], N[k + 1], N[k + 2]) < 1e-6) zeroN++; } for (let k = 0; k < A.length; k++) if (!isFinite(A[k])) nanA++; const ix = G.index.array, ref = new Set(); const perG = m.userData.groups.map(g => { let z = 0, tot = 0; const seen = new Set(); for (let t = g.a * 3; t < g.b * 3; t++) { const v = ix[t]; if (seen.has(v)) continue; seen.add(v); tot++; const k = v * 3; if (Math.hypot(N[k], N[k + 1], N[k + 2]) < 1e-6) z++; } return g.name + ' refVerts ' + tot + ' zeroNormal ' + z; }); out.push({ perG, i, verts: P.length / 3, nanN, zeroN, nanP, nanA, groups: m.userData.groups.map(g => g.name + ':' + (g.b - g.a)) }); }); return out; })));
}
await br.close();
