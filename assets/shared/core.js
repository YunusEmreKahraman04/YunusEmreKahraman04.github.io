/* Shared runtime for all chapters: language, chapter nav, helpers. */
(() => {
  'use strict';
  const C = window.CONTENT;
  const root = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const chapter = root.dataset.chapter;
  // the operation is one continuous page; chapters are anchors on it
  const SINGLE = root.dataset.single === '1' || chapter !== 'city';
  const PAGES = SINGLE ? ['v2.html#sehir', 'v2.html#isler', 'v2.html#sistem'] : ['v2.html', 'work.html', 'system.html'];
  const KEYS = ['city', 'work', 'system'];

  let lang = store.get('lang');
  if (lang !== 'tr' && lang !== 'en') lang = (navigator.language || '').toLowerCase().startsWith('tr') ? 'tr' : 'en';

  const L = () => C[lang];
  const t = key => key.split('.').reduce((o, k) => (o == null ? o : o[k]), L()) ?? '';
  const pick = v => (v && typeof v === 'object' && !Array.isArray(v) ? (v[lang] ?? v.en) : v);
  const listeners = [];

  function renderNav() {
    const nav = $('#chapterLinks');
    if (nav) {
      nav.innerHTML = KEYS.map((k, i) => `
        <a href="${PAGES[i]}" class="${k === chapter ? 'on' : ''}"${k === chapter ? ' aria-current="page"' : ''}>
          <span class="ch-n">0${i + 1}</span><span class="ch-l">${esc(L().chapters[i])}</span>
        </a>`).join('');
    }
    $$('[data-lang]').forEach(b => {
      b.classList.toggle('on', b.dataset.lang === lang);
      b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
    });
  }

  function apply() {
    root.lang = lang;
    $$('[data-t]').forEach(el => { const v = t(el.dataset.t); if (typeof v === 'string') el.textContent = v; });
    $$('[data-t-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.tAria)));
    $$('[data-t-ph]').forEach(el => el.setAttribute('placeholder', t(el.dataset.tPh)));
    document.title = t(`meta.${chapter}`);
    $$('[data-t-skip]').forEach(el => { el.textContent = lang === 'tr' ? 'İçeriğe atla' : 'Skip to content'; });
    renderNav();
    listeners.forEach(fn => fn(lang));
  }

  function setLang(next) {
    if (next === lang || !C[next]) return;
    lang = next;
    store.set('lang', next);
    apply();
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-lang]');
    if (b) setLang(b.dataset.lang);
  });


  function monthsSince(start, end) {
    const [sy, sm] = start.split('-').map(Number);
    const now = new Date();
    const [ey, em] = end ? end.split('-').map(Number) : [now.getFullYear(), now.getMonth() + 1];
    return Math.max(1, (ey - sy) * 12 + (em - sm) + 1);
  }

  window.Site = {
    $, $$, esc, reduce, fine, store, pick, monthsSince,
    get lang() { return lang; },
    get content() { return C; },
    L, t, setLang,
    onLang(fn) { listeners.push(fn); },
    start() { apply(); }
  };
})();
