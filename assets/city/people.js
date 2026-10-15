/* People for the operation: one smooth figure (capsules), two looks.
   - civilians: solid, shaded, clothes from the instance colour; legs and arms swing in the vertex shader
   - operators: holograms — fresnel rim, rising scan bands, a faint flicker (the field team's digital twins)
   Each instance carries aAnim = (phase offset, stride frequency, swing amount); 0 swing = standing. */

export function makePeople(THREE) {
  const S = 2.3;    // the city is drawn at roughly twice real scale (vans are 10 units long)

  function merge(list) {
    let pos = [], nor = [], part = [], idx = [], base = 0;
    list.forEach(([g, p]) => {
      const P = g.attributes.position, N = g.attributes.normal;
      for (let i = 0; i < P.count; i++) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(N.getX(i), N.getY(i), N.getZ(i)); part.push(p); }
      const I = g.index;
      if (I) for (let i = 0; i < I.count; i++) idx.push(I.getX(i) + base); else for (let i = 0; i < P.count; i++) idx.push(i + base);
      base += P.count;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
    g.setIndex(idx);
    g.scale(S, S, S);
    return g;
  }
  const cap = (r, l, x, y, z, sx = 1, sz = 1) => new THREE.CapsuleGeometry(r, l, 3, 8).scale(sx, 1, sz).translate(x, y, z);
  // parts: 0 torso · 1/2 legs · 3/4 arms · 5 head/hands (skin) · 6 hair/helmet
  const geo = merge([
    [cap(0.2, 0.36, 0, 1.3, 0, 1.2, 0.75), 0],
    [cap(0.17, 0.08, 0, 0.98, 0, 1.15, 0.8), 1.5],
    [cap(0.085, 0.66, -0.1, 0.5, 0), 1], [cap(0.085, 0.66, 0.1, 0.5, 0), 2],
    [cap(0.062, 0.5, -0.29, 1.22, 0), 3], [cap(0.062, 0.5, 0.29, 1.22, 0), 4],
    [new THREE.SphereGeometry(0.055, 8, 6).translate(-0.29, 0.9, 0.01), 3.5], [new THREE.SphereGeometry(0.055, 8, 6).translate(0.29, 0.9, 0.01), 4.5],
    [cap(0.05, 0.06, 0, 1.6, 0), 5],
    [new THREE.SphereGeometry(0.125, 12, 8).scale(0.92, 1.08, 1).translate(0, 1.76, 0), 5],
    [new THREE.SphereGeometry(0.13, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(0.95, 1, 1.02).translate(0, 1.79, -0.01), 6]
  ]);

  const VS = `
  attribute float aPart; attribute vec3 aAnim;
  uniform float uTime;
  varying vec3 vN; varying vec3 vPos; varying float vPart; varying vec3 vCol; varying float vH;
  vec3 rotX(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(v.x, v.y * c - v.z * s, v.y * s + v.z * c); }
  void main() {
    vec3 p = position, n = normal;
    float ph = uTime * aAnim.y + aAnim.x, sw = sin(ph) * aAnim.z;
    float hip = 0.95 * ${S.toFixed(2)}, sh = 1.47 * ${S.toFixed(2)};
    if (aPart > 0.5 && aPart < 2.5 && aPart != 1.5) { float a = (aPart < 1.25 ? 1.0 : -1.0) * sw * 0.55; p = rotX(p - vec3(0.0, hip, 0.0), a) + vec3(0.0, hip, 0.0); n = rotX(n, a); }
    if (aPart > 2.5 && aPart < 5.0) { float a = (aPart < 4.0 ? -1.0 : 1.0) * sw * 0.45; p = rotX(p - vec3(0.0, sh, 0.0), a) + vec3(0.0, sh, 0.0); n = rotX(n, a); }
    p.y += abs(cos(ph)) * 0.05 * aAnim.z * ${S.toFixed(2)};
    mat4 m = modelMatrix * instanceMatrix;
    vec4 wp = m * vec4(p, 1.0);
    vPos = wp.xyz; vN = normalize(mat3(m) * n); vPart = aPart; vH = position.y / ${S.toFixed(2)};
    #ifdef USE_INSTANCING_COLOR
      vCol = instanceColor;
    #else
      vCol = vec3(0.6);
    #endif
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
  const FOG = `uniform vec3 uFog; uniform vec3 uCam; uniform float uNear; uniform float uFar;
  float fogF(vec3 p) { return smoothstep(uNear, uFar, distance(p, uCam)); }`;
  const civMat = new THREE.ShaderMaterial({
    vertexShader: VS,
    fragmentShader: FOG + `
    varying vec3 vN; varying vec3 vPos; varying float vPart; varying vec3 vCol; varying float vH;
    void main() {
      vec3 n = normalize(vN), v = normalize(uCam - vPos);
      vec3 shirt = vCol, pants = mix(vec3(0.07, 0.08, 0.12), vCol * 0.35, 0.35), skin = vec3(0.74, 0.55, 0.43), hair = vec3(0.09, 0.07, 0.06);
      vec3 base = vPart > 5.5 ? hair : (vPart > 4.75 || (vPart > 3.25 && vPart < 3.75) || vPart > 4.25 ? skin : (vPart > 0.5 && vPart < 2.75 ? pants : shirt));
      if (vPart > 2.75 && vPart < 3.25 || vPart > 3.75 && vPart < 4.25) base = shirt;
      float key = max(dot(n, normalize(vec3(-0.4, 0.8, 0.5))), 0.0), fill = max(dot(n, normalize(vec3(0.6, 0.3, -0.5))), 0.0);
      vec3 col = base * (0.28 + 0.75 * key) + vec3(1.0, 0.62, 0.32) * fill * 0.18 * base + vec3(0.35, 0.45, 0.8) * pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.25;
      gl_FragColor = vec4(mix(col, uFog, fogF(vPos)), 1.0);
    }`,
    uniforms: { uTime: { value: 0 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() }, uNear: { value: 650 }, uFar: { value: 2400 } }
  });
  const holoMat = new THREE.ShaderMaterial({
    vertexShader: VS,
    fragmentShader: FOG + `
    uniform float uTime;
    varying vec3 vN; varying vec3 vPos; varying float vPart; varying vec3 vCol; varying float vH;
    void main() {
      vec3 n = normalize(vN), v = normalize(uCam - vPos);
      float fr = pow(1.0 - abs(dot(n, v)), 2.2);
      float scan = smoothstep(0.82, 1.0, fract(vH * 6.0 - uTime * 0.7));
      float lines = 0.65 + 0.35 * step(0.5, fract(vPos.y * 3.0));
      float flick = 0.88 + 0.12 * sin(uTime * 23.0 + vPos.x);
      vec3 c = vec3(0.3, 0.95, 1.0);
      vec3 col = c * (0.06 + fr * 1.25 + scan * 0.55) * lines * flick;
      if (vPart > 5.5) col += c * 0.25;                          // the headset ring reads brighter
      gl_FragColor = vec4(col * (1.0 - fogF(vPos)), 1.0);
    }`,
    uniforms: { uTime: { value: 0 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() }, uNear: { value: 650 }, uFar: { value: 2400 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });

  function mesh(n, holo) {
    const g = geo.clone();
    const anim = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    g.setAttribute('aAnim', anim);
    const m = new THREE.InstancedMesh(g, holo ? holoMat : civMat, n);
    m.frustumCulled = false;
    m.count = 0;
    if (!holo) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(0.6), 3);
    m.userData.anim = anim;
    return m;
  }
  const SHIRTS = [0x8a3b3b, 0x3d5a80, 0xd9d4c7, 0x4a6b3d, 0x6b4a8a, 0xc98b3a, 0x2f2f36, 0x9aa3b0];
  return {
    S, mesh, SHIRTS,
    // anim: (offset, frequency, swing) — walkers ≈ (rand, 7, 1), idle ≈ (rand, 1.2, 0.06)
    setAnim(m, i, off, freq, amp) { m.userData.anim.setXYZ(i, off, freq, amp); m.userData.anim.needsUpdate = true; },
    tick(time, camera, fog) {
      [civMat, holoMat].forEach(mt => { mt.uniforms.uTime.value = time; mt.uniforms.uCam.value.copy(camera.position); if (fog) { mt.uniforms.uFog.value.copy(fog.color); mt.uniforms.uFar.value = fog.far; } });
    }
  };
}
