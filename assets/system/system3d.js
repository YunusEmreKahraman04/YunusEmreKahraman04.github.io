/* Chapter 03 — holographic core in the ID card.
   Wireframe icosphere + inner core, orbit rings with satellites, a particle
   halo and a scan plane, all additive phosphor green. Tilts toward the
   pointer; click to overload it (spin burst). Renders only while visible. */
import * as THREE from 'three';

const host = document.getElementById('holo');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (host) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);
  let renderer = null;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { canvas.remove(); }
  if (renderer) {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
    camera.position.set(0, 0.4, 6.2);
    const G = 0x39ff88, PALE = 0xb6ffd2, AMBER = 0xffcc33;
    const add = (c, o) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });

    const core = new THREE.Group();
    scene.add(core);
    const shell = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.45, 1)), add(G, 0.75));
    const inner = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 0), new THREE.MeshBasicMaterial({ color: G, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    const innerW = new THREE.LineSegments(new THREE.EdgesGeometry(inner.geometry), add(PALE, 1));
    const knot = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.TorusKnotGeometry(0.95, 0.08, 90, 4, 2, 3)), add(G, 0.18));
    core.add(shell, inner, innerW, knot);

    const rings = [[1.2, 0.3, 0], [0.4, -0.9, 0.5], [-0.6, 0.2, 1.1]].map(([rx, ry, rz], i) => {
      const g = new THREE.Group();
      g.rotation.set(rx, ry, rz);
      const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 96 }, (_, k) => { const a = (k / 96) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * 2.05, 0, Math.sin(a) * 2.05); })), add(i === 1 ? AMBER : G, 0.45));
      const sat = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: i === 1 ? AMBER : PALE }));
      g.add(ring, sat);
      g.userData = { sat, speed: 0.6 + i * 0.35, ph: i * 2 };
      scene.add(g);
      return g;
    });

    const N = 260, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 2.3 + Math.random() * 0.9, a = Math.random() * Math.PI * 2, y = (Math.random() - 0.5) * 2.6;
      pos.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3);
    }
    const dust = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)), new THREE.PointsMaterial({ color: G, size: 0.035, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(dust);
    const scan = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.05), new THREE.MeshBasicMaterial({ color: G, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    scan.rotation.x = -Math.PI / 2;
    scene.add(scan);
    const base = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 64 }, (_, k) => { const a = (k / 64) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * 1.7, -2, Math.sin(a) * 1.7); })), add(G, 0.5));
    scene.add(base);

    let visible = false, raf = 0, last = 0, t = 0, burst = 0, tx = 0, ty = 0, px = 0, py = 0;
    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    const frame = now => {
      raf = 0;
      if (!visible) return;
      if (last && now - last < 1000 / 61) { raf = requestAnimationFrame(frame); return; }
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      if (!reduce) t += dt;
      burst *= 0.96;
      px += (tx - px) * 0.08; py += (ty - py) * 0.08;
      core.rotation.y += dt * (0.4 + burst * 9);
      core.rotation.x = py * 0.4 + Math.sin(t * 0.5) * 0.15;
      core.rotation.z = -px * 0.3;
      knot.rotation.y -= dt * 0.9;
      inner.scale.setScalar(1 + Math.sin(t * 3) * 0.06 + burst * 0.4);
      innerW.scale.copy(inner.scale);
      shell.material.opacity = 0.55 + 0.25 * Math.sin(t * 7) * Math.sin(t * 2.3) + burst * 0.3;
      rings.forEach(g => { const a = t * g.userData.speed * (1 + burst * 4) + g.userData.ph; g.userData.sat.position.set(Math.cos(a) * 2.05, 0, Math.sin(a) * 2.05); g.rotation.y += dt * 0.1; });
      dust.rotation.y -= dt * 0.05;
      scan.position.y = Math.sin(t * 1.3) * 1.9;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (visible && !raf) { last = 0; raf = requestAnimationFrame(frame); } };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting && !document.hidden; kick(); }).observe(host);
    new ResizeObserver(resize).observe(host);
    host.addEventListener('pointermove', e => {
      const r = host.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 2 - 1; ty = ((e.clientY - r.top) / r.height) * 2 - 1;
    });
    host.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
    host.addEventListener('click', () => {
      burst = 1;
      window.Sound && [0, 70, 140].forEach((d, i) => setTimeout(() => window.Sound.blip(500 + i * 260), d));
      const n = document.getElementById('idName');
      if (n) { n.classList.add('hit'); setTimeout(() => n.classList.remove('hit'), 400); }
    });
    resize();
    host.classList.add('is-3d');
    kick();
  }
}
