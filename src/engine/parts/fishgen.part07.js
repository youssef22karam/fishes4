RULE('pectoral_base', 'Pectoral base ≤ 0.9 × local depth, behind operculum', (g, lm, log) => { clampLog(g, log, 'pectoral_base', 'fins.pectoral.baseLen', 0.03, 0.9); clampLog(g, log, 'pectoral_base', 'fins.pectoral.u', 0, 1); });
RULE('pelvic_ventral', 'Pelvics use ventral landmarks; true eel clades lack pelvics', (g, lm, log) => { if (cladeTags(g.meta.clade).has('eelLike') && g.fins.pelvic.present) setLog(g, log, 'pelvic_ventral', 'fins.pelvic.present', false); });
RULE('tail_swim_coherence', 'Caudal type consistent with swim mode', (g, lm, log) => { const ok = SWIM_TAILS[g.swim.mode] || CAUDAL_TYPES; if (g.fins.caudal.present && !ok.includes(g.fins.caudal.type)) setLog(g, log, 'tail_swim_coherence', 'fins.caudal.type', ok[0]); });
RULE('caudal_aspect', 'Caudal aspect ratio bounded by its type', (g, lm, log) => { const ar = CAUDAL_AR[g.fins.caudal.type]; if (ar) clampLog(g, log, 'caudal_aspect', 'fins.caudal.aspect', ar[0], ar[1]); });
RULE('caudal_len', 'Caudal length bounded by type', (g, lm, log) => { clampLog(g, log, 'caudal_len', 'fins.caudal.len', 0.03, caudalLenMax(g)); });
RULE('caudal_vs_peduncle', 'Caudal span ≥ 1.1 × peduncle depth; peduncle compatible with tail', (g, lm, log) => {
  const c2 = g.fins.caudal; if (!c2.present) return; const ped = bodyProfile(g).depth(0.999);
  const need = 1.1 * ped; if (c2.aspect * c2.len < need) { const ar = CAUDAL_AR[c2.type]; const a2 = Math.min(ar[1], need / c2.len); if (a2 > c2.aspect) setLog(g, log, 'caudal_vs_peduncle', 'fins.caudal.aspect', +a2.toFixed(3)); if (g.fins.caudal.aspect * c2.len < need) { const l2 = Math.min(caudalLenMax(g), need / g.fins.caudal.aspect); if (l2 > c2.len) setLog(g, log, 'caudal_vs_peduncle', 'fins.caudal.len', +l2.toFixed(3)); } if (g.fins.caudal.aspect * g.fins.caudal.len < need - 1e-6) { const ratio = (g.fins.caudal.aspect * g.fins.caudal.len) / need; clampLog(g, log, 'caudal_vs_peduncle', 'body.pedDepth', 0.03, Math.max(0.03, g.body.pedDepth * ratio * 0.98)); } }
  if (c2.type === 'lunate' || c2.type === 'forked') clampLog(g, log, 'caudal_vs_peduncle', 'body.pedDepth', 0.03, 0.35);
});
RULE('fineness_swim', 'Fineness ratio consistent with swim mode and body plan', (g, lm, log) => { const m = g.swim.mode; if (m === 'thunniform') clampLog(g, log, 'fineness_swim', 'body.fineness', 3.8, 17); else if (m === 'anguilliform' && g.body.roll === 0) clampLog(g, log, 'fineness_swim', 'body.fineness', 4.8, 17); else if (m === 'ostraciiform') clampLog(g, log, 'fineness_swim', 'body.fineness', 1.25, 4.5); });
RULE('swim_params', 'Wave envelope matches swim mode', (g, lm, log) => { const m = g.swim.mode; if (m === 'anguilliform') { clampLog(g, log, 'swim_params', 'swim.ampHead', 0.25, 1); clampLog(g, log, 'swim_params', 'swim.waveK', 1.2, 3); } else if (m === 'thunniform') { clampLog(g, log, 'swim_params', 'swim.ampHead', 0, 0.08); clampLog(g, log, 'swim_params', 'swim.envPow', 4, 16); } else if (m === 'carangiform') clampLog(g, log, 'swim_params', 'swim.ampHead', 0, 0.2); else if (m === 'ostraciiform') clampLog(g, log, 'swim_params', 'swim.envPow', 8, 16); else if (m === 'rajiform' || m === 'hippocampiform') clampLog(g, log, 'swim_params', 'swim.amp', 0, 0.03); });
RULE('eye_in_head', 'Eyes symmetric, inside the head, not larger than local depth', (g, lm, log) => { const bp = bodyProfile(g), h = g.head.lengthFrac; clampLog(g, log, 'eye_in_head', 'head.eyeU', 0.15, 0.92); clampLog(g, log, 'eye_in_head', 'head.eyeV', -0.7, 0.98); const maxE = 0.42 * bp.depth(h * g.head.eyeU) / h; clampLog(g, log, 'eye_in_head', 'head.eyeSize', 0.05, Math.max(0.05, maxE)); });
RULE('eye_mouth_clearance', 'Eye sits clear above the jaw line and below the dorsal profile', (g, lm, log) => {
  if (g.head.eyeSide === 'none' || g.body.roll !== 0) return;
  if (g.head.special === 'hammer') { clampLog(g, log, 'eye_mouth_clearance', 'head.eyeV', -.1, .3); return; }
  const bp = bodyProfile(g), h = g.head.lengthFrac, d = bp.depth(h * g.head.eyeU); if (!(d > 0)) return;
  const mt = MOUTH_LINE[g.mouth.type] || MOUTH_LINE.terminal, dUp = d * g.body.dorsalFrac, dDn = d * (1 - g.body.dorsalFrac);
  const topF = Math.max(mt[0], mt[1]), mouthTop = topF >= 0 ? topF * dUp : topF * dDn, scale = Math.max(1e-6, d * g.body.dorsalFrac * 0.7);
  let eyeR = g.head.eyeSize * h * 0.5;
  const room = dUp * 0.96 - mouthTop - 0.1 * d;
  if (2 * eyeR > room * 0.92) { clampLog(g, log, 'eye_mouth_clearance', 'head.eyeSize', 0.05, Math.max(0.05, room * 0.92 / h)); eyeR = g.head.eyeSize * h * 0.5; }
  const vMin = (mouthTop + eyeR + 0.05 * d) / scale, vMax = (dUp * 0.96 - eyeR) / scale;
  clampLog(g, log, 'eye_mouth_clearance', 'head.eyeV', Math.min(vMin, 0.98), Math.max(Math.min(vMin, 0.98), Math.min(vMax, 0.98)));
});
RULE('countershade', 'Dorsum darker than belly unless niche overrides', (g, lm, log) => { if (g.skin.countershade < 0.3 || (g.meta.tags || []).includes('noCountershade')) return; const b = g.skin.base, be = g.skin.belly; if (be[2] < b[2] + 0.1 - 1e-9) { if (b[2] > 0.84) setLog(g, log, 'countershade', 'skin.base', [b[0], b[1], 0.84]); const bl = Math.min(b[2], 0.84); setLog(g, log, 'countershade', 'skin.belly', [be[0], Math.min(be[1], b[1]), +Math.min(0.96, bl + 0.12).toFixed(4)]); } });
RULE('teeth_mouth', 'Teeth consistent with mouth type', (g, lm, log) => { const m = g.mouth; if (m.type === 'tube') { setLog(g, log, 'teeth_mouth', 'mouth.teeth', 'none'); } if (m.type === 'beak' && m.teeth !== 'beak' && m.teeth !== 'none') setLog(g, log, 'teeth_mouth', 'mouth.teeth', 'beak'); if (m.type === 'suction' && !['rasp', 'none'].includes(m.teeth)) setLog(g, log, 'teeth_mouth', 'mouth.teeth', 'rasp'); if (g.mouth.teeth === 'none') setLog(g, log, 'teeth_mouth', 'mouth.teethCount', 0); else if (g.mouth.teeth === 'beak') clampLog(g, log, 'teeth_mouth', 'mouth.teethCount', 2, 4); else if (g.mouth.teethCount < 2) setLog(g, log, 'teeth_mouth', 'mouth.teethCount', 2); });
RULE('barbels_mouth', 'No barbels on beak/tube mouths', (g, lm, log) => { if ((g.mouth.type === 'beak' || g.mouth.type === 'tube') && g.head.barbels > 0) setLog(g, log, 'barbels_mouth', 'head.barbels', 0); });
RULE('ray_counts', 'Each fin has ≥ 3 total rays', (g, lm, log) => { for (const k of ['dorsal', 'anal']) { const f = g.fins[k]; if (f.spines + f.rays < 3) setLog(g, log, 'ray_counts', `fins.${k}.rays`, 3 - f.spines); } if (g.fins.dorsal2.spines + g.fins.dorsal2.rays < 3) setLog(g, log, 'ray_counts', 'fins.dorsal2.rays', 3 - g.fins.dorsal2.spines); });
RULE('photophores_light', 'Photophores only in dark habitats (or glow lineages)', (g, lm, log) => { const hab = HABITATS[g.meta.habitat]; if (hab && hab.light > 0.45 && !g.meta.fantasy && g.skin.photophores > 0 && !(g.meta.tags || []).includes('deep')) setLog(g, log, 'photophores_light', 'skin.photophores', 0); });
RULE('upright_posture', 'Upright posture ⇒ hippocampiform swimming, no caudal fin', (g, lm, log) => { if (g.body.posture > 60) { setLog(g, log, 'upright_posture', 'swim.mode', 'hippocampiform'); setLog(g, log, 'upright_posture', 'fins.caudal.present', false); } });
RULE('special_sizes', 'Special structures sized sanely', (g, lm, log) => { const s = g.head.special; if (s === 'bill' || s === 'sword') clampLog(g, log, 'special_sizes', 'head.specialLen', 0.1, 0.4); else if (s === 'hammer') { clampLog(g, log, 'special_sizes', 'head.specialWidth', 0.1, 0.35); clampLog(g, log, 'special_sizes', 'head.specialLen', 0.06, g.head.lengthFrac * 0.7); clampLog(g, log, 'special_sizes', 'head.eyeU', 0.15, Math.max(0.15, g.head.specialLen / g.head.lengthFrac * 0.85)); } else if (s === 'esca') clampLog(g, log, 'special_sizes', 'head.specialLen', 0.05, 0.7); else if (s === 'horns') clampLog(g, log, 'special_sizes', 'head.specialLen', 0.03, 0.2); });
RULE('inferior_jaw', 'Inferior/suction mouths have a shorter lower jaw; superior have longer', (g, lm, log) => { const t = g.mouth.type; if (t === 'inferior' || t === 'suction') clampLog(g, log, 'inferior_jaw', 'mouth.jawRatio', 0.4, 0.8); else if (t === 'superior') clampLog(g, log, 'inferior_jaw', 'mouth.jawRatio', 1.02, 1.5); else if (t === 'subterminal') clampLog(g, log, 'inferior_jaw', 'mouth.jawRatio', 0.6, 0.95); });
RULE('flat_eyes', 'Flatfish eyes migrate to one side; others symmetric', (g, lm, log) => { if (g.body.roll !== 0 && g.head.eyeSide === 'both') setLog(g, log, 'flat_eyes', 'head.eyeSide', g.body.roll < 0 ? 'left' : 'right'); if (g.body.roll === 0 && (g.head.eyeSide === 'left' || g.head.eyeSide === 'right')) setLog(g, log, 'flat_eyes', 'head.eyeSide', 'both'); });
RULE('lineage_architecture', 'Preserve lineage-specific gills, fin supports and functional body plan', (g, lm, log) => {
  const a = anatomyProfile(g);
  for (const p in a.locks) setLog(g, log, 'lineage_architecture', p, a.locks[p]);
  for (const p in a.bounds) clampLog(g, log, 'lineage_architecture', p, a.bounds[p][0], a.bounds[p][1]);
  clampLog(g, log, 'lineage_architecture', 'fins.caudal.span', a.tailSpan[0], a.tailSpan[1]);
  clampLog(g, log, 'lineage_architecture', 'fins.dorsal.height', .03, a.dorsalLimit);
  if (a.solid) for (const k of ['dorsal', 'anal', 'pectoral', 'caudal']) {
    clampLog(g, log, 'lineage_architecture', `fins.${k}.opacity`, .94, 1);
    clampLog(g, log, 'lineage_architecture', `fins.${k}.flex`, 0, .38);
  }
});
RULE('caudal_proportion', 'Tail span follows the body and blends out of the peduncle', (g, lm, log) => {
  if (!g.fins.caudal.present) return;
  const minSpan = g.body.pedDepth * 1.18;
  clampLog(g, log, 'caudal_proportion', 'fins.caudal.span', Math.max(.45, minSpan), anatomyProfile(g).tailSpan[1]);
  if (['lunate', 'forked'].includes(g.fins.caudal.type)) clampLog(g, log, 'caudal_proportion', 'body.pedWidth', .35, 1.3);
  if (g.fins.caudal.type === 'heterocercal') clampLog(g, log, 'caudal_proportion', 'fins.caudal.lobeAsym', .0833, 1);
  else if (g.fins.caudal.type === 'hypocercal') clampLog(g, log, 'caudal_proportion', 'fins.caudal.lobeAsym', -.28, -.1);
  else if (!['filamentous', 'diphycercal'].includes(g.fins.caudal.type)) clampLog(g, log, 'caudal_proportion', 'fins.caudal.lobeAsym', -.12, .12);
});
RULE('fin_segment_balance', 'Second dorsal does not overpower the first; finlets occupy a free segment', (g, lm, log) => {
  const a = anatomyProfile(g), d = g.fins.dorsal;
  if (d.count === 2 && a.family === 'shark') clampLog(g, log, 'fin_segment_balance', 'fins.dorsal2.height', .03, Math.max(.08, d.height * .6));
  const lastD = d.count === 3 ? lm.dorsal3End : d.count === 2 ? lm.dorsal2End : lm.dorsalEnd;
  if (g.fins.finlets.count && lastD > g.body.pedU - .035) setLog(g, log, 'fin_segment_balance', 'fins.finlets.count', 0);
  if (g.fins.adipose.present && lastD > g.body.pedU - .045) setLog(g, log, 'fin_segment_balance', 'fins.adipose.present', false);
  clampLog(g, log, 'fin_segment_balance', 'fins.pectoral.baseLen', .06, a.family === 'ray' ? .9 : .65);
});
RULE('oral_gill_separation', 'The gill chamber begins behind the mouth articulation', (g, lm, log) => {
  clampLog(g, log, 'oral_gill_separation', 'head.gillStart', Math.max(.45, lm.mouthCorner / g.head.lengthFrac + .05), GILL_START_MAX);
});
RULE('habitat_ecology', 'Lineage matches salinity, depth zone and thermal habitat (unless explicitly adapted)', (g, lm, log) => {
  const habitat = HABITATS[g.meta.habitat]; if (!habitat || g.meta.adapted || cladeAllowed(g.meta.clade, habitat)) return;
  const card = SPECIES.find(s => s.id === (g.meta.species || g.meta.parentSpecies));
  const candidates = Object.values(HABITATS).filter(h => cladeAllowed(g.meta.clade, h));
  const match = card && candidates.find(h => h.id === card.habitat) || candidates.find(h => !h.fantasy) || candidates[0];
  if (match) setLog(g, log, 'habitat_ecology', 'meta.habitat', match.id);
});
RULE('niche_identity', 'Ecological niche is supported by the selected evolutionary branch', (g, lm, log) => {
  const niche = NICHES[g.meta.niche]; if (niche && (g.meta.hybrid || cladeInNiche(g.meta.clade, niche))) return;
  const habitat = HABITATS[g.meta.habitat], weights = {};
  for (const id in NICHES) if (cladeInNiche(g.meta.clade, NICHES[id])) weights[id] = habitat && habitat.niches[id] || .1;
  if (Object.keys(weights).length) setLog(g, log, 'niche_identity', 'meta.niche', new RNG(g.meta.seed + ':niche-repair').weighted(weights));
});
RULE('surface_ornaments', 'No detached conical head ornaments; brow anatomy is sculpted into the skin', (g, lm, log) => {
  if (g.head.special === 'horns') setLog(g, log, 'surface_ornaments', 'head.special', 'none');
});
RULE('anatomy_laws', 'Global anatomy laws: eyes, mouth, fins, tail and flattened plan derived from plan / niche / swim / depth axes', (g, lm, log) => {
  const a = anatomyProfile(g), ax = LAW.axesOf(g, a, NICHES[g.meta.niche], HABITATS[g.meta.habitat]);
  LAW.repairLaws(g, ax, lm, log, { clampLog, setLog, bodyProfile, headDepth, metrics, landmarks, a });
});
/** Axes of a genome (plan / niche / swim / depth) — the only inputs the global anatomy laws may read. */
function axesOf(g) { return LAW.axesOf(g, anatomyProfile(g), NICHES[g.meta.niche], HABITATS[g.meta.habitat]); }
FG.axesOf = axesOf; FG.LAW = LAW;
FG.RULES = RULES;
/** Run all rules to a fixed point. Repairs are appended to g.meta.repairs. */
function repair(g) {
  const log = g.meta.repairs || (g.meta.repairs = []);
  for (let pass = 0; pass < 12; pass++) { const before = log.length, lm = landmarks(g); for (const rl of RULES) { try { rl.fn(g, lm, log); } catch (e) { log.push({ rule: rl.id, path: '-', from: 'error', to: String(e.message) }); } } if (log.length === before) break; }
  return log;
}
/** Report-only pass: violations that a fresh rules run would still repair (should be empty after repair()). */
function violations(g) { const c2 = deepClone(g); c2.meta.repairs = []; repair(c2); return c2.meta.repairs; }
FG.repair = repair; FG.violations = violations;

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ 7. GENERATION PIPELINE: resolve → sample → palette → repair      ║
   ╚══════════════════════════════════════════════════════════════════╝ */
function narrow(map, p, spec, hard) {
  const cur = map[p];
  if (hard || cur === undefined) { map[p] = spec; return; }
  const curR = cur && cur.r, specR = spec && spec.r;
  if (specR && curR) { const lo = Math.max(curR[0], specR[0]), hi = Math.min(curR[1], specR[1]); if (lo <= hi) map[p] = { r: [lo, hi], i: cur.i || spec.i }; else { const w = (curR[1] - curR[0]) * 0.25; map[p] = specR[0] > curR[1] ? { r: [curR[1] - w, curR[1]], i: cur.i } : { r: [curR[0], curR[0] + w], i: cur.i }; } return; }
  if (specR && isNum(cur)) return;
  if (spec && spec.c && cur && cur.c) { const inter = cur.c.filter(x => spec.c.includes(x)); map[p] = inter.length ? { c: inter } : cur; return; }
  if (cur && typeof cur === 'object' && !Array.isArray(cur)) { map[p] = spec; }
}
function applyForm(map, rule) {
  if (!rule) return;
  for (const p in rule) { const q = rule[p], cur = map[p], sch = SCHEMA[p]; if (!sch) continue;
    if (q.set !== undefined) { if (cur === undefined || (cur && typeof cur === 'object' && !Array.isArray(cur))) map[p] = q.set; continue; }
    if (q.oneOf) { if (cur === undefined) map[p] = { c: q.oneOf }; else if (cur && cur.c) { const i = cur.c.filter(x => q.oneOf.includes(x)); if (i.length) map[p] = { c: i }; } continue; }
    const lo = q.min !== undefined ? q.min : -Infinity, hi = q.max !== undefined ? q.max : Infinity;
    if (cur === undefined) map[p] = { r: [Math.max(lo, sch.min), Math.min(hi, sch.max)], i: sch.t === 'i' ? 1 : 0 };
    else if (cur && cur.r) { const a = Math.max(cur.r[0], lo), b = Math.min(cur.r[1], hi); map[p] = a <= b ? { r: [a, b], i: cur.i } : { r: lo > cur.r[1] ? [cur.r[1], cur.r[1]] : [cur.r[0], cur.r[0]], i: cur.i }; }
  }
}
/** Resolve the trait map (path → spec) for a (clade, niche, species) combination. */
function resolveTraitMap(meta) {
  const map = {};
  for (const n of cladePath(meta.clade)) {
    Object.assign(map, n.t);
    if (ANATOMY[n.id] && ANATOMY[n.id].traits) Object.assign(map, ANATOMY[n.id].traits);
  }
  const ni = NICHES[meta.niche];
  if (ni) { for (const ff of ni.ff) applyForm(map, FORM_RULES[ff]); for (const p in ni.t) narrow(map, p, ni.t[p], false); }
  const sp = meta.species || meta.parentSpecies ? SPECIES.find(s => s.id === (meta.species || meta.parentSpecies)) : null;
  if (sp) for (const p in sp.t) map[p] = sp.t[p];
  return map;
}
function sampleSpec(spec, rng) {
  if (spec && typeof spec === 'object' && !Array.isArray(spec)) {
    if (spec.r) { const v = rng.range(spec.r[0], spec.r[1]); return spec.i ? Math.round(v) : v; }
    if (spec.c) return rng.pick(spec.c);
    if (spec.hsl) return spec.hsl.map(x => { if (!Array.isArray(x)) return x; if (Array.isArray(x[0])) { const rr = rng.pick(x); return rng.range(rr[0], rr[1]); } return rng.range(x[0], x[1]); });
  }
  return Array.isArray(spec) ? spec.slice() : spec;
}
const TRAIT_LINKS = {
  'body.fineness': ['locomotion', 1], 'body.pedDepth': ['locomotion', -1], 'body.tailTaper': ['locomotion', 1],
  'fins.caudal.aspect': ['locomotion', 1], 'fins.caudal.span': ['locomotion', 1], 'swim.envPow': ['locomotion', 1],
  'mouth.gape': ['feeding', 1], 'head.lengthFrac': ['feeding', 1], 'head.eyeForward': ['feeding', 1],
  'fins.pectoral.len': ['maneuvering', 1], 'fins.pectoral.spread': ['maneuvering', 1], 'fins.pectoral.flex': ['maneuvering', 1]
};
function sampleCorrelated(map, rng, g) {
  const latent = {};
  for (const p in SCHEMA) if (map[p] !== undefined) {
    const spec = map[p], link = TRAIT_LINKS[p] || [p.startsWith('fins.') ? p.split('.').slice(0, 2).join('.') : p.split('.')[0], 1];
    if (latent[link[0]] === undefined) latent[link[0]] = rng.range(.06, .94);
    if (spec && spec.r) {
      const q = clamp((link[1] > 0 ? latent[link[0]] : 1 - latent[link[0]]) + (rng.next() - .5) * .07, 0, 1);
      const v = lerp(spec.r[0], spec.r[1], q); setP(g, p, spec.i || SCHEMA[p].t === 'i' ? Math.round(v) : v);
    } else if (SCHEMA[p].t === 'hsl' && Array.isArray(spec) && spec.some(Array.isArray)) setP(g, p, spec.map(x => Array.isArray(x) ? rng.range(x[0], x[1]) : x));
    else setP(g, p, sampleSpec(spec, rng));
  }
}
function genPalette(g, rng, hab, ni, map) {
  const pal = hab.pal, sat = (ni && ni.sat) || 1;
  if (!map['skin.base']) { const hr = rng.pick(pal.h); g.skin.base = [(rng.range(hr[0], hr[1]) + 360) % 360, clamp(rng.range(pal.s[0], pal.s[1]) * sat, 0, 1), rng.range(pal.l[0], pal.l[1])]; }
  const [h, s, l] = g.skin.base;
  if (!map['skin.belly']) g.skin.belly = [(h + rng.range(-12, 12) + 360) % 360, s * 0.3, clamp(l + 0.35, 0.3, 0.95)];
  if (!map['skin.accent']) {
    const camo = !!(ni && ni.ff.some(rule => ['camouflage', 'ambusher', 'flatBenthic', 'crevice', 'bottomDweller'].includes(rule)));
    const dh = camo ? rng.range(-12, 12) : rng.pick([24, -24, 38, -38]);
    g.skin.accent = [(h + dh + 360) % 360, clamp(camo ? s * .72 : s * .88, 0, .9), camo ? l * .5 : clamp(l * .5 + .05, .06, .6)];
  }
  if (!map['skin.fin']) g.skin.fin = [(h + rng.range(-10, 10) + 360) % 360, s * 0.75, clamp(l + 0.05, 0, 1)];
  if (!map['skin.eye']) g.skin.eye = rng.pick([[45, .85, .5], [40, .3, .7], [0, 0, .1], [0, .8, .4], [120, .5, .5], [30, .9, .55]]);
  if (!map['skin.glow'] && g.skin.photophores > 0) g.skin.glow = rng.pick([[190, 1, .6], [160, 1, .6], [210, 1, .65], [350, .9, .6]]);
}
function cladeAllowed(id, hab) {
  const e = ecologyProfile(id);
  if (hab.fantasy) return !e.habitats || e.habitats.includes(hab.id);
  if (!cladeReq(id).some(t => hab.tags.includes(t))) return false;
  return (!e.bands || e.bands.includes(depthBand(hab))) && (!e.excluded || !e.excluded.some(t => hab.tags.includes(t))) && (!e.requireAny || e.requireAny.some(t => hab.tags.includes(t)));
}
function pickClade(ni, hab, rng) {
  const w = {};
  for (const id in ni.clades) if (CLADES[id] && cladeAllowed(id, hab)) w[id] = ni.clades[id];
  if (!Object.keys(w).length) throw new Error(`No viable ${ni.n.toLowerCase()} clades in ${hab.n}; choose another niche`);
  return rng.weighted(w);
}
/* naming */
const PATTERN_ADJ = { stripes: 'Striped', bars: 'Banded', spots: 'Spotted', reticulate: 'Reticulated', saddles: 'Saddled', mottle: 'Mottled', disruptive: 'Masked', eyespot: 'Ocellated' };
const HAB_ADJ = { coralReef: 'reef', openOcean: 'oceanic', mesopelagic: 'twilight', abyssal: 'abyssal', hadal: 'hadal', kelpForest: 'kelp', rockyShore: 'shore', sandFlat: 'sand', seagrass: 'grassbed', mangrove: 'mangrove', brackish: 'estuary', polar: 'polar', fastRiver: 'river', slowRiver: 'river', mountainStream: 'brook', lake: 'lake', floodplain: 'Amazon', blackwater: 'blackwater', cave: 'cave', deepReef: 'deep-reef', lavaLake: 'ember', skySea: 'sky', crystalCavern: 'crystal', void: 'void' };
function hueName(c2) { const [h, s, l] = c2; if (l < 0.14) return 'Black'; if (s < 0.18) return l > 0.55 ? 'Silver' : 'Grey'; if (h < 15 || h >= 345) return 'Red'; if (h < 45) return l < 0.35 ? 'Brown' : 'Orange'; if (h < 70) return 'Golden'; if (h < 160) return 'Green'; if (h < 190) return 'Teal'; if (h < 260) return 'Blue'; if (h < 300) return 'Violet'; return 'Rose'; }
function singular(n) { n = n.split(/ & | \/ |,/)[0].replace(/\s*\(.*\)/, '').replace(/^True /, '').trim(); if (/fishes$/.test(n)) return n.replace(/es$/, ''); if (/ies$/.test(n)) return n.replace(/ies$/, 'y'); if (/sses$/.test(n)) return n.replace(/es$/, ''); if (/s$/.test(n) && !/ss$/.test(n)) return n.replace(/s$/, ''); return n; }
const SYL = ['ich', 'thy', 'os', 'ar', 'en', 'la', 'pto', 'mor', 'ne', 'ra', 'xi', 'do', 'gla', 'tri', 'on', 'ba', 'lo', 'cy', 'pha', 'sel', 'ko', 'ti'];
const GEN_END = ['ichthys', 'gnathus', 'pterus', 'soma', 'cephalus', 'notus', 'urus', 'don'];
// @@PART js/app.part08.js (8/19) lines 1262-1557 of the original module script -- stripped by build.mjs
function nameFish(g, rng) {
  if (g.meta.proc && g.meta.proc.name) { g.meta.name = g.meta.proc.name; g.meta.sci = g.meta.proc.sci + (g.meta.edited ? ' (edited)' : ''); return; }
  if (g.meta.species) {
    const sp = SPECIES.find(s => s.id === g.meta.species);
    if (sp) {
      const ad = g.meta.adapted && HABITATS[g.meta.adapted.to], adj = ad ? (HAB_ADJ[ad.id] || ad.n.toLowerCase()) : '';
      g.meta.name = ad ? adj.charAt(0).toUpperCase() + adj.slice(1) + (g.meta.speculative ? '-inspired ' : '-adapted ') + sp.n.toLowerCase() : sp.n;
      g.meta.sci = sp.sci + (g.meta.speculative ? ' / speculative concept, not a real population' : ad ? ' (authored habitat variant)' : '');
      return;
    }
  }
  const cl = CLADES[g.meta.clade]; const base = singular(cl.n).toLowerCase();
  const adj = PATTERN_ADJ[g.skin.pattern] || hueName(g.skin.base);
  g.meta.name = `${g.meta.novel ? 'Concept' : adj} ${HAB_ADJ[g.meta.habitat] || ''} ${base}`.replace(/\s+/g, ' ').trim();
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  g.meta.sci = cap(rng.pick(SYL) + rng.pick(SYL) + rng.pick(GEN_END)) + ' ' + rng.pick(SYL) + rng.pick(SYL) + rng.pick(['us', 'a', 'um', 'ensis', 'oides']) + (g.meta.novel ? ' (generated concept)' : g.meta.fantasy ? ' (fict.)' : ' (gen.)');
  if (g.meta.evolution && g.meta.evolution.step > 0) {
    const source = SPECIES.find(card => card.id === g.meta.parentSpecies);
    g.meta.name = `Evolved ${source ? source.n.toLowerCase() : base} / step ${g.meta.evolution.step}`;
    if (source) g.meta.sci = source.sci + ' / generated evolutionary variant';
  }
}
function finalize(g, rng) {
  if (!CLADES[g.meta.clade]) g.meta.clade = 'teleost'; if (!HABITATS[g.meta.habitat]) g.meta.habitat = 'coralReef';
  const tags = new Set(cladeTags(g.meta.clade)); let ni = NICHES[g.meta.niche], hab = HABITATS[g.meta.habitat];
  if (ni) { ni.tags.forEach(t => tags.add(t)); ni.ff.forEach(f => tags.add(f)); }
  if (g.skin.electric) tags.add('electric'); if (g.skin.inflate) tags.add('inflate');
  g.meta.tags = [...tags]; g.meta.fantasy = !!(hab && hab.fantasy) || !!(ni && ni.fantasy) || tags.has('fantasy');
  if (!g.meta.repairs) g.meta.repairs = [];
  repair(g);
  ni = NICHES[g.meta.niche]; hab = HABITATS[g.meta.habitat];
  const resolvedTags = new Set(cladeTags(g.meta.clade)); if (ni) { ni.tags.forEach(t => resolvedTags.add(t)); ni.ff.forEach(t => resolvedTags.add(t)); }
  if (g.skin.electric) resolvedTags.add('electric'); if (g.skin.inflate) resolvedTags.add('inflate');
  g.meta.tags = [...resolvedTags]; g.meta.fantasy = !!hab.fantasy || !!(ni && ni.fantasy) || resolvedTags.has('fantasy');
  g.meta.speculative = !!(g.meta.adapted && (!cladeAllowed(g.meta.clade, hab) || hab.fantasy));
  if (g.meta.adapted) { g.meta.adapted.to = g.meta.habitat; g.meta.adapted.speculative = g.meta.speculative; }
  if (!g.meta.surfaceSeed) g.meta.surfaceSeed = g.meta.seed;
  g.meta.version = FG.version; nameFish(g, rng || new RNG(g.meta.seed + ':name'));
  g.meta.sizeClass = sizeClass(g.body.length); g.meta.metrics = metrics(g); g.meta.landmarks = landmarks(g);
  return g;
}
/**
 * Generate a validated genome.
 * @param {{seed?:string,habitat?:string,niche?:string,clade?:string,species?:string,overrides?:Object,noSpecies?:boolean}} opts
 */
function generate(opts = {}) {
  const seed = String(opts.seed != null && opts.seed !== '' ? opts.seed : Math.floor(Math.random() * 1e9).toString(36));
  const rng = new RNG(`${seed}|${opts.habitat || ''}|${opts.niche || ''}|${opts.clade || ''}|${opts.species || ''}`);
  let species = opts.species ? SPECIES.find(s => s.id === opts.species) : null;
  let habId = opts.habitat && HABITATS[opts.habitat] ? opts.habitat : (species ? species.habitat : rng.pick(Object.keys(HABITATS).filter(h => !HABITATS[h].fantasy)));
  let nicheId = opts.niche, cladeId = opts.clade;
  if (species) { nicheId = opts.niche && NICHES[opts.niche] && cladeInNiche(species.clade, NICHES[opts.niche]) ? opts.niche : species.niche; cladeId = species.clade; }
  const hab = HABITATS[habId];
  if (!nicheId && cladeId && CLADES[cladeId]) {
    const candidates = {};
    for (const id in NICHES) if (cladeInNiche(cladeId, NICHES[id])) candidates[id] = hab.niches[id] || .08;
    if (Object.keys(candidates).length) nicheId = rng.weighted(candidates);
  }
  if (!nicheId || !NICHES[nicheId]) {
    const compatible = {};
    for (const id in hab.niches) {
      const niche = NICHES[id];
      if (niche && Object.keys(niche.clades).some(clade => CLADES[clade] && cladeAllowed(clade, hab))) compatible[id] = hab.niches[id];
    }
    if (!Object.keys(compatible).length) throw new Error(`No viable niches in ${hab.n}`);
    nicheId = rng.weighted(compatible);
  }
  const ni = NICHES[nicheId];
  if (!cladeId || !CLADES[cladeId]) cladeId = pickClade(ni, hab, rng);
  if (!species && !opts.noSpecies && rng.chance(0.35)) { const cands = SPECIES.filter(s => s.clade === cladeId && (s.habitat === habId || s.niche === nicheId)); if (cands.length) species = rng.pick(cands); }
  const meta = { seed, surfaceSeed: seed, habitat: habId, niche: nicheId, clade: cladeId, species: species ? species.id : null };
  const map = resolveTraitMap(meta);
  const g = defaultGenome(); Object.assign(g.meta, meta);
  sampleCorrelated(map, rng, g);
  genPalette(g, rng, hab, ni, map);
  if (species && habId !== species.habitat && !opts.noAdapt) adaptToHabitat(g, hab, species, rng, opts.niche);
  if (opts.overrides) for (const p in opts.overrides) if (SCHEMA[p]) setP(g, p, opts.overrides[p]);
  return finalize(g, rng);
}
/** Keep a reference species' body plan but adapt niche, colour, size and function-to-form to a different habitat. */
function adaptToHabitat(g, hab, species, rng, preferredNiche) {
  g.meta.adapted = { from: species.habitat, to: hab.id, speculative: !cladeAllowed(g.meta.clade, hab) || hab.fantasy };
  const w = {}; for (const id in hab.niches) if (cladeInNiche(g.meta.clade, NICHES[id])) w[id] = hab.niches[id];
  if (preferredNiche && NICHES[preferredNiche] && cladeInNiche(g.meta.clade, NICHES[preferredNiche])) g.meta.niche = preferredNiche;
  else if (Object.keys(w).length) g.meta.niche = rng.weighted(w);
  const ni = NICHES[g.meta.niche], ff = ni ? ni.ff : [];
  const hr = rng.pick(hab.pal.h), targetH = rng.range(hr[0], hr[1]), sat = (hab.pal.s[0] + hab.pal.s[1]) / 2 * (ni ? ni.sat : 1);
  for (const p of ['skin.base', 'skin.accent', 'skin.fin']) { const col = getP(g, p); const dh = ((targetH - col[0] + 540) % 360) - 180; col[0] = (col[0] + dh * .22 + 360) % 360; col[1] = lerp(col[1], clamp(sat, 0, 1), .2); }
  if (hab.light < .15) { g.head.eyeSize = clamp(g.head.eyeSize * 1.25, .05, .55); g.skin.iridescence *= .4; g.skin.base[2] *= .65; if (hab.light < .05) g.skin.photophores = Math.max(g.skin.photophores, 12); }
  if (ff.includes('maneuverer')) applyAdaptation(g, 'agility', .35, true);
