(() => {
  'use strict';

  const C = window.CONTENT;
  const root = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pick = v => (v && typeof v === 'object' && !Array.isArray(v) ? (v[lang] ?? v.en) : v);

  let lang = root.lang === 'en' ? 'en' : 'tr';
  let theme = root.dataset.theme === 'light' ? 'light' : 'dark';
  const L = () => C[lang];
  const t = key => key.split('.').reduce((o, k) => (o == null ? o : o[k]), L()) ?? '';

  const ACCENTS = ['var(--accent)', 'var(--accent-2)', 'var(--accent-3)', 'var(--accent-4)'];

  const ICONS = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowUpRight: '<path d="M7 17 17 7M8 7h9v9"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    github: '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
    linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6ZM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/>',
    server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
    layout: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/><path d="M10 10h4v4h-4z"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    cap: '<path d="M2 9 12 4l10 5-10 5L2 9Z"/><path d="M6 11v5c3 2 9 2 12 0v-5M22 9v6"/>',
    hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>',
    chart: '<path d="M3 20h18M6 16v-5M11 16V6M16 16v-8M21 16v-3"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
    sync: '<path d="M20 8A8.5 8.5 0 0 0 5 6.5L3.5 8"/><path d="M3.5 3.5V8H8"/><path d="M4 16a8.5 8.5 0 0 0 15 1.5l1.5-1.5"/><path d="M20.5 20.5V16H16"/>',
    database: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    cloud: '<path d="M7 18.5a4.5 4.5 0 1 1 .8-8.9A6 6 0 0 1 19.4 11 3.8 3.8 0 0 1 18 18.5H7Z"/>',
    team: '<circle cx="12" cy="7" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/>',
    palette: '<path d="M12 21a9 9 0 1 1 9-9c0 2.5-2 3.5-4 3.5h-2a2 2 0 0 0-1.5 3.3A1.4 1.4 0 0 1 12 21Z"/><circle cx="7.5" cy="11" r="1.1"/><circle cx="10.5" cy="7" r="1.1"/><circle cx="15" cy="7.5" r="1.1"/>'
  };
  const icon = (name, cls = '') => `<svg viewBox="0 0 24 24" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>${ICONS[name] || ''}</svg>`;

  /* ======================================================================
     Text scramble
     ====================================================================== */
  const GLYPHS = '!<>-_\\/[]{}=+*^?#ABCDEFXYZ0123456789';
  function scramble(el, text, dur = 800) {
    if (reduce) { el.textContent = text; return; }
    cancelAnimationFrame(el._scr);
    const from = el.textContent;
    const len = Math.max(from.length, text.length);
    const q = [];
    for (let i = 0; i < len; i++) {
      const start = Math.random() * dur * 0.45;
      q.push({ from: from[i] || '', to: text[i] || '', start, end: start + dur * 0.25 + Math.random() * dur * 0.3 });
    }
    const t0 = performance.now();
    const tick = now => {
      const el_t = now - t0;
      let out = '', done = 0;
      for (const c of q) {
        if (el_t >= c.end) { out += esc(c.to); done++; }
        else if (el_t >= c.start && c.to !== ' ') out += `<span class="glyph">${esc(GLYPHS[(Math.random() * GLYPHS.length) | 0])}</span>`;
        else out += esc(c.from);
      }
      el.innerHTML = out;
      if (done < q.length) el._scr = requestAnimationFrame(tick);
      else el.textContent = text;
    };
    el._scr = requestAnimationFrame(tick);
  }

  const splitHTML = s => s.split(' ').map((w, i) => `<span class="w"><span style="--i:${i}">${esc(w)}</span></span>`).join(' ');

  // Replay the word-by-word reveal on visible split headings (after a language change).
  function replaySplits() {
    $$('.split.in').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      el.classList.remove('in');
      void el.offsetWidth;
      el.classList.add('in');
    });
  }

  /* ======================================================================
     Renderers
     ====================================================================== */
  function renderStatic() {
    $$('[data-i18n]').forEach(el => {
      const v = t(el.dataset.i18n);
      if (typeof v !== 'string') return;
      cancelAnimationFrame(el._scr);
      if (el.hasAttribute('data-split')) el.innerHTML = splitHTML(v);
      else el.textContent = v;
    });
    $$('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    $$('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
    $$('[data-i18n-ph]').forEach(el => el.setAttribute('placeholder', t(el.dataset.i18nPh)));
    $$('.kbd-key').forEach(el => { el.textContent = isMac ? '⌘K' : 'Ctrl K'; });

    document.title = t('meta.title');
    $('meta[name="description"]')?.setAttribute('content', t('meta.description'));

    const email = $('#emailLink');
    email.textContent = C.profile.email;
    email.href = `mailto:${C.profile.email}`;
    $('#ghLink').href = C.profile.github;
    $('#liLink').href = C.profile.linkedin;
    $('#year').textContent = new Date().getFullYear();

    const sw = $('.lang-switch');
    sw.dataset.active = lang;
    $$('button', sw).forEach(b => {
      b.classList.toggle('on', b.dataset.lang === lang);
      b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
    });
  }

  function renderAbout() {
    $('#aboutBody').innerHTML = L().about.body.map(p => `<p>${esc(p)}</p>`).join('');

    const techCount = C.skills.reduce((n, g) => n + g.items.length, 0);
    const s = L().about.stats;
    const stats = [
      { v: techCount, label: s.tech, suffix: '' },
      { v: L().experience.items.length, label: s.companies, suffix: '' },
      { v: L().education.certs.length, label: s.certs, suffix: '' },
      { v: 3.08, dec: 2, label: s.cgpa, suffix: '<small>/4</small>' }
    ];
    $('#stats').innerHTML = stats.map((x, i) => `
      <div class="stat card spotlight reveal" style="--d:${i * 0.08}s">
        <span class="stat-num"><span data-count="${x.v}" data-dec="${x.dec || 0}">0</span>${x.suffix}</span>
        <span class="stat-label">${esc(x.label)}</span>
      </div>`).join('');
  }

  function renderExperience() {
    $('#expList').innerHTML = L().experience.items.map((x, i) => `
      <article class="exp-item reveal" style="--d:${i * 0.08}s">
        <div class="exp-when">
          <span>${esc(x.period)}</span>
          ${x.current ? `<span class="now-badge"><i></i>${esc(t('ui.present'))}</span>` : ''}
        </div>
        <span class="exp-dot" aria-hidden="true"></span>
        <div class="exp-card card spotlight">
          <div class="exp-top">
            <div class="exp-logo" aria-hidden="true">${esc(x.company.charAt(0))}</div>
            <div>
              <h3>${esc(x.role)}</h3>
              <p class="exp-company">${esc(x.company)} · ${esc(x.location)}</p>
            </div>
          </div>
          <ul class="exp-points">${x.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
          <div class="tags">${x.tags.map(g => `<span class="tag">${esc(g)}</span>`).join('')}</div>
          ${x.project ? `<a class="exp-link" href="#projects">${esc(x.project)} ${icon('arrow')}</a>` : ''}
        </div>
      </article>`).join('');
  }

  // Street-routed map drawn by the same planner as the hero (seeded, so it is stable).
  const routePlans = {};
  function routeVisual(p, h = 330) {
    const plan = routePlans[h] || (routePlans[h] = window.VRP.planSVG(640, h, { seed: 11, stops: 18, vehicles: 4 }));
    const f = v => v.toFixed(1);
    const streets = main => plan.streets.filter(e => !!e.main === main).map(e => `M${f(e.a.x)} ${f(e.a.y)}L${f(e.b.x)} ${f(e.b.y)}`).join('');
    const dp = plan.depot;
    const svg = `
      <svg class="route-svg" viewBox="0 0 640 ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path class="street" d="${streets(false)}"/>
        <path class="street main" d="${streets(true)}"/>
        ${plan.routes.map((r, i) => `
          <path id="rp-${i}" class="ghost" d="${r.d}" style="stroke:${ACCENTS[r.color]}"/>
          <path class="draw" pathLength="1" d="${r.d}" style="stroke:${ACCENTS[r.color]};--delay:${0.2 + i * 0.25}s"/>
        `).join('')}
        ${plan.routes.map((r, i) => `
          ${r.stops.map(q => `<circle class="stop" cx="${f(q.x)}" cy="${f(q.y)}" r="4.5" style="stroke:${ACCENTS[r.color]}"/>`).join('')}
          ${reduce ? '' : [[10, 0.22], [4.5, 1]].map(([rad, op]) => `<circle class="veh" r="${rad}" style="fill:${ACCENTS[r.color]};opacity:${op}"><animateMotion dur="${(r.len / 70).toFixed(1)}s" repeatCount="indefinite"><mpath href="#rp-${i}" xlink:href="#rp-${i}"/></animateMotion></circle>`).join('')}
        `).join('')}
        <circle class="depot-ring" cx="${f(dp.x)}" cy="${f(dp.y)}" r="12"/>
        <rect class="depot" x="${f(dp.x - 7)}" y="${f(dp.y - 7)}" width="14" height="14" rx="3"/>
      </svg>`;
    return `
      ${svg}
      <span class="visual-chip tr">OSRM · OR-Tools</span>
      <div class="role-pills">${p.roles.map((r, i) => `<span><i style="background:${ACCENTS[i]}"></i>${esc(r)}</span>`).join('')}</div>`;
  }

  function visionVisual() {
    const boxes = [
      { l: 12, t: 30, w: 24, h: 52, c: 'var(--accent)', label: 'person 0.94', dl: '0s' },
      { l: 46, t: 46, w: 34, h: 36, c: 'var(--accent-3)', label: 'forklift 0.88', dl: '.5s' },
      { l: 62, t: 16, w: 18, h: 24, c: 'var(--accent-4)', label: 'pallet 0.91', dl: '1s' }
    ];
    return `
      <div class="vision" aria-hidden="true">
        <div class="vision-grid"></div>
        ${boxes.map(b => `<div class="obj" style="left:${b.l + 3}%;top:${b.t + 6}%;width:${b.w - 6}%;height:${b.h - 10}%"></div>`).join('')}
        ${boxes.map(b => `<div class="bbox" style="left:${b.l}%;top:${b.t}%;width:${b.w}%;height:${b.h}%;--c:${b.c};--dl:${b.dl}"><span>${b.label}</span></div>`).join('')}
        <div class="vision-scan"></div>
        <span class="corner a"></span><span class="corner b"></span><span class="corner c"></span><span class="corner d"></span>
        <div class="vision-hud"><span class="rec"></span>LIVE · YOLOv8 · Hailo</div>
      </div>`;
  }

  const tagList = tags => `<div class="tags">${tags.map(g => `<span class="tag">${esc(g)}</span>`).join('')}</div>`;

  function pipelineHTML(pl) {
    return `
      <div class="pipeline" aria-hidden="true">
        ${pl.steps.map((s, i) => `${i ? '<i class="pl-link"><b></b></i>' : ''}<span class="pl-step${i === 2 ? ' pl-worker' : ''}">${esc(s)}</span>`).join('')}
        <span class="pl-dlq">↳ DLQ · ${esc(pl.dlq)}</span>
      </div>`;
  }

  function featuredCard(p) {
    const blocks = p.blocks.map((b, i) => `
      <div class="feature${b.span === 2 ? ' span2' : ''}" style="--c:${ACCENTS[i % 4]}">
        <div class="feature-head"><span class="feature-icon">${icon(b.icon)}</span><h4>${esc(b.title)}</h4></div>
        <p>${esc(b.text)}</p>
        ${b.sub ? `<ul>${b.sub.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        ${b.pipeline ? pipelineHTML(b.pipeline) : ''}
      </div>`).join('');
    return `
      <article class="project featured card spotlight reveal">
        <div class="featured-top">
          <div class="project-visual">${routeVisual(p, 480)}</div>
          <div class="project-body">
            <span class="project-badge">${esc(p.badge)}</span>
            <h3>${esc(p.title)}</h3>
            <p class="project-role">${icon('team')}<span>${esc(p.role)}</span></p>
            <p class="project-summary">${esc(p.summary)}</p>
            ${tagList(p.tags)}
          </div>
        </div>
        <div class="feature-grid">${blocks}</div>
      </article>`;
  }

  function renderProjects() {
    const P = L().projects;
    const cards = P.items.map((p, i) => p.featured ? featuredCard(p) : `
      <article class="project card spotlight reveal side" style="--d:${i * 0.1}s" data-tilt>
        <div class="project-visual">${visionVisual()}</div>
        <div class="project-body">
          <span class="project-badge">${esc(p.badge)}</span>
          <h3>${esc(p.title)}</h3>
          <p class="project-sub">${esc(p.subtitle)}</p>
          <ul>${p.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
          ${tagList(p.tags)}
        </div>
      </article>`).join('');
    const more = `
      <a class="project more card spotlight reveal" style="--d:.15s" href="${esc(C.profile.github)}" target="_blank" rel="noopener">
        <span class="gh-icon">${icon('github')}</span>
        <div><h3>${esc(P.more.title)}</h3><p>${esc(P.more.body)}</p></div>
        <span class="go">${esc(P.more.cta)} ${icon('arrowUpRight')}</span>
      </a>`;
    $('#projectGrid').innerHTML = cards + more;
  }

  function renderSkills() {
    const G = L().skills.groups;
    $('#skillGrid').innerHTML = C.skills.map((g, i) => `
      <div class="skill-card card spotlight reveal" style="--d:${(i % 2) * 0.08}s;--c:${ACCENTS[i]}">
        <div class="skill-head">
          <span class="skill-icon">${icon(g.icon)}</span>
          <h3>${esc(G[g.id])}</h3>
          <span class="skill-count">${String(g.items.length).padStart(2, '0')}</span>
        </div>
        <div class="chips">${g.items.map(s => `<span class="chip"><i></i>${esc(pick(s))}</span>`).join('')}</div>
      </div>`).join('');

    const all = C.skills.flatMap(g => g.items.map(pick));
    const row = items => items.map(s => `<span class="mq-item">${esc(s)}</span>`).join('');
    const half = Math.ceil(all.length / 2);
    const a = all.slice(0, half), b = all.slice(half).reverse();
    $('#marquee').innerHTML = `
      <div class="mq-track">${row(a)}${row(a)}</div>
      <div class="mq-track rev">${row(b)}${row(b)}</div>`;
  }

  function renderEducation() {
    const E = L().education;
    const cgpa = 3.08, max = 4;
    const off = (100 - (cgpa / max) * 100).toFixed(2);
    $('#eduGrid').innerHTML = `
      <div class="edu-card card spotlight reveal">
        <div class="edu-head">
          <span class="edu-icon">${icon('cap')}</span>
          <div>
            <p class="edu-date">${esc(E.date)}</p>
            <h3>${esc(E.degree)}</h3>
            <p class="edu-school">${esc(E.school)}</p>
          </div>
        </div>
        <div class="edu-body">
          <div class="gpa" role="img" aria-label="${esc(E.cgpaLabel)} 3.08 / 4.00">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <defs><linearGradient id="gpaGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--accent)"/><stop offset="1" style="stop-color:var(--accent-2)"/></linearGradient></defs>
              <circle class="ring-bg" cx="60" cy="60" r="52"/>
              <circle class="ring-fg" cx="60" cy="60" r="52" pathLength="100" style="--off:${off}"/>
            </svg>
            <div class="gpa-val"><b data-count="3.08" data-dec="2">0</b><span>/ 4.00 · ${esc(E.cgpaLabel)}</span></div>
          </div>
          <div>
            <p class="edu-meta-label">${esc(E.courseworkLabel)}</p>
            <div class="chips">${E.coursework.map((c, i) => `<span class="chip" style="--c:${ACCENTS[i % 4]}"><i></i>${esc(c)}</span>`).join('')}</div>
            <span class="edu-note">${esc(E.note)}</span>
          </div>
        </div>
      </div>
      <div class="certs">
        <h3 class="reveal">${esc(E.certsTitle)}</h3>
        <ol class="cert-list">
          ${E.certs.map((c, i) => `
            <li class="cert card spotlight reveal" style="--d:${i * 0.08}s">
              <span class="cert-idx">${String(i + 1).padStart(2, '0')}</span>
              <div><h4>${esc(c.title)}</h4><p>${esc(c.issuer)}</p></div>
              ${c.year ? `<span class="cert-year">${esc(c.year)}</span>` : ''}
            </li>`).join('')}
        </ol>
      </div>`;
  }

  /* ======================================================================
     Reveal / count-up / terminal
     ====================================================================== */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      en.target.classList.add('in');
      onReveal(en.target, false);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  function observeReveals(instant) {
    $$('.reveal:not(.in)').forEach(el => {
      if (instant && el.getBoundingClientRect().top < innerHeight) {
        el.classList.add('in');
        onReveal(el, true);
      } else {
        io.observe(el);
      }
    });
  }

  function onReveal(el, instant) {
    $$('[data-count]', el).forEach(n => countUp(n, instant));
    if (el.id === 'terminal') { termStarted = true; typeTerminal(instant); }
  }

  function countUp(el, instant) {
    const to = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.dec || '0', 10);
    const fmt = v => v.toFixed(dec);
    if (instant || reduce) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 1600;
    const tick = now => {
      const p = clamp((now - t0) / dur, 0, 1);
      el.textContent = fmt(to * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  let termToken = 0, termStarted = false;
  async function typeTerminal(instant) {
    const token = ++termToken;
    const body = $('#termBody');
    const lines = L().about.terminal;
    const prompt = '<span class="term-prompt">➜</span> <span class="term-path">~</span> ';
    if (instant || reduce) {
      body.innerHTML = lines.map(l => `<div class="term-line">${prompt}${esc(l.cmd)}</div><div class="term-out">${esc(l.out)}</div>`).join('') +
        `<div class="term-line">${prompt}<span class="term-caret"></span></div>`;
      return;
    }
    body.innerHTML = '';
    for (const l of lines) {
      const row = document.createElement('div');
      row.className = 'term-line';
      row.innerHTML = `${prompt}<span class="term-cmd"></span><span class="term-caret"></span>`;
      body.appendChild(row);
      const cmd = $('.term-cmd', row);
      await sleep(260);
      for (const ch of l.cmd) {
        if (token !== termToken) return;
        cmd.textContent += ch;
        await sleep(38 + Math.random() * 55);
      }
      await sleep(220);
      if (token !== termToken) return;
      $('.term-caret', row).remove();
      const out = document.createElement('div');
      out.className = 'term-out';
      out.textContent = l.out;
      body.appendChild(out);
    }
    if (token !== termToken) return;
    const end = document.createElement('div');
    end.className = 'term-line';
    end.innerHTML = `${prompt}<span class="term-caret"></span>`;
    body.appendChild(end);
  }

  /* ======================================================================
     Hero: role rotator + local time
     ====================================================================== */
  let roleTimer = 0, roleIdx = 0;
  function startRoles() {
    clearInterval(roleTimer);
    const el = $('#role');
    const roles = t('hero.roles');
    roleIdx = 0;
    el.textContent = '';
    scramble(el, roles[0], 900);
    if (reduce) return;
    roleTimer = setInterval(() => {
      roleIdx = (roleIdx + 1) % roles.length;
      scramble(el, roles[roleIdx], 900);
    }, 2800);
  }

  function updateTime() {
    const fmt = new Intl.DateTimeFormat(lang === 'tr' ? 'tr-TR' : 'en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
    $('#localTime').textContent = fmt.format(new Date());
  }
  setInterval(updateTime, 20000);

  /* ======================================================================
     Pointer effects: spotlight, tilt, magnetic, cursor
     ====================================================================== */
  const bgLit = $('#bgLit');
  const bgDots = $('#bgLit > i');
  const pointer = { x: -999, y: -999, target: null, queued: false };
  const pointerJobs = [];

  function flushPointer() {
    pointer.queued = false;
    const { x, y, target } = pointer;
    const el = target && target.closest && target.closest('.spotlight');
    if (el) {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${x - r.left}px`);
      el.style.setProperty('--my', `${y - r.top}px`);
    }
    if (fine && !reduce) {
      bgLit.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      bgDots.style.transform = `translate3d(${240 - x}px, ${240 - y}px, 0)`;
    }
    pointerJobs.forEach(fn => fn(x, y, target));
  }

  document.addEventListener('pointermove', e => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.target = e.target;
    if (!pointer.queued) { pointer.queued = true; requestAnimationFrame(flushPointer); }
  }, { passive: true });

  function bindTilt() {
    if (!fine || reduce) return;
    $$('[data-tilt]').forEach(el => {
      if (el._tilt) return;
      el._tilt = true;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transition = 'transform .15s ease-out, border-color .3s';
        el.style.transform = `perspective(1100px) rotateX(${(-py * 5).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg) translateY(-4px)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transition = '';
        el.style.transform = '';
      });
    });
  }

  function bindMagnetic() {
    if (!fine || reduce) return;
    $$('[data-magnetic]').forEach(el => {
      if (el._mag) return;
      el._mag = true;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.22}px, ${y * 0.32}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  function initCursor() {
    if (!fine || reduce) return;
    const ring = $('.cursor-ring');
    let x = -100, y = -100, tx = -100, ty = -100, running = false;
    document.body.classList.add('has-cursor');
    const loop = () => {
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;
      ring.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1) requestAnimationFrame(loop);
      else running = false;
    };
    let hovering = false, out = true;
    pointerJobs.push((px, py, target) => {
      tx = px; ty = py;
      if (out) { out = false; ring.classList.remove('out'); }
      const h = !!(target && target.closest && target.closest('a, button, [data-tilt], .chip, .tag, input'));
      if (h !== hovering) { hovering = h; ring.classList.toggle('hover', h); }
      if (!running) { running = true; requestAnimationFrame(loop); }
    });
    addEventListener('pointerdown', () => ring.classList.add('down'));
    addEventListener('pointerup', () => ring.classList.remove('down'));
    document.addEventListener('pointerleave', () => { out = true; ring.classList.add('out'); });
  }

  /* ======================================================================
     Nav: indicator, active section, scroll state, mobile menu
     ====================================================================== */
  const navLinks = $('#navLinks');
  const ind = document.createElement('span');
  ind.className = 'nav-ind';
  ind.setAttribute('aria-hidden', 'true');
  navLinks.appendChild(ind);
  let activeLink = null;

  function moveInd(a) {
    if (!a) { ind.style.opacity = '0'; return; }
    ind.style.opacity = '1';
    ind.style.width = `${a.offsetWidth}px`;
    ind.style.transform = `translateX(${a.offsetLeft}px)`;
  }

  $$('a', navLinks).forEach(a => {
    a.addEventListener('mouseenter', () => {
      moveInd(a);
      if (fine) scramble(a, t(a.dataset.i18n), 450);
    });
    a.addEventListener('click', closeMenu);
  });
  navLinks.addEventListener('mouseleave', () => moveInd(activeLink));

  const sectionIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const a = $(`a[href="#${en.target.id}"]`, navLinks);
      $$('a', navLinks).forEach(x => x.classList.toggle('active', x === a));
      activeLink = a;
      moveInd(a);
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main > section[id]').forEach(s => sectionIO.observe(s));

  const nav = $('#nav');
  const bar = $('.progress span');
  const tl = $('#expList');
  let ticking = false, wasScrolled = null, lastFill = -1;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      // reads
      const y = scrollY;
      const max = document.documentElement.scrollHeight - innerHeight;
      const r = tl.getBoundingClientRect();
      const inView = r.bottom > 0 && r.top < innerHeight;
      const dots = inView ? $$('.exp-dot', tl).map(d => { const b = d.getBoundingClientRect(); return b.top + b.height / 2; }) : null;
      // writes
      bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
      const scrolled = y > 24;
      if (scrolled !== wasScrolled) { wasScrolled = scrolled; nav.classList.toggle('scrolled', scrolled); }
      boostMarquee(y - lastY);
      lastY = y;
      if (inView) {
        const p = clamp((innerHeight * 0.62 - r.top) / r.height, 0, 1);
        if (Math.abs(p - lastFill) > 0.0005) {
          lastFill = p;
          tl.style.setProperty('--fill', p.toFixed(4));
          $$('.exp-item', tl).forEach((item, i) => item.classList.toggle('lit', dots[i] <= r.top + p * r.height + 1));
        }
      }
    });
  }
  addEventListener('scroll', onScroll, { passive: true });

  // Marquee speeds up and leans with scroll velocity, then eases back.
  let lastY = scrollY, boost = 0, boosting = false;
  function boostMarquee(dy) {
    if (reduce || !dy) return;
    boost = Math.min(7, boost + Math.abs(dy) * 0.035);
    if (!boosting) { boosting = true; requestAnimationFrame(decay); }
  }
  const mq = $('#marquee');
  let mqAnims = [];
  function decay() {
    boost *= 0.92;
    const done = boost < 0.02;
    if (done) boost = 0;
    if (!mqAnims.length || !mqAnims[0].effect || !mqAnims[0].effect.target.isConnected) {
      mqAnims = $$('.mq-track', mq).flatMap(tr => tr.getAnimations());
    }
    mqAnims.forEach(a => { a.playbackRate = 1 + boost; });
    mq.style.transform = boost ? `skewX(${(-boost * 0.9).toFixed(2)}deg)` : '';
    if (done) boosting = false;
    else requestAnimationFrame(decay);
  }
  addEventListener('resize', () => { onScroll(); moveInd(activeLink); });

  const burger = $('#burger');
  function closeMenu() {
    document.body.classList.remove('menu-open', 'locked');
    burger.setAttribute('aria-expanded', 'false');
  }
  burger.addEventListener('click', () => {
    const open = !document.body.classList.contains('menu-open');
    document.body.classList.toggle('menu-open', open);
    document.body.classList.toggle('locked', open);
    burger.setAttribute('aria-expanded', String(open));
  });

  /* ======================================================================
     Language & theme
     ====================================================================== */
  const offIO = new IntersectionObserver(entries => entries.forEach(en => {
    const off = !en.isIntersecting;
    en.target.classList.toggle('is-off', off);
    $$('svg', en.target).forEach(svg => {
      if (svg.pauseAnimations) off ? svg.pauseAnimations() : svg.unpauseAnimations();
    });
  }), { rootMargin: '120px 0px' });
  function watchOffscreen() {
    ['#hero', '#projectGrid', '#marquee', '#wordmark', '#terminal', '.contact'].forEach(sel => {
      const el = $(sel);
      if (!el) return;
      offIO.unobserve(el);
      offIO.observe(el);
    });
  }

  function renderAll(instant) {
    renderStatic();
    renderAbout();
    renderExperience();
    renderProjects();
    renderSkills();
    renderEducation();
    startRoles();
    updateTime();
    bindTilt();
    bindMagnetic();
    observeReveals(instant);
    watchOffscreen();
    if (termStarted) typeTerminal(true);
    requestAnimationFrame(() => { moveInd(activeLink); onScroll(); });
    if (paletteOpen) renderPalette();
  }

  function setLang(next) {
    if (next === lang) return;
    const apply = () => {
      lang = next;
      root.lang = next;
      store.set('lang', next);
      renderAll(true);
      replaySplits();
    };
    if (document.startViewTransition && !reduce) {
      root.classList.add('vt-lang');
      const vt = document.startViewTransition(apply);
      vt.finished.finally(() => root.classList.remove('vt-lang'));
    } else {
      apply();
    }
  }

  $$('.lang-switch button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));

  function applyTheme(next) {
    theme = next;
    root.dataset.theme = next;
    store.set('theme', next);
    $('meta[name="theme-color"]').setAttribute('content', next === 'light' ? '#f5f4ef' : '#07080c');
    window.VRP && window.VRP.refresh();
  }

  // Circular reveal of the new state, expanding from the given button.
  function revealFrom(btn, change) {
    if (!document.startViewTransition || reduce) { change(); return; }
    const r = btn.getBoundingClientRect();
    const visible = r.width > 0 && r.bottom > 0;
    const x = visible ? r.left + r.width / 2 : innerWidth / 2;
    const y = visible ? r.top + r.height / 2 : 0;
    const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.classList.add('vt-theme');
    const vt = document.startViewTransition(change);
    vt.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] },
        { duration: 700, easing: 'cubic-bezier(.2,.75,.15,1)', pseudoElement: '::view-transition-new(root)' }
      );
    });
    vt.finished.finally(() => root.classList.remove('vt-theme'));
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    revealFrom($('#themeToggle'), () => applyTheme(next));
  }
  $('#themeToggle').addEventListener('click', toggleTheme);

  const ACCENT_NAMES = ['aurora', 'sunset', 'ocean', 'lime'];
  let accent = ACCENT_NAMES.includes(root.dataset.accent) ? root.dataset.accent : 'aurora';

  function setAccent(next) {
    if (next === accent) return;
    revealFrom($('#accentToggle'), () => {
      accent = next;
      if (next === 'aurora') delete root.dataset.accent;
      else root.dataset.accent = next;
      store.set('accent', next);
      window.VRP && window.VRP.refresh();
    });
    toast(`${t('ui.accent')}: ${t('ui.accents')[next]}`);
  }
  $('#accentToggle').addEventListener('click', () => {
    setAccent(ACCENT_NAMES[(ACCENT_NAMES.indexOf(accent) + 1) % ACCENT_NAMES.length]);
  });

  // Follow OS theme changes only if the user never picked one.
  matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', e => {
    if (!store.get('theme')) { applyTheme(e.matches ? 'light' : 'dark'); store.set('theme', ''); }
  });

  /* ======================================================================
     Clipboard + toast
     ====================================================================== */
  let toastTimer = 0;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  async function copyEmail() {
    const email = C.profile.email;
    try {
      await navigator.clipboard.writeText(email);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = email;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (err) { /* ignore */ }
      ta.remove();
    }
    const btn = $('#copyEmail');
    btn.classList.add('done');
    setTimeout(() => btn.classList.remove('done'), 1800);
    toast(t('ui.copied'));
  }
  $('#copyEmail').addEventListener('click', copyEmail);

  /* ======================================================================
     Command palette (Ctrl/⌘ + K)
     ====================================================================== */
  const palette = $('#palette');
  const pInput = $('#paletteInput');
  const pList = $('#paletteList');
  let paletteOpen = false, pItems = [], pActive = 0, lastFocus = null;

  function commands() {
    const u = L().ui, n = L().nav;
    const go = id => () => $(`#${id}`).scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    return [
      ...['about', 'experience', 'projects', 'skills', 'education', 'contact'].map(id => ({
        group: u.groupNav, label: `${u.goTo}: ${n[id]}`, icon: 'hash', run: go(id), keys: id
      })),
      { group: u.groupActions, label: u.switchLang, icon: 'globe', run: () => setLang(lang === 'tr' ? 'en' : 'tr'), keys: 'language dil english türkçe turkish' },
      { group: u.groupActions, label: u.toggleTheme, icon: 'sun', run: toggleTheme, keys: 'theme tema dark light koyu açık' },
      ...ACCENT_NAMES.map(name => ({
        group: u.groupActions, label: `${u.accent}: ${u.accents[name]}${name === accent ? ' ✓' : ''}`, icon: 'palette', run: () => setAccent(name), keys: `accent color renk tema ${name}`
      })),
      { group: u.groupActions, label: u.copyEmail, icon: 'copy', run: copyEmail, keys: 'email mail' },
      { group: u.groupLinks, label: 'GitHub', icon: 'github', run: () => window.open(C.profile.github, '_blank', 'noopener'), keys: 'code kod' },
      { group: u.groupLinks, label: 'LinkedIn', icon: 'linkedin', run: () => window.open(C.profile.linkedin, '_blank', 'noopener'), keys: 'profile profil' },
      { group: u.groupLinks, label: u.sendEmail, icon: 'mail', run: () => { location.href = `mailto:${C.profile.email}`; }, keys: 'email mail contact iletişim' }
    ];
  }

  const norm = s => s.toLocaleLowerCase(lang === 'tr' ? 'tr-TR' : 'en-US');
  function fuzzy(text, q) {
    let i = 0;
    for (const ch of text) { if (ch === q[i]) i++; if (i === q.length) return true; }
    return !q.length;
  }

  function highlight(label, q) {
    if (!q) return esc(label);
    const idx = norm(label).indexOf(q);
    if (idx < 0) return esc(label);
    return esc(label.slice(0, idx)) + '<mark>' + esc(label.slice(idx, idx + q.length)) + '</mark>' + esc(label.slice(idx + q.length));
  }

  function renderPalette() {
    const q = norm(pInput.value.trim());
    pItems = commands().filter(c => {
      const hay = norm(`${c.label} ${c.keys || ''}`);
      return !q || hay.includes(q) || fuzzy(hay, q);
    });
    pActive = clamp(pActive, 0, Math.max(0, pItems.length - 1));
    if (!pItems.length) {
      pList.innerHTML = `<li class="palette-empty">${esc(t('ui.paletteEmpty'))}</li>`;
      return;
    }
    let html = '', group = '';
    pItems.forEach((c, i) => {
      if (c.group !== group) { group = c.group; html += `<li class="palette-group" role="presentation">${esc(group)}</li>`; }
      html += `<li class="palette-item${i === pActive ? ' active' : ''}" role="option" id="pi-${i}" data-i="${i}" aria-selected="${i === pActive}">${icon(c.icon)}<span>${highlight(c.label, q)}</span><span class="ret">↵</span></li>`;
    });
    pList.innerHTML = html;
    pInput.setAttribute('aria-activedescendant', `pi-${pActive}`);
  }

  function setActive(i) {
    if (!pItems.length) return;
    pActive = (i + pItems.length) % pItems.length;
    $$('.palette-item', pList).forEach(el => {
      const on = +el.dataset.i === pActive;
      el.classList.toggle('active', on);
      el.setAttribute('aria-selected', String(on));
      if (on) el.scrollIntoView({ block: 'nearest' });
    });
    pInput.setAttribute('aria-activedescendant', `pi-${pActive}`);
  }

  function openPalette() {
    if (paletteOpen) return;
    paletteOpen = true;
    lastFocus = document.activeElement;
    closeMenu();
    palette.hidden = false;
    pInput.value = '';
    pActive = 0;
    renderPalette();
    document.body.classList.add('locked');
    requestAnimationFrame(() => { palette.classList.add('open'); pInput.focus(); });
  }

  function closePalette() {
    if (!paletteOpen) return;
    paletteOpen = false;
    palette.classList.remove('open');
    document.body.classList.remove('locked');
    setTimeout(() => { if (!paletteOpen) palette.hidden = true; }, 260);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function runActive(i = pActive) {
    const c = pItems[i];
    if (!c) return;
    closePalette();
    setTimeout(c.run, 60);
  }

  $('#openPalette').addEventListener('click', openPalette);
  palette.addEventListener('click', e => { if (e.target.hasAttribute('data-close')) closePalette(); });
  pInput.addEventListener('input', () => { pActive = 0; renderPalette(); });
  pList.addEventListener('pointermove', e => {
    const li = e.target.closest('.palette-item');
    if (li && +li.dataset.i !== pActive) setActive(+li.dataset.i);
  });
  pList.addEventListener('click', e => {
    const li = e.target.closest('.palette-item');
    if (li) runActive(+li.dataset.i);
  });
  pInput.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(pActive + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(pActive - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); runActive(); }
    else if (e.key === 'Tab') { e.preventDefault(); setActive(pActive + (e.shiftKey ? -1 : 1)); }
  });

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      paletteOpen ? closePalette() : openPalette();
    } else if (e.key === 'Escape') {
      if (paletteOpen) closePalette();
      else closeMenu();
    }
  });

  /* ======================================================================
     Boot
     ====================================================================== */
  function splitName() {
    const el = $('#nameFirst');
    el.innerHTML = [...el.textContent].map(ch => (ch === ' ' ? ' ' : `<span class="ch">${esc(ch)}</span>`)).join('');
  }

  function initWordmark() {
    const wm = $('#wordmark');
    if (!fine) return;
    wm.addEventListener('pointermove', e => {
      const r = $('.wm-fill', wm).getBoundingClientRect();
      wm.style.setProperty('--wx', `${e.clientX - r.left}px`);
      wm.style.setProperty('--wy', `${e.clientY - r.top}px`);
    });
  }

  function runIntro() {
    const el = $('#loader');
    const num = $('#loaderCount');
    const path = $('.lr-draw', el);
    const dots = $$('circle', el);
    const dur = 1500, t0 = performance.now();
    return new Promise(resolve => {
      const tick = now => {
        const p = clamp((now - t0) / dur, 0, 1);
        const e = 1 - Math.pow(1 - p, 3);
        num.textContent = String(Math.round(e * 100)).padStart(3, '0');
        path.style.strokeDashoffset = String(1 - e);
        dots.forEach((d, i) => d.classList.toggle('on', e >= i / (dots.length - 1) - 0.001));
        if (p < 1) { requestAnimationFrame(tick); return; }
        try { sessionStorage.setItem('introSeen', '1'); } catch (err) { /* ignore */ }
        setTimeout(() => {
          el.classList.add('done');
          resolve();
          setTimeout(() => root.classList.remove('intro'), 1100);
        }, 220);
      };
      requestAnimationFrame(tick);
    });
  }

  splitName();
  renderAll(false);
  initCursor();
  initWordmark();
  onScroll();

  const boot = () => requestAnimationFrame(() => document.body.classList.add('loaded'));
  const fontsReady = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, sleep(900)]) : Promise.resolve();
  if (root.classList.contains('intro')) {
    Promise.all([fontsReady, runIntro()]).then(() => setTimeout(boot, 250));
  } else {
    fontsReady.then(boot);
  }
})();
