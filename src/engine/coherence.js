/* COHERENCE AUDIT (round 6H) — ONE implementation of laws L1–L6, used by tools/verify.mjs, tools/randaudit.mjs, the Wonder filter, Breed and mutation acceptance
   (via FG.structuralAudit / FG.coherenceAudit) and by auditAnatomy (so checkFishGeometry — the coherence gate — runs it for every built fish).
   auditCoherence(fish, THREE) → [{ code, msg }] with named classes:
     EYE_OUTSIDE_HEAD  (L1)  an eye centre outside the head length span / behind the gill front edge / off the surface / wrong sides
     EYE_SLICED        (L5)  cornea buried by the head surface: analytic seat test + ray visibility fraction from side and front-quarter views
     DETACHED_TEETH    (L2)  a jaw tooth root outside the jaw band, or a rostral tooth whose root is not INSIDE the blade volume
     FLAT_BODY_END     (L3)  the body loft's cross-section drops by more than half in one step at the rear, or the rear apex does not extend past the terminal-fin root
     MOUTH_CORNER_OPEN (L6)  resting mouth not sealed: skin loft open, jaw not at rest, or the pocket's cheek wall has a free (unwelded) edge inside the head near the corner
   Everything is a function of measured geometry + the generator's own axes; nothing is keyed to a species. */
import { headDepthAt, corneaPoints } from './eyegeo.js';
import { LIMBUS, EYE_PROTRUSION_MIN, EYE_PROTRUSION_MAX, CORNEA_CLEAR, BURIAL_MAX, CORNEA_VIS_MIN } from './eyeband.js';
import { jawEnv, jawIn, TEETH_SLACK } from './teethgeo.js';

export const CODES = ['EYE_OUTSIDE_HEAD', 'EYE_SLICED', 'DETACHED_TEETH', 'FLAT_BODY_END', 'MOUTH_CORNER_OPEN'];
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const TH = { vis: CORNEA_VIS_MIN };

/* ── L1 ── */
function eyeOutside(fish, THREE, V) {
  const bm = fish.bm, g = bm.g, infos = bm.eyes || [], L = bm.L, lm = bm.lm, v = m => V.push({ code: 'EYE_OUTSIDE_HEAD', msg: m });
  if (g.head.eyeSide === 'none') return;
  if (infos.length !== 2) { v('eye count ' + infos.length); return; }
  const sp = bm.spine, NS = sp.length - 1, flat = !!bm.law.flat;
  for (const i of infos) {
    let best = 1e9, bi = 0; for (let k = 0; k <= NS; k++) { const d = (sp[k].x - i.center.x) ** 2 + (sp[k].y - i.center.y) ** 2; if (d < best) { best = d; bi = k; } }
    /* round 7 measurement correction (predicate + thresholds UNCHANGED):
       prefer the eye's true seat station. The nearest-spine-point proxy is
       biased ~+0.014 u backward on short, centreline-curved heads (rigid
       plans), which ate the whole +0.013 design margin and flagged legal
       eyes as "on the gill region" (measured on 2SZGX46Q / EGDT2PFA /
       HB29T7ZS: param margin +0.013..+0.014, proxy margin -0.001). The
       gill front itself is placed in parameter space, so the seat station
       is the ground truth for this predicate. Proxy kept as fallback. */
    const u = (typeof i.u === 'number') ? i.u : bi / NS, r = i.R / L;
    if (u - r < -.004) v(`eye ahead of the snout (u=${u.toFixed(3)})`);
    if (u + r * .5 > lm.operculum + 1e-4) v(`eye behind the head (u=${u.toFixed(3)} > head ${lm.operculum.toFixed(3)})`);
    if (u + r * .5 > lm.gillStart + 1e-4) v(`eye on the gill region (u=${u.toFixed(3)}, gill front ${lm.gillStart.toFixed(3)})`);
    const apex = i.center.clone().addScaledVector(i.axis, i.R), far = i.center.clone().addScaledVector(i.axis, 2.2 * i.R);
    if (headDepthAt(bm, far, clamp) > 0) v('eye centre not on the body surface (deep inside)');
    if (headDepthAt(bm, apex, clamp) > .8 * i.R) v('eye buried below the surface');
  }
  const [a, b] = infos.map(i => i.center);
  if (g.head.eyeSide === 'both' && !flat) { if (a.z * b.z >= 0) v('eyes not one per side'); }
  else if (g.head.eyeSide !== 'both') { if (a.z * b.z <= 0) v('flat-plan eyes not both on one side'); }
}

/* ── L5 ── */
function eyeSliced(fish, THREE, V) {
  if (fish.info.quality === 'lod') return;
  const gr = fish.group, ro = gr.rotation.x; gr.rotation.x = 0; gr.updateMatrixWorld(true);
  try { eyeSlicedLocal(fish, THREE, V); } finally { gr.rotation.x = ro; gr.updateMatrixWorld(true); }
}
function eyeSlicedLocal(fish, THREE, V) {
  const bm = fish.bm, infos = bm.eyes || [], v = m => V.push({ code: 'EYE_SLICED', msg: m });
  const occ = []; fish.group.traverse(m => { if (m.isMesh && !m.isInstancedMesh && (m === fish.parts.body || m.userData.eyeSkin || m === fish.parts.jaw || m === fish.parts.operculum || m === fish.parts.upperJaw)) occ.push(m); });
  const rc = new THREE.Raycaster(), fr = {}; bm.frame(bm.lm.eye, fr);
  for (const i of infos) {
    if (i.vestigial) continue;
    const a = i.axis.clone().normalize(), c = i.center, R = i.R, fwd = new THREE.Vector3(-fr.tx, -fr.ty, 0), fp = fwd.addScaledVector(a, -fwd.dot(a)).normalize(), t1 = new THREE.Vector3().crossVectors(a, fp).normalize();
    /* by construction: every cornea sample is outside the analytic head volume and protrusion lies inside the seat band (eyeband.js) */
    let worst = 0; for (const p of corneaPoints(THREE, c, a, fp, t1, R)) worst = Math.max(worst, headDepthAt(bm, p.addScaledVector(a, -CORNEA_CLEAR * R), clamp));
    if (worst > BURIAL_MAX * R) v(`eye seat: cornea buried ${(worst / R).toFixed(2)} R in the head surface`);
    if (i.protrusion < EYE_PROTRUSION_MIN - 1e-9) v('eye seat: cornea buried below clearance band');
    if (i.protrusion > EYE_PROTRUSION_MAX + 1e-9) v('eye protrudes over a third of its diameter');
    /* geometric: ray visibility of cornea sample points from the side and the front quarter */
    const cams = [a.clone(), a.clone().multiplyScalar(Math.cos(.61)).addScaledVector(fp, Math.sin(.61))]; let tot = 0, vis = 0;
    for (const cd of cams) for (let k = 0; k <= 24; k++) {
      const al = k === 0 ? 0 : LIMBUS * ((1 + (k - 1) % 3) / 3) * .97, be = ((k - 1) / 3 | 0) / 8 * Math.PI * 2;
      const d = a.clone().multiplyScalar(Math.cos(al)).addScaledVector(fp, Math.sin(al) * Math.cos(be)).addScaledVector(t1, Math.sin(al) * Math.sin(be));
      if (d.dot(cd) < .25) continue; const p = c.clone().addScaledVector(d, R * 1.01), o = p.clone().addScaledVector(cd, bm.L * .6), dir = p.clone().sub(o), dist = dir.length(); dir.normalize(); tot++;
      rc.set(o, dir); rc.far = dist - R * .004; if (!rc.intersectObjects(occ, false).length) vis++;
    }
    if (tot && vis / tot < TH.vis) v(`cornea ${(100 * vis / tot).toFixed(0)}% visible (side / front-quarter)`);
  }
}

/* ── L2 ── */
function insideByRays(THREE, meshes, P, dirs) {
  const rc = new THREE.Raycaster(); rc.far = 1e9; let odd = 0;
  for (const d of dirs) { rc.set(P, d); let n = 0; for (const m of meshes) n += rc.intersectObject(m, false).length; odd += n % 2; }
  return odd >= 2;   /* odd crossing count along at least two of the three axes */
}
function teeth(fish, THREE, V) {
  const bm = fish.bm, v = m => V.push({ code: 'DETACHED_TEETH', msg: m }), tm = fish.parts.teeth, info = tm && tm.userData.teethInfo;
  if (info) { const e = {}; let bad = 0; for (const k of info) { if (!jawIn(jawEnv(bm, { clamp }, k.root.x, k.root.y, e), k.root.z, TEETH_SLACK)) bad++; else if (k.root.distanceTo(k.lip) > 2.4 * k.len + 8 * k.rad) bad++; } if (bad) v(`${bad}/${info.length} jaw teeth not rooted in the jaw band`); }
  /* rostral rows: instanced cones that are not the jaw row; each root must lie INSIDE a skin blade mesh (ray-parity test) */
  const blades = [], rows = []; fish.group.traverse(m => {
    if (m.isInstancedMesh && m !== tm && m.geometry.type === 'ConeGeometry' && m.material === fish.materials.tooth) rows.push(m);
    else if (m.isMesh && !m.isInstancedMesh && m.material === fish.materials.body && m !== fish.parts.body && !m.userData.eyeSkin && !m.userData.eyeball && m !== fish.parts.jaw && m !== fish.parts.upperJaw && m !== fish.parts.operculum) blades.push(m);
  });
  if (!rows.length) return;
  const dm = blades.map(m => { const c = new THREE.Mesh(m.geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); c.matrixWorld.copy(m.matrixWorld); return c; });
  const dirs = [new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)], M = new THREE.Matrix4(), P = new THREE.Vector3(); let bad = 0, n = 0;
  for (const row of rows) for (let k = 0; k < row.count; k++) { row.getMatrixAt(k, M); P.setFromMatrixPosition(M); n++; if (!dm.length || !insideByRays(THREE, dm, P.clone(), dirs)) bad++; }
  if (bad) v(`${bad}/${n} rostral teeth rooted outside the blade volume`);
}

/* ── L3 ── */
function bodyEnd(fish, THREE, V) {
  const bm = fish.bm, geo = fish.parts.body.geometry, P = geo.getAttribute('position'), us = bm.loft.us, R = bm.loft.R, v = m => V.push({ code: 'FLAT_BODY_END', msg: m });
  const n = P.count, apex = new THREE.Vector3(P.getX(n - 1), P.getY(n - 1), P.getZ(n - 1));
  const ringR = i => { const c = new THREE.Vector3(); for (let j = 0; j < R; j++) c.add(new THREE.Vector3(P.getX(i * R + j), P.getY(i * R + j), P.getZ(i * R + j))); c.multiplyScalar(1 / R); let r = 0; for (let j = 0; j < R; j++) r = Math.max(r, Math.hypot(P.getX(i * R + j) - c.x, P.getY(i * R + j) - c.y, P.getZ(i * R + j) - c.z)); return { c, r }; };
  let iEnd = us.length - 1; while (iEnd > 0 && us[iEnd] > 1 + 1e-9) iEnd--;
  const e = ringR(iEnd), tiny = e.r < .02 * bm.maxD;
  const radii = []; for (let i = iEnd; i < us.length; i++) radii.push(ringR(i).r); radii.push(0);
  let worstDrop = 0; for (let i = 1; i < radii.length; i++) worstDrop = Math.max(worstDrop, (radii[i - 1] - radii[i]) / Math.max(1e-12, e.r));
  if (!tiny && worstDrop > .5) v(`rear cross-section drops ${(100 * worstDrop).toFixed(0)}% of the peduncle in one step (flat cut)`);
  if (!tiny && apex.distanceTo(e.c) < .4 * e.r) v('rear apex does not extend past the terminal-fin root');
}

/* ── L6 ── */
function mouthSeal(fish, THREE, V) {
  const bm = fish.bm, v = m => V.push({ code: 'MOUTH_CORNER_OPEN', msg: m }), U = fish.uniforms; if (fish.info.quality === 'lod') return;
  if (U.uJawAngle.value !== 0 || U.uJawProtrude.value !== 0) v('resting mouth not closed');
  const body = fish.parts.body.geometry, I = body.index.array, E = new Map();
  for (let k = 0; k < I.length; k += 3) for (let e = 0; e < 3; e++) { const a = I[k + e], b = I[k + (e + 1) % 3], key = a < b ? a * 1e7 + b : b * 1e7 + a; E.set(key, (E.get(key) || 0) + 1); }
  let open = 0; for (const c of E.values()) if (c !== 2) open++; if (open && !bm.disc && bm.billStart === null) v(`skin loft has ${open} open edges`);
  const pocket = fish.group.children.find(m => m.userData && m.userData.groups && m.userData.mouthPart); if (!pocket) return;
  const P = pocket.geometry.getAttribute('position'), idx = pocket.geometry.index.array, q = bm.L * 1e-6, W = new Map(), EC = new Map(), ends = new Map();
  const id = i => { const k = Math.round(P.getX(i) / q) + ',' + Math.round(P.getY(i) / q) + ',' + Math.round(P.getZ(i) / q); if (!W.has(k)) W.set(k, W.size); return W.get(k); };
  for (let k = 0; k < idx.length; k += 3) for (let e = 0; e < 3; e++) { const a = id(idx[k + e]), b = id(idx[k + (e + 1) % 3]); if (a === b) continue; const kk = a < b ? a * 1e7 + b : b * 1e7 + a; EC.set(kk, (EC.get(kk) || 0) + 1); ends.set(kk, [idx[k + e], idx[k + (e + 1) % 3]]); }
  const hl = bm.h * bm.L, ee = {}, A = pocket.geometry.getAttribute('aBody'); let bad = 0, worst = 0;
  for (const [kk, c] of EC) {
    if (c !== 1) continue; const [a, b] = ends.get(kk), m = { x: (P.getX(a) + P.getX(b)) / 2, y: (P.getY(a) + P.getY(b)) / 2, z: (P.getZ(a) + P.getZ(b)) / 2 };
    const len = Math.hypot(P.getX(a) - P.getX(b), P.getY(a) - P.getY(b), P.getZ(a) - P.getZ(b)); if (len < 1e-4 * hl) continue;
    if (A.getX(a) < bm.mcU * .7) continue;           /* corner region only (the centre-strip sliver at the front is closed by design, round 4) */
    jawEnv(bm, { clamp }, m.x, m.y, ee);
    const depth = Math.min(ee.dUp - ee.ly, ee.ly + ee.dDn, ee.hw - Math.abs(m.z)); if (depth > .03 * hl) { bad++; worst = Math.max(worst, depth / hl); }
  }
  if (bad) v(`cheek wall has ${bad} free edges inside the head at the mouth corner (up to ${worst.toFixed(2)} head lengths deep)`);
}

export function auditCoherence(fish, THREE) {
  const V = [];
  for (const f of [eyeOutside, eyeSliced, teeth, bodyEnd, mouthSeal]) { try { f(fish, THREE, V); } catch (e) { V.push({ code: 'AUDIT_ERROR', msg: f.name + ': ' + e.message }); } }
  return V;
}
export const countByClass = (list, into = {}) => { for (const c of CODES) into[c] = into[c] || 0; for (const code of new Set(list.map(v => v.code))) into[code] = (into[code] || 0) + 1; return into; };   /* per FISH, not per message */
