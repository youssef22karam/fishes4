  'body.fineness': r(1.7, 1.95), 'body.width': r(.58, .7), 'body.peakU': r(.39, .44),
  'body.frontPow': 1, 'body.backPow': r(2.25, 2.65), 'body.snoutDepth': .28, 'body.pedDepth': .21,
  'body.pedU': .86, 'body.superN': 1.95, 'head.lengthFrac': r(.22, .26),
  'head.snoutTaper': .3, 'head.foreheadSlope': .08, 'head.eyeSize': r(.13, .16),
  'mouth.type': 'protrusible', 'mouth.lips': .35, 'fins.pectoral.v': r(-.5, -.4),
  'fins.pectoral.len': r(.46, .58), 'fins.pectoral.opacity': .74,
  'fins.dorsal.height': r(.4, .52), 'fins.dorsal.opacity': .82,
  'fins.caudal.type': 'fantail', 'fins.caudal.len': r(.32, .39),
  'fins.caudal.aspect': r(1.35, 1.65), 'fins.caudal.notch': .45,
  'fins.caudal.span': r(1.4, 1.75), 'fins.caudal.opacity': .76,
  'skin.scaleSize': r(.68, .9), 'skin.gloss': .68, 'skin.belly': [28, .72, .64],
  'skin.countershade': .16, 'skin.eye': [34, .18, .12]
});
/* ==================================================================
   ANATOMICAL CONSTRUCTION PROFILES
   Inherited construction data, distinct from ecology. Niche sampling
   cannot turn cartilaginous fins into a teleost's spiny membrane.
   ================================================================== */
/** @typedef {{family:string,solid:boolean,gills:string,root:number,tailSpan:number[],locks:Object,bounds:Object,traits:Object}} AnatomyProfile */
const ANATOMY = {
  fish: { family: 'rayfin', label: 'Ray-finned fusiform', solid: false, gills: 'opercular', root: .036, freeTip: 0, eyeInset: .32, tailSpan: [.85, 2.4], dorsalLimit: 1.15,
    locks: { 'head.operculum': true, 'head.gillSlits': 0 }, bounds: { 'head.gillStart': [.45, GILL_START_MAX], 'mouth.cavityDepth': [.3, .78] },
    traits: { 'body.shoulder': r(.12, .22), 'body.tailTaper': r(.58, .75), 'fins.caudal.span': r(1.2, 1.7), 'fins.caudal.notch': r(.48, .63) } },
  agnatha: { family: 'jawless', label: 'Jawless ribbon', gills: 'pores', eyeInset: .55, tailSpan: [.5, 1.1],
    locks: { 'head.operculum': false, 'head.gillSlits': 7, 'mouth.type': 'suction', 'fins.pectoral.present': false, 'fins.pelvic.present': false, 'swim.mode': 'anguilliform' },
    traits: { 'fins.caudal.span': r(.65, .9) } },
  chondrichthyes: { family: 'shark', label: 'Cartilaginous hydrofoil', solid: true, gills: 'lateral', root: .075, freeTip: .12, eyeInset: .45, tailSpan: [1.15, 2.8], dorsalLimit: 1.3,
    locks: { 'head.operculum': false, 'head.gillSlits': 5, 'fins.dorsal.spines': 0, 'fins.anal.spines': 0, 'fins.dorsal2.spines': 0, 'fins.pelvic.position': 'abdominal' },
    bounds: { 'body.width': [.62, 1.3], 'fins.pectoral.insertAngle': [50, 85], 'fins.pectoral.v': [-.65, -.15], 'mouth.gape': [.15, .92], 'head.eyeForward': [.04, .28] },
    traits: { 'head.gillStart': r(.55, .62), 'head.gillHeight': r(.8, 1.0), 'head.gillSlant': r(.12, .25), 'fins.dorsal.apex': r(.34, .45), 'fins.dorsal.curvature': r(.5, .7), 'fins.caudal.span': r(1.65, 2.15), 'body.shoulder': r(.1, .18), 'mouth.open': r(.025, .065), 'mouth.cornerCurve': r(.65, .85), 'skin.iridescence': .025, 'skin.eye': [35, .12, .12] } },
  requiemShark: { bounds: { 'fins.dorsal.height': [.5, .95], 'fins.dorsal2.height': [.16, .4] }, traits: { 'fins.dorsal.shape': 'triangle', 'fins.dorsal.sweep': r(.22, .4), 'fins.dorsal2.shape': 'triangle', 'fins.dorsal2.height': r(.18, .27) } },
  mackerelShark: { label: 'Lamnid fusiform', tailSpan: [1.3, 2.1], traits: { 'fins.dorsal.shape': 'triangle', 'fins.dorsal.height': r(.55, .72), 'fins.dorsal2.height': r(.08, .14), 'fins.anal.height': r(.08, .14), 'fins.caudal.span': r(1.5, 1.85), 'fins.caudal.aspect': r(3.6, 4.3), 'body.shoulder': r(.22, .3) } },
  hammerhead: { label: 'Cephalofoil shark', dorsalLimit: 1.6, eyeInset: .08, traits: { 'fins.dorsal.apex': r(.4, .53), 'fins.dorsal.sweep': r(.35, .55), 'fins.dorsal2.height': r(.2, .32), 'fins.dorsal.shape': 'triangle', 'fins.dorsal.height': r(.85, 1.1), 'head.special': 'hammer', 'head.specialLen': r(.08, .11), 'head.specialWidth': r(.24, .3), 'head.eyeU': r(.22, .3), 'head.eyeV': r(0, .1), 'head.eyeSize': r(.08, .1), 'mouth.type': 'inferior', 'mouth.gape': r(.3, .4), 'head.snoutTaper': .2, 'body.snoutDepth': r(.22, .28), 'skin.base': hsl([35, 55], [.12, .22], [.32, .42]) } },
  carpetShark: { label: 'Benthic carpet shark', freeTip: .07, locks: { 'head.spiracles': true }, traits: { 'fins.dorsal.shape': 'rounded', 'fins.dorsal2.shape': 'rounded', 'fins.caudal.span': r(.95, 1.35), 'fins.pectoral.apex': .48, 'mouth.open': .03 } },
  whaleShark: { label: 'Broad-headed filter shark', traits: { 'fins.caudal.span': r(1.75, 2.25), 'fins.dorsal.height': r(.65, .85), 'mouth.open': r(.15, .25), 'head.snoutTaper': .15 } },
  angelShark: { family: 'benthicShark', label: 'Depressed angel shark', bounds: { 'body.width': [1.8, 2.6], 'fins.pectoral.v': [-.25, .15], 'fins.pectoral.insertAngle': [75, 90] }, locks: { 'head.spiracles': true, 'fins.anal.present': false }, traits: { 'body.fineness': r(6.5, 8), 'fins.caudal.span': r(.95, 1.4) } },
  deepSeaShark: { traits: { 'fins.dorsal.shape': 'triangle', 'fins.caudal.span': r(1.3, 1.75), 'head.spiracles': true } },
  batoid: { family: 'ray', label: 'Fused batoid disc', gills: 'ventral', root: .08, freeTip: 0, dorsalLimit: .85, tailSpan: [.45, 1.25],
    locks: { 'head.spiracles': true, 'fins.pectoral.present': true, 'fins.pectoral.v': .05, 'swim.mode': 'rajiform' },
    bounds: { 'body.width': [1.6, 3.2], 'fins.pectoral.insertAngle': [80, 90], 'fins.pectoral.v': [0, .15] }, traits: { 'body.fineness': r(7, 9), 'body.width': r(2.1, 2.8), 'fins.caudal.span': r(.6, 1), 'mouth.open': .035 } },
  manta: { label: 'Mobulid wing disc', traits: { 'body.fineness': r(7.3, 8.6), 'body.width': r(1.85, 2.15), 'body.peakU': r(.32, .39), 'body.snoutDepth': r(.17, .23), 'fins.pectoral.curvature': r(.35, .5), 'fins.pectoral.apex': .4, 'skin.fin': [220, .09, .13] } },
  sawfish: { family: 'sawfish', label: 'Pristid rostrum', gills: 'ventral', locks: { 'swim.mode': 'subcarangiform' }, bounds: { 'body.width': [1.1, 1.6] }, traits: { 'fins.caudal.span': r(1.25, 1.65), 'fins.dorsal.shape': 'triangle', 'fins.dorsal2.shape': 'triangle' } },
  chimaera: { family: 'chimaera', label: 'Chimaeroid taper', solid: false, gills: 'opercular', root: .04, locks: { 'head.operculum': true, 'head.gillSlits': 0, 'fins.dorsal.spines': 1, 'skin.scale': 'bare', 'head.spiracles': false }, bounds: { 'body.width': [.5, .9], 'fins.pectoral.v': [-.4, .3], 'fins.pectoral.insertAngle': [20, 65] }, traits: { 'fins.caudal.span': r(.55, .8) } },
  sturgeon: { label: 'Scuted sturgeon', solid: true, root: .05, tailSpan: [1, 1.8], traits: { 'fins.caudal.span': r(1.2, 1.6), 'head.snoutTaper': .8 } },
  gar: { family: 'longjaw', label: 'Ganoid long-jawed ambusher', tailSpan: [.9, 1.55], traits: { 'fins.caudal.span': r(1.05, 1.4), 'body.shoulder': .1 } },
  bowfin: { label: 'Amiid ribbon dorsal', traits: { 'fins.dorsal.curvature': .3 } },
  bichir: { family: 'finlet', label: 'Polypterid finlets', separatedDorsal: true, solid: true, root: .045, traits: { 'fins.caudal.span': r(.9, 1.3) } },
  eel: { family: 'ribbon', label: 'Continuous eel median fins', root: .025, tailSpan: [.5, 1.25], locks: { 'fins.pelvic.present': false, 'swim.mode': 'anguilliform' }, traits: { 'fins.caudal.span': r(.65, 1), 'body.shoulder': .08, 'mouth.open': r(.05, .1), 'fins.dorsal.curvature': .2 } },
  gulper: { locks: { 'head.special': 'none' }, traits: { 'body.peakU': .23, 'body.shoulder': .08, 'mouth.open': r(.2, .35) } },
  siluriform: { family: 'catfish', label: 'Broad-headed catfish', eyeInset: .48, traits: { 'body.shoulder': r(.18, .3), 'mouth.cornerCurve': .65, 'skin.iridescence': .06 } },
  esociform: { family: 'longjaw', label: 'Esox elongated jaw', traits: { 'mouth.cornerCurve': .5, 'body.shoulder': .1, 'fins.caudal.span': r(1.15, 1.65) } },
  barracuda: { family: 'longjaw', label: 'Sphyraenid long jaw', traits: { 'fins.dorsal.shape': 'triangle', 'fins.dorsal2.shape': 'falcate', 'fins.caudal.span': r(1.2, 1.65) } },
  cichlid: { family: 'spiny', label: 'Cichlid spiny-soft fin', traits: { 'fins.dorsal.curvature': r(.35, .55), 'fins.dorsal.height': r(.3, .45), 'fins.caudal.span': r(1.05, 1.4) } },
  percoid: { family: 'spiny', label: 'Percoid spiny-soft fin', traits: { 'fins.dorsal.apex': .3, 'fins.caudal.span': r(1.1, 1.6) } },
  grouper: { label: 'Serranid ambush form', traits: { 'head.eyeForward': r(.12, .28), 'body.shoulder': r(.22, .35), 'mouth.open': r(.07, .13), 'fins.caudal.span': r(.95, 1.25) } },
  jack: { family: 'pelagic', label: 'Carangid sickle fins', traits: { 'fins.dorsal2.apex': .24, 'fins.pectoral.apex': .27, 'fins.caudal.span': r(1.35, 1.7) } },
  scombrid: { family: 'pelagic', label: 'Scombrid high-aspect foils', solid: true, root: .045, dorsalLimit: 1.25, tailSpan: [1.15, 2], traits: { 'fins.dorsal.shape': 'triangle', 'fins.dorsal2.apex': .2, 'fins.anal.apex': .22, 'fins.pectoral.curvature': .65, 'fins.caudal.span': r(1.5, 1.85), 'body.shoulder': r(.24, .35), 'mouth.open': .035 } },
  mackerel: { solid: false, traits: { 'fins.caudal.span': r(1.35, 1.7), 'body.shoulder': .16 } },
  billfish: { family: 'pelagic', label: 'Istiophorid bill and sickle', root: .04, dorsalLimit: 1.3, traits: { 'fins.caudal.span': r(1.5, 1.9), 'fins.dorsal.apex': .15, 'fins.dorsal2.height': r(.12, .2), 'mouth.open': .035 } },
  sailfish: { family: 'sail', label: 'Istiophorid sail', dorsalLimit: 2.15, traits: { 'fins.dorsal.shape': 'sail', 'fins.dorsal.height': r(1.45, 1.8) } },
  swordfish: { solid: true, traits: { 'fins.dorsal.shape': 'falcate', 'fins.dorsal.apex': .4 } },
  chaetodontid: { family: 'compressed', label: 'Compressed reef fin envelope', tailSpan: [.45, 1.45], traits: { 'fins.caudal.span': r(.5, .7), 'mouth.open': .025, 'body.shoulder': .1, 'fins.dorsal.rootBlend': .8 } },
  angelfish: { traits: { 'fins.dorsal.height': r(.45, .65), 'fins.anal.height': r(.4, .6), 'fins.caudal.span': r(.55, .8) } },
  tang: { traits: { 'fins.caudal.span': r(.65, .9), 'fins.dorsal.height': r(.28, .4) } },
  wrasse: { family: 'labrid', label: 'Labrid low dorsal and rowing fins', traits: { 'fins.pectoral.apex': .5, 'mouth.open': .035, 'fins.caudal.span': r(1, 1.35) } },
  damselfish: { family: 'compressed', label: 'Pomacentrid reef form', tailSpan: [.45, 1.4], traits: { 'fins.caudal.span': r(.7, .95), 'mouth.open': .03 } },
  clownfish: { traits: { 'skin.fin': [23, .78, .43], 'fins.dorsal.height': r(.28, .37), 'fins.caudal.span': r(.62, .82) } },
  blenny: { family: 'ribbon', label: 'Blenniid continuous dorsal', traits: { 'fins.caudal.span': r(.95, 1.25) }, locks: { 'fins.pelvic.present': true } },
  goby: { family: 'benthic', label: 'Gobiid benthic fan', traits: { 'fins.pectoral.curvature': .3, 'fins.caudal.span': r(1.1, 1.4) } },
  tetraodontiform: { family: 'rigid', label: 'Rigid-body median-fin propulsion', root: .035, tailSpan: [.45, 1.45], locks: { 'fins.pelvic.present': false, 'swim.mode': 'ostraciiform' }, traits: { 'body.shoulder': .1, 'fins.caudal.span': r(.7, 1), 'mouth.open': .02 } },
  triggerfish: { label: 'Balistid trigger and soft dorsal', traits: { 'fins.dorsal2.height': r(.45, .6), 'fins.caudal.span': r(1, 1.45) } },
  boxfish: { solid: true, label: 'Ostraciid carapace', traits: { 'skin.iridescence': .08 } },
  pufferfish: { label: 'Tetraodontid rounded trunk', traits: { 'fins.pectoral.apex': .5, 'fins.caudal.span': r(.8, 1.1) } },
  sunfish: { family: 'molid', label: 'Molid clavus and opposed fins', tailSpan: [.7, 1.15], dorsalLimit: 1.4, traits: { 'fins.caudal.span': r(.8, 1), 'fins.caudal.len': .045, 'fins.dorsal.apex': .43, 'fins.anal.apex': .43, 'body.pedDepth': .72 } },
  syngnathid: { family: 'pipe', label: 'Syngnathid tubular snout', tailSpan: [.5, 1.2], locks: { 'mouth.type': 'tube', 'mouth.teeth': 'none', 'fins.pelvic.present': false }, traits: { 'fins.caudal.span': r(.7, 1), 'mouth.open': .01 } },
  seahorse: { family: 'upright', label: 'Hippocampine upright trunk and curl', locks: { 'fins.caudal.present': false, 'swim.mode': 'hippocampiform' }, traits: { 'body.shoulder': .3 } },
  flatfish: { family: 'flatfish', label: 'Asymmetric flatfish median envelope', tailSpan: [.7, 1.3], locks: { 'body.roll': -90, 'head.eyeSide': 'left' }, traits: { 'fins.caudal.span': r(.85, 1.1), 'body.shoulder': .05, 'skin.iridescence': .025 } },
  scorpaenid: { family: 'spiny', label: 'Scorpaenid spines and head ridges', traits: { 'body.shoulder': .35, 'mouth.open': r(.06, .12) } },
  lionfish: { family: 'lion', label: 'Pteroine isolated spines and fan', dorsalLimit: 1.6, traits: { 'fins.pectoral.apex': .48, 'fins.pectoral.curvature': .25, 'skin.iridescence': .08, 'fins.caudal.span': r(1, 1.3) } },
  lophiiform: { family: 'angler', label: 'Lophiiform suction head', tailSpan: [.45, 1.7], traits: { 'body.shoulder': .28, 'mouth.cornerCurve': .7, 'mouth.open': r(.1, .2), 'skin.iridescence': .015, 'fins.caudal.span': r(.6, .9) } },
  myctophid: { label: 'Myctophid photophore form', traits: { 'mouth.open': .07 } },
  stomiid: { family: 'longjaw', label: 'Stomiid fang-bearing jaw', traits: { 'mouth.open': r(.15, .3), 'fins.caudal.span': r(1.2, 1.6) } },
  cod: { label: 'Gadid three-dorsal body plan', locks: { 'fins.dorsal.count': 3 }, traits: { 'fins.dorsal.count': 3, 'fins.dorsal2.u1': .64, 'fins.dorsal3.u0': .72, 'fins.dorsal3.u1': .97 } },
  grenadier: { family: 'ribbon', label: 'Macrourid taper and median envelope', tailSpan: [.45, 1.1], traits: { 'fins.caudal.span': .55 } },
  snailfish: { family: 'benthic', label: 'Liparid gelatinous benthic form', tailSpan: [.55, 1.15], traits: { 'fins.caudal.span': r(.65, .85), 'skin.iridescence': .025, 'body.shoulder': .25 } },
  sarcopterygii: { family: 'lobefin', label: 'Muscular lobe-fin base', solid: true, root: .09, traits: { 'fins.pectoral.rootBlend': .9 } },
  lungfish: { family: 'ribbon', label: 'Dipnoan ribbon and lobed appendages', tailSpan: [.7, 1.3], traits: { 'fins.caudal.span': r(.85, 1.1) } },
  coelacanth: { family: 'lobefin', label: 'Coelacanth trilobed caudal', traits: { 'fins.caudal.span': r(1.2, 1.55) } },
  anabantoid: { family: 'display', label: 'Anabantoid flexible fin envelope', dorsalLimit: 1.4, traits: { 'fins.caudal.span': r(1.2, 1.8) } },
  betta: { tailSpan: [1.1, 2.8], traits: { 'fins.caudal.span': r(1.8, 2.4), 'fins.caudal.aspect': r(1.3, 1.6), 'fins.dorsal.curvature': .3, 'fins.anal.curvature': .3 } },
  remora: { family: 'pelagic', label: 'Echeneid dorsal suction disc', traits: { 'fins.caudal.span': r(1.1, 1.6) } },
  flyingfish: { family: 'glider', label: 'Exocoetid wing and lower caudal lobe', traits: { 'fins.pectoral.apex': .36, 'fins.caudal.span': r(1.4, 1.85) } },
  knifefish: { family: 'knife', label: 'Gymnotiform undulating anal fin', locks: { 'fins.dorsal.present': false, 'fins.caudal.present': false, 'fins.pelvic.present': false }, traits: { 'fins.anal.curvature': .2, 'body.shoulder': .12 } },
  fantasy: { family: 'fantasy', label: 'Constrained speculative anatomy', tailSpan: [.8, 3.1], dorsalLimit: 2, traits: {} },
  emberfish: { solid: true, root: .06 }, skyswimmer: { family: 'glider' }, crystalfish: { solid: true }, voidfish: { family: 'ribbon' }
};
function mergeAnatomy(target, delta) {
  for (const k in delta) {
    const v = delta[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) target[k] = mergeAnatomy(target[k] && typeof target[k] === 'object' ? target[k] : {}, v);
    else target[k] = Array.isArray(v) ? v.slice() : v;
  }
  return target;
}
function anatomyProfile(g) {
  const out = {};
  for (const node of cladePath(g.meta.clade)) if (ANATOMY[node.id]) mergeAnatomy(out, ANATOMY[node.id]);
  return out;
}
FG.ANATOMY = ANATOMY; FG.anatomyProfile = anatomyProfile;
const ECOLOGY_LIMITS = {
  fish: { bands: ['shelf', 'slope', 'meso', 'abyss', 'hadal'], excluded: [] },
  shark: { bands: ['shelf', 'slope', 'meso'] }, carpetShark: { bands: ['shelf', 'slope'] }, angelShark: { bands: ['shelf', 'slope'] }, whaleShark: { bands: ['shelf', 'slope'] }, deepSeaShark: { bands: ['shelf', 'slope', 'meso', 'abyss'] },
  batoid: { bands: ['shelf', 'slope'] }, chimaera: { bands: ['shelf', 'slope', 'meso', 'abyss'] },
  cypriniform: { bands: ['shelf'] }, characin: { bands: ['shelf'], excluded: ['cold'] }, siluriform: { bands: ['shelf', 'slope'] },
  cichlid: { bands: ['shelf'], excluded: ['cold'] }, bichir: { bands: ['shelf'], excluded: ['cold'] }, arowana: { bands: ['shelf'], excluded: ['cold'] }, anabantoid: { bands: ['shelf'], excluded: ['cold'] },
  moray: { bands: ['shelf', 'slope'] }, conger: { bands: ['shelf', 'slope', 'meso'] }, freshwaterEel: { bands: ['shelf', 'slope'] }, gulper: { bands: ['meso', 'abyss'] },
  chaetodontid: { bands: ['shelf', 'slope'], excluded: ['cold'] }, damselfish: { bands: ['shelf', 'slope'], excluded: ['cold'], requireAny: ['reef', 'shallow'] }, wrasse: { bands: ['shelf', 'slope'] },
  percoid: { bands: ['shelf', 'slope'] }, tetraodontiform: { bands: ['shelf', 'slope'] }, syngnathid: { bands: ['shelf', 'slope'] }, scorpaenid: { bands: ['shelf', 'slope'] },
  frogfish: { bands: ['shelf', 'slope'] }, anglerfish: { bands: ['meso', 'abyss'] }, myctophid: { bands: ['slope', 'meso'] }, stomiid: { bands: ['meso', 'abyss'] },
  grenadier: { bands: ['slope', 'meso', 'abyss'] }, coelacanth: { bands: ['slope', 'meso'] }, remora: { bands: ['shelf', 'slope'] }, flyingfish: { bands: ['shelf'] }, snailfish: { bands: ['meso', 'abyss', 'hadal'] },
  emberfish: { habitats: ['lavaLake'] }, skyswimmer: { habitats: ['skySea'] }, crystalfish: { habitats: ['crystalCavern'] }, voidfish: { habitats: ['void'] }
};
CLADES.deepSeaShark.req = ['deep', 'cold'];
function ecologyProfile(id) { const out = {}; for (const node of cladePath(id)) if (ECOLOGY_LIMITS[node.id]) Object.assign(out, ECOLOGY_LIMITS[node.id]); return out; }
function depthBand(hab) { return { mesopelagic: 'meso', abyssal: 'abyss', hadal: 'hadal', deepReef: 'slope' }[hab.id] || 'shelf'; }
function cladeInNiche(id, niche) {
  const path = cladePath(id).map(n => n.id);
  return Object.keys(niche.clades).some(ref => path.includes(ref) || cladePath(ref).some(n => n.id === id));
}
FG.ECOLOGY_LIMITS = ECOLOGY_LIMITS;
Object.assign(SPECIES.find(s => s.id === 'great-white-shark').t, { 'mouth.teeth': 'triangular', 'mouth.teethCount': ri(24, 34), 'head.eyeSize': r(.08, .12), 'fins.dorsal.sweep': r(.25, .4), 'fins.pectoral.len': r(.95, 1.2) });
/* ╔══════════════════════════════════════════════════════════════════╗
   ║ 5. BODY PROFILE MATH, LANDMARKS, METRICS (pure)                  ║
   ╚══════════════════════════════════════════════════════════════════╝ */
/** Analytic profile in units of body length L. depth(u)/width(u) are full extents. */
function bodyProfile(g) {
  const b = g.body, maxD = 1 / b.fineness;
  const nose = ['bill', 'sword', 'rostrum', 'paddle'].includes(g.head.special) ? .004 : .022 + .017 * (1 - g.head.snoutTaper);
  const cap = u => u < nose ? Math.sqrt(Math.max(0, 1 - Math.pow(1 - u / nose, 2))) : 1;
  const depthF = u => {
    if (u < b.peakU) { const t = clamp(u / b.peakU, 0, 1); return lerp(b.snoutDepth, 1, Math.sin(Math.pow(t, b.frontPow) * Math.PI / 2)); }
    const t = clamp((u - b.peakU) / (1 - b.peakU), 0, 1);
    const taper = lerp(smoother(t), 1 - Math.pow(1 - t, b.backPow + .8), b.tailTaper * .45);
    return lerp(1, b.pedDepth, taper);
  };
  const depth = u => depthF(u) * maxD * cap(u);
  const widthF = u => { if (u < b.peakU) { const t = clamp(u / b.peakU, 0, 1); return lerp(b.snoutWidth, 1, Math.sin(t * Math.PI / 2)); } const t = clamp((u - b.peakU) / (1 - b.peakU), 0, 1); return lerp(1, b.pedWidth, Math.pow(t, 1.2)); };
  const width = u => depth(u) * b.width * widthF(u);
  return { maxD, depth, width, depthF };
}
const headDepth = (g, bp) => (bp || bodyProfile(g)).depth(g.head.lengthFrac * 0.75);
/** Landmarks along normalized axis u (0 snout tip → 1 peduncle end). */
function landmarks(g) {
  fitHead(g);   /* round 6H: L1 eye re-fit (see fishgen.part11) */
  const h = g.head.lengthFrac, f = g.fins, b = g.body, op = h, ped = b.pedU;
  let mcU = h * (0.12 + 0.6 * g.mouth.gape);
  if (g.head.special === 'hammer') mcU = Math.max(mcU, g.head.specialLen * 1.15);
  const eye = h * g.head.eyeU, pre = h * 0.78;
  const pec = op + 0.007 + f.pectoral.u * 0.16 * (ped - op);
  let pel; switch (f.pelvic.position) { case 'thoracic': pel = pec + 0.05; break; case 'jugular': pel = Math.max(mcU + 0.02, op - 0.05); break; default: pel = lerp(op, ped, 0.45); }
  const dMax = f.dorsal.shape === 'continuous' ? 0.998 : ped, d2Max = f.dorsal2.shape === 'continuous' ? 0.998 : ped, aMax = f.anal.shape === 'continuous' ? 0.998 : ped;
  const dMin = g.body.roll !== 0 ? h * .12 : op;
  const dOrigin = lerp(dMin, dMax, f.dorsal.u0), dEnd = lerp(dMin, dMax, f.dorsal.u1);
  const d2Origin = lerp(op, d2Max, f.dorsal2.u0), d2End = lerp(op, d2Max, f.dorsal2.u1);
  const d3Origin = lerp(op, ped, f.dorsal3.u0), d3End = lerp(op, ped, f.dorsal3.u1);
  const analMin = Math.max(op + 0.08, f.pelvic.present ? pel + 0.05 : op + 0.08);
  const aOrigin = lerp(analMin, aMax, f.anal.u0), aEnd = lerp(analMin, aMax, f.anal.u1);
  const vent = Math.max(op + 0.05, aOrigin - 0.02);
  const adipose = lerp(f.dorsal.count >= 2 ? d2End : dEnd, ped, 0.55);
  return { snout: 0, mouthCorner: mcU, eye, preopercle: pre, operculum: op, gillStart: h * g.head.gillStart, gillEnd: op * .97, pectoralBase: pec, pelvicBase: pel, vent, analOrigin: aOrigin, analEnd: aEnd, dorsalOrigin: dOrigin, dorsalEnd: dEnd, dorsal2Origin: d2Origin, dorsal2End: d2End, dorsal3Origin: d3Origin, dorsal3End: d3End, adipose, peduncleStart: ped, caudalBase: 1 };
}
const CAUDAL_AR = { forked: [2, 4.2], lunate: [3.5, 8.5], truncate: [1, 2.2], rounded: [.7, 1.6], emarginate: [1.4, 2.6], heterocercal: [1.3, 3], hypocercal: [1.3, 3], diphycercal: [.4, 1.3], lyrate: [1.6, 4], filamentous: [.3, 2], fantail: [1.1, 2] };
const CAUDAL_FILL = { forked: .55, lunate: .35, truncate: .9, rounded: .8, emarginate: .8, heterocercal: .6, hypocercal: .6, diphycercal: .7, lyrate: .5, filamentous: .4, fantail: .73 };
const FIN_FILL = { sail: .8, falcate: .5, rounded: .75, lobe: .7, continuous: .9, notched: .7, spinySoft: .7, filament: .55, spines: .4 };
const SWIM_TAILS = { thunniform: ['lunate', 'heterocercal'], anguilliform: ['rounded', 'truncate', 'diphycercal', 'filamentous', 'fantail', 'heterocercal'], hippocampiform: ['rounded', 'truncate', 'diphycercal', 'filamentous', 'fantail'], carangiform: ['forked', 'lunate', 'lyrate', 'heterocercal', 'hypocercal'], subcarangiform: ['forked', 'emarginate', 'lyrate', 'truncate', 'fantail', 'heterocercal', 'hypocercal', 'diphycercal', 'filamentous'], ostraciiform: ['emarginate', 'truncate', 'rounded', 'fantail', 'lyrate'], labriform: ['emarginate', 'truncate', 'rounded', 'fantail', 'lyrate'], rajiform: ['filamentous', 'rounded', 'truncate', 'heterocercal'] };
const sizeClass = L => L < .08 ? 'tiny' : L < .3 ? 'small' : L < 1 ? 'medium' : L < 3 ? 'large' : 'giant';
function caudalLenMax(g) { const t = g.fins.caudal.type; return t === 'lunate' || t === 'forked' ? .35 : t === 'filamentous' ? 1.6 : .6; }
/** Approximate morphometrics from genome alone (geometry builder refines caudal AR / areas). */
// @@PART js/app.part07.js (7/19) lines 1027-1261 of the original module script -- stripped by build.mjs
function metrics(g) {
  const bp = bodyProfile(g), lm = landmarks(g), f = g.fins, maxD = bp.maxD;
  let lat = 0; for (let i = 0; i < 50; i++) lat += bp.depth((i + .5) / 50) / 50;
  const finA = {};
  const dA = sp => (sp.e - sp.s) * sp.h * maxD * (FIN_FILL[sp.shape] || .7);
  finA.dorsal = f.dorsal.present && f.dorsal.count > 0 ? dA({ s: lm.dorsalOrigin, e: lm.dorsalEnd, h: f.dorsal.height, shape: f.dorsal.shape }) + (f.dorsal.count >= 2 ? dA({ s: lm.dorsal2Origin, e: lm.dorsal2End, h: f.dorsal2.height, shape: f.dorsal2.shape }) : 0) + (f.dorsal.count === 3 ? dA({ s: lm.dorsal3Origin, e: lm.dorsal3End, h: f.dorsal3.height, shape: f.dorsal3.shape }) : 0) : 0;
  finA.anal = f.anal.present ? dA({ s: lm.analOrigin, e: lm.analEnd, h: f.anal.height, shape: f.anal.shape }) : 0;
  finA.pectoral = f.pectoral.present ? 2 * f.pectoral.len * maxD * f.pectoral.baseLen * bp.depth(lm.pectoralBase) * .6 : 0;
  finA.pelvic = f.pelvic.present ? 2 * f.pelvic.len * maxD * .2 * maxD : 0;
  finA.caudal = f.caudal.present ? f.caudal.len * f.caudal.len * f.caudal.aspect * (CAUDAL_FILL[f.caudal.type] || .6) : 0;
  const fr = {}; for (const k in finA) fr[k] = +(finA[k] / Math.max(1e-6, lat)).toFixed(3);
  return { maxD: +maxD.toFixed(5), fineness: +g.body.fineness.toFixed(2), caudalAR: f.caudal.present ? +(f.caudal.aspect / (CAUDAL_FILL[f.caudal.type] || .6)).toFixed(2) : 0, relGape: +(g.mouth.gape * headDepth(g, bp)).toFixed(3), gapeOfHead: +g.mouth.gape.toFixed(2), finAreaFractions: fr, lateralAreaFrac: +lat.toFixed(3) };
}
FG.bodyProfile = bodyProfile; FG.landmarks = landmarks; FG.metrics = metrics;

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ 6. BIOLOGICAL RULES ENGINE (declarative table + fixed-point run) ║
   ╚══════════════════════════════════════════════════════════════════╝ */
/** @typedef {{rule:string,path:string,from:any,to:any}} Repair */
const RULES = [];
const RULE = (id, desc, fn) => RULES.push({ id, desc, fn });
function clampLog(g, log, rule, path, lo, hi) {
  const v = getP(g, path); if (hi < lo) hi = lo;
  if (!isNum(v)) { setP(g, path, lo); log.push({ rule, path, from: v, to: lo }); return; }
  const nv = clamp(v, lo, hi); if (Math.abs(nv - v) > 1e-9) { setP(g, path, nv); log.push({ rule, path, from: +v.toFixed(4), to: +nv.toFixed(4) }); }
}
function setLog(g, log, rule, path, val) { const v = getP(g, path); if (v !== val) { setP(g, path, val); log.push({ rule, path, from: v, to: val }); } }
RULE('schema_bounds', 'Every trait inside schema bounds / enums; no NaN', (g, lm, log) => {
  for (const p in SCHEMA) { const e = SCHEMA[p], v = getP(g, p);
    if (e.t === 'n' || e.t === 'i') { if (!isNum(v)) { setLog(g, log, 'schema_bounds', p, e.def); continue; } clampLog(g, log, 'schema_bounds', p, e.min, e.max); if (e.t === 'i' && Math.round(getP(g, p)) !== getP(g, p)) setLog(g, log, 'schema_bounds', p, Math.round(getP(g, p))); }
    else if (e.t === 's') { if (!e.opts.includes(v)) setLog(g, log, 'schema_bounds', p, e.def); }
    else if (e.t === 'b') { if (typeof v !== 'boolean') setLog(g, log, 'schema_bounds', p, !!v); }
    else if (e.t === 'hsl') { if (!Array.isArray(v) || v.length !== 3 || !v.every(isNum)) setLog(g, log, 'schema_bounds', p, e.def.slice()); else { const c2 = [((v[0] % 360) + 360) % 360, clamp(v[1], 0, 1), clamp(v[2], 0, 1)]; if (c2.some((x, i) => x !== v[i])) setLog(g, log, 'schema_bounds', p, c2); } } }
});
RULE('gape_head', 'Gape ≤ head height and ≤ 0.95 × body depth at mouth corner', (g, lm, log) => {
  const bp = bodyProfile(g), hd = headDepth(g, bp), h = g.head.lengthFrac;
  let gp = g.mouth.gape, it = 0;
  while (it++ < 120 && gp > 0.05 && gp * hd > 0.95 * bp.depth(h * (0.12 + 0.6 * gp))) gp -= 0.01;
  gp = Math.max(0.05, gp);
  if (gp < g.mouth.gape - 1e-9) { log.push({ rule: 'gape_head', path: 'mouth.gape', from: +g.mouth.gape.toFixed(3), to: +gp.toFixed(3) }); g.mouth.gape = gp; }
  if (g.mouth.type === 'beak' || g.mouth.type === 'tube') clampLog(g, log, 'gape_head', 'mouth.gape', 0.05, 0.25);
});
RULE('dorsal_range', 'Dorsal bases ordered, non-overlapping, inside their segment', (g, lm, log) => {
  const d = g.fins.dorsal; clampLog(g, log, 'dorsal_range', 'fins.dorsal.u0', 0, 0.9); clampLog(g, log, 'dorsal_range', 'fins.dorsal.u1', d.u0 + 0.05, 1);
  if (d.count >= 2) { if (d.u1 > .87) clampLog(g, log, 'dorsal_range', 'fins.dorsal.u1', d.u0 + .05, .87); clampLog(g, log, 'dorsal_range', 'fins.dorsal2.u0', d.u1 + .02, .93); clampLog(g, log, 'dorsal_range', 'fins.dorsal2.u1', g.fins.dorsal2.u0 + .03, d.count === 3 ? .88 : 1); }
  if (d.count === 3) { clampLog(g, log, 'dorsal_range', 'fins.dorsal2.u1', g.fins.dorsal2.u0 + .03, .86); clampLog(g, log, 'dorsal_range', 'fins.dorsal3.u0', g.fins.dorsal2.u1 + .02, .95); clampLog(g, log, 'dorsal_range', 'fins.dorsal3.u1', g.fins.dorsal3.u0 + .025, 1); }
  if (d.count === 0 && d.present) setLog(g, log, 'dorsal_range', 'fins.dorsal.present', false);
});
RULE('anal_range', 'Anal base ordered and inside [vent, peduncle]', (g, lm, log) => { clampLog(g, log, 'anal_range', 'fins.anal.u0', 0, 0.9); clampLog(g, log, 'anal_range', 'fins.anal.u1', g.fins.anal.u0 + 0.05, 1); });
