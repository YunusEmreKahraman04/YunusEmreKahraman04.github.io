// Third-person operator: jointed legs and arms, gear, a held gun, name tag,
// walk/crouch/aim poses and a fall in the direction of the killing shot.
// Each rigid part is baked into a few meshes so a player costs ~15 draw calls.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeStatic, thirdPersonGun, WEAPONS } from './weapons.js';

const LOOK = {
  T: { shirt: '#9c7446', pants: '#5d4c37', vest: '#4a4434', head: '#2a2622', skin: '#c99068', glove: '#3b2f24', boot: '#2a211a', accent: '#8e1d18', tag: '#ffb347' },
  CT: { shirt: '#2f4a6e', pants: '#2a3442', vest: '#202a36', head: '#d6a07a', skin: '#d6a07a', glove: '#1c1e22', boot: '#15171a', accent: '#3c4f6a', tag: '#7fb2ff' }
};
const MATS = {};
const mat = (c, r = 0.85) => (MATS[c + r] ||= new THREE.MeshStandardMaterial({ color: c, roughness: r }));
const GEO = {};
const rbox = (w, h, d, r = 0.025) => (GEO[[w, h, d, r]] ||= new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.2, h / 2.2, d / 2.2)));
function part(g, w, h, d, c, x, y, z, r, rough) {
  const m = new THREE.Mesh(rbox(w, h, d, r), mat(c, rough));
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
// every rigid part bakes into one vertex-coloured mesh sharing these materials
const GUN_AT = { pistol: [0.04, -0.02, -0.52], knife: [0.16, -0.17, -0.42], rifle: [0.1, -0.08, -0.3] };
const BODY_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.02, envMapIntensity: 0.5 });
const GUN_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.45, envMapIntensity: 0.8 });
// build a group of parts and bake it once per team; later players reuse the geometry
const BAKED = new Map();
function bakedGeo(key, build) {
  if (!BAKED.has(key)) {
    const g = new THREE.Group();
    build(g);
    BAKED.set(key, mergeStatic(g, BODY_MAT).children[0].geometry);
  }
  return BAKED.get(key);
}
function baked(key, build) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(bakedGeo(key, build), BODY_MAT);
  m.castShadow = true;
  g.add(m);
  return g;
}
// a limb: pivot group at the joint, baked geometry hanging down (-y)
function limb(key, build) {
  const pivot = new THREE.Group();
  pivot.add(baked(key, build));
  return pivot;
}

export { GUN_MAT };
export class Avatar {
  constructor(team, name) {
    const L = LOOK[team] || LOOK.T;
    this.team = team;
    this.root = new THREE.Group();
    this.body = new THREE.Group();       // falls over on death
    this.root.add(this.body);
    this.hips = new THREE.Group();
    this.hips.position.y = 0.88;
    this.body.add(this.hips);

    // legs: thigh -> knee -> shin + boot
    const leg = side => {
      const thigh = limb(team + 'thigh' + side, g => {
        part(g, 0.18, 0.44, 0.2, L.pants, 0, -0.22, 0);
        part(g, 0.2, 0.1, 0.06, '#1e1e1e', 0, -0.4, -0.1, 0.02);     // knee pad
        part(g, 0.06, 0.12, 0.1, L.vest, side * 0.1, -0.18, 0, 0.02); // thigh pouch
      });
      thigh.position.set(side * 0.11, 0, 0);
      const shin = limb(team + 'shin', g => {
        part(g, 0.16, 0.36, 0.18, L.pants, 0, -0.18, 0);
        part(g, 0.18, 0.13, 0.29, L.boot, 0, -0.38, -0.04, 0.03, 0.7);
      });
      shin.position.y = -0.44;
      thigh.add(shin);
      this.hips.add(thigh);
      return { thigh, shin };
    };
    this.legL = leg(-1); this.legR = leg(1);

    // torso with vest, pouches, radio
    this.torso = new THREE.Group();
    this.hips.add(this.torso);
    this.torso.add(baked(team + 'torso', g => {
      part(g, 0.44, 0.22, 0.25, L.pants, 0, 0.06, 0);           // belt line
      part(g, 0.46, 0.04, 0.27, '#1b1b1b', 0, 0.14, 0, 0.01);  // belt
      part(g, 0.46, 0.46, 0.26, L.shirt, 0, 0.37, 0, 0.06);
      part(g, 0.5, 0.38, 0.32, L.vest, 0, 0.4, 0, 0.05);
      for (const x of [-0.14, 0, 0.14]) part(g, 0.11, 0.13, 0.06, L.vest, x, 0.28, -0.18, 0.02);
      part(g, 0.36, 0.4, 0.14, L.vest, 0, 0.4, 0.22, 0.04);   // back pack
      part(g, 0.06, 0.16, 0.06, '#1a1a1a', 0.14, 0.58, 0.26, 0.015); // radio
      part(g, 0.012, 0.18, 0.012, '#111', 0.15, 0.74, 0.26, 0.004);  // antenna
      part(g, 0.13, 0.1, 0.13, L.skin, 0, 0.63, 0, 0.03);       // neck
    }));

    // head
    this.headG = new THREE.Group();
    this.headG.position.y = 0.66;
    this.torso.add(this.headG);
    this.headG.add(baked(team + 'head', g => {
      part(g, 0.25, 0.26, 0.25, L.head, 0, 0.13, 0, 0.07);
      if (team === 'CT') {
        part(g, 0.31, 0.14, 0.31, '#3a4a5c', 0, 0.23, 0.01, 0.07);   // helmet
        part(g, 0.33, 0.03, 0.33, '#2c3846', 0, 0.17, 0.01, 0.015);  // brim
        part(g, 0.23, 0.06, 0.04, '#0f1114', 0, 0.145, -0.135, 0.02); // goggles
        part(g, 0.19, 0.035, 0.02, '#4b7fbf', 0, 0.145, -0.155, 0.01); // lens glint
      } else {
        part(g, 0.26, 0.07, 0.26, L.accent, 0, 0.24, 0, 0.03);       // bandana
        part(g, 0.2, 0.05, 0.03, L.skin, 0, 0.155, -0.125, 0.01);    // eye slit
        part(g, 0.05, 0.032, 0.02, '#111', -0.05, 0.155, -0.14, 0.01);
        part(g, 0.05, 0.032, 0.02, '#111', 0.05, 0.155, -0.14, 0.01);
      }
    }));

    // arms + gun on an aim pivot at the shoulders
    this.aim = new THREE.Group();
    this.aim.position.set(0, 0.55, 0);
    this.torso.add(this.aim);
    const arm = (key, shoulder, elbow, hand) => baked(team + key, g => {
      // upper arm from shoulder to elbow, forearm from elbow to hand
      const seg = (a, b, t, c, gloveEnd) => {
        const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
        const len = A.distanceTo(B);
        const s = new THREE.Group();
        s.position.copy(A);
        s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), B.clone().sub(A).normalize());
        const m = new THREE.Mesh(rbox(t, t, len, 0.03), mat(c));
        m.position.z = -len / 2;
        s.add(m);
        if (gloveEnd) { const h = new THREE.Mesh(rbox(0.09, 0.1, 0.11, 0.03), mat(L.glove, 0.7)); h.position.z = -len; s.add(h); }
        g.add(s);
      };
      seg(shoulder, elbow, 0.13, L.shirt, false);
      seg(elbow, hand, 0.115, L.shirt, true);
    });
    this.armSets = {
      rifle: [arm('rr', [0.22, 0, 0.02], [0.2, -0.22, -0.08], [0.1, -0.1, -0.3]), arm('rl', [-0.22, 0, 0.02], [-0.2, -0.18, -0.25], [0.04, -0.08, -0.6])],
      pistol: [arm('pr', [0.22, 0, 0.02], [0.18, -0.12, -0.28], [0.04, -0.04, -0.52]), arm('pl', [-0.22, 0, 0.02], [-0.16, -0.12, -0.3], [0.0, -0.08, -0.5])],
      knife: [arm('kr', [0.22, 0, 0.02], [0.24, -0.25, -0.1], [0.16, -0.2, -0.38]), arm('kl', [-0.22, 0, 0.02], [-0.26, -0.3, 0], [-0.24, -0.5, 0.02])]
    };
    for (const k in this.armSets) for (const a of this.armSets[k]) { a.visible = false; this.aim.add(a); }
    this.guns = {};

    this.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });

    this.tag = nameTag(name, L.tag);
    this.tag.position.y = 2.2;
    this.root.add(this.tag);

    this.walk = 0; this.dead = 0; this.weapon = null; this.ghost = false;
    this.fallDir = 1; this.fallSide = 0; this.flinch = 0; this.wasAlive = true;
  }
  setName(name) {
    const L = LOOK[this.team] || LOOK.T;
    this.root.remove(this.tag);
    this.tag.material.map.dispose();
    this.tag = nameTag(name, L.tag);
    this.tag.position.y = 2.2;
    this.root.add(this.tag);
  }
  setWeapon(id) {
    if (this.weapon === id || !WEAPONS[id]) return;
    if (this.weapon && this.guns[this.weapon]) this.guns[this.weapon].visible = false;
    this.weapon = id;
    const cat = WEAPONS[id].cat;
    if (!this.guns[id]) {
      // baked geometry is shared by every player holding this gun
      const tp = thirdPersonGun(id, GUN_MAT);
      const g = new THREE.Mesh(tp.geometry, GUN_MAT);
      g.castShadow = true;
      g.position.set(...(GUN_AT[cat] || GUN_AT.rifle));
      g.userData.muzzle = tp.muzzle.clone().add(g.position);
      this.aim.add(g);
      this.guns[id] = g;
    }
    this.guns[id].visible = true;
    const set = cat === 'pistol' ? 'pistol' : cat === 'knife' ? 'knife' : 'rifle';
    for (const k in this.armSets) for (const a of this.armSets[k]) a.visible = k === set;
  }
  hit() { this.flinch = 1; }
  // fall away from where the shot came from (angle in world space)
  killedFrom(fromYaw) {
    const rel = fromYaw - this.root.rotation.y;
    this.fallDir = Math.cos(rel) > 0 ? 1 : -1; // shot from the front: fall on your back
    this.fallSide = Math.sin(rel) * 0.6;
  }
  // s: {p, yaw, pitch, crouch, alive, speed, showTag, protected}
  update(dt, s) {
    this.root.position.set(s.p[0], s.p[1], s.p[2]);
    this.root.rotation.y = s.yaw;
    const alive = s.alive;
    if (alive && !this.wasAlive) { this.dead = 0; this.fallDir = 1; this.fallSide = 0; }
    this.wasAlive = alive;
    const speed = alive ? s.speed : 0;
    this.walk += dt * speed * 2.2;
    const amt = Math.min(1, speed / 3.5);
    const ph = this.walk;
    const c = s.crouch ? 1 : 0;
    this.crouchK = (this.crouchK || 0) + (c - (this.crouchK || 0)) * Math.min(1, dt * 12);
    const k = this.crouchK;
    // walk cycle with knees
    const swingL = Math.sin(ph) * 0.6 * amt, swingR = -swingL;
    this.legL.thigh.rotation.x = swingL - k * 1.15;
    this.legR.thigh.rotation.x = swingR - k * 0.6;
    this.legL.shin.rotation.x = Math.max(0, Math.sin(ph + 1.6)) * 0.9 * amt + k * 1.8;
    this.legR.shin.rotation.x = Math.max(0, Math.sin(ph + 1.6 + Math.PI)) * 0.9 * amt + k * 1.1;
    this.hips.position.y = 0.88 - k * 0.42 + Math.abs(Math.cos(ph)) * 0.025 * amt;
    this.torso.rotation.x = -k * 0.12 - amt * 0.06;
    this.torso.rotation.y = Math.sin(ph) * 0.06 * amt;
    this.flinch = Math.max(0, this.flinch - dt * 6);
    this.aim.rotation.x = s.pitch + this.flinch * 0.15;
    this.headG.rotation.x = s.pitch * 0.5 - this.flinch * 0.3;

    // death fall
    this.dead += ((alive ? 0 : 1) - this.dead) * Math.min(1, dt * (alive ? 30 : 4.5));
    const d = this.dead < 0.98 ? this.dead : 1;
    const bounce = alive ? 0 : Math.sin(Math.min(1, this.dead) * Math.PI) * 0.06;
    this.body.rotation.x = d * this.fallDir * Math.PI / 2 * 0.98;
    this.body.rotation.z = d * this.fallSide;
    this.body.position.y = d * 0.16 + bounce;
    if (!alive) { this.legL.shin.rotation.x = d * 0.5; this.legR.shin.rotation.x = d * 0.2; this.aim.rotation.x = -d * 0.8; }
    this.tag.visible = alive && s.showTag;

    // spawn protection shimmer
    const ghost = !!s.protected;
    if (ghost !== this.ghost) {
      this.ghost = ghost;
      this.body.traverse(o => {
        if (!o.isMesh) return;
        if (ghost) { o.userData.solid = o.material; o.material = o.material.clone(); o.material.transparent = true; }
        else if (o.userData.solid) { o.material.dispose(); o.material = o.userData.solid; }
      });
    }
    if (ghost) { const op = 0.45 + Math.sin(performance.now() / 90) * 0.15; this.body.traverse(o => { if (o.isMesh) o.material.opacity = op; }); }
  }
  muzzleWorld(out) {
    const g = this.guns[this.weapon];
    if (!g) return null;
    this.root.updateMatrixWorld(true);
    return out.copy(g.userData.muzzle).applyMatrix4(this.aim.matrixWorld);
  }
  dispose(scene) {
    scene.remove(this.root);
    this.tag.material.map.dispose();
  }
}

function nameTag(text, color) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.font = '600 30px "JetBrains Mono", ui-monospace, monospace';
  const w = Math.min(248, g.measureText(text).width + 24);
  g.fillStyle = 'rgba(8,10,14,.62)';
  g.beginPath(); g.roundRect((256 - w) / 2, 10, w, 44, 8); g.fill();
  g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 33, 236);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, fog: false }));
  s.scale.set(1.3, 0.325, 1);
  s.renderOrder = 10;
  return s;
}
