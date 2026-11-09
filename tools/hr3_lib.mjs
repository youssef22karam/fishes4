// Shared helpers for the R3 audit / test tools (headless Chromium + software GL, rig.shot → PNG files).
// Playwright is NOT a project dependency (package.json stays minimal): it is resolved from ./node_modules, /tmp/pw or $PW_PATH.
// If Chromium lacks system libs, point LD_LIBRARY_PATH at extracted .debs (see docs/upgrade/AUDIT_R3.md "environment").
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The 12 fixed audit seeds, chosen by scanning R0..R59 for the required morphologies. */
export const AUDIT_SEEDS = [
  { seed: 'R40', role: 'open-water cruiser (tuna)' },
  { seed: 'R34', role: 'bottom ambusher (scorpionfish)' },
  { seed: 'R8', role: 'deep-bodied reef fish (angelfish)' },
  { seed: 'R7', role: 'elongated hunter (pike)' },
  { seed: 'R1', role: 'eel / ribbon fish' },
  { seed: 'R22', role: 'armored fish (boxfish)' },
  { seed: 'R3', role: 'deep-water fish (dragonfish)' },
  { seed: 'R4^R6.h1', role: 'hybrid 1 (perch x puffer)' },
  { seed: 'R54^R18.h2', role: 'hybrid 2 (jack x mackerel)' },
  { seed: 'R19', role: 'shark' },
  { seed: 'R31', role: 'grouper (reference screenshot fish)' },
  { seed: 'R55', role: 'ray' },
];
export const VIEWS = { side: 'full', head34: 'head34', mouth: 'mouthOpen', gillOpen: 'gillOpen', eye: 'eye', scale: 'scales', fin: 'fins', belly: 'belly' };

export async function launch(o = {}) {
  let chromium; for (const p of [process.env.PW_PATH, 'playwright', '/tmp/pw/node_modules/playwright']) { if (!p) continue; try { ({ chromium } = require(p)); break; } catch { /* next */ } }
  if (!chromium) throw new Error('playwright not found (npm i playwright in /tmp/pw)');
  const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const pg = await br.newPage({ viewport: { width: o.w || 1000, height: o.h || 640 } });
  const errs = []; pg.on('pageerror', e => { errs.push(String(e).slice(0, 300)); console.log('PAGEERROR', String(e).slice(0, 300)); });
  await pg.goto('file://' + resolve(root, process.env.DIST || 'dist/index.html'));
  await pg.waitForFunction(() => window.FG && window.FG.proc && window.FG.hyperRig, null, { timeout: 90000 });
  await pg.waitForTimeout(1500);
  return { br, pg, errs };
}
export const save = (path, dataUrl) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, Buffer.from(dataUrl.split(',')[1], 'base64')); };
