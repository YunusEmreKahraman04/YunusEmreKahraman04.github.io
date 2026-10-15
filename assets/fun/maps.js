// Map data, after the CS:GO versions of awp_lego_2 and aim_redline.
// Units are metres (1 CS unit = 2.54 cm), y is up. T spawns on -x, CT on +x.
// A box is [x0, y0, z0, x1, y1, z1, material, colour?, flags?]; flag 'decor' = no collision.
// A ramp is { x0, x1, z0, z1, y0, y1, mat, color } rising from y0 at x0 to y1 at x1.

const mirrorX = b => [-b[3], b[1], b[2], -b[0], b[4], b[5], b[6], b[7], b[8]];
const recolor = (list, from, to) => list.map(b => (b[7] === from ? [...b.slice(0, 7), to, b[8]] : b));
const mirrorRamp = r => ({ ...r, x0: -r.x0, x1: -r.x1 });

// ---------------------------------------------------------------- awp_lego
const lego = (() => {
  const C = { red: '#c4281c', white: '#f2f3f2', yellow: '#f5cd2f', blue: '#1e6fd6', green: '#4b974b', orange: '#da8541', grey: '#a3a2a5' };
  const W = 30, D = 18, H = 6;
  // the yellow fortress: a raised deck with a parapet, an inner court and a tower
  const fort = [
    [-27, 0, -7, -14, 2.4, 7, 'lego', C.yellow],
    [-27, 2.4, -7, -26.6, 3.2, 7, 'lego', C.yellow],
    [-27, 2.4, -7, -14, 3.2, -6.6, 'lego', C.yellow],
    [-27, 2.4, 6.6, -14, 3.2, 7, 'lego', C.yellow],
    [-14.4, 2.4, -6.6, -14, 3.2, 1.5, 'lego', C.yellow],
    [-14.4, 2.4, 4.5, -14, 3.2, 6.6, 'lego', C.yellow],
    // inner court with a doorway towards the front
    [-24, 2.4, -3.5, -23.6, 3.3, 3.5, 'lego', C.yellow],
    [-24, 2.4, -3.5, -18, 3.3, -3.1, 'lego', C.yellow],
    [-24, 2.4, 3.1, -18, 3.3, 3.5, 'lego', C.yellow],
    [-18.4, 2.4, -3.1, -18, 3.3, -0.8, 'lego', C.yellow],
    [-18.4, 2.4, 0.8, -18, 3.3, 3.1, 'lego', C.yellow],
    // tower with two dark windows
    [-26.6, 2.4, -1.6, -24.2, 7.8, 1.6, 'lego', C.yellow],
    [-24.21, 6.3, -1.2, -24.17, 7.3, -0.25, 'dark', null, 'decor'],
    [-24.21, 6.3, 0.25, -24.17, 7.3, 1.2, 'dark', null, 'decor']
  ];
  const ctFort = recolor(fort.map(mirrorX), C.yellow, C.blue);
  const cover = [
    [-2, 0, -9, 2, 1.2, -7, 'lego', C.green], [-2, 0, 7, 2, 1.2, 9, 'lego', C.green],
    [-1.6, 0, -1, 1.6, 1.2, 1, 'lego', C.white], [-0.8, 1.2, -1, 0.8, 2.4, 1, 'lego', C.orange]
  ];
  const sideCover = [
    [-9.2, 0, -13.2, -6.8, 1.2, -11.2, 'lego', C.green], [-9.2, 0, 11.2, -6.8, 1.2, 13.2, 'lego', C.green],
    [-8, 0, -3, -7.2, 0.8, 3, 'lego', C.grey],
    [-12, 0, -15.6, -10.4, 2.4, -14, 'lego', C.white], [-12, 0, 14, -10.4, 2.4, 15.6, 'lego', C.white]
  ];
  const boxes = [
    [-W, -1, -D, W, 0, D, 'lego', C.red],
    [-W - 1, 0, -D - 1, W + 1, H, -D, 'lego', C.white], [-W - 1, 0, D, W + 1, H, D + 1, 'lego', C.white],
    [-W - 1, 0, -D, -W, H, D, 'lego', C.white], [W, 0, -D, W + 1, H, D, 'lego', C.white],
    ...fort, ...ctFort, ...cover, ...sideCover, ...sideCover.map(mirrorX)
  ];
  const ramp = { x0: -8, x1: -14, z0: 1.5, z1: 4.5, y0: 0, y1: 2.4, mat: 'lego', color: C.yellow };
  const spawnsT = [[-25.8, -5.4], [-25.8, 5.4], [-21, -5.2], [-21, 5.2], [-16, -5.2], [-16, 5.2], [-21, 0]].map(([x, z]) => [x, z, -Math.PI / 2]);
  return {
    id: 'awp_lego',
    title: 'awp_lego_2',
    blurb: { tr: 'Kırmızı LEGO zemin, iki kale, rampalar. Herkese AWP: tek mermi, tek leş.', en: 'Red LEGO floor, two forts, ramps. AWPs for everyone: one shot, one kill.' },
    bounds: [-W, -D, W, D],
    boxes,
    ramps: [ramp, { ...mirrorRamp(ramp), color: C.blue }],
    spawns: { T: spawnsT, CT: spawnsT.map(([x, z]) => [-x, z, Math.PI / 2]) },
    loadout: { T: 'awp', CT: 'awp' },
    sky: { elevation: 55, azimuth: 140, zenith: '#8fa9c6', horizon: '#dfe6ec', ground: '#b9b9b9', sun: '#fff8ea', fog: '#dfe6ec', fogNear: 120, fogFar: 400 },
    light: { sun: '#fffaf0', sunI: 2.0, hemiTop: '#e6eef8', hemiBot: '#b8574e', hemiI: 0.9, env: 0.35 },
    lego: true
  };
})();

// ---------------------------------------------------------------- aim_redline
const redline = (() => {
  const W = 20, D = 13, H = 7;
  const pilasters = [];
  for (const x of [-16, -10, -4, 4, 10, 16]) {
    pilasters.push([x - 0.35, 0, -D, x + 0.35, H, -D + 0.4, 'pillar'], [x - 0.35, 0, D - 0.4, x + 0.35, H, D, 'pillar']);
  }
  const half = [
    // loading dock with steps at both ends
    [-W, 0, -D, -16, 1.2, D, 'dock'],
    [-16, 0, -12.6, -15.4, 0.8, -10.6, 'dock'], [-15.4, 0, -12.6, -14.8, 0.4, -10.6, 'dock'],
    [-16, 0, 10.6, -15.4, 0.8, 12.6, 'dock'], [-15.4, 0, 10.6, -14.8, 0.4, 12.6, 'dock'],
    // crates
    [-12.6, 0, -9.6, -11.4, 1.2, -8.4, 'crate'], [-12.4, 1.2, -9.4, -11.6, 2.0, -8.6, 'crate'],
    [-13.2, 0, 2.4, -12, 1.2, 3.6, 'crate'], [-13.2, 0, 3.6, -12, 1.2, 4.8, 'crate'],
    [-9.8, 0, 7.4, -8.2, 1.2, 8.6, 'mcrate'], [-9.8, 0, 8.6, -8.2, 1.2, 9.8, 'mcrate'],
    [-7.6, 0, -3.6, -6.4, 1.2, -2.4, 'crate'], [-6.4, 0, -3.4, -5.6, 0.8, -2.6, 'crate'],
    [-5.2, 0, 6, -4, 1.2, 7.2, 'crate'], [-5.2, 1.2, 6, -4, 2.4, 7.2, 'crate'],
    [-6, 0, -10, -4.4, 1.2, -8.8, 'mcrate'],
    [-W + 0.02, 3.6, -6.3, -W + 0.12, 3.9, -5.7, 'bulb', null, 'decor'], [-W + 0.02, 3.6, 5.7, -W + 0.12, 3.9, 6.3, 'bulb', null, 'decor'],
    // yellow-black edge along the dock
    [-16.02, 1.0, -10.6, -15.99, 1.2, 10.6, 'hazard', null, 'decor'], [-16.2, 1.2, -13, -16, 1.21, 13, 'hazard', null, 'decor']
  ];
  // roof beams, hanging lamps and wall sconces (no collision)
  const decor = [];
  for (const x of [-15, -9, -3, 3, 9, 15]) {
    decor.push([x - 0.18, 6.4, -D, x + 0.18, H, D, 'beam', null, 'decor']);
    for (const z of [-7, 0, 7]) {
      decor.push([x - 0.32, 5.85, z - 0.32, x + 0.32, 6.1, z + 0.32, 'lampshade', null, 'decor']);
      decor.push([x - 0.16, 5.78, z - 0.16, x + 0.16, 5.86, z + 0.16, 'bulb', null, 'decor']);
      decor.push([x - 0.02, 6.1, z - 0.02, x + 0.02, 6.4, z + 0.02, 'beam', null, 'decor']);
    }
  }
  for (const x of [-13, -7, -1, 1, 7, 13]) {
    decor.push([x - 0.12, 3.4, -D + 0.4, x + 0.12, 3.6, -D + 0.5, 'bulb', null, 'decor'], [x - 0.12, 3.4, D - 0.5, x + 0.12, 3.6, D - 0.4, 'bulb', null, 'decor']);
  }
  const boxes = [
    [-W, -1, -D, W, 0, D, 'concrete'],
    [-W - 1, 0, -D - 1, W + 1, H, -D, 'brick'], [-W - 1, 0, D, W + 1, H, D + 1, 'brick'],
    [-W - 1, 0, -D, -W, H, D, 'brick'], [W, 0, -D, W + 1, H, D, 'brick'],
    [-W - 1, H, -D - 1, W + 1, H + 0.6, D + 1, 'ceiling'],
    ...pilasters, ...half, ...half.map(mirrorX),
    [-1.3, 0, -3.4, 1.3, 2.6, 3.4, 'container'], [-1.3, 2.6, -2.4, 1.3, 5.2, 2.4, 'container'],
    ...decor
  ];
  const spawnsT = [-9, -6, -3, 0, 3, 6, 9].map((z, i) => [i % 2 ? -17 : -18.4, z, -Math.PI / 2]);
  return {
    id: 'aim_redline',
    title: 'aim_redline',
    blurb: { tr: 'Kapalı depo: konteynerler, sandıklar, yükleme rampaları. AK-47 vs M4.', en: 'An indoor warehouse: containers, crates, loading docks. AK-47 vs M4.' },
    bounds: [-W, -D, W, D],
    boxes,
    ramps: [],
    spawns: { T: spawnsT, CT: spawnsT.map(([x, z]) => [-x, z, Math.PI / 2]) },
    loadout: { T: 'ak47', CT: 'm4a4' },
    sky: { elevation: 70, azimuth: 30, zenith: '#5d5a55', horizon: '#8a8378', ground: '#3d3934', sun: '#fff1d8', fog: '#2b2925', fogNear: 60, fogFar: 200 },
    light: { sun: '#ffe9c8', sunI: 1.25, hemiTop: '#fff3df', hemiBot: '#5b5248', hemiI: 1.15, env: 0.3 },
    indoor: true
  };
})();

export const MAPS = { awp_lego: lego, aim_redline: redline };
export const MAP_ORDER = ['awp_lego', 'aim_redline'];
