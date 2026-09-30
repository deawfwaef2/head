// 第十四轮 · 第 5 步：出猎世界 = 地点图（图论）
// 每趟出猎随机生成一张图：节点 = 地点（多数是不大的小场景，偶尔中型/大型），边 = 门。每个地点有随机名字/风格/大小，2~5 扇门通往别处。
// 地区（Lore.LOCS）决定风格池与难度；入口节点有“回洞的门”；最深处是地区霸主（未击败时）。
// 场景只用网上找来的 CC0 资产（Poly Haven 天空 HDRI / 地面 PBR / 树石植被 / 城墙雕像），布局与地形起伏是程序化的。
// 资产在 big/world/*.js，按风格懒加载（动态 <script>，file:// 可用）。
// 玩法：自由走动搜索；宝箱；猎物（暂以“魂光”表现，会看见你、说话、逃跑或反击，第 4 步换成真实身体）；霸主实时战斗（手势战斗 + 决斗公式）。
window.Worlds = (() => {
  const V3 = THREE.Vector3;
  const RC = ['#b8b8b8', '#6ad06a', '#5aa0ff', '#c070ff', '#ffb030'], RN = ['凡魂', '灵魂', '英魂', '圣魂', '神魂'];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const mulberry = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  let G = null, W = null, provReg = false;
  const EYE = 1.45; // 第十四轮 14d：食人魔身高与女角色一致（原 1.95 太高）
  const LITE = /[?&]wlite=1/.test(location.search); // 调试：不散布植被（2GB 沙箱里测流程用）

  // ================= 风格 =================
  // props: [变体列表, 密度(每100㎡), 最小缩放, 最大缩放, 类型]  类型: tree/rock/plant/grass/wall/prop
  // 变体名以 #* 结尾 = 该模型的每个子节点各算一个变体
  const STYLES = {
    meadow: { n: '草甸', sky: 'evening_meadow', ground: 'leafy_grass', gs: 0.35, hill: 7, fog: 0.016, sun: 2.6,
      props: [[['island_tree_01', 'island_tree_02'], 0.22, 0.75, 1.1, 'tree'], [['tree_small_02'], 0.25, 0.8, 1.2, 'tree'], [['shrub_01', 'shrub_02#*', 'shrub_04'], 1.1, 0.7, 1.3, 'plant'],
        [['grass_medium_01#*', 'grass_medium_02#*'], 110, 1.6, 2.8, 'grass'], [['dandelion_01'], 1.2, 0.8, 1.2, 'grass'], [['rock_moss_set_01#*'], 0.25, 0.8, 1.4, 'rock'], [['tree_stump_01'], 0.1, 0.9, 1.2, 'rock']],
      edge: [['island_tree_01', 'island_tree_02', 'tree_small_02', 'namaqualand_boulder_03'], 5, 0.9, 1.4], marks: ['campfire', 'stones', 'chest', 'barrels'] },
    forest: { n: '深林', sky: 'misty_pines', ground: 'forest_leaves_02', gs: 0.35, hill: 9, fog: 0.03, sun: 2.0,
      props: [[['island_tree_01', 'island_tree_02', 'tree_small_02'], 0.7, 0.8, 1.25, 'tree'], [['dead_tree_trunk_02'], 0.12, 0.9, 1.3, 'rock'], [['fern_02#*'], 10, 0.8, 1.6, 'grass'], [['tree_stump_01', 'tree_stump_02'], 0.25, 0.8, 1.3, 'rock'],
        [['dead_tree_trunk'], 0.1, 0.8, 1.1, 'rock'], [['root_cluster_01', 'root_cluster_02'], 0.2, 0.8, 1.3, 'plant'], [['moss_01'], 1.0, 1, 2, 'grass'], [['rock_moss_set_01#*'], 0.25, 0.8, 1.4, 'rock'], [['shrub_02#*'], 0.6, 0.8, 1.3, 'plant']],
      edge: [['island_tree_01', 'island_tree_02', 'tree_small_02', 'dead_tree_trunk', 'rock_moss_set_01#*'], 3.4, 0.9, 1.4], marks: ['campfire', 'chest', 'stones', 'deadfall'] },
    wilds: { n: '荒原', sky: 'drakensberg_solitary_mountain', ground: 'dry_ground_rocks', gs: 0.3, hill: 11, fog: 0.012, sun: 3.0,
      props: [[['quiver_tree_01'], 0.2, 0.8, 1.3, 'tree'], [['dead_quiver_trunk'], 0.12, 0.8, 1.2, 'rock'], [['namaqualand_boulder_03', 'namaqualand_boulder_04'], 0.3, 0.5, 1.2, 'rock'], [['namaqualand_rocks_01#*'], 0.25, 0.8, 1.3, 'rock'],
        [['wild_rooibos_bush'], 1.4, 0.7, 1.3, 'plant'], [['dry_branches_medium_01'], 0.5, 0.8, 1.3, 'plant'], [['grass_medium_02#*'], 22, 1.3, 2.2, 'grass']],
      edge: [['namaqualand_cliff_02', 'namaqualand_boulder_03', 'namaqualand_boulder_04'], 7, 1.0, 1.8], marks: ['campfire', 'stones', 'chest', 'totem'] },
    ruins: { n: '废墟', sky: 'roofless_ruins', ground: 'mossy_cobblestone', gs: 0.4, hill: 6, fog: 0.02, sun: 2.4,
      props: [[['modular_fort_01#*'], 0.1, 0.9, 1.0, 'wall'], [['gothic_statue'], 0.04, 0.9, 1.1, 'prop'], [['dead_tree_trunk_02'], 0.1, 0.8, 1.2, 'rock'], [['shrub_01', 'shrub_04'], 0.7, 0.7, 1.2, 'plant'],
        [['grass_medium_01#*'], 30, 1.3, 2.2, 'grass'], [['moss_01'], 1.0, 1, 2, 'grass'], [['rock_07', 'rock_09'], 0.2, 0.6, 1.3, 'rock']],
      edge: [['modular_fort_01#*', 'tree_small_02', 'dead_tree_trunk_02'], 6, 1.0, 1.1], marks: ['statue', 'chest', 'campfire', 'stones'] },
    swamp: { n: '沼泽', sky: 'muddy_autumn_forest', ground: 'brown_mud_leaves_01', gs: 0.35, hill: 5, fog: 0.045, sun: 1.4,
      props: [[['dead_tree_trunk', 'dead_tree_trunk_02'], 0.3, 0.8, 1.3, 'rock'], [['root_cluster_01', 'root_cluster_02'], 0.5, 0.8, 1.5, 'plant'], [['nettle_plant'], 1.4, 0.8, 1.4, 'plant'],
        [['fern_02#*'], 3, 0.8, 1.4, 'grass'], [['moss_01'], 1.6, 1, 2.2, 'grass'], [['grass_medium_02#*'], 30, 1.4, 2.4, 'grass'], [['tree_stump_01', 'tree_stump_02'], 0.3, 0.8, 1.2, 'rock'], [['island_tree_02', 'tree_small_02'], 0.1, 0.8, 1.0, 'tree']],
      edge: [['dead_tree_trunk', 'dead_tree_trunk_02', 'island_tree_02', 'tree_small_02'], 4, 1.0, 1.5], marks: ['campfire', 'chest', 'deadfall', 'stones'] },
    fortress: { n: '要塞', sky: 'teutonic_castle_moat', ground: 'cobblestone_floor_04', gs: 0.45, hill: 6, fog: 0.018, sun: 2.4,
      props: [[['modular_fort_01#*'], 0.18, 0.95, 1.0, 'wall'], [['wooden_barrels_01'], 0.1, 0.9, 1.1, 'prop'], [['wooden_military_crate'], 0.2, 0.9, 1.2, 'prop'], [['Barrel_02'], 0.15, 0.9, 1.1, 'prop'],
        [['grass_medium_02#*'], 3, 0.7, 1.1, 'grass'], [['rock_07'], 0.1, 0.5, 1.0, 'rock']],
      edge: [['modular_fort_01#*'], 6, 1.0, 1.0], marks: ['campfire', 'chest', 'barrels', 'statue'] },
    capital: { n: '王城', sky: 'cobblestone_street_night', ground: 'patterned_cobblestone', gs: 0.45, hill: 5, fog: 0.022, sun: 0.5, night: 1,
      props: [[['street_lamp_01'], 0.12, 1, 1, 'lamp'], [['gothic_statue'], 0.05, 0.9, 1.1, 'prop'], [['wooden_barrels_01'], 0.08, 0.9, 1.1, 'prop'], [['wooden_military_crate', 'Barrel_02'], 0.18, 0.9, 1.2, 'prop'],
        [['modular_fort_01#*'], 0.06, 1, 1, 'wall'], [['grass_medium_02#*'], 1.5, 0.6, 1.0, 'grass']],
      edge: [['modular_fort_01#*'], 5, 1.0, 1.0], marks: ['horse', 'chest', 'statue', 'campfire'] },
    abyss: { n: '深渊', sky: 'moonless_golf', ground: 'burned_ground_01', gs: 0.35, hill: 12, fog: 0.035, sun: 0.35, night: 1, tint: '#6a4a4a',
      props: [[['moon_rock_01', 'moon_rock_03', 'moon_rock_05'], 0.7, 0.6, 2.2, 'rock'], [['dead_quiver_trunk'], 0.2, 0.8, 1.3, 'rock'], [['dry_branches_medium_01'], 0.4, 0.8, 1.3, 'plant'], [['brazier'], 0.05, 1, 1, 'fire']],
      edge: [['namaqualand_cliff_02', 'moon_rock_01', 'moon_rock_05', 'coast_land_rocks_03'], 6, 1.2, 2.2], marks: ['campfire', 'chest', 'stones', 'totem'] },
    peak: { n: '雪峰', sky: 'snowy_hillside', ground: 'snow_02', gs: 0.3, hill: 14, fog: 0.022, sun: 2.8,
      props: [[['dead_tree_trunk', 'dead_tree_trunk_02'], 0.15, 0.8, 1.2, 'rock'], [['rock_07', 'rock_09'], 0.4, 0.6, 1.8, 'rock'], [['coast_land_rocks_03'], 0.06, 0.4, 0.8, 'rock'], [['dead_tree_trunk'], 0.08, 0.8, 1.2, 'rock']],
      edge: [['coast_land_rocks_03', 'rock_09', 'rock_07', 'namaqualand_boulder_04'], 5, 0.9, 1.8], marks: ['campfire', 'chest', 'stones', 'deadfall'] }
  };
  const LO = { island_tree_01: 1, island_tree_02: 1, tree_small_02: 1 }; // 边界圈用的轻量树（tools/foliage.py --leaf 4500）
  const REGION = { village: ['meadow', 'meadow', 'forest'], forest: ['forest', 'forest', 'meadow', 'swamp'], wilds: ['wilds', 'wilds', 'meadow'], abbey: ['ruins', 'ruins', 'forest'],
    swamp: ['swamp', 'swamp', 'forest'], fortress: ['fortress', 'fortress', 'ruins', 'wilds'], capital: ['capital', 'capital', 'fortress'], abyss: ['abyss', 'abyss', 'ruins'], peak: ['peak', 'peak', 'abyss'] };
  const NAMES = {
    meadow: [['风铃', '野蔷薇', '牧羊人', '金穗', '蜂鸣', '白石', '晨露', '老磨坊', '落日', '苜蓿', '稻草人'], ['草甸', '坡地', '野径', '牧场', '花田', '谷地', '篱道']],
    forest: [['低语', '苔藓', '鸦巢', '雾松', '断枝', '幽影', '古根', '狼嚎', '冷杉', '萤火', '藤冠'], ['林地', '空地', '松岗', '林间', '小径', '密林', '树冢']],
    wilds: [['裂牙', '焦骨', '风蚀', '秃鹫', '赤沙', '狼祖', '碎石', '枯角', '战鼓'], ['荒原', '石滩', '隘口', '高地', '戈壁', '岩丘']],
    ruins: [['圣骨', '残钟', '无名', '灰烬', '断碑', '白银', '祷告', '誓约', '苦修'], ['回廊', '废墟', '庭院', '墓园', '残垣', '旧礼拜堂']],
    swamp: [['腐叶', '泣柳', '黑水', '蛙鸣', '瘴雾', '鬼火', '沉木', '蚊群', '巫婆'], ['沼泽', '泥潭', '浅滩', '水洼', '洼地', '苇荡']],
    fortress: [['铁壁', '血旗', '断矛', '望楼', '石闸', '哨兵', '箭塔', '军械', '烽火'], ['要塞', '城墙', '营地', '校场', '兵营', '外堡']],
    capital: [['王冠', '玫瑰', '金币', '钟楼', '银灯', '贵妇', '绞架', '喷泉', '月桂'], ['大街', '广场', '小巷', '市集', '宅邸区', '后巷']],
    abyss: [['深渊', '无光', '骨火', '哀嚎', '焚尽', '虚空', '魔角', '黑曜', '硫磺'], ['裂谷', '坑道', '焦土', '祭坑', '边缘', '血池']],
    peak: [['龙骨', '霜牙', '白魇', '冰泪', '鹰巢', '寒鸦', '雪崩', '朝圣', '风哭'], ['雪原', '山脊', '冰川', '山口', '峭壁', '圣坛']]
  };
  const SIZES = { s: { n: '小', R: [13, 18] }, m: { n: '中', R: [22, 28] }, l: { n: '广阔', R: [34, 42] } };
  // ================= 第十八轮：地点布局原型（用户：地点生成太无聊）=================
  // 每个节点按风格挑一个原型：地形改造（湖/高台/峡谷）+ 中心布置 + 敌人阵型落点。只用现成的 Poly Haven CC0 模型（程序化的是布局，不是模型）。
  const LAYOUTS = {
    camp: { n: '营火营地', st: ['meadow', 'forest', 'wilds', 'swamp', 'fortress', 'peak'], need: ['wooden_stool_01', 'painted_wooden_bench', 'wooden_bucket_01', 'wicker_basket_01', 'wooden_crate_02', 'dead_tree_trunk', 'wooden_barrels_01', 'wooden_military_crate'] },
    clearing: { n: '林间空地', st: ['forest', 'meadow', 'swamp'], need: ['flower_gazania', 'flower_empodium', 'shrub_sorrel_01', 'tree_stump_01', 'island_tree_01', 'island_tree_02', 'tree_small_02'] },
    lake: { n: '湖畔', st: ['meadow', 'forest', 'swamp', 'peak', 'wilds'], need: ['modular_wooden_pier', 'grass_medium_02', 'wooden_bucket_01', 'rock_moss_set_01', 'namaqualand_boulder_03'] },
    court: { n: '残垣庭院', st: ['ruins', 'fortress', 'capital', 'abyss'], need: ['modular_fort_01', 'gothic_statue', 'rock_07', 'rock_09'] },
    henge: { n: '石阵高台', st: ['wilds', 'peak', 'meadow', 'abyss', 'ruins'], need: ['namaqualand_boulder_03', 'namaqualand_boulder_04', 'dead_quiver_trunk', 'rock_face_02'] },
    ravine: { n: '峡谷小径', st: ['wilds', 'peak', 'abyss', 'fortress', 'forest'], need: ['rock_face_01', 'rock_face_02', 'namaqualand_boulder_04'] },
    market: { n: '废弃集市', st: ['capital', 'meadow', 'fortress'], need: ['wooden_picnic_table', 'painted_wooden_bench', 'wooden_barrels_01', 'wooden_crate_02', 'wicker_basket_01', 'wooden_bucket_01', 'street_lamp_01'] }
  };
  if (window.WSites) WSites.register(LAYOUTS); // R41：特殊地点（人群聚集）注册成 site_* 布局（st 为空 = 不参与随机，只由 WSites.pick 指定）
  function layOf(node) {
    if (window.__forceLay && !node.home) { if (/^site_/.test(window.__forceLay)) node.site = window.__forceLay.slice(5); return (node.lay = window.__forceLay); }
    if (node.lay) return node.lay; if (node.home || (window.Mods && Mods.on('worldlay') === false)) return (node.lay = 'plain');
    if (window.WSites) { const sk = WSites.pick(node); if (sk) return (node.lay = 'site_' + sk); }
    const r = mulberry((node.seed ^ 0x2c1b3c6d) >>> 0), ok = Object.keys(LAYOUTS).filter(k => LAYOUTS[k].st.includes(node.style));
    return (node.lay = !ok.length || r() < 0.12 ? 'plain' : ok[Math.floor(r() * ok.length)]);
  }
  const segD = (x, z, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, t = clamp(((x - ax) * dx + (z - az) * dz) / Math.max(1e-6, dx * dx + dz * dz), 0, 1); return Math.hypot(x - ax - dx * t, z - az - dz * t); };
  // 阶段一：地形计划（在算高度之前）
  function layPlan(node, R, doorList) {
    const k = layOf(node), r = mulberry((node.seed ^ 0x51ed27) >>> 0), P = { k, r, R };
    // 离门最远的方向（大空地放湖/高台）
    const far = () => { let best = 0, bd = -1; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; const d = Math.min(...doorList.map(dd => Math.abs(Math.atan2(Math.sin(a - dd.a), Math.cos(a - dd.a))))); if (d > bd) { bd = d; best = a; } } return best + (r() - 0.5) * 0.3; };
    if (k === 'lake') { const a = far(); P.Lr = clamp(R * 0.34, 6, 12); const d = Math.min(R * 0.48, R - P.Lr * 0.6); P.cx = Math.cos(a) * d; P.cz = Math.sin(a) * d;
      P.dh = (x, z) => -2.2 * (1 - sstep(P.Lr * 0.5, P.Lr * 1.12, Math.hypot(x - P.cx, z - P.cz))); }
    else if (k === 'henge') { const a = far(); const d = R * 0.22; P.cx = Math.cos(a) * d; P.cz = Math.sin(a) * d; P.top = clamp(R * 0.16, 5, 8); P.hh = clamp(R * 0.09, 2.4, 4);
      P.dh = (x, z) => P.hh * (1 - sstep(P.top, P.top + 6, Math.hypot(x - P.cx, z - P.cz))); }
    else if (k === 'ravine') { P.hx = (r() - 0.5) * R * 0.2; P.hz = (r() - 0.5) * R * 0.2; P.segs = [];
      for (const d of doorList) { const mx = (d.x * 0.93 + P.hx) / 2, mz = (d.z * 0.93 + P.hz) / 2, px = -(d.z - P.hz), pz = d.x - P.hx, pl = Math.hypot(px, pz) || 1, w = (r() - 0.5) * R * 0.35;
        const m2x = mx + px / pl * w, m2z = mz + pz / pl * w; P.segs.push([d.x * 0.93, d.z * 0.93, m2x, m2z], [m2x, m2z, P.hx, P.hz]); }
      P.dist = (x, z) => { let m = Math.hypot(x - P.hx, z - P.hz) - 3.5; for (const s of P.segs) m = Math.min(m, segD(x, z, s[0], s[1], s[2], s[3])); return m; };
      P.dh = (x, z) => 5.5 * sstep(3.2, 8, P.dist(x, z)) * (1 - sstep(R - 1, R + 4, Math.hypot(x, z)) * 0.5);
      P.skip = (kind, x, z) => (kind === 'tree' || kind === 'rock' || kind === 'wall' || kind === 'prop') && P.dist(x, z) < 3.4; }
    else if (k === 'court') { const a = r() * 6.28, d = R * 0.12; P.cx = Math.cos(a) * d; P.cz = Math.sin(a) * d; P.hs = clamp(R * 0.3, 5.5, 9.5); P.ry = (r() - 0.5) * 0.6;
      P.skip = (kind, x, z) => kind !== 'grass' && kind !== 'plant' && Math.abs(Math.hypot(x - P.cx, z - P.cz) - P.hs) < 2.2; }
    else if (k === 'clearing') { P.rc = R * (0.52 + r() * 0.12);
      P.skip = (kind, x, z) => (kind === 'tree' || kind === 'rock') && Math.hypot(x, z) < P.rc * 0.92; }
    else if (k === 'camp' || k === 'market') { const a = r() * 6.28, d = R * 0.15; P.cx = Math.cos(a) * d; P.cz = Math.sin(a) * d;
      P.skip = (kind, x, z) => kind !== 'grass' && Math.hypot(x - P.cx, z - P.cz) < (k === 'camp' ? 6.5 : 8); }
    else if (/^site_/.test(k) && window.WSites) WSites.plan(P, node, doorList, far);
    return P;
  }
  // 阶段二：摆放（在算好高度、建好网格之后）
  function layPlace(P, C) {
    const { sc, H, put, variants, mark, cols, doorList, spots, st } = C, r = P.r, R = P.R, k = P.k;
    const one = (names) => { const vs = variants(names); return vs.length ? vs[Math.floor(r() * vs.length)] : null; };
    const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z); // 让模型 +Z 朝向目标
    if (/^site_/.test(k) && window.WSites) { try { WSites.place(P, Object.assign({ r, face }, C)); } catch (e) { console.warn('site', k, e); } return; }
    const fire = (x, z, w, light) => { const y = H(x, z); if (window.Assets && Assets.has('stone_fire_pit')) { const f = Assets.fit('stone_fire_pit', { w, x, y, z }); if (f) sc.add(f); } const fl = window.Assets && Assets.flame(x, y + 0.15, z, 5); if (fl) sc.add(fl); if (light) { const pl = new THREE.PointLight('#ff9a50', 2.2, 12, 2); pl.position.set(x, y + 0.9, z); sc.add(pl); sc.userData.fire = pl; } cols.push({ x, z, r: w * 0.6 }); };
    if (k === 'camp') {
      fire(P.cx, P.cz, 1.3, true); mark(P.cx, P.cz, 6.5);
      const n = 5 + Math.floor(r() * 3), a0 = r() * 6.28;
      for (let i = 0; i < n; i++) { const a = a0 + i / n * Math.PI * 2 + (r() - 0.5) * 0.3, d = 2.8, x = P.cx + Math.cos(a) * d, z = P.cz + Math.sin(a) * d;
        const v = one(i % 3 === 0 ? ['dead_tree_trunk'] : i % 3 === 1 ? ['painted_wooden_bench'] : ['wooden_stool_01']);
        if (v) { const log = v.n === 'dead_tree_trunk', s = log ? 1.6 / Math.max(v.t.size.x, v.t.size.z) : 1; put(v.t, x, z, s, face(x, z, P.cx, P.cz) + (log ? Math.PI / 2 : 0)); cols.push({ x, z, r: log ? 0.45 : 0.35 }); }
        spots.push({ x: P.cx + Math.cos(a + Math.PI / n) * 2.2, z: P.cz + Math.sin(a + Math.PI / n) * 2.2 }); }
      const sa = a0 + Math.PI / n; // 物资堆
      let last = null; for (let i = 0; i < 9; i++) { const a = sa + (r() - 0.5) * 0.9, d = 4.6 + r() * 1.2; let x = P.cx + Math.cos(a) * d, z = P.cz + Math.sin(a) * d, y0 = null; const v = one(['wooden_crate_02', 'wooden_barrels_01', 'wooden_military_crate', 'wooden_bucket_01', 'wicker_basket_01']); if (!v) break;
        if (last && r() < 0.35 && v.t.size.y < 0.6) { x = last.x; z = last.z; y0 = H(x, z) + last.h; } put(v.t, x, z, 1, r() * 6.28, y0); if (y0 == null && Math.max(v.t.size.x, v.t.size.z) > 0.45) { cols.push({ x, z, r: 0.45 }); last = { x, z, h: v.t.size.y }; } }
      // 外围：卧倒的原木围成半圈（营地的边界感）
      const lg = variants(['dead_tree_trunk', 'dead_tree_trunk_02']); if (lg.length) for (let i = 0; i < 7; i++) { const a = sa + Math.PI + (i - 3) * 0.42, d = 6.2, x = P.cx + Math.cos(a) * d, z = P.cz + Math.sin(a) * d, v = lg[i % lg.length], s = 2.6 / Math.max(v.t.size.x, v.t.size.z); put(v.t, x, z, s, face(x, z, P.cx, P.cz) + Math.PI / 2); cols.push({ x, z, r: 0.6 }); }
      P.boss = { x: P.cx + 3.4, z: P.cz };
    } else if (k === 'clearing') {
      const n = Math.round(Math.PI * 2 * P.rc / 2.3);
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + (r() - 0.5) * 0.12; if (doorList.some(d => Math.abs(Math.atan2(Math.sin(a - d.a), Math.cos(a - d.a))) < 0.32)) continue;
        const rr = P.rc + (r() - 0.3) * 3, x = Math.cos(a) * rr, z = Math.sin(a) * rr, v = one(['island_tree_01', 'island_tree_02', 'tree_small_02']); if (!v) break; const s = 0.9 + r() * 0.5; put(v.t, x, z, s, r() * 6.28); cols.push({ x, z, r: 0.35 * s }); mark(x, z, 1); }
      for (let p = 0; p < 7; p++) { const a = r() * 6.28, d = P.rc * (0.2 + r() * 0.6), px = Math.cos(a) * d, pz = Math.sin(a) * d; const vs = variants(['flower_gazania#*', 'flower_empodium#*', 'shrub_sorrel_01']); if (!vs.length) break;
        for (let i = 0; i < 10; i++) { const v = vs[Math.floor(r() * vs.length)]; put(v.t, px + (r() - 0.5) * 3, pz + (r() - 0.5) * 3, 1.1 + r() * 0.6, r() * 6.28); } }
      const v = one(['tree_stump_01']); if (v) { const s = 1.8; put(v.t, 0, 0, s, r() * 6.28); cols.push({ x: 0, z: 0, r: 0.6 }); mark(0, 0, 1.5); }
      for (let i = 0; i < 4; i++) { const a = r() * 6.28, d = P.rc * (0.3 + r() * 0.4); spots.push({ x: Math.cos(a) * d, z: Math.sin(a) * d }); }
    } else if (k === 'lake') {
      let wy = Infinity; for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; wy = Math.min(wy, H(P.cx + Math.cos(a) * P.Lr * 0.98, P.cz + Math.sin(a) * P.Lr * 0.98)); } wy -= 0.12;
      const wm = new THREE.MeshStandardMaterial({ color: st.night ? '#081418' : '#123038', roughness: 0.1, metalness: 0.0, transparent: true, opacity: 0.93, envMap: C.sky ? C.sky.env : null, envMapIntensity: 0.55 });
      const water = new THREE.Mesh(new THREE.CircleGeometry(P.Lr * 1.2, 48).rotateX(-Math.PI / 2), wm); water.position.set(P.cx, wy, P.cz); water.receiveShadow = true; sc.add(water); sc.userData.water = water;
      cols.push({ x: P.cx, z: P.cz, r: P.Lr * 0.78 }); mark(P.cx, P.cz, P.Lr * 1.05);
      // 码头：从岸边伸向湖心
      const pa = Math.atan2(-P.cz, -P.cx) + (r() - 0.5) * 0.8, sx = P.cx + Math.cos(pa) * P.Lr * 0.95, sz = P.cz + Math.sin(pa) * P.Lr * 0.95, v = one(['modular_wooden_pier']);
      if (v) { const s = Math.min(0.75, P.Lr * 1.05 / v.t.size.z), mx = sx - Math.cos(pa) * v.t.size.z * s * 0.5, mz = sz - Math.sin(pa) * v.t.size.z * s * 0.5; put(v.t, mx, mz, s, face(sx, sz, P.cx, P.cz), wy - 1.0 * s); }
      spots.push({ x: sx + Math.cos(pa) * 1.6, z: sz + Math.sin(pa) * 1.6 });
      const reeds = variants(['grass_medium_02#*']); for (let i = 0; i < 160 && reeds.length; i++) { const a = r() * 6.28, d = P.Lr * (0.82 + r() * 0.3), v2 = reeds[Math.floor(r() * reeds.length)]; put(v2.t, P.cx + Math.cos(a) * d, P.cz + Math.sin(a) * d, 2.2 + r() * 1.4, r() * 6.28); }
      for (let i = 0; i < 7; i++) { const a = r() * 6.28, d = P.Lr * (0.95 + r() * 0.2), x = P.cx + Math.cos(a) * d, z = P.cz + Math.sin(a) * d, v2 = one(['rock_moss_set_01#*', 'namaqualand_boulder_03']); if (v2) { put(v2.t, x, z, 0.7 + r() * 0.6, r() * 6.28); cols.push({ x, z, r: 0.6 }); } }
      for (let i = 0; i < 3; i++) { const a = pa + (i - 1) * 0.9 + 0.45, d = P.Lr + 2.2; spots.push({ x: P.cx + Math.cos(a) * d, z: P.cz + Math.sin(a) * d }); }
    } else if (k === 'court') {
      const walls = variants(['modular_fort_01#*']).filter(v => /thin_straight_0[34]|thin_gate/.test(v.t.name || '')), tower = variants(['modular_fort_01#*']).find(v => /tower_round/.test(v.t.name || ''));
      const s = 0.42, cs = Math.cos(P.ry), sn = Math.sin(P.ry), W2 = (lx, lz) => ({ x: P.cx + lx * cs - lz * sn, z: P.cz + lx * sn + lz * cs });
      if (walls.length) for (let side = 0; side < 4; side++) {
        const n = Math.max(3, Math.round(P.hs * 2 / (7.4 * s))), gate = side % 2 === 0 ? Math.floor(n / 2) : -1;
        for (let i = 0; i < n; i++) { const t = ((i + 0.5) / n - 0.5) * P.hs * 2; if (i === gate) { const g = W2(side === 0 ? t : side === 2 ? -t : 0, side === 0 ? -P.hs : side === 2 ? P.hs : 0); spots.push({ x: P.cx + (g.x - P.cx) * 0.8, z: P.cz + (g.z - P.cz) * 0.8 }); continue; }
          if (r() < 0.28) continue; // 坍塌的缺口
          const lx = side === 0 ? t : side === 1 ? P.hs : side === 2 ? -t : -P.hs, lz = side === 0 ? -P.hs : side === 1 ? t : side === 2 ? P.hs : -t, p = W2(lx, lz), v = walls[Math.floor(r() * walls.length)];
          const ry = -P.ry + (side % 2 === 0 ? Math.PI / 2 : 0), ss = s * (0.75 + r() * 0.3); put(v.t, p.x, p.z, ss, ry, H(p.x, p.z) - (r() < 0.4 ? 1.2 : 0.1));
          const ax = side % 2 === 0 ? { x: cs, z: sn } : { x: -sn, z: cs }, L = v.t.size.z * ss; for (let j = 0; j < 4; j++) { const tt = (j + 0.5) / 4 - 0.5; cols.push({ x: p.x + ax.x * tt * L, z: p.z + ax.z * tt * L, r: 0.75 }); } mark(p.x, p.z, 1.6); }
      }
      if (tower) { const c = W2(P.hs, P.hs), ts = 0.33; put(tower.t, c.x, c.z, ts, r() * 6.28, H(c.x, c.z) - 0.3); cols.push({ x: c.x, z: c.z, r: tower.t.size.x * ts * 0.48 }); mark(c.x, c.z, 3); }
      const sv = one(['gothic_statue']); if (sv) { const ss = 2.6 / sv.t.size.y; put(sv.t, P.cx, P.cz, ss, r() * 6.28); cols.push({ x: P.cx, z: P.cz, r: Math.max(sv.t.size.x, sv.t.size.z) * ss * 0.45 }); mark(P.cx, P.cz, 2); }
      for (let i = 0; i < 10; i++) { const p = W2((r() - 0.5) * P.hs * 1.7, (r() - 0.5) * P.hs * 1.7), v = one(['rock_07', 'rock_09']); if (v) put(v.t, p.x, p.z, 0.25 + r() * 0.3, r() * 6.28); }
      spots.push(W2(2.5, 0), W2(-2.5, 1)); P.boss = W2(0, 2.8);
    } else if (k === 'henge') {
      const n = 10, a0 = r() * 6.28, rr = P.top * 0.8; for (let i = 0; i < n; i++) { if (i === 3 && r() < 0.6) continue; const a = a0 + i / n * Math.PI * 2, x = P.cx + Math.cos(a) * rr, z = P.cz + Math.sin(a) * rr, v = one(i % 2 ? ['rock_face_02'] : ['namaqualand_boulder_04', 'namaqualand_boulder_03']); if (v) { put(v.t, x, z, (2.1 + r() * 0.7) / Math.max(1, Math.max(v.t.size.x, v.t.size.z) / 1.2), face(x, z, P.cx, P.cz)); cols.push({ x, z, r: 0.7 }); } }
      mark(P.cx, P.cz, P.top + 2.5); const tv = one(['dead_quiver_trunk']); if (tv) { put(tv.t, P.cx + 0.9, P.cz, 1.3, r() * 6.28); cols.push({ x: P.cx + 0.9, z: P.cz, r: 0.4 }); }
      const fl = window.Assets && Assets.flame(P.cx - 0.6, H(P.cx - 0.6, P.cz) + 0.05, P.cz, 4.5); if (fl) sc.add(fl);
      for (let i = 0; i < 3; i++) { const a = a0 + (i + 0.5) / 3 * Math.PI * 2; spots.push({ x: P.cx + Math.cos(a) * rr * 0.55, z: P.cz + Math.sin(a) * rr * 0.55 }); } P.boss = { x: P.cx, z: P.cz - 1.8 };
    } else if (k === 'ravine') {
      for (const sg of P.segs) { const L = Math.hypot(sg[2] - sg[0], sg[3] - sg[1]), nx = -(sg[3] - sg[1]) / (L || 1), nz = (sg[2] - sg[0]) / (L || 1);
        for (let t = 2; t < L; t += 3.6) { const bx = sg[0] + (sg[2] - sg[0]) * t / L, bz = sg[1] + (sg[3] - sg[1]) * t / L; if (Math.hypot(bx - P.hx, bz - P.hz) < 6 || doorList.some(d => Math.hypot(d.x - bx, d.z - bz) < 6)) continue;
          for (const sd of [-1, 1]) { const x = bx + nx * sd * (4.6 + r() * 1.2), z = bz + nz * sd * (4.6 + r() * 1.2); if (P.dist(x, z) < 3.8) continue; const v = one(['rock_face_01', 'rock_face_02', 'namaqualand_boulder_04']); if (!v) continue; const s = 1 + r() * 0.6; put(v.t, x, z, s, face(x, z, bx, bz) + Math.PI, H(x, z) - 0.6); cols.push({ x, z, r: 1.5 }); mark(x, z, 2); } }
        spots.push({ x: (sg[0] + sg[2]) / 2, z: (sg[1] + sg[3]) / 2 }); }
      spots.sort(() => r() - 0.5);
    } else if (k === 'market') {
      const a = r() * Math.PI, ax = Math.cos(a), az = Math.sin(a), nx = -az, nz = ax;
      for (let i = -2; i <= 2; i++) for (const sd of [-1, 1]) { const x = P.cx + ax * i * 3.6 + nx * sd * 3, z = P.cz + az * i * 3.6 + nz * sd * 3; const v = one(i % 2 ? ['painted_wooden_bench', 'wooden_barrels_01', 'wooden_crate_02'] : ['wooden_picnic_table']); if (!v) continue;
        put(v.t, x, z, 1, face(x, z, x - nx * sd, z - nz * sd) + (v.n === 'wooden_picnic_table' ? Math.PI / 2 : 0)); cols.push({ x, z, r: v.n === 'wooden_picnic_table' ? 1.1 : 0.5 }); mark(x, z, 1.5);
        if (r() < 0.5) { const v2 = one(['wicker_basket_01', 'wooden_bucket_01']); if (v2) put(v2.t, x + (r() - 0.5) * 0.6, z + (r() - 0.5) * 0.6, 1, r() * 6.28, v.n === 'wooden_picnic_table' ? H(x, z) + 0.75 : null); }
        if (r() < 0.35) spots.push({ x: x - nx * sd * 1.4, z: z - nz * sd * 1.4 }); }
      const lamp = one(['street_lamp_01']); if (lamp) for (const i of [-3, 3]) { const x = P.cx + ax * i * 3.6, z = P.cz + az * i * 3.6; put(lamp.t, x, z, 1, 0); cols.push({ x, z, r: 0.3 }); if (st.night) { const pl = new THREE.PointLight('#ffc070', 1.5, 10, 2); pl.position.set(x, H(x, z) + lamp.t.size.y * 0.9, z); sc.add(pl); } }
      spots.push({ x: P.cx, z: P.cz });
    }
  }
  const PREY_SAY = { see: ['……有人来了。', '那是什么？！', '别过来……', '食、食人魔！', '快跑！'], flee: ['救命！', '别追了！', '我不想死……', '放过我吧！'], fight: ['我跟你拼了！', '滚开！', '你休想！'], hit: ['啊！', '呜……', '好痛……'] };

  // ================= 懒加载资产（big/world/*.js）=================
  const LOADED = {}, MODELS = {}, TEX = {}, SKY = {}, TMPL = {}, SCRP = {}, PREP = {}, DONE = {};
  // 第十九轮（加载提速）：① 所有脚本并行下载 ② base64 解码交给浏览器（fetch data:）③ 贴图/模型并行解析 ④ 空闲时后台预热（邻居地点/热门地区）⑤ 进场前先渲一帧编译着色器
  const PROF = window.__wprof = []; const tp = (l, t0) => PROF.push([l, Math.round(performance.now() - t0)]);
  const b64sync = (s) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
  const b64buf = async (s) => { try { const r = await fetch('data:application/octet-stream;base64,' + s); return await r.arrayBuffer(); } catch (e) { return b64sync(s); } };
  const loadImg = (url) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
  const tick = () => new Promise(r => setTimeout(r, 0));
  function script(name) {
    return SCRP[name] || (SCRP[name] = new Promise(res => { const s = document.createElement('script'); s.async = true; s.src = 'big/world/' + name + '.js'; s.onload = () => res(true); s.onerror = () => { console.warn('world asset missing', name); res(false); }; document.head.appendChild(s); }));
  }
  // 解析一个资产（模型 / 贴图组 / 天空）；同名只做一次。sky 需要渲染器（PMREM），没有就只下载脚本、稍后再解。
  function prep(n) {
    if (DONE[n]) return Promise.resolve();
    if (PREP[n]) return PREP[n];
    if (n.startsWith('sky_') && !(G || window.__game)) return script(n);
    return PREP[n] = (async () => {
      const t0 = performance.now(); const ok = await script(n); const A = window.ASSETS || {}; const v = A[n];
      if (ok && v) try {
        if (n.startsWith('tex_')) { const o = {}; await Promise.all(Object.keys(v).map(async k => { const t = new THREE.Texture(await loadImg(v[k])); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (k === 'diff') t.encoding = THREE.sRGBEncoding; t.needsUpdate = true; o[k] = t; })); TEX[n.slice(4)] = o; }
        else if (n.startsWith('sky_')) SKY[n.slice(4)] = await parseSky(v);
        else { const g = await new Promise(async (rs, rj) => { try { new THREE.GLTFLoader().parse(await b64buf(v), '', rs, rj); } catch (e) { rj(e); } }); prepModel(g.scene); MODELS[n] = g.scene; }
      } catch (e) { console.warn('world asset', n, e); }
      if (A[n]) A[n] = null; DONE[n] = 1; LOADED[n] = 1; delete PREP[n]; tp(n, t0); await tick();
    })();
  }
  async function need(names, onProg) {
    const list = [...new Set(names)].filter(n => !DONE[n]); let i = 0; list.forEach(script);
    await Promise.all(list.map(async n => { await prep(n); i++; onProg && onProg(i / list.length, n); }));
  }
  // 后台预热队列：一次一个，主线程空闲时才做；进图/加载期间暂停（加载优先）
  const WQ = []; let wRun = false;
  const idle = (f) => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 1500 }) : setTimeout(f, 60));
  function warm(names) { for (const n of names) if (!DONE[n] && !WQ.includes(n)) WQ.push(n); if (!wRun) { wRun = true; idle(pump); } }
  async function pump() {
    if (W && W.busy) return idle(pump);
    const n = WQ.shift(); if (!n) { wRun = false; return; }
    try { await prep(n); } catch (e) {}
    idle(pump);
  }
  function warmRegion(k) { const pool = REGION[k]; if (!pool) return; const names = []; [...new Set(pool)].forEach(sn => { const st = STYLES[sn]; names.push('sky_' + st.sky, 'tex_' + st.ground); st.props.forEach(p => { if (p[4] === 'fire') return; p[0].forEach(x => names.push(x.replace('#*', ''))); }); if (st.edge) st.edge[0].forEach(x => { names.push(x.replace('#*', '')); if (LO[x]) names.push(x + '_lo'); }); }); warm(names.filter(n => n !== 'brazier')); }
  try { document.addEventListener('mouseover', (e) => { const c = e.target && e.target.closest && e.target.closest('.loc[data-v]'); if (c) warmRegion(c.dataset.v); }, { passive: true }); } catch (e) {}
  setTimeout(() => { try { warmRegion('village'); } catch (e) {} }, 6000); // 首次出猎多半从村庄出发：菜单停留的空闲时间里先把草甸/深林备好
  const windMats = [];
  function prepModel(sc) {
    sc.traverse(o => {
      if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true;
      const m = o.material; if (!m) return;
      if (m.map) m.map.anisotropy = 8; if (m.isMeshStandardMaterial) m.envMapIntensity = 0.7;
      if (m.alphaTest > 0 || m.transparent) { // 叶片/草：alpha 裁剪 + 双面 + 风
        m.transparent = false; m.alphaTest = Math.max(0.4, m.alphaTest || 0); m.side = THREE.DoubleSide; m.depthWrite = true;
        if (!m.userData.wind) { m.userData.wind = 1; windMats.push(m); m.onBeforeCompile = (sh) => { sh.uniforms.uWind = WIND; sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          { vec2 ip = vec2(0.0);
            #ifdef USE_INSTANCING
            ip = instanceMatrix[3].xz;
            #endif
            float hgt = max(0.0, transformed.y); float w = sin(uWind * 1.3 + ip.x * 0.37 + ip.y * 0.29 + transformed.y * 0.6) + 0.4 * sin(uWind * 2.9 + ip.y * 0.7 + transformed.x * 2.0);
            transformed.x += w * 0.018 * hgt; transformed.z += w * 0.012 * hgt; }`); }; m.customProgramCacheKey = () => 'wind1'; m.needsUpdate = true; }
      }
    });
  }
  const WIND = { value: 0 };
  async function parseSky(v) {
    const bg = new THREE.Texture(await loadImg(v.bg)); bg.encoding = THREE.sRGBEncoding; bg.minFilter = THREE.LinearFilter; bg.generateMipmaps = false; bg.needsUpdate = true;
    const im = await loadImg(v.env); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data; const n = c.width * c.height; const hf = new Uint16Array(n * 4);
    let aR = 0, aG = 0, aB = 0, aW = 0; // 第二十六轮(j) head_tone：环境图平均辐亮度（按纬度 cos 加权）→ sky.amb，给卡通头补同量间接光
    for (let i = 0; i < n; i++) { const e = d[i * 4 + 3]; let f = e ? Math.pow(2, e - 136) : 0; const mx = Math.max(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) * f; if (mx > 3) f *= 3 / mx;
      { const w = Math.cos(((Math.floor(i / c.width) + 0.5) / c.height - 0.5) * Math.PI); aR += d[i * 4] * f * w; aG += d[i * 4 + 1] * f * w; aB += d[i * 4 + 2] * f * w; aW += w; }
      hf[i * 4] = THREE.DataUtils.toHalfFloat(d[i * 4] * f); hf[i * 4 + 1] = THREE.DataUtils.toHalfFloat(d[i * 4 + 1] * f); hf[i * 4 + 2] = THREE.DataUtils.toHalfFloat(d[i * 4 + 2] * f); hf[i * 4 + 3] = THREE.DataUtils.toHalfFloat(1); }
    const t = new THREE.DataTexture(hf, c.width, c.height, THREE.RGBAFormat, THREE.HalfFloatType); t.mapping = THREE.EquirectangularReflectionMapping; t.magFilter = t.minFilter = THREE.LinearFilter; t.flipY = true; t.needsUpdate = true;
    const pm = new THREE.PMREMGenerator((G || window.__game).renderer); const env = pm.fromEquirectangular(t).texture; pm.dispose(); t.dispose();
    // 地平线颜色（雾）/ 天顶 / 地面平均色：从背景 JPEG 取
    const bi = bg.image, cc = document.createElement('canvas'); cc.width = 64; cc.height = 32; const g2 = cc.getContext('2d'); g2.drawImage(bi, 0, 0, 64, 32);
    const px = g2.getImageData(0, 0, 64, 32).data; const avg = (y0, y1) => { let r = 0, gg = 0, b = 0, k = 0; for (let y = y0; y < y1; y++) for (let x = 0; x < 64; x++) { const i = (y * 64 + x) * 4; r += px[i]; gg += px[i + 1]; b += px[i + 2]; k++; } return new THREE.Color(r / k / 255, gg / k / 255, b / k / 255); };
    return { bg, env, sun: v.sun, mean: v.mean, amb: new THREE.Color(aR / aW, aG / aW, aB / aW), horizon: avg(14, 17), zenith: avg(0, 5), ground: avg(20, 28) };
  }
  // 模型 → 实例化模板：[{geo, mat, m(相对矩阵)}] + 尺寸
  function templates(name) {
    if (TMPL[name]) return TMPL[name];
    const split = name.endsWith('#*'), base = split ? name.slice(0, -2) : name, M = MODELS[base]; if (!M) return (TMPL[name] = []);
    const roots = [];
    if (split) { M.updateMatrixWorld(true); const top = M.children.length === 1 && !M.children[0].isMesh && M.children[0].children.length > 1 ? M.children[0].children : M.children; top.forEach(c => { if (c.isMesh || c.children.length) roots.push(c); }); }
    else roots.push(M);
    const out = [];
    for (const r of roots) {
      const holder = new THREE.Group(); const c = r.clone(true); if (split) c.position.set(0, 0, 0); holder.add(c); holder.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(c); if (bb.isEmpty()) continue; const sz = bb.getSize(new V3()), ce = bb.getCenter(new V3());
      const off = new THREE.Matrix4().makeTranslation(-ce.x, -bb.min.y, -ce.z); const parts = [];
      c.traverse(o => { if (o.isMesh) parts.push({ geo: o.geometry, mat: o.material, m: off.clone().multiply(o.matrixWorld) }); });
      out.push({ parts, size: sz, name: r.name || base });
    }
    return (TMPL[name] = out);
  }

  // ================= 图生成 =================
  // ================= 整个世界：一张巨大的地点图（第十四轮·用户要求：开局生成、自由探索、无选关）=================
  // 9 个地区按蛇形排开，每区 22~38 个地点；区内最小生成树 + 岔路；相邻地区之间 2 道关门，偶尔有捷径。
  // 图只由 seed 决定（存档里只存 seed + 探索记录），每次出猎重新生成同一张图；敌人/宝箱每趟重新刷新（懒生成）。
  const GRID = [[0, 0], [1, 0], [2, 0], [2, 1], [1, 1], [0, 1], [0, 2], [1, 2], [2, 2]];
  function genWorld(seed) {
    const r = mulberry(seed), L = Lore.LOCS, SP = 175, nodes = [], regions = [];
    L.forEach((loc, ri) => {
      const [gx, gy] = GRID[ri % 9], cx = gx * SP + (r() - 0.5) * 24, cy = gy * SP + (r() - 0.5) * 24;
      const N = 22 + ri * 2, RR = 56 + ri * 1.6, idx = [];
      for (let t = 0; t < 8000 && idx.length < N; t++) {
        const a = r() * 6.2832, d = Math.sqrt(r()) * RR, p = { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d };
        if (idx.every(j => Math.hypot(nodes[j].x - p.x, nodes[j].y - p.y) > 12.5)) { idx.push(nodes.length); nodes.push({ x: p.x, y: p.y, ri }); }
      }
      regions.push({ k: loc.k, loc, cx, cy, idx });
    });
    const n = nodes.length, E = new Set(), key = (a, b) => a < b ? a + '-' + b : b + '-' + a, deg = new Array(n).fill(0);
    const dist = (a, b) => Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y);
    const addE = (a, b) => { const k = key(a, b); if (E.has(k) || a === b) return false; E.add(k); deg[a]++; deg[b]++; return true; };
    for (const R of regions) {
      const ids = R.idx, inT = new Set([ids[0]]);
      while (inT.size < ids.length) { let best = null; for (const a of inT) for (const b of ids) if (!inT.has(b)) { const d = dist(a, b); if (!best || d < best[2]) best = [a, b, d]; } addE(best[0], best[1]); inT.add(best[1]); }
      for (const a of ids) { const near = ids.filter(b => b !== a).sort((p, q) => dist(a, p) - dist(a, q)).slice(0, 4); for (const b of near) if (deg[a] < 5 && deg[b] < 5 && r() < 0.36 && dist(a, b) < 30) addE(a, b); }
    }
    const link = (A, B, k) => { const pairs = []; for (const a of A.idx) for (const b of B.idx) pairs.push([a, b, dist(a, b)]); pairs.sort((p, q) => p[2] - q[2]); const used = [];
      for (const [a, b] of pairs) { if (used.length >= k) break; if (used.some(([x, y]) => dist(x, a) < 28 || dist(y, b) < 28)) continue; addE(a, b); used.push([a, b]); } };
    for (let i = 0; i + 1 < regions.length; i++) link(regions[i], regions[i + 1], 2);
    if (r() < 0.5) link(regions[1], regions[4], 1); if (r() < 0.5 && regions[7]) link(regions[4], regions[7], 1);
    const adj = [...Array(n)].map(() => []); for (const k of E) { const [a, b] = k.split('-').map(Number); adj[a].push(b); adj[b].push(a); }
    let home = regions[0].idx[0]; for (const j of regions[0].idx) if (nodes[j].x + nodes[j].y < nodes[home].x + nodes[home].y) home = j;
    const depth = new Array(n).fill(-1); depth[home] = 0; const qu = [home];
    while (qu.length) { const a = qu.shift(); for (const b of adj[a]) if (depth[b] < 0) { depth[b] = depth[a] + 1; qu.push(b); } }
    for (const R of regions) { R.entry = R.idx.reduce((m, j) => depth[j] < depth[m] ? j : m, R.idx[0]); R.boss = R.idx.reduce((m, j) => depth[j] > depth[m] ? j : m, R.idx[0]); R.stone = R.k === regions[0].k ? home : R.entry; }
    const usedN = new Set();
    const out = nodes.map((p, i) => {
      const R = regions[p.ri], pool = REGION[R.k] || ['meadow'];
      const style = Worlds._forceStyle || (i === R.boss ? pool[0] : pick(r, pool));
      const sz = i === home ? 's' : i === R.boss ? 'l' : i === R.stone ? 'm' : (() => { const x = r(); return x < 0.6 ? 's' : x < 0.9 ? 'm' : 'l'; })();
      let nm; for (let t = 0; t < 30; t++) { const P = NAMES[style]; nm = (t > 8 || r() < 0.15 ? pick(r, ['北', '南', '东', '西', '上', '下', '旧', '深', '远']) : '') + pick(r, P[0]) + pick(r, P[1]); if (!usedN.has(nm)) break; }
      usedN.add(nm);
      const Rr = SIZES[sz].R[0] + r() * (SIZES[sz].R[1] - SIZES[sz].R[0]);
      return { i, x: p.x, y: p.y, region: R.k, loc: R.loc, style, size: sz, R: Rr, name: nm, seed: (seed ^ Math.imul(i + 1, 2654435761)) >>> 0, adj: adj[i], depth: depth[i],
        visited: false, known: false, home: i === home, stone: i === R.stone, boss: i === R.boss && !!(window.Explore && Explore.BOSSES[R.k]), prey: null, chests: null };
    });
    return { nodes: out, home, regions, seed, entry: home };
  }
  // 这一趟里某个地点的敌人与宝箱（第一次进入时生成；越深的地区越多、越稀有）
  function populate(node) {
    const tr = (G.S.stats && G.S.stats.trips) || 0, r = mulberry((node.seed ^ Math.imul(tr + 7, 0x9E3779B1)) >>> 0), ri = Math.max(0, Lore.LOCS.findIndex(l => l.k === node.region));
    node.prey = []; node.chests = [];
    if (node.home) return;
    let x = r(), n = W && W.graph && W.graph.trip ? (node.boss ? 0 : x < 0.15 ? 0 : x < 0.55 ? 1 : x < 0.88 ? 2 : 3) : (x < 0.3 ? 0 : x < 0.72 ? 1 : x < 0.93 ? 2 : 3);
    if (n > 0 && !node.boss && window.FoeAI2 && FoeAI2.packBonus) n += FoeAI2.packBonus(ri, r); // R34 MOD foe_pack：越深的地区，敌人成群出现
    const site = window.WSites && (layOf(node), node.site) ? node.site : null; if (site) n = WSites.count(node, n, r); // R41：集会 = 5–8 人
    for (let k = 0; k < n; k++) {
      let h = null;
      if (window.RPG && RPG.foe) try { h = RPG.foe(G.S, node.loc, (r() * 4294967296) >>> 0, G.usedNames, G.usedSig); } catch (e) { console.warn('foe', e); }
      else if (W.pool && W.pool.length) h = W.pool.pop();
      if (h) node.prey.push(h);
    }
    if (r() < 0.3 + (node.size === 'l' ? 0.3 : 0)) { const lo = node.loc.loot || [10, 30]; node.chests.push({ coin: Math.round((lo[0] + r() * (lo[1] - lo[0])) * (1.5 + r() * 2)), potion: r() < 0.25 + ri * 0.02 }); }
    if (site) WSites.bonusLoot(node, r);
    node.loot = window.Sack ? Sack.genLoot(node, r) : []; // 第十九轮：可搜刮容器（MOD sack_grid）
  }
  // 第十四轮 14c（用户改回）：每次出门选地区，这一趟随机生成这个地区的地点图（入口=回洞门，最深处=霸主）
  function genTrip(loc, seed) {
    const r = mulberry(seed), di = Math.max(0, Lore.LOCS.findIndex(l => l.k === loc.k));
    const N = 8 + Math.min(8, di) + Math.floor(r() * 4), P = [];
    for (let t = 0; P.length < N && t < 6000; t++) { const p = { x: r() * 150, y: r() * 90 }; if (P.every(q => Math.hypot(q.x - p.x, q.y - p.y) > 17)) P.push(p); }
    const n = P.length, adj = P.map(() => []), deg = new Array(n).fill(0), dist = (a, b) => Math.hypot(P[a].x - P[b].x, P[a].y - P[b].y);
    const addE = (a, b) => { if (a === b || adj[a].includes(b)) return; adj[a].push(b); adj[b].push(a); deg[a]++; deg[b]++; };
    const inT = new Set([0]); while (inT.size < n) { let best = null; for (const a of inT) for (let b = 0; b < n; b++) if (!inT.has(b)) { const d = dist(a, b); if (!best || d < best[2]) best = [a, b, d]; } addE(best[0], best[1]); inT.add(best[1]); }
    for (let a = 0; a < n; a++) { const near = [...Array(n).keys()].filter(b => b !== a).sort((p, q) => dist(a, p) - dist(a, q)).slice(0, 4); for (const b of near) if (deg[a] < 5 && deg[b] < 5 && r() < 0.4 && dist(a, b) < 48) addE(a, b); }
    let home = 0; P.forEach((p, i) => { if (p.x < P[home].x) home = i; });
    const depth = new Array(n).fill(-1); depth[home] = 0; const qu = [home]; while (qu.length) { const a = qu.shift(); for (const b of adj[a]) if (depth[b] < 0) { depth[b] = depth[a] + 1; qu.push(b); } }
    let far = home; depth.forEach((d, i) => { if (d > depth[far] || (d === depth[far] && P[i].x > P[far].x)) far = i; });
    const pool = REGION[loc.k] || ['meadow'], usedN = new Set(), hasBoss = !!(window.Explore && Explore.BOSSES[loc.k]) && !(((G || window.__game).S.bosses) || {})[loc.k];
    const nodes = P.map((p, i) => {
      const style = Worlds._forceStyle || (i === far ? pool[0] : pick(r, pool));
      const sz = i === home ? 's' : i === far ? 'l' : (() => { const x = r(); return x < 0.55 ? 's' : x < 0.88 ? 'm' : 'l'; })();
      let nm; for (let t = 0; t < 30; t++) { const NM = NAMES[style]; nm = (t > 8 || r() < 0.15 ? pick(r, ['北', '南', '东', '西', '上', '下', '旧', '深', '远']) : '') + pick(r, NM[0]) + pick(r, NM[1]); if (!usedN.has(nm)) break; } usedN.add(nm);
      const Rr = SIZES[sz].R[0] + r() * (SIZES[sz].R[1] - SIZES[sz].R[0]);
      return { i, x: p.x, y: p.y, region: loc.k, loc, style, size: sz, R: Rr, name: nm, seed: (seed ^ Math.imul(i + 1, 2654435761)) >>> 0, adj: adj[i], depth: depth[i],
        visited: false, known: false, home: i === home, stone: false, boss: i === far && hasBoss, prey: null, chests: null };
    });
    nodes[home].known = true; nodes[home].adj.forEach(b => nodes[b].known = true);
    return { nodes, home, entry: home, far, loc, trip: true, seed, regions: [{ k: loc.k, loc, cx: 75, cy: 45, idx: nodes.map(n => n.i), entry: home, boss: far, stone: home }] };
  }
  function genGraph(loc, seed) { return loc ? genTrip(loc, seed >>> 0) : genWorld((Math.random() * 4294967296) >>> 0); }
  function noise2(seed) {
    const h = (x, y) => { let n = (x * 374761393 + y * 668265263 + seed * 69069) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
    const v = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
      return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - w) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * w; };
    return (x, y) => v(x, y) * 0.55 + v(x * 2.1 + 17, y * 2.1 - 5) * 0.3 + v(x * 4.3 - 9, y * 4.3 + 3) * 0.15;
  }
  const WHITE = new THREE.Color(1, 1, 1);
  const styleOf = (node) => (window.WGen && WGen.on()) ? WGen.style(node, STYLES[node.style]) : STYLES[node.style]; // 第十九轮：基因组样式（每个地点独一份）
  function buildNode(node) {
    const st = styleOf(node), g = st.g || null, sky = SKY[st.sky], R = node.R, r = mulberry(node.seed), nz = noise2(node.seed & 0xffff);
    const sc = new THREE.Scene(); const cols = []; const inter = [];
    const LP = window.WLayout ? WLayout.plan(node, nz) : null, Rf = LP ? LP.Rf : (() => R), RM = LP ? LP.Rmax : R; // 第十八轮 wlayout：不规则边界/地形/布局
    // 门的位置先定：均匀分布在边界上
    const doorList = node.adj.map(b => ({ to: b })); if (node.home || node.stone) doorList.push({ to: -1 });
    const a0 = r() * Math.PI * 2; doorList.forEach((d, k) => { d.a = a0 + k / doorList.length * Math.PI * 2 + (r() - 0.5) * 0.5 / doorList.length; d.x = Math.cos(d.a) * (Rf(d.a) - 0.6); d.z = Math.sin(d.a) * (Rf(d.a) - 0.6); });
    if (LP) WLayout.paths(LP, doorList);
    let Rmin = R; if (LP) for (let i = 0; i < 24; i++) Rmin = Math.min(Rmin, Rf(i / 24 * Math.PI * 2));
    const LY = layPlan(node, Rmin, doorList); // 第十八轮（总管理师）：布局原型，与 wlayout 叠加；用不规则边界的最小半径
    // R41：门口视线走廊——进门后朝里 ~12m、宽 ~4m 的带子里压平起伏（以前土丘/土墩常正好挡在门口，一进门只看见一面土坡）
    const corL = Math.min(13, Rmin * 0.55), corOn = !(window.Mods && Mods.on && Mods.on('wfix41') === false);
    const flat = (x, z) => { let f = LY.flat ? LY.flat(x, z) : 1; for (const d of doorList) { f = Math.min(f, sstep(2.5, 6, Math.hypot(x - d.x, z - d.z)));
      if (corOn) { const ux = -Math.cos(d.a), uz = -Math.sin(d.a), px = x - d.x, pz = z - d.z, t = px * ux + pz * uz; if (t > -2 && t < corL) { const perp = Math.abs(px * uz - pz * ux), w = 2.2 + t * 0.22; f = Math.min(f, Math.max(sstep(w, w + 4, perp), sstep(corL * 0.5, corL, t))); } } }
      return f; };
    const H0 = (x, z) => { const rr = Math.hypot(x, z), ang = Math.atan2(z, x);
      const fl = flat(x, z), inner = (nz(x * 0.06 + 50, z * 0.06 + 50) - 0.5) * 1.6 * (LP ? LP.relief : 1) * fl * sstep(0, 5, rr) + (LP ? WLayout.dH(LP, x, z, fl) : 0), Ra = LP ? Rf(ang) : R;
      const rim = st.hill * sstep(Ra + 0.5, Ra + 16, rr) * (0.55 + 0.9 * nz(Math.cos(ang) * 3 + 9, Math.sin(ang) * 3 + 9)) + st.hill * 1.2 * sstep(Ra + 20, Ra + 60, rr);
      return inner + rim + (LY.dh ? LY.dh(x, z) : 0); };
    let H = H0; if (g) { WGen.prepare(st, node, { R, Rmin, nz, doorList, LY, H0 }); H = (x, z) => g.h(x, z, H0(x, z), flat(x, z)); }
    if (window.WTerrain) try { H = WTerrain.wrap(H, { node, st, R, Rmin, doorList, LY, g, flat }); } catch (e) { console.warn('WTerrain', e); } // R46 地形特色化：脊状分形 + 标志地貌
    if (corOn && node.lay !== 'ravine') { // R41：视线锥——从每道门朝中心看，地形高度软限制在一条缓升的视线下面（土丘被压成垭口，而不是整座挡在眼前）
      const Hr = H, sight = doorList.map(d => ({ x: d.x, z: d.z, ux: -Math.cos(d.a), uz: -Math.sin(d.a), L: Math.hypot(d.x, d.z) + 4, h0: Hr(d.x, d.z) }));
      H = (x, z) => { let h = Hr(x, z); for (const s of sight) { const px = x - s.x, pz = z - s.z, t = px * s.ux + pz * s.uz; if (t < 3 || t > s.L) continue;
        const w = (1 - sstep(2.5 + t * 0.28, 6.5 + t * 0.4, Math.abs(px * s.uz - pz * s.ux))) * (1 - sstep(s.L - 6, s.L, t)); if (w <= 0) continue;
        const lim = s.h0 + 0.35 + t * 0.045; if (h > lim) h -= (h - lim) * 0.8 * w; } return h; };
    }
    // 地形
    const ext = RM + 70, seg = Math.min(220, Math.round(ext * 2 / 1.1));
    const tg = new THREE.PlaneGeometry(ext * 2, ext * 2, seg, seg); tg.rotateX(-Math.PI / 2);
    const tp = tg.attributes.position; for (let i = 0; i < tp.count; i++) tp.setY(i, H(tp.getX(i), tp.getZ(i))); tg.computeVertexNormals(); if (g) WGen.paint(tg, { st, LP, R });
    const gset = TEX[st.ground]; let gm;
    if (gset && window.Assets && Assets.triplanar) { gm = Assets.triplanar(gset, { scale: st.gs, normal: 1.1, env: 0.35, ao: 0.9, vertexColors: !!g, macro: window.WorldMaster ? WorldMaster.terr() : 0, ...((RKs) => RKs && TEX[RKs.name] ? { rock: TEX[RKs.name], rockTint: RKs.tint, rockLite: window.WorldMaster ? WorldMaster.terr() < 2 : false } : {})(window.WTerrain && WTerrain.act() ? WTerrain.rock(node) : null) }); gm.envMap = sky ? sky.env : null; }
    else gm = new THREE.MeshStandardMaterial({ color: '#556644', roughness: 1, vertexColors: !!g });
    if (st.tint) gm.color = new THREE.Color(st.tint);
    const terr = new THREE.Mesh(tg, gm); terr.receiveShadow = true; sc.add(terr);
    // 天空（与 PMREM 同一套等距柱状映射）
    if (sky) {
      const sm = new THREE.ShaderMaterial({ uniforms: { map: { value: sky.bg }, k: { value: g ? g.skyK * Math.pow(g.sunK, 0.5) : (st.night ? 0.9 : 1.1) }, tint: { value: g ? g.skyTint : new THREE.Color(1, 1, 1) }, fogC: { value: new THREE.Color(0, 0, 0) }, hz: { value: 0 } }, depthWrite: false, side: THREE.BackSide, fog: false,
        vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
        fragmentShader: 'uniform sampler2D map; uniform float k; uniform vec3 tint; uniform vec3 fogC; uniform float hz; varying vec3 vD; void main(){ vec3 d = normalize(vD); vec2 uv = vec2(atan(d.z, d.x) * 0.1591549 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.3183099 + 0.5); vec3 c = texture2D(map, uv).rgb * k * tint; if (hz > 0.0) { vec3 f = fogC;\n#ifdef TONE_MAPPING\n f = toneMapping(fogC);\n#endif\n f = linearToOutputTexel(vec4(f, 1.0)).rgb; c = mix(c, f, (1.0 - smoothstep(-0.02, hz, d.y)) * 0.92); } gl_FragColor = vec4(c, 1.0); }' });
      // R41：地平线雾带——天空下缘渐变到（经色调映射的）雾色，远处被雾吃掉的地形边缘与天空照片接起来，不再是一圈“纸板墙”，也盖住 HDRI 里拍到的地面景物
      const skyM = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), sm); skyM.frustumCulled = false; skyM.renderOrder = -10; if (g) skyM.rotation.y = g.yaw; skyM.userData.sky = 1; sc.add(skyM); sc.userData.skyM = skyM;
      sc.environment = sky.env; if (window.FaceFill && FaceFill.env) FaceFill.env(sky.amb); sc.fog = g ? new THREE.FogExp2(sky.horizon.clone().multiplyScalar(st.night ? 0.6 : 0.78).multiply(g.fogMul), Math.max(0.006, Math.min(st.fog * (R > 30 ? 0.7 : 1) * (LP ? LP.fog : 1) * g.fk, (st.night ? 1.5 : 1.15) / (R + 14)))) : new THREE.FogExp2(sky.horizon.clone().multiplyScalar(st.night ? 0.6 : 0.78), Math.min(st.fog * (R > 30 ? 0.7 : 1) * (LP ? LP.fog : 1), Math.max(st.fog, 0.032)));
      if (!(window.Mods && Mods.on && Mods.on('wfix41') === false)) { sm.uniforms.fogC.value = sc.fog.color; sm.uniforms.hz.value = st.night ? 0.07 : 0.1 + Math.min(0.08, sc.fog.density * 3); }
    } else { sc.fog = new THREE.FogExp2('#8899aa', 0.02); }
    // 光：太阳（从 HDRI 最亮方向）+ 半球补光
    let el = sky ? (0.5 - sky.sun[1]) * Math.PI : 0.8, az = sky ? (sky.sun[0] - 0.5) * Math.PI * 2 : 0.5; if (el < 0.35) el = 0.35 + (st.night ? 0.5 : 0); if (g) az -= g.yaw;
    const sunDir = new V3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).normalize();
    const sun = new THREE.DirectionalLight(g ? g.sunCol : (st.night ? '#9fb4ff' : '#fff1dc'), st.sun * (LP ? LP.sun : 1) * (g ? g.sunK : 1)); sun.castShadow = true;
    const ss = Math.min(26, R + 4); Object.assign(sun.shadow.camera, { left: -ss, right: ss, top: ss, bottom: -ss, near: 1, far: 160 }); sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    sc.add(sun); sc.add(sun.target);
    const hemi = new THREE.HemisphereLight(sky ? sky.zenith : '#8899aa', sky ? sky.ground : '#443322', (st.night ? 0.35 : 0.25) * (g ? g.hemK : 1)); sc.add(hemi);
    // 散布：网格防重叠
    const occ = new Map(), cell = 1.2, ck = (x, z) => Math.floor(x / cell) + ',' + Math.floor(z / cell);
    const free = (x, z, rad) => { const n = Math.ceil(rad / cell); const cx = Math.floor(x / cell), cz = Math.floor(z / cell); for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) if (occ.get((cx + i) + ',' + (cz + j))) return false; return true; };
    const mark = (x, z, rad) => { const n = Math.ceil(rad / cell); const cx = Math.floor(x / cell), cz = Math.floor(z / cell); for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) occ.set((cx + i) + ',' + (cz + j), 1); };
    doorList.forEach(d => mark(d.x * 0.93, d.z * 0.93, 3.2));
    const inst = new Map(), instNS = new Map(); // 模板 → 矩阵列表（NS = 不投影，远景）
    const put = (tm, x, z, s, ry, y0, ns, uc) => { const m = new THREE.Matrix4().compose(new V3(x, (y0 != null ? y0 : H(x, z)) - 0.04 * s, z), new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), ry), new V3(s, s, s)); if (uc) m.uc = uc; const M = ns ? instNS : inst; if (!M.has(tm)) M.set(tm, []); M.get(tm).push(m); };
    const variants = (list) => list.flatMap(n => templates(n).map(t => ({ t, n })));
    // 地标（先放，保证有空间）
    const spots = []; try { layPlace(LY, { sc, H, put, variants, mark, cols, doorList, spots, st, sky, node }); } catch (e) { console.warn('layout', LY.k, e); }
    const mk = pick(r, st.marks.filter(m => !(LY.k === 'camp' && m === 'campfire') && !(LY.k === 'henge' && m === 'stones'))); let mx = (r() - 0.5) * R * 0.5, mz = (r() - 0.5) * R * 0.5; for (let t = 0; t < 25 && !free(mx, mz, 4.5); t++) { const a = r() * 6.28, d = R * (0.25 + r() * 0.55); mx = Math.cos(a) * d; mz = Math.sin(a) * d; } sc.userData.mark = mk; if (!(LY.slots && window.WSites && WSites.on())) placeMark(mk, mx, mz);
    const LPX = LP ? WLayout.dress(LP, { sc, H, R, cols, free, mark, put, variants }) : null;
    const GD = g ? (() => { try { return WGen.dress(g, { sc, H, R, cols, put, variants, mark, free, spots, doorList, LP, sky, sunDir, inst }); } catch (e) { console.warn('wgen dress', e); return null; } })() : null;
    function placeMark(k, x, z) {
      const y = H(x, z);
      if (k === 'campfire' && window.Assets && Assets.has('stone_fire_pit')) { const f = Assets.fit('stone_fire_pit', { w: 1.3, x, y, z }); if (f) { sc.add(f); } const fl = Assets.flame(x, y + 0.15, z, 5.5); if (fl) sc.add(fl); const pl = new THREE.PointLight('#ff9a50', 2.2, 12, 2); pl.position.set(x, y + 0.9, z); sc.add(pl); sc.userData.fire = pl; cols.push({ x, z, r: 0.8 }); mark(x, z, 2.2); }
      else if (k === 'stones') { const vs = variants(['namaqualand_boulder_03', 'namaqualand_boulder_04', 'rock_09']); if (vs.length) for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, px = x + Math.cos(a) * 4, pz = z + Math.sin(a) * 4, v = pick(r, vs), s = (1.1 + r() * 0.5) / Math.max(1, Math.max(v.t.size.x, v.t.size.z) / 1.4); put(v.t, px, pz, s, r() * 6.3); cols.push({ x: px, z: pz, r: 0.6 }); } mark(x, z, 5); }
      else if (k === 'statue' || k === 'horse') { const n = k === 'horse' ? 'horse_statue_01' : 'gothic_statue'; const v = variants([n])[0]; if (v) { const s = (k === 'horse' ? 3.2 : 2.4) / v.t.size.y; put(v.t, x, z, s, r() * 6.3); cols.push({ x, z, r: Math.max(v.t.size.x, v.t.size.z) * s * 0.45 }); } mark(x, z, 3); }
      else if (k === 'barrels') { const vs = variants(['wooden_barrels_01', 'Barrel_02', 'wooden_military_crate']); for (let i = 0; i < 4 && vs.length; i++) { const px = x + (r() - 0.5) * 3, pz = z + (r() - 0.5) * 3, v = pick(r, vs); put(v.t, px, pz, 1, r() * 6.3); cols.push({ x: px, z: pz, r: 0.5 }); } mark(x, z, 3); }
      else if (k === 'deadfall') { const vs = variants(['dead_tree_trunk', 'dead_tree_trunk_02']); for (let i = 0; i < 3 && vs.length; i++) { const px = x + (r() - 0.5) * 5, pz = z + (r() - 0.5) * 5, v = pick(r, vs); put(v.t, px, pz, 1.1, r() * 6.3); cols.push({ x: px, z: pz, r: 0.7 }); } mark(x, z, 4); }
      else if (k === 'totem') { const vs = variants(['dead_quiver_trunk']); if (vs.length) for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, px = x + Math.cos(a) * 3, pz = z + Math.sin(a) * 3; put(vs[0].t, px, pz, 1.2, r() * 6.3); cols.push({ x: px, z: pz, r: 0.4 }); } if (window.Assets) { const fl = Assets.flame(x, y + 0.1, z, 4.5); if (fl) sc.add(fl); } mark(x, z, 4); }
      else if (k === 'chest') { /* 宝箱另放 */ }
    }
    // 宝箱
    node.chests.forEach((c, k) => {
      let x = 0, z = 0; for (let t = 0; t < 40; t++) { const a = r() * 6.28, d = R * (0.2 + r() * 0.65); x = Math.cos(a) * d; z = Math.sin(a) * d; if (free(x, z, 1.5)) break; }
      mark(x, z, 1.5); const g = window.Assets && Assets.fit('treasure_chest', { w: 0.9, x, y: H(x, z) - 0.02, z, ry: r() * 6.3 });
      if (g) { sc.add(g); c.g = g; } c.x = x; c.z = z; if (!c.opened || (c.items && c.items.length)) inter.push({ kind: 'chest', c, x, z }); cols.push({ x, z, r: 0.5 });
    });
    if (window.Sack) Sack.placeLoot(node, { sc, H, free, mark, cols, inter, R, r });
    // 普通散布
    const area = Math.PI * R * R / 100;
    const stp = window.WTerrain && WTerrain.act() ? WTerrain.steep(H) : null;
    const vg = window.WTerrain ? WTerrain.veg(node, R) : null; if (g && Array.isArray(g.tag) && vg && WTerrain.vegName(node)) g.tag.push(WTerrain.vegName(node)); // R46：每地点随机植被构图
    if (!LITE) for (const [list, dens, s0, s1, kind, fkind] of st.props) {
      if (kind === 'fire') { const n = Math.max(0, Math.round(dens * area * (0.6 + r() * 0.8))); for (let i = 0; i < n; i++) { const a = r() * 6.28, d = R * (0.2 + r() * 0.7), x = Math.cos(a) * d, z = Math.sin(a) * d; if (!free(x, z, 1.5)) continue; mark(x, z, 1.5); const y = H(x, z); if (window.Assets && Assets.has('stone_fire_pit')) { const f = Assets.fit('stone_fire_pit', { w: 0.9, x, y, z }); if (f) sc.add(f); const fl = Assets.flame(x, y + 0.12, z, 4); if (fl) sc.add(fl); const pl = new THREE.PointLight('#ff7a30', 1.6, 9, 2); pl.position.set(x, y + 0.8, z); sc.add(pl); } cols.push({ x, z, r: 0.6 }); } continue; }
      const vs = variants(list); if (!vs.length) continue;
      const LOV = {}; if (g && kind === 'tree') for (const v of vs) { const lo = templates(v.n + '_lo'); LOV[v.n] = lo && lo[0] || null; }
      const WMD = window.WorldMaster ? WorldMaster.dens(kind) : 1; // R46 world_master：高档位加密植被
      const cap = (kind === 'grass' ? (g ? 3200 : 2200) : kind === 'tree' ? (g ? 64 : 40) : 160) * (LP && LP.clump && kind !== 'grass' ? 1.5 : 1) * WMD;
      const n = Math.min(cap, Math.round(dens * WMD * (vg && (kind === 'tree' || kind === 'plant') ? 1.45 : 1) * area * (LP ? WLayout.densK(LP, kind) : 1) * (0.7 + r() * 0.6)));
      for (let i = 0; i < n; i++) {
        const a = r() * 6.28, d = RM * Math.sqrt(r()) * 0.97, x = Math.cos(a) * d, z = Math.sin(a) * d, v = pick(r, vs), s = s0 + r() * (s1 - s0);
        if (stp && (kind === 'grass' || kind === 'plant' || kind === 'tree') && stp(x, z) > (kind === 'tree' ? 0.8 : 1.05)) continue; // R46：陡坡不长草树
        if (vg && r() > vg(kind, x, z)) continue;
        if (LP && (d > Rf(a) * 0.97 || !WLayout.keep(LP, x, z, kind, r))) continue;
        if (g && !WGen.keep(g, kind, x, z, r, fkind)) continue;
        if (g && g.wd && g.wd(x, z).d < 0.7) continue;
        const fr = Math.max(v.t.size.x, v.t.size.z) * s * 0.5;
        const rad = kind === 'grass' ? 0 : kind === 'plant' ? 0.4 : kind === 'tree' ? 1.0 : kind === 'wall' ? fr : Math.min(fr, 2.5);
        if (rad && !free(x, z, rad)) continue;
        if (LY.skip && LY.skip(kind, x, z)) continue;
        if (kind !== 'grass' && Math.hypot(x, z) < 2.5 && node.home) continue;
        const ry = r() * 6.28; if (g && kind === 'tree' && d > R * 0.5 && LOV[v.n]) { const lv = LOV[v.n]; if (lv) { put(lv, x, z, s, ry, undefined, false, WGen.ic(g, kind, x, z, r)); if (rad) mark(x, z, rad); cols.push({ x, z, r: 0.35 * s }); continue; } } put(v.t, x, z, s, ry, undefined, false, g ? WGen.ic(g, fkind || kind, x, z, r) : undefined); if (rad) mark(x, z, rad * (kind === 'plant' ? 0.5 : 1));
        if (kind === 'tree') cols.push({ x, z, r: 0.35 * s });
        else if (kind === 'rock' || kind === 'prop' || kind === 'lamp') { if (fr > 0.25) cols.push({ x, z, r: Math.min(fr * 0.85, 2.4) }); }
        else if (kind === 'wall') { // 长条墙：沿长轴放一串圆
          const lx = v.t.size.x * s, lz = v.t.size.z * s, long = Math.max(lx, lz), w = Math.max(0.5, Math.min(lx, lz) * 0.5), k = Math.max(1, Math.ceil(long / (w * 1.6)));
          const ax = lx >= lz ? new V3(Math.cos(ry), 0, -Math.sin(ry)) : new V3(Math.sin(ry), 0, Math.cos(ry));
          for (let j = 0; j < k; j++) { const t = (j + 0.5) / k - 0.5; cols.push({ x: x + ax.x * t * long, z: z + ax.z * t * long, r: w }); }
        }
        if (kind === 'lamp') { const pl = new THREE.PointLight('#ffc070', 1.5, 10, 2); pl.position.set(x, H(x, z) + v.t.size.y * s * 0.9, z); sc.add(pl); }
      }
    }
    if (!LITE && window.WTerrain) try { WTerrain.outcrops({ H, R, put, variants, cols, st, node, pick, doorList, LYk: LY.k, k: window.WorldMaster ? [0.6, 1, 1.3][WorldMaster.terr() === 2 ? 2 : WorldMaster.terr()] : 1 }); } catch (e) { console.warn('outcrops', e); } // R46：陡坡岩石
    // 山坡上也长草/灌木（不投影、无碰撞）
    if (!LITE) for (const [list, dens, s0, s1, kind, fkind] of st.props) {
      if ((kind !== 'grass' && kind !== 'plant') || fkind === 'flower') continue; const vs = variants(list); if (!vs.length) continue;
      const ha = Math.PI * ((R + 18) * (R + 18) - R * R) / 100, n = Math.min(kind === 'grass' ? 1200 : 150, Math.round(dens * ha * 0.35));
      for (let i = 0; i < n; i++) { const a = r() * 6.28, rr = Rf(a) + 0.5 + r() * 17.5, v = pick(r, vs); if (g && !WGen.keep(g, kind, Math.cos(a) * rr, Math.sin(a) * rr, r)) continue; put(v.t, Math.cos(a) * rr, Math.sin(a) * rr, (s0 + r() * (s1 - s0)) * 1.1, r() * 6.28, null, true, g ? WGen.ic(g, kind, Math.cos(a) * rr, Math.sin(a) * rr, r) : undefined); }
    }
    // 边界：两圈（近圈贴着可走边界，远圈在山坡上当背景）
    if (st.edge && !LITE) {
      const [list, spacing, s0, s1] = st.edge, vs = variants(list.map(n => LO[n] && MODELS[n + '_lo'] ? n + '_lo' : n));
      if (vs.length) for (const [rr0, rr1, sk] of [[R + 0.8, R + 5, 1], [R + 7, R + 22, 1.35]]) {
        const n = Math.round(Math.PI * 2 * (rr0 + rr1) / 2 / (spacing * (sk > 1 ? 1.8 : 1)));
        for (let i = 0; i < n; i++) {
          const a = i / n * Math.PI * 2 + (r() - 0.5) * 0.3 / n * 6; const rr = rr0 + r() * (rr1 - rr0) + (Rf(a) - R);
          if (sk === 1 && doorList.some(d => Math.abs(Math.atan2(Math.sin(a - d.a), Math.cos(a - d.a))) * R < 3.2)) continue;
          const v = pick(r, vs), s = (s0 + r() * (s1 - s0)) * sk, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
          put(v.t, x, z, s, r() * 6.28, null, sk > 1, g ? WGen.ic(g, 'tree', x, z, r) : undefined);
        }
      }
    }
    // 实例化
    if (g && g.wd) for (const M of [inst, instNS]) for (const [tm, ms] of M) { const k = ms.filter(m => m.keep || g.wd(m.elements[12], m.elements[14]).d >= 0); if (k.length !== ms.length) M.set(tm, k); } // 水里不长树/石头
    for (const [M, ns] of [[inst, false], [instNS, true]]) for (const [tm, ms] of M) for (const p of tm.parts) {
      const im = new THREE.InstancedMesh(p.geo, p.mat, ms.length);
      ms.forEach((m, i) => im.setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(m, p.m)));
      if (g) { const leaf = p.mat.alphaTest > 0; ms.forEach((m, i) => { const u = m.uc; im.setColorAt(i, u ? (leaf ? u.L : u.B) : WHITE); }); }
      im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; im.castShadow = !ns && !(p.mat.alphaTest > 0 && tm.size.y < 1.2); im.receiveShadow = !ns; sc.add(im);
    }
    // 门
    const doors = doorList.map(d => {
      const home = d.to < 0, g = new THREE.Group(); g.position.set(d.x, H(d.x, d.z), d.z); g.rotation.y = -d.a - Math.PI / 2; sc.add(g);
      const gate = window.Assets && Assets.fit(home ? 'large_castle_door' : 'large_iron_gate', { h: home ? 3.4 : 3.2 }); if (gate) { g.add(gate); }
      // 门两侧灯笼 + 火光
      for (const sx of [-1, 1]) { const ln = window.Assets && Assets.fit('Lantern_01', { h: 0.45, x: sx * 1.7, y: 2.2, z: 0.2 }); if (ln) g.add(ln); }
      const pl = new THREE.PointLight(home ? '#ffb070' : '#9ab8ff', 1.4, 7, 2); pl.position.set(0, 2.4, 1.0); g.add(pl);
      const label = makeLabel('', home ? '#ffd9a0' : '#cfe0ff'); label.position.set(0, 4.4, 0); g.add(label);
      cols.push({ x: d.x + Math.cos(d.a + Math.PI / 2) * 1.7, z: d.z + Math.sin(d.a + Math.PI / 2) * 1.7, r: 0.45 }, { x: d.x - Math.cos(d.a + Math.PI / 2) * 1.7, z: d.z - Math.sin(d.a + Math.PI / 2) * 1.7, r: 0.45 });
      return Object.assign(d, { g, label, home });
    });
    return { site: LY.slots ? LY : null, sc, H, R, Rf: LP ? Rf : null, wx: (LPX && LPX.wx) || GD ? (dt, p, now) => { if (LPX && LPX.wx) LPX.wx(dt, p, now); if (GD) GD.update(dt, p, now); } : null, tag: [LP ? LP.tag : '', g ? g.tag.join(' · ') : ''].filter(Boolean).join(' · '), lp: LP, cols, doors, inter, sun, sunDir, terr, style: st, spots, lay: LY.k, bossAt: LY.boss ? new V3(LY.boss.x, 0, LY.boss.z) : null };
  }
  // 画布文字 → 精灵（门牌/气泡）
  function makeLabel(text, col) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128; const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false })); sp.scale.set(5.2, 1.3, 1); sp.renderOrder = 5;
    sp.userData.set = (s, cc) => { const g = c.getContext('2d'); g.clearRect(0, 0, 512, 128); g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 10; g.strokeStyle = 'rgba(0,0,0,.85)'; g.strokeText(s, 256, 64); g.fillStyle = cc || col; g.fillText(s, 256, 64); t.needsUpdate = true; };
    sp.userData.set(text); return sp;
  }
  let glowTex = null;
  function glow() { if (glowTex) return glowTex; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); glowTex = new THREE.CanvasTexture(c); return glowTex; }

  // ================= 猎物（魂光，第 4 步换真实身体）=================
  function spot(B, r) { if (B.spots && B.spots.length) { const s = B.spots.shift(); return new V3(s.x, 0, s.z); } let x = 0, z = 0; for (let t = 0; t < 30; t++) { const a = r() * 6.28, d = B.R * (0.3 + r() * 0.55); x = Math.cos(a) * d; z = Math.sin(a) * d; if (B.cols.every(c => Math.hypot(c.x - x, c.z - z) > c.r + 0.8) && B.doors.every(dd => Math.hypot(dd.x - x, dd.z - z) > 5)) break; } return new V3(x, 0, z); }
  // 给 js/foe.js 的接口
  function beastCtx(B, node) { // 给 js/beasts.js 的接口：复用 foeCtx 的受击/格挡/事件/伤害换算
    const fc = foeCtx(B, node), sp = mulberry(node.seed ^ 0x2545F491);
    return { sc: B.sc, H: B.H, cols: B.cols, R: B.R, doors: B.doors, pos: () => W.pos, st: () => G.st(), sees: (pos, maxD) => sees({ pos }, maxD), spot: () => spot(B, sp),
      hitPlayer: fc.hitPlayer, event: fc.event, floatDmg: fc.floatDmg, power: fc.power, toast: (t, c, s) => G.toast && G.toast(t, c, s), shake: (v) => { W.shake = Math.max(W.shake || 0, v); }, W: () => W };
  }
  function foeCtx(B, node) {
    return {
      sc: B.sc, H: B.H, cols: B.cols, R: B.R, doors: B.doors, pvel: W.vel, escaped: (fo) => { const nd = W.graph.nodes[W.cur], i = nd.prey.indexOf(fo.h); if (i >= 0) nd.prey.splice(i, 1); G.toast && G.toast(`🚪 ${NM(fo.h.c)} 从门逃走了……（首级没了）`, '#ffb080', 2.4); W.trip.log.push({ t: `${fo.h.c.name}从「${nd.name}」的门逃走了。` }); if (W.stats) W.stats.combo = 0; }, player: { pos: W.pos, get yaw() { return G.player.yaw; }, get crouch() { return G.player.crouch; } },
      st: () => G.st(), sees: (pos, maxD) => sees({ pos }, maxD), say: (anchor, text, col) => { if (text) say(anchor, text, col); },
      floatDmg: (pos, n, big) => floatDmg(pos, n, big), renderer: G.renderer, camera: G.camera, event: (t, fo, d) => foeEvent(t, fo, d), windup: (fo, clip) => { if (window.CombatFX && CombatFX.on) { CombatFX.windup(fo, clip); return; } const dd = W ? Math.hypot(fo.pos.x - W.pos.x, fo.pos.z - W.pos.z) : 5, v = Math.max(0, 1 - dd / 14); if (!v) return; SFX.play && SFX.play('draw', 0.5 * v, 0.62, 0.05); if (/Heavy|Sword_Attack/.test(clip)) SFX.play && SFX.play('heavy', 0.45 * v, 0.7, 0.05); }, // 第十九轮：起手音 toast: (t, c, d) => G.toast && G.toast(t, c, d), shake: (k) => { W.shake = Math.max(W.shake || 0, k); },
      playerSwinging: () => !!(window.Combat && Combat.drawn && Combat.state && (Combat.state.lmb || Combat.state.sw || Combat.state.thrust > 0)),
      playerAiming: () => !!(window.Combat && Combat.drawn && Combat.state && (Combat.state.lmb || Combat.state.tipSpeed > 3)),
      handAng: (fo) => { const CS = window.Combat && Combat.drawn && Combat.state; if (!CS) return null; // 第十八轮：刀尖锁准星 → 刀来自“准星相对这个敌人”的方向；挥动中用挥动来向
        if (CS.sw && CS.sw.v) return Math.atan2(-CS.sw.v.y, -CS.sw.v.x); // R26：出刀中用刀路来向
        if (CS.lmb && CS.mv && CS.mv.lengthSq() > 4e4) return Math.atan2(-CS.mv.y, -CS.mv.x);
        if (fo && fo.pos) { const p = _hv.set(fo.pos.x, fo.pos.y + 1.2, fo.pos.z).project(G.camera); if (p.z < 1 && Math.hypot(p.x, p.y) > 0.08) return Math.atan2(-p.y, -p.x); }
        return Math.atan2(CS.hand.y + 0.1, CS.hand.x - 0.04); },
      clang: (p, type) => { Foe.spark(p, type === 'break' ? 26 : 14, type === 'break' ? 'blue' : null); if (window.CombatFX && CombatFX.on) CombatFX.clang(type, p); else { SFX.play && SFX.play('bell', type === 'break' ? 0.5 : 0.3, type === 'break' ? 1.6 : 2.4); SFX.thud && SFX.thud(0.9); }
        if (type === 'block' && window.Combat) { Combat.recoil(1); G.toast && G.toast('🛡️ 被她挡住了——换个方向砍，或蓄力重斩破防', '#9fd0ff', 1.1); } if (type === 'break') { W.shake = Math.max(W.shake || 0, 0.35); G.toast && G.toast('💥 破防！', '#9fd0ff', 1.1); } },
      power: (fo) => { const wk = window.RPG && RPG.wpnK ? RPG.wpnK() : 1; /* MOD weak_starter */ if ((window.FoeAbs && FoeAbs.on)) return FoeAbs.power() * (window.Gear2 ? Gear2.hitMul() : 1) * wk; const q = G.st().power / ((fo.boss ? node.loc.rec * (fo.boss.pow || 2) : node.loc.rec * [0.7, 0.9, 1.15, 1.5, 2.1][fo.rar])); return Math.pow(clamp(q, 0.25, 3), 0.7) * (window.Sack ? Sack.dmgMul() : 1) * wk; },
      rec: (fo) => node.loc.rec * (fo.boss ? (fo.boss.pow || 2) : [0.7, 0.9, 1.15, 1.5, 2.1][fo.rar]), // R34：这个敌人的“推荐战力”（foe_ai2 按它缩放血量/伤害）
      hitPlayer: (fo, n, h = {}) => { const s = G.st(); if ((window.FoeAbs && FoeAbs.on)) n = FoeAbs.conv(fo, n, s, node.loc.rec); if (window.Talents && Talents.avoid(fo, h)) return; n = Math.max(1, Math.round(n * (1 - s.dodge * 0.5) * (1 - Math.min(0.5, s.def / (s.def + 300)))));
        const now = performance.now() / 1000, CS = window.Combat && Combat.drawn && !(window.Stamina && Stamina.ex) && Combat.state; // 力竭：格挡失效
        // 闪身无敌帧
        if (W.dodgeT > now) { const perfect = now - W.dodgeAt < 0.22; if (perfect) { W.shake = Math.max(W.shake || 0, 0.25); fo.broken = Math.max(fo.broken || 0, 1.1); fo.stag = Math.max(fo.stag || 0, 0.9); G.toast && G.toast('💨 完美闪避！她露出了破绽', '#c8f0ff', 1.4); foeEvent('perfectdodge', fo); } else foeEvent('dodge', fo); return; }
        const tip = CS && CS.lastTip ? CS.lastTip.clone() : W.pos.clone().add(new V3(0, 1.3, 0));
        if (CS && CS.rmb && !h.unblock && guardFacing(fo.pos)) { // R34：h.unblock = 破防技，格挡无效（只能闪身/躲开）
          const gA = CS.gAng, diff = h.thrust ? 0 : Math.abs(Math.atan2(Math.sin(gA - h.ang), Math.cos(gA - h.ang)));
          const aligned = diff < 0.7, partial = diff < 1.25;
          const pressed = CS.guardT && now - CS.guardT < 0.3, swung = aligned && !h.thrust && Combat.guardWas(0.25, h.ang) > 1.0; // 刚按下 / 最后一刻转对方向
          if (aligned && (pressed || swung)) { // 完美格挡（重击也能弹）
            G.toast && G.toast('⚔️ 完美格挡！她露出了破绽——砍脖子或按 E 处决', '#ffe070', 1.8); SFX.play && SFX.play('bell', 0.6, 1.8); SFX.thud && SFX.thud(1); W.shake = Math.max(W.shake || 0, 0.3);
            Foe.spark(tip, 30); G.flash && G.flash('#fff6c0', 0.35, 160); Foe.parried(fo); foeEvent('parry', fo); return; }
          if (h.heavy) { n = Math.round(n * 0.75); CS.stam = 0; G.toast && G.toast('🟧 重击挡不住！要么完美格挡，要么按 Q 闪开', '#ffb060', 1.6); SFX.thud && SFX.thud(1); W.shake = Math.max(W.shake || 0, 0.45); }
          else if (aligned && CS.stam > 0) { n = Math.round(n * (h.thrust ? 0.35 : 0.1)); CS.stam = Math.max(0, CS.stam - 14); Foe.spark(tip, 14); SFX.play && SFX.play('bell', 0.3, 2.3); SFX.thud && SFX.thud(0.8); fo.stag = fo.boss ? 0.3 : 0.45; foeEvent('guard', fo); }
          else if (partial) { n = Math.round(n * 0.5); Foe.spark(tip, 5); G.toast && G.toast('🛡️ 格挡偏了', '#cfe0ff', 0.7); }
          else { G.toast && G.toast('❌ 格挡方向错了！', '#ff9080', 0.8); G.flash && G.flash('#a00000', 0.4, 280); W.shake = Math.max(W.shake || 0, 0.25); }
        } else { G.flash && G.flash('#a00000', 0.4, 280); W.shake = Math.max(W.shake || 0, fo.boss ? 0.5 : 0.25); }
        if (W.stats) W.stats.combo = 0;
        if (window.Talents && n > 0) n = Talents.inDmg(fo, n, h); // R36：减伤 / 护盾 / 荆棘 / 不屈
        if (n > 0) { if (window.Sack) Sack.interrupt(); if (window.CombatFX) CombatFX.hurt(n, fo, h); if (window.Recall) Recall.hurtBy(fo, n); G.damage(n); W.trip.log.push({ t: `${NM(fo.h.c)}${fo.boss ? '' : '反击'}，你受了伤。`, d: `-${n} HP` }); } },
      bossMeet: (fo) => { W.dom.boss.style.display = 'block'; W.boss = { B: fo.boss, pos: fo.pos, foe: fo, hp: 100, dead: false, sayT: 0 }; bossSay(fo.boss.say || pick(Math.random, fo.boss.taunt), 3); },
      bossHp: (fo) => { W.dom.bossHp.style.width = Math.max(0, fo.hp / fo.maxHp * 100) + '%'; if (W.boss && W.boss.sayT <= 0 && Math.random() < 0.3) { bossSay(pick(Math.random, fo.boss.hurt), 2); W.boss.sayT = 4; } },
      onDeath: (fo) => { const nd = W.graph.nodes[W.cur], i = nd.prey.indexOf(fo.h); if (i >= 0) nd.prey.splice(i, 1); if (window.Sack) Sack.corpse(fo, W);
        if (fo.boss) { bossSay(fo.boss.lose, 4); W.dom.boss.style.display = 'none'; G.flash && G.flash('#ffffff', 0.8, 600); SFX.fanfare && SFX.fanfare(3); W.shake = 1; setTimeout(() => G.toast && G.toast(`👑 ${fo.boss.title}倒下了——砍下她的头，带回去！`, fo.boss.col || '#ffd060', 4), 1200); } }
    };
  }
  // ---- 战斗感与成就感：连击、击杀奖励、成就、战绩 ----
  const ACH = [
    ['k1', 'kill', 1, '初猎', '第一次亲手放倒猎物'], ['k25', 'kill', 25, '林间恶名', '累计放倒 25 人'], ['k100', 'kill', 100, '魂首窟之主', '累计放倒 100 人'],
    ['d1', 'decap', 1, '第一颗首级', '第一次斩首'], ['d10', 'decap', 10, '刽子手', '累计斩首 10 次'], ['d50', 'decap', 50, '首级收藏家', '累计斩首 50 次'],
    ['e1', 'execute', 1, '处决', '完美格挡后一刀斩首'], ['e10', 'execute', 10, '以刃还刃', '处决 10 次'], ['o1', 'onecut', 1, '一刀', '毫发未伤时一刀斩首'], ['o10', 'onecut', 10, '居合', '一刀斩首 10 次'],
    ['p10', 'parry', 10, '铁壁', '完美格挡 10 次'], ['p1', 'parry', 1, '弹刀', '第一次完美格挡'], ['g5', 'guardbreak', 5, '碎盾', '蓄力重斩破防 5 次'], ['v5', 'perfectdodge', 5, '残影', '完美闪避 5 次'], ['s10', 'sever', 10, '拆解', '断肢 10 次'], ['h1', 'halve', 1, '腰斩', '第一次腰斩'], ['c10', 'combo', 10, '连斩', '一次连击 10 下'], ['c20', 'combo', 20, '血舞', '一次连击 20 下'],
    ['m3', 'multi', 3, '三杀', '8 秒内放倒 3 人'], ['b1', 'boss', 1, '弑主', '砍下第一位霸主的头']
  ];
  const REW = { guardbreak: [5, '破防'], perfectdodge: [6, '完美闪避'], outflank: [2, '破绽'], kill: [6, '击杀'], decap: [10, '斩首'], decapAlive: [16, '活斩'], execute: [30, '处决！'], onecut: [40, '一刀斩首！'], sever: [3, '断肢'], halve: [8, '腰斩'], parry: [4, '完美格挡'] };
  const _hv = new V3();
  function achAdd(key, v, set) {
    const S = G.S; S.ach = S.ach || { got: {}, n: {} }; const n = S.ach.n; n[key] = set ? Math.max(n[key] || 0, v) : (n[key] || 0) + v;
    for (const [id, k, need, name, d] of ACH) if (k === key && !S.ach.got[id] && n[key] >= need) { S.ach.got[id] = Date.now(); setTimeout(() => { achBanner(name, d); }, 500); W && W.trip.log.push({ t: `🏆 成就：${name}（${d}）`, cls: 'gethead' }); }
  }
  function achBanner(name, d) {
    if (!W || !W.dom) return; const el = document.createElement('div'); el.className = 'wach'; el.innerHTML = `<div class="a1">🏆 成就解锁</div><div class="a2">${esc(name)}</div><div class="a3">${esc(d)}</div>`;
    W.dom.root.appendChild(el); SFX.fanfare && SFX.fanfare(3); setTimeout(() => el.classList.add('out'), 2600); setTimeout(() => el.remove(), 3400);
  }
  function gainXp(n) { // 食人魔升级：经验来自战斗事件；升级永久加属性，回一部分血
    const S = G.S, s0 = G.st(); if (window.Balance && Balance.on()) { try { const nd = W && W.graph && W.graph.nodes[W.cur]; n = n * Balance.xpK(nd && nd.loc ? nd.loc.rec : 40); } catch (e) { } } if (G.xpMul) { const x = n * G.xpMul() + (S._xf || 0); n = Math.floor(x); S._xf = x - n; if (n < 1) return; } const up = RPG.addXp(S, n); if (!up) return; if (window.Talents) Talents.onLevel(up); const s1 = G.st();
    S.hp = Math.min(s1.maxHp, S.hp + Math.round(s1.maxHp * 0.35));
    const d = [['str', '力量'], ['con', '体魄'], ['agi', '敏捷'], ['ter', '凶威'], ['soul', '魂力']].filter(([k]) => s1[k] > s0[k]).map(([k, n]) => `${n}+${s1[k] - s0[k]}`).concat(s1.maxHp > s0.maxHp ? [`生命+${s1.maxHp - s0.maxHp}`] : []).join(' · ');
    achBanner(`升级！Lv.${up.to}`, d || '继续变强'); W && W.trip.log.push({ t: `⬆️ 食人魔升到 Lv.${up.to}（${d}）`, cls: 'gethead' }); SFX.levelup && SFX.levelup(); G.save && G.save();
  }
  // 第二十六轮(i) 修“血掉到 0 不死 / 一刀冒一堆数字”：下面这行的 const now/st 以前被行尾注释吞掉 → 每次命中 ReferenceError(st) →
  //   foe.js hit() 在扣血后、判定死亡前被打断（永远不死），combat.js 也没来得及把目标记为“已命中” → 同一刀每帧重复命中。
  //   现在：声明单独成行；整个事件处理包 try/catch——音效/日志/成就里的任何 bug 都不能再打断伤害结算。
  function foeEvent(t, fo, d) { try { foeEvent0(t, fo, d); } catch (e) { console.warn('foeEvent', t, e); } }
  function foeEvent0(t, fo, d) {
    if (!W) return; if (window.Talents) { try { Talents.onEvent(t, fo, d); } catch (e) { console.warn('Talents', e); } } /* R36 天赋事件（吸血/魂能/暴击联动） */ if (window.Recall) { try { Recall.log(fo, t, d); } catch (e) { console.warn(e); } } if (window.CombatFX) { try { CombatFX.event(t, fo, d); } catch (e) { console.warn(e); } } // 第二十二轮（续 9）：命中/击杀/格挡音效 + 命中准星
    const now = performance.now() / 1000, st = W.stats = W.stats || { kill: 0, decap: 0, execute: 0, onecut: 0, sever: 0, halve: 0, parry: 0, combo: 0, maxCombo: 0, lastHit: 0, kills: [] };
    if (t === 'hit') { st.combo = now - st.lastHit < 2.5 ? st.combo + 1 : 1; st.lastHit = now; st.maxCombo = Math.max(st.maxCombo, st.combo); showCombo(st.combo, d && d.brk); if (st.combo >= 10) achAdd('combo', st.combo, true); return; }
    const rw = REW[t]; if (rw) { const tm = window.Talents ? Talents.rewardMul(fo) : { c: 1, x: 1 }, mul = 1 + (fo.rar || 0) * 0.5 + (fo.boss ? 3 : 0), c = Math.round(rw[0] * mul * (1 + Math.min(1, st.combo / 20)) * tm.c); G.addCoins(c); W.trip.coins += c; gainXp(Math.max(1, Math.round(rw[0] * mul * 0.8 * tm.x)));
      floatDmg(fo.anchor ? fo.anchor.pos : fo.pos, `${rw[1]} +${c}🔮`, t === 'execute' || t === 'onecut'); SFX.coins && SFX.coins(); }
    if (t in st) st[t]++;
    if (t === 'kill') { st.kills = st.kills.filter(x => now - x < 8); st.kills.push(now); if (st.kills.length >= 2) { const nm = ['', '', '双杀！', '三杀！', '四杀！', '屠戮！'][Math.min(5, st.kills.length)]; G.toast && G.toast(`💀 ${nm}`, '#ff7060', 1.6); achAdd('multi', st.kills.length, true); } }
    if (t === 'decap') achAdd('decap', 1);
    if (['kill', 'execute', 'onecut', 'sever', 'halve', 'parry', 'guardbreak', 'perfectdodge'].includes(t)) achAdd(t, 1);
    if (t === 'kill' && [10, 25].includes((G.S.ach && G.S.ach.n.kill) || 0)) setTimeout(() => achBanner('新技能解锁', (G.S.ach.n.kill === 10 ? '📣 R 战吼：震慑周围敌人' : '🌀 G 旋风斩：斩击周围一圈')), 1200);
  }
  function showCombo(n, brk) {
    if (!W || !W.dom) return; let el = W.dom.combo; if (!el) { el = W.dom.combo = document.createElement('div'); el.className = 'wcombo'; W.dom.root.appendChild(el); }
    if (n < 2) { el.style.opacity = 0; return; } el.innerHTML = `<b>${n}</b><span>连击${brk ? ' · 破绽' : ''}</span>`; el.style.opacity = 1; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = 0; }, 2400);
  }
  // ---- 技能：Q 闪身（无敌帧）· E 处决（破绽中）· R 战吼（放倒 10 人解锁）· G 旋风斩（放倒 25 人或斩一位霸主解锁）----
  const SKILL = { KeyQ: { n: '闪身', icon: '💨', cd: 0.9, st: 22 }, KeyR: { n: '战吼', icon: '📣', cd: 16, st: 0, need: ['kill', 10] }, KeyG: { n: '旋风斩', icon: '🌀', cd: 7, st: 45, need: ['kill', 25] } };
  function skillOk(k) { const sk = SKILL[k]; if (!sk.need) return true; const A = G.S.ach || { n: {} }; return (A.n[sk.need[0]] || 0) >= sk.need[1] || (k === 'KeyG' && (A.n.boss || 0) > 0); }
  function skill(k) {
    const sk = SKILL[k], now = performance.now() / 1000; W.cds = W.cds || {};
    if (!skillOk(k)) { G.toast && G.toast(`🔒 ${sk.n}：累计放倒 ${sk.need[1]} 人后解锁`, '#aaa', 1.4); return; }
    if ((W.cds[k] || 0) > now) return;
    if (sk.st && window.Combat && Combat.state && !Combat.useStam(sk.st)) { G.toast && G.toast('体力不足', '#ff9a7a', 0.8); return; }
    W.cds[k] = now + sk.cd; const P = G.player;
    if (k === 'KeyQ') { const K = G.keys || {}, f = (K.KeyW ? 1 : 0) - (K.KeyS ? 1 : 0), sd = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0);
      fw.set(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)); rt.set(Math.cos(P.yaw), 0, -Math.sin(P.yaw)); const v = new V3().addScaledVector(fw, f || (sd ? 0 : -1)).addScaledVector(rt, sd).normalize().multiplyScalar(11);
      W.vel.x = v.x; W.vel.z = v.z; W.dashT = 0.2; W.dashV = v; W.dodgeAt = now; W.dodgeT = now + 0.38; SFX.play && SFX.play('draw', 0.5, 0.6); }
    if (k === 'KeyR') { const n = Foe.roar(W.pos, 7); SFX.roar && SFX.roar(1); W.shake = 0.6; G.flash && G.flash('#ffd0a0', 0.25, 300); G.toast && G.toast(`📣 战吼！震慑了 ${n} 人`, '#ffd0a0', 1.4); }
    if (k === 'KeyG') { const n = Foe.aoe(W.pos, 2.7, 1.3); SFX.play && SFX.play('draw', 0.8, 0.9); W.shake = 0.35; W.spinT = 0.35; ring(); G.toast && G.toast(n ? `🌀 旋风斩 ×${n}` : '🌀 旋风斩', '#ffd27a', 1); }
  }
  function ring() { // 旋风斩的刃光环（特效）
    const m = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.9, 48), new THREE.MeshBasicMaterial({ color: '#ffe0a0', transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(W.pos.x, W.pos.y + 1.0, W.pos.z); W.B.sc.add(m); let t = 0;
    const tick = () => { t += 0.016; m.scale.setScalar(1 + t * 9); m.material.opacity = Math.max(0, 0.8 - t * 2.6); if (t < 0.32 && W && W.B) requestAnimationFrame(tick); else { m.parent && m.parent.remove(m); m.geometry.dispose(); m.material.dispose(); } }; tick();
  }
  function skillHud() {
    if (!W || !W.dom) return; let el = W.dom.skills; if (!el) { el = W.dom.skills = document.createElement('div'); el.className = 'wskills'; W.dom.root.appendChild(el); }
    const on = window.Combat && Combat.drawn; { const dsp = on ? 'flex' : 'none'; if (el._d !== dsp) { el._d = dsp; el.style.display = dsp; } } if (!on) return; const now = performance.now() / 1000, cds = W.cds || {};
    const bf = W.foes && Foe.brokenNear(W.pos, G.player.yaw);
    setH(el, Object.entries(SKILL).map(([k, sk]) => { const lock = !skillOk(k), left = Math.max(0, (cds[k] || 0) - now); return `<div class="sk${lock ? ' lock' : ''}${left > 0 ? ' cd' : ''}"><i>${lock ? '🔒' : sk.icon}</i><b>${k.slice(3)}</b><span>${left > 0 ? left.toFixed(1) : sk.n}</span></div>`; }).join('')
      + `<div class="sk${bf ? ' ready' : ' lock'}"><i>🗡️</i><b>E</b><span>处决</span></div>`);
  }
  function tripStats() { const st = W && W.stats; if (!st || !(st.kill || st.decap)) return; W.trip.log.push({ t: `⚔️ 战绩：放倒 ${st.kill} · 斩首 ${st.decap} · 处决 ${st.execute} · 一刀斩首 ${st.onecut} · 断肢 ${st.sever} · 完美格挡 ${st.parry} · 最高连击 ${st.maxCombo}`, cls: 'gethead' }); const msg = `⚔️ 本次战绩：放倒 ${st.kill} · 斩首 ${st.decap} · 处决 ${st.execute} · 最高连击 ${st.maxCombo}`; setTimeout(() => G.toast && G.toast(msg, '#ffd070', 5), 1400); }
  function takeHead(hd) { // 拾取砍下的首级
    const fo = hd.fo, c = hd.h.c, s = G.st(), node = W.graph.nodes[W.cur];
    if (fo.boss) { bossWin(hd.h, fo.boss); return true; }
    if ((window.Sack && Sack.on())) { /* 麻袋格子：Sack 已把首级放进格子（5 秒翻找完成后才调用这里）*/ }
    else if (W.trip.res.heads.length >= s.cap) { G.toast(`麻袋满了（${s.cap} 颗）`, '#aaa', 2.5); return false; }
    else W.trip.res.heads.push(hd.h); W.trip.log.push({ t: `你在「${node.name}」砍下了${NM(c)}的头。`, cls: 'gethead' });
    G.toast(`💀 获得首级【${RN[c.rar]}】${NM(c)}`, RC[c.rar], 3); SFX.squish && SFX.squish(1); if (c.rar >= 2) SFX.fanfare && SFX.fanfare(c.rar);
    return true;
  }
  function spawnPrey(B, node) {
    const r = mulberry(node.seed ^ 0x5bd1e995), out = [];
    node.prey.forEach((h, k) => {
      let x = 0, z = 0; for (let t = 0; t < 30; t++) { const a = r() * 6.28, d = B.R * (0.3 + r() * 0.6); x = Math.cos(a) * d; z = Math.sin(a) * d; if (B.cols.every(c => Math.hypot(c.x - x, c.z - z) > c.r + 0.6)) break; }
      const col = new THREE.Color(RC[h.c.rar]); const g = new THREE.Group();
      const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: col.clone().multiplyScalar(2.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); core.scale.setScalar(0.5);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: col.clone().multiplyScalar(0.7), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); halo.scale.setScalar(1.6);
      g.add(core, halo); const pl = new THREE.PointLight(col, 1.2, 5, 2); g.add(pl); g.position.set(x, B.H(x, z) + 1.4, z); B.sc.add(g);
      out.push({ h, g, core, halo, pos: g.position, home: new V3(x, 0, z), rar: h.c.rar, hp: 1 + h.c.rar, state: 'idle', cd: 0, sayT: 0, seen: false, brave: r() < 0.25 + h.c.rar * 0.12, id: 'prey' + node.i + '_' + k, tr: [] });
    });
    return out;
  }
  function spawnBoss(B, node) {
    const loc = node.loc, Bo = Explore.BOSSES[loc.k]; const col = new THREE.Color(Bo.col || '#ffd060');
    const g = new THREE.Group(); const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: col.clone().multiplyScalar(3), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); core.scale.setScalar(1.3);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: col.clone().multiplyScalar(0.9), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); halo.scale.setScalar(4.2);
    g.add(core, halo); const pl = new THREE.PointLight(col, 3, 12, 2); pl.position.y = 0.3; g.add(pl);
    g.position.set(0, B.H(0, 0) + 1.8, 0); B.sc.add(g);
    const tier = Math.max(0, Lore.LOCS.findIndex(l => l.k === loc.k)); const q = G.st().power / (loc.rec * Bo.pow);
    return { B: Bo, g, core, halo, pl, pos: g.position, hp: 100, q, tier, state: 'wait', t: 0, cd: 2.5, sayT: 0, stag: 0, id: 'boss', met: false, dash: null };
  }

  // ================= 运行 =================
  function start(trip, api) {
    G = window.__game; if (!G) { api.fallback && api.fallback(); return; }
    const bigMap = window.Mods && Mods.on('bigworld'); // 旧的“一整片大陆”保留成可选 MOD（默认关）
    const S = G.S; let graph;
    if (bigMap) {
      if (!S.world || !S.world.seed) S.world = { seed: (Math.random() * 4294967296) >>> 0, vis: [], known: [], stone: -1 };
      graph = genWorld(S.world.seed);
      for (const i of S.world.vis || []) if (graph.nodes[i]) graph.nodes[i].visited = graph.nodes[i].known = true;
      for (const i of S.world.known || []) if (graph.nodes[i]) graph.nodes[i].known = true;
      for (const k of Object.keys(S.bosses || {})) { const R = graph.regions.find(x => x.k === k); if (R) graph.nodes[R.boss].boss = false; }
    } else graph = genTrip(trip.loc, (Math.random() * 4294967296) >>> 0);
    const pool = (trip.res.heads || []).slice(); trip.res.heads = []; // 猎物要亲手砍
    W = { trip, api, graph, pool, cur: -1, B: null, pos: new V3(), vel: new V3(), onGround: true, prey: [], boss: null, dead: false, fade: 0, busy: true, t: 0, stepT: 0, hintT: 0, say: [], camFar: G.camera.far, doorNear: null, mapOpen: false, storySeen: new Set() };
    G.setUI(false); try { G.lockPointer(); } catch (e) {}
    ensureDom(); W.dom.root.style.display = 'block';
    if (!provReg && window.Combat) { Combat.addProvider(targets); provReg = true; }
    if (window.Combat && Combat.setThreats) Combat.setThreats(() => (W && W.foes && window.Foe) ? Foe.threats() : []);
    SFX.music && SFX.music('expedition'); SFX.roar && SFX.roar(0.6);
    const st0 = !graph.trip && graph.nodes[S.world.stone] && graph.nodes[S.world.stone].stone ? S.world.stone : graph.home;
    goto(st0, -1).catch(e => { console.warn('Worlds', e); stop(); api.fallback && api.fallback(); });
  }
  function doorName(node, d) {
    if (d.home) return node.home ? '🕳️ 回魂首窟' : '🌀 魂门 · 回洞';
    const m = W.graph.nodes[d.to]; let t = m.visited ? m.name : m.name + ' ？';
    if (m.boss && m.visited) t += ' 👑';
    if (window.WSites && WSites.ico(m)) t += ' ' + WSites.ico(m) + (m.visited ? '' : ' ' + WSites.label(m)); // R41：集会隔着门就能听见
    if (m.region !== node.region) { const L = m.loc, weak = G.st && G.st().power < L.rec * 0.8; t = `${weak ? '⚠️' : ''}${L.icon}${L.n} · ${t}`; }
    return t;
  }
  function remember(node) {
    const w = G.S.world; if (!w || W.graph.trip) return; w.vis = w.vis || []; w.known = w.known || [];
    if (!w.vis.includes(node.i)) w.vis.push(node.i);
    node.adj.forEach(b => { if (!w.known.includes(b) && !w.vis.includes(b)) w.known.push(b); });
    if (node.stone && w.stone !== node.i) { const first = w.stone !== node.i; w.stone = node.i; if (first && !node.home) setTimeout(() => G.toast && G.toast(`🌀 点亮了魂门「${node.name}」——下次出猎从这里出发，也可从这里回洞`, '#9fd0ff', 5), 900); }
    try { G.save && G.save(); } catch (e) {}
  }
  function stylesOf(i) { return stylesOfN(W.graph.nodes[i]); }
  function stylesOfN(nd) { const lk = layOf(nd), ln = LAYOUTS[lk] ? LAYOUTS[lk].need : []; return stylesOf0(nd).concat(ln).filter((n, k, a) => a.indexOf(n) === k); }
  function stylesOf0(nd) { if (LITE) { const st0 = styleOf(nd); return ['sky_' + st0.sky, 'tex_' + st0.ground]; } const st = styleOf(nd); if (st.g) return WGen.assets(st, nd); const names = ['sky_' + st.sky, 'tex_' + st.ground]; st.props.forEach(p => p[0].forEach(n => names.push(n.replace('#*', '')))); if (st.edge) st.edge[0].forEach(n => { names.push(n.replace('#*', '')); if (LO[n]) names.push(n + '_lo'); }); ['namaqualand_boulder_03', 'namaqualand_boulder_04', 'rock_09', 'horse_statue_01', 'gothic_statue', 'wooden_barrels_01', 'Barrel_02', 'wooden_military_crate', 'dead_tree_trunk', 'dead_tree_trunk_02', 'dead_quiver_trunk'].forEach(n => names.push(n)); return names.filter(n => n !== 'brazier'); }
  function nodeStory(node, canRetreat) {
    if (!W || W.storySeen.has(node.i)) return Promise.resolve(true);
    W.storySeen.add(node.i); document.exitPointerLock && document.exitPointerLock();
    const count = (node.prey || []).length + (node.boss ? 1 : 0), boss = node.boss && window.Explore && Explore.BOSSES[node.region];
    const mood = node.home ? '洞口的魂火在身后渐渐熄灭。前方的风带来陌生的气味，也带来盔甲与脚步的回声。' : node.stone ? '古老魂门在雾中低鸣。这里曾是旅人的避难所，如今只剩被打断的路标和新鲜足迹。' : count ? `这里并不空旷。你听见 ${count} 道不同的呼吸；有人已经发现了门边的影子，却还没有决定迎战还是逃跑。` : '风穿过无人照看的遗迹。没有人回应，但翻倒的容器和未熄的余烬说明这里刚刚有人离开。';
    const goal = boss ? `霸主「${boss.n || boss.name || '未知之主'}」就在此地。她不会像普通守卫那样轻易露出破绽。` : count ? '观察站位、利用障碍；搜刮后仍可回到门边安全撤离。' : '这是搜寻材料、药剂和装备的好机会，但别在角落里放松警惕。';
    return new Promise(resolve => {
      const d = document.createElement('div'); d.id = 'wStory'; d.style.cssText = 'position:fixed;inset:0;z-index:80;display:grid;place-items:center;background:#030202aa;pointer-events:auto';
      d.innerHTML = `<div style="width:min(560px,88vw);max-height:72vh;overflow:auto;padding:24px 26px;background:linear-gradient(145deg,#18110df5,#080706f8);border:1px solid #c99a4f;box-shadow:0 20px 70px #000;border-radius:4px;color:#eadcc7"><div style="font-size:11px;letter-spacing:4px;color:#b98d54">地点遭遇 · ${esc(node.loc.n)}</div><h2 style="margin:8px 0 12px;color:#ffe2a0">${esc(node.name)}</h2><p style="line-height:1.8;color:#d6c9b8">${mood}</p><p style="line-height:1.7;color:#e5bd79">${esc(goal)}</p><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">${canRetreat?'<button data-a="retreat" style="padding:9px 15px;background:#171514;color:#c9bba8;border:1px solid #766">从门边撤回洞窟</button>':''}<button data-a="enter" style="padding:9px 20px;background:#5a3517;color:#ffe9bb;border:1px solid #d5a85c">踏入此地</button></div></div>`;
      const done = ok => { d.remove(); resolve(ok); }; d.onclick = e => { const b=e.target.closest('button'); if(b) done(b.dataset.a==='enter'); }; document.body.appendChild(d);
    });
  }
  async function goto(i, from) {
    W.busy = true; const node = W.graph.nodes[i];
    fadeTo(1); await wait(260);
    W.dom.load.style.display = 'flex'; W.dom.loadT.textContent = `前往「${node.name}」……`;
    const tg0 = performance.now(); PROF.length = 0;
    await need(stylesOf(i), (p) => { W.dom.loadB.style.width = Math.round(p * 100) + '%'; }); tp('need', tg0);
    // 预热相邻地点的资产（后台、空闲时、一次一个）
    setTimeout(() => { if (!W) return; node.adj.forEach(b => warm(stylesOf(b))); }, 800);
    if (!W) return;
    if (W.B) disposeNode();
    W.cur = i; node.visited = true; node.known = true; node.adj.forEach(b => W.graph.nodes[b].known = true); remember(node);
    if (!node.prey) populate(node);
    const tb0 = performance.now(); const B = W.B = buildNode(node); tp('build', tb0);
    W.foes = null; W.prey = []; W.boss = null;
    const wantBoss = node.boss && !(G.S.bosses || {})[node.region] && window.Explore && Explore.BOSSES[node.region];
    if (window.Foe && !/[?&]nofoe=1/.test(location.search) && !(window.Mods && !Mods.on('foe_bodies'))) {
      try {
        const r = mulberry(node.seed ^ 0x5bd1e995), list = [];
        const SL = B.site && B.site.slots; node.prey.forEach((h, k) => { const sl = SL && SL[k]; list.push({ h, pos: sl ? new V3(sl.x, 0, sl.z) : spot(B, r) }); }); // R41：集会里各就各位
        if (wantBoss) { const Bo = Explore.BOSSES[node.region]; node.bossH = node.bossH || RPG.bossHead(G.S, G.st(), node.loc, Bo, G.usedNames, G.usedSig); list.push({ h: node.bossH, pos: B.bossAt || new V3(0, 0, 0), boss: Bo, bossK: node.region }); }
        W.dom.loadT.textContent = `「${node.name}」里有人……`;
        W.foes = await Foe.populate(foeCtx(B, node), list);
        if (W.foes && !W.foes.length && list.length) W.foes = null;
        if (W.foes && B.site && window.WSites) WSites.seat(W.foes, B.site);
      } catch (e) { console.warn('Foe', e); W.foes = null; }
    }
    if (!W.foes) { W.prey = spawnPrey(B, node); W.boss = wantBoss ? spawnBoss(B, node) : null; }
    // 门牌
    B.doors.forEach(d => { d.label.userData.set(doorName(node, d)); });
    // 出生点：来的那扇门内侧
    const d0 = B.doors.find(d => d.to === from) || B.doors.find(d => d.home) || B.doors[0];
    const ins = d0 ? new V3(-Math.cos(d0.a), 0, -Math.sin(d0.a)) : new V3(0, 0, 1);
    W.pos.set((d0 ? d0.x : 0) + ins.x * 2.4, 0, (d0 ? d0.z : 0) + ins.z * 2.4); W.pos.y = B.H(W.pos.x, W.pos.z); W.vel.set(0, 0, 0);
    if (window.Beasts && !/[?&]nobeast=1/.test(location.search) && !(window.Mods && Mods.on('beasts') === false)) { // 第二十二轮：野兽（掉材料，不掉首级）
      try { W.dom.loadT.textContent = `「${node.name}」的荒野里有野兽的气味……`; await Beasts.spawn(beastCtx(B, node, r0 => r0), node); } catch (e) { console.warn('Beasts', e); }
    }
    G.player.yaw = Math.atan2(-ins.x, -ins.z); G.player.pitch = -0.05;
    B.sc.add(G.camera); G.camera.far = 400; G.camera.updateProjectionMatrix();
    if (window.Combat && Combat.attach) Combat.attach(B.sc);
    try { const tc0 = performance.now(); const cm = G.camera; cm.position.set(W.pos.x, W.pos.y + EYE, W.pos.z); cm.rotation.set(G.player.pitch, G.player.yaw, 0, 'YXZ'); cm.updateMatrixWorld(true); if (G.post && G.post.on) G.post.render(B.sc, cm); else G.renderer.render(B.sc, cm); tp('firstframe', tc0); } catch (e) { console.warn('precompile', e); } // 进场前先渲一帧：着色器编译/贴图上传都藏在加载画面后面
    tp('total', tg0); W.dom.load.style.display = 'none'; hud(); banner(node);
    if (window.Mods && Mods.on && Mods.on('loc_story')) { const enter = await nodeStory(node, true); if (!W) return; if (!enter) { leaveHome(); return; } try { G.lockPointer(); } catch (e) {} } // 第二十一轮：用户不要进场冻结剧情卡 → MOD loc_story 默认关
    await wait(60); fadeTo(0); W.busy = false;
    if (window.Overhear) try { Overhear.enter(node, { log: t => W && W.trip && W.trip.log.push({ t, cls: 'note' }) }); } catch (e) { console.warn(e); } // 第二十七轮：进场偷听对话框
    if (W.boss) setTimeout(() => { if (W && W.boss) bossSay(W.boss.B.say, 5); }, 1500);
  }
  function disposeNode() {
    const B = W.B; if (!B) return;
    if (window.Foe) Foe.clear(); if (window.Beasts) Beasts.clear();
    B.sc.traverse(o => { if (o.isInstancedMesh) o.dispose && o.dispose(); if (o.userData.sky) { o.geometry.dispose(); o.material.dispose(); } if (o.userData.wg) { o.geometry.dispose(); o.material.dispose(); } if (o.isSprite && o.material.map && o.material.map.isCanvasTexture && o.material.map !== glowTex) { o.material.map.dispose(); o.material.dispose(); } });
    B.terr.geometry.dispose(); B.terr.material.dispose && B.terr.material.dispose();
    if (B.sun.shadow && B.sun.shadow.map) B.sun.shadow.map.dispose();
    W.say.forEach(s => s.el.remove()); W.say = []; W.B = null;
  }
  function stop() {
    if (!W) return; const w = W; if (window.Combat && Combat.setThreats) Combat.setThreats(null); if (W.dom && W.dom.skills) W.dom.skills.style.display = 'none';
    if (w.B) disposeNode();
    G.scene.add(G.camera); G.camera.far = w.camFar; G.camera.updateProjectionMatrix();
    if (window.Combat && Combat.attach) Combat.attach(G.scene);
    if (window.Combat && Combat.drawn) Combat.toggle(false);
    if (w.dom) w.dom.root.style.display = 'none'; if (DOM) { DOM.map.style.display = 'none'; DOM.fade.style.opacity = 0; }
    W = null;
  }
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  function leaveHome() {
    const api = W.api, won = window.Explore && Explore.checkVictory ? Explore.checkVictory() : false;
    W.busy = true; fadeTo(1);
    if ((window.Sack && Sack.on())) { W.trip.res.heads = W.trip.res.heads.filter(h => h.__boss).concat(Sack.heads()); Sack.tripEnd(); }
    tripStats();
    setTimeout(() => { stop(); api.finish(); G.setUI(false); try { G.lockPointer(); } catch (e) {} if (won) setTimeout(() => Explore.victoryScreen(), 900); }, 400);
  }
  function dieNow() {
    if (!W || W.dead) return; W.dead = true; W.busy = true; if (window.Sack) Sack.onDeath();
    G.flash && G.flash('#600000', 0.9, 1500); W.trip.log.push({ t: `你倒在了「${W.graph.nodes[W.cur].name}」。` });
    const api = W.api; setTimeout(() => { stop(); api.die(); }, 1200);
  }

  // ================= 每帧（由 game.js 主循环调用）=================
  const fw = new V3(), rt = new V3(), want = new V3(), tmp = new V3();
  function frame(dt, now) {
    if (!W || !W.B) { if (W && G.post && G.post.on && W.B) G.post.render(W.B.sc, G.camera); return; }
    const B = W.B, P = G.player, K = G.keys || {}; W.t += dt; WIND.value = now;
    const active = G.playing && !G.uiOpen && !W.busy && !W.mapOpen && !W.dead;
    if (active) {
      const f = (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0), s = (K.KeyD || K.ArrowRight ? 1 : 0) - (K.KeyA || K.ArrowLeft ? 1 : 0);
      P.crouch += ((K.KeyC ? 1 : 0) - P.crouch) * Math.min(1, dt * 12); P.h = EYE - 0.55 * P.crouch;
      // 第二十一轮：疾跑消耗体力（14/秒），耗尽后要恢复到 35 才能再跑 —— 敌人因此追得上
      if (W.run == null) W.run = 100; const wantRun = (K.ShiftLeft || K.ShiftRight) && P.crouch < 0.5 && (f || s); if (!(!window.Mods || Mods.on('sprint_stamina'))) { W.run = 100; W.runTired = false; }
      if (wantRun && !W.runTired) { W.run -= dt * ((!window.Mods || Mods.on('sprint_stamina')) ? 14 : 0); if (W.run <= 0) { W.run = 0; W.runTired = true; G.toast && G.toast('😮‍💨 跑不动了……', '#ffcf9a', 1.2); } } else { W.run = Math.min(100, W.run + dt * (wantRun ? 6 : 18)); if (W.runTired && W.run > 35) W.runTired = false; }
      let sp = (wantRun && !W.runTired ? 6.2 : W.runTired ? 3.1 : 3.6) * (1 - 0.55 * P.crouch);
      if (window.Stamina && Stamina.on) { // 第二十五轮：统一体力（攻击/防御/移动/奔跑/跳跃/闪避共用一条）
        const alert = Foe.foes.some(fo => fo.seen && !fo.dead && Math.hypot(fo.pos.x - W.pos.x, fo.pos.z - W.pos.z) < 16);
        const ex = Stamina.tick(dt, { moving: !!(f || s), run: wantRun, crouch: P.crouch, alert }); W.run = Stamina.val(); W.runTired = Stamina.ex;
        sp = ex ? ex : (wantRun ? 6.2 : 3.6) * (1 - 0.55 * P.crouch); }
      runBar();
      fw.set(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)); rt.set(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
      want.copy(fw).multiplyScalar(f).addScaledVector(rt, s); if (want.lengthSq() > 0) want.normalize().multiplyScalar(sp * (window.Talents ? Talents.moveMul() : 1) * (window.FoeRoles3 ? FoeRoles3.moveK() : 1)); // R37 被网/夹住=定身；R36 移速天赋/增益
      if (W.dashT > 0) { W.dashT -= dt; W.vel.x = W.dashV.x; W.vel.z = W.dashV.z; } else { W.vel.x += (want.x - W.vel.x) * Math.min(1, dt * 10); W.vel.z += (want.z - W.vel.z) * Math.min(1, dt * 10); }
      if (K.Space && W.onGround && P.crouch < 0.3 && (!window.Stamina || Stamina.canJump())) { W.vel.y = 4.4; W.onGround = false; }
    } else { W.vel.x *= 0.8; W.vel.z *= 0.8; }
    W.vel.y -= 14 * dt; W.pos.addScaledVector(W.vel, dt);
    // 碰撞：边界圆 + 物体圆
    const rr = Math.hypot(W.pos.x, W.pos.z), lim = (B.Rf ? B.Rf(Math.atan2(W.pos.z, W.pos.x)) : B.R) - 0.4; if (rr > lim) { W.pos.x *= lim / rr; W.pos.z *= lim / rr; }
    for (const c of B.cols) { const dx = W.pos.x - c.x, dz = W.pos.z - c.z, m = c.r + 0.35, d2 = dx * dx + dz * dz; if (d2 >= m * m) continue; const d = Math.sqrt(d2); if (d > 1e-5) { W.pos.x += dx / d * (m - d); W.pos.z += dz / d * (m - d); } }
    const gy = B.H(W.pos.x, W.pos.z); if (W.pos.y <= gy) { W.pos.y = gy; W.vel.y = 0; W.onGround = true; } else if (W.pos.y > gy + 0.05) W.onGround = false;
    const moving = Math.hypot(W.vel.x, W.vel.z);
    if (W.onGround && moving > 1) { W.stepT -= dt * moving; if (W.stepT <= 0) { W.stepT = 1.7; const nd = W.graph && W.graph.nodes[W.cur], gs = nd && STYLES[nd.style]; if (window.Steps) Steps.ground = gs ? gs.ground : ''; if (!(window.Steps && Steps.player(Steps.ground))) SFX.step && SFX.step(); } } // 第二十四轮：按地面材质的沉重脚步
    const bob = W.onGround ? Math.sin(now * 9) * Math.min(1, moving / 3) * 0.03 : 0;
    const cam = G.camera; cam.position.set(W.pos.x, W.pos.y + P.h + bob, W.pos.z); cam.rotation.set(P.pitch, P.yaw, 0, 'YXZ');
    if (window.Combat && Combat.state && Combat.state.shake > 0) { cam.position.x += (Math.random() - 0.5) * Combat.state.shake * 0.08; cam.position.y += (Math.random() - 0.5) * Combat.state.shake * 0.08; }
    if (W.shake > 0) { W.shake -= dt; cam.position.x += (Math.random() - 0.5) * W.shake * 0.12; cam.position.y += (Math.random() - 0.5) * W.shake * 0.12; }
    // 太阳影子跟随
    B.sun.target.position.set(W.pos.x, W.pos.y, W.pos.z); B.sun.position.copy(B.sun.target.position).addScaledVector(B.sunDir, 70);
    if (B.sc.userData.skyM) B.sc.userData.skyM.position.copy(cam.position);
    if (B.wx) try { B.wx(dt, cam.position, now); } catch (e) { B.wx = null; console.warn(e); }
    if (B.sc.userData.fire) B.sc.userData.fire.intensity = 2.2 * (0.85 + Math.sin(now * 13) * 0.08 + Math.sin(now * 29) * 0.05);
    // 门：靠近提示
    W.doorNear = null; for (const d of B.doors) { const dd = Math.hypot(W.pos.x - d.x, W.pos.z - d.z); if (dd < 2.6) W.doorNear = d; d.label.visible = Math.hypot(cam.position.x - d.x, cam.position.z - d.z) < 34; }
    W.interNear = null; { let bd = 9; for (const it of B.inter) { const dd = Math.hypot(W.pos.x - it.x, W.pos.z - it.z); if (!it.done && dd < (it.corpse ? 2.3 : 1.9) && dd < bd) { bd = dd; W.interNear = it; } } }
    if (window.Sack) Sack.frame(dt);
    // 猎物 / 霸主
    if (W.foes) { Foe.update(dt, now); if (W.boss) W.boss.sayT -= dt; } else { updatePrey(dt, now); if (W.boss) updateBoss(dt, now); }
    if (window.Beasts && Beasts.list.length) Beasts.update(dt, now);
    W.headNear = W.foes ? Foe.nearHead(W.pos, G.player.yaw) : null;
    updateSay();
    if (window.Combat) { try { Combat.update(dt, now); Combat.prerender(); } catch (e) { console.warn(e); } }
    W.hintT -= dt; if (W.hintT <= 0) { W.hintT = 0.12; hud(); skillHud(); }
    if (G.S.hp <= 0) dieNow();
    if (window.CFX3D) try { CFX3D.frame(dt, now); } catch (e) { console.warn(e); } if (window.FPV) try { FPV.frame(dt, now); FPV.pre(dt, now); } catch (e) { console.warn(e); } /* R41：3D 战斗特效 / 第一人称兽人手 / 第三人称（HOOK 在出猎世界里不跑，这里直接调） */
    const post = G.post; if (post && post.setRayLight) post.setRayLight(tmp.set(0, -100, 0), 0);
    if (post && post.on) post.render(B.sc, cam); else G.renderer.render(B.sc, cam);
  }
  function sees(p, maxD) { // 视线：距离 + 前方无墙
    const dx = W.pos.x - p.pos.x, dz = W.pos.z - p.pos.z, d = Math.hypot(dx, dz); if (d > maxD) return false;
    for (const c of W.B.cols) { if (c.r < 0.6) continue; const t = clamp(((c.x - p.pos.x) * dx + (c.z - p.pos.z) * dz) / (d * d), 0, 1); if (Math.hypot(p.pos.x + dx * t - c.x, p.pos.z + dz * t - c.z) < c.r * 0.8) return false; }
    return true;
  }
  function updatePrey(dt, now) {
    const B = W.B, s = G.st();
    for (const p of W.prey) {
      if (p.gone) continue;
      const dx = p.pos.x - W.pos.x, dz = p.pos.z - W.pos.z, d = Math.hypot(dx, dz) || 1e-3;
      const crouchK = G.player.crouch > 0.5 ? 0.55 : 1;
      const see = sees(p, (9 + p.rar * 2) * crouchK);
      if (see && !p.seen) { p.seen = true; say(p, pick(Math.random, PREY_SAY.see), '#fff'); }
      p.cd -= dt; p.sayT -= dt;
      let vx = 0, vz = 0;
      if (p.seen && d < 16) {
        if (p.brave && d < 5) { p.state = 'fight'; vx = -dx / d * 2.4; vz = -dz / d * 2.4; if (d < 1.5 && p.cd <= 0) preyStrike(p, s); }
        else { p.state = 'flee'; const spd = 2.2 + p.rar * 0.45; vx = dx / d * spd; vz = dz / d * spd; if (p.sayT <= 0 && Math.random() < 0.01) { say(p, pick(Math.random, PREY_SAY.flee), '#fff'); p.sayT = 4; } }
        // 被逼到边界时沿切线滑开；被逼急了会反扑
        const pr = Math.hypot(p.pos.x, p.pos.z); if (pr > B.R - 2.5) { const tx = -p.pos.z / pr, tz = p.pos.x / pr, sg = (tx * dx + tz * dz) > 0 ? 1 : -1; vx = vx * 0.3 + tx * sg * 2.6; vz = vz * 0.3 + tz * sg * 2.6; if (d < 2.2 && p.cd <= 0) { if (p.sayT <= 0) { say(p, pick(Math.random, PREY_SAY.fight), '#ffb0a0'); p.sayT = 3; } preyStrike(p, s); } }
      } else { p.state = 'idle'; vx = Math.sin(now * 0.7 + p.rar) * 0.4; vz = Math.cos(now * 0.53 + p.rar * 2) * 0.4; if (d > 20) p.seen = false; }
      p.pos.x += vx * dt; p.pos.z += vz * dt;
      for (const c of B.cols) { const ex = p.pos.x - c.x, ez = p.pos.z - c.z, m = c.r + 0.3, e2 = ex * ex + ez * ez; if (e2 >= m * m) continue; const e = Math.sqrt(e2); if (e > 1e-5) { p.pos.x += ex / e * (m - e); p.pos.z += ez / e * (m - e); } }
      const pr = Math.hypot(p.pos.x, p.pos.z), pl = B.R - 1; if (pr > pl) { p.pos.x *= pl / pr; p.pos.z *= pl / pr; }
      p.pos.y = B.H(p.pos.x, p.pos.z) + 1.35 + Math.sin(now * 2.3 + p.rar) * 0.12;
      const pulse = 1 + Math.sin(now * 5 + p.rar) * 0.12; p.core.scale.setScalar(0.5 * pulse * (p.flash > 0 ? 1.8 : 1)); p.halo.scale.setScalar(1.6 * pulse);
      if (p.flash > 0) p.flash -= dt;
    }
  }
  function guardFacing(from) { // 格挡是否朝向攻击来源
    if (!window.Combat || !Combat.guardDir) return false;
    const dx = from.x - W.pos.x, dz = from.z - W.pos.z, a = Math.atan2(-dx, -dz); return Math.abs(Math.atan2(Math.sin(a - G.player.yaw), Math.cos(a - G.player.yaw))) < 1.0;
  }
  function preyStrike(p, s) {
    p.cd = 1.6 + Math.random();
    let n = Math.max(1, Math.round(s.maxHp * (0.03 + p.rar * 0.015) * (1 - s.dodge)));
    if (guardFacing(p.pos)) { n = Math.round(n * 0.25); G.toast && G.toast('🛡️ 格挡！', '#cfe0ff', 0.6); SFX.thud && SFX.thud(0.6); }
    else { G.flash && G.flash('#a00000', 0.35, 250); W.shake = 0.25; }
    if (n > 0) { if (window.Sack) Sack.interrupt(); G.damage(n); W.trip.log.push({ t: `猎物反扑，你受了伤。`, d: `-${n} HP` }); }
  }
  function capture(p) {
    p.gone = true; W.B.sc.remove(p.g);
    const node = W.graph.nodes[W.cur]; node.prey.splice(node.prey.indexOf(p.h), 1);
    const s = G.st(), c = p.h.c;
    if ((window.Sack && Sack.on())) { if (!Sack.capture(p.h)) { G.toast(`麻袋里没有 2×2 的空位，【${RN[c.rar]}】${NM(c)}的魂光散去了……`, '#aaa', 3); return; } }
    else if (W.trip.res.heads.length >= s.cap) { G.toast(`麻袋满了（${s.cap} 颗），【${RN[c.rar]}】${NM(c)}的魂光散去了……`, '#aaa', 3); return; }
    else W.trip.res.heads.push(p.h); W.trip.log.push({ t: `你在「${node.name}」追上了${NM(c)}。`, cls: 'gethead' });
    G.toast(`💀 获得首级【${RN[c.rar]}】${NM(c)}`, RC[c.rar], 3); SFX.chop && SFX.chop(); SFX.squish && SFX.squish(1); if (c.rar >= 2) SFX.fanfare && SFX.fanfare(c.rar);
  }
  // ---- 霸主：实时战斗（手势战斗命中 + 决斗公式）----
  function updateBoss(dt, now) {
    const bo = W.boss, B = W.B, s = G.st(); if (bo.dead) return;
    const dx = W.pos.x - bo.pos.x, dz = W.pos.z - bo.pos.z, d = Math.hypot(dx, dz) || 1e-3;
    bo.sayT -= dt; bo.t += dt;
    if (!bo.met && d < 14) { bo.met = true; bo.state = 'fight'; bo.cd = 2; W.dom.boss.style.display = 'block'; }
    if (bo.state === 'wait') { bo.pos.y = B.H(bo.pos.x, bo.pos.z) + 1.8 + Math.sin(now * 1.4) * 0.15; return; }
    if (bo.stag > 0) bo.stag -= dt;
    const qa = Math.pow(clamp(bo.q, 0.25, 3), 0.7);
    if (bo.dash) { // 冲刺攻击
      bo.dash.t += dt; const k = Math.min(1, bo.dash.t / 0.35); bo.pos.x = bo.dash.from.x + (bo.dash.to.x - bo.dash.from.x) * k; bo.pos.z = bo.dash.from.z + (bo.dash.to.z - bo.dash.from.z) * k;
      if (!bo.dash.hit && Math.hypot(W.pos.x - bo.pos.x, W.pos.z - bo.pos.z) < 1.6) {
        bo.dash.hit = true; let n = Math.round(s.maxHp * 0.1 / qa * (0.85 + Math.random() * 0.3) * (1 - s.dodge * 0.5) * (1 - Math.min(0.5, s.def / (s.def + 300))));
        if (guardFacing(bo.pos)) { n = Math.round(n * 0.3); bo.stag = 1.2; G.toast('🛡️ 格挡！她失去了平衡——快砍！', '#cfe0ff', 1.2); SFX.thud && SFX.thud(1); }
        else { G.flash && G.flash('#a00000', 0.55, 350); W.shake = 0.6; SFX.roar && SFX.roar(0.3); }
        G.damage(n); W.trip.log.push({ t: `${bo.B.title}${bo.B.n}的攻击命中了你。`, d: `-${n} HP` });
      }
      if (k >= 1) { bo.dash = null; bo.cd = Math.max(1.1, 2.6 - bo.tier * 0.15) + Math.random(); }
    } else if (bo.tele > 0) { bo.tele -= dt; bo.core.material.color.setRGB(3, 0.6, 0.4); if (bo.tele <= 0) { const to = new V3(W.pos.x, 0, W.pos.z).addScaledVector(new V3(dx / d, 0, dz / d), 1.2); bo.dash = { t: 0, from: bo.pos.clone(), to }; } }
    else {
      bo.core.material.color.copy(new THREE.Color(bo.B.col || '#ffd060')).multiplyScalar(3);
      // 环绕 + 逼近
      const want = bo.stag > 0 ? 99 : 4.5, tx = -dz / d, tz = dx / d, sp = bo.stag > 0 ? 0 : 1.6 + bo.tier * 0.1;
      const rad = (d - want) * 0.8; bo.pos.x += (dx / d * rad + tx * Math.sin(bo.t * 0.6) * 1.5) * dt * sp * 0.6; bo.pos.z += (dz / d * rad + tz * Math.sin(bo.t * 0.6) * 1.5) * dt * sp * 0.6;
      bo.cd -= dt; if (bo.cd <= 0 && bo.stag <= 0 && d < 9) { bo.tele = Math.max(0.45, 0.9 - bo.tier * 0.05); if (bo.sayT <= 0) { bossSay(pick(Math.random, bo.B.taunt), 2.5); bo.sayT = 6; } }
    }
    const pr = Math.hypot(bo.pos.x, bo.pos.z), pl = B.R - 1.5; if (pr > pl) { bo.pos.x *= pl / pr; bo.pos.z *= pl / pr; }
    bo.pos.y = B.H(bo.pos.x, bo.pos.z) + 1.6 + Math.sin(now * 2) * 0.1;
    const pulse = 1 + Math.sin(now * 4) * 0.1 + (bo.tele > 0 ? 0.35 : 0); bo.core.scale.setScalar(1.3 * pulse * (bo.flash > 0 ? 1.5 : 1)); bo.halo.scale.setScalar(4.2 * pulse); if (bo.flash > 0) bo.flash -= dt;
    W.dom.bossHp.style.width = bo.hp + '%';
  }
  function bossHit(info) {
    const bo = W.boss; if (!bo || bo.dead) return; if (!bo.met) { bo.met = true; bo.state = 'fight'; W.dom.boss.style.display = 'block'; }
    const qa = Math.pow(clamp(bo.q, 0.25, 3), 0.7), sp = clamp(info.speed / 8, 0.5, 1.6) * (bo.stag > 0 ? 1.6 : 1) * (info.kind === 'thrust' ? 0.8 : 1);
    const dealt = Math.max(Math.round(9 * Math.max(0.8, Math.min(1.4, sp))), Math.round(22 * qa * sp * 0.5 * (0.85 + Math.random() * 0.3))); // 伤害下限 ≈ 9%（约 11 刀）
    bo.hp = Math.max(0, bo.hp - dealt); bo.flash = 0.15; floatDmg(bo.pos, dealt, sp > 1.2);
    if (bo.sayT <= 0 && Math.random() < 0.35) { bossSay(pick(Math.random, bo.B.hurt), 2); bo.sayT = 4; }
    if (bo.hp <= 0) bossWin();
  }
  function bossWin(hIn, BoIn) {
    achAdd('boss', 1);
    const bo = W.boss, Bo = BoIn || bo.B, loc = W.graph.nodes[W.cur].loc; if (bo) bo.dead = true;
    const h = hIn || RPG.bossHead(G.S, G.st(), loc, Bo, G.usedNames, G.usedSig);
    h.__boss = 1; W.trip.res.heads.push(h); G.S.bosses = G.S.bosses || {}; G.S.bosses[loc.k] = { n: Bo.n, t: Bo.title, date: Date.now() }; G.S.rep = G.S.rep || {}; G.S.rep[loc.k] = (G.S.rep[loc.k] || 0) + 5;
    if (!hIn) bossSay(Bo.lose, 4); G.flash && G.flash('#ffffff', 1, 700); SFX.fanfare && SFX.fanfare(4); SFX.levelup && SFX.levelup(); W.shake = 1.2;
    W.trip.log.push({ t: `你击败了${Bo.title}${Bo.n}，带走了她的首级。`, cls: 'gethead' });
    const nd = W.graph.nodes[W.cur];
    setTimeout(() => { if (!W || !W.B) return; if (bo && bo.g) W.B.sc.remove(bo.g); W.dom.boss.style.display = 'none'; G.toast(`👑 ${Bo.title}「${Bo.n}」的首级到手了！`, Bo.col || '#ffd060', 5); nd.boss = false; }, hIn ? 200 : 1400);
  }
  function targets(center) {
    if (!W || !W.B || W.busy) return [];
    const out = [];
    for (const p of W.prey) if (!p.gone) out.push({ id: p.id, pos: p.pos, r: 0.38, kind: 'prey', onHit: (info) => { p.hp -= info.speed > 9 ? 2 : 1; p.flash = 0.15; p.seen = true; if (p.hp <= 0) capture(p); else if (p.sayT <= 0) { say(p, pick(Math.random, PREY_SAY.hit), '#ffb0a0'); p.sayT = 2; } } });
    if (window.Beasts && Beasts.list.length) for (const t of Beasts.targets()) out.push(t);
    if (W.foes) return out.concat(Foe.targets());
    if (W.boss && !W.boss.dead) out.push({ id: 'boss', pos: W.boss.pos, r: 0.8, kind: 'boss', onHit: bossHit });
    return out;
  }
  // ---- 说话气泡 ----
  function say(p, text, col) { const el = document.createElement('div'); el.className = 'wsay'; el.textContent = text; el.style.color = col || '#fff'; W.dom.root.appendChild(el); W.say.push({ el, p, t: 2.6 }); }
  function bossSay(text, t) { if (!W || !W.boss) return; const el = document.createElement('div'); el.className = 'wsay boss'; el.innerHTML = `<b style="color:${W.boss.B.col}">${esc(W.boss.B.n)}</b>「${esc(text)}」`; W.dom.root.appendChild(el); W.say.push({ el, p: W.boss, t: t || 3, off: 1.2 }); }
  function floatDmg(pos, n, big) { if (window.HitHud && HitHud.dmg(pos, n, big)) return; const rew = typeof n === 'string', el = document.createElement('div'); el.className = 'wsay dmg' + (rew ? ' rew' : ''); el.textContent = n; if (big) el.style.fontSize = rew ? '28px' : '32px'; if (big && !rew) el.style.color = '#ff6a4a'; W.dom.root.appendChild(el); W.say.push({ el, p: { pos: pos.clone().add(new V3(rew ? (Math.random() - 0.5) * 0.5 : 0, rew ? 0.3 + Math.random() * 0.3 : 0, 0)) }, t: rew ? 1.5 : 0.8, rise: 1 }); }
  const sv = new V3();
  function updateSay() {
    for (let i = W.say.length - 1; i >= 0; i--) { const s = W.say[i]; s.t -= 1 / 60; if (s.t <= 0 || s.p.gone) { s.el.remove(); W.say.splice(i, 1); continue; }
      sv.copy(s.p.pos); sv.y += 0.6 + (s.off || 0) + (s.rise ? (0.8 - s.t) * 1.2 : 0); sv.project(G.camera);
      if (sv.z > 1) { s.el.style.display = 'none'; continue; } s.el.style.display = 'block'; s.el.style.left = ((sv.x + 1) / 2 * innerWidth) + 'px'; s.el.style.top = ((1 - sv.y) / 2 * innerHeight) + 'px'; s.el.style.opacity = Math.min(1, s.t * 2); }
  }

  // ================= 输入（game.js 在世界里把按键转给这里）=================
  function onKey(e) {
    if (!W) return false;
    if ((e.code === 'Tab' || e.code === 'KeyB') && (window.Sack && Sack.on()) && !W.busy && !W.dead) { e.preventDefault(); if (window.Hub && Hub.on()) Hub.go('kit', true); else Sack.toggleWild(); return true; }
    if (e.code === 'Tab' || e.code === 'Escape') { if (W.mapOpen && e.code === 'Escape') { toggleMap(false); return true; } return false; }
    if (W.busy || W.dead) return true;
    if (e.code === 'KeyM') { toggleMap(); return true; }
    if (W.mapOpen) return true;
    if (!e.repeat && (e.code === 'KeyQ' || e.code === 'KeyR' || e.code === 'KeyG')) { skill(e.code); return true; }
    if (e.code === 'KeyE' && !e.repeat) {
      // 第二十一轮：被追杀时站在门口按 E 优先逃走（不会被旁边的尸体/战利品抢走 E）
      if (W.doorNear && W.foes && W.foes.some(f => !f.dead && f.seen && (f.state === 'chase' || f.atk))) { const d = W.doorNear; G.toast && G.toast('🏃 你甩开了追兵，逃出了门！', '#b0ffb0', 2); if (d.home) leaveHome(); else { SFX.open && SFX.open(); goto(d.to, W.cur); } return true; }
      if (W.foes) { const bf = Foe.brokenNear(W.pos, G.player.yaw); if (bf) { Foe.execute(bf, new V3(Math.cos(G.player.yaw), 0, -Math.sin(G.player.yaw))); return true; } }
      if (W.headNear) { const hd = W.headNear;
        if ((window.Sack && Sack.on()) && !hd.fo.boss) { Sack.queueHead(hd, () => Foe.hasHead(hd), () => { if (takeHead(hd)) Foe.pickup(hd); }); return true; }
        if (takeHead(hd)) Foe.pickup(hd); return true; }
      if (W.interNear) { const it = W.interNear; if (it.kind === 'loot') Sack.openWild(it.L); else openChest(it); return true; }
      if (W.doorNear) { const d = W.doorNear; if (d.home) leaveHome(); else { SFX.open && SFX.open(); goto(d.to, W.cur); } return true; }
    }
    if (e.code === 'KeyF' && window.Combat && Combat.enabled) { Combat.toggle(); return true; }
    if (e.code === 'KeyH' && (window.Sack && Sack.on())) { Sack.quickUse(); return true; }
    if (e.code === 'KeyH') { const S = G.S, s = G.st(); G.useItem(S.items.bigpotion && s.maxHp - S.hp > s.maxHp * 0.6 ? 'bigpotion' : 'potion'); return true; }
    return true; // 其余洞窟按键（建造/投掷/碾碎……）在外面无效
  }
  function onDown(btn) { if (!W || W.busy) return true; if (window.Combat && Combat.enabled) { if (!Combat.drawn) { Combat.toggle(true); return true; } Combat.onDown(btn); } return true; }
  function openChest(it) {
    if ((window.Sack && Sack.on())) { // 宝箱：魂晶照给，物品进容器面板（和其它容器一样 5 秒一件）
      const c = it.c, nd = W.graph.nodes[W.cur]; if (!c.opened) { c.opened = true; G.addCoins(c.coin); W.trip.coins += c.coin; SFX.coins && SFX.coins(); G.toast(`📦 宝箱：🔮+${c.coin}`, '#ffd060', 2);
        W.trip.log.push({ t: `你在「${nd.name}」撬开了一只宝箱。`, d: `魂晶+${c.coin}` }); if (c.g) { c.g.rotation.z = 0.08; c.g.position.y += 0.02; } }
      c.kind = 'chest'; c.name = '宝箱'; if (!c.items) { c.items = Sack.roll('chest', Sack.lvOf(nd), (c.coin * 7919 + W.cur * 104729 + nd.seed) >>> 0); if (c.potion) c.items.push({ u: 900000 + Math.floor(Math.random() * 99999), id: 'potion', n: 1 }); }
      Sack.openWild(c); return;
    }
    it.done = true; const c = it.c; c.opened = true; W.B.inter.splice(W.B.inter.indexOf(it), 1);
    G.addCoins(c.coin); W.trip.coins += c.coin; SFX.coins && SFX.coins();
    let msg = `📦 宝箱：🔮+${c.coin}`; if (c.potion) { G.S.items.potion = (G.S.items.potion || 0) + 1; msg += ' · 🧪×1'; }
    G.toast(msg, '#ffd060', 2.5); W.trip.log.push({ t: `你在「${W.graph.nodes[W.cur].name}」撬开了一只宝箱。`, d: `魂晶+${c.coin}` });
    if (c.g) { c.g.rotation.z = 0.08; c.g.position.y += 0.02; }
  }

  // ================= DOM：HUD / 地图 / 过场 =================
  let DOM = null;
  function ensureDom() {
    if (DOM) { W.dom = DOM; return; }
    const st = document.createElement('style');
    st.textContent = `#wRoot{position:fixed;inset:0;pointer-events:none;z-index:30;display:none;font-family:inherit}
      #wTop{position:absolute;top:10px;left:50%;transform:translateX(-50%);text-align:center;color:#fff;text-shadow:0 2px 6px #000}
      #wTop .n{font-size:22px;font-weight:900;letter-spacing:2px}#wTop .s{font-size:13px;opacity:.85}
      #wStat{position:absolute;top:12px;left:14px;color:#fff;font-size:14px;text-shadow:0 1px 4px #000;line-height:1.6}
      #wStat .hp{width:200px;height:10px;background:#0008;border-radius:5px;overflow:hidden;border:1px solid #fff3}#wStat .hp i{display:block;height:100%;background:linear-gradient(90deg,#c01818,#ff5a3a)}
      #wHint{position:absolute;bottom:18px;left:50%;transform:translateX(-50%);color:#fff;font-size:15px;text-shadow:0 1px 4px #000;background:#0007;padding:6px 14px;border-radius:8px;white-space:nowrap}
      #wHint b{color:#ffd060}
      #wBoss{position:absolute;top:64px;left:50%;transform:translateX(-50%);width:min(520px,80vw);display:none;color:#fff;text-align:center;text-shadow:0 1px 4px #000;font-weight:800}
      #wBoss .bar{height:12px;background:#0009;border:1px solid #ffd06088;border-radius:6px;overflow:hidden;margin-top:4px}#wBoss .bar i{display:block;height:100%;background:linear-gradient(90deg,#b07010,#ffd060);transition:width .15s}
      #wBanner{position:absolute;top:30%;left:50%;transform:translate(-50%,-50%);color:#fff;text-align:center;text-shadow:0 2px 10px #000;opacity:0;transition:opacity .6s}
      #wBanner .n{font-size:44px;font-weight:900;letter-spacing:6px}#wBanner .s{font-size:16px;opacity:.85;margin-top:4px}
      .wsay{position:absolute;transform:translate(-50%,-100%);background:#000a;color:#fff;padding:4px 10px;border-radius:10px;font-size:15px;white-space:nowrap;pointer-events:none}
      .wsay.boss{font-size:17px;border:1px solid #ffd06066}.wsay.rew{color:#ffd24a;font-size:19px;letter-spacing:1px}.wskills{position:absolute;left:50%;bottom:78px;transform:translateX(-50%);display:flex;gap:8px;pointer-events:none}.wskills .sk{width:58px;padding:5px 0 4px;border-radius:9px;background:#140c08cc;border:1px solid #ffd27a66;text-align:center;color:#fff;font-size:11px;line-height:1.25;box-shadow:0 2px 8px #0008}.wskills .sk i{display:block;font-style:normal;font-size:20px}.wskills .sk b{position:absolute;margin:-40px 0 0 -26px;font-size:10px;color:#ffd27a}.wskills .sk.cd{opacity:.5}.wskills .sk.lock{opacity:.35;filter:grayscale(1)}.wskills .sk.ready{border-color:#ffe070;box-shadow:0 0 14px #ffd040;animation:skr .5s infinite alternate}@keyframes skr{to{transform:scale(1.08)}}.wcombo{position:absolute;right:6%;top:34%;text-align:right;color:#fff;opacity:0;transition:opacity .3s;pointer-events:none;text-shadow:0 3px 8px #000,0 0 18px #ff3a2a88}.wcombo b{display:block;font-size:64px;line-height:1;font-weight:900;font-style:italic;background:linear-gradient(#fff,#ffb070 55%,#ff4a30);-webkit-background-clip:text;background-clip:text;color:transparent}.wcombo span{font-size:18px;font-weight:700;letter-spacing:4px;color:#ffd0b0}.wcombo.pop b{animation:wcpop .22s ease-out}@keyframes wcpop{0%{transform:scale(1.6)}100%{transform:scale(1)}}.wach{position:absolute;left:50%;top:16%;transform:translateX(-50%);min-width:280px;padding:12px 26px;text-align:center;border-radius:10px;background:linear-gradient(135deg,#2a1a08ee,#4a2a0aee);border:2px solid #ffc860;box-shadow:0 0 30px #ffb03088;color:#fff;pointer-events:none;animation:wachin .4s ease-out;transition:opacity .7s,transform .7s}.wach.out{opacity:0;transform:translateX(-50%) translateY(-20px)}.wach .a1{font-size:13px;letter-spacing:4px;color:#ffd890}.wach .a2{font-size:26px;font-weight:900;margin:2px 0;color:#ffe9a0}.wach .a3{font-size:13px;color:#e8d8c0}@keyframes wachin{0%{opacity:0;transform:translateX(-50%) scale(.7)}100%{opacity:1;transform:translateX(-50%) scale(1)}}.wsay.dmg{background:none;color:#ffe0a0;font-weight:900;font-size:22px;text-shadow:0 2px 4px #000}
      #wFade{position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:31;transition:opacity .25s}
      #wLoad{position:fixed;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;z-index:32;color:#fff;font-size:18px;pointer-events:none}
      #wLoad .b{width:260px;height:6px;background:#fff2;border-radius:3px;margin-top:12px;overflow:hidden}#wLoad .b i{display:block;height:100%;width:0;background:#ffd060}
      #wMap{position:fixed;inset:0;display:none;z-index:33;background:radial-gradient(ellipse at center,#1a1410f0,#050403f8);color:#fff;pointer-events:auto}
      #wMap canvas{position:absolute;left:50%;top:52%;transform:translate(-50%,-50%)}#wMap .t{position:absolute;top:18px;width:100%;text-align:center;font-size:22px;font-weight:900;letter-spacing:3px}
      #wMap .k{position:absolute;bottom:16px;width:100%;text-align:center;opacity:.7;font-size:14px}`;
    document.head.appendChild(st);
    const root = document.createElement('div'); root.id = 'wRoot';
    root.innerHTML = `<div id="wTop"><div class="n"></div><div class="s"></div></div><div id="wStat"></div><div id="wHint"></div><div id="wBoss"><div class="bn"></div><div class="bar"><i></i></div></div><div id="wBanner"><div class="n"></div><div class="s"></div></div>`;
    document.body.appendChild(root);
    const fade = document.createElement('div'); fade.id = 'wFade'; document.body.appendChild(fade);
    const load = document.createElement('div'); load.id = 'wLoad'; load.innerHTML = '<div class="t"></div><div class="b"><i></i></div>'; document.body.appendChild(load);
    const map = document.createElement('div'); map.id = 'wMap'; map.innerHTML = '<div class="t"></div><canvas></canvas><div class="k">M / Esc 关闭 · 已到过的地点显示名字，相邻地点在门牌上可见 · 👑 = 霸主所在</div>'; document.body.appendChild(map);
    map.addEventListener('mousedown', () => toggleMap(false));
    DOM = { root, top: root.querySelector('#wTop'), stat: root.querySelector('#wStat'), hint: root.querySelector('#wHint'), boss: root.querySelector('#wBoss'), bossHp: root.querySelector('#wBoss i'), banner: root.querySelector('#wBanner'), fade, load, loadT: load.querySelector('.t'), loadB: load.querySelector('.b i'), map };
    W.dom = DOM;
  }
  function fadeTo(v) { if (DOM) DOM.fade.style.opacity = v; }
  function banner(node) {
    const st = STYLES[node.style], b = DOM.banner; b.querySelector('.n').textContent = node.name; b.querySelector('.s').textContent = `${node.loc.icon} ${node.loc.n} · ${st.n}${node.site && window.WSites ? ' · ' + WSites.KINDS[node.site].ico + ' ' + WSites.label(node) : LAYOUTS[layOf(node)] ? ' · ' + LAYOUTS[layOf(node)].n : ''} · ${SIZES[node.size].n}${node.home ? ' · 回洞的门在这里' : ''}${W.B && W.B.tag ? ' · ' + W.B.tag : ''}`;
    b.style.opacity = 1; clearTimeout(banner._t); banner._t = setTimeout(() => { b.style.opacity = 0; }, 2600);
    if (node.site && window.WSites && W.foes && W.foes.some(f => f.slot && !f.dead)) setTimeout(() => { if (W && W.B && G.toast) G.toast(WSites.hint(node), '#ffe2a8', 6); }, 2800);
    const bo = W.boss; if (bo) DOM.boss.querySelector('.bn').innerHTML = `👑 ${esc(bo.B.title)} · ${esc(bo.B.n)}`; DOM.boss.style.display = 'none';
  }
  function runBar() { let b = document.getElementById('wRun'); if (!b) { b = document.createElement('div'); b.id = 'wRun'; b.style.cssText = 'position:fixed;left:50%;bottom:74px;transform:translateX(-50%);width:180px;height:4px;border-radius:2px;background:rgba(0,0,0,.5);z-index:20;pointer-events:none;transition:opacity .3s'; b.innerHTML = '<i style="display:block;height:100%;border-radius:2px;background:#8fe08a"></i>'; document.body.appendChild(b); }
    const w = Math.round(W.run); if (w !== W.runW) { W.runW = w; b.firstChild.style.width = w + '%'; b.firstChild.style.background = W.runTired ? '#e07a5a' : '#8fe08a'; b.style.opacity = w >= 100 || (window.Combat && Combat.drawn) ? 0 : 1; } }
  function hud() {
    if (!W || !W.B || !DOM) return; const node = W.graph.nodes[W.cur], st = STYLES[node.style], s = G.st();
    setT(DOM.tn || (DOM.tn = DOM.top.querySelector('.n')), node.name); setT(DOM.ts || (DOM.ts = DOM.top.querySelector('.s')), `${node.loc.icon} ${node.loc.n} · ${st.n}${node.site && window.WSites ? ' · ' + WSites.KINDS[node.site].ico + ' ' + WSites.label(node) : LAYOUTS[layOf(node)] ? ' · ' + LAYOUTS[layOf(node)].n : ''} · ${SIZES[node.size].n} · 已探索 ${W.graph.nodes.filter(n => n.visited).length}/${W.graph.nodes.length}`);
    const left = W.foes ? W.foes.filter(f => !f.dead).length : W.prey.filter(p => !p.gone).length;
    const LVI = RPG.lvOf(G.S.xp), lvOn = s.lv > 1 || G.S.xp > 0;
    if (!DOM.statHp) { DOM.stat.innerHTML = '<div class="hp"><i></i></div><div class="stx"></div>'; DOM.statHp = DOM.stat.querySelector('.hp i'); DOM.statTx = DOM.stat.querySelector('.stx'); }
    { const w = (clamp(G.S.hp / s.maxHp, 0, 1) * 100).toFixed(1) + '%'; if (DOM.statHp._w !== w) { DOM.statHp._w = w; DOM.statHp.style.width = w; } }
    setH(DOM.statTx, `${lvOn ? `<span title="食人魔等级" style="color:#ffd27a">Lv.${LVI.lv}</span> <span style="opacity:.6;font-size:.85em">${LVI.need ? LVI.cur + '/' + LVI.need : 'MAX'}</span> · ` : ''}❤️ ${Math.round(G.S.hp)}/${s.maxHp} · ${(window.Sack && Sack.on()) ? (() => { const u = Sack.usage(), b = Sack.inv().belt.filter(Boolean); return `🩹${b.reduce((a, o) => a + o.n, 0)}<br>🎒 ${u[0]}/${u[1]}格 · 💀${u[2]}`; })() : `🧪${G.S.items.potion || 0}<br>🧺 ${W.trip.res.heads.length}/${s.cap}`} · 🔮 +${W.trip.coins}${W.stats && W.stats.kill ? `<br>⚔️ 放倒 ${W.stats.kill} · 🩸 斩首 ${W.stats.decap} · 连击 ${W.stats.maxCombo}` : ''}${left ? `<br><span style="color:#9fd0ff">✨ 此地还有 ${left} 缕魂光</span>` : ''}`);
    let h = window.HudBot && HudBot.on() ? 'WASD 走动 · <b>F</b> 拔刀 · <b>M</b> 地图 · <b>H</b> 喝药 · <b>F1</b> 按键' /* MOD hud_bottom：长说明在 F1 里 */ : 'WASD 走动 · <b>F</b> 拔刀（' + (window.Mods && Mods.on('combat_master') ? '点左键立刻出刀·连点三连斩·按住甩鼠标定方向·按住不动蓄力重斩·右键格挡' : '按住左键挥砍 / 连点刺 / 右键格挡') + '）· <b>M</b> 地图 · <b>H</b> 喝药';
    if (W.headNear) h = `<b>E</b> 拾取首级 · 【${RN[W.headNear.h.c.rar]}】${esc(NM(W.headNear.h.c))}${window.Ranks ? ' · ' + esc(Ranks.short(W.headNear.h.c)) : ''}`;
    else if (W.interNear) { const it = W.interNear, L = it.kind === 'loot' ? it.L : null; h = L ? `<b>E</b> ${L.kind === 'corpse' ? '搜身' : L.kind === 'pile' ? '翻' : '搜刮'} · ${esc(L.name)}${L.items && !L.items.length ? ' <span style="color:#999">（空）</span>' : ''}` : '<b>E</b> 打开宝箱'; }
    if ((window.Sack && Sack.on()) && !W.headNear && !W.doorNear) h += ' · <b>Tab</b> 麻袋';
    if (W.doorNear && !W.headNear && !W.interNear) { const d = W.doorNear, cn = W.graph.nodes[W.cur]; h = d.home ? '<b>E</b> 回到魂首窟（结束狩猎，带回首级）' : `<b>E</b> 穿过门 → ${esc(doorName(cn, d))}` + (W.graph.nodes[d.to].region !== cn.region ? ` <span style="color:#f0a060">（推荐战力 ${W.graph.nodes[d.to].loc.rec}）</span>` : ''); }
    setH(DOM.hint, h);
  }
  function toggleMap(v) {
    if (!W) return; W.mapOpen = v == null ? !W.mapOpen : v; DOM.map.style.display = W.mapOpen ? 'block' : 'none'; if (!W.mapOpen) return;
    const N = W.graph.nodes, K = N.filter(n => n.known), vis = N.filter(n => n.visited).length;
    DOM.map.querySelector('.t').textContent = W.graph.trip ? `🗺️ ${W.graph.loc.icon} ${W.graph.loc.n} · 已踏足 ${vis}/${N.length} 处` : `🗺️ 魂首大陆 · 已踏足 ${vis}/${N.length} 处 · 霸主 ${Object.keys(G.S.bosses || {}).length}/${W.graph.regions.filter(R => window.Explore && Explore.BOSSES[R.k]).length}`;
    const cv = DOM.map.querySelector('canvas'), Wd = Math.min(innerWidth * 0.9, 1100), Hd = Math.min(innerHeight * 0.76, 680); cv.width = Wd; cv.height = Hd; const g = cv.getContext('2d');
    // 只显示已知区域（越探越大），至少 150 单位见方；保持比例
    let x0 = Math.min(...K.map(n => n.x)), x1 = Math.max(...K.map(n => n.x)), y0 = Math.min(...K.map(n => n.y)), y1 = Math.max(...K.map(n => n.y));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, span = Math.max(150, x1 - x0 + 30, (y1 - y0 + 30) * Wd / Hd), sc = (Wd - 40) / span;
    const P = n => [Wd / 2 + (n.x - cx) * sc, Hd / 2 + (n.y - cy) * sc];
    const SC = { meadow: '#8fb07a', forest: '#3f8a4f', wilds: '#c8905a', ruins: '#a8a0b0', swamp: '#6a7a4a', fortress: '#8a8a8a', capital: '#d0b060', abyss: '#a03030', peak: '#d8e8f0' };
    // 地区底色 + 名字
    g.textAlign = 'center';
    for (const R of W.graph.regions) { if (!R.idx.some(j => N[j].known)) continue; const [x, y] = P({ x: R.cx, y: R.cy });
      g.fillStyle = (R.loc.color || '#888') + '22'; g.beginPath(); g.arc(x, y, 64 * sc, 0, 7); g.fill();
      g.font = `bold ${Math.max(14, Math.min(26, 20 * sc))}px serif`; g.fillStyle = (R.loc.color || '#ccc') + 'aa'; g.fillText(`${R.loc.icon} ${R.loc.n}`, x, y - 60 * sc); }
    N.forEach(n => n.adj.forEach(b => { if (b < n.i) return; const m = N[b]; if (!(n.visited || m.visited)) return; const [ax, ay] = P(n), [bx, by] = P(m);
      g.lineWidth = Math.max(1.5, 2.5 * sc); g.strokeStyle = n.visited && m.visited ? '#d8c8a0' : '#6a604c'; g.setLineDash(n.visited && m.visited ? [] : [4, 4]); g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); }));
    g.setLineDash([]);
    const big = sc > 2.2;
    K.forEach(n => { const [x, y] = P(n), rad = Math.max(3, (n.size === 'l' ? 7 : n.size === 'm' ? 5.5 : 4.5) * Math.min(2, sc));
      g.beginPath(); g.arc(x, y, rad, 0, 7); g.fillStyle = n.visited ? SC[n.style] : '#2a2620'; g.fill(); g.strokeStyle = n.i === W.cur ? '#fff' : n.stone ? '#9fd0ff' : '#000'; g.lineWidth = n.i === W.cur ? 3 : n.stone ? 2.5 : 1.5; g.stroke();
      const important = n.i === W.cur || n.home || (n.stone && n.visited) || (n.boss && n.visited);
      if (n.visited && (big || important)) { g.font = `${important ? 'bold ' : ''}${big ? 13 : 12}px sans-serif`; g.fillStyle = '#fff'; g.fillText((n.home ? '🕳️ ' : n.stone ? '🌀 ' : '') + n.name + (n.boss ? ' 👑' : ''), x, y - rad - 5); }
      if (n.i === W.cur) { g.fillStyle = '#ffd060'; g.font = 'bold 13px sans-serif'; g.fillText('▲ 你在这里', x, y + rad + 15); } });
  }

  // 第二十二轮：书里的名字要取“这趟世界里还活着的猎物”。没进过的地点也可以提前 populate（按节点种子，结果与真正进入时一致）
  function peekPrey(r) {
    if (!W || !W.graph) return null; const ns = W.graph.nodes.filter(n => !n.home && !n.boss); if (!ns.length) return null;
    for (let t = 0; t < 6; t++) { const nd = ns[Math.floor(r() * ns.length)]; if (!nd.prey) { try { populate(nd); } catch (e) { return null; } } if (nd.prey && nd.prey.length) { const h = nd.prey[Math.floor(r() * nd.prey.length)]; if (h && h.c) return { c: h.c, where: `${nd.loc.n}·${nd.name}` }; } }
    return null;
  }
  return { start, frame, onKey, onDown, stop, peekPrey, get active() { return !!W; }, get _W() { return W; }, STYLES, REGION, genGraph, genWorld, need, warm, warmRegion, _debug: { goto: (i) => W && goto(i, W.cur), buildNode, targets, stylesOfN, layOf, populate } };
})();
