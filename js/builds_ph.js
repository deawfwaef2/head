// 第十三轮：建筑换装——用 Poly Haven CC0 真实模型替换程序化外观（玩法相关的插槽高度 / 碰撞 / userData 保持不变）
// 缺资产时保留 builds.js 里的旧 make()
(() => {
  const C = BuildCat.C, A = window.Assets; if (!A) return;
  const F = (n, o) => A.fit(n, o);
  const need = (...ns) => ns.every(n => A.has(n));
  function over(type, names, make, extra) {
    const d = C[type]; if (!d) return; const old = d.make;
    d.make = function () { if (!need(...names)) return old.call(this); const g = new THREE.Group(); make(g, d); return g; };
    if (extra) Object.assign(d, extra);
  }
  const add = (g, o) => { if (o) g.add(o); return o; };
  const fl = (g, x, y, z, s, c) => add(g, BuildCat.flame(x, y, z, s, c));
  // 每个网格顶端中心（放火焰用）
  function tops(obj) { obj.updateMatrixWorld(true); const out = []; obj.traverse(o => { if (o.isMesh) { const b = new THREE.Box3().setFromObject(o); out.push(new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2)); } }); return out; }

  // 石板祭桌 → 铺桌布的长餐桌（桌面高度 TABLE.h 不变）
  over('table', ['dining_table'], (g) => {
    const T = BuildCat.TABLE; add(g, F('dining_table', { node: 'dining_table', w: T.w, h: T.h, d: T.d }));
    const edge = BuildCat.box(T.w + 0.01, 0.015, T.d + 0.01, new THREE.MeshBasicMaterial({ color: '#ff4a3a', transparent: true, opacity: 0.0 }), 0, T.h - 0.1, 0); g.add(edge); g.userData.edge = edge;
  });
  // 战利品宝箱 → 真宝箱 + 黄铜酒杯
  over('chest', ['treasure_chest'], (g) => { add(g, F('treasure_chest', { w: 0.78 })); add(g, F('brass_goblets', { h: 0.16, x: 0.52, z: 0.12 })); });
  // 蜡烛祭坛 → 哥特五斗柜 + 黄铜烛台（烛台顶端点火）
  over('candles', ['GothicCommode_01', 'brass_candleholders'], (g) => {
    add(g, F('GothicCommode_01', { w: 0.9 })); const top = 0.9 * 1.21 / 1.2;
    const ch = add(g, F('brass_candleholders', { w: 0.8, y: top, z: 0.02 }));
    g.updateMatrixWorld(true); for (const p of tops(ch)) { const q = g.worldToLocal(p.clone()); fl(g, q.x, q.y - 0.01, q.z, 0.55, '#ffc86a'); }
  }, { cols: () => [[-0.45, 0, -0.22, 0.45, 0.91, 0.22]] });
  // 武器架 → 展示木架 + 斜靠的长剑 / 战锤 / 鸢盾
  over('rack', ['katana_stand_01', 'antique_estoc', 'antique_katana_01', 'ornate_war_hammer', 'kite_shield'], (g) => {
    const st = add(g, F('katana_stand_01', { w: 1.35 })); const h = st.userData.size.y;
    add(g, F('antique_estoc', { h: 1.3, y: h * 0.78, rz: Math.PI / 2, x: 0.65 }));
    add(g, F('antique_katana_01', { h: 1.0, y: h * 0.5, rz: Math.PI / 2, x: 0.5 }));
    add(g, F('ornate_war_hammer', { h: 0.8, x: -0.35, z: 0.24, rz: -0.14 }));
    add(g, F('kite_shield', { h: 0.9, x: 0.3, z: 0.24, rx: -0.14 }));
  });
  // 铁火盆 → 小石砌火坑 + 火焰
  over('brazier', ['stone_fire_pit'], (g) => { add(g, F('stone_fire_pit', { w: 0.62 })); fl(g, 0, 0.08, 0, 2.2); fl(g, 0.06, 0.08, 0.04, 1.4); });
  // 墙边火把 → 巨石上的木提灯
  over('torch', ['wooden_lantern_01', 'namaqualand_boulder_05'], (g) => {
    const b = add(g, F('namaqualand_boulder_05', { w: 0.42 })); const bh = b.userData.size.y * 0.85;
    add(g, F('wooden_lantern_01', { h: 0.62, y: bh })); fl(g, 0, bh + 0.12, 0, 0.75);
  });
  // 悬赏榜 → 立式黑板 + 钉着的悬赏令
  over('bounty', ['standing_chalkboard_01'], (g) => {
    add(g, F('standing_chalkboard_01', { h: 1.75 }));
    const pm = BuildCat.std('#e8d8b0', { roughness: 1, side: THREE.DoubleSide });
    const tilt = Math.atan2(0.38 * 1.75 / 1.51, 1.75);
    for (let i = 0; i < 3; i++) { const y = 1.12 + (i % 2 ? -0.04 : 0.04); const z = 0.38 * 1.75 / 1.51 * (1 - y / 1.75) + 0.02; const p = BuildCat.box(0.24, 0.32, 0.004, pm, -0.26 + i * 0.26, y, z); p.rotation.set(tilt, 0, (i - 1) * 0.06); g.add(p); }
  });
  // 化妆台 → 哥特五斗柜 + 华丽镜子
  over('dresser', ['GothicCommode_01', 'ornate_mirror_01'], (g) => {
    add(g, F('GothicCommode_01', { w: 1.0 })); const top = 1.0 * 1.21 / 1.2;
    add(g, F('ornate_mirror_01', { h: 0.62, y: top, z: -0.16 }));
    add(g, F('brass_goblets', { h: 0.14, x: 0.3, y: top, z: 0.06 }));
  }, { cols: () => [[-0.5, 0, -0.25, 0.5, 1.0, 0.25]] });
  // 干草窝 → 哥特大床（可以把首级放在床上）
  over('nest', ['GothicBed_01'], (g) => { add(g, F('GothicBed_01', { w: 1.75, ry: Math.PI / 2 })); }, { n: '哥特大床', cols: () => [[-0.85, 0, -0.62, 0.85, 0.5, 0.62]], surface: 0.5 });
  // 白骨王座 → 雕花太师椅（放大）
  over('throne', ['chinese_armchair'], (g) => { add(g, F('chinese_armchair', { h: 1.85 })); });
})();
