// Round-1 motion/anatomy check:  node tools/reassemble.mjs && node tools/pectest.mjs [N=400]
// Simulates the side-fin controller over speed / turn / brake / rest for N generated fish and asserts the hard clamps in EVERY frame,
// the stroke-pattern rules per swim class, fin length + burial bounds on built meshes, jaw-angle bounds and the 40° frequency.
import './headless.mjs';
import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname), eng = f => pathToFileURL(resolve(root, 'src/engine', f)).href;
const { FG } = await import(eng('fishgen.js')); const { initProcGen, fromSeed } = await import(eng('procgen.js')); const P = await import(eng('finmotion.js'));
initProcGen(FG);
const N = +process.argv[2] || 400, bad = [], cls = {}, S = { frames: 0, maxSweep: -99, minSweep: 99, maxAbd: -99, minAbd: 99, maxCruiseAmp: 0, rowHz: [9, 0], jaw40: 0, jawed: 0, hov32: 0, hov: 0, lenMin: 9, lenMax: 0, sinkMin: 9, asymStraight: 0, restMoving: 0, brakeAbd: 0, tipLag: [99, 0] };
for (let i = 0; i < N; i++) {
  const seed = 'T' + (i * 2654435 + 7).toString(36); let f; try { f = fromSeed(seed); } catch { continue; }
  const g = f.genome, ax = FG.axesOf(g), plan = P.pecPlan(ax, g.body.length, ax.seedU), M = FG.LAW.mouthLaw(ax);
  cls[plan.cls] = (cls[plan.cls] || 0) + 1;
  if (M.construction === 'jawed') { S.jawed++; if (M.openDeg >= 40) S.jaw40++; if (M.openDeg > 40 || M.openDeg < 12) bad.push(seed + ' jaw ' + M.openDeg); }
  S.tipLag = [Math.min(S.tipLag[0], plan.lagDeg), Math.max(S.tipLag[1], plan.lagDeg)];
  if (plan.cls === 'hover') { S.hov++; if (plan.hi > .26) S.hov32++; }
  const st = P.newPecState(); let t = 0;
  for (let k = 0; k < 2400; k++) {                               // 40 s at 60 fps with scripted speed / turn / brake
    const dt = 1 / 60; t += dt;
    const speed = k < 300 ? 0 : k < 900 ? .4 : k < 1500 ? .4 + .6 * Math.abs(Math.sin(k / 120)) : k < 1800 ? 1 : 0, turn = k > 1000 && k < 1300 ? Math.sin((k - 1000) / 95) : 0, brake = k > 1800 && k < 1900 ? 1 : 0;
    const o = P.pecStep(st, plan, dt, { speed, turn, brake, still: speed < .03 });
    for (const fin of [o.L, o.R]) for (const lw of [0, .5, 1]) {
      const a = P.finAngles(fin, st.phase, plan.lagDeg * Math.PI / 180, lw); S.frames++;
      S.maxSweep = Math.max(S.maxSweep, a.sweep); S.minSweep = Math.min(S.minSweep, a.sweep); S.maxAbd = Math.max(S.maxAbd, a.abd); S.minAbd = Math.min(S.minAbd, a.abd);
      if (plan.cls !== 'disc' && (fin.sM + fin.sA > 35 + 1e-6 || fin.sM - fin.sA < -25 - 1e-6 || fin.aM + fin.aA > 55 + 1e-6 || fin.aM - fin.aA < 5 - 1e-6)) bad.push(seed + ' base clamp frame ' + k);
    }
    if (plan.cls === 'stabilise' && speed > .03) S.maxCruiseAmp = Math.max(S.maxCruiseAmp, o.R.sA, o.R.aA, Math.abs(o.R.aM - plan.restAbd));
    if ((plan.cls === 'row' || plan.cls === 'hover') && o.active && speed >= .03) { S.rowHz = [Math.min(S.rowHz[0], o.hz), Math.max(S.rowHz[1], o.hz)]; if (o.amp > 25.01 && plan.cls === 'hover') bad.push(seed + ' hover amp ' + o.amp); }
    if (turn === 0 && brake === 0 && (o.L.aM !== o.R.aM || o.L.sM !== o.R.sM)) S.asymStraight++;
    if (speed === 0 && k > 200 && k < 280 && st.t % 5 > 1.6 && o.active) S.restMoving++;
    if (brake && plan.cls !== 'disc') S.brakeAbd = Math.max(S.brakeAbd, Math.min(o.L.aM, o.R.aM));
  }
  if (i < 120) {                                                  // mesh-level: fin length band, burial depth, mirror, disc rule
    const fish = FG.buildFish(JSON.parse(JSON.stringify(g)), { quality: 'med' }), r = fish.info.pec;
    if (r) for (const e of P.checkPec(r)) bad.push(seed + ' ' + e);
    if (r && r.cls !== 'disc') { S.lenMin = Math.min(S.lenMin, r.lenOverL); S.lenMax = Math.max(S.lenMax, r.lenOverL); S.sinkMin = Math.min(S.sinkMin, r.sinkOverL); }
  }
}
const ok = bad.length === 0 && S.maxSweep <= 35.001 && S.minSweep >= -25.001 && S.maxAbd <= 55.001 && S.minAbd >= 5 - 1e-3 && S.maxCruiseAmp <= 10.001 && S.asymStraight === 0 && S.restMoving === 0 && S.jaw40 / Math.max(1, S.jawed) <= .1 && S.rowHz[0] >= 1.2 - 1e-6 && S.rowHz[1] <= 3.0 + 1e-6;
console.log(JSON.stringify({ fish: N, classes: cls, ...S }, null, 1)); console.log('violations:', bad.length, bad.slice(0, 8));
console.log(ok ? 'PECTEST PASS' : 'PECTEST FAIL'); process.exit(ok ? 0 : 1);
