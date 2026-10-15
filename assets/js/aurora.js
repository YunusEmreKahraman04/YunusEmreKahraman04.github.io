/* Aurora behind the contact section: one fragment shader (domain-warped fbm)
   on a half-resolution canvas, tinted with the theme accents and pulled
   toward the pointer. Runs at ~30 fps only while visible; removes itself if
   WebGL is missing or the machine can't keep up. */
(() => {
  'use strict';
  const section = document.querySelector('.contact');
  if (!section || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'aurora';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) return;

  const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FS = `
precision mediump float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uHover;
uniform vec3 uC1, uC2, uC3, uBg; uniform float uLight;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);
}
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++){ v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; } return v; }
void main(){
  vec2 p = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  vec2 m = (uMouse - .5) * vec2(uRes.x / uRes.y, 1.);
  float md = exp(-2.6 * length(p - m)) * uHover;
  float t = uTime * .05;
  vec2 q = vec2(fbm(p * 1.5 + t), fbm(p * 1.5 - t + 4.3));
  vec2 r = vec2(fbm(p * 1.9 + 3.2 * q + vec2(1.7, 9.2) + t * 1.4 + md * .8),
                fbm(p * 1.9 + 3.2 * q + vec2(8.3, 2.8) - t));
  float f = fbm(p * 1.3 + 2.6 * r);
  vec3 col = mix(uC1, uC2, clamp(f * 1.7 - .25, 0., 1.));
  col = mix(col, uC3, clamp(length(q) - .55, 0., 1.) * .85);
  float band = smoothstep(.22, .85, f);
  float vy = gl_FragCoord.y / uRes.y;
  float vign = smoothstep(1.05, .1, length(p * vec2(.7, 1.35))) * smoothstep(0., .3, vy) * smoothstep(1., .7, vy);
  float a = band * vign * (.6 + .9 * md);
  float k = clamp(a, 0., 1.) * (uLight > .5 ? .32 : .5);
  gl_FragColor = vec4(col * k, k); // premultiplied: the page (and its dot grid) shows through
}`;

  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (err) {
    console.info('Aurora disabled:', err.message);
    return;
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = name => gl.getUniformLocation(prog, name);
  const u = { res: U('uRes'), time: U('uTime'), mouse: U('uMouse'), hover: U('uHover'), c1: U('uC1'), c2: U('uC2'), c3: U('uC3'), bg: U('uBg'), light: U('uLight') };

  const hex = v => {
    let h = (v || '#000000').replace('#', '').trim();
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const v = n => cs.getPropertyValue(n).trim();
    gl.uniform3fv(u.c1, hex(v('--accent')));
    gl.uniform3fv(u.c2, hex(v('--accent-2')));
    gl.uniform3fv(u.c3, hex(v('--accent-4')));
    gl.uniform3fv(u.bg, hex(v('--bg')));
    gl.uniform1f(u.light, document.documentElement.dataset.theme === 'light' ? 1 : 0);
  }

  const SCALE = 0.5;
  function resize() {
    const w = Math.max(1, Math.round(section.clientWidth * SCALE));
    const h = Math.max(1, Math.round(section.clientHeight * SCALE));
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(u.res, w, h);
  }

  const mouse = { x: 0.5, y: 0.6, tx: 0.5, ty: 0.6, h: 0, th: 0 };
  section.addEventListener('pointermove', e => {
    const r = section.getBoundingClientRect();
    mouse.tx = (e.clientX - r.left) / r.width;
    mouse.ty = 1 - (e.clientY - r.top) / r.height;
    mouse.th = 1;
  }, { passive: true });
  section.addEventListener('pointerleave', () => { mouse.th = 0; });

  let visible = false, raf = 0, last = 0, t0 = performance.now(), shown = false;
  const perf = { t: 0, n: 0, done: false };

  function stop(reason) {
    cancelAnimationFrame(raf);
    raf = 0;
    canvas.remove();
    section.classList.remove('has-aurora');
    if (reason) console.info('Aurora disabled:', reason);
  }

  function frame(now) {
    raf = 0;
    if (!visible) return;
    if (last && now - last < 1000 / 31) { raf = requestAnimationFrame(frame); return; }
    if (!perf.done && last) {
      perf.t += now - last; perf.n++;
      if (perf.t > 2000) { perf.done = true; if (perf.n / (perf.t / 1000) < 18) { stop('low frame rate'); return; } }
    }
    last = now;
    mouse.x += (mouse.tx - mouse.x) * 0.08;
    mouse.y += (mouse.ty - mouse.y) * 0.08;
    mouse.h += (mouse.th - mouse.h) * 0.05;
    resize();
    gl.uniform1f(u.time, (now - t0) / 1000);
    gl.uniform2f(u.mouse, mouse.x, mouse.y);
    gl.uniform1f(u.hover, 0.35 + mouse.h * 0.65);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (!shown) { shown = true; canvas.classList.add('on'); }
    raf = requestAnimationFrame(frame);
  }

  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); stop('context lost'); });
  section.prepend(canvas);
  section.classList.add('has-aurora');
  readColors();
  resize();

  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting && !document.hidden;
    last = 0;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  }).observe(section);

  window.Aurora = { refresh() { readColors(); } };
})();
