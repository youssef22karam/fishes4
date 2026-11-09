        }, 130);
      };
      axes.appendChild(row);
    }
    body.querySelector('#godToggle').onclick = () => { GOD.enabled = !GOD.enabled; App.genome.meta.godMode = GOD.enabled; App.genome.meta.edited = true; updateHash(); renderPanel('god'); toast(GOD.enabled ? 'God Mode enabled. Biological constraints remain active.' : 'Species-range editing restored.'); };
    body.querySelector('#godStrength').oninput = e => { GOD.strength = +e.target.value; body.querySelector('#godStrengthOut').textContent = Math.round(GOD.strength * 100) + '%'; };
    body.querySelector('#godMutate').onclick = doMutate;
    body.querySelector('#godUndo').onclick = undoFish;
    body.querySelector('#godReset').onclick = () => { const base = deepClone(GOD.baseline); GOD.axes = {}; setFish(base, { keepCamera: true }); };
    body.querySelector('#godGenome').onclick = () => openSheet('inspect');
    body.querySelector('#godCheck').onclick = () => { const result = checkFishGeometry(App.fish); body.querySelector('#godStatus').textContent = result.errors.length ? result.errors.join('; ') : 'Validated: finite geometry, correct root attachment, bilateral body and triangle budget.'; };
    body.querySelector('#godEvolve').onclick = () => { const id = body.querySelector('#godLineage').value; const evolved = generate({ clade: id, habitat: g.meta.habitat, seed: g.meta.seed + ':lineage:' + id, noSpecies: true }); evolved.meta.godMode = GOD.enabled; evolved.meta.edited = true; setFish(evolved); };
    body.querySelector('#godPause').onclick = e => { App.paused = !App.paused; e.target.textContent = App.paused ? 'Resume' : 'Pause'; };
    body.querySelectorAll('[data-view]').forEach(btn => btn.onclick = () => setCameraView(btn.dataset.view));
  },
  inspect(body) {
    const g = App.genome; if (!g) { body.textContent = 'No fish yet.'; return; } inspectorState.genome = g; inspectorState.inputs.clear(); const map = resolveTraitMap(g.meta);
    const head = document.createElement('div'); head.innerHTML = `<div><b>${esc(g.meta.name)}</b> <small>${esc(g.meta.sci)}</small></div><div class="row"><button class="sm" id="insReset">Regenerate from seed</button><button class="sm" id="insRandomSeed">New seed, same clade/niche</button>${g.skin.inflate ? '<button class="sm" id="insInflate">Inflate / deflate</button>' : ''}</div><small>${GOD.enabled ? 'Extended God Mode ranges.' : 'Clade, species and niche variation ranges.'} Disabled controls are anatomical foundations. Changes are repaired immediately; edited references become authored variants, not new claims about a real species.</small>`; body.appendChild(head);
    head.querySelector('#insReset').onclick = () => doGenerate({ seed: g.meta.seed, habitat: g.meta.habitat, niche: g.meta.niche, clade: g.meta.clade, species: g.meta.species || undefined });
    head.querySelector('#insRandomSeed').onclick = () => doGenerate({ habitat: g.meta.habitat, niche: g.meta.niche, clade: g.meta.clade, species: g.meta.species || undefined });
    const inf = head.querySelector('#insInflate'); if (inf) inf.onclick = () => { App.inflateTarget = App.inflateTarget > 0.5 ? 0 : 1; };
    const evolution = document.createElement('div'); evolution.innerHTML = evolutionReport(g); body.appendChild(evolution);
    let grp = null; for (const p in SCHEMA) { const e = SCHEMA[p]; if (e.g !== grp) { grp = e.g; const h = document.createElement('div'); h.className = 'grp'; h.textContent = grp; body.appendChild(h); }
      const row = document.createElement('div'); row.className = 'row'; const lab = document.createElement('label'); const spec = map[p]; lab.textContent = p.replace(/^(body|head|mouth|fins|swim|skin)\./, '').replace(/\./g, ' › ') + (spec && (spec.r || spec.c) ? ' •' : ''); row.appendChild(lab);
      let input, val;
      if (e.t === 'n' || e.t === 'i') { input = document.createElement('input'); input.type = 'range'; const lim = traitBounds(g, p, GOD.enabled, map); input.min = lim.min; input.max = lim.max; input.disabled = lim.locked; input.step = e.t === 'i' ? 1 : Math.max(.0001, (lim.max - lim.min) / 200); input.value = getP(g, p); val = document.createElement('span'); val.className = 'val'; val.textContent = fmt(getP(g, p)); input.oninput = () => { val.textContent = fmt(+input.value); applyEdit(p, e.t === 'i' ? Math.round(+input.value) : +input.value); }; }
      else if (e.t === 's') { input = document.createElement('select'); input.innerHTML = e.opts.map(o => `<option${o === getP(g, p) ? ' selected' : ''}>${o}</option>`).join(''); input.onchange = () => applyEdit(p, input.value); }
      else if (e.t === 'b') { input = document.createElement('input'); input.type = 'checkbox'; input.checked = !!getP(g, p); input.onchange = () => applyEdit(p, input.checked); }
      else { input = document.createElement('input'); input.type = 'color'; const v = getP(g, p); input.value = hslToHex(v[0], v[1], v[2]); input.oninput = () => applyEdit(p, hexToHsl(input.value)); }
      if (anatomyProfile(g).locks[p] !== undefined) { input.disabled = true; input.title = 'Protected anatomical foundation'; }
      row.appendChild(input); if (val) row.appendChild(val); body.appendChild(row); inspectorState.inputs.set(p, { input, val, e }); }
  },
  tree(body) {
    const g = App.genome; const cur = g ? g.meta.clade : 'fish'; const anc = new Set(cladePath(cur).map(n => n.id)); const nodes = {}; let leafY = 0; const rowH = 18, colW = 118;
    const layout = (id, depth) => { const kids = Object.values(CLADES).filter(k => k.p === id); const node = { id, depth, kids: [] }; if (!kids.length) { node.y = leafY++ * rowH + 14; } else { for (const k of kids) node.kids.push(layout(k.id, depth + 1)); node.y = (node.kids[0].y + node.kids[node.kids.length - 1].y) / 2; } nodes[id] = node; return node; };
    const root = layout('fish', 0); let maxD = 0; for (const id in nodes) maxD = Math.max(maxD, nodes[id].depth); const W = (maxD + 1) * colW + 160, Hh = leafY * rowH + 30; let svg = `<svg class="tree" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}">`;
    const draw = n => { const x = 16 + n.depth * colW; for (const k of n.kids) { const kx = 16 + k.depth * colW; svg += `<line x1="${x + 6}" y1="${n.y}" x2="${kx - 4}" y2="${k.y}"/>`; draw(k); } const cls = n.id === cur ? 'cur' : anc.has(n.id) ? 'anc' : ''; svg += `<g class="${cls}" data-clade="${n.id}"><circle cx="${x}" cy="${n.y}" r="4"/><text x="${x + 9}" y="${n.y + 4}">${esc(CLADES[n.id].n)}</text></g>`; };
    draw(root); svg += '</svg>'; body.innerHTML = `<small>Ancestry of the current fish is highlighted. Tap any node to generate a fish from that clade in the current habitat.</small><div style="overflow:auto">${svg}</div>`;
    body.querySelectorAll('g[data-clade]').forEach(el => el.addEventListener('click', () => { const id = el.dataset.clade; const hab = App.genome ? App.genome.meta.habitat : $('selHabitat').value; const desc = new Set([id]); const stack = [id]; while (stack.length) { const c2 = stack.pop(); for (const k of Object.values(CLADES)) if (k.p === c2 && !desc.has(k.id)) { desc.add(k.id); stack.push(k.id); } } const niches = Object.values(NICHES).filter(ni => Object.keys(ni.clades).some(c2 => desc.has(c2) || anc.has(c2) && c2 !== 'fish')); const hw = HABITATS[hab].niches; let niche = niches.find(ni => hw[ni.id]) || niches[0]; $('selClade').value = id; $('selNiche').value = niche ? niche.id : ''; $('selSpecies').value = ''; doGenerate({ habitat: hab, clade: id, niche: niche ? niche.id : undefined, seed: Math.floor(Math.random() * 1e9).toString(36) }); }));
  },
  gallery(body) {
    const sel = document.createElement('select'); sel.innerHTML = '<option value="">All habitats</option>' + Object.values(HABITATS).filter(h => SPECIES.some(s => s.habitat === h.id)).map(h => `<option value="${h.id}">${esc(h.n)}</option>`).join(''); const grid = document.createElement('div'); grid.className = 'thumbs';
    const fill = () => { grid.innerHTML = ''; thumbQueue.length = 0; for (const sp of SPECIES.filter(s => !sel.value || s.habitat === sel.value)) { const d = document.createElement('div'); d.className = 'thumb'; const img = document.createElement('img'); img.alt = sp.n; d.appendChild(img); const cap = document.createElement('div'); cap.innerHTML = `<b>${esc(sp.n)}</b><br><small>${esc(sp.sci)} · ${esc(HABITATS[sp.habitat].n)}</small>`; d.appendChild(cap); d.onclick = () => { $('selSpecies').value = sp.id; $('selHabitat').value = sp.habitat; doGenerate({ species: sp.id, habitat: sp.habitat, seed: 'ref' }); }; grid.appendChild(d); requestThumb(sp.id, img); } };
    sel.onchange = fill; body.appendChild(sel); body.appendChild(document.createElement('br')); body.appendChild(grid); fill();
  },
  text(body) {
    body.innerHTML = `<small>Describe a fish. The offline parser maps keywords to habitat, niche, clade, species cards, colours, pattern, size, shape and features; everything goes through schema validation and the rules engine.</small><textarea id="txtPrompt" placeholder="e.g. a slender silver reef barracuda with dark bars, or: glowing deep sea angler with huge fangs"></textarea><div class="row"><button class="primary" id="txtGo">Parse offline → generate</button><button id="txtLLM">Ask LLM endpoint</button></div><div class="grp">Optional LLM endpoint (POST JSON, returns JSON)</div><div class="row"><label>Endpoint URL</label><input type="url" id="llmUrl" placeholder="https://…" value="${esc(FG.llm.endpoint)}"></div><div class="row"><label>Bearer key</label><input type="password" id="llmKey" value="${esc(FG.llm.key)}"></div><div class="row"><label>Model</label><input type="text" id="llmModel" value="${esc(FG.llm.model)}"></div><small>Request body: {prompt, instruction, ids, schema}. Expected response: {"meta":{habitat,niche,clade},"overrides":{"schema.path":value}} or a full genome. Nothing from the model bypasses validation.</small><div id="txtOut" style="margin-top:8px"></div>`;
    const save = () => { FG.llm.endpoint = body.querySelector('#llmUrl').value.trim(); FG.llm.key = body.querySelector('#llmKey').value; FG.llm.model = body.querySelector('#llmModel').value.trim(); safeStore.set('fg_llm_endpoint', FG.llm.endpoint); safeStore.set('fg_llm_key', FG.llm.key); safeStore.set('fg_llm_model', FG.llm.model); };
    body.querySelector('#txtGo').onclick = () => { const p = body.querySelector('#txtPrompt').value; if (!p.trim()) return; try { const g = genomeFromText(p, 'txt:' + Math.floor(Math.random() * 1e6).toString(36)); syncSelects(g); setFish(g); body.querySelector('#txtOut').textContent = HABITATS[g.meta.habitat].n + ' / ' + NICHES[g.meta.niche].n + ' / ' + CLADES[g.meta.clade].n + ' / ' + g.meta.repairs.length + ' repairs'; } catch (e) { showError(e); } };
    body.querySelector('#txtLLM').onclick = async () => { save(); const p = body.querySelector('#txtPrompt').value; const out = body.querySelector('#txtOut'); out.textContent = 'Asking endpoint…'; try { const g = await genomeFromLLM(p); syncSelects(g); setFish(g); out.innerHTML = `<small>LLM genome accepted after ${g.meta.repairs.length} validation/repair steps.</small>`; } catch (e) { out.innerHTML = `<span class="bad">${esc(e.message)}</span>`; } };
    for (const id of ['llmUrl', 'llmKey', 'llmModel']) body.querySelector('#' + id).onchange = save;
  },
  export(body) {
    body.innerHTML = `<div class="row"><button id="expJson">JSON Genome</button><button id="expGlb">GLB Model</button><button id="expPng">PNG Image</button><button id="expShare" class="primary">Copy Share Link</button></div><div class="row"><label>Import genome JSON</label><input type="file" id="impJson" accept="application/json"></div><small>JSON preserves all anatomical traits and the seed. GLB exports the neutral-pose anatomy with approximate vertex-baked patterns; micro-scales and shader animation stay in the app. Share links include the full validated genome, including authored changes.</small><pre id="expPreview" style="font-size:11px;max-height:30vh;overflow:auto;white-space:pre-wrap"></pre>`;
    const g = App.genome; if (!g) return; const name = g.meta.name.replace(/[^a-z0-9]+/gi, '_');
    body.querySelector('#expPreview').textContent = JSON.stringify(stripGenome(g), null, 1).slice(0, 4000) + '\n…';
    body.querySelector('#expJson').onclick = () => download(new Blob([JSON.stringify(stripGenome(g), null, 2)], { type: 'application/json' }), name + '.json');
    body.querySelector('#expPng').onclick = () => { renderer.render(scene, camera); const url = renderer.domElement.toDataURL('image/png'); const a = document.createElement('a'); a.href = url; a.download = name + '.png'; a.click(); };
    body.querySelector('#expShare').onclick = async () => { updateHash(); const url = location.href; try { await navigator.clipboard.writeText(url); toast('Share link copied'); } catch (e) { prompt('Copy this link', url); } };
    body.querySelector('#expGlb').onclick = () => exportGLB(name);
    body.querySelector('#impJson').onchange = ev => { const file = ev.target.files[0]; if (!file) return; const rd = new FileReader(); rd.onload = () => { try { const { genome, issues } = validateGenome(JSON.parse(rd.result)); genome.meta.repairs = issues.map(i => ({ rule: 'schema_validate', path: '-', from: '-', to: i })); genome.meta.edited = true; finalize(genome); syncSelects(genome); setFish(genome); toast(`Imported (${issues.length} schema fixes, ${genome.meta.repairs.length} total repairs)`); } catch (e) { toast('Import failed: ' + e.message); } }; rd.readAsText(file); };
  },
  debug(body) {
    const g = App.genome, f = App.fish; if (!g || !f) { body.textContent = 'No fish.'; return; } const d = App.debug;
    const m = g.meta.metrics || metrics(g); const fa = m.finAreaFractions; const viol = violations(g);
    body.innerHTML = `<div class="row"><label><input type="checkbox" id="dbgWire"${d.wire ? ' checked' : ''}> wireframe</label><label><input type="checkbox" id="dbgSkel"${d.skeleton ? ' checked' : ''}> skeleton / fin rays</label><label><input type="checkbox" id="dbgLm"${d.landmarks ? ' checked' : ''}> landmarks</label></div>
      <div class="grp">Metrics</div><table><tr><td>Fineness ratio</td><td>${m.fineness}</td></tr><tr><td>Caudal aspect ratio (genome / measured)</td><td>${m.caudalAR} / ${f.info.caudalAR}</td></tr><tr><td>Relative gape (gape / L)</td><td>${m.relGape} (${m.gapeOfHead} of head depth)</td></tr><tr><td>Fin area ÷ lateral body area</td><td>dorsal ${fa.dorsal} · anal ${fa.anal} · pectoral ${fa.pectoral} · pelvic ${fa.pelvic} · caudal ${fa.caudal}</td></tr><tr><td>Triangles</td><td>${f.info.tris.toLocaleString()} (budget 40,000)</td></tr><tr><td>Size class</td><td>${g.meta.sizeClass} · ${g.body.length.toFixed(3)} m</td></tr><tr><td>Tags</td><td>${esc((g.meta.tags || []).join(', '))}</td></tr></table>
      <div class="grp">Landmarks (u)</div><table>${Object.entries(g.meta.landmarks || landmarks(g)).map(([k, v]) => `<tr><td>${k}</td><td>${(+v).toFixed(3)}</td></tr>`).join('')}</table>
      <div class="grp">Rule repairs applied (${g.meta.repairs.length}) · outstanding violations: <span class="${viol.length ? 'bad' : 'ok'}">${viol.length}</span></div><table><tr><th>rule</th><th>path</th><th>from</th><th>to</th></tr>${g.meta.repairs.slice(0, 120).map(r => `<tr><td>${esc(r.rule)}</td><td>${esc(r.path)}</td><td>${esc(JSON.stringify(r.from))}</td><td>${esc(JSON.stringify(r.to))}</td></tr>`).join('') || '<tr><td colspan="4">none — sampled genome satisfied every rule</td></tr>'}</table>
      <div class="grp">Rules table (${RULES.length})</div><table>${RULES.map(r => `<tr><td><code>${r.id}</code></td><td>${esc(r.desc)}</td></tr>`).join('')}</table>`;
    body.querySelector('#dbgWire').onchange = e => { d.wire = e.target.checked; updateDebugHelpers(); }; body.querySelector('#dbgSkel').onchange = e => { d.skeleton = e.target.checked; updateDebugHelpers(); }; body.querySelector('#dbgLm').onchange = e => { d.landmarks = e.target.checked; updateDebugHelpers(); };
  },
  tests(body) {
    body.innerHTML = `<p class="god-copy">Quick checks cover goldfish in the hadal habitat, visible bounded mutation steps, replay/import, missing fin curves and removal of cone horns. Full tests also cover every reference species and 200 genomes per habitat.</p><div class="row"><button id="focusedTests" class="primary">Quick Regression Check</button></div><div class="row"><label><input type="checkbox" id="testExhaustive"> Exhaustive geometry (slower)</label></div><div class="row"><button id="runTests">Full Anatomy Tests</button><button id="cancelTests" class="sm">Cancel</button><span id="testProg" class="mut"></span></div><div id="testOut"></div>`;
    body.querySelector('#focusedTests').onclick = e => {
      if (TEST_STATE.running) return; e.target.disabled = true;
      const output = body.querySelector('#testOut');
      setTimeout(() => { try { const rows = runFocusedTests(); output.innerHTML = `<table><tr><th>Check</th><th>Result</th></tr>${rows.map(row => `<tr><td>${esc(row.name)}</td><td class="${row.pass ? 'ok' : 'bad'}">${row.pass ? 'PASS' : esc(row.error)}</td></tr>`).join('')}</table>`; } finally { e.target.disabled = false; } }, 0);
    };
    body.querySelector('#runTests').onclick = async e => { e.target.disabled = true; try { await runSelfTest(body.querySelector('#testOut'), body.querySelector('#testProg'), body.querySelector('#testExhaustive').checked); } finally { e.target.disabled = false; } };
    body.querySelector('#cancelTests').onclick = () => { TEST_STATE.cancel = true; };
  },
  help(body) {
    body.innerHTML = `<h2 class="god-title">Form follows function.</h2><p class="god-copy">The engine inherits a body plan, samples correlated traits, repairs anatomy, then builds the fish. Bills and ray discs share the body loft. Detached cone horns are removed; brow and forehead contours stay part of the skin.</p>
      <div class="grp">Species and habitats</div><p class="god-copy">Species and habitat selections can be combined. Incompatible combinations such as goldfish in a hadal trench create a labelled speculative concept, not a real population or a claim of survival. Anatomy is validated; pressure tolerance, respiration and fluid dynamics are not simulated.</p>
      <div class="grp">Stepwise evolution</div><p class="god-copy">Use the mutation selector to target body depth, fin silhouette, fin growth, tail propulsion, or the head. Each click changes a functional unit by a bounded step, measures its post-repair proportions, and advances the counter. Adjacent fin shapes can change every third step. Limits stay anchored to the founding genome, so repeated clicks cannot grow the envelope indefinitely. Mutation strength is in God Mode; Undo restores the previous genome. Genome shows the exact trait changes. Skin-pattern seeds stay stable across the lineage.</p>
      <div class="grp">Add data in index.html</div><table><tr><td>Clade</td><td>Add a K entry with its parent and changed traits. Add an ANATOMY delta only for a different construction foundation, and ECOLOGY_LIMITS for salinity/depth restrictions.</td></tr><tr><td>Niche</td><td>Add an NI entry: weighted compatible clades, function-to-form references and ranges. Add a linked ADAPTATIONS module if it introduces a new selective pressure.</td></tr><tr><td>Habitat</td><td>Add an H entry: weighted niches, natural palette, light, water, fog and procedural props. Fantasy habitats must be flagged.</td></tr><tr><td>Species</td><td>Add one SP entry with common/scientific names, clade, niche, native habitat and approximate trait ranges. It automatically appears in the gallery and pickers.</td></tr></table>
      <div class="grp">Verification</div><p class="god-copy">Tests checks 200 seeded genomes and mutations per habitat, all reference-species geometries, deterministic generation, crossover, bilateral symmetry, loft-projected attachment tolerance and triangle budgets. Enable exhaustive geometry to build both detail levels for every generated fish. Results are computed on your device, never pre-filled.</p>
      <div class="grp">Known limitations</div><p class="god-copy">These are procedural approximations, not scan-derived, photographically verified fish. Eye rims conform to the skin; fin rays and micro-scales are procedural shading, not individual skeletal or scale meshes. Surface joins are not fully watertight and some complex clades remain stylized. GLB preserves geometry and approximate vertex pigmentation, not the custom shaders. Photographic indistinguishability is not guaranteed; visual quality and frame rate depend on the device.</p>
      <div class="grp">Anatomical reference</div><p class="god-copy"><a href="https://www.pc.maricopa.edu/Biology/ppepe/BIO145/lab04_1.html" target="_blank" rel="noopener noreferrer" style="color:var(--acc)">External shark anatomy, Phoenix College</a>: fin hierarchy, gill positions, ventral nares and heterocercal tails. Species ratios in the app are approximate authored envelopes.</p>`;
  }
};
const fmt = v => Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(3);
let editTimer = 0; function applyEdit(path, value) { const g = App.genome; if (!g) return; setP(g, path, value); g.meta.godMode = GOD.enabled; g.meta.parentSpecies = g.meta.species || g.meta.parentSpecies; g.meta.species = null; g.meta.edited = true; clearTimeout(editTimer); editTimer = setTimeout(() => { try { g.meta.repairs = []; finalize(g); setFish(g, { noHistory: true, keepCamera: true }); } catch (e) { showError(e); } }, 140); }
function syncInspector() { const g = App.genome; for (const [p, { input, val, e }] of inspectorState.inputs) { const v = getP(g, p); if (document.activeElement === input) continue; if (e.t === 'n' || e.t === 'i') { input.value = v; if (val) val.textContent = fmt(v); } else if (e.t === 's') input.value = v; else if (e.t === 'b') input.checked = !!v; else input.value = hslToHex(v[0], v[1], v[2]); } }
/* ── thumbnails (gallery) ── */
const thumbQueue = []; let thumbBusy = false, thumbR = null, thumbScene = null, thumbCam = null;
function requestThumb(id, img) { thumbQueue.push({ id, img }); pumpThumbs(); }
// @@PART js/app.part15.js (15/19) lines 2938-3227 of the original module script -- stripped by build.mjs
async function pumpThumbs() {
  if (thumbBusy) return; thumbBusy = true;
  try { if (!thumbR) { const cv = document.createElement('canvas'); cv.width = 260; cv.height = 182; thumbR = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true }); thumbR.outputColorSpace = THREE.SRGBColorSpace; thumbR.toneMapping = THREE.ACESFilmicToneMapping; thumbScene = new THREE.Scene(); thumbCam = new THREE.PerspectiveCamera(32, 260 / 182, 0.01, 100); }
    while (thumbQueue.length) { const { id, img } = thumbQueue.shift(); if (!img.isConnected) continue; let fish = null;
      try { const g = generate({ species: id, seed: 'gallery' }); fish = buildFish(g, { quality: 'med' }); thumbScene.add(fish.group); const saved = { fog: ENV.uFogDensity.value, ld: ENV.uLightDir.value.clone(), lc: ENV.uLightCol.value.clone(), sk: ENV.uSkyCol.value.clone(), gr: ENV.uGroundCol.value.clone() };
        ENV.uFogDensity.value = 0; ENV.uLightDir.value.set(0.45, 0.8, 0.6).normalize(); ENV.uLightCol.value.setRGB(1.05, 1.03, 1); ENV.uSkyCol.value.setRGB(0.62, 0.66, 0.72); ENV.uGroundCol.value.setRGB(0.22, 0.21, 0.22);
        const box = fish.info.bounds, c2 = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).length() * 0.5;
        const ray = ['ray', 'benthicShark'].includes(fish.bm.a.family), dist = r / Math.sin(thumbCam.fov * Math.PI / 360) * (ray ? 1.35 : 1.02);
        thumbCam.position.copy(c2).add((ray ? new THREE.Vector3(.1, .95, .27) : new THREE.Vector3(.3, .2, 1)).normalize().multiplyScalar(dist)); thumbCam.near = dist * 0.01; thumbCam.far = dist * 10; thumbCam.lookAt(c2); thumbCam.updateProjectionMatrix();
        thumbR.setClearColor(0x0b1a26, 1); thumbR.render(thumbScene, thumbCam); img.src = thumbR.domElement.toDataURL('image/jpeg', 0.85);
        ENV.uFogDensity.value = saved.fog; ENV.uLightDir.value.copy(saved.ld); ENV.uLightCol.value.copy(saved.lc); ENV.uSkyCol.value.copy(saved.sk); ENV.uGroundCol.value.copy(saved.gr); }
      catch (e) { console.warn('thumb failed', id, e); }
      finally { if (fish) { thumbScene.remove(fish.group); fish.dispose(); } }
      await new Promise(r => setTimeout(r, 0)); } }
  finally { thumbBusy = false; }
}
/* ── GLB export (bakes standard materials) ── */
function pigmentAt(g, u, ang, out) {
  const s = g.skin, raw = g.body.roll ? Math.sin(ang * TAU) : -Math.cos(ang * TAU);
  const vert = anatomyProfile(g).family === 'ray' ? clamp(raw * 5, -1, 1) : raw;
  out.copy(hslCol(s.base)).lerp(hslCol(s.belly), s.countershade * (1 - sstep(-.38, .48, vert)));
  const fract = x => x - Math.floor(x), freq = s.patternScale, seed = cyrb128(g.meta.surfaceSeed || g.meta.seed)[0] % 1000;
  let mask = 0;
  if (s.pattern === 'bars') mask = sstep(.27, .38, Math.abs(fract(u * g.body.fineness * 1.1 * freq) - .5));
  else if (s.pattern === 'stripes') mask = sstep(.3, .4, Math.abs(fract(vert * 1.6 * freq) - .5));
  else if (s.pattern === 'spots') { const x = u * g.body.fineness * 3.5 * freq, y = vert * 3.2 * freq, h = fract(Math.sin(Math.floor(x) * 127.1 + Math.floor(y) * 311.7 + seed) * 43758.5453); mask = (1 - sstep(.13, .24, Math.hypot(fract(x) - .5, fract(y) - .5))) * (h > .2 ? 1 : 0); }
  else if (['mottle', 'disruptive', 'reticulate', 'saddles'].includes(s.pattern)) mask = sstep(.22, .7, .5 + .5 * Math.sin(u * 36 * freq + Math.sin(vert * 17 + seed) * 3));
  else if (s.pattern === 'eyespot') mask = 1 - sstep(.7, .9, Math.hypot((u - .74) * g.body.fineness, vert - .25) / (.35 * freq));
  out.lerp(hslCol(s.accent), mask * s.patternStrength);
  if (s.band > 0) out.lerp(hslCol(s.bandColor), (1 - sstep(.07, .2, Math.abs(vert - .02))) * sstep(.1, .3, u) * s.band);
  return out;
}
function exportGLB(name) {
  const f = App.fish; if (!f) return;
  const group = new THREE.Group(), geometries = [], materials = [], color = new THREE.Color(); group.rotation.x = f.group.rotation.x;
  const cleanup = () => { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); };
  try {
    f.group.traverse(o => {
      if (!o.isMesh) return;
      const source = o.geometry, geo = new THREE.BufferGeometry(), pos = source.getAttribute('position');
      geo.setAttribute('position', pos.clone()); if (source.getAttribute('normal')) geo.setAttribute('normal', source.getAttribute('normal').clone()); if (source.index) geo.setIndex(source.index.clone());
      const body = source.getAttribute('aBody'), fin = source.getAttribute('aFin'), skin = source.getAttribute('aSkin'), eye = f.materials._eyes.includes(o.material), glow = o.material === f.materials.glow, tooth = o.material === f.materials.tooth;
      const colors = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        if (tooth) color.setRGB(.82, .78, .68);
        else if (glow) color.copy(f.uniforms.uGlow.value);
        else if (eye) { const ae = source.getAttribute('aEye'), k = ae ? ae.getZ(i) : 0; color.copy(k === 2 ? new THREE.Color(.008, .008, .009) : k === 1 ? o.material.uniforms.uEyeCol.value : k === 0 ? new THREE.Color(.62, .6, .55) : new THREE.Color(.3, .3, .3)); }
        else if (body) { pigmentAt(App.genome, body.getX(i), body.getY(i), color); if (body.getZ(i) > .5 && body.getZ(i) < 2 || body.getZ(i) > 5.4 && body.getZ(i) < 6.6) color.setRGB(.019, .007, .009); }
        else if (skin) { pigmentAt(App.genome, skin.getX(i), skin.getY(i), color); if (skin.getZ(i) < .5) color.lerp(f.uniforms.uFinCol.value, sstep(.06, .42, fin.getY(i))); }
        else color.copy(f.uniforms.uBase.value);
        colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geometries.push(geo);
      const transparent = !!skin && !f.bm.a.solid;
      const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: eye ? .12 : .42, metalness: 0, transparent, opacity: transparent ? .78 : 1, side: THREE.DoubleSide, emissive: glow ? f.uniforms.uGlow.value.clone() : new THREE.Color(0) }); materials.push(material);
      if (o.isInstancedMesh) { const matrix = new THREE.Matrix4(); for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, matrix); const mesh = new THREE.Mesh(geo, material); mesh.applyMatrix4(matrix); group.add(mesh); } }
      else group.add(new THREE.Mesh(geo, material));
    });
    group.userData = { genome: stripGenome(App.genome), pose: 'neutral', pigmentBake: 'approximate vertex colors' };
    new GLTFExporter().parse(group, result => { download(new Blob([result], { type: 'model/gltf-binary' }), name + '.glb'); cleanup(); toast('GLB exported with anatomy and baked pigmentation.'); }, error => { cleanup(); toast('GLB export failed: ' + (error.message || error)); }, { binary: true });
  } catch (error) { cleanup(); showError(error); }
}
