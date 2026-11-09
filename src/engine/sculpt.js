/* ROUND 7 / WP1 + STATE-OF-THE-ART CRANIAL & JAW SCULPT — head sculpt
   (Strategy B: landmark-driven shaping inside the body loft, so the head
   stays ONE manifold surface with the body and every consumer of
   bm.section / bm.point — jaw, cavity, eyes, cover sampler, validators —
   sees the same sculpted surface). */
import { head2Params } from './landmarks.js';

export { head2Params, headLandmarks, dorsalProfile, profileCurvatureChanges } from './landmarks.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const gauss = (x) => Math.exp(-x * x);
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** Station-profile shaping. Called from BodyModel.section() after the
    legacy head terms, before the hammer special (which must win). */
export function sculptSection(bm, u, s) {
  const h = bm.h;
  if (u > h * 1.5 || u < 0) return;
  const P = head2Params(bm), D = bm.maxD, damp = 1 - P.eel;
  const u0 = Math.max(0.004, bm.jawStartU || 0.004);
  const uc = Math.max(u0 + 0.01, bm.mcU || h * 0.35);
  const jawSpan = Math.max(0.015, uc - u0);

  /* dorsal profile: premaxillary/rostral arch, forehead lobe, post-orbit saddle, nape lobe */
  s.dUp += D * damp * (
    0.080 * P.forehead * gauss((u - h * 0.42) / (h * 0.20))
    - 0.035 * P.saddle * gauss((u - h * 0.80) / (h * 0.10))
    + 0.060 * P.nape * gauss((u - h * 0.99) / (h * 0.16)));

  /* ventral jaw & chin contour:
     - selachian / inferior mouths: flattened subrostral overhang ahead of jawStartU
     - prognathous / terminal predators: fuller mandibular symphysis & retroarticular corner
     - gular undercut behind the jaw joint */
  if (P.isSelachian && u < u0 * 1.15) {
    const subF = 1 - sstep(u0 * 0.55, u0 * 1.15, u);
    s.dDn *= 1 - 0.14 * subF;
  } else if (P.prognathous > 0.05 && u < uc * 1.1) {
    const chinBell = gauss((u - (u0 + jawSpan * 0.24)) / (jawSpan * 0.32));
    const cornerAng = gauss((u - uc * 0.92) / (jawSpan * 0.22));
    s.dDn *= 1 + (0.075 * P.prognathous * chinBell + 0.045 * P.symphysis * cornerAng) * damp;
  }
  s.dDn *= 1 - 0.13 * P.undercut * gauss((u - (P.uHinge + h * 0.05)) / (h * 0.13));

  /* dorsoventrally depressed benthic heads (catfish, sculpin): broader & slightly lower crown */
  if (P.depressed > 0.05 && u < h * 0.78) {
    const depBell = gauss((u - h * 0.32) / (h * 0.26));
    s.w *= 1 + 0.12 * P.depressed * depBell;
  }

  /* width: cheek adductor mass, throat (isthmus) narrowing, U-shaped dental arch planform */
  const archSpan = clamp(jawSpan * 0.65, h * 0.08, h * 0.24);
  const dentalArchU = (P.snoutRound - 0.42) * 0.16 * gauss((u - (u0 + archSpan * 0.45)) / archSpan);
  s.w *= 1
    + 0.10 * P.cheek * gauss((u - h * 0.74) / (h * 0.20))
    - 0.16 * P.throat * gauss((u - h * 1.03) / (h * 0.15))
    + dentalArchU;
  if (s.coreW !== undefined) s.coreW = s.w;
}

/** Angular shaping. Called from BodyModel.point() on the final (ly, lz);
    returns a radial scale factor (direction-preserving, so normals stay
    sane). Orbit dome: upper-lateral band at the eye station. Cheek &
    maxillary/dentary bone contours: subtle lateral facial structure. */
export function sculptPoint(bm, u, theta, s) {
  const h = bm.h;
  if (u > h * 1.35 || u < 0) return 1;
  const P = head2Params(bm);
  const st = Math.sin(theta), ct = Math.cos(theta);
  const lat = Math.abs(ct);                                   /* 1 at the side, 0 at top/belly */
  let k = 1;
  /* orbit dome — lateral, slightly dorsal of the midline, with a NOTCH
     carved over the eye's own seat footprint in (u, ly) surface space */
  const oBand = sstep(0.35, 0.75, lat) * sstep(-0.15, 0.25, st) * (1 - sstep(0.75, 1.0, st));
  const nE = st > 0 ? s.nD : s.nV, yRE = st > 0 ? s.dUp : s.dDn;
  const lyE = Math.sign(st) * Math.pow(Math.abs(st), 2 / nE) * yRE;
  const eyeU = clamp(bm.eyeR / Math.max(1e-9, bm.L), 0.02, 0.12);
  const notch = gauss((u - P.uEye) / (eyeU * 3.4)) * gauss((lyE - bm.eyeY) / (bm.eyeR * 3.2));
  k += 0.06 * P.orbit * gauss((u - P.uEye) / (h * 0.16)) * oBand * (1 - notch);

  /* cheek / adductor bulge — lateral, ventral half (kept inside audit slack 1.02) */
  const cBand = sstep(0.45, 0.8, lat) * (1 - sstep(0.1, 0.55, st)) * sstep(-1.0, -0.55, st);
  k += 0.012 * P.cheek * gauss((u - h * 0.74) / (h * 0.2)) * cBand;

  /* maxillary / lachrymal preorbital bone contour above the mouth corner (kept <= 0.008 for audit slack) */
  const uc = bm.mcU || h * 0.35, u0 = bm.jawStartU || 0.004;
  if (P.maxillaW > 0.1 && u >= u0 && u <= uc * 1.15) {
    const mxBand = sstep(0.55, 0.92, lat) * sstep(-0.35, 0.05, st) * (1 - sstep(0.25, 0.65, st));
    k += 0.0075 * P.maxillaW * gauss((u - (u0 + 0.68 * (uc - u0))) / Math.max(0.015, 0.38 * (uc - u0))) * (1 - notch) * mxBand;
  }
  return k;
}

/** Extra loft stations so the sculpt curves and mouth corners are resolved by the mesh. */
export function extraStations(bm) {
  if (bm.lod) return [];
  const out = [], h = bm.h;
  for (let u = 0.005; u < h * 1.3; u += h / 26) out.push(u);
  const u0 = bm.jawStartU || 0.004, uc = bm.mcU || h * 0.35;
  for (const f of [0, 0.15, 0.35, 0.6, 0.85, 0.96, 1.0, 1.05]) {
    const u = u0 + (uc - u0) * f;
    if (u > 0.005 && u < h * 1.25) out.push(u);
  }
  return out;
}
