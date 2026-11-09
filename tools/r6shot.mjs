// Round 6A disc shots.  node tools/r6shot.mjs <outdir> <seed,seed,..> <view,view..>   views: top | under | frontlow | side | rear
// Fish: x = length (head at +x), y = up, z = lateral.  Real WebGL renders via headless chromium (swiftshader).
import { createRequire } from 'node:module'; import { mkdirSync } from 'node:fs'; import { resolve } from 'node:path';
const require = createRequire(import.meta.url); let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/tmp/pw/node_modules/playwright')); }
const out = resolve(process.argv[2]); mkdirSync(out, { recursive: true });
const seeds = process.argv[3].split(','), views = (process.argv[4] || 'top').split(',');
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const pg = await br.newPage({ viewport: { width: +(process.env.W || 1000), height: +(process.env.H || 640) } }); pg.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0, 300)));
await pg.goto('file://' + resolve(process.env.DIST || 'dist/index.html')); await pg.waitForFunction(() => window.FG && window.FG.proc && window.FG.shoot, null, { timeout: 30000 }); await pg.waitForTimeout(1200);
await pg.evaluate(() => { const c = window.FG.shoot.controls; c.minDistance = 0; c.maxDistance = 1e9; }); await pg.addStyleTag({ content: '.bar,#hud,#sheet,#toast,header{display:none!important}' });
for (const seed of seeds) {
  await pg.evaluate(s => { const F = window.FG; F.proc.closeSheet && F.proc.closeSheet(); F.proc.showSeed(s); window.__fgRest = true; window.__fgJaw = 0; F.shoot.bg('#e8edf2'); }, seed); await pg.waitForTimeout(700);
  const c = await pg.evaluate(() => { const F = window.FG, f = F.shoot.App.fish, b = f.info.bounds, g = F.shoot.App.genome; return { b, name: g.meta.name, pat: g.skin.pattern }; });
  const { b } = c, cx = (b.min.x + b.max.x) / 2, cy = (b.min.y + b.max.y) / 2, cz = (b.min.z + b.max.z) / 2, W = b.max.z - b.min.z, Ln = b.max.x - b.min.x, R = Math.max(W, Ln) * (+process.env.K || 1);
  const look = async (p, t, n) => { for (let i = 0; i < 2; i++) { await pg.evaluate(([a, bb]) => window.FG.shoot.look(a, bb), [p, t]); await pg.waitForTimeout(300); } await pg.screenshot({ path: `${out}/${n}_${seed}.png` }); };
  for (const v of views) {
    if (v === 'top') await look([cx + .001, cy + R * 1.25, cz], [cx, cy, cz], v);
    else if (v === 'under') await look([cx + .001, cy - R * 1.25, cz], [cx, cy, cz], v);
    else if (v === 'under34') await look([cx + R * .35, cy - R * .8, cz + R * .55], [cx, cy, cz], v);
    else if (v === 'frontlow') await look([cx + R * 1.0, cy + R * .12, cz + R * .45], [cx, cy, cz], v);
    else if (v === 'front') await look([cx + R * 1.5, cy + .0005, cz], [cx, cy, cz], v);
    else if (v === 'side') await look([cx, cy + R * .1, cz + R * 1.5], [cx, cy, cz], v);
    else if (v === 'rear') await look([cx - R * 1.0, cy + R * .3, cz + R * .5], [cx, cy, cz], v);
  }
  console.log(seed, c.name, c.pat, JSON.stringify({ W: +W.toFixed(3), L: +Ln.toFixed(3), H: +(b.max.y - b.min.y).toFixed(3) }));
}
await br.close();
