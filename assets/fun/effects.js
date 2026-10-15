// Tracers, bullet holes, sparks, debris and puffs. Everything is pooled and most of it
// is instanced, so a full spray costs the same handful of draw calls as a single shot.
import * as THREE from 'three';

function dotTexture(inner, outer, hard = 0.45) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, inner); gr.addColorStop(hard, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function splatTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(110,8,8,.9)';
  for (let i = 0; i < 22; i++) {
    const a = Math.random() * 6.28, d = Math.random() * 40, r = 6 + Math.random() * 16;
    g.beginPath(); g.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, r * (1 - d / 60), 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

class Swarm {
  // an instanced pool of tiny physical particles
  constructor(scene, geo, mat, n) {
    this.mesh = new THREE.InstancedMesh(geo, mat, n);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.p = Array.from({ length: n }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, s: 1, floor: 0, color: null }));
    this.i = 0; this.n = n;
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.v = new THREE.Vector3(); this.sc = new THREE.Vector3();
    this.col = new THREE.Color();
    scene.add(this.mesh);
  }
  emit(o) {
    const idx = this.i;
    const p = this.p[idx];
    this.i = (this.i + 1) % this.n;
    Object.assign(p, o);
    p.max = p.life;
    this.active = true;
    if (o.color && this.mesh.instanceColor) {
      this.mesh.setColorAt(idx, this.col.set(o.color));
      this.mesh.instanceColor.needsUpdate = true;
    }
  }
  update(dt, gravity, bounce) {
    if (!this.active) return;
    let k = 0;
    for (let i = 0; i < this.n; i++) {
      const p = this.p[i];
      if (p.life <= 0) {
        // park dead particles out of sight; keep slot order stable for colours
        this.m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, this.m);
        continue;
      }
      p.life -= dt;
      p.vy -= gravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (bounce && p.y < p.floor) { p.y = p.floor; p.vy = -p.vy * 0.35; p.vx *= 0.6; p.vz *= 0.6; p.rx *= 0.5; p.ry *= 0.5; }
      const fade = Math.min(1, p.life / Math.min(0.4, p.max)) * p.s;
      this.e.set(p.rx * (p.max - p.life), p.ry * (p.max - p.life), 0);
      this.q.setFromEuler(this.e);
      this.m.compose(this.v.set(p.x, p.y, p.z), this.q, this.sc.set(fade, fade, fade));
      this.mesh.setMatrixAt(i, this.m);
      k = i + 1;
    }
    this.mesh.count = Math.max(k, 0);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.active = k > 0;
  }
}

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.puffs = [];
    this.tracers = [];
    const holeTex = dotTexture('rgba(12,10,9,.95)', 'rgba(12,10,9,0)');
    this.holeMat = new THREE.MeshBasicMaterial({ map: holeTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.holeGeo = new THREE.PlaneGeometry(0.08, 0.08);
    this.splatMat = new THREE.MeshBasicMaterial({ map: splatTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.splatGeo = new THREE.PlaneGeometry(1.1, 1.1);
    this.puffTex = dotTexture('rgba(255,255,255,.8)', 'rgba(255,255,255,0)', 0.2);
    this._o = new THREE.Object3D();
    this.decals = {};
    for (const [k, geo, mat, n] of [['hole', this.holeGeo, this.holeMat, 160], ['splat', this.splatGeo, this.splatMat, 24]]) {
      const mesh = new THREE.InstancedMesh(geo, mat, n);
      mesh.count = 0; mesh.frustumCulled = false; mesh.renderOrder = 2;
      scene.add(mesh);
      this.decals[k] = { mesh, i: 0, n };
    }

    // glowing tracer streaks
    const tg = new THREE.CylinderGeometry(0.009, 0.009, 1, 5, 1, true);
    tg.rotateX(Math.PI / 2); tg.translate(0, 0, -0.5);
    this.tracerGeo = tg;
    this.tracerMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd98a').multiplyScalar(4), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });

    // sparks (bloom makes them glow)
    const sg = new THREE.BoxGeometry(0.012, 0.012, 0.09);
    this.sparks = new Swarm(scene, sg, new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb24a').multiplyScalar(6), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }), 160);
    // chips of whatever was hit
    const cg = new THREE.BoxGeometry(0.07, 0.045, 0.05);
    const chipMat = new THREE.MeshStandardMaterial({ roughness: 0.4 });
    this.chips = new Swarm(scene, cg, chipMat, 220);
    this.chips.mesh.setColorAt(0, new THREE.Color(1, 1, 1));
    this.chips.mesh.castShadow = false;
  }
  // create the lazily-made pools up front, so the first shot doesn't compile shaders
  prewarm() {
    for (let i = 0; i < 6; i++) this.tracer([0, -50, 0], [0, -50.1, 0]);
    this.puff([0, -50, 0], '#ffffff', 0.1, 12);
  }
  setEnv(env) { this.chips.mesh.material.envMap = env; this.chips.mesh.material.needsUpdate = true; }

  tracer(a, b) {
    let t = this.tracers.find(x => !x.mesh.visible);
    if (!t) {
      const mesh = new THREE.Mesh(this.tracerGeo, this.tracerMat);
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      t = { mesh, a: new THREE.Vector3(), d: new THREE.Vector3(), len: 0, at: 0 };
      this.tracers.push(t);
    }
    t.a.set(a[0], a[1], a[2]);
    t.d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    t.len = t.d.length();
    t.d.normalize();
    t.at = 0;
    t.mesh.visible = true;
    t.mesh.position.copy(t.a);
    t.mesh.lookAt(t.a.x + t.d.x, t.a.y + t.d.y, t.a.z + t.d.z);
  }
  // decals live in two instanced meshes: one draw call each, however many there are
  decal(kind, p, n, size) {
    const D = this.decals[kind];
    const o = this._o;
    o.position.set(p[0] + n[0] * 0.005, p[1] + n[1] * 0.005, p[2] + n[2] * 0.005);
    o.lookAt(p[0] + n[0], p[1] + n[1], p[2] + n[2]);
    o.rotateZ(Math.random() * 6.28);
    o.scale.set(size, size, 1);
    o.updateMatrix();
    D.mesh.setMatrixAt(D.i, o.matrix);
    D.i = (D.i + 1) % D.n;
    D.mesh.count = Math.max(D.mesh.count, D.i === 0 ? D.n : D.i);
    D.mesh.instanceMatrix.needsUpdate = true;
  }
  hole(p, n) { this.decal('hole', p, n, 0.7 + Math.random() * 0.6); }
  splat(p, groundY) { this.decal('splat', [p[0], groundY + 0.004, p[2]], [0, 1, 0], 0.7 + Math.random() * 0.7); }
  impact(p, n, kind, color, groundY = 0) {
    // kind: 'concrete' | 'wood' | 'plastic'
    if (kind !== 'plastic') {
      const k = kind === 'wood' ? 3 : 7;
      for (let i = 0; i < k; i++) {
        this.sparks.emit({ x: p[0], y: p[1], z: p[2], vx: n[0] * 4 + (Math.random() - 0.5) * 6, vy: n[1] * 4 + Math.random() * 4, vz: n[2] * 4 + (Math.random() - 0.5) * 6, life: 0.12 + Math.random() * 0.18, rx: Math.random() * 20, ry: Math.random() * 20, s: 1, floor: -99 });
      }
    }
    const chips = kind === 'plastic' ? 6 : 3;
    for (let i = 0; i < chips; i++) {
      this.chips.emit({ x: p[0] + n[0] * 0.03, y: p[1] + n[1] * 0.03, z: p[2] + n[2] * 0.03,
        vx: n[0] * 2.5 + (Math.random() - 0.5) * 3, vy: n[1] * 2.5 + 1.5 + Math.random() * 2.5, vz: n[2] * 2.5 + (Math.random() - 0.5) * 3,
        life: 1.6 + Math.random() * 1.2, rx: (Math.random() - 0.5) * 30, ry: (Math.random() - 0.5) * 30, s: kind === 'plastic' ? 1 : 0.6, floor: groundY + 0.02,
        color: kind === 'plastic' ? color : kind === 'wood' ? '#7a5130' : '#8f8b84' });
    }
    this.puff(p, kind === 'plastic' ? '#f1f1f1' : kind === 'wood' ? '#b08a62' : '#b9b0a2', 0.35, 3);
  }
  blood(p) {
    // a quick dark mist plus droplets that fall
    this.puff(p, '#5a0606', 0.22, 3, 0.5);
    for (let i = 0; i < 6; i++) {
      this.chips.emit({ x: p[0], y: p[1], z: p[2], vx: (Math.random() - 0.5) * 2.5, vy: Math.random() * 2, vz: (Math.random() - 0.5) * 2.5,
        life: 0.5 + Math.random() * 0.3, rx: 0, ry: 0, s: 0.35, floor: -99, color: '#5c0505' });
    }
  }
  puff(p, color, size = 0.35, n = 3, alpha = 0.6) {
    for (let i = 0; i < n; i++) {
      let s = this.puffs.find(x => !x.sprite.visible);
      if (!s) {
        if (this.puffs.length > 40) return;
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.puffTex, transparent: true, depthWrite: false }));
        this.scene.add(sprite);
        s = { sprite, life: 0, max: 0, v: [0, 0, 0], size: 0 };
        this.puffs.push(s);
      }
      s.sprite.material.color.set(color);
      s.sprite.position.set(p[0], p[1], p[2]);
      s.v = [(Math.random() - 0.5) * 1.2, Math.random() * 0.9, (Math.random() - 0.5) * 1.2];
      s.max = s.life = 0.4 + Math.random() * 0.4;
      s.size = size * (0.6 + Math.random() * 0.8);
      s.alpha = alpha;
      s.sprite.visible = true;
    }
  }
  clear() {
    for (const k in this.decals) { this.decals[k].mesh.count = 0; this.decals[k].i = 0; }
    for (const t of this.tracers) t.mesh.visible = false;
    for (const s of this.puffs) s.sprite.visible = false;
    for (const p of this.sparks.p) p.life = 0;
    for (const p of this.chips.p) p.life = 0;
  }
  update(dt) {
    for (const t of this.tracers) {
      if (!t.mesh.visible) continue;
      t.at += dt * 380;
      const len = Math.min(3.5, t.at, t.len);
      const head = Math.min(t.at, t.len);
      t.mesh.position.copy(t.a).addScaledVector(t.d, head);
      t.mesh.scale.set(1, 1, len);
      if (t.at - 3.5 > t.len) t.mesh.visible = false;
    }
    for (const s of this.puffs) {
      if (!s.sprite.visible) continue;
      s.life -= dt;
      const k = 1 - s.life / s.max;
      s.sprite.position.x += s.v[0] * dt; s.sprite.position.y += s.v[1] * dt; s.sprite.position.z += s.v[2] * dt;
      const sc = s.size * (0.5 + k * 1.6);
      s.sprite.scale.set(sc, sc, 1);
      s.sprite.material.opacity = (1 - k) * (s.alpha ?? 0.6);
      if (s.life <= 0) s.sprite.visible = false;
    }
    this.sparks.update(dt, 9, false);
    this.chips.update(dt, 14, true);
  }
}
