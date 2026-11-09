// Head close-up census renderer.  node tools/headshots.mjs <outdir> <count> [distHtml]
//  picks `count` random standard fish (seed order hash('r6h'+i), first-come per body-plan family so every plan appears), renders side + front-quarter
//  head close-ups (eye + mouth corner in frame, RESTING mouth), writes one PNG per fish, a montage PNG per 6 fish, and census.json (seed list + geometric flags).
import { createRequire } from 'node:module'; import { mkdirSync, writeFileSync } from 'node:fs'; import { resolve } from 'node:path';
const require = createRequire(import.meta.url); let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/tmp/pw/node_modules/playwright')); }
const out = resolve(process.argv[2]); mkdirSync(out, { recursive: true }); const COUNT = +process.argv[3] || 24; const dist = resolve(process.argv[4] || 'dist/index.html');
const seeds = (process.env.SEEDS || '').split(',').filter(Boolean);
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const pg = await br.newPage({ viewport: { width: 760, height: 520 } }); pg.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0, 200)));
await pg.goto('file://' + dist); await pg.waitForFunction(() => window.FG && window.FG.proc && window.FG.shoot, null, { timeout: 30000 }); await pg.waitForTimeout(1200);
await pg.evaluate(() => { const c = window.FG.shoot.controls; c.minDistance = 0; c.maxDistance = 1e9; }); await pg.addStyleTag({ content: '.bar,#hud,#sheet,#toast,header{display:none!important}' });
/* seed list: deterministic stream, stratified by plan family so the census spans plans */
let list = seeds;
if (!list.length) {   /* engine imported under Node (headless stubs) only to choose the seeds */
  await import('./headless.mjs'); const eng = f => new URL('../src/engine/' + f, import.meta.url).href;
  const { FG } = await import(eng('fishgen.js')), { initProcGen, fromSeed } = await import(eng('procgen.js')), { hashHex } = await import(eng('genome.js')); initProcGen(FG);
  const fams = {}; list = [];
  for (let i = 0; i < 4000 && list.length < COUNT; i++) {
    const s = hashHex('r6h' + i).slice(0, 8).toUpperCase().replace(/[ILOU]/g, c => ({ I: '1', L: '1', O: '0', U: 'V' }[c])); let f; try { f = fromSeed(s); } catch { continue; }
    const fam = FG.axesOf(f.genome).plan.family; fams[fam] = (fams[fam] || 0) + 1; if (fams[fam] <= Math.ceil(COUNT / 7)) list.push(s); }
}
const rows = [];
for (const seed of list) {
  await pg.evaluate(s => { const F = window.FG; F.proc.closeSheet && F.proc.closeSheet(); F.proc.showSeed(s); window.__fgRest = true; window.__fgJaw = 0; F.shoot.bg('#e8edf2'); }, seed); await pg.waitForTimeout(500);
  const m = await pg.evaluate(() => { const F = window.FG, f = F.shoot.App.fish, bm = f.bm, fr = {}; bm.frame(bm.h * .5, fr); return { px: fr.px, py: fr.py, hl: bm.h * bm.L, name: F.shoot.App.genome.meta.name, fam: bm.a.family, eyeY: bm.eyeY, lm: bm.lm }; });
  const d = m.hl, shots = [];
  for (const [n, p] of [['side', [m.px, m.py, d * 1.35]], ['quarter', [m.px + d * .9, m.py + d * .05, d * .95]]]) {
    for (let i = 0; i < 2; i++) { await pg.evaluate(([a, b]) => window.FG.shoot.look(a, b), [p, [m.px, m.py - (n === 'side' ? 0 : 0), 0]]); await pg.waitForTimeout(250); }
    shots.push((await pg.screenshot({ type: 'png' })).toString('base64')); }
  writeFileSync(`${out}/head_${seed}_side.png`, Buffer.from(shots[0], 'base64')); writeFileSync(`${out}/head_${seed}_quarter.png`, Buffer.from(shots[1], 'base64'));
  rows.push({ seed, name: m.name, family: m.fam, shots }); console.log(seed, m.fam, m.name);
}
/* montages: 3 fish per sheet (side | quarter), composed in the browser */
const pm = await br.newPage({ viewport: { width: 1520, height: 1560 } });
for (let k = 0; k * 3 < rows.length; k++) {
  const sl = rows.slice(k * 3, k * 3 + 3), html = '<body style="margin:0;background:#fff;font:14px sans-serif">' + sl.map(r => `<div style="display:flex"><div style="position:absolute;background:#000a;color:#fff;padding:2px 6px">${r.seed} ${r.family}</div><img width=760 src="data:image/png;base64,${r.shots[0]}"><img width=760 src="data:image/png;base64,${r.shots[1]}"></div>`).join('') + '</body>';
  await pm.setContent(html); await pm.waitForTimeout(300); await pm.screenshot({ path: `${out}/montage_${String(k + 1).padStart(2, '0')}.png`, clip: { x: 0, y: 0, width: 1520, height: 520 * sl.length } });
}
writeFileSync(`${out}/census.json`, JSON.stringify(rows.map(r => ({ seed: r.seed, name: r.name, family: r.family })), null, 1));
await br.close();
