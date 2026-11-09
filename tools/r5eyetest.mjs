// Round 5B: iris-visibility ray test. For every eye, rays leave visible cornea sample points toward ~150 view directions (any direction on the outward side of the surface at that point);
// a ray blocked by the eye BLEND PATCH mesh is a violation (patch crossing the eyeball silhouette). Rays blocked by the head skin proper are reported separately (information only).
// node tools/r5eyetest.mjs <seed,seed,...>   (DIST=path/to/index.html to test another build)
import { createRequire } from 'node:module'; import { resolve } from 'node:path';
const require = createRequire(import.meta.url); let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/tmp/pw/node_modules/playwright')); }
const seeds = process.argv[2].split(',');
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const pg = await br.newPage({ viewport: { width: 320, height: 240 } });
await pg.goto('file://' + resolve(process.env.DIST || 'dist/index.html')); await pg.waitForFunction(() => window.FG && window.FG.proc && window.FG.shoot, null, { timeout: 30000 }); await pg.waitForTimeout(1000);
let totP = 0, totB = 0, totR = 0;
for (const seed of seeds) {
  const r = await pg.evaluate(s => {
    const F = window.FG; F.proc.closeSheet && F.proc.closeSheet(); F.proc.showSeed(s); const f = F.shoot.App.fish, bm = f.bm; if (!bm.eyes || !bm.eyes.length) return null;
    const meshes = f.group.children.filter(m => m.geometry && m.geometry.index && m.geometry.attributes.position); const patch = meshes.filter(m => m.userData.eyeSkin), body = meshes.filter(m => m.userData.eyeSkin === undefined && !m.userData.eyeball && m.material && m.material.uniforms && m.material.uniforms.uPattern && m.geometry.attributes.aBody && m.geometry.attributes.position.count > 500);
    const hit = (o, d, P, I, lim, c, rr) => { for (let t = 0; t < I.count; t += 3) { const a = I.getX(t), b = I.getX(t + 1), cc = I.getX(t + 2); const ax = P.getX(a), ay = P.getY(a), az = P.getZ(a); if ((ax - c[0]) ** 2 + (ay - c[1]) ** 2 + (az - c[2]) ** 2 > rr) { const bx = P.getX(b), by = P.getY(b), bz = P.getZ(b); if ((bx - c[0]) ** 2 + (by - c[1]) ** 2 + (bz - c[2]) ** 2 > rr) continue; }
      const e1x = P.getX(b) - ax, e1y = P.getY(b) - ay, e1z = P.getZ(b) - az, e2x = P.getX(cc) - ax, e2y = P.getY(cc) - ay, e2z = P.getZ(cc) - az, px = d[1] * e2z - d[2] * e2y, py = d[2] * e2x - d[0] * e2z, pz = d[0] * e2y - d[1] * e2x, det = e1x * px + e1y * py + e1z * pz; if (Math.abs(det) < 1e-14) continue;
      const tx = o[0] - ax, ty = o[1] - ay, tz = o[2] - az, u = (tx * px + ty * py + tz * pz) / det; if (u < 0 || u > 1) continue; const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x, v = (d[0] * qx + d[1] * qy + d[2] * qz) / det; if (v < 0 || u + v > 1) continue; const tt = (e2x * qx + e2y * qy + e2z * qz) / det; if (tt > 1e-7 && tt < lim) return true; } return false; };
    let rays = 0, bp = 0, bb = 0; const out = [];
    for (const e of bm.eyes) { if (e.vestigial) continue; const R = e.R, c = [e.center.x, e.center.y, e.center.z], a = [e.axis.x, e.axis.y, e.axis.z];
      let t1 = Math.abs(a[0]) < .9 ? [1, 0, 0] : [0, 1, 0]; const dt = t1[0] * a[0] + t1[1] * a[1] + t1[2] * a[2]; t1 = t1.map((x, i) => x - dt * a[i]); const l1 = Math.hypot(...t1); t1 = t1.map(x => x / l1); const t2 = [a[1] * t1[2] - a[2] * t1[1], a[2] * t1[0] - a[0] * t1[2], a[0] * t1[1] - a[1] * t1[0]];
      const near = 36 * R * R;
      for (const th of [0, .25, .45, .6]) for (let k = 0; k < (th ? 8 : 1); k++) { const ph = k / 8 * 6.2832, n = [0, 1, 2].map(i => a[i] * Math.cos(th) + Math.sin(th) * (Math.cos(ph) * t1[i] + Math.sin(ph) * t2[i])), o = [0, 1, 2].map(i => c[i] + n[i] * R * 1.0005);
        const b1 = [t1[0] - n[0] * (t1[0] * n[0] + t1[1] * n[1] + t1[2] * n[2]), t1[1] - n[1] * (t1[0] * n[0] + t1[1] * n[1] + t1[2] * n[2]), t1[2] - n[2] * (t1[0] * n[0] + t1[1] * n[1] + t1[2] * n[2])], lb = Math.hypot(...b1) || 1, bb1 = b1.map(x => x / lb), bb2 = [n[1] * bb1[2] - n[2] * bb1[1], n[2] * bb1[0] - n[0] * bb1[2], n[0] * bb1[1] - n[1] * bb1[0]];
        for (const el of [4, 10, 18, 28, 40, 55, 75]) for (let q = 0; q < 16; q++) { const ee = el * Math.PI / 180, qa = q / 16 * 6.2832, d = [0, 1, 2].map(i => n[i] * Math.sin(ee) + Math.cos(ee) * (Math.cos(qa) * bb1[i] + Math.sin(qa) * bb2[i])); rays++; let hp = false, hb = false;
          for (const m of patch) if (hit(o, d, m.geometry.attributes.position, m.geometry.index, 20 * R, c, near)) hp = true;
          if (hp) bp++; else for (const m of body) if (hit(o, d, m.geometry.attributes.position, m.geometry.index, 20 * R, c, near)) { hb = true; break; } if (hb) bb++; } } }
    return { rays, patchBlocked: bp, bodyBlocked: bb, eyes: bm.eyes.length };
  }, seed);
  if (!r) { console.log(seed, 'no eye'); continue; } totP += r.patchBlocked; totB += r.bodyBlocked; totR += r.rays; console.log(seed, JSON.stringify(r));
}
console.log('TOTAL rays', totR, 'patch-blocked', totP, 'body-blocked(info)', totB); await br.close();
