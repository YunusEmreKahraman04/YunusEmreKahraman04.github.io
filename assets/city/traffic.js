/* Street life around the camera: signalised intersections, the four reps' vans driving with real
   rules (stop at red, keep distance, slow for turns, stop at each outlet to take the order, yield to
   people on the crossing), ambient cars that queue at lights, and pedestrians who cross on their phase.
   Only the blocks around the van being followed (and the street camera) are simulated in detail. */

export function createTraffic(E) {
  const { THREE, scene, xs, zs, HW, vans, makeLights, people, MOBILE } = E;
  const CYCLE = 18, YEL = 1.5, GX = 7.5;            // x-axis green 0–7.5, yellow –9; z-axis green 9–16.5, yellow –18
  const STOP = HW + 12;                              // van centre stops this far before the intersection centre
  const ZEB = HW + 3.5;                              // zebra centre, from the intersection centre
  const near = (arr, v) => { let b = 0, d = Infinity; arr.forEach((a, i) => { const e = Math.abs(a - v); if (e < d) { d = e; b = i; } }); return b; };
  const off = (i, j) => (i * 7 + j * 11) % CYCLE;
  let T = 0;
  // light for traffic moving along `axis` ('x' | 'z') at intersection (i, j): 'g' | 'y' | 'r'
  function light(i, j, axis, t = T) {
    const p = (t + off(i, j)) % CYCLE;
    if (axis === 'x') return p < GX ? 'g' : p < GX + YEL ? 'y' : 'r';
    return p < CYCLE / 2 ? 'r' : p < CYCLE / 2 + GX ? 'g' : 'y';
  }
  // seconds since the crossing over a street running along `axis` turned walkable (−1 if not)
  function walkAge(i, j, axis) {
    const p = (T + off(i, j)) % CYCLE;
    return axis === 'x' ? (p >= CYCLE / 2 ? p - CYCLE / 2 : -1) : (p < CYCLE / 2 ? p : -1);
  }

  /* ---------------------------------------------------------- signals (pooled around the focus) */
  const R = 2, NI = (2 * R + 1) ** 2;
  const poleGeo = new THREE.CylinderGeometry(0.35, 0.45, 10, 6).translate(0, 5, 0);
  const poles = new THREE.InstancedMesh(poleGeo, new THREE.MeshBasicMaterial({ color: 0x1c1f2c }), NI * 4);
  const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 3.2, 1.2), new THREE.MeshBasicMaterial({ color: 0x0b0c12 }), NI * 4);
  poles.frustumCulled = heads.frustumCulled = false;
  scene.add(poles, heads);
  const lamps = makeLights(NI * 4);
  for (let k = 0; k < NI * 4; k++) lamps.add_(0, -99, 0, 0xff2a2a, 7);
  lamps.done(); scene.add(lamps);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), SC = new THREE.Vector3(1, 1, 1), C = new THREE.Color();
  const LC = { g: 0x45ff6a, y: 0xffc020, r: 0xff2a2a };
  const CORNERS = [[1, 1, 'x'], [-1, -1, 'x'], [1, -1, 'z'], [-1, 1, 'z']];
  let center = [-1, -1];
  function placeSignals(ci, cj) {
    let k = 0;
    for (let di = -R; di <= R; di++) for (let dj = -R; dj <= R; dj++) {
      const i = ci + di, j = cj + dj, ok = xs[i] !== undefined && zs[j] !== undefined;
      CORNERS.forEach(([sx, sz]) => {
        if (ok) M.compose(P.set(xs[i] + sx * (HW + 1.6), 0, zs[j] + sz * (HW + 1.6)), Q, SC); else M.makeScale(0, 0, 0);
        poles.setMatrixAt(k, M);
        if (ok) M.compose(P.set(xs[i] + sx * (HW + 1.6), 10.5, zs[j] + sz * (HW + 1.6)), Q, SC);
        heads.setMatrixAt(k, M);
        k++;
      });
    }
    poles.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
  }
  function paintSignals(ci, cj) {
    const pos = lamps.geometry.attributes.position, col = lamps.geometry.attributes.color;
    let k = 0;
    for (let di = -R; di <= R; di++) for (let dj = -R; dj <= R; dj++) {
      const i = ci + di, j = cj + dj, ok = xs[i] !== undefined && zs[j] !== undefined;
      CORNERS.forEach(([sx, sz, ax]) => {
        if (!ok) { pos.setXYZ(k++, 0, -99, 0); return; }
        const st = light(i, j, ax);
        pos.setXYZ(k, xs[i] + sx * (HW + 1.6), st === 'r' ? 11.4 : st === 'y' ? 10.5 : 9.6, zs[j] + sz * (HW + 1.6));
        C.setHex(LC[st]); col.setXYZ(k, C.r, C.g, C.b);
        k++;
      });
    }
    pos.needsUpdate = col.needsUpdate = true;
  }

  /* ---------------------------------------------------------- vehicles */
  const carGeo = (() => {
    const parts = [[new THREE.BoxGeometry(9, 2.4, 4.4).translate(0, 1.8, 0), 0.85], [new THREE.BoxGeometry(5.2, 2.1, 4.1).translate(-0.6, 4, 0), 0.1], [new THREE.BoxGeometry(9.1, 0.5, 4.5).translate(0, 0.75, 0), 0.25]];
    const pos = [], col = [];
    parts.forEach(([g, k]) => { const n = g.toNonIndexed(); n.computeVertexNormals(); const p = n.attributes.position, nn = n.attributes.normal; for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); const s = k * (0.5 + 0.5 * Math.max(0, nn.getY(i) * 0.8 + nn.getX(i) * 0.25 + 0.2)); col.push(s, s, s); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g;
  })();
  const NA = MOBILE ? 14 : 22, NE = 12;
  const carMesh = new THREE.InstancedMesh(carGeo, new THREE.MeshBasicMaterial({ vertexColors: true }), NA + NE);
  carMesh.frustumCulled = false;
  const COLS = [0xe8e8f0, 0x2b2e3a, 0xb02a35, 0x2f5fa8, 0xd8b04a, 0x9aa0a8, 0x3a6b4a, 0x111318];
  for (let i = 0; i < NA + NE; i++) carMesh.setColorAt(i, new THREE.Color(COLS[i % COLS.length]));
  scene.add(carMesh);
  const carLights = makeLights((NA + NE) * 4);
  for (let i = 0; i < (NA + NE) * 4; i++) carLights.add_(0, -99, 0, i % 4 < 2 ? 0xfff4dd : 0xff2a3a, 4.5);
  carLights.done(); scene.add(carLights);

  let seed = 99;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  // a car lives on one street (axis + line), drives along it in one direction
  const cars = [];
  for (let i = 0; i < NA + NE; i++) cars.push({ i, edge: i >= NA, axis: 'x', line: 0, dir: 1, s: 0, v: 0, cruise: 24 + rnd() * 10, yaw: 0, brake: 0 });
  const lanePos = c => c.line + c.dir * 4.5 * (c.axis === 'x' ? 1 : -1);
  function respawn(c, fx, fz, far) {
    for (let tries = 0; tries < 8; tries++) {
      c.axis = rnd() < 0.5 ? 'x' : 'z';
      const lines = c.axis === 'x' ? zs : xs, along = c.axis === 'x' ? fx : fz;
      const li = Math.max(1, Math.min(lines.length - 2, near(lines, c.axis === 'x' ? fz : fx) + Math.round((rnd() - 0.5) * 2.4)));
      c.line = lines[li]; c.dir = rnd() < 0.5 ? 1 : -1;
      c.s = along + (far ? (rnd() < 0.5 ? -1 : 1) * (200 + rnd() * 90) : (rnd() - 0.5) * 420);
      c.v = c.cruise * 0.6;
      if (!cars.some(o => o !== c && o.axis === c.axis && o.line === c.line && o.dir === c.dir && Math.abs(o.s - c.s) < 22)) return;
    }
  }

  /* ---------------------------------------------------------- pedestrians on the crossings */
  const NP = MOBILE ? 10 : 22;
  const pedMesh = people.mesh(NP, false);
  pedMesh.count = NP;
  for (let i = 0; i < NP; i++) { pedMesh.instanceColor.setXYZ(i, ...new THREE.Color(people.SHIRTS[i % people.SHIRTS.length]).toArray()); people.setAnim(pedMesh, i, rnd() * 6, 7, 0); }
  scene.add(pedMesh);
  // a crossing ("leg"): over the street along `axis` at intersection (i, j), on side sg (−1/+1)
  const peds = Array.from({ length: NP }, () => ({ on: false }));
  function pedPlace(p) {
    const H = HW + 2.2, w = -H + 2 * H * p.u, c = p.across;
    const x = p.axis === 'x' ? xs[p.i] + p.sg * ZEB + c : xs[p.i] + w * p.dir;
    const z = p.axis === 'x' ? zs[p.j] + w * p.dir : zs[p.j] + p.sg * ZEB + c;
    return [x, z];
  }
  function crossingBusy(i, j, axis, sg) { return peds.some(p => p.on && p.state === 'walk' && p.i === i && p.j === j && p.axis === axis && p.sg === sg && p.u > 0.02 && p.u < 0.98); }

  /* ---------------------------------------------------------- the look-ahead every vehicle uses */
  // obstacles along a straight run: lights, crossings with people, the vehicle ahead
  function scanStraight(axis, line, dir, s, range, out, skipFirst) {
    const grid = axis === 'x' ? xs : zs, other = axis === 'x' ? zs : xs, oj = near(other, line);
    for (let gi = 0; gi < grid.length; gi++) {
      const d = (grid[gi] - s) * dir;
      if (d < (skipFirst ? 2 : -STOP + 2) || d > range) continue;
      const i = axis === 'x' ? gi : oj, j = axis === 'x' ? oj : gi;
      const st = light(i, j, axis);
      const sLine = d - STOP;
      if (sLine > -3 && (st === 'r' || (st === 'y' && sLine > 9))) out.push(sLine);
      // crossings on this street, before and after the intersection
      [-1, 1].forEach(k => {
        const dz = d + k * ZEB;
        if (dz > -2 && dz < range && crossingBusy(i, j, axis, k * dir)) out.push(dz - 9);
      });
    }
  }
  function follow(axis, line, dir, s, self, out) {
    const chk = (oax, oline, odir, os) => { if (oax !== axis || Math.abs(oline - line) > 1 || odir !== dir) return; const g = (os - s) * dir; if (g > 0.5 && g < 90) out.push(g - 14); };
    cars.forEach(c => { if (c !== self && c.alive) chk(c.axis, c.line, c.dir, c.s); });
    vans.forEach(v => { if (v !== self && v.lane) chk(v.lane.axis, v.lane.line, v.lane.dir, v.lane.s); });
  }
  const allow = (dist, decel = 16) => Math.sqrt(2 * decel * Math.max(0, dist));

  /* ---------------------------------------------------------- vans along their routes */
  function segAt(v, t) {
    let k = 1;
    while (k < v.cum.length - 1 && v.cum[k] < t) k++;
    const a = v.r.path[k - 1], b = v.r.path[k], L = v.cum[k] - v.cum[k - 1] || 1, f = (t - v.cum[k - 1]) / L;
    return { k, a, b, x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f, ux: (b.x - a.x) / L, uz: (b.z - a.z) / L, rem: v.cum[k] - t };
  }
  vans.forEach((v, n) => {
    v.speed = 0; v.cruise = 26 + n * 2.4; v.dwell = 0;
    const i = v.stopTs.findIndex(s => s.t > v.t); v.next = i < 0 ? v.stopTs.length : i;
    const sg = segAt(v, v.t); v.yaw = Math.atan2(sg.uz, sg.ux);
  });
  function driveVan(v, dt) {
    const sg = segAt(v, v.t);
    const axis = Math.abs(sg.ux) > Math.abs(sg.uz) ? 'x' : 'z', dir = Math.sign(axis === 'x' ? sg.ux : sg.uz) || 1;
    const line = axis === 'x' ? zs[near(zs, sg.z)] : xs[near(xs, sg.x)], s = axis === 'x' ? sg.x : sg.z;
    v.lane = { axis, line, dir, s };
    const obs = [];
    scanStraight(axis, line, dir, s, Math.min(95, sg.rem + 2), obs, false);
    // the corner: slow for the turn, and look past it for people on the crossing we turn into
    if (sg.k < v.cum.length - 1 && sg.rem < 70) {
      const nx = v.r.path[sg.k + 1], b = sg.b, nL = Math.hypot(nx.x - b.x, nx.z - b.z) || 1;
      const nax = Math.abs(nx.x - b.x) > Math.abs(nx.z - b.z) ? 'x' : 'z';
      if (nax !== axis) {
        obs.push({ turn: sg.rem });
        const ndir = Math.sign(nax === 'x' ? nx.x - b.x : nx.z - b.z), i = near(xs, b.x), j = near(zs, b.z);
        if (crossingBusy(i, j, nax, ndir)) obs.push(sg.rem - 6);
        void nL;
      }
    }
    follow(axis, line, dir, s, v, obs);
    // the next outlet on the list: pull up, take the order, move on
    while (v.next < v.stopTs.length && v.stopTs[v.next].t < v.t - 1.5) v.next++;
    const st = v.stopTs[v.next];
    let target = v.cruise * (0.85 + 0.3 * (0.5 + 0.5 * Math.sin(T * 0.21 + v.cruise)));   // drivers ease on and off
    if (st) {
      const d = st.t - v.t;
      if (d >= -0.5 && d < 120) {
        if (d < 1.2 && v.speed < 1.5) { v.dwell += dt; v.speed = 0; if (v.dwell > 3.2) { v.dwell = 0; v.next++; } return; }
        target = Math.min(target, allow(d - 0.6, 12));
      }
    }
    obs.forEach(o => { if (typeof o === 'number') target = Math.min(target, allow(o)); else target = Math.min(target, Math.sqrt(10 * 10 + 2 * 12 * Math.max(0, o.turn - 4))); });
    const acc = 9;
    v.speed = target > v.speed ? Math.min(target, v.speed + acc * dt) : Math.max(target, v.speed - 26 * dt);
    v.speed = Math.max(0, v.speed);
    const yaw = Math.atan2(sg.uz, sg.ux);
    let dy = yaw - v.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    v.yaw += dy * Math.min(1, dt * (2 + v.speed * 0.12));
  }

  /* ---------------------------------------------------------- per frame */
  const D = new THREE.Vector3();
  function update(dt, time, focus, edgeWin) {
    T = time;
    vans.forEach(v => driveVan(v, dt));
    const fx = focus.x, fz = focus.z;
    const ci = near(xs, fx), cj = near(zs, fz);
    if (ci !== center[0] || cj !== center[1]) { center = [ci, cj]; placeSignals(ci, cj); }
    paintSignals(ci, cj);

    // cars: drive, respawn when they leave the window
    const cp = carLights.geometry.attributes.position;
    cars.forEach(c => {
      if (!c.alive) {
        c.alive = true;
        if (c.edge) { c.axis = 'x'; c.line = edgeWin.line; c.dir = c.i % 2 ? 1 : -1; c.s = edgeWin.a + rnd() * (edgeWin.b - edgeWin.a); } else respawn(c, fx, fz, false);
      }
      const obs = [];
      scanStraight(c.axis, c.line, c.dir, c.s, 90, obs, false);
      follow(c.axis, c.line, c.dir, c.s, c, obs);
      let target = c.cruise;
      obs.forEach(o => { target = Math.min(target, allow(o)); });
      c.brake = target < c.v - 0.5 ? 1 : 0;
      c.v = target > c.v ? Math.min(target, c.v + 8 * dt) : Math.max(target, c.v - 26 * dt);
      c.s += c.dir * c.v * dt;
      if (c.edge) { if (c.s > edgeWin.b) c.s = edgeWin.a; else if (c.s < edgeWin.a) c.s = edgeWin.b; }
      else {
        const along = c.axis === 'x' ? c.s - fx : c.s - fz, perp = c.axis === 'x' ? c.line - fz : c.line - fx;
        if (Math.abs(along) > 330 || Math.abs(perp) > 260) respawn(c, fx, fz, true);
      }
      const x = c.axis === 'x' ? c.s : lanePos(c), z = c.axis === 'x' ? lanePos(c) : c.s;
      const yaw = c.axis === 'x' ? (c.dir > 0 ? 0 : Math.PI) : (c.dir > 0 ? -Math.PI / 2 : Math.PI / 2);
      M.compose(P.set(x, 0, z), Q.setFromAxisAngle(D.set(0, 1, 0), yaw), SC);
      carMesh.setMatrixAt(c.i, M);
      const hx = Math.cos(yaw), hz = -Math.sin(yaw), px = -hz * 1.6, pz = hx * 1.6;
      cp.setXYZ(c.i * 4, x + hx * 4.6 + px, 1.9, z + hz * 4.6 + pz); cp.setXYZ(c.i * 4 + 1, x + hx * 4.6 - px, 1.9, z + hz * 4.6 - pz);
      cp.setXYZ(c.i * 4 + 2, x - hx * 4.6 + px, 1.9 + c.brake * 0.01, z - hz * 4.6 + pz); cp.setXYZ(c.i * 4 + 3, x - hx * 4.6 - px, 1.9, z - hz * 4.6 - pz);
    });
    carMesh.instanceMatrix.needsUpdate = true; cp.needsUpdate = true;

    // pedestrians: wait at the kerb, cross on their phase
    peds.forEach((p, n) => {
      if (!p.on) {
        if (rnd() > 0.02) { pedMesh.setMatrixAt(n, M.makeScale(0, 0, 0)); return; }
        Object.assign(p, { on: true, state: 'wait', i: Math.max(0, Math.min(xs.length - 1, ci + Math.round((rnd() - 0.5) * 2.6))), j: Math.max(0, Math.min(zs.length - 1, cj + Math.round((rnd() - 0.5) * 2.6))), axis: rnd() < 0.5 ? 'x' : 'z', sg: rnd() < 0.5 ? -1 : 1, dir: rnd() < 0.5 ? -1 : 1, u: 0, across: (rnd() - 0.5) * 3, speed: 3.4 + rnd() * 1.4, wait: 0 });
      }
      if (p.state === 'wait') {
        p.wait += dt;
        const age = walkAge(p.i, p.j, p.axis);
        if (age >= 0 && age < 3) { p.state = 'walk'; people.setAnim(pedMesh, n, rnd() * 6, 6.5, 1); }
        else if (p.wait > 22) { p.on = false; return; }
      } else {
        p.u += p.speed * dt / (2 * (HW + 2.2));
        if (p.u >= 1) { p.on = false; people.setAnim(pedMesh, n, 0, 7, 0); pedMesh.setMatrixAt(n, M.makeScale(0, 0, 0)); return; }
      }
      const [x, z] = pedPlace(p);
      const face = p.axis === 'x' ? (p.dir > 0 ? 0 : Math.PI) : (p.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      M.compose(P.set(x, 0, z), Q.setFromAxisAngle(D.set(0, 1, 0), face), SC);
      pedMesh.setMatrixAt(n, M);
    });
    pedMesh.instanceMatrix.needsUpdate = true;
  }

  return {
    update, light,
    edgeCars: () => cars.filter(c => c.edge && c.alive).map(c => ({ s: c.s, z: lanePos(c), dir: c.dir })),
    crossingPeds: () => peds.filter(p => p.on).map(p => { const [x, z] = pedPlace(p); return { x, z }; })
  };
}
