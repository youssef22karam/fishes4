// Round 4.2 probe: compare eye-patch aBody (u, ang) with nearest body-skin vertices.  node tools/r42probe.mjs <seed>
import { createRequire } from 'node:module'; import { resolve } from 'node:path';
const require = createRequire(import.meta.url); const { chromium } = require('/tmp/pw/node_modules/playwright');
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const pg = await br.newPage({ viewport: { width: 640, height: 480 } }); pg.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0, 200)));
await pg.goto('file://' + resolve('dist/index.html')); await pg.waitForFunction(() => window.FG && window.FG.proc && window.FG.shoot, null, { timeout: 30000 }); await pg.waitForTimeout(1000);
const r = await pg.evaluate(s => { const F = window.FG; F.proc.closeSheet && F.proc.closeSheet(); F.proc.showSeed(s); const f = F.shoot.App.fish; const out = [];
  let patch = null, body = []; f.group.traverse(m => { if (!m.isMesh) return; if (m.userData.eyeSkin) patch = m; else if (m.geometry.getAttribute('aBody') && m.geometry.getAttribute('position').count > 3000) body.push(m); });
  const P = patch.geometry.getAttribute('position'), A = patch.geometry.getAttribute('aBody'); out.push('patch verts ' + P.count + ' bodyMeshes ' + body.length + ' ' + body.map(b => b.geometry.getAttribute('position').count));
  for (let i = 0; i < P.count; i += Math.floor(P.count / 12)) { let best = 1e9, bj = null, bm = null; for (const b of body) { const BP = b.geometry.getAttribute('position'); for (let j = 0; j < BP.count; j++) { const d = (BP.getX(j) - P.getX(i)) ** 2 + (BP.getY(j) - P.getY(i)) ** 2 + (BP.getZ(j) - P.getZ(i)) ** 2; if (d < best) { best = d; bj = j; bm = b; } } }
    const BA = bm.geometry.getAttribute('aBody'); out.push([i, 'patch u,ang', A.getX(i).toFixed(4), A.getY(i).toFixed(4), 'tag', A.getZ(i), 'nearest u,ang', BA.getX(bj).toFixed(4), BA.getY(bj).toFixed(4), 'dist', Math.sqrt(best).toFixed(4)].join(' ')); }
  return out; }, process.argv[2] || 'QUK8_'); console.log(r.join('\n')); await br.close();
