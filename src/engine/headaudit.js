/* HEAD-STRUCTURE AUDIT (round 5A) — geometry-level checks for the three head items. Runs inside auditAnatomy (so inside checkFishGeometry / the coherence gate).
   Axes + measured geometry only; nothing is keyed to a named animal. */
import { OP, SLIT, VENTRAL, barbelLaw } from './headlaw.js';
import { kindOf } from './gillgeo.js';

export function auditHead(fish, THREE) {
  const E = [], err = m => E.push(m), bm = fish.bm, g = bm.g, ax = bm.ax, M = bm.law.mouth, L = bm.L, h = bm.h, lm = bm.lm, detail = fish.info.quality !== 'lod';
  if (!detail) return E;
  const fr = {}, s = {};
  /* ── ITEM 3: barbels only on bottom niches; one layout per fish; count = layout; roots attached; free length outside the head ── */
  { const B = barbelLaw(ax, M), ap = (bm.appendages && bm.appendages.barbels) || [], plan = bm.barbelPlan || { items: [], layout: 'none' };
    if (ap.length && !B.bottom) err('barbels on a non-bottom feeding niche');
    if (ap.length && !B.eligible) err('barbels on an ineligible plan');
    if (B.eligible && ap.length !== B.count) err(`barbel count ${ap.length} != layout count ${B.count}`);
    if (g.head.barbels !== (B.eligible ? B.count : 0) && !(g.head.barbels === 0 && !B.eligible)) err('genome barbel count disagrees with the law');
    const kinds = new Set(ap.map(b => b.kind === 'chin' ? 'median' : 'multi')); if (kinds.size > 1) err('mixed barbel layouts on one fish');
    if (ap.length && B.layout === 'median' && (ap.length !== 1 || ap[0].kind !== 'chin' || ap[0].side)) err('median layout is not a single midline chin barbel');
    if (ap.length && B.layout === 'multi' && (ap.some(b => b.kind === 'chin') || ap.some(b => !b.side))) err('paired layout contains a median barbel');
    if (plan.layout !== (B.eligible ? B.layout : 'none')) err('barbel plan layout disagrees with the law');
    const inBody = (p, k) => { const u = Math.min(.999, Math.max(.003, (bm.headX - p.x) / L)); bm.frame(u, fr); bm.section(u, s); const ly = (p.x - fr.px) * fr.nx + (p.y - fr.py) * fr.ny; return ly > -s.dDn * k && ly < s.dUp * k && Math.abs(p.z) <= bm.halfWidthAtY(s, Math.max(-s.dDn * .99, Math.min(s.dUp * .99, ly))) * k + 1e-6; };
    for (const b of ap) { if (b.len < .05 * h * L) err('barbel shorter than 5% of the head'); if (b.path) for (let i = 3; i < b.path.length; i++) if (inBody(b.path[i], .9)) { err('barbel pierces the head / jaw'); break; } }
  }
  /* ── ITEM 1: gills read ── */
  { const k = kindOf(bm), gm = fish.group.children.find(m => m.userData && m.userData.gills);
    if (k === 'cover') {
      const op = fish.parts.operculum; if (!op) { if (!fish.parts.hyper) err('bony plan without an operculum'); }   /* hyper head system: separate hinged cover pieces (hyper/gillchamber.js) replace the painted plate */
      else { const P = op.geometry.getAttribute('position'), A = op.geometry.getAttribute('aBody'), q = {}; let wall = 0, tall = 0;
        for (let i = 0; i < P.count; i++) { if (Math.abs(A.getZ(i) - 3.25) > 1e-4 || A.getW(i) < .9 || P.getZ(i) < 0) continue; const th = (A.getY(i) - .25) * 2 * Math.PI; bm.sampleLoft(A.getX(i), th, q); const d = Math.hypot(P.getX(i) - q.x, P.getY(i) - q.y, P.getZ(i) - q.z); wall++; tall = Math.max(tall, d); }
        if (!wall) err('operculum has no rear edge wall'); else if (tall < .55 * OP.height * OP.crest * bm.maxD) err('operculum rear edge does not step above the trunk'); }
      if (!gm || gm.userData.gills !== 'cover') err('bony plan without a gill-opening slit'); else { const A = gm.geometry.getAttribute('aBody'); let core = 0; for (let i = 0; i < A.count; i++) if (A.getZ(i) > 6.24) core++; if (core < 20) err('gill opening has no dark interior'); }
    } else if (k === 'slits') {
      if (!gm || gm.userData.gills !== 'slits') err('cartilaginous plan without gill-slit geometry'); else {
        const A = gm.geometry.getAttribute('aBody'); let core = 0; for (let i = 0; i < A.count; i++) if (A.getZ(i) > 6.24) core++; if (core < 20 * g.head.gillSlits) err('gill slits have no dark interior');
        const n = g.head.gillSlits, q = {}, ss = {}; let bad = 0;       /* each opening is a recess in the loft: the rendered half-width at its centre is well below the un-cut section */
        for (let i = 0; i < n; i++) { const gu = lm.gillStart + (lm.gillEnd - lm.gillStart) * (i + .5) / n + g.head.gillSlant * h * .06; bm.sampleLoft(gu, 0, q); bm.section(gu, ss); if (!(ss.w - Math.abs(q.z) > .5 * SLIT.depth * ss.w)) bad++; }
        if (bad) err(`${bad} gill slit(s) are not cut into the surface`); }
    }
  }
  /* ── ITEM 2: ventral mouth on the cartilaginous plan ── */
  if (M.ventral) {
    if (g.mouth.type !== 'inferior') err('cartilaginous plan mouth is not inferior');
    const j0 = bm.jawStartU; bm.section(j0, s);
    if (!(j0 >= Math.min(VENTRAL.minSet * h, bm.mcU * .5) - 1e-9)) err('cartilaginous mouth not set back from the snout tip');
    if (!(bm.mouthLineY(Math.max(j0, .004), s) < -.2 * s.dDn)) err('cartilaginous lip line is not under the head');
    if (!(bm.mouthLineY(bm.mcU, bm.section(bm.mcU, {})) < 0)) err('cartilaginous mouth corner above the mid-line');
  }
  return E;
}
