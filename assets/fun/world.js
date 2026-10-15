// Builds a map into a Three.js group, plus collision boxes, spawns and a nav grid for bots.
// Static geometry is merged per material, so a whole map is a handful of draw calls,
// and textures are small canvases (LEGO studs are a texture, not geometry).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BODY, hitsAny } from './physics.js';

// ---------------------------------------------------------------- procedural textures
function canvas(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  return c;
}
function toTex(c, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
function speckle(g, s, n, colors, rmax = 2, a = 0.25) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[(Math.random() * colors.length) | 0];
    g.globalAlpha = Math.random() * a;
    const r = Math.random() * rmax + 0.5;
    g.fillRect(Math.random() * s, Math.random() * s, r, r);
  }
  g.globalAlpha = 1;
}
function shade(hex, v) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, v);
  return '#' + c.getHexString();
}
function bricks(g, s, base, mortar, rows, perRow, jitter) {
  g.fillStyle = mortar; g.fillRect(0, 0, s, s);
  const bh = s / rows, bw = s / perRow, m = Math.max(1.5, s / 256);
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? bw / 2 : 0;
    for (let c = -1; c <= perRow; c++) {
      g.fillStyle = shade(base, (Math.random() - 0.5) * jitter);
      g.fillRect(c * bw + off + m, r * bh + m, bw - m * 2, bh - m * 2);
    }
  }
  speckle(g, s, s * 12, ['#000', '#fff'], 1.5, 0.12);
}

const TEX = {
  // 4x4 LEGO studs per tile; white so vertex colours tint it
  stud: { tile: 1.6, make: () => canvas(256, (g, s) => {
    g.fillStyle = '#ececec'; g.fillRect(0, 0, s, s);
    const cell = s / 4;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const cx = (i + 0.5) * cell, cy = (j + 0.5) * cell, r = cell * 0.3;
      g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.arc(cx + r * 0.18, cy + r * 0.24, r * 1.08, 0, 7); g.fill();
      const gr = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#cfcfcf');
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(cx - r * 0.35, cy - r * 0.35, r * 0.22, 0, 7); g.fill();
    }
  }) },
  // brick seams on the sides of LEGO walls: plates of 0.4 m, bricks of 1.2 m
  legoSide: { tile: 2.4, make: () => canvas(256, (g, s) => {
    g.fillStyle = '#f0f0f0'; g.fillRect(0, 0, s, s);
    const rows = 6, bw = s / 2;
    for (let r = 0; r < rows; r++) {
      const y = r * s / rows, off = r % 2 ? bw / 2 : 0;
      g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(0, y, s, 2);
      g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(0, y + 2, s, 2);
      for (let x = off; x < s + bw; x += bw) { g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(x - 1, y, 2, s / rows); }
    }
  }) },
  concrete: { tile: 4, make: () => canvas(256, (g, s) => {
    g.fillStyle = '#6f6c66'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * s, y = Math.random() * s, r = 20 + Math.random() * 60;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(30,26,22,.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
    }
    speckle(g, s, 4000, ['#000', '#fff'], 1.6, 0.2);
    g.fillStyle = 'rgba(20,18,15,.55)'; g.fillRect(0, 0, s, 2); g.fillRect(0, 0, 2, s); g.fillRect(0, s / 2, s, 2); g.fillRect(s / 2, 0, 2, s);
  }) },
  brick: { tile: 2, make: () => canvas(512, (g, s) => bricks(g, s, '#e7e3da', '#c9c3b6', 30, 9, 0.04)) },
  pillar: { tile: 2, make: () => canvas(256, (g, s) => bricks(g, s, '#8c3b26', '#55322a', 30, 9, 0.06)) },
  container: { tile: 1, make: () => canvas(128, (g, s) => {
    g.fillStyle = '#9b2c24'; g.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += s / 8) {
      const gr = g.createLinearGradient(x, 0, x + s / 8, 0);
      gr.addColorStop(0, 'rgba(0,0,0,.25)'); gr.addColorStop(0.5, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(0,0,0,.25)');
      g.fillStyle = gr; g.fillRect(x, 0, s / 8, s);
    }
    speckle(g, s, 300, ['#3a1a10', '#d07050'], 2, 0.3);
  }) },
  crate: { tile: 0, make: () => canvas(256, (g, s) => {
    g.fillStyle = '#a77a4a'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += s / 5) {
      g.fillStyle = `hsl(${28 + Math.random() * 6}, 38%, ${40 + Math.random() * 10}%)`; g.fillRect(0, y, s, s / 5 - 2);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, y + s / 5 - 2, s, 2);
    }
    for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(60,35,15,.18)'; g.beginPath(); const y = Math.random() * s; g.moveTo(0, y); g.bezierCurveTo(s / 3, y + 4, s / 2, y - 4, s, y + 2); g.stroke(); }
    const f = s * 0.09;
    g.save(); g.translate(s / 2, s / 2); g.rotate(Math.PI / 4); g.fillStyle = '#7a5532'; g.fillRect(-s * 0.7, -f * 0.6, s * 1.4, f * 1.2); g.restore();
    g.fillStyle = '#3b3d40';
    g.fillRect(0, 0, s, f); g.fillRect(0, s - f, s, f); g.fillRect(0, 0, f, s); g.fillRect(s - f, 0, f, s);
    g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(0, 0, s, 2); g.fillRect(0, 0, 2, s);
    g.fillStyle = '#1f2022';
    for (const [x, y] of [[f / 2, f / 2], [s - f / 2, f / 2], [f / 2, s - f / 2], [s - f / 2, s - f / 2]]) { g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill(); }
  }) },
  hazard: { tile: 1, make: () => canvas(128, (g, s) => {
    g.fillStyle = '#e8b31a'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#1a1a1a';
    for (let x = -s; x < s * 2; x += s / 2) { g.beginPath(); g.moveTo(x, s); g.lineTo(x + s / 4, s); g.lineTo(x + s / 4 + s, 0); g.lineTo(x + s, 0); g.fill(); }
  }) }
};
const texCache = {};
const tex = k => (texCache[k] ||= toTex(TEX[k].make()));

// ---------------------------------------------------------------- geometry helpers
function worldUV(geo, tile) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i));
    if (ny > 0.5) uv.setXY(i, x / tile, z / tile);
    else if (nx > 0.5) uv.setXY(i, z / tile, y / tile);
    else uv.setXY(i, x / tile, y / tile);
  }
}
function colorize(geo, hex) {
  const c = new THREE.Color(hex || '#ffffff'), n = geo.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}
// split a non-indexed geometry into up-facing triangles and the rest
function splitTop(geo) {
  const pos = geo.attributes.position.array, nor = geo.attributes.normal.array, uv = geo.attributes.uv.array;
  const out = [{ p: [], n: [], u: [] }, { p: [], n: [], u: [] }];
  for (let t = 0; t < pos.length / 9; t++) {
    const o = out[nor[t * 9 + 1] > 0.5 ? 0 : 1];
    for (let k = 0; k < 9; k++) { o.p.push(pos[t * 9 + k]); o.n.push(nor[t * 9 + k]); }
    for (let k = 0; k < 6; k++) o.u.push(uv[t * 6 + k]);
  }
  return out.map(o => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(o.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(o.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(o.u, 2));
    return g;
  });
}
function boxGeo(b) {
  const geo = new THREE.BoxGeometry(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]);
  geo.translate((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2);
  return geo.toNonIndexed();
}
function rampGeo(r) {
  // a wedge rising from (x0, y0) to (x1, y1)
  const { x0, x1, z0, z1, y0, y1 } = r;
  const a = [x0, y0, z0], b = [x0, y0, z1], c = [x1, y1, z1], d = [x1, y1, z0], e = [x1, y0, z0], f = [x1, y0, z1];
  const tris = [];
  const flip = x1 < x0;
  const tri = (p, q, s) => tris.push(...(flip ? [p, s, q] : [p, q, s]));
  tri(a, c, b); tri(a, d, c); // slope
  tri(a, e, d);               // side z0
  tri(b, c, f);               // side z1
  tri(e, f, c); tri(e, c, d); // back
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
  g.computeVertexNormals();
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(tris.length * 2), 2));
  return g;
}

const MAT_DEF = {
  legoTop: env => new THREE.MeshStandardMaterial({ vertexColors: true, map: tex('stud'), roughness: 0.32, envMapIntensity: env * 1.5 }),
  legoSide: env => new THREE.MeshStandardMaterial({ vertexColors: true, map: tex('legoSide'), roughness: 0.32, envMapIntensity: env * 1.5 }),
  concrete: env => new THREE.MeshStandardMaterial({ map: tex('concrete'), roughness: 0.92, envMapIntensity: env }),
  dock: env => new THREE.MeshStandardMaterial({ map: tex('concrete'), color: '#b4aea4', roughness: 0.9, envMapIntensity: env }),
  brick: env => new THREE.MeshStandardMaterial({ map: tex('brick'), roughness: 0.9, envMapIntensity: env }),
  pillar: env => new THREE.MeshStandardMaterial({ map: tex('pillar'), roughness: 0.9, envMapIntensity: env }),
  container: env => new THREE.MeshStandardMaterial({ map: tex('container'), roughness: 0.6, metalness: 0.35, envMapIntensity: env }),
  crate: env => new THREE.MeshStandardMaterial({ map: tex('crate'), roughness: 0.8, envMapIntensity: env }),
  mcrate: env => new THREE.MeshStandardMaterial({ map: tex('crate'), color: '#7d8a96', roughness: 0.65, metalness: 0.25, envMapIntensity: env }),
  hazard: env => new THREE.MeshStandardMaterial({ map: tex('hazard'), roughness: 0.7, envMapIntensity: env }),
  ceiling: () => new THREE.MeshStandardMaterial({ color: '#25221f', roughness: 0.95 }),
  beam: env => new THREE.MeshStandardMaterial({ color: '#34373c', roughness: 0.5, metalness: 0.6, envMapIntensity: env }),
  lampshade: env => new THREE.MeshStandardMaterial({ color: '#2c2f33', roughness: 0.4, metalness: 0.7, envMapIntensity: env }),
  bulb: () => new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff1d0').multiplyScalar(4) }),
  dark: () => new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.6 })
};
const UV_TILE = { concrete: 4, dock: 4, brick: 2, pillar: 2, container: 1, hazard: 1 };
const NO_SHADOW = new Set(['ceiling', 'bulb', 'beam', 'lampshade', 'dark', 'hazard']);

// soft darkening where boxes meet what they stand on (cheap ambient occlusion)
function contactShadows(boxes) {
  const pos = [], col = [];
  const R = 0.6;
  const push = (x, y, z, a) => { pos.push(x, y, z); col.push(0, 0, 0, a); };
  for (const b of boxes) {
    if (b.decor || b.floor || b.mat === 'ceiling') continue;
    const support = boxes.some(o => o !== b && !o.decor && Math.abs(o.max[1] - b.min[1]) < 0.01 && o.min[0] < b.max[0] && o.max[0] > b.min[0] && o.min[2] < b.max[2] && o.max[2] > b.min[2]);
    if (!support) continue;
    const y = b.min[1] + 0.012;
    const a = Math.min(0.5, 0.25 + (b.max[1] - b.min[1]) * 0.06);
    const ix0 = b.min[0], ix1 = b.max[0], iz0 = b.min[2], iz1 = b.max[2];
    const ox0 = ix0 - R, ox1 = ix1 + R, oz0 = iz0 - R, oz1 = iz1 + R;
    const quads = [
      [[ix0, iz0], [ix1, iz0], [ox1, oz0], [ox0, oz0]],
      [[ix1, iz0], [ix1, iz1], [ox1, oz1], [ox1, oz0]],
      [[ix1, iz1], [ix0, iz1], [ox0, oz1], [ox1, oz1]],
      [[ix0, iz1], [ix0, iz0], [ox0, oz0], [ox0, oz1]]
    ];
    for (const [p0, p1, p2, p3] of quads) {
      push(p0[0], y, p0[1], a); push(p2[0], y, p2[1], 0); push(p1[0], y, p1[1], a);
      push(p0[0], y, p0[1], a); push(p3[0], y, p3[1], 0); push(p2[0], y, p2[1], 0);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  mesh.renderOrder = 1;
  return mesh;
}

// warm pools of light under the warehouse lamps (additive quads, no real lights)
function lightPools(boxes) {
  const c = canvas(128, (g, s) => {
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, 'rgba(255,214,150,.55)'); gr.addColorStop(0.5, 'rgba(255,190,120,.18)'); gr.addColorStop(1, 'rgba(255,180,110,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  });
  const geos = [];
  for (const b of boxes) {
    if (b.mat !== 'bulb' || b.min[1] < 5) continue;
    const g = new THREE.PlaneGeometry(6, 6); g.rotateX(-Math.PI / 2); g.translate((b.min[0] + b.max[0]) / 2, 0.02, (b.min[2] + b.max[2]) / 2);
    geos.push(g);
  }
  if (!geos.length) return null;
  const mesh = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshBasicMaterial({ map: toTex(c, false), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.7 }));
  mesh.renderOrder = 2;
  return mesh;
}

// Sky dome: gradient + soft sun; values stay in range so reflections don't blow out.
function skyMaterial(S, sunDir, forEnv = false) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      zenith: { value: new THREE.Color(S.zenith) }, horizon: { value: new THREE.Color(S.horizon) }, groundC: { value: new THREE.Color(S.ground) },
      sunC: { value: new THREE.Color(S.sun) }, sunDir: { value: sunDir.clone() }, sunSize: { value: forEnv ? 0 : 1 }
    },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }',
    fragmentShader: `
      uniform vec3 zenith; uniform vec3 horizon; uniform vec3 groundC; uniform vec3 sunC; uniform vec3 sunDir; uniform float sunSize; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float y = d.y;
        vec3 c = y > 0.0 ? mix(horizon, zenith, pow(smoothstep(0.0, 0.7, y), 0.7)) : mix(horizon, groundC, smoothstep(0.0, 0.08, -y));
        float sd = max(dot(d, normalize(sunDir)), 0.0);
        c += sunC * (pow(sd, 6.0) * 0.12 + pow(sd, 60.0) * 0.25 + smoothstep(0.9993, 0.9997, sd) * 4.0 * sunSize);
        gl_FragColor = vec4(c, 1.0);
      }`
  });
}

// ---------------------------------------------------------------- build
export function buildWorld(def, renderer) {
  const group = new THREE.Group();
  const all = def.boxes.map(a => ({ min: [a[0], a[1], a[2]], max: [a[3], a[4], a[5]], mat: a[6], color: a[7], decor: a[8] === 'decor' }));
  all[0].floor = true;
  // ramps: a sloped mesh to look at, stairs of 20 cm to stand on
  const clips = [];
  for (const r of def.ramps || []) {
    const n = Math.max(2, Math.round((r.y1 - r.y0) / 0.2));
    for (let i = 0; i < n; i++) {
      const xa = r.x0 + (r.x1 - r.x0) * i / n;
      clips.push({ min: [Math.min(xa, r.x1), r.y0, r.z0], max: [Math.max(xa, r.x1), r.y0 + (r.y1 - r.y0) * (i + 0.5) / n, r.z1], mat: r.mat, color: r.color, clip: true });
    }
  }
  const boxes = all.filter(b => !b.decor).concat(clips);
  const env = def.light.env ?? 0.4;

  // merged static meshes, one per material
  const buckets = {};
  const put = (k, g) => (buckets[k] ||= []).push(g);
  for (const b of all) {
    const g = boxGeo(b);
    if (b.mat === 'lego') {
      worldUV(g, TEX.stud.tile);
      const [top, side] = splitTop(g);
      worldUV(side, TEX.legoSide.tile);
      put('legoTop', colorize(top, b.color)); put('legoSide', colorize(side, b.color));
    } else {
      if (UV_TILE[b.mat]) worldUV(g, UV_TILE[b.mat]);
      put(b.mat, g);
    }
  }
  for (const r of def.ramps || []) {
    const [top, side] = splitTop(rampGeo(r));
    worldUV(top, TEX.stud.tile); worldUV(side, TEX.legoSide.tile);
    put('legoTop', colorize(top, r.color)); put('legoSide', colorize(side, r.color));
  }
  for (const [kind, geos] of Object.entries(buckets)) {
    const mat = (MAT_DEF[kind] || MAT_DEF.dark)(env);
    const mesh = new THREE.Mesh(mergeGeometries(geos, false), mat);
    mesh.castShadow = !NO_SHADOW.has(kind);
    mesh.receiveShadow = kind !== 'bulb';
    group.add(mesh);
    geos.forEach(g => g.dispose());
  }
  group.add(contactShadows(all));
  const pools = lightPools(all);
  if (pools) group.add(pools);

  // sky + sun from the same angles so shadows match the sky
  const S = def.sky, L = def.light;
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - S.elevation), THREE.MathUtils.degToRad(S.azimuth));
  if (!def.indoor) {
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), skyMaterial(S, sunDir));
    sky.renderOrder = -10; sky.frustumCulled = false;
    group.add(sky);
  }
  group.add(new THREE.HemisphereLight(L.hemiTop, L.hemiBot, L.hemiI));
  const sun = new THREE.DirectionalLight(L.sun, L.sunI);
  const [bx0, bz0, bx1, bz1] = def.bounds;
  const span = Math.max(bx1 - bx0, bz1 - bz0) / 2 + 3;
  sun.position.copy(sunDir).multiplyScalar(80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 200 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  group.add(sun, sun.target);

  // environment reflections from the same sky (cheap, low resolution)
  let envMap = null;
  if (renderer) {
    const pm = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 24, 12), skyMaterial(S, sunDir, true)));
    envMap = pm.fromScene(envScene, 0.04).texture;
    pm.dispose();
  }
  const fog = new THREE.Fog(S.fog, S.fogNear, S.fogFar);

  const ground = (x, z) => {
    let y = 0;
    for (const b of boxes) if (x > b.min[0] && x < b.max[0] && z > b.min[2] && z < b.max[2] && b.max[1] <= 3 && b.max[1] > y) y = b.max[1];
    return y;
  };
  const spawns = {};
  for (const team of ['T', 'CT']) spawns[team] = def.spawns[team].map(([x, z, yaw]) => ({ p: [x, ground(x, z), z], yaw }));

  // the smallest solid around a point (for coloured impact debris)
  const boxAt = p => {
    let best = boxes[0], bv = Infinity;
    for (const b of boxes) {
      if (p[0] >= b.min[0] - 0.02 && p[0] <= b.max[0] + 0.02 && p[1] >= b.min[1] - 0.02 && p[1] <= b.max[1] + 0.02 && p[2] >= b.min[2] - 0.02 && p[2] <= b.max[2] + 0.02) {
        const v = (b.max[0] - b.min[0]) * (b.max[1] - b.min[1]) * (b.max[2] - b.min[2]);
        if (v < bv) { bv = v; best = b; }
      }
    }
    return best;
  };

  return { group, boxes, spawns, fog, envMap, sun, nav: buildNav(def, boxes, ground), ground, boxAt };
}

// ---------------------------------------------------------------- nav grid for bots
function buildNav(def, boxes, ground) {
  const [x0, z0, x1, z1] = def.bounds;
  const S = 1.2;
  let nodes = [];
  const index = new Map();
  const key = (i, j) => i * 10000 + j;
  for (let i = 0, x = x0 + 0.8; x < x1 - 0.5; i++, x += S) {
    for (let j = 0, z = z0 + 0.8; z < z1 - 0.5; j++, z += S) {
      const y = ground(x, z);
      if (hitsAny(boxes, [x, y + 0.02, z], BODY.h, BODY.r + 0.15)) continue;
      index.set(key(i, j), nodes.length);
      nodes.push({ i, j, p: [x, y, z], n: [] });
    }
  }
  for (const a of nodes) {
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue;
      const bi = index.get(key(a.i + di, a.j + dj));
      if (bi === undefined) continue;
      const b = nodes[bi];
      if (b.p[1] - a.p[1] > BODY.step) continue; // can't climb that; dropping is fine
      const mid = [(a.p[0] + b.p[0]) / 2, Math.max(a.p[1], b.p[1]) + 0.02, (a.p[2] + b.p[2]) / 2];
      if (hitsAny(boxes, mid, BODY.h, BODY.r + 0.05)) continue;
      a.n.push(bi);
    }
  }
  // keep only nodes that can reach, and be reached from, the biggest walkable area,
  // so bots never pick a crate top they can't get onto
  const reach = (adj, s) => { const seen = new Uint8Array(nodes.length); const st = [s]; seen[s] = 1; while (st.length) { const k = st.pop(); for (const nb of adj[k]) if (!seen[nb]) { seen[nb] = 1; st.push(nb); } } return seen; };
  const fwd = nodes.map(n => n.n), rev = nodes.map(() => []);
  nodes.forEach((n, k) => n.n.forEach(nb => rev[nb].push(k)));
  const seed = nodes.reduce((best, n, k) => (n.p[1] === 0 && n.n.length > (nodes[best] ? nodes[best].n.length : -1) ? k : best), 0);
  const a = reach(fwd, seed), b = reach(rev, seed);
  const remap = new Map(), kept = [];
  nodes.forEach((n, k) => { if (a[k] && b[k]) { remap.set(k, kept.length); kept.push(n); } });
  for (const n of kept) n.n = n.n.filter(k => remap.has(k)).map(k => remap.get(k));
  nodes = kept;

  return {
    nodes,
    nearest(p) {
      let bi = -1, bd = Infinity;
      for (let k = 0; k < nodes.length; k++) {
        const n = nodes[k].p;
        const d = (n[0] - p[0]) ** 2 + (n[2] - p[2]) ** 2 + ((n[1] - p[1]) * 3) ** 2;
        if (d < bd) { bd = d; bi = k; }
      }
      return bi;
    },
    path(from, to) {
      if (from < 0 || to < 0) return [];
      const g = new Map([[from, 0]]), came = new Map(), closed = new Set();
      const h = k => Math.hypot(nodes[k].p[0] - nodes[to].p[0], nodes[k].p[2] - nodes[to].p[2]);
      // binary min-heap of [f, node]
      const open = [];
      const push = it => { let i = open.length; open.push(it); while (i) { const p = (i - 1) >> 1; if (open[p][0] <= it[0]) break; open[i] = open[p]; i = p; } open[i] = it; };
      const pop = () => {
        const top = open[0], end = open.pop();
        if (open.length) {
          let i = 0;
          for (;;) {
            const l = i * 2 + 1, r = l + 1;
            let m = -1, mv = end[0];
            if (l < open.length && open[l][0] < mv) { m = l; mv = open[l][0]; }
            if (r < open.length && open[r][0] < mv) m = r;
            if (m < 0) break;
            open[i] = open[m]; i = m;
          }
          open[i] = end;
        }
        return top;
      };
      push([0, from]);
      let guard = 0;
      while (open.length && guard++ < 20000) {
        const [, cur] = pop();
        if (cur === to) {
          const out = [cur]; let c = cur;
          while (came.has(c)) { c = came.get(c); out.push(c); }
          return out.reverse();
        }
        if (closed.has(cur)) continue;
        closed.add(cur);
        for (const nb of nodes[cur].n) {
          const step = Math.hypot(nodes[nb].p[0] - nodes[cur].p[0], nodes[nb].p[2] - nodes[cur].p[2]);
          const ng = g.get(cur) + step;
          if (ng < (g.get(nb) ?? Infinity)) { g.set(nb, ng); came.set(nb, cur); push([ng + h(nb), nb]); }
        }
      }
      return [];
    }
  };
}
