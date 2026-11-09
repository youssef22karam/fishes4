// Re-splits the edited src/engine/fishgen.js and src/engine/mouthgeo.js into src/engine/parts/ at LINE boundaries,
// every part <= LIMIT bytes, and updates SHA-256 hashes in tools/reassemble.mjs.
import { readFileSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LIMIT = 29000;

function splitFile(relPath, partsSubdir, prefix) {
  const partsDir = join(root, partsSubdir);
  const src = readFileSync(join(root, relPath));
  const sha = createHash("sha256").update(src).digest("hex");
  const lines = [];
  let start = 0;
  for (let i = 0; i < src.length; i++) if (src[i] === 10) { lines.push(src.subarray(start, i + 1)); start = i + 1; }
  if (start < src.length) lines.push(src.subarray(start));
  const chunks = [];
  let cur = [], size = 0;
  for (const l of lines) {
    if (l.length > LIMIT) { console.error("split: a single line exceeds the limit (" + l.length + " bytes)"); process.exit(1); }
    if (size + l.length > LIMIT) { chunks.push(Buffer.concat(cur)); cur = []; size = 0; }
    cur.push(l); size += l.length;
  }
  if (cur.length) chunks.push(Buffer.concat(cur));
  const re = new RegExp(`^${prefix.replace(".", "\\.")}\\d+\\.js$`);
  for (const f of readdirSync(partsDir)) if (re.test(f)) unlinkSync(join(partsDir, f));
  chunks.forEach((c, i) => writeFileSync(join(partsDir, `${prefix}${String(i + 1).padStart(2, "0")}.js`), c));
  console.log(`split ${relPath}: ${chunks.length} parts (max ${Math.max(...chunks.map(c => c.length))} bytes, sha ${sha})`);
  return sha;
}

const fishSha = splitFile("src/engine/fishgen.js", "src/engine/parts", "fishgen.part");
const mouthSha = splitFile("src/engine/mouthgeo.js", "src/engine/parts", "mouthgeo.part");

let reassembleSrc = readFileSync(join(root, "tools/reassemble.mjs"), "utf8");
reassembleSrc = reassembleSrc.replace(
  /(\{\s*partsDir:\s*'src\/engine\/parts',\s*prefix:\s*'fishgen\.part',\s*out:\s*'src\/engine\/fishgen\.js',\s*sha:\s*')[0-9a-f]+('\s*\})/,
  `$1${fishSha}$2`
);
reassembleSrc = reassembleSrc.replace(
  /(\{\s*partsDir:\s*'src\/engine\/parts',\s*prefix:\s*'mouthgeo\.part',\s*out:\s*'src\/engine\/mouthgeo\.js',\s*sha:\s*')[0-9a-f]+('\s*\})/,
  `$1${mouthSha}$2`
);
writeFileSync(join(root, "tools/reassemble.mjs"), reassembleSrc);
console.log("updated tools/reassemble.mjs SHAs");
