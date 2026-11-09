// Round 4.1 colour-code proof (front view, jaw = 1).  node tools/r41ident.mjs <outdir> [seed...]   (SPLIT=1 colours the interior groups separately)
// ROLE colours: body skin = red 255/0/0 (its lower-jaw DISCARD is kept: colour is written after the discard block), interior walls = magenta 255/0/255,
// lower-jaw patch = blue 0/0/255, upper-jaw patch = cyan 0/255/255, everything else = cycle of greens/yellows/oranges.
// Writes front_<seed>_jaw1(.png|_crop.png), ident_<seed>_jaw1_crop.png, footprint_<seed>_jaw1_crop.png (skin hidden -> true aperture footprint of the interior).
import { createRequire } from 'node:module'; import { mkdirSync } from 'node:fs'; import { resolve } from 'node:path';
const require = createRequire(import.meta.url); let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/tmp/pw/node_modules/playwright')); }
const out = resolve(process.argv[2] || 'docs/shots/after41'); mkdirSync(out, { recursive: true }); const seeds = process.argv.slice(3).length ? process.argv.slice(3) : ['Q1CW5', 'QZTAI'];
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const pg = await br.newPage({ viewport: { width: 640, height: 480 } }); pg.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0, 200)));
await pg.goto('file://' + resolve('dist/index.html')); await pg.waitForFunction(() => window.FG && window.FG.proc && window.FG.shoot, null, { timeout: 30000 }); await pg.waitForTimeout(1500);
await pg.evaluate(() => { const c = window.FG.shoot.controls; c.minDistance = 0; c.maxDistance = 1e9; }); await pg.addStyleTag({ content: '.bar,#hud,#sheet,#toast,header{display:none!important}' });
const clip = { x: 160, y: 170, width: 320, height: 200 };
for (const seed of seeds) {
  await pg.evaluate(s => { const F = window.FG; F.proc.closeSheet && F.proc.closeSheet(); F.proc.showSeed(s); window.__fgRest = true; window.__fgJaw = 1; }, seed); await pg.waitForTimeout(500);
  const c = await pg.evaluate(() => { const F = window.FG, f = F.shoot.App.fish, g = F.shoot.App.genome, lm = {}; for (const l of f.info.landmarks3D) lm[l.name] = l; F.shoot.bg('#e8edf2'); return { hl: f.bm.L * g.head.lengthFrac, lm }; });
  const sn = c.lm.snout, mc = c.lm.mouthCorner, mid = { x: (sn.x + mc.x) / 2, y: (sn.y + mc.y) / 2 };
  const aim = async () => { await pg.evaluate(([p, t]) => window.FG.shoot.look(p, t), [[sn.x + c.hl * 1.9, mid.y, .0005], [sn.x, mid.y, 0]]); await pg.waitForTimeout(350); };
  await aim(); await pg.screenshot({ path: `${out}/front_${seed}_jaw1.png` }); await pg.screenshot({ path: `${out}/front_${seed}_jaw1_crop.png`, clip });
  const names = await pg.evaluate((split) => { const f = window.FG.shoot.App.fish; const cyc = [[0,255,0],[255,255,0],[255,128,0],[128,0,255],[0,128,0],[128,128,128],[255,180,180],[50,50,50],[150,75,0],[200,200,0],[0,200,128],[230,50,128]]; const names = [], extra = [];
    const flatOf = cl => 'gl_FragColor = vec4(' + cl.map(v => (v / 255).toFixed(3)).join(',') + ',1.0);', K = '/* screen-space surface frame, reused by every bump layer */';
    const recolour = (m, cl) => { m.userData.__m = m.material; m.material = m.material.clone(); const fs0 = m.material.fragmentShader; m.material.fragmentShader = fs0.includes(K) ? fs0.replace(K, flatOf(cl) + ' return;' + K) : 'void main(){ ' + flatOf(cl) + ' }'; m.material.needsUpdate = true; };
    let ci = 0; f.group.children.slice().forEach((m, i) => { let cl, role = '';
      if (i === 0) { cl = [255, 0, 0]; role = 'skin'; } else if (m.userData.groups) { cl = [255, 0, 255]; role = 'walls'; } else if (m === f.parts.jaw) { cl = [0, 0, 255]; role = 'lowerJaw'; } else if (m === f.parts.upperJaw) { cl = [0, 255, 255]; role = 'upperJaw'; } else { cl = cyc[ci++ % cyc.length]; role = 'other'; }
      if (m.userData.groups && split) { const G = m.geometry, ix = G.index.array, GC = [[255,0,0],[255,255,0],[0,255,0],[0,255,255],[0,0,255],[255,0,255]]; m.userData.__hide = true; m.visible = false;
        m.userData.groups.forEach((gr, k) => { const g2 = new G.constructor(); for (const n in G.attributes) g2.setAttribute(n, G.attributes[n]); g2.setIndex(Array.from(ix.slice(gr.a * 3, gr.b * 3))); const mm = new m.constructor(g2, m.material.clone()); mm.frustumCulled = false; mm.renderOrder = m.renderOrder; const c2 = GC[k % 6]; mm.material.fragmentShader = 'void main(){ ' + flatOf(c2) + ' }'; mm.material.needsUpdate = true; f.group.add(mm); extra.push(mm); names.push('group ' + gr.name + ' ' + c2.join('/')); }); return; }
      recolour(m, cl); names.push(i + ':' + role + ':' + cl.join('/')); }); return names; }, !!process.env.SPLIT);
  const tag = process.env.SPLIT ? 'groups' : '';
  await pg.waitForTimeout(500); await aim(); await pg.screenshot({ path: `${out}/ident${tag}_${seed}_jaw1_crop.png`, clip });
  if (!process.env.SPLIT) { await pg.evaluate(() => { window.FG.shoot.App.fish.group.children[0].visible = false; }); await pg.waitForTimeout(300); await pg.screenshot({ path: `${out}/footprint_${seed}_jaw1_crop.png`, clip }); }
  console.log(seed, names.join(' | '));
  await pg.evaluate(() => { const f = window.FG.shoot.App.fish; f.group.children.slice().forEach(m => { m.visible = true; if (m.userData.__m) { m.material = m.userData.__m; delete m.userData.__m; } }); });
}
await br.close(); console.log('ok');
