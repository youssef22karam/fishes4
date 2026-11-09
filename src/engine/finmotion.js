/* SIDE (PECTORAL) FIN — plan + motion. Pure JS (no THREE): used by the geometry builder, the animation loop, the validator and the node checks.
   Every rule is a function of the generator's axes only: body plan (disc / separate fin), swim mode, body size, forward speed, turn rate, braking.
   Angles are DEGREES here; the render loop converts to radians for the shader.
   Frame: x forward, y up, z out of the right side. sweep = rotation in the body plane (+ forward), abduction = angle between the fin and the body wall. */
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export const PEC_LIM = { sweepMin: -25, sweepMax: 35, abdMin: 5, abdMax: 55 };   /* hard clamps (degrees) */
export const PEC_LEN = { lo: .10, hi: .26, hardMax: .32 };                        /* fin length / body length */
export const PEC_SINK_MIN = .02;                                                  /* fin base centre depth inside the body wall / body length */
export const LAG_DEG = [8, 20];                                                   /* tip phase lag behind the base (degrees of phase) */

/** Motion class from the axes. disc = flattened plan with merged side fins (no separate joint). */
export function pecClass(ax) {
  if (ax.plan.flat >= 1 || ax.plan.family === 'ray') return 'disc';
  if (ax.swim === 'labriform') return 'row';
  if (ax.swim === 'ostraciiform' || ax.swim === 'hippocampiform' || (ax.flags && ax.flags.has('hoverer'))) return 'hover';
  return 'stabilise';
}

/** Static plan: resting abduction, length band, aspect (fan spread), tip lag — by class / swim mode / size. u = per-fish uniform in [0,1) from the seed. */
export function pecPlan(ax, size, u = .5) {
  const cls = pecClass(ax), cruise = ax.swim === 'thunniform' ? 1 : ax.swim === 'carangiform' ? .7 : ax.swim === 'subcarangiform' ? .45 : ax.swim === 'anguilliform' ? .2 : 0;
  let lo = PEC_LEN.lo, hi = PEC_LEN.hi, restAbd, fan, aspect, stiff;
  if (cls === 'row') { lo = .14; restAbd = 20; fan = 1.15; aspect = 2.2; stiff = .35; }
  else if (cls === 'hover') { lo = .15; restAbd = 24; fan = 1.3; aspect = 1.7; stiff = .25; if (u < .08) hi = PEC_LEN.hardMax; }   /* the 0.32 ceiling: hovering mode only, ≤ 10% of fish */
  else { hi = lerp(.19, .14, cruise); restAbd = lerp(14, 9, cruise); fan = lerp(.85, .62, cruise); aspect = lerp(2.8, 4.2, cruise); stiff = lerp(.6, .95, cruise); }
  const lag = lerp(LAG_DEG[0], LAG_DEG[1], clamp(1 - stiff * .6 + (u - .5) * .2, 0, 1));
  return { cls, lo, hi, restAbd, fan, aspect, stiff, lagDeg: clamp(lag, LAG_DEG[0], LAG_DEG[1]), size };
}

/** Fin length (fraction of body length) after the law: natural length clamped into the band. */
export const pecLength = (natural, plan) => clamp(natural, plan.lo, plan.hi);

/** Stroke frequency (Hz) for rowing / sculling modes: 1.2–3.0 Hz, scaled down as body size (m) rises. */
export const strokeHz = size => clamp(2.2 * Math.pow(Math.max(size, .02), -.45), 1.2, 3.0);

/** Clamp one fin's parameters so base ± amplitude stays inside the hard limits in every frame. */
export function clampFin(f) {
  const L = PEC_LIM;
  f.sM = clamp(f.sM, L.sweepMin, L.sweepMax); f.sA = Math.max(0, Math.min(f.sA, f.sM - L.sweepMin, L.sweepMax - f.sM));
  f.aM = clamp(f.aM, L.abdMin, L.abdMax); f.aA = Math.max(0, Math.min(f.aA, f.aM - L.abdMin, L.abdMax - f.aM));
  return f;
}
/** Instantaneous angles (degrees) of one fin at phase th (rad), with the progressive tip lag lagw ∈ [0,1] (0 = base, 1 = tip). Mirrors the shader. */
export function finAngles(f, th, lagRad = 0, lagw = 0) {
  const t = th - lagRad * lagw, L = PEC_LIM;
  return { sweep: clamp(f.sM + f.sA * Math.cos(t), L.sweepMin, L.sweepMax), abd: clamp(f.aM + f.aA * Math.sin(t), L.abdMin, L.abdMax) };
}

export function newPecState() { return { phase: 0, t: 0, speed: 0, brake: 0, turn: 0, scull: 0 }; }

/** Advance one frame. inp = { speed 0..1 (forward), turn -1..1 (+ = turning right), brake 0..1, still: bool (complete rest) }.
    Returns { L:{sM,sA,aM,aA}, R:{…}, hz, active, amp } — degrees; left/right identical unless turning. */
export function pecStep(st, plan, dt, inp) {
  st.t += dt; const sp = clamp(inp.speed, 0, 1), cls = plan.cls, rest0 = plan.restAbd;
  let hz = 0, sM = 0, sA = 0, aM = rest0, aA = 0, turnMax = 10;
  const still = inp.still || sp < .03;
  if (cls === 'disc') return { L: { sM: 0, sA: 0, aM: 0, aA: 0 }, R: { sM: 0, sA: 0, aM: 0, aA: 0 }, hz: 0, active: false, amp: 0 };
  if (still) {                                                                     /* complete rest: still, or one slow scull every few seconds */
    const per = 5, w = 1.6, k = st.t % per; hz = 1 / w; const on = k < w && !inp.hold;
    if (on) { st.phase = 2 * Math.PI * k / w; const e = Math.sin(Math.PI * k / w); sA = 7 * e; aA = 3 * e; aM = rest0 + 3; sM = 0; } else { st.phase = 0; }
  } else if (cls === 'stabilise') {                                                /* body-driven: stabilisers, ≤ 10° corrections that FALL with speed */
    hz = lerp(.45, .12, sp); sA = 9 * (1 - .75 * sp); aA = sA * .45; sM = 0; aM = rest0; turnMax = 10;
  } else if (cls === 'row') {                                                      /* rowing scull: power stroke back + spread, feathered recovery; RISES with speed */
    hz = clamp(strokeHz(plan.size) * lerp(.7, 1.15, sp), 1.2, 3.0); sM = 5; sA = lerp(16, 30, sp); aM = 30; aA = lerp(14, 25, sp); turnMax = 18;
  } else {                                                                         /* hover: continuous small-amplitude sculling, 10–25° */
    hz = clamp(strokeHz(plan.size) * lerp(.75, 1.1, sp), 1.2, 3.0); sA = lerp(11, 20, sp); sM = 6; aM = rest0 + 8; aA = sA * .6; turnMax = 16;
  }
  if (!still) st.phase += 2 * Math.PI * hz * dt;
  if (st.phase > 1e5) st.phase %= 2 * Math.PI;
  const turn = clamp(inp.turn || 0, -1, 1), br = clamp(inp.brake || 0, 0, 1);
  const mk = side => {                                                              /* side: +1 right, -1 left. Turning: outer fin abducts, inner fin adducts, in proportion to turn rate */
    const tt = turn * side;                                                          /* + → this fin is the inner one */
    const f = { sM, sA, aM: aM - tt * turnMax * (tt > 0 ? .8 : 1.0), aA };
    f.sA *= 1 - .5 * Math.abs(turn); f.aA *= 1 - .5 * Math.abs(turn);
    if (br > 0) {                                                                    /* braking: both fins flare symmetrically to near-max abduction */
      f.aM = lerp(f.aM, PEC_LIM.abdMax - 4, br); f.sM = lerp(f.sM, 22, br); f.aA = lerp(f.aA, 0, br); f.sA = lerp(f.sA, 0, br);
    }
    return clampFin(f);
  };
  const L = mk(-1), R = mk(1);
  if (br === 0 && turn === 0) Object.assign(L, R);                                   /* identical in straight cruise */
  return { L, R, hz, active: !still, amp: Math.max(R.sA, R.aA) };
}

/** Disc plan: travelling wave along the margin. amplitude ≤ 0.06 × body width, wavelength 0.4–0.9 × body length. */
export function discWave(widthOverLen, speed, u = .5) {
  const wl = lerp(.9, .4, clamp(.55 * speed + .45 * u, 0, 1));
  return { wavelength: wl, k: 2 * Math.PI / wl, ampOverWidth: .06 * (.4 + .6 * clamp(speed, 0, 1)) };
}

/** Anatomy check on the plan + geometry report (used by the validator and the render check). Returns a list of problems. */
export function checkPec(rep) {
  const err = [];
  if (!rep) return err;
  if (rep.cls === 'disc') { if (rep.hinged) err.push('disc plan has separate hinged side fins'); return err; }
  if (!(rep.sinkOverL >= PEC_SINK_MIN - 1e-9)) err.push(`fin base only ${(rep.sinkOverL * 100).toFixed(2)}% of body length inside the wall`);
  if (rep.lenOverL < PEC_LEN.lo - .004 || rep.lenOverL > (rep.cls === 'hover' ? PEC_LEN.hardMax : PEC_LEN.hi) + .004) err.push(`fin length ${rep.lenOverL.toFixed(3)} × body length out of band`);
  if (rep.restAbd < PEC_LIM.abdMin || rep.restAbd > PEC_LIM.abdMax) err.push('rest abduction out of clamp');
  if (!rep.mirrored) err.push('left/right fins are not mirror images');
  return err;
}
