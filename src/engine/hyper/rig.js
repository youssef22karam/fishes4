/* STUDIO RIG + QUALITY CHECKS + "Hyper" UI panel.
 *
 *  rig.shot(view)            → PNG data-URL of the live fish from a named camera (full / head34 / mouthOpen / gillOpen / eye / scales / fins / belly)
 *  rig.captureAll()          → all views + a 12-frame turntable, shown in a gallery overlay
 *  rig.contactSheet(n)       → renders n seeds into one sheet and validates each fish (default 100)
 *  rig.validate(fish)        → automatic checks (see below); rig.findValidSeed(prefix) re-rolls until a seed passes
 *  rig.stress(n)             → instanced population test (default 10,000 fish) with fps readout
 * Automatic validation: parameter ranges + constraint rules (genome.js), NaN vertices, normal flips, UV-island overlap of the cover pieces,
 * cover aligned with the gill region, gill chamber inside the head, engine coherence audit (eye outside head, mouth, teeth…), flat-colour check on pixels. */
import { auditCoherence } from '../coherence.js';
import { HYPER_TEX, textureCacheSize } from './textures.js';

const css = `
#hyperPanel{position:fixed;right:12px;bottom:calc(70px + env(safe-area-inset-bottom,0px));width:340px;max-height:calc(100vh - 150px);overflow:auto;z-index:8;background:rgba(8,18,28,.92);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:10px 12px;backdrop-filter:blur(12px);font-size:12px}
#hyperPanel.hidden,#hyperOverlay.hidden{display:none}
#hyperPanel h4{margin:8px 0 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8fa6b5;font-weight:700}
#hyperPanel .hrow{display:flex;gap:6px;align-items:center;margin:3px 0;flex-wrap:wrap}
#hyperPanel .hrow label{flex:1 1 90px;color:#8fa6b5}
#hyperPanel .hrow input[type=range]{flex:2 1 120px;padding:0;min-height:22px;background:none;border:0}
#hyperPanel button,#hyperPanel select,#hyperPanel input[type=text]{min-height:28px;padding:3px 8px;font-size:12px}
#hyperPanel .bar2{height:6px;border-radius:3px;background:#2dd4bf;margin:2px 0}
#hyperPanel pre{white-space:pre-wrap;color:#cfe;font-size:11px;margin:4px 0}
#hyperOverlay{position:fixed;inset:0;z-index:20;background:rgba(3,8,14,.94);overflow:auto;padding:16px}
#hyperOverlay .grid{display:flex;flex-wrap:wrap;gap:8px}
#hyperOverlay figure{margin:0;width:300px;color:#8fa6b5;font-size:11px}
#hyperOverlay img,#hyperOverlay canvas{max-width:100%;border-radius:6px;display:block}
`;
const bgColor = 0x141c26;

export function installRig(FG, C) {
  // The rig is browser UI (panels, overlays, capture buttons). Headless
  // harnesses (tools/headless.mjs) stub document without querySelector;
  // there is nothing to install into, so leave an empty rig and return.
  if (typeof document === 'undefined' || typeof document.querySelector !== 'function') { FG.hyperRig = {}; return; }
  const { THREE, App, HYP } = C, rig = FG.hyperRig = {};
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const yieldUI = () => new Promise(r => setTimeout(r, 0));
  const lmOf = fish => { const m = {}; for (const l of fish.info.landmarks3D) m[l.name] = l; return m; };

  /* ───────── studio rig ───────── */
  rig.studio = () => { if (App.mode !== 'studio') { App.mode = 'studio'; C.applyMode(); } };   // soft key + fill + rim from the probe, dark navy backdrop

  /* ───────── camera views ───────── */
  function viewFor(name, fish, extra = {}) {
    const g = App.genome, L = fish.bm.L, hl = L * g.head.lengthFrac, lm = lmOf(fish), bb = fish.info.bounds, cam = C.camera, aspect = cam.aspect || 1.6, tf = Math.tan(cam.fov * Math.PI / 360);
    const size = bb.getSize(new THREE.Vector3()), ctr = bb.getCenter(new THREE.Vector3());
    const snout = lm.snout || { x: bb.max.x, y: ctr.y, z: 0 }, eye = lm.eye || snout, op = lm.operculum || eye, pre = lm.preopercle || op, mc = lm.mouthCorner || snout;
    const hc = { x: (snout.x + op.x) / 2, y: eye.y - hl * .08, z: 0 };
    const flat = Math.abs(g.body.roll) > 45;                     // flattened plans lie on their side: use the vertical axis for the long views
    switch (name) {
      case 'full': { const d = Math.max(size.x / (2 * tf * aspect), size.y / (2 * tf)) * 1.2 + size.z * .5; return { pos: [ctr.x, ctr.y, ctr.z + d], tgt: [ctr.x, ctr.y, ctr.z] }; }
      case 'headSide': return { pos: [hc.x - hl * .05, hc.y + hl * .04, hl * 1.75], tgt: [hc.x - hl * .05, hc.y, 0] };
      case 'head34': return { pos: [hc.x + hl * .85, hc.y + hl * .3, hl * 1.55], tgt: [hc.x, hc.y, 0] };
      case 'mouthOpen': { const m = { x: (snout.x + mc.x) / 2, y: (snout.y + mc.y) / 2 }; return { pos: [m.x + hl * .9, m.y + hl * .05, hl * 1.4], tgt: [m.x, m.y, 0], jaw: 1 }; }
      case 'gillOpen': return { pos: [op.x - hl * .25, op.y + hl * .12, hl * 1.45], tgt: [(op.x + pre.x) / 2 - hl * .05, op.y - hl * .05, 0], open: 2.4 };   // macro display override: cover swung ~84° so the chamber shows in profile
      case 'eye': return { pos: [eye.x + hl * .1, eye.y + hl * .02, hl * .5], tgt: [eye.x, eye.y, 0] };
      case 'scales': return { pos: [ctr.x - L * .05, ctr.y + size.y * .1, L * .17], tgt: [ctr.x - L * .05, ctr.y + size.y * .1, 0] };
      case 'fins': { const tail = { x: bb.min.x + L * .12, y: ctr.y }; return { pos: [tail.x - L * .1, tail.y, L * .55], tgt: [tail.x, tail.y, 0], fin: 'power' }; }
      case 'belly': return { pos: [ctr.x, ctr.y - Math.max(size.y, L * .25) * 1.4 - L * .3, L * .12], tgt: [ctr.x, ctr.y, 0] };
      case 'turn': { const a = extra.angle || 0, d = Math.max(size.x / (2 * tf * aspect), size.y / (2 * tf)) * 1.2 + size.z * .5; return { pos: [ctr.x + Math.sin(a) * d, ctr.y + d * .08, ctr.z + Math.cos(a) * d], tgt: [ctr.x, ctr.y, ctr.z] }; }
    } void flat; return viewFor('full', fish);
  }
  rig.views = ['full', 'headSide', 'head34', 'mouthOpen', 'gillOpen', 'eye', 'scales', 'fins', 'belly'];
  function place(view, extra) {
    const fish = App.fish, v = viewFor(view, fish, extra); rig.studio();
    window.__fgRest = true; window.__fgJaw = v.jaw != null ? v.jaw : 0; window.__fgFin = v.fin || null;
    const hs = fish.parts.hyper; let prev = null;
    if (hs) { prev = hs.getOpen(); hs.setBreathing(false); if (v.open != null) hs.setOpen(v.open); else if (HYP.open != null) hs.setOpen(HYP.open); }
    FG.shoot.look(v.pos, v.tgt); C.camera.near = Math.max(1e-4, fish.bm.L * .002); C.camera.updateProjectionMatrix();
    return () => { if (hs) { hs.setOpen(prev); hs.setBreathing(true); } window.__fgRest = false; window.__fgJaw = null; window.__fgFin = null; };
  }
  rig.goto = view => { place(view); };      // leaves the camera there (rest pose) — the panel buttons use this
  rig.shot = (view, extra, type = 'image/png') => { const restore = place(view, extra); C.renderer.render(C.scene, C.camera); const url = C.renderer.domElement.toDataURL(type, .92); restore(); return url; };

  /* ───────── validation ───────── */
  function uvIslandOverlap(hs) {
    const boxes = [];
    for (const k of ['operculumR', 'suboperculumR', 'interoperculumR', 'preoperculum1']) { const m = hs.parts[k]; if (!m) continue; const uv = m.geometry.attributes.uv; const b = [9, 9, -9, -9]; for (let i = 0; i < uv.count; i++) { b[0] = Math.min(b[0], uv.getX(i)); b[1] = Math.min(b[1], uv.getY(i)); b[2] = Math.max(b[2], uv.getX(i)); b[3] = Math.max(b[3], uv.getY(i)); } boxes.push([k, b]); }
    let n = 0; for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i][1], b = boxes[j][1]; if (a[0] < b[2] - 1e-4 && b[0] < a[2] - 1e-4 && a[1] < b[3] - 1e-4 && b[1] < a[3] - 1e-4) n++; } return n;
  }
  rig.validate = function (fish, g = App.genome) {
    const issues = [], H = fish.parts.hyperGenome, hs = fish.parts.hyper, bm = fish.bm;
    if (H) for (const i of H.issues) issues.push('PARAM:' + (i.code || '') + (i.path ? ':' + i.path : ''));
    fish.group.traverse(o => { if (!o.isMesh || !o.geometry.attributes.position) return; const p = o.geometry.attributes.position.array; for (let i = 0; i < p.length; i += 97) if (!Number.isFinite(p[i])) { issues.push('NAN:' + (o.name || 'mesh')); return; } });
    if (hs) {
      let flips = 0, tot = 0;
      for (const k of ['operculumR', 'operculumL', 'gillFilaments', 'arches1', 'arches-1']) { const m = hs.parts[k]; if (!m) continue; const ge = m.geometry, idx = ge.index.array, P = ge.attributes.position.array, N = ge.attributes.normal.array; for (let t = 0; t < idx.length; t += 3 * 7) { const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3; const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2]; const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx, fl = Math.hypot(fx, fy, fz); if (fl < 1e-14) continue; const d = (fx * (N[a] + N[b] + N[c]) + fy * (N[a + 1] + N[b + 1] + N[c + 1]) + fz * (N[a + 2] + N[b + 2] + N[c + 2])) / fl; tot++; if (d < 0) flips++; } }
      if (tot && flips / tot > .08) issues.push('NORMAL_FLIP:' + (flips / tot).toFixed(2));
      if (uvIslandOverlap(hs)) issues.push('UV_OVERLAP');
      // cover aligned with the gill region: operculum bbox centre must sit between the preopercle and the operculum landmarks
      const L = bm.L, xPre = bm.headX - bm.lm.preopercle * L, xOp = bm.headX - bm.lm.operculum * L, bx = new THREE.Box3().setFromObject(hs.parts.operculumR || hs.parts.operculumL), cx = (bx.min.x + bx.max.x) / 2;
      if (cx > xPre + .15 * L * bm.h || cx < xOp - .15 * L * bm.h) issues.push('COVER_MISALIGNED');
      // gill chamber inside the head: filaments/arches within the body bbox (with the opened cover + filament length allowance)
      const bb = new THREE.Box3(); for (const m of [hs.parts.filaments1, hs.parts.arches1, hs.parts.filaments1]) if (m) bb.expandByObject(m);
      const body = new THREE.Box3().setFromObject(fish.parts.body); body.expandByScalar(bm.L * bm.h * .25); if (!bb.isEmpty() && !(body.containsBox(bb))) issues.push('GILL_OUTSIDE_HEAD');
    }
    /* R3: audits must run on the fish AT REST — the live fish is yawed / translated by the swim animation, which made the ray-cast eye check fail on every
       live fish while freshly built ones passed. Restore the transform afterwards. */
    const gr = fish.group, keep = { p: gr.position.clone(), r: gr.rotation.clone() }; gr.position.set(0, 0, 0); gr.rotation.set(0, 0, 0); gr.updateMatrixWorld(true);
    try { const v = auditCoherence(fish, THREE); for (const x of v) issues.push('COH:' + x.code); } catch (e) { issues.push('AUDIT_ERR'); }
    try {
      /* WP9 size / anatomy ratios (global, measured on the built body) */
      const sc = {}, mx = { d: 0 }; let pedMin = 1e9; for (let i = 0; i <= 60; i++) { const u = i / 60; bm.section(u, sc); const d = (sc.dUp + sc.dDn); if (d > mx.d) mx.d = d; if (u > .7 && u < .985 && d < pedMin) pedMin = d; }
      const ped = pedMin / Math.max(1e-9, mx.d); if (!(ped >= .035)) issues.push('PEDUNCLE_THIN:' + ped.toFixed(3));
      const hlf = g.head.lengthFrac; if (!(hlf >= .08 && hlf <= .45)) issues.push('HEAD_RATIO:' + (+hlf).toFixed(2));
      const eng = C.checkFishGeometry(fish); if (eng && eng.maxRootError > .005 * bm.L) issues.push('FIN_DETACHED:' + eng.maxRootError.toFixed(4));   /* fin-root vertices must lie within 0.5 % of body length of the body surface */
    } catch (e) { issues.push('RATIO_ERR:' + String(e.message).slice(0, 40)); }
    finally { gr.position.copy(keep.p); gr.rotation.copy(keep.r); gr.updateMatrixWorld(true); }
    return [...new Set(issues)];
  };
  rig.engineAudit = fish => C.checkFishGeometry(fish);   // the engine's own geometry / anatomy audit (also used by the Tests tab)
  rig.findValidSeed = function (prefix = 'V', max = 30) {
    for (let i = 0; i < max; i++) { const seed = prefix + i, g = FG.proc.fromSeed(seed).genome, f = C.buildFish(JSON.parse(JSON.stringify(g)), { quality: 'hero' }); const r = rig.validate(f, g); f.dispose(); if (!r.length) return { seed, tries: i + 1 }; }
    return null;
  };

  /* ───────── contact sheet ───────── */
  rig.contactSheet = async function (n = 100, o = {}) {
    const cols = o.cols || 10, cw = o.cw || 190, ch = o.ch || 120, rows = Math.ceil(n / cols), prefix = o.prefix || 'CS';
    const sheet = document.createElement('canvas'); sheet.width = cols * cw; sheet.height = rows * ch; const sx = sheet.getContext('2d'); sx.fillStyle = '#10161e'; sx.fillRect(0, 0, sheet.width, sheet.height);
    const keep = { g: App.genome && JSON.parse(JSON.stringify(App.genome)), bg: C.scene.background, fog: C.scene.fog }, cv = C.renderer.domElement, report = [], flatTest = document.createElement('canvas'); flatTest.width = 96; flatTest.height = 60; const fx = flatTest.getContext('2d', { willReadFrequently: true });
    rig.studio(); const hold = App.paused; App.paused = true;
    for (let i = 0; i < n; i++) {
      const seed = prefix + i; let rec = { seed };
      try {
        const gen = FG.proc.fromSeed(seed), g = JSON.parse(JSON.stringify(gen.genome)); g.meta.edited = false; C.setFish(g, { noHistory: true, skipPanel: true });
        const fish = App.fish; window.__fgRest = true; window.__fgJaw = 0; if (fish.parts.hyper) fish.parts.hyper.setBreathing(false);
        const v = viewFor('full', fish); FG.shoot.look(v.pos, v.tgt); C.renderer.render(C.scene, C.camera);
        const x = (i % cols) * cw, y = Math.floor(i / cols) * ch; sx.drawImage(cv, 0, 0, cv.width, cv.height, x, y, cw, ch);
        fx.drawImage(cv, 0, 0, 96, 60); const px = fx.getImageData(0, 0, 96, 60).data; let s1 = 0, s2 = 0, nn = 0, r0 = px[0], g0 = px[1], b0 = px[2]; for (let k = 0; k < px.length; k += 4) { if (Math.abs(px[k] - r0) + Math.abs(px[k + 1] - g0) + Math.abs(px[k + 2] - b0) < 40) continue; const l = px[k] * .3 + px[k + 1] * .59 + px[k + 2] * .11; s1 += l; s2 += l * l; nn++; }
        const sd = nn > 30 ? Math.sqrt(Math.max(0, s2 / nn - (s1 / nn) ** 2)) : 99; const issues = rig.validate(fish, g); if (sd < 5) issues.push('FLAT_COLOR:' + sd.toFixed(1));
        const H = fish.parts.hyperGenome; rec = { seed, name: g.meta.name || '', arch: H ? H.archetype.dominant : '-', variant: H ? H.oper.variant : '-', palette: H ? H.palette.id : '-', rerolls: H ? H.rerolls : 0, tris: fish.info.tris, issues };
        sx.fillStyle = issues.length ? 'rgba(255,60,60,.9)' : 'rgba(45,212,191,.9)'; sx.font = '10px sans-serif'; sx.fillText(seed + ' ' + rec.arch, x + 4, y + 11); if (issues.length) sx.fillText(issues.slice(0, 2).join(' '), x + 4, y + ch - 5);
      } catch (e) { rec.issues = ['EXCEPTION:' + String(e.message || e).slice(0, 80)]; }
      report.push(rec); if (o.progress) o.progress(i + 1, n); if (i % 3 === 2) await yieldUI();
    }
    App.paused = hold; window.__fgRest = false; window.__fgJaw = null; C.scene.background = keep.bg; C.scene.fog = keep.fog;
    if (keep.g) C.setFish(keep.g, { noHistory: true, skipPanel: true });
    const bad = report.filter(r => r.issues.length), counts = {}; for (const r of report) for (const i of r.issues) { const k = i.split(':')[0]; counts[k] = (counts[k] || 0) + 1; }
    const arch = {}; for (const r of report) arch[r.arch] = (arch[r.arch] || 0) + 1;
    rig.lastSheet = { canvas: sheet, report, summary: { n, pass: n - bad.length, fail: bad.length, counts, arch, rerolled: report.filter(r => r.rerolls).length } };
    return rig.lastSheet;
  };

  /* ───────── 10,000-fish instancing stress test (shared cached base meshes × instances) ───────── */
  let stressGroup = null;
  rig.stressStop = () => { if (!stressGroup) return; C.scene.remove(stressGroup.group); stressGroup.fishes.forEach(f => f.dispose()); stressGroup = null; };
  rig.stress = async function (count = 10000, kinds = 12) {
    rig.stressStop(); const group = new THREE.Group(), fishes = [], per = Math.ceil(count / kinds), dummy = new THREE.Object3D(), meshes = []; let tris = 0, n = 0; const t0 = performance.now();
    for (let k = 0; k < kinds && n < count; k++) {
      const m = Math.min(per, count - n), g = JSON.parse(JSON.stringify(FG.proc.fromSeed('ST' + k).genome)), f = C.buildFish(g, { quality: 'lod', instanced: m }); fishes.push(f);
      const L = g.body.length, ph = new Float32Array(m), R = 40, scale = 1 / L * .6;   // normalise every kind to ~0.6 units long
      for (let i = 0; i < m; i++) { ph[i] = Math.random(); dummy.position.set((Math.random() - .5) * R * 2, (Math.random() - .5) * R * .5, (Math.random() - .5) * R * 2); dummy.rotation.set(0, Math.random() * 6.283, 0); dummy.scale.setScalar(scale * (.7 + Math.random() * .6)); dummy.updateMatrix(); f.group.children.forEach(c => { if (c.isInstancedMesh) c.setMatrixAt(i, dummy.matrix); }); }
      f.group.children.forEach(c => { if (c.isInstancedMesh) { c.geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(ph, 1)); c.instanceMatrix.needsUpdate = true; c.count = m; meshes.push(c); } });
      f.group.rotation.x = 0; f.uniforms.uAmp.value = g.swim.amp; group.add(f.group); tris += f.info.tris * m; n += m; if (k % 2) await yieldUI();
    }
    C.scene.add(group); stressGroup = { group, fishes };
    App.paused = false; const saveCam = C.camera.position.clone(), saveT = C.controls.target.clone(); C.camera.far = 5000; C.camera.updateProjectionMatrix(); FG.shoot.look([0, 20, 70], [0, 0, 0]);
    const fps = await new Promise(res => { let fr = 0, t = performance.now(); const tick = () => { fr++; fishes.forEach(f => { f.uniforms.uCycle.value += .016 * f.bm.g.swim.freq; }); if (performance.now() - t > 2500) res(fr / ((performance.now() - t) / 1000)); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
    const out = { fish: n, kinds: fishes.length, drawCalls: meshes.length, trisTotal: Math.round(tris), buildMs: Math.round(performance.now() - t0), fps: +fps.toFixed(1), note: 'LOD2/3 shared base meshes, per-instance matrix + phase; head/gill/teeth detail only on LOD0-1 (nearest fish)' };
    rig.lastStress = out; void saveCam; void saveT; return out;
  };

  /* ───────── UI ───────── */
  const nav = document.querySelector('.bar.bottom');
  const panel = document.createElement('div'); panel.id = 'hyperPanel'; panel.className = 'hidden';
  const overlay = document.createElement('div'); overlay.id = 'hyperOverlay'; overlay.className = 'hidden'; document.body.append(panel, overlay);
  const rebuild = () => { if (App.genome) C.setFish(App.genome, { keepCamera: true, noHistory: true, skipPanel: true }); refresh(); };
  const showOverlay = (title, nodes) => { overlay.innerHTML = ''; const h = document.createElement('div'); h.style.cssText = 'display:flex;gap:10px;align-items:center;margin-bottom:10px;color:#e6f0f5'; h.innerHTML = '<b style="font-size:16px">' + title + '</b>'; const x = document.createElement('button'); x.textContent = 'Close'; x.onclick = () => overlay.classList.add('hidden'); h.appendChild(x); overlay.appendChild(h); nodes.forEach(n => overlay.appendChild(n)); overlay.classList.remove('hidden'); };
  const fig = (url, cap) => { const f = document.createElement('figure'); const i = new Image(); i.src = url; const a = document.createElement('a'); a.href = url; a.download = cap + '.png'; a.appendChild(i); f.appendChild(a); const c = document.createElement('figcaption'); c.textContent = cap; f.appendChild(c); return f; };
  rig.captureAll = async function () {
    const grid = document.createElement('div'); grid.className = 'grid'; const seed = App.genome.meta.seed;
    for (const v of rig.views) { grid.appendChild(fig(rig.shot(v), seed + ' · ' + v)); await yieldUI(); }
    for (let i = 0; i < 12; i++) { grid.appendChild(fig(rig.shot('turn', { angle: i / 12 * Math.PI * 2 }), seed + ' · turntable ' + (i * 30) + '°')); if (i % 3 == 2) await yieldUI(); }
    showOverlay('Captures — ' + seed + ' (click to download)', [grid]);
  };
  const SUBS = ['body', 'head', 'mouth', 'eye', 'gill', 'oper', 'dorsal', 'pectoral', 'caudal', 'scales', 'wear', 'palette', 'pat0', 'pat2', 'pat4', 'pat6'];
  function refresh() {
    const fish = App.fish, H = fish && fish.parts.hyperGenome, hs = fish && fish.parts.hyper;
    const w = H ? H.archetype.weights : [], names = C.HG.DOMINANT_NAMES;
    const bars = names.map((n, i) => '<div style="display:flex;gap:6px;align-items:center"><span style="width:70px;color:#8fa6b5">' + n + '</span><div class="bar2" style="width:' + Math.round((w[i] || 0) * 190) + 'px"></div><span>' + ((w[i] || 0) * 100).toFixed(0) + '%</span></div>').join('');
    const info = H ? 'archetype ' + H.archetype.dominant + ' · palette ' + H.palette.id + ' · cover ' + H.oper.variant + ' · head ' + H.head.surface + ' · iris ' + H.palette.irisHue.toFixed(0) + '°\nlateral ' + H.lateral.path + ' · ' + H.lateral.pores + ' pores · scutes ' + H.scutes.count + ' · wear ' + H.wear.amount.toFixed(2) + ' (' + H.wear.age + ') · rerolls ' + H.rerolls + (H.issues.length ? '\nISSUES ' + H.issues.map(i => i.code).join(',') : '') + (hs ? '\ntris ' + fish.info.tris.toLocaleString() + ' (head system ' + hs.tris.toLocaleString() + ') · texcache ' + textureCacheSize() : '') : 'hyper off / no cover on this plan';
    const sel = document.getElementById('hySub');
    panel.querySelector('#hyInfo').innerHTML = '<pre>' + info.replace(/</g, '&lt;') + '</pre>' + bars; if (sel) void sel;
  }
  panel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><b>HyperFish</b><button id="hyClose">×</button></div>
  <h4>Gill cover</h4>
  <div class="hrow"><label>open (1 = 35° max, >1 = macro override)</label><input id="hyOpen" type="range" min="0" max="2.6" step="0.01" value="0.4"><span id="hyOpenV">0.40</span></div>
  <div class="hrow"><label><input id="hyBreath" type="checkbox" checked> breathing cycle</label><label><input id="hyOn" type="checkbox" checked> hyper systems on</label></div>
  <h4>Skin & genome</h4>
  <div class="hrow"><label>wear 0–1</label><input id="hyWear" type="range" min="0" max="1" step="0.01" value="0.2"><span id="hyWearV">auto</span></div>
  <div class="hrow"><label>bake size</label><select id="hyTex"><option>256</option><option selected>512</option><option>1024</option><option>2048</option><option>4096</option></select><button id="hyRoll">Re-roll subsystem</button><select id="hySub">${SUBS.map(s => '<option>' + s + '</option>').join('')}</select></div>
  <h4>Camera / capture</h4>
  <div class="hrow">${rig.views.map(v => '<button data-v="' + v + '">' + v + '</button>').join('')}<button id="hyAll">capture all + turntable</button></div>
  <h4>Quality</h4>
  <div class="hrow"><button id="hySheet">Contact sheet (100)</button><button id="hyStress">Stress 10,000</button><button id="hyOne">Validate this fish</button></div>
  <div id="hyOut"><pre></pre></div><div id="hyInfo"></div>`;
  const $p = s => panel.querySelector(s), out = t => { $p('#hyOut pre').textContent = t; };
  $p('#hyClose').onclick = () => panel.classList.add('hidden');
  $p('#hyOpen').oninput = e => { const v = +e.target.value; HYP.open = v; $p('#hyOpenV').textContent = v.toFixed(2); if (App.fish && App.fish.parts.hyper) App.fish.parts.hyper.setOpen(v); };
  $p('#hyBreath').onchange = e => App.fish && App.fish.parts.hyper && App.fish.parts.hyper.setBreathing(e.target.checked);
  $p('#hyOn').onchange = e => { HYP.on = e.target.checked; rebuild(); };
  $p('#hyWear').onchange = e => { HYP.wear = +e.target.value; $p('#hyWearV').textContent = (+e.target.value).toFixed(2); rebuild(); };
  $p('#hyTex').onchange = e => { HYPER_TEX.size = +e.target.value; HYP.texSize = +e.target.value; rebuild(); };
  $p('#hyRoll').onclick = () => { const k = $p('#hySub').value; HYP.sub[k] = Math.random().toString(36).slice(2, 7); rebuild(); out('re-seeded subsystem "' + k + '" → ' + HYP.sub[k] + ' (all other subsystems unchanged)'); };
  panel.querySelectorAll('[data-v]').forEach(b => b.onclick = () => rig.goto(b.dataset.v));
  $p('#hyAll').onclick = () => { out('capturing…'); rig.captureAll().then(() => out('done')); };
  $p('#hyOne').onclick = () => out('validation: ' + (rig.validate(App.fish).join(', ') || 'PASS'));
  $p('#hySheet').onclick = async () => { out('contact sheet…'); const r = await rig.contactSheet(100, { progress: (i, n) => out('contact sheet ' + i + '/' + n) }); const info = document.createElement('pre'); info.style.cssText = 'color:#cfe'; info.textContent = JSON.stringify(r.summary, null, 1); showOverlay('Contact sheet — 100 seeds', [info, r.canvas]); out('pass ' + r.summary.pass + '/' + r.summary.n); };
  $p('#hyStress').onclick = async () => { out('building 10,000 fish…'); const r = await rig.stress(10000); out(JSON.stringify(r, null, 1)); };
  if (nav) { const b = document.createElement('button'); b.id = 'btnHyper'; b.className = 'primary'; b.textContent = 'Hyper'; b.title = 'HyperFish: gill cover, genome, capture rig, contact sheet'; b.onclick = () => { panel.classList.toggle('hidden'); refresh(); }; nav.insertBefore(b, nav.firstChild); }
  setInterval(() => { if (!panel.classList.contains('hidden')) refresh(); }, 1500);
  void bgColor;
}
