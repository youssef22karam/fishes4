// Round 5B: hunt for hard dark blobs on the head (outside the eyeball).  node tools/r5dots.mjs <seed,seed,...> [outdir]
import { createRequire } from 'node:module'; import { mkdirSync } from 'node:fs'; import { resolve } from 'node:path';
const require = createRequire(import.meta.url); let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/tmp/pw/node_modules/playwright')); }
const seeds = process.argv[2].split(','), out = resolve(process.argv[3] || 'tmp/dots'); mkdirSync(out, { recursive: true });
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const pg = await br.newPage({ viewport: { width: 640, height: 480 } });
await pg.goto('file://' + resolve(process.env.DIST || 'dist/index.html')); await pg.waitForFunction(() => window.FG && window.FG.proc && window.FG.shoot, null, { timeout: 30000 }); await pg.waitForTimeout(1200);
await pg.evaluate(() => { const c = window.FG.shoot.controls; c.minDistance = 0; c.maxDistance = 1e9; }); await pg.addStyleTag({ content: '.bar,#hud,#sheet,#toast,header{display:none!important}' });
for (const seed of seeds) {
  await pg.evaluate(s => { const F = window.FG; F.proc.closeSheet && F.proc.closeSheet(); F.proc.showSeed(s); window.__fgRest = true; window.__fgJaw = 0; F.shoot.bg('#e8edf2'); }, seed); await pg.waitForTimeout(500);
  const c = await pg.evaluate(() => { const F = window.FG, f = F.shoot.App.fish, g = F.shoot.App.genome, lm = {}; for (const l of f.info.landmarks3D) lm[l.name] = l; const e = f.bm.eyes[0]; return { hl: f.bm.L * g.head.lengthFrac, lm, e: e && { c: [e.center.x, e.center.y, e.center.z], R: e.R } }; });
  if (!c.e) { console.log(seed, 'no eye'); continue; }
  const { lm, hl, e } = c, sn = lm.snout, op = lm.operculum || sn, sg = Math.sign(e.c[2] || 1), x = sn.x - hl * .5, y = (sn.y + op.y) / 2, pos = [x, y, sg * hl * 1.35], tgt = [x, y, 0];
  for (let k = 0; k < 2; k++) { await pg.evaluate(([p, t]) => window.FG.shoot.look(p, t), [pos, tgt]); await pg.waitForTimeout(350); }
  const buf = await pg.screenshot(); const b64 = buf.toString('base64');
  const res = await pg.evaluate(async ([b64, ec, R]) => {
    const cam = window.FG.shoot.camera; cam.updateMatrixWorld(); const mv = cam.matrixWorldInverse.elements, pr = cam.projectionMatrix.elements;
    const proj = p => { const x = mv[0] * p[0] + mv[4] * p[1] + mv[8] * p[2] + mv[12], y = mv[1] * p[0] + mv[5] * p[1] + mv[9] * p[2] + mv[13], z = mv[2] * p[0] + mv[6] * p[1] + mv[10] * p[2] + mv[14], w = -z; return [(pr[0] * x / w * .5 + .5) * 640, (1 - (pr[5] * y / w * .5 + .5)) * 480, w]; };
    const pc = proj(ec), pe = proj([ec[0], ec[1] + R, ec[2]]), rpx = Math.hypot(pe[0] - pc[0], pe[1] - pc[1]);
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const cv = document.createElement('canvas'); cv.width = 640; cv.height = 480; const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0); const d = cx.getImageData(0, 0, 640, 480).data;
    const seen = new Uint8Array(640 * 480), blobs = [];
    for (let i = 0; i < 640 * 480; i++) { if (seen[i]) continue; const r = d[i * 4], g = d[i * 4 + 1], bl = d[i * 4 + 2]; if (Math.max(r, g, bl) > 34) continue; const st = [i]; seen[i] = 1; let n = 0, sx = 0, sy = 0; while (st.length) { const j = st.pop(); n++; sx += j % 640; sy += (j / 640) | 0; for (const q of [j - 1, j + 1, j - 640, j + 640]) if (q >= 0 && q < 640 * 480 && !seen[q] && Math.max(d[q * 4], d[q * 4 + 1], d[q * 4 + 2]) <= 34) { seen[q] = 1; st.push(q); } } blobs.push({ n, x: Math.round(sx / n), y: Math.round(sy / n) }); }
    return { rpx: Math.round(rpx), eye: [Math.round(pc[0]), Math.round(pc[1])], blobs: blobs.filter(b => b.n >= 5 && Math.hypot(b.x - pc[0], b.y - pc[1]) > 1.5 * rpx).slice(0, 8) };
  }, [b64, e.c, e.R]);
  console.log(seed, JSON.stringify(res)); if (res.blobs.length) await pg.screenshot({ path: `${out}/${seed}.png` });
}
await br.close();
