/* LAW AUDIT — measured assertions over a built creature: eyes, mouth constructions, flattened-plan surfaces.
   Every rule reads only axes (plan / niche / swim / depth) and measured geometry — nothing is keyed to a named animal. */
import { gapeLimit, eyeRoom, EYE_GEO, eyeLaw, mouthLaw, DISC_DEPTH_MAX, TUBE_MAX, CAVITY_MAX } from './laws.js';
import { EYE_PROTRUSION_MIN, EYE_PROTRUSION_MAX } from './eyeband.js';

export function auditLaws(fish) {
  const E = [], err = m => E.push(m), bm = fish.bm, g = bm.g, L = bm.L, headL = bm.h * L, ax = bm.ax, EL = bm.law.eye, M = bm.law.mouth;
  const flat = bm.law.flat && bm.law.flat.flat >= 1, half = bm.law.flat && bm.law.flat.flat > 0 && !flat;
  const detail = fish.info.quality !== 'lod';
  /* ── eyes: count, protrusion, diameter ratio, placement by plan ── */
  const eyes = bm.eyes || [];
  if (g.head.eyeSide !== 'none' && eyes.length !== 2) err('eye count is not exactly 2');
  for (const e of eyes) {
    if (e.protrusion > EYE_PROTRUSION_MAX + 1e-9) err('eye protrusion above 1/3 of its diameter');
    if (!e.vestigial && e.protrusion < EYE_PROTRUSION_MIN - 1e-9) err('eye buried below cornea clearance');
    const ratio = 2 * e.R / headL;
    if (ratio > EL.ratioBand[1] * 1.02 + 1e-6) err(`eye ${ratio.toFixed(3)} of head above the ${EL.regime} band`);
    if (ratio < Math.min(EL.ratioBand[0], eyeRoom(g, bm.bp, bm.h) * EYE_GEO) * .97 - 1e-6) err(`eye ${ratio.toFixed(3)} of head below the ${EL.regime} band`);
    if (EL.vestigial && ratio > EL.ratioBand[1] * 1.02) err('lightless eye is not vestigial');
  }
  if (detail && eyes.length === 2) {
    const [a, b] = eyes;
    if (EL.placement === 'dorsal' && !(a.axis.y > .5 && b.axis.y > .5)) err('flattened plan: eye not on the top surface');
    if (EL.placement === 'lateral' && !(Math.abs(a.axis.z) > .35 && Math.abs(b.axis.z) > .35)) err('eye not on the head side');
    if (EL.placement === 'oneSide' && a.center.z * b.center.z <= 0) err('side-flattened plan: both eyes not on one side');
    if (EL.placement === 'lateralExtremity' && !(Math.abs(a.center.z) > bm.eyeR * 2)) err('expanded head: eyes not at the lateral extremity');
  }
  /* ── flattened plan: absolute top / bottom surface rules ── */
  if (flat && detail) {
    const eyeY = eyes.length ? (eyes[0].center.y + eyes[1].center.y) / 2 : 0;
    for (const m of fish.group.children) {
      const nos = m.userData.nostrils; if (nos) for (const n of nos) if (n.type === 1 && !(n.ny > .3)) err('flattened plan: spiracle not on the top surface');
      if (m.userData.ventral && !(m.userData.ventral.y < eyeY - bm.maxD * .02)) err('flattened plan: mouth not on the bottom surface');
    }
    if (!bm.ventralMouth) err('flattened plan: no ventral mouth');
    if (g.head.gillSlits !== 5 || !g.head.spiracles) err('flattened plan: 5 gill pairs / spiracles missing');
  }

  /* ── mouth special constructions ── */
  if (detail) {
    for (const m of fish.group.children) {
      const d = m.userData.disc; if (!d) continue;
      if (!d.front) {
        if (d.depth > DISC_DEPTH_MAX * d.headL + 1e-9) err('sucker disc deeper than 0.1 head length');
        if (!(d.normalY < -.3)) err('sucker disc not on the underside of the head');
      } else if (d.depth > DISC_DEPTH_MAX * d.headL) err('tube cap too deep');
    }
    if (M.construction === 'fused' && (fish.uniforms.uJawOpenMax.value !== 0 || fish.parts.jaw)) err('fused mouth has an open cavity or hinged jaw');
    if (M.construction === 'sucker' && !bm.oralDisc) err('sucker construction without a disc');
    const reach = (bm.protrusile ? L * .03 : 0);
    if (M.construction === 'jawed' && !M.picking && bm.protrusile && M.orientation === 'up') err('protrusion on a non-picking niche');
    if (g.mouth.gape < Math.min(M.gape[0], gapeLimit(g, bm.bp, bm.h)) - .02) err(`gape ${g.mouth.gape.toFixed(2)} below the niche band`);
    if (g.mouth.gape > M.gape[1] + 1e-6) err('gape above the niche band');
    if (reach > TUBE_MAX * headL) err('mouth tube longer than 0.5 head length');
    if (g.mouth.cavityDepth > CAVITY_MAX + 1e-9) err('cavity deeper than CAVITY_MAX head length');
  }
  return E;
}
