// R46 地形特色化。MOD `terrain_master`（默认开；?wt=0 临时关）。
// 用户：“现在地形生成挺没特色，比较一般，很重复”。
// 原地形 = 一圈平缓的盆地（±1~3m 的起伏）+ 外圈山坡，每张图看起来差不多。这里在原高度场上叠加：
//  ① 脊状分形（山脊/沟壑网络，按地区定振幅）+ 域扭曲 + 微起伏；wilds/fortress/capital/peak/abyss 再叠“地层台阶”
//  ② 每个地点 1~3 个“标志地貌”（由地点种子决定，同区也不一样）：断崖 scarp / 古冢 barrow / 深壕 cut / 石冢 twins / 高台 plateau
//  ③ 坡度贴岩：陡坡处三平面混合真岩石贴图（Poly Haven CC0：aerial_rocks_02 / cliff_side / rock_face_03，按地区选），法线/粗糙度/AO 一起换
//  ④ 陡坡上长岩石（复用该地区样式里的岩石模型，不新增模型），陡处不长草/树
// 安全：门口/水边/中心出生点附近衰减到原地形；lake/ravine 布局不叠加；水面高度由原 g.h 决定，所以水边不动。
// 接口（worlds.js / wgen.js 调用）：wrap(H, X) → 新 H；rock(node) → {name,tint}；assets(st,node)；steep(H)；outcrops(X)。
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
  const NAMES = { scarp: '断崖', barrow: '古冢', cut: '深壕', twins: '石冢', plateau: '高台' };
  // A=脊状振幅(m)  strata=地层台阶强度  feats=标志地貌权重  nf=最多几个
  const PROF = {
    meadow: { A: 0.75, strata: 0, nf: 2, feats: { barrow: 3, plateau: 2, cut: 2, scarp: 0.8, twins: 0.6 } },
    forest: { A: 1.0, strata: 0, nf: 2, feats: { cut: 3, barrow: 2, twins: 2, scarp: 1, plateau: 0.4 } },
    wilds: { A: 1.35, strata: 0.6, nf: 3, feats: { scarp: 3, twins: 2.5, cut: 2, plateau: 1.5 } },
    ruins: { A: 0.85, strata: 0.15, nf: 2, feats: { plateau: 3, barrow: 2, scarp: 1, cut: 1 } },
    swamp: { A: 0.5, strata: 0, nf: 1, feats: { barrow: 3, cut: 1.5, twins: 0.4 } },
    fortress: { A: 1.05, strata: 0.5, nf: 2, feats: { scarp: 3, plateau: 3, twins: 0.8 } },
    capital: { A: 0.65, strata: 0.7, nf: 2, feats: { plateau: 3, scarp: 1.5, barrow: 0.5 } },
    abyss: { A: 1.6, strata: 0.4, nf: 3, feats: { twins: 3, cut: 2.5, scarp: 2, barrow: 1 } },
    peak: { A: 1.9, strata: 0.5, nf: 3, feats: { scarp: 3, twins: 3, cut: 1, plateau: 1 } }
  };
  const ROCK = { // 地区 → [贴图, 染色]
    meadow: ['aerial_rocks_02', [1, 1, 1]], forest: ['aerial_rocks_02', [0.9, 0.95, 0.85]], swamp: ['aerial_rocks_02', [0.78, 0.84, 0.72]], ruins: ['aerial_rocks_02', [0.95, 0.95, 0.92]],
    wilds: ['cliff_side', [1, 0.95, 0.9]], fortress: ['rock_face_03', [0.86, 0.86, 0.88]], capital: ['rock_face_03', [0.92, 0.9, 0.88]], abyss: ['rock_face_03', [0.4, 0.36, 0.44]], peak: ['rock_face_03', [0.88, 0.93, 1.06]]
  };
  const rock = (node) => { const k = ROCK[node && node.style] || ROCK.meadow; return { name: k[0], tint: k[1] }; };
  const assets = (st, node) => act() ? ['tex_' + rock(node).name] : [];

  function pickW(r, o, ex) { let t = 0, e = Object.entries(o).filter(([k]) => !ex.includes(k)); for (const [, w] of e) t += w; let x = r() * t; for (const [k, w] of e) { if ((x -= w) <= 0) return k; } return e[0][0]; }

  function wrap(H, X) {
    if (!act()) return H;
    const node = X.node, sn = node.style || 'meadow', P = PROF[sn] || PROF.meadow, g = X.g || null, LYk = X.LY && X.LY.k;
    if (LYk === 'lake' || LYk === 'ravine') return H;
    const R = Math.max(10, X.Rmin || X.R || 20), r = mulberry((node.seed ^ 0x3c6ef372) >>> 0), v = mkNoise((node.seed ^ 0x27d4eb2f) & 0xffffff);
    const sc = (R < 18 ? 0.65 : 1) * (LYk === 'henge' ? 0.5 : 1), A = P.A * sc * 1.35, ox = r() * 200, oz = r() * 200, fq = 0.04 + r() * 0.03;
    const doors = X.doorList || [];
    const dd = (x, z) => { let m = 1e9; for (const d of doors) m = Math.min(m, Math.hypot(x - d.x, z - d.z)); return m; };
    // ---- 标志地貌 ----
    const feats = [], used = [], nf = Math.min(P.nf, R < 18 ? 1 : (r() < 0.45 ? P.nf - 1 : P.nf)) || 1;
    const spot = (rad) => { for (let t = 0; t < 40; t++) { const a = r() * 6.283, d = R * (0.22 + r() * 0.5), x = Math.cos(a) * d, z = Math.sin(a) * d; if (dd(x, z) > rad + 7 && used.every(u => Math.hypot(u.x - x, u.z - z) > u.r + rad + 2)) { used.push({ x, z, r: rad }); return { x, z }; } } return null; };
    const tags = [];
    for (let i = 0; i < nf; i++) {
      const k = pickW(r, P.feats, tags.map(t => t.k)); let f = null;
      if (k === 'scarp') {
        const a = r() * 6.283, ca = Math.cos(a), sa = Math.sin(a), off = (r() - 0.5) * R * 0.7, S = (3.4 + r() * 3.2) * sc * (r() < 0.5 ? 1 : -1), w = Math.abs(S) * 0.85, gt = (r() - 0.5) * R * 1.0, gw = R * (0.14 + r() * 0.12);
        // 门口不能落在断崖的陡面上：整体由 mask（门口衰减）兜底
        f = (x, z) => { const t = x * ca + z * sa, d = -x * sa + z * ca - off + (v(x * 0.05 + ox, z * 0.05 + oz) - 0.5) * 8, gap = Math.exp(-(((t - gt) / gw) ** 2)); return S * (sstep(-w, w, d) - 0.5) * (1 - 0.8 * gap); };
      } else if (k === 'barrow') {
        const rad = clamp(4.5, R * 0.36, 6 + r() * 4) * (sc > 0.9 ? 1 : 0.8), p = spot(rad * 1.6); if (!p) continue; const Hm = (2.0 + r() * 2.2) * sc, ring = r() < 0.5;
        f = (x, z) => { const d = Math.hypot(x - p.x, z - p.z) * (1 + (v(x * 0.2 + oz, z * 0.2 + ox) - 0.5) * 0.35); return ring ? Hm * Math.exp(-(((d - rad * 0.75) / (rad * 0.36)) ** 2)) - Hm * 0.55 * Math.exp(-((d / (rad * 0.5)) ** 2)) : Hm * 1.15 * Math.exp(-((d / (rad * 0.85)) ** 2)); };
      } else if (k === 'cut') {
        const a = r() * 6.283, ca = Math.cos(a), sa = Math.sin(a), D = (1.6 + r() * 1.6) * sc, w = 2.4 + r() * 1.8, amp = R * (0.12 + r() * 0.16), kk = 0.05 + r() * 0.05, ph = r() * 6.283, lat = (r() - 0.5) * R * 0.5;
        f = (x, z) => { const u = x * ca + z * sa, vv = -x * sa + z * ca - lat, o = Math.sin(u * kk + ph) * amp + (v(u * 0.07 + ox, 3) - 0.5) * 5, d = Math.abs(vv - o); return -D * (1 - sstep(w * 0.35, w * 1.9, d)) + 0.3 * Math.exp(-(((d - w * 2.1) / 1.4) ** 2)); };
      } else if (k === 'twins') {
        const n = 2 + Math.floor(r() * 3), T = []; for (let j = 0; j < n; j++) { const s = 2.4 + r() * 1.6, p = spot(s * 2.2); if (p) T.push({ x: p.x, z: p.z, s, h: (3.2 + r() * 3.4) * sc }); } if (!T.length) continue;
        f = (x, z) => { let h = 0; for (const t of T) { const d2 = ((x - t.x) ** 2 + (z - t.z) ** 2) / (t.s * t.s), n1 = 0.85 + 0.3 * v(x * 0.45 + oz, z * 0.45 + ox); h += t.h * n1 * (Math.exp(-d2) + 0.25 * Math.exp(-d2 / 4)); } return h; };
      } else if (k === 'plateau') {
        const rad = clamp(4, R * 0.36, 5 + r() * 4), p = spot(rad * 1.5); if (!p) continue; const Hp = (2.2 + r() * 2.2) * sc, ramp = Hp * 1.5 + 2, sq = r() < 0.4;
        f = (x, z) => { const dx = x - p.x, dz = z - p.z, d = sq ? Math.max(Math.abs(dx), Math.abs(dz)) * 1.08 : Math.hypot(dx, dz); return Hp * (1 - sstep(rad, rad + ramp, d + (v(x * 0.15 + ox, z * 0.15 + oz) - 0.5) * 1.6)) - Hp * 0.25; };
      }
      if (f) { feats.push(f); tags.push({ k, n: NAMES[k] }); }
    }
    if (g && Array.isArray(g.tag)) for (const t of tags) g.tag.push(t.n);
    node._wt = tags.map(t => t.k);
    // ---- 基础脊状分形 ----
    const base = (x, z) => {
      const u = x + (v(x * 0.03 + ox, z * 0.03 + oz) - 0.5) * 10, w = z + (v(x * 0.03 - oz, z * 0.03 + ox) - 0.5) * 10; let a = 1, f = fq, s = 0;
      for (let i = 0; i < 3; i++) { const n = 1 - Math.abs(v(u * f + ox, w * f + oz) * 2 - 1); s += a * n * n; a *= 0.5; f *= 2.05; }
      return (s / 1.75 - 0.5) * A * 2.4 + (v(x * 0.19 + oz, z * 0.19 + ox) - 0.5) * 0.24 * sc;
    };
    const sh = 1.0 + r() * 0.9;
    const relief = (x, z) => { let h = base(x, z); for (const f of feats) h += f(x, z); if (P.strata) { const q = h / sh, i = Math.floor(q); h = lerp(h, sh * (i + sstep(0.3, 0.7, q - i)), P.strata); } return h; };
    const wd = g && g.wd;
    return (x, z) => {
      const rr = Math.hypot(x, z); let m = sstep(3.5, 13, dd(x, z)) * (0.3 + 0.7 * sstep(1.5, 8, rr));
      if (m <= 0) return H(x, z);
      m *= 1 - 0.6 * sstep(R + 10, R + 45, rr);
      if (wd) m *= sstep(1.6, 7, wd(x, z).d);
      return H(x, z) + (m > 0 ? relief(x, z) * m : 0);
    };
  }
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
  return { wrap, steep, outcrops, rock, assets, act, PROF };
})();
