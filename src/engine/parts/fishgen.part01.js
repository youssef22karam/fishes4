// @@PART js/app.part01.js (1/19) lines 173-382 of the original module script -- stripped by build.mjs
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { installProcUI } from './procui.js';
import * as LAW from './laws.js';
import { eyeBand, eyeMargin, GILL_START_MAX, EYE_SEAT, EYE_PROTRUSION, EYE_PROTRUSION_MAX } from './eyeband.js';
import * as MOUTH from './mouthgeo.js';
import * as GILL from './gillgeo.js';
import * as DISC from './discgeo.js';
import { OP } from './headlaw.js';
import * as TEETHGEO from './teethgeo.js';
import * as MCHK from './mouthcheck.js';
import * as APP from './appendages.js';
import * as EYE from './eyegeo.js';
import * as PEC from './finmotion.js';
import * as TAIL from './tailgeo.js';
import { skinLaw } from './skinlaw.js';
import { auditAnatomy } from './anatomycheck.js';
import * as ROSTRUM from './rostrum.js';
import * as COH from './coherence.js';
import * as HEAD2 from './sculpt.js';
import * as HG from './hyper/genome.js';
import * as HS from './hyper/gillchamber.js';
import * as SKIN from './hyper/skin.js';
import { installRig } from './hyper/rig.js';

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ 0. NAMESPACE, UTILS, SEEDED PRNG                                 ║
   ╚══════════════════════════════════════════════════════════════════╝ */
const FG = window.FG = { THREE, version: '2.2.0' };
const TAU = Math.PI * 2;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const smoother = t => { t = clamp(t, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };
const gaussf = x => Math.exp(-x * x);
const isNum = x => typeof x === 'number' && Number.isFinite(x);

function cyrb128(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067); h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213); h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067); h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213); h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}
function sfc32(a, b, c, d) {
  return function () {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21 | c >>> 11); d = (d + 1) | 0;
    t = (t + d) | 0; c = (c + t) | 0; return (t >>> 0) / 4294967296;
  };
}
/** @typedef {{next:()=>number}} RNGLike */
class RNG {
  constructor(seed) { const h = cyrb128(String(seed)); this.f = sfc32(h[0], h[1], h[2], h[3]); for (let i = 0; i < 15; i++) this.f(); }
  next() { return this.f(); }
  range(a, b) { return a + (b - a) * this.f(); }
  int(a, b) { return Math.floor(this.range(a, b + 1 - 1e-9)); }
  pick(arr) { return arr[Math.floor(this.f() * arr.length)]; }
  chance(p) { return this.f() < p; }
  gauss() { let u = 0, v = 0; while (u === 0) u = this.f(); while (v === 0) v = this.f(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }
  weighted(obj) { const ks = Object.keys(obj); let tot = 0; for (const k of ks) tot += obj[k]; let r = this.f() * tot; for (const k of ks) { r -= obj[k]; if (r <= 0) return k; } return ks[ks.length - 1]; }
}
const getP = (o, p) => { const k = p.split('.'); let c = o; for (const x of k) { if (c == null) return undefined; c = c[x]; } return c; };
const setP = (o, p, v) => { const k = p.split('.'); if (k.some(x => ['__proto__', 'prototype', 'constructor'].includes(x))) return o; let c = o; for (let i = 0; i < k.length - 1; i++) { if (typeof c[k[i]] !== 'object' || c[k[i]] === null) c[k[i]] = {}; c = c[k[i]]; } c[k[k.length - 1]] = v; return o; };
const deepClone = o => JSON.parse(JSON.stringify(o));
const hslToHex = (h, s, l) => '#' + new THREE.Color().setHSL(((h % 360) + 360) % 360 / 360, clamp(s, 0, 1), clamp(l, 0, 1), THREE.SRGBColorSpace).getHexString();
const hexToHsl = hex => { const c = new THREE.Color(hex), o = {}; c.getHSL(o, THREE.SRGBColorSpace); return [o.h * 360, o.s, o.l]; };
const safeStore = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
};
/* trait-spec helpers used by the data tables */
const r = (a, b) => ({ r: [a, b] });
const ri = (a, b) => ({ r: [a, b], i: 1 });
const c = (...o) => ({ c: o });
const hsl = (h, s, l) => ({ hsl: [h, s, l] });

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ 1. GENOME SCHEMA  (single source of truth for defaults/bounds)   ║
   ╚══════════════════════════════════════════════════════════════════╝ */
/** @typedef {{t:'n'|'i'|'s'|'b'|'hsl', def:any, min?:number, max?:number, opts?:string[], g:string}} SchemaEntry */
const SCHEMA = {};
let _grp = 'Body';
const N = (p, def, min, max, g) => { if (g) _grp = g; SCHEMA[p] = { t: 'n', def, min, max, g: _grp }; };
const I = (p, def, min, max, g) => { if (g) _grp = g; SCHEMA[p] = { t: 'i', def, min, max, g: _grp }; };
const S = (p, def, opts, g) => { if (g) _grp = g; SCHEMA[p] = { t: 's', def, opts, g: _grp }; };
const B = (p, def, g) => { if (g) _grp = g; SCHEMA[p] = { t: 'b', def, g: _grp }; };
const C = (p, def, g) => { if (g) _grp = g; SCHEMA[p] = { t: 'hsl', def, g: _grp }; };

N('body.length', 0.3, 0.03, 18, 'Body'); N('body.fineness', 4, 1.25, 17); N('body.width', 0.55, 0.15, 3.2);
N('body.peakU', 0.38, 0.15, 0.65); N('body.frontPow', 1.2, 0.4, 3.5); N('body.backPow', 1.3, 0.5, 3.5);
N('body.snoutDepth', 0.25, 0.03, 0.9); N('body.snoutWidth', 0.6, 0.1, 1.5); N('body.pedDepth', 0.22, 0.03, 0.9);
N('body.pedWidth', 0.7, 0.2, 1.6); N('body.pedU', 0.88, 0.75, 0.97); N('body.superN', 2.1, 1.3, 6); N('body.superNTail', 2, 1.3, 6);
N('body.dorsalFrac', 0.52, 0.3, 0.78); N('body.ventralFlat', 0, 0, 1); N('body.dorsalFlat', 0, 0, 1);
N('body.posture', 0, -25, 95); N('body.roll', 0, -90, 90); N('body.curl', 0, 0, 1); N('body.keel', 0, 0, 1); N('body.hump', 0, 0, 1);
N('head.lengthFrac', 0.27, 0.1, 0.48, 'Head'); N('head.snoutTaper', 0.5, 0, 1); N('head.foreheadSlope', 0.1, -0.6, 1);
N('head.brow', 0.2, 0, 1); N('head.cheek', 0.3, 0, 1); N('head.eyeSize', 0.22, 0.05, 0.55); N('head.eyeU', 0.45, 0.15, 0.92);
N('head.eyeV', 0.35, -0.7, 0.98); N('head.eyeForward', 0.2, 0, 1); S('head.eyeSide', 'both', ['both', 'left', 'right', 'none']);
B('head.operculum', true); I('head.gillSlits', 0, 0, 7); N('head.nostrils', 0.5, 0, 1); I('head.barbels', 0, 0, 8); N('head.barbelLen', 0.3, 0.05, 2);
S('head.special', 'none', ['none', 'bill', 'sword', 'hammer', 'rostrum', 'paddle', 'esca', 'horns', 'whip']); N('head.specialLen', 0.3, 0.03, 1.5); N('head.specialWidth', 0.3, 0.03, 1.2);
S('mouth.type', 'terminal', ['terminal', 'superior', 'inferior', 'subterminal', 'beak', 'tube', 'suction', 'protrusible'], 'Mouth');
N('mouth.gape', 0.35, 0.05, 0.95); N('mouth.jawRatio', 1, 0.4, 1.5); N('mouth.lips', 0.3, 0, 1);
S('mouth.teeth', 'villiform', ['none', 'villiform', 'needle', 'triangular', 'fang', 'molar', 'beak', 'rasp']); I('mouth.teethCount', 16, 0, 90); N('mouth.open', 0.1, 0, 1); B('mouth.protrusible', false);
const FIN_SHAPES = ['sail', 'falcate', 'rounded', 'lobe', 'continuous', 'notched', 'spinySoft', 'filament', 'spines', 'triangle'];
B('fins.dorsal.present', true, 'Dorsal'); I('fins.dorsal.count', 1, 0, 3); N('fins.dorsal.u0', 0.15, 0, 0.95); N('fins.dorsal.u1', 0.6, 0.02, 1);
N('fins.dorsal.height', 0.35, 0.03, 2.2); N('fins.dorsal.sweep', 0.35, 0, 1); I('fins.dorsal.spines', 8, 0, 24); I('fins.dorsal.rays', 12, 2, 90);
N('fins.dorsal.opacity', 0.75, 0.1, 1); N('fins.dorsal.flex', 0.5, 0, 1); S('fins.dorsal.shape', 'spinySoft', FIN_SHAPES);
N('fins.dorsal2.u0', 0.65, 0, 0.97, 'Dorsal 2'); N('fins.dorsal2.u1', 0.9, 0.02, 1); N('fins.dorsal2.height', 0.3, 0.03, 2.2); S('fins.dorsal2.shape', 'lobe', FIN_SHAPES); I('fins.dorsal2.spines', 0, 0, 24); I('fins.dorsal2.rays', 10, 2, 90);
N('fins.dorsal3.u0', .74, 0, .97, 'Dorsal 3'); N('fins.dorsal3.u1', .97, .02, 1); N('fins.dorsal3.height', .28, .03, 1.2); S('fins.dorsal3.shape', 'rounded', FIN_SHAPES); I('fins.dorsal3.spines', 0, 0, 12); I('fins.dorsal3.rays', 12, 2, 40);
B('fins.anal.present', true, 'Anal'); N('fins.anal.u0', 0.3, 0, 0.95); N('fins.anal.u1', 0.75, 0.02, 1); N('fins.anal.height', 0.25, 0.03, 2); N('fins.anal.sweep', 0.35, 0, 1);
I('fins.anal.spines', 2, 0, 12); I('fins.anal.rays', 10, 2, 90); N('fins.anal.opacity', 0.75, 0.1, 1); N('fins.anal.flex', 0.5, 0, 1); S('fins.anal.shape', 'lobe', FIN_SHAPES);
B('fins.pectoral.present', true, 'Pectoral'); N('fins.pectoral.u', 0.1, 0, 1); N('fins.pectoral.v', 0, -0.9, 0.9); N('fins.pectoral.baseLen', 0.3, 0.03, 1);
N('fins.pectoral.len', 0.6, 0.05, 3.5); N('fins.pectoral.sweep', 0.4, 0, 1); N('fins.pectoral.spread', 0.6, 0.05, 1.6); I('fins.pectoral.rays', 14, 3, 60);
N('fins.pectoral.opacity', 0.7, 0.1, 1); N('fins.pectoral.flex', 0.6, 0, 1); S('fins.pectoral.shape', 'rounded', ['pointed', 'rounded', 'wing', 'disc', 'fan', 'filament', 'limb']); N('fins.pectoral.insertAngle', 20, 0, 90);
B('fins.pelvic.present', true, 'Pelvic'); S('fins.pelvic.position', 'abdominal', ['abdominal', 'thoracic', 'jugular']); N('fins.pelvic.len', 0.35, 0.03, 3);
I('fins.pelvic.rays', 6, 2, 20); N('fins.pelvic.opacity', 0.75, 0.1, 1); N('fins.pelvic.flex', 0.5, 0, 1); S('fins.pelvic.shape', 'pointed', ['pointed', 'rounded', 'fused', 'filament']);
B('fins.adipose.present', false, 'Other fins'); N('fins.adipose.size', 0.06, 0.02, 0.2); I('fins.finlets.count', 0, 0, 10);
const CAUDAL_TYPES = ['forked', 'lunate', 'truncate', 'rounded', 'emarginate', 'heterocercal', 'hypocercal', 'diphycercal', 'lyrate', 'filamentous', 'fantail'];
B('fins.caudal.present', true, 'Caudal'); S('fins.caudal.type', 'forked', CAUDAL_TYPES); N('fins.caudal.len', 0.2, 0.03, 1.6); N('fins.caudal.aspect', 2.5, 0.3, 9);
N('fins.caudal.lobeAsym', 0, -1, 1); N('fins.caudal.opacity', 0.85, 0.1, 1); N('fins.caudal.flex', 0.5, 0, 1); I('fins.caudal.rays', 20, 6, 40);
const SWIM_MODES = ['anguilliform', 'subcarangiform', 'carangiform', 'thunniform', 'ostraciiform', 'labriform', 'rajiform', 'hippocampiform'];
S('swim.mode', 'carangiform', SWIM_MODES, 'Swim'); N('swim.freq', 1.6, 0.1, 7); N('swim.amp', 0.06, 0, 0.25); N('swim.ampHead', 0.12, 0, 1); N('swim.waveK', 0.9, 0.2, 3); N('swim.envPow', 2.5, 0.5, 16);
S('skin.scale', 'cycloid', ['cycloid', 'ctenoid', 'ganoid', 'denticle', 'bare', 'plates', 'scutes'], 'Skin'); N('skin.scaleSize', 1, 0.2, 4);
S('skin.pattern', 'none', ['none', 'stripes', 'bars', 'spots', 'reticulate', 'saddles', 'mottle', 'disruptive', 'eyespot']); N('skin.patternScale', 1, 0.2, 4); N('skin.patternStrength', 0.6, 0, 1);
C('skin.base', [200, 0.3, 0.45]); C('skin.belly', [200, 0.1, 0.85]); C('skin.accent', [30, 0.5, 0.3]); C('skin.fin', [200, 0.3, 0.5]); C('skin.eye', [45, 0.8, 0.5]);
N('skin.countershade', 0.7, 0, 1); N('skin.iridescence', 0.3, 0, 1); N('skin.gloss', 0.5, 0, 1); I('skin.photophores', 0, 0, 80); C('skin.glow', [190, 1, 0.6]);
N('skin.translucency', 0, 0, 1); B('skin.electric', false); B('skin.inflate', false); N('skin.lateralLine', 0.6, 0, 1);
N('body.shoulder', .16, 0, .65, 'Body sculpt'); N('body.tailTaper', .65, .15, .95);
N('head.gillStart', .58, .4, .8, 'Gill anatomy'); N('head.gillHeight', .78, .25, 1.25); N('head.gillSlant', .2, -.4, .6); B('head.spiracles', false);
N('mouth.cornerCurve', .35, 0, 1, 'Mouth sculpt'); N('mouth.cavityDepth', .55, .2, .85);
N('skin.band', 0, 0, 1, 'Skin'); C('skin.bandColor', [345, .6, .6]);
for (const k of ['dorsal', 'dorsal2', 'anal', 'pectoral']) {
  N(`fins.${k}.apex`, .36, .16, .72, `${k} outline`);
  N(`fins.${k}.curvature`, .48, 0, 1);
  N(`fins.${k}.rootBlend`, .55, .2, 1);
}
N('fins.caudal.span', 1.5, .45, 3.8, 'Caudal sculpt'); N('fins.caudal.notch', .55, 0, 1); N('fins.caudal.rootBlend', .8, .3, 1);
FG.SCHEMA = SCHEMA;

/** Build a genome filled with schema defaults. */
function defaultGenome() {
  const g = { meta: { seed: '0', habitat: 'coralReef', niche: null, clade: 'teleost', species: null, fantasy: false, name: '', sci: '', tags: [], repairs: [], approx: true, version: FG.version } };
  for (const p in SCHEMA) setP(g, p, Array.isArray(SCHEMA[p].def) ? SCHEMA[p].def.slice() : SCHEMA[p].def);
  return g;
}
/** Coerce an arbitrary object onto the schema. Returns {genome, issues}. Unknown keys are dropped. */
function validateGenome(obj) {
  const issues = [], g = defaultGenome();
  if (!obj || typeof obj !== 'object') { issues.push('genome is not an object'); return { genome: g, issues }; }
  for (const p in SCHEMA) {
    const e = SCHEMA[p]; let v = getP(obj, p);
    if (v === undefined) continue;
    if (e.t === 'n' || e.t === 'i') {
      v = Number(v);
      if (!Number.isFinite(v)) { issues.push(`${p}: not a finite number, reset`); continue; }
      const cv = clamp(e.t === 'i' ? Math.round(v) : v, e.min, e.max);
      if (cv !== v) issues.push(`${p}: ${v} clamped to ${cv}`);
      setP(g, p, cv);
    } else if (e.t === 's') {
      if (e.opts.includes(v)) setP(g, p, v); else issues.push(`${p}: '${v}' not in enum, reset`);
    } else if (e.t === 'b') { if (typeof v === 'boolean') setP(g, p, v); else issues.push(`${p}: expected boolean, reset`); }
    else if (e.t === 'hsl') {
      if (Array.isArray(v) && v.length === 3 && v.every(isNum)) setP(g, p, [((v[0] % 360) + 360) % 360, clamp(v[1], 0, 1), clamp(v[2], 0, 1)]);
      else issues.push(`${p}: invalid color, reset`);
    }
  }
  if (obj.meta && typeof obj.meta === 'object') {
    for (const k of ['seed', 'surfaceSeed', 'habitat', 'niche', 'clade', 'species', 'parentSpecies', 'name', 'sci']) if (obj.meta[k] != null) g.meta[k] = String(obj.meta[k]).slice(0, 512);
    if (Array.isArray(obj.meta.tags)) g.meta.tags = obj.meta.tags.filter(t => typeof t === 'string').slice(0, 32);
    g.meta.fantasy = !!obj.meta.fantasy;
    g.meta.godMode = obj.meta.godMode === true;
    g.meta.edited = obj.meta.edited === true;
    g.meta.novel = obj.meta.novel === true;
    sanitizeMetaExtras(obj.meta, g.meta);
    if (obj.meta.adapted && HABITATS[obj.meta.adapted.from] && HABITATS[obj.meta.adapted.to]) {
      g.meta.adapted = { from: obj.meta.adapted.from, to: obj.meta.adapted.to, speculative: obj.meta.adapted.speculative === true };
    }
    if (obj.meta.evolution && typeof obj.meta.evolution === 'object') {
      const src = obj.meta.evolution, origin = {};
      for (const p in src.origin || {}) {
        const entry = SCHEMA[p], value = src.origin[p];
        if (entry && entry.t === 'n' && isNum(value)) origin[p] = clamp(value, entry.min, entry.max);
      }
      g.meta.evolution = { step: Math.round(clamp(Number(src.step) || 0, 0, 100000)), origin, clade: String(src.clade || g.meta.clade), lastModule: String(src.lastModule || '').slice(0, 32), direction: src.direction === -1 ? -1 : 1 };
    }
    if (obj.meta.mutation && typeof obj.meta.mutation === 'object') {
      const src = obj.meta.mutation, changes = [];
      for (const item of Array.isArray(src.changes) ? src.changes.slice(0, 48) : []) {
        const entry = item && SCHEMA[item.path]; if (!entry) continue;
        if (entry.t === 'n' && isNum(item.from) && isNum(item.to)) changes.push({ path: item.path, from: clamp(item.from, entry.min, entry.max), to: clamp(item.to, entry.min, entry.max), percent: isNum(item.percent) ? item.percent : null });
        if (entry.t === 's' && entry.opts.includes(item.from) && entry.opts.includes(item.to)) changes.push({ path: item.path, from: item.from, to: item.to, percent: null });
      }
      g.meta.mutation = { source: String(src.source || '').slice(0, 128), strength: clamp(Number(src.strength) || .55, .05, 1), shapeChange: clamp(Number(src.shapeChange) || 0, 0, 2), changes,
        modules: (Array.isArray(src.modules) ? src.modules : []).filter(item => item && FG.ADAPTATIONS && FG.ADAPTATIONS[item.id]).slice(0, 3).map(item => ({ id: item.id, amount: clamp(Number(item.amount) || 0, -1, 1) })) };
    }
  }
  if (!FG.CLADES[g.meta.clade]) { issues.push(`meta.clade '${g.meta.clade}' unknown, reset to teleost`); g.meta.clade = 'teleost'; }
  if (!FG.HABITATS[g.meta.habitat]) { issues.push(`meta.habitat '${g.meta.habitat}' unknown, reset to coralReef`); g.meta.habitat = 'coralReef'; }
  if (g.meta.niche && !FG.NICHES[g.meta.niche]) { issues.push(`meta.niche '${g.meta.niche}' unknown, cleared`); g.meta.niche = null; }
  if (g.meta.species && !FG.SPECIES.some(s => s.id === g.meta.species)) { issues.push(`meta.species '${g.meta.species}' unknown, cleared`); g.meta.species = null; }
  return { genome: g, issues };
}
FG.defaultGenome = defaultGenome; FG.validateGenome = validateGenome; FG.RNG = RNG;
/* ╔══════════════════════════════════════════════════════════════════╗
   ║ 2. EVOLUTION TREE  (each node stores only the traits it changes) ║
   ╚══════════════════════════════════════════════════════════════════╝ */
/** @typedef {{id:string,p:string|null,n:string,t:Object,tags:string[],req?:string[]}} CladeNode */
const CLADES = {};
const K = (id, p, n, t, tags = [], req) => { CLADES[id] = { id, p, n, t, tags, req }; };
K('fish', null, 'Fish (root)', { 'body.fineness': r(3.4, 5), 'body.width': r(.45, .7), 'body.peakU': r(.3, .45), 'body.snoutDepth': r(.18, .32), 'body.pedDepth': r(.15, .3), 'body.superN': r(1.9, 2.4), 'head.lengthFrac': r(.22, .3), 'head.eyeSize': r(.18, .26), 'head.eyeU': r(.38, .5), 'mouth.gape': r(.25, .45), 'fins.dorsal.u0': r(.1, .3), 'fins.dorsal.u1': r(.45, .7), 'fins.dorsal.height': r(.25, .45), 'fins.anal.u0': r(.2, .5), 'fins.anal.u1': r(.6, .85), 'fins.pectoral.len': r(.4, .7), 'fins.caudal.type': c('forked', 'emarginate', 'truncate', 'rounded'), 'fins.caudal.len': r(.16, .24), 'fins.caudal.aspect': r(1.5, 3), 'swim.freq': r(1.2, 2.2), 'skin.pattern': c('none', 'bars', 'spots', 'stripes', 'none'), 'skin.iridescence': r(.2, .5), 'fins.pectoral.v': r(-.45, -.25), 'skin.eye': c([45, .6, .55], [40, .15, .7], [30, .55, .45], [0, 0, .12]) }, [], ['marine', 'fresh']);
/* ── jawless ── */
K('agnatha', 'fish', 'Jawless fishes', { 'body.fineness': r(10, 16), 'body.width': r(.9, 1.05), 'body.snoutDepth': .5, 'body.pedDepth': .35, 'mouth.type': 'suction', 'mouth.teeth': 'rasp', 'mouth.teethCount': ri(30, 60), 'mouth.gape': r(.5, .8), 'mouth.lips': .9, 'head.operculum': false, 'head.gillSlits': 7, 'head.eyeSize': r(.07, .14), 'head.lengthFrac': r(.1, .14), 'fins.dorsal.shape': 'continuous', 'fins.dorsal.u0': r(.35, .55), 'fins.dorsal.u1': 1, 'fins.dorsal.height': r(.2, .35), 'fins.dorsal.spines': 0, 'fins.dorsal.rays': 40, 'fins.anal.present': false, 'fins.pectoral.present': false, 'fins.pelvic.present': false, 'fins.caudal.type': 'diphycercal', 'fins.caudal.len': r(.06, .1), 'fins.caudal.aspect': r(.5, .9), 'swim.mode': 'anguilliform', 'skin.scale': 'bare', 'skin.pattern': 'none', 'skin.gloss': .8, 'skin.lateralLine': 0 }, ['eelLike']);
K('lamprey', 'agnatha', 'Lampreys', { 'body.length': r(.3, .9), 'fins.dorsal.count': 2, 'fins.dorsal.u1': .7, 'fins.dorsal2.u0': .74, 'fins.dorsal2.u1': 1, 'fins.dorsal2.shape': 'continuous', 'skin.base': hsl([25, 60], [.1, .3], [.25, .4]), 'skin.belly': hsl([30, 50], .1, [.6, .75]) }, ['parasite'], ['fresh', 'marine']);
K('hagfish', 'agnatha', 'Hagfishes', { 'body.length': r(.4, .8), 'head.barbels': 6, 'head.barbelLen': .35, 'head.eyeSize': .07, 'head.eyeSide': 'none', 'fins.dorsal.u0': .7, 'skin.base': hsl([330, 20], [.15, .35], [.45, .6]), 'skin.belly': hsl([340, 20], .15, [.6, .75]), 'skin.countershade': .2 }, ['scavenger'], ['marine', 'deep']);
/* ── cartilaginous ── */
K('chondrichthyes', 'fish', 'Cartilaginous fishes', { 'skin.scale': 'denticle', 'skin.scaleSize': .5, 'skin.gloss': .35, 'skin.iridescence': .05, 'skin.pattern': 'none', 'skin.countershade': .85, 'skin.lateralLine': .3, 'head.operculum': false, 'head.gillSlits': 5, 'mouth.type': 'subterminal', 'mouth.teeth': 'triangular', 'mouth.teethCount': ri(20, 36), 'mouth.jawRatio': r(.65, .8), 'fins.dorsal.count': 2, 'fins.dorsal.shape': 'falcate', 'fins.dorsal.spines': 0, 'fins.dorsal.rays': 12, 'fins.dorsal.opacity': 1, 'fins.dorsal.flex': .15, 'fins.anal.shape': 'lobe', 'fins.anal.opacity': 1, 'fins.anal.spines': 0, 'fins.pectoral.opacity': 1, 'fins.pectoral.flex': .2, 'fins.pelvic.position': 'abdominal', 'fins.pelvic.opacity': 1, 'fins.caudal.type': 'heterocercal', 'fins.caudal.opacity': 1, 'fins.caudal.flex': .25, 'swim.mode': 'subcarangiform', 'swim.ampHead': .15, 'skin.base': hsl([200, 215], [.1, .25], [.3, .45]), 'skin.belly': hsl([200, 215], .05, [.8, .9]) }, ['shark'], ['marine']);
K('shark', 'chondrichthyes', 'Sharks', { 'body.fineness': r(5.5, 7.5), 'body.width': r(.75, .95), 'body.peakU': r(.3, .4), 'body.snoutDepth': r(.12, .2), 'body.pedDepth': r(.15, .22), 'head.lengthFrac': r(.2, .26), 'head.eyeSize': r(.1, .15), 'head.eyeU': r(.4, .55), 'head.snoutTaper': .75, 'fins.dorsal.u0': r(.12, .25), 'fins.dorsal.u1': r(.35, .45), 'fins.dorsal.height': r(.6, .9), 'fins.dorsal.sweep': .5, 'fins.dorsal2.u0': r(.72, .8), 'fins.dorsal2.u1': r(.88, .95), 'fins.dorsal2.height': r(.25, .4), 'fins.dorsal2.shape': 'falcate', 'fins.anal.u0': r(.6, .75), 'fins.anal.u1': r(.85, .95), 'fins.anal.height': r(.2, .3), 'fins.pectoral.shape': 'pointed', 'fins.pectoral.len': r(.7, 1.1), 'fins.pectoral.baseLen': .45, 'fins.pectoral.sweep': .55, 'fins.pectoral.v': -.35, 'fins.pectoral.insertAngle': 55, 'fins.pelvic.len': r(.3, .45), 'fins.caudal.len': r(.25, .33), 'fins.caudal.aspect': r(1.8, 2.6), 'fins.caudal.lobeAsym': r(.35, .6), 'swim.freq': r(.8, 1.3), 'swim.amp': r(.05, .08) }, ['shark']);
K('requiemShark', 'shark', 'Requiem sharks', { 'body.fineness': r(5.5, 6.8), 'body.length': r(1.2, 3.2), 'mouth.gape': r(.5, .65), 'skin.base': hsl([200, 215], [.08, .2], [.3, .42]) }, ['shark']);
K('mackerelShark', 'shark', 'Mackerel sharks', { 'body.fineness': r(4.5, 5.4), 'body.width': r(.9, 1.1), 'body.length': r(2.5, 5.5), 'body.keel': 1, 'body.pedDepth': r(.1, .14), 'mouth.gape': r(.6, .75), 'mouth.teeth': 'fang', 'mouth.teethCount': ri(24, 36), 'head.snoutTaper': .9, 'fins.caudal.type': 'lunate', 'fins.caudal.aspect': r(3.5, 4.5), 'fins.caudal.lobeAsym': r(.08, .2), 'swim.mode': 'thunniform', 'swim.freq': r(.9, 1.2), 'skin.base': hsl([205, 225], [.15, .3], [.22, .35]) }, ['shark']);
K('hammerhead', 'shark', 'Hammerhead sharks', { 'head.special': 'hammer', 'head.specialLen': r(.1, .14), 'head.specialWidth': r(.22, .32), 'head.eyeU': .33, 'head.eyeSize': .1, 'body.length': r(1.5, 4), 'fins.dorsal.height': r(.9, 1.2), 'fins.dorsal.shape': 'falcate', 'skin.base': hsl([35, 55], [.15, .3], [.3, .42]) }, ['shark']);
K('carpetShark', 'shark', 'Carpet / nurse sharks', { 'body.fineness': r(5, 6.5), 'body.ventralFlat': .55, 'body.length': r(1, 3), 'head.barbels': 2, 'head.barbelLen': .25, 'head.snoutTaper': .3, 'mouth.type': 'inferior', 'mouth.gape': r(.25, .35), 'mouth.teeth': 'molar', 'head.eyeSize': .08, 'head.eyeV': .7, 'fins.dorsal.u0': r(.55, .62), 'fins.dorsal.u1': r(.7, .76), 'fins.dorsal.height': r(.35, .5), 'fins.dorsal.shape': 'rounded', 'fins.dorsal2.u0': .8, 'fins.dorsal2.u1': .92, 'fins.pectoral.shape': 'rounded', 'fins.caudal.lobeAsym': r(.7, .9), 'fins.caudal.aspect': r(1.4, 1.9), 'skin.base': hsl([30, 45], [.25, .45], [.3, .45]), 'skin.pattern': c('none', 'spots', 'saddles'), 'swim.freq': r(.5, .8) }, ['shark', 'bottom']);
K('whaleShark', 'shark', 'Whale shark', { 'body.length': r(6, 12), 'body.fineness': r(5, 6), 'body.width': r(.95, 1.1), 'body.superN': r(2.8, 3.4), 'body.keel': 1, 'mouth.type': 'terminal', 'mouth.gape': r(.8, .92), 'mouth.teeth': 'rasp', 'mouth.teethCount': 60, 'head.snoutTaper': .15, 'head.eyeSize': .06, 'head.eyeV': 0, 'fins.caudal.type': 'lunate', 'fins.caudal.aspect': r(3, 3.8), 'fins.caudal.lobeAsym': r(.15, .3), 'skin.base': hsl([205, 215], [.2, .3], [.22, .3]), 'skin.accent': hsl(0, 0, .9), 'skin.pattern': 'spots', 'skin.patternStrength': .9, 'skin.patternScale': 1.6, 'skin.scale': 'scutes', 'swim.freq': r(.3, .45) }, ['shark', 'filter']);
K('angelShark', 'shark', 'Angel sharks', { 'body.fineness': r(3.8, 4.5), 'body.width': r(1.9, 2.5), 'body.ventralFlat': 1, 'body.dorsalFrac': .6, 'body.length': r(1, 2), 'mouth.type': 'terminal', 'mouth.gape': r(.55, .7), 'head.eyeV': .95, 'head.eyeSize': .08, 'fins.pectoral.shape': 'wing', 'fins.pectoral.len': r(1.2, 1.6), 'fins.pectoral.baseLen': .9, 'fins.pectoral.insertAngle': 85, 'fins.pectoral.sweep': .3, 'fins.dorsal.u0': .76, 'fins.dorsal.u1': .84, 'fins.dorsal.height': .35, 'fins.dorsal2.u0': .88, 'fins.dorsal2.u1': .96, 'fins.anal.present': false, 'fins.caudal.type': 'hypocercal', 'fins.caudal.lobeAsym': -.4, 'fins.caudal.aspect': r(1.4, 1.8), 'skin.pattern': 'mottle', 'skin.base': hsl([30, 45], [.2, .35], [.3, .42]), 'swim.freq': r(.5, .8) }, ['shark', 'bottom', 'flat']);
K('deepSeaShark', 'shark', 'Deep-sea sharks', { 'body.length': r(.4, 1.5), 'body.fineness': r(5.5, 6.5), 'head.eyeSize': r(.18, .26), 'skin.eye': [140, .8, .5], 'skin.base': hsl([20, 40], [.1, .3], [.1, .2]), 'skin.belly': hsl([20, 40], .1, [.15, .3]), 'skin.photophores': ri(14, 30), 'skin.glow': [180, .9, .6], 'skin.countershade': .3, 'fins.dorsal.spines': 1, 'swim.freq': r(.5, .8) }, ['shark', 'deep'], ['deep']);
K('batoid', 'chondrichthyes', 'Rays & skates', { 'body.fineness': r(2.8, 3.6), 'body.width': r(2.2, 3.1), 'body.ventralFlat': 1, 'body.dorsalFrac': .58, 'body.peakU': r(.35, .45), 'body.pedDepth': r(.06, .1), 'body.pedWidth': .7, 'body.superN': r(2.4, 3), 'head.lengthFrac': r(.2, .26), 'head.eyeV': .95, 'head.eyeSize': r(.1, .14), 'head.eyeU': .6, 'head.snoutTaper': .5, 'mouth.type': 'inferior', 'mouth.gape': r(.25, .4), 'mouth.teeth': 'molar', 'mouth.teethCount': 20, 'fins.pectoral.shape': 'disc', 'fins.pectoral.len': r(1.3, 1.9), 'fins.pectoral.baseLen': 1, 'fins.pectoral.insertAngle': 90, 'fins.pectoral.sweep': .15, 'fins.pectoral.rays': 30, 'fins.pectoral.u': 0, 'fins.pectoral.v': .15, 'fins.dorsal.present': false, 'fins.anal.present': false, 'fins.pelvic.shape': 'rounded', 'fins.pelvic.len': .4, 'fins.caudal.present': false, 'head.special': 'whip', 'head.specialLen': r(.6, 1.1), 'swim.mode': 'rajiform', 'swim.freq': r(.45, .7), 'skin.pattern': c('none', 'spots', 'mottle'), 'skin.base': hsl([25, 45], [.15, .35], [.3, .45]) }, ['ray', 'bottom', 'flat']);
K('stingray', 'batoid', 'Stingrays', { 'body.length': r(.4, 1.5), 'skin.base': hsl([25, 50], [.15, .4], [.28, .42]) }, ['ray', 'bottom', 'flat']);
K('skate', 'batoid', 'Skates', { 'body.length': r(.4, 1.2), 'head.special': 'none', 'fins.caudal.present': true, 'fins.caudal.type': 'truncate', 'fins.caudal.len': .05, 'fins.caudal.aspect': r(.8, 1.2), 'fins.dorsal.present': true, 'fins.dorsal.count': 2, 'fins.dorsal.u0': .84, 'fins.dorsal.u1': .89, 'fins.dorsal.height': .4, 'fins.dorsal.shape': 'rounded', 'fins.dorsal2.u0': .92, 'fins.dorsal2.u1': .97, 'fins.dorsal2.height': .35, 'fins.pectoral.shape': 'wing', 'head.snoutTaper': .85, 'body.snoutDepth': .08, 'skin.pattern': c('spots', 'mottle', 'eyespot') }, ['ray', 'bottom', 'flat']);
// @@PART js/app.part02.js (2/19) lines 383-425 of the original module script -- stripped by build.mjs
