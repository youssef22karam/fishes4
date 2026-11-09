// Round 4.1 macro / head shots.  node tools/r41shot.mjs <outdir> <seed> eye|head|front [suffix]   DIST=path/to/index.html to render another build
import { createRequire } from 'node:module'; import { mkdirSync } from 'node:fs'; import { resolve } from 'node:path';
const require = createRequire(import.meta.url); const { chromium } = require('/tmp/pw/node_modules/playwright');
const out = resolve(process.argv[2]); mkdirSync(out, { recursive: true }); const seed = process.argv[3], kind = process.argv[4] || 'eye', suf = process.argv[5] || '';
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const pg = await br.newPage({ viewport: { width: 640, height: 480 } }); pg.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0, 200)));
await pg.goto('file://' + resolve(process.env.DIST || 'dist/index.html')); await pg.waitForFunction(() => window.FG && window.FG.proc && window.FG.shoot, null, { timeout: 30000 }); await pg.waitForTimeout(1500);
await pg.evaluate(() => { const c = window.FG.shoot.controls; c.minDistance = 0; c.maxDistance = 1e9; }); await pg.addStyleTag({ content: '.bar,#hud,#sheet,#toast,header{display:none!important}' });
await pg.evaluate(s => { const F = window.FG; F.proc.closeSheet && F.proc.closeSheet(); F.proc.showSeed(s); window.__fgRest = true; window.__fgJaw = +(window.__jaw || 0); F.shoot.bg('#e8edf2'); }, seed); await pg.waitForTimeout(600);
if (process.env.PIG) await pg.evaluate(mode => { const f = window.FG.shoot.App.fish; const K = 'vec3 col=skinPigment(u,ang); float tissue=vBody.z;'; const rep = { pig: K + ' gl_FragColor=vec4(col,1.0); return;', uv: K + ' gl_FragColor=vec4(fract(u*60.0), fract(ang*60.0), 0.0, 1.0); return;', vert: K + ' float _v=verticalOf(ang); gl_FragColor=vec4(_v*.5+.5, fract(u*20.0), 0.0, 1.0); return;', tissue: K + ' gl_FragColor=vec4(tissue/4.0, vBody.w, vBody.y, 1.0); return;' }[mode];
  const seen = new Map(); f.group.children.forEach(m => { if (!m.material || !m.material.fragmentShader || !m.material.fragmentShader.includes(K)) return; if (!seen.has(m.material)) { const c = m.material.clone(); c.fragmentShader = c.fragmentShader.replace(K, rep); c.needsUpdate = true; seen.set(m.material, c); } m.material = seen.get(m.material); }); }, process.env.PIG);
const info = await pg.evaluate(() => { const F = window.FG, f = F.shoot.App.fish, g = F.shoot.App.genome, e = f.bm.eyes[0], lm = {}; for (const l of f.info.landmarks3D) lm[l.name] = l; return { hl: f.bm.L * g.head.lengthFrac, lm, eye: { c: [e.center.x, e.center.y, e.center.z], a: [e.axis.x, e.axis.y, e.axis.z], R: e.R }, pat: g.skin && g.skin.pattern, bounds: f.info.bounds }; });
const e = info.eye; let pos, tgt;
if (kind === 'eye') { const d = e.R * 9; pos = [e.c[0] + e.a[0] * d, e.c[1] + e.a[1] * d, e.c[2] + e.a[2] * d]; tgt = e.c; }
else if (kind === 'head') { const sn = info.lm.snout, mc = info.lm.mouthCorner || sn, hx = (sn.x - info.hl * .5); pos = [hx, e.c[1], Math.sign(e.c[2] || 1) * info.hl * 2.3]; tgt = [hx, e.c[1], 0]; }
await pg.evaluate(([p, t]) => window.FG.shoot.look(p, t), [pos, tgt]); await pg.waitForTimeout(500);
await pg.evaluate(([p, t]) => window.FG.shoot.look(p, t), [pos, tgt]); await pg.waitForTimeout(400);
await pg.screenshot({ path: `${out}/${kind}_${seed}${suf}.png` }); console.log(seed, kind, 'pattern', info.pat, 'eyeR', e.R); await br.close();
