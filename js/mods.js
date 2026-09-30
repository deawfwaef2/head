// 第二十二轮：UI 防闪烁小工具 —— 周期性/逐帧写 HUD 时，内容没变就不碰 DOM（innerHTML 重写会重置 CSS 过渡、重建节点，肉眼可见的闪）。
//   setH(el, html) / setT(el, text)：只在字符串变化时才写。
window.setH = (el, h) => { if (el && el._h !== h) { el._h = h; el.innerHTML = h; } };
window.setT = (el, t) => { t = String(t); if (el && el._t !== t) { el._t = t; el.textContent = t; } };
// 第九轮：MOD 管理器 —— 每个改动都是可开关的 MOD；处理互斥组 / 依赖 / 冲突。
// 状态存 localStorage 'soulhead_mods'；改动后需重新载入（先自动存档）。
// 用法：Mods.on('forge') → true/false。新 MOD：在 LIST 里加一项，然后在对应代码里用 Mods.on(id) 做开关。
window.Mods = (() => {
  const KEY = 'soulhead_mods';
  // cat: play 玩法 / look 角色外观 / render 画风(互斥组 render) / perf 性能 / asset 模型与材质
  const LIST = [
    // ---------- 画风（互斥：只能选一个） ----------
    { id: 'r_classic', cat: 'render', group: 'render', icon: '🎮', n: '原版渲染', d: '不做后处理，最省性能。', def: true },
    { id: 'r_illust', cat: 'render', group: 'render', icon: '🖌️', n: '插画风', d: '各向异性 Kuwahara 笔触 + 墨线描边 + 纸纹 + 柔光晕染，画面像厚涂插画。', def: false },
    { id: 'r_anime', cat: 'render', group: 'render', icon: '✨', n: '赛璐璐动画', d: '粗描边 + 色阶化光影 + 高饱和 + 高光溢出，像 TV 动画截图。' },
    { id: 'r_water', cat: 'render', group: 'render', icon: '💧', n: '水彩', d: '颜料晕开、边缘积色、纸张颗粒与轻微手绘抖动。' },
    { id: 'r_oil', cat: 'render', group: 'render', icon: '🎨', n: '油画', d: '强 Kuwahara 厚涂笔触 + 画布纹理 + 暖色调。' },
    { id: 'r_film', cat: 'render', group: 'render', icon: '🎞️', n: '暗黑电影', d: '电影调色 + 泛光 + 暗角 + 胶片颗粒 + 轻微色差。' },
    { id: 'r_ink', cat: 'render', group: 'render', icon: '🖋️', n: '水墨', d: '去色 + 墨线 + 宣纸，仅保留血色与魂光的红。' },
    { id: 'outline', cat: 'render', icon: '✏️', n: '额外描边', d: '在任意画风上叠加细墨线（赛璐璐/水墨已自带描边，与之冲突）。', conflicts: ['r_anime', 'r_ink'] },
    { id: 'bloom', cat: 'render', icon: '🌟', n: '魂光泛光', d: '魂光、火焰、稀有光柱发出柔和泛光。', def: false },
    // ---------- 界面（第十九轮 UI Agent） ----------
    { id: 'ui3a', cat: 'ui', icon: '💎', n: '3A 界面皮肤', d: '黑曜石+血金主题：斜切角按钮、四角括饰面板、SVG 图标、聚光灯卡片、血条残影、受击/低血反馈、悬停与点击音效、菜单余烬。关闭则回到旧界面。', def: true },
    // ---------- 性能 ----------
    { id: 'lod', cat: 'perf', icon: '⚡', n: '万首优化', d: '远处首级自动降级 / 隐藏，休眠首级不再计算物理，支持上万颗首级（冰窖存储）。强烈建议开启。', def: true },
    { id: 'perf2', cat: 'perf', icon: '🚀', n: '流畅度 II', d: '不改画面的渲染减负：篝火阴影只在场景真的变化时重画（逐项精确比较，画面不变）；首级身上同材质的小饰件自动合批，每颗首级的 draw call 约减少 1/4。帧率稳住后，自适应也就不会再去降画质档/关阴影。', def: true },
    { id: 'steady_save', cat: 'perf', icon: '💾', n: '平滑自动存档', d: '每 20 秒在浏览器空闲时自动保存（离开页面仍会立即保存），减少周期性卡顿；关闭后恢复旧的 8 秒同步存档。', def: true },
    { id: 'ground_contact', cat: 'perf', icon: '🪨', n: '贴地首级', d: '以皮肤和断面几何计算支撑高度，排除发尾、面罩与头饰造成的虚高；旧存档兼容。', def: true },
    { id: 'lowspec', cat: 'perf', icon: '🥔', n: '低配模式', d: '关闭所有后处理和发丝摆动，降低分辨率。与所有画风（原版除外）/泛光/发丝微风冲突。', conflicts: ['r_illust', 'r_anime', 'r_water', 'r_oil', 'r_film', 'r_ink', 'bloom', 'breeze', 'outline'] },
    // ---------- 角色外观 ----------
    { id: 'head_repair', cat: 'look', icon: '🩹', n: '首级外观修复', d: '对齐真实切颈平面、按颈部轮廓封口；使用 CC0 肉质 PBR 贴图，并减轻异常绿肤与暗黑眼白。', def: true },
    { id: 'hair_cover', cat: 'look', icon: '🧢', n: '后脑/后颈补洞（第二十一轮）', d: '部分脸模没有后脑勺与后颈皮肤，借来的头发盖不住时会从后面看到脸的内侧。按离线评分表（js/hair_cover.js）自动换成盖得住的头发；关闭则恢复原组合。', def: true },
    { id: 'feel_bubble', cat: 'play', icon: '💬', n: '把玩旁白（第二十一轮）', d: '低频打字机小字卡：描述你正在怎么摆弄首级（拿起的分量、长传几米、弹了几下、叠罗汉……）。第三人称旁白，首级不说话。', def: true },
    { id: 'feel_impact', cat: 'play', icon: '💥', n: '落地手感（第二十一轮）', d: '首级落地按速度扬起尘土圈；按落点材质发声（石地闷响/木面/落在另一颗首级上的软声）；近处重摔镜头轻踢。', def: true },
    { id: 'feel_heft', cat: 'play', icon: '⚖️', n: '重量感（第二十一轮）', d: '每颗首级有自己的分量：拿起时手往下一沉，转身时滞后摆动，走路时上下颠，戳一下也会微沉。', def: true },
    { id: 'smooth_faces', cat: 'look', icon: '🫧', n: '柔化头模', d: '平滑皮肤网格接缝法线，并柔化卡通明暗阶梯；只影响显示，不改模型存档。', def: true },
    { id: 'headwear', cat: 'look', icon: '🎀', n: '头饰', d: '14 种精细头饰（蝴蝶结、兔耳、女仆头饰、花冠……），按身份掷骰。', def: true },
    // ---------- 场景资产 ----------
    { id: 'cave_detail', cat: 'asset', icon: '🕯️', n: '洞窟地表与小装饰', d: '降低岩地贴图重复感，并用少量 InstancedMesh 摆放网上 CC0 小物（酒杯、花瓶、灯笼、烛台、木箱、酒桶）；不增加每件物品的独立 draw call。', def: true },

    { id: 'makeup', cat: 'look', icon: '🌸', n: '妆容', d: '腮红、泪痣、雀斑。', def: true },
    { id: 'breeze', cat: 'look', icon: '🍃', n: '发丝微风', d: '头发始终有轻微的风动。', def: true },
    { id: 'species', cat: 'look', icon: '🧬', n: '异种族质感', d: '史莱姆娘（半透明果冻）、幽灵、人偶（瓷肌+关节线）、机娘（面板线+发光）、石像、冰晶、暗影等全新材质种族。', def: true },
    { id: 'pupils', cat: 'look', icon: '👁️', n: '异瞳花纹', d: '心形 / 星形 / 竖瞳 / 十字 / 花瓣 / 环形等瞳孔花纹。', def: true },
    { id: 'stars', cat: 'look', icon: '⭐', n: '品质星级', d: '每个魂阶再细分 ★1–★5（下品→极品），产出与展厅分随星级变化。', def: true },
    // ---------- 玩法 ----------
    { id: 'regions', cat: 'play', icon: '🗺️', n: '新地域', d: '追加 8 个新狩猎地点（更长的成长线）与更深的洞窟层。', def: true },
    { id: 'bigworld', cat: 'play', icon: '🌍', n: '一整片大陆', d: '不选地区：开局生成一张 270 个地点的巨大地图，自由探索（默认关：每次出门选地区、随机生成关卡）。', def: false },
    { id: 'foe_bodies', cat: 'play', icon: '🧍‍♀️', n: '真人敌人', d: '野外的人用各自原 VRM 的身体与服装、真实动作、AI 战斗、布娃娃尸体、斩首与断肢。关闭则退回光团猎物（省内存）。', def: true },
    { id: 'forge', cat: 'play', icon: '⚗️', n: '熔魂炉', d: '三颗首级熔成一颗更高阶的新首级。', def: true },
    { id: 'bowling', cat: 'play', icon: '🎳', n: '魂球道', d: '把首级扔向骷髅瓶，全中 STRIKE 连击。', def: true },
    { id: 'dresser', cat: 'play', icon: '💄', n: '化妆台', d: '给首级换头饰、染发、换表情。需要「头饰」。', def: true, requires: ['headwear'] },
    { id: 'worldgraph', cat: 'play', icon: '🗺️', n: '地点图出猎（第十四轮·默认）', d: '出洞后进入随机生成的地点网络：每个地点是一个可自由走动搜索的小场景（偶尔是大场景），多扇门通往别处；最深处是地区霸主。关闭本项 = 旧的“点击 60 次 + 屏幕 UI 板”旅途。', def: true },
    { id: 'explore3d', cat: 'play', icon: '🌄', n: '第一人称出猎（旧·实验）', d: '【第十一轮用户判定不合格，默认关闭】3D 地区沿路前进。关闭时使用“点击 60 次 + 屏幕 UI 板”的旅途。', def: false },
    { id: 'oddities', cat: 'play', icon: '🎪', n: '恶趣味陈列馆', d: '7 座把首级放进日常生活的新建筑：亡者茶会、名媛肖像廊（画框随魂阶升格）、奶奶的摇椅、猎首纪念台、首级鉴定台（品相抽卡）、亡者沙发影院（换台）、首级菜园（浇水收获）。全部 Poly Haven CC0 模型。', def: true },
    { id: 'rites', cat: 'play', icon: '📜', n: '史录陈列', d: '7 座取材人类历史的首级陈列（共 50 个位）：首実検台（战国验首）、叛徒之门（伦敦桥示众）、缩首工坊（tsantsa）、京观、圣髑贩子（中世纪圣髑与赎罪券）、莎乐美之宴、猎头祭鼓（节奏小游戏）。', def: true },
    { id: 'curios', cat: 'play', icon: '🕰️', n: '首级日用品·6 座新放首级建筑（第二十二轮）', d: '布谷钟（首级被弹簧推出来报时，现实整点连敲）、魂饮自动贩卖机（首级当样品，出材料）、魂盘赌局（转盘带着首级转，押魂晶）、亡者琴键（七颗首级按魂阶排成上行音阶有共鸣）、结义坛（三颗首级看缘分，金兰共鸣）、落槌拍卖台（出价随时间上涨）。程序化建模，首级不说话。', def: true },
    { id: 'organs', cat: 'play', icon: '🫀', n: '尸体解剖·器官标本（第二十二轮）', d: '尸体/兽骸的战利品面板出现「🔪 解剖」：取出心、肺、肝、肾、胃、肠、脑、眼球、舌、脾、胆、脊椎、血液。每件器官带归属（谁的/种族/魂阶/年龄/性格/遗传词缀）和品质属性，可装瓶摆在洞里提供加成（同一人的 3 件成套 ×1.3，眼球会追着你转），也可炼化成魂尘。只有内脏/感官/骨/血，无生殖类器官。' },
    { id: 'props', cat: 'play', icon: '🧷', n: '道具系统·骨与筋的 BUFF 摆件（第二十二轮）', d: '洞穴菜单「🧷 道具」页签：用指骨、筋索、尸蜡、发束、骨灰等野外材料合成 15 种可摆放道具（断手、断脚（角色原 VRM 身体上取下的手/脚）、肠索（可随意拉长的肉色长索）、遗骨堆、碎骨毯、血契卷轴、尸蜡烛、骨灰瓮、战盾饰、断刃碑、藏宝箱，以及可随意拉长的牵魂线、指骨风铃、尸布幡链、宝石串链）。无碰撞无物理，准星指哪摆哪；滚轮旋转、Shift 缩放、Alt 拉伸、Ctrl 升降、R 倾斜；E 拿起、右键收回。效果：附近首级产出光环、戳击加成、属性、定时产出、风铃共鸣；拉伸会改变效果范围。', def: true },
    { id: 'books', cat: 'play', icon: '📖', n: '书与笔记·名字对证（第二十二轮）', d: '野外容器/尸体/霸主身上会摸到书和笔记（日记、通缉令、遗书、地方志、霸主手记……），文中角色名染色。阅读时鼠标释放、✕ 关闭；洞里可“拿在手里”（T 切名字 / Y 阅读），对准名字吻合的首级按左键对证，这颗头会获得新魂印。名字 60% 来自你已有的首级、40% 来自本趟世界里的活猎物；一本书里一个名字只能对证一次。', def: true },
    { id: 'item_3d', cat: 'ui', icon: '🧊', n: '物品 3D 图标', d: '麻袋/储物箱里的武器、盾、头盔、药剂、材料等用 CC0 三维模型渲染成图标（没有模型的物品仍是 emoji），物品菜单里有大图。格子也放大并随屏幕自适应。', def: true },
    { id: 'beasts', cat: 'play', icon: '🐺', n: '荒野野兽（掉材料）', d: '荒野地点会出现灰狼（群袭·绕圈扑咬）、赤狐（咬一口就跑）、野牛（蓄力直线冲撞，撞墙后有破绽）、白角鹿（逃跑，被逼急了才踢）。它们不掉首级，只留下可搜刮的尸骸：兽皮·生肉·兽牙·兽角，可合成炖肉/磨刀石/背篓。模型 Quaternius CC0。', def: true },
    { id: 'ogre_level', cat: 'play', icon: '⬆️', n: '食人魔升级', d: '狩猎中击杀/斩首/处决/完美格挡等战斗事件积累经验；升级永久提高力量·体魄·敏捷·凶威·魂力与生命上限，并回复一部分生命。狩猎 HUD 与洞窟属性页显示等级。', def: true },
    { id: 'wgen', cat: 'play', icon: '🧬', n: '地点基因组生成器', d: '每个出猎地点由种子派生一条“基因组”：天空(9 张 HDRI 混用+任意朝向)×光照氛围(金色黄昏/晨雾/阴天/血色残阳/瘴气/紫暮/月夜)×季节(盛绿/秋/枯败/霜冻…)×地形原型(丘陵/梯田/盆地/山脊/沙丘/高台/陨坑/干沟…)×溪流池塘×布景×地表着色，同时只下载这个地点用到的资产（加载更快）。关掉=回到旧版地图。', def: true },
    { id: 'wlayout', cat: 'play', icon: '🗺️', n: '地图多样化', d: '出门的地点不再千篇一律：不规则边界、起伏不同的地形、门之间踩出的小径、成簇的树丛与林间空地；随机布景（废弃营地/古战场/猎首者的木桩/侏儒法庭/巨石道/无名祭坛）；天气（雨/雪/萤火/余烬/灰烬/落叶/花粉/扬尘）。关掉 = 原来的圆形空地。', def: true },
    { id: 'chess', cat: 'play', icon: '♟️', n: '头棋殿', d: '首级当棋子，和斯尼克下棋或同屏双人。', def: true },
    { id: 'rebirth', cat: 'play', icon: '♻️', n: '轮回祭坛', d: '献祭一世换永久魂核天赋。', def: true },
    { id: 'thief', cat: 'play', icon: '👻', n: '盗魂灵入侵', d: '盗魂灵定期来偷首级，左键打散。', def: true },
    { id: 'surge', cat: 'play', icon: '🌊', n: '魂潮', d: '随机 20 秒全产出 ×3。', def: true },
    { id: 'ach', cat: 'play', icon: '🏅', n: '成就', d: '28 个跨轮回成就（J 键）。', def: true },
    { id: 'echo', cat: 'play', icon: '💭', n: '残响气泡', d: '相邻首级偶尔浮现记忆碎片，并获得 ×2 产出。', def: true },
    { id: 'gesture_combat', cat: 'play', icon: '⚔️', n: '手势战斗', d: 'F 拔刀/收刀。按住左键用鼠标轨迹实时控制武器挥砍（上撩/下劈/横斩，越快伤害越高），连点左键刺击，按住右键格挡（轻移鼠标切换上下左右）。首级查看改为 I 键。', def: true },
    { id: 'crosshair_slash', cat: 'play', icon: '🎯', n: '刀尖锁准星（第十八轮）', d: '按住左键时刀尖固定在屏幕中心，转动视角就是挥砍，刀光＝准星轨迹；关闭则回到旧的“鼠标控制武器轨迹”。需要「手势战斗」。', def: true, requires: ['gesture_combat'] },
    { id: 'release_slash', cat: 'play', icon: '🗡️', n: '蓄势挥击（第二十二轮）', d: '拔刀后按住左键=蓄势（视角 1:1 跟手，刀向“趋势”反方向拉开，准星旁出现方向线）；松开左键=捕捉松手前的鼠标微趋势，沿该方向挥出一刀（14° 内吸附 8 方向）。没趋势：短按=刺、蓄满 0.7 秒=直劈。按住期间刀尖本身不伤人。关掉恢复第十八轮“刀尖锁准星”。', def: true, requires: ['gesture_combat'] },
    { id: 'forge_buy', cat: 'play', icon: '⚔️', n: '铁匠台·花魂晶直接升阶（第二十二轮）', d: '洞窟「⚔️ 装备」页：5 个大装备卡，下一阶预览（每项 +Δ、战力 +Δ）、一键花魂晶升阶，武器附魔内嵌，搜刮到的装备在卡片下直接换上。关掉 = 第十九轮规则（魂晶只能附魔，装备靠野外搜刮）。', def: true },
    { id: 'combat_fx', cat: 'play', icon: '🔊', n: '战斗音效与命中反馈（第二十二轮）', d: '程序合成的一整套战斗音效：挥刀破风（按力度/方向/左右声道）、刺击、挥空、蓄力升调与满格提示、肉体/脖子/骨头/重击命中、斩首喷血、击杀低频、弹刀/格挡/破防/完美格挡、闪避、受伤闷响耳鸣、敌人起手吼声与预警、敌人脚步与出手破风（带方位）；命中十字准星（白=命中 黄=弱点 红=击杀 蓝=被挡）与轻微屏震。关掉恢复旧的采样音效。', def: true },
    { id: 'aim_assist', cat: 'play', icon: '🎯', n: '挥砍辅助瞄准（第二十二轮）', d: '减少“乱挥没打中”：出刀时自动选视野锥内最近的敌人，刀路会过其胸口；对 2 米外的敌人自动延长刃的有效射程并向前小步突进；命中判定对身体略宽容；挥空有音效与提示。不影响视角（没有镜头粘滞）。', def: true, requires: ['gesture_combat'] },
    { id: 'foe_roles', cat: 'play', icon: '🎭', n: '敌人职业（第二十二轮）', d: '敌人不再一个套路：蛮兵（高血量/慢/重击/硬吃轻击）· 游击（冲刺斩后撤步/翻滚闪避）· 盾卫（永远举盾，要绕背或蓄力破防）· 刺客（潜行绕背、背刺×1.6、有提示音）· 狂战（连击、半血狂暴）· 投掷手（远程掷刃，可格挡/打飞）。头顶首次发现时会显示职业名。关掉恢复所有敌人同一套逻辑。', def: true },
    { id: 'swing_momentum', cat: 'play', icon: '🌀', n: '挥砍动量（第二十一轮）', d: '伤害取决于一刀的连贯挥幅：左右乱晃几乎没伤害，大幅度的真砍 / 突刺 / 蓄力才疼。准星下方的细条显示当前冲力。', def: true, requires: ['gesture_combat'] },
    { id: 'foe_smart', cat: 'play', icon: '🧠', n: '聪明的敌人（第二十一轮）', d: '预判拦截、疾跑追击、多人包抄站位、你转身逃跑就冲刺斩、重伤会退开整顿、看不见你会去最后的位置搜索；会绕开树石，卡住自动绕路。', def: true },
    { id: 'foe_door_escape', cat: 'play', icon: '🚪', n: '猎物会从门逃走（第二十一轮）', d: '逃跑的猎物会冲向最近的门，跑到门口就真的逃掉了（这次拿不到她的首级）。', def: true },
    { id: 'sprint_stamina', cat: 'play', icon: '😮‍💨', n: '疾跑耗体力（第二十一轮）', d: 'Shift 疾跑每秒消耗体力，耗尽后要缓一缓才能再跑——敌人追得上你了。', def: true },
    { id: 'guard_slowlook', cat: 'play', icon: '🛡️', n: '格挡降灵敏度（第十九轮）', d: '按住右键格挡时视角转动变慢（×0.45），方便稳住架势；挥砍时不降。', def: true, requires: ['gesture_combat'] },
    { id: 'wpn_feel', cat: 'play', icon: '⚔️', n: '格挡降灵敏度', d: '按住右键格挡时视角灵敏度降到 ×0.3（关掉则恢复旧的 ×0.45 或不降）。第二十二轮已移除按住左键的“武器惯性”：按住左键视角 1:1 跟手。', def: true },
    { id: 'loc_story', cat: 'play', icon: '📖', n: '地点进场剧情卡（第二十轮）', d: '每个地点首次进入时冻结并弹出遭遇介绍卡（可撤离）。用户第二十一轮要求去掉 → 默认关。', def: false },
    { id: 'sack_grid', cat: 'play', icon: '🎒', n: '麻袋格子·搜刮经济（第十九轮）', d: '麻袋变成格子物品栏（物品按形状占格，首级 2×2，Tab/B 打开，拖动整理、R 旋转）。野外翻找放入/取出一件 0.6~2 秒（首级 2.2 秒），受击打断；倒袋瞬间倒出全部。武器装备只能在野外搜刮（木箱/酒桶/武器架/尸体/霸主）；魂晶只用于附魔武器与材料合成。关闭 = 旧的「麻袋装 N 颗头」+ 商店购买。', def: true },
    { id: 'worldlay', cat: 'play', icon: '🏕️', n: '地点布局原型（第十八轮）', d: '出猎地点不再只是随机撒树：营火营地、林间空地、湖畔码头、残垣庭院、石阵高台、峡谷小径、废弃集市，带地形起伏与敌人阵型。', def: true },
    { id: 'film', cat: 'play', icon: '🎬', n: '电影模式', d: 'P 键自由飞行镜头。', def: true },
    { id: 'unlocks', cat: 'play', icon: '🔒', n: '隐藏解锁', d: '未解锁建筑不显示，达成条件后弹窗说明。关闭则全部按层数解锁。', def: true }
  ];
  const BY = {}; LIST.forEach(m => BY[m.id] = m);
  const BUILDS = { forge: ['forge'], bowling: ['bowling'], dresser: ['dresser'], chess: ['chess'], rebirth: ['altar'] };
  let st = {};
  try { st = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  // 第十轮：画风 MOD 冻结不再维护，默认回原版且关泛光（减少开局卡顿）；旧存档迁移一次
  if (!st.__v || st.__v < 2) { for (const m of LIST) if (m.group === 'render') st[m.id] = (m.id === 'r_classic'); st.bloom = false; st.__v = 2; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  if (st.__v < 3) { st.explore3d = false; st.__v = 3; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  if (st.__v < 4) { for (const id of ['steady_save', 'ground_contact', 'head_repair', 'smooth_faces', 'cave_detail']) st[id] = true; st.__v = 4; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  for (const m of LIST) if (st[m.id] === undefined) st[m.id] = !!m.def;
  // 修正非法状态（互斥组恰好一个；冲突；依赖）
  function normalize() {
    const groups = {};
    for (const m of LIST) if (m.group) (groups[m.group] = groups[m.group] || []).push(m);
    for (const g in groups) { const on = groups[g].filter(m => st[m.id]); if (on.length !== 1) { groups[g].forEach(m => st[m.id] = false); st[(on[0] || groups[g].find(m => m.def) || groups[g][0]).id] = true; } }
    for (const m of LIST) if (st[m.id]) for (const c of m.conflicts || []) if (st[c]) { if (BY[c].group) { st[m.id] = false; } else st[c] = false; }
    for (const m of LIST) if (st[m.id] && (m.requires || []).some(r => !st[r])) st[m.id] = false;
  }
  normalize();
  const boot = JSON.stringify(st); // 本次载入时生效的状态
  const bootSt = JSON.parse(boot);
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };

  // 开关 + 自动解决冲突；返回被连带改动的说明
  function set(id, v) {
    const m = BY[id]; if (!m) return [];
    const notes = [];
    const off = (k, why) => { if (st[k]) { st[k] = false; notes.push(`已关闭「${BY[k].n}」（${why}）`); for (const o of LIST) if ((o.requires || []).includes(k)) off(o.id, `依赖「${BY[k].n}」`); } };
    if (v) {
      if (st[id]) return notes;
      for (const r of m.requires || []) if (!st[r]) { notes.push(`已开启依赖「${BY[r].n}」`); notes.push(...set(r, true)); }
      if (m.group) for (const o of LIST) if (o.group === m.group && o.id !== id && st[o.id]) { st[o.id] = false; }
      for (const c of m.conflicts || []) if (st[c]) { if (BY[c].group) { const fb = LIST.find(o => o.group === BY[c].group && !(m.conflicts || []).includes(o.id)); st[c] = false; if (fb) { st[fb.id] = true; notes.push(`画风切换为「${fb.n}」（与「${m.n}」冲突）`); } } else off(c, `与「${m.n}」冲突`); }
      for (const o of LIST) if (st[o.id] && (o.conflicts || []).includes(id)) off(o.id, `与「${m.n}」冲突`);
      st[id] = true;
    } else {
      if (!st[id]) return notes;
      if (m.group) { const fb = LIST.find(o => o.group === m.group && o.id === 'r_classic') || LIST.find(o => o.group === m.group && o.id !== id); return set(fb.id, true); }
      st[id] = false;
      for (const o of LIST) if ((o.requires || []).includes(id)) off(o.id, `依赖「${m.n}」`);
    }
    save(); return notes;
  }
  const on = id => !!bootSt[id];

  // 在游戏构建前调用：移除被关闭 MOD 的建筑 / 功能
  function apply() {
    const C = window.BuildCat && BuildCat.C;
    if (C) for (const id in BUILDS) if (!on(id)) for (const k of BUILDS[id]) delete C[k];
    if (!on('unlocks') && window.Unlocks) Unlocks.has = () => true;
  }

  // ---------------- 管理器界面 ----------------
  const CATN = { render: '🖼️ 画风渲染（只能选一个画风）', ui: '💎 界面', perf: '⚡ 性能', look: '🧬 角色外观', play: '🎲 玩法', asset: '🏛️ 模型与材质' };
  let box = null;
  function css() {
    if (document.getElementById('modcss')) return;
    const s = document.createElement('style'); s.id = 'modcss';
    s.textContent = `#modbox{position:fixed;inset:0;z-index:60;background:rgba(6,3,8,.72);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;font-family:system-ui,'PingFang SC','Microsoft YaHei',sans-serif}
    #modbox .mb{width:min(860px,95vw);max-height:90vh;overflow:auto;background:linear-gradient(160deg,#221820,#120b10);border:1px solid #6a4a5a;border-radius:18px;padding:18px 22px;color:#f3e6ea}
    #modbox h2{margin:0 0 4px;font-size:24px}#modbox .sub{color:#c9a9b8;font-size:13px}
    #modbox h3{margin:16px 0 8px;font-size:15px;color:#ffc8dc}
    #modbox .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px}
    #modbox .mod{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid #4a3440;border-radius:12px;background:#1c1318;cursor:pointer;transition:border-color .15s,background .15s}
    #modbox .mod:hover{border-color:#8a5a70}#modbox .mod.on{border-color:#ff7aa8;background:#2e1824}
    #modbox .mod .ic{font-size:22px;line-height:1}#modbox .mod b{font-size:14px}#modbox .mod small{display:block;color:#c9a9b8;font-size:12px;line-height:1.35;margin-top:2px}
    #modbox .tg{margin-left:auto;flex:none;width:38px;height:22px;border-radius:11px;background:#3a2a32;position:relative;transition:background .15s}
    #modbox .tg:after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#aaa;transition:left .15s,background .15s}
    #modbox .on .tg{background:#b0306a}#modbox .on .tg:after{left:19px;background:#fff}
    #modbox .note{min-height:20px;margin-top:10px;font-size:13px;color:#ffd27a}
    #modbox .bar{display:flex;gap:10px;justify-content:flex-end;margin-top:12px;position:sticky;bottom:-18px;background:#120b10;padding:10px 0}
    #modbox button{border:1px solid #6a4a5a;background:#2e1f28;color:#f3e6ea;border-radius:11px;padding:9px 16px;font-size:14px;cursor:pointer}
    #modbox button.pri{background:linear-gradient(135deg,#7a2e50,#4a1a60);border-color:#ff9ac8;font-weight:700}
    #modbox .chg{color:#9adfff;font-size:12px;margin-left:6px}`;
    document.head.appendChild(s);
  }
  function open() {
    css(); if (box) box.remove();
    if (document.pointerLockElement) document.exitPointerLock();
    if (window.G && G.setUIOpen) G.setUIOpen(true);
    box = document.createElement('div'); box.id = 'modbox';
    const changed = JSON.stringify(st) !== boot;
    const cats = ['render', 'perf', 'look', 'asset', 'play'];
    box.innerHTML = `<div class="mb"><h2>🧩 MOD 管理</h2><div class="sub">每个改动都可单独开关。冲突会自动处理（画风只能选一个；低配模式会关掉后处理类 MOD；依赖项会连带开关）。修改后点「应用并重新载入」（会先自动存档）。</div>
      ${cats.map(c => `<h3>${CATN[c]}</h3><div class="grid">${LIST.filter(m => m.cat === c).map(m => `<div class="mod ${st[m.id] ? 'on' : ''}" data-id="${m.id}"><div class="ic">${m.icon}</div><div><b>${m.n}</b>${!!st[m.id] !== !!bootSt[m.id] ? '<span class="chg">待应用</span>' : ''}<small>${m.d}${m.requires ? `<br>依赖：${m.requires.map(r => BY[r].n).join('、')}` : ''}${m.conflicts && !m.group ? `<br>冲突：${m.conflicts.map(r => BY[r].n).join('、')}` : ''}</small></div><div class="tg"></div></div>`).join('')}</div>`).join('')}
      <div class="note" id="modnote">${box._note || ''}</div>
      <div class="bar"><button data-a="def">恢复默认</button><button data-a="close">${changed ? '暂不应用' : '关闭'}</button><button class="pri" data-a="apply" ${changed ? '' : 'disabled style="opacity:.45"'}>应用并重新载入</button></div></div>`;
    box.addEventListener('click', e => {
      const md = e.target.closest('.mod');
      if (md) { const id = md.dataset.id; const notes = set(id, !st[id]); const n = notes.join('；'); open(); const nt = document.getElementById('modnote'); if (nt) nt.textContent = n; return; }
      const a = e.target.closest('button'); if (!a) return;
      if (a.dataset.a === 'close') close();
      else if (a.dataset.a === 'def') { for (const m of LIST) st[m.id] = !!m.def; normalize(); save(); open(); }
      else if (a.dataset.a === 'apply') { save(); try { if (window.G) G.save(); } catch (er) {} location.reload(); }
    });
    document.body.appendChild(box);
  }
  function close() { if (box) box.remove(); box = null; if (window.G && G.setUIOpen) G.setUIOpen(false); }
  addEventListener('keydown', e => {
    if (e.code === 'KeyO' && !e.repeat && !box && window.G && G.playing && !G.uiOpen) { e.preventDefault(); open(); }
    else if (box && e.code === 'Escape') { e.preventDefault(); close(); }
  });
  return { LIST, on, set, apply, open, close, get state() { return st; }, get boot() { return bootSt; } };
})();
