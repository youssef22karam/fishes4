// Round-3 screenshot set → docs/shots/after3/  (needs dist/index.html + playwright; LD_LIBRARY_PATH if system libs are missing)
//   node tools/r3shots.mjs      reads docs/shots/after3/picks.json (tools/r3pick.mjs)
import { createRequire } from 'node:module'; import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'; import { resolve } from 'node:path';
const require = createRequire(import.meta.url); let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/tmp/pw/node_modules/playwright')); }
const out = resolve('docs/shots/after3'); mkdirSync(out, { recursive: true }); const P = JSON.parse(readFileSync(out + '/picks.json', 'utf8'));
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const pg = await br.newPage({ viewport: { width: 800, height: 480 } }); pg.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0, 200)));
await pg.goto('file://' + resolve('dist/index.html')); await pg.waitForFunction(() => window.FG && window.FG.proc && window.FG.shoot, null, { timeout: 30000 }); await pg.waitForTimeout(1500);
await pg.evaluate(() => { const c = window.FG.shoot.controls; c.minDistance = 0; c.maxDistance = 1e9; }); await pg.addStyleTag({ content: '.bar,#hud,#sheet,#toast,header{display:none!important}' });
const BG = '#e8edf2';
async function setup(seed, jaw = 0) { await pg.evaluate(([s, j]) => { const F = window.FG; F.proc.closeSheet && F.proc.closeSheet(); F.proc.showSeed(s); window.__fgRest = true; window.__fgJaw = j; }, [seed, jaw]); await pg.waitForTimeout(350);
  return pg.evaluate(bg => { const F = window.FG, f = F.shoot.App.fish, g = F.shoot.App.genome, lm = {}; for (const l of f.info.landmarks3D) lm[l.name] = l; F.shoot.bg(bg); const ax = F.axesOf(g); return { L: f.bm.L, hl: f.bm.L * g.head.lengthFrac, lm, b: f.info.bounds, plan: ax.plan.family, swim: ax.swim, t: f.info.tail }; }, BG); }
const look = async (pos, tgt, path) => { await pg.evaluate(([p, t]) => window.FG.shoot.look(p, t), [pos, tgt]); await pg.waitForTimeout(220); return pg.screenshot({ path }); };
const sideShot = async (c, path) => { const { b } = c, cx = (b.min.x + b.max.x) / 2, cy = (b.min.y + b.max.y) / 2, ext = Math.max(b.max.x - b.min.x, (b.max.y - b.min.y) * 1.6); return look([cx, cy, ext * 1.25], [cx, cy, 0], path); };
const tailShot = async (c, path) => { const cb = c.lm.caudalBase, tw = Math.max(c.L * .3, (cb.x - c.b.min.x) * 1.15); return look([cb.x - tw * .15, cb.y, tw * 2.3], [cb.x - tw * .15, cb.y, 0], path); };
const meta = [];
for (const s of P.side) { const c = await setup(s.seed); await sideShot(c, `${out}/side_${s.cell.replace('|', '_')}_${s.seed}.png`); meta.push({ seed: s.seed, cell: s.cell, type: c.t && c.t.type, pitch: c.t && +c.t.pitchDeg.toFixed(2), H: c.t && +c.t.heightL.toFixed(3) }); }
for (const [i, h] of P.hetero.entries()) { const c = await setup(h.seed); await tailShot(c, `${out}/hetero_${['min', 'mid', 'max'][i]}_${h.seed}_ratio${h.r.toFixed(2)}.png`); await sideShot(c, `${out}/hetero_${['min', 'mid', 'max'][i]}_${h.seed}_side.png`); }
await pg.setViewportSize({ width: 360, height: 270 }); const tiles = [];
for (const s of P.grid) { const c = await setup(s.seed); const buf = await tailShot(c, `${out}/_tmp.png`); tiles.push({ img: buf.toString('base64'), label: `${s.cell} · ${c.t.type} · h ${c.t.heightL.toFixed(2)}` }); }
const pg2 = await br.newPage({ viewport: { width: 8 * 360, height: Math.ceil(tiles.length / 8) * 290 } });
await pg2.setContent(`<body style="margin:0;background:#fff;font:11px sans-serif;display:grid;grid-template-columns:repeat(8,360px)">${tiles.map(t => `<div style="height:290px"><img width=360 height=270 src="data:image/png;base64,${t.img}"><div style="padding:0 4px">${t.label}</div></div>`).join('')}</body>`); await pg2.waitForTimeout(800);
await pg2.screenshot({ path: out + '/tail_grid_' + tiles.length + '.png' });
/* regression spot-checks (rounds 1–2.1) */
await pg.setViewportSize({ width: 640, height: 480 });
const reg = { mouthOpenSide: ['QIBXD', 'side', 1], frontAperture: ['QZTAI', 'front', 1], frontApertureCart: ['Q1CW5', 'front', 1], eyeMacro: ['QIBXD', 'eye', 0] };
for (const [name, [seed, view, jaw]] of Object.entries(reg)) { const c = await setup(seed, jaw), { hl, lm, b } = c, sn = lm.snout || { x: b.max.x, y: 0, z: 0 }, mc = lm.mouthCorner || sn, e = lm.eye || mc, mid = { x: (sn.x + mc.x) / 2, y: (sn.y + mc.y) / 2 };
  if (view === 'side') await look([mid.x, mid.y, hl * 2.2], [mid.x, mid.y, 0], `${out}/reg_${name}_${seed}.png`);
  if (view === 'front') await look([sn.x + hl * 1.9, mid.y, .0005], [sn.x, mid.y, 0], `${out}/reg_${name}_${seed}.png`);
  if (view === 'eye') await look([e.x, e.y, hl * .55], [e.x, e.y, 0], `${out}/reg_${name}_${seed}.png`); }
writeFileSync(out + '/meta.json', JSON.stringify(meta, null, 1)); await br.close(); console.log('done', meta.length, 'side;', tiles.length, 'grid');
