/* APPENDAGES — rooted, tapered, flexible skin strands: barbels, head lures (illicium + esca) and tail filaments.
   Every strand: root sunk into the skin at a defined head station, thickest at the root, thinning continuously to a fine tip,
   built from segments along a gentle natural curve (backward sweep + droop under its own weight), body-coloured with a lighter tip.
   Never a straight cylinder, never a wire, never crossing the midline or the mouth. Lengths come from laws.js (hard caps).
   H = { THREE, clamp, lerp, sstep, TAU }.  Output geometry carries aBody = (u, angle, tag 4, t-along-strand) so the body shader colours it. */
import { barbelPlan, barbelLength, lureLaw, whipLen } from './laws.js';

export const STRAND_TAG = 4;

/** Tapered tube through `pts` (Vector3[]), radius r(t) with t in 0..1, closed with a fine tip. aBody: root skin coordinates + t. */
export function strandGeometry(H, pts, radius, u, ang, M = 6, tag = STRAND_TAG) {
  const { THREE } = H, N = pts.length - 1, pos = [], ab = [], idx = [];
  let ref = new THREE.Vector3(0, 0, 1);
  const tan = new THREE.Vector3(), nrm = new THREE.Vector3(), bin = new THREE.Vector3();
  for (let i = 0; i <= N; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)];
    tan.subVectors(b, a).normalize();
    if (Math.abs(tan.dot(ref)) > .92) ref.set(0, 1, 0);
    nrm.copy(ref).addScaledVector(tan, -ref.dot(tan)).normalize(); bin.crossVectors(tan, nrm);
    ref = nrm.clone();                                                     /* parallel transport: no twist, no pinch */
    const t = i / N, r = radius(t);
    for (let j = 0; j < M; j++) {
      const th = j / M * H.TAU, c = Math.cos(th) * r, s = Math.sin(th) * r;
      pos.push(pts[i].x + nrm.x * c + bin.x * s, pts[i].y + nrm.y * c + bin.y * s, pts[i].z + nrm.z * c + bin.z * s);
      ab.push(u, ang, tag, t);
    }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a = i * M + j, b = i * M + (j + 1) % M, c = a + M, d = b + M; idx.push(a, c, b, b, c, d); }
  const b0 = pos.length / 3;                                              /* closed root cap, buried in the skin */
  pos.push(pts[0].x - (pts[1].x - pts[0].x) * .4, pts[0].y - (pts[1].y - pts[0].y) * .4, pts[0].z - (pts[1].z - pts[0].z) * .4); ab.push(u, ang, tag, 0);
  for (let j = 0; j < M; j++) idx.push(b0, (j + 1) % M, j);
  const tip = pos.length / 3, end = pts[N], prev = pts[N - 1];
  pos.push(end.x + (end.x - prev.x) * .35, end.y + (end.y - prev.y) * .35, end.z + (end.z - prev.z) * .35); ab.push(u, ang, tag, 1);
  for (let j = 0; j < M; j++) idx.push(tip, N * M + (j + 1) % M, N * M + j);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('aBody', new THREE.Float32BufferAttribute(ab, 4)); geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}
const pathLength = pts => { let l = 0; for (let i = 1; i < pts.length; i++) l += pts[i].distanceTo(pts[i - 1]); return l; };

/** Gentle natural curve: leaves the skin along d0, then is bent progressively backward and downward (droop grows along the strand).
    Optional z lock keeps it on its own side of the midline, so paired strands never cross. */
function naturalPath(H, root, d0, len, back, sweep, droop, zLock, inward, sink, N = 10) {
  const { THREE } = H, pts = [], ds = len / N, d = new THREE.Vector3(), down = new THREE.Vector3(0, -1, 0), wob = new THREE.Vector3().crossVectors(d0, back).normalize();
  const start = root.clone().addScaledVector(inward, -sink);                 /* sunk along the skin normal: the root is buried, no visible joint */
  pts.push(start, root.clone().addScaledVector(inward, -sink * .35));
  const p = root.clone();
  for (let i = 1; i <= N - 1; i++) {
    const t = i / N;
    d.copy(d0).addScaledVector(back, sweep * t).addScaledVector(down, droop * Math.pow(t, 1.4)).addScaledVector(wob, Math.sin(t * Math.PI * 1.7) * .32).normalize();   /* soft S-curve: a living strand, not a rod */
    p.addScaledVector(d, ds);
    if (zLock) { const s = Math.sign(zLock), floor = Math.abs(zLock); p.z = s * Math.max(Math.abs(p.z), floor); }
    pts.push(p.clone());
  }
  return pts;
}

/* ── barbels ── (round 5A) stations lie between the jaw start (snout set-back on ventral mouths) and the mouth corner, on the lip line (corner pair),
   just below it (chin pair) or on the belly midline (the single median chin barbel). */
function stationOf(bm, kind, side) {
  const mc = bm.mcU, j0 = Math.max(bm.jawStartU, .004), fr = {}, s = {}, th = t => side > 0 ? t : Math.PI - t;
  const lipTheta = u => { bm.frame(u, fr); bm.section(u, s); const y = bm.mouthLineY(u, s), yr = y > 0 ? s.dUp : s.dDn, n = y > 0 ? s.nD : s.nV; return Math.asin(Math.sign(y || -1) * Math.pow(Math.min(.9, Math.abs(y) / Math.max(1e-8, yr)), n / 2)); };
  switch (kind) {
    case 'corner': { const u = j0 + (mc - j0) * .94; return { u, theta: th(lipTheta(u)), flow: { out: .8, down: .3, fwd: .0 } }; }
    case 'chinPair': { const u = j0 + (mc - j0) * .5; return { u, theta: th(Math.max(-1.4, lipTheta(u) - .38)), flow: { out: .55, down: .6, fwd: .0 } }; }
    default: return { u: j0 + (mc - j0) * .42, theta: -Math.PI / 2, flow: { out: 1, down: .2, fwd: 0 } };   /* single median chin barbel */
  }
}
/* jaw weight at a root station: identical to the lower-jaw patch weight, so chin roots rotate with the jaw and corner roots stay with the hinge */
const jawW = (bm, u) => { const a = Math.max(.004, bm.jawStartU), t0 = a + (bm.mcU - a) * .85, t = Math.min(1, Math.max(0, (u - t0) / Math.max(1e-9, bm.mcU - t0))); return 1 - t * t * (3 - 2 * t); };
export function buildBarbels(bm, mats, H) {
  const { THREE } = H, plan = barbelPlan(bm.g, bm.ax, bm.law.mouth), geos = [], info = [], headLen = bm.h * bm.L;
  bm.barbelPlan = plan;
  if (!plan.items.length) { bm.appendages = Object.assign(bm.appendages || {}, { barbels: info }); return null; }
  const fr = {}, p = {}, nrm = new THREE.Vector3();
  for (const item of plan.items) for (const side of item.paired ? [1, -1] : [0]) {
    const st = stationOf(bm, item.kind, side || 1), len = barbelLength(item, headLen, bm.L);
    bm.attachedSurface(st.u, st.theta, p); bm.frame(st.u, fr); bm.surfaceNormal(st.u, st.theta, nrm);
    const root = new THREE.Vector3(p.x, p.y, side ? p.z : 0);
    const fwd = new THREE.Vector3(-fr.tx, -fr.ty, 0), back = fwd.clone().negate(), sd = side || 1;
    const d0 = nrm.clone().multiplyScalar(st.flow.out).addScaledVector(new THREE.Vector3(0, -1, 0), st.flow.down).addScaledVector(fwd, st.flow.fwd);
    if (!side) d0.z = 0; d0.normalize();
    const zLock = side ? Math.sign(root.z || sd) * Math.abs(root.z) * .8 : 0;
    const r0 = Math.max(len * .04, Math.min(len * .07, bm.maxD * .016)), rTip = Math.max(len * .006, bm.L * 2e-4);
    const pts = naturalPath(H, root, d0, len, back, 1.3, 1.9 + .4 * item.lenHead, zLock, nrm.clone().normalize(), Math.max(len * .1, r0 * 3));
    const ang = (((st.theta + Math.PI / 2) / H.TAU) % 1 + 1) % 1;
    geos.push(strandGeometry(H, pts, t => rTip + (r0 - rTip) * Math.pow(1 - t, 1.5), st.u, ang, 6, 4 + .08 * jawW(bm, st.u)));
    const rq = {}; bm.attachedSurface(st.u, st.theta, rq);
    info.push({ path: pts.slice(1), layout: plan.layout, jw: jawW(bm, st.u), rootErr: Math.hypot(rq.x - p.x, rq.y - p.y, rq.z - p.z), kind: item.kind, side, root, len: pathLength(pts.slice(1)), tip: pts[pts.length - 1].clone(), capLen: len, seg: pts.length - 1 });
  }
  bm.appendages = Object.assign(bm.appendages || {}, { barbels: info });
  bm.barbelTip = info.length ? info[0].tip : null;
  const mesh = new THREE.Mesh(mergeStrands(THREE, geos), mats.body); mesh.frustumCulled = false; mesh.userData.appendage = 'barbels'; return mesh;
}
function mergeStrands(THREE, list) {
  const pos = [], nor = [], ab = [], idx = []; let off = 0;
  for (const g of list) { const P = g.getAttribute('position'), Nn = g.getAttribute('normal'), A = g.getAttribute('aBody'), I = g.getIndex();
    for (let i = 0; i < P.count; i++) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(Nn.getX(i), Nn.getY(i), Nn.getZ(i)); ab.push(A.getX(i), A.getY(i), A.getZ(i), A.getW(i)); }
    for (let i = 0; i < I.count; i++) idx.push(I.getX(i) + off); off += P.count; g.dispose(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('aBody', new THREE.Float32BufferAttribute(ab, 4)); geo.setIndex(idx); return geo;
}

/* ── head lure: short thick stalk on a dorsal head station, arching forward then drooping, ending in a fleshy esca ── */
export function buildLure(bm, mats, H) {
  const { THREE } = H, L = bm.L, law = lureLaw(bm.g, bm.ax); if (!law.allowed) return [];
  const total = law.lenBody * L, u0 = bm.h * .3, fr = {}, p = {}, nrm = new THREE.Vector3();
  bm.frame(u0, fr); bm.attachedSurface(u0, Math.PI / 2, p); bm.surfaceNormal(u0, Math.PI / 2, nrm);
  const root = new THREE.Vector3(p.x, p.y, 0), up = nrm.clone().setZ(0).normalize(), fwd = new THREE.Vector3(-fr.tx, -fr.ty, 0);
  const rb = Math.min(Math.max(total * .06, L * .0035), L * .02), stalk = Math.max(1e-4, total - 2 * rb);
  /* sagittal bezier (forward, up): rises, arches over the snout, tip hangs; scaled to the exact stalk length */
  const c = [[0, 0], [.04, .5], [.5, .82], [.66, .5]], pts0 = [];
  for (let i = 0; i <= 14; i++) { const t = i / 14, q = 1 - t; pts0.push([q * q * q * c[0][0] + 3 * q * q * t * c[1][0] + 3 * q * t * t * c[2][0] + t * t * t * c[3][0], q * q * q * c[0][1] + 3 * q * q * t * c[1][1] + 3 * q * t * t * c[2][1] + t * t * t * c[3][1]]); }
  let arc = 0; for (let i = 1; i < pts0.length; i++) arc += Math.hypot(pts0[i][0] - pts0[i - 1][0], pts0[i][1] - pts0[i - 1][1]);
  const k = stalk / arc, pts = [root.clone().addScaledVector(up, -total * .03)];
  for (const [f, v] of pts0) pts.push(root.clone().addScaledVector(fwd, f * k).addScaledVector(up, v * k));
  const r0 = Math.max(total * .035, L * .003), rTip = Math.max(total * .006, L * 2e-4);
  const geo = strandGeometry(H, pts, t => rTip + (r0 - rTip) * Math.pow(1 - t, 1.3), u0, .75, 7);
  const m1 = new THREE.Mesh(geo, mats.body); m1.frustumCulled = false; m1.userData.appendage = 'lure';
  const tip = pts[pts.length - 1], bulb = new THREE.SphereGeometry(rb, 10, 8); bulb.scale(.85, 1.15, .85); bulb.translate(tip.x, tip.y - rb * .85, tip.z);
  const m2 = new THREE.Mesh(bulb, mats.glow); m2.frustumCulled = false; m2.userData.appendage = 'esca';
  let reach = 0; for (const q of pts) reach = Math.max(reach, q.distanceTo(root)); reach += 2 * rb;
  bm.lureTip = new THREE.Vector3(tip.x, tip.y - rb * .85, tip.z);
  const lq = {}; bm.attachedSurface(u0, Math.PI / 2, lq);
  bm.appendages = Object.assign(bm.appendages || {}, { lure: { rootErr: Math.hypot(lq.x - p.x, lq.y - p.y, lq.z - p.z), root, len: pathLength(pts.slice(1)) + 2 * rb, reach, cap: law.lenBody * L, tip: bm.lureTip, hasBulb: true } });
  return [m1, m2];
}

/* ── tail filament: tapered, gently undulating, ≤ 0.6 × body length ── */
export function buildWhip(bm, mats, H) {
  const { THREE } = H, L = bm.L, fr = {}, s = {}, len = whipLen(bm.g) * L;
  bm.frame(1, fr); bm.section(1, s);
  const root = new THREE.Vector3(fr.px, fr.py, 0), back = new THREE.Vector3(fr.tx, fr.ty, 0), up = new THREE.Vector3(-fr.ty, fr.tx, 0).setZ(0);
  const pts = [root.clone().addScaledVector(back, -len * .04)];
  for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push(root.clone().addScaledVector(back, t * len).addScaledVector(up, Math.sin(t * Math.PI * 1.3) * len * .035 * t).add(new THREE.Vector3(0, -len * .05 * t * t, 0))); }
  const r0 = Math.max(.002 * L, (s.dUp + s.dDn) * .3), rTip = Math.max(L * 1.5e-4, len * .002);
  const geo = strandGeometry(H, pts, t => rTip + (r0 - rTip) * Math.pow(1 - t, 1.6), .999, .25, 6);
  const m = new THREE.Mesh(geo, mats.body); m.frustumCulled = false; m.userData.appendage = 'whip';
  bm.appendages = Object.assign(bm.appendages || {}, { whip: { root, len: pathLength(pts.slice(1)), cap: whipLen(bm.g) * L } });
  return [m];
}
