// R46 地形特色化。MOD `terrain_master`（默认开；?wt=0 临时关）。
// 用户：“地形生成挺没特色，比较一般，很重复”“最好随机生成，不要让玩家玩腻，多样性要无限丰富”。
// 原地形 = 一圈平缓的盆地（±1~3m 起伏）+ 外圈山坡，每张图看起来差不多。这里在原高度场上叠加（全部由地点种子决定，每次出猎种子都是新的）：
//  ① 地形“基因”：起伏强度 rug（对数正态，10% 极平缓、8% 极险峻）、山脊频率/方向拉伸/扭曲量；再加地层台阶（部分地区）
//  ② 标志地貌 1~4 个，从 16 种里按地区权重抽，每种的位置/尺寸/高度/朝向/数量都是连续随机量，所以组合几乎不重样：
//     断崖 scarp · 古冢 barrow · 深壕 cut · 石冢 twins · 高台 plateau · 乱石岗 moraine · 长谷 valley · 古道 road(连两个门的路基) · 阶梯坑 amphi
//     天坑 sink · 阶梯台 zigg · 马蹄岭 horseshoe · 脊刃 spine · 地裂 fissure · 火山丘 volcano · 沙浪 dune
//  ③ 植被构图（每地点随机一种）：散布 / 林丛 / 林间空地 / 空心林 / 林带 / 稀树（WTerrain.veg 调制树与灌木的密度）
//  ④ 坡度贴岩：陡坡三平面混合真岩石贴图（Poly Haven CC0：aerial_rocks_02 / cliff_side / rock_face_03；同一地区按种子随机选贴图 + 染色抖动）
//  ⑤ 陡坡上长岩石（复用该地区样式里的岩石模型，不新增模型），陡处不长草树
// 安全：门口/水边/中心出生点附近衰减到原地形；lake/ravine 布局不叠加；水面高度由原 g.h 决定，所以水边不动。
// 接口（worlds.js / wgen.js 调用）：wrap(H, X) → 新 H；veg(node,R)；rock(node)；assets(st,node)；steep(H)；outcrops(X)。
window.WTerrain = (() => {
  'use strict';
  const on = () => !window.Mods || !Mods.on || Mods.on('terrain_master') !== false;
  const act = () => on() && !/[?&]wt=0/.test(location.search);
  const clamp = (a, b, v) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp(0, 1, (x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const mulberry = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  function mkNoise(seed) { // 单倍频值噪声 0..1
    const h = (x, y) => { let n = (x * 374761393 + y * 668265263 + seed * 69069) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
    return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
      return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - w) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * w; };
  }
  function segD(x, z, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1, t = clamp(0, 1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2); return { d: Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t), t }; }
  function polyD(P, x, z) { let bd = 1e9, bt = 0; const n = P.length - 1; for (let i = 0; i < n; i++) { const q = segD(x, z, P[i], P[i + 1]); if (q.d < bd) { bd = q.d; bt = (i + q.t) / n; } } return { d: bd, t: bt }; }
  const NAMES = { scarp: '断崖', barrow: '古冢', cut: '深壕', twins: '石冢', plateau: '高台', moraine: '乱石岗', valley: '长谷', road: '古道', amphi: '阶梯坑', sink: '天坑', zigg: '阶梯台', horseshoe: '马蹄岭', spine: '脊刃', fissure: '地裂', volcano: '火山丘', dune: '沙浪' };
  // A=脊状振幅(m)  strata=地层台阶强度  feats=标志地貌权重  nf=最多几个
  const PROF = {
    meadow: { A: 0.75, strata: 0, nf: 3, feats: { barrow: 3, plateau: 2, cut: 2, scarp: 0.8, twins: 0.6, moraine: 2, valley: 2, road: 2, amphi: 1, sink: 0.4, dune: 0.3, zigg: 0.3, horseshoe: 1, spine: 0.5, fissure: 0.2, volcano: 0.15 } },
    forest: { A: 1.0, strata: 0, nf: 3, feats: { cut: 3, barrow: 2, twins: 2, scarp: 1, plateau: 0.4, moraine: 3, valley: 2, sink: 1, road: 1.5, horseshoe: 1, fissure: 0.5, spine: 0.6 } },
    wilds: { A: 1.35, strata: 0.6, nf: 4, feats: { scarp: 3, twins: 2.5, cut: 2, plateau: 1.5, spine: 2, fissure: 2, sink: 1, volcano: 0.5, dune: 2, amphi: 1, road: 1, horseshoe: 1.5, moraine: 1.5, zigg: 0.5, valley: 1 } },
    ruins: { A: 0.85, strata: 0.15, nf: 3, feats: { plateau: 3, barrow: 2, scarp: 1, cut: 1, zigg: 2, amphi: 2, road: 3, sink: 0.6, moraine: 1, horseshoe: 1 } },
    swamp: { A: 0.5, strata: 0, nf: 2, feats: { barrow: 3, cut: 1.5, twins: 0.4, moraine: 2, valley: 1.5, sink: 1, road: 1 } },
    fortress: { A: 1.05, strata: 0.5, nf: 3, feats: { scarp: 3, plateau: 3, twins: 0.8, zigg: 2, amphi: 2, road: 2, spine: 1.5, horseshoe: 1, fissure: 0.6 } },
    capital: { A: 0.65, strata: 0.7, nf: 3, feats: { plateau: 3, scarp: 1.5, barrow: 0.5, zigg: 2, amphi: 3, road: 3, horseshoe: 0.5 } },
    abyss: { A: 1.6, strata: 0.4, nf: 4, feats: { twins: 3, cut: 2.5, scarp: 2, barrow: 1, fissure: 3, sink: 2.5, volcano: 1.5, spine: 1.5, moraine: 1, zigg: 1, horseshoe: 1 } },
    peak: { A: 1.9, strata: 0.5, nf: 4, feats: { scarp: 3, twins: 3, cut: 1, plateau: 1, spine: 3, fissure: 1.5, sink: 0.6, volcano: 0.6, horseshoe: 1.5, moraine: 1.5, valley: 1 } }
  };
  // 植被构图（每个地点随机一种）
  const VEGN = { groves: '林丛', glades: '林间空地', rim: '空心林', belt: '林带', bare: '稀树' };
  const VEGW = {
    meadow: { scatter: 2, groves: 4, rim: 2, belt: 2, glades: 1, bare: 1 }, forest: { scatter: 1, glades: 4, groves: 2, belt: 1, rim: 1 }, wilds: { bare: 3, groves: 2, scatter: 2, belt: 1 },
    ruins: { scatter: 2, groves: 2, rim: 2, belt: 1, bare: 1, glades: 1 }, swamp: { scatter: 2, groves: 3, glades: 2, bare: 1 }, fortress: { scatter: 2, bare: 3, rim: 1, belt: 1 },
    capital: { bare: 3, rim: 2, belt: 2, scatter: 1 }, abyss: { bare: 3, groves: 2, scatter: 1 }, peak: { bare: 3, groves: 2, scatter: 1, belt: 1 }
  };
  const ROCK = { // 地区 → [[贴图, 染色, 权重]...]；按地点种子随机选一种
    meadow: [['aerial_rocks_02', [1, 1, 1], 4], ['rock_face_03', [0.95, 0.95, 0.9], 1]], forest: [['aerial_rocks_02', [0.9, 0.95, 0.85], 4], ['rock_face_03', [0.8, 0.85, 0.78], 1]],
    swamp: [['aerial_rocks_02', [0.78, 0.84, 0.72], 3], ['rock_face_03', [0.6, 0.66, 0.58], 1]], ruins: [['aerial_rocks_02', [0.95, 0.95, 0.92], 2], ['rock_face_03', [0.9, 0.9, 0.9], 2]],
    wilds: [['cliff_side', [1, 0.95, 0.9], 4], ['rock_face_03', [1.05, 0.95, 0.85], 1.5], ['cliff_side', [0.8, 0.72, 0.68], 1]], fortress: [['rock_face_03', [0.86, 0.86, 0.88], 3], ['cliff_side', [0.72, 0.7, 0.72], 1]],
    capital: [['rock_face_03', [0.92, 0.9, 0.88], 3], ['cliff_side', [0.78, 0.76, 0.78], 1]], abyss: [['rock_face_03', [0.4, 0.36, 0.44], 3], ['cliff_side', [0.36, 0.3, 0.38], 1]], peak: [['rock_face_03', [0.88, 0.93, 1.06], 3], ['cliff_side', [0.8, 0.86, 1.0], 1]]
  };
  function pickW(r, o, ex) { let t = 0; const e = Object.entries(o).filter(([k]) => !(ex || []).includes(k)); for (const [, w] of e) t += w; let x = r() * t; for (const [k, w] of e) { if ((x -= w) <= 0) return k; } return e[0][0]; }
  const rock = (node) => { const L = ROCK[node && node.style] || ROCK.meadow, rr = mulberry(((node && node.seed) ^ 0x5bd1e995) >>> 0); let t = 0; for (const e of L) t += e[2]; let x = rr() * t; for (const e of L) { if ((x -= e[2]) <= 0) return { name: e[0], tint: e[1].map(c => c * (0.92 + rr() * 0.16)) }; } return { name: L[0][0], tint: L[0][1] }; };
  const assets = (st, node) => act() ? ['tex_' + rock(node).name] : [];

  function wrap(H, X) {
    if (!act()) return H;
    const node = X.node, sn = node.style || 'meadow', P = PROF[sn] || PROF.meadow, g = X.g || null, LYk = X.LY && X.LY.k;
    if (LYk === 'lake' || LYk === 'ravine') return H;
    const R = Math.max(10, X.Rmin || X.R || 20), r = mulberry((node.seed ^ 0x3c6ef372) >>> 0), v = mkNoise((node.seed ^ 0x27d4eb2f) & 0xffffff);
    const gs = () => (r() + r() + r() - 1.5) * 1.4;
    // 地形基因：起伏强度（对数正态；少数极平缓 / 极险峻）
    let rug = Math.exp(gs() * 0.3); const q0 = r(); if (q0 < 0.1) rug = 0.45 + r() * 0.15; else if (q0 > 0.92) rug *= 1.35; rug = clamp(0.4, 1.9, rug);
    const sc = (R < 18 ? 0.65 : 1) * (LYk === 'henge' ? 0.5 : 1) * rug, A = P.A * sc * 1.35, ox = r() * 200, oz = r() * 200, fq = 0.03 + r() * 0.045, wA = 6 + r() * 10;
    const anis = 0.55 + r() * 0.9, aa = r() * 6.283, cA = Math.cos(aa), sA = Math.sin(aa); // 山脊方向拉伸
    const doors = X.doorList || [];
    const dd = (x, z) => { let m = 1e9; for (const d of doors) m = Math.min(m, Math.hypot(x - d.x, z - d.z)); return m; };
    const feats = [], used = [], tags = [];
    const nfMax = R < 18 ? 2 : P.nf + 1, nf = 1 + Math.floor(r() * nfMax * (1 - 0.3 * (rug < 0.6 ? 1 : 0)));
    const LPs = X.LP && X.LP.shaped && X.LP.samp ? X.LP : null; // R46：特殊形状的地图，地貌也撒到长廊 / 臂上
    const spot = (rad) => { for (let t = 0; t < 50; t++) { let x, z; if (LPs) { const q = LPs.samp(r, rad + 3); x = q[0]; z = q[1]; if (Math.hypot(x, z) < R * 0.25) continue; } else { const a = r() * 6.283, d = R * (0.2 + r() * 0.55); x = Math.cos(a) * d; z = Math.sin(a) * d; } if (dd(x, z) > rad + 7 && used.every(u => Math.hypot(u.x - x, u.z - z) > u.r + rad + 2)) { used.push({ x, z, r: rad }); return { x, z }; } } return null; };
    const line = () => { const a = r() * 6.283; return { a, c: Math.cos(a), s: Math.sin(a), off: (r() - 0.5) * R * 0.7 }; };
    const MK = {
      scarp() { const L = line(), S = (3.4 + r() * 3.2) * sc * (r() < 0.5 ? 1 : -1), w = Math.abs(S) * 0.85, gt = (r() - 0.5) * R, gw = R * (0.14 + r() * 0.12), bend = 4 + r() * 8;
        return (x, z) => { const t = x * L.c + z * L.s, d = -x * L.s + z * L.c - L.off + (v(x * 0.05 + ox, z * 0.05 + oz) - 0.5) * bend * 2, gap = Math.exp(-(((t - gt) / gw) ** 2)); return S * (sstep(-w, w, d) - 0.5) * (1 - 0.8 * gap); }; },
      barrow() { const rad = clamp(4.5, R * 0.36, 5 + r() * 5) * (sc > 0.8 ? 1 : 0.8), p = spot(rad * 1.6); if (!p) return null; const Hm = (2.0 + r() * 2.2) * sc, ring = r() < 0.5;
        return (x, z) => { const d = Math.hypot(x - p.x, z - p.z) * (1 + (v(x * 0.2 + oz, z * 0.2 + ox) - 0.5) * 0.35); return ring ? Hm * Math.exp(-(((d - rad * 0.75) / (rad * 0.36)) ** 2)) - Hm * 0.55 * Math.exp(-((d / (rad * 0.5)) ** 2)) : Hm * 1.15 * Math.exp(-((d / (rad * 0.85)) ** 2)); }; },
      cut() { const L = line(), D = (1.6 + r() * 1.6) * sc, w = 2.4 + r() * 1.8, amp = R * (0.1 + r() * 0.2), kk = 0.04 + r() * 0.06, ph = r() * 6.283, lat = (r() - 0.5) * R * 0.5;
        return (x, z) => { const u = x * L.c + z * L.s, vv = -x * L.s + z * L.c - lat, o = Math.sin(u * kk + ph) * amp + (v(u * 0.07 + ox, 3) - 0.5) * 5, d = Math.abs(vv - o); return -D * (1 - sstep(w * 0.35, w * 1.9, d)) + 0.3 * Math.exp(-(((d - w * 2.1) / 1.4) ** 2)); }; },
      valley() { const L = line(), D = (1.3 + r() * 1.5) * sc, w = 5 + r() * 4, amp = R * (0.12 + r() * 0.2), kk = 0.03 + r() * 0.04, ph = r() * 6.283, lat = (r() - 0.5) * R * 0.6;
        return (x, z) => { const u = x * L.c + z * L.s, vv = -x * L.s + z * L.c - lat, o = Math.sin(u * kk + ph) * amp, d = Math.abs(vv - o); return -D * (1 - sstep(0, w * 1.7, d)); }; },
      twins() { const n = 2 + Math.floor(r() * 4), T = []; for (let j = 0; j < n; j++) { const s = 2.4 + r() * 2.2, p = spot(s * 2.2); if (p) T.push({ x: p.x, z: p.z, s, h: (3.2 + r() * 3.4) * sc }); } if (!T.length) return null;
        return (x, z) => { let h = 0; for (const t of T) { const d2 = ((x - t.x) ** 2 + (z - t.z) ** 2) / (t.s * t.s), n1 = 0.85 + 0.3 * v(x * 0.45 + oz, z * 0.45 + ox); h += t.h * n1 * (Math.exp(-d2) + 0.25 * Math.exp(-d2 / 4)); } return h; }; },
      plateau() { const rad = clamp(4, R * 0.38, 5 + r() * 5), p = spot(rad * 1.5); if (!p) return null; const Hp = (2.2 + r() * 2.2) * sc, ramp = Hp * 1.5 + 2, sq = r() < 0.4;
        return (x, z) => { const dx = x - p.x, dz = z - p.z, d = sq ? Math.max(Math.abs(dx), Math.abs(dz)) * 1.08 : Math.hypot(dx, dz); return Hp * (1 - sstep(rad, rad + ramp, d + (v(x * 0.15 + ox, z * 0.15 + oz) - 0.5) * 1.6)) - Hp * 0.25; }; },
      moraine() { const rad = clamp(6, R * 0.4, 7 + r() * 6), p = spot(rad * 1.2); if (!p) return null; const n = 6 + Math.floor(r() * 9), M = []; for (let j = 0; j < n; j++) { const a = r() * 6.283, d = Math.sqrt(r()) * rad; M.push({ x: p.x + Math.cos(a) * d, z: p.z + Math.sin(a) * d, h: (0.6 + r() * 1.4) * sc, s: 1.2 + r() * 1.6 }); }
        return (x, z) => { let h = 0; for (const m of M) { const d2 = ((x - m.x) ** 2 + (z - m.z) ** 2) / (m.s * m.s); if (d2 < 9) h += m.h * Math.exp(-d2); } return h; }; },
      road() { if (doors.length < 2) return null; const i = Math.floor(r() * doors.length); let j = Math.floor(r() * (doors.length - 1)); if (j >= i) j++; const A = doors[i], B = doors[j], mx = (A.x + B.x) / 2 + (r() - 0.5) * R * 0.5, mz = (A.z + B.z) / 2 + (r() - 0.5) * R * 0.5;
        const P = [[A.x, A.z], [(A.x + mx) / 2 + (r() - 0.5) * 4, (A.z + mz) / 2 + (r() - 0.5) * 4], [mx, mz], [(B.x + mx) / 2 + (r() - 0.5) * 4, (B.z + mz) / 2 + (r() - 0.5) * 4], [B.x, B.z]], Hr = (0.55 + r() * 0.6) * Math.max(0.6, sc), w = 1.5 + r() * 1.0;
        return (x, z) => { const d = polyD(P, x, z).d; return Hr * (1 - sstep(w * 0.6, w * 1.8, d)) * (0.8 + 0.2 * v(x * 0.3 + ox, z * 0.3 + oz)); }; },
      amphi() { const rad = clamp(7, R * 0.45, 8 + r() * 5), p = spot(rad); if (!p) return null; const n = 3 + Math.floor(r() * 3), s = (0.7 + r() * 0.6) * Math.max(0.7, sc);
        return (x, z) => { const t = Math.hypot(x - p.x, z - p.z) * (1 + (v(x * 0.12 + ox, z * 0.12 + oz) - 0.5) * 0.25) / rad; if (t >= 1) return 0; const qq = (1 - t) * n, i = Math.floor(qq), f = qq - i; return -s * (Math.min(n, i + sstep(0.35, 0.65, f))) + 0; }; },
      sink() { const D = (2.4 + r() * 2.2) * Math.max(0.7, sc), rad = Math.max(3.5 + r() * 2.5, D * 1.8), p = spot(rad * 1.5); if (!p) return null;
        return (x, z) => { const d = Math.hypot(x - p.x, z - p.z) * (1 + (v(x * 0.25 + ox, z * 0.25 + oz) - 0.5) * 0.3); return -D * (1 - sstep(rad * 0.45, rad, d)) + 0.5 * Math.exp(-(((d - rad * 1.05) / 1.0) ** 2)); }; },
      zigg() { const n = 3 + Math.floor(r() * 2), base = 4 + r() * 3, inset = 1.3 + r() * 0.5, sh = (0.8 + r() * 0.5) * Math.max(0.7, sc), p = spot(base * 1.5); if (!p) return null; const a = r() * 6.283, c = Math.cos(a), s = Math.sin(a);
        return (x, z) => { const dx = x - p.x, dz = z - p.z, u = dx * c + dz * s, w = -dx * s + dz * c, d = Math.max(Math.abs(u), Math.abs(w)); let h = 0; for (let i = 0; i < n; i++) h += sh * (1 - sstep(base - i * inset, base - i * inset + 1.4, d)); return h - sh * 0.3; }; },
      horseshoe() { const rad = clamp(6, R * 0.4, 7 + r() * 5), w = 2 + r() * 1.5, p = spot(rad * 1.3); if (!p) return null; const Hh = (2 + r() * 1.6) * sc, go = r() * 6.283, gw = 0.6 + r() * 0.5;
        return (x, z) => { const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz), an = Math.atan2(dz, dx), da = Math.atan2(Math.sin(an - go), Math.cos(an - go)), gap = Math.exp(-((da / gw) ** 2)); return Hh * Math.exp(-(((d - rad) / w) ** 2)) * (1 - 0.95 * gap) * (0.85 + 0.3 * v(x * 0.3 + ox, z * 0.3 + oz)); }; },
      spine() { const L = line(), Hh = (2 + r() * 2.2) * sc, w = 2 + r() * 1.6, len = R * (0.5 + r() * 0.5), g1 = (r() - 0.5) * len, g2 = (r() - 0.5) * len, gw = 2.5 + r() * 2, bend = 3 + r() * 6, kk = 0.05 + r() * 0.05, ph = r() * 6.283;
        return (x, z) => { const t = x * L.c + z * L.s, d = -x * L.s + z * L.c - L.off - Math.sin(t * kk + ph) * bend, env = 1 - sstep(len * 0.6, len * 0.9, Math.abs(t)), gp = Math.max(Math.exp(-(((t - g1) / gw) ** 2)), Math.exp(-(((t - g2) / gw) ** 2))); return Hh * Math.exp(-((d / w) ** 2)) * env * (1 - 0.85 * gp) * (0.85 + 0.3 * v(x * 0.25 + ox, z * 0.25 + oz)); }; },
      fissure() { const D = (1.8 + r() * 1.4) * Math.max(0.7, sc), w = 0.9 + r() * 0.7, n = 5 + Math.floor(r() * 3), a = r() * 6.283, len = R * (0.5 + r() * 0.5), cx = (r() - 0.5) * R * 0.4, cz = (r() - 0.5) * R * 0.4, P = [];
        for (let i = 0; i <= n; i++) { const t = i / n - 0.5; P.push([cx + Math.cos(a) * t * len * 2 + Math.cos(a + 1.57) * (r() - 0.5) * 7, cz + Math.sin(a) * t * len * 2 + Math.sin(a + 1.57) * (r() - 0.5) * 7]); }
        return (x, z) => { const q = polyD(P, x, z), env = Math.sin(Math.PI * clamp(0.02, 0.98, q.t)); return (-D * (1 - sstep(w * 0.3, w * 1.7, q.d)) + 0.2 * Math.exp(-(((q.d - w * 2) / 0.9) ** 2))) * env; }; },
      volcano() { const rad = clamp(6, R * 0.5, 9 + r() * 4), p = spot(rad * 1.1); if (!p) return null; const Hc = (3.5 + r() * 3) * sc, cr = 0.16 + r() * 0.12, ga = r() * 6.283;
        return (x, z) => { const t = Math.hypot(x - p.x, z - p.z) * (1 + (v(x * 0.2 + oz, z * 0.2 + ox) - 0.5) * 0.25) / rad; if (t > 1.2) return 0; const an = Math.atan2(z - p.z, x - p.x), dA = Math.abs(Math.atan2(Math.sin(an - ga), Math.cos(an - ga))), br = Math.exp(-((dA / 0.45) ** 2)) * sstep(0.04, 0.32, t); /* 火山口一侧有缺口，口内走得进去 */ return Hc * Math.pow(1 - sstep(0, 1.15, t), 1.35) * (1 - 0.55 * Math.exp(-((t / cr) ** 2))) * (1 - 0.72 * br); }; },
      dune() { const rad = 12 + r() * 8, p = spot(rad * 0.8); if (!p) return null; const Ad = (0.5 + r() * 0.6) * Math.max(0.7, sc), k = 0.2 + r() * 0.2, a = r() * 6.283, c = Math.cos(a), s = Math.sin(a);
        return (x, z) => { const d = Math.hypot(x - p.x, z - p.z); if (d > rad * 1.3) return 0; const ph = ((x - p.x) * c + (z - p.z) * s) * k + (v(x * 0.05 + ox, z * 0.05 + oz) - 0.5) * 5; return Ad * (Math.pow(0.5 + 0.5 * Math.sin(ph), 1.6) * 1.6 - 0.5) * (1 - sstep(rad * 0.6, rad * 1.3, d)); }; }
    };
    for (let i = 0, guard = 0; i < nf && guard < 12; guard++) {
      const k = pickW(r, P.feats, tags.map(t => t.k)); let f = null; try { f = MK[k] && MK[k](); } catch (e) { console.warn('WT feat', k, e); }
      if (f) { feats.push(f); tags.push({ k, n: NAMES[k] }); i++; }
    }
    if (g && Array.isArray(g.tag)) { for (const t of tags) g.tag.push(t.n); if (rug < 0.6) g.tag.push('平缓'); else if (rug > 1.45) g.tag.push('险峻'); }
    node._wt = tags.map(t => t.k);
    // ---- 基础脊状分形（方向拉伸 + 域扭曲，全部随机）----
    const base = (x, z) => {
      const xr = (x * cA + z * sA) * anis, zr = (-x * sA + z * cA) / anis;
      const u = xr + (v(x * 0.03 + ox, z * 0.03 + oz) - 0.5) * wA, w = zr + (v(x * 0.03 - oz, z * 0.03 + ox) - 0.5) * wA; let a = 1, f = fq, s = 0;
      for (let i = 0; i < 3; i++) { const n = 1 - Math.abs(v(u * f + ox, w * f + oz) * 2 - 1); s += a * n * n; a *= 0.5; f *= 2.05; }
      return (s / 1.75 - 0.5) * A * 2.4 + (v(x * 0.19 + oz, z * 0.19 + ox) - 0.5) * 0.24 * Math.min(1, sc);
    };
    const sh = 1.0 + r() * 0.9;
    const relief = (x, z) => { let h = base(x, z); for (const f of feats) h += f(x, z); if (P.strata) { const q = h / sh, i = Math.floor(q); h = lerp(h, sh * (i + sstep(0.3, 0.7, q - i)), P.strata); } return h; };
    const wd = g && g.wd, LPd = X.LP && X.LP.dOut ? X.LP : null;
    const dOf = (x, z, rr) => LPd ? LPd.dOut(x, z) : rr - R;
    const D = (x, z) => { // 遮罩后的起伏量（0 = 保持原地形）
      const rr = Math.hypot(x, z); let m = sstep(3.5, 13, dd(x, z)) * (0.3 + 0.7 * sstep(1.5, 8, rr));
      if (m <= 0) return 0;
      m *= 1 - 0.6 * sstep(10, 45, dOf(x, z, rr));
      if (wd) m *= sstep(1.6, 7, wd(x, z).d);
      return m > 0 ? relief(x, z) * m : 0;
    };
    // R46 坡度限幅：多个地貌叠在一起（断崖 + 天坑 + 脊刃…）会出现近乎垂直的墙。把起伏量烘成 1.5m 网格，
    // 做 8 邻域 Lipschitz 限幅（≤ SLIM 米/米），再双线性取样；离边界 >18m 处渐回原函数（无缝）。
    if (!(window.WTerrain_noLimit)) {
      const cs = 1.5, SLIM = 1.25 * (rug > 1.3 ? 1.12 : 1), ext = (X.LP && X.LP.Rmax ? X.LP.Rmax : (X.R || 20) + 2) + 25, n = Math.ceil(2 * ext / cs) + 1, G = new Float32Array(n * n);
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) G[j * n + i] = D(-ext + i * cs, -ext + j * cs);
      const NB = [[1, 0, 1], [0, 1, 1], [1, 1, 1.4142], [1, -1, 1.4142]], lim = SLIM * cs; let ch = 0;
      for (let it = 0; it < 6; it++) { ch = 0;
        const step = (i, j) => { const c = j * n + i; let v = G[c]; for (const [di, dj, dl] of NB) for (const sg of [1, -1]) { const ii = i + di * sg, jj = j + dj * sg; if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue; const w = G[jj * n + ii], L = lim * dl; if (v > w + L) v = w + L; else if (v < w - L) v = w - L; } if (v !== G[c]) { ch++; G[c] = v; } };
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) step(i, j);
        for (let j = n - 1; j >= 0; j--) for (let i = n - 1; i >= 0; i--) step(i, j);
        if (!ch) break; }
      const sample = (x, z) => { const fx = (x + ext) / cs, fz = (z + ext) / cs; if (fx < 0 || fz < 0 || fx >= n - 1 || fz >= n - 1) return null; const i = Math.floor(fx), j = Math.floor(fz), a = fx - i, b = fz - j, c = j * n + i; return (G[c] * (1 - a) + G[c + 1] * a) * (1 - b) + (G[c + n] * (1 - a) + G[c + n + 1] * a) * b; };
      node._wtLim = ch; // 调试：最后一轮仍改动的格数
      return (x, z) => { const d0 = D(x, z), rr = Math.hypot(x, z), w = 1 - sstep(18, 25, dOf(x, z, rr)); if (w <= 0) return H(x, z) + d0; const q = sample(x, z); return H(x, z) + (q == null ? d0 : d0 + (q - d0) * w); };
    }
    return (x, z) => H(x, z) + D(x, z);
  }
  // 植被构图：返回 (kind,x,z)=>保留概率（树/灌木）
  function veg(node, R) {
    if (!act()) return null;
    const r = mulberry((node.seed ^ 0x6a09e667) >>> 0), v = mkNoise((node.seed ^ 0x510e527f) & 0xffffff), sn = node.style || 'meadow';
    const mode = pickW(r, VEGW[sn] || VEGW.meadow), s = 0.55 + r() * 0.45, f1 = 0.028 + r() * 0.04, ox = r() * 99, oz = r() * 99, a = r() * 6.283, ca = Math.cos(a), sa = Math.sin(a), off = (r() - 0.5) * R * 0.6;
    node._wv = mode;
    if (mode === 'scatter') return null;
    return (kind, x, z) => {
      if (kind !== 'tree' && kind !== 'plant') return 1;
      let p = 1; const n = v(x * f1 + ox, z * f1 + oz), rr = Math.hypot(x, z);
      if (mode === 'groves') p = lerp(1, sstep(0.45, 0.58, n), s);
      else if (mode === 'glades') p = lerp(1, 1 - sstep(0.6, 0.7, n), s);
      else if (mode === 'rim') p = lerp(1, sstep(R * 0.22, R * 0.85, rr), s);
      else if (mode === 'belt') { const d = -x * sa + z * ca - off; p = lerp(1, Math.exp(-((d / (R * 0.28)) ** 2)), s); }
      else if (mode === 'bare') p = 0.3 + 0.4 * sstep(0.4, 0.6, n);
      return kind === 'plant' ? lerp(1, p, 0.5) : p;
    };
  }
  const vegName = (node) => VEGN[node && node._wv] || '';
  const steep = (H) => (x, z) => Math.hypot(H(x + 0.5, z) - H(x - 0.5, z), H(x, z + 0.5) - H(x, z - 0.5));
  // 陡坡岩石
  function outcrops(X) {
    if (!act() || X.LYk === 'lake') return;
    const { H, R, put, variants, cols, st, node, pick, doorList } = X, rocks = (st.props || []).filter(p => p[4] === 'rock').flatMap(p => p[0]);
    if (!rocks.length) return; const vs = variants(rocks); if (!vs.length) return;
    const r = mulberry((node.seed ^ 0x1f83d9ab) >>> 0), sl = steep(H), want = (node._wt && node._wt.length ? 70 : 40) * (X.k || 1); let placed = 0;
    for (let t = 0; t < 2400 && placed < want; t++) {
      const a = r() * 6.283, d = Math.sqrt(r()) * (R + 10), x = Math.cos(a) * d, z = Math.sin(a) * d; if (doorList.some(q => Math.hypot(q.x - x, q.z - z) < 5)) continue;
      const s = sl(x, z); if (s < 0.5) continue;
      const vv = pick(r, vs), tg = (0.8 + r() * 1.5) * (0.75 + Math.min(1.2, s) * 0.5), k = tg / Math.max(0.5, Math.max(vv.t.size.x, vv.t.size.z));
      put(vv.t, x, z, k, r() * 6.283, H(x, z) - 0.22 * k * Math.max(vv.t.size.y, 1)); placed++; if (tg > 1.6) cols.push({ x, z, r: tg * 0.4 });
    }
  }
  return { wrap, veg, vegName, steep, outcrops, rock, assets, act, PROF, NAMES };
})();
