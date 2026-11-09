/* ROUND 7 / WP4 — the gill plan: how THIS fish breathes, derived only from
   the engine's own axes (body plan's gill system, feeding-niche flags,
   swim/cruiser derivation, jaw construction). The hyper genome rolls the
   base variation; the plan scales it by niche and plan, so a filter
   feeder's sieve, a cruiser's dense long filaments and an ambusher's
   reduced gills are systematic — never luck. No species names. */
import { makeRng } from './genome.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/**
 * @param bm body model (axes: bm.ax.flags, bm.a.gills, bm.law.mouth)
 * @param g  engine genome
 * @param H  hyper parameter block (H.derived.cruiser / .bottom), may be null
 */
export function gillPlan(bm, g, H) {
  const kind = bm.a.gills === 'opercular' ? 'cover'
    : bm.a.gills === 'lateral' ? 'slits'
    : bm.a.gills === 'ventral' ? 'ventral' : 'pores';
  const flags = (bm.ax && bm.ax.flags) || new Set();
  const rng = makeRng(String((g.meta && (g.meta.seed || g.meta.surfaceSeed)) || 'fish') + '|gillplan');
  const cruiser = H && H.derived ? H.derived.cruiser : 0;
  const bottom = H && H.derived ? H.derived.bottom : 0;

  /* filament investment: ram-ventilating cruisers carry long, dense
     filaments; bottom ambushers (buccal pumpers) carry reduced ones */
  let filMul = 1, filLenMul = 1, flareDeg = 12;
  if (cruiser > 0.40) { filMul = 1.3 + 0.2 * rng.next(); filLenMul = 1.3 + 0.2 * rng.next(); flareDeg = 20; }   /* threshold calibrated against the N=1000 census: at .55 the ram boost almost never fired (cruiser-swim class mean filMul 1.04); at .40 the class mean lands in the 1.3–1.5 design band */
  else if (bottom > 0.55 || flags.has('ambusher')) { filMul = 0.7 + 0.2 * rng.next(); filLenMul = 0.75 + 0.15 * rng.next(); flareDeg = 9; }

  /* rakers are a feeding structure, not decoration */
  let rakerMode = 'standard', rakerCount = null, rakerLenMul = 1, rakerRadMul = 1;
  if (flags.has('filterFeeder') || flags.has('planktivore')) {
    rakerMode = 'sieve'; rakerCount = 80 + Math.floor(rng.next() * 101); rakerLenMul = 1.6; rakerRadMul = 0.55;
  } else if (bm.law && bm.law.mouth && bm.law.mouth.teethClass === 'crushing') {
    rakerMode = 'knob'; rakerCount = 10 + Math.floor(rng.next() * 9); rakerLenMul = 0.45; rakerRadMul = 1.7;
  } else if (flags.has('predator') || flags.has('ambusher')) {
    rakerMode = 'sparse'; rakerCount = 8 + Math.floor(rng.next() * 13); rakerLenMul = 0.8;
  }

  return {
    kind, filMul, filLenMul, flareDeg, rakerMode, rakerCount, rakerLenMul, rakerRadMul,
    cruiser, bottom,
    /** Compact distinctness signature for the diversity census. */
    signature(G, filTotal, rakTotal) {
      if (kind === 'slits') return `slits|${g.head.gillSlits || 5}`;
      if (kind === 'ventral') return `ventral|${g.head.gillSlits || 5}`;
      if (kind === 'pores') return `pores|${g.head.gillSlits || 7}`;
      const filLenB = Math.round((G ? G.filLen : 1) * filLenMul * 8);
      return ['cover', 'a' + (G ? G.arches : 0), 'f' + filTotal, 'r' + rakTotal, rakerMode, 'l' + filLenB, 'fl' + flareDeg].join('|');
    },
  };
}
