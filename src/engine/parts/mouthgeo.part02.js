    - Inner buccal-pharyngeal funnel walls (buildCavity),
    - Sculpted anatomical basihyal tongue resting on the mandibular floor (with median lingual groove and rounded tip),
    - Curved lateral branchial gill arches framing the pharynx entrance. */
export function buildInterior(bm, mats, H) {
  const { THREE } = H, g = bm.g, walls = buildCavity(bm, mats, H), out = [...walls]; walls.forEach(w => { w.userData.layer = 'walls'; });
  const u0 = Math.max(bm.jawStartU, .006), u1 = bm.mcU * .94, depth = Math.min(g.mouth.cavityDepth, CAVITY_MAX) * bm.h * bm.L, fr = {}, sl = new THREE.Vector3(), su = new THREE.Vector3();
  bm.frame(bm.mcU, fr);
  const ap = apertureAt(bm, (u0 + u1) / 2, H);
  const lowY = skinPoint(bm, (u0 + u1) / 2, mouthLevel(bm, (u0 + u1) / 2, H) - ap * .98, 1, sl, 0).clone(), upY = skinPoint(bm, (u0 + u1) / 2, mouthLevel(bm, (u0 + u1) / 2, H) + ap * .98, 1, su, 0).clone();
  const hy = Math.max(1e-5, Math.abs((upY.x - lowY.x) * fr.nx + (upY.y - lowY.y) * fr.ny)) * .5, hw = Math.max(1e-5, bm.halfWidthAtY(bm.section(bm.mcU, {}), 0));
  const mid = new THREE.Vector3((lowY.x + upY.x) / 2, (lowY.y + upY.y) / 2, 0), L = bm.L;

  /* Basihyal tongue: flattened oblong lingual cushion with median dorsal groove and rounded anterior tip */
  const tc = mid.clone().addScaledVector(new THREE.Vector3(fr.nx, fr.ny, 0), -hy * .60).addScaledVector(new THREE.Vector3(fr.tx, fr.ty, 0), depth * .22);
  const tongueShape = (x, y, z) => {
    const fwd = H.clamp(-x, -1, 1);                                     /* +1 at anterior tongue tip, -1 at root */
    const widthTaper = .82 + .24 * Math.sin(Math.PI * (fwd * .5 + .5));
    const groove = y > 0 ? 1 - .22 * Math.exp(-z * z * 6) * H.sstep(-.4, .8, fwd) : .72;
    return { x, y: y * groove + .12 * Math.sin(Math.PI * (fwd * .5 + .5)), z: z * widthTaper };
  };
  out.push(Object.assign(
    blobMesh(
      bm, mats, H,
      tc.addScaledVector(new THREE.Vector3(fr.nx, fr.ny, 0), -hy * .10).addScaledVector(new THREE.Vector3(fr.tx, fr.ty, 0), depth * .18),
      Math.min(depth * .64, depth * .56 + (u1 - u0) * L * .32),
      hy * .28,
      Math.max(centreBand(bm) * 2.6, Math.min(hw * .52, hy * 1.65 + 1e-5)),
      fr, 1.5,
      (x) => Math.max(0, .58 - x * .52) * (1 - H.sstep(.2, 1, x * .5 + .5) * .35),
      10, 16, tongueShape
    ),
    { userData: { layer: 'tongue' } }
  ));

  /* Branchial gill arches: curved lateral ceratobranchial bars framing the posterior pharynx */
  const nA = 3 + (g.mouth.gape > .55 ? 1 : 0);
  for (let k = 0; k < nA; k++) {
    const back = depth * (.58 + .10 * k), c = mid.clone().addScaledVector(new THREE.Vector3(fr.tx, fr.ty, 0), back);
    for (const sd of [-1, 1]) {
      const archShape = (x, y, z) => ({
        x: x + .35 * (1 - y * y),                                       /* forward-curving C-arch profile */
        y,
        z: z - sd * .22 * (1 - y * y)
      });
      out.push(Object.assign(
        blobMesh(bm, mats, H, c.clone().setZ(sd * hw * (.62 - .04 * k)), depth * .032, hy * .64, Math.min(hw * .22, hy * .52 + 1e-5), fr, 1.25, () => .12 * (1 - k / nA), 6, 12, archShape),
        { userData: { layer: 'arches' } }
      ));
    }
  }
  return out;
}

/** Shallow floored disc with a sculpted lip ring: underside sucker (construction 'sucker') or front cap of a short tube ('tube'). */
export function buildDisc(bm, mats, H, M) {
  const { THREE } = H, g = bm.g, front = M.construction === 'tube';
  const u = front ? .006 : bm.h * .3, theta = front ? 0 : -Math.PI / 2, fr = {}, p = {}; bm.frame(u, fr);
  const normal = new THREE.Vector3();
  if (front) normal.set(-fr.tx, -fr.ty, 0).normalize(); else bm.surfaceNormal(u, theta, normal);
  const centre = new THREE.Vector3();
  if (front) centre.set(fr.px, fr.py, 0).addScaledVector(normal, bm.L * .0007); else { bm.rawSurface(u, theta, p); centre.set(p.x, p.y, p.z).addScaledVector(normal, bm.L * .0008); }
  const headL = bm.h * bm.L, radius = front ? Math.min(bm.maxD * .07, headL * .12) : Math.min(bm.maxD * .22, headL * .3);
  const depth = Math.min(DISC_DEPTH_MAX * headL * .95, radius * .35) * (front ? .4 : 1);
  const rot = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  const lip = new THREE.RingGeometry(radius * .78, radius * 1.04, 32, 2); lip.applyQuaternion(rot);
  lip.translate(centre.x, centre.y, centre.z); H.skinAttributes(lip, bm);
  /* floored oral dish: concave rings sinking to a dark buccal floor at `depth` */
  const NR = 7, NA = 28, pos = [], ab = [], idx = [];
  for (let i = 0; i <= NR; i++) {
    const rr = radius * .92 * (1 - i / NR), z = -depth * (1 - Math.pow(rr / (radius * .92), 2));
    for (let j = 0; j < NA; j++) {
      const a = j / NA * H.TAU; pos.push(Math.cos(a) * rr, Math.sin(a) * rr, z); ab.push(u, .25 + .65 * (i / NR), 1, 0);
    }
  }
  for (let i = 0; i < NR; i++) for (let j = 0; j < NA; j++) { const a = i * NA + j, b = i * NA + (j + 1) % NA, c = a + NA, d = b + NA; idx.push(a, b, c, b, d, c); }
  const dish = new THREE.BufferGeometry(); dish.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); dish.setAttribute('aBody', new THREE.Float32BufferAttribute(ab, 4)); dish.setIndex(idx); dish.computeVertexNormals();
  dish.applyQuaternion(rot); dish.translate(centre.x, centre.y, centre.z);
  const out = [new THREE.Mesh(lip, mats.body), new THREE.Mesh(dish, mats.jaw)];
  out[0].userData.disc = { depth, headL, radius, front, normalY: normal.y, centreY: centre.y };
  if (g.mouth.teeth === 'rasp' && !front) {
    const teeth = [];
    for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 18; i++) {
      const a = (i + ring * .5) / 18 * H.TAU, rr = radius * (.72 - ring * .20), geo = new THREE.ConeGeometry(radius * .032, radius * .095, 5);
      geo.rotateX(Math.PI / 2);
      geo.translate(Math.cos(a) * rr, Math.sin(a) * rr, -depth * (1 - (rr / radius) ** 2) + radius * .045);
      geo.applyQuaternion(rot); geo.translate(centre.x, centre.y, centre.z); teeth.push(geo);
    }
    out.push(new THREE.Mesh(H.mergeGeos(teeth), mats.simple));
  }
  out.forEach(m => { m.frustumCulled = false; }); return out;
}

/** Flattened plan: sculpted ventral mouth on the BOTTOM surface (nasoral curtain + lower lip arc around a recessed buccal slot). */
export function buildVentralMouth(bm, mats, H) {
  const { THREE } = H, g = bm.g, u = bm.h * .42, s = {}, fr = {}, p = {}; bm.section(u, s); bm.frame(u, fr);
  const w = s.coreW * .62, K = 20, out = [];
  const bottom = (uu, z, out2, lift) => { bm.frame(uu, fr); bm.section(uu, s); const ct = Math.sign(z) * Math.pow(Math.min(1, Math.abs(z) / Math.max(1e-8, s.w)), s.n / 2); bm.point(uu, -Math.acos(H.clamp(ct, -1, 1)), p, fr, s, true); const l = Math.hypot(p.ly, p.lz) || 1; out2.set(p.x + fr.nx * p.ly / l * lift, p.y + fr.ny * p.ly / l * lift, p.z + p.lz / l * lift); return out2; };
  for (const sign of [-1, 1]) {
    const rp = [], ri = [], q = new THREE.Vector3();
    for (let i = 0; i <= K; i++) for (const e of [-1, 1]) {
      const z = H.lerp(-w, w, i / K), zn = z / w;
      const arch = .048 * bm.h * zn * zn - (sign < 0 ? .008 * bm.h * Math.cos(Math.PI * zn) : 0);
      const uu = u + arch + sign * .019 * bm.h + e * .0065 * bm.h * (1 + g.mouth.lips);
      bottom(uu, z, q, bm.maxD * .0016 * (1 - zn * zn * .5)); rp.push(q.x, q.y, q.z);
    }
    for (let i = 0; i < K; i++) { const a = i * 2; ri.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); geo.setIndex(ri); geo.computeVertexNormals(); H.skinAttributes(geo, bm); const m = new THREE.Mesh(geo, mats.body); m.frustumCulled = false; out.push(m);
  }
  const pos = [], ab = [], idx = [];
  for (let i = 0; i <= K; i++) {
    const z = H.lerp(-w, w, i / K) * .95, zn = z / w;
    for (const sgn of [-1, 1]) {
      const uu = u + .048 * bm.h * zn * zn + sgn * .0095 * bm.h;
      const q = bottom(uu, z, new THREE.Vector3(), -bm.maxD * .0035);
      pos.push(q.x, q.y, q.z); ab.push(uu, .45, 1, 0);
    }
  }
  for (let i = 0; i < K; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const slot = new THREE.BufferGeometry(); slot.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); slot.setAttribute('aBody', new THREE.Float32BufferAttribute(ab, 4)); slot.setIndex(idx); slot.computeVertexNormals();
  const sm = new THREE.Mesh(slot, mats.jaw); sm.frustumCulled = false; sm.userData.ventral = { y: pos.filter((_, i) => i % 3 === 1).reduce((a, b, _, r) => a + b / r.length, 0) }; out.push(sm);
  return out;
}

/** Flattened plan: optional defensive spine on the top of the slender tail (niche flag). */
export function buildTailSpine(bm, mats, H) {
  const { THREE } = H, u = .8, p = {}, n = new THREE.Vector3(), fr = {}; bm.rawSurface(u, Math.PI / 2, p); bm.surfaceNormal(u, Math.PI / 2, n); bm.frame(u, fr);
  const len = bm.L * .09, geo = new THREE.ConeGeometry(bm.maxD * .02, len, 6); geo.translate(0, len * .5, 0);
  const dir = new THREE.Vector3(fr.tx, fr.ty, 0).multiplyScalar(.9).add(n.multiplyScalar(.35)).normalize();
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)); geo.translate(p.x, p.y, p.z);
  const m = new THREE.Mesh(geo, mats.tooth); m.frustumCulled = false; return [m];
}
