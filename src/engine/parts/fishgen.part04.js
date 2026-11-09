K('voidfish', 'fantasy', 'Voidfishes (Kenoichthys)', { 'body.length': r(.4, 3), 'body.fineness': r(8, 12), 'body.width': r(.6, .75), 'head.lengthFrac': .3, 'head.eyeSize': r(.3, .4), 'mouth.gape': .95, 'mouth.teeth': 'needle', 'mouth.teethCount': 40, 'head.barbels': 4, 'head.barbelLen': 1.2, 'fins.dorsal.shape': 'continuous', 'fins.dorsal.u0': .3, 'fins.dorsal.u1': 1, 'fins.dorsal.height': .3, 'fins.dorsal.spines': 0, 'fins.anal.shape': 'continuous', 'fins.anal.u0': .4, 'fins.anal.u1': 1, 'fins.anal.spines': 0, 'fins.pelvic.present': false, 'fins.caudal.type': 'filamentous', 'fins.caudal.len': .4, 'fins.caudal.aspect': .6, 'skin.scale': 'bare', 'skin.photophores': ri(50, 80), 'skin.glow': [[260, 290], 1, .7], 'skin.base': hsl([[250, 280]], [.3, .5], [.02, .05]), 'skin.belly': hsl(260, .3, .04), 'skin.eye': [280, 1, .7], 'skin.pattern': 'none', 'skin.countershade': 0, 'swim.mode': 'anguilliform', 'swim.freq': .6 }, ['fantasy', 'deep', 'eelLike']);
FG.CLADES = CLADES;
/** Ancestor chain root→leaf. */
function cladePath(id) { const out = []; let n = CLADES[id]; while (n) { out.unshift(n); n = n.p ? CLADES[n.p] : null; } return out; }
function cladeTags(id) { const s = new Set(); for (const n of cladePath(id)) n.tags.forEach(t => s.add(t)); return s; }
function cladeReq(id) { const p = cladePath(id); for (let i = p.length - 1; i >= 0; i--) if (p[i].req) return p[i].req; return ['marine', 'fresh']; }
function cladeDistance(a, b) { const pa = cladePath(a).map(n => n.id), pb = cladePath(b).map(n => n.id); let i = 0; while (i < pa.length && i < pb.length && pa[i] === pb[i]) i++; return (pa.length - i) + (pb.length - i); }
FG.cladePath = cladePath; FG.cladeDistance = cladeDistance;
/* extra real clade used by species cards */
K('knifefish', 'teleost', 'Knifefishes (electric eel)', { 'body.length': r(.3, 2.2), 'body.fineness': r(8, 12), 'body.width': r(.6, .8), 'body.pedDepth': .06, 'body.backPow': .9, 'body.peakU': .22, 'head.lengthFrac': .14, 'head.eyeSize': .1, 'head.snoutTaper': .2, 'mouth.gape': .35, 'fins.dorsal.present': false, 'fins.dorsal.count': 0, 'fins.anal.u0': .02, 'fins.anal.u1': 1, 'fins.anal.shape': 'continuous', 'fins.anal.height': .22, 'fins.anal.spines': 0, 'fins.anal.rays': 90, 'fins.anal.flex': 1, 'fins.pelvic.present': false, 'fins.caudal.present': false, 'fins.pectoral.shape': 'rounded', 'fins.pectoral.len': .3, 'swim.mode': 'anguilliform', 'swim.amp': .02, 'swim.freq': 1, 'skin.scale': 'bare', 'skin.electric': true, 'skin.pattern': 'none', 'skin.base': hsl([[40, 90]], [.15, .3], [.2, .32]), 'skin.belly': hsl([30, 45], .5, [.5, .6]) }, ['eelLike', 'nocturnal'], ['fresh']);

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ 3. FUNCTION→FORM RULES, NICHES, HABITATS                        ║
   ╚══════════════════════════════════════════════════════════════════╝ */
/** Declarative narrowing applied to trait maps before sampling. */
const FORM_RULES = {
  fastSwimmer: { 'body.fineness': { min: 4.2 }, 'fins.caudal.type': { oneOf: ['lunate', 'forked'] }, 'body.pedDepth': { max: .14 }, 'body.keel': { set: 1 }, 'fins.dorsal.height': { max: .7 }, 'swim.freq': { min: 1.5 }, 'fins.caudal.aspect': { min: 3 }, 'fins.pectoral.shape': { oneOf: ['pointed', 'wing'] } },
  predator: { 'mouth.gape': { min: .45 }, 'head.eyeForward': { min: .4 }, 'mouth.teeth': { oneOf: ['villiform', 'needle', 'triangular', 'fang'] }, 'mouth.teethCount': { min: 12 } },
  large: { 'body.length': { min: 1.2 } },
  ambusher: { 'skin.pattern': { oneOf: ['mottle', 'bars', 'spots', 'saddles', 'disruptive', 'none'] }, 'swim.freq': { max: 1.4 }, 'swim.ampHead': { max: .1 } },
  maneuverer: { 'body.fineness': { max: 3.4 }, 'body.width': { max: .6 }, 'fins.caudal.type': { oneOf: ['rounded', 'truncate', 'emarginate', 'lyrate', 'lunate'] }, 'fins.pectoral.len': { min: .5 }, 'swim.mode': { oneOf: ['labriform', 'carangiform', 'ostraciiform', 'subcarangiform'] } },
  bottomDweller: { 'mouth.type': { oneOf: ['inferior', 'subterminal', 'suction', 'terminal', 'protrusible'] }, 'fins.pectoral.len': { min: .45 }, 'body.ventralFlat': { min: .4 }, 'head.eyeV': { min: .45 }, 'skin.countershade': { min: .6 } },
  flatBenthic: { 'skin.pattern': { oneOf: ['mottle', 'spots', 'eyespot', 'disruptive'] }, 'head.eyeV': { min: .7 }, 'swim.freq': { max: 1.2 } },
  surfaceFeeder: { 'mouth.type': { oneOf: ['superior'] }, 'body.dorsalFlat': { min: .4 }, 'head.eyeV': { min: .3 } },
  filterFeeder: { 'mouth.gape': { min: .75 }, 'mouth.type': { oneOf: ['terminal'] }, 'mouth.teeth': { oneOf: ['none', 'rasp'] }, 'swim.freq': { max: .8 } },
  deepSea: { 'mouth.gape': { min: .55 }, 'skin.countershade': { max: .3 }, 'skin.iridescence': { max: .4 }, 'skin.gloss': { min: .6 } },
  eelLike: { 'body.fineness': { min: 8 }, 'fins.pelvic.present': { set: false }, 'fins.dorsal.shape': { set: 'continuous' }, 'fins.dorsal.u1': { set: 1 }, 'fins.anal.u1': { set: 1 }, 'fins.caudal.type': { oneOf: ['diphycercal', 'rounded', 'filamentous'] }, 'swim.mode': { set: 'anguilliform' } },
  schooler: { 'skin.iridescence': { min: .6 }, 'skin.pattern': { oneOf: ['none', 'stripes', 'spots'] }, 'body.length': { max: .5 }, 'skin.countershade': { min: .7 } },
  grazer: { 'mouth.gape': { max: .25 }, 'mouth.teeth': { oneOf: ['villiform', 'beak', 'molar', 'rasp'] } },
  armored: { 'skin.scale': { oneOf: ['plates', 'scutes', 'ganoid', 'bare'] }, 'swim.freq': { max: 2.2 } },
  lurer: { 'head.special': { set: 'esca' }, 'mouth.gape': { min: .7 }, 'head.eyeForward': { min: .3 } },
  suction: { 'mouth.type': { set: 'tube' }, 'mouth.teeth': { set: 'none' }, 'mouth.teethCount': { set: 0 } },
  glider: { 'fins.pectoral.shape': { set: 'wing' }, 'fins.pectoral.len': { min: 1.8 }, 'fins.pectoral.insertAngle': { max: 20 } },
  cleaner: { 'body.length': { max: .15 }, 'body.fineness': { min: 3.8 }, 'skin.pattern': { set: 'stripes' }, 'skin.patternStrength': { min: .8 }, 'head.snoutTaper': { min: .7 }, 'skin.patternScale': { set: .5 } },
  verticalMigrator: { 'head.eyeSize': { min: .26 }, 'skin.photophores': { min: 10 }, 'body.length': { max: .35 } },
  camouflage: { 'skin.pattern': { oneOf: ['mottle', 'disruptive', 'spots', 'saddles', 'bars'] }, 'skin.iridescence': { max: .25 }, 'skin.patternStrength': { min: .7 } },
  noCountershade: { 'skin.countershade': { max: .2 } },
  crevice: { 'body.fineness': { min: 4.5 }, 'fins.pectoral.len': { max: .6 } },
  sifter: { 'head.barbels': { min: 2 }, 'mouth.type': { oneOf: ['inferior', 'subterminal', 'suction', 'protrusible'] } },
  currentHolder: { 'body.fineness': { min: 4.2 }, 'fins.pectoral.len': { min: .5 }, 'body.width': { min: .5 }, 'swim.freq': { min: 1.5 } },
  nocturnal: { 'head.eyeSize': { min: .2 }, 'skin.pattern': { oneOf: ['none', 'mottle', 'stripes', 'bars', 'spots'] } },
  parasite: { 'mouth.type': { set: 'suction' } },
  hitchhiker: { 'body.dorsalFlat': { set: 1 } },
  amphibious: { 'head.eyeV': { min: .85 }, 'fins.pectoral.shape': { set: 'limb' } },
  cave: { 'head.eyeSide': { set: 'none' }, 'skin.pattern': { set: 'none' }, 'skin.countershade': { max: .1 }, 'skin.iridescence': { max: .2 } },
  planktivore: { 'mouth.gape': { max: .4 }, 'head.eyeSize': { min: .22 } },
  scavenger: { 'head.eyeSize': { max: .2 } },
  hover: { 'swim.freq': { min: 2.5 } }
};
/** @typedef {{id:string,n:string,clades:Object<string,number>,ff:string[],t:Object,formation:string,sat:number,tags:string[],fantasy?:boolean}} Niche */
const NICHES = {};
const NI = (id, n, clades, ff, t = {}, extra = {}) => { NICHES[id] = Object.assign({ id, n, clades, ff, t, formation: 'loose', sat: 1, tags: [] }, extra); };
NI('ambush', 'Ambush predator', { grouper: 3, esociform: 3, scorpaenid: 3, frogfish: 2, gar: 2, moray: 2, lionfish: 2, stonefish: 2, flatfish: 1, bowfin: 1, angelShark: 2, barracuda: 1, anglerfish: 1, sawfish: 1, dragonfish: 1 }, ['predator', 'ambusher'], { 'head.eyeForward': r(.4, .7) });
NI('pelagicHunter', 'Fast pelagic hunter', { scombrid: 4, jack: 3, billfish: 2, sailfish: 1, swordfish: 1, mackerelShark: 2, barracuda: 2, mackerel: 2, requiemShark: 1, salmonid: 1 }, ['fastSwimmer', 'predator'], {}, { formation: 'polarized' });
NI('apex', 'Apex predator', { mackerelShark: 3, requiemShark: 3, billfish: 2, hammerhead: 2, grouper: 1, barracuda: 1, swordfish: 1, esociform: 1, arowana: 1, scombrid: 1, deepSeaShark: 1 }, ['predator', 'large']);
NI('schooler', 'Schooler', { clupeiform: 4, mackerel: 2, jack: 1, characin: 2, minnow: 3, damselfish: 1, myctophid: 1, salmonid: 1, cypriniform: 1 }, ['schooler'], {}, { formation: 'polarized' });
NI('filterFeeder', 'Filter feeder', { whaleShark: 3, manta: 3, paddlefish: 2, clupeiform: 2 }, ['filterFeeder'], {}, { formation: 'loose' });
NI('grazer', 'Grazer', { parrotfish: 3, tang: 3, damselfish: 1, cichlid: 2, cypriniform: 1, blenny: 1 }, ['grazer', 'maneuverer'], {}, { sat: 1.2 });
NI('reefManeuverer', 'Reef maneuverer', { chaetodontid: 3, angelfish: 3, wrasse: 3, damselfish: 2, clownfish: 2, triggerfish: 2, cichlid: 2, tang: 1, boxfish: 1, pufferfish: 1 }, ['maneuverer'], {}, { sat: 1.25 });
NI('creviceHider', 'Crevice hider', { moray: 4, blenny: 2, goby: 2, conger: 1, wrasse: 1, scorpaenid: 1 }, ['crevice'], {});
NI('bottomSifter', 'Bottom sifter', { sturgeon: 3, siluriform: 3, carp: 2, bonefish: 2, cod: 1, grenadier: 1, cypriniform: 1, goby: 1 }, ['bottomDweller', 'sifter'], {}, { formation: 'benthic' });
NI('flatBenthic', 'Flat benthic ambusher', { flatfish: 4, stingray: 3, skate: 2, angelShark: 2, stonefish: 1, frogfish: 1 }, ['flatBenthic', 'camouflage', 'bottomDweller'], {}, { formation: 'benthic' });
NI('currentHolder', 'Current holder', { salmonid: 3, minnow: 2, siluriform: 1, goby: 2, cichlid: 1, bichir: 1 }, ['currentHolder'], {}, { formation: 'polarized' });
NI('surfaceFeeder', 'Surface feeder', { arowana: 3, flyingfish: 2, betta: 1, minnow: 2, tarpon: 2, characin: 1 }, ['surfaceFeeder'], {});
NI('cleaner', 'Cleaner', { wrasse: 4, goby: 2 }, ['cleaner'], {}, { sat: 1.2 });
NI('scavenger', 'Scavenger', { hagfish: 3, siluriform: 2, grenadier: 2, remora: 1, eel: 1, cod: 1, triggerfish: 1 }, ['scavenger'], {}, { formation: 'benthic' });
NI('lurer', 'Lurer (esca)', { anglerfish: 4, frogfish: 3, viperfish: 1, gulper: 1 }, ['lurer', 'predator'], {});
NI('verticalMigrator', 'Vertical migrator', { myctophid: 4, dragonfish: 1, viperfish: 1, deepSeaShark: 1 }, ['verticalMigrator'], {}, { formation: 'column' });
NI('mimic', 'Mimic / camouflage', { frogfish: 2, scorpaenid: 2, pipefish: 2, seahorse: 2, flatfish: 1, stonefish: 2 }, ['camouflage'], {}, { formation: 'hover' });
NI('armoredBrowser', 'Armored browser', { boxfish: 3, sturgeon: 1, bichir: 1, siluriform: 2, pufferfish: 2, triggerfish: 1, gar: 1, coelacanth: 1 }, ['armored'], {});
NI('planktivore', 'Planktivore', { damselfish: 3, clupeiform: 2, characin: 2, minnow: 2, myctophid: 1, percoid: 2, sunfish: 1 }, ['planktivore'], {}, { formation: 'polarized' });
NI('pursuitPredator', 'Pursuit predator', { bass: 3, salmonid: 2, jack: 2, barracuda: 2, esociform: 1, tarpon: 1, requiemShark: 1, cichlid: 1, cod: 1, piranha: 1 }, ['predator'], {});
NI('nocturnalHunter', 'Nocturnal hunter', { moray: 2, conger: 2, siluriform: 3, scorpaenid: 1, percoid: 2, lionfish: 2, bowfin: 1, coelacanth: 1, carpetShark: 2, knifefish: 1 }, ['nocturnal', 'predator'], {});
NI('parasite', 'Parasite', { lamprey: 5, siluriform: 1 }, ['parasite'], {});
NI('hitchhiker', 'Hitchhiker', { remora: 5 }, ['hitchhiker'], {});
NI('glider', 'Glider', { flyingfish: 5, characin: 1, skyswimmer: 3 }, ['glider'], {}, { formation: 'polarized' });
NI('airBreather', 'Air breather', { lungfish: 3, betta: 3, gourami: 3, bichir: 2, arowana: 1, bowfin: 1, mudskipper: 2, knifefish: 2 }, [], {});
NI('amphibious', 'Amphibious', { mudskipper: 5, blenny: 1, lungfish: 1 }, ['amphibious', 'bottomDweller'], {}, { formation: 'benthic' });
NI('suctionFeeder', 'Suction feeder (syngnathid)', { seahorse: 4, pipefish: 3 }, ['suction', 'hover'], {}, { formation: 'hover' });
NI('deepBenthic', 'Deep benthic', { grenadier: 3, chimaera: 3, deepSeaShark: 2, cod: 1, hagfish: 2, anglerfish: 1 }, ['deepSea', 'bottomDweller'], {}, { formation: 'benthic' });
NI('caveDweller', 'Cave dweller', { blindCavefish: 4, siluriform: 1, goby: 1 }, ['cave'], {}, { sat: .3 });
NI('lavaSwimmer', 'Lava swimmer', { emberfish: 5 }, ['armored', 'noCountershade'], {}, { fantasy: true });
NI('skyDrifter', 'Sky drifter', { skyswimmer: 5 }, ['glider'], {}, { fantasy: true, formation: 'polarized' });
NI('crystalGrazer', 'Crystal grazer', { crystalfish: 5 }, ['armored', 'grazer'], {}, { fantasy: true, formation: 'hover' });
NI('voidLurker', 'Void lurker', { voidfish: 5, anglerfish: 1 }, ['deepSea', 'predator'], {}, { fantasy: true });
FG.NICHES = NICHES;

/** @typedef {{id:string,n:string,tags:string[],niches:Object<string,number>,pal:{h:number[][],s:number[],l:number[]},light:number,water:number[],fog:number,props:string[],floor:boolean,fantasy:boolean}} Habitat */
const HABITATS = {};
const H = (id, n, tags, niches, pal, light, water, fog, props, extra = {}) => { HABITATS[id] = Object.assign({ id, n, tags, niches, pal, light, water, fog, props, floor: true, fantasy: false }, extra); };
H('coralReef', 'Coral reef', ['marine', 'reef', 'shallow'], { reefManeuverer: 4, grazer: 3, ambush: 3, creviceHider: 3, cleaner: 1, planktivore: 2, nocturnalHunter: 1, mimic: 1, armoredBrowser: 1, suctionFeeder: 1, pursuitPredator: 1 }, { h: [[0, 60], [160, 220], [270, 340]], s: [.5, .9], l: [.4, .6] }, 1, [.05, .35, .55], .06, ['coral', 'rock', 'fan']);
H('openOcean', 'Open ocean (epipelagic)', ['marine', 'pelagic'], { pelagicHunter: 4, schooler: 4, apex: 3, filterFeeder: 1, hitchhiker: 1, glider: 1, planktivore: 1 }, { h: [[195, 230]], s: [.2, .5], l: [.3, .5] }, .9, [.02, .2, .45], .045, [], { floor: false });
H('mesopelagic', 'Mesopelagic (twilight)', ['marine', 'deep', 'pelagic'], { verticalMigrator: 4, lurer: 2, ambush: 1, apex: .5 }, { h: [[200, 240], [0, 20]], s: [.1, .4], l: [.1, .3] }, .12, [.005, .03, .08], .09, [], { floor: false });
H('abyssal', 'Abyssal plain', ['marine', 'deep', 'benthic'], { lurer: 3, deepBenthic: 4, scavenger: 2, verticalMigrator: 1 }, { h: [[0, 20], [220, 260], [330, 350]], s: [.1, .4], l: [.05, .25] }, .02, [0, .005, .015], .12, ['rock', 'vent']);
H('hadal', 'Hadal trench', ['marine', 'deep', 'benthic'], { deepBenthic: 4, scavenger: 3 }, { h: [[330, 380]], s: [.1, .3], l: [.6, .8] }, .01, [0, .003, .01], .14, ['rock']);
H('kelpForest', 'Kelp forest', ['marine', 'shallow'], { ambush: 2, reefManeuverer: 2, pursuitPredator: 2, grazer: 1, flatBenthic: 1, schooler: 1, mimic: 1, creviceHider: 1 }, { h: [[30, 60], [70, 110], [180, 210]], s: [.2, .5], l: [.3, .5] }, .6, [.03, .18, .2], .08, ['kelp', 'rock']);
H('rockyShore', 'Rocky shore / tide pool', ['marine', 'shallow'], { creviceHider: 3, grazer: 1, ambush: 1, mimic: 1, amphibious: 1, flatBenthic: 1 }, { h: [[20, 50], [80, 120], [190, 220]], s: [.3, .6], l: [.3, .5] }, .9, [.1, .3, .35], .05, ['rock', 'weed']);
H('sandFlat', 'Sand / mud flat', ['marine', 'shallow', 'benthic'], { flatBenthic: 4, bottomSifter: 3, ambush: 1, mimic: 1 }, { h: [[30, 50]], s: [.15, .35], l: [.4, .6] }, .85, [.1, .35, .45], .05, ['rock']);
H('seagrass', 'Seagrass meadow', ['marine', 'shallow', 'brackish'], { suctionFeeder: 3, mimic: 2, planktivore: 1, reefManeuverer: 1, bottomSifter: 1 }, { h: [[60, 110], [30, 50]], s: [.3, .6], l: [.35, .5] }, .8, [.06, .3, .3], .07, ['grass']);
H('mangrove', 'Mangrove', ['marine', 'brackish', 'shallow'], { surfaceFeeder: 2, pursuitPredator: 2, bottomSifter: 1, amphibious: 2, schooler: 1, ambush: 1 }, { h: [[30, 60], [80, 110]], s: [.2, .4], l: [.3, .45] }, .6, [.2, .25, .15], .11, ['root']);
H('brackish', 'Estuary / brackish', ['marine', 'fresh', 'brackish'], { bottomSifter: 2, pursuitPredator: 2, flatBenthic: 2, schooler: 1, surfaceFeeder: 1, airBreather: 1 }, { h: [[40, 90], [190, 215]], s: [.15, .35], l: [.3, .5] }, .5, [.18, .25, .2], .12, ['root', 'rock']);
H('polar', 'Polar sea', ['marine', 'cold'], { pursuitPredator: 2, deepBenthic: 1, schooler: 2, flatBenthic: 1, bottomSifter: 1, apex: 1 }, { h: [[190, 220], [30, 50]], s: [.1, .3], l: [.35, .55] }, .5, [.05, .2, .35], .05, ['ice', 'rock']);
H('fastRiver', 'Fast river', ['fresh'], { currentHolder: 4, pursuitPredator: 2, bottomSifter: 1 }, { h: [[60, 110], [30, 50]], s: [.2, .45], l: [.3, .5] }, .8, [.15, .3, .3], .07, ['boulder']);
H('slowRiver', 'Slow river', ['fresh'], { bottomSifter: 3, ambush: 2, pursuitPredator: 2, schooler: 1, surfaceFeeder: 1, armoredBrowser: 1, nocturnalHunter: 1 }, { h: [[40, 90]], s: [.2, .4], l: [.25, .45] }, .5, [.2, .25, .12], .12, ['wood', 'rock']);
H('mountainStream', 'Mountain stream', ['fresh', 'cold'], { currentHolder: 5, pursuitPredator: 1 }, { h: [[60, 110], [190, 210]], s: [.2, .4], l: [.3, .5] }, .95, [.2, .35, .35], .04, ['boulder']);
H('lake', 'Lake', ['fresh'], { pursuitPredator: 3, schooler: 2, bottomSifter: 2, ambush: 2, surfaceFeeder: 1 }, { h: [[60, 110], [190, 220]], s: [.2, .4], l: [.3, .5] }, .6, [.1, .25, .25], .07, ['grass', 'rock']);
H('floodplain', 'Amazon floodplain', ['fresh'], { airBreather: 2, surfaceFeeder: 2, schooler: 2, pursuitPredator: 2, bottomSifter: 2, armoredBrowser: 2, ambush: 1, nocturnalHunter: 1 }, { h: [[20, 60], [90, 120], [0, 20]], s: [.3, .6], l: [.3, .5] }, .5, [.25, .22, .1], .13, ['root', 'wood']);
H('blackwater', 'Blackwater swamp', ['fresh'], { airBreather: 3, ambush: 1, schooler: 2, surfaceFeeder: 1, bottomSifter: 1 }, { h: [[0, 30], [190, 230], [280, 320]], s: [.5, .9], l: [.3, .5] }, .3, [.12, .06, .02], .16, ['root', 'leaf']);
H('cave', 'Cave', ['fresh', 'cave'], { caveDweller: 5, scavenger: 1 }, { h: [[330, 380]], s: [.05, .2], l: [.6, .85] }, .05, [.01, .02, .03], .08, ['stalagmite', 'rock']);
H('deepReef', 'Mesophotic deep reef', ['marine', 'reef', 'deep'], { reefManeuverer: 2, ambush: 2, lurer: 1, deepBenthic: 1, nocturnalHunter: 2 }, { h: [[0, 40], [280, 340]], s: [.4, .7], l: [.3, .5] }, .25, [.01, .08, .18], .09, ['sponge', 'rock']);
H('lavaLake', 'Lava lake (fantasy)', ['fantasy', 'fresh', 'marine', 'deep'], { lavaSwimmer: 5, armoredBrowser: 1, ambush: 1 }, { h: [[0, 40]], s: [.5, 1], l: [.1, .3] }, .4, [.3, .05, 0], .1, ['lava', 'rock'], { fantasy: true });
H('skySea', 'Sky sea (fantasy)', ['fantasy', 'marine', 'fresh', 'pelagic'], { skyDrifter: 5, glider: 2, schooler: 1 }, { h: [[180, 220], [280, 330]], s: [.2, .5], l: [.7, .9] }, 1, [.6, .8, .95], .02, ['cloud'], { fantasy: true, floor: false });
H('crystalCavern', 'Crystal cavern (fantasy)', ['fantasy', 'fresh', 'marine', 'cave', 'deep'], { crystalGrazer: 5, caveDweller: 1, mimic: 1 }, { h: [[260, 330], [170, 200]], s: [.4, .7], l: [.5, .8] }, .35, [.05, .02, .1], .07, ['crystal', 'rock'], { fantasy: true });
H('void', 'The Void (fantasy)', ['fantasy', 'marine', 'deep', 'pelagic'], { voidLurker: 5, lurer: 1, verticalMigrator: 1 }, { h: [[240, 290]], s: [.3, .6], l: [.02, .08] }, 0, [0, 0, .01], .05, ['star'], { fantasy: true, floor: false });
FG.HABITATS = HABITATS;

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ 4. SPECIES CARDS (approximate ranges; real taxa)                 ║
   ╚══════════════════════════════════════════════════════════════════╝ */
/** @typedef {{id:string,n:string,sci:string,clade:string,niche:string,habitat:string,t:Object}} SpeciesCard */
const SPECIES = [];
const SP = (n, sci, clade, niche, habitat, t = {}) => SPECIES.push({ id: n.toLowerCase().replace(/[^a-z0-9]+/g, '-'), n, sci, clade, niche, habitat, t, approx: true });
SP('Atlantic bluefin tuna', 'Thunnus thynnus', 'scombrid', 'pelagicHunter', 'openOcean', { 'body.length': r(1.5, 3), 'body.fineness': r(4.2, 4.8), 'skin.base': hsl([215, 225], [.45, .6], [.22, .3]), 'skin.fin': [50, .8, .5] });
SP('Yellowfin tuna', 'Thunnus albacares', 'scombrid', 'pelagicHunter', 'openOcean', { 'body.length': r(1, 2), 'fins.dorsal2.height': r(.8, 1.1), 'fins.anal.height': r(.8, 1.1), 'skin.fin': [50, .95, .5], 'skin.base': hsl([210, 220], [.5, .65], [.25, .32]) });
SP('Skipjack tuna', 'Katsuwonus pelamis', 'scombrid', 'schooler', 'openOcean', { 'body.length': r(.4, .8), 'body.fineness': r(4, 4.5), 'skin.pattern': 'stripes', 'skin.patternScale': 1.4, 'skin.accent': hsl(220, .4, .2), 'skin.base': hsl([215, 230], [.4, .55], [.25, .32]) });
SP('Atlantic mackerel', 'Scomber scombrus', 'mackerel', 'schooler', 'openOcean', { 'body.length': r(.3, .45) });
SP('Blue marlin', 'Makaira nigricans', 'billfish', 'apex', 'openOcean', { 'body.length': r(2.5, 4.5), 'fins.dorsal.height': r(.6, .75) });
SP('Sailfish', 'Istiophorus platypterus', 'sailfish', 'pelagicHunter', 'openOcean', {});
SP('Swordfish', 'Xiphias gladius', 'swordfish', 'apex', 'openOcean', {});
SP('Great white shark', 'Carcharodon carcharias', 'mackerelShark', 'apex', 'openOcean', { 'body.length': r(3.5, 5.5), 'skin.base': hsl([205, 215], [.08, .16], [.3, .4]), 'skin.belly': hsl(205, .03, .92) });
SP('Shortfin mako', 'Isurus oxyrinchus', 'mackerelShark', 'pelagicHunter', 'openOcean', { 'body.length': r(2, 3.5), 'skin.base': hsl([215, 230], [.4, .6], [.25, .35]) });
SP('Blue shark', 'Prionace glauca', 'requiemShark', 'pelagicHunter', 'openOcean', { 'body.length': r(2, 3.3), 'body.fineness': r(6.8, 7.6), 'fins.pectoral.len': r(1.2, 1.5), 'skin.base': hsl([212, 222], [.45, .6], [.35, .45]) });
SP('Tiger shark', 'Galeocerdo cuvier', 'requiemShark', 'apex', 'coralReef', { 'body.length': r(3, 4.5), 'skin.pattern': 'bars', 'skin.patternStrength': .3, 'head.snoutTaper': .3, 'skin.base': hsl([200, 215], [.08, .15], [.32, .42]) });
SP('Scalloped hammerhead', 'Sphyrna lewini', 'hammerhead', 'apex', 'openOcean', { 'body.length': r(2, 3.5) });
SP('Whale shark', 'Rhincodon typus', 'whaleShark', 'filterFeeder', 'openOcean', {});
SP('Nurse shark', 'Ginglymostoma cirratum', 'carpetShark', 'nocturnalHunter', 'coralReef', { 'body.length': r(2, 3) });
SP('Greenland shark', 'Somniosus microcephalus', 'deepSeaShark', 'apex', 'polar', { 'body.length': r(3, 5), 'head.eyeSize': .07, 'skin.photophores': 0, 'skin.base': hsl([30, 50], [.08, .15], [.2, .3]), 'skin.eye': [40, .3, .5] });
SP('Reef manta ray', 'Mobula alfredi', 'manta', 'filterFeeder', 'coralReef', {});
SP('Southern stingray', 'Hypanus americanus', 'stingray', 'flatBenthic', 'sandFlat', { 'body.length': r(.8, 1.4), 'skin.pattern': 'none' });
SP('Thornback skate', 'Raja clavata', 'skate', 'flatBenthic', 'sandFlat', { 'skin.pattern': 'spots' });
SP('Pacific angelshark', 'Squatina californica', 'angelShark', 'flatBenthic', 'kelpForest', {});
SP('Smalltooth sawfish', 'Pristis pectinata', 'sawfish', 'ambush', 'mangrove', {});
SP('Spotted ratfish', 'Hydrolagus colliei', 'chimaera', 'deepBenthic', 'deepReef', { 'skin.pattern': 'spots', 'skin.accent': hsl(40, .1, .9) });
SP('Beluga sturgeon', 'Huso huso', 'sturgeon', 'bottomSifter', 'brackish', { 'body.length': r(2, 4.5) });
SP('American paddlefish', 'Polyodon spathula', 'paddlefish', 'filterFeeder', 'slowRiver', {});
SP('Alligator gar', 'Atractosteus spatula', 'gar', 'ambush', 'slowRiver', { 'body.length': r(1.2, 2.5), 'head.snoutTaper': .8, 'body.snoutDepth': .16 });
SP('Bowfin', 'Amia calva', 'bowfin', 'ambush', 'blackwater', {});
SP('Atlantic tarpon', 'Megalops atlanticus', 'tarpon', 'surfaceFeeder', 'mangrove', {});
SP('Bonefish', 'Albula vulpes', 'bonefish', 'bottomSifter', 'sandFlat', { 'head.barbels': 0 });
SP('Giant moray', 'Gymnothorax javanicus', 'moray', 'creviceHider', 'coralReef', { 'body.length': r(1.5, 2.5), 'skin.pattern': 'spots', 'skin.base': hsl([35, 45], [.35, .5], [.3, .4]), 'skin.accent': hsl(30, .4, .12) });
SP('Green moray', 'Gymnothorax funebris', 'moray', 'creviceHider', 'coralReef', { 'body.length': r(1.2, 2), 'skin.pattern': 'none', 'skin.base': hsl([85, 100], [.35, .5], [.28, .36]) });
SP('European eel', 'Anguilla anguilla', 'freshwaterEel', 'nocturnalHunter', 'slowRiver', {});
SP('Pelican eel', 'Eurypharynx pelecanoides', 'gulper', 'lurer', 'abyssal', {});
SP('Atlantic herring', 'Clupea harengus', 'clupeiform', 'schooler', 'polar', { 'body.length': r(.2, .35) });
SP('Pacific sardine', 'Sardinops sagax', 'clupeiform', 'schooler', 'openOcean', { 'body.length': r(.15, .28), 'skin.pattern': 'spots', 'skin.patternScale': 3.6, 'skin.patternStrength': .45, 'skin.accent': hsl(210, .3, .12), 'skin.base': hsl([200, 212], [.3, .45], [.28, .36]) });
SP('Rainbow trout', 'Oncorhynchus mykiss', 'salmonid', 'currentHolder', 'fastRiver', { 'body.length': r(.3, .6), 'skin.base': hsl([82, 98], [.28, .38], [.36, .44]), 'skin.belly': hsl([45, 55], .08, [.86, .92]), 'skin.accent': [0, 0, .07], 'skin.pattern': 'spots', 'skin.patternScale': r(3.2, 4), 'skin.patternStrength': .8, 'skin.band': r(.5, .75), 'skin.bandColor': hsl([340, 352], [.5, .65], [.55, .62]), 'skin.fin': [60, .3, .42], 'skin.iridescence': .55, 'fins.caudal.type': 'emarginate', 'fins.caudal.span': r(1, 1.15) });
SP('Pacific herring', 'Clupea pallasii', 'clupeiform', 'schooler', 'polar', { 'body.length': r(.18, .3), 'skin.pattern': 'none' });
SP('Atlantic salmon', 'Salmo salar', 'salmonid', 'pursuitPredator', 'lake', { 'body.length': r(.6, 1.1), 'skin.base': hsl([200, 215], [.15, .25], [.45, .55]) });
SP('Common carp', 'Cyprinus carpio', 'carp', 'bottomSifter', 'lake', {});
SP('Zebrafish', 'Danio rerio', 'minnow', 'schooler', 'slowRiver', { 'body.length': r(.03, .05), 'skin.pattern': 'stripes', 'skin.patternScale': 1.6, 'skin.patternStrength': 1, 'skin.base': hsl([45, 55], [.3, .4], [.6, .7]), 'skin.accent': hsl(220, .5, .3) });
// @@PART js/app.part05.js (5/19) lines 629-813 of the original module script -- stripped by build.mjs
SP('Neon tetra', 'Paracheirodon innesi', 'characin', 'schooler', 'blackwater', { 'body.length': r(.025, .04), 'skin.pattern': 'stripes', 'skin.patternScale': .55, 'skin.patternStrength': 1, 'skin.base': hsl([195, 205], [.9, 1], [.5, .6]), 'skin.accent': hsl(0, .9, .45), 'skin.belly': hsl(200, .1, .9), 'skin.iridescence': 1 });
SP('Red-bellied piranha', 'Pygocentrus nattereri', 'piranha', 'pursuitPredator', 'floodplain', {});
SP('Mexican tetra (cave form)', 'Astyanax mexicanus', 'blindCavefish', 'caveDweller', 'cave', {});
SP('Channel catfish', 'Ictalurus punctatus', 'siluriform', 'bottomSifter', 'slowRiver', { 'body.length': r(.4, .9), 'fins.caudal.type': 'forked', 'skin.pattern': 'spots' });
SP('Wels catfish', 'Silurus glanis', 'siluriform', 'ambush', 'lake', { 'body.length': r(1.5, 2.7), 'body.fineness': r(5.5, 6.5), 'fins.dorsal.height': .15, 'fins.adipose.present': false, 'fins.anal.u0': .2, 'fins.anal.u1': .98, 'fins.caudal.type': 'rounded', 'head.barbels': 6, 'skin.pattern': 'mottle' });
SP('Electric eel', 'Electrophorus electricus', 'knifefish', 'nocturnalHunter', 'floodplain', { 'body.length': r(1.2, 2.2) });
SP('Northern pike', 'Esox lucius', 'esociform', 'ambush', 'lake', {});
SP('Great barracuda', 'Sphyraena barracuda', 'barracuda', 'pursuitPredator', 'coralReef', { 'body.length': r(1, 1.6) });
SP('Oscar', 'Astronotus ocellatus', 'cichlid', 'pursuitPredator', 'floodplain', { 'body.length': r(.25, .4), 'skin.pattern': 'eyespot', 'skin.base': hsl([25, 40], [.3, .5], [.22, .3]), 'skin.accent': hsl(15, .9, .5) });
SP('Largemouth bass', 'Micropterus salmoides', 'bass', 'ambush', 'lake', { 'body.length': r(.3, .6), 'mouth.gape': r(.6, .7), 'skin.pattern': 'stripes', 'skin.patternScale': .4 });
SP('Nassau grouper', 'Epinephelus striatus', 'grouper', 'ambush', 'coralReef', { 'body.length': r(.5, 1.1), 'skin.pattern': 'bars', 'skin.base': hsl([25, 40], [.3, .45], [.45, .55]), 'skin.accent': hsl(25, .4, .22) });
SP('Giant trevally', 'Caranx ignobilis', 'jack', 'pelagicHunter', 'coralReef', { 'body.length': r(.7, 1.5), 'head.foreheadSlope': .55, 'skin.base': hsl([200, 215], [.08, .18], [.4, .5]) });
SP('Copperband butterflyfish', 'Chelmon rostratus', 'chaetodontid', 'reefManeuverer', 'coralReef', { 'head.snoutTaper': .95, 'body.snoutDepth': .09, 'skin.pattern': 'bars', 'skin.patternScale': 1.1, 'skin.base': hsl(45, .15, .9), 'skin.accent': hsl(28, .9, .55), 'skin.belly': hsl(45, .1, .95) });
SP('Emperor angelfish', 'Pomacanthus imperator', 'angelfish', 'reefManeuverer', 'coralReef', { 'skin.pattern': 'stripes', 'skin.patternScale': 2.2, 'skin.patternStrength': 1, 'skin.base': hsl([225, 235], [.6, .8], [.3, .4]), 'skin.accent': hsl(50, .95, .55), 'skin.fin': [50, .9, .5] });
