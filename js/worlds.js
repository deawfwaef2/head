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
  const PREY_SAY = { see: ['……有人来了。', '那是什么？！', '别过来……', '食、食人魔！', '快跑！'], flee: ['救命！', '别追了！', '我不想死……', '放过我吧！'], fight: ['我跟你拼了！', '滚开！', '你休想！'], hit: ['啊！', '呜……', '好痛……'] };

  // ================= 懒加载资产（big/world/*.js）=================
  const LOADED = {}, MODELS = {}, TEX = {}, SKY = {}, TMPL = {};
  const b64buf = (s) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
  const loadImg = (url) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
  function script(name) {
    return new Promise(res => { const s = document.createElement('script'); s.src = 'big/world/' + name + '.js'; s.onload = () => res(true); s.onerror = () => { console.warn('world asset missing', name); res(false); }; document.head.appendChild(s); });
  }
  async function need(names, onProg) {
    const list = [...new Set(names)].filter(n => !LOADED[n]); let i = 0;
    for (const n of list) {
      LOADED[n] = 1; const ok = await script(n); const A = window.ASSETS || {}; const v = A[n];
      if (ok && v) try {
        if (n.startsWith('tex_')) { const o = {}; for (const k of Object.keys(v)) { const t = new THREE.Texture(await loadImg(v[k])); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (k === 'diff') t.encoding = THREE.sRGBEncoding; t.needsUpdate = true; o[k] = t; } TEX[n.slice(4)] = o; }
        else if (n.startsWith('sky_')) SKY[n.slice(4)] = await parseSky(v);
        else { const g = await new Promise((rs, rj) => new THREE.GLTFLoader().parse(b64buf(v), '', rs, rj)); prepModel(g.scene); MODELS[n] = g.scene; }
      } catch (e) { console.warn('world asset', n, e); }
      if (A[n]) A[n] = null; i++; onProg && onProg(i / list.length, n);
      await new Promise(r => setTimeout(r, 0));
    }
  }
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
    for (let i = 0; i < n; i++) { const e = d[i * 4 + 3]; let f = e ? Math.pow(2, e - 136) : 0; const mx = Math.max(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) * f; if (mx > 3) f *= 3 / mx;
      hf[i * 4] = THREE.DataUtils.toHalfFloat(d[i * 4] * f); hf[i * 4 + 1] = THREE.DataUtils.toHalfFloat(d[i * 4 + 1] * f); hf[i * 4 + 2] = THREE.DataUtils.toHalfFloat(d[i * 4 + 2] * f); hf[i * 4 + 3] = THREE.DataUtils.toHalfFloat(1); }
    const t = new THREE.DataTexture(hf, c.width, c.height, THREE.RGBAFormat, THREE.HalfFloatType); t.mapping = THREE.EquirectangularReflectionMapping; t.magFilter = t.minFilter = THREE.LinearFilter; t.flipY = true; t.needsUpdate = true;
    const pm = new THREE.PMREMGenerator((G || window.__game).renderer); const env = pm.fromEquirectangular(t).texture; pm.dispose(); t.dispose();
    // 地平线颜色（雾）/ 天顶 / 地面平均色：从背景 JPEG 取
    const bi = bg.image, cc = document.createElement('canvas'); cc.width = 64; cc.height = 32; const g2 = cc.getContext('2d'); g2.drawImage(bi, 0, 0, 64, 32);
    const px = g2.getImageData(0, 0, 64, 32).data; const avg = (y0, y1) => { let r = 0, gg = 0, b = 0, k = 0; for (let y = y0; y < y1; y++) for (let x = 0; x < 64; x++) { const i = (y * 64 + x) * 4; r += px[i]; gg += px[i + 1]; b += px[i + 2]; k++; } return new THREE.Color(r / k / 255, gg / k / 255, b / k / 255); };
    return { bg, env, sun: v.sun, mean: v.mean, horizon: avg(14, 17), zenith: avg(0, 5), ground: avg(20, 28) };
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
      out.push({ parts, size: sz });
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
    const x = r(), n = W && W.graph && W.graph.trip ? (node.boss ? 0 : x < 0.15 ? 0 : x < 0.55 ? 1 : x < 0.88 ? 2 : 3) : (x < 0.3 ? 0 : x < 0.72 ? 1 : x < 0.93 ? 2 : 3);
    for (let k = 0; k < n; k++) {
      let h = null;
      if (window.RPG && RPG.foe) try { h = RPG.foe(G.S, node.loc, (r() * 4294967296) >>> 0, G.usedNames, G.usedSig); } catch (e) { console.warn('foe', e); }
      else if (W.pool && W.pool.length) h = W.pool.pop();
      if (h) node.prey.push(h);
    }
    if (r() < 0.3 + (node.size === 'l' ? 0.3 : 0)) { const lo = node.loc.loot || [10, 30]; node.chests.push({ coin: Math.round((lo[0] + r() * (lo[1] - lo[0])) * (1.5 + r() * 2)), potion: r() < 0.25 + ri * 0.02 }); }
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
  function buildNode(node) {
    const st = STYLES[node.style], sky = SKY[st.sky], R = node.R, r = mulberry(node.seed), nz = noise2(node.seed & 0xffff);
    const sc = new THREE.Scene(); const cols = []; const inter = [];
    // 门的位置先定：均匀分布在边界上
    const doorList = node.adj.map(b => ({ to: b })); if (node.home || node.stone) doorList.push({ to: -1 });
    const a0 = r() * Math.PI * 2; doorList.forEach((d, k) => { d.a = a0 + k / doorList.length * Math.PI * 2 + (r() - 0.5) * 0.5 / doorList.length; d.x = Math.cos(d.a) * (R - 0.6); d.z = Math.sin(d.a) * (R - 0.6); });
    const flat = (x, z) => { let f = 1; for (const d of doorList) f = Math.min(f, sstep(2.5, 6, Math.hypot(x - d.x, z - d.z))); return f; };
    const H = (x, z) => { const rr = Math.hypot(x, z), ang = Math.atan2(z, x);
      const inner = (nz(x * 0.06 + 50, z * 0.06 + 50) - 0.5) * 1.6 * flat(x, z) * sstep(0, 5, rr);
      const rim = st.hill * sstep(R + 0.5, R + 16, rr) * (0.55 + 0.9 * nz(Math.cos(ang) * 3 + 9, Math.sin(ang) * 3 + 9)) + st.hill * 1.2 * sstep(R + 20, R + 60, rr);
      return inner + rim; };
    // 地形
    const ext = R + 70, seg = Math.min(220, Math.round(ext * 2 / 1.1));
    const tg = new THREE.PlaneGeometry(ext * 2, ext * 2, seg, seg); tg.rotateX(-Math.PI / 2);
    const tp = tg.attributes.position; for (let i = 0; i < tp.count; i++) tp.setY(i, H(tp.getX(i), tp.getZ(i))); tg.computeVertexNormals();
    const gset = TEX[st.ground]; let gm;
    if (gset && window.Assets && Assets.triplanar) { gm = Assets.triplanar(gset, { scale: st.gs, normal: 1.1, env: 0.35, ao: 0.9 }); gm.envMap = sky ? sky.env : null; }
    else gm = new THREE.MeshStandardMaterial({ color: '#556644', roughness: 1 });
    if (st.tint) gm.color = new THREE.Color(st.tint);
    const terr = new THREE.Mesh(tg, gm); terr.receiveShadow = true; sc.add(terr);
    // 天空（与 PMREM 同一套等距柱状映射）
    if (sky) {
      const sm = new THREE.ShaderMaterial({ uniforms: { map: { value: sky.bg }, k: { value: st.night ? 0.9 : 1.1 } }, depthWrite: false, side: THREE.BackSide, fog: false,
        vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
        fragmentShader: 'uniform sampler2D map; uniform float k; varying vec3 vD; void main(){ vec3 d = normalize(vD); vec2 uv = vec2(atan(d.z, d.x) * 0.1591549 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.3183099 + 0.5); gl_FragColor = vec4(texture2D(map, uv).rgb * k, 1.0); }' });
      const skyM = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), sm); skyM.frustumCulled = false; skyM.renderOrder = -10; skyM.userData.sky = 1; sc.add(skyM); sc.userData.skyM = skyM;
      sc.environment = sky.env; sc.fog = new THREE.FogExp2(sky.horizon.clone().multiplyScalar(st.night ? 0.6 : 0.78), st.fog * (R > 30 ? 0.7 : 1));
    } else { sc.fog = new THREE.FogExp2('#8899aa', 0.02); }
    // 光：太阳（从 HDRI 最亮方向）+ 半球补光
    let el = sky ? (0.5 - sky.sun[1]) * Math.PI : 0.8, az = sky ? (sky.sun[0] - 0.5) * Math.PI * 2 : 0.5; if (el < 0.35) el = 0.35 + (st.night ? 0.5 : 0);
    const sunDir = new V3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).normalize();
    const sun = new THREE.DirectionalLight(st.night ? '#9fb4ff' : '#fff1dc', st.sun); sun.castShadow = true;
    const ss = Math.min(26, R + 4); Object.assign(sun.shadow.camera, { left: -ss, right: ss, top: ss, bottom: -ss, near: 1, far: 160 }); sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    sc.add(sun); sc.add(sun.target);
    const hemi = new THREE.HemisphereLight(sky ? sky.zenith : '#8899aa', sky ? sky.ground : '#443322', st.night ? 0.35 : 0.25); sc.add(hemi);
    // 散布：网格防重叠
    const occ = new Map(), cell = 1.2, ck = (x, z) => Math.floor(x / cell) + ',' + Math.floor(z / cell);
    const free = (x, z, rad) => { const n = Math.ceil(rad / cell); const cx = Math.floor(x / cell), cz = Math.floor(z / cell); for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) if (occ.get((cx + i) + ',' + (cz + j))) return false; return true; };
    const mark = (x, z, rad) => { const n = Math.ceil(rad / cell); const cx = Math.floor(x / cell), cz = Math.floor(z / cell); for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) occ.set((cx + i) + ',' + (cz + j), 1); };
    doorList.forEach(d => mark(d.x * 0.93, d.z * 0.93, 3.2));
    const inst = new Map(), instNS = new Map(); // 模板 → 矩阵列表（NS = 不投影，远景）
    const put = (tm, x, z, s, ry, y0, ns) => { const m = new THREE.Matrix4().compose(new V3(x, (y0 != null ? y0 : H(x, z)) - 0.04 * s, z), new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), ry), new V3(s, s, s)); const M = ns ? instNS : inst; if (!M.has(tm)) M.set(tm, []); M.get(tm).push(m); };
    const variants = (list) => list.flatMap(n => templates(n).map(t => ({ t, n })));
    // 地标（先放，保证有空间）
    const mk = pick(r, st.marks); const mx = (r() - 0.5) * R * 0.5, mz = (r() - 0.5) * R * 0.5; sc.userData.mark = mk; placeMark(mk, mx, mz);
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
      if (g) { sc.add(g); c.g = g; } c.x = x; c.z = z; if (!c.opened) inter.push({ kind: 'chest', c, x, z }); cols.push({ x, z, r: 0.5 });
    });
    // 普通散布
    const area = Math.PI * R * R / 100;
    if (!LITE) for (const [list, dens, s0, s1, kind] of st.props) {
      if (kind === 'fire') { const n = Math.max(0, Math.round(dens * area * (0.6 + r() * 0.8))); for (let i = 0; i < n; i++) { const a = r() * 6.28, d = R * (0.2 + r() * 0.7), x = Math.cos(a) * d, z = Math.sin(a) * d; if (!free(x, z, 1.5)) continue; mark(x, z, 1.5); const y = H(x, z); if (window.Assets && Assets.has('stone_fire_pit')) { const f = Assets.fit('stone_fire_pit', { w: 0.9, x, y, z }); if (f) sc.add(f); const fl = Assets.flame(x, y + 0.12, z, 4); if (fl) sc.add(fl); const pl = new THREE.PointLight('#ff7a30', 1.6, 9, 2); pl.position.set(x, y + 0.8, z); sc.add(pl); } cols.push({ x, z, r: 0.6 }); } continue; }
      const vs = variants(list); if (!vs.length) continue;
      const cap = kind === 'grass' ? 2200 : kind === 'tree' ? 40 : 160;
      const n = Math.min(cap, Math.round(dens * area * (0.7 + r() * 0.6)));
      for (let i = 0; i < n; i++) {
        const a = r() * 6.28, d = R * Math.sqrt(r()) * 0.97, x = Math.cos(a) * d, z = Math.sin(a) * d, v = pick(r, vs), s = s0 + r() * (s1 - s0);
        const fr = Math.max(v.t.size.x, v.t.size.z) * s * 0.5;
        const rad = kind === 'grass' ? 0 : kind === 'plant' ? 0.4 : kind === 'tree' ? 1.0 : kind === 'wall' ? fr : Math.min(fr, 2.5);
        if (rad && !free(x, z, rad)) continue;
        if (kind !== 'grass' && Math.hypot(x, z) < 2.5 && node.home) continue;
        const ry = r() * 6.28; put(v.t, x, z, s, ry); if (rad) mark(x, z, rad * (kind === 'plant' ? 0.5 : 1));
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
    // 山坡上也长草/灌木（不投影、无碰撞）
    if (!LITE) for (const [list, dens, s0, s1, kind] of st.props) {
      if (kind !== 'grass' && kind !== 'plant') continue; const vs = variants(list); if (!vs.length) continue;
      const ha = Math.PI * ((R + 18) * (R + 18) - R * R) / 100, n = Math.min(kind === 'grass' ? 1200 : 150, Math.round(dens * ha * 0.35));
      for (let i = 0; i < n; i++) { const a = r() * 6.28, rr = R + 0.5 + r() * 17.5, v = pick(r, vs); put(v.t, Math.cos(a) * rr, Math.sin(a) * rr, (s0 + r() * (s1 - s0)) * 1.1, r() * 6.28, null, true); }
    }
    // 边界：两圈（近圈贴着可走边界，远圈在山坡上当背景）
    if (st.edge && !LITE) {
      const [list, spacing, s0, s1] = st.edge, vs = variants(list.map(n => LO[n] && MODELS[n + '_lo'] ? n + '_lo' : n));
      if (vs.length) for (const [rr0, rr1, sk] of [[R + 0.8, R + 5, 1], [R + 7, R + 22, 1.35]]) {
        const n = Math.round(Math.PI * 2 * (rr0 + rr1) / 2 / (spacing * (sk > 1 ? 1.8 : 1)));
        for (let i = 0; i < n; i++) {
          const a = i / n * Math.PI * 2 + (r() - 0.5) * 0.3 / n * 6; const rr = rr0 + r() * (rr1 - rr0);
          if (sk === 1 && doorList.some(d => Math.abs(Math.atan2(Math.sin(a - d.a), Math.cos(a - d.a))) * R < 3.2)) continue;
          const v = pick(r, vs), s = (s0 + r() * (s1 - s0)) * sk, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
          put(v.t, x, z, s, r() * 6.28, null, sk > 1);
        }
      }
    }
    // 实例化
    for (const [M, ns] of [[inst, false], [instNS, true]]) for (const [tm, ms] of M) for (const p of tm.parts) {
      const im = new THREE.InstancedMesh(p.geo, p.mat, ms.length);
      ms.forEach((m, i) => im.setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(m, p.m)));
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
    return { sc, H, R, cols, doors, inter, sun, sunDir, terr, style: st };
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
  function spot(B, r) { let x = 0, z = 0; for (let t = 0; t < 30; t++) { const a = r() * 6.28, d = B.R * (0.3 + r() * 0.55); x = Math.cos(a) * d; z = Math.sin(a) * d; if (B.cols.every(c => Math.hypot(c.x - x, c.z - z) > c.r + 0.8) && B.doors.every(dd => Math.hypot(dd.x - x, dd.z - z) > 5)) break; } return new V3(x, 0, z); }
  // 给 js/foe.js 的接口
  function foeCtx(B, node) {
    return {
      sc: B.sc, H: B.H, cols: B.cols, R: B.R, player: { pos: W.pos, get yaw() { return G.player.yaw; }, get crouch() { return G.player.crouch; } },
      st: () => G.st(), sees: (pos, maxD) => sees({ pos }, maxD), say: (anchor, text, col) => { if (text) say(anchor, text, col); },
      floatDmg: (pos, n, big) => floatDmg(pos, n, big), toast: (t, c, d) => G.toast && G.toast(t, c, d), shake: (k) => { W.shake = Math.max(W.shake || 0, k); },
      playerSwinging: () => !!(window.Combat && Combat.drawn && Combat.state && (Combat.state.lmb || Combat.state.thrust > 0)),
      power: (fo) => { const q = G.st().power / ((fo.boss ? node.loc.rec * (fo.boss.pow || 2) : node.loc.rec * [0.7, 0.9, 1.15, 1.5, 2.1][fo.rar])); return Math.pow(clamp(q, 0.25, 3), 0.7); },
      hitPlayer: (fo, n) => { const s = G.st(); n = Math.max(1, Math.round(n * (1 - s.dodge * 0.5) * (1 - Math.min(0.5, s.def / (s.def + 300)))));
        if (guardFacing(fo.pos)) { n = Math.round(n * 0.25); G.toast && G.toast('🛡️ 格挡！', '#cfe0ff', 0.6); SFX.thud && SFX.thud(0.8); fo.stag = fo.boss ? 0.8 : 0.6; }
        else { G.flash && G.flash('#a00000', 0.4, 280); W.shake = Math.max(W.shake || 0, fo.boss ? 0.5 : 0.25); }
        if (n > 0) { G.damage(n); W.trip.log.push({ t: `${fo.h.c.name}${fo.boss ? '' : '反击'}，你受了伤。`, d: `-${n} HP` }); } },
      bossMeet: (fo) => { W.dom.boss.style.display = 'block'; W.boss = { B: fo.boss, pos: fo.pos, foe: fo, hp: 100, dead: false, sayT: 0 }; bossSay(fo.boss.say || pick(Math.random, fo.boss.taunt), 3); },
      bossHp: (fo) => { W.dom.bossHp.style.width = Math.max(0, fo.hp / fo.maxHp * 100) + '%'; if (W.boss && W.boss.sayT <= 0 && Math.random() < 0.3) { bossSay(pick(Math.random, fo.boss.hurt), 2); W.boss.sayT = 4; } },
      onDeath: (fo) => { const nd = W.graph.nodes[W.cur], i = nd.prey.indexOf(fo.h); if (i >= 0) nd.prey.splice(i, 1);
        if (fo.boss) { bossSay(fo.boss.lose, 4); W.dom.boss.style.display = 'none'; G.flash && G.flash('#ffffff', 0.8, 600); SFX.fanfare && SFX.fanfare(3); W.shake = 1; setTimeout(() => G.toast && G.toast(`👑 ${fo.boss.title}倒下了——砍下她的头，带回去！`, fo.boss.col || '#ffd060', 4), 1200); } }
    };
  }
  function takeHead(hd) { // 拾取砍下的首级
    const fo = hd.fo, c = hd.h.c, s = G.st(), node = W.graph.nodes[W.cur];
    if (fo.boss) { bossWin(hd.h, fo.boss); return true; }
    if (W.trip.res.heads.length >= s.cap) { G.toast(`麻袋满了（${s.cap} 颗）`, '#aaa', 2.5); return false; }
    W.trip.res.heads.push(hd.h); W.trip.log.push({ t: `你在「${node.name}」砍下了${c.name}的头。`, cls: 'gethead' });
    G.toast(`💀 获得首级【${RN[c.rar]}】${c.name}`, RC[c.rar], 3); SFX.squish && SFX.squish(1); if (c.rar >= 2) SFX.fanfare && SFX.fanfare(c.rar);
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
    W = { trip, api, graph, pool, cur: -1, B: null, pos: new V3(), vel: new V3(), onGround: true, prey: [], boss: null, dead: false, fade: 0, busy: true, t: 0, stepT: 0, hintT: 0, say: [], camFar: G.camera.far, doorNear: null, mapOpen: false };
    G.setUI(false); try { G.lockPointer(); } catch (e) {}
    ensureDom(); W.dom.root.style.display = 'block';
    if (!provReg && window.Combat) { Combat.addProvider(targets); provReg = true; }
    SFX.music && SFX.music('expedition'); SFX.roar && SFX.roar(0.6);
    const st0 = !graph.trip && graph.nodes[S.world.stone] && graph.nodes[S.world.stone].stone ? S.world.stone : graph.home;
    goto(st0, -1).catch(e => { console.warn('Worlds', e); stop(); api.fallback && api.fallback(); });
  }
  function doorName(node, d) {
    if (d.home) return node.home ? '🕳️ 回魂首窟' : '🌀 魂门 · 回洞';
    const m = W.graph.nodes[d.to]; let t = m.visited ? m.name : m.name + ' ？';
    if (m.boss && m.visited) t += ' 👑';
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
  function stylesOf(i) { if (LITE) { const st0 = STYLES[W.graph.nodes[i].style]; return ['sky_' + st0.sky, 'tex_' + st0.ground]; } const st = STYLES[W.graph.nodes[i].style]; const names = ['sky_' + st.sky, 'tex_' + st.ground]; st.props.forEach(p => p[0].forEach(n => names.push(n.replace('#*', '')))); if (st.edge) st.edge[0].forEach(n => { names.push(n.replace('#*', '')); if (LO[n]) names.push(n + '_lo'); }); ['namaqualand_boulder_03', 'namaqualand_boulder_04', 'rock_09', 'horse_statue_01', 'gothic_statue', 'wooden_barrels_01', 'Barrel_02', 'wooden_military_crate', 'dead_tree_trunk', 'dead_tree_trunk_02', 'dead_quiver_trunk'].forEach(n => names.push(n)); return names.filter(n => n !== 'brazier'); }
  async function goto(i, from) {
    W.busy = true; const node = W.graph.nodes[i];
    fadeTo(1); await wait(260);
    W.dom.load.style.display = 'flex'; W.dom.loadT.textContent = `前往「${node.name}」……`;
    await need(stylesOf(i), (p) => { W.dom.loadB.style.width = Math.round(p * 100) + '%'; });
    // 预加载相邻地点的资产（后台）
    setTimeout(() => { if (!W) return; node.adj.forEach(b => need(stylesOf(b))); }, 1500);
    if (!W) return;
    if (W.B) disposeNode();
    W.cur = i; node.visited = true; node.known = true; node.adj.forEach(b => W.graph.nodes[b].known = true); remember(node);
    if (!node.prey) populate(node);
    const B = W.B = buildNode(node);
    W.foes = null; W.prey = []; W.boss = null;
    const wantBoss = node.boss && !(G.S.bosses || {})[node.region] && window.Explore && Explore.BOSSES[node.region];
    if (window.Foe && !/[?&]nofoe=1/.test(location.search) && !(window.Mods && !Mods.on('foe_bodies'))) {
      try {
        const r = mulberry(node.seed ^ 0x5bd1e995), list = [];
        node.prey.forEach(h => { list.push({ h, pos: spot(B, r) }); });
        if (wantBoss) { const Bo = Explore.BOSSES[node.region]; node.bossH = node.bossH || RPG.bossHead(G.S, G.st(), node.loc, Bo, G.usedNames, G.usedSig); list.push({ h: node.bossH, pos: new V3(0, 0, 0), boss: Bo, bossK: node.region }); }
        W.dom.loadT.textContent = `「${node.name}」里有人……`;
        W.foes = await Foe.populate(foeCtx(B, node), list);
        if (W.foes && !W.foes.length && list.length) W.foes = null;
      } catch (e) { console.warn('Foe', e); W.foes = null; }
    }
    if (!W.foes) { W.prey = spawnPrey(B, node); W.boss = wantBoss ? spawnBoss(B, node) : null; }
    // 门牌
    B.doors.forEach(d => { d.label.userData.set(doorName(node, d)); });
    // 出生点：来的那扇门内侧
    const d0 = B.doors.find(d => d.to === from) || B.doors.find(d => d.home) || B.doors[0];
    const ins = d0 ? new V3(-Math.cos(d0.a), 0, -Math.sin(d0.a)) : new V3(0, 0, 1);
    W.pos.set((d0 ? d0.x : 0) + ins.x * 2.4, 0, (d0 ? d0.z : 0) + ins.z * 2.4); W.pos.y = B.H(W.pos.x, W.pos.z); W.vel.set(0, 0, 0);
    G.player.yaw = Math.atan2(-ins.x, -ins.z); G.player.pitch = -0.05;
    B.sc.add(G.camera); G.camera.far = 400; G.camera.updateProjectionMatrix();
    if (window.Combat && Combat.attach) Combat.attach(B.sc);
    W.dom.load.style.display = 'none'; hud(); banner(node);
    await wait(60); fadeTo(0); W.busy = false;
    if (W.boss) setTimeout(() => { if (W && W.boss) bossSay(W.boss.B.say, 5); }, 1500);
  }
  function disposeNode() {
    const B = W.B; if (!B) return;
    if (window.Foe) Foe.clear();
    B.sc.traverse(o => { if (o.isInstancedMesh) o.dispose && o.dispose(); if (o.userData.sky) { o.geometry.dispose(); o.material.dispose(); } if (o.isSprite && o.material.map && o.material.map.isCanvasTexture && o.material.map !== glowTex) { o.material.map.dispose(); o.material.dispose(); } });
    B.terr.geometry.dispose(); B.terr.material.dispose && B.terr.material.dispose();
    if (B.sun.shadow && B.sun.shadow.map) B.sun.shadow.map.dispose();
    W.say.forEach(s => s.el.remove()); W.say = []; W.B = null;
  }
  function stop() {
    if (!W) return; const w = W;
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
    setTimeout(() => { stop(); api.finish(); G.setUI(false); try { G.lockPointer(); } catch (e) {} if (won) setTimeout(() => Explore.victoryScreen(), 900); }, 400);
  }
  function dieNow() {
    if (!W || W.dead) return; W.dead = true; W.busy = true;
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
      P.crouch += ((K.KeyC ? 1 : 0) - P.crouch) * Math.min(1, dt * 12); P.h = 1.95 - 0.8 * P.crouch;
      const sp = (K.ShiftLeft && P.crouch < 0.5 ? 6.2 : 3.6) * (1 - 0.55 * P.crouch);
      fw.set(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)); rt.set(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
      want.copy(fw).multiplyScalar(f).addScaledVector(rt, s); if (want.lengthSq() > 0) want.normalize().multiplyScalar(sp);
      W.vel.x += (want.x - W.vel.x) * Math.min(1, dt * 10); W.vel.z += (want.z - W.vel.z) * Math.min(1, dt * 10);
      if (K.Space && W.onGround && P.crouch < 0.3) { W.vel.y = 4.4; W.onGround = false; }
    } else { W.vel.x *= 0.8; W.vel.z *= 0.8; }
    W.vel.y -= 14 * dt; W.pos.addScaledVector(W.vel, dt);
    // 碰撞：边界圆 + 物体圆
    const rr = Math.hypot(W.pos.x, W.pos.z), lim = B.R - 0.4; if (rr > lim) { W.pos.x *= lim / rr; W.pos.z *= lim / rr; }
    for (const c of B.cols) { const dx = W.pos.x - c.x, dz = W.pos.z - c.z, d = Math.hypot(dx, dz), m = c.r + 0.35; if (d < m && d > 1e-5) { W.pos.x += dx / d * (m - d); W.pos.z += dz / d * (m - d); } }
    const gy = B.H(W.pos.x, W.pos.z); if (W.pos.y <= gy) { W.pos.y = gy; W.vel.y = 0; W.onGround = true; } else if (W.pos.y > gy + 0.05) W.onGround = false;
    const moving = Math.hypot(W.vel.x, W.vel.z);
    if (W.onGround && moving > 1) { W.stepT -= dt * moving; if (W.stepT <= 0) { W.stepT = 1.7; SFX.step && SFX.step(); } }
    const bob = W.onGround ? Math.sin(now * 9) * Math.min(1, moving / 3) * 0.03 : 0;
    const cam = G.camera; cam.position.set(W.pos.x, W.pos.y + P.h + bob, W.pos.z); cam.rotation.set(P.pitch, P.yaw, 0, 'YXZ');
    if (window.Combat && Combat.state && Combat.state.shake > 0) { cam.position.x += (Math.random() - 0.5) * Combat.state.shake * 0.08; cam.position.y += (Math.random() - 0.5) * Combat.state.shake * 0.08; }
    if (W.shake > 0) { W.shake -= dt; cam.position.x += (Math.random() - 0.5) * W.shake * 0.12; cam.position.y += (Math.random() - 0.5) * W.shake * 0.12; }
    // 太阳影子跟随
    B.sun.target.position.set(W.pos.x, W.pos.y, W.pos.z); B.sun.position.copy(B.sun.target.position).addScaledVector(B.sunDir, 70);
    if (B.sc.userData.skyM) B.sc.userData.skyM.position.copy(cam.position);
    if (B.sc.userData.fire) B.sc.userData.fire.intensity = 2.2 * (0.85 + Math.sin(now * 13) * 0.08 + Math.sin(now * 29) * 0.05);
    // 门：靠近提示
    W.doorNear = null; for (const d of B.doors) { const dd = Math.hypot(W.pos.x - d.x, W.pos.z - d.z); if (dd < 2.6) W.doorNear = d; d.label.visible = Math.hypot(cam.position.x - d.x, cam.position.z - d.z) < 34; }
    W.interNear = null; for (const it of B.inter) if (!it.done && Math.hypot(W.pos.x - it.x, W.pos.z - it.z) < 1.9) W.interNear = it;
    // 猎物 / 霸主
    if (W.foes) { Foe.update(dt, now); if (W.boss) W.boss.sayT -= dt; } else { updatePrey(dt, now); if (W.boss) updateBoss(dt, now); }
    W.headNear = W.foes ? Foe.nearHead(W.pos, G.player.yaw) : null;
    updateSay();
    if (window.Combat) { try { Combat.update(dt, now); Combat.prerender(); } catch (e) { console.warn(e); } }
    W.hintT -= dt; if (W.hintT <= 0) { W.hintT = 0.12; hud(); }
    if (G.S.hp <= 0) dieNow();
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
      for (const c of B.cols) { const ex = p.pos.x - c.x, ez = p.pos.z - c.z, e = Math.hypot(ex, ez), m = c.r + 0.3; if (e < m && e > 1e-5) { p.pos.x += ex / e * (m - e); p.pos.z += ez / e * (m - e); } }
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
    if (n > 0) { G.damage(n); W.trip.log.push({ t: `猎物反扑，你受了伤。`, d: `-${n} HP` }); }
  }
  function capture(p) {
    p.gone = true; W.B.sc.remove(p.g);
    const node = W.graph.nodes[W.cur]; node.prey.splice(node.prey.indexOf(p.h), 1);
    const s = G.st(), c = p.h.c;
    if (W.trip.res.heads.length >= s.cap) { G.toast(`麻袋满了（${s.cap} 颗），【${RN[c.rar]}】${c.name}的魂光散去了……`, '#aaa', 3); return; }
    W.trip.res.heads.push(p.h); W.trip.log.push({ t: `你在「${node.name}」追上了${c.name}。`, cls: 'gethead' });
    G.toast(`💀 获得首级【${RN[c.rar]}】${c.name}`, RC[c.rar], 3); SFX.chop && SFX.chop(); SFX.squish && SFX.squish(1); if (c.rar >= 2) SFX.fanfare && SFX.fanfare(c.rar);
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
    const dealt = Math.max(1, Math.round(22 * qa * sp * 0.5 * (0.85 + Math.random() * 0.3)));
    bo.hp = Math.max(0, bo.hp - dealt); bo.flash = 0.15; floatDmg(bo.pos, dealt, sp > 1.2);
    if (bo.sayT <= 0 && Math.random() < 0.35) { bossSay(pick(Math.random, bo.B.hurt), 2); bo.sayT = 4; }
    if (bo.hp <= 0) bossWin();
  }
  function bossWin(hIn, BoIn) {
    const bo = W.boss, Bo = BoIn || bo.B, loc = W.graph.nodes[W.cur].loc; if (bo) bo.dead = true;
    const h = hIn || RPG.bossHead(G.S, G.st(), loc, Bo, G.usedNames, G.usedSig);
    W.trip.res.heads.push(h); G.S.bosses = G.S.bosses || {}; G.S.bosses[loc.k] = { n: Bo.n, t: Bo.title, date: Date.now() }; G.S.rep = G.S.rep || {}; G.S.rep[loc.k] = (G.S.rep[loc.k] || 0) + 5;
    if (!hIn) bossSay(Bo.lose, 4); G.flash && G.flash('#ffffff', 1, 700); SFX.fanfare && SFX.fanfare(4); SFX.levelup && SFX.levelup(); W.shake = 1.2;
    W.trip.log.push({ t: `你击败了${Bo.title}${Bo.n}，带走了她的首级。`, cls: 'gethead' });
    const nd = W.graph.nodes[W.cur];
    setTimeout(() => { if (!W || !W.B) return; if (bo && bo.g) W.B.sc.remove(bo.g); W.dom.boss.style.display = 'none'; G.toast(`👑 ${Bo.title}「${Bo.n}」的首级到手了！`, Bo.col || '#ffd060', 5); nd.boss = false; }, hIn ? 200 : 1400);
  }
  function targets(center) {
    if (!W || !W.B || W.busy) return [];
    const out = [];
    for (const p of W.prey) if (!p.gone) out.push({ id: p.id, pos: p.pos, r: 0.38, kind: 'prey', onHit: (info) => { p.hp -= info.speed > 9 ? 2 : 1; p.flash = 0.15; p.seen = true; if (p.hp <= 0) capture(p); else if (p.sayT <= 0) { say(p, pick(Math.random, PREY_SAY.hit), '#ffb0a0'); p.sayT = 2; } } });
    if (W.foes) return out.concat(Foe.targets());
    if (W.boss && !W.boss.dead) out.push({ id: 'boss', pos: W.boss.pos, r: 0.8, kind: 'boss', onHit: bossHit });
    return out;
  }
  // ---- 说话气泡 ----
  function say(p, text, col) { const el = document.createElement('div'); el.className = 'wsay'; el.textContent = text; el.style.color = col || '#fff'; W.dom.root.appendChild(el); W.say.push({ el, p, t: 2.6 }); }
  function bossSay(text, t) { if (!W || !W.boss) return; const el = document.createElement('div'); el.className = 'wsay boss'; el.innerHTML = `<b style="color:${W.boss.B.col}">${esc(W.boss.B.n)}</b>「${esc(text)}」`; W.dom.root.appendChild(el); W.say.push({ el, p: W.boss, t: t || 3, off: 1.2 }); }
  function floatDmg(pos, n, big) { const el = document.createElement('div'); el.className = 'wsay dmg'; el.textContent = n; if (big) el.style.fontSize = '30px'; W.dom.root.appendChild(el); W.say.push({ el, p: { pos: pos.clone() }, t: 0.8, rise: 1 }); }
  const sv = new V3();
  function updateSay() {
    for (let i = W.say.length - 1; i >= 0; i--) { const s = W.say[i]; s.t -= 1 / 60; if (s.t <= 0 || s.p.gone) { s.el.remove(); W.say.splice(i, 1); continue; }
      sv.copy(s.p.pos); sv.y += 0.6 + (s.off || 0) + (s.rise ? (0.8 - s.t) * 1.2 : 0); sv.project(G.camera);
      if (sv.z > 1) { s.el.style.display = 'none'; continue; } s.el.style.display = 'block'; s.el.style.left = ((sv.x + 1) / 2 * innerWidth) + 'px'; s.el.style.top = ((1 - sv.y) / 2 * innerHeight) + 'px'; s.el.style.opacity = Math.min(1, s.t * 2); }
  }

  // ================= 输入（game.js 在世界里把按键转给这里）=================
  function onKey(e) {
    if (!W) return false;
    if (e.code === 'Tab' || e.code === 'Escape') { if (W.mapOpen && e.code === 'Escape') { toggleMap(false); return true; } return false; }
    if (W.busy || W.dead) return true;
    if (e.code === 'KeyM') { toggleMap(); return true; }
    if (W.mapOpen) return true;
    if (e.code === 'KeyE' && !e.repeat) {
      if (W.headNear) { const hd = W.headNear; if (takeHead(hd)) Foe.pickup(hd); return true; }
      if (W.interNear) { openChest(W.interNear); return true; }
      if (W.doorNear) { const d = W.doorNear; if (d.home) leaveHome(); else { SFX.open && SFX.open(); goto(d.to, W.cur); } return true; }
    }
    if (e.code === 'KeyF' && window.Combat && Combat.enabled) { Combat.toggle(); return true; }
    if (e.code === 'KeyH') { const S = G.S, s = G.st(); G.useItem(S.items.bigpotion && s.maxHp - S.hp > s.maxHp * 0.6 ? 'bigpotion' : 'potion'); return true; }
    return true; // 其余洞窟按键（建造/投掷/碾碎……）在外面无效
  }
  function onDown(btn) { if (!W || W.busy) return true; if (window.Combat && Combat.enabled) { if (!Combat.drawn) { Combat.toggle(true); return true; } Combat.onDown(btn); } return true; }
  function openChest(it) {
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
      .wsay.boss{font-size:17px;border:1px solid #ffd06066}.wsay.dmg{background:none;color:#ffe0a0;font-weight:900;font-size:22px;text-shadow:0 2px 4px #000}
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
    const st = STYLES[node.style], b = DOM.banner; b.querySelector('.n').textContent = node.name; b.querySelector('.s').textContent = `${node.loc.icon} ${node.loc.n} · ${st.n} · ${SIZES[node.size].n}${node.home ? ' · 回洞的门在这里' : ''}`;
    b.style.opacity = 1; clearTimeout(banner._t); banner._t = setTimeout(() => { b.style.opacity = 0; }, 2600);
    const bo = W.boss; if (bo) DOM.boss.querySelector('.bn').innerHTML = `👑 ${esc(bo.B.title)} · ${esc(bo.B.n)}`; DOM.boss.style.display = 'none';
  }
  function hud() {
    if (!W || !W.B || !DOM) return; const node = W.graph.nodes[W.cur], st = STYLES[node.style], s = G.st();
    DOM.top.querySelector('.n').textContent = node.name; DOM.top.querySelector('.s').textContent = `${node.loc.icon} ${node.loc.n} · ${st.n} · ${SIZES[node.size].n} · 已探索 ${W.graph.nodes.filter(n => n.visited).length}/${W.graph.nodes.length}`;
    const left = W.foes ? W.foes.filter(f => !f.dead).length : W.prey.filter(p => !p.gone).length;
    DOM.stat.innerHTML = `<div class="hp"><i style="width:${clamp(G.S.hp / s.maxHp, 0, 1) * 100}%"></i></div>❤️ ${Math.round(G.S.hp)}/${s.maxHp} · 🧪${G.S.items.potion || 0}<br>🧺 ${W.trip.res.heads.length}/${s.cap} · 🔮 +${W.trip.coins}${left ? `<br><span style="color:#9fd0ff">✨ 此地还有 ${left} 缕魂光</span>` : ''}`;
    let h = 'WASD 走动 · <b>F</b> 拔刀（按住左键挥砍 / 连点刺 / 右键格挡）· <b>M</b> 地图 · <b>H</b> 喝药';
    if (W.headNear) h = `<b>E</b> 拾取首级 · 【${RN[W.headNear.h.c.rar]}】${esc(W.headNear.h.c.name)}`;
    else if (W.interNear) h = '<b>E</b> 打开宝箱';
    else if (W.doorNear) { const d = W.doorNear, cn = W.graph.nodes[W.cur]; h = d.home ? '<b>E</b> 回到魂首窟（结束狩猎，带回首级）' : `<b>E</b> 穿过门 → ${esc(doorName(cn, d))}` + (W.graph.nodes[d.to].region !== cn.region ? ` <span style="color:#f0a060">（推荐战力 ${W.graph.nodes[d.to].loc.rec}）</span>` : ''); }
    DOM.hint.innerHTML = h;
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

  return { start, frame, onKey, onDown, stop, get active() { return !!W; }, get _W() { return W; }, STYLES, REGION, genGraph, genWorld, need, _debug: { goto: (i) => W && goto(i, W.cur), buildNode, targets } };
})();
