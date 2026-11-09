/* ── self test ── */
const TEST_STATE = { running: false, cancel: false, last: null };
function runFocusedTests() {
  const rows = [], assert = (condition, message) => { if (!condition) throw new Error(message); };
  const test = (name, fn) => { try { fn(); rows.push({ name, pass: true }); } catch (error) { rows.push({ name, pass: false, error: error.message }); } };
  test('Goldfish + hadal habitat creates a labelled speculative form', () => {
    const g = generate({ species: 'goldfish', habitat: 'hadal', seed: 'goldfish-hadal-regression' });
    assert(g.meta.habitat === 'hadal' && g.meta.species === 'goldfish', 'Species or habitat was discarded');
    assert(g.meta.speculative && g.meta.adapted.speculative, 'Impossible habitat was presented as a real population');
    assert(violations(g).length === 0, 'Unrepaired anatomical constraints');
  });
  test('Goldfish creates in every habitat without selection errors', () => {
    for (const habitat in HABITATS) { const g = generate({ species: 'goldfish', habitat, seed: 'all-habitats-regression' }); assert(g.meta.habitat === habitat && violations(g).length === 0, habitat + ' was not preserved or failed constraints'); }
  });
  test('Eight body/fin mutation steps make visible, bounded changes', () => {
    let g = generate({ species: 'goldfish', seed: 'step-regression' });
    const targets = ['agility', 'display', 'finShape', 'tail', 'speed', 'feeding', 'agility', 'finShape'];
    for (let i = 0; i < targets.length; i++) {
      const before = deepClone(g); g = mutate(g, .55, 'step-regression-' + i, targets[i]);
      assert(g.meta.evolution.step === i + 1, 'Step counter did not advance');
      assert(morphologyDifference(before, g) >= .025, 'Mutation is effectively a no-op');
      assert(violations(g).length === 0, 'Mutation failed anatomical rules');
      for (const p in g.meta.evolution.origin) {
        const lim = mutationBounds(g, p, g.meta.evolution), value = getP(g, p);
        assert(value >= lim.min - 1e-6 && value <= lim.max + 1e-6, p + ' escaped the founding envelope');
      }
    }
  });
  test('Mutation is repeatable and preserves the skin pattern seed', () => {
    const source = generate({ species: 'rainbow-trout', seed: 'deterministic-mutation' });
    const a = mutate(source, .55, 'shared-mutation-seed', 'finShape'), b = mutate(source, .55, 'shared-mutation-seed', 'finShape');
    assert(JSON.stringify(stripGenome(a)) === JSON.stringify(stripGenome(b)), 'Seeded mutation differs on replay');
    assert(a.meta.surfaceSeed === source.meta.surfaceSeed && source.meta.species === 'rainbow-trout', 'Source genome or pattern seed was altered');
  });
  test('JSON import preserves evolution anchors and adaptation labels', () => {
    const source = generate({ species: 'goldfish', habitat: 'hadal', seed: 'import-regression' });
    const evolved = mutate(source, .55, 'import-step', 'finShape');
    const imported = validateGenome(JSON.parse(JSON.stringify(stripGenome(evolved)))).genome; finalize(imported);
    assert(imported.meta.evolution.step === 1 && imported.meta.speculative, 'Evolution or speculative label was dropped');
    assert(JSON.stringify(imported.meta.evolution.origin) === JSON.stringify(evolved.meta.evolution.origin), 'Evolution envelope changed on import');
  });
  test('No cone horns; every pectoral shape curve is defined', () => {
    const g = generate({ clade: 'scorpaenid', habitat: 'coralReef', noSpecies: true, seed: 'ornament-regression' });
    assert(g.head.special !== 'horns', 'Cone head ornament remains enabled');
    for (const shape of SCHEMA['fins.pectoral.shape'].opts) assert(typeof PECT_SHAPE[shape] === 'function' && isNum(PECT_SHAPE[shape](.5)), 'Missing ' + shape + ' fin profile');
  });
  for (const species of ['goldfish', 'pacific-sardine', 'red-lionfish', 'milkfish', 'blue-marlin']) test(species + ' builds valid hero and school geometry', () => {
    const g = generate({ species, seed: 'focused-geometry' });
    for (const quality of ['hero', 'lod']) {
      const fish = buildFish(g, { quality });
      try { const result = checkFishGeometry(fish); assert(result.errors.length === 0, quality + ': ' + result.errors.join('; ')); }
      finally { fish.dispose(); }
    }
  });
  runHybridTests(test, assert);
  TEST_STATE.focused = rows; return rows;
}
FG.runFocusedTests = runFocusedTests;
function checkFishGeometry(fish) {
  const g = fish.bm.g, L = fish.bm.L, errors = [], q = QUALITY[fish.info.quality], tol = Math.max(L * 1e-6, 1e-9);
  for (const geo of fish.geos) for (const name of ['position', 'normal']) {
    const attr = geo.getAttribute(name); if (attr && !attr.array.every(Number.isFinite)) errors.push('Non-finite ' + name);
  }
  const pos = fish.parts.body.geometry.getAttribute('position'), fins = fish.parts.fins.geometry.getAttribute('position');
  let asym = 0, maxRootError = 0;
  const RR = fish.bm.loft.R;   /* round 6A: the disc ring is denser than the quality table's R */
  for (let s = 0; s < fish.bm.loft.us.length; s += 3) for (let j = 1; j < RR / 2; j++) {
    const a = s * RR + j, b = s * RR + RR - j;
    if (Math.abs(pos.getX(a) - pos.getX(b)) > tol || Math.abs(pos.getY(a) - pos.getY(b)) > tol || Math.abs(pos.getZ(a) + pos.getZ(b)) > tol) asym++;
  }
  const p = {};
  for (const root of fish.info.attachments) {
    fish.bm.attachedSurface(root.u, root.theta, p);
    maxRootError = Math.max(maxRootError, Math.max(0, Math.hypot(fins.getX(root.index) - p.x, fins.getY(root.index) - p.y, fins.getZ(root.index) - p.z) - (root.allow || 0)));
    if (root.u < 0 || root.u > 1) errors.push('Attachment outside landmark axis');
  }
  if (asym) errors.push('Body lost bilateral symmetry');
  if (maxRootError > tol) errors.push('Fin roots detached from skin');
  if (fish.bm.billStart !== null) {
    const uv = fish.parts.body.geometry.getAttribute('aBody');
    if (uv.getX(0) > -.04 || fish.bm.loft.us[0] >= 0) errors.push('Bill is not part of the continuous body loft');
  }
  if (fish.bm.a.family === 'ray' || fish.bm.a.family === 'benthicShark') {
    let minZ = Infinity, maxZ = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < pos.count; i++) { minZ = Math.min(minZ, pos.getZ(i)); maxZ = Math.max(maxZ, pos.getZ(i)); minY = Math.min(minY, pos.getY(i)); maxY = Math.max(maxY, pos.getY(i)); }
    /* flattened plan: a disc (width ≫ thickness), its margin built by the fin constructor and rooted on the disc edge, no hinged jaw on the full form */
    if (fish.bm.law.flat.flat >= 1 && (maxZ - minZ) / Math.max(L * .01, maxY - minY) < 2.2) errors.push('Flattened plan is not a disc');
    const att = (fish.info.attachments || []).filter(x => x.kind === 'pectoral');
    if (!att.length && !fish.bm.disc) errors.push('Flattened plan margin fin is not rooted on the disc');
    if (fish.parts.jaw && fish.bm.law.flat.flat >= 1) errors.push('Flattened plan has a hinged jaw');
  }
  if (fish.parts.jaw) {
    const tissue = fish.parts.jaw.geometry.getAttribute('aBody');
    for (let i = 0; i < tissue.count; i++) if (tissue.getZ(i) !== 0) { errors.push('Mouth contains a flat cavity shelf'); break; }
  }
  if (g.meta.species === 'goldfish' && (g.body.fineness > 2.05 || g.fins.caudal.type !== 'fantail')) errors.push('Goldfish body or tail is not the reference fantail form');
  if (g.head.special === 'horns') errors.push('Detached cone ornament was not removed');
  /* mouth law audit: the interior cavity is a pocket inside the head (never a tunnel), ≤ CAVITY_MAX head length deep (round 7: 0.62, funnel to the pharynx); teeth only on the jaw margins */
  { const bm = fish.bm, fr = {}, s = {}; let out = 0, deepest = 0;
    const inBody = (x, y, z, slack) => { const u = clamp((bm.headX - x) / L, .003, .999); bm.frame(u, fr); bm.section(u, s); const ly = (x - fr.px) * fr.nx + (y - fr.py) * fr.ny; return ly > -s.dDn * slack && ly < s.dUp * slack && Math.abs(z) <= bm.halfWidthAtY(s, clamp(ly, -s.dDn * .99, s.dUp * .99)) * slack + 1e-6; };
    for (const m of fish.group.children) { if (!m.geometry) continue; const ab = m.geometry.getAttribute('aBody'); if (!ab || m.material !== fish.materials.jaw || !(ab.getZ(0) >= 1 && ab.getZ(0) < 2) || bm.ventralMouth || bm.oralDisc) continue; const P = m.geometry.getAttribute('position');
      for (let i = 0; i < P.count; i++) { if (!inBody(P.getX(i), P.getY(i), P.getZ(i), 1.02)) out++; deepest = Math.max(deepest, (bm.headX - P.getX(i)) / L); } }
    if (out) errors.push('Mouth cavity breaks out of the head'); if (deepest > Math.max(bm.mcU, bm.hingeU || 0) + LAW.CAVITY_MAX * bm.h + 1e-6) errors.push('Mouth cavity deeper than CAVITY_MAX head length');
    if (fish.parts.teeth) { const M = new THREE.Matrix4(), P = new THREE.Vector3(); for (let i = 0; i < fish.parts.teeth.count; i++) { fish.parts.teeth.getMatrixAt(i, M); P.setFromMatrixPosition(M); const u = (bm.headX - P.x) / L; if (u < bm.jawStartU - .01 || u > Math.max(bm.mcU, bm.hingeU || 0) + 1e-6 || !inBody(P.x, P.y, P.z, 1.08)) { errors.push('Teeth outside the jaw margins'); break; } } } }
  if (!fish.bm.oralDisc || true) errors.push(...FG.round2Check(fish.bm));   /* round 2: see-through mouth / teeth rooting / eye protrusion */
  errors.push(...auditAnatomy(fish, THREE));
  const budget = fish.info.quality === 'lod' ? 2500 : HYP.on ? 700000 : 40000;   /* hero LOD0 with the hyper head system: 200k-500k class */
  if (fish.info.tris > budget) errors.push('Triangle budget exceeded');
  const un = violations(g); if (un.length) errors.push(un.length + ' unrepaired constraints');
  return { errors: [...new Set(errors)], maxRootError, asym, tris: fish.info.tris };
}
async function runSelfTest(out, prog, exhaustive = false) {
  if (TEST_STATE.running) { toast('Tests are already running.'); return; }
  TEST_STATE.running = App.testing = true; TEST_STATE.cancel = false;
  const rows = [], issues = [], beforePause = App.paused; App.paused = true; out.innerHTML = '';
  const yieldFrame = () => new Promise(resolve => setTimeout(resolve, 0));
  const show = () => {
    out.innerHTML = `<div style="overflow:auto"><table><tr><th>Suite</th><th>Genomes</th><th>Mutations</th><th>Geometry</th><th>Hero / LOD tris</th><th>Result</th></tr>${rows.map(r => `<tr><td>${esc(r.name)}</td><td>${r.n}</td><td>${r.m}</td><td>${r.geo}</td><td>${r.hero.toLocaleString()} / ${r.lod.toLocaleString()}</td><td class="${r.fail ? 'bad' : 'ok'}">${r.fail ? 'FAIL (' + r.fail + ')' : 'PASS'}</td></tr>`).join('')}</table></div>`;
    if (issues.length) { const pre = document.createElement('pre'); pre.style.cssText = 'font-size:10px;white-space:pre-wrap;color:#f4aba3'; pre.textContent = issues.slice(0, 25).join('\n'); out.appendChild(pre); }
  };
  const testGenome = (g, row, build) => {
    row.n++;
    let nan = false; for (const p in SCHEMA) { const v = getP(g, p), e = SCHEMA[p]; if ((e.t === 'n' || e.t === 'i') && !isNum(v) || e.t === 'hsl' && !(Array.isArray(v) && v.every(isNum))) nan = true; }
    const problems = violations(g); if (nan || problems.length) { row.fail++; issues.push(`${row.name}: ${g.meta.clade}, seed ${g.meta.seed}: ${nan ? 'NaN' : problems.map(p => p.rule).join(', ')}`); }
    if (build) for (const quality of ['hero', 'lod']) {
      let fish;
      try { fish = buildFish(g, { quality }); const check = checkFishGeometry(fish); row.geo++; row[quality === 'hero' ? 'hero' : 'lod'] = Math.max(row[quality === 'hero' ? 'hero' : 'lod'], check.tris); if (check.errors.length) { row.fail++; issues.push(`${g.meta.name} / ${quality}: ${check.errors.join(', ')}`); } }
      catch (err) { row.fail++; issues.push(`${g.meta.name}: ${err.message}`); }
      finally { if (fish) fish.dispose(); }
    }
  };
  try {
    for (const hid of Object.keys(HABITATS)) {
      const row = { name: HABITATS[hid].n, n: 0, m: 0, geo: 0, hero: 0, lod: 0, fail: 0 }; rows.push(row);
      try {
        const concept = invent(hid, 'novel-regression-' + hid);
        testGenome(concept, row, true);
        if (!concept.meta.novel || concept.meta.species || concept.meta.habitat !== hid || !cladeAllowed(concept.meta.clade, HABITATS[hid])) {
          row.fail++; issues.push(`${hid}: invented fish failed habitat or novelty constraints`);
        }
      } catch (error) { row.fail++; issues.push(`${hid}: invention failed: ${error.message}`); }
      for (let i = 0; i < 200 && !TEST_STATE.cancel; i++) {
        const g = generate({ habitat: hid, seed: 'anatomy-test-' + i }); testGenome(g, row, exhaustive || i % 25 === 0);
        const evolved = mutate(g, .85, 'mutation-test-' + hid + '-' + i); row.m++;
        if (violations(evolved).length) { row.fail++; issues.push(`${hid}: mutation constraints failed (${g.meta.clade})`); }
        if (i % 20 === 0) { prog.textContent = `${HABITATS[hid].n}: ${i + 1}/200`; show(); await yieldFrame(); }
      }
      show(); if (TEST_STATE.cancel) break;
    }
    if (!TEST_STATE.cancel) {
      const row = { name: 'All reference species', n: 0, m: 0, geo: 0, hero: 0, lod: 0, fail: 0 }; rows.push(row);
      for (const sp of SPECIES) {
        if (TEST_STATE.cancel) break;
        const g = generate({ species: sp.id, seed: 'reference-anatomy' }); testGenome(g, row, true);
        const a = anatomyProfile(g), locks = a.locks;
        if (Object.keys(locks).some(p => getP(g, p) !== locks[p])) { row.fail++; issues.push(sp.n + ': lineage architecture failed'); }
        const again = generate({ species: sp.id, seed: 'reference-anatomy' });
        if (JSON.stringify(stripGenome(g)) !== JSON.stringify(stripGenome(again))) { row.fail++; issues.push(sp.n + ': generation is not deterministic'); }
        const mutant = mutate(g, .7, 'breed-' + sp.id), offspring = breed(g, mutant, 'cross-' + sp.id); row.m++;
        if (violations(offspring).length) { row.fail++; issues.push(sp.n + ': crossover rules failed'); }
        prog.textContent = 'Reference anatomy: ' + sp.n; show(); await yieldFrame();
      }
    }
    const failed = rows.reduce((n, r) => n + r.fail, 0); TEST_STATE.last = { rows, issues, exhaustive, canceled: TEST_STATE.cancel };
    prog.textContent = TEST_STATE.cancel ? 'Canceled. Partial results shown.' : failed ? `${failed} checks failed. Details below.` : 'All completed checks passed.';
  } finally { TEST_STATE.running = App.testing = false; App.paused = beforePause; }
  return TEST_STATE.last;
}
FG.checkFishGeometry = checkFishGeometry; FG.TEST_STATE = TEST_STATE;
/* close-up / test hook: scripted cameras, rest pose and held jaw (used by the render check) */
FG.shoot = { App, setCameraView, look(pos, tgt) { camera.position.set(pos[0], pos[1], pos[2]); controls.target.set(tgt[0], tgt[1], tgt[2]); controls.update(); }, get controls() { return controls; }, rest(on) { window.__fgRest = !!on; }, jaw(v) { window.__fgJaw = v; }, fin(v) { window.__fgFin = v || null; }, get scene() { return scene; }, get camera() { return camera; }, bg(c) { scene.background = new THREE.Color(c); scene.fog = null; }, hide(names) { App.fish.group.traverse(o => { if (o.userData && o.userData.layer && names.includes(o.userData.layer)) o.visible = false; }); } };
FG.hyper = { HYP, hyperFor, HG, HS, SKIN, QUALITY };
installRig(FG, { App, THREE, HYP, hyperFor, HG, buildFish, setFish, applyMode, frameCamera, checkFishGeometry, get renderer() { return renderer; }, get scene() { return scene; }, get camera() { return camera; }, get controls() { return controls; }, get fishgen() { return { School }; } });
/* ── events & boot ── */
/* ╔══════════════════════════════════════════════════════════════════╗
   ║ 9. HYBRID + EVOLUTION ENGINE                                     ║
   ║    body-plan aware crossing, habitat syndromes, wonder search,   ║
   ║    gradual evolution (drift · selection · gene flow · novelty)   ║
   ╚══════════════════════════════════════════════════════════════════╝ */
const mixC = (a, b, t) => { const dh = ((b[0] - a[0] + 540) % 360) - 180; return [(a[0] + dh * t + 360) % 360, clamp(lerp(a[1], b[1], t), 0, 1), clamp(lerp(a[2], b[2], t), 0, 1)]; };
const nounOf = n => String(n || 'fish').replace(/\(.*?\)/g, '').trim().split(/\s+/).pop().toLowerCase().replace(/[^a-z-]/g, '') || 'fish';
const LOGP = new Set(['body.length', 'body.fineness', 'body.width', 'body.pedDepth', 'body.snoutDepth', 'head.lengthFrac', 'head.eyeSize', 'mouth.gape', 'swim.freq', 'fins.dorsal.height', 'fins.dorsal2.height', 'fins.dorsal3.height', 'fins.anal.height', 'fins.pectoral.len', 'fins.pelvic.len', 'fins.caudal.len', 'fins.caudal.span', 'fins.caudal.aspect', 'fins.adipose.size', 'head.specialLen', 'head.specialWidth', 'head.barbelLen']);
const blendN = (p, a, b, t) => LOGP.has(p) && a > 0 && b > 0 ? Math.exp(lerp(Math.log(a), Math.log(b), t)) : lerp(a, b, t);
const setN = (g, p, v) => { const e = SCHEMA[p]; v = clamp(v, e.min, e.max); setP(g, p, e.t === 'i' ? Math.round(v) : v); };
const cp3 = v => Array.isArray(v) ? v.slice() : v;
/* every schema path belongs to exactly one organ; organs are inherited as functional units */
const ORGAN_DEFS = [
  ['body', 'struct', p => p.startsWith('body.')], ['face', 'surface', p => /^head\.(lengthFrac|snoutTaper|foreheadSlope|brow|cheek)$/.test(p)],
  ['jaw', 'surface', p => p.startsWith('mouth.')], ['eye', 'surface', p => /^head\.eye/.test(p) || p === 'skin.eye'],
  ['ornament', 'surface', p => /^head\.special/.test(p)], ['barbels', 'surface', p => /^head\.barbel/.test(p)],
  ['gills', 'lineage', p => /^head\.(operculum|gill|spiracles|nostrils)/.test(p)],
  ['dorsal', 'struct', p => /^fins\.dorsal/.test(p)], ['anal', 'struct', p => /^fins\.anal\./.test(p)], ['pectoral', 'struct', p => /^fins\.pectoral\./.test(p)],
  ['pelvic', 'struct', p => /^fins\.pelvic\./.test(p)], ['tail', 'struct', p => /^fins\.caudal\./.test(p) || p.startsWith('swim.')],
  ['extras', 'surface', p => /^fins\.(adipose|finlets)/.test(p)], ['scales', 'surface', p => p === 'skin.scale' || p === 'skin.scaleSize'],
  ['pattern', 'surface', p => /^skin\.(pattern|band)/.test(p)], ['palette', 'surface', p => ['skin.base', 'skin.belly', 'skin.accent', 'skin.fin'].includes(p)],
  ['sheen', 'surface', p => /^skin\.(iridescence|gloss|countershade|lateralLine)$/.test(p)], ['light', 'surface', p => /^skin\.(photophores|glow|translucency|electric|inflate)$/.test(p)]
];
const ORGAN_KIND = {}, ORG_OF = {}, ORG_PATHS = {}, ORGAN_LABEL = { body: 'Body plan', face: 'Head shape', jaw: 'Jaws & teeth', eye: 'Eyes', ornament: 'Head ornament', barbels: 'Barbels', gills: 'Gills', dorsal: 'Dorsal fins', anal: 'Anal fin', pectoral: 'Pectoral fins', pelvic: 'Pelvic fins', tail: 'Tail & swimming', extras: 'Finlets & adipose', scales: 'Scales', pattern: 'Pattern', palette: 'Palette', sheen: 'Sheen & lateral line', light: 'Light organs & skin' };
for (const [id, kind] of ORGAN_DEFS) ORGAN_KIND[id] = kind;
for (const p in SCHEMA) { const d = ORGAN_DEFS.find(x => x[2](p)); ORG_OF[p] = d ? d[0] : '?'; (ORG_PATHS[ORG_OF[p]] = ORG_PATHS[ORG_OF[p]] || []).push(p); }
let _GEN = null; const generic = () => _GEN || (_GEN = defaultGenome());
/** how far an organ departs from a generic fish (0..1): the organ's "signature" */
function signature(g, id) {
  let s = 0, n = 0; const d0 = generic();
  for (const p of ORG_PATHS[id] || []) { const e = SCHEMA[p], v = getP(g, p), d = getP(d0, p); n++;
    if (e.t === 'n' || e.t === 'i') s += Math.min(1, Math.abs(v - d) / Math.max(1e-6, e.max - e.min) * 3);
    else if (e.t === 'hsl') s += Math.min(1, Math.abs(((v[0] - d[0] + 540) % 360) - 180) / 180 * .6 + Math.abs(v[1] - d[1]) * .5 + Math.abs(v[2] - d[2]) * .5);
    else s += v !== d ? 1 : 0; }
  return n ? s / n : 0;
}
/** body-plan class: structural organs are only exchanged between identical plans (names follow the real anatomy families) */
function planOf(g) {
  const fam = anatomyProfile(g).family, b = g.body;
  if (fam === 'upright' || b.posture > 60) return 'upright';
  if (fam === 'ray') return 'ray'; if (fam === 'benthicShark') return 'flatShark'; if (fam === 'flatfish' || Math.abs(b.roll) > 45) return 'flat';
  if (fam === 'knife') return 'knife'; if (fam === 'molid') return 'molid'; if (fam === 'rigid') return 'rigid'; if (fam === 'jawless') return 'jawless'; if (fam === 'pipe') return 'pipe';
  if (fam === 'ribbon' && b.fineness > 8) return 'ribbon'; if (fam === 'chimaera') return 'chimaera';
  return 'std';
}
const shuffle = (rng, a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
/** functional axes (0..1) measured from the genome itself, so every rule reacts to the real fish, invented or not */
const AX = g => {
  const f = g.fins, s = g.skin, m = g.mouth, b = g.body, pierce = ['fang', 'needle', 'triangular'].includes(m.teeth);
  return {
    fast: clamp((b.fineness - 3) / 6, 0, 1) * (f.caudal.present && f.caudal.aspect > 2.6 ? 1 : .55), agile: clamp(f.pectoral.len / 1.1, 0, 1) * (b.fineness < 4.5 ? 1 : .5),
    pred: clamp(m.gape * .8 + (pierce ? .35 : 0), 0, 1), flat: clamp(b.ventralFlat * .8 + (g.head.eyeV > .7 ? .25 : 0) + (Math.abs(b.roll) > 45 ? .6 : 0), 0, 1),
    armor: ['plates', 'scutes', 'ganoid'].includes(s.scale) ? 1 : s.scale === 'denticle' ? .45 : 0,
    camo: ['mottle', 'disruptive', 'saddles', 'spots'].includes(s.pattern) ? clamp(s.patternStrength * (1 - s.iridescence * .5), 0, 1) : 0,
    show: clamp((f.dorsal.height + f.pectoral.len * .5) / 1.6, 0, 1) * (.4 + s.iridescence * .6), dark: clamp(s.photophores / 30, 0, 1), eel: clamp((b.fineness - 7) / 6, 0, 1),
    size: clamp(Math.log10(b.length / .05) / 2.6, 0, 1), glass: s.translucency,
    filter: m.gape > .68 && ['none', 'rasp'].includes(m.teeth) ? clamp((m.gape - .6) / .3, 0, 1) : 0,
    grazer: m.gape < .3 && ['molar', 'beak', 'villiform', 'rasp'].includes(m.teeth) ? clamp((.34 - m.gape) / .2, 0, 1) : 0,
    surface: (m.type === 'superior' ? .6 : 0) + b.dorsalFlat * .4, spiny: f.dorsal.shape === 'spines' || f.dorsal.spines >= 14 ? 1 : 0,
    school: clamp((s.iridescence - .45) * 2, 0, 1) * (b.length < .5 ? 1 : .4), sail: f.dorsal.shape === 'sail' || f.dorsal.height > 1.1 ? 1 : 0, whisker: clamp(g.head.barbels / 4, 0, 1)
  };
};
/* ── plan-coherence rules: these remove the "missing tail" class of defects everywhere (mix, mutate, god mode) ── */
RULE('plan_swim_posture', 'Swim mode, posture and curl agree with the body plan', (g, lm, log) => {
  const a = anatomyProfile(g), lockNoTail = a.locks && a.locks['fins.caudal.present'] === false;
  if (g.swim.mode === 'hippocampiform' && g.body.posture <= 60 && !lockNoTail) setLog(g, log, 'plan_swim_posture', 'swim.mode', g.body.fineness > 9 ? 'anguilliform' : 'subcarangiform');
  if (g.swim.mode === 'rajiform' && a.family !== 'ray') setLog(g, log, 'plan_swim_posture', 'swim.mode', 'subcarangiform');
  if (g.body.curl > .02 && g.body.posture <= 60 && a.family !== 'upright') setLog(g, log, 'plan_swim_posture', 'body.curl', 0);
});
// @@PART js/app.part16.js (16/19) lines 3228-3390 of the original module script -- stripped by build.mjs
RULE('tail_presence', 'A caudal fin exists unless the lineage truly lacks one', (g, lm, log) => {
  const c = g.fins.caudal, a = anatomyProfile(g), plan = planOf(g);
  const may = (a.locks && a.locks['fins.caudal.present'] === false) || ['upright', 'ray', 'knife', 'flatShark'].includes(plan) || !!(g.meta.clade && ['batoid'].some(id => cladePath(g.meta.clade).some(n => n.id === id)));
  if (c.present || may) return;
  setLog(g, log, 'tail_presence', 'fins.caudal.present', true);
  const type = (SWIM_TAILS[g.swim.mode] || CAUDAL_TYPES).find(t => !['filamentous', 'diphycercal'].includes(t)) || 'rounded', ar = CAUDAL_AR[type];
  setLog(g, log, 'tail_presence', 'fins.caudal.type', type); setLog(g, log, 'tail_presence', 'fins.caudal.aspect', +((ar[0] + ar[1]) / 2).toFixed(2));
  setLog(g, log, 'tail_presence', 'fins.caudal.len', .17); setLog(g, log, 'tail_presence', 'fins.caudal.span', +clamp(g.body.pedDepth * 2.4, .85, 1.5).toFixed(2));
  setLog(g, log, 'tail_presence', 'fins.caudal.lobeAsym', 0); setLog(g, log, 'tail_presence', 'fins.caudal.opacity', .85);
});
RULE('tail_visibility', 'The caudal fin flares clearly beyond the peduncle and is never a stub', (g, lm, log) => {
  const c = g.fins.caudal; if (!c.present) return; const a = anatomyProfile(g), molid = a.family === 'molid';
  const need = Math.max(.5, g.body.pedDepth * (molid ? 1.15 : 1.65)), cap = a.tailSpan[1];
  if (c.span < need) { if (need <= cap) setLog(g, log, 'tail_visibility', 'fins.caudal.span', +need.toFixed(3)); else { setLog(g, log, 'tail_visibility', 'fins.caudal.span', cap); clampLog(g, log, 'tail_visibility', 'body.pedDepth', .03, Math.max(.03, cap / (molid ? 1.15 : 1.65))); } }
});
RULE('fin_scale_cap', 'No fin is longer than ~90% of the body (guards crossed and evolved genomes)', (g, lm, log) => {
  const a = anatomyProfile(g), b = g.body, f = g.fins; if (['ray', 'benthicShark', 'glider', 'lion', 'molid'].includes(a.family)) return;
  if (f.pectoral.present) clampLog(g, log, 'fin_scale_cap', 'fins.pectoral.len', .05, Math.max(.2, .86 * b.fineness));
  if (f.dorsal.present) clampLog(g, log, 'fin_scale_cap', 'fins.dorsal.height', .03, Math.max(.3, .9 * b.fineness));
  if (f.anal.present) clampLog(g, log, 'fin_scale_cap', 'fins.anal.height', .03, Math.max(.3, .8 * b.fineness));
});
/** analytic structural audit used to gate every generated fish (returns a list of issues, empty = sound) */
function structuralAudit(g, opts = {}) {
  const out = [], a = anatomyProfile(g), plan = planOf(g), c = g.fins.caudal, f = g.fins, b = g.body;
  const noTailOk = (a.locks && a.locks['fins.caudal.present'] === false) || ['upright', 'ray', 'knife', 'flatShark'].includes(plan);
  if (!c.present && !noTailOk) out.push('tail: no caudal fin on a swimming body plan');
  if (c.present) {
    if (g.swim.mode === 'hippocampiform') out.push('tail: hippocampiform swimmer with a caudal fin');
    if (!(SWIM_TAILS[g.swim.mode] || CAUDAL_TYPES).includes(c.type)) out.push('tail: caudal type does not match swim mode');
    if (c.span < Math.max(.45, b.pedDepth * (a.family === 'molid' ? 1.1 : 1.5))) out.push('tail: fin does not flare beyond the peduncle');
  }
  if (b.posture > 60 && g.swim.mode !== 'hippocampiform') out.push('plan: upright posture without hippocampiform swimming');
  if (g.swim.mode === 'hippocampiform' && !c.present && plan !== 'upright') out.push('tail: hippocampiform swimmer on a non-upright body plan');
  if (b.curl > .05 && b.posture <= 60 && a.family !== 'upright') out.push('plan: curled tail on a non-upright body');
  if (!['ray', 'flatShark', 'molid'].includes(plan) && !['glider', 'lion'].includes(a.family)) {
    if (f.dorsal.present && f.dorsal.height / b.fineness > .95) out.push('fin: dorsal fin taller than 95% of body length');
    if (f.pectoral.present && f.pectoral.len / b.fineness > .9) out.push('fin: pectoral fin longer than 90% of body length');
    if (f.anal.present && f.anal.height / b.fineness > .85) out.push('fin: anal fin taller than 85% of body length');
  }
  if (b.fineness < 1.3 || b.fineness > 17.1) out.push('body: fineness out of range');
  for (const v of coherenceAudit(g, { mesh: !opts.analytic })) out.push(v.code + ': ' + v.msg);   /* round 6H: laws L1-L6, the one shared audit */
  return out;
}

/* ── crossing: organs are inherited as functional units; structure only moves between identical body plans ── */
const both = (P, Q, f1, f2) => (f1(P) && f2(Q)) || (f1(Q) && f2(P));
const SYN = {
  burst: ['Burst-glider', (P, Q) => both(P, Q, p => p.fast > .5, p => p.agile > .55), g => { if (planOf(g) !== 'std') return null; g.fins.pectoral.shape = 'pointed'; setN(g, 'fins.pectoral.len', g.fins.pectoral.len * 1.2); if (g.fins.dorsal.present) g.fins.dorsal.shape = 'falcate'; if (g.fins.caudal.present && ['forked', 'lunate', 'emarginate'].includes(g.fins.caudal.type)) setN(g, 'fins.caudal.aspect', Math.max(g.fins.caudal.aspect, 2.8)); setN(g, 'body.keel', Math.max(g.body.keel, .6)); return 'swept pectorals and a falcate dorsal give speed without losing steering'; }, g => g.fins.pectoral.shape === 'pointed'],
  armour: ['Armoured sprinter', (P, Q) => both(P, Q, p => p.armor > .5, p => p.fast > .5), g => { if (planOf(g) !== 'std') return null; g.skin.scale = 'scutes'; setN(g, 'skin.scaleSize', g.skin.scaleSize * 1.3); setN(g, 'body.keel', 1); for (const k of ['dorsal', 'anal', 'pectoral', 'caudal']) g.fins[k].flex = Math.min(g.fins[k].flex, .35); return 'armour is confined to keel scutes, keeping the trunk stiff yet streamlined'; }, g => g.skin.scale === 'scutes'],
