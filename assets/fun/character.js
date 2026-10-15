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

    this.tag = nameTag(name, TAG[team] || TAG.T);
    this.tag.position.y = 2.25;
    this.root.add(this.tag);
    this.cur = null; this.weapon = null; this.gunNode = null; this.flinch = 0; this.ghost = false; this.wasAlive = true;
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
    const node = id === 'deagle' ? 'Revolver' : NODE_FOR[WEAPONS[id].cat] || 'AK';
    for (const [n, g] of Object.entries(this.guns)) g.visible = n === node;
    this.gunNode = this.guns[node] || null;
  }
  hit() { this.flinch = 1; }
  killedFrom() { /* the death animation decides the fall */ }
  // s: {p, yaw, pitch, crouch, alive, speed, onGround, showTag, protected}
  update(dt, s) {
    this.root.position.set(s.p[0], s.p[1], s.p[2]);
    this.root.rotation.y = s.yaw;
    const knife = this.weapon === 'knife';
    if (!s.alive) this.play('Death', 0.1);
    else if (s.onGround === false) this.play('Jump_Idle', 0.15);
    else if (s.crouch) this.play('Duck');
    else if (s.speed > 3.6) this.play(knife ? 'Run' : 'Run_Gun');
    else if (s.speed > 0.5) this.play(knife ? 'Walk' : 'Walk_Shoot');
    else this.play('Idle_Shoot');
    const a = this.actions[this.cur];
    if (a && (this.cur === 'Run_Gun' || this.cur === 'Run' || this.cur === 'Walk_Shoot' || this.cur === 'Walk')) a.timeScale = Math.max(0.6, Math.min(1.4, s.speed / (this.cur.startsWith('Run') ? 5.5 : 2.5)));
    this.mixer.update(dt);
    // aim up and down by bending the spine on top of the animation
    this.flinch = Math.max(0, this.flinch - dt * 6);
    if (s.alive) {
      if (this.spine) this.spine.rotateX(-s.pitch * 0.55 - this.flinch * 0.12);
      if (this.neck) this.neck.rotateX(-s.pitch * 0.35);
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
