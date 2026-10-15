// Serverless multiplayer over WebRTC. Peers find each other through public Nostr relays
// (Trystero), then talk directly. Works on static hosting such as GitHub Pages.
import { joinRoom, selfId } from '../vendor/trystero/trystero.min.js';

export { selfId };
const CONFIG = {
  appId: 'yek-strike-portfolio-2026',
  relayConfig: { warnOnRelayFailure: false },
  // public TURN fallback for strict NATs; direct P2P is used whenever possible
  turnConfig: [{ urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' }]
};

// ---------------------------------------------------------------- lobby: who is where
export function joinLobby(onChange) {
  let room;
  try { room = joinRoom(CONFIG, 'lobby'); } catch (e) { console.warn('[net] lobby unavailable', e); return null; }
  const pr = room.makeAction('pr');
  const people = new Map(); // peerId -> {map, name, t}
  let me = { map: '', name: '' };
  const emit = () => onChange && onChange(counts());
  const counts = () => {
    const c = { _online: people.size + 1 };
    for (const v of people.values()) if (v.map) c[v.map] = (c[v.map] || 0) + 1;
    if (me.map) c[me.map] = (c[me.map] || 0) + 1;
    return c;
  };
  pr.onMessage = (d, { peerId }) => { people.set(peerId, { map: d.m || '', name: String(d.n || '').slice(0, 16), t: Date.now() }); emit(); };
  room.onPeerJoin = id => { pr.send({ m: me.map, n: me.name }, { target: id }).catch(() => {}); };
  room.onPeerLeave = id => { people.delete(id); emit(); };
  const beat = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of people) if (now - v.t > 12000) people.delete(k);
    pr.send({ m: me.map, n: me.name }).catch(() => {});
    emit();
  }, 4000);
  return {
    set(map, name) { me = { map, name }; pr.send({ m: map, n: name }).catch(() => {}); emit(); },
    counts,
    leave() { clearInterval(beat); room.leave(); }
  };
}

// ---------------------------------------------------------------- a match room
export function joinMatch(mapId, handlers) {
  const room = joinRoom(CONFIG, 'm-' + mapId, {
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
