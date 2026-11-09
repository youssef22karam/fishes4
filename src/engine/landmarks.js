/* ROUND 7 / WP1 + STATE-OF-THE-ART HEAD & MOUTH MORPHOLOGY — head landmarks + sculpt parameters.
   Everything is derived from the engine's own axes (body plan, feeding
   niche via the mouth law, swim-driven elongation, head proportions) plus
   seeded jitter from an independent 'head2' stream, so re-rolling any
   other subsystem never changes the head and vice versa. No species names.
   Landmark stations are in body-u units, matching bm.lm and bm.h. */
import { makeRng } from './genome.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Classify and parameterise the head & mouth morphology from biological axes.
    Cached on bm.head2. */
export function head2Params(bm) {
  if (bm.head2) return bm.head2;
  const g = bm.g, law = bm.law, a = bm.a || {}, ax = bm.ax || {};
  const flags = ax.flags || new Set();
  const fam = a.family || 'rayfin';
  const rng = makeRng(String(g.meta.seed || g.meta.surfaceSeed || 'fish') + '|head2');
  const jit = () => 0.85 + rng.next() * 0.3;                  /* ±15% per-fish variation */

  const fine = g.body.fineness ?? 4;
  const elong = clamp((fine - 3) / 9, 0, 1);
  const cheekMass = clamp(law.mouth.cheek ?? 0.4, 0, 1);      /* bite-niche adductor mass */
  const eyeBig = clamp((g.head.eyeSize ?? 0.2) / 0.35, 0, 1); /* eye diameter vs head */
  const eel = (fam === 'ribbon' || fam === 'knife') ? 1 : clamp((fine - 9) / 4, 0, 1);

  const gape = clamp(g.mouth.gape ?? 0.35, 0.05, 0.98);
  const lips = clamp(g.mouth.lips ?? 0.3, 0, 1);
  const jawRatio = clamp(g.mouth.jawRatio ?? 1.0, 0.4, 1.5);
  const snoutTaper = clamp(g.head.snoutTaper ?? 0.4, 0, 1);
  const cart = !!(ax.plan && ax.plan.cartilaginous);
  const flatPlan = (ax.plan && ax.plan.flat) || 0;
  const protrusile = !!bm.protrusile || g.mouth.type === 'protrusible';
  const mType = g.mouth.type || 'terminal';

  /* Morphological archetype weights from clade/plan/niche axes */
  const isLongjaw = fam === 'longjaw' || (snoutTaper > 0.62 && gape > 0.42) || (flags.has('predator') && fine > 5.2 && !cart);
  const isGulper = !cart && !isLongjaw && (gape > 0.52 || flags.has('ambusher') || flags.has('lurer') || fam === 'angler' || (fam === 'spiny' && gape > 0.38));
  const isBenthic = !cart && (fam === 'catfish' || fam === 'benthic' || flags.has('sifter') || flags.has('bottomDweller') || (g.head.barbels > 0));
  const isSelachian = cart && flatPlan < 1;
  const isBeak = law.mouth.construction === 'fused' || fam === 'rigid' || fam === 'molid';

  const arch = isSelachian ? 'selachian_ventral'
    : isBeak ? 'fused_beak'
    : isLongjaw ? 'acuminate_fang'
    : isGulper ? 'gulper_predator'
    : isBenthic ? 'benthic_barbel'
    : protrusile ? 'protrusile_sucker'
    : 'reef_terminal';

  /* Prognathous lower-jaw jut (bass, grouper, barracuda, pike, surface feeders) */
  const prognathous = cart || mType === 'inferior' || mType === 'subterminal' || mType === 'suction' ? 0
    : clamp(((jawRatio - 0.96) * 1.4 + (mType === 'superior' ? 0.45 : 0) + (isGulper ? 0.32 : 0) + (isLongjaw ? 0.38 : 0)) * jit(), 0, 1);

  /* Mandibular symphysis chin fullness */
  const symphysis = clamp((0.25 + 0.55 * prognathous + 0.25 * cheekMass) * (1 - 0.6 * (mType === 'inferior' ? 1 : 0)), 0, 1);

  /* U-shaped dental arcade broadening across the snout (prevents sharp V-shaped dinosaur beak in plan view) */
  const rostralPlan = clamp(
    (isGulper ? 0.78 : isBenthic ? 0.85 : isSelachian ? 0.62 : isLongjaw ? 0.28 : 0.55)
    * (1 - 0.35 * snoutTaper) * jit(),
    0.15, 1
  );

  /* Maxillary bone plate & labial cheek fold prominence (teleost upper jaw apparatus) */
  const maxillaW = cart || isBeak ? 0 : clamp((0.42 + 0.45 * gape + (isGulper ? 0.22 : 0) + (isLongjaw ? 0.15 : 0)) * jit(), 0.25, 1);
  const maxillaSweep = clamp(0.45 + 0.35 * gape + (isGulper ? 0.15 : 0), 0.3, 0.95);

  /* Dorsoventral head depression (catfish, sculpin, flat-benthic) */
  const depressed = clamp((isBenthic ? 0.65 : isGulper && flags.has('bottomDweller') ? 0.45 : 0) * jit(), 0, 1);

  /* Premaxillary ascending hood (protrusible mouths: carp, wrasse, cichlid, cleaner) */
  const premaxHood = clamp((protrusile ? 0.75 : 0.25) * (0.6 + 0.4 * lips) * jit(), 0, 1);

  /* Papillose / verrucose lip texture intensity */
  const papillose = clamp((lips > 0.55 ? (lips - 0.55) / 0.45 : 0) + (isBenthic ? 0.45 : 0), 0, 1);

  const P = {
    arch, elong, cheekMass, eyeBig, eel,
    gape, lips, jawRatio, prognathous, symphysis,
    rostralPlan, maxillaW, maxillaSweep, depressed, premaxHood, papillose,
    isSelachian, isGulper, isLongjaw, isBenthic, isBeak, protrusile,
    /* dorsal profile: three positive lobes + one saddle, so the silhouette
       has >= 3 curvature sign changes by construction (non-eel plans) */
    forehead: clamp((0.30 + 0.38 * (1 - elong) * (isLongjaw ? 0.55 : 1)) * jit(), 0, 1),
    nape: clamp((0.26 + 0.36 * (1 - elong)) * jit(), 0, 1),
    saddle: clamp((0.55 + (isGulper ? 0.18 : 0)) * jit(), 0, 1),
    orbit: clamp((0.30 + 0.45 * eyeBig) * jit(), 0, 1),
    cheek: clamp((cheekMass + 0.22 * depressed) * jit(), 0, 1),
    undercut: clamp((0.30 + 0.45 * cheekMass) * jit(), 0, 1),
    throat: clamp((0.28 + 0.34 * (1 - elong)) * jit(), 0, 1),
    snoutRound: clamp((0.45 + 0.45 * rostralPlan - 0.3 * elong) * jit(), 0, 1),
    /* landmark stations (body u) */
    uEye: bm.lm.eye, uHinge: bm.hingeU, uCorner: bm.mcU, h: bm.h,
  };
  bm.head2 = P;
  return P;
}

/** The §4.1 landmark set as named stations, for validators and the rig. */
export function headLandmarks(bm) {
  const P = head2Params(bm), h = bm.h;
  return {
    snoutTip: 0.004,
    upperLipFront: Math.max(0.004, bm.jawStartU),
    orbitFront: P.uEye - h * 0.16, eyeCentre: P.uEye, orbitRear: P.uEye + h * 0.16,
    nape: h * 1.02,
    preopercleRear: bm.lm.preopercle, opercleRearTip: bm.lm.operculum,
    isthmus: h * 1.03, chin: bm.jawStartU, jawJoint: P.uHinge,
    maxillaEnd: P.uCorner, pectoralBase: bm.lm.pectoralBase,
  };
}

/** Dorsal silhouette height (frame centre + dUp) sampled along the head. */
export function dorsalProfile(bm, n = 48) {
  const fr = {}, s = {}, out = [];
  for (let i = 0; i <= n; i++) {
    const u = 0.004 + (bm.h * 1.25 - 0.004) * (i / n);
    bm.frame(u, fr); bm.section(u, s);
    out.push({ u, y: fr.py + s.dUp });
  }
  return out;
}

/** Count curvature sign changes of the dorsal profile (validator helper).
    Eel plans are exempt by the caller via P.eel. */
export function profileCurvatureChanges(bm) {
  head2Params(bm);
  const p = dorsalProfile(bm), ys = p.map(q => q.y);
  let changes = 0, prev = 0;
  for (let i = 1; i < ys.length - 1; i++) {
    const c = (ys[i + 1] - ys[i]) - (ys[i] - ys[i - 1]);
    const sgn = c > 1e-7 ? 1 : c < -1e-7 ? -1 : 0;
    if (sgn && prev && sgn !== prev) changes++;
    if (sgn) prev = sgn;
  }
  return changes;
}
