/* ROUND 4 — SKIN LAW. Pure function of the generator's own axes (body plan, feeding niche flags, swim mode, depth/light band, body size) — no species or family names.
   skinLaw(ax, g) → { scaleVis, matte, sheen, deep, lip, throat, finMix }
     scaleVis  0…1  how visible the scale texture is: rigid/armoured plans read as plates (1); fast cruisers (scales under the skin line), elongated plans, deep-band plans,
               bare skin and tiny bodies fade it to near zero; denticle skin is nearly smooth.
     matte     0…1  dull skin: deep band, benthic / flattened plans, rigid plans.      sheen 0…1  wet sheen: fast cruisers, bright surface band.
     deep      0…1  light-band darkness: darkens + desaturates the palette.            lip/throat  interior tone endpoints (rgb), derived from the palette and band.
   All shader gradients (station-graded scale field, interior depth gradient) are in shaders/mouthgeo; this module only supplies the axis-derived strengths. */
const c01 = x => Math.max(0, Math.min(1, x));
const FAST = new Set(['thunniform', 'carangiform']);
export function skinLaw(ax, g) {
  const sc = g.skin.scale, len = g.body.length, light = ax.light, deep = c01(1 - light / .4) * (ax.lightless ? 1 : .92), fast = FAST.has(ax.swim), flags = ax.flags;
  const rigid = sc === 'ganoid' || sc === 'plates' || sc === 'scutes' || !!ax.plan.solid || flags.has('armored');
  const bottom = ax.plan.flat > 0 || flags.has('bottom') || flags.has('benthic') || flags.has('crevice') || flags.has('ambusher');
  let vis = { cycloid: .82, ctenoid: .88, ganoid: 1, plates: 1, scutes: 1, denticle: .1, bare: 0 }[sc]; if (vis == null) vis = .6;
  if (!rigid) { vis *= 1 - .85 * deep; if (fast) vis *= .38; if (ax.plan.elongated) vis *= .3; if (ax.plan.cartilaginous) vis *= .5; }
  const sz = Math.max(.45, Math.min(1.15, .62 + .5 * Math.log10(Math.max(.03, len) / .3)));
  const scaleVis = c01(vis * sz);
  const matte = c01(.12 + .62 * deep + (bottom ? .4 : 0) + (rigid ? .18 : 0) - (fast ? .22 : 0) - (light > .7 ? .08 : 0));
  const sheen = c01((fast ? .5 : 0) + (light > .65 ? .3 : 0) + .15 - .5 * matte);
  /* mouth interior tone: warm tissue pulled toward the belly pigment, darker + desaturated with depth band; throat = deep shadow of the same hue */
  const bl = g.skin.belly, hue = bl ? bl[0] : 0, k = 1 - .62 * deep, sat = 1 - .55 * deep;
  const lip0 = [.27, .088, .082], lum = .3 * lip0[0] + .59 * lip0[1] + .11 * lip0[2];
  const lip = lip0.map(v => (lum + (v - lum) * sat) * k * (hue > 0 ? 1 : 1)), throat = lip.map(v => v * .3);
  return { scaleVis, matte, sheen, deep, lip, throat, rigid, fast };
}
