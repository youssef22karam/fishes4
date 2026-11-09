/* MOUTH CONSTRUCTOR — state-of-the-art anatomical mouth, lips, maxillary apparatus, and buccal cavity.
   The mouth is a SEAM in the head surface (lips meet, resting opening = 0) ending at the true anatomical
   mouth corner (bm.mcU), plus a hinged lower jaw (dentary + anguloarticular), a sliding upper jaw where
   the niche protrudes, sculpted upper & lower labial volumes with a U-shaped rostral/mental symphysis,
   a teleost maxillary bone plate + commissural labial fold (or selachian labial corner folds on sharks)
   that bridges the mouth corner as the jaw opens, and a vaulted buccal-pharyngeal funnel containing an
   anatomical basihyal tongue and branchial gill arches.
   H = { THREE, clamp, lerp, sstep, smoother, TAU, skinAttributes, mergeGeos }. */
import { CAVITY_MAX, DISC_DEPTH_MAX } from './laws.js';
import { head2Params } from './landmarks.js';

/* mouth-line level in vert = sin(theta) units, identical to the skin shader's crease line */
export function mouthLevel(bm, u, H) {
  const t = H.sstep(bm.jawStartU, bm.mcU, u);
  const arch = .018 * Math.sin(Math.PI * Math.pow(t, .75)) * (1 - t);
  return H.lerp(bm.tipF, bm.cornerF, t) + arch - .028 * (bm.g.mouth.cornerCurve ?? .5) * Math.sin(Math.PI * t);
}
/* aperture half-height (vert units) of the opened mouth along the jaw */
export function apertureAt(bm, u, H) {
  const u0 = Math.max(bm.jawStartU, .006), u1 = bm.mcU * .96, tt = H.clamp((u - u0) / Math.max(1e-6, u1 - u0), 0, 1);
  return (.08 + .3 * bm.g.mouth.gape) * Math.pow(Math.sin(Math.PI * tt), .58);
}
const thetaOf = (vert, side) => { const th = Math.asin(Math.max(-.985, Math.min(.985, vert))); return side > 0 ? th : Math.PI - th; };
function skinPoint(bm, u, vert, side, out, lift = 0) {
  const fr = bm._mfr || (bm._mfr = {}), s = bm._ms || (bm._ms = {}), p = bm._mp || (bm._mp = {});
  bm.frame(u, fr); bm.section(u, s); bm.point(u, thetaOf(vert, side), p, fr, s, true);
  const l = Math.hypot(p.ly, p.lz) || 1, off = lift / l;
  out.set(p.x + fr.nx * p.ly * off, p.y + fr.ny * p.ly * off, p.z + p.lz * off); return out;
}

/** Fused-plate (beak) mouths: sculpted upper and lower coalesced dental plates with a median suture and perioral lip collar. */
export function buildBeak(bm, mats, H, M) {
  const { THREE } = H, g = bm.g, u0 = Math.max(bm.jawStartU, .005), u1 = bm.mcU, K = 20, out = [];
  const w = .055 + .055 * g.mouth.lips;
  for (const [sign, lower] of [[1, false], [-1, true]]) {
    const pos = [], idx = [], rows = 2 * K + 1, cols = 6, v = new THREE.Vector3();
    for (let i = 0; i < rows; i++) {
      const side = i <= K ? 1 : -1, u = H.lerp(u1, u0, (i <= K ? i : 2 * K - i) / K);
      const sSym = Math.abs(i - K) / K;
      const suture = 1 - .18 * Math.exp(-sSym * sSym * 38);   /* median vertical suture notch between left/right coalesced plates */
      for (let j = 0; j <= cols; j++) {
        const f = j / cols;
        const arch = Math.sin(Math.PI * (.06 + .88 * (i / (rows - 1))));
        const dome = Math.sin(Math.PI * Math.pow(f, .82)) * suture;
        const lift = bm.maxD * (.0095 * (lower ? .88 : 1.08)) * dome * arch;
        skinPoint(bm, u, mouthLevel(bm, u, H) + sign * (.0025 + w * (lower ? .86 : 1.0) * f), side, v, lift);
        pos.push(v.x, v.y, v.z);
      }
    }
    for (let i = 0; i < rows - 1; i++) for (let j = 0; j < cols; j++) { const a = i * (cols + 1) + j, b = a + cols + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    H.skinAttributes(geo, bm, 0, lower);
    const mesh = new THREE.Mesh(geo, mats.tooth); mesh.frustumCulled = false; mesh.userData.beak = true; out.push(mesh);
  }
  return out;
}

/* ── ONE source of truth for the lip line & jaw articulation corner.
   Crucially, jawU1 is bm.mcU (the true anatomical mouth corner / commissure), NOT bm.hingeU (under the eye),
   eliminating the crocodile/dinosaur cheek-split while keeping bm.hingeU intact for suspensorium landmarks. ── */
export const jawU0 = bm => bm.jawStartU < .01 ? .0015 : Math.max(bm.jawStartU, .006);
export const jawU1 = bm => bm.mcU;
/** lip line as a height in sin(theta) units on the head section at station u (the lower patch edge is the asin of this) */
export function jawEdgeVert(bm, u) {
  const s = bm._es || (bm._es = {}); bm.section(u, s); const ym = bm.mouthLineY(u, s), yr = ym > 0 ? s.dUp : s.dDn, n = ym > 0 ? s.nD : s.nV;
  return Math.sign(ym) * Math.pow(Math.min(.98, Math.abs(ym) / Math.max(yr, 1e-8)), n * .5);
}
/** movement weight of the one-piece lower jaw along its length: 1 at the chin, smooth anatomical roll-off to 0 at the corner hinge */
export const jawW = (bm, u, H) => 1 - H.sstep(.58, 1, H.clamp((u - jawU0(bm)) / Math.max(1e-6, jawU1(bm) - jawU0(bm)), 0, 1));
/** Lateral splay of the opening lower jaw & hyoid/suspensorium expansion (turns a conical snout into a broad U/O-shaped oral gape when open).
    GLSL twin: JAW_SPREAD_GLSL (fishgen). */
export const SPREAD_K = .88;
export const jawSpreadRef = (bm, H) => { const o = lipPoint(bm, jawU1(bm), 1, H, 0, {}); return SPREAD_K * Math.abs(o.z); };
export function spreadZ(z, u, w, u0, u1, Wd, open) {
  const t = Math.min(1, Math.max(0, (u - u0) / Math.max(1e-6, u1 - u0))), f = Math.sqrt(t) * (1 - t), zk = Math.max(.6 * Wd * Math.max(t, .02), 1e-5);
  return z + Math.min(1, Math.max(-1, z / zk)) * Wd * f * open * w;
}
export const EDGE_N = 40;
export function edgeTable(bm, H) { const u0 = jawU0(bm), u1 = jawU1(bm), a = []; for (let i = 0; i < EDGE_N; i++) a.push(jawEdgeVert(bm, H.lerp(u0, u1, i / (EDGE_N - 1)))); return a; }
/** point on the lip edge of one flank (side ±1) at station u, optionally pulled `inset` under the skin. Returns {x,y,z,ly,lz,fr}. */
export function lipPoint(bm, u, side, H, inset = 0, out = {}) {
  const fr = bm._lf || (bm._lf = {}), s = bm._ls || (bm._ls = {}), p = bm._lp || (bm._lp = {}); bm.frame(u, fr); bm.section(u, s);
  const rim = Math.asin(jawEdgeVert(bm, u)), a = side > 0 ? rim : -Math.PI - rim; bm.point(u, a, p, fr, s, true);
  const l = Math.hypot(p.ly, p.lz) || 1, off = -inset / l;
  out.x = p.x + fr.nx * p.ly * off; out.y = p.y + fr.ny * p.ly * off; out.z = p.z + p.lz * off; out.ly = p.ly; out.lz = p.lz; out.tx = fr.tx; out.ty = fr.ty; out.nx = fr.nx; out.ny = fr.ny; return out;
}

/* CORNER_SEAL (L6, by construction, every mouth placement). */
export const CORNER_U = .7;
const cornerFront = (u, bm) => Math.fround(u) < CORNER_U * bm.mcU;

/** Interior buccal-pharyngeal pocket: ONE closed manifold funnel rooted on the lip edge.
    Features a vaulted palatal roof, curved buccal floor, stretchy mucosal cheek walls that curve inward
    at the commissures, and a smooth U-shaped mandibular chin cap. */
export function buildCavity(bm, mats, H) {
  const { THREE } = H, g = bm.g, u0 = jawU0(bm), u1 = jawU1(bm), K = 36, S = 8, N = 8, hl = bm.h * bm.L, depth = Math.min(g.mouth.cavityDepth, CAVITY_MAX) * hl;
  const inset = bm.maxD * .0038, us = []; for (let i = 0; i <= K; i++) us.push(H.lerp(u0, u1, Math.pow(i / K, 1.45)));
  const tz = centreBand(bm);
  const P = (u, side) => { const o = lipPoint(bm, u, side, H, inset, {}); return contain(bm, new THREE.Vector3(o.x, o.y, o.z), H, .985); };
  const R = us.map(u => P(u, 1)), Lf = us.map(u => P(u, -1)), W = us.map(u => jawW(bm, u, H));
  /* rim loop: right corner → front (upper palatal copy), front → left corner, then back along the lower mandibular copy */
  const rim = [];
  for (let i = K; i >= 0; i--) rim.push({ p: R[i], u: us[i], w: 0, upper: true });
  for (let i = 0; i <= K; i++) rim.push({ p: Lf[i], u: us[i], w: 0, upper: true });
  for (let i = K; i >= 0; i--) rim.push({ p: Lf[i], u: us[i], w: W[i], upper: false });
  for (let i = 0; i <= K; i++) rim.push({ p: R[i], u: us[i], w: W[i], upper: false });
  const Mr = rim.length, rimC = new THREE.Vector3(); rim.forEach(r => rimC.add(r.p)); rimC.multiplyScalar(1 / Mr);
  const fr = {}; bm.frame((u0 + u1) / 2, fr);
  const throat = rimC.clone().add(new THREE.Vector3(fr.tx * depth, fr.ty * depth, 0));
  { const ut = H.clamp((u0 + u1) / 2 + depth / bm.L, .004, .999), ft = {}, st = {}; bm.frame(ut, ft); bm.section(ut, st);
    const ly = H.clamp((throat.x - ft.px) * ft.nx + (throat.y - ft.py) * ft.ny, -st.dDn * .52, st.dUp * .52); throat.set(ft.px + ft.nx * ly, ft.py + ft.ny * ly, 0); }
  const pos = [], ab = [], idx = [];
  /* Baked interior occlusion (aBody.y): 0 at the gingival/lip margin (pale fleshy pink-cream mucosa),
     ramping smoothly to 1 at the deep pharyngeal sphincter. */
  let fX = -1e9, zR = 1e-6; rim.forEach(r => { fX = Math.max(fX, r.p.x); zR = Math.max(zR, Math.abs(r.p.z)); });
  const occOf = q => {
    const depFrac = H.clamp((fX - q.x) / Math.max(1e-6, fX - throat.x), 0, 1);
    const latFrac = 1 - H.clamp(Math.abs(q.z) / zR, 0, 1);
    return H.clamp(.04 + .68 * Math.pow(depFrac, 1.15) + .28 * Math.pow(latFrac, 1.35) * H.sstep(.08, .55, depFrac), 0, 1);
  };
  const tolZ = tz;
  const push = (q, u, w) => { pos.push(q.x, q.y, q.z); ab.push(u, occOf(q), 1, w); return pos.length / 3 - 1; };
  for (let i = 0; i <= N; i++) {
    const d = i / N, e = H.smoother(d);
    /* Vaulted anterior buccal cavity (first 30% stays wide like a real fish palate, then funnels into the pharynx) */
    const shrink = (1 - .82 * Math.pow(e, 1.32)) * (1 + .08 * Math.sin(Math.PI * d) * (1 - d));
    const vaultY = bm.maxD * .018 * Math.sin(Math.PI * Math.pow(d, .7)) * (1 - d);
    for (let j = 0; j < Mr; j++) {
      const r = rim[j], q = r.p.clone().lerp(throat, e).sub(throat).multiplyScalar(shrink).add(throat);
      if (i > 0 && i < N) {
        const sgnV = r.upper ? 1 : -.65;
        q.x += fr.nx * vaultY * sgnV; q.y += fr.ny * vaultY * sgnV;
      }
      if (i > 0) contain(bm, q, H, .9);
      push(q, r.u, r.w * Math.pow(1 - d, 1.35));
    }
  }
  const front = j => cornerFront(Math.max(rim[j].u, rim[(j + 1) % Mr].u), bm);
  for (let i = 0; i < N; i++) for (let j = 0; j < Mr; j++) { const a = i * Mr + j, b = i * Mr + (j + 1) % Mr, c = a + Mr, d = b + Mr; if (!(front(j) && isSheet(pos, a, c, b, tz))) idx.push(a, c, b); if (!(front(j) && isSheet(pos, b, c, d, tz))) idx.push(b, c, d); }
  const grp = [{ name: 'hood/floor rings', a: 0, b: idx.length / 3 }];
  const centre = push(throat, u1, 0); for (let j = 0; j < Mr; j++) idx.push(N * Mr + j, centre, N * Mr + (j + 1) % Mr);
  grp.push({ name: 'throat cap fan', a: grp[0].b, b: idx.length / 3 });

  /* Cheek walls & maxillary-mandibular labial membrane:
     Connects the upper lip/maxilla to the lower lip on each flank. Rather than a flat collapse,
     curves gently medially and caudally at mid-height to form a smooth mucosal cheek pouch at the mouth corner! */
  const wallRanges = [];
  for (const side of [1, -1]) {
    const base = pos.length / 3, arr = side > 0 ? R : Lf;
    for (let i = 0; i <= K; i++) for (let j = 0; j <= S; j++) {
      const f = j / S, q = arr[i].clone();
      const archMid = Math.sin(Math.PI * f);
      const uFrac = i / K;
      q.z *= 1 - .34 * H.sstep(0, .22, f) * H.sstep(1, .78, f) * H.sstep(0, .28, uFrac + .02);
      /* slight caudal tuck of the inner cheek fold near the commissure */
      const foldBack = bm.maxD * .006 * archMid * H.sstep(.35, .95, uFrac) * (1 - uFrac);
      q.x += fr.tx * foldBack; q.y += fr.ty * foldBack;
      if (j > 0 && j < S) contain(bm, q, H, .92);
      push(q, us[i], W[i] * H.smoother(f));
    }
    const t0 = idx.length / 3;
    const keep = (a, b, c, i) => !cornerFront(us[i + 1], bm) || !isSheet(pos, a, b, c, tolZ, true);
    for (let i = 0; i < K; i++) for (let j = 0; j < S; j++) { const a = base + i * (S + 1) + j, b = a + S + 1; if (keep(a, b, a + 1, i)) idx.push(a, b, a + 1); if (keep(a + 1, b, b + 1, i)) idx.push(a + 1, b, b + 1); }
    wallRanges.push([base, pos.length / 3, side]);
    grp.push({ name: 'cheek wall ' + (side > 0 ? 'R' : 'L'), a: t0, b: idx.length / 3 });
  }
  /* Chin cap: closes the anterior mandibular symphysis with skin-tagged tissue */
  { const ring = [], u = us[0], s = {}, fr0 = {}, p = {}; bm.frame(u, fr0); bm.section(u, s); const rimA = Math.asin(jawEdgeVert(bm, u)), M = 14;
    for (let j = 0; j <= M; j++) { const a = H.lerp(-Math.PI - rimA, rimA, j / M); bm.point(u, a, p, fr0, s, true); const l = Math.hypot(p.ly, p.lz) || 1, o = -inset / l; ring.push(contain(bm, new THREE.Vector3(p.x + fr0.nx * p.ly * o, p.y + fr0.ny * p.ly * o, p.z + p.lz * o), H, .985)); }
    const c = new THREE.Vector3(); ring.forEach(r => c.add(r)); c.multiplyScalar(1 / ring.length); contain(bm, c, H, .985);
    const b0 = pos.length / 3, sk = (q, a) => { pos.push(q.x, q.y, q.z); ab.push(u, ((a + Math.PI / 2) / H.TAU + 1) % 1, 0, 1); return pos.length / 3 - 1; };
    ring.forEach(r => sk(r, -Math.PI / 2));
    const cc = sk(c, -Math.PI / 2), t0 = idx.length / 3; for (let j = 0; j < M; j++) idx.push(b0 + j, cc, b0 + j + 1); grp.push({ name: 'chin cap', a: t0, b: idx.length / 3 }); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('aBody', new THREE.Float32BufferAttribute(ab, 4)); geo.setIndex(idx); geo.computeVertexNormals();
  /* Cheek-wall normals: smooth medial + slightly anterior normal so the cheek mucosa shades organically when open */
  { const nA = geo.getAttribute('normal');
    for (const [a, b, sd] of wallRanges) for (let v = a; v < b; v++) nA.setXYZ(v, -fr.tx * .28, -fr.ty * .28, -sd * .96);
    for (let v = 0; v < nA.count; v++) if (Math.hypot(nA.getX(v), nA.getY(v), nA.getZ(v)) < 1e-6) nA.setXYZ(v, 0, 0, 1);
    nA.needsUpdate = true; }
  const mesh = new THREE.Mesh(geo, mats.jaw); mesh.frustumCulled = false; mesh.renderOrder = 1; mesh.userData.groups = grp; geo.userData.groups = grp; return [mesh];
}

/** STATE-OF-THE-ART LIPS & MAXILLARY APPARATUS AS WELDED VOLUMES.
    Builds two rich anatomical meshes (upper & lower, preserving lips === 2 for validate7):
    1. Upper mesh ('upper'):
       - Premaxillary upper lip cushion with a rounded U-shaped rostral symphysis arch, teardrop cross-section
         curling into the oral valve, and overhanging commissure corners.
       - Welded Teleost Maxillary Bone Plate (Maxilla + Supramaxilla + Labial Cheek Fold) on each flank,
         sweeping from the upper premaxilla to the posterior mouth corner and weighted at its ventral tip
         so it swings forward with the opening jaw (eliminating the alligator corner notch!).
         On cartilaginous sharks, sculpts the selachian upper/lower labial corner folds & furrows.
    2. Lower mesh ('lower'):
       - Mandibular lower lip roll with a multi-station U-shaped mental (chin) symphysis arch,
         prognathous chin projection on predators, papillose lobulations on benthic feeders, and
         tapered posterior ends that tuck neatly inside the overhanging upper commissure! */
export function buildLips(bm, mats, H) {
  const { THREE } = H, g = bm.g;
  if (!bm.law || bm.law.mouth.construction !== 'jawed') return [];
  const P2 = head2Params(bm);
  const hl = bm.h * bm.L, u0 = jawU0(bm), u1 = jawU1(bm), K = 34, SEG = 10;
  const full = H.clamp(g.mouth.lips != null ? g.mouth.lips : .3, 0, 1);
  let rad = hl * (.0085 + .015 * full);
  if (full > .62) rad *= 1 + (full - .62) * 2.25;                      /* plush / papillose swell */
  const pap = P2.papillose;
  const out = [];

  for (const sgn of [1, -1]) {                                          /* +1 upper (premaxilla + maxilla) · −1 lower (dentary + chin pad) */
    const raw = [];
    const makeSample = (u, side, symFrac = 0) => {
      const o = lipPoint(bm, u, side, H, 0, {});
      const l = Math.hypot(o.ly, o.lz) || 1, rr = Math.max(l, hl * .05);
      const tU = H.clamp((u - u0) / Math.max(1e-6, u1 - u0), 0, 1);
      const vert = mouthLevel(bm, u, H);
      /* Upper lip overhangs the corner slightly; lower lip tucks slightly inside at the corner */
      const cornerShift = sgn > 0 ? -.08 * rad * H.sstep(.72, 1, tU) : .12 * rad * H.sstep(.72, 1, tU);
      const dv = Math.sqrt(Math.max(0, 1 - vert * vert)) * ((rad * .52 + cornerShift) / rr);
      /* Sink into head surface; lower lip tucks slightly deeper medially at the posterior corner */
      const cornerInset = sgn < 0 ? rad * .28 * H.sstep(.70, 1, tU) : -rad * .12 * H.sstep(.75, 1, tU);
      const v = new THREE.Vector3();
      skinPoint(bm, u, vert + sgn * dv, side, v, -rad * .32 - cornerInset);
      /* Prognathous lower-jaw symphysis jut (bass, grouper, barracuda, snook) */
      if (sgn < 0 && P2.prognathous > .05 && tU < .35) {
        const jut = P2.prognathous * rad * .65 * (1 - H.sstep(0, .35, tU)) * (1 + .3 * symFrac);
        v.x += -o.tx * jut + o.nx * jut * .18;
        v.y += -o.ty * jut + o.ny * jut * .18;
      }
      /* Upper premaxillary rostral cushion fullness */
      if (sgn > 0 && tU < .30) {
        const rostral = (.25 + .45 * P2.premaxHood) * rad * (1 - H.sstep(0, .30, tU)) * (1 + .25 * symFrac);
        v.x += -o.tx * rostral * .45;
        v.y += -o.ty * rostral * .45;
      }
      /* Jaw weight: lower lip moves with jawW; upper lip near the corner flexes slightly (commissure stretch) */
      const w = sgn < 0 ? jawW(bm, u, H) : .16 * jawW(bm, u, H) * H.sstep(.55, .92, tU) * (1 - H.sstep(.92, 1, tU));
      /* Protrusile weight for upper lip on protrusible mouths */
      const pW = sgn > 0 && bm.protrusile ? (1 - H.sstep(.25, .92, tU)) : 0;
      return { c: v, nx: o.nx * o.ly / l, ny: o.ny * o.ly / l, nz: o.lz / l, u, tU, w, pW, vert: vert + sgn * dv, tx: o.tx, ty: o.ty };
    };

    for (let i = 0; i <= K; i++) raw.push(makeSample(H.lerp(u1, u0, Math.pow(i / K, 1.2)), 1, i === K ? 1 : 0));

    /* Multi-station U-shaped rostral / mandibular symphysis arch across the front of the mouth
       (replaces the single midpoint point so the front of the mouth is a smooth horseshoe U-arch, never a V-pinch!) */
    {
      const A = raw[raw.length - 1];
      const B = makeSample(u0, -1, 1);
      const d = A.c.distanceTo(B.c);
      const archPush = d * (.34 + .16 * P2.rostralPlan + (sgn < 0 ? .12 * P2.prognathous : .08 * P2.premaxHood));
      const NSYM = 5;
      for (let k = 1; k <= NSYM; k++) {
        const fk = k / (NSYM + 1);
        const symBell = Math.sin(Math.PI * fk);
        const mid = A.c.clone().lerp(B.c, fk);
        mid.x += -A.tx * archPush * symBell;
        mid.y += -A.ty * archPush * symBell + (sgn > 0 ? 1 : -1) * rad * .12 * symBell;
        const nx = H.lerp(A.nx, B.nx, fk) - A.tx * .35 * symBell;
        const ny = H.lerp(A.ny, B.ny, fk) - A.ty * .35 * symBell;
        const nz = H.lerp(A.nz, B.nz, fk) * (1 - .5 * symBell);
        const nl = Math.hypot(nx, ny, nz) || 1;
        raw.push({
          c: mid, nx: nx / nl, ny: ny / nl, nz: nz / nl,
          u: u0, tU: 0, w: A.w, pW: A.pW, vert: A.vert, tx: A.tx, ty: A.ty
        });
      }
      raw.push(B);
    }

    for (let i = 1; i <= K; i++) raw.push(makeSample(H.lerp(u0, u1, 1 - Math.pow(1 - i / K, 1.2)), -1, 0));

    const M = raw.length, pos = [], ab = [], idx = [];
    const push = (q, u, vert, w, tag = 0) => {
      pos.push(q.x, q.y, q.z);
      ab.push(u, Math.acos(H.clamp(-vert, -1, 1)) / H.TAU, tag, w);
      return pos.length / 3 - 1;
    };

    const rings = [];
    for (let i = 0; i < M; i++) {
      const p = raw[i], a = raw[Math.max(0, i - 1)], b = raw[Math.min(M - 1, i + 1)];
      const T = new THREE.Vector3(b.c.x - a.c.x, b.c.y - a.c.y, b.c.z - a.c.z).normalize();
      const N = new THREE.Vector3(p.nx, p.ny, p.nz).normalize();
      const Tv = new THREE.Vector3().crossVectors(N, T).normalize();
      const Nn = new THREE.Vector3().crossVectors(T, Tv).normalize();
      const s = i / (M - 1);
      const symMid = Math.exp(-Math.pow((s - .5) / .18, 2));
      /* Fullest at the anterior symphysis & mid-ramus, tapering into a sculpted commissural fold at the corners */
      const taper = (.36 + .64 * Math.pow(Math.sin(Math.PI * H.clamp(s, 0, 1)), .36)) * (1 + (.18 + .22 * full) * symMid) * (sgn < 0 ? (.92 + .16 * P2.symphysis * symMid) : 1.04);
      const knob = 1 + pap * (.14 * Math.sin(s * M * 2.1) + .08 * Math.cos(s * M * 3.7));
      const rN = rad * .96 * taper * knob, rT = rad * 1.38 * taper * knob, ring = [];
      for (let j = 0; j < SEG; j++) {
        const an = j / SEG * H.TAU, ca = Math.cos(an), sa = Math.sin(an);
        /* Teardrop / D-shaped anatomical lip profile: plump rounded outer crest, tucked inner oral margin */
        const crestShape = 1 + .18 * ca - .10 * sa * sgn;
        const q = p.c.clone()
          .addScaledVector(Nn, ca * rN * crestShape)
          .addScaledVector(Tv, sa * rT * (1 + .12 * ca));
        /* If protrusile upper lip, encode tag 2 when pW > 0 so VS_BODY slides it forward with uJawProtrude */
        const useProtrude = sgn > 0 && bm.protrusile && p.pW > .05;
        ring.push(push(q, p.u, p.vert, useProtrude ? p.pW : p.w, useProtrude ? 2.02 : 0));
      }
      rings.push(ring);
    }
    for (let i = 0; i < M - 1; i++) for (let j = 0; j < SEG; j++) {
      const A = rings[i][j], B = rings[i][(j + 1) % SEG], C = rings[i + 1][j], D = rings[i + 1][(j + 1) % SEG];
      idx.push(A, C, B, B, C, D);
    }
    for (const end of [0, M - 1]) {                                    /* end fans: closed volume at the commissure corners */
      const p = raw[end], a = raw[end === 0 ? 1 : M - 2], inw = p.c.clone().sub(a.c).normalize().multiplyScalar(rad * .48).add(p.c);
      const ci = push(inw, p.u, p.vert, p.w, 0);
      for (let j = 0; j < SEG; j++) {
        const A = rings[end][j], B = rings[end][(j + 1) % SEG];
        if (end === 0) idx.push(ci, B, A); else idx.push(ci, A, B);
      }
    }

    /* ── TELEOST MAXILLARY BONE PLATE & COMMISSURAL CHEEK FOLD (welded into the 'upper' mesh) ──
       On bony jawed fish (!P2.isSelachian), builds the paired Maxilla / Supramaxilla paddle above the
       posterior 75% of the upper lip, plus the flexible maxillary-mandibular labial membrane at the corner
       that swings forward with the lower jaw when open (Photos 1, 2, 3, 5, 6, 7, 8).
       On sharks (P2.isSelachian), builds the paired selachian labial corner folds & furrows (Photos 9, 10). */
    if (sgn > 0 && (P2.maxillaW > .1 || P2.isSelachian)) {
      const KM = 16, SM = 7;
      for (const side of [1, -1]) {
        const mRings = [];
        for (let i = 0; i <= KM; i++) {
          const f = i / KM;                                             /* 0 = anterior premaxillary root -> 1 = posterior maxillary paddle at corner */
          const u = H.lerp(H.lerp(u0, u1, P2.isSelachian ? .48 : .18), u1, Math.pow(f, .92));
          const o = lipPoint(bm, u, side, H, 0, {});
          const l = Math.hypot(o.ly, o.lz) || 1, rr = Math.max(l, hl * .05);
          const vertBase = mouthLevel(bm, u, H);
          /* Maxilla sits just dorsal to the upper lip and widens into a paddle toward the mouth corner */
          const paddleW = P2.isSelachian
            ? rad * (.75 + .55 * Math.sin(Math.PI * f))
            : rad * (.65 + (1.15 + 1.35 * P2.maxillaW) * Math.pow(Math.sin(Math.PI * Math.pow(f, .72)), .65));
          const paddleThick = rad * (P2.isSelachian ? .55 : (.52 + .38 * P2.maxillaW)) * Math.sin(Math.PI * (.08 + .84 * f));
          const dvUp = Math.sqrt(Math.max(0, 1 - vertBase * vertBase)) * ((rad * .85 + paddleW * .55 * Math.pow(f, .6)) / rr);
          /* Lower edge of the maxilla / labial fold drops down toward the lower jaw when open! */
          const vertCenter = vertBase + (P2.isSelachian ? -.15 * dvUp : .72 * dvUp);
          const cPt = new THREE.Vector3();
          skinPoint(bm, u, vertCenter, side, cPt, -paddleThick * .42);
          const N = new THREE.Vector3(o.nx * o.ly / l, o.ny * o.ly / l, o.lz / l).normalize();
          const T = new THREE.Vector3(o.tx, o.ty, 0).normalize();
          const Tv = new THREE.Vector3().crossVectors(N, T).normalize();
          /* Jaw rotation weight: ventral/posterior margin of the maxilla & labial fold swings with the lower jaw */
          const jwBase = jawW(bm, u, H) * (.32 + .48 * Math.pow(f, .85)) * (1 - H.sstep(.92, 1, f));
          const ring = [];
          for (let j = 0; j < SM; j++) {
            const an = j / SM * H.TAU, ca = Math.cos(an), sa = Math.sin(an);
            /* Ventral half of the maxillary fold (sa < 0) stretches downward with the lower jaw when opening */
            const ventStretch = sa < 0 ? -sa : 0;
            const wVert = jwBase * (.35 + .65 * ventStretch);
            const q = cPt.clone()
              .addScaledVector(N, ca * paddleThick)
              .addScaledVector(Tv, sa * paddleW * (1 + .25 * f * ventStretch));
            ring.push(push(q, u, vertCenter + sa * (paddleW / rr) * .4, wVert, 0));
          }
          mRings.push(ring);
        }
        for (let i = 0; i < KM; i++) for (let j = 0; j < SM; j++) {
          const A = mRings[i][j], B = mRings[i][(j + 1) % SM], C = mRings[i + 1][j], D = mRings[i + 1][(j + 1) % SM];
          if (side > 0) idx.push(A, B, C, B, D, C); else idx.push(A, C, B, B, C, D);
        }
        /* Cap both ends of the maxillary plate so it is a closed manifold volume */
        for (const end of [0, KM]) {
          const rE = mRings[end];
          const cE = new THREE.Vector3();
          for (let j = 0; j < SM; j++) { const vi = rE[j] * 3; cE.x += pos[vi]; cE.y += pos[vi + 1]; cE.z += pos[vi + 2]; }
          cE.multiplyScalar(1 / SM);
          const refAb = rE[0] * 4;
          const ci = push(cE, ab[refAb], mouthLevel(bm, ab[refAb], H), ab[refAb + 3], 0);
          for (let j = 0; j < SM; j++) {
            const A = rE[j], B = rE[(j + 1) % SM];
            if ((end === 0) === (side > 0)) idx.push(ci, B, A); else idx.push(ci, A, B);
          }
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aBody', new THREE.Float32BufferAttribute(ab, 4));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mats.jaw);
    mesh.frustumCulled = false; mesh.renderOrder = 1;
    mesh.userData.lips = sgn > 0 ? 'upper' : 'lower';
    out.push(mesh);
  }
  return out;
}

/** A triangle that would stand on the centre plane as a sheet — wholly inside the band (0.02 × head width) with its surface parallel to the plane (|nz| ≥ .5). */
export function isSheet(pos, a, b, c, tol, any = false) {
  const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2], bx = pos[b * 3] - ax, by = pos[b * 3 + 1] - ay, bz = pos[b * 3 + 2] - az, cx = pos[c * 3] - ax, cy = pos[c * 3 + 1] - ay, cz = pos[c * 3 + 2] - az;
  if (Math.abs(az) > tol || Math.abs(pos[b * 3 + 2]) > tol || Math.abs(pos[c * 3 + 2]) > tol) return false;
  const nx = by * cz - bz * cy, ny = bz * cx - bx * cz, nzz = bx * cy - by * cx, l = Math.hypot(nx, ny, nzz); return any || (l > 1e-18 && Math.abs(nzz) / l >= .5);
}
/** The centre-plane band (0.02 × head width) shared by the builder and the audit */
export function centreBand(bm) { let hw = 0; for (let k = 0; k <= 12; k++) { const s = {}; bm.section(bm.h * k / 12, s); hw = Math.max(hw, bm.halfWidthAtY(s, 0)); } return hw * 2 * .02; }

/* keep any interior vertex inside the head section at its own station (a cavity, never a tunnel) */
function contain(bm, q, H, slack = .9) {
  const uq = H.clamp((bm.headX - q.x) / bm.L, .004, .999), fq = {}, sq = {}; bm.frame(uq, fq); bm.section(uq, sq);
  const ly = H.clamp((q.x - fq.px) * fq.nx + (q.y - fq.py) * fq.ny, -sq.dDn * slack, sq.dUp * slack), hw = bm.halfWidthAtY(sq, ly) * slack * .96;
  return q.set(fq.px + fq.nx * ly, fq.py + fq.ny * ly, H.clamp(q.z, -hw, hw));
}

function blobMesh(bm, mats, H, centre, ax, ay, az, fr, tag, wFn, rows = 10, cols = 16, shapeFn = null) {
  const { THREE } = H, geo = new THREE.SphereGeometry(1, cols, rows), P = geo.getAttribute('position'), ab = [], q = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) {
    let x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    if (shapeFn) { const s = shapeFn(x, y, z); x = s.x; y = s.y; z = s.z; }
    q.set(centre.x + fr.tx * ax * x + fr.nx * ay * y, centre.y + fr.ty * ax * x + fr.ny * ay * y, centre.z + az * z);
    contain(bm, q, H); P.setXYZ(i, q.x, q.y, q.z);
    ab.push(H.clamp((bm.headX - q.x) / bm.L, .004, .999), .5, tag, wFn(x, y, z));
  }
  geo.setAttribute('aBody', new THREE.Float32BufferAttribute(ab, 4));
  { const ix = geo.index.array, keep = [], tol = centreBand(bm); for (let t = 0; t < ix.length; t += 3) if (!isSheet(P.array, ix[t], ix[t + 1], ix[t + 2], tol, true)) keep.push(ix[t], ix[t + 1], ix[t + 2]); geo.setIndex(keep); }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mats.jaw); mesh.frustumCulled = false; mesh.renderOrder = 1; return mesh;
}

/** Layered interior (visible when the jaw opens):
