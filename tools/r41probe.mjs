// Round 4.1 debug probe: front view jaw=1; skin mesh (mesh 0) output replaced with encoded varyings (R=u/uMouthU, G=vert, B=tissue/4); prints values on a pixel grid across the aperture.
import { createRequire } from 'node:module'; import { resolve } from 'node:path';
const require = createRequire(import.meta.url); const { chromium } = require('/tmp/pw/node_modules/playwright'); const { PNG } = require('/tmp/pw/node_modules/pngjs');
const seed = process.argv[2] || 'Q1CW5';
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const pg = await br.newPage({ viewport: { width: 640, height: 480 } }); pg.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0, 200)));
await pg.goto('file://' + resolve('dist/index.html')); await pg.waitForFunction(() => window.FG && window.FG.proc && window.FG.shoot, null, { timeout: 30000 }); await pg.waitForTimeout(1500);
await pg.evaluate(() => { const c = window.FG.shoot.controls; c.minDistance = 0; c.maxDistance = 1e9; }); await pg.addStyleTag({ content: '.bar,#hud,#sheet,#toast,header{display:none!important}' });
await pg.evaluate(v => { window.__safe = v; }, process.argv[4] === 'safe'); await pg.evaluate(s => { const F = window.FG; F.proc.showSeed(s); window.__fgRest = true; window.__fgJaw = 1; }, seed); await pg.waitForTimeout(400);
const c = await pg.evaluate(() => { const F = window.FG, f = F.shoot.App.fish, g = F.shoot.App.genome, lm = {}; for (const l of f.info.landmarks3D) lm[l.name] = l; F.shoot.bg('#e8edf2'); return { hl: f.bm.L * g.head.lengthFrac, lm }; });
const sn = c.lm.snout, mc = c.lm.mouthCorner, mid = { x: (sn.x + mc.x) / 2, y: (sn.y + mc.y) / 2 };
await pg.evaluate(([p, t]) => window.FG.shoot.look(p, t), [[sn.x + c.hl * 1.9, mid.y, .0005], [sn.x, mid.y, 0]]); await pg.waitForTimeout(300);
const MODE = process.argv[3] === 'tn' ? 'c=tn; }' : process.argv[3] === 'nan' ? 'c = (c!=c) ? vec3(1.,0.,1.) : (min(c.x,min(c.y,c.z))<0.0 ? vec3(0.,1.,0.) : (max(c.x,max(c.y,c.z))>1.0 ? vec3(1.,1.,0.) : vec3(0.,0.,1.))); }' : 'c=tn+c*.10*(1.0-.5*occ); }';
const info = await pg.evaluate((process_MODE) => { const f = window.FG.shoot.App.fish; const out = {}; f.group.children.forEach((m, i) => { if (!m.userData.groups) return; const sh = m.material.clone(); const k = 'c=tn+c*.10*(1.0-.5*occ); }'; out.has = sh.fragmentShader.includes(k);
  sh.fragmentShader = sh.fragmentShader.replace(k, process_MODE); if (window.__safe) sh.fragmentShader = sh.fragmentShader.replaceAll('N=normalize(max(abs(det),1e-12)*N-grad);', '{vec3 Q=max(abs(det),1e-12)*N-grad; N=dot(Q,Q)>1e-30?normalize(Q):N;}').replaceAll('N=normalize(max(abs(det),1e-12)*N-mgrad);', '{vec3 Q=max(abs(det),1e-12)*N-mgrad; N=dot(Q,Q)>1e-30?normalize(Q):N;}'); sh.needsUpdate = true; m.material = sh; out.lip = sh.uniforms.uIntLip.value.toArray(); out.thr = sh.uniforms.uIntThroat.value.toArray(); }); return out; }, MODE);
console.log(JSON.stringify(info)); await pg.waitForTimeout(600); await pg.evaluate(([p, t]) => window.FG.shoot.look(p, t), [[sn.x + c.hl * 1.9, mid.y, .0005], [sn.x, mid.y, 0]]); await pg.waitForTimeout(400);
const buf = await pg.screenshot({ clip: { x: 160, y: 170, width: 320, height: 200 } }); const png = PNG.sync.read(buf); (await import('node:fs')).writeFileSync('view/probe_'+seed+'_'+Date.now()+'.png', buf);
const px = (x, y) => { const i = (y * png.width + x) * 4; return [png.data[i], png.data[i + 1], png.data[i + 2]]; };
for (const y of [60, 70, 80, 90, 100, 110]) { let row = []; for (const x of [100, 130, 140, 150, 155, 160, 165, 175]) row.push(x + ':' + px(x, y).join('/')); console.log(y, row.join(' ')); }
await br.close();
