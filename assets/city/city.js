/* The whole operation on one page: a crafted night city the page flies through (see DESIGN-BRIEF.md).
   01 City (this file's original shots), 02 Field operation and 03 Command center (ops3d.js). */
import { hud } from './hud.js?v=4';
import { buildOps } from './ops3d.js?v=3';
import { makePeople } from './people.js?v=2';
import { createTraffic } from './traffic.js?v=2';
const S = window.Site;
const { $, $$, esc, reduce } = S;
const root = document.documentElement;

/* ================================================================ copy + UI */
// every section is a camera shot; scrolling between section centres flies between shots
const SECTIONS = $$('[data-shot]');
const NAMES = SECTIONS.map(s => s.dataset.shot);
const CHS = SECTIONS.map(s => s.dataset.ch);
const CH_KEYS = ['city', 'work', 'system'];
const railLabels = () => { const R = S.L().op.rail; return R.city.concat(R.work, R.system); };

function splitTitle() {
  $$('.c-title .row').forEach(row => {
    const text = row.dataset.split;
    const accent = row.classList.contains('accent');
    const stops = [[76, 242, 255], [139, 123, 255], [255, 63, 164]];
    let i = row.classList.contains('accent') ? 10 : 0;
    row.innerHTML = [...text].map((ch, k) => {
      if (ch === ' ') return ' ';
      let style = `--i:${i++}`;
      if (accent) {
        const f = k / Math.max(1, text.length - 1) * 2, a = stops[Math.floor(Math.min(1.999, f))], b = stops[Math.floor(Math.min(1.999, f)) + 1], u = f - Math.floor(Math.min(1.999, f));
        const c = a.map((v, j) => Math.round(v + (b[j] - v) * u));
        style += `;color:rgb(${c.join(',')})`;
      }
      return `<span class="ch" style="${style}">${esc(ch)}</span>`;
    }).join('');
    if (accent) { row.style.background = 'none'; row.style.color = 'inherit'; }
  });
}

function renderCopy() {
  const L = S.L();
  $('#aboutBody').innerHTML = L.city.about.body.map(p => `<p>${esc(p)}</p>`).join('');
  const C = S.content;
  const tech = C.skills.reduce((n, g) => n + g.items.length, 0);
  const vals = [String(tech), String(L.work.experience.length), String(L.system.certs.items.length), '3.08'];
  $('#facts').innerHTML = vals.map((v, i) => `<div class="fact" data-tilt3d="14"><b data-depth="40" data-to="${v}">${v}</b><span>${esc(L.city.facts.items[i])}</span></div>`).join('');
  $('#focus').innerHTML = L.city.focus.items.map(f => `<li><div><b>${esc(f.t)}</b><small>${esc(f.d)}</small></div></li>`).join('');
  const labels = railLabels(), N = labels.length;
  $('#stopsList').innerHTML = labels.map((l, i) => {
    const head = i === 0 || CHS[i] !== CHS[i - 1];
    return `<li style="--y:${(i / (N - 1)) * 100}%"${head ? ` class="head" data-n="0${CH_KEYS.indexOf(CHS[i]) + 1}"` : ''}><span>${esc(l)}</span></li>`;
  }).join('');
  $('#coords').textContent = C.profile.coords;
  $('#stopTot').textContent = String(N).padStart(2, '0');
  stopIdx = -1;
  updateHud(true);
}

/* scroll → a float position along the shot list (2.4 = 40% of the way from shot 2 to shot 3) */
let sTarget = 0, sView = 0, stopIdx = -1, centers = [];
function measure() {
  centers = SECTIONS.map(s => { const r = s.getBoundingClientRect(); return r.top + scrollY + r.height / 2; });
  readScroll();
}
function readScroll() {
  const c = scrollY + innerHeight / 2;
  if (!centers.length || c <= centers[0]) { sTarget = 0; return; }
  for (let i = 0; i < centers.length - 1; i++) if (c < centers[i + 1]) { sTarget = i + (c - centers[i]) / (centers[i + 1] - centers[i]); return; }
  sTarget = centers.length - 1;
}
function updateHud(force) {
  const N = NAMES.length, idx = Math.min(N - 1, Math.round(sTarget));
  $('#stopsFill').style.transform = `scaleY(${(sTarget / (N - 1)).toFixed(4)})`;
  root.classList.toggle('at-hero', sTarget < 0.3);
  if (idx === stopIdx && !force) return;
  const ch = CH_KEYS.indexOf(CHS[idx]);
  if (!force && stopIdx >= 0 && seqDone && ch > 0 && CHS[idx] !== CHS[stopIdx]) {   // back at the top the name says it all
    const t = ch ? S.L().op.ch[CHS[idx]].t : S.L().chapters[0];
    hud.waypoint(`0${ch + 1}`, '/03', t, ch ? 'right' : 'mid');   // chapter cards sit left
  }
  stopIdx = idx;
  $$('#stopsList li').forEach((li, i) => { li.classList.toggle('on', i <= idx); li.classList.toggle('cur', i === idx); });
  $('#stopNum').textContent = String(idx + 1).padStart(2, '0');
  $('#stopLabel').textContent = railLabels()[idx];
  $$('#chapterLinks a').forEach((a, i) => { a.classList.toggle('on', i === ch); if (i === ch) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
  root.dataset.op = CHS[idx];
}
let ticking = false;
addEventListener('scroll', () => {
  readScroll();
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { ticking = false; updateHud(false); kick(); });
}, { passive: true });
addEventListener('resize', measure);
if (window.ResizeObserver) new ResizeObserver(measure).observe($('#cityMain'));

// panels fade in as they arrive
const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add('in')), { threshold: 0.35 });
$$('.c-panel').forEach(s => io.observe(s));

splitTitle();
S.onLang(renderCopy);
S.start();
measure();
// arriving on #isler / #sistem (old chapter URLs redirect here): start at that chapter
// scroll position that centres a shot's section
function scrollForShot(name) { const i = NAMES.indexOf(name); return i <= 0 ? 0 : Math.max(0, centers[i] - innerHeight / 2); }
const startId = location.hash.slice(1);
if (startId === 'isler' || startId === 'sistem') requestAnimationFrame(() => {
  scrollTo(0, scrollForShot(document.getElementById(startId).dataset.shot));
  userScrolled = true; readScroll(); updateHud(false);
});

/* ================================================================ 3D world
   See DESIGN-BRIEF.md. Night city built in layers:
   sky (gradient, stars, moon, hills) → ground shader (asphalt, sidewalks, curbs, lane dashes,
   zebra crossings, street-light pools) → river with bridges → towers (podium/body/setbacks/
   spires, procedural facades) → rooftop clutter → parks → depot hub → light points (lamps,
   aviation lights, traffic streams, aircraft) → logistics layer (routes, vans, stop pins). */
let THREE, renderer, scene, camera, clock = 0;
let facadeMat, groundMat, waterMat, lightMat, ribbonMats = [], vans = [], beaconRings = [];
let traffic = null, heli = null, planes = [], waves = [];
let composer = null, bloom = null, bloomOn = true, introT = reduce ? 1 : 0;
let raf = 0, last = 0, lastPaint = 0, visible = true;
const perf = { t: 0, n: 0, stage: 0 };
const NOGUARD = /[?&]noguard/.test(location.search);   // diagnostics: keep full quality whatever the frame rate
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
const ACC = [0x4cf2ff, 0x8b7bff, 0xffb347, 0xff3fa4];
const MOBILE = matchMedia('(max-width: 760px)').matches;
const FOG = 0x0d0c22, NEAR = 650, FAR = 2400;
const STREET = 26, HW = STREET / 2;
let grid, routes, depotXZ, river, cityExt, callouts = [];
let ops = null, opsSite = null, opsE = null, street = null, edgeWin = null;
let skyCtx = null, skyTex = null, starsMat = null, tangle = null, solveStats = null;
let showT = 0, seqDone = reduce, lastSkyK = -1, userScrolled = false;
// HUD-facing state: post FX pass, delivery pings, telemetry
let fx = null, solvedShown = false, mouseMoved = false, fpsS = 60, pings = [];
const tele = { prev: null, spd: 0, ground: null, dir: null, ray: null, plane: null, ndc: null };
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
scrollTo(0, 0);
['wheel', 'touchmove', 'keydown'].forEach(ev => addEventListener(ev, () => { userScrolled = true; }, { passive: true, once: true }));
const SEQ = { wave0: 1.4, waveDur: 3.8, tangle0: 2.8, solve0: 5.2, solveDur: 2.2, chip: 7.0 };
const SKY_STOPS = [0, 0.45, 0.72, 0.86, 1];
const SKY_NIGHT = ['#010208', '#060818', '#110f2c', '#241a48', '#3a2346'];
const SKY_DUSK = ['#0b1438', '#26336e', '#58498e', '#c26a88', '#ffae70'];
const FOG_DUSK = 0x3b2f5e;
function mixHex(a, b, k) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = s => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
function paintSky(k) {
  const g = skyCtx.createLinearGradient(0, 0, 0, 512);
  SKY_STOPS.forEach((s, i) => g.addColorStop(s, mixHex(SKY_DUSK[i], SKY_NIGHT[i], k)));
  skyCtx.fillStyle = g; skyCtx.fillRect(0, 0, 4, 512);
  if (skyTex) skyTex.needsUpdate = true;
}

function ready() { root.classList.add('ready'); }
function fallback(reason) {
  root.classList.add('no-webgl');
  cancelAnimationFrame(raf); raf = 0;
  if (renderer) { renderer.dispose(); renderer.forceContextLoss(); renderer = null; }
  $('#city').style.display = 'none';
  $('#callouts') && ($('#callouts').style.display = 'none');
  hud.noWebgl();
  window.OpsUI && window.OpsUI.liveAll();
  ready();
  if (reason) console.info('City 3D off:', reason);
}

const pct = $('#loadPct');
let fake = 0;
const fakeTimer = setInterval(() => { fake = Math.min(90, fake + 3 + Math.random() * 7); pct.textContent = Math.round(fake); }, 120);

function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* ---------------------------------------------------------- shaders */
const FOG_GLSL = `
uniform vec3 uFog; uniform vec3 uCam; uniform float uNear; uniform float uFar;
uniform vec2 uWaveC; uniform float uWave;
float fogF(vec3 p) { return smoothstep(uNear, uFar, distance(p, uCam)); }
// switch-on wave: 1 behind the front, 0 ahead of it; front() is a thin bright band at the edge
float onAt(vec3 p) { return smoothstep(uWave, uWave - 50.0, length(p.xz - uWaveC)); }
float front(vec3 p) { float d = length(p.xz - uWaveC) - uWave; return exp(-d * d / 380.0) * step(1.0, uWave); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }`;

const FACADE_VS = `
varying vec3 vPos; varying vec3 vN; varying float vSeed; varying float vTop; varying float vBase;
void main() {
  mat4 m = modelMatrix * instanceMatrix;
  vec4 wp = m * vec4(position, 1.0);
  vPos = wp.xyz;
  vN = normalize(mat3(m) * normal);
  vec4 o = m * vec4(0.0, 0.0, 0.0, 1.0);
  vSeed = fract(sin(dot(o.xz, vec2(12.9898, 78.233))) * 43758.5453);
  vBase = o.y;
  vTop = (m * vec4(0.0, 1.0, 0.0, 1.0)).y;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const FACADE_FS = FOG_GLSL + `
uniform float uTime; uniform vec3 uWarm; uniform vec3 uCool; uniform vec3 uShop;
varying vec3 vPos; varying vec3 vN; varying float vSeed; varying float vTop; varying float vBase;
void main() {
  vec3 n = normalize(vN);
  float side = 1.0 - abs(n.y);
  // three facade families: blue-black glass, warm stone, violet-grey concrete
  vec3 base = vSeed < 0.45 ? vec3(0.040, 0.050, 0.090) : (vSeed < 0.75 ? vec3(0.075, 0.062, 0.068) : vec3(0.060, 0.058, 0.090));
  float diff = 0.55 + 0.45 * max(dot(n, normalize(vec3(-0.4, 0.7, 0.55))), 0.0);
  vec3 col = base * diff;
  // glass picks up the sky toward the top
  col += vec3(0.05, 0.06, 0.12) * side * smoothstep(vBase, vTop, vPos.y) * step(vSeed, 0.45);

  vec2 uv = vec2(dot(vPos.xz, vec2(-n.z, n.x)) / 3.4, (vPos.y - vBase) / 4.2);
  vec2 cell = floor(uv), f = fract(uv);
  float win = step(0.16, f.x) * step(f.x, 0.84) * step(0.2, f.y) * step(f.y, 0.78);
  float r = hash(cell + vSeed * 97.0);
  float floorLit = step(0.9, hash(vec2(cell.y, vSeed * 31.0)));        // whole office floors on
  float band = step(5.5, vPos.y) * step(vPos.y, vTop - 2.0) * onAt(vPos);
  float lit = max(step(0.66, r), floorLit) * band;
  float flick = 0.85 + 0.15 * sin(uTime * (0.3 + r * 1.2) + r * 40.0);
  float hue = hash(cell * 1.7 + vSeed);
  vec3 wc = hue < 0.72 ? uWarm : (hue < 0.95 ? uCool : vec3(1.0, 0.45, 0.75));
  wc *= 0.75 + 0.5 * hash(cell * 3.1);
  float fw = max(fwidth(uv.x), fwidth(uv.y));
  float far = smoothstep(0.3, 0.85, fw);                                  // sub-pixel windows → average glow
  float pattern = mix(win * lit * flick, 0.3 * band * (0.5 + floorLit), far);
  col += mix(wc, uWarm * 0.8, far) * pattern * side * 1.15;
  // ground-floor shop fronts
  float shop = step(vBase, 0.5) * step(vPos.y, 4.6) * step(0.8, vPos.y) * step(0.12, fract(uv.x * 0.5)) * step(fract(uv.x * 0.5), 0.88);
  col += uShop * shop * side * (0.7 + 0.3 * hash(vec2(cell.x, vSeed))) * onAt(vPos);
  // a few buildings carry a crisp roof-edge light
  col += uCool * smoothstep(vTop - 0.9, vTop - 0.25, vPos.y) * side * step(0.82, vSeed) * 1.2 * onAt(vPos);
  col += vec3(0.03, 0.035, 0.06) * smoothstep(0.7, 1.0, n.y);
  col += vec3(0.45, 0.95, 1.0) * front(vPos) * (0.3 + 0.7 * side);
  gl_FragColor = vec4(mix(col, uFog, fogF(vPos)), 1.0);
}`;

const GROUND_VS = `varying vec3 vPos; void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vPos = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const GROUND_FS = FOG_GLSL + `
uniform float uXs[16]; uniform float uZs[16]; uniform float uN; uniform float uHW; uniform vec3 uLamp; uniform vec2 uRiver;
uniform vec4 uHole; uniform float uHoleOn;
varying vec3 vPos;
void main() {
  if (uHoleOn > 0.01 && vPos.x > uHole.x && vPos.x < uHole.z && vPos.z > uHole.y && vPos.z < uHole.w) discard;   // the ops-yard hatch
  float dX = 1e4, dZ = 1e4;
  for (int i = 0; i < 16; i++) { if (float(i) >= uN) break; dX = min(dX, abs(vPos.x - uXs[i])); dZ = min(dZ, abs(vPos.z - uZs[i])); }
  float onX = 1.0 - step(uHW, dX), onZ = 1.0 - step(uHW, dZ);
  float street = max(onX, onZ);
  vec3 col = mix(vec3(0.046, 0.047, 0.066), vec3(0.022, 0.024, 0.036), street);
  // curbs
  col += vec3(0.05) * (step(uHW, dX) * step(dX, uHW + 1.0) + step(uHW, dZ) * step(dZ, uHW + 1.0)) * (1.0 - street);
  // lane dashes (not inside intersections)
  float dashX = (1.0 - step(0.45, dX)) * step(0.5, fract(vPos.z / 15.0)) * (1.0 - onZ);
  float dashZ = (1.0 - step(0.45, dZ)) * step(0.5, fract(vPos.x / 15.0)) * (1.0 - onX);
  col += vec3(0.26, 0.22, 0.14) * (dashX + dashZ);
  // zebra crossings just outside each intersection
  float zebX = onX * step(uHW + 1.0, dZ) * step(dZ, uHW + 6.0) * step(0.5, fract(vPos.x / 2.6));
  float zebZ = onZ * step(uHW + 1.0, dX) * step(dX, uHW + 6.0) * step(0.5, fract(vPos.z / 2.6));
  col += vec3(0.16) * (zebX + zebZ);
  // warm pools under street lamps (lamps sit on the curb every 46 m)
  float latX = abs(dX - (uHW + 1.5)), alongX = abs(mod(vPos.z, 46.0) - 23.0);
  float latZ = abs(dZ - (uHW + 1.5)), alongZ = abs(mod(vPos.x, 46.0) - 23.0);
  float pool = exp(-(latX * latX + alongX * alongX) / 70.0) * step(dX, 40.0) + exp(-(latZ * latZ + alongZ * alongZ) / 70.0) * step(dZ, 40.0);
  float core = 0.45 + 0.55 * smoothstep(1700.0, 300.0, length(vPos.xz));
  col += uLamp * pool * 0.16 * core * onAt(vPos);
  col += vec3(0.3, 0.85, 1.0) * front(vPos) * 0.6;
  float water = step(uRiver.x, vPos.z) * step(vPos.z, uRiver.y);
  col = mix(col, vec3(0.0), water);
  gl_FragColor = vec4(mix(col, uFog, fogF(vPos)), 1.0);
}`;

const WATER_FS = FOG_GLSL + `
uniform float uTime; uniform vec3 uLamp; varying vec3 vPos;
void main() {
  vec3 col = vec3(0.025, 0.04, 0.085) + vec3(0.02, 0.03, 0.06) * noise(vec2(vPos.x * 0.01, vPos.z * 0.04));
  float n1 = noise(vec2(vPos.x * 0.05, vPos.z * 0.28 - uTime * 0.5));
  float n2 = noise(vec2(vPos.x * 0.11 + 7.0, vPos.z * 0.6 + uTime * 0.3));
  col += uLamp * smoothstep(0.62, 1.0, n1) * 0.4 * onAt(vPos);                        // city light streaks
  col += vec3(0.25, 0.3, 0.55) * smoothstep(0.8, 1.0, n2) * 0.18;         // cool ripples
  float moon = exp(-pow((vPos.x + 420.0) / 120.0, 2.0)) * smoothstep(0.55, 1.0, noise(vec2(vPos.x * 0.08, vPos.z * 0.5 - uTime * 0.8)));
  col += vec3(0.75, 0.8, 1.0) * moon * 0.35;
  gl_FragColor = vec4(mix(col, uFog, fogF(vPos)), 1.0);
}`;

const LIGHT_VS = `
attribute vec3 color; attribute float size; attribute float phase;
uniform float uTime; uniform float uScale; uniform vec3 uCam; uniform float uNear; uniform float uFar; uniform vec2 uWaveC; uniform float uWave;
varying vec3 vColor; varying float vA;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec4 mv = viewMatrix * wp;
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(size * uScale / -mv.z, 1.2, 46.0);
  float blink = phase < 0.0 ? 1.0 : step(0.62, fract(uTime * 0.7 + phase));
  float fog = smoothstep(uNear, uFar * 1.35, distance(wp.xyz, uCam));
  float d = length(wp.xz - uWaveC);
  float gate = wp.y > 360.0 ? 1.0 : smoothstep(uWave, uWave - 50.0, d);  // aircraft stay on
  float pop = 1.0 + 1.8 * exp(-pow(d - uWave, 2.0) / 700.0) * step(1.0, uWave);
  vColor = color; vA = blink * (1.0 - fog * 0.9) * gate * pop;
}`;
const LIGHT_FS = `
varying vec3 vColor; varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d), core = smoothstep(0.16, 0.0, d);
  gl_FragColor = vec4(vColor * (a * 0.5 + core * 1.1) * vA, 1.0);
}`;

// lens: chromatic aberration (kicks with motion), a whisper of grain, vignette
const LENS_FS = `
uniform sampler2D tDiffuse; uniform float uAb; uniform float uTime; uniform float uFlash;
varying vec2 vUv;
void main() {
  vec2 c = vUv - 0.5;
  float r2 = dot(c, c);
  vec2 off = c * uAb * (0.5 + r2 * 2.0);
  vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
  float g = fract(sin(dot(gl_FragCoord.xy + fract(uTime) * 517.0, vec2(12.9898, 78.233))) * 43758.5453);
  col += (g - 0.5) * 0.008;
  col *= mix(1.0, smoothstep(1.05, 0.3, length(c * vec2(1.0, 0.8))), 0.7);
  gl_FragColor = vec4(mix(col, vec3(1.0), uFlash), 1.0);
}`;
const LENS_VS = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const RIBBON_VS = `attribute float aDist; varying float vDist; varying vec3 vPos;
void main() { vDist = aDist; vec4 wp = modelMatrix * vec4(position, 1.0); vPos = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const RIBBON_FS = FOG_GLSL + `
uniform vec3 uColor; uniform float uTime; uniform float uBase; uniform float uDraw; varying float vDist; varying vec3 vPos;
void main() {
  if (vDist > uDraw) discard;
  float head = exp(-pow(uDraw - vDist, 2.0) / 900.0) * step(uDraw, 1e8);
  float packet = smoothstep(0.84, 1.0, fract((vDist - uTime * 90.0) / 150.0));
  gl_FragColor = vec4((uColor * (uBase + packet * 0.9) + vec3(1.0) * head * 0.8) * (1.0 - fogF(vPos)), 1.0);
}`;

/* ---------------------------------------------------------- layout */
function layout(rand) {
  const lines = [0];
  for (let i = 0; i < 15; i++) lines.push(lines[i] + STREET + 52 + rand() * 34);
  const off = lines[lines.length - 1] / 2;
  const g = lines.map(v => v - off);
  return { xs: g, zs: g.slice() };
}

function makeLights(count) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute('size', new THREE.BufferAttribute(new Float32Array(count), 1));
  g.setAttribute('phase', new THREE.BufferAttribute(new Float32Array(count).fill(-1), 1));
  const pts = new THREE.Points(g, lightMat);
  pts.frustumCulled = false;
  pts.userData.n = 0;
  pts.add_ = (x, y, z, hex, size, phase = -1) => {
    const i = pts.userData.n++;
    g.attributes.position.setXYZ(i, x, y, z);
    const c = new THREE.Color(hex);
    g.attributes.color.setXYZ(i, c.r, c.g, c.b);
    g.attributes.size.setX(i, size);
    g.attributes.phase.setX(i, phase);
    return i;
  };
  pts.done = () => { g.setDrawRange(0, pts.userData.n); };
  return pts;
}

function ribbonGeometry(pts, half, y) {
  const pos = [], dist = [];
  let acc = 0;
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1], b = pts[k];
    const ux = b.x - a.x, uz = b.z - a.z, L = Math.hypot(ux, uz) || 1;
    const tx = ux / L, tz = uz / L, nx = -tz * half, nz = tx * half;
    const ax = a.x - tx * half, az = a.z - tz * half, bx = b.x + tx * half, bz = b.z + tz * half;
    pos.push(ax + nx, y, az + nz, ax - nx, y, az - nz, bx - nx, y, bz - nz, ax + nx, y, az + nz, bx - nx, y, bz - nz, bx + nx, y, bz + nz);
    dist.push(acc, acc, acc + L, acc, acc + L, acc + L);
    acc += L;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aDist', new THREE.Float32BufferAttribute(dist, 1));
  return { g, len: acc };
}

function laneOffset(list, off) {
  const out = [];
  const nrm = (p, q) => { const dx = q.x - p.x, dz = q.z - p.z, L = Math.hypot(dx, dz) || 1; return { x: -dz / L, z: dx / L }; };
  for (let j = 0; j < list.length; j++) {
    const p = list[j];
    const a = j > 0 ? nrm(list[j - 1], p) : null, b = j < list.length - 1 ? nrm(p, list[j + 1]) : null;
    if (!a || !b) { const n = a || b; out.push({ x: p.x + n.x * off, z: p.z + n.z * off }); continue; }
    const dot = a.x * b.x + a.z * b.z;
    if (dot < -0.6) out.push({ x: p.x + a.x * off, z: p.z + a.z * off }, { x: p.x + b.x * off, z: p.z + b.z * off });
    else { const f = off / (1 + dot); out.push({ x: p.x + (a.x + b.x) * f, z: p.z + (a.z + b.z) * f }); }
  }
  return out;
}

function buildRoutes(rand) {
  const { xs, zs } = grid;
  const mid = Math.floor(xs.length / 2);
  const depot = { i: mid, j: mid };
  const nodes = [];
  for (let i = 1; i < xs.length - 1; i++) for (let j = 1; j < zs.length - 2; j++) if (Math.abs(i - mid) + Math.abs(j - mid) > 2) nodes.push({ i, j });
  const pos = n => ({ x: xs[n.i], z: zs[n.j] });
  const sector = n => (Math.floor(((Math.atan2(n.j - mid, n.i - mid) + Math.PI) / (Math.PI * 2)) * 4 + 0.5) % 4);
  const groups = [[], [], [], []];
  nodes.sort(() => rand() - 0.5).forEach(n => { const s = sector(n); if (groups[s].length < 6) groups[s].push(n); });
  return groups.map((stops, ri) => {
    const left = stops.slice(), seq = [depot];
    let cur = depot;
    while (left.length) {
      let bi = 0, bd = Infinity;
      left.forEach((n, k) => { const dd = Math.abs(n.i - cur.i) + Math.abs(n.j - cur.j); if (dd < bd) { bd = dd; bi = k; } });
      cur = left.splice(bi, 1)[0]; seq.push(cur);
    }
    seq.push(depot);
    const path = [];
    for (let k = 1; k < seq.length; k++) {
      const a = seq[k - 1], b = seq[k], corner = k % 2 ? { i: b.i, j: a.j } : { i: a.i, j: b.j };
      [a, corner, b].forEach((n, m) => { if (m === 0 && path.length) return; const p = pos(n); if (!path.length || Math.hypot(p.x - path[path.length - 1].x, p.z - path[path.length - 1].z) > 0.01) path.push(p); });
    }
    return { ri, color: ACC[ri], stops: stops.map(pos), path: laneOffset(path, 2.2 + ri * 1.25) };
  });
}

/* ---------------------------------------------------------- sky */
function buildSky(rand) {
  const sky = document.createElement('canvas'); sky.width = 4; sky.height = 512;
  skyCtx = sky.getContext('2d');
  skyTex = new THREE.CanvasTexture(sky); skyTex.colorSpace = THREE.SRGBColorSpace;
  paintSky(reduce ? 1 : 0);
  scene.background = skyTex;

  const N = MOBILE ? 500 : 1100, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const a = rand() * Math.PI * 2, e = 0.12 + Math.pow(rand(), 0.8) * 1.3, R = 4200;
    pos.set([Math.cos(a) * Math.cos(e) * R, Math.sin(e) * R, Math.sin(a) * Math.cos(e) * R], i * 3);
  }
  const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)),
    starsMat = new THREE.PointsMaterial({ color: 0xcfd6ff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: reduce ? 0.8 : 0.12, fog: false, depthWrite: false }));
  scene.add(stars);

  const mc = document.createElement('canvas'); mc.width = mc.height = 256;
  const m = mc.getContext('2d');
  const g1 = m.createRadialGradient(128, 128, 0, 128, 128, 128);
  g1.addColorStop(0, 'rgba(255,248,230,1)'); g1.addColorStop(0.16, 'rgba(255,244,220,1)'); g1.addColorStop(0.2, 'rgba(200,190,255,.35)'); g1.addColorStop(1, 'rgba(120,110,220,0)');
  m.fillStyle = g1; m.fillRect(0, 0, 256, 256);
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(mc), fog: false, depthWrite: false, transparent: true }));
  moon.scale.set(900, 900, 1);
  moon.position.set(-1500, 1150, -3300);
  scene.add(moon);

  // distant hills with village lights
  const hc = document.createElement('canvas'); hc.width = 2048; hc.height = 256;
  const h = hc.getContext('2d');
  [['#0a0b1c', 0.55, 90], ['#07081a', 0.35, 140]].forEach(([fill, base, amp], layer) => {
    h.fillStyle = fill; h.beginPath(); h.moveTo(0, 256);
    for (let x = 0; x <= 2048; x += 16) {
      const y = 256 * base + Math.sin(x * 0.004 + layer * 2) * amp * 0.35 + Math.sin(x * 0.013 + layer) * amp * 0.18 + (rand() - 0.5) * 8;
      h.lineTo(x, y);
    }
    h.lineTo(2048, 256); h.closePath(); h.fill();
  });
  for (let i = 0; i < 260; i++) { h.fillStyle = `rgba(255,${180 + (rand() * 60) | 0},120,${0.4 + rand() * 0.5})`; h.fillRect(rand() * 2048, 180 + rand() * 76, 1.5, 1.5); }
  const htex = new THREE.CanvasTexture(hc); htex.colorSpace = THREE.SRGBColorSpace; htex.wrapS = THREE.RepeatWrapping; htex.repeat.x = 2;
  const hills = new THREE.Mesh(new THREE.CylinderGeometry(3600, 3600, 520, 64, 1, true).translate(0, 200, 0), new THREE.MeshBasicMaterial({ map: htex, transparent: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  scene.add(hills);
}

/* ---------------------------------------------------------- city */
function build() {
  const rand = seeded(2026);
  grid = layout(rand);
  const { xs, zs } = grid;
  cityExt = xs[xs.length - 1];
  river = [zs[zs.length - 1] + 70, zs[zs.length - 1] + 190];
  const mi = Math.floor(xs.length / 2);
  depotXZ = { x: xs[mi], z: zs[mi] };

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(FOG, NEAR, FAR);
  buildSky(rand);

  const fogU = () => ({ uFog: { value: new THREE.Color(FOG) }, uCam: { value: new THREE.Vector3() }, uNear: { value: NEAR }, uFar: { value: FAR },
    uWaveC: { value: new THREE.Vector2(depotXZ.x, depotXZ.z) }, uWave: { value: reduce ? 1e5 : 0 } });
  lightMat = new THREE.ShaderMaterial({ vertexShader: LIGHT_VS, fragmentShader: LIGHT_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { ...fogU(), uTime: { value: 0 }, uScale: { value: innerHeight } } });

  // ground
  groundMat = new THREE.ShaderMaterial({ vertexShader: GROUND_VS, fragmentShader: GROUND_FS,
    uniforms: { ...fogU(), uXs: { value: xs.concat(Array(16 - xs.length).fill(0)) }, uZs: { value: zs.concat(Array(16 - zs.length).fill(0)) }, uN: { value: xs.length }, uHW: { value: HW }, uLamp: { value: new THREE.Color(0xff9a4d) }, uRiver: { value: new THREE.Vector2(river[0], river[1]) },
      uHole: { value: new THREE.Vector4() }, uHoleOn: { value: 0 } } });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(7200, 7200), groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // river + bridges
  waterMat = new THREE.ShaderMaterial({ vertexShader: GROUND_VS, fragmentShader: WATER_FS, uniforms: { ...fogU(), uTime: { value: 0 }, uLamp: { value: new THREE.Color(0xffa860) } } });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(7200, river[1] - river[0]), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.3, (river[0] + river[1]) / 2);
  scene.add(water);
  const deckMat = new THREE.MeshBasicMaterial({ color: 0x0b0c16 });
  [-1, 2, 5, 8, 11, 14].forEach(i => {
    if (!xs[i]) return;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(STREET + 6, 4, river[1] - river[0] + 30), deckMat);
    deck.position.set(xs[i], 4, (river[0] + river[1]) / 2);
    scene.add(deck);
  });

  // ---- towers
  const parts = [], roofUnits = [], spires = [], avi = [], trees = [];
  const parks = new Set(['3,4', '11,9', '5,11', '10,3']);
  const depotCell = `${mi},${mi}`, yardCell = `${mi - 1},${mi}`, hqCell = `${mi - 1},${mi - 1}`;
  const cellOf = (i, j) => { const x0 = xs[i] + HW + 4, x1 = xs[i + 1] - HW - 4, z0 = zs[j] + HW + 4, z1 = zs[j + 1] - HW - 4; return { x0, x1, z0, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0 }; };
  const yardC = cellOf(mi - 1, mi), hqC = cellOf(mi - 1, mi - 1);
  const HQ = { cx: hqC.cx, cz: hqC.cz, w: hqC.w * 0.8, d: hqC.d * 0.8, h: 236 };
  const PANSIS = { x: xs[5], z: river[1] + 80, w: 44, d: 44, h: 120 };
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < zs.length - 1; j++) {
      const key = `${i},${j}`;
      const x0 = xs[i] + HW + 4, x1 = xs[i + 1] - HW - 4, z0 = zs[j] + HW + 4, z1 = zs[j + 1] - HW - 4;
      if (parks.has(key)) {
        const lawn = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshBasicMaterial({ color: 0x0c2418 }));
        lawn.rotation.x = -Math.PI / 2; lawn.position.set((x0 + x1) / 2, 0.4, (z0 + z1) / 2); scene.add(lawn);
        for (let k = 0; k < 26; k++) trees.push([x0 + 4 + rand() * (x1 - x0 - 8), z0 + 4 + rand() * (z1 - z0 - 8), 4 + rand() * 4]);
        continue;
      }
      if (key === depotCell || key === yardCell) continue;
      if (key === hqCell) {   // Anadolu Birlik HQ: podium + tower; ops3d.js adds the media facade, crown and ranks
        parts.push([HQ.cx, 0, HQ.cz, hqC.w, 14, hqC.d], [HQ.cx, 14, HQ.cz, HQ.w, HQ.h - 14, HQ.d]);
        avi.push([HQ.cx + HQ.w * 0.4, HQ.h + 1, HQ.cz + HQ.d * 0.4], [HQ.cx - HQ.w * 0.4, HQ.h + 1, HQ.cz - HQ.d * 0.4]);
        continue;
      }
      const nx = 1 + Math.floor(rand() * 2.3), nz = 1 + Math.floor(rand() * 2.3);
      for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
        if (rand() < 0.06) continue;
        const lx0 = x0 + ((x1 - x0) * a) / nx + 2, lx1 = x0 + ((x1 - x0) * (a + 1)) / nx - 2;
        const lz0 = z0 + ((z1 - z0) * b) / nz + 2, lz1 = z0 + ((z1 - z0) * (b + 1)) / nz - 2;
        const cx = (lx0 + lx1) / 2, cz = (lz0 + lz1) / 2, w = lx1 - lx0, d = lz1 - lz0;
        const dist = Math.hypot(cx, cz);
        const downtown = Math.exp(-(dist * dist) / (2 * 250 * 250));
        let h = 12 + rand() * 24 + downtown * (40 + rand() * 170);
        const landmark = downtown > 0.8 && rand() < 0.2;
        if (landmark) h += 110;
        if (h > 70) {
          const pod = 9 + rand() * 7;
          parts.push([cx, 0, cz, w, pod, d]);
          let bw = w * (0.72 + rand() * 0.1), bd = d * (0.72 + rand() * 0.1), y = pod;
          const body = h * (h > 140 ? 0.66 : 1);
          parts.push([cx, y, cz, bw, body - y, bd]); y = body;
          if (h > 140) {
            bw *= 0.74; bd *= 0.74;
            const t1 = h * 0.86; parts.push([cx, y, cz, bw, t1 - y, bd]); y = t1;
            bw *= 0.7; bd *= 0.7; parts.push([cx, y, cz, bw, h - y, bd]); y = h;
          }
          if (landmark) { spires.push([cx, h, cz, 46]); avi.push([cx, h + 46, cz]); }
          else if (h > 110) avi.push([cx + bw * 0.4, h + 1, cz + bd * 0.4]);
          if (rand() < 0.6) roofUnits.push([cx + (rand() - 0.5) * bw * 0.5, h, cz + (rand() - 0.5) * bd * 0.5, 3 + rand() * 4, 2 + rand() * 2]);
        } else {
          parts.push([cx, 0, cz, w, h, d]);
          if (rand() < 0.7) roofUnits.push([cx + (rand() - 0.5) * w * 0.5, h, cz + (rand() - 0.5) * d * 0.5, 2.5 + rand() * 4, 1.6 + rand() * 2]);
          if (rand() < 0.3) roofUnits.push([cx + (rand() - 0.5) * w * 0.5, h, cz + (rand() - 0.5) * d * 0.5, 3, 4.5]);
        }
      }
    }
  }
  parts.push([PANSIS.x, 0, PANSIS.z, PANSIS.w, PANSIS.h, PANSIS.d]);
  facadeMat = new THREE.ShaderMaterial({ vertexShader: FACADE_VS, fragmentShader: FACADE_FS, uniforms: { ...fogU(), uTime: { value: 0 }, uWarm: { value: new THREE.Color(0xffc27a) }, uCool: { value: new THREE.Color(0x9fe7ff) }, uShop: { value: new THREE.Color(0xffb070) } } });
  const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), Sc = new THREE.Vector3();
  const towers = new THREE.InstancedMesh(box, facadeMat, parts.length);
  parts.forEach(([x, y, z, w, h, d], i) => towers.setMatrixAt(i, M.compose(P.set(x, y, z), Q, Sc.set(w, h, d))));
  scene.add(towers);
  const darkMat = new THREE.MeshBasicMaterial({ color: 0x0c0d18 });
  const units = new THREE.InstancedMesh(box, darkMat, roofUnits.length);
  roofUnits.forEach(([x, y, z, s, h], i) => units.setMatrixAt(i, M.compose(P.set(x, y, z), Q, Sc.set(s, h, s))));
  scene.add(units);
  const spireGeo = new THREE.CylinderGeometry(0.5, 2.4, 1, 6).translate(0, 0.5, 0);
  const spireMesh = new THREE.InstancedMesh(spireGeo, new THREE.MeshBasicMaterial({ color: 0x1a1c30 }), spires.length);
  spires.forEach(([x, y, z, h], i) => spireMesh.setMatrixAt(i, M.compose(P.set(x, y, z), Q, Sc.set(1, h, 1))));
  scene.add(spireMesh);
  const treeMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0x1d5a3d }), trees.length);
  trees.forEach(([x, z, s], i) => treeMesh.setMatrixAt(i, M.compose(P.set(x, s, z), Q, Sc.set(s, s * 1.2, s))));
  scene.add(treeMesh);

  // ---- depot hub: warehouse, loading bays, parked trucks, roof sign
  const dx0 = xs[mi] + HW + 6, dx1 = xs[mi + 1] - HW - 6, dz0 = zs[mi] + HW + 6, dz1 = zs[mi + 1] - HW - 6;
  const dcx = (dx0 + dx1) / 2, dcz = (dz0 + dz1) / 2, dw = dx1 - dx0, dd = dz1 - dz0;
  const hall = new THREE.Mesh(new THREE.BoxGeometry(dw, 20, dd * 0.62).translate(0, 10, 0), new THREE.MeshBasicMaterial({ color: 0x141627 }));
  hall.position.set(dcx, 0, dz0 + dd * 0.31);
  scene.add(hall);
  const roofEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(dw, 20, dd * 0.62).translate(0, 10, 0)), new THREE.LineBasicMaterial({ color: 0x4cf2ff, transparent: true, opacity: 0.6 }));
  roofEdge.position.copy(hall.position);
  scene.add(roofEdge);
  const bayMat = new THREE.MeshBasicMaterial({ color: 0xffc27a });
  for (let k = 0; k < 6; k++) {
    const bay = new THREE.Mesh(new THREE.PlaneGeometry(dw / 9, 9), bayMat);
    bay.position.set(dx0 + dw * (0.12 + k * 0.152), 5, dz0 + dd * 0.62 + 0.2);
    scene.add(bay);
  }
  const truckMat = new THREE.MeshBasicMaterial({ color: 0x7d829c });
  for (let k = 0; k < 5; k++) {
    const truck = new THREE.Mesh(new THREE.BoxGeometry(7, 7, 18).translate(0, 3.5, 0), truckMat);
    truck.position.set(dx0 + dw * (0.12 + k * 0.152) + (k % 2 ? 1 : 0), 0, dz0 + dd * 0.62 + 14 + (k % 3) * 2);
    scene.add(truck);
  }
  const sc = document.createElement('canvas'); sc.width = 512; sc.height = 128;
  const sx2 = sc.getContext('2d');
  sx2.fillStyle = '#4cf2ff'; sx2.font = '800 78px Unbounded, Inter, sans-serif'; sx2.textAlign = 'center'; sx2.textBaseline = 'middle';
  sx2.fillText('TRP · DEPO', 256, 66);
  const signTex = new THREE.CanvasTexture(sc); signTex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(dw * 0.7, dw * 0.7 / 4), new THREE.MeshBasicMaterial({ map: signTex, transparent: true, depthWrite: false }));
  sign.position.set(dcx, 20 + dw * 0.09 + 2, dz0 + dd * 0.62 - 2);
  scene.add(sign);

  // ---- light points: street lamps, park lamps, aviation, traffic, aircraft
  const lamps = makeLights(5200);
  const LAMP = 0xffb46a, reach = 1500;
  xs.forEach(x => { for (let z = -reach; z <= reach; z += 46) { if (z > river[0] - 8 && z < river[1] + 8 && !bridgeAt(x)) continue; lamps.add_(x - HW - 1.5, 7, z, LAMP, 3.4); lamps.add_(x + HW + 1.5, 7, z + 23, LAMP, 3.4); } });
  zs.forEach(z => { for (let x = -reach; x <= reach; x += 46) { lamps.add_(x, 7, z - HW - 1.5, LAMP, 3.4); lamps.add_(x + 23, 7, z + HW + 1.5, LAMP, 3.4); } });
  // river promenade
  for (let x = -reach; x <= reach; x += 30) { lamps.add_(x, 5, river[0] - 4, 0xfff0d8, 4); lamps.add_(x + 15, 5, river[1] + 4, 0xfff0d8, 4); }
  trees.forEach(([x, z], k) => { if (k % 4 === 0) lamps.add_(x + 3, 4, z + 3, 0xfff2c8, 3.5); });
  avi.forEach(([x, y, z]) => lamps.add_(x, y + 1, z, 0xff2a2a, 12, Math.random()));
  lamps.done();
  scene.add(lamps);

  const NT = MOBILE ? 140 : 300;
  traffic = { pts: makeLights(NT), cars: [] };
  for (let i = 0; i < NT; i++) {
    const alongX = rand() < 0.5;
    const line = (alongX ? zs : xs)[Math.floor(rand() * xs.length)];
    const dir = rand() < 0.5 ? 1 : -1;
    const c = { alongX, line: line + dir * 4.5, dir, s: (rand() * 2 - 1) * reach, v: 26 + rand() * 40 };
    traffic.cars.push(c);
    traffic.pts.add_(0, 1.6, 0, dir > 0 ? 0xfff6e6 : 0xff3344, 5.5);
  }
  traffic.pts.done();
  scene.add(traffic.pts);

  // aircraft: helicopter with searchlight over downtown, two planes
  heli = { pts: makeLights(2), cone: null, spot: null };
  heli.pts.add_(0, 0, 0, 0xffffff, 9, 0.1); heli.pts.add_(0, 0, 0, 0xff3344, 9, 0.6); heli.pts.done();
  scene.add(heli.pts);
  heli.cone = new THREE.Mesh(new THREE.ConeGeometry(34, 260, 24, 1, true).translate(0, -130, 0), new THREE.MeshBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.05, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  scene.add(heli.cone);
  heli.spot = new THREE.Mesh(new THREE.CircleGeometry(34, 32), new THREE.MeshBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending }));
  heli.spot.rotation.x = -Math.PI / 2;
  scene.add(heli.spot);
  planes = [0, 1].map(k => { const p = makeLights(2); p.add_(0, 0, 0, 0xff3344, 8, k * 0.3); p.add_(0, 0, 0, 0x33ff88, 8, k * 0.3 + 0.5); p.done(); scene.add(p); return { p, ph: k * 0.5, z: k ? -900 : 600, y: k ? 980 : 1150, dir: k ? 1 : -1 }; });

  // ---- logistics layer
  routes = buildRoutes(rand);
  ribbonMats = []; vans = [];
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  routes.forEach(r => {
    [[8, 0.6, 0.08, false], [2.2, 1.3, 0.85, true]].forEach(([half, y, base, depth]) => {
      const { g, len } = ribbonGeometry(r.path, half, y);
      const mat = new THREE.ShaderMaterial({ vertexShader: RIBBON_VS, fragmentShader: RIBBON_FS, transparent: true, depthWrite: false, depthTest: depth, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        uniforms: { ...fogU(), uColor: { value: new THREE.Color(r.color) }, uTime: { value: 0 }, uBase: { value: base }, uDraw: { value: reduce ? 1e9 : 0 } } });
      mat.userData = { len, ri: r.ri };
      r.len = len;
      ribbonMats.push(mat);
      scene.add(new THREE.Mesh(g, mat));
    });
    const cum = [0];
    for (let k = 1; k < r.path.length; k++) cum.push(cum[k - 1] + Math.hypot(r.path[k].x - r.path[k - 1].x, r.path[k].z - r.path[k - 1].z));
    const van = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 5.5).translate(0, 2.5, 0), new THREE.MeshBasicMaterial({ color: r.color }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: r.color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.set(54, 54, 1);
    scene.add(van, halo);
    vans.push({ r, van, halo, cum, len: cum[cum.length - 1], t: (r.ri / 4) * cum[cum.length - 1], speed: 0 });
  });
  // the naive plan: each rep visits their stops in random order, straight lines
  // drawn as glowing straight bands so the tangle reads against a lit city
  let naive = 0, opt = 0;
  const tangleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  tangle = new THREE.Group();
  tangle.userData.mat = tangleMat;   // not .material: compile() would treat the group as drawable
  routes.forEach(r => {
    const order = [depotXZ].concat(r.stops.slice().sort(() => rand() - 0.5), [depotXZ]);
    for (let k = 1; k < order.length; k++) naive += Math.abs(order[k].x - order[k - 1].x) + Math.abs(order[k].z - order[k - 1].z);
    for (let k = 1; k < r.path.length; k++) opt += Math.hypot(r.path[k].x - r.path[k - 1].x, r.path[k].z - r.path[k - 1].z);
    const bands = new THREE.Mesh(ribbonGeometry(order, 2.2, 12).g, tangleMat);
    bands.renderOrder = 5;
    tangle.add(bands);
  });
  scene.add(tangle);
  solveStats = { naive, opt };
  const stops = routes.flatMap(r => r.stops.map(s => ({ s, c: r.color })));
  const pins = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.6, 1.6, 18, 8).translate(0, 9, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), stops.length);
  stops.forEach((p, i) => { pins.setMatrixAt(i, M.compose(P.set(p.s.x, 0, p.s.z), Q, Sc.set(1, 1, 1))); pins.setColorAt(i, new THREE.Color(p.c)); });
  scene.add(pins);
  const pinTops = makeLights(stops.length);
  stops.forEach(p => pinTops.add_(p.s.x, 19, p.s.z, p.c, 14));
  pinTops.done();
  scene.add(pinTops);

  // depot beacon: slim, quiet
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 6, 700, 16, 1, true).translate(0, 350, 0), new THREE.MeshBasicMaterial({ color: 0x4cf2ff, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  beacon.position.set(depotXZ.x + HW + 6, 0, depotXZ.z + HW + 6);
  scene.add(beacon);
  for (let k = 0; k < 2; k++) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(12, 13.5, 64), new THREE.MeshBasicMaterial({ color: 0x4cf2ff, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(depotXZ.x, 1.5, depotXZ.z); ring.userData.phase = k / 2;
    beaconRings.push(ring); scene.add(ring);
  }

  // where along its loop each van passes each of its stops → delivery events + pings
  vans.forEach(v => {
    v.stopTs = v.r.stops.map(s => {
      let bk = 0, bd = Infinity;
      v.r.path.forEach((p, k) => { const d = Math.hypot(p.x - s.x, p.z - s.z); if (d < bd) { bd = d; bk = k; } });
      const t = Math.max(1, v.cum[bk] - (HW + 14));
      const f = vanFrame({ cum: v.cum, r: v.r, t }), L = Math.hypot(f.dx, f.dz) || 1, ux = f.dx / L, uz = f.dz / L;
      const cx = Math.abs(ux) > 0.5 ? f.x : grid.xs.reduce((a, b) => Math.abs(b - f.x) < Math.abs(a - f.x) ? b : a);
      const cz = Math.abs(uz) > 0.5 ? f.z : grid.zs.reduce((a, b) => Math.abs(b - f.z) < Math.abs(a - f.z) ? b : a);
      const kerb = { x: cx - uz * (HW + 3), z: cz + ux * (HW + 3) };
      return { t, s, kerb, gi: stops.findIndex(q => q.s === s) };
    }).sort((a, b) => a.t - b.t);
    v.stopTs.forEach(st => {
      pins.setMatrixAt(st.gi, M.compose(P.set(st.kerb.x, 0, st.kerb.z), Q, Sc.set(0.7, 0.75, 0.7)));
      pinTops.geometry.attributes.position.setXYZ(st.gi, st.kerb.x, 14.5, st.kerb.z);
    });
    v.lap = 1;
  });
  pins.instanceMatrix.needsUpdate = true; pinTops.geometry.attributes.position.needsUpdate = true;
  pings = Array.from({ length: 10 }, () => {
    const m = new THREE.Mesh(new THREE.RingGeometry(10, 12.5, 48), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2; m.visible = false; m.userData.t = 9;
    scene.add(m);
    return m;
  });

  opsSite = { yard: yardC, hq: HQ, pansis: PANSIS, hall: { cx: dcx, cz: dz0 + dd * 0.31, w: dw, d: dd * 0.62, h: 20, bayX: dx0 + dw * (0.12 + 2 * 0.152), bayZ: dz0 + dd * 0.62 } };

  function bridgeAt(x) { return [-1, 2, 5, 8, 11, 14].some(i => xs[i] === x); }
}

/* ---------------------------------------------------------- callouts (HTML anchored to 3D) */
const CALLOUT = { tr: { rep: 'Plasiyer', stops: 'durak', depot: 'Depo · TRP' }, en: { rep: 'Rep', stops: 'stops', depot: 'Depot · TRP' } };
function renderCallouts() {
  const box = $('#callouts');
  if (!box || !routes) return;
  const T = CALLOUT[S.lang];
  box.innerHTML = routes.map(r => `<span class="co" style="--c:#${r.color.toString(16).padStart(6, '0')}"><i></i>${T.rep} ${String.fromCharCode(65 + r.ri)} · ${r.stops.length} ${T.stops}</span>`).join('') + `<span class="co depot"><i></i>${T.depot}</span>`;
  callouts = $$('.co', box);
}
const proj = { v: null };
function placeCallouts() {
  if (!callouts.length) return;
  const show = activeShot === 'out' && introT >= 1;
  $('#callouts').classList.toggle('on', show);
  if (!show) return;
  proj.v = proj.v || new THREE.Vector3();
  // the actual copy on screen (headline, sub, label) — labels must not land on it
  const copy = $$('.op-card').map(e => e.getBoundingClientRect()).filter(r => r.bottom > 0 && r.top < innerHeight);
  const pts = vans.map(v => v.van.position).concat([new THREE.Vector3(depotXZ.x, 40, depotXZ.z)]);
  pts.forEach((p, i) => {
    proj.v.copy(p); proj.v.y += i < vans.length ? 10 : 0;
    proj.v.project(camera);
    const el = callouts[i];
    const sx = ((proj.v.x + 1) / 2) * innerWidth, sy = ((1 - proj.v.y) / 2) * innerHeight;
    const w = el.offsetWidth || 160, h = (el.offsetHeight || 26) + 18;
    const box = { l: sx - w / 2, r: sx + w / 2, t: sy - h, b: sy };
    const overCopy = copy.some(c => box.l < c.right + 8 && box.r > c.left - 8 && box.t < c.bottom + 8 && box.b > c.top - 8);
    const off = proj.v.z > 1 || Math.abs(proj.v.x) > 1.05 || Math.abs(proj.v.y) > 1.05 || overCopy;
    el.style.opacity = off ? 0 : 1;
    el.style.transform = `translate3d(${((proj.v.x + 1) / 2) * innerWidth}px, ${((1 - proj.v.y) / 2) * innerHeight}px, 0)`;
  });
}
S.onLang(renderCallouts);

/* ---------------------------------------------------------- click: shockwave + new pin */
function shockwave(clientX, clientY) {
  if (!renderer) return;
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1), camera);
  const hit = new THREE.Vector3();
  if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) return;
  const color = ACC[Math.floor(Math.random() * 4)];
  const ring = new THREE.Mesh(new THREE.RingGeometry(8, 11, 64), new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(hit.x, 2, hit.z);
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 22, 8).translate(0, 11, 0), new THREE.MeshBasicMaterial({ color }));
  pin.position.set(hit.x, 300, hit.z);
  scene.add(ring, pin);
  waves.push({ ring, pin, t: 0 });
  if (waves.length > 8) { const w = waves.shift(); scene.remove(w.ring, w.pin); }
  window.Sound && window.Sound.blip(520 + Math.random() * 300);
  shockwave.n = (shockwave.n || routes.reduce((n, r) => n + r.stops.length, 0)) + 1;
  hud.burst(clientX, clientY, color);
  hud.event('added', { ri: 0, n: shockwave.n, color, x: hit.x, z: hit.z });
  kick();
}

/* ---------------------------------------------------------- camera path */
const tmpA = {}, tmpB = {};
const cam3 = { x: 1, z: 0 };
function vanFrame(v) {
  let k = 1;
  while (k < v.cum.length - 1 && v.cum[k] < v.t) k++;
  const a = v.r.path[k - 1], b = v.r.path[k];
  const f = (v.t - v.cum[k - 1]) / (v.cum[k] - v.cum[k - 1] || 1);
  return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f, dx: b.x - a.x, dz: b.z - a.z };
}
function key(i, out) {
  const t = clock, { xs, zs } = grid, mi = Math.floor(xs.length / 2);
  const name = NAMES[i];
  if (ops && ops.shots[name]) { ops.shots[name](t, out); return; }
  switch (['hero', 'about', 'facts', 'focus'].indexOf(name)) {
    case 0: { const a = 0.75 + t * 0.03; out.p.set(Math.cos(a) * 1050, 760, Math.sin(a) * 1050 + 150); out.l.set(0, 30, 120); break; }
    case 1: out.p.set(xs[mi + 2], 52, zs[mi + 5]); out.l.set(xs[mi + 1], 150, zs[mi] - 40); break;              // down the avenue, looking up at downtown
    case 2: { const a = 3.6 + t * 0.05; out.p.set(Math.cos(a) * 430, 250, Math.sin(a) * 430); out.l.set(0, 150, 0); break; }
    case 3: {
      const f = vanFrame(vans[0]);
      const L = Math.hypot(f.dx, f.dz) || 1;
      cam3.x += (f.dx / L - cam3.x) * 0.04; cam3.z += (f.dz / L - cam3.z) * 0.04;
      out.p.set(f.x - cam3.x * 160 - cam3.z * 40, 150, f.z - cam3.z * 160 + cam3.x * 40);
      out.l.set(f.x + cam3.x * 90, 0, f.z + cam3.z * 90);
      break;
    }
    default: { const a = 1.9 + t * 0.015; out.p.set(Math.cos(a) * 700, 1500, Math.sin(a) * 700 + 300); out.l.set(0, 0, 160); }
  }
}
const ease = x => x * x * (3 - 2 * x);
// which shots the camera is between, eased: weights[name] (0…1), the settled shot and how long it has been settled
const weights = {};
let activeShot = null, activeSince = 0, fly = null;
const HOLD = { cab: 0.24, edge: 0.22, term: 0.22, skills: 0.2 };   // how much of the scroll around a shot holds still
const hold = n => HOLD[n] ?? 0.15;
const below = v => v.y < -2;
// move between two camera positions: through the hatch when one is underground, else in an arc over the roofs
function travel(a, b, f, out) {
  if (ops && below(a) !== below(b)) {
    const hx = ops.hatchPt.x, hz = ops.hatchPt.z, down = below(b), yA = down ? 70 : -20, yB = down ? -20 : 70;
    if (f < 0.35) out.lerpVectors(a, tmpA.h.set(hx, yA, hz), ease(f / 0.35));
    else if (f < 0.65) out.set(hx, yA + (yB - yA) * ease((f - 0.35) / 0.3), hz);
    else out.lerpVectors(tmpA.h.set(hx, yB, hz), b, ease((f - 0.65) / 0.35));
    return;
  }
  const d = Math.hypot(a.x - b.x, a.z - b.z), low = Math.min(a.y, b.y);
  out.lerpVectors(a, b, f);
  if (!below(a) && low < 290 && d > 60) out.y += Math.sin(Math.PI * f) * (290 - low) * Math.min(1, d / 320);
}
const lastLook = { v: null };
function placeCamera() {
  if (!tmpA.p) { tmpA.p = new THREE.Vector3(); tmpA.l = new THREE.Vector3(); tmpB.p = new THREE.Vector3(); tmpB.l = new THREE.Vector3(); tmpA.h = new THREE.Vector3(); lastLook.v = new THREE.Vector3(); }
  for (const k in weights) weights[k] = 0;
  if (fly) {   // a jump: one smooth flight from wherever we are to the target shot
    key(fly.idx, tmpB);
    const f = ease(Math.min(1, fly.t / fly.dur));
    travel(fly.p0, tmpB.p, f, camera.position);
    lastLook.v.copy(fly.l0).lerp(tmpB.l, ease(Math.min(1, f * 1.25)));
    if (f > 0.97) weights[NAMES[fly.idx]] = 1;
    if (activeShot !== null) { activeShot = null; activeSince = 0; }
    camera.lookAt(lastLook.v);
    return;
  }
  const N = NAMES.length, s = sView, i = Math.min(N - 2, Math.floor(s));
  const h0 = hold(NAMES[i]), h1 = hold(NAMES[i + 1]);
  const f = ease(Math.min(1, Math.max(0, (s - i - h0) / (1 - h0 - h1))));
  key(i, tmpA); key(i + 1, tmpB);
  weights[NAMES[i]] = 1 - f; weights[NAMES[i + 1]] = f;
  const settled = f < 0.25 ? NAMES[i] : f > 0.75 ? NAMES[i + 1] : null;
  if (settled !== activeShot) { activeShot = settled; activeSince = 0; }
  travel(tmpA.p, tmpB.p, f, camera.position);
  const look = lastLook.v.copy(tmpA.l).lerp(tmpB.l, f);
  mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
  const sway = camera.position.y < 0 || weights.cab > 0.3 || weights.edge > 0.3 || weights.term > 0.3 ? 0.08 : 1;   // tight spaces barely sway
  camera.position.x += mouse.x * 26 * sway; camera.position.y += mouse.y * 14 * sway;
  if (introT < 1) {
    const k = 1 - Math.pow(1 - introT, 3);
    camera.position.lerpVectors(tmpB.p.set(Math.cos(clock * 0.2) * 120, 3600, Math.sin(clock * 0.2) * 120 + 1), camera.position, k);
  }
  camera.lookAt(look);
}

/* ---------------------------------------------------------- jumps (chapter nav, back to orbit): fly, don't cut */
function flyTo(idx, keepScroll) {
  if (!lastLook.v) return;
  key(idx, tmpB);
  const d = camera.position.distanceTo(tmpB.p);
  fly = { t: 0, dur: Math.min(3.2, Math.max(1.6, 1.3 + d / 1100)), p0: camera.position.clone(), l0: lastLook.v.clone(), idx };
  if (!keepScroll) { scrollTo(0, scrollForShot(NAMES[idx])); readScroll(); }
  sView = idx; updateHud(false);
  window.Sound && window.Sound.blip(300);
  kick();
}

/* ---------------------------------------------------------- the switch-on sequence */
const smooth = x => x * x * (3 - 2 * x);
const clamp01 = x => Math.max(0, Math.min(1, x));
const _fog = { a: null, b: null, c: null };
function runSequence(dt) {
  showT += dt; window.__t = showT;
  if (userScrolled && sTarget > 0.3) showT = Math.max(showT, SEQ.chip + 0.6);   // a real scroll skips ahead
  const w = smooth(clamp01((showT - SEQ.wave0) / SEQ.waveDur));
  const wave = w >= 1 ? 1e5 : w * 2400;
  const mats = [facadeMat, groundMat, waterMat, lightMat, ...ribbonMats];
  mats.forEach(m => { m.uniforms.uWave.value = wave; });
  // sky + fog: dusk → night as the city lights up
  if (Math.abs(w - lastSkyK) > 0.004) {
    lastSkyK = w;
    paintSky(w);
    _fog.a = _fog.a || new THREE.Color(FOG_DUSK); _fog.b = _fog.b || new THREE.Color(FOG); _fog.c = _fog.c || new THREE.Color();
    _fog.c.copy(_fog.a).lerp(_fog.b, w);
    scene.fog.color.copy(_fog.c);
    mats.forEach(m => m.uniforms.uFog.value.copy(_fog.c));
    starsMat.opacity = 0.12 + 0.68 * w;
  }
  // chaos: random-order lines, then they dissolve into the solved routes
  const tin = clamp01((showT - SEQ.tangle0) / 0.5), tout = clamp01((showT - SEQ.solve0) / 0.8);
  tangle.userData.mat.opacity = 0.7 * tin * (1 - tout) * (0.8 + 0.2 * Math.sin(showT * 16));
  ribbonMats.forEach(m => {
    const s = smooth(clamp01((showT - SEQ.solve0 - m.userData.ri * 0.2) / SEQ.solveDur));
    m.uniforms.uDraw.value = s >= 1 ? 1e9 : s * m.userData.len;
  });
  hud.seq(showT, SEQ, w);
  vans.forEach(v => { const on = showT > SEQ.solve0 + 0.6 + v.r.ri * 0.2; v.van.visible = on; v.halo.visible = on; });
  if (showT > SEQ.chip) showSolved();
  if (showT > SEQ.chip + 0.5) { seqDone = true; mats.forEach(m => { m.uniforms.uWave.value = 1e5; }); paintSky(1); tangle.userData.mat.opacity = 0; }
}
const SOLVE = {
  tr: (a, b, p) => `Rotalar çözüldü · rastgele sıra <b>${a} km</b> → optimize <b>${b} km</b> · <b>%${p}</b> daha kısa <small>(demo şehir)</small>`,
  en: (a, b, p) => `Routes solved · random order <b>${a} km</b> → optimised <b>${b} km</b> · <b>${p}%</b> shorter <small>(demo city)</small>`
};
function solveText() {
  if (!solveStats) return;
  const a = (solveStats.naive / 1000).toFixed(1), b = (solveStats.opt / 1000).toFixed(1);
  const p = Math.round((1 - solveStats.opt / solveStats.naive) * 100);
  $('#solveText').innerHTML = SOLVE[S.lang](a, b, p);
}
function showSolved(quick) {
  if (solvedShown) return;
  solvedShown = true;
  solveText();
  hud.solved(quick, () => $('#solve').classList.add('on'));
}
function replay() {
  showT = SEQ.wave0 - 0.3; seqDone = false; lastSkyK = -1; solvedShown = false;
  hud.replay();
  $('#solve').classList.remove('on');
  ribbonMats.forEach(m => { m.uniforms.uDraw.value = 0; });
  kick();
}
S.onLang(() => { if ($('#solve').classList.contains('on')) solveText(); });

/* ---------------------------------------------------------- loop */
function frame(now) {
  raf = 0;
  if (!renderer || !visible) return;
  if (lastPaint && now - lastPaint < 1000 / 61) { raf = requestAnimationFrame(frame); return; }
  lastPaint = now;
  if (perf.stage < 2 && last && !NOGUARD && now - last < 250) {   // one-off stalls (shader compiles, tab switches) don't count
    perf.t += now - last; perf.n++;
    if (perf.t > 2500) {
      const fps = perf.n / (perf.t / 1000);
      if (fps < 45 && composer && composer.renderTarget1.samples > 0) { [composer.renderTarget1, composer.renderTarget2].forEach(r => { r.samples = 0; r.dispose(); }); perf.t = 0; perf.n = 0; console.info('City: MSAA off (fps ' + fps.toFixed(0) + ')'); }
      else if (fps < 40 && renderer.getPixelRatio() > 1) { renderer.setPixelRatio(1); resize(); perf.t = 0; perf.n = 0; console.info('City: pixel ratio 1 (fps ' + fps.toFixed(0) + ')'); }
      else if (fps < (bloomOn ? 40 : 24)) {
        if (bloomOn) { bloomOn = false; perf.t = 0; perf.n = 0; perf.stage = 1; console.info('City: bloom off (fps ' + fps.toFixed(0) + ')'); }
        else { fallback('low frame rate'); return; }
      } else perf.stage = 2;
    }
  }
  // DOM reads (card and copy rects) before anything writes to the DOM this frame: no forced layouts
  if (ops) drawLeader();
  placeCallouts();
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
  last = now;
  if (!reduce) clock += dt;
  if (introT < 1) introT = Math.min(1, introT + dt / 2.8);

  if (!fly) {
    sView += (sTarget - sView) * (reduce ? 1 : 1 - Math.exp(-dt * 4.4));
    if (Math.abs(sTarget - sView) > 2.5 && !reduce) flyTo(Math.round(sTarget), true);   // a scrollbar drag: fly, don't sweep through every shot
  }
  activeSince += dt;
  placeCamera();

  const k = 1 - Math.pow(1 - introT, 3), far = FAR + (1 - k) * 4200;
  [facadeMat, groundMat, waterMat, lightMat, ...ribbonMats].forEach(m => { m.uniforms.uCam.value.copy(camera.position); m.uniforms.uFar.value = far; if (m.uniforms.uTime) m.uniforms.uTime.value = clock; });
  scene.fog.far = far;
  if (!seqDone) runSequence(dt);

  const live = seqDone || solvedShown;
  if (street) street.update(dt, clock, vans[0].van.position, edgeWin);
  vans.forEach(v => {
    const prev = v.t;
    v.t = (v.t + dt * v.speed) % v.len;
    if (v.t < prev) v.next = 0;
    const f = vanFrame(v);
    v.van.position.set(f.x, 0, f.z); v.van.rotation.y = -v.yaw;
    v.halo.position.set(f.x, 6, f.z);
    if (!live) return;
    if (v.t < prev) { v.lap++; hud.event('depot', { ri: v.r.ri, lap: v.lap, color: v.r.color, x: depotXZ.x, z: depotXZ.z }); }
    v.stopTs.forEach((st, k) => {
      if ((prev < st.t && v.t >= st.t) || (v.t < prev && (st.t > prev || st.t <= v.t))) {
        hud.event('deliver', { ri: v.r.ri, k: k + 1, n: v.stopTs.length, color: v.r.color, x: st.kerb.x, z: st.kerb.z });
        ping(st.kerb.x, st.kerb.z, v.r.color);
      }
    });
  });
  for (const m of pings) {
    if (m.userData.t > 1.6) continue;
    m.userData.t += dt;
    const q = m.userData.t / 1.6;
    m.scale.setScalar(1 + q * 4); m.material.opacity = 0.9 * (1 - q); m.visible = q < 1;
  }
  const tp = traffic.pts.geometry.attributes.position, reach = 1500;
  traffic.cars.forEach((c, i) => {
    c.s += c.dir * c.v * dt;
    if (c.s > reach) c.s = -reach; else if (c.s < -reach) c.s = reach;
    if (c.alongX) tp.setXYZ(i, c.s, 1.6, c.line); else tp.setXYZ(i, c.line, 1.6, c.s);
  });
  tp.needsUpdate = true;

  const ha = clock * 0.18, hx = Math.cos(ha) * 320, hz = Math.sin(ha) * 260;
  const hp = heli.pts.geometry.attributes.position;
  hp.setXYZ(0, hx, 270, hz); hp.setXYZ(1, hx - 3, 268, hz); hp.needsUpdate = true;
  heli.cone.position.set(hx, 270, hz);
  heli.cone.rotation.set(Math.sin(clock * 0.7) * 0.25, 0, Math.cos(clock * 0.5) * 0.25);
  heli.spot.position.set(hx + Math.cos(clock * 0.5) * 60, 1.2, hz - Math.sin(clock * 0.7) * 60);
  planes.forEach(pl => {
    const x = (((clock * 45 * pl.dir + pl.ph * 4000) % 6000) + 6000) % 6000 - 3000;
    const a = pl.p.geometry.attributes.position;
    a.setXYZ(0, x, pl.y, pl.z); a.setXYZ(1, x + 12 * pl.dir, pl.y, pl.z + 6); a.needsUpdate = true;
  });
  beaconRings.forEach(r => { const q = (clock * 0.45 + r.userData.phase) % 1; r.scale.setScalar(1 + q * 5); r.material.opacity = 0.5 * (1 - q); });
  for (let i = waves.length - 1; i >= 0; i--) {
    const w = waves[i]; w.t += dt;
    w.ring.scale.setScalar(1 + w.t * 20); w.ring.material.opacity = Math.max(0, 1 - w.t / 1.4);
    w.pin.position.y = Math.max(0, 300 - w.t * w.t * 900);
  }
  if (ops) {
    ops.update(dt, clock, now, weights, activeShot, activeSince);
    groundMat.uniforms.uHoleOn.value = ops.hatchOpen();
    if ((weights.edge || 0) > 0.85) { opsE.detections = ops.detect(camera, innerWidth, innerHeight); hud.edge(opsE.detections, now); }
    else { opsE.detections = null; hud.edge(null); }
  }
  if (bloom) bloom.strength = 0.28 + 0.5 * Math.min(1, Math.max(0, (camera.position.y - 120) / 600));

  // lens: aberration from the intro dive, scroll lag (camera catching up) and jumps
  if (fly) { fly.t += dt; if (fly.t >= fly.dur) { fly = null; readScroll(); sView = sTarget; } }
  if (fx) {
    const lag = Math.min(1, Math.abs(sTarget - sView) * 1.5);
    const intro = 1 - introT;
    fx.uniforms.uAb.value = intro * 0.02 + lag * 0.006 + (fly ? Math.sin(Math.PI * Math.min(1, fly.t / fly.dur)) * 0.012 : 0);
    fx.uniforms.uTime.value = clock;
    fx.uniforms.uFlash.value = 0;
  }

  // telemetry for the HUD
  fpsS += ((dt ? 1 / dt : 60) - fpsS) * 0.05;
  tele.dir = tele.dir || new THREE.Vector3();
  camera.getWorldDirection(tele.dir);
  if (tele.prev && dt) tele.spd += (camera.position.distanceTo(tele.prev) / dt * 3.6 - tele.spd) * 0.08;
  tele.prev = (tele.prev || new THREE.Vector3()).copy(camera.position);
  if (mouseMoved) {
    mouseMoved = false;
    tele.ray = tele.ray || new THREE.Raycaster(); tele.plane = tele.plane || new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); tele.ndc = tele.ndc || new THREE.Vector2();
    tele.ray.setFromCamera(tele.ndc.set(mouse.px * 2 - 1, -(mouse.py * 2 - 1)), camera);
    const hit = new THREE.Vector3();
    tele.ground = tele.ray.ray.intersectPlane(tele.plane, hit) && hit.length() < 4000 ? { x: hit.x, z: hit.z } : null;
  }
  hud.frame(now, {
    hdg: ((Math.atan2(tele.dir.x, -tele.dir.z) * 180 / Math.PI) + 360) % 360,
    alt: camera.position.y, spd: Math.min(999, tele.spd), fps: Math.min(99, fpsS), clock,
    cam: { x: camera.position.x, z: camera.position.z, dx: tele.dir.x, dz: tele.dir.z },
    ground: tele.ground,
    vans: vans.map(v => {
      const done = v.stopTs.filter(s => s.t <= v.t).length;
      return { x: v.van.position.x, z: v.van.position.z, c: '#' + v.r.color.toString(16).padStart(6, '0'), prog: v.t / v.len, done, n: v.stopTs.length, eta: (v.len - v.t) / v.speed };
    })
  });

  if (composer && bloomOn) composer.render(); else renderer.render(scene, camera);
  raf = requestAnimationFrame(frame);
}
// a line from the live card to the thing in the scene that triggered it
function drawLeader() {
  const sec = activeShot ? SECTIONS[NAMES.indexOf(activeShot)] : null;
  const an = sec && sec.dataset.anchor;
  if (!an || !sec.classList.contains('live') || !ops.anchors[an]) { hud.leader(null); return; }
  proj.l = (proj.l || new THREE.Vector3()).copy(ops.anchors[an]()).project(camera);
  if (proj.l.z > 1 || Math.abs(proj.l.x) > 1.1 || Math.abs(proj.l.y) > 1.1) { hud.leader(null); return; }
  hud.leader((proj.l.x + 1) / 2 * innerWidth, (1 - proj.l.y) / 2 * innerHeight, $('.op-card', sec));
}
function ping(x, z, color) {
  const m = pings.find(p => p.userData.t > 1.6);
  if (!m) return;
  m.userData.t = 0; m.visible = true;
  m.position.set(x, 1.8, z);
  m.material.color.setHex(color);
}
function kick() { if (renderer && visible && !raf) { last = 0; raf = requestAnimationFrame(frame); } }

function resize() {
  if (!renderer) return;
  renderer.setSize(innerWidth, innerHeight, false);
  if (composer) { composer.setSize(innerWidth, innerHeight); bloom.resolution.set(innerWidth / 2, innerHeight / 2); }
  camera.aspect = innerWidth / innerHeight;
  camera.fov = innerWidth < 700 ? 62 : 46;
  camera.updateProjectionMatrix();
  if (ops) ops.layoutCab();
  if (lightMat) lightMat.uniforms.uScale.value = innerHeight * renderer.getPixelRatio() * 0.9;
}

/* ---------------------------------------------------------- boot */
(async () => {
  try {
    THREE = await import('three');
    const dpr = Math.min(devicePixelRatio || 1, MOBILE ? 1 : 1.25);
    renderer = new THREE.WebGLRenderer({ canvas: $('#city'), antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(dpr);
    camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 2, 9000);
    build();
    hud.setScene({ xs: grid.xs, zs: grid.zs, river, routes, depot: depotXZ, ext: cityExt, stats: solveStats });
    const people = makePeople(THREE), mi = Math.floor(grid.xs.length / 2);
    edgeWin = { line: grid.zs[mi + 2], a: grid.xs[mi - 4], b: grid.xs[mi + 2] };
    street = createTraffic({ THREE, scene, xs: grid.xs, zs: grid.zs, HW, vans, makeLights, people, MOBILE });
    opsE = { people, traffic: street, edgeWin, facadeMat, gauges: (e, n, k) => hud.gauges(e, n, k),
      fogFrom: v => [facadeMat, groundMat, waterMat, lightMat, ...ribbonMats].forEach(m => m.uniforms.uCam.value.copy(v)),
      THREE, scene, camera, renderer, xs: grid.xs, zs: grid.zs, mi: Math.floor(grid.xs.length / 2), HW, river, routes, vans, depotXZ, makeLights, ACC, MOBILE, reduce,
      ...opsSite, vanFrame, skills: S.content.skills, pick: S.pick, L: S.L, fire: (n, v) => window.OpsUI && window.OpsUI.fire(n, v) };
    ops = buildOps(opsE);
    groundMat.uniforms.uHole.value.set(...ops.hatchRect);
    S.onLang(() => ops.relabel());
    renderCallouts();
    $('#solveReplay').addEventListener('click', e => { e.stopPropagation(); replay(); });
    if (reduce) showSolved();
    try {
      const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }, { ShaderPass }] = await Promise.all([
        import('three/addons/postprocessing/EffectComposer.js'), import('three/addons/postprocessing/RenderPass.js'),
        import('three/addons/postprocessing/UnrealBloomPass.js'), import('three/addons/postprocessing/OutputPass.js'),
        import('three/addons/postprocessing/ShaderPass.js')
      ]);
      const crt = new THREE.WebGLRenderTarget(innerWidth * dpr, innerHeight * dpr, { type: THREE.HalfFloatType, samples: MOBILE ? 0 : 2 });
      composer = new EffectComposer(renderer, crt);
      composer.addPass(new RenderPass(scene, camera));
      bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.7, 0.45, 0.32);
      composer.addPass(bloom);
      fx = new ShaderPass({ vertexShader: LENS_VS, fragmentShader: LENS_FS,
        uniforms: { tDiffuse: { value: null }, uAb: { value: 0 }, uTime: { value: 0 }, uFlash: { value: 0 } } });
      composer.addPass(fx);
      composer.addPass(new OutputPass());
    } catch (e) { composer = null; console.info('City: bloom unavailable', e && e.message); }
    resize();
    addEventListener('click', e => { if (e.target.closest('a, button, .glass, header, .stops, input')) return; shockwave(e.clientX, e.clientY); });
    addEventListener('resize', resize);
    addEventListener('pointermove', e => {
      mouse.tx = (e.clientX / innerWidth - 0.5) * 2; mouse.ty = -(e.clientY / innerHeight - 0.5) * 2;
      mouse.px = e.clientX / innerWidth; mouse.py = e.clientY / innerHeight; mouseMoved = true;
    }, { passive: true });
    // chapter links (and "back to orbit") fly the camera there
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href*="#"]');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const id = a.getAttribute('href').split('#')[1];
      if (!['sehir', 'isler', 'sistem'].includes(id)) return;
      e.preventDefault();
      history.replaceState(null, '', '#' + id);
      if (reduce || !renderer) { document.getElementById(id).scrollIntoView(); return; }
      flyTo(NAMES.indexOf(document.getElementById(id).dataset.shot));
    });
    document.addEventListener('visibilitychange', () => { visible = !document.hidden; kick(); });
    sView = sTarget;
    renderer.compile(scene, camera);
    clearInterval(fakeTimer);
    root.classList.remove('no-webgl');   // late arrival after the safety net
    $('#city').style.display = '';
    pct.textContent = '100';
    setTimeout(ready, 250);
    kick();
  } catch (err) {
    clearInterval(fakeTimer);
    fallback(err && err.message);
  }
})();
