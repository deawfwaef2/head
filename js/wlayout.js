// 第十八轮（陈列/地图 Agent）· 出门地图多样化（MOD wlayout，默认开；关掉 = 回到原来的“圆形空地 + 均匀散布”）
// 用户反馈：探索地图生成“重复、无聊”。这里只改“怎么摆”，不造模型：
//   1) 形状：边界不再是正圆（椭圆拉伸 + 花瓣起伏，只往外扩，Rf ≥ R），每个地点轮廓都不同
//   2) 地形：起伏强度随机（平地 / 丘陵 / 陡坡）+ 可能有土丘或洼地
//   3) 布局：小径（门之间踩出的凹路，路边垒石，路上不长树）/ 树丛成簇（林丛）/ 中央空场
//   4) 布景：废弃营地 / 古战场（插在地里的刀剑）/ 猎首者的木桩（倒插长剑顶着牛头狮头马头）/ 侏儒法庭 / 巨石道 / 无名祭坛
//   5) 天气与气氛：雨 / 雪 / 萤火 / 余烬 / 灰烬 / 落叶 / 花粉 / 扬尘，雾浓淡与日光强弱随机
// 模型全部来自已有的 Poly Haven CC0 资产（assets/*.js 与 big/world/*.js），粒子贴图是画布画的光点（和 worlds.js 原有的 glow 一样）。
// 接口：worlds.js buildNode() 调 WLayout.plan / paths / dH / keep / densK / dress，frame() 调 B.wx 更新天气。
window.WLayout = (() => {
  const on = () => !(window.Mods && !Mods.on('wlayout'));
  const V3 = THREE.Vector3;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
  const WX = { meadow: ['', '', 'pollen', 'rain'], forest: ['', 'leaves', 'fireflies', 'rain'], wilds: ['', '', 'dust'], ruins: ['', 'fireflies', 'rain'], swamp: ['fireflies', 'rain', ''], fortress: ['', 'rain', 'embers'],
    capital: ['', 'rain', 'fireflies'], abyss: ['embers', 'ash', 'embers'], peak: ['snow', 'snow', ''] };
  const WXN = { rain: '细雨', snow: '落雪', fireflies: '萤火', embers: '余烬', ash: '灰烬飘落', leaves: '落叶', pollen: '花粉', dust: '扬尘' };
  const SP = {
    camp: { n: '废弃营地', st: 'meadow forest wilds swamp fortress peak ruins', rad: 3.4 },
    battle: { n: '古战场', st: 'meadow wilds fortress ruins peak capital abyss', rad: 4.6 },
    trophy: { n: '猎首者的木桩', st: 'wilds forest peak abyss ruins meadow swamp', rad: 3.2 },
    gnomes: { n: '侏儒法庭', st: 'meadow forest swamp ruins capital', rad: 2.6 },
    avenue: { n: '巨石道', st: 'wilds ruins peak abyss meadow fortress', rad: 5.5 },
    shrine: { n: '无名祭坛', st: 'ruins forest swamp capital fortress abyss peak meadow', rad: 2.4 }
  };

  // ---------- 1) 规划：形状 / 地形 / 布局 / 天气 ----------
  function plan(node, nz) {
    if (!on() || node.home) return null;
    const r = mulberry((node.seed ^ 0x51ED270B) >>> 0), R = node.R, P = { R, nz, node };
    P.elong = r() < 0.5 ? 0.18 + r() * 0.34 : 0; P.th = r() * 6.283; P.lob = 0.05 + r() * 0.15; P.lobF = 2 + Math.floor(r() * 3); P.ph = r() * 6.283;
    P.Rf = a => R * (1 + P.elong * Math.cos(a - P.th) ** 2 + P.lob * (0.5 + 0.5 * Math.sin(a * P.lobF + P.ph)));
    P.Rmax = R * (1 + P.elong + P.lob);
    let ak = 0; for (let i = 0; i < 32; i++) ak += (P.Rf(i / 32 * 6.283) / R) ** 2; P.areaK = ak / 32;
    P.relief = pick(r, [0.35, 0.7, 1, 1, 1.7, 2.6]);
    if (r() < 0.35) { const a = r() * 6.283, d = R * r() * 0.3; P.hump = { x: Math.cos(a) * d, z: Math.sin(a) * d, h: (r() < 0.65 ? 1 : -0.6) * (1.4 + r() * 1.6), s: R * (0.2 + r() * 0.15) }; }
    P.path = r() < 0.6;
    if (r() < 0.5) P.clump = { f: 0.06 + r() * 0.07, th: 0.47 + r() * 0.08 };
    else if (r() < 0.4) { P.glade = R * (0.25 + r() * 0.15); P.gx = (r() - 0.5) * R * 0.3; P.gz = (r() - 0.5) * R * 0.3; }
    P.wx = pick(r, WX[node.style] || ['']);
    P.fog = pick(r, [0.55, 0.8, 1, 1, 1.25, 1.7]) * (P.wx === 'rain' ? 1.45 : P.wx === 'snow' ? 1.25 : 1);
    P.sun = (0.8 + r() * 0.35) * (P.wx === 'rain' ? 0.6 : 1);
    const cnt = node.size === 's' ? (r() < 0.75 ? 1 : 0) : node.size === 'm' ? 1 + (r() < 0.5 ? 1 : 0) : 2 + (r() < 0.5 ? 1 : 0);
    const ok = Object.keys(SP).filter(k => SP[k].st.split(' ').includes(node.style)); P.sp = [];
    for (let i = 0; i < cnt && ok.length; i++) P.sp.push(ok.splice(Math.floor(r() * ok.length), 1)[0]);
    if (window.__wlForce) Object.assign(P, window.__wlForce(P)); // 调试用（_w.html）
    P.r = r;
    P.tag = [...P.sp.map(k => SP[k].n), P.path ? '小径' : '', P.clump ? '林丛' : '', P.hump ? (P.hump.h > 0 ? '土丘' : '洼地') : '', WXN[P.wx] || ''].filter(Boolean).join(' · ');
    return P;
  }
  // ---------- 2) 小径：从每扇门蜿蜒到中心 ----------
  function paths(P, doors) {
    if (!P || !P.path || doors.length < 2) { P && (P.path = false); return; }
    const r = P.r, R = P.R, cx = (r() - 0.5) * R * 0.35, cz = (r() - 0.5) * R * 0.35, segs = [];
    for (const d of doors) {
      const ex = d.x * 0.97, ez = d.z * 0.97, L = Math.hypot(cx - ex, cz - ez) || 1, px = -(cz - ez) / L, pz = (cx - ex) / L, w = (r() - 0.5) * R * 0.45, f2 = (r() - 0.5) * R * 0.12;
      let lx = ex, lz = ez;
      for (let k = 1; k <= 12; k++) { const t = k / 12, o = Math.sin(Math.PI * t) * w + Math.sin(Math.PI * 2 * t) * f2, x = ex + (cx - ex) * t + px * o, z = ez + (cz - ez) * t + pz * o; segs.push([lx, lz, x, z]); lx = x; lz = z; }
    }
    P.segs = segs;
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const s of segs) { x0 = Math.min(x0, s[0], s[2]); x1 = Math.max(x1, s[0], s[2]); z0 = Math.min(z0, s[1], s[3]); z1 = Math.max(z1, s[1], s[3]); }
    P.pathD = (x, z) => { if (x < x0 - 3 || x > x1 + 3 || z < z0 - 3 || z > z1 + 3) return 9; let m = 1e9; for (const s of segs) { const dx = s[2] - s[0], dz = s[3] - s[1], l2 = dx * dx + dz * dz || 1, t = clamp(((x - s[0]) * dx + (z - s[1]) * dz) / l2, 0, 1), ex = x - s[0] - dx * t, ez = z - s[1] - dz * t, d = ex * ex + ez * ez; if (d < m) m = d; } return Math.sqrt(m); };
  }
  // 地形附加：土丘/洼地 + 凹路
  const BIG = { lake: 1, henge: 1, ravine: 1 }; // 总管理师的 worldlay 原型：这些自带大地形，就不再叠土丘/凹路
  function dH(P, x, z, flat) {
    let h = 0; const lay = P.node.lay; if (BIG[lay]) { if (lay === 'ravine') return 0; }
    if (P.hump && !BIG[lay]) { const d = Math.hypot(x - P.hump.x, z - P.hump.z); h += P.hump.h * Math.exp(-(d * d) / (P.hump.s * P.hump.s)) * flat; }
    if (P.pathD) { const d = P.pathD(x, z); if (d < 2) h -= 0.13 * (1 - sstep(0.5, 1.6, d)); }
    return h;
  }
  // 散布过滤：路上不长东西、空场不长树、树丛成簇
  function keep(P, x, z, kind, r) {
    if (P.pathD && P.pathD(x, z) < (kind === 'grass' ? 0.75 : kind === 'plant' ? 1.3 : 1.9)) return false;
    if (P.glade && kind !== 'grass' && kind !== 'plant' && Math.hypot(x - P.gx, z - P.gz) < P.glade) return false;
    if (P.clump && kind !== 'grass') { const m = P.nz(x * P.clump.f + 300, z * P.clump.f - 120); if (m < P.clump.th) return r() < 0.1; }
    if (P.clump && kind === 'grass') { const m = P.nz(x * P.clump.f + 300, z * P.clump.f - 120); if (m > P.clump.th + 0.08) return r() < 0.55; }
    return true;
  }
  const densK = (P, kind) => (P.clump && (kind === 'tree' || kind === 'rock' || kind === 'plant') ? 1.9 : P.glade && kind === 'tree' ? 1.3 : 1) * P.areaK;

  // ---------- 3) 布景 ----------
  function fitR(name, o) { // 先旋转再量尺寸（Assets.fit 的 rx/rz 是量完之后才转）
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
  function dress(P, X) {
    const { sc, H, R, cols, free, mark, put, variants } = X, r = P.r;
    const place = (g, x, z, ry, dy) => { if (!g) return null; g.position.set(x, H(x, z) + (dy || 0), z); g.rotation.y = ry || 0; sc.add(g); return g; };
    const loc = (ox, oz, x, z, ry) => [x + ox * Math.cos(ry) + oz * Math.sin(ry), z - ox * Math.sin(ry) + oz * Math.cos(ry)]; // 局部 → 世界（与 three 的 rotation.y 一致）
    const lights = [], lay = P.node.lay;
    if (lay === 'camp') P.sp = P.sp.filter(k => k !== 'camp'); // worldlay 已经有营地
    if (BIG[lay] && P.sp.length > 1) P.sp.length = 1;
    // 路边垒石
    if (P.segs && lay !== 'ravine') { const vs = variants(['rock_09', 'rock_07', 'namaqualand_rocks_01#*']); let acc = 0;
      if (vs.length) for (const s of P.segs) { const L = Math.hypot(s[2] - s[0], s[3] - s[1]); acc += L; if (acc < 2.4) continue; acc = 0; if (r() < 0.35) continue;
        const sd = r() < 0.5 ? -1 : 1, nx = -(s[3] - s[1]) / (L || 1), nz = (s[2] - s[0]) / (L || 1), x = s[2] + nx * sd * (1.35 + r() * 0.3), z = s[3] + nz * sd * (1.35 + r() * 0.3);
        if (Math.hypot(x, z) > R * 0.95) continue; const v = pick(r, vs), k = (0.28 + r() * 0.22) / Math.max(0.2, Math.max(v.t.size.x, v.t.size.z)); put(v.t, x, z, k, r() * 6.28); } }
    const spotFor = rad => { for (let t = 0; t < 60; t++) { const a = r() * 6.283, d = R * (0.12 + r() * 0.6), x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (!free(x, z, rad)) continue; if (P.pathD && P.pathD(x, z) < rad + 0.8) continue; if (Math.hypot(x, z) + rad > R - 1) continue; return [x, z]; } return null; };
    const flame = (x, y, z, s) => { const f = window.Assets && Assets.flame && Assets.flame(x, y, z, s); if (f) sc.add(f); };
    const B = {
      camp(x, z) {
        const y = H(x, z); place(fitR('stone_fire_pit', { w: 1.1 }), x, z, 0); flame(x, y + 0.12, z, 4.5);
        const pl = new THREE.PointLight('#ff8a40', 1.8, 10, 2); pl.position.set(x, y + 0.9, z); sc.add(pl); lights.push([pl, 1.8]); cols.push({ x, z, r: 0.7 });
        const lv = variants(['dead_tree_trunk_02', 'dead_tree_trunk']);
        if (lv.length) for (let i = 0; i < 3; i++) { const a = i / 3 * 6.283 + r() * 0.6, px = x + Math.cos(a) * 1.8, pz = z + Math.sin(a) * 1.8, v = lv[0], lx = v.t.size.x >= v.t.size.z, k = 1.6 / Math.max(v.t.size.x, v.t.size.z);
          put(v.t, px, pz, k, lx ? -(a + Math.PI / 2) : -a); cols.push({ x: px, z: pz, r: 0.45 }); }
        const ry = r() * 6.283, [bx, bz] = loc(2.6, 0.3, x, z, ry);
        place(fitR('wooden_crate_01', { w: 0.8 }), bx, bz, ry); const c2 = fitR('wooden_crate_01', { w: 0.8 }); if (c2) place(c2, bx, bz, ry + 0.3, 0.34);
        const ln = fitR('Lantern_01', { h: 0.3 }); if (ln) place(ln, bx + 0.1, bz, 0, 0.68);
        const [wx, wz] = loc(2.4, 1.2, x, z, ry); place(fitR('wine_barrel_01', { h: 0.85 }), wx, wz, r() * 6.28);
        const [kx, kz] = loc(-2.3, 1.0, x, z, ry); place(fitR('wicker_basket_01', { w: 0.45 }), kx, kz, r() * 6.28);
        const [ux, uz] = loc(-2.0, -1.4, x, z, ry); place(fitR('wooden_bucket_02', { w: 0.5 }), ux, uz, r() * 6.28);
        const [ax, az] = loc(1.2, -2.3, x, z, ry); place(fitR('wooden_axe_02', { L: 0.8, rz: Math.PI / 2 }), ax, az, r() * 6.28);
        cols.push({ x: bx, z: bz, r: 0.55 }, { x: wx, z: wz, r: 0.45 });
      },
      battle(x, z) {
        const sw = ['antique_katana_01', 'antique_estoc', 'machete'], flat = ['wooden_axe_02', 'ornate_war_hammer', 'ornate_medieval_mace', 'baseball_bat'], n = 14 + Math.floor(r() * 6);
        for (let i = 0; i < n; i++) { const a = r() * 6.283, d = 0.6 + r() * 3.8, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, u = r();
          if (u < 0.55) { const nm = pick(r, sw), L = nm === 'antique_estoc' ? 1.5 : nm === 'machete' ? 0.85 : 1.2, g = fitR(nm, { L, rx: Math.PI + (r() - 0.5) * 0.55, rz: (r() - 0.5) * 0.55 }); place(g, px, pz, r() * 6.28, -L * 0.3); }
          else if (u < 0.75) { const g = fitR('kite_shield', { L: 1.1, rx: -Math.PI / 2 + 0.2 + r() * 0.9 }); place(g, px, pz, r() * 6.28, -0.03); }
          else place(fitR(pick(r, flat), { L: 0.95, rz: Math.PI / 2 }), px, pz, r() * 6.28, -0.01); }
        const cv = variants(['wooden_military_crate', 'wooden_barrels_01']); for (let i = 0; i < 3 && cv.length; i++) { const a = r() * 6.283, px = x + Math.cos(a) * 4.2, pz = z + Math.sin(a) * 4.2; put(pick(r, cv).t, px, pz, 1, r() * 6.28); cols.push({ x: px, z: pz, r: 0.5 }); }
        const tv = variants(['dead_tree_trunk']); if (tv.length) { const a = r() * 6.283, px = x + Math.cos(a) * 3, pz = z + Math.sin(a) * 3; put(tv[0].t, px, pz, 1.0, r() * 6.28); cols.push({ x: px, z: pz, r: 0.6 }); }
      },
      trophy(x, z) { // 猎首者的木桩：一排长剑倒插当桩，桩顶顶着牛头/狮头/马头（猎首者也有别的收藏癖）
        const ry = Math.atan2(-x, -z), hs = ['bull_head', 'lion_head', 'horse_head'], m = 4 + Math.floor(r() * 2);
        for (let i = 0; i < m; i++) { const lx = (i - (m - 1) / 2) * 1.05 + (r() - 0.5) * 0.2, lz = -Math.abs(lx) * 0.25, [px, pz] = loc(lx, lz, x, z, ry), hgt = 1.45 + r() * 0.3;
          const pole = fitR('antique_estoc', { h: hgt + 0.35, rx: Math.PI }); if (pole) place(pole, px, pz, ry, -0.35);
          const g = fitR(hs[(i + Math.floor(r() * 3)) % 3], { h: 0.56 }); if (g) place(g, px, pz, ry + (r() - 0.5) * 0.4, hgt - 0.12);
          cols.push({ x: px, z: pz, r: 0.25 }); }
        const [sx, sz] = loc(-0.4, 1.3, x, z, ry); place(fitR('kite_shield', { L: 0.95, rx: -0.35 }), sx, sz, ry + 0.3, -0.05);
        const [bx, bz] = loc(0.9, 1.4, x, z, ry); place(fitR('wooden_crate_01', { w: 0.7 }), bx, bz, ry - 0.2);
        const ln = fitR('wooden_lantern_01', { h: 0.45 }); if (ln) { place(ln, bx, bz, ry, 0.34); flame(bx, H(bx, bz) + 0.54, bz, 1.1); }
        const [cx, cz] = loc(1.6, 1.0, x, z, ry); place(fitR('wooden_axe_02', { L: 0.8, rz: Math.PI / 2 }), cx, cz, r() * 6.28);
        cols.push({ x: bx, z: bz, r: 0.45 });
      },
      gnomes(x, z) { // 侏儒法庭：7 个花园侏儒围着站在木箱上的法官侏儒
        const ry0 = r() * 6.283; place(fitR('wooden_crate_01', { w: 0.7 }), x, z, ry0); const j = fitR('garden_gnome', { h: 0.72 }); if (j) place(j, x, z, ry0, 0.3);
        cols.push({ x, z, r: 0.45 });
        const n = 7; for (let i = 0; i < n; i++) { const a = i / n * 6.283 + ry0, px = x + Math.cos(a) * 1.7, pz = z + Math.sin(a) * 1.7, g = fitR('garden_gnome', { h: 0.5 + r() * 0.14 });
          if (g) place(g, px, pz, Math.atan2(x - px, z - pz) + (r() - 0.5) * 0.3); }
        const [fx, fz] = loc(0, 1.0, x, z, ry0 + Math.PI); const f = fitR('planter_box_01', { w: 0.6 }); if (f) place(f, fx, fz, ry0);
      },
      avenue(x, z) {
        const ry = Math.atan2(-x, -z), vs = variants(['namaqualand_boulder_03', 'namaqualand_boulder_04']); if (!vs.length) return;
        for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) { const [px, pz] = loc(sx * 1.9, -4.5 + i * 3, x, z, ry), v = pick(r, vs), k = (1.0 + r() * 0.4) / Math.max(v.t.size.x, v.t.size.z);
          put(v.t, px, pz, k, r() * 6.28); cols.push({ x: px, z: pz, r: 0.55 }); }
        const sv = variants(['gothic_statue']); if (sv.length) { const [px, pz] = loc(0, -6.2, x, z, ry), v = sv[0], k = 2.2 / v.t.size.y; put(v.t, px, pz, k, ry); cols.push({ x: px, z: pz, r: 0.6 }); }
      },
      shrine(x, z) {
        const ry = Math.atan2(-x, -z), sv = variants(['gothic_statue']); if (sv.length) { const v = sv[0], k = 1.9 / v.t.size.y; put(v.t, x, z, k, ry); cols.push({ x, z, r: 0.55 }); }
        for (const sx of [-1, 1]) { const [cx, cz] = loc(sx * 0.8, 0.5, x, z, ry), g = fitR('brass_candleholders', { h: 0.55 }); if (g) { place(g, cx, cz, ry); flame(cx, H(cx, cz) + 0.58, cz, 0.9); } }
        const [px, pz] = loc(0, 0.9, x, z, ry); place(fitR('carved_wooden_plate', { w: 0.34 }), px, pz, ry, 0.01);
        const gb = fitR('brass_goblets', { w: 0.3 }); if (gb) place(gb, px, pz, ry, 0.03);
        const pl = new THREE.PointLight('#ffb060', 1.1, 6, 2); pl.position.set(x + Math.sin(ry) * 0.6, H(x, z) + 1.0, z + Math.cos(ry) * 0.6); sc.add(pl); lights.push([pl, 1.1]);
      }
    };
    for (const k of P.sp) { const sp = spotFor(SP[k].rad); if (!sp) continue; P.spPos = P.spPos || []; P.spPos.push([k, sp[0], sp[1]]); try { B[k](sp[0], sp[1]); } catch (e) { console.warn('wlayout', k, e); } mark(sp[0], sp[1], SP[k].rad); }
    return { wx: weather(P.wx, sc), lights };
  }

  // ---------- 4) 天气粒子（跟着镜头走的一个盒子） ----------
  let dotTex = null;
  function dot() { if (dotTex) return dotTex; const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); dotTex = new THREE.CanvasTexture(c); return dotTex; }
  const WXC = { snow: [1100, '#ffffff', 0.09, 1.1, 0.9, false], fireflies: [120, '#c8ff70', 0.12, -0.05, 0.25, true], embers: [260, '#ff8a3a', 0.07, -0.9, 0.5, true], ash: [650, '#a09a94', 0.06, 0.55, 0.6, false],
    leaves: [200, '#b06a2a', 0.12, 0.9, 1.4, false], pollen: [260, '#fff2b0', 0.05, 0.12, 0.5, true], dust: [420, '#c8a878', 0.08, 0.1, 2.4, false] };
  function weather(kind, sc) {
    if (!kind) return null;
    const BX = 18, BY = 9, r = Math.random;
    if (kind === 'rain') {
      const N = 900, pos = new Float32Array(N * 6), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      for (let i = 0; i < N; i++) { const x = (r() - 0.5) * 2 * BX, y = r() * BY * 2 - 3, z = (r() - 0.5) * 2 * BX; pos.set([x, y, z, x + 0.03, y + 0.45, z], i * 6); }
      const ls = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#aabbd0', transparent: true, opacity: 0.32, depthWrite: false })); ls.frustumCulled = false; sc.add(ls);
      return (dt, cam) => { for (let i = 0; i < N; i++) { const o = i * 6; let y = pos[o + 1] - 16 * dt, x = pos[o], z = pos[o + 2];
        if (y < cam.y - 4) y += BY * 2; if (x - cam.x > BX) x -= 2 * BX; else if (cam.x - x > BX) x += 2 * BX; if (z - cam.z > BX) z -= 2 * BX; else if (cam.z - z > BX) z += 2 * BX;
        pos[o] = x; pos[o + 1] = y; pos[o + 2] = z; pos[o + 3] = x + 0.03; pos[o + 4] = y + 0.45; pos[o + 5] = z; } geo.attributes.position.needsUpdate = true; };
    }
    const c = WXC[kind]; if (!c) return null; const [N, col, size, fall, sway, add] = c;
    const pos = new Float32Array(N * 3), ph = new Float32Array(N), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    for (let i = 0; i < N; i++) { pos[i * 3] = (r() - 0.5) * 2 * BX; pos[i * 3 + 1] = r() * BY * 2 - 3; pos[i * 3 + 2] = (r() - 0.5) * 2 * BX; ph[i] = r() * 100; }
    const mat = new THREE.PointsMaterial({ color: col, size, map: dot(), transparent: true, depthWrite: false, opacity: add ? 0.95 : 0.85, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, sizeAttenuation: true, fog: !add });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; sc.add(pts);
    return (dt, cam, now) => { const s1 = Math.sin(now * 0.7), c1 = Math.cos(now * 0.6); // 每帧只算两个三角函数，粒子各自的相位用预存的 ph
      for (let i = 0; i < N; i++) { const o = i * 3, p = ph[i], q = p % 1; let x = pos[o] + (s1 * (q - 0.5) * 2 + Math.sin(p)) * sway * dt, y = pos[o + 1] - fall * dt * (0.7 + q * 0.6), z = pos[o + 2] + (c1 * (0.5 - q) * 2 + Math.cos(p)) * sway * dt;
      if (kind === 'fireflies') y += Math.sin(now * 1.3 + p) * 0.3 * dt;
      if (y < cam.y - 3) y += BY * 2; else if (y > cam.y + BY * 2 - 3) y -= BY * 2;
      if (x - cam.x > BX) x -= 2 * BX; else if (cam.x - x > BX) x += 2 * BX; if (z - cam.z > BX) z -= 2 * BX; else if (cam.z - z > BX) z += 2 * BX;
      pos[o] = x; pos[o + 1] = y; pos[o + 2] = z; }
      if (kind === 'fireflies') mat.opacity = 0.6 + Math.sin(now * 2.1) * 0.35; geo.attributes.position.needsUpdate = true; };
  }
  return { plan, paths, dH, keep, densK, dress, on };
})();
