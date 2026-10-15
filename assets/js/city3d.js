/* Scroll-driven 3D story of a route (Three.js, lazy-loaded).
   setProgress(0…1) drives four acts on one street plan:
     1. demand     – the city rises from the depot outwards, stop pins drop in
     2. clustering – pins take their vehicle colour, territory discs glow
     3. routing    – route ribbons draw along the streets
     4. field      – vehicles drive, the camera swoops down and orbits
   Renders only while on screen, capped at ~60 fps, and hands back to the SVG
   fallback if the machine can't hold ~24 fps. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FRAME_MS = 1000 / 61;
const W = 640, H = 480;

let plan = null;
let renderer = null, scene = null, camera = null;
let host = null, canvas = null;
let raf = 0, visible = false, last = 0, lastPaint = 0, clock = 0;
let disabled = false;
const perf = { t: 0, n: 0, done: false };
let target = 0, prog = 0;

let towers = null, towerMesh = null, edgeMat = null;
let pins = null, pinMesh = null, discs = [], ribbons = [], vehicles = [], depotRing = null;
let lastRise = -1, lastPin = -1, lastCluster = -1;

const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting && !document.hidden; kick(); }, { rootMargin: '120px' });
const ro = new ResizeObserver(() => resize());

const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const color = n => new THREE.Color(cssVar(n) || '#888888');
const clamp01 = v => Math.max(0, Math.min(1, v));
const ease = t => 1 - Math.pow(1 - t, 3);
const smooth = t => t * t * (3 - 2 * t);

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------------------------------------------------------- scene */
function disposeScene() {
  if (!scene) return;
  scene.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
  });
  scene = null;
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(255,255,255,.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3();
const X = x => x - W / 2, Z = y => y - H / 2;

function build() {
  disposeScene();
  const light = document.documentElement.dataset.theme === 'light';
  const bg = color('--bg');
  const accents = ['--accent', '--accent-2', '--accent-3', '--accent-4'].map(color);

  scene = new THREE.Scene();
  scene.background = bg;
  scene.fog = new THREE.Fog(bg, 850, 1700);
  scene.add(new THREE.HemisphereLight(0xffffff, light ? 0xd8d4c8 : 0x1a1d2a, light ? 1.5 : 1.25));
  const sun = new THREE.DirectionalLight(0xffffff, light ? 1.3 : 1.6);
  sun.position.set(-260, 420, 180);
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W + 1600, H + 1600), new THREE.MeshLambertMaterial({ color: light ? 0xd9d6cc : 0x0d0f15 }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // blocks + lots
  const { xs, ys } = plan.grid;
  const rand = seeded(42);
  const plates = [];
  towers = [];
  const dx = plan.depot.x, dz = plan.depot.y;
  const maxD = Math.hypot(W, H) / 2;
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const x0 = xs[i] + 6, x1 = xs[i + 1] - 6, y0 = ys[j] + 6, y1 = ys[j + 1] - 6;
      if (x1 - x0 < 12 || y1 - y0 < 12) continue;
      plates.push({ x0, x1, y0, y1 });
      const nx = Math.max(1, Math.min(3, Math.round((x1 - x0) / 34)));
      const ny = Math.max(1, Math.min(3, Math.round((y1 - y0) / 34)));
      for (let a = 0; a < nx; a++) {
        for (let b = 0; b < ny; b++) {
          if (rand() < 0.14) continue;
          const lx0 = x0 + ((x1 - x0) * a) / nx + 3, lx1 = x0 + ((x1 - x0) * (a + 1)) / nx - 3;
          const ly0 = y0 + ((y1 - y0) * b) / ny + 3, ly1 = y0 + ((y1 - y0) * (b + 1)) / ny - 3;
          const mx = (lx0 + lx1) / 2, my = (ly0 + ly1) / 2;
          const dd = Math.hypot(mx - dx, my - dz);
          const downtown = Math.exp(-(dd ** 2) / (2 * 150 ** 2));
          const h = 5 + rand() * 13 + downtown * (16 + rand() * 38);
          towers.push({ x: mx, y: my, w: lx1 - lx0, d: ly1 - ly0, h, dn: Math.min(1, dd / maxD) });
        }
      }
    }
  }

  const plateMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: light ? 0xeceae3 : 0x161923 }), plates.length);
  plates.forEach((b, i) => {
    P.set(X((b.x0 + b.x1) / 2), 1, Z((b.y0 + b.y1) / 2));
    S.set(b.x1 - b.x0, 2, b.y1 - b.y0);
    plateMesh.setMatrixAt(i, M.compose(P, Q, S));
  });
  scene.add(plateMesh);

  towerMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: light ? 0xfaf9f5 : 0x2a3142 }), towers.length);
  towerMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(towerMesh);

  const edge = new Float32Array(towers.length * 24 * 3);
  let e = 0;
  const pushEdge = (a, b) => { edge.set(a, e); edge.set(b, e + 3); e += 6; };
  towers.forEach(t => {
    const xa = X(t.x) - t.w / 2, xb = X(t.x) + t.w / 2, za = Z(t.y) - t.d / 2, zb = Z(t.y) + t.d / 2, y0 = 2, y1 = 2 + t.h;
    const c = [[xa, za], [xb, za], [xb, zb], [xa, zb]];
    for (let k = 0; k < 4; k++) {
      const [ax, az] = c[k], [bx, bz] = c[(k + 1) % 4];
      pushEdge([ax, y1, az], [bx, y1, bz]);
      pushEdge([ax, y0, az], [bx, y0, bz]);
      pushEdge([ax, y0, az], [ax, y1, az]);
    }
  });
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.BufferAttribute(edge, 3));
  edgeMat = new THREE.LineBasicMaterial({ color: light ? 0xb4b0a4 : 0x3b4357, transparent: true, opacity: 0 });
  scene.add(new THREE.LineSegments(edgeGeo, edgeMat));

  // territory discs (act 2)
  discs = plan.routes.map(r => {
    const pts = r.stops;
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length, cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const rad = Math.max(40, ...pts.map(p => Math.hypot(p.x - cx, p.y - cy))) + 26;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(rad, 64), new THREE.MeshBasicMaterial({
      color: accents[r.color], transparent: true, opacity: 0, depthWrite: false,
      blending: light ? THREE.NormalBlending : THREE.AdditiveBlending
    }));
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(X(cx), 2.4, Z(cy));
    const ring = new THREE.Mesh(new THREE.RingGeometry(rad - 1.5, rad, 96), new THREE.MeshBasicMaterial({
      color: accents[r.color], transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide
    }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(X(cx), 2.6, Z(cy));
    scene.add(disc, ring);
    return { disc, ring };
  });

  // route ribbons (act 3)
  ribbons = [];
  vehicles = [];
  const glow = glowTexture();
  plan.routes.forEach((r, ri) => {
    const pts = r.pts;
    const ribbon = (wHalf, y) => {
      const verts = [];
      for (let k = 1; k < pts.length; k++) {
        const a = pts[k - 1], b = pts[k];
        const ux = b.x - a.x, uy = b.y - a.y, L = Math.hypot(ux, uy) || 1;
        const tx = ux / L, ty = uy / L, nx = -ty * wHalf, ny = tx * wHalf;
        const ax = a.x - tx * wHalf, ay = a.y - ty * wHalf, bx = b.x + tx * wHalf, by = b.y + ty * wHalf;
        const A = [X(ax + nx), y, Z(ay + ny)], B = [X(ax - nx), y, Z(ay - ny)];
        const C2 = [X(bx - nx), y, Z(by - ny)], D = [X(bx + nx), y, Z(by + ny)];
        verts.push(...A, ...B, ...C2, ...A, ...C2, ...D);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      const total = verts.length / 3;
      geo.setDrawRange(0, 0);
      ribbons.push({ geo, total, route: ri });
      return geo;
    };
    scene.add(new THREE.Mesh(ribbon(7, 0.8), new THREE.MeshBasicMaterial({
      color: accents[r.color], transparent: true, opacity: light ? 0.18 : 0.22, depthWrite: false,
      blending: light ? THREE.NormalBlending : THREE.AdditiveBlending
    })));
    scene.add(new THREE.Mesh(ribbon(2.4, 3.2), new THREE.MeshBasicMaterial({ color: accents[r.color], side: THREE.DoubleSide })));

    const cum = [0];
    for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
    const car = new THREE.Mesh(new THREE.BoxGeometry(11, 5, 6.5), new THREE.MeshBasicMaterial({ color: accents[r.color] }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: accents[r.color], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.set(46, 46, 1);
    car.visible = halo.visible = false;
    scene.add(car, halo);
    vehicles.push({ car, halo, pts, cum, len: cum[cum.length - 1], t: (ri / plan.routes.length) * cum[cum.length - 1] });
  });

  // stop pins (act 1 drop-in, act 2 recolour)
  pins = plan.routes.flatMap(r => r.stops.map(st => ({ st, c: accents[r.color] })));
  pins.forEach((p, i) => { p.delay = i / pins.length; });
  pinMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(3, 3, 14, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }), pins.length);
  pinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const white = light ? new THREE.Color(0x3a3f4c) : new THREE.Color(0xe8eaf0);
  pins.forEach((p, i) => { p.white = white; pinMesh.setColorAt(i, white); });
  scene.add(pinMesh);

  const depot = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 14), new THREE.MeshLambertMaterial({ color: color('--text') }));
  depot.position.set(X(dx), 9, Z(dz));
  depotRing = new THREE.Mesh(new THREE.RingGeometry(10, 11.5, 48), new THREE.MeshBasicMaterial({ color: color('--text'), transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
  depotRing.rotation.x = -Math.PI / 2;
  depotRing.position.set(X(dx), 3, Z(dz));
  scene.add(depot, depotRing);

  lastRise = lastPin = lastCluster = -1;
}

/* ---------------------------------------------------------------- acts */
const KEYS = [ // p, yaw, pitch (from vertical), distance multiplier
  [0.00, -0.25, 0.14, 1.06],
  [0.30, 0.30, 0.42, 1.00],
  [0.58, 0.85, 0.72, 0.92],
  [0.80, 1.45, 0.98, 0.74],
  [1.00, 2.05, 1.06, 0.66]
];
function cameraAt(p, time) {
  let k = 0;
  while (k < KEYS.length - 2 && p > KEYS[k + 1][0]) k++;
  const a = KEYS[k], b = KEYS[k + 1];
  const f = smooth(clamp01((p - a[0]) / (b[0] - a[0])));
  const yaw = a[1] + (b[1] - a[1]) * f + Math.sin(time * 0.25) * 0.04;
  const pitch = a[2] + (b[2] - a[2]) * f;
  const dist = (a[3] + (b[3] - a[3]) * f) * 980 * Math.min(1.35, Math.max(0.9, 1.45 / camera.aspect));
  camera.position.set(Math.sin(yaw) * Math.sin(pitch) * dist, Math.cos(pitch) * dist, Math.cos(yaw) * Math.sin(pitch) * dist);
  camera.lookAt(0, 0, 0);
}

function applyActs(p, time, dt) {
  // act 1a: city rises from the depot outwards
  const rise = reduce ? 1 : clamp01(p / 0.14);
  if (Math.abs(rise - lastRise) > 0.0005) {
    lastRise = rise;
    towers.forEach((t, i) => {
      const r = ease(clamp01(rise * 1.7 - t.dn * 0.7));
      // unrisen towers sit below the plates so they never z-fight with them
      const h = Math.max(0.01, t.h * r);
      P.set(X(t.x), r < 0.02 ? -20 : 2 + h / 2, Z(t.y));
      S.set(t.w, h, t.d);
      towerMesh.setMatrixAt(i, M.compose(P, Q, S));
    });
    towerMesh.instanceMatrix.needsUpdate = true;
    edgeMat.opacity = 0.75 * clamp01((rise - 0.85) / 0.15);
  }

  // act 1b: pins drop in
  const pinP = reduce ? 1 : clamp01((p - 0.06) / 0.16);
  if (Math.abs(pinP - lastPin) > 0.0005) {
    lastPin = pinP;
    pins.forEach((pn, i) => {
      const k = ease(clamp01(pinP * 1.8 - pn.delay * 0.8));
      P.set(X(pn.st.x), 9 + (1 - k) * 60, Z(pn.st.y));
      S.setScalar(Math.max(0.001, k));
      pinMesh.setMatrixAt(i, M.compose(P, Q, S));
    });
    pinMesh.instanceMatrix.needsUpdate = true;
  }

  // act 2: clustering colours + territory discs
  const cl = reduce ? 1 : clamp01((p - 0.28) / 0.16);
  if (Math.abs(cl - lastCluster) > 0.0005) {
    lastCluster = cl;
    const tmp = new THREE.Color();
    pins.forEach((pn, i) => pinMesh.setColorAt(i, tmp.copy(pn.white).lerp(pn.c, smooth(cl))));
    pinMesh.instanceColor.needsUpdate = true;
  }
  const discFade = cl * (1 - 0.6 * clamp01((p - 0.62) / 0.12));
  discs.forEach(({ disc, ring }, i) => {
    const pulse = 0.85 + 0.15 * Math.sin(time * 1.6 + i);
    disc.material.opacity = 0.16 * discFade * pulse;
    ring.material.opacity = 0.7 * discFade;
  });

  // act 3: ribbons draw along the streets
  const rt = reduce ? 1 : clamp01((p - 0.46) / 0.24);
  ribbons.forEach(r => {
    const local = ease(clamp01(rt * 1.4 - r.route * 0.1));
    r.geo.setDrawRange(0, Math.floor((local * r.total) / 6) * 6);
  });

  // act 4: vehicles roll
  const go = reduce ? 1 : clamp01((p - 0.72) / 0.08);
  vehicles.forEach(v => {
    const on = go > 0.001;
    v.car.visible = v.halo.visible = on;
    if (!on) return;
    v.t = (v.t + dt * 70) % v.len;
    let k = 1;
    while (k < v.cum.length - 1 && v.cum[k] < v.t) k++;
    const a = v.pts[k - 1], b = v.pts[k];
    const f = (v.t - v.cum[k - 1]) / (v.cum[k] - v.cum[k - 1] || 1);
    const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
    v.car.position.set(X(x), 4.6, Z(y));
    v.car.rotation.y = -Math.atan2(b.y - a.y, b.x - a.x);
    v.car.scale.setScalar(ease(go));
    v.halo.position.set(X(x), 6, Z(y));
    v.halo.material.opacity = go;
  });

  if (depotRing && !reduce) {
    const k = (time % 2.2) / 2.2;
    depotRing.scale.setScalar(1 + k * 2.4);
    depotRing.material.opacity = 0.6 * (1 - k);
  }
}

/* ---------------------------------------------------------------- loop */
function frame(now) {
  raf = 0;
  if (!visible || !renderer) return;
  if (lastPaint && now - lastPaint < FRAME_MS) { raf = requestAnimationFrame(frame); return; }
  lastPaint = now;
  if (!perf.done && last) {
    perf.t += now - last; perf.n++;
    if (perf.t > 2000) {
      perf.done = true;
      if (perf.n / (perf.t / 1000) < 24) { degrade(); return; }
    }
  }
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
  last = now;
  clock += dt;

  prog += (target - prog) * (reduce ? 1 : 0.12);
  cameraAt(prog, clock);
  applyActs(prog, clock, dt);
  renderer.render(scene, camera);
  raf = requestAnimationFrame(frame);
}

function kick() {
  if (!visible || raf || !renderer) return;
  last = 0;
  raf = requestAnimationFrame(frame);
}

function resize() {
  if (!renderer || !host) return;
  const w = host.clientWidth, h = host.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function degrade() {
  disabled = true;
  cancelAnimationFrame(raf);
  raf = 0;
  if (host) { io.unobserve(host); ro.unobserve(host); host.classList.remove('has-3d'); }
  if (canvas) canvas.remove();
  disposeScene();
  if (renderer) { renderer.dispose(); renderer.forceContextLoss(); renderer = null; }
  console.info('3D story: low frame rate, switched to the SVG fallback.');
}

/* ---------------------------------------------------------------- api */
export function mount(el, data) {
  if (!el || disabled) return false;
  if (!renderer) {
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch (err) {
      disabled = true;
      return false;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    canvas = renderer.domElement;
    canvas.className = 'city3d';
    canvas.setAttribute('aria-hidden', 'true');
    camera = new THREE.PerspectiveCamera(34, 1.5, 1, 5000);
  }
  if (data && data !== plan) { plan = data; build(); }
  if (host && host !== el) { io.unobserve(host); ro.unobserve(host); }
  host = el;
  host.appendChild(canvas);
  host.classList.add('has-3d');
  io.observe(host);
  ro.observe(host);
  resize();
  kick();
  return true;
}

export function setProgress(p) { target = clamp01(p); kick(); }

export function refresh() {
  if (disabled || !renderer || !plan) return;
  build();
  resize();
  kick();
}

document.addEventListener('visibilitychange', () => { if (document.hidden) visible = false; else if (host) { io.unobserve(host); io.observe(host); } });
