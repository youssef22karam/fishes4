/* HEAD SYSTEM — separate hinged gill-cover pieces + open gill chamber + head spines.
 *
 * Everything is placed in the body's OWN skin coordinates (u along the spine, theta around the section; see gillgeo.js `sampler`), so the
 * cover, the chamber ("gill region mask" = the footprint  uFront(θ) … uEdge(θ), θ ∈ [θlo, θhi]) and the arches always line up, on every body plan.
 *
 * Meshes (each its own geometry + UV island; one shared head shader, kind id per vertex):
 *   operculum (main plate, upper) · suboperculum · interoperculum (lower, long pointed tip) · preoperculum (fixed cheek plate)
 *   · branchiostegal membrane with 5-8 radiating rays · soft opercular flap · spines (opercle edge / cheek / brow) · tassels
 *   · gill chamber: cavity basin, 3-4 arches (bony tubes), two comb rows of crimson filaments per arch, rakers, pseudobranch.
 * Hinge: pivot at the upper-front edge, axis = the preopercle line; rotation is weighted by distance behind the hinge so the front stays attached.
 * Animation (vertex shader): open amount + breathing cycle (0.5-2 Hz, 5-25 deg), filaments sway with the breathing.
 * Detail policy: `detail` 1 = hero (full counts), ~.35 = med (fewer filaments/rakers), 0 = nothing built (LOD2+ uses the engine's own cover). */
import { OP, opEdgeU } from '../headlaw.js';
import { gillPlan } from '../gillplan.js';
import { bakeOperculum, HYPER_TEX } from './textures.js';
import { R } from './genome.js';
import { headDepthAt } from '../eyegeo.js';

const hsv2rgb = (h, s, v) => { h = ((h % 360) + 360) % 360 / 60; const c = v * s, x = c * (1 - Math.abs(h % 2 - 1)), m = v - c; const [r, g, b] = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x]; return [r + m, g + m, b + m]; };
export const MAX_OPEN_DEG = 35;   // physiological maximum; values of `open` > 1 are a display override for macro shots

/* ───────────── shaders ───────────── */
const VS = (SWIM) => SWIM + /* glsl */`
attribute vec4 aOp; attribute vec4 aK; varying vec3 vN, vWP; varying vec2 vUv; varying vec4 vK; varying float vVis;
uniform float uOpOpen, uOpBreath, uOpHz, uOpBreathOn, uSwayAmp; uniform vec3 uPivP, uPivN, uAxis;
vec3 rodr(vec3 v, vec3 a, float g){ float c=cos(g), s=sin(g); return v*c + cross(a,v)*s + a*dot(a,v)*(1.0-c); }
void main(){
  vec3 p = position, n = normal;
  float br = 0.5 + 0.5*sin(uTime*6.2831853*uOpHz);
  float ang = aOp.y * aOp.x * max(0.0, uOpOpen + (br-0.5)*uOpBreath*uOpBreathOn);
  if(aOp.x > 0.0005){ vec3 pv = aOp.y > 0.0 ? uPivP : uPivN; p = pv + rodr(p-pv, uAxis, ang); n = rodr(n, uAxis, ang); }
  /* R3: the chamber (kinds 10-14: filaments, arches, rakers, basin, pseudobranch) lives UNDER the cover. It folds into the hinge while the cover is flush
     (no red can show outside the head) and grows to full size as the cover lifts: vis 0 below ~3 deg, 1 above ~17 deg. */
  vVis = 1.0;
  if(aK.x > 9.5 && aK.x < 14.5){ float oa = max(0.0, uOpOpen + (br-0.5)*uOpBreath*uOpBreathOn); vVis = smoothstep(0.04, 0.50, oa);   /* round 7 WP4: breathing alone (≤ ~12° + rest) must NEVER unfold the chamber — the folded wad at the hinge showed as a red tuft through the closed cover; the chamber appears only on a real gill-open */
    vec3 pv = aOp.y > 0.0 ? uPivP : uPivN; p = pv + (p-pv)*vVis; }
  /* filament / flap sway with the breathing cycle */
  float sw = sin(uTime*2.3 + aK.z*6.2831853 + p.y*40.0/max(uLen,1e-3)) * (0.6 + 0.4*br);
  p += normalize(n + vec3(0.0,1e-4,0.0)) * sw * aOp.w * uSwayAmp * uLen;
  applyWave(p, n, uPhase);
  vec4 wp = modelMatrix*vec4(p,1.0); vWP = wp.xyz; vN = normalize(mat3(modelMatrix)*n); vUv = uv; vK = aK;
  gl_Position = projectionMatrix*viewMatrix*wp; }`;

const FS = (COMMON) => COMMON + /* glsl */`
varying vec3 vN, vWP; varying vec2 vUv; varying vec4 vK; varying float vVis;
uniform sampler2D uMapA, uMapB; uniform vec3 uGillBase, uGillTip, uCavity, uArchCol, uBase, uBelly, uAccent, uCream;
uniform float uGillPale, uVariant, uFlapSpot, uFlapEdge, uRays, uSeed, uIrid, uLamellae, uMapOn;
mat3 cotFrame(vec3 N, vec3 p, vec2 uv){ vec3 dp1=dFdx(p), dp2=dFdy(p); vec2 duv1=dFdx(uv), duv2=dFdy(uv);
  vec3 dp2perp=cross(dp2,N), dp1perp=cross(N,dp1); vec3 T=dp2perp*duv1.x+dp1perp*duv2.x; vec3 B=dp2perp*duv1.y+dp1perp*duv2.y;
  float inv=inversesqrt(max(max(dot(T,T),dot(B,B)),1e-20)); return mat3(T*inv,B*inv,N); }
void main(){
  if(vK.x > 9.5 && vK.x < 14.5 && vVis < 0.10) discard;   /* round 7 WP4: vVis in [.02,.10] still rendered the folded chamber as a tiny red wad at the hinge pivot — discard through the whole breathing range */
  vec3 N = normalize(vN); if(!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vWP); float nv = max(dot(N,V),0.0);
  float kind = vK.x; vec3 col = vec3(.5); float rough=.3, metal=0.0, sss=0.1, coat=.5, ao=1.0, alpha=1.0; vec3 sheen=vec3(0.0);
  bool plate = kind < 0.5 || (kind > 3.5 && kind < 4.5);
  if(plate || (kind>4.5 && kind<5.5)){                                 /* operculum pieces: baked albedo / height / normal / roughness / metal */
    vec4 a = texture2D(uMapA, vUv), b = texture2D(uMapB, vUv); vec3 alb = pow(a.rgb, vec3(2.2));
    vec3 nt = vec3((b.xy-.5)*2.0, 0.0); nt.z = sqrt(max(0.0, 1.0-dot(nt.xy,nt.xy)));
    if(kind < 0.5) nt.xy *= .45;   /* round 7 WP4: flatten the bake's crinkle relief on the outer plate — at full strength it reads as crumpled foil, not skin over bone */
    mat3 TBN = cotFrame(N, vWP, vUv); N = normalize(TBN*nt);
    col = alb; rough = max(.28, b.z); metal = b.w * (.2 + .8*uIrid);   /* round 7 WP4: roughness floor .28 on the plate — a mirror-polished bake washes the cover white in the studio env regardless of its albedo */ ao = .6 + .4*smoothstep(.05,.65,a.a); coat = 1.0; sss = .08;   /* metalness follows the fish's OWN scale chrome (uIrid), not the bake's whim */
    if(kind < 0.5 || kind > 3.5){ vec3 skinFld = mix(uBelly, uBase, smoothstep(-.95,.95, vK.w)); col = mix(col, skinFld * (.8 + .35*a.a), .58); }   /* round 7 WP4: the cover wears the fish's own skin field (dorsal-belly gradient by sinθ; skin coords ride in vK.zw) — never a foreign slab */
    sheen = mix(alb, vec3(.85,.9,1.0), .5)*uIrid*.5;
    float rimE = smoothstep(.93,1.0,vUv.x); ao *= 1.0 - .18*rimE;
    if(kind>3.5 && kind<4.5){                                           /* soft opercular flap: thin, paler, dark margin / spot */
      col = mix(col, uBase*.8+vec3(.08), .35); metal *= .3; rough = .35; sss = .55;
      col *= 1.0 - uFlapEdge*.75*smoothstep(.72,.98,vUv.x);
      col *= 1.0 - uFlapSpot*.85*(1.0-smoothstep(.07,.15,length((vUv-vec2(.45,.5))*vec2(1.3,.8))));
      if(vUv.x > .90 + .10*vnoise(vec2(vUv.y*22.0,uSeed))*.9 + .04) discard; }
    if(kind>4.5){                                                       /* branchiostegal membrane: radiating rays in a pale translucent skin */
      float ray = pow(abs(sin(vUv.y*uRays*3.14159265)), 5.0);
      col = mix(vec3(.80,.64,.62), alb*.8, .35 + .3*ray); col *= .78 + .3*ray; metal *= .35; rough = .3; sss = .6;
      if(vUv.x > .92 + .08*vnoise(vec2(vUv.y*uRays*3.0,uSeed))) discard; }
  } else if(kind < 1.5){                                                /* inner face of the plates: pearlescent pink-white, radial bone ridges from the hinge, veins */
    vec4 a = texture2D(uMapA, vUv), b2 = texture2D(uMapB, vUv); float f = fbm(vUv*vec2(40.0,18.0)+uSeed);
    float rad = atan(vUv.y-.22, vUv.x+1e-3); float ridge = .5+.5*sin(rad*70.0 + f*5.0);
    col = mix(vec3(.74,.50,.50), vec3(.93,.88,.86), f*.7+ridge*.3); col *= .72 + .3*smoothstep(.1,.7,a.a) + .12*ridge;
    col = mix(col, vec3(.55,.18,.20), (1.0-smoothstep(.0,.25,vUv.x))*.25);          /* flushed near the hinge */
    vec3 nt = vec3((b2.xy-.5)*2.0*.6, 0.0); nt.z = sqrt(max(0.0, 1.0-dot(nt.xy,nt.xy))); N = normalize(cotFrame(N, vWP, vUv)*nt);
    vec3 iri = hsv2rgb(vec3(fract(.55+(1.0-nv)*.5+f*.2),.35,1.0)); col += iri*.10*pow(1.0-nv,2.0);
    rough = .2; coat = 1.0; sss = .7; ao = .75 + .25*smoothstep(.0,.3,vUv.x);
  } else if(kind < 2.5){                                                /* free edge of the bone: thick, pale */
    col = mix(vec3(.74,.70,.66), pow(uCream,vec3(1.0)), .5); rough = .35; coat = .6; sss = .3; ao = .9;
  } else if(kind < 3.5){                                                /* spines: plate-coloured base, cream tip */
    float t = vK.y; col = mix(uBase*1.6 + vec3(.05), uCream, smoothstep(.15,.7,t)); col *= .9 + .2*vnoise(vec2(t*20.0, vK.z*30.0));
    rough = .35; coat = .8; sss = .25; ao = mix(.65, 1.0, smoothstep(.0,.4,t));
  } else if(kind > 9.5 && kind < 10.5){                                 /* gill filament: crimson, bright tips, dark base, lamellae striation, translucent */
    float t = vK.y, r = vK.z;
    col = mix(uGillBase, uGillTip, smoothstep(.05,1.0,t)); col = mix(col, vec3(.80,.50,.52)*.9, uGillPale);
    float lam = smoothstep(.25,.75, sin(t*(38.0+26.0*uLamellae) + r*9.0)*.5+.5);
    col *= (.62 + .38*lam) * (.82 + .3*r) * mix(.28, 1.0, smoothstep(.0,.5,t));
    rough = .34; coat = 1.0; sss = .9; ao = mix(.45,1.0,smoothstep(.0,.4,t));
    N = normalize(N + (lam-.5)*.25*normalize(cross(N, vec3(0.0,1.0,0.0)))); sheen = vec3(.5,.1,.1)*.4;
  } else if(kind < 11.5){                                               /* gill arch: pale pink-white bony tube */
    float f = fbm(vec2(vK.y*30.0, vK.z*14.0)+uSeed);
    col = mix(vec3(.86,.64,.62), vec3(.97,.92,.88), f) * uArchCol; col = mix(col, vec3(.95,.55,.55), .12*(1.0-vK.w));
    rough = .30; coat = .9; sss = .45; ao = .85 + .15*sin(vK.y*60.0)*0.0;
  } else if(kind < 12.5){                                               /* gill raker: pale spiky bone */
    col = mix(vec3(.92,.84,.76), uCream, .5) * (.75 + .25*smoothstep(.0,.6,vK.y)); rough = .32; coat = .7; sss = .35; ao = mix(.6,1.0,vK.y);
  } else if(kind < 13.5){                                               /* chamber basin: dark red wet membrane, veined, lighter pink at the rim */
    float d = vK.y, aoK = vK.z;
    float vein = 1.0 - smoothstep(.0,.06, abs(fbm(vUv*vec2(26.0,40.0)+uSeed)-.5));
    vec3 deep = uCavity*.35, mid = uCavity, rim = vec3(.78,.40,.40);
    col = mix(rim, mid, smoothstep(.0,.35,d)); col = mix(col, deep, smoothstep(.35,.95,d)*.8); col += vec3(.18,.03,.03)*vein*.6;
    col *= aoK; rough = .38; coat = 1.0; sss = .5; ao = .8;
  } else if(kind < 14.5){                                               /* pseudobranch: small bright red comb */
    float t = vK.y; col = mix(uGillBase*.6, uGillTip*1.15, t); col = mix(col, vec3(.8,.5,.5), uGillPale*.6); col *= mix(.4,1.0,t); rough = .25; coat = 1.0; sss = 1.0;
  } else if(kind > 15.5 && kind < 16.5){                                /* round 7 WP3: orbital rim — a SKIN fold, body-coloured (was kind 2 pale bone: read as a plastic ring around the eye) */
    col = mix(uBase*1.05, uBelly, .25) * (.9 + .2*vnoise(vec2(vUv.x*40.0, uSeed))); rough = .5; coat = .5; sss = .5; ao = .95;
  } else {                                                              /* dermal tassel: body-coloured flesh, pale tip */
    float t = vK.y; col = mix(uBase*1.2+vec3(.04), mix(uBase*1.6, uBelly, .45), smoothstep(.3,1.0,t)); rough = .45; coat = .6; sss = .5;
  }
  vec3 c = pbrSkin(col, N, vWP, rough, metal, sss, coat, sheen) * ao;
  if(plate){ vec3 iri = hsv2rgb(vec3(fract(.5+(1.0-nv)*.55+fbm(vUv*6.0)*.3),.55,1.0)); c += iri*uIrid*(.25+.5*metal)*pow(1.0-nv,2.2)*.5; }
  c = mix(c, uFogCol, fogAmt(vWP)); gl_FragColor = vec4(c, alpha); }`;

/* ───────────── geometry builder ───────────── */
class GB {
  constructor() { this.p = []; this.uv = []; this.op = []; this.k = []; this.i = []; this.n = 0; }
  v(P, u, v, opw, side, edge, tip, kind, a, b, c) { this.p.push(P.x, P.y, P.z); this.uv.push(u, v); this.op.push(opw, side, edge, tip); this.k.push(kind, a, b, c); return this.n++; }
  quad(a, b, c, d) { this.i.push(a, b, c, b, d, c); }
  geo(THREE) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('aOp', new THREE.Float32BufferAttribute(this.op, 4)); g.setAttribute('aK', new THREE.Float32BufferAttribute(this.k, 4));
    g.setIndex(this.i); g.computeVertexNormals(); return g;
  }
}

/** Build the whole head system for one fish. X = shared engine handles; returns { group, setOpen, params, tris, geos, material, dispose }. */
export function buildHeadSystem(bm, g, H, X, uni, opts = {}) {
  const { THREE, clamp, lerp, sstep, smoother } = X, detail = opts.detail == null ? 1 : opts.detail;
  const group = new THREE.Group(); group.name = 'hyperHead'; const geos = [];
  const L = bm.L, h = bm.h, lm = bm.lm, maxD = bm.maxD, uOp = lm.operculum, O = H.oper, G = H.gill;
  const GP = gillPlan(bm, g, H);   /* round 7 WP4: axis-driven gill plan (filament investment + raker mode by niche/plan) */
  /* front of the cover footprint: just behind the eye (+ margin), but never narrower than 28% / wider than 55% of the head length */
  const eyeRearU = g.head.eyeSide !== 'none' ? lm.eye + 1.6 * bm.eyeR / L + .004 : uOp - .5 * h;
  const uPre = Math.min(Math.max(eyeRearU, uOp - .55 * h), uOp - .28 * h);
  const rng = new R(H.seeds.oper + '/geo'), rngG = new R(H.seeds.gill + '/geo'), rngH = new R(H.seeds.head + '/geo');
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  /* ── surface access in skin coordinates (same convention as gillgeo.sampler) ── */
  const fr = {}, sc = {}, pp = {}, nq = {};
  const surf = (u, th, side, off, out) => {
    const tb = side > 0 ? th : Math.PI - th, o = maxD * off;
    if (bm.loft) { bm.sampleLoft(u, tb, pp); bm.sampleLoft(u, tb, nq, 'normal'); const nl = Math.hypot(nq.x, nq.y, nq.z) || 1; return out.set(pp.x + nq.x / nl * o, pp.y + nq.y / nl * o, pp.z + nq.z / nl * o); }
    bm.frame(u, fr); bm.section(u, sc); bm.point(u, tb, pp, fr, sc, true); const l = Math.hypot(pp.ly, pp.lz) || 1;
    return out.set(pp.x + fr.nx * pp.ly / l * o, pp.y + fr.ny * pp.ly / l * o, pp.z + pp.lz / l * o);
  };
  const surfN = (u, th, side, out) => {
    const tb = side > 0 ? th : Math.PI - th;
    if (bm.loft) { bm.sampleLoft(u, tb, nq, 'normal'); return out.set(nq.x, nq.y, nq.z).normalize(); }
    bm.frame(u, fr); bm.section(u, sc); bm.point(u, tb, pp, fr, sc, true); const l = Math.hypot(pp.ly, pp.lz) || 1; return out.set(fr.nx * pp.ly / l, fr.ny * pp.ly / l, pp.lz / l).normalize();
  };
  const A0 = V3(0, 0, 0), A1 = V3(0, 0, 0), A2 = V3(0, 0, 0), A3 = V3(0, 0, 0);
  /** local frame: P (offset point), Tu (rearward, along +u), Tt (towards dorsal), N (outward) */
  const frame = (u, th, side, off) => {
    const eu = h * .004, et = .02, P = surf(u, th, side, off, V3(0, 0, 0));
    const Tu = surf(u + eu, th, side, 0, A0).clone().sub(surf(u - eu, th, side, 0, A1)).normalize();
    const Tt = surf(u, th + et, side, 0, A2).clone().sub(surf(u, th - et, side, 0, A3)).normalize();
    const N = surfN(u, th, side, V3(0, 0, 0)); Tt.addScaledVector(N, -Tt.dot(N)).normalize(); Tu.addScaledVector(N, -Tu.dot(N)).normalize();
    return { P, Tu, Tt, N };
  };

  /* ── gill-region mask in (u, θ): footprint shared by cover, basin, arches ── */
  const H0 = OP.height, T = Math.max(.004, O.thickness * h * L / maxD);       // lift of the plate, thickness (× maxD)
  const TH_TOP = .50 + .32 * O.height, TH_TIP = -1.28, thW = w => lerp(TH_TOP, TH_TIP, w);
  const uTip = lerp(uPre, Math.max(bm.hingeU + .003, lm.mouthCorner + .01, uPre * .7), .75 + .25 * O.tipSharp);
  const edge = th => opEdgeU(uOp, h, Math.sin(th)) + O.rearCurve * h * .03 * Math.pow(Math.sin(th) - .2, 2) - h * .012 * O.rearCurve;
  const front = th => uPre + h * .035 * Math.pow(Math.sin(th) - .15, 2);
  const serr = w => O.edge === 'wavy' ? Math.sin(w * 34) * .0035 * h : O.edge === 'serrated' || O.edge === 'spined' ? (Math.abs((w * 22) % 1 - .5) - .25) * .012 * h : 0;
  const bounds = (th, w) => {
    const s = sstep(-.18, TH_TIP, th), pT = lerp(1.7, .9, O.tipSharp);   /* R3: the lower ~45% of the cover sweeps forward into a long pointed tip under the cheek (sea-bass outline) */
    const uR = lerp(edge(th), uTip, Math.pow(s, pT)), uF = lerp(front(th), uTip, Math.pow(s, pT * .55));
    const cap = w < .1 ? Math.sqrt(Math.max(0, 1 - Math.pow((.1 - w) / .1, 2))) : 1, m = (uF + uR) / 2, hw = (uR - uF) / 2 * (.28 + .72 * cap);
    return [m - hw, m + hw];
  };
  const prof = f => smoother(Math.min(1, f / .42)) * (1 + (OP.crest - 1) * sstep(.76, 1, f));
  const win = w => sstep(0, .05, w) * sstep(0, .03, 1 - w);

  const eyeV = (() => { if (g.head.eyeSide === 'none') return 0; const yy = bm.eyeY || 0, es = bm.section(lm.eye, {}), yr = Math.max(1e-8, yy > 0 ? es.dUp : es.dDn); return Math.sign(yy || 1) * Math.min(.9, Math.abs(yy) / yr); })();
  const eyeH = (() => { if (g.head.eyeSide === 'none') return .1; const es = bm.section(lm.eye, {}); return clamp(bm.eyeR / Math.max(1e-6, (es.dUp + es.dDn) * .5), .02, .9); })();
  /* ── textures (own bake per fish, cached by params) ── */
  const P = H.palette, tex = bakeOperculum(THREE, { variant: O.variant, seed: H.seeds.oper, size: opts.texSize || HYPER_TEX.size, base: P.back, flank: P.flank, belly: P.belly, accent: P.accent, cream: P.cream, gold: P.iris.map((x, i) => x * .85 + [.1, .06, 0][i]), striae: O.striae, crinkle: O.crinkle, cracks: O.cracks });
  const col3 = a => new THREE.Color().setRGB(a[0], a[1], a[2], THREE.SRGBColorSpace);
  const gh = (360 + G.hue) % 360, gb = hsv2rgb(gh, G.sat, G.val * .42), gt = hsv2rgb((gh + 3) % 360, Math.min(1, G.sat * 1.0), Math.min(.82, G.val * .9));
  const cav = { darkRed: [.30, .045, .055], blackRed: [.14, .02, .03], pinkRed: [.50, .12, .13] }[G.cavity];
  const breath = O.breathDeg * Math.PI / 180;
  const U = {
    uMapA: { value: tex.mapA }, uMapB: { value: tex.mapB }, uOpOpen: { value: O.open * MAX_OPEN_DEG * Math.PI / 180 }, uOpBreath: { value: breath }, uOpHz: { value: O.breathHz }, uOpBreathOn: { value: 1 }, uSwayAmp: { value: .0022 * G.sway },
    uPivP: { value: V3(0, 0, 0) }, uPivN: { value: V3(0, 0, 0) }, uAxis: { value: V3(0, 1, 0) },
    uGillBase: { value: new THREE.Color().setRGB(gb[0], gb[1], gb[2], THREE.SRGBColorSpace) }, uGillTip: { value: new THREE.Color().setRGB(gt[0], gt[1], gt[2], THREE.SRGBColorSpace) }, uGillPale: { value: G.pale },
    uCavity: { value: new THREE.Color().setRGB(cav[0], cav[1], cav[2], THREE.SRGBColorSpace) }, uArchCol: { value: new THREE.Color(1, 1, 1).multiplyScalar(G.archPale * .9 + .1) },
    uCream: { value: col3(P.cream) }, uFlapSpot: { value: O.flapSpot ? 1 : 0 }, uFlapEdge: { value: O.flapDarkEdge ? 1 : 0 }, uRays: { value: 5 + Math.round(rng.next() * 3) }, uLamellae: { value: G.lamellae }, uMapOn: { value: 1 },
    uVariant: { value: ['chrome', 'reticulate', 'rust', 'plain'].indexOf(O.variant) },
  };
  const uniforms = Object.assign({}, uni, U, { uBase: { value: col3(P.back).multiplyScalar(1.0) }, uBelly: { value: col3(P.belly) }, uAccent: { value: col3(P.accent) }, uIrid: { value: clamp(H.scales.chromeMirror * .9 + .1, 0, 1) } });
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: VS(X.GLSL_SWIM), fragmentShader: X.FS_POST(FS(X.GLSL_COMMON_FS)), side: THREE.DoubleSide });
  const addMesh = (gbld, name) => { const geo = gbld.geo(THREE); geos.push(geo); const m = new THREE.Mesh(geo, material); m.name = name; m.frustumCulled = false; m.userData.hyper = name; group.add(m); return m; };
  let tris = 0; const parts = {};

  /* ── hinge (per side): pivot at the upper-front edge, axis along the preopercle line ── */
  const hingeFor = side => {
    const a = surf(front(.75), .75, side, H0, V3(0, 0, 0)), b = surf(front(-.7), -.7, side, H0, V3(0, 0, 0)), pv = surf(front(.3), .3, side, H0, V3(0, 0, 0));
    const ax = a.sub(b); ax.z = 0; ax.normalize(); if (ax.y < 0) ax.negate(); return { pv, ax };
  };
  const hp = hingeFor(1), hn = hingeFor(-1); U.uPivP.value.copy(hp.pv); U.uPivN.value.copy(hn.pv); U.uAxis.value.copy(hp.ax);
  const sideSgn = {}; for (const s of [1, -1]) sideSgn[s] = Math.sign(surf(uPre + h * .2, .2, s, 0, V3(0, 0, 0)).z) || s;
  // axis in the x-y plane with +y: rotating a rear point (−x of the pivot) by +angle moves it +z, so the +z side opens with +angle.

  /* ───────── cover pieces ───────── */
  const WCUT = [0, .5, .8, 1], PIECES = [['operculum', 0, 1, [0, 0]], ['suboperculum', 1, 2, [.5, 0]], ['interoperculum', 2, 3, [0, .5]]];
  const NS = detail > .6 ? 18 : 10;
  for (const side of [1, -1]) {
    for (const [name, i0, i1, uvo] of PIECES) {
      const wLo = WCUT[i0], wHi = WCUT[i1], b = new GB(), NR = Math.max(5, Math.round((detail > .6 ? 26 : 14) * (wHi - wLo))), sg = sideSgn[side], Pt = V3(0, 0, 0);
      const idx = [[], []];
      for (let layer = 0; layer < 2; layer++) for (let i = 0; i <= NS; i++) {
        const f = Math.pow(i / NS, .9);
        for (let j = 0; j <= NR; j++) {
          const w = lerp(wLo, wHi, j / NR), th = thW(w), [uF, uR] = bounds(th, w), u = lerp(uF, uR, f) + serr(w) * Math.pow(f, 4), wn = win(w);
          const off = layer === 0 ? .0007 + (H0 * prof(f) + T) * wn : .0004 + H0 * prof(f) * wn * .55;
          surf(u, th, side, off, Pt);
          idx[layer].push(b.v(Pt, uvo[0] + .5 * f, uvo[1] + .5 * (j / NR), Math.pow(f, 1.25), sg, f > .9 ? 1 : 0, 0, layer === 0 ? 0 : 1, 0, u, Math.sin(th)));   /* aK.zw = skin coords (u, sinθ) for the WP4 skin-field blend */
        }
      }
      const cols = NR + 1;
      for (let layer = 0; layer < 2; layer++) for (let i = 0; i < NS; i++) for (let j = 0; j < NR; j++) { const a = idx[layer][i * cols + j]; b.quad(a, a + 1, a + cols, a + cols + 1); }
      // thickness skirt around the perimeter
      const loop = []; for (let j = 0; j <= NR; j++) loop.push([0, j]); for (let i = 1; i <= NS; i++) loop.push([i, NR]); for (let j = NR - 1; j >= 0; j--) loop.push([NS, j]); for (let i = NS - 1; i >= 1; i--) loop.push([i, 0]);
      const sk = loop.map(([i, j], n) => { const o = idx[0][i * cols + j], q = idx[1][i * cols + j]; const po = V3(b.p[o * 3], b.p[o * 3 + 1], b.p[o * 3 + 2]), pq = V3(b.p[q * 3], b.p[q * 3 + 1], b.p[q * 3 + 2]); const wt = Math.pow(i / NS, 1.25); const uu = uvo[0] + .5 * (n / loop.length), vv = uvo[1] + .25; return [b.v(po, uu, vv, wt, sg, 1, 0, 2, 0, 0, 0), b.v(pq, uu, vv + .01, wt, sg, 1, 0, 2, 0, 0, 0)]; });   /* skirt keeps its UVs inside the piece's own atlas quadrant */
      for (let n = 0; n < sk.length; n++) { const a = sk[n], c = sk[(n + 1) % sk.length]; b.quad(a[0], c[0], a[1], c[1]); }
      parts[name + (side > 0 ? 'R' : 'L')] = addMesh(b, name + (side > 0 ? '_R' : '_L'));
    }

    /* preoperculum: fixed cheek plate with a raised ridge along its rear (hinge-side) edge */
    { const b = new GB(), NSp = 8, NRp = 18, Pt = V3(0, 0, 0), idx = [];
      for (let i = 0; i <= NSp; i++) { const f = i / NSp; for (let j = 0; j <= NRp; j++) { const w = j / NRp, th = lerp(.72, -.9, w), uf = front(th), u = uf - h * .09 * (1 - f) * (.6 + .4 * Math.sin(Math.PI * w)); const ridge = Math.exp(-Math.pow((1 - f) / .12, 2)), eyeK = g.head.eyeSide === 'none' ? 1 : sstep(.9, 1.5, Math.hypot((u - lm.eye) / (1.6 * bm.eyeR / L), (Math.sin(th) - eyeV) / Math.max(.05, eyeH * 1.6))), off = (.0012 + H0 * (.35 * f + .65 * ridge * 1.2) + T * .5 * f) * sstep(0, .08, w) * sstep(0, .06, 1 - w) * sstep(0, .1, f + .1) * eyeK;
          surf(u, th, side, off, Pt); idx.push(b.v(Pt, .5 + .5 * f, .5 + .5 * w, 0, sideSgn[side], 0, 0, 0, 0, u, Math.sin(th))); } }
      for (let i = 0; i < NSp; i++) for (let j = 0; j < NRp; j++) { const a = idx[i * (NRp + 1) + j]; b.quad(a, a + 1, a + NRp + 1, a + NRp + 2); }
      parts['preoperculum' + side] = addMesh(b, 'preoperculum_' + (side > 0 ? 'R' : 'L')); }

    /* soft opercular flap: thin trailing skin behind the rear edge (moves with the plate, sways) */
    { const b = new GB(), NRf = 20, Pt = V3(0, 0, 0), idx = []; const fl = h * (.02 + .045 * O.flap);
      for (let i = 0; i <= 3; i++) { const f = i / 3; for (let j = 0; j <= NRf; j++) { const w = lerp(.06, .62, j / NRf), th = thW(w), [, uR] = bounds(th, w), body = Math.sin(Math.PI * (j / NRf)) ** .6;
          const u = uR + fl * f * body, off = (H0 * 1.4 + T) * (1 - f * .85) + .0006; surf(u, th, side, off, Pt); idx.push(b.v(Pt, f, j / NRf, 1, sideSgn[side], 1, f, 4, 0, u, Math.sin(th))); } }
      for (let i = 0; i < 3; i++) for (let j = 0; j < NRf; j++) { const a = idx[i * (NRf + 1) + j]; b.quad(a, a + 1, a + NRf + 1, a + NRf + 2); }
      parts['flap' + side] = addMesh(b, 'opercularFlap_' + (side > 0 ? 'R' : 'L')); }

    /* branchiostegal membrane: 5-8 rays fanning from the interopercle tip, behind the cover's lower edge */
    { const b = new GB(), MS = 6, MR = 16, Pt = V3(0, 0, 0), idx = [];
      for (let i = 0; i <= MS; i++) for (let j = 0; j <= MR; j++) { const f = i / MS, a = j / MR, th = lerp(-1.52, -1.10, a), [, uR] = bounds(th, .85), u = lerp(uTip + h * .02, uR + h * .02, f);
        surf(u, th, side, .0012 + .006 * Math.sin(Math.PI * Math.pow(f, .9)) * sstep(0, .22, a) * sstep(0, .2, 1 - a), Pt); idx.push(b.v(Pt, f, a, .8 * f, sideSgn[side], 1, f * f, 5, 0, u, Math.sin(th))); }
      for (let i = 0; i < MS; i++) for (let j = 0; j < MR; j++) { const a = idx[i * (MR + 1) + j]; b.quad(a, a + 1, a + MR + 1, a + MR + 2); }
      parts['branchio' + side] = addMesh(b, 'branchiostegal_' + (side > 0 ? 'R' : 'L')); }
  }

  /* ───────── R3 WP4: raised bony orbit rim ─────────
     A closed tube (2-10 % of the eye radius, own sub-seed 'eye/orbit') around each eye, seated ON the head surface: every ring point is projected along the
     eye axis onto the analytic head surface by bisection (headDepthAt), so there is no gap and no floating ring; its inner edge overlaps the eye socket. */
  /* deferred: the engine builds the eyes AFTER the head system, so fishgen calls api.buildOrbit() once bm.eyes exists */
  const buildOrbit = () => {
   if (g.head.eyeSide !== 'none' && bm.eyes && bm.eyes.length) {
    const rngE = new R((H.seeds.eye || H.seeds.head) + '/orbit'), rimK = rngE.range(.02, .10), b = new GB(), NJ = detail > .6 ? 72 : 36, NSd = 8, Pt = V3(0, 0, 0);
    for (const e of bm.eyes) { if (e.vestigial) continue;
      const a = e.axis.clone().normalize(), c = e.center, Re = e.R, e1 = new THREE.Vector3().crossVectors(a, Math.abs(a.y) < .9 ? V3(0, 1, 0) : V3(1, 0, 0)).normalize(), e2 = new THREE.Vector3().crossVectors(a, e1).normalize();
      const tr = Math.max(Re * rimK, Re * .045), ring = [], pe = clamp(e.protrusion == null ? .2 : e.protrusion, .08, .33);
      for (let j = 0; j < NJ; j++) { const ph = j / NJ * Math.PI * 2, d = e1.clone().multiplyScalar(Math.cos(ph)).addScaledVector(e2, Math.sin(ph)), p0 = c.clone().addScaledVector(d, Re * Math.sqrt(4 * pe * (1 - 2 * pe)) + tr * .5);   /* ring hugs the line where the eyeball emerges from the head (sphere-cap radius from the eye's protrusion) */
        let lo = -Re * 1.6, hi = Re * 1.6; for (let k = 0; k < 16; k++) { const m = (lo + hi) / 2; if (headDepthAt(bm, p0.clone().addScaledVector(a, m), clamp) > 1e-7) lo = m; else hi = m; }
        ring.push({ p: p0.clone().addScaledVector(a, lo + tr * .15), d }); }
      const ids = [];
      for (let j = 0; j < NJ; j++) for (let k = 0; k < NSd; k++) { const al = k / NSd * Math.PI * 2; Pt.copy(ring[j].p).addScaledVector(ring[j].d, Math.cos(al) * tr).addScaledVector(a, Math.sin(al) * tr * .8); ids.push(b.v(Pt, j / NJ, k / NSd, 0, 1, 0, 0, 16, .5, 0, 0)); }
      for (let j = 0; j < NJ; j++) for (let k = 0; k < NSd; k++) { const j2 = (j + 1) % NJ, k2 = (k + 1) % NSd; b.quad(ids[j * NSd + k], ids[j2 * NSd + k], ids[j * NSd + k2], ids[j2 * NSd + k2]); }
    }
    if (b.n) { parts.orbitRim = addMesh(b, 'orbitRim'); return { mesh: parts.orbitRim, tris: b.i.length / 3 }; }
   }
   return null;
  };

  /* ───────── spines & tassels (curved cones; cream tips) ───────── */
  const addSpine = (b, base, dir, len, rad, curve, kind, opw, side, tipW, nSides = 6, upVec) => {
    const NRg = 5, up = (upVec || V3(0, 1, 0)).clone(); let e1 = new THREE.Vector3().crossVectors(dir, up); if (e1.lengthSq() < 1e-6) e1.set(1, 0, 0); e1.normalize(); const e2 = new THREE.Vector3().crossVectors(dir, e1).normalize();
    const bend = e2.clone().multiplyScalar(curve), ids = [], Pt = V3(0, 0, 0), r0 = rng.next();
    for (let k = 0; k <= NRg; k++) { const t = k / NRg, c = base.clone().addScaledVector(dir, len * t).addScaledVector(bend, len * t * t), r = rad * Math.pow(1 - t, .85);
      for (let s = 0; s < nSides; s++) { const a = s / nSides * Math.PI * 2; Pt.copy(c).addScaledVector(e1, Math.cos(a) * r).addScaledVector(e2, Math.sin(a) * r); ids.push(b.v(Pt, t, s / nSides, opw, side, 0, tipW * t, kind, t, r0, 0)); } }
