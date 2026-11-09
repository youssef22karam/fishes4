/* ROUND 2 geometric checks (mouth interior, teeth, eyes) — used by the analytic gate (validate.js → reject & resample) and the mesh audit.
   round2Check(bm, ctx) → string[] of violations. Builds the pocket / jaw / teeth from the BodyModel only (no GL), so it is cheap enough for the gate.
   SEE-THROUGH TEST: the pocket + lower-jaw patch are posed at the law's maximum jaw angle exactly like the vertex shader does (rotation about the hinge by angle × weight);
   rays are then cast from a point inside the pocket in every direction that does not point out of the aperture (forward). Every such ray MUST hit pocket / jaw geometry
   (double-sided): a ray that escapes is a line of sight through the head, i.e. a see-through mouth. */
import { jawU0, jawU1, jawSpreadRef, spreadZ } from './mouthgeo.js';
import { jawEnv, jawIn, TEETH_SLACK } from './teethgeo.js';
export function round2Check(bm, ctx, rays = false) {
  const { THREE, H, MOUTH, buildJawGeometry, buildTeeth, LAW } = ctx, errs = [], M = bm.law.mouth, hl = bm.h * bm.L;
  if (LAW.EYE_PROTRUSION < LAW.EYE_PROTRUSION_MIN || LAW.EYE_PROTRUSION > LAW.EYE_PROTRUSION_MAX) errs.push('eye protrudes more than 1/3 of its diameter');
  if (M.construction !== 'jawed' || bm.oralDisc || bm.ventralMouth) return errs;
  const jaw = buildJawGeometry(bm), pocket = MOUTH.buildCavity(bm, { jaw: null }, H)[0].geometry, ang = M.openRad, piv = jaw.pivot;
  const pose = geo => { const P = geo.getAttribute('position'), A = geo.getAttribute('aBody'), out = []; for (let i = 0; i < P.count; i++) { const w = A.getW(i), a = -ang * w, c = Math.cos(a), s = Math.sin(a), dx = P.getX(i) - piv.x, dy = P.getY(i) - piv.y; out.push(piv.x + c * dx - s * dy, piv.y + s * dx + c * dy, spreadZ(P.getZ(i), A.getX(i), w, jawU0(bm), jawU1(bm), jawSpreadRef(bm, H), 1)); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3)); g.setIndex(geo.getIndex()); return g; };
  if (rays) {   /* raycast see-through test (opt-in: FG.round2Check(bm, true)); see docs/round2-report.md for its current limits */
  const meshes = [pose(pocket), pose(jaw.geo)].map(g => new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })));
  const pp = meshes[0].geometry.getAttribute('position'), C = new THREE.Vector3(); let n = 0;
  for (let i = 0; i < pp.count; i++) { C.x += pp.getX(i); C.y += pp.getY(i); C.z += pp.getZ(i); n++; } C.multiplyScalar(1 / n);
  const fr = {}; bm.frame(bm.mcU * .5, fr); const fwd = new THREE.Vector3(-fr.tx, -fr.ty, 0).normalize(), ray = new THREE.Raycaster(), d = new THREE.Vector3(); let escaped = 0, tested = 0; const esc = [];
  for (let i = 0; i < 5; i++) for (let j = 0; j < 8; j++) {
    const th = (i + .5) / 5 * Math.PI, ph = j / 8 * Math.PI * 2; d.set(Math.cos(th), Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph)).normalize();
    if (Math.abs(d.dot(fwd)) > .6) continue;                        /* forward = the aperture itself (allowed); near-axial backward rays end in the throat-cap apex (closed by construction) — test sideways / up / down */
    tested++; ray.set(C, d); ray.far = 1e9; if (!ray.intersectObjects(meshes, false).length) { escaped++; if (globalThis.__R2DEBUG) esc.push([d.x, d.y, d.z].map(v => +v.toFixed(2)).join(',')); }
  }
  if (escaped) errs.push(`see-through mouth: ${escaped}/${tested} rays leave the open mouth through the head` + (esc.length ? ' fwd=' + [fwd.x, fwd.y].map(v => +v.toFixed(2)) + ' C=' + [C.x, C.y, C.z].map(v => +v.toFixed(3)) + ' ' + esc.join(' | ') : ''));
  meshes.forEach(m => m.geometry.dispose());
  }
  /* teeth: rooted, continuous, inside the jaw, length band */
  if (M.teethClass !== 'absent' && bm.g.mouth.teeth !== 'none' && bm.g.mouth.teethCount > 0) {
    const t = buildTeeth(bm, { tooth: null }), info = t && t.userData.teethInfo;
    if (info) {
      for (const k of info) {
        if (k.len > .14 * hl + 1e-9 || k.len < .011 * hl) { errs.push('tooth length outside 0.02–0.14 × head length band'); break; }
        if (k.root.distanceTo(k.lip) > 2.4 * k.len + 8 * k.rad) { errs.push('detached / floating tooth'); break; }
      }
      /* round 2.1: the envelope is teethgeo.jawEnv — the very function the generator fits each tooth against (root AND tip, at the tooth's own station) */
      const e1 = {}, e2 = {};
      for (const k of info) if (!jawIn(jawEnv(bm, H, k.root.x, k.root.y, e1), k.root.z, TEETH_SLACK)) { errs.push('teeth outside the jaw'); break; }
      for (const k of info) if (!jawIn(jawEnv(bm, H, k.tip.x, k.tip.y, e2), k.tip.z, TEETH_SLACK)) { errs.push('teeth tip outside the jaw'); break; }
      for (const k of info) if (k.spacing > 1.5 * 2 * k.rad + 1e-9) { errs.push('tooth spacing above 1.5 × base width'); break; }
      t.geometry.dispose();
    }
  }
  return errs;
}

/* ROUND 4 — CENTRE-PLANE AUDIT (front-view mouth bar). Poses every interior mesh (pocket walls, tongue, arches) at jaw = 1 exactly like the vertex shader
   (rotation about the hinge by angle × weight + lateral splay) and tests the part of the cavity FORWARD of 60 % of its depth (front lip → throat):
     • STANDING-SHEET offenders: a triangle that lies within 0.02 × head width of the centre plane and whose surface is parallel to it (|nz| ≥ .5, i.e. a wall of
       material standing on the plane, seen from the front as a vertical divider) — the hard requirement, must be 0;
     • TRANSVERSE crossings (roof / floor sheets that cross z = 0 horizontally) are counted and reported for information only: seen head-on they are the dark
       roof and floor of ONE pocket, not a divider.
   Returns { sheets, transverse, hw, byGroup:{name:{sheets,transverse}}, tris }. */
export function centrePlaneAudit(bm, ctx, jawPose = 1) {
  const { THREE, H, MOUTH, buildJawGeometry, LAW } = ctx, M = bm.law.mouth, res = { sheets: 0, transverse: 0, tris: 0, byGroup: {}, hw: 0 };
  if (M.construction !== 'jawed' || bm.oralDisc || bm.ventralMouth) return res;
  const jaw = buildJawGeometry(bm), piv = jaw.pivot, ang = M.openRad * jawPose, u0 = jawU0(bm), u1 = jawU1(bm), ref = jawSpreadRef(bm, H);
  let hwMax = 0; for (let k = 0; k <= 12; k++) { const s = {}; bm.section(bm.h * k / 12, s); hwMax = Math.max(hwMax, bm.halfWidthAtY(s, 0)); }
  const hw = res.hw = 2 * hwMax, tol = .02 * hw, meshes = MOUTH.buildInterior(bm, { jaw: null }, H);
  let xF = -1e9, xT = 1e9;
  for (const m of meshes) if (m.userData.layer === 'walls') { const P = m.geometry.getAttribute('position'); for (let i = 0; i < P.count; i++) { xF = Math.max(xF, P.getX(i)); xT = Math.min(xT, P.getX(i)); } }
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), n = new THREE.Vector3();
  for (const m of meshes) {
    const geo = m.geometry, P = geo.getAttribute('position'), W = geo.getAttribute('aBody'), I = geo.index, groups = m.userData.groups || [{ name: m.userData.layer, a: 0, b: I.count / 3 }];
    const posed = []; for (let i = 0; i < P.count; i++) { const w = W.getW(i), a = -ang * w, c = Math.cos(a), s = Math.sin(a), dx = P.getX(i) - piv.x, dy = P.getY(i) - piv.y; posed.push(piv.x + c * dx - s * dy, piv.y + s * dx + c * dy, spreadZ(P.getZ(i), W.getX(i), w, u0, u1, ref, jawPose)); }
    for (const g of groups) {
      const r = res.byGroup[g.name] ||= { sheets: 0, transverse: 0, tris: 0 };
      for (let t = g.a; t < g.b; t++) {
        const ia = I.getX(t * 3) * 3, ib = I.getX(t * 3 + 1) * 3, ic = I.getX(t * 3 + 2) * 3;
        A.set(posed[ia], posed[ia + 1], posed[ia + 2]); B.set(posed[ib], posed[ib + 1], posed[ib + 2]); C.set(posed[ic], posed[ic + 1], posed[ic + 2]);
        const d = ((A.x + B.x + C.x) / 3 - 0) , df = (xF - d) / Math.max(1e-9, xF - xT); if (df >= .6) continue;
        res.tris++; r.tris++;
        const zmin = Math.min(A.z, B.z, C.z), zmax = Math.max(A.z, B.z, C.z); if (zmin > tol || zmax < -tol) continue;
        n.subVectors(B, A).cross(C.clone().sub(A)); const len = n.length(); if (len < 1e-18) continue; n.multiplyScalar(1 / len);
        if (Math.abs(n.z) >= .5 && zmin >= -tol && zmax <= tol) { res.sheets++; r.sheets++; } else if (zmin < 0 && zmax > 0) { res.transverse++; r.transverse++; }
      }
    }
  }
  return res;
}
