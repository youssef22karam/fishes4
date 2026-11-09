/* ROSTRAL TEETH (round 6H, L2 attachment law). Every tooth of a toothed blade is ROOTED IN THE BLADE EDGE: the root is interpolated on the lateral edge of the lofted blade
   at the tooth's own station (the blade tapers, so a fixed lateral offset would float beside it); the cone base is buried 35 % of its length inside the blade and the base
   radius never exceeds the local blade thickness. Returns one InstancedMesh; userData.rostralTeeth lists root / tip / edge points so the shared audit can re-test attachment. */
export function buildRostralTeeth(THREE, blade, len, L, toothMat) {
  const rings = blade.geometry.userData.rings, N = rings.length - 1, n = Math.max(6, Math.floor(len / (0.03 * L))), cone = new THREE.ConeGeometry(1, 1, 4, 1); cone.translate(0, 0.5, 0);
  const inst = new THREE.InstancedMesh(cone, toothMat, n * 2), M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), Sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), D = new THREE.Vector3(), info = [];
  const lerp = (a, b, t) => a + (b - a) * t;
  const pt = (r, side) => { let m = r[0], lo = 1e9, hi = -1e9; for (const q of r) { if (side * q[2] > side * m[2]) m = q; lo = Math.min(lo, q[1]); hi = Math.max(hi, q[1]); } return { x: m[0], y: m[1], z: m[2], h: (hi - lo) / 2 }; };
  const edgeAt = (f, side) => { const x = f * N, i0 = Math.min(N - 1, Math.floor(x)), t = x - i0, a = pt(rings[i0], side), b = pt(rings[i0 + 1], side); return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t), h: lerp(a.h, b.h, t) }; };
  let k = 0;
  for (let i = 0; i < n; i++) for (const side of [1, -1]) {
    const f = .08 + (i + .5) / n * .8, E = edgeAt(f, side), hz = Math.abs(E.z), rad = Math.max(1e-5, Math.min(.004 * L, E.h * .8, hz * .8)), tl = Math.min(.03 * L, Math.max(.006 * L, hz * 1.1));
    D.set(.28, 0, side).normalize(); P.set(E.x, E.y, E.z).addScaledVector(D, -.35 * tl); Q.setFromUnitVectors(up, D); Sc.set(rad, tl, rad); M.compose(P, Q, Sc); inst.setMatrixAt(k++, M);
    info.push({ root: P.clone(), tip: P.clone().addScaledVector(D, tl), edge: new THREE.Vector3(E.x, E.y, E.z), side, rad, len: tl, f });
  }
  cone.setAttribute('aJaw', new THREE.InstancedBufferAttribute(new Float32Array(n * 2), 1)); inst.frustumCulled = false; inst.userData.rostralTeeth = info; return inst;
}
