// Serverless multiplayer over WebRTC. Peers find each other through public Nostr relays
// (Trystero), then talk directly. Works on static hosting such as GitHub Pages.
import { joinRoom, selfId, getRelaySockets } from '../vendor/trystero/trystero.min.js';

export { selfId };
const CONFIG = {
  appId: 'yek-strike-portfolio-2026',
  relayConfig: { warnOnRelayFailure: false },
  // public TURN fallbacks for strict NATs / office networks; direct P2P is used whenever possible
  turnConfig: [
    { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: ['turn:freestun.net:3478'], username: 'free', credential: 'free' }
  ]
};

// how many signalling relays we are connected to (0 = the network blocks them)
export function relayCount() {
  try { return Object.values(getRelaySockets()).filter(s => s && s.readyState === 1).length; } catch (e) { return 0; }
}

// A room id carries its settings: "<map>.<rounds>.<code>"
export function makeRoomId(map, rounds) {
  const code = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${map}.${rounds | 0}.${code}`;
}
export function parseRoomId(id) {
  const m = /^([a-z_0-9]+)\.(\d+)\.([A-Z0-9]{3,8})$/.exec(String(id || ''));
  return m ? { map: m[1], rounds: +m[2], code: m[3] } : null;
}

// ---------------------------------------------------------------- lobby: who is where
// Everyone on the page joins one shared room and announces what they're playing.
export function joinLobby(onChange) {
  let room;
  try { room = joinRoom(CONFIG, 'lobby-v2'); } catch (e) { console.warn('[net] lobby unavailable', e); return null; }
  const pr = room.makeAction('pr');
  const people = new Map(); // peerId -> presence
  let me = { r: '', n: '' };
  const emit = () => onChange && onChange();
  pr.onMessage = (d, { peerId }) => {
    if (!d || typeof d !== 'object') return;
    people.set(peerId, {
      r: parseRoomId(d.r) ? d.r : '', n: String(d.n || '').slice(0, 16), h: !!d.h,
      p: Math.min(32, d.p | 0), b: Math.min(32, d.b | 0), s: String(d.s || '').slice(0, 24), t: Date.now()
    });
    emit();
  };
  room.onPeerJoin = id => { pr.send(me, { target: id }).catch(() => {}); };
  room.onPeerLeave = id => { people.delete(id); emit(); };
  const beat = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of people) if (now - v.t > 12000) people.delete(k);
    pr.send(me).catch(() => {});
    emit();
  }, 4000);
  return {
    // r: room id ('' in the menu), n: name, h: is host, p: humans, b: bots, s: score text
    set(p) { me = { ...me, ...p }; pr.send(me).catch(() => {}); emit(); },
    online: () => people.size + 1,
    // open lobbies, merged from everyone's presence
    lobbies() {
      const rooms = new Map();
      const add = (v, self) => {
        if (!v.r) return;
        const info = parseRoomId(v.r);
        const L = rooms.get(v.r) || { room: v.r, ...info, humans: 0, bots: 0, host: '', score: '', mine: false };
        L.humans++;
        if (v.h) { L.host = v.n; L.bots = v.b; L.score = v.s; }
        if (!L.host) L.host = v.n;
        if (self) L.mine = true;
        rooms.set(v.r, L);
      };
      for (const v of people.values()) add(v, false);
      add(me, true);
      return [...rooms.values()].sort((a, b) => b.humans - a.humans);
    },
    peers: () => room.getPeers ? Object.keys(room.getPeers()).length : 0,
    leave() { clearInterval(beat); room.leave(); }
  };
}

// ---------------------------------------------------------------- a match room
export function joinMatch(roomId, handlers) {
  const room = joinRoom(CONFIG, 'm-' + roomId, {
    onJoinError: d => handlers.error && handlers.error(d)
  });
  const make = (name, fn) => {
    const a = room.makeAction(name);
    a.onMessage = (data, ctx) => { try { fn(data, ctx.peerId); } catch (e) { console.warn('[net]', name, e); } };
    return a;
  };
  const A = {
    info: make('in', (d, id) => handlers.info(d, id)),
    state: make('st', (d, id) => handlers.state(d, id)),
    fx: make('fx', (d, id) => handlers.fx(d, id)),
    hit: make('ht', (d, id) => handlers.hit(d, id)),
    kill: make('kl', (d, id) => handlers.kill(d, id)),
    chat: make('ch', (d, id) => handlers.chat(d, id)),
    round: make('rd', (d, id) => handlers.round(d, id))
  };
  room.onPeerJoin = id => handlers.join(id);
  room.onPeerLeave = id => handlers.leave(id);
  const send = (a, data, target) => { A[a].send(data, target ? { target } : undefined).catch(() => {}); };
  return {
    send,
    peers: () => Object.keys(room.getPeers()),
    leave: () => room.leave()
  };
}
