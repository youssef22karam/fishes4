// colour-code every mesh of the fish with a flat unique colour (front view, jaw 1) to identify what covers a screen region
import { createRequire } from 'node:module'; import { resolve } from 'node:path';
const require = createRequire(import.meta.url); const { chromium } = require('/tmp/pw/node_modules/playwright');
const seed = process.argv[2] || 'Q1CW5';
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const pg = await br.newPage({ viewport: { width: 640, height: 480 } });
await pg.goto('file://' + resolve('dist/index.html')); await pg.waitForFunction(() => window.FG && window.FG.proc && window.FG.shoot, null, { timeout: 30000 }); await pg.waitForTimeout(1500);
await pg.evaluate(() => { const c = window.FG.shoot.controls; c.minDistance = 0; c.maxDistance = 1e9; }); await pg.addStyleTag({ content: '.bar,#hud,#sheet,#toast,header{display:none!important}' });
await pg.evaluate(s => { const F = window.FG; F.proc.showSeed(s); window.__fgRest = true; window.__fgJaw = 1; }, seed); await pg.waitForTimeout(400);
const c = await pg.evaluate(() => { const F = window.FG, f = F.shoot.App.fish, g = F.shoot.App.genome, lm = {}; for (const l of f.info.landmarks3D) lm[l.name] = l; F.shoot.bg('#e8edf2'); return { hl: f.bm.L * g.head.lengthFrac, lm }; });
const sn = c.lm.snout, mc = c.lm.mouthCorner, mid = { x: (sn.x + mc.x) / 2, y: (sn.y + mc.y) / 2 };
await pg.evaluate(([p, t]) => window.FG.shoot.look(p, t), [[sn.x + c.hl * 1.9, mid.y, .0005], [sn.x, mid.y, 0]]);
const info = await pg.evaluate(() => { const f = window.FG.shoot.App.fish, T = f.group.children[0].material.constructor; const MB = Object.getPrototypeOf(f.group.children[0]).constructor; const cols = [[1,0,0],[0,1,0],[0,0,1],[1,1,0],[1,0,1],[0,1,1],[1,.5,0],[.5,0,1],[0,.5,0],[.5,.5,.5],[1,.7,.7],[.2,.2,.2],[.6,.3,0],[0,0,.5],[.8,.8,0],[0,.8,.5],[.9,.2,.5]]; const names = [];
  f.group.children.forEach((m, i) => { const cl = cols[i % cols.length]; m.userData.__m = m.material; const sh = m.material; m.material = sh.clone(); m.material.fragmentShader = 'void main(){ gl_FragColor = vec4(' + cl.map(v => v.toFixed(2)).join(',') + ',1.0); }'; m.material.needsUpdate = true; names.push(i + ':' + (m.userData.layer || (m.userData.groups ? 'walls' : '')) + ':' + cl.join('/')); }); return names; });
console.log(info.join('\n')); await pg.waitForTimeout(500); await pg.screenshot({ path: 'docs/shots/probe4/ident.png', clip: { x: 200, y: 200, width: 240, height: 140 } }); await br.close();
