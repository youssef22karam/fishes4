/* HYPER GENOME — seeded, parameter-driven extension of the engine genome.
 *
 *   master seed ──hash──> sub-seeds (body, head, mouth, eye, gill, each fin, scales, 11 pattern layers, wear)
 *   engine genome `g` ──> trait vector ──> soft archetype weights (9 ecomorphs, NOT species) ──> blended trait sample
 *   sub-seeded RNG streams draw the per-subsystem parameters, the constraint rules couple them, validateHyper() rejects + re-rolls.
 *
 * Nothing here hard-codes a fish. Every number is a mean/spread or a range. Same (seed, g) always gives the same result,
 * and re-seeding ONE subsystem (opts.sub = { gill: 'x' }) changes only that subsystem's parameters. */

/* ───────────── hashing / RNG ───────────── */
export function cyrb128(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) { k = str.charCodeAt(i); h1 = h2 ^ Math.imul(h1 ^ k, 597399067); h2 = h3 ^ Math.imul(h2 ^ k, 2869860233); h3 = h4 ^ Math.imul(h3 ^ k, 951274213); h4 = h1 ^ Math.imul(h4 ^ k, 2716044179); }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067); h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233); h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213); h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}
/** independent sub-seed per subsystem: hash(master + '/' + name) */
export const sub = (seed, name) => cyrb128(String(seed) + '/' + name)[0];
export class R {   // sfc32
  constructor(seed) { const h = cyrb128(String(seed)); this.a = h[0]; this.b = h[1]; this.c = h[2]; this.d = h[3]; for (let i = 0; i < 12; i++) this.next(); }
  next() { this.a >>>= 0; this.b >>>= 0; this.c >>>= 0; this.d >>>= 0; let t = (this.a + this.b) | 0; this.a = this.b ^ (this.b >>> 9); this.b = (this.c + (this.c << 3)) | 0; this.c = (this.c << 21) | (this.c >>> 11); this.d = (this.d + 1) | 0; t = (t + this.d) | 0; this.c = (this.c + t) | 0; return (t >>> 0) / 4294967296; }
  range(a, b) { return a + (b - a) * this.next(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  chance(p) { return this.next() < p; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  gauss() { let u = 0, v = 0; while (!u) u = this.next(); while (!v) v = this.next(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2831853 * v); }
  /** weighted pick, w = array of weights */
  wpick(items, w) { let s = 0; for (const x of w) s += x; let r = this.next() * s; for (let i = 0; i < items.length; i++) { r -= w[i]; if (r <= 0) return items[i]; } return items[items.length - 1]; }
}
export const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const sst = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* ───────────── 2.2 ecomorph archetypes: mean vectors + spread ─────────────
   trait axes (all 0..1):
   slender  deep  headHeavy  gape  eye  fineScale  rough  armor  spiny  pec  chrome  bold  dark  soft  filament */
export const TRAITS = ['slender', 'deep', 'headHeavy', 'gape', 'eye', 'fineScale', 'rough', 'armor', 'spiny', 'pec', 'chrome', 'bold', 'dark', 'soft', 'filament'];
const A = (id, mean, spread) => ({ id, mean, spread: spread || 0.12 });
//                         sl   de   hh   ga   ey   fs   ro   ar   sp   pe   ch   bo   da   so   fi
export const ARCHETYPES = [
  A('cruiser',   [.80, .12, .20, .30, .30, .92, .02, .05, .10, .25, .95, .10, .10, .05, .10]),
  A('ambush',    [.30, .35, .90, .90, .30, .15, .90, .30, .75, .90, .05, .45, .35, .15, .10]),
  A('reef',      [.15, .92, .20, .20, .45, .35, .15, .10, .35, .45, .20, .90, .10, .05, .15]),
  A('hunter',    [.92, .10, .45, .85, .30, .70, .10, .10, .25, .20, .70, .15, .20, .05, .05]),
  A('forage',    [.70, .25, .15, .10, .85, .88, .02, .02, .05, .20, .90, .10, .05, .10, .05]),
  A('eel',       [1.0, .03, .30, .35, .15, .05, .20, .05, .05, .03, .05, .25, .30, .20, .05]),
  A('flat',      [.20, .55, .55, .50, .35, .30, .70, .20, .40, .85, .05, .55, .25, .15, .10]),
  A('armored',   [.30, .45, .45, .25, .30, .05, .80, .95, .90, .35, .10, .45, .25, .05, .05]),
  A('deepwater', [.45, .30, .70, .90, .90, .25, .20, .05, .25, .25, .10, .05, .95, .90, .90]),
];
export const DOMINANT_NAMES = ARCHETYPES.map(a => a.id);

/** read a trait vector out of the engine genome (soft, 0..1) so archetypes follow what the base generator already built */
export function traitsOfGenome(g) {
  const b = g.body, h = g.head, s = g.skin, m = g.mouth;
  const slender = sst(2.8, 14, b.fineness), deep = 1 - slender;
  const sc = s.scale;
  return [
    slender, deep * clamp(b.width * 1.2, .3, 1), sst(.2, .42, h.lengthFrac), sst(.2, .8, m.gape), sst(.1, .45, h.eyeSize),
    clamp(1 - (s.scaleSize - .3) / 2.5, 0, 1) * (sc === 'bare' || sc === 'denticle' ? .3 : 1), (sc === 'plates' || sc === 'scutes' || sc === 'denticle' ? .6 : 0) + clamp(h.brow, 0, 1) * .3,
    (sc === 'plates' || sc === 'scutes' || sc === 'ganoid' ? .8 : 0) + clamp(b.keel, 0, 1) * .2, clamp((g.fins.dorsal && g.fins.dorsal.spines ? g.fins.dorsal.spines / 14 : 0) + h.brow * .3, 0, 1),
    clamp((g.fins.pectoral && g.fins.pectoral.size ? g.fins.pectoral.size * 3 : .3), 0, 1), clamp(s.iridescence * .7 + (1 - s.base[1]) * .3, 0, 1) * (s.gloss * .5 + .5),
    clamp(s.patternStrength * (s.pattern === 'none' ? .3 : 1), 0, 1), clamp(1 - s.base[2] * 2.2, 0, 1), clamp(s.translucency + (1 - b.width) * .2, 0, 1), clamp((g.head.barbels || 0) / 4 + (g.fins.caudal && g.fins.caudal.type === 'filamentous' ? .5 : 0), 0, 1),
  ];
}

/** soft archetype weights: gaussian affinity to the genome-derived vector, times a seeded log-normal jitter → random blend, no sharp categories */
export function blendWeights(tv, rng) {
  const w = ARCHETYPES.map(a => { let d = 0; for (let i = 0; i < tv.length; i++) d += (tv[i] - a.mean[i]) ** 2; return Math.exp(-d / 2.2) * Math.exp(rng.gauss() * .55); });
  const s = w.reduce((x, y) => x + y, 0); return w.map(x => x / s);
}
export function sampleTraits(weights, rng) {
  const t = new Array(TRAITS.length).fill(0);
  ARCHETYPES.forEach((a, k) => { for (let i = 0; i < t.length; i++) t[i] += weights[k] * (a.mean[i] + rng.gauss() * a.spread); });
  return t.map(x => clamp(x, 0, 1));
}

/* ───────────── palette archetypes (10.1), stored as HSV (deg, s, v) ───────────── */
const PAL = [
  { id: 'silverBlue', hue: [196, 228], s: [.22, .5], v: [.16, .34], iris: [48, .1, .85] },
  { id: 'oliveGold',  hue: [46, 84],   s: [.35, .65], v: [.2, .38], iris: [44, .75, .9] },
  { id: 'greyGreen',  hue: [105, 170], s: [.15, .4], v: [.18, .36], iris: [52, .45, .8] },
  { id: 'rustCream',  hue: [8, 30],    s: [.4, .72], v: [.22, .4], iris: [30, .75, .85] },
  { id: 'redOrange',  hue: [0, 22],    s: [.65, .92], v: [.35, .4], iris: [28, .85, .95] },
  { id: 'yellow',     hue: [46, 58],   s: [.6, .9], v: [.36, .4], iris: [40, .6, .95] },
  { id: 'navyBlack',  hue: [212, 240], s: [.4, .75], v: [.05, .14], iris: [205, .3, .8] },
  { id: 'pinkPearl',  hue: [335, 356], s: [.3, .55], v: [.3, .4], iris: [20, .4, .95] },
  { id: 'reef',       hue: [0, 360],   s: [.65, .95], v: [.3, .4], iris: [35, .8, .95] },
];
const hsv2rgb = (h, s, v) => { h = ((h % 360) + 360) % 360 / 60; const c = v * s, x = c * (1 - Math.abs(h % 2 - 1)), m = v - c; const [r, g, b] = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x]; return [r + m, g + m, b + m]; };
const hslToHue = (hsl) => hsl[0];
const hueMix = (a, b, t) => { let d = ((b - a + 540) % 360) - 180; return (a + d * t + 360) % 360; };
const hueDist = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

function makePalette(g, T, rng, wear) {
  const [slender, deep, hh, ga, ey, fs, ro, ar, sp, pe, ch, bo, da, so, fi] = T;
  const baseHue = hslToHue(g.skin.base);
  // palette affinity: genome hue proximity × trait coupling → coherent, never random garbage
  const aff = PAL.map(p => {
    const mid = p.id === 'reef' ? baseHue : (p.hue[0] + p.hue[1]) / 2;
    let a = Math.exp(-Math.pow(hueDist(mid, baseHue) / 70, 2));
    if (p.id === 'silverBlue') a *= .4 + ch * 1.4; if (p.id === 'rustCream') a *= .4 + ro * 1.2; if (p.id === 'navyBlack') a *= .3 + da * 1.6;
    if (p.id === 'reef') a *= .2 + bo * 1.6 * deep; if (p.id === 'oliveGold') a *= .5 + fs * .6; if (p.id === 'redOrange') a *= .3 + bo * .8 + da * .3;
    return a * Math.exp(rng.gauss() * .3);
  });
  const pal = rng.wpick(PAL, aff);
  const backHue = hueMix(rng.range(pal.hue[0], pal.hue[1]), baseHue, pal.id === 'reef' ? 1 : .35);
  let backS = rng.range(pal.s[0], pal.s[1]), backV = rng.range(pal.v[0], pal.v[1]);
  backV = clamp(backV * (1 - da * .35 + ch * .1), .05, .4);           // back darkness 0.05–0.4 value
  const bellyV = rng.range(.8, 1.0), bellyS = clamp(.02 + rng.range(0, .14) * (1 - ch) + (pal.id === 'yellow' ? .2 : 0) + (pal.id === 'pinkPearl' ? .12 : 0), 0, .4);
  const bellyHue = pal.id === 'rustCream' ? 38 : hueMix(backHue, rng.pick([42, 30, 200, backHue]), .35);
  const flankHue = hueMix(backHue, bellyHue, .35), flankS = clamp(backS * .6, 0, 1), flankV = lerp(backV, bellyV, .55);
  // fin / tail colours derive from the body palette with a hue shift (translucent grey, yellow, olive, red, dark)
  const warm = pal.id === 'redOrange' || pal.id === 'reef' || pal.id === 'rustCream' || pal.id === 'yellow' || pal.id === 'pinkPearl';
  const finKind = rng.wpick(['clear', 'smoky', 'yellow', 'olive', 'red', 'dark'], [3, 2, .3 + (pal.id === 'oliveGold' || pal.id === 'yellow') * 2 + (pal.id === 'silverBlue') * .4, .6 + (pal.id === 'greyGreen') * 1.2, warm ? .5 + bo : .04, .5 + da]);
  const fh = { clear: backHue, smoky: backHue, yellow: 50, olive: 70, red: 8, dark: backHue }[finKind];
  const fs_ = { clear: .08, smoky: .12, yellow: .65, olive: .5, red: .8, dark: .4 }[finKind], fv = { clear: .7, smoky: .42, yellow: .85, olive: .5, red: .65, dark: .16 }[finKind];
  const tailKind = rng.chance(.6) ? finKind : rng.wpick(['clear', 'smoky', 'yellow', 'olive', 'dark'], [1, 2, .5 + (pal.id === 'silverBlue') * .5, .5, .5 + da]);
  const th = { clear: backHue, smoky: backHue, yellow: 52, olive: 68, red: 8, dark: backHue }[tailKind];
  const ts = { clear: .08, smoky: .12, yellow: .65, olive: .5, red: .8, dark: .4 }[tailKind], tv = { clear: .7, smoky: .42, yellow: .85, olive: .5, red: .65, dark: .16 }[tailKind];
  const old = wear.age === 'old' ? .75 : wear.age === 'juvenile' ? 1.15 : 1, juv = wear.age === 'juvenile' ? 1.12 : wear.age === 'old' ? .8 : 1;
  const rgb = (h, s, v) => hsv2rgb(h, clamp(s * juv, 0, 1), clamp(v * old, 0, 1));
  const irisKind = rng.wpick(['gold', 'silver', 'brown', 'amber', 'copper', 'paleBlue', 'red'], [3, 3 + ch * 2, 1.5, 1.5, 1, .5 + da * .8, .4 + bo * .5]);
  const IRIS = { gold: [46, .8, .95], silver: [200, .06, .9], brown: [26, .7, .5], amber: [36, .9, .8], copper: [18, .75, .75], paleBlue: [196, .45, .9], red: [4, .8, .8] }[irisKind];
  return {
    id: pal.id, finKind, tailKind, irisKind,
    back: rgb(backHue, backS, backV), flank: rgb(flankHue, flankS, flankV), belly: rgb(bellyHue, bellyS, bellyV),
    fin: rgb(fh, fs_, fv), tail: rgb(th, ts, tv), iris: rgb(IRIS[0], IRIS[1], IRIS[2]), irisHue: IRIS[0],
    accent: rgb(hueMix(backHue, rng.pick([32, 52, 12, 190, 285]), pal.id === 'reef' ? .9 : .5), clamp(.5 + bo * .4, 0, 1), clamp(.45 + bo * .35, 0, 1)),
    cream: rgb(38, .22, .9), dark: rgb(backHue, .35, .05 + .04 * rng.next()),
    demarcation: rng.range(.25, .95),     // 0 soft back/flank line → 1 sharp
    backV, bellyV,
  };
}

/* ───────────── master builder ───────────── */
export const HYPER_VERSION = 1;

/** Build the full hyper parameter block for one fish. g = engine genome. opts: { sub: {gill:'seedstr'}, wear, open } */
export function makeHyper(g, seedIn, opts = {}) {
  const master = String(seedIn != null ? seedIn : (g.meta && (g.meta.surfaceSeed || g.meta.seed)) || 'fish');
  let H = null, tries = 0, issues = [];
  for (; tries < 10; tries++) {
    const seed = tries ? master + '#r' + tries : master;                    // re-roll = deterministic salted retry
    H = buildOnce(g, seed, master, opts); issues = validateHyper(H, g);
    if (!issues.length) break;
  }
  H.rerolls = tries; H.issues = issues; H.master = master;
  return H;
}

function buildOnce(g, seed, master, opts) {
  const S = n => (opts.sub && opts.sub[n] != null) ? String(opts.sub[n]) : sub(seed, n);   // sub-seed per subsystem (overridable)
  const seeds = {}; for (const n of ['body', 'head', 'mouth', 'eye', 'gill', 'oper', 'dorsal', 'dorsal2', 'anal', 'pectoral', 'pelvic', 'caudal', 'scales', 'wear', 'lateral', 'palette', 'archetype'].concat(Array.from({ length: 12 }, (_, i) => 'pat' + i))) seeds[n] = S(n);
  const rngOf = n => new R(seeds[n]);
  const tv = traitsOfGenome(g);
  const rA = rngOf('archetype'), weights = blendWeights(tv, rA), T = sampleTraits(weights, rA);
  const [slender, deep, hh, ga, ey, fs, ro, ar, sp, pe, ch, bo, da, so, fi] = T;
  const dom = DOMINANT_NAMES[weights.indexOf(Math.max(...weights))];
  const bottom = clamp((ro + hh + ga) / 3 + (pe - .4) * .3, 0, 1);            // bottom-ambush-ness
  const cruiser = clamp(ch * .6 + slender * .4 + fs * .2 - ro * .3, 0, 1);    // open-water-cruiser-ness

  /* wear / age */
  const rW = rngOf('wear');
  const age = rW.wpick(['juvenile', 'adult', 'old'], [.18, .6, .22]);
  const wear = { age, amount: clamp((opts.wear != null ? opts.wear : rW.range(.1, .25)) + (age === 'old' ? .25 : age === 'juvenile' ? -.08 : 0), 0, 1),
    scaleLoss: rW.range(0, .03), scars: rW.int(0, 5), parasites: rW.int(0, 6), tornFin: rW.range(0, .3), algae: rW.range(0, .35) * (age === 'old' ? 1.4 : 1), bruise: rW.range(0, .2), mucus: rW.range(.2, 1) };
  const pal = makePalette(g, T, rngOf('palette'), wear);

  /* ── operculum (7.1) ── */
  const rO = rngOf('oper');
  const variant = rO.wpick(['chrome', 'reticulate', 'rust', 'plain'], [.1 + ch * 3 + (pal.id === 'silverBlue') * 1.5, .15 + ch * .6 + (pal.id === 'oliveGold' || pal.id === 'yellow') * 1.2, .08 + ro * 3 + ar + (pal.id === 'rustCream') * 1.5, .3 * (1.2 - ch)]);
  const oper = {
    variant,
    height: clamp(.82 + (hh - .4) * .3 + rO.gauss() * .06, .6, 1.05),                      // fraction of the cover region height
    tipSharp: clamp(.45 + slender * .4 + rO.gauss() * .12 + (variant === 'rust' ? -.15 : 0), 0, 1),
    rearCurve: rO.range(-.25, .6), edge: rO.wpick(['smooth', 'wavy', 'serrated', 'spined'], [3, 1, .5 + ro, .3 + sp * 3]),
    thickness: rO.range(.005, .02), spinesCentral: variant === 'rust' || sp > .55 ? rO.int(1, 3) : rO.chance(sp * .5) ? 1 : 0, cheekSpines: Math.round(clamp(sp * 10 * rO.range(.3, 1), 0, 10)),
    flap: rO.range(.15, 1), flapSpot: rO.chance(.25 + da * .2), flapDarkEdge: rO.chance(.3),
    striae: rO.range(40, 140), crinkle: variant === 'chrome' ? rO.range(.5, 1) : rO.range(.15, .6), cracks: rO.range(0, .4) * (age === 'old' ? 2 : 1),
    open: opts.open != null ? opts.open : rO.range(.04, .16), breathHz: rO.range(.5, 2), breathDeg: rO.range(3, 12),   /* R3: rest = nearly flush (1.4-5.6 deg), breathing 3-12 deg */
    ridgeCount: rO.int(4, 9),
  };
  /* ── gill chamber (7.2) ── */
  const rG = rngOf('gill');
  const stress = rG.range(0, 1) < .12 ? 1 : 0, small = clamp(1 - Math.log10(Math.max(g.body.length, .03) / .03) / 2.3, 0, 1);
  const gill = {
    arches: rG.int(3, 4), filaments: Math.round(rG.range(80, 250)), rakers: Math.round(rG.range(8, 40) * (.6 + fs * .6)),
    rakerLen: rG.range(.25, 1), filLen: rG.range(.7, 1.15), hue: rG.range(-10, 5), sat: rG.range(.7, .95) * (1 - .25 * stress), val: rG.range(.55, .95), pale: clamp(stress * .5 + small * .2 + rG.range(0, .15), 0, .7),
    cavity: rG.pick(['darkRed', 'darkRed', 'blackRed', 'pinkRed']), pseudo: rG.int(10, 22), lamellae: rG.range(.5, 1), archPale: rG.range(.7, 1),
    sway: rG.range(.4, 1),
  };
  /* ── eye (6) ── */
  const rE = rngOf('eye');
  const patPick = [['stripe', .6 + bottom * .0 + cruiser * .3], ['bar', .5 + deep * .5 + bo * .4], ['rays', .25 + bo * .5], ['ring', .5 + bo * .4], ['brow', .25], ['postPatch', .3 + da * .3], ['mottle', ro * 1.2], ['vermic', ro * .5 + bo * .2]];
  const eyePats = []; { const pool = patPick.slice(); const n = rE.int(0, 3); for (let i = 0; i < n && pool.length; i++) { const it = rE.wpick(pool, pool.map(p => p[1])); eyePats.push(it[0]); pool.splice(pool.indexOf(it), 1); } }
  const eye = {
    diameter: clamp(.12 + ey * .23 + rE.gauss() * .015, .12, .35), irisFibers: rE.int(80, 200), pupil: rE.pick(['round', 'round', 'oval', 'teardrop']), aphakic: rE.chance(.35),
    rim: rE.range(.02, .1), browSpines: rE.int(0, ro > .5 ? 6 : 2), tentacles: rE.int(0, ro > .6 ? 3 : 1), adipose: rE.chance(.35 + cruiser * .3) ? rE.range(.1, .6) : 0, bulge: rE.range(0, .3),
    patterns: eyePats, ringHue: rE.pick([46, 52, 20, 4]), radialLines: rE.int(4, 12), wet: rE.range(.7, 1), iris: pal.iris, irisHue: pal.irisHue,
  };
  /* ── head surface (4.2), pores, lips ── */
  const rH = rngOf('head');
  const surface = rH.wpick(['smoothScaled', 'scaled', 'bony', 'armored', 'fleshy'], [2 + cruiser * 2, 1.5 + fs, .3 + ro * 3, .2 + ar * 4 + sp * 2, .2 + so * 2 + (dom === 'deepwater' ? 2 : 0)]);
  const head = {
    surface, bumpiness: clamp(ro * .8 + (surface === 'bony' ? .3 : 0) + (surface === 'armored' ? .4 : 0), 0, 1), spineRows: { brow: rH.int(0, surface === 'armored' ? 8 : 3), cheek: rH.int(0, surface === 'armored' ? 6 : 2), preop: rH.int(0, surface === 'armored' ? 6 : 2), opercle: oper.cheekSpines > 0 ? Math.min(12, oper.cheekSpines) : 0 },
    spineLen: clamp(rH.range(.005, .02) + sp * .035, .005, .08), spineCurve: rH.range(0, .6), spineBase: rH.range(.4, 1), tassels: Math.round(clamp((surface === 'fleshy' ? rH.range(2, 20) : rH.range(0, 5) * ro), 0, 20)),
    pores: { supra: rH.int(4, 8), infra: rH.int(4, 8), preop: rH.int(5, 9), mandib: rH.int(5, 9), snout: rH.int(2, 5) },
    lipColor: rH.pick(['match', 'pink', 'pale', 'orange', 'darkEdge']), lipThickness: rH.range(0, .03), interior: rH.wpick(['pinkWhite', 'yellow', 'orange', 'red', 'black'], [4, .6, .6, .8, .4 + da * 2]),
    nostrilTube: rH.chance(.5),
  };
  /* ── lateral line (3.3) ── */
  const rL = rngOf('lateral');
  const lateral = { path: rL.wpick(['straight', 'curved', 'arch', 'broken', 'double'], [2, 2.5, 1 + deep * 2, .5, .4]), pores: rL.int(40, 120), raised: rL.chance(.5), tint: rL.range(.1, .4) };
  /* ── scales / skin (9) ── */
  const rS = rngOf('scales');
  const scales = {
    type: g.skin.scale, circuli: rS.int(5, 15), overlap: rS.range(.4, .7), sizeJitter: .15, rotJitter: 10 * Math.PI / 180, hueJitter: rS.range(.02, .06), missing: wear.scaleLoss,
    exposed: clamp(.012 + (1 - fs) * .04 + deep * .01, .01, .06), edgeHi: rS.range(.5, 1), pocket: rS.range(.4, 1), ctenoidTeeth: rS.int(6, 20),
    roughness: clamp(.1 + ro * .3 + (1 - ch) * .08, .08, .45), clearcoat: rS.range(.6, 1), clearcoatRough: rS.range(.03, .12), aniso: rS.range(.2, .7), filmNm: rS.range(200, 500), sheen: clamp(.3 + (1 - da) * .4, 0, 1),
    chromeMirror: ch, myomere: rS.range(.1, .5), diamondGrid: clamp(fs * .4 + (1 - ro) * .4 + rS.range(0, .3), 0, 1),
  };
  /* ── pattern layers (10.2), each independently seeded + enabled by probability ── */
  const pr = [
    ['speckle', .55 + ro * .4], ['tiger', .05 + bo * .3 + (dom === 'reef') * .1], ['bars', .08 + deep * .55 + bo * .25 - cruiser * .1], ['longi', .05 + cruiser * .3 + slender * .25 + bo * .1],
    ['spots', (.12 + bo * .25 + ro * .2) * (1 - cruiser * .85)], ['reticulation', .04 + ro * .25 + bo * .1], ['mottle', .1 + ro * .85 + (dom === 'ambush') * .2], ['saddles', .05 + ro * .35 + deep * .1],
    ['head', .5 + bo * .3], ['fin', .5 + bo * .3 + ro * .2], ['tail', .45 + bo * .3], ['dark', .0],
  ];
  const layers = pr.map(([name, p], i) => {
    const r = rngOf('pat' + i); const on = r.chance(clamp(p, 0, .97)) && g.skin.pattern !== undefined;
    return { name, on, strength: r.range(.25, 1) * (age === 'juvenile' ? 1.2 : age === 'old' ? .75 : 1) * (.5 + .5 * clamp(bo + ro * .5 + .2, 0, 1)), a: r.next(), b: r.next(), c: r.next(), d: r.next(), n: r.next(), hard: r.chance(.5) ? 1 : 0, rot: r.range(-.3, .3) };
  });
  if (cruiser > .6) { layers[6].on = layers[6].on && ro > .4; layers[7].on = false; }      // cruisers: no camouflage saddles
  if (bottom > .55 && !layers[6].on) layers[6].on = true;                                   // ambush ⇒ mottled
  if (deep > .55 && !layers[2].on && !layers[4].on && rngOf('pat2').chance(.5)) layers[2].on = true;
  const patterns = { layers, headStripe: layers[8].on, finBands: Math.round(2 + layers[9].a * 4), tailBands: Math.round(2 + layers[10].a * 4) };
  /* ── fins (8) : per-fin sub seeds drive only look-parameters (geometry is owned by the engine genome) ── */
  const fins = {}; for (const f of ['dorsal', 'dorsal2', 'anal', 'pectoral', 'pelvic', 'caudal']) { const r = rngOf(f); fins[f] = { style: r.wpick(['hyaline', 'darkRays', 'spotted', 'banded', 'darkEdge', 'pale'], [2, 1 + ro, .6 + bo, .8 + bo + ro, 1 + da, .8]), bands: r.int(2, 6), leadDark: r.chance(.3), trailPale: r.chance(.4), baseSpot: r.chance(.2), margin: r.range(0, 1), hyalineTip: r.chance(.4), frayed: wear.tornFin * r.range(.3, 1), vein: r.range(.3, 1), segment: r.range(.01, .03) }; }
  /* ── scutes, keels, plates (3.2) ── */
  const rB = rngOf('body');
  const scutes = { count: Math.round(clamp(ar * 36 + cruiser * 10 * rB.next() + rB.range(0, 6), 0, 40)), keels: cruiser > .5 ? rB.int(1, 3) : ar > .5 ? rB.int(1, 2) : rB.int(0, 1), ridge: rB.range(0, 1) * (ar + ro) * .6, notch: rB.chance(.3), vent: rB.range(.5, 1), pelvicAxillary: rB.chance(.6), axilSpot: rB.chance(.3 + da * .2), napeHump: rB.range(0, 1) * (hh * .6 + deep * .3) };
  /* ── hints on how the existing mouth should be decorated (5): colour, lips, barbels — geometry stays with mouthgeo ── */
  const rM = rngOf('mouth');
  const mouth = { lobes: rM.chance(.5), frenum: rM.chance(.7), commissure: rM.pick(['angled', 'fold', 'patch', 'flap']), papillose: rM.chance(ro * .6), rugae: rM.range(.4, 1), interior: head.interior };
  return { version: HYPER_VERSION, seed, seeds, archetype: { dominant: dom, weights, traits: Object.fromEntries(TRAITS.map((k, i) => [k, +T[i].toFixed(3)])) }, oper, gill, eye, head, lateral, scales, patterns, fins, scutes, wear, palette: pal, mouth, derived: { bottom, cruiser } };
}

/* ───────────── 2.3 / 12 : constraint rules + validation (reject → re-roll) ───────────── */
export const HYPER_RANGES = {   // [path, min, max] — parameter range checks
  'oper.height': [.6, 1.05], 'oper.tipSharp': [0, 1], 'oper.open': [0, 1.6], 'oper.thickness': [.004, .021], 'oper.breathHz': [.5, 2], 'oper.breathDeg': [3, 12],
  'gill.arches': [3, 4], 'gill.filaments': [80, 250], 'gill.rakers': [4, 60], 'gill.sat': [.4, .96], 'eye.diameter': [.12, .35], 'eye.irisFibers': [80, 200], 'eye.bulge': [0, .3],
  'head.spineLen': [.005, .08], 'head.tassels': [0, 20], 'lateral.pores': [40, 120], 'scales.circuli': [5, 15], 'scales.overlap': [.4, .7], 'scales.filmNm': [200, 500],
  'scutes.count': [0, 40], 'wear.amount': [0, 1], 'palette.backV': [.049, .401], 'palette.bellyV': [.79, 1.001],
};
const getP = (o, p) => p.split('.').reduce((a, k) => a && a[k], o);
export function validateHyper(H, g) {
  const out = [];
  for (const p in HYPER_RANGES) { const v = getP(H, p), [a, b] = HYPER_RANGES[p]; if (!(v >= a - 1e-6 && v <= b + 1e-6)) out.push({ code: 'RANGE', path: p, v }); }
  // constraint couplings (anatomically believable combinations)
  if (g) {
    const fin = g.body.fineness;
    if (fin > 9 && H.oper.tipSharp < .3) out.push({ code: 'SLENDER_BLUNT_COVER' });
    if (g.head.eyeSize > .45 && H.eye.diameter < .2) out.push({ code: 'BIG_EYE_MISMATCH' });
    if (H.archetype.traits.chrome > .7 && H.scales.chromeMirror < .6) out.push({ code: 'CHROME_INCOHERENT' });
    if (H.derived.cruiser > .6 && H.scutes.keels === 0 && H.archetype.dominant === 'cruiser') out.push({ code: 'CRUISER_NO_KEELS' });
  }
  if (H.palette.belly.reduce((a, b) => a + b, 0) < H.palette.back.reduce((a, b) => a + b, 0)) out.push({ code: 'COUNTERSHADE_INVERTED' });
  if (H.gill.filaments * H.gill.arches < 200) out.push({ code: 'GILL_SPARSE' });
  return out;
}

/* applying the cross-subsystem anatomical rules to a finished block (idempotent; also callable after manual edits) */
export function applyConstraints(H, g) {
  const t = H.archetype.traits, fin = g ? g.body.fineness : 6;
  if (fin > 8) { H.oper.tipSharp = Math.max(H.oper.tipSharp, .55); H.scutes.keels = Math.max(H.scutes.keels, 1); }
  if (t.chrome > .7) { H.scales.chromeMirror = Math.max(H.scales.chromeMirror, .7); H.scales.roughness = Math.min(H.scales.roughness, .16); }
  if (t.rough > .6) { H.scales.roughness = Math.max(H.scales.roughness, .3); H.patterns.layers[6].on = true; }
  return H;
}
