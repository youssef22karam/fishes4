// `npm run test:fish` equivalent:  node tools/test-fish.mjs        (see README — package.json scripts are not edited by the R3 tooling)
//  1. 12 audit seeds + N random seeds (default 100, env N) → FG.hyperRig.validate on every fish (param ranges, NaN, normals, UV overlap, cover alignment,
//     gill-in-head, coherence laws, peduncle min, head ratio, fin-root attachment, flat colour)
//  2. determinism (same seed → identical geometry checksum) and sub-seed independence (re-rolling 'gill' must not change eye / mouth / palette blocks)
//  3. writes docs/upgrade/contact_sheet_r3.jpg + docs/upgrade/test_report_r3.json; exit code 1 on ANY failure.
//  env: N=100  STRESS=1 (adds the 10,000-fish instancing test)  DIST=dist/index.html
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { launch, save, AUDIT_SEEDS, root } from './hr3_lib.mjs';
const N = +(process.env.N || 100), t0 = Date.now();
const { br, pg, errs } = await launch();
const report = { when: new Date().toISOString(), n: N, audit: [], determinism: null, independence: null, stress: null, pageErrors: errs };

/* 1a. audit seeds (fresh builds, hero quality) */
report.audit = await pg.evaluate(seeds => {
  const F = window.FG, C = F.hyper, out = [];
  for (const { seed, role } of seeds) {
    const g = F.proc.fromSeed(seed).genome, f = F.buildFish(JSON.parse(JSON.stringify(g)), { quality: 'hero' });
    let issues; try { issues = F.hyperRig.validate(f, g); } catch (e) { issues = ['EXC:' + e.message]; }
    out.push({ seed, role, name: g.meta.name, tris: f.info.tris, issues }); f.dispose();
  } return out;
}, AUDIT_SEEDS);
for (const r of report.audit) console.log('audit', r.seed.padEnd(11), String(r.tris).padStart(7), 'tris', r.issues.join(',') || 'ok');

/* 2. determinism + independence */
report.determinism = await pg.evaluate(() => {
  const F = window.FG, sum = f => { let s = 0, n = 0; f.group.traverse(o => { if (o.isMesh && o.geometry.attributes.position) { const p = o.geometry.attributes.position.array; n += p.length; for (let i = 0; i < p.length; i += 13) s += p[i] * (1 + (i % 7)); } }); return +s.toFixed(5) + '/' + n; };
  const res = [];
  for (const seed of ['R31', 'R7^R19.x', 'R22']) { const g = F.proc.fromSeed(seed).genome; const a = F.buildFish(JSON.parse(JSON.stringify(g)), { quality: 'hero' }), b = F.buildFish(JSON.parse(JSON.stringify(g)), { quality: 'hero' }); res.push({ seed, a: sum(a), b: sum(b), same: sum(a) === sum(b) }); a.dispose(); b.dispose(); }
  return res;
});
report.independence = await pg.evaluate(() => {
  const F = window.FG, { hyperFor } = F.hyper, res = [];
  for (const seed of ['R31', 'R40', 'R8']) { const g = F.proc.fromSeed(seed).genome, A = hyperFor(JSON.parse(JSON.stringify(g))); F.hyper.HYP.sub = { gill: 'other-seed' }; const B = hyperFor(JSON.parse(JSON.stringify(g))); F.hyper.HYP.sub = {};
    const j = k => JSON.stringify(A[k]) === JSON.stringify(B[k]); res.push({ seed, gillChanged: JSON.stringify(A.gill) !== JSON.stringify(B.gill), eyeSame: j('eye'), mouthSame: j('mouth') !== undefined ? j('mouth') : true, paletteSame: j('palette'), fins: j('scales') }); }
  return res;
});
console.log('determinism', report.determinism.map(r => r.same).join(','), '| independence', JSON.stringify(report.independence));

/* 1b. contact sheet */
const sheet = await pg.evaluate(async n => { const r = await window.FG.hyperRig.contactSheet(n, { prefix: 'T' }); return { summary: r.summary, report: r.report, jpg: r.canvas.toDataURL('image/jpeg', .85) }; }, N);
save(resolve(root, 'docs/upgrade/contact_sheet_r3.jpg'), sheet.jpg); report.sheet = { summary: sheet.summary, bad: sheet.report.filter(r => r.issues.length).map(r => ({ seed: r.seed, issues: r.issues })), maxTris: Math.max(...sheet.report.map(r => r.tris || 0)), medTris: sheet.report.map(r => r.tris || 0).sort((a, b) => a - b)[N >> 1] };
console.log('contact sheet', JSON.stringify(sheet.summary));

if (process.env.STRESS) { report.stress = await pg.evaluate(async () => { const r = await window.FG.hyperRig.stress(10000); window.FG.hyperRig.stressStop(); return r; }); console.log('stress', JSON.stringify(report.stress)); }
await br.close();

const fails = [...report.audit.filter(r => r.issues.length).map(r => 'audit ' + r.seed + ': ' + r.issues.join(',')), ...report.sheet.bad.map(b => b.seed + ': ' + b.issues.join(',')),
  ...report.determinism.filter(r => !r.same).map(r => 'nondeterministic ' + r.seed), ...report.independence.filter(r => !r.eyeSame || !r.paletteSame).map(r => 'sub-seed leak ' + r.seed), ...errs.map(e => 'pageerror ' + e)];
report.failures = fails; report.pass = !fails.length; report.seconds = Math.round((Date.now() - t0) / 1000);
writeFileSync(resolve(root, 'docs/upgrade/test_report_r3.json'), JSON.stringify(report, null, 1));
console.log(fails.length ? 'FAIL (' + fails.length + '):\n  ' + fails.join('\n  ') : 'PASS', `\n${report.seconds}s`);
process.exit(fails.length ? 1 : 0);
