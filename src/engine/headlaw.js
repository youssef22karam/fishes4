/* HEAD-STRUCTURE LAWS (round 5A): gill cover geometry, ventral cartilaginous mouth, barbels by niche.
   Every rule reads only the generator's axes (body plan, feeding niche, swim mode, depth band, body size). Nothing is keyed to a named animal.
   Pure JS, imported by laws.js (re-exports), the geometry builders (gillgeo.js, appendages.js) and the validators. */
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const has = (ax, ...f) => f.some(x => ax.flags.has(x));

/* ── 1. OPERCULUM (bony / cover plans) ──────────────────────────────────────────────────────────────────────────
   The cover's rear edge is a curve in (u, v = sin theta): most rearward at v = vc, falling forward toward the throat and (less) toward the back.
   edge(v) = op − off − bow·q², q = clamp((v − vc)/vs, −1, 1). The gill opening is a narrow slit immediately BEHIND this edge (width slitW·h).
   Shared by the geometry (gillgeo.js), the body-loft trench (BodyModel.point) and the skin shader (uOpOff / uOpBow / uOpW). */
export const OP = { bow: .075, vc: .22, vs: 1.22, slitW: .05, height: .0125, crest: 1.45, trench: .06, vLo: -.9, vHi: .44 };
export const opEdgeU = (op, h, v) => { const q = clamp((v - OP.vc) / OP.vs, -1, 1); return op - OP.slitW * h * 1.15 - OP.bow * h * q * q; };
/* cartilaginous slit series: groove depth (× local half width) and half-width (× head length) */
export const SLIT = { depth: .095, sigma: .0095, half: .019 };

/* ── 2. VENTRAL MOUTH (cartilaginous plan, jawed construction) ─────────────────────────────────────────────────
   The mouth is inferior: lip line under the head, its front edge set back from the snout tip by `setback` × head length (≥ minSet × head length),
   the snout overhanging it. Gape floor keeps a real mouth length behind the setback. */
export const VENTRAL = { setback: .22, minSet: .12, minGape: .3 };
export const ventralMouth = (ax, construction) => ax.plan.cartilaginous && ax.plan.flat < 1 && construction === 'jawed';

/* ── 3. BARBELS ──────────────────────────────────────────────────────────────────────────────────────────────
   Presence = feeding niche × body plan only. Bottom-feeding niches (bottom-dweller / sifter / flat-benthic / scavenger flags) on a jawed,
   non-disc, non-tubular, non-jawless plan carry barbels; every other niche carries none.
   Layout is chosen once per fish and never mixed:  'median' = one chin barbel;  'multi' = paired barbels at the mouth corners and chin.
   multi: substrate-probing (sifter) niches and the cartilaginous plan;  median: the remaining bottom niches. Pair count from the plan (1 on
   cartilaginous / elongated plans, else 2). */
export const APPENDAGE_CAP = { barbelHead: 1.0, barbelBody: .35, chinHead: .5, lureBody: .6, whipBody: .6, pairsMax: 4 };
export const BOTTOM_FEEDING = ['bottomDweller', 'sifter', 'flatBenthic', 'scavenger'];
export function barbelLaw(ax, M) {
  const bottom = has(ax, ...BOTTOM_FEEDING);
  const eligible = bottom && M.construction === 'jawed' && ax.plan.flat < 1 && !ax.plan.tubular && !ax.plan.jawless;
  const layout = !eligible ? 'none' : has(ax, 'sifter') || ax.plan.cartilaginous ? 'multi' : 'median';
  const pairs = layout === 'multi' ? (ax.plan.cartilaginous || ax.plan.elongated ? 1 : 2) : 0;
  const count = layout === 'median' ? 1 : pairs * 2;
  return { eligible, bottom, layout, pairs, maxPairs: pairs, count, order: ['corner', 'chinPair'] };
}
/** The effective barbel set for a genome: [{ kind, paired, lenHead }], lenHead = length / head length (barbelLen only varies length inside the law's band). */
export function barbelPlan(g, ax, M) {
  const B = barbelLaw(ax, M), out = [];
  if (!B.eligible) return { law: B, items: out, pairs: 0, chin: false, layout: 'none' };
  const raw = clamp(g.head.barbelLen, .25, .7), base = Math.min(APPENDAGE_CAP.barbelHead * .98, .8 * (1 - Math.exp(-1.35 * raw)));
  if (B.layout === 'median') out.push({ kind: 'chin', paired: false, lenHead: Math.min(APPENDAGE_CAP.chinHead * .98, base * .9) });
  else for (let i = 0; i < B.pairs; i++) out.push({ kind: B.order[i], paired: true, lenHead: base * (i ? .8 : 1) });
  return { law: B, items: out, pairs: B.pairs, chin: B.layout === 'median', layout: B.layout };
}
/** absolute strand length (m) after the hard caps (≤ 1.0 × head length, ≤ 0.35 × body length; chin ≤ 0.5 × head length) */
export function barbelLength(item, headLen, L) {
  const cap = Math.min(item.kind === 'chin' ? APPENDAGE_CAP.chinHead * headLen : APPENDAGE_CAP.barbelHead * headLen, APPENDAGE_CAP.barbelBody * L);
  return Math.min(item.lenHead * headLen, cap);
}
/** genome repair: count follows the law exactly (0 on every non-bottom niche), length stays in the law's band */
export function repairHead(g, ax, M, st, cl) {
  const B = barbelLaw(ax, M);
  if ((g.head.barbels | 0) !== B.count) st('head.barbels', B.count);
  if (B.count) cl('head.barbelLen', .25, .7);
}
/** genome assertion: no barbels off the bottom niches, no mixed layouts, count equals the layout */
export function assertHead(g, ax, M, fail) {
  const B = barbelLaw(ax, M), n = g.head.barbels | 0;
  if (!B.eligible && n > 0) fail('appendages', 'barbels on a non-bottom niche / ineligible plan');
  else if (B.layout === 'median' && n !== 1) fail('appendages', 'median layout with ' + n + ' barbels (mixed layout)');
  else if (B.layout === 'multi' && (n !== B.count || n % 2)) fail('appendages', 'paired layout with ' + n + ' barbels (mixed layout)');
}
