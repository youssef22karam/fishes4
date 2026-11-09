    for (let k = 0; k < NRg; k++) for (let s = 0; s < nSides; s++) { const a = ids[k * nSides + s], a2 = ids[k * nSides + (s + 1) % nSides], c = ids[(k + 1) * nSides + s], c2 = ids[(k + 1) * nSides + (s + 1) % nSides]; b.quad(a, a2, c, c2); }
  };
  const spineCount = detail > .6 ? 1 : .5; const headLen = h * L, HS = H.head;
  for (const side of [1, -1]) {
    const b = new GB(), bs = new GB(), sg = sideSgn[side];
    // opercle rear edge: pointed central spine + smaller ones above/below, plus a row along the edge
    const nc = O.spinesCentral, edgeN = HS.spineRows.opercle;
    for (let k = 0; k < nc; k++) { const th = .22 + (k === 0 ? 0 : (k % 2 ? .28 : -.28) * Math.ceil(k / 2)), w = (TH_TOP - th) / (TH_TOP - TH_TIP), [, uR] = bounds(th, w), fm = frame(uR, th, side, (H0 * OP.crest + T) * win(w) + .001);
      const dir = fm.Tu.clone().add(fm.N.clone().multiplyScalar(.3)).normalize(); addSpine(b, fm.P, dir, headLen * HS.spineLen * (k === 0 ? 1.5 : .9) * 1.3, headLen * .014 * HS.spineBase, HS.spineCurve * .2, 3, 1, sg, 1); }
    for (let k = 0; k < edgeN * spineCount; k++) { const w = lerp(.12, .72, (k + .5) / Math.max(1, edgeN * spineCount)), th = thW(w), [, uR] = bounds(th, w), fm = frame(uR, th, side, (H0 * OP.crest + T) * win(w) + .001);
      const dir = fm.Tu.clone().add(fm.N.clone().multiplyScalar(.2)).normalize(); addSpine(b, fm.P, dir, headLen * HS.spineLen * rng.range(.5, .9), headLen * .008 * HS.spineBase, HS.spineCurve * .25, 3, 1, sg, 1, 5); }
    // preopercular + cheek spines (fixed)
    const np = Math.max(HS.spineRows.preop, Math.min(4, Math.round(H.archetype.traits.spiny * 4)));
    for (let k = 0; k < np * spineCount; k++) { const th = lerp(.5, -.6, (k + .5) / np), fm = frame(front(th) - h * .01, th, side, H0 * .8);
      const dir = fm.Tu.clone().multiplyScalar(.9).addScaledVector(fm.N, .5).addScaledVector(fm.Tt, -.45).normalize(); addSpine(bs, fm.P, dir, headLen * HS.spineLen * rng.range(.6, 1.1), headLen * .009 * HS.spineBase, HS.spineCurve * .3, 3, 0, sg, 0, 5); }
    // brow spines above the eye + tassels (brow / chin / snout)
    if (g.head.eyeSide !== 'none') {
      const uE = lm.eye, rU = bm.eyeR / Math.max(1e-6, L), yy = bm.eyeY || 0, es = bm.section(lm.eye, {}), yr = Math.max(1e-8, yy > 0 ? es.dUp : es.dDn), ev = Math.sign(yy || 1) * Math.min(.9, Math.abs(yy) / yr), evh = clamp(bm.eyeR / Math.max(1e-6, (es.dUp + es.dDn) * .5), .02, .9);
      const nb = Math.min(8, Math.max(H.eye.browSpines, HS.spineRows.brow));
      for (let k = 0; k < nb * spineCount; k++) { const a = lerp(.35, Math.PI - .35, (k + .5) / nb), u = uE + rU * 1.3 * Math.cos(a), sv = clamp(ev + evh * 1.25 * Math.sin(a), -.95, .95), th = Math.asin(sv), fm = frame(u, th, side, H0 * .5);
        const dir = fm.N.clone().multiplyScalar(.8).addScaledVector(fm.Tu, .45).addScaledVector(fm.Tt, .25).normalize(); addSpine(bs, fm.P, dir, headLen * HS.spineLen * .55 * rng.range(.5, 1), headLen * .008 * HS.spineBase, HS.spineCurve * .3, 3, 0, sg, 0, 5); }
      const nt = Math.max(HS.tassels, H.eye.tentacles) * spineCount * (detail > .6 ? 1 : .5);
      for (let k = 0; k < nt; k++) { const zone = k % 3, u = zone === 0 ? uE + rU * rng.range(-1, 1) : zone === 1 ? lerp(bm.jawStartU || .01, lm.mouthCorner, rng.next()) : rng.range(.01, uE * .8), th = zone === 0 ? Math.asin(clamp(ev + evh * 1.4, -.9, .9)) : zone === 1 ? -1.3 : .7, fm = frame(u, th, side, H0 * .3);
        const dir = fm.N.clone().multiplyScalar(.5).addScaledVector(fm.Tu, .6).addScaledVector(fm.Tt, zone === 1 ? -.5 : .5).normalize(); addSpine(bs, fm.P, dir, headLen * rng.range(.025, .07), headLen * .008, rng.range(-.25, .25), 15, 0, sg, 1, 5); }
    }
    if (b.n) parts['hspinesHinged' + side] = addMesh(b, 'opercleSpines_' + (side > 0 ? 'R' : 'L'));
    if (bs.n) parts['hspines' + side] = addMesh(bs, 'headSpines_' + (side > 0 ? 'R' : 'L'));
  }

  /* ───────── gill chamber (visible when the cover is open) ───────── */
  const nA = G.arches, filTotal = Math.max(24, Math.round(G.filaments * detail * GP.filMul)), rakTotal = Math.max(4, Math.round((GP.rakerCount != null ? GP.rakerCount : G.rakers) * detail));
  const archR = .028 * headLen * (.8 + .4 * rngG.next());
  for (const side of [1, -1]) {
    const sg = sideSgn[side];
    /* cavity basin over the whole footprint: dark red, rim lighter, dark roof and floor */
    { const b = new GB(), NSb = 14, NRb = 22, Pt = V3(0, 0, 0), idx = [];
      for (let i = 0; i <= NSb; i++) for (let j = 0; j <= NRb; j++) { const f = i / NSb, w = j / NRb, th = lerp(.74, -1.0, w), u = lerp(front(th) + h * .004, edge(th) - h * .002, f), rimK = sstep(0, .1, f) * sstep(0, .1, 1 - f) * sstep(0, .08, w) * sstep(0, .08, 1 - w);
        surf(u, th, side, .0009 + .001 * rimK, Pt); const depth = Math.pow(rimK, .8) * (.35 + .65 * Math.sin(Math.PI * w) ** .6), aoK = lerp(1, .3, sstep(.55, 1, f)) * lerp(.35, 1, sstep(0, .25, Math.sin(Math.PI * w)));
        idx.push(b.v(Pt, f * 3, w * 3, 0, sg, 0, 0, 13, depth, aoK, 0)); }
      for (let i = 0; i < NSb; i++) for (let j = 0; j < NRb; j++) { const a = idx[i * (NRb + 1) + j]; b.quad(a, a + 1, a + NRb + 1, a + NRb + 2); }
      parts['basin' + side] = addMesh(b, 'gillCavity_' + (side > 0 ? 'R' : 'L')); }

    const fil = new GB(), arch = new GB(), rak = new GB(), pseudo = new GB();
    const filament = (b, base, d, Tdir, len, wdt, kind, rr, tipW) => {   /* round 7 WP4: plump elliptical ribbon, 5 rings × 6 verts — NOT a flat blade.
        Width follows an elliptical length profile (swells to mid-length, rounds off at the tip); the section is a true ellipse ~0.38 as thick as wide,
        so the comb reads as soft tissue; lamellae striation is in the shader (kind 10). */
      const nf = new THREE.Vector3().crossVectors(d, Tdir).normalize(), ids = [], Pt = V3(0, 0, 0), NSf = 6;
      for (let k = 0; k <= 4; k++) { const t = k / 4, c = base.clone().addScaledVector(d, len * t).addScaledVector(nf, -len * .12 * t * t),
          prof = .45 + .55 * Math.pow(Math.sin(Math.PI * (.10 + .85 * t)), .9), w2 = wdt * prof * (k === 4 ? .15 : 1), th2 = wdt * .38 * (1 - .35 * t) * (k === 4 ? .15 : 1);
        for (let s = 0; s < NSf; s++) { const a = s / NSf * Math.PI * 2; Pt.copy(c).addScaledVector(Tdir, Math.cos(a) * w2 * .5).addScaledVector(nf, Math.sin(a) * th2 * .5); ids.push(b.v(Pt, t, 0, 0, sg, 0, t * t, kind, t, rr, 0)); } }
      for (let k = 0; k < 4; k++) for (let s = 0; s < NSf; s++) { const a = ids[k * NSf + s], a2 = ids[k * NSf + (s + 1) % NSf], c = ids[(k + 1) * NSf + s], c2 = ids[(k + 1) * NSf + (s + 1) % NSf]; b.quad(a, a2, c, c2); }
    };
    const NC = 40, nAr = nA;
    for (let k = 0; k < nAr; k++) {
      const pk = lerp(.16, .78, nAr > 1 ? k / (nAr - 1) : .4), thTop = .55 - k * .06, thBot = -.92 + k * .07 + (k === 0 ? 0 : 0);
      const cur = []; let Larch = 0;
      for (let c = 0; c <= NC; c++) { const t = c / NC, th = lerp(thTop, thBot, t), u = lerp(front(th), edge(th), pk) - Math.sin(Math.PI * t) * h * .01, r = archR * (.35 + .65 * Math.pow(Math.sin(Math.PI * t), .4)), fm = frame(u, th, side, r * 1.15 / maxD + .0012);
        fm.r = r; cur.push(fm); if (c) Larch += cur[c].P.distanceTo(cur[c - 1].P); }
      // arch tube
      const ids = []; const NSd = 8, Pt = V3(0, 0, 0);
      for (let c = 0; c <= NC; c++) { const fm = cur[c], Tcur = (cur[Math.min(NC, c + 1)].P.clone().sub(cur[Math.max(0, c - 1)].P)).normalize(), Bn = new THREE.Vector3().crossVectors(Tcur, fm.N).normalize(), Nn = new THREE.Vector3().crossVectors(Bn, Tcur).normalize();
        for (let s = 0; s < NSd; s++) { const a = s / NSd * Math.PI * 2; Pt.copy(fm.P).addScaledVector(Nn, Math.cos(a) * fm.r).addScaledVector(Bn, Math.sin(a) * fm.r * .85); ids.push(arch.v(Pt, c / NC, s / NSd, 0, sg, 0, 0, 11, c / NC, s / NSd * 6 + k, 0)); } }
      for (let c = 0; c < NC; c++) for (let s = 0; s < NSd; s++) { const a = ids[c * NSd + s], a2 = ids[c * NSd + (s + 1) % NSd], d = ids[(c + 1) * NSd + s], d2 = ids[(c + 1) * NSd + (s + 1) % NSd]; arch.quad(a, a2, d, d2); }
      // filaments: two comb rows on the rear edge; longest on the outer (first) arch, shorter toward the inner arches and the arch ends
      const rowN = Math.max(8, Math.round(filTotal / 2)), pitch = Larch / rowN, spacing = (lerp(.16, .78, 1) - lerp(.16, .78, 0)) / Math.max(1, nAr - 1) * (edge(0) - front(0)) * L, filL0 = Math.max(spacing, headLen * .07) * 1.4 * G.filLen * GP.filLenMul * (1 - .2 * k);
      for (let row = 0; row < 2; row++) for (let i = 0; i < rowN; i++) {
        const t = (i + .5 + row * .5) / rowN, ci = t * NC, c0 = Math.min(NC - 1, Math.floor(ci)), fr_ = ci - c0, A = cur[c0], B = cur[c0 + 1];
        const pos = A.P.clone().lerp(B.P, fr_), Tt = A.Tt.clone().lerp(B.Tt, fr_).normalize(), N = A.N.clone().lerp(B.N, fr_).normalize(), Tu = A.Tu.clone().lerp(B.Tu, fr_).normalize();
        const taper = Math.pow(Math.sin(Math.PI * Math.min(.98, Math.max(.02, t))), .55), len = filL0 * (.3 + .7 * taper) * (.92 + .16 * rngG.next());
        const out = .05 + .10 * rngG.next(), splay = (row ? 1 : -1) * (.24 + .08 * rngG.next());   /* R3: lean backward in a narrow V, hug the chamber floor */
        let d = Tu.clone().multiplyScalar(Math.cos(out)).addScaledVector(N, Math.sin(out)); d.addScaledVector(Tt, Math.sin(splay) * .9).normalize();
        const base = pos.clone().addScaledVector(Tu, cur[c0].r * .8);
        filament(fil, base, d, Tt, len, Math.max(pitch * 1.6, len * .11), 10, rngG.next(), 1);   /* leaf-shaped blades (~9:1) that overlap into a continuous comb */
      }
      // rakers on the front edge: short pale spiky bone
      const nR = Math.max(4, Math.round(rakTotal * (k === 0 ? 1 : .8)));
      for (let i = 0; i < nR; i++) { const t = (i + .5) / nR, ci = t * NC, c0 = Math.min(NC - 1, Math.floor(ci)), A = cur[c0], B = cur[c0 + 1], fr_ = ci - c0;
        const pos = A.P.clone().lerp(B.P, fr_), N = A.N.clone().lerp(B.N, fr_).normalize(), Tu = A.Tu.clone().lerp(B.Tu, fr_).normalize(), Tt = A.Tt.clone().lerp(B.Tt, fr_).normalize();
        const mid = Math.sin(Math.PI * t), len = archR * (.6 + 1.5 * G.rakerLen * GP.rakerLenMul * Math.pow(mid, .7)) * (.8 + .4 * rngG.next());
        const d = Tu.clone().multiplyScalar(-.7).addScaledVector(N, .55).addScaledVector(Tt, -.25).normalize(); addSpine(rak, pos.clone().addScaledVector(Tu, -A.r * .7), d, len, archR * .26 * GP.rakerRadMul, .1, 12, 0, sg, 0, 5, Tt); }
    }
    // pseudobranch: small red comb at the roof of the chamber, under the top of the cover
    { const n = Math.max(6, Math.round(G.pseudo * detail)), th = .62, row = [];
      for (let c = 0; c <= 12; c++) { const t = c / 12, u = lerp(front(th) + h * .02, lerp(front(th), edge(th), .55), t); row.push(frame(u, th, side, archR * .6 / maxD + .0012)); }
      for (let i = 0; i < n; i++) { const t = (i + .5) / n, ci = t * 12, c0 = Math.min(11, Math.floor(ci)), A = row[c0], B = row[c0 + 1], fr_ = ci - c0, pos = A.P.clone().lerp(B.P, fr_), N = A.N.clone().lerp(B.N, fr_).normalize(), Tt = A.Tt.clone().lerp(B.Tt, fr_).normalize(), Tu = A.Tu.clone().lerp(B.Tu, fr_).normalize();
        const d = Tt.clone().multiplyScalar(-.55).addScaledVector(N, .55).addScaledVector(Tu, .35).normalize(), len = archR * (2.2 + rngG.next() * .8) * (.6 + .4 * Math.sin(Math.PI * t));
        filament(pseudo, pos, d, Tu, len, Math.max(len * .14, archR * .3), 14, rngG.next(), 1); } }
    parts['filaments' + side] = addMesh(fil, 'gillFilaments_' + (side > 0 ? 'R' : 'L'));
    parts['arches' + side] = addMesh(arch, 'gillArches_' + (side > 0 ? 'R' : 'L'));
    if (rak.n) parts['rakers' + side] = addMesh(rak, 'gillRakers_' + (side > 0 ? 'R' : 'L'));
    parts['pseudo' + side] = addMesh(pseudo, 'pseudobranch_' + (side > 0 ? 'R' : 'L'));
  }
  group.traverse(m => { if (m.isMesh) tris += m.geometry.index.count / 3; });
  const api = {
    group, material, parts, tris: Math.round(tris), geos, uniforms: U, texture: tex, buildOrbit,
    gillPlan: GP, gillSignature: GP.signature(G, filTotal, rakTotal),   /* round 7 WP4: exposed for the validate7 census */
    /** open: 0 closed · .3 slightly · 1 fully (35°) · >1 macro display override */
    setOpen(v) { U.uOpOpen.value = v * MAX_OPEN_DEG * Math.PI / 180; },
    getOpen() { return U.uOpOpen.value / (MAX_OPEN_DEG * Math.PI / 180); },
    setBreathing(on) { U.uOpBreathOn.value = on ? 1 : 0; },
    dispose() { geos.forEach(x => x.dispose()); material.dispose(); },
  };
  return api;
}
