/* Clade envelopes = regions of the trait space (ranges + allowed options). Nothing here describes
   a specific species: every clade is only "what the family's body plan allows".
   r: axis -> [lo, hi]   d: axis -> allowed options (plain value or [value, weight])
   lin: lineages = sub-regions; each maps onto one body-plan construction of the existing engine (e).
   Units: lengths in metres; shape axes are the engine's normalised units (see mapping.js). */

export const GEN_R = {
  length: [.2, .8], fineness: [3, 4.6], width: [.42, .58], peakU: [.32, .44], snoutDepth: [.2, .3], pedDepth: [.12, .26], pedWidth: [.5, .75],
  tailTaper: [.55, .72], dorsalFrac: [.5, .55], curl: [0, 0], posture: [0, 0], hump: [0, .05], keel: [0, 0],
  headLen: [.24, .3], snoutTaper: [.4, .65], forehead: [0, .2], cheek: [.2, .4], eyeSize: [.11, .15], eyeU: [.36, .46], eyeV: [.25, .45], eyeFwd: [.1, .28],
  gape: [.3, .45], jawRatio: [.9, 1.1], lips: [.2, .4], teethCount: [8, 24], barbels: [0, 0], barbelLen: [.2, .4], specialLen: [.1, .2], specialWid: [.1, .2],
  dStart: [.12, .28], dSpan: [.3, .45], dHeight: [.28, .42], dSweep: [.3, .5], d2Gap: [.02, .05], d2Span: [.1, .2], d2Height: [.2, .3],
  aStart: [.36, .5], aSpan: [.2, .32], aHeight: [.2, .3],
  pecU: [.05, .25], pecV: [-.45, -.25], pecLen: [.45, .7], pecBase: [.2, .3], pelLen: [.25, .4],
  cauLen: [.17, .24], cauAspect: [1.5, 3],
  hue: [0, 360], sat: [.02, .85], lit: [.05, .62], shade: [.55, .9], bellyLit: [.7, .92], accentDH: [-35, 35], accentSat: [.4, .8],
  iri: [.1, .5], gloss: [.35, .65], scaleSize: [.7, 1.4], patScale: [.7, 2], patDens: [.35, .75], photophores: [0, 0],
};
export const GEN_D = {
  profile: ['fusiform'], cross: ['oval'], mouth: ['terminal'], teeth: ['villiform'], special: ['none'], dN: [1], dShape: ['spinySoft'], d2Shape: ['rounded'],
  aShape: ['lobe'], pShape: ['rounded'], pelPos: ['thoracic'], pelShape: ['pointed'], cType: ['forked'], caudal: [true], pelvic: [true], anal: [true],
  scale: ['ctenoid'], pattern: ['none'], palette: ['silver'], eyeSide: ['both'],
};
const L = (e, h, w, r, d, sizes) => ({ e, h, w, r, d, sizes });
const FUS = ['fusiform', 'torpedo', 'deep', 'elongate', 'eel', 'depressed', 'globose', 'boxy', 'ribbon', 'tapered'];

export const CLADE_TABLE = [
  { id: 'perch', name: 'Perch-like ray-finned fishes', w: 15, sizes: [.12, 1.5], noun: 'perch',
    d: { profile: [['fusiform', 3], ['deep', 1]], cross: [['oval', 2], 'compressed'], mouth: [['terminal', 3], 'protrusible'], dN: [[1, 2], [2, 3]], dShape: ['spinySoft', 'notched', 'rounded'], d2Shape: ['rounded', 'lobe'], aShape: ['lobe', 'rounded'], pShape: ['rounded', 'pointed'], cType: ['forked', 'truncate', 'emarginate', 'rounded'], pattern: [['none', 3], ['bars', 2], ['stripes', 2], 'spots', 'mottle'], palette: ['olive', 'silver', 'brown', 'red', 'gold'] },
    r: { fineness: [2.8, 4.3], dStart: [.04, .12], dSpan: [.3, .42], d2Span: [.25, .38], aStart: [.5, .62], aSpan: [.14, .24], pecU: [.04, .16], eyeV: [.3, .46] },
    lin: [L('percoid', 'lake', 3, null, null), L('bass', 'lake', 2, { fineness: [3.3, 4.3], gape: [.45, .6], headLen: [.27, .32] }, { pattern: [['stripes', 2], 'bars', 'none'], palette: ['olive', 'brown'] }),
      L('grouper', 'coralReef', 2, { fineness: [2.7, 3.4], headLen: [.32, .4], eyeSize: [.08, .13], gape: [.55, .7], lips: [.4, .6] }, { profile: ['fusiform'], cType: ['rounded', 'truncate'], pattern: ['mottle', 'spots', 'bars'], palette: ['brown', 'red', 'olive'] }),
      L('jack', 'openOcean', 2, { fineness: [3.1, 4.2], width: [.3, .4], pedDepth: [.06, .1], cauAspect: [3, 4.2], cauLen: [.2, .26] }, { profile: ['fusiform', 'deep'], cType: ['forked'], scale: ['cycloid'], pattern: ['none'], palette: ['silver'], dN: [2] }),
      L('cichlid', 'lake', 2, { fineness: [2.6, 3.6], width: [.4, .5], cauAspect: [1, 1.6] }, { profile: ['deep', 'fusiform'], mouth: ['protrusible'], cType: ['rounded', 'truncate'], pattern: ['bars', 'spots', 'stripes', 'eyespot'], palette: ['olive', 'gold', 'orange', 'blue'] })] },

  { id: 'reef', name: 'Reef fishes (laterally compressed)', w: 13, sizes: [.05, .5], noun: 'reeffish',
    d: { profile: [['deep', 3], 'fusiform'], cross: ['compressed'], mouth: ['terminal', 'protrusible'], dShape: ['spinySoft', 'rounded'], pShape: ['rounded', 'pointed'], cType: ['rounded', 'truncate', 'emarginate', 'forked'], pattern: ['stripes', 'bars', 'spots', 'eyespot', 'none'], palette: ['orange', 'yellow', 'blue', 'green', 'red', 'silver'] },
    r: { width: [.26, .42], dHeight: [.3, .45], dStart: [.02, .1], dSpan: [.55, .85], aStart: [.5, .65], aSpan: [.2, .3], headLen: [.24, .3], gape: [.12, .25], eyeSize: [.12, .15] },
    lin: [L('damselfish', 'coralReef', 3, { fineness: [2.2, 3.2], width: [.38, .48], length: [.05, .15] }, { palette: ['blue', 'orange', 'yellow', 'silver'], pattern: ['none', 'bars', 'spots'] }),
      L('tang', 'coralReef', 2, { fineness: [1.9, 2.6], width: [.26, .34], dHeight: [.24, .34], aHeight: [.2, .3], gape: [.1, .16], length: [.15, .4], cauAspect: [2.4, 3.2] }, { dShape: ['continuous'], aShape: ['continuous'], cType: ['emarginate', 'lunate'], pattern: ['none', 'stripes'], palette: ['blue', 'yellow'] }),
      L('angelfish', 'coralReef', 2, { fineness: [1.7, 2.4], width: [.26, .34], dHeight: [.38, .52], aHeight: [.32, .48], length: [.15, .45] }, { dShape: ['spinySoft'], cType: ['truncate', 'rounded'], pattern: ['stripes', 'bars', 'spots'], palette: ['blue', 'yellow', 'orange'] }),
      L('chaetodontid', 'coralReef', 2, { fineness: [1.8, 2.4], width: [.26, .34], snoutTaper: [.7, .9], gape: [.1, .16], length: [.1, .25] }, { mouth: ['protrusible'], cType: ['rounded', 'truncate'], pattern: ['bars', 'stripes', 'eyespot'], palette: ['yellow', 'silver', 'orange'] }),
      L('wrasse', 'coralReef', 2, { fineness: [3.2, 4.5], width: [.42, .52], gape: [.18, .3], length: [.1, .6], dStart: [.04, .1], dSpan: [.8, .88] }, { profile: ['fusiform'], cross: ['oval'], mouth: ['protrusible'], dShape: ['continuous'], pShape: ['pointed'], cType: ['rounded', 'truncate', 'emarginate'], pattern: ['stripes', 'spots', 'bars'], palette: ['green', 'blue', 'orange'] })] },

  { id: 'shark', name: 'Shark-like cartilaginous fishes', w: 9, sizes: [.7, 5], noun: 'shark',
    d: { profile: ['torpedo'], cross: ['round', 'oval'], mouth: ['subterminal', 'inferior'], teeth: ['triangular'], dN: [2], dShape: ['triangle'], d2Shape: ['triangle'], aShape: ['lobe'], pShape: ['pointed'], pelPos: ['abdominal'], cType: ['heterocercal'], scale: ['denticle'], pattern: [['none', 4], 'spots', 'saddles'], palette: ['slate', 'coolgrey', 'brown', 'sand'] },
    r: { fineness: [5.2, 7.2], width: [.75, .95], peakU: [.3, .4], snoutDepth: [.12, .2], pedDepth: [.1, .22], headLen: [.2, .26], snoutTaper: [.6, .8], eyeSize: [.05, .09], eyeU: [.4, .55], eyeV: [.3, .45], gape: [.5, .65], dStart: [.12, .25], dSpan: [.2, .28], dHeight: [.55, .9], d2Gap: [.3, .4], d2Span: [.1, .17], d2Height: [.15, .3], aStart: [.6, .75], aSpan: [.1, .2], aHeight: [.12, .22], pecU: [.05, .12], pecV: [-.45, -.25], pecLen: [.7, 1.1], pecBase: [.4, .5], pelLen: [.3, .45], cauLen: [.22, .29], cauAspect: [1.8, 2.3], teethCount: [20, 36], shade: [.75, .92], gloss: [.25, .45], iri: [.02, .1] },
    lin: [L('requiemShark', 'openOcean', 4, null, { pattern: ['none'] }), L('mackerelShark', 'openOcean', 2, { fineness: [4.6, 5.4], width: [.9, 1.1], gape: [.6, .75], dHeight: [.55, .72], aHeight: [.08, .14], d2Height: [.08, .14], keel: [.6, 1], pedDepth: [.1, .14], cauAspect: [3.6, 4.2], cauLen: [.2, .26], length: [2, 5] }, { cType: ['lunate'], mouth: ['subterminal'], teeth: ['fang'], pattern: ['none'] }),
      L('carpetShark', 'coralReef', 2, { fineness: [5, 6.5], eyeSize: [.06, .09], gape: [.25, .35], dStart: [.5, .58], dSpan: [.12, .18], d2Gap: [.04, .08], d2Span: [.1, .14], dHeight: [.3, .45], barbels: [0, 2], barbelLen: [.15, .3], length: [.8, 3] }, { mouth: ['inferior'], teeth: ['molar'], pShape: ['rounded'], dShape: ['rounded'], d2Shape: ['rounded'], profile: ['fusiform'], pattern: ['none', 'spots', 'saddles'] }),
      L('hammerhead', 'openOcean', 1, { specialLen: [.09, .11], specialWid: [.24, .3], eyeU: [.22, .3], eyeV: [.0, .1], eyeSize: [.05, .08], gape: [.3, .4], snoutTaper: [.2, .3], snoutDepth: [.22, .28], dHeight: [.8, 1.05], length: [1.5, 4] }, { special: ['hammer'], mouth: ['inferior'], pattern: ['none'] })] },

  { id: 'tuna', name: 'Tuna- and mackerel-like pelagic fishes', w: 8, sizes: [.25, 3], noun: 'mackerel',
    d: { profile: ['torpedo'], cross: ['round', 'oval'], dN: [2], dShape: ['triangle'], d2Shape: ['triangle', 'falcate'], aShape: ['falcate', 'lobe'], pShape: ['pointed'], cType: ['lunate', 'forked'], scale: ['cycloid'], pattern: [['none', 3], 'bars', 'stripes'], palette: ['silver', 'blue'], pelPos: ['thoracic'] },
    r: { fineness: [4, 5.6], width: [.6, .8], peakU: [.38, .44], pedDepth: [.06, .1], pedWidth: [.8, 1.2], snoutTaper: [.7, .85], keel: [.6, 1], headLen: [.22, .28], eyeSize: [.1, .14], eyeV: [.3, .4], gape: [.38, .5], dStart: [.2, .3], dSpan: [.18, .26], dHeight: [.3, .42], d2Gap: [.1, .2], d2Span: [.1, .14], d2Height: [.25, .4], aStart: [.55, .68], aSpan: [.1, .16], aHeight: [.25, .35], pecU: [.05, .12], pecV: [-.1, .15], pecLen: [.6, 1.2], pelLen: [.2, .3], cauLen: [.17, .22], cauAspect: [3.5, 7], teethCount: [10, 24], shade: [.7, .92], iri: [.25, .55] },
    lin: [L('scombrid', 'openOcean', 3, { length: [.6, 3], cauAspect: [5, 7.5] }, { cType: ['lunate'], pattern: ['none'], palette: ['blue', 'silver'] }), L('mackerel', 'openOcean', 3, { fineness: [5.3, 6.5], length: [.25, .6], cauAspect: [3.5, 5], width: [.55, .7] }, { cType: ['forked', 'lunate'], pattern: ['bars', 'stripes'], palette: ['silver', 'blue'] })] },

  { id: 'pike', name: 'Elongate ambush predators (pike, barracuda, gar)', w: 5, sizes: [.4, 2.2], noun: 'pike',
    d: { profile: ['elongate'], cross: ['round', 'oval'], mouth: ['terminal'], teeth: ['needle', 'fang'], dN: [1], dShape: ['triangle', 'rounded'], aShape: ['lobe'], pShape: ['pointed', 'rounded'], pelPos: ['abdominal'], cType: ['forked', 'truncate', 'rounded'], scale: ['cycloid', 'ganoid'], pattern: ['bars', 'spots', 'stripes'], palette: ['olive', 'silver', 'brown'] },
    r: { fineness: [7, 10], width: [.65, .8], peakU: [.4, .52], snoutDepth: [.1, .22], pedDepth: [.12, .22], headLen: [.28, .36], snoutTaper: [.8, .95], eyeSize: [.06, .11], eyeU: [.55, .72], gape: [.55, .7], jawRatio: [.95, 1.1], dStart: [.68, .8], dSpan: [.1, .16], dHeight: [.35, .5], aStart: [.62, .78], aSpan: [.1, .16], aHeight: [.25, .4], pecU: [.04, .12], pecLen: [.4, .6], cauLen: [.14, .2], cauAspect: [1.8, 2.6], teethCount: [16, 34] },
    lin: [L('esociform', 'lake', 3, { gape: [.5, .65] }, { cType: ['forked', 'truncate'], pattern: ['spots', 'bars'], palette: ['olive'] }), L('barracuda', 'coralReef', 2, { fineness: [7.5, 9], dStart: [.3, .4], dSpan: [.08, .12], d2Gap: [.2, .3], d2Span: [.08, .12], length: [.6, 1.8] }, { dN: [2], dShape: ['triangle'], d2Shape: ['triangle'], teeth: ['fang'], pattern: ['bars', 'none'], palette: ['silver'], cType: ['forked'] }),
      L('gar', 'slowRiver', 1, { fineness: [8, 11], eyeU: [.7, .8], snoutTaper: [.9, .98], dStart: [.8, .85], dSpan: [.08, .11], aStart: [.8, .85], aSpan: [.08, .11], headLen: [.3, .4], length: [.6, 2.2] }, { teeth: ['needle'], cType: ['rounded'], scale: ['ganoid'], pattern: ['spots', 'none'], palette: ['olive', 'brown'] })] },

  { id: 'eel', name: 'Eel-like fishes', w: 6, sizes: [.4, 2.5], noun: 'eel',
    d: { profile: ['eel'], cross: ['round'], mouth: ['terminal'], teeth: ['fang', 'villiform'], dShape: ['continuous'], aShape: ['continuous'], pShape: ['rounded'], pelvic: [false], cType: ['diphycercal'], scale: ['bare'], pattern: ['mottle', 'reticulate', 'spots', 'none'], palette: ['brown', 'olive', 'mud', 'silver'] },
    r: { fineness: [11, 16], width: [.85, 1], peakU: [.3, .45], snoutDepth: [.3, .45], pedDepth: [.3, .5], headLen: [.1, .15], snoutTaper: [.3, .5], eyeSize: [.08, .13], gape: [.4, .7], dStart: [.04, .35], dSpan: [.6, .95], dHeight: [.2, .3], aStart: [.04, .3], aSpan: [.6, .95], aHeight: [.2, .3], pecU: [.02, .1], pecLen: [.3, .5], pecBase: [.2, .3], cauLen: [.04, .08], cauAspect: [.5, .9], shade: [.3, .6], teethCount: [10, 30] },
    lin: [L('moray', 'coralReef', 3, { gape: [.65, .8], length: [.5, 1.6] }, { teeth: ['fang'], pattern: ['mottle', 'reticulate', 'spots'], palette: ['brown', 'olive', 'mud'] }), L('conger', 'openOcean', 2, { gape: [.45, .6], length: [1, 2.5] }, { teeth: ['villiform'], pattern: ['none'], palette: ['slate', 'mud', 'silver'] }), L('freshwaterEel', 'slowRiver', 2, { gape: [.28, .35], length: [.5, 1.2] }, { teeth: ['villiform'], pattern: ['none', 'mottle'], palette: ['olive', 'mud', 'brown'] })] },

  { id: 'flat', name: 'Flatfishes', w: 5, flat: true, sizes: [.15, 1], noun: 'flounder',
    d: { profile: ['depressed'], cross: ['oval'], mouth: ['terminal'], dShape: ['continuous'], aShape: ['continuous'], pShape: ['rounded'], pelPos: ['thoracic'], cType: ['rounded', 'truncate'], pattern: ['mottle', 'spots', 'eyespot'], palette: ['sand', 'brown', 'mud'], eyeSide: ['left'] },
    r: { fineness: [2, 2.8], width: [.22, .3], peakU: [.38, .44], headLen: [.22, .3], eyeSize: [.1, .15], eyeU: [.35, .45], eyeV: [.55, .8], gape: [.25, .4], dStart: [.02, .08], dSpan: [.88, .94], dHeight: [.2, .28], aStart: [.02, .1], aSpan: [.85, .92], aHeight: [.2, .28], pecU: [.02, .1], pecV: [.1, .25], pecLen: [.3, .45], cauLen: [.14, .22], cauAspect: [.9, 1.3], shade: [.9, 1], iri: [.02, .1], patDens: [.4, .8], scaleSize: [.8, 1.2] },
    lin: [L('flatfish', 'sandFlat', 1, null, null)] },

  { id: 'pipe', name: 'Seahorses and pipefishes', w: 4, curl: true, sizes: [.08, .4], noun: 'seahorse',
    d: { profile: [['tapered', 1]], cross: ['boxy', 'oval'], mouth: ['tube'], teeth: ['none'], dShape: ['rounded'], aShape: ['rounded'], pShape: ['fan'], pelvic: [false], anal: [true], cType: ['rounded'], scale: ['plates'], pattern: ['mottle', 'spots', 'bars', 'none'], palette: ['brown', 'sand', 'yellow', 'olive', 'orange'] },
    r: { headLen: [.2, .26], eyeSize: [.1, .15], eyeU: [.6, .7], gape: [.05, .08], snoutTaper: [.85, .95], dStart: [.4, .45], dSpan: [.12, .16], dHeight: [.3, .4], aStart: [.5, .75], aSpan: [.05, .09], aHeight: [.2, .3], teethCount: [0, 0], cauLen: [.04, .06] },
    lin: [L('seahorse', 'seagrass', 3, { fineness: [5, 7], width: [.6, .75], pedDepth: [.07, .1], curl: [.5, .68], posture: [82, 90], dorsalFrac: [.46, .5], peakU: [.3, .4], length: [.08, .3], pecU: [0, .05], pecLen: [.28, .34] }, { profile: ['tapered'], cType: ['rounded'], dN: [1], caudal: [false] }),
      L('pipefish', 'seagrass', 2, { fineness: [13, 17], width: [.8, .95], pedDepth: [.35, .45], curl: [0, 0], posture: [0, 0], length: [.1, .4], pecLen: [.3, .4] }, { profile: ['ribbon'], cross: ['round'] })] },

  { id: 'cat', name: 'Catfish-like bottom feeders', w: 6, sizes: [.15, 2], noun: 'catfish',
    d: { profile: ['depressed', 'fusiform'], cross: ['depressed', 'oval'], mouth: ['terminal', 'subterminal', 'inferior'], teeth: ['villiform'], dN: [1], dShape: ['sail', 'rounded'], aShape: ['lobe', 'rounded'], pShape: ['pointed', 'rounded'], pelPos: ['abdominal'], cType: ['forked', 'truncate', 'rounded'], scale: ['bare'], pattern: ['mottle', 'none', 'spots'], palette: ['mud', 'brown', 'olive', 'coolgrey'] },
    r: { fineness: [4.5, 6.5], width: [.9, 1.2], peakU: [.22, .3], snoutDepth: [.3, .4], pedDepth: [.15, .28], headLen: [.22, .3], snoutTaper: [.1, .25], forehead: [0, .1], eyeSize: [.05, .1], eyeV: [.55, .65], gape: [.5, .7], barbels: [4, 8], barbelLen: [.3, .8], dStart: [.08, .14], dSpan: [.12, .16], dHeight: [.4, .55], aStart: [.35, .5], aSpan: [.3, .45], aHeight: [.2, .3], pecV: [-.55, -.45], pecLen: [.4, .7], pecU: [.02, .08], dorsalFrac: [.58, .62], iri: [.02, .1], cauAspect: [1.5, 2.4] },
    lin: [L('siluriform', 'slowRiver', 1, null, null)] },

  { id: 'box', name: 'Boxfishes, puffers and triggerfishes', w: 5, sizes: [.08, .5], noun: 'boxfish',
    d: { profile: ['boxy', 'globose', 'deep'], cross: ['boxy', 'oval'], mouth: ['terminal'], teeth: ['beak'], dShape: ['rounded'], aShape: ['rounded'], pShape: ['rounded', 'pointed'], pelvic: [false], cType: ['rounded', 'truncate'], scale: ['plates', 'bare'], pattern: ['spots', 'mottle', 'stripes'], palette: ['yellow', 'sand', 'blue', 'brown', 'olive'] },
    r: { fineness: [1.8, 3], width: [.7, .9], pedDepth: [.2, .28], pedWidth: [.35, .5], dorsalFrac: [.47, .5], eyeSize: [.1, .15], eyeU: [.6, .7], eyeV: [.55, .7], gape: [.1, .18], dStart: [.72, .78], dSpan: [.08, .12], dHeight: [.3, .4], aStart: [.75, .8], aSpan: [.08, .12], aHeight: [.3, .38], pecLen: [.4, .7], cauLen: [.16, .25], cauAspect: [.9, 1.3], teethCount: [2, 4], hump: [0, 0] },
    lin: [L('boxfish', 'coralReef', 2, { fineness: [1.8, 2.5], length: [.1, .4] }, { profile: ['boxy'], cross: ['boxy'], scale: ['plates'] }), L('pufferfish', 'coralReef', 2, { fineness: [2.4, 3.1], length: [.1, .5] }, { profile: ['globose'], cross: ['oval'], scale: ['bare'], pattern: ['spots', 'mottle'] })] },

  { id: 'angler', name: 'Anglerfishes (lure-bearing ambush predators)', w: 3, sizes: [.08, .6], noun: 'anglerfish',
    d: { profile: ['globose'], cross: ['oval'], mouth: ['terminal', 'protrusible'], teeth: ['needle', 'villiform'], special: ['esca'], dShape: ['rounded'], aShape: ['rounded'], pShape: ['rounded'], pelPos: ['thoracic'], pelvic: [true], cType: ['rounded'], scale: ['bare'], pattern: ['mottle', 'spots', 'none'], palette: ['brown', 'sand', 'olive', 'mud'] },
    r: { fineness: [1.7, 2.4], width: [.65, .85], headLen: [.34, .42], eyeSize: [.05, .1], eyeV: [.55, .65], gape: [.7, .85], specialLen: [.15, .3], dStart: [.45, .55], dSpan: [.3, .4], dHeight: [.3, .38], aStart: [.5, .6], aSpan: [.18, .26], aHeight: [.25, .32], cauLen: [.14, .22], cauAspect: [.8, 1.2], teethCount: [16, 40], shade: [.1, .4], pecLen: [.45, .6] },
    lin: [L('frogfish', 'seagrass', 3, { length: [.06, .3] }, { teeth: ['villiform'], pattern: ['mottle', 'spots'], palette: ['sand', 'brown', 'orange', 'yellow'] }), L('anglerfish', 'abyssal', 2, { length: [.1, .6], headLen: [.36, .45], gape: [.78, .88], eyeSize: [.05, .08] }, { teeth: ['needle'], mouth: ['terminal'], pattern: ['none'], palette: ['blackdeep', 'reddeep'] })] },

  { id: 'deep', name: 'Deep-sea fishes (photophore-bearing)', w: 5, deep: true, sizes: [.04, 1], noun: 'lightfish',
    d: { profile: ['fusiform', 'elongate'], cross: ['compressed', 'oval'], mouth: ['terminal'], teeth: ['fang', 'needle', 'villiform'], dN: [1], dShape: ['rounded', 'spinySoft'], aShape: ['lobe'], pShape: ['pointed', 'rounded'], cType: ['forked', 'truncate'], scale: ['bare', 'cycloid'], pattern: ['none'], palette: ['blackdeep', 'reddeep', 'silverdeep'] },
    r: { fineness: [3.4, 8], width: [.45, .65], headLen: [.24, .32], eyeSize: [.1, .15], eyeV: [.3, .5], gape: [.7, .95], eyeV: [.2, .36], dStart: [.3, .55], dSpan: [.12, .2], dHeight: [.25, .4], aStart: [.5, .65], aSpan: [.15, .25], aHeight: [.2, .3], teethCount: [16, 40], photophores: [14, 50], cauAspect: [1.8, 2.8], shade: [.1, .5], iri: [.05, .3], gloss: [.3, .5] },
    lin: [L('stomiid', 'mesopelagic', 3, { length: [.15, .5] }, { teeth: ['fang'], palette: ['blackdeep', 'reddeep'] }), L('viperfish', 'mesopelagic', 2, { fineness: [7, 9], length: [.2, .35], dStart: [.03, .12], dHeight: [.7, 1], gape: [.85, .95] }, { teeth: ['needle'], dShape: ['spinySoft'], palette: ['blackdeep'] }), L('myctophid', 'mesopelagic', 3, { fineness: [3.8, 5], length: [.04, .14], gape: [.5, .62], headLen: [.28, .34], photophores: [20, 40] }, { teeth: ['villiform'], scale: ['cycloid'], palette: ['silverdeep', 'blackdeep'], dShape: ['rounded'] })] },

  { id: 'cod', name: 'Cod-like fishes', w: 4, sizes: [.3, 1.3], noun: 'cod',
    d: { profile: ['fusiform'], cross: ['oval'], mouth: ['terminal', 'subterminal'], dN: [[3, 3], [2, 1]], dShape: ['rounded'], d2Shape: ['rounded'], aShape: ['rounded', 'lobe'], pShape: ['rounded'], pelPos: ['thoracic'], cType: ['truncate', 'rounded'], scale: ['cycloid'], pattern: ['spots', 'none', 'mottle'], palette: ['olive', 'brown', 'sand', 'silver'] },
    r: { fineness: [4.2, 5.2], width: [.55, .65], dStart: [.04, .08], dSpan: [.2, .26], d2Gap: [.03, .06], d2Span: [.2, .26], dHeight: [.3, .42], aStart: [.4, .5], aSpan: [.4, .5], barbels: [1, 1], barbelLen: [.15, .35], pecU: [.04, .12], cauAspect: [1.3, 1.9], headLen: [.24, .3] },
    lin: [L('cod', 'polar', 1, null, null)] },

  { id: 'soft', name: 'Soft-rayed schooling fishes (herring, salmon, carp, tetra)', w: 12, sizes: [.04, 1.1], noun: 'minnow',
    d: { profile: ['fusiform'], cross: ['compressed', 'oval'], mouth: ['terminal'], teeth: ['none', 'villiform'], dN: [1], dShape: ['lobe', 'rounded'], aShape: ['lobe', 'rounded'], pShape: ['pointed', 'rounded'], pelPos: ['abdominal'], cType: ['forked'], scale: ['cycloid'], pattern: ['none', 'stripes', 'spots'], palette: ['silver', 'olive', 'rose'] },
    r: { fineness: [3.6, 5.4], width: [.35, .55], peakU: [.38, .46], pedDepth: [.15, .3], dStart: [.3, .42], dSpan: [.12, .2], dHeight: [.3, .45], aStart: [.55, .7], aSpan: [.2, .3], aHeight: [.15, .25], pecV: [-.55, -.4], cauAspect: [2.2, 3.6], eyeSize: [.1, .15], headLen: [.2, .27] },
    lin: [L('clupeiform', 'openOcean', 3, { fineness: [4.4, 5.2], width: [.35, .45], length: [.1, .35], pedDepth: [.26, .34] }, { mouth: ['terminal'], teeth: ['none'], pattern: ['none'], palette: ['silver'] }),
      L('salmonid', 'fastRiver', 2, { fineness: [4.3, 5.2], width: [.5, .6], length: [.3, 1.1], dStart: [.3, .36], aStart: [.58, .64], gape: [.5, .62] }, { teeth: ['villiform'], pattern: ['spots', 'none'], palette: ['silver', 'olive', 'rose'], cType: ['forked', 'emarginate'] }),
      L('minnow', 'mountainStream', 2, { fineness: [4.2, 5.5], length: [.04, .12], dStart: [.3, .45], gape: [.2, .35] }, { mouth: ['terminal', 'protrusible'], pattern: ['stripes', 'none', 'spots'], palette: ['silver', 'olive', 'gold', 'orange'] }),
      L('characin', 'blackwater', 2, { fineness: [2.8, 4.2], width: [.35, .45], length: [.03, .15] }, { teeth: ['villiform'], cross: ['compressed'], pattern: ['stripes', 'none', 'spots'], palette: ['silver', 'red', 'blue', 'orange'], cType: ['forked'] })] },

  { id: 'ray', name: 'Skates and stingrays (flattened batoids)', w: 3, sizes: [.4, 2], noun: 'ray',
    d: { profile: ['depressed'], cross: ['depressed'], mouth: ['inferior'], teeth: ['molar'], dN: [1], dShape: ['rounded'], pShape: ['rounded'], pelPos: ['abdominal'], cType: ['rounded'], scale: ['denticle'], pattern: ['none', 'spots', 'mottle'], palette: ['sand', 'brown', 'coolgrey'], anal: [false] },
    r: { fineness: [7, 9], width: [2.1, 2.8], peakU: [.35, .45], snoutDepth: [.1, .2], pedDepth: [.06, .1], headLen: [.2, .26], eyeSize: [.06, .1], eyeU: [.55, .62], eyeV: [.9, .97], gape: [.25, .4], dStart: [.84, .9], dSpan: [.04, .08], dHeight: [.35, .45], pecU: [0, .05], pecV: [.05, .15], pecLen: [1.3, 1.9], pecBase: [.95, 1], pelLen: [.35, .45], cauLen: [.04, .08], cauAspect: [.8, 1.2], teethCount: [16, 24], shade: [.8, .95] },
    lin: [L('stingray', 'sandFlat', 1, null, { pattern: ['none', 'spots', 'mottle'] })] },

  { id: 'ancient', name: 'Sturgeon-like armoured fishes', w: 2, sizes: [.8, 3.5], noun: 'sturgeon',
    d: { profile: ['elongate', 'fusiform'], cross: ['round', 'oval'], mouth: ['subterminal'], teeth: ['none'], dN: [1], dShape: ['rounded'], aShape: ['rounded'], pShape: ['rounded'], pelPos: ['abdominal'], cType: ['heterocercal'], scale: ['ganoid'], pattern: ['none'], palette: ['coolgrey', 'olive', 'brown'] },
    r: { fineness: [6.5, 8.5], width: [.8, 1], peakU: [.35, .45], snoutDepth: [.06, .12], pedDepth: [.1, .18], headLen: [.22, .28], snoutTaper: [.8, .9], eyeSize: [.05, .08], eyeU: [.4, .48], eyeV: [.4, .55], gape: [.2, .3], teethCount: [0, 0], barbels: [4, 4], barbelLen: [.2, .35], dStart: [.7, .78], dSpan: [.1, .15], dHeight: [.3, .4], aStart: [.7, .8], aSpan: [.1, .14], aHeight: [.25, .32], pecLen: [.4, .6], cauAspect: [1.5, 2.2], keel: [0, .3] },
    lin: [L('sturgeon', 'slowRiver', 1, null, null)] },

  { id: 'scorp', name: 'Scorpionfishes (spiny rock-dwellers)', w: 3, sizes: [.1, .6], noun: 'scorpionfish',
    d: { profile: ['fusiform', 'deep'], cross: ['oval'], mouth: ['terminal'], dN: [1], dShape: ['spines', 'spinySoft'], aShape: ['rounded'], pShape: ['fan', 'rounded'], cType: ['rounded', 'truncate'], pattern: ['mottle', 'bars', 'spots'], palette: ['red', 'brown', 'orange', 'sand'] },
    r: { fineness: [2.6, 3.6], width: [.55, .7], headLen: [.34, .42], eyeSize: [.09, .14], eyeV: [.55, .65], gape: [.55, .75], dStart: [.02, .08], dSpan: [.8, .88], dHeight: [.3, .42], aStart: [.55, .65], aSpan: [.18, .26], pecLen: [.5, .8], cauAspect: [1, 1.5] },
    lin: [L('scorpaenid', 'coralReef', 1, null, null)] },
];
export const _FUS = FUS;
