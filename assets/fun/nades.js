// Grenades: flashbang, HE and smoke. The thrower broadcasts position + velocity once;
// every client steps the same fixed-rate physics, so bounces land in the same place.
import * as THREE from 'three';

export const NADES = {
  flash: { name: 'Flashbang', price: 200, max: 2, fuse: 1.6 },
  he: { name: 'HE Grenade', price: 300, max: 1, fuse: 1.6 },
  smoke: { name: 'Smoke', price: 300, max: 1, fuse: 1.8 }
};
const STEP = 1 / 128, R = 0.07, BOUNCE = 0.42, GRAV = 20.32;

function inBox(b, p) {
  return p[0] > b.min[0] - R && p[0] < b.max[0] + R && p[1] > b.min[1] - R && p[1] < b.max[1] + R && p[2] > b.min[2] - R && p[2] < b.max[2] + R;
}

export class Grenades {
  constructor(scene, fx, sfx) {
    this.scene = scene; this.fx = fx; this.sfx = sfx;
    this.list = [];
    this.smokes = []; // {p, r, until, sprites}
    const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.4 });
    this.geo = new THREE.CylinderGeometry(0.035, 0.035, 0.11, 10);
    this.mats = { flash: mat('#b9bec6'), he: mat('#4c5a32'), smoke: mat('#5a6d82') };
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    for (let i = 0; i < 9; i++) {
      const x = 30 + Math.random() * 68, y = 30 + Math.random() * 68, r = 26 + Math.random() * 30;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    }
    this.smokeTex = new THREE.CanvasTexture(c);
    this.smokeTex.colorSpace = THREE.SRGBColorSpace;
  }
  // n: {id, by, kind, p:[3], v:[3]}; onPop(n) is called when it goes off
  throw(n, onPop) {
    const mesh = new THREE.Mesh(this.geo, this.mats[n.kind]);
    mesh.castShadow = true;
    mesh.position.fromArray(n.p);
    this.scene.add(mesh);
    this.list.push({ ...n, p: n.p.slice(), v: n.v.slice(), t: 0, acc: 0, mesh, spin: new THREE.Vector3(Math.random() * 12, Math.random() * 12, 0), rest: false, onPop });
  }
  physics(g, boxes) {
    // fixed sub-steps; per axis so wall hits reflect only the axis that collided
    g.v[1] -= GRAV * STEP;
    for (let ax = 0; ax < 3; ax++) {
      const old = g.p[ax];
      g.p[ax] += g.v[ax] * STEP;
      for (const b of boxes) {
        if (!inBox(b, g.p)) continue;
        g.p[ax] = old;
        if (Math.abs(g.v[ax]) > 1.2) this.sfx.bounce(g.p);
        g.v[ax] = -g.v[ax] * BOUNCE;
        if (ax === 1) { g.v[0] *= 0.8; g.v[2] *= 0.8; if (Math.abs(g.v[1]) < 0.6) { g.v[1] = 0; if (Math.hypot(g.v[0], g.v[2]) < 0.3) g.rest = true; } }
        break;
      }
    }
  }
  update(dt, boxes) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const g = this.list[i];
      g.acc += dt;
      while (g.acc >= STEP) { g.acc -= STEP; g.t += STEP; if (!g.rest) this.physics(g, boxes); }
      g.mesh.position.fromArray(g.p);
      if (!g.rest) { g.mesh.rotation.x += g.spin.x * dt; g.mesh.rotation.y += g.spin.y * dt; }
      const fuse = NADES[g.kind].fuse;
      // smokes pop once they've settled (or after the fuse when stuck rolling)
      if (g.t >= fuse && (g.kind !== 'smoke' || g.rest || g.t > fuse + 1.5)) {
        this.scene.remove(g.mesh);
        this.list.splice(i, 1);
        this.pop(g);
        g.onPop && g.onPop(g);
      }
    }
    const now = performance.now();
    for (let i = this.smokes.length - 1; i >= 0; i--) {
      const s = this.smokes[i];
      const age = (now - s.born) / 1000, left = (s.until - now) / 1000;
      const grow = Math.min(1, age / 1.2), fade = Math.min(1, Math.max(0, left / 2.5));
      for (const sp of s.sprites) {
        sp.position.y += dt * 0.05;
        const k = sp.userData.size * (0.4 + 0.6 * grow);
        sp.scale.set(k, k, 1);
        sp.material.opacity = 0.92 * fade;
        sp.material.rotation += sp.userData.spin * dt;
      }
      s.r = 4.2 * grow;
      if (left <= 0) { s.sprites.forEach(sp => { this.scene.remove(sp); sp.material.dispose(); }); this.smokes.splice(i, 1); }
    }
  }
  pop(g) {
    const p = g.p;
    if (g.kind === 'smoke') {
      const sprites = [];
      for (let i = 0; i < 34; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.smokeTex, color: '#c9ccd0', transparent: true, depthWrite: false, opacity: 0 }));
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 3.4;
        sp.position.set(p[0] + Math.cos(a) * r, p[1] + 0.4 + Math.random() * 2.6, p[2] + Math.sin(a) * r);
        sp.userData.size = 3.2 + Math.random() * 2.4;
        sp.userData.spin = (Math.random() - 0.5) * 0.2;
        this.scene.add(sp);
        sprites.push(sp);
      }
      this.smokes.push({ p: [p[0], p[1] + 1.4, p[2]], r: 0, born: performance.now(), until: performance.now() + 18000, sprites });
      this.sfx.smoke(p);
    } else if (g.kind === 'he') {
      this.fx.explosion(p, 1);
      this.sfx.explosion(p, 0.7);
    } else {
      this.fx.flashPop(p);
      this.sfx.flashbang(p);
    }
  }
  // does the segment a->b pass through a smoke cloud?
  blocks(a, b) {
    for (const s of this.smokes) {
      if (s.r < 0.5) continue;
      const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const L2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
      let t = ((s.p[0] - a[0]) * d[0] + (s.p[1] - a[1]) * d[1] + (s.p[2] - a[2]) * d[2]) / (L2 || 1);
      t = Math.max(0, Math.min(1, t));
      const q = [a[0] + d[0] * t - s.p[0], a[1] + d[1] * t - s.p[1], a[2] + d[2] * t - s.p[2]];
      if (q[0] * q[0] + q[1] * q[1] * 0.6 + q[2] * q[2] < s.r * s.r) return true;
    }
    return false;
  }
  clear() {
    for (const g of this.list) this.scene.remove(g.mesh);
    for (const s of this.smokes) s.sprites.forEach(sp => { this.scene.remove(sp); sp.material.dispose(); });
    this.list = []; this.smokes = [];
  }
}
