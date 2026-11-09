// Round 5B batch shots (one browser).  node tools/r5b.mjs <outdir> <view> <seed,seed,...> [jaw]
//  views: head (whole head, side) | eye (macro on eye axis, K env) | gape-side | gape-front | side (whole fish) | probe (JSON dump of head landmarks)
import { createRequire } from 'node:module'; import { mkdirSync } from 'node:fs'; import { resolve } from 'node:path';
const require = createRequire(import.meta.url); let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/tmp/pw/node_modules/playwright')); }
const out = resolve(process.argv[2]); mkdirSync(out, { recursive: true }); const view = process.argv[3], seeds = process.argv[4].split(','), jaw = process.argv[5] == null ? 0 : +process.argv[5];
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const pg = await br.newPage({ viewport: { width: +(process.env.W || 640), height: +(process.env.H || 480) } }); pg.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0, 200)));
await pg.goto('file://' + resolve(process.env.DIST || 'dist/index.html')); await pg.waitForFunction(() => window.FG && window.FG.proc && window.FG.shoot, null, { timeout: 30000 }); await pg.waitForTimeout(1200);
await pg.evaluate(() => { const c = window.FG.shoot.controls; c.minDistance = 0; c.maxDistance = 1e9; }); await pg.addStyleTag({ content: '.bar,#hud,#sheet,#toast,header{display:none!important}' });
for (const seed of seeds) {
  await pg.evaluate(([s, j]) => { const F = window.FG; F.proc.closeSheet && F.proc.closeSheet(); F.proc.showSeed(s); window.__fgRest = !(j > 0); window.__fgJaw = j; F.shoot.bg('#e8edf2'); }, [seed, jaw]); await pg.waitForTimeout(600);
  const c = await pg.evaluate(() => { const F = window.FG, f = F.shoot.App.fish, g = F.shoot.App.genome, lm = {}; for (const l of f.info.landmarks3D) lm[l.name] = l; const e = f.bm.eyes[0]; return { hl: f.bm.L * g.head.lengthFrac, lm, b: f.info.bounds, eye: e && { c: [e.center.x, e.center.y, e.center.z], a: [e.axis.x, e.axis.y, e.axis.z], R: e.R }, niche: g.meta.niche, fam: F.axesOf(g).plan.family, mouth: g.mouth.type }; });
  const look = async (pos, tgt, name) => { await pg.evaluate(([p, t]) => window.FG.shoot.look(p, t), [pos, tgt]); await pg.waitForTimeout(350); await pg.evaluate(([p, t]) => window.FG.shoot.look(p, t), [pos, tgt]); await pg.waitForTimeout(300); await pg.screenshot({ path: `${out}/${name}.png` }); };
  const { lm, hl, b, eye: e } = c, sn = lm.snout, op = lm.operculum || sn, mc = lm.mouthCorner || sn, K = +(process.env.K || 1), nm = `${view}_${seed}${process.env.SUF || ''}`;
  if (view === 'head') { const sg = e ? Math.sign(e.c[2] || 1) : 1, x = sn.x - hl * .5, y = (sn.y + op.y) / 2; await look([x, y, sg * hl * 2.1 * K], [x, y, 0], nm); }
  else if (view === 'eye') { const d = e.R * (+process.env.K || 9); await look([e.c[0] + e.a[0] * d, e.c[1] + e.a[1] * d, e.c[2] + e.a[2] * d], e.c, nm); }
  else if (view === 'side') { const cx = (b.min.x + b.max.x) / 2, cy = (b.min.y + b.max.y) / 2, ext = Math.max(b.max.x - b.min.x, (b.max.y - b.min.y) * 1.6); await look([cx, cy, ext * 1.25 * K], [cx, cy, 0], nm); }
  else if (view === 'gape-side') { const x = sn.x - hl * .45, y = (sn.y + mc.y) / 2 - hl * .05; await look([x, y, hl * 1.7 * K], [x, y, 0], nm); }
  else if (view === 'gape-front') { const y = (sn.y + mc.y) / 2; await look([sn.x + hl * 1.9 * K, y, hl * .02], [sn.x, y, 0], nm); }
  else if (view === 'gape-3q') { const x = sn.x - hl * .3, y = (sn.y + mc.y) / 2; await look([x + hl * 1.1 * K, y - hl * .15, hl * 1.1 * K], [x, y, 0], nm); }
  console.log(JSON.stringify({ seed, niche: c.niche, fam: c.fam, mouth: c.mouth, hl: +hl.toFixed(3) }));
}
await br.close();
