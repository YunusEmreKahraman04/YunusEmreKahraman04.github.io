/* Ink diagrams for the seven TRP panels (chapter 02).
   Line art in currentColor with one acid accent. Strokes marked .d draw in
   (pathLength=1) and fills marked .f fade in when the panel is centred.
   Everything is schematic — it shows how each part works, not real data. */
(() => {
  'use strict';
  const LBL = {
    tr: { mon: 'Pzt', tue: 'Sal', wed: 'Çar', depot: 'Depo', next: 'Sıradaki durak', offline: 'çevrimdışı', live: 'canlı konum',
      plan: 'plan', actual: 'gerçekleşen', skip: 'atlama', territory: 'bölge ihlali',
      admin: 'Admin', dealer: 'Bayi', manager: 'Satış şefi', rep: 'Plasiyer',
      queue: 'Kuyruk', worker: 'İşleyici', retry: '↻ üstel bekleme', dlq: 'ölü mektup', nightly: 'gece farkı → Pansis', dedupe: 'tekrar ayıkla',
      jobs: 'iş kuyruğu', migrations: 'migration', compose: 'docker compose', app: 'uygulama' },
    en: { mon: 'Mon', tue: 'Tue', wed: 'Wed', depot: 'Depot', next: 'Next stop', offline: 'offline', live: 'live location',
      plan: 'plan', actual: 'actual', skip: 'skips', territory: 'territory alert',
      admin: 'Admin', dealer: 'Dealer', manager: 'Sales manager', rep: 'Field rep',
      queue: 'Queue', worker: 'Worker', retry: '↻ exp. backoff', dlq: 'dead-letter', nightly: 'nightly diff → Pansis', dedupe: 'dedupe',
      jobs: 'job queue', migrations: 'migrations', compose: 'docker compose', app: 'app' }
  };
  const svg = body => `<svg viewBox="0 0 600 300" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const t = (x, y, s, cls = '', anchor = 'middle') => `<text class="f ${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${s}</text>`;
  const box = (x, y, w, h, label, acid = false, dash = false) =>
    `<rect class="${dash ? 'dash' : 'd'}${acid ? ' acid' : ''}" ${dash ? '' : 'pathLength="1"'} x="${x}" y="${y}" width="${w}" height="${h}" ${dash ? 'stroke-dasharray="8 7"' : ''}/>` + (label ? t(x + w / 2, y + h / 2 + 6, label) : '');
  const arrow = (x1, y1, x2, y2, acid = false) => {
    const a = Math.atan2(y2 - y1, x2 - x1), s = 10;
    return `<path class="d${acid ? ' acid' : ''}" pathLength="1" d="M${x1} ${y1}L${x2} ${y2}M${x2 - s * Math.cos(a - 0.5)} ${y2 - s * Math.sin(a - 0.5)}L${x2} ${y2}L${x2 - s * Math.cos(a + 0.5)} ${y2 - s * Math.sin(a + 0.5)}"/>`;
  };

  function routing(L) {
    const clusters = [
      { cx: 140, cy: 110, pts: [[105, 85], [150, 70], [175, 120], [120, 140], [160, 150]], label: L.mon, acid: true },
      { cx: 330, cy: 80, pts: [[300, 60], [345, 50], [370, 95], [315, 105]], label: L.tue },
      { cx: 470, cy: 150, pts: [[440, 125], [495, 120], [510, 170], [455, 185], [480, 150]], label: L.wed }
    ];
    let s = '';
    clusters.forEach(c => {
      s += `<ellipse class="dash" cx="${c.cx}" cy="${c.cy}" rx="${c === clusters[1] ? 70 : 80}" ry="${c === clusters[1] ? 55 : 62}" stroke-dasharray="6 8" stroke-width="2"/>`;
      s += t(c.cx, c.cy - (c === clusters[1] ? 64 : 72), c.label, 'mono');
      c.pts.forEach(([x, y]) => { s += `<circle class="f ${c.acid ? 'acid-fill' : 'ink-fill'}" cx="${x}" cy="${y}" r="7"/>`; });
    });
    const depot = [300, 260];
    const route = [depot, [300, 230], [175, 230], [160, 150], [120, 140], [105, 85], [150, 70], [175, 120], [175, 230], [300, 230], depot];
    s += `<path class="d acid" pathLength="1" stroke-width="5" d="M${route.map(p => p.join(' ')).join('L')}"/>`;
    s += `<rect class="f ink-fill" x="${depot[0] - 12}" y="${depot[1] - 12}" width="24" height="24"/>` + t(depot[0] + 34, depot[1] + 6, L.depot, 'mono', 'start');
    return svg(s);
  }

  function pwa(L) {
    let s = `<rect class="d" pathLength="1" x="215" y="8" width="170" height="284" rx="28"/><path class="d" pathLength="1" d="M275 24h50"/>`;
    s += `<rect class="f acid-fill" x="231" y="44" width="138" height="54" rx="10"/>` + t(300, 66, L.next, 'mono on-acid') + t(300, 88, '03', 'big on-acid');
    for (let i = 0; i < 5; i++) {
      const y = 116 + i * 34, done = i < 2;
      s += `<rect class="d" pathLength="1" x="231" y="${y}" width="138" height="26" rx="7" stroke-width="2"/>`;
      s += done ? `<circle class="f acid-fill" cx="248" cy="${y + 13}" r="7"/><path class="d" pathLength="1" d="M244 ${y + 13}l3 3 6-6" stroke-width="2.4"/>` : `<circle class="d" pathLength="1" cx="248" cy="${y + 13}" r="7" stroke-width="2"/>`;
      s += `<path class="dash" d="M263 ${y + 13}h${done ? 60 : 80}" stroke-width="2" ${done ? 'stroke-dasharray="4 5"' : ''}/>`;
    }
    // offline + live location annotations
    s += `<path class="d" pathLength="1" d="M90 120a26 26 0 0 1 50-6 20 20 0 0 1 8 38H92a18 18 0 0 1-2-32z"/><path class="d acid" pathLength="1" d="M84 162 152 92"/>` + t(118, 190, L.offline, 'mono');
    s += `<path class="d" pathLength="1" d="M490 150c0-18 14-30 28-30s28 12 28 30c0 22-28 48-28 48s-28-26-28-48z"/><circle class="f acid-fill" cx="518" cy="150" r="9"/>` + t(518, 226, L.live, 'mono');
    s += `<path class="dash" d="M155 140h52M392 160h90" stroke-dasharray="4 6" stroke-width="2"/>`;
    return svg(s);
  }

  function dashboards(L) {
    let s = `<path class="d" pathLength="1" d="M40 250H360M40 250V30"/>`;
    const data = [[150, 138], [190, 182], [120, 96], [205, 200], [160, 150]];
    data.forEach(([p, a], i) => {
      const x = 62 + i * 60;
      s += `<rect class="d" pathLength="1" x="${x}" y="${250 - p}" width="22" height="${p}" stroke-width="2.5"/>`;
      s += `<rect class="f ${i === 2 ? 'acid-fill' : 'ink-fill'}" x="${x + 24}" y="${250 - a}" width="22" height="${a}"/>`;
    });
    s += `<rect class="d" pathLength="1" x="48" y="276" width="14" height="14" stroke-width="2"/>` + t(70, 288, L.plan, 'mono', 'start');
    s += `<rect class="f ink-fill" x="140" y="276" width="14" height="14"/>` + t(162, 288, L.actual, 'mono', 'start');
    s += `<circle class="d" pathLength="1" cx="470" cy="100" r="58" stroke-width="14" opacity=".18"/><path class="d acid" pathLength="1" stroke-width="14" d="M470 42a58 58 0 0 1 41 17"/>` + t(470, 108, L.skip, 'mono');
    s += `<path class="d acid" pathLength="1" d="M470 196 506 260H434Z"/><path class="d" pathLength="1" d="M470 218v18M470 246v2" stroke-width="3.5"/>` + t(470, 290, L.territory, 'mono');
    return svg(s);
  }

  function roles(L) {
    let s = box(230, 14, 140, 46, L.admin) + box(230, 92, 140, 46, L.dealer) + box(130, 170, 150, 46, L.manager) + box(320, 170, 150, 46, L.manager);
    [[70, L.rep], [200, L.rep], [330, L.rep], [460, L.rep]].forEach(([x, l], i) => { s += box(x, 246, 110, 42, l, i === 1); });
    s += `<path class="d" pathLength="1" d="M300 60v32M300 138v16H205v16M300 154H395v16M205 216v14H125v16M205 230H255v16M395 216v14H385v16M395 230H515v16" stroke-width="2.5"/>`;
    return svg(s);
  }

  function sync(L) {
    let s = box(20, 110, 110, 60, 'Pansis') + box(180, 110, 110, 60, L.queue) + box(340, 110, 110, 60, L.worker, true) + box(490, 110, 92, 60, 'DB');
    s += arrow(130, 140, 176, 140) + arrow(290, 140, 336, 140, true) + arrow(450, 140, 486, 140);
    s += `<path class="d acid" pathLength="1" d="M395 110C395 50 235 50 235 104"/><path class="d acid" pathLength="1" d="M226 96 235 106 244 96"/>` + t(315, 44, L.retry, 'mono acid-text');
    s += t(235, 196, L.dedupe, 'mono');
    s += box(325, 200, 140, 40, L.dlq, false, true) + arrow(395, 170, 395, 196);
    s += `<path class="dash" d="M536 170C536 318 75 318 75 174" stroke-dasharray="7 8"/><path class="d" pathLength="1" d="M66 184 75 172 84 184"/>` + t(300, 294, L.nightly, 'mono');
    return svg(s);
  }

  function pipeline(L) {
    let s = `<rect class="d" pathLength="1" x="20" y="80" width="150" height="120"/>`;
    for (let i = 1; i < 4; i++) s += `<path class="d" pathLength="1" d="M20 ${80 + i * 30}h150" stroke-width="2"/>`;
    for (let i = 1; i < 3; i++) s += `<path class="d" pathLength="1" d="M${20 + i * 50} 80v120" stroke-width="2"/>`;
    s += `<rect class="f acid-fill" x="20" y="80" width="150" height="30"/>` + t(95, 230, 'Excel / CSV', 'mono');
    s += arrow(180, 140, 226, 140);
    [0, 1, 2].forEach(i => { s += box(236 + i * 12, 96 + i * 16, 110, 36, i === 2 ? 'RQ' : '', i === 2); });
    s += t(305, 230, L.jobs, 'mono');
    s += arrow(372, 140, 418, 140);
    s += `<path class="d" pathLength="1" d="M430 96v92c0 12 30 20 66 20s66-8 66-20V96"/><ellipse class="d" pathLength="1" cx="496" cy="96" rx="66" ry="18"/><path class="d" pathLength="1" d="M430 142c0 12 30 20 66 20s66-8 66-20" stroke-width="2"/>`;
    s += t(496, 236, 'PostgreSQL', 'mono');
    [0, 1, 2].forEach(i => { s += `<rect class="f ${i === 0 ? 'acid-fill' : 'ink-fill'}" x="${452 + i * 6}" y="${20 + i * 12}" width="${88 - i * 12}" height="8"/>`; });
    s += t(496, 14, `Alembic · ${L.migrations}`, 'mono');
    return svg(s);
  }

  function production(L) {
    let s = box(150, 20, 430, 262, '', false, true) + t(365, 274, L.compose, 'mono');
    s += box(20, 120, 100, 56, 'CI') + t(70, 200, 'GitHub Actions', 'mono') + arrow(120, 148, 166, 148);
    s += box(180, 120, 96, 56, 'nginx', true);
    s += `<rect class="d" pathLength="1" x="216" y="70" width="20" height="18" rx="3" stroke-width="2.5"/><path class="d" pathLength="1" d="M220 70v-6a6 6 0 0 1 12 0v6" stroke-width="2.5"/>` + t(226, 56, 'SSL', 'mono');
    s += arrow(276, 148, 316, 120) + arrow(276, 148, 316, 176);
    s += box(320, 92, 110, 46, L.app) + box(320, 158, 110, 46, L.app);
    s += arrow(430, 115, 466, 90) + arrow(430, 181, 466, 206);
    s += box(470, 60, 96, 48, 'Postgres') + box(470, 186, 96, 48, 'Redis');
    s += t(226, 210, 'rate limit', 'mono');
    return svg(s);
  }

  window.Diagrams = lang => {
    const L = LBL[lang] || LBL.en;
    return [routing(L), pwa(L), dashboards(L), roles(L), sync(L), pipeline(L), production(L)];
  };
})();
