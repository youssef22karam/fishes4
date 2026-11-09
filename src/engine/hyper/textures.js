/* PER-PART PROCEDURAL TEXTURE BAKER (CPU → DataTexture), cached by parameter hash.
 *
 * Each operculum piece gets its OWN UV island (u = front→rear across the plate, v = top→bottom) and two textures:
 *   mapA = albedo.rgb  + height.a
 *   mapB = normal.xy (encoded) + roughness.b + metalness.a          (AO is derived from the height in the shader)
 * Variants (seeded, palette driven):  chrome  = crinkled foil, radial striae
 *                                     reticulate = engraved diamond / honeycomb relief, gold-silver
 *                                     rust    = bumpy cell skin with mottling and small pale spine bases
 *                                     plain   = fine hammered silver-grey
 * Sizes: HYPER_TEX.size (default 512; the brief's hero size is 2048 — raise it for stills, it only costs bake time). */
import { R } from './genome.js';

export const HYPER_TEX = { size: 512 };
const cache = new Map();

/* value-noise toolkit (non-tiling, deterministic from a per-bake seed) */
function makeNoise(seed) {
  const r = new R(seed), perm = new Uint8Array(512), vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) { perm[i] = i; vals[i] = r.next(); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(r.next() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const h = (x, y) => vals[perm[(perm[x & 255] + y) & 255]];
  const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return h(xi, yi) * (1 - u) * (1 - v) + h(xi + 1, yi) * u * (1 - v) + h(xi, yi + 1) * (1 - u) * v + h(xi + 1, yi + 1) * u * v; };
  const fbm = (x, y, o = 4) => { let s = 0, a = .5; for (let i = 0; i < o; i++) { s += a * vn(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 9.3; a *= .5; } return s; };
  /* voronoi: returns [F1, F2-F1 (edge), cellId] */
  const vor = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y); let f1 = 9, f2 = 9, id = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const cx = xi + i, cy = yi + j, px = cx + h(cx, cy * 3 + 7), py = cy + h(cx * 5 + 3, cy); const d = Math.hypot(px - x, py - y); if (d < f1) { f2 = f1; f1 = d; id = h(cx + 11, cy + 5); } else if (d < f2) f2 = d; } return [f1, f2 - f1, id]; };
  return { vn, fbm, vor };
}
const mix = (a, b, t) => a + (b - a) * t, cl = (x, a, b) => x < a ? a : x > b ? b : x;
const sm = (a, b, x) => { const t = cl((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const lin2srgb = c => c; // palette colours are already sRGB

/** bake one texture set. P = { variant, seed, size, base:[r,g,b], flank, belly, accent, cream, gold, striae, crinkle, cracks, spineBases:boolean } */
export function bakeOperculum(THREE, P) {
  const size = P.size || HYPER_TEX.size, key = JSON.stringify([P.variant, P.seed, size, P.base.map(x => +x.toFixed(2)), P.flank.map(x => +x.toFixed(2)), P.accent.map(x => +x.toFixed(2)), +P.striae.toFixed(0), +P.crinkle.toFixed(2), +P.cracks.toFixed(2)]);
  if (cache.has(key)) { const c = cache.get(key); cache.delete(key); cache.set(key, c); return c; }
  const N = makeNoise(P.seed), W = size, Hh = size, A = new Uint8Array(W * Hh * 4), B = new Uint8Array(W * Hh * 4), ht = new Float32Array(W * Hh);
  const alb = new Float32Array(W * Hh * 3), rgh = new Float32Array(W * Hh), met = new Float32Array(W * Hh);
  const silver = [.72, .75, .78], steel = [.30, .36, .44], gold = P.gold || [.78, .62, .30], v = P.variant;
  const hx = 0.0, hy = 0.22;                                      // hinge point in texture space (front, upper)
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const u = x / W, w = y / Hh, i = y * W + x;
    const wx = N.fbm(u * 3 + 4, w * 3 + 1, 3) - .5, wy = N.fbm(u * 3 + 9, w * 3 + 6, 3) - .5;        // domain warp
    const ang = Math.atan2((w - hy), (u - hx) * .8 + 1e-4), rad = Math.hypot((u - hx) * .8, w - hy);
    let h = 0, c, ro, me;
    // radial bone striations fanning from the hinge point (all variants)
    const stri = (Math.sin(ang * P.striae * .5 + wx * 4) * .5 + .5) * (.3 + .7 * sm(.05, .5, rad));
    if (v === 'chrome' || v === 'plain') {
      const fold = 1 - Math.abs(2 * N.fbm(u * 9 + wx * 3, w * 9 + wy * 3, 4) - 1);              // crinkled foil: ridged fbm
      const fine = N.fbm(u * 38, w * 38, 3);
      h = (Math.pow(fold, 2.2) * .7 * (v === 'chrome' ? P.crinkle : .35) + fine * .2 + stri * .22);
      const top = sm(.0, .55, 1 - w * 1.1 + wx * .4);                                            // dark blue-grey top, brighter lower
      c = mix3(mix3(silver, [.9, .92, .95], sm(.4, 1, h)), mix3(steel, P.base, .35), top * .8);
      c = mix3(c, mix3(silver, P.flank, .25), .15);
      ro = mix(.1, .2, 1 - fold * .5) + (v === 'plain' ? .12 : 0); me = .88;
    } else if (v === 'reticulate') {
      // diamond lattice engraving: two skewed sine families + warped honeycomb edges
      const a = (u * 15 + w * 9 + wx * 2.2) * Math.PI, b = (u * 15 - w * 9 + wy * 2.2) * Math.PI;
      const dia = Math.min(Math.abs(Math.sin(a)), Math.abs(Math.sin(b)));                       // 0 on the engraved lines
      const [, e] = N.vor(u * 11 + wx * 3, w * 11 + wy * 3);
      const lines = 1 - sm(.0, .22, dia * .8 + e * .25);
      h = .55 - lines * .5 + stri * .12 + N.fbm(u * 30, w * 30, 3) * .1;
      const gmix = sm(.3, .7, N.fbm(u * 2.2 + 3, w * 2.2 + 8, 3));
      const gld = mix3(silver, gold, gmix * .85);
      c = mix3(gld, steel, lines * .55 + (1 - sm(.0, .6, 1 - w * .9)) * .1);
      ro = .16 + lines * .25; me = .9 - lines * .3;
    } else {   // rust
      const [f1, e, id] = N.vor(u * 22 + wx * 2, w * 22 + wy * 2);
      const bump = 1 - sm(.0, .7, f1);
      const [g1, , id2] = N.vor(u * 15 + 20 + wy * 2, w * 15 + 10 + wx * 2);                        // large mottle cells
      h = bump * .55 + sm(.0, .12, e) * .25 + stri * .12 + N.fbm(u * 60, w * 60, 2) * .1;
      const mott = N.fbm(u * 5 + 3 + wx * 2, w * 5 + 2, 4), cell = id2 > .62 ? 1 : 0;
      c = mix3(P.flank, P.accent, sm(.38, .62, mott));
      c = mix3(c, P.cream, sm(.62, .8, N.fbm(u * 8 + 7, w * 8 + 3, 3)) * .8 + cell * .0);
      c = mix3(c, P.base, sm(.55, .9, 1 - g1 * 1.1) * .45 * (id > .5 ? 1 : .4));
      c = c.map((q, k) => q * (.8 + .35 * bump) * (.92 + .16 * id));
      ro = .5 - bump * .15; me = .02;
    }
    // cracks (old fish) and rim dirt
    if (P.cracks > .02) { const [, cr] = N.vor(u * 9 + wx * 4 + 40, w * 9 + wy * 4); const crack = (1 - sm(.0, .035, cr)) * P.cracks; h -= crack * .5; c = c.map(q => q * (1 - crack * .55)); }
    ht[i] = h; alb[i * 3] = c[0]; alb[i * 3 + 1] = c[1]; alb[i * 3 + 2] = c[2]; rgh[i] = ro; met[i] = me;
  }
  // normals from the height field + pack
  const sc = (v === 'rust' ? 2.4 : v === 'reticulate' ? 3.2 : 2.8) * W / 512;
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, xl = ht[y * W + Math.max(0, x - 1)], xr = ht[y * W + Math.min(W - 1, x + 1)], yu = ht[Math.max(0, y - 1) * W + x], yd = ht[Math.min(Hh - 1, y + 1) * W + x];
    const dx = (xr - xl) * sc, dy = (yd - yu) * sc, il = 1 / Math.hypot(dx, dy, 1);
    A[i * 4] = cl(alb[i * 3] * 255, 0, 255); A[i * 4 + 1] = cl(alb[i * 3 + 1] * 255, 0, 255); A[i * 4 + 2] = cl(alb[i * 3 + 2] * 255, 0, 255); A[i * 4 + 3] = cl(ht[i] * 255, 0, 255);
    B[i * 4] = (-dx * il * .5 + .5) * 255; B[i * 4 + 1] = (-dy * il * .5 + .5) * 255; B[i * 4 + 2] = cl(rgh[i] * 255, 0, 255); B[i * 4 + 3] = cl(met[i] * 255, 0, 255);
  }
  const mk = (data, srgb) => { const t = new THREE.DataTexture(data, W, Hh, THREE.RGBAFormat); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 16; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 4; t.needsUpdate = true; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  const out = { mapA: mk(A, false), mapB: mk(B, false), variant: v, size };
  cache.set(key, out);
  if (cache.size > 24) { const k0 = cache.keys().next().value; const o = cache.get(k0); o.mapA.dispose(); o.mapB.dispose(); cache.delete(k0); }
  return out;
}
export const textureCacheSize = () => cache.size;
