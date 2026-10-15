/* Chapter 01 — the HUD layer over the city: boot console, viewfinder instruments (compass tape,
   altitude ladder, telemetry), the solve read-out, ops console with a live radar and dispatch feed,
   waypoint banners, the reticle cursor and panel FX. DOM + 2D canvas only; city.js feeds it. */
const S = window.Site;
const { $, $$, esc, reduce, fine } = S;
const root = document.documentElement;
const WIDE = matchMedia('(min-width: 901px)').matches;

const T = {
  tr: {
    boot: ['osrm://turkiye.osm.pbf bağlanıyor', 'yol ağı yüklendi · {n} kesişim', 'or-tools çözücü hazır', '{s} durak · {r} plasiyer atandı', 'şehir uyandırılıyor'],
    phase: ['ŞEHİR UYANIYOR', 'RASTGELE PLAN', 'ROTALAR ÇÖZÜLÜYOR', 'ÇÖZÜLDÜ'],
    wake: (a, b) => `${a}/${b} kesişim çevrimiçi`,
    naive: (s, r) => `${s} durak · ${r} plasiyer · sıra rastgele`,
    solving: (k, r) => `rota ${k}/${r} çiziliyor · sektör + en yakın komşu`,
    done: (a, b) => `${a} km → ${b} km · demo şehir`,
    shorter: 'daha kısa',
    wp: 'DURAĞA VARILDI', ops: 'OPERASYON · CANLI', rep: 'PLS',
    deliver: (r, k, n) => `${r} ▸ durak ${k}/${n} · sipariş ✓`,
    depot: (r, l) => `${r} ▸ depoda · tur ${l}`,
    added: n => `+ durak #${n} işaretlendi`,
    eta: 'depo', now: 'ŞU AN ▸', warp: 'tıkla → ışık hızı', block: 'BLOK',
    compass: ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'], online: 'SİSTEMLER ÇEVRİMİÇİ'
  },
  en: {
    boot: ['connecting osrm://turkey.osm.pbf', 'road graph loaded · {n} intersections', 'or-tools solver ready', '{s} stops · {r} reps assigned', 'waking the city'],
    phase: ['CITY WAKING UP', 'NAIVE PLAN', 'SOLVING ROUTES', 'SOLVED'],
    wake: (a, b) => `${a}/${b} intersections online`,
    naive: (s, r) => `${s} stops · ${r} reps · random order`,
    solving: (k, r) => `drawing route ${k}/${r} · sectors + nearest neighbour`,
    done: (a, b) => `${a} km → ${b} km · demo city`,
    shorter: 'shorter',
    wp: 'WAYPOINT REACHED', ops: 'OPS · LIVE', rep: 'REP',
    deliver: (r, k, n) => `${r} ▸ stop ${k}/${n} · order ✓`,
    depot: (r, l) => `${r} ▸ at depot · lap ${l}`,
    added: n => `+ stop #${n} marked`,
    eta: 'depot', now: 'NOW ▸', warp: 'click → lightspeed', block: 'BLK',
    compass: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'], online: 'SYSTEMS ONLINE'
  }
};
const tx = () => T[S.lang] || T.en;
let edgeT = 0, gaugeInit = false;
const leadC = { el: null, t: 0, r: null };
const hex = c => '#' + c.toString(16).padStart(6, '0');
const pad = (n, w) => String(Math.max(0, Math.round(n))).padStart(w, '0');
const smooth = x => x * x * (3 - 2 * x);
const clamp01 = x => Math.max(0, Math.min(1, x));
const sound = f => window.Sound && window.Sound.blip(f);

/* ---------------------------------------------------------- text scramble */
const GLYPHS = 'ABCDEFGHJKLMNPRSTUVYZ0123456789#%&*+<>/_';
function scramble(el, text, dur = 650) {
  if (!el) return;
  const id = (el._scr = (el._scr || 0) + 1);
  if (reduce) { el.textContent = text; return; }
  const t0 = performance.now();
  const step = now => {
    if (el._scr !== id) return;
    const k = Math.min(1, (now - t0) / dur), n = Math.floor(text.length * k);
    let out = text.slice(0, n);
    for (let i = n; i < text.length; i++) out += /\s/.test(text[i]) ? text[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    el.textContent = out;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------------------------------------------------------- scene facts (filled by setScene) */
const W = { xs: null, zs: null, routes: [], river: null, depot: { x: 0, z: 0 }, ext: 700, stats: null, nodes: 256, stops: 24, reps: 4 };

/* ---------------------------------------------------------- boot console */
const boot = { lines: 0, t0: performance.now(), done: false };
function bootTick() {
  const pct = +($('#loadPct') ? $('#loadPct').textContent : 0) || 0;
  const bar = $('#bootBar');
  if (bar) bar.style.transform = `scaleX(${pct / 100})`;
  const want = [6, 26, 48, 70, 92].filter(v => pct >= v).length;
  const log = $('#bootLog');
  while (log && boot.lines < want) {
    const raw = tx().boot[boot.lines].replace('{n}', W.nodes).replace('{s}', W.stops).replace('{r}', W.reps);
    const li = document.createElement('li');
    li.innerHTML = `<span>${(((performance.now() - boot.t0) / 1000).toFixed(2)).padStart(5, '0')}</span><b></b><em>OK</em>`;
    log.appendChild(li);
    scramble(li.querySelector('b'), '> ' + raw, 380);
    boot.lines++;
  }
  const clk = $('#bootClock');
  if (clk) clk.textContent = 'T+' + ((performance.now() - boot.t0) / 1000).toFixed(2) + 's';
  if (root.classList.contains('ready')) { boot.done = true; return; }
  requestAnimationFrame(bootTick);
}

/* ---------------------------------------------------------- viewfinder instruments */
const PPD = 3;               // compass: px per degree
function buildCompass() {
  const strip = $('#compassStrip');
  if (!strip) return;
  const names = tx().compass;
  let html = '';
  for (let d = -180; d <= 540; d += 15) {
    const n = ((d % 360) + 360) % 360;
    const label = n % 45 === 0 ? `<b>${names[n / 45]}</b>` : pad(n, 3);
    html += `<span style="left:${(d + 180) * PPD}px">${label}</span>`;
  }
  strip.innerHTML = html;
}
function buildLadder() {
  const strip = $('#ladderStrip');
  if (!strip) return;
  let html = '';
  for (let m = 0; m <= 4000; m += 100) html += `<span style="bottom:${m}px">${pad(m, 4)}</span>`;
  strip.innerHTML = html;
}

/* ---------------------------------------------------------- ops console + radar */
const radar = { cv: null, ctx: null, bg: null, w: 0, h: 0, dpr: 1, last: 0, pings: [], cam: null };
function sizeRadar() {
  const cv = $('#radar');
  if (!cv) return;
  const r = cv.getBoundingClientRect();
  if (!r.width) return;
  radar.dpr = Math.min(2, devicePixelRatio || 1);
  radar.w = r.width; radar.h = r.height;
  cv.width = Math.round(r.width * radar.dpr); cv.height = Math.round(r.height * radar.dpr);
  radar.cv = cv; radar.ctx = cv.getContext('2d');
  radar.bg = null;
}
function rgeo() {
  const R = Math.min(radar.w, radar.h) / 2 - 6;
  return { cx: radar.w / 2, cy: radar.h / 2, R, k: R / (W.ext * 1.08) };
}
function radarStatic() {
  const c = document.createElement('canvas');
  c.width = radar.w * radar.dpr; c.height = radar.h * radar.dpr;
  const x = c.getContext('2d');
  x.scale(radar.dpr, radar.dpr);
  const { cx, cy, R, k } = rgeo();
  x.save();
  x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.clip();
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, R);
  g.addColorStop(0, 'rgba(76,242,255,.10)'); g.addColorStop(1, 'rgba(76,242,255,.02)');
  x.fillStyle = g; x.fillRect(0, 0, radar.w, radar.h);
  if (W.river) { x.fillStyle = 'rgba(80,120,255,.18)'; x.fillRect(0, cy + W.river[0] * k, radar.w, (W.river[1] - W.river[0]) * k); }
  x.strokeStyle = 'rgba(160,170,255,.13)'; x.lineWidth = 1;
  (W.xs || []).forEach(v => { x.beginPath(); x.moveTo(cx + v * k, 0); x.lineTo(cx + v * k, radar.h); x.stroke(); });
  (W.zs || []).forEach(v => { x.beginPath(); x.moveTo(0, cy + v * k); x.lineTo(radar.w, cy + v * k); x.stroke(); });
  W.routes.forEach(r => {
    x.strokeStyle = hex(r.color); x.globalAlpha = 0.75; x.lineWidth = 1.6; x.lineJoin = 'round';
    x.beginPath(); r.path.forEach((p, i) => (i ? x.lineTo : x.moveTo).call(x, cx + p.x * k, cy + p.z * k)); x.stroke();
    x.globalAlpha = 1; x.fillStyle = hex(r.color);
    r.stops.forEach(s => { x.beginPath(); x.arc(cx + s.x * k, cy + s.z * k, 1.8, 0, Math.PI * 2); x.fill(); });
  });
  x.restore();
  x.strokeStyle = 'rgba(76,242,255,.35)'; x.setLineDash([2, 4]);
  [0.33, 0.66].forEach(f => { x.beginPath(); x.arc(cx, cy, R * f, 0, Math.PI * 2); x.stroke(); });
  x.setLineDash([]); x.strokeStyle = 'rgba(76,242,255,.55)';
  x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.stroke();
  for (let a = 0; a < 360; a += 10) {
    const r0 = a % 90 === 0 ? R - 7 : R - 3, rad = (a - 90) * Math.PI / 180;
    x.beginPath(); x.moveTo(cx + Math.cos(rad) * r0, cy + Math.sin(rad) * r0); x.lineTo(cx + Math.cos(rad) * R, cy + Math.sin(rad) * R); x.stroke();
  }
  x.fillStyle = '#4cf2ff'; x.font = '600 9px JetBrains Mono, monospace'; x.textAlign = 'center';
  x.fillText(tx().compass[0], cx, cy - R + 16);
  radar.bg = c;
}
function drawRadar(now, vans, clock) {
  if (!radar.ctx || !W.routes.length) return;
  if (now - radar.last < 33) return;
  radar.last = now;
  if (!radar.bg) radarStatic();
  const x = radar.ctx, { cx, cy, R, k } = rgeo();
  x.setTransform(radar.dpr, 0, 0, radar.dpr, 0, 0);
  x.clearRect(0, 0, radar.w, radar.h);
  x.drawImage(radar.bg, 0, 0, radar.w, radar.h);
  // sweep with a fading trail
  const sa = (clock * 1.3) % (Math.PI * 2);
  x.save();
  x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.clip();
  for (let i = 0; i < 26; i++) {
    const a0 = sa - i * 0.045;
    x.fillStyle = `rgba(76,242,255,${0.2 * (1 - i / 26)})`;
    x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, R, a0 - 0.046, a0); x.closePath(); x.fill();
  }
  x.strokeStyle = 'rgba(180,250,255,.9)'; x.lineWidth = 1.2;
  x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(sa) * R, cy + Math.sin(sa) * R); x.stroke();
  // depot pulse
  const q = (clock * 0.8) % 1;
  x.strokeStyle = `rgba(76,242,255,${1 - q})`; x.lineWidth = 1;
  x.beginPath(); x.arc(cx + W.depot.x * k, cy + W.depot.z * k, 3 + q * 12, 0, Math.PI * 2); x.stroke();
  x.fillStyle = '#fff'; x.fillRect(cx + W.depot.x * k - 2, cy + W.depot.z * k - 2, 4, 4);
  // pings (deliveries, clicks)
  radar.pings = radar.pings.filter(p => now - p.t < 1400);
  radar.pings.forEach(p => {
    const f = (now - p.t) / 1400;
    x.strokeStyle = p.c; x.globalAlpha = 1 - f; x.lineWidth = 1.4;
    x.beginPath(); x.arc(cx + p.x * k, cy + p.z * k, 2 + f * 16, 0, Math.PI * 2); x.stroke();
  });
  x.globalAlpha = 1;
  // vans: brighter right after the sweep passes them
  vans.forEach(v => {
    const px = cx + v.x * k, pz = cy + v.z * k;
    let d = (sa - Math.atan2(pz - cy, px - cx)) % (Math.PI * 2); if (d < 0) d += Math.PI * 2;
    const hot = Math.max(0, 1 - d / 1.4);
    x.fillStyle = v.c; x.shadowColor = v.c; x.shadowBlur = 6 + hot * 12;
    x.beginPath(); x.arc(px, pz, 2.6 + hot * 1.8, 0, Math.PI * 2); x.fill();
  });
  x.shadowBlur = 0;
  // camera position + field of view
  if (radar.cam) {
    let px = radar.cam.x * k, pz = radar.cam.z * k;
    const L = Math.hypot(px, pz);
    if (L > R - 4) { px *= (R - 4) / L; pz *= (R - 4) / L; }
    const a = Math.atan2(radar.cam.dz, radar.cam.dx), fov = 0.42;
    const gr = x.createRadialGradient(cx + px, cy + pz, 0, cx + px, cy + pz, R * 0.9);
    gr.addColorStop(0, 'rgba(255,255,255,.28)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr;
    x.beginPath(); x.moveTo(cx + px, cy + pz); x.arc(cx + px, cy + pz, R * 0.9, a - fov, a + fov); x.closePath(); x.fill();
    x.fillStyle = '#fff';
    x.beginPath(); x.arc(cx + px, cy + pz, 2.4, 0, Math.PI * 2); x.fill();
  }
  x.restore();
}

const ops = { rows: [], feed: [], lastTxt: 0 };
function buildOps() {
  const list = $('#opsReps');
  if (!list || !W.routes.length) return;
  const t = tx();
  list.innerHTML = W.routes.map(r => `<li style="--c:${hex(r.color)}"><i></i><b>${t.rep}-${String.fromCharCode(65 + r.ri)}</b><span class="bar"><s></s></span><em>0/${r.stops.length}</em><small>--s</small></li>`).join('');
  ops.rows = $$('li', list).map(li => ({ bar: $('s', li), cnt: $('em', li), eta: $('small', li) }));
  scramble($('#opsTitle'), t.ops, 600);
}
function feed(text, color) {
  const box = $('#opsFeed');
  if (!box) return;
  const li = document.createElement('li');
  const d = new Date();
  li.style.setProperty('--c', color || '#4cf2ff');
  li.innerHTML = `<span>${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}:${pad(d.getSeconds(), 2)}</span><b></b>`;
  box.prepend(li);
  scramble($('b', li), text, 420);
  while (box.children.length > 4) box.lastElementChild.remove();
}

/* ---------------------------------------------------------- reticle cursor */
const ret = { el: null, txt: null, x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2, raf: 0, ground: null, lock: false };
function retLoop() {
  ret.x += (ret.tx - ret.x) * 0.35; ret.y += (ret.ty - ret.y) * 0.35;
  ret.el.style.transform = `translate3d(${ret.x.toFixed(1)}px, ${ret.y.toFixed(1)}px, 0)`;
  if (Math.abs(ret.tx - ret.x) + Math.abs(ret.ty - ret.y) > 0.3) ret.raf = requestAnimationFrame(retLoop);
  else ret.raf = 0;
}
function initReticle() {
  if (!fine) return;
  ret.el = $('#reticle'); ret.txt = $('#reticleTxt');
  if (!ret.el) return;
  root.classList.add('reticle-on');
  addEventListener('pointermove', e => {
    ret.tx = e.clientX; ret.ty = e.clientY;
    const lock = !!e.target.closest('a, button, [data-tilt3d], .solve');
    if (lock !== ret.lock) { ret.lock = lock; ret.el.classList.toggle('lock', lock); }
    ret.el.classList.add('live');
    if (!ret.raf) ret.raf = requestAnimationFrame(retLoop);
  }, { passive: true });
  document.addEventListener('pointerleave', () => ret.el.classList.remove('live'));
  addEventListener('pointerdown', () => { ret.el.classList.remove('click'); void ret.el.offsetWidth; ret.el.classList.add('click'); }, { passive: true });
  ret.txt.textContent = `${pad(ret.tx, 4)} · ${pad(ret.ty, 4)}`;
}
function blockOf(x, z) {
  if (!W.xs) return '';
  const i = W.xs.filter(v => v < x).length, j = W.zs.filter(v => v < z).length;
  return `${tx().block} ${String.fromCharCode(64 + Math.max(1, Math.min(26, i)))}-${pad(Math.max(1, j), 2)}`;
}

/* ---------------------------------------------------------- hero, panels, next link */
let nowIdx = 0, nowTimer = 0;
function heroFx() {
  const tag = $('.c-tagline');
  if (tag && !$('.c-now')) {
    tag.insertAdjacentHTML('afterend', '<p class="c-now" aria-hidden="true"><span class="k"></span><b id="nowTxt"></b><i class="caret"></i></p>');
  }
  const run = () => {
    const items = S.L().city.focus.items;
    $('.c-now .k').textContent = tx().now;
    scramble($('#nowTxt'), items[nowIdx % items.length].t, 700);
  };
  const go = () => {
    run();
    clearInterval(nowTimer);
    if (!reduce) nowTimer = setInterval(() => { nowIdx++; run(); }, 3400);
  };
  revealWords($('.c-tagline'));   // before .ready lands, so the words get to transition in
  S.onLang(() => revealWords($('.c-tagline')));
  const whenReady = fn => root.classList.contains('ready') ? fn() : new MutationObserver((_, o) => { if (root.classList.contains('ready')) { o.disconnect(); fn(); } }).observe(root, { attributes: true, attributeFilter: ['class'] });
  whenReady(() => {
    scramble($('.c-kicker'), $('.c-kicker').textContent, 900);
    setTimeout(go, 1700);
    // the title glitches now and then
    if (!reduce) {
      const title = $('.c-title');
      const glitch = () => { title.classList.remove('glitch'); void title.offsetWidth; title.classList.add('glitch'); setTimeout(glitch, 3800 + Math.random() * 4200); };
      setTimeout(glitch, 2600);
    }
  });
  S.onLang(() => { $$('.c-kicker').forEach(el => { el._scr = (el._scr || 0) + 1; }); if ($('.c-now .k')) run(); });
}

// words light up one after another (the tagline is proportional type, so a glyph scramble would reflow it)
function revealWords(el) {
  if (!el || reduce) return;
  const words = el.textContent.split(/(\s+)/);
  el.innerHTML = words.map((w, i) => /\s/.test(w) ? w : `<span class="w" style="--i:${i / 2}">${esc(w)}</span>`).join('');
}

function panelFx() {
  $$('.glass').forEach((g, i) => {
    if ($('.g-fx', g)) return;
    g.insertAdjacentHTML('beforeend', `<span class="g-fx" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="g-tag" aria-hidden="true">PNL-0${i + 1}<em><s></s><s></s><s></s><s></s></em></span>`);
  });
  // facts count up the first time they arrive
  const facts = $('#facts');
  if (facts) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      io.disconnect();
      $$('b[data-to]', facts).forEach((b, k) => countUp(b, b.dataset.to, 1500 + k * 180));
    }), { threshold: 0.6 });
    io.observe(facts);
  }
  const next = $('.c-next .sub');
  if (next && !$('.warp-hint')) next.insertAdjacentHTML('afterend', '<p class="warp-hint" aria-hidden="true"><i></i><span id="warpHint"></span></p>');
  const setHint = () => { const h = $('#warpHint'); if (h) h.textContent = tx().warp; };
  setHint(); S.onLang(setHint);
}
function countUp(el, final, dur) {
  const dec = (final.split('.')[1] || '').length, to = parseFloat(final);
  if (reduce || !isFinite(to)) return;
  const t0 = performance.now();
  const step = now => {
    const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4);
    el.textContent = (to * e).toFixed(dec);
    if (k < 1) requestAnimationFrame(step);
    else { el.textContent = final; el.classList.add('pop'); }
  };
  requestAnimationFrame(step);
}

/* ---------------------------------------------------------- the solve read-out */
const seqS = { phase: -1, lastT: 0, solved: false };
function setPhase(p) {
  seqS.phase = p;
  const t = tx(), el = $('#seq');
  el.dataset.phase = p;
  el.classList.add('on');
  $('#seqPh').textContent = `0${p + 1}/04`;
  scramble($('#seqTitle'), t.phase[p], 420);
  sound([330, 440, 554, 880][p]);
}

/* ---------------------------------------------------------- public API */
export const hud = {
  scramble,
  init() {
    requestAnimationFrame(bootTick);
    buildCompass(); buildLadder();
    heroFx(); panelFx(); initReticle();
    if (reduce) root.classList.add('hud-on', 'ops-on');
    S.onLang(() => {
      buildCompass();
      if (W.routes.length) { buildOps(); radar.bg = null; }
      if (seqS.phase >= 0 && seqS.phase < 3) $('#seqTitle').textContent = tx().phase[seqS.phase];
    });
    addEventListener('resize', () => { sizeRadar(); });
  },

  setScene(s) {
    Object.assign(W, s);
    W.nodes = s.xs.length * s.zs.length;
    W.stops = s.routes.reduce((n, r) => n + r.stops.length, 0);
    W.reps = s.routes.length;
    buildOps(); sizeRadar();
  },

  /* per frame from city.js */
  frame(now, f) {
    const hd = $('#hdg'), al = $('#alt');
    if (hd) {
      $('#compassStrip').style.transform = `translate3d(${(-(f.hdg + 180) * PPD).toFixed(1)}px,0,0)`;
      $('#ladderStrip').style.transform = `translate3d(0,${Math.min(4000, f.alt).toFixed(1)}px,0)`;
    }
    radar.cam = f.cam;
    if (now - ops.lastTxt > 110) {
      ops.lastTxt = now;
      const alt = f.alt < 0 ? '−' + pad(-f.alt, 3) : pad(f.alt, 4);   // below the ops yard it reads negative
      if (hd) { hd.textContent = pad(f.hdg, 3) + '°'; al.textContent = alt; }
      const tel = $('#telem');
      if (tel) tel.innerHTML = `ALT <b>${alt}m</b> · HDG <b>${pad(f.hdg, 3)}°</b> · SPD <b>${pad(f.spd, 3)}</b> · <b>${pad(f.fps, 2)}</b> FPS`;
      f.vans.forEach((v, i) => {
        const row = ops.rows[i];
        if (!row) return;
        row.bar.style.transform = `scaleX(${v.prog.toFixed(3)})`;
        row.cnt.textContent = `${v.done}/${v.n}`;
        row.eta.textContent = `${pad(Math.min(99, v.eta), 2)}s`;
      });
      const ck = $('#opsClock');
      if (ck) { const d = new Date(); ck.textContent = `${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}:${pad(d.getSeconds(), 2)}`; }
    }
    if (root.classList.contains('ops-on') && root.dataset.op !== 'work' && root.dataset.op !== 'system') {
      if (!radar.ctx && now - (radar.tried || 0) > 400) { radar.tried = now; sizeRadar(); }   // it may have been folded away when the console came on
      drawRadar(now, f.vans, f.clock);
    }
    if (ret.txt && f.ground && now - (ret.gt || 0) > 60) {
      ret.gt = now;
      const lat = 37.8716 - f.ground.z / 111000, lon = 32.4846 + f.ground.x / (111000 * Math.cos(lat * Math.PI / 180));
      ret.txt.innerHTML = `${lat.toFixed(4)}°N ${lon.toFixed(4)}°E<br><b>${blockOf(f.ground.x, f.ground.z)}</b>`;
    }
  },

  /* the opening sequence; t = seconds since start, w = switch-on wave 0…1 */
  seq(t, SEQ, w) {
    const jumped = seqS.lastT < SEQ.solve0 && t > SEQ.chip;
    seqS.lastT = t;
    if (jumped) seqS.jumped = true;
    if (seqS.jumped || seqS.solved) return;
    const st = W.stats;
    let p = -1;
    if (t >= SEQ.wave0) p = 0;
    if (t >= SEQ.tangle0) p = 1;
    if (t >= SEQ.solve0) p = 2;
    if (p < 0) return;
    if (p !== seqS.phase) setPhase(p);
    const tt = tx(), num = $('#seqNum'), unit = $('#seqUnit'), bar = $('#seqBar'), sub = $('#seqSub');
    if (p === 0) {
      num.textContent = Math.round(w * 100); unit.textContent = '%';
      bar.style.transform = `scaleX(${w.toFixed(3)})`;
      sub.textContent = tt.wake(Math.round(w * W.nodes), W.nodes);
    } else if (p === 1) {
      const k = smooth(clamp01((t - SEQ.tangle0) / 1.6));
      num.textContent = (st.naive / 1000 * k).toFixed(1); unit.textContent = 'km';
      bar.style.transform = `scaleX(${k.toFixed(3)})`;
      sub.textContent = tt.naive(W.stops, W.reps);
    } else {
      const k = smooth(clamp01((t - SEQ.solve0) / (SEQ.chip - SEQ.solve0)));
      num.textContent = ((st.naive + (st.opt - st.naive) * k) / 1000).toFixed(1); unit.textContent = 'km';
      bar.style.transform = `scaleX(${(1 - k * (1 - st.opt / st.naive)).toFixed(3)})`;
      sub.textContent = tt.solving(Math.min(W.reps, 1 + Math.floor(k * W.reps)), W.reps);
    }
  },

  /* sequence finished; quick = the visitor skipped it */
  solved(quick, then) {
    if (seqS.solved) return;
    seqS.solved = true;
    const el = $('#seq'), st = W.stats;
    const online = () => {
      root.classList.add('hud-on', 'ops-on');
      sizeRadar();
      then && then();
    };
    if (quick || seqS.jumped || reduce || !st) { el.classList.remove('on'); online(); return; }
    const tt = tx(), pct = Math.round((1 - st.opt / st.naive) * 100);
    el.dataset.phase = 3;
    $('#seqPh').textContent = '04/04';
    scramble($('#seqTitle'), tt.phase[3], 380);
    $('#seqNum').textContent = '−' + pct; $('#seqUnit').textContent = '%';
    $('#seqBar').style.transform = `scaleX(${(st.opt / st.naive).toFixed(3)})`;
    $('#seqSub').textContent = tt.done((st.naive / 1000).toFixed(1), (st.opt / 1000).toFixed(1));
    el.classList.add('done');
    sound(1320);
    setTimeout(() => { el.classList.add('out'); online(); }, 2600);
    setTimeout(() => { el.classList.remove('on', 'done', 'out'); }, 3500);
  },
  replay() { seqS.solved = false; seqS.jumped = false; seqS.phase = -1; seqS.lastT = 0; $('#seq').classList.remove('on', 'done', 'out'); },

  // big banner when the operation crosses into a new chapter
  waypoint(n, tot, label, side = 'mid') {
    const el = $('#wp');
    if (!el || reduce) return;
    el.innerHTML = `<small>${esc(tx().wp)}</small><b>${esc(n)}<span>${esc(tot)}</span></b><em></em>`;
    el.dataset.side = side;
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    scramble($('em', el), label.toUpperCase(), 520);
    sound(660);
  },

  // leader line from the live card to its anchor in the scene (x, y in px), or hide with null
  leader(x, y, card) {
    const svg = $('#leader');
    if (!svg) return;
    if (x == null || !card) { svg.classList.remove('on'); return; }
    // the card is sticky, so its box barely moves: measure it 4× a second, not every frame (each read forces a layout)
    const now = performance.now();
    if (card !== leadC.el || now - leadC.t > 250) { leadC.el = card; leadC.t = now; leadC.r = card.getBoundingClientRect(); }
    const r = leadC.r;
    if (r.bottom < 0 || r.top > innerHeight || r.width === 0) { svg.classList.remove('on'); return; }
    const right = r.left + r.width / 2 < x;
    const sx = right ? r.right : r.left, sy = Math.max(r.top + 24, Math.min(r.bottom - 24, r.top + 46));
    const mx = sx + (right ? 1 : -1) * Math.min(60, Math.abs(x - sx) / 2);
    $('#leaderPath').setAttribute('d', `M${sx.toFixed(1)},${sy.toFixed(1)} H${mx.toFixed(1)} L${x.toFixed(1)},${y.toFixed(1)}`);
    $('#leaderDot').setAttribute('cx', x.toFixed(1)); $('#leaderDot').setAttribute('cy', y.toFixed(1));
    $('#leaderRing').setAttribute('cx', x.toFixed(1)); $('#leaderRing').setAttribute('cy', y.toFixed(1));
    svg.classList.add('on');
  },

  // street camera: YOLO-style boxes over what the scene camera actually sees
  edge(dets, now) {
    const el = $('#edgecam');
    if (!el) return;
    if (!dets) { if (el.classList.contains('on')) el.classList.remove('on'); return; }
    el.classList.add('on');
    if (now - (edgeT || 0) < 60) return;
    edgeT = now;
    const boxes = $('#ecBoxes');
    while (boxes.children.length < dets.length) boxes.appendChild(document.createElement('i'));
    [...boxes.children].forEach((b, i) => {
      const d = dets[i];
      if (!d) { b.style.display = 'none'; return; }
      b.style.display = '';
      b.className = d.k;
      b.style.transform = `translate(${d.b[0].toFixed(0)}px,${d.b[1].toFixed(0)}px)`;
      b.style.width = d.b[2].toFixed(0) + 'px'; b.style.height = d.b[3].toFixed(0) + 'px';
      b.dataset.l = `${d.k} ${d.c.toFixed(2)}`;
    });
    $('#ecCount').textContent = `${dets.length} OBJ`;
    const d = new Date(); $('#ecClock').textContent = d.toLocaleTimeString('tr-TR') + '.' + pad(d.getMilliseconds() / 10, 2);
  },

  event(kind, data) {
    const t = tx(), name = `${t.rep}-${String.fromCharCode(65 + data.ri)}`;
    const c = data.color ? hex(data.color) : '#4cf2ff';
    if (kind === 'deliver') feed(t.deliver(name, data.k, data.n), c);
    else if (kind === 'depot') feed(t.depot(name, data.lap), c);
    else if (kind === 'added') feed(t.added(data.n), c);
    if (data.x !== undefined) radar.pings.push({ x: data.x, z: data.z, c, t: performance.now() });
  },

  burst(x, y, color) {
    const b = document.createElement('div');
    b.className = 'burst'; b.setAttribute('aria-hidden', 'true');
    b.style.cssText = `left:${x}px;top:${y}px;--c:${hex(color)}`;
    b.innerHTML = '<i></i><i></i><i></i>';
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 1200);
  },

  warp(on) { root.classList.toggle('warp', on); },

  // the van's gauges: speed, gear and a tachometer (0–8k rpm, red from 6.5k)
  gauges(e, next, taking) {
    const spd = $('#cabSpd');
    if (!spd) return;
    if (!gaugeInit) {
      gaugeInit = true;
      let t = '';
      for (let k = 0; k <= 8; k++) { const a = (-120 + k * 30) * Math.PI / 180, s = Math.sin(a), c = -Math.cos(a); t += `<line x1="${100 + s * 70}" y1="${100 + c * 70}" x2="${100 + s * 78}" y2="${100 + c * 78}"/><text x="${100 + s * 58}" y="${104 + c * 58}">${k}</text>`; }
      $('#tachTicks').innerHTML = t;
    }
    const p = Math.max(0, Math.min(1, e.rpm / 8000));
    spd.textContent = pad(e.kmh, 3);
    $('#cabGear').textContent = e.gear ? 'D' + e.gear : 'N';
    $('#cabRpm').textContent = (e.rpm / 1000).toFixed(1);
    $('#tachArc').style.strokeDasharray = `${(p * 100).toFixed(1)} 100`;
    $('#tachArc').classList.toggle('hot', e.rpm > 6500);
    $('#tachNeedle').setAttribute('transform', `rotate(${(-120 + 240 * p).toFixed(1)} 100 100)`);
    $('#cabNext').textContent = next;
    $('#cabTake').textContent = taking;
  },
  noWebgl() { root.classList.add('hud-on'); }
};

hud.init();
