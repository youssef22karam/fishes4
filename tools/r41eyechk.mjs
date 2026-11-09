// Round 4.1: compare the eye-blend patch's stored skin coordinates (aBody u, ang) with the coordinates its real vertex positions imply on the head skin.  node tools/r41eyechk.mjs <seed>
import { createRequire } from 'node:module'; import { resolve } from 'node:path';
const require = createRequire(import.meta.url); const { chromium } = require('/tmp/pw/node_modules/playwright');
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const pg = await br.newPage({ viewport: { width: 320, height: 240 } });
await pg.goto('file://' + resolve(process.env.DIST || 'dist/index.html')); await pg.waitForFunction(() => window.FG && window.FG.proc && window.FG.shoot, null, { timeout: 30000 }); await pg.waitForTimeout(1500);
for (const s of process.argv.slice(2)) { await pg.evaluate(s => window.FG.proc.showSeed(s), s); await pg.waitForTimeout(400);
  console.log(s, JSON.stringify(await pg.evaluate(() => { const f = window.FG.shoot.App.fish, bm = f.bm; const m = f.group.children.find(m => m.userData.eyeSkin); if (!m) return 'no eyeSkin mesh'; const P = m.geometry.attributes.position, A = m.geometry.attributes.aBody; const body = f.group.children[0].geometry.attributes.aBody;
    let n = P.count, du = 0, da = 0, mu = 0, ma = 0; const rows = [];
    for (let i = 0; i < n; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i); const u = Math.min(.999, Math.max(.003, (bm.headX - x) / bm.L)); const fr = {}; bm.frame(u, fr); const yy = (x - fr.px) * fr.nx + (y - fr.py) * fr.ny; const ang = ((Math.atan2(yy, z) + Math.PI / 2) / (2 * Math.PI) + 1) % 1; let d1 = Math.abs(u - A.getX(i)), d2 = Math.abs(ang - A.getY(i)); d2 = Math.min(d2, 1 - d2); du += d1; da += d2; mu = Math.max(mu, d1); ma = Math.max(ma, d2); if (i % Math.floor(n / 6) === 0) rows.push([+A.getX(i).toFixed(4), +u.toFixed(4), +A.getY(i).toFixed(4), +ang.toFixed(4), A.getZ(i)]); }
    return { n, meanDu: du / n, meanDang: da / n, maxDu: mu, maxDang: ma, rows, uniform: { pat: m.material.uniforms.uPattern && m.material.uniforms.uPattern.value, scale: m.material.uniforms.uPatScale.value }, sameMat: m.material === f.group.children[0].material }; }))); }
await br.close();
