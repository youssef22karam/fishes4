// node tools/montage.mjs out.png cols w h label=file ...   — contact sheet of PNGs (uses playwright)
import { createRequire } from 'node:module'; import { readFileSync } from 'node:fs'; import { resolve } from 'node:path';
const require = createRequire(import.meta.url); let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/tmp/pw/node_modules/playwright')); }
const [out, cols, w, h, ...items] = process.argv.slice(2); const C = +cols, W = +w, Hh = +h;
const tiles = items.map(s => { const i = s.indexOf('='); const f = s.slice(i + 1); return `<div style="width:${W}px"><img style="width:${W}px;height:${Hh}px;object-fit:contain;background:#e8edf2" src="data:image/png;base64,${readFileSync(f).toString('base64')}"><div>${s.slice(0, i)}</div></div>`; });
const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: C * W, height: Math.ceil(items.length / C) * (Hh + 16) } });
await pg.setContent(`<body style="margin:0;background:#fff;font:11px sans-serif;display:grid;grid-template-columns:repeat(${C},${W}px)">${tiles.join('')}</body>`); await pg.waitForTimeout(500); await pg.screenshot({ path: out }); await br.close();
