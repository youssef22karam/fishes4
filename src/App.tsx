import { useEffect, useRef, useState } from 'react';
import './engine/fish.css';

interface MouthTelemetry {
  arch: string;
  mouthType: string;
  construction: string;
  teeth: string;
  openDeg: number;
  protrusile: boolean;
  lips: number;
  jawRatio: number;
}

const ARCHETYPE_PRESETS = [
  { id: 'largemouth-bass', label: 'Largemouth Bass', sub: 'Paddle maxilla · prognathous gulper', jaw: 0.72, view: 'mouth' },
  { id: 'nile-tilapia', label: 'Nile Tilapia', sub: 'Labial rolls · suborbital canal', jaw: 0.25, view: 'mouth' },
  { id: 'great-barracuda', label: 'Great Barracuda', sub: 'Acuminate snout · lancet fangs', jaw: 0.55, view: 'mouth' },
  { id: 'spotted-scorpionfish', label: 'Scorpionfish / Sculpin', sub: 'Broad horseshoe arch · cheek web', jaw: 0.85, view: 'front' },
  { id: 'channel-catfish', label: 'Channel Catfish', sub: 'Depressed cranium · papillose lips', jaw: 0.45, view: 'mouth' },
  { id: 'alligator-gar', label: 'Alligator Gar', sub: 'Rostrate longjaw · dual fang rows', jaw: 0.5, view: 'mouth' },
  { id: 'common-carp', label: 'Common Carp', sub: 'Protrusile suction tube · plush lips', jaw: 0.8, view: 'mouth' },
  { id: 'snook', label: 'Common Snook', sub: 'Diagonal maxillary blade · underbite', jaw: 0.75, view: 'mouth' },
  { id: 'scalloped-hammerhead', label: 'Hammerhead Shark', sub: 'Cephalofoil · parabolic ventral jaw', jaw: 0.65, view: 'below' },
  { id: 'shortfin-mako', label: 'Shortfin Mako', sub: 'Conical rostrum · recurved awl teeth', jaw: 0.65, view: 'mouth' },
];

export default function App() {
  const booted = useRef(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [jawMode, setJawMode] = useState<'auto' | 'manual'>('auto');
  const [jawOpen, setJawOpen] = useState<number>(0.65);
  const [activePreset, setActivePreset] = useState<string>('');
  const [telemetry, setTelemetry] = useState<MouthTelemetry | null>(null);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    (window as any).__fgShowError = function (msg: string) {
      const o = document.getElementById('errOverlay'), t = document.getElementById('errText');
      if (o && t) { t.textContent += (t.textContent ? '\n\n' : '') + msg; o.classList.remove('hidden'); }
      else console.error(msg);
    };
    const onErr = (e: ErrorEvent) => (window as any).__fgShowError((e.message || 'Error') + '\n' + (e.filename || '') + ':' + (e.lineno || '') + (e.error && e.error.stack ? '\n' + e.error.stack : ''));
    const onRej = (e: PromiseRejectionEvent) => (window as any).__fgShowError('Unhandled rejection: ' + (e.reason && e.reason.stack ? e.reason.stack : String(e.reason)));
    addEventListener('error', onErr); addEventListener('unhandledrejection', onRej);
    import('./engine/fishgen.js').then(m => m.boot()).catch(e => (window as any).__fgShowError(String(e && e.stack ? e.stack : e)));

    const timer = setInterval(() => {
      const FG = (window as any).FG;
      const fish = FG && FG.App && FG.App.fish;
      if (fish && fish.bm) {
        const bm = fish.bm, g = bm.g, lawM = bm.law && bm.law.mouth;
        const h2 = bm.head2 || {};
        setTelemetry({
          arch: (h2.arch || 'reef_terminal').replace(/_/g, ' '),
          mouthType: g.mouth.type,
          construction: lawM ? lawM.construction : 'jawed',
          teeth: g.mouth.teeth === 'none' ? 'edentulous (none)' : `${g.mouth.teeth} (×${g.mouth.teethCount})`,
          openDeg: lawM ? Math.round(lawM.openDeg) : 0,
          protrusile: !!bm.protrusile,
          lips: Math.round((g.mouth.lips ?? 0.3) * 100),
          jawRatio: +(g.mouth.jawRatio ?? 1.0).toFixed(2),
        });
      }
    }, 350);

    return () => {
      clearInterval(timer);
      removeEventListener('error', onErr);
      removeEventListener('unhandledrejection', onRej);
    };
  }, []);

  const applyJaw = (mode: 'auto' | 'manual', val: number) => {
    setJawMode(mode);
    setJawOpen(val);
    if (mode === 'auto') {
      (window as any).__fgJaw = null;
    } else {
      (window as any).__fgJaw = val;
    }
  };

  const focusCamera = (view: 'mouth' | 'front' | 'side' | 'below' | 'full') => {
    const FG = (window as any).FG;
    if (!FG || !FG.App || !FG.App.fish) return;
    if (view === 'mouth') {
      FG.setCameraView && FG.setCameraView('mouth');
    } else if (view === 'front') {
      FG.setCameraView && FG.setCameraView('head');
    } else if (view === 'below') {
      FG.setCameraView && FG.setCameraView('mouthbelow');
    } else if (view === 'side') {
      const bm = FG.App.fish.bm, hl = bm.h * bm.L;
      const lm = {};
      for (const l of FG.App.fish.info.landmarks3D) (lm as any)[l.name] = l;
      const eye = (lm as any).eye || { x: bm.headX - hl * 0.45, y: 0, z: 0 };
      if (FG.shoot && FG.shoot.look) {
        FG.shoot.look([eye.x + hl * 0.08, eye.y + hl * 0.02, hl * 1.45], [eye.x + hl * 0.08, eye.y, 0]);
      } else if (FG.setCameraView) {
        FG.setCameraView('eye');
      }
    } else {
      FG.frameCamera && FG.frameCamera(FG.App.fish);
    }
  };

  const selectArchetypePreset = (p: typeof ARCHETYPE_PRESETS[number]) => {
    const FG = (window as any).FG;
    if (!FG) return;
    setActivePreset(p.id);
    const selSp = document.getElementById('selSpecies') as HTMLSelectElement | null;
    if (selSp) selSp.value = p.id;
    if (FG.doGenerate) {
      FG.doGenerate({ species: p.id, seed: 'arch:' + p.id });
    }
    applyJaw('manual', p.jaw);
    setTimeout(() => {
      focusCamera(p.view as any);
    }, 60);
  };

  return (
    <>
      <canvas id="gl" />
      <header className="bar top">
        <div className="brand">HyperFish<small>Anatomical Head &amp; Mouth Sculpture · Premaxilla &amp; Maxilla · Layered Skin</small></div>
        <select id="selHabitat" title="Habitat" aria-label="Habitat"></select>
        <button id="btnRandom" className="primary" title="Invent a never-before-seen species adapted to the selected habitat">Random</button>
        <select id="selNiche" title="Niche" aria-label="Ecological niche"></select>
        <select id="selClade" title="Clade" aria-label="Evolutionary clade"></select>
        <select id="selSpecies" title="Species card" aria-label="Reference species"></select>
        <select id="selMix" title="Second parent" aria-label="Mix with"></select>
        <input id="mixRatio" type="range" min="10" max="90" defaultValue="50" title="Share of the second parent (10-90%)" aria-label="Mix ratio" style={{ width: 60, padding: 0, minHeight: 28, border: 0, background: 'none' }} />
        <button id="btnMix" className="primary" title="Cross the current fish with the selected parent">Mix</button>
        <input id="seed" type="text" placeholder="seed" style={{ width: 90 }} title="Seed" aria-label="Generation seed" />
        <button id="btnGenerate">Generate</button>
        <input id="nameInput" type="text" placeholder="Name a creature… e.g. yellowfin tuna" style={{ width: 230, maxWidth: '52vw' }} aria-label="Creature name or description" />
        <button id="btnConvert" className="primary">Convert</button>
      </header>
      <div id="hud"><div id="fishName">…</div><div id="fishSci"></div><div id="fishTags"></div><div id="stats"></div></div>

      {/* Interactive Head & Mouth Sculpture Inspector */}
      <aside
        id="mouthStudioDock"
        style={{
          position: 'fixed',
          left: 12,
          bottom: 'calc(66px + env(safe-area-inset-bottom, 0px))',
          width: inspectorOpen ? 320 : 'auto',
          maxWidth: 'calc(100vw - 24px)',
          maxHeight: 'calc(100vh - 220px)',
          overflowY: 'auto',
          zIndex: 7,
          background: 'rgba(7, 16, 25, 0.88)',
          border: '1px solid rgba(45, 212, 191, 0.28)',
          borderRadius: 12,
          padding: inspectorOpen ? '10px 12px' : '6px 10px',
          backdropFilter: 'blur(12px)',
          color: '#d9eceb',
          fontSize: 11.5,
          boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, color: '#2dd4bf', letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 11 }}>
            Head &amp; Mouth Sculpture Lab
          </span>
          <button
            type="button"
            onClick={() => setInspectorOpen(v => !v)}
            style={{ minHeight: 22, padding: '2px 7px', fontSize: 11 }}
          >
            {inspectorOpen ? 'Minimize' : 'Expand'}
          </button>
        </div>

        {inspectorOpen && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Jaw Gape Articulation Control */}
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '7px 9px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ color: '#9ab3c2', fontWeight: 600 }}>Jaw Articulation &amp; Protrusion</span>
                <span style={{ color: '#2dd4bf', fontWeight: 700 }}>
                  {jawMode === 'auto' ? 'Auto Bite Cycle' : `${Math.round(jawOpen * 100)}% (${Math.round(jawOpen * (telemetry?.openDeg || 24))}°)`}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={jawMode === 'auto' ? 0 : jawOpen}
                onChange={e => applyJaw('manual', parseFloat(e.target.value))}
                style={{ width: '100%', minHeight: 20, padding: 0 }}
                aria-label="Jaw opening fraction"
              />
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                <button type="button" className={jawMode === 'auto' ? 'primary' : ''} style={{ minHeight: 22, padding: '2px 6px', fontSize: 10.5 }} onClick={() => applyJaw('auto', 0)}>
                  Auto
                </button>
                <button type="button" className={jawMode === 'manual' && jawOpen === 0 ? 'primary' : ''} style={{ minHeight: 22, padding: '2px 6px', fontSize: 10.5 }} onClick={() => applyJaw('manual', 0)}>
                  Closed (0%)
                </button>
                <button type="button" className={jawMode === 'manual' && Math.abs(jawOpen - 0.35) < 0.05 ? 'primary' : ''} style={{ minHeight: 22, padding: '2px 6px', fontSize: 10.5 }} onClick={() => applyJaw('manual', 0.35)}>
                  Respire (35%)
                </button>
                <button type="button" className={jawMode === 'manual' && Math.abs(jawOpen - 0.7) < 0.05 ? 'primary' : ''} style={{ minHeight: 22, padding: '2px 6px', fontSize: 10.5 }} onClick={() => applyJaw('manual', 0.7)}>
                  Open (70%)
                </button>
                <button type="button" className={jawMode === 'manual' && jawOpen >= 0.98 ? 'primary' : ''} style={{ minHeight: 22, padding: '2px 6px', fontSize: 10.5 }} onClick={() => applyJaw('manual', 1)}>
                  Full Strike (100%)
                </button>
              </div>
            </div>

            {/* Camera Framing Buttons */}
            <div>
              <div style={{ color: '#9ab3c2', fontWeight: 600, marginBottom: 4 }}>Close-Up Camera Framing</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <button type="button" style={{ minHeight: 24, padding: '2px 7px', fontSize: 11 }} onClick={() => focusCamera('mouth')}>
                  3/4 Mouth
                </button>
                <button type="button" style={{ minHeight: 24, padding: '2px 7px', fontSize: 11 }} onClick={() => focusCamera('front')}>
                  Front Dental Arch
                </button>
                <button type="button" style={{ minHeight: 24, padding: '2px 7px', fontSize: 11 }} onClick={() => focusCamera('side')}>
                  Head Profile
                </button>
                <button type="button" style={{ minHeight: 24, padding: '2px 7px', fontSize: 11 }} onClick={() => focusCamera('below')}>
                  Ventral Jaw
                </button>
                <button type="button" style={{ minHeight: 24, padding: '2px 7px', fontSize: 11 }} onClick={() => focusCamera('full')}>
                  Full Fish
                </button>
              </div>
            </div>

            {/* Reference Archetype Presets */}
            <div>
              <div style={{ color: '#9ab3c2', fontWeight: 600, marginBottom: 4 }}>Reference Head &amp; Mouth Morphologies</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {ARCHETYPE_PRESETS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectArchetypePreset(p)}
                    title={p.sub}
                    className={activePreset === p.id ? 'primary' : ''}
                    style={{
                      minHeight: 26,
                      padding: '3px 6px',
                      fontSize: 10.5,
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      lineHeight: 1.15,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{p.label}</span>
                    <span style={{ fontSize: 9.2, opacity: 0.72, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                      {p.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Anatomical Telemetry */}
            {telemetry && (
              <div style={{ background: 'rgba(255,255,255,0.035)', borderRadius: 8, padding: '6px 8px', fontSize: 10.5, lineHeight: 1.45, color: '#b8d0dc' }}>
                <div><strong style={{ color: '#e2f1f8' }}>Cranial Archetype:</strong> {telemetry.arch}</div>
                <div><strong style={{ color: '#e2f1f8' }}>Mouth / Jaw:</strong> {telemetry.mouthType} ({telemetry.construction}) · ratio {telemetry.jawRatio}</div>
                <div><strong style={{ color: '#e2f1f8' }}>Labial &amp; Maxilla:</strong> lips {telemetry.lips}% {telemetry.protrusile ? '· protrusile premaxilla' : '· hinged maxilla fold'}</div>
                <div><strong style={{ color: '#e2f1f8' }}>Dentition:</strong> {telemetry.teeth} · max gape {telemetry.openDeg}°</div>
              </div>
            )}
          </div>
        )}
      </aside>

      <nav className="bar bottom">
        <button data-tab="proc" id="btnProc" className="primary" title="Seeded procedural genome: Random, seed, Mutate, Breed, gallery">Procedural</button>
        <button data-act="generate">New Fish</button>
        <button data-act="discover" title="Invent a coherent species that has never existed">Discover</button>
        <select id="selMutation" title="Which anatomical module to evolve" aria-label="Mutation target" defaultValue="auto">
          <option value="auto">Mutation: guided</option>
          <option value="drift">Adaptive drift</option>
          <option value="donor">Gene flow (from Mix parent)</option>
          <option value="habitat">Adapt to habitat (gradual)</option>
          <option value="innovate">Innovate: new organ</option>
          <option value="speed">Streamlining</option>
          <option value="agility">Body depth</option>
          <option value="finShape">Fin silhouette</option>
          <option value="display">Fin growth</option>
          <option value="tail">Tail propulsion</option>
          <option value="feeding">Head and jaw</option>
          <option value="shelter">Elongation</option>
        </select>
        <button data-act="mutate" id="btnMutate">Mutate</button>
        <button data-act="undo" id="btnUndo" title="Restore the previous genome">Undo</button>
        <button data-act="breed" title="Constrained virtual crossover with the previous fish">Breed</button>
        <button data-act="school" id="btnSchool">School</button>
        <button data-act="mode" id="btnMode">Studio</button>
        <button data-tab="mix" id="btnMixTab">Hybrid Lab</button>
        <button data-tab="evo" id="btnEvoTab">Evolution</button>
        <button data-tab="god" id="btnGod">God Mode</button>
        <button data-tab="inspect">Genome</button>
        <button data-tab="tree">Tree</button>
        <button data-tab="gallery">Gallery</button>
        <button data-tab="text">Text</button>
        <button data-tab="export">Export</button>
        <button data-tab="debug">Debug</button>
        <button data-tab="tests">Tests</button>
        <button data-tab="help">Guide</button>
      </nav>
      <section id="sheet" className="hidden" aria-label="Fish creation tools">
        <div className="sheet-head"><span id="sheetTitle"></span><button id="sheetClose" className="sm" aria-label="Close tools">Close</button></div>
        <div id="sheetBody"></div>
      </section>
      <div id="toast" role="status" aria-live="polite"></div>
      <div id="errOverlay" className="hidden"><h3>Something went wrong</h3><pre id="errText"></pre><button id="errClose">Dismiss</button></div>
    </>
  );
}
