# HANDOFF（给后续模型）— 请每次编程前先读，**不要覆盖本文件，只能追加**

## 用户约束 / 偏好（必须遵守）
1. 仓库: https://github.com/deawfwaef2/head （用户在对话里提供 token，不要把 token 写进仓库文件）
2. 文件按用户给的“编号”存到对应子文件夹（如 `1/`），没有就新建。用户首次未给编号 → 默认用 `1/`。
3. **阶段性频繁 commit+push**，不要全部做完再保存（网站可能中断/回退）。
4. **随时保证可玩**：子文件夹内必须有可直接双击打开的 `index.html`（file:// 可运行，不依赖服务器/CDN）。
   - 因为 file:// 下 fetch/ES module 会被 CORS 拦截：three.js 用 classic 脚本（本地 `lib/three.min.js`），资源用 `<script>` 加载的 .js（base64）方式。
5. 工作区 < 128MB；游戏总大小 < 60MB，但不牺牲画质。
6. 优先打包 HTML，再优化。每次改动后检查明显 BUG。
7. 根据用户反馈迭代。

## 游戏设计需求（用户原话要点）
- 第一人称，纯白房间，开局只有：一个按钮 + 一根管道。
- 靠近按钮点击 → 管道掉下一个“头”（只有头部），带物理，可拖动/拿着把玩/摆放。
- 头随机，分稀有度；表情随机各异（半闭眼微张嘴、瞪眼紧闭嘴等）。
- 头部模型：用户想要高质量商用可用的二次元女角色（不要 VRoid，想要高分 MMD 成品），只保留头部，切口做好（有凹凸材质感，不只是贴图）。
  - 注意：多数 MMD 模型规约禁止商用/禁止猎奇（断头）改造 → 需找明确允许的许可（CC0/CC-BY）。目前 v1 使用程序化生成的二次元头部（Three.js），后续可替换。
- 掉落音效要“有质量感”，BGM/音效：用户希望网上找；v1 用 WebAudio 程序化合成。
- 玩法：头产出资源，需要触发器：
  - 手持把玩 = 一次触发
  - 建造：桌子（把玩桌上某个头时，桌上其他头也触发收益）、杆（插头，每10秒自动触发）
- 反馈要足、要爽（飘字、粒子、音效、震屏等）。

## 进度日志（追加）
- [v0] 初始化仓库与 handoff。
- [v1] `1/index.html` 可双击运行（Chrome/Edge）。结构：
  - `1/lib/three.min.js`（three r149 classic build，勿换成 ES module 版本）
  - `1/js/audio.js` 程序化音效+BGM；`1/js/headgen.js` 程序化二次元头（表情12种、5稀有度、发型/饰品）；`1/js/game.js` 主逻辑（自写球体物理、建造、存档 localStorage key `head_game_save_v1`）
  - 已实现：按钮→管道掉头(首2个免费)，把玩(左键)/拿起(E)/扔(右键)，连击倍率，桌子连锁，杆子10秒自动，幸运符升级，XX 卖出/拆除，飘字/粒子/冲击环/稀有光柱/震屏。
  - 调试钩子：`window.__game`（dropHead, addCoins, poke...）。测试脚本在工作区 /home/user/tmp（不在仓库）。
  - 总大小 ~0.7MB。
- 待办/可改进：换授权允许的高质量头模（需 GLB 转 base64 .js 才能 file:// 加载）；真实录音音效（CC0，同样转 base64 .js）；更多建造物；头模更精致（眼睛更大、发量）。

## 用户新约束（第2轮反馈，追加）
- **游戏文件直接放仓库根目录**（不再用 `1/` 子文件夹；已迁移）。根目录 `index.html` 双击即玩。
- 头部模型必须**网上下载**二次元女角色（MMD 等高质量、高评分），多种多样、越多越好；可以改模，但改完要好看、和原模型有些区别。
- 按 B 打开建造 UI 时要能**用鼠标选择**，UI 要大；建造物要多样（美化房间的装饰等）。
- 按钮要**按 60 次才掉一个头**；可建造**自动按钮点击器**。
- **头多了不能卡**（共享几何体/材质、休眠、少阴影等）。

## 2026-09-28 · Round 2 完成（v2）
- 头部改为 12 个真实授权 VRM 动漫女性模型裁切（models/*.js，base64 GLB，约 19MB；许可见 CREDITS.md）。ModelHeads 失败时回退 HeadGen 程序化头。
- 按钮需按 60 次出一个头（按住左键连按；进度环+头顶进度条）。升级「按钮强化」每次 +N。
- B 菜单：大号鼠标面板（功能/装饰/升级三栏）。功能：桌子(连锁)、杆子(10s)、展示台(20s×4)、自动按钮器(2s/次)、转盘(6s)、音箱(光环×1.5)。装饰 11 种（舒适度=全局加成 1+comfort/100）。主题 4 种。
- 性能：共享材质缓存、斑点阴影代替头部投影、shadowMap 仅在建造变动时更新、空间哈希+休眠、子步上限 5。150 个头堆在一起 CPU 仍 60fps。
- 坑：**不要把材质/纹理放进 Object3D.userData**——clone 会 JSON 序列化并 toDataURL 贴图，单个头 300ms。已改用 WeakMap。
- 存档键 head_game_save_v2。调试钩子 window.__game。
- 测试脚本思路：playwright + swiftshader；性能测时把 renderer.render 置空只测 CPU。

## 用户新约束（第3轮反馈，追加）
- 不再有 60MB 限制（但工作区仍 <128MB）。用户说仅私用、仓库保持公开、自担风险；**我方仍不把明确禁止再分发/禁止暴力的模型上传公开仓库**，改用程序化混搭扩大多样性。
- 主题：玩家=洞穴食人魔。女角色（中世纪奇幻）的名字/个性/信仰/目的/外貌/身份/故事全部随机生成；**头永不重复**，随机空间要极大。
- 程序化角色生成器：多种基础模型 + 跨模型换发型/改色/种族特征/饰品；多找模型。
- 表情**不要像活的**（死气：无高光、半阖眼、微张嘴、不眨眼）。头发要有物理（摆动）。
- 血腥程度：用户选「黑暗奇幻，较重」（不做过度猎奇）。
- BGM 要刺激、多巴胺（已用 Kevin MacLeod CC-BY 曲目）。
- 白房间 → 洞穴；可**扩建/挖深**洞穴。
- **删除按钮+管道**。改为：主角装备系统（钱买装备）、训练提升属性、RPG 属性。所有装饰都提升战斗力。
- 离开洞穴 → 选择地点界面 → 不同地点不同身份/种族的女角色 → 点击屏幕 60 次才能回家 → 按战力/地点决定带回多少头；生成剧情文本（可点开查看）、掉血；太难的地点可能一无所获甚至死亡（HP=0 死亡需重开）。
- 每个头可「回忆」是怎么得到的（生成故事，要写得爽）。
- 游戏名由我设计；剧情合理化「为什么把玩头能得到钱」。

## 第3轮设计（v3）
- 名称：《魂首窟》——食人魔格罗克被月之魔女诅咒，只能以亡魂为食；被他斩下的首级里残留「残魂」，把玩/折磨首级会渗出「魂晶」(货币)，地精行商斯尼克收购魂晶并出售装备。
- 模块：js/sfx.js(音效+音乐) js/lore.js(文本生成) js/heads.js(混搭头) js/cave.js(洞穴) js/builds.js js/rpg.js(属性/装备/远征结算) js/ui.js js/game.js。
- 模型管线 v3：以头骨宽度 0.16 归一化、原点=头骨中心，meta 增加 skullTop/hairTop/front/eye，头发网格名在 meta.hair，便于跨模型换发型。

## 2026-09-28 · v3 可玩（修复 "Cave is not defined"）
- 原因：上一会话推送了 v3 模块，但 index.html 仍加载已删除的 audio.js/headgen.js，且没有 ui.js。
- 新 index.html 加载顺序：three → GLTFLoader → models/*.js → sfxdata → sfx → lore → builds → cave → heads → rpg → game → ui。
- 新增 js/ui.js（window.UI）：主面板 Tab(属性/装备·斯尼克/建造/首级收藏/狩猎日志)、首级档案+「回忆」打字机、训练小游戏(8秒狂点，每9下+1)、出洞选地点→点击60次回家(剧情逐段揭示、掉血/魂晶/得头)、到家结算倒头、HP=0 死亡→G.wipe() 重开、开场5页剧情。
- 快捷键：B 建造 · Tab/I 属性 · C 收藏 · L 日志 · E 洞口出猎/商人 · F 查看首级 · H 喝药。
- 坑：开场剧情必须在「开始游戏」点击时直接打开（不先锁鼠标），否则 pointer lock 晚到会盖住弹窗。UI.open() 会隐藏 #menu。
- 测试：v3b(完整一趟村庄)、v3f(死亡/装备/训练/挖深) 都通过，无报错。swiftshader 下相机贴地近拍可能崩溃（仅测试环境问题）。
- 待办：更多基础模型（当前14个）；头发目前是 shader 弹簧摆动，非骨骼物理；平衡性调优。

## 2026-09-28 · 玩家反馈修复（v3.1，待推送）
- 头越墙：头模的可见宽度大于保守物理球。洞壁中心半径从 `cave.R - 0.45` 收紧到 `cave.R - 0.82`，留出可见半径余量；地板碰撞中心从 `RC` 抬高 `0.055m`，避免断面穿地。
- 门口拿头：E 现在优先取视线下的头；准星错过时会在玩家前方约 3m 范围内择近取头，然后才触发洞口/商人交互。
- 麻袋：远征归来不再在场景里同步创建一堆头。首级记录先标记 `inBag` 并存档，洞口生成布袋；E 扛起，扛离出口 3.2m 后 E 倒出，Q/右键可放下；每颗以约 620ms 间隔滚出，降低瞬时卡顿。未倒出的内容重进游戏会继续在麻袋里；头数量 HUD 显示麻袋数。
- 把玩：持头时滚轮旋转朝向，V 在半阖死寂/紧闭/失焦/松颌/惊恐/狰狞痛苦间切换（直接改 morph，不重建模型）。
- 前发消失：随机选发型时先找脸/发型兼容组，缺候选才全池回退；没有可用原生刘海的脸强制借发型。头发材质双面显示，交换发型小幅外扩，弹簧摆动降低横向/向脸内的位移。
- 首级档案新增模型来源和公开状态提示；CREDITS.md 重写成 14 个实际打包模型的许可表，并逐项列出不可公开收录的候选及原因。受限候选不会出现在随机池。
- 篝火锥体改 NormalBlending、降低 opacity / glow，减轻 swiftshader 下白色过曝。
- 测试：JS `node --check` 与 `git diff --check` 通过；Playwright 加载无 page errors，ModelHeads=14、热切表情可用、麻袋数据可倒出、越界测试的头中心半径 5.791m < 6.18m 安全边界。第二次自动回归脚本受 headless intro/pointer-lock 状态影响，未能覆盖“门口提袋→移动→倒出”的完整人工交互；真实浏览器需再确认一次。
- 新模型侦察：查询了 OpenSourceAvatars 的 CC0 100Avatars (候选 Witch/Devil/PyreSorcerer/MoonGirl/GoodKnight/StitchWitch 等)、OpenGameArt CC0 VRoid E/F/G 旧样本及 Meshy 的 CC0 资源页面；尚未集成。原因：需要逐个核对 VRM 内嵌授权/暴力许可、模型品质和头部裁切，而当前缺少可复用的 VRM→裁切头 GLB 离线转换脚本。不要把未核实素材塞入公开随机池。

## 用户新约束（第5轮反馈，追加）
- 头发有时候有 BUG → 修；角色种类太少 → 多加二次元角色（可搜 MMD 等，不限 VRoid；素材少就自己程序化做变化）。
- 机制更丰富：更多可以放头的地方。
- 文风：继续按原文风格，不需要先中性化（保留原有文本；新写文本沿用暗黑奇幻战利品口吻）。
- 仍然：随时可玩、频繁推送、HANDOFF 只追加。
- 用户提到“按编号存进对应子文件夹”，但未给出编号 → 已向用户询问，未执行。
- 素材底线（仓库公开）：只收录许可允许公开再分发+改造+暴力表现的模型（CC0 / CC-BY / VRM 元数据允许）。MMD 同样逐个核许可。

## 2026-09-28 · Round 4（第5轮反馈）完成
- **新角色**：VRoid Studio 2.x 官方样本 **K / L / S**（`models/AvatarSample_K|L|S.js`，grp vroid，可与其他 vroid/twist/seed 混搭发型）。VRM1 元数据：allowExcessivelyViolentUsage=true、allowRedistribution=true、modification=allowModificationRedistribution、法人商用。L 是男性脸（原作），混搭长发后多为短发少女观感。
- **转换管线 `tools/vrm2head.py`**（离线，Python + numpy + Pillow）：
  `python3 tools/vrm2head.py src.vrm File "名" "credit" [--grp vroid] [--hair-drop 0.12] [--norm 0.194] [--out path] [--force]`
  - 读 VRM0/VRM1 许可元数据，不允许暴力/再分发/改造时拒绝（--force 跳过，仅限私用，别提交）。
  - 静止姿势全量蒙皮；按材质名分类 HAIR / FACE·EYE / SKIN / 其他布料；保留脸、头骨权重>0.5 的头发（切面下 hair-drop 截断）、切面以上的脖子皮肤、帽子类布料。
  - **VRoid 2.x 的多个图元共享同一顶点缓冲** → 统计（眼睛/头顶/脖子半径）只能用图元索引实际引用的顶点（`up(p)`），否则切面会跑到肩膀。
  - 切面 yCut = eyeY − 0.81·(skinTop − eyeY)，加 `__CUT__` 盖；统一缩放到 切面→头顶 = 0.194（与旧模型一致，`--norm`）。只保留预设表情；贴图 WebP ≤1024。
  - 转换后：index.html 加 `<script src="models/X.js">`、CREDITS.md 加一行、渲染检查（见下）。
- **程序化发饰**（`js/heads.js` addHairX）：马尾 / 双马尾 / 钻头卷 / 丸子 / 双丸子 / 麻花辫 / 双麻花辫 / 呆毛（1~2 根）。挂在“发壳”（贴合后发型的径向最大半径图，头皮+6mm 兜底）上，用同一个头发着色器 → 跟随染发/渐变、会摆动。look.hx = {s, len, rib, seed, ahoge}，在 randomLook **最后**抽签（不改变旧种子其余外观），概率 0.42（race.hxP 可覆盖，race.hx 可指定偏好）；戴魔女帽不出丸子/呆毛；godette 组不加。lore 外观描述会写出发饰。
  - 注意：着色器按几何体局部 y 做渐变与摆动 → 程序化部件的位置必须**烘进几何体**，不能用 mesh.position。
  - 本 three.js 版本（2022）用 `texture.encoding = THREE.sRGBEncoding`，没有 colorSpace。
- **头发 bug**：帽子/兽耳/光环/王冠改按“实际贴上去的发型顶端”（发壳 top）定位，不再用脸模型的 hairTop → 借来高发型时不再陷进头发。
- **旅途抉择事件**（`js/ui.js`）：每趟 2 次二选一（约 30–40% / 62–72% 进度），1/2 键或点按钮：岔路、岩洞过夜、魂光（可能额外得一颗首级）、铁箱、地精商队（买药）、**血月祭坛**（献上本趟最低阶的首级换大量魂晶）、**战场遗迹**。结果写入远征日志。
- **多插槽展示位**（`js/game.js` + `js/builds.js`）：`mount.slots = [[lx, ly, lz, yaw?], ...]`，建筑 `b.heads[]`（替代旧 `b.head`），首级 `h.slot`，存档 `rec.ms`（旧档默认 0，兼容）。新建筑：**首级架** headrack（3 位，第 2 层）、**万首灯柱** lampost（4 位朝外，第 3 层）、**血池祭坛** bloodpool（5 位朝内，第 4 层）。**共鸣**：满座 +0.25、同族 +0.15×n、同阶 +0.10×n，乘到自动产出；标签显示 “k/n 满座·同族 ×1.70”。E 放入最近的空位、E 取下最近的头；头掉落到空尖桩上会自动插上。
  - 建筑 key 不要和装饰 D('rack') 等重名（曾因此 mount 丢失）。
- **测试工具**（gitignored）：`_t.html` = index.html 只保留 6 个模型（完整版在 1GB 沙箱 headless 会崩）；`_hv.html` + `_tools/hv.py` 渲染头像网格；`_tools/smoke.py`。headless 只需 `chromium_headless_shell`（完整 chromium 可删以省 /tmp 内存）。
- 待办：更多模型（VRoid Hub 上有 VRoid 2.1 官方样本 Q~Z 的 VRM0/VRM1 版本，但下载需登录，沙箱拿不到；用户如能下载 .vrm 放进仓库，`tools/vrm2head.py` 一条命令即可转换）；程序化发饰再加侧马尾/公主卷/长直发延长；展示位/共鸣的数值平衡需实玩调整。

---

## Round 6（本轮）— 用户反馈与实现记录

### 用户反馈（原话要点）
麻袋倒头要"大师级"动画；E 经常拿到别的位置的头；展览感要更强、组件机制要更有创意；通灵台：放头→播放她生前的 MV（反差要爽）；头要有更多用途；"为什么每次头会自动回正"；角色太同质化、没有抽卡惊喜；后期无聊、无重玩性；BGM 要能关。

### 新增约束（长期有效）
- BGM 必须可由玩家关闭（M 键 / 右上角按钮，localStorage `soulhead_music` 持久化）。
- 首级不再自动回正：落地按 `RESTS` 静止姿态（侧躺/仰/俯等）自然停住。
- E 只拿准星对准的那颗（射线或 ~6° 小圆锥，不隔建筑）。

### 实现（commit）
1. `8ee803b` 阶段1+2：E 精确选头 + 准星环；静止姿态；BGM 开关；**抽卡系统**：魂印 `c.aff`（贪婪/怨灵/共鸣体/招魂/爆魂/歌姬/魅惑/幸运/不朽，均有真实效果）、称号 `c.title`、异色 `c.shiny`（金辉/银霜/虹彩/星空发色 ×3 产出 + 光环）、发光眼 `look.glowEye`。
2. `466735c` 阶段3：**倒袋仪式**（game.js `unloadBag`/`updateCine`/`gachaCard`）：麻袋悬空→按袋内最高稀有度发预兆光→抖动→翻转→首级按稀有度升序抛出（压轴），落地光柱 + 抽卡卡片（星级/称号/魂印/NEW/异色彩虹框），高稀有闪屏震屏；E/点击 3.2× 加速。朝向用 `camera.getWorldDirection`（旧的 sin/cos yaw 公式方向是反的，别再用）。
3. `d7a20f6` 阶段4：**通灵台**（builds `C.seance` + `js/seance.js`）：对准台上首级按 E（Shift+E 取下）。独立 WebGLRenderer 渲染"活着的"她（`ModelHeads.create(look,{alive:true})` 保留高光、dull/blood/pale=0），眨眼、打字时口型（aa/oh/ih/ou/ee）、每幕表情；8 幕：标题→童年(种族)→日常(ID.act)→性格台词(45 种 trait 各一句)→信仰→梦想(c.goal)→最后一个早晨(八音盒发条变慢)→反转"……然后，她遇见了你。"（褪色、眼中高光熄灭、血色浮现、不协和低音+心跳）。首次通灵：安抚（`rec.calm` 产出×1.5 安详脸）或榨取（大量魂晶 + 怨灵魂印，痛苦脸）；歌姬×2、通灵日×3。MV 期间主场景暂停渲染。
4. `b03116a` 阶段5：**展厅/重玩**：展示柜 `C.showcase`（旋转台、铭牌 canvas、聚光锥 `raycast=()=>{}` 不挡准星）；展厅分 `exhibit()` 与评级 F→SS（每级全体产出 +8%）；图鉴·展厅菜单页（每 5 种身份 +5%）；悬赏榜 `C.bounty`（3 条委托，交首级换魂晶 + 声望，每 3 声望远征幸运 +1，`RPG.luckOf(S)`）；每日魂潮 `G.daily`（血月/异色之夜/丰饶/通灵日/赏金日）。全局倍率在 `trigger` 里 `globalMul()`。

### 测试
- `_tools/scene.py` + `_t.html`（轻量模型集）。测试钩子：`G._dbg.{carry,unloadBag,startSeance,submitBounty,interactE,cine}`。
- headless 仅 ~0.3–0.5× 实时速度，等待时间要放宽。

### 待办 / 想法
- 用户的"编号→子文件夹"问题仍未回答。
- 可继续：轮回/转生（永久加成）、首级互动事件（两颗头对话）、展厅访客 NPC 打分、图鉴完成奖励模型等。

---

## 第七轮（用户反馈 → 实现）

**反馈**：插桩首级偏移；删除准星圆环；偶尔脸前有圆片；首级更多用途；更多可玩性与角色区分（头饰，不要低质模型）；后期全解锁后无聊；桌上敲头会飞走；更"爽"；头发要一直有轻微动态；更多重玩性。"放开手大胆干"。

### S1 修复（1be4883）
- 插桩对齐：`seatHead` 以模型颈部切口 `meta.cut`×HS 对准桩尖 / 台面。
- 删除准星圆环 → 改为发丝/皮肤 `uHover` 边缘光；删除脸前眼罩圆片（**教训：不要在 meta.front 放扁平圆片**）。
- 敲击 = 纯视觉（squash/wob），桌上/挂载首级不再被打飞。
- 头发 `injectVertex` 加常驻微风摆动；稀有度光晕减弱。

### S2 头饰与角色区分（f450251）
- `js/headwear.js`：14 种程序化精细头饰（大蝴蝶结/双侧蝴蝶结/女仆头饰/兔耳/贝雷帽/迷你礼帽/交叉发夹/星星发夹/花冠/暗棘之冠/护目镜/流苏发簪/铃铛/羽饰）。用 `onShell` 贴合发型外壳，`look.hw=[{k,c,c2,v,s}]`，按身份掷骰（`BY_ID`），GROUP 互斥（hat/band/side，最多 2 件）。
- `createHead` 为旧存档懒补 `look.hw` 与 `look.mk`（腮红/泪痣/雀斑，skinMat `uMk`，缓存键 skin5）。卡片显示头饰。

### S3/S4 新玩法（`js/play.js`，e072a0d 起）
- 挂钩：game.js `HOOK = {frame, e, click, tip}`，`rebuildHead(h)`，G 导出 floatText/spawnBeam/gachaCard/unmount/trigger/soulWisp/clock/held/setUIOpen。
- **熔魂炉** `forge`（depth1, max2）：3 炉台 → E 炉心 → 螺旋吸入动画 → `RPG.forgeHead` 新首级（同阶必升，否则 30%+炉心 升阶；继承 1–2 条魂印；输入含异色 34%/颗 异色；三神魂必异色）。费用 60/180/600/1800/5000。
- **魂球道** `bowling`：6 根骷髅瓶，扔出的首级（水平速度²>0.6）撞倒 → 连锁；全中 STRIKE = 该首级 trigger ×12×(1+0.5×连击)，否则 ×1.5×瓶数；1.4s 后复位。
- **闲聊共鸣**：相邻 <1.05m 的两颗首级每 10–20 s 聊天（气泡），之后 20 s `h.buff` ×2（trigger 内）。同族/头饰特殊台词。
- **盗魂灵**：每 5–9 分钟（≥3 颗挂载）从洞口飞来偷首级，左键命中（HOOK.click 射线）hp=6+2×depth，击散奖励；逃走偷 6% 魂晶、首级丢在洞口。
- **化妆台** `dresser`：拿首级 E → 头饰切换/换色、染发（每次 60×(rar+1)），表情/妆容免费。
- **轮回祭坛** `altar`（depth2）：`soulhead_meta`（独立键，不随 wipe）。魂核 = floor(sqrt(本世 earned/4000))，≥3 可轮回。天赋：魂火/天命/遗产/执念(带走首级)/魂囊/幽手(自动把玩)/炉心/猎魂。每世永久 +10%。图鉴跨轮回合并。
- **魂潮**：每 6–11 分钟 20 s 全产出 ×3。**成就** 28 个（J 键），跨轮回，奖励魂晶或魂核。
- `Play.mul()` 进 globalMul，`Play.luck()` 进 luckOf，`Play.cap()` 进背篓容量。

### 待办 / 未决
- 编号→子文件夹问题用户仍未回答。
- 测试页 `_t.html` 中 `G.playing=false`，闲聊/魂潮/盗魂灵自动触发需用 `Play._dbg.*` 手动触发。

---

## 第八轮 · 用户反馈（原话要点，长期有效）
- 每次编程前先读 HANDOFF；**只追加不覆盖**；阶段性频繁 commit+push；**随时保证根目录 index.html 双击可玩**；工作区 <128MB。
- 文风：用户要求沿用原有风格。**本助手的底线**：保持第3轮确定的「黑暗奇幻、较重、不做过度猎奇」，不升级为 18G 猎奇/血腥特写，不做任何性化内容。
- 新玩法需求：
  1. **头棋**：大型建筑-棋盘，用收集的首级当棋子，走法按稀有度/等级分配；可与营地哥布林对弈（它用木制棋子），难度可不断拔高；**同屏双人**（自己和自己下）。
  2. 更多大型建筑小游戏：扑克、昆特牌式、炉石式卡牌对战……首级当棋子/卡牌，按特性个性不同。
  3. **电影模式**：镜头自由飞行；首级摆放更自由。
  4. 建筑旋转不只 2 个角度。
  5. 麻袋动画要更自然真实（不要仪式感悬浮）。
  6. 物理：展示柜里的头不能浮空；头不能陷进地里；偶发看不到断面 BUG 要修。
  7. 未解锁建筑不显示，解锁条件未知，解锁后弹窗写明原因。
  8. 首级不说话，只有低频「回忆气泡」。
  9. 稀有度细分，越高级装饰越高级。
  10. 每个地区一个 BOSS（概率遭遇，可选择挑战，看得见模型，有对话）；征服全部区域 BOSS 首级 = 通关。更多区域。
  11. 外出随机事件更多；招揽 NPC 入营，NPC 在洞穴闲逛、按个性评论首级；可和 NPC 玩小游戏；可驱逐 NPC。
  12. 初次去某地区 / 去久了 的不同反馈文本。
  13. 更多 BGM 变化；更多女角色类型（找网上授权允许的模型）；装饰模型更精致。
  14. 性能：9999 个头不卡（远处用 impostor/实例化、LOD）。
  15. 渲染：多几个画风方案（插画/赛璐璐/水彩式后处理）。
  16. 游戏更长。

## 第八轮 · 本轮完成（commit 81b05f8 → 最新）
- **旋转**：`b.rot` 现在是以 90° 为单位的浮点数（R/Shift+R 每次 0.125 = 11.25°）。`rotAabb`/`fpOf` 已按任意角度求外接 AABB。旧存档整数 rot 兼容。
- **物理**：碰撞盒顶面接触改用 `supportH(h)`（朝向相关支撑高度），头在桌面/展台上不再按 RC 球浮空；休眠首级被推挤后统一做地面/洞壁约束（修“头在地里”）；手持首级不低于地面；展示位 `seatHead` 顶面 −3mm。断面材质 DoubleSide + polygonOffset（修偶发看不到断面）。
- **首级不说话**：play.js 闲聊改为低频（45–105s）「残响」思绪气泡（斜体虚线框，记忆碎片），仍给 ×2 buff。
- **隐藏解锁** `js/unlocks.js`：`S.unl = {key: 原因}`；未解锁建筑不显示（只显示 “??? × N”），达成后弹窗写原因。条件表 `Unlocks.R`（没写的按 depth）。新建筑记得在 R 里加条件，否则默认按 depth/直接解锁。
- **头棋殿** `js/chess.js`（在 builds.js 之后加载，往 `BuildCat.C.chess` 注册建筑）：E 打开大厅（编队：点选/Shift或右键设首领/自动编队）；模式：挑战斯尼克 12 级（alpha-beta+静态搜索，深度 1–4，限时）或同屏双人（蓝方=另一队首级 / 木棋阵容）。独立 WebGLRenderer 全屏，`window.__pauseMain=true` 暂停主循环。走法按魂阶：凡=兵 灵=马 英=象 圣=车 神=后，异色/双魂印神魂=魂后(后+马)，首领=王；吃首领即胜，兵底线升后。奖励 `150×1.85^(lv-1)`，首胜×3，存 `S.chess={best,wins}`。首级模型面朝 +z（镜头侧）。调试：`Chess._st()`, `Chess._move([from,to])`, `Chess._think(T,S,side,lv)`。
- **电影模式** P：自由飞行（WASD/空格/C/Shift/[ ]/滚轮 FOV），`body.film` 隐藏 HUD。**G** 键：把手中首级按当前朝向轻放到准星表面。
- **倒袋**：改为自然倾倒（pivot 提袋底→倾斜 1.95rad→抖动→首级从袋口 `bag.localToWorld(0,0.5,0)` 按物理滚出→空袋甩地瘪掉）；仅圣魂+/异色给小光柱与音效，E/点击加速仍有效。
- 测试：`_tools/smoke.py <page> <script.js> <wait> <afterExpr> <wait2>`；`_tools/mk_t.py` 从 index.html 生成轻量 `_t.html`。headless 下游戏时间约 0.1–0.3× 实时，动画测试要设 `cine.fast`。需 `sudo playwright install-deps`。

### 第八轮 待办（按优先级，下一轮继续）
1. 魂牌桌（扑克/昆特/炉石式卡牌，首级当卡牌，按特性个性出技能）——`Unlocks.R.cardtable` 已预留条件；同屏双人。
2. 地区 BOSS（概率遭遇、可选挑战、可见模型+对话）；征服全部 BOSS 首级 = 通关；更多区域；初次/常去地区的不同文本；更多随机事件。
3. NPC 招募（洞内闲逛、按个性评论首级、可一起玩小游戏、可驱逐）。
4. 万首冰窖 vault（首级只存记录不生成 3D，支持 9999 颗；远处首级 LOD/隐藏头发摆动）。MAX_HEADS 目前 200。
5. 画风方案：插画/赛璐璐描边/水彩后处理（自写全屏 shader，不依赖 EffectComposer）。
6. 稀有度细分（星级）→ 装饰档次；更多 BGM（Kevin MacLeod CC-BY）；更多授权模型（仅 CC0/CC-BY/VRM 允许暴力再分发）。

---

## 第九轮 · 用户反馈（原话要点，长期有效）
- 继续：只追加 HANDOFF；阶段性 commit+push；随时保证 index.html 双击可玩；工作区 <128MB。
- **中期头多了卡**：目标 9999 个头都不卡。
- **所有改动做成 MOD 式**：玩家可选择是否启用每个 MOD；注意 MOD 冲突（互斥组、依赖）。
- **画风 MOD**：多个不同风格的渲染 MOD（插画感/赛璐璐/水彩/油画/电影…），用户嫌现画质“跟恋活差不多、简陋、像低级游戏”。
- **模型替换 MOD**：建筑/装饰太粗糙，可从网上找高质量模型升级（仅允许再分发的许可：CC0/CC-BY/VRM 允许）。
- **角色种类**：不要只是换头发换皮肤；各种类型、差异化明显，保证好看高质量、无显示 BUG；更多女角色种类。
- **更多地点、更长流畅、更多品质细分**。
- BUG：有时角色断面没能正常显示。

### 第九轮 · 进度记录（本会话）
- fe3fb13 断颈不显示修复（运行时 fixCutUV + 皮肤 discard）。
- 6e54897 MOD 框架 `js/mods.js`：主菜单「🧩 MOD」/ 游戏内 O 键；互斥组、依赖、冲突自动处理；改动需「应用并重新载入」。所有第九轮新功能都挂在 MOD 开关下（`Mods.on(id)`）。
- 8e7eeba / 41db2d1 画风 MOD `js/render.js`（自写后处理链）：原版 / 插画（默认）/ 赛璐璐 / 水彩 / 油画 / 暗黑电影 / 水墨，外加描边、泛光。技术：结构张量 + 各向异性 Kuwahara（Kyprianidis 2009，多项式权重 8 扇区）、深度+颜色描边、纸纹/画布、bloom。低配模式自动关闭后处理并降分辨率。
- 同批修复：**首级在篝火旁被点光源冲成白色**（深色头发显示成白金）——MeshToonMaterial 模板里加了柔性光照压缩（1-exp 软膝盖）。这是“画质廉价感”的主要来源之一。
- 性能 / 9999 首级（MOD `lod`）：
  - `js/store.js`：魂库存档。入库记录按 id 每 256 条一块，LZW 压缩（≈13×）存到 `soulhead_vault_<k>`，只重写签名变化的块；主存档不含入库记录。9999 颗 ≈ 1M 字符。
  - `js/lod.js`：远处（≥4.5m）静止首级 → 从当前视角拍进 2048² 图集（112px 一格，324 格），全部替身 1 次 draw call；视角变化 >22° 按每帧 3 张预算重拍。40 颗测试：draw call 1390 → 310，三角形 90 万 → 19 万。
  - 洞内 3D 上限 200 → 320（lod 开），超出的自动进魂库；魂库上限 9999。
  - UI：H 档案「首级收藏」= 全部/洞内/魂库/麻袋 + 品阶筛选 + 排序 + 搜索 + 分页（60/页）；卡片「📥 存入魂库 / 📤 取出到洞里」；「一键收纳」散落首级。
  - 物理网格改数字键 + 复用数组（减少每帧分配）。
  - 坑：`renderer.setRenderTarget()` 时才拷贝 rt.viewport/scissor——必须先设再绑定，否则每次拍照清空整张图集。
- 待做：E 角色多样性（species / pupils / stars）、F 新地点与更深洞层（regions）、G 模型替换 MOD（asset）。编号→子文件夹 的问题用户仍未回复。

## 第十轮用户反馈（原话要点）
- “编号→子文件夹”是写错了，**作废**，不用再问。
- MOD 刚载入进入游戏最初几秒比较卡。
- **画质 MOD 太弱，先不管画质、不要再维护那些画风 MOD。** 真正的问题是模型/环境设计质量低：纹理细节太低、low poly、没有大师级感觉；构图不好看。场景、建筑、道具、头饰装饰都太粗糙 → 网上找模型；小物件装饰更多。
- 放置首级不方便不灵活：**长按 E 进入建造模式放置首级**，位置可附着（贴表面），**绿色预览**，遵守物理；支持更精细摆位。
- 主角可以**下蹲**。
- 刺激不够、反馈太少。
- 更多地点！更长流畅！更多品质细分！更多女角色种类！角色差异化更明显，不要只换头发；要好看高质量、无显示 BUG；可以网上找高质量模型改（用户：“你随便找模型我不网上公开发布”）。
- 探索机制过于简单：开头黑屏没有代入感；过程粗糙；外部世界没有活感/生动感/进步感。
- 叙事有 AI 味/模块生成味 → 要“内置豪华、复杂全面的逻辑推演引擎”：考虑角色注意力、状态、视角、距离、偶遇、声望、认知等因子生成故事，分支几乎无穷，文风好。探索也要大师级逻辑生成。更多活灵活现的互动、对话、交谈。
- 外出随机事件；可招揽 NPC 加入；可和 NPC 玩小游戏；NPC 在洞穴闲逛、按个性评论你找到的头；可以把它们赶出去。
- **胜利目标**：每个地区一个 BOSS（概率遭遇，可选择是否挑战；模型看得见，有对话）；征服全部区域 BOSS 首级 = 通关。更多区域。

### 第十轮计划（每步推送）
1. 开局卡顿（着色器预热 / 替身拍照预算渐进 / 默认画风回原版）+ 下蹲。画风 MOD 冻结不再维护。
2. 首级建造式放置：长按 E → 绿色/红色预览、贴附表面、滚轮/R 旋转、物理校验。
3. 地区 BOSS + 胜利条件（可见模型、对话、可选挑战、BOSS 首级、通关画面）。
4. 探索重做：不再黑屏；因子驱动的叙事推演引擎（注意力/状态/视角/距离/声望/认知…）+ 随机事件 + 对话。
5. NPC 招募：洞内闲逛、按个性评论首级、小游戏、驱逐。
6. 高质量 CC0 模型替换场景/建筑/道具/头饰（Poly Haven 等），更多小装饰，重做构图。
7. 更多地区、品质细分、女角色种类与差异化（种族材质/瞳形/体态特征）。
- 素材立场：仓库在 GitHub 上，提交即分发 → 仍只用许可允许再分发的素材（CC0 / CC-BY / VRM 允许再分发）。

---
## 第十轮 · 阶段 2 完成记录（长按 E 摆放模式，commit 2a2e8b0）
- game.js：长按 E（>350ms）进入摆放；绿色=可放 / 红色=不可放预览 + 落点圆环；表面法线判定（墙面不可放，地面/桌面可放）；挂架自动吸附空位；滚轮旋转（Shift 微调）、R 换姿势（HP_POSE / RESTS）；左键/E 确认，右键/Esc 取消。
- 独立 `hpRay`（far 6.5），不要复用共享 `ray`（far 3.4）。提示文字必须在 `ui.tip.innerHTML` 之前最后赋值，否则被 else-if 链覆盖。
- G 导出：startHP / confirmHP / cancelHP / updateHP / get hplace。

## 第十轮 · 阶段 3+4 完成记录（第一人称出猎 + 叙事引擎 + BOSS）
新文件（index.html 顺序：… ui → tale → explore_world → explore → seance …）：
- `js/explore_world.js`（ExWorld）：9 个地区主题（天空渐变+太阳、雾、贴路平坦的起伏地形+顶点色、蜿蜒土路+路边石、风中摆动的实例化草、地区布景道具、粒子：花粉/萤火/尘/花瓣/鬼火/余烬/雪、鸟群、炊烟、风车、旗帜、岩浆、浮岩）。新地区没有主题时按 loc.color 自动生成。
  - **颜色坑**：主渲染器是 sRGB 输出 + ACES，所有手写颜色必须 `ExWorld.lin()`（sRGB→线性），否则整体发白。顶点色/实例色同理。
- `js/tale.js`（Tale）：因素叙事引擎。性格→9 种声线；因素＝是否察觉（注意力：性格/目击/恶名/伤势/立誓杀你）、实力差 q、你的伤势、本地恶名 S.rep[k]、仁名 S.mercy[k]、本趟是否目击你杀人、信仰、宿愿、武器、发色瞳色、地点意象。句子带条件+权重，最近 80 句去重。API：ctx / intro / greet / talk(n) / spare / last / win / fightWin / fightLose / spareGo / sneakBy。
- `js/explore.js`（Explore）：
  - 复用 G.renderer（不开第二个 GL 上下文），`__pauseMain`，自己的 rAF；标题卡（地区色渐变，不黑屏）遮住建世界 + `renderer.compile` 预编译；结束时全部 dispose，恢复 #menu / HUD（body.exploring 隐藏洞内 HUD）。
  - 路长 L=210m，自动行走 3.1m/s，按住鼠标/空格 7.5m/s，点按加速；鼠标位置环顾；步伐摇晃+脚步声。
  - beats 映射到路上位置；非遭遇 beat 路过即出现在左下文字流；遭遇 beat 在路上站着真实角色（makeFigure：ModelHeads.create(alive 版 look, {alive:true}) + 程序身体：56 个身份→OUT 表 dress/gown/robe/armor/leather/work + 围裙/披风/毛领/袴/翅膀(white/dark/bat)/尾巴/武器；脖子半径取 meta.cut.r 伸进断面藏住截面；呼吸、眨眼、看向镜头）。
  - 遭遇选项：察觉→⚔️动手/🗣️交谈(两轮)/🚶放她走；未察觉→🗡️偷袭(伤害减半)/🗣️搭话/🚶绕开。放过会从 res.heads 移除该首级并 S.mercy[k]++；击杀 S.rep[k]++ 并设置本趟“目击”。胜负仍用 RPG.expedition 预算结果（平衡不变）。rpg.js 现在给每个遭遇 beat 附 `who {c, look}`、`won`、`dmg`、`full`。
  - 扩展钩子：`Explore.hooks.choices`（数组，f(o, opts) 追加选项）、`Explore.hooks.pick(o, k, api)`（返回 true 表示已处理）——阶段 5 招揽 NPC 用这个接。
  - 旅途抉择事件（ui.js EVENTS）在路上有实体道具（箱子/祭坛/魂光/篝火/商队/战场/路牌），ui.js 新增无 DOM 的 `applyChoice(ev,i)`。
  - BOSS：`Explore.BOSSES`（9 地区，名/称号/种族/身份/性格/信仰/宿愿/look 覆盖/台词/传记/pow/col）。出现率 0.22 + 0.13×(本地出猎次数-1)，上限 0.85，已击败不再出现；位置 0.84L，雾色渐变。决斗：她显示意图（重击/连刺/施法），闪避克重击、格挡克连刺、猛攻克施法；第 4 个地区起有假动作（部分会提示“有些古怪”）；可撤退（挨 12% 伤害）。胜利：`RPG.bossHead()` 生成神魂首级（c.boss=k），`S.bosses[k]`；全部地区 BOSS 集齐 → `S.won` + 一次性胜利画面「魂首窟之主」，之后继续游戏。
  - 新存档字段：S.visits / S.rep / S.mercy / S.bosses / S.won。
- MOD：`explore3d`（play，默认开）；关闭则回到旧的“点击 60 次”文字旅途（ui.js textTrip）。3D 构建失败也会自动退回文字旅途。
- 测试脚本（/tmp，会丢）：ex.py（地区路/遭遇/BOSS 截图）、ex2.py（多地区完整一趟）、ex3.py（全部世界+56 套服装 NaN 检查）、ex4.py（偷袭击杀 + BOSS 决斗胜利）。调试：`Explore.forceBoss = true`、`Explore._X`。

---
## 第十一轮用户反馈（原话要点，必须遵守）
- **原则：不要自己做模型，去网上找。** 程序化身体 = 失败；程序化纹理 = 失败；背景/场景/模型（第一人称出猎世界）= 用户判定“一坨屎”。
- 旅行改回“出去后点 60 次 + 屏幕 UI 板”的形式（不要第一人称 3D 世界）。
- 断头切口有时候有问题（需要排查修复）。
- 各种家具模型要大规模重置（换成网上找的模型）。
- 需要正常的人体模型 + 动作（网上找，不要程序化）。
- NPC 要加入：可爱的小精灵、非人感；邪恶系（不是正义系）。
- 用户回答（第十一轮）：人体模型+动作 **出猎 UI 板和洞里两处都要**；模型来源“你先找，我之后自己改成私有，我其他电脑还要用”（不要替用户改仓库可见性）；切口问题 = **断口比头（脖子）大，而且有的模型下巴也被切掉一点**；NPC 小精灵类型 = **小恶魔、鬼火/幽灵、骷髅小妖、暗系小生物（蝙蝠/史莱姆/影子）都要**。

### 第十一轮 · 步骤1+2 完成
- 出行恢复为「出门→点击60次→屏幕面板」（mods：explore3d 默认关，__v3 迁移强制关）。旧 3D 出猎保留为实验 MOD。
- 断颈切面修复：heads.js `fitCut` 按实际颈部轮廓重建切面（48 角度分箱），并补 UV；tools/vrm2head.py 改为：切面不高于下巴最低点-6mm、颈半径只取颈柱附近顶点、比例仍按原基准（头部大小不变）。样本K/L/S 已从源 VRM 重转。17 个模型逐个渲染验证。
- 源 VRM 下载方法：`api.github.com/repos/<o>/<r>/contents/<path>` + `Accept: application/vnd.github.raw`（LFS 文件 raw 链接只给指针）。

## 第十二轮用户反馈（原话要点）
- 头有时候一半会陷在地里（BUG）。
- 继续加入更多头部、更多模型！非常多角色头模型，完全丰富的断头；组合方式最好能达到无限种，基础模型也是；每个头、每一局看起来都不一样，各具特色、非常独特，而且美丽有吸引力。
- 低级模型/垃圾生成模型也换成更好的模型。
- 地点更多！游戏节奏更慢！

### 第十二轮 · 步骤1：头陷地 BUG 修复
- 根因：cave.js 地面用 CircleGeometry（只有圆心+外圈顶点），外圈抬高后整个地面成了缓坡锥面（离中心越远越高，R 的 80% 处约 20cm），而物理按 y=0。改为分环 RingGeometry（中间严格平坦），导出 `cave.floorAt(x,z)`、`cave.pillars`（墙根石笋/岩石圆柱碰撞）。
- supportH 改为真实形状：每个头预计算约 96 个极值点（脸/耳/角/饰品 + 头部中心 0.16 以内的头发，不含长发尾），按外观签名缓存（HULLC），休眠头懒计算。
- 修复女巫帽 NaN（Math.pow 负数）。测试：_tools/sink.py（随机抛掷 90 次，无 >2cm 穿透）。

### 第十二轮 · 第二步：新增 22 个基础头模（进行中记录）
- 新增 22 个 VRoid 社区 VRM 头模（DN_07273 Hikari Touka Hinata Iris Judy Kohaku LIA Lookmouse MDK2 Mel Neleac Pink1 Pink2 Pink4 RP_C Seph TS_Girl TS_Enemy XiaoYun Zat EE），总计 39 个基础头；头发可跨模混搭 → 组合数 ≈ 39×39×发色×瞳色×肤色×表情×附加发型。作者见 CREDITS.md。
- 管线：`tools/vrm2head.py`（裁头）→ `tools/glbsimp.py`（meshoptimizer 头发减面，需 pip meshoptimizer）→ `tools/glbpack.py`（int16 顶点 / int8 法线 / 稀疏 morph）。稀疏 morph 的值必须保持 float（GLTFLoader 用 setXYZ 会二次归一化 → 巨型面片）。
- 旧 17 个模型也用 glbpack 重新压缩（19.6→12.6 MB）。
- 剔除：Anata（材质合并，眼睛进了皮肤材质）、AvatarSample_F（无眼白）、Goddess（圣诞帽/皮肤坏）、Lily（嘴/脸纹坏）、RP_B（棒球帽焊在头发上）、LB2（低模感）、Nemesia/Olivia（无脖子，断面跑偏）。
- 修复"白眼"：部分 VRoid 导出的眼部三角形绕序反了（MToon _CullMode=0 不进 glTF），单面剔除后眼窝全空、透出后脑头发。眼/眉/睫毛材质一律双面。
- 新增"眼睛透过刘海"：眼部先写本头专属模板值（只在脸前方可见处），本头头发跳过这些像素；LOD 渲染目标也开了模板缓冲。
- 陷地修复（第二轮）：supportH 误用旋转矩阵第二列（=逆旋转），长耳/角/侧躺时插进地里；改为第二行。外壳：脸层网格（兔耳/猫耳/蝴蝶结）不受半径限制；采样 350→1500；方向 96→200；缓存键加网格数+顶点数。陷地测试 32 头 0 穿透。
- 仓库 .git 已移到 /home/user/.cache/headgit（head/.git 是 gitdir 指针文件），工作区快照不再计入 .git；若 .cache 丢失：`git clone --no-checkout <url> /tmp/x && mv /tmp/x/.git /home/user/.cache/headgit` 再写回指针。

## 第十三轮：画质重做（用户：“你优先解决画质问题！”——大师级、惊艳、替换垃圾场景和建筑模型）
- **渲染**：`js/master.js` 新管线（HDR RT → 半分辨率 SAO+双边模糊 → Karis Bloom 6 级 → 径向体积光(篝火) → ACES+调色+颗粒 → FXAA）。档位 ultra/high/mid，`?q=ultra|high|mid` 强制；帧率自适应降档。风格 MOD 开启时仍走旧 `Post`。篝火点光投影（PCFShadowMap 1024），建筑投影，最近 24 个首级投影。
- **资产管线（全部 CC0 Poly Haven，禁止程序化模型/贴图）**：
  - `tools/phpack.py <id> --tris N --tex 512|1024` → `assets/<id>.js`（单缓冲 GLB，meshopt 简化，JPEG 贴图，base64）。
  - `tools/phtex.py tex <id>` → `assets/tex_<id>.js`（diff/nor/arm）；`tools/phtex.py hdri <id> --w 256` → RGBE PNG。
  - `js/assets.js`：`Assets.init()`（启动时先于首级加载）、`clone(名)`、`part(名,节点)`、`names(名)`、`tex(名)`、`img(名)`、`env(renderer)`（PMREM，只挂到外部资产材质，首级不受影响）、`triplanar(set,opt)`（世界空间三平面 PBR，whiteout 法线）。
  - 新增资产要在 index.html 加 `<script src="assets/xxx.js">`（按字母序放在“第十三轮”注释下）。
- **洞窟**（cave.js）：dark_rock 岩壁 / rock_ground 地面（三平面）、rock_face_01 崖面沿墙（`wallR(a)` 与穹顶同噪声求墙半径）、namaqualand 巨石 + rock_moss_set_02 苔石（带碰撞）、stone_fire_pit + 5×5 序列帧火焰精灵（`cave.update(now)`）、出口 large_iron_gate + 两盏 Lantern_01、商摊 WoodenTable_01/treasure_chest/wine_barrel_01/wooden_crate_01/Lantern_01。缺资产时退回旧程序化（仅兜底）。
- **武器**：7 档全换真实模型（baseball_bat / ornate_medieval_mace / machete / ornate_war_hammer / wooden_axe_02 / antique_katana_01+紫辉 / antique_estoc+血辉），自动找长轴与握柄端。绿色球形拳头在真实武器时隐藏（待找手臂模型）。
- **待办**：建筑 builds.js 全部类型换 Poly Haven 模型（分批）；地精商人换真实模型；手臂模型；更多灯光（壁挂提灯/烛台）。

---

## 协同 Agent 记录（新建筑群、高精 3D 家具模型包 & 把玩首级新机制扩展）

### 多 Agent 协同防冲突约定（请所有协同模型遵守）
1. **文件解耦**：本协同 Agent 新增的建筑模型包与玩法全部放在独立模块 `models/props_pack.js`、`js/sanctum.js`、`js/cards.js` 中，只通过 `BuildCat.C`、`Unlocks.R`、`G.HOOK`（`frame` / `e` / `click` / `tip`）挂载，不直接改 `js/builds.js`、`js/cave.js`、`js/game.js`，避免与第十三轮画质重做 Agent 发生合并冲突。
2. **材质与光影兼容**：`PropModels` 生成的网格已开启 `castShadow`/`receiveShadow` 并自动挂载 `Assets.env(G.renderer)`，与 `js/master.js` 渲染管线完全兼容。
3. **每次 push 前先 `git pull --rebase`**：保留所有协同 Agent 的提交，绝不覆盖。

### 协同 Stage 1 已完成（高精度 3D 模型包 + 9 座藏首/展示新建筑）
- **`models/props_pack.js`（约 5.0MB）**：从 Poly Haven 打包 18 个 CC0 扫描 3D 模型（含漫反射 + 法线贴图 WebP 与 meshoptimizer 减面量化）：`GothicCabinet_01`（敞门处理）、`GothicCommode_01`、`Chandelier_01`、`wooden_display_shelves_01`、`marble_bust_01`（颈部截断处理）、`gothic_statue`（颈部截断处理）、`antique_ceramic_vase_01`、`wine_barrel_01`（去盖敞口处理）、`bench_vice_01`、`BarberShopChair_01`、`vintage_grandfather_clock_01`、`cannon_01`、`dartboard`、`chemistry_set`、`round_wooden_table_01`、`large_iron_gate`、`ornate_mirror_01`、`spinning_wheel_01`。
- **`js/sanctum.js`（Stage 1 藏首与陈列建筑群）**：
  1. `gothic_cabinet` **哥特藏首橱**（6 槽位双层敞门哥特木橱）：展厅分 ×1.6，空手按 E 触发「开柜巡礼」令柜内全体首级战栗并按身份多样性爆发魂晶。
  2. `head_chandelier` **枝形首级吊灯**（6 槽位悬吊旋转铁艺吊灯）：自带照明 + 2.8m 光环（×1.35），把玩灯上任一首级会使整座吊灯摇摆并连锁触发全灯位。
  3. `curio_shelf` **百首博古架**（8 槽位四层高容量展示架）：单座可容纳 8 颗首级，空手按 E 触发从下至上的「多米诺魂浪」。
  4. `gothic_commode` **魔镜雕花供案**（4 槽位配鎏金魔镜）：首级直面镜中死颜，周期性或按 E 赋予全员「镜花残响 ×2」。
  5. `bust_pedestal` **无头大理石胸像**（1 槽位颈口无缝嫁接）：把任意女角色首级嫁接到古典大理石胸像肩颈上，按 E 切换 4 种雕塑姿态并触发咏叹。
  6. `headless_statue` **无头圣女石像**（1 槽位等身哥特长袍石像嫁接）：将首级安在修道院无头石像颈口，修女/圣女/公主/骑士身份额外 ×1.5。
  7. `soul_urns` **人头花瓶·魂瓮台**（3 槽位传世古董花瓶插首）：自动酿造「魂露」，按 E 痛饮魂露获大量魂晶并恢复 18% 生命。
  8. `pickle_barrels` **腌渍魂桶阵**（3 槽位敞口橡木桶）：首级在幽绿防腐魂液中上下漂浮，随浸泡时长产出从 ×1.8 升至 ×4.2，按 E 搅桶榨取。
  9. `vault` **万首冰窖**（4 槽位寒冰柱 + 寒铁大门）：补完 `Unlocks.R.vault` 实体建筑，建成后魂库每存 10 颗首级全局产出 +2%（最高 +120%），按 E 打开魂库。


### 第十三轮画质 Agent ↔ 协同 Agent 分工（画质 Agent 追记）
- 画质 Agent 负责：`js/master.js`、`js/assets.js`、`js/builds_ph.js`（旧建筑类型的换装）、`js/cave.js`、`assets/*.js`、`tools/phpack.py`/`phtex.py`，以及 game.js 中渲染/武器相关段落。
- 协同 Agent 负责：`js/sanctum.js`、`models/props_pack.js`、`js/cards.js`（新建筑）。
- 已换装的旧类型：table / chest / candles / rack / brazier / torch / bounty / dresser / nest(改名哥特大床) / throne。**下一批**：showcase、seance、headrack、pole、forge、altar、lava、cage、banner、训练器材；缺骷髅/水晶/蘑菇/毛皮/龙骨等 Poly Haven 没有的模型，需另找来源（禁止程序化）。
- 已知重复：GothicCommode_01 / ornate_mirror_01 / wine_barrel_01 / large_iron_gate 在 `assets/` 与 `props_pack.js` 各有一份（约 2MB），以后可统一到 `Assets`。
- `Assets.fit(名, {w|h|d, x,y,z, ry, rx, rz, node})` 可按目标尺寸摆放任意资产；`Assets.flame(x,y,z,s,col)` 序列帧火焰；`Assets.clone()` 共享几何体已标 `__shared`，移除建筑时不会被 dispose。

---

# 📌 协作总则（总管理师：主 Agent 撰写，所有协作者开工前必读）

> 用户指定：**主 Agent = 总管理师**，负责整体设计、玩法、任务分配与合并把关；协作者负责分配到的专项（当前：**画质 + BUG**）。
> 本文件（HANDOFF.md）**只追加、不覆盖、不删除**。每次开工前从头阅读，尤其是各轮“用户反馈（原话要点，长期有效）”与本节。

## A. 协作者必须遵守的规则
1. **开工前**：完整阅读 HANDOFF.md（所有轮次的用户约束都长期有效，除非用户明确撤销）。
2. **提交**：小步提交、频繁推送。每次 push 前 `git pull --rebase`；**禁止 force-push**，禁止改写/删除别人的提交。
3. **文件归属**（避免冲突）：
   - 总管理师：`js/game.js` 的玩法/战斗/探索部分、新玩法模块（`js/combat.js`、`js/worlds.js` 等）、HANDOFF 的设计章节。
   - 画质协作者：`js/master.js`、`js/assets.js`、`js/builds_ph.js`、`js/cave.js`、`js/heads.js` 的材质/显示部分、`tools/vrm2head.py` 的切颈/封盖/材质部分、`assets/*.js`、`models/props_pack.js`、`js/sanctum.js`。
   - 必须改对方文件时：改动尽量小，commit 信息写清楚原因，并在 HANDOFF 追加一行说明。
4. **硬性约束（用户原话，违者返工）**：
   - **禁止自制/程序化的模型、身体、贴图**（第十一轮）。一律使用网上找到的资产（Poly Haven CC0 优先，其次 CC-BY / VRM 许可；用户允许侵权但仓库尽量用宽松授权）。程序化**布局/生成**（地形摆放、世界生成）可以，程序化**几何造型**不行。
   - **角色身体不许删**（第十四轮新增）：VRM 原模型的身体要保留/找回，以后任何工具都不得再把身体裁掉丢弃。
   - `index.html` 必须能 **file:// 双击运行**：classic script、base64 的 `.js` 资产，不用 CDN、不用 fetch。
   - 工作区（/home/user）**< 128MB**；git 目录放在 `/home/user/.cache/headgit`（.cache 不进快照，会话重置后按下方恢复流程重建）。
   - 所有改动做成**可开关的 MOD**，并处理冲突（第九轮）。
   - 生物/NPC 要可爱，不许恶心；文本不写虐待/求饶/色情内容。
   - 不要把 GitHub token 写进任何仓库文件。不要改仓库可见性（用户自己改私有）。
   - 性能：9999 颗首级不卡（洞内最多 320 个 3D，其余进魂库）；启动不卡。
5. **测试**：`_tools/` 下有 `mk_t.py`（生成少模型的 `_t.html`）、`smoke.py`、`sink.py`（陷地/悬空检测）、`scene.py`（截图）。headless SwiftShader 很慢，截图约 2–4 分钟，`scene.py` 已设 180s 超时，用 `?q=ultra` 防自动降档。
6. **会话重置恢复**（.cache 会被清空）：
   `git clone --depth 8 --no-checkout <url> .cache/hc && mv .cache/hc/.git .cache/headgit && echo "gitdir: /home/user/.cache/headgit" > head/.git && git -C head config core.worktree /home/user/head && git -C head reset && git -C head branch -u origin/main`；
   playwright：`pip install --target .cache/pylib playwright`，`PLAYWRIGHT_BROWSERS_PATH=.cache/pw python3 -m playwright install chromium`，`sudo … install-deps chromium`；meshoptimizer：`pip install --target .cache/pylib2 meshoptimizer numpy`。

## B. 画质协作者 · BUG 清单（第十四轮用户原话整理，按优先级）
| # | 问题（用户原话） | 线索 / 可能位置 |
|---|---|---|
| 1 | **很多模型脖子后面是透明的** | `tools/vrm2head.py` 切颈后颈后皮肤/头发背面被剔除或 alpha；`heads.js` 材质 side/alphaTest/transparent；检查 `__CUT__` 封盖是否覆盖后颈。 |
| 2 | **很多模型眼白是黑色的** | VRM 眼白材质多为 MToon + alpha（BLEND/MASK）；WebP 转换丢 alpha 或 alphaTest 过高、或 eye stencil（第十二轮第二步加的眼/刘海 stencil）顺序错误；逐个模型核对。 |
| 3 | **断口贴图就是一个圆片，位置都不对** | `vrm2head.py` 第 3 步“平面切颈 + 圆形封盖”：封盖圆心/半径用的是估算，颈部截面不是圆 → 应按实际截面轮廓三角化封口，并对齐切面；断口贴图需要真实的断面纹理（找现成的血肉/断面贴图，禁止程序化画）。 |
| 4 | **很多模型皮肤是绿色的？** | 颜色空间/贴图通道：WebP 转换时 RGBA 通道顺序、MToon `_ShadeColor`/shadeMultiply 被当成 base color、或 vertex color 残留；对比原 VRM 截图排查。 |
| 5 | **头都有点轻微的悬空** | `game.js` `supportH` / `hullKey` / `faceLvl`（第十二轮修陷地时加的）可能偏保守；`_tools/sink.py` 目前只测“陷地 >2cm”，请加“悬空 >1cm”判定，39 个模型逐个过。注意新 SAO/阴影让缝隙更明显。 |
| 6 | **地图还是非常劣质，只是换了一个劣质的风格**：地板看起来就像贴图；各种模型棱角分明 | 地面：`Assets.triplanar` 只有 1k 平铺贴图 → 需要：高度/视差（POM）或真实位移几何、细节贴图叠加、宏观变化、贴花（焦痕、水渍、血迹，用现成贴图）、地面散落物。棱角：`tools/phpack.py` 默认 `--tris` 太低（3000）+ 量化法线 → 提高面数、保留原法线/平滑组、岩体用 LOD 而不是一刀切减面。 |
| 7 | **更多小装饰，各种各样，而且节约性能**：感觉小东西装饰非常多 | 用 `InstancedMesh` + 距离剔除散布大量小物：碎石、骨头、树根、苔藓、蜡烛、蛛网、碗罐、木屑、铁链……（Poly Haven：namaqualand_stones_01、rock_moss_set、root_cluster、bark_debris_01、dry_branches_medium_01、moss_01、wooden_bowl、jug_01、brass_pot、wooden_bucket、book_encyclopedia_set_01、wooden_candlestick 等）。每类共享几何+材质，远处隐藏。 |

**验收**：每修一项，用 `scene.py` 截图对比前后；39 个头模用 `_tools/grid.py` 出网格图逐个检查（眼白、皮肤色、后颈、断口）。

## C. 总管理师 · 第十四轮新玩法设计（用户原话 → 设计）
**用户原话要点**：
- 攻击模式改成**手势砍击**：按住左键 = 攻击手势（鼠标轨迹决定挥砍方向：从下往上滑 = 上撩，从上往下 = 下劈，左右同理）；**连点左键 = 刺**；**按住右键 = 防御**，按住右键轻微移动 = 防御对应方向。碰撞体按武器实际形状做。
- 各种**技能，肉鸽式解锁**。
- 探索：**完全程序生成的各种世界**，地名/风格/大小全随机；每个世界有**数个门（数量随机）**通往其他世界，类似《骑马与砍杀》进入地点后的场景；每次出门地图随机，但**分区域**。
- 敌人可以战斗，有**战斗过程**；敌人有 **AI 等级**，**会说话**；动作要**大师级**。
- **把每个角色的身体找回来，以后也记住别删。**

**与现有内容的重复/冲突检查**：
- 与现有**决斗面板**（UI 里 heavy/rapid/spell ↔ dodge/block/attack 意图克制）功能重叠 → 新手势战斗**取代**它；原数值（`q = power/(rec·B.pow)`、伤害公式、BOSS 概率、9 区 BOSS 胜利条件）保留，作为战斗平衡基础。
- 与第十轮 `js/explore.js` / `explore_world.js`（第一人称沿路 + 程序身体）重叠 → 那套用了**程序化几何和程序化身体**，第十一轮已被否决；新世界系统**只复用其“地区主题/节奏”思路，不复用其几何**，全部改用现成资产。
- 与第十一轮约束“不要第一人称 3D 出行世界，出行 = 点 60 次 + 面板”**冲突** → 以本轮新指示为准（用户新想法覆盖旧约束），但旧的“面板出行”保留为 MOD 备选（第九轮：所有改动可开关）。
- 与 `tale.js` 叙事、`RPG.expedition` 事件不冲突 → 用作敌人台词、世界事件、门后奖励的文本来源。
- 与“首级不说话，只有低频回忆气泡”（第八轮）不冲突 → **活着的敌人**会说话，被斩下后的首级仍遵守第八轮规则。
- 外部参考（不是抄袭，是同类机制）：骑马与砍杀（方向攻防）、For Honor（三向架势）、Hellish Quart / Exanima（鼠标控制武器轨迹）、Hades / Slay the Spire（肉鸽选门）。本作特色 = 斩首收藏 + 洞窟陈列闭环。

**落地分步（每步推送）**：
1. **战斗内核 `js/combat.js`（MOD：gesture_combat）**：鼠标轨迹识别（8 方向挥砍 / 连点刺 / 蓄力）、右键方向格挡（4 向）、武器沿轨迹运动、武器碰撞体（沿刃线的胶囊序列）、命中判定/格挡判定/弹刀/硬直/体力、打击感（顿帧、屏震、火花、音效）。先在洞里放训练假人验证。
2. **找回身体**：VRM 原模型重新下载，新工具 `tools/vrm2body.py` 保留完整身体（骨骼+蒙皮+表情），头部与现有首级一致；敌人死亡时斩首 → 头进首级系统、身体倒地。为控制体积：身体贴图 512、网格减面，按需加载。**以后禁止删身体。**
3. **动作**：找现成的 CC0/免费人形动画（Mixamo 类授权受限则找 CC0 替代，如 Quaternius Universal Animation Library CC0），重定向到 VRM 骨骼：待机、走跑、四向挥砍、刺、格挡、受击、硬直、倒地。
4. **敌人 AI `js/foe.js`**：AI 等级（反应时间、格挡正确率、连招长度、佯攻、闪避）、状态机、战斗台词气泡（开战/受伤/格挡成功/求援/濒死挑衅——符合文本约束）。
5. **世界生成 `js/worlds.js`**：区域（9 区对应现有 BOSS）→ 每次出门随机生成世界图；世界 = 地名（音节组合）+ 风格（森林/沼泽/废墟/雪原/城镇/墓地/洞穴…）+ 大小 + 2–5 个门；门通往同区其他世界或下一区；场景用 Poly Haven 资产 + HDRI 天空布置（骑砍式可走动场景）。
6. **肉鸽技能**：每次出门清空的临时技能（战斗中升级三选一）+ 永久解锁（用魂晶在洞里解锁技能树）。
7. 旧面板出行保留为 MOD 备选；与决斗数值对接；平衡与节奏（第十二轮要求“游戏节奏慢一点”）。

### B 补充 · BUG 精确代码位置（总管理师追记，供画质协作者直接定位）
- **#5 首级悬空（“机制在哪里”）**：`js/game.js` → `hullKey(h)`（约 851 行，按模型网格生成凸包缓存键）、`hullOf(h)`（852，取首级凸包顶点）、`supportH(h)`（877，算首级静止时最低支撑点到原点的高度，落地/上桌/上架都用它）、`groundY(p)`（1270，地面高度 = `cave.floorAt` + 建筑表面 `surface`/`cols`）。第十二轮为修“陷地”把支撑点取得偏保守（凸包含头发/饰品外壳），所以现在是**轻微悬空**。修法方向：支撑点只取**皮肤/断口封盖**顶点（排除头发、`_mask`、头饰），并用 `_tools/sink.py` 同时测陷地 >2cm 与悬空 >1cm。注意 `faceLvl`（摆正时的朝向）也参与。
- **#2 眼白发黑**：`js/heads.js` 约 666 行 `getMat()` 里 `EyeWhite` 分支（MeshToonMaterial 重建）、约 696–712 行眼部 stencil `_mask` 网格（`alphaTest: 0.35, colorWrite: false`）、约 67 行 `renderOrder`（EyeWhite=2）。先确认原 VRM 眼白贴图有无 alpha，再看 `tools/glbpack.py` 转 WebP/JPEG 时是否丢了 alpha（JPEG 没有 alpha → 透明区变黑）。
- **#3 断口圆片**：`js/heads.js` 约 92 行“第十一轮：断面按脖子真实轮廓重建”那段 + `tools/vrm2head.py` 的封盖步骤；`uCutY` uniform（约 238 行）控制断面着色高度。
- **#4 皮肤发绿**：`js/heads.js` 约 238–248 行皮肤着色注入 `diffuseColor.rgb *= uSkin`，`uSkin = 目标肤色 / baseSkin('#fbe6da')`（约 458–466 行）；若某模型原贴图本身偏色或 `randomLook` 给了异常肤色值，除法会放大偏色。逐模型打印 `U.skin`。

### C 补充 · 第十四轮用户决策（ask_user 结果，长期有效）
- **视角**：第一人称 / 第三人称越肩 **可切换（V 键，手持首级时 V 仍是换表情）**，默认第三人称（需要身体系统完成后开放）。
- **挥砍手感**：**武器实时跟随鼠标**（Exanima / Hellish Quart 式），砍到哪算哪，伤害取决于刃尖真实速度。
- **洞内键位冲突**：**按键拔刀切换**——F 拔刀/收刀；拔刀时左右键 = 战斗，收刀时 = 原操作（把玩/投掷）。首级查看改为 **I** 键。
- **旧“点 60 次 + 面板”出行**：保留为**可选 MOD**，默认用新随机世界探索。

### 第十四轮进度 · 第 1 步完成：战斗内核 `js/combat.js`（MOD `gesture_combat`，默认开）
- 接入点（game.js 仅加了单行拦截）：mousemove（`Combat.onMove` 返回镜头转动系数：挥砍 0.12、格挡 0.3）、mousedown/mouseup（`onDown/onUp`，拔刀时吞掉原操作）、F/I 键、旧挥棒动画在拔刀时跳过、新增 `HOOK.pre`（相机就位后、渲染前：屏震/以后第三人称相机）。`G` 新暴露 `vm`、`weapon`、`fist`、`held`。
- 手：解析解临界阻尼弹簧跟随目标（任意帧率稳定；显式欧拉在低帧率会发散，已踩坑）；刚度 ∝ 1/√武器重量；体力耗尽时减半。刃：从右肩 PIVOT 向外辐射 + 被手速拖拽（重量感），刃口朝运动方向。
- 刺：左键按下 <190ms 且拖动小 → 刺；连点排队连刺（最多 2 个）。格挡：右键按住，轻移鼠标选 上/下/左/右 四向姿态（HUD 显示）。
- 命中：刃上 5 点逐帧扫掠（线段-球），`Combat.addProvider(center => [{id, pos, r, kind, onHit(info)}])`；`info = {point, vel, speed, kind:'slash'|'thrust', dir}`。命中 → 顿帧 30–90ms + 屏震 + 目标回调。内置目标：地上散落的首级（被砍飞，挂载/手持的不动——第七轮规则）。
- 测试：`/tmp` 下的确定性脚本直接循环 `Combat.update(1/60)`（headless 帧率太低，不能靠 setInterval 模拟手势）。实测横扫刃尖 10.6 m/s，刺 8.5 m/s 命中，下劈命中。
- **下一步（第 2 步）**：找回 VRM 身体（`tools/vrm2body.py`，身体+骨骼+蒙皮保留，禁止再删）→ 训练假人/敌人用真身体；然后第 3 步动画重定向、第 4 步敌人 AI（格挡判定要接 `Combat.guardDir` 与敌人刃线的碰撞 = 弹刀）。
