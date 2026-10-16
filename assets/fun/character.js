// Skinned third-person characters from Quaternius' Toon Shooter Game Kit (CC0).
// One loaded template per team; every player is a SkeletonUtils clone with its own mixer.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { WEAPONS } from './weapons.js';

const TEMPLATES = {};
const HEIGHT = 1.83;
// guns that come attached to the character's right hand
const GUN_NODES = ['AK', 'GrenadeLauncher', 'Knife_1', 'Knife_2', 'Pistol', 'Revolver', 'Revolver_Small', 'RocketLauncher', 'ShortCannon', 'Shotgun', 'Shovel', 'SMG', 'Sniper', 'Sniper_2'];
const NODE_FOR = { rifle: 'AK', heavy: 'AK', smg: 'SMG', pistol: 'Pistol', sniper: 'Sniper', shotgun: 'Shotgun', knife: 'Knife_1' };
const TAG = { T: '#ffb347', CT: '#7fb2ff' };
const UP = new THREE.Vector3(0, 1, 0);
const _pq = new THREE.Quaternion(), _q = new THREE.Quaternion(), _ax = new THREE.Vector3(), _right = new THREE.Vector3();
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
// rotate a bone about an axis given in world space, whatever its local axes are
function turnBone(bone, worldAxis, angle) {
  if (!bone || !angle) return;
  bone.parent.getWorldQuaternion(_pq).invert();
  _ax.copy(worldAxis).applyQuaternion(_pq).normalize();
  bone.quaternion.premultiply(_q.setFromAxisAngle(_ax, angle));
  bone.updateMatrixWorld(true);
}

export function loadCharacters(base) {
  const loader = new GLTFLoader();
  const one = (team, file) => loader.loadAsync(base + file).then(gltf => {
    const scene = gltf.scene;
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    TEMPLATES[team] = {
      scene,
      clips: Object.fromEntries(gltf.animations.map(c => [c.name, c])),
      scale: HEIGHT / Math.max(0.01, box.max.y - box.min.y),
      lift: -box.min.y
    };
  });
  return Promise.all([one('CT', 'ct.glb'), one('T', 't.glb')]);
}
export const charactersReady = () => !!(TEMPLATES.CT && TEMPLATES.T);

export class SkinAvatar {
  constructor(team, name) {
    const tpl = TEMPLATES[team] || TEMPLATES.T;
    this.team = team;
    this.root = new THREE.Group();
    const model = this.model = cloneSkinned(tpl.scene);
    model.scale.setScalar(tpl.scale);
    model.position.y = tpl.lift * tpl.scale;
    model.rotation.y = Math.PI; // the models face +z, players look down -z
    this.root.add(model);
    // own materials, so spawn protection can fade just this player
    model.traverse(o => {
      if (o.isMesh) {
        o.material = o.material.clone();
        o.castShadow = true;
        o.receiveShadow = false;
        o.frustumCulled = false;
      }
    });
    this.mats = [];
    model.traverse(o => { if (o.isMesh) this.mats.push(o.material); });

    this.mixer = new THREE.AnimationMixer(model);
    this.actions = {};
    for (const [n, clip] of Object.entries(tpl.clips)) {
      const a = this.mixer.clipAction(clip);
      if (n === 'Death') { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
      this.actions[n] = a;
    }
    this.guns = {};
    for (const n of GUN_NODES) { const g = model.getObjectByName(n); if (g) { g.visible = false; this.guns[n] = g; } }
    this.spine = model.getObjectByName('Torso') || model.getObjectByName('Abdomen');
    this.neck = model.getObjectByName('Neck');
    // GLTFLoader strips dots from node names: UpperArm.R -> UpperArmR
    this.armR = model.getObjectByName('UpperArmR');
    this.armL = model.getObjectByName('UpperArmL');

    this.tag = nameTag(name, TAG[team] || TAG.T);
    this.tag.position.y = 2.25;
    this.root.add(this.tag);
    this.cur = null; this.weapon = null; this.gunNode = null; this.flinch = 0; this.ghost = false; this.wasAlive = true;
    this.legYaw = 0; this.back = false;
    this.play('Idle_Shoot', 0);
  }
  play(name, fade = 0.18) {
    if (this.cur === name || !this.actions[name]) return;
    const next = this.actions[name];
    next.reset().setEffectiveWeight(1).fadeIn(fade).play();
    if (this.cur) this.actions[this.cur].fadeOut(fade);
    this.cur = name;
  }
  setName(name) {
    this.root.remove(this.tag);
    this.tag.material.map.dispose();
    this.tag = nameTag(name, TAG[this.team] || TAG.T);
    this.tag.position.y = 2.25;
    this.root.add(this.tag);
  }
  setWeapon(id) {
    if (this.weapon === id || !WEAPONS[id]) return;
    this.weapon = id;
    const cat = WEAPONS[id].cat;
    const node = id === 'deagle' ? 'Revolver' : cat === 'grenade' ? null : NODE_FOR[cat] || 'AK';
    for (const [n, g] of Object.entries(this.guns)) g.visible = n === node;
    this.gunNode = this.guns[node] || null;
  }
  hit() { this.flinch = 1; }
  killedFrom() { /* the death animation decides the fall */ }
  // s: {p, yaw, pitch, crouch, alive, speed, vel:[vx,vz], onGround, showTag, protected}
  update(dt, s) {
    this.root.position.set(s.p[0], s.p[1], s.p[2]);
    this.root.rotation.y = s.yaw;
    const knife = this.weapon === 'knife';
    const vx = s.vel ? s.vel[0] : 0, vz = s.vel ? s.vel[1] : 0;
    const speed = s.vel ? Math.hypot(vx, vz) : s.speed;
    const moving = s.alive && speed > 0.6 && s.onGround !== false;
    // legs follow the direction of travel, the upper body keeps aiming;
    // walking backwards plays the cycle in reverse instead of moonwalking
    let legTarget = 0, back = false;
    if (moving) {
      const rel = wrap(Math.atan2(-vx, -vz) - s.yaw);
      if (Math.abs(rel) <= 1.75) legTarget = Math.max(-1.1, Math.min(1.1, rel));
      else { back = true; legTarget = Math.max(-1.1, Math.min(1.1, wrap(rel - Math.PI))); }
    }
    if (back !== this.back) { this.back = back; this.legYaw = legTarget; }
    this.legYaw += (legTarget - this.legYaw) * Math.min(1, dt * 10);
    this.model.rotation.y = Math.PI + this.legYaw;

    if (!s.alive) this.play('Death', 0.1);
    else if (s.onGround === false) this.play('Jump_Idle', 0.15);
    else if (s.crouch) this.play(moving ? 'Walk_Shoot' : 'Duck');
    else if (speed > 3.4) this.play(knife ? 'Run' : 'Run_Shoot');
    else if (moving) this.play(knife ? 'Walk' : 'Walk_Shoot');
    else this.play('Idle_Shoot');
    const a = this.actions[this.cur];
    if (a) {
      const loco = this.cur.startsWith('Run') || this.cur.startsWith('Walk');
      a.timeScale = !loco ? 1 : (back ? -1 : 1) * Math.max(0.55, Math.min(1.4, speed / (this.cur.startsWith('Run') ? 5.6 : 2.6)));
    }
    this.mixer.update(dt);
    this.flinch = Math.max(0, this.flinch - dt * 6);
    if (s.alive) {
      this.root.updateMatrixWorld(true);
      // undo the leg turn above the waist so the gun stays on target
      turnBone(this.spine, UP, -this.legYaw * 0.75);
      turnBone(this.neck, UP, -this.legYaw * 0.25);
      // look up/down about the aim's right-hand axis (positive pitch = up)
      _right.set(Math.cos(s.yaw), 0, -Math.sin(s.yaw));
      // most of it in the shoulders, a little in the spine, so the gun tilts without a limbo lean
      // the head stays level when aiming up (a toon head leaning back reads as a hunch)
      turnBone(this.spine, _right, s.pitch * (s.pitch > 0 ? 0.08 : 0.2) - this.flinch * 0.15);
      turnBone(this.neck, _right, s.pitch > 0 ? 0 : s.pitch * 0.2);
      turnBone(this.armR, _right, s.pitch * 0.75);
      turnBone(this.armL, _right, s.pitch * 0.75);
    }
    this.tag.visible = s.alive && s.showTag;
    const ghost = !!s.protected;
    if (ghost !== this.ghost) {
      this.ghost = ghost;
      for (const m of this.mats) { m.transparent = ghost; m.opacity = 1; m.needsUpdate = true; }
    }
    if (ghost) { const op = 0.45 + Math.sin(performance.now() / 90) * 0.15; for (const m of this.mats) m.opacity = op; }
  }
  muzzleWorld(out) {
    if (!this.gunNode || this.weapon === 'knife') return null;
    this.gunNode.getWorldPosition(out);
    // a little ahead of the gun's middle, along where the player faces
    const yaw = this.root.rotation.y;
    out.x -= Math.sin(yaw) * 0.35; out.z -= Math.cos(yaw) * 0.35;
    return out;
  }
  dispose(scene) {
    scene.remove(this.root);
    this.mixer.stopAllAction();
    this.tag.material.map.dispose();
    for (const m of this.mats) m.dispose();
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
