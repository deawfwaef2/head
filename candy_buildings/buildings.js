// 糖果收纳建筑包（独立文件，不接入任何游戏接口）
// 格式沿用原项目建筑写法：cat / n / icon / base / grow / fp / stat / depth / showcase / desc / mount.slots
// 额外字段：mech = 机制参数（引擎无关，移植时按 type 实现），fx = 反馈表现，E = 空手按 E 的互动
// slots 坐标：[x, y, z, yaw]，单位米，相对建筑原点（地面中心），yaw 为弧度
// 放置物：球体（糖球 / 玻璃珠 / 扭蛋 / 彩蛋……），每颗球有 color(色相 0~360)、size、clarity(透明度 0~1)、rarity(0~4)

(function () {
  const r3 = v => Math.round(v * 1000) / 1000;
  // 竖直墙面网格（cols × rows），dx/dy 间距，y0 最低一排高度，z 前后位置
  const wallGrid = (cols, rows, dx, dy, y0, z = 0) => {
    const s = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) s.push([r3((c - (cols - 1) / 2) * dx), r3(y0 + r * dy), z, 0]);
    return s;
  };
  // 水平面网格（cols × rows），d 间距，y 高度
  const flatGrid = (cols, rows, d, y) => {
    const s = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) s.push([r3((c - (cols - 1) / 2) * d), y, r3((r - (rows - 1) / 2) * d), 0]);
    return s;
  };
  // 一排
  const row = (n, x0, x1, y, z = 0) => Array.from({ length: n }, (_, k) => [r3(x0 + (x1 - x0) * (n === 1 ? 0.5 : k / (n - 1))), y, z, 0]);
  // 竖直的串（珠帘、算盘）：strands 串，每串 per 颗
  const strands = (n, per, x0, x1, yTop, dy, z = 0) => {
    const s = [];
    for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * (n === 1 ? 0.5 : i / (n - 1)); for (let k = 0; k < per; k++) s.push([r3(x), r3(yTop - k * dy), z, 0]); }
    return s;
  };

  const C = {};

  // 1) 渐变糖罐墙 —— 色彩排序
  C.gradient_jar_wall = {
    cat: 'func', n: '渐变糖罐墙', icon: '🍬', base: 600, grow: 1.5, fp: [1.6, 0.4],
    stat: { comfort: 4, view: 5 }, depth: 1, showcase: true,
    desc: '一整面玻璃糖罐墙，每个罐子放一颗糖球。相邻罐子颜色越接近，渐变分越高；整面墙排成连续彩虹时触发「彩虹满墙」：罐子从左到右依次亮起，产出 ×3.5。',
    mount: { slots: wallGrid(5, 4, 0.3, 0.32, 0.35, 0.06) },
    mech: { type: 'hue_gradient', every: 12, baseMul: 1, maxMul: 3.5, perfectAt: 0.92,
            score: '相邻（左右+上下）色相差的平均值换算 0~1；空罐算 0' },
    E: '轻轻闪烁提示墙上颜色最"跳"的那一颗',
    fx: { perfect: '罐子依次亮起，玻璃叮声由低到高排成音阶', idle: '罐中糖球偶尔自己转半圈', place: '玻璃轻碰声 + 罐口一圈柔光' }
  };

  // 2) 弹珠滚道 —— 无限循环的动态观赏
  C.marble_run = {
    cat: 'func', n: '螺旋弹珠滚道', icon: '🎢', base: 900, grow: 1.55, fp: [1.2, 1.2],
    stat: { comfort: 3, view: 6 }, depth: 2, showcase: true,
    desc: '木质螺旋滚道，沿途挂一圈小铃铛。放进顶部漏斗的球会自己滚下去，叮叮当当撞响铃铛，再被螺旋提升杆慢慢送回顶上，无限循环。可加建「滚道段」延长路线。',
    mount: { slots: [[0, 1.62, 0, 0], [0.08, 1.62, 0.05, 0], [-0.08, 1.62, 0.05, 0], [0, 1.62, -0.08, 0]] },
    mech: { type: 'roll_loop', runTime: 6.5, bellYield: 0.2, runBonus: 1.5,
            segments: { start: 1, max: 6, addTime: 1.2, addBells: 2, cost: '每段 = 建筑价 × 0.3' },
            rule: '同一时间最多 4 颗在轨道上，间隔 1.5 秒自动放出；每撞一个铃铛产出 bellYield，跑完全程额外 runBonus' },
    E: '把所有球一次性放出，形成"弹珠雨"（冷却 30 秒）',
    fx: { roll: '木轨滚动声随速度变化', bell: '铃声音高按高度从高到低', finish: '落进底槽"咚"一声 + 小星星' }
  };

  // 3) 蛋托收纳盒 —— 严丝合缝 + 一键整理
  C.egg_crate = {
    cat: 'func', n: '软木蛋托收纳盒', icon: '🥚', base: 350, grow: 1.4, fp: [0.9, 0.5],
    stat: { comfort: 5, view: 2 }, depth: 1, showcase: false,
    desc: '软木蛋托，一格一颗，放进去"咔哒"一声严丝合缝。一排放满 ×1.5；一整盒放满 ×2.5 并自动合上盖子，合盖后的盒子可以搬走、可以叠起来。',
    mount: { slots: flatGrid(6, 2, 0.13, 0.12) },
    mech: { type: 'snug_fit', snapYield: 0.3, fullRow: 1.5, fullBox: 2.5, stackMax: 5, stackBonus: '每叠一层 +5%' },
    E: '一键整理：所有球按大小、再按颜色重新排好（逐个跳回格子的动画）',
    fx: { snap: '"咔哒"+格子轻微下沉', lid: '盖子合上的闷响 + 盒面盖一个小印章', tidy: '球依次弹跳归位，像被看不见的手摆好' }
  };

  // 4) 棉花糖天平 —— 平衡
  C.candy_scale = {
    cat: 'func', n: '棉花糖天平', icon: '⚖️', base: 700, grow: 1.5, fp: [1.0, 0.5],
    stat: { comfort: 2, view: 3 }, depth: 1, showcase: true,
    desc: '拐杖糖横梁、两只棉花糖托盘的大天平。两边的分量（按 size 与 rarity）越接近，产出越高；误差不超过 3% 时触发「完美平衡」×5，天平发出清脆的铃声。',
    mount: { slots: [[-0.42, 0.98, -0.06, 0], [-0.36, 0.98, 0.07, 0], [-0.48, 0.98, 0.07, 0], [0.42, 0.98, -0.06, 0], [0.36, 0.98, 0.07, 0], [0.48, 0.98, 0.07, 0]] },
    mech: { type: 'balance', every: 10, maxMul: 5, perfectTol: 0.03, formula: '倍率 = 1 + 4 × (1 - |L-R| / (L+R))', weight: 'size × (1 + rarity × 0.5)' },
    E: '把较重一侧最轻的那颗挪到另一侧',
    fx: { swing: '指针带回弹地摆动后停稳', perfect: '铃声 + 两只托盘上方同时洒下彩糖屑' }
  };

  // 5) 糖果树 —— 会长大的收纳
  C.candy_tree = {
    cat: 'func', n: '糖果树', icon: '🌳', base: 1200, grow: 1.6, fp: [1.2, 1.2],
    stat: { comfort: 6, view: 5 }, depth: 2, showcase: true,
    desc: '一棵会长大的糖果树，球挂在枝头像果子。挂满八成后，每 90 秒长出一根新枝（多一个位置），最多 16 个。每 5 分钟一次「丰收」：整棵树轻轻摇晃，产出 ×4。树叶颜色随季节变换。',
    mount: { slots: [[0.35, 1.30, 0.10, 0], [-0.30, 1.42, 0.18, 0], [0.12, 1.65, -0.28, 0], [-0.18, 1.80, -0.12, 0], [0.28, 1.95, 0.20, 0]],
             growSlots: [[-0.42, 1.18, -0.20, 0], [0.45, 1.55, -0.10, 0], [-0.05, 2.10, 0.30, 0], [0.20, 2.20, -0.25, 0], [-0.38, 1.98, 0.32, 0],
                         [0.50, 1.20, 0.35, 0], [-0.50, 1.60, 0.00, 0], [0.00, 2.32, 0.00, 0], [0.30, 1.40, -0.42, 0], [-0.25, 1.30, 0.45, 0], [0.10, 1.85, 0.48, 0]] },
    mech: { type: 'grow', startSlots: 5, maxSlots: 16, growEvery: 90, growNeeds: 0.8,
            harvest: { every: 300, mul: 4 }, seasons: ['春·粉', '夏·绿', '秋·橙', '冬·白'], seasonEvery: 600 },
    E: '摇一摇树：所有球轻轻晃动，叶子飘落（纯观赏，冷却 10 秒）',
    fx: { grow: '新枝从树干慢慢伸出，长出两片叶子', harvest: '整树摇晃，叶片与彩糖屑飘落', season: '叶色在 3 秒内渐变' }
  };

  // 6) 分拣传送带 —— 看机器干活的解压
  C.sorting_belt = {
    cat: 'func', n: '分拣传送带', icon: '🏭', base: 1500, grow: 1.6, fp: [2.2, 0.6],
    stat: { comfort: 2, view: 6 }, depth: 1, showcase: false,
    desc: '一条小小的分拣流水线：球丢进漏斗，沿皮带走，经过感应门时小挡板"啪"地一拨，分进对应的箱子。箱子装满 6 颗盖章「已归档」，奖励 ×3。',
    mount: { slots: [[-0.95, 0.95, 0, 0]],
             bins: [[-0.35, 0.45, 0.28, 0], [0.05, 0.45, 0.28, 0], [0.45, 0.45, 0.28, 0], [0.85, 0.45, 0.28, 0]] },
    mech: { type: 'auto_sort', inputSlots: 1, queue: 12, bins: 4, binCap: 6, beltSpeed: 0.35, perItem: 0.4, binFull: 3,
            rules: ['按颜色：红橙 / 黄绿 / 青蓝 / 紫粉', '按大小：小 / 中 / 大 / 特大', '按稀有度：普通 / 稀有 / 史诗 / 传说+'] },
    E: '切换分拣规则（箱子上的标签牌翻面）',
    fx: { belt: '皮带轻微嗡嗡声', flap: '挡板"啪"一下', full: '箱子盖章"已归档" + 自动滑到旁边码好，换上空箱' }
  };

  // 7) 窗台棱镜 —— 光影
  C.prism_sill = {
    cat: 'func', n: '阳光窗台', icon: '🌈', base: 800, grow: 1.5, fp: [1.4, 0.35],
    stat: { comfort: 5, view: 7 }, depth: 1, showcase: true,
    desc: '一扇洒满阳光的窗台，一排 6 个位置。阳光穿过球在地板上投出彩色光斑；按透明度从低到高排列时，光斑连成一道彩虹。每 4 分钟一次「黄金时刻」，持续 20 秒，期间产出 ×3。',
    mount: { slots: row(6, -0.55, 0.55, 1.08, 0.05) },
    mech: { type: 'light_play', every: 15, link: '相邻两颗 clarity 递增 → 两块光斑相连，每连一段 +20%', goldenHour: { every: 240, dur: 20, mul: 3 } },
    E: '拉开/合上纱帘（合上时光斑变柔和，舒适度 +2，产出 -30%）',
    fx: { light: '地面光斑随时间缓慢移动', golden: '光线变暖变斜，空气里出现浮尘光点', link: '光斑连起来时有一声很轻的风铃' }
  };

  // 8) 珠帘门 —— 穿行触发
  C.bead_curtain = {
    cat: 'func', n: '糖珠门帘', icon: '🎐', base: 650, grow: 1.5, fp: [1.1, 0.2],
    stat: { comfort: 4, view: 4 }, depth: 1, showcase: false,
    desc: '挂在门口的珠帘，5 串 × 6 颗。人从中间穿过，珠帘哗啦啦分开又合拢，每颗珠子都算一次产出。珠子排成条纹 ×1.5，左右对称 ×2。',
    mount: { slots: strands(5, 6, -0.4, 0.4, 2.0, 0.22) },
    mech: { type: 'walk_through', perBead: 0.1, passCd: 2, patterns: { stripes: 1.5, symmetric: 2, gradient: 1.8 } },
    E: '拨一下珠帘（不用穿过也能触发一次，冷却 5 秒）',
    fx: { pass: '珠串被推开后摆动 3 秒，清脆的碰撞声', pattern: '图案成立时整串珠子同时亮一下' }
  };

  // 9) 像素地毯 —— 拼图案
  C.pixel_rug = {
    cat: 'func', n: '像素格子地毯', icon: '🧶', base: 1000, grow: 1.55, fp: [1.6, 1.6],
    stat: { comfort: 5, view: 6 }, depth: 1, showcase: false,
    desc: '一块 7×7 的格子地毯，每格放一颗球就是一个像素。拼出预设图案时，地毯把图案"织"进花纹里永久保留，并给全局 +2%。',
    mount: { slots: flatGrid(7, 7, 0.21, 0.04) },
    mech: { type: 'pixel_art', every: 20, patterns: ['爱心', '星星', '小猫', '蘑菇', '月亮', '笑脸', '小房子', '彩虹'],
            match: '按吻合度 0~1 给分（颜色看色相区间）', reward: { perPattern: 0.02, wovenStays: true } },
    E: '显示最接近的图案轮廓（淡淡的虚线提示）',
    fx: { done: '图案从中心向外"织"出来，毛线声', idle: '地毯边缘的流苏随走动轻轻摆' }
  };

  // 10) 珠算盘 —— 拨珠进位
  C.abacus = {
    cat: 'func', n: '大号珠算盘', icon: '🧮', base: 450, grow: 1.45, fp: [1.2, 0.25],
    stat: { comfort: 3, view: 3 }, depth: 1, showcase: false,
    desc: '大号珠算盘，每根杆串 10 颗。拨珠子发出清脆的"嗒"；一行拨满自动进位（这一行清零、上一行加一颗），连续进位时数字像老式计数器一样逐位翻滚。',
    mount: { slots: strands(5, 10, -0.5, 0.5, 1.35, 0.075) },
    mech: { type: 'abacus', rods: 5, perRod: 10, perSlide: 0.15, carryMul: 2, chainBonus: '一次拨动引发 n 次连续进位 → ×(1+n)' },
    E: '拨动准星对着的那一行',
    fx: { slide: '"嗒"', carry: '这一行亮起后清零，上一行跳一颗', chain: '连续进位时音高逐级升高' }
  };

  // 11) 彩虹球池 —— 堆起来就很满足
  C.ball_pit = {
    cat: 'func', n: '彩虹球池', icon: '🎈', base: 1100, grow: 1.55, fp: [1.8, 1.8],
    stat: { comfort: 7, view: 5 }, depth: 1, showcase: false,
    desc: '一个大大的圆形球池，不用摆放，直接倒进去就行，越多越深越热闹。满了以后多出来的会从边缘轻轻溢出滚到地上。',
    mount: { slots: [], loose: { cap: 200, radius: 0.85, rimY: 0.45 } },
    mech: { type: 'pile', cap: 200, layerEvery: 20, layerMul: 0.1, every: 15 },
    E: '跳进去：球四散弹开再慢慢落回（纯观赏）',
    fx: { pour: '一串球落入的哗啦声', layer: '池边彩灯多亮一圈', dive: '球花四溅 + 慢动作 0.6 秒' }
  };

  // 12) 灯笼串 —— 围成闭环
  C.lantern_string = {
    cat: 'func', n: '糖球灯笼串', icon: '🏮', base: 750, grow: 1.5, fp: [0.3, 0.3],
    stat: { comfort: 6, view: 6 }, depth: 1, showcase: false,
    desc: '在房间里立几根小木桩，桩与桩之间拉起灯串，每串 8 个位置，球放进去就变成一盏小灯笼。灯串首尾相连围成闭环时，光点沿环流动，被圈住区域里的收纳建筑 ×1.3。',
    mount: { slots: row(8, 0.15, 2.65, 2.05, 0), note: '这是一段灯串的位置（从桩 A 到桩 B，长度按实际距离拉伸，呈自然下垂弧线）' },
    mech: { type: 'light_loop', postsMax: 6, perLantern: 0.15, loopMul: 1.3, flow: '相邻灯笼色相渐变时光流更快（最多 2 倍速）' },
    E: '在两根桩之间拉一条新灯串 / 收起灯串',
    fx: { lit: '球放进去后亮起暖光', loop: '闭环成立时一颗光点绕一圈，经过的灯笼依次亮一下' }
  };

  // 13) 糖果小铺 —— 可爱的客人
  C.candy_shop = {
    cat: 'func', n: '糖果小铺', icon: '🏪', base: 1300, grow: 1.6, fp: [1.6, 0.8],
    stat: { comfort: 4, view: 4 }, depth: 2, showcase: true,
    desc: '一间可爱的小柜台，摆 6 颗展示。小镇居民会来逛并说出心愿（"想要红色的""想要两颗一样的"），柜台上正好有就给小费、涨口碑。口碑越高，来的客人越特别。',
    mount: { slots: row(6, -0.6, 0.6, 1.02, 0.12) },
    mech: { type: 'visitors', every: [40, 70], tipMul: 3, missTip: 0.5,
            wishes: ['某种颜色', '两颗一样的', '最大的', '最透明的', '三种不同颜色', '稀有以上'],
            rep: { max: 10, unlocks: { 3: '旅行画家：画下你的小铺，墙上多一幅画', 6: '糖果收藏家：出价 ×20', 9: '小猫：每天来一次，在柜台上打个盹' } } },
    E: '摇铃招呼下一位客人（冷却 60 秒）',
    fx: { enter: '门铃"叮铃"', happy: '客人头顶冒小爱心，跳一下', rep: '口碑条涨一格，柜台招牌亮一下' }
  };

  // 14) 画框展盒 —— 构图
  C.shadow_box = {
    cat: 'func', n: '深框展盒', icon: '🖼️', base: 900, grow: 1.55, fp: [1.0, 0.15],
    stat: { comfort: 3, view: 8 }, depth: 1, showcase: true,
    desc: '挂墙的深框展盒，像博物馆的标本盒。按三分法、对称、配色、留白给构图打分（0~1），分越高产出越高；满意了就签名定稿，墙上多一件你的"作品"。',
    mount: { slots: wallGrid(3, 3, 0.26, 0.26, 1.15, 0.05), free: '也可自由摆放，吸附到最近的 9 个参考点' },
    mech: { type: 'composition', every: 30, mul: '1 + 构图分 × 2', criteria: ['三分法', '对称', '色彩和谐', '留白'] },
    E: '签名定稿：给作品起名，画框锁定当前构图并永久 +1% 全局（可另建新画框继续创作）',
    fx: { score: '框边灯带按分数亮起几格', sign: '右下角出现手写签名动画 + 相机快门声' }
  };

  // 15) 扭蛋机 —— 惊喜
  C.capsule_machine = {
    cat: 'func', n: '大号扭蛋机', icon: '🎁', base: 1000, grow: 1.5, fp: [0.6, 0.6],
    stat: { comfort: 2, view: 4 }, depth: 1, showcase: true,
    desc: '转动手柄，"咔啦咔啦"掉出一颗扭蛋，打开有光柱。顶上的"镇机之宝"越稀有，出好东西的几率越高；30 抽必出史诗。',
    mount: { slots: [[0, 1.48, 0, 0]] },
    mech: { type: 'gacha', cost: '当前单次产出 × 20', pool: { common: 60, rare: 28, epic: 10, legend: 2 },
            charmShift: '镇机之宝 rarity 每 +1，common 权重 -8，其余按比例分配', pity: 30,
            rewards: ['装饰皮肤', '限时加成（3 分钟）', '新颜色的球', '隐藏款装饰（1%）'] },
    E: '扭一次',
    fx: { crank: '棘轮"咔啦咔啦"', drop: '扭蛋滚出，停顿 0.5 秒再打开', beam: '按稀有度出不同颜色的光柱，传说款有彩带' }
  };

  // 16) 糖霜拱门 —— 看得见的成长
  C.frosting_arch = {
    cat: 'func', n: '糖霜拱门', icon: '🎀', base: 2000, grow: 1.7, fp: [2.0, 0.5],
    stat: { comfort: 5, view: 7 }, depth: 2, showcase: true,
    desc: '收纳总数到达里程碑时，拱门升级一次外观（彩糖→灯串→樱桃→金边→彩虹→星光…），并举行 15 秒的小游行：姜饼小人举着小旗走过拱门，期间全场 ×2。',
    mount: { slots: [[-0.75, 2.05, 0, 0], [-0.3, 2.3, 0, 0], [0.3, 2.3, 0, 0], [0.75, 2.05, 0, 0]] },
    mech: { type: 'milestone', marks: [10, 50, 100, 250, 500, 1000, 2500, 9999], perLevel: 0.03, paradeDur: 15, paradeMul: 2 },
    E: '查看下一个里程碑还差多少',
    fx: { level: '拱门闪一下后换装，小号吹响', parade: '小人排队走过，撒彩纸' }
  };

  const PACK = { version: 1, theme: 'candy', buildings: C };
  if (typeof window !== 'undefined') window.CANDY_BUILDINGS = PACK;
  if (typeof module !== 'undefined' && module.exports) module.exports = PACK;
})();
