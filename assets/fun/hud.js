// DOM heads-up display. Everything here is presentation; game state lives in main.js.
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class Hud {
  constructor(t) {
    this.t = t;
    this.el = {
      hud: $('#hud'), xhair: $('#xhair'), hit: $('#hitmark'), scope: $('#scope'),
      hp: $('#hpVal'), hpBar: $('#hpBar'), ammo: $('#ammoVal'), res: $('#ammoRes'), wname: $('#wName'),
      sT: $('#scoreT'), sCT: $('#scoreCT'), feed: $('#feed'), chat: $('#chatLog'), board: $('#board'),
      death: $('#death'), deathBy: $('#deathBy'), deathT: $('#deathT'), dmg: $('#dmgDir'), msg: $('#centerMsg'),
      radar: $('#radar'), peers: $('#peerCount'), prot: $('#protect'), reload: $('#reloadBar'), slots: $('#slots'),
      fps: $('#fps'), kill: $('#killBanner'), money: $('#moneyVal'), armor: $('#armorVal'),
      round: $('#roundInfo'), banner: $('#roundBanner'), hurt: $('#hurtFx')
    };
    this.radarCtx = this.el.radar.getContext('2d');
    this.msgTimer = 0;
    this.lastHp = -1; this.lastAmmo = ''; this.lastW = '';
  }
  show(on) { this.el.hud.hidden = !on; }

  // ------------------------------------------------------------ crosshair (pixel-exact canvas)
  crosshairStyle(cfg) { this.xcfg = cfg; this._xkey = ''; this.placeCrosshair(); }
  placeCrosshair() {
    const c = this.el.xhair, S = 120;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    if (c.width !== S * dpr) { c.width = c.height = S * dpr; c.style.width = c.style.height = S + 'px'; }
    // snap the centre to a whole device pixel so lines never blur
    const x = Math.round(innerWidth / 2 * dpr) / dpr - S / 2, y = Math.round(innerHeight / 2 * dpr) / dpr - S / 2;
    c.style.transform = `translate(${x}px, ${y}px)`;
    this._xkey = '';
  }
  crosshair(gapPx, visible) {
    const c = this.el.xhair;
    if (this._xvis !== visible) { this._xvis = visible; c.hidden = !visible; }
    if (!visible || !this.xcfg) return;
    const cfg = this.xcfg;
    const gap = Math.round(cfg.gap + (cfg.dynamic ? Math.min(30, gapPx) : 0));
    const key = gap + '|' + JSON.stringify(cfg);
    if (key === this._xkey) return;
    this._xkey = key;
    drawCrosshair(c, cfg, gap);
  }
  fps(text) { this.el.fps.textContent = text; }
  killBanner(name, hs, streak) {
    const b = this.el.kill;
    const words = ['', '', 'DOUBLE KILL', 'TRIPLE KILL', 'QUAD KILL', 'ACE!'];
    b.innerHTML = `<span class="kb-x">✖</span><b>${esc(name)}</b>${hs ? '<em>HEADSHOT</em>' : ''}${streak > 1 ? `<strong>${words[Math.min(5, streak)]}</strong>` : ''}`;
    b.getAnimations().forEach(a => a.cancel());
    b.animate([{ opacity: 0, transform: 'translateY(8px) scale(.9)' }, { opacity: 1, transform: 'none', offset: 0.1 }, { opacity: 1, offset: 0.75 }, { opacity: 0, transform: 'translateY(-6px)' }], { duration: 1800, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
  scope(level) {
    if (this._scope === level) return;
    this._scope = level;
    this.el.scope.hidden = !level;
    document.documentElement.classList.toggle('scoped', !!level);
  }
  hitmark(head, kill) {
    // Web Animations instead of class toggles: no forced layout on every hit
    const h = this.el.hit;
    h.classList.toggle('hs', !!head);
    h.classList.toggle('kill', !!kill);
    if (this._hitAnim) this._hitAnim.cancel();
    this._hitAnim = h.animate([{ opacity: 1, scale: 1.25 }, { opacity: 0, scale: 1 }], { duration: 300, easing: 'ease-out' });
  }
  money(m, canBuy) {
    const k = m + '|' + canBuy;
    if (k === this._money) return;
    this._money = k;
    this.el.money.textContent = '$' + m;
    this.el.money.parentElement.classList.toggle('buyzone', !!canBuy);
  }
  armor(a, helmet) {
    const k = Math.ceil(a) + '|' + helmet;
    if (k === this._armor) return;
    this._armor = k;
    this.el.armor.textContent = Math.ceil(a);
    this.el.armor.parentElement.hidden = a <= 0;
    this.el.armor.parentElement.classList.toggle('helmet', !!helmet);
  }
  vitals(hp, mag, res, wname, reloadP) {
    if (hp !== this.lastHp) {
      this.el.hp.textContent = Math.max(0, Math.ceil(hp));
      this.el.hpBar.style.transform = `scaleX(${Math.max(0, hp) / 100})`;
      this.el.hud.classList.toggle('low', hp > 0 && hp <= 25);
      this.lastHp = hp;
    }
    const a = `${mag}|${res}`;
    if (a !== this.lastAmmo) {
      this.el.ammo.textContent = mag === Infinity ? '—' : mag;
      this.el.res.textContent = mag === Infinity ? '' : '/ ' + res;
      this.el.ammo.classList.toggle('empty', mag === 0);
      this.lastAmmo = a;
    }
    if (wname !== this.lastW) { this.el.wname.textContent = wname; this.lastW = wname; }
    if ((reloadP < 0) !== this._noReload) { this._noReload = reloadP < 0; this.el.reload.hidden = reloadP < 0; }
    if (reloadP >= 0) this.el.reload.firstElementChild.style.transform = `scaleX(${reloadP})`;
  }
  slots(list, active) {
    // list: [{key, name, id}]
    const key = active + list.map(s => s.id).join();
    if (key === this._slotKey) return;
    this._slotKey = key;
    const html = list.map(s => `<li class="${s.id === active ? 'on' : ''}"><b>${s.key}</b>${esc(s.name)}</li>`).join('');
    if (html !== this._slots) { this.el.slots.innerHTML = html; this._slots = html; }
  }
  score(t, ct) {
    if (t === this._sT && ct === this._sCT) return;
    this._sT = t; this._sCT = ct;
    this.el.sT.textContent = t; this.el.sCT.textContent = ct;
  }
  round(text) { if (text !== this._round) { this._round = text; this.el.round.textContent = text; } }
  peers(n, state) {
    this.el.peers.textContent = n;
    this.el.peers.parentElement.dataset.state = state;
  }
  protect(on) { if (this._prot !== on) { this._prot = on; this.el.prot.hidden = !on; } }
  banner(title, sub, cls) {
    const b = this.el.banner;
    b.className = 'round-banner ' + (cls || '');
    b.innerHTML = '<b>' + esc(title) + '</b>' + (sub ? '<span>' + esc(sub) + '</span>' : '');
    b.getAnimations().forEach(a => a.cancel());
    b.animate([{ opacity: 0, transform: 'translate(-50%, 10px)' }, { opacity: 1, transform: 'translate(-50%, 0)', offset: 0.08 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], { duration: 3600, fill: 'forwards' });
  }

  feed(e) {
    // e: {a, at, v, vt, w, hs, mine}
    const li = document.createElement('li');
    if (e.mine) li.className = 'mine';
    li.innerHTML = (e.a ? `<span class="tm-${e.at}">${esc(e.a)}</span>` : '') +
      `<em>${esc(e.w)}</em>${e.hs ? '<i class="hs" title="headshot"></i>' : ''}<span class="tm-${e.vt}">${esc(e.v)}</span>`;
    this.el.feed.prepend(li);
    while (this.el.feed.children.length > 6) this.el.feed.lastChild.remove();
    setTimeout(() => { li.classList.add('out'); setTimeout(() => li.remove(), 500); }, 7000);
  }
  chat(name, team, text, sys) {
    const li = document.createElement('li');
    li.innerHTML = sys ? `<span class="sys">${esc(text)}</span>` : `<b class="tm-${team}">${esc(name)}:</b> ${esc(text)}`;
    this.el.chat.append(li);
    while (this.el.chat.children.length > 7) this.el.chat.firstChild.remove();
    setTimeout(() => li.classList.add('old'), 9000);
  }
  center(text, ms = 1600) {
    const m = this.el.msg;
    m.textContent = text;
    m.classList.add('on');
    clearTimeout(this.msgTimer);
    this.msgTimer = setTimeout(() => m.classList.remove('on'), ms);
  }
  damageFrom(angle) {
    // angle: radians, 0 = straight ahead, positive = to the right
    const d = this.el.dmg;
    d.style.setProperty('--a', angle + 'rad');
    d.animate([{ opacity: 1 }, { opacity: 1, offset: 0.4 }, { opacity: 0 }], { duration: 1100 });
    this.el.hurt.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500 });
  }
  death(on, killer, weapon, secs) {
    this.el.death.hidden = !on;
    if (on) {
      this.el.deathBy.innerHTML = killer ? `${esc(this.t('killedBy'))} <b>${esc(killer)}</b> <em>${esc(weapon)}</em>` : esc(this.t('died'));
      this.el.deathT.textContent = secs < 0 ? this.t('nextRound') : this.t('respawnIn').replace('{s}', Math.max(0, secs).toFixed(1));
    }
  }
  board(on, rows, scores) {
    const b = this.el.board;
    b.hidden = !on;
    if (!on) return;
    const team = (k, label) => {
      const r = rows.filter(x => x.team === k).sort((a, c) => c.k - a.k || a.d - c.d);
      return `<section class="bd-${k}"><header><b>${label}</b><span>${scores[k]}</span></header><table>
        <tr><th>${esc(this.t('player'))}</th><th>K</th><th>D</th></tr>
        ${r.map(x => `<tr class="${x.me ? 'me' : ''}${x.alive ? '' : ' dead'}"><td>${esc(x.name)}${x.bot ? ' <small>BOT</small>' : ''}</td><td>${x.k}</td><td>${x.d}</td></tr>`).join('')}
      </table></section>`;
    };
    b.innerHTML = team('CT', 'COUNTER-TERRORISTS') + team('T', 'TERRORISTS');
  }

  // ------------------------------------------------------------ radar
  radarMap(def, boxes) {
    const [x0, z0, x1, z1] = def.bounds;
    const S = 6; // px per metre
    const c = document.createElement('canvas');
    c.width = (x1 - x0 + 4) * S; c.height = (z1 - z0 + 4) * S;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(30,34,40,.85)'; g.fillRect(0, 0, c.width, c.height);
    const sorted = boxes.filter(b => b.max[1] > 0.05).sort((a, b) => a.max[1] - b.max[1]);
    for (const b of sorted) {
      const tall = b.max[1] > 2.2;
      g.fillStyle = tall ? 'rgba(150,158,170,.95)' : 'rgba(95,104,116,.95)';
      g.fillRect((b.min[0] - x0 + 2) * S, (b.min[2] - z0 + 2) * S, (b.max[0] - b.min[0]) * S, (b.max[2] - b.min[2]) * S);
    }
    this.radarImg = { c, S, ox: x0 - 2, oz: z0 - 2 };
  }
  radar(me, yaw, blips) {
    const g = this.radarCtx, R = this.radarImg;
    const W = g.canvas.width, H = g.canvas.height, scale = 2.4; // canvas px per metre on the radar
    g.clearRect(0, 0, W, H);
    g.save();
    g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2); g.clip();
    g.fillStyle = 'rgba(10,12,16,.7)'; g.fillRect(0, 0, W, H);
    g.translate(W / 2, H / 2);
    g.rotate(yaw);
    if (R) {
      const k = scale / R.S;
      g.drawImage(R.c, (R.ox - me[0]) * scale, (R.oz - me[2]) * scale, R.c.width * k, R.c.height * k);
    }
    for (const b of blips) {
      const x = (b.p[0] - me[0]) * scale, y = (b.p[2] - me[2]) * scale;
      g.fillStyle = b.color;
      g.beginPath(); g.arc(x, y, b.dead ? 2.5 : 4, 0, Math.PI * 2); g.fill();
      if (b.dead) continue;
      g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.stroke();
    }
    g.restore();
    // me, always pointing up
    g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(W / 2, H / 2 - 7); g.lineTo(W / 2 + 5, H / 2 + 5); g.lineTo(W / 2 - 5, H / 2 + 5); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2;
    g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2); g.stroke();
  }
}

// Draws a CS-style crosshair centred in the canvas, in device pixels.
export function drawCrosshair(c, cfg, gap) {
  const g = c.getContext('2d');
  const dpr = c.width / 120;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, c.width, c.height);
  const px = v => Math.round(v * dpr);
  const cx = c.width / 2, cy = c.height / 2;
  const t = Math.max(1, px(cfg.thick)), L = px(cfg.size), G = px(gap), o = cfg.outline ? Math.max(1, px(1)) : 0;
  const half = Math.floor(t / 2);
  const rects = [
    [cx - G - L, cy - half, L, t], [cx + G + (t % 2), cy - half, L, t],
    [cy - G - L, cx - half, L, t, true], [cy + G + (t % 2), cx - half, L, t, true]
  ].map(([a, b, w, h, v]) => (v ? [b, a, h, w] : [a, b, w, h]));
  if (cfg.tstyle) rects.splice(2, 1);
  if (cfg.dot) rects.push([cx - half, cy - half, t, t]);
  g.globalAlpha = cfg.alpha ?? 1;
  if (o) {
    g.fillStyle = 'rgba(0,0,0,.85)';
    for (const [x, y, w, h] of rects) g.fillRect(Math.round(x) - o, Math.round(y) - o, w + o * 2, h + o * 2);
  }
  g.fillStyle = cfg.color;
  for (const [x, y, w, h] of rects) g.fillRect(Math.round(x), Math.round(y), w, h);
}
