import { checkPec } from './finmotion.js';
const FG_JAW_MAX = 40;
/* ANATOMY AUDIT — geometry-level validation for barbels / filaments, eyes, jaws + mouth, gills and the head–body junction.
   Called from checkFishGeometry (so it runs for every fish in the 1,000-creature coherence gate and in the in-app tests).
   Every rule reads only axes (plan / niche / swim / depth) and measured geometry — nothing is keyed to a named animal. */
import { auditLaws } from './lawaudit.js';
import { APPENDAGE_CAP, barbelLaw, lureLaw, whipLen } from './laws.js';
import { EYE_PROTRUSION_MIN, EYE_PROTRUSION_MAX } from './eyeband.js';
import { auditHead } from './headaudit.js';
import { OP } from './headlaw.js';
import { auditCoherence } from './coherence.js';

const EPS = 1e-6;
export function auditAnatomy(fish, THREE) {
  const E = [], bm = fish.bm, g = bm.g, L = bm.L, lm = bm.lm, head = bm.h * L, ax = bm.ax, M = bm.law.mouth, flat = bm.law.flat && bm.law.flat.flat >= 1;
  const err = m => E.push(m);
  const detail = fish.info.quality !== 'lod';
  const span = Math.max(bm.maxD, bm.bp.width(lm.operculum) * L, bm.bp.width(bm.mcU) * L, bm.bp.width(.5 * bm.h) * L);   /* local section size: sets the loft-chord tolerance */
  /* ── 1. barbels & filaments: stations/count in plan bounds, hard length caps, roots attached ── */
  if (detail) {
    const B = barbelLaw(ax, M), plan = bm.barbelPlan || { items: [], pairs: 0 }, ap = bm.appendages || {};
    if (plan.pairs > B.maxPairs || plan.pairs > APPENDAGE_CAP.pairsMax) err('barbel pairs exceed the plan bound');
    if (!B.eligible && plan.items.length) err('barbels on an open-water / ineligible plan');
    for (const it of plan.items) if (it.kind !== 'chin' && !B.order.includes(it.kind)) err('barbel station not in the plan set');
    const sides = (ap.barbels || []).filter(b => b.side);
    if (sides.length % 2) err('barbels not symmetric');
    for (const b of ap.barbels || []) {
      const cap = Math.min(b.kind === 'chin' ? APPENDAGE_CAP.chinHead * head : APPENDAGE_CAP.barbelHead * head, APPENDAGE_CAP.barbelBody * L);
      if (b.len > cap * 1.03 + EPS) err(`barbel ${b.kind} longer than its cap`);
      if (b.seg < 8) err('barbel not built from segments');
      if (!(b.rootErr <= span * .03)) err('barbel root detached from the skin');
      if (b.side && b.root.z * b.tip.z < 0) err('barbel crosses the midline');
    }
    if (ap.lure) { if (!lureLaw(g, ax).allowed) err('lure outside ambush / deep niches'); if (ap.lure.reach > APPENDAGE_CAP.lureBody * L * 1.001 || ap.lure.len > APPENDAGE_CAP.lureBody * L * 1.02) err('lure longer than 0.6 body length'); if (!ap.lure.hasBulb) err('lure without a tip structure'); if (!(ap.lure.rootErr <= span * .03)) err('lure root detached'); }
    if (ap.whip && ap.whip.len > APPENDAGE_CAP.whipBody * L * 1.02) err('tail filament longer than its cap');
    if (g.head.special === 'esca' && !ap.lure && lureLaw(g, ax).allowed) err('lure missing');
  }
  /* ── 2. eyes: two real socketed spheres with anchored iris + pupil, symmetric in front projection ── */
  if (detail && g.head.eyeSide !== 'none') {
    const infos = bm.eyes || [], mesh = fish.group.children.find(m => m.userData && m.userData.eyeball);
    if (infos.length !== 2) err('not exactly two eyes');
    if (!mesh || mesh.geometry.getAttribute('position').count < 100) err('eyeball mesh missing (decal / billboard?)');
    else if (!infos.every(i => i.vestigial)) {
      const k = mesh.geometry.getAttribute('aEye'), seen = new Set(); for (let i = 0; i < k.count; i++) seen.add(Math.round(k.getZ(i)));
      for (const need of [0, 1, 2, 5]) if (!seen.has(need)) err('eyeball lacks sclera / iris / pupil geometry');
    }
    for (const i of infos) { if (i.protrusion > EYE_PROTRUSION_MAX + 1e-9 || (!i.vestigial && i.protrusion < EYE_PROTRUSION_MIN - 1e-9)) err('eye protrudes more than a third of its diameter'); if (!i.vestigial && !(i.irisRecess > 0)) err('iris not recessed'); }
    if (infos.length === 2 && g.head.eyeSide === 'both') {
      const [a, b] = infos.map(i => i.center);
      if (Math.abs(a.z + b.z) > 5e-4 * L || Math.abs(a.y - b.y) > 5e-4 * L || Math.abs(a.x - b.x) > 5e-4 * L) err('eyes not symmetric in front projection');
      if (!flat && a.z * b.z >= 0) err('eyes not on opposite sides');
    }
  }
  /* ── 3. jaws & mouth: seam not ring, hinge behind the eye line, resting opening 0 ── */
  if (detail) {
    if (bm.hingeU + EPS < Math.min(lm.eye, g.head.lengthFrac * g.head.gillStart - .006) && M.construction === 'jawed') err('jaw hinge in front of the eye line');
    if (fish.uniforms.uJawAngle.value !== 0 || fish.uniforms.uJawProtrude.value !== 0) err('resting mouth opening is not 0');
    if (M.construction === 'jawed' && !bm.oralDisc && !bm.ventralMouth && (fish.uniforms.uJawOpenMax.value > (FG_JAW_MAX + 1e-6) * Math.PI / 180 || !fish.parts.jaw)) err('jaw rotation limit / one-piece lower jaw');
    for (const m of fish.group.children) if (m.userData.mouthPart && /Torus|Tube/.test(m.geometry.type)) err('torus / tube used for a mouth');
    for (const e of checkPec(fish.info.pec)) err('side fin: ' + e);
    for (const m of fish.group.children) if (m.userData.mouthPart && /Torus|Tube/.test(m.geometry.type) && (M.construction === 'jawed' || M.construction === 'fused')) err('ring / torus geometry in the mouth build');
    if (M.construction === 'jawed' && !bm.oralDisc && !bm.ventralMouth) {
      if (!fish.parts.jaw) err('hinged lower jaw missing');
      if (bm.protrusile && !fish.parts.upperJaw) err('protruding niche without an upper-jaw mechanism');
      if (!bm.protrusile && fish.parts.upperJaw) err('upper-jaw slide on a non-protruding niche');
      for (const key of ['jaw', 'upperJaw']) { const m = fish.parts[key]; if (!m) continue; const ab = m.geometry.getAttribute('aBody'), n = ab.count, row = Math.floor(n / 16.0) ; /* last station row: movement weight 0 so the junction never separates */
        for (let i = n - 17; i < n; i++) if (ab.getW(i) > 1e-6 && key === 'jaw') { err('jaw patch moves at its junction'); break; } }
      const inter = fish.group.children.filter(m => m.userData.mouthPart && m.userData.layer);
      const layers = new Set(inter.map(m => m.userData.layer)); for (const l of ['walls', 'tongue', 'arches']) if (!layers.has(l)) err('mouth interior lacks layer ' + l);
    }
  }
  /* ── 4. gills: system type matches plan; counts unchanged ── */
  { const kind = bm.a.gills, slits = g.head.gillSlits;
    if (kind === 'opercular') { if (detail && !fish.parts.operculum && !fish.parts.hyper) err('bony plan without an operculum'); }
    else if (kind === 'lateral') { if (slits < 5 || slits > 7) err('cartilaginous slit count outside 5–7'); if (fish.parts.operculum) err('slits and operculum together'); }
    else if (kind === 'ventral') { if (slits !== 5) err('flattened plan without 5 slit pairs'); if (fish.parts.operculum) err('slits and operculum together'); } }
  /* ── 5. head–body junction ── */
  { const s0 = {}, s1 = {}, s2 = {}, u = lm.operculum, e = .006; let worst = 0, worstW = 0;
    if (!flat && !bm.billStart) for (const uu of [u * .9, u, u * 1.1]) { bm.section(uu - e, s0); bm.section(uu, s1); bm.section(uu + e, s2);
      const f = s => s.dUp + s.dDn; worst = Math.max(worst, Math.abs(f(s0) - 2 * f(s1) + f(s2)) / bm.maxD); worstW = Math.max(worstW, Math.abs(s0.w - 2 * s1.w + s2.w) / bm.maxD); }
    if (worst > .03) err('side-silhouette step at the head–trunk junction'); if (worstW > .03) err('top-silhouette step at the head–trunk junction');
    if (detail && fish.parts.operculum && bm.loft) {
      const og = fish.parts.operculum.geometry, P = og.getAttribute('position'), A = og.getAttribute('aBody'), out = {}, ref = {}; let worstMargin = 0, worstPlate = 0, patt = 0;
      const R = bm.loft.R, tolMargin = span * (.0012 + (1 - Math.cos(Math.PI / R)) * 1.2 + .004), tolPlate = span * (OP.height * OP.crest * 1.12 + (1 - Math.cos(Math.PI / R)) * 1.2 + .004);   /* round 5A: the plate stands proud by design; its crest is bounded, the wall's foot (tag 3.28) must lie on the trunk */
      for (let i = 0; i < P.count; i++) {
        const uu = A.getX(i), th = A.getY(i) * Math.PI * 2 - Math.PI / 2, tag = A.getZ(i);
        bm.sampleLoft(uu, th, out); const d = Math.hypot(P.getX(i) - out.x, P.getY(i) - out.y, P.getZ(i) - out.z);
        bm.sampleLoft(uu, th, ref, 'aBody'); if (A.getY(i) < 1 - 1.5 / R) { const da = Math.abs(ref.y - A.getY(i)); patt = Math.max(patt, Math.abs(ref.x - uu), da); }   /* (the loft's wrap cell is excluded: angle 1 ≡ 0) */
        if (tag > 3.27 && tag < 3.3) worstMargin = Math.max(worstMargin, d); else worstPlate = Math.max(worstPlate, d);
      }
      if (worstMargin > tolMargin) err('operculum free margin floats off the body'); if (worstPlate > tolPlate) err('operculum plate floats off the body'); if (patt > 1e-5) err('pattern offset across the junction');
    }
    if (detail && bm.loft && !(bm.loft.geo.getIndex().count > 0)) err('body loft missing');
  }
  E.push(...auditLaws(fish));
  E.push(...auditHead(fish, THREE));
  if (detail) E.push(...auditCoherence(fish, THREE).map(v => v.code + ': ' + v.msg));   /* round 6H: laws L1–L6 (shared audit) */
  return E;
}
