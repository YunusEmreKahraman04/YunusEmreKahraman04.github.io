// Bot brains. A bot is an ordinary entity owned by the room host; the brain only
// decides where to walk, where to look and when to pull the trigger.
import { WEAPONS } from './weapons.js';

export const BOT_NAMES = ['Kemal', 'Ayşe', 'Mert', 'Zeynep', 'Can', 'Elif', 'Burak', 'Selin', 'Deniz', 'Oğuz', 'Ece', 'Tolga'];

const TAU = Math.PI * 2;
const wrap = a => { a = (a + Math.PI) % TAU; return (a < 0 ? a + TAU : a) - Math.PI; };
const rand = (a, b) => a + Math.random() * (b - a);

export class BotBrain {
  constructor(ent, game) {
    this.e = ent; this.g = game;
    this.path = []; this.goal = -1;
    this.target = null; this.reactAt = 0; this.lastSeen = null; this.lastSeenAt = 0;
    this.thinkAt = 0; this.strafe = 0; this.strafeAt = 0;
    this.stuckAt = 0; this.stuckPos = [0, 0, 0];
    this.aimErr = [0, 0]; this.aimHead = false;
    this.burst = 0; this.pauseUntil = 0;
    this.skill = rand(0.45, 0.9);
  }
  reset() { this.path = []; this.goal = -1; this.target = null; this.lastSeen = null; }

  update(dt, now) {
    const e = this.e, g = this.g;
    e.wish = [0, 0]; e.walk = false; e.crouchKey = false; e.jumpKey = false;
    if (!e.alive) return;
    const W = WEAPONS[e.w];
    const eye = g.eye(e);

    // --- perception, a few times a second
    if (now >= this.thinkAt) {
      this.thinkAt = now + 110;
      let best = null, bd = Infinity;
      const fwdYaw = e.yaw;
      for (const o of g.enemiesOf(e)) {
        const op = g.posOf(o);
        const dx = op[0] - eye[0], dz = op[2] - eye[2];
        const dist = Math.hypot(dx, dz);
        if (dist > 95) continue;
        const ang = Math.abs(wrap(Math.atan2(-dx, -dz) - fwdYaw));
        const heard = now - (o.lastShot || 0) < 1500 && dist < 45;
        if (ang > 1.15 && dist > 7 && !heard && o.id !== (e.hurtBy || '')) continue;
        if (!g.canSee(eye, o)) continue;
        if (dist < bd) { bd = dist; best = o; }
      }
      if (best && best !== this.target) {
        const slow = WEAPONS[e.w].cat === 'sniper' ? 1.5 : 1;
        this.reactAt = now + rand(260, 520) * slow / (0.6 + this.skill * 0.5);
        const spreadDeg = rand(2.5, 6) * (1.3 - this.skill * 0.5);
        this.aimErr = [rand(-1, 1) * spreadDeg * Math.PI / 180, rand(-1, 1) * spreadDeg * Math.PI / 180];
        this.aimHead = Math.random() < 0.25 + this.skill * 0.25;
        this.burst = 0;
      }
      this.target = best;
      if (best) { this.lastSeen = g.posOf(best).slice(); this.lastSeenAt = now; }
      // react to being shot from somewhere we can't see
      if (!best && e.hurtBy && now - e.hurtAt < 600) {
        const o = g.ent(e.hurtBy);
        if (o) { this.lastSeen = g.posOf(o).slice(); this.lastSeenAt = now; this.path = []; }
      }
    }

    const decay = Math.exp(-dt * (2 + this.skill * 3));
    this.aimErr[0] *= decay; this.aimErr[1] *= decay;

    if (this.target && this.target.alive) {
      const tp = g.posOf(this.target);
      const th = g.heightOf(this.target);
      const aimY = tp[1] + (this.aimHead ? th - 0.16 : th * 0.68);
      const dx = tp[0] - eye[0], dy = aimY - eye[1], dz = tp[2] - eye[2];
      const dist = Math.hypot(dx, dz);
      const wantYaw = Math.atan2(-dx, -dz) + this.aimErr[0];
      const wantPitch = Math.atan2(dy, dist) + this.aimErr[1];
      this.turn(wantYaw, wantPitch, dt, 7 + this.skill * 6);

      // footwork: strafe with rifles, plant feet with the AWP
      if (now >= this.strafeAt) { this.strafe = [-1, 1, -1, 1, 0][(Math.random() * 5) | 0]; this.strafeAt = now + rand(350, 900); }
      const shootingNow = now >= this.reactAt;
      const sniper = WEAPONS[e.w].cat === 'sniper';
      const plant = sniper ? shootingNow : (shootingNow && dist > 14 && this.burst > 0);
      if (!plant && this.strafe) {
        const ry = e.yaw - Math.PI / 2;
        e.wish = [-Math.sin(ry) * this.strafe, -Math.cos(ry) * this.strafe];
      }
      if (WEAPONS[e.w].zooms) e.scope = shootingNow && (sniper || dist > 20) ? 1 : 0;

      // trigger discipline
      const errYaw = Math.abs(wrap(e.yaw - Math.atan2(-dx, -dz)));
      const errPitch = Math.abs(e.pitch - Math.atan2(dy, dist));
      const tol = Math.atan2(sniper ? 0.22 : 0.32, dist) + 0.004;
      if (shootingNow && now >= this.pauseUntil && errYaw < tol * 1.6 && errPitch < tol * 2) {
        const mag = e.ws.ammo[e.w].mag;
        if (mag <= 0) g.reload(e);
        else if (g.fire(e)) {
          this.burst++;
          const maxBurst = W.auto ? (dist > 18 ? 3 : W.cat === 'heavy' ? 12 : 7) : 1;
          if (this.burst >= maxBurst) { this.burst = 0; this.pauseUntil = now + rand(180, 420) * (W.auto ? 1 : 2); }
        }
      }
      return;
    }

    // --- no one in sight: reload, then roam or chase a sound
    if (e.ws.ammo[e.w].mag < W.mag * 0.4 && e.ws.ammo[e.w].res > 0) g.reload(e);
    e.scope = 0;
    const nav = g.nav;
    const me = e.body.p;
    if (this.lastSeen && now - this.lastSeenAt < 4000 && !this.path.length) {
      this.path = nav.path(nav.nearest(me), nav.nearest(this.lastSeen));
      this.lastSeen = null;
    }
    if (!this.path.length) {
      this.goal = this.pickGoal();
      this.path = nav.path(nav.nearest(me), this.goal);
      if (!this.path.length) { e.yaw += dt * 0.8; return; }
    }
    let node = nav.nodes[this.path[0]].p;
    while (this.path.length && Math.hypot(node[0] - me[0], node[2] - me[2]) < 0.7) {
      this.path.shift();
      if (this.path.length) node = nav.nodes[this.path[0]].p;
    }
    if (!this.path.length) return;
    const dx = node[0] - me[0], dz = node[2] - me[2];
    const d = Math.hypot(dx, dz) || 1;
    e.wish = [dx / d, dz / d];
    // look a little ahead along the path
    const look = nav.nodes[this.path[Math.min(2, this.path.length - 1)]].p;
    this.turn(Math.atan2(-(look[0] - me[0]), -(look[2] - me[2])), 0, dt, 4);

    // unstick
    if (now >= this.stuckAt) {
      const moved = Math.hypot(me[0] - this.stuckPos[0], me[2] - this.stuckPos[2]);
      if (moved < 0.6) { this.path = []; e.jumpKey = true; }
      this.stuckPos = me.slice(); this.stuckAt = now + 1300;
    }
  }

  turn(yaw, pitch, dt, speed) {
    const e = this.e;
    const dy = wrap(yaw - e.yaw), max = speed * dt;
    e.yaw = wrap(e.yaw + Math.max(-max, Math.min(max, dy * Math.min(1, dt * 12))));
    e.pitch += Math.max(-max, Math.min(max, (pitch - e.pitch) * Math.min(1, dt * 10)));
  }

  pickGoal() {
    const nodes = this.g.nav.nodes;
    if (!nodes.length) return -1;
    const enemySide = this.e.team === 'T' ? 1 : -1;
    for (let i = 0; i < 12; i++) {
      const k = (Math.random() * nodes.length) | 0;
      const x = nodes[k].p[0];
      if (Math.random() < 0.35 || Math.sign(x) === enemySide) return k;
    }
    return (Math.random() * nodes.length) | 0;
  }
}
