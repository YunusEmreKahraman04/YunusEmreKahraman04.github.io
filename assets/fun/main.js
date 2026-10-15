// YEK STRIKE: a small Counter-Strike replica that runs on static hosting.
// Each browser simulates its own player (and, on the room host, the bots) and
// shares state peer-to-peer. Shooters detect hits and tell the victim's owner.
import * as THREE from 'three';
import { MAPS, MAP_ORDER } from './maps.js';
import { buildWorld } from './world.js';
import { BODY, pmove, rayWorld, rayFace, rayBodyZones } from './physics.js';
import { WEAPONS, WEAPON_IDS, ARMOR, BUY_GROUPS, teamPistol, ViewModel, setGunEnv } from './weapons.js';
import { Gfx, GFX_DEFAULTS, PRESETS } from './gfx.js';
import { Avatar, GUN_MAT } from './avatar.js';
import { thirdPersonGun } from './weapons.js';
import { Sfx } from './audio.js';
import { Hud, drawCrosshair } from './hud.js';
import { Effects } from './effects.js';
import { BotBrain, BOT_NAMES } from './bots.js';
import { joinLobby, joinMatch, selfId, makeRoomId, parseRoomId, relayCount } from './net.js';

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const root = document.documentElement;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
};
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = s => String(s || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 16) || 'Player';

// ---------------------------------------------------------------- language
const STR = {
  tr: {
    kicker: 'FUN · P2P MULTIPLAYER', sub: 'Tarayıcıda Counter-Strike replikası. Sunucu yok: oyuncular WebRTC ile birbirine doğrudan bağlanır. Haritanı seç, gir, vur.',
    nick: 'Takma ad', team: 'Takım', auto: 'Otomatik', bots: 'Botlar', on: 'Açık', off: 'Kapalı', play: 'OYNA', servers: 'SUNUCULAR',
    players: 'oyuncu', empty: 'boş · botlar bekliyor', online: 'çevrimiçi', connecting: 'bağlanıyor…',
    controls: 'KONTROLLER', ctlMove: 'Hareket', ctlJump: 'Zıpla', ctlCrouch: 'Eğil', ctlWalk: 'Yürü', ctlFire: 'Ateş', ctlAlt: 'Dürbün / ağır bıçak',
    ctlReload: 'Şarjör', ctlSwitch: 'Silah', ctlLast: 'Son silah', ctlBoard: 'Skor', ctlChat: 'Sohbet', ctlTeam: 'Takım değiştir', ctlBuy: 'Satın al', ctlInspect: 'İncele',
    desktop: 'Bu oyun klavye + fare ister. Masaüstünden gir.',
    clickToPlay: 'OYNAMAK İÇİN TIKLA', toLobby: 'Lobiye dön', sens: 'Hassasiyet (CS2)', fov: 'Görüş açısı', vol: 'Ses',
    killedBy: 'Seni vuran', died: 'Öldün', respawnIn: '{s} sn içinde yeniden doğuyorsun', player: 'Oyuncu',
    joined: '{n} oyuna katıldı', left: '{n} oyundan ayrıldı', switched: 'Takım: {t}', protect: 'SPAWN KORUMASI',
    peers: 'bağlı', alone: 'Şimdilik botlarla yalnızsın. Linki bir arkadaşına at, aynı haritayı seçsin.', chatPh: 'Mesaj yaz, Enter ile gönder',
    lockFail: 'Fare kilitlenemedi, tekrar tıkla.', back: 'Portfolyo',
    settings: 'Ayarlar', crosshair: 'Nişangah', close: 'Kapat', tabGame: 'Oyun', tabXhair: 'Nişangah', tabGfx: 'Grafik',
    preset: 'Hazır ayar', pLow: 'Düşük', pMed: 'Orta', pHigh: 'Yüksek', pUltra: 'Ultra',
    fpsCap: 'FPS limiti', scale: 'Çözünürlük', autoRes: 'Otomatik çözünürlük', shadows: 'Gölgeler',
    sOff: 'Kapalı', sLow: 'Düşük', sHigh: 'Yüksek', sUltra: 'Ultra', bloom: 'Bloom', aa: 'Kenar yumuşatma', fpsShow: 'FPS göster', aaNote: 'Kenar yumuşatma değişikliği sayfa yenilenince uygulanır.',
    xColor: 'Renk', xSize: 'Uzunluk', xGap: 'Boşluk', xThick: 'Kalınlık', xAlpha: 'Opaklık', xDot: 'Orta nokta', xOutline: 'Kontur', xDynamic: 'Dinamik', xT: 'T-stili', xReset: 'Varsayılan',
    refresh: 'Ekran: {hz} Hz', buy: 'SATIN AL', buyClosed: 'Satın alma süresi bitti (spawn bölgesine dön)', noMoney: 'Yetersiz para', bought: '{n} alındı',
    gPistol: 'Tabancalar', gSmg: 'Hafif makineli', gRifle: 'Tüfekler', gSniper: 'Keskin nişancı', gHeavy: 'Ağır', gGear: 'Ekipman',
    autoBuy: 'Ölünce aynı silahları tekrar al', statDmg: 'Hasar', statRate: 'Atış hızı', statMob: 'Hareket', buyHint: 'B ile kapat',
    rounds: 'Raunt', dm: 'DM', nextRound: 'Bir sonraki rauntta doğacaksın', tWin: 'TERÖRİSTLER KAZANDI', ctWin: 'ANTİ-TERÖRİSTLER KAZANDI',
    matchOver: 'MAÇ BİTTİ', roundN: 'RAUNT {n}', winMoney: '+${m} raunt ödülü', fullscreen: 'Tam ekran (Ctrl ile eğilme)',
    ctrlHint: 'Ctrl ile eğilmek için tam ekran gerekir (Ayarlar). Şimdilik C kullan.', freeze: 'Hazırlan…',
    lobbies: 'LOBİLER', lobbiesOpen: '{n} açık lobi', createLobby: '+ Yeni lobi oluştur', join: 'KATIL', full: 'DOLU', yours: 'SENİN',
    noLobbies: 'Şu an açık lobi yok. Yeni bir lobi oluştur ya da OYNA\'ya bas, arkadaşın LOBİLER\'den seni görsün.',
    hostBy: 'host: {n}', bots_n: '+{n} bot', invite: 'Davet linkini kopyala', copied: 'Davet linki kopyalandı, arkadaşına gönder.',
    inviteFor: 'Davet edildin', joinInvite: 'LOBİYE KATIL', relays: '{n} sinyal', noRelay: 'Sinyal sunucularına ulaşılamıyor: ağın (okul/iş ağı, VPN) engelliyor olabilir.',
    p2pFail: 'Bir oyuncuyla doğrudan bağlantı kurulamadı (ağ/NAT engeli). Farklı bir ağdan (ör. telefondan hotspot) deneyin.', lobbyCode: 'Lobi', modeRounds: '{n} raunt'
  },
  en: {
    kicker: 'FUN · P2P MULTIPLAYER', sub: 'A Counter-Strike replica in the browser. No server: players connect to each other directly over WebRTC. Pick a map, jump in, shoot.',
    nick: 'Nickname', team: 'Team', auto: 'Auto', bots: 'Bots', on: 'On', off: 'Off', play: 'PLAY', servers: 'SERVERS',
    players: 'players', empty: 'empty · bots waiting', online: 'online', connecting: 'connecting…',
    controls: 'CONTROLS', ctlMove: 'Move', ctlJump: 'Jump', ctlCrouch: 'Crouch', ctlWalk: 'Walk', ctlFire: 'Fire', ctlAlt: 'Scope / heavy stab',
    ctlReload: 'Reload', ctlSwitch: 'Weapons', ctlLast: 'Last weapon', ctlBoard: 'Scores', ctlChat: 'Chat', ctlTeam: 'Switch team', ctlBuy: 'Buy', ctlInspect: 'Inspect',
    desktop: 'This game needs a keyboard and mouse. Open it on a desktop.',
    clickToPlay: 'CLICK TO PLAY', toLobby: 'Back to lobby', sens: 'Sensitivity (CS2)', fov: 'Field of view', vol: 'Volume',
    killedBy: 'Killed by', died: 'You died', respawnIn: 'Respawning in {s}s', player: 'Player',
    joined: '{n} joined the game', left: '{n} left the game', switched: 'Team: {t}', protect: 'SPAWN PROTECTION',
    peers: 'connected', alone: 'Just you and the bots for now. Send the link to a friend and have them pick the same map.', chatPh: 'Type a message, Enter to send',
    lockFail: 'Could not lock the mouse, click again.', back: 'Portfolio',
    settings: 'Settings', crosshair: 'Crosshair', close: 'Close', tabGame: 'Game', tabXhair: 'Crosshair', tabGfx: 'Graphics',
    preset: 'Preset', pLow: 'Low', pMed: 'Medium', pHigh: 'High', pUltra: 'Ultra',
    fpsCap: 'FPS cap', scale: 'Resolution', autoRes: 'Auto resolution', shadows: 'Shadows',
    sOff: 'Off', sLow: 'Low', sHigh: 'High', sUltra: 'Ultra', bloom: 'Bloom', aa: 'Anti-aliasing', fpsShow: 'Show FPS', aaNote: 'Anti-aliasing changes apply after a reload.',
    xColor: 'Colour', xSize: 'Length', xGap: 'Gap', xThick: 'Thickness', xAlpha: 'Opacity', xDot: 'Centre dot', xOutline: 'Outline', xDynamic: 'Dynamic', xT: 'T-style', xReset: 'Default',
    refresh: 'Display: {hz} Hz', buy: 'BUY MENU', buyClosed: 'Buy time is over (go back to spawn)', noMoney: 'Not enough money', bought: 'Bought {n}',
    gPistol: 'Pistols', gSmg: 'SMGs', gRifle: 'Rifles', gSniper: 'Snipers', gHeavy: 'Heavy', gGear: 'Gear',
    autoBuy: 'Re-buy the same loadout on respawn', statDmg: 'Damage', statRate: 'Fire rate', statMob: 'Mobility', buyHint: 'B to close',
    rounds: 'Rounds', dm: 'DM', nextRound: 'You will spawn next round', tWin: 'TERRORISTS WIN', ctWin: 'COUNTER-TERRORISTS WIN',
    matchOver: 'MATCH OVER', roundN: 'ROUND {n}', winMoney: '+${m} round reward', fullscreen: 'Fullscreen (Ctrl to crouch)',
    ctrlHint: 'Crouching with Ctrl needs fullscreen (Settings). Use C for now.', freeze: 'Get ready…',
    lobbies: 'LOBBIES', lobbiesOpen: '{n} open lobbies', createLobby: '+ Create a new lobby', join: 'JOIN', full: 'FULL', yours: 'YOURS',
    noLobbies: 'No open lobbies right now. Create one or hit PLAY, and your friend will see you under LOBBIES.',
    hostBy: 'host: {n}', bots_n: '+{n} bots', invite: 'Copy invite link', copied: 'Invite link copied, send it to your friend.',
    inviteFor: 'You were invited', joinInvite: 'JOIN LOBBY', relays: '{n} relays', noRelay: 'Cannot reach the signalling relays: your network (school/work, VPN) may block them.',
    p2pFail: 'Could not connect directly to a player (network/NAT). Try another network (e.g. a phone hotspot).', lobbyCode: 'Lobby', modeRounds: '{n} rounds'
  }
};
let lang = store.get('lang');
if (lang !== 'tr' && lang !== 'en') lang = (navigator.language || '').toLowerCase().startsWith('tr') ? 'tr' : 'en';
const t = k => (STR[lang][k] ?? STR.en[k] ?? k);
function applyLang() {
  root.lang = lang;
  $$('[data-k]').forEach(el => { el.textContent = t(el.dataset.k); });
  $$('[data-k-ph]').forEach(el => { el.placeholder = t(el.dataset.kPh); });
  $$('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  renderServers();
  if (G.invite) $('#play').querySelector('span').textContent = t('joinInvite');
}

// ---------------------------------------------------------------- settings
const XHAIR_DEFAULTS = { color: '#4dff6a', size: 6, gap: 2, thick: 2, alpha: 1, dot: false, outline: true, dynamic: false, tstyle: false };
const saved = (() => { try { return JSON.parse(store.get('yek-strike') || '{}'); } catch (e) { return {}; } })();
const settings = Object.assign({ name: '', sens: 2, fov: 74, vol: 0.6, team: 'auto', bots: true, map: 'awp_lego', autoBuy: true, rounds: 10, fullscreen: true }, saved);
if (saved.v !== 3) { settings.sens = 2; settings.v = 3; settings.gfx = {}; }
settings.gfx = { ...GFX_DEFAULTS, ...(settings.gfx || {}) };
settings.xhair = { ...XHAIR_DEFAULTS, ...(saved.xhair || {}) };
const saveSettings = () => store.set('yek-strike', JSON.stringify(settings));

// ---------------------------------------------------------------- renderer
const canvas = $('#game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !!settings.gfx.aa, stencil: false, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.autoClear = false;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 3000);
camera.rotation.order = 'YXZ';
const sfx = new Sfx(); sfx.setVolume(settings.vol);
const hud = new Hud(t);
const fx = new Effects(scene);
const gfx = new Gfx(renderer, scene, camera);
gfx.apply(settings.gfx);
// one shared light for muzzle flashes in the world (a fixed light count avoids shader recompiles)
const muzzleLight = new THREE.PointLight('#ffb35a', 0, 8, 2);
scene.add(muzzleLight);
let muzzleT = 0;
let vm = null;

const worlds = {};
let world = null, mapDef = null;
function setVM(next) { vm = next; if (vm) { vm.setEnv(world && world.envMap); vm.resize(innerWidth / innerHeight); } gfx.setViewModel(vm); }
function setWorld(id) {
  if (world) scene.remove(world.group);
  world = worlds[id] ||= buildWorld(MAPS[id], renderer);
  mapDef = MAPS[id];
  scene.add(world.group);
  scene.fog = world.fog;
  scene.environment = world.envMap;
  fx.setEnv(world.envMap);
  setGunEnv(world.envMap);
  if (vm) vm.setEnv(world.envMap);
  gfx.setWorld(world);
}
function resize() {
  gfx.resize();
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  if (vm) vm.resize(innerWidth / innerHeight);
  hud.placeCrosshair();
}
addEventListener('resize', resize);

// ---------------------------------------------------------------- game state
const G = {
  mode: 'lobby', net: null, ents: new Map(), me: null, since: 0, joinedAt: 0,
  peerInfo: new Map(), host: false, botSeq: 0,
  infoDirty: true, lastInfo: 0, lastState: 0, lastHost: 0, lastSpot: 0, lastRadar: 0,
  locked: false, mouseDown: false, triggerUsed: false, typing: false, board: false, buyOpen: false,
  aimEnt: null, mdx: 0, mdy: 0, killer: null, killerW: '', deathCam: 0, landed: false, streak: 0, streakAt: 0,
  eyeOff: 0, money: 4000, pref: {}, kbLock: false, ctrlHinted: false, room: '', announceTick: 0, invite: '', p2pWarned: false,
  // rounds: decided by the room host and mirrored by everyone
  R: { on: false, max: 0, n: 0, phase: '', endsAt: 0, startedAt: 0, wins: { T: 0, CT: 0 }, streak: { T: 0, CT: 0 }, sentAt: 0 }
};
const FREEZE = 4000, ROUND_TIME = 115000, END_TIME = 4500, OVER_TIME = 7000;
const frozen = () => G.R.on && (G.R.phase === 'freeze' || G.R.phase === 'over');
const START_MONEY = 4000, MAX_MONEY = 16000, BUY_TIME = 20000;
const keys = new Set();
const now = () => performance.now();
const owned = x => x.owner === selfId;
const posOf = x => (owned(x) ? x.body.p : x.disp.p);
const heightOf = x => (owned(x) ? x.body.h : (x.disp.crouch ? BODY.hc : BODY.h));
const eyeH = h => (h < BODY.h - 0.01 ? BODY.eyeC : BODY.eye);
const isProt = x => (owned(x) ? now() < x.protUntil : !!x.disp.prot);
const eyeOf = x => { const p = posOf(x); return [p[0], p[1] + eyeH(heightOf(x)), p[2]]; };
const dirOf = (yaw, pitch) => [-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
const r2 = v => Math.round(v * 100) / 100;
const r3 = v => Math.round(v * 1000) / 1000;
const TEAM_NAME = { T: 'TERRORIST', CT: 'COUNTER-TERRORIST' };
const allowed = (id, team) => WEAPONS[id] && (WEAPONS[id].team === 'both' || WEAPONS[id].team === team);

// inventory: slot 1 primary (may be empty), 2 pistol, 3 knife
function freshWS(e) {
  const ws = { inv: { 1: mapDef.loadout[e.team], 2: teamPistol(e.team), 3: 'knife' }, ammo: {}, next: 0, reloadUntil: 0, reloadW: null, idx: 0, punch: [0, 0], punchT: [0, 0], heat: 0, lastShot: 0, rescopeAt: 0, rescopeLevel: 0, prev: 2 };
  for (const s of [1, 2, 3]) giveAmmo(ws, ws.inv[s]);
  return ws;
}
function giveAmmo(ws, id) { if (id) ws.ammo[id] = { mag: WEAPONS[id].mag, res: WEAPONS[id].reserve }; }

function makeEnt(id, owner, name, team, bot) {
  const e = {
    id, owner, name, team, bot, k: 0, d: 0, hp: 100, armor: 0, helmet: false, alive: false, yaw: 0, pitch: 0, w: 'knife', scope: 0,
    body: { p: [0, 0, 0], v: [0, 0, 0], h: BODY.h, onGround: false },
    wish: [0, 0], walk: false, crouchKey: false, jumpKey: false,
    snaps: [], disp: { p: [0, -50, 0], yaw: 0, pitch: 0, crouch: false, alive: false, speed: 0, w: 'knife', scope: 0, prot: false, onGround: true },
    protUntil: 0, respawnAt: 0, spawnAt: 0, lastShot: 0, stepT: 0, hurtBy: null, hurtAt: 0, avatar: null, spotted: 0
  };
  if (owner === selfId) e.ws = freshWS(e);
  if (id !== selfId) { e.avatar = new Avatar(team, name); scene.add(e.avatar.root); }
  G.ents.set(id, e);
  return e;
}
function removeEnt(e) {
  if (e.avatar) e.avatar.dispose(scene);
  G.ents.delete(e.id);
  if (!e.bot && e.id !== selfId) hud.chat('', '', t('left').replace('{n}', e.name), true);
}
function setTeam(e, team) {
  if (e.team === team) return;
  e.team = team;
  if (e.avatar) { e.avatar.dispose(scene); e.avatar = new Avatar(team, e.name); scene.add(e.avatar.root); }
}

function spawn(e, keep = false) {
  const kept = keep && e.alive && e.ws ? { inv: { ...e.ws.inv }, armor: e.armor, helmet: e.helmet } : null;
  const list = world.spawns[e.team];
  let best = list[0], bs = -Infinity;
  for (const s of list) {
    let near = 80;
    for (const o of G.ents.values()) {
      if (o === e || !o.alive) continue;
      const p = posOf(o), d = Math.hypot(p[0] - s.p[0], p[2] - s.p[2]);
      if (o.team !== e.team) near = Math.min(near, d);
      if (d < 0.9) near -= 100;
    }
    const score = near + Math.random() * 6;
    if (score > bs) { bs = score; best = s; }
  }
  Object.assign(e.body, { p: best.p.slice(), v: [0, 0, 0], h: BODY.h, onGround: true });
  e.yaw = best.yaw; e.pitch = 0; e.hp = 100; e.alive = true; e.scope = 0; e.armor = 0; e.helmet = false;
  e.protUntil = now() + 1800; e.respawnAt = 0; e.spawnAt = now();
  e.ws = freshWS(e);
  if (kept) {
    e.ws.inv = kept.inv; e.armor = kept.armor; e.helmet = kept.helmet;
    for (const s of [1, 2, 3]) giveAmmo(e.ws, e.ws.inv[s]);
  } else if (e.bot) botLoadout(e);
  if (e.brain) e.brain.reset();
  if (e === G.me && settings.autoBuy && !kept) rebuy();
  e.w = e.ws.inv[1] || e.ws.inv[2];
  if (e === G.me) { vm.setWeapon(e.w); hud.death(false); G.killer = null; G.deathCam = 0; G.eyeOff = 0; }
}
function botLoadout(e) {
  e.armor = 100; e.helmet = true;
  if (mapDef.lego) return;
  const pool = BUY_GROUPS.find(g => g.key === 'rifle').ids.filter(id => allowed(id, e.team));
  const pick = Math.random() < 0.7 ? mapDef.loadout[e.team] : pool[(Math.random() * pool.length) | 0];
  e.ws.inv[1] = pick; giveAmmo(e.ws, pick);
}

// ---------------------------------------------------------------- economy
function canBuy() {
  const me = G.me;
  if (!me || !me.alive) return false;
  if (G.R.on) {
    const early = G.R.phase === 'freeze' || (G.R.phase === 'live' && now() - G.R.startedAt < BUY_TIME);
    return early && world.spawns[me.team].some(s => Math.hypot(s.p[0] - me.body.p[0], s.p[2] - me.body.p[2]) < 12);
  }
  if (now() - me.spawnAt < BUY_TIME) return true;
  return world.spawns[me.team].some(s => Math.hypot(s.p[0] - me.body.p[0], s.p[2] - me.body.p[2]) < 8);
}
function buy(id, quiet = false) {
  const me = G.me;
  if (!me || !me.alive) return false;
  if (!canBuy()) { if (!quiet) hud.center(t('buyClosed')); return false; }
  if (id === 'kevlar' || id === 'helmet') {
    let price = ARMOR[id].price;
    if (id === 'helmet' && me.armor >= 100) price = 350;
    if ((id === 'kevlar' && me.armor >= 100) || (id === 'helmet' && me.helmet && me.armor >= 100)) return false;
    if (G.money < price) { if (!quiet) hud.center(t('noMoney')); return false; }
    G.money -= price; me.armor = 100; if (id === 'helmet') me.helmet = true;
    G.pref.armor = id;
  } else {
    const W = WEAPONS[id];
    if (!W || !allowed(id, me.team)) return false;
    if (G.money < W.price) { if (!quiet) hud.center(t('noMoney')); return false; }
    G.money -= W.price;
    me.ws.inv[W.slot] = id;
    giveAmmo(me.ws, id);
    G.pref[W.slot] = id;
    if (!quiet) switchWeapon(me, id, true);
  }
  if (!quiet) { sfx.ui(); hud.center(t('bought').replace('{n}', id === 'kevlar' || id === 'helmet' ? ARMOR[id].name : WEAPONS[id].name), 900); }
  renderBuy();
  return true;
}
function rebuy() {
  for (const k of ['armor', 1, 2]) {
    const id = G.pref[k];
    if (!id || (k !== 'armor' && G.me.ws.inv[k] === id)) continue;
    buy(id, true);
  }
}

// ---------------------------------------------------------------- shooting
function aimOf(e) {
  const p = e.ws.punch;
  return dirOf(e.yaw - p[1], e.pitch + p[0]);
}
function jitter(d, spread) {
  if (spread <= 0) return d;
  const r = spread * Math.sqrt(Math.random()) * (0.6 + Math.random() * 0.4), a = Math.random() * Math.PI * 2;
  const up = Math.abs(d[1]) > 0.99 ? [1, 0, 0] : [0, 1, 0];
  const rx = [d[1] * up[2] - d[2] * up[1], d[2] * up[0] - d[0] * up[2], d[0] * up[1] - d[1] * up[0]];
  const rl = Math.hypot(...rx); rx[0] /= rl; rx[1] /= rl; rx[2] /= rl;
  const ux = [rx[1] * d[2] - rx[2] * d[1], rx[2] * d[0] - rx[0] * d[2], rx[0] * d[1] - rx[1] * d[0]];
  const o = [d[0] + (rx[0] * Math.cos(a) + ux[0] * Math.sin(a)) * r, d[1] + (rx[1] * Math.cos(a) + ux[1] * Math.sin(a)) * r, d[2] + (rx[2] * Math.cos(a) + ux[2] * Math.sin(a)) * r];
  const l = Math.hypot(...o);
  return [o[0] / l, o[1] / l, o[2] / l];
}
function hitscan(shooter, o, d, maxT) {
  const wall = rayWorld(world.boxes, o, d, maxT);
  let best = null;
  for (const x of G.ents.values()) {
    if (x === shooter || !x.alive || x.team === shooter.team || isProt(x)) continue;
    const r = rayBodyZones(o, d, posOf(x), heightOf(x), best ? best.t : wall.t);
    if (r) best = { ent: x, t: r.t, zone: r.zone };
  }
  const tt = best ? best.t : wall.t;
  const end = [o[0] + d[0] * tt, o[1] + d[1] * tt, o[2] + d[2] * tt];
  const n = !best && wall.box ? rayFace(wall.box, o, d, wall.t).n : null;
  return { ent: best && best.ent, zone: best && best.zone, end, n, t: tt, wall: !best && !!wall.box };
}
function maxSpeedOf(e) {
  const W = WEAPONS[e.w];
  return W.zooms && e.scope ? W.scopedSpeed : W.speed;
}
// CS-style inaccuracy: accurate below a third of max speed, worse running, worst in the air
function spreadOf(e) {
  const W = WEAPONS[e.w], b = e.body;
  let s = W.zooms && e.scope ? W.scopedSpread : W.spread;
  const max = maxSpeedOf(e), sp = Math.hypot(b.v[0], b.v[2]);
  if (b.onGround) s += W.moveSpread * Math.max(0, Math.min(1, (sp - max * 0.34) / (max * 0.66)));
  else s += W.airSpread;
  s += e.ws.heat;
  if (b.h < BODY.h && b.onGround) s *= W.crouchMul;
  return s;
}
const _mv = new THREE.Vector3();
function muzzleOf(e) {
  if (e.avatar && e !== G.me) { const m = e.avatar.muzzleWorld(_mv); if (m) return [m.x, m.y, m.z]; }
  const yaw = owned(e) ? e.yaw : e.disp.yaw, pitch = owned(e) ? e.pitch : e.disp.pitch;
  const eye = eyeOf(e), f = dirOf(yaw, pitch);
  const rx = Math.cos(yaw), rz = -Math.sin(yaw);
  return [eye[0] + f[0] * 0.6 + rx * 0.14, eye[1] + f[1] * 0.6 - 0.12, eye[2] + f[2] * 0.6 + rz * 0.14];
}
// damage drops with distance, per 500 units like CS
const falloff = (W, dist) => Math.pow(W.range, dist / 12.7);

function fire(e, alt = false) {
  const tnow = now(), ws = e.ws, W = WEAPONS[e.w];
  if (!e.alive || tnow < ws.next || ws.reloadUntil || frozen()) return false;
  e.protUntil = 0;
  e.lastShot = ws.lastShot = tnow;
  const eye = eyeOf(e);
  if (W.melee) {
    ws.next = tnow + (alt ? W.altRate : W.rate) * 1000;
    const d = dirOf(e.yaw, e.pitch);
    const hit = hitscan(e, eye, d, W.melee);
    if (hit.ent) {
      let dmg = alt ? W.altDmg : W.dmg;
      const facing = dirOf(owned(hit.ent) ? hit.ent.yaw : hit.ent.disp.yaw, 0);
      if (facing[0] * d[0] + facing[2] * d[2] > 0.5) dmg *= alt ? 3 : 1.6; // backstab
      damage(hit.ent, e, dmg, 'body', 'knife');
      sfx.slash(e === G.me ? null : eye);
      fx.blood(hit.end);
    } else if (hit.wall) sfx.slash(e === G.me ? null : eye);
    else sfx.whoosh(e === G.me ? null : eye);
    if (e === G.me) vm.fire(true);
    G.net && G.net.send('fx', { i: e.id, w: e.w, o: eye.map(r2), e: hit.end.map(r2), k: 0 });
    return true;
  }
  const a = ws.ammo[e.w];
  if (!a || a.mag <= 0) {
    if (e === G.me) sfx.click();
    ws.next = tnow + 250;
    reload(e);
    return false;
  }
  a.mag--;
  ws.next = tnow + W.rate * 1000;
  const aim = aimOf(e);
  const spread = spreadOf(e) * (e.bot ? 1.25 : 1);
  if (W.auto) { ws.punchT = W.pattern[Math.min(Math.floor(ws.idx), W.pattern.length - 1)].slice(); ws.idx += 1; }
  else { ws.punch[0] += W.pattern[0][0]; ws.punch[1] += (Math.random() - 0.5) * W.pattern[0][0] * 0.35; }
  ws.heat += W.heat;
  // shotguns fire pellets: total the damage per victim, one hit message each
  const hits = new Map();
  let first = null;
  for (let i = 0; i < W.pellets; i++) {
    const s = W.pellets > 1 ? W.spread * (0.35 + Math.random() * 0.65) + (spread - W.spread) : spread;
    const hit = hitscan(e, eye, jitter(aim, s), W.maxRange);
    if (!first) first = hit;
    if (hit.ent) {
      const mul = hit.zone === 'head' ? W.hsMul : hit.zone === 'legs' ? W.legMul : 1;
      const h = hits.get(hit.ent) || { dmg: 0, zone: hit.zone };
      h.dmg += W.dmg * mul * falloff(W, hit.t);
      if (hit.zone === 'head') h.zone = 'head';
      hits.set(hit.ent, h);
    }
    if (i < 4) shotFx(e === G.me ? null : eye, e.w, muzzleOf(e), hit.end, hit.ent ? 2 : hit.wall ? 1 : 0, hit.n, i > 0);
  }
  for (const [ent, h] of hits) damage(ent, e, h.dmg, h.zone, e.w);
  G.net && G.net.send('fx', { i: e.id, w: e.w, o: eye.map(r2), e: first.end.map(r2), k: first.ent ? 2 : first.wall ? 1 : 0, n: first.n });
  if (e === G.me) {
    vm.fire(false);
    if (W.zooms && e.scope && W.cat === 'sniper' && W.bolt) { ws.rescopeLevel = e.scope; e.scope = 0; ws.rescopeAt = tnow + W.rate * 1000 - 120; }
  }
  if (a.mag === 0 && a.res > 0) setTimeout(() => reload(e), 250);
  return true;
}
function shotFx(soundPos, w, from, end, kind, n, silent) {
  if (!silent) sfx.shot(WEAPONS[w].sound, soundPos);
  fx.tracer(from, end);
  if (kind === 1 && n) {
    fx.hole(end, n);
    const b = world.boxAt(end);
    const mat = b.mat === 'lego' ? 'plastic' : b.mat === 'crate' || b.mat === 'mcrate' ? 'wood' : 'concrete';
    fx.impact(end, n, mat, b.color, world.ground(end[0] + n[0] * 0.3, end[2] + n[2] * 0.3));
  }
  if (kind === 2) fx.blood(end);
  if (!silent && w !== 'm4a1s' && w !== 'usps') { muzzleLight.position.set(from[0], from[1], from[2]); muzzleLight.intensity = 6; muzzleT = 0.05; }
}
function reload(e) {
  const ws = e.ws, W = WEAPONS[e.w], a = ws.ammo[e.w];
  if (!e.alive || W.melee || !a || ws.reloadUntil || a.mag >= W.mag || a.res <= 0) return;
  ws.reloadUntil = now() + W.reload * 1000;
  ws.reloadW = e.w;
  if (e.scope) e.scope = 0;
  ws.rescopeAt = 0;
  if (e === G.me) sfx.reload(W.cat);
}
function switchWeapon(e, id, force = false) {
  if (!e.alive || !id || (!force && e.w === id) || !e.ws.ammo[id]) return;
  if (e.w !== id && WEAPONS[e.w]) e.ws.prev = WEAPONS[e.w].slot;
  e.w = id; e.scope = 0;
  e.ws.reloadUntil = 0; e.ws.rescopeAt = 0;
  e.ws.next = Math.max(e.ws.next, now() + (id === 'knife' ? 300 : 550));
  e.ws.punch = [0, 0]; e.ws.punchT = [0, 0]; e.ws.idx = 0;
  if (e === G.me) { vm.setWeapon(id); hud.scope(0); }
}
function weaponTick(e, dt, tnow) {
  const ws = e.ws, W = WEAPONS[e.w];
  if (ws.reloadUntil && tnow >= ws.reloadUntil) {
    const a = ws.ammo[ws.reloadW];
    const take = Math.min(WEAPONS[ws.reloadW].mag - a.mag, a.res);
    a.mag += take; a.res -= take;
    ws.reloadUntil = 0;
  }
  if (tnow - ws.lastShot > W.rate * 1000 * 1.6 + 60) {
    const k = Math.exp(-dt * 9);
    ws.punchT[0] *= k; ws.punchT[1] *= k;
    ws.idx = Math.max(0, ws.idx - dt * 16);
  }
  const k = 1 - Math.exp(-dt * (W.auto ? 22 : 6));
  ws.punch[0] += (ws.punchT[0] - ws.punch[0]) * k;
  ws.punch[1] += (ws.punchT[1] - ws.punch[1]) * k;
  ws.heat *= Math.exp(-dt * 4);
  if (ws.rescopeAt && tnow >= ws.rescopeAt) {
    if (W.zooms && e.alive && (e !== G.me || G.locked)) { e.scope = ws.rescopeLevel; if (e === G.me) sfx.scope(); }
    ws.rescopeAt = 0;
  }
}

// ---------------------------------------------------------------- damage & kills
function damage(victim, attacker, dmg, zone, w) {
  if (owned(victim)) applyDamage(victim, attacker.id, dmg, zone, w);
  else G.net.send('hit', { v: victim.id, a: attacker.id, d: Math.round(dmg), z: zone, w }, victim.owner);
  if (victim.avatar) victim.avatar.hit();
  if (attacker === G.me) {
    hud.hitmark(zone === 'head', dmg >= victim.hp + (victim.armor ? 30 : 0));
    if (zone === 'head' && w !== 'knife') sfx.headshot(); else sfx.hitmark();
  }
}
function applyDamage(v, aid, dmg, zone, w) {
  if (!v.alive || now() < v.protUntil) return;
  dmg = Math.max(0, Math.min(500, +dmg || 0));
  // kevlar covers the body, the helmet covers the head; legs are never covered
  const W = WEAPONS[w];
  if (W && v.armor > 0 && zone !== 'legs' && (zone !== 'head' || v.helmet) && w !== 'knife') {
    const toHealth = dmg * W.pen;
    const loss = (dmg - toHealth) * 0.5;
    if (loss > v.armor) { dmg -= v.armor * 2; v.armor = 0; }
    else { v.armor -= loss; dmg = toHealth; }
  }
  v.hp -= dmg;
  v.hurtBy = aid; v.hurtAt = now();
  v.body.v[0] *= 0.45; v.body.v[2] *= 0.45; // tagging
  const a = G.ents.get(aid);
  if (v === G.me) {
    sfx.hurt();
    if (a) {
      const ap = posOf(a), p = v.body.p;
      const rel = v.yaw - Math.atan2(-(ap[0] - p[0]), -(ap[2] - p[2]));
      hud.damageFrom(Math.atan2(Math.sin(rel), Math.cos(rel)));
    }
  }
  if (v.hp <= 0) {
    v.hp = 0; v.alive = false; v.d++; v.respawnAt = G.R.on ? 0 : now() + 3200; v.scope = 0;
    const m = { v: v.id, a: aid, w, hs: zone === 'head' ? 1 : 0 };
    G.net && G.net.send('kill', m);
    onKill(m);
    G.infoDirty = true;
  }
}
function onKill(m) {
  const v = G.ents.get(m.v), a = G.ents.get(m.a);
  if (a && owned(a) && a !== v) { a.k++; G.infoDirty = true; }
  if (a === G.me && v && v !== G.me && WEAPONS[m.w]) G.money = Math.min(MAX_MONEY, G.money + WEAPONS[m.w].reward);
  if (v && !owned(v)) { v.alive = false; v.disp.alive = false; }
  const W = WEAPONS[m.w];
  hud.feed({ a: a && a !== v ? a.name : '', at: a && a.team, v: v ? v.name : '?', vt: v && v.team, w: W ? W.name : String(m.w || ''), hs: !!m.hs, mine: a === G.me || v === G.me });
  if (v && v !== G.me) sfx.death(posOf(v).slice());
  if (v) {
    const vp = posOf(v);
    if (v.avatar && a && a !== v) { const ap = posOf(a); v.avatar.killedFrom(Math.atan2(-(ap[0] - vp[0]), -(ap[2] - vp[2]))); }
    fx.splat(vp, world.ground(vp[0], vp[2]));
  }
  if (v === G.me) { G.killer = a && a !== v ? a : null; G.killerW = W ? W.name : ''; hud.scope(0); G.streak = 0; closeBuy(false); }
  if (a === G.me && v && v !== G.me) {
    const tn = now();
    G.streak = tn - G.streakAt < 4500 ? G.streak + 1 : 1;
    G.streakAt = tn;
    hud.killBanner(v.name, !!m.hs, G.streak);
  }
}

// ---------------------------------------------------------------- network handlers
const handlers = {
  join(id) { sendInfo(id); if (G.host && G.R.on) sendRound(id); },
  round(d, peer) {
    // only the room host runs the clock
    if (!G.R.on || G.host || !d || typeof d.n !== 'number') return;
    const p = G.peerInfo.get(peer);
    if (!p) return;
    applyRound(d);
  },
  leave(id) {
    for (const x of [...G.ents.values()]) if (x.owner === id) removeEnt(x);
    G.peerInfo.delete(id);
  },
  info(d, peer) {
    if (!d || !Array.isArray(d.e)) return;
    G.peerInfo.set(peer, { since: +d.s || Date.now(), t: now() });
    const seen = new Set();
    for (const row of d.e.slice(0, 16)) {
      const [id, name, team, k, dd, bot] = row;
      if (typeof id !== 'string' || (id !== peer && !id.startsWith(peer + '-b'))) continue;
      seen.add(id);
      const tm = team === 'CT' ? 'CT' : 'T';
      let x = G.ents.get(id);
      if (!x) {
        x = makeEnt(id, peer, clean(name), tm, !!bot);
        if (!bot) hud.chat('', '', t('joined').replace('{n}', x.name), true);
      } else {
        setTeam(x, tm);
        if (x.name !== clean(name)) { x.name = clean(name); x.avatar && x.avatar.setName(x.name); }
      }
      x.k = k | 0; x.d = dd | 0;
    }
    for (const x of [...G.ents.values()]) if (x.owner === peer && !seen.has(x.id)) removeEnt(x);
  },
  state(arr, peer) {
    if (!Array.isArray(arr)) return;
    const tn = now();
    for (const s of arr) {
      const x = G.ents.get(s[0]);
      if (!x || x.owner !== peer) continue;
      const alive = !!(s[6] & 1);
      const last = x.snaps[x.snaps.length - 1];
      if (alive && (!last || !last.alive)) x.snaps.length = 0; // respawned: don't slide across the map
      x.snaps.push({ t: tn, p: [s[1], s[2], s[3]], yaw: s[4], pitch: s[5], alive, crouch: !!(s[6] & 2), scope: !!(s[6] & 4), prot: !!(s[6] & 8), onGround: !!(s[6] & 16), w: WEAPON_IDS[s[7]] || 'knife', hp: s[8], armor: s[9] | 0 });
      if (x.snaps.length > 30) x.snaps.shift();
    }
  },
  fx(d, peer) {
    const x = G.ents.get(d.i);
    if (!x || x.owner !== peer) return;
    x.lastShot = now();
    if (d.w === 'knife') { sfx.whoosh(d.o); return; }
    if (!WEAPONS[d.w]) return;
    shotFx(d.o, d.w, x.alive ? muzzleOf(x) : d.o, d.e, d.k, d.n);
  },
  hit(d) {
    const v = G.ents.get(d.v);
    if (v && owned(v)) applyDamage(v, d.a, d.d, d.z, d.w);
  },
  kill(d, peer) {
    const v = G.ents.get(d.v);
    if (!v || v.owner !== peer) return;
    onKill(d);
  },
  chat(d, peer) {
    const x = G.ents.get(peer);
    if (!x || typeof d.t !== 'string') return;
    hud.chat(x.name, x.team, d.t.slice(0, 120));
  },
  error(d) {
    console.warn('[net] join error', d);
    if (!G.p2pWarned) { G.p2pWarned = true; hud.chat('', '', t('p2pFail'), true); }
  }
};
function sendInfo(target) {
  if (!G.net) return;
  const e = [];
  for (const x of G.ents.values()) if (owned(x)) e.push([x.id, x.name, x.team, x.k, x.d, x.bot ? 1 : 0]);
  G.net.send('info', { s: G.since, b: settings.bots ? 1 : 0, e }, target);
}
function sendState() {
  const arr = [];
  for (const x of G.ents.values()) {
    if (!owned(x)) continue;
    const p = x.body.p;
    const f = (x.alive ? 1 : 0) | (x.body.h < BODY.h ? 2 : 0) | (x.scope ? 4 : 0) | (now() < x.protUntil ? 8 : 0) | (x.body.onGround ? 16 : 0);
    arr.push([x.id, r2(p[0]), r2(p[1]), r2(p[2]), r3(x.yaw), r3(x.pitch), f, WEAPON_IDS.indexOf(x.w), Math.ceil(x.hp), Math.ceil(x.armor)]);
  }
  G.net.send('state', arr);
}

// ---------------------------------------------------------------- host & bots
const botApi = {
  get nav() { return world.nav; },
  eye: eyeOf, posOf, heightOf,
  ent: id => G.ents.get(id),
  enemiesOf: e => { const out = []; for (const o of G.ents.values()) if (o.alive && o.team !== e.team && !isProt(o)) out.push(o); return out; },
  canSee(eye, o) {
    const p = posOf(o), h = heightOf(o);
    for (const y of [h - 0.15, h * 0.6]) {
      const d = [p[0] - eye[0], p[1] + y - eye[1], p[2] - eye[2]];
      const len = Math.hypot(...d);
      d[0] /= len; d[1] /= len; d[2] /= len;
      if (rayWorld(world.boxes, eye, d, len).t >= len - 0.05) return true;
    }
    return false;
  },
  fire: e => fire(e, false),
  reload
};
function hostCheck() {
  const peers = new Set(G.net.peers());
  const cands = [[G.since, selfId]];
  for (const [pid, inf] of G.peerInfo) if (peers.has(pid)) cands.push([inf.since, pid]);
  cands.sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : 1));
  G.host = cands[0][1] === selfId;
  const mine = [...G.ents.values()].filter(x => x.bot && owned(x));
  if (!G.host || !settings.bots) { if (mine.length) { mine.forEach(removeEnt); G.infoDirty = true; } return; }
  if (now() - G.joinedAt < 2500) return;
  const humans = { T: 0, CT: 0 }, have = { T: [], CT: [] };
  for (const x of G.ents.values()) { if (!x.bot) humans[x.team]++; else if (owned(x)) have[x.team].push(x); }
  const total = humans.T + humans.CT;
  const N = total >= 6 ? Math.max(humans.T, humans.CT) : Math.max(3, humans.T, humans.CT);
  for (const tm of ['T', 'CT']) {
    const want = Math.max(0, N - humans[tm]);
    while (have[tm].length < want) { have[tm].push(addBot(tm)); G.infoDirty = true; }
    while (have[tm].length > want) {
      have[tm].sort((a, b) => (a.alive ? 1 : 0) - (b.alive ? 1 : 0));
      removeEnt(have[tm].shift()); G.infoDirty = true;
    }
  }
}
function addBot(team) {
  const used = new Set([...G.ents.values()].map(x => x.name));
  const name = 'BOT ' + (BOT_NAMES.find(n => !used.has('BOT ' + n)) || ('#' + (G.botSeq + 1)));
  const e = makeEnt(`${selfId}-b${++G.botSeq}`, selfId, name, team, true);
  e.brain = new BotBrain(e, botApi);
  e.respawnAt = now() + 400 + Math.random() * 800;
  return e;
}

// ---------------------------------------------------------------- simulation
const _inp = { wish: [0, 0], speed: 0, jump: false, crouch: false };
function simulate(e, dt) {
  const b = e.body;
  const alive = e.alive;
  let speed = alive ? maxSpeedOf(e) : 0;
  if (e.walk) speed *= 0.52;
  if (b.h < BODY.h && b.onGround) speed *= 0.34;
  const ice = frozen();
  _inp.wish = alive && !ice ? e.wish : [0, 0];
  _inp.speed = speed;
  _inp.jump = alive && !ice && e.jumpKey;
  _inp.crouch = alive && e.crouchKey;
  const vy = b.v[1], wasGround = b.onGround, h0 = b.h;
  const stepped = pmove(world.boxes, b, _inp, dt);
  if (e === G.me) {
    // keep the eye still through steps and ground crouches, then ease it into place
    G.eyeOff -= stepped;
    if (b.h !== h0) G.eyeOff -= eyeH(b.h) - eyeH(h0) + (b.onGround && wasGround ? 0 : (b.h < h0 ? (BODY.h - BODY.hc) / 2 : -(BODY.h - BODY.hc) / 2));
  }
  if (b.onGround && !wasGround) {
    if (vy < -4) { b.v[0] *= 0.8; b.v[2] *= 0.8; }
    if (e === G.me) { if (vy < -6) sfx.land(null); G.landed = true; }
  }
  if (b.p[1] < -25) applyDamage(e, e.id, 999, 'body', 'knife');
}
function playerInput() {
  const e = G.me;
  const active = G.locked && !G.typing;
  let f = 0, s = 0;
  if (active) {
    if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) s += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) s -= 1;
  }
  let wx = -Math.sin(e.yaw) * f + Math.cos(e.yaw) * s;
  let wz = -Math.cos(e.yaw) * f - Math.sin(e.yaw) * s;
  const l = Math.hypot(wx, wz);
  if (l > 0) { wx /= l; wz /= l; }
  e.wish = [wx, wz];
  e.walk = active && (keys.has('ShiftLeft') || keys.has('ShiftRight'));
  e.crouchKey = active && (keys.has('KeyC') || (G.kbLock && (keys.has('ControlLeft') || keys.has('ControlRight'))));
  e.jumpKey = active && keys.has('Space');
}

function interpolate(x, renderT) {
  const s = x.snaps, D = x.disp;
  if (!s.length) return;
  let a = s[s.length - 1], b = a;
  if (renderT <= s[0].t) a = b = s[0];
  else for (let i = s.length - 2; i >= 0; i--) if (s[i].t <= renderT) { a = s[i]; b = s[i + 1]; break; }
  const k = b.t === a.t ? 1 : Math.max(0, Math.min(1, (renderT - a.t) / (b.t - a.t)));
  const px = D.p[0], pz = D.p[2];
  for (let i = 0; i < 3; i++) D.p[i] = a.p[i] + (b.p[i] - a.p[i]) * k;
  let dy = b.yaw - a.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  D.yaw = a.yaw + dy * k;
  D.pitch = a.pitch + (b.pitch - a.pitch) * k;
  D.alive = b.alive; D.crouch = b.crouch; D.scope = b.scope; D.prot = b.prot; D.onGround = b.onGround; D.w = b.w;
  x.alive = b.alive; x.hp = b.hp; x.w = b.w; x.armor = b.armor;
  D.speedRaw = Math.hypot(D.p[0] - px, D.p[2] - pz);
}

// ---------------------------------------------------------------- rounds
// The room host runs the clock and broadcasts phase changes; everyone applies them.
function sendRound(target) {
  if (!G.net) return;
  const R = G.R;
  G.net.send('round', { n: R.n, ph: R.phase, left: Math.max(0, Math.round(R.endsAt - now())), w: R.wins, max: R.max, win: R.lastWin || '' }, target);
  R.sentAt = now();
}
function setPhase(phase, ms, extra = {}) {
  applyRound({ n: G.R.n, ph: phase, left: ms, w: G.R.wins, max: G.R.max, ...extra });
  sendRound();
}
function roundTick(tn) {
  const R = G.R;
  if (!G.host) return;
  if (!R.phase) {
    // give an existing host a moment to tell us the round state before starting our own
    if (now() - G.joinedAt < 2500) return;
    R.n = 1; setPhase('freeze', FREEZE, { n: 1 }); return;
  }
  if (R.phase === 'live') {
    const alive = { T: 0, CT: 0 }, total = { T: 0, CT: 0 };
    for (const x of G.ents.values()) { total[x.team]++; if (x.alive) alive[x.team]++; }
    let win = '';
    if (total.T && total.CT && (!alive.T || !alive.CT)) win = !alive.T && !alive.CT ? 'CT' : !alive.T ? 'CT' : 'T';
    else if (tn >= R.endsAt) win = alive.T > alive.CT ? 'T' : 'CT';
    if (win) {
      const w = { ...R.wins, [win]: R.wins[win] + 1 };
      setPhase('end', END_TIME, { w, win });
    }
  } else if (tn >= R.endsAt) {
    if (R.phase === 'freeze') setPhase('live', ROUND_TIME);
    else if (R.phase === 'end') {
      const done = R.wins.T > R.max / 2 || R.wins.CT > R.max / 2 || R.n >= R.max;
      if (done) setPhase('over', OVER_TIME);
      else setPhase('freeze', FREEZE, { n: R.n + 1 });
    } else if (R.phase === 'over') setPhase('freeze', FREEZE, { n: 1, w: { T: 0, CT: 0 } });
  }
  if (tn - R.sentAt > 2000) sendRound();
}
function applyRound(d) {
  const R = G.R, me = G.me;
  const prevPhase = R.phase, prevN = R.n;
  R.endsAt = now() + (+d.left || 0);
  R.max = d.max || R.max;
  if (d.w) R.wins = { T: d.w.T | 0, CT: d.w.CT | 0 };
  R.n = d.n;
  R.phase = d.ph;
  if (R.phase === prevPhase && R.n === prevN) return;
  if (R.phase === 'freeze') {
    R.startedAt = R.endsAt;
    if (R.n === 1 && prevN !== 1) {
      // new match: reset money, scores and gear
      G.money = 800; R.streak = { T: 0, CT: 0 };
      for (const x of G.ents.values()) if (owned(x)) { x.k = 0; x.d = 0; x.alive = false; }
      G.infoDirty = true;
    }
    for (const x of G.ents.values()) if (owned(x)) spawn(x, true);
    hud.banner(t('roundN').replace('{n}', R.n), '', 'neutral');
  } else if (R.phase === 'live') {
    R.startedAt = now();
    // joined mid-round: wait for the next one
    if (prevPhase === '' && me && me.alive && prevN !== R.n) { me.alive = false; me.respawnAt = 0; }
  } else if (R.phase === 'end') {
    const win = d.win || 'CT';
    R.lastWin = win;
    if (me) {
      const mine = me.team === win;
      const lose = me.team === 'T' ? 'T' : 'CT';
      let gain;
      if (mine) { gain = 3250; R.streak[me.team] = 0; }
      else { gain = Math.min(3400, 1400 + 500 * R.streak[lose]); R.streak[lose] = Math.min(4, R.streak[lose] + 1); }
      G.money = Math.min(MAX_MONEY, G.money + gain);
      hud.banner(t(win === 'T' ? 'tWin' : 'ctWin'), t('winMoney').replace('{m}', gain), win === 'T' ? 'tw' : 'ctw');
      sfx.ui();
    }
  } else if (R.phase === 'over') {
    const w = R.wins.T > R.wins.CT ? 'T' : 'CT';
    hud.banner(t('matchOver'), (w === 'T' ? 'T ' : 'CT ') + R.wins[w] + ' : ' + R.wins[w === 'T' ? 'CT' : 'T'], w === 'T' ? 'tw' : 'ctw');
  }
}

// compile shaders and bake shared geometry before the first fight, not during it
function warmUp() {
  fx.prewarm();
  const ids = new Set(['knife', 'glock', 'usps', mapDef.loadout.T, mapDef.loadout.CT]);
  for (const id of ids) thirdPersonGun(id, GUN_MAT);
  const temp = ['T', 'CT'].map(tm => { const a = new Avatar(tm, ''); a.setWeapon(mapDef.loadout[tm]); a.root.position.set(0, -40, 0); scene.add(a.root); return a; });
  for (const id of ids) vm.holder(id);
  gfx.warm();
  temp.forEach(a => a.dispose(scene));
}

// ---------------------------------------------------------------- frame
let last = performance.now();
let lobbyT = 0;
// In game with no cap (or a cap above the display rate) frames are driven by a
// MessageChannel instead of requestAnimationFrame, so FPS isn't locked to the monitor's Hz.
const pump = new MessageChannel();
pump.port1.onmessage = () => frame(performance.now());
const unlocked = () => G.mode === 'game' && !document.hidden && (!settings.gfx.cap || settings.gfx.cap > gfx.refresh + 2);
function schedule() {
  if (!unlocked()) { requestAnimationFrame(frame); return; }
  const wait = settings.gfx.cap ? gfx.capNext - performance.now() : 0;
  if (wait > 3) setTimeout(() => frame(performance.now()), wait - 2);
  else pump.port2.postMessage(0);
}
function frame(tms) {
  schedule();
  if (!gfx.shouldRender(tms)) return;
  const dt = Math.min(0.05, Math.max(0.0001, (tms - last) / 1000));
  last = tms;
  if (G.mode === 'game') gameFrame(dt);
  else lobbyFrame(dt);
  gfx.tick(tms);
  if (settings.gfx.fpsShow && G.mode === 'game' && gfx.win.frames === 0) {
    const res = gfx.dyn < 1 ? ' · ' + Math.round(gfx.dyn * settings.gfx.scale * 100) + '%' : '';
    hud.fps(gfx.fps + ' FPS · ' + gfx.ms.toFixed(1) + ' ms' + res);
  }
}

function lobbyFrame(dt) {
  lobbyT += dt * 0.06;
  const [x0, z0, x1, z1] = mapDef.bounds;
  const R = Math.max(x1 - x0, z1 - z0) * (mapDef.indoor ? 0.42 : 0.62);
  camera.fov = mapDef.indoor ? 70 : 50; camera.updateProjectionMatrix();
  camera.position.set(Math.cos(lobbyT) * R, mapDef.indoor ? 5.2 : R * 0.42, Math.sin(lobbyT) * R * (mapDef.indoor ? 0.5 : 0.75));
  camera.lookAt(0, mapDef.indoor ? 1 : 0, 0);
  fx.update(dt);
  gfx.render(false);
}

function gameFrame(dt) {
  const tn = now();
  const me = G.me;
  playerInput();

  for (const x of G.ents.values()) {
    if (!owned(x)) continue;
    if (x.brain) x.brain.update(dt, tn);
    if (!x.alive && x.respawnAt && tn >= x.respawnAt) spawn(x);
    simulate(x, dt);
    weaponTick(x, dt, tn);
  }
  if (me.alive && G.locked && !G.typing && G.mouseDown) {
    const W = WEAPONS[me.w];
    if (W.auto || !G.triggerUsed) { if (fire(me, false) || !W.auto) G.triggerUsed = true; }
  }

  if (G.R.on) roundTick(tn);
  const renderT = tn - 110;
  for (const x of G.ents.values()) if (!owned(x)) interpolate(x, renderT);

  for (const x of G.ents.values()) {
    if (!x.avatar) continue;
    const mine = owned(x);
    const p = posOf(x);
    const speed = mine ? Math.hypot(x.body.v[0], x.body.v[2]) : (x.disp.speedRaw || 0) / Math.max(dt, 1e-3);
    const onGround = mine ? x.body.onGround : x.disp.onGround;
    const alive = mine ? x.alive : x.disp.alive;
    x.avatar.setWeapon(mine ? x.w : x.disp.w);
    x.avatar.update(dt, { p, yaw: mine ? x.yaw : x.disp.yaw, pitch: mine ? x.pitch : x.disp.pitch, crouch: mine ? x.body.h < BODY.h : x.disp.crouch, alive, speed: Math.min(speed, 7), showTag: x.team === me.team || G.aimEnt === x, protected: isProt(x) });
    if (alive && onGround && speed > 3.4) {
      x.stepT -= dt;
      if (x.stepT <= 0) { x.stepT = 0.36; sfx.step(p, 0.4); }
    }
  }
  if (me.alive && me.body.onGround && Math.hypot(me.body.v[0], me.body.v[2]) > 3.4 && !me.walk) {
    me.stepT -= dt;
    if (me.stepT <= 0) { me.stepT = 0.38; sfx.step(null, 0.12); }
  }

  // camera
  const W = WEAPONS[me.w];
  G.eyeOff *= Math.exp(-dt * 14);
  if (Math.abs(G.eyeOff) < 0.002) G.eyeOff = 0;
  const eye = eyeOf(me);
  if (me.alive) {
    camera.position.set(eye[0], eye[1] + G.eyeOff, eye[2]);
    camera.rotation.set(me.pitch + me.ws.punch[0] * W.viewPunch, me.yaw - me.ws.punch[1] * W.viewPunch, 0);
  } else {
    G.deathCam = Math.min(1, G.deathCam + dt * 1.6);
    camera.position.set(eye[0], eye[1] - G.deathCam * 1.1 + 0.2, eye[2]);
    if (G.killer && G.ents.has(G.killer.id)) {
      const kp = posOf(G.killer);
      const dx = kp[0] - eye[0], dz = kp[2] - eye[2], dy = kp[1] + 1.4 - camera.position.y;
      const yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(dy, Math.hypot(dx, dz));
      let d = yaw - camera.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
      camera.rotation.set(camera.rotation.x + (pitch - camera.rotation.x) * Math.min(1, dt * 4), camera.rotation.y + d * Math.min(1, dt * 4), 0);
    }
  }
  const fov = me.alive && me.scope && W.zooms ? W.zooms[me.scope - 1] : settings.fov;
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  sfx.listener(eye, dirOf(me.yaw, me.pitch));

  if (tn - G.lastSpot > 120) {
    G.lastSpot = tn;
    const d = dirOf(me.yaw, me.pitch);
    const wall = rayWorld(world.boxes, eye, d, 200);
    G.aimEnt = null;
    let bt = wall.t;
    for (const x of G.ents.values()) {
      if (x === me || !x.alive) continue;
      const r = rayBodyZones(eye, d, posOf(x), heightOf(x), bt);
      if (r) { bt = r.t; G.aimEnt = x; }
      if (x.team !== me.team && me.alive && botApi.canSee(eye, x)) x.spotted = tn;
    }
  }

  fx.update(dt);

  // HUD
  const ws = me.ws, ammo = ws.ammo[me.w] || { mag: 0, res: 0 };
  const reloadP = ws.reloadUntil ? 1 - (ws.reloadUntil - tn) / (WEAPONS[ws.reloadW].reload * 1000) : -1;
  hud.vitals(me.hp, ammo.mag, ammo.res, W.name, reloadP);
  hud.armor(me.armor, me.helmet);
  const buyable = canBuy();
  hud.money(G.money, buyable);
  const spreadPx = Math.tan(spreadOf(me)) / Math.tan(camera.fov * Math.PI / 360) * (innerHeight / 2);
  hud.crosshair(Math.max(0, spreadPx * 0.6 + (tn - ws.lastShot < 120 ? 4 : 0)), me.alive && !me.scope && !G.buyOpen);
  hud.scope(me.alive ? me.scope : 0);
  hud.protect(me.alive && tn < me.protUntil);
  hud.slots([1, 2, 3].filter(s => ws.inv[s]).map(s => ({ key: s, name: WEAPONS[ws.inv[s]].name, id: ws.inv[s] })), me.w);
  let sT = 0, sCT = 0;
  for (const x of G.ents.values()) { if (x.team === 'T') sT += x.k; else sCT += x.k; }
  if (G.R.on) {
    hud.score(G.R.wins.T, G.R.wins.CT);
    const left = Math.max(0, G.R.endsAt - tn) / 1000;
    const clock = Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0');
    hud.round(G.R.phase === 'freeze' ? t('freeze') + ' ' + Math.ceil(left) : (G.R.phase === 'live' ? clock : '') + '  ·  R' + G.R.n + '/' + G.R.max);
  } else { hud.score(sT, sCT); hud.round(''); }
  if (!me.alive) hud.death(true, G.killer ? G.killer.name : '', G.killerW, G.R.on ? -1 : (me.respawnAt - tn) / 1000);
  if (G.board) hud.board(true, [...G.ents.values()].map(x => ({ name: x.name, team: x.team, k: x.k, d: x.d, bot: x.bot, me: x === me, alive: x.alive })), { T: sT, CT: sCT });
  if (G.buyOpen && !buyable) closeBuy(true);
  if (tn - G.lastRadar > 50) {
    G.lastRadar = tn;
    const blips = [];
    for (const x of G.ents.values()) {
      if (x === me) continue;
      const friend = x.team === me.team;
      if (!x.alive && !friend) continue;
      if (!friend && tn - x.spotted > 1200 && tn - (x.lastShot || 0) > 900) continue;
      blips.push({ p: posOf(x), color: friend ? (me.team === 'CT' ? '#7fb2ff' : '#ffcf6a') : '#ff4a3d', dead: !x.alive });
    }
    hud.radar(me.body.p, me.yaw, blips);
  }

  if (G.net) {
    if (tn - G.lastState > 50) { G.lastState = tn; sendState(); }
    if (G.infoDirty || tn - G.lastInfo > 3000) { G.infoDirty = false; G.lastInfo = tn; sendInfo(); }
    if (tn - G.lastHost > 1000) {
      G.lastHost = tn; hostCheck();
      if (++G.announceTick % 3 === 0) announce();
      const n = G.net.peers().length;
      hud.peers(n + 1, n ? 'on' : 'alone');
    }
  }

  if (vm) vm.update(dt, { speed: Math.hypot(me.body.v[0], me.body.v[2]), onGround: me.body.onGround, crouch: me.body.h < BODY.h, landed: G.landed, mouseDX: G.mdx, mouseDY: G.mdy, reloading: reloadP, scoped: !!me.scope || !me.alive });
  G.mdx = G.mdy = 0; G.landed = false;
  muzzleT -= dt;
  if (muzzleT <= 0) muzzleLight.intensity = 0;
  gfx.render(vm && me.alive && !me.scope);
}

// ---------------------------------------------------------------- start / stop a match
function startGame(roomId) {
  const info = parseRoomId(roomId) || { map: settings.map, rounds: settings.rounds };
  const mapId = MAPS[info.map] ? info.map : 'awp_lego';
  G.room = roomId;
  setWorld(mapId);
  hud.radarMap(mapDef, world.boxes);
  fx.clear();
  G.ents.forEach(x => x.avatar && x.avatar.dispose(scene));
  G.ents.clear();
  G.peerInfo.clear();
  G.since = Date.now(); G.joinedAt = now(); G.botSeq = 0; G.infoDirty = true; G.killer = null;
  G.R = { on: info.rounds > 0, max: info.rounds, n: 0, phase: '', endsAt: 0, startedAt: 0, wins: { T: 0, CT: 0 }, streak: { T: 0, CT: 0 }, sentAt: 0 };
  G.money = G.R.on ? 800 : START_MONEY;
  let team = settings.team;
  if (team !== 'T' && team !== 'CT') team = Math.random() < 0.5 ? 'T' : 'CT';
  G.me = makeEnt(selfId, selfId, clean(settings.name), team, false);
  setVM(new ViewModel(team));
  spawn(G.me);
  try { G.net = joinMatch(roomId, handlers); } catch (e) { console.warn('[net] match unavailable', e); G.net = null; }
  announce();
  $('#roomLabel').textContent = t('lobbyCode') + ': ' + MAPS[mapId].title + ' · ' + (G.R.on ? t('modeRounds').replace('{n}', G.R.max) : 'DM') + ' · ' + (parseRoomId(roomId) || { code: '' }).code;
  G.mode = 'game';
  root.classList.add('ingame');
  $('#lobby').hidden = true;
  hud.show(true);
  $('#chatLog').innerHTML = '';
  $('#feed').innerHTML = '';
  showPause(true);
  warmUp();
  setTimeout(() => { if (G.net && G.mode === 'game' && !G.net.peers().length) hud.chat('', '', t('alone'), true); }, 6000);
}
function leaveGame() {
  if (G.net) { G.net.leave(); G.net = null; }
  G.ents.forEach(x => x.avatar && x.avatar.dispose(scene));
  G.ents.clear();
  closeBuy(false);
  G.me = null; setVM(null);
  if (document.pointerLockElement) document.exitPointerLock();
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  G.mode = 'lobby';
  root.classList.remove('ingame', 'playing', 'scoped');
  hud.show(false);
  hud.board(false);
  showPause(false);
  $('#lobby').hidden = false;
  G.room = '';
  if (lobby) lobby.set({ r: '', h: false, n: clean(settings.name) });
  setWorld(settings.map);
}

// ---------------------------------------------------------------- pause / pointer lock
function showPause(on, tab) {
  const p = $('#pause');
  p.hidden = !on;
  p.classList.toggle('menu-only', G.mode !== 'game');
  if (on && tab) openTab(tab);
  if (window.VersionSwitcher) window.VersionSwitcher.hide(G.mode === 'game' && !on);
}
const LOCK_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyR', 'KeyT', 'KeyN', 'KeyF', 'KeyB', 'KeyC', 'KeyM', 'KeyY', 'Tab', 'Space',
  'ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'AltLeft', 'Digit1', 'Digit2', 'Digit3', 'Digit4'];
async function lock() {
  sfx.unlock();
  // In fullscreen the Keyboard Lock API lets the game have Ctrl+W, Ctrl+T etc.
  if (settings.fullscreen && G.mode === 'game' && !document.fullscreenElement && root.requestFullscreen) {
    try { await root.requestFullscreen({ navigationUI: 'hide' }); } catch (e) { /* not allowed: stay windowed */ }
  }
  if (document.fullscreenElement && navigator.keyboard && navigator.keyboard.lock) {
    try { await navigator.keyboard.lock(LOCK_KEYS); G.kbLock = true; } catch (e) { G.kbLock = false; }
  }
  try {
    const r = canvas.requestPointerLock({ unadjustedMovement: true });
    if (r && r.catch) await r.catch(() => { const r2 = canvas.requestPointerLock(); if (r2 && r2.catch) return r2.catch(() => hud.center(t('lockFail'))); });
  } catch (e) {
    try { canvas.requestPointerLock(); } catch (e2) { hud.center(t('lockFail')); }
  }
}
document.addEventListener('pointerlockchange', () => {
  G.locked = document.pointerLockElement === canvas;
  root.classList.toggle('playing', G.locked);
  if (G.mode === 'game' && !G.buyOpen) showPause(!G.locked);
  if (!G.locked) { keys.clear(); G.mouseDown = false; G.board = false; hud.board(false); }
});
document.addEventListener('pointerlockerror', () => hud.center(t('lockFail')));
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) { G.kbLock = false; if (navigator.keyboard && navigator.keyboard.unlock) navigator.keyboard.unlock(); } });
$('#pausePlay').addEventListener('click', lock);
$('#pause').addEventListener('click', e => { if (e.target !== $('#pause')) return; if (G.mode === 'game') lock(); else showPause(false); });
$('#pauseLobby').addEventListener('click', leaveGame);
$('#pauseClose').addEventListener('click', () => showPause(false));
$('#openSettings').addEventListener('click', () => { sfx.unlock(); sfx.ui(); showPause(true, 'game'); });
$('#openXhair').addEventListener('click', () => { sfx.unlock(); sfx.ui(); showPause(true, 'xhair'); });
canvas.addEventListener('click', () => { if (G.mode === 'game' && !G.locked && !G.buyOpen) lock(); });

// ---------------------------------------------------------------- buy menu
const GROUP_LABEL = { pistol: 'gPistol', smg: 'gSmg', rifle: 'gRifle', sniper: 'gSniper', heavy: 'gHeavy' };
const bar = v => `<i style="--v:${Math.max(0.06, Math.min(1, v)).toFixed(2)}"></i>`;
function renderBuy() {
  if (!G.buyOpen || !G.me) return;
  const me = G.me;
  const item = (id, name, price, stats, own) => `<button type="button" class="bi${own ? ' own' : ''}${G.money < price ? ' poor' : ''}" data-buy="${id}">
      <b>${esc(name)}</b><span class="bi-price">$${price}</span>${stats || ''}</button>`;
  const cols = BUY_GROUPS.map(g => {
    const ids = g.ids.filter(id => allowed(id, me.team));
    return `<section class="bcol"><h3>${esc(t(GROUP_LABEL[g.key]))}</h3>${ids.map(id => {
      const W = WEAPONS[id];
      const stats = `<span class="bi-stats">${bar(W.dmg * W.pellets / 120)}${bar(W.dmg * W.pellets / W.rate / 520)}${bar((W.speed - 3.6) / 2.8)}</span>`;
      return item(id, W.name, W.price, stats, me.ws.inv[W.slot] === id);
    }).join('')}</section>`;
  }).join('');
  const gear = `<section class="bcol"><h3>${esc(t('gGear'))}</h3>${item('kevlar', ARMOR.kevlar.name, ARMOR.kevlar.price, '', me.armor >= 100)}${item('helmet', ARMOR.helmet.name, me.armor >= 100 && !me.helmet ? 350 : ARMOR.helmet.price, '', me.helmet && me.armor >= 100)}
    <label class="tg bauto"><input type="checkbox" id="autoBuy"${settings.autoBuy ? ' checked' : ''}><i></i><span>${esc(t('autoBuy'))}</span></label>
    <p class="blegend"><span>${esc(t('statDmg'))}</span><span>${esc(t('statRate'))}</span><span>${esc(t('statMob'))}</span></p></section>`;
  $('#buyCols').innerHTML = cols + gear;
  $('#buyMoney').textContent = '$' + G.money;
  $('#autoBuy').addEventListener('change', e => { settings.autoBuy = e.target.checked; saveSettings(); });
}
function openBuy() {
  if (!G.me || !G.me.alive) return;
  if (!canBuy()) { hud.center(t('buyClosed')); return; }
  G.buyOpen = true;
  $('#buy').hidden = false;
  renderBuy();
  if (document.pointerLockElement) document.exitPointerLock();
  if (window.VersionSwitcher) window.VersionSwitcher.hide(true);
}
function closeBuy(relock) {
  if (!G.buyOpen) return;
  G.buyOpen = false;
  $('#buy').hidden = true;
  if (relock && G.mode === 'game') lock();
}
$('#buyCols').addEventListener('click', e => {
  const b = e.target.closest('[data-buy]');
  if (b) buy(b.dataset.buy);
});
$('#buyClose').addEventListener('click', () => closeBuy(true));

// ---------------------------------------------------------------- input
document.addEventListener('mousemove', e => {
  if (!G.locked || G.mode !== 'game' || !G.me) return;
  const mx = Math.max(-500, Math.min(500, e.movementX)), my = Math.max(-500, Math.min(500, e.movementY));
  // same feel as CS2: 0.022 degrees per count, scaled down while zoomed
  const s = settings.sens * 0.022 * Math.PI / 180 * (camera.fov / settings.fov);
  const me = G.me;
  if (!me.alive) return;
  me.yaw -= mx * s;
  me.pitch = Math.max(-1.55, Math.min(1.55, me.pitch - my * s));
  G.mdx += mx; G.mdy += my;
});
document.addEventListener('mousedown', e => {
  if (!G.locked || G.mode !== 'game') return;
  const me = G.me;
  if (e.button === 0) { G.mouseDown = true; G.triggerUsed = false; }
  if (e.button === 2 && me.alive) {
    const W = WEAPONS[me.w];
    if (W.zooms) { me.scope = (me.scope + 1) % (W.zooms.length + 1); me.ws.rescopeAt = 0; sfx.scope(); }
    else if (me.w === 'knife') fire(me, true);
  }
});
document.addEventListener('mouseup', e => { if (e.button === 0) { G.mouseDown = false; G.triggerUsed = false; } });
document.addEventListener('contextmenu', e => { if (G.mode === 'game') e.preventDefault(); });
document.addEventListener('wheel', e => {
  if (!G.locked || G.mode !== 'game' || !G.me.alive) return;
  const order = [1, 2, 3].map(s => G.me.ws.inv[s]).filter(Boolean);
  const i = order.indexOf(G.me.w);
  switchWeapon(G.me, order[(i + (e.deltaY > 0 ? 1 : order.length - 1)) % order.length]);
}, { passive: true });

const chatInput = $('#chatInput');
function openChat() {
  G.typing = true; keys.clear(); G.mouseDown = false;
  $('#chatBox').hidden = false;
  chatInput.value = '';
  setTimeout(() => chatInput.focus(), 0);
}
function closeChat(send) {
  const text = chatInput.value.trim().slice(0, 120);
  if (send && text && G.me) {
    hud.chat(G.me.name, G.me.team, text);
    if (G.net) G.net.send('chat', { t: text });
  }
  G.typing = false;
  $('#chatBox').hidden = true;
  chatInput.blur();
}
chatInput.addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Enter') { e.preventDefault(); closeChat(true); }
  else if (e.key === 'Escape') { e.preventDefault(); closeChat(false); }
});

document.addEventListener('keydown', e => {
  if (G.mode !== 'game' || G.typing) return;
  if (G.buyOpen) {
    if (e.code === 'KeyB' || e.code === 'Escape') { e.preventDefault(); closeBuy(true); }
    return;
  }
  if (e.code === 'Tab') { e.preventDefault(); G.board = true; return; }
  if (!G.locked) return;
  if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) || e.ctrlKey) e.preventDefault();
  keys.add(e.code);
  const me = G.me;
  if ((e.code === 'ControlLeft' || e.code === 'ControlRight') && !G.kbLock && !G.ctrlHinted) { G.ctrlHinted = true; hud.center(t('ctrlHint'), 3500); }
  if (e.repeat) return;
  switch (e.code) {
    case 'Digit1': switchWeapon(me, me.ws.inv[1]); break;
    case 'Digit2': switchWeapon(me, me.ws.inv[2]); break;
    case 'Digit3': switchWeapon(me, 'knife'); break;
    case 'KeyQ': switchWeapon(me, me.ws.inv[me.ws.prev] || me.ws.inv[2]); break;
    case 'KeyR': reload(me); break;
    case 'KeyF': if (vm) vm.inspect(); break;
    case 'KeyB': openBuy(); break;
    case 'KeyY': case 'Enter': e.preventDefault(); openChat(); break;
    case 'KeyM': {
      const tm = me.team === 'T' ? 'CT' : 'T';
      setTeam(me, tm);
      setVM(new ViewModel(tm));
      settings.team = tm; saveSettings();
      if (G.R.on && G.R.phase !== 'freeze') { me.alive = false; me.respawnAt = 0; } else spawn(me);
      G.infoDirty = true;
      hud.center(t('switched').replace('{t}', TEAM_NAME[tm]));
      break;
    }
  }
});
document.addEventListener('keyup', e => {
  keys.delete(e.code);
  if (e.code === 'Tab') { G.board = false; hud.board(false); }
});
addEventListener('blur', () => { keys.clear(); G.mouseDown = false; });
addEventListener('beforeunload', e => { if (G.mode === 'game' && G.locked) { e.preventDefault(); e.returnValue = ''; } });

// ---------------------------------------------------------------- lobby UI
let lobby = null;
let counts = {};
const coarse = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;

function renderServers() {
  const list = $('#servers');
  if (!list) return;
  list.innerHTML = MAP_ORDER.map(id => {
    const m = MAPS[id], n = counts[id] || 0;
    return `<li><button type="button" class="srv${settings.map === id ? ' on' : ''}" data-map="${id}" aria-pressed="${settings.map === id}">
      <span class="srv-art art-${id}" aria-hidden="true"></span>
      <span class="srv-body">
        <b class="srv-name">${esc(m.title)}</b>
        <span class="srv-blurb">${esc(m.blurb[lang])}</span>
        <span class="srv-meta"><i class="${n ? 'live' : ''}"></i>${n ? `${n} ${esc(t('players'))}` : esc(t('empty'))}</span>
      </span>
    </button></li>`;
  }).join('');
  if (!lobby) $('#online').textContent = t('connecting');
}
$('#servers').addEventListener('click', e => {
  const b = e.target.closest('.srv');
  if (!b) return;
  settings.map = b.dataset.map; saveSettings();
  setWorld(settings.map);
  renderServers();
  sfx.unlock(); sfx.ui();
});
$('#servers').addEventListener('dblclick', e => { if (e.target.closest('.srv') && !coarse) play(); });

const nick = $('#nick');
if (!settings.name) settings.name = 'Oyuncu' + Math.floor(100 + Math.random() * 900);
nick.value = settings.name;
nick.addEventListener('input', () => { settings.name = clean(nick.value); saveSettings(); });

function segment(sel, key, parse = v => v) {
  const btns = $$(sel + ' button');
  const sync = () => btns.forEach(b => b.setAttribute('aria-pressed', String(String(settings[key]) === b.dataset.v)));
  btns.forEach(b => b.addEventListener('click', () => { settings[key] = parse(b.dataset.v); saveSettings(); sync(); sfx.unlock(); sfx.ui(); }));
  sync();
}
segment('#teamSeg', 'team');
segment('#botSeg', 'bots', v => v === 'true');
segment('#roundSeg', 'rounds', v => +v);

// ---------------------------------------------------------------- settings menu
function openTab(name) {
  $$('.tabs [data-tab]').forEach(x => x.setAttribute('aria-selected', String(x.dataset.tab === name)));
  $$('.pane').forEach(p => { p.hidden = p.dataset.pane !== name; });
  if (name === 'xhair') drawPreview();
}
$$('.tabs [data-tab]').forEach(b => b.addEventListener('click', () => { openTab(b.dataset.tab); sfx.ui(); }));
// a range with a readout; the readout can be an editable number input
function bindRange(id, obj, key, fmt, onChange) {
  const el = $(id), out = $(id + 'Out');
  const show = v => { if (out.tagName === 'INPUT') out.value = v; else out.textContent = fmt(v); };
  const sync = () => { el.value = obj[key]; show(obj[key]); };
  el.addEventListener('input', () => { obj[key] = +el.value; show(+el.value); onChange(key); });
  if (out.tagName === 'INPUT') out.addEventListener('change', () => {
    const v = parseFloat(out.value);
    if (isFinite(v)) { obj[key] = Math.max(+el.min, Math.min(+el.max, v)); sync(); onChange(key); }
  });
  sync();
  return sync;
}
function bindToggle(id, obj, key, onChange) {
  const el = $(id);
  const sync = () => { el.checked = !!obj[key]; };
  el.addEventListener('change', () => { obj[key] = el.checked; onChange(key); });
  sync();
  return sync;
}
function bindSeg(id, obj, key, parse, onChange) {
  const btns = $$(id + ' button');
  const sync = () => btns.forEach(b => b.setAttribute('aria-pressed', String(String(obj[key]) === b.dataset.v)));
  btns.forEach(b => b.addEventListener('click', () => { obj[key] = parse(b.dataset.v); sync(); onChange(key); sfx.ui(); }));
  sync();
  return sync;
}
bindRange('#sens', settings, 'sens', v => (+v).toFixed(2), saveSettings);
bindRange('#fovIn', settings, 'fov', v => v + '°', saveSettings);
bindRange('#vol', settings, 'vol', v => Math.round(v * 100) + '%', () => { sfx.setVolume(settings.vol); saveSettings(); });
bindToggle('#fsToggle', settings, 'fullscreen', saveSettings);

// crosshair
const XCOLORS = ['#4dff6a', '#4cf2ff', '#ffe14d', '#ffffff', '#ff5fd2', '#ff3b30'];
$('#xColors').innerHTML = XCOLORS.map(c => `<button type="button" data-c="${c}" style="--c:${c}" aria-label="${c}"></button>`).join('') + '<input type="color" id="xCustom" aria-label="custom colour">';
const syncColors = () => { $$('#xColors button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.c === settings.xhair.color))); $('#xCustom').value = settings.xhair.color; };
$$('#xColors button').forEach(b => b.addEventListener('click', () => { settings.xhair.color = b.dataset.c; syncColors(); onXhair(); sfx.ui(); }));
$('#xCustom').addEventListener('input', e => { settings.xhair.color = e.target.value; syncColors(); onXhair(); });
syncColors();
function drawPreview() {
  const c = $('#xhairPreview');
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  c.width = c.height = 120 * dpr;
  drawCrosshair(c, settings.xhair, settings.xhair.gap);
}
function onXhair() { saveSettings(); hud.crosshairStyle(settings.xhair); drawPreview(); }
const xsync = [
  bindRange('#xSize', settings.xhair, 'size', v => v + 'px', onXhair),
  bindRange('#xGap', settings.xhair, 'gap', v => v + 'px', onXhair),
  bindRange('#xThick', settings.xhair, 'thick', v => v + 'px', onXhair),
  bindRange('#xAlpha', settings.xhair, 'alpha', v => Math.round(v * 100) + '%', onXhair),
  bindToggle('#xDot', settings.xhair, 'dot', onXhair),
  bindToggle('#xOutline', settings.xhair, 'outline', onXhair),
  bindToggle('#xDynamic', settings.xhair, 'dynamic', onXhair),
  bindToggle('#xT', settings.xhair, 'tstyle', onXhair)
];
$('#xReset').addEventListener('click', () => { Object.assign(settings.xhair, XHAIR_DEFAULTS); xsync.forEach(f => f()); syncColors(); onXhair(); sfx.ui(); });
hud.crosshairStyle(settings.xhair);

// graphics
const gsync = [];
function onGfx(key) {
  if (!['preset', 'cap', 'fpsShow', 'autoRes', 'aa'].includes(key)) settings.gfx.preset = 'custom';
  if (key === 'aa') hud.center(t('aaNote'), 2200);
  gfx.apply(settings.gfx);
  $('#fps').hidden = !settings.gfx.fpsShow;
  saveSettings();
  gsync.forEach(f => f());
}
gsync.push(bindSeg('#presetSeg', settings.gfx, 'preset', v => v, () => { Object.assign(settings.gfx, PRESETS[settings.gfx.preset]); onGfx('preset'); }));
gsync.push(bindSeg('#capSeg', settings.gfx, 'cap', v => +v, onGfx));
gsync.push(bindRange('#gScale', settings.gfx, 'scale', v => Math.round(v * 100) + '%', onGfx));
gsync.push(bindSeg('#shadowSeg', settings.gfx, 'shadows', v => v, onGfx));
gsync.push(bindToggle('#gAuto', settings.gfx, 'autoRes', onGfx));
gsync.push(bindToggle('#gBloom', settings.gfx, 'bloom', onGfx));
gsync.push(bindToggle('#gAA', settings.gfx, 'aa', onGfx));
gsync.push(bindToggle('#gFps', settings.gfx, 'fpsShow', onGfx));
$('#fps').hidden = !settings.gfx.fpsShow;

function announce() {
  if (!lobby) return;
  if (G.mode !== 'game' || !G.room) { lobby.set({ r: '', h: false, n: clean(settings.name) }); return; }
  let humans = 0, bots = 0;
  for (const x of G.ents.values()) { if (x.bot) bots++; else humans++; }
  const score = G.R.on ? G.R.wins.CT + ':' + G.R.wins.T + ' · R' + G.R.n : '';
  lobby.set({ r: G.room, n: G.me ? G.me.name : clean(settings.name), h: !!G.host, p: humans, b: bots, s: score });
}
function enter(roomId) {
  if (coarse) return;
  settings.name = clean(nick.value); nick.value = settings.name; saveSettings();
  sfx.unlock();
  closeLobbies();
  G.invite = '';
  $('#inviteNote').hidden = true;
  startGame(roomId);
  lock();
}
// quick play: the busiest open lobby with the same map and mode, or a new one
function play() {
  if (G.invite) return enter(G.invite);
  const open = lobby ? lobby.lobbies().filter(L => L.map === settings.map && L.rounds === settings.rounds && L.humans < 10) : [];
  enter(open.length ? open[0].room : makeRoomId(settings.map, settings.rounds));
}
const MAX_HUMANS = 10;
function renderLobbies() {
  const list = lobby ? lobby.lobbies() : [];
  $('#lobbiesBtn').querySelector('span').textContent = t('lobbiesOpen').replace('{n}', list.length);
  const relays = relayCount();
  $('#online').textContent = lobby ? (lobby.online() + ' ' + t('online') + ' · ' + t('relays').replace('{n}', relays)) : t('connecting');
  $('#netWarn').hidden = !(lobby && relays === 0 && performance.now() > 8000);
  if ($('#lobbies').hidden) return;
  $('#lbsNet').textContent = $('#online').textContent;
  $('#lbsList').innerHTML = list.length ? list.map(L => {
    const m = MAPS[L.map];
    const full = L.humans >= MAX_HUMANS;
    return '<li class="lbs-row' + (L.mine ? ' mine' : '') + '">' +
      '<span class="srv-art art-' + esc(L.map) + '" aria-hidden="true"></span>' +
      '<span class="lbs-main"><b>' + esc(m ? m.title : L.map) + '</b><small>' + esc(L.rounds ? t('modeRounds').replace('{n}', L.rounds) : 'Deathmatch') + (L.score ? ' · ' + esc(L.score) : '') + ' · ' + esc(t('hostBy').replace('{n}', L.host)) + '</small></span>' +
      '<span class="lbs-count"><b>' + L.humans + '/' + MAX_HUMANS + '</b><small>' + (L.bots ? esc(t('bots_n').replace('{n}', L.bots)) : '') + '</small></span>' +
      (L.mine ? '<em class="lbs-tag">' + esc(t('yours')) + '</em>' : '<button type="button" class="lbs-join" data-room="' + esc(L.room) + '"' + (full ? ' disabled' : '') + '>' + esc(full ? t('full') : t('join')) + '</button>') +
      '</li>';
  }).join('') : '<li class="lbs-empty">' + esc(t('noLobbies')) + '</li>';
}
function openLobbies() { $('#lobbies').hidden = false; sfx.unlock(); sfx.ui(); renderLobbies(); }
function closeLobbies() { $('#lobbies').hidden = true; }
$('#lobbiesBtn').addEventListener('click', openLobbies);
$('#lbsClose').addEventListener('click', closeLobbies);
$('#lobbies').addEventListener('click', e => { if (e.target === $('#lobbies')) closeLobbies(); });
$('#lbsList').addEventListener('click', e => { const b = e.target.closest('[data-room]'); if (b && !b.disabled) enter(b.dataset.room); });
$('#lbsCreate').addEventListener('click', () => enter(makeRoomId(settings.map, settings.rounds)));
$('#copyInvite').addEventListener('click', async () => {
  const url = location.origin + location.pathname + '?lobby=' + encodeURIComponent(G.room);
  try { await navigator.clipboard.writeText(url); } catch (e) { prompt('', url); }
  hud.center(t('copied'), 2500);
});
setInterval(renderLobbies, 2000);
$('#play').addEventListener('click', play);
nick.addEventListener('keydown', e => { if (e.key === 'Enter') play(); });
if (coarse) { $('#play').disabled = true; $('#mobileNote').hidden = false; }
$$('[data-lang]').forEach(b => b.addEventListener('click', () => { lang = b.dataset.lang; store.set('lang', lang); applyLang(); }));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && G.mode !== 'game' && !$('#pause').hidden) showPause(false); });

// ---------------------------------------------------------------- boot
saveSettings();
setWorld(MAPS[settings.map] ? settings.map : (settings.map = 'awp_lego'));
resize();
applyLang();
try {
  lobby = joinLobby(() => {
    counts = {};
    for (const L of lobby.lobbies()) counts[L.map] = (counts[L.map] || 0) + L.humans;
    renderServers(); renderLobbies();
  });
  if (lobby) lobby.set({ r: '', n: clean(settings.name) });
} catch (e) { console.warn('[net] lobby failed', e); }
{
  // fun.html?lobby=<room>: an invite from a friend
  const inv = new URLSearchParams(location.search).get('lobby');
  const info = parseRoomId(inv);
  if (info && MAPS[info.map]) {
    G.invite = inv;
    settings.map = info.map; setWorld(info.map);
    $('#inviteNote').hidden = false;
    $('#inviteText').textContent = MAPS[info.map].title + ' · ' + (info.rounds ? t('modeRounds').replace('{n}', info.rounds) : 'Deathmatch') + ' · ' + info.code;
    $('#play').querySelector('span').textContent = t('joinInvite');
  }
}
renderServers();
// build the other map while the visitor reads the lobby
setTimeout(() => { for (const id of MAP_ORDER) worlds[id] ||= buildWorld(MAPS[id], renderer); }, 600);
root.classList.add('ready');
if (/[?&]debug\b/.test(location.search)) window.__yek = { G, settings, applyRound, startGame, fire, switchWeapon, buy, openBuy, gfx, scene, camera, renderer, reload, get vm() { return vm; } };
gfx.measureRefresh().then(hz => { const el = $('#refreshHz'); if (el) el.textContent = t('refresh').replace('{hz}', hz); requestAnimationFrame(frame); });
