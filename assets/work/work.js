/* Chapter 02 — brutalist editorial: rendering, letter-stretch hover,
   street-map figure, horizontal gallery and the inverting cursor. */
(() => {
  'use strict';
  const S = window.Site;
  const { $, $$, esc, reduce, fine } = S;
  const root = document.documentElement;

  /* letters that widen under the pointer (variable font 'wdth' axis) */
  function stretchHTML(text, base = 62) {
    let i = 0;
    return text.split(' ').map(word => `<span class="wd">${[...word].map(ch => `<span class="l" style="--i:${i++};--w:${base}">${esc(ch)}</span>`).join('')}</span>`).join(' ');
  }
  function bindStretch(el, base = 62) {
    if (!fine || reduce || el._bound) return;
    el._bound = true;
    el.addEventListener('pointermove', e => {
      $$('.l', el).forEach(l => {
        const r = l.getBoundingClientRect();
        const d = Math.abs(e.clientX - (r.left + r.width / 2));
        l.style.setProperty('--w', Math.round(base + (125 - base) * Math.max(0, 1 - d / 260)));
      });
    });
    el.addEventListener('pointerleave', () => $$('.l', el).forEach(l => l.style.setProperty('--w', base)));
  }

  /* ------------------------------------------------------------- map */
  function seeded(seed) {
    let s = seed >>> 0;
    return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function drawMap() {
    const rand = seeded(7);
    const W = 1000, H = 560;
    const xs = [20], ys = [20];
    while (xs[xs.length - 1] < W - 70) xs.push(xs[xs.length - 1] + 62 + rand() * 46);
    while (ys[ys.length - 1] < H - 70) ys.push(ys[ys.length - 1] + 56 + rand() * 40);
    const mi = Math.floor(xs.length / 2), mj = Math.floor(ys.length / 2);
    const mainX = xs[2], mainY = ys[ys.length - 3];
    let svg = '';
    xs.forEach(x => { svg += `<line class="st${x === mainX ? ' main' : ''}" x1="${x}" y1="0" x2="${x}" y2="${H}"/>`; });
    ys.forEach(y => { svg += `<line class="st${y === mainY ? ' main' : ''}" x1="0" y1="${y}" x2="${W}" y2="${y}"/>`; });

    const nodes = [];
    for (let i = 1; i < xs.length - 1; i++) for (let j = 1; j < ys.length - 1; j++) if (Math.abs(i - mi) + Math.abs(j - mj) > 2) nodes.push({ i, j });
    const sector = n => Math.floor(((Math.atan2(n.j - mj, n.i - mi) + Math.PI) / (Math.PI * 2)) * 4 + 0.5) % 4;
    const groups = [[], [], [], []];
    nodes.sort(() => rand() - 0.5).forEach(n => { const s = sector(n); if (groups[s].length < 4) groups[s].push(n); });
    const off = [-6, -2, 2, 6];
    let stopsSvg = '', n = 1;
    groups.forEach((g, ri) => {
      const seq = [{ i: mi, j: mj }];
      const left = g.slice();
      let cur = seq[0];
      while (left.length) {
        let bi = 0, bd = Infinity;
        left.forEach((p, k) => { const dd = Math.abs(p.i - cur.i) + Math.abs(p.j - cur.j); if (dd < bd) { bd = dd; bi = k; } });
        cur = left.splice(bi, 1)[0]; seq.push(cur);
      }
      seq.push({ i: mi, j: mj });
      const pts = [];
      for (let k = 1; k < seq.length; k++) {
        const a = seq[k - 1], b = seq[k], c = k % 2 ? { i: b.i, j: a.j } : { i: a.i, j: b.j };
        [a, c, b].forEach((p, m) => { if (m === 0 && pts.length) return; pts.push([xs[p.i] + off[ri], ys[p.j] + off[ri]]); });
      }
      let len = 0;
      for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
      const dash = ri === 1 ? 'stroke-dasharray:14 8' : ri === 2 ? 'stroke-dasharray:3 7' : '';
      svg += `<polyline class="rt r${ri}" points="${pts.map(p => p.join(',')).join(' ')}" style="--len:${Math.ceil(len)};${dash ? '' : ''}"/>`;
      if (dash) svg += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="var(--paper)" stroke-width="2" style="${dash}"/>`;
      g.forEach(p => {
        const x = xs[p.i], y = ys[p.j];
        stopsSvg += `<rect class="stop${ri === 0 ? ' acid' : ''}" x="${x - 9}" y="${y - 9}" width="18" height="18"/><text x="${x + 13}" y="${y - 12}">${String(n++).padStart(2, '0')}</text>`;
      });
    });
    const dx = xs[mi], dy = ys[mj];
    svg += stopsSvg + `<circle class="depot-ring" cx="${dx}" cy="${dy}" r="24"/><rect class="depot" x="${dx - 13}" y="${dy - 13}" width="26" height="26"/><text x="${dx + 30}" y="${dy - 26}">DEPOT</text>`;
    $('#map').innerHTML = svg;
  }

  /* ------------------------------------------------------------- render */
  function render() {
    const L = S.L(), W = L.work;
    $('#g1').innerHTML = stretchHTML(W.cover.l1.toLocaleUpperCase(S.lang === 'tr' ? 'tr-TR' : 'en-US'));
    $('#g2').innerHTML = stretchHTML(W.cover.l2.toLocaleUpperCase(S.lang === 'tr' ? 'tr-TR' : 'en-US'));
    $('#coverCount').textContent = `${W.trp.name} ✱ ${W.edge.name}`;
    $('#badgeText').textContent = `${W.trp.name} ✱ ${W.edge.name} ✱ ${W.expTitle} ✱ `.toUpperCase();

    const words = W.marquee.map(w => `<span>${esc(w)}</span>`).join('');
    $('#band').innerHTML = words + words;

    $('#expCount').textContent = `${String(W.experience.length).padStart(2, '0')} ${S.lang === 'tr' ? 'KAYIT' : 'ENTRIES'}`;
    $('#expList').innerHTML = W.experience.map(x => `
      <article class="entry">
        <div class="entry-side">
          <span>${esc(x.period)}</span>
          <span>${esc(x.location)}</span>
          <span class="dur">${S.monthsSince(x.start, x.end)} ${esc(W.months)}</span>
        </div>
        <div class="entry-main">
          <h3 class="company stretch">${stretchHTML(x.company.toLocaleUpperCase(S.lang === 'tr' ? 'tr-TR' : 'en-US'), 75)}</h3>
          <p class="role">${esc(x.role)}</p>
          <ol class="points">${x.points.map(p => `<li>${esc(p)}</li>`).join('')}</ol>
        </div>
      </article>`).join('');

    $('#trpName').innerHTML = stretchHTML(W.trp.name);
    $('#nextTitle').innerHTML = stretchHTML(W.next.title.toLocaleUpperCase(S.lang === 'tr' ? 'tr-TR' : 'en-US'));
    $('#edgeTech').textContent = W.edge.tech.join(' / ');

    const dg = window.Diagrams ? window.Diagrams(S.lang) : [];
    $('#hsTrack').innerHTML = W.trp.blocks.map((b, i) => `
      <article class="panel"><span class="num">${String(i + 1).padStart(2, '0')}</span>
        <div class="dg">${dg[i] || ''}</div>
        <div class="pfoot"><h3>${esc(b.t)}</h3><p>${esc(b.d)}</p></div></article>`).join('') +
      `<article class="panel tech"><span class="num">08</span><div class="dg"></div><div class="pfoot"><h3>Stack</h3><p>${W.trp.tech.map(esc).join(' / ')}</p></div></article>`;
    $$('.panel').forEach(p => panelIO.observe(p));

    $('#stampRing').textContent = W.stamp.ring.repeat(2);
    $('#stampMid').textContent = W.stamp.mid;
    $('#pressDate').textContent = new Date().getFullYear();
    $('#ghLink').href = S.content.profile.github;
    $('#year').textContent = new Date().getFullYear();

    $$('.stretch').forEach(el => bindStretch(el, el.classList.contains('company') ? 75 : 62));
    measureGallery();
  }

  /* ------------------------------------------------------------- gallery */
  // diagrams draw in once their panel is near the centre of the viewport
  const panelIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('seen'); }), { rootMargin: '0px -25% 0px -25%' });
  const hs = $('#hscroll'), track = $('#hsTrack');
  let travel = 0;
  function measureGallery() { travel = Math.max(0, track.scrollWidth - innerWidth); }
  const stacked = matchMedia('(max-width: 760px)');
  function updateGallery() {
    if (stacked.matches) { track.style.transform = ''; return; }
    const r = hs.getBoundingClientRect();
    const span = hs.offsetHeight - innerHeight;
    const p = Math.min(1, Math.max(0, -r.top / Math.max(1, span)));
    track.style.transform = `translate3d(${(-p * travel).toFixed(1)}px,0,0)`;
    $('#hsBar').style.transform = `scaleX(${p.toFixed(4)})`;
    const panels = track.children.length;
    $('#hsNow').textContent = String(Math.min(panels, 1 + Math.floor(p * panels * 0.999))).padStart(2, '0');
  }
  let ticking = false, lastY = scrollY, skew = 0, skewRaf = 0;
  const skewEls = () => $$('.giant, .company, .trp-name, .next-title, .pull, .band-track');
  function settleSkew() {
    skew *= 0.88;
    if (Math.abs(skew) < 0.05) skew = 0;
    root.style.setProperty('--skew', `${skew.toFixed(2)}deg`);
    skewRaf = skew ? requestAnimationFrame(settleSkew) : 0;
  }
  addEventListener('scroll', () => {
    if (!reduce) {
      const dy = scrollY - lastY;
      lastY = scrollY;
      skew = Math.max(-9, Math.min(9, skew + dy * 0.06));
      if (!skewRaf) skewRaf = requestAnimationFrame(settleSkew);
    }
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; updateGallery(); });
  }, { passive: true });
  addEventListener('resize', () => { measureGallery(); updateGallery(); });

  /* ------------------------------------------------------------- reveals */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.2 });
  $$('.feature, .map').forEach(el => io.observe(el));

  /* ------------------------------------------------------------- cursor */
  if (fine && !reduce) {
    const c = $('.cursor');
    let x = -100, y = -100, tx = -100, ty = -100, raf = 0;
    const loop = () => {
      x += (tx - x) * 0.22; y += (ty - y) * 0.22;
      c.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.2 ? requestAnimationFrame(loop) : 0;
    };
    addEventListener('pointermove', e => {
      tx = e.clientX; ty = e.clientY;
      c.classList.toggle('big', !!e.target.closest('a, button, .entry, .stretch'));
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
  }

  drawMap();
  S.onLang(render);
  S.start();
  let pressed = null;
  try { pressed = sessionStorage.getItem('pressed'); } catch (e) { /* ignore */ }
  if (reduce || pressed) { root.classList.add('pressed'); requestAnimationFrame(() => { root.classList.add('on'); updateGallery(); }); }
  else {
    root.classList.add('pressing');
    setTimeout(() => { root.classList.add('pressed'); root.classList.remove('pressing'); root.classList.add('on'); updateGallery(); try { sessionStorage.setItem('pressed', '1'); } catch (e) { /* ignore */ } }, 1500);
  }
})();
