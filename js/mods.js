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
    { id: 'nape_fill', cat: 'look', icon: '🩹', n: '后脑/后颈补全（第二十五轮）', d: 'MMD 头的脸模只是“前面具”，后脑和后颈是空的：从后下方看会看到脸的内侧、眼睛从头发后面透出来。按每个头自己的脸型推出头骨轮廓补一层皮肤色内壳（藏在脸和头发里面），底部接到断面。关闭则恢复原样。', def: true },
    { id: 'hair_mix2', cat: 'look', icon: '💇', n: '跨头发型：MMD 发型混搭（第二十五轮）', d: '把 56 个 MMD 头的原作发型（原配色、自带发饰）也拿来给别的脸用。每一对“脸×发型”先自动打分，以“戴在原主人头上”为基准：覆盖不变差、不更陷进头皮、拉伸 0.8~1.25、刘海不挡眼；原主人自身就穿模的坏发型不外借。只用合格的组合（抽测约 45% 的配对合格）。只影响新生成的首级。', def: true },
    { id: 'acc_mix', cat: 'look', icon: '🎀', n: '跨头饰品库（第二十五轮）', d: '从 MMD 头上拆出的帽子、头冠、花饰、发簪等独立饰品，按头骨大小整体等比缩放（不变形）并按“离头骨的间隙”落座，被新发型埋住就外推；生成时逐件预检：不陷进头皮、不挡脸挡眼、不悬空（光环/挂在别的饰品上的小件不外借）、不被发型整件包住，不合格的不写入。脸自带帽子时不再叠大件；共最多 2 件；魂阶越高越常见。只影响新生成的首级。', def: true },
    { id: 'pack_hsr', cat: 'look', icon: '🚂', n: '头模包：星穹铁道 12 人（第二十五轮）', d: '官方 MMD 头：卡芙卡、姬子、黑天鹅、黄泉、镜流、阮·梅、阿格莱雅、遐蝶、停云、海瑟音、飞霄、知更鸟。自带原作头饰。关闭则不加载（启动更快）。需重新载入。仅限私人使用。', def: true },
    { id: 'pack_zzz', cat: 'look', icon: '📼', n: '头模包：绝区零 11 人（第二十五轮）', d: '官方 MMD 头：朱鸢、简、月城柳、星见雅、耀嘉音、伊芙琳、薇薇安、仪玄、伊索尔德、奥奇蒂娅、卢西娅。关闭则不加载。需重新载入。仅限私人使用。', def: true },
    { id: 'pack_nte', cat: 'look', icon: '🌃', n: '头模包：异环 9 人（第二十五轮）', d: '官方 MMD 头：哈索尔、法蒂娅、拉克里莫萨、九原、真红、残光、黑鸟、阿尔法德、娜娜莉。关闭则不加载。需重新载入。仅限私人使用。', def: true },
    { id: 'pack_voc', cat: 'look', icon: '🎤', n: '头模包：经典 VOCALOID 9 人（第二十七轮）', d: 'あにまさ式初音/KAITO/MEIKO/弱音、YYB 10周年初音、Racing 2022、VBS 初音、IA、结月缘。关闭则不加载。需重新载入。仅限私人使用。', def: true },
    { id: 'pack_touhou', cat: 'look', icon: '⛩', n: '头模包：东方 Project 4 人（第二十七轮）', d: '藤原妹红、蓬莱山辉夜、八云蓝、八云紫。关闭则不加载。需重新载入。仅限私人使用。', def: true },
    { id: 'pack_cls', cat: 'look', icon: '🎞', n: '头模包：经典 MMD 13 人（第二十七轮）', d: 'Tda 式雷姆、托尔、2B、三笠、江之岛盾子、梵天、秦始皇、LoveLive 六人。关闭则不加载。需重新载入。仅限私人使用。', def: true },
    { id: 'load_veil', cat: 'look', icon: '🕯', n: '加载界面氛围文案（R29）', d: '加载时不显示正在加载的文件/角色名，改为轮换的氛围短句 + 总进度。关闭则恢复原来的“加载首级模型 xx% · 名字”。', def: true },
    { id: 'char_lift', cat: 'look', icon: '🔆', n: '角色暗部提亮（R29）', d: '首级与身体共用的卡通明暗色阶把最暗一档从 47% 抬到 65%：洞里/夜里的角色不再发黑，头和身体仍保持同一条光照曲线。需重新载入。', def: true },
    { id: 'head_tone', cat: 'look', icon: '🎨', n: '头身肤色一致（R26j）', d: '野外：头的卡通光照在满光以内改成与身体相同的线性响应（原来的软压缩让头只有身体 75% 亮），并补上身体从天空环境光得到的间接光（40%）。头不再比身体暗、发灰。洞里陈列的首级不变（防篝火冲白）。', def: true },
    { id: 'body_match', cat: 'look', icon: '🎨', n: '身体按发色配衣服（R29）', d: '给首级挑身体时，按发色与衣服主色的协调度加权：同色系优先，邻近色次之，撞色很少出现；黑白灰衣服与黑白灰头发百搭。仍只在该身份可用的身体里选。', def: true },
    { id: 'tier_look', cat: 'look', icon: '👑', n: '魂阶外貌差异（第二十五轮）', d: '凡魂朴素：发色暗淡、少饰品、多为普通脸模、面色更苍白；灵魂/英魂逐级华丽；圣魂/神魂多为大师级 MMD 头（原作精致头饰），常戴金冠/银冠/额饰，挑染与异色瞳更常见，神魂偶有发光瞳。只影响新生成的首级。', def: true },
    { id: 'vroid_bodies', cat: 'look', icon: '👗', n: '新身体：VRoid 六套（第二十四轮）', d: '追加 5 具非原神身体（pixiv VRoid 官方 CC0 模型的原装衣服）：Vita 蓝色战斗装、Victoria Rubin 白色礼裙、Darkness Shibu 青花长裙、HairSample 白色连衣裙、AvatarSample B 街头夹克，外加 Iwashi 的浴衣少女（おさげちゃん）。按衣服风格分配给对应身份；皮肤可随首级染色（深肤色也能配）。关闭则只用旧身体。', def: true },
    { id: 'head_norm', cat: 'look', icon: '📏', n: '头模尺寸归一（第二十四轮）', d: 'MMD 管线的头比 VRoid 头小约两成，挂在身体上显得特别小。载入时按脸宽等比放大到标准尺寸（需重新载入）。', def: true },
    { id: 'head_norm2', cat: 'look', icon: '📐', n: '头身比例修正（R30，取代上一项）', d: '所有非 VRoid 头按脸宽+两眼间距双指标归一到 VRoid 标准，可缩可放：星铁/绝区零/异环/经典 MMD 不再是大头娃娃，测歪的头不再是小头怪。开启时上一项“头模尺寸归一”不生效。需重新载入。', def: true },
    { id: 'char_unify', cat: 'look', icon: '🌗', n: '人物统一光影 · 逆光不恐怖谷（R47）', d: '头和身体用同一套“随环境变化”的二次元明暗：暗面=此处满受光的 60%（不会比环境更亮、不再像自发光纸片人），亮面平涂；逆光时轮廓出一圈太阳色边缘光。开启时自动旁路二次元光影/次表面散射/面部补光下限，避免叠加。', def: true },
    { id: 'cs_cel', cat: 'look', group: 'cstyle', icon: '🎴', n: '人物风格：赛璐璐（R47）', d: '需开“人物统一光影”。硬明暗交界的二次元：基础色 / 阴影色（偏环境光色、更浓的同色）/ 最暗（下巴下、袖底）/ 阶梯高光 / 逆光轮廓光，全部随环境明暗与色调变化。', def: true },
    { id: 'cs_soft', cat: 'look', group: 'cstyle', icon: '🌸', n: '人物风格：柔光动画（R47）', d: '宽而柔的明暗过渡 + 交界处一条暖色晕带 + 更强的逆光边，像动画电影的柔和打光。' },
    { id: 'cs_paint', cat: 'look', group: 'cstyle', icon: '🖼️', n: '人物风格：厚涂质感（R47）', d: '二次元的阴影色和分阶，保留三成真实光照与部分高光，更有材质厚度。' },
    { id: 'cs_real', cat: 'look', group: 'cstyle', icon: '📷', n: '人物风格：写实相对光（R47）', d: '上一版：PBR 光照，只把暗面抬到此处满受光的 40%，加逆光边。无勾线。' },
    { id: 'char_outline', cat: 'look', icon: '✒️', n: '人物勾线（R47）', d: '身体和头的外轮廓描一圈细线（反向外壳，远处自动变细）；线色取自贴图并随环境变暗/变色，不是死黑。需开“人物统一光影”。', def: true },
    { id: 'world_cel', cat: 'look', icon: '🏞️', n: '环境二次元阴影（R47）', d: '场景保留 3D 贴图材质感，但阴影边缘收硬、阴影染上天空色、亮面略平——和二次元人物的阴影对齐。', def: true },
    { id: 'vroid_only', cat: 'look', icon: '🧍', n: '身体只用 VRoid 女性模型（R51）', d: '所有人物身体只从 8 具 VRoid 女性身体里按身份挑（Vita / Victoria Rubin / Darkness Shibu / HairSample Female / AvatarSample A / AvatarSample B / 浴衣 Osage / 新增 AvatarSample K·F），不管 CC0 模式开没开。Quaternius 低模身体已删除；原神 MMD 身体和身高幼态的光莉不再出现。', def: true },
    { id: 'hunter_calm', cat: 'play', icon: '🏹', n: '猎手感应放慢（R50）', d: '击倒 +2.5（原 7）、斩首 +1.5（原 4）；出猎前 2 分钟不随时间增长，之后约 4.5→8%/分钟（原 15%+）；满后每 12 秒判定一次、概率 6%→50%（原每 5 秒 15%→90%）；遭遇结束后冷却 150 秒（原 40 秒）。', def: true },
    { id: 'hunter_hud2', cat: 'look', icon: '🎯', n: '猎手 HUD 重做 · 紧凑统一（R50）', d: '猎手感应改为顶部小型黑曜石面板（分段细条 + 仇恨/U 提示一行），不再是屏幕中间的大字和糊状阴影；猎手血条、横幅同风格（血金、切角、30% 逃跑刻度）。', def: true },
    { id: 'npc_locomo', cat: 'look', icon: '🚶', n: '人物移动自然化 · 不再像 GMod（R47）', d: '走/慢跑/疾跑按实际移速相位同步混合，播放速率匹配步幅（脚不打滑）；起步/刹车有加速度；转身有角加速度、跑动时弧线转弯并向内侧倾身；还在滑行时不会瞬间站定。', def: true },
    { id: 'anime_shade', cat: 'look', icon: '🎎', n: '二次元光影（R36）', d: '角色（头、头发、身体）的光照改成二次元风格：亮面平涂、暗面统一抬到约 80% 并染暖粉阴影色、中间软过渡，去掉塑料感的高光与环境镜面反射，加一圈淡淡边缘光。天空/太阳/篝火/阴影照常响应，极暗环境仍然是暗的。需重新载入。（R36b：用户要 3D 着色器风格，默认改为关；想要平涂二次元可在这里打开。）关闭=R33 的真实 PBR 受光。', def: false },
    { id: 'head_native', cat: 'look', icon: '🧷', n: '头保持原样：不混搭发型/饰品（R36b）', d: '每颗头就是它自己：脸、发型、头饰来自同一个模型，不再把别的头的发型/饰品拼上去（原神等 MMD 头拼起来很违和）；MMD 头也不再额外叠程序化头饰。这个 MOD 会在读档时把“跨头发型 hair_mix2 / 跨头饰品库 acc_mix”关掉；想要混搭就关本 MOD 并手动打开那两项。需重新载入。', def: false },
    { id: 'cc0_only', cat: 'look', icon: '🆓', n: 'CC0 模式：只用 CC0 模型（R38）', d: '游戏里只出现 CC0（公有领域）授权的人物：pixiv 官方 CC0 头（男头已屏蔽，避免大头娃娃）+ 4 具 pixiv CC0 身体 + 7 具 Quaternius CC0 职业服身体（魔女/护林/骑士风/村姑等，按身份穿）；旧存档里的其他头也按种子换成 CC0 头显示（存档不改）。关掉 = 额外出现“非 CC0 包”（仅限私人使用的原神/MMD/VRoid Hub 模型）。动作/场景/道具本来就是 CC0。', def: true },
    { id: 'head_collage', cat: 'look', icon: '🧩', n: '拼图混搭：原神/MMD 头不戴自己的头发（R38）', d: '每颗 MMD/原神脸都换上另一个头的发型（发饰跟着发型走），还常拼上第三个头的饰品——看不出是哪个原作角色。只在关闭「CC0 模式」时有效果（CC0 模式下没有这些头）。', def: true, conflicts: ['head_native'] },
    { id: 'skin_sss', cat: 'look', icon: '🫧', n: '皮肤次表面散射 · 3D 真人质感（R36b）', d: '在 PBR 上只对肤色像素加：明暗交界带的血红色散射、背光侧暖色填充、掠射角的红色透光边（耳朵/鼻翼）、压低塑料硬高光并加一圈极淡的油脂光泽。头发和衣服不受影响，极暗环境不抬亮。需重新载入。', def: true },
    { id: 'head_pbr', cat: 'look', icon: '💡', n: '头部真实受光（R33）', d: '头/头发/眼睛/饰品从“卡通材质”（只有 4 级色阶、不吃天空环境光、不响应光照方向）改为与身体相同的 PBR 材质：同一套灯光、同一张环境图、同一条曲线。阳光/篝火/阴影下头会像身体一样亮暗变化，不再在所有环境里都暗沉发灰。需重新载入。关闭=旧的卡通头。', def: true },
    { id: 'head_norm3', cat: 'look', icon: '📏', n: '头型再收一圈（R33）', d: '在脸宽/眼距对齐 VRoid 之后，非 VRoid 头整体再缩 5%，并且发量/发饰/兽耳撑大整颗头轮廓的（含头发包围盒高超过 VRoid 中位）按比例再收，最多到 82%。需重新载入。', def: true },
    { id: 'body_headfit', cat: 'look', icon: '🧍', n: '原神身体头身比修正（R31）', d: '头挂到身体上的尺寸原本按 VRoid 身体标定，换到原神身体上头会小 3~18%（芙宁娜最明显）。按身高/头高、头宽/肩宽两个指标给每具原神身体单独校正，VRoid 身体不变。', def: true },
    { id: 'id_outfit', cat: 'look', icon: '👗', n: '身份决定衣服（第四十三轮）', d: 'CC0 模式只有 4 具身体，原来按哈希乱分（修女穿魔女裙、骑士穿公主裙）。现在按身份固定：战斗/冒险类 = 青黑绑带装，贵族/圣职/歌者 = 粉白礼裙，女巫/炼金/暗系 = 深蓝长裙，平民/牧羊/药师/修女 = 素白裙；霸主按地区风格。', def: true },
    { id: 'death_cine', cat: 'look', icon: '☠️', n: '就地倒下（第五十轮）', d: '玩家死亡时镜头就地下坠侧翻、渐黑，再弹出死亡界面；以前是先传送回洞窟再播放死亡效果。关掉恢复旧流程。', def: true },
    { id: 'ground_props', cat: 'look', icon: '🪨', n: '岩石贴地（第五十轮）', d: '大件摆设（岩石、树桩等）按脚印四角取最低地面并略微下沉，不再悬在坡上。关掉恢复旧摆法。', def: true },
    { id: 'water_fx', cat: 'look', icon: '🌊', n: '水面质感（第五十轮）', d: '水岸渐隐（不再是硬边平板）、浅滩泛亮、岸边泡沫、更细的涟漪，深处更深。关掉恢复旧水面。', def: true },
    { id: 'shell_grass', cat: 'look', icon: '🌱', n: '壳层草地（第五十轮）', d: '地面长出毛茸茸的草：着色器壳层渲染（不放草模型、无贴图），镜头附近一根根逐渐变细、随风摆动，26 米外自动退回地面。路/水边/陡坡不长，干旱地区稀疏。关掉恢复光秃地面。', def: true },
    { id: 'fast_load', cat: 'look', icon: '⚡', n: '加载提速（第四十九轮）', d: '进图更快：敌人身体/动画/野兽模型与场景资源并行载入，去掉固定等待（淡出 260ms + 60ms），模型解码改同步（更快），地形外圈（玩不到的远景）每 3 格求一次高度其余插值。关掉恢复旧流程。', def: true },
    { id: 'head_natural', cat: 'look', icon: '🧒', n: '头身比更自然（第四十三轮）', d: '头整体缩小 10%：原来头约占身高 1:5.8，像大头娃娃；现在约 1:6.5。关掉恢复旧尺寸。', def: true },
    { id: 'id_look', cat: 'look', icon: '🎭', n: '身份决定发色/头饰/衣服色（第四十三轮）', d: '外观原来只看种族，修女戴兔耳、骑士扎蝴蝶结。现在按身份：发色成套（骑士银/金/棕，女巫紫/黑，修女黑/褐），头饰重配（修女=头纱，女巫=尖帽，公主=小王冠，女王=王冠，工匠/炼金=护目镜，游侠=羽毛），衣服按身份重新着色（修女黑修道服，骑士钢灰，游侠森林绿，女王深红）。霸主不变。', def: true },
    { id: 'back_slow', cat: 'play', icon: '🐢', n: '战斗中后退变慢（第四十三轮）', d: '有敌人盯着你（14 米内、已发现你、没在逃跑）时，倒着走只有约 55% 速度；侧移和向前不变。想脱战要转身跑。敌人重击会边出手边向前逼近，不再被无限后撤躲掉。', def: true },
    { id: 'foe_press', cat: 'play', icon: '🗡️', n: '敌人出招会逼近 / 预判（第四十三轮）', d: '敌人挥砍时，起手到出刀这段会一边朝你迈步（重击迈得更多），出刀瞬间的判定距离随前冲加长；转身按你的移动方向预判 0.25 秒；一击落空后若你还在附近，会立刻追击补刀，而不是发呆站着。', def: true },
    { id: 'head_qc', cat: 'look', icon: '🔍', n: '怪异头模屏蔽（R31）', d: '逐个目检后仍显怪异、暂不能修的头模（八云紫、黑鸟）不再随机出现，也不借给别的头当发型。已拥有的不受影响。', def: true },
    { id: 'recall_iw', cat: 'look', icon: '🤲', n: '原场景回忆（R33）', d: 'F 回忆不再开新的 3D 界面：就在洞里拉近镜头，主角双手捧着她做动作（对视/抚摸/嗅闻/贴耳/那一战 + 把玩：抛接/转圈/戳脸/拍头），首级不再变表情，每个动作有音效；信息卡与动作栏重做。', def: true },
    { id: 'dev_mode', cat: 'play', icon: '🛠', n: '开发者模式（R34）', d: '资源无限（魂晶/材料/药剂自动补满）、全部建筑解锁、无敌、体力无限；F8 或右下角 DEV 按钮打开面板：刷首级（可选稀有度）、装备满阶、等级拉满、回忆全开。关掉即恢复正常玩法。', def: false },
    { id: 'foe_abs', cat: 'play', icon: '⚖️', n: '按地区的绝对强度（R35）', d: '删除两套保险：①敌人伤害不再按你的最大生命百分比算，而是按地区强度的绝对数值（越深越疼）；②删除每刀保底伤害与“普通敌人第 6 刀必死”。新手装备去深处会被秒——要刷装备、练级。', def: true },
    { id: 'hunters2', cat: 'play', icon: '🏹', n: '四名食人魔猎手（R35）', d: '勇者艾琳、追迹者诺薇、守誓人葛温、魔导士米娅。你放倒的人越多仇恨越高，她们全员升级（每 15 仇恨 +1 级）；出猎时猎手感应满了就可能穿越到你所在的地图（洞穴除外），在场时门全部封锁；血量 30% 会逃跑，逃掉就变强。U 查看等级/战力差距/胜率。', def: true, conflicts: ['ogre_hunters'] },
    { id: 'elite_bosses', cat: 'play', icon: '👑', n: '精英挑战 + 月之魔女（R35）', d: '13 名精英（马戏团长/海盗女王/瘟疫医生/竞技场冠军/沙海女王/机关大师/炼金大公/盗贼之主/蛇母/女武神/女法老/剑圣/巨人女王）+ 最终「月之魔女」。满足剧情条件解锁，在探索地图（出洞选地点）或 U/Z 窗口的页签里查看传闻、推荐战力、预估胜率并发起挑战（进入封门决斗场）。', def: true },
    { id: 'victory2', cat: 'play', icon: '🏁', n: '新胜利条件（R35）', d: '胜利 = 任意 7 个地区霸主 + 13 名精英 + 4 名食人魔猎手 + 月之魔女。进度在「精英挑战」页签顶部。', def: true },
    { id: 'gear2', cat: 'play', icon: '💍', n: '传奇式装备（R35）', d: '新增 8 个饰品槽（项链/戒指×2/手镯×2/腰带/靴子/勋章），带 0~5 条随机词条（伤害%、暴击、减伤、回血、吸魂、魂晶、猎手仇恨…）；精英各掉一件专属神话装备。装备只能在野外找到，不能再用魂晶直接买（背篓除外）。Z 打开纸娃娃装备面板。', def: true },
    { id: 'hp_center', cat: 'ui', icon: '❤️', n: '屏幕底部正中大血条（R49d）', d: '血量与魂能放在屏幕底部正中、技能栏正上方：大号数字、掉血白色残影、低血量红光脉动与屏幕边缘泛红。左上角的小框仍保留。', def: true },
    { id: 'memory', cat: 'play', icon: '🧠', n: '回忆：随机 3 选 1 技能（R49）', d: '技能点变成“唤醒记忆”：从不同流派里随机抽 3 张（建成洞里的「回忆之镜」后 4 张，且每次第 1 次重抽免费）记忆卡，三选一。出门结算后自动弹出，也可在回忆之镜前按 E。天赋树界面仍可手动加点。', def: true },
    { id: 'saga', cat: 'play', icon: '🎬', n: '剧情电影「异变」+ 月之线索（R49）', d: '每次进入地区先放一段宽银幕电影：字幕 + 航拍/推轨/环绕运镜，围绕该地点的一场“异变”（枯竭/失声/熄灯/失窃/异兽/祭坛/失踪/叛变/庆典/遗物/异梦），每次随机组合、各不相同。主线=讨伐异变源头：斩首→异变平息（恩），放走→恶化（祸）；一半的异变是“月之魔女的使者”，斩下得线索，集齐 7 条才能挑战月之魔女。回洞有出门结算卡。仅中文。', def: true },
    { id: 'arrival2', cat: 'play', icon: '📜', n: '到达大窗口（R35b）', d: '进入地点时弹出大窗口：大幅地区插图、逐字打出的到达剧情/地区往事/当地人怎么看你/传闻，主线 + 2 条随机支线（完成给魂晶和饰品）+ 威胁一览。取代原来 8 秒的小卡片。', def: true },
    { id: 'eye_white', cat: 'look', icon: '👁️', n: '眼白提亮（第二十四轮）', d: '洞窟火光很暗时眼白被压成灰黑。改为一半受光、一半自身亮度：暗处仍是白的，亮处不比脸亮。', def: true },
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
    { id: 'region_beasts', cat: 'play', icon: '🍄', n: '地区野怪（R41）', d: '每个地区有自己的一套可爱野怪：村子里的咯咯团子/胡萝卜兔/看门汪，精灵林的蘑菇崽与蘑菇大王、铠甲蜂，荒原的仙人掌汉/小霸王龙/飞天羊驼，修道院的被单幽灵与尖帽小法师，沼泽的泡泡史莱姆/蛙王/水母，要塞的兽人与小石像鬼，王都的猫球/小忍/胖鸽子，深渊的三叉戟魔/蝠翼小魔/龙崽，圣山的大雪人/雪团子/冠羽飞龙。会飞的悬在半空。掉落各地区材料。关掉 = 旧的狼/狐/野牛/鹿各地通吃。模型 Quaternius Ultimate Monsters（CC0）。需要「荒野野兽」开着。', def: true },
    { id: 'wfix41', cat: 'play', icon: '🗺️', n: '地图生成修正（R41）', d: '修掉随机地点的一批粗糙问题：进门视线走廊（土丘/土墩不再正好挡在门口）、土丘不压在正中、天空下缘接雾（远处地形边缘不再像一圈纸板墙，也盖住天空照片里的地面景物）、现代街景照片不再当天空、光束侧对时不再是一根根亮线。关掉 = 旧的生成。', def: true },
    { id: 'wsites', cat: 'play', icon: '🎪', n: '特殊地点：人群聚集（R41）', d: '部分地点会变成集会：赶集日/王都夜市（摊主守摊、买家讨价还价）、篝火夜会（围坐、蹲着烤火、喝酒）、朝圣集会（跪拜的信徒、领祷者、持火把的守卫）、魔女夜宴（围着绿光坩埚念咒）、流民营地（几堆小火、提灯守夜）、斗技圈（两人对练、一圈观众）、伐木营（此起彼伏的砍柴声）。5–8 人各就各位，门牌上隔着门就能看到。人多 = 首级多、战利品多（额外宝箱）；但一人发现你会喊醒附近所有人，胆大的冲上来、胆小的四散奔逃。关掉 = 没有集会。', def: true },
    { id: 'hud_bottom', cat: 'ui', icon: '⬇️', n: '提示文字贴底 + 技能栏缩小（R41主管）', d: '野外/洞里底部那行操作提示不再被抬到技能栏上方挡视线，改成屏幕最底下一条细字；野外默认提示去掉括号里的长战斗说明（按 F1 看）。技能栏格子缩小约 20%（R45 放大得太大）。关掉 = R45 原样。', def: true },
    { id: 'weak_starter', cat: 'play', icon: '🪵', n: '新手武器更弱（R41主管）', d: '初始的粗木棒只有 60% 伤害，第一把真武器（钉头棒起）会明显变强。关掉 = 粗木棒正常伤害。', def: true },
    { id: 'wpn_stats', cat: 'play', icon: '🗡️', n: '武器基础属性（R41主管）', d: '每把武器有自己的一套属性，全部真实生效：前摇、出刀、后摇、体力消耗、触及、破防率（普通一击砸开格挡）、暴击率/暴击伤害、切割（砍颈加伤）、击退、格挡耗体、完美格挡窗口。砍刀快而利、流星锤慢但破防、刺剑远且暴击高……背包悬浮/铁匠台可看完整数据。关掉 = 旧的单一“自重”公式。', def: true },
    { id: 'wpn_mastery', cat: 'play', icon: '🎖️', n: '单武器熟练度（R41主管）', d: '生疏→入门→熟练→精通→宗师 的前摇/后摇/体力/伤害倍率改为“每把武器各自练”：用这把武器命中 +1、击倒 +6、斩首/处决 +10。换新武器要从生疏练起。旧存档会把当前境界记到手上那把武器上。关掉 = 按角色等级（R43）。', def: true },
    { id: 'ogre_level', cat: 'play', icon: '⬆️', n: '食人魔升级', d: '狩猎中击杀/斩首/处决/完美格挡等战斗事件积累经验；升级永久提高力量·体魄·敏捷·凶威·魂力与生命上限，并回复一部分生命。狩猎 HUD 与洞窟属性页显示等级。', def: true },
    { id: 'wgen', cat: 'play', icon: '🧬', n: '地点基因组生成器', d: '每个出猎地点由种子派生一条“基因组”：天空(9 张 HDRI 混用+任意朝向)×光照氛围(金色黄昏/晨雾/阴天/血色残阳/瘴气/紫暮/月夜)×季节(盛绿/秋/枯败/霜冻…)×地形原型(丘陵/梯田/盆地/山脊/沙丘/高台/陨坑/干沟…)×溪流池塘×布景×地表着色，同时只下载这个地点用到的资产（加载更快）。关掉=回到旧版地图。', def: true },
    { id: 'wlayout', cat: 'play', icon: '🗺️', n: '地图多样化', d: '出门的地点不再千篇一律：不规则边界、起伏不同的地形、门之间踩出的小径、成簇的树丛与林间空地；随机布景（废弃营地/古战场/猎首者的木桩/侏儒法庭/巨石道/无名祭坛）；天气（雨/雪/萤火/余烬/灰烬/落叶/花粉/扬尘）。关掉 = 原来的圆形空地。', def: true },
    { id: 'spirits', cat: 'play', icon: '🕯️', n: '神灵（先祖）', d: '洞里住着历代洞主的魂（可爱的小精灵）：会聊天、评头、提心愿、玩小游戏，九盏魂灯点亮后举行解咒仪式。可在神灵簿（Y）里隐藏。', def: true },
    { id: 'spirit_sight', cat: 'play', icon: '👁️', n: '通神视角（N）', d: '开启后，须按 N 才看得见洞里的神灵（剧情到访时会自动开启）；关闭则神灵始终可见。需要「神灵」MOD。', def: true },
    { id: 'chess', cat: 'play', icon: '♟️', n: '头棋殿', d: '首级当棋子，和斯尼克下棋或同屏双人。', def: true },
    { id: 'rebirth', cat: 'play', icon: '♻️', n: '轮回祭坛', d: '献祭一世换永久魂核天赋。', def: true },
    { id: 'thief', cat: 'play', icon: '👻', n: '盗魂灵入侵', d: '盗魂灵定期来偷首级，左键打散。', def: true },
    { id: 'surge', cat: 'play', icon: '🌊', n: '魂潮', d: '随机 20 秒全产出 ×3。', def: true },
    { id: 'ach', cat: 'play', icon: '🏅', n: '成就', d: '28 个跨轮回成就（J 键）。', def: true },
    { id: 'echo', cat: 'play', icon: '💭', n: '残响气泡', d: '相邻首级偶尔浮现记忆碎片，并获得 ×2 产出。', def: true },
    { id: 'gesture_combat', cat: 'play', icon: '⚔️', n: '手势战斗', d: 'F 拔刀/收刀。按住左键用鼠标轨迹实时控制武器挥砍（上撩/下劈/横斩，越快伤害越高），连点左键刺击，按住右键格挡（轻移鼠标切换上下左右）。首级查看改为 I 键。', def: true },
    { id: 'crosshair_slash', cat: 'play', icon: '🎯', n: '刀尖锁准星（第十八轮）', d: '按住左键时刀尖固定在屏幕中心，转动视角就是挥砍，刀光＝准星轨迹；关闭则回到旧的“鼠标控制武器轨迹”。需要「手势战斗」。', def: true, requires: ['gesture_combat'] },
    { id: 'talent_tree', cat: 'play', icon: '🌳', n: '角色成长重做：属性点 + 6 大流派天赋树（R36）', d: '每级 3 个属性点（力量/体魄/敏捷/凶威/魂力，手动分配）+ 1 个技能点（另有首杀霸主 / 精英的额外点）。6 大流派（刃舞·铁壁·影袭·狂血·魂术·猎首）共 78 个节点、31 个主动技能，按 T 打开面板；推荐流派可一键加点。关闭=回到旧的“升级自动加属性 + Q/R/G 三个技能”。', def: true },
    { id: 'talent_ui', cat: 'ui', icon: '🎛️', n: '魔兽式界面：大快捷栏 + 头像框 + 目标框（R36）', d: '底部 2 行 × 10 格技能栏（1-0 / Shift+1-0，带冷却转圈、魂能不足变暗、拖拽换位）+ 闪身 / 处决 / 药水快捷位；左上角玩家框（生命 / 魂能 / 体力 / 经验 / 增益图标），目标框（敌人血量 / 词缀 / 流血中毒）。', def: true },
    { id: 'foe_scale', cat: 'play', icon: '📈', n: '敌人随区域变强（R34）', d: '敌人按“推荐战力（区域 × 稀有度）÷ 你的战力”放大血量 / 伤害 / 智力：新手装备进深处地区，敌人血量 ×2.4、伤害 ×3、要砍的刀数同比例增加；装备超额也不会被敌人打成纸（下限 0.9 倍）。关闭=所有地区的敌人一样强。', def: true },
    { id: 'foe_pack', cat: 'play', icon: '👥', n: '深处敌人成群（R34）', d: '越深的地区，一个地点的敌人越多（最多 +2，上限 5 个）。', def: true },
    { id: 'foe_affix', cat: 'play', icon: '💀', n: '精英词缀（R34）', d: '7 种精英词缀：狂热 · 铁壁（护盾层）· 噬血 · 爆裂（死后爆炸）· 幽影（瞬移偷袭）· 连斩 · 再生。越深、越稀有越常见，可叠 2 个；脚下有发光圈，头顶有【精英】标记。', def: true },
    { id: 'foe_skills', cat: 'play', icon: '💢', n: '敌人新技能（R34）', d: '跃斩（红圈落点，落地后有破绽）· 冲锋（红色走廊，格挡无效）· 旋风斩（脚下红圈）· 破防击（红光 = 格挡无效，只能闪身）。所有技能都有预警，做完会露出破绽。', def: true },
    { id: 'foe_mind', cat: 'play', icon: '🎭', n: '敌人读你（R37）', d: '敌人会记住你的习惯（爱举盾 / 爱乱挥 / 爱绕圈 / 爱后撤）并针对：举盾多了 → 红光破防刀；乱挥 → 后撤引你空挥再反击；绕圈 → 横向预判。每个敌人性格不同（耐心 / 突进 / 诈术 / 反击），出手节奏 6 选 1（快刀 / 常规 / 拖刀 / 假动作再快刀 / 破防 / 补刀），并按你的反应接连招。所有新招都有预警，不改伤害数值。', def: true },
    { id: 'region_echo', cat: 'play', icon: '🗞️', n: '地区回响：名声 · 关系 · 后继故事（R39）', d: '每个地区都会记住你：名声称号、百姓 / 武装 / 圣职 / 术士 / 权贵 五方势力的关系、你放倒的人的“后继故事”（亲人哀悼 / 复仇 / 恐惧 / 传说 / 纪念 / 遗产 / 继任）。每趟回洞弹出回响卡并随机给魂晶 / 地区材料 / 药水，也可能多出仇家、猎手仇恨上升；下次抵达时地区会用供品、警告、馈赠、信徒或沉默回应你（同样随机给资源或麻烦）。选地点界面的地区详情里随时可看。不改战斗数值。', def: true },
    { id: 'ui_hub', cat: 'ui', icon: '☰', n: '统一菜单（R42）', d: '按 Tab（洞里 / 野外都行）打开总菜单：左边按 角色 / 挑战 / 收藏 / 世界 / 系统 分组，一键切换各个界面；装备纸娃娃、物品栏、铁匠、工坊、典籍合并成「装备与背包」一页。T / O / F1 / C / U / K / L / B / Z 等原热键仍可用，打开任何面板导航栏都会出现。关闭 = 回到各自分散的窗口。', def: true },
    { id: 'balance_r41', cat: 'play', icon: '⚖️', n: '武技熟练 / 前期平衡（R43）', d: '新手到高手有明显阶梯：生疏（Lv1）→入门（5）→熟练（10）→精通（18）→宗师（27）。生疏时前摇 ×2.2、出刀 ×1.6、收招 ×2.0、体力 ×1.5、伤害仅 45%；宗师时前摇 ×0.9、收招 ×0.85，整体输出约为新手的 5 倍。阶段见 Tab → 角色 → 总览 与 F 拔刀提示，晋升时弹字幕。另有：低强度地区敌人出手更疼、升级曲线前期更慢、深层地区经验更多。数值来自 tools/balance/sim.js 的模拟；旧存档等级不变。关闭 = 回到 R37 的快节奏。', def: true },
    { id: 'hud_legible', cat: 'ui', icon: '👁', n: '界面更清楚 · 底栏不被挡（R40b）', d: '热键栏出现时，所有贴底的提示（[E] 提示、麻袋 HUD、手持书、灵契、按键按钮…）自动抬到它上面，互不重叠；底部整行提示条让位；第二排热键全空时折叠；提示/字幕加深底板、加大字号；F 拔刀提示改成一行短字。不影响任何玩法。', def: true },
    { id: 'keyguide', cat: 'ui', icon: '⌨', n: '按键一览（R40）', d: 'F1 或 ? 打开 / 关闭；标题菜单「⌨ 按键一览」按钮与右下角「按键 F1」小按钮。中 / 日 / EN 三语，按下的键会在面板里亮起。不影响任何玩法。', def: true },
    { id: 'tutorial', cat: 'play', icon: '📖', n: '新手引导教程（R37）', d: '新存档在开场故事之后自动开始；右上角一张小卡片（中 / 日 / EN），按“动手做”推进：看视角 → 走路 → 斯尼克 / 属性 / 建造 → 出洞 → 拔刀 / 挥砍 / 刺击 / 格挡 / 闪身 → 击倒 / 拾取 / 撤退 → 扛袋 / 拿首级 / 把玩 / 回忆 / 天赋。Enter 跳过当前一步，F9 关闭 / 重开，标题菜单「📖 新手教程」也能重看。不阻塞游戏。', def: true },
    { id: 'foe_tactics', cat: 'play', icon: '🧠', n: '敌人战术层（R34）', d: '你挥空 → 立刻反击；你乱挥 → 侧翻躲开后反击；你背对它 → 偷袭；故意拖一拍 / 连续出手，打乱你的“前摇 → 弹反”节奏。', def: true },
    { id: 'foe_roles2', cat: 'play', icon: '🤺', n: '更多敌人类型（第二十六轮）', d: '决斗者（你一出刀就格挡反击）· 重甲卫（正面轻击无效，绕背/终结/重斩）· 术士（魂火球，可打散/闪开/格挡，被贴近会瞬移）· 疗愈者（给同伴回血，优先杀）· 战旗手（红圈内同伴更快更狠，半血战吼全体冲锋）。需要「敌人职业」。关掉 = 只有原来的 6 种。', def: true },
    { id: 'foe_roles3', cat: 'play', icon: '🔱', n: '更多敌人类型 · 第三批（R37）', d: '长枪手（地面红线后直线突刺，落空会踉跄）· 双刀舞姬（快速连斩后后跳，会侧闪）· 炼金投弹手（橙圈预警的燃烧药瓶）· 猎网手（网住你 1.3 秒，可砍断/格挡）· 陷阱师（捕兽夹）· 唤灵师（追人的鬼火，可打散）', def: true },
    { id: 'combat_master', cat: 'play', icon: '⚔️', n: '大师级战斗（第二十六轮）', d: '点左键立刻出刀、连点三连斩（终结更重）、按住甩鼠标朝该方向斩、按住不动松开=重斩破防；判定改为视野锥内“刃到就命中”（不再靠刃尖碰骨头，不会挥空），准星指头/脖子/腿就打哪里；命中有镜头压/侧倾/FOV 冲击/刀身后坐、命中回体力。关掉 = 旧版蓄势挥击手势。', def: true },
    { id: 'atk_cd', cat: 'play', icon: '⏱️', n: '攻击冷却 CD（第二十六轮）', d: '轻斩 0.5 秒、三连终结 0.75 秒、重斩 0.95 秒后才能出下一刀（重武器更久，力竭 +30%）。CD 中点左键会缓冲一刀，冷却一好立刻出。准星外圈细弧显示冷却进度。关掉 = 无冷却连斩。', def: true },
    { id: 'region_econ', cat: 'play', icon: '🌾', n: '地区材料经济 + 霸主首级合成器（第二十六轮 k）', d: '造建筑 / 挖深 / 附魔 +2 以上 / 高阶背篓与再生药都要各地区搜刮来的材料（9 个地区各有常见 + 稀有两种：稻草、月桂枝、狼鬃、圣水、沼泽黑泥、要塞精钢、王都丝绸、深渊黑曜、龙鳞……），光有魂晶不够。每个地点多了 1–3 处地区采集点，敌人 / 容器 / 野兽也会掉当地材料，霸主掉得最多。斩下地区霸主后解锁该地区的「霸主首级合成器」：只认她的首级，把魂晶慢慢合成成当地常见材料，空手按 E 督工。关掉 = 回到只花魂晶。', def: true },
    { id: 'head_support', cat: 'play', icon: '🧲', n: '首级不悬空（第二十六轮 l）', d: '所有放头建筑：每个位置往下探测模型表面，首级正好落在台面/尖桩/桶沿上；下面是液体就泡进去一点。关掉 = 用各建筑原来手写的高度。', def: true },
    { id: 'region_pick', cat: 'ui', icon: '🗺️', n: '地图卡片选地点（第二十六轮 m）', d: '出洞狩猎改成左侧预览图 + 右侧地区档案：霸主、两名小BOSS、居民、特产、到达后的任务，一键出发。关掉 = 旧的卡片列表。', def: true },
    { id: 'region_quest', cat: 'play', icon: '📜', n: '到达简介 + 任务 + 小BOSS（第二十六轮 m）', d: '进入地区弹出一张不挡操作的简介卡并领一个任务（讨伐小BOSS / 斩首 / 放倒 / 讨伐霸主），完成给魂晶和地区材料。每个地区有两名有名有姓的小BOSS，讨伐后永久记录。', def: true },
    { id: 'ogre_hunters', cat: 'play', icon: '🏹', n: '食人魔猎手（第二十六轮 n）', d: '在地区里放倒/斩首/停留越久，追踪热度越高；满了 15 秒倒计时后被拖进生成的「猎手围场」，猎手全灭才开门。每次活下来，下一批更多更强。', def: false, conflicts: ['hunters2'] },
    { id: 'release_slash', cat: 'play', icon: '🗡️', n: '蓄势挥击（第二十二轮）', d: '拔刀后按住左键=蓄势（视角 1:1 跟手，刀向“趋势”反方向拉开，准星旁出现方向线）；松开左键=捕捉松手前的鼠标微趋势，沿该方向挥出一刀（14° 内吸附 8 方向）。没趋势：短按=刺、蓄满 0.7 秒=直劈。按住期间刀尖本身不伤人。关掉恢复第十八轮“刀尖锁准星”。', def: true, requires: ['gesture_combat'] },
    { id: 'forge_buy', cat: 'play', icon: '⚔️', n: '铁匠台·花魂晶直接升阶（第二十二轮）', d: '【默认关，第二十六轮】开 = 铁匠台可以花魂晶直接买下一阶装备（旧规则）。关 = 装备只能野外搜刮（敌人/尸体/容器/霸主），魂晶只用来强化身上已有的装备（武器/头盔/护甲/护符都能 +1~+10）。', def: false },
    { id: 'combat_fx', cat: 'play', icon: '🔊', n: '战斗音效与命中反馈（第二十二轮）', d: '程序合成的一整套战斗音效：挥刀破风（按力度/方向/左右声道）、刺击、挥空、蓄力升调与满格提示、肉体/脖子/骨头/重击命中、斩首喷血、击杀低频、弹刀/格挡/破防/完美格挡、闪避、受伤闷响耳鸣、敌人起手吼声与预警、敌人脚步与出手破风（带方位）；命中十字准星（白=命中 黄=弱点 红=击杀 蓝=被挡）与轻微屏震。关掉恢复旧的采样音效。', def: true },
    { id: 'aim_assist', cat: 'play', icon: '🎯', n: '挥砍辅助瞄准（第二十二轮）', d: '减少“乱挥没打中”：出刀时自动选视野锥内最近的敌人，刀路会过其胸口；对 2 米外的敌人自动延长刃的有效射程并向前小步突进；命中判定对身体略宽容；挥空有音效与提示。不影响视角（没有镜头粘滞）。', def: true, requires: ['gesture_combat'] },
    { id: 'foe_roles', cat: 'play', icon: '🎭', n: '敌人职业（第二十二轮）', d: '敌人不再一个套路：蛮兵（高血量/慢/重击/硬吃轻击）· 游击（冲刺斩后撤步/翻滚闪避）· 盾卫（永远举盾，要绕背或蓄力破防）· 刺客（潜行绕背、背刺×1.6、有提示音）· 狂战（连击、半血狂暴）· 投掷手（远程掷刃，可格挡/打飞）。头顶首次发现时会显示职业名。关掉恢复所有敌人同一套逻辑。', def: true },
    { id: 'swing_momentum', cat: 'play', icon: '🌀', n: '挥砍动量（第二十一轮）', d: '伤害取决于一刀的连贯挥幅：左右乱晃几乎没伤害，大幅度的真砍 / 突刺 / 蓄力才疼。准星下方的细条显示当前冲力。', def: true, requires: ['gesture_combat'] },
    { id: 'foe_smart', cat: 'play', icon: '🧠', n: '聪明的敌人（第二十一轮）', d: '预判拦截、疾跑追击、多人包抄站位、你转身逃跑就冲刺斩、重伤会退开整顿、看不见你会去最后的位置搜索；会绕开树石，卡住自动绕路。', def: true },
    { id: 'foe_door_escape', cat: 'play', icon: '🚪', n: '猎物会从门逃走（第二十一轮）', d: '逃跑的猎物会冲向最近的门，跑到门口就真的逃掉了（这次拿不到她的首级）。', def: true },
    { id: 'ranks', cat: 'play', icon: '🎖️', n: '阶位系统 · 12 系 36 流派（第二十七轮）', d: '名字与魂阶始终显示；每个角色另有「阶位」：按身份分成战阵/狩猎/圣职/自然/奥术/咒影/匠医/艺者/王权/深渊/龙脉/民间 12 大系，每系 3 个流派、10 阶（共 288 个头衔），同一身份也可能走上别的流派；魂阶越高阶位越高。档案卡里有完整的阶位谱。', def: true },
    { id: 'overhear', cat: 'play', icon: '🎧', n: '进场偷听对话（第二十七轮）', d: '进入有人的地点时，屏幕中上方弹出一条长框（带说话人的半身像，不挡视野、不冻结、自动消失）：她们按性格和关系（同系/上下阶/同行）聊天——工作、愿望、信仰、对你的传闻、小习惯；话里会透露她们的信息（直接算作已回忆），内容也记进行程日志。', def: true },
    { id: 'overhear_old', cat: 'play', icon: '🎧', n: '偷听弹框：老版样式（第四十三轮）', d: '用户觉得新的顶部长条“还不如老版”：默认恢复第二十八轮的样式——屏幕中下方的对话框，带气泡尖角，列出每个说话人的名牌（魂阶/阶位/口头禅），对白逐句弹出。关掉 = 顶部长条 + 半身像。需要「进场偷听对话」。', def: true },
    { id: 'recall', cat: 'play', icon: '🧠', n: '回忆 / 无名首级（第二十五轮）', d: '新砍下的首级只知道稀有度和产地；按 F 把她捧到眼前“回忆”：对视、抚摸、嗅闻、贴耳、回忆那一战……一点点想起性格、外貌、身份、信仰、名字、生平。有祭坛/梳妆台/锻造台/棋盘等建筑还能解锁更多动作。关闭后所有首级都显示完整信息。', def: true },
    { id: 'stamina_all', cat: 'play', icon: '💢', n: '统一体力系统（第二十五轮）', d: '攻击、格挡、奔跑、跳跃、闪身共用一条体力；耗尽后力竭——什么都做不了，只能慢走，刀垂下、屏幕发红，歇一会儿才恢复。', def: true },
    { id: 'sprint_stamina', cat: 'play', icon: '😮‍💨', n: '疾跑耗体力（第二十一轮）', d: 'Shift 疾跑每秒消耗体力，耗尽后要缓一缓才能再跑——敌人追得上你了。', def: true },
    { id: 'persona', cat: 'play', icon: '🎭', n: '人设（第二十四轮）', d: '每个敌人按性格（高傲/冷静/温柔/胆小/好战/毒舌/狡黠/开朗）说不同的话、见人是打还是逃、会不会撤退、对峙时点头/摇头/抱臂；没发现你时各干各的（干活、巡逻、蹲守、两人凑一起聊天）；初见弹出【性格·职业】名字。', def: true },
    { id: 'persona_voice', cat: 'play', icon: '🗣️', n: '人设语音（第二十四轮）', d: '敌人真人语音：台词、出手喝声、痛呼、倒下的最后一句；每人音高略有不同，带方位与距离。需开启“人设”。', def: true, requires: ['persona'] },
    { id: 'footsteps', cat: 'play', icon: '👣', n: '脚步声（第二十四轮）', d: '你的脚步沉重、随地面变化（草地/落叶/碎石/石板/泥浆/雪地/洞穴）；敌人有轻快的脚步声，能听出方位远近，跑起来更密更响；盾卫和蛮兵带甲片叮当，刺客一旦盯上你就悄无声息。', def: true },
    { id: 'face_light', cat: 'look', icon: '💡', n: '面部补光（第二十四轮）', d: '像游戏里的角色补光一样，从你视线方向给脸（和身体、头发少量）打一层柔光：背光/阴天/夜里脸也不会黑成一团。', def: true },
    { id: 'hit_hud', cat: 'play', icon: '🩸', n: '命中 HUD：合并伤害数字 + 敌人血条（第二十六轮）', d: '同一个目标连续挨打只显示一个累计数字（带 ×N 连击数、每下弹跳），不再一刀一个数字堆满屏；被打中的敌人和野兽头顶出现血条（白色是刚掉的血），看得见还差几刀。', def: true },
    { id: 'audio_mixer', cat: 'ui', icon: '🔊', n: '音量调节面板（第二十六轮）', d: '右上角 🔊 / 菜单里的「🔊 音量」：总音量、音乐、战斗音效、角色语音、环境音、脚步、界面分别调（0–150%，自动保存）。音乐默认是以前的一半。关掉 = 旧的单一 BGM 开关、固定音量。', def: true },
    { id: 'skill_vfx', cat: 'play', icon: '✨', n: '技能特效（R45）', d: '释放技能时：屏幕边缘门派色闪光、技能栏那一格爆出光环火花、大图标 + 技能名横幅；3D 场景里迸出火花、脚下冲击环、光柱，并按门派加新月刃光 / 护盾壳 / 魂火螺旋 / 残影线；大招另有冲击波与屏震。数字键和小键盘 1–0 共用同一排技能栏；洞里也显示技能栏。', def: true },
    { id: 'world_master', cat: 'asset', icon: '🎞️', n: '野外画质大师（R46）', d: '野外场景的画质层：地形大尺度色块与防平铺、草和灌木加密（高档位）、更软更细的阴影、按地区不同的空气粒子（花粉/光尘/萤火/灰烬火星/飘雪）、分地区电影调色。自动跟随画质档位，掉帧会自动降级；不想要就关。', def: true },
    { id: 'map_shapes', cat: 'asset', icon: '🧭', n: '长图 / 特殊形状地图（R46）', d: '野外地图不再都是一块圆形空地：长廊、花瓣、十字 / 星芒、三角 / 矩形 / 六边形、折角、S 形蛇道、长椭圆……门优先开在尖角或长廊两端，敌人、宝箱、景物和地貌都会铺到各个臂上，敌人也会沿真实边界追你。关掉即回到原来的近圆形地图。', def: true },
    { id: 'terrain_master', cat: 'asset', icon: '⛰️', n: '地形特色化（R46）', d: '野外地形不再是一圈平缓小土包：脊状分形起伏 + 每个地点 1–3 个标志地貌（断崖 / 古冢 / 深壕 / 石冢 / 高台，由种子决定，同一地区也各不相同）；陡坡自动贴上真岩石贴图（草甸是青苔岩、荒原是层岩、深渊是黑岩…），陡处长岩石、不长草树。出门口、水边和出生点附近保持平坦。关掉即回到原地形。', def: true },
    { id: 'cfx3d', cat: 'play', icon: '🩸', n: '3D 战斗特效（第四十一轮）', d: '命中时在 3D 场景里画：新月形斩击弧光 + 冲击星芒/冲击环、拉长的高速血滴 + 红雾 + 伤口浓血、格挡/弹刀的拉长火花线；刃光拖尾改为按时间淡出的平滑带（Catmull-Rom 细分）。关闭则回到旧的 2D 斩痕 + 小圆点。', def: true },
    { id: 'fp_hands', cat: 'play', icon: '🤜', n: '第一人称兽人双手（第四十一轮）', d: '第一人称能看见兽人的两只手和前臂（绿皮 + 皮护腕）：右手握着武器柄、跟着挥砍/格挡/突刺走；左手托柄或护在身侧；空手时是一对拳头。并带武器呼吸晃动、走路摆动、命中后坐。关闭则回到旧的一根圆柱手臂。', def: true },
    { id: 'view_toggle', cat: 'play', icon: '🎥', n: '第一/第三人称切换（第四十一轮，按 V）', d: '按 V（手里没拿首级时）在第一人称与第三人称之间切换：第三人称是过肩镜头，能看到兽人身体（Quaternius CC0 哥布林骨架放大染绿）、走跑动作、挥刀时手臂跟着刀走；镜头会避开墙和树。', def: true },
    { id: 'hit_impact', cat: 'play', icon: '💥', n: '打击感强化：受击顿帧 + 斩痕 + 重击闷响（第二十六轮）', d: '砍中时被砍的人动画冻结 60–150ms（砍进肉里的停顿，你的镜头和操作不冻）；沿出刀方向划过一道刃光（重斩/击杀更宽更红，格挡是黄火花）；叠一层低频闷响；击杀时屏幕边缘红色脉冲。', def: true },
    { id: 'ambience', cat: 'play', icon: '🌲', n: '环境音（第二十四轮）', d: '每种地点一套声景：风、树叶、鸟鸣、啄木鸟、猫头鹰、蟋蟀、蛙鸣、乌鸦、远处狼嚎、旗帜、远钟、滴水、闷雷；洞穴有低鸣和滴水。全部现场合成，暂停/菜单时自动淡出。', def: true },
    { id: 'guard_slowlook', cat: 'play', icon: '🛡️', n: '格挡降灵敏度（第十九轮）', d: '按住右键格挡时视角转动变慢（×0.45），方便稳住架势；挥砍时不降。', def: true, requires: ['gesture_combat'] },
    { id: 'wpn_feel', cat: 'play', icon: '⚔️', n: '格挡降灵敏度', d: '按住右键格挡时视角灵敏度降到 ×0.3（关掉则恢复旧的 ×0.45 或不降）。第二十二轮已移除按住左键的“武器惯性”：按住左键视角 1:1 跟手。', def: true },
    { id: 'loc_story', cat: 'play', icon: '📖', n: '地点进场剧情卡（第二十轮）', d: '每个地点首次进入时冻结并弹出遭遇介绍卡（可撤离）。用户第二十一轮要求去掉 → 默认关。', def: false },
    { id: 'sack_grid', cat: 'play', icon: '🎒', n: '麻袋格子·搜刮经济（第十九轮）', d: '麻袋变成格子物品栏（物品按形状占格，首级 2×2，Tab/B 打开，拖动整理、R 旋转）。野外翻找放入/取出一件 0.6~2 秒（首级 2.2 秒），受击打断；倒袋瞬间倒出全部。武器装备只能在野外搜刮（木箱/酒桶/武器架/尸体/霸主）；魂晶只用于附魔武器与材料合成。关闭 = 旧的「麻袋装 N 颗头」+ 商店购买。', def: true },
    { id: 'worldlay', cat: 'play', icon: '🏕️', n: '地点布局原型（第十八轮）', d: '出猎地点不再只是随机撒树：营火营地、林间空地、湖畔码头、残垣庭院、石阵高台、峡谷小径、废弃集市，带地形起伏与敌人阵型。', def: true },
    { id: 'film', cat: 'play', icon: '🎬', n: '电影模式', d: 'P 键自由飞行镜头。', def: true },
    { id: 'unlocks', cat: 'play', icon: '🔒', n: '隐藏解锁', d: '未解锁建筑不显示，达成条件后弹窗说明。关闭则全部按层数解锁。', def: true }
  ];
  const BY = {}; LIST.forEach(m => BY[m.id] = m);
  /* R40：名称/说明按语言取（js/mods_i18n.js 的 ModsI18N[id] = [nEn, dEn, nJa, dJa]；没有则回退中文）→ 日/英模式不再混入中文 */
  const lgc = () => { const l = (window.I18N && I18N.lang) || 'zh'; return l === 'en' ? 0 : l === 'ja' ? 2 : -1; };
  const nm = m => { const k = lgc(), t = window.ModsI18N && ModsI18N[m.id]; return k >= 0 && t && t[k] ? t[k] : m.n; };
  const dm = m => { const k = lgc(), t = window.ModsI18N && ModsI18N[m.id]; return k >= 0 && t && t[k + 1] ? t[k + 1] : m.d; };
  const BUILDS = { forge: ['forge'], bowling: ['bowling'], dresser: ['dresser'], chess: ['chess'], rebirth: ['altar'] };
  let st = {};
  try { st = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  // 第十轮：画风 MOD 冻结不再维护，默认回原版且关泛光（减少开局卡顿）；旧存档迁移一次
  if (!st.__v || st.__v < 2) { for (const m of LIST) if (m.group === 'render') st[m.id] = (m.id === 'r_classic'); st.bloom = false; st.__v = 2; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  if (st.__v < 3) { st.explore3d = false; st.__v = 3; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  if (st.__v < 4) { for (const id of ['steady_save', 'ground_contact', 'head_repair', 'smooth_faces', 'cave_detail']) st[id] = true; st.__v = 4; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  if (st.__v < 5) { st.forge_buy = false; st.__v = 5; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} } // R26：装备不能买，只能搜刮 + 强化
  if (st.__v < 6) { st.ogre_hunters = false; st.hunters2 = true; st.__v = 6; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} } // R35：旧食人魔猎手 → 四名主角式猎手
  if (st.__v < 7) { st.dev_mode = false; st.__v = 7; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} } // R37：开发者模式默认关闭（用户要求），旧存档迁移一次
  if (st.__v < 8) { st.anime_shade = false; st.__v = 8; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} } // R36b：用户要 3D shader 风格，二次元光影默认关（旧存档迁移一次）
  if (st.__v < 9) { st.hair_mix2 = false; st.acc_mix = false; st.__v = 9; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} } // R36b：用户不要头发/头/饰品混搭绑定（原神头搭配很违和）
  if (st.__v < 10) { st.cc0_only = true; st.head_collage = true; st.head_native = false; st.hair_mix2 = true; st.acc_mix = true; st.__v = 10; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} } // R38：用户要 CC0 模式默认开；不要“头发-头-饰品”原样绑定，要拼图混搭
  if (st.__v < 11) { st.cc0_only = false; st.__v = 11; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} } // R43：用户“不限制 CC0 了”——默认关闭 CC0 模式（旧存档迁移一次；仍可在 O 面板重新打开）
  if (st.__v < 12) { st.cc0_only = true; st.__v = 12; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} } // R43b：用户改口“还是得 CC0”——默认重新打开 CC0 模式（旧存档迁移一次；非 CC0 模型放进“非 CC0 包”，关掉 CC0 才出现）
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
    const off = (k, why) => { if (st[k]) { st[k] = false; notes.push(`已关闭「${nm(BY[k])}」（${why}）`); for (const o of LIST) if ((o.requires || []).includes(k)) off(o.id, `依赖「${nm(BY[k])}」`); } };
    if (v) {
      if (st[id]) return notes;
      for (const r of m.requires || []) if (!st[r]) { notes.push(`已开启依赖「${nm(BY[r])}」`); notes.push(...set(r, true)); }
      if (m.group) for (const o of LIST) if (o.group === m.group && o.id !== id && st[o.id]) { st[o.id] = false; }
      for (const c of m.conflicts || []) if (st[c]) { if (BY[c].group) { const fb = LIST.find(o => o.group === BY[c].group && !(m.conflicts || []).includes(o.id)); st[c] = false; if (fb) { st[fb.id] = true; notes.push(`画风切换为「${nm(fb)}」（与「${nm(m)}」冲突）`); } } else off(c, `与「${nm(m)}」冲突`); }
      for (const o of LIST) if (st[o.id] && (o.conflicts || []).includes(id)) off(o.id, `与「${nm(m)}」冲突`);
      st[id] = true;
    } else {
      if (!st[id]) return notes;
      if (m.group) { const fb = LIST.find(o => o.group === m.group && o.id === 'r_classic') || LIST.find(o => o.group === m.group && o.id !== id); return set(fb.id, true); }
      st[id] = false;
      for (const o of LIST) if ((o.requires || []).includes(id)) off(o.id, `依赖「${nm(m)}」`);
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

  // ---------------- 管理器界面（R39 重做：左侧分类 + 搜索 + 筛选 + 行内开关 + 点行展开详情；原地刷新不丢滚动位置） ----------------
  const CATN = { render: '画风渲染', ui: '界面', perf: '性能', look: '角色外观', play: '玩法', asset: '模型与材质' };
  const CATI = { render: '🖼️', ui: '💎', perf: '⚡', look: '🧬', play: '🎲', asset: '🏛️' };
  const CATS = ['play', 'look', 'ui', 'render', 'perf', 'asset'];
  const CATD = { render: '画风只能选一个（单选）', perf: '低配模式会关掉后处理类 MOD' };
  let box = null;
  const view = { cat: 'all', q: '', f: 'all', open: null, note: '', scroll: 0 };
  function css() {
    if (document.getElementById('modcss')) return;
    const s = document.createElement('style'); s.id = 'modcss';
    s.textContent = `#modbox{position:fixed;inset:0;z-index:60;background:rgba(8,5,3,.78);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;font-family:system-ui,'PingFang SC','Microsoft YaHei',sans-serif;color:#ead8b8}
#modbox *{box-sizing:border-box}
#modbox .mb{width:min(1080px,96vw);height:min(760px,92vh);display:flex;flex-direction:column;background:linear-gradient(180deg,#24160f,#150d09);border:2px solid #6a4a2e;border-radius:20px;box-shadow:0 20px 80px rgba(0,0,0,.8),inset 0 0 60px rgba(0,0,0,.45);overflow:hidden}
#modbox .hd{display:flex;align-items:center;gap:14px;padding:14px 20px 10px;border-bottom:1px solid #3c2a1a}
#modbox .hd h2{margin:0;font-size:22px;color:#ffe2a0;letter-spacing:.06em;white-space:nowrap}
#modbox .hd .cnt{font-size:12px;color:#a89070;white-space:nowrap}
#modbox .sr{flex:1;position:relative;max-width:420px;margin-left:auto}
#modbox .sr input{width:100%;padding:8px 12px 8px 34px;border-radius:10px;border:1px solid #5a3e28;background:#120a06;color:#ffeccb;font-size:14px;outline:none}
#modbox .sr input:focus{border-color:#e0b75d}#modbox .sr:before{content:'🔍';position:absolute;left:10px;top:7px;font-size:14px;opacity:.7}
#modbox .x{border:1px solid #5a3e28;background:#2a1b10;color:#d9c39f;border-radius:10px;padding:7px 12px;cursor:pointer;font-size:13px}#modbox .x:hover{border-color:#e0b75d;color:#fff0bc}
#modbox .bd{flex:1;display:flex;min-height:0}
#modbox .sd{width:188px;flex:none;padding:12px 10px;border-right:1px solid #3c2a1a;overflow:auto;background:rgba(0,0,0,.18)}
#modbox .ct{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;cursor:pointer;font-size:14px;color:#cdb896;border:1px solid transparent;margin-bottom:2px}
#modbox .ct:hover{background:#2a1b10}#modbox .ct.on{background:#3a2915;border-color:#8c6a3c;color:#fff0bc}
#modbox .ct i{font-style:normal;width:20px;text-align:center}#modbox .ct em{margin-left:auto;font-style:normal;font-size:11.5px;color:#8f7b60}#modbox .ct.on em{color:#e0b75d}
#modbox .fl{margin:12px 4px 4px;font-size:11px;color:#8f7b60;letter-spacing:.1em}
#modbox .chip{display:inline-block;margin:2px 3px 2px 0;padding:3px 9px;border-radius:999px;border:1px solid #5a3e28;background:#1a110b;color:#bfa985;font-size:12px;cursor:pointer}
#modbox .chip.on{background:#3a2915;border-color:#e0b75d;color:#fff0bc}
#modbox .ls{flex:1;overflow:auto;padding:10px 16px 14px;scroll-behavior:auto}
#modbox .gh{margin:14px 2px 6px;font-size:13px;color:#e0b75d;letter-spacing:.08em;display:flex;gap:8px;align-items:baseline}#modbox .gh:first-child{margin-top:2px}
#modbox .gh small{color:#8f7b60;font-size:11.5px;letter-spacing:0}
#modbox .row{border:1px solid #3c2a1a;border-radius:12px;background:#1b120c;margin-bottom:6px;transition:border-color .12s,background .12s}
#modbox .row:hover{border-color:#6a4a2e}#modbox .row.on{border-color:#8c6a3c;background:#241710}#modbox .row.pend{box-shadow:inset 3px 0 0 #6fc0ff}
#modbox .rh{display:flex;align-items:center;gap:12px;padding:9px 12px;cursor:pointer}
#modbox .ic{font-size:22px;width:30px;text-align:center;flex:none}
#modbox .tx{flex:1;min-width:0}#modbox .tx b{font-size:14.5px;color:#f3e4c6;font-weight:700}
#modbox .tx small{display:block;color:#a89070;font-size:12.5px;line-height:1.4;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#modbox .row.ex .tx small{display:none}
#modbox .tag{display:inline-block;margin-left:6px;padding:0 6px;border-radius:5px;font-size:10.5px;line-height:16px;vertical-align:1px;border:1px solid #5a3e28;color:#a89070}
#modbox .tag.pd{color:#9fd4ff;border-color:#3f6f94}#modbox .tag.df{color:#c9b08a}#modbox .tag.nd{color:#e9a070;border-color:#7a4a2a}
#modbox .sw{flex:none;width:44px;height:24px;border-radius:12px;background:#3a2a1e;border:1px solid #5a3e28;position:relative;cursor:pointer;transition:background .15s}
#modbox .sw:after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#9a8468;transition:left .15s,background .15s}
#modbox .on .sw{background:#7a5a1e;border-color:#e0b75d}#modbox .on .sw:after{left:23px;background:#fff0bc}
#modbox .sw.rd{width:24px}#modbox .sw.rd:after{left:3px;opacity:0}#modbox .on .sw.rd:after{left:3px;opacity:1}
#modbox .dt{display:none;padding:2px 14px 12px 54px;font-size:13px;line-height:1.65;color:#d8c6a6}
#modbox .row.ex .dt{display:block}#modbox .dt .m{margin-top:6px;font-size:12px;color:#8f7b60}#modbox .dt .m b{color:#c9a768;font-weight:600}
#modbox .em{padding:40px 10px;text-align:center;color:#8f7b60}
#modbox .ft{display:flex;align-items:center;gap:10px;padding:10px 20px;border-top:1px solid #3c2a1a;background:rgba(0,0,0,.25)}
#modbox .nt{flex:1;min-width:0;font-size:12.5px;color:#ffd27a;line-height:1.45;max-height:38px;overflow:hidden}#modbox .nt.pd{color:#9fd4ff}
#modbox .bt{border:1px solid #5a3e28;background:#2a1b10;color:#d9c39f;border-radius:10px;padding:8px 16px;font-size:14px;cursor:pointer}#modbox .bt:hover{border-color:#e0b75d}
#modbox .bt.pri{background:linear-gradient(135deg,#8a5a1c,#5a3810);border-color:#e0b75d;color:#fff0bc;font-weight:700}#modbox .bt[disabled]{opacity:.4;cursor:default}
@media(max-width:760px){#modbox .sd{width:120px}#modbox .ct em{display:none}#modbox .hd .cnt{display:none}}`;
    document.head.appendChild(s);
  }
  const esc = t => String(t == null ? '' : t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const brief = d => { d = String(d || '').replace(/<[^>]+>/g, ''); const i = d.search(/[。！；]|\.\s/); let t = i > 6 && i < 70 ? d.slice(0, i) : d.slice(0, 64); return t + (t.length < d.length ? '…' : ''); };
  const pending = () => LIST.filter(m => !!st[m.id] !== !!bootSt[m.id]);
  function match(m) {
    if (view.cat !== 'all' && m.cat !== view.cat) return false;
    if (view.f === 'on' && !st[m.id]) return false; if (view.f === 'off' && st[m.id]) return false;
    if (view.f === 'chg' && !(!!st[m.id] !== !!m.def)) return false; if (view.f === 'pend' && !(!!st[m.id] !== !!bootSt[m.id])) return false;
    const q = view.q.trim().toLowerCase(); if (q && !(m.n + ' ' + m.d + ' ' + nm(m) + ' ' + dm(m) + ' ' + m.id).toLowerCase().includes(q)) return false; return true;
  }
  function rowHTML(m) {
    const pd = !!st[m.id] !== !!bootSt[m.id], ex = view.open === m.id;
    const req = (m.requires || []).map(i => BY[i] && nm(BY[i])).filter(Boolean), cf = (m.conflicts || []).map(i => BY[i] && nm(BY[i])).filter(Boolean);
    return `<div class="row ${st[m.id] ? 'on' : ''} ${pd ? 'pend' : ''} ${ex ? 'ex' : ''}" data-id="${m.id}"><div class="rh" data-a="ex"><div class="ic">${m.icon}</div><div class="tx"><b>${esc(nm(m))}</b>${pd ? '<span class="tag pd">待应用</span>' : ''}${!!st[m.id] !== !!m.def && !pd ? '<span class="tag df">已改动</span>' : ''}${m.reload ? '<span class="tag nd">需重载</span>' : ''}<small>${esc(brief(dm(m)))}</small></div><div class="sw ${m.group ? 'rd' : ''}" data-a="tg" title="${m.group ? '选用这个画风' : '开 / 关'}"></div></div>`
      + `<div class="dt">${esc(dm(m))}<div class="m"><b>默认</b> ${m.def ? '开' : '关'}　<b>ID</b> ${m.id}${req.length ? `<br><b>依赖</b> ${esc(req.join('、'))}（开启时自动打开）` : ''}${cf.length ? `<br><b>冲突</b> ${esc(cf.join('、'))}（开启时自动关闭）` : ''}</div></div></div>`;
  }
  function listHTML() {
    const out = []; const cats = view.cat === 'all' ? CATS : [view.cat];
    for (const c of cats) { const ms = LIST.filter(m => m.cat === c && match(m)); if (!ms.length) continue;
      out.push(`<div class="gh"><span>${CATI[c] || ''} ${CATN[c] || c}</span><small>${CATD[c] || ''}</small></div>` + ms.map(rowHTML).join('')); }
    return out.join('') || '<div class="em">没有匹配的 MOD</div>';
  }
  function sideHTML() {
    const cnt = c => LIST.filter(m => (c === 'all' || m.cat === c) && st[m.id]).length, tot = c => LIST.filter(m => c === 'all' || m.cat === c).length;
    const fl = [['all', '全部'], ['on', '已开启'], ['off', '已关闭'], ['chg', '与默认不同'], ['pend', '待应用']];
    return [['all', '📚', '全部']].concat(CATS.map(c => [c, CATI[c], CATN[c]])).map(([c, i, n]) => `<div class="ct ${view.cat === c ? 'on' : ''}" data-cat="${c}"><i>${i}</i>${n}<em>${cnt(c)}/${tot(c)}</em></div>`).join('')
      + `<div class="fl">筛选</div>` + fl.map(([k, n]) => `<span class="chip ${view.f === k ? 'on' : ''}" data-f="${k}">${n}</span>`).join('');
  }
  function footHTML() {
    const pd = pending(); return `<div class="nt ${pd.length && !view.note ? 'pd' : ''}">${esc(view.note) || (pd.length ? `待应用 ${pd.length} 项：` + esc(pd.slice(0, 5).map(m => (st[m.id] ? '＋' : '－') + nm(m).replace(/（.*?）|\(.*?\)/g, '')).join('、') + (pd.length > 5 ? '…' : '')) : '点开关即可切换；点击条目展开详情。修改后需要“应用并重新载入”（会先自动存档）。')}</div>`
      + `<button class="bt" data-a="def">恢复默认</button><button class="bt" data-a="close">${pd.length ? '暂不应用' : '关闭'}</button><button class="bt pri" data-a="apply" ${pd.length ? '' : 'disabled'}>应用并重新载入${pd.length ? ' (' + pd.length + ')' : ''}</button>`;
  }
  function refresh(keepScroll = true) {
    if (!box) return; const ls = box.querySelector('.ls'), y = ls ? ls.scrollTop : 0;
    box.querySelector('.sd').innerHTML = sideHTML(); box.querySelector('.ls').innerHTML = listHTML(); box.querySelector('.ft').innerHTML = footHTML();
    box.querySelector('.cnt').textContent = `${LIST.filter(m => st[m.id]).length} / ${LIST.length} 已开启`;
    if (keepScroll) box.querySelector('.ls').scrollTop = y;
  }
  if (window.I18N && I18N.onChange) I18N.onChange(() => { try { if (box && box.isConnected && box.style.display !== 'none') refresh(); } catch (e) { } }); // R40：切换语言时面板重绘
  function open() {
    css(); if (box) box.remove();
    if (document.pointerLockElement) document.exitPointerLock();
    if (window.G && G.setUIOpen) G.setUIOpen(true);
    view.note = '';
    box = document.createElement('div'); box.id = 'modbox';
    box.innerHTML = `<div class="mb"><div class="hd"><h2>🧩 MOD 管理</h2><span class="cnt"></span><div class="sr"><input id="modq" placeholder="搜索名称 / 说明（按 / 聚焦）" value="${esc(view.q)}" autocomplete="off"></div><button class="x" data-a="close">✕ 关闭 Esc</button></div><div class="bd"><div class="sd"></div><div class="ls"></div></div><div class="ft"></div></div>`;
    box.addEventListener('click', e => {
      if (e.target === box) { close(); return; }
      const ct = e.target.closest('[data-cat]'); if (ct) { view.cat = ct.dataset.cat; refresh(false); box.querySelector('.ls').scrollTop = 0; return; }
      const ch = e.target.closest('[data-f]'); if (ch) { view.f = ch.dataset.f; refresh(false); return; }
      const row = e.target.closest('.row');
      if (row) { const id = row.dataset.id;
        if (e.target.closest('[data-a="tg"]')) { const notes = set(id, !st[id]); view.note = notes.join('；'); refresh(); return; }
        view.open = view.open === id ? null : id; refresh(); return; }
      const a = e.target.closest('button'); if (!a) return;
      if (a.dataset.a === 'close') close();
      else if (a.dataset.a === 'def') { for (const m of LIST) st[m.id] = !!m.def; normalize(); save(); view.note = '已恢复默认设置（仍需应用并重新载入）'; refresh(); }
      else if (a.dataset.a === 'apply') { save(); try { if (window.G) G.save(); } catch (er) {} location.reload(); }
    });
    box.addEventListener('keydown', e => { if (e.target.id === 'modq' && e.code !== 'Escape') e.stopPropagation(); });
    box.addEventListener('input', e => { if (e.target.id === 'modq') { view.q = e.target.value; refresh(false); } });
    document.body.appendChild(box); refresh(false);
  }
  function close() { if (box) box.remove(); box = null; if (window.G && G.setUIOpen) G.setUIOpen(false); }
  addEventListener('keydown', e => {
    if (e.code === 'KeyO' && !e.repeat && !box && window.G && G.playing && !G.uiOpen) { e.preventDefault(); open(); }
    else if (box && e.code === 'Escape') { e.preventDefault(); const q = document.getElementById('modq'); if (q && q.value) { q.value = ''; view.q = ''; refresh(false); } else close(); }
    else if (box && e.key === '/' && document.activeElement && document.activeElement.id !== 'modq') { e.preventDefault(); const q = document.getElementById('modq'); if (q) q.focus(); }
  });
  return { LIST, on, set, apply, open, close, get isOpen() { return !!box; }, get state() { return st; }, get boot() { return bootSt; } };
})();
