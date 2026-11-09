/* Procedural generation pipeline:  seed → clade → sample (inside envelope) → bounded mutation → clamp
   → map onto the original engine genome → HARD GATE (validate.js) → accept, else reject & resample.
   Mutate / Breed results go through exactly the same gate.  Seeds are the only state:
     root seed      "K7M2QX9D"
     mutant         "<seed>~SALT"           (bounded step of the parent)
     offspring      "<seed>^<seed>.SALT"    (crossover, clamped into the child's clade envelope) */
import { CLADE_IDS, CLADES } from './clades.js';
import { makeRng, sampleTraits, mutateTraits, breedTraits, genomeHash, peekClade, seedFromRng, randomSeed, cleanSeed } from './genome.js';
import { nameFishFromTraits } from './naming.js';
import { validate } from './validate.js';
import { makeEngineGenome } from './mapping.js';

let ENGINE = null;
export const STATS = { accepted: 0, rejected: 0, byInvariant: {}, lastFailures: [] };
export const initProcGen = FG => { ENGINE = FG; };
const MAX_TRIES = 120;

/** Gate one trait vector. Returns a complete fish record or { fail }. */
function realise(t, seed, mesh = false) {
  const hash = genomeHash(t), name = nameFishFromTraits(t, hash);
  const g = validate(t).ok ? makeEngineGenome(ENGINE, t, { seed, hash, name }) : null;
  const rep = g ? validate(t, g, ENGINE) : validate(t);
  /* round 6H: the shared coherence audit (laws L1–L6) is part of the gate. Roots use its analytic part (cheap, 10,000-seed scale) — except one-sided plans (flatfish: the second eye sits behind the first, on terrain only the built head shows), which build the mesh too; mutants and offspring build the mesh and run it all. */
  if (g && rep.ok && ENGINE.coherenceAudit) { const v = ENGINE.coherenceAudit(g, { mesh }); if (v.length) { rep.ok = false; rep.failures = (rep.failures || []).concat(v.map(x => ({ inv: 'coherence', msg: x.code + ': ' + x.msg }))); } }
  if (!rep.ok) { STATS.rejected++; for (const f of rep.failures) STATS.byInvariant[f.inv + ': ' + f.msg.replace(/[-\d.]+/g, '#')] = (STATS.byInvariant[f.inv + ': ' + f.msg.replace(/[-\d.]+/g, '#')] || 0) + 1; return { fail: rep }; }
  STATS.accepted++;
  return { traits: t, genome: g, report: rep, hash, name, seed, clade: t.clade, lineage: t.lineage };
}

function rootFish(token) {
  const { clade, lineage } = peekClade(token);
  for (let k = 0; k < MAX_TRIES; k++) {
    const rng = makeRng(token + '#' + k);
    const t = mutateTraits(sampleTraits(rng, clade, lineage), rng, .06);       /* sample → small bounded mutation (re-clamped) */
    const r = realise(t, token); if (r.traits) { r.attempts = k + 1; return r; }
  }
  throw new Error('no valid genome for seed ' + token);
}
function mutantFish(parent, salt) {
  const seed = `${parent.seed}~${salt}`;
  for (let k = 0; k < MAX_TRIES; k++) {
    const rng = makeRng(seed + '#' + k), r = realise(mutateTraits(parent.traits, rng, .1 + .05 * rng.next()), seed, true);
    if (r.traits) { r.attempts = k + 1; return r; }
  }
  return { ...parent, seed };
}
const wrap = s => (/[~^]/.test(s) ? `(${s})` : s);
function childFish(a, b, salt) {
  const seed = `${a.seed}^${wrap(b.seed)}${salt ? '.' + salt : ''}`;
  for (let k = 0; k < MAX_TRIES; k++) {
    const rng = makeRng(seed + '#' + k), r = realise(breedTraits(a.traits, b.traits, rng), seed, true);
    if (r.traits) { r.attempts = k + 1; return r; }
  }
  return { ...a, seed };
}

/** Parse + evaluate a seed expression (left-associative:  A~K1^B.S  =  ((A mutated K1) × B)). */
export function fromSeed(raw) {
  const s = cleanSeed(raw); if (!s) throw new Error('empty seed');
  let i = 0;
  const tok = () => { const j = i; while (i < s.length && /[0-9A-Z]/.test(s[i])) i++; if (j === i) throw new Error('bad seed'); return s.slice(j, i); };
  const term = () => { if (s[i] === '(') { i++; const v = expr(); if (s[i++] !== ')') throw new Error('bad seed'); return v; } return rootFish(tok()); };
  const expr = () => {
    let v = term();
    while (i < s.length && (s[i] === '~' || s[i] === '^')) {
      const op = s[i++];
      if (op === '~') v = mutantFish(v, tok());
      else { const w = term(); let salt = ''; if (s[i] === '.') { i++; salt = tok(); } v = childFish(v, w, salt); }
    }
    return v;
  };
  const v = expr(); if (i !== s.length) throw new Error('bad seed');
  return v;
}

/** New random fish; optional clade bias (the seed alone still fully determines the fish). */
export function randomFish(cladeFilter) {
  for (let n = 0; n < 4000; n++) {
    const seed = randomSeed();
    if (cladeFilter && peekClade(seed).clade !== cladeFilter) continue;
    try { return fromSeed(seed); } catch (e) { /* rejected seed: draw another */ }
  }
  throw new Error('could not generate a fish');
}
export const mutateFish = fish => mutantFish(fish, seedFromRng({ next: Math.random }, 4));
export const breedFish = (a, b) => childFish(a, b, seedFromRng({ next: Math.random }, 4));
export function batch(n, cladeFilter) { const out = []; while (out.length < n) { try { out.push(randomFish(cladeFilter)); } catch (e) { /* keep going */ } } return out; }
export { CLADE_IDS, CLADES, peekClade, cleanSeed, randomSeed };
