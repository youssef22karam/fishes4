/* DISC PLAN (round 6A) — the flattened ray-type body, built as ONE solid, closed, opaque surface.
   Every rule is a function of the generator's own axes: body plan (flat >= 1, family 'ray'), feeding niche (cephalic lobes),
   swim mode (rajiform wave), body size (L) and the genome's continuous axes — nothing is keyed to a named animal.

   Planform  : snout -> leading edge -> wing apex -> trailing edge -> tail base is a smooth superellipse chain; the tail is its own
               tapering axis, joined to the disc by a p-norm fillet (a blended base, not a glued board edge).
   Volume    : half-thickness = rim radius + (centre - rim) * (1 - q^2)^p, q = |z| / half-width.  Deepest over the central body,
               a rounded rim of fixed radius r (never zero) at every outline point; ventral face flatter than the dorsal dome.
   Ring      : the loft ring is re-parameterised for the disc: top face | rim cap | bottom face | rim cap, faces uniform in z.
   Underside : ventral transverse mouth + 5 gill-slit pairs are carved INTO the bottom face (Gaussian grooves) and carry dark ribbons.
   Marks     : spiracles behind the eyes on top, nares ahead of the mouth underneath (soft pits).
   H = { THREE, clamp, lerp, sstep, smoother, TAU, skinAttributes, mergeGeos } from the engine. */
const clamp = (x, a, b) => Math.min(b, Math.max(a, x)), lerp = (a, b, t) => a + (b - a) * t;
const sst = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const THC = .12;               /* angular share of each rim cap on the loft ring (rad) */
export const GILL_PAIRS = 5;
export const isDisc = bm => bm.a.family === 'ray' && !!bm.law.flat && bm.law.flat.flat >= 1;

/** Plan parameters from the genome axes (all lengths in metres, u = fraction of total length). */
export function plan(bm) {
  const g = bm.g, b = g.body, h = g.head, L = bm.L;
  const wlr = lerp(1.05, 1.5, clamp((b.width - 2.1) / .7, 0, 1));                  /* disc width / disc length  <- body.width */
  const tailF = lerp(.30, .46, clamp((b.tailTaper - .5) / .25, 0, 1));              /* tail share of total length <- body.tailTaper */
  const dEnd = 1 - tailF, Ld = dEnd * L, Sp = .5 * wlr * Ld;
  const P = clamp((.46 - b.peakU) / .12, 0, 1);                                      /* wing-tip pointedness <- body.peakU (apex forward = swept) */
  const K = clamp((h.snoutTaper - .35) / .35, 0, 1);                                 /* snout pointiness <- head.snoutTaper */
  const uA = dEnd * lerp(.36, .54, clamp((b.peakU - .35) / .1, 0, 1));
  const Hc = 2 * Sp * lerp(.105, .15, clamp((b.snoutDepth - .1) / .1, 0, 1));       /* centre thickness (full) <- body.snoutDepth */
  const D = { dEnd, Ld, Sp, P, K, uA, Hc, r: Hc * .05, upFrac: .64, wtb: Math.max(.5 * b.pedDepth * L * .85, Sp * .05),
    pf: lerp(2.1, 1.15, P), qf: lerp(2.0, 1.3, K), pr: lerp(2.2, 1.3, P), qr: lerp(2.0, 1.35, P), kk: lerp(9, 26, P), norm: 1, L,
    zEye: Sp * lerp(.19, .12, clamp((h.eyeV - .77) / .2, 0, 1)) };
  let mx = 0; for (let i = 0; i <= 400; i++) mx = Math.max(mx, rawW(D, i / 400 * dEnd)); D.norm = Sp / Math.max(1e-9, mx);
  const gape = clamp((g.mouth.gape - .26) / .14, 0, 1);
  D.mouth = { u: .185 * dEnd, hz: Sp * lerp(.07, .115, gape), sig: Ld * .0075, curve: .3, lip: Ld * .011 };
  const ug0 = .31 * dEnd, ug1 = .465 * dEnd, pitch = (ug1 - ug0) / (GILL_PAIRS - 1), slant = clamp(h.gillSlant, 0, .4);
  D.gill = { pitch, sig: Math.min(pitch * L * .16, Sp * .016), slits: [] };
  for (let i = 0; i < GILL_PAIRS; i++) D.gill.slits.push({ u: ug0 + pitch * i, zc: Sp * (.245 - .021 * i), hz: Sp * (.088 - .0075 * i), tilt: -(.18 + slant), curv: .16 });
  D.depthG = .5; D.depthM = .38;
  return D;
}

function rawW(D, u) {                    /* outline half-width from the planform chain, before the tail fillet */
  if (u <= 0 || u >= D.dEnd) return 0;
  let wf = 1, wr = 1;
  if (u < D.uA) { const x = u / D.uA; wf = Math.pow(Math.max(0, 1 - Math.pow(1 - x, D.pf)), 1 / D.qf); }
  if (u > D.uA) { const y = (u - D.uA) / (D.dEnd - D.uA); wr = Math.pow(Math.max(0, 1 - Math.pow(y, D.pr)), 1 / D.qr); }
  if (wf <= 1e-9 || wr <= 1e-9) return 0;
  return D.Sp * Math.pow(Math.pow(wf, -D.kk) + Math.pow(wr, -D.kk), -1 / D.kk) * 1;
}
export function discW(D, u) { return rawW(D, u) * D.norm; }
function tailW(D, u) {
  if (u <= D.dEnd) return D.wtb * sst(.55 * D.dEnd, D.dEnd, u);
  const v = clamp((u - D.dEnd) / (1 - D.dEnd), 0, 1); return D.wtb * (.1 + .9 * Math.pow(1 - v, 1.2));
}

/** Station section: half-width, dorsal / ventral half-thickness, rim radius. Legacy fields kept valid for shared code. */
export function section(bm, u, s) {
  const D = bm.disc, wd = discW(D, u), wt = tailW(D, u), w = Math.pow(Math.pow(wd, 4) + Math.pow(wt, 4), .25);
  const wdn = clamp(wd / D.Sp, 0, 1), prof = Math.pow(wdn, .85), tau = (1 - sst(1.4 * D.wtb, 4 * D.wtb, w)) * sst(.45 * D.dEnd, .7 * D.dEnd, u);   /* tail-like section only behind the disc */
  const rim = Math.min(D.r, .42 * w), th = Math.max(.9 * w, rim * 1.05);
  s.w = Math.max(w, 1e-5); s.rim = rim; s.coreW = Math.min(s.w * .9, D.zEye / .8);
  s.dUp = Math.max(lerp(Math.max(D.Hc * D.upFrac * prof, rim * 1.05), th, tau), rim * 1.05);
  s.dDn = Math.max(lerp(Math.max(D.Hc * (1 - D.upFrac) * prof, rim * 1.05), th, tau), rim * 1.05);
  s.pU = lerp(1.5, .6, tau); s.pD = lerp(1.1, .6, tau); s.tau = tau;
  s.n = 2; s.nV = 2; s.nD = 2; return s;
}

/** Lateral position -> ring angle a (from +z axis) on a face.  Inverse of the face mapping used by point(). */
export function thetaOfZ(s, z) { const wi = Math.max(1e-9, s.w - s.rim), f = clamp(Math.abs(z) / wi, 0, 1); return Math.PI / 2 - f * (Math.PI / 2 - THC); }

/** Groove depth on the ventral face at (u, z): mouth slot + 5 gill-slit pairs (in metres, positive = into the body). */
export function carve(bm, u, z) {
  const D = bm.disc, L = bm.L, az = Math.abs(z); let c = 0;
  const M = D.mouth, G = D.gill;
  if (u > M.u - 6 * M.sig / L - M.curve * M.hz / L && u < M.u + 6 * M.sig / L + M.curve * M.hz / L * 1.2 && az < M.hz * 1.15) {
    const t = az / M.hz, uc = M.u + M.curve * M.hz * t * t / L, d = (u - uc) * L;
    c += D.depthM * D.Hc * .1 * Math.exp(-((d / M.sig) ** 2)) * (1 - sst(.82, 1.08, t));
  }
  const g0 = G.slits[0].u - 6 * G.sig / L - .3 * D.Sp / L, g1 = G.slits[GILL_PAIRS - 1].u + 6 * G.sig / L + .3 * D.Sp / L;
  if (u > g0 && u < g1) for (const sl of G.slits) {
    const t = (az - sl.zc) / sl.hz; if (Math.abs(t) > 1.5) continue;
    const uc = sl.u + (sl.tilt * sl.hz * clamp(t, -1, 1) + sl.curv * sl.hz * (1 - Math.min(1, t * t))) / L, d = Math.hypot((u - uc) * L, Math.max(0, Math.abs(t) - 1) * sl.hz);
    c += D.depthG * D.Hc * .09 * Math.exp(-((d / G.sig) ** 2));
  }
  return c;
}

/** Ring point.  theta: pi/2 top centre, -pi/2 bottom centre, 0 / pi the lateral rims (sign of cos picks the side). */
export function point(bm, u, theta, out, fr, s) {
  const ct = Math.cos(theta), st = Math.sin(theta), top = st >= 0, a = Math.atan2(Math.abs(st), ct), r = s.rim, wi = s.w - r;
  let z, y;
  if (a < THC || a > Math.PI - THC) {                         /* rim cap: half-round of radius r (never a knife edge) */
    const near = a < THC, e = near ? a : Math.PI - a, beta = (top ? 1 : -1) * (Math.PI / 2) * (e / THC);
    z = (wi + r * Math.cos(beta)) * (near ? 1 : -1); y = r * Math.sin(beta);
  } else {
    const f = (Math.PI / 2 - a) / (Math.PI / 2 - THC), k = Math.max(0, 1 - f * f); z = f * wi;
    y = top ? r + (s.dUp - r) * Math.pow(k, s.pU) : -(r + (s.dDn - r) * Math.pow(k, s.pD));
    if (!top) y += carve(bm, u, z) * (1 - .0 * k);
  }
  out.mouth = 0; out.x = fr.px + fr.nx * y; out.y = fr.py + fr.ny * y; out.z = z; out.ly = y; out.lz = z; return out;
}

/** extra loft stations: a dense band over the mouth slot and the gill series so every groove is real geometry */
export function extraStations(bm) {
  const D = bm.disc, L = bm.L, ex = [], M = D.mouth, G = D.gill, sl = G.slits;
  const band = (a, b, d) => { for (let u = a; u <= b; u += d) ex.push(u); };
  band(M.u - 4.5 * M.sig / L, M.u + (M.curve * M.hz + 4.5 * M.sig) / L, M.sig * .55 / L);
  band(sl[0].u - (4 * G.sig + .3 * sl[0].hz) / L, sl[GILL_PAIRS - 1].u + (4 * G.sig + .3 * sl[0].hz + .2 * sl[0].hz) / L, G.sig * .5 / L);
  return ex;
}

/* ───────── underside + marks builders ───────── */
function surf(bm, u, z, side, bottom, lift, P, N, THREE) {   /* point on the RENDERED loft at lateral z (metres), offset along the loft normal */
  const fr = bm._df || (bm._df = {}), s = bm._ds || (bm._ds = {}); bm.frame(u, fr); bm.section(u, s);
  const a = thetaOfZ(s, z), th = Math.atan2((bottom ? -1 : 1) * Math.sin(a), side * Math.cos(a));
  bm.attachedSurface(u, th, P); bm.surfaceNormal(u, th, N); return P.addScaledVector(N, lift);
}
function strip(THREE, pos, ab, idx, rows, cols, fn) {         /* rows x (cols+1) vertices from fn(i, j) -> [x,y,z,u,occ,tag,w] */
  const v0 = pos.length / 3;
  for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) { const q = fn(i / rows, j / cols); pos.push(q[0], q[1], q[2]); ab.push(q[3], q[4], q[5], q[6]); }
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { const a = v0 + i * (cols + 1) + j, b = a + cols + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
}
const geoOf = (THREE, pos, ab, idx) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('aBody', new THREE.Float32BufferAttribute(ab, 4)); geo.setIndex(idx); geo.computeVertexNormals(); return geo; };

/** Ventral mouth (transverse, lips + dark slot) and the five gill-slit pairs.  Returns meshes; userData carries the audit facts. */
export function buildUnderside(bm, mats, H) {
  const { THREE } = H, D = bm.disc, L = bm.L, M = D.mouth, G = D.gill, P = new THREE.Vector3(), N = new THREE.Vector3(), out = [];
  const mk = (geo, mat, ud) => { const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; Object.assign(m.userData, ud || {}); out.push(m); return m; };
  /* lips: two raised ridges either side of the slot, following the mouth arc */
  const mu = z => M.u + M.curve * M.hz * (z / M.hz) ** 2 / L;
  for (const sgn of [-1, 1]) {
    const pos = [], ab = [], idx = [], off = sgn * (M.sig * 1.9 + M.lip * .35) / L;
    strip(THREE, pos, ab, idx, 24, 6, (t, c) => { const z = lerp(-M.hz * .94, M.hz * .94, t), k = Math.sin(Math.PI * t), cc = (c - .5) * 2, uu = mu(z) + off + cc * M.lip * (.35 + .65 * k) / L;
      const p = surf(bm, uu, z, z >= 0 ? 1 : -1, true, M.lip * .55 * Math.pow(Math.max(0, 1 - cc * cc), .7) * Math.pow(k, .6), P, N, THREE); return [p.x, p.y, p.z, 0, 0, 0, 0]; });
    const geo = geoOf(THREE, pos, ab, idx); H.skinAttributes(geo, bm); mk(geo, mats.body, { discLip: true });
  }
  {   /* slot: dark-floored lens in the groove */
    const pos = [], ab = [], idx = [], ys = [];
    strip(THREE, pos, ab, idx, 26, 4, (t, c) => { const z = lerp(-M.hz, M.hz, t), k = Math.pow(Math.sin(Math.PI * t), .5), cc = (c - .5) * 2, uu = mu(z * .96) + cc * M.sig * 1.35 * k / L;
      const p = surf(bm, uu, z * .96, z >= 0 ? 1 : -1, true, -.0004 * L * (1 - cc * cc), P, N, THREE); ys.push(p.y); return [p.x, p.y, p.z, uu, .55 + .4 * (1 - cc * cc), 1, 0]; });
    const geo = geoOf(THREE, pos, ab, idx); mk(geo, mats.jaw, { ventral: { y: ys.reduce((a, b) => a + b, 0) / ys.length }, discMouth: { u: M.u, halfWidth: M.hz, ventral: true, y: ys.reduce((a, b) => a + b, 0) / ys.length } });
  }
  /* five gill slits per side: each a dark ribbon on its groove floor */
  const pos = [], ab = [], idx = [], info = [];
  for (const side of [-1, 1]) G.slits.forEach((sl, i) => {
    const v0 = pos.length / 3, yc = [];
    strip(THREE, pos, ab, idx, 18, 6, (t, c) => { const tt = -1 + 2 * t, z = side * (sl.zc + tt * sl.hz), k = Math.pow(Math.sin(Math.PI * t), .55), a = Math.abs(c * 2 - 1);
      const uc = sl.u + (sl.tilt * sl.hz * tt + sl.curv * sl.hz * (1 - tt * tt)) / L, uu = uc + (c - .5) * 2 * G.sig * 1.9 * k / L;
      const p = surf(bm, uu, z, side, true, .0003 * L - .0012 * L * a * a, P, N, THREE); yc.push(p.y); return [p.x, p.y, p.z, uu, 0, 6 + .25 * Math.pow(1 - a, .8), Math.pow(Math.sin(Math.PI * t), .6)]; });
    info.push({ side, index: i, u: sl.u, z: side * sl.zc, y: yc.reduce((a, b) => a + b, 0) / yc.length });
  });
  mk(geoOf(THREE, pos, ab, idx), mats.body, { discGills: { pairs: GILL_PAIRS, slits: info, ventral: true } });
  return out;
}

/** Soft marks: spiracles on top behind the eyes, nares underneath ahead of the mouth (tag 8 pits, w = 1 at the centre). */
export function buildMarks(bm, mats, H) {
  const { THREE } = H, D = bm.disc, L = bm.L, g = bm.g, P = new THREE.Vector3(), N = new THREE.Vector3(), geos = [], info = [], s = {};
  const eyeR = bm.eyeR, add = (u, z, side, bottom, rad, type) => {
    const p = surf(bm, u, z, side, bottom, 0, P, N, THREE).clone(), n = N.clone().normalize();
    const d = new THREE.SphereGeometry(rad, 10, 6); d.scale(.8, .25, 1); const A = d.getAttribute('position'), wv = new Float32Array(A.count);
    for (let i = 0; i < A.count; i++) wv[i] = clamp(A.getY(i) / (rad * .25), 0, 1); d.userData.w = wv;
    d.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n)); d.translate(p.x + n.x * rad * .1, p.y + n.y * rad * .1, p.z + n.z * rad * .1);
    geos.push(d); info.push({ type, side, y: p.y, ny: n.y, rad });
  };
  for (const side of [-1, 1]) {
    if (g.head.spiracles) add(bm.lm.eye + 3.4 * eyeR / L, D.zEye + eyeR * 1.1, side, false, Math.min(eyeR * .55, D.Hc * .06), 1);
    add(D.mouth.u * .55, D.mouth.hz * .62, side, true, Math.min(D.Hc * .035 * (.45 + g.head.nostrils), eyeR * .3), 0);
  }
  const geo = H.mergeGeos(geos); H.skinAttributes(geo, bm, 8); const ab = geo.getAttribute('aBody'); let o = 0;
  for (const d of geos) { const wv = d.userData.w; for (let i = 0; i < wv.length; i++) ab.setW(o + i, wv[i]); o += wv.length; }
  const m = new THREE.Mesh(geo, mats.body); m.frustumCulled = false; m.userData.nostrils = info; return m;
}

/** Cephalic lobes: only where the plan's forward-margin axes call for them (niche glider / filter feeder, or the 'horns' variant). */
export function cephalicWanted(bm) {
  const f = bm.ax && bm.ax.flags; return !!bm.disc && (bm.g.head.special === 'horns' || (!!f && (f.has('glider') || f.has('filterFeeder') || f.has('planktivore'))));
}
export function buildCephalic(bm, mats, H) {
  const { THREE } = H, D = bm.disc, L = bm.L, out = [], P = new THREE.Vector3(), N = new THREE.Vector3();
  const len = Math.max(.06 * D.Ld, bm.g.head.specialLen * L * 1.2), rho0 = D.Hc * .2, NR = 14, NC = 16;
  for (const side of [-1, 1]) {
    const pos = [], idx = [], fr = {}; const z0 = side * D.Sp * .17, u0 = .05 * D.dEnd;
    bm.frame(u0, fr); const base = surf(bm, u0, Math.abs(z0), side, false, 0, P, N, THREE).clone(); base.y = (base.y + 0) * .6;
    for (let i = 0; i <= NR; i++) {
      const v = i / NR, cx = base.x + len * Math.pow(v, .9), cz = base.z + side * len * .14 * v * (1 - .5 * v) * -1, cy = base.y - rho0 * .1 * v, rho = rho0 * (1 - .62 * Math.pow(v, 1.2)) * (.45 + .55 * Math.sin(Math.PI * Math.min(1, v * 1.15 + .15)));
      const roll = Math.PI * 1.5 * (.35 + .65 * v);                                   /* the free tip is rolled further than the root */
      for (let j = 0; j <= NC; j++) { const ph = -.25 * Math.PI + roll * (j / NC); pos.push(cx, cy + rho * Math.sin(ph) + rho * .35, cz + side * rho * Math.cos(ph) * 1.1); }
    }
    for (let i = 0; i < NR; i++) for (let j = 0; j < NC; j++) { const a = i * (NC + 1) + j, b = a + NC + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); H.skinAttributes(geo, bm);
    const m = new THREE.Mesh(geo, mats.jaw); m.frustumCulled = false; m.userData.cephalic = { side, len }; out.push(m);
  }
  return out;
}

/** Disc plan has no separate hinged side fins: the wing IS the body.  Record the fused plan for the fin-motion checks. */
export function registerFused(bm) {
  const p = bm.law.pec, rep = { cls: p.cls, hinged: false, sinkOverL: 0, lenOverL: 0, restAbd: p.restAbd, lagDeg: p.lagDeg, hinge: null, fused: true };
  bm.pecInfo = { 1: rep, [-1]: rep, mirrored: true };
}

/** Audit probe on the real section function: thickness along the wing, centre vs edge, as fractions of disc width. */
export function thicknessProbe(bm, THREE) {
  const D = bm.disc, s = {}, fr = {}, a = {}, b = {}; let centre = 0, wingMin = Infinity, edgeMin = Infinity, uMin = 0;
  for (let i = 1; i < 200; i++) {
    const u = i / 200 * D.dEnd; bm.frame(u, fr); bm.section(u, s); if (s.tau > .5 || discW(D, u) < .06 * D.Sp) continue;
    bm.point(u, Math.PI / 2, a, fr, s, true); bm.point(u, -Math.PI / 2, b, fr, s, true); centre = Math.max(centre, a.ly - b.ly);
    for (const q of [.5, .7, .85, .93, .97]) { const th = Math.PI / 2 - q * (Math.PI / 2 - THC); bm.point(u, th, a, fr, s, true); bm.point(u, -th, b, fr, s, true);
      const t = a.ly - b.ly; if (q >= .85 && t < edgeMin) { edgeMin = t; uMin = u; } if (t < wingMin) wingMin = t; }
  }
  return { W: 2 * D.Sp, centre, wingMin, edgeMin, uMin, minFrac: edgeMin / (2 * D.Sp), centreOverEdge: centre / edgeMin };
}
