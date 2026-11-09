// Head close-up renders for visual QA via FG.hyperRig.shot. Usage: node tools/headcheck.mjs outdir view1,view2 species...
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/pw/node_modules/playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, process.argv[2] || '/tmp/shots'); mkdirSync(out, { recursive: true });
const views = (process.argv[3] || 'headSide').split(',');
const list = process.argv.slice(4).length ? process.argv.slice(4) : ['skipjack-tuna', 'shortfin-mako', 'sailfish', 'largemouth-bass'];
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'] });
const pg = await br.newPage({ viewport: { width: 760, height: 470 } });
pg.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0, 400)));
pg.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 400)); });
await pg.goto('file://' + resolve(root, 'dist/index.html'));
await pg.waitForFunction(() => window.FG && window.FG.App && window.FG.App.fish && window.FG.hyperRig, null, { timeout: 120000 });
for (const sp of list) {
  const [id, seed] = sp.split('@');
  const r = await pg.evaluate(async ([id, seed, views]) => {
    try {
      const FG = window.FG;
      if (/^R\d/.test(id)) FG.doGenerate({ seed: id }); else FG.doGenerate({ species: id, seed: seed || 'arch:' + id });
      await new Promise(r => setTimeout(r, 300));
      return views.map(v => FG.hyperRig.shot(v));
    } catch (err) { return 'ERR ' + err.stack; }
  }, [id, seed, views]);
  if (typeof r === 'string') { console.log(sp, r); continue; }
  r.forEach((u, i) => writeFileSync(resolve(out, sp.replace(/[^a-z0-9-]/gi, '_') + '_' + views[i] + '.png'), Buffer.from(u.split(',')[1], 'base64')));
  console.log(sp, 'ok');
}
await br.close();
