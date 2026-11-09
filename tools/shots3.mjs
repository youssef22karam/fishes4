// Round-3 full-body / tail shots:  node tools/shots3.mjs <outDir> <seed,seed,..> <views> [bg]
//   views: side (whole fish, rest, on-axis), tail (tail close-up, side), tailTop (tail from above)
//   env: W/H viewport, TAIL=<0..1> beat phase (default rest), BG css colour
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(process.env.PW_PATH ? process.env.PW_PATH + '/' : import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/tmp/pw/node_modules/playwright')); }
const out = resolve(process.argv[2] || 'shots'), seeds = (process.argv[3] || 'QD').split(','), views = (process.argv[4] || 'side,tail').split(',');
const bg = process.argv[5] || process.env.BG || '#e8edf2';
mkdirSync(out, { recursive: true });
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const pg = await br.newPage({ viewport: { width: +process.env.W || 800, height: +process.env.H || 480 } });
pg.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0, 300)));
await pg.goto('file://' + resolve('dist/index.html')); await pg.waitForFunction(() => window.FG && window.FG.proc && window.FG.shoot, null, { timeout: 30000 });
await pg.waitForTimeout(1500); await pg.evaluate(() => { const c = window.FG.shoot.controls; c.minDistance = 0; c.maxDistance = 1e9; });
await pg.addStyleTag({ content: '.bar,#hud,#sheet,#toast,header{display:none!important}' });
const res = [];
for (const seed of seeds) {
  await pg.evaluate(seed => { const F = window.FG; F.proc.closeSheet && F.proc.closeSheet(); F.proc.showSeed(seed); window.__fgRest = true; window.__fgJaw = 0; }, seed);
  await pg.waitForTimeout(450);
  const c = await pg.evaluate(bg => {
    const F = window.FG, f = F.shoot.App.fish, g = F.shoot.App.genome, lm = {}; for (const l of f.info.landmarks3D) lm[l.name] = l; F.shoot.bg(bg);
    const ax = F.axesOf(g), T = F.LAW.tailLaw(ax);
    return { L: f.bm.L, lm, b: f.info.bounds, plan: ax.plan.family, swim: ax.swim, fam: T.family, ctype: g.fins.caudal.type, tail: f.info.tail || null, name: g.meta.name };
  }, bg);
  const { b, lm } = c, cx = (b.min.x + b.max.x) / 2, cy = (b.min.y + b.max.y) / 2, ext = Math.max(b.max.x - b.min.x, (b.max.y - b.min.y) * 1.6);
  const shot = async (name, pos, tgt) => { await pg.evaluate(([p, t]) => window.FG.shoot.look(p, t), [pos, tgt]); await pg.waitForTimeout(250); await pg.screenshot({ path: `${out}/${seed}_${name}.png` }); };
  const cb = lm.caudalBase || { x: b.min.x, y: cy, z: 0 }, tl = b.min.x, tw = Math.max(c.L * .3, (cb.x - tl) * 1.15);
  for (const v of views) {
    if (v === 'side') await shot('side', [cx, cy, ext * 1.25], [cx, cy, 0]);
    if (v === 'tail') await shot('tail', [cb.x - tw * .15, cb.y, tw * 2.3], [cb.x - tw * .15, cb.y, 0]);
    if (v === 'tailTop') await shot('tailTop', [cb.x - tw * .15, cb.y + tw * 2.3, .001], [cb.x - tw * .15, cb.y, 0]);
  }
  res.push({ seed, name: c.name, plan: c.plan, swim: c.swim, fam: c.fam, ctype: c.ctype });
}
console.log(JSON.stringify(res));
await br.close();
