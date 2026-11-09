import fs from 'fs';
import { parse } from '/tmp/node_modules/@shaderfrog/glsl-parser/index.js';
const parser = { parse: (s,o)=>parse(s,o) };

const src = fs.readFileSync('src/engine/fishgen.js', 'utf8');
const names = ['GLSL_SWIM', 'GLSL_COMMON_FS', 'GLSL_PIGMENT', 'VS_BODY', 'FS_BODY', 'VS_FIN', 'FS_FIN', 'VS_EYE', 'FS_EYE', 'VS_SIMPLE', 'FS_SIMPLE', 'FS_GLOW', 'FS_FLOOR'];
const env = {};
for (const n of names) {
  const i = src.indexOf('const ' + n + ' = ');
  if (i < 0) { console.log('missing', n); continue; }
  // find the terminating "`;" at a line start-ish
  const j = src.indexOf('`;', src.indexOf('`', i));
  let k = j, depth = 0;
  // naive: scan for backtick pairs
  let p = src.indexOf('`', i), end = -1;
  while (p >= 0) { const q = src.indexOf('`', p + 1); if (q < 0) break; const after = src.slice(q + 1, q + 2); if (after === ';') { end = q + 1; break; } p = src.indexOf('`', q + 1); }
  const expr = src.slice(i + ('const ' + n + ' = ').length, end);
  env[n] = new Function(...names, 'return (' + expr + ')')(...names.map(x => env[x] || ''));
}

const PRE_V = `#version 300 es
#define attribute in
#define varying out
#define texture2D texture
precision highp float; precision highp int;
#define HIGH_PRECISION
uniform mat4 modelMatrix; uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix; uniform mat4 viewMatrix; uniform mat3 normalMatrix; uniform vec3 cameraPosition; uniform bool isOrthographic;
attribute vec3 position; attribute vec3 normal; attribute vec2 uv;
`;
const PRE_F = `#version 300 es
#define varying in
layout(location = 0) out highp vec4 pc_fragColor;
#define gl_FragColor pc_fragColor
#define texture2D texture
precision highp float; precision highp int;
uniform mat4 viewMatrix; uniform vec3 cameraPosition; uniform bool isOrthographic;
`;
const targets = [['VS_BODY', PRE_V], ['FS_BODY', PRE_F], ['VS_FIN', PRE_V], ['FS_FIN', PRE_F], ['VS_EYE', PRE_V], ['FS_EYE', PRE_F], ['VS_SIMPLE', PRE_V], ['FS_SIMPLE', PRE_F], ['FS_GLOW', PRE_F], ['FS_FLOOR', PRE_F]];
let bad = 0;
for (const [n, pre] of targets) {
  let s = pre + env[n];
  if (n === 'VS_SIMPLE' || n === 'FS_SIMPLE') s = s.replace('#ifdef TEETH', '#define TEETH 1\n#ifdef TEETH');
  try { parser.parse(s, { quiet: true }); console.log('OK  ', n, s.length); }
  catch (e) { bad++; console.log('FAIL', n, e.message.split('\n').slice(0, 4).join('\n')); }
}
process.exit(bad ? 1 : 0);
