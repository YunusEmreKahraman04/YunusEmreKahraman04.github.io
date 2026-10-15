/* Chapters 02–03, in the same city as chapter 01.
   02 Field operation: TRP told as seven events (briefing on the depot roof, the cab of rep A, the HQ media
   facade, the ranks of the tower, the Pansis data bridge, the loading dock, the bunker) + EdgeVision on a
   street camera. 03 Command center: the hall under the ops yard — lockers, academy feed, badges, radio.
   This module builds those set pieces, gives each section a camera shot, and runs the event timeline that
   unlocks each card. city.js owns the renderer, the base city, scrolling and the loop. */


export function buildOps(E) {
  const { THREE, scene, camera, renderer, xs, zs, mi, HW, river, routes, vans, makeLights, ACC, MOBILE, reduce, hall, yard, hq, pansis, fire, L, people, traffic, edgeWin, facadeMat } = E;
  const HS = people.S;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), SC = new THREE.Vector3(), EU = new THREE.Euler();
  const hex = c => '#' + c.toString(16).padStart(6, '0');
  let rnd = 1234567;
  const rand = () => { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; };
  const dark = c => new THREE.MeshBasicMaterial({ color: c });
  const glow = (c, o = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: o < 1, opacity: o, depthWrite: o >= 1, blending: o < 1 ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide });
  const add = (m, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); scene.add(m); return m; };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  // canvases are drawn in logical units and stored at 2× so text stays crisp up close
  function canvasTex(w, h, k = 2, live = false) {
    const c = document.createElement('canvas'); c.width = w * k; c.height = h * k; c.lw = w; c.lh = h;
    const x = c.getContext('2d'); x.scale(k, k);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    if (live) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; }   // redrawn often: skip the mipmap rebuild on each upload
    return { c, x, t };
  }
  const FONT = '"JetBrains Mono", ui-monospace, monospace', DISP = 'Unbounded, Inter, sans-serif';
  const relabels = [];
  function label(fn, color = '#4cf2ff', h = 8, bg = 'rgba(4,6,16,.78)') {
    const { c, x, t } = canvasTex(512, 96);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
    const draw = () => {
      const text = typeof fn === 'function' ? fn() : fn;
      x.clearRect(0, 0, 512, 96);
      x.font = `600 40px ${FONT}`;
      const w = Math.min(500, x.measureText(text).width + 44);
      x.fillStyle = bg; x.fillRect((512 - w) / 2, 14, w, 68);
      x.fillStyle = color; x.fillRect((512 - w) / 2, 14, 6, 68);
      x.fillText(text, (512 - w) / 2 + 24, 63);
      t.needsUpdate = true;
    };
    draw(); relabels.push(draw);
    s.scale.set(h * 512 / 96, h, 1);
    s.renderOrder = 10;
    return s;
  }

  /* ---------------------------------------------------------------- people: holographic operators + civilians */
  const people_ = [];   // {mesh, i, x, y, z, ry, walk, idle, turn}
  const opsMesh = people.mesh(40, true); scene.add(opsMesh);
  const civMesh = people.mesh(MOBILE ? 60 : 110, false); scene.add(civMesh);
  function person(mesh, x, y, z, ry, extra = {}) {
    const p = { mesh, i: mesh.count++, x, y, z, ry, ph: rand() * 6.28, ...extra };
    if (p.walk) people.setAnim(mesh, p.i, rand() * 6, 6.5 * Math.min(1.3, Math.abs(p.walk.v) / 1.6), 1);
    else people.setAnim(mesh, p.i, rand() * 6, 1.1, extra.idle ? 0.05 : 0);
    if (mesh === civMesh) { const c = new THREE.Color(people.SHIRTS[p.i % people.SHIRTS.length]); mesh.instanceColor.setXYZ(p.i, c.r, c.g, c.b); }
    people_.push(p);
    return p;
  }

  /* ---------------------------------------------------------------- 02 · w0 — HQ tower + Yandex mast */
  const hqTop = hq.h;
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 3, 60, 6).translate(0, 30, 0), dark(0x1a1c30)), hq.cx, hqTop, hq.cz);
  const hqSign = add(label('ANADOLU BİRLİK HOLDİNG · HQ', '#4cf2ff', 9), hq.cx, hqTop + 14, hq.cz + hq.d / 2);
  // media facade on the south face: the manager dashboards, live
  const dash = canvasTex(768, 512, 1.5, true);
  const facadeW = hq.w * 0.86, facadeH = hq.h * 0.42, facadeY = hq.h * 0.6;
  const facade = add(new THREE.Mesh(new THREE.PlaneGeometry(facadeW, facadeH), new THREE.MeshBasicMaterial({ map: dash.t, toneMapped: false })), hq.cx, facadeY, hq.cz + hq.d / 2 + 0.6);
  // ranks: four glowing bands of floors, top to bottom
  const RANK = [[0.84, 0.98, 0xff3fa4], [0.6, 0.8, 0xffb347], [0.34, 0.56, 0x8b7bff], [0.04, 0.3, 0x4cf2ff]];
  const rankBands = RANK.map(([a, b, c], k) => {
    const m = add(new THREE.Mesh(box(hq.w + 2, (b - a) * hq.h, hq.d + 2), glow(c, 0)), hq.cx, (a + b) / 2 * hq.h, hq.cz);
    const s = add(label(() => `0${k + 1} · ${L().op.roles[k].toUpperCase()}`, hex(c), 10), hq.cx + hq.w / 2 + 34, (a + b) / 2 * hq.h, hq.cz + hq.d / 2);
    s.material.opacity = 0;
    return { m, s };
  });
  // Yandex: a signal mast out past the city edge
  const ydx = hq.cx - 760, ydz = hq.cz - 820;
  add(new THREE.Mesh(new THREE.CylinderGeometry(1.2, 6, 300, 4, 1, true).translate(0, 150, 0), new THREE.MeshBasicMaterial({ color: 0x2a2c48, wireframe: true })), ydx, 0, ydz);
  const yLights = makeLights(8);
  for (let k = 0; k < 6; k++) yLights.add_(ydx, 50 + k * 50, ydz, k % 2 ? 0xffd400 : 0xff3344, 16, k * 0.17);
  yLights.done(); scene.add(yLights);
  add(label('YANDEX · 2024—25', '#ffd400', 22), ydx, 330, ydz);

  /* ---------------------------------------------------------------- 02 · brief — the depot roof */
  const roofY = hall.h;
  add(new THREE.Mesh(box(18, 3, 11).translate(0, 1.5, 0), dark(0x161a2c)), hall.cx, roofY, hall.cz);
  add(new THREE.Mesh(box(18.4, 0.3, 11.4), glow(0x4cf2ff)), hall.cx, roofY + 3, hall.cz);
  const holo = canvasTex(640, 400, 1.6, true);
  const holoMesh = add(new THREE.Mesh(new THREE.PlaneGeometry(26, 16.25), new THREE.MeshBasicMaterial({ map: holo.t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false })), hall.cx, roofY + 8, hall.cz);
  holoMesh.rotation.x = -Math.PI / 2 + 0.5;
  const holoBeam = add(new THREE.Mesh(new THREE.CylinderGeometry(13, 8, 5, 24, 1, true).translate(0, 2.5, 0), glow(0x4cf2ff, 0.08)), hall.cx, roofY + 3, hall.cz);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3, r = 15;
    person(opsMesh, hall.cx + Math.cos(a) * r, roofY, hall.cz + Math.sin(a) * r * 0.75, Math.atan2(-Math.cos(a), -Math.sin(a)), { idle: 1 });
  }
  const BOUNDS = (() => { const e = xs[xs.length - 1] * 1.05; return { x0: -e, x1: e, z0: zs[0] * 1.05, z1: zs[zs.length - 1] * 1.05 }; })();
  function mapPt(w, h, x, z, pad = 20) { return [pad + (x - BOUNDS.x0) / (BOUNDS.x1 - BOUNDS.x0) * (w - pad * 2), pad + (z - BOUNDS.z0) / (BOUNDS.z1 - BOUNDS.z0) * (h - pad * 2)]; }
  function drawHolo(t) {
    const { x, c } = holo, w = c.lw, h = c.lh;
    x.clearRect(0, 0, w, h);
    x.strokeStyle = 'rgba(76,242,255,.25)'; x.lineWidth = 1;
    xs.forEach(v => { const [a] = mapPt(w, h, v, 0); x.beginPath(); x.moveTo(a, 10); x.lineTo(a, h - 10); x.stroke(); });
    zs.forEach(v => { const [, b] = mapPt(w, h, 0, v); x.beginPath(); x.moveTo(10, b); x.lineTo(w - 10, b); x.stroke(); });
    x.strokeStyle = 'rgba(76,242,255,.8)'; x.lineWidth = 3; x.strokeRect(4, 4, w - 8, h - 8);
    const k1 = Math.min(1, t / 0.9), k2 = Math.max(0, Math.min(1, (t - 0.9) / 1.4));
    routes.forEach((r, ri) => {
      const col = hex(r.color);
      // sector: a soft blob around the rep's stops
      const cx = r.stops.reduce((s, p) => s + p.x, 0) / r.stops.length, cz = r.stops.reduce((s, p) => s + p.z, 0) / r.stops.length;
      const [px, pz] = mapPt(w, h, cx, cz);
      const rad = 70 * Math.min(1, Math.max(0, k1 * 4 - ri));
      if (rad > 0) { const g = x.createRadialGradient(px, pz, 0, px, pz, rad); g.addColorStop(0, col + '66'); g.addColorStop(1, col + '00'); x.fillStyle = g; x.beginPath(); x.arc(px, pz, rad, 0, 7); x.fill(); }
      x.fillStyle = col;
      r.stops.forEach(s => { const [a, b] = mapPt(w, h, s.x, s.z); x.fillRect(a - 4, b - 4, 8, 8); });
      // sequencing: the route draws itself
      if (k2 > 0) {
        const n = Math.floor(r.path.length * k2);
        x.strokeStyle = col; x.lineWidth = 4; x.shadowColor = col; x.shadowBlur = 12;
        x.beginPath(); r.path.slice(0, Math.max(2, n)).forEach((p, i) => { const [a, b] = mapPt(w, h, p.x, p.z); i ? x.lineTo(a, b) : x.moveTo(a, b); }); x.stroke();
        x.shadowBlur = 0;
      }
    });
    const [dx, dz] = mapPt(w, h, E.depotXZ.x, E.depotXZ.z);
    x.fillStyle = '#fff'; x.beginPath(); x.arc(dx, dz, 7, 0, 7); x.fill();
    x.font = `600 22px ${FONT}`; x.fillStyle = '#4cf2ff';
    x.fillText(k2 > 0.99 ? 'OR-TOOLS · SOLVED' : k2 > 0 ? 'OR-TOOLS · SEQUENCING…' : 'CLUSTERING…', 18, 34);
    holo.t.needsUpdate = true;
  }

  /* ---------------------------------------------------------------- 02 · cab — inside rep A's van */
  const cab = new THREE.Group();
  const cabMat = dark(0x0b0d18), cabEdge = glow(0x4cf2ff);
  const dashM = new THREE.Mesh(box(1, 1, 1), cabMat), dashGlow = new THREE.Mesh(box(1, 0.04, 0.04), cabEdge);
  const pillarL = new THREE.Mesh(box(0.7, 12, 0.7), cabMat), pillarR = new THREE.Mesh(box(0.7, 12, 0.7), cabMat), roof = new THREE.Mesh(box(1, 1, 1), cabMat);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.14, 6, 28), dark(0x15182a));
  const mirror = new THREE.Mesh(box(1.6, 0.5, 0.2), dark(0x1a1d30));
  const phone = canvasTex(256, 460, 2, true);
  const phoneM = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.9), new THREE.MeshBasicMaterial({ map: phone.t, toneMapped: false }));
  const phoneBezel = new THREE.Mesh(box(1.18, 2.05, 0.08), dark(0x05060a));
  [dashM, dashGlow, pillarL, pillarR, roof, wheel, mirror, phoneM, phoneBezel].forEach(m => { m.renderOrder = 20; m.material.fog = false; cab.add(m); });
  cab.visible = false;
  camera.add(cab);
  scene.add(camera);
  function layoutCab() {
    const d = 6, hh = Math.tan(camera.fov * Math.PI / 360) * d, hw = hh * camera.aspect;
    dashM.scale.set(hw * 2.4, hh * 0.55, 3); dashM.position.set(0, -hh * 0.98, -d);
    dashGlow.scale.set(hw * 2.4, 1, 1); dashGlow.position.set(0, -hh * 0.71, -d + 1.5);
    pillarL.position.set(-hw * 0.98, 0, -d); pillarL.rotation.z = -0.32;
    pillarR.position.set(hw * 0.98, 0, -d); pillarR.rotation.z = 0.32;
    roof.scale.set(hw * 2.4, hh * 0.22, 3); roof.position.set(0, hh * 1.0, -d);
    wheel.position.set(-hw * 0.42, -hh * 0.82, -d + 1.2); wheel.rotation.x = -0.45;
    mirror.position.set(0, hh * 0.78, -d + 0.4);
    const px = Math.min(hw * 0.55, hw - 0.9);
    phoneM.position.set(px, -hh * 0.42, -d + 1.6); phoneBezel.position.set(px, -hh * 0.42, -d + 1.45);
    phoneM.rotation.set(-0.1, -0.18, 0); phoneBezel.rotation.copy(phoneM.rotation);
  }
  layoutCab();
  const vanA = vans[0];
  let lastDone = -1;
  function drawPhone(now) {
    const { x, c } = phone, w = c.lw, h = c.lh, T = L().op.phone;
    const done = Math.min(vanA.next, vanA.stopTs.length), taking = vanA.dwell > 0;
    x.fillStyle = '#070912'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#4cf2ff'; x.fillRect(0, 0, w, 54);
    x.fillStyle = '#000'; x.font = `700 20px ${FONT}`; x.fillText(T.title, 14, 34);
    x.font = `500 13px ${FONT}`; x.fillText('PLS-A', w - 64, 34);
    x.fillStyle = '#45ff9a'; x.font = `500 12px ${FONT}`; x.fillText('● ' + T.offline, 14, 78);
    x.fillStyle = 'rgba(160,170,255,.5)'; x.fillText(`GPS ${(37.87 + vanA.van.position.z / -111000).toFixed(4)}`, 14, 96);
    vanA.stopTs.forEach((s, k) => {
      const y = 116 + k * 52, isDone = k < done, cur = k === done;
      x.fillStyle = cur ? 'rgba(76,242,255,.16)' : 'rgba(255,255,255,.03)'; x.fillRect(10, y, w - 20, 44);
      if (cur) { x.fillStyle = '#4cf2ff'; x.fillRect(10, y, 4, 44); }
      x.fillStyle = isDone ? '#45ff9a' : cur ? (taking ? '#ffb347' : '#fff') : 'rgba(200,205,240,.55)';
      x.font = `600 15px ${FONT}`; x.fillText(`${isDone ? '✓' : String(k + 1).padStart(2, '0')}  ${isDone ? T.done : cur ? (taking ? T.taking + '.'.repeat(1 + Math.floor(now / 300) % 3) : T.next) : '—'}`, 22, y + 27);
      x.font = `400 11px ${FONT}`; x.fillStyle = 'rgba(160,170,255,.6)'; x.fillText(`#${String(k * 37 + 101)}`, w - 58, y + 27);
    });
    phone.t.needsUpdate = true;
    return done;
  }

  // drivetrain for the cab gauges: km/h from the van, five gears, rpm that climbs and drops on each shift
  const GEARS = [0, 22, 40, 58, 80, 999];
  const eng = { rpm: 850, gear: 1, kmh: 0 };
  function engine(dt) {
    eng.kmh += (vanA.speed * 1.8 - eng.kmh) * Math.min(1, dt * 6);
    let g = 1; while (g < 5 && eng.kmh > GEARS[g]) g++;
    eng.gear = vanA.speed < 0.3 ? 0 : g;
    const lo = GEARS[g - 1], hi = Math.min(GEARS[g], 110), f = Math.max(0, Math.min(1, (eng.kmh - lo) / (hi - lo)));
    const target = eng.gear === 0 ? 850 : 1500 + f * 3800;
    eng.rpm += (target - eng.rpm) * Math.min(1, dt * (target < eng.rpm ? 5 : 7));
  }

  /* ---------------------------------------------------------------- 02 · hq — dashboards on the facade */
  let alarmT = -1;
  function drawDash(now, t) {
    const { x, c } = dash, w = c.lw, h = c.lh, T = L().op.dash;
    x.fillStyle = '#04060f'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(76,242,255,.08)';
    for (let i = 0; i < w; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); }
    x.fillStyle = '#4cf2ff'; x.font = `700 30px ${DISP}`; x.fillText(T.title, 28, 56);
    x.font = `500 16px ${FONT}`; x.fillStyle = 'rgba(200,210,255,.6)'; x.fillText('TRP · ANADOLU BİRLİK', 30, 84);
    const alarm = alarmT >= 0 && t - alarmT < 99;
    vans.forEach((v, i) => {
      const y = 120 + i * 62, plan = 1, act = v.t / v.len;
      const bad = alarm && i === 2;
      x.fillStyle = hex(v.r.color); x.font = `700 20px ${FONT}`; x.fillText(`PLS-${'ABCD'[i]}`, 30, y + 24);
      x.strokeStyle = 'rgba(200,210,255,.35)'; x.strokeRect(140, y + 6, 400 * plan, 24);
      x.fillStyle = bad ? (Math.floor(now / 220) % 2 ? '#ff2a4a' : '#7a0f22') : hex(v.r.color);
      x.fillRect(140, y + 6, 400 * act * (bad ? 0.62 : 1), 24);
      x.fillStyle = bad ? '#ff2a4a' : '#45ff9a'; x.font = `600 15px ${FONT}`; x.fillText(bad ? T.skip : T.ok, 560, y + 24);
    });
    if (alarm) {
      const on = Math.floor(now / 300) % 2;
      x.fillStyle = on ? '#ff2a4a' : '#3a0812'; x.fillRect(0, h - 92, w, 92);
      x.fillStyle = on ? '#000' : '#ff2a4a'; x.font = `800 30px ${DISP}`; x.fillText(`⚠ PLS-C · ${T.skip} · ${T.zone} 07`, 28, h - 34);
    }
    dash.t.needsUpdate = true;
  }

  /* ---------------------------------------------------------------- 02 · sync — HQ ⇄ Pansis data bridge */
  add(new THREE.Mesh(box(pansis.w + 1, 6, pansis.d + 1), glow(0xffb347)), pansis.x, pansis.h + 3, pansis.z);
  add(label('PANSIS · ERP', '#ffb347', 12), pansis.x, pansis.h + 26, pansis.z);
  const pA = V(hq.cx, hqTop + 8, hq.cz), pB = V(pansis.x, pansis.h + 8, pansis.z);
  const curve = new THREE.CatmullRomCurve3([pA, V((pA.x * 2 + pB.x) / 3, hqTop + 150, (pA.z * 2 + pB.z) / 3), V((pA.x + pB.x * 2) / 3, hqTop + 150, (pA.z + pB.z * 2) / 3), pB]);
  add(new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 3, 8), glow(0x4cf2ff, 0.12)));
  add(new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.6, 6), glow(0x9ff6ff, 0.5)));
  const dlqPos = V(hq.cx + hq.w / 2 + 30, 40, hq.cz + 40);
  add(new THREE.Mesh(box(16, 16, 16), glow(0xff2a4a, 0.25)), dlqPos.x, dlqPos.y, dlqPos.z);
  add(new THREE.Mesh(box(16, 16, 16), new THREE.MeshBasicMaterial({ color: 0xff2a4a, wireframe: true })), dlqPos.x, dlqPos.y, dlqPos.z);
  add(label('DLQ · dead-letter', '#ff2a4a', 12), dlqPos.x, dlqPos.y + 20, dlqPos.z);
  const NP = 12, packets = makeLights(NP + 1);
  for (let i = 0; i < NP + 1; i++) packets.add_(0, -999, 0, i === NP ? 0xff2a4a : (i % 2 ? 0x4cf2ff : 0xffb347), i === NP ? 44 : 22);
  packets.done(); scene.add(packets);
  const retryRing = add(new THREE.Mesh(new THREE.RingGeometry(12, 15, 40), glow(0xff2a4a, 0)));
  const failAt = 0.42, failPt = curve.getPoint(failAt);
  retryRing.position.copy(failPt);

  /* ---------------------------------------------------------------- 02 · dock — import pipeline */
  const belt0 = V(hall.bayX, 1.2, hall.bayZ + 10), belt1 = V(hall.bayX, 1.2, hall.bayZ - 1);
  add(new THREE.Mesh(box(5, 1.2, belt0.z - belt1.z), dark(0x1a1d2e)), hall.bayX, 0.6, (belt0.z + belt1.z) / 2);
  add(new THREE.Mesh(box(0.3, 0.3, belt0.z - belt1.z), glow(0xffb347)), hall.bayX + 2.6, 1.3, (belt0.z + belt1.z) / 2);
  const NC = 9, crateMesh = new THREE.InstancedMesh(box(3.6, 3, 3.6), new THREE.MeshBasicMaterial({ color: 0xffffff }), NC);
  crateMesh.frustumCulled = false;
  const crateCol = [0x2fbf71, 0x3d7bff, 0x2fbf71, 0xffb347];
  for (let i = 0; i < NC; i++) crateMesh.setColorAt(i, new THREE.Color(crateCol[i % 4]));
  scene.add(crateMesh);
  add(label('XLSX · CSV → RQ', '#2fbf71', 6), hall.bayX, 14, hall.bayZ + 6);
  const silo = { x: yard.x0 + 10, z: yard.z1 - 10 };
  add(new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 34, 20, 1, true).translate(0, 17, 0), new THREE.MeshBasicMaterial({ color: 0x3d7bff, wireframe: true, transparent: true, opacity: 0.5 })), silo.x, 0, silo.z);
  const siloFill = add(new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.4, 1, 20).translate(0, 0.5, 0), glow(0x3d7bff, 0.55)), silo.x, 0, silo.z);
  add(label('PostgreSQL · Alembic', '#3d7bff', 6), silo.x, 40, silo.z);
  for (let k = 0; k < 3; k++) person(opsMesh, hall.bayX + (k % 2 ? 5 : -5), 0, hall.bayZ + 2 + k * 3, k % 2 ? -Math.PI / 2 : Math.PI / 2, { idle: 1 });

  /* ---------------------------------------------------------------- 02 · edge — street camera CAM-07 */
  const zE = edgeWin.line, xA = edgeWin.a, xB = edgeWin.b;
  const camPos = V(xs[mi + 1] - 16, 12, zE - HW - 2), camLook = V(xs[mi - 2], 1, zE + 4);
  add(new THREE.Mesh(box(1, 12, 1).translate(0, 6, 0), dark(0x222538)), camPos.x + 1, 0, camPos.z - 1.5);
  const peds = [];
  for (let k = 0, n = MOBILE ? 46 : 92; k < n; k++) {
    const side = k % 2 ? 1 : -1, near = k < n * 0.7;
    const line = near ? zE : zs[mi + 1 + (k % 2)];
    const p = person(civMesh, xA + rand() * (xB - xA), 0, line + side * (HW + 2.5 + rand() * 1.5), 0, { walk: { a0: xA, a1: xB, v: (1.1 + rand() * 0.8) * (rand() < 0.5 ? 1 : -1) }, conf: 0.78 + rand() * 0.2 });
    if (near) peds.push(p);
  }

  /* ---------------------------------------------------------------- the hall under the ops yard */
  const H = { x: yard.cx, z: yard.cz }, FL = -46, CE = -8, HX = 92, HZ = 60;
  const hs = Math.max(18, Math.min(34, yard.w - 10, yard.d - 10));
  const hatchRect = [H.x - hs / 2, H.z - hs / 2, H.x + hs / 2, H.z + hs / 2];
  const gridTex = (() => {
    const { c, x, t } = canvasTex(256, 256);
    x.fillStyle = '#080a14'; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = 'rgba(76,242,255,.35)'; x.lineWidth = 2; x.strokeRect(0, 0, 256, 256);
    x.strokeStyle = 'rgba(76,242,255,.1)'; x.lineWidth = 1; x.beginPath(); x.moveTo(128, 0); x.lineTo(128, 256); x.moveTo(0, 128); x.lineTo(256, 128); x.stroke();
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(HX / 8, HZ / 8);
    return t;
  })();
  const wallTex = (() => {
    const { c, x, t } = canvasTex(256, 256);
    x.fillStyle = '#0c0f1c'; x.fillRect(0, 0, 256, 256);
    x.fillStyle = '#121628'; x.fillRect(6, 6, 116, 190); x.fillRect(134, 6, 116, 190);
    x.fillStyle = 'rgba(76,242,255,.6)'; x.fillRect(0, 226, 256, 3);
    x.fillStyle = 'rgba(255,179,71,.5)'; for (let i = 0; i < 256; i += 32) x.fillRect(i, 238, 16, 18);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(HX / 16, 1);
    return t;
  })();
  const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, HZ * 2), new THREE.MeshBasicMaterial({ map: gridTex })), H.x, FL, H.z);
  floor.rotation.x = -Math.PI / 2;
  const wallMat = new THREE.MeshBasicMaterial({ map: wallTex });
  [[0, -HZ, 0, HX * 2], [0, HZ, Math.PI, HX * 2], [-HX, 0, Math.PI / 2, HZ * 2], [HX, 0, -Math.PI / 2, HZ * 2]].forEach(([x, z, ry, w]) => {
    const m = add(new THREE.Mesh(new THREE.PlaneGeometry(w, CE - FL), wallMat), H.x + x, (FL + CE) / 2, H.z + z); m.rotation.y = ry;
  });
  const ceilMat = dark(0x07080f);
  [[0, -(HZ + hs / 2) / 2, HX * 2, HZ - hs / 2], [0, (HZ + hs / 2) / 2, HX * 2, HZ - hs / 2], [-(HX + hs / 2) / 2, 0, HX - hs / 2, hs], [(HX + hs / 2) / 2, 0, HX - hs / 2, hs]].forEach(([x, z, w, d]) => {
    const m = add(new THREE.Mesh(new THREE.PlaneGeometry(w, d), ceilMat), H.x + x, CE, H.z + z); m.rotation.x = Math.PI / 2;
  });
  [-44, -22, 22, 44].forEach(z => add(new THREE.Mesh(box(HX * 1.8, 0.4, 0.8), glow(0x9fe7ff)), H.x, CE - 0.6, H.z + z));
  // shaft + hatch
  const hazard = (() => { const { x, t } = canvasTex(128, 128); for (let i = -128; i < 256; i += 32) { x.fillStyle = '#ffb347'; x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 16, 0); x.lineTo(i + 144, 128); x.lineTo(i + 128, 128); x.fill(); } x.globalCompositeOperation = 'destination-over'; x.fillStyle = '#111'; x.fillRect(0, 0, 128, 128); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
  const shaftMat = new THREE.MeshBasicMaterial({ map: hazard, side: THREE.DoubleSide });
  [[0, -hs / 2, 0], [0, hs / 2, Math.PI], [-hs / 2, 0, Math.PI / 2], [hs / 2, 0, -Math.PI / 2]].forEach(([x, z, ry]) => {
    const m = add(new THREE.Mesh(new THREE.PlaneGeometry(hs, -CE), shaftMat), H.x + x, CE / 2, H.z + z); m.rotation.y = ry;
  });
  const doorMat = new THREE.MeshBasicMaterial({ color: 0x1a1d2a });
  const doors = [-1, 1].map(s => add(new THREE.Mesh(box(hs / 2, 1.2, hs), doorMat), H.x + s * hs / 4, 0.6, H.z));
  doors.forEach(d => d.add(new THREE.Mesh(box(hs / 2 - 1, 0.1, 1.2), glow(0xffb347)).translateY(0.65)));
  const rim = makeLights(48);
  for (let k = 0; k < 48; k++) { const a = k / 48, side = Math.floor(a * 4), f = (a * 4) % 1; const px = [-1 + 2 * f, 1, 1 - 2 * f, -1][side] * (hs / 2 + 1.5), pz = [-1, -1 + 2 * f, 1, 1 - 2 * f][side] * (hs / 2 + 1.5); rim.add_(H.x + px, 1, H.z + pz, 0xffb347, 5, (k % 8) / 8); }
  rim.done(); scene.add(rim);
  add(label('OPS YARD · B-2 ↓', '#ffb347', 7), H.x, 20, H.z - hs / 2 - 6);
  person(opsMesh, H.x - hs / 2 - 5, 0, H.z + hs / 2 + 2, 0.4, { idle: 1 });
  person(opsMesh, H.x + hs / 2 + 5, 0, H.z + hs / 2 + 2, -0.4, { idle: 1 });

  /* ---------------------------------------------------------------- 02 · prod — the bunker (west hall) */
  const SVC = [['api', 0x4cf2ff], ['worker', 0x8b7bff], ['postgres', 0x3d7bff], ['redis', 0xff3a4a], ['osrm', 0xffb347], ['web', 0xff3fa4]];
  SVC.forEach(([n, c], k) => {
    const x = H.x - 30 - k * 11;
    add(new THREE.Mesh(box(9, 9, 22).translate(0, 4.5, 0), dark(new THREE.Color(c).multiplyScalar(0.28).getHex())), x, FL, H.z);
    add(new THREE.Mesh(box(9.2, 0.4, 22.2), glow(c)), x, FL + 9, H.z);
    for (let r = 0; r < 5; r++) add(new THREE.Mesh(box(9.3, 0.15, 0.3), glow(c, 0.6)), x, FL + 1.5 + r * 1.6, H.z + 11.1);
    add(label(n, hex(c), 3.4), x, FL + 12, H.z + 6);
  });
  const leds = makeLights(260);
  [-1, 1].forEach(side => {
    for (let k = 0; k < 8; k++) {
      const x = H.x - 26 - k * 8, z = H.z + side * 30;
      add(new THREE.Mesh(box(6, 20, 8).translate(0, 10, 0), dark(0x0d1020)), x, FL, z);
      for (let l = 0; l < 14; l++) leds.add_(x + (rand() - 0.5) * 4.6, FL + 2 + rand() * 16, z - side * 4.1, rand() < 0.7 ? 0x45ff9a : 0x4cf2ff, 0.35, rand());
    }
  });
  leds.done(); scene.add(leds);
  // nginx gate + TLS + rate limiting
  const gx = H.x - 18;
  [-9, 9].forEach(dz => add(new THREE.Mesh(box(2, 16, 2).translate(0, 8, 0), dark(0x161a2c)), gx, FL, H.z + dz));
  add(new THREE.Mesh(box(2.4, 2, 20), glow(0x45ff9a)), gx, FL + 16, H.z);
  add(label('nginx · TLS · rate limit', '#45ff9a', 3.4), gx, FL + 20, H.z);
  const NQ = 24, reqs = makeLights(NQ), reqState = [];
  for (let i = 0; i < NQ; i++) { reqs.add_(0, -999, 0, 0x9ff6ff, 1.4); reqState.push({ t: rand(), k: i % SVC.length, bad: i % 7 === 3 }); }
  reqs.done(); scene.add(reqs);
  const ciLights = makeLights(16);
  for (let i = 0; i < 16; i++) ciLights.add_(0, -999, 0, 0x8b7bff, 1.6);
  ciLights.done(); scene.add(ciLights);
  add(new THREE.Mesh(box(70, 0.6, 3), dark(0x1a1d2e)), H.x - 50, FL + 0.3, H.z + 44);
  add(label('CI/CD · GitHub Actions', '#8b7bff', 3.4), H.x - 50, FL + 6, H.z + 44);
  for (let k = 0; k < 3; k++) person(opsMesh, H.x - 30 - k * 18, FL, H.z + 20, Math.PI, { idle: 1 });

  /* ---------------------------------------------------------------- 03 — command center (east hall) */
  // wall screen: live ops map, or the academy feed
  const wall = canvasTex(1024, 384, 1.5, true);
  const wallScreen = add(new THREE.Mesh(new THREE.PlaneGeometry(84, 31.5), new THREE.MeshBasicMaterial({ map: wall.t, toneMapped: false })), H.x + HX - 0.5, FL + 20, H.z);
  wallScreen.rotation.y = -Math.PI / 2;
  // the academy feed renders straight into a multisampled target shown on the wall (no read-back)
  const rt = new THREE.WebGLRenderTarget(MOBILE ? 640 : 960, MOBILE ? 240 : 360, { samples: MOBILE ? 0 : 2 });
  const rtCam = new THREE.PerspectiveCamera(46, 1280 / 480, 2, 3000);
  const wallOver = canvasTex(1024, 384, 1.5, true);
  const overM = add(new THREE.Mesh(new THREE.PlaneGeometry(84, 31.5), new THREE.MeshBasicMaterial({ map: wallOver.t, transparent: true, toneMapped: false, depthWrite: false })), H.x + HX - 0.9, FL + 20, H.z);
  overM.rotation.y = -Math.PI / 2;
  // consoles in an arc facing the wall, an operator at each
  const conTex = canvasTex(256, 160, 1, true);
  for (let k = 0; k < 6; k++) {
    const a = (k / 5 - 0.5) * 1.6, r = 24, cx = H.x + 48 - Math.cos(a) * r, cz = H.z + Math.sin(a) * r * 1.4;
    const g = new THREE.Group(); g.position.set(cx, FL, cz); g.rotation.y = -Math.PI / 2 - a * 0.9;
    const desk = new THREE.Mesh(box(9, 3.4, 4).translate(0, 1.7, 0), dark(0x141829)); g.add(desk);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(8, 4.4), new THREE.MeshBasicMaterial({ map: conTex.t, toneMapped: false })); scr.position.set(0, 6, -1.2); scr.rotation.x = -0.25; scr.rotation.y = Math.PI; g.add(scr);
    scene.add(g);
    const wpos = new THREE.Vector3(0, 0, 3.4).applyEuler(g.rotation).add(g.position);
    person(opsMesh, wpos.x, FL - 1.2, wpos.z, g.rotation.y + Math.PI, { idle: 0.4 });
  }
  const commander = person(opsMesh, H.x + 70, FL, H.z - 12, -Math.PI / 2, { idle: 1, turn: 1 });
  person(opsMesh, H.x + 66, FL, H.z + 16, -Math.PI / 2 - 0.4, { idle: 1 });
  // comms console: your seat
  const comms = new THREE.Group(); comms.position.set(H.x + 33, FL, H.z);
  comms.add(new THREE.Mesh(box(4, 7, 12).translate(0, 3.5, 0), dark(0x141829)));
  const commsScr = new THREE.Mesh(new THREE.PlaneGeometry(10, 5.6), dark(0x03140b)); commsScr.position.set(-1.2, 8.6, 0); commsScr.rotation.y = -Math.PI / 2; commsScr.rotation.x = 0; comms.add(commsScr);
  comms.add(new THREE.Mesh(box(0.2, 5.8, 10.2), glow(0x45ff9a)).translateX(-1.1).translateY(8.6));
  scene.add(comms);
  // lockers (north wall): one per skill group, the items written inside
  const GROUPS = E.skills;
  const lockers = GROUPS.map((g, k) => {
    const c = ACC[k], x = H.x + 22 + k * 19, z = H.z - HZ + 4;
    add(new THREE.Mesh(box(16, 25, 7).translate(0, 12.5, 0), dark(0x111526)), x, FL, z);
    const inside = canvasTex(256, 400);
    const back = add(new THREE.Mesh(new THREE.PlaneGeometry(14, 22), new THREE.MeshBasicMaterial({ map: inside.t, toneMapped: false })), x, FL + 12.5, z + 3.55);
    const hinge = new THREE.Group(); hinge.position.set(x - 7.5, FL + 12.5, z + 3.9);
    const door = new THREE.Mesh(box(15, 23.6, 0.6), dark(0x1b2034)); door.position.x = 7.5; hinge.add(door);
    door.add(new THREE.Mesh(box(0.5, 18, 0.2), glow(c)).translateX(5.8).translateZ(0.4));
    scene.add(hinge);
    const draw = () => {
      const { x: X } = inside;
      X.fillStyle = '#05070f'; X.fillRect(0, 0, 256, 400);
      X.fillStyle = hex(c); X.fillRect(0, 0, 256, 46);
      X.fillStyle = '#000'; X.font = `800 22px ${FONT}`; X.fillText(L().system.skills.short[g.id], 14, 31);
      X.font = `500 17px ${FONT}`;
      g.items.forEach((it, i) => { X.fillStyle = i % 2 ? 'rgba(220,225,255,.8)' : '#fff'; X.fillText('▸ ' + E.pick(it), 12, 78 + i * 26); });
      inside.t.needsUpdate = true;
    };
    draw(); relabels.push(draw);
    return { hinge, open: 0, focus: 0, x, z };
  });
  // mission board (south wall): certificates as badges
  const board = canvasTex(1024, 384, 1.5, true);
  const boardM = add(new THREE.Mesh(new THREE.PlaneGeometry(64, 24), new THREE.MeshBasicMaterial({ map: board.t, toneMapped: false })), H.x + 47, FL + 16, H.z + HZ - 0.5);
  boardM.rotation.y = Math.PI;
  let badgesLit = 0;
  function drawBoard() {
    const { x, c } = board, w = c.lw, h = c.lh, CE2 = L().system.certs;
    x.fillStyle = '#05070f'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#ffb347'; x.font = `800 28px ${DISP}`; x.fillText(CE2.label, 28, 50);
    CE2.items.forEach((it, i) => {
      const cx = 180 + i * 330, cy = 200, lit = i < badgesLit;
      x.save(); x.translate(cx, cy);
      x.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 - Math.PI / 2; x.lineTo(Math.cos(a) * 82, Math.sin(a) * 82); } x.closePath();
      x.fillStyle = lit ? 'rgba(255,179,71,.18)' : 'rgba(255,255,255,.03)'; x.fill();
      x.lineWidth = 5; x.strokeStyle = lit ? '#ffb347' : 'rgba(255,255,255,.15)'; x.shadowColor = '#ffb347'; x.shadowBlur = lit ? 24 : 0; x.stroke();
      x.shadowBlur = 0; x.fillStyle = lit ? '#fff' : 'rgba(255,255,255,.3)'; x.font = `800 46px ${DISP}`; x.textAlign = 'center'; x.fillText(lit ? '✓' : '?', 0, 16);
      x.restore();
      x.textAlign = 'center'; x.font = `600 17px ${FONT}`; x.fillStyle = lit ? '#fff' : 'rgba(255,255,255,.3)';
      x.fillText(it.issuer.length > 26 ? it.issuer.slice(0, 25) + '…' : it.issuer, cx, 318); x.textAlign = 'left';
    });
    board.t.needsUpdate = true;
  }
  relabels.push(drawBoard);

  // academy: a riverside campus the wall screen can watch
  const campus = { x: xs[10] || 200, z: river[1] + 120 };
  const CAMPUS = [[0, 0, 64, 18, 26], [-48, 20, 24, 14, 42], [48, 20, 24, 14, 42], [0, 44, 74, 10, 16], [-30, -34, 20, 24, 18], [30, -34, 20, 24, 18]];
  const cm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), facadeMat, CAMPUS.length);
  CAMPUS.forEach(([dx, dz, w, h, d], i) => cm.setMatrixAt(i, M4.compose(P.set(campus.x + dx, 0, campus.z + dz), Q.identity(), SC.set(w, h, d))));
  scene.add(cm);
  CAMPUS.forEach(([dx, dz, w, h, d]) => add(new THREE.Mesh(box(w + 0.4, 0.5, d + 0.4), glow(0x8b7bff)), campus.x + dx, h, campus.z + dz));
  add(new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x8b7bff, wireframe: true })), campus.x, 12, campus.z);
  const lawn = add(new THREE.Mesh(new THREE.PlaneGeometry(150, 100), dark(0x0c2418)), campus.x, 0.2, campus.z + 10); lawn.rotation.x = -Math.PI / 2;
  add(label('KGTÜ · BİLGİSAYAR MÜHENDİSLİĞİ', '#b8adff', 7), campus.x, 36, campus.z);
  const campusLamps = makeLights(40);
  for (let k = 0; k < 40; k++) campusLamps.add_(campus.x - 70 + (k % 10) * 15, 5, campus.z - 30 + Math.floor(k / 10) * 25, 0xfff0d8, 4);
  campusLamps.done(); scene.add(campusLamps);

  function drawWall(now, mode) {
    const { x, c } = wall, w = c.lw, h = c.lh;
    x.fillStyle = '#04060f'; x.fillRect(0, 0, w, h);
    const o = wallOver.x;
    o.clearRect(0, 0, w, h);
    wallScreen.material.map = mode === 'feed' ? rt.texture : wall.t;
    if (mode === 'feed') {
      o.fillStyle = 'rgba(4,6,15,.6)'; o.fillRect(0, 0, w, 50);
      o.fillStyle = '#b8adff'; o.font = `800 24px ${DISP}`; o.fillText(L().system.edu.school.toUpperCase(), 22, 34);
      o.fillStyle = Math.floor(now / 500) % 2 ? '#ff3b3b' : 'rgba(255,59,59,.3)'; o.beginPath(); o.arc(w - 40, 25, 8, 0, 7); o.fill();
      o.fillStyle = 'rgba(4,6,15,.72)'; o.fillRect(w - 250, h - 210, 228, 188);
      o.lineWidth = 12; o.strokeStyle = 'rgba(255,255,255,.14)'; o.beginPath(); o.arc(w - 136, h - 110, 64, Math.PI * 0.75, Math.PI * 2.25); o.stroke();
      o.strokeStyle = '#8b7bff'; o.beginPath(); o.arc(w - 136, h - 110, 64, Math.PI * 0.75, Math.PI * (0.75 + 1.5 * 3.08 / 4)); o.stroke();
      o.fillStyle = '#fff'; o.font = `800 32px ${DISP}`; o.textAlign = 'center'; o.fillText('3.08', w - 136, h - 102); o.font = `500 13px ${FONT}`; o.fillText(`/ 4.00 ${L().system.edu.gpa}`, w - 136, h - 78); o.textAlign = 'left';
      wallOver.t.needsUpdate = true;
      return;
    }
    wallOver.t.needsUpdate = true;
    {
      x.strokeStyle = 'rgba(76,242,255,.12)';
      xs.forEach(v => { const [a] = mapPt(w, h, v, 0, 30); x.beginPath(); x.moveTo(a, 0); x.lineTo(a, h); x.stroke(); });
      zs.forEach(v => { const [, b] = mapPt(w, h, 0, v, 30); x.beginPath(); x.moveTo(0, b); x.lineTo(w, b); x.stroke(); });
      routes.forEach(r => { x.strokeStyle = hex(r.color); x.globalAlpha = 0.7; x.lineWidth = 3; x.beginPath(); r.path.forEach((p, i) => { const [a, b] = mapPt(w, h, p.x, p.z, 30); i ? x.lineTo(a, b) : x.moveTo(a, b); }); x.stroke(); });
      x.globalAlpha = 1;
      vans.forEach(v => { const [a, b] = mapPt(w, h, v.van.position.x, v.van.position.z, 30); x.fillStyle = hex(v.r.color); x.shadowColor = hex(v.r.color); x.shadowBlur = 16; x.beginPath(); x.arc(a, b, 8, 0, 7); x.fill(); });
      x.shadowBlur = 0;
      x.fillStyle = '#4cf2ff'; x.font = `800 24px ${DISP}`; x.fillText('OPS · KONYA', 22, 40);
      x.font = `500 15px ${FONT}`; x.fillStyle = 'rgba(200,210,255,.7)'; x.fillText(new Date().toLocaleTimeString('tr-TR'), 22, 66);
    }
    wall.t.needsUpdate = true;
  }
  function renderFeed(clock) {
    const a = clock * 0.1;
    rtCam.position.set(campus.x + Math.cos(a) * 120, 52, campus.z + 10 + Math.sin(a) * 120);
    rtCam.lookAt(campus.x, 10, campus.z + 10);
    const was = cab.visible; cab.visible = false;
    E.fogFrom && E.fogFrom(rtCam.position);
    renderer.setRenderTarget(rt); renderer.render(scene, rtCam); renderer.setRenderTarget(null);
    E.fogFrom && E.fogFrom(camera.position);
    cab.visible = was;
  }
  function drawConsoles(now) {
    const { x } = conTex;
    x.fillStyle = '#03100a'; x.fillRect(0, 0, 256, 160);
    x.font = `12px ${FONT}`;
    for (let i = 0; i < 10; i++) { x.fillStyle = i === 9 ? '#b6ffd2' : 'rgba(57,255,136,.7)'; x.fillText(((now / 97 + i * 7919) % 99999).toFixed(0).padStart(5, '0') + ' ' + '▮'.repeat(1 + ((i * 13 + now / 300) % 9 | 0)), 8, 16 + i * 15); }
    conTex.t.needsUpdate = true;
  }

  /* ---------------------------------------------------------------- shots */
  const hall0 = V(hall.cx, roofY, hall.cz);
  const shots = {
    w0: (t, o) => { const a = 0.9 + t * 0.02; o.p.set(hq.cx + Math.cos(a) * 470, 300, hq.cz + Math.sin(a) * 470); o.l.set(hq.cx - 120, 150, hq.cz - 140); },
    brief: (t, o) => { const a = Math.sin(t * 0.15) * 0.3; o.p.set(hall0.x + Math.cos(a) * 44, roofY + 30, hall0.z + Math.sin(a) * 44); o.l.set(hall0.x - 4, roofY + 5, hall0.z); },
    cab: (t, o) => {
      const p = vanA.van.position, cx = Math.cos(vanA.yaw), cz = Math.sin(vanA.yaw);
      o.p.set(p.x + cx * 1.2, 3.6, p.z + cz * 1.2); o.l.set(p.x + cx * 60, 2.4, p.z + cz * 60);
    },
    hq: (t, o) => { o.p.set(hq.cx + 26 + Math.sin(t * 0.2) * 10, facadeY - 8, hq.cz + hq.d / 2 + facadeH * 1.15); o.l.set(hq.cx, facadeY, hq.cz + hq.d / 2); },
    roles: (t, o) => { o.p.set(hq.cx + 300, hq.h * 0.6, hq.cz + 300); o.l.set(hq.cx - 70, hq.h * 0.48, hq.cz + 70); },
    sync: (t, o) => { const m = curve.getPoint(0.36); o.p.set(hq.cx + 230, hqTop + 120, hq.cz - 190); o.l.set(m.x + 130, m.y - 150, m.z + 80); },
    dock: (t, o) => { o.p.set(hall.bayX + 26, 52, hall.bayZ + 34); o.l.set(hall.bayX - 14, 0, hall.bayZ + 4); },
    edge: (t, o) => { o.p.copy(camPos); o.l.copy(camLook); o.l.x += Math.sin(t * 0.3) * 8; },
    prod: (t, o) => { o.p.set(H.x + 4, FL + 26, H.z + 54); o.l.set(H.x - 84, FL + 6, H.z - 14); },
    s0: (t, o) => { o.p.set(H.x + 4, FL + 24, H.z + 40); o.l.set(H.x + 80, FL + 8, H.z - 16); },
    skills: (t, o) => { o.p.set(H.x + 26, FL + 18, H.z + 34); o.l.set(H.x + 26, FL + 12, H.z - HZ); },
    edu: (t, o) => { o.p.set(H.x + 18, FL + 19, H.z + 24); o.l.set(H.x + HX, FL + 19, H.z + 24); },
    certs: (t, o) => { o.p.set(H.x + 67, FL + 16, H.z - 30); o.l.set(H.x + 67, FL + 16, H.z + HZ); },
    term: (t, o) => { o.p.set(H.x + 22, FL + 10.5, H.z); o.l.set(H.x + 34, FL + 8.4, H.z); },
    out: (t, o) => { const a = 1.9 + t * 0.015; o.p.set(Math.cos(a) * 900, 1400, Math.sin(a) * 900 + 300); o.l.set(0, 0, 160); }
  };
  // the hatch: underground shots pass through it (city.js routes the camera via this point)
  const hatchPt = V(H.x, 4, H.z);

  /* ---------------------------------------------------------------- anchors for the leader line */
  const tmpV = V(0, 0, 0);
  const anchors = {
    hq: () => tmpV.set(hq.cx, hqTop * 0.8, hq.cz + hq.d / 2),
    table: () => tmpV.set(hall0.x, roofY + 8, hall0.z),
    phone: () => phoneM.getWorldPosition(tmpV),
    screen: () => tmpV.set(hq.cx - facadeW * 0.3, facadeY - facadeH * 0.38, hq.cz + hq.d / 2),
    roles: () => tmpV.set(hq.cx + hq.w / 2, hq.h * 0.45, hq.cz + hq.d / 2),
    dlq: () => tmpV.copy(dlqPos),
    silo: () => tmpV.set(belt0.x, 4, (belt0.z + belt1.z) / 2),
    cam: () => tmpV.set(camLook.x + 30, 3, camLook.z),
    rack: () => tmpV.set(H.x - 52, FL + 10, H.z + 11),
    console: () => tmpV.set(commander.x, FL + 4.2, commander.z),
    locker: () => tmpV.set(lockers[1].x, FL + 18, lockers[1].z + 4),
    wall: () => tmpV.set(H.x + HX - 1, FL + 10, H.z - 20),
    badges: () => tmpV.set(H.x + 47, FL + 16, H.z + HZ - 1)
  };

  /* ---------------------------------------------------------------- per-frame */
  const st = { act: null, at: 0, fired: {}, lastDraw: 0, lastFeed: 0, dockRows: 0, syncPh: 0, lockerFocus: -1 };
  addEventListener('op:locker', e => { st.lockerFocus = e.detail; });
  const ev = (name, vars) => { if (st.fired[name] === st.visit) return; st.fired[name] = st.visit; fire(name, vars); };

  function update(dt, clock, now, w, active, sinceActive) {
    if (active !== st.act) { st.act = active; st.visit = (st.visit || 0) + 1; if (active === 'certs') badgesLit = 0; if (active === 'hq') alarmT = -1; }
    const t = sinceActive, near = n => (w[n] || 0) > 0.02;

    // people
    for (const p of people_) {
      p.ph += dt;
      let ry = p.ry;
      if (p.walk) {
        p.x += p.walk.v * HS * dt;
        if (p.x > p.walk.a1) p.x = p.walk.a0; else if (p.x < p.walk.a0) p.x = p.walk.a1;
        ry = p.walk.v > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else if (p.idle) {
        ry += Math.sin(p.ph * 0.5) * 0.12 * p.idle;
        if (p.turn && active === 's0') ry = p.ry + Math.min(1, t * 2) * (Math.PI * 0.9);
      }
      EU.set(0, ry, 0);
      p.mesh.setMatrixAt(p.i, M4.compose(P.set(p.x, p.y, p.z), Q.setFromEuler(EU), SC.set(1, 1, 1)));
    }
    opsMesh.instanceMatrix.needsUpdate = true; civMesh.instanceMatrix.needsUpdate = true;
    people.tick(clock, camera, scene.fog);

    // the hatch opens for everything from the bunker on
    const under = ['prod', 's0', 'skills', 'edu', 'certs', 'term'].reduce((s, n) => s + (w[n] || 0), 0) + (w.edge || 0) * 0.6 + (w.out || 0) * 0.6;
    st.hatch = (st.hatch || 0) + (Math.min(1, under * 3) - (st.hatch || 0)) * Math.min(1, dt * 3);
    doors[0].position.x = H.x - hs / 4 - st.hatch * (hs / 2 + 1); doors[1].position.x = H.x + hs / 4 + st.hatch * (hs / 2 + 1);

    // cab
    cab.visible = (w.cab || 0) > 0.88;
    vanA.halo.visible = vanA.van.visible && !cab.visible;
    const drawTick = now - st.lastDraw > 140, slowTick = now - (st.lastSlow || 0) > 260;
    if (slowTick) st.lastSlow = now;
    engine(dt);
    if (cab.visible && drawTick) {
      const done = drawPhone(now);
      if (active === 'cab' && t > 0.4) ev('cab', { k: done, n: vanA.stopTs.length, m: Math.min(vanA.stopTs.length, done + 1) });
      lastDone = done;
      E.gauges && E.gauges(eng, `${L().op.phone.next.toUpperCase()} · ${Math.min(vanA.stopTs.length, done + 1)}/${vanA.stopTs.length}`, vanA.dwell > 0 ? L().op.phone.taking.toUpperCase() : '');
    }
    document.documentElement.classList.toggle('in-cab', cab.visible);

    // events + set pieces per shot
    if (active === 'w0' && t > 0.25) ev('w0', {});
    if (near('brief') && drawTick) drawHolo(active === 'brief' ? (t * 1.4) % 7 : 9);
    if (active === 'brief' && t > 1.0) ev('brief', { s: routes.reduce((n, r) => n + r.stops.length, 0), r: routes.length });
    holoBeam.material.opacity = 0.06 + 0.04 * Math.sin(clock * 3);
    if (active === 'hq' && t > 0.35 && alarmT < 0) { alarmT = clock; ev('hq', {}); window.Sound && window.Sound.blip(220); }
    if (((w.hq || 0) + (w.w0 || 0) + (w.roles || 0)) > 0.3 && slowTick) drawDash(now, clock);
    rankBands.forEach((b, k) => {
      const on = active === 'roles' ? Math.max(0, Math.min(1, (t - k * 0.15) * 4)) : 0;
      b.m.material.opacity += (on * (0.22 + 0.08 * Math.sin(clock * 4 + k)) - b.m.material.opacity) * Math.min(1, dt * 4);
      b.s.material.opacity += (on - b.s.material.opacity) * Math.min(1, dt * 4);
    });
    if (active === 'roles' && t > 0.6) ev('roles', {});

    // sync: packets stream; one fails, retries, drops into the dead-letter queue
    const pk = packets.geometry.attributes.position;
    for (let i = 0; i < NP; i++) { const u = (clock * 0.11 + i / NP) % 1, q = curve.getPoint(u); pk.setXYZ(i, q.x, q.y, q.z); }
    let fail = { x: 0, y: -999, z: 0 }, ring = 0;
    if (near('sync')) {
      const s = active === 'sync' ? t : 0;
      const c = active === 'sync' ? s % 6 : 9;   // the failure replays every few seconds
      if (c < 0.5) fail = curve.getPoint(failAt * (c / 0.5));
      else if (c < 1.45) { fail = failPt; const r1 = [0.5, 0.8, 1.15].map(v => c - v).filter(v => v >= 0 && v < 0.35); ring = r1.length ? r1[0] / 0.35 : 0; }
      else if (c < 1.95) { const f = (c - 1.45) / 0.5; fail = { x: failPt.x + (dlqPos.x - failPt.x) * f, y: failPt.y + (dlqPos.y - failPt.y) * f * f, z: failPt.z + (dlqPos.z - failPt.z) * f }; }
      else fail = dlqPos;
      if (active === 'sync' && s > 0.3) ev('sync', { n: 4127 });
    }
    pk.setXYZ(NP, fail.x, fail.y, fail.z); pk.needsUpdate = true;
    retryRing.material.opacity = ring ? (1 - ring) * 0.9 : 0;
    retryRing.scale.setScalar(1 + ring * 3);
    retryRing.lookAt(camera.position);

    // dock: crates ride the belt into the bay; the silo fills
    for (let i = 0; i < NC; i++) {
      const u = (clock * 0.12 + i / NC) % 1;
      crateMesh.setMatrixAt(i, M4.compose(P.set(belt0.x, 2.7, belt0.z + (belt1.z - belt0.z) * u), Q.identity(), SC.set(1, 1, 1)));
    }
    crateMesh.instanceMatrix.needsUpdate = true;
    if (active === 'dock') st.dockRows += dt * 1873;
    siloFill.scale.y = 6 + 26 * ((clock * 0.05) % 1);
    if (active === 'dock' && t > 0.4) ev('dock', { n: Math.round(st.dockRows).toLocaleString() });

    // edge camera overlay
    if (active === 'edge' && t > 0.3) ev('edge', { n: E.detections ? E.detections.length : 0 });

    // bunker: requests through the gate; a few get rate-limited
    const rq = reqs.geometry.attributes.position, ci = ciLights.geometry.attributes.position;
    if (near('prod') || near('s0')) {
      reqState.forEach((r, i) => {
        r.t = (r.t + dt * 0.35) % 1;
        const tx = H.x - 30 - r.k * 11;
        let x, y = FL + 3, z;
        if (r.t < 0.4) { const f = r.t / 0.4; x = H.x + (gx - H.x) * f; z = H.z + Math.sin(i) * 6 * (1 - f); y = FL + 3 + (CE - FL - 6) * (1 - f) * (1 - f); }
        else if (r.bad) { const f = (r.t - 0.4) / 0.6; x = gx + 6 * Math.sin(f * 3.14); z = H.z + Math.sin(i) * 3; y = FL + 3 - f * 2; }
        else { const f = (r.t - 0.4) / 0.6; x = gx + (tx - gx) * f; z = H.z + Math.sin(i) * 3 * (1 - f); }
        rq.setXYZ(i, x, y, z);
      });
      for (let i = 0; i < 16; i++) { const u = (clock * 0.2 + i / 16) % 1; ci.setXYZ(i, H.x - 15 - u * 70, FL + 1.2, H.z + 44); }
      rq.needsUpdate = true; ci.needsUpdate = true;
      if (active === 'prod' && t > 0.3) ev('prod', { n: SVC.length });
    }
    if (active === 's0' && t > 0.3) ev('s0', {});

    // lockers swing open; the focused one (from the card tabs) opens wider
    lockers.forEach((lk, k) => {
      const target = active === 'skills' ? Math.max(0, Math.min(1, (t - k * 0.1) * 3)) * (st.lockerFocus === -1 || st.lockerFocus === k ? 1 : 0.35) : (near('skills') ? 0.2 : 0);
      lk.open += (target - lk.open) * Math.min(1, dt * 4);
      lk.hinge.rotation.y = -lk.open * 1.95;
    });
    if (active === 'skills' && t > 0.4) ev('skills', { n: GROUPS.reduce((n, g) => n + g.items.length, 0) });

    // wall screen: map, or the academy feed during the academy shot (the feed itself at ~12 fps)
    if ((w.edu || 0) > 0.3 && now - st.lastFeed > 80) { st.lastFeed = now; renderFeed(clock); }
    if (((w.s0 || 0) + (w.edu || 0) + (w.skills || 0) + (w.certs || 0) + (w.term || 0)) > 0.3 && slowTick) {
      drawWall(now, (w.edu || 0) > 0.3 ? 'feed' : 'map');
      drawConsoles(now);
    }
    if (active === 'edu' && t > 0.35) ev('edu', {});
    if (active === 'certs') {
      const lit = Math.min(3, Math.floor(t / 0.2) + 1);
      if (lit !== badgesLit) { badgesLit = lit; drawBoard(); window.Sound && window.Sound.blip(700 + lit * 120); }
      if (t > 0.5) ev('certs', { n: L().system.certs.items.length });
    } else if (near('certs') && badgesLit === 0 && drawTick) drawBoard();
    if (active === 'term' && t > 0.2) ev('term', {});
    if (active === 'out' && t > 0.2) ev('out', {});
    if (drawTick) st.lastDraw = now;
  }

  /* ---------------------------------------------------------------- street-camera detections */
  const prj = V(0, 0, 0);
  function detect(cam, W, Hh) {
    const out = [];
    const boxOf = (x, z, hw, h, hd) => {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, ok = true;
      for (let k = 0; k < 8; k++) {
        prj.set(x + (k & 1 ? hw : -hw), k & 2 ? h : 0, z + (k & 4 ? hd : -hd)).project(cam);
        if (prj.z > 1) { ok = false; break; }
        const sx = (prj.x + 1) / 2 * W, sy = (1 - prj.y) / 2 * Hh;
        x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
      }
      return ok && x1 > 0 && x0 < W && y1 > 0 && y0 < Hh && (x1 - x0) > 6 ? [x0, y0, x1 - x0, y1 - y0] : null;
    };
    traffic.edgeCars().forEach((c, i) => { const b = boxOf(c.s, c.z, 4.6, 5, 2.3); if (b) out.push({ k: 'car', b, c: 0.86 + ((i * 37) % 13) / 100, d: cam.position.distanceTo(prj.set(c.s, 2, c.z)) }); });
    peds.forEach(p => { if (Math.abs(p.x - cam.position.x) > 260) return; const b = boxOf(p.x, p.z, 0.36 * HS, 1.92 * HS, 0.3 * HS); if (b) out.push({ k: 'person', b, c: p.conf, d: cam.position.distanceTo(prj.set(p.x, 2, p.z)) }); });
    traffic.crossingPeds().forEach((p, i) => { const b = boxOf(p.x, p.z, 0.36 * HS, 1.92 * HS, 0.3 * HS); if (b) out.push({ k: 'person', b, c: 0.8 + (i % 7) / 50, d: cam.position.distanceTo(prj.set(p.x, 2, p.z)) }); });
    return out.sort((a, b) => a.d - b.d).slice(0, 16);
  }

  return {
    shots, anchors, update, detect, hatchPt, hatchRect, layoutCab,
    hatchOpen: () => st.hatch || 0,
    relabel() { relabels.forEach(f => f()); drawBoard(); },
    underground: y => y < -2
  };
}
