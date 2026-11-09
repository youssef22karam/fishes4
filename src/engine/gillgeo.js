/* GILL STRUCTURES (round 5A). Replaces the old flush cover plate / surface-stripe slits.
   cover  (bony plans): a raised OPERCULUM plate whose rear edge is a real geometric step (rounded crest + a steep rear wall that drops to the trunk),
          following the head's curvature (edge curve opEdgeU); the body loft carries a narrow TRENCH immediately behind the edge and a dark slit
          ribbon lies on the trench floor. Plate, wall and ribbon are sampled on the RENDERED body loft with the body's own (u, angle) skin
          coordinates, so scales / pattern continue across them and they move with the head exactly as the skin does (breath, wave, jaw spread).
   slits  (cartilaginous lateral plans): the series is cut INTO the loft (deep Gaussian groove per slit, graded length); a dark-floored lens ribbon
          follows the groove floor, so each opening is a real recess with a dark interior, not a painted stripe.
   pores / ventral: unchanged legacy ribbons (disc plans are a later round).
   H = { THREE, clamp, lerp, sstep, smoother, TAU }. */
import { OP, SLIT, opEdgeU } from './headlaw.js';
const gauss = x => Math.exp(-x * x);
const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const kindOf = bm => bm.a.gills === 'lateral' ? 'slits' : bm.a.gills === 'opercular' && bm.g.head.operculum ? 'cover' : bm.a.gills;

/** groove / trench depth to subtract from |lz| at (u, st = sin theta); sw = local half width. Called by BodyModel.point. */
export function cut(bm, u, st, sw) {
  const k = bm._gk || (bm._gk = kindOf(bm)), g = bm.g, lm = bm.lm, h = bm.h;
  if (k === 'slits') {
    const n = g.head.gillSlits; if (!n || u < lm.gillStart - .03 || u > lm.gillEnd + .03) return 0;
    let c = 0;
    for (let i = 0; i < n; i++) {
      const gu = lm.gillStart + (lm.gillEnd - lm.gillStart) * (i + .5) / n + g.head.gillSlant * h * .06 * (1 - st * st);
      const lf = .62 + .38 * Math.sin(Math.PI * (i + .5) / n), face = 1 - sst(.58 * lf, .9 * lf, Math.abs(st));
      c += SLIT.depth * sw * face * gauss((u - gu) / (h * SLIT.sigma));
    }
    return c;
  }
  if (k === 'cover') {
    const w = OP.slitW * h, uc = opEdgeU(lm.operculum, h, st) + w * .5; if (Math.abs(u - uc) > w * 1.2) return 0;
    return OP.trench * sw * sst(OP.vLo - .03, OP.vLo + .2, st) * (1 - sst(OP.vHi - .17, OP.vHi, st)) * gauss((u - uc) / (w * .28));
  }
  return 0;
}
/** extra loft stations so the grooves / trench get real depth instead of aliasing */
export function extraStations(bm) {
  const k = kindOf(bm), g = bm.g, lm = bm.lm, h = bm.h, ex = [];
  if (k === 'slits' && g.head.gillSlits) for (let i = 0; i < g.head.gillSlits; i++) { const gu = lm.gillStart + (lm.gillEnd - lm.gillStart) * (i + .5) / g.head.gillSlits + g.head.gillSlant * h * .06; for (let j = -6; j <= 6; j++) ex.push(gu + j * h * .0035); }
  if (k === 'cover') for (let u = lm.operculum - .17 * h; u <= lm.operculum + .004 * h; u += h * .0045) ex.push(u);
  return ex;
}

function sampler(bm, THREE, TAU) {
  const fr = {}, s = {}, p = {}, nq = {};
  return (u, th, side, off, pos, ab, tag, w) => {
    const tb = side > 0 ? th : Math.PI - th, o = bm.maxD * off;
    if (bm.loft) { bm.sampleLoft(u, tb, p); bm.sampleLoft(u, tb, nq, 'normal'); const nl = Math.hypot(nq.x, nq.y, nq.z) || 1; pos.push(p.x + nq.x / nl * o, p.y + nq.y / nl * o, p.z + nq.z / nl * o); }
    else { bm.frame(u, fr); bm.section(u, s); bm.point(u, tb, p, fr, s, true); const l = Math.hypot(p.ly, p.lz) || 1; pos.push(p.x + fr.nx * p.ly / l * o, p.y + fr.ny * p.ly / l * o, p.z + p.lz / l * o); }
    ab.push(u, side > 0 ? .25 + th / TAU : .75 - th / TAU, tag, w);
  };
}
const finish = (THREE, pos, ab, idx) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('aBody', new THREE.Float32BufferAttribute(ab, 4)); geo.setIndex(idx); geo.computeVertexNormals(); return geo; };

export function buildOperculum(bm, H) {
  const { THREE, lerp, smoother, TAU } = H, lm = bm.lm, h = bm.h, u0 = lm.preopercle, NS = 14, NR = 28, TL = -1.18, TH = .56, pos = [], ab = [], idx = [], put = sampler(bm, THREE, TAU);
  let v = 0; const edge = th => opEdgeU(lm.operculum, h, Math.sin(th)), H0 = OP.height;
  const prof = f => smoother(Math.min(1, f / .42)) * (1 + (OP.crest - 1) * sst(.76, 1, f));
  const quad = (a, cols, rows) => { for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { const p0 = a + i * (cols + 1) + j, p1 = p0 + cols + 1; idx.push(p0, p0 + 1, p1, p0 + 1, p1 + 1, p1); } };
  for (const side of [1, -1]) {
    const v0 = v;                                        /* plate: lifted, tapering in at the front, crest along the free edge */
    for (let i = 0; i <= NS; i++) { const f = Math.pow(i / NS, .85); for (let j = 0; j <= NR; j++) { const th = lerp(TL, TH, j / NR), win = Math.pow(Math.sin(Math.PI * j / NR), .6);
      put(lerp(u0, edge(th), f), th, side, H0 * prof(f) * win, pos, ab, 3 + .2 * sst(.86, 1, f) * (.35 + .65 * win), smoother(f) * win); v++; } }
    quad(v0, NR, NS);
    const w0 = v;                                        /* rear wall: separate vertices (crisp step), drops from the crest to just under the trunk surface */
    for (let r = 0; r < 2; r++) for (let j = 0; j <= NR; j++) { const th = lerp(TL, TH, j / NR), win = Math.pow(Math.sin(Math.PI * j / NR), .6), top = H0 * OP.crest * win;
      put(edge(th) + (r ? top * bm.maxD * .45 / bm.L : 0), th, side, r ? -.0008 * win : top, pos, ab, r ? 3.28 : 3.25, win); v++; }
    quad(w0, NR, 1);
    const m0 = v, MS = 6, MR = 8, ua = Math.max(bm.hingeU + .003, u0 * .85);   /* branchiostegal membrane: ray fan under the throat; starts behind the jaw hinge */
    for (let i = 0; i <= MS; i++) for (let j = 0; j <= MR; j++) { const f = i / MS, jn = j / MR, th = lerp(-1.5707963, -1.12, jn);
      put(lerp(ua, edge(th) - .001, f), th, side, .0012 + .0055 * Math.sin(Math.PI * Math.pow(f, .9)) * sst(0, .22, jn), pos, ab, 3.5, Math.sin(Math.PI * f) * (1 - Math.abs(jn - .5) * 1.2)); v++; }
    quad(m0, MR, MS);
  }
  return finish(THREE, pos, ab, idx);
}

export function buildGills(bm, mats, H) {
  const { THREE, lerp, TAU } = H, g = bm.g, k = kindOf(bm), pos = [], ab = [], idx = [], put = sampler(bm, THREE, TAU), P = {}, Q = {}; let nv = 0;
  const ribbon = (side, N, thOf, ucOf, halfOf) => {          /* 7 strips across: edges flush/under the skin, centre on the groove floor */
    const s0 = nv;
    for (let j = 0; j <= N; j++) { const t = j / N, th = thOf(t), uc = ucOf(t, th), hf = halfOf(t) * Math.pow(Math.sin(Math.PI * t), .55);
      for (let c = -3; c <= 3; c++) { const a = Math.abs(c) / 3; put(uc + hf * c / 3, th, side, .0006 - .0012 * a * a, pos, ab, 6 + .25 * Math.pow(1 - a, .8), Math.pow(Math.sin(Math.PI * t), .6)); nv++; } }
    for (let j = 0; j < N; j++) for (let c = 0; c < 6; c++) { const a = s0 + j * 7 + c; idx.push(a, a + 1, a + 7, a + 1, a + 8, a + 7); }
  };
  if (k === 'cover') {
    const sw = OP.slitW * bm.h, lo = Math.asin(OP.vLo), hi = Math.asin(OP.vHi);
    for (const side of [-1, 1]) ribbon(side, 20, t => lerp(lo, hi, t), (t, th) => opEdgeU(bm.lm.operculum, bm.h, Math.sin(th)) + sw * .52, () => sw * .4);
  } else if (k === 'slits') {
    const n = g.head.gillSlits || 1;
    for (const side of [-1, 1]) for (let i = 0; i < n; i++) { const lf = .62 + .38 * Math.sin(Math.PI * (i + .5) / n), c0 = lerp(bm.lm.gillStart, bm.lm.gillEnd, (i + .5) / n);
      ribbon(side, 18, t => lerp(-.78, .74, t) * g.head.gillHeight * lf, (t, th) => c0 + g.head.gillSlant * bm.h * .06 * (1 - Math.sin(th) ** 2), () => SLIT.half * bm.h); }
  } else if (k !== 'opercular') {                             /* legacy ribbons: jawless pores, disc-plan ventral slits (later round) */
    const slots = g.head.gillSlits || 1, pores = k === 'pores', ventral = k === 'ventral';
    for (const side of [-1, 1]) for (let slot = 0; slot < slots; slot++) {
      const center = lerp(bm.lm.gillStart, bm.lm.gillEnd, (slot + .5) / slots), N = pores ? 10 : 14, start = nv, grade = .62 + .38 * Math.sin(Math.PI * (slot + .5) / slots);
      for (let j = 0; j <= N; j++) {
        const t = j / N; let theta = ventral ? -Math.PI / 2 + side * lerp(.06, .06 + .18 * grade, t) : lerp(-.78, .74, t) * g.head.gillHeight * grade; if (!ventral && side < 0) theta = Math.PI - theta;
        const u = center + g.head.gillSlant * bm.h * .055 * Math.sin(Math.PI * t), width = bm.h * (pores ? .018 : .012) * Math.pow(Math.sin(Math.PI * t), .6);
        for (let c = 0; c < 4; c++) { const uu = u + (c - 1.5) * width; bm.rawSurface(uu, theta, P); bm.frame(uu, Q); const nrm = new THREE.Vector3(); bm.surfaceNormal(uu, theta, nrm);
          const lift = bm.maxD * (c === 0 ? .010 : c === 3 ? .004 : c === 1 ? .0006 : -.0012);
          pos.push(P.x + nrm.x * lift, P.y + nrm.y * lift, P.z + nrm.z * lift); ab.push(uu, ((theta + Math.PI / 2) / TAU + 1) % 1, c === 1 ? 6.1 : c === 2 ? 6.25 : c === 0 ? 7 : 7.5, Math.sin(Math.PI * t)); nv++; } }
      for (let j = 0; j < N; j++) for (let c = 0; c < 3; c++) { const a = start + j * 4 + c; idx.push(a, a + 1, a + 4, a + 1, a + 5, a + 4); }
    }
  }
  const m = new THREE.Mesh(finish(THREE, pos, ab, idx), mats.body); m.frustumCulled = false; m.userData.gills = k; return m;
}
