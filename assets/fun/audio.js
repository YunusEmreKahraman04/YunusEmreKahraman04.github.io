// Synthesised sound: no audio files, everything is shaped noise and oscillators.
const SHOT = {
  pistol: { lp: 4200, decay: 0.11, thump: [210, 70], tg: 0.6, vol: 0.7, tail: 0.25 },
  usp: { lp: 2200, hp: 600, decay: 0.05, thump: [140, 80], tg: 0.25, vol: 0.45, tail: 0.08 },
  deagle: { lp: 4200, decay: 0.2, thump: [190, 50], tg: 1, vol: 1, tail: 0.45 },
  smg: { lp: 3800, decay: 0.09, thump: [170, 60], tg: 0.55, vol: 0.7, tail: 0.22 },
  rifle: { lp: 3400, decay: 0.14, thump: [150, 45], tg: 0.85, vol: 0.85, tail: 0.32 },
  ak: { lp: 3600, decay: 0.16, thump: [160, 45], tg: 0.9, vol: 0.9, tail: 0.35 },
  m4: { lp: 4000, decay: 0.12, thump: [150, 50], tg: 0.75, vol: 0.85, tail: 0.3 },
  sil: { lp: 2400, hp: 500, decay: 0.07, thump: [110, 60], tg: 0.35, vol: 0.55, tail: 0.12 },
  scout: { lp: 4400, decay: 0.25, thump: [170, 40], tg: 1, vol: 1, tail: 0.6 },
  awp: { lp: 2600, decay: 0.4, thump: [120, 30], tg: 1.2, vol: 1.15, tail: 0.9 },
  auto: { lp: 3000, decay: 0.22, thump: [140, 40], tg: 1, vol: 1, tail: 0.55 },
  shotgun: { lp: 2200, decay: 0.3, thump: [100, 35], tg: 1.3, vol: 1.15, tail: 0.6 },
  lmg: { lp: 3200, decay: 0.15, thump: [140, 45], tg: 0.95, vol: 0.9, tail: 0.35 }
};

export class Sfx {
  constructor() {
    this.ctx = null;
    this.volume = 0.6;
  }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 6;
    this.master.connect(comp).connect(ctx.destination);
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; }
  listener(p, fwd) {
    if (!this.ctx) return;
    const L = this.ctx.listener;
    if (L.positionX) {
      // plain value writes: scheduling automation every frame piles up events and slows audio down
      L.positionX.value = p[0]; L.positionY.value = p[1]; L.positionZ.value = p[2];
      L.forwardX.value = fwd[0]; L.forwardY.value = fwd[1]; L.forwardZ.value = fwd[2];
    } else {
      L.setPosition(p[0], p[1], p[2]);
      L.setOrientation(fwd[0], fwd[1], fwd[2], 0, 1, 0);
    }
  }
  out(pos, gain = 1) {
    // a gain node, routed through a panner when the sound has a world position
    const g = this.ctx.createGain();
    g.gain.value = gain;
    if (pos) {
      const p = this.ctx.createPanner();
      p.panningModel = 'equalpower'; p.distanceModel = 'inverse';
      p.refDistance = 4; p.rolloffFactor = 1.1; p.maxDistance = 200;
      if (p.positionX) { p.positionX.value = pos[0]; p.positionY.value = pos[1]; p.positionZ.value = pos[2]; }
      else p.setPosition(pos[0], pos[1], pos[2]);
      g.connect(p).connect(this.master);
    } else g.connect(this.master);
    return g;
  }
  burst(dest, { lp = 8000, hp = 0, attack = 0.002, decay = 0.1, vol = 1, delay = 0, bp = 0, q = 1 }) {
    const c = this.ctx, t = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    let node = src;
    const f = c.createBiquadFilter(); f.type = bp ? 'bandpass' : 'lowpass'; f.frequency.value = bp || lp; f.Q.value = q;
    node.connect(f); node = f;
    if (hp) { const h = c.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp; node.connect(h); node = h; }
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0008, t + attack + decay);
    node.connect(g).connect(dest);
    src.start(t, Math.random() * 1.5);
    src.stop(t + attack + decay + 0.05);
    return f;
  }
  tone(dest, { f0, f1, decay, vol = 1, type = 'sine', delay = 0 }) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + decay);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + decay);
    o.connect(g).connect(dest);
    o.start(t); o.stop(t + decay + 0.05);
  }

  shot(kind, pos) {
    if (!this.ctx) return;
    if (kind === 'knife') return this.whoosh(pos);
    const s = SHOT[kind] || SHOT.ak;
    const dest = this.out(pos, s.vol * (pos ? 1.3 : 0.8));
    this.burst(dest, { lp: s.lp, hp: s.hp, decay: s.decay, vol: 1 });
    this.tone(dest, { f0: s.thump[0], f1: s.thump[1], decay: 0.14, vol: s.tg });
    // room/outdoor tail
    this.burst(dest, { lp: 700, decay: s.tail, vol: 0.28, delay: 0.02, attack: 0.03 });
    if (kind === 'awp' || kind === 'scout') this.tone(dest, { f0: 900, f1: 600, decay: 0.05, vol: 0.12, type: 'square', delay: 0.55 }); // bolt
    if (kind === 'shotgun') this.burst(dest, { bp: 1400, q: 3, decay: 0.06, vol: 0.5, delay: 0.42 }); // pump
  }
  whoosh(pos) {
    if (!this.ctx) return;
    const dest = this.out(pos, 0.5);
    const f = this.burst(dest, { bp: 1200, q: 2, decay: 0.16, vol: 1, attack: 0.04 });
    f.frequency.exponentialRampToValueAtTime(3500, this.ctx.currentTime + 0.15);
  }
  slash(pos) { if (!this.ctx) return; const d = this.out(pos, 0.7); this.burst(d, { lp: 2000, decay: 0.08, vol: 1 }); this.tone(d, { f0: 300, f1: 120, decay: 0.08, vol: 0.6 }); }
  hitmark() { if (!this.ctx) return; this.tone(this.out(null, 0.35), { f0: 1900, decay: 0.035, vol: 1, type: 'triangle' }); }
  headshot() {
    // the helmet "dink"
    if (!this.ctx) return;
    const d = this.out(null, 0.5);
    this.tone(d, { f0: 2650, decay: 0.32, vol: 0.7 });
    this.tone(d, { f0: 3920, decay: 0.22, vol: 0.45 });
    this.burst(d, { bp: 5000, q: 1, decay: 0.03, vol: 0.6 });
  }
  hurt() { if (!this.ctx) return; const d = this.out(null, 0.7); this.tone(d, { f0: 140, f1: 60, decay: 0.18, vol: 1 }); this.burst(d, { lp: 900, decay: 0.12, vol: 0.6 }); }
  step(pos, vol = 0.35) { if (!this.ctx) return; const d = this.out(pos, vol); this.burst(d, { lp: 500, decay: 0.06, vol: 1, attack: 0.004 }); this.burst(d, { bp: 2200, q: 3, decay: 0.03, vol: 0.25 }); }
  land(pos) { if (!this.ctx) return; const d = this.out(pos, 0.6); this.burst(d, { lp: 350, decay: 0.12, vol: 1 }); }
  click() { if (!this.ctx) return; this.tone(this.out(null, 0.4), { f0: 2400, f1: 1800, decay: 0.03, vol: 1, type: 'square' }); }
  reload(kind) {
    if (!this.ctx) return;
    const d = this.out(null, 0.5);
    const seq = kind === 'sniper' ? [0.3, 1.4, 2.9] : kind === 'pistol' ? [0.25, 1.5] : kind === 'heavy' ? [0.5, 2.5, 4.6] : [0.3, 1.3, 2.0];
    seq.forEach((t, i) => { this.burst(d, { bp: 1800 + i * 500, q: 4, decay: 0.05, vol: 1, delay: t }); this.tone(d, { f0: 600 + i * 200, f1: 300, decay: 0.05, vol: 0.4, type: 'square', delay: t }); });
  }
  scope() { if (!this.ctx) return; const d = this.out(null, 0.35); this.burst(d, { bp: 3000, q: 6, decay: 0.04, vol: 1 }); }
  death(pos) { if (!this.ctx) return; const d = this.out(pos, 0.7); this.tone(d, { f0: 220, f1: 70, decay: 0.35, vol: 0.8, type: 'sawtooth' }); this.burst(d, { lp: 600, decay: 0.2, vol: 0.6, delay: 0.25 }); }
  ui() { if (!this.ctx) return; this.tone(this.out(null, 0.25), { f0: 880, f1: 1320, decay: 0.06, vol: 1, type: 'triangle' }); }
}
