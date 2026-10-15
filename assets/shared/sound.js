/* Optional sound, synthesized with WebAudio (no files).
   Each chapter has its own ambient drone; links/buttons blip on hover.
   Off by default; the choice is remembered, and audio only starts after a
   user gesture (browser autoplay rules). */
(() => {
  'use strict';
  const S = window.Site;
  const root = document.documentElement;
  const chapter = root.dataset.chapter;
  const TONES = {
    city: { notes: [55, 82.4, 110, 164.8], filter: 900, wave: 'sawtooth', blip: 'sine' },
    work: { notes: [65.4, 98, 130.8], filter: 500, wave: 'square', blip: 'square' },
    system: { notes: [49, 73.4, 98, 146.8], filter: 1400, wave: 'triangle', blip: 'square' }
  }[chapter] || { notes: [55, 110], filter: 800, wave: 'sine', blip: 'sine' };

  let ctx = null, master = null, on = S.store.get('sound') === 'on', started = false, lastBlip = 0;

  function start() {
    if (started) { ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = TONES.filter; lp.Q.value = 6;
    lp.connect(master);
    const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07; lfoGain.gain.value = TONES.filter * 0.6;
    lfo.connect(lfoGain).connect(lp.frequency);
    lfo.start();
    TONES.notes.forEach((f, i) => {
      [-6, 6].forEach(det => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = TONES.wave; o.frequency.value = f; o.detune.value = det + i * 2;
        g.gain.value = 0.05 / (i + 1);
        o.connect(g).connect(lp);
        o.start();
      });
    });
    started = true;
  }

  function fade(to) {
    if (!ctx) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(to, ctx.currentTime, 0.6);
  }

  function blip(freq = 880) {
    if (!on || !ctx) return;
    const now = ctx.currentTime;
    if (now - lastBlip < 0.04) return;
    lastBlip = now;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = TONES.blip; o.frequency.setValueAtTime(freq, now); o.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.06);
    g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.05, now + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    o.connect(g).connect(ctx.destination);
    o.start(now); o.stop(now + 0.14);
  }

  function setOn(v) {
    on = v;
    S.store.set('sound', v ? 'on' : 'off');
    if (v) { start(); fade(0.5); } else fade(0);
    paint();
  }

  // button in the chapter bar
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'sound-btn';
  btn.innerHTML = '<i></i><i></i><i></i><i></i>';
  const paint = () => {
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', S.lang === 'tr' ? (on ? 'Sesi kapat' : 'Sesi aç') : (on ? 'Sound off' : 'Sound on'));
  };
  btn.addEventListener('click', () => setOn(!on));
  const lang = document.querySelector('.ch-lang');
  if (lang) lang.parentNode.insertBefore(btn, lang);
  paint();
  S.onLang(paint);

  // remembered "on": begin on the first gesture
  if (on) {
    const first = () => { start(); fade(0.5); removeEventListener('pointerdown', first); removeEventListener('keydown', first); };
    addEventListener('pointerdown', first);
    addEventListener('keydown', first);
  }
  document.addEventListener('pointerover', e => {
    const t = e.target.closest && e.target.closest('a, button');
    if (t && t !== btn) blip(t.closest('#chapterLinks') ? 660 : 990);
  });
  document.addEventListener('visibilitychange', () => { if (on && ctx) fade(document.hidden ? 0 : 0.5); });

  window.Sound = { blip, get on() { return on; } };
})();
