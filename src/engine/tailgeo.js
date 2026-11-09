/* ROUND 3 — tail (caudal) anatomy: laws, bounded heterocercal construction, shape variation and the caudal mesh builder.
   Pure functions of the generator's axes (plan, niche flags, swim mode, depth band, body size). Nothing is keyed to a named animal.
   Imported by laws.js (numbers + repair) and by the engine parts (builder). */
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const gaussf = x => Math.exp(-x * x);

/* ── caps (fractions of body length L) ── */
export const CAP = {
  caudalH: .38, caudalHOrn: .55,        /* caudal fin height; the ornamental niche may reach .55 (axis-gated) */
  caudalA: .16,                         /* caudal fin area / L², all plans */
  dorsalH: .30, analH: .30, pelvicH: .20,
  pitchDeg: 15, pitchBuildDeg: 12.5,    /* rest pitch cap and the construction target (margin) */
  lobeMax: 2.2, lobeTypical: [1.1, 1.6],
  spineDeg: [10, 30],                   /* internal vertebral deflection inside the peduncle (never a visible pitch) */
  sink: .02,                            /* fin base burial, × L (limited by the local body depth) */
};
export function planBias(fam) { let h = 5381; for (const ch of String(fam)) h = (h * 33 + ch.charCodeAt(0)) >>> 0; return ((h % 997) / 997 - .5) * .36; }   /* body-plan axis → bounded outline signature (±.18 on the trailing-edge curve) */
export const isOrnamental = ax => !!(ax && ax.flags && ax.flags.has('ornamental'));

/* ── heterocercal lobe ratio: concentrated distribution from a per-fish unit u (bulk 1.1–1.6, rare tail, hard max 2.2) ── */
export const lobeRatioOf = d => 1 + 1.2 * clamp(d, 0, 1);               /* genome lobeAsym d ∈ [.08, 1] → upper ÷ lower lobe length */
export function lobeAsymFromUnit(u) {
  const r = u < .95 ? 1.1 + .5 * (u / .95) : 1.6 + Math.pow((u - .95) / .05, 3) * .6;   /* ≤ 2.2 by construction, > 2.0 in ≈ 1 % */
  return clamp((Math.min(r, CAP.lobeMax) - 1) / 1.2, .08, 1);
}
export const spineDegOf = d => lerp(CAP.spineDeg[0], CAP.spineDeg[1], clamp((lobeRatioOf(d) - 1.1) / 1.1, 0, 1));
/** deterministic per-fish unit in [0,1) with a salt (independent of the mouth / fin-motion units) */
export function unitOf(g, salt) {
  let h = 2166136261; const t = String((g.meta && g.meta.seed) || '') + '|' + salt;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; h = Math.imul(h, 3266489917); h ^= h >>> 16; return ((h >>> 0) % 1000003) / 1000003;
}

/* ── outline families ── */
export function homocercalOutline(a, T, notch) {
  const round = .38 + .62 * Math.sqrt(Math.max(0, 1 - a * a));
  const trunc = .9 - .08 * a + .25 * notch * a * a;
  const fork = lerp(.55, .24, notch) + (1 - lerp(.55, .24, notch)) * Math.pow(a, 1.5);
  const lun = .16 + .75 * Math.pow(a, 1.8);
  if (T < .3) return lerp(round, trunc, T / .3);
  if (T < .65) return lerp(trunc, fork, (T - .3) / .35);
  return lerp(fork, lun, (T - .65) / .35);
}
const SHAPES = {
  forked: (a, n) => lerp(.55, .24, n) + (1 - lerp(.55, .24, n)) * Math.pow(a, 1.5), lunate: a => .16 + .75 * Math.pow(a, 1.8), truncate: a => 1 - .04 * a,
  rounded: a => .38 + .62 * Math.sqrt(Math.max(0, 1 - a * a)), emarginate: (a, n) => .77 - .14 * n + .3 * a * a,
  heterocercal: a => .34 + .66 * Math.pow(a, 1.25) - .08 * gaussf((a - .8) / .09),
  hypocercal: a => .4 + .6 * Math.pow(a, 1.4), diphycercal: a => 1.12 - .8 * Math.pow(a, 1.5), lyrate: a => .56 + .61 * Math.pow(a, 4),
  filamentous: a => .65 + 1.2 * Math.pow(a, 7), fantail: (a, n) => .46 + .54 * Math.sqrt(Math.max(0, 1 - Math.pow((a - .53) / .55, 2))) - (1 - a) * .24 * n,
};
const HOMO_T = { lunate: .15, forked: 0, emarginate: -.1, truncate: -.2, rounded: -.35 };
/** per-fish shape variation (fork depth jitter, lobe width, trailing-edge curve) drawn from the seed — bounded, never changes the family */
export function shapeVar(g) { const u = k => unitOf(g, 'tv' + k); return { curve: u(1) * 2 - 1, lobe: u(2) * 2 - 1, notchJ: u(3) * 2 - 1, wave: u(4) * 2 - 1 }; }
export function outlineFn(TL, type, notch, v, ornamental) {
  if (type === 'filamentous' && !ornamental) type = 'diphycercal';           /* trailing filaments belong to the ornamental niche only */
  const homo = TL.family === 'homocercal' && type in HOMO_T, n = clamp(notch + .1 * v.notchJ, 0, 1), Tt = clamp(TL.T + (HOMO_T[type] || 0) + .05 * v.notchJ, 0, 1);
  const base = homo ? a => homocercalOutline(a, Tt, n) : a => (SHAPES[type] || SHAPES.forked)(a, n);
  const e = clamp(1 + .3 * v.curve + (TL.planBias || 0), .6, 1.6), w = .12 * v.lobe;                                /* trailing-edge curve exponent, lobe fullness */
  return a => { const aa = Math.pow(clamp(a, 0, 1), e); return Math.max(.06, base(aa) * (1 + w * Math.sin(Math.PI * a) * (type === 'lunate' ? .5 : 1)) + .03 * v.wave * Math.sin(2 * Math.PI * a) * (1 - a)); };
}

/* ── heterocercal split: lobe ratio R achieved partly by length (upper lobe reaches further back), pitch of the whole fin ≤ 12.5° ── */
function edgeStats(Fn, chord, H, p) {
  const m = .2 * p, su = 1 + .55 * p, sl = 1 - .3 * p, Hu = H * (1 + m), Hl = H * (1 - m), N = 48; let mx = 0, my = 0;
  for (let i = 0; i <= N; i++) { const tt = i / N * 2 - 1, s = tt > 0 ? su : sl; mx += chord * s * Fn(Math.abs(tt)); my += tt > 0 ? Hu * tt : Hl * tt; }
  mx /= N + 1; my /= N + 1;
  const tu = [chord * su * Fn(1), Hu], tl = [chord * sl * Fn(1), -Hl];
  return { m, su, sl, Hu, Hl, ratio: Math.hypot(tu[0], tu[1]) / Math.hypot(tl[0], tl[1]), pitch: Math.atan2(my, mx) * 180 / Math.PI };
}
export function heteroSplit(R, Fn, chord, H) {
  let lo = 0, hi = 1; if (edgeStats(Fn, chord, H, 1).ratio < R) lo = hi = 1; else for (let k = 0; k < 28; k++) { const mid = (lo + hi) / 2; if (edgeStats(Fn, chord, H, mid).ratio < R) lo = mid; else hi = mid; }
  let p = hi, s = edgeStats(Fn, chord, H, p);
  for (let k = 0; k < 40 && s.pitch > CAP.pitchBuildDeg; k++) { p *= .93; s = edgeStats(Fn, chord, H, p); }
  return s;
}
const homoAsym = (f, TL) => TL.family === 'heterocercal' || ['diphycercal', 'filamentous'].includes(f.type) ? 0 : clamp(f.lobeAsym, -.28, .28);

/* ── caudal mesh builder (replaces the old addCaudal; same FinBuilder contract) ── */
export function buildCaudal(THREE, fb, bm, K, rays) {
  const f = bm.g.fins.caudal, fr = {}, sec = {}, p = {}; bm.frame(.988, fr); bm.section(.988, sec);
  const TL = bm.law.tail, orn = TL.ornamental, L = bm.L, hetero = TL.family === 'heterocercal' && f.type === 'heterocercal';
  const v = shapeVar(bm.g), Fn = outlineFn(TL, f.type, f.notch, v, orn);
  const capSpan = (orn ? CAP.caudalHOrn : CAP.caudalH) * L, span = Math.min(capSpan * (1 - Math.exp(-bm.maxD * f.span / capSpan * 1.25)), capSpan * .995),   /* soft saturation: typical tails sit well under the cap */ H = span * .5, asym = homoAsym(f, TL);
  const ys = { u: H * (1 + asym * .52), l: H * (1 - asym * .52) }, su = { u: 1, l: 1 };   /* the fin lies ON the body axis: no rotation anywhere */
  const tailY = t => { const tt = t * 2 - 1; return tt > 0 ? ys.u * tt : ys.l * tt; };
  const trailing = t => { const tt = t * 2 - 1; let x = (tt > 0 ? su.u : su.l) * Fn(Math.abs(tt)); if (bm.a.family === 'lobefin' && f.type === 'diphycercal') x *= 1 + .48 * gaussf(tt / .17); return x; };
  const lexp = f.type === 'lunate' ? 2.7 : 2.15;
  const leading = t => { const y = tailY(t), edge = y > 0 ? sec.dUp : sec.dDn, lim = y > 0 ? ys.u : ys.l; return trailing(y > 0 ? 1 : 0) * Math.pow(clamp((Math.abs(y) - edge) / Math.max(1e-6, lim - edge), 0, 1), lexp); };
  const fill = () => { let c = 0; for (let i = 0; i < 100; i++) { const t = (i + .5) / 100; c += Math.max(.005, trailing(t) - leading(t)) / 100; } return c; };
  let chord = clamp(span / Math.max(.1, f.aspect * fill()), L * .025, f.len * L * (f.type === 'filamentous' && orn ? 1.5 : 1.3));
  const split = () => { const s = heteroSplit(lobeRatioOf(f.lobeAsym), Fn, chord, H); ys.u = s.Hu; ys.l = s.Hl; su.u = s.su; su.l = s.sl; };
  if (hetero) split();
  const areaEst = () => (ys.u + ys.l) * chord * fill();                          /* area cap: chord is reduced if it would exceed capA × L² */
  if (areaEst() > CAP.caudalA * L * L * .95) { chord *= CAP.caudalA * L * L * .95 / areaEst(); if (hetero) split(); }
  const attached = t => { const y = tailY(t); return y >= -sec.dDn && y <= sec.dUp; };
  const root = (t, skinSide, out) => {
    const y = tailY(t), radius = y > 0 ? sec.dUp : sec.dDn, exp = y > 0 ? sec.nD : sec.nV;
    const th = Math.asin(Math.sign(y) * Math.pow(clamp(Math.abs(y) / Math.max(1e-8, radius), 0, 1), exp / 2)), theta = skinSide > 0 ? th : Math.PI - th;
    if (attached(t)) { bm.surface(.988, theta, p); out.set(p.x, p.y, p.z); }
    else { const x = chord * leading(t); out.set(fr.px + fr.tx * x + fr.nx * y, fr.py + fr.ty * x + fr.ny * y, skinSide * bm.maxD * .002 * (1 - Math.abs(t * 2 - 1))); }
    out.u = .988; out.theta = theta;
  };
  const r1 = new THREE.Vector3(), r2 = new THREE.Vector3(), sink = Math.min(CAP.sink * L, .5 * Math.min(sec.dUp, sec.dDn));
  const res = fb.add({ bm, kind: 'caudal', kindId: 5, R: Math.max(rays | 1, K > 2 ? 31 : 9), K: K > 2 ? K + 1 : K, flex: f.flex, opacity: f.opacity, memb: 1, spineFrac: 0, solid: bm.a.solid, blend: f.rootBlend, sink,
    thickness: bm.maxD * (bm.a.solid ? .01 : .008), normal: new THREE.Vector3(0, 0, 1), root, attached,
    base: (t, out) => { root(t, 1, r1); root(t, -1, r2); out.copy(r1).add(r2).multiplyScalar(.5); },
    edge: (t, out) => { const x = chord * trailing(t), y = tailY(t); out.set(fr.px + fr.tx * x + fr.nx * y, fr.py + fr.ty * x + fr.ny * y, 0); } });
  /* measured in the body frame (x along the axis, y up): tips, lobe lengths, pitch of the trailing-edge centroid, height, area */
  const pts = res.tips.map(tp => { const dx = tp.x - fr.px, dy = tp.y - fr.py; return [dx * fr.tx + dy * fr.ty, dx * fr.nx + dy * fr.ny]; });
  let lo = Infinity, hi = -Infinity, mx = 0, my = 0; for (const [x, y] of pts) { lo = Math.min(lo, y); hi = Math.max(hi, y); mx += x; my += y; } mx /= pts.length; my /= pts.length;
  const tu = pts[pts.length - 1], tl = pts[0], measured = hi - lo;
  return { span: measured, area: res.area, ar: res.area > 0 ? measured * measured / res.area : 0, heightL: measured / L, areaL: res.area / (L * L), pitchDeg: Math.atan2(my, mx) * 180 / Math.PI,
    lobeRatio: Math.hypot(tu[0], tu[1]) / Math.max(1e-9, Math.hypot(tl[0], tl[1])), spineDeg: hetero ? spineDegOf(f.lobeAsym) : 0, family: TL.family, type: f.type, sinkL: sink / L, ornamental: orn,
    outline: pts.filter((q, i) => i % 3 === 0).map(q => [+(q[0] / L).toFixed(4), +(q[1] / L).toFixed(4)]) };
}
