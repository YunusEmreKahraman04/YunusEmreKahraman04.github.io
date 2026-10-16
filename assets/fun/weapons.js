// Weapon stats (after CS2), parametric gun models and the first-person view model.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const deg = Math.PI / 180;
const U = 0.0254; // one CS unit in metres
// base spray pattern: [pitch up, yaw right] in degrees, per shot (AK-like)
const BASE = [[0, 0], [0.5, 0], [1.1, 0.05], [1.8, -0.1], [2.5, 0.1], [3.1, 0.3], [3.6, 0.1], [4.0, -0.3], [4.3, -0.8], [4.5, -1.4], [4.6, -1.9], [4.6, -1.4], [4.7, -0.5], [4.7, 0.5], [4.8, 1.2], [4.8, 1.9], [4.9, 2.3], [4.9, 1.8], [4.9, 0.9], [5.0, 0], [5.0, -0.9], [5.0, -1.7], [5.1, -2.1], [5.1, -1.4], [5.1, -0.4], [5.2, 0.7], [5.2, 1.4], [5.2, 1.7], [5.2, 1.1], [5.3, 0.3]];
const pat = (p, y = p) => BASE.map(([a, b]) => [a * p * deg, b * y * deg]);

// cat: pistol smg rifle sniper shotgun heavy knife. team: T / CT / both. Speeds in units/s.
const DEF = {
  // ------------------------------------------------ pistols
  glock: { name: 'Glock-18', cat: 'pistol', team: 'T', price: 200, reward: 300, dmg: 30, pen: 0.47, range: 0.85, rate: 0.15, mag: 20, reserve: 120, reload: 2.27, spread: 0.006, move: 0.03, air: 0.12, heat: 0.012, kick: 1.6, speed: 240, sound: 'pistol' },
  usps: { name: 'USP-S', cat: 'pistol', team: 'CT', price: 200, reward: 300, dmg: 35, pen: 0.505, range: 0.91, rate: 0.17, mag: 12, reserve: 24, reload: 2.2, spread: 0.004, move: 0.03, air: 0.12, heat: 0.015, kick: 1.7, speed: 240, sound: 'usp' },
  p250: { name: 'P250', cat: 'pistol', team: 'both', price: 300, reward: 300, dmg: 38, pen: 0.64, range: 0.85, rate: 0.15, mag: 13, reserve: 26, reload: 2.2, spread: 0.006, move: 0.035, air: 0.12, heat: 0.018, kick: 2, speed: 240, sound: 'pistol' },
  fiveseven: { name: 'Five-SeveN', cat: 'pistol', team: 'CT', price: 500, reward: 300, dmg: 32, pen: 0.91, range: 0.81, rate: 0.15, mag: 20, reserve: 100, reload: 2.2, spread: 0.006, move: 0.03, air: 0.12, heat: 0.014, kick: 1.8, speed: 240, sound: 'pistol' },
  tec9: { name: 'Tec-9', cat: 'pistol', team: 'T', price: 500, reward: 300, dmg: 33, pen: 0.906, range: 0.83, rate: 0.12, mag: 18, reserve: 90, reload: 2.5, spread: 0.007, move: 0.025, air: 0.12, heat: 0.016, kick: 1.8, speed: 240, sound: 'pistol' },
  cz75: { name: 'CZ75-Auto', cat: 'pistol', team: 'both', price: 500, reward: 100, dmg: 31, pen: 0.776, range: 0.85, rate: 0.1, auto: true, mag: 12, reserve: 12, reload: 2.7, spread: 0.007, move: 0.03, air: 0.12, heat: 0.006, rec: 0.7, speed: 240, sound: 'pistol' },
  deagle: { name: 'Desert Eagle', cat: 'pistol', team: 'both', price: 700, reward: 300, dmg: 63, pen: 0.932, range: 0.81, rate: 0.225, mag: 7, reserve: 35, reload: 2.2, spread: 0.0045, move: 0.045, air: 0.14, heat: 0.022, kick: 2.6, speed: 230, sound: 'deagle' },
  // ------------------------------------------------ SMGs
  mac10: { name: 'MAC-10', cat: 'smg', team: 'T', price: 1050, reward: 600, dmg: 29, pen: 0.575, range: 0.8, rate: 0.075, auto: true, mag: 30, reserve: 100, reload: 2.6, spread: 0.009, move: 0.02, air: 0.1, heat: 0.0025, rec: 0.6, speed: 240, sound: 'smg' },
  mp9: { name: 'MP9', cat: 'smg', team: 'CT', price: 1250, reward: 600, dmg: 26, pen: 0.6, range: 0.87, rate: 0.07, auto: true, mag: 30, reserve: 120, reload: 2.1, spread: 0.008, move: 0.02, air: 0.1, heat: 0.0025, rec: 0.6, speed: 240, sound: 'smg' },
  mp7: { name: 'MP7', cat: 'smg', team: 'both', price: 1500, reward: 600, dmg: 29, pen: 0.625, range: 0.85, rate: 0.08, auto: true, mag: 30, reserve: 120, reload: 3.1, spread: 0.007, move: 0.022, air: 0.1, heat: 0.002, rec: 0.6, speed: 220, sound: 'smg' },
  ump45: { name: 'UMP-45', cat: 'smg', team: 'both', price: 1200, reward: 600, dmg: 35, pen: 0.65, range: 0.75, rate: 0.09, auto: true, mag: 25, reserve: 100, reload: 3.5, spread: 0.008, move: 0.025, air: 0.1, heat: 0.0025, rec: 0.7, speed: 230, sound: 'smg' },
  p90: { name: 'P90', cat: 'smg', team: 'both', price: 2350, reward: 300, dmg: 26, pen: 0.69, range: 0.86, rate: 0.07, auto: true, mag: 50, reserve: 100, reload: 3.3, spread: 0.008, move: 0.022, air: 0.1, heat: 0.002, rec: 0.55, speed: 230, sound: 'smg' },
  bizon: { name: 'PP-Bizon', cat: 'smg', team: 'both', price: 1400, reward: 600, dmg: 27, pen: 0.575, range: 0.8, rate: 0.08, auto: true, mag: 64, reserve: 120, reload: 2.4, spread: 0.009, move: 0.025, air: 0.1, heat: 0.0022, rec: 0.55, speed: 240, sound: 'smg' },
  // ------------------------------------------------ rifles
  galil: { name: 'Galil AR', cat: 'rifle', team: 'T', price: 1800, reward: 300, dmg: 30, pen: 0.775, range: 0.98, rate: 0.09, auto: true, mag: 35, reserve: 90, reload: 3.0, spread: 0.005, move: 0.05, air: 0.15, heat: 0.0025, rec: 0.95, speed: 215, sound: 'rifle' },
  famas: { name: 'FAMAS', cat: 'rifle', team: 'CT', price: 2050, reward: 300, dmg: 30, pen: 0.7, range: 0.96, rate: 0.09, auto: true, mag: 25, reserve: 90, reload: 3.3, spread: 0.0045, move: 0.05, air: 0.15, heat: 0.0025, rec: 0.9, speed: 220, sound: 'rifle' },
  ak47: { name: 'AK-47', cat: 'rifle', team: 'T', price: 2700, reward: 300, dmg: 36, pen: 0.775, range: 0.98, rate: 0.1, auto: true, mag: 30, reserve: 90, reload: 2.45, spread: 0.0035, move: 0.055, air: 0.16, heat: 0.0025, rec: 1.25, recY: 1.1, speed: 215, sound: 'ak' },
  m4a4: { name: 'M4A4', cat: 'rifle', team: 'CT', price: 3100, reward: 300, dmg: 33, pen: 0.7, range: 0.97, rate: 0.09, auto: true, mag: 30, reserve: 90, reload: 3.1, spread: 0.003, move: 0.05, air: 0.15, heat: 0.002, rec: 1.0, recY: 0.9, speed: 225, sound: 'm4' },
  m4a1s: { name: 'M4A1-S', cat: 'rifle', team: 'CT', price: 2900, reward: 300, dmg: 38, pen: 0.7, range: 0.99, rate: 0.1, auto: true, mag: 20, reserve: 80, reload: 3.1, spread: 0.0028, move: 0.05, air: 0.15, heat: 0.002, rec: 0.9, recY: 0.75, speed: 225, sound: 'sil' },
  sg553: { name: 'SG 553', cat: 'rifle', team: 'T', price: 3000, reward: 300, dmg: 30, pen: 1.0, range: 0.98, rate: 0.09, auto: true, mag: 30, reserve: 90, reload: 2.8, spread: 0.003, move: 0.055, air: 0.16, heat: 0.0022, rec: 1.0, zooms: [45], scopedSpread: 0.0015, scopedSpeed: 150, speed: 210, sound: 'rifle' },
  aug: { name: 'AUG', cat: 'rifle', team: 'CT', price: 3300, reward: 300, dmg: 28, pen: 0.9, range: 0.98, rate: 0.09, auto: true, mag: 30, reserve: 90, reload: 3.8, spread: 0.003, move: 0.055, air: 0.16, heat: 0.002, rec: 0.85, zooms: [45], scopedSpread: 0.0015, scopedSpeed: 150, speed: 220, sound: 'rifle' },
  // ------------------------------------------------ snipers
  ssg08: { name: 'SSG 08', cat: 'sniper', team: 'both', price: 1700, reward: 300, dmg: 88, pen: 0.85, range: 0.99, rate: 1.25, mag: 10, reserve: 90, reload: 3.7, spread: 0.045, scopedSpread: 0.0006, move: 0.08, air: 0.03, heat: 0, kick: 2.6, zooms: [40, 15], speed: 230, scopedSpeed: 230, bolt: true, sound: 'scout' },
  awp: { name: 'AWP', cat: 'sniper', team: 'both', price: 4750, reward: 100, dmg: 115, pen: 0.975, range: 0.99, rate: 1.46, mag: 5, reserve: 30, reload: 3.6, spread: 0.075, scopedSpread: 0.0004, move: 0.11, air: 0.3, heat: 0, kick: 3.2, zooms: [40, 10], speed: 200, scopedSpeed: 100, bolt: true, sound: 'awp' },
  scar20: { name: 'SCAR-20', cat: 'sniper', team: 'CT', price: 5000, reward: 300, dmg: 80, pen: 0.825, range: 0.98, rate: 0.25, mag: 20, reserve: 90, reload: 3.1, spread: 0.05, scopedSpread: 0.0012, move: 0.1, air: 0.25, heat: 0.004, kick: 1.6, zooms: [40, 15], speed: 215, scopedSpeed: 120, sound: 'auto' },
  g3sg1: { name: 'G3SG1', cat: 'sniper', team: 'T', price: 5000, reward: 300, dmg: 80, pen: 0.825, range: 0.98, rate: 0.25, mag: 20, reserve: 90, reload: 4.7, spread: 0.05, scopedSpread: 0.0012, move: 0.1, air: 0.25, heat: 0.004, kick: 1.6, zooms: [40, 15], speed: 215, scopedSpeed: 120, sound: 'auto' },
  // ------------------------------------------------ shotguns
  nova: { name: 'Nova', cat: 'shotgun', team: 'both', price: 1050, reward: 900, dmg: 26, pellets: 9, pen: 0.5, range: 0.7, rate: 0.88, mag: 8, reserve: 32, reload: 3.6, spread: 0.06, move: 0.02, air: 0.08, heat: 0, kick: 3, speed: 220, pump: true, sound: 'shotgun' },
  xm1014: { name: 'XM1014', cat: 'shotgun', team: 'both', price: 2000, reward: 600, dmg: 20, pellets: 6, pen: 0.8, range: 0.7, rate: 0.35, auto: true, mag: 7, reserve: 32, reload: 3.4, spread: 0.07, move: 0.02, air: 0.08, heat: 0, kick: 2.6, speed: 215, sound: 'shotgun' },
  mag7: { name: 'MAG-7', cat: 'shotgun', team: 'CT', price: 1300, reward: 900, dmg: 30, pellets: 8, pen: 0.75, range: 0.45, rate: 0.85, mag: 5, reserve: 32, reload: 2.5, spread: 0.04, move: 0.02, air: 0.08, heat: 0, kick: 3.2, speed: 225, pump: true, sound: 'shotgun' },
  sawedoff: { name: 'Sawed-Off', cat: 'shotgun', team: 'T', price: 1100, reward: 900, dmg: 32, pellets: 8, pen: 0.75, range: 0.45, rate: 0.85, mag: 7, reserve: 32, reload: 3.4, spread: 0.09, move: 0.02, air: 0.08, heat: 0, kick: 3.4, speed: 210, pump: true, sound: 'shotgun' },
  // ------------------------------------------------ heavy
  m249: { name: 'M249', cat: 'heavy', team: 'both', price: 5200, reward: 300, dmg: 32, pen: 0.8, range: 0.97, rate: 0.08, auto: true, mag: 100, reserve: 200, reload: 5.7, spread: 0.006, move: 0.08, air: 0.2, heat: 0.0018, rec: 0.8, speed: 195, sound: 'lmg' },
  negev: { name: 'Negev', cat: 'heavy', team: 'both', price: 1700, reward: 300, dmg: 35, pen: 0.71, range: 0.97, rate: 0.075, auto: true, mag: 150, reserve: 300, reload: 5.7, spread: 0.008, move: 0.08, air: 0.2, heat: 0.0012, rec: 0.6, speed: 150, sound: 'lmg' },
  // ------------------------------------------------ knife
  knife: { name: 'Knife', cat: 'knife', team: 'both', price: 0, reward: 1500, dmg: 40, altDmg: 65, rate: 0.42, altRate: 1.0, melee: 1.9, auto: true, mag: Infinity, reserve: 0, reload: 0, spread: 0, move: 0, air: 0, heat: 0, speed: 250, sound: 'knife' }
};

export const WEAPONS = {};
for (const [id, d] of Object.entries(DEF)) {
  WEAPONS[id] = {
    ...d, id,
    slot: d.cat === 'knife' ? 3 : d.cat === 'pistol' ? 2 : 1,
    speed: d.speed * U, scopedSpeed: (d.scopedSpeed || d.speed) * U,
    moveSpread: d.move, airSpread: d.air, crouchMul: d.cat === 'sniper' ? 0.8 : 0.72,
    pattern: d.auto ? pat(d.rec ?? 1, d.recY ?? d.rec ?? 1) : [[(d.kick || 0) * deg, 0]],
    viewPunch: d.cat === 'pistol' ? 0.7 : 0.55,
    hsMul: 4, legMul: 0.75, range: d.range ?? 1, maxRange: d.cat === 'shotgun' ? 60 : 300,
    pellets: d.pellets || 1
  };
}
export const WEAPON_IDS = Object.keys(DEF);
export const ARMOR = { kevlar: { name: 'Kevlar', price: 650 }, helmet: { name: 'Kevlar + Helmet', price: 1000 } };
export const BUY_GROUPS = [
  { key: 'pistol', ids: ['glock', 'usps', 'p250', 'fiveseven', 'tec9', 'cz75', 'deagle'] },
  { key: 'smg', ids: ['mac10', 'mp9', 'mp7', 'ump45', 'p90', 'bizon'] },
  { key: 'rifle', ids: ['galil', 'famas', 'ak47', 'm4a4', 'm4a1s', 'sg553', 'aug'] },
  { key: 'sniper', ids: ['ssg08', 'awp', 'scar20', 'g3sg1'] },
  { key: 'heavy', ids: ['nova', 'xm1014', 'mag7', 'sawedoff', 'm249', 'negev'] }
];
export const teamPistol = team => (team === 'CT' ? 'usps' : 'glock');

// ---------------------------------------------------------------- materials
function woodTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#8a4a20'; g.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 70; i++) {
    g.strokeStyle = `rgba(${40 + Math.random() * 30},${18 + Math.random() * 10},5,${0.15 + Math.random() * 0.3})`;
    g.lineWidth = 0.5 + Math.random() * 1.5;
    const x = Math.random() * 64;
    g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 6, 80, x - 6, 170, x + 2, 256); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const M = {};
export function gunMaterials() {
  if (M.metal) return M;
  const std = (color, metalness, roughness, extra = {}) => new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  Object.assign(M, {
    metal: std('#2a2c30', 0.8, 0.36), dark: std('#17181a', 0.35, 0.5), poly: std('#1d1e20', 0.05, 0.62),
    grey: std('#4a4e54', 0.5, 0.45), tan: std('#9a8a68', 0.1, 0.6), olive: std('#56653f', 0.15, 0.58), green: std('#4f5a3a', 0.15, 0.55),
    wood: std('#a8805f', 0, 0.5, { map: woodTexture() }), bake: std('#6b3418', 0.05, 0.42),
    steel: std('#c9cdd3', 1, 0.2), blade: std('#dfe3e8', 1, 0.12), brass: std('#d4a640', 1, 0.28),
    lens: std('#2a4f9e', 1, 0.04, { emissive: '#0b1a40' }), rubber: std('#141414', 0, 0.9), clear: std('#6b6250', 0.1, 0.25),
    packPlain: new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.05, roughness: 0.6 }),
    packMetal: new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.7, roughness: 0.32 })
  });
  return M;
}
// Quaternius' Ultimate Gun Pack (CC0), pre-baked into game space by tools/build_guns.py:
// grip at the origin, barrel down -z, metres. Records are 20 bytes each.
const PACK = {};
export async function loadGunPack(base) {
  const [idx, bin] = await Promise.all([fetch(base + 'guns.json').then(r => r.json()), fetch(base + 'guns.bin').then(r => r.arrayBuffer())]);
  const dv = new DataView(bin), stride = idx.stride;
  for (const [id, e] of Object.entries(idx.weapons)) {
    const parts = [{ p: [], n: [], c: [] }, { p: [], n: [], c: [] }];
    for (let k = 0; k < e.count; k++) {
      const o = (e.offset + k) * stride;
      const part = parts[dv.getUint8(o + 18) ? 1 : 0];
      part.p.push(dv.getFloat32(o, true), dv.getFloat32(o + 4, true), dv.getFloat32(o + 8, true));
      part.n.push(dv.getInt8(o + 12) / 127, dv.getInt8(o + 13) / 127, dv.getInt8(o + 14) / 127);
      part.c.push(dv.getUint8(o + 15) / 255, dv.getUint8(o + 16) / 255, dv.getUint8(o + 17) / 255);
    }
    PACK[id] = {
      geos: parts.map(q => {
        if (!q.p.length) return null;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(q.p, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(q.n, 3));
        g.setAttribute('color', new THREE.Float32BufferAttribute(q.c, 3));
        g.computeBoundingSphere();
        return g;
      }),
      muzzle: e.muzzle, hand: e.hand, port: e.port
    };
  }
}
function packModel(id) {
  const P = PACK[id], m = gunMaterials();
  const g = new THREE.Group();
  P.geos.forEach((geo, i) => { if (geo) { const mesh = new THREE.Mesh(geo, i ? m.packMetal : m.packPlain); mesh.castShadow = true; g.add(mesh); } });
  const muzzle = new THREE.Object3D(), port = new THREE.Object3D(), mag = new THREE.Group();
  muzzle.position.fromArray(P.muzzle); port.position.fromArray(P.port);
  g.add(mag, muzzle, port);
  g.userData = { muzzle, port, mag, bolt: null, slide: null, pump: null, hand: P.hand };
  return g;
}

export function setGunEnv(env) {
  const m = gunMaterials();
  for (const k in m) { m[k].envMap = env; m[k].needsUpdate = true; }
}

// ---------------------------------------------------------------- model building
const GEO = {};
const rb = (w, h, d, r = 0.006) => (GEO[`rb${w},${h},${d},${r}`] ||= new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.1, h / 2.1, d / 2.1)));
const cy = (r1, r2, len, seg = 14) => (GEO[`cy${r1},${r2},${len},${seg}`] ||= new THREE.CylinderGeometry(r1, r2, len, seg).rotateX(Math.PI / 2));
const sphere = r => (GEO['sp' + r] ||= new THREE.SphereGeometry(r, 12, 8));
function add(parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}
function bladeGeo() {
  if (GEO.blade) return GEO.blade;
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(0.2, 0.002); s.quadraticCurveTo(0.235, 0.004, 0.25, 0.022);
  s.quadraticCurveTo(0.2, 0.036, 0.12, 0.034); s.lineTo(0.0, 0.03); s.lineTo(0, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.003, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 1 });
  g.rotateY(Math.PI / 2); g.translate(-0.0015, -0.016, 0);
  return (GEO.blade = g);
}

// Shape specs for long guns. z is forward-negative, grip at the origin.
// recv [len, h, w, zCenter, mat], hg [len, h, w, z, mat], barrel [len, r, zCenter]
const SPEC = {
  ak47: { recv: [0.38, 0.07, 0.048, -0.2, 'metal'], top: [0.3, 0.022, 'metal'], hg: [0.24, 0.062, 0.058, -0.5, 'wood'], upper: 'wood', barrel: [0.3, 0.011, -0.75], muzzle: 'brake', stock: { t: 'solid', len: 0.3, mat: 'wood' }, grip: 'wood', mag: { t: 'curved', z: -0.275, mat: 'bake' }, sights: true },
  galil: { recv: [0.38, 0.07, 0.05, -0.2, 'metal'], top: [0.3, 0.02, 'metal'], hg: [0.24, 0.062, 0.06, -0.5, 'poly'], barrel: [0.3, 0.011, -0.75], muzzle: 'flash', stock: { t: 'skel', len: 0.28, mat: 'metal' }, grip: 'poly', mag: { t: 'curved', z: -0.275, mat: 'dark' }, sights: true },
  m4a4: { recv: [0.3, 0.062, 0.05, -0.17, 'dark'], rail: 0.42, hg: [0.26, 0.062, 0.064, -0.45, 'poly'], barrel: [0.2, 0.011, -0.68], muzzle: 'flash', stock: { t: 'tube', len: 0.2, mat: 'poly' }, grip: 'poly', mag: { t: 'straight', z: -0.205, len: 0.16, mat: 'metal' }, frontSight: -0.56 },
  m4a1s: { recv: [0.3, 0.062, 0.05, -0.17, 'dark'], rail: 0.42, hg: [0.24, 0.056, 0.056, -0.44, 'poly'], barrel: [0.12, 0.011, -0.63], muzzle: 'sup', supLen: 0.26, stock: { t: 'tube', len: 0.2, mat: 'poly' }, grip: 'poly', mag: { t: 'straight', z: -0.205, len: 0.12, mat: 'metal' }, frontSight: -0.56 },
  famas: { bullpup: true, recv: [0.56, 0.09, 0.055, -0.14, 'dark'], carry: true, barrel: [0.14, 0.011, -0.5], muzzle: 'flash', stock: { t: 'none' }, grip: 'poly', mag: { t: 'straight', z: 0.1, len: 0.12, mat: 'metal' }, hand: [0, -0.04, -0.3] },
  sg553: { recv: [0.34, 0.07, 0.05, -0.18, 'grey'], hg: [0.26, 0.065, 0.062, -0.48, 'poly'], barrel: [0.2, 0.011, -0.7], muzzle: 'flash', stock: { t: 'skel', len: 0.26, mat: 'poly' }, grip: 'poly', mag: { t: 'curved', z: -0.275, mat: 'clear' }, scope: { len: 0.2, r: 0.02, z: -0.16 } },
  aug: { bullpup: true, recv: [0.52, 0.085, 0.06, -0.12, 'green'], barrel: [0.22, 0.012, -0.55], muzzle: 'flash', stock: { t: 'none' }, grip: 'green', mag: { t: 'straight', z: 0.1, len: 0.13, mat: 'clear' }, scope: { len: 0.18, r: 0.024, z: -0.18 }, vgrip: -0.32, hand: [0, -0.1, -0.32] },
  mac10: { recv: [0.26, 0.1, 0.05, -0.1, 'dark'], barrel: [0.08, 0.011, -0.27], stock: { t: 'wire', len: 0.16, mat: 'metal' }, grip: 'dark', mag: { t: 'grip', mat: 'metal' }, hand: [0, -0.04, -0.2] },
  mp9: { recv: [0.28, 0.08, 0.05, -0.12, 'poly'], barrel: [0.1, 0.011, -0.31], stock: { t: 'skel', len: 0.18, mat: 'poly' }, grip: 'poly', mag: { t: 'grip', mat: 'metal' }, vgrip: -0.2, hand: [0, -0.1, -0.2] },
  mp7: { recv: [0.3, 0.08, 0.05, -0.12, 'dark'], rail: 0.26, dot: true, barrel: [0.08, 0.011, -0.31], muzzle: 'flash', stock: { t: 'tube', len: 0.16, mat: 'poly' }, grip: 'poly', mag: { t: 'grip', mat: 'metal' }, vgrip: -0.2, hand: [0, -0.1, -0.2] },
  ump45: { recv: [0.42, 0.085, 0.055, -0.2, 'poly'], barrel: [0.1, 0.013, -0.46], muzzle: 'flash', stock: { t: 'skel', len: 0.24, mat: 'poly' }, grip: 'poly', mag: { t: 'straight', z: -0.15, len: 0.18, mat: 'poly' }, hand: [0, -0.02, -0.33] },
  p90: { bullpup: true, recv: [0.48, 0.13, 0.065, -0.12, 'poly'], barrel: [0.06, 0.011, -0.39], stock: { t: 'none' }, grip: 'poly', mag: { t: 'top', z: -0.14, mat: 'clear' }, dot: true, hand: [0, -0.05, -0.28] },
  bizon: { recv: [0.34, 0.07, 0.048, -0.18, 'metal'], top: [0.26, 0.02, 'metal'], barrel: [0.18, 0.011, -0.45], muzzle: 'flash', stock: { t: 'wire', len: 0.26, mat: 'metal' }, grip: 'poly', mag: { t: 'helix', z: -0.42, mat: 'dark' }, sights: true, hand: [0, -0.06, -0.42] },
  ssg08: { recv: [0.62, 0.07, 0.05, -0.14, 'grey'], barrel: [0.5, 0.011, -0.69], muzzle: 'brake', stock: { t: 'thumb', len: 0.28, mat: 'grey' }, grip: 'grey', mag: { t: 'box', z: -0.16, mat: 'dark' }, scope: { len: 0.34, r: 0.02, z: -0.17, big: true }, bolt: true, hand: [0, -0.035, -0.4] },
  awp: { recv: [0.62, 0.08, 0.06, -0.15, 'olive'], barrel: [0.6, 0.015, -0.74], muzzle: 'brake', stock: { t: 'thumb', len: 0.3, mat: 'olive' }, grip: 'olive', mag: { t: 'box', z: -0.17, mat: 'dark' }, scope: { len: 0.36, r: 0.022, z: -0.18, big: true }, bolt: true, hand: [0, -0.035, -0.42] },
  scar20: { recv: [0.5, 0.085, 0.058, -0.2, 'dark'], rail: 0.4, hg: [0.22, 0.07, 0.066, -0.5, 'dark'], barrel: [0.3, 0.013, -0.75], muzzle: 'brake', stock: { t: 'solid', len: 0.26, mat: 'poly' }, grip: 'poly', mag: { t: 'straight', z: -0.2, len: 0.12, mat: 'metal' }, scope: { len: 0.32, r: 0.022, z: -0.18, big: true } },
  g3sg1: { recv: [0.48, 0.08, 0.055, -0.2, 'tan'], hg: [0.26, 0.07, 0.066, -0.52, 'tan'], barrel: [0.3, 0.013, -0.78], muzzle: 'flash', stock: { t: 'solid', len: 0.28, mat: 'tan' }, grip: 'dark', mag: { t: 'straight', z: -0.2, len: 0.14, mat: 'metal' }, scope: { len: 0.32, r: 0.022, z: -0.18, big: true } },
  nova: { recv: [0.24, 0.075, 0.05, -0.12, 'dark'], barrel: [0.5, 0.014, -0.48], tube: true, pump: [-0.4, 0.16, 'poly'], stock: { t: 'solid', len: 0.3, mat: 'poly' }, grip: 'poly', hand: [0, -0.06, -0.4] },
  xm1014: { recv: [0.26, 0.075, 0.05, -0.13, 'dark'], barrel: [0.46, 0.014, -0.48], tube: true, hg: [0.2, 0.05, 0.056, -0.42, 'poly'], stock: { t: 'tube', len: 0.24, mat: 'poly' }, grip: 'poly', hand: [0, -0.04, -0.42] },
  mag7: { recv: [0.3, 0.09, 0.055, -0.14, 'grey'], barrel: [0.2, 0.016, -0.38], pump: [-0.3, 0.12, 'dark'], vgrip: -0.3, stock: { t: 'skel', len: 0.2, mat: 'metal' }, grip: 'dark', mag: { t: 'grip', mat: 'dark' }, hand: [0, -0.1, -0.3] },
  sawedoff: { recv: [0.22, 0.07, 0.05, -0.11, 'metal'], barrel: [0.26, 0.016, -0.33], tube: true, pump: [-0.3, 0.14, 'wood'], stock: { t: 'none' }, grip: 'wood', hand: [0, -0.06, -0.3] },
  m249: { recv: [0.42, 0.11, 0.07, -0.18, 'metal'], hg: [0.2, 0.07, 0.07, -0.48, 'dark'], barrel: [0.32, 0.013, -0.74], muzzle: 'flash', stock: { t: 'solid', len: 0.28, mat: 'poly' }, grip: 'poly', mag: { t: 'box', z: -0.2, mat: 'olive', big: true }, carryHandle: true, bipod: true },
  negev: { recv: [0.44, 0.1, 0.066, -0.18, 'dark'], hg: [0.28, 0.08, 0.075, -0.52, 'dark'], barrel: [0.3, 0.013, -0.78], muzzle: 'flash', stock: { t: 'solid', len: 0.26, mat: 'dark' }, grip: 'dark', mag: { t: 'drum', z: -0.2, mat: 'dark' }, carryHandle: true, bipod: true }
};

function longGun(s, m) {
  const g = new THREE.Group(), mag = new THREE.Group();
  const muzzle = new THREE.Object3D(), port = new THREE.Object3D();
  let bolt = null, pump = null;
  const [rl, rh, rw, rz, rm] = s.recv;
  const ry = 0.03;
  add(g, rb(rw, rh, rl, 0.008), m[rm], 0, ry, rz);
  const front = rz - rl / 2, back = rz + rl / 2;
  if (s.top) add(g, rb(rw - 0.004, s.top[1], s.top[0], 0.008), m[s.top[2]], 0, ry + rh / 2, rz + 0.01);
  if (s.rail) {
    add(g, rb(0.026, 0.014, s.rail, 0.003), m.metal, 0, ry + rh / 2 + 0.007, rz - 0.05);
    for (let i = 0; i < Math.floor(s.rail / 0.03); i++) add(g, rb(0.03, 0.008, 0.01, 0.002), m.metal, 0, ry + rh / 2 + 0.016, rz + s.rail / 2 - 0.05 - i * 0.03);
  }
  if (s.carry) add(g, rb(0.026, 0.05, rl * 0.75, 0.01), m.dark, 0, ry + rh / 2 + 0.03, rz - 0.02);
  if (s.carryHandle) add(g, rb(0.02, 0.05, 0.12, 0.008), m.metal, 0, ry + rh / 2 + 0.03, rz - 0.05);
  let hgEnd = front, hgMid = front - 0.12;
  if (s.hg) {
    const [hl, hh, hw, hz, hm] = s.hg;
    add(g, rb(hw, hh, hl, 0.014), m[hm], 0, ry - 0.008, hz);
    if (s.upper) add(g, rb(hw * 0.8, 0.03, hl * 0.75, 0.01), m[s.upper], 0, ry + hh / 2 + 0.01, hz);
    hgEnd = hz - hl / 2; hgMid = hz;
  }
  const [bl, br, bz] = s.barrel;
  add(g, cy(br, br, bl), m.metal, 0, ry + 0.005, bz);
  let tip = bz - bl / 2;
  if (s.tube) add(g, cy(0.014, 0.014, bl * 0.85), m.dark, 0, ry - 0.03, bz + bl * 0.07);
  if (s.muzzle === 'brake') { add(g, cy(br * 1.6, br * 1.6, 0.06), m.metal, 0, ry + 0.005, tip - 0.03); tip -= 0.06; }
  else if (s.muzzle === 'flash') { add(g, cy(br * 1.3, br * 1.2, 0.05), m.dark, 0, ry + 0.005, tip - 0.025); tip -= 0.05; }
  else if (s.muzzle === 'sup') { add(g, cy(0.02, 0.02, s.supLen), m.dark, 0, ry + 0.005, tip - s.supLen / 2); tip -= s.supLen; }
  if (s.sights) { add(g, rb(0.012, 0.045, 0.014), m.metal, 0, ry + 0.035, tip + 0.06); add(g, rb(0.03, 0.03, 0.04), m.metal, 0, ry + 0.05, front + 0.03); }
  if (s.frontSight) add(g, rb(0.012, 0.055, 0.018), m.dark, 0, ry + 0.07, s.frontSight);
  if (s.pump) {
    pump = new THREE.Group();
    add(pump, rb(0.05, 0.05, s.pump[1], 0.014), m[s.pump[2]], 0, ry - 0.035, s.pump[0]);
    g.add(pump);
  }
  if (s.vgrip) add(g, rb(0.028, 0.08, 0.034, 0.01), m.poly, 0, ry - 0.075, s.vgrip);
  if (s.bipod) { add(g, rb(0.01, 0.01, 0.16, 0.003), m.metal, 0.012, ry - 0.04, hgEnd - 0.06); add(g, rb(0.01, 0.01, 0.16, 0.003), m.metal, -0.012, ry - 0.04, hgEnd - 0.06); }
  const st = s.stock || { t: 'none' };
  if (st.t === 'solid') { add(g, rb(rw * 0.92, 0.09, st.len, 0.012), m[st.mat], 0, ry - 0.04, back + st.len / 2, 0.1); add(g, rb(rw, 0.1, 0.02, 0.006), m.rubber, 0, ry - 0.06, back + st.len, 0.1); }
  else if (st.t === 'tube') { add(g, cy(0.016, 0.016, st.len * 0.8), m.dark, 0, ry + 0.01, back + st.len * 0.4); add(g, rb(rw * 0.9, 0.09, 0.14, 0.012), m[st.mat], 0, ry - 0.005, back + st.len - 0.05); }
  else if (st.t === 'skel') { add(g, rb(0.014, 0.014, st.len, 0.004), m[st.mat], 0, ry + 0.02, back + st.len / 2); add(g, rb(0.014, 0.014, st.len, 0.004), m[st.mat], 0, ry - 0.05, back + st.len / 2, 0.15); add(g, rb(rw, 0.09, 0.02, 0.006), m[st.mat], 0, ry - 0.02, back + st.len); }
  else if (st.t === 'wire') { add(g, rb(0.008, 0.008, st.len, 0.003), m.metal, 0.018, ry, back + st.len / 2); add(g, rb(0.008, 0.008, st.len, 0.003), m.metal, -0.018, ry, back + st.len / 2); add(g, rb(0.045, 0.06, 0.01, 0.003), m.metal, 0, ry - 0.01, back + st.len); }
  else if (st.t === 'thumb') { add(g, rb(rw * 0.95, 0.13, st.len, 0.02), m[st.mat], 0, ry - 0.045, back + st.len / 2); add(g, rb(rw * 0.85, 0.04, st.len * 0.6, 0.014), m[st.mat], 0, ry + 0.04, back + st.len * 0.45); add(g, rb(rw, 0.14, 0.03, 0.008), m.rubber, 0, ry - 0.045, back + st.len); }
  const gz = s.bullpup ? -0.02 : -0.03;
  add(g, rb(0.032, 0.1, 0.046, 0.01), m[s.grip] || m.poly, 0, -0.065, gz, -0.32);
  add(g, rb(0.008, 0.008, 0.07, 0.003), m.metal, 0, -0.03, gz - 0.06);
  const mg = s.mag;
  if (mg) {
    if (mg.t === 'curved') for (const [y, z, r] of [[-0.035, 0, 0.1], [-0.083, -0.007, 0.24], [-0.128, 0.003, 0.38], [-0.168, 0.023, 0.52]]) add(mag, rb(0.03, 0.056, 0.064, 0.006), m[mg.mat], 0, y, mg.z + z, r);
    else if (mg.t === 'straight') add(mag, rb(0.026, mg.len, 0.062, 0.006), m[mg.mat], 0, -mg.len / 2, mg.z, 0.12);
    else if (mg.t === 'grip') add(mag, rb(0.026, 0.05, 0.04, 0.006), m[mg.mat], 0, -0.14, gz + 0.03, -0.32);
    else if (mg.t === 'box') add(mag, rb(mg.big ? 0.08 : 0.04, mg.big ? 0.11 : 0.07, mg.big ? 0.12 : 0.09, 0.008), m[mg.mat], mg.big ? -0.01 : 0, mg.big ? -0.07 : -0.05, mg.z);
    else if (mg.t === 'drum') add(mag, cy(0.07, 0.07, 0.06, 20), m[mg.mat], 0, -0.08, mg.z, 0, Math.PI / 2);
    else if (mg.t === 'top') add(mag, rb(0.05, 0.03, 0.3, 0.01), m[mg.mat], 0, ry + rh / 2 + 0.012, mg.z);
    else if (mg.t === 'helix') add(mag, cy(0.03, 0.03, 0.3, 16), m[mg.mat], 0, ry - 0.045, mg.z + 0.1);
  }
  if (s.scope) {
    const sc = s.scope, y = ry + rh / 2 + 0.06;
    add(g, cy(sc.r, sc.r, sc.len, 18), m.dark, 0, y, sc.z);
    if (sc.big) {
      add(g, cy(sc.r + 0.014, sc.r, 0.08, 18), m.dark, 0, y, sc.z - sc.len / 2 - 0.035);
      add(g, cy(sc.r + 0.008, sc.r + 0.008, 0.06, 18), m.dark, 0, y, sc.z + sc.len / 2 + 0.02);
      add(g, cy(sc.r + 0.012, sc.r + 0.012, 0.004, 18), m.lens, 0, y, sc.z - sc.len / 2 - 0.076);
      add(g, cy(0.011, 0.011, 0.03), m.dark, 0, y + sc.r + 0.01, sc.z, Math.PI / 2);
    } else add(g, cy(sc.r + 0.004, sc.r + 0.004, 0.004, 18), m.lens, 0, y, sc.z - sc.len / 2);
    add(g, rb(0.026, 0.04, 0.026), m.metal, 0, y - 0.035, sc.z + sc.len * 0.3);
    add(g, rb(0.026, 0.04, 0.026), m.metal, 0, y - 0.035, sc.z - sc.len * 0.3);
  }
  if (s.dot) { add(g, rb(0.03, 0.035, 0.05, 0.008), m.dark, 0, ry + rh / 2 + 0.03, rz - 0.02); add(g, cy(0.012, 0.012, 0.003), m.lens, 0, ry + rh / 2 + 0.03, rz - 0.046); }
  if (s.bolt) {
    bolt = new THREE.Group();
    bolt.position.set(rw / 2, ry + 0.02, -0.02);
    add(bolt, rb(0.055, 0.009, 0.009, 0.003), m.steel, 0.028, 0, 0);
    add(bolt, sphere(0.013), m.steel, 0.058, 0, 0);
    g.add(bolt);
  }
  muzzle.position.set(0, ry + 0.005, tip);
  port.position.set(rw / 2 + 0.004, ry + 0.02, s.bullpup ? 0.02 : -0.15);
  return { g, mag, muzzle, port, bolt, pump, hand: s.hand || [0, -0.02, hgMid] };
}

const PISTOL = {
  glock: { len: 0.19, slide: 'grey', frame: 'poly', grip: 'poly' },
  usps: { len: 0.2, slide: 'dark', frame: 'poly', grip: 'poly', sup: 0.15 },
  p250: { len: 0.18, slide: 'steel', frame: 'poly', grip: 'poly' },
  fiveseven: { len: 0.2, slide: 'grey', frame: 'tan', grip: 'tan' },
  cz75: { len: 0.2, slide: 'metal', frame: 'metal', grip: 'wood', longMag: true },
  deagle: { len: 0.25, slide: 'steel', frame: 'steel', grip: 'rubber', big: true },
  tec9: { len: 0.24, slide: 'dark', frame: 'dark', grip: 'dark', tec: true }
};
function pistol(s, m) {
  const g = new THREE.Group(), mag = new THREE.Group(), slide = new THREE.Group();
  const muzzle = new THREE.Object3D(), port = new THREE.Object3D();
  const h = s.big ? 0.046 : 0.036, w = s.big ? 0.034 : 0.028, L = s.len;
  if (s.tec) {
    add(g, rb(w, 0.05, L, 0.006), m.dark, 0, 0.035, -L / 2 + 0.04);
    for (let i = 0; i < 6; i++) add(g, cy(0.004, 0.004, 0.002, 6), m.metal, 0.016, 0.04, -0.08 - i * 0.022, 0, Math.PI / 2);
    add(mag, rb(0.024, 0.15, 0.04, 0.006), m.metal, 0, -0.06, -0.09, 0.05);
    add(g, cy(0.007, 0.007, 0.04), m.metal, 0, 0.035, -L + 0.02);
    muzzle.position.set(0, 0.035, -L);
  } else {
    add(slide, rb(w, h, L, 0.006), m[s.slide], 0, 0.03 + h / 2, -L / 2 + 0.03);
    for (let i = 0; i < 5; i++) add(slide, rb(w + 0.002, h * 0.8, 0.003, 0.001), m.dark, 0, 0.03 + h / 2, 0.02 - i * 0.007);
    add(slide, rb(0.008, 0.01, 0.01, 0.002), m.dark, 0, 0.03 + h + 0.004, -L + 0.04);
    g.add(slide);
    add(g, rb(w - 0.002, 0.026, L * 0.85, 0.005), m[s.frame], 0, 0.016, -L * 0.4 + 0.02);
    let tip = -L + 0.03;
    if (s.sup) { add(g, cy(0.016, 0.016, s.sup), m.dark, 0, 0.03 + h * 0.6, tip - s.sup / 2); tip -= s.sup; }
    muzzle.position.set(0, 0.03 + h * 0.6, tip);
    add(mag, rb(w - 0.006, s.longMag ? 0.05 : 0.014, 0.046, 0.004), m.dark, 0, s.longMag ? -0.135 : -0.11, 0.035, -0.22);
  }
  add(g, rb(w + 0.002, 0.11, 0.052, 0.012), m[s.grip], 0, -0.045, 0.02, -0.22);
  add(g, rb(0.008, 0.008, 0.045, 0.003), m.metal, 0, -0.016, -0.06);
  add(g, rb(0.008, 0.028, 0.008, 0.003), m.metal, 0, -0.006, -0.084);
  port.position.set(w / 2, 0.06, -0.05);
  return { g, mag, muzzle, port, slide: s.tec ? null : slide, hand: null };
}

function knife(m) {
  const g = new THREE.Group();
  add(g, rb(0.026, 0.032, 0.12, 0.01), m.rubber, 0, 0, 0.02);
  for (let i = 0; i < 4; i++) add(g, rb(0.028, 0.004, 0.006, 0.001), m.dark, 0, 0, 0.06 - i * 0.025);
  add(g, rb(0.05, 0.044, 0.012, 0.004), m.steel, 0, 0, -0.045);
  add(g, bladeGeo(), m.blade, 0, 0.004, -0.05);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0, -0.28);
  return { g, mag: new THREE.Group(), muzzle, port: new THREE.Object3D(), hand: null };
}

// Gun points down -z with the grip at the origin. userData holds refs for animation.
export function gunModel(id) {
  if (PACK[id]) return packModel(id);
  const m = gunMaterials();
  const r = id === 'knife' ? knife(m) : PISTOL[id] ? pistol(PISTOL[id], m) : longGun(SPEC[id] || SPEC.ak47, m);
  r.g.add(r.mag, r.muzzle, r.port);
  r.g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  r.g.userData = { muzzle: r.muzzle, port: r.port, mag: r.mag, bolt: r.bolt || null, slide: r.slide || null, pump: r.pump || null, hand: r.hand };
  return r.g;
}

// Bakes a static group into one mesh per material, or into a single vertex-coloured
// mesh when `shared` is given (cheap third-person models: one draw call per part).
export function mergeStatic(group, shared = null) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map();
  group.traverse(o => {
    if (!o.isMesh) return;
    let geo = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    if (geo.index) geo = geo.toNonIndexed();
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    if (shared) {
      const c = o.material.color || new THREE.Color(1, 1, 1), n = geo.attributes.position.count, arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
      geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    }
    const key = shared || o.material;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(geo);
  });
  const out = new THREE.Group();
  for (const [mat, geos] of buckets) {
    const mesh = new THREE.Mesh(mergeGeometries(geos), mat);
    mesh.castShadow = true;
    out.add(mesh);
    geos.forEach(x => x.dispose());
  }
  return out;
}
// one baked geometry per weapon, shared by every third-person model
const TP = {};
export function thirdPersonGun(id, mat) {
  if (!TP[id]) {
    const gm = gunModel(id);
    const merged = mergeStatic(gm, mat);
    TP[id] = { geometry: merged.children[0].geometry, muzzle: gm.userData.muzzle.position.clone() };
  }
  return TP[id];
}

// ---------------------------------------------------------------- first-person view
const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
const seg = (t, a, b) => ease((t - a) / (b - a));

function flashTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,245,1)'); gr.addColorStop(0.2, 'rgba(255,214,120,.95)'); gr.addColorStop(0.6, 'rgba(255,130,30,.35)'); gr.addColorStop(1, 'rgba(255,90,10,0)');
  g.fillStyle = gr;
  g.beginPath();
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * Math.PI * 2, r = i % 2 ? 18 + Math.random() * 8 : 50 + Math.random() * 14;
    g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
  }
  g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// where each kind of gun sits in front of the camera (x right, y up, z forward is negative), at view scale 0.5
const OFFSET = {
  pistol: [0.11, -0.115, -0.27], smg: [0.12, -0.13, -0.28], rifle: [0.13, -0.135, -0.3], sniper: [0.125, -0.13, -0.29],
  shotgun: [0.13, -0.135, -0.3], heavy: [0.14, -0.15, -0.31], knife: [0.13, -0.125, -0.26]
};
const ELBOW_R = new THREE.Vector3(0.34, -0.5, 0.5);
const ELBOW_L = new THREE.Vector3(-0.72, -0.5, 0.32);
const FWD = new THREE.Vector3(0, 0, -1);
const SILENT = new Set(['usps', 'm4a1s']);

export class ViewModel {
  constructor(team) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.01, 10);
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#3a3a44', 0.9));
    const key = new THREE.DirectionalLight('#fff3e0', 2.2); key.position.set(1.5, 2, 1); this.scene.add(key);
    const rim = new THREE.DirectionalLight('#9ec2ff', 0.8); rim.position.set(-2, 0.5, -1.5); this.scene.add(rim);
    this.root = new THREE.Group();
    this.root.scale.setScalar(0.5);
    this.scene.add(this.root);
    this.team = team;
    this.sleeveMat = new THREE.MeshStandardMaterial({ color: team === 'CT' ? '#23364f' : '#6c5438', roughness: 0.92 });
    this.cuffMat = new THREE.MeshStandardMaterial({ color: team === 'CT' ? '#1f3149' : '#5a4630', roughness: 0.95 });
    this.gloveMat = new THREE.MeshStandardMaterial({ color: team === 'CT' ? '#1c1e22' : '#3b2f24', roughness: 0.75 });
    this.guns = {};
    this.armR = this.makeArm(true);
    this.armL = this.makeArm(false);
    this.root.add(this.armR.g, this.armL.g);

    const fm = new THREE.MeshBasicMaterial({ map: flashTexture(), color: new THREE.Color(3, 2.6, 2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide });
    this.flash = new THREE.Group();
    const side = new THREE.PlaneGeometry(0.1, 0.32); side.rotateX(Math.PI / 2); side.translate(0, 0, -0.14);
    const a = new THREE.Mesh(side, fm), b = new THREE.Mesh(side, fm); b.rotation.z = Math.PI / 2;
    this.flashFront = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), fm);
    this.flash.add(a, b, this.flashFront);
    this.flash.visible = false;
    this.flashLight = new THREE.PointLight('#ffb15a', 0, 1.6, 2);
    this.scene.add(this.flashLight);

    const shellGeo = new THREE.CylinderGeometry(0.0055, 0.0055, 0.032, 8); shellGeo.rotateX(Math.PI / 2);
    this.shells = new THREE.InstancedMesh(shellGeo, gunMaterials().brass, 24);
    this.shells.frustumCulled = false;
    this.shellP = Array.from({ length: 24 }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3() }));
    this.shellI = 0;
    this.scene.add(this.shells);

    // a spare magazine that the support hand brings in during reloads
    this.magProp = new THREE.Mesh(rb(0.03, 0.15, 0.06, 0.008), gunMaterials().dark);
    this.magProp.visible = false;
    this.root.add(this.magProp);

    this.current = null;
    this.t = 0; this.kick = 0; this.draw = 0; this.swayX = 0; this.swayY = 0; this.flashT = 0; this.swing = 0; this.swingSide = 1;
    this.bolt = -1; this.boltEjected = false; this.slideT = 0; this.inspectT = -1; this.land = 0; this.crouchK = 0;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(1, 1, 1);
    this._v = new THREE.Vector3(); this._h = new THREE.Vector3(); this._l = new THREE.Vector3(); this._g = new THREE.Vector3();
  }
  makeArm(right) {
    const g = new THREE.Group();
    const fore = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.085, 1, 2, 0.02), this.sleeveMat);
    const cuff = new THREE.Mesh(new RoundedBoxGeometry(0.096, 0.096, 0.05, 2, 0.02), this.cuffMat);
    const hand = new THREE.Group();
    add(hand, rb(0.05, 0.07, 0.085, 0.018), this.gloveMat, 0, 0, 0);
    for (let i = 0; i < 4; i++) add(hand, rb(0.016, 0.02, 0.05, 0.007), this.gloveMat, right ? -0.03 : 0.03, 0.022 - i * 0.017, -0.03, 0, right ? 0.5 : -0.5);
    add(hand, rb(0.018, 0.018, 0.055, 0.007), this.gloveMat, right ? -0.02 : 0.02, 0.04, -0.045, -0.4);
    g.add(fore, cuff, hand);
    return { g, fore, cuff, hand, right };
  }
  holder(id) {
    if (this.guns[id]) return this.guns[id];
    const holder = new THREE.Group();
    const gun = gunModel(id);
    holder.add(gun);
    holder.visible = false;
    this.root.add(holder);
    return (this.guns[id] = { holder, gun, ...gun.userData });
  }
  setEnv(env) { this.scene.environment = env; }
  setWeapon(id) {
    if (this.current === id) return;
    if (this.current) this.guns[this.current].holder.visible = false;
    this.current = id;
    const g = this.holder(id);
    g.holder.visible = true;
    g.muzzle.add(this.flash);
    this.draw = 1; this.bolt = -1; this.inspectT = -1;
    this.armL.g.visible = !!g.hand || WEAPONS[id].cat === 'pistol';
  }
  inspect() { if (this.inspectT < 0 && this.draw <= 0) this.inspectT = 0; }
  fire(melee) {
    this.inspectT = -1;
    if (melee) { this.swing = 1; this.swingSide = -this.swingSide; return; }
    const W = WEAPONS[this.current];
    this.kick = W.cat === 'shotgun' || W.cat === 'sniper' ? 1.4 : 1;
    this.flashT = SILENT.has(this.current) ? 0 : 0.045;
    this.flash.rotation.z = Math.random() * Math.PI;
    const s = (0.75 + Math.random() * 0.5) * (W.cat === 'shotgun' ? 1.4 : W.cat === 'pistol' ? 0.7 : 1);
    this.flash.scale.set(s, s, s * (0.8 + Math.random() * 0.4));
    this.flashFront.rotation.z = Math.random() * 6;
    if (W.bolt || W.pump) { this.bolt = 0; this.boltEjected = false; }
    else { this.eject(); if (W.cat === 'pistol') this.slideT = 1; }
  }
  eject() {
    const g = this.guns[this.current];
    if (!g || !g.port) return;
    const p = this.shellP[this.shellI];
    this.shellI = (this.shellI + 1) % this.shellP.length;
    this.root.updateMatrixWorld(true);
    g.port.getWorldPosition(p.p);
    p.v.set(1.1 + Math.random() * 0.5, 0.9 + Math.random() * 0.5, 0.25 + Math.random() * 0.3);
    p.w.set((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30);
    p.r.set(0, Math.random() * 3, 0);
    p.life = 0.8;
  }
  resize(aspect) { this.camera.aspect = aspect; this.camera.updateProjectionMatrix(); }

  update(dt, st) {
    // st: {speed, onGround, mouseDX, mouseDY, reloading (0..1 or -1), scoped, crouch, landed}
    const id = this.current, G = this.guns[id];
    if (!G) return;
    const W = WEAPONS[id];
    const moving = st.onGround ? Math.min(1, st.speed / 5) : 0;
    this.t += dt * (0.4 + moving) * 8.5;
    this.swayX += (-st.mouseDX * 0.00025 - this.swayX) * Math.min(1, dt * 10);
    this.swayY += (st.mouseDY * 0.00025 - this.swayY) * Math.min(1, dt * 10);
    this.swayX = Math.max(-0.03, Math.min(0.03, this.swayX)); this.swayY = Math.max(-0.03, Math.min(0.03, this.swayY));
    this.kick = Math.max(0, this.kick - dt * 9);
    this.draw = Math.max(0, this.draw - dt * 2.6);
    this.swing = Math.max(0, this.swing - dt * 3.2);
    this.slideT = Math.max(0, this.slideT - dt * 14);
    if (st.landed) this.land = 1;
    this.land = Math.max(0, this.land - dt * 4);
    this.crouchK += ((st.crouch ? 1 : 0) - this.crouchK) * Math.min(1, dt * 8);
    this.flashT -= dt;
    this.flash.visible = this.flashT > 0;
    this.flashLight.intensity = this.flashT > 0 ? 2.5 : 0;
    if (this.flashT > 0) this.flash.getWorldPosition(this.flashLight.position);

    const o = OFFSET[W.cat] || OFFSET.rifle;
    const rel = st.reloading, reloading = rel >= 0;
    const idle = performance.now() / 1000;
    const bx = Math.sin(this.t) * 0.007 * moving + Math.sin(idle * 1.3) * 0.0012;
    const by = -Math.abs(Math.cos(this.t)) * 0.006 * moving + Math.sin(idle * 2.1) * 0.0012;
    let px = o[0] + bx + this.swayX, py = o[1] + by + this.swayY - this.draw * 0.14 - this.land * 0.012 - this.crouchK * 0.006, pz = o[2] + this.kick * 0.028;
    let rx = this.kick * 0.07 - this.draw * 0.9 + this.swing * 0.45, ry = 0.05 + this.swing * 0.8 * this.swingSide, rz = -this.swayX * 2 - this.swing * 0.5 * this.swingSide;

    if (reloading) {
      const tilt = seg(rel, 0, 0.15) * (1 - seg(rel, 0.85, 1));
      // tilt the gun a little and lift it so the magazine well is in view
      rz += tilt * 0.32; rx += tilt * 0.12; ry -= tilt * 0.08; py += tilt * 0.012; px -= tilt * 0.018;
    }
    // bolt / pump cycle after a shot
    if (this.bolt >= 0) {
      this.bolt += dt;
      const b = this.bolt, k = W.pump ? 0.55 : 1;
      const roll = seg(b, 0.3 * k, 0.45 * k) * (1 - seg(b, 1.0 * k, 1.2 * k));
      rz += roll * (W.pump ? 0.15 : 0.35); rx += roll * 0.08;
      if (G.bolt) {
        G.bolt.rotation.z = seg(b, 0.35, 0.5) * (1 - seg(b, 0.95, 1.1)) * 1.2;
        G.bolt.position.z = -0.02 + seg(b, 0.5, 0.65) * (1 - seg(b, 0.75, 0.9)) * 0.09;
      }
      if (G.pump) G.pump.position.z = seg(b, 0.2, 0.35) * (1 - seg(b, 0.42, 0.58)) * 0.09;
      if (b >= 0.6 * k && !this.boltEjected) { this.eject(); this.boltEjected = true; }
      if (b > 1.25 * k) this.bolt = -1;
    }
    if (this.inspectT >= 0) {
      this.inspectT += dt;
      const t = this.inspectT;
      const a = seg(t, 0, 0.5) * (1 - seg(t, 1.3, 1.8));
      const b = seg(t, 1.3, 1.8) * (1 - seg(t, 2.4, 2.9));
      ry += a * 0.9 - b * 0.5; rz += a * -0.5 + b * 1.2; rx += a * 0.25 + b * 0.1; px -= a * 0.03; py += a * 0.02;
      if (t > 2.9) this.inspectT = -1;
    }
    const r = this.root;
    r.position.set(px, py, pz);
    r.rotation.set(rx, ry, rz);
    r.visible = !st.scoped;

    if (G.mag) {
      if (reloading) {
        const d = seg(rel, 0.15, 0.32) * (1 - seg(rel, 0.45, 0.68));
        G.mag.position.set(0, -d * 0.45, d * 0.08);
        G.mag.visible = !(rel > 0.32 && rel < 0.45);
      } else { G.mag.position.set(0, 0, 0); G.mag.visible = true; }
    }
    if (G.slide) G.slide.position.z = this.slideT * 0.04;

    this.placeArm(this.armR, G.gun, this._h.set(0, -0.035, 0), ELBOW_R);
    // reload: the support hand pulls the mag down out of view and brings a fresh one up into the well
    const pistol = W.cat === 'pistol';
    const well = pistol ? this._g.set(0, -0.15, 0.03) : this._g.set(0, -0.1, -0.2);
    const withMag = reloading && W.cat !== 'shotgun' && W.cat !== 'knife';
    let k = 0;
    if (withMag) {
      k = seg(rel, 0.08, 0.18) * (1 - seg(rel, 0.7, 0.82));
      const down = seg(rel, 0.18, 0.32) * (1 - seg(rel, 0.45, 0.66));
      well.y -= down * 0.3; well.z += down * 0.05;
      this.magProp.scale.set(1, pistol ? 0.7 : (W.cat === 'heavy' ? 0.8 : 1), pistol ? 0.8 : 1);
      this.magProp.position.copy(well).applyMatrix4(G.gun.matrix);
      this.magProp.rotation.set(pistol ? -0.22 : 0.12, 0, 0);
      this.magProp.visible = rel > 0.14 && rel < 0.7;
      // seating the new mag gives the gun a little upward slap
      r.position.y += seg(rel, 0.62, 0.68) * (1 - seg(rel, 0.68, 0.78)) * 0.012;
    } else this.magProp.visible = false;
    if (this.armL.g.visible || (withMag && pistol)) {
      const hl = this._l;
      if (G.hand) {
        hl.set(...G.hand);
        if (G.pump) hl.z += G.pump.position.z;
      } else hl.set(-0.025, -0.08, 0);
      if (withMag) hl.lerp(this._h.copy(well).add(this._v.set(0, -0.06, 0)), k);
      this.armL.g.visible = true;
      this.placeArm(this.armL, G.gun, hl, ELBOW_L);
    }

    for (let i = 0; i < this.shellP.length; i++) {
      const p = this.shellP[i];
      if (p.life <= 0) { this._m.makeScale(0, 0, 0); this.shells.setMatrixAt(i, this._m); continue; }
      p.life -= dt;
      p.v.y -= 6 * dt;
      p.p.addScaledVector(p.v, dt);
      p.r.x += p.w.x * dt; p.r.y += p.w.y * dt; p.r.z += p.w.z * dt;
      this._q.setFromEuler(p.r);
      this._m.compose(p.p, this._q, this._s);
      this.shells.setMatrixAt(i, this._m);
    }
    this.shells.instanceMatrix.needsUpdate = true;
    this.shells.visible = !st.scoped;
  }
  placeArm(arm, gun, gripLocal, elbow) {
    const dir = this._v.copy(gripLocal).applyMatrix4(gun.matrix).sub(elbow);
    const len = dir.length();
    dir.normalize();
    arm.g.position.copy(elbow);
    arm.g.quaternion.setFromUnitVectors(FWD, dir);
    arm.fore.scale.z = Math.max(0.05, len - 0.04);
    arm.fore.position.z = -(len - 0.04) / 2;
    arm.cuff.position.z = -(len - 0.07);
    arm.hand.position.z = -len;
  }
}
