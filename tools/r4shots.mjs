// Round-4 screenshot set → docs/shots/after4/   (needs dist/index.html + playwright)
import { createRequire } from 'node:module'; import { mkdirSync } from 'node:fs'; import { resolve } from 'node:path';
const require = createRequire(import.meta.url); let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/tmp/pw/node_modules/playwright')); }
const out = resolve('docs/shots/after4'); mkdirSync(out, { recursive: true });
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const pg = await br.newPage({ viewport: { width: 800, height: 480 } }); pg.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0, 200)));
await pg.goto('file://' + resolve('dist/index.html')); await pg.waitForFunction(() => window.FG && window.FG.proc && window.FG.shoot, null, { timeout: 30000 }); await pg.waitForTimeout(1500);
await pg.evaluate(() => { const c = window.FG.shoot.controls; c.minDistance = 0; c.maxDistance = 1e9; }); await pg.addStyleTag({ content: '.bar,#hud,#sheet,#toast,header{display:none!important}' });
async function setup(seed, jaw = 0) { await pg.evaluate(([s, j]) => { const F = window.FG; F.proc.closeSheet && F.proc.closeSheet(); F.proc.showSeed(s); window.__fgRest = true; window.__fgJaw = j; }, [seed, jaw]); await pg.waitForTimeout(400);
  return pg.evaluate(() => { const F = window.FG, f = F.shoot.App.fish, g = F.shoot.App.genome, lm = {}; for (const l of f.info.landmarks3D) lm[l.name] = l; F.shoot.bg('#e8edf2'); return { L: f.bm.L, hl: f.bm.L * g.head.lengthFrac, lm, b: f.info.bounds }; }); }
const look = async (pos, tgt, path) => { await pg.evaluate(([p, t]) => window.FG.shoot.look(p, t), [pos, tgt]); await pg.waitForTimeout(250); return pg.screenshot({ path }); };
const side = async (c, path) => { const { b } = c, cx = (b.min.x + b.max.x) / 2, cy = (b.min.y + b.max.y) / 2, ext = Math.max(b.max.x - b.min.x, (b.max.y - b.min.y) * 1.6); return look([cx, cy, ext * 1.25], [cx, cy, 0], path); };
const mouthPts = c => { const sn = c.lm.snout || { x: c.b.max.x, y: 0 }, mc = c.lm.mouthCorner || sn; return { sn, mc, mid: { x: (sn.x + mc.x) / 2, y: (sn.y + mc.y) / 2 } }; };
for (const s of ['Q1CW5', 'QZTAI']) { const c = await setup(s, 1), { sn, mid } = mouthPts(c); await look([sn.x + c.hl * 1.9, mid.y, .0005], [sn.x, mid.y, 0], `${out}/front_${s}_jaw1.png`); }
for (const [tag, s] of Object.entries({ shark: 'Q1CW5', compressed: 'QICA', pelagic: 'QOG9', spiny: 'Q10O7', rayfin: 'Q16S6', catfish: 'Q3E7T', longjaw: 'Q3WJQ', labrid: 'QIO5B', spotted: 'Q2DJZ', rigid: 'QUK8', deep: 'QDX23' })) { const c = await setup(s); await side(c, `${out}/side_${tag}_${s}.png`); }
{ const c = await setup('QUK8'), { sn } = mouthPts(c); await look([sn.x - c.hl * .35, sn.y + c.hl * .15, c.hl * 1.5], [sn.x - c.hl * .35, sn.y, 0], `${out}/rigid_head_QUK8.png`); }
{ const c = await setup('QDX23', 1), { mid } = mouthPts(c); await look([mid.x, mid.y, c.hl * 2.2], [mid.x, mid.y, 0], `${out}/deep_mouth_open_QDX23.png`); }
for (const s of ['Q2DJZ', 'QICA']) { const c = await setup(s, 0), e = c.lm.eye; await look([e.x, e.y, c.hl * .75], [e.x, e.y, 0], `${out}/eye_macro_${s}.png`); }
for (const s of ['QIBXD', 'Q2DJZ']) { const c = await setup(s, 1), { mid } = mouthPts(c); await look([mid.x, mid.y, c.hl * 2.2], [mid.x, mid.y, 0], `${out}/mouth_open_side_${s}.png`); }
await br.close(); console.log('shots done');
