// Round-6A render-based opacity check.  node tools/r6opacity.mjs <seed,seed,..>  (needs dist/index.html built, playwright)
// Each view is rendered over flat magenta; background-coloured pixels enclosed by the fish silhouette (not connected to the border) are see-through.
import { createRequire } from 'node:module'; import { resolve } from 'node:path';
const require = createRequire(import.meta.url); let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/tmp/pw/node_modules/playwright')); }
const seeds = (process.argv[2] || 'Q8NMY').split(',');
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const pg = await br.newPage({ viewport: { width: 520, height: 340 } });
await pg.goto('file://' + resolve('dist/index.html')); await pg.waitForFunction(() => window.FG && window.FG.proc && window.FG.shoot, null, { timeout: 30000 }); await pg.waitForTimeout(1000);
await pg.evaluate(() => { const c = window.FG.shoot.controls; c.minDistance = 0; c.maxDistance = 1e9; }); await pg.addStyleTag({ content: '.bar,#hud,#sheet,#toast,header{display:none!important}' });
/* hole test: flood-fill the exact background colour from the image border; background-coloured pixels NOT reached are seen THROUGH the fish */
const holes = async a => pg.evaluate(async a => { const im = new Image(); im.src = 'data:image/png;base64,' + a; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data, W = c.width, H = c.height;
  const bg = [d[0], d[1], d[2]], isBg = i => Math.abs(d[i * 4] - bg[0]) + Math.abs(d[i * 4 + 1] - bg[1]) + Math.abs(d[i * 4 + 2] - bg[2]) < 10, seen = new Uint8Array(W * H), st = []; let sil = 0, hole = 0;
  for (let i = 0; i < W * H; i++) { const px = i % W, py = (i / W) | 0; if ((px === 0 || py === 0 || px === W - 1 || py === H - 1) && isBg(i)) { seen[i] = 1; st.push(i); } }
  while (st.length) { const i = st.pop(), px = i % W, py = (i / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = px + dx, ny = py + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (!seen[j] && isBg(j)) { seen[j] = 1; st.push(j); } } }
  for (let i = 0; i < W * H; i++) { if (!isBg(i)) sil++; else if (!seen[i]) hole++; } return [sil, hole]; }, a);
let worst = 0, total = 0;
for (const seed of seeds) {
  await pg.evaluate(s => { const F = window.FG; F.proc.closeSheet && F.proc.closeSheet(); F.proc.showSeed(s); window.__fgRest = true; }, seed); await pg.waitForTimeout(600);
  const b = await pg.evaluate(() => window.FG.shoot.App.fish.info.bounds), cx = (b.min.x + b.max.x) / 2, cy = (b.min.y + b.max.y) / 2, cz = (b.min.z + b.max.z) / 2, R = Math.max(b.max.z - b.min.z, b.max.x - b.min.x) * 1.5;
  for (const [name, pos] of [['top', [cx + .001, cy + R, cz]], ['frontlow', [cx + R, cy + R * .1, cz + R * .45]], ['under', [cx + .001, cy - R, cz]], ['edge', [cx, cy + R * .02, cz + R]]]) {
    await pg.evaluate(([c, p, t]) => { window.FG.shoot.bg(c); window.FG.shoot.look(p, t); }, ['#ff00ff', pos, [cx, cy, cz]]); await pg.waitForTimeout(350); await pg.evaluate(([p, t]) => window.FG.shoot.look(p, t), [pos, [cx, cy, cz]]); await pg.waitForTimeout(250);
    const [sil, diff] = await holes((await pg.screenshot()).toString('base64'));
    const fr = diff / Math.max(1, sil); worst = Math.max(worst, fr); total += sil; console.log(seed, name, 'silhouette px', sil, 'see-through (enclosed background) px', diff, (fr * 100).toFixed(3) + '%');
  }
}
console.log('worst see-through fraction', (worst * 100).toFixed(3) + '%', worst < .002 ? 'OPACITY PASS' : 'OPACITY FAIL'); await br.close(); process.exit(worst < .002 ? 0 : 1);
