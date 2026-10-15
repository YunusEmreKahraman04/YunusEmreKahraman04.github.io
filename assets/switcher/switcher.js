/* Version switcher (V1 / V2 / FUN). Load in <head> without defer:
   <script src="assets/switcher/switcher.js" data-current="v1"></script> */
(() => {
  'use strict';
  const VERSIONS = [
    { id: 'v1', label: 'V1', href: 'index.html', name: { tr: 'Klasik', en: 'Classic' } },
    { id: 'v2', label: 'V2', href: 'v2.html', name: { tr: 'Şehir', en: 'City' } },
    { id: 'fun', label: 'FUN', href: 'fun.html', name: { tr: 'Oyun', en: 'Game' } }
  ];
  const KEY = 'vs-wipe';
  const root = document.documentElement;
  const script = document.currentScript;
  const current = Math.max(0, VERSIONS.findIndex(v => v.id === (script && script.dataset.current)));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ss = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) { /* storage unavailable */ } }
  };
  const lang = () => (root.lang || 'tr').slice(0, 2) === 'en' ? 'en' : 'tr';

  root.dataset.vs = VERSIONS[current].id;
  const arriving = ss.get(KEY) === VERSIONS[current].id;
  if (arriving) root.classList.add('vs-in');

  function build() {
    const box = document.createElement('div');
    box.className = 'vs';
    box.setAttribute('role', 'radiogroup');
    box.setAttribute('aria-label', lang() === 'en' ? 'Site version' : 'Site sürümü');
    box.innerHTML = '<i class="vs-knob" aria-hidden="true"></i>' + VERSIONS.map((v, i) =>
      `<button type="button" class="vs-opt" role="radio" data-v="${v.id}" data-i="${i}" aria-checked="${i === current}" tabindex="${i === current ? 0 : -1}" title="${v.label} · ${v.name[lang()]}"><span>${v.label}</span></button>`
    ).join('');
    document.body.appendChild(box);

    const knob = box.querySelector('.vs-knob');
    const opts = Array.from(box.querySelectorAll('.vs-opt'));
    const seg = () => opts[0].getBoundingClientRect().width;
    let at = current;
    let leaving = false;

    const place = (x, idx) => {
      box.style.setProperty('--x', x.toFixed(1));
      box.dataset.at = VERSIONS[idx].id;
      opts.forEach((o, i) => o.setAttribute('aria-checked', String(i === idx)));
    };
    const snap = idx => { at = idx; place(idx * seg(), idx); };
    snap(current);
    addEventListener('resize', () => { if (!box.classList.contains('dragging')) snap(at); });

    function go(idx) {
      if (leaving) return;
      snap(idx);
      if (idx === current) return;
      leaving = true;
      const v = VERSIONS[idx];
      ss.set(KEY, v.id);
      const wipe = document.createElement('div');
      wipe.className = 'vs-wipe';
      wipe.innerHTML = `<div><span>${v.label}</span><small>${v.name[lang()].toUpperCase()}</small></div>`;
      document.body.appendChild(wipe);
      // let the cylinder finish rolling, then cover and leave
      setTimeout(() => {
        wipe.classList.add('go');
        setTimeout(() => { location.href = v.href; }, reduce ? 20 : 430);
      }, reduce ? 0 : 220);
    }

    // drag the cylinder, or tap a stop
    let drag = null;
    box.addEventListener('pointerdown', e => {
      if (leaving || e.button > 0) return;
      const r = box.getBoundingClientRect();
      const pad = opts[0].offsetLeft;
      const s = seg();
      const kx = at * s;
      const local = e.clientX - r.left - pad;
      drag = { id: e.pointerId, x0: e.clientX, kx, onKnob: local >= kx && local <= kx + s, moved: false, s };
      box.setPointerCapture(e.pointerId);
    });
    box.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x0;
      if (!drag.moved && Math.abs(dx) < 4) return;
      drag.moved = true;
      box.classList.add('dragging');
      let x;
      if (drag.onKnob) x = drag.kx + dx;
      else { const r = box.getBoundingClientRect(); x = e.clientX - r.left - opts[0].offsetLeft - drag.s / 2; }
      x = Math.max(0, Math.min(drag.s * 2, x));
      place(x, Math.round(x / drag.s));
    });
    const end = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag; drag = null;
      box.classList.remove('dragging');
      if (d.moved) {
        const x = parseFloat(box.style.getPropertyValue('--x')) || 0;
        go(Math.round(x / d.s));
      } else {
        // pointer capture retargets the event to the box, so pick the stop by position
        const r = box.getBoundingClientRect();
        go(Math.max(0, Math.min(2, Math.floor((e.clientX - r.left - opts[0].offsetLeft) / d.s))));
      }
    };
    box.addEventListener('pointerup', end);
    box.addEventListener('pointercancel', e => { if (drag && e.pointerId === drag.id) { drag = null; box.classList.remove('dragging'); snap(at); } });
    box.addEventListener('click', e => e.preventDefault());
    box.addEventListener('keydown', e => {
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (d) {
        e.preventDefault();
        const n = (at + d + 3) % 3;
        snap(n); opts[n].focus();
        opts.forEach((o, i) => o.tabIndex = i === n ? 0 : -1);
      } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(at); }
    });

    // warm the other versions' HTML on first interest
    let warmed = false;
    box.addEventListener('pointerenter', () => {
      if (warmed) return; warmed = true;
      VERSIONS.forEach((v, i) => {
        if (i === current) return;
        const l = document.createElement('link'); l.rel = 'prefetch'; l.href = v.href; document.head.appendChild(l);
      });
    });

    // coming back through the back button: undo the wipe
    addEventListener('pageshow', e => {
      if (!e.persisted) return;
      leaving = false; ss.del(KEY);
      document.querySelectorAll('.vs-wipe').forEach(w => w.remove());
      snap(current);
    });

    window.VersionSwitcher = { el: box, hide(h) { box.hidden = !!h; } };

    if (arriving) {
      ss.del(KEY);
      const wipe = document.createElement('div');
      wipe.className = 'vs-wipe reveal';
      wipe.innerHTML = `<div><span>${VERSIONS[current].label}</span><small>${VERSIONS[current].name[lang()].toUpperCase()}</small></div>`;
      document.body.appendChild(wipe);
      root.classList.remove('vs-in');
      wipe.addEventListener('animationend', () => wipe.remove());
      setTimeout(() => wipe.remove(), 1500);
    }
  }

  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);
})();
