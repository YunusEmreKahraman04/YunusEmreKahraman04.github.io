// Rendering pipeline + graphics settings. Without bloom the scene is drawn straight to the
// canvas (cheapest path, hardware MSAA); with bloom it goes through a small composer.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const PRESETS = {
  low: { scale: 1, shadows: 'off', bloom: false, hidpi: false },
  medium: { scale: 1, shadows: 'low', bloom: false, hidpi: false },
  high: { scale: 1, shadows: 'high', bloom: true, hidpi: false },
  ultra: { scale: 1, shadows: 'ultra', bloom: true, hidpi: true }
};
export const GFX_DEFAULTS = { preset: 'medium', cap: 0, autoRes: false, fpsShow: true, aa: true, ...PRESETS.medium };
const SHADOW = { off: 0, low: 1024, high: 2048, ultra: 4096 };

export class Gfx {
  constructor(renderer, scene, camera) {
    this.renderer = renderer; this.scene = scene; this.camera = camera;
    this.cfg = { ...GFX_DEFAULTS };
    this.dyn = 1;
    this.refresh = 60;
    this.vm = null;
    this.world = null;
    this.win = { t: performance.now(), frames: 0, good: 0, bad: 0 };
    this.fps = 0; this.ms = 0;
    this.capNext = 0;
    this.composer = null;
  }
  buildComposer() {
    if (this.composer) return;
    const r = this.renderer;
    const size = r.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: this.cfg.aa ? 4 : 0 });
    this.composer = new EffectComposer(r, rt);
    this.worldPass = new RenderPass(this.scene, this.camera);
    this.vmPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
    this.vmPass.clear = false; this.vmPass.clearDepth = true;
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.55, 0.35, 2.4);
    for (const p of [this.worldPass, this.vmPass, this.bloom, new OutputPass()]) this.composer.addPass(p);
    if (this.vm) this.setViewModel(this.vm);
    this.resize();
  }
  pixelRatio() {
    const dpr = window.devicePixelRatio || 1;
    const base = this.cfg.hidpi ? Math.min(dpr, 2) : Math.min(dpr, 1.25);
    return Math.max(0.5, base * this.cfg.scale * this.dyn);
  }
  resize() {
    const w = innerWidth, h = innerHeight, pr = this.pixelRatio();
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    if (this.composer) { this.composer.setPixelRatio(pr); this.composer.setSize(w, h); }
  }
  apply(cfg) {
    const prev = this.cfg;
    this.cfg = { ...this.cfg, ...cfg };
    const r = this.renderer;
    if (this.cfg.bloom) this.buildComposer();
    const sm = SHADOW[this.cfg.shadows] ?? 1024;
    const wantType = this.cfg.shadows === 'low' ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    if (r.shadowMap.enabled !== !!sm || r.shadowMap.type !== wantType) {
      r.shadowMap.enabled = !!sm;
      r.shadowMap.type = wantType;
      this.recompile();
    }
    this.applyShadowSize();
    if (!this.cfg.autoRes) this.dyn = 1;
    if (prev.scale !== this.cfg.scale || prev.hidpi !== this.cfg.hidpi || prev.autoRes !== this.cfg.autoRes) this.resize();
  }
  applyShadowSize() {
    const sun = this.world && this.world.sun;
    if (!sun) return;
    const sm = SHADOW[this.cfg.shadows] || 0;
    sun.castShadow = !!sm;
    if (sm && sun.shadow.mapSize.x !== sm) {
      sun.shadow.mapSize.set(sm, sm);
      if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    }
  }
  recompile() {
    const touch = o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); };
    this.scene.traverse(touch);
    if (this.vm) this.vm.scene.traverse(touch);
  }
  setWorld(world) { this.world = world; this.applyShadowSize(); }
  setViewModel(vm) {
    this.vm = vm;
    if (this.vmPass && vm) { this.vmPass.scene = vm.scene; this.vmPass.camera = vm.camera; }
  }
  // compile every shader up front so the first shot or first enemy doesn't hitch
  warm() {
    const r = this.renderer;
    try {
      r.compile(this.scene, this.camera);
      if (this.vm) r.compile(this.vm.scene, this.vm.camera);
    } catch (e) { /* compile lazily instead */ }
  }
  render(withVM) {
    const r = this.renderer;
    if (this.cfg.bloom && this.composer) {
      this.vmPass.enabled = !!(withVM && this.vm);
      this.composer.render();
      return;
    }
    r.setRenderTarget(null);
    r.clear();
    r.render(this.scene, this.camera);
    if (withVM && this.vm) { r.clearDepth(); r.render(this.vm.scene, this.vm.camera); }
  }
  // false when this frame should be skipped to honour the FPS cap
  shouldRender(t) {
    const cap = this.cfg.cap;
    if (!cap) return true;
    if (t < this.capNext - 0.6) return false;
    this.capNext = Math.max(this.capNext + 1000 / cap, t);
    return true;
  }
  measureRefresh() {
    return new Promise(res => {
      const ts = [];
      const step = t => { ts.push(t); if (ts.length < 40) requestAnimationFrame(step); else done(); };
      const done = () => {
        const d = ts.slice(1).map((t, i) => t - ts[i]).sort((a, b) => a - b);
        this.refresh = Math.max(30, Math.min(360, Math.round(1000 / (d[d.length >> 1] || 16.7))));
        res(this.refresh);
      };
      requestAnimationFrame(step);
    });
  }
  target() { return Math.min(this.cfg.cap || Infinity, this.refresh); }
  // once per rendered frame: fps counter + (optional) slow, hysteretic resolution scaling
  tick(t) {
    const w = this.win;
    w.frames++;
    const el = t - w.t;
    if (el < 1000) return;
    this.fps = Math.round(w.frames * 1000 / el);
    this.ms = el / w.frames;
    w.t = t; w.frames = 0;
    if (!this.cfg.cap && this.fps > this.refresh * 1.05) this.refresh = Math.min(360, this.fps);
    if (!this.cfg.autoRes) return;
    const target = this.target();
    if (this.fps < target * 0.85) { w.good = 0; if (++w.bad >= 3 && this.dyn > 0.7) { this.dyn = Math.max(0.7, this.dyn - 0.1); w.bad = 0; this.resize(); } }
    else if (this.fps >= target * 0.97) { w.bad = 0; if (++w.good >= 8 && this.dyn < 1) { this.dyn = Math.min(1, this.dyn + 0.1); w.good = 0; this.resize(); } }
    else { w.good = 0; w.bad = 0; }
  }
}
