/* Maps a trait vector onto the ORIGINAL engine's genome parameters (src/engine/fishgen.js schema paths).
   Every axis lands on a parameter that changes the mesh or the material shader; nothing is texture based. */
import { PALETTES } from './clades.js';

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
/* profile family -> longitudinal section exponents; cross-section -> super-ellipse exponents */
export const PROFILE = {
  torpedo: { frontPow: 1.15, backPow: 1.7, shoulder: .22 }, fusiform: { frontPow: 1.2, backPow: 1.3, shoulder: .16 }, deep: { frontPow: 1.0, backPow: 1.1, shoulder: .12 },
  elongate: { frontPow: 1.9, backPow: 1.3, shoulder: .1 }, eel: { frontPow: 1.2, backPow: 1.2, shoulder: .08 }, depressed: { frontPow: 1.3, backPow: 1.3, shoulder: .15 },
  globose: { frontPow: 1.0, backPow: 1.0, shoulder: .1 }, boxy: { frontPow: 1.1, backPow: 1.1, shoulder: .05 }, ribbon: { frontPow: 1.5, backPow: 1.2, shoulder: .05 }, tapered: { frontPow: 2.4, backPow: 1.3, shoulder: .05 },
};
export const CROSS = { round: { n: 2.0, nt: 2.0, vf: 0, df: 0 }, oval: { n: 2.3, nt: 2.0, vf: 0, df: 0 }, compressed: { n: 1.9, nt: 1.8, vf: 0, df: 0 }, depressed: { n: 2.4, nt: 2.2, vf: .6, df: 0 }, boxy: { n: 4.2, nt: 4.2, vf: .2, df: .1 } };

/** Pure mapping: trait vector -> { 'engine.path': value }. */
export function traitsToParams(t) {
  const p = {}, pr = PROFILE[t.profile], cs = CROSS[t.cross];
  Object.assign(p, {
    'body.length': t.length, 'body.fineness': t.fineness, 'body.width': t.width, 'body.peakU': t.peakU, 'body.snoutDepth': t.snoutDepth, 'body.pedDepth': t.pedDepth,
    'body.pedWidth': t.pedWidth, 'body.tailTaper': t.tailTaper, 'body.dorsalFrac': t.dorsalFrac, 'body.curl': t.curl, 'body.posture': t.posture, 'body.hump': t.hump, 'body.keel': t.keel,
    'body.frontPow': pr.frontPow, 'body.backPow': pr.backPow, 'body.shoulder': pr.shoulder,
    'body.superN': cs.n, 'body.superNTail': cs.nt, 'body.ventralFlat': cs.vf, 'body.dorsalFlat': cs.df,
    'head.lengthFrac': t.headLen, 'head.snoutTaper': t.snoutTaper, 'head.foreheadSlope': t.forehead, 'head.cheek': t.cheek, 'head.eyeSize': t.eyeSize, 'head.eyeU': t.eyeU, 'head.eyeV': t.eyeV,
    'head.eyeForward': t.eyeFwd, 'head.eyeSide': t.eyeSide, 'head.barbels': Math.round(t.barbels), 'head.barbelLen': t.barbelLen,
    'head.special': t.special, 'head.specialLen': t.special === 'esca' ? t.specialLen : t.special === 'hammer' ? t.specialLen : .1, 'head.specialWidth': t.special === 'hammer' ? t.specialWid : .1,
    'mouth.type': t.mouth, 'mouth.gape': t.gape, 'mouth.jawRatio': t.jawRatio, 'mouth.lips': t.lips, 'mouth.teeth': t.teeth, 'mouth.teethCount': Math.round(t.teethCount), 'mouth.protrusible': t.mouth === 'protrusible',
  });
  /* fins: only the standard set (dorsal ×1-3 segments, pectoral, pelvic, anal, caudal) */
  const d1 = clamp(t.dStart + t.dSpan, t.dStart + .03, .98);
  Object.assign(p, { 'fins.dorsal.present': true, 'fins.dorsal.count': t.dN, 'fins.dorsal.u0': t.dStart, 'fins.dorsal.u1': d1, 'fins.dorsal.height': t.dHeight, 'fins.dorsal.sweep': t.dSweep, 'fins.dorsal.shape': t.dShape });
  if (t.dN >= 2) {
    const u0 = clamp(d1 + t.d2Gap, 0, .93), u1 = clamp(u0 + t.d2Span, u0 + .03, t.dN === 3 ? .88 : .99);
    Object.assign(p, { 'fins.dorsal2.u0': u0, 'fins.dorsal2.u1': u1, 'fins.dorsal2.height': t.d2Height, 'fins.dorsal2.shape': t.d2Shape });
    if (t.dN === 3) Object.assign(p, { 'fins.dorsal3.u0': clamp(u1 + .02, 0, .95), 'fins.dorsal3.u1': clamp(u1 + .02 + t.d2Span * .8, u1 + .05, .99), 'fins.dorsal3.height': t.d2Height * .9, 'fins.dorsal3.shape': t.d2Shape });
  }
  Object.assign(p, { 'fins.anal.present': !!t.anal, 'fins.anal.u0': t.aStart, 'fins.anal.u1': clamp(t.aStart + t.aSpan, t.aStart + .03, .99), 'fins.anal.height': t.aHeight, 'fins.anal.shape': t.aShape });
  Object.assign(p, { 'fins.pectoral.present': true, 'fins.pectoral.u': t.pecU, 'fins.pectoral.v': t.pecV, 'fins.pectoral.len': t.pecLen, 'fins.pectoral.baseLen': t.pecBase, 'fins.pectoral.shape': t.pShape });
  Object.assign(p, { 'fins.pelvic.present': !!t.pelvic, 'fins.pelvic.position': t.pelPos, 'fins.pelvic.len': t.pelLen, 'fins.pelvic.shape': t.pelShape });
  Object.assign(p, { 'fins.caudal.present': !!t.caudal, 'fins.caudal.type': t.cType, 'fins.caudal.len': t.cauLen, 'fins.caudal.aspect': t.cauAspect, 'fins.adipose.present': false, 'fins.finlets.count': 0 });
  /* skin: scale type, pattern (rendered by the procedural body shader), natural palette, countershading */
  const P = PALETTES[t.palette], base = [t.hue, t.sat, t.lit];
  Object.assign(p, {
    'skin.scale': t.scale, 'skin.scaleSize': t.scaleSize, 'skin.pattern': t.pattern, 'skin.patternScale': t.patScale, 'skin.patternStrength': t.patDens,
    'skin.base': base, 'skin.belly': [t.hue, t.sat * .3, t.bellyLit], 'skin.accent': [(t.hue + t.accentDH + 360) % 360, clamp(t.accentSat * t.sat * 1.2, .05, .8), clamp(t.lit * .5, .05, .5)],
    'skin.fin': [t.hue, t.sat * .75, clamp(t.lit + .05, .05, .65)], 'skin.eye': P.eye[t.eyeIdx].slice(),
    'skin.countershade': t.shade, 'skin.iridescence': t.iri, 'skin.gloss': t.gloss, 'skin.photophores': Math.round(t.photophores), 'skin.glow': [t.glowH, .9, .6],
  });
  return p;
}

const setPath = (o, path, v) => { const k = path.split('.'); let c = o; for (let i = 0; i < k.length - 1; i++) { if (typeof c[k[i]] !== 'object' || c[k[i]] === null) c[k[i]] = {}; c = c[k[i]]; } c[k[k.length - 1]] = v; };
const mid = s => {
  if (s && typeof s === 'object' && !Array.isArray(s)) {
    if (s.r) { const v = (s.r[0] + s.r[1]) / 2; return s.i ? Math.round(v) : v; }
    if (s.c) return s.c[0];
    if (s.hsl) return s.hsl.map(x => (Array.isArray(x) ? (Array.isArray(x[0]) ? (x[0][0] + x[0][1]) / 2 : (x[0] + x[1]) / 2) : x));
  }
  return Array.isArray(s) ? s.slice() : s;
};

/** Build the engine genome: engine body-plan template for the lineage (unmapped details) + our traits, then the engine's own rules pass. */
export function makeEngineGenome(FG, t, meta) {
  const g = FG.defaultGenome(), map = FG.resolveTraitMap({ clade: t.lineage, niche: null, species: null });
  for (const path in map) if (FG.SCHEMA[path]) setPath(g, path, mid(map[path]));
  const params = traitsToParams(t);
  for (const path in params) if (FG.SCHEMA[path]) setPath(g, path, params[path]);
  Object.assign(g.meta, { seed: meta.seed, surfaceSeed: meta.seed, habitat: FG.HABITATS[t.habitat] ? t.habitat : 'coralReef', niche: null, clade: t.lineage, species: null, fantasy: false, novel: false });
  g.meta.proc = { seed: meta.seed, clade: t.clade, lineage: t.lineage, hash: meta.hash, name: meta.name.common, sci: meta.name.sci, traits: t };
  g.meta.repairs = [];
  FG.finalize(g);
  g.meta.name = meta.name.common; g.meta.sci = meta.name.sci;
  return g;
}
