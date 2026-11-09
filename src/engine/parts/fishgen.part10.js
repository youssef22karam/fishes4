  constructor() { this.pos = []; this.fin = []; this.fin2 = []; this.skin = []; this.base = []; this.idx = []; this.rays = []; this.areas = {}; this.nv = 0; this.bases = []; this.attachments = []; this.rootNormals = []; this.hinge = []; this.axis = []; }
  add(sp) {
    const R = sp.R, K = sp.K, v0 = this.nv, faceSize = R * (K + 1), b = new THREE.Vector3(), edge = new THREE.Vector3(), root = new THREE.Vector3(), q = new THREE.Vector3(), normal = sp.normal.clone(), tips = []; let area = 0;
    const tri = (i, j, k, side) => {
      const P = this.pos, ax = P[j * 3] - P[i * 3], ay = P[j * 3 + 1] - P[i * 3 + 1], az = P[j * 3 + 2] - P[i * 3 + 2], bx = P[k * 3] - P[i * 3], by = P[k * 3 + 1] - P[i * 3 + 1], bz = P[k * 3 + 2] - P[i * 3 + 2];
      const dot = (ay * bz - az * by) * normal.x + (az * bx - ax * bz) * normal.y + (ax * by - ay * bx) * normal.z;
      this.idx.push(i, dot * side < 0 ? k : j, dot * side < 0 ? j : k);
    };
    for (const side of [1, -1]) for (let i = 0; i < R; i++) {
      const t = i / (R - 1); sp.base(t, b); sp.edge(t, edge); sp.root(t, side, root);
      const u = root.u, ang = ((root.theta + Math.PI / 2) / TAU + 1) % 1;
      if (side === 1) { tips.push(edge.clone()); if (i % 2 === 0) this.rays.push([b.x, b.y, b.z, edge.x, edge.y, edge.z]); }
      const attached = !sp.attached || sp.attached(t);
      if (attached) sp.bm.attachedSurface(u, root.theta, root);
      const rnS = new THREE.Vector3(); if (sp.sink && attached) sp.bm.surfaceNormal(u, root.theta, rnS);
      if (attached) { this.bases.push([root.x, root.y, root.z, sp.kind]); this.attachments.push({ kind: sp.kind, u, theta: root.theta, point: [root.x, root.y, root.z], index: this.nv, allow: (sp.sink || 0) + (sp.thickness || 0) * (1 + (sp.lead || 0) * 1.35) * (sp.baseThick || 0) });   /* allow = deliberate burial depth + fleshy base wedge */ }
      for (let k = 0; k <= K; k++) {
        const s = k / K, collar = 1 - sstep(0, .42 + .16 * sp.blend, s);
        q.copy(b).lerp(edge, s).addScaledVector(root.clone().sub(b), collar);
        const lead = sp.lead ? 1 + sp.lead * Math.exp(-t * 9) + sp.lead * Math.exp(-(1 - t) * 14) * .35 : 1;   /* thickened leading edge */
        const width = sp.thickness * lead * (Math.pow(Math.sin(Math.PI * s), 1.2) * (1 - s) + (sp.baseThick || 0) * (1 - sstep(0, .55, s))) * Math.pow(Math.max(0, Math.sin(Math.PI * t)), .45);
        if (sp.sink && attached) q.addScaledVector(rnS, -sp.sink * (1 - sstep(0, .45, s)));   /* fleshy base buried in the body wall */
        q.addScaledVector(normal, side * width);
        if (k === 0 && attached) {
          const rn = new THREE.Vector3(); sp.bm.surfaceNormal(u, root.theta, rn);
          this.rootNormals.push([this.nv, rn.x, rn.y, rn.z]);
        }
        if (sp.hinge) { this.hinge.push(sp.hinge.x, sp.hinge.y, sp.hinge.z, sp.hinge.sg); this.axis.push(sp.hinge.ax, sp.hinge.ay, sp.hinge.az); } else { this.hinge.push(0, 0, 0, 0); this.axis.push(0, 0, 0); }
        this.pos.push(q.x, q.y, q.z); this.fin.push(t, s, sp.flex, sp.kindId); this.fin2.push(sp.opacity, sp.memb, sp.spineFrac, sp.physicalR || R);
        this.skin.push(u, ang, 0, 0); this.base.push(root.x, root.y, root.z); this.nv++;
      }
    }
    for (let side = 0; side < 2; side++) for (let i = 0; i < R - 1; i++) for (let k = 0; k < K; k++) {
      const a = v0 + side * faceSize + i * (K + 1) + k, bb = a + K + 1;
      tri(a, bb, a + 1, side ? -1 : 1); tri(a + 1, bb, bb + 1, side ? -1 : 1);
      if (!side) area += triArea(this.pos, a, bb, a + 1) + triArea(this.pos, a + 1, bb, bb + 1);
    }
    for (let i = 0; i < R - 1; i++) { const a = v0 + i * (K + 1) + K, b2 = a + K + 1, c2 = a + faceSize, d = b2 + faceSize; this.idx.push(a, c2, b2, b2, c2, d); }
    for (const i of [0, R - 1]) for (let k = 0; k < K; k++) { const a = v0 + i * (K + 1) + k, b2 = a + faceSize; this.idx.push(a, a + 1, b2, a + 1, b2 + 1, b2); }
    this.areas[sp.kind] = (this.areas[sp.kind] || 0) + area; return { tips, area };
  }
  build() { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); geo.setAttribute('aFin', new THREE.Float32BufferAttribute(this.fin, 4)); geo.setAttribute('aFin2', new THREE.Float32BufferAttribute(this.fin2, 4)); geo.setAttribute('aSkin', new THREE.Float32BufferAttribute(this.skin, 4)); geo.setAttribute('aBase', new THREE.Float32BufferAttribute(this.base, 3)); geo.setAttribute('aHinge', new THREE.Float32BufferAttribute(this.hinge, 4)); geo.setAttribute('aAxis', new THREE.Float32BufferAttribute(this.axis, 3)); geo.setIndex(this.idx); geo.computeVertexNormals(); const n = geo.getAttribute('normal'); for (const [i, x, y, z] of this.rootNormals) n.setXYZ(i, x, y, z); return geo; }
}
function foil_(o, fn, t) { return ['triangle', 'falcate'].includes(o.shape) ? 1 : fn(t, o.spineFrac); }
function addRidgeFin(fb, bm, o) {
  const fr = {}, p = {}, fn = SHAPE_FN[o.shape] || SHAPE_FN.lobe, cfg = bm.g.fins[o.cfg || o.kind] || {}, solid = bm.a.solid && o.kind !== 'adipose';
  /* round 3: realised fin height ≤ cap × L (dorsal / anal .30, accessory fins .10) and the base is buried (skin blend) by min(.02 L, half the local depth) */
  { let hm = 0; for (let i = 0; i <= 24; i++) hm = Math.max(hm, foil_(o, fn, i / 24)); const capL = (o.kind === 'dorsal' ? TAIL.CAP.dorsalH : o.kind === 'anal' ? TAIL.CAP.analH : .1) * bm.L; if (o.height * hm > capL) o = Object.assign({}, o, { height: capL / Math.max(1e-6, hm) }); }
  { const H = bm.finH || (bm.finH = {}); let hm = 0; for (let i = 0; i <= 24; i++) hm = Math.max(hm, foil_(o, fn, i / 24)); H[o.kind] = Math.max(H[o.kind] || 0, o.height * hm / bm.L); }
  const sinkS = {}; bm.section((o.u0 + o.u1) / 2, sinkS); const sink = Math.min(TAIL.CAP.sink * bm.L, .5 * Math.min(sinkS.dUp, sinkS.dDn));
  const apex = cfg.apex || .36, curve = cfg.curvature || .48, rootAngle = bm.a.root * (solid ? 3.0 : 1.3), span = o.u1 - o.u0;
  const foil = ['triangle', 'falcate'].includes(o.shape), memb = o.shape === 'spines' ? (bm.a.family === 'lion' ? .25 : bm.a.family === 'rigid' && o.spineFrac > .8 ? .12 : .68) : 1;
  return fb.add({ bm, kind: o.kind, kindId: o.kindId, sink, R: Math.max(o.rays, o.K > 2 ? 18 : 5), physicalR: o.rays, K: o.K, flex: o.flex, opacity: o.opacity, memb, spineFrac: o.spineFrac, solid,
    blend: cfg.rootBlend || .55, thickness: bm.maxD * bm.a.root * (solid ? .22 : .13), normal: new THREE.Vector3(0, 0, 1),
    base: (t, out) => { bm.surface(lerp(o.u0, o.u1, t), o.side * Math.PI / 2, p); out.set(p.x, p.y, p.z); },
    root: (t, side, out) => { const u = lerp(o.u0, o.u1, t), th = o.side * Math.PI / 2 - side * rootAngle * Math.pow(Math.max(0, Math.sin(Math.PI * t)), .5); bm.surface(u, th, p); out.set(p.x, p.y, p.z); out.u = u; out.theta = th; },
    edge: (t, out) => {
      let eu = lerp(o.u0, o.u1, t), h;
      if (foil) { const v = foilOutline(t, apex, o.sweep, curve, bm.a.freeTip); eu = o.u0 + span * v[0]; h = v[1]; }
      else { h = fn(t, o.spineFrac); eu += Math.sin(Math.PI * t) * o.sweep * Math.min(span * .3, o.height / bm.L * .35); }
      bm.surface(clamp(eu, .005, .999), o.side * Math.PI / 2, p); bm.frame(clamp(eu, .005, 1), fr);
      out.set(p.x + fr.nx * o.side * o.height * h, p.y + fr.ny * o.side * o.height * h, 0);
    } });
}
function addPectoral(fb, bm, side, K, rays) {
  /* Side fin: fleshy base sunk in the body wall, thickened leading edge, rays fanning from the base, membrane between rays. Length / rest angle / aspect come from
     the fin plan (finmotion.pecPlan: swim mode, body size); the joint (hinge point + abduction axis) is handed to the vertex shader through aHinge / aAxis. */
  const f = bm.g.fins.pectoral, lm = bm.lm, fr = {}, sec = {}, p = {}, base = new THREE.Vector3(); bm.frame(lm.pectoralBase, fr); bm.section(lm.pectoralBase, sec);
  const disc = bm.a.family === 'ray', foil = bm.a.solid || ['pointed', 'wing'].includes(f.shape), plan = bm.law.pec, L = bm.L, D2R = Math.PI / 180;
  const tanA = Math.tan(plan.restAbd * D2R), cosA = Math.cos(plan.restAbd * D2R), sinA = Math.sin(plan.restAbd * D2R), downAng = .3 + .35 * f.sweep;
  let len = f.len * bm.maxD, chord = Math.min(.14 * L, f.baseLen * (sec.dUp + sec.dDn) * (foil ? 1.25 : .48));
  const rootU = t => disc ? lerp(.025, Math.min(.84, lm.peduncleStart - .06), t) : lm.pectoralBase + t * chord / L;
  const th = t => f.v * 1.25 + (disc || foil ? 0 : (.5 - t) * Math.min(f.baseLen, .5) * 1.1);
  const root = (t, skinSide, out) => { const u = rootU(t), a = th(t) + skinSide * bm.a.root * 2 * Math.sin(Math.PI * t), theta = side > 0 ? a : Math.PI - a; bm.surface(u, theta, p); out.set(p.x, p.y, p.z); out.u = u; out.theta = theta; };
  const basePt = (t, out) => { const u = rootU(t), theta = side > 0 ? th(t) : Math.PI - th(t); bm.surface(u, theta, p); return out.set(p.x, p.y, p.z); };
  const tipFor = (t, out, ln) => {
    basePt(t, base);
    if (disc) {
      const h = Math.pow(Math.max(0, Math.sin(Math.PI * t)), f.shape === 'wing' ? .85 : .58);
      const ext = bm.discMargin || ln; out.copy(base).add(new THREE.Vector3(-ext * f.sweep * h * .65, -bm.maxD * .06 * h, side * ext * h));
    } else if (foil) {
      const v = foilOutline(t, f.apex, f.sweep, f.curvature, bm.a.freeTip * .7);
      bm.surface(lm.pectoralBase, side > 0 ? f.v * 1.25 : Math.PI - f.v * 1.25, p);
      const span = ln * v[1], post = v[0] * chord + span * cosA * Math.cos(downAng), down = span * cosA * Math.sin(downAng);   /* held close to the body, angled back */
      out.set(p.x + fr.tx * post - fr.nx * down, p.y + fr.ty * post - fr.ny * down, p.z + side * span * sinA);
    } else {
      /* radiating ray fan: rays leave a small base at angles from up-and-back (leading, t=0) to down-and-back (trailing) */
      const shp = (PECT_SHAPE[f.shape] || PECT_SHAPE.rounded)(t), psi = lerp(.7, -.95, t) * clamp(plan.fan * clamp(f.spread / .6, .85, 1.15), .5, 1.5);
      const Lt = ln * shp * (.62 + .38 * Math.sin(Math.PI * (.1 + .8 * t))) * (.8 + f.sweep * .3);
      const dx = fr.tx * Math.cos(psi) + fr.nx * Math.sin(psi), dy = fr.ty * Math.cos(psi) + fr.ny * Math.sin(psi);
      out.set(base.x + dx * Lt, base.y + dy * Lt - (f.shape === 'limb' ? ln * .25 * shp : 0), base.z + side * Lt * tanA);
    }
  };
  const centre = basePt(.5, new THREE.Vector3()), tmp = new THREE.Vector3();
  const extent = () => { let m = 0; for (let i = 0; i <= 14; i++) { tipFor(i / 14, tmp, len); m = Math.max(m, tmp.distanceTo(centre)); } return m; };
  if (!disc) {   /* fin-length law: natural length clamped into the band for the swim mode; aspect from the plan */
    const goal = () => PEC.pecLength(extent() / L, plan) * L;
    for (let k = 0; k < 3; k++) { const e = extent(); if (e > 1e-9) len *= goal() / e; }
    if (foil) { chord = clamp(chord, .6 * len / plan.aspect, 1.35 * len / plan.aspect); for (let k = 0; k < 2; k++) { const e = extent(); if (e > 1e-9) len *= goal() / e; } }
  }
  /* joint: hinge = base centre sunk into the wall; abduction axis ⟂ mean ray direction (right-hand frame, mirrored for the left fin by the shader) */
  const sink = disc ? 0 : Math.max(PEC.PEC_SINK_MIN * 1.25, .025) * L;
  let hinge = null, rep;
  if (!disc) {
    const n = new THREE.Vector3(); bm.surfaceNormal(rootU(.5), side > 0 ? th(.5) : Math.PI - th(.5), n);
    const hc = centre.clone().addScaledVector(n, -sink), mr = new THREE.Vector3();
    for (let i = 0; i <= 14; i++) { tipFor(i / 14, tmp, len); mr.add(new THREE.Vector3(tmp.x - hc.x, tmp.y - hc.y, 0)); }
    mr.multiplyScalar(1 / 15); const al = Math.hypot(mr.x, mr.y) || 1, ax = mr.y / al, ay = -mr.x / al;   /* mr × z */
    hinge = { x: hc.x, y: hc.y, z: hc.z * side, sg: side, ax, ay, az: 0 };
  }
  rep = { cls: plan.cls, hinged: !disc, sinkOverL: sink / L, lenOverL: disc ? 0 : extent() / L, restAbd: plan.restAbd, lagDeg: plan.lagDeg, hinge: hinge && [hinge.x, hinge.y, hinge.z] };
  const info = bm.pecInfo || (bm.pecInfo = {}); info[side] = rep; info.mirrored = !!(info[1] && info[-1] && Math.abs(info[1].lenOverL - info[-1].lenOverL) < 1e-6 && Math.abs(info[1].sinkOverL - info[-1].sinkOverL) < 1e-9);
  return fb.add({ bm, kind: 'pectoral', kindId: 3, R: Math.max(rays, K > 2 ? 20 : 6), physicalR: rays, K, flex: f.flex, opacity: f.opacity, memb: f.shape === 'filament' ? .3 : bm.a.family === 'lion' ? .8 : 1, spineFrac: 0, solid: bm.a.solid,
    blend: f.rootBlend, thickness: bm.maxD * bm.a.root * (bm.a.solid ? .24 : .13), normal: disc ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1), root,
    sink, lead: disc ? 0 : 1.6, baseThick: disc ? 0 : .9, hinge,
    base: basePt, edge: (t, out) => tipFor(t, out, len) });
}
function addPelvic(fb, bm, side, K, rays) {
  const f = bm.g.fins.pelvic, u = bm.lm.pelvicBase, p = {}, fr = {}, fused = f.shape === 'fused', len = f.len * bm.maxD * .55, spread = fused ? .16 : .48, sec = {};
  bm.frame(u, fr); bm.section(u, sec);
  /* round 3: pelvic fins stay small — never longer than the side fins of the same fish (gliding plan excepted), ≤ .20 L, base buried like the others */
  const pecL = bm.pecInfo && bm.pecInfo[1] && bm.pecInfo[1].lenOverL ? bm.pecInfo[1].lenOverL * bm.L : 0, glide = bm.a.family === 'glider' || bm.a.family === 'ray', sink = Math.min(TAIL.CAP.sink * bm.L, .5 * sec.dDn);
  const lenCap = Math.min(TAIL.CAP.pelvicH * bm.L / .8, glide || !pecL ? 9 : pecL * .8); const lenF = Math.min(len, lenCap); (bm.finH || (bm.finH = {})).pelvic = lenF * 1.2 / bm.L; bm.finH.pecL = pecL / bm.L;
  const rootU = t => clamp(u + t * bm.bp.maxD * .12, .02, .94), rootTh = -Math.PI / 2 + side * spread;
  return fb.add({ bm, kind: 'pelvic', kindId: 4, sink, R: Math.max(rays, K > 2 ? 10 : 4), K, flex: f.flex, opacity: f.opacity, memb: f.shape === 'filament' ? .32 : 1, spineFrac: 0, solid: bm.a.solid, blend: .65, thickness: bm.maxD * bm.a.root * .22, normal: new THREE.Vector3(0, 0, side),
    base: (t, out) => { bm.surface(rootU(t), rootTh, p); out.set(p.x, p.y, p.z); },
    root: (t, skinSide, out) => { const uu = rootU(t), theta = rootTh + skinSide * .045 * Math.sin(Math.PI * t); bm.surface(uu, theta, p); out.set(p.x, p.y, p.z); out.u = uu; out.theta = theta; },
    edge: (t, out) => {
      const v = foilOutline(t, .4, .55, .5), h = f.shape === 'filament' ? Math.pow(Math.max(0, Math.sin(Math.PI * t)), 5) : v[1];
      bm.surface(rootU(t), rootTh, p); out.set(p.x + fr.tx * lenF * .8 * h, p.y - lenF * (bm.a.solid ? .3 : .68) * h, p.z + side * lenF * .6 * h);
    } });
}
function addCaudal(fb, bm, K, rays) { return TAIL.buildCaudal(THREE, fb, bm, K, rays); }   /* round 3: bounded tail anatomy lives in tailgeo.js */
function mergeGeos(list) {
  const pos = [], nor = [], idx = []; let off = 0;
  for (const g of list) { const p = g.getAttribute('position'), n = g.getAttribute('normal'), ix = g.getIndex(); for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); } if (ix) for (let i = 0; i < ix.count; i++) idx.push(ix.getX(i) + off); else for (let i = 0; i < p.count; i++) idx.push(i + off); off += p.count; g.dispose(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setIndex(idx); return geo;
}
/* iris colour: the genome's palette eye colour pulled toward a metallic variant (gold / copper / olive / dark) chosen by niche + depth */
function irisColor(g, EL, cart = false) {
  if (HYP.on && !cart) { try { return SKIN.irisOf(THREE, hyperFor(g)); } catch (e) { /* fall through to the engine rule */ } }
  /* round 2: dark, capped iris. Palette hue is kept (gold/copper hues are pulled toward brown/olive), lightness is capped below the body's mid-tone and the
     saturation is bounded, so it never reads as bright amber / gold / yellow-orange in any plan / niche / depth. Cartilaginous plan: near-solid black. */
  const set = EL.irisSet, pick = set[cyrb128(String(g.meta.seed || 'iris') + 'iris')[0] % set.length];
  const V = { gold: [40, .5, .2], copper: [20, .5, .16], olive: [75, .35, .13], dark: [28, .35, .08] }[pick];
  const c = hslCol(g.skin.eye).lerp(hslCol(V), .85), hsl = {}; c.getHSL(hsl, THREE.SRGBColorSpace);
  const cap = cart ? .035 : Math.min(.2, Math.max(.07, g.skin.base[2] * .5));
  let h = hsl.h * 360; if (h > 30 && h < 70) h = 22 + (h - 30) * .2;
  c.setHSL(h / 360, Math.min(hsl.s, cart ? .2 : .5), Math.min(hsl.l, cap), THREE.SRGBColorSpace); return c;
}
function buildEyes(bm, seg, mats) {
  const g = bm.g, out = []; if (g.head.eyeSide === 'none') return out; const fr = {}, s = {}; const u = bm.lm.eye; bm.frame(u, fr); bm.section(u, s);
  const y = bm.eyeY; const list = g.head.eyeSide === 'both' ? [[1, y, u], [-1, y, u]] : g.head.eyeSide === 'left' ? [[1, y, u], [1, y, u + 2.3 * bm.eyeR / bm.L]] : [[-1, y, u], [-1, y, u + 2.3 * bm.eyeR / bm.L]];
  const EL = bm.law.eye, ray = ['ray', 'benthicShark'].includes(bm.a.family), specs = [], opaque = [], glass = [], skin = [], infos = [], blends = [], jobs = [];
  for (const [side, yy, uu] of list) {
    bm.frame(uu, fr); bm.section(uu, s);
    const yn = yy > 0 ? s.nD : s.nV, yr = yy > 0 ? s.dUp : s.dDn;
    const th = bm.disc ? DISC.thetaOfZ(s, s.coreW * .8) : ray ? Math.acos(clamp(Math.pow(s.coreW * .8 / Math.max(1e-8, s.w), s.n / 2), 0, 1))
      : Math.asin(Math.sign(yy) * Math.pow(clamp(Math.abs(yy) / Math.max(1e-8, yr), 0, .9), yn / 2));
    const theta = side > 0 ? th : Math.PI - th, surface = {}, axis = new THREE.Vector3();
    bm.rawSurface(uu, theta, surface); bm.surfaceNormal(uu, theta, axis);
    axis.add(new THREE.Vector3(-fr.tx * Math.max(g.head.eyeForward, EL.forwardMin) * .16, 0, 0)).normalize();
    /* seated: the sphere centre lies EYE_SEAT radii under the skin, so the dome protrudes (1 - EYE_SEAT) / 2 of the diameter */
    const center = new THREE.Vector3(surface.x, surface.y, surface.z).addScaledVector(axis, -bm.eyeR * EYE_SEAT);
    if (bm.law.eye.placement === 'oneSide') center.z = side * Math.max(Math.abs(center.z), bm.eyeR * .06);   /* thin side-flattened head: the centre stays on its own side of the mid-plane */
    const spec = { side, center, axis, R: bm.eyeR, forward: new THREE.Vector3(-fr.tx, -fr.ty, 0), up: new THREE.Vector3(fr.nx, fr.ny, 0), u: uu, surface: new THREE.Vector3(surface.x, surface.y, surface.z) };
    specs.push(spec);
    if (EL.vestigial) { jobs.push({ spec, vestigial: true }); continue; }
    /* round 2.1: no ring / socket / frame part — the head SKIN blends up onto the eyeball (eyegeo.buildSkinBlend, head skin material). Seat depth is refined against the real head surface (see refine below). */
    spec.flat = ray; spec.theta = theta;
    jobs.push({ spec });
  }
  /* round 7: bilateral symmetry BY CONSTRUCTION. The per-side seat refinement samples the surface independently; on the
     WP1-sculpted head its two sides diverge by more than float residue (the 'med' loft is faceted between stations, and
     the sculpt's gradients are steep near the eye), which produced BOTH failure modes in successive verify runs: averaged
     post-refinement centres sat one eye too deep (EYE_SLICED, boxfish), while un-averaged centres broke the symmetry
     audit's 5e-4·L tolerance. So for a paired placement at one station: (1) the raw specs are symmetrised (centre / axis /
     surface averaged, z mirrored), (2) the seat refinement runs ONCE, on the first side, and its scalars (dl, lf, sk) are
     applied mirrored to the twin — whose local surface is the mirror image, so the same refinement is the correct one.
     The built eyes are then exactly mirror images at the proven refined seat depth. */
  const paired = g.head.eyeSide === 'both' && jobs.length === 2 && jobs[0].spec.u === jobs[1].spec.u;
  if (paired) {
    const A = jobs[0].spec, B = jobs[1].spec;
    for (const key of ['center', 'axis', 'surface']) {
      const mx = (A[key].x + B[key].x) / 2, my = (A[key].y + B[key].y) / 2, mz = (Math.abs(A[key].z) + Math.abs(B[key].z)) / 2;
      A[key].set(mx, my, Math.abs(mz) * (A.side > 0 ? 1 : -1)); B[key].set(mx, my, Math.abs(mz) * (B.side > 0 ? 1 : -1));
    }
  }
  const refine = (job) => { const spec = job.spec, axis = spec.axis, side = spec.side;
    const sk = EYE.skinCurvature(THREE, bm, spec, clamp), dl = EYE.seatDelta(spec, sk); let dl2 = dl;
    if (dl > 0) { const c0 = spec.center.clone(); spec.center.addScaledVector(axis, -dl); if (bm.law.eye.placement === 'oneSide') spec.center.z = side * Math.max(Math.abs(spec.center.z), bm.eyeR * .06); dl2 = Math.max(0, c0.sub(spec.center).dot(axis)); sk.z0 += dl2; }
    const lf = EYE.seatLift(THREE, bm, spec, clamp, Math.max(0, dl2 + 2 * bm.eyeR * (EYE_PROTRUSION_MAX - EYE_PROTRUSION)));   /* round 6H.3a L5: lift inside the eyeband.js seat band until the cornea is clear */
    if (lf > 0) { spec.center.addScaledVector(axis, lf); if (bm.law.eye.placement === 'oneSide') spec.center.z = side * Math.max(Math.abs(spec.center.z), bm.eyeR * .06); sk.z0 -= lf; dl2 -= lf; }
    job.sk = sk; job.dl2 = dl2; job.dl = dl; job.lf = lf; };
  if (paired && !jobs[0].vestigial) {
    refine(jobs[0]);
    const J = jobs[0], T = jobs[1], ts = T.spec;
    if (J.dl > 0) ts.center.addScaledVector(ts.axis, -J.dl);
    if (J.lf > 0) ts.center.addScaledVector(ts.axis, J.lf);
    if (bm.law.eye.placement === 'oneSide') ts.center.z = ts.side * Math.max(Math.abs(ts.center.z), bm.eyeR * .06);
    T.sk = { ...J.sk }; T.dl2 = J.dl2;
  } else for (const job of jobs) if (!job.vestigial) refine(job);
  for (const job of jobs) {
    const spec = job.spec;
    if (job.vestigial) { skin.push(EYE.buildVestigial(THREE, spec, seg)); infos.push({ center: spec.center.clone(), axis: spec.axis.clone(), R: bm.eyeR, u: spec.u, protrusion: EYE_PROTRUSION, vestigial: true, pupil: 'none', covers: {} }); continue; }
    const organ = EYE.buildOrgan(THREE, spec, EL, seg); opaque.push(...organ.opaque); glass.push(...organ.glass); organ.info.protrusion = (1 - EYE_SEAT - job.dl2 / bm.eyeR) / 2; infos.push(organ.info);
    const blend = EYE.buildSkinBlend(THREE, spec, seg, job.sk); infos[infos.length - 1].seatExtra = job.dl2 / bm.eyeR;
    blends.push(blend); infos[infos.length - 1].rimH = blend.userData.rimH;
  }
  bm.eyes = infos;
  const eyeCol = irisColor(g, EL, bm.a.gills === 'lateral');
  if (opaque.length) { const m = new THREE.Mesh(EYE.mergeParts(THREE, opaque), mats.eyeOrgan(false, eyeCol, specs[0].axis)); m.frustumCulled = false; m.userData.eyeball = true; m.userData.eyes = infos; out.push(m); }
  if (glass.length) { const m = new THREE.Mesh(EYE.mergeParts(THREE, glass), mats.eyeOrgan(true, eyeCol, specs[0].axis)); m.frustumCulled = false; m.renderOrder = 3; m.userData.eyeGlass = true; out.push(m); }
  if (skin.length) { const geo = mergeGeos(skin); skinAttributes(geo, bm); const m = new THREE.Mesh(geo, mats.body); m.frustumCulled = false; m.userData.eyeball = true; m.userData.eyes = infos; out.push(m); }
  if (blends.length) { const ab = new Float32Array(blends.reduce((n, b) => n + b.userData.prox.length / 3, 0) * 4); let o = 0; for (const b of blends) { const a = patchBodyCoords(bm, b.userData.prox, b.userData.side, b); ab.set(a, o); o += a.length; } const geo = mergeGeos(blends); geo.setAttribute('aBody', new THREE.BufferAttribute(ab, 4)); const m = new THREE.Mesh(geo, mats.body); m.frustumCulled = false; m.userData.eyeSkin = true; out.push(m); }
  return out;
}
function buildNostrils(bm, mats) {
  if (bm.disc) return DISC.buildMarks(bm, mats, GH);
  /* round 5B: the only marks that may sit on the cheek / snout are the paired nares (every plan) and the spiracle (plans that carry one: cartilaginous / flattened — never a bony plan). Both are SOFT, low-contrast
     pits (tag 8: the skin colour darkened at most ~30 %, falling to zero at the rim — vBody.w), sized from the EYE (never from body depth), at the positions the plan puts them. No hard dark disk exists. */
  const geos = [], g = bm.g, points = {}, normal = new THREE.Vector3(), bony = bm.a.gills === 'lateral';
  const theta = bm.a.gills === 'lateral' || bm.a.gills === 'ventral' ? -.82 : .23, nostrilInfo = [];
  for (const side of [-1, 1]) for (const type of [0, ...(g.head.spiracles && !bony ? [1] : [])]) {
    const u = type ? bm.lm.eye + bm.h * .12 : bm.a.gills === 'lateral' ? Math.max(.008, bm.jawStartU * .5) : Math.max(.024, bm.lm.eye * .52), base = type && bm.law.flat ? 1.2 : theta + (type ? .4 : 0), th = side > 0 ? base : Math.PI - base;
    bm.rawSurface(u, th, points); bm.surfaceNormal(u, th, normal);
    const rad = Math.min(bm.maxD * (type ? .035 : .021) * (.45 + g.head.nostrils), bm.eyeR * (type ? .5 : .3));
    const disk = new THREE.SphereGeometry(rad, 10, 6); disk.scale(.65, .25, 1);
    const P = disk.getAttribute('position'), wv = new Float32Array(P.count); for (let i = 0; i < P.count; i++) wv[i] = Math.max(0, Math.min(1, P.getY(i) / (rad * .25)));   /* 1 at the pit's centre, 0 at its rim */
    disk.userData.w = wv;
    disk.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal));
    disk.translate(points.x + normal.x * rad * .1, points.y + normal.y * rad * .1, points.z + normal.z * rad * .1);
    geos.push(disk); nostrilInfo.push({ type, side, y: points.y, ny: normal.y, rad });
  }
  const geo = mergeGeos(geos); skinAttributes(geo, bm, 8); const ab = geo.getAttribute('aBody'); let o = 0; for (const d of geos) { const wv = d.userData.w; for (let i = 0; i < wv.length; i++) ab.setW(o + i, wv[i]); o += wv.length; }
  const mesh = new THREE.Mesh(geo, mats.body); mesh.frustumCulled = false; mesh.userData.nostrils = nostrilInfo; return mesh;
}
function buildTeeth(bm, mats) {   /* round 2: rooted continuous rows on the lip line (teethgeo.js) */
  const m = bm.g.mouth; if (m.teethCount <= 0 || m.teeth === 'none') return null; return TEETHGEO.buildTeethRows(bm, mats, GH, m.teeth);
}
/* barbels: rooted, tapered, capped strands (appendages.js); stations and lengths come from the barbel law */
function buildBarbels(bm, mats) { return APP.buildBarbels(bm, mats, GH); }
// @@PART js/app.part11.js (11/19) lines 2151-2428 of the original module script -- stripped by build.mjs
function buildSpecials(bm, mats) {
  const g = bm.g, sp = g.head.special, L = bm.L, out = [], fr = {}, s = {};
  if (sp === 'none' || sp === 'horns' || bm.billStart !== null) return out;
  const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; out.push(m); return m; };
  bm.frame(0.003, fr); bm.section(0.03, s); const snX = fr.px, snY = fr.py;
  const loftSpike = (uBase, len, taperY, taperZ, droop, widen) => {
    /* base ring sampled ON the skin at uBase → the junction is vertex-coincident with the body, no seam */
    const M = 18, N = 14, ring = [], pos = [], idx = [], p = {}, frB = {}; bm.frame(uBase, frB);
    let cy = 0, cz = 0;
    for (let j = 0; j < M; j++) { bm.rawSurface(uBase, -Math.PI / 2 + j / M * TAU, p); ring.push([p.x, p.y, p.z]); cy += p.y / M; cz += p.z / M; }
    const fwdX = -frB.tx, fwdY = -frB.ty, tipX = frB.px + fwdX * len, tipY = cy + fwdY * len - droop * len;
    for (let i = 0; i <= N; i++) {
      const f = i / N, ease = Math.pow(f, .9), shrink = Math.pow(1 - f, .9) * (1 - f * .15) + .02;
      const axX = lerp(frB.px, tipX, ease), axY = lerp(cy, tipY, ease) - droop * len * f * f;
      for (let j = 0; j < M; j++) {
        const [bx, by, bz] = ring[j];
        const sy = shrink * lerp(1, taperY, f), szf = shrink * lerp(1, taperZ, f) * (1 + widen * Math.sin(Math.PI * f) * .6);
        pos.push(i === 0 ? bx : axX, i === 0 ? by : axY + (by - cy) * sy, i === 0 ? bz : (bz - cz) * szf + cz);
      }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a = i * M + j, b = i * M + (j + 1) % M, c = a + M, d = b + M; idx.push(a, b, c, b, d, c); }
    const rings = []; for (let i = 0; i <= N; i++) { const r = []; for (let j = 0; j < M; j++) { const o = (i * M + j) * 3; r.push([pos[o], pos[o + 1], pos[o + 2]]); } rings.push(r); }   /* round 6H: ring samples, rostral teeth root IN this edge */
    const tip = pos.length / 3; pos.push(tipX + fwdX * len * .015, tipY, 0);
    for (let j = 0; j < M; j++) idx.push(tip, N * M + j, N * M + (j + 1) % M);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); skinAttributes(geo, bm); geo.userData.rings = rings; return geo;
  };
  if (sp === 'bill' || sp === 'sword') { add(loftSpike(.006, g.head.specialLen * L, sp === 'sword' ? .3 : .55, sp === 'sword' ? 1.1 : .6, .05, 0), mats.body); }
  else if (sp === 'rostrum' || sp === 'paddle') { const len = g.head.specialLen * L, w = g.head.specialWidth * L * (sp === 'paddle' ? 2 : 1); const blade = add(loftSpike(.008, len, sp === 'paddle' ? .22 : .14, Math.max(.6, w / Math.max(.001, bm.bp.width(.06) * L)), .01, sp === 'paddle' ? .5 : .15), mats.body);
