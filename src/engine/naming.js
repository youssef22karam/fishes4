/* Procedural naming: a function of the trait vector + clade (no name lists).
   Common name = [pattern/colour] + [dominant feature] + [family noun];
   binomial = genus (built from body/head morphemes + family stem) + epithet (pattern / colour / form). */
import { makeRng } from './genome.js';

const NOUN_FIX = { clupeiform: 'herring', salmonid: 'trout', characin: 'tetra', scorpaenid: 'scorpionfish', siluriform: 'catfish', esociform: 'pike', scombrid: 'tuna', percoid: 'perch', chaetodontid: 'butterflyfish', freshwaterEel: 'eel', requiemShark: 'shark', mackerelShark: 'mackerel shark', carpetShark: 'carpet shark', hammerhead: 'hammerhead', stomiid: 'dragonfish', myctophid: 'lanternfish', cod: 'cod', stingray: 'stingray', pipefish: 'pipefish', seahorse: 'seahorse', flatfish: 'flounder', moray: 'moray', conger: 'conger', gar: 'gar', sturgeon: 'sturgeon', bass: 'bass', jack: 'jack', cichlid: 'cichlid', grouper: 'grouper', wrasse: 'wrasse', tang: 'tang', angelfish: 'angelfish', damselfish: 'damselfish', minnow: 'minnow', boxfish: 'boxfish', pufferfish: 'pufferfish', frogfish: 'frogfish', anglerfish: 'anglerfish', viperfish: 'viperfish', barracuda: 'barracuda', mackerel: 'mackerel' };
const STEM = { perch: 'perc', reef: 'chaet', shark: 'carch', tuna: 'thunn', pike: 'esoc', eel: 'muraen', flat: 'pleuron', pipe: 'syngnath', cat: 'siluro', box: 'ostrac', angler: 'lophi', deep: 'stom', cod: 'gad', soft: 'cyprin', ray: 'dasyat', ancient: 'acipens', scorp: 'scorpaen' };
const END = { perch: ['a', 'ichthys', 'oides'], reef: ['odon', 'ops', 'ichthys'], shark: ['inus', 'odon', 'arias'], tuna: ['us', 'ynnus', 'omber'], pike: ['ox', 'ocephalus', 'ina'], eel: ['ena', 'ophis', 'ichthys'], flat: ['ichthys', 'ectes', 'opsis'], pipe: ['athus', 'ichthys', 'ocampus'], cat: ['ichthys', 'ops', 'ura'], box: ['ion', 'ops', 'ichthys'], angler: ['ichthys', 'ius', 'ops'], deep: ['ias', 'ichthys', 'ops'], cod: ['us', 'ichthys', 'ops'], soft: ['inus', 'ichthys', 'ella'], ray: ['atis', 'ura', 'oides'], ancient: ['er', 'ichthys', 'ops'], scorp: ['aena', 'ichthys', 'ops'] };
const PAT_ADJ = { stripes: 'Striped', bars: 'Barred', spots: 'Spotted', reticulate: 'Netted', saddles: 'Saddled', mottle: 'Marbled', disruptive: 'Camouflaged', eyespot: 'Eyespot' };
const PAT_EP = { stripes: 'lineatus', bars: 'fasciatus', spots: 'maculatus', reticulate: 'reticulatus', saddles: 'sellatus', mottle: 'marmoratus', disruptive: 'tectus', eyespot: 'ocellatus' };
const PAL_ADJ = { silver: 'Silver', slate: 'Slate', coolgrey: 'Grey', olive: 'Olive', brown: 'Brown', mud: 'Mud', sand: 'Sand', gold: 'Golden', orange: 'Orange', yellow: 'Yellow', blue: 'Blue', green: 'Green', red: 'Red', blackdeep: 'Black', reddeep: 'Scarlet', silverdeep: 'Silver', rose: 'Rosy' };
const PAL_EP = { silver: 'argenteus', slate: 'glaucus', coolgrey: 'griseus', olive: 'viridis', brown: 'fuscus', mud: 'luteus', sand: 'arenarius', gold: 'aureus', orange: 'aurantiacus', yellow: 'flavus', blue: 'caeruleus', green: 'smaragdinus', red: 'ruber', blackdeep: 'niger', reddeep: 'purpureus', silverdeep: 'lucidus', rose: 'roseus' };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const nounOf = t => NOUN_FIX[t.lineage] || t.lineage.replace(/([A-Z])/g, ' $1').toLowerCase().split(' ').pop();

/** Dominant distinguishing feature -> [common-name modifier, genus morpheme, epithet] */
function feature(t) {
  const f = [];
  if (t.dHeight > .55 && t.clade !== 'shark') f.push([t.dHeight, 'Sailfin', 'ptero', 'velifer']);
  if (t.snoutTaper > .85) f.push([t.snoutTaper - .3, 'Longsnout', 'rhyncho', 'longirostris']);
  if (t.eyeSize > .135) f.push([t.eyeSize * 3, 'Bigeye', 'macro', 'macrops']);
  if (t.fineness < 2.4 && t.clade !== 'ray') f.push([1.2, 'Deepbody', 'platy', 'altus']);
  if (t.fineness > 8) f.push([1.1, 'Slender', 'lepto', 'gracilis']);
  if (t.barbels >= 4) f.push([1, 'Whiskered', 'pogo', 'barbatus']);
  if (t.cauAspect > 5) f.push([1, 'Swiftfin', 'tachy', 'celer']);
  if (t.gape > .75) f.push([t.gape, 'Widemouth', 'eury', 'latidens']);
  if (t.headLen > .34) f.push([t.headLen * 2, 'Bighead', 'cephalo', 'capito']);
  if (t.special === 'esca') f.push([1.5, 'Lure', 'photo', 'lucifer']);
  if (t.special === 'hammer') f.push([2, 'Hammer', 'sphyr', 'zygaena']);
  if (t.photophores > 0) f.push([.9, 'Lantern', 'lamp', 'lucernarius']);
  if (t.length > 2) f.push([.8, 'Great', 'mega', 'gigas']);
  if (t.length < .08) f.push([.8, 'Pygmy', 'micro', 'minimus']);
  f.sort((a, b) => b[0] - a[0]);
  return f[0] || [0, 'Common', 'eu', 'vulgaris'];
}

export function nameFishFromTraits(t, seedKey) {
  const rng = makeRng('name:' + seedKey), feat = feature(t), noun = nounOf(t);
  const first = t.pattern !== 'none' && PAT_ADJ[t.pattern] ? PAT_ADJ[t.pattern] : PAL_ADJ[t.palette] || '';
  const mod = feat[1] === 'Common' || feat[1] === 'Great' || feat[1] === 'Pygmy' ? feat[1] : feat[1];
  const common = [first, mod === 'Common' ? '' : mod.toLowerCase(), noun].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  const genus = cap(feat[2] + (rng.chance(.5) ? '' : '') + STEM[t.clade].replace(/^[aeiou]/, m => m) + END[t.clade][Math.floor(rng.next() * END[t.clade].length)]);
  const ep = t.pattern !== 'none' && PAT_EP[t.pattern] && rng.chance(.7) ? PAT_EP[t.pattern] : rng.chance(.55) ? PAL_EP[t.palette] : feat[3];
  const epithet = ep === 'vulgaris' && t.pattern === 'none' ? PAL_EP[t.palette] : ep;
  return { common: cap(common), genus, epithet, sci: `${genus} ${epithet}` };
}
