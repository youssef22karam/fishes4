// Round-4 front/side/eye shot helper.  node tools/r4front.mjs <outdir> [seed ...]   (needs dist/index.html + playwright)
import { createRequire } from 'node:module'; import { mkdirSync } from 'node:fs'; import { resolve } from 'node:path';
const require = createRequire(import.meta.url); let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/tmp/pw/node_modules/playwright')); }
const out = resolve(process.argv[2] || 'docs/shots/after4'); mkdirSync(out, { recursive: true }); const seeds = process.argv.slice(3).length ? process.argv.slice(3) : ['Q1CW5', 'QZTAI'];
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const pg = await br.newPage({ viewport: { width: 640, height: 480 } }); pg.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0, 200)));
await pg.goto('file://' + resolve('dist/index.html')); await pg.waitForFunction(() => window.FG && window.FG.proc && window.FG.shoot, null, { timeout: 30000 }); await pg.waitForTimeout(1500);
await pg.evaluate(() => { const c = window.FG.shoot.controls; c.minDistance = 0; c.maxDistance = 1e9; }); await pg.addStyleTag({ content: '.bar,#hud,#sheet,#toast,header{display:none!important}' });
for (const seed of seeds) {
  await pg.evaluate(s => { const F = window.FG; F.proc.closeSheet && F.proc.closeSheet(); F.proc.showSeed(s); window.__fgRest = true; window.__fgJaw = 1; }, seed); await pg.waitForTimeout(400);
  const c = await pg.evaluate(() => { const F = window.FG, f = F.shoot.App.fish, g = F.shoot.App.genome, lm = {}; for (const l of f.info.landmarks3D) lm[l.name] = l; F.shoot.bg('#e8edf2'); return { hl: f.bm.L * g.head.lengthFrac, lm, b: f.info.bounds }; });
  const sn = c.lm.snout || { x: c.b.max.x, y: 0, z: 0 }, mc = c.lm.mouthCorner || sn, mid = { x: (sn.x + mc.x) / 2, y: (sn.y + mc.y) / 2 };
  await pg.evaluate(([p, t]) => window.FG.shoot.look(p, t), [[sn.x + c.hl * 1.9, mid.y, .0005], [sn.x, mid.y, 0]]); await pg.waitForTimeout(250); await pg.screenshot({ path: `${out}/front_${seed}_jaw1.png` });
  await pg.evaluate(([p, t]) => window.FG.shoot.look(p, t), [[mid.x, mid.y, c.hl * 2.2], [mid.x, mid.y, 0]]); await pg.waitForTimeout(250); await pg.screenshot({ path: `${out}/side_open_${seed}.png` });
}
await br.close(); console.log('ok');
