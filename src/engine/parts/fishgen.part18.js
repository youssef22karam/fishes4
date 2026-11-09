  { id: 'streamers', n: 'Trailing streamers', st: ['the pelvic fins lengthen', 'pelvic fins draw out into filaments', 'filaments trail from pelvic and dorsal fins'], can: (g, X) => STDLIKE(X) && g.fins.pelvic.present && g.fins.pelvic.shape !== 'filament', w: (g, X) => .6 + X.P.show, ap: (g, s) => { setN(g, 'fins.pelvic.len', g.fins.pelvic.len * (s === 1 ? 1.5 : 1.2)); if (s >= 2) g.fins.pelvic.shape = 'filament'; if (s === 3 && g.fins.dorsal.present && g.fins.dorsal.shape !== 'sail') { g.fins.dorsal.shape = 'filament'; setN(g, 'fins.dorsal.height', g.fins.dorsal.height * 1.25); } } },
  { id: 'veil', n: 'Veil tail', st: ['the tail broadens', 'the tail flows into long, soft lobes', 'a full veil-tail with floating margins'], can: (g, X) => STDLIKE(X) && g.fins.caudal.present && g.fins.caudal.type !== 'fantail' && X.P.fast < .55 && X.plan !== 'ribbon' && X.plan !== 'rigid', w: (g, X) => .5 + (1 - X.P.fast) + (X.role === 'display' ? 1.4 : 0), ap: (g, s) => { setN(g, 'fins.caudal.span', g.fins.caudal.span * [1.12, 1.18, 1.15][s - 1]); if (s >= 2) { g.swim.mode = 'subcarangiform'; g.fins.caudal.type = 'fantail'; g.fins.caudal.flex = Math.max(g.fins.caudal.flex, .8); g.fins.caudal.opacity = Math.min(g.fins.caudal.opacity, .75); } if (s === 3) setN(g, 'fins.caudal.len', Math.max(g.fins.caudal.len, .34)); } },
  { id: 'spines', n: 'Venomous spines', st: ['dorsal rays harden into spines', 'the spines lengthen and spread', 'a crown of warning-coloured spines'], can: (g, X) => STDLIKE(X) && g.fins.dorsal.present && !(g.fins.dorsal.shape === 'spines' && g.fins.dorsal.spines >= 12), w: (g, X) => .6 + (X.role === 'bottom' ? 1.2 : 0) + (X.role === 'ambush' ? 1 : 0), ap: (g, s, r) => { mx(g, 'fins.dorsal.spines', [6, 9, 13][s - 1]); if (s >= 2) g.fins.dorsal.shape = 'spines'; if (s === 3) g.skin.accent = [r.pick([6, 28, 46]), .9, .52]; } },
  { id: 'warn', n: 'Warning bands', st: ['a pale band appears across the flank', 'the band hardens into bold contrast', 'bold warning bars advertise danger'], can: (g, X) => g.skin.band < .75 && g.skin.pattern !== 'bars', w: (g, X) => .6 + (X.hab.id === 'coralReef' ? 1.4 : 0) + (X.P.spiny ? 1.6 : 0), ap: (g, s, r) => { setN(g, 'skin.band', [.4, .6, .8][s - 1]); g.skin.bandColor = [(g.skin.base[0] + r.range(150, 210)) % 360, .8, .55]; if (s === 3) { g.skin.pattern = 'bars'; mx(g, 'skin.patternStrength', .75); } } },
  { id: 'silver', n: 'Mirror skin', st: ['the flanks begin to silver', 'a counter-shaded mirror sheen forms', 'mirror-bright flanks blink as it turns'], can: (g, X) => g.skin.iridescence < .9 && X.dark < .6, w: (g, X) => .5 + (X.role === 'school' ? 2 : 0) + (X.hab.floor === false ? 1.2 : 0), ap: (g, s) => { mx(g, 'skin.iridescence', [.45, .7, .95][s - 1]); mx(g, 'skin.countershade', [.5, .75, .9][s - 1]); } },
  { id: 'eyes', n: 'Night vision', st: ['the eyes enlarge and warm in colour', 'the eyes grow a reflective layer', 'huge, forward-set tapetum eyes gather every photon'], can: (g, X) => g.head.eyeSide !== 'none' && X.dark > .15 && g.head.eyeSize < .45, w: (g, X) => .5 + X.dark * 2.2, ap: (g, s) => { setN(g, 'head.eyeSize', g.head.eyeSize * [1.15, 1.12, 1.15][s - 1]); g.skin.eye = [[150, .6, .46], [165, .85, .5], [178, .95, .58]][s - 1]; if (s === 3) setN(g, 'head.eyeForward', g.head.eyeForward + .08); } },
  { id: 'periscope', n: 'Periscope eyes', st: ['the eyes shift upward on the skull', 'the eyes ride higher on bony brows', 'periscope eyes watch from the waterline'], can: (g, X) => g.head.eyeSide !== 'none' && STDLIKE(X) && g.head.eyeV < .8 && (X.role === 'bottom' || X.role === 'ambush' || X.P.surface > .3), w: (g, X) => .4 + (X.role === 'bottom' ? 1.5 : 0) + X.P.surface * 2, ap: (g, s) => { mx(g, 'head.eyeV', [.5, .68, .85][s - 1]); if (s >= 2) mx(g, 'head.brow', .5); } },
  { id: 'fangs', n: 'Piercing teeth', st: ['the teeth sharpen', 'long needle teeth line the jaws', 'fangs and a wider gape for gripping prey'], can: (g, X) => !NOSNOUT(g) && g.mouth.teeth !== 'fang' && STDLIKE(X) && X.role !== 'filter' && X.role !== 'grazer', w: (g, X) => .5 + X.P.pred * 2, ap: (g, s) => { g.mouth.teeth = ['villiform', 'needle', 'fang'][s - 1]; mx(g, 'mouth.teethCount', [30, 26, 16][s - 1]); setN(g, 'mouth.gape', g.mouth.gape * 1.08); } },
  { id: 'crushers', n: 'Crushing jaws', st: ['the teeth blunt into pavement', 'a stout jaw bears molar plates', 'a powerful beak-like crushing mouth'], can: (g, X) => !NOSNOUT(g) && STDLIKE(X) && !['molar', 'beak'].includes(g.mouth.teeth) && (X.role === 'grazer' || X.role === 'armor' || X.role === 'bottom'), w: (g, X) => .4 + X.P.grazer * 2 + X.P.armor, ap: (g, s) => { g.mouth.teeth = s === 1 ? 'villiform' : 'molar'; if (s === 3) setN(g, 'head.cheek', Math.max(g.head.cheek, .6)); setN(g, 'mouth.gape', g.mouth.gape * .9); mx(g, 'mouth.teethCount', 14); } },
  { id: 'electric', n: 'Electric organ', st: ['muscle tissue begins to hum with charge', 'an electric organ lights the flanks', 'a strong electric discharge organ'], can: (g, X) => !g.skin.electric && (['ribbon', 'knife', 'std'].includes(X.plan)) && (X.turbid || X.dark > .25 || X.hab.id === 'blackwater' || X.hab.id === 'floodplain'), w: (g, X) => .4 + (X.plan === 'ribbon' || X.plan === 'knife' ? 1.8 : 0) + X.dark, ap: (g, s) => { if (s >= 2) g.skin.electric = true; if (s === 3) { g.skin.glow = [200, .8, .62]; mx(g, 'skin.photophores', 6); } } },
  { id: 'inflate', n: 'Defensive inflation', st: ['the belly stretches', 'the skin hardens into prickles', 'it can balloon into a spiny sphere'], can: (g, X) => !g.skin.inflate && ['std', 'rigid'].includes(X.plan) && g.body.fineness < 5, w: () => .5, ap: (g, s) => { if (s === 1) setN(g, 'body.width', Math.min(.8, g.body.width * 1.15)); if (s === 2) { g.skin.scale = 'denticle'; setN(g, 'body.width', Math.min(.85, g.body.width * 1.1)); } if (s === 3) { g.skin.inflate = true; mx(g, 'fins.dorsal.spines', 4); } } },
  { id: 'glass', n: 'Glass tissue', st: ['pigment thins out', 'the body turns half-transparent', 'near-invisible glass body'], can: (g, X) => g.skin.translucency < .6 && STDLIKE(X) && (X.dark > .2 || X.hab.floor === false), w: (g, X) => .4 + X.dark * 1.5 + (X.hab.floor === false ? .8 : 0), ap: (g, s) => { mx(g, 'skin.translucency', [.25, .45, .68][s - 1]); g.skin.belly[2] = Math.max(g.skin.belly[2], .86); } },
  { id: 'finlets', n: 'Speed finlets', st: ['small finlets bud behind the dorsal', 'a row of finlets forms', 'keeled finlets and a scute-ridged tail root'], can: (g, X) => g.fins.finlets.count < 5 && X.plan === 'std' && X.P.fast > .3 && g.fins.caudal.present, w: (g, X) => .3 + X.P.fast * 2.2, ap: (g, s) => { mx(g, 'fins.finlets.count', [3, 5, 7][s - 1]); if (s === 3) mx(g, 'body.keel', .8); } },
  { id: 'walk', n: 'Walking fins', st: ['the pectoral fins thicken at the base', 'the fins grow muscular and limb-like', 'it props itself on limb-fins to walk'], can: (g, X) => STDLIKE(X) && g.fins.pectoral.present && g.fins.pectoral.shape !== 'limb' && X.role === 'bottom' && !X.deep, w: () => .6, ap: (g, s) => { if (s === 1) mx(g, 'fins.pectoral.baseLen', .3); if (s >= 2) g.fins.pectoral.shape = 'limb'; if (s === 3) { g.fins.pectoral.opacity = 1; mx(g, 'head.eyeV', .75); } } },
  { id: 'camo', n: 'Cryptic skin', st: ['blotches break up the outline', 'the pattern deepens into mottle', 'a leaf-litter disguise hides the fish'], can: (g, X) => g.skin.pattern !== 'mottle' || g.skin.patternStrength < .85, w: (g, X) => .5 + (X.role === 'bottom' || X.role === 'ambush' ? 2 : 0) + (X.hab.id === 'kelpForest' || X.hab.id === 'seagrass' ? 1 : 0), ap: (g, s) => { g.skin.pattern = s === 1 ? 'spots' : 'mottle'; mx(g, 'skin.patternStrength', [.5, .7, .88][s - 1]); g.skin.iridescence = Math.min(g.skin.iridescence, [.5, .3, .15][s - 1]); } },
  { id: 'wings', n: 'Gliding wings', st: ['the pectoral fins broaden', 'the fins stretch into airfoils', 'wing-like pectorals let it glide'], can: (g, X) => STDLIKE(X) && g.fins.pectoral.present && g.fins.pectoral.shape !== 'wing' && X.plan === 'std' && (X.hab.floor === false || X.hab.id === 'skySea') && X.role !== 'bottom', w: () => .35, ap: (g, s) => { setN(g, 'fins.pectoral.len', g.fins.pectoral.len * [1.25, 1.3, 1.2][s - 1]); if (s >= 2) g.fins.pectoral.shape = 'wing'; if (s === 3) mx(g, 'fins.pectoral.len', 1.7); } }
];
const NOV = Object.fromEntries(NOVELTIES.map(n => [n.id, n]));
function ecoCtx(g) {
  const hab = HABITATS[g.meta.habitat] || HABITATS.coralReef, P = AX(g), R = roleOf(g), plan = planOf(g), dark = clamp(1 - Math.pow(hab.light, .35), 0, 1);
  return { hab, P, role: R.top, plan, upright: plan === 'upright', dark, deep: hab.tags.includes('deep'), fantasy: !!hab.fantasy, turbid: hab.fog > .1 && hab.light < .7 && !hab.fantasy };
}
const cleanName = n => String(n || 'fish').replace(/^Evolved\s+/i, '').replace(/\s*[/·]\s*(step|gen)\s*\d+$/i, '');
function evoState(g) {
  const e = g.meta.evo || {}, st = { step: e.step || 0, base: e.base || cleanName(g.meta.name), nov: Object.assign({}, e.nov), don: e.don ? { val: e.don.val, seed: e.don.seed, done: !!e.don.done, anc: e.don.anc || 0, L0: e.don.L0 || 0, th: e.don.th ? Object.assign({}, e.don.th) : null, prog: Object.assign({}, e.don.prog) } : null, hab: e.hab ? { id: e.hab.id, p: e.hab.p, t: Object.assign({}, e.hab.t), seed: e.hab.seed, notes: (e.hab.notes || []).slice(), base: e.hab.base ? Object.assign({}, e.hab.base) : null, adapted: e.hab.adapted ? Object.assign({}, e.hab.adapted) : null } : null, last: e.last ? Object.assign({}, e.last) : null, log: (e.log || []).slice(-13) };
  return st;
}
/* ── event 1: coupled adaptive drift (momentum gives orthogenetic trends instead of a random walk) ── */
function evDrift(c, st, rng, X, mag, only) {
  const ids = ['speed', 'agility', 'feeding', 'shelter', 'display', 'finShape', 'tail', 'robust', 'pigment'], tags = new Set(c.meta.tags || []), w = {};
  for (const id of ids) w[id] = (tags.has(ADAPTATIONS[id].weight) ? 3 : 1) * (X.upright && ['speed', 'agility', 'tail', 'shelter'].includes(id) ? .2 : 1) * (id === 'tail' && !c.fins.caudal.present ? 0 : 1);
  const picks = only ? [only] : []; if (!only && st.last && w[st.last.id] && rng.chance(.55)) picks.push(st.last.id);
  const want = only ? 1 : rng.int(2, 3); while (picks.length < want) { const id = rng.weighted(w); if (!picks.includes(id)) picks.push(id); }
  const lines = []; let first = null;
  for (const id of picks) {
    const dir = st.last && id === st.last.id && rng.chance(.7) ? st.last.dir : (rng.chance(.5) ? 1 : -1); first = first || { id, dir };
    applyAdaptation(c, id, dir * mag * rng.range(.85, 1.2) * (picks.length > 1 ? .8 : 1), true); lines.push(`${ADAPTATIONS[id].label} ${dir > 0 ? 'increases' : 'decreases'}: ${ADAPTATIONS[id].desc}`);
  }
  const dh = rng.range(-9, 9) * (.5 + mag * 3); for (const p of ['skin.base', 'skin.accent', 'skin.fin']) { const v = getP(c, p).slice(); v[0] = (v[0] + dh + 360) % 360; setP(c, p, v); }
  setN(c, 'skin.patternScale', c.skin.patternScale * rng.range(.92, 1.1)); st.last = first;
  return { kind: 'drift', title: 'Adaptive drift', lines: lines.concat(`Pigment drifts ${dh > 0 ? '+' : ''}${dh.toFixed(0)}° in hue.`) };
}
const JUMP_TRAITS = [['body.fineness', 1], ['body.width', .3], ['body.pedDepth', .1], ['head.lengthFrac', .1], ['mouth.gape', .15], ['fins.dorsal.height', .3], ['fins.pectoral.len', .3], ['fins.anal.height', .3], ['fins.caudal.span', .6]];
/** largest relative distance between the fish and a target on the shape-defining traits (used to cap how much of the gap one step may close) */
function gapOf(c, getT, paths) { let w = 0; for (const [p, fl] of JUMP_TRAITS) { if (paths && !paths.has(p)) continue; const x = getP(c, p), y = getT(p); if (typeof x === 'number' && typeof y === 'number') w = Math.max(w, Math.abs(y - x) / Math.max(Math.abs(x), fl)); } return w; }
const STEP_LIM = .27;
/* ── event 2: gene flow. Donor ancestry rises a little each step; every organ has its own adoption threshold, so
   body, colour, fins and jaws move at different times (continuous traits blend, discrete traits switch at 50%) ── */
const TH_RANGE = { body: [.12, .34], palette: [.05, .4], pattern: [.1, .55], scales: [.2, .65], sheen: [.1, .55], light: [.3, .75], face: [.2, .5], jaw: [.25, .55], eye: [.15, .55], ornament: [.45, .85], barbels: [.3, .75], dorsal: [.2, .5], anal: [.2, .55], pectoral: [.2, .55], pelvic: [.3, .65], tail: [.4, .75], extras: [.4, .85] };
const easeP = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
function donorThresholds(seed) {
  const r = new RNG('th:' + seed), th = {}; for (const id in TH_RANGE) th[id] = r.range(TH_RANGE[id][0], TH_RANGE[id][1]);
  th.tail = Math.max(th.tail, th.body + .14); th.anal = (th.anal + th.dorsal) / 2; th.face = (th.face + th.jaw) / 2 + .02; return th;
}
function evDonor(c, st, rng, X, mag) {
  if (!st.don) return null; const dn = st.don; if (dn.done) return null;
  if (!dn.th) dn.th = donorThresholds(dn.seed);
  const D = parentFrom(dn.val, c.meta.habitat, dn.seed), cp = planOf(c), compat = cp === planOf(D), W = .46, lines = [];
  const adopt = ORGAN_DEFS.filter(([id, kind]) => id !== 'gills' && id in dn.th && !(kind === 'struct' && !compat) && !(id === 'jaw' && ['upright', 'pipe'].includes(cp))).map(x => x[0]);
  const a0 = dn.anc, moved = []; let a1 = a0;
  /* if no organ is due yet at this ancestry, let ancestry rise further within the same click so a step never stalls */
  for (let spin = 0; spin < 10 && !moved.length && a1 < 1; spin++) {
  a1 = Math.min(1, a1 + rng.range(.075, .115) * (.8 + mag * 2.2));
  for (const [id, kind] of ORGAN_DEFS) {
    if (id === 'gills' || !(id in dn.th)) continue; if (kind === 'struct' && !compat) continue; if (id === 'jaw' && ['upright', 'pipe'].includes(cp)) continue;
    const p0 = dn.prog[id] || 0; if (a1 >= 1 && p0 >= .99 && p0 < 1) { dn.prog[id] = 1; continue; } let p1 = a1 >= 1 ? 1 : easeP((a1 - dn.th[id] + W) / (2 * W)); if (p1 <= p0 + .004) continue;
    let f = p0 >= 1 ? 1 : (p1 - p0) / (1 - p0); const gap = gapOf(c, p => getP(D, p), new Set(ORG_PATHS[id])); if (gap > 0) f = Math.min(f, Math.max(.07, STEP_LIM / gap)); if (p0 < 1) p1 = p0 + f * (1 - p0);
    const flip = (p1 >= .5 && p0 < .5) || p1 >= .999; if (p1 >= .999) p1 = 1;
    for (const p of ORG_PATHS[id]) {
      if (p === 'body.length') continue;
      const e = SCHEMA[p], cv = getP(c, p), dv = getP(D, p);
      if (e.t === 'n' || e.t === 'i') setN(c, p, blendN(p, cv, dv, f)); else if (e.t === 'hsl') setP(c, p, mixC(cv, dv, f)); else if (flip) setP(c, p, cp3(dv));
    }
    if (id === 'body') { dn.L0 = dn.L0 || c.body.length; const target = Math.exp(lerp(Math.log(dn.L0), Math.log(D.body.length), p1)); setN(c, 'body.length', clamp(target, c.body.length / 1.4, c.body.length * 1.4)); }
    dn.prog[id] = p1; moved.push({ id, p0, p1, flip });
  }
  }
  dn.anc = a1; const finished = a1 >= 1 && adopt.every(id => (dn.prog[id] || 0) >= .99); if (finished) { dn.done = true; dn.anc = 1; }
  if (!moved.length) return finished ? { kind: 'gene flow', title: 'Gene flow complete (100%)', lines: ['Every adoptable organ now matches ' + cleanName(D.meta.name) + '.'] } : null;
  moved.sort((x, y) => (y.p1 - y.p0) - (x.p1 - x.p0));
  lines.push(`Donor ancestry ${pct(a0)}% → ${pct(a1)}%.`);
  for (const m of moved.slice(0, 3)) lines.push(`${ORGAN_LABEL[m.id]} ${pct(m.p0)}% → ${pct(m.p1)}% of ${cleanName(D.meta.name)}${m.p1 >= 1 ? ' (fixed)' : m.flip && m.p0 < .5 ? ' (discrete traits switch)' : ''}`);
  if (moved.length > 3) lines.push(`${moved.length - 3} more organs shifting.`);
  return { kind: 'gene flow', title: 'Gene flow from ' + cleanName(D.meta.name) + ' (' + pct(a1) + '%)', lines };
}
/* ── event 3: selection toward a habitat. The fully adapted target is computed once; each step closes part of the gap ── */
function evHabitat(c, st, rng, X, mag, habId) {
  const id = habId || (st.hab && st.hab.id); if (!id || !HABITATS[id]) return null; const hab = HABITATS[id];
  if (!st.hab && c.meta.adapted && c.meta.adapted.to === id && c.meta.habitat === id && c.meta.adaptDone === id) return null;
  if (st.hab && st.hab.id === id && (!st.hab.t || !Object.keys(st.hab.t).length)) st.hab = null;
  if (!st.hab || st.hab.id !== id) {
    const pre = deepClone(c), base = c.meta.adaptBase; if (base) for (const p in base) if (SCHEMA[p]) setP(pre, p, cp3(base[p]));
    const seed = Math.random().toString(36).slice(2, 8), T = adaptFinish(pre, id, seed), t = {};
    for (const p in SCHEMA) { if (ORG_OF[p] === 'gills') continue; const a = getP(c, p), b = getP(T, p), e = SCHEMA[p]; const diff = e.t === 'n' || e.t === 'i' ? Math.abs(a - b) > (e.max - e.min) * .004 : e.t === 'hsl' ? Math.abs(((a[0] - b[0] + 540) % 360) - 180) > 2 || Math.abs(a[1] - b[1]) > .02 || Math.abs(a[2] - b[2]) > .02 : a !== b; if (diff) t[p] = cp3(b); }
    st.hab = { id, p: 0, t, seed, notes: T.meta.notes, base: T.meta.adaptBase, adapted: T.meta.adapted };
  }
  const h = st.hab, p0 = h.p; let f = Math.min(1, rng.range(.24, .36) * (.8 + mag * 2) / Math.max(.05, 1 - p0)); const gap = gapOf(c, p => h.t[p]); if (gap > 0) f = Math.min(f, Math.max(.07, STEP_LIM / gap));
  let p1 = Math.min(1, p0 + f * (1 - p0)); if (p1 >= .995) { p1 = 1; f = 1; } const flip = p1 >= .5 && p0 < .5 || p1 >= 1;
  let moved = 0; for (const p in h.t) { const e = SCHEMA[p], cv = getP(c, p), tv = h.t[p]; if (e.t === 'n' || e.t === 'i') { setN(c, p, blendN(p, cv, tv, f)); moved++; } else if (e.t === 'hsl') { setP(c, p, mixC(cv, tv, f)); moved++; } else if (flip) { setP(c, p, cp3(tv)); moved++; } }
  h.p = p1; if (p1 >= .4 && c.meta.habitat !== id) { c.meta.adapted = { from: c.meta.habitat, to: id, speculative: false }; c.meta.habitat = id; }
  const notes = h.notes || [], lines = [`${Math.round(p0 * 100)}% → ${Math.round(p1 * 100)}% adapted to ${hab.n.toLowerCase()} (${moved} traits shifting).`]; if (notes.length) lines.push(notes[st.step % notes.length]);
  if (p1 >= 1) { c.meta.adapted = h.adapted || c.meta.adapted; c.meta.notes = notes; if (h.base) c.meta.adaptBase = h.base; c.meta.adaptDone = id; st.hab = null; lines.push('Adaptation complete.'); }
  return { kind: 'selection', title: 'Selection toward ' + hab.n, lines };
}
/* ── event 4: innovation. New organs develop in stages (bud → working organ → elaborated) and only where ecology allows ── */
function evInnovate(c, st, rng, X, only) {
  const cur = id => st.nov[id] || 0;
  const open = NOVELTIES.filter(n => cur(n.id) > 0 && cur(n.id) < n.st.length), fresh = NOVELTIES.filter(n => !cur(n.id) && n.can(c, X));
  let pick = null;
  if (only) pick = NOV[only]; else if (open.length && (!fresh.length || rng.chance(.55))) pick = rng.pick(open);
  else if (fresh.length) { const w = {}; for (const n of fresh) w[n.id] = Math.max(.05, n.w(c, X)); pick = NOV[rng.weighted(w)]; }
  if (!pick || cur(pick.id) >= pick.st.length || (!cur(pick.id) && !pick.can(c, X))) return null;
  /* a stage whose effect is already present in this fish does not count: development continues to the next visible stage */
  const base = deepClone(c), applied = []; let stage = cur(pick.id);
  while (stage < pick.st.length) {
    stage++; pick.ap(c, stage, rng, X); applied.push(stage);
    const t = deepClone(c); t.meta.repairs = []; finalize(t, new RNG('probe:' + stage)); if (phenoDelta(base, t) >= .05) break;
  }
  st.nov[pick.id] = stage;
  return { kind: 'innovation', title: `${pick.n} (stage ${stage}/${pick.st.length})`, lines: applied.map(k => pick.st[k - 1][0].toUpperCase() + pick.st[k - 1].slice(1) + '.') };
}
/** largest relative change of the shape-defining traits in one step (rule repairs can otherwise snap a body into a new shape) */
function stepJump(a, b) {
  let m = 0; const rel = (p, fl) => { const x = getP(a, p), y = getP(b, p); if (typeof x === 'number' && typeof y === 'number') m = Math.max(m, Math.abs(y - x) / Math.max(Math.abs(x), fl)); };
  rel('body.fineness', 1); rel('body.width', .3); rel('body.pedDepth', .1); rel('head.lengthFrac', .1); rel('mouth.gape', .15);
  for (const p of ['fins.dorsal.height', 'fins.pectoral.len', 'fins.anal.height']) rel(p, .3); if (a.fins.caudal.present && b.fins.caudal.present) rel('fins.caudal.span', .6);
  return m;
}
function flipCount(a, b) { let n = 0; for (const p in SCHEMA) { const t = SCHEMA[p].t; if ((t === 's' || t === 'b') && getP(a, p) !== getP(b, p)) n++; } return n; }
/**
 * One evolutionary event = one click. Events: drift, gene flow, habitat selection, innovation (or a single named module). Each candidate is repaired,
 * audited for body-plan soundness (no tail loss, no impossible fins) and must change the phenotype visibly; the best valid candidate is kept.
 */
// @@PART js/app.part18.js (18/19) lines 3569-3749 of the original module script -- stripped by build.mjs
function evolve(g0, o = {}) {
  const strength = clamp(o.strength == null ? .55 : o.strength, .05, 1), seed = String(o.seed != null ? o.seed : g0.meta.seed + ':e' + Math.random()), rng = new RNG(seed), mode = o.mode || 'auto', st0 = evoState(g0);
  if (o.donor) st0.don = st0.don && st0.don.val === o.donor ? st0.don : { val: o.donor, seed: 'd' + Math.random().toString(36).slice(2, 7), anc: 0, th: null, prog: {} };
  if (o.habId && (mode === 'habitat' || mode === 'auto' && st0.hab)) { if (!st0.hab || st0.hab.id !== o.habId) st0.hab = null; }
  const mag = lerp(.07, .2, strength), minD = .07 + .1 * strength, tries = [];
  const plan = k => k === 'drift' ? ['drift'] : k === 'donor' ? ['donor', 'drift'] : k === 'habitat' ? ['habitat', 'drift'] : k === 'innovate' ? (o.only ? ['innovate'] : ['innovate', 'drift']) : ['module'];
  let kinds; if (ADAPTATIONS[mode]) kinds = ['module']; else if (mode !== 'auto') kinds = plan(mode); else { const w = { drift: 3, innovate: st0.step >= 1 ? 1.5 : .8, donor: st0.don ? 3.5 : 0, habitat: st0.hab ? 3.5 : 0 }, a = []; for (let i = 0; i < 3; i++) { const k = rng.weighted(w); if (!a.includes(k)) a.push(k); delete w[k]; if (!Object.keys(w).some(x => w[x] > 0)) break; } kinds = a.concat('drift'); }
  let best = null, bd = -1;
  for (let attempt = 0; attempt < Math.min(25, 5 * kinds.length); attempt++) {
    const kind = kinds[Math.min(kinds.length - 1, Math.floor(attempt / 5))], ai = attempt % 5, c = deepClone(g0), st = deepClone(st0), X = ecoCtx(c), m = mag * (1 + ai * .09);
    c.meta.repairs = []; c.meta.edited = true; c.meta.seed = seed; delete c.meta.evolution; delete c.meta.mutation; c.meta.parentSpecies = g0.meta.species || g0.meta.parentSpecies || null; c.meta.species = null;
    let ev = null; try {
      if (kind === 'drift') ev = evDrift(c, st, rng, X, m); else if (kind === 'module') ev = evDrift(c, st, rng, X, m, mode);
      else if (kind === 'donor') ev = evDonor(c, st, rng, X, m); else if (kind === 'habitat') ev = evHabitat(c, st, rng, X, m, o.habId); else if (kind === 'innovate') ev = evInnovate(c, st, rng, X, o.only);
    } catch (e) { ev = null; }
    if (!ev) continue; finalize(c, rng);
    if (violations(c).length || structuralAudit(c).length) continue;
    if (ai < 4 && stepJump(g0, c) > (.3 + .14 * strength) * (1 + .12 * ai)) continue;
    if (ai < 3 && flipCount(g0, c) > 5) continue;
    const d = phenoDelta(g0, c); if (d > bd) { best = { c, st, ev, d }; bd = d; } if (d >= minD || (ev.kind === 'innovation' && d >= .04) || (ev.kind === 'gene flow' && d >= .05)) break;
  }
  if (o.only && !best) throw new Error((NOV[o.only] ? NOV[o.only].n : 'That organ') + ' cannot develop any further in this body plan and habitat.');
  if (!best || best.d < (best.ev.kind === 'innovation' ? (o.only ? -1 : .015) : best.ev.kind === 'gene flow' ? -1 : minD * .35)) throw new Error('This lineage has no visible step left for that pressure. Try another mutation type, set a gene-flow donor, or Innovate.');
  const { c, st, ev } = best; st.step += 1; st.log.push({ n: st.step, k: ev.kind, t: ev.title, l: ev.lines.slice(0, 3).map(s => String(s).slice(0, 150)) }); st.log = st.log.slice(-8);
  c.meta.evo = { step: st.step, base: st.base, nov: st.nov, don: st.don, hab: st.hab ? { id: st.hab.id, p: st.hab.p, t: st.hab.t, seed: st.hab.seed, notes: st.hab.notes, base: st.hab.base, adapted: st.hab.adapted } : null, last: st.last, log: st.log };
  c.meta.name = `Evolved ${st.base} · gen ${st.step}`;
  const novs = Object.keys(st.nov).filter(k => st.nov[k] > 0).map(k => NOV[k] && NOV[k].n.toLowerCase()).filter(Boolean); c.meta.evoTraits = novs.slice(0, 8);
  c.meta.mutation = { source: g0.meta.name, modules: [], strength, shapeChange: +best.d.toFixed(4), changes: mutationChanges(g0, c), event: ev };
  return c;
}
FG.evolve = evolve; FG.NOVELTIES = NOVELTIES; FG.phenoDelta = phenoDelta;

/* ── Random = Wonder: 2–3 parents from every species, niche archetype and invented concept, crossed, given staged key innovations, adapted to the habitat ── */
const WONDER_HIST = [];
function wonderCandidate(habId, seed) {
  const rng = new RNG('wonder:' + seed), pick = () => { const x = rng.next(); return x < .6 ? 'sp:' + rng.pick(SPECIES).id : x < .8 ? 'ni:' + rng.pick(Object.keys(NICHES)) : 'inv'; };
  const A = parentFrom(pick(), habId, seed + 'a'), B = parentFrom(pick(), habId, seed + 'b'); let pre = hybridize(A, B, rng.range(.3, .7), seed), parents = 2;
  if (rng.chance(.4)) { pre = hybridize(pre, parentFrom(pick(), habId, seed + 'c'), rng.range(.2, .4), seed + 'c'); parents = 3; }
  pre.meta.habitat = habId; const X = ecoCtx(pre), nov = {};
  for (let i = rng.int(1, 2); i > 0; i--) {
    const fresh = NOVELTIES.filter(n => !nov[n.id] && n.can(pre, X)); if (!fresh.length) break; const w = {}; for (const n of fresh) w[n.id] = Math.max(.05, n.w(pre, X)), 0;
    const nv = NOV[rng.weighted(w)], stage = rng.int(2, nv.st.length); for (let s = 1; s <= stage; s++) nv.ap(pre, s, rng, X); nov[nv.id] = stage; pre.meta.hybrid.syn.push({ id: 'nov:' + nv.id, t: `Key innovation, ${nv.n}: ${nv.st[stage - 1]}.` });
  }
  const c = adaptFinish(pre, habId, seed); c.meta.evo = { step: 0, base: c.meta.name, nov, don: null, hab: null, last: null, log: [] };
  return { c, A, B, parents, key: [nounOf(A.meta.name), nounOf(B.meta.name)].sort().join('+') + Object.keys(nov).join(',') };
}
function doWonder() {
  clearTimeout(GOD.timer); clearTimeout(editTimer);
  const habId = $('selHabitat').value || 'coralReef', base = Math.floor(Math.random() * 1e9).toString(36); let best = null, bs = -1e9;
  $('selSpecies').value = ''; $('selClade').value = ''; $('selNiche').value = ''; $('seed').value = '';
  for (let i = 0; i < 12; i++) {
    try { const w = wonderCandidate(habId, base + ':' + i), c = w.c; if (violations(c).length || structuralAudit(c).length) continue;
      const score = Math.min(phenoDelta(c, w.A), phenoDelta(c, w.B)) + c.meta.hybrid.syn.length * .45 + (w.parents === 3 ? .35 : 0) - (WONDER_HIST.includes(w.key) ? 2 : 0);
      if (score > bs) { bs = score; best = w; } } catch (e) { /* unviable draw */ }
  }
  if (!best) { toast('No viable wonder this time, press Random again.'); return; }
  WONDER_HIST.push(best.key); if (WONDER_HIST.length > 24) WONDER_HIST.shift();
  setFish(best.c); toast(`${best.c.meta.name}: ${(best.c.meta.hybrid.syn.slice(-1)[0] || { t: 'a new hybrid' }).t}`);
}
/* niche pressure for the Niche menu on hybrids and evolved fish */
function pressNiche(g, ni, s) {
  const ff = new Set(ni.ff), A = (id, a) => applyAdaptation(g, id, a * s, true), up = planOf(g) === 'upright';
  if (!up) { if (ff.has('fastSwimmer')) A('speed', .6); if (ff.has('maneuverer')) A('agility', .6); if (ff.has('crevice')) A('shelter', .6); }
  if (ff.has('predator')) A('feeding', .7);
  if (ff.has('large')) setN(g, 'body.length', g.body.length * (1 + 1.2 * s));
  if (ff.has('filterFeeder')) { g.mouth.gape = lerp(g.mouth.gape, .85, s); if (!NOSNOUT(g)) g.mouth.teeth = 'rasp'; }
  if (ff.has('grazer')) { g.mouth.gape = lerp(g.mouth.gape, .2, s); if (s > .4 && !NOSNOUT(g)) g.mouth.teeth = 'molar'; }
  if (ff.has('schooler')) { g.skin.iridescence = lerp(g.skin.iridescence, .85, s); g.skin.countershade = lerp(g.skin.countershade, .85, s); }
  if (ff.has('camouflage') || ff.has('ambusher')) { if (s > .3) g.skin.pattern = 'mottle'; g.skin.patternStrength = lerp(g.skin.patternStrength, .75, s); g.skin.iridescence *= 1 - .6 * s; }
  if ((ff.has('bottomDweller') || ff.has('flatBenthic')) && !up) { g.body.ventralFlat = lerp(g.body.ventralFlat, .7, s); g.head.eyeV = lerp(g.head.eyeV, .75, s); }
  if (ff.has('deepSea')) { setN(g, 'head.eyeSize', g.head.eyeSize * (1 + .3 * s)); setN(g, 'skin.photophores', Math.max(g.skin.photophores, Math.round(20 * s))); g.skin.gloss = Math.max(g.skin.gloss, .7); }
  if (ff.has('armored')) { if (s > .4) g.skin.scale = 'plates'; g.skin.scaleSize = lerp(g.skin.scaleSize, 2, s); }
  return g;
}
function doMix() {
  if (!App.genome) return; clearTimeout(GOD.timer); clearTimeout(editTimer);
  const val = $('selMix').value; if (!val) { toast('Choose a second parent in "Mix with…" first.'); return; }
  try {
