// 第三十七轮 R37：新手引导教程 —— 用户：“加入游戏教程引导玩家，教学玩家玩法，新存档都有教程”
// MOD `tutorial`（默认开，O 面板可关）。全新存档（开场故事演完之后）自动开始；老存档可在标题菜单点「📖 新手教程」重看；F9 = 关闭 / 重开。
// 设计：不阻塞、不冻结游戏 —— 右上角一张小卡片（中 / 日 / EN 三语），按“动手做”推进：每一步都有检测条件（看视角 / 走路 / 打开菜单 / 拔刀 / 挥砍 / 格挡 / 闪身 / 击倒 / 拾取 / 回洞 / 把玩…），
// 做到了就自动下一步；做不到（或已经会了）按 Enter 跳过此步。走路类步骤有指向目标的屏幕箭头。
// 进度存在 G.S.tut = { i, off, done, lang }，随存档走（删存档 = 新教程）。
// 只读游戏状态（G / UI / Combat / Worlds / Foe），不改任何已有文件的逻辑；只在 index.html 加 1 个 script + 1 个标题按钮。
window.Tutorial = (() => {
  'use strict';
  const modOn = () => !window.Mods || !Mods.on || Mods.on('tutorial') !== false;
  const LANGS = ['zh', 'ja', 'en'], LN = { zh: '中文', ja: '日本語', en: 'EN' };
  const CHN = {
    zh: ['第 1 章 · 洞窟', '第 2 章 · 出洞狩猎', '第 3 章 · 回洞经营', '结业'],
    ja: ['第1章 · 洞窟', '第2章 · 狩りへ', '第3章 · 洞窟経営', '修了'],
    en: ['Ch.1 · The Cave', 'Ch.2 · The Hunt', 'Ch.3 · Running the Cave', 'Done']
  };
  const UIT = {
    zh: { skip: '跳过此步', off: '关闭教程', wait: { cave: '回到洞窟后继续', world: '出洞狩猎后继续' }, ok: '完成！', hint: 'Enter 跳过此步 · F9 关闭/重开教程' },
    ja: { skip: 'このステップをスキップ', off: 'チュートリアルを閉じる', wait: { cave: '洞窟に戻ると再開します', world: '狩りに出ると再開します' }, ok: '完了！', hint: 'Enter でスキップ · F9 で閉じる/再開' },
    en: { skip: 'Skip step', off: 'Close tutorial', wait: { cave: 'Continues when you are back in the cave', world: 'Continues once you head out to hunt' }, ok: 'Done!', hint: 'Enter = skip step · F9 = close / reopen' }
  };

  // ---------------- 步骤 ----------------
  // where: 'cave' 只在洞里评估；'world' 只在外面评估；'any' 随时。go(c) → {x,z} 时显示指向箭头。tick(st, c) → true = 完成。
  const STEPS = [
    { id: 'look', ch: 0, where: 'cave', tick: (st, c) => c.yawAcc - st.yaw0 > 1.6,
      z: ['环顾四周', '移动<b>鼠标</b>转动视角。游戏里没有准星以外的 UI 打扰——你是一头被诅咒的食人魔，这是你的洞窟。<br><small>鼠标跑出窗口了？点一下画面即可重新锁定。</small>'],
      j: ['見回してみよう', '<b>マウス</b>を動かして視点を回します。ここは呪われたオーガ、あなたの洞窟です。<br><small>マウスが外れたら、画面をクリックすると再ロックされます。</small>'],
      e: ['Look around', 'Move the <b>mouse</b> to turn your view. You are a cursed ogre, and this is your cave.<br><small>Lost the cursor? Click the screen to lock it again.</small>'] },
    { id: 'move', ch: 0, where: 'cave', tick: (st, c) => c.walk - st.walk0 > 5,
      z: ['移动', '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 走动；按住 <kbd>Shift</kbd> 疾跑（耗体力）；<kbd>C</kbd> 下蹲。<br>先随便走几步。'],
      j: ['移動', '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> で移動、<kbd>Shift</kbd> 長押しで走る（スタミナ消費）、<kbd>C</kbd> でしゃがみ。<br>まず数歩歩いてみましょう。'],
      e: ['Move', '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> to walk, hold <kbd>Shift</kbd> to sprint (costs stamina), <kbd>C</kbd> to crouch.<br>Take a few steps.'] },
    { id: 'snik', ch: 0, where: 'cave', go: c => c.cave && c.cave.merchantPos, tick: (st, c) => { if (c.ui === 'menu') st.seen = true; return st.seen && !c.ui; },
      z: ['认识斯尼克', '跟着屏幕上的 <b>🧭 箭头</b>走到地精商人<b>斯尼克</b>身边，按 <kbd>E</kbd> 打开装备界面。<br>装备、药剂、强化都在这里；<b>🔮魂晶</b>是通用货币——只有首级能产出。看完按 <kbd>Esc</kbd> 关闭。'],
      j: ['スニークに会う', '画面の <b>🧭 矢印</b>に従って、ゴブリン商人<b>スニーク</b>の近くへ。<kbd>E</kbd> で装備画面を開きます。<br>装備・薬・強化はここで。通貨の <b>🔮魂晶</b> は首からしか得られません。見終わったら <kbd>Esc</kbd> で閉じます。'],
      e: ['Meet Snik', 'Follow the on-screen <b>🧭 arrow</b> to the goblin merchant <b>Snik</b> and press <kbd>E</kbd> to open the gear screen.<br>Gear, potions and upgrades live here. <b>🔮 Soul crystals</b> are the currency, and only heads produce them. Press <kbd>Esc</kbd> to close.'] },
    { id: 'stats', ch: 0, where: 'cave', tick: (st, c) => { if (c.ui === 'menu' && c.tab === 'stats') st.seen = true; return st.seen && !c.ui; },
      z: ['属性', '按 <kbd>Tab</kbd> 查看属性：❤️ 血量、⚔️ 战力、体力，以及<b>训练</b>提升。战力越高，外面的敌人越好对付。<br>看完再按一次 <kbd>Tab</kbd>（或 <kbd>Esc</kbd>）关闭。'],
      j: ['ステータス', '<kbd>Tab</kbd> でステータスを確認：❤️ HP、⚔️ 戦力、スタミナ、そして<b>訓練</b>。戦力が高いほど外の敵は楽になります。<br>もう一度 <kbd>Tab</kbd>（または <kbd>Esc</kbd>）で閉じます。'],
      e: ['Stats', 'Press <kbd>Tab</kbd> to see ❤️ HP, ⚔️ power, stamina and <b>training</b>. More power makes the outside world easier.<br>Press <kbd>Tab</kbd> (or <kbd>Esc</kbd>) again to close.'] },
    { id: 'build', ch: 0, where: 'cave', tick: (st, c) => { if (c.ui === 'menu' && c.tab === 'build') st.seen = true; return st.seen && !c.ui; },
      z: ['建造', '按 <kbd>B</kbd> 打开建造菜单：<b>每件建筑都会让你更强</b>；桌子、杆、展示台上插着的首级，每次回洞按回合结算魂晶。<br>魂晶够就点一件，在洞里<b>点鼠标放置</b>（<kbd>R</kbd> 旋转）。看完按 <kbd>B</kbd> / <kbd>Esc</kbd> 关闭。'],
      j: ['建築', '<kbd>B</kbd> で建築メニュー：<b>建物はすべてあなたを強くします</b>。テーブル・杭・展示台は首から自動で魂晶を生みます。<br>魂晶が足りれば1つ選び、洞窟内で<b>クリックして設置</b>（<kbd>R</kbd> で回転）。<kbd>B</kbd> / <kbd>Esc</kbd> で閉じます。'],
      e: ['Build', 'Press <kbd>B</kbd> for the build menu: <b>every building makes you stronger</b>, and tables, poles and display stands make heads produce crystals automatically.<br>If you can afford one, pick it and <b>click to place</b> (<kbd>R</kbd> rotates). Press <kbd>B</kbd> / <kbd>Esc</kbd> to close.'] },
    { id: 'toexit', ch: 0, where: 'cave', go: c => c.cave && c.cave.exitPos, tick: (st, c) => c.cave && c.dExit < 2.6,
      z: ['去洞口', '跟着 <b>🧭 箭头</b>走到发光的<b>洞口</b>。'],
      j: ['洞口へ', '<b>🧭 矢印</b>に従って、光る<b>洞口</b>まで歩きましょう。'],
      e: ['To the exit', 'Follow the <b>🧭 arrow</b> to the glowing <b>cave mouth</b>.'] },
    { id: 'exit', ch: 0, where: 'any', tick: (st, c) => c.inWorld || (c.ui && c.ui !== 'menu' && c.ui !== 'intro'),
      z: ['出发狩猎', '按 <kbd>E</kbd> 出洞。<b>小心：在外面死掉，一切归零。</b>血量低于 35% 就别硬闯，先回洞休整、喝药（<kbd>H</kbd>）。<br>如果出现地点选择：挑推荐战力和你差不多的。'],
      j: ['狩りへ出発', '<kbd>E</kbd> で洞窟を出ます。<b>注意：外で死ぬとすべてリセットされます。</b>HPが35%未満なら無理せず戻って休み、薬（<kbd>H</kbd>）を飲みましょう。<br>行き先を選ぶ画面が出たら、推奨戦力が今の戦力に近い場所を。'],
      e: ['Head out', 'Press <kbd>E</kbd> to leave. <b>Beware: if you die outside, everything resets.</b> Under 35% HP, go home and recover, or drink a potion (<kbd>H</kbd>).<br>If a destination screen appears, pick one whose recommended power is close to yours.'] },

    { id: 'draw', ch: 1, where: 'world', tick: (st, c) => c.drawn,
      z: ['拔刀', '按 <kbd>F</kbd> 拔刀 / 收刀。没有武器就用拳头——<b>武器靠外面搜刮</b>，魂晶只用来附魔和强化。'],
      j: ['抜刀', '<kbd>F</kbd> で抜刀／納刀。武器がなければ素手で。<b>武器は外で拾うもの</b>、魂晶は付与と強化用です。'],
      e: ['Draw your weapon', 'Press <kbd>F</kbd> to draw or sheathe. No weapon? Use your fists. <b>Weapons are found outside</b>; crystals are only for enchanting and upgrading.'] },
    { id: 'slash', ch: 1, where: 'world', tick: (st, c) => c.drawn && EV.mvSlash - st.mv0 > 700,
      z: ['挥砍', '按住<b>左键</b>，同时<b>大幅挥动鼠标</b>——挥动的方向就是刀的方向（斜劈、横扫都行）。<br>只是小幅抖动不算数，要有力度。'],
      j: ['斬撃', '<b>左ボタン</b>を押したまま<b>マウスを大きく振る</b>：振った方向が刃の向きです（袈裟斬り、薙ぎ払い）。<br>小さな手ぶれは無効、力強く振りましょう。'],
      e: ['Slash', 'Hold the <b>left button</b> and <b>swing the mouse widely</b>: the swing direction is the blade direction (diagonals, sweeps).<br>Tiny jitters do not count. Commit to the swing.'] },
    { id: 'thrust', ch: 1, where: 'world', tick: (st, c) => c.drawn && EV.clicks.filter(t => c.now - t < 1800).length >= 3,
      z: ['刺击', '快速<b>连点左键</b>（不动鼠标）突刺：出手快、伤害低，适合打空档、追击逃跑的敌人。'],
      j: ['刺突', 'マウスを動かさず<b>左クリック連打</b>で突き：素早いが威力は低め。隙や逃げる敵に。'],
      e: ['Thrust', '<b>Click the left button rapidly</b> without moving the mouse to thrust: fast but weak, good for openings and fleeing enemies.'] },
    { id: 'guard', ch: 1, where: 'world', tick: (st, c) => c.drawn && EV.rmbDown > st.rmb0,
      z: ['格挡', '按住<b>右键</b>举刀格挡：<b>刀要对着来袭的方向</b>（鼠标偏向哪边，就挡哪边）；格挡时视角会变慢。<br>刚好在敌人命中前举起是「完美格挡」，能反击。<b>红光攻击会破防，别硬挡——用 Q 闪开</b>。'],
      j: ['ガード', '<b>右ボタン</b>長押しで構える：<b>刃を攻撃の来る方向へ</b>（マウスを傾けた側を守る）。ガード中は視点がゆっくりになります。<br>命中直前のガードは「パーフェクトガード」で反撃のチャンス。<b>赤く光る攻撃はガードを崩す：Q で回避</b>。'],
      e: ['Guard', 'Hold the <b>right button</b> to guard: <b>point the blade toward the incoming attack</b> (lean the mouse to that side). Your view slows while guarding.<br>Guarding right before impact is a perfect guard and opens a counter. <b>Red-glow attacks break your guard: dodge them with Q.</b>'] },
    { id: 'dash', ch: 1, where: 'world', tick: (st, c) => EV.k.KeyQ > (st.k0.KeyQ || 0),
      z: ['闪身', '按 <kbd>Q</kbd> 向移动方向<b>闪身</b>（耗体力）：躲开<b>红圈、红色走廊</b>和破防击。<br>体力见屏幕上的条——挥刀、格挡、闪身、疾跑都会耗，别耗光。'],
      j: ['回避', '<kbd>Q</kbd> で移動方向へ<b>回避</b>（スタミナ消費）：<b>赤い円・赤い通路</b>や防御崩しを避けます。<br>スタミナは画面のバーで確認。攻撃・ガード・回避・ダッシュで減ります。'],
      e: ['Dodge', 'Press <kbd>Q</kbd> to <b>dodge</b> in your movement direction (costs stamina): avoid <b>red circles, red corridors</b> and guard-breakers.<br>Watch the stamina bar: swinging, guarding, dodging and sprinting all drain it.'] },
    { id: 'fight', ch: 1, where: 'world', tick: (st, c) => c.kills > st.kills0,
      z: ['战斗', '靠近一个敌人，<b>先观察再出手</b>：敌人会<b>拖一拍、假动作、红光破防</b>，还会记住你的习惯——别只会一种打法。<br>击倒她（打空血条）。露出<b>破绽</b>时按 <kbd>E</kbd> 可以处决斩首。'],
      j: ['戦闘', '敵に近づき、<b>まず観察</b>。敵は<b>タメ・フェイント・赤光の防御崩し</b>を使い、あなたの癖も覚えます。同じ戦い方ばかりは危険。<br>HPを削り切って倒しましょう。<b>隙</b>が出たら <kbd>E</kbd> で処刑できます。'],
      e: ['Fight', 'Approach an enemy and <b>watch before you strike</b>: they delay, feint and use red guard-breakers, and they remember your habits, so mix it up.<br>Take her down. When she shows an <b>opening</b>, press <kbd>E</kbd> to execute.'] },
    { id: 'loot', ch: 1, where: 'world', tick: (st, c) => EV.k.KeyE > (st.k0.KeyE || 0) && c.kills > 0,
      z: ['收头与搜刮', '斩下的<b>首级</b>会掉在地上：走近按 <kbd>E</kbd> 捡进麻袋。宝箱、尸体、容器同样按 <kbd>E</kbd> 搜刮；<kbd>Tab</kbd> / <kbd>B</kbd> 打开背包整理。'],
      j: ['首の回収と探索', '倒した<b>首</b>は地面に落ちます：近づいて <kbd>E</kbd> で袋へ。宝箱・死体・容器も <kbd>E</kbd> で探索。<kbd>Tab</kbd> / <kbd>B</kbd> で持ち物整理。'],
      e: ['Loot', 'Severed <b>heads</b> drop on the ground: walk up and press <kbd>E</kbd> to bag them. Chests, corpses and containers also use <kbd>E</kbd>. <kbd>Tab</kbd> / <kbd>B</kbd> opens the pack.'] },
    { id: 'retreat', ch: 1, where: 'any', tick: (st, c) => { if (c.inWorld) st.was = true; return st.was && !c.inWorld; },
      z: ['撤退回洞', '找到场景里的<b>门</b>，站在门口按 <kbd>E</kbd> 回洞；被追杀时在门口按 <kbd>E</kbd> 能直接甩开追兵。<kbd>M</kbd> 打开地图。<br>战利品越多越危险——<b>见好就收</b>也是本事。'],
      j: ['撤退して帰還', '場内の<b>扉</b>の前で <kbd>E</kbd> を押すと洞窟に戻れます。追われていても扉の前なら逃げ切れます。<kbd>M</kbd> でマップ。<br>戦利品が増えるほど危険に：<b>引き際</b>も腕のうちです。'],
      e: ['Retreat home', 'Find a <b>door</b> in the scene and press <kbd>E</kbd> at it to return home; even when chased, pressing <kbd>E</kbd> at a door shakes pursuers. <kbd>M</kbd> opens the map.<br>More loot means more danger, so <b>knowing when to leave</b> is a skill.'] },

    { id: 'bag', ch: 2, where: 'cave', tick: (st, c) => c.heads > 0 || c.bagDone,
      z: ['带回战利品', '回洞后战利品装在一只<b>麻袋</b>里：靠近按 <kbd>E</kbd> 扛起，走到洞内空地（篝火旁）再按 <kbd>E</kbd> 倒出首级；<kbd>Q</kbd> 放下麻袋。<br>洞里的首级会一直陪着你。'],
      j: ['戦利品を持ち帰る', '戦利品は<b>袋</b>に入っています：近づいて <kbd>E</kbd> で担ぎ、洞内の空き地（焚き火のそば）でもう一度 <kbd>E</kbd> を押すと首が出ます。<kbd>Q</kbd> で袋を置く。<br>洞窟の首は、ずっとあなたのそばにあります。'],
      e: ['Bring loot home', 'Your haul comes in a <b>sack</b>: step up and press <kbd>E</kbd> to shoulder it, walk to open ground by the campfire and press <kbd>E</kbd> again to pour out the heads. <kbd>Q</kbd> puts the sack down.<br>Heads in the cave stay with you.'] },
    { id: 'pick', ch: 2, where: 'cave', tick: (st, c) => !!c.held,
      z: ['拿起首级', '准星对准一颗首级，按 <kbd>E</kbd> 拿起。拿着时：<kbd>滚轮</kbd>转向，<kbd>V</kbd> 换表情，<kbd>E</kbd> 放下 / 插到杆上，长按 <kbd>E</kbd> 精确摆放，<kbd>右键</kbd> 扔出去。'],
      j: ['首を拾う', '照準を首に合わせて <kbd>E</kbd> で持ち上げ。持っている間：<kbd>ホイール</kbd>で向き、<kbd>V</kbd> で表情、<kbd>E</kbd> で置く／杭に刺す、<kbd>E</kbd> 長押しで精密配置、<kbd>右クリック</kbd>で投げる。'],
      e: ['Pick up a head', 'Aim at a head and press <kbd>E</kbd> to pick it up. While holding: <kbd>wheel</kbd> turns it, <kbd>V</kbd> changes the expression, <kbd>E</kbd> sets it down or mounts it on a pole, hold <kbd>E</kbd> for precise placement, <kbd>right button</kbd> throws it.'] },
    { id: 'poke', ch: 2, where: 'cave', tick: (st, c) => c.pokes >= st.pokes0 + 5,
      z: ['把玩出魂晶', '按住（或连点）<b>左键</b>把玩首级：每次产出 🔮魂晶，<b>连击越高越多</b>。稀有度越高的头，魂晶越多。'],
      j: ['弄んで魂晶を得る', '<b>左ボタン</b>（連打も可）で首を弄ぶと 🔮魂晶 が出ます。<b>コンボが高いほど</b>多く、レア度が高い首ほど大量に。'],
      e: ['Play to earn crystals', 'Hold or tap the <b>left button</b> to play with a head: each poke yields 🔮 crystals, <b>more with a higher combo</b> and from rarer heads.'] },
    { id: 'recall', ch: 2, where: 'cave', tick: (st, c) => (!!c.held || !!(c.G.lookHit && (c.G.lookHit() || {}).head)) && (EV.k.KeyF > (st.k0.KeyF || 0) || EV.k.KeyI > (st.k0.KeyI || 0)),
      z: ['回忆与档案', '手里拿着（或对准）首级时：<kbd>F</kbd> 进入<b>回忆</b>（和她互动、唤起记忆），<kbd>I</kbd> 查看<b>档案与故事</b>。每颗头都有名字、身世和秘密。'],
      j: ['回想とプロフィール', '首を持つ（または照準を合わせる）状態で：<kbd>F</kbd> で<b>回想</b>（触れ合い、記憶を呼び起こす）、<kbd>I</kbd> で<b>プロフィールと物語</b>。首にはそれぞれ名前・素性・秘密があります。'],
      e: ['Recall & dossier', 'While holding (or aiming at) a head: <kbd>F</kbd> enters <b>Recall</b> (interact, awaken memories) and <kbd>I</kbd> opens her <b>dossier and story</b>. Every head has a name, a past and secrets.'] },
    { id: 'more', ch: 2, where: 'cave', tick: (st, c) => EV.k.KeyT > (st.k0.KeyT || 0),
      z: ['成长与收藏', '<kbd>T</kbd> 打开<b>天赋树</b>，升级后加点、排技能；<kbd>K</kbd> 首级收藏，<kbd>L</kbd> 狩猎日志，<kbd>Y</kbd> 神灵簿，<kbd>J</kbd> 成就，<kbd>O</kbd> MOD 开关，<kbd>M</kbd> 音乐，<kbd>Esc</kbd> 暂停。<br>现在按 <kbd>T</kbd> 看一眼。'],
      j: ['成長とコレクション', '<kbd>T</kbd> で<b>才能ツリー</b>（ポイント振り・スキル設定）、<kbd>K</kbd> 首コレクション、<kbd>L</kbd> 狩猟ログ、<kbd>Y</kbd> 神霊簿、<kbd>J</kbd> 実績、<kbd>O</kbd> MOD、<kbd>M</kbd> 音楽、<kbd>Esc</kbd> 一時停止。<br>いま <kbd>T</kbd> を押してみましょう。'],
      e: ['Growth & collection', '<kbd>T</kbd> opens the <b>talent tree</b> (spend points, set skills); <kbd>K</kbd> head collection, <kbd>L</kbd> hunt log, <kbd>Y</kbd> spirit book, <kbd>J</kbd> achievements, <kbd>O</kbd> MODs, <kbd>M</kbd> music, <kbd>Esc</kbd> pause.<br>Press <kbd>T</kbd> now to take a look.'] },
    { id: 'end', ch: 3, where: 'any', timeout: 25, tick: () => false,
      z: ['教程完成！', '要点：<b>出洞搜刮 → 打倒敌人、拿首级 → 见好就收回洞 → 把首级插到建筑上（每次回洞按回合结算魂晶）→ 建造 / 训练 / 强化 → 去更深的地方</b>。<br>随时按 <kbd>F9</kbd> 重看教程；标题菜单也有「📖 新手教程」。祝你好猎，格罗克。<br><small>按 Enter 关闭这张卡片。</small>'],
      j: ['チュートリアル完了！', '要点：<b>外で探索 → 敵を倒して首を得る → 引き際よく帰還 → 首を弄んで魂晶 → 建築・訓練・強化 → さらに深い場所へ</b>。<br>いつでも <kbd>F9</kbd> で再確認。タイトルメニューにも「📖 チュートリアル」があります。幸運を、グロク。<br><small>Enter でこのカードを閉じます。</small>'],
      e: ['Tutorial complete!', 'Loop: <b>scavenge outside → beat enemies, take heads → leave while ahead → mount heads on buildings (they pay out each time you return) → build / train / upgrade → go deeper</b>.<br>Press <kbd>F9</kbd> any time to see this again; the title menu also has a “📖 Tutorial” button. Good hunting, Grok.<br><small>Press Enter to dismiss this card.</small>'] }
  ];

  // ---------------- 全局事件计数（只读，不拦截） ----------------
  const EV = { k: {}, mvSlash: 0, clicks: [], rmbDown: 0, lmb: false };
  const gd = () => window.G;
  function evInit() {
    if (EV.inited) return; EV.inited = true;
    addEventListener('keydown', e => { if (e.repeat) return; EV.k[e.code] = (EV.k[e.code] || 0) + 1; onKeyDown(e); }, true);
    addEventListener('mousedown', e => { const C = window.Combat, dr = !!(C && C.drawn); if (e.button === 0) { EV.lmb = true; if (dr) EV.clicks.push(performance.now()); if (EV.clicks.length > 12) EV.clicks.shift(); } if (e.button === 2 && dr) EV.rmbDown++; }, true);
    addEventListener('mouseup', e => { if (e.button === 0) EV.lmb = false; }, true);
    addEventListener('mousemove', e => { const C = window.Combat; if (EV.lmb && C && C.drawn) EV.mvSlash += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0); }, true);
  }
  function onKeyDown(e) {
    const G = gd(); if (!G || !modOn()) return;
    if (e.code === 'F9') { e.preventDefault(); toggle(); return; }
    if (e.code === 'Enter' && G.playing && !G.uiOpen && !(window.DecapCam && DecapCam.active) && !(window.Saga && Saga.cine) && !(window.Arrival2 && Arrival2.isOpen()) && !(window.GrandUI && GrandUI.isOpen && GrandUI.isOpen()) && S_() && !S_().off && !S_().done && cardOn) { e.preventDefault(); e.stopImmediatePropagation(); next('skip'); } // R55e：Enter 同时被教程/斩首镜头/电影用 → 有它们在场时教程不抢
  }

  // ---------------- 状态 ----------------
  let waiting = null, el = null, arrow = null, ctxPoll = null, fresh0 = null, cardOn = false, endShown = false, st = null, lastSave = 0, flashT = 0, lastY = null, lastP = null;
  const acc = { yaw: 0, walk: 0 };
  const S_ = () => { const G = gd(); return G && G.S ? G.S.tut : null; };
  const lang = () => { const t = S_(); if (t && t.lang) return t.lang; try { const l = localStorage.getItem('soulhead_tut_lang'); if (l && LANGS.includes(l)) return l; } catch (e) { } const b = document.querySelector('#introCopy [data-lang].on'); return b ? b.dataset.lang : 'zh'; };
  function save() { const G = gd(); try { if (G && G.save) G.save(); } catch (e) { } }

  function enterStep(i) {
    const t = S_(); if (!t) return; t.i = i; const c = ctx(); st = { k0: Object.assign({}, EV.k), yaw0: acc.yaw, walk0: acc.walk, mv0: EV.mvSlash, rmb0: EV.rmbDown, kills0: c.kills, pokes0: c.pokes, t0: performance.now() / 1000 };
    if (i >= STEPS.length) { t.done = true; t.i = STEPS.length; save(); render(); return; }
    render(); save();
  }
  function start(i) { const G = gd(); if (!G || !G.S) return; G.S.tut = { i: i || 0, lang: lang() }; enterStep(i || 0); }
  function restart() { const G = gd(); if (!G || !G.S) { try { localStorage.setItem('soulhead_tut_replay', '1'); } catch (e) { } return; } start(0); }
  function toggle() {
    const G = gd(); if (!G || !G.S) return; const t = G.S.tut;
    if (!t || t.done) { start(0); try { G.toast && G.toast('📖 教程重新开始 · Tutorial restarted', '#ffe090', 2); } catch (e) { } return; }
    t.off = !t.off; render(); save(); try { G.toast && G.toast(t.off ? '📖 教程已关闭（F9 重开）· Tutorial off' : '📖 教程继续 · Tutorial on', '#ffe090', 1.6); } catch (e) { }
  }
  function dismiss() { const t = S_(); if (!t) return; t.done = true; endShown = false; save(); render(); }
  function next(why) {
    const t = S_(); if (!t || t.done) return; const nx = t.i + 1;
    if (why === 'auto') flashT = 0.9;
    if (nx >= STEPS.length) { t.done = true; save(); render(); return; }
    enterStep(nx);
  }

  function ctx() {
    const G = gd() || {}, S = G.S || {}, P = G.player, W = window.Worlds, cave = G.cave, C = window.Combat, U = window.UI;
    const inWorld = !!((W && W.active) || (window.Explore && Explore.active));
    const ui = (U && U.open) || (G.uiOpen && inWorld ? 'ui' : '');
    let tab = ''; if (ui === 'menu') { const b = document.querySelector('#uiroot .m-tab.on'); tab = b ? b.dataset.v : ''; }
    const Wd = W && W._W, kills = (Wd && Wd.stats && Wd.stats.kill) || 0;
    return { G, S, P, inWorld, cave, ui, tab, drawn: !!(C && C.drawn), kills, pokes: (S.stats && S.stats.pokes) || 0, heads: (G.heads && G.heads.length) || 0, held: G.held, now: performance.now(),
      yawAcc: acc.yaw, walk: acc.walk, dExit: P && cave && cave.exitPos ? Math.hypot(P.pos.x - cave.exitPos.x, P.pos.z - cave.exitPos.z) : 99,
      bagDone: !!(S.stats && S.stats.trips > 0 && (G.heads && G.heads.length > 0)) };
  }

  // ---------------- 轮询 ----------------
  function poll() {
    const G = gd(); if (!G || !G.S) return;
    if (!modOn()) { if (cardOn) { cardOn = false; if (el) el.style.display = 'none'; if (arrow) arrow.style.display = 'none'; } return; }
    if (fresh0 === null) { fresh0 = !G.S.intro; try { if (localStorage.getItem('soulhead_tut_replay')) { localStorage.removeItem('soulhead_tut_replay'); start(0); } } catch (e) { } }
    // 累计视角 / 步行（游戏中、没开 UI 才算）
    const P = G.player; if (P) { if (lastY != null && G.playing && !G.uiOpen) { let d = P.yaw - lastY; d = Math.atan2(Math.sin(d), Math.cos(d)); acc.yaw += Math.abs(d); const dp = Math.hypot(P.pos.x - lastP.x, P.pos.z - lastP.z); if (dp < 3) acc.walk += dp; } lastY = P.yaw; lastP = { x: P.pos.x, z: P.pos.z }; }
    // 新存档：开场故事演完 → 开始教程
    if (!G.S.tut && fresh0 && G.S.intro && !(window.UI && UI.open === 'intro')) start(0);
    const t = G.S.tut;
    if (!t) return;
    if (st == null && !t.done) enterStep(t.i || 0);
    const c = ctx();
    const stp = STEPS[t.i];
    if (stp && !t.off && !t.done && G.playing) {
      const okWhere = stp.where === 'any' || (stp.where === 'cave' && !c.inWorld) || (stp.where === 'world' && c.inWorld);
      if (!okWhere) { waiting = stp.where; }
      else {
        waiting = null;
        let ok = false; try { ok = !!stp.tick(st, c); } catch (e) { console.warn('Tutorial step', stp.id, e); }
        if (stp.timeout && performance.now() / 1000 - st.t0 > stp.timeout) { t.done = true; save(); }
        if (ok && performance.now() / 1000 - st.t0 > 0.6) { next('auto'); }
      }
    }
    if (stp && stp.id === 'end') endShown = true;
    render(c);
  }

  // ---------------- 显示 ----------------
  function build() {
    const css = document.createElement('style');
    css.textContent = `#tut{position:fixed;right:14px;top:58px;width:372px;z-index:40;background:linear-gradient(180deg,rgba(34,22,14,.93),rgba(20,12,8,.93));border:1px solid #8c6a3c;border-radius:14px;padding:12px 16px 10px;color:#ead8b8;font:14px/1.6 system-ui,'Microsoft YaHei',sans-serif;box-shadow:0 8px 34px rgba(0,0,0,.6);pointer-events:none;display:none;animation:tutIn .35s}
#tut .ch{display:flex;justify-content:space-between;font-size:12px;color:#c9a768;letter-spacing:.08em}
#tut .bar{height:4px;background:#2b1d13;border-radius:3px;margin:5px 0 8px;overflow:hidden}#tut .bar i{display:block;height:100%;background:linear-gradient(90deg,#e0b75d,#ffd890);transition:width .4s}
#tut h4{margin:0 0 4px;font-size:18px;color:#ffe2a0;font-weight:800}
#tut .bd{font-size:14px;color:#e6d6bc}#tut .bd b{color:#ffcf70}#tut .bd small{color:#a89070}
#tut kbd{display:inline-block;min-width:1.4em;padding:0 6px;margin:0 2px;border:1px solid #b89858;border-bottom-width:2px;border-radius:5px;background:#3a2915;color:#fff0bc;font:700 12.5px/1.6 ui-monospace,Consolas,monospace;text-align:center}
#tut .ft{display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:11.5px;color:#8f7b60}
#tut .lg button{pointer-events:auto;cursor:pointer;margin-left:4px;padding:1px 7px;border:1px solid #6a4a2e;background:#17120e;color:#b9a488;border-radius:5px;font-size:11px}#tut .lg button.on{color:#fff0bc;border-color:#e0b75d;background:#3a2915}
#tut .bt{display:flex;gap:6px;margin-top:7px}#tut .bt button{pointer-events:auto;cursor:pointer;padding:3px 10px;border:1px solid #6a4a2e;background:#2a1b10;color:#d9c39f;border-radius:7px;font-size:12px}
#tut .ok{position:absolute;right:14px;top:10px;color:#9af0a8;font-weight:800;opacity:0;transition:opacity .25s}#tut.flash .ok{opacity:1}#tut.flash{border-color:#7ed08a}
#tut.wait{opacity:.78}#tut .wt{margin-top:6px;padding:4px 8px;border:1px dashed #6a4a2e;border-radius:7px;color:#ffcf70;font-size:12.5px}
#tutArrow{position:fixed;left:50%;top:15%;width:84px;margin-left:-42px;text-align:center;z-index:39;pointer-events:none;display:none;color:#ffe090;text-shadow:0 2px 8px #000;font:800 13px system-ui}
#tutArrow i{display:block;font-style:normal;font-size:48px;line-height:48px;filter:drop-shadow(0 0 8px rgba(255,200,80,.8));transition:transform .15s}
@keyframes tutIn{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}}`;
    document.head.appendChild(css);
    el = document.createElement('div'); el.id = 'tut'; document.body.appendChild(el);
    arrow = document.createElement('div'); arrow.id = 'tutArrow'; arrow.innerHTML = '<i><svg width="48" height="48" viewBox="0 0 48 48"><path d="M24 3 L42 41 L24 32 L6 41 Z" fill="#ffd27a" stroke="#5a3a10" stroke-width="2.5" stroke-linejoin="round"/></svg></i><span></span>'; document.body.appendChild(arrow);
    el.addEventListener('click', e => { const b = e.target.closest('[data-l],[data-a]'); if (!b) return; e.stopPropagation(); const t = S_(); if (b.dataset.l && t) { t.lang = b.dataset.l; try { localStorage.setItem('soulhead_tut_lang', t.lang); } catch (x) { } render(); save(); } else if (b.dataset.a === 'skip') next('skip'); else if (b.dataset.a === 'off') toggle(); else if (b.dataset.a === 'dismiss') dismiss(); });
  }
  let lastKey = '';
  function render(c) {
    if (!el) build(); const G = gd(), t = S_(); c = c || ctx();
    const vis = !!(G && G.playing && modOn() && t && !t.off && !t.done && !(c.ui === 'intro'));
    cardOn = vis; el.style.display = vis ? 'block' : 'none';
    if (!vis) { arrow.style.display = 'none'; return; }
    const stp = STEPS[t.i]; if (!stp) return; const L = lang(), U = UIT[L], tx = stp[L.charAt(0) === 'z' ? 'z' : L === 'ja' ? 'j' : 'e'];
    const pct = Math.round((t.i / (STEPS.length - 1)) * 100);
    const key = [t.i, L, waiting, flashT > 0, pct].join('|');
    if (key !== lastKey) {
      lastKey = key;
      el.classList.toggle('wait', !!waiting);
      el.innerHTML = `<div class="ok">✓ ${U.ok}</div><div class="ch"><span>${CHN[L][stp.ch]}</span><span>${t.i + 1} / ${STEPS.length}</span></div><div class="bar"><i style="width:${pct}%"></i></div><h4>${tx[0]}</h4><div class="bd">${tx[1]}</div>`
        + (waiting ? `<div class="wt">⏳ ${U.wait[waiting]}</div>` : '')
        + `<div class="bt"><button data-a="skip">${U.skip} ⏎</button><button data-a="off">${U.off} F9</button></div>`
        + `<div class="ft"><span>${U.hint}</span><span class="lg">${LANGS.map(l => `<button data-l="${l}" class="${l === L ? 'on' : ''}">${LN[l]}</button>`).join('')}</span></div>`;
    }
    if (flashT > 0) { flashT -= 0.25; el.classList.add('flash'); } else el.classList.remove('flash');
    // 箭头
    const tg = stp.go && !waiting && !c.inWorld && !c.ui && c.P ? stp.go(c) : null;
    if (tg && c.P) {
      const dx = tg.x - c.P.pos.x, dz = tg.z - c.P.pos.z, yaw = c.P.yaw, f = [-Math.sin(yaw), -Math.cos(yaw)], r = [Math.cos(yaw), -Math.sin(yaw)];
      const ang = Math.atan2(dx * r[0] + dz * r[1], dx * f[0] + dz * f[1]); arrow.style.display = 'block';
      arrow.firstChild.style.transform = `rotate(${ang.toFixed(3)}rad)`;
      arrow.lastChild.textContent = '🧭 ' + Math.hypot(dx, dz).toFixed(1) + ' m';
    } else arrow.style.display = 'none';
  }

  function init() {
    evInit(); if (ctxPoll) return;
    ctxPoll = setInterval(() => { try { poll(); } catch (e) { console.warn('Tutorial poll', e); } }, 250);
  }
  init();
  return { restart, toggle, start, next, STEPS, _EV: EV, _state: () => ({ t: S_(), st, waiting, cardOn }), poll };
})();
