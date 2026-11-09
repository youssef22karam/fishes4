// Dev diagnostic: per-lineage gate pass-rate and top rejection reasons.  node tools/diag.mjs [N] [lineage]
import './headless.mjs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname);
const { FG } = await import(pathToFileURL(resolve(root, 'src/engine/fishgen.js')).href);
const eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { CLADE_TABLE } = await import(eng('cladedata.js'));
const { makeRng, sampleTraits, mutateTraits, genomeHash } = await import(eng('genome.js'));
const { validate } = await import(eng('validate.js'));
const { makeEngineGenome } = await import(eng('mapping.js'));
const { nameFishFromTraits } = await import(eng('naming.js'));
const N = +process.argv[2] || 60, only = process.argv[3];
for (const c of CLADE_TABLE) for (const l of c.lin) {
  if (only && l.e !== only && c.id !== only) continue;
  let ok = 0; const reasons = {};
  for (let i = 0; i < N; i++) {
    const rng = makeRng('diag' + l.e + i); const t = mutateTraits(sampleTraits(rng, c.id, l.e), rng, .06);
    let rep; try { const pre = validate(t); if (!pre.ok) rep = pre; else { const g = makeEngineGenome(FG, t, { seed: 'X', hash: genomeHash(t), name: nameFishFromTraits(t, 'k') }); rep = validate(t, g, FG); } } catch (e) { rep = { ok: false, failures: [{ inv: 'EXC', msg: e.message.slice(0, 80) }] }; }
    if (rep.ok) ok++; else for (const f of rep.failures) { const k = f.inv + ': ' + f.msg.replace(/-?[\d.]+/g, '#'); reasons[k] = (reasons[k] || 0) + 1; }
  }
  console.log(`${c.id}/${l.e}: ${ok}/${N}` + (ok < N ? '\n   ' + Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => v + '× ' + k).join('\n   ') : ''));
}
