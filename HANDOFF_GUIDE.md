# 总设计师指南（HANDOFF_GUIDE）— 所有模型开工前必读（R70 起）

> 这是 `HANDOFF.md`（4600+ 行、按轮次堆叠、互相覆盖）的**浓缩版 + 规则手册**。
> 读法：**先读本文件**，再读 `HANDOFF.md` 的**最后 3~5 节**（最近几轮的用户反馈与改动）。旧轮次只在需要时按关键字查。
> 本文件可以**修订**（保持它短、准、最新）；`HANDOFF.md` 仍然**只追加、不覆盖、不删除**。
> 冲突时的优先级：用户最新一轮原话 > 本文件 > HANDOFF.md 旧轮次。

---

## 1. 用户硬约束（违反 = 返工）

| # | 约束 | 说明 |
|---|---|---|
| 1 | **token 不进仓库** | 用户在对话里给 GitHub token。只用于 clone/push，绝不写进任何文件、提交信息、日志。push 后提醒用户可以撤销 token。 |
| 2 | **阶段性频繁 commit + push** | 用户用的网站会 BUG 回退。每完成一个可玩的小步就推送，不要攒到最后。push 前 `git pull --rebase`，**禁止 force-push**。 |
| 3 | **随时双击可玩** | 根目录 `index.html` 必须 `file://` 双击就能开始游戏：classic `<script>`、资源是 base64 的 `.js`（`window.X = ...`），**不用 CDN / fetch / ES module**（file:// 下会被 CORS 拦）。three.js 固定用 `lib/three.min.js`（r149 classic，**不要换版本**，它打过补丁，见 R54n）。 |
| 4 | **HANDOFF.md 只追加** | 每轮结束在末尾追加一节：用户原话要点 → 做了什么（MOD id / 文件 / 钩子）→ 没验证的点。 |
| 5 | **改动做成可开关 MOD** | 新功能/改手感/改数值都做成 MOD（见 §4）。纯 BUG 修复可以直接改，但要在 HANDOFF 写清楚。 |
| 6 | **截图预算** | 每一轮最多生成/查看 **20 张**图片（截图）做检查，超过会中断。优先用数值/日志验证，截图只看关键画面。 |
| 7 | **不自制模型/身体/贴图** | 角色、建筑、道具的几何与贴图用网上资产（Poly Haven CC0、VRoid Hub 允许改造再分发、KayKit/Quaternius CC0 等，署名写 `CREDITS.md`）。允许程序化的是：布局/世界生成、粒子/特效、着色器效果、UI。 |
| 8 | **角色身体** | 只要 **VRoid 女性身体**（R41i：男性身体全部删掉）；VRM 原身体不许裁掉丢弃；头身比要对（不要大头娃娃/小头怪）。 |
| 9 | **内容边界** | 18+ 黑暗奇幻斩首/解剖题材，但：**不做性化内容、不裸体（解剖台有底衬/绷带）、不做生殖/性相关器官、不做幼态角色**；文本不写虐待/求饶/色情；神灵/小精灵要可爱（Q 版）。 |
| 10 | **性能** | 用户经常卡顿、显卡吵。任何新东西都不能在每帧分配大量对象、改 DOM、建材质、编着色器（见 §6）。 |
| 11 | **UI** | 用户要“3A 大师级”UI；但**战斗中不要弹全屏面板、不要弹黑框字卡**（R55d / R70），弹窗不能抢鼠标锁。 |

旧约束「工作区 < 128MB / 游戏 < 60MB」是早期云沙箱的限制，现在仓库已有 ~1.6GB 资源（`big/` `models/`）。在用户 Windows 本机工作时：**用部分克隆 + 稀疏检出**只拉代码（见 §7），不要动、不要重新提交大资源。

## 2. 用户当前的取舍（最新有效，别回滚）

- 战斗：方向斩击 + `hold_strike` 蓄势出刀（开）；`foe_duel`/`duel_all` 程序化举刀（关，用户嫌难看）；`fair_fight`（开，约 1 秒反应时间）；`foe_brain` 总导演（开）；`stam_chain` 连斩越打越累（开）；**R70 `foe_track`**：后撤不能躲掉所有攻击（开）。
- 后退速度：战斗中倒着走 88%（R55d：用户嫌 55% 太慢）——**不要再把后退压慢**，用“敌人追身”解决后撤逃课。
- 地图：每趟随机生成（`region_persist`/`region_big` 关）；不要走廊（`corridor` 关）；铁门/传送门，`nat_gates` 关。
- 画面：渲染 `r_classic` + 人物风格 `cs_paint`；`lens_flare` 关（光环刺眼）；`whispers` 黑框字卡关；不要刺眼光环（`soft_glow` 开）。
- 剧情：月之巫女主线 + 宿敌插曲（`nem_story` / `cine_stage`），电影 Esc=跳过、Space/E/点击=下一幕。
- 经济：资源有上限、按“轮”结算（R54i 用户洞察：无限刷=没价值）。魂晶=永久，SAN=临时（R60）。
- 技能：升级只能“回忆”三选一（`skill_pick`）；**R70：野外不自动弹，回洞再弹**，野外按 ` 键手动开。
- 宿敌/猎手：条满 100% 必须真的来（R70 `nem_sure`），来了封门（BOSS/精英擂台除外）。
- 首级玩法：R71 `head_play`（开）——F 回忆里的「🎪 余兴」9 个小游戏，每个给下一趟独特祝福；用户要的是「讽刺/嘲讽/恶趣味、符合身份的文字、蒙太奇镜头」，内容红线见第 1 节（成年、无性内容、头不说话——台词一律「格罗克代配」）。

## 3. 架构地图（找代码从这里开始）

```
index.html  —— 按顺序加载 ~150 个 classic script（顺序=依赖，新文件加在依赖之后）
lib/three.min.js（打过补丁的 r149）
js/mods.js        MOD 表 LIST（id/cat/icon/n/d/def/group/requires/conflicts）+ 迁移 __v + Mods.on(id)
js/mods_i18n.js   MOD 名称说明的英/日翻译 [nEn,dEn,nJa,dJa]
js/game.js        洞穴（家）主循环 G：frame()；HOOK.frame/e/tip；建筑、首级、存档 G.S（localStorage）
js/worlds.js      野外（出猎）：Worlds.start/goto/frame；地点图、加载、门、玩家移动、foeCtx（敌人回调）、foeEvent
                  ⚠ game.js frame() 在 Worlds.active 时只调 Worlds.frame 然后 return —— 洞穴里的 HOOK.frame、自动画质等在野外不跑
js/foe.js         敌人核心：build（身体+头+武器）/populate/update/attack/atkStep/hit/die/decapitate/ragdoll
  ├ foe_ai2.js    技能（跃斩/冲锋/旋风/破防 + SK2 高阶技）、词缀、战术
  ├ foe_roles*.js 职业（长枪突刺、术士、疗愈…）
  ├ brain.js      总导演：攻击令牌、点名、看门狗
  ├ moves.js      招式池（UAL + KayKit 动作）
  ├ locomo.js     走路/转身/加速度（fo.rv 速度请求在这里被限加速度）
  ├ stance.js / feel54.js  骨骼叠加（受击后仰、架势）——必须在 mixer 前 pre() 还原
  └ hunters2.js / nemesis.js / nemstory.js  猎手、宿敌、宿敌剧情
js/combat.js      玩家战斗（方向斩、格挡、蓄势、体力）；combatfx.js 音效；momentum.js 连斩/顿帧
js/decapcam.js    斩首特写慢镜头 + 血（R70 decap_blood2 新血 + hitBlood）
js/r70.js         HitFeel（命中反馈）+ FieldTier（野外自动画质）
js/master.js      大师画质管线（HDR RT、AO、泛光、体积光、FXAA；tier ultra/high/mid）
js/eco.js         限帧 60、动态分辨率、GPU 计时；perf2.js、shaderq.js（异步编译）
js/loop.js / san.js / san_cfg.js  回合经济、章节 BOSS（genArena 单 BOSS 擂台：graph.arena=true）
js/regionquest.js / arrival2.js / saga.js  任务、到达窗口、地区异变电影（BOSS 擂台里全部不显示）
js/hub.js / wheel.js / ui3a.js / css/ui63.css  统一菜单、转盘、UI 层级（z-index 表见 R64）
js/autopsy.js     解剖台（独立大模块，autopsy agent 维护）
js/recall_iw.js   F 回忆（原地捧头）：动作栏 + 汲魂入口（siphon.js）+ 余兴入口（headplay）
js/headplay.js    R71 首级余兴引擎：独立舞台 + 自己的 rAF（__pauseMain）、剧本生成器、节拍环/抉择/指认/顺序输入、机位硬切、祝福（pend→act→清空）
js/headplay_games.js  9 个节目（HeadPlay.reg），文案按身份(c.id)/梦想(goal)/性格(traits) 变化
tools/test/*.html 测试台（blood70.html、cine.html、autopsy.html …）；tools/test/aibench.js 敌人 AI 台架；tools/balance/sim.js、tools/test/sanbench.js 数值模拟
```

## 4. 怎么写一个 MOD（模板 + 检查表）

```js
// js/mymod.js —— R7x（作者/轮次）：一句话说明用户要什么
window.MyMod = (() => {
  const on = () => !window.Mods || !Mods.on || Mods.on('my_mod') !== false;
  function tick(dt) { if (!on()) return; try { /* ... */ } catch (e) { console.warn('MyMod', e); } }
  return { on, tick };
})();
```
1. **注册**：`js/mods.js` 的 `LIST` 加 `{ id, cat: 'play'|'look'|'perf'|..., icon, n: '名称（R7x）', d: '用户能看懂的说明 + 关掉=什么', def: true }`。
   ⚠ `Mods.on(id)` 对**没注册的 id 返回 false**——不注册 = 永远关。`Mods.on` 读的是**启动时**状态，开关要重载生效。
   改**已有** MOD 的默认值要加迁移：`if (st.__v < N) { st.xxx = ...; st.__v = N; save }`（当前最大 25）。
2. **翻译**：`js/mods_i18n.js` 加 `id: [nEn, dEn, nJa, dJa]`（R40 用户：别的语言里不要混中文）。
3. **加载**：`index.html` 在依赖之后加 `<script src="js/mymod.js"></script>`。
4. **挂钩**：优先用现成钩子——野外每帧 `Worlds.frame` 里已调用的模块、`foeEvent(type, fo, d)`、`Foe` 的 `CTX` 回调、洞穴 `G.HOOK.frame/e/tip`。包装别人的函数时**原样透传所有参数**（R54l：漏传 `{keep:true}` 把整张图的敌人清掉）。
5. **异常**：每帧代码、事件回调一律 try/catch。**钩子抛错不能让后面的状态转换（死亡、结算、计数）被跳过**（R70：命中钩子抛错 → BOSS 血到 0 不死）。
6. **性能**：不在每帧 new 向量/材质/几何；不每帧写 innerHTML（先比较再写）；不用 `backdrop-filter` 盖在 WebGL 上；新材质在进图时预热（`Foe.warm` / `ShaderQ`）。
7. **验证**：`node --check js/mymod.js`；能在测试台里跑的就写个 `tools/test/xxx.html`；截图 ≤20 张/轮。
8. **提交**：小步 commit + push；HANDOFF.md 末尾追加本轮记录（含“没验证”的点）。

## 5. 踩过的坑（全部是真实事故）

- **编辑工具**：替换字符串里不要写字面 `\n`、`\uXXXX`（会原样进源码，曾把整行吞进注释、让 i18n/heads.js 整体失效）。中文直接写。改完 `node --check`。
- **PowerShell 5.1**：`Get-Content | Set-Content` 会按 ANSI 读写，毁掉 UTF-8 中文；`node -e` 带嵌套引号会卡在 `>>`。改文件只用编辑工具。
- **骨骼叠加**：在 `mixer.update` 之后改骨头的模块，必须在 `mixer.update` 之前还原（`Feel54.pre`/`Stance.pre`），否则偏移逐帧累积（敌人打着打着侧身 180°）。
- **敌人移动**：`fo.rv` 是“本帧额外速度”，经 `Locomo.accel` 限加速度。R70 前高速爆发也被限到 16m/s² → 冲锋/突刺/翻滚只走 1~4m（“看得到轨迹，敌人没冲过来”）。现在 >4.5m/s 的爆发 90m/s² 到速。直接改 `fo.pos` 只用于瞬移/跃斩。
- **攻击状态**：`fo.atk` 存在时只有 `atkStep` 推进；任何层播别的动画顶掉攻击动画 → `fo.atk` 永不结束 → 站桩（R55f 看门狗 0.4s 兜底）。起手后返回 null 时，后续层不能再 `f.play`。
- **击倒**：`Hit_Knockback → LayToIdle` 期间会延长 `stag`；R70 加了 3.2 秒上限，别再写“动画没播完就无限延长”的逻辑。
- **刷怪**：`Foe.populate(ctx, list, {keep:true})` 中途追加；不 keep 会清场。刷之前确认 `Foe.ctx().sc === W.B.sc`（敌人上下文是当前地点）。
- **光球小精灵**：`Foe.populate` 失败才会退回旧的光球敌人（`spawnPrey`）。R70 起：已搭好的敌人照样用、退回光球前清掉不会再更新的角色（以前=角色全定格 + 光球乱跑）。
- **UI 弹窗**：野外战斗中不弹；关闭时 `G.setUI(false)` + `G.lockPointer()`；按键遵守 R55e 规则（电影 Esc=跳过；Enter 归最上层界面；主菜单只在无界面时由 Esc 打开）。
- **z-index**：Tab/页头/侧栏 120/125/130，弹窗 135，提示 150（R64）。
- **BOSS 擂台**（`graph.arena`）：只有一个 BOSS，任务/支线/异变追踪都要隐藏（R70）；宿敌不来。
- **着色器卡顿**：第一次用到的材质组合会同步编译（Windows/D3D11 每个 0.3~0.9s）。新特效在进图时 `compile`/预热；不要在命中那一刻 new 材质。
- **头颈**：`neck_join`（R67）会把头插进颈口并在颈部做径向缩放；R70 把缩放带限制在 2cm、倍率 0.88~1.12（以前会把下巴往外推 = “地包天”）。

## 6. 性能：卡顿从哪来、怎么查

- 显卡大头：`master.js` ultra（4×MSAA HDR + 16 采样 AO + 泛光 + 体积光）、`wgrass.js` 壳层草（层数跟画质档）、阴影 2048、角色描边外壳（每个角色多画一遍）、多敌人蒙皮。
- R70 `field_tier`：野外帧时间持续 >21ms 时把“野外档位”降一级（存 `localStorage.r70_ftier`），**在下一次加载画面里切**（切档会重编着色器，战斗中切=卡）；稳定 4 分钟再升回。`FieldTier.reset()` 清掉记忆。`?q=ultra` 强制档位时不干预。
- CPU 大头：十几层敌人 AI、上百个 setInterval/DOM 更新、每帧临时对象。查法：`Eco.stats()`（gpuMs、分辨率）、worlds 的 `PROF`（加载各阶段耗时）、浏览器 Performance 面板录 5 秒。
- 浏览器 3D 不是“天生卡”：同样的画面原生引擎也要这些开销；卡顿多半是**某一帧**做了重活（编着色器、建网格、大 DOM 重排、GC）。先找尖刺，再谈平均帧率。

## 7. 本机工作流（Windows）

```powershell
# 用户机器走本地代理 127.0.0.1:7892（git 默认不走系统代理，直接 clone 会 Connection reset）
git -c http.proxy=http://127.0.0.1:7892 clone --filter=blob:none --no-checkout --depth 1 https://<user>:<token>@github.com/deawfwaef2/head.git .
git config http.proxy http://127.0.0.1:7892
git sparse-checkout init --no-cone; git sparse-checkout set "/*" "!/big/" "!/models/" "!/promo/"
git checkout main
```
- 没有 `big/`、`models/` 时 `index.html` 进不了游戏（头/身体模型缺失）；改动用 `node --check` + 测试台（`tools/test/*.html`）验证，并在 HANDOFF 写“未实机验证”。
- 提交身份用 `git -c user.name=... -c user.email=...`，不要改用户的全局 git 配置。

## 8. 数值（平衡）在哪改

- 敌人出手伤害：`foe.js attack()` 的 `base`（占玩家最大生命 %；R70 `bal70` 普通 ×1.4 / BOSS ×1.25）。
- 敌人受伤：`foe.js hit()`（伤害下限、`fast_ttk` 普通 ≤4 刀、BOSS/精英/猎手单刀上限 10%）。
- 玩家受伤：`worlds.js foeCtx.hitPlayer`（格挡/完美格挡/重击）→ `Talents.inDmg` → `Rogue.inDmg` → `Sack.defMul`。
- 难度：`difficulty.js`（`Diff.hp()/dmg/nem/loot`）。宿敌/猎手强度：`hunters2.js spawn`、`nemesis.js extraStrike`（随仇恨缩放）。
- 经济：`loop.js`（回合结算/上限）、`san_cfg.js` + `tools/test/sanbench.js`（SAN 曲线模拟）。
- 原则：先用模拟脚本看曲线，再小步改一个旋钮，并把旧值写进 HANDOFF。不要同时动 5 个地方。

## 9. R70 BUG 审计结果（已修 / 仍可疑）

已修：冲锋/突刺/翻滚不位移（locomo 加速度上限）；BOSS 血 0 不死卡倒地（僵尸守卫 + 击倒上限 + die() 分段容错）；进图角色全定格 + 光球乱跑（populate/入座异常处理）；宿敌/猎手 100% 不来（strike 假成功、首次不重试、猎手门槛）；技能三选一在战斗中弹出抢鼠标（野外不自动弹）；BOSS 擂台显示做不了的任务；后撤逃课（`foe_track`）；斩首血效低级（`decap_blood2`）；打击感（`hit_feel2`）；地包天（neck_join）；野外永远 ultra（`field_tier`）。

仍可疑（下一位优先查）：
1. 敌人行为仍由十几层叠加，任何新层都可能和 Brain/FoeAI2/职业层抢同一帧——新敌人逻辑请挂在现有层里，不要再加平行层。
2. `hit()` 里事件顺序复杂（格挡→词缀→伤害→事件→斩首→死亡）；新增命中逻辑请放在扣血之后、且 try/catch。
3. 很多模块各自 `setInterval(…,250)` 改 DOM；统一到一个 HUD 刷新循环会更省（未做）。
4. 平衡：没有真实存档数据校准；`tools/balance/sim.js` 停在 R41 模型，需要更新到现在的 `fair_fight + brain + foe_track` 节奏。
5. 未实机验证（本机无 big/models）：R70 全部改动的体感、`field_tier` 降档阈值、`bal70` 难度。

## 10. R71 首级余兴：怎么加一个小游戏

```js
// js/headplay_games.js 里（或新文件，加载在 headplay.js 之后）
HP.reg({
  id: 'xxx', ic: '🎯', n: '节目名', sub: '副标题', need: null /* 或建筑 id，如 'rh_dice' */, heads: 3, buff: 'eye' /* BUFF 表里的 id */,
  col: '#8fe6ff', tag: '标题卡一句话', roles: ['主演', '…'], reveal: ['name', 'race', 'goal'] /* 演完想起主演的哪些信息 */, coin: 0 /* 可选魂晶赏 */,
  d: '面板里的玩法说明（写清楚按什么键）',
  setup(Z) { Z.rest(0, 0, 0, 0); /* 摆头、建道具 Z.prop(geo, {color})、Z.glowS() */ },
  update(Z, dt, t) { /* 可选：每帧（Z.direct(i,true) 后可直接写 Z.hd[i].P / .q） */ },
  *script(Z) {
    yield* line(Z, og, '「格罗克的台词 {n}」');           // 字幕 + 按字数等待阅读
    Z.cut(face(0, { az: 0.3 }));                         // 硬切机位
    const C = yield Z.choice({ title: '…', opts: [{ t, d, v }] });   // 三选一 → { i, v, x }
    const R = yield Z.ring({ key: 'Space', at: 1, kind: 'tap'|'hold'|'mash', a: 'h0.face' }); // → 'perfect'|'great'|'ok'|'miss'
    Z.score(C.v, 1); Z.stat('结算行'); Z.endLine('落幕旁白');
  }
});
```
- 新祝福：`headplay.js` 的 `BUFF` 加 `{ ic, n, col, txt(k), nb(k) }`；`nb` 只能返回 Loop 认识的键（dmg/hp/spd/fear/heal/clear），其它效果写在 `out()/inn()/ev()`（已包装 Rogue 钩子）。
- 文案上下文 `cx(rec)`：`{n, id, race, ri(去重的种族+身份), age, loc, wpn, act, fight, goal, tr, tr2, traits, belief, title, idk(身份 id)}`；身份分组正则 SINGER/FAITH/THIEF/NOBLE/ARMS/MAGE/FOLK 在文件头。头不会说话：她的台词用 `voiceL(Z, i, …)`（标「格罗克代配」）。
- 镜头坑：特写用 `face()`（有最小距离，太近只剩一只眼）；头在飞/转时对准 `h{i}.center` 并拉远；抉择卡片在屏幕下 1/3，抉择时对准下巴 `h{i}.chin` 让脸在卡片上方；多头前后排时把镜头抬高越过前排。
- 尺寸坑：头组缩放 1.55，头高 `hd.H`≈0.3m；**不要用 `Box3.setFromObject` 量 VRM 头**（蒙皮几何体带整身包围盒，量出 3 米），用 `hd.L` 锚点（eyes/mouth/face/cut/center/crown/chin，头局部已含缩放）。
- 验证：`tools/test/headplay.html?g=xxx&speed=3` 自动玩到结算；`&at=choice|pick|ring|seq|res&n=K` 冻结截图。改完脚本等 1~2 秒再刷新（编辑器写盘有延迟，曾拿到旧脚本）。
