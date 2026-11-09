// Render the 12 audit seeds in 8 views → <outdir>/<seed>_<view>.png and print per-seed validator output.
// usage: node tools/hr3_shots.mjs <outdir> [hyp=1|0] [seedFilter,...] [viewFilter,...]
import { resolve } from 'node:path';
import { launch, save, AUDIT_SEEDS, VIEWS, root } from './hr3_lib.mjs';
const out = resolve(root, process.argv[2] || 'docs/upgrade/r3/after'), hyp = process.argv[3] !== '0';
const sf = process.argv[4] ? process.argv[4].split(',') : null, vf = process.argv[5] ? process.argv[5].split(',') : Object.keys(VIEWS);
const { br, pg } = await launch();
await pg.evaluate(h => { window.FG.hyper.HYP.on = h; }, hyp);
const report = [];
for (const { seed, role } of AUDIT_SEEDS) {
  if (sf && !sf.includes(seed)) continue;
  const info = await pg.evaluate(async s => {
    const F = window.FG; F.proc.closeSheet && F.proc.closeSheet(); F.proc.showSeed(s);
    await new Promise(r => setTimeout(r, 400));
    const f = F.shoot.App.fish, g = F.shoot.App.genome, r = F.hyperRig;
    let issues = []; try { issues = r.validate(f, g); } catch (e) { issues = ['VALIDATE_EXC:' + e.message]; }
    return { name: g.meta.name, clade: g.meta.clade, tris: f.info.tris, issues };
  }, seed);
  for (const [k, v] of Object.entries(VIEWS)) {
    if (!vf.includes(k)) continue;
    const url = await pg.evaluate(v => window.FG.hyperRig.shot(v), v); save(`${out}/${seed.replace(/[^\w]/g, '_')}_${k}.png`, url);
  }
  report.push({ seed, role, ...info }); console.log(seed, '|', role, '|', info.name, '|', info.tris, 'tris |', info.issues.join(',') || 'ok');
}
await br.close();
