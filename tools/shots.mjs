// Render check: node tools/shots.mjs <outDir> <seed,seed,...> [views=head,mouth,fin]
//   Needs a built dist/index.html and Playwright (NODE_PATH=/tmp/pw/node_modules, or `npm i -D playwright`).
//   views: head (head-on, rest), mouth (side, typical open), fin (rest / power / recovery close-ups), full (side, rest)
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(process.env.PW_PATH ? process.env.PW_PATH + '/' : import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/tmp/pw/node_modules/playwright')); }
const out = resolve(process.argv[2] || 'shots'), seeds = (process.argv[3] || 'QD').split(','), views = (process.argv[4] || 'head,mouth,fin').split(',');
mkdirSync(out, { recursive: true });
const url = 'file://' + resolve('dist/index.html');
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const pg = await br.newPage({ viewport: { width: 640, height: 480 } });
pg.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0, 300)));
await pg.goto(url); await pg.waitForFunction(() => window.FG && window.FG.proc && window.FG.shoot, null, { timeout: 30000 });
await pg.waitForTimeout(2500);
if (process.env.HIDE) await pg.evaluate(() => { window.__HIDE = 1; });
await pg.addStyleTag({ content: '.bar,#hud,#sheet,#toast,header{display:none!important}' });
const report = [];
for (const seed of seeds) {
  const meta = await pg.evaluate(seed => {
    const F = window.FG || window.__FG; if (!F) return { err: 'no FG on window' };
    F.proc.closeSheet && F.proc.closeSheet();
    F.proc.showSeed(seed); window.__fgRest = true; window.__fgJaw = 0; if (window.__HIDE) F.shoot.App.fish.group.children.forEach(c => { if (!c.userData.mouthPart) c.visible = false; });
    const f = F.shoot.App.fish, g = F.shoot.App.genome;
    return { seed, name: g.meta && g.meta.name, swim: g.swim.mode, clade: g.meta.clade, info: f.info.pec || null };
  }, seed);
  if (meta.err) { console.log(meta.err); break; }
  await pg.waitForTimeout(400);
  const cams = await pg.evaluate(() => {
    const F = window.FG, f = F.shoot.App.fish, g = F.shoot.App.genome, L = f.bm.L, lm = {};
    for (const l of f.info.landmarks3D) lm[l.name] = l;
    return { L, lm, head: g.head.lengthFrac, b: { min: f.info.bounds.min, max: f.info.bounds.max } };
  });
  const L = cams.L, hl = L * cams.head, lm = cams.lm, bb = cams.b;
  const cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2;
  const shot = async (name, pos, tgt, evalFn, arg) => {
    await pg.evaluate(([p, t]) => { window.FG.shoot.look(p, t); }, [pos, tgt]);
    if (evalFn) await pg.evaluate(evalFn, arg);
    await pg.waitForTimeout(250);
    await pg.screenshot({ path: `${out}/${seed}_${name}.png` });
  };
  const snout = lm.snout || { x: bb.max.x, y: cy, z: 0 }, mc = lm.mouthCorner || snout;
  const mid = { x: (snout.x + mc.x) / 2, y: (snout.y + mc.y) / 2, z: 0 };
  if (views.includes('head')) await shot('head_rest', [snout.x + hl * 2.2, mid.y, 0.001], [snout.x, mid.y, 0]);
  if (views.includes('mouth')) {
    await shot('mouth_rest_side', [mid.x, mid.y, hl * 1.7], [mid.x, mid.y, 0]);
    await shot('mouth_open_side', [mid.x, mid.y, hl * 1.7], [mid.x, mid.y, 0], () => { window.FG.shoot.jaw(1); });
    await shot('mouth_open_34', [mid.x + hl * 1.0, mid.y + hl * .1, hl * 1.4], [mid.x, mid.y, 0], () => { window.FG.shoot.jaw(1); });
  }
  if (views.includes('fin')) {
    const pb = lm.pectoralBase || { x: cx, y: cy, z: 0 };
    const fpos = [pb.x - L * .05, pb.y - L * .04, L * .42], ft = [pb.x - L * .05, pb.y - L * .04, pb.z];
    await shot('fin_rest', fpos, ft, () => { window.FG.shoot.fin && window.FG.shoot.fin('rest'); });
    await shot('fin_power', fpos, ft, () => { window.FG.shoot.fin && window.FG.shoot.fin('power'); });
    await shot('fin_recovery', fpos, ft, () => { window.FG.shoot.fin && window.FG.shoot.fin('recovery'); });
  }
  if (views.includes('full')) await shot('full', [cx, cy, L * 1.5], [cx, cy, 0]);
  report.push(meta);
}
console.log(JSON.stringify(report));
await br.close();
