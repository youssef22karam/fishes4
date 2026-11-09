/* TEETH — continuous, ROOTED rows along both lip edges, built on the SAME lip line as the jaw patch / pocket rim (mouthgeo.lipPoint).
   · Custom sculpted 3D tooth geometry per tooth class:
     - fang / needle: flared gingival root collar, biconvex shaft, and organic lingual recurve (base at (0,0,0), tip at (0,1,0));
     - triangular: labio-lingually compressed biconvex blade with sharp mesial-distal carinae aligned tangentially along the dental arch;
     - molar: low hemispherical crushing crown with a rounded occlusal dome;
     - villiform / rasp: fine cardiform conical odontodes forming a velvety dental band behind the lip roll.
   · Every tooth base is buried ≥ 1/3 of its length INSIDE the jaw edge and tucked behind the lip roll;
   · Orthonormal dental-arcade frame aligns blade compression and lingual recurve toward the pharynx. */
import { jawU0, jawU1, jawW, lipPoint } from './mouthgeo.js';

export const TOOTH_LEN = { villiform: .02, rasp: .02, molar: .026, triangular: .06, needle: .07, fang: .10 };   /* × head length */
export const TOOTH_LEN_MAX = .14, TOOTH_SPACING_MAX = 1.5;
const hash = (i, s) => { const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); };

/** THE jaw envelope (single source of truth for generator AND validator, mouthcheck.js imports it). */
export function jawEnv(bm, H, x, y, o = {}) {
  const fr = bm._tef || (bm._tef = {}), s = bm._tes || (bm._tes = {}), u = H.clamp((bm.headX - x) / bm.L, .003, .999); bm.frame(u, fr); bm.section(u, s);
  const ly = (x - fr.px) * fr.nx + (y - fr.py) * fr.ny; o.u = u; o.ly = ly; o.dUp = s.dUp; o.dDn = s.dDn; o.hw = bm.halfWidthAtY(s, H.clamp(ly, -s.dDn * .99, s.dUp * .99)); return o;
}
export const jawIn = (e, z, slack) => e.ly > -e.dDn * slack && e.ly < e.dUp * slack && Math.abs(z) <= e.hw * slack + 1e-6;
export const TEETH_SLACK = 1.04, TEETH_FIT = .9;

/** Sculpted unit tooth geometry (base at y = 0, apex at (0, 1, 0), radius 1 at base). */
function buildSculptedToothGeo(THREE, form) {
  const segR = form === 'triangular' ? 8 : 10, segY = 5;
  const pos = [], idx = [];
  const blunt = form === 'molar', tri = form === 'triangular', fang = form === 'fang' || form === 'needle';
  for (let iy = 0; iy <= segY; iy++) {
    const y = iy / segY;
    /* Radial profile: flared root collar near y=0, smooth taper to apex (or dome for molar) */
    const collar = 1 + .16 * Math.exp(-y * 14);
    const rProfile = blunt
      ? Math.sqrt(Math.max(0, 1 - Math.pow(y * .98, 2.2))) * collar
      : tri
        ? Math.pow(1 - y, .82) * (1 + .12 * Math.sin(Math.PI * y)) * collar
        : Math.pow(1 - y, .88) * collar;
    /* Lingual recurve: arches slightly labially at mid-shaft and hooks lingually (+z) toward the tip, zero at y=0 and y=1 */
    const recurveZ = fang ? -.14 * Math.sin(Math.PI * Math.pow(y, .85)) * (1 - y) : tri ? -.05 * Math.sin(Math.PI * y) : 0;
    for (let ir = 0; ir < segR; ir++) {
      const a = (ir / segR) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      /* Biconvex carina sharpening on triangular / fang teeth */
      const carina = tri ? (1 + .18 * Math.pow(Math.abs(ca), 3)) : 1;
      const rx = (iy === segY && !blunt) ? 0 : ca * rProfile * carina;
      const rz = (iy === segY && !blunt) ? 0 : sa * rProfile + recurveZ;
      pos.push(rx, y, rz);
    }
  }
  for (let iy = 0; iy < segY; iy++) {
    for (let ir = 0; ir < segR; ir++) {
      const a = iy * segR + ir, b = iy * segR + (ir + 1) % segR, c = a + segR, d = b + segR;
      idx.push(a, b, c, b, d, c);
    }
  }
  /* Base cap at y = 0 */
  const c0 = pos.length / 3; pos.push(0, 0, 0);
  for (let ir = 0; ir < segR; ir++) idx.push(c0, (ir + 1) % segR, ir);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** lip arc of the upper jaw (static): right corner → chin → left corner, as dense points with frame data; teeth ride on it for both jaws */
export function lipArc(bm, H, NS = 80) {
  const u0 = jawU0(bm), uc = Math.min(bm.mcU * .97, jawU1(bm)), pts = [], o = {};
  for (const side of [1, -1]) for (let i = 0; i <= NS; i++) {
    const k = side > 0 ? NS - i : i, u = H.lerp(u0, uc, Math.pow(k / NS, 1.4)); lipPoint(bm, u, side, H, 0, o);
    pts.push({ x: o.x, y: o.y, z: o.z, ly: o.ly, lz: o.lz, tx: o.tx, ty: o.ty, nx: o.nx, ny: o.ny, u });
  }
  let s = 0; pts[0].s = 0;
  for (let i = 1; i < pts.length; i++) { s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y, pts[i].z - pts[i - 1].z); pts[i].s = s; }
  return { pts, total: s };
}
function at(arc, s) {
  const p = arc.pts; let lo = 0, hi = p.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p[m].s <= s) lo = m; else hi = m; }
  const a = p[lo], b = p[hi], f = (s - a.s) / Math.max(1e-12, b.s - a.s), L = k => a[k] + (b[k] - a[k]) * f;
  return { x: L('x'), y: L('y'), z: L('z'), tx: L('tx'), ty: L('ty'), nx: L('nx'), ny: L('ny'), u: L('u') };
}

/** returns { mesh (InstancedMesh), info } or null */
export function buildTeethRows(bm, mats, H, form) {
  const { THREE } = H, M = bm.law.mouth; if (!form || form === 'none' || form === 'beak') return null;
  const hl = bm.h * bm.L, widest = !!M.widest, arc = lipArc(bm, H);
  let base = (TOOTH_LEN[form] || .03) * hl; if (form === 'fang' && widest) base = Math.min(TOOTH_LEN_MAX, .14) * hl; if (base < .02 * hl) base = .02 * hl;
  const slender = form === 'needle' || form === 'fang', blunt = form === 'molar';
  const radK = blunt ? .85 : form === 'triangular' ? .42 : slender ? .17 : .3, flat = form === 'triangular' ? .46 : blunt ? .92 : .78;
  const rowsN = (widest || bm.ax.plan.cartilaginous) && (form === 'needle' || form === 'fang' || form === 'triangular') ? 2 : 1;
  const cone = buildSculptedToothGeo(THREE, form);
  const list = [], seed = (M.openDeg || 1) * .37 + bm.L;
  const D = new THREE.Vector3(), B = new THREE.Vector3(), Pm = new THREE.Vector3(), Md = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), Mx = new THREE.Matrix4();
  const Xaxis = new THREE.Vector3(), Zaxis = new THREE.Vector3(), Rmat = new THREE.Matrix4();
  let idx = 0; const ev = {}, ev2 = {};
  for (let row = 0; row < rowsN; row++) for (const lower of [false, true]) {
    let pos = arc.total * .012 + (row ? .5 : 0) * base * .1;
    const end = arc.total * .988; let n = 0;
    while (pos < end && n < 200) {
      const sN = pos / arc.total;
      /* Natural grading: prominent anterolateral canines on fang/needle jaws, smooth arch grading toward corners */
      const canineBoost = slender ? (1 + .18 * Math.exp(-Math.pow((Math.abs(sN - .5) - .12) / .08, 2))) : 1;
      const grade = (.38 + .62 * Math.pow(Math.sin(Math.PI * H.clamp(sN, 0, 1)), .78)) * canineBoost;
      const jit = 1 + (hash(idx, seed) - .5) * .36;
      const P = at(arc, pos), sc = bm._ts || (bm._ts = {}); bm.section(P.u, sc);
      let len = Math.min(TOOTH_LEN_MAX * hl, base * grade * jit * (row ? .62 : 1), .26 * (sc.dUp + sc.dDn)), rad = 0, ok = false;
      const sgn = lower ? -1 : 1, front = 1 - H.sstep(0, .14, (P.u - jawU0(bm)) / Math.max(1e-6, Math.min(bm.mcU * .97, jawU1(bm)) - jawU0(bm)));
      const back = hl * .1; Md.set(P.tx * back, P.ty * back, -P.z).normalize();   /* medial/lingual inward direction */
      const jx = (hash(idx + 7, seed) - .5) * .18, jz = (hash(idx + 13, seed) - .5) * .18;
      for (let tr = 0; tr < 9 && len >= .012 * hl; tr++, len *= .86) {
        rad = Math.max(len * radK, .0012 * bm.L);
        const inset = rad * 1.25 + (row ? len * .5 + rad : 0) + (len * .55 + rad * 2) * front;
        B.set(P.x + Md.x * inset + P.nx * sgn * len / 3, P.y + Md.y * inset + P.ny * sgn * len / 3, P.z + Md.z * inset);
        const e = jawEnv(bm, H, B.x, B.y, ev);
        if (!(e.ly > -e.dDn * TEETH_FIT && e.ly < e.dUp * TEETH_FIT)) continue;
        const zmax = e.hw * TEETH_FIT - rad * flat; if (zmax <= 0) continue;
        if (Math.abs(B.z) > zmax) B.z = Math.sign(B.z || 1) * zmax;
        if (Math.hypot(B.x - P.x, B.y - P.y, B.z - P.z) > 2.35 * len + 7.8 * rad) continue;
        let tl = 1; for (let k = 0; k < 4; k++, tl *= .5) {
          /* Inward lingual cant (stronger on fangs/needles so teeth hook toward the throat) */
          const lingualCant = slender ? .14 : .08;
          D.set(-P.nx * sgn, -P.ny * sgn, 0).addScaledVector(Md, lingualCant).add(Pm.set(P.tx * .06 + jx * tl, 0, jz * tl)).normalize();
          const te = jawEnv(bm, H, B.x + D.x * len, B.y + D.y * len, ev2); if (jawIn(te, B.z + D.z * len, TEETH_FIT)) { ok = true; break; }
        }
        if (ok) break;
      }
      if (!ok) { pos += .02 * hl; continue; }
      /* Align tooth local axes with the dental arcade: Y = D (tooth axis), Z = lingual/medial (Md), X = mesial-distal tangent */
      Zaxis.copy(Md).addScaledVector(D, -Md.dot(D));
      if (Zaxis.lengthSq() < 1e-6) Zaxis.set(0, 0, 1); else Zaxis.normalize();
      Xaxis.crossVectors(D, Zaxis).normalize();
      Zaxis.crossVectors(Xaxis, D).normalize();
      Rmat.makeBasis(Xaxis, D, Zaxis);
      Q.setFromRotationMatrix(Rmat);
      S.set(rad, len, rad * flat); Mx.compose(B, Q, S);
      list.push({ m: Mx.clone(), w: lower ? jawW(bm, P.u, H) : 0, lower, u: P.u, len, rad, root: B.clone(), tip: B.clone().addScaledVector(D, len), lip: Pm.set(P.x, P.y, P.z).clone(), row });
      pos += 2 * rad * 1.3 + (row ? rad * .6 : 0); n++; idx++;
    }
  }
  const inst = new THREE.InstancedMesh(cone, mats.tooth, list.length), aJaw = new Float32Array(list.length);
  list.forEach((t, i) => { inst.setMatrixAt(i, t.m); aJaw[i] = t.w; });
  cone.setAttribute('aJaw', new THREE.InstancedBufferAttribute(aJaw, 1)); inst.frustumCulled = false; inst.instanceMatrix.needsUpdate = true;
  inst.userData.teethInfo = list.map(t => ({ u: t.u, len: t.len, rad: t.rad, lower: t.lower, row: t.row, root: t.root, tip: t.tip, lip: t.lip, spacing: 2.6 * t.rad })); inst.userData.hl = hl;
  return inst;
}
