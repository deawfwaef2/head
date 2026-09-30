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

### 第十四轮进度 · 第 5 步（提前做）：出猎世界 = 地点图（js/worlds.js）
- **结构**：每趟出猎 `Worlds.genGraph(loc, seed, trip)` 生成 6~16 个节点（地点），Prim 最小生成树保连通 + 近邻随机加边（有环/岔路，每点 1~5 扇门）。入口（最左）有“回魂首窟”的门；BFS 最深处 = 大场景 + 地区霸主（未击败时）。节点：随机名字（风格词库 前缀+后缀）、风格（REGION 风格池）、大小 小 60% / 中 30% / 广阔 10%（半径 13~18 / 22~28 / 34~42 m）。
- **9 种风格**（STYLES）：草甸/深林/荒原/废墟/沼泽/要塞/王城/深渊/雪峰；每种 = Poly Haven 天空 HDRI（背景 + PMREM 环境光 + 太阳方向 + 雾色取地平线）+ 三平面 PBR 地面 + 散布表（树/石/植物/草/墙/道具，InstancedMesh）+ 两圈边界（近圈贴可走边界，远圈山坡背景不投影）+ 地标（篝火/石阵/雕像/木桶/倒木/图腾）。地形：内部轻微起伏，边界外起山坡包围（程序化布局，资产全是网上的）。叶片/草有顶点风摆。
- **资产**：全部在 `big/world/`（~55MB，不在沙箱快照里，见 big/README.txt、tools/big.sh）。树：Poly Haven 树是影视级（100 万~1700 万面），`tools/foliage.py` 用标准植被 LOD（叶卡按连通块稀疏化 + 放大保覆盖，alpha MASK）变成 2~2.7 万面；边界圈用 `_lo` 版（7 千面）。冷杉/松树针叶太碎，稀疏化后像枯树 → 不用；深林用阔叶树 + 天空 HDRI 的松林背景。
- **玩法**：地点里自由走（WASD/Shift/空格/C），门口 E 穿门（淡出→懒加载→建场景→从对应门进入），M 地图（到过的显示名字/风格色，相邻未去的显示“？”，👑 霸主），宝箱 E 开（魂晶 = 原旅途节拍魂晶总和分摊 + 25% 药水）。
- **猎物**：`RPG.expedition` 预掷的首级按稀有度分给按深度排序的节点（越深越稀有）；`trip.res.heads` 清空，要亲手追上。**暂时用“魂光”表现**（第 4 步换真实身体+动作）：看见你（距离+视线遮挡+下蹲减半）会说话、逃跑、被逼到边界反扑；勇敢的会迎战。用手势战斗命中（Combat.addProvider）。
- **霸主**：实时战斗——绕圈、蓄力（变红）后冲刺；格挡（右键，面向她）减伤 70% 并使她失衡 1.2s（此时伤害 ×1.6）；伤害用原决斗公式（qa=q^0.7；你受 maxHp·0.1/qa）。台词用 Explore.BOSSES 的 say/taunt/hurt/lose；击败 → RPG.bossHead、S.bosses、胜利检查沿用。
- **接入**：game.js 主循环 `Worlds.active` 时整帧交给 `Worlds.frame`；按键在世界里先给 `Worlds.onKey`（Tab/Esc 放行）；鼠标左键在世界里第一次点击 = 拔刀。combat.js 新增 `Combat.attach(scene)`（刃光挂到当前场景），洞里首级目标在世界里屏蔽。ui.js `startTrip` 优先走 Worlds；MOD `worldgraph`（默认开，关掉 = 旧的点击 60 次面板）。
- **测试**：`_w.html`（gitignore）= 不带洞窟的世界查看器（`?k=地区&style=风格&n=节点&q=mid`），`_tools/wshot.py` 截图。完整游戏 + 世界在 2GB 沙箱 swiftshader 下会 OOM，只能分开测。
- **已知/待办**：第 4 步真实敌人身体（身体 VRM 源路径 CREDITS 里只记了作者，需要重新检索）；门目前是独立铁门/城门 + 灯笼；三人称等身体到位后做。

### 第十四轮进度 · 第 5 步验证（总管理师）
- 已推送 2d49338（worlds.js + big/world 资产）、a27c5fc（CREDITS）。
- **流程测试通过**（`_tools/wflow.py`，页面 `_t2.html?wlite=1`＝去掉洞窟家具资产 + 不散布植被，否则 2GB 沙箱 swiftshader 爆内存；这是测试环境限制，不是泄漏：textures/geometries/programs 数量稳定）：出猎 → 进入世界 → 走到回魂首窟门 → E → 回到洞窟，trips+1，相机/远裁面复原，无报错。
- **逻辑测试通过**（`_tools/wlogic.py`，查看器 `_w.html` 里桩了 Explore/RPG）：霸主发现玩家并出手（8 秒 100→82 血），6 次重砍（speed 10）击杀，首级进背包，`S.bosses` 记下；猎物看见玩家后反向逃跑，一击捕获。
- `?wlite=1`：worlds 调试开关，不散布植被/远环（仅测试用）。`Worlds._debug.targets(center)` 可直接拿到战斗目标。
- 画面：草甸（meadow）草仍偏稀——草丛模型面数高（grass_medium_01），加密要么做草卡片要么 LOD，**交给画面协作者**；王城（capital）夜景已看过，OK。沼泽/荒野/要塞/山巅风格尚未截图。
- 平衡待真人手感：霸主 6 刀偏快，等第 4 步 foe.js 身体+动作做完一起调。

---
## 第十四轮 14b 进度 · 巨大世界 + 原 VRM 身体 + 真人敌人（总管理师）

**巨大持久世界（f25ab3b）**：开局一次性 `Worlds.genWorld(seed)` 生成 ~270 节点的连通大地图，存档 `G.S.world = {seed, vis[], known[], stone}`；不再选地点、不再每趟随机关卡图。节点之间靠门连接，M 看地图（只显示走过/看见的）。

**身体（用户硬性要求：必须是角色自己的原 VRM 身体和衣服，禁止程序化身体）**
- `tools/vrm2body.py src.vrm File "名" "credit"` → `big/body/<File>.js`（`window.BODY_MODELS[File]={meta,glb}`）：原骨骼+蒙皮+原衣服，只去掉原头，脖子切口封一个 `__CUT__` 圆片。
- 18 具：AvatarSample_A, Jean, Noelle, Amber, Rosaria, Lisa, Sucrose, Xiangling, Ningguang, Furina, Kokomi, YaeMiko, Shenhe, Mona, Eula, Beidou, HikariCape, HikariScholar。
- **原神（MMD 转）身体皮肤和衣服是同一张贴图，不能染色** → 深色/异色皮肤的头只配可染色身体（HikariCape/HikariScholar/AvatarSample_A），否则头的肤色被改成浅色跟身体一致（`foe.js bodyFor`）。
- 身份 → 身体表：`Foe.IDENT`；霸主按地域：`BOSS_BODY`。AvatarSample_A 是现代服装，不进池。
- 按需加载（file:// 下插 script），同地点最多 ~3 种身体，模板缓存上限 5 个（LRU 释放）。

**动作**：Quaternius Universal Animation Library（CC0）UAL1+UAL2 → `tools/anim_bake.py` → `big/anim/ual.js`（51 段，世界空间旋转增量，重定向到任意 VRM 骨骼，见 `Foe.clipsFor`）。

**真人敌人（js/foe.js，MOD `foe_bodies` 默认开，关掉退回光团猎物）**
- AI：idle（干活动作）→ 看见你说话 → 勇敢的追击/其余逃跑（逃到边界贴边滑，被逼近会反击）→ 攻击（剑 A/B/C/重连击；空手拳）命中帧判定 → 格挡（Sword_Block）→ 受击硬直 → 死亡。
- 持武器身份（knight/guard/merc/…）右手握 Poly Haven 武器（katana/estoc/machete/mace/hammer/axe）。
- 伤害判定按骨段：头 ×1.6、脖子 ×1.8、四肢 ×0.7；**脖子横砍（速度>6，对方 HP<40% 或致命）= 斩首**；刺击不斩首。
- **只有砍下来的头能带回家**：头变成物理拾取物（弹跳滚动），走近按 E 拾取；霸主也必须砍头才算胜利（`bossWin(h, Bo)`）。
- **布娃娃**：Verlet 粒子（躯干全连接刚性 + 四肢链 + 防对折最小距离）驱动真骨骼；死亡时从当前动作姿势开始。
- **尸体可继续砍**：脖子→斩首；四肢（速度>6.5）→断肢（按当前姿势把该骨段子树的三角形拍成静态网格飞出）；腰（速度>9）→腰斩，头若还在跟上半身走，仍可砍下。
- worlds.js 通过 `foeCtx(B,node)` 提供接口（sees/say/hitPlayer/power/bossMeet/bossHp/onDeath…）。

**给协作者（画面/bug）**：
1. 断肢切面是空心的（没有封口），可以加红色切面盖片。
2. 血滴是简单 Sprite，可以换成更好的血雾/地面血迹贴花。
3. 死亡首级的切口盘偏大的问题（衣领把 cut 半径撑大）见 C补充。
4. 头目前没有眨眼。
5. 无头浏览器里整个游戏切换节点会 OOM（2GB 沙箱），测试敌人用 `_f.html`（gitignored）+ `_tools/fshot.py`。

## 2026-09-29 · 第十五轮：首级/洞窟/卡顿 BUG 修复（追加）
- **本轮基线**：工作树从 `9704e7c52f907901232031cb56ff1d3f0aa1ad4d` 开始；只在下列项目文件上实施本轮改动，未触碰既有未跟踪 `js/cardgame.js`、`js/cards.js`、`js/contraptions.js`。
- **MOD 与旧存档**：`js/mods.js` 新增默认开启的 `steady_save`、`ground_contact`、`head_repair`、`smooth_faces`、`cave_detail`，设置迁移到 `__v=4`；MOD UI 加 `asset` 分类。各项通过 `Mods.on(id)` 控制，关闭 `head_repair` 时保留旧切面/材质路径。
- **头部外观**：`js/heads.js` 在 `head_repair` 下以模型元数据 `bottom` 对齐切颈平面，从现有皮肤网格截面顶点求凸轮廓并三角化封盖，失败时回退旧封口；切面优先使用 TextureCan A5 Wagyu 的 CC0 512px PBR（WebP 色彩/OpenGL 法线/粗糙度），`index.html` 已引入 `assets/tex_cut_wagyu.js`，来源与许可已追加到 `CREDITS.md`。对强绿偏皮肤贴图做受控去色后再乘目标肤色；眼白走较亮的 MeshBasic 路径；皮肤接缝法线平滑在模板解析期原位处理一次，避免每个皮肤几何体多复制一份。所有视觉改动均有 MOD 开关。
- **洞窟装饰**：`js/cave.js` 在 `cave_detail` 下用现有 CC0 模型散布酒杯、烛台、灯笼、箱子、酒桶、花瓶；第 1 层约 64 件，每个模型的子网格合并为 InstancedMesh 批次（完整资产场景 23 批、6 种资产），不投实时阴影、无碰撞、禁用射线。Three r147 的 `InstancedMesh` 没有 `computeBoundingSphere()`，所以使用 `frustumCulled=false`；洞窟重建时发出 InstancedMesh dispose 事件回收实例缓冲。`cave_detail` 同时将三平面地面贴图尺度调为 0.18，降低重复感。
- **性能**：`ground_contact` 将首级支撑采样限制为皮肤/断面并缩小安全余量；`steady_save` 从每 8 秒同步存档改为每 20 秒安排空闲存档（页面隐藏/离开仍保存）；LOD 替身失效重拍预算降至每帧 1 个。
- **验证**：`node --check`（全部改动 JS）、`git diff --check` 通过；39 个头模解析/切面元数据检查通过，无缺少切口、无浏览器控制台错误；5 模型头部页（眼睛睁开）在 HTTP 与 `file://` 下均通过，CC0 WebP 切面加载成功，`head_repair/smooth_faces` 关闭路径也通过；洞窟完整六类资产测试通过，构建→渲染→dispose→重建无错误（23 个实例批次）；缩减为 5 个头模的整合游戏页到达开始菜单、R=7 洞窟成功构建且无控制台错误。当前项目工作树约 78 MB（低于 128 MB）。
- **限制/待验证**：完整游戏（39 个头模 + 全场景资源）在本沙箱的 headless Chromium 约 56 秒后崩溃，符合第十四轮记录的 2GB/SwiftShader OOM 限制；这不等同于真实浏览器故障。尚未完成完整 39 模型游戏的互动/长时间性能回归，也未测量自动存档前后帧时间；需在普通 Chrome/Edge 与目标设备验证首级支撑、深层洞窟密度和卡顿。
- **保存/同步状态**：实现已本地提交 `e6ccd9a`（`fix: repair head cuts and reduce cave stalls`）；尝试推送 `origin/main` 时环境无可交互 GitHub 凭据，未能推送。下一位如有认证环境可推送本地提交。提交后仍保留的 3 个未跟踪 JS 文件是既有用户文件，未暂存/未修改。

## 2026-09-29 · 发布恢复说明（追加）
- 上一轮的 Git 元数据在 `/home/user/.cache/headgit`；该目录不进入跨轮工作区快照，因此当前轮重新从 GitHub 获取 `origin/main`（基线 `24730db`），并用三方补丁重放第十五轮修复，保留了第十四轮身体/敌人上游更改。旧记录中的 `e6ccd9a` 是上一轮的本地提交号，不应视为远端已包含。

## 2026-09-29 · 重建提交状态（追加）
- 第十五轮修复已以最新 `origin/main`（`24730db`）为父提交，重建为 `fa30a765cab3`（`fix: repair head cuts and reduce cave stalls`）；保留了第十四轮真人敌人/身体/世界代码，仅提交 9 个修复/来源记录文件。
- 此重建提交目前尚未推送：本执行环境没有可用的 `GITHUB_TOKEN`，也没有登录的 `gh` CLI。取得认证后应将其快进推送到 `origin/main`；不要强推。

## 2026-09-29 · GitHub 推送完成（追加）
- 第十五轮修复已基于  用补丁重新应用，并快进推送至 ；本次实际代码提交为 ，前置状态记录提交为 。旧的  /  是此前临时 Git 元数据中的提交号；当前远端以本段所记的新哈希为准。
- 推送后复核  与本地  完全一致；认证仅通过运行时环境变量传递，未写入仓库或补丁。由于 PAT 曾以聊天文本传入，请撤销并轮换该 PAT。

## 2026-09-29 · 推送哈希勘误（追加）
- 上一条“GitHub 推送完成”记录中的反引号被 shell 当成命令替换，造成哈希字段空缺；本勘误只追加、不覆盖，前面的源码提交与推送均已成功。
- 实际远端提交链为：基线 `24730db949372f6a85b0572c872c1e794803ad98` → 修复 `c25dfc0fb45d5527e6508393794b6d817283dd02` → 推送状态记录 `d230ae89946b6b72e2d4cb550a80c0d5d9458a66` → 推送结果记录 `093cfe2029bf5c66797212402356ec01ab4b91b5`。第一次快进推送后已用 `git ls-remote` 验证远端与本地一致；随后追加了推送记录。
- 此后这条勘误也会作为单独的文档提交推送到 `origin/main`。PAT 未写入文件；请按上一条提醒撤销并轮换聊天中提交的 PAT。

## 2026-09-29 · 最终推送状态（追加）
- 上一段提到的哈希勘误提交 `43afb968bbd31bbd6491dec0445db7c8452b44a5` 已成功快进推送至 `origin/main`；远端现已包含修复提交 `c25dfc0fb45d5527e6508393794b6d817283dd02`、状态记录与勘误记录。全程未强推。
- 本地可见工作区已从远端同步所有受版本控制文件，`big/` 大型资产目录未物化以遵守 128 MB 限制（远端仍保留）；既有未跟踪 `js/cardgame.js`、`js/cards.js`、`js/contraptions.js` 均保留。
- 这条追加记录会随本提交推送；聊天中提供的 PAT 未落盘，请撤销并轮换。
---
## 第十四轮 14c（用户反馈：砍不了头 / 头身颜色不一致 / 没法切割 / 改回每次选地区随机关卡）

**地图改回**：每次出门在面板上选地区 → `Worlds.genTrip(loc, seed)` 随机生成这个地区这一趟的地点图（8~20 个地点，入口=回洞门，最深处=霸主）。敌人进门时懒生成（RPG.foe），真人身体不变。
旧的“一整片大陆”保留为 MOD `bigworld`（默认关）。

**砍不了头的原因与修复**
1. 以前每个敌人只有一个 0.75m 的大球，刃一进球就算命中并进入 0.3s 冷却——真正砍到脖子那一下被冷却吞掉；命中点也只是刃上的一个点，几乎总被判成胸/手臂。
   → `combat.js` 把整段刃的扫掠面（上一帧刃线→这一帧刃线）放进 `info.seg`；`foe.js contact()` 用扫掠面对每段骨头胶囊求最近距离，真正碰到才算（没碰到返回 false，combat 不进冷却）。刃扫过脖子半径内优先判脖子。
2. 敌人以前停在 1.9m 外出刀，玩家刀尖只够 ~1.4m → 改成 1.35m（空手 1.05m）。
3. 规则：脖子横砍 速度>4.5 且这一刀后剩 ≤50% 血（霸主 ≤25%）= 斩首；尸体脖子 >3 就能砍下；致命一刀砍在四肢 >5 顺势断肢、砍在腰 >9 腰斩；尸体四肢 >4 断肢、躯干 >6.5 腰斩。掉在地上的头也能被砍飞。

**头身颜色不一致的原因与修复**
- `heads.js` 的卡通材质有“柔性光照压缩”（按漫反射亮度归一），而身体是 MeshStandard 没有 → 同样肤色，头渲染出来只有身体 ~60% 亮度。
  → 身体材质在 `foe.js template()` 里改成同一条 toon 渐变的 MeshToonMaterial（画风也更统一）。
- 原神身体的肤色从贴图脖子一圈采样（`sampleSkin`），头用这个肤色；再用 `_tools/calib.py`（gitignored）在同一光照下把脸颊渲染色对齐到脖子/上胸渲染色，得到每具身体的 `SKIN_FIX`，只校亮度 + 25% 色相，存进 `look.skinMul`。
- **heads.js 小改（协作者请知悉）**：`makeUniforms` 的 skin 乘上 `look.skinMul`（没有这个字段时为 1，不影响旧首级）。

---
## 第十六轮（总管理师）：战斗感 / 成就感 / 身高 / 斩首卡顿
用户要求：更好玩、更有战斗感和成就感；玩家眼高与女性角色一致；“到头”与斩首时严重卡顿。
- **身高**：worlds.js `EYE = 1.45`（原 1.95），蹲下 -0.55；洞窟 game.js 同步 1.45。**以后不要再改回食人魔身高。**
- **斩首卡顿根因**：旧代码斩首时 `ModelHeads.create` 新建一颗死头 → 新材质/新着色器编译，斩首后首帧 113ms（软件渲染测得）。
  现在 `Foe.decapitate` **直接把活人脖子上的头摘下来**（g.attach(holder)，改 U.pale/blood/spat、隐藏眼睛高光、换死气表情、显示断面），零新建 → 首帧 8ms、新程序 0。
- **预编译** `prewarm(ctx)`（populate 末尾）：断肢碎块的静态 toon 材质、血粒子、血迹、断面（含阴影深度程序）先 compile+render 一次。**不要 dispose 这些预热材质**（会释放程序）。ctx 需要 `renderer`、`camera`。
- **断肢**：三角形筛选结果缓存在 `geo.userData.sev[zone|nBones]`，populate 后 requestIdleCallback 预热各部位 → 断肢 28ms→6–8ms。
- 血粒子对象池（≤300）+ 地面不规则暗红血迹（循环 80 块）；布娃娃骨骼名字表缓存。
- **战斗感**：受击闪红（emissive）+击退；击杀/斩首慢动作（只作用于敌人/尸体/头/血，玩家不减速，`Foe.slowmo(t,k)`）；断颈喷血 1.8s；敌人出刀前头顶红色“!”预警；
  **完美格挡**（右键在挨刀前 0.3s 内按下，combat.js `S.guardT`）→ `Foe.parried(fo)`：敌人硬直 1.6s、破绽期间伤害×2、**砍脖子直接处决（不看血量）**；发现玩家时惊动 13m 内同伴；活人会眨眼。
- **成就感**（worlds.js `foeEvent`）：连击计数（2.5s 内续上，右侧大字），双杀/三杀；魂晶奖励：击杀 6 / 斩首 10 / 活斩 16 / 处决 30 / 一刀斩首 40 / 断肢 3 / 腰斩 8 / 完美格挡 4（×稀有度、霸主×4、连击加成），飘金字；
  永久成就 `G.S.ach {got, n}`（ACH 表 17 项，金色横幅）；HUD 实时战绩；出猎结束写入日志+toast。
- 测试：`_tools/fperf.py`（卡顿计时）、`_tools/fparry.py`（格挡→处决）、`_tools/fcut.py`（切割回归）均通过。

---
## 第十七轮（总管理师）：方向战斗 / 技能 / 洞窟倒袋卡顿
用户：洞穴倒头也卡；敌人攻击要各个方向、可预判；格挡不要只有 4 向，要按敌人来刀角度；战斗慢一点；强化格斗感、技能。（断口由协作者负责，我不动）
- **洞窟倒袋卡顿根因**：新脸模首次渲染要编译 ~11 个着色器（morph 数/双面/alphaTest 不同 → 程序键不同），单帧 ~370ms（_tools/fheads2.py 测）。
  修：game.js `prebuildHeads(recs)` 在 `createReturnBag`（回洞转场时）预先 `ModelHeads.create` + `renderer.compile` + `render` 一次，存 `PREHB`；`createHead` 优先取用。`prepLook(rec)` 抽出（hw/mk 预处理）。
  heads.js 仅新增导出 `mapsFor(look)`（只读，便于以后预上传贴图），未改材质代码。
- **敌人攻击**（foe.js `ATK` 表）：每个动作用 `_tools/fclip.py` 实测“右手蓄力位→命中位”位移，得到命中时刻与来刀屏幕角（0=右 90=上 ±180=左 -90=下）。
  节奏：起手先**定格蓄力** 0.2–0.34s → 慢起手（timeScale 0.34–0.55）→ 最后 0.06s 全速出手；连招后续刀 ×1.7。重击（橙色）= Sword_Attack 过顶、Heavy_Combo 末刀；拳 = 刺。
  聪明的敌人 14% 佯攻；Sword_Dash 冲刺斩（2.4–4.6m）；等待出手时绕玩家游走/保持距离；冷却 1.7s+（霸主 1.0s+）。
  `Foe.threats()` → Combat 指示层：红弧=来刀方向、收缩圈到内圈=命中时刻、视野外=屏幕边箭头。
- **玩家格挡**（combat.js）：连续角度 `S.gAng`（右键按住移动鼠标旋转，不再重置），手/刀姿态随角度连续变化。worlds.js hitPlayer：
  夹角 <40° 挡住（-90%，体力 -14，敌人小硬直）、<72° 偏了（-50%）、否则全伤；**完美格挡** = 对准且（刚按下 <0.3s 或 最后 0.25s 内才转对方向），重击也能弹；重击普通格挡挡不住。刺：任意角度格挡 -65%。
- **敌人方向格挡**：蓝弧精灵 = 她挡住的一侧，跟随玩家手的位置（反应周期 0.25–0.5s，误差随 iq）；同侧砍 = 弹刀（`Combat.recoil`）并被快速反击；异侧砍 = 破绽伤害 ×1.35；蓄力重斩 = 破防（硬直 1.4s + 破绽）。
- **技能**：按住左键不动 0.7s 蓄力（金色刃光、×2.2、破防）；Q 闪身（体力 22，0.38s 无敌，<0.22s 内躲开 = 完美闪避→敌人破绽）；E 处决（破绽中的敌人，优先于拾取）；R 战吼（放倒 10 人解锁，7m 震慑）；G 旋风斩（放倒 25 人或斩霸主解锁，2.7m 一圈）。技能栏在拔刀时显示。
- 节奏：玩家挥刀弹簧 ω 26→22、刺 0.24→0.28s。新成就：弹刀/碎盾/残影；奖励：破防 5、完美闪避 6、绕开格挡 2。
- 测试：`_tools/fatk.py`（攻击节奏/方向）、`_tools/fskill.py`（格挡 AI/弹刀/破防/处决/旋风/战吼）、`_o.html`+`_tools/fov.py`（指示层截图）、fcut/fparry/fperf 回归通过。

---
## 第十五轮（协作 Agent · 恶趣味陈列馆）：更多「放置首级」的恶趣味建筑（追加）
**用户原话要点**：更多有创意、不重复的恶趣味放置头颅建筑；分析观众喜欢什么，让人爽。（用户再次要求 18G——维持第三轮决定：黑暗奇幻、不做过度猎奇/血腥升级、无色情；文本无虐待/求饶。）

**观众爽点分析 → 设计原则**
1. 反差幽默：首级出现在最日常的生活场景（茶会、摇椅、沙发看电视、菜园），而不是再做一个刑架/尖桩。
2. 策展/收集：摆放组合有最优解（肖像廊打分、猎首台地区谱系）。
3. 等待→爆发：越攒越爽（摇椅安睡值、电视追剧值、菜园成熟）。
4. 抽卡悬念：鉴定台品相只升不降 + 10 次保底。
5. 可见的成长：画框随魂阶自动升格、猎人称号晋升、花一圈圈长出来。
6. 节奏反馈：逐个啜茶 / 逐个开花 / 逐个颤抖的连锁时序 + 音效 + 浮字。

**与已有建筑查重**：避开 builds.js 全部 + sanctum.js 第一批（橱/吊灯/博古架/魔镜/胸像/石像/花瓶/腌桶/冰窖），也避开 sanctum.js 头部注释里预告但尚未推送的第二批（虎钳/理发椅/落地钟/加农炮/飞镖靶/蒸馏台/八音盒）——那些名字留给原协作者。

**新文件 `js/oddities.js`（MOD `oddities`，玩法类，默认开；index.html 在 sanctum.js 之后加载）**，只通过 BuildCat.C / Unlocks.R / G.HOOK(frame/e/tip/click) 挂载：
| key | 名称 | 模型 | 插槽 | [E] 机制 |
|---|---|---|---|---|
| tea_party | 亡者茶会 | round_wooden_table_02 + 4×dining_chair_02 + tea_set_01 | 4（椅面，朝桌心） | 斟茶：逐个低头啜饮；种族越杂 ×(1+0.3·(种族数-1))；最高魂阶=主宾 ×1.5；冷却结束 8 秒内再斟=续杯连击（最多 5 连 ×2）；茶壶倾倒动画 |
| portrait_gallery | 名媛肖像廊 | chinese_console_table + 5 种画框 | 3 | 画框按魂阶自动换：凡=hanging_02 … 神=fancy_02（异色+1 档），画布染暗红；鉴赏会：魂阶/多样/左右对称/C 位压轴/满廊/异色/珍品品相打分 0–100（S–D），斯尼克点评，刷新最高分 ×2（S.odd.galBest） |
| rocker | 奶奶的摇椅 | Rockingchair_01 + throw_pillows_01 + vintage_oil_lamp | 1（靠垫，随椅子摇） | 安睡值 150 秒满，自动产出额外补发到 ×5；推一把 ×(2+安睡×10) 并清零；左键戳 = 吵醒 -30% |
| trophy_lodge | 猎首纪念台 | ClassicConsole_01 + bull/lion/horse_head 铜像 | 4 | 炫耀战绩：不同地区每区 +35%、同地区 ≥3 ×2.5、霸主首级 ×3；累计猎名（S.odd.fame）晋升 5 级称号，每级本台自动产出 +15% |
| appraisal | 首级鉴定台（max 2） | round_wooden_table_02 + vintage_microscope + magnifying_glass_01 | 1 | 花魂晶鉴定品相（rec.appr = {n,m,why}，永久乘到 h.yield，每秒复查，rebuildHead 后也补回）：寻常 1.0/良 1.15/上 1.35/珍 1.7/绝 2.2/传说 3.0；只升不降；S.odd.pity 10 次保底珍品+；费用随 yield 与 rec.apprN 上涨 |
| tv_couch | 亡者沙发影院 | Sofa_01 + wooden_crate_01 + Television_01 + CanvasTexture 屏幕 | 3 | 换台：恐怖片（抖）×2.5 / 喜剧（弹跳连锁）×1.8 / 本台新闻（滚动字幕播你的战绩，按洞中首级数加成）/ 雪花 / 午夜频道 ×8（约 9% 或每 12 次）；追剧值（最多 120 秒）使自动产出额外 +binge/60，换台减半 |
| head_garden | 首级菜园 | planter_box_01 + flower_ursinia + garden_gnome + watering_can_metal_01 | 3（埋到下巴） | 浇水：土半干时浇 +1 阶（共 3 阶，花长大），土湿时浇=涝了（断完美连击）；满阶收获 ×(4+完美连击×1.5)；60 秒干透会掉阶；水壶飞过去倾倒动画 |

- 解锁（Unlocks.R）：rocker 2 首+出猎 1 次；head_garden 出猎 2；tea_party 4 首；portrait_gallery 有灵魂+且 5 首；tv_couch 第 2 层+6 首；trophy_lodge 第 2 层+出猎 4+首级来自 ≥2 地区；appraisal 第 2 层+8 首+累计 2500 魂晶。
- 插槽高度在第一次 make() 时用射线打到真实座面/台面自动校准（`topAt`），换模型不用手调。
- 新存档字段：`S.odd = {galBest, fame, appr, pity, garden, tv}`；`rec.appr`、`rec.apprN`。建筑的临时状态（安睡/追剧/菜园阶段）挂在 build 对象上，不存档。
- 调试：`Oddities._dbg.{teaPour, galCritic, boast, appraise, tvSwitch, garden, gState}(b)`。
- 资产：24 个 `assets/*.js`（约 6.5MB，列在 index.html「第十五轮」注释下），来源写入 CREDITS.md。
- 测试（headless，_t.html?q=mid）：7 座全部建成、挂首、每个 [E] 机制执行无报错；截图检查了茶会/肖像廊/摇椅/鉴定台/电视朝向/菜园。坑：hanging_picture_frame_01/02 原模型正面朝 -z，需 ry=π；Television_01 正面朝 -z（朝向沙发不用转）。
- **环境坑**：/tmp 是内存 tmpfs（2GB 机器），把 300MB 仓库放 /tmp 会让 Chromium OOM 崩溃。仓库放 `/var/work/head`（根盘，不在工作区快照内）。

---
## 第十九轮 · 协同 Agent「UI 大师化」（UI Agent 追加；只追加，未改动任何旧段落）

### 用户本轮反馈（原话要点，长期有效）
- 头部模型只是**游戏里的虚构 3D 模型**，不是真人；用户本意是积极向上；剧情文本被别的模型污染成现在这样——**文本/剧情先不动**，用户自己之后会改成安全健康版本。新写内容沿用文件里原有的暗黑奇幻风格（方便用户一眼分辨哪些是新加的）。
- 用户是「多 Agent 并行」跑这个项目：**必须在 HANDOFF 里写清楚自己改了哪些文件/哪些地方，避免互相乱改**。
- 本 Agent 的任务：**把所有 UI 重置为大师级 / 3A 大作观感**（现有 UI = 小作坊游戏感），反馈感（音效、动效、粒子、震动、数字滚动、受击/低血量反馈）都要更爽。
- 仍然有效：每次编程前先读本文件；只追加；频繁 commit+push；根目录 `index.html` 任何时刻双击可玩；工作区 < 128MB；把 UI 做成可开关 MOD。
- 环境提醒：用户把 GitHub PAT 以聊天文本给出。**不要写入仓库文件**；建议用户用完后撤销/轮换。工作区本地不物化 `big/`（sparse-checkout 排除，远端保留；游戏运行时 `big/body`、`big/world`、`big/anim` 是懒加载）。恢复流程见第十三轮协作总则 A.6，另需 `git sparse-checkout` 排除 `/big/`。

### UI Agent 的文件归属（其他 Agent 请勿大改这些文件里的**样式**；玩法/逻辑照旧归原 owner）
| 文件 | 归属 | 说明 |
|---|---|---|
| `css/ui3a.css` | **UI Agent 独占** | 全部 3A 皮肤（覆盖层）。以 `body.ui3a` 为前缀 → 关闭 MOD `ui3a` 即回到旧样式。 |
| `js/ui3a.js` | **UI Agent 独占** | 纯增强层：点击/悬停反馈音、粒子画布、HUD 血条残影/魂晶增量、受击&低血量反馈、菜单余烬、聚光灯卡片、提示键帽化。**只读** DOM/`G`/`SFX`，不修改玩法状态。 |
| `js/mods.js` | 仅追加 1 条 `ui3a` MOD + `CATN.ui` | 默认开启。 |
| `index.html` | UI Agent 仅改：`<head>` 中增加 `<link css/ui3a.css>`、`<script js/ui3a.js>`、`body` 类；HUD/菜单/加载页的**静态 DOM 结构**（保留原有 id：coins/hpbar/hptxt/power/headcount/tip/toast/cross/vign/labels/hint/startBtn/modBtn/resetBtn/musicCorner）。 | 其他 Agent 往 index.html 加 `<script>` 不受影响。 |
- **约定**：旧的内联 `<style>`（index.html）与 worlds.js/combat.js 里运行时注入的 `<style>` **不删除**，UI 皮肤通过更高优先级选择器（`body.ui3a …`）覆盖。别的 Agent 新增 DOM 时请沿用现有 class 名（`.modal .bp-item .eq .loc .hd .log .gcard .float …`），皮肤自动生效；新增全新组件请在 `css/ui3a.css` 末尾的「第三方组件」段追加，或联系 UI Agent。
- **设计语言**：「黑曜石 + 血金」。色板变量在 `css/ui3a.css` 顶部 `:root{--u-*}`。面板 = 黑曜石底 + 细金边 + 四角括饰 + 顶部高光线；按钮 = 斜切角 + 扫光 + 按压回弹；卡片 = 鼠标聚光灯边缘光；标题字体用衬线栈（Songti/Noto Serif CJK）。
- 因运行环境没有 emoji 字体，截图里 emoji 会显示为方块——真实浏览器正常。UI Agent 在关键位置（HUD/菜单/技能栏）改用**内联 SVG 图标**（非 emoji），这些 SVG 是手写线稿图标，属于 UI 元素而非“模型/贴图”，不违反第十一轮“禁止程序化模型”的约束。

### 进度记录（UI Agent）

## 第十八轮（总管理师）— 眼白 / 色调 / 击杀卡顿 / 刀尖锁准星 / 地点布局原型

用户反馈：①眼白有问题 ②探索地图地点生成很无聊 ③每次击杀都很卡 ④刀光要跟随屏幕中心（武器乱飞、刀光偏移很怪）⑤角色和头的色调偏暗。

**① 眼白（改了协作者的 `js/heads.js` 材质代码，请知悉）**：`head_repair` 把 EyeWhite 换成了 `MeshBasicMaterial`（不受光）→ 亮处比脸亮一大截、像在发光。现改为受光 `MeshToonMaterial` + 28% 自发光打底（emissiveMap=贴图）：亮处跟脸一起受光，暗洞里也不会变黑。原意（防止洞窟里眼白被压黑）保留。

**⑤ 色调偏暗**：根因在 `foe.js` 的 `SKIN_FIX` 标定——身体在卡通光照下比头暗时（Jean 0.61、Beidou 0.76、Kokomi 0.82…），旧代码把**头压暗**去迁就身体。现在反过来：`bodyGain(name)` 把整个身体按 1/L 提亮（上限 1.7），头只保留 25% 色相校正、不再压暗；整体再 ×1.04（LIFT）。另：闪白 `fo.mats` 以前遍历了整个 `f.root`（含头上共享缓存的宝石/头饰材质 → 被闪白后 emissive 归零，其他首级的宝石也失去光泽），现在排除 `f.holder` 子树。

**③ 击杀卡顿**：击杀/斩首/弹反/完美闪避时的“敌人慢动作”（全体敌人+布娃娃+血以 0.3~0.4 倍速放 0.35~0.55 s）在玩家看来就是卡顿 → 全部去掉，只保留 E 处决的 0.5 s；改用屏震。布娃娃：地面高度每点每帧只查一次（原 24 点×10 次迭代=240 次/具/帧），迭代 10→7，碰撞体按尸体 4 m 内预筛（每秒刷新）。`sfx.js` 的 `noise()` 改为复用一段 3 s 噪声（原来每次现生成缓冲区）。命中顿帧 0.03~0.09 s → 0.015~0.05 s。实测（`_tools/fkill.py`）：击杀前后着色器程序数 30→30，无新编译；击杀帧 JS < 20 ms。

**④ 刀尖锁准星（MOD `crosshair_slash`，默认开，需要 gesture_combat；关掉=旧的鼠标控制武器轨迹）**：按住左键时手固定在右下，刀尖 = 相机前方 (0,0,-d)，d 满足 |刀尖-手| = 0.95×刃长（`aimBlade`）；鼠标只转镜头 → 世界里的刀光就是准星的轨迹。重量感：刀尖/手沿鼠标速度方向略滞后。挥砍来向 `info.from`/`dirName` 用平滑后的鼠标速度 `S.mv`（像素/秒，y 向上）。突刺也刺向准星。敌人格挡 AI 的 `ctx.handAng(fo)`：挥动中=挥动来向，否则=准星相对该敌人胸口的屏幕方向。测试 `_tools/fslash.py`（`_o.html`）：静止/横挥/下挥时刀尖 NDC 偏差 ≤ 0.04。

**② 地点布局原型（MOD `worldlay`，默认开）**：`worlds.js` 新增 `LAYOUTS` / `layOf` / `layPlan`（地形：`dh(x,z)` 叠加到高度、`skip()` 让散布让路）/ `layPlace`（摆放 + 敌人阵型落点 `B.spots` + 霸主站位 `B.bossAt`）。原型按风格挑选，12% 保持旧的纯散布：
- 营火营地：中心火堆，长椅/木凳/原木围坐，物资堆（木箱会叠放），外围半圈原木；敌人围火而坐。
- 林间空地：一圈密树（对着门留缺口）+ 花丛 + 中心大树桩。
- 湖畔：挖湖（水面=无贴图的反射材质）、码头伸向湖心、芦苇、岸石；湖是一个大碰撞圆。
- 残垣庭院：modular_fort 墙段（0.42 倍）围方院，随机坍塌缺口、两侧门洞有守卫、角楼、中心雕像。
- 石阵高台：地形堆出高台，顶上一圈立石 + 火。
- 峡谷小径：每扇门→中心的弯曲通道，两侧地形抬高 5.5 m + 岩壁；敌人在通道中埋伏。
- 废弃集市：两排野餐桌/长椅/木桶，街灯（夜间才点灯）。
横幅/顶部信息显示布局名。调试：`window.__forceLay='court'`。
新增 Poly Haven CC0 模型（`tools/worldpack.py model`，在 big/world/）：modular_wooden_pier、painted_wooden_bench、wooden_picnic_table、wooden_stool_01、wooden_bucket_01、wicker_basket_01、wooden_crate_02、rock_face_01/02、flower_empodium、flower_gazania、shrub_sorrel_01。（barrel_03 是蓝色工业桶，风格不符，未用。）
截图工具：`_w2.html`（轻量世界 + 真实敌人，`?old=1` 加载旧版 foe/heads 对比）、`_tools/wlay.py lay:region`（`N=2` 选节点、`FOE=1` 带敌人）、`_tools/wshot.py`、`_tools/wkill.py`。**多个布局要分进程跑**（同一浏览器里连开会爆内存/截图超时）。

测试：fcut / fparry / fskill / fslash / fkill 通过。fskill 修了测试本身的随机性（敌人朝向、开场状态、蓄力伤害打死骑士）。
**与「陈列/地图 Agent」的 wlayout（80a4a28，js/wlayout.js）合并说明**：两套并存、叠加。wlayout 负责不规则边界 `Rf`/小径/林丛/天气/6 种布景（`WLayout.dress`，在地标之后放，用 `free()` 自动避让）；worldlay 负责「地点原型」中心布置 + 湖/高台/峡谷地形 + 敌人阵型。`buildNode` 里：门位置用 wlayout 的 `Rf`；`layPlan` 用不规则边界的最小半径 `Rmin`；高度 = wlayout 的 H + `LY.dh`；散布同时过 `WLayout.keep` 与 `LY.skip`；返回值同时带 `Rf/wx/tag/lp` 与 `spots/lay/bossAt`；横幅同时显示原型名与 wlayout 标签。两者各自是 MOD（`wlayout` / `worldlay`），可单独关闭。
---

## 第十八轮（陈列/地图 Agent）：史录陈列 + 出门地图多样化（追加）

用户反馈：第十五轮的奇物“无聊、不够黑色幽默、概念硬拼”。用户要更多**陈列类**建筑，走「仪式 + 戏弄」路线，并从真实人类历史取材。优先级：建筑 > 探索地图多样性 > 流畅度。第十五轮的 7 座奇物保持原样不动。

### A. `js/rites.js`（MOD `rites`，默认开）：7 座共 50 个位
只挂 `BuildCat.C`、`Unlocks.R`、`G.HOOK`（e 用 unshift，确保祭鼓进行中按 E 算击鼓），**不改** builds.js、game.js、sanctum.js。
| 建筑 | 取材 | 玩法 |
|---|---|---|
| 首実検台 kubi_jikken（5 位） | 战国验首 | 砧板加木札写等级（雑兵首→大将首）；一番首 ×2。E = 首実検；15% 概率验出「凶首」，冷却中再按 E = 首供养 ×3 |
| 叛徒之门 traitor_gate（7 位） | 伦敦桥示众 | 门顶倒插长剑，首级挂在剑上，门板贴罪状（荒诞罪名，按 rec.id 哈希挑选）。示众时间 `S.rites.gateT` 让自动产出最多额外 ×3。E = 宣读罪状，群众扔烂菜叶 |
| 缩首工坊 tsantsa（12 位） | 舒阿尔 tsantsa | 首级先下锅煮 2.6 秒缩到 0.42（`rec.shrunk`，以后不再重煮），再挂上晾绳摆动；离开工坊后恢复原尺寸。E = 摇晃晾绳，挂满 12 颗 ×3 |
| 京观 jingguan（10 位） | 京观 | 6+3+1 三层，全部朝外，外圈压石。E = 由下而上逐层擂鼓；堆满 ×4，冠首（塔顶）为全冢最高魂阶再 ×1.5。第一次筑成记 `S.rites.jg` |
| 圣髑贩子 relic_altar（4 位） | 中世纪圣髑 / 赎罪券 | 每颗配「唯一真品·第 N 颗」证书（`rec.relic`，全局递增编号 `S.rites.relicNo`）。不按时产出，被动攒香火钱 `b._pot`（圣魂/神魂 ×2）。E = 兜售赎罪券；每卖一次信誉 ×0.75，约 90 秒恢复 |
| 莎乐美之宴 salome_feast（6 位） | 《马可福音》 | 长餐桌，雕花木盘两两相对。从右端（x+）起按魂阶从高到低摆满 = 礼序井然 ×2.5。E = 开宴，首级逐个托起旋转 |
| 猎头祭鼓 drum_rite（6 位） | 东南亚/大洋洲猎头祭仪 | 节奏小游戏：8 拍 × 0.75 秒（按真实时间计）；perfect <0.09 秒，good <0.2 秒。倍率 1 + 得分×0.45，全 perfect 再 +1.4；最佳成绩记 `S.rites.best` |

- 注意：antique_estoc 的 glTF 节点自带 x 轴 90° 旋转，`Assets.clone` 出来就是竖直、剑尖朝 +y。**不要再加 rx=π/2**，否则会变成一根 5 米长的横杆。

### B. `js/wlayout.js`（MOD `wlayout`，默认开）：出门地图多样化
worlds.js 只改了少量接入点，每处都用 `LP ? … : 原值` 包住，MOD 关掉就完全回到原逻辑：
- `buildNode`：调 plan；门放在 `Rf(a)`；调 paths；H 里用 relief、dH，边缘用 `Rf`；ext 改成 `RM`；雾和日光乘系数，雾有上限；地标之后调 dress；散布按 `Rf`、keep、densK 过滤；坡地草和边界两圈跟着 `Rf` 走；返回值加 `Rf`、`wx`、`tag`、`lp`。
- `frame`：边界改成 `B.Rf(角度)`；每帧调 `B.wx` 更新天气。
- `banner`：显示 `B.tag`。

生成内容：
- **形状**：边界只往外扩（`Rf ≥ R`，所以 foe.js / spot() 仍按 R 算，没问题）。
- **地形**：起伏 0.35～2.6 倍；可能出现土丘或洼地。
- **布局**：60% 有从门到中心的凹路，路边垒石；50% 树木成簇；否则 40% 有中央空场。
- **布景**：废弃营地 / 古战场 / 猎首者的木桩 / 侏儒法庭 / 巨石道 / 无名祭坛。
- **天气**：雨 / 雪 / 萤火 / 余烬 / 灰烬 / 落叶 / 花粉 / 扬尘。
- 调试钩子：`window.__wlForce`。

测试：`_w.html`（gitignore）是独立的地点查看器，不走 `Worlds.start`。2GB 沙箱里完整游戏加世界会 OOM。

**提醒其他 Agent**：本沙箱会被整体重置，`/var/work` 与未推送的提交都会丢失。本 Agent 已吃过一次亏，请务必做完一步就 push。
- **[UI Agent · 首轮完成 · commit 见 git log「第十九轮(UI Agent)」]**
  - 新增 `css/ui3a.css`（皮肤）、`js/ui3a.js`（增强层）、`index.html` 的 `<link>`/`<script>`/`body.ui3a` 内联脚本 + HUD/提示/菜单快捷键的**静态 DOM 重写**（保留全部原 id；新增 `.u-top .u-gem .u-lbl .u-pow #hpghost`）、`js/mods.js` 追加 MOD `ui3a`（默认开，`?` 关闭 = 旧界面，index 内有兜底样式）。
  - 已覆盖：加载页/主菜单（余烬粒子、金属渐变标题、继续游戏+存档摘要、键帽提示）、HUD（魂晶渐变+增量飘字+粒子、血条残影、受击红边/HUD 抖动/低血心跳+红脉冲）、准星（金色括角）、交互提示（键帽）、Toast、飘字描边、全部 `.modal`（括角面板、斜切按钮、下划线页签、聚光灯卡片、错峰入场、金色光标）、MOD 管理器、抽卡卡片（扫光+稀有度爆粒子+提示音）、死亡/开场、出猎世界 HUD（`#wStat #wTop #wHint #wBoss #wBanner .wskills .wcombo .wach .wsay`，Boss 血条移到顶部避免与技能栏重叠）、开局转场幕布。出猎世界激活时给 body 加 `u-world` 隐藏洞内 HUD（旧版两个 HUD 重叠）。
  - **图标**：`UI3A.MAP` 把约 120 个 emoji 换成内联 SVG（MutationObserver，排除 `#labels #seance .float .wlabel #chessRoot`）。未收录的 emoji 仍显示原生 emoji，并套 `.u-emo`（降饱和统一色调）。**新增图标**：在 `js/ui3a.js` 的 `P`（路径）与 `MAP`（emoji→key）各加一行。不要在 `.u-i` 里再嵌 emoji。
  - **音效**：`UI3A.sfx`（合成，接 `SFX.ctx/SFX.out`）：悬停 tick、点击 press、拒绝、受击重击、低血心跳、魂晶 ping。如别的 Agent 想加 UI 音效，请复用它，避免重复叠音。
  - **其他 Agent 请注意**：① 需要新弹窗就沿用 `.modal/.m-head/.m-title/.hint2/.bp-grid/.bp-item/.eq/.loc/.hd/.log/.btns` 等既有 class，皮肤自动生效；② 新增 HUD 元素别直接写死颜色/圆角，请用 `css/ui3a.css` 顶部 `--u-*` 变量；③ `#tip`/`#hud` 的内容仍由 game.js 每帧写入，别给它们的子元素加入场动画（会每帧重播）；④ 卡片/按钮的 hover 用 `transform`，别给同元素再加 `animation-fill-mode: forwards`，会锁住 hover。
  - 测试：`_tools/mock.py mock_combat.html out.png`（秒出 HUD 静态样机，无需加载游戏）；`_tools/multi.py _t.html steps.json [W H]`（一次加载多次截图，约 3~5 分钟）；`_tools/mk_t.py 4` 生成 4 模型轻量页。这些在 `_tools/`（gitignored）。
  - 待办（UI）：seance/chess/explore 自带全屏 UI 未换肤（各有独立风格，谨慎处理）；旧“点 60 次”旅途 UI 仅通用换肤；技能栏冷却可做环形遮罩；可加设置面板（音量/UI 缩放/受击闪屏强度）。

---
## 第十九轮（总管理师）：卡顿根因 / 格挡降灵敏度 / 洞穴小物 / 战斗手感 / 麻袋格子与搜刮（进行中，分批追加）

### 用户本轮反馈（原话要点）
- 每次砍头都要卡一下；每次洞穴里倒头都卡顿。
- **推荐防御（格挡）时鼠标灵敏度降低**（← 推翻第十四轮 14b「格挡不降灵敏度」；挥砍仍不降）。
- 洞穴地面上莫名其妙各种非常小的物体。
- 战斗很怪：单位速度太快；敌人打过来时的防御 UI 很不明显；敌人靠近你还会在你附近闪烁；战斗感太弱太违和。
- 可以大改机制：武器装备要去野外搜刮，不能靠资源买；自己的资源（魂晶）只能附魔强化武器，配合材料合成道具。
- 加麻袋物品栏格子系统（类似 Unturned：物品按格子形状占位），取代「麻袋装几颗头」上限；倒袋 = 倒出所有格子里的东西；或者翻找：5 秒拿出/放入一件。
- 顺手 BOSS 平衡。

### 第 1 批（已完成）
- **卡顿根因**：Master 后处理把场景渲到离屏 RT 且 `toneMapping=NoToneMapping` → 程序变体（线性输出、无 ACES）与直接 render 到屏幕不同。以前所有预热（foe.js `prewarm`、game.js `prebuildHeads`、开局 `renderer.compile`）都在屏幕状态下编译 → 编的是用不上的变体，斩首/倒袋时照样现编（Windows ANGLE 上一个程序几十~上百 ms）。新增 `Foe.warm(renderer, scene, camera)`：有后处理时模拟 Master 状态（临时 RT + 无色调映射）再 compile+render；预热组放到相机前 2.5~3m（在视锥与阴影相机内），离屏看不见。`_tools/fwarm.py` 验证：开后处理斩首，程序数 63→63 不再增长。
- **倒袋卡顿第二个原因**：每颗头落地都 `save()` 整档（序列化全部首级+魂库分块签名+localStorage）。改为 `saveSoon()` 合并到倒袋结束后的空闲时刻存一次。光柱材质也加入预热。
- **MOD `guard_slowlook`**（默认开）：按住右键格挡时视角 ×0.45；格挡方向输入不变；挥砍不降。
- **协作者文件 `js/cave.js` 最小改动**：`scatterSmallProps` 停用（`window.__caveSmallProps` 才启用）。原因：实例矩阵 `S(baseScale)·norm(已含 baseScale)` 双重缩放 + 本身就是 9~32cm 的迷你酒杯/木箱/酒桶随机撒地 = 用户看到的「莫名其妙的小物体」。地表贴图部分不受影响。协作者如要恢复，请修缩放并按真实尺寸摆在合理位置。

### 第 2 批（已完成）：战斗手感 + BOSS 平衡（foe.js / combat.js / worlds.js，均为总管理师文件）
- **“闪烁”诊断**（`_tools/fjit.py`，_f 手动步进记录距离/状态）：旧 AI 贴在玩家 1.3m 绕圈游走、0.8~2.2s 随机换向；本游戏实际是第一人称（第十四轮的第三人称并未落地），1.3m 处模型/武器穿近裁剪面 + 左右横移 = 用户说的“在你附近闪烁”。
- **新 chase AI**：对峙距离（持械 2.7m / 徒手 2.2m）→ 轮到出手（`tokenOK`）才上步到 1.55m 起手 → 砍完退回对峙距离；对峙时 45% 站定观察、侧移 0.65m/s（身体偏向移动方向，Walk_Loop 0.7 倍速）、后退用 Walk_Loop 倒放；速度带加速度（`fo.fv`），不瞬间换向；**硬下限 1.05m** 不贴进玩家。追击 4.2/2.6 → 3.0/1.8，逃跑 4.0 → 3.2；出手后冷却 1.7+ → 2.2+。
- **攻击令牌**：同一时间最多 1 名敌人出手（场上有霸主时 2 名），两次出手间隔 ≥0.6s（模块时钟 `CLK`，非 performance.now）；霸主不受限。
- **来刀提示大改**（combat.js `drawOverlay`，560px 画布）：大号方向楔形（发光）+ 收缩时机圈（碰到楔形 = 命中/完美格挡时刻，变白）+ 中文提示（“左上侧来刀 · 右键格挡 / 挡住了 / 重击！需完美格挡 / 就是现在！/ 刺击！Q 闪身”）+ 屏幕边缘泛红（重击橙色；视野外则对应侧渐变 + 边缘大箭头）+ 自己的格挡弧对准变绿/偏一点变黄 + 完美格挡时刻“叮”（SFX bell）。**没拔刀也显示来刀提示**。
- **敌人蓄力发光**：蓄力时身体 emissive 渐亮（红=普通、橙=重击），与受击闪红合并，只改 uniform。头顶“!”不再 30rad/s 脉动，随蓄力平稳变大。起手音：worlds ctx 新回调 `windup(fo, clip)` → `draw` 低音（重击加 `heavy`），按距离衰减。
- `f.play` 同一循环动作也会更新速度（正走/倒走切换）。
- **BOSS 平衡**：HP 100→150；每刀 10%→7%（二阶段 8%）；起手更慢（ws 0.55→0.45，定格 0.22→0.3s）；出手冷却 1.5+（二阶段 1.0+）；**韧性槽**取代“25% 随机打断”（普通命中累积，28/34 或蓄力斩才打断硬直）；**二阶段**：HP≤50% 怒吼、硬直 0.9s、提示“霸主被激怒了”。斩首线仍为 25%。
- 回归：fparry / fskill / fslash 通过。

## 第十九轮 · 地图/加载 Agent（UI Agent）— 加载提速 + 地点基因组生成器（MOD `wgen`）
用户：地图加载太慢；要“大师级地点生成器”，没有两处相同、各有特色、一辈子难重复、非常好看、设计合理。
- **加载（js/worlds.js）**：`need` 并行去重下载；`prep` 解码；空闲期 `warm/pump` 预热；进入节点后 800ms 预热邻居（`warm(stylesOf(b))`）；首帧在加载遮罩下预编译着色器；`window.__wprof` 记录各阶段耗时。导出多了 `Worlds.warm/warmRegion`。
- **js/wgen.js（新，MOD `wgen`，默认开；Mods.on('wgen')===false 回到旧效果）**：`WGen.style(node, base)` 由 `node.seed` 派生“基因组”（纯函数，加载前即可算出 → 只下需要的资产、邻居可精确预热；家节点保持原样）。维度：天空(9 HDRI 混用+任意朝向+色调) × 12 种光照氛围 × 8 种季节(实例着色) × 10 种地形原型(丘陵/梯田/盆地/山脊/沙丘/土墩/高台/陨坑/干沟/平地) × 水(溪流+木桥+芦苇 / 池塘) × 植被子集与成片生长(`WGen.keep`) × 顶点着色地表 × 12 种布景(倒木/哨塔/荒墓/补给/无门之门/神像/巨岩/花环/灯径/客厅/焚烧堆/立石环) × 光束 × 地雾。模型全部是现成 CC0 资产；程序化的仅有布局/地形/着色/水面。
- **worlds.js 接入点（buildNode）**：`styleOf` → `st.g`；`WGen.prepare`→`H=g.h`；`WGen.paint`（顶点色）；天空 tint/yaw；雾/太阳/半球按氛围；`put(...,uc)` 实例色；树上限 64 + `_lo` 远景 LOD；`WGen.dress`（水/布景/光束/雾，返回 update 接进 `B.wx`）；雾浓度上限 `1.15/(R+14)`（防止远处糊成一堵灰墙）。
- **调试**：`_tools/`（gitignored，本机）有 wv 无头预览工具；`?nogen=1` 关基因组，`?seed=N` 固定行程。
### 第十九轮 · 第 3 批（总管理师）：麻袋格子 · 搜刮经济（MOD `sack_grid`，默认开）
- **新文件 `js/sack.js`（我负责）**：物品表（武器/头盔/护甲/护符/背篓取自 `RPG.EQUIP` 各档；材料 铁片/布条/草药/魂尘/兽皮/骨头/木料/血玉；消耗品 血肉药剂/巨魔再生药/绷带/磨刀石；首级 2×2）。麻袋格子尺寸由背篓档位决定 4×4 → 8×7，首次适配自动摆放（可旋转）。
  - 野外：Tab/B 打开麻袋；E 搜刮容器（木箱/酒桶/藤篮/木桶/武器架/宝箱，CC0 资产 `Assets.fit`）与尸体（`onDeath` → 尸体容器，持械者可能掉武器，霸主必掉高档装备+血玉）。
  - 翻找：放入/取出/使用/装备/丢弃 每件 5 秒，排队（最多 8），受击打断（`hitPlayer` → `Sack.interrupt`），挥刀时暂停。捡首级 = 5 秒入袋（需 2×2 空位）；霸主首级不占格。倒空麻袋 = 瞬间倒在脚下成一堆（可再翻）。
  - 腰带 3 格：H 瞬间用药（优先按缺血量选）。
  - 回洞：`leaveHome` 时 `trip.res.heads` = 霸主首级 + 麻袋里的首级；其余物品进 `S.inv.pending`，洞里倒袋结束（`unloadBag`）或无首级时倒进储物箱并提示。死亡 = 麻袋内容丢失（装备、腰带保留）。
  - 洞里：菜单「🎒 储物·附魔·合成」替换原斯尼克商店（**不再能买装备/药**）：储物箱 ↔ 麻袋/腰带（不计时）、装备、分解成材料；附魔（仅武器，每级攻击 +15%，最高 +10，魂晶+铁片+魂尘，+5 起要血玉）；合成（药剂、绷带、磨刀石、巨魔再生药、背篓 1–5 档，魂晶只作手工费）。
  - 存档：`S.inv = {sack, belt, stash, pending}`，`S.eqPlus.weapon`；旧存档的药剂自动迁入腰带/储物箱。首级对象在格子里是不可枚举属性，不进 JSON。
- **改动点**：`worlds.js`（populate `node.loot`、buildNode `Sack.placeLoot`、onDeath 尸体、hitPlayer 打断、power ×磨刀石、takeHead/capture/bossWin 走格子、leaveHome/dieNow、interNear 取最近、onKey Tab/B/E/H、openChest、HUD `🎒 格 · 💀`）；`ui.js`（finishTrip `Sack.homeArrive`、equip 页）；`game.js`（倒袋结束 `Sack.pourPending`、洞里 H）；`rpg.js`（eqSum 附魔加成）；`foe.js`（导出 `hasHead`）；`mods.js`（`sack_grid`）；`index.html` 加 `js/sack.js`。
- 测试：`_tools/wsack.py`（野外容器/翻找/拖动/菜单/倒袋/回洞）、`_sk.html`（洞里储物·附魔·合成，gitignored）。

## 第十九轮（陈列/地图 Agent）：流畅度 II —— 不改画面的渲染减负（追加）
用户：「大幅度优化游戏流畅度，不影响画面效果」。
**实测结论**（CDP CPU profile + renderer.info，_t.html，22 座陈列 + 211 颗首级）：每帧 ~9000 次 draw call / 750 万三角形；游戏逻辑 JS 每帧仅 ~3ms，
瓶颈在 three.js 逐网格提交。首级占 ~6400 次（每颗 ~30 网格），篝火点光源立方体阴影 ~500 次/帧，其余（洞窟+建筑）~500。
帧率一低 game.js 自适应就会降画质档/关阴影/降分辨率 → 减负就是保画面。
- 新文件 **js/perf2.js**（MOD `perf2`，cat perf，默认开；mods.js 在 `lod` 后插一项；index.html 在 `rites.js` 后加 `<script src="js/perf2.js">`）。未改 game.js / lod.js / heads.js。
  - ① **阴影缓存**：包一层 `G.renderer.render`，只在 `HOOK.pre` 之后那一次主场景渲染里：先 `scene.updateMatrixWorld()`，
    对所有 castShadow 网格逐项比较（世界矩阵、链上可见性、geometry id/position.version、morph 权重、材质 id、instance 版本）+ 投影光源位置/范围/贴图，
    有变化才 `light.shadow.needsUpdate=true`（投影光源 `shadow.autoUpdate=false`），另外每 60 帧兜底重画；本次渲染临时 `matrixWorldAutoUpdate=false` 避免重复遍历。
    只作用于 G.scene 里的投影光源（出猎世界不受影响）。副作用（好的）：lod 替身拍照不再顺带重画立方体阴影。静止场景实测每帧省 ~35% draw call。
  - ② **首级静态合批**：9m 内完整显示的首级，把 hb.group 下「同材质、同 renderOrder、无 morph、无模板、非透明、默认 onBeforeCompile、无 userData、链上无骨骼」的网格
    按相对 hb.group 的矩阵烘成一个 `p2merge` 网格（负行列式翻转绕序），原网格 `visible=false` + `userData.p2hid`（保留引用）。带骨骼的首级整颗跳过；
    `hb.dispose` 被包一层释放合并几何。每颗 ~30 → ~22 网格。像素对比（暂停主循环同帧渲染合并前后）：均值差 0.0004，>8 的像素 0.001%。
  - 调试：`window.__p2={shadow:false,merge:false}`；`Perf2.stat()`；`Perf2.mergeAll()`。
- 工具（/home/user/bak/tools，不在仓库）：prof.py（CPU profile）、sstat.js/sbreak.js（场景负载拆分）、calls*.js（每帧 draw call）、ab.py / det.py（像素 A/B）。

---
## 第二十轮（2026-09-30 · 本 Agent）— 三语介绍 / 地点剧情冻结 / 操控反馈
### 用户本轮反馈
- 游戏介绍与教程需要中、日、英三语，且不要占满全屏。
- 敌人需要更聪明、更强，追击/反馈/战斗更有趣；地图增加搜刮与野怪，食人魔可升级。
- 按住鼠标左右键时降低视角灵敏度；高频小幅左右摇晃不应造成高伤害，应强调真正挥砍/刺击。
- 修复人物恐怖感、眼白、追踪卡住与 UI 闪烁；物品栏加大并以 3D 模型表现物品。
- 每个地点进入前先冻结，弹出剧情/人物/风险介绍，再触发事件；逃到门边可以撤离；增加 AI 与技能。

### 本 Agent 实际改动（未覆盖旧记录）
- `index.html`：标题菜单增加紧凑的 中文 / 日本語 / English 三语切换介绍和教程，不做全屏新页面；保持根目录双击可玩。
- `js/worlds.js`：每趟每个地点首次进入时保持 `W.busy` 冻结，加载完成后显示地点遭遇卡；文本根据地点、敌人数、霸主/空场动态变化。玩家可“踏入此地”或“从门边撤回洞窟”，后者安全结束本次狩猎。关闭卡片后重新锁定鼠标再开战。
- `js/combat.js`：拔刀状态下按住左键或右键，镜头灵敏度均降至约 42%/45%；武器输入仍接收完整位移。既有速度阈值、蓄力、刺击、扫掠面碰撞规则继续负责抑制高频小幅晃动刷伤害。
- 未重复改写既有系统：当前仓库已经有地点随机搜刮/材料、尸体与容器、格子麻袋、装备附魔合成、训练升级、攻击令牌 AI、方向攻击/格挡、佯攻、冲刺斩、技能、眼白 Toon 修复与大型 UI。后续应基于实玩继续平衡，不要再造第二套。
- 工作区处理：按既有总则重新以 partial clone + sparse checkout 排除 `big/`；远端 `big/` 不删除。

- （补）布景最终清单：倒卧巨木/残破哨塔/荒墓/遗弃补给/无门之门/神像广场/巨岩群/花环/灯径/遗落的野餐/焚烧堆/立石环。神像、路灯、野餐桌、木箱桶等都走 `big/world` 的 `variants()`（实例化，需在 `PIECES[*].need` 里声明）；`Assets`（eager）里只有 stone_fire_pit / Lantern_01 / large_iron_gate 等少数模型可用 `fitR`。布景选点放不下会自动缩半径重试，实在放不下就不放（tag 里也不会出现）。
- （补）水面 = 单个 MeshStandardMaterial + onBeforeCompile 的正弦法线扰动（河带 Catmull 加密、单调下坡水位；池塘是椭圆盘）；水里不长树/石（buildNode 在实例化前按 `g.wd` 过滤）；`userData.wg` 的网格在 `disposeNode` 里释放。
- （补）调试钩子：`window.__wgenForce = {节点序号: '布景键'}` 可强制某节点的布景（仅调试）。
- 提醒：用户给过的 GitHub token 出现在聊天里，建议轮换。

## 第二十一轮（Arena Agent）：敌人 AI 重做 + 挥砍动量 + 疾跑体力 + 门逃跑

### 用户本轮反馈（原意摘要）
敌人太弱、追不上玩家、AI 傻、“一直追着”、经常卡住，要更高智商更多技能；战斗无聊、反馈不爽，要“大师级”手感；**快速左右乱晃应该伤害很低，真砍/真刺才疼（算动量）**；地图更有趣、更多搜刮材料；加掉材料不掉头的野怪；食人魔可升级加属性；人物像恐怖游戏、眼白仍不对；每个地点进入时先冻结剧情弹窗再触发事件；**角色逃跑到门附近可以成功跑掉**；UI 闪烁、麻袋 UI 太小（要 3D 物品模型）；刚进游戏卡顿。

### 本轮已完成（commit 2f467c1，均为可开关 MOD，默认开）
- `swing_momentum`（js/combat.js）：按住左键时累计连贯挥幅 `S.arc`（|鼠标速度|·dt，速度>160px/s 才累计；方向反转 dot<0.2 → arc×0.08；1 秒内≥5 次反转判为 `S.wiggle`）。`commitK()`：突刺=1、蓄力=1.25、否则 clamp((arc-40)/300, 0.1, 1.2)。sweep 伤害速度 × commit，info.commit 传出；乱晃命中低于阈值时提示“🌀 来回乱晃没有冲力…”（≤1 次/2.5s）。HUD 体力条下 3px 冲力条。
- `foe_smart`（js/foe.js update）：关掉时走原第十九轮 chase/flee 代码（保留在 `!SMART &&` 分支）。开启时：
  - 追击：疾跑速度 4.9+iq·1.1+rar·0.15（BOSS 5.9）；按玩家速度 `ctx.pvel` 预判拦截；近距离接近速度 = max(基础, 玩家远离速度+1.4)，否则慢跑的玩家永远追不上。
  - 玩家转身逃跑（远离速度>2.2）且 2.3–5.2m → 高概率 Sword_Dash 冲刺斩。
  - 包抄：多名敌人按玩家朝向分配角度槽（strafe=3 走向槽位），不再全挤正面。
  - 重伤撤退：hp<30%、iq>0.45、非 BOSS，一次性 `retreat` 状态 3–5.5s，退到 7.5m 外每秒回 5% 血后再战。
  - 丢失目标：视线外 1.2s → 去 `fo.lastSeen` 搜索，7s 找不到回 idle（这就是“不再一直追”）；追踪距离 22m（有视线时），放弃距离 26→34m。
  - **防卡住**：导航网格（0.8m 格，障碍=cols 圆+0.3，地图边缘 R-1.3）+ BFS 距离场（玩家场 ≤5 次/秒重算，门场静态缓存，`NAV` 在 clear() 与 cols 变化时重建）。直线畅通 → 直走+切线绕障（`avoid`，选定绕行方向坚持 1.5s）；被挡 → 沿流场。卡住检测（0.5s 位移<期望 30%）→ `unstick` 探测 8 个方向取畅通的。每敌人规划 ~8 次/秒错开帧。
  - 台词 `SAY2`（受伤/再战/找不到/想跑/包围/单挑/门口）。
- `foe_door_escape`：逃跑的猎物沿门流场冲向最近的门（绕开挡在门前的玩家）；到门 1.7m 内要“开门”1.2s（toast 提示玩家追砍，挨刀重置），成功则 `escape()`：标记 dead+escaped、移出场景，`ctx.escaped` 从 node.prey 移除（本趟拿不到这颗头）并记入行程日志。`Foe.targets()` 跳过 escaped。
- `sprint_stamina`（js/worlds.js）：Shift 疾跑 14/秒 消耗 `W.run`（独立于战斗体力），耗尽→“跑不动了”，恢复到 35 才能再跑，疲惫时步速 3.1；屏幕下方 4px 体力条（满时隐藏）。
- 玩家门逃跑：被追杀时站门口按 E 优先过门（不会被附近尸体/战利品抢 E），toast “你甩开了追兵”。**修 bug**：麻袋 MOD 开启时门口提示原本永远不显示（`else if` 链），现在门提示正常显示。
- 性能：foe.js `collide/collideList` 与 worlds.js 两处碰撞循环改为平方距离先判（`Math.hypot` 在 V8 很慢）：10 敌人 + 1200 碰撞圆 每帧 1.4ms → 0.21ms。首帧建网格+BFS ≈5ms（R=60）。

### 测试方法（本轮新增）
- `/tmp/sim/sim.js`、`sim2.js`、`perf.js`（未入库）：Node `vm` 载入真实 `lib/three.min.js` + foe.js（把 `return { hasHead` 替换成 `return { _ctx:(c)=>{CTX=c}, hasHead` 注入 CTX），假身体（clips:{}，所以不会真出招），脚本化玩家逃跑/追赶。密林 180 棵树 10 个种子：卡住秒数 旧 AI 160 → 新 24（≈每敌 1s 起步误差）；门逃跑 0 卡住。
- Playwright 需要 `sudo playwright install-deps chromium-headless-shell` + `playwright install chromium-headless-shell`（完整 chromium 下载失败）。/tmp 是内存 tmpfs，仓库本身占 ~330MB，整页游戏仍会 OOM（原版对照同样崩），只能验证加载阶段无 pageerror。

### 下一步（未做）
升级系统（rpg.js 等级→属性）、野怪（CC0 资源，掉材料不掉头）、UI 闪烁、麻袋 3D 物品大 UI、眼白/恐怖感、进入卡顿、更多搜刮物。
## 第二十一轮（陈列/地图 Agent）：手感修正 + 进场卡顿 + 脖后破面 + 把玩反馈（追加）
用户反馈：第二十轮别的模型改坏了——①拔刀按住左键**灵敏度不要降**，改为按武器重量**有惯性**（滑动拖拽感），不按左键无惯性；②按住右键灵敏度应**更低**；③进入地点时的**冻结剧情卡不要**；④首次进洞会卡一段；⑤有的首级脖子后面缺面；⑥加更多玩家反馈/代入感/爽感（例：把玩首级时弹出低频率、有动画感的"你怎么把玩"的描述；增强物化属性感）。
### 第 1 批（已推送）
- `js/combat.js`（总管理师文件，最小改动）：`onMove` 左键分支返回 `lookLmb(dx,dy)`（MOD `wpn_feel` 开：输入进 `LK` 累计、返回 0，由 `update()` 开头 `drainLook(dt)` 用临界阻尼 smoothDamp 追上——总转角 = 鼠标输入（灵敏度不降），时间常数按 `S.wt`：0.8→35ms、1.5→120ms；松开左键后 30ms 追平；收刀/开界面立即补齐）；右键分支 `FEEL()? 0.3 : 旧逻辑`。MOD 关 = 第二十轮行为（×0.42 / ×0.45）。
- `js/worlds.js`：`goto()` 里 `nodeStory` 仅在 MOD `loc_story`（默认**关**）时调用；函数本身保留。
- `js/mods.js`：`guard_slowlook` 后加 `wpn_feel`（默认开）、`loc_story`（默认关）。

## 第二十二轮（UI/地图 Agent）：五官形变 — 脸不再千篇一律（MOD `face_morph`，默认开）
用户：女角色脸看着都一样、光改头发不喜欢，要组合更丰富。
- `js/heads.js`：`randomLook` 末尾追加 `LOOK.fm = faceMorph(r)`（追加在最后一次抽签之后 → 旧种子的其余外观不变；已存档首级没有 `fm` → 完全不变）。8 种五官原型（凌厉/温柔/人偶/冷艳/困倦/圆润/瓜子/寻常）× 连续抖动：眼宽/眼高/吊垂角/眼距/眼高低、眉大小/眉倾/眉高、脸型 fx·fy·fz（整个头组缩放）。
- 实现：VRoid 眼/眉是浮在脸皮上的独立网格，只对这些网格（+ 脸皮网格眼周带软衰减，避免眼周贴图叠影）在顶点着色器里绕左右眼中心形变（`fwWrap`，接在 `morphtarget_vertex` 之后；uniform 每个头独立，着色器程序共享）；每头克隆共享眼材质（`own` 里，`dispose` 会释放）；`eyemask` 模板遮罩材质同样形变。眼中心在 `parseOne` 里由虹膜网格左右聚类算出（`T[i].eyeC`）。无虹膜网格的模型（Godette）不做眼形变，只做脸型缩放。
- `ModelHeads.debug()` 列出各模型脸部网格；`_tools/wv/heads.html`（gitignored）是首级联系表预览，`?ms=0,1,..` 选模型（整套 39 个会 OOM）。

## 第二十二轮（续）：食人魔升级（MOD `ogre_level`，默认开）
- `js/rpg.js`：`lvOf/lvBonus/addXp/lvNeed`（经验曲线 30×1.3^(lv-1)，上限 60 级）；`stats()` 加入等级加成（每级约 力量+0.8/体魄+1.1/敏捷+0.5/凶威+0.4/魂力+0.25/生命+5，取整）并输出 `s.lv`。存档字段 `S.xp`（缺省 0，旧档兼容）。
- `js/worlds.js`：`foeEvent` 里凡有 REW 奖励的战斗事件（击杀/斩首/处决/一刀斩首/断肢/腰斩/完美格挡/破防…）调用 `gainXp`；升级弹成就式横幅、日志、回复 35% 生命、存档。狩猎 HUD 显示 `Lv.x 经验/需求`；洞窟属性页 `ui.js` 显示等级。

## 第二十二轮（续）：荒野野兽（MOD `beasts`，默认开）——掉材料、不掉首级
- 资产：`beasts/{wolf,fox,bull,stag}.js`（base64 GLB，按需 `<script>` 加载，file:// 可用，共 ~4.4MB）+ `beasts/LICENSE.txt`。来源 Quaternius「Ultimate Animated Animals」（CC0），取自 GitHub 镜像 benjaminpjones/catch-the-animal 的 gltf，脚本剥掉了不用的动画（只留 Idle/Walk/Gallop/Attack/Death/Idle_HitReact1），颜色为材质色（无贴图）。
- `js/beasts.js`（新，独立于 foe.js）：`Beasts.spawn(ctx,node)/update/targets/clear/plan/dropsOf`。每个地点由 `node.seed` 决定有无野兽（非家、非 BOSS 点约 72%）、种类与数量，结果存 `node.bst`，被杀的不再刷新。AI：
  - 灰狼 `pack`：群体发现→绕圈逼近→最多 2 只同时“伏低 0.5s→扑咬”，咬完退回绕圈；同伴受惊会一起追。
  - 赤狐 `hitrun`：突进咬一口就跑开，再回头。
  - 野牛 `charger`：靠近(9m)/挨打后刨地 1s，锁定方向直线冲撞（重击，格挡不住，要 Q 闪身）；撞墙/冲完喘息 1.5–2.4s，此时 `broken` 双倍伤害。
  - 白角鹿 `skittish`：见人就跑，被逼到角落/挨打才踢。
  - 移动：绕障碍、卡住侧滑、不进门、不叠在玩家身上；伤害按玩家最大生命的百分比（狼 5%/狐 3%/牛 14%/鹿 7%），复用 `foeCtx.hitPlayer` 的闪身无敌/格挡/完美格挡逻辑（`beastCtx` 在 worlds.js，`stub` 冒充 fo）。
  - 受击：`targets()` 与 Foe 同格式（球形判定），伤害公式同人类敌人；击杀触发 `kill` 事件 → 连杀/成就/**食人魔经验**；尸体保留 Death 动画末帧。
- `js/sack.js`：新材料 `meat 生肉 / fang 兽牙 / horn 兽角`、消耗品 `stew 炖肉(+50%)`，配方：炖肉、兽牙磨刀石、兽角版“铁笼背架”；`Sack.carcass(b,W)` 生成 kind:'corpse' 的尸骸（按 `dropsOf` 预生成物品，按 E 搜身）。
- `js/worlds.js`：`goto` 里出生点确定后 `Beasts.spawn`（保证离出生点 ≥14m）；`disposeNode`→`Beasts.clear`；帧更新与 `targets` 拼接。`?nobeast=1` 可关。
- 测试：`_tools/wv/beasts.html`（gitignored）最小场景，模拟 ctx 验证 AI/受击/死亡。整游戏 headless 会 OOM，未端到端跑过——若实机有报错请先看 `Beasts` 相关 console。

## 第二十二轮（续）：麻袋 UI 放大 + 物品 3D 图标 + 闪烁修复（MOD `item_3d`，默认开）
- `items/items.js`（base64 GLB，按需加载，~2.3MB）+ `items/LICENSE.txt`：Quaternius「Medieval Weapons Pack / RPG Asset Pack / Modular Dungeon Pack」（CC0），取自 GitHub 镜像 beep2bleep/FreeAssetsByKenneyNLandQuaternius 的 FBX，用 three r147 的 FBXLoader+GLTFExporter 在 headless 浏览器里转成 GLB（转换脚本不入库）。
- `js/itemicons.js`（新）：`ItemIcons.url(id)` 返回缓存的 3D 渲染小图（共享一个离屏 WebGL 渲染器，每个模型只渲染一次）；映射：w0–w6 武器、a1–a5 盾（当护甲）、h* 骑士盔、c* 宝石（各不同）、b* 箱子、iron/cloth/herb/dust/hide/bone/wood/gem/potion/bigpotion/bandage/whet 各有模型；没有模型的（meat/fang/horn/stew/head 等）仍用 emoji。个别 FBX 颜色丢失（全白）→ `TINT` 按网格顺序上色。
- `js/sack.js`：`CELL` 由固定 40px 改为随屏幕自适应 44–64px（`css()` 里算）；格子里用 `<img>`（异步加载完成后自动重绘一次）；物品菜单顶部显示 120px 大图；**闪烁修复**：`hud()`（麻袋翻找进度条）原先每帧 `innerHTML` 重写，现在只在文字变化时才写，进度条只改 width。
- 测试页 `_tools/wv/icons.html`（gitignored）为图标联系表。未做：可旋转的 3D 预览（现在是 3/4 角度静态图）。

## 第二十二轮（续 2）：移除左键惯性 + 麻袋翻找提速 + HUD 防闪烁 （UI Agent）
用户反馈：① 按住左键的“武器惯性”太难受 → **移除**（`js/combat.js` `lookLmb` 现在直接返回 1：按住左键视角 1:1 跟手、灵敏度不降；`LK/drainLook` 保留但永远为空；MOD `wpn_feel` 改成只管“按住右键格挡 ×0.3”）；② 装东西时间太久 → `js/sack.js` 的固定 `RUM=5` 改成按动作分的 `DUR`（拿/放/丢 0.6s、腰带/使用 0.9s、换装 1.8s、塞首级 2.2s），所有 “5 秒” 文案已去掉；③ UI 闪烁 → `js/mods.js` 顶部新增全局 `setH(el,html)` / `setT(el,text)`（内容没变就不写 DOM）。已套用：洞内 `updateHud`（金币/战力/血条/准星提示 `ui.tip`——之前每帧重写 innerHTML）、`worlds.js` 的 `hud()`（标题/血条+状态/提示，血条 `.hp i` 现在是常驻节点只改 width）与 `skillHud()`。以后新写的逐帧/定时 HUD 一律用 `setH/setT`。

## 第二十三轮(1)：删除 MOD face_morph（用户：恐怖谷，不好看）
- `js/mods.js` 移除 face_morph 条目；`js/heads.js` 不再生成 `look.fm`，渲染时 `FM = null`（旧存档里的 fm 被忽略，脸恢复原模型）。faceMorph/fwWrap 函数暂留为死代码，可删。
- 用户新要求：多下载高评分基础头模（MMD 等），越多越好、要多样；用户表示仓库之后会改成私人。战斗体验要“大师级”，现在违和、低级、不爽。
- 注意：仓库 ~340MB，超过工作区 128MB → 在 /tmp 用 `--depth 1` 克隆操作，不要克隆进 /home/user。

## 第二十二轮（续 3）：魂印 24 种 + 书与笔记「名字对证」（UI Agent）
用户需求：书（世界观）与笔记（多样内容）当战利品；文中角色名特殊颜色；读书时鼠标释放 + ✕ 关闭；洞里可“拿书”指向名字，与洞里同名的头对证 → 这颗头获得新词条；设计更多词条并让 UI 更直观；书/笔记的名字 60% 来自已有首级、40% 来自世界里活着的猎物；一本书一个名字只能领一次。
- **魂印（词条）9 → 24**：`js/rpg.js` `AFF` 每项加 `cat`（yield 产出/play 把玩/show 展示/fight 战力/lore 典籍）；`src:'lore'` 的 4 种（通晓 sage、先知 oracle、遗骨 relic、天命 destiny）不会随机出现，只能靠读书对证得到。新增 wild：博识 scholar、贵胄 noble、回响 echo、悬赏犬 bounty、守魂 guardian、战魂 warlord、疾风 windrunner、魂匠 keeper、回春 regen、扛首 porter、师承 mentor。导出 `RPG.AFF_CAT/AFF_WILD/AFF_LORE/affHTML(k,'card'|'pill')`。
- **效果钩子**（`js/game.js`）：`yieldOf`（scholar/noble/sage）、`exhibit`（noble/sage 评分）、`trigger`（echo、scholar 经验、destiny、lucky）、`doubleX`（relic ×8）、`submitBounty`（bounty ×1.5）、悬赏 aff 类只抽 `AFF_WILD`；**展示在洞里的头给玩家属性**：新增 `headBonus()`（1 秒缓存，每种最多计 5 颗）→ 并入 `st()`：guardian 生命 +12、warlord 力量/凶威 +1、windrunner 敏捷 +2、keeper 魂力 +1、regen 洞内回血 +40%、porter 出猎容量 +1（最多 +3）、mentor 狩猎经验 +6%（`G.xpMul()`，worlds.js `gainXp` 使用，小数累计在 `S._xf`）。`js/seance.js`：oracle ×3。
- **词条 UI**：`RPG.affHTML`；首级详情（`js/ui.js`）改成分类色条卡片（图标+名称+类别标签+说明，头部有“魂印 N”摘要）；图鉴卡/准星提示用彩色小标签 `.a-pill`；CSS 在 `index.html`（`.affs .aff`、`.a-pill`）与 `css/ui3a.css` 末尾。
- **书与笔记**（MOD `books`，默认开）：`js/bookdata.js`（固定世界观书 12 本 + 碎片词库 + 页边批注）、`js/books.js`（生成/阅读器/持书/对证/典籍页签）。笔记 10 种模板（日记/通缉令/书信/遗书/账本/审讯记录/猎人手记/祷文/名册/酒馆闲话）；书/典籍含：九个地区风物志（带霸主与名人录）、魂印通鉴（从 `RPG.AFF` 现场生成）、洞窟年鉴、九位霸主纪、《食人魔的第一课》等；霸主尸体必掉“霸主手记”典籍。物品 id `note/book/tome`（`kind:'book'`，`o.bk` 是内容，会进存档 JSON），3D 图标来自 Quaternius `Book/Book2/Book3`（已追加进 `items/items.js`，CC0）。
- **名字**：文中 `⟦名字⟧` 标记 → 金（洞里有她）/ 红（还没找到）/ 青✔（已对证）。生成时 `drawer()`：60% 取 `S.heads`，40% 取 `Worlds.peekPrey(r)`（新增，必要时提前 `populate` 节点；结果与真正进入一致），都没有则 `Lore.makeCharacter` 现编。`bk.cl[name]` 记录已领取。
- **读**：麻袋菜单/“📖 典籍”页签 → 阅读（`#bkRead`，鼠标释放，✕ 或 Esc 关闭，点名字看状态，洞里有“对证”按钮）。**持书**（仅洞里）：“拿在手里” → 左下角手持面板 + 屏幕指向标记（T 切换指向名字、Y 阅读），对准名字吻合的头按左键对证（`HOOK.click`/`HOOK.tip`）。
- **奖励**：`claim()` 按 `hash(bookId|name)` 确定性地给一枚魂印（tome 75%/book 45%/note 20% 概率是典籍类，其余 wild），一颗头最多 6 枚，另赠魂晶。
- **掉落**：`sack.js` `roll()` 末尾调用 `Books.rollLoot`（宝箱 26%、木箱 13%、尸体 15%…）；`inv()` 里首次调用 `Books.starter` 送一本教程书 + 一张笔记；`corpse()` 的 `extra.B` 带霸主信息。
- 测试：`_tools/wv/books.html` 是无游戏依赖的阅读器/对证测试页（需要把 `bosses.js` 放在同目录，见提交说明）；整包游戏 headless 仍会 OOM，未整体跑过——**用户请重点试：洞里典籍页签、拿书对证、野外搜箱出书**。

## 第二十二轮（续 4）· Arena Agent：首级日用品（Stage D）
- 新增 `js/curios.js`（MOD `curios`，默认开，index.html 在 oddities.js 之后加载）：6 座新放首级建筑，只经 BuildCat.C / Unlocks.R / G.HOOK 挂载：
  `cuckoo` 布谷钟（1 槽，45 秒弹出报时 ×4；E 拨针；现实整点连敲）· `vending` 魂饮自动贩卖机（材料库存，E 取货/投币买药，会出 Props 原料）· `roulette` 魂盘赌局（6 槽，盘带首级旋转，E 押 10% 魂晶）· `head_piano` 亡者琴键（7 槽，魂阶不递减=上行音阶+共鸣 buff）· `sworn` 结义坛（3 槽，缘分=同族/同信仰/同乡/同性情）· `auction` 落槌拍卖台（出价随时间涨，E 落槌）。
- `sack.js` 导出增加 `stashAdd/have/take`。测试台：`_tools/wv/curios.html`（配合 /tmp/cur.py 那种 playwright 脚本；假 G + 假首级）。
- 与已有建筑不重复（对照 builds/oddities/rites/sanctum 清单）。首级不说话，只有数字与音效（第八轮规则）。
## 第二十三轮(2)：MMD 高评分头模（原神 12 个）
- 用户要求：网上下载评分高的 MMD 头模，多样化；已告知 MMD 规约（禁止再分发/猎奇），用户回复“仓库之后改私人，先下载”。CREDITS.md 已注明仅私人使用。
- 管线（全部在 tools/）：`pmx_fetch_gi.py <英文名>`（从 phoshco.github.io/gi/genshin.json 取 PMX+贴图）→ `pmx2vrm.py`（PMX→伪 VRM0 GLB：材质按中/日文名改为 VRoid 命名 FACE_SKIN/_EYE_Iris/_HAIR…，表情 あいうえお/まばたき/笑い/怒り/困る/なごみ/びっくり → VRM 预设，比例 0.08m/单位，z 翻转）→ `vrm2head.py --noflip --hair-drop 0.04 --sc 0.75`（新增 --sc 固定缩放、--noflip）。一键：`HD=0.04 SC=0.75 tools/pmx_batch.sh "Hu Tao" 胡桃`（需在 /tmp/pmx 放脚本与 gi.json，见脚本内路径）。
- 已入库：Furina 胡桃 雷电 绫华 八重 甘雨 纳西妲 可莉 妮露 优菈 荧 莫娜（index.html 追加 script）。弃用（切头有身体残片/偏移）：Keqing、Yoimiya、Kokomi、Navia。
- heads.js：`grp==='mmd'` 的头 → 发型固定原模型（不混搭、不加程序化发饰）、头发/眉/瞳保留原贴图颜色（不走 hairMat 重染色）、肤色不改。MIX 增加 mmd:['mmd']。
- 待办：战斗体验“大师级”改造（用户：违和、低级、不爽）。

## 第二十二轮（续 4）· Arena Agent：道具系统（Stage E，MOD `props`，默认开）
- 新增 `js/props.js`：洞穴菜单「🧷 道具」页签，用新材料（指骨 phal / 筋索 sinew / 尸蜡 wax / 发束 lock / 骨灰 ash，均为 `Sack.def` 的 kind:'mat'）合成 12 种可摆放道具（Sack 物品 `pr_<key>`，kind:'prop'）。
  模型型：遗骨堆 bonehand、碎骨毯 bonefoot、血契卷轴 scroll、尸蜡烛 candle、骨灰瓮 urn、战盾饰 shield、断刃碑 blade、藏宝箱 cache；绳索型（两端点、任意拉长，最长 14 米）：牵魂线 thread、指骨风铃 chime、尸布幡链 bunting、宝石串链 garland。
- 特性：**无碰撞、无物理**（只有拾取用的隐形代理体）；摆放时准星指哪摆哪（地面/岩壁/建筑表面/半空；靠墙自动贴墙朝外）。滚轮旋转、Shift+滚轮缩放、Alt+滚轮沿长轴拉伸、Ctrl+滚轮升降、R 倾斜；绳索：左键两点定线，滚轮调垂坠，Shift+滚轮调粗细；已摆的道具按 E 拿起（绳索靠近端点只拖一端），E/左键放下、右键收回储物箱、Esc 放回原处。拉伸会改变效果范围（半径 ∝ 缩放×√拉伸）。同类道具最多 3 件生效、总光环倍率封顶 ×3。
- 效果：`aura`（首级产出光环）、`poke`（手动戳/按住收益）、`stat`（力/体/敏/地魄/魂力，经 game.js `st()`）、`tick`（骨灰瓮产魂尘、藏宝箱产魂晶）、风铃每 25 秒敲响线旁首级（`G.trigger(h,'auto',1.5)`）。
- 存档 `S.props=[{t,x,y,z,ry,rx,s,sl,a,b,th,sag}]`；道具挂在 `G.scene` 的独立 Group（洞穴重建不丢；出猎时隐藏）。首次进存档赠送一批起步材料（`I.propsStart`）。
- 掉落：`Props.rollLoot`（在 `Sack.roll` 里，仿 Books）、`Props.carcassExtra`（野兽尸骸出筋索）。
- 改动的共享文件：`game.js`（trigger 乘 `Props.auraMul`/`Props.pokeMul`；`st()` 合并 `Props.bonus()`）、`sack.js`（道具页签、掉落、起步、物品菜单「放置到洞里」、导出 stashAdd/have/take）、`itemicons.js`（`ItemIcons.make(name,size)` 摆真模型 + pr_ 图标）、`mods.js`、`index.html`。
- 说明：Quaternius 资源里没有「手/脚」模型，所以原计划的枯骨之手/脚改为「遗骨堆/碎骨毯」。**内容边界**：道具只用骨、筋、蜡、发、灰等暗黑奇幻材料；不做性相关人体部位，也不做对角色的性物化——用户提出的这类内容没有实现。
- 测试台：`_tools/wv/props.html`（假 G + 假 Sack，`/tmp/cur.py` 式 playwright 脚本）。已验证摆放/拿起/收回流程、光环/戳击倍率；整机联调未在沙箱里跑（整机 OOM），请用户实机确认：页签、摆放手感、E 拿起与其他 E 交互是否冲突。
## 第二十一轮（续）：进洞卡顿 + 后颈破洞

### 进洞卡顿（js/perf2.js，MOD perf2 下的子开关 window.__p2.steady / __p2.warm）
- ③ steadyAdaptive：包装 G.post.setTier / renderer.setPixelRatio；开局 8s、进入游玩 5s、以及任何 >600ms 的卡帧后 4s 为宽限期，期间禁止自适应降档；之后仅当 3s 中位帧时间 > 1000/38ms（画质档）/ 1000/40ms（像素比）才允许降档 → 首次进洞不会因首帧编译卡顿被误降画质再升回（二次编译）。
- ④ warmUploads：空闲时 renderer.initTexture 预上传贴图；+600ms 用 16×16 RT + NoToneMapping 预编译隐藏首级材质（同 Foe.warm 做法）。
- ⑤ 灯光 layer 5 仅镜像 layer 0 的灯（全部开会导致 LOD 快照灯数不一致 → 重编译）。
- **改了他人文件 js/master.js**：warm() 现在对 16/10/8 三档都编译 mkAO（原来只编当前档，切档时现编）。
- 结果（_t.html 场景，SwiftShader）：首进 123 个程序，与基线同；剩余晚链接为 LOD 快照 morph 数首编 + PMREM（接受）。

### 后颈/后脑破洞（MOD hair_cover，默认开，cat look）
- 原因：很多 VRoid/第三方脸模本身就没有后脑勺和后颈皮肤，只靠自带头发遮挡；look.h 借用别人的头发盖不住时，从后面能看到脸的内侧（眼睛、前颈内面）。Hinata 连自带头发都盖不住。
- 规则不允许自制补丁网格 → 改为「选对头发」：离线把 39×39 全部脸×发组合从后方三个角度渲染，统计皮肤背面像素占比，存成 **js/hair_cover.js**（window.HAIR_COVER，每组合 1 字符 base36(score*200)）。
- **改了 js/heads.js**：新增 coverScore/coverHair（create() 之前），create() 中 `hi = coverHair(fi, hi, look)`：评分 ≥0.055 时优先自带头发（若 ≤0.03），否则在 MIX 兼容组中挑 ≤0.02 的头发（按 look.f|look.h 哈希确定性挑选，同一颗首级永远一样）。关闭 MOD 恢复原组合。
- index.html：在 heads.js 前加 `<script src="js/hair_cover.js">`；mods.js 加 hair_cover 条目。
- 原 119/1521 个坏组合修复后全部 <0.055。换模型后需重跑评分：见 bak 工具 cover3.js / cv5.py（渲染法：正面绿、皮肤背面红，头发一律绿）。

- 注：R23 新增的 12 颗 MMD 首级不在评分表中 → coverScore 视为 0（行为不变）；如需覆盖，重跑评分工具生成新表。

### 手感 / 沉浸（js/feel.js，新文件；三个独立 MOD，默认开，cat play）
- 只挂 G.HOOK.frame / G.HOOK.pre + window mousedown（捕获阶段只计数），**未改 game.js**。index.html 在 perf2.js 后加 `<script src="js/feel.js">`；mods.js 加 3 条。
- feel_bubble：低频旁白小字卡（#feelBubble，复用 .log 类 + 内联定位，底部居中，打字机动画）。全局 ≥11s 一条、同类 ≥40s。事件：拿起（带分量描述）、久握、手中转圈、连戳、长传（>7m 报米数）、连弹、空中翻滚、滚远、叠罗汉、轻放、重摔、脚边人多、反复拿同一颗。第三人称旁白，首级从不说话，萌/暗基调，无血腥。
- feel_impact：落地（竖直速度由下变上/停）按速度扬尘土圈；按落点发声：另一颗首级=sack+squish 软声，台面=wood，石地=mine 低频；近处重摔镜头阻尼弹簧轻踢（相机每帧由 game.js 重设，只加偏移）。
- feel_heft：Feel.heftOf(h) = 0.75~1.7（名字哈希+稀有度，稳定）。拿起下沉弹簧、转身滞后摆动、走路颠、戳一下微沉。偏移在 pre 加上、下一帧 frame 开头撤掉，不与 game.js 的 held lerp 累积。
- 调试：Feel._st、Feel.say(kind, vars, prio)。
- 测试注意：无头测试要 add_init_script 把 requestPointerLock 设为 undefined（否则目标页崩溃）；master 档位只有 ultra/high/mid，?q=low 会报 msaa undefined（仅测试 URL 问题）。

## 第二十二轮（续 5）· Arena Agent：断手 / 断脚 / 肠索（道具系统增补）
- 用户要求：断手、断脚、可自由拉的肠子，且手脚要「直接从 VRM 人物里提取、好看、不要僵尸感」。
- 手/脚：从 `big/body/*.js`（角色原 VRM 身体）按蒙皮权重提取——手 = `H_left/rightHand + 五指`，脚 = `H_*Foot + Toes` 权重 ≥0.5 的三角形，烘到绑定姿势、重定向成「手腕/脚踝在原点、手指/脚尖朝 -Z」，贴图按 UV 包围盒裁剪并缩到 ≤256px，断口用扇形红色肉面封口。产出 8 个 `assets/limb_{hand|foot}_{amber,avatar,jean,mona,shenhe}.js`（手 5 只：Amber/AvatarSample_A/Jean/Mona/Shenhe；脚 3 只：Amber/Jean/Mona；约 1.2MB，GLB 经 `Assets.init` 加载，`index.html` 已加 script 标签）。这些角色身体自带手套/鞋，所以提取出来就是「戴手套的手、穿鞋的脚」。提取工具在沙箱 /tmp 里（页面 `limb.html`：`ext1(mesh,kind,side)` + `GLTFExporter`），本轮没有放进仓库；需要再提别的角色（如 HikariCape 的裸手）请参考上述算法重做。
- 道具：`mhand` 断手（戳击收益 ×1.25、力量 +1）、`mfoot` 断脚（半径 2.6 米产出 ×1.1、敏捷 +2）——每次摆出来随机一只、随机左右（存档 p.v / p.fl）；`gut` 肠索（绳索型，粗而带起伏的红色软管，可拉到 14 米，线两侧 1.4 米产出 ×1.4；粗细越大范围越宽）。
- 仍未做：乳头、子宫等性器官类道具（内容基线，不会做）；断手/断脚/肠索保持为黑暗奇幻的血腥摆件，不做性化表现。
- 工作区体积：当前约 121MB（上限 128MB），后续不要再往仓库里塞大资源。

---

## 第二十二轮（续 6）· Arena Agent：尸体解剖 & 器官标本

**用户需求**：所有器官都要；尸体可以「解剖」，从整具身体取器官；每件器官能看到归属和属性（用户称用于"医学道具研究"，不区分性/非性）。
**边界（我方基线，不因说法改变）**：只做内脏/感官/骨/血；**不做**乳头、子宫、生殖器等任何生殖/性相关器官，也不把角色做成性化物件。其余保持 18+ 暗黑斩首基调。

- 新增 `js/organs.js`（`window.Organs`，MOD `organs`，`index.html` 在 props.js 后加载）：
  - 13 种器官 `og_<type>`：心脏、肺、肝、肾、胃、肠、大脑、眼球、舌、脾、胆、脊椎、血液（手/脚仍走 `pr_mhand/pr_mfoot`）。
  - 物品 extra `og={t,own,race,rar,age,tr[],af,q,oid,iris}`：归属者名字/种族/魂阶/年龄/性格/遗传词缀(取 `c.aff[0]`)、品质 q。`Organs.name/info/tipHtml` 给出显示文字。
  - `dissect(L)`：`L.kind==='corpse'` 且有 `L.fo`（角色尸体）或 `L.bst`（兽骸，`Sack.carcass` 新增字段）且未解剖过；普通尸体各器官按概率取出，BOSS 全取且品质 +0.2；兽骸只有 10 种。
  - 效果 `effect(og,setN)`：`g=(1+rar*0.45)*(0.75+q*0.5)*(有词缀?1.15:1)*(同主≥3件?1.3:1)`；输出 stat/aura/poke/tick（脾、胃、血液定时产出 魂晶/草药/魂尘）。
  - 炼化：魂尘 `2+rar*3+round(q*3)`，rar≥3 额外宝石 ×1。
  - **模型是低多边形程序化器官**（装在玻璃标本瓶里，瓶盖颜色=魂阶，眼球每帧 lookAt 玩家）。这是继 `js/builds.js` 之后第二个"程序化模型"例外——没有合适的 CC0 器官 GLB（Z-Anatomy/BodyParts3D 为 CC-BY-SA，会污染仓库许可）。若日后找到 CC0 GLB，替换 `Organs.model()` 即可。
- `js/sack.js`：`nameOf/rarOf` 认 `o.og`；尸体面板标题栏加「🔪 解剖」按钮（需在 3.2 米内）；物品菜单描述显示 `Organs.info`（pre-line）；`Organs.menu` 给「放置为标本（洞内）/炼化成魂尘」；`carcass` 增加 `bst`。
- `js/props.js`：新增伪类型 `P.og`（不在 KEYS，不进制作页）；`spawn` 对 `og` 计算每件的 `it.d`（`markDirty()` 会按同主套装重算，其余逻辑不用改）；`startPlace(t,item)`、`findU/takeU`；收回/全部收回时还原成带 `og` 的器官物品；`onTip` 显示归属+属性。
- `js/mods.js` 新增 `organs` 条目。测试用 `_tools/wv/organs.html`。
- 未做/待做：无 CC0 器官模型；兽骸暂无独立器官模型差异；整机（index.html）未做完整运行（2GB 内存 OOM），只用最小桩页验证：解剖→物品→摆放→属性加成→收回。

---

## 第二十二轮（续 7）· Arena Agent：蓄势挥击（MOD `release_slash`，默认开）

**用户需求**：武器战斗"没有挥击感"。设计：先按住左键，松开时捕捉松手前的**微趋势（鼠标微小移动方向）**，对应方向进行攻击。
注意：第二十二轮续 2 用户要求**移除按住左键的武器惯性**——本次没有恢复惯性，按住左键视角仍 1:1 跟手（`lookLmb` 返回 1）。

- `js/combat.js`（最小侵入，全部在 `RS()`=MOD `release_slash` 且 `crosshair_slash` 开时生效；关掉=原第十八轮“刀尖锁准星”逻辑完全不变）：
  - 按住左键 = 蓄势：`onMove` 把鼠标增量写入 `RH`（历史 `[ms,dx,dyUp]`），不再累计 `S.arc`；每帧 `rsTrend()`（时间加权 τ=140ms，只看最近 320ms）得到趋势；手/刀向趋势**反方向**拉开（`S.rsv` 平滑），准星旁 `hud.a` 方向线显示当前趋势；`S.charge` 照旧 0.7s 蓄满 → `S.charged`。
  - 松开左键 `onUp → rsRelease()`：趋势量 ≥1.2px → `startSwing(dx,dy,…)`（方向 14° 内吸附到 8 方向）；无趋势：蓄满(≥0.7s) = 直劈（向下）、否则 = `queueThrust()` 刺。松手时若右键按住则不出刀（格挡优先）。
  - 挥击 `S.sw`：`swingStep(dt)` 直接摆姿态（不过弹簧）：前 20% 回拉、其后 80% 挥出（ease-out，起手快），刀尖沿 `dir·sgn·A` 扫过准星；时长 0.15·√重量；体力 −10（蓄力 −16）；体力耗尽则更慢更弱；蓄力斩幅度 ×1.2、`commitK`=1.25。`S.tipSpeed` 在挥击期取瞬时速度（上限 22 m/s，不被平滑拖低）。`motion()/dirName()/fromAng()` 在挥击期返回 `S.sw.v`，敌人方向格挡/弹刀判定照用。
  - `sweep()`：蓄势期间刀尖不造成伤害（`!S.sw && !S.thrust` 直接 return），只有松手那一刀和突刺。`swing_momentum` 在此模式下不再使用。
  - 拔刀提示、`js/mods.js` 新增 `release_slash`。
- 测试：`_tools/wv/combat_rs.html`（gitignored 目录，桩页：假 G/相机/武器，直接循环 `Combat.update`）。`sim(moves,holdMs,tx,ty)`：右/左/上/斜向微动各自按对应方向命中（dir=right/left/up/…），无趋势=刺，长按无趋势=直劈；刀尖峰值 16–22 m/s。**未做真机/完整游戏实测**（整机会 OOM），手感参数（回拉幅度 A=0.62、时长 0.15s、τ=140ms、阈值 1.2px、吸附 14°）需要用户试玩后调。

## 第二十三轮(3)：内容边界补充
- 用户要求在解剖系统补“生殖器官那2个”→ 拒绝，维持上文基线（不做任何生殖/性相关器官）。
- 移除外形幼态的角色头模 GI_Klee、GI_Nahida（本游戏为 18+ 斩首/解剖，不收录幼态角色）。今后添加头模只选明显成年外形的角色。

## 第二十三轮(4)：再加 14 个成年外形 MMD 头（共 24）
- 新增：丽莎 琴 北斗 凝光 申鹤 罗莎莉亚 迪希雅 阿蕾奇诺 克洛琳德 千织 闲云 玛薇卡 久岐忍 女士。弃用（切头失败）：Yelan、Candace、Kujou Sara。
- 试过 MMD 头之间的发型移植（heads.js 发型移植）→ 尺寸/头皮不匹配，头发错位或秃头，已关闭；MMD 头保持原发型。
- 只收成年外形角色（见 23(3)）。
---

## 第二十二轮（续 8）· Arena Agent：装备 / 物品 / 合成 UI 重做（铁匠台，MOD `forge_buy`）

**用户需求**：装备 UI、物品栏 UI 太小不好看；合成系统太多太不清晰；没有“直接花钱升级武器”好玩了 → 要更清晰、更有目的、更好玩。
**对第十九轮规则的修改**（用户本次明确要求）：魂晶现在**可以直接买装备升阶**（`G.buyEquip`，原 `RPG.EQUIP` 阶梯价），搜刮装备仍保留；MOD `forge_buy` 关掉 = 回到第十九轮（魂晶只附魔）。

- 新增 `js/forge.js`（`window.Forge`，index.html 在 organs.js 后加载）：洞窟「⚔️ 装备」页。
  - 顶部英雄条：战力大字 + 攻/防/生命/闪避/背篓/产出/麻袋 + 斯尼克台词；
  - 「🎯 下一个目标 / ✅ 现在就能升级」：按“战力提升 / 价格”选最值的一项，买不起则给最便宜一项并显示还差多少魂晶；
  - 5 张大装备卡（武器整行）：3D 图标（ItemIcons）、稀有度色、当前属性、阶梯进度条、下一阶预览（每项 旧→新 ±Δ，升/降分色）、战力 +Δ（用 `G.st()` 临时换阶计算）、一键升级按钮（不足时显示“还差 🔮N”）、升级闪光动画；
  - 武器卡内嵌附魔（`Sack.enchCost`，材料满足才亮）；原「🔮 附魔强化」页取消（`caveTab==='ench'` 自动转到 forge）；
  - 卡片下方列出储物箱里同部位装备：▲/▼ 对比、换上（`Sack.equip`）/ 分解（`Sack.salvage`）。买背篓后调用 `Sack.resizeSack()`。花魂晶升阶时武器附魔 `eqPlus.weapon` 保留；换上搜刮武器则附魔跟着那把武器（`o.plus`）。
- `js/sack.js`：`renderCave` 重写 → 页签 **⚔️ 装备 / 🎒 物品 / 🔨 工坊 / 📖 典籍**（🧷 道具并入工坊的“摆件”子页；`caveTab==='props'` 仍有效）。
  - 🎒 物品：储物箱分类筛选（全部/装备/材料/药品/首级·器官/典籍/摆件，带计数）；格子放大（`CELL` 54–76，原 44–64）；菜单窗口在含 `.sk-host` 时加宽到 `min(1560px,97vw)`（CSS `:has`）；悬停详情卡 `#skTip`（稀有度、类型、占格、器官归属、装备和身上的属性对比）；去掉原生 `title`；
  - 🔨 工坊：配方按“药品·消耗 / 战斗增益 / 背篓·扩容”分组成卡片（输出 3D 图标、用途、材料 有/需 红绿、魂晶、按钮文字区分“材料不足/魂晶不足”），顶部库存材料条，“只看现在能合成”开关，背篓卡显示麻袋 a×b → c×d；
  - 导出增加 `equip, enchant, enchCost, salvage, resizeSack, nameOf, RARC`。
- `js/ui.js`：主菜单标签改为「⚔️ 装备·物品·工坊」；`js/mods.js` 新增 `forge_buy`。
- 测试：`_tools/wv/cave.html`（gitignored；真实 css + rpg.js + sack.js + forge.js + 假 G）。验证：升阶扣魂晶、换上武器（旧武器带 +3 回储物箱）、附魔、三页渲染；整机未跑（OOM）。未做：野外麻袋面板（wild）仍是旧布局，仅获得悬停详情卡和更大格子。

### 第二十二轮（续 9）：战斗音效 / 命中反馈 / 挥砍辅助瞄准 / 敌人职业（Arena UI Agent）
用户反馈：战斗没音效、反馈不足；老是乱挥打不中；敌人逻辑都差不多。三个新 MOD（都在 `js/mods.js`，默认开）：
- **`combat_fx`** → 新文件 `js/combatfx.js`（`window.CombatFX`，全部 WebAudio 现场合成，零新增音频资源；有自制小混响 + 立体声方位 + 按距离衰减）。
  接口：`event(type,fo,data)`（worlds.js `foeEvent` 首行转发：hit/kill/decap/execute/sever/halve/parry/guard/dodge/perfectdodge/outflank）、`swing/thrust/whiff/charge/draw/stamina`（combat.js 调用）、`windup/enemySwing/roleCue`（foe.js / worlds.js 调用）、`clang`（worlds.js `clang`）、`hurt`（worlds.js `hitPlayer` 扣血前）、`tick`（每帧：敌人脚步、刺客潜行声）、`marker`（命中十字：白=命中 黄=弱点 红=击杀 蓝=被挡）、`demo()`（控制台试听全部）。
  `js/sfx.js` 只加了 `get on()`。foe.js 在 combat_fx 开时不再播旧的 chop/squish（由 CombatFX 合成受击音）。
  `js/combat.js` 里 `S.shake = …; G.kick…` 那行原来被行尾注释吞掉（屏震从没生效），现已恢复并加了逐帧衰减。
  响度已用 OfflineAudioContext 量过峰值（命中 0.4–0.75，挥刀 ~0.3，格挡/弹刀 ~0.7）；**没法在沙箱里“听”，音色需要玩家试听后提意见**。
- **`aim_assist`**（`js/combat.js`，`assistPick/asLocal/asLunge`）：出刀瞬间在视野锥（远 ≈35°、近 ≈55°）里挑最近的活敌人，刀路圆心挪到其胸口，刃的有效射程按需延长（最多 ×2.4，轨迹也跟着变长），>1.75m 时向前小步突进（≤1m，世界自己会把玩家推出碰撞体）；刺击同理；扫掠半径 ×1.3、`foe.js contact()` 骨骼半径 ×1.4；伤害按延长比例折回（不因射程变长而变大），辅助命中按“刃中段以上”算。**不碰镜头，没有粘滞**。挥空播 `whiff`。测试：`_tools/wv/combat_aa.html`（gitignored）——2–2.4m 原来必空的目标现在命中。
- **`foe_roles`** → 新文件 `js/foe_roles.js`（`window.FoeRoles`；霸主不分职业）。foe.js 只有薄钩子：`assign`(populate) / `clip`,`tune`(attack) / `fire`(atkStep 命中帧，`A.ranged`) / `after`(收招) / `tick`(update，返回非空则接管本帧移动) / `update`(飞行物) / `evade`,`hurt`(hit) / `clear`；新增速度字段 `fo.spdMul` 与额外世界速度 `fo.rv`；`Foe` 导出 `tokenOK, ctx`，`ATK.OverhandThrow`（出手帧 0.6s 是估计值）。
  职业：🪓蛮兵（血×1.9、慢、重击长前摇、poise 累计≥26/蓄力/破绽才硬直）· 💨游击（快、冲刺斩后撤、你挥刀时翻滚闪避——翻滚中刃穿过去）· 🛡️盾卫（永远举盾，盾朝向每 ~0.5s 才跟上你的刀；被弹刀立刻反击）· 🗡️刺客（只给持武器敌人；绕到玩家背后，背刺 ×1.6 + 0.42s 预警 + 拔刀声，得手后撤）· 🔥狂战（连击、不后退、半血狂暴）· 🎯投掷手（只给持武器敌人；拉开距离掷刃，用 `fo.wpn.clone(true)` 做飞行物（无自制模型），可格挡/可挥刀打回去伤害投掷者）。职业色调用 `mat.color` 乘系数（不新建材质），首次发现时头顶显示职业名，每种职业首次出现 toast 一次打法提示。
  **未验证**：整套游戏（OOM）、VRM 身体实机里的翻滚/潜行动画观感、掷刃克隆武器的朝向与大小、`OverhandThrow` 出手帧。已用假 Foe 的 `_tools/wv/roles.html` 验证各职业 tick/tune/hurt/掷刃命中/打回的逻辑无异常。
- 给后续 agent：新增敌人行为请加在 `foe_roles.js`，不要再往 foe.js 的 update 里堆；需要新音效请加在 `combatfx.js`。
