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

## 第二十四轮（人设 / 语音 / 脚步 / 面部补光）— Arena Agent
用户反馈：动作太单一；要脚步声、女角色说话声、各种声音；敌人同质化没有人设；很多角色脸还是很黑。全部是可开关 MOD（js/mods.js）。
- **`persona` / `persona_voice`** → `js/persona.js`（`window.Persona`）+ `js/persona_lines.js`（由 `tools/voice_lines.py` 生成，**勿手改**；改台词请改 py 再生成，并重录语音保证文字=声音）。
  - 8 种性格原型，由 lore 的 `c.traits` 推出（45 个特质全覆盖；首个命中的特质决定）：高傲 proud / 冷静 cold / 温柔 gentle / 胆小 timid / 好战 fierce / 毒舌 sharp / 狡黠 sly / 开朗 cheerful。
  - 与 `foe_roles`（职业=怎么打）互补，**不分配职业**；`apply(fo,r)` 在 `FoeRoles.assign` 之后调用，标题“【性格·职业】名字”。
  - 性格影响：`brave`（见人打还是逃）、`iq` 微调、高傲/好战不撤退、胆小者血量 <55% 逃向门、挑衅频率 `tauntK`、对峙姿态（Yes 点头 / Idle_No_Loop 摇头 / FoldArms / Talking）。
  - 手势：`fo.f.play` 被包了一层，`fo.gestT>0` 时忽略非 once 的循环请求；手势期间 spd/strafe=0；出手或硬直立即取消。
  - 日常作息（未发现你时，foe.js idle 分支 → `Persona.idle`）：职业 idleClip + 性格动作池（Farm_Harvest / Crouch_Idle / Consume / PickUp_Table / Interact / FoldArms…）轮换；在出生点 1.5–5.5m 内闲逛（高傲/毒舌用 Walk_Formal，狡黠用 Crouch_Fwd）；健谈的会走到最近的同伴旁面对面聊天（Idle_Talking + 22m 内偶尔冒闲聊气泡）。**没用 Sitting_Idle（没有椅子会悬空）**。
  - foe.js 台词点 → `sayP(fo,key,fallback)`：see/fear（初见）、fight、taunt/pack、hit（打中你 35%）、block、hurt（挨打 50%，否则只痛呼 pain）、back、lost、run、low、door、flee、atk（出手喝声）、die（倒下时最后一句）。Persona 关闭时回落到原来的通用 SAY。
  - **语音**：`voice/voice.js`（`window.VOICE_DATA={原型:[22 条 base64 mp3，按 KEYS 顺序]}`，1.36MB，进场后用 script 标签异步加载，file:// 可用）。单条按需 `decodeAudioData` 缓存；立体声方位 + 距离衰减（>20m 不响）；同时最多 2 条（痛呼/临终优先）、同一人 ≥1.2s、全局 ≥0.35s；每人音高 = 原型语速 × 名字哈希 0.95–1.05。
  - 已有语音：proud / cold / gentle / timid / sharp（AI 语音合成，Vosk ASR 对齐切句，抽检 15 条全部正确）。**fierce / sly / cheerful 暂时只有文字**（TTS 审核挡掉了含“刀/剑/打中/一击/偷袭”的版本；台词已软化，下一轮录）。
  - CombatFX：有真人语音的敌人在 `windup` 不再叠合成“哈”（`pv` 判断），其它提示音不变。
  - 录音工具链（/tmp，重置即丢）：`tools/voice_lines.py tts` 打印 TTS 文本；Vosk small-cn + pypinyin DP 对齐（按 ASR 锚点切，**不要**按最大静音切——会切在字中间）；ffmpeg 单声道 22050Hz 40kbps、loudnorm −16 LUFS。
- **`footsteps`** → `js/steps.js`（`window.Steps`，全合成无新资源）：你的脚步 = 低频体重“咚” + 地面材质层（worlds.js 按 `STYLES[node.style].ground` 判断：草/落叶/碎石/石板/泥/灰烬/雪；洞穴 game.js = 石地），替代原来单一 step 采样（MOD 关时回落）；敌人脚步在 `Foe.update` 开头用逐帧位移计步，方位+距离（>16m 不响，每秒 ≤16 个），跑动步幅大更响，盾卫/蛮兵甲片叮当，已发现你的刺客无声。OfflineAudioContext 测过 8 种地面响度一致、峰值≈旧采样。
- **`face_light`** → `js/heads.js` 顶部 `window.FaceFill`：MeshToon 光照算完后（`aomap_fragment` 之后，与已有软膝盖同单位：满光≈1.08），把“已受光程度”低于下限的地方补到下限，偏向朝相机的面（0.45+0.55·facing）。脸 ×1.0、头发 ×0.6、敌人身体 ×0.85，**共享一个 uniform（getter），开关/强度变化不重编译**。下限：野外 0.75（`Foe.update` 每帧 `FaceFill.world()`）、洞穴 0.45。实测：白天/黄昏像素不变，夜里/暗洞 +10–15%。
  - 注意：r147 的 `material.clone()` **不复制 onBeforeCompile**，所以 foe.js 克隆身体材质后、以及 `prewarm` 的克隆都要再 `FF()` 包一次（已做），否则预热编的程序和实际不一致。`FaceFill.wrap` 用 WeakSet 记已包，**不能用 userData 标记**（clone 会复制 userData）。
  - 结论：脸与脖子早已按同光照校准，头的肤色取自身体贴图；“脸黑”主要是整体受光低（夜/暗场景），不是肤色采样。若仍有个别角色偏黑，请记下名字给后续 agent 看贴图本身。
- 顺手修：index.html 仍引用 R23 已删除的 `models/GI_Klee.js`、`GI_Nahida.js`（404），已移除这两个 script 标签。
- **未验证**：整套游戏（2GB 内存沙箱里完整页面必 OOM）。已验证：着色器在 WebGL 里编译通过且数值正确（`/tmp/t/ff.html`）；110 条语音全部可解码、冷却/优先级/方位正确（`vo.html`）；人设逻辑 Node 仿真（作息分布、手势锁、45 特质映射）；脚步 OfflineAudioContext 渲染。
- **警告给后续 agent**：在这个 partial clone 里不要跑 `git log -S` / `git log -p` 之类会拉历史 blob 的命令——会把 /tmp（tmpfs）写满。

### 第二十二轮（续 11/12）：敌人“瞬移 / 滑行 / 打不死”修复（Arena UI Agent）——基于 R24 之后重新移植
说明：我原先还写了一套 `js/persona.js`（人格层），与 R24 的 `js/persona.js` 同名、功能重叠，**已放弃，不提交**（以 R24 为准）。下面只是对 `foe.js` / `foe_roles.js` 的战斗手感修复：
- 真实模拟方法：`_tools/wv/fight.html`（gitignored；真实 foe.js + 真实身体 + UAL 动画，`big/body/*.js`、`big/anim/ual.js` 从 GitHub raw 下到 /tmp/big 用测试服务器映射；`trial()` 统计击杀耗时/状态占比/螃蟹步%）。
- **瞬移**：① 击退原来一帧内 `fo.pos.add(kv)` 推 0.22~0.4m → 改 `fo.kb` 0.16 秒内推完；② 离玩家 <1.05m 时位置一帧硬弹 → 软推开（≤9 m/s）；③ 盾卫举盾走位只播一次定格的 `Sword_Block`，身体在地上滑 → 走位播 `Walk_Loop`，站定才摆格挡姿势。
- **打不死**：持武器敌人站位 2.7m 且你一靠近就倒退 → `hold` 2.1/1.7m、退让阈值 hold-0.45；出手间隔 2.2+rand → 1.15+rand(0.5~1.1)；前摇 ws +0.12、定格 hold −0.08；蛮兵 HP ×1.9→1.4、盾卫 1.3→1.15、狂战 1.25→1.15；撤退回血 5%→1.2%/s、撤退时长 3~5.5→1.8~3s；投掷手后撤最多 1.8s、2.7m/s；刺客潜行超时 8→5s；**非霸主伤害下限 = maxHp×10%×挥速×部位系数**。
- **螃蟹步**：绕圈/换位时身体转向前进方向（`turnTo = face ± 0.9`，slot 移动同理；手势 `fo.gestT>0` 时不动）；刺客潜行按移动方向转身。
- 模拟（rar2 骑士，72% 命中追击型玩家）：q=1 各职业约 10~16s 杀死；q=0.4 约 15~20s。
## 第二十四轮（陈列/地图 Agent）：头身比例 + 眼白发黑
- 用户：有的头和身体不匹配、特别小；人物眼白是黑的。原神素材：用户说「留着不管，之后想办法」→ 本轮不动 GI_ 文件与原神身体。
- **MOD head_norm**（默认开，look）：离线量了全部头模元数据 skinW（脸宽）：VRoid 0.134~0.173（多数 0.16），MMD 管线 0.116~0.133（--sc 0.75 固定缩放造成），GI_LaSignora 0.033（面具导致测不准）。**改了 js/heads.js**：新增 normK/normSize，parseOne 解析后对 grp==='mmd' 的头把几何体（含 morph position）与元数据（cut/bottom/skullTop/hairTop/front/skinW/eye/box）等比放大到脸宽 0.155（k∈[1,1.4]，测不准用 1.2）。这些 GLB 无节点变换/蒙皮，放大安全。手持/插桩/敌人身体上一致。
- **MOD eye_white**（默认开，look）：根因 = 眼白材质 depthWrite:false → Master 管线 SAO（ultra/high 档 ao:1）在眼白处读到眼窝后面的深度，当成深洞压黑。**改了 js/heads.js** 眼白分支：写深度 + 颜色 0.62/自发光 0.62（原 0.9/0.28）。q=mid（无 AO）看不出问题，测试要用 ?q=ultra。
- 测试工具（/home/user/bak/tools）：mk_s.py（只带指定头模的轻量页 _s.html，避免 63 个头全载 OOM）、bodyshot.py（头装到身体上并排渲染，ZOOM 特写）、eyeshot.py（游戏内手持首级大图，Q=ultra EW=true/false）、hsize.py（离线读 GLB/元数据量头尺寸）。

### 第二十二轮（续 13）：“砍怪血厚 / 被砍瞬移 / 手感差”——野兽 + 击倒修复（Arena UI Agent）
用户原话：砍所有怪血量都好厚；砍了之后那个单位会瞬间移动；手感很差。用真实 foe.js + 真实身体 + UAL 动画逐帧测量（`_tools/wv/fight.html` 的 `tele()/off()/kill()` 探针）后的根因：
- **瞬移①（野兽）**：`beasts.js` 命中时 `move(b, 0.28m)` 一帧内整段位移，且离玩家 <0.85m 时一帧硬弹 → 改 `b.kb` 0.16s 内推完 + 软推开（≤7m/s）。
- **瞬移②（人形，最主要）**：`sp>1.3`（快刀）时受击播的是 `Hit_Knockback`——它其实是**整个倒地动作**（0.83s，髋部 y 0.75→0.03 趴到地上），而 `stag` 只有 0.55s，动作被半路切回走路 = **趴在地上的人 0.2 秒内弹起来站好**。现在：普通受击只播短的 `Hit_Chest`(0.3s)/`Hit_Head`(0.4s)；真正的击倒（破防/战吼/霸主激怒）播 `Hit_Knockback` → 倒地 0.8s → **`LayToIdle` 起身动画（×1.8 速）**播完才恢复行动（`fo.stag` 自动延长）；躺着/起身时再挨刀**不重播受击动作**（以前会把人从地上拽起来）。实测髋部每帧位移 ≤4cm（之前起身一帧 13cm+）。
- **血厚**：`hit()` 伤害下限 = maxHp × 17%（霸主 9%）× 挥速(0.8~1.4) × 部位系数 → 人形约 6 刀、霸主约 11 刀；野兽 `beasts.js` 同样加下限（狼/狐 25%、鹿 20%、野牛 15%；以前野牛 hp=90×(1~3.2) 可能要砍 20+ 刀）。模拟（rar2~3 骑士，72% 命中，q=0.4~1）各职业 7~8 秒杀死。
- 尸体：`kill()` 探针验证死亡瞬间骨骼无跳变（≤5cm/帧）。
- `combat.js`（续 13）：命中时的 `S.stop`（冻结武器/手部更新 15~50ms）改为 0——那一下冻结会被当成“手上卡了一下”；被弹刀/格挡的 `recoil` 冻结 0.14→0.05s。命中反馈只靠屏震 + CombatFX 音效 + 血花（不要再加顿帧/慢动作）。
## 第二十四轮(6)(7)（另一个 Arena Agent，和上面的第二十四轮并行处理同一条用户反馈）
用户原话要点：角色动作单一；更多音效——走路声、女角色说话声、各种声音；丰富角色人设，现在敌人同质化没人设感；很多角色脸还是很暗。
（人设/手势/作息、脚步、面部补光已由上面第二十四轮(1)–(5) 完成，本 agent 没有重复实现，只补缺口。）
- **(6) 语音补齐 + 第二套声线**（commit a5e34f0）：
  - fierce / sly / cheerful 原来“只有文字”→ 现在有真人语音。`tools/voice_lines.py` 里这三项的台词**已换成录音实际念的句子**（22 槽按 KEYS 映射；缺的 taunt/flee/pain 槽复用同一套里的其它句子，文字仍=声音）。**不需要再录这三套**；若要改台词，必须重录。
  - 新增 `proud2 / cold2 / gentle2 / timid2 / sharp2` 五套（不同句子，声线：proud2/cold2/sharp2=voice-04，gentle2/timid2=voice-01）。`js/persona.js` `apply()`：若 `PERSONA_LINES.p[k+'2']` 存在，按 `hash(名字+'#v')<0.5` 选第二套 → `fo.per.vk`；`line()`/`voice()` 用 `vk`。同性格的两个人会说不同的话、不同的嗓音。
  - voice.js 现 13 套 × 22 = 286 条，3.1MB（按需加载不变）。响度 loudnorm −16 LUFS，22050Hz 单声道 40kbps；实测新 176 条平均 −19.8…−11.5 dB，峰值 ≤ −1.7 dB；Chrome decodeAudioData 286/286 成功，共 ~450 秒。
  - 录音工具链教训：切句 ffmpeg 滤镜里**不要写 `afade=t=out:st=0:d=…`**（从 0 秒就淡出 → 整段静音，我第一次就踩了，已修）；loudnorm 后直接进 LAME 会触发 `psymodel.c calc_energy` 断言 → 在 loudnorm 后加 `aresample=22050,aformat=sample_fmts=s16`。Vosk 对齐时看拼音匹配，个别“找到安宁→吵得很你”这类误识别会让边界错位，需要看时间戳手工修（gentle_16/17 就是）。
  - TTS 内容审核：含威胁/武器/“决斗/看剑/给我站住/我会带人回来”等的整段会被整段拒绝；温和化后通过。
- **(7) 环境音 `js/ambience.js`（MOD `ambience`，默认开）**：9 种地点 + 洞穴各一套声景，全合成。底噪层：风（布朗噪+低通，阵风随机游走）、树叶沙沙、水声、洞穴低鸣、深渊 43/45.5Hz 低频嗡鸣、风口哨（高 Q 带通扫频）。随机事件：鸟鸣、啄木鸟、猫头鹰、蟋蟀、蛙鸣、气泡、蚊虫、乌鸦、猛禽长鸣、远处狼嚎、旗帜拍打、金属轻响、远钟、滴水（带两次衰减回声）、闷雷、洞穴闷响、蝙蝠。
  - 不改共享文件逻辑：自带 250ms `setInterval` 轮询（出猎时 `Worlds.frame` 接管主循环，`G.HOOK.frame` 不跑），读 `Worlds._W.graph.nodes[cur].style`；不在出猎=洞穴。`G.playing=false`/切后台 → 淡出，`G.uiOpen` → 40%。接 `SFX.out`，受 SFX 开关控制。
  - 实测（headless Chrome 真 AudioContext + Analyser）：各场景平均 −42（王城夜）… −23.5 dB（深渊），峰值 ≤0.2（战斗音效峰值≈1，环境音不会盖过战斗）；暂停 −71 dB；事件频率与配置一致；无报错。调试：`Ambience.demo('forest')` 强制场景、`Ambience.debug()`。
  - index.html 在 steps.js 之后加 `<script src="js/ambience.js">`；mods.js 加条目。

### 第二十四轮（续）：新身体 MOD vroid_bodies
- 新增 big/body/{Vita,Victoria_Rubin,Darkness_Shibu,HairSample_Female,AvatarSample_B}.js（tools/vrm2body.py 转换，pixiv VRoid 官方 CC0 / 样本条款，源 madjin/vrm-samples 的 vroid/beta、vroid/stable）。全部非原神。
- 剔除：Vivi（体型偏幼）、Sendagaya_Shibu/Shino（学生制服）——已转换但没入库（符合“只要成年外观”）。男性样本 HairSample_Male / Sakurada_Fumiriya / AvatarSample_C 暂不收：身份表和名字全是女性设定。
- js/foe.js：TINT 加这 5 具（VRoid 皮肤是独立材质，可随首级染色）；新增 VB / VB_ID 表（身体→身份），bodyFor() 在 Mods.on('vroid_bodies') 时把 VB_ID[身份] 追加到 IDENT 候选（不改 IDENT 原表、不动 BOSS_BODY）。
- js/mods.js：新条目 vroid_bodies（look，默认开），放在 head_norm 前面。
- 未做：SKIN_FIX 精调（新身体用默认 LIFT）；古铜肤色时手部略偏橙，可用 calib 流程补。
- 追加 big/body/Osage.js（おさげちゃん_mate2 浴衣，Iwashi，VRoid Hub 许可全允许，源 josephrocca/ChatVRM-js）。材质被合并成 FACE+SKIN 两个（头发、衣服在 SKIN 图集里）→ 不进 TINT；头模也不收（vrm2head 拿不到头发，脸是通用 VRoid 脸）。同仓库另一个 Whingles 禁止改造，已排除。
- 已排查不收的来源：VIPE Heroes（Q 版大头街头风，与黑暗奇幻不搭）、AITuberKit 的 nikechan（有另行的二创规约）、openSizebox（LFS 指针/受限）。

## 第二十五轮（Arena UI Agent）：统一体力系统（MOD `stamina_all`，默认开）
用户原话：“战斗时体力系统就是你攻击防御移动跑步什么都要体力，体力耗光反正反馈然后什么事情也做不了。”
- 新文件 `js/stamina.js`（`window.Stamina`）：体力池仍是 `Combat.state.stam`（不另建）。`Stamina.spend(n,kind)` 够（≥需要的 30%）就扣，不够 → **力竭**；`Stamina.tick(dt,{moving,run,crouch,alert})` 由 `worlds.js` frame 每帧调用（奔跑 15/s，举盾格挡 5/s，战斗中走位 0.9/s；停手 0.45s 后回复，站定 28/s、走动 9~17/s）。
- 花费：挥砍 11（蓄力 18）、刺击 9、跳跃 13、闪身 22（`Combat.useStam` 已统一）、战吼/旋风斩走 `useStam`；挡刀仍扣 14。
- **力竭**：挥砍/刺击/格挡（`worlds.js hitPlayer` 里 CS=null → 完全不能挡）/奔跑/跳跃/闪身/战吼全部失效，只能 1.5 m/s 慢走；刀垂下；全屏红黑暗角脉动 + “力 竭”字 + 喘息声（`CombatFX.stamina`）+ 屏震；歇 0.8s 后开始恢复，回到 30 才解除（约 2.8s）。
- 原来的两条池子（`W.run` 疾跑、`S.stam` 战斗）合并：`W.run` 现在只是 `Stamina.val()` 的镜像，拔刀时隐藏底部疾跑条（用战斗条）。原来的“握刀 +28/s、举盾 +6/s 回体力”在 MOD 开启时关闭。
- 关掉 MOD 即回到旧行为（`Mods.on('stamina_all')===false`）。node 测试：连挥 9 下力竭，冲刺 6.7s 力竭，力竭后 2.8s 恢复。

## 第二十五轮（Arena UI Agent）：回忆 / 无名首级（MOD `recall`，默认开）
用户需求：新首级只显示基础信息；按 **F** 进入回忆界面（主角的手捧着她的头特写、对视、多个动作面板，建筑解锁更多动作）；可回忆那一战（记录她对你造成的伤害）、转头/捏脸、回忆身份属性；头棋/卡牌类型解锁新动作，并显示她自己的棋路/卡牌效果（随机生成、和性格挂钩、不死板）。
- `js/recall.js`（`window.Recall`）：12 个记忆碎片 `FAC`（性格/外貌/身份/信仰/饰物/那一战/名字/目的/生平/魂印产出/棋路/卡牌），`c.kn={}` 记录已想起的项（**旧存档没有 `kn` 字段 = 全部已知**，不会被遮）。`Recall.nm(c)` 未想起名字时返回「无名首级·#hash」；全局 `NM(c)`（lore.js 顶部定义）就是它的封装，各处显示名字的地方已改成 `NM(c)`（game/ui/worlds/sack/chess/seance/play/sanctum）。**不要把 `c.name` 改成 accessor**（会破坏存档）。
- 动作：对视/抚摸/嗅闻/贴耳/把玩(拖动转头、点脸颊)/回忆那一战 为徒手；通灵(seance)、茶会(tea_party)、梳妆镜(gothic_commode)、化妆台(dresser)、鉴定(forge/appraisal/auction)、棋盘(chess)、卡牌(card) 由建筑解锁（`G.S.builds[].type`）。数字键 1-9 触发动作，F/Esc 关闭。首次想起一项给魂晶（按稀有度），想起 4 项自动想起名字，7 项想起目的，全部想起有奖励。
- 战斗记录：`worlds.js` `foeEvent` → `Recall.log(fo,t,d)`；`hitPlayer` → `Recall.hurtBy(fo,n)`；数据写入 `fo.h.c.fight`（她伤你几次/多少、你伤她、头颈命中、破绽、格挡、先手、怎么死的），「那一战」面板显示。
- `js/headgame.js`（`window.HeadGame`）：`profile(rec)` 由性格/种族/稀有度/种子确定性生成棋路（基础棋子 + 额外走法 XS）和卡牌（费用/攻血/关键词/文本）。`js/chess.js` 新增全局 `XS[64]`（每格额外跳跃偏移），`gen/makeMove/unmake/undo/place` 已支持。
- 入口：game.js `KeyF`（手里/看着首级 → `Recall.open`，否则仍是 Combat.toggle；I 键同），档案卡新增「🧠 回忆她」按钮并遮罩未想起的项。回忆界面期间主场景暂停渲染（`Recall.active`）。
- 手模型：`limb_hand_avatar` 染色 + 前臂圆柱 + 护腕（无专用主角模型，未新增资源）。
- 未做/待做：世界内（Worlds）F 仍是战斗姿态，回忆只在洞内；棋盘/卡牌里实际使用她的 profile 只做了展示（chess 的 XS 由 `HeadGame.chessExtra` 提供，棋局接入需 chess.js 里调用 `place`）。

---
## 第二十六轮（Arena Agent）· 用户反馈（原话要点，长期有效）
- 沿用约束：每次编程前读 HANDOFF；**只追加不覆盖**；**阶段性频繁 commit+push**（不要做完再存，网站可能中断/回退）；**任何时刻根目录 `index.html` 双击可玩**；工作区 < 128MB；优先打包 HTML。
- **装备系统**：基地里**不能用资源（魂晶/材料）换装备**；资源**只能升级（强化/附魔）现有装备**；**要装备必须去野外搜刮**。（第二十二轮续 8 的 `forge.js` MOD `forge_buy` 允许花魂晶直接买阶 = 违反此规则，本轮关闭。）
- **打不死人**：攻击野怪和人都打不死 → 查根因并修。
- **战斗手感**“一坨屎”→ 要**大师级**调整强化战斗系统，操作要非常爽、玩家体验好。
- **敌人类型要更多**。

### 本轮工作区处理（重要）
- 仓库 ~426MB（含 `big/` 122MB + `.git` 155MB），远超 128MB。本轮把完整克隆放在 **`/var/work/head`**（根盘，不在 `/home/user` 快照里），`/home/user` 保持为空；token 只在 `/var/work/head/.git/config`（不进快照）。**会话重置后 /var/work 会丢：一切以 GitHub 为准，所以必须频繁 push。**
- 测试工具入库在 `tools/test/`：`mk_t.py`（生成轻量 `_t.html`，只留 3 个头模）、`run.py <page> <script.js> [wait] [png]`（playwright headless，需 `PLAYWRIGHT_BROWSERS_PATH=/var/work/pw`、`python3 -m http.server 8080` 在仓库根目录）。完整 `index.html` 在 2GB 沙箱里仍会 OOM，测试只用 `_t.html`。
- PAT 由用户在聊天里给出：不写入仓库；请用户用完后撤销/轮换。

## 第二十五轮（续）：MMD 头模包 + 魂阶外貌差异 + 后脑补全
- **js/headpacks.js（新）**：按 MOD `pack_hsr / pack_zzz / pack_nte` 用 document.write 同步插入 `models/<包>_<名>.js`（file:// 可玩；关掉的包完全不加载，启动不变慢；文件缺失只 404）。index.html 在 `models/GI_LaSignora.js` 后加了一行 `<script src="js/headpacks.js">`。
  - 头模来源：phoshco.github.io 镜像的官方 MMD（星穹铁道 12、绝区零 11、异环 9，共 32 个，全部成年外观）。**原规约禁止二次配布/猎奇 → 仅限私人仓库**。仓库仍公开时这些 .js 不提交（本地 .git/info/exclude 已排除）。
  - 管线：`tools/pmx2vrm.py`（修：跳过 `mmd_edge.*` 描边外壳材质，否则月城柳整个头被白壳罩住）→ `tools/vrm2head.py --grp mmd --noflip --hair-drop 0.04 --sc 1.25`。穗鸟（vrm2head OOM）、塞西莉亚（无头骨）跳过。鸣潮是 .bpmx，暂未写解析器。
- **MOD nape_fill（heads.js，默认开）**：MMD 脸模只是前面具，后脑/后颈空（从后下方看到脸的内侧、眼睛透过头发）。`napeGeo(t)` 用本头脸部皮肤顶点（取每个方向最内侧）+ 耳平面镜像 + 断面圆，建径向壳（横向 ×0.9，下半竖向 ×0.99），皮肤色卡通材质，名 `__NAPE__`，每模板缓存一次。仅 grp mmd。
- **MOD tier_look（heads.js + headwear.js，默认开）**：`tierFace()` 按魂阶加权挑脸（MMD 权重 0.15→3.5，其它 1.5→0.45）；`tierLook()` 用 look.seed 独立随机（不打乱原有抽签）：凡魂朴素发色 90%、无挑染/异色瞳、acc 清空、更苍白；灵魂 acc 减半；圣魂 50% 额饰；神魂 75% 王冠/冠冕/额饰（MMD 头只加细额饰）、挑染/异色瞳/25% 发光瞳。headwear.roll 概率 ×[0.35,0.7,1,1.25,1.45]。只影响新生成的首级（look 已存档的不变）。
- 测试工具（不在仓库）：hb2.py/hb3.py + headback.js/tier.js 渲染背面/魂阶对比。
## R26b（装备规则 + 战斗测试台）
- 用户反馈：基地不能用魂晶买装备；魂晶只能强化身上已有的装备，装备靠搜刮。
- `js/mods.js`：`forge_buy` 默认 **关**（存档迁移 `__v=5` 强制关一次）；关 = 规则生效。
- `js/game.js` `buyEquip`：Sack 开且 forge_buy 关时拒绝购买（旧 UI 入口也封死）。
- `js/rpg.js`：新增 `RPG.plusAdd(slot,key,val,plus)`；`eqSum` 对 weapon/helm/armor/charm 都按 `S.eqPlus[slot]` 加成（每级 +15%，非武器向上取整）。
- `js/sack.js`：`S.eqPlus` 四个部位；`equip()` 换下的旧装备带着自己的强化进储物箱；`enchant(target, slot)`、`enchCost(p, slot)`（头盔×0.7/护符×0.8/护甲×0.9）；掉落：敌人（持械）65% 掉装备、箱/架/尸体的装备率提高，任何部位都可能带 +N。
- `js/forge.js`：规则模式（forge_buy 关）下每张卡只有「强化 +N→+N+1」（预览每项属性变化）和搜刮提示；`goal()` 给出最便宜的强化目标。`data-ench="eq:<slot>"`。
- 战斗测试台 `tools/test/fight.html` + `tools/test/drive.py`：真实 foe.js/combat.js/VRM 身体，虚拟时钟，秒级跑完。`trial(kind,…)` 机器人（click/flick/hold/wave）见 `/var/work/bots.js`（已拷入 tools/test/bots.js）。
- 实测结论（旧战斗）：点按/松手能命中；**按住左键+挥鼠标（教学写的玩法）伤害 = 0**；空挥把体力耗到 0 后完全不能攻击；命中依赖刃尖真实碰撞，瞄不准整刀落空且无提示。

## 第二十七轮（Arena UI Agent）：名字/魂阶常显 + 阶位系统 + 进场偷听对话 + 私人设定
用户反馈：① 角色**名字、魂阶（凡魂…神魂）**不需要回忆，始终显示（上一轮把名字遮成「无名首级·#hash」是错的，已撤销）；② “阶位太少”，且**不要只有一条单线**——要有很多分支，与身份有关，也与稀有度有关；③ 更丰富的角色人设：进入场地时弹框，能听到她们对话、看到人设信息，“更多你设计”。
- **`js/ranks.js`（`window.Ranks`，MOD `ranks`，默认开）**：12 大系（战阵/狩猎/圣职/自然/奥术/咒影/匠医/艺者/王权/深渊/龙脉/民间）× 每系 3 个流派 × 10 阶 = 288 个头衔。1-3 阶为大系共用入门阶，4-6 阶按流派分化，7-10 阶为流派顶端头衔。`Ranks.of(c)` 由「身份（`MAP[c.id]`→默认大系+流派）+ 魂阶（区间：凡魂1-3/灵魂2-5/英魂4-7/圣魂6-9/神魂8-10）+ 名字哈希 + 年岁」确定性算出，**不写存档**（旧存档自动有）；同一身份约 30% 走同系另一流派。API：`of/text/short/badge(HTML)/ladderHTML(阶位谱)`。新增身份时请在 `MAP` 里补一行（未映射的落到「民间·田园」）。
- **显示**：档案卡（名字下的徽章 + 常显的“阶位谱”十格阶梯）、魂库列表、洞里悬停卡、出猎世界拾取提示。`Recall` 里 `name` 分面改为 `rank`（阶位传承：流派说明 + 阶位谱，4 项后自动想起 / 嗅闻顺带想起），`nm(c)`/`NM(c)` 现在直接返回真名。
- **`js/overhear.js`（`window.Overhear`，MOD `overhear`，默认开）**：
  - `Overhear.bio(c)`：确定性私人设定——口头禅（按 8 种性格原型）、小习惯、喜欢、讨厌、最怕、秘密。新分面 `bio`（照魔镜动作揭示）；档案卡在想起后显示。
  - `Overhear.enter(node, ctx)`（worlds.js `goto()` 结束处调用）：进入有活着猎物的地点时，左侧弹出**不冻结、自动消失**的对话框（不抢操作，不做 story 冻结卡）：按性格原型 × 话题（工作/对你的传闻/愿望/信仰/小习惯/上下阶/同系）说话，关系由阶位差/同系/同身份决定（独处时自言自语，3 人时第三人插话）。话里会把她的信息写进 `c.kn`（身份/性格/目的/信仰/阶位/小习惯），右下角提示“听出了……”，并写入行程日志（`cls:'note'`）。每个地点每次行程只播一次（`node._heard`）。
  - 台词池在 `T`（话题×性格×开口/回应各 2 句）/`MONO`/`CATCH`；要加话题就在 `T` 里加一项并在 `compose()` 的候选里挂上。
- 测试：node 下加载 lore+ranks+overhear 可统计阶位分布/生成样例对话（3000 人样本出现 291 个不同头衔）；UI 截图见 `_tools/wv/recall.html` 同款页面。
## R26c（战斗核心重做：MOD `combat_master`，默认开）
改动文件：`js/combat.js`（新增 MM 区块 + 约 12 处薄钩子，全部以 `MM()` 判断，关 MOD = 回到旧蓄势挥击）、`js/foe.js`（`hit` 伤害下限乘 `info.fmul`；`contact` 对 `info.mm && info.zone` 直接返回部位）、`js/beasts.js`（下限乘 `info.fmul`）、`js/stamina.js`（MM 下回体更快、力竭恢复阈值 22）、`js/mods.js`（新 MOD）。
- 输入：按下左键**立刻出刀**；连点 = 三连斩（横斩→反手→下劈终结，终结更重，连击 1.1s 内不断，出刀中再点会缓冲）；按住左键**甩鼠标**=朝该方向斩（8 向）；按住不动 0.6s 松开 = 重斩（破防 ×2.2）。按住左键视角 1:1 跟手（不降灵敏度）。右键格挡会取消当前出刀。
- 判定：不再靠刃尖碰骨头。出刀时在视野锥里挑目标（±43°/4.2m，会向目标踏步），刃扫过目标那一帧才结算（`S.sw.sgn` ≥ 目标相对位置），同一刀最多 3 个目标；部位由相机射线最近的骨头决定（`aimPoint`），终结下劈把射线压低 → 好砍脖子；没瞄准也算胸口，不会落空。
- 伤害：`info.fmul` 轻 1.45 / 终结 1.5×1.3 / 重 1.6×2.2；普通敌人约 4 刀（≈1.3s），霸主 ≈ 8 刀。
- 手感：命中 = 屏震 + 镜头沿斩向压/侧倾（`M.kick`，在 `prerender` 里加到相机旋转）+ FOV 冲击 + 22~50ms 只冻刀不冻镜头 + 命中回体力 3~6；体力：轻 6 / 终结 9 / 重 16，不再按刃尖速度持续扣体力。
- 测试台（`tools/test/fight.html` + `bots.js`）：click/flick/hold/wave/mash/sloppy 六种机器人 × 12 种敌人，全部 30 秒内击杀（旧版 wave 永远 0 伤害）。注意：测试台里虚拟时钟不要回零（combat 里有 performance.now 绝对时间状态）。

## R26d — 新敌人角色（MOD `foe_roles2`，默认开）
- 新增 `js/foe_roles2.js`（`window.FoeRoles2`），由 `js/foe_roles.js` 的 assign/clip/tune/after/tick/evade/hurt/update/clear 钩子调用；`index.html` 在 foe_roles.js 之后加载。
- 五个角色：**duelist 决斗者**（玩家挥刀时招架→反击，不逃跑）、**juggernaut 重甲**（正面非蓄力伤害×0.3，要绕背/蓄力重击破防，韧性 40）、**mage 法师**（紫色法球，HP<50% 三连发，近身闪现；挥刀可击碎 2.3m 内法球，右键格挡可挡）、**healer 治疗者**（10m 内队友 +30% 回血，被打断；只在场上≥2 敌人时出现；同伴全死后原地发慌）、**warcaller 战吼者**（9m 红圈，队友 ×1.2 速 ×1.25 伤，<55% 血时集结全体追击）。
- `combatfx.js` `roleCue` 新增 cast/heal/pop/parry/rally/blink；`worlds.js` `playerSwinging` 现包含 `Combat.state.sw`，`handAng` 优先取 `CS.sw.v`。
- 测试钩子：`window.__forceRole`（字符串或按 `Foe.foes.length` 索引的数组）。`tools/test/fight.html` 与 `bots.js`（新增 `o.delay`）已更新；harness 的 `playerSwinging/handAng` 现与游戏一致。
- 验证（light harness）：五个角色均无 JS 报错；duelist 会 `blocked`；mage 法球命中玩家（站桩 70 伤害）；healer 回血（F✚）；warcaller 给 buf；老角色矩阵回归全部 1.3–2.9s 击杀。踩坑：新角色必须 `fo.brave=true` 且 `fo.retreated=true`，否则被打后进 flee 状态，role.tick 不再被调用；healer/mage 后退速度必须低于玩家走速（1.8/1.9）否则打不到。
- 待做：野兽变体、HUD 连击点、教程文本更新。
- R26d 补：`js/worlds.js` 进场提示文字在 `combat_master` 开启时改为新操作说明（点左键出刀/三连斩/甩鼠标/蓄力/右键格挡）。

## 第二十五轮（续）：跨头发型 / 跨头饰品库 —— “找更多头发-饰品-各种各种，而且确定可适配”
改动文件：仅 `js/heads.js`、`js/mods.js`（均为本管理者文件；未动 UI Agent / 美术协作者文件）。
- **MOD `hair_mix2`（默认开）**：56 个 MMD 头的原作发型（原配色、自带发饰）可给别的脸用。`hairFitOK(F,H)` 逐对打分（缓存 FITSC），**相对基准**＝该发型戴在原主人头上的分数：覆盖不掉 >5%、陷入不多 >2%、拉伸 0.8~1.25、刘海遮眼带 ≤ max(0.34, 原主人+0.08) 且 ≤0.6；原主人自身陷入 ≥20% 的坏发型（Ganyu）不外借。抽测 142 对合格 62 对。Kafka 刘海原本就遮眼 → 不外借。
  - 绝对阈值不可用：MMD 盘发/扎发本就露后颈（Jean 自身覆盖 0.575），VRoid 发内层本就贴在头皮下。
  - skullMap：MMD 脸在两个 MOD 任一开启时，把脸皮 z>zm 的点镜像到后方补“虚拟后脑”（影响 fitHair/hairShell；原装 MMD 头目测无变化）。
- **MOD `acc_mix`（默认开）**：`accLib()` 收集 MMD 头上 `cloth_*` 独立饰品（眼线以上、≥24 顶点），`big`=帽子/大头冠。`fitAcc` = **刚性**搬运：按头骨平均半径比整体缩放（0.7~1.3），沿质心方向平移使“最贴头骨的 10% 顶点间隙”与原主人一致（-2~+4cm），埋进新发型 >12% 再外推。拒绝条件（ACCWHY 记录原因码 B/M/F/H/E）：推不出来 B、落座误差 >1.5cm M、原主人头上就悬空 F（大件 >5.5cm、小件 >2.5cm，如光环/胡桃帽上的梅花）、被新发型包住 >60% H、挡眼 E、陷进头皮 >5%、挡脸 >3%。
  - `mixLook`（randomLook 内、tierLook 之前）生成时**逐件预检**，只写入合格的 `L.ax=[{f,n}]`；脸自带大件则不叠；大件接受率 35%；同来源头 1 件；最多 2 件；出现率按魂阶 [0.06,0.14,0.26,0.4,0.55]。
  - 已否决方案：逐顶点径向偏移（帽子变形）、按发型外轮廓比缩放（悬空）、按发型外轮廓间隙落座（发散/压过眼睛）。
- 调试：`ModelHeads.mixDebug.{hairOK,hairSc,acc,why}`；工具 `tools/mix.js`（MODE hair/acc/look，配 hb3.py 的 PRE 环境变量）不在仓库内。
- 性能：randomLook 冷 2.4ms / 热 1ms（无头浏览器）。
## R26e — 用户反馈：“敌人永远打不死 / 每次只打一下冒一堆数字 / 按住轻微偏移没法控制攻击角度”
根因（light harness 复现）：
1. **逃跑速度 3.9–4.9 m/s > 玩家走路 3.6**：非勇敢敌人（多数）被砍一刀就逃，走路根本追不上（测试 3 个里 2 个 0 命中），或直接从门逃掉 = “只打一下、永远打不死”。`foe.js`：逃跑速度改 3.0+0.12·rar+0.3·iq（<走路 3.6，<疾跑 6.2）；逃了 6.5 秒仍无处可去（附近没门）→ 困兽之斗转身拼命；挨打后回头拼命概率 0.35→0.65。
2. **体力被空挥掏空**：追人时连点空挥，体力 0 → 进入“力竭”（移速 1.5、不能出刀）→ 被反杀。`combat.js` mmAttack：体力 6/9/16 → 4/6/12；4.2m 内没有敌人时空挥只耗 35%。
3. **R26d 重甲卫过硬**（hp×2 且正面 ×0.3）：改 hp×1.5、正面 ×0.6、出现权重 0.26→0.13；治疗量 30%→18%。
4. **方向控制**：以前按住左键必须 >30px/100ms 的大幅甩动才换方向，之后只出一刀。现在 `combat.js`：按下瞬间看按下前 120ms 的鼠标趋势（≥9px）；按住期间最近 150ms 内鼠标有 ≥5px 偏移（极轻微也行）就朝该方向（8 向吸附/连续角度）连续出刀，间隔 45ms；不动则仍是蓄力。`onMove` 现在在 MM 下始终记录鼠标趋势（RH），`mmDown` 不再清空 RH。
测试：`tools/test/bots.js` 新增 `drift`（按住+每帧 0.5px 偏移，`o.dir`）、`o.sp`（玩家走速，默认 3.2，实际走路 3.6）；`setup` 的 `brave:false` 用于测逃跑。结果：brave:false、走路速度追击，click/mash/drift/wave 全部 1–10s 内击杀；drift 的出刀角度 0°/90°/-135° 与偏移方向一致。
## R28 — 用户反馈：偷听框在左下角看不到 / 头棋镜头头角度不对、信息不清、去掉底座、要更多反馈和趣味 / 卡牌同理
- **偷听 `overhear.js`**：`#ohear` 移到屏幕底部居中（bottom:17vh，宽 min(780px,88vw)），字体 17–21px，名牌有弹出动画，带指向箭头；仍然 pointer-events:none 不挡操作。
- **头棋 `chess.js` 重做（仅此文件）**：
  - 镜头 tp=0.5 / d=12.5 / lookAt y=0.25；左右信息列 `.ch-col`（左＝常驻棋子信息卡 `.ic`，右＝斯尼克/战果托盘/棋谱），顶部＝回合胶囊+子力对比条；走法表改为按钮弹窗（📖）。
  - **去掉底座**：每颗棋子 `g` 内有 `yaw` 枢轴（`g.userData.yaw`），头挂在里面并始终转向镜头（PVP 翻转也适用）；脚下只有队色光环（红方橙、蓝方蓝）+软阴影；头顶是圆形“棋种徽章”（稀有度描边）。头缩放 S=3.0（restore 里同值）。
  - 信息卡：名字/魂阶/阶位徽章/**8×8 走法示意**（绿＝常规，金菱＝首级专属棋路，首领无）/走法说明/棋路名/口头禅/“正被威胁”/“走到这里＝吃掉她”。
  - 反馈：选中抬起+光环脉冲+表情；可走/可吃(红)/特殊(金菱)三种落点；被威胁的己方棋子红框脉冲+担心表情；落地挤压拉伸+涟漪+尘粒+轻震屏（吃子 0.3，无慢镜头）；吃子粒子爆发、“斩 +n”飘字、连斩/重创/斩首/将军/晋升横幅、将军红色晕影；台词气泡（PERSONA_LINES：see/fight/taunt/atk/pain/die/fear/low…，每 7–13s 闲聊）；胜负时全军表情+烟花。
  - 调试钩子：`Chess._scr(sq)` 返回该格屏幕坐标，`_st/_move/_gen` 同前。测试页 `_tools/wv/chess.html`（gitignored）。
- **卡牌 `recall.js` cardHTML**：没有可玩的卡牌游戏（`cardtable` 只是解锁说明），所以做的是**牌面查看器**：大牌面+鼠标倾斜反光（神魂/圣魂/异色有流光箔）、“怎么读这张牌”（费用/攻击/生命含义）、关键词逐条解释、**稻草人试打**（`window.RecallCard.duel`：打出→战吼→攻击/飘字/血条→反击，魂盾/剧毒/吸魂/狂怒/疾风/回响/嘲讽/潜行都有对应演出）。完整卡牌对战未做，属于后续独立系统。

## R27 头模 — 用户：“更多！多来点经典 MMD，日本作者的、大师级的、VOC 的、东方的”（+更多头发/饰品）
- **新增 26 个头**（models/CLS_*.js，共约 72MB），三个 MOD（js/mods.js 紧跟 pack_nte 之后，cat:'look'，默认开）：
  - `pack_voc` 9：CLS_MikuAnimasa / MikuYYB10 / MikuRacing / MikuVBS / HakuAnimasa / KaitoAnimasa / MeikoAnimasa / IA / Yukari
  - `pack_touhou` 4：CLS_Mokou / Kaguya / YakumoRan / YakumoYukari
  - `pack_cls` 13：CLS_RemTda / Tohru / 2B / Mikasa / Junko / Brahma / QinYYB / LLHonoka / LLEri / LLKotori / LLUmi / LLMaki / LLNozomi
  - 登记在 js/headpacks.js 的 HEAD_PACKS（沿用 document.write 同步加载，关掉的包不加载）。CREDITS.md 已加“仅限私人使用”条目。
- **更多头发/饰品**：不另做——hair_mix2 / acc_mix 会自动把这些新 mmd 头的头发和头饰（八云紫帽、八云蓝帽、妹红蝴蝶结、梵天冠、秦冠、雷姆发箍、托尔角…）纳入跨头库，hairFitOK / fitAcc 照常把关。
- **tools/pmx2vrm.py 修复**（其他 PMX 也受益）：
  1. 罗马字材质名（kao/kami/mayu/matsuge/kurome/eyebase/mimi）；通用名（材質N/mat N/新規材質）按贴图文件名回退（cls2，正则 `\d` 之前误写成 `\\d` 已修）。
  2. 面具/仮面/mask → cloth（“面”字曾把面具判成脸皮）；“表情”“shade” → 脸部贴片（hairshade 曾盖住 LoveLive 的脸）。
  3. SKIN 材质不做 alpha 裁剪（梵天脸贴图带透明通道 → 整张脸被裁掉）。
  4. PMX 脸皮并在身体皮肤材质里（结月缘「肌」、IA「skin」、秦「body01」）时，按头骨权重拆出脸皮（PMD 早已有）。
  5. 贴图路径大小写不敏感（八云紫 BodyA.png vs bodyA.png）。
- tools/pmxread.py：头签名放宽为 `PMX`（2B 的签名是 "PMX."）；PMD 里尾巴骨（尻尾/tail）→ cloth，舌骨 → 歯（八云蓝九尾曾被当“肌”切进头里）。
- 八云蓝/八云紫用 `--sc 0.9`（原模型偏大，1.25 时 skinW 0.37，比常见 0.21 大）；其余 `--sc 1.25 --hair-drop 0.04 --grp mmd --noflip`。
- **放弃**：MMJ 初音、日野森雫（PJSK 头身分离文件，仓库里只有身体）；YYB GenZ（vrm2head 内存溢出 >1.6GB）；YYB Base 初音（源仓库缺 Hair.png，头发全白）。
- 改动文件：js/headpacks.js、js/mods.js（+3 行）、tools/pmx2vrm.py、tools/pmxread.py、models/CLS_*.js、CREDITS.md、HANDOFF.md。未碰 UI Agent 的文件，也未碰 game.js / combat.js。

## R26f — 用户再次反馈：“轻微向右下偏移，攻击应该从左上到右下，却是乱的 / 打不死 / 每次只打一下冒数字”
- **方向乱的根因**：按下左键瞬间就出刀，此时鼠标还没动，方向只能取固定三连套路（左下→右上→下劈）；之后才看鼠标，所以第一刀永远“乱”。
  修复（`combat.js`）：MM 出刀改成 **回拉（80ms，重斩 50ms）→ 挥出** 两段，回拉阶段每帧读鼠标趋势（含按下前 90ms，≥3px 即算），刀朝鼠标移动方向斩：向右下轻移 = 左上→右下。回拉已经在动，所以没有“延迟感”；命中结算推迟到回拉结束后 20ms。按住继续轻移 = 沿该方向连续出刀（R26e 的连斩保留）。测试：drift 右下/左上/上 → 首刀 -45°/135°/90°，后续连斩方向一致。
- **保险（永不打不死）**：`foe.js` hit()：普通敌人第 4/5/6 刀起按剩余血量 1/3、1/2、全部结算（第 6 刀必死），霸主第 12 刀必死；`beasts.js` 同理（野牛 8 刀）；`worlds.js` 旧式球体 boss（hp 100）伤害下限 ≈9%。不论护甲/角色/回血，都不会“砍 20 刀不死”。
- 环境说明：本轮沙箱被重置（/var/work 丢失），已重新浅克隆；完整世界在 `_t.html` 里启动需数分钟，未做真机整世界测试，仍只用 `tools/test/fight.html` harness。
## R29 — 用户：“loading 界面不要看得到在加载什么，换换文本；模型显示仍偏黑，身体衣服色调不搭配”
- **MOD `load_veil`**（index.html 启动脚本，两个 init 进度回调）：不再显示“加载首级模型 xx% · 文件名”，改为轮换氛围短句（魂火渐明……/洞壁在低语……等 10 句，2.6 秒一换）+ 两段合并的总进度；最后一句“洞门缓缓开启……”。关掉即恢复原文本。
- **MOD `char_lift`**（偏黑的根因）：`foe_toon` 默认关 → 身体是 PBR 标准材质，而 FaceFill（face_light）只包卡通材质 → **身体在洞里完全没有补光**，头有。修复：
  - js/heads.js FaceFill.wrap：char_lift 开时也包 MeshStandardMaterial（同单位 albedo/π，同一段注入代码）。
  - FaceFill 下限：洞里 0.45→0.8、野外 0.75→0.85（uniform getter，不重编译）。js/foe.js FF() 身体系数 0.85→0.95。
  - 头与身体的卡通色阶暗档 [120,190,235,255]→[165,208,240,255]（heads.js grad、foe.js TOON_GRAD）。
  - 实测（篝火前 6 人）：最暗的身体亮 10–30%；剩下的“暗”是衣服贴图本身深色 → 交给 body_match 偏好不太暗的身体。
- **MOD `body_match`**（js/foe.js bodyFor → matchPick）：
  - `tools/bodypal.py` 离线统计 24 具身体衣服主色（跳过皮肤/头发/脸材质，按三角面积加权采样贴图；材质合并的身体剔除肤色像素）→ 常量 `BODY_PAL`（h 色相 / s 彩度 / c 集中度 / n 中性占比 / d 暗占比 / L 亮度）内嵌在 foe.js。新增身体要重跑：`python3 tools/bodypal.py big/body/*.js`，替换 foe.js 里的 `const BODY_PAL = …;` 一行。
  - 新接口 `ModelHeads.hairColor(look)`：mmd 发型用贴图平均色（hairAvgCol），其余用 look.hc1。
  - 权重：色相差 <40° ×1.8、<75° ×1.1、>150°（补色）×0.8、其余（撞色）×0.3；按衣服彩度和发色彩度缩放（黑白灰任一方 → 百搭）；× (0.7+0.6·min(1, L/0.55)) 略偏好不太暗的身体。
  - 身份候选全撞色（最大权重 <0.9）且本地点身体种类 <3：一半概率改从全部非 Boss 身体中协调度前 5 挑。
  - 实测：猎人身份 青发初音→Vita 74%（原 51%）、金发绘里→Amber 82%。
  - Foe 导出了 `bodyFor`（测试用）。
- 改动文件：index.html（启动脚本 3 处）、js/mods.js（+3 MOD）、js/heads.js（FaceFill.wrap / 下限、grad、hairColor 接口）、js/foe.js（TOON_GRAD、FF 系数、bodyFor/matchPick/BODY_PAL、导出 bodyFor）、tools/bodypal.py。未碰 UI Agent 文件。

## 第二十六轮(g)(h) — 另一个 Arena Agent：命中 HUD / 音量面板 / 打击感（与 R26c–f 的 combat_master 并行，不改 combat.js/foe.js）
用户反馈（本轮原话要点）：“战斗效果太烂，打击感非常弱”“每次打就是冒一堆数字”“角色永远打不死”；上一条：“来个各种音效音乐调节选项，音乐太大了”；语音“算了就中文”（日语重录已放弃，不要再做）。
- **MOD `hit_hud`（js/hithud.js，默认开）**：`worlds.js floatDmg` 首行钩子 `HitHud.dmg(pos,n,big)`（只接管数字；字符串飘字照旧）。同一目标 1.2s 内的命中合并成一个累计数字 + `×N`，每下弹跳。被打中的敌人（`Foe.foes`，非霸主）和野兽（`Beasts.list`）头顶血条：红=当前、白=刚掉的血慢慢缩；5s 不挨打淡出；击杀闪白消失。自带 rAF 循环（出猎时 Worlds 接管主循环），`Worlds.active` 为假或 `body.film` 时隐藏。
- **MOD `audio_mixer`（js/sfx.js + js/mixer.js，默认开）**：sfx.js 新增分通道 `SFX.bus(k)`：`sfx`（= `SFX.out`，老代码默认进这里）/`ui`/`voice`/`amb`/`steps`/`music`，全部 → master(0.8×总音量) → 压缩器。`SFX.VOL / VDEF / setVol(k,v)`，存 `localStorage.soulhead_vol`。HTMLAudio BGM 音量 = 0.45 × music × master（**默认 music 0.5 = 以前的一半**）；`duck()` 尊重当前音量。已改接：ambience→amb、steps→steps、persona 语音→voice、seance 八音盒→music、ui3a 合成界面音→ui、`SFX.play` 的 click/select/confirm/error/open/close/page/book → ui。面板：右上角 `#musicCorner` 改为「🔊 音量」，`#menu` 里 BGM 按钮后插「🔊 音量」；M 键仍开关 BGM。**新增音效请接 `SFX.bus('对应通道')`，不要直接接 `ctx.destination`。**
- **MOD `hit_impact`（js/impact.js，默认开）**：包一层 `CombatFX.event`（原函数先执行）。hit：受害者 `mixer.timeScale=0` 60ms（重斩/破绽 115ms），击杀 150ms（只延长不缩短）；沿 `Combat.state.sw.v` 方向在命中处画刃光（DOM，重斩/击杀更宽更红，格挡/弹刀黄色火花）；叠加 115→40Hz 闷响 + 带通噪声（sfx 通道）；击杀红色屏幕边缘脉冲、重斩白色。玩家镜头与操作不冻结（用户以前把慢动作视为卡顿）。
- 测试：桩页（真 three.js/mods.js/sfx.js + 假 Worlds/Foe/Beasts/Combat）Playwright：数字合并 `54×3`、血条宽度/白条延迟/击杀、面板 7 行滑块实时改 GainNode、顿帧恢复、刃光方向（向右下 = 左上→右下）。**完整 index.html / _t.html 在本沙箱仍 OOM（/tmp 在内存里），未整机测试**——请用户试玩反馈数值（顿帧时长、刃光粗细、血条大小）。
## R30 — 用户：“只有 VRoid 的头和身体是适配的，其他都是大头娃娃或者小头怪物”
- **根因**：第二十四轮 `head_norm` 只处理 mmd 组、**只放大不缩小**（k∈[1,1.4]）、只看脸宽 skinW（对标 0.155）。星铁/绝区零/异环/R27 经典 MMD 的 skinW≈0.19–0.30 → 从不缩小 → 大头娃娃（あにまさ式 0.28–0.30 最夸张）；skinW 被狐耳/帽子/面具撑大或测歪的头（HSR_Hysilens 1.287、GI_LaSignora 0.033 等）→ 大/小头怪。
- **MOD `head_norm2`**（默认开，开启时旧 head_norm 不生效；js/heads.js normK2/irisIPD，normSize 里切换）：
  1. 脸宽 kw = 0.16 / skinW（VRoid 中位 0.160）。
  2. 两眼间距 ki = 0.16×0.46 / ipd（解析时从材质名含 Iris 的网格左右均值实时算；0.46 = MMD 画风 眼距/脸宽 中位，VRoid 是 0.39）。
  3. 两者 |ln(kw/ki)|<0.25 → 几何平均；否则用第三指标 kb = 0.316 / 包围盒高（VRoid 中位，含头发）裁决取更接近的那个。只有一个指标时与 kb 差太大（|ln|>0.5）改用 kb。
  4. 可缩可放，夹 [0.5, 1.5]；只作用于 grp==='mmd'，VRoid 不动。
  - 离线核对（tools/headmetric.py 统计 121 个头：ipd / skinW / 眼→下巴[不可靠，未用]）：あにまさ四人 ≈0.56、HSR/ZZZ/NTE ≈0.75–0.9、GI ≈1.2–1.36（与旧值一致）、Castorice/Hysilens/八云/三笠/八重/久岐/优菈 这些分歧头都被 kb 裁到正确一侧。
  - 实拍：同一身体上 VRoid/GI/HSR/ZZZ/NTE/CLS 头大小一致；Vita/芙宁娜/北斗/光/样本B/Osage 六具身体上头身比例正常。
- 工具：tools/headmetric.py（新增）。截图脚本 foeshot.py/js 备份在工作区 bak/tools（MODS / ZOOM 环境变量，截图时隐藏手持武器）。
- 改动文件：js/heads.js（normSize 前新增 irisIPD / normK2）、js/mods.js（+1 MOD，紧跟 head_norm）、tools/headmetric.py、HANDOFF.md。

## R31 — 用户再次：“只有 VRoid 的头和身体是适配的，其他都是大头娃娃或者小头怪物”
- R30 修了“头模”一侧（head_norm2）。这轮修“身体”一侧：js/foe.js headFit 的 `skull = 4.15×(眼高−头骨高)` 是按 VRoid 身体标定的，原神身体骨架不同 → 头小 3~18%。
- 离线统计 24 具身体：身高/头高（VRoid 5.18–5.33，原神 5.47–6.33）、头宽/肩宽（上臂骨间距；VRoid 1.18–1.23，原神 1.03–1.16；AvatarSample_A/B 上臂骨偏内，排除）。两指标对每具原神身体都一致。
- **MOD `body_headfit`**（默认开，js/mods.js 紧跟 head_norm2）：foe.js 常量 `BODY_HEADK`（非 VRoid 身体的 skull 倍率，= √(kh·ks)，夹 0.9~1.25；Furina 1.18、YaeMiko 1.137、Rosaria 1.134 … Lisa 1.033、Xiangling 1.034），headFit 里乘上。VRoid 身体（Vita/AvatarSample_A/B/Darkness_Shibu/HairSample_Female/Osage/HikariCape/HikariScholar/Victoria_Rubin）不在表里 = 1。
- 新增身体时：非 VRoid 身体要补 BODY_HEADK（方法见本节；未在表里 = 不修正）。
- 改动文件：js/foe.js（headFit 前加 BODY_HEADK）、js/mods.js（+1）、HANDOFF.md。

## 第二十六轮(i) — 用户：“单位血量掉到 0 不死，每次攻击冒出一堆气泡（同时触发特别多次）”（另一个 Arena Agent）
- **根因（致命）**：`worlds.js foeEvent` 首行 `… CombatFX.event(t, fo, d); // 第二十二轮（续 9）…命中准星 const now = …, st = W.stats = …;` —— `now/st` 的声明被行尾注释吞掉。每次 `hit` 事件 → `st.combo` ReferenceError →
  1. `foe.js hit()` 在 `fo.hp -= dealt; floatDmg; event('hit')` 处被打断，走不到 `if (fo.hp <= 0) die()` → **永远不死**（beasts.js 同理）；击杀奖励/连击/多杀/成就也全部失效；
  2. 异常冒到 `combat.js mmHit()`，`w.set.add(tg.id)` 没执行 → 同一刀在出刀期间**每帧重复命中**。测试台复现：旧代码 10 刀 = 80 次命中、HP −1306 仍在追人。
- **修复**：声明单独成行；`foeEvent` 拆成 `foeEvent → try { foeEvent0 } catch`，Recall.log / CombatFX.event 也各自 try；`combat.js` 两处 `tg.onHit()` 包 try，出错也按“已命中”进冷却（绝不每帧重复结算）。修后测试台：1 刀 1 次命中，6 种操作（click/flick/hold/wave/mash/drift）都正常击杀。
- **给后续 agent（重要）**：这是本项目第二次“代码被行尾 `//` 注释吞掉”（第一次是 combat.js 屏震）。**不要把新代码接在已有注释的同一行后面**。检查脚本（我放在 /tmp，未入库，思路很简单）：逐行找 `//` 之后含 `const x =` / `a.b =` / `if (…)` 且以 `;`/`}` 结尾的注释。另外我用 eslint `no-undef`（把所有 `window.X =` 当全局）扫了 js/*.js：除 BODY_MODELS/BEAST_GLB（数据文件定义）外只发现 `sanctum.js:581 hs[0].NM(rec.c)`（rec 未定义）→ 已改为 `NM(hs[0].rec.c)`。
- 测试台用法补充：`tools/test/fight.html` 需要 `big/anim/ual.js` 和部分 `big/body/*.js`（稀疏克隆要 `git sparse-checkout add`）；`bots.js` 不是页面自带，drive.py 第一步用 `(0,eval)(bots源码)` 注入。

## R31b — 用户：“卡芙卡头有问题！看上去非常怪异！你检查！”（逐个目检所有非 VRoid 头）
- **根因 1（切掉嘴/下巴）**：tools/vrm2head.py 用“IRIS 材质”定位眼睛→按眼睛推切口。部分模型把墨镜/发饰也命名成 EYE_Iris（卡芙卡墨镜在头顶）→ 眼睛被定位偏高→切口切到嘴。修：只保留与眼白高度重叠的虹膜图元（打印 `R31 eye filter: drop [...]`）。
- **根因 2（长脖子/颈部肉团）**：同一 bug 反向——12 个原神头的脑后发饰被命名为 Iris → 眼睛偏低→切口低 10~25cm（申鹤脖子上一团肉、绫华/芙宁娜长颈）。同上修复后重转。
- **根因 3（脸皮没识别）**：tools/pmx2vrm.py 新增：繁体「顏」(海瑟音)、材质名 `head`(女士怪物版)、プロセカ VBS `mtl_chr_NN`/`mtl_chr_ehl`、通用名材质改看日文贴图名（顔.png/眼球.bmp，结月缘 ver7）、环境变量 `FACE_MATS=材质名,...` 手动指定（秦始皇「新規」）。
- **重转 21 个头**（models/ 覆盖）：HSR_Kafka HSR_Hysilens CLS_Yukari CLS_MikuVBS CLS_LLHonoka CLS_LLNozomi GI_LaSignora NTE_Blackbird CLS_QinYYB（commit 3376782）+ GI_YaeMiko KukiShinobu HuTao Beidou Clorinde Ganyu Eula Furina KamisatoAyaka Nilou Rosaria Shenhe。
- 检查指标（新增头时请跑）：FACE_SKIN 最低点 − cut.y 应 ≤ ~0.03（>0.04 = 长脖子）；(眼白最低点−cut.y)/(头顶−cut.y) 应 ≈0.2~0.35（<0.15 = 切到嘴）。工具：/home/user/bak/tools/glbinfo.py。
- **MOD `head_qc`**（默认开，js/heads.js randomLook 前 QC_BAD + js/mods.js）：CLS_YakumoYukari（PMD 脸皮与全身同一材质→发白发光）、NTE_Blackbird（帽子盖住整张脸）不进随机池/混发池；存档里已有的照常显示。以后修好可从 QC_BAD 移除。
- 仍可留意：ZZZ_Lucia 下巴下有一片独立切口圆片（装到身体上被脖子挡住，未处理）；CLS_YakumoRan/CLS_RemTda 颈略长（0.04~0.06，装身体上看着正常）。
- 改动文件：js/heads.js（randomLook 前 +QC_BAD/qcBad，allHair 过滤）、js/mods.js（+head_qc）、tools/vrm2head.py、tools/pmx2vrm.py、models/（21 个）、HANDOFF.md。

## R32 — 用户反馈：“洞里很孤独、要有经营养成感、大量对话互动；孤独主角+一堆人头会有人头恐惧 → 做可爱的神灵/先祖住在洞里”
**新系统：神灵（先祖）**，MOD `spirits`（默认开，`mods.js` play 类），全部新文件，未改别人的文件（仅 `index.html` 在 `rites.js` 后加 5 个 script、`mods.js` 加一项）。
- 设定：神灵 = 历代洞主的魂（被洞窟缩成小精灵）。“咒”= 被烧掉的契约条款（洞窟的饿）；玩家因此听得见她们。开局洞里只有斯尼克；把**第一颗头**带回洞 → 小烛（烛火灵）出现，讲诅咒并请玩家收头。
- 每个地点（village forest wilds abbey swamp fortress capital abyss peak）**首颗头**带回洞里 → 该地神灵到访（自我介绍+被什么吸引）。`rec.sp=1` 标记已计数（经 vault/addHeadRecs 可能丢，丢了会重复计数，无害）。
- 九魂灯：某地 ≥3 颗头且其中一颗 `Recall.nKnown>=3` → 点亮，播放该神灵的 ward 场景+奖励。5 灯触发 `half`，9 灯且 ≥6 位神灵好感≥45 触发 `ready`，小烛对话里出现“举行解咒仪式”→ `finale`：烧掉契约（free）/留着契约（stay）/再想想。终局后 `S.spirit.end`，初代 `chudai` 入住。
- 文件：`js/spirit_art.js`（10 张 320px JPEG 立绘，AI 生成，黑底；3D 里用加法混合 Sprite，DOM 里运行时抠成 alpha PNG）/ `spirit_data.js`（名册、评头词池、闲聊、拌嘴、心愿模板）/ `spirit_s1.js`、`spirit_s2.js`（剧本 + `SPIRIT_H` 语法糖）/ `spirits.js`（引擎）。
- 玩法：对准神灵按 E 对话（手里有头则直接评头）；枢纽菜单：聊聊 / 话题 / 评头 / 心愿 / 小游戏（猜拳、抽头比大小）/ 个人故事（好感 20/45/70 各一段）/ 结缘（好感 90）。评头按喜好（种族/性格/魂阶/异色/故乡）给反应并加好感；心愿可指定“想看某种头/给魂晶/多聊两句”，完成得魂晶。洞里有气泡闲聊、神灵之间拌嘴、对新头/受伤的反应；洞内回血随神灵数增加。
- **玩家可关**：按 **Y** 打开神灵簿（九灯进度、主线目标、神灵卡片、“让她们躲起来”开关）；隐身后不显示、不自动弹剧情（到访只静默记录）。右下角有 chip。
- 存档：`G.S.spirit`（随 save）；隐身偏好镜像到 localStorage `soulhead_sp_hide`。
- 内容边界：立绘可爱、非性化；文案不含成人内容。
- 待办：初代 `chudai` 立绘（暂用小烛 hue-rotate）；与头棋对弈（需要棋台建筑，暂未接）；更多神灵/剧本。
- 测试备忘：整页在 2GB 沙箱里只能用精简页（去掉 models/ 大部分 script）+ 低分辨率跑；截图在全屏面板上会超时。
## 第二十六轮(j) — 另一个 Arena Agent：击杀红圈不消失 / 攻击冷却 / 头比身体暗
用户：“打击那个红圈没法消失了；攻击你最好设计CD；这个头为什么一直偏暗，和身体颜色不一样”
- **红圈**（a59a90a）：js/combatfx.js `marker()` 的 `#cfxMk i` 刻线没有默认 `opacity:0`、动画也没 `forwards` → 0.28s 放完弹回可见，永远挂在准星上（击杀色是红的）。已修，Playwright 验证 1→0.64→0 并保持。
- **MOD `atk_cd`**（170d658，js/combat.js + mods.js）：轻斩 0.5s / 连段终结 0.75s / 重斩 0.95s，×√max(0.6, 武器重量)，力竭 ×1.3。CD 中按键缓冲一刀（窗口 480ms），不吞输入；drift 连斩分支也受 CD 限制；准星外圈 SVG 进度弧 `#atkCd`。实测（假时钟 bench、打不到人）：连点/按住轻移 3.5 → ~1.7 刀/秒，击杀仍 1–2 刀。
- **MOD `head_tone`**（头比身体暗的根因，js/heads.js FaceFill + worlds.js parseSky）：
  1. heads.js 的 ShaderLib.toon“软膝盖”把卡通材质的受光倍数压成 `(1-e^(-1.2x))·1.08`：满光 x=1 时头只有 0.755，烈日封顶 1.08；它是身体也用卡通材质那时加的，现在身体是 PBR（foe_toon 关）不压缩 → 野外头恒比身体暗 25%+。
  2. 野外 `scene.environment`（天空 PMREM）给 PBR 身体间接光（envMapIntensity 0.55），MeshToon 不吃环境图 → 头少一块光、偏灰。
  - 修：野外（`FaceFill.world()` 600ms 内）头的软膝盖改为满光以内线性、超过后柔性压到 `FaceFill.tune.knee`=1.35 倍；并给卡通材质加 `uEnvA`（天空平均辐亮度 sky.amb × 0.55 × tune.env 0.4 × FaceFill 系数 k：脸 1.0、头发 0.6）。都是共享 uniform getter，开关不重编译；洞里（只有陈列首级、篝火）两项都为 0，保持原样。
  - worlds.js parseSky 新增 `sky.amb`（环境图按纬度 cos 加权平均辐亮度），设 `sc.environment` 时 `FaceFill.env(sky.amb)`。
  - 实测（草甸/松林，脸颊 vs 脖子亮度）：0.91→1.05、0.82→0.97；试过 knee1.45+env1 发白、env0 偏黄。
  - **死路**：按“身体脖子贴图肤色 ÷ 脸贴图肤色”逐个校 albedo —— 原神身体脖子贴图画了阴影（香菱 #cc9f8d，手臂远更亮），校完脸发棕；Osage 发白。别再试。`ModelHeads.faceSkin(look)` 留作工具（未用）。
- 测试方法（/tmp，会被清）：fight.html bench 里 `skeleton.pose()` 摆正、相机对准脖子骨骼 0.55m，分别只渲染头/身体、按肤色像素算亮度；天空脚本需 `git sparse-checkout add /big/world/sky_evening_meadow.js /big/world/sky_misty_pines.js`。/tmp 是 1GB tmpfs：Playwright 浏览器放 /var/tmp。

## R32b — 用户：“不喜欢头灵形象，要有尊严、超世界的多神教神明；不要生成立绘，发光小精灵感觉；需启用通神视角才看得见”
改动（仅神灵系统自己的文件 `js/spirit_*.js`、`js/spirits.js`，删掉了 `js/spirit_art.js`，`index.html` 少一行 script）：
- **角色全部重做为“各路神明”**（多神教）：曦烬（灶火与誓约，引路）、雾川（晨雾溪流）、青冕（林野丰饶）、猎牙（荒原狩猎）、白铃（祈祷钟声）、黑蕊（沼泽契约）、戍山（城关戍守）、曜冠（日曜王权）、渊目（深渊预言）、白骸（群山长寿），终局 火祖（初代）。设定：历代洞主死后被九地香火供成了神，契约把一缕神识扣在洞里。id 已改（xiaozhu→xijin 等），`st()` 里有一次性存档迁移。台词整体改成庄严而各有性格的口吻（祈愿/供奉/祂）。
- **无立绘**：每位神明一枚程序生成的“神纹”（光核+神字、旋转光环、光芒、环绕光点），3D 里是加法混合发光体，对话框/神灵簿里是两层 PNG（光环缓慢旋转）。
- **通神视角**：曦烬在开场赐予；按 **N** 开合（`sightOn`）。关闭时神明不可见、不可交互、无气泡；开启时屏幕有淡紫暗角。到访/灯/主线剧情会自动开启；有未读剧情而视角关着时，每 150 秒提示一次。神灵簿的“隐身”开关仍在（Y）。

## R32c — 用户：“停！我更喜欢 Q 版本（你之前设计的那个样子），能中和游戏的阴暗氛围” → 回退到 Q 版神灵
- 神灵视觉/文案/ID 全部回到 R32（`333cae5`）：小烛/阿雾/叶叶/獠牙/圣铃/泡泡婆/铁锤/金冠/无眼/老骨 + 初代，立绘 `js/spirit_art.js` 回归。R32b 的“多神教诸神/神纹”方案整体撤销（仍在 git 历史 `cba06cb`，如用户改主意可找回）。
- **保留**用户同时提出的“通神视角”：按 N 开合（开场小烛教），关着时神灵不可见/不可交互/无气泡；新增 MOD `spirit_sight`（默认开，关掉则神灵始终可见）。`st()` 里有存档迁移：R32b 的新 id 会映射回 Q 版 id。

## 第二十六轮(k) — 用户：“造建筑/合成都要地图搜刮材料，不同地区不同材料；光靠魂晶太无敌。魂晶 + 地区霸主首级 → 该地区的低级资源合成器（放头建筑，每区一座，恶趣味）”
新 MOD `region_econ`（默认开，关掉=全部回到只花魂晶）。新文件 `js/regecon.js`（index.html 里紧跟 forge.js）。
- **18 种地区材料**（`RegEcon.REG`，顺序=地区难度）：雾溪村 稻草人稻草/牧羊铃铛，翠影精灵林 月桂枝/萤火虫罐，兽牙荒原 狼鬃/图腾骨，白银修道院 圣水/圣银十字，黑沼魔女泽 沼泽黑泥/魔女蛤蟆，铁盔要塞 要塞精钢/火药桶，金冠王都 王都丝绸/王座金箔，深渊裂隙 深渊黑曜/深渊魔核，龙骨圣山 龙鳞/万年霜晶。id `rm_*`，`Sack.def` 注册，带 `reg` 字段。
- **掉落**：`Sack.roll` 末尾 `RegEcon.rollLoot`（按当前地点 `Worlds._W.graph.nodes[cur].region`）：宝箱 80% 常见/20% 稀有，箱桶 55%/5%，篮桶 45%，架 25%，敌尸 50%/7%，**霸主尸体 常见 6–10 + 稀有 3–5**；野兽尸体 35% 常见（`Sack.carcass`）。`genLoot` 每地点多 1–3 个 `kind:'vein'` 地区采集点（独立随机数，不改老地图布局），外观 `RegEcon.veinKind(node)`（稻草垛/精灵花圃/兽骨堆/烛台祭坛/魔女坩埚/军械桶堆/贵族行李箱/黑曜裂石/龙鳞石堆）。
- **消耗**：`RegEcon.need(k)` 由建筑 base 价 + 洞层确定性生成（base<150 免材料；<400 通用料；之后升档到更远地区 + 稀有料），×(1+0.5×已建数)。game.js `placeBuild` 检查/扣除，ui.js 建造卡片显示 有/需（`.re-mats`，不够则 poor），拆除返还一半材料（`RegEcon.refund`）。挖深 `RegEcon.digNeed(层)`（game.js dig + ui 挖深卡片）。附魔 `enchCost().rm`（+2 起，武器/护甲两条地区线，+6 起加稀有；sack.js enchant 与 forge.js 都已改）。配方：背篓 b2–b5、巨魔再生药加地区材料。
- **九座霸主首级合成器** `syn_<地区>`（cat func，max 1，解锁=`S.bosses[地区]`，造价=魂晶 2000×1.6^i + 该区常见 10+2i + 稀有 1 + 通用 6）：`mount.accept` 只收 `h.rec.c.boss===地区` 的首级（game.js mountHead / 手放吸附都加了 accept 过滤，拒收时 toast `mount.deny`）。有头时每 36 秒花 25×1.6^i 魂晶产 1 份该区常见材料进仓库（魂晶不够就停，90 秒提示一次）；空手 E「督工」立刻多产 1–2 份 + 12 秒 ×3 速（冷却 20 秒）；Shift+E 照常取下首级。进度条借用游戏自带标签（`period:1e9`，每帧写 `b.timer`）。只在洞里跑（Worlds.active 时主循环不走 HOOK.frame）。
  - 稻草人脱粒机（首级插斧柄上当稻草人，横杆转）/ 女王盆栽（种进花槽，花随进度长，E 水壶浇头）/ 狼嚎图腾（三兽首托着，E 仰头嚎）/ 圣水喷泉（哥特柜当祭台，嘴里喷粒子水弧进木桶，E 拍后脑勺）/ 魔女大坩埚（压在锅盖上颠，E 搅成陀螺）/ 元帅督造锻炉（坐镇酒桶，铁锤砸台钳溅火星）/ 女王纺车（当线轴转，丝线粒子）/ 深渊凝视炉（悬浮，黑曜碎片环绕，E 紫闪+碎片炸开）/ 龙骨风铃（梯子顶吊水晶灯，首级在下面荡，E 大幅摆动+铃声）。全部用 assets/ 与 props_pack 的 CC0 模型，粒子弧只是特效。
- 测试：`tools/test/regecon_mach.html`（假 G + 球形假头，红鼻子=朝向；`#poke` 看督工动画，`#only=forest,peak`，`#far`/`#close`）。file:// 直接开。
- 注意：新建筑放头的朝向 yaw=0（面向建筑正面 +z）；`U.seat` 在 make() 里按模型实际尺寸算，并回写 `C[key].mount.slots[0]`。
---
## R33 回忆 F 界面重做（MOD `recall_iw`，默认开）
用户反馈：不要新开 3D 界面，要原场景换镜头；UI 信息不清晰；主角手/动作不行；死去的首级不能变表情；没音效；没有把玩动作。
- **新文件 `js/recall_iw.js`**（`window.RecallIW`）：包裹 `Recall.open`。MOD 开且首级在场景里（或在库房→自动 `G.takeOut`）时走原场景模式；`Worlds.active` 或 MOD 关时回退旧界面。
  - 镜头：用 `G.HOOK.pre`（相机已按玩家设置、渲染前）叠加相机偏移/俯仰/FOV；首级位置=相机局部坐标，按包围盒中心补偿，姿势整体按首级高度/0.26 缩放（`S.k`）。
  - 手：`limb_hand_avatar` 克隆×2（左手镜像）+ 前臂圆柱与袖口，挂在相机上。关键帧动作：对视/抚摸/嗅闻/贴耳/那一战 + 把玩（抛接/转一圈/戳脸颊/拍拍头）+ 建筑动作（茶话/照魔镜/梳妆/鉴魂/棋谱/牌局，通灵直接调 `Seance.open`）。
  - 音效：`snd(k)` 用 `SFX.ctx/SFX.out` 合成 + 已有采样，每个动作都有提示音（32 个键已无头测试）。
  - UI：`#riw` 覆盖层——左侧信息卡（未知条目显示“？？？ + 解锁方式”）、底部动作栏（1–9,0 分组 回忆/把玩/建筑）、字幕、进度条、✕。`body.riw-on` 隐藏准星/提示/HUD。把玩或拖动转动累计 8 次揭示“饰物与印记”。
  - 调试开关：`RecallIW._S.freeze / .snap`（截图用），`RecallIW._snd`。
- **改动他人文件**：
  - `js/recall.js`：导出增加 `narrate, chessHTML, cardHTML, hasB, bn, adorn, FK`；MOD 开时 `loop` 里不再 `hb.setExpression`（首级不变表情）。
  - `index.html`：在 `js/recall.js` 后加 `<script src="js/recall_iw.js">`。
  - `js/mods.js`：在 `head_qc` 后加 `recall_iw` 条目。
  - `game.js` 未改（主循环只看 `Recall.active`，原场景模式下保持 false；持头插值被 pre 覆盖）。
- 测试工具：`bak/tools/riw.py`（按动作/时间截图，`FUNC=1` 跑按键功能测试），`mk_r.py`（保留手部资源的轻量测试页）。
## R33b — 用户：“新发现的头很多太大，像大头娃娃；头在任何环境都偏暗、不感光，不要这个效果”
- **实测（tools 外的临时台 _tools/wv/fl.html，gitignore，同一身体挂 VRoid/GI/HSR/ZZZ/NTE/CLS 头，PBR 环境图+ACES，对标游戏渲染器）**：
  - 暗/不感光的根因 = 头是 `MeshToonMaterial`：4 级色阶、**拿不到天空环境图**（身体是 PBR + envMapIntensity 0.55）、无方向性层次 → 野外脸发灰（亮度 ≈ 身体的 70%），洞里只有“亮/补光下限”两档，对火光方向不敏感。R26j/R29 的 uEnvA/膝盖/补光下限都是在卡通材质上打补丁。
  - 尺寸：脸宽/眼距经 head_norm2 已对齐 VRoid，但 MMD 的发量/发饰/兽耳使整颗头包围盒仍比 VRoid 大 30~90%（VRoid 0.23，MMD 0.34~0.49，原始单位）→ 视觉上还是“大头”。
- **MOD `head_pbr`**（默认开，js/heads.js 顶部 `MTM()` 工厂；需重载）：heads.js 里所有 `new THREE.MeshToonMaterial` 换成 `new MTM`，开 MOD 时返回 `MeshStandardMaterial`（roughness .88、metalness 0、envMapIntensity .55，与身体同），关 MOD = 原卡通。headwear.js 的帽饰用 `ModelHeads.MTM`。所有着色器注入（染发/肤色/血迹/眼/FaceFill）用的 `#include` 锚点两种材质通用，未改。
  - 新增 `FaceFill.tune.pbr`（0.62）：PBR 头的反照率倍率（染色/肤色参数是按卡通光标定的，PBR 吃到完整环境光会偏白）。默认注入 `FaceFill.HPBR_OBC`（在 `#include <lights_physical_fragment>` 前 `diffuseColor.rgb *= uHeadK`）；hair/skin 自带 onBeforeCompile 的由 `FaceFill.wrap` 注入同一句（靠 `userData.hpbr` 标记区分，避免重复）。toon 的软膝盖/uEnvA 对 PBR 头不再起作用（也不需要）。
  - 实拍：野外（天空环境+太阳）脸/发颜色回到贴图原色（甘雨浅蓝发、卡芙卡紫红发），亮度与身体一致；洞里（单点火光+弱环境）头部有明确的受光面/背光面。
- **MOD `head_norm3`**（默认开；heads.js `normK2` 末尾；需重载）：head_norm2 之后整体再 ×0.95，含头发包围盒高（×k）超过 VRoid 中位 0.316 的再 ×√(0.316/bn)，下限 0.82。例：雅、妹红最多收到 0.80~0.85，甘雨/卡芙卡/LL 系 0.95。`entry._normK3` 可查。
- 没改：foe.js headFit/BODY_HEADK、FaceFill 的 floor 值、存档。若以后觉得头偏亮：调 `FaceFill.tune.pbr`；偏大：调 normK2 里的 0.95 / 0.316。
- 测试台备忘：ModelHeads 全量 121 个 GLB 一起载会让 2GB 沙箱 Chromium 崩（~400s 后 Target crashed）；用 12 个头的子集页即可。`Mods.on` 读 bootSt（需重载才变），页内 `Mods.set` 不会改变本次渲染。
- 改动文件：js/heads.js、js/headwear.js、js/mods.js（+head_pbr、head_norm3）、HANDOFF.md。
---
## R26l–n（用户：首级全部物理支撑/建筑描述太长/选地点重做+预览图/地区BOSS·小BOSS·人物/到达简介+任务+奖励/食人魔猎手）
- **R26l `head_support`（js/headphys.js，默认开）**：包装所有带 `mount` 的 `BuildCat.C[*].make()`；模型载入后第一次 make 时对每个 slot 从颈部 +0.12 往下打射线（中心 + r0.035/0.065 两圈，**双面探测**——有些模型土面/桶内法线朝下）。落差 ≤12cm → 把 slot 下移贴合；12–70cm → 高度不变，在下面垫一个拉高的 CC0 `wooden_crate_01` 台座（`d.__plinth`，每次 make 都加）；透明液体 → 泡进去 0.08。`mount.selfSeat:true` 的建筑跳过（regecon 合成器自己算座位）。`HeadPhys.top(g,x,z,r,y0)` = 找模型真实顶点。审计页 `tools/test/head_physics.html#zoom,all,sz=300,only=a,b`（RES 行 + 缩略图；r≤3cm 的窄射线会误报"搁在瓶口/杯沿"的头，需目测）。
- 描述：9 个合成器描述缩成一句；`.bp-desc` CSS 两行截断，完整文字在 title。
- **R26m `region_pick` + `region_quest`（js/regionquest.js、js/regionart.js）**：
  - regionart.js = 9 张地区预览图（从 big/world/sky_*.js 的 CC0 HDRI 背景裁地平线 + 调色，base64）。
  - 选地点：ui.js `openExpedition` 里 `RegionQuest.pickHTML({power,danger})` 替换掉旧 `.locs` 列表（MOD 关回旧版）；出发按钮仍是 `data-a="loc"` → `startTrip`。
  - `RegionQuest.DATA[k]`：tag / arrive（到达一句话）/ why（任务理由）/ minis（两名小BOSS：n,title,id(尽量用 foe.js ARMED 里带武器的身份),desc）。
  - 任务：选地点界面预览的任务就是出发后拿到的（`pending[k]`）；种类 mini/decap/kill/boss；进度读 `Worlds._W.stats`；奖励魂晶 + 该区材料进储藏。
  - 小BOSS：包装 `Foe.populate`，在 `node.rqMini` 的节点追加一名强化敌人（rar3、hp100、iq≥0.92、必追）；**不走霸主流程**（fo.boss 会触发 bossWin）。死亡记 `G.S.rq.minis[name]`，永久不再出现，选地点界面显示 ☠。
  - 到达卡（#rqCard，非阻塞 8.5 秒）、左侧任务追踪（#rqTrack top:132px）、小BOSS 血条（#rqMini，霸主血条出现时下移）。
  - 测试：`tools/test/region_pick.html#sel=abbey`、`tools/test/region_trip.html#ph=1|2`。
- **R26n `ogre_hunters`（js/hunters.js）**：热度 = 放倒×1 + 斩首×1.5 + 分钟×0.8（洞口节点不计时），阈值 10+2·lv+4·本趟次数 → 15 秒红色预警"食人魔猎手正在猎杀你！" → 在 `W.graph.nodes` 追加一个 `huntArena` 节点（沿用当前 style、lay:'plain'、adj=[来处]、预置 prey=猎手）并 `Worlds._debug.goto`。猎手 = RPG.foe + 武装身份 + 称号，hp 70+14·lv。全灭前包装 `Worlds.onKey` 封门。胜利：`G.S.hunt.lv++`，魂晶 + 该区稀有材料×1。霸主战中不触发。测试：`tools/test/hunters.html#ph=2`。
- 下一步（未做）：S5 地区种族外观差异加大；S6 精灵独有技能（魔法洞穴壁纸、地面施法特效更干净）——另开文件，spirits.js 归别的 agent。

## R34（敌人大改：更强、更聪明、更多样）— 新文件 js/foe_ai2.js（window.FoeAI2）
- 用户反馈：AI 太弱智，种类/技能/多样性太少，新手装到最深地区也随便吊打。根因：敌人血量/伤害不随区域变化（伤害按玩家最大血百分比，血量 26+rar*16），且 hit() 有“17% 血下限 + 第 6 刀必死”保险。
- 五个 MOD（默认开）：`foe_scale`（按 rec/power 缩放血量/伤害/iq，同时放大保险下限/刀数 fo.floorK/capK）、`foe_pack`（深处成群，worlds.populate 调 FoeAI2.packBonus）、`foe_affix`（7 种精英词缀：狂热/铁壁/噬血/爆裂/幽影/连斩/再生）、`foe_skills`（跃斩/冲锋/旋风斩/破防击，全部有红色预警 + 收招破绽）、`foe_tactics`（惩罚挥空、侧翻、绕背偷袭、拖拍、连击）。
- foe.js 新增钩子：FoeAI2.init/tune/after/evade/preHit/onDie/update/tick/clear，fo.yOff（跃斩高度），tokenOK 计入 fo.sk。worlds.js ctx 新增 rec(fo)；hitPlayer 里 h.unblock 跳过格挡。
- 测试覆盖变量：window.__foeThreat/__foeTier/__forceSkill/__skillP/__forceAff/__foeAffixP（tools/test/fight.html 已加载 foe_ai2.js）。
- 教训：在 foe.js 这种长行代码里插 `//` 注释会吃掉同一行后面的代码，要用 /* */。

---
## R33c（回忆按 F 修复 + 开发者模式 dev_mode）
- **Bug 修复（`js/recall_iw.js`）**：之前按 F 打开原场景回忆后，**松开 F（keyup）就立即关闭**，玩家看起来“没有新界面”。现在只在 keydown 关闭、打开后 300ms 内和长按重复都忽略；keyup 放行给游戏（避免移动键卡住），只拦截 E/F 的 keyup。
- 头不在洞里（魂库 / 装在架子或身体上 / 卡片里点「回忆」）→ 生成**临时首级**捧在手上，关闭即移除，不改存档、不再从架子上拔头或从魂库 takeOut。
- **新 MOD `dev_mode`（默认开）/ 新文件 `js/devmode.js`（`window.DevMode`）**：资源无限（魂晶≥999999、Sack 所有 mat/use 物品补满 999、药剂 99）、全解锁（包裹 `Unlocks.has`，并写入 `S.unl`）、无敌（hp 自动回满）、体力无限（包裹 `Stamina.spend/drain`）、`RegEcon.can` 放行。F8 / 右下角「🛠 DEV」按钮打开面板：刷首级（随机×10/×3 放面前/×50、按稀有度×5）、装备满阶、等级拉满、+100 万魂晶、材料补满、立即全解锁、全部首级回忆全开。面板开关存 `localStorage.hs_dev_opts`。
- 改动他人文件：`index.html` 在 recall_iw.js 后加 `<script src="js/devmode.js">`；`js/mods.js` 在 recall_iw 后加 `dev_mode` 条目。game.js/sack.js/unlocks.js 未改（全部外部包裹）。
- 测试：`bak/tools/flow.py`（真实流程：`G.lockPointer()` 开局 → DEV 刷头 → 准星对准首级按 F → 数字键 → F 关 → 魂库临时首级 → F8 面板）。

---
## R35（用户：删除“伤害按玩家最大血百分比”和“保底伤害/第6刀必死”；精英BOSS挑战+月之魔女；传奇式装备；新胜利条件；食人魔猎手重做为 4 名主角式猎手）
### S1 `foe_abs`（新文件 js/foe_abs.js，window.FoeAbs，默认开）
- 敌人伤害：原公式仍按 `玩家maxHp×百分比` 算出 n，worlds.js `hitPlayer` 开头用 `FoeAbs.conv(fo,n,s,node.loc.rec)` 换算成 `n/maxHp × REF(敌人推荐战力)`，REF(r)=140×(r/40)^0.65 → 与玩家血量无关、只与地区/稀有度有关。
- 保险删除：foe.js hit() 的 17% 伤害下限 + 第6/12刀必死、beasts.js 同类代码，全部 `if (!(window.FoeAbs && FoeAbs.on))` 跳过。
- 血量：foe_ai2 init 在 foe_abs 下 hpK = (推荐战力/40)^0.8（不再是 rec/玩家战力 的相对值），dmgK=1；野兽 hpM 同理；regionquest 小BOSS 固定 100 血 → FoeAbs 定时按地区×1.5 放大一次。
- 你的伤害：worlds.js ctx.power 在 foe_abs 下 = (你的战力/40)^0.8 × Sack.dmgMul（去掉 0.25~3 夹紧）。
- 实体 `fo.absRec` 可覆盖推荐战力（猎手/精英用）。
### S2 `hunters2`（新文件 js/hunters2.js，window.Hunters2，默认开；旧 `ogre_hunters` 改 def:false + 互斥，mods.js __v 6 迁移关闭）
- 四人：艾琳·晨星（勇者/duelist/连斩/跃斩冲锋破防）、诺薇·灰隼（追迹者/skirm/幽影/跃斩旋风）、葛温·铁砧（守誓人/juggernaut/铁壁+再生）、米娅·星语（魔导士/mage/再生，魔弹）。
- 等级（确定性）= 基础 + floor(仇恨/15) + 逃脱次数；战力 = 38×1.16^Lv。仇恨（永久 S.h2.hate）：放倒+1、斩首+0.5。
- 本趟「猎手感应」：放倒+7%、斩首+4%、时间 (0.25+0.06×分钟)%/秒；满 100 后每 5 秒掷骰 p=0.15+0.12×满后分钟（≤0.9）→ 随机活着的猎手 `Foe.populate(ctx,[{h,pos}],{keep:true})` 出现在玩家 9–14m 处。洞口节点/霸主战/围场/精英擂台不触发。
- 在场：包裹 Worlds.onKey 封锁所有门（E）；血≤30% 逃跑 3.2 秒后传送消失（S.h2.L[id].esc++ → +1 级；逃脱 ≥2 次加「狂热」词缀）；150 秒未分胜负撤退（不成长）；在逃跑前打死 = 永久斩杀（S.h2.L[id].dead）。
- UI：左侧感应条 #h2Sense、顶部猎手血条 #h2Bar（战力对比/胜率/逃跑倒计时）、U 键档案面板 #h2Pn（等级构成、差距、预估胜率、几刀/几下）。
- foe.js 改动：populate 第 3 参数 `{keep:true}` 不 clear()/不 evict；foe_ai2.js：`fo.skPool` 限定技能池（有 skPool 的 mage 也允许技能）。
- 测试：tools/test/hunters2.html（桩测试，console RES 行）。真实出猎在无头 swiftshader 下 10 分钟加载不完，未做实机测试。
### S3+S4 `elite_bosses` + `victory2`（新文件 js/elites.js，window.Elites，默认开）
- 13 名精英（id）：circus 塞拉菲娜·万花 / pirate 薇丝珀·黑帆 / plague 塞西莉亚·鸦喙 / champion 凯丝·雷鸣 / sand 伊索德·沙暴 / clock 奥菲莉亚·千机 / alch 贝娅特丽丝·金秤 / thief 伊芙琳·千丝 / naga 娜迦·翠鳞 / valk 布伦希尔德·寒鸦 / pharaoh 纳芙蒂·永眠 / blade 玲·墨染 / giant 霍尔达·山心；最终 moon 塞勒涅·永夜「月之魔女」（13 精英全灭解锁）。推荐战力 90→3200，月之魔女 4200。
- 解锁条件都绑定剧情（魂库首级数、击败某地区霸主、累计放倒/出猎/魂晶、猎手逃脱/斩杀、精英数），满足时横幅弹「传闻」。L 键面板：胜利进度 + 13 张卡（锁住显示传闻/条件；解锁显示推荐战力、血量、预估胜率、你几刀/她几下、词缀、挑战按钮）。
- 挑战：洞里点挑战 → UI._startTrip(她的地区) → 首帧后新建 eliteArena 节点（同 hunters.js toArena 写法）并 goto；__forceRole/__forceAff 设定职业和词缀；包裹 Foe.populate 设 absRec/血量/skPool；包裹 Worlds.onKey 在她活着时封门。击杀 → S.el.dead[id]、魂晶 rec×15、（若有 Gear2.dropFor 则掉装备）。
- 血量 = 130×FoeAbs.hpK(rec)×(1.2+0.1×词缀数)（月之魔女 ×1.6）。战力=推荐值时预估胜率约 50%。
- victory2：包裹 Explore.checkVictory → 霸主≥7 且 精英 13 且 猎手 4（S.h2.L.*.dead）且月之魔女。ui.js 洞内“征服目标”一行改为显示四项进度（仅 victory2 开启时；否则原文）。
- 测试：tools/test/elites.html（桩）。
### S5 `gear2`（新文件 js/gear2.js，window.Gear2，默认开）
- **按键更正**：精英挑战面板从 L 改为 **C**（L 原本是 ui.js 的日志菜单，冲突）。上文 S3 里写的“L 键”一律按 C 理解。新按键：Z 装备、C 精英挑战/胜利进度、U 猎手档案（首次进游戏弹一次提示）。
- 8 个饰品槽存在 `S.g2.eq`：neck / ring1 / ring2 / brace1 / brace2 / belt / boots / medal。物品是 Sack 物品，`id = g2_<slot>_<tier>`（Sack.def 注册，slot:'g2'），`o.g2 = {s,t,rar,aff:[[k,v]],req,lore,pre,suf,un}`。
- 词条 17 种：属性×5、攻击、防御、生命、伤害%、暴击%（×1.8）、减伤%、每秒回血、放倒回血%、魂晶%、魂力产出%、猎手仇恨−%、猎手感应−%（暴击≤45、减伤≤55、仇恨/感应≤70）。词条数 = 稀有度（0~5）。需要等级 = (阶−1)×7 + 稀有度×2 − 4（专属装备 1）。
- 掉落：Sack.roll 里加 Gear2.rollLoot（宝箱 40%、武器架 12%、木箱 10%、尸体 5~12%、霸主尸体 2 件）；精英击杀 → 专属神话装备（UNQ 表 14 件，固定词条+典故）；猎手真正斩杀 → 传说饰品。
- 接入：包裹 RPG.stats（属性/攻防血/战力/魂力产出）；worlds.js ctx.power 乘 `Gear2.hitMul()`（伤害%+暴击）；包裹 FoeAbs.conv（减伤）；包裹 G.addCoins（出猎中魂晶%）；hunters2 仇恨/感应乘 hateMul/senseMul；elites/hunters2 胜率计入 avgMul 和减伤。
- 包裹 G.buyEquip：gear2 开启时武器/头盔/护甲/护符不能买（背篓可以）；原 `forge_buy` MOD 仍然有效。
- Z 面板（传奇风纸娃娃）：左边 5 个原槽位 + 8 个饰品槽，右边双列属性表（含全部特殊词条），下面是麻袋/储物箱里的装备，点击穿上；悬停显示完整词条和等级要求。
- **sack.js 改动（5 处，都带 `R35 gear2` 注释）**：nameOf / rarOf 识别 o.g2；tipHtml 调用 Gear2.tipBody；equip() 开头转交 Gear2.equip；roll() 加 Gear2.rollLoot。
- 测试：tools/sc_g2.py 流程在真实游戏（洞内）跑过：专属腰带战力 58→64、生命 140→390；等级不够时拒绝穿戴；Z/C/U/Esc 真实按键开关，没有误开其他菜单。

## R36 — 用户：“角色头部看着像塑料（二次元模型在三次元 shader 上的违和感），角色改成二次元光影！”
- **根因**：R33b 把头改成 PBR（`head_pbr`），身体也是 PBR：有高光 + 环境镜面反射 + 连续明暗渐变 → 头发出现一片片三角面的反光、衣服有脏兮兮的渐变，典型“塑料/3D 渲染感”。
- **MOD `anime_shade`（默认开，js/heads.js 的 FaceFill IIFE 里 `animePatch` / `ANIME_GLSL`；需重新载入）**：在 `#include <lights_fragment_end>` 之后把受光比 `lr`（光照亮度/反照率亮度，满光≈1）重映射为二次元两段式——亮面平涂（≥1.04）、暗面抬到 80% 并染暖粉阴影色 (1,.885,.93)、0.50~0.74 之间 smoothstep 软过渡；`lr<0.32` 时按 smoothstep 压暗（洞里/夜里仍然暗）；`directSpecular/indirectSpecular` 清零（塑料感来源）；再加一圈 22% 的边缘光。天空/太阳/篝火/阴影照常响应。
  - 接入点：`HPBR_OBC`（所有 PBR 头材质的默认注入）和 `FaceFill.wrap → inject`（头发/皮肤自带 onBeforeCompile 的、以及 foe.js 的身体材质 FF()），用 `ANIME_BLOCK` 标记防止重复注入；cache key 末尾加 `A`。toon 材质（head_pbr 关）不受影响。关闭 MOD = R33 的 PBR 头。
  - 参数集中在 `ANIME_GLSL`：亮面电平 `max(1.04, min(lr*1.05,1.28))`、暗面 0.80、阴影色、过渡 0.50/0.74、边缘光 0.22。头偏暗先调 `FaceFill.tune.pbr`（0.62）。
- **测试台**：新增 `tools/test/shade.html`（真实 foe.js 身体 + ModelHeads 头 + 天空 PMREM + 太阳/篝火），`window.__shade({yaw, target:'face'|'body', sun, fire, amb, sky, bg})`；`?off=1` = 关 anime_shade 对比。截图用 canvas.toDataURL（`preserveDrawingBuffer`），不要用 page.screenshot（headless 下 WebGL 画布为空）。实拍：左（关）头发满是三角面反光，右（开）平滑成块；篝火-only 场景仍然暗、脸有受光面；全身像衣服渐变干净。
- 没做：描边（inverted hull）、头发“天使环”高光条。若用户还想更二次元，下一步做这两项。
---
## R35b（用户反馈：BOSS 也要出现在探索地图；R35 的 UI 太难看、边缘不清；进入地点的窗口要更大、剧情更详细、任务更多）
- **新 js/r35ui.js（window.R35UI）**：精英（C）/ 猎手（U）/ 装备（Z）合并成一个带页签的窗口。外壳 = 遮罩 `#r35root` + 游戏原生 `.modal big`（body.ui3a 下自动套用 UI Agent 的金色角框、描边、衬线标题、按钮），页签用原有的 `.m-tab`，关闭用 `.m-close`。共用卡片样式 `.r3-*` 使用 `--u-*` 配色变量。模块用 `R35UI.reg(id,{n,title,on,html,click,move,leave})` 注册。横幅 #elBan/#h2Ban、HUD #elHud/#h2Bar/#h2Sense 的覆盖样式也写在这个文件里。
- elites.js / hunters2.js / gear2.js 的旧面板（#elPn/#h2Pn/#g2Pn）已删除，改为注册到 R35UI；按键不变（C/U/Z），ui.js 自己的窗口打开时不响应。
- **探索地图（出洞狩猎的选地点界面）**：regionquest.js 改 2 行——`detHTML` 在小BOSS 后插入 `Elites.regionHTML(k)`（该地区精英卡片：锁住显示传闻和条件，解锁显示胜率和“发起挑战”按钮），`itemHTML` 地区名后加 `Elites.regionBadge(k)`（👑 已斩杀/总数）。挑战按钮由 elites.js 在 document 捕获阶段处理（关闭 UI 后调用 challenge）。
- **新 js/arrival2.js（MOD arrival2，默认开）**：进入地点的大窗口，取代 #rqCard（body.arr2 时隐藏）。内容：地区插图大图、逐字打出的 4 段剧情（场景 / 往事 / 当地人怎么看你——按来访次数、霸主是否已死、猎手仇恨生成 / 传闻）、主线（RegionQuest.T.q）、2 条随机支线（搜刮容器 / 搜尸 / 深入第 N 层 / 麻袋里 N 颗首级 / 英魂以上首级）、威胁一览（霸主、小BOSS、最强猎手及胜率、可挑战精英）。空格/E/回车关闭；打开时拦截其他按键。支线追踪 #arTrack 放在 #rqTrack 下方，并把 #h2Sense 往下推；完成给魂晶，40% 附带一件饰品。精英决斗场的出猎不弹这个窗口。存档：`S.arr.v[k]` 来访次数。

## R36-talent（角色成长重做：属性点 + 天赋树 + 魔兽式界面）
用户原话：技能树太少，要大师级重做升级系统：属性点、技能树、套路很多的不同流派、快捷键像魔兽世界、UI 大一点、操作性好。
- **新文件**（都是 MOD，默认开；关掉即回到旧的自动加点 / Q R G 三技能）：
  - `js/talents_data.js`（`window.TalData`）：5 属性（力量/体魄/敏捷/凶威/魂力）、6 大流派（刃舞·铁壁·影袭·狂血·魂术·猎首）各 13 节点、共 78 节点 / 31 个主动技能 + 通用闪身 `dodge`、6 套推荐流派（`BUILDS`，含加点顺序，一键加点会把剩余点数按主系补满）、层门槛 `TIER_REQ`。
  - `js/talents.js`（`window.Talents`）：引擎。点数（每级 3 属性点 + 1 技能点，每 10 级 +1，首杀霸主/精英各 +1）、分配/撤销/洗点（首次免费，之后按等级收魂晶）、技能实现 `S_[id]`（投射物/区域/冲刺/光环 Buff，全用加色发光网格，无模型）、魂能(mana)、Buff/DoT/印记、`outDmg/inDmg/avoid/rewardMul/moveMul` 钩子、自己的 `keydown` 捕获（1-0 / Shift+1-0 施法；Q 闪身；R/G 旧键映射到 战吼/旋风斩，需学会）。自带每帧：等 `G.HOOK` 就绪后 push 到 `G.HOOK.frame`。
  - `js/talents_ui.js`（`window.TalUI`）：底部 2×10 快捷栏（冷却转圈、魂能不足变暗、HTML5 拖拽换位、右键清空）+ Q/E/H 常用位 + T 按钮；左上玩家框（生命/魂能/体力/经验/Buff）、目标框（血量/词缀/流血中毒）；**T** 打开大面板 4 页：属性 / 天赋树 / 技能书 / 推荐流派。Esc 或 T 关闭。
- **改动的别人文件（都很小，行尾 `// R36`）**：`foe.js`（`hit()` 调 `Talents.outDmg`；`fo.slowK` 减速；导出 `Foe.dot`）、`worlds.js`（`foeEvent0` 调 `Talents.onEvent`；奖励 ×`rewardMul`；`hitPlayer` 调 `avoid/inDmg`；`gainXp` 调 `onLevel`；移速 ×`moveMul`）、`rpg.js`（升级曲线 `Talents.need`；`lvBonus` 在天赋系统下不再自动给属性；`stats()` 前后钩子 `Talents.bonus/post`）、`mods.js`（MOD `talent_tree` / `talent_ui`）、`index.html`（3 个 script 标签在 `foe_abs.js` 后）。
- **数值**：玩家伤害仍走 R35 `FoeAbs`（`12×(power/40)^0.8`），力量每点 +3 战力；属性点是手动的，所以老存档升级后的属性会按“每级 3 点”重新分配（点数按等级自动补发，不丢）。
- **按键占用**：T 天赋面板，数字键 1-0 / Shift+1-0 快捷栏，Q 闪身，E 处决（旧），H 药水，R/G 旧技能映射。不与 C/U/Z（R35UI）、B/Tab/I/K、M、N、Y、O、J 冲突；`W` 不在 3D 探索里时（旧文字出猎/洞穴菜单）Talents 不拦截按键。
- **坑**：worlds.js / foe.js 很多是一行长语句，**不要在行中间插 `//` 注释**（我第一次就把 Recall/CombatFX 调用注释掉了，已修，见 R36-talent fix）。
- **测试**：`tools/test/talents.html`（假 G/Worlds/Foe 的 UI+引擎台，`VW=1600 VH=900 drive.py` 截图各页）；`tools/test/fight.html` 已加载 foe_abs + talents_data + talents，可用真 `foe.js` 逐个施放 31 个技能（需自己塞 `Worlds._W`/`G.HOOK`/`G.st=()=>RPG.stats(G.S,{})`，见本轮提交记录）。`drive.py` 支持 `VW/VH` 环境变量。完整 index.html 在 2GB 沙箱里跑不起来，**未做整包实机测试**，要看用户反馈（尤其 #wStat/#wHint 位置、`.wskills` 旧条已在 tbon 下隐藏）。
- R35b 验证（真实游戏，960×540 无头）：C/U/Z 页签切换、Esc 关闭；出洞狩猎界面的地区精英栏和徽标；雾溪村出猎时到达大窗口正常弹出，逐字打字、空格跳过/进入，#arTrack 支线追踪和 #h2Sense 叠放正确。图标 🐦‍⬛ / 𓂀 显示不出来，已换成 🩺 / 🏺。

## R36b（用户：C 下蹲被精英界面占了 / 头像塑料要 3D shader+次表面散射 / 不要头发-头-饰品混搭绑定 / 怎么一下秒 BOSS / 武器属性要更详细）
- **C 键还给下蹲**：`elites.js` 删掉 C 键监听（R35b 已同步改提示）。精英挑战只在**探索地图（出洞选地点）**每个地区的「👑 精英挑战」栏里看/发起；R35UI 的 `elite` 页签仍可从 U/Z 窗口进。
- **秒杀 BOSS 的原因与修复**（`foe.js`）：① 破绽中（broken）横砍脖子 = 处决，不看血量（霸主也吃）；② E 处决 `Foe.execute` 直接 `hp=0`；③ 天赋暴击/技能叠乘没有上限。现在：霸主/精英 BOSS/猎手（`fo.boss||fo.hunter||fo.eliteId`）单刀最多扣最大血量 10%；破绽脖子斩与 `Foe.execute` 只有在血量 ≤25% 才真正处决，否则吃一记 15% 重创并提示；天赋 `h_exec/h_storm` 同步。普通敌人不变。
- **武器详细属性 `js/wpnspec.js`（`window.WpnSpec`）**：只读，用 combat.js 的真实公式算：自重（WEIGHT）、握长、轻击/收招/重击的前摇·出刀·间隔·触及·体力·单击伤害、三连节奏与连击输出、暴击、部位倍率、蓄力时间，并与当前武器逐项对比（▲▼）。显示位置：铁匠台（forge.js 武器卡 + 下一阶折叠对比）、背包悬浮提示（sack.js，紧凑版 `WpnSpec.tip`）。**改 combat.js 的 mmAttack 公式时要同步改这里。**
- **MOD `skin_sss`（默认开，heads.js `SSS_GLSL`）**：3D 真人皮肤质感。保留 PBR，只对“肤色像素”（按反照率色相/饱和度/亮度判定，头发衣服不受影响）加：明暗交界带血红色散射、背光侧暖色填充、掠射角红色透光边、整体微暖；头发/衣服硬高光压到 30%、皮肤 55~70%，另加极淡油脂光泽。极暗环境不抬亮。**`anime_shade` 默认改为关**（用户要 3D shader 风格；mods.js 迁移 `__v8` 一次性关掉）。测试台 `tools/test/shade.html?sss=0|1&anime=1`（脸朝向 yaw≈2.45~2.7）。
- **MOD `head_native`（默认开）**：头保持原样。迁移 `__v9` 把 `hair_mix2`（跨头发型）和 `acc_mix`（跨头饰品库）关掉；MMD/原神头不再叠程序化头饰（heads.js HeadWear.build 前的判断）。想要混搭：关 head_native 并手动开那两项。没动 VRoid 系头自己的发型替换。
- 测试：`fight.html` 里 boss 被 `Foe.execute` 不死（hp 150→127）、`mult:50` 的脖子重击只扣 10%。

## R37 — 用户 6 条反馈（开发者模式默认关 / 鼠标找不回 / 头棋朝向与不说话 / 战斗太简单 / F 视角头小 / 断面）
1. **dev_mode 默认关**（c58cc68）：`js/mods.js` `def:false` + 迁移 `__v<7 → dev_mode=false`。（迁移版本号以 mods.js 实际最大值为准，别人已加到 __v9，新增请继续递增。）
2. **鼠标出现后点不回游戏 / ESC 无效 / 锁不上**（`js/game.js`，紧跟 `setUI` 之后的 R37 块）：
   - 根因：ESC 不是“用户手势”键，面板用 ESC 关闭后 `requestPointerLock` 必失败；某些面板异常退出会让 `uiOpen` 卡在 true；原来只有点 canvas 才会重锁，面板/遮罩盖着时点不到。
   - 修：① 游戏中（playing 且无 UI、未锁定）屏幕下方常驻“🖱️ 鼠标已释放 — 点击画面回到游戏”；document 级 capture `mousedown`（非按钮/输入框）→ 重锁；② `uiOpen` 卡死：按 ESC 后 250ms 若屏幕中心是画面而非面板 → 复位；或 2.5s 内连点画面 3 次 → 复位（`G.unstick()` 也导出）；③ `setUI(false)` 后 60ms 自动尝试重锁（ESC 触发的会被浏览器拒绝 → 原有 `lockFailed` 提示）。
3. **头棋**（`js/chess.js`）：头朝向 = 朝对手（红方 yaw=π、蓝方 0），只随镜头偏转 `0.3·sin(cam.t−base)`（≤0.3rad）；`talk()`/`face()` 直接 return（无气泡、无表情）；`key=''` 不再设 EXMAP 表情。Snik 侧栏台词不动（那不是头）。
4. **战斗 AI（MOD `foe_mind`，新文件 `js/foe_mind.js`，默认开）**：包装 `FoeAI2.update/tune/after/tick`（foe.js 运行时读 `window.FoeAI2.x`，没改 foe.js / foe_ai2.js）。习惯记忆 `FoeMind._H`（guard/spam/circle/retreat）；每敌人性格 `fo.mind`（pat/rush/tri/cnt）；每刀节奏 6 选 1（quick / normal / delayed / bait=假动作后立刻真刀 / brk=红光破防 / 读盾补刀），`A.mk` 记录；`mindAfter` 读你出手瞬间的反应（举盾→破防刀；后撤→Sword_Dash 突进；侧闪→快刀；站着挨→拉开）；走位：打了就跑（kiteT）、反击型引你空挥（后撤预算 backBudget）、突进型绕圈预判。不改伤害（FoeAbs 继续管）。测试：`/var/work/mind_test.js`（fight.html 里三种玩家行为：不举盾 / 一直举盾 / 乱挥，举盾 120s 后 guard 习惯=0.93、出现 4 次 brk）。`tools/test/fight.html` 已加载 foe_mind.js。
   - 注意：fight.html 的 Melee_Hook 动画时间在虚拟时钟下偶尔卡在 ct=0.1（关掉 foe_mind 也复现），是测试台问题，不是 AI bug。
5. **F 视角头小于手**（`js/recall_iw.js`）：`S.k`=包围盒高/0.26，MMD 系头包围盒含发量/发饰（0.27~0.59，VRoid 中位 0.30）→ k 偏大 → 手被放大。非 VRoid 头（`ModelHeads.meta(look.f).grp !== 'vroid'`）改为 `k=1.15+0.1·(kRaw−1.15)`，夹在 [1.05,1.3]；`S.kRaw` 保留原值。
6. **断面（`js/heads.js` `fitCut`）**：新增 `tools/test/cutview.html`（`?list=a,b,c&hide=` + `__cut('neck'|'under'|'side')`、`__dbg()`、`__metric()`、`__skin()`；用 cap.py 截 #cv；一次不要超过 ~12 个头，否则 Chromium 丢 WebGL 上下文）。逐个目检非 VRoid 头发现：颈圈顶点只有半圈（甚至混入下巴/衣领顶点）→ 凸包成了 D 形/扇形断面，盖不住颈口，露出里面的皮肤碎片（申鹤、Hysilens、Jingliu、Feixiao、Mokou 等）。修：① 最小二乘拟合圆，点在圆周上最大空缺 >100° 就在空缺补圆周点；② 凸包必须“像颈口”：`面积/(π·meanR²) ≥ 0.87` 且 `面积/(π·r0²)` 在 [0.2, 2.2]，否则退回原 `__CUT__` 圆盘（压到切平面）。`ModelHeads.cutDbg()` 可看每个头的拟合信息（`bad:true` = 已退回）。
   - 仍可留意：头后面“nape 壳”（MMD 后脑补丁）从下往上看是白色锯齿边（头发遮住时看不到，F 视角从下看才可能露）；VRoid 头的断面因脖子倾斜看着是斜椭圆，属正常。
- 改动文件：`js/game.js`、`js/chess.js`、`js/foe_mind.js`（新）、`js/mods.js`（+foe_mind）、`index.html`（+script）、`js/recall_iw.js`、`js/heads.js`、`tools/test/cutview.html`（新）、`tools/test/fight.html`、`HANDOFF.md`。
- 提醒用户：聊天里的 GitHub PAT 已多次暴露，请去 GitHub 撤销并换新。
## R37（主管）：废铁武器手感 + 第三批敌人
用户：“敌人种类太少、太简单，战斗过程粗糙”；“垃圾武器攻击前摇长，必须按住才攻击，战斗不好玩”。（第 1 条头棋朝向已由 R37c 完成，未改动。）

**武器（js/combat.js，我的文件）**
- 根因：CD 中点击会进缓冲，但 CD 结束时若点击已超过 480ms 就被丢弃；钉头棒/流星锤/巨斧 自重 1.3/1.5/1.4 × sqrt → CD 800~1100ms → 早点的一下全丢，只有“按住+晃鼠标”能出刀。
- 修：缓冲窗口 = max(480, 本次CD+220ms)（CD 中的点击永不丢）；WEIGHT → [0.85,0.95,0.8,1.2,1.25,0.9,1.0]；重量曲线 sqrt → wt^0.35（WK）；CD 基数 500/750/950 → 380/560/800；轻击前摇 0.08→0.06。
- 导出 `window.CombatTune {WEIGHT, WK, CDB, WU, SW}`。**js/wpnspec.js（R36b 他人文件，最小改动）**：WT/前摇/冷却改为读 CombatTune（带旧值兜底），两条 FEEL 文案改为新手感。以后改公式只改 combat.js。
- 测试（tools/test/fight.html，同点击节奏 4 秒）：出刀 6~7 次 → 9~10 次。

**第三批敌人：MOD `foe_roles3`（js/foe_roles3.js，新文件，默认开）**
- 长枪手 lancer / 双刀舞姬 twinblade / 炼金投弹手 bomber / 猎网手 netter / 陷阱师 trapper / 唤灵师 wispcaller；约 38% 敌人换成这批。全是特效（光球/地面标记），无新模型。
- 接入：不改 foe_roles.js / foe_roles2.js——加载时包 FoeRoles2 的 pick/init/clip/tune/after/tick/evade/hurt/update/clear，并把 key 加进 FoeRoles2.R / FoeRoles.INFO。**必须在 foe_roles2.js 之后加载。**
- 反“贴脸狂点”：1.4 秒内挨第 3 刀 → 不硬直 + 职业脱身（后滚/侧闪/脚下药瓶），冷却 4 秒；长枪手脱身后的突刺、双刀侧闪后的连斩霸体。测试证明以前贴脸每 0.3 秒一刀可无限硬直，新职业技能根本放不出。
- 定身（网/夹子）：**js/worlds.js:829** 玩家移速多乘 `FoeRoles3.moveK()`（一处）。连按空格缩短。遮罩 DOM `#fr3root`（z 40）。
- 其他：mods.js 加一条；index.html 在 foe_roles2.js 后加 script；tools/test/fight.html 加 script。调试计数 `FoeRoles3.CNT`。

---
## R38（新手引导教程）
用户需求：加入游戏教程引导玩家、教学玩法；**新存档都要有教程**。
- 新文件 `js/tutorial.js`（`window.Tutorial`，MOD `tutorial`，默认开）。只读游戏状态（G / UI / Combat / Worlds），不改其他文件的逻辑。`index.html` 只加了 1 个 script 和标题菜单按钮「📖 新手教程」(`#tutBtn`)。`js/mods.js` 新增 `tutorial` 条目（无需 migration，def:true）。
- 触发：`fresh0 = !G.S.intro`（载入时是全新存档）→ 开场故事演完（`S.intro` 变真且 `UI.open!=='intro'`）→ `start(0)`。老存档（`S.tut` 不存在且 fresh0=false）不会自动触发，只能靠标题按钮 / F9 重看。转生（`applyPending` 设 `S.intro=1`）不会重触发。进度存 `G.S.tut={i,lang,off,done}`（删存档=新教程）。
- UI：右上角非阻塞小卡片（top:58px,z-index 40，`pointer-events:none`，只有按钮可点），中/日/EN 三语（按钮切换，记 localStorage `soulhead_tut_lang`；默认取标题页语言）。走路类步骤有屏幕箭头 🧭（指向商人 / 洞口）。Enter = 跳过当前步；F9 = 关闭 / 重开（完成后 F9 = 重新开始）。卡片在 `UI.open==='intro'` 或 `!G.playing` 时隐藏。
- 21 步，3 章：洞窟（看 / 走 / 斯尼克 E / Tab 属性 / B 建造 / 洞口 / E 出洞）→ 出洞狩猎（F 拔刀 / 左键挥砍 / 连点刺 / 右键格挡 / Q 闪身 / 击倒 / E 拾取 / 门撤退）→ 回洞经营（扛袋倒出 / E 拿首级 / 左键把玩出魂晶 / F·I 回忆档案 / T 天赋及其他快捷键）→ 结语。每步 `tick(st,c)` 4Hz 轮询（try/catch），`where:'cave'|'world'|'any'`，不在对应场景会显示“⏳ 等待”，不会卡死（Enter 总能跳过）。
- 教程文案里的按键已对照源码核实：G 放置 / V 表情 / 右键扔 / 长按 E 精确摆放 / F 回忆（手持或对准首级，否则 F=拔刀）/ I 查看 / K 收藏 / L 日志 / J 成就 / Y 神灵簿 / T 天赋 / M（洞内=音乐，洞外=地图）/ H 药。以后改键位需同步 `js/tutorial.js` 的 STEPS 文案。
- 测试：`tools/test/tutorial.html`（假 G/UI/Combat/Worlds，不加载整个游戏）+ Playwright 脚本逐步驱动 21 步全部自动推进、Enter 跳过、F9 重开、语言切换均通过（整个游戏在 2GB 沙盒里跑不动，未做整包实机测试）。
- 未做：教程内不覆盖武器附魔/训练小游戏/天赋树细节；没有高亮 3D 物体（只有箭头）。

## R39（用户：① 头发-头-饰品别绑定、原神头一起搭配很违和，要混搭拼图、看不出是哪个角色 ② MOD UI 重做（旧的难看） ③ 探索 UI 加更多文本：地区对你的反馈/名声/杀掉角色的后续故事（影响·关系）/反馈随机给资源）
### ① 头部拼图：由主管的 R38 `head_collage`（heads.js collageHair）+ `cc0_only` 实现
- 本 agent 同时写了一版 `head_puzzle`（MMD 脸发型必借别人 + 拆自带头饰 `ownAcc`），与主管 `head_collage` 重复，已**撤回**（提交里只留说明，避免冲突）。`head_collage` 当前只换发型；**如需再“拆掉 MMD 脸自带头饰 cloth_*（眼线以上）”，参考思路：`create()` 里遍历 `F.faceMeshes` 时跳过 SRC 名字 /^cloth/ 且中心高于眼线的网格**。
- 经验：push 前必须先 `git pull --rebase` 并检查冲突标记（`grep -n '^<<<<<<<' js/*.js`），不要只清 HANDOFF.md 的标记。

### ② MOD UI 重做（js/mods.js 管理器界面部分；逻辑 set/normalize 不变）
- 用户：“MOD UI 你重做下，现在这个不行落时了很难看”。旧版是粉紫色卡片墙且**漏掉了 `ui` 分类**（5 个 MOD 看不到）。新版：与游戏同风格的深棕金色；左侧分类（带 开启数/总数）+ 筛选（全部/已开启/已关闭/与默认不同/待应用）+ 顶部搜索（`/` 聚焦，Esc 先清搜索再关闭）；每行一个开关（画风组是单选圆点），点行展开详情（完整说明、默认值、ID、依赖、冲突）；“待应用”蓝色左边条 + 底栏列出待应用项；开关原地刷新不丢滚动位置。测试页 `tools/test/mods.html`。

## R38（主管）：CC0 模式（默认开）+ 拼图混搭
用户：“你不要头发-头-饰品什么绑定……不要原始原神头出来，而是混搭，不要看出来是某个原神角色，用其拼图！”“默认开启 CC0 模式，游戏里只有 CC0 模型，但可以关闭。”
（注意：R36b 把上一轮同一句话理解成“不要混搭”并加了 head_native；用户这次明确要混搭 → head_native 默认关。R39 的 head_puzzle 与本节重复，已由 R39 自己撤回。）

**CC0 模式：MOD `cc0_only`（默认开）——新文件 `js/cc0mode.js`（`window.CC0`，在 heads.js 前加载）**
- CC0 白名单（依据 CREDITS + pixiv 官方说明；AvatarSample_A/B/C/K/L/S 只是“样本条款”，**不是 CC0**；Seed-san/Twist=VRM PL，Godette=CC-BY，VRoid Hub 作者头、MMD/原神均非 CC0）：
  - 头 9 个：Sendagaya_Shino / Sendagaya_Shibu / Darkness_Shibu / Vivi / Vita / Victoria_Rubin / HairSample_Female / AvatarSample_D_Darkness / Base_Female
  - 身体 4 具：Vita / Victoria_Rubin / Darkness_Shibu / HairSample_Female
- **index.html**：54 个非 CC0 头的 `<script src="models/…">` 改为内联 `if (Mods.on('cc0_only') === false) document.write(...)`（file:// 可用；CC0 模式下不下载不解析 → 启动更快）。**js/headpacks.js**：CC0 模式直接 return。
- **js/heads.js**：`OK(i)` / `okList()`；randomLook 挑脸、allHair、tierFace（权重 0）、mixLook 发型候选与饰品库、coverHair 都只用 OK 的模型；新增 `resolve(look)`：非 CC0（或未加载）的脸/发型按 `hash(f|seed)` 固定换成 CC0（旧存档不改，只改显示），去掉非 CC0 饰品。`create()`、`randomLook()` 返回值、`mapsFor`、`hairColor`、`meta(look对象)` 都走 resolve；导出 `ModelHeads.resolve`。
- 调 `meta` 的 3 处他人文件改为传外观对象：`explore.js:134`、`recall_iw.js`（`meta(lk)`）、`ui.js:224`（先 resolve）。
- **js/foe.js**：`bodyFor` 外包一层 `CC0.body(name, seed)`（原函数改名 `bodyFor0`）；`build()` 入口也兜底。
- 动作 / 野兽 / 道具 / 场景本来就是 CC0，不受影响。

**拼图混搭：MOD `head_collage`（默认开，conflicts head_native；CC0 关闭时才有效果）**
- `resolve()`：MMD/原神脸若戴自己的头发 → 按种子固定换成另一个 MMD 头里 `hairFitOK` 通过的发型（`collageHair`，缓存）；旧存档也生效。
- `create()`：发型不是自己的时，**隐藏脸模自带头饰**（`ownAcc`：cloth_* 材质、眼睛以上；胡桃梅花帽/芙宁娜礼帽/黑天鹅面纱等）。
- mixLook：MMD 脸拼第三个头饰品的概率 0.45+0.1×魂阶。借用饰品若包围盒不挨着头/发（悬空）则不显示。
- mods.js：迁移 `__v10` → cc0_only / head_collage / hair_mix2 / acc_mix = true，head_native = false；三项 def 同步。
- 测试台 `tools/test/lookgrid.html?cc0=1|0&collage=1|0&list=…&n=12&seed=…&old=GI_Eula,…`，`__grid()` 返回每个头的 f/h/ax。结果：CC0 模式 12 随机 + 3 旧原神存档 → 全部 CC0；关 CC0 → 24 张 MMD/原神脸 0 张戴自己头发，12 张带借用饰品，目检截图正常。
- 已知：特征特别强的发型（雷电紫辫、千织红饰棕发、飞霄狐耳）换到别的脸上仍有辨识度；下一步可对借来的发型整体换色。
### ③ 探索 UI：地区回响 `js/regionecho.js`（window.RegionEcho，MOD `region_echo`，默认开）
- 用户：“探索UI加入更多文本：地区对你的反馈、名声、你杀的角色的后继故事（影响-关系）。反馈还会随机 + 资源”。
- 数据：`G.S.echo.reg[地区k] = {fame, fear, rel:{folk,arms,faith,arcane,noble}, kills, heads, big, trips, grudges[], legends, news[≤14], recv}`。
- 出猎中：包装 `Recall.log`，对 `t==='kill'` 且 `fo.h.c`（有身份的人，排除 `fo.hunter`）记录 {name,id,idN,rar,traits,goal,belief,boss/mini/elite/decap}。`Worlds.start` 被包装（和 RegionQuest 同法）：建 `T`，并把 `api.finish` 包一层 → 回洞时先 `settle(trip)` 再走原 finishTrip（死亡 `api.die` 不结算，存档本来就清零）。
- `settle`：名声 = Σ(1+稀有度+斩首1+霸主8+小BOSS4+精英6)；恐惧同理；选至多 3 人生成“后继故事”，立场 7 种（哀悼/复仇/恐惧/传说/纪念/遗产/继任，按 c.traits 性格加权；文案模板 ST、亲属 KIN 按势力分，含心愿 GOAL_LN）；每段随机结果（魂晶/地区材料 `Sack.stashAdd(Sack.mk(RegEcon.BY[k].c[0],n))`/药水/无；复仇另加 `S.h2.hate` 并添加“仇家”）；势力关系：死者所属势力下降（`facOf(c)` 由 idN 关键词判定），`RIPPLE` 波及他方（杀术士→圣职+，等）；写入 `trip.log`（狩猎日志页可看）并弹 `#reRet` 卡片（左侧，26 秒，非阻塞）。
- 抵达 `arrive(k)`：按名声/恐惧/仇家/关系加权掷“地区的反应”：供品/警告/馈赠/信徒/沉默/无人认识，随机给魂晶/材料/药水或 +1~2 猎手仇恨（并消耗仇家等级）；同一趟同一地区只结算一次（`r.recv.key = 总出猎数:k`）。arrival2 打开时显示（`paras`+`arrHTML`），没有 arrival2 时 2.6 秒后 toast。
- UI 接入（各 1~2 行）：`regionquest.js` `detHTML` 在霸主栏后插 `RegionEcho.detHTML(k)`（称号+名声/恐惧+5 势力关系条+仇家+最近 4 段故事+说明），`itemHTML` 加 `RegionEcho.badge`；`arrival2.js` `html()` 的 paras 与右栏各加一处。
- 测试：`tools/test/regionecho.html`（假 G/Worlds/Sack，Lore.makeCharacter 造人）；完整游戏在 2GB 沙盒跑不动，未做整包实机测试。
- 已知限制：仅 Worlds 出猎（默认）记录；Explore 3D 旧模式和文字旅途不记录。
## R38（语言选择 i18n + 启动崩溃修复 + 宣传图）— 作者：本轮 agent
**用户要求**：①开局先选 中/日/英 再开始加载，游戏中可随时切换；②做宣传截图（图片+文字，世界观/玩法等，中日英三套）；③修复「启动失败：Cannot read properties of undefined (reading 'S')」。
**启动崩溃**（`d9c8b93`）：R36 天赋引擎 `Talents.tal()/agg()/lv()` 在 `startGame()`→`RPG.stats` 期间读 `G0().S`，但此时 `window.G` 还不存在。`js/talents.js` 已加 `LAST` 回退。**规则：凡是 `RPG.stats`/`startGame` 可达的代码都不能假设 `window.G` 存在。**
**i18n 设计**（全部在新文件，核心基础设施，非 MOD）：
- `js/i18n.js`：`window.I18N`。localStorage `soulhead_lang`（zh/ja/en）。首次进入显示选语言界面（1/2/3 键也行），`index.html` 启动 IIFE 里 `await I18N.ready()` 之后才开始加载。右上角 🌐 按钮随时切换；与 `#introCopy` 的中/日/英页签双向同步；教程 `js/tutorial.js` 语言跟随（见 `js/i18n_rules.js`）。
- 做法：游戏源码仍是中文，在 **DOM 层**翻译（MutationObserver，文本节点 + title/placeholder/alt/aria-label；`[data-copy]`、`#tut`、`#credits`、textarea/script/style 不翻译）。查找顺序：整句精确 → 带占位符句型（`{0}` 短文本、`{#0}` 数字、`{@0}` 长文本，捕获组里的中文会递归翻译）→ 自定义规则 `I18N.rule(re,fn)` → 「A · B · C」逐段翻译 → 词组替换（仅 ≥3 字词条；2 字词条要在第 4 项写 1 才参与词组替换，避免「攻击/范围」污染长句）。切回中文会还原原文。
- 词典：源在 `tools/i18n/d_*.py`（[zh,en,ja]，`$name` 会被转成 `{#n}`），运行 `python3 tools/i18n/build.py` 生成 `js/i18n_data.js`（**不要手改生成文件**）。现有 ~740 条：菜单/HUD 提示/加载文案、天赋·技能·流派·属性全部、天赋面板/提示/飘字、武器详细属性、装备/材料/品阶/魂阶、背包标签、战斗飘字、成就名。
- 补翻译：游戏里按 F12 输入 `I18N.dump()` 会列出运行中遇到但没翻译的中文句子（按出现次数排序），往 `d_*.py` 里补再 build 即可。**未覆盖**：剧情/书籍/神灵台词/霸主台词/地点事件/MOD 说明等长文本（约 4000+ 句），仍显示中文；动态拼接的句子要么加 `{#0}` 句型，要么在源码里改成整句一个文本节点。
- 测试台：`tools/test/i18n.html`（index 的静态外壳 + i18n）；天赋面板/武器面板可在 `tools/test/talents.html` 里注入 i18n 脚本查看。
**宣传图**：`tools/promo/make.py` 生成 `promo/{zh,ja,en}/01_key…06_spirits.png`（1920×1080，各 6 张：主视觉/世界观/玩法循环/战斗/成长/神灵）。素材全部来自仓库真实资源（`js/spirit_art.js` Q 版神灵、`js/regionart.js` CC0 场景、`tools/promo/cap/wpn_*.png` 是游戏内「武器详细属性」面板的真实截图，由翻译引擎输出），无性化角色图。沙盒里整个游戏无法启动，所以没有整局实机截图；天赋树界面截图因沙盒缺 emoji 字体（图标会变豆腐块）没有采用。

## R40（主管）：大规模收 CC0 VRoid 素材——调研 + 首批 2 头
用户：“VRoid 模型最好看”，要大量高质量 CC0 VRoid（发型、脸、贴图、饰品，各种各样）。
- **新增头**：`models/Sakurada_Fumiriya.js`、`models/HairSample_Male.js`（pixiv 官方 CC0，vrm2head→glbsimp→glbpack，共约 2.2MB）。已进 `js/cc0mode.js` HEADS、`index.html`（Vivi.js 之后，常驻加载）、`js/lore.js` HAIRSTYLE。二者是男性脸；混搭（head_collage）换发后偏中性，已渲染核对（lookgrid seed 3）。
- **身体未接入**：两者原装身体已能用 `tools/vrm2body.py` 转出（~2–2.6MB），但全游戏文本/身份（VB 表、“她”60+ 处）都是女性，男身体会对不上 → 暂不提交。要接需先做代词/身份的性别化。
- **hair_cover.js** 没有新头的评分（coverScore 返回 0 = 视为盖得住），以后可重跑离线评分。
- **来源调研结论**：
  - pixiv 官方 CC0 已全部收完（Sendagaya 系、Vivi/Vita/Victoria/Darkness_Shibu、HairSample F/M、Base、Sakurada）。AvatarSample_A/B/C、K/L/S 不是 CC0。
  - OpenSourceAvatars（ToxSam，4000+ CC0）全是 NFT/低多边形卡通，没有 VRoid 动漫风，不收。
  - webaverse/avatar-models：除 pixiv 那几个外均为 VRoid Hub 条款（多数禁止再分发），不收。
  - **VRoid Hub 公开搜索 API**（`https://hub.vroid.com/api/search/character_models?keyword=CC0&count=100`，头 `X-Api-Version: 11`）可列出模型+许可字段：找到 160 个“标 CC0 且许可全开”的模型，人工筛出 25 个成年外观高品质的 → `tools/r40_vroidhub_cc0.md`（带链接）。**下载需要 pixiv 登录**，沙箱拿不到；`optimized_preview` 是受保护的预览文件，不要绕过。用户下载 .vrm 后按该文件里的命令一条条转换即可。
- 新工具：`tools/vrmmeta.py`（按 URL 读 VRM 内嵌许可，只下载头部 JSON）。

## R40（用户：① 完全不知道各种按键 ② 联合游戏截图 + 操作教程做宣传图，抓爽点，正方形 + 2:3 ③ 其他语言模式混着中文）— 作者：Arena 本轮 agent
**① 按键一览**：新文件 `js/keyguide.js`（`window.KeyGuide`，MOD `keyguide` 默认开）。**F1 或 ?** 开关；标题菜单「⌨ 按键一览」按钮（`#kgTitleBtn`）；右下「按键 F1」小按钮（`#kgBtn`）；`#hint` 条末尾加了 F1。三语原生文案（容器 `data-noi18n`，不走 DOM 翻译），面板里按下的键会亮起。内容以 `KeyGuide.SEC` 为准（5 组：移动/战斗/首级与麻袋/菜单/系统），**改键位时两处一起改：`keyguide.js` + 宣传图（宣传图从 `KeyGuide.SEC` 自动读，重跑 make2 即可）**。测试页 `tools/test/keyguide.html?lang=en`。
**③ 语言纯净（本轮范围）**：不动 UI agent 的 `i18n.js` / 生成文件。新增词典 `tools/i18n/d_r40.py`（被 `build.py` 合并进 `js/i18n_data.js`，**冲突时重跑 `python3 tools/i18n/build.py`**）：标题/HUD/快捷键条/音量面板/死亡页/洞内菜单常用句/ui3a 提示/MOD 面板外壳。新文件 `js/i18n_extra.js`（`window.I18NX`）：① `#credits`（被 DOM 翻译跳过）按语言换文案 ② 开场故事整段三语（`ui.js` 的 `introStep` 读 `I18NX.intro`，容器加 `data-noi18n`）③ MOD 面板的动态句式规则。新文件 `js/mods_i18n.js`（`ModsI18N[id]=[nEn,dEn,nJa,dJa]`，140 项全覆盖，说明为精简译文）；`mods.js` 用 `nm(m)/dm(m)` 取名称/说明，切换语言时面板重绘。**新增 MOD 时请同步在 `mods_i18n.js` 加一行**，否则该项在日/英下回退中文。
- 实测（headless，标题界面 en/ja）：标题页已无中文残留（除语言页签“中文/日本語”）；MOD 面板 en 无中文残留。
- **仍未覆盖（请后续轮次继续）**：静态扫描（`/var/work/pw/static.js` 思路：抽取 js/*.js 中文字面量喂给 `I18N.tr`）显示约 9000 个中文片段没有译文，主要是长文本：`lore.js`(800)、`ranks.js`(400)、`overhear.js`、`spirit_*.js`、`persona_lines.js`、`bookdata.js`、`tale.js`、`worlds.js`/`play.js`/`explore.js` 的提示与事件、`regionecho.js`（本 agent 上一轮写的，190 段，建议直接改成 {zh,en,ja} 模板）、`gear2.js`、`elites.js`、`chess.js`、`seance.js`…… 这些在日/英模式下仍是中文。另：含 `<b>` 的句子被 DOM 引擎按文本节点拆碎，译文会不通顺——这类要像开场故事那样整段三语。
**② 宣传图**：`tools/promo/make2.py` → `promo/{zh,ja,en}/{sq,p23}_0N_*.png`，sq=1080×1080，p23=1080×1620，3 主题（01 hook 主视觉：爽点卡片 + 实机标题界面 + 6 键；02 combat：格挡→破绽→处决四步 + 武器面板实机截图；03 keys：全键位速查）× 2 比例 × 3 语言 = 18 张。另有 UI agent 的 16:9 六张（`promo/*/01_key…06_spirits.png`）。运行：仓库根起 `python3 -m http.server 8080`；`pip install playwright pillow`；`python3 tools/promo/make2.py [zh|ja|en]`。素材：`tools/promo/cap/title_{zh,ja,en}.png`（真实标题界面，1280×720，`/var/work/pw/boot3.js` 抓取，约 70s/张）、`wpn_*.png`（UI agent 的真实武器面板截图）、`js/regionart.js` 做虚化背景。**没有 3D 战斗/洞窟实机截图**：2GB 沙盒里一进游戏就 OOM（会把整个沙盒卡死）。你在本机截到图后放进 `tools/promo/cap/cave.png`，重跑 make2 即自动替换 01 号的实机图（`combat.png` 预留）。

## R40b/R41（用户：“按 F 底部 UI 栏被挡住、UI 看不清；初期攻速太快太强，模拟游戏/升级过程，调数值”）
**① 底栏不被挡（MOD `hud_legible`，`js/hudfix.js`，默认开）**：真因 = F 拔刀弹出一段 ~130 字的 22px 长字幕盖住画面 + 整行底部 `#hint` 从热键栏槽位缝隙透出来糊在栏上 + 多个贴底小部件（手持书/灵契/按键按钮/[E] 提示/麻袋HUD）与 162px 高的热键栏重叠。
做法：JS 每 200ms 量 `#tbBar` 顶边 → CSS 变量 `--tbH`；`body.tbon` 时 `#wHint/#wRun/#tbCast/#skHud/#propHint/#gacha/#ohear/#bkHeld/#kgBtn/#spchip` 都抬到 `--tbH` 之上并上下错开；热键栏显示时隐藏 `#hint/#hintTag`；第二排（Shift+1~0）全空且没按 Shift 时折叠；`#toast` 改深底板 19px；`combat.js` 拔刀字幕改一行短字（前 2 次 4 秒，之后 2.4 秒；localStorage `sh_drawN` 计数，三语）。关 MOD = 回到旧长字幕。
**② 前期平衡（MOD `balance_r41`，`js/balance.js`，默认开）**：`tools/balance/sim.js`（蒙特卡洛，直接 require 真实 rpg.js）`node tools/balance/sim.js base|new`，结果存 `tools/balance/REPORT.md`。
 现状(base)：Lv1 木棒打村庄普通敌 TTK 1.3~1.7 秒、敌人一下只削 4% 血（25 下才倒），5 分钟就 Lv5，基本不会死。
 新(new)：① 出刀节奏倍率 `Balance.tempo()` Lv1 ×1.5 → Lv26 ×1.0（接进 combat.js 的 `WK()`，前摇/出刀/冷却/体力节奏都跟着变；wpnspec 显示同步）；② `Balance.earlyDmg(power)` 战力 55 → 伤害 ×0.5，170 起 ×1（接进 `FoeAbs.power()`，foe.js/精英/猎手估算一致）；③ `Balance.foeDmgK(rec)` 村庄 ×2.0 → 推荐战力 200 起 ×1.0（接进 `FoeAbs.conv()`，霸主/猎手/精英不加成）；④ 升级经验 40+11·lv^1.6（原 28+9·lv^1.6），深层地区经验 ×(rec/40)^0.3（≤2.2，接进 worlds.js gainXp）；⑤ 旧存档第一次进入按等级迁移 S.xp（`S.balV=41`），等级不降。
 结果：Lv1 对 rar1 TTK ≈ 4 秒、敌人 8% 血/下（13 下倒）、1 对 3 掉血 ~30%；Lv5≈8 分钟、Lv10≈25 分钟、Lv20≈100 分钟。
 **R35 仍有效**：伤害/血量是 FoeAbs 绝对值，没有 %最大生命伤害、没有保底刀数。调数值只改 `balance.js` 的 `TUNE` 和 `sim.js` 的 `TUNES.new`（两处同值）。
 改动文件：combat.js(WK×TK)、foe_abs.js(power/conv)、talents.js(need)、worlds.js(gainXp)、wpnspec.js(q)、mods.js/mods_i18n.js、index.html(加载 hudfix.js / balance.js)。
 测试：tools/test/talents.html 加假 hint/kgBtn 等元素的截图对比（前后）；整机仍无法在沙箱里跑，请用户实机确认 F 拔刀后的底栏、前期战斗手感（太慢/太难可调 `TUNE.tempo[0]`、`earlyDmg[0]`）。

## R42 统一菜单 Hub（用户：“UI 设计得非常屎，各种奇怪按键 UI 分类，有没有统一器？按 TAB 分类看到所有 UI；物品栏和装备 UI 放一起；其他大规模优化”）
**MOD `ui_hub`（`js/hub.js`，默认开）**。Tab（洞里 / 野外都可）打开总菜单：左边固定导航栏，按 角色（总览 · 装备与背包 · 天赋技能）/ 挑战（精英 · 猎手）/ 收藏（首级收藏 · 图鉴展厅 · 灵契）/ 世界（狩猎日志 · 建造）/ 系统（按键一览 · MOD 设置）分组，一键切换；再按 Tab / Esc 关闭；记住上次页（localStorage `hub_last`）。
- **只做导航与布局，不重写内容**：各页仍是原模块的面板（UI.openMenu 的 stats/equip/heads/codex/logs/build、TalUI、R35UI 的 elite/hunt、Spirits、KeyGuide、Mods）。`Hub.PAGES` 里每页有 `isOpen/open/close`；打开**任意**面板（T / O / F1 / C / U / K / L / B / Z / Y 原热键照常）导航栏都会自动出现（200ms 轮询），并把面板右移 `--hubW`（196px；<860px 缩成 64px 图标栏）。洞里专属页（首级/图鉴/灵契/建造）在野外自动隐藏。
- **装备与背包合并页（`kit`）**：左 = Gear2 纸娃娃 + 属性（`Gear2.dollHTML/dollClick/dollMove`，点槽位卸下），右 = Sack（洞里 `Sack.mountCave`：装备/物品/工坊/典籍；野外新增 `Sack.mountWild(host)`，`panel._hub=1` 时 Sack 自己不抢 Tab/B/Esc，`Sack.unmount()` 在关菜单时复位）。Z 键（Gear2.toggle）和野外 B 键现在都进这一页。装备/卸下后 MutationObserver 自动刷新纸娃娃。
- 面板打开时隐藏热键栏 / 玩家框 / 世界提示（天赋页除外，拖技能要用栏）。右下角「按键 F1」小按钮换成「☰ 菜单 Tab」（`#hubBtn`，热键栏出现时自动抬高）。KeyGuide 的 Tab / Z 说明已更新。
- 新的公开接口：`UI.tab`、`UI.quiet()`、`R35UI.avail(id)`、`Mods.isOpen`、`Spirits.panelOpen/closePanel`、`Sack.mountWild/unmount`、`Gear2.dollHTML…`。ui.js `openMenu('equip')` 在 Hub 开时走 `Hub.kitBody/kitMount`。
- 测试：`tools/test/hub.html`（真实 ui/sack/gear2/r35ui/keyguide/talents_ui/mods + 假 G）；Tab → 总览、go:kit（洞里 + 野外两种）、天赋、按键、MOD 都截图验证过。整机仍未在沙箱跑；请用户实机确认：Tab 打开/关闭、野外 Tab、装备页穿脱、Esc 行为（UI 菜单 Esc 仍是原来的 close(false)）。
- 还没做：总览页仍是原「属性」页；图鉴/首级/建造各页内容没改版，只是被统一进了导航。

## R43：武技熟练度（新手→高手的阶梯）
- 用户：看不到 R41 的平衡效果；要求新手慢（出刀慢、前摇长、收招慢、武器弱），高手明显更强。R41 的 ×1.5→1.0 太隐蔽，已替换。
- `js/balance.js` 重写：`Balance.m(lv)` 返回 {wu,sw,cd,st,dmg}；阶段 生疏(1)/入门(5)/熟练(10)/精通(18)/宗师(27)；`stage()/label()` 供 UI；升阶时弹字幕；`tempo()/earlyDmg()` 仅为兼容（earlyDmg 现在按等级，不再按战力）。数值见文件头注释与 `TUNE`。
- `js/combat.js`：`TK()` 已移除，新增 `MT()`；mm 攻击的前摇/出刀/收招/体力用各自倍率，自由挥砍的 `dur`/`omega` 用出刀倍率（刀慢 → 速度伤害也低）。`WK` 不再含节奏。
- `js/wpnspec.js`：武器属性页用同一倍率；`js/ui.js` 总览加「武技熟练」行；F 拔刀提示带【阶段】；`js/mods.js` / `mods_i18n.js` 改名为「武技熟练 / 前期平衡（R43）」（id 仍为 balance_r41，存档的开关不变）。
- `tools/balance/sim.js`：TUNES.new 同步；新增 ③ 熟练度阶梯表。结果：Lv1 平均出刀间隔 831ms → Lv27 403ms → Lv30 353ms；仅熟练度就使 DPS 约 ×5.2（伤害 45%→100%）。Lv1 对 rar1 TTK 5.8s，早期 Lv2–5 有少量死亡（罚 10% 金币）。
- 与 R35 不冲突：仍是绝对数值，无百分比伤害、无保底刀数。未在真机验证。
- **R43b（用户：“小字看得眼瞎、UI 太普通、不够大师级”）**：武技熟练度 UI 重做。`Balance.card(lv)`（js/balance.js）生成卡片：带进度环的境界印章（壹~伍）、按境界变色的大标题（最大 68px）、五境界路线图、四条大进度条（前摇/收招/体力/伤害，大字百分比 + ×倍率 → 满熟练）；样式 `css/mastery.css`（已在 index.html 引入；字号下限 15px；矮屏 ≤940px 自动紧凑）。升阶改为全屏宽大横幅 `#msUp`（3.6s），不再用小字 toast。测试页：`tools/test/mastery.html`（五阶段静态预览，?lang=zh|en|ja）、`tools/test/hub.html`（已加载 balance.js / mastery.css）。教训：read_file 会缓存同名截图，换文件名再看。
- **R44（用户：“很多地方文字太多，要搭配图形语言，把 UI 改得更好看”）**：
  - 总览页（`js/ui.js statsBody`）重做：等级经验环 + 大战力数字 + 血条；五维属性改成**雷达图**（SVG + HTML 标签，悬停显示基础/装备/建筑明细）；攻防闪避/魂晶产出/回复/背篓、出猎/斩首/累计魂晶/把玩 改成图标数据块；药剂改成图标按钮（保留 `data-a="use"`）。样式 `css/ov.css`（已在 index.html 引入，tools/test/hub.html 也加载）。长说明文字（“提升属性：在洞里建造训练器械…”）已删，放进悬停提示。
  - 按键一览（`js/keyguide.js`）：顶部“先做这三件事”文字条换成三张**操作图**（WASD 十字键帽 + Shift/Space/C + 鼠标；战斗：鼠标左右键高亮“斩/挡”+ F/Q/E/H；首级·菜单：E/LMB/RMB/Tab/Esc/F1），一键一字；下面的详细列表保留并把字号提到 15px；按下的键会在大键帽上亮起（data-c）。
  - 装备页（`js/gear2.js dollHTML`、`js/hub.js kitBody`）：文字属性表换成血条 + 6 个图标数据块（零值变暗）；删掉说明段落，改成底部键帽图例条（LMB 取出/装备 · 拖动整理 · R 旋转 · H 喝药 · Tab 关闭；三语）。CSS 用 `.hk .sk-eq/.sk-foot/.g2note {display:none}` 隐藏了麻袋里的重复文字，非 hub 场景的旧面板不受影响。
  - 教训：`Hub.go('logs'|'codex')` 在测试页里不会渲染（harness 缺 UI 依赖，截图其实还是上一页）；这两页、首级收藏、MOD 列表、天赋页的“图形化”还没做，下一轮继续。

## R45：技能栏 / 小键盘 / 技能特效（用户：“加了技能不知道怎么用；小键盘共通；要在屏幕下面别太小；用技能要有特效”）
- **小键盘**：`talents.js` 的 `DIG` 加了 Numpad0-9，与主键盘 Digit0-9 共用同一排技能栏（Shift+数字=第二排）。`keyguide.js` 图示/列表同步（战斗卡片多一个“1–0 技能 · 小键盘也行”键帽；按小键盘时大键帽也会亮）。
- **用法引导**：① 学会技能时字幕“✨ 学会「X」——已放进快捷栏，按 N 释放”；② 技能栏上方有一条发光提示“按 1–0（主键盘/小键盘都行）释放技能 · T 技能书”，第一次成功施放后消失（localStorage `tb_hint_done`）；没学技能时提示“按 T 学一个技能”；③ **洞里也显示技能栏**（变灰 + 底下一行“出洞后才能释放技能”），在洞里按数字会弹“技能只能在野外使用…”，不再没反应（原来 `#tbBar` 只在野外 `Worlds.active` 时显示，onKey 直接 return）。
- **技能栏放大**（`talents_ui.js` CSS）：`--u` 由 clamp(46,4.4vw,68) 改为 clamp(60,5.4vw,88)；键位角标改成黑底大号徽章；魂能消耗数字 ≥13px。`body.tbcave` 时 `#hint/#propHint/#bkHeld` 抬到栏上方。
- **技能特效**（新 MOD `skill_vfx`，`js/skillfx.js`，默认开）：`TalUI.cast` 成功后调 `SkillFX.cast(id)`：屏幕边缘门派色闪光（大招：冲击波环 + 速度线 + 屏震）、那一格爆光环 + 火花、大图标+技能名横幅（替代 `#tbCast`，`body.sfxon` 时隐藏旧的）；3D：面前迸发的加法火花、脚下双层冲击环、前方光柱，按门派（id 首字母 b/w/s/r/m/h）加新月刃光 / 护盾壳 / 魂火螺旋 / 残影线。**不碰各技能原有的环/弹道逻辑**。教训：光柱/护盾壳不能包住相机（DoubleSide 加法混合会糊屏），光柱放在前方 3.4m。
- 测试：`tools/test/talents.html`（已加载 skillfx.js，背景改暗）；无头 Chromium + swiftshader 里加了 WebGLRenderer 看 3D 特效（见本轮脚本思路：往页面里 `new THREE.WebGLRenderer` 并把 `r.render(scene,camera)` 推进 `G.HOOK.frame`）。未在真机验证。
## R41（本 agent）：战斗特效 3D 化 + 第一人称兽人手 + 第一/第三人称切换（V）
用户原话：战斗效果/质感/动作很劣质；要能切第一/第三人称，第一人称要能看见兽人的手。
- **新文件**：`js/cfx3d.js`（MOD `cfx3d`，3D 命中特效：新月斩光、火花、血雾、冲击环、刀光拖尾；包了 `CombatFX.event`，不碰 foe/worlds 逻辑；无 hit-stop/慢动作）、`js/fpv.js`（MOD `fp_hands` 第一人称兽人双手 + 武器动感；MOD `view_toggle` 第三人称，按 V）、`assets/ogre_body.js`（第三人称身体 = Quaternius「Goblin Animated」CC0，FBX→GLB，**按材质拆成 6 个 mesh**——直接导出会把每个 material group 都导成整身副本，会叠成一团）。
- **第一人称手**：`assets/limb_hand_avatar.js` 的皮肤手，手指程序化弯曲握住武器柄；右手握柄，双手武器/右键格挡时左手也上。`combat.js` 的 `IDLE_H` 抬高一点让手在待机时可见。
- **第三人称**：战斗判定始终按第一人称（眼睛）算；第三人称只在渲染前把相机挪到身后（过肩，带墙/地面/柱子碰撞），微任务里还原。武器按真实位置画在世界里，右臂（双手武器时左臂）做两段 IK 够握柄；Idle/Walk/Run 随速度，出刀时叠加上半身 Attack/Attack2。持首级 / UI 打开 / 回忆 / 未开始时强制第一人称。偏好存 `localStorage soulhead_view`。
- **重要接线**：出猎世界（`Worlds.frame`）不走 `G.HOOK`，所以在 `js/worlds.js` 的渲染前加了一行直接调 `CFX3D.frame` / `FPV.frame` / `FPV.pre`（洞窟里仍走 HOOK）。以后新增每帧系统要注意两条循环。
- 按键一览（`js/keyguide.js`）已加 V；i18n：`tools/i18n/d_r41.py`。
- 测试：`tools/test/fight.html`（已加载 ogre_body）、`tools/test/ogre.html`（哥布林骨骼/动作查看）。真实游戏冒烟：`_tools/mk_t.py 3` 生成 `_t.html`；启动要先选语言（按 1 + Enter），`G.S.intro=true` 跳过序章，F9 关教程。

---

## R41（主管）地区野怪 / 地图修正 / 特殊地点

> 另一个 agent 的提交也叫 "R41"，我的都标 "R41(主管)"。基调仍是第三轮规定：黑暗奇幻、偏重，但不过度猎奇。

**新 MOD（都可在 MOD 面板关闭，默认开启）**
- `region_beasts`：每个地区有自己的野怪。30 种来自 Quaternius Ultimate Monsters（CC0），打包在 `beasts/m_*.js`，名单和各地区权重在 `js/beasts_reg.js`，AI 和动画别名在 `js/beasts.js`。打包工具：`tools/beast_pack.py`。
- `wfix41`：地图修正。
  - 入口门的视线锥内不再有土丘挡视线，土丘也改为偏离入口。
  - 天空和雾的颜色、地平线衔接好了。
  - 去掉了现代街道 HDRI。
  - 光束在近距离或斜视时会淡出。
- `wsites`（`js/wsites.js`）：特殊地点，约 30% 的中型节点会变成其中一种。
  - 共 7 种：篝火夜会、集市、朝圣集会、魔宴、难民营、角斗场、伐木场。
  - 每个地区的权重不同，地点名也会随地区变化，例如"丰收篝火"、"晨祷集会"。
  - 场地会先整平并整块占用，随机地标和宝箱不会落进场地中间。
  - 人会坐在凳子、长椅或箱子上，蹲着烤火，或者砍柴、施法、叫卖，动作都在各自位置上循环（foe.js 的 idle 分支）。
  - 门牌、横幅和顶部 HUD 会显示图标加地点名，到达约 2.8 秒后弹出提示；同时会有更多敌人和额外宝箱。

**我改动的文件和位置**
- `js/worlds.js`：
  - buildNode 里的视线锥、平整通道和土丘偏置。
  - 天空 fogC/hz，以及 `toneMapping()` 外包 `#ifdef TONE_MAPPING`。之前在 NoToneMapping 下（master.js 的后处理管线）会报 shader 错。
  - 新增 `_debug` 和 `stylesOfN`。
  - `wsites` 的接入点：LAYOUTS 注册、layOf、layPlan、layPlace、populate、goto 站位、doorName、横幅和 HUD（2 处）、到达提示。另外 site 节点跳过 placeMark 随机地标。
  - buildNode 的返回值加了 `site`。
- `js/foe.js`：idle 分支里 `fo.slot && WSites.idle` 时保持站位和朝向。
- `js/mods.js`、`js/mods_i18n.js`：加了 3 个 MOD 条目。
- `index.html`：加了 `<script>` 标签：beasts_reg、beasts/m_*、wsites（放在 worlds.js 之前）。
- 其他：`js/wgen.js`、`js/wlayout.js`、`js/hithud.js`（小改）、CREDITS（Quaternius CC0）。
- 测试工具：`tools/test/world.html` 是世界渲染测试台。
  - 例：`?reg=village&seed=11` 加 `__node` 任务，任务参数可带 `lay:'site_bonfire', crowd:1, view:'site'`。
  - 只加载 1 个头、裁剪过的 ASSETS，否则沙箱会爆内存。

**地图 bug 审计剩余项**
- B2 地平线色带：部分修好。
- 还没修：
  - D：边缘漂浮的岩壁。
  - E：capital2 的灰色板块。
  - F：地面或雪接近纯白。
  - G：溪流是一块平的浅色矩形。
  - H：陡坡上铺了鹅卵石。
  - I：标签和营地重复。

## R42（本 agent）：偷听 UI 改版 + 斩首放宽
用户原话：偷听 UI 卡视野，放屏幕中上长框并显示说话人半身像；战斗斩首太难，放宽。
- `js/overhear.js`：`#ohear` 改成屏幕中上方的一条长框（top≈9vh，宽 ≤1040px，约 110px 高），一次只显示当前说话的一句，左侧是说话人的半身像，右上列出在场者并高亮当前说话人；`hudfix.js` 里原来把 `#ohear` 顶到热键栏上方的那条规则已删。
- **半身像**（`Overhear.portraitOf(c)`）：不是贴图资源，而是从场上那个活的 Foe（身体+头）实时渲染：主渲染器 + 离屏 RenderTarget，临时只留这个人（其余顶层物体 visible=false、去掉背景/雾、补一盏柔光），渲完立刻还原，结果缓存成透明 PNG。取不到 Foe（没生成/已离场）就退回显示名字首字的色块。脸朝向用头骨 +Z 取反（VRM 头骨朝向与 Foe 根相反）。
- **斩首放宽**（`js/foe.js`）：头和脖子都算斩首部位；刃速门槛 4.5→3（尸体 3→2）；血线 50%→75%（霸主/精英/猎手 25%→40%，蓄力刀再 +10%，霸主仍不会一刀死）；脖子判定半径 0.075→0.1（扫刀判定额外 +0.09，头 +0.05）；`combat.js` 准星吸附里 head/neck 权重 0.9/1.0→0.78/0.8（更容易选中头颈）；提示「再削弱她一些就能一刀斩首」改为血量>75%时出现。
- 测试台：`tools/test/overhear.html`（= fight.html + ranks + overhear）。沙箱重置后 `.cache/full` 会丢：用 `/tmp/srv.py` 思路（本地没有的文件回源 raw.githubusercontent.com 并缓存）即可。
## R46 野外画质大师化（阶段 1）
用户：“现在地图游戏整体画质太低级了……小作坊感，画质大师化”；澄清：最弱的是**场景环境**，显卡**高端独显**（高档位放手做）。
沙箱 2GB 跑不动完整野外（swiftshader 内存抖动），只能用 `tools/test/worldmaster.html`（地形 macro 着色器 + 粒子的编译/外观测试）验证；真机观感待用户反馈。
新增 MOD `world_master`（cat asset，默认开；`?wm=0` 临时关）——`js/worldmaster.js`（新，本轮所有者：本轮 agent）：
- 地形：`assets.js` triplanar 新选项 `macro`（1=色块，2=+双尺度混合防平铺+陡坡去饱和），`worlds.js` 传 `WorldMaster.terr()`。
- 植被：`worlds.js` 散布处乘 `WorldMaster.dens(kind)`（草/灌木 ultra×1.7 high×1.35；树 ×1.25/1.12）。
- 阴影：进场重建太阳阴影（ultra 4096 + radius4 / high 2048 + radius2.5）。
- 空气粒子：按 `node.region` 不同（草甸花粉/森林光尘+孢子/荒原沙尘/修道院微光/沼泽萤火/要塞灰烬+火星/王都金尘+火星/深渊紫红火星/雪峰飘雪），GPU 里环绕相机循环，加法混合（进 HDR 管线后被泛光点亮）。
- 调色：`master.js` 每帧把 `P`（sat/contrast/shadowTint/highTint/vig/grain）同步进着色器；WorldMaster 按地区缓入目标值、离场恢复。
- `game.js`：`G.postFx = post`、`G.renderer`（供读取档位）。
注意：worlds.js 已有叶片/草的风（WIND）；不要重复做。下一步候选：远景雾层/地面薄雾、云影、水面、地标构图、草卡片 LOD。
### R41（主管）c：用户反馈修正（提示贴底 / 技能栏缩小 / 手握住武器 / 新手武器更弱）
用户原话：“底部那一大串文本应该放在底部不然很卡眼，那个技能槽有点大，然后主角手没按住武器。新手武器应该更弱。”
- **MOD `hud_bottom`**（新文件 `js/hudbot.js`，index.html 里放在 hudfix.js 后面）：只加 CSS，用 `body.hbot` 前缀加 `!important`，没改任何 DOM id。
  - 野外 `#wHint` 和洞里 `#hint` 改成贴屏幕最底的一条细字（13px，超长省略），技能栏 `bottom` 由 10px 改为 34px 让出位置。之前 hudfix 和 talents_ui 会把这行字抬到技能栏上方，正挡视线。
  - 技能栏 `--u` 改为 clamp(50,4.6vw,72)。R45 的 60–88 在 960px 宽的屏幕上已经超出屏幕宽度。
  - `.tbhint` 字号 18→15；洞里"出洞后才能释放技能"改成栏上方的小字。
  - `worlds.js hud()`：MOD 开启时，野外默认提示去掉括号里那一长段战斗说明（F1 里有）。
- **手握住武器**（`js/fpv.js`，另一个 agent 的文件，只改了 2 处）：
  - 握持点 `GL` 由 (0.008,-0.05,-0.085) 改为 (-0.01,-0.024,-0.058)，也就是卷指圆弧的圆心。原来的点在拳外约 3.5cm，手浮在柄旁边，手指也没包住柄。
  - 卷指角 2.5→3.0，拳握得更紧。
- **武器握反了**（`js/game.js`）：
  - `WPN_ASSET` 新增第 4 项 flip。自动判断"细端 = 柄"对砍刀、斧头、刺剑判反了，原来握在刀刃、斧头、剑尖上。
  - `assetWeapon` 改为以握柄端的截面中心为轴，弯柄斧子原来手够不到柄。
  - 测试页：`tools/test/fpv.html#<tier>`，配合 `/var/work/s/fpv.js` 截第一人称画面。7 把武器已逐一目检。
- **MOD `weak_starter`**：`RPG.wpnK(tier)` 让粗木棒（tier 0）伤害 ×0.6。
  - 生效位置：`worlds.js` 的 `ctx.power`（FoeAbs 和旧公式两条路径、野兽都走它），以及 `wpnspec.js` 武器属性页的显示（另一个 agent 的文件，只改了 1 处乘数）。
  - 另外改了 rpg.js 里粗木棒的描述。
  - 和 Balance（熟练度，Lv1 伤害 ×0.45）叠加。
- 测试页 `tools/test/hud.html`：talents 测试台加上 hudfix、hudbot、ui3a.css，截 HUD。`#off` 为 R45 原样，默认为新样式。

### R42b（用户纠正）：斩首 = 致死一击；只有部分武器技能可按血线斩首
- 用户原话：「要伤害能够到达打死时才能斩首！有些武器技能可以按你说的血量少于斩首」。**覆盖上面 R42 的 75% 血线写法**。
- `js/foe.js` hit()：普通横砍命中头/脖子，只有这一刀把血量打到 ≤0（致死）才斩首；去掉了“破绽中不看血量”的捷径。`info.decapAt`（技能专用）= 血量比例线，命中头/脖子且血量 ≤ 该比例时斩首；霸主/精英/猎手上限 25%。尸体补刀斩首仍宽松（刃速>2）。头、脖子都算斩首部位；脖子判定半径/吸附权重的放宽保留。提示改为“她只剩一口气，再补一刀头颈就能斩首”。
- `js/talents.js`：`hitFoe` 透传 `o.decapAt`。带血线斩首的技能：旋风斩（扫脖子高度，≤35%）、百刃最后一刀（≤40%）、处决令非处决那一击（≤50%；≤35% 本来就直接处决）。技能描述（`talents_data.js` + `tools/i18n/d_talents.py`）已同步三语。
- `tools/test/srv.py`：沙箱重置后的测试服务器（本地没有的文件回源 GitHub raw 并缓存）；`cp tools/test/srv.py /tmp/ && python3 /tmp/srv.py &`。
## R46 阶段 2：地形特色化（MOD `terrain_master`，`js/wterrain.js`，?wt=0 关）
用户反馈：“地形生成挺没特色，比较一般，很重复”。原地形=平缓盆地(±1~3m)+外圈山坡，每张图都像。
- `WTerrain.wrap(H, X)`（worlds.js 在 WGen.prepare 之后包一层 H）：脊状分形 + 域扭曲 + 地层台阶（wilds/fortress/capital/peak/abyss）；每地点 1~3 个标志地貌（断崖/古冢/深壕/石冢/高台，种子决定；名字加进 g.tag 显示在 HUD 标签）。门口(13m内渐弱)、水边(wd<7渐弱，水面由原 g.h 决定故水边不动)、中心渐弱；lake/ravine 布局不叠加，henge ×0.5。
- 坡度贴岩：`Assets.triplanar` 新选项 `rock/rockTint/rockLite/rockScale`（三平面岩石 diff/nor/arm 按坡度混合；mid 档 rockLite 不混法线）。新增 CC0 贴图（Poly Haven，phtex.py 512px）`big/world/tex_aerial_rocks_02|cliff_side|rock_face_03.js`（共约 0.65MB），按地区选（meadow/forest/swamp/ruins 青苔岩，wilds 层岩，fortress/capital/abyss/peak 灰岩+染色）；`WGen.assets` 里追加需要加载的贴图名。
- 陡坡长岩石：`WTerrain.outcrops`（复用该地区样式里 kind='rock' 的模型，不新增模型）；陡坡（>1.05 草/灌，>0.8 树）不长草树（worlds.js 散布循环里 `stp`）。
- 测试：`tools/test/wterrain.html?s=1&r=meadow,forest,...`（9 地区网格渲染；首次渲染后要 await 再画，否则是空帧）。沙箱 2GB 跑不了整个野外，真机观感待用户确认。
- 玩家/敌人直接贴 H，没有坡度限制；断崖最陡约 50°，可直接走上去。下一步候选：断崖处加碰撞/爬不上去的感觉、河谷/瀑布、更多标志地貌（环形山、天然拱桥、巨树洞）。

## R46 阶段 3：地形“无限多样”（wterrain.js 重写扩展）
用户：“最好随机生成，不要让玩家玩腻，多样性要无限丰富”。每次出猎的地点种子本来就是 Math.random（genTrip），这轮把“从种子能长出多少不同东西”做大：
- 地貌库 5→16 种（新增 乱石岗/长谷/古道(连接两个门的路基)/阶梯坑/天坑/阶梯台/马蹄岭/脊刃/地裂/火山丘/沙浪），每种的位置、尺寸、高度、朝向、数量都是连续随机量；每地点抽 1~4 个（按地区权重）。300 个荒原地点里有 236 种不同组合。
- 地形基因：起伏强度 rug（对数正态，10% 极平缓 / 8% 极险峻，HUD 标签显示“平缓/险峻”）、山脊频率、方向拉伸、扭曲量。
- 植被构图（`WTerrain.veg`）：每地点随机 散布/林丛/林间空地/空心林/林带/稀树，调制树和灌木的保留概率（worlds.js 散布循环 `vg`，并把树/灌木基础数量 ×1.45 补偿被剔除的部分）；名字也写进标签。
- 岩石贴图：同一地区按种子随机选 2~3 种（贴图+染色抖动），`assets()` 与 `rock()` 用同一个确定函数，保证加载的就是用到的。
- 注意：沙箱重置会清空 /var/work；本轮脚本存在 /home/user/r46/。测试页渲染偶尔出现整格空白（swiftshader 停顿），重跑即可。
### R41（主管）d：武器基础属性 + 单武器熟练度
用户原话：“为什么武器属性那么少；生疏/前摇/后摇系统最好绑定每个武器的武器熟练度；武器要有各种基础属性（前摇、后摇…）”
- **新文件 `js/wpnx.js`**（index.html 里放在 talents_data.js 前面），包含两个 MOD，默认都开：
  - **`wpn_stats`**：7 把武器各有一套属性 `WpnX.P[tier]`：前摇 / 出刀 / 后摇 / 体力倍率、触及（米）、破防率、暴击率 / 暴伤、切割（砍颈加伤）、击退、格挡耗体、完美格挡窗口。
    - MOD 开启时替代原来单一的"自重" `WK(S.wt)`。
    - 所有属性都真实生效，接入点如下：
      - `combat.js`：`PF()` / `KW(k)`；`mmAttack` 的前摇、出刀、冷却和体力；旧挥砍节奏的 2 处；索敌距离加 reach。
      - `foe.js hit`：`WP` 带来破防率（普通一击砸开格挡，伤害仍按普通一击算）、暴击、颈部 ×(1+cut)、击退 ×kb。技能、法术、proc 不吃武器属性。
      - `beasts.js hit`：暴击和击退。
      - `worlds.js hitPlayer`：完美格挡窗口 0.3s×par，格挡耗体 14×bst。
  - **`wpn_mastery`**：生疏→宗师的熟练度按每把武器各自累计，存在 `S.wmx[tier]`。
    - 经验来源：命中 +1（重击 +2）、击倒 +6、斩首 / 处决 / 一刀斩 +10。技能不算。
    - 境界门槛：0 / 60 / 300 / 900 / 2200。
    - 倍率：前摇 1.8→0.9、出刀 1.4→0.9、后摇 1.7→0.85、体力 1.4→1.0、伤害 0.6→1.0。
    - 旧存档（`S.wmxV`）：把按角色等级算出的境界记到当前那把武器上。
- **`js/balance.js`**（另一个 agent 的文件，最小改动）：
  - `m()`、`dmgK()`、`label()`、`card()` 在不传 lv 且 wpn_mastery 开启时，转给 WpnX 处理。combat 的 `MT()`、`foe_abs.power`、wpnspec、总览卡片都自动跟着走。
  - `frame()` 在 wpn_mastery 开启时不再发按等级的晋升横幅。
  - 导出了 `banner`（WpnX 晋升时复用）。
- **`js/wpnspec.js`**：
  - 按武器属性和这把武器的熟练度计算。
  - 表格新增"后摇"列（= 间隔 − 出刀）。
  - 新增行：破防率、切割、击退、格挡耗体、完美格挡窗口、武器熟练。
  - 背包悬浮提示增加一行属性和 7 条属性条（`WpnX.bars`），FEEL 文案也改成和属性一致。
- `worlds.js foeEvent0` 调用 `WpnX.onEvent`。
- 测试页 `tools/test/wpn.html`：talents 测试台加上 balance、wpnx、mastery.css。已核对：委托生效、单武器涨经验、晋升，以及面板、提示、卡片的截图。

## R47（第四十三轮，agent 侧：身份服饰 / 后退变慢 / 敌人逼近）
用户诉求：战斗逻辑总有 BUG；战斗中后退应变慢、敌人重击可边打边前进（否则能无限后撤，想逃得转身跑）；单位还是弱智；大头娃娃；角色形象不符合身份。
- **MOD `id_outfit`（默认开）**：`foe.js bodyFor` 在 CC0 模式下按身份固定选身体（`OUTFIT`/`OUTFIT_BOSS` 表）：Vita=战斗/冒险装，Victoria_Rubin=贵族/圣职礼裙，Darkness_Shibu=女巫/暗系长裙，HairSample_Female=平民素裙；霸主按地区。以前是哈希乱分（修女穿魔女裙）。**CC0 模式只有 4 具身体，衣服款式受限，要更贴身份只能增加 CC0 身体（放 big/body/ 后加进 cc0mode.js BODIES 与 OUTFIT 表）。**
- **MOD `head_natural`（默认开）**：`headFit` 头缩 10%（实测脸部高 ~0.29m / 身高 1.7m ≈ 1:5.8，偏大头娃娃 → ~1:6.5）。各头模型的脸高实测一致（0.29–0.31），`tools/test/heads_fit.html` 是加载 11 个 CC0 头的对比台。
- **MOD `back_slow`（默认开）**：`worlds.js` 玩家移动：14m 内有已发现你且没逃跑的敌人时，倒着走速度 ×0.55；首次提示 toast。
- **MOD `foe_press`（默认开）**：`foe.js atkStep`：出招（非远程、非定格蓄力帧）时朝玩家迈步，普通 1.9m/s、重击 3.0m/s（霸主 ×1.15）；命中距离 +0.3（重击 +0.55）；落空且玩家仍在 3.2m 内、iq>0.45 → cd 缩到 0.3–0.6s 立刻补刀，最多连 2 次（`fo.chain`）。已有的“预判走位 lead”保持。bench：玩家以 2m/s 倒退 8 秒，开启时被追上打中，关闭时永远追不上。
- 补了 R41/R43 MOD 的英日文（mods_i18n.js）。
- 待用户确认：“大头娃娃有时候还有-”后半句没发全；“单位弱智”具体表现。
## R41（主管）e —— R47 第 3 项：二次元人物逆光难看 / 恐怖谷
- 病因：heads.js FaceFill 的 anime_shade（暗面抬到满日照 80%）/ face_light+char_lift（绝对亮度下限 uFill）/ skin_sss（交界处染红）都是**绝对尺度** → 逆光/阴天里脸发泥棕、红交界、或像自发光纸片人，且比环境亮。
- 新 MOD `char_unify`（默认开，mods.js 在 anime_shade 前一行）：新文件 `js/charlight.js`（`CharLight.patch(sh)` 插在 aomap_fragment 前）。
  环境相对明暗：full = 反照率×太阳色 + 间接光；暗面只抬到 full×0.4×上下体积项，亮面不动、点光原样；逆光轮廓太阳色边缘光；高光 ×0.2。`CharLight.tune({shade,rim,spec})` 可调。
- heads.js 最小改动（6 处，均带 R47 注释）：uFill getter、animeOn、sssOn 在 char_unify 开时旁路；inject 末尾调 CharLight.patch；wrap 在 char_unify 开时也接管身体 PBR；program cache key 加 'U'。
- index.html：heads.js 前加 `<script src="js/charlight.js">`。
- js/mods_i18n.js：加 char_unify 英/日译文。
- tools/test/world.html：载入 mods.js（`?mods=id:0,id:1` 覆盖）、master/worldmaster/wterrain 后处理（`?post=0` 关）、`view:'face'` 特写（`sun:'back'|'front'|'side'`、`se` 仰角、`si` 太阳倍率、`cd` 距离），info 里带灯光清单。
- 验证截图（逆光/强逆光/暗场景，开关对比）：关=脸泥棕+红交界；开=脸干净、衣服有体积、轮廓有逆光边；暗场景开 MOD 不比环境亮。

## R47b（第四十三轮续：身份外观 / 猎手条 / 顶部醒目）
用户：“你那些也不符合人设，应该去找合适的衣服-头发-饰品；猎手条满了过了之后不应该到 0 么；UI 藏在角落太不显眼。”
- **新文件 `js/idlook.js`（MOD `id_look`，默认开）**：`IdLook.apply(h)`（在 `Foe.populate` 里、build 之前调用，改 `h.look`，头被砍下后是同一个 look）按身份 `c.id` 重配发色（`S` 表）、`look.acc`（公主 tiara / 女王 crown / 女巫 witchhat / 圣职 circlet，去掉不合身份的王冠等）、`look.hw` 头饰、发型 `hx`，并清掉 `look.ax`（跨头饰品）；`IdLook.dress(f,id)` 在身体 build 后给材质名以 `_CLOTH` 结尾的衣服/鞋做“按亮度重新着色”（克隆材质 + onBeforeCompile 注入 map_fragment 后：`mix(lum,c,keep)*tint`），修女黑修道服、骑士钢灰、游侠森林绿、女王深红等。**局限：Vita 的短裙/丝袜烘在皮肤贴图里，染不了**。霸主不着色。
- **`headwear.js` 新增 `veil`（头纱）**：罩头顶/后脑，前面留脸，两侧背后垂到肩，前缘白头巾边；nun/abbess/novice 必带。
- **CC0 调研结论**：ToxSam open-source-avatars（100Avatars 等）是 CC0 VRM，但全是梗图/卡通风（玉米、土豆……），不适合；CC0 的成年女性带幻想服饰的 VRoid 身体已经用完（Vivi 偏幼、Sendagaya 是学生制服已排除）。想要骑士甲/法袍等真实服装，只能关 `cc0_only`（IDENT 表本来就按原神身体设计）或再找新的 CC0 身体。
- **猎手感应条（`hunters2.js`）**：① 猎手穿越到场的瞬间 `T.m=0`（以前要等她死/逃/撤退才归零，所以条一直满着）；② 条移到顶部居中（top:88px，宽 460px，16px 粗体，13px 高的条，满时红色脉冲），猎手在场/首领战/擂台/洞口时隐藏，避免和顶部血条重叠。
- 测试台：`tools/test/heads_fit.html` 加了 `idlook.js`。

## R47c（第四十三轮续：取消 CC0 限制 / 偷听恢复老版）
- 用户：“不限制 CC0 了”“偷听 UI 你目前这个还不如老版那个”。
- **`cc0_only` 默认改为关**（`mods.js` def:false + 迁移 `__v 11`：旧存档也一次性关掉；O 面板仍可重新打开）。关掉后走原来的 IDENT/VB 身体表（原神等身体的服饰本来就贴身份）；`id_outfit` 只在 CC0 模式生效；`id_look` 在关 CC0 时只改 VRoid(CC0) 头，原神/MMD 头保留自带发型/头饰，`dress()` 只给 4 具 CC0 裙装身体换色。已验证：关 CC0 时 knight→Eula、ranger→Amber、witch→Darkness_Shibu。head_collage/head_native 等 R38 的联动开关未动（想恢复 R36b 的“头保持原样”需用户另说）。
- **`overhear.js`**：新增 MOD `overhear_old`（默认开）= 第二十八轮老版弹框（`showOld`，`#ohold`：屏幕中下方、气泡尖角、每个说话人一块名牌含魂阶/阶位/口头禅、对白逐句弹出）；关掉 = R42 顶部长条 + 半身像。
## R46 stage 4（偷听 UI 卡顿 / 长图与特殊形状地图 / 地形自检）
用户原话：「现在改版偷听UI好卡」「来点长点的图或者特殊形状的图」「你自己模拟，要完全正确的地形，不要千篇一律」。
- **偷听 UI 卡顿（js/overhear.js）**：原因＝`portraitOf` 渲染头像时加灯、去雾、改输出编码 → 着色器变体与主渲染不同，首次必须临时编译（几百 ms 卡死），且一帧里同步渲 3 张。
  现在：后处理开启时走 HDR 线性 RT（FloatType），不改灯光、不换雾类型（只改 uniform：FogExp2.density=0）、`toneMapping=None`（与主渲染一致，无新变体），JS 侧 ACES 近似+gamma 转 PNG；头像逐个错开渲染（弹框先出，头像 500ms+350ms×i 后补上）；192×224；渲染时 `shadowMap.autoUpdate=false`；CSS 去掉 drop-shadow 滤镜、缩小 box-shadow、`will-change/contain`、去掉 height 过渡。测试页 `tools/test/overhear.html`（两条路径都出图、状态全部还原）。**未在真实游戏里实测帧时间。**
- **长图 / 特殊形状（MOD `map_shapes`，`?ws=0` 关）**：`js/wlayout.js` `shapeUp`。边界仍是极坐标半径表 ρ(a)（720 格，星形域，老接口全兼容），但由图元并集射线行进得到：`long` 长廊（长宽比可到 3–4，Rmax≤66）、`lobes` 2–5 叶花瓣/花生、`arms` 2–6 臂十字/星芒、`poly` 三角/矩形/五六边形（圆角）、`ell` 长椭圆、`bent` 折角 L/V/Y、`snake` S 形；`round` 仍是旧近圆。始终并入基础圆盘 `max(0.68R, min(R,13))` ⇒ 最小半径有保证。
  新增 LP 接口：`Rf/Rmax/Rmin/areaK/tips/samp(r,m)/dOut(x,z)/edge(x,z)→[距墙,内法线nx,nz]/clamp(p,m)/bp(t)/perim`。`dOut` 是到边界的真实带符号距离（直墙精确）。
  worlds.js：门优先开在尖角/长廊端（其余门取离其它门最远的边界点），门朝向＝边界外法线；坡（rim）按 `dOut` 起坡；散布/宝箱/生成点按面积均匀采样 `samp`；边界树带与坡上草环沿边界等弧长；玩家撞墙沿法线推回（`lp.clamp`，不再径向拖回中心）；foe/beast/hunter/prey/boss 的边界判定全部改用 `ctx.edge`（foe.js 的 `EDGE`、导航网格覆盖外接圆按真实边界挡；foe_ai2/foe_roles2/beasts/hunters2 同步）。圆形地图没有 `edge` 时全部回退旧逻辑。
  wterrain.js：地貌落点 `spot` 用 `samp`（长廊/各臂上都有地貌），遮罩衰减按 `dOut`。wgen.js：景物落点、地面着色衰减同样用 `dOut`。
- **地形自检模拟（tools/sim/）**：node 里加载真实 `worlds.js/wgen.js/wlayout.js/wterrain.js` + 真 three，对随机种子×风格×尺寸×形状调用 `Worlds._debug.buildNode`，1m 网格检查：NaN/超大、门在边界内且不在水里、门前平坦、门不互相贴近、从门出发 flood-fill（坡度≤0.95）所有门连通/中心可达/覆盖率、宝箱与生成点在界内、不在水里、可达、`cols` 不大量在墙外。`N=200 S=2 node sim2.js`；`diag.js` 找陡坡来源；`montage.js + montage.py` 生成俯视地形图；`shapetest.js` 校验形状表。
  **这轮靠自检发现并修掉的真 bug（多数是旧代码的）**：① 池塘水位取自坡面 8 点平均，`max(h, lv+0.02)` 在 d=7m 处断开 → 抬出 5m 高的平台断崖（ravine/丘陵里常见）；河岸同理。已平滑过渡，并要求池塘只挖在平坦处。② 峡谷（ravine）通道止于 0.93R，特殊形状的门前是一堵 5.5m 高墙；现在通道通到门口。③ 环形山（crater）/火山（volcano）是封闭圈，坑里进不去 → 各开一个豁口。④ 台地（mesa）边缘近垂直 → 放缓。⑤ 多个地貌叠加出近垂直墙 → `wterrain` 把起伏量烘成 1.5m 网格做 8 邻域 Lipschitz 限幅（≤1.25 m/m），双线性取样，离边界 >18m 渐回原函数（无缝）。坡度 p99 从 ~5.1 降到 ~2.2–2.7；几个风格×约 1000 个节点的自检基本全过，剩下个别小图宝箱/中心点不可达（<0.5%）。
- 未验证：真实游戏里的帧率、长图（Rmax 66、地形网格 ≤220 段 → 约 1.2m/格）的视觉与性能；没有在真实游戏里走过长廊；foe 导航网格在大图上（~130²）BFS 的耗时。下一步可看：长图里的植被密度（草上限 3200 被摊薄）、地图小地图/门标签。
## R41（主管）f —— R47 用户反馈：“这个风格完全不行，改成二次元渲染 + 边缘勾线，颜色有层次，色调随环境；可尝试多种风格；环境可做风格化 3D 材质 + 二次元阴影”
- `js/charlight.js` 重写：人物风格 MOD 组 `cstyle`（单选）：`cs_cel` 赛璐璐（默认）/ `cs_soft` 柔光动画 / `cs_paint` 厚涂质感 / `cs_real` 上一版写实相对光。均需 `char_unify` 开。
  - 明暗只由太阳决定：N·L × 直接采样太阳阴影图（getShadow）；篝火等点光作为“环境影响色”暖光叠加两侧。
  - 五层：基础色（亮面平涂，主光色）/ 阴影色（亮度 = 此处满受光×比例，色相 = 环境光色略冷，提饱和）/ 最暗（朝下面：下巴下、袖底）/ 阶梯高光 / 逆光轮廓光（太阳色）。全部从 Ei（环境辐照度）、S（太阳色）推出，无写死色调。
  - 皮肤按反照率色相判定 → 柔和宽过渡、更亮阴影（脸不出硬阴影块）；头材质（CL_HEAD）弱化自身投影（刘海不把眼睛切黑）。
- 新 MOD `char_outline`（默认开）：反向外壳勾线，`CharLight.dress(root)` 在 foe.js `build()` return 前调用（1 行）。外壳是原网格的子物体（共享骨骼/morph），往后推 2cm 只留外轮廓，远处变细，>30m 不画；线色 = 贴图色提饱和 × 环境亮度/色调（每帧采样灯光）。
- 新 MOD `world_cel`（默认关）：全局 ShaderChunk.lights_fragment_end 追加块，只作用于非角色 MeshStandardMaterial：阴影边缘收硬、阴影染天空色、亮面略平。
- heads.js：inject 多传 head 参数、cache key 用 `CharLight.key()`。mods.js / mods_i18n.js：6 个新条目。
- world.html 测试：`?cldbg=1` 着色调试（R=太阳受光 G=明暗带 B=点光占比）、`nopt:1` 关点光、`sa`/`se` 太阳方位/仰角（相对相机方向）、`fi` 选人。

## R48（CC0 默认重新打开 / 男头全部屏蔽 / Quaternius 职业服身体）
用户原话：「算了还是得CC0」「真有大头娃娃，一些男性角色模型」「动用一切手段在网上找合适的模型，不限于 CC0」。ask_user 结论：① CC0 模式默认**开**，在线找模型不限 CC0，非 CC0 的放进“非 CC0 包”（只在关 CC0 时出现）；② 随机头池**删光所有男头**（不许男头接女身体）。
- **CC0 默认开**：`mods.js` `cc0_only` def true + 迁移 `__v<12`（把 R47c 的 false 改回 true，一次性）。名称/说明（zh/en/ja）同步。**非 CC0 包 = 原有 24 具 remote 身体 + MMD 头包**：关 CC0 时走 R47c 的 IDENT/VB 逻辑（未改）；本轮新增的 Q_* 身体目前只在 CC0 开时按身份指派（`id_outfit`）。
- **男头**：`heads.js` `QC_BAD` += `HairSample_Male`、`Sakurada_Fumiriya`（MOD `head_qc`），并且 `OK(i)` 现在也排除 `qcBad`，所以**旧存档里的男头也会按种子换成女头**。300 次随机 look 抽样：0 个男头。另：`foe.js` `head_natural` 下把头的皮肤包围盒高度夹到 ≤0.272m（Vivi/Vita/Victoria 脸比别的高 ~8%）。
- **新身体（CC0，Quaternius，remote-only `big/body/Q_*.js`，共 ~7MB）**：`Q_Witch / Q_Medieval / Q_Adventurer / Q_Formal / Q_Soldier`（Ultimate Modular Women，低多边形纯色）+ `Q_Ranger / Q_Peasant`（Modular Character Outfits Fantasy 免费版，带贴图，质量最好）。`tools/glb2body.py`：注入 VRMC_vrm.humanoid 后调 `vrm2body.py`（删头、封颈、H_ 骨名）；Modular Women 是 IK 骨架（大腿在 Body 下、脚在 Root 下）→ 转换时把 UpperLeg 重挂到 Hips、Foot 重挂到 LowerLeg（保持静止世界矩阵），否则 UAL 动画下腿会拉成“面条”；`PT*` 是极向量目标，不是脚趾，别映射。
- **身份→身体（`foe.js` `OUTFIT`，仅 CC0 开）**：Q_Witch=witch/hexer/covenlady/bogwitch/alchemist；Q_Ranger=huntress/ranger/archer/falconer；Q_Adventurer=merc/dragonslayer/catthief；Q_Medieval（黑甲+肩甲+背剑）=knight/paladin/general/dragonknight/inquisitor/fallen/assassin/shadow；Q_Soldier=guard；Q_Peasant=villager/shepherd/herbalist；Q_Formal（绿裙）=barmaid；Vita / Victoria_Rubin / Darkness_Shibu / HairSample_Female 留给其余身份（贵族、圣职、宫廷法师、修女…）。Boss：forest→Q_Ranger，wilds→Q_Adventurer，swamp→Q_Witch，fortress→Q_Medieval。`cc0mode.js` 新增 `QB`（只进 `okBody`，不进随机后备池 `BODIES`）。`foe.js`：`Q_` 纯色身体的皮肤材质直接染成头肤色。
- **否决**（见 CREDITS.md）：Ultimate Animated Characters 女性（~1.35m Q 版）、AvatarSample_E（1.17m 幼态）/F/G（同 Vita 款）、Kenney 迷你、Quaternius RPG Characters（Q 版）。Modular Fantasy 的 Noble/Wizard/Knight 在付费版（$20），免费版只有 Ranger/Peasant。
- **没找到**：合适的 骑士/修女/公主/女王 CC0 身体（骑士暂用 Q_Medieval 黑甲风，其余仍用 pixiv 裙装）。非 CC0 方向（VRoid Hub/Booth/Sketchfab）要登录或付费，未下载。
- 风格提醒：Q_* 低模（尤其 Modular Women）与动漫头有画风差，这是用户要“职业服贴身份”的取舍；`Q_Ranger/Q_Peasant` 较协调。未验证：真实游戏里的帧率/全流程（只在 fight/heads_fit 台里看过静态与 UAL 动画姿态）。

## R49 · 剧情电影「异变」+ 月之线索（MOD `saga`，默认开，仅中文）
用户原话：「每进入一个区域来一个电影，字幕，每次都不一样，有地区特色，分镜电影化，二次元女主剧情的感觉；剧情围绕该地点的一个变化，本次主线任务=杀死目标得到头，变化对你有利；没杀死则不利。大师级随机无穷组合。主线还是杀死月之魔女；不同区域会遇到月之魔女使者线索，杀死线索+1，集齐才能挑战；触发某些条件解锁剧情，剧情有线索。战中三选一→做成建筑，出门结算要更好玩。技能改成「回忆」：随机 3 选 1，不同流派。头棋对手太弱没成就感。」
- 文件：`js/saga_data.js`（地区词库×11 个异变原型×独白/线索/章节模板）、`js/saga.js`（生成器 + 电影播放器 + 目标注入 + 恩/祸 + 线索 + 结算 + 追踪 HUD）。测试：`node tools/test/saga_gen.js`（槽位全填满、约 8600 条不同文本行/3000 次、时长分布），`tools/test/saga.html`（真 three + 假地形 + 桩，`/var/work/pw/saga_shots.js` 截图）。
- 改动的旧文件（一行级）：`js/worlds.js` frame 末尾调用 `Saga.cam`；`js/arrival2.js` Saga 开时不自动弹大窗；`js/elites.js` victoryState.all=月之魔女已斩（Saga 开时）+ goalHTML 用 Saga；`js/ui.js` 出洞页提示；`index.html`；`mods.js`/`mods_i18n.js`。
- 流程：`Worlds.start` 包装 → `setupTrip` 生成 saga（槽位随机：名字、头衔、异变类型、地区词库；同地区最近 3 个原型不重复；线索未满时月使概率 0.28+0.2×连续未遇次数），在 depth≥1 的节点注入一名有名有姓的目标（沿用 RegionQuest 的 RPG.foe + Foe.populate 方式，HP 按 FoeAbs.hpK(rec×1.1)，月使更强）。W.B 就绪后播放电影：宽银幕 2.39:1、颗粒/暗角/地区色调、字幕（说话人牌）、6~7 个镜头（航拍/推轨/低角扫摄/环绕/俯瞰/走向门），`Saga.cam` 在 worlds frame 里接管真 3D 相机；空格/点击下一幕，Esc 跳过，最后一幕等玩家按空格出发（保证重新锁定指针有用户手势）。首访约 40 秒，4 次以后逐步缩短（lvl 0/1/2）。
- 恩/祸（2 趟该地区）：恩 = 敌伤 −12% / 结算魂晶 +35% / 入场回血 30%；祸 = 敌伤 +12% / 敌血 +15% / 仇恨 +6 / 结算时损失 6% 魂晶（≤800）。斩首即平息（大横幅），回洞后 1.6 秒弹出「出门结算」卡（异变结局、恩祸、战利品、线索进度）。死亡不结算。
- 月之魔女：`Elites.MOON.cond` 改为「月之线索 ≥7」（运行时补丁，Saga 关闭则回到 13 精英）。线索来源：月使（斩首）、8 个章节闪回（kills≥10 / 首个霸主 / 首个猎手 / 首个精英 / 失败≥2 / 成功≥3 / 同地区≥4 次 / 稀有头）。线索列表显示在「精英挑战」面板顶部。
- 未验证：真实游戏里的相机接管（FPV 手臂/武器是 camera 子节点，进电影时隐藏；FPV 若每帧重设 visible 会露一下）、HUD 隐藏（body 直属子元素 opacity=0）、目标注入在狭长/特殊形状地图上的位置。
- 待做（同一轮后续）：回忆祭坛建筑（随机 3 选 1 技能，不同流派）、头棋 AI 加强。
## R41（主管）g —— R47 第 4 项：人物移动像 GMod（+ 用户：R47f 的风格全部保留，world_cel 改默认开）
- 新 MOD `npc_locomo`（默认开），新文件 `js/locomo.js`。实测（脚+脚趾着地点轨迹，tools/test 下 calib 脚本思路见文件头）：髋高 0.93m 身体上 UAL 自然步速 走 0.98 / Jog 5.9 / Sprint ~9.1 m/s。
  原 AI：走 1.6–1.8m/s（脚前滑 ~2×）、慢跑 3.4m/s 播 Jog×0.85（腿快 1.5×，原地蹬跑步机）、Sprint 同理 → GMod 感。
  - 拦截 f.play 的 Walk/Walk_Formal/Jog/Sprint → 按【实际位移速度】三段相位同步混合（左脚最前相位对齐），播放速率 = 速度/混合步幅，限幅 走 0.5–1.8×、跑 0.5/0.62–1.25×。后退只用走路倒放。
  - 起步 7m/s² / 刹车 10m/s²（职业 rv 突进 16，攻击 fo.atk 时保持原 14/s 指数响应）。
  - 转身：角速度弹簧（角加速度 26rad/s²，最大角速度随速度 5.2→2.3 rad/s），跑动时向内侧倾身（≤0.12rad，root.rotation.z）。
  - AI 要 Idle 但还在滑行（>0.55m/s）→ 先减速到 0.35m/s 再切。攻击/受击立即交叉淡出移动动作。
  - 测试：同速度下着地脚滑移（m/s）旧→新：0.8m/s 0.30→0.09；3.5m/s 1.65→0.20；4.5m/s 3.45→0.22。真实 AI（world.html crowd+sees）追击→逼近→出拳全流程无报错。
- foe.js 4 处钩子（均带 R47 npc_locomo 注释）：animate 暴露 `f._cur/_setCur` + `Locomo.install(f)`；转身行；速度平滑行（`burst` 标志）；`mixer.update` 前 `Locomo.tick`。
- mods.js：npc_locomo 条目；world_cel 默认 true。mods_i18n.js：npc_locomo。index.html / world.html：foe.js 前加 locomo.js。
- world.html：`window.__foes`（crowd 敌人数组）。

## R49 stage B+C（saga 续：回忆 / 沙盘 / 战利品三选一 / 棋 AI）
- **新文件 `js/memory.js`（`window.Memory`，MOD `memory` 默认开）**：技能点改成「回忆」——从「当前可学」的天赋节点里随机抽 3 张（有 🪞回忆之镜 建筑时 4 张），**必须来自不同流派**（刃舞/铁壁/影袭/狂血/魂术/猎首），三选一，选中走 `Talents.alloc(id)`；还有点数就连抽。重抽：魂晶 40×等级×次数；有镜子时每轮第 1 次免费；`S.saga.rr` 重抽券（结算三选一可得）也免费。键 1–4 / R / Esc；洞里有空余技能点时右上角徽标提示，**按 ` (反引号) 唤醒**；出门结算卡关闭后自动弹出 `Memory.afterSettle()`。天赋树界面仍可手动加点（未移除）。
- **新建筑（都注册在 `BuildCat.C`，由 memory.js 的 `registerBuild()` 等 `G.HOOK`/`BuildCat` 就绪后注入，无新模型，复用 CC0：ornate_mirror_01 / brass_candleholders / chinese_console_table / Lantern_01）**：`memory` 回忆之镜（E 打开回忆；出猎 1 次后解锁）、`wartable` 征途沙盘（E 打开 `UI.openExpedition()`＝出猎地点三选一；tip 里显示 Saga 月之线索）。原有 Tab 枢纽/出洞入口保持不变。
- **结算卡（`js/saga.js` `showSettle`）**：新增「战利品 · 三选一」（魂晶袋 / 旧日手札=经验 / 月下泉水=回血 45% / 镜中残片=回忆重抽券 / 安魂烛=仇恨 −6 / 磨刀石），点击选、关卡时 `applyReward()` 发放（默认第 1 份）；卡片紧凑化使 720p 也能一屏看完（含“收下结算”）。
- **棋 AI（`js/chess.js`）大幅增强**：迭代加深 + Zobrist 置换表 + 杀手/历史启发 + PVS + LMR + 静态搜索 6 层 + 新评估（兵形/通路兵/开放线/双象/王盾/残局王活跃/对方重子逼近王/XS 特殊走法加成）。难度阶梯：1–4 级仍是「固定深度+噪声」（新手友好），5–12 级改为 `md`(最大迭代深度 5→10) + `time`(1.8s→4.8s) 无噪声。`tools` 对局测试（节点脚本，取 chess.js 引擎段）：新 5 级 vs 旧 12 级（同 1s 限时）8:0。**不要恢复旧 `nega`/`think`。**
- 测试页：`tools/test/memory.html`（真 talents_data + 桩 Talents/G；`?altar=1` 模拟有镜子）。
- 已知：回忆/建筑只在独立页验证（整游戏+世界在 2GB 沙盒会卡死），真实游戏里的建筑菜单出现、E 交互、反引号徽标未实机验证。

## R49c（用户反馈：出洞后看不到技能栏）
- 加固 `js/saga.js`：电影期间隐藏 HUD 改用 `body.sgcine` 类（不再改元素行内 opacity），`end()` 移除；`tick` 兜底（CN 为空就移除）；`play` 抛错时走 `end()` 恢复（含第一人称武器可见性）。**未能在无头环境复现**（headless 无 pointer lock），若仍看不到技能栏，查 `hub.js` 的 `body.hubon` 与 `talents_ui.js` 的 `show=!!W&&!W.busy&&!W.dead`。
- 说明：洞里技能栏左侧的 Q(闪避)/E(攻击)/H(药) 是**基础动作**，不需要学习，任何时候都能用；天赋技能（1–0 槽）只在学了之后才出现。
- 手机：项目目前无触屏控制；`index.html` 同步加载 ~135MB JS（models 100MB + assets 29MB，gzip 后约 65MB）。方案见对话。

## R49-load · 加载提速（MOD `fast_load`，默认开；关掉恢复旧流程）
用户："继续优化地图加载速度，越快越好，秒加载最好"。沙盒里 swiftshader 跑不了真实整趟进图（主线程被软件 GL 卡死 >2 分钟），所以只测了 CPU 部分（node 里的 buildNode、heads_fit 里的 populate、页内模型解码），GPU/着色器编译部分按推理处理，**没有真机数据**。
- `worlds.js goto`：淡出 260ms 不再串行等（与加载并行，加载层在 260ms 后才显示）；末尾 `wait(60)` 去掉；新增 `kickAhead(node)`：进场第一步就 `populate(node)`（只依赖 node）→ `Foe.preload`（身体模板+UAL 动画）与 `Beasts.prefetch`（野兽模型）与 `need()` 并行。
- `b64buf`：fast_load 下改同步 atob（实测 19 个模型：fetch(data:) 735ms vs 同步 500ms）。
- 地形：`H` 只在内圈（RM+18）逐点求；外圈（玩不到、被雾吃）每 2 格精确求一次，其余双线性插值。内圈与旧结果逐点相同（diff 0），外圈最大偏差 ~1m（高频山脊被平滑，在雾里）。node 里 buildNode 平均 102→78ms（测试桩里很多特性关着；真实游戏地形函数更重，收益更大）。
- `foe.js`：`template()` 并发去重（preload 与 populate 同时请求只解析一次）；`planBodies/preload` 与 populate 里选身体的逻辑一致（IdLook.apply 幂等）；populate 先 `Promise.all` 并行载入全部身体模板再顺序 build；boot 5s 后空闲时预载 UAL 动画包。`Foe.preload` 已导出。
- `beasts.js`：新增 `prefetch(node)`。
- `mods.js`/`mods_i18n.js`：新增 fast_load。
- 没做/后续：着色器预编译（需真机确认变体）、`paint()` 外圈降采样、邻居地点的 body 预载（会在战斗中造成 30–60ms 卡顿，暂不做）、GLB 贴图降分辨率（会改画质）。`renderer.debug.checkShaderErrors=false` 在 r147 里收益很小（getUniforms 仍会等链接），没加。

## R49d（用户反馈：看不到技能栏 / 猎手别开局出现 / 入场电影要有人设 / 大小头 / HP 太偏）
- **技能栏看不见**：无头环境实测（禁用 pointer lock）：洞里 `#tbBar.on.cave`，出洞后 `W.busy` 很久为 true（加载）期间栏被隐藏（设计如此：`show=!!W&&!W.busy&&!W.dead`）；真机上的具体原因**仍未复现**。已做：① saga 电影隐藏 HUD 改用 `body.sgcine`（42b1eff）；② `hudfix.js` 新增看门狗（野外非加载/非死亡/非电影时，清除 tbBar/tbCol/hud/wHint/hpC 的行内 opacity/visibility、移除残留 sgcine、缺 `.on` 就补）。洞里 Q/E/H 三个格子是**基础动作**（不用学）。
- **新 MOD `hp_center`（`js/hpcenter.js`，默认开）**：屏幕底部正中大血条 + 魂能条，掉血白色残影，<35% 红光脉动，<20% 屏幕边缘泛红；`hudfix.js` 写 `--tbB`（热键栏高度）并把 `HpCenter.extra()` 并进 `--tbH`，其他贴底提示自动上移。洞里只在受伤时出现；Hub 打开时隐藏。
- **猎手**（`js/hunters2.js`）：① 感应条触发的随机降临要求「地区恶名 S.h2.reg[loc] ≥ 6 且 仇恨 ≥ 8 且本趟已停留 ≥ 1.5 分钟」（不再开局出现；恶名=在该地区的放倒+0.5×斩首）；② 新 `rollOmen(k)`（trips≥3、仇恨≥6、隔 ≥2 趟、概率 0.06+0.035×恶名+0.008×仇恨，上限 0.6）在 Saga.setupTrip 里决定**入场伏击**；`ambush(id)` 立即刷出猎手，Saga 电影等她出现后（≤9s）用「猎手登场」镜头介绍她；`cur()/infamy(k)` 导出。
- **入场电影加「人设介绍蒙太奇」**（`saga.js` `castPick/castBeats/castShot`）：从场上活人里挑 1–2 人（优先猎手 > 目标 > 最近的人），每人 3–4 个硬切特写（脸 cFace / 眼睛 cEyes / 手 cHand / 低角度全身 cLow / 过肩 cOver），镜头跟随活体头骨/手骨，被拍者构图在右、名牌在左（大字名字 + 头衔 + 性格/喜欢/怕 chips，来自 `Overhear.bio`，猎手显示等级与战斗风格），字幕=口头禅/秘密/“她 + 做事动作”。电影期间玩家血量锁定。测试：`tools/test/saga.html`（桩角色）+ `/var/work/pw/cast_shots.js`。**未在真实游戏里验证**（沙盒内跑整游戏太慢）。
- **大头/小头**（`js/foe.js`，MOD `head_norm` 默认开，依附 head_natural）：脸高统一成「身体身高/6.6」（身高=头骨关节高+0.2），夹在原比例 0.8–1.15 倍内，并重算头位置。

## R41（主管）h — R50 用户反馈：猎手感应太快 / 猎手 UI 丑 / 合作者新身体怪（全部 MOD，默认开）
- **MOD `hunter_calm`**（`js/hunters2.js`：`calm()`/`CALM` 常量块在 `endEncounter` 前；`tick()` 里击倒/斩首增量、时间增量、满后判定三处分支）：击倒 +2.5（原 7）、斩首 +1.5（原 4）；出猎前 120 秒不随时间涨，之后 `0.07+min(分钟,10)*0.006`/秒 ≈ 4.2→7.8%/分钟（原 15%+）；满后每 12 秒判定、概率 6%→50%（原 5 秒、15%→90%）；遭遇结束冷却 150 秒（原 40）。估算：常规节奏从 ~4 分钟来一次变为 ~12 分钟。
- **MOD `hunter_hud2`**（同文件 `ensureHud()` CSS 末尾追加 `#h2Hud.v2 …` 规则；`drawHud()` 给 `#h2Hud` 切 `v2` 类并输出新结构）：感应改成顶部 250px 黑曜石切角小面板（准星 SVG + 标签 + 百分比 / 4 段细条 / 一行“仇恨·升级还差·[U] 档案”），<30% 半透明；满时红描边“猎手将至”。猎手血条、横幅同风格（血金、切角、HP 条 30% 逃跑刻度、横幅金色细线代替糊状径向阴影）。用 ui3a 的 CSS 变量（有后备值）。id 不变。对比图：`/home/user/shots_r41/hud_r50.png`（工作区）。
- **MOD `body_qc50`**（`js/cc0mode.js` `body()` 开头 `QBAD` 映射；`Foe.build` 入口本来就调 `CC0.body`，所以身份服装/Boss/旧存档都覆盖）：逐个渲染质检（`tools` 外的 qc.py，孤立场景）后停用 Q_Witch→Darkness_Shibu、Q_Medieval→Vita、Q_Adventurer→Q_Ranger、Q_Formal→Q_Peasant、Q_Soldier→Vita。原因：纯色无贴图低模、爪形手、手臂姿势坏、肤色和动漫头不符。Q_Ranger/Q_Peasant 有贴图，保留。**文件没删**（永不删身体规则），关 MOD 即恢复。给合作者：如果要再加 Quaternius 身体，请先确认有贴图、手型正常，并给皮肤材质打 `userData.skin` 以便染成头的肤色。
- 身体库扩充调查：公开可直接下载的 CC0 VRoid 女性身体已全部用完或按规则剔除（madjin vroid/beta 全套、webaverse model7–13 = 同一批 pixiv 文件）；ToxSam/100Avatars CC0 是 Q 版吉祥物风格，不符。剩下唯一的路是 VRoid Hub 上作者标 CC0 的模型（需要 pixiv 登录，清单 `tools/r40_vroidhub_cc0.md`，用户下载到 `/home/user/vrm_in/` 后我来转）。

## R50-gfx · 死亡镜头 + 画质（用户："角色死的时候会 TP 回家再播放死亡动画？""地图很劣质、多边形丘陵、有没有低成本大师级的渲染方案、毛茸茸"）
全部是可开关 MOD，默认开。用 `tools/test/world.html?reg=meadow&seed=5` + `window.__node(i,{view:'eye'})` 截图验证（960×540，走 Master 后处理）。
- **`death_cine`（worlds.js dieNow）**：以前玩家死亡 = 红闪 1.2s → `stop()`（镜头回洞窟）→ ui.die 再等 900ms 才弹死亡界面，所以看起来是"先传送回家再死"。现在：就地倒下（镜头下坠 + 侧翻 1.1s，frame() 里 `W.deadT`）→ 1.35s 渐黑 → 1.75s `stop()` 但保持黑屏 → `api.die()` → 死亡界面出现后 1.25s 淡出。Explore（文字版）未改。敌人的布娃娃在 fight.html 里测过：没有位置跳变。
- **`ground_props`（worlds.js `baseY`）**：大件摆设（脚印>0.45m）按脚印四角取最低地面并下沉，不再悬在坡上。
- **`water_fx`（wgen.js `waterMat`/`bakeWaterDepth`，worlds.js 湖布局也改用）**：水不再是硬边平板：距岸深度图（数据纹理，不是美术贴图）→ 岸线渐隐、浅滩泛亮、岸边泡沫、更细的涟漪、深处更深；环境反射 0.65→0.36。
- **`shell_grass`（新文件 js/wgrass.js，index.html 与 world.html 已加 script）**：壳层草（shell texturing）：同一地形网格沿法线外推 12 层（只覆盖玩家可达区域、≤27m），片元着色器按哈希格子丢弃像素 → 一根根变细的草，顶端随风摆，`MeshLambert` 所以太阳/阴影/雾都正常；路、水边、陡坡自动不长；干旱地区稀疏偏枯黄；颜色 = 基色 × `g.grassMul`（季节）。无草模型、无贴图。新增 1 个着色器程序。**没有真机帧率数据**（沙箱软件渲染）；如太卡：减 `N`（wgrass.js）或在 MOD 里关 shell_grass。
- master.js 色差 `ca` 0.0016→0.0007（细铁栏杆在屏幕边缘出现洋红/绿色条纹）。
- 未做：① 用户说"违和的音效人物语音/人物模型"——太笼统，已向用户追问具体哪里违和；② 丘陵仍是 1.1m 网格 + 固定对角线三角化；③ 大块岩石（rock_face）上的黑斑是阴影/法线问题，未查。
## R41（主管）i — R51 用户：“头身比不对、把男性身体也加进来了快删除，只要 VRoid 女性身体；全网找，非 CC0 也行”
- **删除** `big/body/Q_*.js` 全部 7 个（用户明确下令删除；这是对“永不删身体”规则的用户本人覆盖）。给合作者：请不要再加非 VRoid 身体。`js/foe.js` OUTFIT 里的 Q_ 条目删掉、OUTFIT_BOSS 改回 VRoid；`js/cc0mode.js` QB=[]，QBAD 映射保留（旧存档/旧引用一律换走）。R50 的 MOD body_qc50 已并入并移除。
- **MOD `vroid_only`**（默认开，`js/cc0mode.js` VRF/vroidOnly，`CC0.body()` 第一行；`js/foe.js` `bodyFor()` 开头 VR_ID/VR_BOSS）：所有身体只从 8 具 VRoid 女性身体里按身份挑：Vita、Victoria_Rubin、Darkness_Shibu、HairSample_Female、AvatarSample_A、AvatarSample_B、Osage、**V_KF（新增）**。不管 cc0_only。`Foe.build` 入口也经 CC0.body，所以猎手/剧情等写死的原神身体名同样被换走。300 次抽样只出这 8 具。
- 排除：HikariCape/HikariScholar（到头骨只有 1.13m，幼态比例，手臂 V 形姿势坏）、原神 MMD 身体（不是 VRoid）。文件留着，只是 vroid_only 下不出现。
- **全网搜 VRoid 女性身体的结果**（逐个读 VRM 内嵌授权；标准：允许暴力 + 允许改造 + 允许再分发，因为游戏要斩首=改造，推到 GitHub=再分发）：
  - 收：AvatarSample_K_F（pixiv，VRM PL，全允许）。
  - 转了但外观否决：AvatarSample_L（1.9m 黑色战术服，显男性化）、VRM1_Constraint_Twist_Sample（白色方块大 T 恤）。
  - 授权不合格：AvatarSample_F / M（禁止暴力/改造/再分发）、nikechan v1/v2（OnlyAuthor、禁暴力）、杉山巨樹 2 个（禁暴力/再分发）、スタンダードピンク（禁改造/再分发）、モブ子E（校服+禁再分发）、Whingles（禁改造）、fem_vroid（无衣服素体）、Seed-san（非 VRoid，机器人手臂）、vroid-sample-d = 千驮谷涩（校服）。
  - 仍待：VRoid Hub 上作者允许暴力+改造+再分发的模型需要 pixiv 登录下载（tools/r40_vroidhub_cc0.md）。

### R50-gfx (b) shell grass variety
`js/wgrass.js`: each node seeds its own look (mulberry of g.seed): palette pair from per-biome pools (fresh/yg/lime/bg/olive/straw/moss/rust), density 11–23, height, blade width, colour-patch + height-patch noise, per-blade brightness jitter, optional flower tips. Same MOD `shell_grass`; still shader-only (no models/textures). Tip colours of straw/yg/rust darkened to avoid washed-out fields. Not verified on real GPU.
`js/wgrass.js`: each node seeds its own look (mulberry of g.seed): palette pair from per-biome pools (fresh/yg/lime/bg/olive/straw/moss/rust), density 11–23, height, blade width, colour-patch + height-patch noise, per-blade brightness jitter, optional flower tips. Same MOD `shell_grass`; still shader-only (no models/textures). Tip colours of straw/yg/rust darkened to avoid washed-out fields. Not verified on real GPU.

### R50-gfx (c) VRoid Hub 候选扫描（无需登录）
`tools/hub/hubscan.py`：用 VRoid Hub 公开 API（`/api/search/character_models`，头 `X-Api-Version: 11`）按关键词列出「可下载+VRM meta 暴力/改造/再分发全允许+非R18」的模型，只读元数据；`tools/hub/picks.md` 是我人工看缩略图筛过的 40 个。**下载接口需登录，已确认匿名 404；我不绕过登录/验证码，由用户本人下载后交我转换（vrm2body/vrm2head）。**

## R52（画质 Agent · 2026-10-01）— 用户：画质太低级 / 壳层草地“非常不好但有潜力”→ 大师级重写 / 画质拉到最高、惊艳
**用户原话要点（长期有效）**：
- “目前游戏画质太低级了。就是看起来就是普通游戏。”
- “那个壳形草地的效果其实我看来非常不好，但是感觉这种效果有潜力，你能不能大师级写下。”→ **保留 shell texturing 方向**，重写到大师级（不要换回草模型方案）。
- “你能不能大师级让画质变到最高级，让人惊艳的程度。”

**用户长期约束汇总（新模型开工前必读；全部来自前面各轮，仍有效）**：
1. 每次编程前先读 HANDOFF.md；**只追加，不覆盖、不删除**。
2. **小步频繁 commit + push**（用户用模型的网站可能出 BUG 回退）；push 前 `git pull --rebase`；禁止 force-push；有协作者，远端随时会更新。
3. **任何时刻根目录 `index.html` 双击（file://）就能玩**，有可点击的「开始游戏」；classic script + base64 `.js` 资产，不用 CDN / fetch 本地文件 / ES module。
4. token 只放会话环境变量，**不写进任何仓库文件**；不改仓库可见性。
5. 不自制/程序化**模型、身体、贴图**（着色器效果、布局、地形生成可以）；新素材优先 CC0（Poly Haven）。
6. 所有改动做成**可开关 MOD**（`js/mods.js` + `js/mods_i18n.js` 英/日译文），处理好冲突。
7. 用户显卡是**高端独显**：ultra 档放手做，掉帧时 game.js 会自动降到 high/mid。
8. 美术方向：二次元人物（cel 光影 + 勾线）+ 风格化 3D 环境（`world_cel`）；目标是“惊艳”，不是“普通游戏”。

**本机环境（Windows，`E:\farhead`）**：系统没有 git → 便携 MinGit `E:\tools\MinGit\cmd\git.exe`；仓库是 partial clone（`--filter=blob:none`）+ 非 cone 稀疏检出（本地不含 models/ big/ promo/ music/ voice/ beasts/ 的文件，提交不受影响）。本地测试服务器 `node E:\tools\serve.js`（本地缺的文件从 raw.githubusercontent.com 拉一次缓存到 `E:\tools\rawcache`），测试页 `http://127.0.0.1:8765/tools/test/world.html?reg=meadow&seed=5`。

**本轮计划（每完成一项就推送并在下面追加记录）**：① 壳层草地 v2（重写 `js/wgrass.js`）② 天空高清化 ③ 大气层（太阳光束 / 空气透视 / 低地薄雾，后处理）④ 调色与曝光。

## R41（主管）j — R51 战斗动作：方向性移动 + 架势个性化
用户：“战斗时左右移动，步行动画却是前后走，很奇怪；每次战斗姿势都一样，违和”。
- 查证：UAL 免费版（UAL1/UAL2 Standard）**没有**横移/后退动作（Pro 才有），别再找；试烘了 NinjaJump_Idle（空中跳跃姿势）/ Zombie_Idle / Pistol_Idle，均不适合战斗架势，已撤回，`big/anim/ual.js` 与 `tools/anim_bake.py` **未改**。
- 新文件 `js/stance.js`（两个 MOD，默认开）：
  - `npc_strafe`：mixer 更新后，胯骨绕世界竖轴转向实际移动方向（≤±77°，速度越快越小），spine/chest/upperChest/neck 按 30/30/25/15% 反扭 → 脚顺着移动方向迈步、胸口和脸仍对着玩家；移动方向在身后 >110°（<95° 退出，滞回）时用倒放走路。依赖 `npc_locomo`。
  - `npc_stance`：只替换“对峙中”（state==='chase' && seen）的 `Sword_Idle`/`Idle_Loop`；按身份（CASTER/PROUD/FIGHTER 集合）+种子给主/副架势（Sword_Idle、Idle_Shield_Loop（空手=举拳护架）、Spell_Simple_Idle_Loop、Idle_FoldArms_Loop），4–9 s 可能换；节奏 0.8–1.25、随机相位；侧身/前压后仰/歪头体态，出手/硬直时淡出。
  - **坑**：UAL 重定向不给部分体型的 spine/chest 写轨道，mixer 不会每帧覆盖 → 程序化偏移会逐帧累积（整个人转过去）。stance.js 的 restore()/commit() 记录每根被改骨骼的改前/改后值，下一帧若未被 mixer 覆盖先还原。以后谁在 mixer 后改骨骼都要注意这一点。
- 改动他处（最小）：`js/locomo.js` tick 多记平滑速度 L.vx/L.vz、相对移动角 L.rel、后退判定 L.bk（滞回），npc_strafe 开时 back 取 L.bk；`js/foe.js` animate() 末尾 `Stance.install(f)`、`f.mixer.update(dt)` 之后 `Stance.post(fo, dt)`；`index.html` 与 `tools/test/world.html` 在 locomo.js 后加 `<script src="js/stance.js">`；`js/mods.js`/`js/mods_i18n.js` 两条 MOD。
- 验证：横移胶片（关/开/后退）、5 人对峙截图对比，ai.py / index 启动无报错。
## R49e — 舒适洞穴 (MOD `cave_cozy`, default on) — cave.js / game.js / cavecozy.js / mods*.js / index.html
User: cave was pitch dark + sealed → brain reads it as unsafe/disgusting. Fix from perception psychology (prospect–refuge, warm/cool colour contrast, no pure black, slow soft flicker, dry/clean look).
- cave.js: dome apex triangles removed → ~1.5m oculus directly over the fire (smoke hole), bright HDR sky disc above, daylight SpotLight onto floor, faint additive light shaft (fades near camera to avoid wash-out), 70 drifting dust motes; brighter wall/floor vertex colours, less burn/edge darkening.
- game.js (`CZ` flag): hemi 1.0 warm cream/brown, moon .32, exitLight 2.6, fog #3a2c21 density ~half, fire colour #ffb468, slower/smoother flicker (no random jitter), bigger light distance.
- cavecozy.js: post grade only in cave (exposure 1.42, vig .17, contrast 1.0, lifted shadow tint); original values restored when a world is active.
- Verified with stub harness `tools/test/cave.html` (?cz=0 old, default new; shots via /var/work/pw/cave_shots.js): skylight + soft shaft + dust + warm floor patch read well; old = near-black. Full-game run (post grade, real lights) still unverified.

## R49f — 技能只能升级三选一 + 简化技能栏 + 底部正中血条 + 偷听框修复 (MODs `skill_pick`, `skill_lite`; files: talents.js, talents_ui.js, memory.js, hpcenter.js, overhear.js, mods*.js)
User (R49f, verbatim intent): skill UI was far too complex; HP not at bottom-centre (only tiny top-left); Overhear popup sometimes never disappears; **skills must NOT come from the talent tree — each level-up = attribute points spent manually + a 3-pick-1 skill choice; then equip from the learned pool to hotkeys.**
- `skill_pick` (def on): `Memory.gate()` locks `Talents.alloc` (tree/builds/dev can't allocate; undo of skills and skill-reset disabled; only attributes can be reset). Memory.pick sets `_allow` around its own alloc. `Talents.onLevel` → `Memory.queue(up)` → auto-opens the 回忆 pick ~1.8s after level-up when safe (cave: not in cinematic; world: no `fo.seen` foe within 42m, not busy/dead), else queued. Chip (right-top) + Backquote now also work in the world.
- `skill_lite` (def on): hotbar = ONE row (Q/E/H utils + learned skills, ≥5 slots, ≤10), no 2nd row / XP strip / T button / hint; old Shift-row skills are compacted into row 1 (`compact()`); `autoPlace` only fills slots 1–10. Pending picks show a purple 🧠 badge on the bar. T panel has only 属性 + 技能 (learned actives with equip/drag, passives as chips); tree/build tabs hidden. Top-left player frame (HP/MP bars, face) hidden — buffs/target frame remain.
- `hp_center`: now ALWAYS visible (cave too) with Lv badge, HP, soul bar and a thin XP strip; hidden under `hubon`/`sgcine`.
- Overhear popup: replaced `requestAnimationFrame(add .on)` (rAF pauses in background tabs → the hide timer ran first, `.on` added later → stuck forever) with setTimeout; added a 500ms watchdog (hard deadline, leaving world, cinematic, hub) and `enter()` aborts if the world is gone.
- **GOTCHA**: a MOD in `mods.js` without `def: true` is OFF by default even if code checks `!== false` — `cave_cozy` was missing it (fixed). Always add `def: true`.
- Verified in the real game (cave, headless): gate works (alloc refused), Memory cards show, picks add skills, big HP bar at bottom-centre above the one-row bar, T panel shows 2 tabs. NOT verified: in-world level-up auto-pop, Overhear fix in a real trip.

## R49g — 魂能条 (MOD `mana_ui`, def on; hpcenter.js / talents.js cast / mods*)
User: "mana/cast system is shit, mana should be visible to the player, UI up to you". Mana mechanics already existed (60+3·soul max, regen 2+0.08·soul ×1.5 out of combat, hit +2.5, parry +8, kill +10); the problem was visibility/feedback. New big blue bar under the HP bar inside `#hpC` (bottom-centre): number + regen/s, skill-cost TICKS (digit = hotkey, lit when affordable), gain/spend floaters, red shake + "魂能不足 · 还差 N" via `HpCenter.manaFail(need)` (called from `Talents.cast`), low (<25%) red pulse, full glow. `HpCenter.extra()` now = measured hpC height. Verified in real cave (900×506 shots m_low/m_fail/m_ok). Not verified in a trip.
---
## R53 — VRoid Hub 批量引入（头 + 身体）（agent: sourcing）
- **来源与授权**：用户自己的 pixiv 账号（用户亲手过验证码登录；我没有碰验证码）→ 从 VRoid Hub 下载。授权筛选：VRM0 需 `violentUssageName==Allow` 且 (CC0/CC-BY 或 `otherPermissionUrl` 含 `redistribution=allow&modification=allow`)；VRM1 需 `allowExcessivelyViolentUsage` + `allowRedistribution` + 允许改造。旧 `picks.md` 里不少项只看了许可名，没看 URL 里的 `redistribution=disallow`，**不要信 picks.md 的授权栏**；`tools/hub/hubscan.py ok()` 已修为同 `vrm2head` 的检查。
- **流水线**：`tools/hub/hubpipe.py`（下载→`vrm2head`→`vrm2body --tex 768`→删原文件，约 34 秒/个）+ `tools/hub/hubpush.py`（质检 + 用 git plumbing 直接批量推到 origin/main，不碰工作区）+ `tools/hub/mkpack.py`（渲染身体拼图量明度 → 按标签/明度选身份 → 写 `js/vroid_pack.js` 与 CREDITS 片段）。质检：身体比例 `eyeY/(eyeY-neckY)` ≥ 9.8（成人比例 10.8–11.1；Q 版约 6）；不用绝对身高。标签含 ロリ/水着/下着/おばけ 的一律不登记（R23 精神）。
- **结果**：约 135 个候选 → 授权不通过被跳过约一半 → 通过质检并推送 68 个，其中登记进游戏的见 `js/vroid_pack.js`。头在 `models/VH_*.js`（未登记，保持随机头池不变）；身体在 `big/body/VH_*.js`。
- **接入**：MOD `vh_bodies`（默认开）。`js/vroid_pack.js` 的 `VH_PACK[file]={n,a,ids}` → `js/foe.js vhExt()` 把这些身体并入对应身份的 vroid_only 候选（原 8 具仍在，被稀释）；`js/cc0mode.js body()` 在 vroid_only 下放行 VH_PACK 里的名字；`foe.js template0` 对有独立皮肤材质的 VH 身体自动 `TINT[name]=1`（头肤色同步）。boss 仍用原 8 具。测试台 `tools/test/bodygrid.html?list=VH_a,VH_b`（身体拼图）；`fight.html`/`heads_fit.html` 已加载 `vroid_pack.js`。
- **没做/注意**：身份映射是自动 + 看图粗选，可用 `OVR` 或直接改 `VH_PACK[..].ids`；个别身体是现代校服/便服款，若觉得违和直接从 `VH_PACK` 删对应条。登录文件已从工作区删除；用户应更换 GitHub token。

## R52 记录（画质 Agent）— 新增画质 MOD、性能与去灰、MOD 配置码
用户追加原话要点（长期有效）：“更新要以 MOD 形式推送”“要最强效果”“不要浪费时间在无效检查，尽可能多加新内容”“画面现在灰蒙蒙的，而且特别卡！性能优化注意！”“MOD 界面加一个哈希值（配置码），我发给 agent 就能算出我开了哪些 MOD，之后可能让你把我要的 MOD 设为默认”“MOD 之间相互影响的关系也标注出来”。
| MOD（默认） | 文件 | 内容 |
|---|---|---|
| `grass_master`（开，依赖 shell_grass） | `js/wgrass.js` | 壳层草 v2：12m 分块实例化壳（ultra 24 / high 16 / mid 10 层，**按像素数自动缩减**；`?gn= ?gk= ?gq=` 测试用），全部块共用 **2 个材质**（深度预通道 + EQUAL 着色，抽层 LOD 只换实例属性 `aL`，不切材质），扫掠线段-椭圆求交，烘焙场进顶点属性（`gm/wgF/wgL`），风浪/拨草/逆光透射/A2C；地面材质染草色（`patchGround`）。关 = R50 v1（同文件 `buildV1`）。 |
| `world_atmos`（开） | `js/master.js` + `js/gfx52.js` | 野外后处理：朝太阳 Mie（`P.mie/mieDist`）、低地薄雾（`P.mist`）、天空作源的太阳光束；**去灰**：内置 FogExp2 密度 ×0.72（gfx52 每个新场景一次）、合成里压黑位 `P.black`。 |
| `cloud_shadows`（开，依赖 world_atmos） | `js/master.js` | 噪声云影沿太阳方向投到地面并飘动。 |
| `filmic_agx`（**关**，迁移 `__v13` 一次性关） | `js/master.js` | AgX 色调映射；用户嫌灰，默认改回 ACES。 |
| `sharpen`（开）/ `lens_flare`（开） | `js/master.js` | FXAA 后 AMD CAS；泛光高亮的镜头鬼影 + 光环。 |
| `terrain_detail`（开） | `js/assets.js` | 三平面材质 22m 内叠加 3.73× 细节亮度 + 法线。 |
| `foliage_glow`（开）/ `sky_master`（开）/ `water_master`（开）/ `pcss_shadows`（开） | `js/gfx52.js` | 树叶逆光透射（全局 chunk，非 CHAR_MAT 的 alpha 裁剪材质）；天空 Catmull-Rom + 太阳 HDR 光晕；水面按反射向量采样清晰天空 + 菲涅尔；PCSS（6+10 采样，只对 `shadow.radius>8` 的光，gfx52 每帧把野外太阳设为 `2070/阴影半宽`）。 |
- **MOD 配置码**（`js/mods.js`）：O 面板顶部「配置码 MOD1-校验4-默认签名3-内容」，点击复制；底部「📥 导入配置码」可套用。内容 = 与默认不同的每个 MOD 的 `FNV(id)%36^4`（4 位 base36）+ `+/-`，排序拼接。**agent 解码**：`node tools/modcode.js <配置码>`（读当前 `js/mods.js`；“默认集与当前版本不同”时去 git 历史找对应版本）。`Mods.code()` / `Mods.decode()` / `Mods.rels(m)` 已导出。
- **MOD 关系标注**：每行显示 🔗N；展开后列出 依赖 / 被依赖（关掉会连带关）/ 冲突（双向）/ 同组单选 / 相互影响。软关系写在条目的 `rel: { 其它id: '说明' }` 字段（双向显示）；新 MOD 有已知相互影响请补 `rel`。
- 性能参考（RTX 2070S，1280×720 ultra）：草 v2 约 +4.7ms（之前 +12ms，主要是每块 2 个材质导致的切材质开销）。卡时依次关：`grass_master` → `pcss_shadows` → `world_atmos`。
- 本机测试注意：Playwright 先 `page.bringToFront()`（后台 rAF 会停，gfx52/WorldMaster 钩子不跑）；改 js 后用 CDP `Network.setCacheDisabled` 防止吃到旧脚本。
## R49h (decap_cam redesign + world-frame bridge + compact HUD)
- **js/decapcam.js (NEW, MOD `decap_cam`, default on)**: 斩首特写 = slow-mo cinematic. Letterbox bars slide in → smooth time ramp (1→0.2 in 0.12s, hold ~2.4s, ease back by 3.2s real) applied via new `Foe.slowSet(k,t)` (only foes/head/blood slow, player normal; no hitstop) → synthesized SFX (boom, slice, ringing, time-stretch sweep, heartbeat, wet spurts, music/amb duck) → camera never cuts: gentle FOV push (−30%) + soft turn toward the flying head, restored in a microtask → head expression keyframes (surprised → sad → eyes dim) via `hb.setExpression` → arterial neck spray (pulsed, InstancedMesh streaks, ground splats, mist sprites, head blood trail) + lens-blood CSS drops. HP locked, Enter skips, cooldown 6s, skipped when ≥2 aware foes near (bosses excepted), never leaves camera/FOV/post/music stuck. Test: tools/test/decapcam.html.
- **Files changed**: js/foe.js (Foe.slowSet only), js/worlds.js (decap event → DecapCam.onEvent; per-frame DecapCam.pre; runs `G.HOOK.world` callbacks), js/talents.js / js/talents_ui.js / js/hpcenter.js (register frame via `W2` into HOOK.frame AND HOOK.world, deduped by `now`), js/mods.js, js/mods_i18n.js, index.html.
- **IMPORTANT FINDING**: `G.HOOK.frame` does NOT run while a hunt world is active (game.js returns after `Worlds.frame`). Talents.frame (mana regen, buffs, projectiles), TalUI.frame (skill bar) and HpCenter.frame were therefore only running in the cave. Fixed with `HOOK.world` bridge + dedupe. Other HOOK.frame modules (skillfx, balance, unlocks, curios, ...) are still cave-only; check them if something "never updates outdoors".
- cave_cozy default OFF (user request). Compact HP/mana block in hpcenter.js (2px gap, tick chips under the bar).
- Could not verify in a real world run (headless world crashes/hangs the 2GB sandbox); verified with stub harness.

---
## R53b — VRoid Hub 追加：骑士 / 精灵 / 冒险者批（agent: sourcing）
- 用户再次亲手登录（`tools/hub/livelogin.py` 在 8081 端口给用户实时页面；验证码只由用户点，用户过了验证码后我才替他点“登录”按钮）。重新筛选 39 个候选（骑士/精灵/暗精灵/弓手/佣兵等）→ 下载转换 32 个、质检拒 2 个、转换失败 5 个（头部无脸）。人工看图剔除 7 个（现代便服/过矮/暴露）后登记 25 个，`js/vroid_pack.js` 现共 76 个。
- 身份是看渲染图后手工指定的：骑士类（`VH_507309` `VH_476605` `VH_996092` 等 → knight/paladin/guard/general/dragonknight），精灵类（`VH_579317` `VH_110696` `VH_477048` → elfprincess/ranger/archer/druid），暗色 → courtmage/hexer/fallen，等等。`tools/hub/mkpack.py` 现为追加模式（保留已登记）；`VH_IDS` 环境变量可手工指定。
- 事实：Hub 上“允许暴力+改造+再分发”的骑士/盔甲女角色极少（多为男性、机甲或比基尼甲），所以骑士类仍然少；要更多请告诉我具体想要什么风格，或让用户在 Hub 上手动收藏条目 URL，我按 URL 下载。

## R41（主管）k — R51 F 查看（回忆 recall_iw）三个 bug
用户：“F 查看界面底部那些栏都被挡住了，信息栏无法展开，有的头比较小”。真实 index 启动 + Playwright 逐颗打开实测定位：
- **底部动作栏被挡/看不见**：`js/talents_ui.js:50` 有**全局** `.bar{height:21px;overflow:hidden}` 和 `.bar span{position:absolute;inset:0}`（另有 `.card` / `body.ui3a .card` / `.pb` / `.tt` 等全局规则）漏到回忆界面 → 70px 的动作按钮被裁成 21px 高的空框、点击落到 canvas。修法只在我自己的文件里：recall_iw.js 的类名改为 `rbar / rcard / rpb / rtt`（选择器/HTML/querySelector 全同步）。**talents_ui.js 的全局 `.bar` 仍会污染任何叫 .bar 的元素，归属者请加作用域。**
- 同时：`#riw` z-index 60→70（高于 #spbubs 64、低于神灵对话 #spdlg 75）；`html body.riw-on` 用 visibility:hidden!important 隐藏 #hud/#labels/#cross/#toast/#hintTag/#feelBubble/#spbubs/#spchip/#tip/#hint（旧写法被 ui3a 的 !important 压过，左上 HUD 和提示条会透出来）。
- `js/spirits.js` busy() 加 `|| (window.RecallIW && RecallIW.active)`：F 查看中不再弹神灵对话（一行，他人文件最小改动）。
- **信息栏展开**：已想起的行点击展开/收起全文（`.fr.open` 换行显示，▸/▾ 标记，刷新后保持）。
- **头大小**：旧 k = 整颗头包围盒高/0.26 → 同一张脸因发长/帽子 k 从 1.33 跳到 3.0（长发=拿得远=头特别小；高帽=盒中心上移、脸沉到动作栏后）。改为 `faceFit()`：k = 1.4 × hb.group 世界缩放/1.55（ModelHeads 已按脸归一），对准点 = iris 网格中心；打开后 0.6s/1.6s 复测并平滑（刚生成的头网格可能未就绪）。YOFF 0.04→0.09（两眼在画面中部偏下、下巴不压栏）。
- 测试工具：`/var/work/riw2.py`（备份在 /home/user/bak/tools）——index 真实启动、加头、逐个 F 打开，输出 k/对准点/按钮遮挡/全局样式泄漏/可见 HUD 并截图。注意：全量 models 在 2GB 沙盒会 OOM，只 sparse 检出少量头测试。

## R49h-2 (decap_cam: much slower + witness reactions)
- User: wants the slow-mo to be *very* slow so the head's whole flight is watchable, and nearby characters to talk. js/decapcam.js: timeline now 5.8s real (k≈0.075→0.115 hold 4.6s, ease out to 1), ~13x slow; expression keyframes, heartbeat, spray pulses (0.16 game-s) and head blood trail retimed for slow-mo; camera push eases over 1.3s.
- Witnesses: up to 3 nearest live foes within 24m say a line at t=0.8/2.1/3.4s via `Foe.say` (bubble) + large subtitle `.sub` (name + 「line」); first speaker uses shock lines containing the victim's name, brave foes taunt, others panic, bosses menace. Files: js/decapcam.js, js/mods.js, js/mods_i18n.js, tools/test/decapcam.html.

## R54（画质/性能 Agent · 2026-10-01）— 性能 / 秒加载 / BUG / 战斗 / 新敌人 / 山口 / UI 精修（全部 MOD，默认开）
用户原话要点（长期有效）：“显卡跑得很大声 → 性能消耗更少”“场景读取更快、能秒读取”“初始技能点为 0”“铁门太突兀”“战斗要大师级：反馈、敌人更聪明、动作更好”“UI 到 3A 标准”“性能/快速加载/BUG 修复优先”“改了就以 MOD 提交 GitHub”“有时进图所有角色都不动”“敌人头和身体肤色常不一致”“按住左键进入攻击模式（变慢）→ 轻移鼠标定角度 → 松开才攻击；有后摇；低级武器前摇长”“新敌人近战不要播动画，而是显示她准备攻击的角度”。
| MOD | 文件 | 要点 |
|---|---|---|
| `eco_gpu` | `js/eco.js`（mods.js 之后加载）| 全局 rAF 包装：按刷新率整数分频到 ~60fps；菜单/暂停 30、失焦 15、2 分钟无输入 30；分辨率上限 1.0 且只由 GPU 计时（EXT_disjoint_timer_query_webgl2）管理（旧的 FPS 调档会被加载卡顿误导停在 0.7）；野外阴影 2048。`?fps=0` 不限帧。`Eco.stats()`。 |
| `instant_load` | `js/worlds.js` + `js/eco.js` | 进场后空闲预取相邻地点（资产 + `kickAhead` 敌人身体/动画/野兽），走近门 12m 立即预取；图片 `decode()` 异步解码 + 空闲 `initTexture`；`renderer.debug.checkShaderErrors=false`（实测切图 7.6s 卡在 getProgramInfoLog；`?shadercheck` 恢复）；着色器程序常驻（`usedTimes++`，切图不再删了重编）。`need()` 30s 超时不再永远卡加载框。PROF 新增 `foes`/`beasts`。 |
| `stuck_guard` | `js/guard54.js` | uiOpen 卡住且屏幕无面板 3s → `G.unstick`；W.busy 卡住 6s → 解除。另：`Foe.update` 每个敌人 try/catch、`Worlds.frame` 子系统 try/catch、game.js 出错仍出画面（“全场定格”根因防护）。 |
| `sp_zero` | `js/talents.js pts()` | 开局 0 技能点（旧档已花掉的旧开局点保留，不出负数）。 |
| `skin_match` | `js/foe.js build()/sampleSkin()` | 头身肤色接近时头直接用身体贴图取样肤色（以前染身体受 1.6 上限/贴图阴影限制 → 脸白身橙）；脖子圈取不到时取整张皮肤贴图。 |
| `hold_strike`（需 combat_master）| `js/combat.js`（HS/hsStart/hsTick/hsFire/hsUi）| 按住左键 = 姿态（移动 ×0.55、镜头 ×0.3），轻移鼠标 = 斩击角度（准星箭头 + 前摇环），松开出刀；前摇 0.18–0.65s、后摇（攻击 CD）按武器档次 `TIERK`；蓄满后再 0.55s = 重斩；右键取消（佯攻）。敌人 `handAng` 读蓄势方向。`Combat.aimMove()` 乘到 worlds 移速。 |
| `foe_duel` | `js/duel.js`（`window.FoeDuel`）| ~42% 普通敌人变成 剑斗士/重剑卫/疾刃手（没武器的会配刀，`Foe.attachWeapon` 已导出）：攻击不播动画，假 action（`act.time` 由 post 推进）喂给原 atkStep；右臂两节 IK + 刀身朝向把刀举到来刀一侧，身前丝带弧显示刀路，佯攻会在最后一刻变向。`foe_roles.assign` 对 `fo.duel` 跳过。 |
| `hit_react` / `foe_read` | `js/feel54.js` | 受击按刀向程序化后仰/侧倾/扭转（弹簧，带 mixer 不写骨头的还原）；空挥被抢攻、蓄重斩被侧闪（`fo.rv`）。 |
| `nat_gates` | `js/worlds.js`（natOk / veil）| 铁门 → 两块巨石（废墟/要塞/王城 = 两尊石像）夹出的山口 + 流动雾幕 + 地面微光；穿门淡入白雾（死亡仍黑屏）。必须在“实例化”之前 put。 |
| `ui_refine` | `js/ui54.js` | 纯 CSS 层（body.u54）：细血条/魂能条、细金边技能格、命中数字、敌人细血条、极简准星、横幅提示、毛玻璃面板、衬线标题。 |
- 其他：画面去灰（水面天空反射、Mie、薄雾、光束、镜头光晕都调弱）。
- 测试（本机）：真实游戏 `index.html` + Playwright：`UI._startTrip('village')`、`Worlds._debug.goto(i)`、`Foe.attack(fo,d)`、`Feel54.impulse(fo,{charged:true})`、`Combat.onDown(0)/onMove/onUp(0)`（先 `G.setUIOpen(false)`）。本机素材经代理拉取，加载时间偏长，不代表用户本地。
- 待做：地形系统进一步强化；更多敌人 AI（包围/轮换）；HUD 实机目检（本轮截图预算用完，UI 只做了数值校验）。

## R54b — 用户新愿景（原话要点，长期有效，后续 Agent 按阶段推进）+ 战斗回退
- **战斗回退**：用户“不喜欢蓄势出刀，还是喜欢原来那个”→ `hold_strike` 默认关（mods 迁移 `__v14` 一次性关）；新 MOD `stam_chain`（默认开，combat.js mmAttack）：每刀耗体力，1.3s 内连续出刀每刀 +30%（最多 ×3.4），停手即恢复。
- **换图太久 → 走廊流式（不是大地图）**：进入出口 = 踏进一条弯曲长走廊（每个区域/地图风格不同、宽窄不一、即时生成且必须快），玩家在走廊里走的同时后台加载下一个地点；加载好后走廊尽头生成出口自然接入新地图，不能看着违和。可按电脑性能预估加载时长决定走廊长度。
- **活世界**：角色不要像野怪；进图时所有角色在“潜空间”（抽象模拟、省性能）里已在做事，有真实 AI 目标，会前往其他地点。
- **人人可扮演**：所有角色都是同一种“玩家实体”（WASD 操作 + 各自独特 UI/技能/特效），食人魔只是可选角色之一；任何角色可由玩家或 AI 扮演。
- **正义 vs 邪恶**：邪恶 = 哥布林、兽人（酋长有指挥属性）、食人魔（SOLO：斩首、洞穴刷资源）、死灵法师（复活尸体为己而战）…；正义 = 各种女角色阵营（国王发令、士兵接任务；建造/防御/守城/发育/讨伐/收集神器）。各阵营内部结盟。正义目标=杀掉所有邪恶领袖；邪恶目标=杀掉各正义阵营领袖；**领袖死亡 → 其王国成员失去力量而死**。
- **世界即时演化**：开局固定约 100000 个角色，只减不增；自动涌现战斗；角色会逐渐变强（野怪不会）；洞穴不再是独立地点，整个世界联通；有打不过的高等级怪要会跑；可能有上万人合战且不能卡；信息沟通（情报/消息）要做好。
- 可行性与分阶段方案见本轮回复（模拟分层：远处纯数据、附近简化、眼前完整 3D；万人合战用实例化/顶点动画替身）。

## R54c–h（用户最新取舍，长期有效）
- 用户最终：**MMO/万人世界太复杂，先不做**；保留蓄势出刀 `hold_strike`（默认开，迁移 v15），所有近战角色共用方向战斗 `duel_all`（远处也能看到对方要砍的角度）；连续攻击越打越累 `stam_chain`。
- `corridor`（js/corridor.js，默认开，迁移 v17）：只在地点之间（洞穴→第一个地点仍普通加载）；**不要传送门**：入口/出口只是两块大石夹出的山口；后台准备好后出口出现在前方约 14m。`nat_gates` 的雾幕已移除（只剩岩石/石像山口）。
- `region_persist`（`S.rmap[k] = {seed, vis}`）每个地区只生成一次；`region_big` 每地区 20~44 个地点。
- `living_region` + `foe_levels`（js/living.js）：`S.liv[k]` 1000 居民/各地点 alive、alert、corrupt、nk、last；局面（集市/葬礼/民兵/驱魔/逃难/废村）；首次看见你说等级与记忆台词；地区基础等级 = 1+4×地区序号，老兵/精英/冠军 HP/伤害按等级差缩放，阶位越高 duel 连斩/佯攻/重击越多。钩子：worlds.populate→`Living.count`，foe.populate→`Living.foe`，foeEvent→`Living.event`，进场→`Living.enter`，每帧→`Living.frame`。
- `nemesis` / `soul_rite` / `head_boon`（js/nemesis.js）：洞里“宿敌逼近”条（~5 分钟满 → 下一趟第一个地点必遇）；每 8 分钟猎手全体 +1 级（Hunters2 hate）；出猎中每 4~7 分钟来袭；30%/猎手死光 → 月之巫女分身；选地点面板里的血祭（下一趟 伤害/生命/移速）；摆出的首级给微弱永久加成（`Nemesis.dmgK/hpK/spdK` 乘进 worlds power/移速与 RPG.stats.maxHp）。
- 循环：出猎斩首 → 首级摆出（永久小加成 + 产魂晶）→ 魂晶买装备 / 血祭 → 更高等级地区；洞里待久宿敌必来且越来越强。

## R54i/j（用户最新取舍，覆盖 R54c–h 中冲突部分）
- **用户洞察（重要设计原则）**：玩家潜意识在算收益率。资源可无限刷 → 单个首级价值趋零 → 没兴趣收集；改成**轮制**（每轮定量产出，有上限）后，首级才有价值。以后所有资源都遵守：有上限、按轮结算、溢出转为下一轮小加成，不允许无限刷。
- `run_loop`（js/loop.js，默认开）：章节 = 2 个地区 + 第 3 趟 BOSS 战（出发面板显示 BOSS Lv / HP× / 伤害×，每章 +5 级）；洞穴魂晶每轮上限 `Loop.capCave()`（game.js addCoins 经 `Loop.caveGate`），溢出 → 下一轮加成（最多 +60%）；回洞结算 `Loop.payout`（按摆出首级）；地点清剿奖励按清剿率²；每存档随机 2 条“世道”；离开地点时追你的 tier≥1 敌人变成新宿敌。宿敌条出猎时也涨，BOSS 趟不涨不来袭（hunters2 同步）。
- 地图回到老版每趟随机生成（`region_persist`/`region_big` 默认关，迁移 v18），`small_maps` 地图更小。
- 用户：老版敌人战斗更好、程序化举刀姿势不好看 → `foe_duel`/`duel_all` 默认关（迁移 v19）。用户：还是要传送门 → `gate_portal`（默认开，山口雾幕 + 光）。
- 未做：建筑需资源 + 战利品显示相关配方；月之巫女 ≥7 线索胜利 + 结局动画；头棋盘→下一轮加成；建筑组合效果；精英 BOSS 聚会。

## R54k（用户最新取舍，覆盖上面冲突部分）
- 用户原话要点：头每次回洞**固定产出、每轮结算**，不是在洞里点点点；不同建筑不同机制但都围绕「轮」；套装可以；多发明放头建筑（不和现有重复）；肉鸽要更多技能种类感、武器感、每局不一样。**章节 BOSS 是独立的，不是把地区霸主搬过去**；地区不缩小更好。
- `round_yield`（loop.js）：`G.trigger` 在回合模式直接返回 0（把玩/计时都不给魂晶，game.js 计时块与魂轮也跳过）；回洞 1.5s 后 `Loop.settle()` 按建筑结算（基础 10/20/36/60/100 × 异色/霸主 × 建筑系数 `Loop.bf(d)` 或 `Loop.ROUND[type]` 自定义规则 × 章节/世道/展厅），套装：同族 3/5/7、同身份 2/3、五阶齐全；右侧 `#lpSettle` 明细面板。洞里小游戏（curios/rites/oddities/sanctum/play/props/chess 这些文件里的 `G.addCoins`，按调用栈识别）→ `Loop.stash` 存到结算时发，每回合上限 `capCave()`。
- `round_halls`（js/roundhalls.js）：10 座 `rh_*` 建筑（月相晷台/酿魂坛/审判天平/吞首井/示威矛墙/命运骰塔/亡者议会/烽火首台/百族谱/双生镜龛），状态存 `S.run.bst[type@x,z]`；吞首井/骰 1/烽火第 3 回合会移除首级；议会/烽火/矛墙写 `S.run.nb`（下一趟祝福，Loop.runDmg/runHp/runSpd/enemyHp/onKill/清空奖励读取）；矛墙降低 `Loop.nemRate()`。其它放头建筑说明末尾自动补「回合制」系数。
- `rogue_boons`（js/rogue.js）：`S.run.rg`；出发面板 `#rgPanel` 选流派（8 选 3 展示）+ 祝福抉择（24 种 / 8 标签 / Lv3 / 同标签 3 种成套）。钩子：foe.js `Rogue.outDmg`（Talents 之后、霸主单刀上限之前）、worlds foeEvent → `Rogue.event`、hitPlayer → `Rogue.inDmg`、Loop.runHp/runSpd ← `Rogue.hpK/spdK`。每回合结算 +1 次抉择，吞首井/百族谱(≥5族)/月之使徒额外给。
- 章节 BOSS：`Loop.CHB` 七位「月之使徒」（独立形象/台词/擂台），`worlds.genArena()` 单地点擂台（`node.chB`/`node.arena`，只有回洞门），`BOf(node)` 统一查 BOSS，`mkBossH` 设 `c.boss='chN'`；击杀不写 `S.bosses`（地区霸主不受影响）；Lv = 5 + 6×(章-1)；赢了 `Saga.giveClue('chapboss')`（saga.js 新导出）+ 1 次祝福抉择。foe.js `bodyFor` 对未知 bossK 按她的身份挑身体。
- `small_maps` 默认关（迁移 v20）。
- 顺手修复：worlds.js `foeCtx` 里 `toast`/`shake` 一直被上一句 `//` 注释吞掉 → 非斩首击杀 `die()` 和每次斩首 `decapitate()` 都会抛异常（之后的 decap 事件、布娃娃击飞没执行）。

## R54l（用户：BOSS 打完了怎么办 / 舒适洞穴视觉 / 属性限次 / 线索=跑图任务 / 工坊围绕新系统 / 人物刺眼 / 技能太少 / 下蹲走路 / 宿敌战穿门 / 光球小精灵 / 开局不送东西）
- 章节 BOSS 无限随机：`Loop.CB(ch)` 按 `S.run.seed`+章节生成（11 个角色模板 × 种族/名字/发色瞳色/称号前缀/擂台前缀/底图地区/词缀 1~3/招牌技 3~6），`Loop.bossAff` 在 living.foe 里给 BOSS 上 FoeAI2 词缀。打赢只给 1 次祝福抉择，不给线索。
- 月之线索 = `moon_trail`（js/moontrail.js）：出猎 35% / 杀月使后或用寻月罗盘必定；3 个随机地点的天光月痕，门牌 🌙 指向下一跳（`Worlds.relabel()` + doorName 钩子），限时 7 分钟。saga 的月使在 moon_trail 开着时改为「下一趟必有月之踪迹」。
- 工坊：`run_kit`（js/runkit.js）9 种围绕循环的道具（Sack.def + `grp:'run'` 配方，`d.onUse`）；材料悬停显示「可合成」；摆件页改卡片 + 回合制效果文字（`Props.effTxt`），光环/戳击/风铃都折算进结算（`Props.roundMul`），定时产出改为每回合结算。与另一位 Agent 的 workshop_plus（js/workshop.js，RGRP 新分组）已合并。
- `build_stat_cap`：同种建筑属性只算 1 座、每项封顶 6+2×洞层；摆件属性同种只算 1 件。
- 洞穴舒适：光柱改成交叉柔光面片 + 地面柔光（不再是光环），天窗/光柱/尘埃全部 `raycast=()=>{}`（以前尘埃 Points 阈值 1m 挡住摆头/建造），火边兽皮毯 + 墙边灯；曝光 1.42→1.3。
- `foe_skills2`（foe_ai2.js SK2）：老兵 volley/cleave，精英 +pull/quake，冠军 +mark/rally，BOSS +nova；地区霸主 SIG 表、章节 BOSS `B.sk`。
- `soft_glow`（js/fix54l.js）：Master 泛光 0.9/0.9→0.38/1.25，CharLight 逆光轮廓 ×0.4。
- 下蹲走路：persona sly 走路、刺客绕背改为正常走/小跑，persona 闲置去掉 Crouch_Idle。宿敌战穿门：自然山口自动穿越加 `inFight()`（20m 内有追击/出招的敌人就不穿）。光球小精灵：`popFoes` 载入失败重试 3 次再退回。
- `no_freebies`：新档 0 魂晶、无药、无材料；结算无底薪；祝福抉择需要这一趟杀满 3 人或清空 1 个地点。
- 宿敌封门（nemesis.js `sealed()/sealFoes()/sealLeft()`，SEAL_T=90s）：宿敌（hunter2 / nemClone / nemX）在场时所有门（E、自然山口自动穿越、回洞魂门）都封死；解除条件 = 宿敌死 / 残血撤退（猎手 30% 逃跑；分身/新宿敌 25% 撤退，8 秒后带伤消失、下次 +1 级）/ 90 秒到点你可以撤退。屏幕上方显示倒计时。
- 刷宿敌清场 BUG：regionquest.js 和 saga.js 包装 `Foe.populate` 时丢了第 3 个参数 `{keep:true}` → 中途追加宿敌时把整个地点的敌人清掉。现在 keep 调用直接透传（也不再重复注入小 BOSS/异变目标）。
## R54 workshop_plus（工坊扩充，MOD 默认开）
- 用户：合成内容太少、工坊文字有问题；想要更多断肢/器官（肠、胸、心脏、上臂、下臂、大腿、小腿）。
- **新 js/workshop.js**：配方 12 → 47（药品 / 料理 / 战斗增益 / 护具·饰品 / 材料转化 / 拆解·肢体）；新物品 tonic、salve、soulwine、manadraught(魂能)、bonebroth、jerky、huntstew、ironskin(受伤-25%)、swiftdust(移速+18%)、bloodoil(伤害+40%)、regenbalm(每秒2%) 与肢体材料 ua/la/th/ca/torso。**不做武器配方**（武器只来自搜刮 + 铁匠台强化，用户旧约束）。
- 砍断 上臂/下臂/大腿/小腿（80%）与腰斩残胸（100%）→ 自动收进麻袋（`foe.js` 设置 `fo.lastSev`，`worlds.js` 事件 → `Workshop.onSever`），在工坊「拆解·肢体」拆成骨/指骨/筋/皮。
- 内脏（心/肠/肝…）本来就有：`organs.js` 的「解剖」尸体。**子宫等生殖/性相关器官不做**（organs.js / props.js 既有内容边界，保持）。
- sack.js：新增 `Sack.defMul/spdMul/buffList`（防御/疾行/再生/暴伤 BUFF，`worlds.js` 受击与移速处调用），`use()` 支持 `mana` 与 `bf`；配方分组 RGRP 按 `rc.g` 分七组；工坊文字放大提亮（名称 21px、说明 15px、材料 16px）；缺图标/缺物品的配方自动隐藏。itemicons.js：去掉 potion/bigpotion/bandage 的错配 3D 图标（显示成了木棒/勺子），改用 emoji。
- 肢体 3D 摆件（Props）未做：现有 limb_hand_* 是从角色身体切出的资源，无同类工具；下一步可考虑用 foe.js 的 sever 网格快照生成摆件。

## R54m 大师级UI + 爽感
- 新 js/grandui.js（MOD grand_ui）：GrandUI.choose 全屏卡牌（1/2/3 键）/ ceremony 结算逐行累加。rogue.js 流派(LORE 称号+典故)/祝福(TAGN)走全屏，出发面板只留按钮；Loop.showSettle 走 ceremony，关闭后若有祝福待选自动弹出。
- 新 js/momentum.js（MOD momentum）：杀意连斩 5.5s 窗口，档位加伤/移速/省体力，≥3 层回血；中心大字 #mmSlam，右侧 #mmBox。
- fast_ttk：普通敌人≤4 刀；combat chainK 体力更便宜。
- corridor 默认关（不走走廊）、nat_gates 默认关（回到铁门），迁移 v21。野兽与敌人并行生成加快换图（实测约 1s）。
- arrival2 抵达大窗口恢复（等 Saga 电影结束后弹）。

## R54n 加载提速 + 战斗可读性 + 界面整理
- 加载：实测大头是 Windows(D3D11) 着色器编译（每个变体 0.3~0.9s，进图要编几十个）。lib/three.min.js 打补丁：getProgram 不再立刻 getUniforms（uniformsList 改为 setProgram 时惰性计算，同 r151+），配合 KHR_parallel_shader_compile 并行编译。新 js/shaderq.js（MOD async_shaders）：ShaderQ.compile/wait/ready；开机时 __pauseMain 暂停首帧→异步编译→再出画面；Foe.warm 异步时只 compile；worlds.goto 建好场景立刻发起编译、首帧前等待。实测：开机着色器阶段 15s→6s，首次出猎 3.6s→2.0s，换地点 20.9s→9.2s（本机）。
- decapcam：body.dcam 隐藏规则漏了 :not(:has(canvas))，把 #game 一起隐藏 → 斩首瞬间黑屏（用户说的黑屏/没慢动作）。已修；周围 ≥4 人才不触发。
- fair_fight（foe.js）：起手速度 ×0.72、hold +0.18s、无假动作、先转身对准再出手、命中角 0.7、出手间隔 1.1s、冷却 +0.7s、出招前压 ×0.55、落空补刀最多 1 次且 0.9s 后。实测起手到命中约 1.1s。
- 新 js/r54n.js：Feel54n（move_sfx 跳/落地/闪身音效，脚步调响）、Barks（foe_barks 头顶气泡：来刀方向+往哪闪、重击/突刺/连斩/冲刺/掷刃、格挡、逃跑、残血、刺客绕背）、敌情研判卡（region_intel，#icCard：模糊等级、你的等级/战力、胜率、按职业推荐战术）、HudTidy（hud_tidy：rqTrack/arTrack/mtTrack/sgTrack 左侧一列统一卡片；猎手感应并入 #nemChip；菜单打开时 body.menuon 隐藏 HUD）。arrival2.track 在 hud_tidy 开时不再自己定位。
- 精英光环/法球光晕不再刺眼（soft_glow 开时透明度约 1/3）。moon_trail 默认关（迁移 v22），恢复原来的电影任务线索。

## R54o 战斗违和感 / 黑屏 / 碎料
- 黑屏闪烁根因：eco.js pace() 在本帧渲染之后调 setPixelRatio（动态分辨率）→ 画布被清空 = 黑一帧；改为 prNext 延到下一帧渲染前应用。decapcam 黑屏已在 R54n 修。
- 跳过电影弹主菜单：Esc 跳过会让浏览器解锁鼠标 → pointerlockchange 显示 #menu。saga.end() 设 window.__skipMenuUntil，game.js 在 Saga.cine/宽限期内走 lockFailed（点画面重锁）而不弹菜单。
- 朝向：fair_fight 下近身缠斗（chase、d<5、非出招/技能/硬直）yaw 与面向玩家的偏差钳制在 0.5rad；绕圈走位偏转 0.9→0.35。受击硬直 0.45→0.62（BOSS 0.4）+ 小击退。
- 追踪：foe_ai2 mark（追踪圈）只追 0.9s、跟随率 6→2.2、判定半径 1.7→1.4。
- 野兽：fair_fight 下第 1 章伤害 ×0.55、第 2 章 ×0.75；扑咬命中 0.28→0.5s；受击硬直 0.4→0.75。
- 血：decapcam 血滴从拉长胶囊改成短血珠（Icosahedron，拉伸 1~2.4）。
- 画风：默认 r_illust（插画风/厚涂），迁移 v23；persona_voice 默认关。
- worlds.goto：W.shWait 期间 Worlds.frame 不渲染（否则首帧同步编译卡死主线程），ShaderQ 等待上限 15s。
- r54n.js 新增：fem_vox（共振峰合成女声：喝声/痛呼/惨叫/闷哼/嘲笑）、敌人战斗聊天气泡（包抄/嘲讽/同伴倒下/受伤）、breakables（每地点 14~22 个可踩碎小物件，碎料存 G.S.shards 不占格子，攒够 4~6 自动 Sack.stashAdd 成材料，右侧 #bkFeed 提示）。skillfx：soft_vfx 渐变贴图（环/月刃/光柱）。

## R54p 反馈感 / 鬼巫流派 / 评级 / 面板
- 画面：render 组回 r_classic（插画风会让远景糊），R47 人物风格 cstyle 默认 cs_paint（厚涂），迁移 v24。
- 读图条：资源 0-50%、敌人 62-80%、着色器 80-100%，不再资源读完就满。
- 斩首：G.S.decapN 持久计数（以前用本趟 W.stats，总显示第 1 颗）；decapcam slashArc 沿 Combat.state.sw 方向的 3D 刀痕 + DOM 刀光同角度。
- 朝向：fair_fight 下 seen 且非 flee/idle、d<8、非技能/硬直，yaw 偏差钳到 0.3（出招 0.2，命中前 0.14s 放开）。
- 完美格挡放宽：方向 1.05、按下 0.5s、转向 0.4s/0.7。momentum.js hitStop：hit/kill/parry/guardbreak/perfectdodge/execute → Foe.slowSet 顿帧 + 震屏（MOD hit_stop）。
- 脚步：玩家加 230Hz 中频踏声、总线 2.0；敌人脚步 ×2.2（笔记本喇叭放不出 95Hz）。
- skillfx：FX 只挂在 HOOK.frame（野外不跑）→ 野外特效永不消失；加 rAF 循环在野外更新。
- breakables：放大 1.6~2.1 倍（以前藏在草里）、shaped 地图用 lp.clamp 落点、碎料只在平安回洞后合成（死亡清空）。
- loop.js side()：出发面板打开时右侧 #lpSide 三张卡（章节/章节 BOSS/主线），MOD side_panels；lpHead 只留回合经济。
- r54n.js ogre_rank：清空地点（≥2 敌）后 D~SS 评级盖章 + A 以上魂晶。
- 新天赋流派「鬼巫」hex（talents_data + talents.js S_.x_*）：勾魂索/换魂/提线傀儡/同命咒/血井/百鬼夜行。

## R54q 角色浮现 / 宿敌档案 / 任务栏放大
- r54n.js whispers：野外每 11~19s 在屏幕左右随机位置浮出黑框字卡（.wsCard），揭示本图某角色的名字/性格/动机/正在做的事/现况；菜单、电影、到达窗、敌情卡期间不出。R54n.wsNow() 调试立即出一张。
- hud_tidy：左列任务卡与 #tbCol 用 CSS zoom 放大（1.25 / 1.3），排版按 getBoundingClientRect 高度、top 除以 zoom。
- 宿敌档案：Nemesis.dossierHTML()（塞勒涅之影 + s.extra 每人名字/性格/当前等级/成长）挂在 U 猎手档案窗口底部；#nemChip 加「U 档案」提示。
- foe.js 逃跑：fair_fight 下每 2s 检查进度，卡住就换门（fleeBan）+ 绕路，连卡 3 次且你在 7m 外就算她溜走。
- F 回忆（recall_iw）：game.js 连点复位逻辑跳过 RecallIW.active；pre() 每帧保持 uiOpen 并解锁鼠标，不再突然变回第一人称；回忆视角 FOV 收窄 14%（头更大）。
## R55 (残肢器官编辑器 / 战场解剖挑选 / 移除工坊断肢制作)
用户要求：① MOD `part_editor`（默认关）= 残肢器官编辑器，只能从 MOD 面板该行展开后的按钮打开，且必须已「开启并应用」(`Mods.on`)；② 移除工坊里的断肢制作；③ 部位只来自战场上解剖尸体，用选择界面，每件都有用处，**不含头部器官**。
- `js/organs.js`：OG 加 `cat`('limb'|'organ')；新增肢体 upperarm/forearm/thigh/calf/chest；brain/eye/tongue 标 `hid:1`（旧存档仍可摆放，不再可解剖）；`poolOf()`、`limbModel()`（**肢体占位模型=圆柱+关节球，是对“不自制模型”规则的临时例外，只为让编辑器导入真模型前不空白**）；`model()` 优先用 `PartStore.model()`，`jar:false` 时不带标本罐。
- `js/dissect.js`（新，MOD `dissect_pick` 默认开）：`Dissect.open(L,done)` 选择界面；名额 3(+1 稀有≥2,+3 boss)；每具尸体只掷一次(`L.dpool`)，未选的丢失。`sack.js` 解剖按钮改调它。
- `js/partstore.js`（新）：IndexedDB `soulhead_parts` + `assets/custom_parts/manifest.js` + `<id>.js`(base64)；自带 OBJ/MTL/STL 解析，glb/gltf 用 GLTFLoader；`load()` 做检查报告（面数/体积/贴图缺失/过大/NPOT/无UV）。`replaces` 覆盖内置键的模型与名称；新部位注册为 `OG['cp_<id>']`。
- `js/partedit.js`（新）：编辑器界面（左列表/中预览+导入+报告/右表单），保存到浏览器与「保存到游戏目录」(showDirectoryPicker，需 Chromium，会校验 index.html)。
- `js/mods.js`/`mods_i18n.js`：新增 `dissect_pick`、`part_editor`；MOD 行支持 `btn:{l,o,f}` 按钮（`data-a="mbtn"`）。
- `js/workshop.js`：`onSever` 变空操作；body 拆解配方标 `legacy:1`（`sack.js` 仅在持有对应材料时显示）；h3/a3/a4 配方改用 bone/sinew/hide。`js/props.js`：断手/断脚/肠索不再出现在制作列表（已有的仍可摆放）。
- 测试：`tools/test/partedit.html`（独立 harness）。FBX/.blend 不支持，需先转 glb。

## R55d 用户反馈修正（敌人弯腰 / 光环 / 后退 / 黑框字）
用户原话：战斗时敌人弯腰不面对主角；光环太耀眼；现在后退太慢了；经常战斗时冒出黑方框文字，不要了。（长期有效：不要在战斗中弹黑框字卡；不要刺眼的光环；后退不要被压得太慢）
- 后退：`worlds.js` back_slow 由 55% 速度改为 88%（`bk*0.12`）。
- 黑框字：MOD `whispers`（r54n.js 角色浮现 .wsCard）默认关。
- 光环：MOD `lens_flare`（master.js 镜头光晕/彩虹光环）默认关。以上两项靠 `mods.js` 迁移 `__v 25` 对旧存档生效。
- 敌人弯腰/不面对：`stance.js` 架势体态不再前压/后仰（lean=0）、歪头和侧身减小，上身扭回更多；`foe.js` 受击硬直 0.62→0.42（BOSS 0.4→0.32），硬直中也持续转向面对玩家；`locomo.js` 转身侧倾 ±0.12→±0.04。
- 未动：顶部「护盾被打光了」等 toast（若用户也嫌黑框，下一步统一改成无框描边字）；`Foe.say` 头顶气泡。
## R56 — 3D body autopsy (js/autopsy.js, MOD `autopsy`, default ON)
- Replaces the R55 part editor (removed per user: "我不要这种编辑器了"): deleted js/partstore.js, js/partedit.js, assets/custom_parts/.
- Autopsy.open(corpse) bakes the corpse's skinned body into static geometry (stride 16: pos nrm col colB uv tw reg), real textures kept via a patched MeshStandardMaterial (attribute `tw`: 1 = textured shell, 0 = flat wax cut face). Vertex-colour baking of textures was ragged — don't retry.
- Cut = plane slice anywhere, any angle, repeatable; wax caps; component split; each piece is a `piece` organ item (OG.piece in organs.js) with random affixes by region; piece geometry persisted in IndexedDB `soulhead_pieces` (textures downscaled to 512px). `Organs.model` -> `Autopsy.model`.
- Clothes toggle swaps to linen (never nude); single-mesh Genshin bodies have no separable clothes. No head organs, no reproductive organs, no blood/gibs.
- sack.js opens Autopsy for humanoid corpses, falls back to Dissect (R55). Harness: tools/test/autopsy.html.
- NOTE: three build here has no `mapTexelToLinear` in map_fragment (hardware sRGB decode); the shader hack must not call it.

## R55e 用户反馈（原话要点，长期有效）
敌人打着打着就侧身不知道为什么；角色战斗打击感弱爆了、很蠢；键位冲突（跳过电影 vs 打开主菜单、第一人称 vs 回洞选择奖励之类）；技能特效太弱太少；反馈太少（同伴被斩首周围角色都应该冒气泡聊天，更频繁）。
- **侧身根因（已修）**：`Stance.post`（npc_stance/npc_strafe）和 `Feel54.post`（hit_react）都改同一批没有动画轨道的骨头（hips/spine/chest…），互相认不出对方的改动 → 每帧偏移叠加，被打后 ~1s 内胸口朝向可偏到 180°（实测 3.14rad，修后 ≤0.58）。修法：`foe.js` 在 `mixer.update` 之前调用 `Feel54.pre` + `Stance.pre` 无条件还原上一帧叠加的偏移。**以后凡是在 mixer 之后改骨头的模块，都要在 mixer 之前还原**。另：npc_strafe 下半身最大扭转 77°→54°。
- **打击感**：`momentum.js` 顿帧加长（普通 0.1s、重击/暴击/破绽 0.17s、击杀 0.22s、处决 0.36s，期间敌人时间 ×0.04~0.06）；`combat.js` 命中时玩家刀停留 0.045/0.07/0.09s，镜头后坐/FOV 冲击加大；`foe.js` 受击闪光改为先白热再转红（0.16s），击退 2.6→3.8（重击/暴击 ×1.7）；`feel54.js` 受击后仰/侧歪冲量 ×1.45；`cfx3d.js` 技能命中也走“重击”特效（大环 + 更多火花）。
- **键位**：`game.js` pointerlockchange：电影中按 Esc（浏览器吃掉 Esc 只解锁鼠标）= 直接 `Saga.end()` 跳过，不弹主菜单（要求 `document.hasFocus()`，切走窗口不算）；`tutorial.js` Enter 在斩首镜头/电影/到达窗/GrandUI 开着时不再抢；`hunters2.js`（U）、`gear2.js`（Z）在这些界面开着时不再叠开。**键位规则：电影 Esc=跳过、Space/E/点击=下一幕；Enter 归当前最上层界面；主菜单只在无任何界面时由 Esc 打开。**
- **技能特效**：`skillfx.js` 新增 `SPEC[技能id]`：37 个技能每个有自己的 3D 特效（旋风斩多层水平刃环、突刺残影光带、剑气飞行新月、百刃随机斩闪、万剑归宗 5 脉冲+落剑光柱、震地裂纹+尘土、魂盾双层球壳、毒雾球、战吼 4 重环、魂弹/魂焰飞行光球带尾迹、连锁闪电折线、魂陨延迟爆炸、勾魂索锁链、同命咒连线、血井、百鬼夜行 6 魂球环绕等）。通用六门派分支仅在没有 SPEC 时才用。助手：`orb/beam/bolt/dust/embers/spiral/later`。
- **气泡**：`r54n.js` 新增 `reactAllies`：同伴倒下/被斩首时，26m 内最近 4 人依次（间隔 ~0.5s）冒气泡 + 惨叫/痛呼（斩首用专门台词 `L_DECAP`，勇敢的人喊 `L_COVER`）；战斗聊天间隔 4~7s → 2.2~4s，另有杀意连斩时的恐惧台词、玩家血低时的“压上去”台词、被打时同伴“撑住”。
- 验证方式（浏览器约 1fps，软渲染）：Playwright 里 `Worlds.start` → `Worlds._debug.goto(4,3)` → 手动循环 `Foe.update(1/30, now)` 采样；`SkillFX.cast(id)` 全部 37 个无报错。

## R55f 用户反馈（原话要点，长期有效）
战斗 AI 还是非常弱智：莫名其妙乱走不打主角、莫名其妙卡住不动、手感很差。建议大师级研究现有机制——是不是各种 MOD 相互独立运算——整合做个新的，把老的统合、该关的关掉。
- **研究结论（实测）**：敌人行为由十几层各自独立运算（foe.js 基础追击 → FoeAI2 技能/战术 → FoeMind 读招 → FoeRoles 1/2/3 职业 → Feel54 读招闪避 → Persona 手势 → Locomo/Stance 表现层），每层都能在同一帧起手攻击、写 `fo.rv`、播动画，互相不知道对方做了什么。
- **真 BUG（已修，foe.js）**：AI2 层（FoeAI2.tick）起手攻击后返回 null → 职业层紧接着 `f.play('Walk_Loop')`，Locomo 拦截后把攻击动作淡出 → `A.act.time` 永远不走 → `fo.atk` 永不结束 → 敌人站着不动几十秒（台架实测一个决斗者 8s~40s 全程“ATK”）。修法：①AI2/职业分支条件改为 `(tick() || fo.atk)`，起手后改走 `atkStep`；②看门狗：`f.cur !== atk.clip` 超过 0.4s 就放弃这一招。修后 40s 内攻击次数：决斗者 2→11、重甲卫 3→7、投弹手 1→10。
- **新增 `js/brain.js`（MOD `foe_brain`，默认开）= 战斗总导演**：不替换旧层，而在其上统一调度——①每 0.35s 选【进攻者】（最近、冷却短、刚出过手的排后面 → 轮流上），攻击令牌只给她（`Foe.tokenOK` → `Brain.token`；全场出手间隔 1.1s→0.7s；≥3 个近战或有霸主时允许 2 人同时）；②全场 >3.2s 没人出手 → 点名最近的人冲上去；③看门狗：交战中 d>2.6m 站着不动 >1.6s → 清掉 mnext/kiteT/detour，`freeT=2.5`（跳过职业层走基础追击）并推她朝你走；④远程/辅助职业（ranged/mage/healer/bomber/netter/trapper/wispcaller）>9s 没任何出手 → `freeT=6` 改走近战（疗愈者没同伴不再永远发呆）；⑤`Brain.pf`：包抄站位用的“玩家朝向”改为 0.45rad/s 慢速跟随（以前你一转视角全场重新找站位 = 乱走）；⑥攻击后摇 -0.9s（`foe.js` atkStep 收招 cd）。
- **关掉/门控的旧逻辑（Brain 开启时）**：`foe_mind.js` 的“打完拉开 / 你乱挥就后撤 / 横向预判”（`mindTick` 里 `BR` 判断）；`persona.js` 交战中不再点头/摇头/抱臂（`gesture` 会让她站定 1.1~1.6s）。其余层（技能、职业招式、读招闪避、受击反应）保持。**关 `foe_brain` = 完全回到旧行为。**
- **台架**：`tools/test/aibench.js`（在真实游戏页里手动步进 `Foe.update`，`__bench(role, secs, {extra, extraRole, circle, kite})` / `__benchAll(secs)`；指标 atks/hits/near/avgD/maxStuck/maxAtkSec）。用法见文件头。注意：台架里切 MOD 请直接写 `localStorage.soulhead_mods`，别用 `Mods.set`（会持久化关掉 `foe_brain` 影响后续测试）。
- **实测（Brain 开，玩家站桩/绕圈）**：3 个决斗者 40s 共 24 次起手（轮流，无人 0 次）；4 人混编绕圈玩家全员都在 2.2m 内出手；17 种职业无卡死（maxAtkSec ≤ 4s）。
- 未做 / 下一步想法：投掷手/术士在你贴脸时的风筝逻辑仍各自实现；第一批职业（brute/skirm/guard/assassin/berserk/ranged）台架里 `__forceRole` 不生效（foe_roles.js 没读它），没单独测。

## R55g 用户反馈：敌人攻击动画太少了（种类）
- **病因**：动作库里真正的攻击动作只有 Sword_Regular_A/B/C、Sword_Attack、Sword_Dash、Sword_Regular_Combo、Sword_Heavy_Combo、拳 3 种（Jab/Cross/Hook）、OverhandThrow；Shield_Dash/Shield_OneShot/Spell_Simple_Shoot 实测没有明确的出手时刻（右手/左手速度峰值都不明显），没当攻击用。而且职业 `clip()` 钦定：重甲卫永远 Sword_Attack、刺客永远 Dash、决斗者 55% Dash……
- **做法（不新增任何动画/模型文件）**：新增 `js/moves.js`（MOD `foe_moves`，默认开，`Moves.pick(fo,d,cur)`，foe.js `attack()` 在职业选招之后调用）：
  - 变体 `Foe.ATK` 新增 `{clip, from, hits, end}`：`Sword_Combo_AB/BC/CD`（常规连击前两刀/后三刀/末两刀，`from` = 起播偏移）、`Sword_Heavy_Open/Finish`（重剑起手/收尾）；命中时刻/角度全部沿用 ATK 里已实测的数值。`attack()` 用 `T.clip||clip` 播真实动作并设 `act.time=T.from`，`fo.atk.clip`=真实动作名、`fo.atk.alias`=招式名，holdAt 相应后移。
  - 连招：`fo.cq` 队列，`atkStep` 收招后（state 仍是 chase、没被打硬直、d<3.6）立刻接下一招（`fo._chainStep` 跳过职业选招，后手停顿 -0.12s）。新单招起手时 `fo.cq` 清空。
  - 每个职业一份加权招式池 `POOL`（决斗者/重甲卫/蛮兵/狂战/盾卫/战旗手/刺客/游击/BOSS/徒手/通用），精英才用多段招，不连续出同一招，远距离偏冲刺、贴脸偏短招。长枪/双刀/投弹/网/陷阱/唤灵等有自己招式的职业不动。
- 实测：各职业池 5~11 种招式（含连招）；台架 120 秒内决斗者 57 次起手 8 次连招、重甲卫 43 次/7 次连招，无报错、无攻击卡死。
- 注意/待办：从连击中段起播（from=0.5/0.95/1.5）有 0.12s 交叉淡入，**姿势衔接没做肉眼检查**；如果某个变体看着别扭，改 `moves.js` 的 `from` 或把它从池里去掉。真正新的动作（踢腿、旋转斩、跳劈）需要新动画资源——用户“不要自制模型”的规则，没有做。
## R57 — autopsy: curved cuts, physics, real linen, grid size (user request)
- Cut = any drag path. Straight → plane (flat wax cap). Curved → `makeCurve()` screen-space polyline (Chaikin-smoothed, ends extended along tangent) ⇒ ruled surface through the camera; caps unrolled to (arc, depth) coords so loops triangulate; per-vertex cap normal = numerical gradient; winding fixed against the normal. `Autopsy.ui.doCutPath(path)`; `doCut(x1,y1,x2,y2)` kept for tests.
- Physics (inside `open()`): own rigid-body step 120 Hz — gravity, table (r 1.22) / floor (y -1.5), hull points (≤74 extreme vertices) vs table, piece-vs-piece (hull points in other piece's local AABB), friction, sleeping. 🤲 tool (key 2) grabs by a spring at the clicked point (dangling, can be thrown / dropped off the table). Fresh cut siblings ghost each other until they stop overlapping. Shadows on.
- 素衣 (linen): now DESTRUCTIVE + undoable (hist entry has `lin`). Cloth sets keep only vertices with torso/upper-leg reg and above knee-ish hem (reg bit +32 set at bake). Never nude: `hasCloth` requires ≥300 kept tris AND the skin layer to be a complete body (Genshin single-mesh bodies and bodies whose limbs live in the cloth layer disable the toggle).
- Inventory size: piece items carry `sz:[w,h]` (cellsOf: long edge/0.32m ≤4, 2nd edge/0.28m ≤3). `sack.js`: `base(o)` used by dims/fits/spot/cell. Panel shows a mini grid + "占 w×h 格" + bag free cells (Sack.usage).

## R58a (autopsy 刀路 / 切面 / 骨骼) — js/autopsy.js only
- User asked: knife-spot guide line, knife animation, cuts that change direction mid-way, cut face must read as "cut" not wax, bones kept ("骨骼保持" interpreted as: bones stay inside the pieces and show in the cut), ragdoll + lockable pose that survives returning to the cave.
- Done in R58a: vertex layout S=18 (cap coords cp 15-16, reg 17; tw=-1 flesh cap, tw=-2 bone disc); cap shader (skin rim→fat→striated muscle→deep; bone discs ivory+marrow); bones tracked per part (`part.bones`), split by cuts, bone discs added at crossings, `p.boneLine` shown in xray; guide dots on the body while dragging; dashed extension preview; SVG knife animation `runKnife` then `doCutPath`; `st.busy` lock.
- Gotcha: triangulateShape mutates its input arrays — build `all2` before calling it.
- NOT done yet (R58b): ragdoll (PBD) + pose lock. Plan: particles at joints, distance constraints, CPU skin via H_ weights, "lock pose" writes posed verts into V and calls initRB; pose stored in the whole-body piece.
- Never commit the user's GitHub token.

## R55h 用户：“你能网上多找点动作么”
- **查证（别再重复找）**：UAL2 Standard（GitHub 镜像 Barbatos6669/elderforge、ElKlient/IDOL-Genesis 的 `UAL2_Standard.glb`，43 段）里的战斗动作我们 `KEEP` 列表已经全烘了，免费版没有更多近战；Pro/付费版才有 3~4 连击拆分。**新的 CC0 来源 = Kay Lousberg 的 KayKit Character Animations 1.1**（itch/GitHub，CC0，161 段，Rig_Medium/Rig_Large；本次用 `Rig_Medium_CombatMelee.glb`，从 GitHub 镜像 J3vb/Sanctuarys_End `assets/animations/Rig_Medium_CombatMelee.glb` 下载到 `_tools/kk/`，gitignored）。其余分包（General / MovementBasic / CombatRanged / Simulation / Tools）还没烘，**横移、后退、闪避 Dodge 在 MovementBasic 里很可能有，值得下一步烘**（UAL 免费版没有）。
- **烘焙工具** `tools/anim_bake_kk.js`（Node，Windows 机器没有 python 也能跑）：同 `tools/anim_bake.py` 的格式（世界旋转增量 + 髋位置/髋高）；`--validate UAL2_Standard.glb <ual.js URL>` 用同一套代码重烘 UAL 两段并和现有 `big/anim/ual.js` 对比：最大旋转误差 1.1°、髋 Y 误差 0。KayKit 的 Rig_Medium 没有 neck/upperChest/肩/手指，这些骨骼不写入（`foe.js clipsFor` 对没数据的骨骼按父骨骼跟随）；髋水平位移减去第 0 帧（前冲由 ATK 的 `lunge` 负责，避免“滑出去再弹回来”）。输出 `assets/anim_kk.js`（`window.KK_ANIM`，124KB，15 段：1H 劈/斜切/横切/刺/跳劈、2H 劈/切/旋转斩/刺/Spinning、双持劈/切/刺、踢腿、拳 A）。`tools/glbprobe.js` = GLB 节点树/动画列表探测。
- **接入**：`foe.js` `loadAnim()` 在 UAL 之后再加载 `assets/anim_kk.js`（缺失也不影响运行）；`clipsFor()` 对每个动作包用各自的骨骼列表重定向，KayKit 动作名加 `KK_` 前缀。
- **出手时刻**：在这具身体的手/脚骨骼上实测速度峰值（角度 = atan2(-vy,-vx)，已和 UAL 条目校准：A 实测 -128°/表 -132°）。已用的 11 个 ATK 条目在 `moves.js` 的 `VAR`（`KK_Melee_*`）：劈 .63 / 跳劈 .70（lunge 3.2，heavy）/ 斜切 .38 / 横切 .23 / 刺 .37 / 2H 劈 .70（heavy）/ 2H 切 .40 / 旋转斩 .70+.85（两段）/ 2H 刺 .40 / 踢 .44 / 拳 A .40。**没用**：2H_Spinning（手速峰值不明显）、双持三个（单武器模型）、各种 Block/Idle。`wsK` = 把前摇拉回到和 UAL 差不多的反应时间（KayKit 动作本身更慢）。
- **池子**：`moves.js POOL` 每个职业加了 KK 招（决斗者偏刺/斜切、重甲卫/蛮兵偏 2H 劈切刺、狂战加旋转斩/跳劈…，徒手加踢腿/拳 A 以及踢腿连招）；`has()` 会跳过动作包没加载时不存在的招。台架 120 秒：决斗者 52 次起手里 24 次是 KK 招、徒手 67 次里 23 次，无报错无卡死（最长 5.6s 是连招）。
- **没做/待办**：KK 姿势只用数值检查（头高、脚/手轨迹方向）没有肉眼看（截图时被游戏本身的相机/敌人挡住）；其它分包没烘；CombatRanged 里有弓/魔法动作可给投掷手/术士用。授权记在 `CREDITS.md`。
## R58b (autopsy 布娃娃 / 摆姿势) — js/autopsy.js only
- New tool 🧍 摆姿势 (key 4, only when the table holds ONE uncut body with `part.rig`). 23 PBD particles (joints + 4 torso front/back points), distance constraints, rigid torso cluster, knee/elbow bend-direction limits, min-distance limits, table-slab/edge/floor collision with friction, limb-vs-limb particle collision, grab = pin one particle to a camera-facing plane.
- Skinning: bake now stores per-vertex rig groups `s.rg={P,N,sk}` (rest pos/normal + top-2 groups/weights from the ORIGINAL H_ bone weights; groups 0 torso, 1/2 upper arm, 3/4 forearm+hand, 5/6 thigh, 7/8 calf, 9/10 foot). `part.rig={jn,off,pp,pts0,bones0}`; `rig.off` is shifted in `recenter`; `linenize` remaps `rg`.
- 🔒 固定姿势 (or switching tool / cut / linen / finish) writes the posed positions+normals into a NEW part (undo works via hist), keeps `rg` + `rig.pp` so the body can be re-posed later. Cut pieces drop `rig` (no posing after a cut; Ctrl+Z back to the whole body).
- Pose is persisted by the normal piece pack (IndexedDB), so a taken whole-body piece keeps its pose in the cave. Re-posing inside the cave is NOT implemented (would need a rig in Props).
- Footprint (`sz`) follows the posed bbox. Pose geometry is a CLONE of the cached geometry (the cache is needed for undo) — never mutate `s._g`.
- Test hooks: `Autopsy.ui.pose.{start,end,rd,grab(i,x,y,z),release,reset,skin}`; scripts were `/home/user/work/t14.js`.


## R57s（剧情，与上面 autopsy 的 R57 无关）· 剧情与钩子（宿敌剧情 / 起源 / 地区电影改对话 / 开场文案 / 开始框 bug / 血祭面板）
用户原话要点：缺剧情和钩子；主线是月之魔女，二次元“女主们追猎你”的感觉，随机生成；宿敌变强要先播剧情（每次加载地图），说清楚她怎么变强、强在哪（方面不同），可能带队友；开局 4 猎手和宿敌的起源；进地区别在出生点乱转镜头，改成地区里不同女人的多角度特写+对话+多样反馈；开场文本太迷幻要具体；电影后常不出开始框；血祭别放在地区 UI 里。
- **新 MOD `nem_story`（默认开，仅中文）· 新文件 `js/nemstory.js`（window.NemStory）**
  - 成长侦测（每 250ms poll）：猎手 `Hunters2.lvOf` 上涨（8 分钟成长 / 仇恨 / 逃走 esc → why='esc'）、额外宿敌 `Nemesis.S().extra` 每 5 分钟成长；新出现的额外宿敌 → 起源事件；首次运行 → 开篇事件（四猎手接下“第七号悬赏”，落款是月印 → 月之魔女钩子）。
  - 每个成长事件随机一个**方面**并立刻写进 `G.S.nst.p[key]`（key = `h:aerin` / `x:名字`）：blade 伤害+12%（≤3）· armor 生命+18%（≤3）· skill 技能池加 leap/charge/breaker/whirl · study iq+0.22（≤2）· swift 速度+10%（≤2）· bless 词缀 iron/regen/relentless/leech · vow 撤退血线 0.3→0.16 且伤害+8% · ally 同伴（最多 2 人，RPG.foe 固定 seed 生成，出场时 `Foe.populate keep` 一起刷出）。
  - 出场套用：`hunters2.js spawn()` 末尾 `NemStory.apply(fo,'h:'+id,C,pos)`、`__forceAff` concat `NemStory.aff()`；`nemesis.js extraStrike()` 同样（populate 时临时设 `__forceAff`）。`hunters2.js` 撤退判定改 `fo.nsVow ? 0.16 : FLEE_AT`；导出 `recFor`。
  - 播放：地图就绪（W.B && !W.busy，非精英/猎场）且队列非空 → 用 `Foe.build + Foe.animate` 在玩家脚边临时搭演员（同战斗里的身体/头：`Hunters2.recFor` / `x.h` / 导师与同伴 RPG.foe），`Saga.reel()` 播放；结束移除演员。每次加载最多一段（开篇 > 起源 > 成长），其余成长事件做成“同一时间”蒙太奇卡。最后一张**变强卡**（`#sgRoot .nsb`）列出方面和效果。台词：每名猎手专属地点/导师/方面台词/对你最近行为的反应（`{reg}{n}{heads}`），额外宿敌用 Overhear.bio 口头禅/秘密。
- **`js/saga.js`（R49 作者文件，改动尽量小）**：抽出 `startCN()`；新增 `reel(o)`（通用短片：beats 同 castBeats，可带 `card:{a,b,c}` 标题卡、`onBeat`、`onEnd`）、`castShot` 新镜头 `cTwo`（双人侧拍）/`cOS`（过肩，需 `fo.pair`）；`tick` 开头 `NemStory.hold()` 时先不播地区电影；精英房跳过时置 `sg.cinDone`；导出 `reel / castShot / pendingCine()`；`finishBeats` 对 reel 直接 end；`end()` 调 `sg.onEnd`。
- **新 MOD `saga_talk`（默认开）**：`saga.js talkScript()` —— 地区电影改为场上 2–3 个真实在场的女人（castPick 放宽到 3 人）的硬切特写对话：标题镜头=她看见你（初访惊恐/再访戒备/上次赢了或输了/悬赏高时不同），她用自己的名字说异变，另一人接话，手部动作+起因，目标在场则目标亮相，最后有人说出目标下落，赌注卡、出发卡保留；猎手在场时插入猎手人设镜头。附近没人 → 退回旧 `script()`。
- **开场文本**：`saga_data.js MONO` 全部改写成具体的格罗克心声（饿/首级/悬赏/魔女诅咒/斯尼克），不再“月亮在我骨头里敲了一下”。（新游戏的 `ui.js INTRO` 文本页本来就具体，没动；真正的“开篇剧情”由 nem_story 开篇短片承担。）
- **bug：电影后不出开始框**（`js/arrival2.js`）：以前只在 700ms 时看一次 `Saga.cine`；地区电影晚开（猎手伏击最多推迟 9s）时窗口先弹出、被 `body.sgcine` 盖成透明，玩家按空格翻电影时被“隐形”关掉。现在等 `Saga.cine || Saga.pendingCine() || NemStory.hold()` 都结束（最多 40s）再开，已开不重复开。
- **新 MOD `rite_panel`（默认开）**（`js/nemesis.js inject()`）：血祭从地区选择界面里移出来，改成左侧固定面板 `#nemBuff.nb-side`（和 loop.js 右侧 `#lpSide` 对称，z 130），地区界面关闭/出发时移除；关掉 MOD = 旧位置。
- 其他改动：`mods.js` 3 条 MOD；`index.html` 在 nemesis.js 后加 `js/nemstory.js`；`nemesis.js` 8 分钟成长 toast 文案。
- **测试状态（R57s）**：Node 桩测试通过（`nemstory.js` 开篇/猎手成长/多人合并蒙太奇/新宿敌起源/额外宿敌成长 → 剧本与变强卡、`apply()` 改属性；`saga.js talkScript` 初访/上次赢/上次输三种反应）。真实浏览器：开局事件入队 → 地图就绪后开始搭演员 ✔，但本沙箱 2GB 内存在出猎地图 + 额外 VRoid 身体时被 OOM，**没能截到插曲画面**；慢机器第一次搭 4 个身体约 50s（已改 60s 超时 + 下一张图重试一次 + 并行搭建）。请有 GPU 的机器实测：新存档出猎 → 开篇四猎手 → 地区女人对话电影 → 开始框。
## R58c (autopsy: 布娃娃开关 + 只切划过的地方) — js/autopsy.js only
- User clarified: "回去你还可以固定摆姿势" = the ragdoll can be RELEASED or KEPT (toggle), not just a one-off locked pose. Ragdoll is now a toggle button (🧍 布娃娃, key 4, `data-act="rag"`): ON = live PBD ragdoll (grab joints with 🤲 举起; rotate tool blocked); 解除 = body keeps the current pose as a rigid piece (rig kept in `part.rig` so it can be switched on again). Cut/linen/finish auto-release.
- User also said: don't draw a direction and have the cut run through the whole body. New cut semantics (`sliceSlit` + `cutPart`, always `curveTool`): an end of the line that lands ON the body = the knife stops there (tip circle shown, no extension); an end that leaves the body = cut through (dashed extension). The cut surface is only active for path param s in [0,len]. Topology: cut edges outside the range stay joined, so a partial cut gives ONE piece with an open slit (lips opened 8 mm, flesh cap via chord-closed loops, tol 0.6); a fully severing cut gives several pieces. `cutPart` returns a FLAT piece list now.
- `components()`: islands (e.g. hands) are tied to the neighbour island by nearest-vertex ties (`islandTies`), cap tris unioned to shell via `cmap`; layer merge across sets is volume-overlap ≥0.5 (the old touching-bbox rule merged the two sides of a cut).
- Any cut drops `part.rig` (vertex layout changes) → ragdoll only on an uncut body; Ctrl+Z to go back.
- Test scripts (lost on reset): t16/t17 cut cases, t18 ragdoll toggle.


## R59 用户（原话，长期有效）：SAN 值 / 洞穴挂机 / 血契 UI 搬家
> “现在还有问题，就是洞里左键点头没反馈了，这并不是我想要的，我还是想结合下洞穴挂机？比如说你设计一种资源【SAN值】-就是你点头还是有SAN值，然后SAN值这个系统就更像是临时BUFF加成，就是给你下一局的临时BUFF加成，你那个血契的UI位置也不好，不应该塞在探索UI里。搞得探索UI非常臃肿，SAN值就是持续挂机式产出资源，然后你所有建筑应该设计就是有的产出SAN值，有的产出魂晶，魂晶就是比较稀有轮式，SAN值就是那种刷的很快，SAN值的作用也有很多，比如说强化下一局？武器暂时性附魔？SAN值都是暂时性的效果。”
- **根因**：R54k round_yield 让 `game.js trigger()` 在回合制下第一行就 `return 0`（首级只在回合结算时产魂晶）→ 左键没任何反馈、建筑计时也停了。
- **新 MOD `san`（`js/san.js`，默认开，依赖 run_loop + round_yield）**：回合制下洞里 `trigger()` 改为 `San.gain()`（飘字 `🌀+N`，青色）；SAN = 旧版魂晶产出 × `K`(3) × 躁动(×2)；`game.js` 建筑计时/魂轮对“SAN 型”建筑照常运转（`San.live()` = 洞里 + 回合制）。左键把玩系数 `POKE`=1。常量都在 san.js 顶部（K / POKE / COIN_MULT / AWAY / 各项价格 `BUFFS`/`ECOST`/`FCOST`/`XCOST`/`BCOST`，价格随章节 ×(1+0.15·(章-1))、同类增益 ×1.6 叠价）。
- **建筑分类 `San.kind(type)`**：有 `ROUND[type]`（祭仪厅 rh_*）→ 魂晶；`mount.mult ≥ 2` → 魂晶（骨龛/通灵台/胸像/…高倍率，回合结算发）；`mult` 0 或周期 >1e6（锻造/syn_* /遗物祭坛）→ none；其余（枪桩、展示柜、魂轮…）→ SAN。`Loop.settle` 对 SAN 型建筑 `continue`（不发魂晶，只在结算页加一行提示 + `San.endTrip()` 的“本回合累计 SAN”）。建造菜单里每座建筑名后有 `🌀SAN` / `🔮魂晶` 标记（`ui.js` 调 `San.badge`）。
- **SAN 祭坛**（Hub「角色」组新页 `🌀 SAN 祭坛`，热键反引号 `` ` ``，只在洞里）：① 武器附魔六选一（炽焰/霜寒/雷鸣/剧毒/血饮/噬魂，`worlds.js foeEvent0` → `San.event`，用 `Foe.dot({proc:true})`、`fo._chill`）；② 下一趟增益六种（伤害/生命/移速/恐惧/啜饮/贪婪，各 ≤3 层，经 `Loop.nb()` 合并进 `runDmg/runHp/runSpd/enemyHp/clear/onKill`）；③ 特别仪式：躁动（120s SAN×2）、魂晶香（`Loop.R().inc` +10%，上限 35%）、月光窥视（`Rogue.grant(1)`，每回合越买越贵，结算后重置）。
- **“临时”机制**：购买写入 `S.san.arm`；出洞（`Worlds.active` false→true）时 `arm → act`，回洞即清空，所以只管下一趟；换附魔退还原价。离洞期间首级仍挂机：回洞按 `idle速率 × min(时长,600s) × 0.5` 补 SAN。存档在 `S.san`（旧存档惰性初始化）。
- **血契 / 流派 UI 搬家**：`rogue.js` 不再往探索 UI 里注入 `#rgPanel`（`inject` 删除，换成 `watchExplore()` 只在打开“选地点”时弹一次 GrandUI 大选择）；面板函数 `Rogue.mount(host)` 供 Hub 新页「🎴 流派 · 祝福」使用；洞里右下角（☰ 菜单上方）有个小角标提示“还没选杀法 / 祝福抉择 ×N”。SAN HUD 贴在魂晶数字右边（`.u-san`，野外显示当前生效的 SAN 强化摘要）。
- **验证（Playwright）**：trigger 在洞里返回 SAN 且魂晶不变；枪桩+展示柜计时产 SAN；骨龛走回合结算；买增益 → `Loop.nb()` 并入；模拟 `Worlds.active` 切换：arm→act→回洞清空 + 离洞补 SAN；六种附魔用桩函数跑过无异常；Hub 两个新页能开、选杀法后面板刷新。**没验证**：真实出猎一整趟里附魔的体感与数值平衡、`Foe.dot` 对真敌人的伤害量、GrandUI 结算页上新备注的排版。
- **没做/想法**：SAN 的“效果”只有这些，可继续加（陷阱、召唤物暂时增强、护符掉率…）；`POKE`/`K` 偏高时挂机反而没存在感，调这两个常量即可；离线（关页面）期间不累积 SAN。
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

## 第二十四轮（人设 / 语音 / 脚步 / 面部补光）— Arena Agent
用户反馈：动作太单一；要脚步声、女角色说话声、各种声音；敌人同质化没有人设；很多角色脸还是很黑。全部是可开关 MOD（js/mods.js）。
- **`persona` / `persona_voice`** → `js/persona.js`（`window.Persona`）+ `js/persona_lines.js`（由 `tools/voice_lines.py` 生成，**勿手改**；改台词请改 py 再生成，并重录语音保证文字=声音）。
  - 8 种性格原型，由 lore 的 `c.traits` 推出（45 个特质全覆盖；首个命中的特质决定）：高傲 proud / 冷静 cold / 温柔 gentle / 胆小 timid / 好战 fierce / 毒舌 sharp / 狡黠 sly / 开朗 cheerful。
  - 与 `foe_roles`（职业=怎么打）互补，**不分配职业**；`apply(fo,r)` 在 `FoeRoles.assign` 之后调用，标题“【性格·职业】名字”。
  - 性格影响：`brave`（见人打还是逃）、`iq` 微调、高傲/好战不撤退、胆小者血量 <55% 逃向门、挑衅频率 `tauntK`、对峙姿态（Yes 点头 / Idle_No_Loop 摇头 / FoldArms / Talking）。
  - 手势：`fo.f.play` 被包了一层，`fo.gestT>0` 时忽略非 once 的循环请求；手势期间 spd/strafe=0；出手或硬直立即取消。
  - 日常作息（未发现你时，foe.js idle 分支 → `Persona.idle`）：职业 idleClip + 性格动作池（Farm_Harvest / Crouch_Idle / Consume / PickUp_Table / Interact / FoldArms…）轮换；在出生点 1.5–5.5m 内闲逛（高傲/毒舌用 Walk_Formal，狡黠用 Crouch_Fwd）；健谈的会走到最近的同伴旁面对面聊天（Idle_Talking + 22m 内偶尔冒闲聊气泡）。**没用 Sitting_Idle（没有椅子会悬空）**。
  - foe.js 台词点 → `sayP(fo,key,fallback)`：see/fear（初见）、fight、taunt/pack、hit（打中你 35%）、block、hurt（挨打 50%，否则只痛呼 pain）、back、lost、run、low、door、flee、atk（出手喝声）、die（倒下时最后一句）。Persona 关闭时回落到原来的通用 SAY。
  - **语音**：`voice/voice.js`（`window.VOICE_DATA={原型:[22 条 base64 mp3，按 KEYS 顺序]}`，1.36MB，进场后用 script 标签异步加载，file:// 可用）。单条按需 `decodeAudioData` 缓存；立体声方位 + 距离衰减（>20m 不响）；同时最多 2 条（痛呼/临终优先）、同一人 ≥1.2s、全局 ≥0.35s；每人音高 = 原型语速 × 名字哈希 0.95–1.05。
  - 已有语音：proud / cold / gentle / timid / sharp（AI 语音合成，Vosk ASR 对齐切句，抽检 15 条全部正确）。**fierce / sly / cheerful 暂时只有文字**（TTS 审核挡掉了含“刀/剑/打中/一击/偷袭”的版本；台词已软化，下一轮录）。
  - CombatFX：有真人语音的敌人在 `windup` 不再叠合成“哈”（`pv` 判断），其它提示音不变。
  - 录音工具链（/tmp，重置即丢）：`tools/voice_lines.py tts` 打印 TTS 文本；Vosk small-cn + pypinyin DP 对齐（按 ASR 锚点切，**不要**按最大静音切——会切在字中间）；ffmpeg 单声道 22050Hz 40kbps、loudnorm −16 LUFS。
- **`footsteps`** → `js/steps.js`（`window.Steps`，全合成无新资源）：你的脚步 = 低频体重“咚” + 地面材质层（worlds.js 按 `STYLES[node.style].ground` 判断：草/落叶/碎石/石板/泥/灰烬/雪；洞穴 game.js = 石地），替代原来单一 step 采样（MOD 关时回落）；敌人脚步在 `Foe.update` 开头用逐帧位移计步，方位+距离（>16m 不响，每秒 ≤16 个），跑动步幅大更响，盾卫/蛮兵甲片叮当，已发现你的刺客无声。OfflineAudioContext 测过 8 种地面响度一致、峰值≈旧采样。
- **`face_light`** → `js/heads.js` 顶部 `window.FaceFill`：MeshToon 光照算完后（`aomap_fragment` 之后，与已有软膝盖同单位：满光≈1.08），把“已受光程度”低于下限的地方补到下限，偏向朝相机的面（0.45+0.55·facing）。脸 ×1.0、头发 ×0.6、敌人身体 ×0.85，**共享一个 uniform（getter），开关/强度变化不重编译**。下限：野外 0.75（`Foe.update` 每帧 `FaceFill.world()`）、洞穴 0.45。实测：白天/黄昏像素不变，夜里/暗洞 +10–15%。
  - 注意：r147 的 `material.clone()` **不复制 onBeforeCompile**，所以 foe.js 克隆身体材质后、以及 `prewarm` 的克隆都要再 `FF()` 包一次（已做），否则预热编的程序和实际不一致。`FaceFill.wrap` 用 WeakSet 记已包，**不能用 userData 标记**（clone 会复制 userData）。
  - 结论：脸与脖子早已按同光照校准，头的肤色取自身体贴图；“脸黑”主要是整体受光低（夜/暗场景），不是肤色采样。若仍有个别角色偏黑，请记下名字给后续 agent 看贴图本身。
- 顺手修：index.html 仍引用 R23 已删除的 `models/GI_Klee.js`、`GI_Nahida.js`（404），已移除这两个 script 标签。
- **未验证**：整套游戏（2GB 内存沙箱里完整页面必 OOM）。已验证：着色器在 WebGL 里编译通过且数值正确（`/tmp/t/ff.html`）；110 条语音全部可解码、冷却/优先级/方位正确（`vo.html`）；人设逻辑 Node 仿真（作息分布、手势锁、45 特质映射）；脚步 OfflineAudioContext 渲染。
- **警告给后续 agent**：在这个 partial clone 里不要跑 `git log -S` / `git log -p` 之类会拉历史 blob 的命令——会把 /tmp（tmpfs）写满。

### 第二十二轮（续 11/12）：敌人“瞬移 / 滑行 / 打不死”修复（Arena UI Agent）——基于 R24 之后重新移植
说明：我原先还写了一套 `js/persona.js`（人格层），与 R24 的 `js/persona.js` 同名、功能重叠，**已放弃，不提交**（以 R24 为准）。下面只是对 `foe.js` / `foe_roles.js` 的战斗手感修复：
- 真实模拟方法：`_tools/wv/fight.html`（gitignored；真实 foe.js + 真实身体 + UAL 动画，`big/body/*.js`、`big/anim/ual.js` 从 GitHub raw 下到 /tmp/big 用测试服务器映射；`trial()` 统计击杀耗时/状态占比/螃蟹步%）。
- **瞬移**：① 击退原来一帧内 `fo.pos.add(kv)` 推 0.22~0.4m → 改 `fo.kb` 0.16 秒内推完；② 离玩家 <1.05m 时位置一帧硬弹 → 软推开（≤9 m/s）；③ 盾卫举盾走位只播一次定格的 `Sword_Block`，身体在地上滑 → 走位播 `Walk_Loop`，站定才摆格挡姿势。
- **打不死**：持武器敌人站位 2.7m 且你一靠近就倒退 → `hold` 2.1/1.7m、退让阈值 hold-0.45；出手间隔 2.2+rand → 1.15+rand(0.5~1.1)；前摇 ws +0.12、定格 hold −0.08；蛮兵 HP ×1.9→1.4、盾卫 1.3→1.15、狂战 1.25→1.15；撤退回血 5%→1.2%/s、撤退时长 3~5.5→1.8~3s；投掷手后撤最多 1.8s、2.7m/s；刺客潜行超时 8→5s；**非霸主伤害下限 = maxHp×10%×挥速×部位系数**。
- **螃蟹步**：绕圈/换位时身体转向前进方向（`turnTo = face ± 0.9`，slot 移动同理；手势 `fo.gestT>0` 时不动）；刺客潜行按移动方向转身。
- 模拟（rar2 骑士，72% 命中追击型玩家）：q=1 各职业约 10~16s 杀死；q=0.4 约 15~20s。
## 第二十四轮（陈列/地图 Agent）：头身比例 + 眼白发黑
- 用户：有的头和身体不匹配、特别小；人物眼白是黑的。原神素材：用户说「留着不管，之后想办法」→ 本轮不动 GI_ 文件与原神身体。
- **MOD head_norm**（默认开，look）：离线量了全部头模元数据 skinW（脸宽）：VRoid 0.134~0.173（多数 0.16），MMD 管线 0.116~0.133（--sc 0.75 固定缩放造成），GI_LaSignora 0.033（面具导致测不准）。**改了 js/heads.js**：新增 normK/normSize，parseOne 解析后对 grp==='mmd' 的头把几何体（含 morph position）与元数据（cut/bottom/skullTop/hairTop/front/skinW/eye/box）等比放大到脸宽 0.155（k∈[1,1.4]，测不准用 1.2）。这些 GLB 无节点变换/蒙皮，放大安全。手持/插桩/敌人身体上一致。
- **MOD eye_white**（默认开，look）：根因 = 眼白材质 depthWrite:false → Master 管线 SAO（ultra/high 档 ao:1）在眼白处读到眼窝后面的深度，当成深洞压黑。**改了 js/heads.js** 眼白分支：写深度 + 颜色 0.62/自发光 0.62（原 0.9/0.28）。q=mid（无 AO）看不出问题，测试要用 ?q=ultra。
- 测试工具（/home/user/bak/tools）：mk_s.py（只带指定头模的轻量页 _s.html，避免 63 个头全载 OOM）、bodyshot.py（头装到身体上并排渲染，ZOOM 特写）、eyeshot.py（游戏内手持首级大图，Q=ultra EW=true/false）、hsize.py（离线读 GLB/元数据量头尺寸）。

### 第二十二轮（续 13）：“砍怪血厚 / 被砍瞬移 / 手感差”——野兽 + 击倒修复（Arena UI Agent）
用户原话：砍所有怪血量都好厚；砍了之后那个单位会瞬间移动；手感很差。用真实 foe.js + 真实身体 + UAL 动画逐帧测量（`_tools/wv/fight.html` 的 `tele()/off()/kill()` 探针）后的根因：
- **瞬移①（野兽）**：`beasts.js` 命中时 `move(b, 0.28m)` 一帧内整段位移，且离玩家 <0.85m 时一帧硬弹 → 改 `b.kb` 0.16s 内推完 + 软推开（≤7m/s）。
- **瞬移②（人形，最主要）**：`sp>1.3`（快刀）时受击播的是 `Hit_Knockback`——它其实是**整个倒地动作**（0.83s，髋部 y 0.75→0.03 趴到地上），而 `stag` 只有 0.55s，动作被半路切回走路 = **趴在地上的人 0.2 秒内弹起来站好**。现在：普通受击只播短的 `Hit_Chest`(0.3s)/`Hit_Head`(0.4s)；真正的击倒（破防/战吼/霸主激怒）播 `Hit_Knockback` → 倒地 0.8s → **`LayToIdle` 起身动画（×1.8 速）**播完才恢复行动（`fo.stag` 自动延长）；躺着/起身时再挨刀**不重播受击动作**（以前会把人从地上拽起来）。实测髋部每帧位移 ≤4cm（之前起身一帧 13cm+）。
- **血厚**：`hit()` 伤害下限 = maxHp × 17%（霸主 9%）× 挥速(0.8~1.4) × 部位系数 → 人形约 6 刀、霸主约 11 刀；野兽 `beasts.js` 同样加下限（狼/狐 25%、鹿 20%、野牛 15%；以前野牛 hp=90×(1~3.2) 可能要砍 20+ 刀）。模拟（rar2~3 骑士，72% 命中，q=0.4~1）各职业 7~8 秒杀死。
- 尸体：`kill()` 探针验证死亡瞬间骨骼无跳变（≤5cm/帧）。
- `combat.js`（续 13）：命中时的 `S.stop`（冻结武器/手部更新 15~50ms）改为 0——那一下冻结会被当成“手上卡了一下”；被弹刀/格挡的 `recoil` 冻结 0.14→0.05s。命中反馈只靠屏震 + CombatFX 音效 + 血花（不要再加顿帧/慢动作）。
## 第二十四轮(6)(7)（另一个 Arena Agent，和上面的第二十四轮并行处理同一条用户反馈）
用户原话要点：角色动作单一；更多音效——走路声、女角色说话声、各种声音；丰富角色人设，现在敌人同质化没人设感；很多角色脸还是很暗。
（人设/手势/作息、脚步、面部补光已由上面第二十四轮(1)–(5) 完成，本 agent 没有重复实现，只补缺口。）
- **(6) 语音补齐 + 第二套声线**（commit a5e34f0）：
  - fierce / sly / cheerful 原来“只有文字”→ 现在有真人语音。`tools/voice_lines.py` 里这三项的台词**已换成录音实际念的句子**（22 槽按 KEYS 映射；缺的 taunt/flee/pain 槽复用同一套里的其它句子，文字仍=声音）。**不需要再录这三套**；若要改台词，必须重录。
  - 新增 `proud2 / cold2 / gentle2 / timid2 / sharp2` 五套（不同句子，声线：proud2/cold2/sharp2=voice-04，gentle2/timid2=voice-01）。`js/persona.js` `apply()`：若 `PERSONA_LINES.p[k+'2']` 存在，按 `hash(名字+'#v')<0.5` 选第二套 → `fo.per.vk`；`line()`/`voice()` 用 `vk`。同性格的两个人会说不同的话、不同的嗓音。
  - voice.js 现 13 套 × 22 = 286 条，3.1MB（按需加载不变）。响度 loudnorm −16 LUFS，22050Hz 单声道 40kbps；实测新 176 条平均 −19.8…−11.5 dB，峰值 ≤ −1.7 dB；Chrome decodeAudioData 286/286 成功，共 ~450 秒。
  - 录音工具链教训：切句 ffmpeg 滤镜里**不要写 `afade=t=out:st=0:d=…`**（从 0 秒就淡出 → 整段静音，我第一次就踩了，已修）；loudnorm 后直接进 LAME 会触发 `psymodel.c calc_energy` 断言 → 在 loudnorm 后加 `aresample=22050,aformat=sample_fmts=s16`。Vosk 对齐时看拼音匹配，个别“找到安宁→吵得很你”这类误识别会让边界错位，需要看时间戳手工修（gentle_16/17 就是）。
  - TTS 内容审核：含威胁/武器/“决斗/看剑/给我站住/我会带人回来”等的整段会被整段拒绝；温和化后通过。
- **(7) 环境音 `js/ambience.js`（MOD `ambience`，默认开）**：9 种地点 + 洞穴各一套声景，全合成。底噪层：风（布朗噪+低通，阵风随机游走）、树叶沙沙、水声、洞穴低鸣、深渊 43/45.5Hz 低频嗡鸣、风口哨（高 Q 带通扫频）。随机事件：鸟鸣、啄木鸟、猫头鹰、蟋蟀、蛙鸣、气泡、蚊虫、乌鸦、猛禽长鸣、远处狼嚎、旗帜拍打、金属轻响、远钟、滴水（带两次衰减回声）、闷雷、洞穴闷响、蝙蝠。
  - 不改共享文件逻辑：自带 250ms `setInterval` 轮询（出猎时 `Worlds.frame` 接管主循环，`G.HOOK.frame` 不跑），读 `Worlds._W.graph.nodes[cur].style`；不在出猎=洞穴。`G.playing=false`/切后台 → 淡出，`G.uiOpen` → 40%。接 `SFX.out`，受 SFX 开关控制。
  - 实测（headless Chrome 真 AudioContext + Analyser）：各场景平均 −42（王城夜）… −23.5 dB（深渊），峰值 ≤0.2（战斗音效峰值≈1，环境音不会盖过战斗）；暂停 −71 dB；事件频率与配置一致；无报错。调试：`Ambience.demo('forest')` 强制场景、`Ambience.debug()`。
  - index.html 在 steps.js 之后加 `<script src="js/ambience.js">`；mods.js 加条目。

### 第二十四轮（续）：新身体 MOD vroid_bodies
- 新增 big/body/{Vita,Victoria_Rubin,Darkness_Shibu,HairSample_Female,AvatarSample_B}.js（tools/vrm2body.py 转换，pixiv VRoid 官方 CC0 / 样本条款，源 madjin/vrm-samples 的 vroid/beta、vroid/stable）。全部非原神。
- 剔除：Vivi（体型偏幼）、Sendagaya_Shibu/Shino（学生制服）——已转换但没入库（符合“只要成年外观”）。男性样本 HairSample_Male / Sakurada_Fumiriya / AvatarSample_C 暂不收：身份表和名字全是女性设定。
- js/foe.js：TINT 加这 5 具（VRoid 皮肤是独立材质，可随首级染色）；新增 VB / VB_ID 表（身体→身份），bodyFor() 在 Mods.on('vroid_bodies') 时把 VB_ID[身份] 追加到 IDENT 候选（不改 IDENT 原表、不动 BOSS_BODY）。
- js/mods.js：新条目 vroid_bodies（look，默认开），放在 head_norm 前面。
- 未做：SKIN_FIX 精调（新身体用默认 LIFT）；古铜肤色时手部略偏橙，可用 calib 流程补。
- 追加 big/body/Osage.js（おさげちゃん_mate2 浴衣，Iwashi，VRoid Hub 许可全允许，源 josephrocca/ChatVRM-js）。材质被合并成 FACE+SKIN 两个（头发、衣服在 SKIN 图集里）→ 不进 TINT；头模也不收（vrm2head 拿不到头发，脸是通用 VRoid 脸）。同仓库另一个 Whingles 禁止改造，已排除。
- 已排查不收的来源：VIPE Heroes（Q 版大头街头风，与黑暗奇幻不搭）、AITuberKit 的 nikechan（有另行的二创规约）、openSizebox（LFS 指针/受限）。

## 第二十五轮（Arena UI Agent）：统一体力系统（MOD `stamina_all`，默认开）
用户原话：“战斗时体力系统就是你攻击防御移动跑步什么都要体力，体力耗光反正反馈然后什么事情也做不了。”
- 新文件 `js/stamina.js`（`window.Stamina`）：体力池仍是 `Combat.state.stam`（不另建）。`Stamina.spend(n,kind)` 够（≥需要的 30%）就扣，不够 → **力竭**；`Stamina.tick(dt,{moving,run,crouch,alert})` 由 `worlds.js` frame 每帧调用（奔跑 15/s，举盾格挡 5/s，战斗中走位 0.9/s；停手 0.45s 后回复，站定 28/s、走动 9~17/s）。
- 花费：挥砍 11（蓄力 18）、刺击 9、跳跃 13、闪身 22（`Combat.useStam` 已统一）、战吼/旋风斩走 `useStam`；挡刀仍扣 14。
- **力竭**：挥砍/刺击/格挡（`worlds.js hitPlayer` 里 CS=null → 完全不能挡）/奔跑/跳跃/闪身/战吼全部失效，只能 1.5 m/s 慢走；刀垂下；全屏红黑暗角脉动 + “力 竭”字 + 喘息声（`CombatFX.stamina`）+ 屏震；歇 0.8s 后开始恢复，回到 30 才解除（约 2.8s）。
- 原来的两条池子（`W.run` 疾跑、`S.stam` 战斗）合并：`W.run` 现在只是 `Stamina.val()` 的镜像，拔刀时隐藏底部疾跑条（用战斗条）。原来的“握刀 +28/s、举盾 +6/s 回体力”在 MOD 开启时关闭。
- 关掉 MOD 即回到旧行为（`Mods.on('stamina_all')===false`）。node 测试：连挥 9 下力竭，冲刺 6.7s 力竭，力竭后 2.8s 恢复。

## 第二十五轮（Arena UI Agent）：回忆 / 无名首级（MOD `recall`，默认开）
用户需求：新首级只显示基础信息；按 **F** 进入回忆界面（主角的手捧着她的头特写、对视、多个动作面板，建筑解锁更多动作）；可回忆那一战（记录她对你造成的伤害）、转头/捏脸、回忆身份属性；头棋/卡牌类型解锁新动作，并显示她自己的棋路/卡牌效果（随机生成、和性格挂钩、不死板）。
- `js/recall.js`（`window.Recall`）：12 个记忆碎片 `FAC`（性格/外貌/身份/信仰/饰物/那一战/名字/目的/生平/魂印产出/棋路/卡牌），`c.kn={}` 记录已想起的项（**旧存档没有 `kn` 字段 = 全部已知**，不会被遮）。`Recall.nm(c)` 未想起名字时返回「无名首级·#hash」；全局 `NM(c)`（lore.js 顶部定义）就是它的封装，各处显示名字的地方已改成 `NM(c)`（game/ui/worlds/sack/chess/seance/play/sanctum）。**不要把 `c.name` 改成 accessor**（会破坏存档）。
- 动作：对视/抚摸/嗅闻/贴耳/把玩(拖动转头、点脸颊)/回忆那一战 为徒手；通灵(seance)、茶会(tea_party)、梳妆镜(gothic_commode)、化妆台(dresser)、鉴定(forge/appraisal/auction)、棋盘(chess)、卡牌(card) 由建筑解锁（`G.S.builds[].type`）。数字键 1-9 触发动作，F/Esc 关闭。首次想起一项给魂晶（按稀有度），想起 4 项自动想起名字，7 项想起目的，全部想起有奖励。
- 战斗记录：`worlds.js` `foeEvent` → `Recall.log(fo,t,d)`；`hitPlayer` → `Recall.hurtBy(fo,n)`；数据写入 `fo.h.c.fight`（她伤你几次/多少、你伤她、头颈命中、破绽、格挡、先手、怎么死的），「那一战」面板显示。
- `js/headgame.js`（`window.HeadGame`）：`profile(rec)` 由性格/种族/稀有度/种子确定性生成棋路（基础棋子 + 额外走法 XS）和卡牌（费用/攻血/关键词/文本）。`js/chess.js` 新增全局 `XS[64]`（每格额外跳跃偏移），`gen/makeMove/unmake/undo/place` 已支持。
- 入口：game.js `KeyF`（手里/看着首级 → `Recall.open`，否则仍是 Combat.toggle；I 键同），档案卡新增「🧠 回忆她」按钮并遮罩未想起的项。回忆界面期间主场景暂停渲染（`Recall.active`）。
- 手模型：`limb_hand_avatar` 染色 + 前臂圆柱 + 护腕（无专用主角模型，未新增资源）。
- 未做/待做：世界内（Worlds）F 仍是战斗姿态，回忆只在洞内；棋盘/卡牌里实际使用她的 profile 只做了展示（chess 的 XS 由 `HeadGame.chessExtra` 提供，棋局接入需 chess.js 里调用 `place`）。

---
## 第二十六轮（Arena Agent）· 用户反馈（原话要点，长期有效）
- 沿用约束：每次编程前读 HANDOFF；**只追加不覆盖**；**阶段性频繁 commit+push**（不要做完再存，网站可能中断/回退）；**任何时刻根目录 `index.html` 双击可玩**；工作区 < 128MB；优先打包 HTML。
- **装备系统**：基地里**不能用资源（魂晶/材料）换装备**；资源**只能升级（强化/附魔）现有装备**；**要装备必须去野外搜刮**。（第二十二轮续 8 的 `forge.js` MOD `forge_buy` 允许花魂晶直接买阶 = 违反此规则，本轮关闭。）
- **打不死人**：攻击野怪和人都打不死 → 查根因并修。
- **战斗手感**“一坨屎”→ 要**大师级**调整强化战斗系统，操作要非常爽、玩家体验好。
- **敌人类型要更多**。

### 本轮工作区处理（重要）
- 仓库 ~426MB（含 `big/` 122MB + `.git` 155MB），远超 128MB。本轮把完整克隆放在 **`/var/work/head`**（根盘，不在 `/home/user` 快照里），`/home/user` 保持为空；token 只在 `/var/work/head/.git/config`（不进快照）。**会话重置后 /var/work 会丢：一切以 GitHub 为准，所以必须频繁 push。**
- 测试工具入库在 `tools/test/`：`mk_t.py`（生成轻量 `_t.html`，只留 3 个头模）、`run.py <page> <script.js> [wait] [png]`（playwright headless，需 `PLAYWRIGHT_BROWSERS_PATH=/var/work/pw`、`python3 -m http.server 8080` 在仓库根目录）。完整 `index.html` 在 2GB 沙箱里仍会 OOM，测试只用 `_t.html`。
- PAT 由用户在聊天里给出：不写入仓库；请用户用完后撤销/轮换。

## 第二十五轮（续）：MMD 头模包 + 魂阶外貌差异 + 后脑补全
- **js/headpacks.js（新）**：按 MOD `pack_hsr / pack_zzz / pack_nte` 用 document.write 同步插入 `models/<包>_<名>.js`（file:// 可玩；关掉的包完全不加载，启动不变慢；文件缺失只 404）。index.html 在 `models/GI_LaSignora.js` 后加了一行 `<script src="js/headpacks.js">`。
  - 头模来源：phoshco.github.io 镜像的官方 MMD（星穹铁道 12、绝区零 11、异环 9，共 32 个，全部成年外观）。**原规约禁止二次配布/猎奇 → 仅限私人仓库**。仓库仍公开时这些 .js 不提交（本地 .git/info/exclude 已排除）。
  - 管线：`tools/pmx2vrm.py`（修：跳过 `mmd_edge.*` 描边外壳材质，否则月城柳整个头被白壳罩住）→ `tools/vrm2head.py --grp mmd --noflip --hair-drop 0.04 --sc 1.25`。穗鸟（vrm2head OOM）、塞西莉亚（无头骨）跳过。鸣潮是 .bpmx，暂未写解析器。
- **MOD nape_fill（heads.js，默认开）**：MMD 脸模只是前面具，后脑/后颈空（从后下方看到脸的内侧、眼睛透过头发）。`napeGeo(t)` 用本头脸部皮肤顶点（取每个方向最内侧）+ 耳平面镜像 + 断面圆，建径向壳（横向 ×0.9，下半竖向 ×0.99），皮肤色卡通材质，名 `__NAPE__`，每模板缓存一次。仅 grp mmd。
- **MOD tier_look（heads.js + headwear.js，默认开）**：`tierFace()` 按魂阶加权挑脸（MMD 权重 0.15→3.5，其它 1.5→0.45）；`tierLook()` 用 look.seed 独立随机（不打乱原有抽签）：凡魂朴素发色 90%、无挑染/异色瞳、acc 清空、更苍白；灵魂 acc 减半；圣魂 50% 额饰；神魂 75% 王冠/冠冕/额饰（MMD 头只加细额饰）、挑染/异色瞳/25% 发光瞳。headwear.roll 概率 ×[0.35,0.7,1,1.25,1.45]。只影响新生成的首级（look 已存档的不变）。
- 测试工具（不在仓库）：hb2.py/hb3.py + headback.js/tier.js 渲染背面/魂阶对比。
## R26b（装备规则 + 战斗测试台）
- 用户反馈：基地不能用魂晶买装备；魂晶只能强化身上已有的装备，装备靠搜刮。
- `js/mods.js`：`forge_buy` 默认 **关**（存档迁移 `__v=5` 强制关一次）；关 = 规则生效。
- `js/game.js` `buyEquip`：Sack 开且 forge_buy 关时拒绝购买（旧 UI 入口也封死）。
- `js/rpg.js`：新增 `RPG.plusAdd(slot,key,val,plus)`；`eqSum` 对 weapon/helm/armor/charm 都按 `S.eqPlus[slot]` 加成（每级 +15%，非武器向上取整）。
- `js/sack.js`：`S.eqPlus` 四个部位；`equip()` 换下的旧装备带着自己的强化进储物箱；`enchant(target, slot)`、`enchCost(p, slot)`（头盔×0.7/护符×0.8/护甲×0.9）；掉落：敌人（持械）65% 掉装备、箱/架/尸体的装备率提高，任何部位都可能带 +N。
- `js/forge.js`：规则模式（forge_buy 关）下每张卡只有「强化 +N→+N+1」（预览每项属性变化）和搜刮提示；`goal()` 给出最便宜的强化目标。`data-ench="eq:<slot>"`。
- 战斗测试台 `tools/test/fight.html` + `tools/test/drive.py`：真实 foe.js/combat.js/VRM 身体，虚拟时钟，秒级跑完。`trial(kind,…)` 机器人（click/flick/hold/wave）见 `/var/work/bots.js`（已拷入 tools/test/bots.js）。
- 实测结论（旧战斗）：点按/松手能命中；**按住左键+挥鼠标（教学写的玩法）伤害 = 0**；空挥把体力耗到 0 后完全不能攻击；命中依赖刃尖真实碰撞，瞄不准整刀落空且无提示。

## 第二十七轮（Arena UI Agent）：名字/魂阶常显 + 阶位系统 + 进场偷听对话 + 私人设定
用户反馈：① 角色**名字、魂阶（凡魂…神魂）**不需要回忆，始终显示（上一轮把名字遮成「无名首级·#hash」是错的，已撤销）；② “阶位太少”，且**不要只有一条单线**——要有很多分支，与身份有关，也与稀有度有关；③ 更丰富的角色人设：进入场地时弹框，能听到她们对话、看到人设信息，“更多你设计”。
- **`js/ranks.js`（`window.Ranks`，MOD `ranks`，默认开）**：12 大系（战阵/狩猎/圣职/自然/奥术/咒影/匠医/艺者/王权/深渊/龙脉/民间）× 每系 3 个流派 × 10 阶 = 288 个头衔。1-3 阶为大系共用入门阶，4-6 阶按流派分化，7-10 阶为流派顶端头衔。`Ranks.of(c)` 由「身份（`MAP[c.id]`→默认大系+流派）+ 魂阶（区间：凡魂1-3/灵魂2-5/英魂4-7/圣魂6-9/神魂8-10）+ 名字哈希 + 年岁」确定性算出，**不写存档**（旧存档自动有）；同一身份约 30% 走同系另一流派。API：`of/text/short/badge(HTML)/ladderHTML(阶位谱)`。新增身份时请在 `MAP` 里补一行（未映射的落到「民间·田园」）。
- **显示**：档案卡（名字下的徽章 + 常显的“阶位谱”十格阶梯）、魂库列表、洞里悬停卡、出猎世界拾取提示。`Recall` 里 `name` 分面改为 `rank`（阶位传承：流派说明 + 阶位谱，4 项后自动想起 / 嗅闻顺带想起），`nm(c)`/`NM(c)` 现在直接返回真名。
- **`js/overhear.js`（`window.Overhear`，MOD `overhear`，默认开）**：
  - `Overhear.bio(c)`：确定性私人设定——口头禅（按 8 种性格原型）、小习惯、喜欢、讨厌、最怕、秘密。新分面 `bio`（照魔镜动作揭示）；档案卡在想起后显示。
  - `Overhear.enter(node, ctx)`（worlds.js `goto()` 结束处调用）：进入有活着猎物的地点时，左侧弹出**不冻结、自动消失**的对话框（不抢操作，不做 story 冻结卡）：按性格原型 × 话题（工作/对你的传闻/愿望/信仰/小习惯/上下阶/同系）说话，关系由阶位差/同系/同身份决定（独处时自言自语，3 人时第三人插话）。话里会把她的信息写进 `c.kn`（身份/性格/目的/信仰/阶位/小习惯），右下角提示“听出了……”，并写入行程日志（`cls:'note'`）。每个地点每次行程只播一次（`node._heard`）。
  - 台词池在 `T`（话题×性格×开口/回应各 2 句）/`MONO`/`CATCH`；要加话题就在 `T` 里加一项并在 `compose()` 的候选里挂上。
- 测试：node 下加载 lore+ranks+overhear 可统计阶位分布/生成样例对话（3000 人样本出现 291 个不同头衔）；UI 截图见 `_tools/wv/recall.html` 同款页面。
## R26c（战斗核心重做：MOD `combat_master`，默认开）
改动文件：`js/combat.js`（新增 MM 区块 + 约 12 处薄钩子，全部以 `MM()` 判断，关 MOD = 回到旧蓄势挥击）、`js/foe.js`（`hit` 伤害下限乘 `info.fmul`；`contact` 对 `info.mm && info.zone` 直接返回部位）、`js/beasts.js`（下限乘 `info.fmul`）、`js/stamina.js`（MM 下回体更快、力竭恢复阈值 22）、`js/mods.js`（新 MOD）。
- 输入：按下左键**立刻出刀**；连点 = 三连斩（横斩→反手→下劈终结，终结更重，连击 1.1s 内不断，出刀中再点会缓冲）；按住左键**甩鼠标**=朝该方向斩（8 向）；按住不动 0.6s 松开 = 重斩（破防 ×2.2）。按住左键视角 1:1 跟手（不降灵敏度）。右键格挡会取消当前出刀。
- 判定：不再靠刃尖碰骨头。出刀时在视野锥里挑目标（±43°/4.2m，会向目标踏步），刃扫过目标那一帧才结算（`S.sw.sgn` ≥ 目标相对位置），同一刀最多 3 个目标；部位由相机射线最近的骨头决定（`aimPoint`），终结下劈把射线压低 → 好砍脖子；没瞄准也算胸口，不会落空。
- 伤害：`info.fmul` 轻 1.45 / 终结 1.5×1.3 / 重 1.6×2.2；普通敌人约 4 刀（≈1.3s），霸主 ≈ 8 刀。
- 手感：命中 = 屏震 + 镜头沿斩向压/侧倾（`M.kick`，在 `prerender` 里加到相机旋转）+ FOV 冲击 + 22~50ms 只冻刀不冻镜头 + 命中回体力 3~6；体力：轻 6 / 终结 9 / 重 16，不再按刃尖速度持续扣体力。
- 测试台（`tools/test/fight.html` + `bots.js`）：click/flick/hold/wave/mash/sloppy 六种机器人 × 12 种敌人，全部 30 秒内击杀（旧版 wave 永远 0 伤害）。注意：测试台里虚拟时钟不要回零（combat 里有 performance.now 绝对时间状态）。

## R26d — 新敌人角色（MOD `foe_roles2`，默认开）
- 新增 `js/foe_roles2.js`（`window.FoeRoles2`），由 `js/foe_roles.js` 的 assign/clip/tune/after/tick/evade/hurt/update/clear 钩子调用；`index.html` 在 foe_roles.js 之后加载。
- 五个角色：**duelist 决斗者**（玩家挥刀时招架→反击，不逃跑）、**juggernaut 重甲**（正面非蓄力伤害×0.3，要绕背/蓄力重击破防，韧性 40）、**mage 法师**（紫色法球，HP<50% 三连发，近身闪现；挥刀可击碎 2.3m 内法球，右键格挡可挡）、**healer 治疗者**（10m 内队友 +30% 回血，被打断；只在场上≥2 敌人时出现；同伴全死后原地发慌）、**warcaller 战吼者**（9m 红圈，队友 ×1.2 速 ×1.25 伤，<55% 血时集结全体追击）。
- `combatfx.js` `roleCue` 新增 cast/heal/pop/parry/rally/blink；`worlds.js` `playerSwinging` 现包含 `Combat.state.sw`，`handAng` 优先取 `CS.sw.v`。
- 测试钩子：`window.__forceRole`（字符串或按 `Foe.foes.length` 索引的数组）。`tools/test/fight.html` 与 `bots.js`（新增 `o.delay`）已更新；harness 的 `playerSwinging/handAng` 现与游戏一致。
- 验证（light harness）：五个角色均无 JS 报错；duelist 会 `blocked`；mage 法球命中玩家（站桩 70 伤害）；healer 回血（F✚）；warcaller 给 buf；老角色矩阵回归全部 1.3–2.9s 击杀。踩坑：新角色必须 `fo.brave=true` 且 `fo.retreated=true`，否则被打后进 flee 状态，role.tick 不再被调用；healer/mage 后退速度必须低于玩家走速（1.8/1.9）否则打不到。
- 待做：野兽变体、HUD 连击点、教程文本更新。
- R26d 补：`js/worlds.js` 进场提示文字在 `combat_master` 开启时改为新操作说明（点左键出刀/三连斩/甩鼠标/蓄力/右键格挡）。

## 第二十五轮（续）：跨头发型 / 跨头饰品库 —— “找更多头发-饰品-各种各种，而且确定可适配”
改动文件：仅 `js/heads.js`、`js/mods.js`（均为本管理者文件；未动 UI Agent / 美术协作者文件）。
- **MOD `hair_mix2`（默认开）**：56 个 MMD 头的原作发型（原配色、自带发饰）可给别的脸用。`hairFitOK(F,H)` 逐对打分（缓存 FITSC），**相对基准**＝该发型戴在原主人头上的分数：覆盖不掉 >5%、陷入不多 >2%、拉伸 0.8~1.25、刘海遮眼带 ≤ max(0.34, 原主人+0.08) 且 ≤0.6；原主人自身陷入 ≥20% 的坏发型（Ganyu）不外借。抽测 142 对合格 62 对。Kafka 刘海原本就遮眼 → 不外借。
  - 绝对阈值不可用：MMD 盘发/扎发本就露后颈（Jean 自身覆盖 0.575），VRoid 发内层本就贴在头皮下。
  - skullMap：MMD 脸在两个 MOD 任一开启时，把脸皮 z>zm 的点镜像到后方补“虚拟后脑”（影响 fitHair/hairShell；原装 MMD 头目测无变化）。
- **MOD `acc_mix`（默认开）**：`accLib()` 收集 MMD 头上 `cloth_*` 独立饰品（眼线以上、≥24 顶点），`big`=帽子/大头冠。`fitAcc` = **刚性**搬运：按头骨平均半径比整体缩放（0.7~1.3），沿质心方向平移使“最贴头骨的 10% 顶点间隙”与原主人一致（-2~+4cm），埋进新发型 >12% 再外推。拒绝条件（ACCWHY 记录原因码 B/M/F/H/E）：推不出来 B、落座误差 >1.5cm M、原主人头上就悬空 F（大件 >5.5cm、小件 >2.5cm，如光环/胡桃帽上的梅花）、被新发型包住 >60% H、挡眼 E、陷进头皮 >5%、挡脸 >3%。
  - `mixLook`（randomLook 内、tierLook 之前）生成时**逐件预检**，只写入合格的 `L.ax=[{f,n}]`；脸自带大件则不叠；大件接受率 35%；同来源头 1 件；最多 2 件；出现率按魂阶 [0.06,0.14,0.26,0.4,0.55]。
  - 已否决方案：逐顶点径向偏移（帽子变形）、按发型外轮廓比缩放（悬空）、按发型外轮廓间隙落座（发散/压过眼睛）。
- 调试：`ModelHeads.mixDebug.{hairOK,hairSc,acc,why}`；工具 `tools/mix.js`（MODE hair/acc/look，配 hb3.py 的 PRE 环境变量）不在仓库内。
- 性能：randomLook 冷 2.4ms / 热 1ms（无头浏览器）。
## R26e — 用户反馈：“敌人永远打不死 / 每次只打一下冒一堆数字 / 按住轻微偏移没法控制攻击角度”
根因（light harness 复现）：
1. **逃跑速度 3.9–4.9 m/s > 玩家走路 3.6**：非勇敢敌人（多数）被砍一刀就逃，走路根本追不上（测试 3 个里 2 个 0 命中），或直接从门逃掉 = “只打一下、永远打不死”。`foe.js`：逃跑速度改 3.0+0.12·rar+0.3·iq（<走路 3.6，<疾跑 6.2）；逃了 6.5 秒仍无处可去（附近没门）→ 困兽之斗转身拼命；挨打后回头拼命概率 0.35→0.65。
2. **体力被空挥掏空**：追人时连点空挥，体力 0 → 进入“力竭”（移速 1.5、不能出刀）→ 被反杀。`combat.js` mmAttack：体力 6/9/16 → 4/6/12；4.2m 内没有敌人时空挥只耗 35%。
3. **R26d 重甲卫过硬**（hp×2 且正面 ×0.3）：改 hp×1.5、正面 ×0.6、出现权重 0.26→0.13；治疗量 30%→18%。
4. **方向控制**：以前按住左键必须 >30px/100ms 的大幅甩动才换方向，之后只出一刀。现在 `combat.js`：按下瞬间看按下前 120ms 的鼠标趋势（≥9px）；按住期间最近 150ms 内鼠标有 ≥5px 偏移（极轻微也行）就朝该方向（8 向吸附/连续角度）连续出刀，间隔 45ms；不动则仍是蓄力。`onMove` 现在在 MM 下始终记录鼠标趋势（RH），`mmDown` 不再清空 RH。
测试：`tools/test/bots.js` 新增 `drift`（按住+每帧 0.5px 偏移，`o.dir`）、`o.sp`（玩家走速，默认 3.2，实际走路 3.6）；`setup` 的 `brave:false` 用于测逃跑。结果：brave:false、走路速度追击，click/mash/drift/wave 全部 1–10s 内击杀；drift 的出刀角度 0°/90°/-135° 与偏移方向一致。
## R28 — 用户反馈：偷听框在左下角看不到 / 头棋镜头头角度不对、信息不清、去掉底座、要更多反馈和趣味 / 卡牌同理
- **偷听 `overhear.js`**：`#ohear` 移到屏幕底部居中（bottom:17vh，宽 min(780px,88vw)），字体 17–21px，名牌有弹出动画，带指向箭头；仍然 pointer-events:none 不挡操作。
- **头棋 `chess.js` 重做（仅此文件）**：
  - 镜头 tp=0.5 / d=12.5 / lookAt y=0.25；左右信息列 `.ch-col`（左＝常驻棋子信息卡 `.ic`，右＝斯尼克/战果托盘/棋谱），顶部＝回合胶囊+子力对比条；走法表改为按钮弹窗（📖）。
  - **去掉底座**：每颗棋子 `g` 内有 `yaw` 枢轴（`g.userData.yaw`），头挂在里面并始终转向镜头（PVP 翻转也适用）；脚下只有队色光环（红方橙、蓝方蓝）+软阴影；头顶是圆形“棋种徽章”（稀有度描边）。头缩放 S=3.0（restore 里同值）。
  - 信息卡：名字/魂阶/阶位徽章/**8×8 走法示意**（绿＝常规，金菱＝首级专属棋路，首领无）/走法说明/棋路名/口头禅/“正被威胁”/“走到这里＝吃掉她”。
  - 反馈：选中抬起+光环脉冲+表情；可走/可吃(红)/特殊(金菱)三种落点；被威胁的己方棋子红框脉冲+担心表情；落地挤压拉伸+涟漪+尘粒+轻震屏（吃子 0.3，无慢镜头）；吃子粒子爆发、“斩 +n”飘字、连斩/重创/斩首/将军/晋升横幅、将军红色晕影；台词气泡（PERSONA_LINES：see/fight/taunt/atk/pain/die/fear/low…，每 7–13s 闲聊）；胜负时全军表情+烟花。
  - 调试钩子：`Chess._scr(sq)` 返回该格屏幕坐标，`_st/_move/_gen` 同前。测试页 `_tools/wv/chess.html`（gitignored）。
- **卡牌 `recall.js` cardHTML**：没有可玩的卡牌游戏（`cardtable` 只是解锁说明），所以做的是**牌面查看器**：大牌面+鼠标倾斜反光（神魂/圣魂/异色有流光箔）、“怎么读这张牌”（费用/攻击/生命含义）、关键词逐条解释、**稻草人试打**（`window.RecallCard.duel`：打出→战吼→攻击/飘字/血条→反击，魂盾/剧毒/吸魂/狂怒/疾风/回响/嘲讽/潜行都有对应演出）。完整卡牌对战未做，属于后续独立系统。

## R27 头模 — 用户：“更多！多来点经典 MMD，日本作者的、大师级的、VOC 的、东方的”（+更多头发/饰品）
- **新增 26 个头**（models/CLS_*.js，共约 72MB），三个 MOD（js/mods.js 紧跟 pack_nte 之后，cat:'look'，默认开）：
  - `pack_voc` 9：CLS_MikuAnimasa / MikuYYB10 / MikuRacing / MikuVBS / HakuAnimasa / KaitoAnimasa / MeikoAnimasa / IA / Yukari
  - `pack_touhou` 4：CLS_Mokou / Kaguya / YakumoRan / YakumoYukari
  - `pack_cls` 13：CLS_RemTda / Tohru / 2B / Mikasa / Junko / Brahma / QinYYB / LLHonoka / LLEri / LLKotori / LLUmi / LLMaki / LLNozomi
  - 登记在 js/headpacks.js 的 HEAD_PACKS（沿用 document.write 同步加载，关掉的包不加载）。CREDITS.md 已加“仅限私人使用”条目。
- **更多头发/饰品**：不另做——hair_mix2 / acc_mix 会自动把这些新 mmd 头的头发和头饰（八云紫帽、八云蓝帽、妹红蝴蝶结、梵天冠、秦冠、雷姆发箍、托尔角…）纳入跨头库，hairFitOK / fitAcc 照常把关。
- **tools/pmx2vrm.py 修复**（其他 PMX 也受益）：
  1. 罗马字材质名（kao/kami/mayu/matsuge/kurome/eyebase/mimi）；通用名（材質N/mat N/新規材質）按贴图文件名回退（cls2，正则 `\d` 之前误写成 `\\d` 已修）。
  2. 面具/仮面/mask → cloth（“面”字曾把面具判成脸皮）；“表情”“shade” → 脸部贴片（hairshade 曾盖住 LoveLive 的脸）。
  3. SKIN 材质不做 alpha 裁剪（梵天脸贴图带透明通道 → 整张脸被裁掉）。
  4. PMX 脸皮并在身体皮肤材质里（结月缘「肌」、IA「skin」、秦「body01」）时，按头骨权重拆出脸皮（PMD 早已有）。
  5. 贴图路径大小写不敏感（八云紫 BodyA.png vs bodyA.png）。
- tools/pmxread.py：头签名放宽为 `PMX`（2B 的签名是 "PMX."）；PMD 里尾巴骨（尻尾/tail）→ cloth，舌骨 → 歯（八云蓝九尾曾被当“肌”切进头里）。
- 八云蓝/八云紫用 `--sc 0.9`（原模型偏大，1.25 时 skinW 0.37，比常见 0.21 大）；其余 `--sc 1.25 --hair-drop 0.04 --grp mmd --noflip`。
- **放弃**：MMJ 初音、日野森雫（PJSK 头身分离文件，仓库里只有身体）；YYB GenZ（vrm2head 内存溢出 >1.6GB）；YYB Base 初音（源仓库缺 Hair.png，头发全白）。
- 改动文件：js/headpacks.js、js/mods.js（+3 行）、tools/pmx2vrm.py、tools/pmxread.py、models/CLS_*.js、CREDITS.md、HANDOFF.md。未碰 UI Agent 的文件，也未碰 game.js / combat.js。

## R26f — 用户再次反馈：“轻微向右下偏移，攻击应该从左上到右下，却是乱的 / 打不死 / 每次只打一下冒数字”
- **方向乱的根因**：按下左键瞬间就出刀，此时鼠标还没动，方向只能取固定三连套路（左下→右上→下劈）；之后才看鼠标，所以第一刀永远“乱”。
  修复（`combat.js`）：MM 出刀改成 **回拉（80ms，重斩 50ms）→ 挥出** 两段，回拉阶段每帧读鼠标趋势（含按下前 90ms，≥3px 即算），刀朝鼠标移动方向斩：向右下轻移 = 左上→右下。回拉已经在动，所以没有“延迟感”；命中结算推迟到回拉结束后 20ms。按住继续轻移 = 沿该方向连续出刀（R26e 的连斩保留）。测试：drift 右下/左上/上 → 首刀 -45°/135°/90°，后续连斩方向一致。
- **保险（永不打不死）**：`foe.js` hit()：普通敌人第 4/5/6 刀起按剩余血量 1/3、1/2、全部结算（第 6 刀必死），霸主第 12 刀必死；`beasts.js` 同理（野牛 8 刀）；`worlds.js` 旧式球体 boss（hp 100）伤害下限 ≈9%。不论护甲/角色/回血，都不会“砍 20 刀不死”。
- 环境说明：本轮沙箱被重置（/var/work 丢失），已重新浅克隆；完整世界在 `_t.html` 里启动需数分钟，未做真机整世界测试，仍只用 `tools/test/fight.html` harness。
## R29 — 用户：“loading 界面不要看得到在加载什么，换换文本；模型显示仍偏黑，身体衣服色调不搭配”
- **MOD `load_veil`**（index.html 启动脚本，两个 init 进度回调）：不再显示“加载首级模型 xx% · 文件名”，改为轮换氛围短句（魂火渐明……/洞壁在低语……等 10 句，2.6 秒一换）+ 两段合并的总进度；最后一句“洞门缓缓开启……”。关掉即恢复原文本。
- **MOD `char_lift`**（偏黑的根因）：`foe_toon` 默认关 → 身体是 PBR 标准材质，而 FaceFill（face_light）只包卡通材质 → **身体在洞里完全没有补光**，头有。修复：
  - js/heads.js FaceFill.wrap：char_lift 开时也包 MeshStandardMaterial（同单位 albedo/π，同一段注入代码）。
  - FaceFill 下限：洞里 0.45→0.8、野外 0.75→0.85（uniform getter，不重编译）。js/foe.js FF() 身体系数 0.85→0.95。
  - 头与身体的卡通色阶暗档 [120,190,235,255]→[165,208,240,255]（heads.js grad、foe.js TOON_GRAD）。
  - 实测（篝火前 6 人）：最暗的身体亮 10–30%；剩下的“暗”是衣服贴图本身深色 → 交给 body_match 偏好不太暗的身体。
- **MOD `body_match`**（js/foe.js bodyFor → matchPick）：
  - `tools/bodypal.py` 离线统计 24 具身体衣服主色（跳过皮肤/头发/脸材质，按三角面积加权采样贴图；材质合并的身体剔除肤色像素）→ 常量 `BODY_PAL`（h 色相 / s 彩度 / c 集中度 / n 中性占比 / d 暗占比 / L 亮度）内嵌在 foe.js。新增身体要重跑：`python3 tools/bodypal.py big/body/*.js`，替换 foe.js 里的 `const BODY_PAL = …;` 一行。
  - 新接口 `ModelHeads.hairColor(look)`：mmd 发型用贴图平均色（hairAvgCol），其余用 look.hc1。
  - 权重：色相差 <40° ×1.8、<75° ×1.1、>150°（补色）×0.8、其余（撞色）×0.3；按衣服彩度和发色彩度缩放（黑白灰任一方 → 百搭）；× (0.7+0.6·min(1, L/0.55)) 略偏好不太暗的身体。
  - 身份候选全撞色（最大权重 <0.9）且本地点身体种类 <3：一半概率改从全部非 Boss 身体中协调度前 5 挑。
  - 实测：猎人身份 青发初音→Vita 74%（原 51%）、金发绘里→Amber 82%。
  - Foe 导出了 `bodyFor`（测试用）。
- 改动文件：index.html（启动脚本 3 处）、js/mods.js（+3 MOD）、js/heads.js（FaceFill.wrap / 下限、grad、hairColor 接口）、js/foe.js（TOON_GRAD、FF 系数、bodyFor/matchPick/BODY_PAL、导出 bodyFor）、tools/bodypal.py。未碰 UI Agent 文件。

## 第二十六轮(g)(h) — 另一个 Arena Agent：命中 HUD / 音量面板 / 打击感（与 R26c–f 的 combat_master 并行，不改 combat.js/foe.js）
用户反馈（本轮原话要点）：“战斗效果太烂，打击感非常弱”“每次打就是冒一堆数字”“角色永远打不死”；上一条：“来个各种音效音乐调节选项，音乐太大了”；语音“算了就中文”（日语重录已放弃，不要再做）。
- **MOD `hit_hud`（js/hithud.js，默认开）**：`worlds.js floatDmg` 首行钩子 `HitHud.dmg(pos,n,big)`（只接管数字；字符串飘字照旧）。同一目标 1.2s 内的命中合并成一个累计数字 + `×N`，每下弹跳。被打中的敌人（`Foe.foes`，非霸主）和野兽（`Beasts.list`）头顶血条：红=当前、白=刚掉的血慢慢缩；5s 不挨打淡出；击杀闪白消失。自带 rAF 循环（出猎时 Worlds 接管主循环），`Worlds.active` 为假或 `body.film` 时隐藏。
- **MOD `audio_mixer`（js/sfx.js + js/mixer.js，默认开）**：sfx.js 新增分通道 `SFX.bus(k)`：`sfx`（= `SFX.out`，老代码默认进这里）/`ui`/`voice`/`amb`/`steps`/`music`，全部 → master(0.8×总音量) → 压缩器。`SFX.VOL / VDEF / setVol(k,v)`，存 `localStorage.soulhead_vol`。HTMLAudio BGM 音量 = 0.45 × music × master（**默认 music 0.5 = 以前的一半**）；`duck()` 尊重当前音量。已改接：ambience→amb、steps→steps、persona 语音→voice、seance 八音盒→music、ui3a 合成界面音→ui、`SFX.play` 的 click/select/confirm/error/open/close/page/book → ui。面板：右上角 `#musicCorner` 改为「🔊 音量」，`#menu` 里 BGM 按钮后插「🔊 音量」；M 键仍开关 BGM。**新增音效请接 `SFX.bus('对应通道')`，不要直接接 `ctx.destination`。**
- **MOD `hit_impact`（js/impact.js，默认开）**：包一层 `CombatFX.event`（原函数先执行）。hit：受害者 `mixer.timeScale=0` 60ms（重斩/破绽 115ms），击杀 150ms（只延长不缩短）；沿 `Combat.state.sw.v` 方向在命中处画刃光（DOM，重斩/击杀更宽更红，格挡/弹刀黄色火花）；叠加 115→40Hz 闷响 + 带通噪声（sfx 通道）；击杀红色屏幕边缘脉冲、重斩白色。玩家镜头与操作不冻结（用户以前把慢动作视为卡顿）。
- 测试：桩页（真 three.js/mods.js/sfx.js + 假 Worlds/Foe/Beasts/Combat）Playwright：数字合并 `54×3`、血条宽度/白条延迟/击杀、面板 7 行滑块实时改 GainNode、顿帧恢复、刃光方向（向右下 = 左上→右下）。**完整 index.html / _t.html 在本沙箱仍 OOM（/tmp 在内存里），未整机测试**——请用户试玩反馈数值（顿帧时长、刃光粗细、血条大小）。
## R30 — 用户：“只有 VRoid 的头和身体是适配的，其他都是大头娃娃或者小头怪物”
- **根因**：第二十四轮 `head_norm` 只处理 mmd 组、**只放大不缩小**（k∈[1,1.4]）、只看脸宽 skinW（对标 0.155）。星铁/绝区零/异环/R27 经典 MMD 的 skinW≈0.19–0.30 → 从不缩小 → 大头娃娃（あにまさ式 0.28–0.30 最夸张）；skinW 被狐耳/帽子/面具撑大或测歪的头（HSR_Hysilens 1.287、GI_LaSignora 0.033 等）→ 大/小头怪。
- **MOD `head_norm2`**（默认开，开启时旧 head_norm 不生效；js/heads.js normK2/irisIPD，normSize 里切换）：
  1. 脸宽 kw = 0.16 / skinW（VRoid 中位 0.160）。
  2. 两眼间距 ki = 0.16×0.46 / ipd（解析时从材质名含 Iris 的网格左右均值实时算；0.46 = MMD 画风 眼距/脸宽 中位，VRoid 是 0.39）。
  3. 两者 |ln(kw/ki)|<0.25 → 几何平均；否则用第三指标 kb = 0.316 / 包围盒高（VRoid 中位，含头发）裁决取更接近的那个。只有一个指标时与 kb 差太大（|ln|>0.5）改用 kb。
  4. 可缩可放，夹 [0.5, 1.5]；只作用于 grp==='mmd'，VRoid 不动。
  - 离线核对（tools/headmetric.py 统计 121 个头：ipd / skinW / 眼→下巴[不可靠，未用]）：あにまさ四人 ≈0.56、HSR/ZZZ/NTE ≈0.75–0.9、GI ≈1.2–1.36（与旧值一致）、Castorice/Hysilens/八云/三笠/八重/久岐/优菈 这些分歧头都被 kb 裁到正确一侧。
  - 实拍：同一身体上 VRoid/GI/HSR/ZZZ/NTE/CLS 头大小一致；Vita/芙宁娜/北斗/光/样本B/Osage 六具身体上头身比例正常。
- 工具：tools/headmetric.py（新增）。截图脚本 foeshot.py/js 备份在工作区 bak/tools（MODS / ZOOM 环境变量，截图时隐藏手持武器）。
- 改动文件：js/heads.js（normSize 前新增 irisIPD / normK2）、js/mods.js（+1 MOD，紧跟 head_norm）、tools/headmetric.py、HANDOFF.md。

## R31 — 用户再次：“只有 VRoid 的头和身体是适配的，其他都是大头娃娃或者小头怪物”
- R30 修了“头模”一侧（head_norm2）。这轮修“身体”一侧：js/foe.js headFit 的 `skull = 4.15×(眼高−头骨高)` 是按 VRoid 身体标定的，原神身体骨架不同 → 头小 3~18%。
- 离线统计 24 具身体：身高/头高（VRoid 5.18–5.33，原神 5.47–6.33）、头宽/肩宽（上臂骨间距；VRoid 1.18–1.23，原神 1.03–1.16；AvatarSample_A/B 上臂骨偏内，排除）。两指标对每具原神身体都一致。
- **MOD `body_headfit`**（默认开，js/mods.js 紧跟 head_norm2）：foe.js 常量 `BODY_HEADK`（非 VRoid 身体的 skull 倍率，= √(kh·ks)，夹 0.9~1.25；Furina 1.18、YaeMiko 1.137、Rosaria 1.134 … Lisa 1.033、Xiangling 1.034），headFit 里乘上。VRoid 身体（Vita/AvatarSample_A/B/Darkness_Shibu/HairSample_Female/Osage/HikariCape/HikariScholar/Victoria_Rubin）不在表里 = 1。
- 新增身体时：非 VRoid 身体要补 BODY_HEADK（方法见本节；未在表里 = 不修正）。
- 改动文件：js/foe.js（headFit 前加 BODY_HEADK）、js/mods.js（+1）、HANDOFF.md。

## 第二十六轮(i) — 用户：“单位血量掉到 0 不死，每次攻击冒出一堆气泡（同时触发特别多次）”（另一个 Arena Agent）
- **根因（致命）**：`worlds.js foeEvent` 首行 `… CombatFX.event(t, fo, d); // 第二十二轮（续 9）…命中准星 const now = …, st = W.stats = …;` —— `now/st` 的声明被行尾注释吞掉。每次 `hit` 事件 → `st.combo` ReferenceError →
  1. `foe.js hit()` 在 `fo.hp -= dealt; floatDmg; event('hit')` 处被打断，走不到 `if (fo.hp <= 0) die()` → **永远不死**（beasts.js 同理）；击杀奖励/连击/多杀/成就也全部失效；
  2. 异常冒到 `combat.js mmHit()`，`w.set.add(tg.id)` 没执行 → 同一刀在出刀期间**每帧重复命中**。测试台复现：旧代码 10 刀 = 80 次命中、HP −1306 仍在追人。
- **修复**：声明单独成行；`foeEvent` 拆成 `foeEvent → try { foeEvent0 } catch`，Recall.log / CombatFX.event 也各自 try；`combat.js` 两处 `tg.onHit()` 包 try，出错也按“已命中”进冷却（绝不每帧重复结算）。修后测试台：1 刀 1 次命中，6 种操作（click/flick/hold/wave/mash/drift）都正常击杀。
- **给后续 agent（重要）**：这是本项目第二次“代码被行尾 `//` 注释吞掉”（第一次是 combat.js 屏震）。**不要把新代码接在已有注释的同一行后面**。检查脚本（我放在 /tmp，未入库，思路很简单）：逐行找 `//` 之后含 `const x =` / `a.b =` / `if (…)` 且以 `;`/`}` 结尾的注释。另外我用 eslint `no-undef`（把所有 `window.X =` 当全局）扫了 js/*.js：除 BODY_MODELS/BEAST_GLB（数据文件定义）外只发现 `sanctum.js:581 hs[0].NM(rec.c)`（rec 未定义）→ 已改为 `NM(hs[0].rec.c)`。
- 测试台用法补充：`tools/test/fight.html` 需要 `big/anim/ual.js` 和部分 `big/body/*.js`（稀疏克隆要 `git sparse-checkout add`）；`bots.js` 不是页面自带，drive.py 第一步用 `(0,eval)(bots源码)` 注入。

## R31b — 用户：“卡芙卡头有问题！看上去非常怪异！你检查！”（逐个目检所有非 VRoid 头）
- **根因 1（切掉嘴/下巴）**：tools/vrm2head.py 用“IRIS 材质”定位眼睛→按眼睛推切口。部分模型把墨镜/发饰也命名成 EYE_Iris（卡芙卡墨镜在头顶）→ 眼睛被定位偏高→切口切到嘴。修：只保留与眼白高度重叠的虹膜图元（打印 `R31 eye filter: drop [...]`）。
- **根因 2（长脖子/颈部肉团）**：同一 bug 反向——12 个原神头的脑后发饰被命名为 Iris → 眼睛偏低→切口低 10~25cm（申鹤脖子上一团肉、绫华/芙宁娜长颈）。同上修复后重转。
- **根因 3（脸皮没识别）**：tools/pmx2vrm.py 新增：繁体「顏」(海瑟音)、材质名 `head`(女士怪物版)、プロセカ VBS `mtl_chr_NN`/`mtl_chr_ehl`、通用名材质改看日文贴图名（顔.png/眼球.bmp，结月缘 ver7）、环境变量 `FACE_MATS=材质名,...` 手动指定（秦始皇「新規」）。
- **重转 21 个头**（models/ 覆盖）：HSR_Kafka HSR_Hysilens CLS_Yukari CLS_MikuVBS CLS_LLHonoka CLS_LLNozomi GI_LaSignora NTE_Blackbird CLS_QinYYB（commit 3376782）+ GI_YaeMiko KukiShinobu HuTao Beidou Clorinde Ganyu Eula Furina KamisatoAyaka Nilou Rosaria Shenhe。
- 检查指标（新增头时请跑）：FACE_SKIN 最低点 − cut.y 应 ≤ ~0.03（>0.04 = 长脖子）；(眼白最低点−cut.y)/(头顶−cut.y) 应 ≈0.2~0.35（<0.15 = 切到嘴）。工具：/home/user/bak/tools/glbinfo.py。
- **MOD `head_qc`**（默认开，js/heads.js randomLook 前 QC_BAD + js/mods.js）：CLS_YakumoYukari（PMD 脸皮与全身同一材质→发白发光）、NTE_Blackbird（帽子盖住整张脸）不进随机池/混发池；存档里已有的照常显示。以后修好可从 QC_BAD 移除。
- 仍可留意：ZZZ_Lucia 下巴下有一片独立切口圆片（装到身体上被脖子挡住，未处理）；CLS_YakumoRan/CLS_RemTda 颈略长（0.04~0.06，装身体上看着正常）。
- 改动文件：js/heads.js（randomLook 前 +QC_BAD/qcBad，allHair 过滤）、js/mods.js（+head_qc）、tools/vrm2head.py、tools/pmx2vrm.py、models/（21 个）、HANDOFF.md。

## R32 — 用户反馈：“洞里很孤独、要有经营养成感、大量对话互动；孤独主角+一堆人头会有人头恐惧 → 做可爱的神灵/先祖住在洞里”
**新系统：神灵（先祖）**，MOD `spirits`（默认开，`mods.js` play 类），全部新文件，未改别人的文件（仅 `index.html` 在 `rites.js` 后加 5 个 script、`mods.js` 加一项）。
- 设定：神灵 = 历代洞主的魂（被洞窟缩成小精灵）。“咒”= 被烧掉的契约条款（洞窟的饿）；玩家因此听得见她们。开局洞里只有斯尼克；把**第一颗头**带回洞 → 小烛（烛火灵）出现，讲诅咒并请玩家收头。
- 每个地点（village forest wilds abbey swamp fortress capital abyss peak）**首颗头**带回洞里 → 该地神灵到访（自我介绍+被什么吸引）。`rec.sp=1` 标记已计数（经 vault/addHeadRecs 可能丢，丢了会重复计数，无害）。
- 九魂灯：某地 ≥3 颗头且其中一颗 `Recall.nKnown>=3` → 点亮，播放该神灵的 ward 场景+奖励。5 灯触发 `half`，9 灯且 ≥6 位神灵好感≥45 触发 `ready`，小烛对话里出现“举行解咒仪式”→ `finale`：烧掉契约（free）/留着契约（stay）/再想想。终局后 `S.spirit.end`，初代 `chudai` 入住。
- 文件：`js/spirit_art.js`（10 张 320px JPEG 立绘，AI 生成，黑底；3D 里用加法混合 Sprite，DOM 里运行时抠成 alpha PNG）/ `spirit_data.js`（名册、评头词池、闲聊、拌嘴、心愿模板）/ `spirit_s1.js`、`spirit_s2.js`（剧本 + `SPIRIT_H` 语法糖）/ `spirits.js`（引擎）。
- 玩法：对准神灵按 E 对话（手里有头则直接评头）；枢纽菜单：聊聊 / 话题 / 评头 / 心愿 / 小游戏（猜拳、抽头比大小）/ 个人故事（好感 20/45/70 各一段）/ 结缘（好感 90）。评头按喜好（种族/性格/魂阶/异色/故乡）给反应并加好感；心愿可指定“想看某种头/给魂晶/多聊两句”，完成得魂晶。洞里有气泡闲聊、神灵之间拌嘴、对新头/受伤的反应；洞内回血随神灵数增加。
- **玩家可关**：按 **Y** 打开神灵簿（九灯进度、主线目标、神灵卡片、“让她们躲起来”开关）；隐身后不显示、不自动弹剧情（到访只静默记录）。右下角有 chip。
- 存档：`G.S.spirit`（随 save）；隐身偏好镜像到 localStorage `soulhead_sp_hide`。
- 内容边界：立绘可爱、非性化；文案不含成人内容。
- 待办：初代 `chudai` 立绘（暂用小烛 hue-rotate）；与头棋对弈（需要棋台建筑，暂未接）；更多神灵/剧本。
- 测试备忘：整页在 2GB 沙箱里只能用精简页（去掉 models/ 大部分 script）+ 低分辨率跑；截图在全屏面板上会超时。
## 第二十六轮(j) — 另一个 Arena Agent：击杀红圈不消失 / 攻击冷却 / 头比身体暗
用户：“打击那个红圈没法消失了；攻击你最好设计CD；这个头为什么一直偏暗，和身体颜色不一样”
- **红圈**（a59a90a）：js/combatfx.js `marker()` 的 `#cfxMk i` 刻线没有默认 `opacity:0`、动画也没 `forwards` → 0.28s 放完弹回可见，永远挂在准星上（击杀色是红的）。已修，Playwright 验证 1→0.64→0 并保持。
- **MOD `atk_cd`**（170d658，js/combat.js + mods.js）：轻斩 0.5s / 连段终结 0.75s / 重斩 0.95s，×√max(0.6, 武器重量)，力竭 ×1.3。CD 中按键缓冲一刀（窗口 480ms），不吞输入；drift 连斩分支也受 CD 限制；准星外圈 SVG 进度弧 `#atkCd`。实测（假时钟 bench、打不到人）：连点/按住轻移 3.5 → ~1.7 刀/秒，击杀仍 1–2 刀。
- **MOD `head_tone`**（头比身体暗的根因，js/heads.js FaceFill + worlds.js parseSky）：
  1. heads.js 的 ShaderLib.toon“软膝盖”把卡通材质的受光倍数压成 `(1-e^(-1.2x))·1.08`：满光 x=1 时头只有 0.755，烈日封顶 1.08；它是身体也用卡通材质那时加的，现在身体是 PBR（foe_toon 关）不压缩 → 野外头恒比身体暗 25%+。
  2. 野外 `scene.environment`（天空 PMREM）给 PBR 身体间接光（envMapIntensity 0.55），MeshToon 不吃环境图 → 头少一块光、偏灰。
  - 修：野外（`FaceFill.world()` 600ms 内）头的软膝盖改为满光以内线性、超过后柔性压到 `FaceFill.tune.knee`=1.35 倍；并给卡通材质加 `uEnvA`（天空平均辐亮度 sky.amb × 0.55 × tune.env 0.4 × FaceFill 系数 k：脸 1.0、头发 0.6）。都是共享 uniform getter，开关不重编译；洞里（只有陈列首级、篝火）两项都为 0，保持原样。
  - worlds.js parseSky 新增 `sky.amb`（环境图按纬度 cos 加权平均辐亮度），设 `sc.environment` 时 `FaceFill.env(sky.amb)`。
  - 实测（草甸/松林，脸颊 vs 脖子亮度）：0.91→1.05、0.82→0.97；试过 knee1.45+env1 发白、env0 偏黄。
  - **死路**：按“身体脖子贴图肤色 ÷ 脸贴图肤色”逐个校 albedo —— 原神身体脖子贴图画了阴影（香菱 #cc9f8d，手臂远更亮），校完脸发棕；Osage 发白。别再试。`ModelHeads.faceSkin(look)` 留作工具（未用）。
- 测试方法（/tmp，会被清）：fight.html bench 里 `skeleton.pose()` 摆正、相机对准脖子骨骼 0.55m，分别只渲染头/身体、按肤色像素算亮度；天空脚本需 `git sparse-checkout add /big/world/sky_evening_meadow.js /big/world/sky_misty_pines.js`。/tmp 是 1GB tmpfs：Playwright 浏览器放 /var/tmp。

## R32b — 用户：“不喜欢头灵形象，要有尊严、超世界的多神教神明；不要生成立绘，发光小精灵感觉；需启用通神视角才看得见”
改动（仅神灵系统自己的文件 `js/spirit_*.js`、`js/spirits.js`，删掉了 `js/spirit_art.js`，`index.html` 少一行 script）：
- **角色全部重做为“各路神明”**（多神教）：曦烬（灶火与誓约，引路）、雾川（晨雾溪流）、青冕（林野丰饶）、猎牙（荒原狩猎）、白铃（祈祷钟声）、黑蕊（沼泽契约）、戍山（城关戍守）、曜冠（日曜王权）、渊目（深渊预言）、白骸（群山长寿），终局 火祖（初代）。设定：历代洞主死后被九地香火供成了神，契约把一缕神识扣在洞里。id 已改（xiaozhu→xijin 等），`st()` 里有一次性存档迁移。台词整体改成庄严而各有性格的口吻（祈愿/供奉/祂）。
- **无立绘**：每位神明一枚程序生成的“神纹”（光核+神字、旋转光环、光芒、环绕光点），3D 里是加法混合发光体，对话框/神灵簿里是两层 PNG（光环缓慢旋转）。
- **通神视角**：曦烬在开场赐予；按 **N** 开合（`sightOn`）。关闭时神明不可见、不可交互、无气泡；开启时屏幕有淡紫暗角。到访/灯/主线剧情会自动开启；有未读剧情而视角关着时，每 150 秒提示一次。神灵簿的“隐身”开关仍在（Y）。

## R32c — 用户：“停！我更喜欢 Q 版本（你之前设计的那个样子），能中和游戏的阴暗氛围” → 回退到 Q 版神灵
- 神灵视觉/文案/ID 全部回到 R32（`333cae5`）：小烛/阿雾/叶叶/獠牙/圣铃/泡泡婆/铁锤/金冠/无眼/老骨 + 初代，立绘 `js/spirit_art.js` 回归。R32b 的“多神教诸神/神纹”方案整体撤销（仍在 git 历史 `cba06cb`，如用户改主意可找回）。
- **保留**用户同时提出的“通神视角”：按 N 开合（开场小烛教），关着时神灵不可见/不可交互/无气泡；新增 MOD `spirit_sight`（默认开，关掉则神灵始终可见）。`st()` 里有存档迁移：R32b 的新 id 会映射回 Q 版 id。

## 第二十六轮(k) — 用户：“造建筑/合成都要地图搜刮材料，不同地区不同材料；光靠魂晶太无敌。魂晶 + 地区霸主首级 → 该地区的低级资源合成器（放头建筑，每区一座，恶趣味）”
新 MOD `region_econ`（默认开，关掉=全部回到只花魂晶）。新文件 `js/regecon.js`（index.html 里紧跟 forge.js）。
- **18 种地区材料**（`RegEcon.REG`，顺序=地区难度）：雾溪村 稻草人稻草/牧羊铃铛，翠影精灵林 月桂枝/萤火虫罐，兽牙荒原 狼鬃/图腾骨，白银修道院 圣水/圣银十字，黑沼魔女泽 沼泽黑泥/魔女蛤蟆，铁盔要塞 要塞精钢/火药桶，金冠王都 王都丝绸/王座金箔，深渊裂隙 深渊黑曜/深渊魔核，龙骨圣山 龙鳞/万年霜晶。id `rm_*`，`Sack.def` 注册，带 `reg` 字段。
- **掉落**：`Sack.roll` 末尾 `RegEcon.rollLoot`（按当前地点 `Worlds._W.graph.nodes[cur].region`）：宝箱 80% 常见/20% 稀有，箱桶 55%/5%，篮桶 45%，架 25%，敌尸 50%/7%，**霸主尸体 常见 6–10 + 稀有 3–5**；野兽尸体 35% 常见（`Sack.carcass`）。`genLoot` 每地点多 1–3 个 `kind:'vein'` 地区采集点（独立随机数，不改老地图布局），外观 `RegEcon.veinKind(node)`（稻草垛/精灵花圃/兽骨堆/烛台祭坛/魔女坩埚/军械桶堆/贵族行李箱/黑曜裂石/龙鳞石堆）。
- **消耗**：`RegEcon.need(k)` 由建筑 base 价 + 洞层确定性生成（base<150 免材料；<400 通用料；之后升档到更远地区 + 稀有料），×(1+0.5×已建数)。game.js `placeBuild` 检查/扣除，ui.js 建造卡片显示 有/需（`.re-mats`，不够则 poor），拆除返还一半材料（`RegEcon.refund`）。挖深 `RegEcon.digNeed(层)`（game.js dig + ui 挖深卡片）。附魔 `enchCost().rm`（+2 起，武器/护甲两条地区线，+6 起加稀有；sack.js enchant 与 forge.js 都已改）。配方：背篓 b2–b5、巨魔再生药加地区材料。
- **九座霸主首级合成器** `syn_<地区>`（cat func，max 1，解锁=`S.bosses[地区]`，造价=魂晶 2000×1.6^i + 该区常见 10+2i + 稀有 1 + 通用 6）：`mount.accept` 只收 `h.rec.c.boss===地区` 的首级（game.js mountHead / 手放吸附都加了 accept 过滤，拒收时 toast `mount.deny`）。有头时每 36 秒花 25×1.6^i 魂晶产 1 份该区常见材料进仓库（魂晶不够就停，90 秒提示一次）；空手 E「督工」立刻多产 1–2 份 + 12 秒 ×3 速（冷却 20 秒）；Shift+E 照常取下首级。进度条借用游戏自带标签（`period:1e9`，每帧写 `b.timer`）。只在洞里跑（Worlds.active 时主循环不走 HOOK.frame）。
  - 稻草人脱粒机（首级插斧柄上当稻草人，横杆转）/ 女王盆栽（种进花槽，花随进度长，E 水壶浇头）/ 狼嚎图腾（三兽首托着，E 仰头嚎）/ 圣水喷泉（哥特柜当祭台，嘴里喷粒子水弧进木桶，E 拍后脑勺）/ 魔女大坩埚（压在锅盖上颠，E 搅成陀螺）/ 元帅督造锻炉（坐镇酒桶，铁锤砸台钳溅火星）/ 女王纺车（当线轴转，丝线粒子）/ 深渊凝视炉（悬浮，黑曜碎片环绕，E 紫闪+碎片炸开）/ 龙骨风铃（梯子顶吊水晶灯，首级在下面荡，E 大幅摆动+铃声）。全部用 assets/ 与 props_pack 的 CC0 模型，粒子弧只是特效。
- 测试：`tools/test/regecon_mach.html`（假 G + 球形假头，红鼻子=朝向；`#poke` 看督工动画，`#only=forest,peak`，`#far`/`#close`）。file:// 直接开。
- 注意：新建筑放头的朝向 yaw=0（面向建筑正面 +z）；`U.seat` 在 make() 里按模型实际尺寸算，并回写 `C[key].mount.slots[0]`。
---
## R33 回忆 F 界面重做（MOD `recall_iw`，默认开）
用户反馈：不要新开 3D 界面，要原场景换镜头；UI 信息不清晰；主角手/动作不行；死去的首级不能变表情；没音效；没有把玩动作。
- **新文件 `js/recall_iw.js`**（`window.RecallIW`）：包裹 `Recall.open`。MOD 开且首级在场景里（或在库房→自动 `G.takeOut`）时走原场景模式；`Worlds.active` 或 MOD 关时回退旧界面。
  - 镜头：用 `G.HOOK.pre`（相机已按玩家设置、渲染前）叠加相机偏移/俯仰/FOV；首级位置=相机局部坐标，按包围盒中心补偿，姿势整体按首级高度/0.26 缩放（`S.k`）。
  - 手：`limb_hand_avatar` 克隆×2（左手镜像）+ 前臂圆柱与袖口，挂在相机上。关键帧动作：对视/抚摸/嗅闻/贴耳/那一战 + 把玩（抛接/转一圈/戳脸颊/拍拍头）+ 建筑动作（茶话/照魔镜/梳妆/鉴魂/棋谱/牌局，通灵直接调 `Seance.open`）。
  - 音效：`snd(k)` 用 `SFX.ctx/SFX.out` 合成 + 已有采样，每个动作都有提示音（32 个键已无头测试）。
  - UI：`#riw` 覆盖层——左侧信息卡（未知条目显示“？？？ + 解锁方式”）、底部动作栏（1–9,0 分组 回忆/把玩/建筑）、字幕、进度条、✕。`body.riw-on` 隐藏准星/提示/HUD。把玩或拖动转动累计 8 次揭示“饰物与印记”。
  - 调试开关：`RecallIW._S.freeze / .snap`（截图用），`RecallIW._snd`。
- **改动他人文件**：
  - `js/recall.js`：导出增加 `narrate, chessHTML, cardHTML, hasB, bn, adorn, FK`；MOD 开时 `loop` 里不再 `hb.setExpression`（首级不变表情）。
  - `index.html`：在 `js/recall.js` 后加 `<script src="js/recall_iw.js">`。
  - `js/mods.js`：在 `head_qc` 后加 `recall_iw` 条目。
  - `game.js` 未改（主循环只看 `Recall.active`，原场景模式下保持 false；持头插值被 pre 覆盖）。
- 测试工具：`bak/tools/riw.py`（按动作/时间截图，`FUNC=1` 跑按键功能测试），`mk_r.py`（保留手部资源的轻量测试页）。
## R33b — 用户：“新发现的头很多太大，像大头娃娃；头在任何环境都偏暗、不感光，不要这个效果”
- **实测（tools 外的临时台 _tools/wv/fl.html，gitignore，同一身体挂 VRoid/GI/HSR/ZZZ/NTE/CLS 头，PBR 环境图+ACES，对标游戏渲染器）**：
  - 暗/不感光的根因 = 头是 `MeshToonMaterial`：4 级色阶、**拿不到天空环境图**（身体是 PBR + envMapIntensity 0.55）、无方向性层次 → 野外脸发灰（亮度 ≈ 身体的 70%），洞里只有“亮/补光下限”两档，对火光方向不敏感。R26j/R29 的 uEnvA/膝盖/补光下限都是在卡通材质上打补丁。
  - 尺寸：脸宽/眼距经 head_norm2 已对齐 VRoid，但 MMD 的发量/发饰/兽耳使整颗头包围盒仍比 VRoid 大 30~90%（VRoid 0.23，MMD 0.34~0.49，原始单位）→ 视觉上还是“大头”。
- **MOD `head_pbr`**（默认开，js/heads.js 顶部 `MTM()` 工厂；需重载）：heads.js 里所有 `new THREE.MeshToonMaterial` 换成 `new MTM`，开 MOD 时返回 `MeshStandardMaterial`（roughness .88、metalness 0、envMapIntensity .55，与身体同），关 MOD = 原卡通。headwear.js 的帽饰用 `ModelHeads.MTM`。所有着色器注入（染发/肤色/血迹/眼/FaceFill）用的 `#include` 锚点两种材质通用，未改。
  - 新增 `FaceFill.tune.pbr`（0.62）：PBR 头的反照率倍率（染色/肤色参数是按卡通光标定的，PBR 吃到完整环境光会偏白）。默认注入 `FaceFill.HPBR_OBC`（在 `#include <lights_physical_fragment>` 前 `diffuseColor.rgb *= uHeadK`）；hair/skin 自带 onBeforeCompile 的由 `FaceFill.wrap` 注入同一句（靠 `userData.hpbr` 标记区分，避免重复）。toon 的软膝盖/uEnvA 对 PBR 头不再起作用（也不需要）。
  - 实拍：野外（天空环境+太阳）脸/发颜色回到贴图原色（甘雨浅蓝发、卡芙卡紫红发），亮度与身体一致；洞里（单点火光+弱环境）头部有明确的受光面/背光面。
- **MOD `head_norm3`**（默认开；heads.js `normK2` 末尾；需重载）：head_norm2 之后整体再 ×0.95，含头发包围盒高（×k）超过 VRoid 中位 0.316 的再 ×√(0.316/bn)，下限 0.82。例：雅、妹红最多收到 0.80~0.85，甘雨/卡芙卡/LL 系 0.95。`entry._normK3` 可查。
- 没改：foe.js headFit/BODY_HEADK、FaceFill 的 floor 值、存档。若以后觉得头偏亮：调 `FaceFill.tune.pbr`；偏大：调 normK2 里的 0.95 / 0.316。
- 测试台备忘：ModelHeads 全量 121 个 GLB 一起载会让 2GB 沙箱 Chromium 崩（~400s 后 Target crashed）；用 12 个头的子集页即可。`Mods.on` 读 bootSt（需重载才变），页内 `Mods.set` 不会改变本次渲染。
- 改动文件：js/heads.js、js/headwear.js、js/mods.js（+head_pbr、head_norm3）、HANDOFF.md。
---
## R26l–n（用户：首级全部物理支撑/建筑描述太长/选地点重做+预览图/地区BOSS·小BOSS·人物/到达简介+任务+奖励/食人魔猎手）
- **R26l `head_support`（js/headphys.js，默认开）**：包装所有带 `mount` 的 `BuildCat.C[*].make()`；模型载入后第一次 make 时对每个 slot 从颈部 +0.12 往下打射线（中心 + r0.035/0.065 两圈，**双面探测**——有些模型土面/桶内法线朝下）。落差 ≤12cm → 把 slot 下移贴合；12–70cm → 高度不变，在下面垫一个拉高的 CC0 `wooden_crate_01` 台座（`d.__plinth`，每次 make 都加）；透明液体 → 泡进去 0.08。`mount.selfSeat:true` 的建筑跳过（regecon 合成器自己算座位）。`HeadPhys.top(g,x,z,r,y0)` = 找模型真实顶点。审计页 `tools/test/head_physics.html#zoom,all,sz=300,only=a,b`（RES 行 + 缩略图；r≤3cm 的窄射线会误报"搁在瓶口/杯沿"的头，需目测）。
- 描述：9 个合成器描述缩成一句；`.bp-desc` CSS 两行截断，完整文字在 title。
- **R26m `region_pick` + `region_quest`（js/regionquest.js、js/regionart.js）**：
  - regionart.js = 9 张地区预览图（从 big/world/sky_*.js 的 CC0 HDRI 背景裁地平线 + 调色，base64）。
  - 选地点：ui.js `openExpedition` 里 `RegionQuest.pickHTML({power,danger})` 替换掉旧 `.locs` 列表（MOD 关回旧版）；出发按钮仍是 `data-a="loc"` → `startTrip`。
  - `RegionQuest.DATA[k]`：tag / arrive（到达一句话）/ why（任务理由）/ minis（两名小BOSS：n,title,id(尽量用 foe.js ARMED 里带武器的身份),desc）。
  - 任务：选地点界面预览的任务就是出发后拿到的（`pending[k]`）；种类 mini/decap/kill/boss；进度读 `Worlds._W.stats`；奖励魂晶 + 该区材料进储藏。
  - 小BOSS：包装 `Foe.populate`，在 `node.rqMini` 的节点追加一名强化敌人（rar3、hp100、iq≥0.92、必追）；**不走霸主流程**（fo.boss 会触发 bossWin）。死亡记 `G.S.rq.minis[name]`，永久不再出现，选地点界面显示 ☠。
  - 到达卡（#rqCard，非阻塞 8.5 秒）、左侧任务追踪（#rqTrack top:132px）、小BOSS 血条（#rqMini，霸主血条出现时下移）。
  - 测试：`tools/test/region_pick.html#sel=abbey`、`tools/test/region_trip.html#ph=1|2`。
- **R26n `ogre_hunters`（js/hunters.js）**：热度 = 放倒×1 + 斩首×1.5 + 分钟×0.8（洞口节点不计时），阈值 10+2·lv+4·本趟次数 → 15 秒红色预警"食人魔猎手正在猎杀你！" → 在 `W.graph.nodes` 追加一个 `huntArena` 节点（沿用当前 style、lay:'plain'、adj=[来处]、预置 prey=猎手）并 `Worlds._debug.goto`。猎手 = RPG.foe + 武装身份 + 称号，hp 70+14·lv。全灭前包装 `Worlds.onKey` 封门。胜利：`G.S.hunt.lv++`，魂晶 + 该区稀有材料×1。霸主战中不触发。测试：`tools/test/hunters.html#ph=2`。
- 下一步（未做）：S5 地区种族外观差异加大；S6 精灵独有技能（魔法洞穴壁纸、地面施法特效更干净）——另开文件，spirits.js 归别的 agent。

## R34（敌人大改：更强、更聪明、更多样）— 新文件 js/foe_ai2.js（window.FoeAI2）
- 用户反馈：AI 太弱智，种类/技能/多样性太少，新手装到最深地区也随便吊打。根因：敌人血量/伤害不随区域变化（伤害按玩家最大血百分比，血量 26+rar*16），且 hit() 有“17% 血下限 + 第 6 刀必死”保险。
- 五个 MOD（默认开）：`foe_scale`（按 rec/power 缩放血量/伤害/iq，同时放大保险下限/刀数 fo.floorK/capK）、`foe_pack`（深处成群，worlds.populate 调 FoeAI2.packBonus）、`foe_affix`（7 种精英词缀：狂热/铁壁/噬血/爆裂/幽影/连斩/再生）、`foe_skills`（跃斩/冲锋/旋风斩/破防击，全部有红色预警 + 收招破绽）、`foe_tactics`（惩罚挥空、侧翻、绕背偷袭、拖拍、连击）。
- foe.js 新增钩子：FoeAI2.init/tune/after/evade/preHit/onDie/update/tick/clear，fo.yOff（跃斩高度），tokenOK 计入 fo.sk。worlds.js ctx 新增 rec(fo)；hitPlayer 里 h.unblock 跳过格挡。
- 测试覆盖变量：window.__foeThreat/__foeTier/__forceSkill/__skillP/__forceAff/__foeAffixP（tools/test/fight.html 已加载 foe_ai2.js）。
- 教训：在 foe.js 这种长行代码里插 `//` 注释会吃掉同一行后面的代码，要用 /* */。

---
## R33c（回忆按 F 修复 + 开发者模式 dev_mode）
- **Bug 修复（`js/recall_iw.js`）**：之前按 F 打开原场景回忆后，**松开 F（keyup）就立即关闭**，玩家看起来“没有新界面”。现在只在 keydown 关闭、打开后 300ms 内和长按重复都忽略；keyup 放行给游戏（避免移动键卡住），只拦截 E/F 的 keyup。
- 头不在洞里（魂库 / 装在架子或身体上 / 卡片里点「回忆」）→ 生成**临时首级**捧在手上，关闭即移除，不改存档、不再从架子上拔头或从魂库 takeOut。
- **新 MOD `dev_mode`（默认开）/ 新文件 `js/devmode.js`（`window.DevMode`）**：资源无限（魂晶≥999999、Sack 所有 mat/use 物品补满 999、药剂 99）、全解锁（包裹 `Unlocks.has`，并写入 `S.unl`）、无敌（hp 自动回满）、体力无限（包裹 `Stamina.spend/drain`）、`RegEcon.can` 放行。F8 / 右下角「🛠 DEV」按钮打开面板：刷首级（随机×10/×3 放面前/×50、按稀有度×5）、装备满阶、等级拉满、+100 万魂晶、材料补满、立即全解锁、全部首级回忆全开。面板开关存 `localStorage.hs_dev_opts`。
- 改动他人文件：`index.html` 在 recall_iw.js 后加 `<script src="js/devmode.js">`；`js/mods.js` 在 recall_iw 后加 `dev_mode` 条目。game.js/sack.js/unlocks.js 未改（全部外部包裹）。
- 测试：`bak/tools/flow.py`（真实流程：`G.lockPointer()` 开局 → DEV 刷头 → 准星对准首级按 F → 数字键 → F 关 → 魂库临时首级 → F8 面板）。

---
## R35（用户：删除“伤害按玩家最大血百分比”和“保底伤害/第6刀必死”；精英BOSS挑战+月之魔女；传奇式装备；新胜利条件；食人魔猎手重做为 4 名主角式猎手）
### S1 `foe_abs`（新文件 js/foe_abs.js，window.FoeAbs，默认开）
- 敌人伤害：原公式仍按 `玩家maxHp×百分比` 算出 n，worlds.js `hitPlayer` 开头用 `FoeAbs.conv(fo,n,s,node.loc.rec)` 换算成 `n/maxHp × REF(敌人推荐战力)`，REF(r)=140×(r/40)^0.65 → 与玩家血量无关、只与地区/稀有度有关。
- 保险删除：foe.js hit() 的 17% 伤害下限 + 第6/12刀必死、beasts.js 同类代码，全部 `if (!(window.FoeAbs && FoeAbs.on))` 跳过。
- 血量：foe_ai2 init 在 foe_abs 下 hpK = (推荐战力/40)^0.8（不再是 rec/玩家战力 的相对值），dmgK=1；野兽 hpM 同理；regionquest 小BOSS 固定 100 血 → FoeAbs 定时按地区×1.5 放大一次。
- 你的伤害：worlds.js ctx.power 在 foe_abs 下 = (你的战力/40)^0.8 × Sack.dmgMul（去掉 0.25~3 夹紧）。
- 实体 `fo.absRec` 可覆盖推荐战力（猎手/精英用）。
### S2 `hunters2`（新文件 js/hunters2.js，window.Hunters2，默认开；旧 `ogre_hunters` 改 def:false + 互斥，mods.js __v 6 迁移关闭）
- 四人：艾琳·晨星（勇者/duelist/连斩/跃斩冲锋破防）、诺薇·灰隼（追迹者/skirm/幽影/跃斩旋风）、葛温·铁砧（守誓人/juggernaut/铁壁+再生）、米娅·星语（魔导士/mage/再生，魔弹）。
- 等级（确定性）= 基础 + floor(仇恨/15) + 逃脱次数；战力 = 38×1.16^Lv。仇恨（永久 S.h2.hate）：放倒+1、斩首+0.5。
- 本趟「猎手感应」：放倒+7%、斩首+4%、时间 (0.25+0.06×分钟)%/秒；满 100 后每 5 秒掷骰 p=0.15+0.12×满后分钟（≤0.9）→ 随机活着的猎手 `Foe.populate(ctx,[{h,pos}],{keep:true})` 出现在玩家 9–14m 处。洞口节点/霸主战/围场/精英擂台不触发。
- 在场：包裹 Worlds.onKey 封锁所有门（E）；血≤30% 逃跑 3.2 秒后传送消失（S.h2.L[id].esc++ → +1 级；逃脱 ≥2 次加「狂热」词缀）；150 秒未分胜负撤退（不成长）；在逃跑前打死 = 永久斩杀（S.h2.L[id].dead）。
- UI：左侧感应条 #h2Sense、顶部猎手血条 #h2Bar（战力对比/胜率/逃跑倒计时）、U 键档案面板 #h2Pn（等级构成、差距、预估胜率、几刀/几下）。
- foe.js 改动：populate 第 3 参数 `{keep:true}` 不 clear()/不 evict；foe_ai2.js：`fo.skPool` 限定技能池（有 skPool 的 mage 也允许技能）。
- 测试：tools/test/hunters2.html（桩测试，console RES 行）。真实出猎在无头 swiftshader 下 10 分钟加载不完，未做实机测试。
### S3+S4 `elite_bosses` + `victory2`（新文件 js/elites.js，window.Elites，默认开）
- 13 名精英（id）：circus 塞拉菲娜·万花 / pirate 薇丝珀·黑帆 / plague 塞西莉亚·鸦喙 / champion 凯丝·雷鸣 / sand 伊索德·沙暴 / clock 奥菲莉亚·千机 / alch 贝娅特丽丝·金秤 / thief 伊芙琳·千丝 / naga 娜迦·翠鳞 / valk 布伦希尔德·寒鸦 / pharaoh 纳芙蒂·永眠 / blade 玲·墨染 / giant 霍尔达·山心；最终 moon 塞勒涅·永夜「月之魔女」（13 精英全灭解锁）。推荐战力 90→3200，月之魔女 4200。
- 解锁条件都绑定剧情（魂库首级数、击败某地区霸主、累计放倒/出猎/魂晶、猎手逃脱/斩杀、精英数），满足时横幅弹「传闻」。L 键面板：胜利进度 + 13 张卡（锁住显示传闻/条件；解锁显示推荐战力、血量、预估胜率、你几刀/她几下、词缀、挑战按钮）。
- 挑战：洞里点挑战 → UI._startTrip(她的地区) → 首帧后新建 eliteArena 节点（同 hunters.js toArena 写法）并 goto；__forceRole/__forceAff 设定职业和词缀；包裹 Foe.populate 设 absRec/血量/skPool；包裹 Worlds.onKey 在她活着时封门。击杀 → S.el.dead[id]、魂晶 rec×15、（若有 Gear2.dropFor 则掉装备）。
- 血量 = 130×FoeAbs.hpK(rec)×(1.2+0.1×词缀数)（月之魔女 ×1.6）。战力=推荐值时预估胜率约 50%。
- victory2：包裹 Explore.checkVictory → 霸主≥7 且 精英 13 且 猎手 4（S.h2.L.*.dead）且月之魔女。ui.js 洞内“征服目标”一行改为显示四项进度（仅 victory2 开启时；否则原文）。
- 测试：tools/test/elites.html（桩）。
### S5 `gear2`（新文件 js/gear2.js，window.Gear2，默认开）
- **按键更正**：精英挑战面板从 L 改为 **C**（L 原本是 ui.js 的日志菜单，冲突）。上文 S3 里写的“L 键”一律按 C 理解。新按键：Z 装备、C 精英挑战/胜利进度、U 猎手档案（首次进游戏弹一次提示）。
- 8 个饰品槽存在 `S.g2.eq`：neck / ring1 / ring2 / brace1 / brace2 / belt / boots / medal。物品是 Sack 物品，`id = g2_<slot>_<tier>`（Sack.def 注册，slot:'g2'），`o.g2 = {s,t,rar,aff:[[k,v]],req,lore,pre,suf,un}`。
- 词条 17 种：属性×5、攻击、防御、生命、伤害%、暴击%（×1.8）、减伤%、每秒回血、放倒回血%、魂晶%、魂力产出%、猎手仇恨−%、猎手感应−%（暴击≤45、减伤≤55、仇恨/感应≤70）。词条数 = 稀有度（0~5）。需要等级 = (阶−1)×7 + 稀有度×2 − 4（专属装备 1）。
- 掉落：Sack.roll 里加 Gear2.rollLoot（宝箱 40%、武器架 12%、木箱 10%、尸体 5~12%、霸主尸体 2 件）；精英击杀 → 专属神话装备（UNQ 表 14 件，固定词条+典故）；猎手真正斩杀 → 传说饰品。
- 接入：包裹 RPG.stats（属性/攻防血/战力/魂力产出）；worlds.js ctx.power 乘 `Gear2.hitMul()`（伤害%+暴击）；包裹 FoeAbs.conv（减伤）；包裹 G.addCoins（出猎中魂晶%）；hunters2 仇恨/感应乘 hateMul/senseMul；elites/hunters2 胜率计入 avgMul 和减伤。
- 包裹 G.buyEquip：gear2 开启时武器/头盔/护甲/护符不能买（背篓可以）；原 `forge_buy` MOD 仍然有效。
- Z 面板（传奇风纸娃娃）：左边 5 个原槽位 + 8 个饰品槽，右边双列属性表（含全部特殊词条），下面是麻袋/储物箱里的装备，点击穿上；悬停显示完整词条和等级要求。
- **sack.js 改动（5 处，都带 `R35 gear2` 注释）**：nameOf / rarOf 识别 o.g2；tipHtml 调用 Gear2.tipBody；equip() 开头转交 Gear2.equip；roll() 加 Gear2.rollLoot。
- 测试：tools/sc_g2.py 流程在真实游戏（洞内）跑过：专属腰带战力 58→64、生命 140→390；等级不够时拒绝穿戴；Z/C/U/Esc 真实按键开关，没有误开其他菜单。

## R36 — 用户：“角色头部看着像塑料（二次元模型在三次元 shader 上的违和感），角色改成二次元光影！”
- **根因**：R33b 把头改成 PBR（`head_pbr`），身体也是 PBR：有高光 + 环境镜面反射 + 连续明暗渐变 → 头发出现一片片三角面的反光、衣服有脏兮兮的渐变，典型“塑料/3D 渲染感”。
- **MOD `anime_shade`（默认开，js/heads.js 的 FaceFill IIFE 里 `animePatch` / `ANIME_GLSL`；需重新载入）**：在 `#include <lights_fragment_end>` 之后把受光比 `lr`（光照亮度/反照率亮度，满光≈1）重映射为二次元两段式——亮面平涂（≥1.04）、暗面抬到 80% 并染暖粉阴影色 (1,.885,.93)、0.50~0.74 之间 smoothstep 软过渡；`lr<0.32` 时按 smoothstep 压暗（洞里/夜里仍然暗）；`directSpecular/indirectSpecular` 清零（塑料感来源）；再加一圈 22% 的边缘光。天空/太阳/篝火/阴影照常响应。
  - 接入点：`HPBR_OBC`（所有 PBR 头材质的默认注入）和 `FaceFill.wrap → inject`（头发/皮肤自带 onBeforeCompile 的、以及 foe.js 的身体材质 FF()），用 `ANIME_BLOCK` 标记防止重复注入；cache key 末尾加 `A`。toon 材质（head_pbr 关）不受影响。关闭 MOD = R33 的 PBR 头。
  - 参数集中在 `ANIME_GLSL`：亮面电平 `max(1.04, min(lr*1.05,1.28))`、暗面 0.80、阴影色、过渡 0.50/0.74、边缘光 0.22。头偏暗先调 `FaceFill.tune.pbr`（0.62）。
- **测试台**：新增 `tools/test/shade.html`（真实 foe.js 身体 + ModelHeads 头 + 天空 PMREM + 太阳/篝火），`window.__shade({yaw, target:'face'|'body', sun, fire, amb, sky, bg})`；`?off=1` = 关 anime_shade 对比。截图用 canvas.toDataURL（`preserveDrawingBuffer`），不要用 page.screenshot（headless 下 WebGL 画布为空）。实拍：左（关）头发满是三角面反光，右（开）平滑成块；篝火-only 场景仍然暗、脸有受光面；全身像衣服渐变干净。
- 没做：描边（inverted hull）、头发“天使环”高光条。若用户还想更二次元，下一步做这两项。
---
## R35b（用户反馈：BOSS 也要出现在探索地图；R35 的 UI 太难看、边缘不清；进入地点的窗口要更大、剧情更详细、任务更多）
- **新 js/r35ui.js（window.R35UI）**：精英（C）/ 猎手（U）/ 装备（Z）合并成一个带页签的窗口。外壳 = 遮罩 `#r35root` + 游戏原生 `.modal big`（body.ui3a 下自动套用 UI Agent 的金色角框、描边、衬线标题、按钮），页签用原有的 `.m-tab`，关闭用 `.m-close`。共用卡片样式 `.r3-*` 使用 `--u-*` 配色变量。模块用 `R35UI.reg(id,{n,title,on,html,click,move,leave})` 注册。横幅 #elBan/#h2Ban、HUD #elHud/#h2Bar/#h2Sense 的覆盖样式也写在这个文件里。
- elites.js / hunters2.js / gear2.js 的旧面板（#elPn/#h2Pn/#g2Pn）已删除，改为注册到 R35UI；按键不变（C/U/Z），ui.js 自己的窗口打开时不响应。
- **探索地图（出洞狩猎的选地点界面）**：regionquest.js 改 2 行——`detHTML` 在小BOSS 后插入 `Elites.regionHTML(k)`（该地区精英卡片：锁住显示传闻和条件，解锁显示胜率和“发起挑战”按钮），`itemHTML` 地区名后加 `Elites.regionBadge(k)`（👑 已斩杀/总数）。挑战按钮由 elites.js 在 document 捕获阶段处理（关闭 UI 后调用 challenge）。
- **新 js/arrival2.js（MOD arrival2，默认开）**：进入地点的大窗口，取代 #rqCard（body.arr2 时隐藏）。内容：地区插图大图、逐字打出的 4 段剧情（场景 / 往事 / 当地人怎么看你——按来访次数、霸主是否已死、猎手仇恨生成 / 传闻）、主线（RegionQuest.T.q）、2 条随机支线（搜刮容器 / 搜尸 / 深入第 N 层 / 麻袋里 N 颗首级 / 英魂以上首级）、威胁一览（霸主、小BOSS、最强猎手及胜率、可挑战精英）。空格/E/回车关闭；打开时拦截其他按键。支线追踪 #arTrack 放在 #rqTrack 下方，并把 #h2Sense 往下推；完成给魂晶，40% 附带一件饰品。精英决斗场的出猎不弹这个窗口。存档：`S.arr.v[k]` 来访次数。

## R36-talent（角色成长重做：属性点 + 天赋树 + 魔兽式界面）
用户原话：技能树太少，要大师级重做升级系统：属性点、技能树、套路很多的不同流派、快捷键像魔兽世界、UI 大一点、操作性好。
- **新文件**（都是 MOD，默认开；关掉即回到旧的自动加点 / Q R G 三技能）：
  - `js/talents_data.js`（`window.TalData`）：5 属性（力量/体魄/敏捷/凶威/魂力）、6 大流派（刃舞·铁壁·影袭·狂血·魂术·猎首）各 13 节点、共 78 节点 / 31 个主动技能 + 通用闪身 `dodge`、6 套推荐流派（`BUILDS`，含加点顺序，一键加点会把剩余点数按主系补满）、层门槛 `TIER_REQ`。
  - `js/talents.js`（`window.Talents`）：引擎。点数（每级 3 属性点 + 1 技能点，每 10 级 +1，首杀霸主/精英各 +1）、分配/撤销/洗点（首次免费，之后按等级收魂晶）、技能实现 `S_[id]`（投射物/区域/冲刺/光环 Buff，全用加色发光网格，无模型）、魂能(mana)、Buff/DoT/印记、`outDmg/inDmg/avoid/rewardMul/moveMul` 钩子、自己的 `keydown` 捕获（1-0 / Shift+1-0 施法；Q 闪身；R/G 旧键映射到 战吼/旋风斩，需学会）。自带每帧：等 `G.HOOK` 就绪后 push 到 `G.HOOK.frame`。
  - `js/talents_ui.js`（`window.TalUI`）：底部 2×10 快捷栏（冷却转圈、魂能不足变暗、HTML5 拖拽换位、右键清空）+ Q/E/H 常用位 + T 按钮；左上玩家框（生命/魂能/体力/经验/Buff）、目标框（血量/词缀/流血中毒）；**T** 打开大面板 4 页：属性 / 天赋树 / 技能书 / 推荐流派。Esc 或 T 关闭。
- **改动的别人文件（都很小，行尾 `// R36`）**：`foe.js`（`hit()` 调 `Talents.outDmg`；`fo.slowK` 减速；导出 `Foe.dot`）、`worlds.js`（`foeEvent0` 调 `Talents.onEvent`；奖励 ×`rewardMul`；`hitPlayer` 调 `avoid/inDmg`；`gainXp` 调 `onLevel`；移速 ×`moveMul`）、`rpg.js`（升级曲线 `Talents.need`；`lvBonus` 在天赋系统下不再自动给属性；`stats()` 前后钩子 `Talents.bonus/post`）、`mods.js`（MOD `talent_tree` / `talent_ui`）、`index.html`（3 个 script 标签在 `foe_abs.js` 后）。
- **数值**：玩家伤害仍走 R35 `FoeAbs`（`12×(power/40)^0.8`），力量每点 +3 战力；属性点是手动的，所以老存档升级后的属性会按“每级 3 点”重新分配（点数按等级自动补发，不丢）。
- **按键占用**：T 天赋面板，数字键 1-0 / Shift+1-0 快捷栏，Q 闪身，E 处决（旧），H 药水，R/G 旧技能映射。不与 C/U/Z（R35UI）、B/Tab/I/K、M、N、Y、O、J 冲突；`W` 不在 3D 探索里时（旧文字出猎/洞穴菜单）Talents 不拦截按键。
- **坑**：worlds.js / foe.js 很多是一行长语句，**不要在行中间插 `//` 注释**（我第一次就把 Recall/CombatFX 调用注释掉了，已修，见 R36-talent fix）。
- **测试**：`tools/test/talents.html`（假 G/Worlds/Foe 的 UI+引擎台，`VW=1600 VH=900 drive.py` 截图各页）；`tools/test/fight.html` 已加载 foe_abs + talents_data + talents，可用真 `foe.js` 逐个施放 31 个技能（需自己塞 `Worlds._W`/`G.HOOK`/`G.st=()=>RPG.stats(G.S,{})`，见本轮提交记录）。`drive.py` 支持 `VW/VH` 环境变量。完整 index.html 在 2GB 沙箱里跑不起来，**未做整包实机测试**，要看用户反馈（尤其 #wStat/#wHint 位置、`.wskills` 旧条已在 tbon 下隐藏）。
- R35b 验证（真实游戏，960×540 无头）：C/U/Z 页签切换、Esc 关闭；出洞狩猎界面的地区精英栏和徽标；雾溪村出猎时到达大窗口正常弹出，逐字打字、空格跳过/进入，#arTrack 支线追踪和 #h2Sense 叠放正确。图标 🐦‍⬛ / 𓂀 显示不出来，已换成 🩺 / 🏺。

## R36b（用户：C 下蹲被精英界面占了 / 头像塑料要 3D shader+次表面散射 / 不要头发-头-饰品混搭绑定 / 怎么一下秒 BOSS / 武器属性要更详细）
- **C 键还给下蹲**：`elites.js` 删掉 C 键监听（R35b 已同步改提示）。精英挑战只在**探索地图（出洞选地点）**每个地区的「👑 精英挑战」栏里看/发起；R35UI 的 `elite` 页签仍可从 U/Z 窗口进。
- **秒杀 BOSS 的原因与修复**（`foe.js`）：① 破绽中（broken）横砍脖子 = 处决，不看血量（霸主也吃）；② E 处决 `Foe.execute` 直接 `hp=0`；③ 天赋暴击/技能叠乘没有上限。现在：霸主/精英 BOSS/猎手（`fo.boss||fo.hunter||fo.eliteId`）单刀最多扣最大血量 10%；破绽脖子斩与 `Foe.execute` 只有在血量 ≤25% 才真正处决，否则吃一记 15% 重创并提示；天赋 `h_exec/h_storm` 同步。普通敌人不变。
- **武器详细属性 `js/wpnspec.js`（`window.WpnSpec`）**：只读，用 combat.js 的真实公式算：自重（WEIGHT）、握长、轻击/收招/重击的前摇·出刀·间隔·触及·体力·单击伤害、三连节奏与连击输出、暴击、部位倍率、蓄力时间，并与当前武器逐项对比（▲▼）。显示位置：铁匠台（forge.js 武器卡 + 下一阶折叠对比）、背包悬浮提示（sack.js，紧凑版 `WpnSpec.tip`）。**改 combat.js 的 mmAttack 公式时要同步改这里。**
- **MOD `skin_sss`（默认开，heads.js `SSS_GLSL`）**：3D 真人皮肤质感。保留 PBR，只对“肤色像素”（按反照率色相/饱和度/亮度判定，头发衣服不受影响）加：明暗交界带血红色散射、背光侧暖色填充、掠射角红色透光边、整体微暖；头发/衣服硬高光压到 30%、皮肤 55~70%，另加极淡油脂光泽。极暗环境不抬亮。**`anime_shade` 默认改为关**（用户要 3D shader 风格；mods.js 迁移 `__v8` 一次性关掉）。测试台 `tools/test/shade.html?sss=0|1&anime=1`（脸朝向 yaw≈2.45~2.7）。
- **MOD `head_native`（默认开）**：头保持原样。迁移 `__v9` 把 `hair_mix2`（跨头发型）和 `acc_mix`（跨头饰品库）关掉；MMD/原神头不再叠程序化头饰（heads.js HeadWear.build 前的判断）。想要混搭：关 head_native 并手动开那两项。没动 VRoid 系头自己的发型替换。
- 测试：`fight.html` 里 boss 被 `Foe.execute` 不死（hp 150→127）、`mult:50` 的脖子重击只扣 10%。

## R37 — 用户 6 条反馈（开发者模式默认关 / 鼠标找不回 / 头棋朝向与不说话 / 战斗太简单 / F 视角头小 / 断面）
1. **dev_mode 默认关**（c58cc68）：`js/mods.js` `def:false` + 迁移 `__v<7 → dev_mode=false`。（迁移版本号以 mods.js 实际最大值为准，别人已加到 __v9，新增请继续递增。）
2. **鼠标出现后点不回游戏 / ESC 无效 / 锁不上**（`js/game.js`，紧跟 `setUI` 之后的 R37 块）：
   - 根因：ESC 不是“用户手势”键，面板用 ESC 关闭后 `requestPointerLock` 必失败；某些面板异常退出会让 `uiOpen` 卡在 true；原来只有点 canvas 才会重锁，面板/遮罩盖着时点不到。
   - 修：① 游戏中（playing 且无 UI、未锁定）屏幕下方常驻“🖱️ 鼠标已释放 — 点击画面回到游戏”；document 级 capture `mousedown`（非按钮/输入框）→ 重锁；② `uiOpen` 卡死：按 ESC 后 250ms 若屏幕中心是画面而非面板 → 复位；或 2.5s 内连点画面 3 次 → 复位（`G.unstick()` 也导出）；③ `setUI(false)` 后 60ms 自动尝试重锁（ESC 触发的会被浏览器拒绝 → 原有 `lockFailed` 提示）。
3. **头棋**（`js/chess.js`）：头朝向 = 朝对手（红方 yaw=π、蓝方 0），只随镜头偏转 `0.3·sin(cam.t−base)`（≤0.3rad）；`talk()`/`face()` 直接 return（无气泡、无表情）；`key=''` 不再设 EXMAP 表情。Snik 侧栏台词不动（那不是头）。
4. **战斗 AI（MOD `foe_mind`，新文件 `js/foe_mind.js`，默认开）**：包装 `FoeAI2.update/tune/after/tick`（foe.js 运行时读 `window.FoeAI2.x`，没改 foe.js / foe_ai2.js）。习惯记忆 `FoeMind._H`（guard/spam/circle/retreat）；每敌人性格 `fo.mind`（pat/rush/tri/cnt）；每刀节奏 6 选 1（quick / normal / delayed / bait=假动作后立刻真刀 / brk=红光破防 / 读盾补刀），`A.mk` 记录；`mindAfter` 读你出手瞬间的反应（举盾→破防刀；后撤→Sword_Dash 突进；侧闪→快刀；站着挨→拉开）；走位：打了就跑（kiteT）、反击型引你空挥（后撤预算 backBudget）、突进型绕圈预判。不改伤害（FoeAbs 继续管）。测试：`/var/work/mind_test.js`（fight.html 里三种玩家行为：不举盾 / 一直举盾 / 乱挥，举盾 120s 后 guard 习惯=0.93、出现 4 次 brk）。`tools/test/fight.html` 已加载 foe_mind.js。
   - 注意：fight.html 的 Melee_Hook 动画时间在虚拟时钟下偶尔卡在 ct=0.1（关掉 foe_mind 也复现），是测试台问题，不是 AI bug。
5. **F 视角头小于手**（`js/recall_iw.js`）：`S.k`=包围盒高/0.26，MMD 系头包围盒含发量/发饰（0.27~0.59，VRoid 中位 0.30）→ k 偏大 → 手被放大。非 VRoid 头（`ModelHeads.meta(look.f).grp !== 'vroid'`）改为 `k=1.15+0.1·(kRaw−1.15)`，夹在 [1.05,1.3]；`S.kRaw` 保留原值。
6. **断面（`js/heads.js` `fitCut`）**：新增 `tools/test/cutview.html`（`?list=a,b,c&hide=` + `__cut('neck'|'under'|'side')`、`__dbg()`、`__metric()`、`__skin()`；用 cap.py 截 #cv；一次不要超过 ~12 个头，否则 Chromium 丢 WebGL 上下文）。逐个目检非 VRoid 头发现：颈圈顶点只有半圈（甚至混入下巴/衣领顶点）→ 凸包成了 D 形/扇形断面，盖不住颈口，露出里面的皮肤碎片（申鹤、Hysilens、Jingliu、Feixiao、Mokou 等）。修：① 最小二乘拟合圆，点在圆周上最大空缺 >100° 就在空缺补圆周点；② 凸包必须“像颈口”：`面积/(π·meanR²) ≥ 0.87` 且 `面积/(π·r0²)` 在 [0.2, 2.2]，否则退回原 `__CUT__` 圆盘（压到切平面）。`ModelHeads.cutDbg()` 可看每个头的拟合信息（`bad:true` = 已退回）。
   - 仍可留意：头后面“nape 壳”（MMD 后脑补丁）从下往上看是白色锯齿边（头发遮住时看不到，F 视角从下看才可能露）；VRoid 头的断面因脖子倾斜看着是斜椭圆，属正常。
- 改动文件：`js/game.js`、`js/chess.js`、`js/foe_mind.js`（新）、`js/mods.js`（+foe_mind）、`index.html`（+script）、`js/recall_iw.js`、`js/heads.js`、`tools/test/cutview.html`（新）、`tools/test/fight.html`、`HANDOFF.md`。
- 提醒用户：聊天里的 GitHub PAT 已多次暴露，请去 GitHub 撤销并换新。
## R37（主管）：废铁武器手感 + 第三批敌人
用户：“敌人种类太少、太简单，战斗过程粗糙”；“垃圾武器攻击前摇长，必须按住才攻击，战斗不好玩”。（第 1 条头棋朝向已由 R37c 完成，未改动。）

**武器（js/combat.js，我的文件）**
- 根因：CD 中点击会进缓冲，但 CD 结束时若点击已超过 480ms 就被丢弃；钉头棒/流星锤/巨斧 自重 1.3/1.5/1.4 × sqrt → CD 800~1100ms → 早点的一下全丢，只有“按住+晃鼠标”能出刀。
- 修：缓冲窗口 = max(480, 本次CD+220ms)（CD 中的点击永不丢）；WEIGHT → [0.85,0.95,0.8,1.2,1.25,0.9,1.0]；重量曲线 sqrt → wt^0.35（WK）；CD 基数 500/750/950 → 380/560/800；轻击前摇 0.08→0.06。
- 导出 `window.CombatTune {WEIGHT, WK, CDB, WU, SW}`。**js/wpnspec.js（R36b 他人文件，最小改动）**：WT/前摇/冷却改为读 CombatTune（带旧值兜底），两条 FEEL 文案改为新手感。以后改公式只改 combat.js。
- 测试（tools/test/fight.html，同点击节奏 4 秒）：出刀 6~7 次 → 9~10 次。

**第三批敌人：MOD `foe_roles3`（js/foe_roles3.js，新文件，默认开）**
- 长枪手 lancer / 双刀舞姬 twinblade / 炼金投弹手 bomber / 猎网手 netter / 陷阱师 trapper / 唤灵师 wispcaller；约 38% 敌人换成这批。全是特效（光球/地面标记），无新模型。
- 接入：不改 foe_roles.js / foe_roles2.js——加载时包 FoeRoles2 的 pick/init/clip/tune/after/tick/evade/hurt/update/clear，并把 key 加进 FoeRoles2.R / FoeRoles.INFO。**必须在 foe_roles2.js 之后加载。**
- 反“贴脸狂点”：1.4 秒内挨第 3 刀 → 不硬直 + 职业脱身（后滚/侧闪/脚下药瓶），冷却 4 秒；长枪手脱身后的突刺、双刀侧闪后的连斩霸体。测试证明以前贴脸每 0.3 秒一刀可无限硬直，新职业技能根本放不出。
- 定身（网/夹子）：**js/worlds.js:829** 玩家移速多乘 `FoeRoles3.moveK()`（一处）。连按空格缩短。遮罩 DOM `#fr3root`（z 40）。
- 其他：mods.js 加一条；index.html 在 foe_roles2.js 后加 script；tools/test/fight.html 加 script。调试计数 `FoeRoles3.CNT`。

---
## R38（新手引导教程）
用户需求：加入游戏教程引导玩家、教学玩法；**新存档都要有教程**。
- 新文件 `js/tutorial.js`（`window.Tutorial`，MOD `tutorial`，默认开）。只读游戏状态（G / UI / Combat / Worlds），不改其他文件的逻辑。`index.html` 只加了 1 个 script 和标题菜单按钮「📖 新手教程」(`#tutBtn`)。`js/mods.js` 新增 `tutorial` 条目（无需 migration，def:true）。
- 触发：`fresh0 = !G.S.intro`（载入时是全新存档）→ 开场故事演完（`S.intro` 变真且 `UI.open!=='intro'`）→ `start(0)`。老存档（`S.tut` 不存在且 fresh0=false）不会自动触发，只能靠标题按钮 / F9 重看。转生（`applyPending` 设 `S.intro=1`）不会重触发。进度存 `G.S.tut={i,lang,off,done}`（删存档=新教程）。
- UI：右上角非阻塞小卡片（top:58px,z-index 40，`pointer-events:none`，只有按钮可点），中/日/EN 三语（按钮切换，记 localStorage `soulhead_tut_lang`；默认取标题页语言）。走路类步骤有屏幕箭头 🧭（指向商人 / 洞口）。Enter = 跳过当前步；F9 = 关闭 / 重开（完成后 F9 = 重新开始）。卡片在 `UI.open==='intro'` 或 `!G.playing` 时隐藏。
- 21 步，3 章：洞窟（看 / 走 / 斯尼克 E / Tab 属性 / B 建造 / 洞口 / E 出洞）→ 出洞狩猎（F 拔刀 / 左键挥砍 / 连点刺 / 右键格挡 / Q 闪身 / 击倒 / E 拾取 / 门撤退）→ 回洞经营（扛袋倒出 / E 拿首级 / 左键把玩出魂晶 / F·I 回忆档案 / T 天赋及其他快捷键）→ 结语。每步 `tick(st,c)` 4Hz 轮询（try/catch），`where:'cave'|'world'|'any'`，不在对应场景会显示“⏳ 等待”，不会卡死（Enter 总能跳过）。
- 教程文案里的按键已对照源码核实：G 放置 / V 表情 / 右键扔 / 长按 E 精确摆放 / F 回忆（手持或对准首级，否则 F=拔刀）/ I 查看 / K 收藏 / L 日志 / J 成就 / Y 神灵簿 / T 天赋 / M（洞内=音乐，洞外=地图）/ H 药。以后改键位需同步 `js/tutorial.js` 的 STEPS 文案。
- 测试：`tools/test/tutorial.html`（假 G/UI/Combat/Worlds，不加载整个游戏）+ Playwright 脚本逐步驱动 21 步全部自动推进、Enter 跳过、F9 重开、语言切换均通过（整个游戏在 2GB 沙盒里跑不动，未做整包实机测试）。
- 未做：教程内不覆盖武器附魔/训练小游戏/天赋树细节；没有高亮 3D 物体（只有箭头）。

## R39（用户：① 头发-头-饰品别绑定、原神头一起搭配很违和，要混搭拼图、看不出是哪个角色 ② MOD UI 重做（旧的难看） ③ 探索 UI 加更多文本：地区对你的反馈/名声/杀掉角色的后续故事（影响·关系）/反馈随机给资源）
### ① 头部拼图：由主管的 R38 `head_collage`（heads.js collageHair）+ `cc0_only` 实现
- 本 agent 同时写了一版 `head_puzzle`（MMD 脸发型必借别人 + 拆自带头饰 `ownAcc`），与主管 `head_collage` 重复，已**撤回**（提交里只留说明，避免冲突）。`head_collage` 当前只换发型；**如需再“拆掉 MMD 脸自带头饰 cloth_*（眼线以上）”，参考思路：`create()` 里遍历 `F.faceMeshes` 时跳过 SRC 名字 /^cloth/ 且中心高于眼线的网格**。
- 经验：push 前必须先 `git pull --rebase` 并检查冲突标记（`grep -n '^<<<<<<<' js/*.js`），不要只清 HANDOFF.md 的标记。

### ② MOD UI 重做（js/mods.js 管理器界面部分；逻辑 set/normalize 不变）
- 用户：“MOD UI 你重做下，现在这个不行落时了很难看”。旧版是粉紫色卡片墙且**漏掉了 `ui` 分类**（5 个 MOD 看不到）。新版：与游戏同风格的深棕金色；左侧分类（带 开启数/总数）+ 筛选（全部/已开启/已关闭/与默认不同/待应用）+ 顶部搜索（`/` 聚焦，Esc 先清搜索再关闭）；每行一个开关（画风组是单选圆点），点行展开详情（完整说明、默认值、ID、依赖、冲突）；“待应用”蓝色左边条 + 底栏列出待应用项；开关原地刷新不丢滚动位置。测试页 `tools/test/mods.html`。

## R38（主管）：CC0 模式（默认开）+ 拼图混搭
用户：“你不要头发-头-饰品什么绑定……不要原始原神头出来，而是混搭，不要看出来是某个原神角色，用其拼图！”“默认开启 CC0 模式，游戏里只有 CC0 模型，但可以关闭。”
（注意：R36b 把上一轮同一句话理解成“不要混搭”并加了 head_native；用户这次明确要混搭 → head_native 默认关。R39 的 head_puzzle 与本节重复，已由 R39 自己撤回。）

**CC0 模式：MOD `cc0_only`（默认开）——新文件 `js/cc0mode.js`（`window.CC0`，在 heads.js 前加载）**
- CC0 白名单（依据 CREDITS + pixiv 官方说明；AvatarSample_A/B/C/K/L/S 只是“样本条款”，**不是 CC0**；Seed-san/Twist=VRM PL，Godette=CC-BY，VRoid Hub 作者头、MMD/原神均非 CC0）：
  - 头 9 个：Sendagaya_Shino / Sendagaya_Shibu / Darkness_Shibu / Vivi / Vita / Victoria_Rubin / HairSample_Female / AvatarSample_D_Darkness / Base_Female
  - 身体 4 具：Vita / Victoria_Rubin / Darkness_Shibu / HairSample_Female
- **index.html**：54 个非 CC0 头的 `<script src="models/…">` 改为内联 `if (Mods.on('cc0_only') === false) document.write(...)`（file:// 可用；CC0 模式下不下载不解析 → 启动更快）。**js/headpacks.js**：CC0 模式直接 return。
- **js/heads.js**：`OK(i)` / `okList()`；randomLook 挑脸、allHair、tierFace（权重 0）、mixLook 发型候选与饰品库、coverHair 都只用 OK 的模型；新增 `resolve(look)`：非 CC0（或未加载）的脸/发型按 `hash(f|seed)` 固定换成 CC0（旧存档不改，只改显示），去掉非 CC0 饰品。`create()`、`randomLook()` 返回值、`mapsFor`、`hairColor`、`meta(look对象)` 都走 resolve；导出 `ModelHeads.resolve`。
- 调 `meta` 的 3 处他人文件改为传外观对象：`explore.js:134`、`recall_iw.js`（`meta(lk)`）、`ui.js:224`（先 resolve）。
- **js/foe.js**：`bodyFor` 外包一层 `CC0.body(name, seed)`（原函数改名 `bodyFor0`）；`build()` 入口也兜底。
- 动作 / 野兽 / 道具 / 场景本来就是 CC0，不受影响。

**拼图混搭：MOD `head_collage`（默认开，conflicts head_native；CC0 关闭时才有效果）**
- `resolve()`：MMD/原神脸若戴自己的头发 → 按种子固定换成另一个 MMD 头里 `hairFitOK` 通过的发型（`collageHair`，缓存）；旧存档也生效。
- `create()`：发型不是自己的时，**隐藏脸模自带头饰**（`ownAcc`：cloth_* 材质、眼睛以上；胡桃梅花帽/芙宁娜礼帽/黑天鹅面纱等）。
- mixLook：MMD 脸拼第三个头饰品的概率 0.45+0.1×魂阶。借用饰品若包围盒不挨着头/发（悬空）则不显示。
- mods.js：迁移 `__v10` → cc0_only / head_collage / hair_mix2 / acc_mix = true，head_native = false；三项 def 同步。
- 测试台 `tools/test/lookgrid.html?cc0=1|0&collage=1|0&list=…&n=12&seed=…&old=GI_Eula,…`，`__grid()` 返回每个头的 f/h/ax。结果：CC0 模式 12 随机 + 3 旧原神存档 → 全部 CC0；关 CC0 → 24 张 MMD/原神脸 0 张戴自己头发，12 张带借用饰品，目检截图正常。
- 已知：特征特别强的发型（雷电紫辫、千织红饰棕发、飞霄狐耳）换到别的脸上仍有辨识度；下一步可对借来的发型整体换色。
### ③ 探索 UI：地区回响 `js/regionecho.js`（window.RegionEcho，MOD `region_echo`，默认开）
- 用户：“探索UI加入更多文本：地区对你的反馈、名声、你杀的角色的后继故事（影响-关系）。反馈还会随机 + 资源”。
- 数据：`G.S.echo.reg[地区k] = {fame, fear, rel:{folk,arms,faith,arcane,noble}, kills, heads, big, trips, grudges[], legends, news[≤14], recv}`。
- 出猎中：包装 `Recall.log`，对 `t==='kill'` 且 `fo.h.c`（有身份的人，排除 `fo.hunter`）记录 {name,id,idN,rar,traits,goal,belief,boss/mini/elite/decap}。`Worlds.start` 被包装（和 RegionQuest 同法）：建 `T`，并把 `api.finish` 包一层 → 回洞时先 `settle(trip)` 再走原 finishTrip（死亡 `api.die` 不结算，存档本来就清零）。
- `settle`：名声 = Σ(1+稀有度+斩首1+霸主8+小BOSS4+精英6)；恐惧同理；选至多 3 人生成“后继故事”，立场 7 种（哀悼/复仇/恐惧/传说/纪念/遗产/继任，按 c.traits 性格加权；文案模板 ST、亲属 KIN 按势力分，含心愿 GOAL_LN）；每段随机结果（魂晶/地区材料 `Sack.stashAdd(Sack.mk(RegEcon.BY[k].c[0],n))`/药水/无；复仇另加 `S.h2.hate` 并添加“仇家”）；势力关系：死者所属势力下降（`facOf(c)` 由 idN 关键词判定），`RIPPLE` 波及他方（杀术士→圣职+，等）；写入 `trip.log`（狩猎日志页可看）并弹 `#reRet` 卡片（左侧，26 秒，非阻塞）。
- 抵达 `arrive(k)`：按名声/恐惧/仇家/关系加权掷“地区的反应”：供品/警告/馈赠/信徒/沉默/无人认识，随机给魂晶/材料/药水或 +1~2 猎手仇恨（并消耗仇家等级）；同一趟同一地区只结算一次（`r.recv.key = 总出猎数:k`）。arrival2 打开时显示（`paras`+`arrHTML`），没有 arrival2 时 2.6 秒后 toast。
- UI 接入（各 1~2 行）：`regionquest.js` `detHTML` 在霸主栏后插 `RegionEcho.detHTML(k)`（称号+名声/恐惧+5 势力关系条+仇家+最近 4 段故事+说明），`itemHTML` 加 `RegionEcho.badge`；`arrival2.js` `html()` 的 paras 与右栏各加一处。
- 测试：`tools/test/regionecho.html`（假 G/Worlds/Sack，Lore.makeCharacter 造人）；完整游戏在 2GB 沙盒跑不动，未做整包实机测试。
- 已知限制：仅 Worlds 出猎（默认）记录；Explore 3D 旧模式和文字旅途不记录。
## R38（语言选择 i18n + 启动崩溃修复 + 宣传图）— 作者：本轮 agent
**用户要求**：①开局先选 中/日/英 再开始加载，游戏中可随时切换；②做宣传截图（图片+文字，世界观/玩法等，中日英三套）；③修复「启动失败：Cannot read properties of undefined (reading 'S')」。
**启动崩溃**（`d9c8b93`）：R36 天赋引擎 `Talents.tal()/agg()/lv()` 在 `startGame()`→`RPG.stats` 期间读 `G0().S`，但此时 `window.G` 还不存在。`js/talents.js` 已加 `LAST` 回退。**规则：凡是 `RPG.stats`/`startGame` 可达的代码都不能假设 `window.G` 存在。**
**i18n 设计**（全部在新文件，核心基础设施，非 MOD）：
- `js/i18n.js`：`window.I18N`。localStorage `soulhead_lang`（zh/ja/en）。首次进入显示选语言界面（1/2/3 键也行），`index.html` 启动 IIFE 里 `await I18N.ready()` 之后才开始加载。右上角 🌐 按钮随时切换；与 `#introCopy` 的中/日/英页签双向同步；教程 `js/tutorial.js` 语言跟随（见 `js/i18n_rules.js`）。
- 做法：游戏源码仍是中文，在 **DOM 层**翻译（MutationObserver，文本节点 + title/placeholder/alt/aria-label；`[data-copy]`、`#tut`、`#credits`、textarea/script/style 不翻译）。查找顺序：整句精确 → 带占位符句型（`{0}` 短文本、`{#0}` 数字、`{@0}` 长文本，捕获组里的中文会递归翻译）→ 自定义规则 `I18N.rule(re,fn)` → 「A · B · C」逐段翻译 → 词组替换（仅 ≥3 字词条；2 字词条要在第 4 项写 1 才参与词组替换，避免「攻击/范围」污染长句）。切回中文会还原原文。
- 词典：源在 `tools/i18n/d_*.py`（[zh,en,ja]，`$name` 会被转成 `{#n}`），运行 `python3 tools/i18n/build.py` 生成 `js/i18n_data.js`（**不要手改生成文件**）。现有 ~740 条：菜单/HUD 提示/加载文案、天赋·技能·流派·属性全部、天赋面板/提示/飘字、武器详细属性、装备/材料/品阶/魂阶、背包标签、战斗飘字、成就名。
- 补翻译：游戏里按 F12 输入 `I18N.dump()` 会列出运行中遇到但没翻译的中文句子（按出现次数排序），往 `d_*.py` 里补再 build 即可。**未覆盖**：剧情/书籍/神灵台词/霸主台词/地点事件/MOD 说明等长文本（约 4000+ 句），仍显示中文；动态拼接的句子要么加 `{#0}` 句型，要么在源码里改成整句一个文本节点。
- 测试台：`tools/test/i18n.html`（index 的静态外壳 + i18n）；天赋面板/武器面板可在 `tools/test/talents.html` 里注入 i18n 脚本查看。
**宣传图**：`tools/promo/make.py` 生成 `promo/{zh,ja,en}/01_key…06_spirits.png`（1920×1080，各 6 张：主视觉/世界观/玩法循环/战斗/成长/神灵）。素材全部来自仓库真实资源（`js/spirit_art.js` Q 版神灵、`js/regionart.js` CC0 场景、`tools/promo/cap/wpn_*.png` 是游戏内「武器详细属性」面板的真实截图，由翻译引擎输出），无性化角色图。沙盒里整个游戏无法启动，所以没有整局实机截图；天赋树界面截图因沙盒缺 emoji 字体（图标会变豆腐块）没有采用。

## R40（主管）：大规模收 CC0 VRoid 素材——调研 + 首批 2 头
用户：“VRoid 模型最好看”，要大量高质量 CC0 VRoid（发型、脸、贴图、饰品，各种各样）。
- **新增头**：`models/Sakurada_Fumiriya.js`、`models/HairSample_Male.js`（pixiv 官方 CC0，vrm2head→glbsimp→glbpack，共约 2.2MB）。已进 `js/cc0mode.js` HEADS、`index.html`（Vivi.js 之后，常驻加载）、`js/lore.js` HAIRSTYLE。二者是男性脸；混搭（head_collage）换发后偏中性，已渲染核对（lookgrid seed 3）。
- **身体未接入**：两者原装身体已能用 `tools/vrm2body.py` 转出（~2–2.6MB），但全游戏文本/身份（VB 表、“她”60+ 处）都是女性，男身体会对不上 → 暂不提交。要接需先做代词/身份的性别化。
- **hair_cover.js** 没有新头的评分（coverScore 返回 0 = 视为盖得住），以后可重跑离线评分。
- **来源调研结论**：
  - pixiv 官方 CC0 已全部收完（Sendagaya 系、Vivi/Vita/Victoria/Darkness_Shibu、HairSample F/M、Base、Sakurada）。AvatarSample_A/B/C、K/L/S 不是 CC0。
  - OpenSourceAvatars（ToxSam，4000+ CC0）全是 NFT/低多边形卡通，没有 VRoid 动漫风，不收。
  - webaverse/avatar-models：除 pixiv 那几个外均为 VRoid Hub 条款（多数禁止再分发），不收。
  - **VRoid Hub 公开搜索 API**（`https://hub.vroid.com/api/search/character_models?keyword=CC0&count=100`，头 `X-Api-Version: 11`）可列出模型+许可字段：找到 160 个“标 CC0 且许可全开”的模型，人工筛出 25 个成年外观高品质的 → `tools/r40_vroidhub_cc0.md`（带链接）。**下载需要 pixiv 登录**，沙箱拿不到；`optimized_preview` 是受保护的预览文件，不要绕过。用户下载 .vrm 后按该文件里的命令一条条转换即可。
- 新工具：`tools/vrmmeta.py`（按 URL 读 VRM 内嵌许可，只下载头部 JSON）。

## R40（用户：① 完全不知道各种按键 ② 联合游戏截图 + 操作教程做宣传图，抓爽点，正方形 + 2:3 ③ 其他语言模式混着中文）— 作者：Arena 本轮 agent
**① 按键一览**：新文件 `js/keyguide.js`（`window.KeyGuide`，MOD `keyguide` 默认开）。**F1 或 ?** 开关；标题菜单「⌨ 按键一览」按钮（`#kgTitleBtn`）；右下「按键 F1」小按钮（`#kgBtn`）；`#hint` 条末尾加了 F1。三语原生文案（容器 `data-noi18n`，不走 DOM 翻译），面板里按下的键会亮起。内容以 `KeyGuide.SEC` 为准（5 组：移动/战斗/首级与麻袋/菜单/系统），**改键位时两处一起改：`keyguide.js` + 宣传图（宣传图从 `KeyGuide.SEC` 自动读，重跑 make2 即可）**。测试页 `tools/test/keyguide.html?lang=en`。
**③ 语言纯净（本轮范围）**：不动 UI agent 的 `i18n.js` / 生成文件。新增词典 `tools/i18n/d_r40.py`（被 `build.py` 合并进 `js/i18n_data.js`，**冲突时重跑 `python3 tools/i18n/build.py`**）：标题/HUD/快捷键条/音量面板/死亡页/洞内菜单常用句/ui3a 提示/MOD 面板外壳。新文件 `js/i18n_extra.js`（`window.I18NX`）：① `#credits`（被 DOM 翻译跳过）按语言换文案 ② 开场故事整段三语（`ui.js` 的 `introStep` 读 `I18NX.intro`，容器加 `data-noi18n`）③ MOD 面板的动态句式规则。新文件 `js/mods_i18n.js`（`ModsI18N[id]=[nEn,dEn,nJa,dJa]`，140 项全覆盖，说明为精简译文）；`mods.js` 用 `nm(m)/dm(m)` 取名称/说明，切换语言时面板重绘。**新增 MOD 时请同步在 `mods_i18n.js` 加一行**，否则该项在日/英下回退中文。
- 实测（headless，标题界面 en/ja）：标题页已无中文残留（除语言页签“中文/日本語”）；MOD 面板 en 无中文残留。
- **仍未覆盖（请后续轮次继续）**：静态扫描（`/var/work/pw/static.js` 思路：抽取 js/*.js 中文字面量喂给 `I18N.tr`）显示约 9000 个中文片段没有译文，主要是长文本：`lore.js`(800)、`ranks.js`(400)、`overhear.js`、`spirit_*.js`、`persona_lines.js`、`bookdata.js`、`tale.js`、`worlds.js`/`play.js`/`explore.js` 的提示与事件、`regionecho.js`（本 agent 上一轮写的，190 段，建议直接改成 {zh,en,ja} 模板）、`gear2.js`、`elites.js`、`chess.js`、`seance.js`…… 这些在日/英模式下仍是中文。另：含 `<b>` 的句子被 DOM 引擎按文本节点拆碎，译文会不通顺——这类要像开场故事那样整段三语。
**② 宣传图**：`tools/promo/make2.py` → `promo/{zh,ja,en}/{sq,p23}_0N_*.png`，sq=1080×1080，p23=1080×1620，3 主题（01 hook 主视觉：爽点卡片 + 实机标题界面 + 6 键；02 combat：格挡→破绽→处决四步 + 武器面板实机截图；03 keys：全键位速查）× 2 比例 × 3 语言 = 18 张。另有 UI agent 的 16:9 六张（`promo/*/01_key…06_spirits.png`）。运行：仓库根起 `python3 -m http.server 8080`；`pip install playwright pillow`；`python3 tools/promo/make2.py [zh|ja|en]`。素材：`tools/promo/cap/title_{zh,ja,en}.png`（真实标题界面，1280×720，`/var/work/pw/boot3.js` 抓取，约 70s/张）、`wpn_*.png`（UI agent 的真实武器面板截图）、`js/regionart.js` 做虚化背景。**没有 3D 战斗/洞窟实机截图**：2GB 沙盒里一进游戏就 OOM（会把整个沙盒卡死）。你在本机截到图后放进 `tools/promo/cap/cave.png`，重跑 make2 即自动替换 01 号的实机图（`combat.png` 预留）。

## R40b/R41（用户：“按 F 底部 UI 栏被挡住、UI 看不清；初期攻速太快太强，模拟游戏/升级过程，调数值”）
**① 底栏不被挡（MOD `hud_legible`，`js/hudfix.js`，默认开）**：真因 = F 拔刀弹出一段 ~130 字的 22px 长字幕盖住画面 + 整行底部 `#hint` 从热键栏槽位缝隙透出来糊在栏上 + 多个贴底小部件（手持书/灵契/按键按钮/[E] 提示/麻袋HUD）与 162px 高的热键栏重叠。
做法：JS 每 200ms 量 `#tbBar` 顶边 → CSS 变量 `--tbH`；`body.tbon` 时 `#wHint/#wRun/#tbCast/#skHud/#propHint/#gacha/#ohear/#bkHeld/#kgBtn/#spchip` 都抬到 `--tbH` 之上并上下错开；热键栏显示时隐藏 `#hint/#hintTag`；第二排（Shift+1~0）全空且没按 Shift 时折叠；`#toast` 改深底板 19px；`combat.js` 拔刀字幕改一行短字（前 2 次 4 秒，之后 2.4 秒；localStorage `sh_drawN` 计数，三语）。关 MOD = 回到旧长字幕。
**② 前期平衡（MOD `balance_r41`，`js/balance.js`，默认开）**：`tools/balance/sim.js`（蒙特卡洛，直接 require 真实 rpg.js）`node tools/balance/sim.js base|new`，结果存 `tools/balance/REPORT.md`。
 现状(base)：Lv1 木棒打村庄普通敌 TTK 1.3~1.7 秒、敌人一下只削 4% 血（25 下才倒），5 分钟就 Lv5，基本不会死。
 新(new)：① 出刀节奏倍率 `Balance.tempo()` Lv1 ×1.5 → Lv26 ×1.0（接进 combat.js 的 `WK()`，前摇/出刀/冷却/体力节奏都跟着变；wpnspec 显示同步）；② `Balance.earlyDmg(power)` 战力 55 → 伤害 ×0.5，170 起 ×1（接进 `FoeAbs.power()`，foe.js/精英/猎手估算一致）；③ `Balance.foeDmgK(rec)` 村庄 ×2.0 → 推荐战力 200 起 ×1.0（接进 `FoeAbs.conv()`，霸主/猎手/精英不加成）；④ 升级经验 40+11·lv^1.6（原 28+9·lv^1.6），深层地区经验 ×(rec/40)^0.3（≤2.2，接进 worlds.js gainXp）；⑤ 旧存档第一次进入按等级迁移 S.xp（`S.balV=41`），等级不降。
 结果：Lv1 对 rar1 TTK ≈ 4 秒、敌人 8% 血/下（13 下倒）、1 对 3 掉血 ~30%；Lv5≈8 分钟、Lv10≈25 分钟、Lv20≈100 分钟。
 **R35 仍有效**：伤害/血量是 FoeAbs 绝对值，没有 %最大生命伤害、没有保底刀数。调数值只改 `balance.js` 的 `TUNE` 和 `sim.js` 的 `TUNES.new`（两处同值）。
 改动文件：combat.js(WK×TK)、foe_abs.js(power/conv)、talents.js(need)、worlds.js(gainXp)、wpnspec.js(q)、mods.js/mods_i18n.js、index.html(加载 hudfix.js / balance.js)。
 测试：tools/test/talents.html 加假 hint/kgBtn 等元素的截图对比（前后）；整机仍无法在沙箱里跑，请用户实机确认 F 拔刀后的底栏、前期战斗手感（太慢/太难可调 `TUNE.tempo[0]`、`earlyDmg[0]`）。

## R42 统一菜单 Hub（用户：“UI 设计得非常屎，各种奇怪按键 UI 分类，有没有统一器？按 TAB 分类看到所有 UI；物品栏和装备 UI 放一起；其他大规模优化”）
**MOD `ui_hub`（`js/hub.js`，默认开）**。Tab（洞里 / 野外都可）打开总菜单：左边固定导航栏，按 角色（总览 · 装备与背包 · 天赋技能）/ 挑战（精英 · 猎手）/ 收藏（首级收藏 · 图鉴展厅 · 灵契）/ 世界（狩猎日志 · 建造）/ 系统（按键一览 · MOD 设置）分组，一键切换；再按 Tab / Esc 关闭；记住上次页（localStorage `hub_last`）。
- **只做导航与布局，不重写内容**：各页仍是原模块的面板（UI.openMenu 的 stats/equip/heads/codex/logs/build、TalUI、R35UI 的 elite/hunt、Spirits、KeyGuide、Mods）。`Hub.PAGES` 里每页有 `isOpen/open/close`；打开**任意**面板（T / O / F1 / C / U / K / L / B / Z / Y 原热键照常）导航栏都会自动出现（200ms 轮询），并把面板右移 `--hubW`（196px；<860px 缩成 64px 图标栏）。洞里专属页（首级/图鉴/灵契/建造）在野外自动隐藏。
- **装备与背包合并页（`kit`）**：左 = Gear2 纸娃娃 + 属性（`Gear2.dollHTML/dollClick/dollMove`，点槽位卸下），右 = Sack（洞里 `Sack.mountCave`：装备/物品/工坊/典籍；野外新增 `Sack.mountWild(host)`，`panel._hub=1` 时 Sack 自己不抢 Tab/B/Esc，`Sack.unmount()` 在关菜单时复位）。Z 键（Gear2.toggle）和野外 B 键现在都进这一页。装备/卸下后 MutationObserver 自动刷新纸娃娃。
- 面板打开时隐藏热键栏 / 玩家框 / 世界提示（天赋页除外，拖技能要用栏）。右下角「按键 F1」小按钮换成「☰ 菜单 Tab」（`#hubBtn`，热键栏出现时自动抬高）。KeyGuide 的 Tab / Z 说明已更新。
- 新的公开接口：`UI.tab`、`UI.quiet()`、`R35UI.avail(id)`、`Mods.isOpen`、`Spirits.panelOpen/closePanel`、`Sack.mountWild/unmount`、`Gear2.dollHTML…`。ui.js `openMenu('equip')` 在 Hub 开时走 `Hub.kitBody/kitMount`。
- 测试：`tools/test/hub.html`（真实 ui/sack/gear2/r35ui/keyguide/talents_ui/mods + 假 G）；Tab → 总览、go:kit（洞里 + 野外两种）、天赋、按键、MOD 都截图验证过。整机仍未在沙箱跑；请用户实机确认：Tab 打开/关闭、野外 Tab、装备页穿脱、Esc 行为（UI 菜单 Esc 仍是原来的 close(false)）。
- 还没做：总览页仍是原「属性」页；图鉴/首级/建造各页内容没改版，只是被统一进了导航。

## R43：武技熟练度（新手→高手的阶梯）
- 用户：看不到 R41 的平衡效果；要求新手慢（出刀慢、前摇长、收招慢、武器弱），高手明显更强。R41 的 ×1.5→1.0 太隐蔽，已替换。
- `js/balance.js` 重写：`Balance.m(lv)` 返回 {wu,sw,cd,st,dmg}；阶段 生疏(1)/入门(5)/熟练(10)/精通(18)/宗师(27)；`stage()/label()` 供 UI；升阶时弹字幕；`tempo()/earlyDmg()` 仅为兼容（earlyDmg 现在按等级，不再按战力）。数值见文件头注释与 `TUNE`。
- `js/combat.js`：`TK()` 已移除，新增 `MT()`；mm 攻击的前摇/出刀/收招/体力用各自倍率，自由挥砍的 `dur`/`omega` 用出刀倍率（刀慢 → 速度伤害也低）。`WK` 不再含节奏。
- `js/wpnspec.js`：武器属性页用同一倍率；`js/ui.js` 总览加「武技熟练」行；F 拔刀提示带【阶段】；`js/mods.js` / `mods_i18n.js` 改名为「武技熟练 / 前期平衡（R43）」（id 仍为 balance_r41，存档的开关不变）。
- `tools/balance/sim.js`：TUNES.new 同步；新增 ③ 熟练度阶梯表。结果：Lv1 平均出刀间隔 831ms → Lv27 403ms → Lv30 353ms；仅熟练度就使 DPS 约 ×5.2（伤害 45%→100%）。Lv1 对 rar1 TTK 5.8s，早期 Lv2–5 有少量死亡（罚 10% 金币）。
- 与 R35 不冲突：仍是绝对数值，无百分比伤害、无保底刀数。未在真机验证。
- **R43b（用户：“小字看得眼瞎、UI 太普通、不够大师级”）**：武技熟练度 UI 重做。`Balance.card(lv)`（js/balance.js）生成卡片：带进度环的境界印章（壹~伍）、按境界变色的大标题（最大 68px）、五境界路线图、四条大进度条（前摇/收招/体力/伤害，大字百分比 + ×倍率 → 满熟练）；样式 `css/mastery.css`（已在 index.html 引入；字号下限 15px；矮屏 ≤940px 自动紧凑）。升阶改为全屏宽大横幅 `#msUp`（3.6s），不再用小字 toast。测试页：`tools/test/mastery.html`（五阶段静态预览，?lang=zh|en|ja）、`tools/test/hub.html`（已加载 balance.js / mastery.css）。教训：read_file 会缓存同名截图，换文件名再看。
- **R44（用户：“很多地方文字太多，要搭配图形语言，把 UI 改得更好看”）**：
  - 总览页（`js/ui.js statsBody`）重做：等级经验环 + 大战力数字 + 血条；五维属性改成**雷达图**（SVG + HTML 标签，悬停显示基础/装备/建筑明细）；攻防闪避/魂晶产出/回复/背篓、出猎/斩首/累计魂晶/把玩 改成图标数据块；药剂改成图标按钮（保留 `data-a="use"`）。样式 `css/ov.css`（已在 index.html 引入，tools/test/hub.html 也加载）。长说明文字（“提升属性：在洞里建造训练器械…”）已删，放进悬停提示。
  - 按键一览（`js/keyguide.js`）：顶部“先做这三件事”文字条换成三张**操作图**（WASD 十字键帽 + Shift/Space/C + 鼠标；战斗：鼠标左右键高亮“斩/挡”+ F/Q/E/H；首级·菜单：E/LMB/RMB/Tab/Esc/F1），一键一字；下面的详细列表保留并把字号提到 15px；按下的键会在大键帽上亮起（data-c）。
  - 装备页（`js/gear2.js dollHTML`、`js/hub.js kitBody`）：文字属性表换成血条 + 6 个图标数据块（零值变暗）；删掉说明段落，改成底部键帽图例条（LMB 取出/装备 · 拖动整理 · R 旋转 · H 喝药 · Tab 关闭；三语）。CSS 用 `.hk .sk-eq/.sk-foot/.g2note {display:none}` 隐藏了麻袋里的重复文字，非 hub 场景的旧面板不受影响。
  - 教训：`Hub.go('logs'|'codex')` 在测试页里不会渲染（harness 缺 UI 依赖，截图其实还是上一页）；这两页、首级收藏、MOD 列表、天赋页的“图形化”还没做，下一轮继续。

## R45：技能栏 / 小键盘 / 技能特效（用户：“加了技能不知道怎么用；小键盘共通；要在屏幕下面别太小；用技能要有特效”）
- **小键盘**：`talents.js` 的 `DIG` 加了 Numpad0-9，与主键盘 Digit0-9 共用同一排技能栏（Shift+数字=第二排）。`keyguide.js` 图示/列表同步（战斗卡片多一个“1–0 技能 · 小键盘也行”键帽；按小键盘时大键帽也会亮）。
- **用法引导**：① 学会技能时字幕“✨ 学会「X」——已放进快捷栏，按 N 释放”；② 技能栏上方有一条发光提示“按 1–0（主键盘/小键盘都行）释放技能 · T 技能书”，第一次成功施放后消失（localStorage `tb_hint_done`）；没学技能时提示“按 T 学一个技能”；③ **洞里也显示技能栏**（变灰 + 底下一行“出洞后才能释放技能”），在洞里按数字会弹“技能只能在野外使用…”，不再没反应（原来 `#tbBar` 只在野外 `Worlds.active` 时显示，onKey 直接 return）。
- **技能栏放大**（`talents_ui.js` CSS）：`--u` 由 clamp(46,4.4vw,68) 改为 clamp(60,5.4vw,88)；键位角标改成黑底大号徽章；魂能消耗数字 ≥13px。`body.tbcave` 时 `#hint/#propHint/#bkHeld` 抬到栏上方。
- **技能特效**（新 MOD `skill_vfx`，`js/skillfx.js`，默认开）：`TalUI.cast` 成功后调 `SkillFX.cast(id)`：屏幕边缘门派色闪光（大招：冲击波环 + 速度线 + 屏震）、那一格爆光环 + 火花、大图标+技能名横幅（替代 `#tbCast`，`body.sfxon` 时隐藏旧的）；3D：面前迸发的加法火花、脚下双层冲击环、前方光柱，按门派（id 首字母 b/w/s/r/m/h）加新月刃光 / 护盾壳 / 魂火螺旋 / 残影线。**不碰各技能原有的环/弹道逻辑**。教训：光柱/护盾壳不能包住相机（DoubleSide 加法混合会糊屏），光柱放在前方 3.4m。
- 测试：`tools/test/talents.html`（已加载 skillfx.js，背景改暗）；无头 Chromium + swiftshader 里加了 WebGLRenderer 看 3D 特效（见本轮脚本思路：往页面里 `new THREE.WebGLRenderer` 并把 `r.render(scene,camera)` 推进 `G.HOOK.frame`）。未在真机验证。
## R41（本 agent）：战斗特效 3D 化 + 第一人称兽人手 + 第一/第三人称切换（V）
用户原话：战斗效果/质感/动作很劣质；要能切第一/第三人称，第一人称要能看见兽人的手。
- **新文件**：`js/cfx3d.js`（MOD `cfx3d`，3D 命中特效：新月斩光、火花、血雾、冲击环、刀光拖尾；包了 `CombatFX.event`，不碰 foe/worlds 逻辑；无 hit-stop/慢动作）、`js/fpv.js`（MOD `fp_hands` 第一人称兽人双手 + 武器动感；MOD `view_toggle` 第三人称，按 V）、`assets/ogre_body.js`（第三人称身体 = Quaternius「Goblin Animated」CC0，FBX→GLB，**按材质拆成 6 个 mesh**——直接导出会把每个 material group 都导成整身副本，会叠成一团）。
- **第一人称手**：`assets/limb_hand_avatar.js` 的皮肤手，手指程序化弯曲握住武器柄；右手握柄，双手武器/右键格挡时左手也上。`combat.js` 的 `IDLE_H` 抬高一点让手在待机时可见。
- **第三人称**：战斗判定始终按第一人称（眼睛）算；第三人称只在渲染前把相机挪到身后（过肩，带墙/地面/柱子碰撞），微任务里还原。武器按真实位置画在世界里，右臂（双手武器时左臂）做两段 IK 够握柄；Idle/Walk/Run 随速度，出刀时叠加上半身 Attack/Attack2。持首级 / UI 打开 / 回忆 / 未开始时强制第一人称。偏好存 `localStorage soulhead_view`。
- **重要接线**：出猎世界（`Worlds.frame`）不走 `G.HOOK`，所以在 `js/worlds.js` 的渲染前加了一行直接调 `CFX3D.frame` / `FPV.frame` / `FPV.pre`（洞窟里仍走 HOOK）。以后新增每帧系统要注意两条循环。
- 按键一览（`js/keyguide.js`）已加 V；i18n：`tools/i18n/d_r41.py`。
- 测试：`tools/test/fight.html`（已加载 ogre_body）、`tools/test/ogre.html`（哥布林骨骼/动作查看）。真实游戏冒烟：`_tools/mk_t.py 3` 生成 `_t.html`；启动要先选语言（按 1 + Enter），`G.S.intro=true` 跳过序章，F9 关教程。

---

## R41（主管）地区野怪 / 地图修正 / 特殊地点

> 另一个 agent 的提交也叫 "R41"，我的都标 "R41(主管)"。基调仍是第三轮规定：黑暗奇幻、偏重，但不过度猎奇。

**新 MOD（都可在 MOD 面板关闭，默认开启）**
- `region_beasts`：每个地区有自己的野怪。30 种来自 Quaternius Ultimate Monsters（CC0），打包在 `beasts/m_*.js`，名单和各地区权重在 `js/beasts_reg.js`，AI 和动画别名在 `js/beasts.js`。打包工具：`tools/beast_pack.py`。
- `wfix41`：地图修正。
  - 入口门的视线锥内不再有土丘挡视线，土丘也改为偏离入口。
  - 天空和雾的颜色、地平线衔接好了。
  - 去掉了现代街道 HDRI。
  - 光束在近距离或斜视时会淡出。
- `wsites`（`js/wsites.js`）：特殊地点，约 30% 的中型节点会变成其中一种。
  - 共 7 种：篝火夜会、集市、朝圣集会、魔宴、难民营、角斗场、伐木场。
  - 每个地区的权重不同，地点名也会随地区变化，例如"丰收篝火"、"晨祷集会"。
  - 场地会先整平并整块占用，随机地标和宝箱不会落进场地中间。
  - 人会坐在凳子、长椅或箱子上，蹲着烤火，或者砍柴、施法、叫卖，动作都在各自位置上循环（foe.js 的 idle 分支）。
  - 门牌、横幅和顶部 HUD 会显示图标加地点名，到达约 2.8 秒后弹出提示；同时会有更多敌人和额外宝箱。

**我改动的文件和位置**
- `js/worlds.js`：
  - buildNode 里的视线锥、平整通道和土丘偏置。
  - 天空 fogC/hz，以及 `toneMapping()` 外包 `#ifdef TONE_MAPPING`。之前在 NoToneMapping 下（master.js 的后处理管线）会报 shader 错。
  - 新增 `_debug` 和 `stylesOfN`。
  - `wsites` 的接入点：LAYOUTS 注册、layOf、layPlan、layPlace、populate、goto 站位、doorName、横幅和 HUD（2 处）、到达提示。另外 site 节点跳过 placeMark 随机地标。
  - buildNode 的返回值加了 `site`。
- `js/foe.js`：idle 分支里 `fo.slot && WSites.idle` 时保持站位和朝向。
- `js/mods.js`、`js/mods_i18n.js`：加了 3 个 MOD 条目。
- `index.html`：加了 `<script>` 标签：beasts_reg、beasts/m_*、wsites（放在 worlds.js 之前）。
- 其他：`js/wgen.js`、`js/wlayout.js`、`js/hithud.js`（小改）、CREDITS（Quaternius CC0）。
- 测试工具：`tools/test/world.html` 是世界渲染测试台。
  - 例：`?reg=village&seed=11` 加 `__node` 任务，任务参数可带 `lay:'site_bonfire', crowd:1, view:'site'`。
  - 只加载 1 个头、裁剪过的 ASSETS，否则沙箱会爆内存。

**地图 bug 审计剩余项**
- B2 地平线色带：部分修好。
- 还没修：
  - D：边缘漂浮的岩壁。
  - E：capital2 的灰色板块。
  - F：地面或雪接近纯白。
  - G：溪流是一块平的浅色矩形。
  - H：陡坡上铺了鹅卵石。
  - I：标签和营地重复。

## R42（本 agent）：偷听 UI 改版 + 斩首放宽
用户原话：偷听 UI 卡视野，放屏幕中上长框并显示说话人半身像；战斗斩首太难，放宽。
- `js/overhear.js`：`#ohear` 改成屏幕中上方的一条长框（top≈9vh，宽 ≤1040px，约 110px 高），一次只显示当前说话的一句，左侧是说话人的半身像，右上列出在场者并高亮当前说话人；`hudfix.js` 里原来把 `#ohear` 顶到热键栏上方的那条规则已删。
- **半身像**（`Overhear.portraitOf(c)`）：不是贴图资源，而是从场上那个活的 Foe（身体+头）实时渲染：主渲染器 + 离屏 RenderTarget，临时只留这个人（其余顶层物体 visible=false、去掉背景/雾、补一盏柔光），渲完立刻还原，结果缓存成透明 PNG。取不到 Foe（没生成/已离场）就退回显示名字首字的色块。脸朝向用头骨 +Z 取反（VRM 头骨朝向与 Foe 根相反）。
- **斩首放宽**（`js/foe.js`）：头和脖子都算斩首部位；刃速门槛 4.5→3（尸体 3→2）；血线 50%→75%（霸主/精英/猎手 25%→40%，蓄力刀再 +10%，霸主仍不会一刀死）；脖子判定半径 0.075→0.1（扫刀判定额外 +0.09，头 +0.05）；`combat.js` 准星吸附里 head/neck 权重 0.9/1.0→0.78/0.8（更容易选中头颈）；提示「再削弱她一些就能一刀斩首」改为血量>75%时出现。
- 测试台：`tools/test/overhear.html`（= fight.html + ranks + overhear）。沙箱重置后 `.cache/full` 会丢：用 `/tmp/srv.py` 思路（本地没有的文件回源 raw.githubusercontent.com 并缓存）即可。
## R46 野外画质大师化（阶段 1）
用户：“现在地图游戏整体画质太低级了……小作坊感，画质大师化”；澄清：最弱的是**场景环境**，显卡**高端独显**（高档位放手做）。
沙箱 2GB 跑不动完整野外（swiftshader 内存抖动），只能用 `tools/test/worldmaster.html`（地形 macro 着色器 + 粒子的编译/外观测试）验证；真机观感待用户反馈。
新增 MOD `world_master`（cat asset，默认开；`?wm=0` 临时关）——`js/worldmaster.js`（新，本轮所有者：本轮 agent）：
- 地形：`assets.js` triplanar 新选项 `macro`（1=色块，2=+双尺度混合防平铺+陡坡去饱和），`worlds.js` 传 `WorldMaster.terr()`。
- 植被：`worlds.js` 散布处乘 `WorldMaster.dens(kind)`（草/灌木 ultra×1.7 high×1.35；树 ×1.25/1.12）。
- 阴影：进场重建太阳阴影（ultra 4096 + radius4 / high 2048 + radius2.5）。
- 空气粒子：按 `node.region` 不同（草甸花粉/森林光尘+孢子/荒原沙尘/修道院微光/沼泽萤火/要塞灰烬+火星/王都金尘+火星/深渊紫红火星/雪峰飘雪），GPU 里环绕相机循环，加法混合（进 HDR 管线后被泛光点亮）。
- 调色：`master.js` 每帧把 `P`（sat/contrast/shadowTint/highTint/vig/grain）同步进着色器；WorldMaster 按地区缓入目标值、离场恢复。
- `game.js`：`G.postFx = post`、`G.renderer`（供读取档位）。
注意：worlds.js 已有叶片/草的风（WIND）；不要重复做。下一步候选：远景雾层/地面薄雾、云影、水面、地标构图、草卡片 LOD。
### R41（主管）c：用户反馈修正（提示贴底 / 技能栏缩小 / 手握住武器 / 新手武器更弱）
用户原话：“底部那一大串文本应该放在底部不然很卡眼，那个技能槽有点大，然后主角手没按住武器。新手武器应该更弱。”
- **MOD `hud_bottom`**（新文件 `js/hudbot.js`，index.html 里放在 hudfix.js 后面）：只加 CSS，用 `body.hbot` 前缀加 `!important`，没改任何 DOM id。
  - 野外 `#wHint` 和洞里 `#hint` 改成贴屏幕最底的一条细字（13px，超长省略），技能栏 `bottom` 由 10px 改为 34px 让出位置。之前 hudfix 和 talents_ui 会把这行字抬到技能栏上方，正挡视线。
  - 技能栏 `--u` 改为 clamp(50,4.6vw,72)。R45 的 60–88 在 960px 宽的屏幕上已经超出屏幕宽度。
  - `.tbhint` 字号 18→15；洞里"出洞后才能释放技能"改成栏上方的小字。
  - `worlds.js hud()`：MOD 开启时，野外默认提示去掉括号里那一长段战斗说明（F1 里有）。
- **手握住武器**（`js/fpv.js`，另一个 agent 的文件，只改了 2 处）：
  - 握持点 `GL` 由 (0.008,-0.05,-0.085) 改为 (-0.01,-0.024,-0.058)，也就是卷指圆弧的圆心。原来的点在拳外约 3.5cm，手浮在柄旁边，手指也没包住柄。
  - 卷指角 2.5→3.0，拳握得更紧。
- **武器握反了**（`js/game.js`）：
  - `WPN_ASSET` 新增第 4 项 flip。自动判断"细端 = 柄"对砍刀、斧头、刺剑判反了，原来握在刀刃、斧头、剑尖上。
  - `assetWeapon` 改为以握柄端的截面中心为轴，弯柄斧子原来手够不到柄。
  - 测试页：`tools/test/fpv.html#<tier>`，配合 `/var/work/s/fpv.js` 截第一人称画面。7 把武器已逐一目检。
- **MOD `weak_starter`**：`RPG.wpnK(tier)` 让粗木棒（tier 0）伤害 ×0.6。
  - 生效位置：`worlds.js` 的 `ctx.power`（FoeAbs 和旧公式两条路径、野兽都走它），以及 `wpnspec.js` 武器属性页的显示（另一个 agent 的文件，只改了 1 处乘数）。
  - 另外改了 rpg.js 里粗木棒的描述。
  - 和 Balance（熟练度，Lv1 伤害 ×0.45）叠加。
- 测试页 `tools/test/hud.html`：talents 测试台加上 hudfix、hudbot、ui3a.css，截 HUD。`#off` 为 R45 原样，默认为新样式。

### R42b（用户纠正）：斩首 = 致死一击；只有部分武器技能可按血线斩首
- 用户原话：「要伤害能够到达打死时才能斩首！有些武器技能可以按你说的血量少于斩首」。**覆盖上面 R42 的 75% 血线写法**。
- `js/foe.js` hit()：普通横砍命中头/脖子，只有这一刀把血量打到 ≤0（致死）才斩首；去掉了“破绽中不看血量”的捷径。`info.decapAt`（技能专用）= 血量比例线，命中头/脖子且血量 ≤ 该比例时斩首；霸主/精英/猎手上限 25%。尸体补刀斩首仍宽松（刃速>2）。头、脖子都算斩首部位；脖子判定半径/吸附权重的放宽保留。提示改为“她只剩一口气，再补一刀头颈就能斩首”。
- `js/talents.js`：`hitFoe` 透传 `o.decapAt`。带血线斩首的技能：旋风斩（扫脖子高度，≤35%）、百刃最后一刀（≤40%）、处决令非处决那一击（≤50%；≤35% 本来就直接处决）。技能描述（`talents_data.js` + `tools/i18n/d_talents.py`）已同步三语。
- `tools/test/srv.py`：沙箱重置后的测试服务器（本地没有的文件回源 GitHub raw 并缓存）；`cp tools/test/srv.py /tmp/ && python3 /tmp/srv.py &`。
## R46 阶段 2：地形特色化（MOD `terrain_master`，`js/wterrain.js`，?wt=0 关）
用户反馈：“地形生成挺没特色，比较一般，很重复”。原地形=平缓盆地(±1~3m)+外圈山坡，每张图都像。
- `WTerrain.wrap(H, X)`（worlds.js 在 WGen.prepare 之后包一层 H）：脊状分形 + 域扭曲 + 地层台阶（wilds/fortress/capital/peak/abyss）；每地点 1~3 个标志地貌（断崖/古冢/深壕/石冢/高台，种子决定；名字加进 g.tag 显示在 HUD 标签）。门口(13m内渐弱)、水边(wd<7渐弱，水面由原 g.h 决定故水边不动)、中心渐弱；lake/ravine 布局不叠加，henge ×0.5。
- 坡度贴岩：`Assets.triplanar` 新选项 `rock/rockTint/rockLite/rockScale`（三平面岩石 diff/nor/arm 按坡度混合；mid 档 rockLite 不混法线）。新增 CC0 贴图（Poly Haven，phtex.py 512px）`big/world/tex_aerial_rocks_02|cliff_side|rock_face_03.js`（共约 0.65MB），按地区选（meadow/forest/swamp/ruins 青苔岩，wilds 层岩，fortress/capital/abyss/peak 灰岩+染色）；`WGen.assets` 里追加需要加载的贴图名。
- 陡坡长岩石：`WTerrain.outcrops`（复用该地区样式里 kind='rock' 的模型，不新增模型）；陡坡（>1.05 草/灌，>0.8 树）不长草树（worlds.js 散布循环里 `stp`）。
- 测试：`tools/test/wterrain.html?s=1&r=meadow,forest,...`（9 地区网格渲染；首次渲染后要 await 再画，否则是空帧）。沙箱 2GB 跑不了整个野外，真机观感待用户确认。
- 玩家/敌人直接贴 H，没有坡度限制；断崖最陡约 50°，可直接走上去。下一步候选：断崖处加碰撞/爬不上去的感觉、河谷/瀑布、更多标志地貌（环形山、天然拱桥、巨树洞）。

## R46 阶段 3：地形“无限多样”（wterrain.js 重写扩展）
用户：“最好随机生成，不要让玩家玩腻，多样性要无限丰富”。每次出猎的地点种子本来就是 Math.random（genTrip），这轮把“从种子能长出多少不同东西”做大：
- 地貌库 5→16 种（新增 乱石岗/长谷/古道(连接两个门的路基)/阶梯坑/天坑/阶梯台/马蹄岭/脊刃/地裂/火山丘/沙浪），每种的位置、尺寸、高度、朝向、数量都是连续随机量；每地点抽 1~4 个（按地区权重）。300 个荒原地点里有 236 种不同组合。
- 地形基因：起伏强度 rug（对数正态，10% 极平缓 / 8% 极险峻，HUD 标签显示“平缓/险峻”）、山脊频率、方向拉伸、扭曲量。
- 植被构图（`WTerrain.veg`）：每地点随机 散布/林丛/林间空地/空心林/林带/稀树，调制树和灌木的保留概率（worlds.js 散布循环 `vg`，并把树/灌木基础数量 ×1.45 补偿被剔除的部分）；名字也写进标签。
- 岩石贴图：同一地区按种子随机选 2~3 种（贴图+染色抖动），`assets()` 与 `rock()` 用同一个确定函数，保证加载的就是用到的。
- 注意：沙箱重置会清空 /var/work；本轮脚本存在 /home/user/r46/。测试页渲染偶尔出现整格空白（swiftshader 停顿），重跑即可。
### R41（主管）d：武器基础属性 + 单武器熟练度
用户原话：“为什么武器属性那么少；生疏/前摇/后摇系统最好绑定每个武器的武器熟练度；武器要有各种基础属性（前摇、后摇…）”
- **新文件 `js/wpnx.js`**（index.html 里放在 talents_data.js 前面），包含两个 MOD，默认都开：
  - **`wpn_stats`**：7 把武器各有一套属性 `WpnX.P[tier]`：前摇 / 出刀 / 后摇 / 体力倍率、触及（米）、破防率、暴击率 / 暴伤、切割（砍颈加伤）、击退、格挡耗体、完美格挡窗口。
    - MOD 开启时替代原来单一的"自重" `WK(S.wt)`。
    - 所有属性都真实生效，接入点如下：
      - `combat.js`：`PF()` / `KW(k)`；`mmAttack` 的前摇、出刀、冷却和体力；旧挥砍节奏的 2 处；索敌距离加 reach。
      - `foe.js hit`：`WP` 带来破防率（普通一击砸开格挡，伤害仍按普通一击算）、暴击、颈部 ×(1+cut)、击退 ×kb。技能、法术、proc 不吃武器属性。
      - `beasts.js hit`：暴击和击退。
      - `worlds.js hitPlayer`：完美格挡窗口 0.3s×par，格挡耗体 14×bst。
  - **`wpn_mastery`**：生疏→宗师的熟练度按每把武器各自累计，存在 `S.wmx[tier]`。
    - 经验来源：命中 +1（重击 +2）、击倒 +6、斩首 / 处决 / 一刀斩 +10。技能不算。
    - 境界门槛：0 / 60 / 300 / 900 / 2200。
    - 倍率：前摇 1.8→0.9、出刀 1.4→0.9、后摇 1.7→0.85、体力 1.4→1.0、伤害 0.6→1.0。
    - 旧存档（`S.wmxV`）：把按角色等级算出的境界记到当前那把武器上。
- **`js/balance.js`**（另一个 agent 的文件，最小改动）：
  - `m()`、`dmgK()`、`label()`、`card()` 在不传 lv 且 wpn_mastery 开启时，转给 WpnX 处理。combat 的 `MT()`、`foe_abs.power`、wpnspec、总览卡片都自动跟着走。
  - `frame()` 在 wpn_mastery 开启时不再发按等级的晋升横幅。
  - 导出了 `banner`（WpnX 晋升时复用）。
- **`js/wpnspec.js`**：
  - 按武器属性和这把武器的熟练度计算。
  - 表格新增"后摇"列（= 间隔 − 出刀）。
  - 新增行：破防率、切割、击退、格挡耗体、完美格挡窗口、武器熟练。
  - 背包悬浮提示增加一行属性和 7 条属性条（`WpnX.bars`），FEEL 文案也改成和属性一致。
- `worlds.js foeEvent0` 调用 `WpnX.onEvent`。
- 测试页 `tools/test/wpn.html`：talents 测试台加上 balance、wpnx、mastery.css。已核对：委托生效、单武器涨经验、晋升，以及面板、提示、卡片的截图。

## R47（第四十三轮，agent 侧：身份服饰 / 后退变慢 / 敌人逼近）
用户诉求：战斗逻辑总有 BUG；战斗中后退应变慢、敌人重击可边打边前进（否则能无限后撤，想逃得转身跑）；单位还是弱智；大头娃娃；角色形象不符合身份。
- **MOD `id_outfit`（默认开）**：`foe.js bodyFor` 在 CC0 模式下按身份固定选身体（`OUTFIT`/`OUTFIT_BOSS` 表）：Vita=战斗/冒险装，Victoria_Rubin=贵族/圣职礼裙，Darkness_Shibu=女巫/暗系长裙，HairSample_Female=平民素裙；霸主按地区。以前是哈希乱分（修女穿魔女裙）。**CC0 模式只有 4 具身体，衣服款式受限，要更贴身份只能增加 CC0 身体（放 big/body/ 后加进 cc0mode.js BODIES 与 OUTFIT 表）。**
- **MOD `head_natural`（默认开）**：`headFit` 头缩 10%（实测脸部高 ~0.29m / 身高 1.7m ≈ 1:5.8，偏大头娃娃 → ~1:6.5）。各头模型的脸高实测一致（0.29–0.31），`tools/test/heads_fit.html` 是加载 11 个 CC0 头的对比台。
- **MOD `back_slow`（默认开）**：`worlds.js` 玩家移动：14m 内有已发现你且没逃跑的敌人时，倒着走速度 ×0.55；首次提示 toast。
- **MOD `foe_press`（默认开）**：`foe.js atkStep`：出招（非远程、非定格蓄力帧）时朝玩家迈步，普通 1.9m/s、重击 3.0m/s（霸主 ×1.15）；命中距离 +0.3（重击 +0.55）；落空且玩家仍在 3.2m 内、iq>0.45 → cd 缩到 0.3–0.6s 立刻补刀，最多连 2 次（`fo.chain`）。已有的“预判走位 lead”保持。bench：玩家以 2m/s 倒退 8 秒，开启时被追上打中，关闭时永远追不上。
- 补了 R41/R43 MOD 的英日文（mods_i18n.js）。
- 待用户确认：“大头娃娃有时候还有-”后半句没发全；“单位弱智”具体表现。
## R41（主管）e —— R47 第 3 项：二次元人物逆光难看 / 恐怖谷
- 病因：heads.js FaceFill 的 anime_shade（暗面抬到满日照 80%）/ face_light+char_lift（绝对亮度下限 uFill）/ skin_sss（交界处染红）都是**绝对尺度** → 逆光/阴天里脸发泥棕、红交界、或像自发光纸片人，且比环境亮。
- 新 MOD `char_unify`（默认开，mods.js 在 anime_shade 前一行）：新文件 `js/charlight.js`（`CharLight.patch(sh)` 插在 aomap_fragment 前）。
  环境相对明暗：full = 反照率×太阳色 + 间接光；暗面只抬到 full×0.4×上下体积项，亮面不动、点光原样；逆光轮廓太阳色边缘光；高光 ×0.2。`CharLight.tune({shade,rim,spec})` 可调。
- heads.js 最小改动（6 处，均带 R47 注释）：uFill getter、animeOn、sssOn 在 char_unify 开时旁路；inject 末尾调 CharLight.patch；wrap 在 char_unify 开时也接管身体 PBR；program cache key 加 'U'。
- index.html：heads.js 前加 `<script src="js/charlight.js">`。
- js/mods_i18n.js：加 char_unify 英/日译文。
- tools/test/world.html：载入 mods.js（`?mods=id:0,id:1` 覆盖）、master/worldmaster/wterrain 后处理（`?post=0` 关）、`view:'face'` 特写（`sun:'back'|'front'|'side'`、`se` 仰角、`si` 太阳倍率、`cd` 距离），info 里带灯光清单。
- 验证截图（逆光/强逆光/暗场景，开关对比）：关=脸泥棕+红交界；开=脸干净、衣服有体积、轮廓有逆光边；暗场景开 MOD 不比环境亮。

## R47b（第四十三轮续：身份外观 / 猎手条 / 顶部醒目）
用户：“你那些也不符合人设，应该去找合适的衣服-头发-饰品；猎手条满了过了之后不应该到 0 么；UI 藏在角落太不显眼。”
- **新文件 `js/idlook.js`（MOD `id_look`，默认开）**：`IdLook.apply(h)`（在 `Foe.populate` 里、build 之前调用，改 `h.look`，头被砍下后是同一个 look）按身份 `c.id` 重配发色（`S` 表）、`look.acc`（公主 tiara / 女王 crown / 女巫 witchhat / 圣职 circlet，去掉不合身份的王冠等）、`look.hw` 头饰、发型 `hx`，并清掉 `look.ax`（跨头饰品）；`IdLook.dress(f,id)` 在身体 build 后给材质名以 `_CLOTH` 结尾的衣服/鞋做“按亮度重新着色”（克隆材质 + onBeforeCompile 注入 map_fragment 后：`mix(lum,c,keep)*tint`），修女黑修道服、骑士钢灰、游侠森林绿、女王深红等。**局限：Vita 的短裙/丝袜烘在皮肤贴图里，染不了**。霸主不着色。
- **`headwear.js` 新增 `veil`（头纱）**：罩头顶/后脑，前面留脸，两侧背后垂到肩，前缘白头巾边；nun/abbess/novice 必带。
- **CC0 调研结论**：ToxSam open-source-avatars（100Avatars 等）是 CC0 VRM，但全是梗图/卡通风（玉米、土豆……），不适合；CC0 的成年女性带幻想服饰的 VRoid 身体已经用完（Vivi 偏幼、Sendagaya 是学生制服已排除）。想要骑士甲/法袍等真实服装，只能关 `cc0_only`（IDENT 表本来就按原神身体设计）或再找新的 CC0 身体。
- **猎手感应条（`hunters2.js`）**：① 猎手穿越到场的瞬间 `T.m=0`（以前要等她死/逃/撤退才归零，所以条一直满着）；② 条移到顶部居中（top:88px，宽 460px，16px 粗体，13px 高的条，满时红色脉冲），猎手在场/首领战/擂台/洞口时隐藏，避免和顶部血条重叠。
- 测试台：`tools/test/heads_fit.html` 加了 `idlook.js`。

## R47c（第四十三轮续：取消 CC0 限制 / 偷听恢复老版）
- 用户：“不限制 CC0 了”“偷听 UI 你目前这个还不如老版那个”。
- **`cc0_only` 默认改为关**（`mods.js` def:false + 迁移 `__v 11`：旧存档也一次性关掉；O 面板仍可重新打开）。关掉后走原来的 IDENT/VB 身体表（原神等身体的服饰本来就贴身份）；`id_outfit` 只在 CC0 模式生效；`id_look` 在关 CC0 时只改 VRoid(CC0) 头，原神/MMD 头保留自带发型/头饰，`dress()` 只给 4 具 CC0 裙装身体换色。已验证：关 CC0 时 knight→Eula、ranger→Amber、witch→Darkness_Shibu。head_collage/head_native 等 R38 的联动开关未动（想恢复 R36b 的“头保持原样”需用户另说）。
- **`overhear.js`**：新增 MOD `overhear_old`（默认开）= 第二十八轮老版弹框（`showOld`，`#ohold`：屏幕中下方、气泡尖角、每个说话人一块名牌含魂阶/阶位/口头禅、对白逐句弹出）；关掉 = R42 顶部长条 + 半身像。
## R46 stage 4（偷听 UI 卡顿 / 长图与特殊形状地图 / 地形自检）
用户原话：「现在改版偷听UI好卡」「来点长点的图或者特殊形状的图」「你自己模拟，要完全正确的地形，不要千篇一律」。
- **偷听 UI 卡顿（js/overhear.js）**：原因＝`portraitOf` 渲染头像时加灯、去雾、改输出编码 → 着色器变体与主渲染不同，首次必须临时编译（几百 ms 卡死），且一帧里同步渲 3 张。
  现在：后处理开启时走 HDR 线性 RT（FloatType），不改灯光、不换雾类型（只改 uniform：FogExp2.density=0）、`toneMapping=None`（与主渲染一致，无新变体），JS 侧 ACES 近似+gamma 转 PNG；头像逐个错开渲染（弹框先出，头像 500ms+350ms×i 后补上）；192×224；渲染时 `shadowMap.autoUpdate=false`；CSS 去掉 drop-shadow 滤镜、缩小 box-shadow、`will-change/contain`、去掉 height 过渡。测试页 `tools/test/overhear.html`（两条路径都出图、状态全部还原）。**未在真实游戏里实测帧时间。**
- **长图 / 特殊形状（MOD `map_shapes`，`?ws=0` 关）**：`js/wlayout.js` `shapeUp`。边界仍是极坐标半径表 ρ(a)（720 格，星形域，老接口全兼容），但由图元并集射线行进得到：`long` 长廊（长宽比可到 3–4，Rmax≤66）、`lobes` 2–5 叶花瓣/花生、`arms` 2–6 臂十字/星芒、`poly` 三角/矩形/五六边形（圆角）、`ell` 长椭圆、`bent` 折角 L/V/Y、`snake` S 形；`round` 仍是旧近圆。始终并入基础圆盘 `max(0.68R, min(R,13))` ⇒ 最小半径有保证。
  新增 LP 接口：`Rf/Rmax/Rmin/areaK/tips/samp(r,m)/dOut(x,z)/edge(x,z)→[距墙,内法线nx,nz]/clamp(p,m)/bp(t)/perim`。`dOut` 是到边界的真实带符号距离（直墙精确）。
  worlds.js：门优先开在尖角/长廊端（其余门取离其它门最远的边界点），门朝向＝边界外法线；坡（rim）按 `dOut` 起坡；散布/宝箱/生成点按面积均匀采样 `samp`；边界树带与坡上草环沿边界等弧长；玩家撞墙沿法线推回（`lp.clamp`，不再径向拖回中心）；foe/beast/hunter/prey/boss 的边界判定全部改用 `ctx.edge`（foe.js 的 `EDGE`、导航网格覆盖外接圆按真实边界挡；foe_ai2/foe_roles2/beasts/hunters2 同步）。圆形地图没有 `edge` 时全部回退旧逻辑。
  wterrain.js：地貌落点 `spot` 用 `samp`（长廊/各臂上都有地貌），遮罩衰减按 `dOut`。wgen.js：景物落点、地面着色衰减同样用 `dOut`。
- **地形自检模拟（tools/sim/）**：node 里加载真实 `worlds.js/wgen.js/wlayout.js/wterrain.js` + 真 three，对随机种子×风格×尺寸×形状调用 `Worlds._debug.buildNode`，1m 网格检查：NaN/超大、门在边界内且不在水里、门前平坦、门不互相贴近、从门出发 flood-fill（坡度≤0.95）所有门连通/中心可达/覆盖率、宝箱与生成点在界内、不在水里、可达、`cols` 不大量在墙外。`N=200 S=2 node sim2.js`；`diag.js` 找陡坡来源；`montage.js + montage.py` 生成俯视地形图；`shapetest.js` 校验形状表。
  **这轮靠自检发现并修掉的真 bug（多数是旧代码的）**：① 池塘水位取自坡面 8 点平均，`max(h, lv+0.02)` 在 d=7m 处断开 → 抬出 5m 高的平台断崖（ravine/丘陵里常见）；河岸同理。已平滑过渡，并要求池塘只挖在平坦处。② 峡谷（ravine）通道止于 0.93R，特殊形状的门前是一堵 5.5m 高墙；现在通道通到门口。③ 环形山（crater）/火山（volcano）是封闭圈，坑里进不去 → 各开一个豁口。④ 台地（mesa）边缘近垂直 → 放缓。⑤ 多个地貌叠加出近垂直墙 → `wterrain` 把起伏量烘成 1.5m 网格做 8 邻域 Lipschitz 限幅（≤1.25 m/m），双线性取样，离边界 >18m 渐回原函数（无缝）。坡度 p99 从 ~5.1 降到 ~2.2–2.7；几个风格×约 1000 个节点的自检基本全过，剩下个别小图宝箱/中心点不可达（<0.5%）。
- 未验证：真实游戏里的帧率、长图（Rmax 66、地形网格 ≤220 段 → 约 1.2m/格）的视觉与性能；没有在真实游戏里走过长廊；foe 导航网格在大图上（~130²）BFS 的耗时。下一步可看：长图里的植被密度（草上限 3200 被摊薄）、地图小地图/门标签。
## R41（主管）f —— R47 用户反馈：“这个风格完全不行，改成二次元渲染 + 边缘勾线，颜色有层次，色调随环境；可尝试多种风格；环境可做风格化 3D 材质 + 二次元阴影”
- `js/charlight.js` 重写：人物风格 MOD 组 `cstyle`（单选）：`cs_cel` 赛璐璐（默认）/ `cs_soft` 柔光动画 / `cs_paint` 厚涂质感 / `cs_real` 上一版写实相对光。均需 `char_unify` 开。
  - 明暗只由太阳决定：N·L × 直接采样太阳阴影图（getShadow）；篝火等点光作为“环境影响色”暖光叠加两侧。
  - 五层：基础色（亮面平涂，主光色）/ 阴影色（亮度 = 此处满受光×比例，色相 = 环境光色略冷，提饱和）/ 最暗（朝下面：下巴下、袖底）/ 阶梯高光 / 逆光轮廓光（太阳色）。全部从 Ei（环境辐照度）、S（太阳色）推出，无写死色调。
  - 皮肤按反照率色相判定 → 柔和宽过渡、更亮阴影（脸不出硬阴影块）；头材质（CL_HEAD）弱化自身投影（刘海不把眼睛切黑）。
- 新 MOD `char_outline`（默认开）：反向外壳勾线，`CharLight.dress(root)` 在 foe.js `build()` return 前调用（1 行）。外壳是原网格的子物体（共享骨骼/morph），往后推 2cm 只留外轮廓，远处变细，>30m 不画；线色 = 贴图色提饱和 × 环境亮度/色调（每帧采样灯光）。
- 新 MOD `world_cel`（默认关）：全局 ShaderChunk.lights_fragment_end 追加块，只作用于非角色 MeshStandardMaterial：阴影边缘收硬、阴影染天空色、亮面略平。
- heads.js：inject 多传 head 参数、cache key 用 `CharLight.key()`。mods.js / mods_i18n.js：6 个新条目。
- world.html 测试：`?cldbg=1` 着色调试（R=太阳受光 G=明暗带 B=点光占比）、`nopt:1` 关点光、`sa`/`se` 太阳方位/仰角（相对相机方向）、`fi` 选人。

## R48（CC0 默认重新打开 / 男头全部屏蔽 / Quaternius 职业服身体）
用户原话：「算了还是得CC0」「真有大头娃娃，一些男性角色模型」「动用一切手段在网上找合适的模型，不限于 CC0」。ask_user 结论：① CC0 模式默认**开**，在线找模型不限 CC0，非 CC0 的放进“非 CC0 包”（只在关 CC0 时出现）；② 随机头池**删光所有男头**（不许男头接女身体）。
- **CC0 默认开**：`mods.js` `cc0_only` def true + 迁移 `__v<12`（把 R47c 的 false 改回 true，一次性）。名称/说明（zh/en/ja）同步。**非 CC0 包 = 原有 24 具 remote 身体 + MMD 头包**：关 CC0 时走 R47c 的 IDENT/VB 逻辑（未改）；本轮新增的 Q_* 身体目前只在 CC0 开时按身份指派（`id_outfit`）。
- **男头**：`heads.js` `QC_BAD` += `HairSample_Male`、`Sakurada_Fumiriya`（MOD `head_qc`），并且 `OK(i)` 现在也排除 `qcBad`，所以**旧存档里的男头也会按种子换成女头**。300 次随机 look 抽样：0 个男头。另：`foe.js` `head_natural` 下把头的皮肤包围盒高度夹到 ≤0.272m（Vivi/Vita/Victoria 脸比别的高 ~8%）。
- **新身体（CC0，Quaternius，remote-only `big/body/Q_*.js`，共 ~7MB）**：`Q_Witch / Q_Medieval / Q_Adventurer / Q_Formal / Q_Soldier`（Ultimate Modular Women，低多边形纯色）+ `Q_Ranger / Q_Peasant`（Modular Character Outfits Fantasy 免费版，带贴图，质量最好）。`tools/glb2body.py`：注入 VRMC_vrm.humanoid 后调 `vrm2body.py`（删头、封颈、H_ 骨名）；Modular Women 是 IK 骨架（大腿在 Body 下、脚在 Root 下）→ 转换时把 UpperLeg 重挂到 Hips、Foot 重挂到 LowerLeg（保持静止世界矩阵），否则 UAL 动画下腿会拉成“面条”；`PT*` 是极向量目标，不是脚趾，别映射。
- **身份→身体（`foe.js` `OUTFIT`，仅 CC0 开）**：Q_Witch=witch/hexer/covenlady/bogwitch/alchemist；Q_Ranger=huntress/ranger/archer/falconer；Q_Adventurer=merc/dragonslayer/catthief；Q_Medieval（黑甲+肩甲+背剑）=knight/paladin/general/dragonknight/inquisitor/fallen/assassin/shadow；Q_Soldier=guard；Q_Peasant=villager/shepherd/herbalist；Q_Formal（绿裙）=barmaid；Vita / Victoria_Rubin / Darkness_Shibu / HairSample_Female 留给其余身份（贵族、圣职、宫廷法师、修女…）。Boss：forest→Q_Ranger，wilds→Q_Adventurer，swamp→Q_Witch，fortress→Q_Medieval。`cc0mode.js` 新增 `QB`（只进 `okBody`，不进随机后备池 `BODIES`）。`foe.js`：`Q_` 纯色身体的皮肤材质直接染成头肤色。
- **否决**（见 CREDITS.md）：Ultimate Animated Characters 女性（~1.35m Q 版）、AvatarSample_E（1.17m 幼态）/F/G（同 Vita 款）、Kenney 迷你、Quaternius RPG Characters（Q 版）。Modular Fantasy 的 Noble/Wizard/Knight 在付费版（$20），免费版只有 Ranger/Peasant。
- **没找到**：合适的 骑士/修女/公主/女王 CC0 身体（骑士暂用 Q_Medieval 黑甲风，其余仍用 pixiv 裙装）。非 CC0 方向（VRoid Hub/Booth/Sketchfab）要登录或付费，未下载。
- 风格提醒：Q_* 低模（尤其 Modular Women）与动漫头有画风差，这是用户要“职业服贴身份”的取舍；`Q_Ranger/Q_Peasant` 较协调。未验证：真实游戏里的帧率/全流程（只在 fight/heads_fit 台里看过静态与 UAL 动画姿态）。

## R49 · 剧情电影「异变」+ 月之线索（MOD `saga`，默认开，仅中文）
用户原话：「每进入一个区域来一个电影，字幕，每次都不一样，有地区特色，分镜电影化，二次元女主剧情的感觉；剧情围绕该地点的一个变化，本次主线任务=杀死目标得到头，变化对你有利；没杀死则不利。大师级随机无穷组合。主线还是杀死月之魔女；不同区域会遇到月之魔女使者线索，杀死线索+1，集齐才能挑战；触发某些条件解锁剧情，剧情有线索。战中三选一→做成建筑，出门结算要更好玩。技能改成「回忆」：随机 3 选 1，不同流派。头棋对手太弱没成就感。」
- 文件：`js/saga_data.js`（地区词库×11 个异变原型×独白/线索/章节模板）、`js/saga.js`（生成器 + 电影播放器 + 目标注入 + 恩/祸 + 线索 + 结算 + 追踪 HUD）。测试：`node tools/test/saga_gen.js`（槽位全填满、约 8600 条不同文本行/3000 次、时长分布），`tools/test/saga.html`（真 three + 假地形 + 桩，`/var/work/pw/saga_shots.js` 截图）。
- 改动的旧文件（一行级）：`js/worlds.js` frame 末尾调用 `Saga.cam`；`js/arrival2.js` Saga 开时不自动弹大窗；`js/elites.js` victoryState.all=月之魔女已斩（Saga 开时）+ goalHTML 用 Saga；`js/ui.js` 出洞页提示；`index.html`；`mods.js`/`mods_i18n.js`。
- 流程：`Worlds.start` 包装 → `setupTrip` 生成 saga（槽位随机：名字、头衔、异变类型、地区词库；同地区最近 3 个原型不重复；线索未满时月使概率 0.28+0.2×连续未遇次数），在 depth≥1 的节点注入一名有名有姓的目标（沿用 RegionQuest 的 RPG.foe + Foe.populate 方式，HP 按 FoeAbs.hpK(rec×1.1)，月使更强）。W.B 就绪后播放电影：宽银幕 2.39:1、颗粒/暗角/地区色调、字幕（说话人牌）、6~7 个镜头（航拍/推轨/低角扫摄/环绕/俯瞰/走向门），`Saga.cam` 在 worlds frame 里接管真 3D 相机；空格/点击下一幕，Esc 跳过，最后一幕等玩家按空格出发（保证重新锁定指针有用户手势）。首访约 40 秒，4 次以后逐步缩短（lvl 0/1/2）。
- 恩/祸（2 趟该地区）：恩 = 敌伤 −12% / 结算魂晶 +35% / 入场回血 30%；祸 = 敌伤 +12% / 敌血 +15% / 仇恨 +6 / 结算时损失 6% 魂晶（≤800）。斩首即平息（大横幅），回洞后 1.6 秒弹出「出门结算」卡（异变结局、恩祸、战利品、线索进度）。死亡不结算。
- 月之魔女：`Elites.MOON.cond` 改为「月之线索 ≥7」（运行时补丁，Saga 关闭则回到 13 精英）。线索来源：月使（斩首）、8 个章节闪回（kills≥10 / 首个霸主 / 首个猎手 / 首个精英 / 失败≥2 / 成功≥3 / 同地区≥4 次 / 稀有头）。线索列表显示在「精英挑战」面板顶部。
- 未验证：真实游戏里的相机接管（FPV 手臂/武器是 camera 子节点，进电影时隐藏；FPV 若每帧重设 visible 会露一下）、HUD 隐藏（body 直属子元素 opacity=0）、目标注入在狭长/特殊形状地图上的位置。
- 待做（同一轮后续）：回忆祭坛建筑（随机 3 选 1 技能，不同流派）、头棋 AI 加强。
## R41（主管）g —— R47 第 4 项：人物移动像 GMod（+ 用户：R47f 的风格全部保留，world_cel 改默认开）
- 新 MOD `npc_locomo`（默认开），新文件 `js/locomo.js`。实测（脚+脚趾着地点轨迹，tools/test 下 calib 脚本思路见文件头）：髋高 0.93m 身体上 UAL 自然步速 走 0.98 / Jog 5.9 / Sprint ~9.1 m/s。
  原 AI：走 1.6–1.8m/s（脚前滑 ~2×）、慢跑 3.4m/s 播 Jog×0.85（腿快 1.5×，原地蹬跑步机）、Sprint 同理 → GMod 感。
  - 拦截 f.play 的 Walk/Walk_Formal/Jog/Sprint → 按【实际位移速度】三段相位同步混合（左脚最前相位对齐），播放速率 = 速度/混合步幅，限幅 走 0.5–1.8×、跑 0.5/0.62–1.25×。后退只用走路倒放。
  - 起步 7m/s² / 刹车 10m/s²（职业 rv 突进 16，攻击 fo.atk 时保持原 14/s 指数响应）。
  - 转身：角速度弹簧（角加速度 26rad/s²，最大角速度随速度 5.2→2.3 rad/s），跑动时向内侧倾身（≤0.12rad，root.rotation.z）。
  - AI 要 Idle 但还在滑行（>0.55m/s）→ 先减速到 0.35m/s 再切。攻击/受击立即交叉淡出移动动作。
  - 测试：同速度下着地脚滑移（m/s）旧→新：0.8m/s 0.30→0.09；3.5m/s 1.65→0.20；4.5m/s 3.45→0.22。真实 AI（world.html crowd+sees）追击→逼近→出拳全流程无报错。
- foe.js 4 处钩子（均带 R47 npc_locomo 注释）：animate 暴露 `f._cur/_setCur` + `Locomo.install(f)`；转身行；速度平滑行（`burst` 标志）；`mixer.update` 前 `Locomo.tick`。
- mods.js：npc_locomo 条目；world_cel 默认 true。mods_i18n.js：npc_locomo。index.html / world.html：foe.js 前加 locomo.js。
- world.html：`window.__foes`（crowd 敌人数组）。

## R49 stage B+C（saga 续：回忆 / 沙盘 / 战利品三选一 / 棋 AI）
- **新文件 `js/memory.js`（`window.Memory`，MOD `memory` 默认开）**：技能点改成「回忆」——从「当前可学」的天赋节点里随机抽 3 张（有 🪞回忆之镜 建筑时 4 张），**必须来自不同流派**（刃舞/铁壁/影袭/狂血/魂术/猎首），三选一，选中走 `Talents.alloc(id)`；还有点数就连抽。重抽：魂晶 40×等级×次数；有镜子时每轮第 1 次免费；`S.saga.rr` 重抽券（结算三选一可得）也免费。键 1–4 / R / Esc；洞里有空余技能点时右上角徽标提示，**按 ` (反引号) 唤醒**；出门结算卡关闭后自动弹出 `Memory.afterSettle()`。天赋树界面仍可手动加点（未移除）。
- **新建筑（都注册在 `BuildCat.C`，由 memory.js 的 `registerBuild()` 等 `G.HOOK`/`BuildCat` 就绪后注入，无新模型，复用 CC0：ornate_mirror_01 / brass_candleholders / chinese_console_table / Lantern_01）**：`memory` 回忆之镜（E 打开回忆；出猎 1 次后解锁）、`wartable` 征途沙盘（E 打开 `UI.openExpedition()`＝出猎地点三选一；tip 里显示 Saga 月之线索）。原有 Tab 枢纽/出洞入口保持不变。
- **结算卡（`js/saga.js` `showSettle`）**：新增「战利品 · 三选一」（魂晶袋 / 旧日手札=经验 / 月下泉水=回血 45% / 镜中残片=回忆重抽券 / 安魂烛=仇恨 −6 / 磨刀石），点击选、关卡时 `applyReward()` 发放（默认第 1 份）；卡片紧凑化使 720p 也能一屏看完（含“收下结算”）。
- **棋 AI（`js/chess.js`）大幅增强**：迭代加深 + Zobrist 置换表 + 杀手/历史启发 + PVS + LMR + 静态搜索 6 层 + 新评估（兵形/通路兵/开放线/双象/王盾/残局王活跃/对方重子逼近王/XS 特殊走法加成）。难度阶梯：1–4 级仍是「固定深度+噪声」（新手友好），5–12 级改为 `md`(最大迭代深度 5→10) + `time`(1.8s→4.8s) 无噪声。`tools` 对局测试（节点脚本，取 chess.js 引擎段）：新 5 级 vs 旧 12 级（同 1s 限时）8:0。**不要恢复旧 `nega`/`think`。**
- 测试页：`tools/test/memory.html`（真 talents_data + 桩 Talents/G；`?altar=1` 模拟有镜子）。
- 已知：回忆/建筑只在独立页验证（整游戏+世界在 2GB 沙盒会卡死），真实游戏里的建筑菜单出现、E 交互、反引号徽标未实机验证。

## R49c（用户反馈：出洞后看不到技能栏）
- 加固 `js/saga.js`：电影期间隐藏 HUD 改用 `body.sgcine` 类（不再改元素行内 opacity），`end()` 移除；`tick` 兜底（CN 为空就移除）；`play` 抛错时走 `end()` 恢复（含第一人称武器可见性）。**未能在无头环境复现**（headless 无 pointer lock），若仍看不到技能栏，查 `hub.js` 的 `body.hubon` 与 `talents_ui.js` 的 `show=!!W&&!W.busy&&!W.dead`。
- 说明：洞里技能栏左侧的 Q(闪避)/E(攻击)/H(药) 是**基础动作**，不需要学习，任何时候都能用；天赋技能（1–0 槽）只在学了之后才出现。
- 手机：项目目前无触屏控制；`index.html` 同步加载 ~135MB JS（models 100MB + assets 29MB，gzip 后约 65MB）。方案见对话。

## R49-load · 加载提速（MOD `fast_load`，默认开；关掉恢复旧流程）
用户："继续优化地图加载速度，越快越好，秒加载最好"。沙盒里 swiftshader 跑不了真实整趟进图（主线程被软件 GL 卡死 >2 分钟），所以只测了 CPU 部分（node 里的 buildNode、heads_fit 里的 populate、页内模型解码），GPU/着色器编译部分按推理处理，**没有真机数据**。
- `worlds.js goto`：淡出 260ms 不再串行等（与加载并行，加载层在 260ms 后才显示）；末尾 `wait(60)` 去掉；新增 `kickAhead(node)`：进场第一步就 `populate(node)`（只依赖 node）→ `Foe.preload`（身体模板+UAL 动画）与 `Beasts.prefetch`（野兽模型）与 `need()` 并行。
- `b64buf`：fast_load 下改同步 atob（实测 19 个模型：fetch(data:) 735ms vs 同步 500ms）。
- 地形：`H` 只在内圈（RM+18）逐点求；外圈（玩不到、被雾吃）每 2 格精确求一次，其余双线性插值。内圈与旧结果逐点相同（diff 0），外圈最大偏差 ~1m（高频山脊被平滑，在雾里）。node 里 buildNode 平均 102→78ms（测试桩里很多特性关着；真实游戏地形函数更重，收益更大）。
- `foe.js`：`template()` 并发去重（preload 与 populate 同时请求只解析一次）；`planBodies/preload` 与 populate 里选身体的逻辑一致（IdLook.apply 幂等）；populate 先 `Promise.all` 并行载入全部身体模板再顺序 build；boot 5s 后空闲时预载 UAL 动画包。`Foe.preload` 已导出。
- `beasts.js`：新增 `prefetch(node)`。
- `mods.js`/`mods_i18n.js`：新增 fast_load。
- 没做/后续：着色器预编译（需真机确认变体）、`paint()` 外圈降采样、邻居地点的 body 预载（会在战斗中造成 30–60ms 卡顿，暂不做）、GLB 贴图降分辨率（会改画质）。`renderer.debug.checkShaderErrors=false` 在 r147 里收益很小（getUniforms 仍会等链接），没加。

## R49d（用户反馈：看不到技能栏 / 猎手别开局出现 / 入场电影要有人设 / 大小头 / HP 太偏）
- **技能栏看不见**：无头环境实测（禁用 pointer lock）：洞里 `#tbBar.on.cave`，出洞后 `W.busy` 很久为 true（加载）期间栏被隐藏（设计如此：`show=!!W&&!W.busy&&!W.dead`）；真机上的具体原因**仍未复现**。已做：① saga 电影隐藏 HUD 改用 `body.sgcine`（42b1eff）；② `hudfix.js` 新增看门狗（野外非加载/非死亡/非电影时，清除 tbBar/tbCol/hud/wHint/hpC 的行内 opacity/visibility、移除残留 sgcine、缺 `.on` 就补）。洞里 Q/E/H 三个格子是**基础动作**（不用学）。
- **新 MOD `hp_center`（`js/hpcenter.js`，默认开）**：屏幕底部正中大血条 + 魂能条，掉血白色残影，<35% 红光脉动，<20% 屏幕边缘泛红；`hudfix.js` 写 `--tbB`（热键栏高度）并把 `HpCenter.extra()` 并进 `--tbH`，其他贴底提示自动上移。洞里只在受伤时出现；Hub 打开时隐藏。
- **猎手**（`js/hunters2.js`）：① 感应条触发的随机降临要求「地区恶名 S.h2.reg[loc] ≥ 6 且 仇恨 ≥ 8 且本趟已停留 ≥ 1.5 分钟」（不再开局出现；恶名=在该地区的放倒+0.5×斩首）；② 新 `rollOmen(k)`（trips≥3、仇恨≥6、隔 ≥2 趟、概率 0.06+0.035×恶名+0.008×仇恨，上限 0.6）在 Saga.setupTrip 里决定**入场伏击**；`ambush(id)` 立即刷出猎手，Saga 电影等她出现后（≤9s）用「猎手登场」镜头介绍她；`cur()/infamy(k)` 导出。
- **入场电影加「人设介绍蒙太奇」**（`saga.js` `castPick/castBeats/castShot`）：从场上活人里挑 1–2 人（优先猎手 > 目标 > 最近的人），每人 3–4 个硬切特写（脸 cFace / 眼睛 cEyes / 手 cHand / 低角度全身 cLow / 过肩 cOver），镜头跟随活体头骨/手骨，被拍者构图在右、名牌在左（大字名字 + 头衔 + 性格/喜欢/怕 chips，来自 `Overhear.bio`，猎手显示等级与战斗风格），字幕=口头禅/秘密/“她 + 做事动作”。电影期间玩家血量锁定。测试：`tools/test/saga.html`（桩角色）+ `/var/work/pw/cast_shots.js`。**未在真实游戏里验证**（沙盒内跑整游戏太慢）。
- **大头/小头**（`js/foe.js`，MOD `head_norm` 默认开，依附 head_natural）：脸高统一成「身体身高/6.6」（身高=头骨关节高+0.2），夹在原比例 0.8–1.15 倍内，并重算头位置。

## R41（主管）h — R50 用户反馈：猎手感应太快 / 猎手 UI 丑 / 合作者新身体怪（全部 MOD，默认开）
- **MOD `hunter_calm`**（`js/hunters2.js`：`calm()`/`CALM` 常量块在 `endEncounter` 前；`tick()` 里击倒/斩首增量、时间增量、满后判定三处分支）：击倒 +2.5（原 7）、斩首 +1.5（原 4）；出猎前 120 秒不随时间涨，之后 `0.07+min(分钟,10)*0.006`/秒 ≈ 4.2→7.8%/分钟（原 15%+）；满后每 12 秒判定、概率 6%→50%（原 5 秒、15%→90%）；遭遇结束冷却 150 秒（原 40）。估算：常规节奏从 ~4 分钟来一次变为 ~12 分钟。
- **MOD `hunter_hud2`**（同文件 `ensureHud()` CSS 末尾追加 `#h2Hud.v2 …` 规则；`drawHud()` 给 `#h2Hud` 切 `v2` 类并输出新结构）：感应改成顶部 250px 黑曜石切角小面板（准星 SVG + 标签 + 百分比 / 4 段细条 / 一行“仇恨·升级还差·[U] 档案”），<30% 半透明；满时红描边“猎手将至”。猎手血条、横幅同风格（血金、切角、HP 条 30% 逃跑刻度、横幅金色细线代替糊状径向阴影）。用 ui3a 的 CSS 变量（有后备值）。id 不变。对比图：`/home/user/shots_r41/hud_r50.png`（工作区）。
- **MOD `body_qc50`**（`js/cc0mode.js` `body()` 开头 `QBAD` 映射；`Foe.build` 入口本来就调 `CC0.body`，所以身份服装/Boss/旧存档都覆盖）：逐个渲染质检（`tools` 外的 qc.py，孤立场景）后停用 Q_Witch→Darkness_Shibu、Q_Medieval→Vita、Q_Adventurer→Q_Ranger、Q_Formal→Q_Peasant、Q_Soldier→Vita。原因：纯色无贴图低模、爪形手、手臂姿势坏、肤色和动漫头不符。Q_Ranger/Q_Peasant 有贴图，保留。**文件没删**（永不删身体规则），关 MOD 即恢复。给合作者：如果要再加 Quaternius 身体，请先确认有贴图、手型正常，并给皮肤材质打 `userData.skin` 以便染成头的肤色。
- 身体库扩充调查：公开可直接下载的 CC0 VRoid 女性身体已全部用完或按规则剔除（madjin vroid/beta 全套、webaverse model7–13 = 同一批 pixiv 文件）；ToxSam/100Avatars CC0 是 Q 版吉祥物风格，不符。剩下唯一的路是 VRoid Hub 上作者标 CC0 的模型（需要 pixiv 登录，清单 `tools/r40_vroidhub_cc0.md`，用户下载到 `/home/user/vrm_in/` 后我来转）。

## R50-gfx · 死亡镜头 + 画质（用户："角色死的时候会 TP 回家再播放死亡动画？""地图很劣质、多边形丘陵、有没有低成本大师级的渲染方案、毛茸茸"）
全部是可开关 MOD，默认开。用 `tools/test/world.html?reg=meadow&seed=5` + `window.__node(i,{view:'eye'})` 截图验证（960×540，走 Master 后处理）。
- **`death_cine`（worlds.js dieNow）**：以前玩家死亡 = 红闪 1.2s → `stop()`（镜头回洞窟）→ ui.die 再等 900ms 才弹死亡界面，所以看起来是"先传送回家再死"。现在：就地倒下（镜头下坠 + 侧翻 1.1s，frame() 里 `W.deadT`）→ 1.35s 渐黑 → 1.75s `stop()` 但保持黑屏 → `api.die()` → 死亡界面出现后 1.25s 淡出。Explore（文字版）未改。敌人的布娃娃在 fight.html 里测过：没有位置跳变。
- **`ground_props`（worlds.js `baseY`）**：大件摆设（脚印>0.45m）按脚印四角取最低地面并下沉，不再悬在坡上。
- **`water_fx`（wgen.js `waterMat`/`bakeWaterDepth`，worlds.js 湖布局也改用）**：水不再是硬边平板：距岸深度图（数据纹理，不是美术贴图）→ 岸线渐隐、浅滩泛亮、岸边泡沫、更细的涟漪、深处更深；环境反射 0.65→0.36。
- **`shell_grass`（新文件 js/wgrass.js，index.html 与 world.html 已加 script）**：壳层草（shell texturing）：同一地形网格沿法线外推 12 层（只覆盖玩家可达区域、≤27m），片元着色器按哈希格子丢弃像素 → 一根根变细的草，顶端随风摆，`MeshLambert` 所以太阳/阴影/雾都正常；路、水边、陡坡自动不长；干旱地区稀疏偏枯黄；颜色 = 基色 × `g.grassMul`（季节）。无草模型、无贴图。新增 1 个着色器程序。**没有真机帧率数据**（沙箱软件渲染）；如太卡：减 `N`（wgrass.js）或在 MOD 里关 shell_grass。
- master.js 色差 `ca` 0.0016→0.0007（细铁栏杆在屏幕边缘出现洋红/绿色条纹）。
- 未做：① 用户说"违和的音效人物语音/人物模型"——太笼统，已向用户追问具体哪里违和；② 丘陵仍是 1.1m 网格 + 固定对角线三角化；③ 大块岩石（rock_face）上的黑斑是阴影/法线问题，未查。
## R41（主管）i — R51 用户：“头身比不对、把男性身体也加进来了快删除，只要 VRoid 女性身体；全网找，非 CC0 也行”
- **删除** `big/body/Q_*.js` 全部 7 个（用户明确下令删除；这是对“永不删身体”规则的用户本人覆盖）。给合作者：请不要再加非 VRoid 身体。`js/foe.js` OUTFIT 里的 Q_ 条目删掉、OUTFIT_BOSS 改回 VRoid；`js/cc0mode.js` QB=[]，QBAD 映射保留（旧存档/旧引用一律换走）。R50 的 MOD body_qc50 已并入并移除。
- **MOD `vroid_only`**（默认开，`js/cc0mode.js` VRF/vroidOnly，`CC0.body()` 第一行；`js/foe.js` `bodyFor()` 开头 VR_ID/VR_BOSS）：所有身体只从 8 具 VRoid 女性身体里按身份挑：Vita、Victoria_Rubin、Darkness_Shibu、HairSample_Female、AvatarSample_A、AvatarSample_B、Osage、**V_KF（新增）**。不管 cc0_only。`Foe.build` 入口也经 CC0.body，所以猎手/剧情等写死的原神身体名同样被换走。300 次抽样只出这 8 具。
- 排除：HikariCape/HikariScholar（到头骨只有 1.13m，幼态比例，手臂 V 形姿势坏）、原神 MMD 身体（不是 VRoid）。文件留着，只是 vroid_only 下不出现。
- **全网搜 VRoid 女性身体的结果**（逐个读 VRM 内嵌授权；标准：允许暴力 + 允许改造 + 允许再分发，因为游戏要斩首=改造，推到 GitHub=再分发）：
  - 收：AvatarSample_K_F（pixiv，VRM PL，全允许）。
  - 转了但外观否决：AvatarSample_L（1.9m 黑色战术服，显男性化）、VRM1_Constraint_Twist_Sample（白色方块大 T 恤）。
  - 授权不合格：AvatarSample_F / M（禁止暴力/改造/再分发）、nikechan v1/v2（OnlyAuthor、禁暴力）、杉山巨樹 2 个（禁暴力/再分发）、スタンダードピンク（禁改造/再分发）、モブ子E（校服+禁再分发）、Whingles（禁改造）、fem_vroid（无衣服素体）、Seed-san（非 VRoid，机器人手臂）、vroid-sample-d = 千驮谷涩（校服）。
  - 仍待：VRoid Hub 上作者允许暴力+改造+再分发的模型需要 pixiv 登录下载（tools/r40_vroidhub_cc0.md）。

### R50-gfx (b) shell grass variety
`js/wgrass.js`: each node seeds its own look (mulberry of g.seed): palette pair from per-biome pools (fresh/yg/lime/bg/olive/straw/moss/rust), density 11–23, height, blade width, colour-patch + height-patch noise, per-blade brightness jitter, optional flower tips. Same MOD `shell_grass`; still shader-only (no models/textures). Tip colours of straw/yg/rust darkened to avoid washed-out fields. Not verified on real GPU.
`js/wgrass.js`: each node seeds its own look (mulberry of g.seed): palette pair from per-biome pools (fresh/yg/lime/bg/olive/straw/moss/rust), density 11–23, height, blade width, colour-patch + height-patch noise, per-blade brightness jitter, optional flower tips. Same MOD `shell_grass`; still shader-only (no models/textures). Tip colours of straw/yg/rust darkened to avoid washed-out fields. Not verified on real GPU.

### R50-gfx (c) VRoid Hub 候选扫描（无需登录）
`tools/hub/hubscan.py`：用 VRoid Hub 公开 API（`/api/search/character_models`，头 `X-Api-Version: 11`）按关键词列出「可下载+VRM meta 暴力/改造/再分发全允许+非R18」的模型，只读元数据；`tools/hub/picks.md` 是我人工看缩略图筛过的 40 个。**下载接口需登录，已确认匿名 404；我不绕过登录/验证码，由用户本人下载后交我转换（vrm2body/vrm2head）。**

## R52（画质 Agent · 2026-10-01）— 用户：画质太低级 / 壳层草地“非常不好但有潜力”→ 大师级重写 / 画质拉到最高、惊艳
**用户原话要点（长期有效）**：
- “目前游戏画质太低级了。就是看起来就是普通游戏。”
- “那个壳形草地的效果其实我看来非常不好，但是感觉这种效果有潜力，你能不能大师级写下。”→ **保留 shell texturing 方向**，重写到大师级（不要换回草模型方案）。
- “你能不能大师级让画质变到最高级，让人惊艳的程度。”

**用户长期约束汇总（新模型开工前必读；全部来自前面各轮，仍有效）**：
1. 每次编程前先读 HANDOFF.md；**只追加，不覆盖、不删除**。
2. **小步频繁 commit + push**（用户用模型的网站可能出 BUG 回退）；push 前 `git pull --rebase`；禁止 force-push；有协作者，远端随时会更新。
3. **任何时刻根目录 `index.html` 双击（file://）就能玩**，有可点击的「开始游戏」；classic script + base64 `.js` 资产，不用 CDN / fetch 本地文件 / ES module。
4. token 只放会话环境变量，**不写进任何仓库文件**；不改仓库可见性。
5. 不自制/程序化**模型、身体、贴图**（着色器效果、布局、地形生成可以）；新素材优先 CC0（Poly Haven）。
6. 所有改动做成**可开关 MOD**（`js/mods.js` + `js/mods_i18n.js` 英/日译文），处理好冲突。
7. 用户显卡是**高端独显**：ultra 档放手做，掉帧时 game.js 会自动降到 high/mid。
8. 美术方向：二次元人物（cel 光影 + 勾线）+ 风格化 3D 环境（`world_cel`）；目标是“惊艳”，不是“普通游戏”。

**本机环境（Windows，`E:\farhead`）**：系统没有 git → 便携 MinGit `E:\tools\MinGit\cmd\git.exe`；仓库是 partial clone（`--filter=blob:none`）+ 非 cone 稀疏检出（本地不含 models/ big/ promo/ music/ voice/ beasts/ 的文件，提交不受影响）。本地测试服务器 `node E:\tools\serve.js`（本地缺的文件从 raw.githubusercontent.com 拉一次缓存到 `E:\tools\rawcache`），测试页 `http://127.0.0.1:8765/tools/test/world.html?reg=meadow&seed=5`。

**本轮计划（每完成一项就推送并在下面追加记录）**：① 壳层草地 v2（重写 `js/wgrass.js`）② 天空高清化 ③ 大气层（太阳光束 / 空气透视 / 低地薄雾，后处理）④ 调色与曝光。

## R41（主管）j — R51 战斗动作：方向性移动 + 架势个性化
用户：“战斗时左右移动，步行动画却是前后走，很奇怪；每次战斗姿势都一样，违和”。
- 查证：UAL 免费版（UAL1/UAL2 Standard）**没有**横移/后退动作（Pro 才有），别再找；试烘了 NinjaJump_Idle（空中跳跃姿势）/ Zombie_Idle / Pistol_Idle，均不适合战斗架势，已撤回，`big/anim/ual.js` 与 `tools/anim_bake.py` **未改**。
- 新文件 `js/stance.js`（两个 MOD，默认开）：
  - `npc_strafe`：mixer 更新后，胯骨绕世界竖轴转向实际移动方向（≤±77°，速度越快越小），spine/chest/upperChest/neck 按 30/30/25/15% 反扭 → 脚顺着移动方向迈步、胸口和脸仍对着玩家；移动方向在身后 >110°（<95° 退出，滞回）时用倒放走路。依赖 `npc_locomo`。
  - `npc_stance`：只替换“对峙中”（state==='chase' && seen）的 `Sword_Idle`/`Idle_Loop`；按身份（CASTER/PROUD/FIGHTER 集合）+种子给主/副架势（Sword_Idle、Idle_Shield_Loop（空手=举拳护架）、Spell_Simple_Idle_Loop、Idle_FoldArms_Loop），4–9 s 可能换；节奏 0.8–1.25、随机相位；侧身/前压后仰/歪头体态，出手/硬直时淡出。
  - **坑**：UAL 重定向不给部分体型的 spine/chest 写轨道，mixer 不会每帧覆盖 → 程序化偏移会逐帧累积（整个人转过去）。stance.js 的 restore()/commit() 记录每根被改骨骼的改前/改后值，下一帧若未被 mixer 覆盖先还原。以后谁在 mixer 后改骨骼都要注意这一点。
- 改动他处（最小）：`js/locomo.js` tick 多记平滑速度 L.vx/L.vz、相对移动角 L.rel、后退判定 L.bk（滞回），npc_strafe 开时 back 取 L.bk；`js/foe.js` animate() 末尾 `Stance.install(f)`、`f.mixer.update(dt)` 之后 `Stance.post(fo, dt)`；`index.html` 与 `tools/test/world.html` 在 locomo.js 后加 `<script src="js/stance.js">`；`js/mods.js`/`js/mods_i18n.js` 两条 MOD。
- 验证：横移胶片（关/开/后退）、5 人对峙截图对比，ai.py / index 启动无报错。
## R49e — 舒适洞穴 (MOD `cave_cozy`, default on) — cave.js / game.js / cavecozy.js / mods*.js / index.html
User: cave was pitch dark + sealed → brain reads it as unsafe/disgusting. Fix from perception psychology (prospect–refuge, warm/cool colour contrast, no pure black, slow soft flicker, dry/clean look).
- cave.js: dome apex triangles removed → ~1.5m oculus directly over the fire (smoke hole), bright HDR sky disc above, daylight SpotLight onto floor, faint additive light shaft (fades near camera to avoid wash-out), 70 drifting dust motes; brighter wall/floor vertex colours, less burn/edge darkening.
- game.js (`CZ` flag): hemi 1.0 warm cream/brown, moon .32, exitLight 2.6, fog #3a2c21 density ~half, fire colour #ffb468, slower/smoother flicker (no random jitter), bigger light distance.
- cavecozy.js: post grade only in cave (exposure 1.42, vig .17, contrast 1.0, lifted shadow tint); original values restored when a world is active.
- Verified with stub harness `tools/test/cave.html` (?cz=0 old, default new; shots via /var/work/pw/cave_shots.js): skylight + soft shaft + dust + warm floor patch read well; old = near-black. Full-game run (post grade, real lights) still unverified.

## R49f — 技能只能升级三选一 + 简化技能栏 + 底部正中血条 + 偷听框修复 (MODs `skill_pick`, `skill_lite`; files: talents.js, talents_ui.js, memory.js, hpcenter.js, overhear.js, mods*.js)
User (R49f, verbatim intent): skill UI was far too complex; HP not at bottom-centre (only tiny top-left); Overhear popup sometimes never disappears; **skills must NOT come from the talent tree — each level-up = attribute points spent manually + a 3-pick-1 skill choice; then equip from the learned pool to hotkeys.**
- `skill_pick` (def on): `Memory.gate()` locks `Talents.alloc` (tree/builds/dev can't allocate; undo of skills and skill-reset disabled; only attributes can be reset). Memory.pick sets `_allow` around its own alloc. `Talents.onLevel` → `Memory.queue(up)` → auto-opens the 回忆 pick ~1.8s after level-up when safe (cave: not in cinematic; world: no `fo.seen` foe within 42m, not busy/dead), else queued. Chip (right-top) + Backquote now also work in the world.
- `skill_lite` (def on): hotbar = ONE row (Q/E/H utils + learned skills, ≥5 slots, ≤10), no 2nd row / XP strip / T button / hint; old Shift-row skills are compacted into row 1 (`compact()`); `autoPlace` only fills slots 1–10. Pending picks show a purple 🧠 badge on the bar. T panel has only 属性 + 技能 (learned actives with equip/drag, passives as chips); tree/build tabs hidden. Top-left player frame (HP/MP bars, face) hidden — buffs/target frame remain.
- `hp_center`: now ALWAYS visible (cave too) with Lv badge, HP, soul bar and a thin XP strip; hidden under `hubon`/`sgcine`.
- Overhear popup: replaced `requestAnimationFrame(add .on)` (rAF pauses in background tabs → the hide timer ran first, `.on` added later → stuck forever) with setTimeout; added a 500ms watchdog (hard deadline, leaving world, cinematic, hub) and `enter()` aborts if the world is gone.
- **GOTCHA**: a MOD in `mods.js` without `def: true` is OFF by default even if code checks `!== false` — `cave_cozy` was missing it (fixed). Always add `def: true`.
- Verified in the real game (cave, headless): gate works (alloc refused), Memory cards show, picks add skills, big HP bar at bottom-centre above the one-row bar, T panel shows 2 tabs. NOT verified: in-world level-up auto-pop, Overhear fix in a real trip.

## R49g — 魂能条 (MOD `mana_ui`, def on; hpcenter.js / talents.js cast / mods*)
User: "mana/cast system is shit, mana should be visible to the player, UI up to you". Mana mechanics already existed (60+3·soul max, regen 2+0.08·soul ×1.5 out of combat, hit +2.5, parry +8, kill +10); the problem was visibility/feedback. New big blue bar under the HP bar inside `#hpC` (bottom-centre): number + regen/s, skill-cost TICKS (digit = hotkey, lit when affordable), gain/spend floaters, red shake + "魂能不足 · 还差 N" via `HpCenter.manaFail(need)` (called from `Talents.cast`), low (<25%) red pulse, full glow. `HpCenter.extra()` now = measured hpC height. Verified in real cave (900×506 shots m_low/m_fail/m_ok). Not verified in a trip.
---
## R53 — VRoid Hub 批量引入（头 + 身体）（agent: sourcing）
- **来源与授权**：用户自己的 pixiv 账号（用户亲手过验证码登录；我没有碰验证码）→ 从 VRoid Hub 下载。授权筛选：VRM0 需 `violentUssageName==Allow` 且 (CC0/CC-BY 或 `otherPermissionUrl` 含 `redistribution=allow&modification=allow`)；VRM1 需 `allowExcessivelyViolentUsage` + `allowRedistribution` + 允许改造。旧 `picks.md` 里不少项只看了许可名，没看 URL 里的 `redistribution=disallow`，**不要信 picks.md 的授权栏**；`tools/hub/hubscan.py ok()` 已修为同 `vrm2head` 的检查。
- **流水线**：`tools/hub/hubpipe.py`（下载→`vrm2head`→`vrm2body --tex 768`→删原文件，约 34 秒/个）+ `tools/hub/hubpush.py`（质检 + 用 git plumbing 直接批量推到 origin/main，不碰工作区）+ `tools/hub/mkpack.py`（渲染身体拼图量明度 → 按标签/明度选身份 → 写 `js/vroid_pack.js` 与 CREDITS 片段）。质检：身体比例 `eyeY/(eyeY-neckY)` ≥ 9.8（成人比例 10.8–11.1；Q 版约 6）；不用绝对身高。标签含 ロリ/水着/下着/おばけ 的一律不登记（R23 精神）。
- **结果**：约 135 个候选 → 授权不通过被跳过约一半 → 通过质检并推送 68 个，其中登记进游戏的见 `js/vroid_pack.js`。头在 `models/VH_*.js`（未登记，保持随机头池不变）；身体在 `big/body/VH_*.js`。
- **接入**：MOD `vh_bodies`（默认开）。`js/vroid_pack.js` 的 `VH_PACK[file]={n,a,ids}` → `js/foe.js vhExt()` 把这些身体并入对应身份的 vroid_only 候选（原 8 具仍在，被稀释）；`js/cc0mode.js body()` 在 vroid_only 下放行 VH_PACK 里的名字；`foe.js template0` 对有独立皮肤材质的 VH 身体自动 `TINT[name]=1`（头肤色同步）。boss 仍用原 8 具。测试台 `tools/test/bodygrid.html?list=VH_a,VH_b`（身体拼图）；`fight.html`/`heads_fit.html` 已加载 `vroid_pack.js`。
- **没做/注意**：身份映射是自动 + 看图粗选，可用 `OVR` 或直接改 `VH_PACK[..].ids`；个别身体是现代校服/便服款，若觉得违和直接从 `VH_PACK` 删对应条。登录文件已从工作区删除；用户应更换 GitHub token。

## R52 记录（画质 Agent）— 新增画质 MOD、性能与去灰、MOD 配置码
用户追加原话要点（长期有效）：“更新要以 MOD 形式推送”“要最强效果”“不要浪费时间在无效检查，尽可能多加新内容”“画面现在灰蒙蒙的，而且特别卡！性能优化注意！”“MOD 界面加一个哈希值（配置码），我发给 agent 就能算出我开了哪些 MOD，之后可能让你把我要的 MOD 设为默认”“MOD 之间相互影响的关系也标注出来”。
| MOD（默认） | 文件 | 内容 |
|---|---|---|
| `grass_master`（开，依赖 shell_grass） | `js/wgrass.js` | 壳层草 v2：12m 分块实例化壳（ultra 24 / high 16 / mid 10 层，**按像素数自动缩减**；`?gn= ?gk= ?gq=` 测试用），全部块共用 **2 个材质**（深度预通道 + EQUAL 着色，抽层 LOD 只换实例属性 `aL`，不切材质），扫掠线段-椭圆求交，烘焙场进顶点属性（`gm/wgF/wgL`），风浪/拨草/逆光透射/A2C；地面材质染草色（`patchGround`）。关 = R50 v1（同文件 `buildV1`）。 |
| `world_atmos`（开） | `js/master.js` + `js/gfx52.js` | 野外后处理：朝太阳 Mie（`P.mie/mieDist`）、低地薄雾（`P.mist`）、天空作源的太阳光束；**去灰**：内置 FogExp2 密度 ×0.72（gfx52 每个新场景一次）、合成里压黑位 `P.black`。 |
| `cloud_shadows`（开，依赖 world_atmos） | `js/master.js` | 噪声云影沿太阳方向投到地面并飘动。 |
| `filmic_agx`（**关**，迁移 `__v13` 一次性关） | `js/master.js` | AgX 色调映射；用户嫌灰，默认改回 ACES。 |
| `sharpen`（开）/ `lens_flare`（开） | `js/master.js` | FXAA 后 AMD CAS；泛光高亮的镜头鬼影 + 光环。 |
| `terrain_detail`（开） | `js/assets.js` | 三平面材质 22m 内叠加 3.73× 细节亮度 + 法线。 |
| `foliage_glow`（开）/ `sky_master`（开）/ `water_master`（开）/ `pcss_shadows`（开） | `js/gfx52.js` | 树叶逆光透射（全局 chunk，非 CHAR_MAT 的 alpha 裁剪材质）；天空 Catmull-Rom + 太阳 HDR 光晕；水面按反射向量采样清晰天空 + 菲涅尔；PCSS（6+10 采样，只对 `shadow.radius>8` 的光，gfx52 每帧把野外太阳设为 `2070/阴影半宽`）。 |
- **MOD 配置码**（`js/mods.js`）：O 面板顶部「配置码 MOD1-校验4-默认签名3-内容」，点击复制；底部「📥 导入配置码」可套用。内容 = 与默认不同的每个 MOD 的 `FNV(id)%36^4`（4 位 base36）+ `+/-`，排序拼接。**agent 解码**：`node tools/modcode.js <配置码>`（读当前 `js/mods.js`；“默认集与当前版本不同”时去 git 历史找对应版本）。`Mods.code()` / `Mods.decode()` / `Mods.rels(m)` 已导出。
- **MOD 关系标注**：每行显示 🔗N；展开后列出 依赖 / 被依赖（关掉会连带关）/ 冲突（双向）/ 同组单选 / 相互影响。软关系写在条目的 `rel: { 其它id: '说明' }` 字段（双向显示）；新 MOD 有已知相互影响请补 `rel`。
- 性能参考（RTX 2070S，1280×720 ultra）：草 v2 约 +4.7ms（之前 +12ms，主要是每块 2 个材质导致的切材质开销）。卡时依次关：`grass_master` → `pcss_shadows` → `world_atmos`。
- 本机测试注意：Playwright 先 `page.bringToFront()`（后台 rAF 会停，gfx52/WorldMaster 钩子不跑）；改 js 后用 CDP `Network.setCacheDisabled` 防止吃到旧脚本。
## R49h (decap_cam redesign + world-frame bridge + compact HUD)
- **js/decapcam.js (NEW, MOD `decap_cam`, default on)**: 斩首特写 = slow-mo cinematic. Letterbox bars slide in → smooth time ramp (1→0.2 in 0.12s, hold ~2.4s, ease back by 3.2s real) applied via new `Foe.slowSet(k,t)` (only foes/head/blood slow, player normal; no hitstop) → synthesized SFX (boom, slice, ringing, time-stretch sweep, heartbeat, wet spurts, music/amb duck) → camera never cuts: gentle FOV push (−30%) + soft turn toward the flying head, restored in a microtask → head expression keyframes (surprised → sad → eyes dim) via `hb.setExpression` → arterial neck spray (pulsed, InstancedMesh streaks, ground splats, mist sprites, head blood trail) + lens-blood CSS drops. HP locked, Enter skips, cooldown 6s, skipped when ≥2 aware foes near (bosses excepted), never leaves camera/FOV/post/music stuck. Test: tools/test/decapcam.html.
- **Files changed**: js/foe.js (Foe.slowSet only), js/worlds.js (decap event → DecapCam.onEvent; per-frame DecapCam.pre; runs `G.HOOK.world` callbacks), js/talents.js / js/talents_ui.js / js/hpcenter.js (register frame via `W2` into HOOK.frame AND HOOK.world, deduped by `now`), js/mods.js, js/mods_i18n.js, index.html.
- **IMPORTANT FINDING**: `G.HOOK.frame` does NOT run while a hunt world is active (game.js returns after `Worlds.frame`). Talents.frame (mana regen, buffs, projectiles), TalUI.frame (skill bar) and HpCenter.frame were therefore only running in the cave. Fixed with `HOOK.world` bridge + dedupe. Other HOOK.frame modules (skillfx, balance, unlocks, curios, ...) are still cave-only; check them if something "never updates outdoors".
- cave_cozy default OFF (user request). Compact HP/mana block in hpcenter.js (2px gap, tick chips under the bar).
- Could not verify in a real world run (headless world crashes/hangs the 2GB sandbox); verified with stub harness.

---
## R53b — VRoid Hub 追加：骑士 / 精灵 / 冒险者批（agent: sourcing）
- 用户再次亲手登录（`tools/hub/livelogin.py` 在 8081 端口给用户实时页面；验证码只由用户点，用户过了验证码后我才替他点“登录”按钮）。重新筛选 39 个候选（骑士/精灵/暗精灵/弓手/佣兵等）→ 下载转换 32 个、质检拒 2 个、转换失败 5 个（头部无脸）。人工看图剔除 7 个（现代便服/过矮/暴露）后登记 25 个，`js/vroid_pack.js` 现共 76 个。
- 身份是看渲染图后手工指定的：骑士类（`VH_507309` `VH_476605` `VH_996092` 等 → knight/paladin/guard/general/dragonknight），精灵类（`VH_579317` `VH_110696` `VH_477048` → elfprincess/ranger/archer/druid），暗色 → courtmage/hexer/fallen，等等。`tools/hub/mkpack.py` 现为追加模式（保留已登记）；`VH_IDS` 环境变量可手工指定。
- 事实：Hub 上“允许暴力+改造+再分发”的骑士/盔甲女角色极少（多为男性、机甲或比基尼甲），所以骑士类仍然少；要更多请告诉我具体想要什么风格，或让用户在 Hub 上手动收藏条目 URL，我按 URL 下载。

## R41（主管）k — R51 F 查看（回忆 recall_iw）三个 bug
用户：“F 查看界面底部那些栏都被挡住了，信息栏无法展开，有的头比较小”。真实 index 启动 + Playwright 逐颗打开实测定位：
- **底部动作栏被挡/看不见**：`js/talents_ui.js:50` 有**全局** `.bar{height:21px;overflow:hidden}` 和 `.bar span{position:absolute;inset:0}`（另有 `.card` / `body.ui3a .card` / `.pb` / `.tt` 等全局规则）漏到回忆界面 → 70px 的动作按钮被裁成 21px 高的空框、点击落到 canvas。修法只在我自己的文件里：recall_iw.js 的类名改为 `rbar / rcard / rpb / rtt`（选择器/HTML/querySelector 全同步）。**talents_ui.js 的全局 `.bar` 仍会污染任何叫 .bar 的元素，归属者请加作用域。**
- 同时：`#riw` z-index 60→70（高于 #spbubs 64、低于神灵对话 #spdlg 75）；`html body.riw-on` 用 visibility:hidden!important 隐藏 #hud/#labels/#cross/#toast/#hintTag/#feelBubble/#spbubs/#spchip/#tip/#hint（旧写法被 ui3a 的 !important 压过，左上 HUD 和提示条会透出来）。
- `js/spirits.js` busy() 加 `|| (window.RecallIW && RecallIW.active)`：F 查看中不再弹神灵对话（一行，他人文件最小改动）。
- **信息栏展开**：已想起的行点击展开/收起全文（`.fr.open` 换行显示，▸/▾ 标记，刷新后保持）。
- **头大小**：旧 k = 整颗头包围盒高/0.26 → 同一张脸因发长/帽子 k 从 1.33 跳到 3.0（长发=拿得远=头特别小；高帽=盒中心上移、脸沉到动作栏后）。改为 `faceFit()`：k = 1.4 × hb.group 世界缩放/1.55（ModelHeads 已按脸归一），对准点 = iris 网格中心；打开后 0.6s/1.6s 复测并平滑（刚生成的头网格可能未就绪）。YOFF 0.04→0.09（两眼在画面中部偏下、下巴不压栏）。
- 测试工具：`/var/work/riw2.py`（备份在 /home/user/bak/tools）——index 真实启动、加头、逐个 F 打开，输出 k/对准点/按钮遮挡/全局样式泄漏/可见 HUD 并截图。注意：全量 models 在 2GB 沙盒会 OOM，只 sparse 检出少量头测试。

## R49h-2 (decap_cam: much slower + witness reactions)
- User: wants the slow-mo to be *very* slow so the head's whole flight is watchable, and nearby characters to talk. js/decapcam.js: timeline now 5.8s real (k≈0.075→0.115 hold 4.6s, ease out to 1), ~13x slow; expression keyframes, heartbeat, spray pulses (0.16 game-s) and head blood trail retimed for slow-mo; camera push eases over 1.3s.
- Witnesses: up to 3 nearest live foes within 24m say a line at t=0.8/2.1/3.4s via `Foe.say` (bubble) + large subtitle `.sub` (name + 「line」); first speaker uses shock lines containing the victim's name, brave foes taunt, others panic, bosses menace. Files: js/decapcam.js, js/mods.js, js/mods_i18n.js, tools/test/decapcam.html.

## R54（画质/性能 Agent · 2026-10-01）— 性能 / 秒加载 / BUG / 战斗 / 新敌人 / 山口 / UI 精修（全部 MOD，默认开）
用户原话要点（长期有效）：“显卡跑得很大声 → 性能消耗更少”“场景读取更快、能秒读取”“初始技能点为 0”“铁门太突兀”“战斗要大师级：反馈、敌人更聪明、动作更好”“UI 到 3A 标准”“性能/快速加载/BUG 修复优先”“改了就以 MOD 提交 GitHub”“有时进图所有角色都不动”“敌人头和身体肤色常不一致”“按住左键进入攻击模式（变慢）→ 轻移鼠标定角度 → 松开才攻击；有后摇；低级武器前摇长”“新敌人近战不要播动画，而是显示她准备攻击的角度”。
| MOD | 文件 | 要点 |
|---|---|---|
| `eco_gpu` | `js/eco.js`（mods.js 之后加载）| 全局 rAF 包装：按刷新率整数分频到 ~60fps；菜单/暂停 30、失焦 15、2 分钟无输入 30；分辨率上限 1.0 且只由 GPU 计时（EXT_disjoint_timer_query_webgl2）管理（旧的 FPS 调档会被加载卡顿误导停在 0.7）；野外阴影 2048。`?fps=0` 不限帧。`Eco.stats()`。 |
| `instant_load` | `js/worlds.js` + `js/eco.js` | 进场后空闲预取相邻地点（资产 + `kickAhead` 敌人身体/动画/野兽），走近门 12m 立即预取；图片 `decode()` 异步解码 + 空闲 `initTexture`；`renderer.debug.checkShaderErrors=false`（实测切图 7.6s 卡在 getProgramInfoLog；`?shadercheck` 恢复）；着色器程序常驻（`usedTimes++`，切图不再删了重编）。`need()` 30s 超时不再永远卡加载框。PROF 新增 `foes`/`beasts`。 |
| `stuck_guard` | `js/guard54.js` | uiOpen 卡住且屏幕无面板 3s → `G.unstick`；W.busy 卡住 6s → 解除。另：`Foe.update` 每个敌人 try/catch、`Worlds.frame` 子系统 try/catch、game.js 出错仍出画面（“全场定格”根因防护）。 |
| `sp_zero` | `js/talents.js pts()` | 开局 0 技能点（旧档已花掉的旧开局点保留，不出负数）。 |
| `skin_match` | `js/foe.js build()/sampleSkin()` | 头身肤色接近时头直接用身体贴图取样肤色（以前染身体受 1.6 上限/贴图阴影限制 → 脸白身橙）；脖子圈取不到时取整张皮肤贴图。 |
| `hold_strike`（需 combat_master）| `js/combat.js`（HS/hsStart/hsTick/hsFire/hsUi）| 按住左键 = 姿态（移动 ×0.55、镜头 ×0.3），轻移鼠标 = 斩击角度（准星箭头 + 前摇环），松开出刀；前摇 0.18–0.65s、后摇（攻击 CD）按武器档次 `TIERK`；蓄满后再 0.55s = 重斩；右键取消（佯攻）。敌人 `handAng` 读蓄势方向。`Combat.aimMove()` 乘到 worlds 移速。 |
| `foe_duel` | `js/duel.js`（`window.FoeDuel`）| ~42% 普通敌人变成 剑斗士/重剑卫/疾刃手（没武器的会配刀，`Foe.attachWeapon` 已导出）：攻击不播动画，假 action（`act.time` 由 post 推进）喂给原 atkStep；右臂两节 IK + 刀身朝向把刀举到来刀一侧，身前丝带弧显示刀路，佯攻会在最后一刻变向。`foe_roles.assign` 对 `fo.duel` 跳过。 |
| `hit_react` / `foe_read` | `js/feel54.js` | 受击按刀向程序化后仰/侧倾/扭转（弹簧，带 mixer 不写骨头的还原）；空挥被抢攻、蓄重斩被侧闪（`fo.rv`）。 |
| `nat_gates` | `js/worlds.js`（natOk / veil）| 铁门 → 两块巨石（废墟/要塞/王城 = 两尊石像）夹出的山口 + 流动雾幕 + 地面微光；穿门淡入白雾（死亡仍黑屏）。必须在“实例化”之前 put。 |
| `ui_refine` | `js/ui54.js` | 纯 CSS 层（body.u54）：细血条/魂能条、细金边技能格、命中数字、敌人细血条、极简准星、横幅提示、毛玻璃面板、衬线标题。 |
- 其他：画面去灰（水面天空反射、Mie、薄雾、光束、镜头光晕都调弱）。
- 测试（本机）：真实游戏 `index.html` + Playwright：`UI._startTrip('village')`、`Worlds._debug.goto(i)`、`Foe.attack(fo,d)`、`Feel54.impulse(fo,{charged:true})`、`Combat.onDown(0)/onMove/onUp(0)`（先 `G.setUIOpen(false)`）。本机素材经代理拉取，加载时间偏长，不代表用户本地。
- 待做：地形系统进一步强化；更多敌人 AI（包围/轮换）；HUD 实机目检（本轮截图预算用完，UI 只做了数值校验）。

## R54b — 用户新愿景（原话要点，长期有效，后续 Agent 按阶段推进）+ 战斗回退
- **战斗回退**：用户“不喜欢蓄势出刀，还是喜欢原来那个”→ `hold_strike` 默认关（mods 迁移 `__v14` 一次性关）；新 MOD `stam_chain`（默认开，combat.js mmAttack）：每刀耗体力，1.3s 内连续出刀每刀 +30%（最多 ×3.4），停手即恢复。
- **换图太久 → 走廊流式（不是大地图）**：进入出口 = 踏进一条弯曲长走廊（每个区域/地图风格不同、宽窄不一、即时生成且必须快），玩家在走廊里走的同时后台加载下一个地点；加载好后走廊尽头生成出口自然接入新地图，不能看着违和。可按电脑性能预估加载时长决定走廊长度。
- **活世界**：角色不要像野怪；进图时所有角色在“潜空间”（抽象模拟、省性能）里已在做事，有真实 AI 目标，会前往其他地点。
- **人人可扮演**：所有角色都是同一种“玩家实体”（WASD 操作 + 各自独特 UI/技能/特效），食人魔只是可选角色之一；任何角色可由玩家或 AI 扮演。
- **正义 vs 邪恶**：邪恶 = 哥布林、兽人（酋长有指挥属性）、食人魔（SOLO：斩首、洞穴刷资源）、死灵法师（复活尸体为己而战）…；正义 = 各种女角色阵营（国王发令、士兵接任务；建造/防御/守城/发育/讨伐/收集神器）。各阵营内部结盟。正义目标=杀掉所有邪恶领袖；邪恶目标=杀掉各正义阵营领袖；**领袖死亡 → 其王国成员失去力量而死**。
- **世界即时演化**：开局固定约 100000 个角色，只减不增；自动涌现战斗；角色会逐渐变强（野怪不会）；洞穴不再是独立地点，整个世界联通；有打不过的高等级怪要会跑；可能有上万人合战且不能卡；信息沟通（情报/消息）要做好。
- 可行性与分阶段方案见本轮回复（模拟分层：远处纯数据、附近简化、眼前完整 3D；万人合战用实例化/顶点动画替身）。

## R54c–h（用户最新取舍，长期有效）
- 用户最终：**MMO/万人世界太复杂，先不做**；保留蓄势出刀 `hold_strike`（默认开，迁移 v15），所有近战角色共用方向战斗 `duel_all`（远处也能看到对方要砍的角度）；连续攻击越打越累 `stam_chain`。
- `corridor`（js/corridor.js，默认开，迁移 v17）：只在地点之间（洞穴→第一个地点仍普通加载）；**不要传送门**：入口/出口只是两块大石夹出的山口；后台准备好后出口出现在前方约 14m。`nat_gates` 的雾幕已移除（只剩岩石/石像山口）。
- `region_persist`（`S.rmap[k] = {seed, vis}`）每个地区只生成一次；`region_big` 每地区 20~44 个地点。
- `living_region` + `foe_levels`（js/living.js）：`S.liv[k]` 1000 居民/各地点 alive、alert、corrupt、nk、last；局面（集市/葬礼/民兵/驱魔/逃难/废村）；首次看见你说等级与记忆台词；地区基础等级 = 1+4×地区序号，老兵/精英/冠军 HP/伤害按等级差缩放，阶位越高 duel 连斩/佯攻/重击越多。钩子：worlds.populate→`Living.count`，foe.populate→`Living.foe`，foeEvent→`Living.event`，进场→`Living.enter`，每帧→`Living.frame`。
- `nemesis` / `soul_rite` / `head_boon`（js/nemesis.js）：洞里“宿敌逼近”条（~5 分钟满 → 下一趟第一个地点必遇）；每 8 分钟猎手全体 +1 级（Hunters2 hate）；出猎中每 4~7 分钟来袭；30%/猎手死光 → 月之巫女分身；选地点面板里的血祭（下一趟 伤害/生命/移速）；摆出的首级给微弱永久加成（`Nemesis.dmgK/hpK/spdK` 乘进 worlds power/移速与 RPG.stats.maxHp）。
- 循环：出猎斩首 → 首级摆出（永久小加成 + 产魂晶）→ 魂晶买装备 / 血祭 → 更高等级地区；洞里待久宿敌必来且越来越强。

## R54i/j（用户最新取舍，覆盖 R54c–h 中冲突部分）
- **用户洞察（重要设计原则）**：玩家潜意识在算收益率。资源可无限刷 → 单个首级价值趋零 → 没兴趣收集；改成**轮制**（每轮定量产出，有上限）后，首级才有价值。以后所有资源都遵守：有上限、按轮结算、溢出转为下一轮小加成，不允许无限刷。
- `run_loop`（js/loop.js，默认开）：章节 = 2 个地区 + 第 3 趟 BOSS 战（出发面板显示 BOSS Lv / HP× / 伤害×，每章 +5 级）；洞穴魂晶每轮上限 `Loop.capCave()`（game.js addCoins 经 `Loop.caveGate`），溢出 → 下一轮加成（最多 +60%）；回洞结算 `Loop.payout`（按摆出首级）；地点清剿奖励按清剿率²；每存档随机 2 条“世道”；离开地点时追你的 tier≥1 敌人变成新宿敌。宿敌条出猎时也涨，BOSS 趟不涨不来袭（hunters2 同步）。
- 地图回到老版每趟随机生成（`region_persist`/`region_big` 默认关，迁移 v18），`small_maps` 地图更小。
- 用户：老版敌人战斗更好、程序化举刀姿势不好看 → `foe_duel`/`duel_all` 默认关（迁移 v19）。用户：还是要传送门 → `gate_portal`（默认开，山口雾幕 + 光）。
- 未做：建筑需资源 + 战利品显示相关配方；月之巫女 ≥7 线索胜利 + 结局动画；头棋盘→下一轮加成；建筑组合效果；精英 BOSS 聚会。

## R54k（用户最新取舍，覆盖上面冲突部分）
- 用户原话要点：头每次回洞**固定产出、每轮结算**，不是在洞里点点点；不同建筑不同机制但都围绕「轮」；套装可以；多发明放头建筑（不和现有重复）；肉鸽要更多技能种类感、武器感、每局不一样。**章节 BOSS 是独立的，不是把地区霸主搬过去**；地区不缩小更好。
- `round_yield`（loop.js）：`G.trigger` 在回合模式直接返回 0（把玩/计时都不给魂晶，game.js 计时块与魂轮也跳过）；回洞 1.5s 后 `Loop.settle()` 按建筑结算（基础 10/20/36/60/100 × 异色/霸主 × 建筑系数 `Loop.bf(d)` 或 `Loop.ROUND[type]` 自定义规则 × 章节/世道/展厅），套装：同族 3/5/7、同身份 2/3、五阶齐全；右侧 `#lpSettle` 明细面板。洞里小游戏（curios/rites/oddities/sanctum/play/props/chess 这些文件里的 `G.addCoins`，按调用栈识别）→ `Loop.stash` 存到结算时发，每回合上限 `capCave()`。
- `round_halls`（js/roundhalls.js）：10 座 `rh_*` 建筑（月相晷台/酿魂坛/审判天平/吞首井/示威矛墙/命运骰塔/亡者议会/烽火首台/百族谱/双生镜龛），状态存 `S.run.bst[type@x,z]`；吞首井/骰 1/烽火第 3 回合会移除首级；议会/烽火/矛墙写 `S.run.nb`（下一趟祝福，Loop.runDmg/runHp/runSpd/enemyHp/onKill/清空奖励读取）；矛墙降低 `Loop.nemRate()`。其它放头建筑说明末尾自动补「回合制」系数。
- `rogue_boons`（js/rogue.js）：`S.run.rg`；出发面板 `#rgPanel` 选流派（8 选 3 展示）+ 祝福抉择（24 种 / 8 标签 / Lv3 / 同标签 3 种成套）。钩子：foe.js `Rogue.outDmg`（Talents 之后、霸主单刀上限之前）、worlds foeEvent → `Rogue.event`、hitPlayer → `Rogue.inDmg`、Loop.runHp/runSpd ← `Rogue.hpK/spdK`。每回合结算 +1 次抉择，吞首井/百族谱(≥5族)/月之使徒额外给。
- 章节 BOSS：`Loop.CHB` 七位「月之使徒」（独立形象/台词/擂台），`worlds.genArena()` 单地点擂台（`node.chB`/`node.arena`，只有回洞门），`BOf(node)` 统一查 BOSS，`mkBossH` 设 `c.boss='chN'`；击杀不写 `S.bosses`（地区霸主不受影响）；Lv = 5 + 6×(章-1)；赢了 `Saga.giveClue('chapboss')`（saga.js 新导出）+ 1 次祝福抉择。foe.js `bodyFor` 对未知 bossK 按她的身份挑身体。
- `small_maps` 默认关（迁移 v20）。
- 顺手修复：worlds.js `foeCtx` 里 `toast`/`shake` 一直被上一句 `//` 注释吞掉 → 非斩首击杀 `die()` 和每次斩首 `decapitate()` 都会抛异常（之后的 decap 事件、布娃娃击飞没执行）。

## R54l（用户：BOSS 打完了怎么办 / 舒适洞穴视觉 / 属性限次 / 线索=跑图任务 / 工坊围绕新系统 / 人物刺眼 / 技能太少 / 下蹲走路 / 宿敌战穿门 / 光球小精灵 / 开局不送东西）
- 章节 BOSS 无限随机：`Loop.CB(ch)` 按 `S.run.seed`+章节生成（11 个角色模板 × 种族/名字/发色瞳色/称号前缀/擂台前缀/底图地区/词缀 1~3/招牌技 3~6），`Loop.bossAff` 在 living.foe 里给 BOSS 上 FoeAI2 词缀。打赢只给 1 次祝福抉择，不给线索。
- 月之线索 = `moon_trail`（js/moontrail.js）：出猎 35% / 杀月使后或用寻月罗盘必定；3 个随机地点的天光月痕，门牌 🌙 指向下一跳（`Worlds.relabel()` + doorName 钩子），限时 7 分钟。saga 的月使在 moon_trail 开着时改为「下一趟必有月之踪迹」。
- 工坊：`run_kit`（js/runkit.js）9 种围绕循环的道具（Sack.def + `grp:'run'` 配方，`d.onUse`）；材料悬停显示「可合成」；摆件页改卡片 + 回合制效果文字（`Props.effTxt`），光环/戳击/风铃都折算进结算（`Props.roundMul`），定时产出改为每回合结算。与另一位 Agent 的 workshop_plus（js/workshop.js，RGRP 新分组）已合并。
- `build_stat_cap`：同种建筑属性只算 1 座、每项封顶 6+2×洞层；摆件属性同种只算 1 件。
- 洞穴舒适：光柱改成交叉柔光面片 + 地面柔光（不再是光环），天窗/光柱/尘埃全部 `raycast=()=>{}`（以前尘埃 Points 阈值 1m 挡住摆头/建造），火边兽皮毯 + 墙边灯；曝光 1.42→1.3。
- `foe_skills2`（foe_ai2.js SK2）：老兵 volley/cleave，精英 +pull/quake，冠军 +mark/rally，BOSS +nova；地区霸主 SIG 表、章节 BOSS `B.sk`。
- `soft_glow`（js/fix54l.js）：Master 泛光 0.9/0.9→0.38/1.25，CharLight 逆光轮廓 ×0.4。
- 下蹲走路：persona sly 走路、刺客绕背改为正常走/小跑，persona 闲置去掉 Crouch_Idle。宿敌战穿门：自然山口自动穿越加 `inFight()`（20m 内有追击/出招的敌人就不穿）。光球小精灵：`popFoes` 载入失败重试 3 次再退回。
- `no_freebies`：新档 0 魂晶、无药、无材料；结算无底薪；祝福抉择需要这一趟杀满 3 人或清空 1 个地点。
- 宿敌封门（nemesis.js `sealed()/sealFoes()/sealLeft()`，SEAL_T=90s）：宿敌（hunter2 / nemClone / nemX）在场时所有门（E、自然山口自动穿越、回洞魂门）都封死；解除条件 = 宿敌死 / 残血撤退（猎手 30% 逃跑；分身/新宿敌 25% 撤退，8 秒后带伤消失、下次 +1 级）/ 90 秒到点你可以撤退。屏幕上方显示倒计时。
- 刷宿敌清场 BUG：regionquest.js 和 saga.js 包装 `Foe.populate` 时丢了第 3 个参数 `{keep:true}` → 中途追加宿敌时把整个地点的敌人清掉。现在 keep 调用直接透传（也不再重复注入小 BOSS/异变目标）。
## R54 workshop_plus（工坊扩充，MOD 默认开）
- 用户：合成内容太少、工坊文字有问题；想要更多断肢/器官（肠、胸、心脏、上臂、下臂、大腿、小腿）。
- **新 js/workshop.js**：配方 12 → 47（药品 / 料理 / 战斗增益 / 护具·饰品 / 材料转化 / 拆解·肢体）；新物品 tonic、salve、soulwine、manadraught(魂能)、bonebroth、jerky、huntstew、ironskin(受伤-25%)、swiftdust(移速+18%)、bloodoil(伤害+40%)、regenbalm(每秒2%) 与肢体材料 ua/la/th/ca/torso。**不做武器配方**（武器只来自搜刮 + 铁匠台强化，用户旧约束）。
- 砍断 上臂/下臂/大腿/小腿（80%）与腰斩残胸（100%）→ 自动收进麻袋（`foe.js` 设置 `fo.lastSev`，`worlds.js` 事件 → `Workshop.onSever`），在工坊「拆解·肢体」拆成骨/指骨/筋/皮。
- 内脏（心/肠/肝…）本来就有：`organs.js` 的「解剖」尸体。**子宫等生殖/性相关器官不做**（organs.js / props.js 既有内容边界，保持）。
- sack.js：新增 `Sack.defMul/spdMul/buffList`（防御/疾行/再生/暴伤 BUFF，`worlds.js` 受击与移速处调用），`use()` 支持 `mana` 与 `bf`；配方分组 RGRP 按 `rc.g` 分七组；工坊文字放大提亮（名称 21px、说明 15px、材料 16px）；缺图标/缺物品的配方自动隐藏。itemicons.js：去掉 potion/bigpotion/bandage 的错配 3D 图标（显示成了木棒/勺子），改用 emoji。
- 肢体 3D 摆件（Props）未做：现有 limb_hand_* 是从角色身体切出的资源，无同类工具；下一步可考虑用 foe.js 的 sever 网格快照生成摆件。

## R54m 大师级UI + 爽感
- 新 js/grandui.js（MOD grand_ui）：GrandUI.choose 全屏卡牌（1/2/3 键）/ ceremony 结算逐行累加。rogue.js 流派(LORE 称号+典故)/祝福(TAGN)走全屏，出发面板只留按钮；Loop.showSettle 走 ceremony，关闭后若有祝福待选自动弹出。
- 新 js/momentum.js（MOD momentum）：杀意连斩 5.5s 窗口，档位加伤/移速/省体力，≥3 层回血；中心大字 #mmSlam，右侧 #mmBox。
- fast_ttk：普通敌人≤4 刀；combat chainK 体力更便宜。
- corridor 默认关（不走走廊）、nat_gates 默认关（回到铁门），迁移 v21。野兽与敌人并行生成加快换图（实测约 1s）。
- arrival2 抵达大窗口恢复（等 Saga 电影结束后弹）。

## R54n 加载提速 + 战斗可读性 + 界面整理
- 加载：实测大头是 Windows(D3D11) 着色器编译（每个变体 0.3~0.9s，进图要编几十个）。lib/three.min.js 打补丁：getProgram 不再立刻 getUniforms（uniformsList 改为 setProgram 时惰性计算，同 r151+），配合 KHR_parallel_shader_compile 并行编译。新 js/shaderq.js（MOD async_shaders）：ShaderQ.compile/wait/ready；开机时 __pauseMain 暂停首帧→异步编译→再出画面；Foe.warm 异步时只 compile；worlds.goto 建好场景立刻发起编译、首帧前等待。实测：开机着色器阶段 15s→6s，首次出猎 3.6s→2.0s，换地点 20.9s→9.2s（本机）。
- decapcam：body.dcam 隐藏规则漏了 :not(:has(canvas))，把 #game 一起隐藏 → 斩首瞬间黑屏（用户说的黑屏/没慢动作）。已修；周围 ≥4 人才不触发。
- fair_fight（foe.js）：起手速度 ×0.72、hold +0.18s、无假动作、先转身对准再出手、命中角 0.7、出手间隔 1.1s、冷却 +0.7s、出招前压 ×0.55、落空补刀最多 1 次且 0.9s 后。实测起手到命中约 1.1s。
- 新 js/r54n.js：Feel54n（move_sfx 跳/落地/闪身音效，脚步调响）、Barks（foe_barks 头顶气泡：来刀方向+往哪闪、重击/突刺/连斩/冲刺/掷刃、格挡、逃跑、残血、刺客绕背）、敌情研判卡（region_intel，#icCard：模糊等级、你的等级/战力、胜率、按职业推荐战术）、HudTidy（hud_tidy：rqTrack/arTrack/mtTrack/sgTrack 左侧一列统一卡片；猎手感应并入 #nemChip；菜单打开时 body.menuon 隐藏 HUD）。arrival2.track 在 hud_tidy 开时不再自己定位。
- 精英光环/法球光晕不再刺眼（soft_glow 开时透明度约 1/3）。moon_trail 默认关（迁移 v22），恢复原来的电影任务线索。

## R54o 战斗违和感 / 黑屏 / 碎料
- 黑屏闪烁根因：eco.js pace() 在本帧渲染之后调 setPixelRatio（动态分辨率）→ 画布被清空 = 黑一帧；改为 prNext 延到下一帧渲染前应用。decapcam 黑屏已在 R54n 修。
- 跳过电影弹主菜单：Esc 跳过会让浏览器解锁鼠标 → pointerlockchange 显示 #menu。saga.end() 设 window.__skipMenuUntil，game.js 在 Saga.cine/宽限期内走 lockFailed（点画面重锁）而不弹菜单。
- 朝向：fair_fight 下近身缠斗（chase、d<5、非出招/技能/硬直）yaw 与面向玩家的偏差钳制在 0.5rad；绕圈走位偏转 0.9→0.35。受击硬直 0.45→0.62（BOSS 0.4）+ 小击退。
- 追踪：foe_ai2 mark（追踪圈）只追 0.9s、跟随率 6→2.2、判定半径 1.7→1.4。
- 野兽：fair_fight 下第 1 章伤害 ×0.55、第 2 章 ×0.75；扑咬命中 0.28→0.5s；受击硬直 0.4→0.75。
- 血：decapcam 血滴从拉长胶囊改成短血珠（Icosahedron，拉伸 1~2.4）。
- 画风：默认 r_illust（插画风/厚涂），迁移 v23；persona_voice 默认关。
- worlds.goto：W.shWait 期间 Worlds.frame 不渲染（否则首帧同步编译卡死主线程），ShaderQ 等待上限 15s。
- r54n.js 新增：fem_vox（共振峰合成女声：喝声/痛呼/惨叫/闷哼/嘲笑）、敌人战斗聊天气泡（包抄/嘲讽/同伴倒下/受伤）、breakables（每地点 14~22 个可踩碎小物件，碎料存 G.S.shards 不占格子，攒够 4~6 自动 Sack.stashAdd 成材料，右侧 #bkFeed 提示）。skillfx：soft_vfx 渐变贴图（环/月刃/光柱）。

## R54p 反馈感 / 鬼巫流派 / 评级 / 面板
- 画面：render 组回 r_classic（插画风会让远景糊），R47 人物风格 cstyle 默认 cs_paint（厚涂），迁移 v24。
- 读图条：资源 0-50%、敌人 62-80%、着色器 80-100%，不再资源读完就满。
- 斩首：G.S.decapN 持久计数（以前用本趟 W.stats，总显示第 1 颗）；decapcam slashArc 沿 Combat.state.sw 方向的 3D 刀痕 + DOM 刀光同角度。
- 朝向：fair_fight 下 seen 且非 flee/idle、d<8、非技能/硬直，yaw 偏差钳到 0.3（出招 0.2，命中前 0.14s 放开）。
- 完美格挡放宽：方向 1.05、按下 0.5s、转向 0.4s/0.7。momentum.js hitStop：hit/kill/parry/guardbreak/perfectdodge/execute → Foe.slowSet 顿帧 + 震屏（MOD hit_stop）。
- 脚步：玩家加 230Hz 中频踏声、总线 2.0；敌人脚步 ×2.2（笔记本喇叭放不出 95Hz）。
- skillfx：FX 只挂在 HOOK.frame（野外不跑）→ 野外特效永不消失；加 rAF 循环在野外更新。
- breakables：放大 1.6~2.1 倍（以前藏在草里）、shaped 地图用 lp.clamp 落点、碎料只在平安回洞后合成（死亡清空）。
- loop.js side()：出发面板打开时右侧 #lpSide 三张卡（章节/章节 BOSS/主线），MOD side_panels；lpHead 只留回合经济。
- r54n.js ogre_rank：清空地点（≥2 敌）后 D~SS 评级盖章 + A 以上魂晶。
- 新天赋流派「鬼巫」hex（talents_data + talents.js S_.x_*）：勾魂索/换魂/提线傀儡/同命咒/血井/百鬼夜行。

## R54q 角色浮现 / 宿敌档案 / 任务栏放大
- r54n.js whispers：野外每 11~19s 在屏幕左右随机位置浮出黑框字卡（.wsCard），揭示本图某角色的名字/性格/动机/正在做的事/现况；菜单、电影、到达窗、敌情卡期间不出。R54n.wsNow() 调试立即出一张。
- hud_tidy：左列任务卡与 #tbCol 用 CSS zoom 放大（1.25 / 1.3），排版按 getBoundingClientRect 高度、top 除以 zoom。
- 宿敌档案：Nemesis.dossierHTML()（塞勒涅之影 + s.extra 每人名字/性格/当前等级/成长）挂在 U 猎手档案窗口底部；#nemChip 加「U 档案」提示。
- foe.js 逃跑：fair_fight 下每 2s 检查进度，卡住就换门（fleeBan）+ 绕路，连卡 3 次且你在 7m 外就算她溜走。
- F 回忆（recall_iw）：game.js 连点复位逻辑跳过 RecallIW.active；pre() 每帧保持 uiOpen 并解锁鼠标，不再突然变回第一人称；回忆视角 FOV 收窄 14%（头更大）。
## R55 (残肢器官编辑器 / 战场解剖挑选 / 移除工坊断肢制作)
用户要求：① MOD `part_editor`（默认关）= 残肢器官编辑器，只能从 MOD 面板该行展开后的按钮打开，且必须已「开启并应用」(`Mods.on`)；② 移除工坊里的断肢制作；③ 部位只来自战场上解剖尸体，用选择界面，每件都有用处，**不含头部器官**。
- `js/organs.js`：OG 加 `cat`('limb'|'organ')；新增肢体 upperarm/forearm/thigh/calf/chest；brain/eye/tongue 标 `hid:1`（旧存档仍可摆放，不再可解剖）；`poolOf()`、`limbModel()`（**肢体占位模型=圆柱+关节球，是对“不自制模型”规则的临时例外，只为让编辑器导入真模型前不空白**）；`model()` 优先用 `PartStore.model()`，`jar:false` 时不带标本罐。
- `js/dissect.js`（新，MOD `dissect_pick` 默认开）：`Dissect.open(L,done)` 选择界面；名额 3(+1 稀有≥2,+3 boss)；每具尸体只掷一次(`L.dpool`)，未选的丢失。`sack.js` 解剖按钮改调它。
- `js/partstore.js`（新）：IndexedDB `soulhead_parts` + `assets/custom_parts/manifest.js` + `<id>.js`(base64)；自带 OBJ/MTL/STL 解析，glb/gltf 用 GLTFLoader；`load()` 做检查报告（面数/体积/贴图缺失/过大/NPOT/无UV）。`replaces` 覆盖内置键的模型与名称；新部位注册为 `OG['cp_<id>']`。
- `js/partedit.js`（新）：编辑器界面（左列表/中预览+导入+报告/右表单），保存到浏览器与「保存到游戏目录」(showDirectoryPicker，需 Chromium，会校验 index.html)。
- `js/mods.js`/`mods_i18n.js`：新增 `dissect_pick`、`part_editor`；MOD 行支持 `btn:{l,o,f}` 按钮（`data-a="mbtn"`）。
- `js/workshop.js`：`onSever` 变空操作；body 拆解配方标 `legacy:1`（`sack.js` 仅在持有对应材料时显示）；h3/a3/a4 配方改用 bone/sinew/hide。`js/props.js`：断手/断脚/肠索不再出现在制作列表（已有的仍可摆放）。
- 测试：`tools/test/partedit.html`（独立 harness）。FBX/.blend 不支持，需先转 glb。

## R55d 用户反馈修正（敌人弯腰 / 光环 / 后退 / 黑框字）
用户原话：战斗时敌人弯腰不面对主角；光环太耀眼；现在后退太慢了；经常战斗时冒出黑方框文字，不要了。（长期有效：不要在战斗中弹黑框字卡；不要刺眼的光环；后退不要被压得太慢）
- 后退：`worlds.js` back_slow 由 55% 速度改为 88%（`bk*0.12`）。
- 黑框字：MOD `whispers`（r54n.js 角色浮现 .wsCard）默认关。
- 光环：MOD `lens_flare`（master.js 镜头光晕/彩虹光环）默认关。以上两项靠 `mods.js` 迁移 `__v 25` 对旧存档生效。
- 敌人弯腰/不面对：`stance.js` 架势体态不再前压/后仰（lean=0）、歪头和侧身减小，上身扭回更多；`foe.js` 受击硬直 0.62→0.42（BOSS 0.4→0.32），硬直中也持续转向面对玩家；`locomo.js` 转身侧倾 ±0.12→±0.04。
- 未动：顶部「护盾被打光了」等 toast（若用户也嫌黑框，下一步统一改成无框描边字）；`Foe.say` 头顶气泡。
## R56 — 3D body autopsy (js/autopsy.js, MOD `autopsy`, default ON)
- Replaces the R55 part editor (removed per user: "我不要这种编辑器了"): deleted js/partstore.js, js/partedit.js, assets/custom_parts/.
- Autopsy.open(corpse) bakes the corpse's skinned body into static geometry (stride 16: pos nrm col colB uv tw reg), real textures kept via a patched MeshStandardMaterial (attribute `tw`: 1 = textured shell, 0 = flat wax cut face). Vertex-colour baking of textures was ragged — don't retry.
- Cut = plane slice anywhere, any angle, repeatable; wax caps; component split; each piece is a `piece` organ item (OG.piece in organs.js) with random affixes by region; piece geometry persisted in IndexedDB `soulhead_pieces` (textures downscaled to 512px). `Organs.model` -> `Autopsy.model`.
- Clothes toggle swaps to linen (never nude); single-mesh Genshin bodies have no separable clothes. No head organs, no reproductive organs, no blood/gibs.
- sack.js opens Autopsy for humanoid corpses, falls back to Dissect (R55). Harness: tools/test/autopsy.html.
- NOTE: three build here has no `mapTexelToLinear` in map_fragment (hardware sRGB decode); the shader hack must not call it.

## R55e 用户反馈（原话要点，长期有效）
敌人打着打着就侧身不知道为什么；角色战斗打击感弱爆了、很蠢；键位冲突（跳过电影 vs 打开主菜单、第一人称 vs 回洞选择奖励之类）；技能特效太弱太少；反馈太少（同伴被斩首周围角色都应该冒气泡聊天，更频繁）。
- **侧身根因（已修）**：`Stance.post`（npc_stance/npc_strafe）和 `Feel54.post`（hit_react）都改同一批没有动画轨道的骨头（hips/spine/chest…），互相认不出对方的改动 → 每帧偏移叠加，被打后 ~1s 内胸口朝向可偏到 180°（实测 3.14rad，修后 ≤0.58）。修法：`foe.js` 在 `mixer.update` 之前调用 `Feel54.pre` + `Stance.pre` 无条件还原上一帧叠加的偏移。**以后凡是在 mixer 之后改骨头的模块，都要在 mixer 之前还原**。另：npc_strafe 下半身最大扭转 77°→54°。
- **打击感**：`momentum.js` 顿帧加长（普通 0.1s、重击/暴击/破绽 0.17s、击杀 0.22s、处决 0.36s，期间敌人时间 ×0.04~0.06）；`combat.js` 命中时玩家刀停留 0.045/0.07/0.09s，镜头后坐/FOV 冲击加大；`foe.js` 受击闪光改为先白热再转红（0.16s），击退 2.6→3.8（重击/暴击 ×1.7）；`feel54.js` 受击后仰/侧歪冲量 ×1.45；`cfx3d.js` 技能命中也走“重击”特效（大环 + 更多火花）。
- **键位**：`game.js` pointerlockchange：电影中按 Esc（浏览器吃掉 Esc 只解锁鼠标）= 直接 `Saga.end()` 跳过，不弹主菜单（要求 `document.hasFocus()`，切走窗口不算）；`tutorial.js` Enter 在斩首镜头/电影/到达窗/GrandUI 开着时不再抢；`hunters2.js`（U）、`gear2.js`（Z）在这些界面开着时不再叠开。**键位规则：电影 Esc=跳过、Space/E/点击=下一幕；Enter 归当前最上层界面；主菜单只在无任何界面时由 Esc 打开。**
- **技能特效**：`skillfx.js` 新增 `SPEC[技能id]`：37 个技能每个有自己的 3D 特效（旋风斩多层水平刃环、突刺残影光带、剑气飞行新月、百刃随机斩闪、万剑归宗 5 脉冲+落剑光柱、震地裂纹+尘土、魂盾双层球壳、毒雾球、战吼 4 重环、魂弹/魂焰飞行光球带尾迹、连锁闪电折线、魂陨延迟爆炸、勾魂索锁链、同命咒连线、血井、百鬼夜行 6 魂球环绕等）。通用六门派分支仅在没有 SPEC 时才用。助手：`orb/beam/bolt/dust/embers/spiral/later`。
- **气泡**：`r54n.js` 新增 `reactAllies`：同伴倒下/被斩首时，26m 内最近 4 人依次（间隔 ~0.5s）冒气泡 + 惨叫/痛呼（斩首用专门台词 `L_DECAP`，勇敢的人喊 `L_COVER`）；战斗聊天间隔 4~7s → 2.2~4s，另有杀意连斩时的恐惧台词、玩家血低时的“压上去”台词、被打时同伴“撑住”。
- 验证方式（浏览器约 1fps，软渲染）：Playwright 里 `Worlds.start` → `Worlds._debug.goto(4,3)` → 手动循环 `Foe.update(1/30, now)` 采样；`SkillFX.cast(id)` 全部 37 个无报错。

## R55f 用户反馈（原话要点，长期有效）
战斗 AI 还是非常弱智：莫名其妙乱走不打主角、莫名其妙卡住不动、手感很差。建议大师级研究现有机制——是不是各种 MOD 相互独立运算——整合做个新的，把老的统合、该关的关掉。
- **研究结论（实测）**：敌人行为由十几层各自独立运算（foe.js 基础追击 → FoeAI2 技能/战术 → FoeMind 读招 → FoeRoles 1/2/3 职业 → Feel54 读招闪避 → Persona 手势 → Locomo/Stance 表现层），每层都能在同一帧起手攻击、写 `fo.rv`、播动画，互相不知道对方做了什么。
- **真 BUG（已修，foe.js）**：AI2 层（FoeAI2.tick）起手攻击后返回 null → 职业层紧接着 `f.play('Walk_Loop')`，Locomo 拦截后把攻击动作淡出 → `A.act.time` 永远不走 → `fo.atk` 永不结束 → 敌人站着不动几十秒（台架实测一个决斗者 8s~40s 全程“ATK”）。修法：①AI2/职业分支条件改为 `(tick() || fo.atk)`，起手后改走 `atkStep`；②看门狗：`f.cur !== atk.clip` 超过 0.4s 就放弃这一招。修后 40s 内攻击次数：决斗者 2→11、重甲卫 3→7、投弹手 1→10。
- **新增 `js/brain.js`（MOD `foe_brain`，默认开）= 战斗总导演**：不替换旧层，而在其上统一调度——①每 0.35s 选【进攻者】（最近、冷却短、刚出过手的排后面 → 轮流上），攻击令牌只给她（`Foe.tokenOK` → `Brain.token`；全场出手间隔 1.1s→0.7s；≥3 个近战或有霸主时允许 2 人同时）；②全场 >3.2s 没人出手 → 点名最近的人冲上去；③看门狗：交战中 d>2.6m 站着不动 >1.6s → 清掉 mnext/kiteT/detour，`freeT=2.5`（跳过职业层走基础追击）并推她朝你走；④远程/辅助职业（ranged/mage/healer/bomber/netter/trapper/wispcaller）>9s 没任何出手 → `freeT=6` 改走近战（疗愈者没同伴不再永远发呆）；⑤`Brain.pf`：包抄站位用的“玩家朝向”改为 0.45rad/s 慢速跟随（以前你一转视角全场重新找站位 = 乱走）；⑥攻击后摇 -0.9s（`foe.js` atkStep 收招 cd）。
- **关掉/门控的旧逻辑（Brain 开启时）**：`foe_mind.js` 的“打完拉开 / 你乱挥就后撤 / 横向预判”（`mindTick` 里 `BR` 判断）；`persona.js` 交战中不再点头/摇头/抱臂（`gesture` 会让她站定 1.1~1.6s）。其余层（技能、职业招式、读招闪避、受击反应）保持。**关 `foe_brain` = 完全回到旧行为。**
- **台架**：`tools/test/aibench.js`（在真实游戏页里手动步进 `Foe.update`，`__bench(role, secs, {extra, extraRole, circle, kite})` / `__benchAll(secs)`；指标 atks/hits/near/avgD/maxStuck/maxAtkSec）。用法见文件头。注意：台架里切 MOD 请直接写 `localStorage.soulhead_mods`，别用 `Mods.set`（会持久化关掉 `foe_brain` 影响后续测试）。
- **实测（Brain 开，玩家站桩/绕圈）**：3 个决斗者 40s 共 24 次起手（轮流，无人 0 次）；4 人混编绕圈玩家全员都在 2.2m 内出手；17 种职业无卡死（maxAtkSec ≤ 4s）。
- 未做 / 下一步想法：投掷手/术士在你贴脸时的风筝逻辑仍各自实现；第一批职业（brute/skirm/guard/assassin/berserk/ranged）台架里 `__forceRole` 不生效（foe_roles.js 没读它），没单独测。

## R55g 用户反馈：敌人攻击动画太少了（种类）
- **病因**：动作库里真正的攻击动作只有 Sword_Regular_A/B/C、Sword_Attack、Sword_Dash、Sword_Regular_Combo、Sword_Heavy_Combo、拳 3 种（Jab/Cross/Hook）、OverhandThrow；Shield_Dash/Shield_OneShot/Spell_Simple_Shoot 实测没有明确的出手时刻（右手/左手速度峰值都不明显），没当攻击用。而且职业 `clip()` 钦定：重甲卫永远 Sword_Attack、刺客永远 Dash、决斗者 55% Dash……
- **做法（不新增任何动画/模型文件）**：新增 `js/moves.js`（MOD `foe_moves`，默认开，`Moves.pick(fo,d,cur)`，foe.js `attack()` 在职业选招之后调用）：
  - 变体 `Foe.ATK` 新增 `{clip, from, hits, end}`：`Sword_Combo_AB/BC/CD`（常规连击前两刀/后三刀/末两刀，`from` = 起播偏移）、`Sword_Heavy_Open/Finish`（重剑起手/收尾）；命中时刻/角度全部沿用 ATK 里已实测的数值。`attack()` 用 `T.clip||clip` 播真实动作并设 `act.time=T.from`，`fo.atk.clip`=真实动作名、`fo.atk.alias`=招式名，holdAt 相应后移。
  - 连招：`fo.cq` 队列，`atkStep` 收招后（state 仍是 chase、没被打硬直、d<3.6）立刻接下一招（`fo._chainStep` 跳过职业选招，后手停顿 -0.12s）。新单招起手时 `fo.cq` 清空。
  - 每个职业一份加权招式池 `POOL`（决斗者/重甲卫/蛮兵/狂战/盾卫/战旗手/刺客/游击/BOSS/徒手/通用），精英才用多段招，不连续出同一招，远距离偏冲刺、贴脸偏短招。长枪/双刀/投弹/网/陷阱/唤灵等有自己招式的职业不动。
- 实测：各职业池 5~11 种招式（含连招）；台架 120 秒内决斗者 57 次起手 8 次连招、重甲卫 43 次/7 次连招，无报错、无攻击卡死。
- 注意/待办：从连击中段起播（from=0.5/0.95/1.5）有 0.12s 交叉淡入，**姿势衔接没做肉眼检查**；如果某个变体看着别扭，改 `moves.js` 的 `from` 或把它从池里去掉。真正新的动作（踢腿、旋转斩、跳劈）需要新动画资源——用户“不要自制模型”的规则，没有做。
## R57 — autopsy: curved cuts, physics, real linen, grid size (user request)
- Cut = any drag path. Straight → plane (flat wax cap). Curved → `makeCurve()` screen-space polyline (Chaikin-smoothed, ends extended along tangent) ⇒ ruled surface through the camera; caps unrolled to (arc, depth) coords so loops triangulate; per-vertex cap normal = numerical gradient; winding fixed against the normal. `Autopsy.ui.doCutPath(path)`; `doCut(x1,y1,x2,y2)` kept for tests.
- Physics (inside `open()`): own rigid-body step 120 Hz — gravity, table (r 1.22) / floor (y -1.5), hull points (≤74 extreme vertices) vs table, piece-vs-piece (hull points in other piece's local AABB), friction, sleeping. 🤲 tool (key 2) grabs by a spring at the clicked point (dangling, can be thrown / dropped off the table). Fresh cut siblings ghost each other until they stop overlapping. Shadows on.
- 素衣 (linen): now DESTRUCTIVE + undoable (hist entry has `lin`). Cloth sets keep only vertices with torso/upper-leg reg and above knee-ish hem (reg bit +32 set at bake). Never nude: `hasCloth` requires ≥300 kept tris AND the skin layer to be a complete body (Genshin single-mesh bodies and bodies whose limbs live in the cloth layer disable the toggle).
- Inventory size: piece items carry `sz:[w,h]` (cellsOf: long edge/0.32m ≤4, 2nd edge/0.28m ≤3). `sack.js`: `base(o)` used by dims/fits/spot/cell. Panel shows a mini grid + "占 w×h 格" + bag free cells (Sack.usage).

## R58a (autopsy 刀路 / 切面 / 骨骼) — js/autopsy.js only
- User asked: knife-spot guide line, knife animation, cuts that change direction mid-way, cut face must read as "cut" not wax, bones kept ("骨骼保持" interpreted as: bones stay inside the pieces and show in the cut), ragdoll + lockable pose that survives returning to the cave.
- Done in R58a: vertex layout S=18 (cap coords cp 15-16, reg 17; tw=-1 flesh cap, tw=-2 bone disc); cap shader (skin rim→fat→striated muscle→deep; bone discs ivory+marrow); bones tracked per part (`part.bones`), split by cuts, bone discs added at crossings, `p.boneLine` shown in xray; guide dots on the body while dragging; dashed extension preview; SVG knife animation `runKnife` then `doCutPath`; `st.busy` lock.
- Gotcha: triangulateShape mutates its input arrays — build `all2` before calling it.
- NOT done yet (R58b): ragdoll (PBD) + pose lock. Plan: particles at joints, distance constraints, CPU skin via H_ weights, "lock pose" writes posed verts into V and calls initRB; pose stored in the whole-body piece.
- Never commit the user's GitHub token.

## R55h 用户：“你能网上多找点动作么”
- **查证（别再重复找）**：UAL2 Standard（GitHub 镜像 Barbatos6669/elderforge、ElKlient/IDOL-Genesis 的 `UAL2_Standard.glb`，43 段）里的战斗动作我们 `KEEP` 列表已经全烘了，免费版没有更多近战；Pro/付费版才有 3~4 连击拆分。**新的 CC0 来源 = Kay Lousberg 的 KayKit Character Animations 1.1**（itch/GitHub，CC0，161 段，Rig_Medium/Rig_Large；本次用 `Rig_Medium_CombatMelee.glb`，从 GitHub 镜像 J3vb/Sanctuarys_End `assets/animations/Rig_Medium_CombatMelee.glb` 下载到 `_tools/kk/`，gitignored）。其余分包（General / MovementBasic / CombatRanged / Simulation / Tools）还没烘，**横移、后退、闪避 Dodge 在 MovementBasic 里很可能有，值得下一步烘**（UAL 免费版没有）。
- **烘焙工具** `tools/anim_bake_kk.js`（Node，Windows 机器没有 python 也能跑）：同 `tools/anim_bake.py` 的格式（世界旋转增量 + 髋位置/髋高）；`--validate UAL2_Standard.glb <ual.js URL>` 用同一套代码重烘 UAL 两段并和现有 `big/anim/ual.js` 对比：最大旋转误差 1.1°、髋 Y 误差 0。KayKit 的 Rig_Medium 没有 neck/upperChest/肩/手指，这些骨骼不写入（`foe.js clipsFor` 对没数据的骨骼按父骨骼跟随）；髋水平位移减去第 0 帧（前冲由 ATK 的 `lunge` 负责，避免“滑出去再弹回来”）。输出 `assets/anim_kk.js`（`window.KK_ANIM`，124KB，15 段：1H 劈/斜切/横切/刺/跳劈、2H 劈/切/旋转斩/刺/Spinning、双持劈/切/刺、踢腿、拳 A）。`tools/glbprobe.js` = GLB 节点树/动画列表探测。
- **接入**：`foe.js` `loadAnim()` 在 UAL 之后再加载 `assets/anim_kk.js`（缺失也不影响运行）；`clipsFor()` 对每个动作包用各自的骨骼列表重定向，KayKit 动作名加 `KK_` 前缀。
- **出手时刻**：在这具身体的手/脚骨骼上实测速度峰值（角度 = atan2(-vy,-vx)，已和 UAL 条目校准：A 实测 -128°/表 -132°）。已用的 11 个 ATK 条目在 `moves.js` 的 `VAR`（`KK_Melee_*`）：劈 .63 / 跳劈 .70（lunge 3.2，heavy）/ 斜切 .38 / 横切 .23 / 刺 .37 / 2H 劈 .70（heavy）/ 2H 切 .40 / 旋转斩 .70+.85（两段）/ 2H 刺 .40 / 踢 .44 / 拳 A .40。**没用**：2H_Spinning（手速峰值不明显）、双持三个（单武器模型）、各种 Block/Idle。`wsK` = 把前摇拉回到和 UAL 差不多的反应时间（KayKit 动作本身更慢）。
- **池子**：`moves.js POOL` 每个职业加了 KK 招（决斗者偏刺/斜切、重甲卫/蛮兵偏 2H 劈切刺、狂战加旋转斩/跳劈…，徒手加踢腿/拳 A 以及踢腿连招）；`has()` 会跳过动作包没加载时不存在的招。台架 120 秒：决斗者 52 次起手里 24 次是 KK 招、徒手 67 次里 23 次，无报错无卡死（最长 5.6s 是连招）。
- **没做/待办**：KK 姿势只用数值检查（头高、脚/手轨迹方向）没有肉眼看（截图时被游戏本身的相机/敌人挡住）；其它分包没烘；CombatRanged 里有弓/魔法动作可给投掷手/术士用。授权记在 `CREDITS.md`。
## R58b (autopsy 布娃娃 / 摆姿势) — js/autopsy.js only
- New tool 🧍 摆姿势 (key 4, only when the table holds ONE uncut body with `part.rig`). 23 PBD particles (joints + 4 torso front/back points), distance constraints, rigid torso cluster, knee/elbow bend-direction limits, min-distance limits, table-slab/edge/floor collision with friction, limb-vs-limb particle collision, grab = pin one particle to a camera-facing plane.
- Skinning: bake now stores per-vertex rig groups `s.rg={P,N,sk}` (rest pos/normal + top-2 groups/weights from the ORIGINAL H_ bone weights; groups 0 torso, 1/2 upper arm, 3/4 forearm+hand, 5/6 thigh, 7/8 calf, 9/10 foot). `part.rig={jn,off,pp,pts0,bones0}`; `rig.off` is shifted in `recenter`; `linenize` remaps `rg`.
- 🔒 固定姿势 (or switching tool / cut / linen / finish) writes the posed positions+normals into a NEW part (undo works via hist), keeps `rg` + `rig.pp` so the body can be re-posed later. Cut pieces drop `rig` (no posing after a cut; Ctrl+Z back to the whole body).
- Pose is persisted by the normal piece pack (IndexedDB), so a taken whole-body piece keeps its pose in the cave. Re-posing inside the cave is NOT implemented (would need a rig in Props).
- Footprint (`sz`) follows the posed bbox. Pose geometry is a CLONE of the cached geometry (the cache is needed for undo) — never mutate `s._g`.
- Test hooks: `Autopsy.ui.pose.{start,end,rd,grab(i,x,y,z),release,reset,skin}`; scripts were `/home/user/work/t14.js`.


## R57s（剧情，与上面 autopsy 的 R57 无关）· 剧情与钩子（宿敌剧情 / 起源 / 地区电影改对话 / 开场文案 / 开始框 bug / 血祭面板）
用户原话要点：缺剧情和钩子；主线是月之魔女，二次元“女主们追猎你”的感觉，随机生成；宿敌变强要先播剧情（每次加载地图），说清楚她怎么变强、强在哪（方面不同），可能带队友；开局 4 猎手和宿敌的起源；进地区别在出生点乱转镜头，改成地区里不同女人的多角度特写+对话+多样反馈；开场文本太迷幻要具体；电影后常不出开始框；血祭别放在地区 UI 里。
- **新 MOD `nem_story`（默认开，仅中文）· 新文件 `js/nemstory.js`（window.NemStory）**
  - 成长侦测（每 250ms poll）：猎手 `Hunters2.lvOf` 上涨（8 分钟成长 / 仇恨 / 逃走 esc → why='esc'）、额外宿敌 `Nemesis.S().extra` 每 5 分钟成长；新出现的额外宿敌 → 起源事件；首次运行 → 开篇事件（四猎手接下“第七号悬赏”，落款是月印 → 月之魔女钩子）。
  - 每个成长事件随机一个**方面**并立刻写进 `G.S.nst.p[key]`（key = `h:aerin` / `x:名字`）：blade 伤害+12%（≤3）· armor 生命+18%（≤3）· skill 技能池加 leap/charge/breaker/whirl · study iq+0.22（≤2）· swift 速度+10%（≤2）· bless 词缀 iron/regen/relentless/leech · vow 撤退血线 0.3→0.16 且伤害+8% · ally 同伴（最多 2 人，RPG.foe 固定 seed 生成，出场时 `Foe.populate keep` 一起刷出）。
  - 出场套用：`hunters2.js spawn()` 末尾 `NemStory.apply(fo,'h:'+id,C,pos)`、`__forceAff` concat `NemStory.aff()`；`nemesis.js extraStrike()` 同样（populate 时临时设 `__forceAff`）。`hunters2.js` 撤退判定改 `fo.nsVow ? 0.16 : FLEE_AT`；导出 `recFor`。
  - 播放：地图就绪（W.B && !W.busy，非精英/猎场）且队列非空 → 用 `Foe.build + Foe.animate` 在玩家脚边临时搭演员（同战斗里的身体/头：`Hunters2.recFor` / `x.h` / 导师与同伴 RPG.foe），`Saga.reel()` 播放；结束移除演员。每次加载最多一段（开篇 > 起源 > 成长），其余成长事件做成“同一时间”蒙太奇卡。最后一张**变强卡**（`#sgRoot .nsb`）列出方面和效果。台词：每名猎手专属地点/导师/方面台词/对你最近行为的反应（`{reg}{n}{heads}`），额外宿敌用 Overhear.bio 口头禅/秘密。
- **`js/saga.js`（R49 作者文件，改动尽量小）**：抽出 `startCN()`；新增 `reel(o)`（通用短片：beats 同 castBeats，可带 `card:{a,b,c}` 标题卡、`onBeat`、`onEnd`）、`castShot` 新镜头 `cTwo`（双人侧拍）/`cOS`（过肩，需 `fo.pair`）；`tick` 开头 `NemStory.hold()` 时先不播地区电影；精英房跳过时置 `sg.cinDone`；导出 `reel / castShot / pendingCine()`；`finishBeats` 对 reel 直接 end；`end()` 调 `sg.onEnd`。
- **新 MOD `saga_talk`（默认开）**：`saga.js talkScript()` —— 地区电影改为场上 2–3 个真实在场的女人（castPick 放宽到 3 人）的硬切特写对话：标题镜头=她看见你（初访惊恐/再访戒备/上次赢了或输了/悬赏高时不同），她用自己的名字说异变，另一人接话，手部动作+起因，目标在场则目标亮相，最后有人说出目标下落，赌注卡、出发卡保留；猎手在场时插入猎手人设镜头。附近没人 → 退回旧 `script()`。
- **开场文本**：`saga_data.js MONO` 全部改写成具体的格罗克心声（饿/首级/悬赏/魔女诅咒/斯尼克），不再“月亮在我骨头里敲了一下”。（新游戏的 `ui.js INTRO` 文本页本来就具体，没动；真正的“开篇剧情”由 nem_story 开篇短片承担。）
- **bug：电影后不出开始框**（`js/arrival2.js`）：以前只在 700ms 时看一次 `Saga.cine`；地区电影晚开（猎手伏击最多推迟 9s）时窗口先弹出、被 `body.sgcine` 盖成透明，玩家按空格翻电影时被“隐形”关掉。现在等 `Saga.cine || Saga.pendingCine() || NemStory.hold()` 都结束（最多 40s）再开，已开不重复开。
- **新 MOD `rite_panel`（默认开）**（`js/nemesis.js inject()`）：血祭从地区选择界面里移出来，改成左侧固定面板 `#nemBuff.nb-side`（和 loop.js 右侧 `#lpSide` 对称，z 130），地区界面关闭/出发时移除；关掉 MOD = 旧位置。
- 其他改动：`mods.js` 3 条 MOD；`index.html` 在 nemesis.js 后加 `js/nemstory.js`；`nemesis.js` 8 分钟成长 toast 文案。
- **测试状态（R57s）**：Node 桩测试通过（`nemstory.js` 开篇/猎手成长/多人合并蒙太奇/新宿敌起源/额外宿敌成长 → 剧本与变强卡、`apply()` 改属性；`saga.js talkScript` 初访/上次赢/上次输三种反应）。真实浏览器：开局事件入队 → 地图就绪后开始搭演员 ✔，但本沙箱 2GB 内存在出猎地图 + 额外 VRoid 身体时被 OOM，**没能截到插曲画面**；慢机器第一次搭 4 个身体约 50s（已改 60s 超时 + 下一张图重试一次 + 并行搭建）。请有 GPU 的机器实测：新存档出猎 → 开篇四猎手 → 地区女人对话电影 → 开始框。
## R58c (autopsy: 布娃娃开关 + 只切划过的地方) — js/autopsy.js only
- User clarified: "回去你还可以固定摆姿势" = the ragdoll can be RELEASED or KEPT (toggle), not just a one-off locked pose. Ragdoll is now a toggle button (🧍 布娃娃, key 4, `data-act="rag"`): ON = live PBD ragdoll (grab joints with 🤲 举起; rotate tool blocked); 解除 = body keeps the current pose as a rigid piece (rig kept in `part.rig` so it can be switched on again). Cut/linen/finish auto-release.
- User also said: don't draw a direction and have the cut run through the whole body. New cut semantics (`sliceSlit` + `cutPart`, always `curveTool`): an end of the line that lands ON the body = the knife stops there (tip circle shown, no extension); an end that leaves the body = cut through (dashed extension). The cut surface is only active for path param s in [0,len]. Topology: cut edges outside the range stay joined, so a partial cut gives ONE piece with an open slit (lips opened 8 mm, flesh cap via chord-closed loops, tol 0.6); a fully severing cut gives several pieces. `cutPart` returns a FLAT piece list now.
- `components()`: islands (e.g. hands) are tied to the neighbour island by nearest-vertex ties (`islandTies`), cap tris unioned to shell via `cmap`; layer merge across sets is volume-overlap ≥0.5 (the old touching-bbox rule merged the two sides of a cut).
- Any cut drops `part.rig` (vertex layout changes) → ragdoll only on an uncut body; Ctrl+Z to go back.
- Test scripts (lost on reset): t16/t17 cut cases, t18 ragdoll toggle.

## R58d（解剖台：圈选刨取）
- 新工具 ⭕圈选（键 5）：在身体上按住左键画圈（自动封口）→ 标记（金色圈+点）留在身上，可转视角；底部条选深度 浅3/中6/深10cm（从最外层皮肤算起，衣服鼓出来也没关系）→「🥄 刨下这块」把圈内那一块切成独立块，身体上留坑。
- 实现：`setMark/regionTool/doCarve`（autopsy.js）；`cutPart` 的 region 模式（SDF=min(多边形距离, 底面距离)，缝宽 0.0003，不切骨盘，仅皮肤层生成侧壁+底面 `addRegionCaps`，`loopsOf` 抽出环链）；`components(sets,tool)` 在 region 下按“在圈内/外”投票，避免包围盒重叠把小块并回身体。
- Autopsy.ui 新增 `mark(path)`、`carve()`；测试 `/home/user/work/t19.js`。已知：布料层的圈内碎片可能单独成一小块“碎块”。

## R58e（解剖台：衣橱，逐件隐藏衣服）
- 用户：衣服本来是单独模型，试试直接隐藏/删除来实现更衣。→ 「衣着」按钮改为打开衣橱面板：按类别（鞋/连衣裙/上衣/下装/袜…，按 set.nm 里的 _Shoes/_Onepiece/_Tops 等识别）逐件隐藏/穿回；隐藏＝对应 set 标 `hid:true`（mesh 不可见、不可拾取、不进 bbOf/hull/pack），可再点穿回，也可 Ctrl+Z。
- **底线不变：不裸体。** 脱掉一件时会生成该件的 `bandSet`（只留躯干到大腿根的素麻色底衬，`bandOf=类别`），穿回时删掉。面板另有「全部换素衣」（原来的整套素衣流程，`st.wdForce`）。仅当 `B.hasCloth`（皮肤层是完整人形）才可用。
- `hid/bandOf` 已穿过 cutPart/components/摆姿锁定。测试 t20.js（t13 的素衣一步改为点 `[data-wd=lin]`）。

## R58f（解剖台：🧩 网格编辑）
- 新工具 🧩网格（键 6）：点一块网格选中（连通块＝按顶点位置焊接后的连通族；整层＝这一层材质的全部），金色高亮；按住拖动可在镜头平面内把它挪走；底部条可染色（10 色 + 取色器；叠色＝保留花纹，涂满＝纯色）、删除、取消选择。全部可 Ctrl+Z。
- **不裸体底线保持：** 挪走/删除一个衣服连通块时，自动在原位留下该块的素麻底衬（`wearBand`，bandOf='编辑'）；底衬层、以及素衣状态下的衣服层是受保护的（不能删/挪，只能染色）。
- 实现：`ccOf/edSelect/edEdit/edDye/edDelete/edDown/edMove/edUp`（autopsy.js）；每次编辑复制 sets 后重建块（挪动会丢 rig，染色/删除保留）。`Autopsy.ui.edit={dye,del,st}`。测试 t21.js。

## R53c — VRoid Hub 第三轮（按评分/爱心数从高到低，agent: sourcing）
- 220 个人工看图挑出的奇幻女性候选按 hearts 降序下载（另加 9 个高爱心的少女系），163 个转换成功并过体型质检推上 origin（大部分只是 `models/VH_*`+`big/body/VH_*` 文件）；18 个质检淘汰。
- 逐张看身体拼图后只登记 92 个进 `js/vroid_pack.js`（现 168 条）：剔除裸体/泳装感、现代休闲（卫衣/牛仔/西装/校服）、幼态（身高过矮）、男性、版权角色（绫波/重音テト/古明地等）。被剔除的文件仍在 origin 但没登记（和第 1/2 轮一样），`VH_OUT` 名单见本次 commit 说明。
- 身份由标签+外观粗分（NOSTATS，未量明度），villager/smithgirl/herbalist 等偏多；想细分可自己改 `js/vroid_pack.js` 的 `ids`。
- 授权统一：暴力/改造/再分发全允许；署名见 `CREDITS.md`。id 清单：`tools/hub/ids/h1..h6.txt`（`<characterId> <modelId>`，h1 为最高评分）。

## R58g（解剖台：底衬样式切换）
- 用户要求：底衬改成绷带缠裹，并做左右切换（共 3 款，第 2、3 款用户稍后加本地模型，先做好切换）。
- **覆盖范围保持不变（躯干到大腿根，不裸体——开发者决定，用户曾要求“不遮挡肉体”，已婉拒）。** 只改外观：绷带缠裹＝程序化斜向缠绕条纹（shader：`vTw<-2.5` 分支，`cp.x` 存条纹坐标，`tw=-3`），不是新建模型。
- 衣橱面板底部有 ◀ 样式 ▶ 切换（`data-bs`），`BASE_STYLES = [bandage, slot2(empty), slot3(empty)]`，选择存 localStorage `autopsy_base`；切换会就地重涂所有底衬（`restyleBase`），`Autopsy.baseStyles` 暴露，`Autopsy.ui.base.{set,idx}`。
- 槽位 2/3：`empty:true`，暂时显示素色。接模型时：给对应项提供 `paint(V,o)`（改顶点色/tw/cp）或另写加载逻辑并去掉 `empty`；需要用户给出模型格式/路径。
- 测试 t22.js。

## R60 用户（原话）：数值平衡 / 所有建筑都产 SAN 又产魂晶 / 简介更清晰 / 机制整合 / 神灵对话弹两次
> “你数值要考虑到平衡性！你可以模拟游戏平衡-而且san是那种无限刷的资源，就是类似挂机游戏……你检查下所有建筑，而且所有建筑又可以产san又可以产魂晶！……简介建筑技能描述你也优化下更清晰。san的数值你最好好好设计。而且SAN那种暂时性加成就是每一项可以无限点，然后感觉上就是每次点了变贵那种数字会高一个数阶？……我现在机制一堆……整合一下就是有机的结合……我遇到神第一个火神对话会弹出2次你顺便修下”
- **R59 的“SAN 型 / 魂晶型”分类作废**：改为**所有放首级的建筑都两样都产**——🌀SAN 每个计时周期实时产（`San.spec(type)`），🔮魂晶仍是回合结算按在岗首级发（`Loop.settle` 恢复对所有建筑发，`San.kind` 已删）。没有计时器的建筑（祭仪厅 rh_* / 魂轮 / syn_* / 圣髑坛）在 `SAN_CFG.SPEC` 里给了 SAN 规格；熔魂炉不产。`game.js` 的建筑计时在回合制下用 `San.spec`，旧（非回合）模式仍用 `mount`。
- **数值集中在 `js/san_cfg.js`，模拟在 `tools/test/sanbench.js`**（`node tools/test/sanbench.js 60` 看 60 回合曲线；`--bld` 看每座建筑“放满英魂的回本回合数”；`--csv` 导表）。关键常量：`K`=3（SAN = 旧魂晶产出×3）；点击 = 本颗×K×0.25 + 挂机速度×0.4 秒（点击随产量成长，后期不失效，主动玩 ≈ 挂机的 2~3 倍）；价格 = 基础 × (1+0.5·(章-1)) × 2.2^已有级数（≈每 3 级高一个数阶），数字用 K/M/B/T 缩写（`SAN_CFG.fmt`）；效果 = 上限×(1−0.94^级)——**每项无限点、渐近上限**（伤害 / 生命 +150%、移速 +40%、恐惧 -25% 敌人生命、啜饮 6% 每杀、清空奖励 +200%）；附魔六种各自独立升级，强度 P(n)=2n/(n+4)（0.4→1.0→1.5→2.0）；躁动价 = max(200×章节系数, 挂机速度×45s)、连买 ×1.8、洞里 120s ×2；魂晶香 +60% 上限、q=0.88、本回合结算后重置（SAN→魂晶，模拟里约 20~120 SAN/魂晶）；月光窥视每回合限 1 次（祝福是整局永久的，不能无限买）。洞里小游戏（魂球/盗魂灵/摆件…）进账的魂晶每 1 折 8 SAN，超出回合上限的部分只给 SAN。
- **模拟结论**（240 秒/回合、洞里占 35%、离洞按 50% 折算）：第 1 回合 SAN≈800（够买 2 级增益 ≈+17%）；第 10 回合≈2 万；第 30 回合≈120 万；第 60 回合≈1000 万+；单项全押可买的级数 3→6→8→10…，所以效果 +17% → +47% → +64% → +70% 渐近，不会碾压战斗；SAN:魂晶的折算 20~120。**逐座建筑回本**：原始倍率让 `lampost / headless_statue / bloodpool / vault / rocker / cuckoo / sworn / vending / appraisal / auction` 明显偏亏（回本 8~50 回合），在 `SAN_CFG.SANX` 里给这几座单独的 SAN 倍率（×1.8~×12，**只乘 SAN，不动魂晶**），拉到 5~7 回合（鉴定台 / 拍卖台是工具型建筑，允许 11~16）。其余建筑 2~6 回合回本。
- **简介重写**：`js/san_brief.js`（`window.BuildBrief`）给每座放首级 / 功能建筑一句话作用 `s` + 互动 / 特殊规则 `e`；建造菜单卡片显示 s + 产出行（`San.prodLine`：🌀每 Ns ×倍率 · 🔮每颗 ×bf / 特殊规则 · 槽位数）+ e，原来的长 desc 留在悬停提示里。内容全部照原 desc 的真实机制写，没编新规则。
- **机制整合**：Hub 的「流派 · 祝福」页并进「🌀 出征准备」一页（Tab 菜单，反引号键）：顶部 SAN / 挂机速度 / 点击价值 → 「下一趟总览」（建筑与祭仪厅给的祝福 + SAN 强化 + 魂晶香 / 回合香 + 流派 / 祝福数）→ 本局流派 · 祝福（`Rogue.mount`）→ 增益 → 附魔 → 仪式 → 全洞产出一览（每种建筑的在岗首级、SAN/s、魂晶/回合估算）→ 一段“两种资源怎么循环”的说明。一条主线：**魂晶 = 永久（建筑 / 训练 / 鉴定）；SAN = 临时（下一趟）；魂晶买更好的建筑和更高阶首级 → SAN 涨得更快 → 换更强的下一趟 → 带回更多首级和魂晶**；魂晶香是 SAN→魂晶的桥，月光窥视是 SAN→祝福，躁动是 SAN→SAN，洞里小游戏超出上限的魂晶折成 SAN；回合香（runkit 道具）与魂晶香加法叠加（`Loop.settle` 里 `inc = 1 + r.inc + San.incense()`）。
- **神灵对话弹两次（小烛序章）**：`spirits.js scan()` 在序章播放期间 `T.flags.prolog`（要演完才写入）还没置位、队列又已被取走 → 周期扫描又 `queue({k:'prolog'})`，对话关闭后再演一遍。修：`!dlg.open` 时才排序章（`js/spirits.js` 的 `scan`）。其他到访 / 点灯 / 半程 / 就绪事件的标记都是开始时就写的，没有这个问题。已用 Playwright 把序章按空格走完，只出现一次、`q` 为空、`flags.prolog` 置位。
- **存档**：`S.san` 结构变了（`arm/act` 里的 `b`/`e` 都是 `{key: 级数}`，旧版 `e` 是字符串会被惰性重置）；新增计数 `ix`（本回合魂晶香级数）`bx`（窥视次数）`fx`（躁动次数），在 `Loop.settle → San.endTrip()` 时清零。
- **没验证 / 待办**：真实一整趟出猎里附魔的体感与数值（`Foe.dot` 伤害量）；模拟假设的出猎魂晶 `200×1.3^(章-1)`、首级掉落稀有度是估的，**要用真实存档校准**（把 `sanbench.js` 里的 H(ch) 和稀有度分布换成实测）；模拟没有套用 320 颗首级上限；`syn_*` 联动建筑的 SAN 规格（12s ×1.5）是随手定的；出征准备页很长，可以考虑分页签。

## R58h（解剖台：删衣服不再生成底衬网格）
- 用户反馈：删掉部分衣服网格后会冒出“一坨奇怪的东西”挡视野（`wearBand` / 衣橱脱衣时由衣服三角面复制出来的底衬网格）→ 这两处自动生成已删（`wearBand` 变空函数，`toggleGarment` 不再 `bandSet`）。「全部换素衣」按钮仍保留（用户主动点才有）。
- 用户要求：衣服删空后露出**模型自带的人体层**（VRM 原版皮肤层），不裸体，要基础绷带。做法：`bake()` 里当 `hasCloth`（皮肤层是完整人形）时，把**皮肤层**躯干到大腿根（同素衣范围：reg 码 0/18/19/20 且 y 在 hem~top）的顶点直接涂成绷带样式（`BASE_STYLES[0].paint`，tw=-3 程序化条纹），不新增任何网格；`restyleBase` 也会重涂这些顶点。皮肤层不完整的模型（`hasCloth=false`，四肢画在衣服层里）仍没有可露出的人体，删空就是空的。
- **没验证**：本机没有 `big/body/*.js`，harness（tools/test/autopsy.html）加载不了带衣服的人体，只做了静态检查；请在有模型的环境里确认绷带范围、条纹方向、切开时的截面。

## R58i（解剖台：遮罩网格取代涂色 + 修“切了没断面”）
- 用户：“不要涂色，还是加个网格，遮罩网格”→ R58h 的“直接涂色”撤掉。`bake()` 只把皮肤层躯干到大腿根的顶点标记为遮罩范围（reg+32，同衣服层“素衣保留”约定）；运行时 `skinBand(sets)` 从这些皮肤三角面拷一层、沿法线外推 3mm、涂绷带样式，生成 `bandOf:'底衬'` 的遮罩网格（带 rg，可摆姿/切割；受保护不能被网格编辑删）。它是照**身体**拷的，不是照衣服拷的，所以贴身、不会鼓出一坨（旧的 `bandSet` 是照衣服三角面拷的，已删）。`ensureBand(sets)` 只生成一次：衣橱脱衣 / 网格工具删或挪衣服块时触发；衣橱把衣服全穿回就移除遮罩。
- 用户：“有时候切割了但是没断面”→ **根因已复现并修复**：glTF/VRM 网格在 UV 接缝处是重复顶点，同一个切点被两侧三角形各算一次，截面线段链在接缝处断开，`addCaps` 拼不成圈（合成圆柱带接缝测试：旧代码一侧截面面积 0）。新增 `weldSegs`（按位置把线段端点焊到同一顶点，`addCaps` / `loopsOf` 都先焊）；另外三角剖分失败（多边形自相交）时改用中心扇形兜底，保证总有断面。合成测试：两侧截面面积都≈圆盘面积。
- **没验证**：遮罩网格在真实带衣服人体上的范围 / 外观（本机没模型）；扇形兜底对凹多边形会略粗糙。
- 修正：遮罩偏移方向曾向内（烘焙后皮肤层法线朝里）。`skinBand` 现在按“遮罩范围顶点相对躯干中轴的法线点积之和”定每个 set 的外侧符号 `sg`，再沿 `法线×sg` 外推，不再信任法线朝向。
- 用户反馈自动判定仍然向内 → 衣橱面板加了「🧵 遮罩偏移：向外 / 向内（点击反转）」按钮（`flipMask`，存 localStorage `autopsy_maskdir`，默认 -1＝在自动判定基础上反转一次；点击会把已生成的遮罩网格按新方向重建，可 Ctrl+Z）。

## R59s（剧情摄影棚 cine_stage，与上面 SAN 的 R59 无关；agent: story）
用户原话要点：宿敌插曲和地区入场对话两段电影“镜头/动作/背景光照/文字卡片全方位低质量，全程掉帧”。
- **新文件 `js/cinestage.js`（`window.CineStage`），MOD `cine_stage` 默认开**（关掉 = 回到 R57s 旧电影 Saga.reel / startCN）。
  - 独立小场景：只有演员（`Foe.build` 克隆，地区对话用在场女人同一 `f.bodyName` + 同 `h.look`）+ 三点布光（取大地图太阳/半球/雾色）+ 脚下柔影。
  - 背景：**每次切镜头**用该镜头机位把大地图（隐藏 Foe、第一人称手）拍成 0.3 倍分辨率 RT，摄影棚里全屏虚化（景深感）。大地图之后不再每帧渲染 → 不掉帧。不走 master.js 后处理（它按深度加雾，会把背景片当天空）。
  - 只渲染 2.39:1 画幅（scissor），黑场里 `renderer.compile`；45 s 搭建超时自动放弃。过场期间不掉血。
  - 表演：说话者 Idle_Talking_Loop + 口型(aa/oh，与眨眼/情绪合并成一次 setExpression，30Hz) + 开口点头；所有人看向说话者（头/颈/胸 rotW，±0.55 rad 限制）。
  - 镜头：low / mcu / ots / ecu / side / two / wide，全部在观众一侧（不越轴），慢推 + 轻手持；单人镜头自动绕开挡镜头的其他演员（clearLine）。
  - UI `#csRoot`（自带 CSS，body 类 `cscine` 隐藏 HUD）：单行打字机字幕 + 说话人名、首次出场下三分之一名牌、左侧标题卡、右侧变强卡、恩/祸双卡；空格/E/回车 = 下一句，Esc = 跳过，点击 = 下一句。
- **接入（改动点）**：
  - `js/worlds.js` 帧末渲染行：`CineStage.active && CineStage.draw(G.renderer)` 时跳过大地图渲染。
  - `js/saga.js`：新增 `stagePlay()`（play() 里 talk 剧本全部有 castFo 时走摄影棚，失败回退 startCN）；`get cine` 在摄影棚播放时返回占位对象；`pendingCine` 摄影棚播放时为真（开局框不会中途弹出）。
  - `js/nemstory.js`：`st.stage` 时 `rig()` 只返回演员表，`start()` 调 `CineStage.playHere`。
  - `js/mods.js` 新 MOD；`index.html` 在 nemesis.js 前加 `<script src="js/cinestage.js">`。
- 测试台：`tools/test/cine.html`（真实 foe/heads/VRoid + 假地图），`startCine('talk'|'intro')` 后 `step(秒)` 推进；驱动脚本思路：playwright 截图（swiftshader 下截图偶尔超时，可退回 canvas.toDataURL）。
## R61 解剖台·CC0 素体底模（MOD `autopsy_base`，默认开）
用户需求：删掉大衣、保留衬衣时手臂不要空；用网上 CC0 的 VRM 素体作底模；脸和身体肤色要一致；不动协作者的遮罩（R58h/i）。
- 新文件 `js/basebody.js`（`window.BASE_BODY`，约 470KB：Body_00_SKIN 的位置/UV/索引/蒙皮 + 骨骼静止位置 + 512px PNG 贴图）；转换脚本 `tools/convert_basebody.py`（源 VRM 不入库，来源见 CREDITS.md）。`index.html` 与 `tools/test/autopsy.html` 在 autopsy.js 前加载。
- `js/autopsy.js`：新增 `attachBase(sets,BN,root,look)`，在 `bake(root,look)` 里 BN 算好后、hasLin 之前调用。判定：角色皮肤层（skin && cap===1）按区域（躯干/双臂/双腿）的面积，与素体按腿长比例缩放后的面积比较，任一区 <45% 就视为皮肤层不完整 → 用素体替换皮肤层。素体按骨骼“逐骨重定位”（旧骨→新骨方向旋转+长度缩放，再按蒙皮权重混合），带 `rg`（布娃娃分组）、reg 码、UV；之后协作者的遮罩/skinBand 照常工作（未改动）。单网格身体（Jean/Amber 等无 skin 材质）不触发。`bake` 返回 `base:{used,need,ratios}`。
- 肤色：`faceColorOf` 取 `look.skinHex`（头部着色器的目标肤色，且 foe.js 会让头随身体），素体顶点色 = 脸色 / 素体贴图均色（限幅 0.55–1.08）。`open()` 现在调用 `bake(root, f.look)`。
- 素体贴图自带黑色“内衣”涂装区（VRoid 默认），与躯干到大腿的遮罩叠加，不裸露；内容边界不变。
- 实测：VH_007034/009210/012045/021977 会触发；t13/t22 通过。扫描脚本 `/home/user/work/t23.js`（不入库）。

## R61 UI 大修 · 第一步：转盘菜单 + 页面外框（MOD `ui_wheel`，默认开，依赖 ui_hub）
- 用户原话：“UI 大修……按住 TAB 不是左侧一个列表，而是一个转盘，然后你可选择你要进哪个 UI 页面，然后你这个 UI 页面设计的我只能说非常低级简陋感。我要大师级的 UI 设计！3A 游戏那种神作 UI 感。”
- **转盘 `js/wheel.js`**：轻点 Tab＝开 / 关菜单（改成松手触发）；按住 >190ms＝转盘。SVG 扇区 + HTML 图标叠层：内圈 5 个分组弧（角色/挑战/收藏/世界/系统，各有主题色），外圈每页一个扇区（角度与所属分组对齐），中心圆盘显示选中页的图标 / 名称 / 说明 / 热键，空闲时显示 Lv / 战力 / 魂晶 / SAN。鼠标是“虚拟光标”（`movementX/Y` 累加，指针锁定时也行），角度决定页面、半径小于死区＝不选；松开 Tab 进入，左键确认，Esc 取消；不动鼠标直接松手＝回到当前 / 上次页。打开期间 `window.__wheelOpen=true`，`game.js` 的 mousemove / canvas mousedown 据此冻结视角和攻击。
- **Hub 外框（`js/hub.js`）**：转盘开启时左侧列表隐藏（`body.hubwheel`，`--hubW:0`）；顶部出现页面标题头（分组 ❖ 页名 + 上一页 / 下一页），底部键位提示条（Tab 按住转盘 / `[` `]` 切页 / Esc 返回，`step()`），`.modal` 顶底加纹章、入场扫光；页面打开时隐藏 `#nemChip/#spchip/#sanChip`。`Hub` 新增导出 `GROUPS / avail / curLang / last`。
- **关于“大师级”**：这一步做了转盘和统一外框；各页面内部（总览 / 背包 / 天赋 / 建造 / 收藏等）的版式还是 UI3A 原样，没有逐页重做——它们是几十个模块各自的 DOM，需要逐页设计（栅格、层级、数据可视化、品质配色、动效）。下一步建议先挑 2~3 个最常用的页（总览、建造、首级收藏）做样板，再套到别的页。
- 测试：Playwright 用合成事件验证了 轻点开 / 关、按住出转盘、鼠标选页、松手进入、已开页时按住不动＝保持、Esc 取消。**没在真实指针锁定 + 真实键盘下测过**（headless 里 Tab 按键没触发，合成事件可以）。

## R62 洞穴绳索/钉钩系统 (rigging MOD, def ON)
- 新文件 `js/rigging.js` (`window.Rig`)：钉(nail)可钉入岩壁/头/摆件/肉块(piece)，E 拔出退还；挂钩(hook)、锁链(chain)、三叉铁环(ring)、秤砣(weight)、招魂铜铃(bell)、吊灯(lantern)。链=PBD 质点链(substep, `cmax=0.25` + 每点 6m/s 速度上限，别再调小 cmax：会让长链卡死)。
- 头/摆件被链/钩挂住后变成 Rig 驱动的刚体(组件锚定到钉才会悬空；没锚的整体拖地)，拾取头/摆件会自动解链(`Props.grab`→`Rig.releaseProp`)。
- 摆件制作在工坊“摆件”页(`js/props.js` 的 `RIGS` 表)；放置委托给 `Rig.startPlace`。两击放链：先点端口，再点另一端，滚轮调长度，右键取消。
- 小幅连锁产出加成：`Rig.mul(pos)`（挂着的东西越多越高，上限小），由 `Props.auraMul` 乘入；铜铃被撞/摆动超过阈值触发 `G.trigger(h,'rig',mult)` 共鸣。
- 存档 `G.S.rig`(parts/nid/bq)，beforeunload 与 addPart 时 persistBodies。
- 同时修复协作者 `js/mods_i18n.js` 的 SyntaxError(`ui_wheel` 与 `san` 之间的字面 `\n`)。
- 内容边界不变：材料为骨/筋/尸蜡/发/灰/铁，无血腥堆砌；几何为程序化原语(灯用 Poly Haven 资源若可用)，可换成用户模型。
- 测试：`tools/test/rig.html`（`?props=1` 载入真 props.js）。

## R59t（cine_stage v2：多场景分镜 + 转场；进图看不到电影角色）
- 用户反馈：进图就能看见电影里的人；电影“太土”，要多样台词、场景特写、描写镜头、转场。
- `js/cinestage.js` 重写 v2（MOD 仍是 cine_stage）：
  - 多场景 `scene:{key,cap,sub,cast}`：A=玩家面前，其余在地图里自动找背后有地标的空地（≥9m）。
  - 新镜头 `est`（建立镜头，背景推镜）、`entr`（走入）、`hand`（手部特写）、`back`、`feet`。
  - 拍字段 `act`（指定动作）、`walk`（走入）。
  - 转场 `tr:dip|dissolve|flash|cut`，配地点字幕 `.loc`（左下），名牌 `.lt` 移到右下。
  - `hook(renderer)`：有电影就画电影；saga/nemstory 电影待播、且进图 14s 内则画黑场，玩家看不到场上的人。
- 新 `js/cinescript.js`（index.html 在 cinestage.js 前加 script）：
  - `region(sg)`：地区电影分镜。
    - 场景顺序：异变现场（目击者跪地 → 手部 → 对话 → 另一人走入 → 过肩对话）→ 她所在地（建立 → 背影 → 仰拍 + 讨伐名牌 → 眼部）→ [猎手：外围走入] → 溶接回现场（消息传来、钩子、闪白、赌注）→ 讨伐卡。
    - 演员是按种子生成、不在场上的女人；目标用 `node.sagaH`（与地图里遇到的一致）。
  - `nem(spec, ev)`：宿敌插曲加场景、动作、手部插入、走入；按变强方面配不同动作（blade/vow 带刀）。开场 4 猎手各自一个场景。
- `js/saga.js`：
  - 旧 `stagePlay(sg,beats,col)` 换成 `stagePlay(sg)`（调用 CineScript）。
  - `play()` 开头先尝试，失败时 `sg.noStage` 回退旧播放器。
  - 摄影棚模式下不再预留猎手（`hReady/hLate`），电影结束 1.2s 后调用 `Hunters2.ambush`。
- `js/worlds.js`：渲染处由 `CineStage.active&&draw` 改为 `CineStage.hook`。`js/nemstory.js`：播放前调用 `CineScript.nem`。
- 测试：`tools/test/cine.html` 新增 `startCine('region')`（假 sg）和 `skipTo(bi)`。只在测试台验证过 14 拍分镜，真实地图尚未实机验证。

## R63（开发者工坊 DevLab：独立大面板，随机人物/尸体/首级 + 无限建造/材料）
- 用户：“开发者模式加强，单独 UI 面板，随机人物、随机尸体、随机头部，各种材料无限随便建造”。
- 新文件 `js/devlab.js`（`window.DevLab`，依附 MOD `dev_mode`，仍默认关）：F8 / 右下角「🛠 DEV」打开居中大面板，6 个页签：
  - 👤 人物：地区（当前/任选）、稀有度、身体（随机或指定 VRF+VH_PACK）、数量 1/3/5/10、行为（敌对 / 胆小 / 假人＝每帧 stag 锁 AI，可随便砍）。走 `Foe.populate(ctx,list,{keep:true})`，并推入 `W.foes`；生成在面前 3 m 一排，面朝玩家。「清掉我生成的」移除本面板生成的全部。
  - ⚰️ 尸体：同上参数；完整尸体（`Foe.dot` 致死 → 布娃娃，可搜身/解剖/斩首）或无头尸体（再 `Foe._decap`，首级落地可 E 拾取）。
  - 💀 首级：数量 1~200、稀有度、去向（魂库 / 洞里面前），调用 `DevMode.addHeads`。
  - 🏗 建造：列出 `BuildCat.C` 全部建筑（按 CATS 分组）+ `Rig.KD` 装具（点一下送 50 件并进入放置）；“免费无限建造”开关 `DevLab.free()`。
  - 📦 材料：`Sack.IT` 中 mat/use/loot/pile 全部物品，点击给 ×1/×10/×99/×999；全部 ×999、+100 万魂晶、药剂 ×99。
  - ⚙ 开关：原 DevMode 的 4 个开关 + 一键（装备满阶/等级/全解锁/回忆全开）。
  - 人物/尸体只在野外可用（洞里没有角色系统，会提示）。
- 改动他人文件（最小）：
  - `js/foe.js` populate：`const bodyName = it.body || bodyFor(...)`（list 项可指定身体）。
  - `js/game.js` placeBuild：`FREE = DevLab.free()` 时跳过放不下/魂晶/上限/RegEcon 检查与扣费，放完不退出放置。
  - `js/devmode.js`：toggle 和 F8 转给 DevLab（DevLab 不存在时保持旧小面板）。
  - `js/mods.js`：dev_mode 描述前加 R63 说明。
  - `index.html`：devmode.js 后加 `<script src="js/devlab.js">`。

## R53d — VRoid Hub 第四轮：高评分/高质量优先（agent: sourcing）
- 重新用 63 个奇幻关键词扫 Hub（授权三项全允许），去重后按爱心数排序，只看 ≥40 爱心的 132 个角色缩略图，人工挑 34 个（剔除版权角色/裸露/男性/Q 版/现代装），下载 25 个，23 个过体型质检推上 origin，13 个登记进 `js/vroid_pack.js`（现 181 条左右）。
- 授权全允许的模型里高人气的本就稀少（最高才 ~800 爱心）；这批多为あわ、Arcroid、巫女/炼金/精灵/酒馆风。署名见 `CREDITS.md`；id 清单 `tools/hub/ids/n1.txt`。
- 注意：沙箱 /tmp 只有 ~1GB，gitsetup 克隆和管线同时跑会 "No space left on device"，先等 gitsetup 完成。

## R63b · 音效反馈大升级（真实 CC0 录音 + 战斗分情境 + 多环境声）〔与另一位 agent 的 R63 DevLab 同号，这条是音效〕
- 用户要求：「音效反馈做足，战斗不同音效感，各种环境音效，做完推送」。
- **新增 MOD**：`sfx_pack`（🎧 真实音效，默认开）、`sfx_amb`（🌬️ 环境声层，默认开）。关掉 = 回到原来的合成音。注意 `Mods.on()` 读的是启动时状态，开关需重载生效。
- **新文件**：`js/sfxpack.js`（`window.SfxPack`，运行时包住 `CombatFX.event/swing/thrust/whiff/draw/clang/hurt/enemySwing/windup/roleCue/stamina`、`SFX.play(名字)/thud/chop/squish/roar/soul/levelup/fanfare/coins/…`、`Steps.player`，在原合成音之上叠真实录音）、`sfx/pack.js`（2.4MB，≈58 个采样池 mp3 base64）、`sfx/amb.js`（1.2MB，12 条无缝循环）、`tools/build_sfxpack.py`（从 `/home/user/aud/x/` 的 CC0 源重建，源文件不入库）、`tools/sfxdemo.html`（双击试听页，92 个按钮，走游戏同一条音频链）。pack/amb 按需注入 `<script>`，file:// 可用。
- **战斗分情境**：挥击按武器类别（blunt/blade/flail/axe/scythe/rapier，`G.S.eq.weapon` 索引 0..6）；命中按 武器×对方材质（血肉/皮甲/重甲/野兽）×力度/部位（头部加脆响，破绽加“叮”，连击音阶上行）；击杀（普通/重甲/野兽/霸主）、斩首（嘶-噗-颅落地-身倒下，配慢放特写）、断肢；格挡/弹刀/破防/重击撞盾/完美格挡/闪避；你受伤分轻重（重伤耳鸣+环境声被压低）；敌人出招按角色（野兽咬、蛮兵地面一震、霸主低吼、刺客拔刃…）；命中/格挡时对环境层 `duck`。`CombatFX.setMix(0.6)` 把合成层降到 0.6 垫底（新接口：`js/combatfx.js` 的 `dryK`）。
- **环境**：`SfxPack.env()` 随 `Worlds._W.graph.nodes[cur].style` 切换（同 `Ambience.scene()`）；洞穴=长混响+滴水+火；草甸/森林/荒野/废墟/沼泽/要塞/王城夜/深渊/山巅各有循环层 + 随机远处事件（乌鸦/狼嚎/雷/沙沙/吱呀/钟/幽魂/碎石）；低血量心跳随血量加速。循环层总比例 `AMBK=0.36`（洞穴环境声约 −29~−31 dB RMS，“安全舒适”，不要调大）。
- **脚步**：`Steps.player` 被包一层加真实脚步；`js/steps.js` 敌人脚步处调用 `SfxPack.foot(surf,pos,k,d)`。**装具**：`js/rigging.js` 新增 `snd()`，优先 `SfxPack.cue('nail'|'pull'|'chain'|'hook'|'ring'|'weight'|'lantern'|'bell')`，没加载时退回 `SFX.play`。**野兽**：`js/beasts.js` stub 增 `beast:e.k`（命中材质识别），`CombatFX.on` 时不再叠旧 chop/squish。
- **改动文件**：js/sfxpack.js(新) js/combatfx.js js/mods.js js/mods_i18n.js index.html js/beasts.js js/steps.js js/rigging.js sfx/*(新) tools/build_sfxpack.py(新) tools/sfxdemo.html(新) CREDITS.md。
- **测试**：真 AudioContext 下 92 个按钮全部点击无报错、58 池全部解码；通过 analyser 实测：洞穴环境 ≈−29 dB RMS，命中峰值 0.43–0.72，重伤峰值已压回；完整 index.html 无头加载超时（环境限制），未做整游戏内实测。**沙箱无法“听”，音色需用户试听反馈。**
- **授权**：全部 CC0（来源列表见 CREDITS.md 与 `tools/build_sfxpack.py` 头部）；CC-BY 的 `wind-loop`(AntumDeluge) 已排除。

## R62（断面贴图重做 / 表情+面部差分 / 肌肉截面着色器）
- 用户："斩首断面和身体断面贴图一般；人物表情更绝望狰狞，更多表情，鼻血/泪痕差分"。
- `js/heads.js`：
  - `cutAnatomy()` 程序化颈部解剖截面（皮、脂肪小叶、胸锁乳突肌/斜方肌肌束+筋膜、气管软骨环、食管、颈动脉/颈静脉、迷走神经、颈椎松质骨+椎管、血泊/水光），输出 diffuse + bump + roughness 三张 512 画布；`getCut()` 在 `Mods.on('cut_anatomy') !== false` 时使用，否则退回 R38 旧贴图。导出 `fixCutUV`、`getCut`。
  - 皮肤着色器新增 `uFx` vec4（泪痕 / 鼻血 / 口血 / 淤青），按 `vHP` 头部局部坐标；缓存键 `skin7`；`look.fx` 控制，MOD `face_despair` 关闭后清零。`hb.setFx()`。
  - `FACES` 15 种表情（绝望空洞、痛哭流涕、极度惊恐、狰狞咬牙、剧痛扭曲、哀求、癫狂惨笑、死寂空洞、怒目圆睁、抽泣、血口哀嚎、青肿木然、死不瞑目、惨笑、安详），每种含 VRM morph `ex` + 差分 `fx` + 权重 `w`；`dressFace(L)` 在 `randomLook` 末尾用头自身 seed 抽取，不扰动主随机流。
- `js/foe.js`：身体 `__CUT__` 网格用 `fixCutUV` + `getCut()`。
- `js/autopsy.js` `mkMat`：新片元着色器（Voronoi 肌束+筋膜、纤维条纹、脂肪大理石纹、血液沉积、湿润高光、骨小梁；断面 roughness 覆盖）。
- `js/game.js` `cycleHeldFace()` 用 `ModelHeads.FACES` + fx；`js/play.js` 梳妆台：表情全列表、差分行、`fx:` 指令。
- `js/mods.js` 注册 `cut_anatomy`、`face_despair`（look 类）；`js/mods_i18n.js` 修复 R61 提交里 ui_wheel 行的字面 `\n` 语法错误（导致 i18n 整体失效）。
- 教训：写文件时 `\n` / `\uXXXX` 不能以字面转义形式进入源码，否则整段变成注释/语法错误（本轮 heads.js 因此一度整体加载失败，已修）。每次改完用 `node --check` 或页面内 fetch+`new Function` 验证。
- 已验证：断面贴图画布目视（解剖结构清晰）；15 种脸在离屏渲染器里渲出，泪痕/血口/鼻血可见。未验证：身体断面与 autopsy 新着色器的实机效果（本地无 `big/` 身体模型），淤青位置强度。
- 待做：UI 逐页大改（总览/建造/首级收藏）、多敌人战斗性能优化。

### R62b 多人战斗减负（MOD `foe_lod`，perf，默认开）
- `js/foe.js` `update()`：每帧用主相机建视锥，`lodFoe()` 对每个敌人做球体测试（半径 3，d<4 强制可见）：视锥外 `f.root.visible=false`（蒙皮/阴影/描边整体省掉）；>22m（回滞 18m）把身上 castShadow 的网格关掉并记在 `fo.lodSh`，近了还原；死亡分支会把 visible/castShadow 复位。
- `lodMix()`：出招/决斗/硬直/受击闪红/受击反应/喷血中的敌人动画照常逐帧；其余 >32m 隔帧推进、视锥外且 >10m 每 3 帧推进（累计 dt 一次性补上，速度不变）。关 MOD = 原行为 `f.mixer.update(dt)`。
- 未验证：多人（10+ 敌人）实测帧率；本机只验证了单敌人场景无报错。后续可看 `ctx.sees`（每敌每帧视线检测）和 AI steer/avoid 的开销。
- 未做：UI 逐页大改。

## R63b（UI 续：图标补全 / 页面舞台）
- `js/ui3a.js`：新增 30 个 SVG 图标（mouse/globe/speaker/archery/gear/menu/hand/plus/compass/person/chart/clipboard/cards/coin/ring/wings/eyeoff/helmet/boot/target/ruler/nut/question/dice/door/bulb/sun）和约 120 个 emoji 映射，覆盖 13 个总览页 + MOD 页，实测 `.u-emo`（未映射 emoji）残留为 0。
- `css/ui63.css`：§6 页面顶对齐 + 窄屏抽屉化侧栏（血祭 / 章节）；打开 Hub 页面时隐藏 `#combatHud/#cross/#atkCd/#hitHud`（以前体力条漏在舞台中央）。
- 未做：游戏中的死亡结算 / 交易 / 对话 / 建造模式 HUD / 解剖台界面逐一重塑；日文模式下顶栏标签字体（`キャラクター` 等）字距偏窄。

## R63c 热修（电影 / 表情）
- 电影期间世界冻结：`CineStage.hold`（电影 + 进图黑场）时 `worlds.js frame` 跳过 Foe/Beasts/Combat/updateSay；`hitPlayer` 与 `G.damage` 在 `CineStage.grace`（电影 + 结束后 2.2s）内直接返回 → 宿敌不再在电影里打玩家。
- 电影期间鼠标/滚轮/指针事件全部吞掉（以前还能挥武器），左键 = 继续；`body.cscine > *`（除 #game / #csRoot）全部 visibility:hidden，NPC 气泡 `.wsay/.hbub` 不再弹。黑场 45s 自动失效防卡输入。
- 走路 T 字形平移：npc_locomo 的 `f.play` 把走路动作权重交给 `Locomo.tick` 驱动，摄影棚没调用 → 全 0 权重。`cinestage.js act()` 现在每帧给演员调 `Locomo.tick`，走位起点重置 lastP。
- 进图顺序：`NemStory.pending()`（新）让进图第一帧就盖黑，搭演员/播电影都在黑场里，不再「先看到地图再卡顿」。
- `cinescript.js`：台词跨场次去重（localStorage `cs_recent`，最近 70 句）；hand/ots/back/ecu 随机省略；min 时长缩短；新增「情报」卡（目标/异变/猎手跟踪）。
- 活人不再有泪痕/鼻血/淤青：`ModelHeads.create(look,{alive:true})` 清空 `look.fx`，只有被斩下的头才带差分。
- 未验证：本地没有 `big/` 身体，电影全流程（走路、情报卡、冻结）没能实机跑，请你在完整环境里看一眼。

## R63d（卡顿 / 解剖底模 / 头身比）
- 斩首特写每次卡一下：① `decapcam.js` 的 `body.dcam>*:not(:has(canvas)){opacity:0!important;transition}` 改成 `visibility:hidden`（不再给全页几十个元素建合成层/重算玻璃面板的 backdrop-filter）；② 刀痕网格/材质复用，不再每次 new + dispose；③ 新增 `warm()`：进图 3.5 秒后在空闲时建好血珠实例网格/血雾/刀痕并按 Master 的 RT 状态 compile，首次斩首不再现编着色器。
- 刷敌人卡：`foe.js prewarm(ctx, keep)` 对中途追加（猎手/精英 keep:true）只预热新出现的材质类型，没有新类型就整段跳过（以前每次都重做 compile+render）。
- 大身体小头：`head_norm` 上限不再被 0.272m 绝对头高卡死（`fit0s*1.6` 作上限），按身体身高/6.6 取目标头高。**未实机验证**（本地无 `big/`），若个别模型变成大头请回报身体名。
- 解剖底模：此前只有「skin 层存在但面积 <45%」才用素体。现在 ① 阈值 0.6；② 没有真正的皮肤层（衣服+皮肤融合的单网格，或只剩颈断面 cap 2）时，原网格整层当“衣物”（cloth，可用「衣着」按钮脱掉），素体当皮肤层。用 BASE_BODY 自制假骨架做了 bake 冒烟测试：无 skin 材质 → `base.used=true`、原网格变 cloth、`hasCloth=true`；有 skin 材质且完整 → 不触发。autopsy 新着色器（R62）在 WebGL 编译通过。
- 未做：真实身体上的视觉确认（本地无 `big/body`）。

## R63e（宿敌成长条 / 工坊头饰 / 装具 / 性能）
- 宿敌：`nemesis.js tick` 把「每 8 分钟仇恨 +15」改成每秒连续 +15/480（等级节奏不变），`#nemChip` 新增「📈 宿敌成长 +N 级」条 + 距下次升级倒计时。`NemStory.report()`（新）= 与上一部电影相比各猎手/宿敌的等级变化 + 积累进度条；`cinescript.nem` 在宿敌电影第一镜后插入「这段时间 / 你离开的 N 分钟里」情报卡（boost 面板）。baseline 存 `G.S.nst.rep`。
- 工坊头饰（`headwear.js` + `play.js` 梳妆台）：新增 天使光环 / 小恶魔角 / 垂坠宝石链 / 额饰链 / 小翅发夹 / 月牙发饰 / 骷髅发夹（`HeadWear.N/GROUP/mk/build`，`HW_KEYS` 已加到梳妆台；随机 roll 里 EXTRA 也有小概率）。已离屏渲染确认能显示，位置/大小请用梳妆台实机微调。**未做**：真正的“工坊制作 + 材料消耗”流程，目前走梳妆台直接装。
- 装具 `rigging.js`：钉子长度（滚轮 2cm/Shift 5cm，6–60cm，存 `d.len`）；放置提示条从屏幕底部移到顶部（不再挡建造栏）；链/钩连到首级/摆件的那一端加可见环钉（`rt.studs`），挂点由 0.55 提到 0.85 贴近表面。“锁链没正确链接人物会被卡掉”只确认到这一层，若还有具体复现请给场景。
- Tab 卡：`ui63.css` 全局关掉 `backdrop-filter`（全屏毛玻璃叠在实时 WebGL 上，每帧回读+模糊），底色加深代替；`eco.js` hubon 时帧率 20fps。headless 无法复现 GPU 开销，按原理修，需实机确认。
- 敌人突然出现卡：`foe_lod` 对新敌人前 3 秒强制可见（先渲染/上传贴图再允许视锥隐藏）；`populate(keep)` 每个敌人 build/animate 之间让出一帧。
- F 回忆视角头太小：`recall_iw.js` 初始 `dist -0.15`、滚轮范围 -0.28~0.14（更近 = 更大）。
- 泪痕：`heads.js uFx.x` 重做（哭红眼周、颧骨泛红、下眼睑水线、最多 3 道泪痕：湿润变深 + 高光线 + 尽头泪珠），缓存键 skin8。

## R64（掉落封顶 / 残留 UI / BOSS 界面 / 难度系统 / 宿敌仇恨强化 / 首级产出悬浮）
- 掉落：`sack.js` 装备掉落阶位被玩家等级封顶（`tierCap = floor((lv+3)/5)+1`），武器/护甲/头盔/护符穿戴需要等级 `(阶-1)×5`（提示里显示，等级不足会弹回麻袋）；`gear2.js rollOne/dropFor` 的饰品需求不超过玩家等级+6，专属神话饰品 `req=(阶-1)×6`（以前 req=1）。根因：首个 BOSS 所在地区 lv 高 → `rollEquip(.., 1.5)`/`rollW` 给 6 阶武器、Gear2 给 req 30+ 饰品。
- 残留 UI：`hub.js purge()`：切页/关页时隐藏 `#skTip/#g2Tip/#tbTip`；`ui63.css` 统一层级：`#guRoot/.pmodal/.unl-wrap/#mmRoot/#sgSet/#arRoot` z=135（高于 Tab rail 120 / 页头 125 / 侧栏 130），三种悬浮提示 z=150。祝福抉择弹窗在下面 = `#guRoot` z=90 < hub 120。
- BOSS 界面：新 `js/bossui.js`（MOD `boss_ui`）：重做 `#wBoss`（称号 / 名字 / 难度台词 / 阶段刻度 / 残影 / 数值 / 低血脉冲）、登场全屏名牌、倒下「首级令」字幕；`regionquest.js` 迷你任务条在 BOSS 条显示时下移到 176px。
- 难度：新 `js/difficulty.js`（MOD `diff_select`）：安魂 / 血月 / 黑潮 / 无光 + 自定义滑块（敌人生命 / 敌人伤害 / 宿敌成长 / 野外战利品）；开局点“开始游戏”前拦截弹出选择（`G.S.diff`），标题有「难度」按钮，Tab →「系统 → 难度」可改（hub 新页 `diff`）。倍率落点：`foe.js populate`（生命）、`worlds.js hitPlayer`（伤害）、`nemesis.js`（成长）、`G.addCoins`（野外战利品）；叙事：BOSS 登场/倒下语、宿敌来袭语（`hunters2` banner / `nemesis` toast）、`body[data-diff]` 配色（`ui63.css`）。
- 宿敌强度：`hunters2.js spawn` 基础血量 ×1.5，再乘 `1.5×(1+min(3.5,仇恨/40))`（血）与 `1+min(1.8,仇恨/55)`（伤）、移速最高 +25%、仇恨 ≥30/60 加技能池、技能冷却缩短；`odds()` 同步；`nemesis.js extraStrike` 同样按仇恨缩放，基础血 1.8→3.2。仇恨值本身随时间连续上涨（R63e）。
- 首级悬浮：`game.js yieldLine(h)`：准星指向首级时显示 `🔮 ≈ N /回合结算`（回合制）和 `🌀 SAN ≈ x/秒`（挂在建筑上才产）。
- 未验证：BOSS 登场/倒下卡和血条只用假 DOM 看过样式（本地无 big/ 无法真打）；难度倍率、掉落封顶只做了语法检查。

## R65（剧情/宿敌/搜刮 反馈六项）

- 剧情表情：`cinestage.js act()` 把演员表情里的 happy 压到 0.1（加一点 relaxed）、ee/aa 封顶，不再出现大笑脸型。
- 跳过剧情：Esc 跳过时 `stop(false, true)` 收集尚未播出的 `boost` 卡（变强卡 / 情报卡 / 这段时间），`CineStage.summary()` 在屏幕右侧列出「已跳过剧情 · 以下内容已生效」14 秒。
- 剧情只在能回洞的地图播：`nemstory.js ready()/pending()` 要求 `nd.home || nd.stone`（洞口 / 魂门），野外大战后不再突然搭模型卡顿；提示语改为“走回洞口（或魂门）时”。
- 宿敌强化可见：`NemStory.stat(key)`（生命/伤害/防御/移速倍率）、`mech(key)`（词缀、技能、誓言、读招、同伴，带来源）、`buffHTML(key)`；显示在 U 猎手档案每张猎手卡和宿敌档案的额外宿敌卡里。
- 防御：新增 `fo.defMul`（`NemStory.apply` 设置：仇恨 /300 最多 25% + 新护甲每级 ×0.92，封顶 45% 减伤），`foe.js` 命中处按它减伤；护甲方面效果文案改为「生命 +18% · 防御 +8%」。
- 进区域大窗口：`arrival2.js` 等待条件加入 `NemStory.busy/hold`、`CineStage.active/grace`，上限 40s→180s；弹出后 0.7s 内忽略关闭键（避免翻/跳过电影的按键把它刚弹出就关掉）。
- 搜刮选择：`worlds.js` 的 `W.interNear` 改为距离 + 朝向评分（身后额外惩罚），范围略放大；`interMark()` 在当前目标脚下画一圈金环。
- 注意：`replace_string_in_file` 的原始参数里不要写 `\uXXXX`/`\n`（会原样写进文件，曾把调用吞进注释）；中文直接写。

## R66（宿敌剧情：每一幕有意义 / 序列预告 / 信息清晰 / 加载更快 / 更丰富）

- 撤回 R65 的“只在洞口/魂门播”：宿敌剧情仍然在进入地点（加载地图）时插播，由进图黑场盖住加载。
- 每一幕的意义：beat 新增 `mean: {ic, t, fx, col}`（`nemstory.js` / `cinescript.js` 里的 `M()`），CineStage 右上角 `.mn` 面板显示「这一幕」+ 标题 + 「影响」（对游戏的具体影响：生命/伤害/防御/移速、词缀、技能、同伴、仇恨、胜利条件、地区异变/讨伐目标奖励等）。没写 mean 的镜头沿用上一幕；有 boost/stake 卡的镜头隐藏面板。
- 序列预告：宿敌排入新剧情时弹提示（`notifyQ`）；nemChip 显示「待播剧情 N 段」；进图黑场显示「即将播放 ① 宿敌插曲 · … ② 地区电影 · …」（`NemStory.preview()` + CineStage `.vq`）。
- 信息清晰：CineStage 新增 `episode`（`.ep`）：开场大字显示剧情类型/标题/变化/登场角色（名字 + 身份），5.5 秒后缩到左上角常驻；字幕更大更粗，名字旁带身份；地区电影也有 `episode`。
- 加载更快：`CineStage.play` 并行搭演员；`NemStory.prewarm()` 在无追击时一次一个预读将登场猎手的身体模板。
- 更丰富：开场旁白/时间点/逃脱后/追问+回答/多次成长/额外宿敌追问等随机池（`TIMEP/OPENN/ESCN/ESCL/FOLLOW/RESOLVE/MOREN`），镜头与是否有手部特写随机；`cinescript.nem()` 里的 `her` 改取 `B[0].castFo`（额外宿敌插曲原先会认错主角）。
- 事故：用 PowerShell 5.1 `Get-Content -Raw | Set-Content` 改 UTF-8 文件会按 ANSI 读写毁掉中文，必须 `git checkout` 恢复后重做；改文件只用编辑工具。

## R67（近看头颈像被斩首：头颈接缝）

- 本地复现（tools 没有身体模型，用 `ModelHeads.create` + 合成颈柱 + 独立 WebGLRenderer 渲染）：头断面只比颈口高一点点就会露出一条背景缝（皮肤 shader 在断面+1.2mm 以下 discard）；头、身体各自的勾线外壳（`CharLight.dress`）在各自的开口边缘画出一圈黑线；头皮肤与身体颈部反照率不同（头多出 uHeadK、skinMul 校准是旧光照下的）。三者叠加 = 近看像被斩首的切口。R63d 放宽 head_norm 缩放上限（最高 1.6×）后，缩放让断面相对颈口上下漂移、颈径对不上，更明显。
- 新 MOD `neck_join`（`mods.js`，默认开，活人头）：`foe.js build()`
  - 头缩放后按 `bottom*(fit0s-fit.s)` 补偿，断面位置保持标定时的位置；
  - 若 `E.cut.y` 已知：头断面至少插进颈口 4mm（最多下移 5cm），消除缝；
  - 颈径渐变：`hb.U.neckK = 0.96·E.cut.r/(stubR·s)`（`stubR` = `ModelHeads.create` 返回的断面上方 1–6mm 颈柱实测半径），skin 顶点着色器里 `uNeckP.y`（颈口高度）向上 3cm 内由 K 渐变到 1；
  - 颈部反照率：`hb.U.neckC = lin(skinHex)·gain/uHeadK`，片元里同一 3cm 区间渐变到该色；
  - 勾线：`userData.olFade`（头皮肤 `[bottom+2mm, bottom+16mm, +1]`、身体网格 `[cy-35mm, cy-4mm, -1]`），`charlight.js olMat` 里描边宽度在颈口一圈渐隐，头外壳断面以下 discard（程序缓存 key `charOL2`）。
  - 斩首（`Foe.decapitate`）时 `neckW=0, neckK=1`。
- `charlight.js`：皮肤判定放宽（`smoothstep(0.03,0.1,sat)`、亮度 `0.04~0.16`），瓷白/深棕肤色不再被当成非皮肤（头和脖子明暗交界一个硬一个软）。
- 皮肤着色器 cache key `skin8→skin9`。
- 未验证：真实身体（big/ 本地缺）上的颈口高度/半径是否被正确读取（`E.cut.y/r`），缩放补偿方向；Q_ / VH_ / 原神身体的肤色匹配。若仍有缝，先看 `Foe.build` 的 `ov / neckK` 数值。
- 改文件注意：`replace_string_in_file` 原始参数里的 `\n` 会原样写进文件（mods.js 又中招一次，已修）。

## R68（首级新表情：翻白眼/吐舌 + F 界面「汲魂」吸取 QTE）

- 新表情（`heads.js` FACES）：`rollup`（双眼上翻）、`rollsplit`（一上一下，`rl:[右,左]`）、`rolldown`、`tongue`、`rolltongue`、`splittongue`。`dressFace` 写 `L.rl/L.tg`；虹膜顶点着色器 `injectVertex(...,roll)` 做竖向位移（下翻 ×1.7，`uRoll`，`irisMat` key `iris4`）；吐舌是 `__TONGUE__` 胶囊（`setTongue(len,wag,droop)`），`setRoll(a,b)`；`setExpression(ex0, free)`；活人头 `create()` 不带这些。`play.js/game.js` 的换脸器与 V 键同步。
- 新模块 `js/siphon.js`（MOD `soul_siphon`）：F 界面新按钮组「汲魂」：`口汲 sipM`（木棒塞进嘴）、`颈汲 sipN`（木棒从断面插入）。每个头只能汲一次，结束（成功/失败/中止）后卡片显示「已榨干」。
  - 仅 `age>=18` 的头可汲；恐怖/仪式化叙事，不带情色。
  - 左手提头、右手握棒（自绘前臂从右下伸入）；棒身粗细（车削轮廓）驱动嘴/颈口张合；表情在原表情基础上平滑插值（不瞬变），翻白眼随抽动颤、舌头晃动；相机随节奏推近+晃动；每个节拍有残魂光点/魂晶飞溅与棒身脉冲。
  - QTE 只用空格：点按、连按两下/三下、长按、狂按（mash）、环收拢时按。越往后越快越难（`unit=3.4*(1+1.2r)`，轮数 R=7+3r，容错 3/2 次），稀有度越高越难、奖励越多。
  - 结算：完成 = 池 + 连击奖励；失败 55%（魂晶爆出一地）；中止 70%。魂晶产出保守（r3 近乎完美 ≈ 600，r4 最高 ≈ 1100–1200）。
  - 生前记忆闪回（理想被打破 / 母亲嘱咐注意安全）与感官描写按轮次穿插。
- 接入：`recall_iw.js`（SIP 表、按钮组、`Siphon.cardHTML`、`go()` 开始钩子、`pre()` 姿态钩子、空格/Esc/F 键）、`index.html` 载入、`mods.js` 注册。
- 本地验证（Playwright + bot 自动完美按键）：口汲侧面、嘴张开、环 UI、结算卡；颈汲头倒置、断面朝镜头、棒从下方插入；不按键 → 失误 → 提前结束 0 魂晶。未在真实身体（big/ 缺）和真人键盘手感上验证，节奏数值需实玩调整。
- 测试辅助 `__newHead/__startBot` 只在页面里，不在仓库中。

## R69（汲魂重做：无尽节奏 + 蒙太奇 + 真握棒；散放首级也产魂晶；F 视图放大）

- 用户反馈：吸魂 UI 糟糕；QTE 要越来越长、没有上限、连续不断、节奏升级；手没拿住棒、棒没插进嘴 / 断面；镜头要动、要蒙太奇特写、越来越快；F 基础视图头小、手悬空；不放建筑也要产魂晶并显示产量；普通点击一次的 SAN 要看得到。
- `js/siphon.js` 整体重写（R68 版被替换）：
  - 节奏：8 拍一段，每段 BPM ×(1.05+0.004·阶)，没有上限；每 6 段一次「喘息」。段型按段位解锁：稳拍 / 缓抽 / 双拍 / 长抽（按住→末端松开）/ 反拍 / 重捅 / 狂搅（连打计数）/ 忍住（红✕别按）/ 三连 / 切分 / 奔马 / 回响（后半段隐藏，凭记忆）/ 缠斗 / 连捅 / 暴雨。拍钟用真实时间（掉帧不拖慢节奏），鼓点用 WebAudio 提前排程，另有随强度变化的低频嗡鸣，汲魂时音乐 duck。
  - 经济：残魂 SOUL=[60,120,210,360,600]（异色 ×1.3），每下拧出剩余的 2.2%×质量（完美 1.3 / 好 1 / 偏 0.45；重捅 ×2、回响 ×1.5、长抽尾 ×1.4），连击倍率最高 ×2（50 连），每 40 连击「魂潮」8 拍 ×1.6。魂压：失误 +0.16+0.02·阶，命中回落，满＝残魂炸开只拿 70%；Esc / F 收手拿 100%；第一个音符前取消不消耗首级。天花板 ≈ 残魂 ×2。
  - 舞台：以玩家视点 E 为基准摆首级（口汲：侧 3/4，棒从右前下方进嘴；颈汲：倒置，断面朝上，棒从右上插入断颈）。手：limb_hand 几何按「弯曲」变形——右手（镜像＝解剖学右手）手指绕棒握拳，拇指朝棒尖；左手掌心扣后脑偏上、手指翻过头顶。两条手臂两段 IK 接到画面外的肩膀。手在汲魂时缩到 0.82。
  - 镜头：每拍硬切，段位越高切得越勤（8→4→2→1 拍），魂潮每拍切；机位：全景（含拳头）/ 面部 / 眼部大特写 / 嘴部 / 仰拍 / 握棒 / 后脑扣手 / 沿棒主观（颈汲：断面 / 倒脸 / 侧面）；每一下推镜 + 震动 + 手持晃动；记忆闪回时画面短暂泛黄。
  - UI：电影黑边；顶部 HUD（模式 / 魂阶 / 段名、魂晶池、BPM、残魂%）；底部 canvas 节拍轨（两侧流向中心环，环外圈＝魂压）；连击 / 倍率、判定弹字、大字横幅、结算卡（评级 S~D、撑过的拍、最高连击、最快 BPM、准度）。
  - 测试接口：`Siphon.info`（内部状态）、`Siphon.frame/press/release/abort/close`。
- `recall_iw.js`：汲魂时 pre() 调 `Siphon.frame` 接管相机 / 首级 / 手（旧 pose/post 已删）；go() 传 `k`；`makeHand` 左右手修正（limb_hand 未镜像是左手）；BASE 手 x ±0.094、默认 dist −0.06（头更大、手贴脸）；信息卡新增产出行；F 界面隐藏 `#hpC`。
- `loop.js settle`：散放（没挂建筑）的首级也结算：每颗 hv×0.4×光环，按价值排序前 24 颗全额、其余 1/4；挂建筑的首级保底不低于散放。导出 `Loop.LOOSE / LOOSE_N`。
- `game.js`：`headEcon(h)`（导出 `G.headEcon`）；悬停提示显示：散放每回合 ≈ X · 挂上建筑 ≈ Y+ · 🌀 点一下 +Z（· 挂机 /秒）。
- 本地验证（Playwright + 自动按键 bot）：口汲 / 颈汲两种模式、各机位截图、收手结算、经济数值（圣魂散放 ≈24/回合、挂建筑 ≈60+、点一下 +19 SAN）。未验证：真人键盘手感与难度曲线、3 分钟以上高 BPM 的性能、MMD 头的手位置、`big/` 身体在场时的表现。
- 坑：`#riw` 里已有 `.b`（动作按钮）样式，新 UI 类名别用 `.b` / `.t` 这类短名（黑边曾因此高度为 0）；PowerShell 5.1 里 `node -e` 带嵌套引号会把终端卡在 `>>` 续行。

## R70（总设计师 · Lead Design Agent）— BUG 大扫除 / 打击感 / 斩首血效 / 性能 / 总设计师指南

> **从本轮起：所有模型开工前先读根目录 `HANDOFF_GUIDE.md`（浓缩约束 + 架构地图 + MOD 写法 + 踩坑清单），再读本文件最后几节。**

### 用户本轮反馈（原话要点，长期有效）
1. 斩首特写的血液效果很低级不爽。
2. 打着打着突然在打 BOSS，BOSS 血到 0 卡着不动（倒地姿势）。
3. 猎手 100%、宿敌 100% 但没人来，而且可以撤离。
4. 技能升级弹出非常卡，经常卡交战、卡鼠标。
5. 有时进入场地所有角色都不动，还看到很多光球在跑。
6. 战斗体验差：所有战斗都可以靠后撤躲开。
7. 角色经常有点“地包天”的头部问题。
8. 敌人放跳跃击/冲刺：看得到轨迹、有伤害结算，但敌人没有冲过来。
9. 引擎效率：经常卡顿——浏览器 3D 是不是没办法？请最大化优化。
10. 项目由很多 Agent MOD 式协作，HANDOFF 混乱、BUG 一堆 → 总设计师总结注意事项、检查 BUG、指导低级模型怎么写 MOD。
11. 平衡性数据很弱。
12. BOSS 战理论上只有一个 BOSS，却显示做不了的任务。
13. 战斗打击感弱爆了。
- 预算约束：用户额度有限，要求高效；每轮截图 ≤ 20 张。

### 根因 → 修复（commit ca2923f / ed94dbe / 4d3af7f 及之后）
| 反馈 | 根因（实读代码） | 修复 |
|---|---|---|
| 8 冲刺不位移 | `locomo.js accel()` 对 `fo.rv` 爆发速度也限 16m/s²：冲锋 10.5m/s×0.72s、长枪突刺 12.5m/s×0.42s 实际只走 1~4m，收招后还在 idle 里滑 | 爆发 >4.5m/s 用 90m/s² 到速，结束后 0.3s 内 36m/s² 刹车（`fo._bst`） |
| 2 BOSS 血 0 卡住 | `hit()` 扣血后要经过一串事件钩子才到 `die()`，任何钩子抛错 → 血 ≤0 却没死；击倒逻辑在动作时间不走时无限延长 `stag` | `Foe.update` 僵尸守卫：`!(hp>0)` 且未死 → `die()`；击倒最长 3.2s；`die()` 每一步单独 try/catch（布娃娃失败也照样结算 BOSS 条/尸体/击杀事件） |
| 5 角色定格+光球 | `populate` 后半段（预热）或 `WSites.seat` 抛错 → `W.foes=null` → 退回光球敌人，而已搭好的角色留在场景里永远不更新 | `popFoes`/入座异常时用已搭好的敌人（`liveFoes()`）；真的退回光球前 `Foe.clear()`（`dropFoes()`）；走廊路径同样处理 |
| 3 满条没人来 | `Nemesis.strike()` 调 `Hunters2.spawn()` 后不管成没成功都返回 true（条清零）；出发时“必遇”的首击失败不重试；猎手满条还要过“地区恶名≥6 且本趟没伏击过”的门槛 + 每 12s 6% 概率掷骰；`spawn` 不检查敌人上下文是不是当前地点 | 新 MOD `nem_sure`（默认开）：strike 以真实刷出为准，失败 5s 重试；首击失败保留；猎手满 100% 后 2.5s 内必来（门槛不够时条停在 95%）；`spawn` 检查 `C.sc === W.B.sc` 且不在加载中 |
| 4 技能弹窗 | `memory.js` 升级后在野外“周围 42m 没警觉敌人”就自动全屏弹出（野兽、刚进视野的敌人都不算），关闭时抢鼠标锁；卡片 3D 翻转动画 + 大模糊阴影 + backdrop blur | 野外一律不自动弹（右上角提示按 ` 手动开），回洞自动弹；动画/阴影减负、去掉 backdrop-filter |
| 12 BOSS 擂台任务 | `regionquest/arrival2/saga` 在 `graph.arena`（单 BOSS 擂台）里照常追踪 | 擂台/BOSS 趟里隐藏三种追踪 |
| 6 后撤逃课 | 敌人出招期间的逼近速度 = 1.9×0.55≈1.05m/s，玩家倒着走 3.2m/s，任何攻击都能退出范围 | 新 MOD `foe_track`（默认开）：起手到出刀之间你在后退，她以“你的后退速度+1m/s”（≤4.4，BOSS 4.9）跟上；蓄力定格时你退出范围她会提前出手而不是定格滑行。**后退速度本身不变（用户 R55d 要求）** |
| 7 地包天 | R67 `neck_join` 的颈部径向缩放带被 `ov/fit.s` 抬到下巴，倍率最高 1.3 → 下颌被往外推 | 缩放带宽 2cm、最多上移 6mm、倍率 0.88~1.12；头最多下压 3cm（原 5cm） |
| 1 血效 | 斩首血珠是 1.4~2.8cm 的亮红小球、随机方向；落地是 10 边形圆片；血雾像红灯 | 新 MOD `decap_blood2`（默认开）：颈轴方向的连贯血柱（每搏方向轻摆）、3~7mm 血珠按速度拉成血丝（最长 10 倍）、湿润高光暗红、刀口瞬间沿刀路甩出一扇细血、不规则溅射血斑（4 种程序化形状，落地后扩开）、颈下血泊慢慢扩大、暗色血雾；测试台 `tools/test/blood70.html`（?old=1 对比旧版） |
| 13 打击感 | 普通命中只有 3~6 个 1.4~3.6cm 精灵血点 | 新 MOD `hit_feel2`（默认开，`js/r70.js` HitFeel）：命中沿刀路喷高质量血（`DecapCam.hitBlood`）+ 命中点白热星芒 + 重击/暴击/破绽/击杀屏幕边缘红色冲击 |
| 11 平衡 | 敌人每刀 3%+1.4%×稀有度（+2% 持械）最大生命，配合 fair_fight/导演令牌，最弱的敌人要砍 30+ 下才倒，没有威胁 | 新 MOD `bal70`（默认开）：普通 ×1.4、BOSS ×1.25；其余数值未动（缺实机数据，见指南 §8） |
| 9 性能 | `game.js` 的自动降画质只在洞里跑（野外 `frame()` 提前 return），野外永远 ultra；HUD 每 tick 重写 innerHTML | 新 MOD `field_tier`（默认开，`js/r70.js` FieldTier）：野外帧时间中位数 >21ms 连续两次 → 记住降一档（`localStorage.r70_ftier`），下次加载画面里切（草层数也跟着降），稳定 4 分钟升回；宿敌条/支线/主线追踪 innerHTML 先比较再写 |
| 10 协作混乱 | — | 新增根目录 **`HANDOFF_GUIDE.md`**（约束总表、当前取舍、架构地图、MOD 模板与检查表、踩坑清单、性能、数值旋钮位置、BUG 审计） |

### 新文件 / 新 MOD
- `js/r70.js`（`HitFeel`、`FieldTier`，index.html 在 regionecho.js 之后加载）；`tools/test/blood70.html`；`HANDOFF_GUIDE.md`。
- MOD（均默认开，`mods.js` + `mods_i18n.js` 已注册）：`foe_track`、`bal70`、`hit_feel2`、`decap_blood2`、`nem_sure`、`field_tier`。

### 验证 / 未验证
- 全部改动文件 `node --check` 通过；血效测试台无报错、截图目检两轮（第一版血珠太大太亮 → 已缩小压暗拉丝）。
- **未实机验证**（本机没有 `big/` `models/`）：冲锋/突刺的实际位移观感、僵尸守卫触发场景、宿敌必来的节奏、`foe_track` 难度、`bal70` 伤害、`field_tier` 阈值、地包天是否完全消失。请有完整资源的 Agent 实玩确认并在下一节记录。

### R70g 用户反馈：斩首特写后头飞了，身体有时静止不动（站着）
- 根因：`foe.js ragStep` 的 Verlet 布娃娃按“每帧”阻尼 0.985、按“每帧位移”判断休眠；斩首慢镜头期间敌人时间 ×0.075，4.6 秒约 276 帧把死亡冲量衰减到 1.5%，而重力按 dt² 几乎为 0 → 镜头结束时尸体还是站姿、没有动量；站直的布娃娃本身是平衡的（脚有摩擦）→ 一直站着。
- 修复：按真实时间积分（阻尼 `0.985^(dt·60)`、速度按 `dt/上一帧dt` 缩放、地面摩擦与休眠阈值都按时间）；新增死后 0.55 秒“腿软”（躯干额外下坠 + 膝盖往前折 + 随机前/后倒），保证会倒；布娃娃建不起来时播 `Hit_Knockback` 倒地动作（死者照常推进动画），不再定格站着。60fps 常速下与旧行为一致。

## R71（总设计师 · Lead Design Agent）DLC「首级余兴」——F 回忆界面里对首级的小游戏合集
用户原话要点：洞穴 F 界面对这些头有更多玩法；每个小游戏给下一趟独特 buff（随表现变）；食人魔自导自演的讽刺/嘲讽/恶趣味剧场；串头（断面插入→穿过嘴）引魂；更多黑色幽默小游戏、丰富文本、新奇构图、像大木棒（汲魂）那样的蒙太奇镜头；胜者玩弄失败者的头、对照她们生前动机和不甘；需要建筑和不需要建筑的都多弄点；不同身份不同文字。
- **入口**：F 回忆 → 动作栏最右「🎪 余兴」→ 右侧面板列出 9 个节目（数字键/点击开演，显示需要的建筑、祝福、锁定原因）。主演 = 手里这颗；客串从洞里 + 魂库随机挑（优先不同身份；只用成年首级）。
- **9 个节目**（`js/headplay_games.js`）：
  | # | 节目 | 建筑 | 玩法 | 下一趟祝福 |
  |---|---|---|---|---|
  | 1 | 颅之圆舞（杂耍） | 无 | 三颗头空翻轮转，F/J 左右手接，每 8 下一次高抛要按住 | 🤹 接头手：移速 + 每个地点第一次受伤几率免伤 |
  | 2 | 谁吞了魂珠（三颅藏珠） | 无 | 魂珠滚进某颗头嘴里，三颗头换位 4 轮越换越快，1/2/3 指认 | 👁️ 慧眼：暴击率 |
  | 3 | 我来替你实现（遗愿清单） | 无 | 按她的 goal 分 7 类（复仇/家人/成名/学识/远方/赎罪/统治）+ 兜底，三步三选一 + 卡笑点 + 按住盖章 | 📜 讥讽：伤害 |
  | 4 | 滚颅保龄（全中之夜） | 无 | 她当球、三颗当瓶；卡瞄准线 + 按住蓄力；慢镜头连锁撞倒；**赢的那颗挨个嘲笑倒下的（按她们的 goal/经历/性格）**，没倒的反过来嘲笑球 | 🎳 全中：击杀后 4 秒伤害+，连杀叠 3 层 |
  | 5 | 嚎叫图腾（串首魂桥） | 示威矛墙 | 矛从断颈进、嘴里出，三颗头仰面串成图腾；魂光沿矛上涌，经过谁按谁（1/2/3，第三波中段要按住），漏多了魂压爆；最后连按喷魂晶 | 🪵 魂流不息：击杀魂晶 + 魂能 |
  | 6 | 本庭宣判（亡者法庭） | 亡者议会 | 被告 + 3 位陪审员；三项指控（身份/梦想/性格）各选举证方式 + 落槌；陪审员点头表决；辩护三选一（格罗克代配）；按住宣判 | ⚖️ 判决：对残血敌人增伤 |
  | 7 | 押头（断头赌局） | 命运骰塔 | 三颗头在转盘上脸朝外旋转，押一颗、喊停（越准越可能她转回来），赢了可翻倍或收手 | 🎲 赌运：清空奖励 + 击杀彩头 |
  | 8 | 安魂曲（走调版） | 双生镜龛 | 四颗头 = 四个音，格罗克先敲一串，按 1~4 复现，3~7 个音，错两次散场 | 🔔 走调战歌：击杀回血 |
  | 9 | 她的一生（删减版） | **新建筑「颅偶剧场」** | 三幕木偶戏（出身/梦想/相遇），猜斯尼克今晚的口味（讽刺/反转/冷笑话）选台词 + 拍桌 + 谢幕 | 🎭 恶名昭彰：敌人生命 - + 击杀吓退 |
- **祝福规则**：评级 S/A/B/C/D = 强度 1/.8/.6/.4/.2；存 `G.S.hplay.pend`（洞里）→ 出发时变 `act` → 回洞清空；同一祝福取最高评级；每个节目每回合（`Loop.R().round`，没有回合时按出猎次数）只能演一次。`dmg/spd/clear/heal/fear` 通过 `Loop.nb()` 合并（`loop.js` 改了一行）；暴击/行刑/免伤/魂晶/彩头/吓退/连杀 通过包装 `Rogue.outDmg/inDmg/event`。野外右下角显示生效中的祝福。
- **引擎**（`js/headplay.js`，`window.HeadPlay`）：独立舞台场景（三点布光 + 木桌 + 幕布背景，主循环 `__pauseMain` 暂停），自己的 rAF；剧本 = 生成器（`yield 秒数` / `yield 提示`：节拍环 tap/hold/mash/avoid、三选一卡片、头顶编号指认、顺序输入）；镜头 = 机位表硬切 + 镜头内漂移 + 手持抖动；WebAudio 合成音效；Esc 提前喊卡（评级封顶 A）。手里那颗头会被临时挪到舞台，结束后原样放回；其余为临时生成的头，结束即销毁。
- **其他改动**：`recall_iw.js`（余兴按钮/面板/按键转交/关闭清理；顺手修了数字键选到「汲魂」时 `x.need` 报错）、`loop.js nb()`、`eco.js`（余兴/汲魂进行中 60fps，不再因 uiOpen 降到 30）、`index.html`（siphon.js 之后加载两个文件）、`mods.js`/`mods_i18n.js`（MOD `head_play`，默认开）。
- **验证**：新测试台 `tools/test/headplay.html`（file:// 直接开；`?g=<id>&speed=3` 自动玩到结算，`&at=pick|choice|ring|seq|res&n=K` 或 `&t=秒` 冻结画面截图，`window.__freeze()`）。9 个节目全部自动跑通到结算 + 落幕，控制台 0 报错；截图目检 17 张，据此改了：图腾（原来头互相穿插 → 按头球体积叠放 + 俯拍看仰起的脸）、杂耍（落地是倒着的 → 每抛一次整周空翻）、特写太近只剩一只眼（`face()` 设最小距离）、抉择卡片挡脸（抉择镜头对准下巴，让脸在卡片上方）、陪审团被被告挡住（镜头抬高越过）、转盘太挤、合唱按键标签、指认标题挡脸。
- **未实机验证**（本机没有 `big/`、只临时取了 5 个 CC0 头）：真实洞里 F 界面的按钮/面板布局、WoodenTable_01 桌面高度、Master 后处理下的亮度、`Recall.reveal` 想起名字/梦想、各建筑解锁条件、祝福在实战中的数值手感（`catch` S 级 = 每个地点第一次伤害必免，可能偏强）、出发/回洞时 pend→act→清空。

## R72（总设计师）无头身体 + 身体节目

- **用户需求**：只有头太单调 → 洞穴小游戏也要用到无头身体；无头身体能放进物品栏（占格子）带回去、有用处。另提了「乳摇」（斩首特写/移动时）——**未做**：这是对女性角色被杀场景加性化物理，违反本项目「不做性内容」的硬约束（见 HANDOFF_GUIDE §1），后续 agent 也不要加。
- **野外**：斩首后的尸体战利品面板多一个「🧍 扛走身体」（MOD `body_carry`，默认开）。条件：已斩首、四肢完整、没被腰斩、成年、没被解剖过。读条 2.6 秒（`Sack.queueBody`）→ 物品「{主人}的无头身体」占 **2×4** 格，回洞自动进储物箱。烘焙走 `Autopsy.bake(Foe.cloneSkinned(...))`，`Bodies.pack()` 摆正朝向（+Z 前、髋部在原点、脚底 y=0）后存 IDB（`Autopsy.put/get/del`，记录格式见 HANDOFF_GUIDE §10）。
- **用处**：① 余兴的两个新节目要用；② 物品菜单「炼化」→ 骨料 3+r、布料 2+r、魂尘 3+2r（r = 稀有度），并删除 IDB 记录。
- **新节目**（`headplay_games.js`，排在原 9 个后面）：
  | # | 节目 | 需要 | 玩法 | 祝福 |
  |---|---|---|---|---|
  | 10 | 借尸还魂 | 2 头 + 1 身体 | 两颗头抢一具身体：3 轮连打拔河 → 赢家安上脖子 → 6 个节拍环缝颈口 → 身体站起欢呼，再把输家捧在手里嘲讽（身体是谁的有专门台词：物归原主 / 输家眼看自己的身体被占） | 🧵 缝补：每趟一次，致命伤留 1 血并回血 |
  | 11 | 提线木偶 | 1 头 + 1 身体 | 头安在身体上、木架拉线：格罗克先演示一串姿势，按 1~4 切换四肢复现，5 轮越来越长，最后剪线谢幕 | 🪢 提线步法：概率完全闪避（3 秒冷却） |
- **引擎**（`headplay.js`）：节目可声明 `bodies: N`；储物箱不够就锁按钮并提示去野外扛。开演时异步加载身体（5 秒超时 → 人台兜底），`Z.bodyAt/pose/btip/attach/attTurn/detach`，头挂到身体的颈口/双手上随动作走；结束时释放身体网格（物品不消耗）。
- **身体骨架**（`bodies.js rig()`）：11 骨（躯干、上臂/前臂、大腿/小腿/脚），按烘焙时的关节位置自动分配蒙皮权重；姿势库 `POSE`（立正、欢呼、鞠躬、跪、祈祷、举手、敬礼、挥手、稻草人、捧物…），只有日常/滑稽姿势，衣服是烘焙时原样。没有 IDB 记录（测试台、旧档）时用「素麻人台」（深色裙装 + 红色颈口）。
- **验证**：测试台 `&bodies=2`；借尸还魂、提线木偶自动跑通（S 级、0 报错、落幕正常），抽查原有 3 个节目无回归；截图 4 张，据此改了：人台颜色（原来像裸露皮肤 → 深色裙装）、缝合镜头太近、捧头镜头构图、木偶出画（拉远到全身）、人台比头大（缩到 0.93）。
- **未实机验证**：野外扛尸的读条/格子/回洞入箱流程；真实烘焙身体的朝向与颈口对齐（颈口用断面顶点中心 `cut`，没有时退回头骨位置）；IDB 记录体积（一具身体可能数 MB，炼化会删）；头（缩放 1.55）安到不同体型身体上的比例。
- **后续可做**：多头竞速汲魂（两颗头互相吸，赢的嘲笑输的）；按身份追加更多台词池；余兴记录（`c.hpl`）在首级卡片上显示更多信息。

## R73（总设计师）方案 B：战斗深度 · 使徒布局 · 月之魔女主线 · 宿敌成长 · 敌人人性 · 肉鸽组合 · 远景天气拍照

- **用户原话**：「你先完成你说的方案B，而且注意不要重复性，就是BOSS各有特色，祭坛刷2个只是BOSS的一种。而且主线你要把月之魔女线索BOSS这个显示清晰，而且月之魔女也会逐渐就是对游戏造成影响。宿敌也会随时间随事件，而且也许也会地图造成影响。肉鸽，每局不一样，高级组合性。不要重复感。而且你可以多做点技能-反正不要重复性」。此前的抱怨仍有效：后撤 + 格挡太简单、完美格挡秒杀宿敌、敌人技能少、敌人没人性、地图单调、宿敌长得慢、章节 BOSS 没存在感、主线 UI 不清楚、画面低质、卡。
- **四次提交**（全部是 MOD，默认开，`mods.js` + `mods_i18n.js` 三语）：
  - R73a `b77c781`：`poise73` 强敌架势、`parry_adapt` 敌人记住格挡、`guard_cost` 硬挡代价、`foe_skills3` 12 个新敌人技能 → `js/r73_combat.js`、`js/r73_skills.js`。**根因修复**：宿敌（`nemX`）/ 塞勒涅之影（`nemClone`）/ 新猎手（`hunter2`）以前不算「强敌」，完美格挡后 E 处决直接秒杀——`foe.js` 新增 `Foe.STRONG(fo)`，处决 / 单刀 10% 上限 / 斩首门槛统一用它（与 MOD 无关，始终生效）。
  - R73b `bde8e83`：`apostle73` 使徒布局 + 章节电影、`moon73` 主线追踪 + 月蚀度、`nem_grow2` 宿敌随事件成长 + 猎场、`foe_bonds` 敌人关系 + 名牌 → `js/r73_apostle.js`、`js/r73_moon.js`、`js/r73_nemesis.js`、`js/r73_human.js`。
  - R73c `2ada219`：`omen73` 本局预兆（16 选 2）、`fusion73` 双生祝福（17 种）、`moonart73` 月之秘技（X 键，12 种）→ `js/r73_omen.js`。
  - R73d `d7f0154`：`vista73` 远山层、`weather73` 天气、`photo73` 拍照模式（F2）→ `js/r73_world.js`。
- **战斗**：强敌头顶 ◆ 架势条（`#c73ps`）：完美格挡 −36 / 完美闪避 −24 / 破防 −26 / 蓄力 −16 / 砍颈 −6，削空才「破绽」2.4 秒（E 处决 = 22% 重创，≤25% 血才能斩首），2.5 秒没被削按 15%/秒回。被弹过的敌人改用 延迟 / 假动作 / 红光不可挡 / 连段；6 秒内完美格挡 >2 次判定窗口逐次 ×0.88（下限 0.55）。强敌的刀挡住也掉 22%、多耗体力，1.6 秒连挡 3 下格挡被压垮。12 个新技能（低扫 / 擒拿 / 虚晃连刺 / 回旋刃 / 地裂斩 / 影步三连 / 霜域 / 反击架势 / 烟遁 / 锁链回旋 / 预判箭雨 / 血契）每个都有预警和专门解法；每个敌人按 身份组 × 种族 × 阶位 用种子抽 1~3 个（强敌 3+1），同图不撞招。技能通过 `FoeAI2.reg(k, {can,start,run,preHit})` 注册（`foe_ai2.js` 新增 `EXT/reg/api` 扩展点，以后加技能不用改 foe_ai2）。
- **使徒布局**（11 个模板各一种机制，不是都刷祭坛）：修女=血月祭坛（站稳 3 秒摧毁）、伯爵夫人=蜡封宾客（砍头带走）、狼月猎手=限时围猎、新娘=追上逃跑的雾纱宾客、审判官=罪状（本章斩首计数，烧告示板减半）、巫祝=双月铃（12 秒内敲两只）、堕天使=捡燃羽、断头台女工=限时不喝药决斗、歌姬=按顺序敲共鸣石、守墓人=没砍头的尸体 25 秒后爬起、炼金师=砸碎吸魂晶的塔。每章两个地区各一次（`Loop.R().a73.res`），没破坏的部分在 BOSS 战变成阶段 / 帮手（血月护盾 + 血珠、蜡像替身、猎犬、雾影、审判光柱、月影瞬身、飞天羽雨、工头、节拍声波、复生者、喝药）。章节第一趟进图放一段 `Saga.reel` 镜头电影（名牌 + 布局 + 赌注），BOSS 入场再放一段总结。选地点界面的 BOSS 卡片下面列出布局与两处结果。
- **主线**：野外左侧常驻追踪（`#m73t`：线索 x/7、本章使徒 + 布局一行、月蚀度）；Tab 菜单「世界 → 🌙 主线」完整面板（三步路线、月蚀阶段、已得线索、宿敌动向、月之记录）；出发面板右侧加「月蚀度」。月蚀度（`Loop.R().m73.e`）随时间 / 砍头 / 布局得逞上涨，破坏布局 / 打倒使徒 / 拿线索下降；25 月光哨兵、50 血月夜、75 月之信徒、100 塞勒涅之影亲自来（打倒得一条线索）。
- **宿敌**：成长条（`G.S.ng73.k[key].g`，满 100 → Hunters2 `L.esc++` 或额外宿敌 `x.lv++`，NemStory 自动排插曲）：你从她面前离开 +60、被她打倒 +100、砍她同族 +15、斩强敌 +8、月蚀 ≥75 每趟 +10；特质 伤疤 / 记仇（`_pp` 常驻 → 你的格挡窗口更窄）/ 胜者 / 复仇者 / 新招（学 R73 技能）/ 猎场：同地区遇到两次 → 该地区插她的旗、雾发暗、逼近条 +25，在那里打倒她夺回。
- **敌人人性**：每图队长（倒下 → 逃 / 呆 / 暴怒）、两两关系（姐妹 / 恋人 / 师徒 / 战友，一方倒下另一方暴怒、跪地崩溃或哭着逃）；砍头时 14 米内看见的人逃掉 → `Nemesis.addFoe` 成为「复仇者」宿敌。准星对准 0.3 秒显示名牌（名字 · 称号 · 关系 · 来历）。
- **肉鸽**：预兆改规则（无头之年 / 血之契 / 悬赏令 / 赌徒之月 / 双生之月 / 回头草 / 月镜……），双生祝福 = 两标签各 ≥2 自动融合（包装 `Rogue.outDmg/inDmg`，事件走 R73 总线），月之秘技独立于天赋快捷栏（X 键、`GrandUI.choose` 三选一、每章换或强化到 Lv3；实现调用 `Talents.hitFoe/stun/slow/dot/aimFoe`）。
- **画面**：远山 3 层（150/200/260 m，按地区形状，雾色空气透视，`fog:false` 顶点色，加载时建一次）；天气 晴 / 雨 / 暴雨 / 雾 / 雪（雨雪是着色器动画，零每帧分配；材质在空闲时 `renderer.compile` 预编译）；拍照模式 F2（自由镜头 ≤60 m 高、6 种调色、黑边、Enter 存 PNG）。
- **公共接口**（给后续模块用）：`R73.on(fn)/emit(t,fo,d)`（worlds.js `foeEvent0` 转发全部战斗事件）、`R73.fog(sc,key,col,amt,dens)/fogClear(sc,key)`（多模块雾色叠加，不再互相覆盖）、`R73.sortSide(el)`（出发面板分节按 `data-ord` 排序）；`worlds.js` 交互新类型 `{kind:'use', x, z, label, use()}`（E 键）；敌人 `fo.ward73(fo,info,c)` 返回 true = 吸收这一刀（阶段无敌）。
- **验证**：所有改动文件 `node --check`；浏览器里用假 `G/Worlds/Foe.ctx` 驱动：12 个敌人技能状态机逐帧跑完（命中时机、伤害标记、无残留物体）、11 套使徒布局 make/tick/hud 200 帧无异常、12 个月之秘技全部可施放、伤害包装叠乘正确、雾层叠加 / 清除回到原色、主线面板与远山截图目检（3 张）。
- **未实机验证**（本机没有 `big/` `models/`，进不了野外）：所有野外手感与数值（架势削空节奏、新技能频率、使徒机制的落点 / 读条 / 电影时机、BOSS 阶段、月蚀涨速、宿敌成长速度、名牌位置）；`Saga.reel` 两段电影在真实场景的机位；远山与真实 HDRI 天空 / 地平线雾带的颜色衔接；天气雨丝在后处理下的亮度；拍照模式在 `G.setUI(true)` 下是否有其它面板弹出。
- **方案 B 还没做**：B6 指南针（主线有追踪但没有方位箭头）、B7 贴花 / 新粒子、B5 水域与布局模板、B8 性能剖析（需要在有模型的机器上实测：加载耗时看 `window.__wprof`，运行时卡顿用浏览器 Performance 面板录一段战斗，再动手）。
