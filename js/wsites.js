// R41（主管）：特殊地点——人群聚集的场所（MOD wsites，默认开）
// 一趟行程里的部分普通地点会变成“集会”：赶集日 / 篝火夜会 / 朝圣集会 / 魔女夜宴 / 流民营地 / 斗技圈 / 伐木营。
// 每种有自己的布景（桌摊、篝火、神像、坩埚、擂台…）和站位（摊主、围坐、跪拜、围圈施法、观众…），5–8 人各就各位做自己的事（坐着/蹲着烤火/跪拜/吆喝/喝酒/砍柴）。
// 玩法：人多 = 首级多、战利品多；但一个人发现你会喊醒附近所有人——胆大的冲上来，胆小的四散逃向门口。蹲下潜行、挑边缘落单的下手。
// 接入点（worlds.js，均有 window.WSites 判断）：LAYOUTS 注册 site_* / layOf 选址 / layPlan 平整场地 / layPlace 摆布景 / populate 人数+额外宝箱 / goto 站位 / 门牌+横幅；foe.js idle 分支：守在自己的位置上。
// 布景只用仓库里已有的 CC0 模型（Poly Haven：big/world/* 懒加载 + assets/* 常驻），不做程序化模型。
window.WSites = (() => {
  const on = () => !(window.Mods && Mods.on && Mods.on('wsites') === false);
  const mulberry = (a) => () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const V3 = () => THREE.Vector3;
  // n: 默认名；nr: 各地区的叫法；reg: 地区权重；cnt: 人数；rad: 平整半径；need: big/world 懒加载模型
  const KINDS = {
    fair: { n: '赶集日', ico: '🎪', nr: { capital: '王都夜市', fortress: '兵营集市', abbey: '修道院义卖', wilds: '荒原货栈' }, reg: { village: 1.3, capital: 1.5, fortress: 0.6, abbey: 0.3, wilds: 0.25 }, cnt: [6, 8], rad: 9,
      need: ['wooden_picnic_table', 'painted_wooden_bench', 'wooden_barrels_01', 'wooden_crate_02', 'wicker_basket_01', 'wooden_bucket_01', 'street_lamp_01'],
      hint: '人声鼎沸的集市——摊主守着摊子，买家三三两两在讨价还价。被一个人看见，整条街都会炸锅。',
      say: ['新鲜的萝卜！三个铜板！', '这布料你摸摸，王都来的。', '便宜点嘛，大姐。', '听说北边又有人丢了脑袋……', '别挤别挤！'] },
    bonfire: { n: '篝火夜会', ico: '🔥', nr: { village: '丰收篝火', peak: '雪夜篝火', wilds: '荒原营火会' }, reg: { village: 1, forest: 0.8, wilds: 0.6, peak: 1 }, cnt: [5, 8], rad: 7.5,
      need: ['painted_wooden_bench', 'wooden_stool_01', 'wooden_crate_02', 'dead_tree_trunk', 'wooden_barrels_01', 'wicker_basket_01'],
      hint: '一圈人围着大篝火，坐着的、蹲着烤手的、端着杯子聊天的。火光照得见人，也照得见你。',
      say: ['再添点柴！', '今年的收成还行。', '唱一个嘛！', '你们听说食人魔的事了吗……', '干杯！'] },
    pilgrims: { n: '朝圣集会', ico: '🕯️', nr: { abbey: '晨祷集会', peak: '山巅朝圣', capital: '圣像巡礼', abyss: '深渊邪祷' }, reg: { abbey: 1.5, peak: 1, capital: 0.6, abyss: 0.6, village: 0.2 }, cnt: [6, 8], rad: 8,
      need: ['gothic_statue', 'painted_wooden_bench'],
      hint: '信徒们跪在圣像前低声祈祷，领祷者面朝人群。跪着的人最晚发现你——但领祷者一喊，所有人都会回头。',
      say: ['……愿魂火庇佑。', '……请宽恕我们。', '……', '赞美——', '（低声的祷词）'] },
    sabbath: { n: '魔女夜宴', ico: '🧪', nr: { abyss: '深渊邪祭', forest: '林中秘会' }, reg: { swamp: 1.5, abyss: 1.2, forest: 0.4 }, cnt: [5, 7], rad: 7,
      need: ['namaqualand_boulder_03', 'namaqualand_boulder_04', 'wooden_barrels_01'],
      hint: '一圈人围着冒绿光的坩埚念咒，专心得连头都不回。绕到她们身后——但坩埚的光会把你的影子投到她们眼前。',
      say: ['……咕噜、咕噜……', '再加一只蛤蟆。', '月亮快到正上方了。', '……', '嘻嘻嘻……'] },
    refugees: { n: '流民营地', ico: '⛺', nr: { swamp: '沼泽难民棚', fortress: '城下流民', abyss: '裂隙边的逃难者' }, reg: { wilds: 1, swamp: 0.6, fortress: 0.6, abbey: 0.4, abyss: 0.4, peak: 0.4 }, cnt: [5, 8], rad: 9,
      need: ['wooden_crate_02', 'wooden_military_crate', 'wooden_barrels_01', 'wicker_basket_01', 'wooden_bucket_01', 'wooden_stool_01', 'dead_tree_trunk'],
      hint: '逃难的人挤在几堆小火旁，守夜的提着灯在外圈走动。她们本来就怕，一有动静就跑。',
      say: ['还有多远……', '别出声。', '我的鞋底磨穿了。', '守夜的换班了没？', '明天往南走。'] },
    arena: { n: '斗技圈', ico: '⚔️', nr: { fortress: '要塞校场', capital: '地下斗技场', wilds: '部落角力场', abyss: '血池斗场' }, reg: { fortress: 1.2, wilds: 0.8, capital: 0.5, abyss: 0.5 }, cnt: [6, 8], rad: 9,
      need: ['wooden_crate_02', 'wooden_barrels_01', 'wooden_military_crate', 'namaqualand_boulder_03'],
      hint: '观众围成一圈看两个人比划。这里的人胆子都大，发现你之后冲上来的会比别处多。',
      say:['打啊！', '押左边的！', '别光躲！', '好！', '再来一回合！'], brave: 0.25 },
    woodcut: { n: '伐木营', ico: '🪓', nr: { village: '村外柴场' }, reg: { forest: 1, village: 0.7 }, cnt: [5, 7], rad: 8,
      need: ['tree_stump_01', 'tree_stump_02', 'dead_tree_trunk', 'dead_tree_trunk_02', 'wooden_crate_02', 'wicker_basket_01'],
      hint: '砍柴声此起彼伏，谁也听不见谁。趁着斧头落下的声音靠近。',
      say: ['嘿——哟！', '这根够粗。', '歇会儿吧。', '斧头该磨了。', '小心脚下！'] }
  };
  const regOf = node => node.region || (node.loc && node.loc.k) || 'village';
  // ---- 选址（按节点种子，结果稳定）----
  function pick(node) {
    if (node.site !== undefined) return node.site || null;
    if (!on() || node.home || node.boss || node.stone) return (node.site = '') || null;
    const r = mulberry((node.seed ^ 0x51735173) >>> 0), p = ({ s: 0.1, m: 0.26, l: 0.36 })[node.size] || 0.2;
    if (r() > p) return (node.site = '') || null;
    const reg = regOf(node), ws = Object.entries(KINDS).map(([k, K]) => [k, K.reg[reg] || 0]).filter(x => x[1] > 0);
    if (!ws.length) return (node.site = '') || null;
    let x = r() * ws.reduce((a, w) => a + w[1], 0), k = ws[0][0]; for (const [kk, w] of ws) { if ((x -= w) <= 0) { k = kk; break; } }
    return (node.site = k);
  }
  const K = node => KINDS[node.site] || null;
  const label = node => { const k = K(node); return k ? (k.nr[regOf(node)] || k.n) : ''; };
  function register(LAYOUTS) { for (const k in KINDS) LAYOUTS['site_' + k] = { n: KINDS[k].n, st: [], need: KINDS[k].need, site: k }; }
  function count(node, n, r) { const k = K(node); if (!k) return n; const mx = +(location.search.match(/[?&]sitemax=(\d+)/) || [])[1] || 99; return Math.min(mx, Math.max(n, k.cnt[0] + Math.floor(r() * (k.cnt[1] - k.cnt[0] + 1)))); }
  function bonusLoot(node, r) { // 人多的地方东西也多
    const k = K(node); if (!k) return; const lo = node.loc.loot || [10, 30];
    node.chests.push({ coin: Math.round((lo[0] + r() * (lo[1] - lo[0])) * (2.5 + r() * 2.5)), potion: r() < 0.5 });
  }
  // ---- 地形：以集会中心为圆心压平一块场地 ----
  function plan(P, node, doorList, far) {
    const k = K(node); if (!k) return P; const r = P.r, R = P.R;
    // 中心：略偏离正中、朝着离门最远的方向，保证从门口看得见全景
    const a = far(), d = Math.min(R * 0.22, Math.max(0, R - k.rad - 4)); P.cx = Math.cos(a) * d; P.cz = Math.sin(a) * d; P.rad = Math.min(k.rad, R * 0.62); P.site = node.site; P.ry = r() * Math.PI * 2;
    P.flat = (x, z) => sstep(P.rad * 0.85, P.rad + 5, Math.hypot(x - P.cx, z - P.cz));
    P.skip = (kind, x, z) => { const dd = Math.hypot(x - P.cx, z - P.cz); return kind === 'grass' ? dd < P.rad * (node.site === 'arena' || node.site === 'fair' ? 0.8 : 0.45) : dd < P.rad + 1.5; };
    return P;
  }
  // ---- 布景 + 站位 ----
  function place(P, C) {
    const { sc, H, put, variants, mark, cols, spots, st, r, face } = C, cx = P.cx, cz = P.cz, S = P.slots = [];
    const one = (names) => { const vs = variants(names); return vs.length ? vs[Math.floor(r() * vs.length)] : null; };
    const A = (name, o) => { if (!window.Assets || !Assets.has || !Assets.has(name)) return null; const g = Assets.fit(name, o); if (g) sc.add(g); return g; };
    const lamp = (x, z, y, col, I, dist) => { const pl = new THREE.PointLight(col, I, dist || 10, 2); pl.position.set(x, y, z); sc.add(pl); return pl; };
    const fireAt = (x, z, w, I) => { const y = H(x, z); A('stone_fire_pit', { w, x, y, z }); const fl = window.Assets && Assets.flame && Assets.flame(x, y + 0.15, z, 4 + w * 2); if (fl) sc.add(fl); const pl = lamp(x, z, y + 0.9, '#ff9a50', I, 11 + w * 3); sc.userData.fire = sc.userData.fire || pl; cols.push({ x, z, r: w * 0.5 }); mark(x, z, w * 0.8); };
    const slot = (x, z, tx, tz, clip, o) => { S.push(Object.assign({ x, z, ry: face(x, z, tx, tz), clip }, o || {})); };
    // 座位：放在臀部正下方（Sitting_Idle_Loop 的臀部约在根骨后 0.1m、高 0.46m），缩放到坐高；长边沿切线
    const seat = (x, z, ry, kind) => { const v = one(kind === 'log' ? ['wooden_crate_02'] : kind === 'bench' ? ['painted_wooden_bench'] : ['wooden_stool_01']) || one(['wooden_stool_01', 'painted_wooden_bench', 'wooden_crate_02']); if (!v) return; const sz = v.t.size, log = v.n === 'dead_tree_trunk';
      const s = log ? Math.min(1.4 / Math.max(sz.x, sz.z), 0.44 / Math.max(0.05, sz.y)) : 0.46 / Math.max(0.05, sz.y) * (v.n === 'painted_wooden_bench' ? 1.0 : 1);
      put(v.t, x - Math.sin(ry) * 0.12, z - Math.cos(ry) * 0.12, s, ry + (sz.x >= sz.z ? 0 : Math.PI / 2)); }; // 不加碰撞体：人就坐在上面，加了会被推开再走回来
    const polar = (a, d) => [cx + Math.cos(a) * d, cz + Math.sin(a) * d];
    const ax = Math.cos(P.ry), az = Math.sin(P.ry), nx = -az, nz = ax; // 场地主轴
    const k = P.site, night = !!st.night;
    if (k === 'fair') { // 两排摊位夹一条街；摊主站摊后，买家在街上成对聊
      const n = 3; for (let i = 0; i < n; i++) for (const sd of [-1, 1]) {
        const t = (i - (n - 1) / 2) * 4.2, x = cx + ax * t + nx * sd * 3.2, z = cz + az * t + nz * sd * 3.2, ry = Math.atan2(-nx * sd, -nz * sd);
        const tb = one(['wooden_picnic_table']); if (tb) { put(tb.t, x, z, 1, ry + Math.PI / 2); cols.push({ x, z, r: 1.0 }); mark(x, z, 1.6); }
        const ty = H(x, z) + 0.76, goods = ['wicker_basket_01', 'carved_wooden_plate', 'brass_goblets', 'tea_set_01', 'wooden_bucket_02', 'brass_pot_01', 'vintage_oil_lamp'];
        for (let j = 0; j < 3; j++) { const gname = goods[Math.floor(r() * goods.length)], off = (j - 1) * 0.55; A(gname, { w: gname === 'tea_set_01' ? 0.45 : gname === 'brass_goblets' ? 0.22 : 0.34, x: x + ax * off, y: ty, z: z + az * off, ry: r() * 6.28 }); }
        if (r() < 0.6) { const b = one(['wooden_barrels_01', 'wooden_crate_02']); if (b) { const bx = x + ax * 1.6 + nx * sd * 0.6, bz = z + az * 1.6 + nz * sd * 0.6; put(b.t, bx, bz, 1, r() * 6.28); cols.push({ x: bx, z: bz, r: 0.5 }); } }
        slot(x + nx * sd * 1.6, z + nz * sd * 1.6, x - nx * sd, z - nz * sd, r() < 0.5 ? 'Idle_FoldArms_Loop' : 'Idle_Talking_Loop', { role: '摊主' }); // 摊主（摊子后面，面朝街）
      }
      for (let i = 0; i < 3; i++) { const t = (i - 1) * 4.2 + (r() - 0.5), x = cx + ax * t, z = cz + az * t, o = 0.6; // 街上一对对的买家
        slot(x + ax * o, z + az * o, x - ax * o, z - az * o, 'Idle_Talking_Loop', { role: '买家' }); slot(x - ax * o, z - az * o, x + ax * o, z + az * o, i === 1 ? 'Consume' : 'Idle_Loop', { role: '买家' }); }
      A('standing_chalkboard_01', { h: 1.1, x: cx + ax * 7.2, y: H(cx + ax * 7.2, cz + az * 7.2), z: cz + az * 7.2, ry: P.ry + Math.PI / 2 });
      const lp = one(['street_lamp_01']); if (lp) for (const sd of [-1, 1]) { const x = cx + ax * 7.6 * sd + nx * 2.2, z = cz + az * 7.6 * sd + nz * 2.2; put(lp.t, x, z, 1, 0); cols.push({ x, z, r: 0.3 }); lamp(x, z, H(x, z) + lp.t.size.y * 0.9, '#ffc070', night ? 2.2 : 0.8, 12); }
    } else if (k === 'bonfire') { // 大篝火 + 内圈蹲着烤手 + 中圈坐着 + 外圈站着聊
      fireAt(cx, cz, 1.9, night ? 3.2 : 2.2);
      const nSeat = 6, a0 = r() * 6.28;
      for (let i = 0; i < nSeat; i++) { const a = a0 + i / nSeat * Math.PI * 2, [x, z] = polar(a, 3.4), ry = face(x, z, cx, cz); const kind = i % 3 === 0 ? 'log' : i % 3 === 1 ? 'bench' : 'stool';
        seat(x, z, ry, kind); slot(x, z, cx, cz, 'Sitting_Idle_Loop', { sit: 1, role: '围坐' }); }
      for (let i = 0; i < 3; i++) { const a = a0 + (i + 0.5) / 3 * Math.PI * 2, [x, z] = polar(a, 2.3); slot(x, z, cx, cz, 'Crouch_Idle_Loop', { role: '烤火' }); }
      for (let i = 0; i < 2; i++) { const a = a0 + Math.PI * (0.3 + i * 1.1), [x, z] = polar(a, 5.4); slot(x, z, cx, cz, i ? 'Consume' : 'Idle_Talking_Loop', { role: '闲聊' }); }
      const [bx, bz] = polar(a0 + Math.PI * 0.8, 5.6), b = one(['wooden_barrels_01']); if (b) { put(b.t, bx, bz, 1, r() * 6.28); cols.push({ x: bx, z: bz, r: 0.6 }); }
      const [wx, wz] = polar(a0 + Math.PI * 1.3, 5.2); A('wine_barrel_01', { h: 0.9, x: wx, y: H(wx, wz), z: wz, ry: r() * 6.28 }); cols.push({ x: wx, z: wz, r: 0.45 });
      S.sort((p, q) => (p.role === '围坐' ? 0 : 1) - (q.role === '围坐' ? 0 : 1) || r() - 0.5);
    } else if (k === 'pilgrims') { // 圣像 + 烛台弧 + 跪拜的行列 + 领祷者 + 持火把的守卫
      const [sx, sz] = [cx + ax * 4.2, cz + az * 4.2]; const v = one(['gothic_statue']); if (v) { const s = 2.8 / v.t.size.y; put(v.t, sx, sz, s, Math.atan2(-ax, -az)); cols.push({ x: sx, z: sz, r: Math.max(v.t.size.x, v.t.size.z) * s * 0.45 }); mark(sx, sz, 2); }
      for (let i = -3; i <= 3; i++) { const a = P.ry + Math.PI + i * 0.3, x = sx + Math.cos(a) * 2.0, z = sz + Math.sin(a) * 2.0; const g = A('brass_candleholders', { h: 0.42, x, y: H(x, z), z, ry: r() * 6.28 }); if (g && i % 2 === 0) { const fl = window.Assets && Assets.flame && Assets.flame(x, H(x, z) + 0.44, z, 0.9); if (fl) sc.add(fl); } }
      lamp(sx - ax * 2, sz - az * 2, H(sx, sz) + 1.2, '#ffcf8a', night ? 2.4 : 1.2, 9);
      slot(sx - ax * 2.9, sz - az * 2.9, cx - ax * 3, cz - az * 3, 'Spell_Simple_Idle_Loop', { role: '领祷者', lead: 1 });
      for (let row = 0; row < 2; row++) for (let j = -1; j <= 1; j++) { const t = -0.4 - row * 1.6, x = cx + ax * t + nx * j * 1.3, z = cz + az * t + nz * j * 1.3; slot(x, z, sx, sz, 'Crouch_Idle_Loop', { role: '信徒', kneel: 1 }); /* Fixing_Kneeling 是一次性动作，循环播像在跳舞 */ }
      for (const sd of [-1, 1]) { const x = cx + nx * sd * 4.2 + ax * 1.2, z = cz + nz * sd * 4.2 + az * 1.2; slot(x, z, cx, cz, 'Idle_Torch_Loop', { role: '守卫' }); }
      const b = one(['painted_wooden_bench']); if (b) for (const sd of [-1, 1]) { const x = cx - ax * 4 + nx * sd * 1.6, z = cz - az * 4 + nz * sd * 1.6; put(b.t, x, z, 1, P.ry + Math.PI / 2); cols.push({ x, z, r: 0.7 }); }
      S.sort((p, q) => (q.lead || 0) - (p.lead || 0)); // 领祷者一定在场
    } else if (k === 'sabbath') { // 坩埚 + 绿光 + 围圈施法 + 外圈立石
      const y = H(cx, cz); A('stone_fire_pit', { w: 1.3, x: cx, y, z: cz }); A('brass_pot_01', { w: 0.95, x: cx, y: y + 0.18, z: cz }); cols.push({ x: cx, z: cz, r: 0.8 }); mark(cx, cz, 1.5);
      const fl = window.Assets && Assets.flame && Assets.flame(cx, y + 0.1, cz, 3.5); if (fl) sc.add(fl);
      const pl = lamp(cx, cz, y + 1.3, '#66ff88', night ? 3.0 : 1.8, 12); sc.userData.fire = sc.userData.fire || pl;
      const n = 7, a0 = r() * 6.28; for (let i = 0; i < n; i++) { const a = a0 + i / n * Math.PI * 2, [x, z] = polar(a, 2.6); slot(x, z, cx, cz, i % 3 === 2 ? 'Idle_No_Loop' : 'Spell_Simple_Idle_Loop', { role: '魔女' }); }
      const vs = variants(['namaqualand_boulder_03', 'namaqualand_boulder_04']); if (vs.length) for (let i = 0; i < 6; i++) { const a = a0 + (i + 0.5) / 6 * Math.PI * 2, [x, z] = polar(a, 5.6), v = vs[i % vs.length], s = 1.5 / v.t.size.y; put(v.t, x, z, s, r() * 6.28); cols.push({ x, z, r: Math.max(v.t.size.x, v.t.size.z) * s * 0.4 }); }
      for (let i = 0; i < 5; i++) { const a = a0 + i * 1.3, [x, z] = polar(a, 1.6 + r() * 0.3); A('brass_candleholders', { h: 0.3, x, y: H(x, z), z, ry: r() * 6.28 }); }
    } else if (k === 'refugees') { // 几堆小火 + 行李堆 + 坐着蹲着的人 + 提灯守夜
      const fires = [[-3, -1.5], [3, 1.2], [0.5, 4]].map(([u, v]) => [cx + ax * u + nx * v, cz + az * u + nz * v]);
      fires.forEach(([x, z], i) => { fireAt(x, z, 0.9, night ? 1.6 : 1.0);
        for (let j = 0; j < 2; j++) { const a = r() * 6.28 + j * Math.PI, sx = x + Math.cos(a) * 1.5, sz = z + Math.sin(a) * 1.5, ry = face(sx, sz, x, z);
          if (j === 0) { seat(sx, sz, ry, i === 1 ? 'log' : 'stool'); slot(sx, sz, x, z, 'Sitting_Idle_Loop', { sit: 1, role: '流民' }); }
          else slot(sx, sz, x, z, 'Crouch_Idle_Loop', { role: '流民' }); } });
      for (let i = 0; i < 7; i++) { const a = r() * 6.28, d = 5 + r() * 2.5, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; const v = one(['wooden_crate_02', 'wooden_military_crate', 'wooden_barrels_01', 'wicker_basket_01', 'wooden_bucket_01']); if (v) { put(v.t, x, z, 1, r() * 6.28); cols.push({ x, z, r: 0.5 }); } }
      A('wooden_ladder', { h: 2.2, x: cx - ax * 6, y: H(cx - ax * 6, cz - az * 6), z: cz - az * 6, ry: P.ry, rx: -0.25 });
      for (let i = 0; i < 2; i++) { const a = P.ry + i * Math.PI + 0.7, [x, z] = polar(a, 7.2); slot(x, z, x + Math.cos(a + 1.57), z + Math.sin(a + 1.57), 'Idle_Lantern_Loop', { role: '守夜', patrol: 1 }); }
      S.sort(() => r() - 0.5);
    } else if (k === 'arena') { // 箱子/石头围出擂台 + 兵器架 + 两个对练者 + 一圈观众
      const vs = variants(['wooden_crate_02', 'wooden_military_crate', 'namaqualand_boulder_03']); const n = 12;
      for (let i = 0; i < n; i++) { if (i % 4 === 0) continue; const a = P.ry + i / n * Math.PI * 2, [x, z] = polar(a, 4.4), v = vs.length ? vs[i % vs.length] : null; if (v) { const s = v.n.startsWith('namaqualand') ? 0.9 / v.t.size.y : 1; put(v.t, x, z, s, r() * 6.28); cols.push({ x, z, r: 0.5 }); } }
      const [kx, kz] = polar(P.ry + Math.PI * 0.5, 6.4); A('katana_stand_01', { w: 0.9, x: kx, y: H(kx, kz), z: kz, ry: face(kx, kz, cx, cz) }); cols.push({ x: kx, z: kz, r: 0.5 });
      const [sx2, sz2] = polar(P.ry + Math.PI * 0.62, 6.3); A('kite_shield', { h: 0.9, x: sx2, y: H(sx2, sz2) + 0.02, z: sz2, ry: face(sx2, sz2, cx, cz), rx: -0.25 });
      slot(cx + ax * 1.2, cz + az * 1.2, cx - ax, cz - az, 'Sword_Idle', { role: '擂主', duel: 1 }); slot(cx - ax * 1.2, cz - az * 1.2, cx + ax, cz + az, 'Idle_Shield_Loop', { role: '挑战者', duel: 1 });
      for (let i = 0; i < 8; i++) { const a = P.ry + (i + 0.5) / 8 * Math.PI * 2, [x, z] = polar(a, 5.6 + (i % 2) * 0.5); slot(x, z, cx, cz, ['Idle_FoldArms_Loop', 'Yes', 'Idle_Talking_Loop', 'Idle_Loop'][i % 4], { role: '观众' }); }
      S.sort((p, q) => (q.duel || 0) - (p.duel || 0));
      const lp = one(['wooden_barrels_01']); if (lp && night) lamp(cx, cz, H(cx, cz) + 4, '#ffd8a0', 1.6, 14);
    } else if (k === 'woodcut') { // 树桩 + 砍柴的人 + 木头堆 + 斧头
      const stumps = variants(['tree_stump_01', 'tree_stump_02']), logs = variants(['dead_tree_trunk', 'dead_tree_trunk_02']);
      for (let i = 0; i < 5; i++) { const a = P.ry + i / 5 * Math.PI * 2 + (r() - 0.5) * 0.4, [x, z] = polar(a, 3.4 + r() * 1.2); const v = stumps.length ? stumps[i % stumps.length] : null; if (v) { const s = Math.min(0.55 / Math.max(0.1, v.t.size.y), 0.8 / Math.max(0.1, v.t.size.x, v.t.size.z)); put(v.t, x, z, s, r() * 6.28); cols.push({ x, z, r: 0.45 }); }
        const b = a + (r() - 0.5) * 0.8, px = x + Math.cos(b) * 1.05, pz = z + Math.sin(b) * 1.05; slot(px, pz, x, z, i < 3 ? 'TreeChopping_Loop' : 'Farm_Harvest', { role: '樵夫' }); }
      if (logs.length) for (let i = 0; i < 4; i++) { const x = cx + nx * (0.6 * i - 0.9), z = cz + nz * (0.6 * i - 0.9); const v = logs[i % logs.length], s = 2.2 / Math.max(v.t.size.x, v.t.size.z); put(v.t, x, z, s, P.ry, H(x, z) + (i === 3 ? 0.35 : 0)); cols.push({ x, z, r: 0.5 }); }
      for (let i = 0; i < 2; i++) { const [x, z] = polar(P.ry + 2 + i, 6); A('wooden_axe_02', { h: 0.75, x, y: H(x, z), z, ry: r() * 6.28, rz: 1.45 }); }
      const [wx, wz] = polar(P.ry + Math.PI, 5.5); A('wooden_crate_01', { w: 0.8, x: wx, y: H(wx, wz), z: wz, ry: r() * 6.28 }); cols.push({ x: wx, z: wz, r: 0.5 });
      slot(cx - nx * 2.2, cz - nz * 2.2, cx, cz, 'Idle_Talking_Loop', { role: '工头' }); slot(cx - nx * 2.2 + ax, cz - nz * 2.2 + az, cx, cz, 'Consume', { role: '歇脚' });
    }
    mark(cx, cz, P.rad * 0.95); // 整块场地占住：随机地标（篝火/石阵/墙）和宝箱不会再落进集会中间
    spots.push({ x: cx, z: cz });
    return P;
  }
  // ---- 就位：朝向 + 循环动作 ----
  function seat(foes, P) {
    if (!foes || !P || !P.slots) return; const k = KINDS[P.site] || {};
    foes.forEach((fo, i) => { const s = P.slots[i]; if (!s || fo.boss) return;
      fo.slot = s; fo.yaw = s.ry; fo.f.root.rotation.y = s.ry; fo.home = new THREE.Vector3(s.x, 0, s.z);
      const clip = fo.f.clips && fo.f.clips[s.clip] ? s.clip : 'Idle_Talking_Loop'; fo.idleClip = clip; fo.f.play(clip, { fade: 0 }); try { fo.f.mixer.setTime(Math.random() * 3); } catch (e) {}
      if (k.brave && !fo.brave && Math.random() < k.brave) fo.brave = true; // 斗技圈的人更敢上
      if (s.duel) fo.brave = true;
      if (fo.per) fo.per.home = { x: s.x, z: s.z }; });
  }
  // foe.js idle 分支：守着自己的位置做自己的事（被推开会走回去）；返回 true = 这一帧由站位接管
  function idle(fo, dt) {
    const s = fo.slot; if (!s || !on()) return false; const f = fo.f;
    const dx = s.x - fo.pos.x, dz = s.z - fo.pos.z, d = Math.hypot(dx, dz);
    if (d > 0.45) { fo.slotT = Math.atan2(dx, dz); fo.slotS = 1.0; f.play(f.clips.Walk_Loop ? 'Walk_Loop' : fo.idleClip, { fade: 0.3 }); return true; }
    fo.slotT = s.ry; fo.slotS = 0; f.play(fo.idleClip, { fade: 0.35 }); return true;
  }
  function hint(node) { const k = K(node); return k ? `${k.ico} ${label(node)}：${k.hint}` : ''; }
  function ico(node) { pick(node); const k = K(node); return k ? k.ico : ''; }
  function line(node) { const k = K(node); return k ? k.say[Math.floor(Math.random() * k.say.length)] : ''; }
  return { KINDS, on, pick, label, register, count, bonusLoot, plan, place, seat, idle, hint, ico, line };
})();
