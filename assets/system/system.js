/* Chapter 03 — phosphor HUD: boot sequence, ID card, radar, skills matrix,
   education gauge, cert log and a working command terminal. */
(() => {
  'use strict';
  const S = window.Site;
  const { $, $$, esc, reduce } = S;
  const root = document.documentElement;
  const C = S.content;
  const GROUP_COLORS = ['#39ff88', '#33ccff', '#ffcc33', '#ff77cc'];

  /* ------------------------------------------------------------- boot */
  function boot() {
    let seen = null;
    try { seen = sessionStorage.getItem('booted'); } catch (e) { /* ignore */ }
    if (reduce || seen) { root.classList.add('booted'); return; }
    const pre = $('#bootLog');
    const lines = S.L().system.boot;
    let i = 0, done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try { sessionStorage.setItem('booted', '1'); } catch (e) { /* ignore */ }
      root.classList.add('booted');
      removeEventListener('keydown', finish);
      removeEventListener('pointerdown', finish);
    };
    addEventListener('keydown', finish);
    addEventListener('pointerdown', finish);
    const tick = () => {
      if (done) return;
      if (i >= lines.length) { setTimeout(finish, 380); return; }
      const l = lines[i++];
      pre.innerHTML += `${esc(l).replace(/(ok|tamam)$/i, '<span class="ok">$1</span>').replace(/^(ALL SYSTEMS NOMINAL|TÜM SİSTEMLER HAZIR)$/, '<span class="warn">$1</span>')}\n`;
      setTimeout(tick, i === 1 ? 260 : 170);
    };
    tick();
  }

  /* ------------------------------------------------------------- ID card */
  function clock() {
    return new Intl.DateTimeFormat(S.lang === 'tr' ? 'tr-TR' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Istanbul' }).format(new Date());
  }
  function renderId() {
    const I = S.L().system.id;
    const months = S.monthsSince(C.profile.jobStart);
    const kv = [
      [I.statusKey, `<span class="on">${esc(I.status.toUpperCase())}</span>`],
      [I.station, 'Konya, TR'],
      [I.uptime, `Anadolu Birlik · ${months} ${esc(S.L().work.months)}`],
      [I.local, `<span id="clock">${clock()}</span>`],
      [I.coords, esc(C.profile.coords)],
      ['E-mail', `<a href="mailto:${esc(C.profile.email)}">${esc(C.profile.email)}</a>`]
    ];
    $('#idKv').innerHTML = kv.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('');
  }
  setInterval(() => { const c = $('#clock'); if (c) c.textContent = clock(); }, 1000);
  // occasional glitch on the name
  setInterval(() => {
    if (reduce || document.hidden) return;
    const g = $('#idName');
    g.classList.add('hit');
    setTimeout(() => g.classList.remove('hit'), 260);
  }, 4200);

  /* dithered pixel monogram that slowly re-scans */
  const pc = $('#portrait'), px = pc.getContext('2d');
  const P = 40;
  const mask = (() => {
    const c = document.createElement('canvas'); c.width = c.height = P;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#fff'; g.font = '700 17px "Chakra Petch", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('YEK', P / 2, P / 2 + 1);
    return () => g.getImageData(0, 0, P, P).data;
  })();
  let maskData = null, scanY = 0;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function drawPortrait() {
    if (!maskData) maskData = mask();
    const s = pc.width / P;
    px.fillStyle = '#020703'; px.fillRect(0, 0, pc.width, pc.height);
    for (let y = 0; y < P; y++) {
      for (let x = 0; x < P; x++) {
        const m = maskData[(y * P + x) * 4] / 255;
        const d = Math.hypot(x - P / 2, y - P / 2) / (P / 2);
        let v = Math.max(m, 0.32 * (1 - d) * (0.6 + 0.4 * Math.sin(x * 0.7 + y * 0.4)));
        if (Math.abs(y - scanY) < 1.5) v += 0.5;
        if (v * 16 > BAYER[(y % 4) * 4 + (x % 4)] + 0.5) {
          px.fillStyle = m > 0.5 ? '#b6ffd2' : '#39ff88';
          px.globalAlpha = m > 0.5 ? 1 : 0.55;
          px.fillRect(x * s, y * s, s - 1, s - 1);
        }
      }
    }
    px.globalAlpha = 1;
  }

  /* ------------------------------------------------------------- radar */
  const rc = $('#radar'), rx = rc.getContext('2d');
  let sweep = 0, rVis = false, rRaf = 0, rLast = 0, blips = [];
  function sizeRadar() {
    const w = rc.clientWidth || 300, dpr = Math.min(devicePixelRatio || 1, 2);
    rc.width = w * dpr; rc.height = w * dpr;
    rx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // blips: one per skill, placed in its domain's quadrant
    blips = [];
    C.skills.forEach((g, gi) => g.items.forEach((it, k) => {
      const a = (gi / 4) * Math.PI * 2 - Math.PI / 2 + ((k + 0.5) / g.items.length - 0.5) * (Math.PI / 2) * 0.85;
      const r = 0.3 + 0.6 * (((k * 37) % 11) / 11);
      blips.push({ a, r, c: GROUP_COLORS[gi], label: S.pick(it), hit: -9 });
    }));
  }
  function drawRadar(t) {
    const w = rc.clientWidth, cx = w / 2, cy = w / 2, R = w / 2 - 66;
    rx.clearRect(0, 0, w, w);
    rx.strokeStyle = 'rgba(57,255,136,.22)'; rx.lineWidth = 1;
    for (let k = 1; k <= 4; k++) { rx.beginPath(); rx.arc(cx, cy, (R * k) / 4, 0, Math.PI * 2); rx.stroke(); }
    const counts = C.skills.map(g => g.items.length), max = Math.max(...counts);
    const G = S.L().system.skills.short;
    rx.font = '600 10px "JetBrains Mono", monospace'; rx.textAlign = 'center';
    C.skills.forEach((g, i) => {
      const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
      rx.beginPath(); rx.moveTo(cx, cy); rx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); rx.stroke();
      rx.fillStyle = GROUP_COLORS[i];
      const ca = Math.cos(a), sa = Math.sin(a);
      rx.textAlign = Math.abs(ca) < 0.3 ? 'center' : ca > 0 ? 'left' : 'right';
      rx.fillText(`${G[g.id]} ${counts[i]}`, cx + ca * (R + 8), cy + sa * (R + 14) + 3);
    });
    // coverage polygon
    rx.beginPath();
    counts.forEach((n, i) => {
      const a = (i / 4) * Math.PI * 2 - Math.PI / 2, r = R * (n / max);
      i ? rx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : rx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    });
    rx.closePath(); rx.fillStyle = 'rgba(57,255,136,.12)'; rx.fill(); rx.strokeStyle = '#39ff88'; rx.lineWidth = 1.5; rx.stroke();
    // sweep wedge
    const grad = rx.createConicGradient ? rx.createConicGradient(sweep - Math.PI / 3, cx, cy) : null;
    if (grad) {
      grad.addColorStop(0, 'rgba(57,255,136,0)'); grad.addColorStop(1 / 6, 'rgba(57,255,136,.35)'); grad.addColorStop(1 / 6 + 0.001, 'rgba(57,255,136,0)');
      rx.fillStyle = grad; rx.beginPath(); rx.arc(cx, cy, R, 0, Math.PI * 2); rx.fill();
    }
    rx.strokeStyle = '#b6ffd2'; rx.lineWidth = 1.5;
    rx.beginPath(); rx.moveTo(cx, cy); rx.lineTo(cx + Math.cos(sweep) * R, cy + Math.sin(sweep) * R); rx.stroke();
    // blips light up as the sweep passes
    blips.forEach(b => {
      let da = (sweep - b.a) % (Math.PI * 2); if (da < 0) da += Math.PI * 2;
      if (da < 0.06) b.hit = t;
      const age = (t - b.hit) / 1000, k = Math.max(0, 1 - age / 2.4);
      const x = cx + Math.cos(b.a) * b.r * R, y = cy + Math.sin(b.a) * b.r * R;
      rx.globalAlpha = 0.18 + k * 0.82;
      rx.fillStyle = b.c; rx.beginPath(); rx.arc(x, y, 2.4 + k * 2, 0, Math.PI * 2); rx.fill();
      if (k > 0.55) { rx.font = '10px "JetBrains Mono", monospace'; rx.textAlign = 'left'; rx.fillText(b.label, x + 7, y + 3); }
    });
    rx.globalAlpha = 1;
  }
  function radarLoop(now) {
    rRaf = 0;
    if (!rVis) return;
    if (rLast && now - rLast < 1000 / 31) { rRaf = requestAnimationFrame(radarLoop); return; }
    const dt = rLast ? Math.min(0.1, (now - rLast) / 1000) : 0;
    rLast = now;
    sweep = (sweep + dt * 1.2) % (Math.PI * 2);
    scanY = (scanY + dt * 14) % (P + 10);
    drawRadar(now);
    drawPortrait();
    rRaf = requestAnimationFrame(radarLoop);
  }
  new IntersectionObserver(([e]) => { rVis = e.isIntersecting && !reduce; rLast = 0; if (rVis && !rRaf) rRaf = requestAnimationFrame(radarLoop); else if (!rVis) { drawRadar(performance.now()); drawPortrait(); } })
    .observe($('.grid'));

  /* ------------------------------------------------------------- skills */
  let tab = -1;
  // Where each skill shows up, taken from the CV and the TRP description — no invented levels.
  const USES = {
    trp: ['Python', 'FastAPI', 'SQLAlchemy', 'PostgreSQL', 'Redis/RQ', 'Alembic', 'React', 'TypeScript', 'Vite', 'Tailwind CSS', 'PWA', 'Leaflet / Google Maps', 'OR-Tools', 'OSRM', 'Docker', 'Docker Compose', 'nginx', 'GitHub Actions', 'Linux'],
    abh: ['Spring Boot (OpenFeign)', 'Microservices', 'Docker', 'Docker Compose', 'Linux'],
    edge: ['Computer Vision (YOLOv8)', 'Python']
  };
  function usage(name) {
    const u = ['trp', 'abh', 'edge'].filter(k => USES[k].includes(name));
    return u.length ? u : ['cv'];
  }
  function renderSkills() {
    const SK = S.L().system.skills;
    $('#skillTabs').innerHTML = [SK.all, ...C.skills.map(g => SK.groups[g.id])]
      .map((l, i) => `<button type="button" role="tab" data-i="${i - 1}" aria-selected="${i - 1 === tab}">${esc(l)}${i ? ` · ${C.skills[i - 1].items.length}` : ''}</button>`).join('');
    const rows = [];
    C.skills.forEach((g, gi) => { if (tab === -1 || tab === gi) g.items.forEach(it => rows.push({ name: S.pick(it), en: typeof it === 'object' ? it.en : it, gi, group: SK.short[g.id] })); });
    const LG = SK.legend, cols = ['trp', 'abh', 'edge', 'cv'];
    $('#matrix').innerHTML = `<div class="legend"><b>${esc(SK.legendT)}</b>${cols.map(c => `<span><i class="led on ${c}"></i>${esc(LG[c])}</span>`).join('')}</div>` + rows.map((r, n) => {
      const used = usage(r.en);
      return `<div class="row" data-g="${r.gi}" style="--n:${n}">
        <span class="nm">${esc(r.name)}</span>
        <span class="leds">${cols.map(c => `<i class="led ${c}${used.includes(c) ? ' on' : ''}" title="${esc(LG[c])}"></i>`).join('')}</span>
      </div>`;
    }).join('');
  }
  $('#skillTabs').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    tab = +b.dataset.i;
    renderSkills();
  });

  /* ------------------------------------------------------------- edu + certs */
  function renderEdu() {
    const E = S.L().system.edu;
    $('#edu').innerHTML = `
      <div class="gauge">
        <svg viewBox="0 0 120 120"><circle class="bg" cx="60" cy="60" r="50" pathLength="100"/><circle class="fg" id="gaugeFg" cx="60" cy="60" r="50" pathLength="100"/></svg>
        <div class="val"><b>3.08</b><span>/ 4.00 ${esc(E.gpa)}</span></div>
      </div>
      <div>
        <h3>${esc(E.degree)}</h3>
        <p>${esc(E.school)}</p>
        <p>${esc(E.grad)}</p>
        <div class="chips"><span class="hl">${esc(E.note)}</span>${E.coursework.map(c => `<span>${esc(c)}</span>`).join('')}</div>
      </div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => { const f = $('#gaugeFg'); if (f) f.style.strokeDasharray = `${(3.08 / 4) * 75} 100`; }));
    const CE = S.L().system.certs;
    const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(16).padStart(8, '0').slice(0, 8);
    $('#certs').innerHTML = CE.items.map(c => `
      <li><span class="hash">0x${hash(c.title)}</span><div><b>${esc(c.title)}</b><small>${esc(c.issuer)}${c.year !== '—' ? ' · ' + esc(c.year) : ''}</small></div><span class="ok">[${esc(CE.verified)}]</span></li>`).join('');
  }

  /* ------------------------------------------------------------- terminal */
  const out = $('#termOut'), input = $('#termInput');
  const history = [];
  let hIdx = 0;
  function print(html, cls = '') { const d = document.createElement('div'); if (cls) d.className = cls; d.innerHTML = html; out.appendChild(d); out.scrollTop = out.scrollHeight; }
  function run(raw) {
    const cmd = raw.trim();
    if (!cmd) return;
    history.push(cmd); hIdx = history.length;
    print(esc(cmd), 'cmd');
    const T = S.L().system.comms;
    const [c, arg] = cmd.toLowerCase().split(/\s+/);
    switch (c) {
      case 'help': print(esc(T.help.join('\n'))); break;
      case 'whoami': print(esc(T.whoami)); break;
      case 'skills': C.skills.forEach((g, gi) => print(`<span style="color:${GROUP_COLORS[gi]}">${esc(S.L().system.skills.groups[g.id])}</span>\n  ${g.items.map(i => esc(S.pick(i))).join(' · ')}`)); break;
      case 'edu': { const E = S.L().system.edu; print(`${esc(E.degree)} — ${esc(E.school)}\n${esc(E.gpa)} 3.08 / 4.00 · ${esc(E.grad)}`); break; }
      case 'email': case 'mail': print(`<a href="mailto:${esc(C.profile.email)}">${esc(C.profile.email)}</a>`, 'acc'); break;
      case 'copy':
        (navigator.clipboard ? navigator.clipboard.writeText(C.profile.email) : Promise.reject()).then(() => print(esc(T.copied), 'acc'), () => print(esc(C.profile.email), 'acc'));
        break;
      case 'github': case 'linkedin': {
        const url = c === 'github' ? C.profile.github : C.profile.linkedin;
        print(`${esc(T.opening)} <a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a>`);
        window.open(url, '_blank', 'noopener');
        break;
      }
      case 'lang': if (arg === 'tr' || arg === 'en') S.setLang(arg); else print('lang tr | lang en', 'err'); break;
      case 'city': location.href = 'index.html'; break;
      case 'work': location.href = 'work.html'; break;
      case 'clear': out.innerHTML = ''; break;
      case 'snake': snake(); break;
      case 'sudo': print(esc(T.sudo), 'err'); break;
      default: print(`${esc(c)}: ${esc(T.unknown)}`, 'err');
    }
  }
  $('#termForm').addEventListener('submit', e => { e.preventDefault(); run(input.value); input.value = ''; });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' && history.length) { e.preventDefault(); hIdx = Math.max(0, hIdx - 1); input.value = history[hIdx]; }
    else if (e.key === 'ArrowDown' && history.length) { e.preventDefault(); hIdx = Math.min(history.length, hIdx + 1); input.value = history[hIdx] || ''; }
  });
  $('#quick').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { run(b.dataset.c); input.focus({ preventScroll: true }); } });
  function renderTerm() {
    const T = S.L().system.comms;
    $('#quick').innerHTML = ['help', 'whoami', 'skills', 'email', 'copy', 'github', 'linkedin'].map(c => `<button type="button" data-c="${c}">${c}</button>`).join('');
    if (!out.childElementCount || out.dataset.intro === '1') {
      out.innerHTML = '';
      print(esc(T.intro), 'acc');
      out.dataset.intro = '1';
    }
  }
  input.addEventListener('input', () => { out.dataset.intro = '0'; }, { once: true });
  let autoTyped = false;
  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting || autoTyped || out.dataset.intro !== '1') return;
    autoTyped = true;
    const cmd = 'whoami';
    let i = 0;
    const step = () => {
      if (out.dataset.intro !== '1') return;
      input.value = cmd.slice(0, ++i);
      if (i < cmd.length) setTimeout(step, reduce ? 0 : 90);
      else setTimeout(() => { run(cmd); input.value = ''; }, reduce ? 0 : 250);
    };
    setTimeout(step, 500);
  }, { threshold: 0.6 }).observe($('.term'));

  /* ------------------------------------------------------------- snake */
  let game = null;
  function snake() {
    if (game) return;
    const T = S.L().system.comms;
    const cv = document.createElement('canvas');
    const W = 28, H = 16, CELL = 14;
    cv.width = W * CELL; cv.height = H * CELL;
    cv.className = 'snake';
    out.appendChild(cv);
    out.scrollTop = out.scrollHeight;
    const g = cv.getContext('2d');
    let body = [[8, 8], [7, 8], [6, 8]], dir = [1, 0], next = [1, 0], food = [18, 8], score = 0, alive = true;
    const place = () => { do { food = [Math.floor(Math.random() * W), Math.floor(Math.random() * H)]; } while (body.some(b => b[0] === food[0] && b[1] === food[1])); };
    const keys = e => {
      const k = e.key.toLowerCase();
      const m = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] }[k];
      if (k === 'escape') { end(); e.preventDefault(); return; }
      if (m && (m[0] !== -dir[0] || m[1] !== -dir[1])) { next = m; e.preventDefault(); }
    };
    addEventListener('keydown', keys);
    input.blur();
    const draw = () => {
      g.fillStyle = '#020703'; g.fillRect(0, 0, cv.width, cv.height);
      g.fillStyle = 'rgba(57,255,136,.08)';
      for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) g.fillRect(x * CELL + 6, y * CELL + 6, 2, 2);
      g.fillStyle = '#ffcc33'; g.fillRect(food[0] * CELL + 2, food[1] * CELL + 2, CELL - 4, CELL - 4);
      body.forEach((b, i) => { g.fillStyle = i ? '#39ff88' : '#b6ffd2'; g.fillRect(b[0] * CELL + 1, b[1] * CELL + 1, CELL - 2, CELL - 2); });
      g.fillStyle = '#b6ffd2'; g.font = '12px "JetBrains Mono", monospace'; g.fillText(`SCORE ${score}`, 6, 14);
    };
    const step = () => {
      if (!alive) return;
      dir = next;
      const h = [(body[0][0] + dir[0] + W) % W, (body[0][1] + dir[1] + H) % H];
      if (body.some(b => b[0] === h[0] && b[1] === h[1])) { end(); return; }
      body.unshift(h);
      if (h[0] === food[0] && h[1] === food[1]) { score++; place(); window.Sound && window.Sound.blip(1200); } else body.pop();
      draw();
    };
    const timer = setInterval(step, 95);
    function end() {
      if (!alive) return;
      alive = false;
      clearInterval(timer);
      removeEventListener('keydown', keys);
      game = null;
      print(`${esc(T.snakeOver)} ${score}`, 'acc');
      input.focus({ preventScroll: true });
    }
    game = { end };
    draw();
  }

  /* ------------------------------------------------------------- konami */
  const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  let kIdx = 0;
  addEventListener('keydown', e => {
    if (game) return;
    const k = e.key.toLowerCase();
    kIdx = k === KONAMI[kIdx] ? kIdx + 1 : (k === KONAMI[0] ? 1 : 0);
    if (kIdx === KONAMI.length) {
      kIdx = 0;
      root.classList.add('overdrive');
      print(esc(S.L().system.comms.konami), 'acc');
      window.Sound && [0, 90, 180, 270].forEach((d, i) => setTimeout(() => window.Sound.blip(600 + i * 300), d));
      setTimeout(() => root.classList.remove('overdrive'), 6000);
    }
  });

  /* ------------------------------------------------------------- digital rain */
  const rain = $('#rain'), rg = rain.getContext('2d');
  const GLY = '01アイウエオカキクケコサシスセソ<>/{}[]=+*#ABCDEF0123456789';
  let cols = [], rLast2 = 0, rainRaf = 0;
  function sizeRain() {
    rain.width = Math.ceil(innerWidth / 2); rain.height = Math.ceil(innerHeight / 2);
    const n = Math.ceil(rain.width / 9);
    cols = Array.from({ length: n }, () => Math.random() * -rain.height / 9);
    rg.fillStyle = '#020703'; rg.fillRect(0, 0, rain.width, rain.height);
  }
  function rainLoop(now) {
    rainRaf = requestAnimationFrame(rainLoop);
    if (document.hidden || now - rLast2 < 50) return; // ~20 fps
    rLast2 = now;
    rg.fillStyle = 'rgba(2,7,3,.14)'; rg.fillRect(0, 0, rain.width, rain.height);
    rg.font = '9px "JetBrains Mono", monospace';
    for (let i = 0; i < cols.length; i++) {
      const y = cols[i] * 9;
      rg.fillStyle = Math.random() < 0.04 ? '#b6ffd2' : '#1f8a4c';
      rg.fillText(GLY[(Math.random() * GLY.length) | 0], i * 9, y);
      cols[i] = y > rain.height && Math.random() > 0.975 ? 0 : cols[i] + 1;
    }
  }
  if (!reduce) { sizeRain(); addEventListener('resize', sizeRain); rainRaf = requestAnimationFrame(rainLoop); }

  /* ------------------------------------------------------------- go */
  function renderAll() { renderId(); renderSkills(); renderEdu(); renderTerm(); sizeRadar(); drawRadar(performance.now()); drawPortrait(); }
  addEventListener('resize', () => { sizeRadar(); drawRadar(performance.now()); });
  S.onLang(renderAll);
  S.start();
  boot();
  if (document.fonts) document.fonts.ready.then(() => { maskData = null; drawPortrait(); });
})();
