// Reassemble generated engine files from their split parts.
// Usage: node tools/reassemble.mjs — rewrites src/engine/fishgen.js,
// src/engine/hyper/gillchamber.js and src/engine/mouthgeo.js (round 7)
// byte-exact from their parts, verifying SHA-256.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/* SHAs updated for ROUND 7 (the parts are the source of truth; the recorded
   SHA proves reassembly is byte-exact for THIS round's content). */
const TARGETS = [
  { partsDir: 'src/engine/parts', prefix: 'fishgen.part', out: 'src/engine/fishgen.js', sha: 'a5066c1c685c1d1fea789a0c8e8930c0aab4879d59ed07ca0cdfbea0f124a3f1' },
  { partsDir: 'src/engine/hyper/parts', prefix: 'gillchamber.part', out: 'src/engine/hyper/gillchamber.js', sha: '8dca4783c3661e2596ad8bb0ec61f4f276da693166c9ff06b00aba3b51f6f8c0' },
  { partsDir: 'src/engine/parts', prefix: 'mouthgeo.part', out: 'src/engine/mouthgeo.js', sha: '58e745e2b48a449af7a80c93be2e12aacabe8e365c2b7483bb698356dee35f1c' },
];
for (const t of TARGETS) {
  const dir = resolve(root, t.partsDir);
  const files = readdirSync(dir).filter(f => f.startsWith(t.prefix)).sort();
  if (!files.length) throw new Error('no parts in ' + t.partsDir);
  const buf = Buffer.concat(files.map(f => readFileSync(resolve(dir, f))));
  const sha = createHash('sha256').update(buf).digest('hex');
  if (sha !== t.sha) throw new Error(`${t.out}: SHA mismatch ${sha} != ${t.sha}`);
  writeFileSync(resolve(root, t.out), buf);
  console.log(`reassemble: ${files.length} parts -> ${t.out} (${buf.length} bytes, SHA-256 OK)`);
}
