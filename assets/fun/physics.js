// Source-style player movement over an axis-aligned world, in metres
// (CS values converted at 1 unit = 2.54 cm). Every solid is a box {min, max}.

export const BODY = {
  r: 0.4,              // 32 units wide
  h: 1.83, hc: 1.37,   // 72 / 54 units tall
  eye: 1.63, eyeC: 1.17,
  step: 0.46,          // 18 units
  gravity: 20.32,      // sv_gravity 800
  jump: 7.67,          // ~57 units of jump height
  friction: 5.2, stopSpeed: 2.03, accel: 5.5, airAccel: 12, airCap: 0.76
};

const EPS = 1e-4;

function overlaps(b, x0, y0, z0, x1, y1, z1) {
  return x0 < b.max[0] && x1 > b.min[0] && y0 < b.max[1] && y1 > b.min[1] && z0 < b.max[2] && z1 > b.min[2];
}
export function hitsAny(boxes, p, h, r = BODY.r) {
  for (const b of boxes) if (overlaps(b, p[0] - r, p[1], p[2] - r, p[0] + r, p[1] + h, p[2] + r)) return b;
  return null;
}

// One movement tick. body: {p, v, h, onGround, stepped}; input: {wish:[x,z] unit, speed, jump, crouch}
export function pmove(boxes, body, input, dt) {
  const b = body, v = b.v;
  // crouching: on the ground the head comes down, in the air the legs come up (crouch-jump)
  // (half the hull difference, ~9 units: a crouch-jump clears about 64 units like CS)
  const wantH = input.crouch ? BODY.hc : BODY.h;
  const tuck = (BODY.h - BODY.hc) / 2;
  if (wantH < b.h) {
    if (!b.onGround) b.p[1] += tuck;
    b.h = wantH;
  } else if (wantH > b.h) {
    if (b.onGround) { if (!hitsAny(boxes, b.p, wantH)) b.h = wantH; }
    else {
      const low = [b.p[0], b.p[1] - tuck, b.p[2]];
      if (!hitsAny(boxes, low, wantH)) { b.p[1] = low[1]; b.h = wantH; }
    }
  }

  if (input.jump && b.onGround) { v[1] = BODY.jump; b.onGround = false; b.jumped = true; }

  // friction
  if (b.onGround) {
    const sp = Math.hypot(v[0], v[2]);
    if (sp > 1e-3) {
      const drop = Math.max(sp, BODY.stopSpeed) * BODY.friction * dt;
      const k = Math.max(sp - drop, 0) / sp;
      v[0] *= k; v[2] *= k;
    }
  }
  // acceleration: on the ground up to the weapon's speed, in the air only a sliver (air strafing)
  const [wx, wz] = input.wish;
  if (wx || wz) {
    const wishSpeed = input.speed;
    const cap = b.onGround ? wishSpeed : Math.min(wishSpeed, BODY.airCap);
    const add = cap - (v[0] * wx + v[2] * wz);
    if (add > 0) {
      const acc = Math.min((b.onGround ? BODY.accel : BODY.airAccel) * dt * wishSpeed, add);
      v[0] += acc * wx; v[2] += acc * wz;
    }
  }
  return moveBody(boxes, b, dt);
}

// Integrates velocity with collisions, steps up to BODY.step on the ground.
// Returns the height stepped up this tick (for smoothing the camera).
export function moveBody(boxes, body, dt) {
  const r = BODY.r;
  body.v[1] -= BODY.gravity * dt;
  const wasGround = body.onGround;
  body.onGround = false;
  let stepped = 0;

  for (const ax of [0, 2]) {
    const d = body.v[ax] * dt;
    if (!d) continue;
    body.p[ax] += d;
    for (const b of boxes) {
      const p = body.p;
      if (!overlaps(b, p[0] - r, p[1], p[2] - r, p[0] + r, p[1] + body.h, p[2] + r)) continue;
      const lift = b.max[1] - p[1];
      if (wasGround && lift > 0 && lift <= BODY.step) {
        const up = [p[0], b.max[1] + EPS, p[2]];
        if (!hitsAny(boxes, up, body.h)) { stepped += up[1] - p[1]; p[1] = up[1]; continue; }
      }
      p[ax] = d > 0 ? b.min[ax] - r - EPS : b.max[ax] + r + EPS;
      body.v[ax] = 0;
    }
  }

  const dy = body.v[1] * dt;
  body.p[1] += dy;
  for (const b of boxes) {
    const p = body.p;
    if (!overlaps(b, p[0] - r, p[1], p[2] - r, p[0] + r, p[1] + body.h, p[2] + r)) continue;
    if (dy <= 0) { p[1] = b.max[1]; body.onGround = true; }
    else p[1] = b.min[1] - body.h - EPS;
    body.v[1] = 0;
  }
  // stay glued to the ground walking down stairs and ramps
  if (!body.onGround && wasGround && body.v[1] <= 0) {
    for (const b of boxes) {
      if (overlaps(b, body.p[0] - r, body.p[1] - BODY.step, body.p[2] - r, body.p[0] + r, body.p[1], body.p[2] + r) && b.max[1] <= body.p[1] + EPS) {
        stepped -= body.p[1] - b.max[1];
        body.p[1] = b.max[1]; body.onGround = true; body.v[1] = 0; break;
      }
    }
  }
  return stepped;
}

// Ray vs box (slab test). Returns nearest t in [0, maxT] or Infinity.
export function rayBox(b, o, d, maxT) {
  let t0 = 0, t1 = maxT;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < b.min[i] || o[i] > b.max[i]) return Infinity;
    } else {
      const inv = 1 / d[i];
      let a = (b.min[i] - o[i]) * inv, c = (b.max[i] - o[i]) * inv;
      if (a > c) { const s = a; a = c; c = s; }
      if (a > t0) t0 = a;
      if (c < t1) t1 = c;
      if (t0 > t1) return Infinity;
    }
  }
  return t0;
}
export function rayWorld(boxes, o, d, maxT = 200) {
  let best = maxT, hit = null;
  for (const b of boxes) {
    const t = rayBox(b, o, d, best);
    if (t < best) { best = t; hit = b; }
  }
  return { t: best, box: hit };
}
export function rayFace(b, o, d, t) {
  const p = [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t];
  let best = Infinity, n = [0, 1, 0];
  for (let i = 0; i < 3; i++) {
    const lo = Math.abs(p[i] - b.min[i]), hi = Math.abs(p[i] - b.max[i]);
    if (lo < best) { best = lo; n = [0, 0, 0]; n[i] = -1; }
    if (hi < best) { best = hi; n = [0, 0, 0]; n[i] = 1; }
  }
  return { p, n };
}

// Hitboxes of a body: head, chest, stomach/arms, legs. Returns {t, zone} or null.
export function rayBodyZones(o, d, pos, h, maxT) {
  const r = 0.3;
  const k = h / BODY.h;
  const zones = [
    { zone: 'head', min: [pos[0] - 0.15, pos[1] + h - 0.3, pos[2] - 0.15], max: [pos[0] + 0.15, pos[1] + h, pos[2] + 0.15] },
    { zone: 'body', min: [pos[0] - r, pos[1] + 0.85 * k, pos[2] - r * 0.8], max: [pos[0] + r, pos[1] + h - 0.3, pos[2] + r * 0.8] },
    { zone: 'legs', min: [pos[0] - r * 0.75, pos[1], pos[2] - r * 0.6], max: [pos[0] + r * 0.75, pos[1] + 0.85 * k, pos[2] + r * 0.6] }
  ];
  let best = null;
  for (const z of zones) {
    const t = rayBox(z, o, d, maxT);
    if (t < maxT && (!best || t < best.t)) best = { t, zone: z.zone };
  }
  return best;
}
