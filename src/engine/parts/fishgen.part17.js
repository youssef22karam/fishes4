  dazzle: ['Dazzle camouflage', (P, Q) => both(P, Q, p => p.camo > .35, p => p.show > .5), g => { g.skin.pattern = 'disruptive'; g.skin.patternStrength = .85; g.skin.band = Math.max(g.skin.band, .6); g.skin.bandColor = [(g.skin.base[0] + 150) % 360, .75, .55]; return 'a broken pattern with a bright flash band confuses predators'; }, g => g.skin.pattern === 'disruptive'],
  counter: ['Counter-illumination', (P, Q) => both(P, Q, p => p.dark > .3, p => p.show > .4), g => { g.skin.photophores = Math.max(g.skin.photophores, 18); g.skin.countershade = .9; return 'silvered flanks over a light-emitting belly erase the silhouette'; }, g => g.skin.photophores >= 10],
  ribbon: ['Ribbon-fin body', (P, Q) => both(P, Q, p => p.eel > .4, p => p.eel < .1), g => { if (planOf(g) !== 'std') return null; setN(g, 'body.fineness', Math.max(g.body.fineness, lerp(g.body.fineness, 7, .6))); Object.assign(g.fins.dorsal, { shape: 'continuous', u0: .2, u1: .97 }); Object.assign(g.fins.anal, { shape: 'continuous', u1: .97 }); g.swim.mode = 'subcarangiform'; g.fins.caudal.type = 'rounded'; return 'a long body whose continuous dorsal and anal fins ripple like an eel\'s'; }, g => g.fins.dorsal.shape === 'continuous'],
  aposematic: ['Warning colours', (P, Q) => P.spiny || Q.spiny, (g, rng) => { if (!g.fins.dorsal.present) return null; g.fins.dorsal.shape = 'spines'; setN(g, 'fins.dorsal.spines', Math.max(g.fins.dorsal.spines, 9)); g.skin.accent = [rng.pick([8, 30, 48]), .85, .52]; return 'a spined dorsal fin is paired with a bright aposematic accent'; }, g => g.fins.dorsal.shape === 'spines'],
  engulfer: ['Engulfing filter-predator', (P, Q) => both(P, Q, p => p.pred > .5, p => p.filter > .4), g => { setN(g, 'mouth.gape', Math.max(g.mouth.gape, .8)); g.mouth.teeth = 'villiform'; setN(g, 'head.lengthFrac', g.head.lengthFrac * 1.08); setN(g, 'swim.freq', g.swim.freq * .8); return 'a very wide gape with fine teeth lets it gulp whole shoals'; }, g => g.mouth.gape >= .7],
  omnivore: ['Omnivore dentition', (P, Q) => both(P, Q, p => p.pred > .45, p => p.grazer > .3), g => { g.mouth.teeth = 'triangular'; setN(g, 'mouth.teethCount', Math.max(10, g.mouth.teethCount * .7)); g.mouth.protrusible = true; return 'piercing teeth are reduced and set behind a protrusible jaw, so it can grab and crop'; }, g => g.mouth.teeth === 'triangular'],
  benthicSprint: ['Low-drag benthic sprinter', (P, Q) => both(P, Q, p => p.flat > .5, p => p.fast > .5), g => { if (planOf(g) !== 'std') return null; setN(g, 'body.ventralFlat', Math.max(g.body.ventralFlat, .45)); setN(g, 'head.eyeV', Math.max(g.head.eyeV, .55)); setN(g, 'fins.pectoral.insertAngle', g.fins.pectoral.insertAngle + 15); setN(g, 'fins.pectoral.len', g.fins.pectoral.len * 1.12); return 'a flat belly and high-set eyes on a streamlined trunk; broad pectorals brace it against current'; }, g => g.body.ventralFlat >= .4],
  mudwalk: ['Walking fins', (P, Q) => both(P, Q, p => p.flat > .4, p => p.surface > .5), g => { if (planOf(g) !== 'std') return null; g.fins.pectoral.shape = 'limb'; g.fins.pectoral.opacity = 1; setN(g, 'head.eyeV', Math.max(g.head.eyeV, .85)); return 'muscular limb-like pectorals and periscope eyes let it prop itself at the water line'; }, g => g.fins.pectoral.shape === 'limb'],
  flash: ['Flash shoaling', (P, Q) => both(P, Q, p => p.show > .45, p => p.school > .5), g => { g.skin.pattern = 'stripes'; g.skin.iridescence = 1; g.skin.countershade = Math.max(g.skin.countershade, .85); return 'bold stripes over mirror-bright flanks make a shoal flicker as it turns'; }, g => g.skin.pattern === 'stripes'],
  ambushSprint: ['Ambush-sprinter', (P, Q) => both(P, Q, p => p.camo > .35, p => p.fast > .5), g => { g.skin.pattern = 'saddles'; g.skin.patternStrength = Math.max(g.skin.patternStrength, .6); setN(g, 'body.keel', Math.max(g.body.keel, .4)); return 'saddle camouflage hides it until a powerful tail launches the strike'; }, g => g.skin.pattern === 'saddles'],
  glass: ['Glass tissue', (P, Q) => P.glass > .35 || Q.glass > .35, (g, rng, P, Q) => { setN(g, 'skin.translucency', Math.max(g.skin.translucency, Math.max(P.glass, Q.glass) * .8)); g.skin.belly[2] = Math.max(g.skin.belly[2], .9); return 'pigment-poor, watery tissue shows through the skin'; }, g => g.skin.translucency >= .25],
  biocamo: ['Living-light camouflage', (P, Q) => both(P, Q, p => p.dark > .3, p => p.camo > .35), g => { g.skin.photophores = Math.max(g.skin.photophores, 14); g.skin.pattern = 'mottle'; return 'a mottled skin dotted with light organs matches the flicker of its surroundings'; }, g => g.skin.photophores >= 8 && g.skin.pattern === 'mottle'],
  sailrun: ['Sail runner', (P, Q) => both(P, Q, p => p.fast > .5, p => p.sail > 0), g => { if (planOf(g) !== 'std' || !g.fins.dorsal.present) return null; g.fins.dorsal.shape = 'sail'; setN(g, 'fins.dorsal.height', Math.max(g.fins.dorsal.height, .9)); g.fins.dorsal.u0 = Math.min(g.fins.dorsal.u0, .15); g.fins.dorsal.u1 = Math.max(g.fins.dorsal.u1, .55); return 'a tall sail raised on a fast, slim body steers shoals of prey'; }, g => g.fins.dorsal.shape === 'sail'],
  whisker: ['Whisker net', (P, Q) => both(P, Q, p => p.whisker > .4, p => p.dark > .3), g => { if (['beak', 'tube'].includes(g.mouth.type)) return null; setN(g, 'head.barbels', Math.max(g.head.barbels, 3)); setN(g, 'head.barbelLen', Math.max(g.head.barbelLen, .6)); g.skin.lateralLine = 1; return 'long barbels and a full lateral line feel prey in the dark'; }, g => g.head.barbels >= 2]
};
/**
 * Cross two genomes. The chassis parent keeps the structural body plan (axis, tail, fins, gills); every other organ is inherited as a unit from whichever
 * parent expresses it more distinctively, then coupled trade-off traits emerge. Structural organs never move between incompatible plans.
 */
function hybridize(A, B, ratio, seed) {
  const rng = new RNG('hyb:' + seed + ':' + ratio), wB = clamp(ratio + rng.gauss() * .07, .03, .97), bIsC = rng.chance(wB);
  const C = bIsC ? B : A, D = bIsC ? A : B, wC = bIsC ? wB : 1 - wB, wD = 1 - wC, cp = planOf(C), dp = planOf(D), compat = cp === dp, g = deepClone(C), organs = {}, dec = {};
  const take = (id, fromD, mode) => {
    const src = fromD ? D : C, oth = fromD ? C : D, w = mode === 'blend' ? rng.range(.2, .48) : mode === 'over' ? -rng.range(.1, .22) : 0;
    for (const p of ORG_PATHS[id] || []) {
      const e = SCHEMA[p], vs = getP(src, p), vo = getP(oth, p);
      if (e.t === 'n' || e.t === 'i') setN(g, p, w > 0 ? blendN(p, vs, vo, w) : w < 0 ? vs + (vs - vo) * -w : vs);
      else if (e.t === 'hsl') setP(g, p, w > 0 ? mixC(vs, vo, w) : vs.slice()); else setP(g, p, cp3(vs));
    }
  };
  const hardHead = x => ['hammer', 'bill', 'sword'].includes(x.head.special), headUnit = hardHead(C) || hardHead(D), headFromD = headUnit ? (hardHead(D) && !hardHead(C) ? rng.chance(.5 + .35 * (wD - .5)) : hardHead(C) && !hardHead(D) ? rng.chance(wD * .35) : rng.chance(wD)) : false;
  for (const [id, kind] of ORGAN_DEFS) {
    if (id === 'gills' || id === 'palette' || id === 'body') continue;
    const blocked = kind === 'struct' && !compat, sC = signature(C, id), sD = signature(D, id); let fromD = false, mode = 'whole';
    if (!blocked) {
      if (headUnit && ['face', 'jaw', 'ornament', 'eye'].includes(id)) { fromD = headFromD; mode = 'whole'; }
      else if (id === 'face' && dec.jaw !== undefined && rng.chance(.65)) fromD = dec.jaw; else if (id === 'anal' && dec.dorsal !== undefined && rng.chance(.7)) fromD = dec.dorsal;
      else fromD = rng.chance(clamp(wD + rng.gauss() * .06 + .22 * (sD - sC), .04, .96));
      if (!(headUnit && ['face', 'jaw', 'ornament', 'eye'].includes(id))) mode = fromD ? rng.weighted({ whole: 4.5, blend: 3.6, over: .9 }) : rng.weighted({ whole: 5.5, blend: 3.5, over: .5 }); take(id, fromD, mode);
    }
    dec[id] = fromD; organs[id] = { from: blocked ? 'plan' : fromD ? 'donor' : 'chassis', mode: blocked ? '-' : mode, sig: [+sC.toFixed(2), +sD.toFixed(2)] };
  }
  const tBody = clamp(wD + rng.gauss() * .06, .04, .96), simple = x => ['std', 'ribbon', 'molid'].includes(x);
  for (const p of ORG_PATHS.body) {
    const vc = getP(C, p), vd = getP(D, p);
    if (compat) setN(g, p, blendN(p, vc, vd, tBody)); else if (['body.fineness', 'body.width', 'body.snoutDepth'].includes(p) && simple(cp) && simple(dp)) setN(g, p, blendN(p, vc, vd, tBody * .38));
  }
  organs.body = { from: compat ? 'blend' : 'plan', mode: compat ? 'blend' : 'pull', sig: [+signature(C, 'body').toFixed(2), +signature(D, 'body').toFixed(2)] };
  if (dec.tail) for (const p of ['body.pedDepth', 'body.pedWidth', 'body.pedU', 'body.tailTaper', 'body.backPow', 'body.superNTail']) setN(g, p, blendN(p, getP(g, p), getP(D, p), .55));
  /* palette: one parent supplies the body colour, the other re-appears as accent, belly tint and fins */
  const palD = rng.chance(clamp(wD + .2 * (signature(D, 'palette') - signature(C, 'palette')), .05, .95)), P1 = palD ? D : C, P2 = palD ? C : D;
  g.skin.base = mixC(P1.skin.base, P2.skin.base, rng.range(.18, .42)); g.skin.belly = mixC(P1.skin.belly, P2.skin.belly, .35 + rng.range(-.1, .15)); g.skin.accent = mixC(P2.skin.accent, P2.skin.base, .5);
  if (Math.abs(g.skin.accent[2] - g.skin.base[2]) < .18) g.skin.accent[2] = clamp(g.skin.base[2] + (g.skin.base[2] > .5 ? -.3 : .3), .05, .95);
  g.skin.fin = mixC(dec.dorsal ? D.skin.fin : C.skin.fin, dec.dorsal ? C.skin.fin : D.skin.fin, .25); organs.palette = { from: palD ? 'donor' : 'chassis', mode: 'blend', sig: [+signature(C, 'palette').toFixed(2), +signature(D, 'palette').toFixed(2)] };
  const pc = C.skin.pattern, pd = D.skin.pattern;
  if (pc !== pd && pc !== 'none' && pd !== 'none') { const keep = g.skin.pattern, other = keep === pc ? pd : pc; g.skin.band = Math.max(g.skin.band, .55); g.skin.bandColor = mixC(P2.skin.accent, P2.skin.base, .4); if (other !== keep) g.meta.layered = other; }
  g.skin.electric = !!(A.skin.electric || B.skin.electric); g.skin.inflate = !!(A.skin.inflate || B.skin.inflate && g.body.width >= .5);
  g.meta = Object.assign({}, C.meta, { seed: String(seed), surfaceSeed: String(seed), species: null, parentSpecies: null, repairs: [], edited: true, novel: true, adapted: C.meta.adapted || null, parents: [A.meta.name, B.meta.name] });
  for (const k of ['evolution', 'mutation', 'notes', 'adaptBase', 'evo', 'layered', 'adaptDone', 'evoTraits']) delete g.meta[k];
  /* emergent trade-off traits: only appear when the two parents really conflict or complement each other */
  const P = AX(A), Q = AX(B), syn = [], order = shuffle(rng, Object.keys(SYN));
  for (const id of order) { if (syn.length >= 4) break; const s = SYN[id]; if (!s[1](P, Q)) continue; const t = s[2](g, rng, P, Q); if (t) syn.push({ id, t: s[0] + ': ' + t + '.' }); }
  if (Math.abs(P.size - Q.size) > .4) syn.push({ id: 'size', t: `Size compromise: ${A.body.length.toFixed(2)} m × ${B.body.length.toFixed(2)} m settles at ${g.body.length.toFixed(2)} m (geometric blend).` });
  const chain = [].concat(A.meta.hybrid ? A.meta.hybrid.chain : [A.meta.name], B.meta.hybrid ? B.meta.hybrid.chain : [B.meta.name]);
  const nounsOf = X => X.meta.hybrid && X.meta.hybrid.nouns && X.meta.hybrid.nouns.length ? X.meta.hybrid.nouns : [nounOf(X.meta.name)];
  let nouns = [...new Set([...nounsOf(A), ...nounsOf(B)])]; if (nouns.length > 3) nouns = [nouns[0], nouns[1], nouns[nouns.length - 1]];
  g.meta.name = nouns.join('-');
  g.meta.hybrid = { a: A.meta.name, b: B.meta.name, nouns, na: nouns[0], nb: nouns[nouns.length - 1], ratio: +ratio.toFixed(2), chassis: C.meta.name, plan: cp, donorPlan: dp, compat, organs, syn, chain: chain.slice(0, 6) };
  return g;
}
/* ── habitat syndromes: the habitat's physical factors × the fish's own ecological role → coupled anatomical changes ── */
const ROLE_TXT = { ambush: 'ambush predator', hunter: 'pursuit hunter', school: 'shoaling forager', grazer: 'grazer', filter: 'filter feeder', bottom: 'bottom dweller', armor: 'armoured browser', ribbon: 'ribbon-bodied lurker', upright: 'upright hoverer', display: 'display fish', generalist: 'generalist' };
function roleOf(g) {
  const P = AX(g), r = { ambush: P.pred * (.3 + P.camo * .8 + (1 - P.fast) * .5 + P.flat * .3), hunter: P.pred * (.25 + P.fast * 1.1), school: (1 - P.pred) * (.2 + P.school), grazer: P.grazer * 1.1, filter: P.filter * 1.2, bottom: P.flat * .95, armor: P.armor * .85, ribbon: P.eel, upright: g.body.posture > 45 ? 2 : 0, display: P.show * .8 };
  const order = Object.keys(r).sort((a, b) => r[b] - r[a]); return { top: r[order[0]] > .12 ? order[0] : 'generalist', second: r[order[1]] > .12 ? order[1] : order[0], r };
}
const PAL_PULL = { openOcean: .6, mesopelagic: .7, abyssal: .85, hadal: .7, sandFlat: .6, polar: .5, kelpForest: .45, rockyShore: .4, seagrass: .5, mangrove: .5, brackish: .45, fastRiver: .45, slowRiver: .5, mountainStream: .45, lake: .45, blackwater: .5, floodplain: .35, cave: .8, coralReef: .12, deepReef: .25, lavaLake: .9, skySea: .5, crystalCavern: .6, void: .9 };
function adaptHab(g, hab, rng) {
  const touched = {}, notes = [], tag = new Set(g.meta.tags || []), keep = p => { if (!(p in touched)) touched[p] = cp3(getP(g, p)); };
  const M = (p, f) => { keep(p); setN(g, p, getP(g, p) * f); }, Dd = (p, d) => { keep(p); setN(g, p, getP(g, p) + d); }, S = (p, v) => { keep(p); setP(g, p, cp3(v)); }, Lm = (p, l) => { keep(p); const c2 = getP(g, p).slice(); c2[2] = clamp(c2[2] * l, .02, .96); setP(g, p, c2); };
  const R = roleOf(g), P = AX(g), role = R.top, plan = planOf(g), upright = plan === 'upright';
  const H = { dark: clamp(1 - Math.pow(hab.light, .35), 0, 1), deep: hab.tags.includes('deep'), cold: hab.tags.includes('cold') || ['abyssal', 'hadal'].includes(hab.id), flow: { fastRiver: 1, mountainStream: 1, slowRiver: .3, rockyShore: .5, kelpForest: .25 }[hab.id] || 0,
    cover: ['coralReef', 'kelpForest', 'mangrove', 'floodplain', 'blackwater', 'crystalCavern', 'deepReef', 'rockyShore', 'seagrass'].includes(hab.id), open: hab.floor === false, bottom: hab.tags.includes('benthic') || ['abyssal', 'hadal', 'sandFlat', 'cave', 'deepReef'].includes(hab.id), turbid: hab.fog > .1 && hab.light < .7 && !hab.fantasy };
  notes.push(`Ecological role here: ${ROLE_TXT[role]}${R.second !== role ? ', with ' + ROLE_TXT[R.second] + ' tendencies' : ''}.`);
  if (H.dark > .25) {
    if (['bottom', 'grazer', 'ribbon', 'armor'].includes(role) || tag.has('cave')) { M('head.eyeSize', 1 - .55 * H.dark); S('skin.lateralLine', 1); if (!['beak', 'tube'].includes(g.mouth.type)) { Dd('head.barbels', Math.round(2 * H.dark)); S('head.barbelLen', Math.max(g.head.barbelLen, .6)); } if (H.dark > .9 && tag.has('cave')) S('head.eyeSide', 'none'); notes.push('Little light reaches the bottom: eyes shrink while a full lateral line and barbels take over sensing.'); }
    else if (role === 'ambush' && H.dark > .55 && !upright) { S('head.special', 'esca'); S('head.specialLen', .22 + .4 * P.pred); S('head.specialWidth', .05); S('skin.photophores', Math.max(g.skin.photophores, 10)); S('skin.glow', [185, .9, .65]); M('mouth.gape', 1.2); if (!['beak', 'tube'].includes(g.mouth.type)) { S('mouth.teeth', 'needle'); S('mouth.teethCount', Math.max(g.mouth.teethCount, 30)); } notes.push('Sit-and-wait predator in the dark: a glowing lure, a wider gape and needle teeth.'); }
    else if (role === 'hunter' && H.dark > .45) { M('head.eyeSize', 1 + .6 * H.dark); M('mouth.gape', 1 + .35 * H.dark); if (!['beak', 'tube'].includes(g.mouth.type)) S('mouth.teeth', 'fang'); S('skin.photophores', Math.round(14 + 30 * H.dark)); S('skin.glow', [rng.range(185, 215), 1, .62]); S('skin.iridescence', 0); Lm('skin.base', .55); notes.push('Dark-water hunter: huge light-gathering eyes, fang-like teeth and a row of belly photophores.'); }
    else if (H.dark > .35) { S('skin.photophores', Math.round(18 + 40 * H.dark * (1 - P.armor * .6))); S('skin.glow', [rng.range(185, 215), 1, .62]); M('head.eyeSize', 1 + .7 * H.dark); S('skin.countershade', .3); Lm('skin.base', .6); notes.push('Counter-illumination: belly light organs match the faint glow from above, and the eyes grow large.'); }
    else { M('head.eyeSize', 1 + H.dark); S('skin.eye', [165, .85, .5]); M('skin.iridescence', 1 - .6 * H.dark); notes.push('Eyes enlarge and gain a reflective layer; the skin sheen is dulled.'); }
    if (H.deep && H.dark > .6 && !upright) { S('skin.translucency', clamp(.2 + .45 * (1 - P.armor), 0, .7)); M('swim.freq', .55); M('fins.dorsal.height', .8); M('body.width', 1.15); S('skin.gloss', .8); notes.push('Food is scarce at depth: watery, low-density tissues and slow strokes save energy.'); }
  }
  if (H.cold) { M('body.length', 1.12); M('skin.iridescence', .6); if (['bottom', 'ambush', 'hunter'].includes(role)) { Dd('skin.translucency', .12); Lm('skin.base', 1.25); } notes.push('Cold water: a larger body, dulled sheen and paler pigment.'); }
  if (H.flow > .3 && !upright) { M('body.fineness', 1 + .18 * H.flow); M('body.pedDepth', 1 - .2 * H.flow); M('fins.pectoral.len', 1 + .3 * H.flow); Dd('body.ventralFlat', .3 * H.flow); Dd('fins.pectoral.insertAngle', 25 * H.flow); M('swim.freq', 1 + .25 * H.flow); notes.push('Fast water: a streamlined trunk, narrow tail root and broad pectorals that pin the body to the bottom.'); }
  if (H.cover && !upright) { M('body.fineness', .87); M('fins.pectoral.len', 1.2); M('fins.caudal.aspect', .85); if (role === 'ambush' || role === 'bottom') { S('skin.pattern', 'disruptive'); S('skin.patternStrength', Math.max(g.skin.patternStrength, .75)); S('skin.patternScale', 1.4); notes.push('Structured habitat: a deeper body, rowing fins and a broken pattern that dissolves against rock and weed.'); } else if (role === 'school') { S('skin.pattern', 'stripes'); notes.push('Structured habitat: a deeper body, rowing fins and vertical-flicker stripes for shoaling among obstacles.'); } else { if (rng.chance(.5)) S('skin.pattern', rng.pick(['bars', 'mottle', 'stripes'])); S('skin.patternStrength', Math.max(g.skin.patternStrength, .65)); notes.push('Structured habitat: a deeper, more manoeuvrable body, rowing fins and bolder markings.'); } if (hab.id === 'coralReef' || hab.id === 'deepReef') Dd('skin.iridescence', .25); }
  if (H.open && H.dark < .5 && !upright) { M('body.fineness', 1.12); S('skin.countershade', .85); Dd('skin.iridescence', .25); M('fins.caudal.aspect', 1.15); M('fins.dorsal.height', .88); notes.push('Open water: a sleeker body, silvered counter-shaded skin and a higher-aspect tail.'); }
  if (H.bottom && !upright) { Dd('body.ventralFlat', .3); Dd('head.eyeV', .18); if (H.deep) M('fins.pelvic.len', 1.5); notes.push('Bottom-hugging form: flattened belly and upward-set eyes' + (H.deep ? ', pelvic fins lengthened into stilts.' : '.')); }
  if (H.turbid && H.dark < .6) { if (['bottom', 'grazer', 'armor'].includes(role) && !['beak', 'tube'].includes(g.mouth.type)) { Dd('head.barbels', 2); S('head.barbelLen', Math.max(g.head.barbelLen, .45)); } S('skin.lateralLine', 1); M('head.eyeSize', .9); if (['school', 'display', 'generalist', 'hunter'].includes(role) && !upright) { S('mouth.type', 'superior'); Dd('body.dorsalFlat', .25); notes.push('Murky surface water: an upturned mouth for the surface film and an enhanced lateral line.'); } else notes.push('Murky water: touch-sensing barbels and a full lateral line replace sight.'); }
  const FX = {
    lavaLake: () => { S('skin.scale', 'plates'); S('skin.photophores', 26); S('skin.glow', [25, 1, .55]); if (g.fins.dorsal.present) S('fins.dorsal.shape', 'spines'); S('skin.base', [10, .3, .08]); S('skin.belly', [18, .9, .45]); return 'Ember form: heat-proof plates, a glowing belly and a spined crest.'; },
    skySea: () => { if (!upright) { S('fins.pectoral.shape', 'wing'); S('fins.pectoral.len', Math.max(g.fins.pectoral.len, 1.9)); S('fins.pectoral.insertAngle', 10); } S('skin.translucency', .6); S('skin.iridescence', 1); return 'Sky form: wing-like pectorals, translucent skin and a rainbow sheen.'; },
    crystalCavern: () => { S('skin.scale', 'plates'); S('skin.translucency', .75); S('skin.gloss', 1); S('skin.iridescence', 1); S('skin.photophores', 10); S('skin.glow', [285, .8, .7]); return 'Crystal form: faceted translucent plates that refract glow.'; },
    void: () => { M('head.eyeSize', 1.6); S('skin.photophores', 60); S('skin.glow', [275, 1, .7]); S('skin.base', [265, .3, .04]); S('skin.belly', [265, .3, .08]); if (!['beak', 'tube'].includes(g.mouth.type)) { S('head.barbels', 4); S('head.barbelLen', 1.2); } return 'Void form: huge eyes, near-black skin, a star-field of lights and long sensory barbels.'; }
  };
  if (FX[hab.id]) notes.push(FX[hab.id]());
  if (['cave', 'mountainStream', 'rockyShore', 'coralReef', 'seagrass'].includes(hab.id) && g.body.length > .9) { M('body.length', .6); notes.push('A small, structured habitat caps body size.'); } else if (hab.id === 'openOcean' && g.body.length < .4) M('body.length', 1.25);
  /* palette: functional colour (camouflage) is pulled strongly toward the habitat; reef colour hardly at all */
  const k = clamp((PAL_PULL[hab.id] || .4) * (.6 + .5 * (P.camo + H.dark * .5)), .1, .9), hr = rng.pick(hab.pal.h), th = rng.range(hr[0], hr[1]), tl = (hab.pal.l[0] + hab.pal.l[1]) / 2, ts = (hab.pal.s[0] + hab.pal.s[1]) / 2;
  for (const [p, w] of [['skin.base', 1], ['skin.accent', .6], ['skin.fin', .75], ['skin.belly', .5]]) { keep(p); const c2 = getP(g, p).slice(), dh = ((th - c2[0] + 540) % 360) - 180; c2[0] = (c2[0] + dh * k * w + 360) % 360; c2[1] = clamp(lerp(c2[1], Math.min(c2[1], ts * 1.35 + .1), k * .6 * w), 0, 1); if (p !== 'skin.belly') c2[2] = clamp(lerp(c2[2], tl, (.3 * H.dark + .1) * k), .03, .95); setP(g, p, c2); }
  const ba = g.skin.base, ac = g.skin.accent; if (Math.abs(ac[2] - ba[2]) < .14) S('skin.accent', [ac[0], ac[1], clamp(ba[2] + (ba[2] > .45 ? -.28 : .28), .05, .95)]);
  notes.push(`Colour is pulled ${Math.round(k * 100)}% toward the ${hab.n.toLowerCase()} palette.`);
  g.meta.adapted = { from: (g.meta.adapted && g.meta.adapted.from) || g.meta.habitat, to: hab.id, speculative: false }; g.meta.habitat = hab.id;
  return { notes, touched };
}
function nameHybrid(c, hab) { if (!c.meta.hybrid) return; const h = c.meta.hybrid, ad = HAB_ADJ[hab.id] || hab.n.toLowerCase(); c.meta.name = (ad.charAt(0).toUpperCase() + ad.slice(1) + ' ' + (h.nouns || [h.na, h.nb]).join('-')).trim(); c.meta.sci = 'Chimaerichthys ' + h.na.slice(0, 4) + h.nb.slice(0, 4) + 'ensis (hybrid concept)'; }
// @@PART js/app.part17.js (17/19) lines 3391-3568 of the original module script -- stripped by build.mjs
/** Adapt an unfinalised genome to a habitat, repair, audit and name it (retries with fresh draws if anything is unsound). */
function adaptFinish(pre, habId, seed) {
  const hab = HABITATS[habId]; let c;
  for (let i = 0; i < 4; i++) {
    c = deepClone(pre); c.meta.repairs = []; const r2 = new RNG('adapt:' + seed + habId + i);
    c.meta.adapted = { from: pre.meta.adapted ? pre.meta.adapted.from : pre.meta.habitat, to: habId, speculative: false }; c.meta.habitat = habId; finalize(c, r2);
    const res = adaptHab(c, hab, r2); c.meta.notes = res.notes; c.meta.adaptBase = res.touched; c.meta.repairs = []; finalize(c, r2);
    if (c.meta.hybrid) c.meta.hybrid.syn = c.meta.hybrid.syn.filter(s => !SYN[s.id] || SYN[s.id][3](c));
    if (!violations(c).length && !structuralAudit(c).length) break;
    if (i === 2) { pre = deepClone(pre); pre.head.special = 'none'; pre.head.specialLen = SCHEMA['head.specialLen'].def; }
  }
  nameHybrid(c, hab); return c;
}
/** Re-adapt to another habitat from the pre-adaptation state, so habitat changes never compound. */
function rehabitat(g, habId) {
  const pre = deepClone(g), base = g.meta.adaptBase; if (base) for (const p in base) if (SCHEMA[p]) setP(pre, p, cp3(base[p]));
  return adaptFinish(pre, habId, Math.random().toString(36).slice(2, 8));
}
function parentFrom(val, habId, seed) {
  const [k, id] = val.split(':');
  if (k === 'sp') { const s = SPECIES.find(x => x.id === id); return generate({ species: id, habitat: s.habitat, seed, noAdapt: true }); }
  if (k === 'ni') { let best = null, bw = 0; for (const h in HABITATS) { const w = HABITATS[h].niches[id] || 0; if (w > bw) { bw = w; best = h; } } return generate({ niche: id, habitat: best || habId, noSpecies: true, seed }); }
  return invent(habId, seed);
}

/* ── phenotype distance: every evolutionary event must change something visible ── */
function phenoDelta(a, b) {
  let s = 0;
  for (const p in SCHEMA) {
    const e = SCHEMA[p], x = getP(a, p), y = getP(b, p);
    if (e.t === 'n' || e.t === 'i') s += (/^(fins|body|head|mouth)\./.test(p) ? 1 : .6) * Math.min(.5, Math.abs(x - y) / Math.max(1e-6, e.max - e.min));
    else if (e.t === 'hsl') s += .5 * Math.abs(((x[0] - y[0] + 540) % 360) - 180) / 180 + .25 * Math.abs(x[1] - y[1]) + .25 * Math.abs(x[2] - y[2]);
    else if (x !== y) s += .12;
  }
  return s;
}
const mx = (g, p, v) => setN(g, p, Math.max(getP(g, p), v)), mn = (g, p, v) => setN(g, p, Math.min(getP(g, p), v));
const NOSNOUT = g => ['beak', 'tube'].includes(g.mouth.type), STDLIKE = X => ['std', 'flat', 'ribbon', 'pipe', 'chimaera', 'rigid'].includes(X.plan);
/** Key innovations: each develops through stages (bud → working organ → elaborated), only where the fish's ecology and body plan allow it. */
const NOVELTIES = [
  { id: 'lure', n: 'Glowing lure', st: ['a fleshy bud sprouts on the snout', 'the bud lengthens into a flexible rod', 'the rod ends in a luminous bulb'], can: (g, X) => !['esca', 'bill', 'sword', 'hammer'].includes(g.head.special) && STDLIKE(X) && (X.role === 'ambush' || X.role === 'bottom' || X.dark > .3), w: (g, X) => .6 + (X.role === 'ambush' ? 2.2 : 0) + X.dark * 2, ap: (g, s, r, X) => { g.head.special = 'esca'; setN(g, 'head.specialLen', [.1, .24, .4][s - 1]); setN(g, 'head.specialWidth', [.03, .042, .055][s - 1]); if (s >= 2 && X.dark > .12) { mx(g, 'skin.photophores', s * 7); g.skin.glow = [r.range(170, 200), .9, .65]; } if (s === 3) mx(g, 'mouth.gape', .55); } },
  { id: 'barbels', n: 'Sensory barbels', st: ['two short taste-buds appear at the lip', 'the barbels lengthen', 'a full whisker set senses prey by touch'], can: (g, X) => !NOSNOUT(g) && STDLIKE(X) && g.head.barbels < 4 && (['bottom', 'grazer', 'ambush', 'ribbon'].includes(X.role) || X.dark > .3 || X.turbid), w: (g, X) => .8 + (X.role === 'bottom' ? 1.6 : 0) + X.dark * 1.5, ap: (g, s) => { mx(g, 'head.barbels', [2, 2, 4][s - 1]); mx(g, 'head.barbelLen', [.3, .55, .85][s - 1]); if (s === 3) g.skin.lateralLine = 1; } },
  { id: 'photo', n: 'Light organs', st: ['a few light organs dot the belly', 'rows of photophores form along the flanks', 'a dense constellation of lights covers the body'], can: (g, X) => (X.dark > .25 || X.fantasy) && g.skin.photophores < 50, w: (g, X) => .6 + X.dark * 2.6, ap: (g, s, r) => { mx(g, 'skin.photophores', [8, 22, 44][s - 1]); if (s === 1) g.skin.glow = [r.range(170, 215), .95, .62]; if (s === 3) mn(g, 'skin.gloss', 1); } },
  { id: 'armor', n: 'Bony armour', st: ['scales thicken and gloss over', 'ridged scutes run along the keel', 'interlocking armour plates cover the flanks'], can: (g, X) => STDLIKE(X) && g.skin.scale !== 'plates' && X.plan !== 'ribbon', w: (g, X) => .5 + (X.role === 'armor' ? 2 : 0) + (X.role === 'bottom' ? 1 : 0) - X.P.fast * .3, ap: (g, s) => { if (s === 1) { setN(g, 'skin.scaleSize', g.skin.scaleSize * 1.25); mx(g, 'skin.gloss', .55); } if (s === 2) { g.skin.scale = 'scutes'; mx(g, 'body.keel', .7); } if (s === 3) { g.skin.scale = 'plates'; setN(g, 'skin.scaleSize', Math.max(1.8, g.skin.scaleSize)); for (const k of ['dorsal', 'anal', 'pectoral', 'caudal']) g.fins[k].flex = Math.min(g.fins[k].flex, .35); } } },
  { id: 'sail', n: 'Sail fin', st: ['the dorsal fin lifts and sweeps back', 'the fin extends into a tall crest', 'a full display sail fans open'], can: (g, X) => STDLIKE(X) && g.fins.dorsal.present && g.fins.dorsal.shape !== 'sail' && g.fins.dorsal.height < 1.3, w: (g, X) => .6 + X.P.show * 1.5 + (X.role === 'display' ? 1.5 : 0), ap: (g, s, r) => { if (s === 1) { g.fins.dorsal.shape = g.fins.dorsal.shape === 'spines' ? 'spines' : 'falcate'; setN(g, 'fins.dorsal.height', g.fins.dorsal.height * 1.3); } if (s === 2) setN(g, 'fins.dorsal.height', Math.max(g.fins.dorsal.height * 1.25, .8)); if (s === 3) { g.fins.dorsal.shape = 'sail'; mx(g, 'fins.dorsal.height', 1); g.fins.dorsal.u0 = Math.min(g.fins.dorsal.u0, .18); g.fins.dorsal.u1 = Math.max(g.fins.dorsal.u1, .6); g.skin.fin = [(g.skin.base[0] + r.range(120, 200)) % 360, .75, .5]; } } },
