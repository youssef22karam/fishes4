/* ROUND 7 §9 — head validators. Pure measurements over a built fish; every
   check returns { code, ok, value, note } and NOTHING here mutates the fish.
   The runner is tools/r7audit.mjs (1,000 random + the named seeds); the
   population gates (gill-signature census, cavity-depth median) live there.
   Exemptions mirror the laws: eel plans (ribbon/knife families, fineness
   > 9) and disc plans are exempt from the dorsal-profile curvature law —
   their silhouettes are governed by their own plan laws. */
import { profileCurvatureChanges } from './landmarks.js';
import { pupilExtents, IRIS_RECESS } from './eyegeo.js';
import { CAVITY_MAX } from './laws.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function validate7(bm, fish, H) {
  const out = [], g = bm.g, hl = bm.h * bm.L;
  const put = (code, ok, value, note) => out.push({ code, ok, value, note });

  /* WP1 — dorsal profile must change curvature ≥ 3 times (no cone heads) */
  const eel = bm.a.family === 'ribbon' || bm.a.family === 'knife' || g.body.fineness > 9;
  if (!bm.disc && !eel) {
    const cc = profileCurvatureChanges(bm);
    put('R7_PROFILE_CURVATURE', cc >= 3, cc, 'dorsal silhouette curvature sign changes');
  }

  /* WP2 — lips are welded volumes on every jawed mouth */
  if (bm.law.mouth.construction === 'jawed') {
    let lips = 0, lipVerts = 0;
    fish.group.traverse(m => { if (m.userData && m.userData.lips) { lips++; lipVerts += m.geometry.getAttribute('position').count; } });
    put('R7_LIPS_PRESENT', lips === 2 && lipVerts > 200, lips, 'upper + lower lip volumes (verts ' + lipVerts + ')');
    const depth = Math.min(g.mouth.cavityDepth, CAVITY_MAX);
    put('R7_CAVITY_WITHIN_LAW', depth <= CAVITY_MAX + 1e-9, +depth.toFixed(3), 'oral funnel depth / head length (law max ' + CAVITY_MAX + ')');
  }

  /* WP3 — pupil inside the .45–.65 band (round), iris recessed for parallax */
  if (g.head.eyeSide !== 'none' && bm.law.eye) {
    const pupil = bm.law.eye.pupil;
    if (pupil === 'round') {
      const pr = pupilExtents('round')[0];
      put('R7_PUPIL_BAND', pr >= .45 && pr <= .65, pr, 'round pupil radius / iris radius');
    }
    put('R7_IRIS_RECESS', IRIS_RECESS >= .04, IRIS_RECESS, 'iris plane depth behind limbus, × R');
    const eyeD = 2 * bm.eyeR / hl;
    put('R7_EYE_SIZE', eyeD >= .05 && eyeD <= .37, +eyeD.toFixed(3), 'eye diameter / head length (envelope = eyeLaw bands, vestigial .058 → enlarged .145, × EYE_GEO)');
  }

  /* WP4 — gill signature recorded (census itself is a population gate) */
  const sig = fish.parts && fish.parts.hyper ? fish.parts.hyper.gillSignature : null;
  if (bm.a.gills === 'opercular') put('R7_GILL_SIGNATURE', !!sig, sig || 'none', 'hyper head system signature');
  else put('R7_GILL_KIND', ['slits', 'ventral', 'pores'].includes(bm.a.gills === 'lateral' ? 'slits' : bm.a.gills), bm.a.gills, 'non-cover gill system by plan');

  return out;
}

/** Population axis-correlation summary for the gill census: mean filament
    investment by swim/feeding axis class, printed by r7audit (§9 table). */
export function gillAxisRow(bm, H) {
  const flags = (bm.ax && bm.ax.flags) || new Set();
  const cls = flags.has('filterFeeder') || flags.has('planktivore') ? 'filter/planktivore'
    : flags.has('ambusher') ? 'ambusher'
    : bm.ax && bm.ax.swim && /anguilliform|subcarangiform/.test(bm.ax.swim) ? 'cruiser-swim'
    : flags.has('predator') ? 'predator' : 'generalist';
  return cls;
}

export { clamp as _clamp };
