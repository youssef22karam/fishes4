/* ANATOMY HARD GATE. A genome is rejected (and resampled) unless every invariant holds.
   Stage 1 (checkTraits): trait-level rules, pure.   Stage 2 (checkEngine): the mapped engine genome is
   examined with the engine's analytic BodyModel — NO mesh is built before both stages pass. */
import { AX_KEYS, DISC_KEYS, PALETTES, envelope, CLADES, SIZE_BANDS } from './clades.js';
import { traitsToParams } from './mapping.js';
import { assertLaws, EYE_GEO, finLaw, CAVITY_MAX } from './laws.js';
import { EYE_PROTRUSION_MIN, EYE_PROTRUSION_MAX, EYE_PROTRUSION, EYE_SEAT } from './eyeband.js';

export const INVARIANTS = ['symmetry', 'eyes', 'appendages', 'fins', 'mouth_gills', 'profile', 'colour', 'envelope', 'tail', 'plan'];
export const EYE_BAND = [.03, .15];                 /* eye diameter / head length */
const STD_FINS = new Set(['dorsal', 'dorsal2', 'dorsal3', 'anal', 'pectoral', 'pelvic', 'caudal', 'adipose', 'finlets']);
const FIN_CAP = { dorsal: 1.15, dorsal2: .6, dorsal3: .6, anal: .7, pectoral: 1.9, pelvic: .6, caudal: .75 };   /* height / max body depth, caudal: len/L */
const AREA_CAP = { dorsal: 1.2, anal: .9, pectoral: 1.3, pelvic: .55, caudal: 1.7 };      /* fin area / lateral body area */
const EPS = 1e-6;

/* ───────────────────────────── stage 1: traits ───────────────────────────── */
export function checkTraits(t) {
  const F = [], fail = (inv, msg) => F.push({ inv, msg });
  let env; try { env = envelope(t.clade, t.lineage); } catch (e) { return [{ inv: 'envelope', msg: 'unknown clade/lineage' }]; }
  const clade = CLADES[t.clade];
  /* envelope: nothing outside the union of clade envelopes */
  for (const k of AX_KEYS) {
    if (k === 'hue' || k === 'sat' || k === 'lit') continue;
    const [lo, hi] = env.r[k], v = t[k];
    if (!Number.isFinite(v) || v < lo - EPS || v > hi + EPS) {
      if (k === 'teethCount' && t.teeth === 'none' && v === 0) continue;
      fail('envelope', `${k}=${v} outside [${lo},${hi}]`);
    }
  }
  for (const k of DISC_KEYS) if (!env.d[k].some(o => o[0] === t[k])) fail('envelope', `${k}='${t[k]}' not allowed in ${t.clade}/${t.lineage}`);
  const P = PALETTES[t.palette];
  if (!P) fail('envelope', 'unknown palette');
  else {
    if (!P.h.some(b => t.hue >= b[0] - EPS && t.hue <= b[1] + EPS)) fail('envelope', 'hue outside palette');
    if (t.sat < P.s[0] - EPS || t.sat > P.s[1] + EPS || t.lit < P.l[0] - EPS || t.lit > P.l[1] + EPS) fail('envelope', 'sat/lit outside palette');
  }
  const b = SIZE_BANDS[t.sizeClass]; if (!b || t.length < b[0] - EPS || t.length > b[1] + EPS) fail('envelope', 'length outside size class');
  /* symmetry: bilateral everywhere; only the flatfish clade may carry a (real) one-sided eye pair */
  if (clade.flat ? !['left', 'right'].includes(t.eyeSide) : t.eyeSide !== 'both') fail('symmetry', `eyeSide '${t.eyeSide}' not allowed for ${t.clade}`);
  if (!clade.flat && (t.curl > 0 && !clade.curl)) fail('symmetry', 'curl outside the seahorse clade');
  /* eyes: exactly two, on the head, family-normal size */
  if (t.eyeSize < EYE_BAND[0] || t.eyeSize > EYE_BAND[1]) fail('eyes', `eye ${t.eyeSize.toFixed(3)} of head length outside 3–15%`);
  if (t.eyeU < .15 || t.eyeU > .85) fail('eyes', 'eye not on the head');
  /* fins: standard set, ordered stations */
  const p = traitsToParams(t);
  for (const key in p) { const m = /^fins\.([a-z0-9]+)\./.exec(key); if (m && !STD_FINS.has(m[1])) fail('fins', 'non-standard fin ' + m[1]); }
  if (p['fins.adipose.present'] || p['fins.finlets.count']) fail('fins', 'adipose/finlet is outside the standard set');
  if (!p['fins.pectoral.present'] || !p['fins.dorsal.present']) fail('fins', 'missing dorsal/pectoral');
  if (!t.caudal && !(t.curl > 0)) fail('fins', 'caudal fin missing (only the seahorse form lacks one)');
  if (p['fins.dorsal.u1'] <= p['fins.dorsal.u0']) fail('fins', 'dorsal base reversed');
  if (t.dN >= 2 && p['fins.dorsal2.u0'] <= p['fins.dorsal.u1']) fail('fins', 'dorsal segments overlap');
  if (t.dN === 3 && p['fins.dorsal3.u0'] <= p['fins.dorsal2.u1']) fail('fins', 'dorsal segments overlap');
  if (!['thoracic', 'abdominal'].includes(t.pelPos)) fail('fins', 'pelvic station');
  /* mouth: one mouth; teeth only inside it */
  if (t.mouth === 'tube' && t.teeth !== 'none') fail('mouth_gills', 'teeth in a tube mouth');
  if ((t.teeth === 'none') !== (Math.round(t.teethCount) === 0)) fail('mouth_gills', 'teeth count / type mismatch');
  if (t.teeth === 'beak' && !['terminal', 'beak'].includes(t.mouth)) fail('mouth_gills', 'beak teeth need a beak-bearing jaw');
  if (t.barbels > 0 && t.barbels !== Math.round(t.barbels)) fail('appendages', 'barbel count');
  if (t.barbelLen > .8 && t.barbels > 0) fail('appendages', 'barbels longer than 80% of head');
  if (t.special === 'esca' && t.clade !== 'angler') fail('appendages', 'lure outside anglerfish');
  if (t.special === 'hammer' && t.lineage !== 'hammerhead') fail('appendages', 'cephalofoil outside hammerheads');
  if (t.special === 'esca' && t.specialLen > .35) fail('appendages', 'lure too long to be borne by the head');
  /* colour: natural only */
  if (t.sat > .85 || t.lit > .62 || t.lit < .04) fail('colour', 'unnatural base colour');
  if (t.shade < .1 && !env.deep && t.clade !== 'angler') fail('colour', 'no countershading');
  if (t.photophores > 0 && !env.deep) fail('colour', 'photophores outside deep-sea clade');
  if (t.photophores > 60) fail('colour', 'too many photophores');
  if (t.glowH < 150 || t.glowH > 215) fail('colour', 'photophore colour not blue-green');
  return F;
}

/* ───────────────────────────── stage 2: engine geometry (analytic) ───────────────────────────── */
function insideSection(bm, x, y, z, u, out) {
  const fr = bm._vf || (bm._vf = {}), s = bm._vs || (bm._vs = {}); bm.frame(u, fr); bm.section(u, s);
  const ly = (x - fr.px) * fr.nx + (y - fr.py) * fr.ny;
  const ok = ly > -s.dDn && ly < s.dUp && Math.abs(z) < bm.halfWidthAtY(s, ly) + 1e-9;
  if (out) { out.ly = ly; out.dUp = s.dUp; out.dDn = s.dDn; }
  return ok;
}
const clampf = (x, a, b) => (x < a ? a : x > b ? b : x);

export function checkEngine(t, g, FG) {
  const F = [], fail = (inv, msg) => F.push({ inv, msg });
  const bm = new FG.BodyModel(g), lm = bm.lm, bp = bm.bp, L = bm.L, maxD = bp.maxD, f = g.fins, fam = bm.a.family, flatBody = fam === 'ray' || fam === 'benthicShark';
  const clade = CLADES[t.clade];
  /* ── global anatomy laws (laws.js): every rule is a function of plan / niche / swim / depth axes ── */
  const ax = FG.axesOf(g), whip = ax.plan.flat >= 1, FL = finLaw(ax);
  for (const x of assertLaws(g, ax, lm, FG.metrics)) F.push(x);
  const protrusion = EYE_PROTRUSION;                                          /* exposed dome / diameter from the eye construction */
  if (protrusion < EYE_PROTRUSION_MIN || protrusion > EYE_PROTRUSION_MAX) fail('eyes', 'eye protrudes more than a third of its diameter');
  if (!(bm.hingeU >= lm.mouthCorner - EPS) || bm.hingeU > g.head.lengthFrac * g.head.gillStart + EPS) fail('mouth_gills', 'jaw hinge not between mouth corner and gill opening');
  if (bm.hingeU + EPS < Math.min(lm.eye, g.head.lengthFrac * g.head.gillStart - .006)) fail('mouth_gills', 'jaw hinge in front of the eye line');
  if (FG.round2Check) { const r2 = FG.round2Check(bm); if (r2.length) fail('mouth_gills', r2[0]); }   /* round 2: see-through / floating teeth / eye protrusion → resample */
  if (Math.min(g.mouth.cavityDepth, CAVITY_MAX) > CAVITY_MAX + EPS) fail('mouth_gills', 'cavity deeper than 0.35 head length');
  /* ── round 1: jaw + side-fin laws (analytic part of the reject-and-resample gate) ── */
  { const Mj = bm.law.mouth, Pp = bm.law.pec, JM = FG.LAW.JAW_MAX_DEG, er = bm.eyeR / Math.max(1e-6, L);
    if (Mj.construction === 'jawed') {
      if (Mj.openDeg > JM + EPS) fail('mouth_gills', 'jaw opens past the 40° hard maximum');
      if (Mj.openDeg > FG.LAW.JAW_TYPICAL[1] + EPS && !Mj.widest) fail('mouth_gills', 'jaw opens past 28° outside the widest-gape niche');
      if (Mj.mouthWidth < .25 - EPS || Mj.mouthWidth > .65 + EPS) fail('mouth_gills', 'mouth width outside 0.25–0.65 of head width');
      if (!ax.plan.flat && !ax.plan.sideFlat && !ax.plan.headExpanded && g.head.eyeSide !== 'none' && lm.mouthCorner > lm.eye - (Mj.widest ? 0 : er) + EPS) fail('mouth_gills', 'mouth corner extends behind the front edge of the eye');
    }
    if (Pp.restAbd < 5 || Pp.restAbd > 55) fail('fins', 'side-fin rest abduction outside 5–55°');
    if (Pp.cls === 'disc' !== (bm.a.family === 'ray')) fail('fins', 'disc plan and separate side-fin joint disagree');
    if (Pp.lagDeg < 8 - EPS || Pp.lagDeg > 20 + EPS) fail('fins', 'fin tip lag outside 8–20° of phase'); }
  if (whip) { if (bm.a.gills !== 'ventral') fail('plan', 'flattened plan gill openings not on the bottom surface'); if (!bm.ventralMouth) fail('plan', 'flattened plan mouth not on the bottom surface'); }
  /* ── eyes ── */
  if (g.head.eyeSide !== t.eyeSide) fail('symmetry', 'engine eye side differs from genome');
  if (ax.plan.cartilaginous && !ax.plan.flat && !ax.plan.sideFlat && !ax.plan.headExpanded) {   /* round 2: cartilaginous-plan eye envelope (plan wins over niche / depth) */
    const dEye = g.head.eyeSize * EYE_GEO;
    if (dEye < .05 - 1e-4 || dEye > .11 + 1e-4) fail('eyes', `cartilaginous eye diameter ${dEye.toFixed(3)} × head length outside 0.05–0.11`);
  }
  if (g.head.eyeSize < EYE_BAND[0] - EPS || g.head.eyeSize > EYE_BAND[1] + EPS) fail('eyes', `engine eye size ${g.head.eyeSize.toFixed(3)} outside 3–15% of head`);
  const eyes = [], fr = {}, s = {}, u = lm.eye, sides = g.head.eyeSide === 'both' ? [1, -1] : g.head.eyeSide === 'left' ? [1, 1] : [-1, -1];
  bm.frame(u, fr); bm.section(u, s);
  sides.forEach((side, i) => {
    const uu = i === 1 && sides[0] === sides[1] ? u + .018 : u, yy = i === 1 && sides[0] === sides[1] ? Math.max(-s.dDn * .5, bm.eyeY - bm.eyeR * 1.9) : bm.eyeY;
    bm.frame(uu, fr); bm.section(uu, s);
    const yn = yy > 0 ? s.nD : s.nV, yr = yy > 0 ? s.dUp : s.dDn;
    const th = flatBody ? Math.acos(clampf(Math.pow(s.coreW * .8 / Math.max(1e-8, s.w), s.n / 2), 0, 1)) : Math.asin(Math.sign(yy) * Math.pow(clampf(Math.abs(yy) / Math.max(1e-8, yr), 0, .9), yn / 2));
    const theta = side > 0 ? th : Math.PI - th, surf = {}, ax = new FG.THREE.Vector3();
    bm.rawSurface(uu, theta, surf); bm.surfaceNormal(uu, theta, ax);
    const c = { x: surf.x - ax.x * bm.eyeR * EYE_SEAT, y: surf.y - ax.y * bm.eyeR * EYE_SEAT, z: surf.z - ax.z * bm.eyeR * EYE_SEAT };
    eyes.push({ side, u: uu, c, surf });
    if (!insideSection(bm, c.x, c.y, c.z, uu)) fail('eyes', 'eye centre is not embedded in the head');
    if (uu - bm.eyeR / L < .004 || uu + bm.eyeR / L > lm.operculum * .98) fail('eyes', 'eye extends off the head');
    if (bm.eyeR * 2 * .73 > (s.dUp + s.dDn) * .6) fail('eyes', 'eye too large for local head depth');
    if (!flatBody) { const o = {}; insideSection(bm, c.x, c.y, c.z, uu, o); if (o.ly + bm.eyeR * .85 > o.dUp * .97 || o.ly - bm.eyeR * .85 < -o.dDn * .97) fail('eyes', 'eye breaks the head outline (not embedded)'); }
    else { const o = {}; insideSection(bm, surf.x, surf.y, surf.z, uu, o); if (!(o.ly > 0)) fail('plan', 'flattened plan eye not on the top surface'); }
    if (Math.abs(surf.z) < 1e-9 && !flatBody) fail('eyes', 'eye on the midline');
  });
  if (eyes.length !== 2) fail('eyes', 'not exactly two eyes');
  if (g.head.eyeSide === 'both' && Math.abs(eyes[0].c.z + eyes[1].c.z) > 1e-9) fail('symmetry', 'eyes not mirrored');
  if (eyes.some(e => e.u > lm.operculum)) fail('eyes', 'eye behind the head');
  /* ── appendage stations & attachment (each base must exist on the skin and be ordered) ── */
  const dMin = g.body.roll !== 0 ? g.head.lengthFrac * .12 : lm.operculum;
  const depthOk = (uA, uB) => bp.depth(clampf(uA, .004, .998)) > .02 * maxD && bp.depth(clampf(uB, .004, .998)) > .02 * maxD;
  const segs = [['dorsal', lm.dorsalOrigin, lm.dorsalEnd]];
  if (f.dorsal.count >= 2) segs.push(['dorsal2', lm.dorsal2Origin, lm.dorsal2End]);
  if (f.dorsal.count === 3) segs.push(['dorsal3', lm.dorsal3Origin, lm.dorsal3End]);
  let prevEnd = dMin - 1e-6;
  for (const [name, a, b2] of segs) {
    if (a < prevEnd - 1e-6 || b2 <= a || b2 > .9995) fail('appendages', `${name} base not on the back line`);
    if (!depthOk(a, b2)) fail('appendages', `${name} base beyond the body`);
    prevEnd = b2;
  }
  if (f.anal.present) {
    if (lm.analOrigin < lm.vent - .03 || lm.analEnd <= lm.analOrigin || lm.analEnd < .55 || lm.analOrigin < .2) fail('appendages', 'anal fin not on the rear underside');
    if (!depthOk(lm.analOrigin, lm.analEnd)) fail('appendages', 'anal base beyond the body');
  }
  if (lm.pectoralBase < lm.operculum - 1e-6) fail('appendages', 'pectoral fin in front of the gill cover');
  if (lm.pectoralBase > .5) fail('appendages', 'pectoral station too far back');
  if (Math.abs(f.pectoral.v) > .75) fail('appendages', 'pectoral off the flank');
  if (f.pelvic.present && lm.pelvicBase < lm.pectoralBase - 1e-6) fail('appendages', 'pelvic fin in front of the pectoral');
  if (f.pelvic.present && lm.pelvicBase > lm.analOrigin + .05 && f.anal.present) fail('appendages', 'pelvic behind the anal origin');
  if (f.caudal.present !== !!t.caudal && !(whip && !f.caudal.present)) fail('fins', 'engine changed caudal presence');
  if (!whip && (f.caudal.present || !(t.curl > 0)) && (!f.caudal.present || bp.depth(.999) <= 0 || lm.caudalBase !== 1)) fail('appendages', 'caudal fin not at the tail tip');
  if (g.head.barbels > 8 || (g.head.barbels && (g.head.barbelLen > .8 || lm.mouthCorner >= lm.operculum))) fail('appendages', 'barbels not on the head');
  if (g.head.special === 'esca' && !(g.head.specialLen <= .35)) fail('appendages', 'lure detached from the head');
  if (!['none', 'esca', 'hammer'].includes(g.head.special)) fail('appendages', 'unexpected head appendage ' + g.head.special);
  /* ── fin sizes within family limits, never piercing the body ── */
  const caps = { dorsal: (bm.a.dorsalLimit || 1.15) + .1 };
  for (const nm of ['dorsal', 'dorsal2', 'dorsal3']) if (nm === 'dorsal' || f.dorsal.count > (nm === 'dorsal2' ? 1 : 2)) if (f[nm].height > (caps[nm] || FIN_CAP[nm]) + EPS) fail('fins', `${nm} height ${f[nm].height.toFixed(2)} over family limit`);
  if (f.anal.present && f.anal.height > FIN_CAP.anal + EPS && !['continuous'].includes(f.anal.shape)) fail('fins', 'anal fin too tall');
  if (f.pelvic.present && f.pelvic.len > FIN_CAP.pelvic + 1e-9 && fam !== 'ray') fail('fins', 'pelvic fin too long');
  if (f.caudal.len > FIN_CAP.caudal || f.caudal.len < .03) fail('fins', 'caudal size outside family limit');
  const fr2 = FG.metrics(g).finAreaFractions;
  for (const k in AREA_CAP) if (fr2[k] > AREA_CAP[k]) fail('fins', `${k} fin area ${fr2[k]} exceeds ${AREA_CAP[k]} of body area`);
  if ((f.adipose.present && !FL.accessoryBand) || f.finlets.count) fail('fins', 'non-standard fin present');
  /* ── mouth, jaw, gills ── */
  if (lm.mouthCorner < .01 || lm.mouthCorner > lm.operculum * .98) fail('mouth_gills', 'mouth corner not within the head');
  if (bm.jawStartU >= lm.mouthCorner) fail('mouth_gills', 'jaw not connected to the mouth');
  if (g.mouth.teeth === 'none' ? g.mouth.teethCount !== 0 : g.mouth.teethCount < 1) fail('mouth_gills', 'teeth / mouth mismatch');
  if (lm.gillStart < lm.eye + bm.eyeR / L && fam === 'rayfin') fail('mouth_gills', 'gill opening level with the eye');
  if (lm.gillStart < lm.mouthCorner || lm.gillEnd > lm.operculum + 1e-6 || lm.operculum > .5) fail('mouth_gills', 'gill openings not behind the head');
  if (fam === 'rayfin' && !g.head.operculum) fail('mouth_gills', 'rayfin without a gill cover');
  /* ── body profile: smooth, continuous, unimodal; spine free of kinks and self-intersection ── */
  const N = 140, D = [], W = []; let dm = 0;
  for (let i = 0; i <= N; i++) { const uu = .04 + .955 * i / N; D.push(bp.depth(uu)); W.push(bp.width(uu)); dm = Math.max(dm, D[i]); }
  let dsign = 0, flips = 0, wflips = 0, wsign = 0;
  for (let i = 1; i < N; i++) {
    if (!(D[i] > 0) || !(W[i] > 0)) fail('profile', 'zero-thickness section'); 
    if (Math.abs(D[i + 1] - 2 * D[i] + D[i - 1]) > .035 * dm) { fail('profile', 'kink in the depth profile'); break; }
  }
  for (let i = 0; i < N; i++) {
    const d = D[i + 1] - D[i]; if (Math.abs(d) > 2e-4 * dm) { const sg = Math.sign(d); if (dsign && sg !== dsign) flips++; dsign = sg; }
    const w = W[i + 1] - W[i]; if (Math.abs(w) > 2e-4 * dm) { const sg = Math.sign(w); if (wsign && sg !== wsign) wflips++; wsign = sg; }
  }
  if (flips > 1 || wflips > 2) fail('profile', 'lumpy profile (not unimodal)');
  if (bp.depth(.97) > .75 * dm || bp.depth(.97) < .02 * dm) fail('profile', 'peduncle outside natural taper');
  const sp = bm.spine; let turn = 0, maxStep = 0;
  for (let i = 1; i < sp.length; i++) { const d = Math.abs(sp[i].phi - sp[i - 1].phi); maxStep = Math.max(maxStep, d); turn += d; }
  if (!clade.curl && (turn > .02)) fail('profile', 'twisted spine');
  let d2 = 0; for (let i = 2; i < sp.length; i++) d2 = Math.max(d2, Math.abs(sp[i].phi - 2 * sp[i - 1].phi + sp[i - 2].phi));
  if (clade.curl && (maxStep > .3 || d2 > .12 || turn > 2 * Math.PI * 1.3)) fail('profile', 'spine curl is not smooth');
  if (clade.curl) {
    for (let i = 0; i < sp.length; i += 4) for (let j = i + 10; j < sp.length; j += 4) {
      const ri = bp.depth(i / (sp.length - 1)) * L * .5, rj = bp.depth(j / (sp.length - 1)) * L * .5;
      if ((j - i) * L / (sp.length - 1) > 2.5 * (ri + rj) && Math.hypot(sp[i].x - sp[j].x, sp[i].y - sp[j].y) < (ri + rj) * 1.05) { fail('profile', 'body self-intersects'); i = 1e9; break; }
    }
  }
  if (g.body.roll !== 0 && !clade.flat) fail('symmetry', 'body rolled outside flatfish');
  if (clade.flat && Math.abs(g.body.roll) !== 90) fail('symmetry', 'flatfish lies on its side');
  /* ── colour (final engine values) ── */
  if (g.skin.photophores > 0 && !clade.deep) fail('colour', 'photophores outside deep-sea clade');
  if (g.skin.base[1] > .86 || g.skin.base[2] > .63) fail('colour', 'unnatural engine colour');
  return F;
}

/** Complete gate. engine-backed stage runs only when the pure stage passes. */
export function validate(t, g, FG) {
  const F = checkTraits(t);
  if (!F.length && g && FG) F.push(...checkEngine(t, g, FG));
  const failed = new Set(F.map(x => x.inv));
  const passed = {}; for (const i of INVARIANTS) passed[i] = !failed.has(i);
  return { ok: F.length === 0, failures: F, passed };
}
