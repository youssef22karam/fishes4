// Close-up render check for round 2: node tools/shots2.mjs <outDir> <seed,seed,..> <views> [jaw=1] [bg=#ff00ff]
//   views: side (mouth side), front (head-on), q34 (3/4 front), eyeS / eyeF (eye macro side/front), fin (pectoral close-up at rest), top
//   env JAW (0..1), BG (css colour) , W/H (viewport), EYE=1 uses far-field zoom crops.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(process.env.PW_PATH ? process.env.PW_PATH + '/' : import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/tmp/pw/node_modules/playwright')); }
const out = resolve(process.argv[2] || 'shots'), seeds = (process.argv[3] || 'QD').split(','), views = (process.argv[4] || 'side,front').split(',');
const jaw = process.argv[5] != null ? +process.argv[5] : 1, bg = process.argv[6] || process.env.BG || '';
mkdirSync(out, { recursive: true });
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const pg = await br.newPage({ viewport: { width: +process.env.W || 640, height: +process.env.H || 480 } });
pg.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0, 300)));
await pg.goto('file://' + resolve('dist/index.html')); await pg.waitForFunction(() => window.FG && window.FG.proc && window.FG.shoot, null, { timeout: 30000 });
await pg.waitForTimeout(1500); await pg.evaluate(() => { const c = window.FG.shoot.controls; c.minDistance = 0; c.maxDistance = 1e9; });
await pg.addStyleTag({ content: '.bar,#hud,#sheet,#toast,header{display:none!important}' });
const res = [];
for (const seed of seeds) {
  await pg.evaluate(seed => { const F = window.FG; F.proc.closeSheet && F.proc.closeSheet(); F.proc.showSeed(seed); window.__fgRest = true; }, seed);
  await pg.waitForTimeout(500);
  const c = await pg.evaluate(([jw, bg]) => {
    const F = window.FG, f = F.shoot.App.fish, g = F.shoot.App.genome, lm = {}; for (const l of f.info.landmarks3D) lm[l.name] = l;
    window.__fgJaw = jw; if (bg) F.shoot.bg(bg);
    const ax = F.axesOf(g), m = F.LAW.mouthLaw(ax), e = F.LAW.eyeLaw(ax);
    return { L: f.bm.L, hl: f.bm.L * g.head.lengthFrac, lm, b: { min: f.info.bounds.min, max: f.info.bounds.max }, open: m.openDeg, cons: m.construction, plan: ax.plan, swim: ax.swim, eye: e.regime, name: g.meta.name };
  }, [jaw, bg]);
  const { hl, lm, b } = c, snout = lm.snout || { x: b.max.x, y: 0, z: 0 }, mc = lm.mouthCorner || snout, eyeL = lm.eye || lm.eyeR || lm.eyeL || mc;
  const mid = { x: (snout.x + mc.x) / 2, y: (snout.y + mc.y) / 2, z: 0 }, k = +process.env.ZOOM || 1;
  const shot = async (name, pos, tgt, fn, arg) => { await pg.evaluate(([p, t]) => window.FG.shoot.look(p, t), [pos, tgt]); if (fn) await pg.evaluate(fn, arg); await pg.waitForTimeout(250); await pg.screenshot({ path: `${out}/${seed}_${name}.png` }); };
  const d = hl * 1.5 / k;
  for (const v of views) {
    if (v === 'side') await shot('side', [mid.x, mid.y, d], [mid.x, mid.y, 0]);
    if (v === 'front') await shot('front', [snout.x + d * 1.25, mid.y, 0.0005], [snout.x, mid.y, 0]);
    if (v === 'q34') await shot('q34', [mid.x + d * .75, mid.y + d * .1, d * .9], [mid.x, mid.y, 0]);
    if (v === 'top') await shot('top', [mid.x, mid.y + d * 1.2, 0.001], [mid.x, mid.y, 0]);
    if (v === 'below') await shot('below', [mid.x, mid.y - d * 1.2, 0.001], [mid.x, mid.y, 0]);
    if (v === 'eyeS') await shot('eyeS', [eyeL.x, eyeL.y, hl * .55], [eyeL.x, eyeL.y, 0]);
    if (v === 'eyeF') await shot('eyeF', [eyeL.x + hl * .75, eyeL.y, hl * .12], [eyeL.x, eyeL.y, hl * .02]);
    if (v === 'fin') { const pb = lm.pectoralBase || { x: mid.x, y: mid.y, z: 0 }; await shot('fin', [pb.x - c.L * .05, pb.y - c.L * .04, c.L * .42], [pb.x - c.L * .05, pb.y - c.L * .04, pb.z], () => { window.FG.shoot.fin('rest'); }); }
  }
  res.push({ seed, name: c.name, cons: c.cons, open: c.open, swim: c.swim, eye: c.eye });
}
console.log(JSON.stringify(res));
await br.close();
