// Round 5A shots.  node tools/r5shot.mjs <outdir> <seed> <view>[,<view>...] [jaw=0..1]
//  views: side | gill (close side of operculum) | under (underside-front 3/4) | head (side, whole head) | front | chin (below, looking up at chin/barbels)
import { createRequire } from 'node:module'; import { mkdirSync } from 'node:fs'; import { resolve } from 'node:path';
const require = createRequire(import.meta.url); let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/tmp/pw/node_modules/playwright')); }
const out = resolve(process.argv[2]); mkdirSync(out, { recursive: true }); const seed = process.argv[3], views = (process.argv[4] || 'side').split(','), jaw = +(process.argv[5] || 0);
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const pg = await br.newPage({ viewport: { width: +(process.env.W || 900), height: +(process.env.H || 560) } }); pg.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0, 200)));
await pg.goto('file://' + resolve(process.env.DIST || 'dist/index.html')); await pg.waitForFunction(() => window.FG && window.FG.proc && window.FG.shoot, null, { timeout: 30000 }); await pg.waitForTimeout(1200);
await pg.evaluate(() => { const c = window.FG.shoot.controls; c.minDistance = 0; c.maxDistance = 1e9; }); await pg.addStyleTag({ content: '.bar,#hud,#sheet,#toast,header{display:none!important}' });
await pg.evaluate(([s, j]) => { const F = window.FG; F.proc.closeSheet && F.proc.closeSheet(); F.proc.showSeed(s); window.__fgRest = true; window.__fgJaw = j; F.shoot.bg('#e8edf2'); }, [seed, jaw]); await pg.waitForTimeout(700);
const c = await pg.evaluate(() => { const F = window.FG, f = F.shoot.App.fish, g = F.shoot.App.genome, lm = {}; for (const l of f.info.landmarks3D) lm[l.name] = l; const ax = F.axesOf(g); return { L: f.bm.L, hl: f.bm.L * g.head.lengthFrac, lm, b: f.info.bounds, niche: g.meta.niche, fam: ax.plan.family, mouth: g.mouth.type, barb: g.head.barbels, slits: g.head.gillSlits }; });
const look = async (pos, tgt, name) => { await pg.evaluate(([p, t]) => window.FG.shoot.look(p, t), [pos, tgt]); await pg.waitForTimeout(350); await pg.evaluate(([p, t]) => window.FG.shoot.look(p, t), [pos, tgt]); await pg.waitForTimeout(250); await pg.screenshot({ path: `${out}/${name}.png` }); };
const { lm, hl, b } = c, sn = lm.snout, op = lm.operculum || sn, mc = lm.mouthCorner || sn, e = lm.eye || sn, K = +(process.env.K || 1);
for (const v of views) {
  const nm = `${v}_${seed}${process.env.SUF || ''}`;
  if (v === 'side') { const cx = (b.min.x + b.max.x) / 2, cy = (b.min.y + b.max.y) / 2, ext = Math.max(b.max.x - b.min.x, (b.max.y - b.min.y) * 1.6); await look([cx, cy, ext * 1.25], [cx, cy, 0], nm); }
  else if (v === 'gill') { const x = (op.x + e.x) / 2, y = e.y - hl * .12; await look([x, y, hl * 1.15 * K], [x, y, 0], nm); }
  else if (v === 'edge') { const x = op.x + hl * .07, y = op.y + hl * (+process.env.EY || 0); await look([x, y, hl * .55 * K], [x, y, 0], nm); }
  else if (v === 'head') { const x = sn.x - hl * .5, y = (sn.y + op.y) / 2; await look([x, y, hl * 2.1 * K], [x, y, 0], nm); }
  else if (v === 'under') { const x = sn.x - hl * .25, y = sn.y - hl * .12; await look([sn.x + hl * 1.25 * K, y - hl * 1.15 * K, hl * 1.05 * K], [x, y, 0], nm); }
  else if (v === 'underside') { const x = sn.x - hl * .45, y = sn.y - hl * .1; await look([x + hl * .15, y - hl * 2.0 * K, hl * .35], [x, y, 0], nm); }
  else if (v === 'front') { await look([sn.x + hl * 2.0 * K, (sn.y + mc.y) / 2, .0005], [sn.x, (sn.y + mc.y) / 2, 0], nm); }
  else if (v === 'chin') { const x = (sn.x + mc.x) / 2, y = (sn.y + mc.y) / 2; await look([x + hl * .5 * K, y - hl * 1.0 * K, hl * 1.2 * K], [x - hl * .1, y - hl * .1, 0], nm); }
}
console.log(JSON.stringify({ seed, niche: c.niche, fam: c.fam, mouth: c.mouth, barb: c.barb, slits: c.slits, hl: +c.hl.toFixed(3) })); await br.close();
