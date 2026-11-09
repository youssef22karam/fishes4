/* EYE ORGAN — one real 3D eyeball per eye, identical from every viewpoint (no billboard, decal, sprite or view-dependent trick).
   A sphere of radius R is SEATED in the head (centre EYE_SEAT radii below the skin, so the dome protrudes ≤ 1/3 diameter) and carries its anatomy in geometry:
     · sclera shell  — the sphere with the corneal cap removed (limbus at polar angle LIMBUS)
     · limbal funnel — short collar from the limbus down to the recessed iris plane (the iris sits UNDER the cornea)
     · iris disc     — annulus recessed behind the limbus plane, inner boundary = pupil outline (round / vertical slit / horizontal)
     · pupil cup     — dark concave lens seen through the pupil opening (part of the eyeball itself)
     · cornea dome   — transparent cap, lit only by scene lighting
     · covers (clean on/off by plan/niche): clear adipose window over the front and rear edges; nictitating lower lid over the lower third.
   Vertex attribute aEye = (a, b, kind): kind 0 sclera · 1 iris (a = radial 0..1, b = angle) · 2 pupil · 3 cornea · 4 adipose · 5 limbal funnel · 6 nictitating lid.
   Everything is built in the head's own coordinates, so the eye moves with the head and mirrors exactly between sides. */
import { EYE_SEAT, EYE_SEAT_MAX, EYE_PROTRUSION_MAX, LIMBUS, CORNEA_REACH, CORNEA_CLEAR } from './eyeband.js';
export { LIMBUS, CORNEA_REACH };
export const IRIS_RECESS = .055;      /* iris plane depth behind the limbus plane, in eyeball radii — round 7 WP3: deepened from .03 so the iris sits visibly BEHIND the cornea and shifts with the view vector (true geometric parallax) */

/** pupil half-extents (fraction of the iris radius) along the head-forward (tu) and head-up (tv) directions */
export function pupilExtents(pupil) {
  return pupil === 'vertical' ? [.17, .62] : pupil === 'horizontal' ? [.64, .18] : [.5, .5];   /* round 7 WP3: round pupil radius .38 → .50 of the iris radius (spec band .45–.65); slits keep their niche shapes */
}
const pupilRadius = (ext, phi) => { const a = ext[0], b = ext[1], c = Math.cos(phi), s = Math.sin(phi); return 1 / Math.sqrt((c / a) * (c / a) + (s / b) * (s / b)); };

/** orthonormal eye frame: a = optical axis (outward), tu = head-forward tangent, tv = head-up tangent */
export function eyeFrame(THREE, axis, forward, up) {
  const a = axis.clone().normalize(), tu = forward.clone().addScaledVector(a, -forward.dot(a));
  if (tu.lengthSq() < 1e-8) tu.set(1, 0, 0).addScaledVector(a, -a.x); tu.normalize();
  const tv = new THREE.Vector3().crossVectors(a, tu).normalize(); if (tv.dot(up) < 0) tv.negate();
  return { a, tu, tv };
}

function makePart(THREE, rows, cols, wrap, fn, kind) {
  const pos = [], nor = [], eye = [], idx = [], nc = wrap ? cols : cols + 1;
  for (let i = 0; i <= rows; i++) for (let j = 0; j < nc; j++) { const r = fn(i / rows, wrap ? j / cols : j / cols); pos.push(r.p[0], r.p[1], r.p[2]); if (r.n) nor.push(r.n[0], r.n[1], r.n[2]); eye.push(r.e[0], r.e[1], kind === undefined ? r.e[2] : kind); }
  for (let i = 0; i < rows; i++) for (let j = 0; j < (wrap ? cols : cols); j++) { const a = i * nc + j, b = i * nc + (j + 1) % nc, c = (i + 1) * nc + j, d = (i + 1) * nc + (j + 1) % nc; idx.push(a, c, b, b, c, d); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('aEye', new THREE.Float32BufferAttribute(eye, 3)); geo.setIndex(idx);
  if (nor.length === pos.length) geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); else geo.computeVertexNormals();
  return geo;
}
/** make triangle winding agree with the intended outward direction fn(position) */
function orient(THREE, geo, fn) {
  const P = geo.getAttribute('position'), N = geo.getAttribute('normal'), v = new THREE.Vector3(); let s = 0;
  for (let i = 0; i < P.count; i++) { const o = fn(v.set(P.getX(i), P.getY(i), P.getZ(i))); s += N.getX(i) * o.x + N.getY(i) * o.y + N.getZ(i) * o.z; }
  if (s < 0) { const I = geo.getIndex(); for (let i = 0; i < I.count; i += 3) { const t = I.getX(i + 1); I.setX(i + 1, I.getX(i + 2)); I.setX(i + 2, t); } for (let i = 0; i < N.count; i++) N.setXYZ(i, -N.getX(i), -N.getY(i), -N.getZ(i)); }
  return geo;
}
function merge(THREE, list) {
  const pos = [], nor = [], eye = [], idx = []; let off = 0;
  for (const g of list) { const P = g.getAttribute('position'), N = g.getAttribute('normal'), E = g.getAttribute('aEye'), I = g.getIndex();
    for (let i = 0; i < P.count; i++) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(N.getX(i), N.getY(i), N.getZ(i)); eye.push(E.getX(i), E.getY(i), E.getZ(i)); }
    for (let i = 0; i < I.count; i++) idx.push(I.getX(i) + off); off += P.count; g.dispose(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('aEye', new THREE.Float32BufferAttribute(eye, 3)); geo.setIndex(idx); return geo;
}

/** spherical patch around polar axis P (cap region alpha ∈ [a0,a1] from P, azimuth β ∈ ±bHalf about the outward axis) at radius Rl */
function capPatch(THREE, c, Rl, P, A, Q, a0, a1, bHalf, kind, seg) {
  const nA = Math.max(3, Math.round(seg * .25)), nB = Math.max(6, Math.round(seg * .9));
  const g = makePart(THREE, nA, nB, false, (f, h) => {
    const al = a0 + (a1 - a0) * f, be = (h * 2 - 1) * bHalf, d = P.clone().multiplyScalar(Math.cos(al)).addScaledVector(A, Math.sin(al) * Math.cos(be)).addScaledVector(Q, Math.sin(al) * Math.sin(be));
    return { p: [c.x + d.x * Rl, c.y + d.y * Rl, c.z + d.z * Rl], n: [d.x, d.y, d.z], e: [al, be, kind] };
  });
  return orient(THREE, g, v => v.clone().sub(c));
}

/**
 * Build the organ for one eye.
 * spec = { center, axis, R, forward, up }; E = eye law ({pupil, covers}); seg = sphere segment count.
 * Returns { opaque: [geo…], glass: [geo…], info } (all in head coordinates).
 */
export function buildOrgan(THREE, spec, E, seg) {
  const { center: c, R } = spec, F = eyeFrame(THREE, spec.axis, spec.forward, spec.up), { a, tu, tv } = F, TAU = Math.PI * 2;
  const nP = seg <= 8 ? 8 : Math.max(12, Math.min(40, Math.round(seg * 1.6))), at = (z, r, phi) => [c.x + a.x * z + (tu.x * Math.cos(phi) + tv.x * Math.sin(phi)) * r, c.y + a.y * z + (tu.y * Math.cos(phi) + tv.y * Math.sin(phi)) * r, c.z + a.z * z + (tu.z * Math.cos(phi) + tv.z * Math.sin(phi)) * r];
  const dir = (th, phi) => { const s = Math.sin(th); return [a.x * Math.cos(th) + (tu.x * Math.cos(phi) + tv.x * Math.sin(phi)) * s, a.y * Math.cos(th) + (tu.y * Math.cos(phi) + tv.y * Math.sin(phi)) * s, a.z * Math.cos(th) + (tu.z * Math.cos(phi) + tv.z * Math.sin(phi)) * s]; };
  const opaque = [], glass = [], zLimb = R * Math.cos(LIMBUS), rLimb = R * Math.sin(LIMBUS), zIris = zLimb - IRIS_RECESS * R, zPup = zIris + .004 * R, ext = pupilExtents(E.pupil);
  /* sclera: the sphere minus the corneal cap */
  opaque.push(orient(THREE, makePart(THREE, Math.max(5, Math.round(nP * .5)), nP, true, (f, h) => { const th = LIMBUS + (Math.PI - LIMBUS) * f, phi = h * TAU, d = dir(th, phi); return { p: [c.x + d[0] * R, c.y + d[1] * R, c.z + d[2] * R], n: d, e: [th, phi, 0] }; }), v => v.clone().sub(c)));
  /* limbal funnel: collar from the limbus rim down to the recessed iris plane */
  opaque.push(orient(THREE, makePart(THREE, 2, nP, true, (f, h) => { const phi = h * TAU, z = lerp(zLimb, zIris, f), r = lerp(rLimb, rLimb * .985, f); return { p: at(z, r, phi), e: [0, phi, 5] }; }),
    v => { const d = v.clone().sub(c); d.addScaledVector(a, -d.dot(a)); return d.negate(); }));
  /* iris: annulus between the pupil outline and the limbal radius, on the recessed plane with a shallow conical dish toward the pupil */
  opaque.push(orient(THREE, makePart(THREE, nP <= 8 ? 2 : 6, nP, true, (f, h) => { const phi = h * TAU, ri = rLimb * .985, rp = rLimb * pupilRadius(ext, phi) * .985, r = lerp(rp, ri, f), z = lerp(zPup, zIris, Math.pow(f, .6)); return { p: at(z, r, phi), e: [f, phi, 1] }; }), v => a.clone()));
  /* pupil: concave dark lens cup behind the pupil opening */
  opaque.push(orient(THREE, makePart(THREE, nP <= 8 ? 2 : 4, nP, true, (f, h) => { const phi = h * TAU, rp = rLimb * pupilRadius(ext, phi) * .985, r = rp * (1 - f), z = zPup; return { p: at(z, Math.max(r, 1e-6), phi), e: [f, phi, 2] }; }), v => a.clone()));
  /* cornea: transparent dome continuing the sphere, a touch proud of it */
  glass.push(orient(THREE, makePart(THREE, Math.max(4, Math.round(nP * .3)), nP, true, (f, h) => { const th = (LIMBUS + .02) * f, phi = h * TAU, d = dir(th, phi), Rc = R * (1.012 + .012 * Math.cos(th * 1.9)); return { p: [c.x + d[0] * Rc, c.y + d[1] * Rc, c.z + d[2] * Rc], n: d, e: [th, phi, 3] }; }), v => v.clone().sub(c)));
  /* covers */
  const Rl = R * 1.045, Q = new THREE.Vector3();
  if (E.covers && E.covers.adipose) for (const sgn of [1, -1]) { const P = tu.clone().multiplyScalar(sgn); Q.crossVectors(P, a).normalize(); glass.push(capPatch(THREE, c, Rl, P, a, Q.clone(), 0, Math.PI / 2 - LIMBUS - .1, 1.5, 4, seg)); }
  if (E.covers && E.covers.nictitating) { const P = tv.clone().negate(); Q.crossVectors(P, a).normalize(); glass.push(capPatch(THREE, c, Rl, P, a, Q.clone(), 0, Math.acos(.33), 1.55, 6, seg)); }
  return { opaque, glass, merge: l => merge(THREE, l), info: { center: c.clone(), axis: a.clone(), R, u: spec.u, protrusion: (R - R * EYE_SEAT) / (2 * R), pupil: E.pupil, irisRecess: IRIS_RECESS, limbus: LIMBUS, covers: Object.assign({}, E.covers) } };
}
function lerp(a, b, t) { return a + (b - a) * t; }


/* ───────── ROUND 2.1: SKIN BLEND (replaces any ring / socket / frame part) ─────────
   The head SKIN flows up onto the eyeball: a single surface of revolution about the optical axis, built from the head's own skin material (the caller gives it the body
   material + skin attributes, so colour, pattern and pebbling are the head's). Its inner edge hugs the sphere just outside the corneal rim, so the dark sclera band is
   covered; it then falls with a zero-slope start (smoothstep²) to the head surface and sinks slightly UNDER it, so no edge is ever visible. Heights are measured against
   the real head surface (fitted paraboloid from rawSurface lookups), and the inner-edge height is reported as info.rimH (÷ eye diameter ≤ SKIN_RIM_MAX). */
export const SKIN_RIM_MAX = .06;       /* rim height above the surrounding skin, × eye diameter */
export const BLEND_IN = LIMBUS + .02, BLEND_W = .6, BLEND_DIVE = .08;   /* inner polar angle · radial width (× R) · sink below skin at the outer edge (× R) */
/** local head-surface height field around the eye in eye-frame coordinates: zs(f,v) = z0 + gf·f + gv·v − ½(kf·f² + kv·v²)  (z along the optical axis from the sphere centre) */
export function skinCurvature(THREE, bm, spec, clamp) {
  const F = eyeFrame(THREE, spec.axis, spec.forward, spec.up), R = spec.R, c = spec.center, a = F.a, T = new THREE.Vector3(), p = {}, z0 = R * EYE_SEAT, fl = { z0, gf: 0, gv: 0, kf: 0, kv: 0 };
  if (spec.flat || spec.theta === undefined) return fl;
  const zAt = (f, v) => {
    T.copy(c).addScaledVector(F.tu, f).addScaledVector(F.tv, v); const u = clamp((bm.headX - T.x) / bm.L, .006, .99);
    const cost = th => { bm.rawSurface(u, th, p); const dx = p.x - T.x, dy = p.y - T.y, dz = p.z - T.z, t = dx * a.x + dy * a.y + dz * a.z; return { c: dx * dx + dy * dy + dz * dz - t * t + (Math.abs(t - z0) > R * 1.2 ? 1e3 * R * R : 0), t }; };
    let bt = spec.theta, bc = 1e9, bz = z0, st = 2.4 / 24;
    for (let i = 0; i <= 24; i++) { const th = spec.theta - 1.2 + i * st, r = cost(th); if (r.c < bc) { bc = r.c; bt = th; bz = r.t; } }
    for (let it = 0; it < 3; it++) { st /= 3; for (const d of [-1, 1]) { const th = bt + d * st, r = cost(th); if (r.c < bc) { bc = r.c; bt = th; bz = r.t; } } }
    return bz;
  };
  const d = R, zc = zAt(0, 0), zf1 = zAt(d, 0), zf2 = zAt(-d, 0), zv1 = zAt(0, d), zv2 = zAt(0, -d), K = .47 / R;
  fl.z0 = zc; fl.gf = (zf1 - zf2) / (2 * d); fl.gv = (zv1 - zv2) / (2 * d);
  fl.kf = Math.max(-K, Math.min(K, 2 * (zc - (zf1 + zf2) / 2) / (d * d))); fl.kv = Math.max(-K, Math.min(K, 2 * (zc - (zv1 + zv2) / 2) / (d * d)));
  return fl;
}
/** extra seating depth δ (along −axis, ≥ 0) so the skin rim at the corneal edge stands ≤ SKIN_RIM_TARGET × diameter above the real head surface; capped so the skin never closes over the iris
    (the skin–sphere crossing stays ≥ LIMBUS + .04 rad from the optical axis). Only ever DEEPENS the seat, so protrusion stays ≤ the law. */
export const SKIN_RIM_TARGET = .055;
export function seatDelta(spec, sk) {
  const R = spec.R, Rin = R * 1.018, rIn = Rin * Math.sin(BLEND_IN), zIn = Rin * Math.cos(BLEND_IN); let hmax = 0;
  for (let i = 0; i < 24; i++) { const ph = i / 24 * Math.PI * 2, f = rIn * Math.cos(ph), v = rIn * Math.sin(ph); hmax = Math.max(hmax, zIn - (sk.z0 + sk.gf * f + sk.gv * v - .5 * (sk.kf * f * f + sk.kv * v * v))); }
  const cap = Math.max(0, Math.min(R * (EYE_SEAT_MAX - EYE_SEAT), R * EYE_SEAT_MAX - sk.z0));
  return Math.max(0, Math.min(cap, hmax - SKIN_RIM_TARGET * 2 * R));
}
export function buildSkinBlend(THREE, spec, seg, sk) {
  const { center: c, R } = spec, F = eyeFrame(THREE, spec.axis, spec.forward, spec.up), { a, tu, tv } = F, TAU = Math.PI * 2;
  const Rin = R * 1.0008, rIn = Rin * Math.sin(BLEND_IN), zIn = Rin * Math.cos(BLEND_IN), W = R * BLEND_W;
  const zs = (f, v) => sk.z0 + sk.gf * f + sk.gv * v - .5 * (sk.kf * f * f + sk.kv * v * v);
  const q1 = (spec.u || 0) * 977.3, q2 = q1 * 1.7 + 2.1, q3 = q1 * 2.9 + 4.4, irr = ph => 1 + .2 * Math.sin(2 * ph + q1) + .13 * Math.sin(3 * ph + q2) + .08 * Math.sin(5 * ph + q3) + .05 * Math.sin(8 * ph + q1 * 3.1);
  const TL = Math.tan(LIMBUS), r0 = R * Math.sin(LIMBUS), zc0 = R * Math.cos(LIMBUS);   /* round 5B: tangent cone at the limbus rim — nothing of the patch may rise above it (see below) */
  let rimH = 0; const prox = [], rows = seg <= 8 ? 3 : 8, cols = seg <= 8 ? 14 : 36;
  const geo = makePart(THREE, rows, cols, true, (t, h) => {
    const phi = h * TAU, cp = Math.cos(phi), sp = Math.sin(phi), s = t, S = s * s * (3 - 2 * s), r = rIn + W * s * irr(phi), f = r * cp, v = r * sp;   /* round 3: irregular outer boundary — no perfect circle */
    const hin = Math.max(0, zIn - zs(rIn * cp, rIn * sp));
    /* round 5B (a): the patch is skin AROUND the eye, so it may never cross the eyeball's silhouette. Any surface point P a viewer could see the cornea past satisfies P·n(q) > R for some visible cornea point q;
       the set of points that never do is bounded, beyond the limbus rim, by the cone TANGENT to the sphere along the rim (z <= zc0 - (r - r0) tan LIMBUS). The funnel is clamped under that cone (and starts on the sphere), so the
       iris/cornea is 100% visible from every direction that sees it at all — the patch can only hide itself under the real head skin. */
    const zCone = zc0 - (r - r0) * TL - .0004 * R, zFree = zs(f, v) + hin * (1 - S) * (1 - S) - BLEND_DIVE * R * S, z = Math.min(zFree, zCone), zb = zs(f, v);   /* zb: the head-surface point beneath this vertex — its skin coordinates (pattern, countershading) are the cap's, so colour matches the skin around it */
    if (t === 0) rimH = Math.max(rimH, Math.max(0, z - zs(f, v)));
    prox.push(c.x + a.x * zb + tu.x * f + tv.x * v, c.y + a.y * zb + tu.y * f + tv.y * v, c.z + a.z * zb + tu.z * f + tv.z * v);
    return { p: [c.x + a.x * z + tu.x * f + tv.x * v, c.y + a.y * z + tu.y * f + tv.y * v, c.z + a.z * z + tu.z * f + tv.z * v], e: [s, phi, 7] };
  });
  geo.userData.rimH = rimH / (2 * R); geo.userData.prox = prox; geo.userData.side = spec.side;
  return orient(THREE, geo, v => v.clone().sub(c));
}

/** skin-covered vestigial orbit: a seated body-coloured dome (still exactly two) */
export function buildVestigial(THREE, spec, seg) {
  const g = new THREE.SphereGeometry(spec.R, seg, Math.max(5, Math.round(seg * .65))); g.translate(spec.center.x, spec.center.y, spec.center.z); return g;
}

export function mergeParts(THREE, list) { return merge(THREE, list); }


/* ───────── ROUND 6H.3a: EYE-SEAT BAND (L5) — cornea sits in the bounded band from eyeband.js ─────────
   The seat is refined against the REAL local head/dome surface: sample points on the corneal cap (out to CORNEA_REACH) are tested against the local analytic section
   (on flattened plans — disc + ray/benthicShark — against the local dome height at P.z, not the midline peak). Any buried point lifts the eyeball along its optical axis
   within the eyeband.js protrusion cap (EYE_PROTRUSION_MAX = 1/3 diameter). */
export const LIFT_MAX_PROTRUSION = { bony: EYE_PROTRUSION_MAX, cart: EYE_PROTRUSION_MAX };
export function corneaPoints(THREE, c, a, tu, tv, R, k = 1 + CORNEA_CLEAR) {
  const pts = [c.clone().addScaledVector(a, R * k)];
  for (const f of [.35, .7, 1]) for (let j = 0; j < 8; j++) { const al = CORNEA_REACH * f, ph = j / 8 * Math.PI * 2, d = a.clone().multiplyScalar(Math.cos(al)).addScaledVector(tu, Math.sin(al) * Math.cos(ph)).addScaledVector(tv, Math.sin(al) * Math.sin(ph)); pts.push(c.clone().addScaledVector(d, R * k)); }
  return pts;
}
/** depth (m, >= 0) by which point P lies inside the analytic head/dome volume (0 = on / outside the local skin) */
export function headDepthAt(bm, P, clamp) {
  const fr = bm._hfr || (bm._hfr = {}), s = bm._hs || (bm._hs = {}), u = clamp((bm.headX - P.x) / bm.L, .003, .999); bm.frame(u, fr); bm.section(u, s);
  const ly = (P.x - fr.px) * fr.nx + (P.y - fr.py) * fr.ny, az = Math.abs(P.z);
  if (bm.disc) {
    if (az >= s.w) return 0;
    const r = s.rim, wi = Math.max(1e-9, s.w - r), y0 = ly >= 0 ? s.dUp : s.dDn, p = ly >= 0 ? s.pU : s.pD;
    const ySurf = az <= wi ? r + (y0 - r) * Math.pow(Math.max(0, 1 - (az / wi) ** 2), p) : r * Math.sqrt(Math.max(0, 1 - ((az - wi) / Math.max(1e-9, r)) ** 2));
    return Math.max(0, Math.min(s.w - az, ySurf - Math.abs(ly)));
  }
  const fam = bm.a && bm.a.family;
  if (fam === 'ray' || fam === 'benthicShark') {
    if (az >= s.w) return 0;
    const y0 = ly >= 0 ? s.dUp : s.dDn, yn = ly >= 0 ? s.nD : s.nV, t = clamp((az / Math.max(s.w, 1e-8) - .08) / .88, 0, 1);
    const taper = 1 - (fam === 'ray' ? .90 : .78) * t * t * (3 - 2 * t);
    const ySurf = y0 * Math.pow(Math.max(0, 1 - Math.min(1, Math.pow(az / Math.max(1e-9, s.w), s.n))), 1 / yn) * taper;
    return Math.max(0, Math.min(s.w - az, ySurf - Math.abs(ly)));
  }
  if (!(ly > -s.dDn && ly < s.dUp)) return 0;
  const hw = bm.halfWidthAtY(s, clamp(ly, -s.dDn * .999, s.dUp * .999)), dz = hw - az; if (dz <= 0) return 0;
  const yR = ly > 0 ? s.dUp : s.dDn; return Math.min(dz, yR - Math.abs(ly));
}
export function seatLift(THREE, bm, spec, clamp, maxLift) {
  const F = eyeFrame(THREE, spec.axis, spec.forward, spec.up), R = spec.R, c0 = spec.center.clone(), tol = CORNEA_CLEAR * R; let lift = 0;
  const worst = l => { const c = c0.clone().addScaledVector(F.a, l); let w = 0; for (const p of corneaPoints(THREE, c, F.a, F.tu, F.tv, R)) w = Math.max(w, headDepthAt(bm, p.addScaledVector(F.a, -tol), clamp)); return w; };
  for (let i = 0; i < 24 && worst(lift) > 0; i++) { lift += Math.max(.002 * R, worst(lift) * .85); if (lift >= maxLift) { lift = maxLift; break; } }
  return Math.min(lift, Math.max(0, maxLift));
}
