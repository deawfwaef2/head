// 第十九轮（UI/地图 Agent）· 地点基因组生成器（MOD wgen，默认开；关掉 = 回到第十八轮的 wlayout/worldlay 效果）
// 用户：地图加载太慢；要“大师级地点生成器”——没有任何两个地点相同、各有特色、一辈子也难重复、非常好看、设计合理。
// 做法：每个地点由 node.seed 派生一条“基因组”（连续 + 组合参数），buildNode 的各处只读基因组，不改玩法/碰撞/敌人接口：
//   天空(9 张 HDRI 跨风格混用 + 任意朝向 + 色调) × 光照氛围(金色黄昏/晨雾/阴天/血色残阳/瘴气/紫暮/月夜…) × 季节(盛绿/初秋/深秋/枯败/早春/霜冻/病态，实例级着色)
//   × 地形原型(丘陵/梯田/盆地/山脊/沙丘/土墩群/台地/陨坑/干沟，连续参数) × 水(溪流/池塘/血池，含河岸、芦苇、木桥) × 植被子集与密度/聚簇 × 地表顶点着色(苔/干土/岩/湿岸/小径)
//   × 布景库(倒木/哨塔/墓园/补给/无门之门/神像广场/巨岩群/花环/灯径/客厅…) × 光束/地雾。
// 基因组在加载资源之前就能算出来（纯函数 of node.seed）→ 只下载这个地点真正用到的资产，邻居地点也能精确预热。
// 模型全部是现成的 Poly Haven CC0 资产；这里程序化的只有“布局、地形、着色、水面”。
window.WGen = (() => {
  const C = THREE.Color, V3 = THREE.Vector3;
  const on = () => !(window.Mods && Mods.on('wgen') === false);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const mulberry = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
  const wpick = (r, L) => { let s = 0; for (const x of L) s += x[1]; let t = r() * s; for (const x of L) if ((t -= x[1]) <= 0) return x[0]; return L[0][0]; };
  const gauss = (r) => (r() + r() + r() - 1.5) * 1.4142;
  // 值噪声 fbm（0..1）
  function vnoise(seed) {
    const h = (x, y) => { let n = (x * 374761393 + y * 668265263 + seed * 69069) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
    const v = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
      return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - w) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * w; };
    return (x, y) => v(x, y) * 0.56 + v(x * 2.03 + 17, y * 2.03 - 5) * 0.28 + v(x * 4.1 - 9, y * 4.1 + 3) * 0.16;
  }

  // ---------------- 数据表 ----------------
  const SKYM = { evening_meadow: { k: 2.6 }, misty_pines: { k: 1.9 }, drakensberg_solitary_mountain: { k: 3.0 }, roofless_ruins: { k: 2.4 }, muddy_autumn_forest: { k: 1.5 }, teutonic_castle_moat: { k: 2.4 },
    cobblestone_street_night: { k: 0.5, night: 1 }, moonless_golf: { k: 0.35, night: 1 }, snowy_hillside: { k: 2.8 } };
  const SKYALT = {
    meadow: [['evening_meadow', 6], ['misty_pines', 1.1], ['muddy_autumn_forest', 1.6], ['drakensberg_solitary_mountain', 1.2]],
    forest: [['misty_pines', 5], ['muddy_autumn_forest', 3], ['evening_meadow', 1.2]],
    wilds: [['drakensberg_solitary_mountain', 5], ['evening_meadow', 1.6], ['snowy_hillside', 0.6]],
    ruins: [['roofless_ruins', 5], ['misty_pines', 1.6], ['cobblestone_street_night', 1.3], ['moonless_golf', 0.9]],
    swamp: [['muddy_autumn_forest', 4], ['misty_pines', 3], ['moonless_golf', 0.9]],
    fortress: [['teutonic_castle_moat', 5], ['drakensberg_solitary_mountain', 1.2], ['roofless_ruins', 1], ['cobblestone_street_night', 0.9]],
    capital: [['cobblestone_street_night', 4], ['teutonic_castle_moat', 1.6], ['evening_meadow', 1]],
    abyss: [['moonless_golf', 5], ['cobblestone_street_night', 1]],
    peak: [['snowy_hillside', 5], ['drakensberg_solitary_mountain', 2]]
  };
  // 光照氛围：sun=太阳色，sk=天空/太阳亮度倍率，hem=半球光倍率，fog=雾色乘子，fk=雾浓度倍率，tint=天空着色
  const GRADES = {
    golden: { n: '金色黄昏', sun: '#ffcf8a', sk: 1.12, hem: 1.0, fog: [1.12, 0.95, 0.78], fk: 1.0, tint: [1.08, 0.96, 0.82] },
    noon: { n: '晴午', sun: '#fff6e8', sk: 1.25, hem: 1.0, fog: [0.95, 1, 1.06], fk: 0.7, tint: [1, 1, 1.02] },
    overcast: { n: '阴天', sun: '#e4eaf2', sk: 0.55, hem: 1.3, fog: [0.95, 1, 1.05], fk: 1.5, tint: [0.9, 0.95, 1.0] },
    mist: { n: '晨雾', sun: '#ffe2d2', sk: 0.78, hem: 1.05, fog: [1.15, 1.05, 1.1], fk: 2.2, tint: [1.05, 1, 1.06] },
    blood: { n: '血色残阳', sun: '#ff6e44', sk: 1.0, hem: 0.9, fog: [1.35, 0.72, 0.62], fk: 1.25, tint: [1.35, 0.78, 0.68] },
    cold: { n: '冷蓝黎明', sun: '#cfe4ff', sk: 0.9, hem: 1.2, fog: [0.82, 0.98, 1.25], fk: 1.3, tint: [0.85, 0.98, 1.2] },
    toxic: { n: '瘴气', sun: '#d4ffb0', sk: 0.8, hem: 1.2, fog: [0.8, 1.2, 0.72], fk: 2.3, tint: [0.85, 1.1, 0.78] },
    dusk: { n: '紫暮', sun: '#e8b0ff', sk: 0.9, hem: 1.1, fog: [1.05, 0.8, 1.25], fk: 1.3, tint: [1.05, 0.85, 1.25] },
    moon: { n: '月夜', sun: '#9fb4ff', sk: 1.0, hem: 1.0, fog: [0.9, 1, 1.25], fk: 1.0, tint: [0.9, 1.0, 1.25] },
    ember: { n: '余烬之夜', sun: '#ff9a70', sk: 0.9, hem: 0.9, fog: [1.3, 0.8, 0.7], fk: 1.1, tint: [1.25, 0.8, 0.75] },
    green: { n: '惨绿夜', sun: '#a8ffc0', sk: 0.9, hem: 1.0, fog: [0.75, 1.2, 0.85], fk: 1.4, tint: [0.8, 1.15, 0.9] },
    void: { n: '幽蓝夜', sun: '#8fa0ff', sk: 1.0, hem: 1.1, fog: [0.85, 0.95, 1.3], fk: 1.2, tint: [0.8, 0.95, 1.3] }
  };
  const GW = { // 风格 → 白天氛围权重
    meadow: { golden: 3, noon: 3, overcast: 1.4, mist: 2, cold: 1, dusk: 1, blood: 0.4 }, forest: { golden: 2, noon: 1, overcast: 2, mist: 3, cold: 1.2, toxic: 0.6, dusk: 0.8, blood: 0.4 },
    wilds: { golden: 3, noon: 2.5, overcast: 1.2, blood: 1.5, dusk: 1.2, cold: 0.8 }, ruins: { golden: 2, overcast: 2, mist: 2, blood: 1, dusk: 1.4, cold: 1.2, toxic: 0.5 },
    swamp: { overcast: 2, mist: 2.5, toxic: 3, cold: 1, dusk: 1, blood: 0.5 }, fortress: { overcast: 2, golden: 2, noon: 1.5, blood: 1.5, cold: 1.2, mist: 1 },
    capital: { golden: 2, overcast: 1.5, dusk: 2, blood: 1, mist: 1 }, abyss: { blood: 3, dusk: 2, toxic: 1, overcast: 1 }, peak: { cold: 3, noon: 2.5, overcast: 1.5, golden: 1.5, mist: 1.5, dusk: 1 }
  };
  const GWN = { meadow: { moon: 3, void: 1, green: .4 }, forest: { moon: 2, green: 1.5, void: 1 }, swamp: { green: 3, moon: 1.5, void: 1 }, abyss: { ember: 3, void: 2, green: 1 }, capital: { moon: 3, void: 2, ember: 1 } };
  // 季节：leaf/grass/ground 是颜色乘子（可 >1；叶贴图偏绿，乘以 (2.4,.8,.45) 就成了橙褐）
  const SEASONS = {
    lush: { n: '盛绿', leaf: [1.0, 1.02, 0.95], grass: [1, 1, 0.95], ground: [0.8, 1.06, 0.68], j: 0.12 },
    spring: { n: '早春', leaf: [0.95, 1.3, 0.85], grass: [0.92, 1.32, 0.78], ground: [0.82, 1.14, 0.7], j: 0.14 },
    early: { n: '初秋', leaf: [1.7, 1.05, 0.5], grass: [1.55, 1.1, 0.62], ground: [1.06, 1.0, 0.88], j: 0.2 },
    late: { n: '深秋', leaf: [2.6, 0.72, 0.38], grass: [1.9, 0.98, 0.5], ground: [1.06, 0.92, 0.78], j: 0.25 },
    dead: { n: '枯败', leaf: [1.55, 0.95, 0.72], grass: [1.75, 1.1, 0.7], ground: [1.0, 0.92, 0.82], j: 0.15 },
    frost: { n: '霜冻', leaf: [1.45, 1.55, 1.85], grass: [1.55, 1.7, 1.95], ground: [1.18, 1.22, 1.32], j: 0.1 },
    sick: { n: '病态', leaf: [1.15, 1.25, 0.55], grass: [1.2, 1.25, 0.6], ground: [0.9, 0.98, 0.8], j: 0.2 },
    ash: { n: '灰败', leaf: [0.85, 0.78, 0.78], grass: [0.95, 0.85, 0.8], ground: [0.85, 0.82, 0.8], j: 0.1 }
  };
  const SW = { meadow: { lush: 4, spring: 2.4, early: 2, late: 1.4, dead: 0.5, frost: 0.4 }, forest: { lush: 3, early: 2, late: 2.6, dead: 1, sick: 0.6, frost: 0.5, spring: 1 },
    wilds: { dead: 2, early: 2, lush: 1, late: 1.2, ash: 0.5 }, ruins: { lush: 2, late: 2, dead: 2, frost: 1, early: 1, ash: 0.6 }, swamp: { sick: 2.5, dead: 2, lush: 2, late: 1, spring: .6 },
    fortress: { lush: 1.5, late: 1.6, dead: 1.5, frost: 1, early: 1 }, capital: { lush: 1, late: 1.2, frost: 1, dead: .6, early: 1 }, abyss: { ash: 3, dead: 2, sick: 1 }, peak: { frost: 5, dead: 1, ash: .5 } };
  const WATER = { teal: '#123c44', murk: '#20301c', mud: '#33291a', blood: '#4a0d10', ink: '#080e18', ice: '#2c5566', tea: '#3b2a12' };
  const MARKA = { statue: ['gothic_statue'], horse: ['horse_statue_01'], barrels: ['wooden_barrels_01', 'Barrel_02', 'wooden_military_crate'], deadfall: ['dead_tree_trunk', 'dead_tree_trunk_02'], totem: ['dead_quiver_trunk'], stones: ['namaqualand_boulder_03', 'namaqualand_boulder_04', 'rock_09'] };

  // ---------------- 地形原型 ----------------
  const TYPES = {
    rolling: { n: '丘陵', w: { meadow: 4, forest: 3, wilds: 2, swamp: 1, ruins: 2, fortress: 1.5, capital: .6, abyss: 1, peak: 2 } },
    terrace: { n: '梯田台地', w: { meadow: 2, forest: 1, wilds: 3, swamp: .3, ruins: 2, fortress: 2, capital: 1, abyss: 2, peak: 2 } },
    basin: { n: '盆地', w: { meadow: 2, forest: 2, wilds: 1.5, swamp: 2, ruins: 2, fortress: 1, capital: .6, abyss: 2, peak: 1 } },
    ridge: { n: '山脊', w: { meadow: 1, forest: 2, wilds: 3, swamp: .5, ruins: 1, fortress: 1, capital: .3, abyss: 2, peak: 3 } },
    dunes: { n: '沙丘', w: { meadow: .3, forest: .2, wilds: 3, swamp: .1, ruins: 1, fortress: .5, abyss: 1, peak: 2 } },
    knolls: { n: '土墩群', w: { meadow: 3, forest: 2, wilds: 2, swamp: 2, ruins: 2, fortress: 1, capital: .5, abyss: 1.5, peak: 1.5 } },
    mesa: { n: '高台', w: { meadow: 1, forest: 1, wilds: 3, swamp: .3, ruins: 2, fortress: 2, capital: 1, abyss: 2, peak: 2 } },
    crater: { n: '陨坑', w: { meadow: .6, forest: .6, wilds: 2, swamp: 1, ruins: 1, fortress: .5, abyss: 3, peak: 1 } },
    gully: { n: '干沟', w: { meadow: 1, forest: 1, wilds: 3, swamp: .5, ruins: 1.5, fortress: 1, abyss: 2, peak: 1.5 } },
    flat: { n: '', w: { meadow: 1, forest: .5, wilds: .5, swamp: 1, ruins: 1, fortress: 2, capital: 3, abyss: .3, peak: .3 } }
  };
  function makeTerrain(kind, r, R, nz, doorList) {
    const f = { kind, tag: TYPES[kind].n }, ang0 = r() * 6.283, ca = Math.cos(ang0), sa = Math.sin(ang0);
    const ox = (r() - 0.5) * R * 0.5, oz = (r() - 0.5) * R * 0.5, amp = R < 20 ? 0.75 : 1;
    const wf = 0.035 + r() * 0.04, wa = 6 + r() * 10;
    const warp = (x, z) => [x + (nz(x * wf + 90, z * wf + 40) - 0.5) * wa, z + (nz(x * wf - 30, z * wf + 70) - 0.5) * wa];
    if (kind === 'rolling') { const A = (1.2 + r() * 2.8) * amp, fq = 0.028 + r() * 0.03; f.h = (x, z) => { const [u, v] = warp(x, z); return A * (nz(u * fq + 11, v * fq + 7) - 0.5) * 2.2; }; }
    else if (kind === 'terrace') { const n = 2 + Math.floor(r() * 2), sh = (1.2 + r() * 1.1) * amp, fq = 0.02 + r() * 0.02, sharp = 0.08 + r() * 0.16;
      f.h = (x, z) => { const [u, v] = warp(x, z); const t = clamp((nz(u * fq + 5, v * fq + 9) - 0.25) * 2.0, 0, 0.999) * n, i = Math.floor(t), fr = t - i; return sh * (i + sstep(0.5 - sharp, 0.5 + sharp, fr)) - sh * n * 0.4; }; }
    else if (kind === 'basin') { const A = (1.8 + r() * 2.6) * amp, rr = R * (0.55 + r() * 0.25), el = 0.7 + r() * 0.5; f.h = (x, z) => { const dx = x - ox * 0.5, dz = z - oz * 0.5, u = dx * ca + dz * sa, v = (-dx * sa + dz * ca) * el, d = Math.hypot(u, v) * (1 + (nz(x * 0.05, z * 0.05) - 0.5) * 0.5); return -A * (1 - sstep(rr * 0.2, rr, d)) + A * 0.35 * sstep(rr * 0.7, rr * 1.3, d); }; }
    else if (kind === 'ridge') { const A = (2.6 + r() * 3) * amp, wd = R * (0.09 + r() * 0.09), gapT = (r() - 0.5) * R, gw = R * (0.14 + r() * 0.1), off = (r() - 0.5) * R * 0.35;
      f.h = (x, z) => { const [u, v] = warp(x, z), d = (u - ox) * (-sa) + (v - oz) * ca - off, t = (u - ox) * ca + (v - oz) * sa; const gap = Math.exp(-(((t - gapT) / gw) ** 2)); return A * Math.exp(-((d / wd) ** 2)) * (1 - 0.82 * gap); }; }
    else if (kind === 'dunes') { const A = (0.9 + r() * 1.2) * amp, k = 0.13 + r() * 0.12, k2 = k * (2.1 + r());
      f.h = (x, z) => { const [u, v] = warp(x, z), p = (u * ca + v * sa) * k + (nz(u * 0.02, v * 0.02) - 0.5) * 6, s = 0.5 + 0.5 * Math.sin(p); return A * (Math.pow(s, 1.7) * 1.6 - 0.6) + 0.12 * Math.sin((-u * sa + v * ca) * k2); }; }
    else if (kind === 'knolls') { const n = 4 + Math.floor(r() * 6), K = []; for (let i = 0; i < n; i++) { const a = r() * 6.283, d = R * Math.sqrt(r()) * 0.85; K.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, h: (r() < 0.75 ? 1 : -0.7) * (1.2 + r() * 2.6) * amp, s: R * (0.1 + r() * 0.16) }); }
      f.h = (x, z) => { let h = 0; for (const k of K) { const d2 = (x - k.x) ** 2 + (z - k.z) ** 2; h += k.h * Math.exp(-d2 / (k.s * k.s)); } return h; }; }
    else if (kind === 'mesa') { const H0 = (2.2 + r() * 2.2) * amp, rad = R * (0.32 + r() * 0.16), nr = 1 + Math.floor(r() * 2), rs = []; for (let i = 0; i < nr; i++) rs.push(r() * 6.283);
      f.h = (x, z) => { const dx = x - ox * 0.6, dz = z - oz * 0.6, d = Math.hypot(dx, dz), a = Math.atan2(dz, dx), rho = d / (rad * (1 + (nz(x * 0.06 + 3, z * 0.06 + 8) - 0.5) * 0.55));
        let ramp = 0; for (const q of rs) ramp = Math.max(ramp, Math.exp(-((Math.atan2(Math.sin(a - q), Math.cos(a - q)) / 0.42) ** 2))); const w = 0.22 + 0.73 * ramp; /* R46：悬崖边缘放缓一点（原 0.1 → 近垂直） */ return H0 * (1 - sstep(1 - w, 1 + w, rho)) - H0 * 0.15; }; f.mesa = { x: ox * 0.6, z: oz * 0.6, r: rad, h: H0 }; }
    else if (kind === 'crater') { const A = (2 + r() * 2.4) * amp, rr = R * (0.3 + r() * 0.16), ga = r() * 6.283; f.h = (x, z) => { const d = Math.hypot(x - ox * 0.5, z - oz * 0.5) * (1 + (nz(x * 0.07, z * 0.07) - 0.5) * 0.4) / rr, an = Math.atan2(z - oz * 0.5, x - ox * 0.5), dA = Math.abs(Math.atan2(Math.sin(an - ga), Math.cos(an - ga))); return A * (Math.exp(-(((d - 1) / 0.28) ** 2)) * 0.9 * (1 - 0.85 * Math.exp(-((dA / 0.5) ** 2))) - 0.75 * (1 - sstep(0.15, 0.95, d))); }; } // R46：环形山一侧有豁口，坑底走得进去
    else if (kind === 'gully') { const A = 1.4 + r() * 1.4, W = 2.4 + r() * 2.2, pts = channel(r, R, doorList, 10), D = pts && pts.dist; f.h = (x, z) => { if (!D) return 0; const d = D(x, z).d; return -A * (1 - sstep(W * 0.4, W * 2.6, d)) + 0.12; }; f.gully = pts; if (!pts) f.h = () => 0; }
    else f.h = () => 0;
    return f;
  }
  // 蜿蜒的通道（溪流/干沟）：多段折线，避开门。返回 {pts, dist(x,z)->{d,t,y}}
  function channel(r, R, doorList, N) {
    let best = null;
    for (let tries = 0; tries < 14; tries++) {
      const a0 = r() * 6.283, a1 = a0 + Math.PI + (r() - 0.5) * 1.3, RR = R * 1.25, P0 = [Math.cos(a0) * RR, Math.sin(a0) * RR], P1 = [Math.cos(a1) * RR, Math.sin(a1) * RR];
      const px = -(P1[1] - P0[1]), pz = P1[0] - P0[0], pl = Math.hypot(px, pz) || 1, A1 = (r() - 0.5) * R * 0.7, A2 = (r() - 0.5) * R * 0.3, ph = r() * 6.283, pts = [];
      for (let i = 0; i <= N; i++) { const t = i / N, o = Math.sin(Math.PI * t) * A1 + Math.sin(Math.PI * 3 * t + ph) * A2 * Math.sin(Math.PI * t); pts.push([lerp(P0[0], P1[0], t) + px / pl * o, lerp(P0[1], P1[1], t) + pz / pl * o]); }
      let cl = 1e9; for (const d of doorList) for (let i = 0; i < N; i++) cl = Math.min(cl, segDist(d.x, d.z, pts[i], pts[i + 1]).d);
      if (!best || cl > best.cl) best = { pts, cl }; if (cl > 9) break;
    }
    if (!best || best.cl < 6.5) return null;
    const pts = best.pts, n = pts.length - 1;
    const dist = (x, z) => { let bd = 1e9, bt = 0; for (let i = 0; i < n; i++) { const s = segDist(x, z, pts[i], pts[i + 1]); if (s.d < bd) { bd = s.d; bt = (i + s.t) / n; } } return { d: bd, t: bt }; };
    return { pts, dist, n };
  }
  function segDist(x, z, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1, t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / l2, 0, 1); return { d: Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t), t }; }

  // ---------------- 基因组：样式 ----------------
  function style(node, base) {
    if (!on() || node.home) return base;
    if (node._wst) return node._wst;
    const r = mulberry((node.seed ^ 0x9e3779b9) >>> 0), st = Object.assign({}, base), g = st.g = { node, r, seed: node.seed };
    const R = node.R, sn = node.style;
    // 天空 / 氛围
    const fix41 = !(window.Mods && Mods.on && Mods.on('wfix41') === false); // R41：cobblestone_street_night 是现代街景照片（路牌、窗户），不再当天空；换成城堡护城河/无月夜
    st.sky = wpick(r, (SKYALT[sn] || [[base.sky, 1]]).map(([k, w]) => fix41 && k === 'cobblestone_street_night' ? [sn === 'capital' || sn === 'fortress' ? 'teutonic_castle_moat' : 'moonless_golf', w] : [k, w])); const sm = SKYM[st.sky] || { k: 2 }; st.night = sm.night ? 1 : 0;
    const gw = st.night ? Object.entries(Object.assign({ moon: 1, void: 1 }, GWN[sn] || {})) : Object.entries(GW[sn] || { golden: 1, noon: 1, overcast: 1 });
    g.gk = wpick(r, gw); g.grade = GRADES[g.gk]; g.yaw = r() * 6.2832;
    st.sun = sm.k * (st.night ? 1 : 1) * (0.9 + r() * 0.25); g.sunCol = new C(g.grade.sun); g.sunK = g.grade.sk; g.hemK = g.grade.hem; g.fk = g.grade.fk * (0.8 + r() * 0.4); g.fogMul = new C(g.grade.fog[0], g.grade.fog[1], g.grade.fog[2]); g.skyTint = new C(g.grade.tint[0], g.grade.tint[1], g.grade.tint[2]);
    st.sun *= 1; g.skyK = st.night ? 0.9 : 1.1;
    // 季节
    g.sk = wpick(r, Object.entries(SW[sn] || { lush: 1 })); const S = SEASONS[g.sk]; g.season = S;
    g.leafMul = new C(S.leaf[0], S.leaf[1], S.leaf[2]); g.grassMul = new C(S.grass[0], S.grass[1], S.grass[2]); g.groundMul = new C(S.ground[0], S.ground[1], S.ground[2]);
    // 植被子集 / 密度 / 聚簇
    const treeK = Math.exp(gauss(r) * 0.55) * (sn === 'forest' ? 1.8 : sn === 'swamp' ? 0.9 : 1); g.treeK = clamp(treeK, 0.35, 3.2);
    const props = [];
    for (const p of base.props) {
      const kind = p[4]; if (kind === 'fire') { props.push(p); continue; }
      const drop = kind === 'rock' || kind === 'plant' ? 0.22 : kind === 'prop' || kind === 'lamp' ? 0.25 : kind === 'wall' ? 0.15 : kind === 'grass' ? 0 : 0.06;
      if (r() < drop && props.length + 1 < base.props.length) continue;
      let list = p[0]; if (list.length > 2 && !list.some(x => x.endsWith('#*')) && r() < 0.5) { const k = Math.max(1, Math.ceil(list.length * (0.4 + r() * 0.4))), sh = list.slice().sort(() => r() - 0.5); list = sh.slice(0, k); }
      let m = Math.exp(gauss(r) * (kind === 'grass' ? 0.4 : 0.55)); m = clamp(m, kind === 'grass' ? 0.5 : 0.3, kind === 'grass' ? 1.7 : 2.4); if (kind === 'tree') m *= g.treeK; if (kind === 'grass') m *= 1.5;
      props.push([list, p[1] * m, p[2] * (0.92 + r() * 0.2), p[3] * (0.92 + r() * 0.22), kind]);
    }
    if ((sn === 'meadow' || sn === 'forest' || sn === 'ruins' || sn === 'swamp') && !['frost', 'ash', 'dead'].includes(g.sk) && r() < (sn === 'meadow' ? 0.85 : 0.55)) props.push([['flower_gazania#*', 'flower_empodium#*', 'dandelion_01'].filter(() => r() < 0.75).concat(['dandelion_01']).slice(0, 3), 0.9 + r() * 1.8, 1.0, 1.8, 'grass', 'flower']);
    st.props = props; g.patchLo = 0.36 + r() * 0.16;
    if (base.edge) { const e = base.edge, L = e[0].length > 2 ? e[0].slice().sort(() => r() - 0.5).slice(0, Math.max(2, Math.ceil(e[0].length * 0.7))) : e[0]; st.edge = [L, e[1] * (0.75 + r() * 0.6), e[2], e[3]]; }
    st.marks = [pick(r, base.marks.filter(m => m !== 'chest'))];
    st.hill = base.hill * (0.6 + r() * 0.9); st.fog = base.fog; st.gs = base.gs * (0.85 + r() * 0.35);
    // 地形
    const tw = Object.entries(TYPES).map(([k, v]) => [k, v.w[sn] || 1]); g.tk = wpick(r, tw);
    g.terrainSeed = (node.seed ^ 0x51a3) >>> 0;
    // 水
    g.waterKind = r() < (sn === 'swamp' ? 0.7 : sn === 'peak' || sn === 'capital' ? 0.25 : sn === 'wilds' ? 0.3 : 0.5) ? (r() < 0.55 ? 'river' : 'ponds') : ''; if (g.waterKind === 'river' && R < 15) g.waterKind = 'ponds';
    g.waterCol = sn === 'abyss' ? (r() < 0.65 ? 'blood' : 'ink') : sn === 'swamp' ? pick(r, ['murk', 'murk', 'mud', 'tea']) : sn === 'peak' ? 'ice' : sn === 'ruins' ? pick(r, ['teal', 'ink', 'blood', 'murk']) : sn === 'wilds' ? pick(r, ['tea', 'teal', 'mud']) : pick(r, ['teal', 'teal', 'tea', 'ink']);
    if (g.gk === 'blood' && r() < 0.3) g.waterCol = 'blood';
    // 布景
    g.pieces = pickPieces(r, node, sn, g); g.shafts = !st.night && ['golden', 'mist', 'noon', 'dusk'].includes(g.gk) && (sn === 'forest' || sn === 'ruins' || sn === 'swamp' || sn === 'meadow') && r() < 0.65;
    g.mist = ['mist', 'toxic', 'cold', 'overcast'].includes(g.gk) ? (r() < 0.8 ? 1 : 0.5) : r() < 0.18 ? 0.4 : 0; g.macro = 0.6 + r() * 0.8; g.patchF = 0.05 + r() * 0.08;
    g.tag = [g.grade.n, g.season.n === '盛绿' ? '' : g.season.n, TYPES[g.tk].n, g.waterKind === 'river' ? '溪流' : g.waterKind === 'ponds' ? '池塘' : '', ...g.pieces.map(p => p.n)].filter(Boolean);
    node._wst = st; return st;
  }

  // ---------------- 资产清单 ----------------
  function assets(st, node, extra) {
    const g = st.g, names = new Set(['sky_' + st.sky, 'tex_' + st.ground]);
    for (const p of st.props) { if (p[4] === 'fire') continue; p[0].forEach(n => names.add(n.replace('#*', ''))); if (p[4] === 'tree') p[0].forEach(n => { if (n === 'island_tree_01' || n === 'island_tree_02' || n === 'tree_small_02') names.add(n + '_lo'); }); }
    if (st.edge) st.edge[0].forEach(n => { names.add(n.replace('#*', '')); if (n === 'island_tree_01' || n === 'island_tree_02' || n === 'tree_small_02') names.add(n + '_lo'); });
    st.marks.forEach(m => (MARKA[m] || []).forEach(n => names.add(n)));
    if (g) { g.pieces.forEach(p => (p.need || []).forEach(n => names.add(n))); if (g.waterKind) { names.add('grass_medium_02'); if (g.waterKind === 'river') names.add('modular_wooden_pier'); } }
    (extra || []).forEach(n => names.add(n)); if (window.WTerrain) WTerrain.assets(st, node).forEach(n => names.add(n));
    return [...names];
  }
  // ---------------- 布景库 ----------------
  const PIECES = {
    fallen: { n: '倒卧巨木', st: 'forest swamp meadow wilds ruins peak', need: ['dead_tree_trunk', 'root_cluster_01'], rad: 6 },
    watch: { n: '残破哨塔', st: 'ruins fortress wilds capital abyss meadow', need: ['modular_fort_01', 'rock_07'], rad: 6 },
    graves: { n: '荒墓', st: 'forest ruins swamp meadow capital abyss', need: ['rock_09', 'rock_07', 'dead_tree_trunk_02', 'dead_quiver_trunk'], rad: 6 },
    cache: { n: '遗弃补给', st: 'meadow forest wilds swamp fortress capital peak ruins', need: ['wooden_crate_02', 'wooden_barrels_01', 'wicker_basket_01', 'wooden_bucket_01'], rad: 4 },
    gate: { n: '无门之门', st: 'ruins forest wilds peak abyss meadow swamp', need: [], rad: 3.5 },
    idol: { n: '神像广场', st: 'capital ruins fortress abyss meadow', need: ['gothic_statue', 'horse_statue_01'], rad: 7 },
    boulders: { n: '巨岩群', st: 'wilds peak forest meadow abyss swamp', need: ['namaqualand_boulder_03', 'namaqualand_boulder_04', 'rock_moss_set_01'], rad: 6 },
    fairy: { n: '花环', st: 'meadow forest swamp ruins', need: ['flower_gazania', 'flower_empodium', 'tree_stump_02'], rad: 4.5 },
    lanterns: { n: '灯径', st: 'capital fortress ruins meadow forest', need: ['street_lamp_01'], rad: 3 },
    parlor: { n: '遗落的野餐', st: 'wilds forest meadow swamp ruins capital', need: ['wooden_picnic_table', 'painted_wooden_bench', 'wooden_stool_01', 'wicker_basket_01', 'wooden_barrels_01'], rad: 4 },
    pyre: { n: '焚烧堆', st: 'abyss wilds fortress ruins swamp', need: ['dead_tree_trunk', 'dry_branches_medium_01'], rad: 4 },
    ring: { n: '立石环', st: 'meadow forest wilds ruins peak swamp abyss', need: ['namaqualand_boulder_04', 'rock_face_02', 'rock_face_01'], rad: 6 }
  };
  function pickPieces(r, node, sn, g) {
    if (window.__wgenForce && window.__wgenForce[node.i]) return [Object.assign({ k: window.__wgenForce[node.i] }, PIECES[window.__wgenForce[node.i]])];
    const ok = Object.keys(PIECES).filter(k => PIECES[k].st.split(' ').includes(sn) && !(PIECES[k].rare && r() > 0.22)), cnt = node.size === 's' ? (r() < 0.65 ? 1 : 0) : node.size === 'm' ? 1 + (r() < 0.45 ? 1 : 0) : 2 + (r() < 0.5 ? 1 : 0), out = [];
    for (let i = 0; i < cnt && ok.length; i++) { const k = ok.splice(Math.floor(r() * ok.length), 1)[0]; out.push(Object.assign({ k }, PIECES[k])); }
    return out;
  }

  // ---------------- 建场景时的钩子 ----------------
  // 准备：在算高度之前调用；返回 g（同 st.g），挂上 h(x,z,h0,fl) / paint / ic / dress / fx
  function prepare(st, node, X) {
    const g = st.g; if (!g || g.ready) return g; g.ready = 1;
    const { R, Rmin, nz, doorList, LY, H0 } = X, r = mulberry((node.seed ^ 0x7f4a7c15) >>> 0); g.r2 = r;
    g.nz = vnoise(g.terrainSeed);
    const big = LY && (LY.k === 'lake' || LY.k === 'henge' || LY.k === 'ravine'); // 这些布局自带大地形
    const T = makeTerrain(g.tk, r, Rmin, g.nz, doorList); g.T = T; const tk = big ? 0.3 : 1; g.tk2 = tk;
    // 水：先决定几何（依赖 H0 取水位）
    g.water = null;
    if (g.waterKind === 'river') { const ch = channel(r, Rmin, doorList, 14); if (ch) { const N = ch.pts.length, ys = ch.pts.map(p => H0(p[0], p[1]) + T.h(p[0], p[1]) * tk); const sm = ys.map((y, i) => { let s = 0, c = 0; for (let j = -3; j <= 3; j++) { const k = clamp(i + j, 0, N - 1); s += ys[k]; c++; } return s / c; });
      // 保证单调下坡（水往一个方向流），最大坡度 0.08
      const flip = sm[0] < sm[N - 1]; const arr = flip ? sm.slice().reverse() : sm.slice(); for (let i = 1; i < N; i++) arr[i] = Math.min(arr[i], arr[i - 1] - 0.02); const lv = flip ? arr.reverse() : arr;
      g.water = { kind: 'river', ch, lv: lv.map(y => y - 0.3), w: 1.5 + r() * 1.7 }; } else g.waterKind = 'ponds'; }
    if (g.waterKind === 'ponds' && !g.water) { const n = R < 18 ? 1 : 1 + Math.floor(r() * 3), P = [];
      for (let t = 0; t < 60 && P.length < n; t++) { const a = r() * 6.283, d = Rmin * (0.15 + r() * 0.55), x = Math.cos(a) * d, z = Math.sin(a) * d, pr = clamp(Rmin * (0.12 + r() * 0.12), 2.6, 8.5); if (!(() => { let lo = 1e9, hi = -1e9; for (let i = 0; i < 9; i++) { const aa = i * 0.785, rr2 = i ? pr * (i % 2 ? 1.3 : 2.4) : 0, y = H0(x + Math.cos(aa) * rr2, z + Math.sin(aa) * rr2) + T.h(x + Math.cos(aa) * rr2, z + Math.sin(aa) * rr2) * tk; lo = Math.min(lo, y); hi = Math.max(hi, y); } return hi - lo < 1.0 + pr * 0.12; })()) continue; /* R46：池塘只挖在平坦处 */ if (doorList.some(dd => Math.hypot(dd.x - x, dd.z - z) < pr + 8) || P.some(q => Math.hypot(q.x - x, q.z - z) < q.r + pr + 3) || Math.hypot(x, z) + pr > Rmin - 2) continue; if (LY && LY.k === 'lake' && Math.hypot(x - LY.cx, z - LY.cz) < LY.Lr + pr + 3) continue; P.push({ x, z, r: pr, sx: 0.75 + r() * 0.6, th: r() * 3.14, ph: r() * 6.28 }); }
      if (P.length) { let s = 0; for (const p of P) { let a = 0; for (let i = 0; i < 8; i++) a += H0(p.x + Math.cos(i) * p.r * 1.2, p.z + Math.sin(i) * p.r * 1.2) + T.h(p.x, p.z) * tk; p.lv = a / 8 - 0.35; s++; } g.water = { kind: 'ponds', P }; } else g.waterKind = ''; }
    const W = g.water;
    // 河/池的距离场（岸边着色 + 体块）
    const wd = W ? (W.kind === 'river' ? (x, z) => { const q = W.ch.dist(x, z); return { d: q.d - W.w, t: q.t }; } : (x, z) => { let bd = 1e9, bp = null; for (const p of W.P) { const c = Math.cos(p.th), s = Math.sin(p.th), u = ((x - p.x) * c + (z - p.z) * s) / p.sx, v = -(x - p.x) * s + (z - p.z) * c, an = Math.atan2(v, u), rr = p.r * (1 + 0.16 * Math.sin(an * 3 + p.ph) + 0.09 * Math.sin(an * 5 - p.ph)), d = Math.hypot(u, v) - rr; if (d < bd) { bd = d; bp = p; } } return { d: bd, p: bp }; }) : null;
    g.wd = wd; T.tk = tk;
    // 最终高度
    g.h = (x, z, h0, fl) => {
      let h = h0 + T.h(x, z) * fl * tk;
      if (!W) return h;
      const q = wd(x, z);
      if (W.kind === 'river') { const bw = 4.5 + W.w * 0.8; if (q.d > bw) return h; const t = q.t * W.ch.n, i = Math.min(W.ch.n - 1, Math.floor(t)), f = t - i, LV = W.lv, L = LV[Math.min(i, LV.length - 1)] * (1 - f) + LV[Math.min(i + 1, LV.length - 1)] * f;
        if (q.d < 0) return L - 0.25 - 0.55 * Math.min(1, -q.d / W.w * 1.4);
        return lerp(L - 0.25, lerp(Math.max(h, L + 0.02), h, sstep(bw * 0.55, bw, q.d)), sstep(0, bw, q.d)); } // R46：岸顶平滑回到原地形（以前在 bw 处有断崖）
      else { if (q.d > 7) return h; const p = q.p, bw = Math.max(2.6, p.r * 0.55);
        if (q.d < 0) return p.lv - 0.3 - 0.9 * Math.min(1, -q.d / (p.r * 0.7)); const k = sstep(0, bw, q.d); return lerp(p.lv - 0.3, lerp(Math.max(h, p.lv + 0.02), h, sstep(bw, 7, q.d)), k); } // R46：池岸不再抬成平台断崖
    };
    return g;
  }

  // 地表顶点着色：苔/干土/岩/湿岸/小径/高低明暗
  function paint(geo, X) {
    const g = X.st.g; if (!g) return false; const pos = geo.attributes.position, nor = geo.attributes.normal, n = pos.count, col = new Float32Array(n * 3), nz = g.nz, LP = X.LP, R = X.R;
    const gm = g.groundMul, tintA = new C(1.0, 1.0, 1.0), tintB = new C(0.86 + g.macro * 0.1, 0.94, 0.78);
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), ny = nor.getY(i), rr = Math.hypot(x, z);
      const m = nz(x * 0.045 + 3, z * 0.045 - 7), p2 = nz(x * g.patchF * 3 + 40, z * g.patchF * 3 + 9);
      let r_ = lerp(tintA.r, tintB.r, m) * (0.86 + 0.28 * p2), g_ = lerp(tintA.g, tintB.g, m) * (0.86 + 0.28 * p2), b_ = lerp(tintA.b, tintB.b, m) * (0.86 + 0.28 * p2);
      // 干斑/暗斑
      const dry = sstep(0.62, 0.78, nz(x * 0.09 + 200, z * 0.09 + 30)); r_ *= 1 + dry * 0.22; g_ *= 1 + dry * 0.05; b_ *= 1 - dry * 0.18;
      const sl = 1 - ny; if (sl > 0.22) { const k = sstep(0.22, 0.62, sl); r_ = lerp(r_, 0.6, k * 0.5); g_ = lerp(g_, 0.58, k * 0.5); b_ = lerp(b_, 0.55, k * 0.5); }
      if (g.wd) { const q = g.wd(x, z); if (q.d < 3.2) { const k = 1 - sstep(0, 3.2, q.d); r_ *= 1 - 0.42 * k; g_ *= 1 - 0.34 * k; b_ *= 1 - 0.3 * k; } }
      if (LP && LP.pathD) { const d = LP.pathD(x, z); if (d < 1.6) { const k = 1 - sstep(0.4, 1.6, d); r_ = lerp(r_, r_ * 1.25 + 0.05, k); g_ = lerp(g_, g_ * 1.05, k * 0.8); b_ = lerp(b_, b_ * 0.82, k); } }
      const hh = clamp(y * 0.05, -0.2, 0.2); const fade = 1 - 0.3 * (LP && LP.dOut ? sstep(2, 30, LP.dOut(x, z)) : sstep(R + 2, R + 30, rr));
      col[i * 3] = r_ * gm.r * (1 + hh) * fade; col[i * 3 + 1] = g_ * gm.g * (1 + hh) * fade; col[i * 3 + 2] = b_ * gm.b * (1 + hh) * fade;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); return true;
  }
  // 草/灌木/花成片生长（噪声阈值）：片内密、片外稀，比均匀撒点自然得多
  function keep(g, kind, x, z, r, fkind) {
    if (kind !== 'grass' && kind !== 'plant') return true;
    const f = g.patchF * (fkind === 'flower' ? 3.2 : 2.2), m = g.nz(x * f + (fkind === 'flower' ? 310 : 70), z * f + 15), t = sstep(g.patchLo, g.patchLo + 0.2, m);
    return r() < (fkind === 'flower' ? 0.03 + 0.97 * t * t : 0.14 + 0.86 * t);
  }
  // 实例着色：返回 {L: 叶色, B: 其他}
  const _L = new C(), _B = new C();
  function ic(g, kind, x, z, r) {
    if (kind === 'flower') { const j = 0.92 + r() * 0.16; return { L: new C(j, j, j), B: new C(j, j, j) }; }
    if (kind === 'wall' || kind === 'prop' || kind === 'lamp') { const j = 0.9 + r() * 0.2; return { L: new C(j, j, j), B: new C(j, j, j) }; }
    const j = g.season.j, patch = g.nz(x * 0.07 + 11, z * 0.07 - 3), jl = 1 + (r() - 0.5) * j * 1.4, hue = (r() - 0.5) * j;
    if (kind === 'rock') { const w = g.wd ? sstep(4, 0, g.wd(x, z).d) : 0, mm = 0.85 + r() * 0.3; return { L: new C(mm, mm, mm), B: new C(mm * (1 - 0.15 * w) * lerp(1, g.groundMul.r, 0.5), mm * lerp(1, g.groundMul.g, 0.5), mm * (1 - 0.1 * w) * lerp(1, g.groundMul.b, 0.5)) }; }
    const base = kind === 'grass' ? g.grassMul : g.leafMul, k2 = 0.85 + patch * 0.3;
    const L = new C(base.r * jl * k2 * (1 + hue), base.g * jl * k2, base.b * jl * k2 * (1 - hue)); const b = 0.88 + r() * 0.24;
    return { L, B: new C(b, b * 0.98, b * 0.95) };
  }
  // ---------------- 水 / 布景 / 光束 / 地雾 ----------------
  function fitR(name, o) { // 与 wlayout 同：先旋转再量尺寸
    const A = window.Assets; const m = A && A.has(name) ? A.clone(name) : null; if (!m) return null;
    m.rotation.set(o.rx || 0, 0, o.rz || 0, 'XYZ');
    const inner = new THREE.Group(); inner.add(m); const out = new THREE.Group(); out.add(inner);
    out.updateMatrixWorld(true); let bb = new THREE.Box3().setFromObject(inner); const sz = bb.getSize(new V3());
    const s = o.h ? o.h / sz.y : o.w ? o.w / Math.max(sz.x, sz.z) : o.L ? o.L / Math.max(sz.x, sz.y, sz.z) : 1; inner.scale.setScalar(s); out.updateMatrixWorld(true);
    bb = new THREE.Box3().setFromObject(inner); const c = bb.getCenter(new V3());
    inner.position.set(-c.x, -bb.min.y, -c.z); out.userData.size = sz.multiplyScalar(s);
    out.traverse(k => { if (k.isMesh) { k.castShadow = true; k.receiveShadow = true; } });
    return out;
  }
  let _tex = null;
  // R41：光束材质——按视角淡出（侧对镜头时不再变成一根根发亮的细线）+ 近处淡出 + 上下两端柔化
  function beamMat(col, op) {
    if (window.Mods && Mods.on && Mods.on('wfix41') === false) return new THREE.MeshBasicMaterial({ map: softTex('beam'), color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const m = new THREE.ShaderMaterial({ uniforms: { map: { value: softTex('beam') }, col: { value: col.clone ? col.clone() : new C(col) }, op: { value: op } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
      vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vP; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vP = mv.xyz; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform sampler2D map; uniform vec3 col; uniform float op; varying vec2 vUv; varying vec3 vN; varying vec3 vP; void main(){ float f = abs(dot(normalize(vN), normalize(-vP))); float a = texture2D(map, vUv).a * op * f * f * smoothstep(3.0, 10.0, length(vP)) * smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.6, 1.0, vUv.y)); gl_FragColor = vec4(col * a, 1.0); }' });
    m.opacity = op; return m;
  }
  function softTex(kind) { // 只是渐变贴图（光束/雾团），不是模型或材质贴图
    const key = '_t' + kind; if (softTex[key]) return softTex[key];
    const c = document.createElement('canvas'), N = 64; c.width = c.height = N; const x = c.getContext('2d');
    if (kind === 'beam') { const gx = x.createLinearGradient(0, 0, N, 0); gx.addColorStop(0, 'rgba(255,255,255,0)'); gx.addColorStop(0.5, 'rgba(255,255,255,1)'); gx.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gx; x.fillRect(0, 0, N, N); x.globalCompositeOperation = 'destination-in'; const gy = x.createLinearGradient(0, 0, 0, N); gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(0.25, 'rgba(0,0,0,0.8)'); gy.addColorStop(0.7, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gy; x.fillRect(0, 0, N, N); }
    else { const gr = x.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, N, N); }
    const t = new THREE.CanvasTexture(c); return softTex[key] = t;
  }
  function waterMat(g, sky, colHex) {
    const fx = !(window.Mods && Mods.on && Mods.on('water_fx') === false); // R50 MOD water_fx：岸线渐隐 + 浅滩泛光 + 泡沫 + 远处涟漪，水不再是一块硬边的平板
    const m = new THREE.MeshStandardMaterial({ color: colHex, roughness: fx ? 0.06 : 0.04, metalness: 0.1, transparent: true, opacity: fx ? 0.96 : 0.93, side: THREE.DoubleSide, envMap: sky && sky.env || null, envMapIntensity: fx ? 0.36 : 0.65 });
    const dt0 = new THREE.DataTexture(new Uint8Array([255]), 1, 1, THREE.RedFormat); dt0.needsUpdate = true;
    const U = { t: { value: 0 }, dt: { value: dt0 }, bb: { value: new THREE.Vector4(0, 0, 1, 1) }, on: { value: 0 } }; m.userData.U = U; m.userData.fx = fx;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.wt = U.t; sh.uniforms.wdt = U.dt; sh.uniforms.wbb = U.bb; sh.uniforms.won = U.on;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(position,1.0)).xyz;');
      let f = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; uniform float wt; uniform sampler2D wdt; uniform vec4 wbb; uniform float won;');
      if (fx) f = f.replace('#include <color_fragment>', `#include <color_fragment>
        float wDep = 3.0; float wFoam = 0.0;
        if (won > 0.5) { wDep = texture2D(wdt, (vWP.xz - wbb.xy) * wbb.zw).r * 2.5;
          float wob = 0.05 * sin(vWP.x * 7.0 + wt * 1.7) * sin(vWP.z * 6.0 - wt * 1.3);
          wFoam = (1.0 - smoothstep(0.0, 0.22, wDep + wob)) * smoothstep(0.0, 0.05, wDep + 0.02);
          diffuseColor.rgb = mix(diffuseColor.rgb * 2.6 + vec3(0.02, 0.05, 0.03), diffuseColor.rgb * 0.75, smoothstep(0.03, 1.5, wDep));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.78, 0.82, 0.8), wFoam * 0.55);
          diffuseColor.a = max(diffuseColor.a * smoothstep(0.0, 0.3, wDep), wFoam * 0.75); }`);
      f = f.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n{ vec2 p = vWP.xz; float a = sin(p.x*1.9+wt*1.3)+sin(p.y*2.3-wt*1.1)+sin((p.x+p.y)*3.1+wt*1.9)*0.6; float b = cos(p.x*2.2-wt*1.2)+cos(p.y*1.7+wt*0.9)+cos((p.x-p.y)*2.7-wt*1.6)*0.6; normal = normalize(normal + vec3(a, 0.0, b) * 0.028);'
        + (fx ? ' float a2 = sin(p.x*7.3+wt*2.1)*sin(p.y*6.1-wt*1.7)+sin((p.x*0.8+p.y)*11.0-wt*2.6)*0.5, b2 = cos(p.x*6.1-wt*1.9)*sin(p.y*7.7+wt*1.5)+cos((p.x-p.y*0.7)*12.0+wt*2.3)*0.5; normal = normalize(normal + vec3(a2, 0.0, b2) * 0.022);' : '') + ' }');
      sh.fragmentShader = f;
    };
    return m;
  }
  // R50：岸线深度图（不是美术贴图，只是距岸距离的数据）：每格 = 到水边的距离（0~2.5m）
  function bakeWaterDepth(g, mat, boxes, fn) {
    if (!mat.userData.fx || !(fn || (g && g.wd))) return; fn = fn || ((x, z) => g.wd(x, z));
    let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const b of boxes) { x0 = Math.min(x0, b[0]); z0 = Math.min(z0, b[1]); x1 = Math.max(x1, b[2]); z1 = Math.max(z1, b[3]); }
    if (!(x1 > x0 && z1 > z0)) return; const cs = Math.max(0.3, Math.max(x1 - x0, z1 - z0) / 160), nx = Math.max(2, Math.ceil((x1 - x0) / cs)), nz = Math.max(2, Math.ceil((z1 - z0) / cs)), data = new Uint8Array(nx * nz);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const d = fn(x0 + (i + 0.5) * cs, z0 + (j + 0.5) * cs).d; data[j * nx + i] = Math.max(0, Math.min(255, Math.round(-d / 2.5 * 255))); }
    const t = new THREE.DataTexture(data, nx, nz, THREE.RedFormat); t.minFilter = t.magFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
    const U = mat.userData.U; U.dt.value = t; U.bb.value.set(x0, z0, 1 / (nx * cs), 1 / (nz * cs)); U.on.value = 1;
  }
  // 落地布景（每个 fn 返回 boss/敌人点位）
  function buildPieces(g, X) {
    const { sc, H, R, cols, free, mark, put, variants, spots, doorList, LP } = X, r = g.r3;
    const place = (o, x, z, ry, dy) => { if (!o) return null; o.position.set(x, H(x, z) + (dy || 0), z); o.rotation.y = ry || 0; sc.add(o); return o; };
    const loc = (ox, oz, x, z, ry) => [x + ox * Math.cos(ry) + oz * Math.sin(ry), z - ox * Math.sin(ry) + oz * Math.cos(ry)];
    const flame = (x, y, z, s) => { const f = window.Assets && Assets.flame && Assets.flame(x, y, z, s); if (f) sc.add(f); return f; };
    const light = (x, y, z, col, I, D) => { if (X.lights.n >= 2) return; X.lights.n++; const pl = new THREE.PointLight(col, I, D, 2); pl.position.set(x, y, z); sc.add(pl); return pl; };
    const one = (names) => { const vs = variants(names); return vs.length ? vs[Math.floor(r() * vs.length)] : null; };
    const wdOK = (x, z, rad) => !g.wd || g.wd(x, z).d > rad + 1.2;
    const spotFor = (rad0) => { const why = { free: 0, wd: 0, edge: 0, path: 0, door: 0 }; g.why = why; for (let t = 0; t < 160; t++) { const rad = t < 60 ? rad0 : t < 110 ? rad0 * 0.7 : rad0 * 0.45, a = r() * 6.283, d = R * (0.06 + r() * 0.72); let x = Math.cos(a) * d, z = Math.sin(a) * d; if (LP && LP.shaped && LP.samp) { const q = LP.samp(r, rad + 2); x = q[0]; z = q[1]; } // R46：特殊形状（长廊 / 臂）上也摆景物
      if (LP && LP.shaped && LP.dOut ? LP.dOut(x, z) > -(rad + 1.5) : Math.hypot(x, z) + rad > R - 1.5) { why.edge++; continue; } if (!free(x, z, rad)) { why.free++; continue; } if (!wdOK(x, z, rad)) { why.wd++; continue; } if (LP && LP.pathD && LP.pathD(x, z) < rad + 0.6) { why.path++; continue; } if (doorList.some(dd => Math.hypot(dd.x - x, dd.z - z) < rad + 5)) { why.door++; continue; } return [x, z]; } return null; };
    const putH = (name, x, z, o, ry, dy) => { const v = one([name]); if (!v) return 0; const sz = v.t.size, k = o.h ? o.h / Math.max(0.1, sz.y) : o.w / Math.max(0.1, sz.x, sz.z); put(v.t, x, z, k, ry, dy != null ? H(x, z) + dy : undefined); return k; };
    const axis = (v, th) => v.t.size.x >= v.t.size.z ? -th : Math.PI / 2 - th; // 让模型长轴指向 th
    const B = {
      fallen(x, z) { const a0 = r() * 6.283, vs = variants(['dead_tree_trunk', 'dead_tree_trunk_02']), n = 1 + (r() < 0.5 ? 1 : 0);
        for (let i = 0; i < n && vs.length; i++) { const v = vs[Math.floor(r() * vs.length)], th = a0 + i * (0.5 + r() * 0.5), L = 6 + r() * 5, s = L / Math.max(v.t.size.x, v.t.size.z), ox = x + Math.cos(th + 1.57) * i * 1.6, oz = z + Math.sin(th + 1.57) * i * 1.6;
          put(v.t, ox, oz, s, axis(v, th)); for (let k = -2; k <= 2; k++) cols.push({ x: ox + Math.cos(th) * k * L * 0.19, z: oz + Math.sin(th) * k * L * 0.19, r: 0.55 }); }
        const rc = variants(['root_cluster_01']); if (rc.length) { const e = a0 + Math.PI; put(rc[0].t, x + Math.cos(e) * 3.4, z + Math.sin(e) * 3.4, 2.2 / Math.max(0.3, rc[0].t.size.y), r() * 6.28); }
        for (let i = 0; i < 3; i++) spots.push({ x: x + (r() - 0.5) * 7, z: z + (r() - 0.5) * 7 }); },
      watch(x, z) { const tv = one(['modular_fort_01#*']); const vs = variants(['modular_fort_01#*']), tw = vs.find(v => /tower_round/.test(v.t.name || '')), ws = vs.filter(v => /thin_straight_0[34]/.test(v.t.name || ''));
        if (tw) { const s = 0.33; put(tw.t, x, z, s, r() * 6.28); cols.push({ x, z, r: Math.max(1.4, tw.t.size.x * s * 0.46) }); }
        if (ws.length) for (let i = 0; i < 4; i++) { if (r() < 0.35) continue; const a = i * 1.5708 + r() * 0.4, d = 4.2, v = ws[i % ws.length]; put(v.t, x + Math.cos(a) * d, z + Math.sin(a) * d, 0.3 + r() * 0.06, -a + Math.PI / 2); cols.push({ x: x + Math.cos(a) * d, z: z + Math.sin(a) * d, r: 1.1 }); }
        const rk = variants(['rock_07']); for (let i = 0; i < 6 && rk.length; i++) { const a = r() * 6.28, d = 2.5 + r() * 3.5; put(rk[0].t, x + Math.cos(a) * d, z + Math.sin(a) * d, (0.4 + r() * 0.5) / Math.max(0.3, rk[0].t.size.x), r() * 6.28); }
        const f = fitR('stone_fire_pit', { w: 1.0 }); if (f) { const fx = x + 3, fz = z + 1.5; place(f, fx, fz, 0); flame(fx, H(fx, fz) + 0.12, fz, 4); light(fx, H(fx, fz) + 0.9, fz, '#ff9a50', 1.8, 10); cols.push({ x: fx, z: fz, r: 0.6 }); }
        for (let i = 0; i < 3; i++) { const a = r() * 6.28; spots.push({ x: x + Math.cos(a) * 5, z: z + Math.sin(a) * 5 }); } },
      graves(x, z) { const vs = variants(['rock_09', 'rock_07']), qt = variants(['dead_quiver_trunk']), rows = 2 + (r() < 0.5 ? 1 : 0), per = 4 + Math.floor(r() * 3), a0 = r() * 3.14, ca = Math.cos(a0), sa = Math.sin(a0);
        for (let i = 0; i < rows; i++) for (let j = 0; j < per; j++) { if (r() < 0.12 || !vs.length) continue; const isQ = qt.length && r() < 0.4, u = (j - (per - 1) / 2) * 1.9 + (r() - 0.5) * 0.4, w = (i - (rows - 1) / 2) * 2.4 + (r() - 0.5) * 0.4, px = x + u * ca - w * sa, pz = z + u * sa + w * ca, v = isQ ? qt[0] : vs[Math.floor(r() * vs.length)], hgt = isQ ? 1.3 + r() * 0.7 : 0.55 + r() * 0.45, s = hgt / Math.max(0.3, v.t.size.y);
          put(v.t, px, pz, s, a0 + Math.PI / 2 + (r() - 0.5) * 0.25, H(px, pz) - 0.12 * s); cols.push({ x: px, z: pz, r: 0.42 }); }
        const ln = fitR('Lantern_01', { h: 0.4 }); if (ln) { place(ln, x + 0.7, z + 0.4, 0, 0); flame(x + 0.7, H(x + 0.7, z + 0.4) + 0.2, z + 0.4, 1.2); light(x + 0.7, H(x, z) + 1, z + 0.4, '#ffb070', 1.0, 7); }
        const dt = variants(['dead_tree_trunk_02']); if (dt.length) { const th = a0 + 1.4; put(dt[0].t, x + Math.cos(th) * (per * 1.1 + 2), z + Math.sin(th) * (per * 1.1 + 2), 4.5 / Math.max(dt[0].t.size.x, dt[0].t.size.z), axis(dt[0], a0)); }
        for (let i = 0; i < 3; i++) spots.push({ x: x + (r() - 0.5) * 8, z: z + (r() - 0.5) * 6 }); },
      cache(x, z) { const ry = r() * 6.28, f = fitR('stone_fire_pit', { w: 0.9 }); place(f, x, z, 0); if (f) { flame(x, H(x, z) + 0.12, z, 3.6); light(x, H(x, z) + 0.9, z, '#ff9a50', 1.6, 9); cols.push({ x, z, r: 0.6 }); }
        const items = [['wooden_crate_02', { w: 0.9 }, 2.0, 1.2], ['wooden_barrels_01', { h: 1.0 }, -2.1, 0.9], ['wicker_basket_01', { w: 0.55 }, -1.4, -1.9], ['wooden_bucket_01', { w: 0.45 }, 1.6, -1.7], ['wooden_crate_02', { w: 0.75 }, 2.6, 2.2]];
        for (const it of items) { const [px, pz] = loc(it[2], it[3], x, z, ry); if (putH(it[0], px, pz, it[1], r() * 6.28)) cols.push({ x: px, z: pz, r: 0.42 }); }
        mark(x, z, 3.5); for (let i = 0; i < 2; i++) { const a = r() * 6.28; spots.push({ x: x + Math.cos(a) * 3.4, z: z + Math.sin(a) * 3.4 }); } },
      gate(x, z) { const ry = r() * 6.28, gt = fitR('large_iron_gate', { h: 3.6 }); place(gt, x, z, ry); const rk = variants(['rock_09', 'rock_07']);
        for (const sx of [-1, 1]) { const [px, pz] = loc(sx * 2.2, 0, x, z, ry); if (rk.length) put(rk[0].t, px, pz, 1.6 / Math.max(0.3, rk[0].t.size.y), r() * 6.28); flame(px, H(px, pz) + 0.9, pz, 2.4); cols.push({ x: px, z: pz, r: 0.7 }); }
        light(x, H(x, z) + 2, z, '#9ab8ff', 1.3, 9); const [bx, bz] = loc(0, 2.2, x, z, ry); spots.push({ x: bx, z: bz }, { x: bx + 1.5, z: bz }); },
      idol(x, z) { const horse = r() < 0.4, nm = horse ? 'horse_statue_01' : 'gothic_statue'; putH(nm, x, z, { h: horse ? 3.8 : 3.2 }, r() * 6.28); cols.push({ x, z, r: 1.1 });
        const n = 5 + Math.floor(r() * 3), a0 = r() * 6.28; for (let i = 0; i < n; i++) { const a = a0 + i / n * 6.283, px = x + Math.cos(a) * 4.6, pz = z + Math.sin(a) * 4.6, f = fitR('stone_fire_pit', { w: 0.8 }); if (!f) break; place(f, px, pz, a); if (i % 2 === 0) flame(px, H(px, pz) + 0.1, pz, 3); cols.push({ x: px, z: pz, r: 0.5 }); }
        light(x, H(x, z) + 2.4, z, '#ffb070', 1.7, 12); mark(x, z, 5.5); for (let i = 0; i < 3; i++) { const a = a0 + (i + 0.5) / 3 * 6.283; spots.push({ x: x + Math.cos(a) * 3, z: z + Math.sin(a) * 3 }); } },
      boulders(x, z) { const vs = variants(['namaqualand_boulder_03']), sm = variants(['rock_moss_set_01#*']), n = 5 + Math.floor(r() * 4);
        for (let i = 0; i < n && vs.length; i++) { const a = r() * 6.28, d = Math.abs(gauss(r)) * 2.6, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, v = vs[Math.floor(r() * vs.length)], big = i < 2, s = (big ? 3.0 + r() * 1.4 : 1.2 + r() * 1.4) / Math.max(0.5, v.t.size.x, v.t.size.y, v.t.size.z);
          put(v.t, px, pz, s, r() * 6.28); cols.push({ x: px, z: pz, r: Math.max(0.6, v.t.size.x * s * 0.42) }); }
        for (let i = 0; i < 8 && sm.length; i++) { const a = r() * 6.28, d = 2 + r() * 4, v = sm[Math.floor(r() * sm.length)]; put(v.t, x + Math.cos(a) * d, z + Math.sin(a) * d, (0.5 + r() * 0.6) / Math.max(0.2, v.t.size.x), r() * 6.28); }
        for (let i = 0; i < 3; i++) { const a = r() * 6.28; spots.push({ x: x + Math.cos(a) * 5, z: z + Math.sin(a) * 5 }); } },
      fairy(x, z) { const n = 22 + Math.floor(r() * 10), fl = variants(['flower_gazania#*', 'flower_empodium#*']), st = variants(['tree_stump_02']);
        for (let i = 0; i < n && fl.length; i++) { const a = i / n * 6.283 + r() * 0.2, d = 2.6 + (r() - 0.5) * 0.6, v = fl[Math.floor(r() * fl.length)]; put(v.t, x + Math.cos(a) * d, z + Math.sin(a) * d, 2.6 + r() * 1.4, r() * 6.28, undefined, false, { L: new C(1, 1, 1), B: new C(1, 1, 1) }); }
        for (let i = 0; i < 10 && fl.length; i++) { const a = r() * 6.28, d = r() * 2.2, v = fl[Math.floor(r() * fl.length)]; put(v.t, x + Math.cos(a) * d, z + Math.sin(a) * d, 2 + r() * 1.2, r() * 6.28, undefined, false, { L: new C(1, 1, 1), B: new C(1, 1, 1) }); }
        if (st.length) { put(st[0].t, x, z, 1.3 / Math.max(0.3, st[0].t.size.x), r() * 6.28); cols.push({ x, z, r: 0.55 }); }
        for (let i = 0; i < 3; i++) { const a = r() * 6.28; spots.push({ x: x + Math.cos(a) * 3.6, z: z + Math.sin(a) * 3.6 }); } },
      lanterns(x, z) { const a = r() * 6.28, n = 5, dx = Math.cos(a), dz = Math.sin(a), bent = (r() - 0.5) * 0.5;
        for (let i = 0; i < n; i++) { const t = (i - (n - 1) / 2) * 5, aa = a + bent * (i - 2) * 0.2, px = x + dx * t + Math.cos(aa + 1.57) * Math.sin(i) * 0.6, pz = z + dz * t + Math.sin(aa + 1.57) * Math.sin(i) * 0.6; if (!wdOK(px, pz, 1) || Math.hypot(px, pz) > R - 1.5) continue;
          if (!putH('street_lamp_01', px, pz, { h: 3.6 }, aa)) continue; cols.push({ x: px, z: pz, r: 0.3 }); flame(px, H(px, pz) + 3.1, pz, 2.2); if (i === 0 || i === n - 1 || i === 2) light(px, H(px, pz) + 3.1, pz, '#ffc27a', 1.3, 9); }
        spots.push({ x: x + dx * 2.5 + dz * 2, z: z + dz * 2.5 - dx * 2 }, { x: x - dx * 2.5 - dz * 2, z: z - dz * 2.5 + dx * 2 }); },
      parlor(x, z) { const ry = r() * 6.28, T = [['wooden_picnic_table', { w: 2.6 }, 0, 0, 0], ['painted_wooden_bench', { w: 1.8 }, 0, 1.7, 0], ['painted_wooden_bench', { w: 1.8 }, 0, -1.7, Math.PI], ['wooden_stool_01', { h: 0.5 }, 2.4, 0.4, 0.5], ['wicker_basket_01', { w: 0.5 }, -2.0, 1.6, 1], ['wooden_barrels_01', { h: 0.9 }, -2.6, -0.8, 0]];
        for (const it of T) { const [px, pz] = loc(it[2], it[3], x, z, ry); if (putH(it[0], px, pz, it[1], ry + it[4])) cols.push({ x: px, z: pz, r: 0.6 }); }
        const ln = fitR('Lantern_01', { h: 0.4 }); if (ln) { place(ln, x, z, 0, 0.78); flame(x, H(x, z) + 0.95, z, 1.1); light(x, H(x, z) + 1.4, z, '#ffb070', 0.9, 7); }
        mark(x, z, 3.6); spots.push({ x: x + 3, z: z + 1.5 }, { x: x - 3, z: z - 1.5 }); },
      pyre(x, z) { const vs = variants(['dead_tree_trunk', 'dead_tree_trunk_02']), br = variants(['dry_branches_medium_01#*']); let layer = 0;
        for (let i = 0; i < 9 && vs.length; i++) { const lay = Math.floor(i / 3), v = vs[i % vs.length], th = lay * 1.05 + (i % 3) * 1.05 + r() * 0.2, L = 3.2 - lay * 0.5, s = L / Math.max(v.t.size.x, v.t.size.z); put(v.t, x, z, s, axis(v, th), H(x, z) + lay * 0.32); layer = lay; }
        for (let i = 0; i < 5 && br.length; i++) { const a = r() * 6.28, d = 1.4 + r() * 1.6; put(br[0].t, x + Math.cos(a) * d, z + Math.sin(a) * d, 1.2 + r() * 0.6, r() * 6.28); }
        flame(x, H(x, z) + 0.9, z, 8.5); light(x, H(x, z) + 1.6, z, '#ff6a30', 2.6, 14); cols.push({ x, z, r: 1.9 }); mark(x, z, 3.2);
        for (let i = 0; i < 4; i++) { const a = i * 1.57 + r() * 0.5; spots.push({ x: x + Math.cos(a) * 4, z: z + Math.sin(a) * 4 }); } },
      ring(x, z) { const n = 8 + Math.floor(r() * 5), vs = variants(['namaqualand_boulder_04', 'rock_face_02', 'rock_face_01']), rad = 4.6 + r() * 1.4, a0 = r() * 6.28;
        for (let i = 0; i < n && vs.length; i++) { if (r() < 0.12) continue; const a = a0 + i / n * 6.283, px = x + Math.cos(a) * rad, pz = z + Math.sin(a) * rad, v = vs[Math.floor(r() * vs.length)], hgt = 2 + r() * 1.6, s = hgt / Math.max(0.4, v.t.size.y); put(v.t, px, pz, s, -a + Math.PI / 2 + (r() - 0.5) * 0.3, H(px, pz) - 0.15 * s); cols.push({ x: px, z: pz, r: Math.max(0.5, v.t.size.x * s * 0.4) }); }
        const alt = fitR('stone_fire_pit', { w: 1.2 }); place(alt, x, z, 0); flame(x, H(x, z) + 0.12, z, 5); light(x, H(x, z) + 1, z, '#8fb0ff', 1.6, 12); cols.push({ x, z, r: 0.8 }); mark(x, z, rad + 1);
        for (let i = 0; i < 3; i++) { const a = a0 + (i + 0.5) / 3 * 6.283; spots.push({ x: x + Math.cos(a) * 2.6, z: z + Math.sin(a) * 2.6 }); } }
    };
    for (const p of g.pieces) { const at = spotFor(p.rad); if (!at) continue; try { (g.placed || (g.placed = [])).push({ k: p.k, x: at[0], z: at[1] }); mark(at[0], at[1], p.rad); (B[p.k] || (() => 0))(at[0], at[1]); } catch (e) { console.warn('wgen piece', p.k, e); } }
  }
  function dress(g, X) {
    if (!g || !g.ready) return null; g.r3 = mulberry((g.seed ^ 0x2545F491) >>> 0); const r = g.r3, { sc, H, R, cols, put, variants, mark } = X, sky = X.sky, upd = [];
    const W = g.water; X.lights = { n: 0 };
    // -- 水面
    if (W) { const col = WATER[g.waterCol] || WATER.teal, mat = waterMat(g, sky, col); upd.push((dt, p, now) => { mat.userData.U.t.value = now; }); const meshes = [];
      if (W.kind === 'river') { const ch = W.ch, N = ch.pts.length, S = 4, pts = [], lv = []; // 加密
        for (let i = 0; i < N - 1; i++) for (let k = 0; k < S; k++) { const t = k / S, p0 = ch.pts[Math.max(0, i - 1)], p1 = ch.pts[i], p2 = ch.pts[i + 1], p3 = ch.pts[Math.min(N - 1, i + 2)], cr = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t); pts.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]); lv.push(lerp(W.lv[i], W.lv[Math.min(i + 1, W.lv.length - 1)], t)); }
        pts.push(ch.pts[N - 1].slice()); lv.push(W.lv[W.lv.length - 1]); const M = pts.length, hw = W.w + 1.4, pos = [], idx = [];
        for (let i = 0; i < M; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(M - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l, y = lv[i] - 0.06; pos.push(pts[i][0] + nx * hw, y, pts[i][1] + nz * hw, pts[i][0] - nx * hw, y, pts[i][1] - nz * hw); if (i < M - 1) { const a0 = i * 2; idx.push(a0, a0 + 1, a0 + 2, a0 + 1, a0 + 3, a0 + 2); } }
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, mat); m.receiveShadow = false; m.frustumCulled = false; m.renderOrder = 1; m.userData.wg = 1; sc.add(m);
        for (let i = 0; i < M; i += 3) mark(pts[i][0], pts[i][1], W.w + 0.6);
        { let bx0 = 1e9, bz0 = 1e9, bx1 = -1e9, bz1 = -1e9; for (const q of pts) { bx0 = Math.min(bx0, q[0]); bz0 = Math.min(bz0, q[1]); bx1 = Math.max(bx1, q[0]); bz1 = Math.max(bz1, q[1]); } try { bakeWaterDepth(g, mat, [[bx0 - hw - 1, bz0 - hw - 1, bx1 + hw + 1, bz1 + hw + 1]]); } catch (e) { console.warn('waterdepth', e); } }
        // 芦苇/岸石
        const reeds = variants(['grass_medium_02#*']); const cn = new C(1, 1, 1).multiply(g.grassMul);
        for (let i = 0; i < 90 && reeds.length; i++) { const k = Math.floor(r() * (M - 1)), a = pts[k], b = pts[k + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, sd = r() < 0.5 ? -1 : 1, off = W.w + 0.1 + r() * 1.4, x = a[0] - dz / l * sd * off, z = a[1] + dx / l * sd * off; if (Math.hypot(x, z) > R * 1.02) continue; put(reeds[Math.floor(r() * reeds.length)].t, x, z, 2 + r() * 1.4, r() * 6.28, undefined, false, ic0(g, 'grass', x, z, r)); }
        // 木桥
        const pv = variants(['modular_wooden_pier'])[0], cands = []; for (let i = 4; i < M - 4; i++) if (Math.hypot(pts[i][0], pts[i][1]) < R * 0.75) cands.push(i);
        if (pv && cands.length) { const i = cands[Math.floor(r() * cands.length)], a = pts[i - 1], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], th = Math.atan2(dz, dx) + Math.PI / 2, Lb = 2 * (W.w + 1.6) + 1.5, Lm = Math.max(pv.t.size.z, pv.t.size.x, 0.5), s = Lb / Lm, deck = lv[i] + 0.08;
          put(pv.t, pts[i][0], pts[i][1], s, pv.t.size.x >= pv.t.size.z ? -th : Math.PI / 2 - th, deck - 1.0 * s); const PL = X.inst && X.inst.get(pv.t); if (PL && PL.length) PL[PL.length - 1].keep = 1; } }
      else { try { bakeWaterDepth(g, mat, W.P.map(p => { const rr = p.r * 1.45 * Math.max(1, p.sx) + 1.5; return [p.x - rr, p.z - rr, p.x + rr, p.z + rr]; })); } catch (e) { console.warn('waterdepth', e); }
        for (const p of W.P) { const geo = new THREE.CircleGeometry(1, 40); geo.rotateX(-Math.PI / 2); const m = new THREE.Mesh(geo, mat); m.position.set(p.x, p.lv - 0.06, p.z); m.rotation.y = -p.th; m.scale.set(p.r * 1.45 * p.sx, 1, p.r * 1.45); m.frustumCulled = false; m.renderOrder = 1; m.userData.wg = 1; sc.add(m); cols.push({ x: p.x, z: p.z, r: p.r * 0.75 }); mark(p.x, p.z, p.r * 1.3);
          const reeds = variants(['grass_medium_02#*']); for (let i = 0; i < 26 && reeds.length; i++) { const a = r() * 6.28, d = p.r * (1.05 + r() * 0.35), x = p.x + Math.cos(a) * d * p.sx, z = p.z + Math.sin(a) * d; if (!g.wd || g.wd(x, z).d < 0.2 || g.wd(x, z).d > 2.6) continue; put(reeds[Math.floor(r() * reeds.length)].t, x, z, 2 + r() * 1.4, r() * 6.28, undefined, false, ic0(g, 'grass', x, z, r)); } } }
    }
    // -- 布景
    try { buildPieces(g, X); } catch (e) { console.warn('wgen pieces', e); }
    { const got = new Set((g.placed || []).map(q => PIECES[q.k].n)); g.tag = g.tag.filter(t => !g.pieces.some(p => p.n === t) || got.has(t)); }
    // -- 光束
    const sd = X.sunDir; if (g.shafts && sd && sd.y > 0.15) { const grp = new THREE.Group(), n = 7 + Math.floor(r() * 6), mats = [], q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), sd.clone().normalize());
      for (let i = 0; i < n; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * R * 0.95, x = Math.cos(a) * d, z = Math.sin(a) * d, Lh = 26 + r() * 14, w = 1.6 + r() * 3.4, mt = beamMat(g.sunCol, 0.1 + r() * 0.1); mt.userData.b = mt.opacity; mt.userData.ph = r() * 6.28; mats.push(mt);
        for (let k = 0; k < 2; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, Lh), mt), o = new THREE.Group(); o.add(m); m.rotation.y = k * Math.PI / 2; o.position.set(x, H(x, z), z).addScaledVector(sd, Lh * 0.5 - 1); o.quaternion.copy(q); o.frustumCulled = false; m.frustumCulled = false; m.userData.wg = 1; grp.add(o); } }
      sc.add(grp); upd.push((dt, p, now) => { for (const mt of mats) { mt.opacity = mt.userData.b * (0.75 + 0.25 * Math.sin(now * 0.6 + mt.userData.ph)); if (mt.uniforms) mt.uniforms.op.value = mt.opacity; } }); }
    // -- 地雾团
    if (g.mist > 0 && sc.fog) { const n = Math.round((R < 20 ? 8 : 14) * g.mist), fc = sc.fog.color.clone().lerp(new C(1, 1, 1), 0.25), grp = new THREE.Group(), mm = [];
      for (let i = 0; i < n; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * R * 0.85, x = Math.cos(a) * d, z = Math.sin(a) * d, s = 9 + r() * 12; let hm = -1e9; for (let k = 0; k < 6; k++) hm = Math.max(hm, H(x + Math.cos(k) * s * 0.3, z + Math.sin(k) * s * 0.3)); const mt = new THREE.MeshBasicMaterial({ map: softTex('mist'), color: fc, transparent: true, opacity: (0.1 + r() * 0.12) * Math.min(1, g.mist + 0.2), depthWrite: false, fog: true }); mt.userData.b = mt.opacity; mt.userData.ph = r() * 6.28; mm.push(mt);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), mt); m.rotation.x = -Math.PI / 2; m.position.set(x, hm + 0.25 + r() * 0.3, z); m.frustumCulled = false; m.renderOrder = 2; m.userData.wg = 1; grp.add(m); }
      sc.add(grp); upd.push((dt, p, now) => { for (const mt of mm) mt.opacity = mt.userData.b * (0.8 + 0.2 * Math.sin(now * 0.35 + mt.userData.ph)); }); }
    return { update(dt, p, now) { for (const f of upd) f(dt, p, now); } };
  }
  const ic0 = (g, k, x, z, r) => ic(g, k, x, z, r);
  window.__wgenTest = { vnoise, makeTerrain };
  return { waterMat, bakeWaterDepth, on, style, assets, prepare, paint, ic, keep, dress, GRADES, SEASONS, TYPES, PIECES, mulberry, pick, wpick, vnoise, channel, segDist, sstep, clamp, lerp };
})();
