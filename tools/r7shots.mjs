// Round 7 head shooter — like headshots.mjs but captures via CDP
// Page.captureScreenshot: playwright's page.screenshot() hangs forever on
// "waiting for fonts to load" in chrome-headless-shell for this app.
// Usage: SEEDS=A,B,C node tools/r7shots.mjs <outdir> [distHtml]
// Views per seed: side (closed), quarter (closed), quarter (jaw open 0.8).
import { createRequire } from 'node:module'; import { mkdirSync, writeFileSync } from 'node:fs'; import { resolve } from 'node:path';
const require = createRequire(import.meta.url); let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/tmp/pw/node_modules/playwright')); }
const out = resolve(process.argv[2]); mkdirSync(out, { recursive: true });
const dist = resolve(process.argv[3] || 'dist/index.html');
const seeds = (process.env.SEEDS || 'QOG9_,QUK8_,Q1CW5,QZTAI,Q10BMF,Y93Q_,LLLL2,BBBB2,Q8NMY,H2W9X').split(',').filter(Boolean);
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'] });
const pg = await br.newPage({ viewport: { width: 760, height: 520 } });
pg.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0, 200)));
await pg.route(/^https?:/, r => r.abort());
await pg.goto('file://' + dist);
await pg.waitForFunction(() => window.FG && window.FG.proc && window.FG.shoot, null, { timeout: 30000 });
await pg.waitForTimeout(1200);
await pg.evaluate(() => { const c = window.FG.shoot.controls; c.minDistance = 0; c.maxDistance = 1e9; });
await pg.addStyleTag({ content: '.bar,#hud,#sheet,#toast,header{display:none!important}' });
const cdp = await pg.context().newCDPSession(pg);
const shot = async name => {
  const r = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(`${out}/${name}.png`, Buffer.from(r.data, 'base64'));
};
for (const seed of seeds) {
  await pg.evaluate(s => { const F = window.FG; F.proc.closeSheet && F.proc.closeSheet(); F.proc.showSeed(s); window.__fgRest = true; window.__fgJaw = 0; F.shoot.bg('#e8edf2'); }, seed);
  await pg.waitForTimeout(600);
  const m = await pg.evaluate(() => { const F = window.FG, f = F.shoot.App.fish, bm = f.bm, fr = {}; bm.frame(bm.h * .5, fr); return { px: fr.px, py: fr.py, hl: bm.h * bm.L }; });
  const d = m.hl;
  const views = [
    ['side', [m.px, m.py, d * 1.35], 0],
    ['quarter', [m.px + d * .9, m.py + d * .05, d * .95], 0],
    ['open', [m.px + d * .9, m.py + d * .05, d * .95], 0.8],
  ];
  for (const [n, p, jaw] of views) {
    await pg.evaluate(([a, j]) => { window.__fgJaw = j; window.FG.shoot.look(a, [window.__px, window.__py, 0]); }, [p, jaw]);
    await pg.evaluate(([x, y]) => { window.__px = x; window.__py = y; }, [m.px, m.py]);
    await pg.evaluate(([a, b]) => window.FG.shoot.look(a, b), [p, [m.px, m.py, 0]]);
    await pg.waitForTimeout(450);
    await shot(`head_${seed}_${n}`);
  }
  console.log('done', seed);
}
await br.close();
console.log('R7SHOTS OK', seeds.length, 'seeds');
