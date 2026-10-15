/* Chapter 02 — 3D additions in the brutalist style:
   1. extruded "TRP" letters (black faces, acid-orange sides) that turn with
      the pointer and with scroll, casting a hard shadow on the paper
   2. "Fig. 1" becomes a paper diorama: raised street bars, route tubes
      (one acid, three ink), stop cubes and a depot, tilting with the pointer
   Each scene renders only while visible (≤60 fps) and steps back to the
   flat version if WebGL is missing or the machine is too slow. */
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const INK = 0x0b0b0b, ACID = 0xff4d00, PAPER = 0xedeae2;
const clamp01 = v => Math.max(0, Math.min(1, v));

function makeView(host, canvas, opts = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // crisp, print-like shadows
  const scene = new THREE.Scene();
  const camera = opts.ortho
    ? new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400)
    : new THREE.PerspectiveCamera(opts.fov || 30, 1, 0.1, 400);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d2c2, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun, sun.target);
  const view = { renderer, scene, camera, sun, host, canvas, visible: false, raf: 0, last: 0, t: 0, update: null, perf: { t: 0, n: 0, done: false }, pointer: { x: 0, y: 0, tx: 0, ty: 0 } };
  view.resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    if (opts.ortho) {
      const a = w / h, s = opts.ortho;
      Object.assign(camera, { left: -s * a, right: s * a, top: s, bottom: -s });
    } else camera.aspect = w / h;
    camera.updateProjectionMatrix();
    view.draw();
  };
  view.draw = () => { renderer.render(scene, camera); };
  const frame = now => {
    view.raf = 0;
    if (!view.visible) return;
    if (view.last && now - view.last < 1000 / 61) { view.raf = requestAnimationFrame(frame); return; }
    const dt = view.last ? Math.min(0.05, (now - view.last) / 1000) : 0;
    if (view.last && !view.perf.done) {
      view.perf.t += now - view.last; view.perf.n++;
      if (view.perf.t > 2500) {
        view.perf.done = true;
        if (view.perf.n / (view.perf.t / 1000) < 24) { view.fail(); return; }
      }
    }
    view.last = now; view.t += dt;
    const p = view.pointer;
    p.x += (p.tx - p.x) * 0.08; p.y += (p.ty - p.y) * 0.08;
    view.update && view.update(view.t, dt);
    view.draw();
    view.raf = requestAnimationFrame(frame);
  };
  view.kick = () => { if (view.visible && !view.raf) { view.last = 0; view.raf = requestAnimationFrame(frame); } };
  view.fail = () => {
    cancelAnimationFrame(view.raf); view.raf = 0; view.visible = false;
    host.classList.remove('is-3d');
    renderer.dispose();
    console.info('Work 3D: low frame rate, flat version kept.');
  };
  new IntersectionObserver(([e]) => { view.visible = e.isIntersecting && !document.hidden; view.kick(); }, { rootMargin: '100px' }).observe(host);
  new ResizeObserver(() => view.resize()).observe(host);
  addEventListener('pointermove', e => {
    const r = host.getBoundingClientRect();
    view.pointer.tx = clamp01((e.clientX - r.left) / r.width) * 2 - 1;
    view.pointer.ty = clamp01((e.clientY - r.top) / r.height) * 2 - 1;
  }, { passive: true });
  return view;
}

/* ================================================================ 1. TRP letters */
async function trpLetters() {
  const host = document.querySelector('.trp-name');
  if (!host) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'trp3d';
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);
  const v = makeView(host, canvas, { fov: 24 });
  if (!v) { canvas.remove(); return; }

  const font = await new FontLoader().loadAsync('assets/vendor/three/examples/fonts/helvetiker_bold.typeface.json');
  const geo = new TextGeometry('TRP', { font, size: 3, height: 1.4, curveSegments: 6, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 2 });
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  geo.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, -(bb.max.z + bb.min.z) / 2);
  // group 0 = faces, group 1 = sides
  const mats = [new THREE.MeshStandardMaterial({ color: INK, roughness: 0.55 }), new THREE.MeshStandardMaterial({ color: ACID, roughness: 0.45 })];
  const word = new THREE.Mesh(geo, mats);
  word.castShadow = true;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(bb.max.x - bb.min.x + 0.6, 0.38, 1.4), new THREE.MeshStandardMaterial({ color: ACID, roughness: 0.5 }));
  bar.position.set(0, -(bb.max.y - bb.min.y) / 2 - 0.55, 0.2);
  bar.castShadow = true;
  const group = new THREE.Group();
  group.add(word, bar);
  v.scene.add(group);
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.12 }));
  paper.position.z = -2.4;
  paper.receiveShadow = true;
  v.scene.add(paper);
  v.sun.position.set(-6, 8, 10);
  Object.assign(v.sun.shadow.camera, { left: -10, right: 10, top: 8, bottom: -8, near: 1, far: 40 });
  // fit the word's width (plus margin) to the box, whatever its aspect
  const wordW = bb.max.x - bb.min.x + 2.2, wordH = bb.max.y - bb.min.y + 2.6;
  const fit = () => {
    const half = THREE.MathUtils.degToRad(v.camera.fov / 2);
    const dH = (wordH / 2) / Math.tan(half), dW = (wordW / 2) / (Math.tan(half) * v.camera.aspect);
    v.camera.position.set(0, 0, Math.max(dH, dW, 12));
  };
  const baseResize = v.resize;
  v.resize = () => { baseResize(); fit(); v.draw(); };

  const section = document.querySelector('.feature');
  v.update = t => {
    const r = section.getBoundingClientRect();
    const s = clamp01(1 - (r.top + r.height * 0.3) / innerHeight);
    const spin = reduce ? 0 : (1 - s) * -0.9;
    group.rotation.y = spin + v.pointer.x * 0.45 + (reduce ? 0 : Math.sin(t * 0.6) * 0.04);
    group.rotation.x = v.pointer.y * 0.28 + (reduce ? 0 : (1 - s) * 0.35);
    group.position.y = reduce ? 0 : Math.sin(t * 1.1) * 0.08;
  };
  v.resize();
  host.classList.add('is-3d');
  v.kick();
}

/* ================================================================ 2. paper diorama map */
function seeded(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
function diorama() {
  const host = document.querySelector('.map');
  if (!host) return;
  const wrap = document.createElement('div');
  wrap.className = 'map3d';
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  wrap.appendChild(canvas);
  host.insertBefore(wrap, host.firstChild);
  const v = makeView(wrap, canvas, { ortho: 7.2 });
  if (!v) { wrap.remove(); return; }

  const R = seeded(7), W = 16, H = 9;
  const xs = [-W / 2 + 0.6], zs = [-H / 2 + 0.6];
  while (xs[xs.length - 1] < W / 2 - 1.8) xs.push(xs[xs.length - 1] + 1.6 + R() * 0.9);
  while (zs[zs.length - 1] < H / 2 - 1.6) zs.push(zs[zs.length - 1] + 1.4 + R() * 0.7);
  const world = new THREE.Group();
  v.scene.add(world);
  const paperMat = new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.95 });
  const inkMat = new THREE.MeshStandardMaterial({ color: INK, roughness: 0.6 });
  const acidMat = new THREE.MeshStandardMaterial({ color: ACID, roughness: 0.5 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.5, H + 0.6), paperMat);
  slab.position.y = -0.25; slab.receiveShadow = true; slab.castShadow = true;
  world.add(slab);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(slab.geometry), new THREE.LineBasicMaterial({ color: INK }));
  edge.position.copy(slab.position);
  world.add(edge);
  // raised street bars
  const mainX = xs[1], mainZ = zs[zs.length - 2];
  xs.forEach(x => { const b = new THREE.Mesh(new THREE.BoxGeometry(x === mainX ? 0.22 : 0.07, 0.08, H), inkMat); b.position.set(x, 0.04, 0); b.receiveShadow = true; world.add(b); });
  zs.forEach(z => { const b = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, z === mainZ ? 0.22 : 0.07), inkMat); b.position.set(0, 0.041, z); b.receiveShadow = true; world.add(b); });
  // little block buildings in some cells (paper colour, inked edges)
  const bGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const bEdges = new THREE.EdgesGeometry(bGeo);
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
    if (R() < 0.45) continue;
    const w = (xs[i + 1] - xs[i]) * (0.35 + R() * 0.3), d = (zs[j + 1] - zs[j]) * (0.35 + R() * 0.3), h = 0.2 + R() * 0.7;
    const m = new THREE.Mesh(bGeo, paperMat);
    m.scale.set(w, h, d);
    m.position.set((xs[i] + xs[i + 1]) / 2, 0, (zs[j] + zs[j + 1]) / 2);
    m.castShadow = true; m.receiveShadow = true;
    const e = new THREE.LineSegments(bEdges, new THREE.LineBasicMaterial({ color: INK }));
    e.scale.copy(m.scale); e.position.copy(m.position);
    world.add(m, e);
  }
  // routes: square tubes along the grid (route 0 acid, others ink), drawn in on view
  const mi = Math.floor(xs.length / 2), mj = Math.floor(zs.length / 2);
  const nodes = [];
  for (let i = 1; i < xs.length - 1; i++) for (let j = 1; j < zs.length - 1; j++) if (Math.abs(i - mi) + Math.abs(j - mj) > 1) nodes.push({ i, j });
  const sector = n => Math.floor(((Math.atan2(n.j - mj, n.i - mi) + Math.PI) / (Math.PI * 2)) * 4 + 0.5) % 4;
  const groups = [[], [], [], []];
  nodes.sort(() => R() - 0.5).forEach(n => { const s = sector(n); if (groups[s].length < 4) groups[s].push(n); });
  const lift = [0.42, 0.3, 0.3, 0.3];
  const stops = [];
  const routes = groups.map((g, ri) => {
    const seq = [{ i: mi, j: mj }], left = g.slice();
    let cur = seq[0];
    while (left.length) { let bi = 0, bd = 1e9; left.forEach((p, k) => { const dd = Math.abs(p.i - cur.i) + Math.abs(p.j - cur.j); if (dd < bd) { bd = dd; bi = k; } }); cur = left.splice(bi, 1)[0]; seq.push(cur); }
    seq.push({ i: mi, j: mj });
    const off = [-0.14, -0.05, 0.05, 0.14][ri];
    const pts = [];
    for (let k = 1; k < seq.length; k++) {
      const a = seq[k - 1], b = seq[k], c = k % 2 ? { i: b.i, j: a.j } : { i: a.i, j: b.j };
      [a, c, b].forEach((p, m) => { if (m === 0 && pts.length) return; const q = new THREE.Vector3(xs[p.i] + off, lift[ri], zs[p.j] + off); if (!pts.length || pts[pts.length - 1].distanceTo(q) > 0.01) pts.push(q); });
    }
    const path = new THREE.CurvePath();
    for (let k = 1; k < pts.length; k++) path.add(new THREE.LineCurve3(pts[k - 1], pts[k]));
    const geo = new THREE.TubeGeometry(path, pts.length * 10, ri === 0 ? 0.12 : 0.09, 4, false);
    const mesh = new THREE.Mesh(geo, ri === 0 ? acidMat : inkMat);
    mesh.castShadow = true;
    geo.setDrawRange(0, 0);
    world.add(mesh);
    g.forEach(p => {
      const cube = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34).translate(0, 0.17, 0), ri === 0 ? acidMat : paperMat);
      cube.position.set(xs[p.i], 0.08, zs[p.j]);
      cube.castShadow = true;
      const ce = new THREE.LineSegments(new THREE.EdgesGeometry(cube.geometry), new THREE.LineBasicMaterial({ color: INK }));
      ce.position.copy(cube.position);
      cube.userData.edge = ce;
      cube.scale.setScalar(0.001); ce.scale.setScalar(0.001);
      world.add(cube, ce);
      cube.userData.delay = 0.6 + ri * 0.3 + R() * 0.4;
      stops.push(cube);
    });
    return { geo, total: geo.index.count, ri };
  });
  const depot = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.6).translate(0, 0.45, 0), inkMat);
  depot.position.set(xs[mi], 0.08, zs[mj]); depot.castShadow = true;
  world.add(depot);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 6, 40), acidMat);
  ring.rotation.x = Math.PI / 2; ring.position.set(xs[mi], 0.1, zs[mj]);
  world.add(ring);

  v.sun.position.set(-8, 14, 6);
  Object.assign(v.sun.shadow.camera, { left: -11, right: 11, top: 9, bottom: -9, near: 1, far: 50 });
  v.camera.position.set(14, 16, 14);
  v.camera.lookAt(0, 0, 0);
  let start = -1;
  v.update = (t, dt) => {
    if (start < 0) start = t;
    const k = reduce ? 10 : t - start;
    world.rotation.y = v.pointer.x * 0.12 + (reduce ? 0 : Math.sin(t * 0.3) * 0.03);
    world.rotation.x = v.pointer.y * 0.05;
    routes.forEach(r => { const p = clamp01((k - 0.2 - r.ri * 0.35) / 1.8); const e = 1 - Math.pow(1 - p, 3); r.geo.setDrawRange(0, Math.floor((r.total * e) / 3) * 3); });
    stops.forEach(c => {
      const p = clamp01((k - c.userData.delay) / 0.5);
      const s = p >= 1 ? 1 : Math.max(0.001, p * (1 + Math.sin(p * Math.PI) * 0.4));
      c.scale.setScalar(s); c.userData.edge.scale.copy(c.scale);
    });
    const pulse = (t * 0.7) % 1;
    ring.scale.setScalar(1 + pulse * 1.4);
  };
  v.resize();
  host.classList.add('is-3d');
  v.kick();
}

trpLetters().catch(e => console.info('TRP 3D unavailable:', e && e.message));
try { diorama(); } catch (e) { console.info('Map 3D unavailable:', e && e.message); }
