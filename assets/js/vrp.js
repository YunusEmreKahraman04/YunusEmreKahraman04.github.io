/* Street-network VRP demo.
   An irregular city grid (some streets closed, a couple of avenues) is the road
   graph. Stop-to-stop costs are shortest paths on that graph (Dijkstra), routes
   are built with sweep clustering + nearest neighbour + 2-opt, and vehicles drive
   the actual street geometry. Routes sharing a street are drawn as parallel lanes. */
(() => {
  'use strict';

  const KM_PER_PX = 0.021;
  const LANE = 2.6;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => 1 - Math.pow(1 - t, 3);

  function seeded(seed) {
    let s = seed >>> 0 || 1;
    return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  }

  /* ---------- road network ---------- */
  function buildNetwork(a, rand, step = 46, spread = 34) {
    const xs = [], ys = [];
    for (let x = a.x0; x <= a.x1; x += step + rand() * spread) xs.push(x);
    for (let y = a.y0; y <= a.y1; y += step * 0.85 + rand() * spread * 0.85) ys.push(y);
    const C = xs.length, R = ys.length;
    const nodes = [];
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        nodes.push({ x: xs[c], y: ys[r], i: nodes.length, adj: [] });
      }
    }
    const at = (r, c) => nodes[r * C + c];
    const mainRow = 1 + Math.floor(rand() * Math.max(1, R - 2));
    const mainCol = 1 + Math.floor(rand() * Math.max(1, C - 2));
    const edges = [];
    const link = (p, q, main) => {
      const e = { a: p, b: q, main, w: dist(p, q), off: false };
      edges.push(e);
      p.adj.push({ n: q, e });
      q.adj.push({ n: p, e });
    };
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        if (c + 1 < C) link(at(r, c), at(r, c + 1), r === mainRow);
        if (r + 1 < R) link(at(r, c), at(r + 1, c), c === mainCol);
      }
    }

    // Close ~16% of side streets, keeping the graph connected.
    const degree = n => n.adj.reduce((k, x) => k + (x.e.off ? 0 : 1), 0);
    const connected = () => {
      const seen = new Uint8Array(nodes.length), stack = [nodes[0]];
      seen[0] = 1;
      let count = 1;
      while (stack.length) {
        for (const { n, e } of stack.pop().adj) {
          if (!e.off && !seen[n.i]) { seen[n.i] = 1; count++; stack.push(n); }
        }
      }
      return count === nodes.length;
    };
    const candidates = edges.filter(e => !e.main).sort(() => rand() - 0.5).slice(0, Math.floor(edges.length * 0.16));
    for (const e of candidates) {
      if (degree(e.a) <= 2 || degree(e.b) <= 2) continue;
      e.off = true;
      if (!connected()) e.off = false;
    }
    return { nodes, edges: edges.filter(e => !e.off) };
  }

  function dijkstra(nodes, src) {
    const n = nodes.length;
    const d = new Float64Array(n).fill(Infinity);
    const prev = new Int32Array(n).fill(-1);
    const done = new Uint8Array(n);
    d[src.i] = 0;
    for (let k = 0; k < n; k++) {
      let u = -1, best = Infinity;
      for (let i = 0; i < n; i++) if (!done[i] && d[i] < best) { best = d[i]; u = i; }
      if (u < 0) break;
      done[u] = 1;
      for (const { n: v, e } of nodes[u].adj) {
        if (!e.off && d[u] + e.w < d[v.i]) { d[v.i] = d[u] + e.w; prev[v.i] = u; }
      }
    }
    return { d, prev };
  }

  function makeRouter(net) {
    const cache = new Map();
    const tree = p => {
      let t = cache.get(p.i);
      if (!t) { t = dijkstra(net.nodes, p); cache.set(p.i, t); }
      return t;
    };
    return {
      D: (a, b) => tree(a).d[b.i],
      path(a, b) {
        const prev = tree(a).prev, out = [];
        for (let i = b.i; i !== -1; i = prev[i]) { out.push(net.nodes[i]); if (i === a.i) break; }
        return out.reverse();
      }
    };
  }

  function nearestNode(net, x, y, filter) {
    let best = null, bd = Infinity;
    for (const n of net.nodes) {
      if (filter && !filter(n)) continue;
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < bd) { bd = d; best = n; }
    }
    return best ? { node: best, d: bd } : null;
  }

  function pickStops(net, area, count, depot, rand) {
    const inside = net.nodes.filter(n => n !== depot && n.x >= area.x0 && n.x <= area.x1 && n.y >= area.y0 && n.y <= area.y1 && dist(n, depot) > 50);
    inside.sort(() => rand() - 0.5);
    const minD = Math.sqrt(((area.x1 - area.x0) * (area.y1 - area.y0)) / count) * 0.6;
    const out = [];
    for (const n of inside) {
      if (out.length >= count) break;
      if (out.every(s => dist(s, n) >= minD)) out.push(n);
    }
    for (const n of inside) { if (out.length >= count) break; if (!out.includes(n)) out.push(n); }
    return out;
  }

  /* ---------- VRP: sweep + nearest neighbour + 2-opt on road costs ---------- */
  function solveVRP(router, depot, stops, vehicles) {
    const n = stops.length;
    if (!n) return { routes: [], total: 0 };
    const D = router.D;
    const k = Math.min(vehicles, n);
    const sorted = stops
      .map(s => ({ s, a: Math.atan2(s.y - depot.y, s.x - depot.x) }))
      .sort((p, q) => p.a - q.a)
      .map(o => o.s);
    const cost = seq => { let t = 0; for (let i = 1; i < seq.length; i++) t += D(seq[i - 1], seq[i]); return t; };
    const nn = group => {
      const left = group.slice(), seq = [depot];
      let cur = depot;
      while (left.length) {
        let bi = 0, bd = Infinity;
        left.forEach((p, i) => { const d = D(cur, p); if (d < bd) { bd = d; bi = i; } });
        cur = left.splice(bi, 1)[0];
        seq.push(cur);
      }
      seq.push(depot);
      return seq;
    };
    const twoOpt = seq => {
      let improved = true, guard = 0;
      while (improved && guard++ < 40) {
        improved = false;
        for (let i = 1; i < seq.length - 2; i++) {
          for (let j = i + 1; j < seq.length - 1; j++) {
            const delta = D(seq[i - 1], seq[j]) + D(seq[i], seq[j + 1]) - D(seq[i - 1], seq[i]) - D(seq[j], seq[j + 1]);
            if (delta < -1e-6) {
              const mid = seq.slice(i, j + 1).reverse();
              seq.splice(i, mid.length, ...mid);
              improved = true;
            }
          }
        }
      }
      return seq;
    };
    let best = null;
    for (let off = 0; off < n; off++) {
      const groups = Array.from({ length: k }, () => []);
      for (let i = 0; i < n; i++) groups[Math.floor((i * k) / n)].push(sorted[(i + off) % n]);
      const seqs = groups.map(g => twoOpt(nn(g)));
      const total = seqs.reduce((t, s) => t + cost(s), 0);
      if (!best || total < best.total) best = { seqs, total };
    }
    return { routes: best.seqs.map(seq => ({ seq, cost: cost(seq) })), total: best.total };
  }

  /* ---------- geometry: street path + lane offset ---------- */
  function laneOffset(list, off) {
    const out = [];
    const normal = (p, q) => {
      const dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy) || 1;
      return { x: -dy / L, y: dx / L };
    };
    for (let j = 0; j < list.length; j++) {
      const p = list[j];
      const nIn = j > 0 ? normal(list[j - 1], p) : null;
      const nOut = j < list.length - 1 ? normal(p, list[j + 1]) : null;
      if (!nIn || !nOut) {
        const nv = nIn || nOut || { x: 0, y: 0 };
        out.push({ x: p.x + nv.x * off, y: p.y + nv.y * off, node: p });
        continue;
      }
      const dot = nIn.x * nOut.x + nIn.y * nOut.y;
      if (dot < -0.6) {
        out.push({ x: p.x + nIn.x * off, y: p.y + nIn.y * off, node: p });
        out.push({ x: p.x + nOut.x * off, y: p.y + nOut.y * off, node: p });
      } else {
        const f = off / (1 + dot);
        out.push({ x: p.x + (nIn.x + nOut.x) * f, y: p.y + (nIn.y + nOut.y) * f, node: p });
      }
    }
    return out;
  }

  function routeGeometry(router, seq, offset) {
    const list = [];
    for (let j = 1; j < seq.length; j++) {
      router.path(seq[j - 1], seq[j]).forEach((p, idx) => {
        if (idx === 0 && list.length) return;
        list.push(p);
      });
    }
    const pts = laneOffset(list, offset);
    const cum = [0];
    for (let j = 1; j < pts.length; j++) cum.push(cum[j - 1] + dist(pts[j - 1], pts[j]));
    return { pts, cum, len: cum[cum.length - 1] };
  }

  const laneFor = (i, k) => (i - (k - 1) / 2) * LANE;

  /* ---------- static plan for SVG visuals ---------- */
  function planSVG(w, h, opts = {}) {
    const rand = seeded(opts.seed || 7);
    const net = buildNetwork({ x0: -6, x1: w + 6, y0: -6, y1: h + 6 }, rand, 52, 30);
    const router = makeRouter(net);
    const depot = nearestNode(net, w / 2, h / 2).node;
    const stops = pickStops(net, { x0: 50, x1: w - 50, y0: 40, y1: h - 70 }, opts.stops || 16, depot, rand);
    const sol = solveVRP(router, depot, stops, opts.vehicles || 4);
    const k = sol.routes.length;
    const toPath = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('');
    return {
      depot,
      streets: net.edges,
      routes: sol.routes.map((r, i) => {
        const g = routeGeometry(router, r.seq, laneFor(i, k));
        return { color: i % 4, d: toPath(g.pts), len: g.len, stops: r.seq.filter(p => p !== depot) };
      })
    };
  }

  window.VRP = Object.assign(window.VRP || {}, { planSVG, refresh() {} });

  /* ======================================================================
     Live hero canvas — two layers:
       static  : streets (+ routes, stops, depot once the draw-in has finished)
       dynamic : vehicles, trails, stop pulses, depot ping, pointer preview
     The dynamic loop is capped at ~60 fps so 120/144 Hz screens don't pay double.
     ====================================================================== */
  const canvas = document.getElementById('vrp');
  const staticCanvas = document.getElementById('vrpStatic');
  if (!canvas || !staticCanvas) return;
  const ctx = canvas.getContext('2d');
  const sctx = staticCanvas.getContext('2d');
  const hero = document.getElementById('hero');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MAX_STOPS = 40;
  const SPEED = 78;
  const FRAME_MS = 1000 / 61;
  const IGNORE = 'a, button, input, .hud, .hero-content > *';
  const byId = id => document.getElementById(id);

  let W = 0, H = 0, dpr = 1;
  let net = null, router = null, depot = null, fade = null;
  let stops = [], routes = [], vehicles = 4, total = 0;
  let palette = { route: ['#5eead4'], text: '#ffffff', muted: '#888888' };
  let sprites = {};
  let settled = false;
  const mouse = { x: -1e4, y: -1e4, active: false, dirty: false };
  let visible = true, raf = 0, last = 0, lastPaint = 0, solvedAt = 0, drawMs = 1300;

  function rgba(hex, a) {
    let h = (hex || '#ffffff').replace('#', '').trim();
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  function readPalette() {
    const cs = getComputedStyle(document.documentElement);
    const v = n => cs.getPropertyValue(n).trim();
    palette = { route: [v('--accent'), v('--accent-2'), v('--accent-3'), v('--accent-4')], text: v('--text'), muted: v('--muted') };
  }

  // Pre-rendered glow sprites (one per colour) instead of per-frame shadowBlur.
  const GLOW = 18;
  function glowSprite(col) {
    if (sprites[col]) return sprites[col];
    const c = document.createElement('canvas');
    c.width = c.height = GLOW * 2 * dpr;
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const grad = g.createRadialGradient(GLOW, GLOW, 0, GLOW, GLOW, GLOW);
    grad.addColorStop(0, rgba(col, 0.75));
    grad.addColorStop(0.35, rgba(col, 0.28));
    grad.addColorStop(1, rgba(col, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, GLOW * 2, GLOW * 2);
    return (sprites[col] = c);
  }

  /* ---------- layout ---------- */
  const isMobile = () => W < 960;
  function areas() {
    if (isMobile()) {
      return { net: { x0: -8, x1: W + 8, y0: -8, y1: H + 8 }, stops: { x0: 24, x1: W - 24, y0: 50, y1: H - 34 } };
    }
    // Keep the routes clear of the name: start right of its widest line.
    const left = canvas.getBoundingClientRect().left;
    const nameRight = Math.max(0, ...Array.from(document.querySelectorAll('.hero-name .line > span'), el => el.getBoundingClientRect().right - left));
    const x0 = Math.min(Math.max(W * 0.5, nameRight + 50), W - 380);
    const stopsArea = { x0, x1: W - 80, y0: 130, y1: H - 240 };
    return { net: { x0: stopsArea.x0 - 150, x1: W + 8, y0: 70, y1: H + 8 }, stops: stopsArea };
  }

  /* ---------- static layer ---------- */
  function strokeRoute(g, r, upto, width, alpha) {
    g.beginPath();
    g.moveTo(r.pts[0].x, r.pts[0].y);
    for (let j = 1; j < r.pts.length; j++) {
      if (r.cum[j] >= upto) { const e = pointAt(r, upto); g.lineTo(e.x, e.y); break; }
      g.lineTo(r.pts[j].x, r.pts[j].y);
    }
    g.lineWidth = width;
    g.strokeStyle = rgba(palette.route[r.color], alpha);
    g.stroke();
  }

  function drawStop(g, s, extra = 0, grow = 1) {
    const col = palette.route[s.c] || palette.route[0];
    g.fillStyle = rgba(col, 0.25 + extra * 0.75);
    g.strokeStyle = rgba(col, 0.95);
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(s.x, s.y, 3.6 * grow + extra * 1.2, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }

  function drawDepot(g) {
    g.fillStyle = palette.text;
    g.beginPath();
    if (g.roundRect) g.roundRect(depot.x - 6, depot.y - 6, 12, 12, 3); else g.rect(depot.x - 6, depot.y - 6, 12, 12);
    g.fill();
    g.font = '500 10px "JetBrains Mono", monospace';
    g.fillStyle = rgba(palette.muted, 0.95);
    g.fillText('DEPOT', depot.x + 12, depot.y - 10);
  }

  function drawStatic() {
    const g = sctx;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    g.lineCap = 'round';
    g.lineJoin = 'round';

    // Streets, faded out radially around the stop area so they never crowd the text.
    for (const main of [false, true]) {
      g.beginPath();
      for (const e of net.edges) {
        if (e.main !== main) continue;
        g.moveTo(e.a.x, e.a.y);
        g.lineTo(e.b.x, e.b.y);
      }
      g.lineWidth = main ? 2.6 : 1;
      g.strokeStyle = rgba(palette.muted, main ? 0.2 : 0.17);
      g.stroke();
    }
    g.save();
    g.globalCompositeOperation = 'destination-in';
    const grad = g.createRadialGradient(fade.x, fade.y, fade.r * 0.35, fade.x, fade.y, fade.r);
    grad.addColorStop(0, '#000');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    g.restore();

    if (!settled) return;
    for (const r of routes) { strokeRoute(g, r, r.len, 1.2, 0.16); strokeRoute(g, r, r.len, 1.7, 0.62); }
    for (const s of stops) drawStop(g, s);
    drawDepot(g);
  }

  function generate() {
    const a = areas();
    net = buildNetwork(a.net, Math.random);
    router = makeRouter(net);
    const c = { x: (a.stops.x0 + a.stops.x1) / 2, y: (a.stops.y0 + a.stops.y1) / 2 };
    fade = { x: c.x, y: c.y, r: Math.max(a.stops.x1 - a.stops.x0, a.stops.y1 - a.stops.y0) * (isMobile() ? 0.9 : 0.95) };
    depot = nearestNode(net, c.x, c.y).node;
    stops = pickStops(net, a.stops, isMobile() ? 12 : 22, depot, Math.random);
    stops.forEach(s => { s.stop = true; s.hit = -1e9; s.born = 0; });
    solve(false);
  }

  function solve(fast) {
    const sol = solveVRP(router, depot, stops, vehicles);
    const k = sol.routes.length;
    routes = sol.routes.map((r, i) => {
      r.seq.forEach(p => { if (p !== depot) p.c = i % 4; });
      const g = routeGeometry(router, r.seq, laneFor(i, k));
      return { ...g, color: i % 4, t: 0, seg: 1, delay: fast ? i * 60 : 250 + i * 160 };
    });
    total = sol.total;
    drawMs = fast ? 700 : 1500;
    solvedAt = performance.now();
    settled = reduce;
    drawStatic();
    updateHud();
    kick();
  }

  function pointAt(r, d) {
    let j = 1;
    while (j < r.cum.length - 1 && r.cum[j] < d) j++;
    const a = r.pts[j - 1], b = r.pts[j];
    const segLen = r.cum[j] - r.cum[j - 1] || 1;
    const f = clamp((d - r.cum[j - 1]) / segLen, 0, 1);
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, j };
  }

  function traceRange(r, from, to) {
    const s = pointAt(r, from);
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    for (let j = s.j; j < r.pts.length; j++) {
      if (r.cum[j] >= to) { const e = pointAt(r, to); ctx.lineTo(e.x, e.y); return; }
      ctx.lineTo(r.pts[j].x, r.pts[j].y);
    }
  }

  /* ---------- dynamic layer ---------- */
  function frame(now) {
    raf = 0;
    if (!reduce && lastPaint && now - lastPaint < FRAME_MS) { raf = requestAnimationFrame(frame); return; }
    lastPaint = now;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const since = now - solvedAt;
    if (!settled) {
      // Draw-in phase: progressive routes + stops on the dynamic layer.
      let doneAll = true;
      for (const r of routes) {
        const prog = ease(clamp((since - r.delay) / drawMs, 0, 1));
        if (prog < 1) doneAll = false;
        strokeRoute(ctx, r, r.len, 1.2, 0.16);
        if (prog > 0) strokeRoute(ctx, r, prog * r.len, 1.7, 0.62);
      }
      for (const s of stops) drawStop(ctx, s, 0, s.born ? ease(clamp((now - s.born) / 450, 0, 1)) : 1);
      drawDepot(ctx);
      if (doneAll) { settled = true; drawStatic(); }
    }

    if (settled && !reduce) {
      for (const r of routes) {
        const col = palette.route[r.color];
        r.t = (r.t + dt * SPEED) % r.len;
        const p = pointAt(r, r.t);
        if (p.j !== r.seg) {
          const passed = r.pts[p.j - 1].node;
          if (passed.stop) passed.hit = now;
          r.seg = p.j;
        }
        const tail = Math.max(0, r.t - 80);
        const t0 = pointAt(r, tail);
        const grad = ctx.createLinearGradient(t0.x, t0.y, p.x, p.y);
        grad.addColorStop(0, rgba(col, 0));
        grad.addColorStop(1, rgba(col, 0.95));
        ctx.lineWidth = 2.8;
        ctx.strokeStyle = grad;
        traceRange(r, tail, r.t);
        ctx.stroke();

        ctx.drawImage(glowSprite(col), p.x - GLOW, p.y - GLOW, GLOW * 2, GLOW * 2);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.6, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const s of stops) {
        const pulse = clamp(1 - (now - s.hit) / 900, 0, 1);
        if (pulse <= 0) continue;
        const col = palette.route[s.c] || palette.route[0];
        ctx.strokeStyle = rgba(col, pulse * 0.6);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 4 + (1 - pulse) * 14, 0, Math.PI * 2);
        ctx.stroke();
        drawStop(ctx, s, pulse);
      }
    }

    if (!reduce) {
      const ring = (now % 2400) / 2400;
      ctx.strokeStyle = rgba(palette.text, 0.45 * (1 - ring));
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(depot.x, depot.y, 9 + ring * 22, 0, Math.PI * 2);
      ctx.stroke();
    }

    drawPointer();

    if (visible && !reduce) raf = requestAnimationFrame(frame);
  }

  // Snap to the nearest intersection; preview the street path from the depot.
  function drawPointer() {
    if (!mouse.active || !net) return;
    const hit = nearestNode(net, mouse.x, mouse.y);
    if (!hit || hit.d > 42 || hit.node === depot) return;
    const n = hit.node;
    const km = (router.D(depot, n) * KM_PER_PX).toFixed(1);
    ctx.font = '500 10.5px "JetBrains Mono", monospace';
    if (n.stop) {
      const col = palette.route[n.c] || palette.route[0];
      ctx.strokeStyle = rgba(col, 0.9);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = rgba(palette.text, 0.9);
      ctx.fillText(`#${stops.indexOf(n) + 1} · ${km} km`, n.x + 14, n.y + 4);
      return;
    }
    const path = router.path(depot, n);
    ctx.strokeStyle = rgba(palette.text, 0.55);
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = rgba(palette.text, 0.85);
    ctx.beginPath();
    ctx.arc(n.x, n.y, 7, 0, Math.PI * 2);
    ctx.moveTo(n.x - 3.5, n.y); ctx.lineTo(n.x + 3.5, n.y);
    ctx.moveTo(n.x, n.y - 3.5); ctx.lineTo(n.x, n.y + 3.5);
    ctx.stroke();
    ctx.fillStyle = rgba(palette.text, 0.9);
    ctx.fillText(`+ ${km} km`, n.x + 12, n.y - 8);
  }

  function kick() {
    if (!visible || raf || !net) return;
    raf = requestAnimationFrame(frame);
  }

  function updateHud() {
    const set = (id, v) => { const el = byId(id); if (el) el.textContent = v; };
    set('hudStops', stops.length);
    set('hudVeh', vehicles);
    set('hudKm', (total * KM_PER_PX).toFixed(1));
  }

  /* ---------- sizing ---------- */
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const nw = Math.round(rect.width), nh = Math.round(rect.height);
    const widthChanged = nw !== W;
    W = nw; H = nh;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    sprites = {};
    for (const c of [canvas, staticCanvas]) { c.width = W * dpr; c.height = H * dpr; }
    // Mobile URL-bar height jitter shouldn't rebuild the city.
    if (widthChanged || !net) generate();
    else { drawStatic(); kick(); }
  }

  /* ---------- interaction ---------- */
  function local(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  hero.addEventListener('pointermove', e => {
    const p = local(e);
    mouse.x = p.x; mouse.y = p.y;
    const active = e.pointerType === 'mouse' && !e.target.closest(IGNORE);
    if (active !== mouse.active) { mouse.active = active; hero.classList.toggle('crosshair', active); }
    if (reduce) frame(performance.now());
  }, { passive: true });

  hero.addEventListener('pointerleave', () => {
    mouse.active = false;
    hero.classList.remove('crosshair');
    if (reduce) frame(performance.now());
  });

  hero.addEventListener('click', e => {
    if (e.target.closest(IGNORE) || !net) return;
    const p = local(e);
    const hit = nearestNode(net, p.x, p.y, n => !n.stop && n !== depot);
    if (!hit || hit.d > 50) return;
    if (stops.length >= MAX_STOPS) stops.shift().stop = false;
    const n = hit.node;
    Object.assign(n, { stop: true, hit: performance.now(), born: performance.now(), c: 0 });
    stops.push(n);
    solve(true);
  });

  byId('vehMinus')?.addEventListener('click', () => { vehicles = Math.max(1, vehicles - 1); solve(true); });
  byId('vehPlus')?.addEventListener('click', () => { vehicles = Math.min(6, vehicles + 1); solve(true); });
  byId('vrpReset')?.addEventListener('click', () => generate());

  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting && !document.hidden;
    last = 0;
    kick();
  }).observe(hero);

  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    last = 0;
    kick();
  });

  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });

  window.VRP.refresh = () => { readPalette(); sprites = {}; if (net) { drawStatic(); kick(); } };

  readPalette();
  // Layout depends on the name's width, so wait for the web font (max 0.9 s).
  const fontsReady = document.fonts && document.fonts.ready
    ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 900))])
    : Promise.resolve();
  fontsReady.then(resize);
})();
