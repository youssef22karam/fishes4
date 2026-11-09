/* "Procedural" panel for the original IchthyoGen app: Random / seed field / Mutate / Breed / clade bias / gallery.
   Installed by the last engine part with the engine's own helpers (setFish, buildFish, PANELS, ENV, …).
   Slider sync is free: fish are pushed through the engine's setFish(), so the Genome sliders always show the
   current fish, and a slider edit goes through the engine's applyEdit() onto the same genome object. */
import { initProcGen, fromSeed, randomFish, mutateFish, breedFish, batch, STATS } from './procgen.js';
import { CLADES, CLADE_IDS } from './clades.js';

const PS = { fish: null, prev: null, clade: '', batchFish: [], thumbs: new Map(), busy: false, token: 0 };
const fmt = (v, d = 2) => (typeof v === 'number' ? v.toFixed(d) : String(v));

export function installProcUI(ctx) {
  const { FG, PANELS, THREE, ENV } = ctx, $ = ctx.$, esc = ctx.esc;
  initProcGen(FG);

  function show(fish, opts = {}) {
    if (PS.fish && PS.fish.seed !== fish.seed) PS.prev = PS.fish;
    PS.fish = fish;
    const g = JSON.parse(JSON.stringify(fish.genome)); g.meta.edited = false;
    ctx.setFish(g, opts);
  }
  const guard = fn => { try { fn(); } catch (e) { ctx.toast(e.message || String(e)); console.warn(e); } };
  const showSeed = s => guard(() => show(fromSeed(s)));
  FG.proc = { closeSheet: ctx.closeSheet, view: ctx.view, show, showSeed, fromSeed, randomFish, mutateFish, breedFish, batch, STATS, state: PS, bootFish() { guard(() => show(randomFish())); setTimeout(() => ctx.openSheet('proc'), 60); } };

  /* ── thumbnails: own small renderer, same lighting trick as the engine's reference gallery ── */
  let tr = null, tscene = null, tcam = null;
  function thumbOf(fish) {
    if (PS.thumbs.has(fish.seed)) return PS.thumbs.get(fish.seed);
    if (!tr) { const cv = document.createElement('canvas'); cv.width = 260; cv.height = 182; tr = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true }); tr.outputColorSpace = THREE.SRGBColorSpace; tr.toneMapping = THREE.ACESFilmicToneMapping; tscene = new THREE.Scene(); tcam = new THREE.PerspectiveCamera(32, 260 / 182, .01, 100); }
    const g = JSON.parse(JSON.stringify(fish.genome)), f = ctx.buildFish(g, { quality: 'med' }); tscene.add(f.group);
    const sv = { fog: ENV.uFogDensity.value, ld: ENV.uLightDir.value.clone(), lc: ENV.uLightCol.value.clone(), sk: ENV.uSkyCol.value.clone(), gr: ENV.uGroundCol.value.clone() };
    ENV.uFogDensity.value = 0; ENV.uLightDir.value.set(.45, .8, .6).normalize(); ENV.uLightCol.value.setRGB(1.05, 1.03, 1); ENV.uSkyCol.value.setRGB(.62, .66, .72); ENV.uGroundCol.value.setRGB(.22, .21, .22);
    const box = f.info.bounds, c = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).length() * .5, flat = ['ray', 'benthicShark'].includes(f.bm.a.family) || Math.abs(g.body.roll) > 45;
    const dist = r / Math.sin(tcam.fov * Math.PI / 360) * (flat ? 1.3 : 1.0);
    tcam.position.copy(c).add((flat ? new THREE.Vector3(.1, .95, .27) : new THREE.Vector3(.3, .2, 1)).normalize().multiplyScalar(dist)); tcam.near = dist * .01; tcam.far = dist * 10; tcam.lookAt(c); tcam.updateProjectionMatrix();
    tr.setClearColor(0x0b1a26, 1); tr.render(tscene, tcam); const url = tr.domElement.toDataURL('image/jpeg', .86);
    ENV.uFogDensity.value = sv.fog; ENV.uLightDir.value.copy(sv.ld); ENV.uLightCol.value.copy(sv.lc); ENV.uSkyCol.value.copy(sv.sk); ENV.uGroundCol.value.copy(sv.gr);
    tscene.remove(f.group); f.dispose(); PS.thumbs.set(fish.seed, url); return url;
  }
  async function fillGrid(grid, list, token) {
    for (const fish of list) {
      if (token !== PS.token || !grid.isConnected) return;
      const tile = grid.querySelector(`[data-seed="${fish.seed}"] img`); if (!tile) continue;
      try { tile.src = thumbOf(fish); } catch (e) { console.warn('thumb', e); }
      await new Promise(r => setTimeout(r, 0));
    }
  }
  function tileHtml(f) {
    const cur = PS.fish && PS.fish.seed === f.seed ? ' sel' : '';
    return `<div class="thumb${cur}" data-seed="${esc(f.seed)}" title="${esc(f.name.sci)}"><img alt="${esc(f.name.common)}"${PS.thumbs.has(f.seed) ? ` src="${PS.thumbs.get(f.seed)}"` : ''}><div><b>${esc(f.name.common)}</b><br><small><i>${esc(f.name.sci)}</i> · ${esc(CLADES[f.clade].name.split(' (')[0])}</small></div></div>`;
  }
  function newBatch(grid) {
    PS.token++; const token = PS.token;
    guard(() => {
      PS.batchFish = batch(24, PS.clade || undefined);
      grid.innerHTML = PS.batchFish.map(tileHtml).join(''); bindGrid(grid);
      fillGrid(grid, PS.batchFish, token);
    });
  }
  function bindGrid(grid) {
    grid.querySelectorAll('.thumb').forEach(el => {
      el.onclick = ev => {
        const f = PS.batchFish.find(x => x.seed === el.dataset.seed); if (!f) return;
        if (ev.shiftKey) { const p = document.getElementById('pgPartner'); if (p) p.value = f.seed; ctx.toast('Breed partner: ' + f.name.common); return; }
        show(f);
      };
    });
  }

  /* ── the panel ── */
  PANELS.proc = function (body) {
    const f = PS.fish, g = ctx.App.genome, edited = g && g.meta.proc && g.meta.edited, t = f ? f.traits : null;
    const opt = (v, l, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${esc(l)}</option>`;
    const rows = t ? [
      ['Length', `${fmt(t.length, 2)} m · ${t.sizeClass}`], ['Body', `${t.profile} · ${t.cross} · L/D ${fmt(t.fineness, 1)}`], ['Head / eye', `${fmt(t.headLen * 100, 0)}% of body · eye ${fmt(t.eyeSize * 100, 0)}% of head`],
      ['Mouth', `${t.mouth} · ${t.teeth}${t.teeth === 'none' ? '' : ' ×' + t.teethCount}${g && g.head.barbels ? (g.head.barbels === 1 ? ' · median chin barbel' : ' · ' + g.head.barbels + ' paired barbels') : ''}${t.special !== 'none' ? ' · ' + t.special : ''}`],
      ['Fins', `dorsal ×${t.dN} (${t.dShape}) · anal ${t.anal ? t.aShape : '—'} · pelvic ${t.pelvic ? t.pelPos : '—'} · caudal ${t.caudal ? t.cType : '—'}`],
      ['Skin', `${t.scale} · ${t.pattern}${t.pattern === 'none' ? '' : ' (scale ' + fmt(t.patScale, 1) + ', density ' + fmt(t.patDens, 2) + ')'} · ${t.palette}${t.photophores ? ' · ' + t.photophores + ' photophores' : ''}`],
    ].map(([k, v]) => `<tr><td class="mut">${k}</td><td>${esc(v)}</td></tr>`).join('') : '';
    body.innerHTML = `
      <div class="pg-card"><div class="pg-name">${f ? esc(f.name.common) : '—'}</div><div class="pg-sci">${f ? esc(f.name.sci) : ''}</div>
        <div class="pg-tags">${f ? `<span class="chip">${esc(CLADES[f.clade].name)}</span> <span class="chip">${esc(f.lineage)}</span> <span class="chip">gate ${Object.values(f.report.passed).filter(Boolean).length}/8 invariants</span>${edited ? ' <span class="chip on">edited with sliders</span>' : ''}` : ''}</div></div>
      <div class="row"><label>Bias to clade</label><select id="pgClade">${opt('', 'All clades (weighted like nature)', !PS.clade)}${CLADE_IDS.map(id => opt(id, CLADES[id].name, PS.clade === id)).join('')}</select></div>
      <div class="row"><button class="primary" id="pgRandom">Random</button><button id="pgMutate">Mutate</button><button id="pgBreed">Breed</button><button id="pgNew24">New gallery ×24</button></div>
      <div class="row"><label>Seed</label><input id="pgSeed" type="text" spellcheck="false" autocomplete="off" value="${f ? esc(f.seed) : ''}" placeholder="e.g. K7M2QX9D"><button id="pgLoad">Load</button><button id="pgCopy" title="Copy a link to this exact fish">Link</button></div>
      <div class="row"><label>Breed partner</label><input id="pgPartner" type="text" spellcheck="false" autocomplete="off" value="${PS.prev ? esc(PS.prev.seed) : ''}" placeholder="seed (defaults to previous fish)"></div>
      <div class="pg-hint">Seed = the whole fish. Mutate = bounded step · Breed = crossover clamped into a valid clade · Shift-click a gallery fish to set it as partner.</div>
      <div class="grp">Gallery</div><div class="thumbs" id="pgGrid">${PS.batchFish.map(tileHtml).join('')}</div>
      ${t ? `<div class="grp">Traits of the current fish</div><table>${rows}</table><small>Open <b>Genome</b> to see every slider follow this fish; moving a slider edits it.</small>` : ''}`;
    const q = id => body.querySelector('#' + id), grid = q('pgGrid');
    q('pgClade').onchange = e => { PS.clade = e.target.value; guard(() => show(randomFish(PS.clade || undefined))); newBatch(body.querySelector('#pgGrid')); };
    q('pgRandom').onclick = () => guard(() => show(randomFish(PS.clade || undefined)));
    q('pgMutate').onclick = () => guard(() => show(mutateFish(PS.fish)));
    q('pgBreed').onclick = () => guard(() => {
      let partner = null; const v = q('pgPartner').value.trim();
      if (v) { try { partner = fromSeed(v); } catch (e) { ctx.toast('Partner seed is not valid'); return; } }
      partner = partner || PS.prev || randomFish();
      if (partner.seed === PS.fish.seed) partner = randomFish();
      show(breedFish(PS.fish, partner));
    });
    const load = () => { const v = q('pgSeed').value.trim(); if (v) showSeed(v); };
    q('pgLoad').onclick = load; q('pgSeed').addEventListener('keydown', e => { if (e.key === 'Enter') load(); });
    q('pgCopy').onclick = async () => { const url = location.origin + location.pathname + '#p=' + encodeURIComponent(PS.fish.seed); try { await navigator.clipboard.writeText(url); ctx.toast('Link copied — opens this exact fish'); } catch (e) { prompt('Copy this link', url); } };
    q('pgNew24').onclick = () => newBatch(grid);
    bindGrid(grid);
    if (!PS.batchFish.length) newBatch(grid); else { PS.token++; fillGrid(grid, PS.batchFish, PS.token); }
  };
}
