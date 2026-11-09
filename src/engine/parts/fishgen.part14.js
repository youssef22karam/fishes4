      if (this.formation === 'benthic') fy += (this.baseY() - P[ix + 1]) * 2 * sp; if (this.formation === 'hover') { fx += (Math.random() - 0.5) * sp * 2; fy += (Math.random() - 0.5) * sp * 2; }
      V[ix] += fx * dt; V[ix + 1] += fy * dt * 0.6; V[ix + 2] += fz * dt; const vl = Math.hypot(V[ix], V[ix + 1], V[ix + 2]) || 1e-6; const tgt = clamp(vl, sp * 0.5, sp * 1.4); V[ix] *= tgt / vl; V[ix + 1] *= tgt / vl; V[ix + 2] *= tgt / vl; }
    const roll = this.roll; for (let i = 0; i < n; i++) { const ix = i * 3; P[ix] += V[ix] * dt; P[ix + 1] += V[ix + 1] * dt; P[ix + 2] += V[ix + 2] * dt;
      this.dummy.position.set(P[ix], P[ix + 1], P[ix + 2]); this.tmp.set(V[ix], V[ix + 1], V[ix + 2]).normalize(); this.q.setFromUnitVectors(this.fwd, this.tmp); this.dummy.quaternion.copy(this.q); if (roll) this.dummy.rotateX(roll); this.dummy.updateMatrix(); for (const mesh of this.meshes) mesh.setMatrixAt(i, this.dummy.matrix); }
    for (const mesh of this.meshes) mesh.instanceMatrix.needsUpdate = true;
  }
  dispose() { scene.remove(this.group); this.lod.dispose(); }
}
/* ── fish lifecycle ── */
function setFish(genome, opts = {}) {
  const prevL = App.genome ? App.genome.body.length : null;
  const cycle = App.fish ? App.fish.uniforms.uCycle.value : 0;
  const fish = buildFish(genome, { quality: App.tier >= 2 ? 'med' : 'hero' });
  if (App.fish) { scene.remove(App.fish.group); App.fish.dispose(); App.fish = null; } clearHelpers();
  if (genome.meta.godMode === undefined) genome.meta.godMode = GOD.enabled; else GOD.enabled = genome.meta.godMode;
  App.genome = genome; if (!opts.noHistory) { App.history.push(deepClone(genome)); if (App.history.length > 32) App.history.shift(); }
  if (opts.keepCamera) fish.uniforms.uCycle.value = cycle;
  syncSelects(genome);
  App.fish = fish; scene.add(fish.group);
  const hab = HABITATS[genome.meta.habitat] || HABITATS.coralReef;
  if (!App.env || App.env.hab.id !== hab.id || !prevL || Math.abs(Math.log(genome.body.length / prevL)) > 0.5) buildEnvironment(hab, genome.body.length);
  if (App.school) { App.school.dispose(); App.school = null; } if (App.schoolOn) startSchool();
  App.inflateTarget = 0; fish.uniforms.uPupil.value = 1 - hab.light; App.state.nextBurst = ENV.uTime.value + 3 + Math.random() * 6;
  if (!opts.keepCamera) frameCamera(fish); updateHUD(); updateDebugHelpers(); if (!opts.skipPanel) refreshPanels(); updateHash();
}
function frameCamera(fish) {
  const box = fish.info.bounds, c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const r = Math.max(1e-3, size.length() * .5), ray = ['ray', 'benthicShark'].includes(fish.bm.a.family) || Math.abs(fish.bm.g.body.roll) > 45;
  const halfFov = camera.fov * Math.PI / 360;
  const visibleHalf = ray ? Math.max(size.z * .55, size.x * .54 / camera.aspect) : Math.max(size.y * .55, size.x * .54 / camera.aspect);
  const dist = visibleHalf / Math.tan(halfFov) * 1.16 + (ray ? size.y : size.z) * .6;
  camera.near = Math.max(.0001, dist * .003); camera.far = dist * 400 + App.es * 200; camera.updateProjectionMatrix();
  controls.minDistance = r * .25; controls.maxDistance = dist * 6;
  const direction = ray ? new THREE.Vector3(.08, .96, .28) : new THREE.Vector3(.13, .1, 1);
  tweenCamera(c.clone().add(direction.normalize().multiplyScalar(dist)), c);
}
function tweenCamera(to, target) {
  if (reducedMotion) { camera.position.copy(to); controls.target.copy(target); controls.update(); return; }
  App.cameraTween = { from: camera.position.clone(), to, startTarget: controls.target.clone(), target, start: performance.now(), duration: 550 };
  controls.enableDamping = false;
}
function setCameraView(view) {
  if (!App.fish) return;
  const center = App.fish.info.bounds.getCenter(new THREE.Vector3()), size = App.fish.info.bounds.getSize(new THREE.Vector3()), r = Math.max(size.length() * .5, .001), distance = r / Math.sin(camera.fov * Math.PI / 360) * 1.12;
  const bm = App.fish.bm, L = bm.L, lm3 = {}; for (const l of App.fish.info.landmarks3D) lm3[l.name] = l;
  /* law close-ups: framed on the anatomical landmark the law governs (mouth / eye / tail / underside / fin) */
  const headLen = L * (App.genome.head.lengthFrac || .27), V3 = (x, y, z) => new THREE.Vector3(x, y, z), mid = (a, b, w) => a && b ? V3(a.x + (b.x - a.x) * w, a.y + (b.y - a.y) * w, a.z + (b.z - a.z) * w) : a || b;
  const close = { mouth: [mid(lm3.snout, lm3.mouthCorner, .55), V3(1, .1, .75), headLen * 1.25, true], mouthbelow: [mid(lm3.snout, lm3.mouthCorner, .55), V3(.35, -1, .25), headLen * 1.25, true], eye: [lm3.eye, V3(.35, .25, 1), headLen * .9, true], tail: [lm3.caudalBase, V3(-.3, .1, 1), L * .45], fin: [lm3.pectoralBase, V3(.2, -.2, 1), L * .35], below: [null, V3(.03, -1, .02), 1.12] };
  if (close[view]) { const [lmk, d, k] = close[view], tgt = lmk ? new THREE.Vector3(lmk.x, lmk.y, lmk.z) : center; tweenCamera(tgt.clone().addScaledVector(d.normalize(), lmk ? k : distance * k), tgt); return; }
  const dir = view === 'top' ? new THREE.Vector3(.04, 1, .001) : view === 'head' ? new THREE.Vector3(1, .06, .01) : new THREE.Vector3(.02, .05, 1);
  tweenCamera(center.clone().addScaledVector(dir.normalize(), distance), center);
}
function undoFish() {
  clearTimeout(GOD.timer); clearTimeout(editTimer);
  if (Object.values(GOD.axes).some(v => v !== 0) && GOD.baseline) { GOD.axes = {}; setFish(deepClone(GOD.baseline), { noHistory: true, keepCamera: true }); return; }
  if (App.history.length < 2) { toast('No earlier fish in this session.'); return; }
  App.history.pop(); setFish(deepClone(App.history[App.history.length - 1]), { noHistory: true, keepCamera: true }); toast('Previous genome restored.');
}
function startSchool() { if (!App.genome) return; if (App.school) App.school.dispose(); App.school = new School(App.genome, TIERS[App.tier].school, App.es); scene.add(App.school.group); App.schoolOn = true; document.getElementById('btnSchool').classList.add('active'); }
function stopSchool() { if (App.school) { App.school.dispose(); App.school = null; } App.schoolOn = false; document.getElementById('btnSchool').classList.remove('active'); }
function rebuildAll() { if (App.genome) { const g = App.genome; if (App.env) { scene.remove(App.env.group); disposeObject(App.env.group); App.env = null; } setFish(g, { noHistory: true, keepCamera: true }); } }
function clearHelpers() { for (const h of App.helpers) { scene.remove(h); disposeObject(h); } App.helpers = []; }
function updateDebugHelpers() {
  clearHelpers(); const f = App.fish; if (!f) return; const d = App.debug;
  for (const k of ['body', 'jaw', 'fin', 'simple', 'tooth']) f.materials[k].wireframe = d.wire;
  if (d.skeleton) { const pts = []; for (let i = 0; i < f.info.spine.length - 1; i += 4) { const a = f.info.spine[i], b = f.info.spine[Math.min(i + 4, f.info.spine.length - 1)]; pts.push(a.x, a.y, 0, b.x, b.y, 0); } for (const r of f.info.rays) pts.push(...r);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); const ls = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x2dd4bf, depthTest: false, transparent: true, opacity: 0.9 })); ls.rotation.x = f.group.rotation.x; ls.renderOrder = 10; scene.add(ls); App.helpers.push(ls); }
  if (d.landmarks) { const pts = [], cols = []; for (const l of f.info.landmarks3D) { pts.push(l.x, l.y, l.z); const c = new THREE.Color().setHSL(cyrb128(l.name)[0] % 360 / 360, 0.9, 0.6); cols.push(c.r, c.g, c.b); } const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); const p = new THREE.Points(geo, new THREE.PointsMaterial({ size: 12, sizeAttenuation: false, vertexColors: true, depthTest: false })); p.rotation.x = f.group.rotation.x; p.renderOrder = 11; scene.add(p); App.helpers.push(p); }
}
/* ── animation loop ── */
let lastT = performance.now(), frames = 0, fpsAcc = 0, hudTimer = 0;
function animate(now) {
  requestAnimationFrame(animate);
  try {
    const rawDt = Math.max(.0001, (now - lastT) / 1000); lastT = now;
    if (App.contextLost || App.shaderFailed) return;
    const dt = App.paused ? 0 : Math.min(.05, rawDt) * (reducedMotion ? .35 : 1); App.clock += dt; const t = App.clock; ENV.uTime.value = t;
    const fps = 1 / rawDt; if (!App.testing) adaptQuality(Math.min(.1, rawDt), fps); frames++; fpsAcc += fps; hudTimer += rawDt; if (hudTimer > .5) { updateStats(fpsAcc / frames); frames = 0; fpsAcc = 0; hudTimer = 0; }
    const f = App.fish; if (f) {
      const u = f.uniforms, g = App.genome, s = App.state, L = g.body.length;
      const restPose = App.debug.skeleton || App.debug.landmarks || window.__fgRest; u.uAmp.value = restPose ? 0 : g.swim.amp;
      if (!reducedMotion && t > s.nextBurst) { s.burst = 1; s.nextBurst = t + 5 + Math.random() * 9; } s.burst = Math.max(0, s.burst - dt / 1.3); const b = s.burst * s.burst; u.uBurst.value = b; u.uFreq.value = g.swim.freq * (1 + 1.1 * b);
      u.uCycle.value += dt * u.uFreq.value;
      const br = clamp(0.55 / Math.pow(L, 0.35), 0.25, 1.6), breath = 0.5 + 0.5 * Math.sin(t * br * TAU); u.uBreath.value = breath * (reducedMotion ? 0.3 : 1);
      const predator = (g.meta.tags || []).includes('predator'), shark = f.bm.a.solid && f.bm.a.gills === 'lateral';
      const feed = Math.pow(Math.max(0, Math.sin(t * br * TAU * .5 - 1.2)), 8);   /* a brief bite per cycle: between bites the jaw sits at exactly 0 (lips meet along the seam) */
      let open = clamp(feed * (shark ? .18 : .35 + .5 * g.mouth.open) * (predator ? 1.3 : .8) + b * (predator ? .45 : .1), 0, 1);
      if (window.__fgJaw != null) open = clamp(window.__fgJaw, 0, 1);              /* hold the jaw (close-up presets / tests) */
      u.uJawAngle.value = open * u.uJawOpenMax.value; u.uJawProtrude.value = f.bm.protrusile ? open * L * .03 : 0;
      if (t > s.saccT) { s.saccT = t + 0.7 + Math.random() * 2.5; s.saccTarget.set((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.3); } u.uSacc.value.lerp(s.saccTarget, 1 - Math.exp(-dt * 16));
      u.uInflate.value = lerp(u.uInflate.value, App.inflateTarget, 1 - Math.exp(-dt * 3));
      { /* side-fin controller: swim mode + size + speed (burst) + turn + braking → clamped joint angles; fins still at complete rest */
        const plan = f.bm.law.pec, st = f.pecState || (f.pecState = Object.assign(PEC.newPecState(), { prev: 0, brake: 0 })), D = Math.PI / 180;
        const spd = restPose || App.paused ? 0 : clamp(.4 + .6 * b, 0, 1), dsp = dt > 0 ? (spd - st.prev) / dt : 0; st.prev = spd;
        st.brake = lerp(st.brake, dt > 0 && dsp < -.55 ? 1 : 0, 1 - Math.exp(-dt * 8));
        const xt = Math.sin(t * .41) * Math.sin(t * .17 + 1.3) * 1.8, turn = clamp(Math.sign(xt) * Math.max(0, Math.abs(xt) - .55) / .45, -1, 1) * (restPose ? 0 : 1);
        let P;
        if (window.__fgFin) { const q = PEC.pecStep(PEC.newPecState(), plan, 1e-4, { speed: .9, turn: 0, brake: 0 }); P = window.__fgFin === 'rest' ? PEC.pecStep(PEC.newPecState(), plan, 1e-4, { speed: 0, still: true, hold: true }) : q; P.phase = window.__fgFin === 'power' ? Math.PI / 2 : window.__fgFin === 'recovery' ? 1.5 * Math.PI : 0; }
        else { P = PEC.pecStep(st, plan, dt, { speed: spd, turn, brake: st.brake, still: restPose || App.paused, hold: restPose }); P.phase = st.phase; }
        const w4 = (v, o) => o.set(v.sM * D, v.sA * D, v.aM * D, v.aA * D);
        w4(P.R, u.uPecA.value); w4(P.L, u.uPecB.value); u.uPecP.value.x = u.uPecP.value.y = P.phase;
        f.pecFrame = { P, spd, turn, brake: st.brake };
        if (u.uPecDisc.value > .5) { const dw = PEC.discWave(0, spd, .5), wd = f.info.bounds.getSize(new THREE.Vector3()).z; u.uDiscK.value = dw.k; u.uDiscAmp.value = restPose ? 0 : dw.ampOverWidth * wd * .98; }
      }
      if (restPose) { u.uBreath.value = 0; if (window.__fgJaw == null) { u.uJawAngle.value = 0; u.uJawProtrude.value = 0; } u.uInflate.value = 0; u.uFlap.value = 0; } else u.uFlap.value = FLAP[g.swim.mode] || .2;
      f.group.position.y = reducedMotion || restPose ? 0 : Math.sin(t * .6) * L * .015; f.group.rotation.y = reducedMotion || restPose ? 0 : Math.sin(u.uCycle.value * TAU) * .012 * (1 + b);
    }
    if (App.school && App.schoolOn && dt > 0) App.school.update(dt, t);
    if (App.env && App.env.shafts && App.env.shafts.visible) for (const m of App.env.shafts.children) m.rotation.y = Math.atan2(camera.position.x - m.position.x, camera.position.z - m.position.z);
    if (App.cameraTween) { const v = App.cameraTween, q = clamp((now - v.start) / v.duration, 0, 1), ease = smoother(q); camera.position.lerpVectors(v.from, v.to, ease); controls.target.lerpVectors(v.startTarget, v.target, ease); if (q === 1) { App.cameraTween = null; controls.enableDamping = true; } }
    controls.update(); renderer.render(scene, camera);
  } catch (e) { showError(e); }
}
/* ╔══════════════════════════════════════════════════════════════════╗
   ║ 11. UI, PANELS, EXPORT, SELF-TEST, BOOT                          ║
   ╚══════════════════════════════════════════════════════════════════╝ */
const $ = id => document.getElementById(id);
let toastTimer = 0; function toast(msg) { const t = $('toast'); t.textContent = msg; t.style.opacity = 1; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.style.opacity = 0; }, 2600); }
function showError(e) { console.error(e); window.__fgShowError(e && e.stack ? e.stack : String(e)); }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
const b64enc = s => btoa(unescape(encodeURIComponent(s))), b64dec = s => decodeURIComponent(escape(atob(s)));
function populateSelects() {
  const h = $('selHabitat'); h.innerHTML = Object.values(HABITATS).map(x => `<option value="${x.id}">${esc(x.n)}</option>`).join('');
  const n = $('selNiche'); n.innerHTML = '<option value="">Niche: auto</option>' + Object.values(NICHES).map(x => `<option value="${x.id}">${esc(x.n)}${x.fantasy ? ' ✨' : ''}</option>`).join('');
  const c2 = $('selClade'); const rows = []; const walk = (id, depth) => { rows.push(`<option value="${id}">${'· '.repeat(depth)}${esc(CLADES[id].n)}</option>`); Object.values(CLADES).filter(k => k.p === id).forEach(k => walk(k.id, depth + 1)); }; walk('fish', 0); c2.innerHTML = '<option value="">Clade: auto</option>' + rows.join('');
  const s = $('selSpecies'); const byHab = {}; for (const sp of SPECIES) (byHab[sp.habitat] = byHab[sp.habitat] || []).push(sp); s.innerHTML = '<option value="">Species: none</option>' + Object.keys(byHab).map(hid => `<optgroup label="${esc(HABITATS[hid].n)}">` + byHab[hid].map(sp => `<option value="${sp.id}">${esc(sp.n)}</option>`).join('') + '</optgroup>').join('');
}
function currentOpts() { return { habitat: $('selHabitat').value || undefined, niche: $('selNiche').value || undefined, clade: $('selClade').value || undefined, species: $('selSpecies').value || undefined, seed: $('seed').value.trim() || undefined }; }
function doGenerate(opts) {
  clearTimeout(GOD.timer); clearTimeout(editTimer);
  try {
    opts = opts || currentOpts();
    if (!opts.seed) { opts.seed = Math.floor(Math.random() * 1e9).toString(36); $('seed').value = opts.seed; }
    const g = generate(opts); syncSelects(g); setFish(g);
  } catch (e) { if (e instanceof RangeError) toast(e.message); else showError(e); }
}
function syncSelects(g) { $('selHabitat').value = g.meta.habitat; $('seed').value = g.meta.seed; }
/** Top-bar "name → creature": species name (optionally + habitat words) or a free description; species are adapted to the chosen habitat. */
function convertFromName() {
  const text = $('nameInput').value.trim(); if (!text) { toast('Type a species name or describe a creature.'); return; }
  try {
    const sp = findSpecies(text), habitat = findHabitat(text) || $('selHabitat').value || undefined, seed = cyrb128(text + '|' + (habitat || '')).toString(36);
    const g = sp ? generate({ species: sp.id, habitat, seed: 'name:' + seed }) : genomeFromText(text, 'txt:' + seed, habitat);
    syncSelects(g); setFish(g);
    toast(sp ? (g.meta.adapted ? sp.n + ' adapted to ' + HABITATS[g.meta.habitat].n : sp.n + ' in its native habitat') : 'Interpreted as ' + CLADES[g.meta.clade].n.toLowerCase() + ' / ' + NICHES[g.meta.niche].n.toLowerCase());
  } catch (e) { if (e instanceof RangeError) toast(e.message); else showError(e); }
}
/** Invent within one body plan and one habitat; the seed fully determines the result. */
function invent(habId, seed) {
    const hab = HABITATS[habId]; if (!hab) throw new Error('Unknown discovery habitat');
    const rng = new RNG('disc:' + seed);
    const a = generate({ habitat: habId, noSpecies: true, seed: 'disc-a-' + seed });
    /* sister lineage: a nearby leaf clade (tree distance ≤ 3) that is ecologically valid for this habitat */
    const isLeaf = id => !Object.values(CLADES).some(k => k.p === id);
    const plan = anatomyProfile(a);
    const sisters = Object.keys(CLADES).filter(id => {
      if (!isLeaf(id) || id === a.meta.clade || cladeDistance(a.meta.clade, id) > 3 || !cladeAllowed(id, hab)) return false;
      const other = anatomyProfile({ meta: { clade: id } });
      return other.family === plan.family && other.gills === plan.gills && cladeInNiche(id, NICHES[a.meta.niche]);
    });
    const sisterClade = sisters.length && rng.chance(.75) ? rng.pick(sisters) : a.meta.clade;
    const b = generate({ habitat: habId, clade: sisterClade, niche: a.meta.niche, noSpecies: true, seed: 'disc-b-' + seed });
    let child; try { child = breed(a, b, 'disc-x-' + seed); } catch (err) { child = a; }
    child = mutate(child, .25, 'disc-m-' + seed);
    child.meta.habitat = habId; child.meta.niche = a.meta.niche; child.meta.species = null; child.meta.parentSpecies = null;
    child.meta.adapted = null; child.meta.novel = true; child.meta.repairs = [];
    delete child.meta.evolution; delete child.meta.mutation;
    finalize(child);
    return child;
}
FG.invent = invent;
function doDiscover() {
  clearTimeout(GOD.timer); clearTimeout(editTimer);
  try {
    const habId = $('selHabitat').value || (App.genome ? App.genome.meta.habitat : 'coralReef');
    const child = invent(habId, Math.floor(Math.random() * 1e9).toString(36));
    const cl = CLADES[child.meta.clade];
    $('selSpecies').value = ''; $('selClade').value = ''; $('selNiche').value = ''; $('seed').value = '';
    setFish(child); toast('New concept from the ' + cl.n.toLowerCase() + ' lineage, shaped for ' + HABITATS[habId].n + '.');
  } catch (e) { showError(e); }
}
function doBreed() { if (App.history.length < 2) { toast('Generate a second fish first. Breed crosses the current fish with the previous one.'); return; } const a = App.history[App.history.length - 2], b = App.genome; try { let child = null; for (let i = 0; i < 12 && !child; i++) { try { const c = adaptFinish(hybridize(a, b, .5, a.meta.seed + 'x' + b.meta.seed + ':' + Math.floor(Math.random() * 1e6).toString(36)), b.meta.habitat, 'br' + Math.floor(Math.random() * 1e6).toString(36)); if (acceptable(c)) child = c; } catch (e2) { /* unviable draw */ } } if (!child) throw new Error('These two parents cannot be crossed into a coherent animal. Try another pair.');   /* round 6H: same shared audit as Wonder */ child.meta.evo = { step: 0, base: child.meta.name, nov: {}, don: null, hab: null, last: null, log: [] }; setFish(child); toast('Hybrid cross: ' + a.meta.name + ' + ' + b.meta.name); } catch (e) { toast(e.message); } }
function updateHash() { if (!App.genome) return; if (App.genome.meta.proc && !App.genome.meta.edited) { try { history.replaceState(null, '', '#p=' + encodeURIComponent(App.genome.meta.proc.seed)); } catch (e) { /* sandboxed history */ } return; } const g = App.genome, m = g.meta; const q = new URLSearchParams({ s: m.seed, h: m.habitat, n: m.niche || '', c: m.clade, sp: m.species || '', g: b64enc(JSON.stringify(slimGenome(g))) }); try { history.replaceState(null, '', '#' + q.toString()); } catch (e) { /* Sandboxed or local-file history. */ } }
function stripGenome(g) { const c2 = deepClone(g); delete c2.meta.metrics; delete c2.meta.landmarks; delete c2.meta.repairs; return c2; }
function loadFromHash() { const q = new URLSearchParams(location.hash.slice(1)); if (q.get('p') && FG.proc) { FG.proc.showSeed(q.get('p')); return true; } if (!q.get('s') && !q.get('g')) return false; try { if (q.get('g')) { const { genome, issues } = validateGenome(JSON.parse(b64dec(q.get('g')))); genome.meta.repairs = issues.map(i => ({ rule: 'schema_validate', path: '-', from: '-', to: i })); finalize(genome); genome.meta.edited = true; syncSelects(genome); setFish(genome); return true; } const opts = { seed: q.get('s'), habitat: q.get('h') || undefined, niche: q.get('n') || undefined, clade: q.get('c') || undefined, species: q.get('sp') || undefined }; $('selHabitat').value = opts.habitat || ''; $('selNiche').value = opts.niche || ''; $('selClade').value = opts.clade || ''; $('selSpecies').value = ''; $('seed').value = opts.seed; doGenerate(opts); return true; } catch (e) { console.warn('hash load failed', e); return false; } }
function updateHUD() {
  const g = App.genome; if (!g) return; const m = g.meta;
  $('fishName').innerHTML = esc(m.name) + (m.hybrid ? '<span class="badge" style="background:#b45309">HYBRID</span>' : m.novel ? '<span class="badge" style="background:#22644f">NEW CONCEPT</span>' : '')
    + (m.speculative ? '<span class="badge" style="background:#7355a6">SPECULATIVE</span>' : m.fantasy ? '<span class="badge">FANTASY</span>' : '')
    + (m.species ? '<span class="badge" style="background:#0e7490">' + (m.speculative ? 'REFERENCE LINEAGE' : 'SPECIES CARD') + '</span>' : '')
    + (m.adapted ? '<span class="badge" style="background:#925614">HABITAT VARIANT</span>' : '');
  $('fishSci').textContent = m.sci || '';
  $('fishTags').textContent = `${HABITATS[m.habitat].n} / ${NICHES[m.niche] ? NICHES[m.niche].n : 'Generalist'} / ${CLADES[m.clade].n} / ${m.sizeClass} (${g.body.length.toFixed(2)} m) / ${g.swim.mode}` + (m.evoTraits && m.evoTraits.length ? ' / evolved: ' + m.evoTraits.join(', ') : '');
  $('btnUndo').disabled = App.history.length < 2;
  $('btnMutate').title = 'Evolve one generation (drift, gene flow, habitat selection or a new organ). Generation ' + (((m.evo && m.evo.step) || (m.evolution ? m.evolution.step : 0)) + 1) + ' next.';
}
function updateStats(fps) { const f = App.fish; $('stats').textContent = `${fps.toFixed(0)} fps · tier ${App.tier} · ${f ? f.info.tris.toLocaleString() : 0} tris · ${renderer.info.render.calls} draws${App.school && App.schoolOn ? ' · school ' + App.school.count : ''}`; }
/* ── sheet / tabs ── */
let currentTab = null; const inspectorState = { genome: null, inputs: new Map() };
function openSheet(tab) { clearTimeout(GOD.timer); currentTab = tab; $('sheet').classList.remove('hidden'); document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab)); renderPanel(tab); onResize(); }
function closeSheet() { clearTimeout(GOD.timer); currentTab = null; $('sheet').classList.add('hidden'); document.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('active')); onResize(); }
function refreshPanels() { if (!currentTab || currentTab === 'tests' || currentTab === 'text' || (currentTab === 'god' && GOD.editing)) return; if (currentTab === 'inspect' && inspectorState.genome === App.genome) { syncInspector(); return; } if (currentTab === 'gallery') return; renderPanel(currentTab); }
function renderPanel(tab) { const body = $('sheetBody'); const titles = { mix: 'Hybrid Lab / lineage & adaptation report', evo: 'Evolution Lab / gradual mutation', god: 'God Mode / Evolution Workbench', inspect: 'Genome inspector', tree: 'Phylogeny', gallery: 'Reference gallery', text: 'Text to genome', export: 'Export & share', debug: 'Debug & rules', tests: 'Anatomy regression tests', proc: 'Procedural generator / seed, gallery & breeding', help: 'Anatomy Engine Guide' }; $('sheetTitle').textContent = titles[tab] || tab; body.innerHTML = ''; try { PANELS[tab](body); } catch (e) { showError(e); } }
// @@PART js/app.part14.js (14/19) lines 2815-2937 of the original module script -- stripped by build.mjs
const PANELS = {
  god(body) {
    const g = App.genome; if (!g) return;
    if (!GOD.baseline || !GOD.editing) { GOD.baseline = deepClone(g); GOD.axes = {}; }
    const a = anatomyProfile(g), protectedPaths = Object.keys(a.locks).length;
    body.innerHTML = `<p class="gene-lock">AUTHORED EVOLUTION, NOT RANDOM GEOMETRY</p><h2 class="god-title">Create beyond the ordinary.</h2><p class="god-copy">Explore a broader range of form without breaking the fish. Every adjustment evolves linked structures; the ${a.label.toLowerCase()} foundation stays intact.</p>
      <div class="god-switch"><div>God Mode<small>Extended variation. Biological safeguards always on.</small></div><button id="godToggle" class="${GOD.enabled ? 'primary' : ''}" aria-pressed="${GOD.enabled}">${GOD.enabled ? 'Enabled' : 'Enable'}</button></div>
      <div class="camera-row"><button data-view="side">Side View</button><button data-view="top">Dorsal View</button><button data-view="head">Head View</button><button data-view="mouth">Mouth</button><button data-view="eye">Eye</button><button data-view="fin">Fin</button><button data-view="tail">Tail</button><button data-view="below">Below</button><button data-view="mouthbelow">Mouth below</button><button id="godPause">${App.paused ? 'Resume' : 'Pause'}</button></div>
      <div class="grp">Anatomical foundation</div><div class="row"><select id="godLineage" aria-label="Anatomical lineage">${Object.values(CLADES).filter(k => !Object.values(CLADES).some(ch => ch.p === k.id)).map(k => `<option value="${k.id}"${k.id === g.meta.clade ? ' selected' : ''}>${esc(k.n)}</option>`).join('')}</select><button id="godEvolve" class="sm">Build Lineage</button></div>
      <div class="grp">Linked adaptation axes</div><div id="godAxes"></div><div class="adaptation"><div class="adaptation-head"><label for="godStrength">Mutation Strength</label><output id="godStrengthOut">${Math.round(GOD.strength * 100)}%</output></div><input id="godStrength" type="range" min=".05" max="1" step=".01" value="${GOD.strength}"></div>
      <div class="god-actions"><button class="primary" id="godMutate">Guided Mutation</button><button id="godUndo">Undo</button><button id="godReset">Reset Axes</button></div><div class="god-actions"><button id="godGenome">Detailed Genome</button><button id="godCheck">Validate Anatomy</button></div>
      <div class="panel-note" id="godStatus">${protectedPaths} lineage traits protected. Mouth, gills, bilateral fin roots and tail propulsion are checked after every edit.</div>${evolutionReport(g)}`;
    const axes = body.querySelector('#godAxes');
    for (const id in ADAPTATIONS) {
      const module = ADAPTATIONS[id], row = document.createElement('div'); row.className = 'adaptation';
      row.innerHTML = `<div class="adaptation-head"><label for="axis-${id}">${module.label}</label><output>Balanced</output></div><p>${module.desc}</p><input id="axis-${id}" type="range" min="-1" max="1" step=".02" value="${GOD.axes[id] || 0}" aria-label="${module.label}">`;
      row.querySelector('input').oninput = e => {
        const v = +e.target.value; GOD.axes[id] = v; row.querySelector('output').textContent = v === 0 ? 'Balanced' : (v > 0 ? '+' : '') + Math.round(v * 100) + '%';
        clearTimeout(GOD.timer); GOD.timer = setTimeout(() => {
          try { const evolved = deepClone(GOD.baseline); evolved.meta.godMode = GOD.enabled; evolved.meta.parentSpecies = evolved.meta.species || evolved.meta.parentSpecies; evolved.meta.species = null; evolved.meta.edited = true; evolved.meta.repairs = [];
            for (const key in GOD.axes) applyAdaptation(evolved, key, GOD.axes[key], GOD.enabled);
            finalize(evolved); evolved.meta.name = 'Authored ' + evolved.meta.name.toLowerCase(); GOD.editing = true;
            setFish(evolved, { noHistory: true, keepCamera: true }); GOD.editing = false;
            const errors = violations(evolved); body.querySelector('#godStatus').textContent = errors.length ? `${errors.length} unresolved constraints. Open Debug for details.` : `Anatomy valid. ${evolved.meta.repairs.length} automatic corrections; roots sampled directly from the body surface.`;
          } catch (err) { GOD.editing = false; showError(err); }
