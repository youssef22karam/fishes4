/* GLOBAL ANATOMY LAWS — every rule here is a function of the generator's own axes only:
   BODY PLAN (anatomy family / plan flags), FEEDING NICHE (functional flags), SWIM MODE, DEPTH/HABITAT (light).
   Nothing is keyed to a named animal. Pure JS: used by the engine rules, the geometry builders and the validator. */

import * as TG from './tailgeo.js';
import { APPENDAGE_CAP, barbelLaw, barbelPlan, barbelLength, repairHead, assertHead, VENTRAL, ventralMouth } from './headlaw.js';
import { eyeBand, EYE_SEAT, EYE_PROTRUSION, EYE_PROTRUSION_MIN, EYE_PROTRUSION_MAX } from './eyeband.js';
export { APPENDAGE_CAP, barbelLaw, barbelPlan, barbelLength, EYE_SEAT, EYE_PROTRUSION, EYE_PROTRUSION_MIN, EYE_PROTRUSION_MAX };
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;

/* ───────────────────────── axes ───────────────────────── */
/** Collapse a genome + engine tables into the four axes. `a` = anatomyProfile(g). */
/** per-fish uniform in [0,1) from the seed (gates the rare 40° gape and 0.32 fin ceiling) */
export function seedUnit(g) { let h = 2166136261; const t = String((g.meta && g.meta.seed) || ''); for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; return ((h >>> 0) % 100000) / 100000; }
export function axesOf(g, a, niche, habitat) {
  const flags = new Set();
  if (niche) { (niche.ff || []).forEach(f => flags.add(f)); (niche.tags || []).forEach(f => flags.add(f)); }
  (g.meta.tags || []).forEach(f => flags.add(f));
  const fam = a.family || 'rayfin';
  const light = habitat && Number.isFinite(habitat.light) ? habitat.light : .8;
  const plan = {
    family: fam,
    flat: fam === 'ray' ? 1 : fam === 'benthicShark' ? .5 : 0,                 /* dorsoventral flattening (0 none … .5 half-form … 1 full disc) */
    cartilaginous: a.gills === 'lateral' || a.gills === 'ventral',              /* heterocercal / whip tail families */
    sideFlat: g.body.roll !== 0,                                                /* side-flattened asymmetric plan */
    headExpanded: g.head.special === 'hammer',                                  /* laterally expanded head plan */
    jawless: fam === 'jawless',
    tubular: fam === 'pipe' || fam === 'upright',
    elongated: fam === 'ribbon' || fam === 'knife' || g.body.fineness > 9,
    perch: fam === 'spiny',                                                     /* stiffened segmented front dorsal section */
    solid: !!a.solid,
    softRayed: fam === 'rayfin' && g.fins.dorsal.spines === 0,
  };
  return { plan, flags, seedU: seedUnit(g), swim: g.swim.mode, light, dark: light < .3, lightless: light <= .02 || flags.has('cave'), nocturnal: flags.has('nocturnal') };
}
const has = (ax, ...f) => f.some(x => ax.flags.has(x));

/* ───────────────────────── 2. EYES ───────────────────────── */
/* the eyeball sphere's radius is EYE_GEO × (genome eye size × head length / 2): bands are stated on the genome unit and as the true measured diameter / head length */
export const EYE_GEO = .69 / .5;
export function eyeLaw(ax) {
  let band, regime;
  if (ax.lightless) { band = [.058, .06]; regime = 'vestigial'; }
  else if (ax.dark || ax.nocturnal) { band = [.10, .145]; regime = 'enlarged'; }
  else if (ax.light >= .8 && has(ax, 'fastSwimmer', 'schooler', 'glider')) { band = [.058, .10]; regime = 'reduced'; }
  else { band = [.06, .14]; regime = 'normal'; }
  /* round 2: the body PLAN sets the envelope and wins over niche / depth. bony plan: diameter 0.08–0.20 × head length (bands above × EYE_GEO);
     cartilaginous plan: 0.05–0.11 × head length, near-flush, lateral */
  if (ax.plan.cartilaginous) { band = [.05 / EYE_GEO, .11 / EYE_GEO]; if (regime === 'vestigial') band = [.05 / EYE_GEO, .06 / EYE_GEO]; }
  const pupil = ax.lightless ? 'round' : (has(ax, 'ambusher', 'lurer') || ax.nocturnal) && ax.light >= .3 ? 'vertical' : has(ax, 'flatBenthic', 'bottomDweller') && ax.light >= .5 ? 'horizontal' : 'round';
  const placement = ax.plan.flat > 0 ? 'dorsal' : ax.plan.sideFlat ? 'oneSide' : ax.plan.headExpanded ? 'lateralExtremity' : 'lateral';
  /* covers are plan/niche features, present or absent cleanly: a clear adipose window at the fast open-water end, a nictitating lower lid on the cartilaginous (non-disc) plan */
  const adipose = !ax.lightless && !ax.plan.cartilaginous && regime === 'reduced' && ax.light >= .8;
  const nictitating = !ax.lightless && ax.plan.cartilaginous && ax.plan.flat < 1;
  /* iris palette set by niche + depth: metallic gold / copper / olive / dark */
  const irisSet = ax.lightless || ax.light < .15 ? ['dark'] : ax.dark ? ['dark', 'copper'] : has(ax, 'ambusher', 'nocturnal', 'lurer') ? ['copper', 'olive'] : regime === 'reduced' ? ['gold'] : ['gold', 'copper', 'olive'];
  const bottomOriented = ax.plan.flat > 0 || has(ax, 'bottomDweller', 'sifter', 'flatBenthic', 'scavenger', 'deepSea', 'crevice');
  const forwardMin = has(ax, 'ambusher', 'lurer') ? .3 : 0;
  return { band, ratioBand: band.map(v => v * EYE_GEO), regime, vestigial: regime === 'vestigial', pupil, pupilId: pupil === 'vertical' ? 1 : pupil === 'horizontal' ? 2 : 0, placement, count: 2, covers: { adipose, nictitating }, irisSet, bottomOriented, forwardMin };
}
/* EYE_SEAT, EYE_PROTRUSION, EYE_PROTRUSION_MIN, EYE_PROTRUSION_MAX imported + re-exported from eyeband.js (single source of truth) */
/** effective dorsal eye station (fraction of local half-depth): lateral default, shifted dorsal for bottom-oriented plans */
export function eyeStation(g, E, ax) {
  if (ax.plan.flat > 0 || ax.plan.sideFlat || ax.plan.headExpanded) return g.head.eyeV;
  if (ax.plan.cartilaginous) return clamp(g.head.eyeV, -.12, .28);   /* mid head height ± 0.15 × head depth */
  return clamp(g.head.eyeV, -.12, .42) + (E.bottomOriented ? .14 : 0);
}

/* ───────────────────────── 1. MOUTHS ───────────────────────── */
export const CAVITY_MAX = .62;     /* interior visible depth / head length — ROUND 7 (WP2) DELIBERATE LAW CHANGE, recorded in docs/round7-report.md:
                                       was .30, which forced a shallow bag that read as a flat red wedge; the oral cavity is now a funnel to a pharynx
                                       cap at 0.45–0.75 × head length, matching the genome schema's own cavityDepth range (0.2–0.85). */
export const DISC_DEPTH_MAX = .10; /* sucker disc depth / head length */
export const TUBE_MAX = .5;        /* tube length / head length */
export const JAW_TYPICAL = [12, 28], JAW_MAX_DEG = 40;
export function mouthLaw(ax) {
  const construction = ax.plan.flat >= 1 ? 'ventral' : ax.plan.jawless || has(ax, 'parasite') ? 'sucker' : has(ax, 'grazer') ? 'fused' : ax.plan.tubular || has(ax, 'suction') ? 'tube' : 'jawed';
  const ventral = ventralMouth(ax, construction);   /* round 5A: cartilaginous plan → inferior mouth set back under the snout */
  const orientation = ax.plan.flat >= 1 || ventral ? 'down' : has(ax, 'surfaceFeeder', 'glider') ? 'up' : has(ax, 'sifter', 'flatBenthic', 'parasite', 'bottomDweller', 'scavenger') ? 'down' : 'forward';
  const strongDown = has(ax, 'sifter', 'flatBenthic', 'parasite');
  const type = construction === 'sucker' ? 'suction' : construction === 'fused' ? 'beak' : construction === 'tube' ? 'tube'
    : orientation === 'up' ? 'superior' : orientation === 'down' ? (strongDown || ventral ? 'inferior' : 'subterminal') : 'terminal';
  let gape;
  if (construction === 'tube' || construction === 'fused') gape = [.05, .25];
  else if (construction === 'sucker') gape = [.1, .3];
  else if (has(ax, 'ambusher')) gape = [.55, .95];
  else if (has(ax, 'lurer', 'filterFeeder')) gape = [.45, .9];
  else if (has(ax, 'predator')) gape = [.4, .85];
  else if (has(ax, 'planktivore', 'cleaner', 'maneuverer', 'sifter')) gape = [.08, .32];
  else gape = [.18, .55];
  if (ventral) gape = [Math.max(gape[0], VENTRAL.minGape), Math.max(gape[1], VENTRAL.minGape + .1)];
  const teethForm = construction === 'fused' ? 'beak' : construction === 'sucker' ? 'rasp' : construction === 'tube' || construction === 'ventral' && has(ax, 'filterFeeder') ? 'none'
    : has(ax, 'filterFeeder', 'planktivore') ? 'villiform' : has(ax, 'ambusher') ? (ax.dark ? 'fang' : 'needle')
    : has(ax, 'predator') ? (ax.plan.solid ? 'triangular' : 'needle') : has(ax, 'armored', 'sifter', 'scavenger', 'crevice') ? 'molar' : 'villiform';
  const teethClass = teethForm === 'none' ? 'absent' : teethForm === 'beak' ? 'plate' : ['molar'].includes(teethForm) ? 'crushing' : ['villiform', 'rasp'].includes(teethForm) ? 'comb' : 'grasping';
  /* protrusion mechanism for picking niches; cheek (adductor) mass scales with bite niche */
  const picking = construction === 'jawed' && has(ax, 'planktivore', 'cleaner', 'sifter', 'suction', 'maneuverer');
  const cheek = has(ax, 'ambusher', 'lurer') ? 1 : has(ax, 'armored', 'scavenger', 'crevice') ? .85 : has(ax, 'predator') ? .65 : has(ax, 'planktivore', 'cleaner', 'filterFeeder') ? .08 : .35;
  const teethRows = teethClass === 'comb' || teethClass === 'crushing' ? 2 : 1;
  /* jaw opening: a STATE (rotation of the one-piece lower jaw about its hinge). typical 12–28° by gape band; hard max 40° only for the widest-gape niche, in a minority of those */
  const gMid = (gape[0] + gape[1]) / 2, widest = construction === 'jawed' && has(ax, 'ambusher');
  const openDeg = construction !== 'jawed' ? 0 : widest && (ax.seedU == null ? 1 : ax.seedU) < .3 ? JAW_MAX_DEG : clamp(lerp(JAW_TYPICAL[0], JAW_TYPICAL[1], clamp((gMid - .1) / .8, 0, 1)), JAW_TYPICAL[0], JAW_TYPICAL[1]);
  const mouthWidth = construction === 'jawed' ? lerp(.25, .65, clamp((gMid - .1) / .8, 0, 1)) : null;   /* mouth width / head width */
  return { picking, cheek, widest, openDeg, openRad: openDeg * Math.PI / 180, mouthWidth, teethRows, construction, orientation, ventral, setback: ventral ? VENTRAL.setback : 0, type, gape, teethForm, teethClass, cavityMax: CAVITY_MAX, discMax: DISC_DEPTH_MAX, tubeMax: TUBE_MAX, allowedTypes: typesFor(type) };
}
/* mouth types that satisfy the same orientation/construction (so authored mouths need not be rewritten when equivalent) */
function typesFor(t) { return t === 'terminal' ? ['terminal', 'protrusible'] : t === 'inferior' ? ['inferior'] : t === 'subterminal' ? ['subterminal', 'inferior'] : [t]; }

/* ───────────────────────── 3. FINS ───────────────────────── */
/* fin area / lateral body area envelopes by SWIM MODE (same estimator as metrics().finAreaFractions) */
const FIN_ENV = {
  thunniform:     { dorsal: [.02, .45], anal: [.01, .3], pectoral: [.03, .5], pelvic: [0, .15], caudal: [.08, .9], flexMax: .4 },
  carangiform:    { dorsal: [.03, .8], anal: [.02, .6], pectoral: [.04, .8], pelvic: [0, .3], caudal: [.06, 1.2], flexMax: .7 },
  subcarangiform: { dorsal: [.03, .9], anal: [.02, .7], pectoral: [.04, .9], pelvic: [0, .35], caudal: [.05, 1.3], flexMax: .85 },
  labriform:      { dorsal: [.06, 1.2], anal: [.04, .9], pectoral: [.08, 1.3], pelvic: [0, .5], caudal: [.04, 1.4], flexMax: 1 },
  ostraciiform:   { dorsal: [.06, 1.2], anal: [.04, .9], pectoral: [.06, 1.3], pelvic: [0, .5], caudal: [.04, 1.4], flexMax: 1 },
  anguilliform:   { dorsal: [.04, 1.2], anal: [.03, .9], pectoral: [0, .5], pelvic: [0, .2], caudal: [0, .8], flexMax: 1 },
  rajiform:       { dorsal: [0, .5], anal: [0, .5], pectoral: [0, 1.3], pelvic: [0, .5], caudal: [0, .8], flexMax: 1 },
  hippocampiform: { dorsal: [.03, .9], anal: [0, .5], pectoral: [.02, .5], pelvic: [0, .3], caudal: [0, .4], flexMax: 1 },
};
export const RAY_MIN = { dorsal: 6, anal: 5, pectoral: 8, pelvic: 4, caudal: 12 };
export function finLaw(ax) {
  const env = FIN_ENV[ax.swim] || FIN_ENV.carangiform;
  const cruise = ax.swim === 'thunniform' ? 1 : ax.swim === 'carangiform' ? .6 : ax.swim === 'subcarangiform' ? .35 : 0;
  /* plan-defined fin sets */
  const accessoryBand = ax.plan.softRayed && ax.swim === 'subcarangiform' && !ax.plan.elongated && ax.plan.flat === 0;
  return { env, cruise, stiff: cruise > .5, accessoryBand, mergedFringe: ax.plan.elongated, segmentedFront: ax.plan.perch, discMargin: ax.plan.flat > 0 };
}

/* ───────────────────────── 4. TAILS ───────────────────────── */
const SWIM_T = { thunniform: 1, carangiform: .7, subcarangiform: .45, labriform: .25, ostraciiform: .2, anguilliform: .15, hippocampiform: 0, rajiform: 0 };
/* homocercal outline bands along the swim axis T (0 slow-manoeuvring … 1 sustained-fast) */
export const HOMO_BANDS = [
  { t: [.85, 1.01], types: ['lunate'] },
  { t: [.55, .85], types: ['forked', 'lunate', 'lyrate'] },
  { t: [.35, .55], types: ['forked', 'emarginate', 'lyrate', 'truncate', 'fantail'] },
  { t: [.18, .35], types: ['emarginate', 'truncate', 'rounded', 'fantail', 'lyrate'] },
  { t: [-.01, .18], types: ['rounded', 'truncate', 'diphycercal', 'filamentous', 'fantail'] },
];
export function tailLaw(ax) {
  const T = SWIM_T[ax.swim] ?? .5, orn = TG.isOrnamental(ax);
  const family = ax.plan.flat >= 1 ? 'whip' : ax.plan.cartilaginous ? 'heterocercal' : 'homocercal';
  const band = HOMO_BANDS.find(b => T >= b.t[0] && T < b.t[1]) || HOMO_BANDS[2];
  let types = band.types.slice();
  if (ax.plan.elongated && !types.includes('diphycercal')) types.push('diphycercal');
  if (orn) types.push('filamentous', 'fantail');
  else types = types.filter(t => t !== 'filamentous');                           /* trailing filaments: ornamental niche only */
  /* bottom / ambush niches and manoeuvring swimmers: rounded fan or paddle outlines only (never forked) */
  const paddle = T < .55 && has(ax, 'ambusher', 'flatBenthic', 'bottomDweller', 'sifter', 'scavenger', 'crevice');
  if (paddle) { const k = types.filter(t => ['rounded', 'truncate', 'fantail', 'diphycercal'].includes(t)); if (k.length) types = k; }
  if (ax.plan.family === 'glider') types.push('hypocercal');
  const keel = family === 'heterocercal' || T >= .85;
  return {
    family, T, types, paddle, ornamental: orn, planBias: TG.planBias(ax.plan.family),
    aspect: [lerp(.7, 3.5, T), lerp(1.8, 8.5, T)],
    pedDepthMax: lerp(.72, .22, Math.pow(T, 1.5)),
    keel, keelBand: keel ? [.45, 1] : [0, 0],
    lobeAsymRange: family === 'heterocercal' ? [.0833, 1] : [0, 0],                      /* genome lobeAsym d → lobe ratio 1 + 1.2 d ∈ [1.1, 2.2] */
    lobeRatio: family === 'heterocercal' ? [1.1, TG.CAP.lobeMax] : [.85, 1.18],       /* upper / lower lobe length */
    spineDeg: family === 'heterocercal' ? TG.CAP.spineDeg : [0, 0],                    /* internal vertebral deflection in the peduncle */
    pitchMax: TG.CAP.pitchDeg, capH: orn ? TG.CAP.caudalHOrn : TG.CAP.caudalH, capA: TG.CAP.caudalA,
    caudalArea: (FIN_ENV[ax.swim] || FIN_ENV.carangiform).caudal,
  };
}
export const homocercalOutline = TG.homocercalOutline, lobeRatioOf = TG.lobeRatioOf;

/* ───────────────────────── 5. FLATTENED PLAN ───────────────────────── */
export function flatLaw(ax, g) {
  const flat = ax.plan.flat; if (!flat) return null;
  const angular = clamp((g.fins.pectoral.sweep - .25) / .55, 0, 1);        /* disc outline: rounded (0) ↔ angular (1) */
  return {
    flat, half: flat < 1, angular,
    widthRatio: clamp(g.body.width / 3.2, .4, 1),                              /* disc width / length */
    tailRatio: clamp(1 - g.body.peakU - .2, .2, .6),                            /* slender tail / total length */
    spine: has(ax, 'flatBenthic'),                                              /* defensive tail spine */
    gillPairs: 5, top: ['eyes', 'spiracles'], bottom: ['mouth', 'gills'],
    discFront: lerp(.015, .14, angular), discPow: lerp(.85, .6, angular), marginFrac: .3,
  };
}

/* ───────────────────────── repair hook (engine rule) ───────────────────────── */
/** Apply the laws to a genome as repairs. H = engine helpers {clampLog,setLog,bodyProfile,headDepth,metrics,landmarks}. */
export function repairLaws(g, ax, lm, log, H) {
  const R = 'anatomy_laws', cl = (p, lo, hi) => H.clampLog(g, log, R, p, lo, hi), st = (p, v) => H.setLog(g, log, R, p, v);
  const h = g.head.lengthFrac, bp = H.bodyProfile(g);
  /* eyes */
  const E = eyeLaw(ax), room = eyeRoom(g, bp, h);
  cl('head.eyeSize', Math.min(E.band[0], room), E.band[1]);
  if (ax.plan.flat > 0) cl('head.eyeV', .35, .98);
  const cartLat = ax.plan.cartilaginous && !ax.plan.flat && !ax.plan.sideFlat && !ax.plan.headExpanded;

  /* mouth */
  const M = mouthLaw(ax), eyeFree = !ax.plan.flat && !ax.plan.sideFlat && !ax.plan.headExpanded, er = g.head.eyeSize * EYE_GEO / 2;
  if (!M.allowedTypes.includes(g.mouth.type)) st('mouth.type', M.type);
  /* the mouth corner never extends behind the front edge of the eye (widest-gape niche: at most to the eye's centre line) */
  const eyeCap = Math.min(.8, g.head.gillStart - er * 1.08 - .012, eyeBand(h, g.head.eyeSize, g.head.eyeSide).seat), gMax = eyeFree ? ((eyeCap - (M.widest ? 0 : er)) - .12) / .6 : 9;
  const gapeHi = Math.min(M.gape[1], gMax), gapeLo = Math.min(M.gape[0], gapeLimit(g, bp, h), gapeHi);
  cl('mouth.gape', gapeLo, gapeHi);
  if (eyeFree) { const mc = h * (.12 + .6 * g.mouth.gape); cl('head.eyeU', Math.max(.15, Math.min(eyeCap, mc / h + (M.widest ? 0 : er))), .92); }
  cl('mouth.cavityDepth', .2, CAVITY_MAX);
  repairHead(g, ax, M, st, cl);   /* round 5A: barbel count/layout from niche × plan */
  if (M.teethClass === 'absent') { st('mouth.teeth', 'none'); st('mouth.teethCount', 0); }
  else if (!sameClass(g.mouth.teeth, M.teethClass)) st('mouth.teeth', M.teethForm);
  if (ax.plan.flat >= 1) { st('head.spiracles', true); st('head.gillSlits', 5); }
  /* fins: areas inside the swim-mode envelope, min ray counts, stiffness at the cruising end */
  const F = finLaw(ax), m = H.metrics(g).finAreaFractions, f = g.fins;
  const maxDf = Math.max(1e-3, bp.maxD);
  for (const k of ['dorsal', 'anal']) { const cap = (k === 'dorsal' ? TG.CAP.dorsalH : TG.CAP.analH) / maxDf; cl(`fins.${k}.height`, .03, Math.max(.03, cap)); if (k === 'dorsal' && f.dorsal.count >= 2) cl('fins.dorsal2.height', .03, Math.max(.03, cap)); if (k === 'dorsal' && f.dorsal.count >= 3) cl('fins.dorsal3.height', .03, Math.max(.03, cap)); }
  for (const k of ['dorsal', 'anal', 'pectoral', 'pelvic']) {
    const [lo, hi] = F.env[k]; if (!(m[k] > 0)) continue;
    const scaleTo = tgt => tgt / m[k];
    if (m[k] > hi + 1e-6) { const s = scaleTo(hi * .97); if (k === 'pectoral') cl('fins.pectoral.len', .05, Math.max(.05, f.pectoral.len * s)); else if (k === 'pelvic') cl('fins.pelvic.len', .03, Math.max(.03, f.pelvic.len * s)); else { cl(`fins.${k}.height`, .03, Math.max(.03, f[k].height * s)); if (k === 'dorsal' && f.dorsal.count >= 2) cl('fins.dorsal2.height', .03, Math.max(.03, f.dorsal2.height * s)); } }
    else if (m[k] < lo - 1e-6 && f[k].present) { const s = scaleTo(lo * 1.03), cap = k === 'dorsal' ? (H.a && H.a.dorsalLimit || 1.15) : k === 'anal' ? .7 : k === 'pectoral' ? 1.9 : .6; const cur = k === 'pectoral' || k === 'pelvic' ? f[k].len : f[k].height; const want = Math.min(cap, cur * s, k === 'dorsal' || k === 'anal' ? TG.CAP.dorsalH / maxDf : 9); if (want > cur) cl(k === 'pectoral' || k === 'pelvic' ? `fins.${k}.len` : `fins.${k}.height`, want, Math.max(want, cap)); }
  }
  if (f.dorsal.spines + f.dorsal.rays < RAY_MIN.dorsal) st('fins.dorsal.rays', RAY_MIN.dorsal - f.dorsal.spines);
  if (f.anal.spines + f.anal.rays < RAY_MIN.anal) st('fins.anal.rays', RAY_MIN.anal - f.anal.spines);
  cl('fins.pectoral.rays', RAY_MIN.pectoral, 60); cl('fins.pelvic.rays', RAY_MIN.pelvic, 20); cl('fins.caudal.rays', RAY_MIN.caudal, 40);
  if (F.stiff) for (const k of ['dorsal', 'anal', 'pectoral', 'caudal']) cl(`fins.${k}.flex`, 0, F.env.flexMax);
  if (F.segmentedFront && f.dorsal.present) cl('fins.dorsal.spines', 5, 24);
  if (f.adipose.present && !F.accessoryBand) st('fins.adipose.present', false);
  if (F.mergedFringe && f.dorsal.present && f.dorsal.count === 1) st('fins.dorsal.shape', 'continuous');
  /* tails */
  const Tl = tailLaw(ax), c = f.caudal;
  if (Tl.family === 'whip') {
    if (c.present) st('fins.caudal.present', false);
    cl('body.pedDepth', .03, .14); cl('body.pedWidth', .2, .6); cl('fins.dorsal.height', .03, .3); cl('fins.dorsal.u0', .72, .95);
    if (f.anal.present) st('fins.anal.present', false);
  } else if (c.present) {
    if (Tl.family === 'heterocercal') { if (c.type !== 'heterocercal') st('fins.caudal.type', 'heterocercal'); const d = TG.lobeAsymFromUnit(TG.unitOf(g, 'lobe')); if (Math.abs(c.lobeAsym - d) > 1e-6) st('fins.caudal.lobeAsym', +d.toFixed(6)); }
    else { if (!Tl.types.includes(c.type)) st('fins.caudal.type', Tl.types[0]); if (c.type === 'hypocercal') cl('fins.caudal.lobeAsym', -.28, -.1); else if (!['diphycercal', 'filamentous'].includes(c.type)) cl('fins.caudal.lobeAsym', -.12, .12); cl('fins.caudal.aspect', Tl.aspect[0], Tl.aspect[1]); }
    cl('body.pedDepth', .03, Tl.pedDepthMax);
    { const capSpan = Tl.capH / Math.max(1e-3, bp.maxD); cl('fins.caudal.span', Math.min(.3, capSpan), capSpan); }   /* caudal height ≤ capH × L */
    const [klo, khi] = Tl.keelBand; cl('body.keel', klo, khi);
    const ca = H.metrics(g).finAreaFractions.caudal, [alo, ahi] = Tl.caudalArea;
    if (ca > ahi + 1e-6) cl('fins.caudal.len', .03, Math.max(.03, c.len * Math.sqrt(ahi * .97 / ca)));
    else if (ca < alo - 1e-6 && alo > 0) cl('fins.caudal.len', Math.min(1.6, c.len * Math.sqrt(alo * 1.03 / Math.max(1e-6, ca))), 1.6);
  } else cl('body.keel', 0, 0);
}
function sameClass(teeth, cls) {
  const map = { none: 'absent', beak: 'plate', molar: 'crushing', villiform: 'comb', rasp: 'comb', needle: 'grasping', fang: 'grasping', triangular: 'grasping' };
  return map[teeth] === cls;
}
/* largest eye the head can seat above the mouth line — mirrors the clearance repair so the two never oscillate */
export function eyeRoom(g, bp, h) {
  const d = bp.depth(h * g.head.eyeU); if (!(d > 0)) return 1;
  if (g.head.eyeSide === 'none' || g.body.roll !== 0 || g.head.special === 'hammer') return Math.max(.05, .42 * d / h);
  const headCap = .42 * d / h;                       /* mirrors the eye-in-head repair */
  const dUp = d * g.body.dorsalFrac;
  const ML = { terminal: [0, -.24], superior: [.28, -.2], inferior: [-.84, -.64], subterminal: [-.65, -.48], beak: [-.03, -.18], tube: [0, -.08], suction: [-.85, -.73], protrusible: [-.04, -.27] };
  const mt = ML[g.mouth.type] || ML.terminal, topF = Math.max(mt[0], mt[1]), mouthTop = topF >= 0 ? topF * dUp : topF * d * (1 - g.body.dorsalFrac);
  return Math.max(.05, Math.min(headCap, (dUp * .96 - mouthTop - .1 * d) * .92 / h));
}
/* largest gape the head depth allows at the mouth corner — mirrors the gape repair */
export function gapeLimit(g, bp, h) {
  const hd = bp.depth(h * .75); let gp = .95, it = 0;
  while (it++ < 120 && gp > .05 && gp * hd > .95 * bp.depth(h * (.12 + .6 * gp))) gp -= .01;
  return Math.max(.05, gp);
}

/* ───────────────────────── 6. measurable assertions ───────────────────────── */
/** Pure genome-level law assertions. Returns [{inv,msg}]. metricsFn = FG.metrics. */
export function assertLaws(g, ax, lm, metricsFn) {
  const F = [], fail = (inv, msg) => F.push({ inv, msg }), h = g.head.lengthFrac, f = g.fins;
  const E = eyeLaw(ax);
  if (g.head.eyeSize > E.band[1] + 1e-6) fail('eyes', `eye ${g.head.eyeSize.toFixed(3)} above the ${E.regime} band`);
  if (E.count !== 2) fail('eyes', 'eye count is not an invariant');
  const M = mouthLaw(ax);
  if (!M.allowedTypes.includes(g.mouth.type)) fail('mouth_gills', `mouth '${g.mouth.type}' contradicts niche orientation '${M.orientation}' / construction '${M.construction}'`);
  if (g.mouth.gape > M.gape[1] + 1e-6) fail('mouth_gills', `gape ${g.mouth.gape.toFixed(2)} above the niche band`);
  if (g.mouth.cavityDepth > CAVITY_MAX + 1e-6) fail('mouth_gills', 'mouth cavity deeper than CAVITY_MAX head length');
  if (M.teethClass === 'absent' ? g.mouth.teeth !== 'none' : !sameClass(g.mouth.teeth, M.teethClass)) fail('mouth_gills', `teeth '${g.mouth.teeth}' not of niche class '${M.teethClass}'`);
  if (lm.mouthCorner > h * g.head.gillStart + 1e-6) fail('mouth_gills', 'mouth corner crosses the gill opening');
  assertHead(g, ax, M, fail);
  const Fl = finLaw(ax), mx = metricsFn(g), m = mx.finAreaFractions;
  for (const k of ['dorsal', 'anal', 'pectoral', 'pelvic', 'caudal']) if (m[k] > Fl.env[k][1] + 1e-3) fail('fins', `${k} area ${m[k]} outside the ${ax.swim} envelope`);
  for (const k of ['dorsal', 'anal', 'pectoral', 'caudal']) { if (f[k].present && m[k] < Fl.env[k][0] * .9 - 1e-3 && !((k === 'dorsal' || k === 'anal') && f[k].height * mx.maxD >= TG.CAP.dorsalH - 2e-3)) fail('fins', `${k} area ${m[k]} below the ${ax.swim} envelope`); if (Fl.stiff && f[k].present && f[k].flex > Fl.env.flexMax + 1e-6) fail('fins', `${k} not stiff enough for ${ax.swim}`); }
  if (f.dorsal.present && f.dorsal.spines + f.dorsal.rays < RAY_MIN.dorsal) fail('fins', 'dorsal ray count below minimum');
  if (f.anal.present && f.anal.spines + f.anal.rays < RAY_MIN.anal) fail('fins', 'anal ray count below minimum');
  if (f.pectoral.present && f.pectoral.rays < RAY_MIN.pectoral) fail('fins', 'pectoral ray count below minimum');
  if (f.caudal.present && f.caudal.rays < RAY_MIN.caudal) fail('fins', 'caudal ray count below minimum');
  if (f.adipose.present && !Fl.accessoryBand) fail('fins', 'accessory fin outside its plan band');
  const T = tailLaw(ax), c = f.caudal;
  if (T.family === 'whip') { if (c.present) fail('tail', 'flattened plan carries a caudal fin'); if (g.body.pedDepth > .14 + 1e-6) fail('tail', 'flattened-plan tail not slender'); }
  else if (c.present) {
    if (T.family === 'heterocercal' ? c.type !== 'heterocercal' : !T.types.includes(c.type)) fail('tail', `tail '${c.type}' inconsistent with ${T.family} family at T=${T.T}`);
    if (T.family === 'heterocercal') { const r = lobeRatioOf(c.lobeAsym); if (r < T.lobeRatio[0] - 1e-6 || r > T.lobeRatio[1] + 1e-6) fail('tail', `lobe ratio ${r.toFixed(2)} outside plan bounds`); }
    if (g.body.pedDepth > T.pedDepthMax + 1e-6) fail('tail', 'peduncle too deep for the swim axis');
    if (T.keel ? g.body.keel < .45 - 1e-6 : g.body.keel > 1e-6) fail('tail', `keel ${T.keel ? 'missing' : 'present'} for swim/plan conditions`);
  }
  if (ax.plan.flat >= 1) { if (!g.head.spiracles) fail('plan', 'flattened plan without top-surface spiracles'); if (g.head.gillSlits !== 5) fail('plan', 'flattened plan without 5 gill pairs'); if (f.anal.present) fail('plan', 'flattened plan with an anal fin'); }
  return F;
}

/* ───────────────────────── 6. BARBELS & FILAMENTS ───────────────────────── */
/** Head filament (lure) only in ambush / deep niches; total length (stalk + esca) ≤ 0.6 × body length, typically far less. */
export function lureLaw(g, ax) {
  const allowed = g.head.special === 'esca' && (has(ax, 'ambusher', 'lurer') || ax.dark);
  return { allowed, lenBody: allowed ? Math.min(APPENDAGE_CAP.lureBody, .5 * clamp(g.head.specialLen, .03, 1.5)) : 0 };
}
export function whipLen(g) { return Math.min(APPENDAGE_CAP.whipBody, clamp(g.head.specialLen, .03, 1.5) * .8); }
