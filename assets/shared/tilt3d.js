/* 3D tilt for any [data-tilt3d] element: perspective rotation toward the
   pointer, a moving glare, and depth for children marked [data-depth="px"].
   Fine pointers only; one rAF per element while it is being hovered. */
(() => {
  'use strict';
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const MAX = 9;
  function bind(el) {
    if (el._t3d) return;
    el._t3d = true;
    el.classList.add('t3d');
    const glare = document.createElement('span');
    glare.className = 't3d-glare';
    glare.setAttribute('aria-hidden', 'true');
    el.appendChild(glare);
    const max = +el.dataset.tilt3d || MAX;
    let tx = 0, ty = 0, x = 0, y = 0, gx = 50, gy = 50, raf = 0, on = false;
    const loop = () => {
      x += (tx - x) * 0.14; y += (ty - y) * 0.14;
      el.style.transform = `perspective(1100px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg) translateZ(${on ? 10 : 0}px)`;
      glare.style.background = `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,${on ? 0.22 : 0}), transparent 55%)`;
      if (on || Math.abs(x) + Math.abs(y) > 0.002) raf = requestAnimationFrame(loop);
      else { raf = 0; el.style.transform = ''; el.style.transition = ''; }
    };
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      tx = px - 0.5; ty = py - 0.5; gx = px * 100; gy = py * 100; on = true;
      el.style.transition = 'none';
      if (!raf) raf = requestAnimationFrame(loop);
    });
    el.addEventListener('pointerleave', () => { tx = 0; ty = 0; on = false; if (!raf) raf = requestAnimationFrame(loop); });
  }
  const scan = () => document.querySelectorAll('[data-tilt3d]').forEach(bind);
  scan();

  const css = document.createElement('style');
  css.textContent = `
    .t3d { transform-style: preserve-3d; will-change: transform; }
    .t3d [data-depth] { transform: translateZ(calc(var(--d, 0) * 1px)); }
    .t3d-glare { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 5; mix-blend-mode: soft-light; }
  `;
  document.head.appendChild(css);
  const depth = () => document.querySelectorAll('[data-depth]').forEach(el => { if (el.style.getPropertyValue('--d') !== el.dataset.depth) el.style.setProperty('--d', el.dataset.depth); });
  depth();
  // re-scan only when elements are added (not on every text change), at most once per frame, under <main>
  let queued = false;
  new MutationObserver(list => {
    if (queued || !list.some(m => [...m.addedNodes].some(n => n.nodeType === 1))) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; scan(); depth(); });
  }).observe(document.querySelector('main') || document.body, { childList: true, subtree: true });
})();
