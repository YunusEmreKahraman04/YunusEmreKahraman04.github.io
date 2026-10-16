// A de_dust2 remake laid out from scratch on a 1 m grid. Walkable areas and ramps are
// listed below; every cell that isn't walkable becomes wall. Cells are merged into
// as few boxes as possible, so the whole map is a few hundred colliders.
// North is -z. T spawn is south, CT spawn north; A site north-east, B site north-west.

const X0 = -48, X1 = 48, Z0 = -46, Z1 = 46, WALL = 7;

// [x0, z0, x1, z1, level]  or  ramp: {r: [x0, z0, x1, z1], axis, from, to}
// later entries win where they overlap
const AREAS = [
  [-14, 30, 20, 44, 1.2],                                   // T spawn
  [-5, -12, 3, 20, 0],                                      // mid
  [-8, 13, 6, 20, 0],                                       // top of mid (xbox)
  [-4, -26, 2, -12, 0],                                     // mid doors / CT mid
  [-12, -42, 14, -26, 0],                                   // CT spawn
  [-26, -40, -12, -33, 0],                                  // B doors
  [-44, -44, -26, -22, 0],                                  // B site
  [-42, -22, -34, -8, 0],                                   // B tunnel exit
  [-42, -8, -34, 24, 0],                                    // upper tunnels
  [-34, 4, -5, 10, 0],                                      // lower tunnels
  [10, -16, 16, 2, 2.0],                                    // catwalk
  [10, -24, 22, -16, 2.0],                                  // A short
  [14, -44, 46, -24, 2.0],                                  // A site
  [18, 20, 46, 32, 0.8],                                    // outside long
  { r: [-5, 20, 3, 30], axis: 'z', from: 0, to: 1.2 },      // top mid slope into T spawn
  { r: [-42, 24, -14, 34], axis: 'x', from: 0, to: 1.2 },   // T spawn to upper tunnels
  { r: [3, -4, 14, 2], axis: 'x', from: 0, to: 2.0 },       // short stairs up to catwalk
  { r: [10, -42, 22, -34], axis: 'x', from: 0, to: 2.0 },   // CT ramp up to A
  { r: [36, -24, 46, 20], axis: 'z', from: 2.0, to: 0.8 }   // long A
];
// cover, on top of whatever floor is there: [x0, z0, x1, z1, height, material]
const PROPS = [
  [-2, 12, -0.4, 13.6, 1.2, 'crate'],      // xbox
  [-4, -13, -2, -12.6, 3.2, 'door'],       // mid door
  [-2, -31, 0, -29, 1.2, 'crate'], [-8, -30, -6, -28, 1.2, 'crate'],
  [-38, -40, -35, -37, 2.4, 'crate'], [-34, -34, -32, -32, 1.2, 'crate'],
  [-30, -42, -28, -40, 2.4, 'crate'], [-42, -30, -38, -28, 1.4, 'mcrate'], [-30, -27, -28, -25, 1.2, 'crate'],
  [26, -36, 29, -33, 2.4, 'crate'], [33, -30, 35, -28, 1.2, 'crate'], [42, -42, 44, -38, 1.2, 'crate'], [18, -28, 20, -26, 1.2, 'crate'],
  [38, 4, 40, 8, 2.4, 'mcrate'],
  [36, 19.5, 39, 20.5, 4, 'door'], [43, 19.5, 46, 20.5, 4, 'door'],   // long doors
  [26, 24, 28, 26, 1.2, 'crate'],
  [-12, 33, -10, 35, 1.2, 'crate'], [8, 34, 10, 36, 1.2, 'crate'],
  [-38.5, 6, -37.5, 7, WALL, 'sandwall']
];
export const BOMBSITES = { A: [24, -42, 40, -28], B: [-42, -42, -30, -26] };

function levelGrid() {
  const W = X1 - X0, H = Z1 - Z0;
  const lv = new Float32Array(W * H).fill(NaN);
  for (const a of AREAS) {
    const [x0, z0, x1, z1] = a.r || a;
    for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) {
      let h;
      if (a.r) {
        const t = a.axis === 'x' ? (x + 0.5 - x0) / (x1 - x0) : (z + 0.5 - z0) / (z1 - z0);
        h = Math.round((a.from + (a.to - a.from) * t) * 10) / 10;
      } else h = a[4];
      lv[(z - Z0) * W + (x - X0)] = h;
    }
  }
  return { lv, W, H };
}

// greedy rectangle merge over cells with equal keys
function mergeCells(W, H, keyAt) {
  const used = new Uint8Array(W * H), out = [];
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const k = keyAt(x, z);
    if (k === null || used[z * W + x]) continue;
    let w = 1;
    while (x + w < W && !used[z * W + x + w] && keyAt(x + w, z) === k) w++;
    let h = 1;
    grow: while (z + h < H) {
      for (let i = 0; i < w; i++) if (used[(z + h) * W + x + i] || keyAt(x + i, z + h) !== k) break grow;
      h++;
    }
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) used[(z + j) * W + x + i] = 1;
    out.push([x, z, w, h, k]);
  }
  return out;
}

export function buildDust2Boxes() {
  const { lv, W, H } = levelGrid();
  const boxes = [];
  // walls: every cell with no floor
  for (const [x, z, w, h] of mergeCells(W, H, (x, z) => (Number.isNaN(lv[z * W + x]) ? 'wall' : null))) {
    boxes.push([X0 + x, 0, Z0 + z, X0 + x + w, WALL, Z0 + z + h, 'sandwall']);
  }
  // floors: one box per run of equal height (ramps become fine stairs)
  for (const [x, z, w, h, k] of mergeCells(W, H, (x, z) => { const v = lv[z * W + x]; return Number.isNaN(v) ? null : v.toFixed(1); })) {
    boxes.push([X0 + x, -1, Z0 + z, X0 + x + w, +k, Z0 + z + h, 'sandfloor']);
  }
  const floorAt = (x, z) => { const v = lv[(Math.floor(z) - Z0) * W + (Math.floor(x) - X0)]; return Number.isNaN(v) ? 0 : v; };
  for (const [x0, z0, x1, z1, height, mat] of PROPS) {
    const base = floorAt((x0 + x1) / 2, (z0 + z1) / 2);
    boxes.push([x0, base, z0, x1, base + height, z1, mat]);
  }
  // painted site letters and a bit of decoration (no collision)
  boxes.push([30, 4, -44.03, 33, 7, -43.99, 'signA', null, 'decor']);
  boxes.push([-37, 2.2, -44.03, -34, 5.2, -43.99, 'signB', null, 'decor']);
  return { boxes, floorAt };
}

const tSpawns = [-8, -4, 0, 4, 8, 12, 16].map((x, i) => [x, i % 2 ? 40 : 37.5, 0]);
const ctSpawns = [-8, -4, 0, 4, 8, -10, 10].map((x, i) => [x, i % 2 ? -38 : -35.5, Math.PI]);

export const DUST2 = {
  id: 'de_dust2',
  title: 'de_dust2',
  blurb: { tr: 'Klasik: uzun A, kısa A, orta, tüneller ve B. Bombayı kur ya da imha et.', en: 'The classic: long A, short, mid, tunnels and B. Plant the bomb or defuse it.' },
  bounds: [X0, Z0, X1, Z1],
  get boxes() { return (this._boxes ||= buildDust2Boxes().boxes); },
  ramps: [],
  spawns: { T: tSpawns, CT: ctSpawns },
  loadout: { T: null, CT: null },
  bombsites: BOMBSITES,
  navStep: 1.6,
  sky: { elevation: 58, azimuth: 120, zenith: '#3c79c9', horizon: '#cfe0ec', ground: '#b49a74', sun: '#fff1d6', fog: '#d8d2c4', fogNear: 120, fogFar: 380 },
  light: { sun: '#fff0d8', sunI: 2.6, hemiTop: '#dfe9f5', hemiBot: '#b89670', hemiI: 0.85, env: 0.4 }
};
