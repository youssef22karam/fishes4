/* IchthyoGen procedural genome — AXES, PALETTES and clade-envelope helpers.
   Pure JS (no THREE / DOM) so it runs in the app and under Node for verification.
   A "clade" is ONLY a region of this trait space (per-axis ranges + allowed option lists).
   There are no species lists, presets or stored models. Clade tables live in cladedata.js. */
import { CLADE_TABLE, GEN_R, GEN_D } from './cladedata.js';

/* ── continuous axes: key -> { g: latent group (correlated sampling), int?: integer valued } ── */
export const AX = {
  length: { g: null },
  fineness: { g: 'slim' }, width: { g: null }, peakU: { g: null }, snoutDepth: { g: null }, pedDepth: { g: 'slim', inv: 1 },
  pedWidth: { g: null }, tailTaper: { g: 'slim' }, dorsalFrac: { g: null }, curl: { g: null }, posture: { g: null }, hump: { g: null }, keel: { g: null },
  headLen: { g: 'head' }, snoutTaper: { g: 'head' }, forehead: { g: null }, cheek: { g: null }, eyeSize: { g: null }, eyeU: { g: null }, eyeV: { g: null }, eyeFwd: { g: null },
  gape: { g: 'head' }, jawRatio: { g: null }, lips: { g: null }, teethCount: { g: null, int: 1 }, barbels: { g: null, int: 1 }, barbelLen: { g: null }, specialLen: { g: null }, specialWid: { g: null },
  dStart: { g: null }, dSpan: { g: null }, dHeight: { g: 'fin' }, dSweep: { g: null }, d2Gap: { g: null }, d2Span: { g: null }, d2Height: { g: 'fin' },
  aStart: { g: null }, aSpan: { g: null }, aHeight: { g: 'fin' },
  pecU: { g: null }, pecV: { g: null }, pecLen: { g: 'fin' }, pecBase: { g: null }, pelLen: { g: 'fin' },
  cauLen: { g: null }, cauAspect: { g: 'slim' },
  hue: { g: null }, sat: { g: null }, lit: { g: null }, shade: { g: null }, bellyLit: { g: null }, accentDH: { g: null }, accentSat: { g: null },
  iri: { g: null }, gloss: { g: null }, scaleSize: { g: null }, patScale: { g: null }, patDens: { g: null }, photophores: { g: null, int: 1 },
};
export const AX_KEYS = Object.keys(AX);

/* ── discrete axes (option universe is the union over clades; each clade lists its own allowed subset) ── */
export const DISC_KEYS = ['profile', 'cross', 'mouth', 'teeth', 'special', 'dN', 'dShape', 'd2Shape', 'aShape', 'pShape', 'pelPos', 'pelShape', 'cType', 'caudal', 'pelvic', 'anal', 'scale', 'pattern', 'palette', 'eyeSide'];

/* ── natural palettes: hue bands [deg], saturation, lightness of the dorsal base colour, eye colours ── */
export const PALETTES = {
  silver:   { h: [[195, 225]], s: [.05, .26], l: [.34, .55], eye: [[45, .5, .5], [40, .3, .65], [0, 0, .12]] },
  slate:    { h: [[200, 225]], s: [.08, .2], l: [.24, .38], eye: [[0, 0, .1], [35, .12, .12]] },
  coolgrey: { h: [[190, 235]], s: [.02, .12], l: [.34, .5], eye: [[0, 0, .1], [30, .2, .2]] },
  olive:    { h: [[60, 110]], s: [.2, .42], l: [.24, .4], eye: [[40, .6, .5], [30, .8, .45]] },
  brown:    { h: [[18, 45]], s: [.25, .5], l: [.2, .38], eye: [[40, .6, .5], [0, 0, .1]] },
  mud:      { h: [[25, 42]], s: [.14, .3], l: [.18, .3], eye: [[0, 0, .1], [35, .3, .3]] },
  sand:     { h: [[34, 56]], s: [.2, .4], l: [.38, .54], eye: [[40, .7, .5], [30, .5, .4]] },
  gold:     { h: [[34, 50]], s: [.55, .8], l: [.42, .54], eye: [[30, .9, .5], [0, .7, .4]] },
  orange:   { h: [[10, 36]], s: [.62, .85], l: [.44, .54], eye: [[0, 0, .1], [45, .8, .5]] },
  yellow:   { h: [[48, 58]], s: [.66, .85], l: [.5, .58], eye: [[0, 0, .1], [30, .8, .5]] },
  blue:     { h: [[200, 225]], s: [.55, .8], l: [.36, .5], eye: [[0, 0, .1], [50, .8, .5]] },
  green:    { h: [[95, 150]], s: [.3, .5], l: [.33, .45], eye: [[0, .7, .4], [30, .8, .5]] },
  red:      { h: [[0, 12]], s: [.55, .75], l: [.38, .5], eye: [[0, 0, .1], [45, .8, .5]] },
  blackdeep: { h: [[210, 260]], s: [.1, .3], l: [.05, .14], eye: [[140, .6, .4], [190, .7, .4]] },
  reddeep:  { h: [[0, 10]], s: [.5, .7], l: [.14, .26], eye: [[0, 0, .08], [190, .6, .4]] },
  silverdeep: { h: [[200, 230]], s: [.08, .2], l: [.42, .58], eye: [[0, 0, .1], [190, .5, .4]] },
  rose:     { h: [[5, 22]], s: [.3, .48], l: [.52, .62], eye: [[0, 0, .1], [30, .5, .4]] },
};
export const PATTERNS = ['none', 'stripes', 'bars', 'spots', 'reticulate', 'saddles', 'mottle', 'disruptive', 'eyespot'];
export const SIZE_BANDS = { tiny: [0, .08], small: [.08, .3], medium: [.3, 1], large: [1, 3], giant: [3, 99] };

/* ── clade registry & merged envelopes ── */
export const CLADES = {};
for (const c of CLADE_TABLE) CLADES[c.id] = c;
export const CLADE_IDS = CLADE_TABLE.map(c => c.id);

const cache = {};
/** Envelope for (clade, lineage): merged ranges + option lists. */
export function envelope(cladeId, lineage) {
  const key = cladeId + '/' + lineage;
  if (cache[key]) return cache[key];
  const c = CLADES[cladeId]; if (!c) throw new Error('unknown clade ' + cladeId);
  const lin = c.lin.find(l => l.e === lineage); if (!lin) throw new Error('unknown lineage ' + lineage + ' in ' + cladeId);
  const r = {}, d = {};
  for (const k of AX_KEYS) r[k] = (lin.r && lin.r[k]) || (c.r && c.r[k]) || GEN_R[k];
  r.length = (lin.r && lin.r.length) || c.sizes || GEN_R.length;
  for (const k of DISC_KEYS) d[k] = ((lin.d && lin.d[k]) || (c.d && c.d[k]) || GEN_D[k]).map(o => (Array.isArray(o) ? o : [o, 1]));
  return (cache[key] = { clade: cladeId, lineage, hab: lin.h, r, d, deep: !!c.deep, sizes: lin.sizes || c.sizes, flat: !!c.flat, curl: !!c.curl });
}
export const optionValues = (env, k) => env.d[k].map(o => o[0]);

/** Union envelope stats used for the combinatorics report. */
export function combinatorics(levels = 8) {
  const globalR = {}, globalD = {};
  for (const k of AX_KEYS) globalR[k] = [Infinity, -Infinity];
  for (const k of DISC_KEYS) globalD[k] = new Set();
  const perClade = [];
  for (const c of CLADE_TABLE) for (const lin of c.lin) {
    const env = envelope(c.id, lin.e);
    for (const k of AX_KEYS) { globalR[k][0] = Math.min(globalR[k][0], env.r[k][0]); globalR[k][1] = Math.max(globalR[k][1], env.r[k][1]); }
    for (const k of DISC_KEYS) env.d[k].forEach(o => globalD[k].add(String(o[0])));
  }
  let logUnion = 0, logEnv = [];
  for (const k of AX_KEYS) logUnion += Math.log10(levels);
  for (const k of DISC_KEYS) logUnion += Math.log10(Math.max(1, globalD[k].size));
  for (const c of CLADE_TABLE) for (const lin of c.lin) {
    const env = envelope(c.id, lin.e); let lg = 0;
    for (const k of AX_KEYS) { const gw = Math.max(1e-9, globalR[k][1] - globalR[k][0]), w = env.r[k][1] - env.r[k][0]; lg += Math.log10(w <= 1e-9 ? 1 : Math.max(2, Math.round(levels * w / gw))); }
    for (const k of DISC_KEYS) lg += Math.log10(Math.max(1, env.d[k].length));
    perClade.push({ clade: c.id, lineage: lin.e, log10: lg }); logEnv.push(lg);
  }
  const sumEnv = Math.log10(logEnv.reduce((s, x) => s + Math.pow(10, x - 20), 0)) + 20;
  return { levels, contAxes: AX_KEYS.length, discAxes: DISC_KEYS.length, discSizes: Object.fromEntries(DISC_KEYS.map(k => [k, globalD[k].size])), logUnion, logEnvelopeSum: sumEnv, perClade };
}
