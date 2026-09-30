// R40：按键一览（用户：“我现在完全不知道各种按键”）。MOD `keyguide`（默认开）。
// F1 或 ？ 打开 / 关闭；标题菜单「⌨ 按键一览」按钮；右上角 ⌨ 小按钮（游戏中）。三语（中 / 日 / EN）原生文案，
// 语言跟随全局 I18N（没有 I18N 时读 localStorage soulhead_lang）；容器带 data-noi18n，避免被 DOM 翻译引擎二次处理 → 语言纯净。
// 面板打开时：按下的键在面板里会亮起（方便确认“我按的到底是哪个键”）。
window.KeyGuide = (() => {
  'use strict';
  const modOn = () => !window.Mods || !Mods.on || Mods.on('keyguide') !== false;
  const curLang = () => { let l = (window.I18N && I18N.lang) || localStorage.getItem('soulhead_lang') || 'zh'; return ['zh', 'ja', 'en'].includes(l) ? l : 'zh'; };

  // 每个键：[键帽数组, {zh,ja,en}]。键帽里 '+' 之类原样显示；用 | 分隔“或”。code 用于按下高亮。
  const SEC = [
    { ic: '🚶', t: { zh: '移动', ja: '移動', en: 'Move' }, rows: [
      [['W', 'A', 'S', 'D'], { zh: '前后左右走动', ja: '前後左右に移動', en: 'Walk' }],
      [['Shift'], { zh: '按住疾跑（耗体力）', ja: '押している間ダッシュ（スタミナ消費）', en: 'Hold to sprint (uses stamina)' }],
      [['C'], { zh: '按住下蹲', ja: '押している間しゃがむ', en: 'Hold to crouch' }],
      [['Space'], { zh: '跳跃', ja: 'ジャンプ', en: 'Jump' }],
      [['Mouse'], { zh: '转动视角', ja: '視点を動かす', en: 'Look around' }],
    ] },
    { ic: '⚔️', t: { zh: '战斗（先按 F 拔刀）', ja: '戦闘（まず F で抜刀）', en: 'Combat (press F to draw)' }, rows: [
      [['F'], { zh: '拔刀 / 收刀', ja: '抜刀 / 納刀', en: 'Draw / sheathe weapon' }],
      [['LMB'], { zh: '点一下出刀，连点三连斩；按住并甩鼠标 = 朝该方向斩', ja: 'クリックで斬る・連打で三連斬。押したままマウスを振ると、その方向へ斬る', en: 'Tap to slash, tap 3× for a combo; hold and flick the mouse to slash that way' }],
      [['RMB'], { zh: '按住格挡（轻移鼠标切换上下左右）', ja: '押している間ガード（マウスを軽く動かして上下左右を切替）', en: 'Hold to block (nudge the mouse to pick the side)' }],
      [['Q'], { zh: '闪身（朝你按的方向）', ja: '回避（押している方向へ）', en: 'Dodge (toward your move keys)' }],
      [['E'], { zh: '敌人露出破绽时处决', ja: '敵が隙を見せたら処刑', en: 'Execute when an enemy is open' }],
      [['1', '…', '0'], { zh: '技能快捷栏（Shift+1–0 为第二排）', ja: 'スキルバー（Shift+1–0 で2段目）', en: 'Skill hotbar (Shift+1–0 = second row)' }],
      [['H'], { zh: '喝药', ja: '回復薬を使う', en: 'Drink a potion' }],
    ] },
    { ic: '💀', t: { zh: '首级与麻袋', ja: '首級と麻袋', en: 'Heads & the sack' }, rows: [
      [['E'], { zh: '拿起 / 互动 / 搜刮', ja: '拾う / 調べる / 漁る', en: 'Pick up / interact / loot' }],
      [['LMB'], { zh: '把玩首级（抛接、转圈、戳脸）', ja: '首を弄ぶ（投げ受け・回す・つつく）', en: 'Play with a held head (toss, spin, poke)' }],
      [['RMB'], { zh: '投掷手中的首级', ja: '持っている首を投げる', en: 'Throw the held head' }],
      [['Wheel'], { zh: '转动手中首级的朝向', ja: '持っている首の向きを回す', en: 'Rotate the held head' }],
      [['V'], { zh: '换表情', ja: '表情を変える', en: 'Change expression' }],
      [['G'], { zh: '把首级放到准星位置', ja: '首を照準の位置に置く', en: 'Place the head at your crosshair' }],
      [['F'], { zh: '对着首级按：回忆（对视、抚摸、嗅闻……）', ja: '首に向かって：回想（見つめる・撫でる・嗅ぐ…）', en: 'Aim at a head: Recall (gaze, stroke, sniff…)' }],
      [['I'], { zh: '查看首级的来历与故事', ja: '首の素性と物語を見る', en: 'Read a head’s story' }],
      [['X', 'X'], { zh: '连按两次：碾碎首级吸魂 / 拆除建筑', ja: '2回連打：首を砕いて魂を吸う / 建物を解体', en: 'Press twice: crush a head for soul / demolish a build' }],
    ] },
    { ic: '🏰', t: { zh: '菜单与面板', ja: 'メニューとパネル', en: 'Menus & panels' }, rows: [
      [['Tab'], { zh: '总菜单：左边分类一键切换（总览 · 装备与背包 · 天赋 · 收藏 · 日志 · 设置…）', ja: 'メインメニュー：左の分類から切替（概要・装備と持ち物・才能・コレクション・日誌・設定…）', en: 'Main menu: switch pages from the left rail (overview, gear & bag, talents, collection, log, settings…)' }],
      [['B'], { zh: '建造', ja: '建築', en: 'Build' }],
      [['T'], { zh: '天赋面板', ja: 'タレントパネル', en: 'Talent panel' }],
      [['Z'], { zh: '装备与背包（菜单里的同一页）', ja: '装備と持ち物（メニュー内の同じページ）', en: 'Gear & bag (same page of the menu)' }],
      [['K'], { zh: '首级收藏册', ja: '首級コレクション', en: 'Head collection' }],
      [['L'], { zh: '狩猎日志', ja: '狩りの記録', en: 'Hunt logs' }],
      [['U'], { zh: '食人魔猎手 / 精英挑战', ja: 'オーガハンター / エリート挑戦', en: 'Ogre hunters / elite challenges' }],
      [['Y'], { zh: '神灵簿', ja: '精霊名簿', en: 'Spirit book' }],
      [['J'], { zh: '成就', ja: '実績', en: 'Achievements' }],
    ] },
    { ic: '⚙️', t: { zh: '系统', ja: 'システム', en: 'System' }, rows: [
      [['Esc'], { zh: '暂停 / 关闭面板 / 释放鼠标', ja: '一時停止 / パネルを閉じる / マウス解放', en: 'Pause / close panel / free the mouse' }],
      [['O'], { zh: 'MOD 面板（所有功能开关）', ja: 'MODパネル（機能のオン/オフ）', en: 'MOD panel (toggle every feature)' }],
      [['M'], { zh: '音乐开关', ja: 'BGMのオン/オフ', en: 'Music on / off' }],
      [['P'], { zh: '电影模式（自由飞行镜头，[ ] 调速）', ja: 'シネマモード（自由カメラ、[ ] で速度）', en: 'Film mode (free camera, [ ] = speed)' }],
      [['F9'], { zh: '关闭 / 重开新手教程', ja: 'チュートリアルの表示切替', en: 'Toggle the tutorial' }],
      [['F1', '?'], { zh: '本按键一览', ja: 'このキー一覧', en: 'This key guide' }],
    ] },
  ];
  const TXT = {
    zh: { title: '按键一览', sub: '魂首窟 · 操作速查', tip: '点击窗口以锁定鼠标；Esc 释放鼠标。', hero: ['先做这三件事', ['WASD 走动，鼠标看', '出洞后按 F 拔刀，左键挥砍、右键格挡', '砍倒对手，E 拿起首级，带回洞里把玩出魂晶']], close: '关闭', open: '⌨ 按键一览', btn: '按键 F1' },
    ja: { title: 'キー一覧', sub: '魂首窟 · 操作早見表', tip: '画面をクリックしてマウスをロック。Esc で解除。', hero: ['まずはこの3つ', ['WASD で移動、マウスで視点', '外に出たら F で抜刀。左クリックで斬り、右クリックでガード', '敵を倒して E で首を拾い、洞窟で弄んで魂晶を得る']], close: '閉じる', open: '⌨ キー一覧', btn: 'キー F1' },
    en: { title: 'Key Guide', sub: 'Soulhead Cave · Controls cheat-sheet', tip: 'Click the window to lock the mouse; Esc releases it.', hero: ['Do these three first', ['WASD to walk, mouse to look', 'Outside, press F to draw — LMB slashes, RMB blocks', 'Drop a foe, press E to take the head, play with it in the cave for crystals']], close: 'Close', open: '⌨ Key Guide', btn: 'Keys F1' },
  };

  // R44：图形化操作图（少文字：键帽 + 图标 + 一两个字）
  const VW = { // 词表 [zh, ja, en]
    move: ['移动', '移動', 'MOVE'], combat: ['战斗', '戦闘', 'COMBAT'], loot: ['首级 · 菜单', '首級・メニュー', 'HEADS · MENU'],
    sprint: ['疾跑', 'ダッシュ', 'Sprint'], jump: ['跳', 'ジャンプ', 'Jump'], crouch: ['蹲', 'しゃがみ', 'Crouch'], look: ['视角', '視点', 'Look'],
    slash: ['斩', '斬る', 'Slash'], block: ['挡', 'ガード', 'Block'], draw: ['拔刀', '抜刀', 'Draw'], dodge: ['闪身', '回避', 'Dodge'], exec: ['处决', '処刑', 'Execute'], heal: ['喝药', '回復', 'Heal'],
    grab: ['拾取', '拾う', 'Grab'], play: ['把玩', '弄ぶ', 'Play'], throw: ['投掷', '投げる', 'Throw'], menu: ['菜单', 'メニュー', 'Menu'], pause: ['暂停', '停止', 'Pause'], keys: ['按键表', 'キー表', 'Keys'], walk: ['走', '移動', 'Walk']
  };
  const MOUSE = (l, r, L) => `<div class="ms"><svg viewBox="0 0 90 130"><path class="b${l ? ' on1' : ''}" d="M45 6 H30 Q8 6 8 30 V58 H45 Z"/><path class="b${r ? ' on2' : ''}" d="M45 6 H60 Q82 6 82 30 V58 H45 Z"/><path class="bd" d="M8 64 H82 V86 Q82 124 45 124 Q8 124 8 86 Z"/><rect class="w" x="40" y="18" width="10" height="24" rx="5"/></svg>${l ? `<b class="l1">${VW.slash[L]}</b>` : ''}${r ? `<b class="l2">${VW.block[L]}</b>` : ''}</div>`;
  function visual(L) {
    const i = n => VW[n][{ zh: 0, ja: 1, en: 2 }[L]];
    const K = (k, n, cls) => `<div class="kk ${cls || ''}"><span class="cap big" data-c="${capCode(k)}">${esc(k)}</span><small>${esc(i(n))}</small></div>`;
    const M = (l, r) => MOUSE(l, r, { zh: 0, ja: 1, en: 2 }[L]);
    const card = (ic, t, inner) => `<div class="vc"><h4><i>${ic}</i>${esc(i(t))}</h4><div class="vb">${inner}</div></div>`;
    const wasd = `<div class="wasd"><span class="cap big" data-c="KeyW">W</span><span class="cap big" data-c="KeyA">A</span><span class="cap big" data-c="KeyS">S</span><span class="cap big" data-c="KeyD">D</span></div>`;
    return `<div class="vis">
      ${card('🚶', 'move', `<div class="vrow">${wasd}<div class="vcol">${K('Shift', 'sprint', 'wide')}${K('Space', 'jump', 'wide')}${K('C', 'crouch')}</div>${M(0, 0).replace('<div class="ms">', '<div class="ms"><em>' + esc(i('look')) + '</em>')}</div>`)}
      ${card('⚔️', 'combat', `<div class="vrow">${M(1, 1)}<div class="vgrid">${K('F', 'draw')}${K('Q', 'dodge')}${K('E', 'exec')}${K('H', 'heal')}</div></div>`)}
      ${card('💀', 'loot', `<div class="vgrid g3">${K('E', 'grab')}<div class="kk"><span class="cap big mini">LMB</span><small>${esc(i('play'))}</small></div><div class="kk"><span class="cap big mini">RMB</span><small>${esc(i('throw'))}</small></div>${K('Tab', 'menu')}${K('Esc', 'pause')}${K('F1', 'keys')}</div>`)}
    </div>`;
  }
  let root = null, isOpen = false;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const capCode = k => ({ W: 'KeyW', A: 'KeyA', S: 'KeyS', D: 'KeyD', Shift: 'ShiftLeft', Space: 'Space', Tab: 'Tab', Esc: 'Escape', F1: 'F1', F9: 'F9', '?': 'Slash' }[k] || (/^[A-Z]$/.test(k) ? 'Key' + k : /^[0-9]$/.test(k) ? 'Digit' + k : ''));

  function css() {
    if (document.getElementById('kgcss')) return;
    const s = document.createElement('style'); s.id = 'kgcss';
    s.textContent = `
#kg{position:fixed;inset:0;z-index:95;display:none;align-items:center;justify-content:center;background:rgba(4,2,2,.82);backdrop-filter:blur(3px);font-family:"Noto Sans CJK SC","Noto Sans CJK JP","Noto Sans",system-ui,sans-serif;color:#eadcc4}
#kg.on{display:flex}
#kg .box{width:min(1120px,96vw);max-height:94vh;overflow:auto;background:linear-gradient(180deg,#1c120d,#0e0806);border:1px solid #8a6a3a;box-shadow:0 0 0 1px #000,0 20px 80px #000,inset 0 0 60px rgba(120,40,20,.25);clip-path:polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px);padding:20px 26px 16px}
#kg h2{margin:0;font:700 26px/1.1 "Noto Serif CJK SC","Noto Serif CJK JP",Georgia,serif;letter-spacing:.14em;color:#ffd27a;display:flex;align-items:baseline;gap:14px}
#kg h2 small{font:12px/1 system-ui;letter-spacing:.18em;color:#b59a70;text-transform:uppercase}
#kg .x{margin-left:auto;background:none;border:1px solid #6d5430;color:#dcc79c;padding:4px 12px;cursor:pointer;font:13px system-ui}
#kg .x:hover{border-color:#ffd27a;color:#fff}
#kg .hero{margin:12px 0 10px;padding:10px 14px;background:linear-gradient(90deg,rgba(140,40,24,.45),rgba(60,20,14,.2));border-left:3px solid #d8452e;display:flex;gap:22px;flex-wrap:wrap;align-items:center}
#kg .hero b{color:#ffcf70;letter-spacing:.06em}
#kg .hero ol{margin:0;padding:0;list-style:none;display:flex;gap:18px;flex-wrap:wrap;counter-reset:n}
#kg .hero li{counter-increment:n;font-size:13.5px;max-width:300px}
#kg .hero li:before{content:counter(n);display:inline-block;width:20px;height:20px;line-height:20px;text-align:center;border-radius:50%;background:#d8452e;color:#fff;font-weight:700;font-size:12px;margin-right:8px}
#kg .grid{columns:3 320px;column-gap:16px}
#kg .sec{break-inside:avoid;margin:0 0 12px;border:1px solid #4a3822;background:rgba(255,220,160,.035);padding:8px 12px 6px}
#kg .sec h3{margin:0 0 6px;font-size:14px;letter-spacing:.08em;color:#ffcf70;font-weight:700}
#kg .r{display:flex;align-items:flex-start;gap:10px;padding:4px 0;border-top:1px dashed rgba(180,140,80,.16);font-size:12.5px;line-height:1.45}
#kg .r:first-of-type{border-top:0}
#kg .ks{flex:0 0 auto;width:96px;display:flex;flex-wrap:wrap;gap:3px}
#kg .r .d{flex:1;color:#dccdb0}
#kg .cap{display:inline-block;min-width:22px;padding:2px 5px 3px;text-align:center;font:700 12px/1.3 "SF Mono",Consolas,"Noto Sans Mono",monospace;color:#ffe3a6;background:linear-gradient(180deg,#3a2a1c,#22160f);border:1px solid #8a6a3a;border-bottom-width:3px;border-radius:5px;box-shadow:0 1px 0 #000}
#kg .cap.hit{background:#ffcf70;color:#2a1608;border-color:#fff2c0;transform:translateY(2px);border-bottom-width:1px}
#kg .ft{margin-top:6px;display:flex;justify-content:space-between;font-size:11.5px;color:#9b8562}
#kg .vis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:14px 0 16px}
@media(max-width:900px){#kg .vis{grid-template-columns:1fr}}
#kg .vc{position:relative;padding:12px 16px 16px;background:radial-gradient(120% 90% at 0 0,rgba(216,69,46,.22),transparent 60%),linear-gradient(180deg,#22150f,#100908);border:1px solid #6d5430;border-top:3px solid #d8452e;clip-path:polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)}
#kg .vc h4{margin:0 0 12px;display:flex;align-items:center;gap:10px;font:900 22px/1 "Noto Serif CJK SC","Noto Serif CJK JP",Georgia,serif;letter-spacing:.2em;color:#ffd27a}
#kg .vc h4 i{font-style:normal;font-size:26px}
#kg .vrow{display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap}
#kg .vcol{display:flex;flex-direction:column;gap:8px}
#kg .wasd{display:grid;grid-template-columns:repeat(3,54px);grid-template-rows:repeat(2,54px);gap:6px}
#kg .wasd .cap:nth-child(1){grid-column:2;grid-row:1}#kg .wasd .cap:nth-child(2){grid-column:1;grid-row:2}#kg .wasd .cap:nth-child(3){grid-column:2;grid-row:2}#kg .wasd .cap:nth-child(4){grid-column:3;grid-row:2}
#kg .cap.big{min-width:54px;height:54px;display:inline-flex;align-items:center;justify-content:center;font-size:22px;border-radius:8px;border-width:2px;border-bottom-width:6px;padding:0 8px;box-shadow:0 4px 10px rgba(0,0,0,.5)}
#kg .cap.big.mini{font-size:15px;letter-spacing:.04em}
#kg .cap.big.hit{border-bottom-width:2px;transform:translateY(4px)}
#kg .kk{display:flex;flex-direction:column;align-items:center;gap:5px} #kg .kk small{font-size:16px;font-weight:700;color:#f1e3c4;letter-spacing:.08em;white-space:nowrap}
#kg .kk.wide .cap.big{min-width:96px;font-size:17px;height:40px;border-bottom-width:5px}
#kg .kk.wide{flex-direction:row;gap:10px}
#kg .vgrid{display:grid;grid-template-columns:repeat(2,auto);gap:12px 22px} #kg .vgrid.g3{grid-template-columns:repeat(3,1fr);justify-items:center;gap:14px 10px}
#kg .ms{position:relative;width:86px;flex:none;text-align:center} #kg .ms svg{width:86px;height:124px;display:block;filter:drop-shadow(0 4px 8px rgba(0,0,0,.6))}
#kg .ms .b,#kg .ms .bd{fill:#2a1c12;stroke:#8a6a3a;stroke-width:2.5} #kg .ms .w{fill:#8a6a3a}
#kg .ms .b.on1{fill:#d8452e;stroke:#ffb09a;filter:drop-shadow(0 0 7px #ff5a3a)} #kg .ms .b.on2{fill:#3a82d8;stroke:#a8d2ff;filter:drop-shadow(0 0 7px #4a9aff)}
#kg .ms b{position:absolute;top:-2px;font:900 17px/1 "Noto Serif CJK SC",serif;padding:2px 6px;background:rgba(0,0,0,.6);border-radius:4px;white-space:nowrap}
#kg .ms b{top:auto;bottom:-30px;font-size:18px} #kg .ms b.l1{left:-6px;color:#ff9a84} #kg .ms b.l2{right:-6px;color:#9ccaff}
#kg .vrow:has(.ms b){padding-bottom:30px}
#kg .ms em{position:absolute;left:0;right:0;bottom:-24px;font:700 16px/1 system-ui;font-style:normal;color:#f1e3c4;letter-spacing:.08em}
#kg .vrow:has(.ms em){padding-bottom:22px}
#kg .r{font-size:15px!important;line-height:1.5!important} #kg .sec h3{font-size:17px!important} #kg .cap{font-size:14px!important} #kg .ks{width:108px!important}
#kg .ft{font-size:14px!important}
#kgBtn{position:fixed;right:14px;bottom:46px;z-index:30;display:none;background:rgba(20,12,8,.75);border:1px solid #6d5430;color:#dcc79c;padding:4px 10px;font:12px system-ui;cursor:pointer}
#kgBtn:hover{border-color:#ffd27a;color:#fff}`;
    document.head.appendChild(s);
  }
  function render() {
    if (!root) return;
    const L = curLang(), T = TXT[L];
    const secs = SEC.map(s => `<div class="sec"><h3>${s.ic} ${esc(s.t[L])}</h3>` + s.rows.map(r =>
      `<div class="r"><div class="ks">${r[0].map(k => `<span class="cap" data-c="${capCode(k)}">${esc(k)}</span>`).join('')}</div><div class="d">${esc(r[1][L])}</div></div>`).join('') + '</div>').join('');
    root.innerHTML = `<div class="box"><h2>⌨ ${esc(T.title)} <small>${esc(T.sub)}</small><button class="x" data-x="1">${esc(T.close)} · Esc</button></h2>
${visual(L)}
<div class="grid">${secs}</div><div class="ft"><span>${esc(T.tip)}</span><span>F1 / ?</span></div></div>`;
    const b = document.getElementById('kgBtn'); if (b) b.textContent = T.btn;
    const tb = document.getElementById('kgTitleBtn'); if (tb) tb.textContent = T.open;
  }
  function open() {
    if (!modOn()) return; css();
    if (!root) { root = document.createElement('div'); root.id = 'kg'; root.setAttribute('data-noi18n', ''); root.addEventListener('mousedown', e => { if (e.target === root || e.target.dataset.x) close(); }); document.body.appendChild(root); }
    render(); root.classList.add('on'); isOpen = true;
    try { if (window.G && G.playing && G.setUI) { G.setUI(true); } else if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { }
  }
  function close() {
    if (!isOpen) return; root.classList.remove('on'); isOpen = false;
    try { if (window.G && G.playing && G.setUI) G.setUI(false); } catch (e) { }
  }
  const toggle = () => (isOpen ? close() : open());
  function typing(e) { const a = document.activeElement; return a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) || (a && a.isContentEditable); }
  addEventListener('keydown', e => {
    if (!modOn()) return;
    if (isOpen) {
      e.stopImmediatePropagation(); e.preventDefault();
      if (e.code === 'Escape' || e.code === 'F1' || (e.key === '?' && !e.repeat)) { close(); return; }
      root.querySelectorAll('.cap[data-c="' + e.code + '"]').forEach(c => c.classList.add('hit')); return;
    }
    if (e.repeat || typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    const g = window.G; if (g && g.uiOpen) return;
    if (e.code === 'F1' || (e.key === '?' && g && g.playing)) { e.preventDefault(); e.stopImmediatePropagation(); open(); }
  }, true);
  addEventListener('keyup', e => { if (isOpen) { e.stopImmediatePropagation(); root.querySelectorAll('.cap.hit').forEach(c => c.classList.remove('hit')); } }, true);
  function mount() {
    css();
    if (!document.getElementById('kgBtn')) { const b = document.createElement('div'); b.id = 'kgBtn'; b.setAttribute('data-noi18n', ''); b.onclick = e => { e.stopPropagation(); open(); }; document.body.appendChild(b); }
    const tb = document.getElementById('kgTitleBtn'); if (tb) tb.onclick = e => { e.stopPropagation(); open(); };
    render0();
  }
  function render0() { const T = TXT[curLang()]; const b = document.getElementById('kgBtn'); if (b) { b.textContent = T.btn; b.style.display = modOn() ? 'block' : 'none'; } const tb = document.getElementById('kgTitleBtn'); if (tb) { tb.textContent = T.open; tb.style.display = modOn() ? '' : 'none'; } }
  if (window.I18N && I18N.onChange) I18N.onChange(() => { render0(); if (isOpen) render(); });
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', mount); else mount();
  return { open, close, toggle, get isOpen() { return isOpen; }, SEC, TXT, render0 };
})();
