/* IchthyoGen procedural genome — seeded trait vectors.
   seed string -> RNG -> clade -> trait vector (sampled strictly inside the clade envelope).
   Pure JS; validation and engine wiring live in validate.js / mapping.js / procgen.js. */
import { AX, AX_KEYS, DISC_KEYS, PALETTES, CLADES, CLADE_IDS, envelope, SIZE_BANDS } from './clades.js';
import { eyeBand } from './eyeband.js';

/* ── deterministic PRNG (same construction as the engine's RNG: cyrb128 → sfc32) ── */
export function cyrb128(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067); h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213); h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067); h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213); h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}
export function makeRng(str) {
  let [a, b, c, d] = cyrb128(String(str));
  const f = () => { a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; let t = (a + b) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21 | c >>> 11); d = (d + 1) | 0; t = (t + d) | 0; c = (c + t) | 0; return (t >>> 0) / 4294967296; };
  for (let i = 0; i < 12; i++) f();
  return { next: f, range: (lo, hi) => lo + (hi - lo) * f(), chance: p => f() < p, gauss() { let u = 0, v = 0; while (u === 0) u = f(); while (v === 0) v = f(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); } };
}
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const hashHex = s => cyrb128(s).map(x => x.toString(16).padStart(8, '0')).join('');

/* ── seeds: short, shareable, upper-case alphanumerics ── */
const ALPHA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export function seedFromRng(rng, n = 8) { let s = ''; for (let i = 0; i < n; i++) s += ALPHA[Math.floor(rng.next() * 32)]; return s; }
export const randomSeed = () => seedFromRng({ next: Math.random });
export const cleanSeed = s => String(s || '').toUpperCase().replace(/[^0-9A-Z~^().]/g, '');

/* ── weighted choice over [value, weight] lists ── */
export function pickW(rng, list) { let tot = 0; for (const o of list) tot += o[1]; let r = rng.next() * tot; for (const o of list) { r -= o[1]; if (r <= 0) return o[0]; } return list[list.length - 1][0]; }

/** Which clade (and lineage) does a root seed naturally belong to? Cheap: used by the clade selector. */
export function peekClade(seed) {
  const rng = makeRng(seed + ':clade');
  const cl = CLADES[pickW(rng, CLADE_IDS.map(i => [i, CLADES[i].w]))];
  return { clade: cl.id, lineage: pickW(rng, cl.lin.map(l => [l.e, l.w])) };
}

const bandOverlap = (cls, lo, hi) => { const b = SIZE_BANDS[cls]; const a = Math.max(lo, b[0], 1e-3), z = Math.min(hi, b[1]); return z > a ? Math.log(z / a) : 0; };
export const sizeClassOf = L => (L < .08 ? 'tiny' : L < .3 ? 'small' : L < 1 ? 'medium' : L < 3 ? 'large' : 'giant');

/** Sample a fresh trait vector inside the (clade, lineage) envelope. */
export function sampleTraits(rng, cladeId, lineage) {
  const env = envelope(cladeId, lineage), t = { clade: cladeId, lineage, habitat: env.hab };
  for (const k of DISC_KEYS) t[k] = pickW(rng, env.d[k]);
  const lat = { slim: rng.next(), head: rng.next(), fin: rng.next() };
  for (const k of AX_KEYS) {
    if (k === 'length' || k === 'hue' || k === 'sat' || k === 'lit') continue;
    const [lo, hi] = env.r[k], ax = AX[k];
    if (hi <= lo) { t[k] = lo; continue; }
    const u = rng.next(), q = ax.g ? .45 * (ax.inv ? 1 - lat[ax.g] : lat[ax.g]) + .55 * u : u;
    t[k] = ax.int ? Math.round(lo + (hi - lo) * q) : lo + (hi - lo) * q;
  }
  /* adult size: choose a size class overlapping the clade range, then a log-uniform length inside it */
  const [lo, hi] = env.r.length, cls = Object.keys(SIZE_BANDS).map(c => [c, bandOverlap(c, lo, hi)]).filter(o => o[1] > 0);
  t.sizeClass = pickW(rng, cls);
  const b = SIZE_BANDS[t.sizeClass], a0 = Math.max(lo, b[0], 1e-3), a1 = Math.min(hi, b[1]);
  t.length = a0 * Math.pow(a1 / a0, rng.next());
  /* colour: family palette -> hue band, saturation, lightness */
  const P = PALETTES[t.palette], band = P.h[Math.floor(rng.next() * P.h.length)];
  t.hue = rng.range(band[0], band[1]); t.sat = rng.range(P.s[0], P.s[1]); t.lit = rng.range(P.l[0], P.l[1]);
  t.eyeIdx = Math.floor(rng.next() * P.eye.length); t.glowH = Math.round(rng.range(165, 205));
  /* round 6H.2: the eye-position envelope is DERIVED from the shared feasible band (eyeband.js), not a fixed window. A draw that overshoots the band of
     its OWN head (long heads: gill front, eye radius and seating allowance all scale with h) is REFLECTED back inside it (never clamped onto the edge, so
     draws spread over the band); draws already inside the band are untouched — lineages whose envelope fits their band sample exactly as before. */
  { const b = eyeBandOf(t); if (b && t.eyeU > b.seat) { const r = b.seat - (t.eyeU - b.seat); t.eyeU = clamp(r, b.lo, b.seat); } }
  return settle(t, env, rng);
}
/** the feasible eye band for this trait vector's own head (null when eyeless / no head) */
function eyeBandOf(t) { return t.eyeSide && t.eyeSide !== 'none' && t.headLen > 0 ? eyeBand(t.headLen, t.eyeSize, t.eyeSide) : null; }

/** Force derived consistency (never leaves the envelope; only tidies dependent axes). */
export function settle(t, env, rng) {
  for (const k of AX_KEYS) if (AX[k].int) t[k] = Math.round(t[k]);
  if (t.teeth === 'none' || t.mouth === 'tube') { if (env.d.teeth.some(o => o[0] === 'none') || t.mouth === 'tube') t.teeth = 'none'; }
  if (t.teeth === 'none') t.teethCount = 0;
  else if (t.teethCount < 1) t.teethCount = Math.max(1, env.r.teethCount[1] ? Math.min(env.r.teethCount[1], 4) : 4);
  if (!env.deep) t.photophores = 0;
  { const b = eyeBandOf(t); if (b) t.eyeU = clamp(t.eyeU, b.lo, b.seat); }   /* round 6H.2: idempotent — mutation / breeding stay inside the same band */
  if (t.special !== 'none' && t.special !== 'hammer' && t.special !== 'esca') t.special = 'none';
  return t;
}

/** Clamp EVERY axis into the clade envelope (called after sampling, mutation and breeding). */
export function clampTraits(t, env, rng) {
  t.clade = env.clade; t.lineage = env.lineage; t.habitat = env.hab;
  for (const k of AX_KEYS) {
    if (k === 'hue' || k === 'sat' || k === 'lit') continue;
    const [lo, hi] = env.r[k]; t[k] = clamp(Number.isFinite(t[k]) ? t[k] : lo, lo, hi);
  }
  for (const k of DISC_KEYS) { const opts = env.d[k].map(o => o[0]); if (!opts.includes(t[k])) t[k] = pickW(rng || { next: () => 0 }, env.d[k]); }
  if (!PALETTES[t.palette]) t.palette = env.d.palette[0][0];
  const P = PALETTES[t.palette];
  let best = P.h[0], bd = 1e9; for (const b of P.h) { const d = t.hue < b[0] ? b[0] - t.hue : t.hue > b[1] ? t.hue - b[1] : 0; if (d < bd) { bd = d; best = b; } }
  t.hue = clamp(t.hue, best[0], best[1]); t.sat = clamp(t.sat, P.s[0], P.s[1]); t.lit = clamp(t.lit, P.l[0], P.l[1]);
  t.eyeIdx = Math.min(P.eye.length - 1, Math.max(0, t.eyeIdx | 0));
  const [llo, lhi] = env.r.length; t.length = clamp(t.length, llo, lhi); t.sizeClass = sizeClassOf(t.length);
  if (!Object.keys(SIZE_BANDS).includes(t.sizeClass)) t.sizeClass = 'medium';
  return settle(t, env, rng);
}

/** Small bounded mutation: Gaussian nudges (σ = strength × envelope width) then clamp to the clade range. */
export function mutateTraits(t, rng, strength = .12) {
  const env = envelope(t.clade, t.lineage), c = { ...t };
  for (const k of AX_KEYS) {
    if (k === 'hue' || k === 'sat' || k === 'lit') continue;
    const [lo, hi] = env.r[k]; if (hi <= lo || !rng.chance(.38)) continue;
    c[k] = clamp(c[k] + rng.gauss() * strength * (hi - lo), lo, hi);
  }
  const P = PALETTES[c.palette];
  if (rng.chance(.5)) { const b = P.h[0]; c.hue = clamp(c.hue + rng.gauss() * strength * (b[1] - b[0]), b[0], b[1]); }
  if (rng.chance(.5)) c.sat = clamp(c.sat + rng.gauss() * strength * (P.s[1] - P.s[0]), P.s[0], P.s[1]);
  if (rng.chance(.5)) c.lit = clamp(c.lit + rng.gauss() * strength * (P.l[1] - P.l[0]), P.l[0], P.l[1]);
  c.length = clamp(c.length * Math.exp(rng.gauss() * strength * .5), env.r.length[0], env.r.length[1]);
  for (const k of DISC_KEYS) if (env.d[k].length > 1 && rng.chance(.07)) c[k] = pickW(rng, env.d[k]);
  return clampTraits(c, env, rng);
}

/** Crossover of two genomes: the child takes one parent's clade/lineage; every axis is inherited
    from either parent (or blended) and then clamped into the CHILD's clade envelope. */
export function breedTraits(a, b, rng) {
  const host = rng.chance(.5) ? a : b, other = host === a ? b : a, env = envelope(host.clade, host.lineage), c = { ...host };
  for (const k of AX_KEYS) {
    if (k === 'hue' || k === 'sat' || k === 'lit') continue;
    const r = rng.next();
    c[k] = r < .4 ? host[k] : r < .7 ? other[k] : (host[k] + other[k]) / 2;
  }
  for (const k of DISC_KEYS) if (k !== 'palette' && rng.chance(.5)) c[k] = other[k];
  c.length = Math.sqrt(host.length * other.length);
  if (rng.chance(.35)) { c.palette = other.palette; c.hue = other.hue; c.sat = other.sat; c.lit = other.lit; c.eyeIdx = other.eyeIdx; }
  return clampTraits(c, env, rng);
}

/* ── identity & distance ── */
export function genomeHash(t) {
  const parts = [t.clade, t.lineage];
  for (const k of DISC_KEYS) parts.push(String(t[k]));
  for (const k of AX_KEYS) parts.push(k === 'length' ? t[k].toFixed(5) : Number(t[k]).toFixed(4));
  parts.push(t.eyeIdx, t.glowH);
  return hashHex(parts.join('|'));
}
let GW = null;
function globalWidths() {
  if (GW) return GW; GW = {};
  for (const k of AX_KEYS) GW[k] = [Infinity, -Infinity];
  for (const id of CLADE_IDS) for (const l of CLADES[id].lin) { const e = envelope(id, l.e); for (const k of AX_KEYS) { GW[k][0] = Math.min(GW[k][0], e.r[k][0]); GW[k][1] = Math.max(GW[k][1], e.r[k][1]); } }
  for (const k of AX_KEYS) GW[k] = Math.max(1e-6, GW[k][1] - GW[k][0]);
  return GW;
}
/** Normalised trait distance in [0,1]: mean over axes of |Δ|/global-range (continuous) or mismatch (discrete). */
export function traitDistance(a, b) {
  const w = globalWidths(); let s = 0, n = 0;
  for (const k of AX_KEYS) { s += Math.min(1, Math.abs(a[k] - b[k]) / w[k]); n++; }
  for (const k of DISC_KEYS) { s += a[k] === b[k] ? 0 : 1; n++; }
  s += a.lineage === b.lineage ? 0 : 1; n++;
  return s / n;
}
