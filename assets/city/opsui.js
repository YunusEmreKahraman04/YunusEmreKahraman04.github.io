/* Chapters 02–03 on the single page: the dossier cards, the event that unlocks each one, the skill
   matrix, and the radio terminal (ported from the old system page). The 3D side calls OpsUI.fire(). */
(() => {
  'use strict';
  const S = window.Site, C = S.content;
  const { $, $$, esc, reduce } = S;
  const root = document.documentElement;
  const GLY = 'ABCDEFGHJKLMNPRSTUVYZ0123456789#%&*<>/_';
  const GROUP_COLORS = ['#4cf2ff', '#8b7bff', '#ffb347', '#ff3fa4'];
  const sec = name => $(`.op[data-shot="${name}"]`);
  const WORK = ['w0', 'brief', 'cab', 'hq', 'roles', 'sync', 'dock', 'edge', 'prod'];
  const SYS = ['s0', 'skills', 'edu', 'certs', 'term', 'out'];

  function scramble(el, text, dur = 520) {
    const id = (el._scr = (el._scr || 0) + 1);
    if (reduce) { el.textContent = text; return; }
    const t0 = performance.now();
    const step = now => {
      if (el._scr !== id) return;
      const k = Math.min(1, (now - t0) / dur), n = Math.floor(text.length * k);
      let out = text.slice(0, n);
      for (let i = n; i < text.length; i++) out += /\s/.test(text[i]) ? text[i] : GLY[(Math.random() * GLY.length) | 0];
      el.textContent = out;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const fill = (s, v = {}) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');

  /* ------------------------------------------------------------ card bodies */
  const ev = (n) => `<p class="op-ev"><i></i><span class="ev-k">${esc(S.L().op.event)} ${String(n).padStart(2, '0')}</span><b class="ev-line"></b></p>`;
  const chips = list => `<ul class="chips">${list.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
  function chapterHead(key) {
    const ch = S.L().op.ch[key];
    return `<header class="op-ch"><span class="n">${ch.n}</span><h2>${esc(ch.t)}</h2><p>${esc(ch.k)}</p></header>`;
  }

  function render() {
    const L = S.L(), W = L.work, Y = L.system, O = L.op;
    const blocks = W.trp.blocks;
    const card = (name, html) => { const s = sec(name); if (s) $('.op-card', s).innerHTML = html; };

    // 02
    const exp = W.experience.map((e, i) => {
      const mo = S.monthsSince(e.start, e.end);
      const pts = i === 0 ? [e.points[0], e.points[4]] : e.points.slice(0, 1);
      return `<li><div class="ex-h"><b>${esc(e.company)}</b><span>${esc(e.period)} · ${mo} ${esc(W.months)}</span></div><p class="ex-r">${esc(e.role)} — ${esc(e.location)}</p><ul>${pts.map(p => `<li>${esc(p)}</li>`).join('')}</ul></li>`;
    }).join('');
    card('w0', chapterHead('work') + ev(1) + `<div class="op-body"><p class="op-k">${esc(O.exp)}</p><ol class="exp">${exp}</ol></div>`);
    const blockCard = (k, n, extra = '') => `${ev(n)}<div class="op-body"><p class="op-k">TRP · ${String(k + 1).padStart(2, '0')}/07</p><h3>${esc(blocks[k].t)}</h3><p>${esc(blocks[k].d)}</p>${extra}</div>`;
    card('brief', blockCard(0, 2, `<p class="op-note">${esc(W.trp.summary)}</p>`));
    card('cab', blockCard(1, 3));
    card('hq', blockCard(2, 4));
    card('roles', blockCard(3, 5, chips(O.roles)));
    card('sync', blockCard(4, 6));
    card('dock', blockCard(5, 7));
    card('edge', `${ev(8)}<div class="op-body"><p class="op-k">${esc(W.edge.kicker)}</p><h3>${esc(W.edge.name)} — ${esc(W.edge.title)}</h3><p>${esc(W.edge.body)}</p>${chips(W.edge.tech)}<p class="op-note">${esc(O.cam.demo)}</p></div>`);
    card('prod', blockCard(6, 9, `<p class="op-k">${esc(O.stack)}</p>${chips(W.trp.tech)}`));

    // 03
    const I = Y.id;
    const now = new Date().toLocaleTimeString(S.lang === 'tr' ? 'tr-TR' : 'en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
    card('s0', chapterHead('system') + ev(10) + `<div class="op-body"><div class="idc"><div class="idc-ph" aria-hidden="true">YEK</div><div><h3>${esc(C.profile.name)}</h3><p class="op-k">${esc(I.role)}</p></div></div>
      <dl class="kv"><dt>${esc(I.statusKey)}</dt><dd><i class="dot"></i>${esc(I.status)}</dd><dt>${esc(I.station)}</dt><dd>Anadolu Birlik Holding</dd>
      <dt>${esc(I.uptime)}</dt><dd>${S.monthsSince(C.profile.jobStart)} ${esc(W.months)}</dd><dt>${esc(I.local)}</dt><dd>${now} · Konya</dd><dt>${esc(I.coords)}</dt><dd>${esc(C.profile.coords)}</dd></dl></div>`);
    card('skills', `${ev(11)}<div class="op-body"><p class="op-k">${esc(Y.skills.label)} · ${esc(O.lockerHint)}</p><div class="tabs" id="skillTabs" role="tablist"></div><div class="matrix" id="matrix"></div></div>`);
    const E = Y.edu;
    card('edu', `${ev(12)}<div class="op-body"><p class="op-k">${esc(E.label)}</p><h3>${esc(E.degree)}</h3><p>${esc(E.school)}<br>${esc(E.grad)}</p>
      <p class="gpa"><b>3.08</b><span>/ 4.00 ${esc(E.gpa)}</span></p>${chips([E.note].concat(E.coursework))}</div>`);
    const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(16).padStart(8, '0').slice(0, 8);
    card('certs', `${ev(13)}<div class="op-body"><p class="op-k">${esc(Y.certs.label)}</p><ol class="certs">${Y.certs.items.map(c => `<li><span class="hash">0x${hash(c.title)}</span><div><b>${esc(c.title)}</b><small>${esc(c.issuer)}${c.year !== '—' ? ' · ' + esc(c.year) : ''}</small></div><span class="ok">[${esc(Y.certs.verified)}]</span></li>`).join('')}</ol></div>`);
    const tk = $('.op-radio .ev-k'); if (tk) tk.textContent = `${O.event} 14`;
    card('out', `${ev(15)}<div class="op-body"><h2 class="out-t">${esc(O.out.t)}</h2><p>${esc(O.out.d)}</p>
      <div class="out-a"><a href="mailto:${esc(C.profile.email)}">${esc(C.profile.email)}</a><a href="${esc(C.profile.github)}" target="_blank" rel="noopener">GitHub ↗</a><a href="${esc(C.profile.linkedin)}" target="_blank" rel="noopener">LinkedIn ↗</a><a href="#sehir" class="top">↺ ${esc(O.out.top)}</a></div></div>`);

    renderSkills(); renderTerm();
    // event lines: the fired text, or "awaiting"
    $$('.op').forEach(s => { const l = $('.ev-line', s); if (l) l.textContent = s._ev || O.waiting; });
  }

  /* ------------------------------------------------------------ skills matrix */
  let tab = -1;
  const USES = {
    trp: ['Python', 'FastAPI', 'SQLAlchemy', 'PostgreSQL', 'Redis/RQ', 'Alembic', 'React', 'TypeScript', 'Vite', 'Tailwind CSS', 'PWA', 'Leaflet / Google Maps', 'OR-Tools', 'OSRM', 'Docker', 'Docker Compose', 'nginx', 'GitHub Actions', 'Linux'],
    abh: ['Spring Boot (OpenFeign)', 'Microservices', 'Docker', 'Docker Compose', 'Linux'],
    edge: ['Computer Vision (YOLOv8)', 'Python']
  };
  const usage = n => { const u = ['trp', 'abh', 'edge'].filter(k => USES[k].includes(n)); return u.length ? u : ['cv']; };
  function renderSkills() {
    const SK = S.L().system.skills, tabs = $('#skillTabs'), mx = $('#matrix');
    if (!tabs) return;
    tabs.innerHTML = [SK.all, ...C.skills.map(g => SK.groups[g.id])].map((l, i) => `<button type="button" role="tab" data-i="${i - 1}" aria-selected="${i - 1 === tab}" style="--c:${i ? GROUP_COLORS[i - 1] : '#eef0ff'}">${esc(l)}${i ? ` · ${C.skills[i - 1].items.length}` : ''}</button>`).join('');
    const rows = [];
    C.skills.forEach((g, gi) => { if (tab === -1 || tab === gi) g.items.forEach(it => rows.push({ name: S.pick(it), en: typeof it === 'object' ? it.en : it, gi })); });
    const LG = SK.legend, cols = ['trp', 'abh', 'edge', 'cv'];
    mx.innerHTML = `<div class="legend"><b>${esc(SK.legendT)}</b>${cols.map(c => `<span><i class="led on ${c}"></i>${esc(LG[c])}</span>`).join('')}</div>` + rows.map((r, n) => {
      const used = usage(r.en);
      return `<div class="row" style="--n:${n};--c:${GROUP_COLORS[r.gi]}"><span class="nm">${esc(r.name)}</span><span class="leds">${cols.map(c => `<i class="led ${c}${used.includes(c) ? ' on' : ''}" title="${esc(LG[c])}"></i>`).join('')}</span></div>`;
    }).join('');
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('#skillTabs button');
    if (!b) return;
    tab = +b.dataset.i;
    renderSkills();
    dispatchEvent(new CustomEvent('op:locker', { detail: tab }));
    window.Sound && window.Sound.blip(600 + tab * 80);
  });

  /* ------------------------------------------------------------ radio terminal */
  const out = $('#termOut'), input = $('#termInput');
  const history = [];
  let hIdx = 0, game = null;
  function print(html, cls = '') { const d = document.createElement('div'); if (cls) d.className = cls; d.innerHTML = html; out.appendChild(d); out.scrollTop = out.scrollHeight; }
  const go = id => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); };
  function run(raw) {
    const cmd = raw.trim();
    if (!cmd) return;
    history.push(cmd); hIdx = history.length;
    print(esc(cmd), 'cmd');
    const T = S.L().system.comms;
    const [c, arg] = cmd.toLowerCase().split(/\s+/);
    switch (c) {
      case 'help': print(esc(T.help.join('\n').replace('city|work   ', 'city|work|system').replace('jump to chapter 01 / 02', 'jump to a chapter').replace('01 / 02. bölüme git', 'bölüme git'))); break;
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
      case 'city': go('sehir'); break;
      case 'work': go('isler'); break;
      case 'system': go('sistem'); break;
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
    $('#quick').innerHTML = ['help', 'whoami', 'skills', 'email', 'copy', 'github', 'linkedin', 'snake'].map(c => `<button type="button" data-c="${c}">${c}</button>`).join('');
    if (!out.childElementCount || out.dataset.intro === '1') { out.innerHTML = ''; print(esc(T.intro), 'acc'); out.dataset.intro = '1'; }
  }
  input.addEventListener('input', () => { out.dataset.intro = '0'; }, { once: true });
  let autoTyped = false;
  function autoType() {
    if (autoTyped || out.dataset.intro !== '1') return;
    autoTyped = true;
    const cmd = 'whoami';
    let i = 0;
    const step = () => {
      if (out.dataset.intro !== '1') return;
      input.value = cmd.slice(0, ++i);
      if (i < cmd.length) setTimeout(step, reduce ? 0 : 90);
      else setTimeout(() => { run(cmd); input.value = ''; }, reduce ? 0 : 250);
    };
    setTimeout(step, 400);
  }
  function snake() {
    if (game) return;
    const T = S.L().system.comms;
    const cv = document.createElement('canvas');
    const Wd = 28, Ht = 16, CELL = 14;
    cv.width = Wd * CELL; cv.height = Ht * CELL; cv.className = 'snake';
    out.appendChild(cv); out.scrollTop = out.scrollHeight;
    const g = cv.getContext('2d');
    let body = [[8, 8], [7, 8], [6, 8]], dir = [1, 0], next = [1, 0], food = [18, 8], score = 0, alive = true;
    const place = () => { do { food = [Math.floor(Math.random() * Wd), Math.floor(Math.random() * Ht)]; } while (body.some(b => b[0] === food[0] && b[1] === food[1])); };
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
      g.fillStyle = '#ffcc33'; g.fillRect(food[0] * CELL + 2, food[1] * CELL + 2, CELL - 4, CELL - 4);
      body.forEach((b, i) => { g.fillStyle = i ? '#39ff88' : '#b6ffd2'; g.fillRect(b[0] * CELL + 1, b[1] * CELL + 1, CELL - 2, CELL - 2); });
      g.fillStyle = '#b6ffd2'; g.font = '12px "JetBrains Mono", monospace'; g.fillText(`SCORE ${score}`, 6, 14);
    };
    const step = () => {
      if (!alive) return;
      dir = next;
      const h = [(body[0][0] + dir[0] + Wd) % Wd, (body[0][1] + dir[1] + Ht) % Ht];
      if (body.some(b => b[0] === h[0] && b[1] === h[1])) { end(); return; }
      body.unshift(h);
      if (h[0] === food[0] && h[1] === food[1]) { score++; place(); window.Sound && window.Sound.blip(1200); } else body.pop();
      draw();
    };
    const timer = setInterval(step, 95);
    function end() {
      if (!alive) return;
      alive = false; clearInterval(timer); removeEventListener('keydown', keys); game = null;
      print(`${esc(T.snakeOver)} ${score}`, 'acc');
      input.focus({ preventScroll: true });
    }
    game = { end };
    draw();
  }

  /* ------------------------------------------------------------ events */
  const lastVars = {};
  function fire(name, vars) {
    const s = name === 'term' ? $('.op-radio') : sec(name);
    if (!s) return;
    lastVars[name] = vars;
    const text = fill(S.L().op.ev[name] || '', vars);
    s._ev = text;
    const l = $('.ev-line', s);
    if (l) scramble(l, text, 600);
    s.classList.add('live');
    if (name === 'term') autoType();
    window.Sound && window.Sound.blip(880);
  }
  S.onLang(() => {
    Object.keys(lastVars).forEach(n => { const s = n === 'term' ? $('.op-radio') : sec(n); if (s) s._ev = fill(S.L().op.ev[n] || '', lastVars[n]); });
    render();
  });

  window.OpsUI = {
    WORK, SYS, render, fire,
    // no 3D: every card is open, each event line carries its scene's own numbers
    liveAll() {
      const D = { brief: { s: 24, r: 4 }, cab: { k: 6, n: 6 }, sync: { n: 4127 }, dock: { n: '3.000' }, edge: { n: 12 }, prod: { n: 6 }, skills: { n: C.skills.reduce((n, g) => n + g.items.length, 0) }, certs: { n: 3 } };
      WORK.concat(SYS).forEach(n => { lastVars[n] = D[n] || {}; const s = n === 'term' ? $('.op-radio') : sec(n); if (s) { s._ev = fill(S.L().op.ev[n] || '', lastVars[n]); s.classList.add('live'); const l = $('.ev-line', s); if (l) l.textContent = s._ev; } });
      autoType();
    }
  };
})();
