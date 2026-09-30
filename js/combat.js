// 第十四轮 · 手势战斗内核（MOD：gesture_combat）
// F 拔刀/收刀。拔刀后：
//   按住左键 = 刀尖锁在准星上（第十八轮），鼠标转动视角 → 刀光就是准星轨迹（上撩/下劈/横斩）；伤害取决于刃尖真实速度
//   快速点击左键 = 刺（连点连刺）
//   按住右键 = 格挡；按住时移动鼠标 = 连续旋转格挡角度（第十六轮：不再只有 4 向，要对准敌人来刀的方向）
//   按住左键不动 0.7 秒 = 蓄力，下一刀重斩（破防、伤害 ×2.2）
// 命中判定：沿刃线取若干点，逐帧扫掠（上一帧→这一帧）对目标球体求交；目标由 Combat.addProvider 注册（敌人 AI 之后接入）
// 反馈：顿帧、屏震、火花、刃光拖尾、音效、体力
window.Combat = (() => {
  const V3 = THREE.Vector3;
  let G = null, cam = null, vm = null, wpn = null, fist = null;
  let drawn = false, enabled = false;
  const WEIGHT = [0.85, 0.95, 0.8, 1.2, 1.25, 0.9, 1.0]; /* R37：废铁武器减重（以前钉头棒1.3/流星锤1.5，前摇+冷却太长，只能按住左键晃鼠标才出刀） */
  const MT = () => (window.Balance && Balance.on()) ? Balance.m() : { wu: 1, sw: 1, cd: 1, st: 1, dmg: 1 }; /* R43：武技熟练度——新手前摇 / 出刀 / 收招都更慢、体力更费，见 js/balance.js */
  const WK = (w) => Math.pow(Math.max(0.6, w || 1), 0.35); /* R37：重量对节奏的影响（以前 sqrt） */
  const PF = () => window.WpnX ? WpnX.pf() : null; /* R41主管 MOD wpn_stats：每把武器自己的前摇/出刀/后摇/体力倍率（替代单一自重 WK） */
  const KW = (k) => { const p = PF(); return p ? p[k] : WK(S.wt); };
  const CDB = { light: 380, fin: 560, heavy: 800 }; /* R37：冷却基数（以前 500/750/950） */
  window.CombatTune = { WEIGHT, WK, CDB, WU: { light: 0.06, fin: 0.08, heavy: 0.05 }, SW: { light: 0.14, fin: 0.2, heavy: 0.24 } };
  // 相机空间：x 右，y 上，-z 前
  const IDLE_H = new V3(0.24, -0.23, -0.5), IDLE_B = new V3(-0.22, 0.92, -0.32).normalize();
  const PIVOT = new V3(0.06, -0.38, 0.22); // 右肩/胸口：刃从这里向外辐射
  const S = {
    hand: IDLE_H.clone(), hv: new V3(), mv: new V3(), mAcc: new V3(), tgt: IDLE_H.clone(), blade: IDLE_B.clone(), bladeT: IDLE_B.clone(),
    lmb: false, rmb: false, lmbT: 0, drag: 0, ctrl: { x: 0.6, y: -0.6 },
    thrust: 0, thrustQ: 0, thrustSide: 1, guard: { x: 0, y: 1 }, gdir: 'up',
    stam: 100, stop: 0, gAng: Math.PI / 2, gHist: [], charge: 0, charged: 0, shake: 0, lastTip: null, lastBase: null, tipSpeed: 0, swingSnd: 0, hitCd: new Map(), len: 0.8, wt: 1, edge: new V3(1, 0, 0)
  };
  // ===== 第二十二轮（用户）：蓄势挥击（MOD release_slash，默认开，需要 gesture_combat）=====
  // 按住左键 = 蓄势（视角 1:1 跟手，刀向“趋势”的反方向拉开）；松开左键 = 捕捉松手前的鼠标微趋势 → 沿该方向挥出一刀。
  //   没有趋势：短按 = 突刺；长按 ≥0.7s（蓄力）无趋势 = 直劈。按住期间刀尖本身不再造成伤害（只有松手那一刀和突刺）。
  const RS = () => !window.Mods || !Mods.on || Mods.on('release_slash') !== false;
  const RH = []; // 鼠标历史 [ms, dx, dyUp]
  function rsTrend(nowMs, tau) { // 时间加权（越近权重越大）的微趋势，返回 {x,y,m}；x 右 y 上，m = 加权像素量
    let x = 0, y = 0; tau = tau || 140;
    for (let i = RH.length - 1; i >= 0; i--) { const age = nowMs - RH[i][0]; if (age > 320) break; const w = Math.exp(-age / tau); x += RH[i][1] * w; y += RH[i][2] * w; }
    return { x, y, m: Math.hypot(x, y) };
  }
  function snap8(x, y) { const a = Math.atan2(y, x), k = Math.PI / 4, n = Math.round(a / k), d = a - n * k; const b = Math.abs(d) < 0.25 ? n * k : a; return [Math.cos(b), Math.sin(b)]; } // 14° 内吸附到 8 方向
  const providers = [];
  const addProvider = (f) => providers.push(f);

  // ---------- 刃光拖尾（特效，不是模型）----------
  const TN = 14; let trail = null;
  function makeTrail() {
    const geo = new THREE.BufferGeometry(); const pos = new Float32Array(TN * 2 * 3), col = new Float32Array(TN * 2 * 3); const idx = [];
    for (let i = 0; i < TN - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setIndex(idx); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    m.frustumCulled = false; m.userData.noShadow = true; m.renderOrder = 5; m.visible = false;
    return { m, pts: [], col: new THREE.Color('#ffe2b0') };
  }
  function pushTrail(base, tip, speed) {
    const t = trail; t.pts.unshift({ b: base.clone(), t: tip.clone(), s: speed }); if (t.pts.length > TN) t.pts.pop();
    const pa = t.m.geometry.attributes.position, ca = t.m.geometry.attributes.color; let any = false;
    for (let i = 0; i < TN; i++) {
      const p = t.pts[Math.min(i, t.pts.length - 1)]; pa.setXYZ(i * 2, p.b.x, p.b.y, p.b.z); pa.setXYZ(i * 2 + 1, p.t.x, p.t.y, p.t.z);
      const k = Math.max(0, Math.min(1, (p.s - 2.5) / 6)) * (1 - i / TN) ** 1.6; if (k > 0.01) any = true;
      ca.setXYZ(i * 2, t.col.r * k * 0.15, t.col.g * k * 0.15, t.col.b * k * 0.15); ca.setXYZ(i * 2 + 1, t.col.r * k, t.col.g * k, t.col.b * k);
    }
    pa.needsUpdate = ca.needsUpdate = true; t.m.visible = any && !(window.CFX3D && CFX3D.trailOwn); // R41：cfx3d 开着时用它的拖尾 v2
  }

  // ---------- 体力条 ----------
  let hud = null;
  function makeHud() {
    const d = document.createElement('div'); d.id = 'combatHud';
    d.style.cssText = 'position:fixed;left:50%;top:calc(50% + 26px);transform:translateX(-50%);width:120px;height:5px;border-radius:3px;background:rgba(0,0,0,.45);pointer-events:none;display:none;z-index:20;box-shadow:0 0 6px rgba(0,0,0,.6)';
    const b = document.createElement('i'); b.style.cssText = 'display:block;height:100%;width:100%;border-radius:3px;background:linear-gradient(90deg,#ffd27a,#ff9a3a);transition:width .08s';
    const g = document.createElement('div'); g.style.cssText = 'position:absolute;left:50%;top:-44px;transform:translateX(-50%);font:600 13px sans-serif;color:#cfe6ff;text-shadow:0 1px 3px #000;opacity:0;transition:opacity .15s;white-space:nowrap';
    const c = document.createElement('i'); c.style.cssText = 'position:absolute;left:0;top:8px;display:block;height:3px;width:0;border-radius:2px;background:#9fe0ff;box-shadow:0 0 6px #6cf';
    const ar = document.createElement('i'); ar.style.cssText = 'position:absolute;left:50%;top:-26px;width:46px;height:2px;margin-top:-1px;transform-origin:0 50%;background:linear-gradient(90deg,rgba(255,226,176,0),#ffe2b0);opacity:0;pointer-events:none;border-radius:1px';
    d.appendChild(b); d.appendChild(g); d.appendChild(c); d.appendChild(ar); document.body.appendChild(d); return { d, b, g, c, a: ar };
  }

  function init(game) {
    G = game; cam = G.camera; vm = G.vm; enabled = !window.Mods || Mods.on('gesture_combat');
    trail = makeTrail(); G.scene.add(trail.m); hud = makeHud();
    addProvider(headTargets);
  }
  function grabWeapon() {
    wpn = G.weapon; fist = G.fist; if (!wpn) return;
    const t = (G.S.eq && G.S.eq.weapon) || 0; S.len = (wpn.userData && wpn.userData.len) || 0.8; S.wt = WEIGHT[Math.min(t, WEIGHT.length - 1)];
    if (!wpn.userData.rest) wpn.userData.rest = { p: wpn.position.clone(), r: wpn.rotation.clone() };
  }
  function toggle(force) {
    if (!enabled) return false;
    drawn = force == null ? !drawn : !!force; grabWeapon();
    if (drawn) {
      vm.userData.rest = vm.userData.rest || { p: vm.position.clone(), r: vm.rotation.clone() };
      vm.position.set(0, 0, 0); vm.rotation.set(0, 0, 0); if (fist) fist.visible = false;
      M.combo = 0; M.buf = 0; M.endT = -9999; S.hand.set(0.2, -0.55, -0.35); S.hv.set(0, 0, 0); S.blade.copy(IDLE_B); S.lastTip = null; trail.pts.length = 0; S.stam = Math.max(S.stam, 30);
      if (window.CombatFX && CombatFX.on) CombatFX.draw(true); else SFX.play('draw', 0.7); if (G.toast) { const n = +(localStorage.getItem('sh_drawN') || 0); try { localStorage.setItem('sh_drawN', n + 1); } catch (e) { } // R40b：完整说明只在前 2 次拔刀显示，之后只给一行短提示（长字幕会盖住画面/底栏）
        if (!(window.Mods && Mods.on('hud_legible') === false)) { const L = (window.I18N && I18N.lang) || localStorage.getItem('soulhead_lang') || 'zh'; const SH = { zh: '⚔️ 拔刀 · 左键出刀 · 右键格挡 · Q 闪身 · F 收刀 · F1 按键表', ja: '⚔️ 抜刀 · 左クリック=斬る · 右=ガード · Q=回避 · F=納刀 · F1=操作一覧', en: '⚔️ Drawn · LMB slash · RMB block · Q dodge · F sheathe · F1 all keys' }; const tag = window.Balance && Balance.on() ? ' 【' + Balance.stage().name + '】' : ''; G.toast((SH[L] || SH.zh) + tag, '#ffd27a', n >= 2 ? 2.6 : 4); }
        else G.toast((MM() ? '⚔️ 拔刀：点左键＝立刻出刀，连点三下＝三连斩（终结更重）· 按住左键甩一下鼠标＝朝那个方向斩 · 按住不动 0.6 秒再松开＝重斩（破防）· 右键格挡 · Q 闪身 · 准星指哪打哪（对准脖子可斩首）' : RS() ? '⚔️ 拔刀：按住左键＝蓄势（刀向反方向拉开）· 微微带一下鼠标定方向 · 松开＝沿该方向挥出（蓄满 0.7 秒=重斩，不带方向=直劈）· 点一下=刺' : '⚔️ 拔刀：按住左键＝刀尖锁在准星上，转动视角挥砍（不动 0.7 秒=蓄力重斩）· 连点刺') + ' · 右键格挡并转动鼠标对准红色来刀弧 · Q 闪身 · 破绽时 E 处决 · F 收刀', '#ffd27a', 4); }
    } else {
      const r = vm.userData.rest; if (r) { vm.position.copy(r.p); vm.rotation.copy(r.r); }
      if (wpn && wpn.userData.rest) { wpn.position.copy(wpn.userData.rest.p); wpn.rotation.copy(wpn.userData.rest.r); }
      if (fist) fist.visible = !(wpn && wpn.userData.asset);
      S.lmb = S.rmb = false; trail.m.visible = false; hud.d.style.display = 'none'; if (window.CombatFX && CombatFX.on) CombatFX.draw(false); else SFX.play('draw', 0.45, 0.8);
    }
    return true;
  }
  function onWeapon() { if (!G) return; const was = drawn; if (was) { drawn = false; toggle(true); } else grabWeapon(); }


  // ===== 第二十六轮（用户：战斗手感很差、打不死人）：大师级战斗（MOD combat_master，默认开）=====
  // 旧版的问题（测试台实测）：① 按住左键+挥鼠标伤害恒为 0 ② 命中靠刃尖逐帧扫过骨骼胶囊，瞄不准整刀落空 ③ 体力 100 只够 ~9 刀，空挥即力竭 ④ 蓄势松手才出刀（延迟 + 不直觉）。
  // 新版：
  //   · 点一下左键 = 立刻出刀（按下即挥）：连点 = 三连斩（横斩 → 反手 → 下劈终结，终结更重），连击 1.1 秒内不断；出刀中再点会被缓冲，收招那一刻立即接上
  //   · 按住左键甩一下鼠标 = 朝甩的方向斩（8 方向）；按住不动 0.6 秒 = 蓄力，松开 = 重斩（破防 ×2.2、大范围）
  //   · 判定 = 视野锥内“刃到了就命中”（前方 ~±46° · 射程随刃长 · 出刀会向目标踏步），刃扫过目标那一刻才结算（画面和伤害同步），多个敌人可一刀同时命中
  //   · 部位由准星决定：准星指头/脖子/腿就打那里（斩首要瞄脖子）；没瞄准也算胸口，不会落空
  //   · 反馈：屏震 + 镜头沿斩向轻压/侧倾 + FOV 冲击 + 刀身后坐 + 命中回体力；不冻结画面
  const MM = () => !window.Mods || !Mods.on || Mods.on('combat_master') !== false;
  const M = { combo: 0, endT: -9999, buf: 0, bufType: null, kick: { p: 0, r: 0, f: 0 }, fovOn: false, baseFov: 75, hitT: 0, toasted: false, pipKey: '' };
  const COMBO = [[-1, -0.28, 'light'], [1, 0.18, 'light'], [0, -1, 'fin']];
  const _mc = new V3(), _ml = new V3(), _mo = new V3(), _mf = new V3(), _md = new V3(), _mz = new V3(), _mz2 = new V3();
  function rhSum(ms, win) { let x = 0, y = 0; for (let i = RH.length - 1; i >= 0; i--) { if (ms - RH[i][0] > win) break; x += RH[i][1]; y += RH[i][2]; } return { x, y, m: Math.hypot(x, y) }; }
  function mmSpend(n, kind) { if (window.Stamina && Stamina.on) return Stamina.spend(n, kind); if (S.stam < n * 0.3) return false; S.stam = Math.max(0, S.stam - n); return true; }
  function mmPick() { // 出刀瞬间挑目标：准星附近最近的活敌人（比旧辅助瞄准更宽：±43° · 4.2 米）
    if (!G || !G.player) return null; const center = G.player.pos; let list = [];
    for (const p of providers) { try { list = list.concat(p(center) || []); } catch (e) {} }
    cam.updateMatrixWorld(); const foes = (window.Foe && Foe.foes) || []; let best = null, bs = 1e9;
    for (const tg of list) {
      if (tg.kind !== 'foe' && tg.kind !== 'boss' && tg.kind !== 'prey') continue;
      const fo = foes.find(f => f.id2 === tg.id); if (fo && (fo.dead || fo.escaped)) continue; if (/_hp$/.test(String(tg.id))) continue;
      chestOf(tg, fo, _ml); cam.worldToLocal(_ml); const d = _ml.length(); if (_ml.z > -0.3 || d > 4.2) continue;
      const ax = Math.atan2(Math.abs(_ml.x), -_ml.z), ay = Math.atan2(Math.abs(_ml.y), -_ml.z); if (ax > 0.75 || ay > 0.7) continue;
      const sc = ax + ay * 0.6 + d * 0.06; if (sc < bs) { bs = sc; best = { fo, wp: tg.pos.clone(), d, tid: tg.id, tg }; }
    }
    return best;
  }
  function chestOf(tg, fo, out) { if (fo && fo.f && fo.f.bones && fo.f.bones.chest) fo.f.bones.chest.getWorldPosition(out); else { out.copy(tg.pos); if (tg.kind === 'foe' || tg.kind === 'boss') out.y += 0.3; } return out; }
  function mmDir(ms, pre) { // 方向：最近的鼠标趋势 → 8 向吸附/连续角度；按下瞬间看按下前 120ms（≥9px），按住时 160ms 内 ≥5px 就算（轻微偏移也能控制方向）；否则按连击序列
    const T = pre ? rhSum(ms, 120) : rhSum(ms, 160); if (T.m >= (pre ? 9 : 5)) { const [dx, dy] = snap8(T.x, T.y); return [dx, dy, M.combo >= 2 ? 'fin' : 'light']; }
    return COMBO[M.combo % 3];
  }
  // 第二十六轮(j)：攻击 CD（MOD atk_cd，默认开；用户：“攻击你最好设计 CD”）——轻斩 0.5s / 三连终结 0.75s / 重斩 0.95s（×√武器重量）才能出下一刀；
  //   CD 中按左键 = 缓冲一刀，CD 一结束立刻出（不吞输入）；准星外圈细弧显示 CD 进度。关掉 = 原来的无 CD 连斩。
  const CDM = () => !window.Mods || Mods.on('atk_cd') !== false;
  let cdEl = null;
  function mmCdUi() {
    if (typeof document === 'undefined') return; const ms = performance.now(), on = CDM() && drawn && M.cdUntil > ms && M.cdLen > 0;
    if (!cdEl) { if (!on) return; cdEl = document.createElement('div'); cdEl.id = 'atkCd'; cdEl.style.cssText = 'position:fixed;left:50%;top:50%;width:34px;height:34px;margin:-17px 0 0 -17px;pointer-events:none;z-index:9;transition:opacity .12s';
      cdEl.innerHTML = '<svg width="34" height="34" viewBox="0 0 34 34"><circle cx="17" cy="17" r="14" fill="none" stroke="#0007" stroke-width="3"/><circle class="p" cx="17" cy="17" r="14" fill="none" stroke="#ffe2b0" stroke-width="2" stroke-linecap="round" stroke-dasharray="88" stroke-dashoffset="88" transform="rotate(-90 17 17)"/></svg>'; document.body.appendChild(cdEl); }
    cdEl.style.opacity = on ? '0.85' : '0'; if (!on) return;
    const k = 1 - (M.cdUntil - ms) / M.cdLen; cdEl.querySelector('.p').setAttribute('stroke-dashoffset', (88 * (1 - Math.max(0, Math.min(1, k)))).toFixed(1));
  }
  function mmAttack(d, type) {
    if (!drawn || S.rmb || S.sw) return false; const heavy = type === 'heavy', fin = type === 'fin';
    if (CDM() && performance.now() < (M.cdUntil || 0)) { M.buf = performance.now(); M.bufType = heavy ? 'heavy' : null; if (heavy) M.bufD = [d[0], d[1]]; return false; } // CD 中：缓冲
    const as = mmPick(); // 第二十六轮（用户：一直点就没力气、砍不动）：体力 6/9/16 → 4/6/12；范围内没有敌人时空挥只耗 35%（追人、试刀不会被掏空）
    const mt = MT(), pf = PF(); if (!mmSpend((heavy ? 12 : fin ? 6 : 4) * (as ? 1 : 0.35) * mt.st * (pf ? pf.st : 1), heavy ? 'charged' : 'swing')) return false;
    const ex = ((window.Stamina && Stamina.ex) ? 1.3 : 1), kk = WK(S.wt) * ex, wu = (heavy ? 0.05 : fin ? 0.08 : 0.06) * (pf ? pf.wu * ex : kk) * mt.wu, dur = wu + (heavy ? 0.24 : fin ? 0.2 : 0.14) * (pf ? pf.sw * ex : kk) * mt.sw, pw = heavy ? 1 : fin ? 0.95 : 0.85;
    S.sw = { t: 0, dur, dx: d[0], dy: d[1], pw, charged: heavy, v: new V3(d[0], d[1], 0), hit: false, h0: S.hand.clone(), as, lunged: 0, rk: 1, mm: true, wu, ms0: performance.now(), type, step: M.combo, set: new Set(), sgn: -1, tid: as ? as.tid : null, hold: 0 };
    S.thrust = 0; S.thrustQ = 0; S.hitCd.clear(); S.charge = 0; S.charged = 0; M.buf = 0; M.bufType = null;
    M.combo = heavy ? 0 : (M.combo + 1) % 3; if (fin) M.combo = 0;
    if (CDM()) { M.cdLen = (heavy ? CDB.heavy : fin ? CDB.fin : CDB.light) * KW('cd') * ((window.Stamina && Stamina.ex) ? 1.3 : 1) * mt.cd; M.cdUntil = performance.now() + M.cdLen; }
    if (window.CombatFX && CombatFX.on) CombatFX.swing(d[0], d[1], pw, heavy); else SFX.play('draw', 0.4, heavy ? 0.9 : 1.3);
    return true;
  }
  function mmDown() {
    const ms = performance.now(); S.lmb = true; S.lmbT = ms; S.drag = 0; S.charge = 0; S.charged = 0;
    if (S.rmb) return;
    if (S.sw || ms - M.endT < 40) { M.buf = ms; M.bufType = null; return; }
    const d = mmDir(ms, true); mmAttack(d, d[2]);
  }
  function mmUp() {
    const ms = performance.now(); S.lmb = false; const heavy = S.charged > 0 && !S.rmb; S.charge = 0;
    if (heavy) { S.charged = 0; const T = rhSum(ms, 160), d = T.m >= 10 ? snap8(T.x, T.y) : [-0.6, -0.8]; if (!mmAttack([d[0], d[1], 'heavy'], 'heavy')) { M.buf = ms; M.bufType = 'heavy'; M.bufD = d; } }
    S.charged = 0;
  }
  function mmTick(dt) { // 每帧：连击超时 / 缓冲输入 / 甩鼠标出刀 / 蓄力
    const ms = performance.now(); if (!S.sw && M.combo && ms - M.endT > 1100) M.combo = 0;
    if (S.rmb) { M.buf = 0; S.charge = 0; return; }
    const cdOk = !CDM() || ms >= (M.cdUntil || 0);
    if (M.buf && !S.sw && ms - M.endT >= 35 && cdOk) { const ok = ms - M.buf < (CDM() ? Math.max(480, (M.cdLen || 0) + 220) : 320), ty = M.bufType; M.buf = 0; M.bufType = null; if (ok) { if (ty === 'heavy') mmAttack([M.bufD[0], M.bufD[1], 'heavy'], 'heavy'); else { const d = mmDir(ms); mmAttack(d, d[2]); } } }
    if (S.lmb && !S.sw && ms - M.endT > 45 && ms - S.lmbT > 60 && cdOk) { const T = rhSum(ms, 150); if (T.m >= 5) { // 按住左键 + 鼠标有任何偏移 = 朝那个方向连续出刀（不用大幅甩动）
         const [dx, dy] = snap8(T.x, T.y); RH.length = 0; mmAttack([dx, dy, M.combo >= 2 ? 'fin' : 'light'], M.combo >= 2 ? 'fin' : 'light'); return; } }
    if (S.lmb && !S.sw && ms - S.lmbT > 260 && ms - M.endT > 120 && rhSum(ms, 200).m < 26) { if (S.charged <= 0) { S.charge = Math.min(1, S.charge + dt / 0.6); if (S.charge >= 1) { S.charged = 9; try { SFX.play('draw', 0.6, 0.7); } catch (e) {} if (!M.toasted) { M.toasted = true; G.toast && G.toast('⚡ 蓄力完成：松开左键 = 重斩（破防）', '#ffd24a', 1.4); } } } }
    else if (!S.lmb) S.charge = 0;
    else if (S.sw) S.charge = 0;
  }
  function mmPose(dt, omega) {
    if (S.lmb && !S.rmb && (S.charge > 0 || S.charged > 0)) { const k = S.charged > 0 ? 1 : S.charge; S.tgt.set(0.3 + 0.06 * k, -0.22 + 0.14 * k, -0.3 + 0.05 * k); _st.set(0.36, 0.85 + 0.15 * k, 0.2 * (1 - k) - 0.1); S.bladeT.copy(_st).normalize(); return omega * 1.4; }
    const ready = performance.now() - M.endT < 1100 && M.combo > 0; // 连击中：刀保持在身前“戒备”位
    if (ready) { S.tgt.lerp(_st.set(0.22, -0.26, -0.4), Math.min(1, dt * 9)); S.bladeT.lerp(_mz.set(-0.1, 0.8, -0.55).normalize(), Math.min(1, dt * 8)).normalize(); }
    else { S.tgt.lerp(IDLE_H, Math.min(1, dt * 8)); S.bladeT.lerp(IDLE_B, Math.min(1, dt * 6)).normalize(); }
    return omega;
  }
  // 瞄点：相机射线最近的身体部位（准星指哪打哪）；终结下劈把射线压低一点 = 更容易砍到脖子/头
  const AIMZ = [['head', 0.78], ['neck', 0.8], ['upperChest', 0.95], ['chest', 0.85], ['spine', 0.95], ['hips', 1.0], ['leftUpperArm', 1.25], ['rightUpperArm', 1.25], ['leftUpperLeg', 1.05], ['rightUpperLeg', 1.05]];
  function aimPoint(fo, w, out) { // 返回部位名，点写进 out
    const B = fo.f && fo.f.bones; if (!B) return null; cam.getWorldPosition(_mo); _mf.set(0, 0, -1).transformDirection(cam.matrixWorld); if (w.type === 'fin') _mo.y -= 0.14;
    let best = null, bs = 0.8;
    for (const [z, wgt] of AIMZ) { const bo = B[z]; if (!bo || (fo.gone && fo.gone.has(z)) || (z === 'head' && fo.decap)) continue; bo.getWorldPosition(_mz); if (z === 'head') _mz.y += 0.08;
      _mz2.copy(_mz).sub(_mo); const t = _mz2.dot(_mf); if (t < 0.15) continue; const perp = _mz2.addScaledVector(_mf, -t).length() * wgt; if (perp < bs) { bs = perp; best = z; out.copy(_mz); } }
    if (!best) { best = B.chest ? 'chest' : null; if (best) B.chest.getWorldPosition(out); }
    return best;
  }
  const _mp = new V3(), _mp2 = new V3(), _mv = new V3();
  function mmHit(tg, fo, w, chest) {
    const type = w.type, heavy = type === 'heavy', fin = type === 'fin', spd = heavy ? 12.5 : fin ? 8.8 : 8.2;
    _md.set(w.dx, w.dy, 0).transformDirection(cam.matrixWorld).normalize(); const dW = _md.clone();
    const vel = dW.clone().multiplyScalar(spd); _mv.set(0, 0, -1).transformDirection(cam.matrixWorld); vel.addScaledVector(_mv, spd * 0.6);
    const mk = (P) => ({ point: P.clone(), vel, speed: spd, kind: 'slash', dir: Math.abs(w.dx) > Math.abs(w.dy) ? (w.dx > 0 ? 'right' : 'left') : (w.dy > 0 ? 'up' : 'down'), frac: 0.85, commit: 1, from: Math.atan2(-w.v.y, -w.v.x),
      seg: { b0: P.clone().addScaledVector(dW, -0.3), t0: P.clone().addScaledVector(dW, 0.3), b1: P.clone().addScaledVector(dW, -0.3), t1: P.clone().addScaledVector(dW, 0.3) },
      assist: true, charged: heavy, tipSpeed: spd / 0.9, mult: fin ? 1.3 : 1, fmul: heavy ? 1.6 : fin ? 1.5 : 1.45, combo: w.step, mm: true });
    const zone = fo ? aimPoint(fo, w, _mp) : null; const P = zone ? _mp : _mp2.copy(chest); const inf = mk(P); if (zone) inf.zone = zone;
    let res = true; try { res = tg.onHit ? tg.onHit(inf) : true; } catch (e) { console.warn('onHit', e); } // 第二十六轮(i)：目标回调出错也算“这一刀已命中”，绝不每帧重复结算
    if (res === false) return false;
    w.set.add(tg.id); w.hit = true; const k = heavy ? 1 : fin ? 0.75 : 0.45, now = performance.now(); M.hitT = now;
    S.shake = Math.max(S.shake, 0.006 + 0.014 * k); M.kick.p += 0.008 + 0.02 * k; M.kick.r += -w.dx * (0.008 + 0.018 * k); M.kick.f = Math.max(M.kick.f, 1.2 + 3 * k); w.hold = heavy ? 0.05 : fin ? 0.035 : 0.022;
    S.hv.x -= w.dx * 1.0 * k; S.hv.y -= w.dy * 0.8 * k; S.stam = Math.min(100, S.stam + 3 + 3 * k); // 命中回体力：打得越凶越不容易力竭
    if (window.CombatFX && CombatFX.kick) { try { CombatFX.kick(0.1 + 0.2 * k); } catch (e) {} }
    return true;
  }
  function mmResolve(w) { // 每帧（swingStep 之后）：刃扫到的目标结算
    if (w.t < w.wu + 0.02) return; cam.updateMatrixWorld(); const center = G.player.pos; let list = [];
    for (const p of providers) { try { list = list.concat(p(center) || []); } catch (e) {} }
    const foes = (window.Foe && Foe.foes) || [], heavy = w.type === 'heavy', half = heavy ? 0.95 : 0.8, reach = 1.5 + S.len * 0.8 + (heavy ? 0.3 : 0) + (w.lt || 0) + ((PF() || {}).reach || 0), amp = 0.62 * (S.len / 0.8);
    let px = 0, py = 0; const prim = w.tid != null ? list.find(t => t.id === w.tid) : null; if (prim) { const pf = foes.find(f => f.id2 === prim.id); chestOf(prim, pf, _ml); cam.worldToLocal(_ml); px = _ml.x; py = _ml.y; }
    let n = 0;
    for (const tg of list) {
      if (w.set.has(tg.id)) continue; if (n >= 3) break;
      const fo = (tg.kind === 'foe' || tg.kind === 'boss') ? foes.find(f => f.id2 === tg.id) : null; if (fo && fo.escaped) continue;
      chestOf(tg, fo, _mc); _ml.copy(_mc); cam.worldToLocal(_ml); if (_ml.z > -0.15) continue;
      const d = _ml.length(), ax = Math.atan2(Math.abs(_ml.x), -_ml.z), ay = Math.atan2(Math.abs(_ml.y), -_ml.z);
      const dead = fo && fo.dead; if (dead && (ax > 0.4 || w.tid != null)) continue; // 尸体：只在对准它且没有活目标时才砍
      if (d > reach || ax > half || ay > 0.78) continue;
      const isPrim = tg.id === w.tid; let p = 0; if (!isPrim) { p = Math.max(-0.95, Math.min(1, ((_ml.x - px) * w.dx + (_ml.y - py) * w.dy) / Math.max(0.3, amp))); }
      if (w.sgn < p - 0.02) continue;
      if (mmHit(tg, fo, w, _mc)) n++;
    }
  }
  function mmCamFx(dt) { const k = M.kick, e = Math.exp(-dt * 16); k.p *= e; k.r *= e; k.f *= Math.exp(-dt * 11); }

  // ---------- 输入 ----------
  function onDown(btn) {
    if (!drawn) return false;
    if (btn === 0 && MM()) { mmDown(); return true; }
    if (btn === 0) { S.lmb = true; S.lmbT = performance.now(); S.drag = 0; S.charge = 0; RH.length = 0; S.rsv = S.rsv || { x: 0, y: 0, m: 0 }; S.rsv.x = S.rsv.y = S.rsv.m = 0; const c = invCtrl(S.hand); S.ctrl.x = c.x; S.ctrl.y = c.y; }
    if (btn === 2) { S.rmb = true; S.guardT = performance.now() / 1000; }
    return true;
  }
  function onUp(btn) {
    if (!drawn) return false;
    if (btn === 0 && MM()) { if (S.lmb) mmUp(); return true; }
    if (btn === 0 && S.lmb && RS() && XH()) { S.lmb = false; rsRelease(); return true; }
    if (btn === 0 && S.lmb) { S.lmb = false; const dt = performance.now() - S.lmbT; if (dt < 190 && S.drag < 0.12) queueThrust(); if (S.charged > 0) S.charged = Math.min(S.charged, 1.0); S.charge = 0; }
    if (btn === 2) S.rmb = false;
    return true;
  }
  function rsRelease() {
    const nowMs = performance.now(), hold = nowMs - S.lmbT, T = rsTrend(nowMs, 140), charged = S.charged > 0;
    S.charge = 0; if (S.charged > 0) S.charged = Math.min(S.charged, 1.0);
    if (S.rmb || S.sw) { RH.length = 0; return; }
    if (T.m >= 1.2) { const [dx, dy] = snap8(T.x, T.y); startSwing(dx, dy, hold, charged, T.m); }
    else if (charged || hold > 700) startSwing(0, -1, hold, true, 0); // 蓄满无趋势：直劈
    else queueThrust();
    RH.length = 0;
  }
  // ---------- 第二十二轮（续 9）：挥砍辅助瞄准（MOD aim_assist）----------
  // 出刀瞬间在视野锥内挑最近的活敌人；刀路的圆心挪到其胸口、刃的有效射程延长到够得着、2 米外再向前小步突进。不碰镜头（没有粘滞）。
  const AA = () => !window.Mods || Mods.on('aim_assist');
  const _av = new V3(), _al = new V3();
  function assistPick() {
    if (!AA() || !G || !G.player) return null;
    const center = G.player.pos; let list = [];
    for (const p of providers) { try { list = list.concat(p(center) || []); } catch (e) {} }
    cam.updateMatrixWorld(); const foes = (window.Foe && Foe.foes) || []; let best = null, bs = 1e9;
    for (const tg of list) {
      if (tg.kind !== 'foe' && tg.kind !== 'boss') continue;
      const fo = foes.find(f => f.id2 === tg.id); if (fo && fo.dead) continue; if (fo && fo.escaped) continue;
      _av.copy(tg.pos); if (fo) _av.y += 0.3; cam.worldToLocal(_av); const d = _av.length(); if (_av.z > -0.35 || d > 3.6) continue; // 身后/太远
      const ax = Math.atan2(Math.abs(_av.x), -_av.z), ay = Math.atan2(Math.abs(_av.y), -_av.z), lim = 0.6 + Math.max(0, 2.6 - d) * 0.3; // 远处 ≈35° · 近处最宽 ≈ 55°
      if (ax > lim || ay > 0.62) continue; const sc = ax + ay * 0.6 + d * 0.07; if (sc < bs) { bs = sc; best = { fo, wp: tg.pos.clone(), d }; }
    }
    return best;
  }
  function asLocal(as, out) { if (as.fo && as.fo.f && as.fo.f.bones.hips) { as.fo.f.bones.hips.getWorldPosition(out); out.y += 0.42; } else out.copy(as.wp); return cam.worldToLocal(out); } // 活目标每帧跟踪
  function asLunge(as, total, w, dt) { // 向目标小步突进（只动水平位置；世界自己会把玩家推出碰撞体）
    const W = window.Worlds && Worlds.active && Worlds._W; if (!W || !as.fo || w.lunged >= total) return;
    const dx = as.fo.pos.x - W.pos.x, dz = as.fo.pos.z - W.pos.z, d = Math.hypot(dx, dz); if (d < 1.45) return;
    const step = Math.min(total - w.lunged, total * dt / (w.dur * 0.6), d - 1.4); W.pos.x += dx / d * step; W.pos.z += dz / d * step; w.lunged += step;
  }
  function startSwing(dx, dy, hold, charged, mag) {
    if (window.Stamina && Stamina.on && !Stamina.spend(charged ? 18 : 11, 'swing')) return; // 第二十五轮：体力不够就挥不出去
    const pw = 0.7 + 0.3 * Math.min(1, hold / 450), tired = S.stam <= 0 || (window.Stamina && Stamina.ex) ? 0.6 : 1;
    S.sw = { t: 0, dur: 0.15 * KW('sw') * MT().sw / (charged ? 1.0 : 1) / tired, dx, dy, pw: pw * tired, charged, v: new V3(dx, dy, 0), hit: false, h0: S.hand.clone(), as: assistPick(), lunged: 0, rk: 1 };
    if (!(window.Stamina && Stamina.on)) S.stam = Math.max(0, S.stam - (charged ? 16 : 10)); S.thrust = 0; S.thrustQ = 0; S.hitCd.clear();
    if (window.CombatFX && CombatFX.on) CombatFX.swing(dx, dy, pw, charged); else SFX.play('draw', Math.min(0.65, 0.3 + pw * 0.3), charged ? 0.9 : 1.25 + Math.random() * 0.2);
  }
  // 挥击动画：刀尖从“趋势反方向”一侧扫过准星到趋势方向一侧；直接摆姿态（不过弹簧），速度由位置差得出 → 走原有扫掠命中
  const HAND0 = new V3(0.2, -0.3, -0.36), _st = new V3();
  function swingStep(dt) {
    const w = S.sw; if (w.mm && w.hold > 0) { w.hold -= dt; return; } w.t += dt; const u = Math.min(1, w.t / w.dur), wuT = w.mm ? w.wu : w.dur * 0.2;
    if (w.mm && w.t < wuT && w.type !== 'heavy') { // 第二十六轮（用户：轻微向右下偏移，刀却乱砍）：回拉阶段（~80ms）内持续读鼠标趋势——刀朝你移动鼠标的方向斩（左上→右下），不再固定套路
      const nowm = performance.now(), T = rhSum(nowm, Math.min(220, nowm - w.ms0 + 90)); if (T.m >= 3) { const [ax, ay] = snap8(T.x, T.y); w.dx = ax; w.dy = ay; w.v.set(ax, ay, 0); } }
    let sgn; if (w.t < wuT) sgn = -1 - 0.12 * Math.sin(w.t / wuT * Math.PI / 2); else { const k = (w.t - wuT) / Math.max(0.01, w.dur - wuT), ez = 1 - Math.pow(1 - k, 2.0); sgn = -1.12 + 2.24 * ez; } // 回拉 → 挥出
    w.sgn = sgn;
    const A = 0.62 * (S.len / 0.8) * (0.85 + 0.25 * w.pw) * (w.charged ? 1.2 : 1), dist = 0.82;
    S.hand.set(HAND0.x + w.dx * sgn * 0.09, HAND0.y + w.dy * sgn * 0.07, HAND0.z - (w.t >= wuT ? 0.04 : 0)); S.hv.set(0, 0, 0); S.tgt.copy(S.hand);
    let cxo = 0, cyo = 0, dd = dist; w.rk = 1;
    if (w.as) { const l = asLocal(w.as, _al); const ln = l.length(); cxo = Math.max(-1.3, Math.min(1.3, l.x * 0.92)); cyo = Math.max(-0.9, Math.min(0.9, l.y * 0.92)); dd = Math.max(dist, -l.z);
      if (w.lt == null) w.lt = Math.max(0, Math.min(w.mm ? 1.4 : 1.0, ln - 1.75)); if (w.lt > 0 && u < 0.7) asLunge(w.as, w.lt, w, dt); }
    _st.set(cxo + w.dx * sgn * A, cyo + w.dy * sgn * A * 0.9, -dd); S.bladeT.copy(_st).sub(S.hand).normalize();
    if (w.as) w.rk = Math.max(1, Math.min(2.4, _st.distanceTo(S.hand) / (S.len * 0.95)));
    if (u >= 1) { if (w.mm) { w.sgn = 2; mmResolve(w); M.endT = performance.now(); } if (!w.hit && window.CombatFX) CombatFX.whiff(); S.sw = null; S.tgt.copy(S.hand); }
  }
  // 第二十一轮（用户）：挥砍（按住左键）灵敏度不降低，但镜头按武器重量带惯性（越重越"拖"、松手前会继续滑一点）；不按住没有惯性；
  //   格挡（按住右键）灵敏度更低 ×0.3。MOD wpn_feel（默认开）；关掉恢复第二十轮的 ×0.42/×0.45。
  const FEEL = () => !window.Mods || !Mods.on || Mods.on('wpn_feel');
  const LK = { tx: 0, ty: 0, cx: 0, cy: 0, vx: 0, vy: 0 };
  // 第二十二轮（用户）：按住左键的"武器惯性"太难受 → 移除。按住左键视角 1:1 跟手（灵敏度不降低、没有延迟）；只保留按住右键格挡 ×0.3。
  function lookLmb(dx, dy) { return 1; }
  function lookTau() { return 0.035 + 0.085 * Math.max(0, Math.min(1, (S.wt - 0.8) / 0.7)); } // 轻刀 35ms · 重锤 120ms
  function drainLook(dt, flush) {
    if (!LK.tx && !LK.ty && !LK.cx && !LK.cy) return;
    const P = G.player; if (!P) return;
    if (flush) { const ax = LK.tx - LK.cx, ay = LK.ty - LK.cy; P.yaw -= ax * 0.0022; P.pitch = Math.max(-1.45, Math.min(1.45, P.pitch - ay * 0.0022)); LK.tx = LK.ty = LK.cx = LK.cy = LK.vx = LK.vy = 0; return; }
    const tau = S.lmb ? lookTau() : 0.03, w = 2 / tau, x = w * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x); // 临界阻尼 smoothDamp
    const step = (c, t, v) => { const ch = c - t, tmp = (v + w * ch) * dt; return [t + (ch + tmp) * e, (v - w * tmp) * e]; };
    const [nx, vx] = step(LK.cx, LK.tx, LK.vx), [ny, vy] = step(LK.cy, LK.ty, LK.vy);
    const ax = nx - LK.cx, ay = ny - LK.cy; LK.cx = nx; LK.cy = ny; LK.vx = vx; LK.vy = vy;
    P.yaw -= ax * 0.0022; P.pitch = Math.max(-1.45, Math.min(1.45, P.pitch - ay * 0.0022));
    if (Math.abs(LK.tx - LK.cx) < 0.05 && Math.abs(LK.ty - LK.cy) < 0.05 && Math.abs(vx) + Math.abs(vy) < 0.5) { drainLook(0, true); }
  }
  // 返回镜头转动系数：挥砍/格挡时鼠标主要用于控制武器
  function onMove(dx, dy) {
    if (!drawn) return 1;
    if (MM()) { RH.push([performance.now(), dx, -dy]); if (RH.length > 80) RH.shift(); if (S.lmb) return 1; } // 第二十六轮：按住左键视角 1:1 跟手，鼠标趋势只用来定斩击方向
    if (S.lmb && XH() && RS()) { RH.push([performance.now(), dx, -dy]); if (RH.length > 80) RH.shift(); S.drag += Math.hypot(dx, dy) * 0.0062; return 1; }
    if (S.lmb && XH()) { S.mAcc.x += dx; S.mAcc.y -= dy; S.drag += Math.hypot(dx, dy) * 0.0062; return lookLmb(dx, dy); }
    if (S.lmb) { const k = 0.0062; S.ctrl.x += dx * k; S.ctrl.y -= dy * k; S.drag += Math.hypot(dx, dy) * k; const r = Math.hypot(S.ctrl.x, S.ctrl.y); if (r > 1.25) { S.ctrl.x *= 1.25 / r; S.ctrl.y *= 1.25 / r; } return lookLmb(dx, dy); } // 旧：鼠标控制武器轨迹 // 第十八轮：挥砍 = 刀尖锁在准星上，鼠标只转镜头
    if (S.rmb) { S.guard.x += dx * 0.022; S.guard.y -= dy * 0.022; const r = Math.hypot(S.guard.x, S.guard.y); if (r > 1) { S.guard.x /= r; S.guard.y /= r; } return FEEL() ? 0.3 : (window.Mods && Mods.on('guard_slowlook') ? 0.45 : 1); } // 第十九轮：用户要求格挡时降灵敏度
    return 1;
  }
  function queueThrust() { if (window.Stamina && Stamina.on && (S.thrust > 0.55 || S.thrust === 0) && !Stamina.spend(9, 'thrust')) return; if (S.thrust > 0.55 || S.thrust === 0) { S.thrust = 0.0001; S.thrustSide = -S.thrustSide; S.tas = assistPick(); S.tasLung = 0; if (!(window.Stamina && Stamina.on)) S.stam -= 9; if (window.CombatFX && CombatFX.on) CombatFX.thrust(); else SFX.play('draw', 0.35, 1.5); } else S.thrustQ = Math.min(2, S.thrustQ + 1); }

  // 控制点 → 手的目标位置（前方一个椭球面）
  function ctrlToHand(cx, cy, out) { const r2 = Math.min(1, cx * cx + cy * cy); return out.set(cx * 0.42, cy * 0.34 - 0.08, -0.42 - 0.2 * (1 - r2)); }
  // 刀尖 = 相机前方 (0,0,-d)，|刀尖-手| = 0.95×刃长；mvn = 归一化鼠标速度（刀尖略落后于准星）
  function aimBlade(h, mvn, out) {
    const R = S.len * 0.95, q = R * R - h.x * h.x - h.y * h.y, d = -h.z + Math.sqrt(Math.max(0.04, q));
    return out.set(-mvn.x * 0.05 * d - h.x, -mvn.y * 0.05 * d - h.y, -d - h.z).normalize();
  }
  function invCtrl(h) { return { x: Math.max(-1.25, Math.min(1.25, h.x / 0.42)), y: Math.max(-1.25, Math.min(1.25, (h.y + 0.08) / 0.34)) }; }
  const GUARD = {
    up: { h: new V3(0.1, 0.17, -0.5), b: new V3(-1, 0.18, -0.3) },
    down: { h: new V3(0.1, -0.44, -0.46), b: new V3(-1, -0.35, -0.2) },
    left: { h: new V3(-0.2, -0.22, -0.46), b: new V3(0.12, 1, -0.12) },
    right: { h: new V3(0.32, -0.22, -0.46), b: new V3(-0.12, 1, -0.12) }
  };

  // ---------- 目标：散落在地上的首级（挂载/手持的不受影响）----------
  const _hp = new V3();
  function headTargets(center) {
    const out = []; if (!G.heads || (window.Worlds && Worlds.active)) return out;
    for (const h of G.heads) {
      if (!h || h.mount || h === G.held || !h.g.visible) continue;
      _hp.copy(h.g.position); _hp.y += 0.02; if (_hp.distanceToSquared(center) > 9) continue;
      out.push({ id: h, pos: _hp.clone(), r: 0.17, kind: 'head', onHit(info) {
        const v = info.vel.clone().multiplyScalar(0.55); v.y = Math.max(v.y, 1.2 + info.speed * 0.12); h.vel.copy(v); h.sleep = 0; if (h.av) h.av.set((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18);
        SFX.thud(Math.min(1, info.speed / 9)); G.burst(info.point, '#ffd9a0', 10 + Math.round(info.speed), 1.2, 0.45, -4);
      } });
    }
    return out;
  }

  // ---------- 每帧 ----------
  const _t = new V3(), _b = new V3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _x = new V3(), _y = new V3(), _z = new V3(), UP = new V3(0, 1, 0);
  const _tipW = new V3(), _baseW = new V3(), _vel = new V3(), _seg = new V3(), _cp = new V3();
  function update(dt, now) {
    drainLook(dt, !drawn || !wpn || G.uiOpen);
    if (window.CombatFX) { CombatFX.tick(dt); if (drawn && wpn) CombatFX.charge(S.lmb && !S.rmb && S.thrust === 0 && !S.sw && !G.uiOpen ? (S.charged > 0 ? 1 : S.charge) : 0); if (drawn && wpn) { const ex = S.stam <= 0; if (ex && !S._ex) CombatFX.stamina(); S._ex = ex; } }
    if (!drawn || !wpn) { if (hud && hud.d.style.display !== 'none' && !drawn) hud.d.style.display = 'none'; if (threatSrc && !G.uiOpen) drawOverlay(now); else if (ov) { if (ovDirty) { ov.g.clearRect(0, 0, 560, 560); ovDirty = false; } ov.eKey = ''; ov.edge.style.opacity = 0; } return; } // 第十九轮：没拔刀也提示来刀
    if (G.uiOpen) { S.lmb = S.rmb = false; }
    // 顿帧：武器冻结一小会，屏震衰减
    { const idt = 1 / Math.max(1e-3, dt); _t.set(S.mAcc.x * idt, S.mAcc.y * idt, 0); S.mv.lerp(_t, Math.min(1, dt * 16)); S.mAcc.set(0, 0, 0); }
    // 第二十一轮：挥幅（冲力）——只有“同一方向持续挥出”的距离才积累冲力；来回高频晃动每次反向都会清零 → 伤害很低
    { const sp = S.mv.length(); if (!S.swD) { S.swD = new V3(1, 0, 0); S.arc = 0; }
      if (!S.lmb || S.rmb || sp < 160) S.arc *= Math.exp(-dt * 7);
      else { _t.copy(S.mv).multiplyScalar(1 / sp); const c = _t.dot(S.swD); if (c < 0.2) { S.arc *= 0.08; S.swD.copy(_t); if (S.arc < 5) S.flip = (S.flip || 0) + 1; } else S.swD.lerp(_t, Math.min(1, dt * 5)).normalize(); S.arc = Math.min(900, S.arc + sp * dt); }
      S.flipT = (S.flipT || 0) + dt; if (S.flipT > 1) { S.flipT = 0; S.wiggle = (S.flip || 0) >= 5; S.flip = 0; } }
    S.shake *= Math.exp(-dt * 12); // 第二十二轮：屏震逐帧衰减（原来只在顿帧里衰减）
    if (MM()) { mmCamFx(dt); mmCdUi(); if (!S.sw || !S.sw.mm) mmTick(dt); else if (S.lmb) { /* 出刀中：只缓冲 */ } }
    if (S.stop > 0) { S.stop -= dt; S.shake *= 0.85; placeWeapon(); return; }
    const tired = S.stam <= 0 || (window.Stamina && Stamina.ex) ? 0.5 : 1;
    let omega = 22 / (KW('sw') * MT().sw) * tired; // 第十六轮：整体节奏放慢一点
    if (!S.lmb && S.charged > 0) { S.charged -= dt; if (S.charged <= 0) S.charged = 0; }
    if (!S.rmb) S.gHist.length = 0;
    // 目标姿态
    if (S.sw) { if (S.rmb) S.sw = null; else swingStep(dt); }
    if (S.sw) { omega = 60; if (S.sw.mm) mmResolve(S.sw); }
    else if (S.rmb) {
      const g = S.guard; S.gdir = Math.abs(g.x) > Math.abs(g.y) ? (g.x < 0 ? 'left' : 'right') : (g.y < 0 ? 'down' : 'up');
      // 连续角度：手放在来刀一侧，刀身垂直于来刀方向横挡
      const ga = S.gAng = Math.atan2(g.y, g.x), cx = Math.cos(ga), cy = Math.sin(ga);
      S.tgt.set(0.06 + cx * 0.24, -0.16 + cy * 0.24, -0.47);
      let bx = -cy, by = cx; if (by < 0) { bx = -bx; by = -by; } if (by < 0.35 && bx > 0) { bx = -bx; by = -by; }
      S.bladeT.set(bx, by, -0.25).normalize(); omega *= 1.25; if (!(window.Stamina && Stamina.on)) S.stam = Math.min(100, S.stam + dt * 6);
      S.gHist.push([now, ga]); while (S.gHist.length && now - S.gHist[0][0] > 0.6) S.gHist.shift();
    } else if (S.thrust > 0) {
      S.thrust += dt / (0.28 * Math.sqrt(S.wt)); const k = S.thrust < 0.45 ? S.thrust / 0.45 : Math.max(0, 1 - (S.thrust - 0.45) / 0.55);
      const e = 1 - (1 - k) * (1 - k); S.tgt.set(0.05 * S.thrustSide + 0.1, -0.2 + e * 0.06, -0.4 - e * 0.5); S.bladeT.set(-S.tgt.x, -S.tgt.y, -(S.len * 0.95 + 0.4 + e * 0.5) - S.tgt.z).normalize(); omega *= 1.6; // 第十八轮：刺向准星
      S.trk = 1; if (S.tas) { const l = asLocal(S.tas, _al), ln = l.distanceTo(S.tgt); S.bladeT.copy(l).sub(S.tgt).normalize(); S.trk = 1 + (Math.max(1, Math.min(2.4, ln / (S.len * 0.95))) - 1) * Math.min(1, e * 1.3); // 第二十二轮：突刺也瞄向目标胸口
        const w = S.tw || (S.tw = { dur: 0.3, lunged: 0, lt: 0 }); if (S.tasLung === 0) { S.tasLung = 1; w.lunged = 0; w.lt = Math.max(0, Math.min(0.8, ln - 1.75)); } if (w.lt > 0 && S.thrust < 0.4) asLunge(S.tas, w.lt, w, dt); }
      if (S.thrust >= 1) { S.thrust = 0; if (S.thrustQ > 0) { S.thrustQ--; queueThrust(); } }
    } else if (MM()) { omega = mmPose(dt, omega);
    } else if (S.lmb) {
      if (S.drag < 0.1 && S.charged <= 0) { S.charge += dt / 0.7; if (S.charge >= 1) { S.charged = 9; S.charge = 1; SFX.play('draw', 0.6, 0.7); G.toast && G.toast('⚡ 蓄力完成：挥出重斩（破防）', '#ffd24a', 1); } }
      // 第十八轮：手留在右下方，刀尖锁在屏幕中心（准星）→ 镜头转动时世界里的刀光就是准星的轨迹；沿运动方向略滞后 = 重量感
      if (XH() && RS()) { // 蓄势：刀向趋势反方向拉开（趋势实时更新，松手瞬间采样）
        const T = rsTrend(performance.now(), 140), v = S.rsv, k = Math.min(1, T.m / 16), tx = T.m > 0.01 ? T.x / T.m : 0, ty = T.m > 0.01 ? T.y / T.m : 0; const f = Math.min(1, dt * 14);
        v.x += (tx - v.x) * f; v.y += (ty - v.y) * f; v.m += (k - v.m) * f; const hp = Math.min(1, (performance.now() - S.lmbT) / 450);
        S.tgt.set(HAND0.x - v.x * 0.14 * v.m, HAND0.y - v.y * 0.1 * v.m - 0.03 * hp, HAND0.z + 0.06 * hp + 0.04 * v.m); omega *= 1.4;
        _st.set(-v.x * 0.55 * v.m, -v.y * 0.5 * v.m + 0.12 * (1 - v.m), -0.85); S.bladeT.copy(_st).sub(S.tgt).normalize(); }
      else if (XH()) { const mvn = _x.copy(S.mv).multiplyScalar(1 / 2600); if (mvn.length() > 1) mvn.normalize();
      S.tgt.set(0.2 - mvn.x * 0.05, -0.3 - mvn.y * 0.04, -0.36); omega *= 1.3;
      aimBlade(S.hand, mvn, S.bladeT); }
      else { ctrlToHand(S.ctrl.x, S.ctrl.y, S.tgt); S.bladeT.copy(S.tgt).sub(PIVOT).normalize().add(_t.set(0, 0, -0.35)).normalize(); }
    } else {
      // 松开：控制点缓慢回到待机位
      S.ctrl.x += (0.6 - S.ctrl.x) * Math.min(1, dt * 5); S.ctrl.y += (-0.6 - S.ctrl.y) * Math.min(1, dt * 5);
      S.tgt.lerp(IDLE_H, Math.min(1, dt * 8)); S.bladeT.lerp(IDLE_B, Math.min(1, dt * 6)).normalize();
      if (!(window.Stamina && Stamina.on)) S.stam = Math.min(100, S.stam + dt * 28);
    }
    if (window.Stamina && Stamina.ex) { S.tgt.y -= 0.16; S.tgt.x *= 0.85; S.bladeT.y -= 0.35; S.bladeT.normalize(); } // 力竭：刀垂下来
    // 临界阻尼弹簧：手跟随目标
    // 临界阻尼弹簧的解析解：任意帧率都稳定（显式欧拉在 ω·dt > 1 时会发散）
    { const e = Math.exp(-omega * dt); const x0 = _t.copy(S.hand).sub(S.tgt); const j = _x.copy(S.hv).addScaledVector(x0, omega).multiplyScalar(dt);
      S.hv.addScaledVector(j, -omega).multiplyScalar(e); S.hand.copy(S.tgt).add(x0.add(j).multiplyScalar(e)); }
    // 刃方向：朝目标方向转，并被手速拖拽（重量感）
    if (!MM() && S.lmb && !S.rmb && S.thrust === 0 && XH() && RS()) { S.blade.lerp(S.bladeT, Math.min(1, dt * 26)).normalize(); }
    else if (!MM() && S.lmb && !S.rmb && S.thrust === 0 && XH()) { const mvn = _x.copy(S.mv).multiplyScalar(1 / 2600); if (mvn.length() > 1) mvn.normalize(); aimBlade(S.hand, mvn, _b); S.blade.lerp(_b, Math.min(1, dt * 30)).normalize(); } // 用弹簧后的手重算：刀尖始终在准星附近
    else { const lag = Math.min(0.5, S.hv.length() * 0.035 * S.wt);
    _b.copy(S.bladeT); if (lag > 0.01) _b.addScaledVector(S.hv.clone().normalize(), -lag);
    S.blade.lerp(_b.normalize(), Math.min(1, dt * 18 / S.wt)).normalize(); }
    if (S.sw) S.blade.copy(S.bladeT);
    placeWeapon();
    // 世界坐标刃线 + 扫掠命中
    const L = S.len; cam.updateMatrixWorld();
    const rkx = S.sw ? S.sw.rk : (S.thrust > 0 && S.tas ? (S.trk || 1) : 1); S.rk = rkx; _baseW.copy(S.hand).addScaledVector(S.blade, L * 0.3); _tipW.copy(S.hand).addScaledVector(S.blade, L * 0.95 * rkx);
    cam.localToWorld(_baseW); cam.localToWorld(_tipW);
    if (S.lastTip && S.lastTip.distanceToSquared(_tipW) > 2.25) { S.lastTip = null; trail.pts.length = 0; } // 瞬移/传送：不把跳变当成挥砍
    if (S.lastTip) {
      _vel.copy(_tipW).sub(S.lastTip).divideScalar(Math.max(1e-3, dt)); if (rkx > 1) _vel.divideScalar(1 + (rkx - 1) * 0.9); // 延长射程不该让伤害也变大：按延长比例折回刀尖速度
      S.tipSpeed = S.tipSpeed * 0.6 + _vel.length() * 0.4; if (S.sw) S.tipSpeed = Math.min(22, Math.max(S.tipSpeed, _vel.length() * 0.9));
      if (S.tipSpeed > 3 && !S.rmb && !MM()) { S.stam = Math.max(0, S.stam - dt * S.tipSpeed * (window.Stamina && Stamina.on ? 0.7 : 2.2)); }
      if (S.tipSpeed > 6.5 && now - S.swingSnd > 0.28 && !S.sw && S.thrust === 0 && !MM()) { S.swingSnd = now; if (window.CombatFX && CombatFX.on) CombatFX.swing(Math.sign(S.mv.x) || 1, Math.sign(S.mv.y) || 0, Math.min(1, S.tipSpeed / 14), false); else SFX.play('draw', Math.min(0.5, S.tipSpeed / 30), 1.6 + Math.random() * 0.3); }
      if (!S.rmb && !MM()) sweep(now);
      trail.col.set(S.charged > 0 ? '#ffc040' : '#ffe2b0'); pushTrail(_baseW, _tipW, S.rmb ? 0 : S.tipSpeed * (S.charged > 0 ? 1.4 : 1));
    }
    S.lastTip = (S.lastTip || new V3()).copy(_tipW); S.lastBase = (S.lastBase || new V3()).copy(_baseW);
    // HUD
    hud.d.style.display = 'block'; hud.b.style.width = Math.max(0, S.stam) + '%'; { const k = S.lmb && S.thrust === 0 ? (RS() && XH() ? (S.charged > 0 ? 1.25 : S.charge * 1.1) : commitK()) : 0, w = Math.round(k / 1.2 * 100); if (w !== hud.cw) { hud.cw = w; hud.c.style.width = w + '%'; hud.c.style.background = k >= 0.95 ? '#ffe070' : k > 0.45 ? '#9fe0ff' : '#5a7a90'; } } hud.b.style.background = S.stam < 25 ? 'linear-gradient(90deg,#ff6a5a,#ff3a3a)' : 'linear-gradient(90deg,#ffd27a,#ff9a3a)';
    { const v = S.rsv, on = RS() && XH() && S.lmb && S.thrust === 0 && !S.sw && v && v.m > 0.12; hud.a.style.opacity = on ? Math.min(1, v.m * 1.2) : 0; if (on) hud.a.style.transform = `rotate(${Math.atan2(-v.y, v.x)}rad)`; }
    hud.g.style.opacity = 0; drawOverlay(now);
    for (const [k, t] of S.hitCd) if (now - t > 0.3) S.hitCd.delete(k);
  }
  function placeWeapon() {
    // 基：y = 刃方向；z 尽量指向运动方向（刃口领先）
    _y.copy(S.blade); if (S.lmb && S.mv.lengthSq() > 4e4) _z.set(S.mv.x, S.mv.y, 0); else _z.copy(S.hv); _z.addScaledVector(_y, -_z.dot(_y));
    if (_z.lengthSq() > 0.02) S.edge.lerp(_z.normalize(), 0.3); _z.copy(S.edge).addScaledVector(_y, -S.edge.dot(_y));
    if (_z.lengthSq() < 1e-4) _z.set(0, 0, 1).addScaledVector(_y, -_y.z); _z.normalize();
    _x.crossVectors(_y, _z).normalize(); _z.crossVectors(_x, _y);
    _m.makeBasis(_x, _y, _z); wpn.quaternion.setFromRotationMatrix(_m);
    wpn.position.copy(S.hand);
    if (S.shake > 0.0005) wpn.position.add(_t.set((Math.random() - 0.5) * S.shake, (Math.random() - 0.5) * S.shake, 0));
  }
  // 线段-球扫掠：刃上 5 个点，从上一帧位置到这一帧位置
  function sweep(now) {
    if (S.tipSpeed < 2 && S.thrust === 0) return;
    if (RS() && XH() && !S.sw && S.thrust === 0) return; // 蓄势挥击：只有松手那一刀 / 突刺造成伤害
    const center = G.player.pos; let list = [];
    for (const p of providers) { try { list = list.concat(p(center) || []); } catch (e) { console.warn(e); } }
    if (!list.length) return;
    for (let k = 1; k <= 5; k++) {
      const f = k / 5; const p0 = _cp.copy(S.lastBase).lerp(S.lastTip, f); const p1 = _seg.copy(_baseW).lerp(_tipW, f);
      for (const tg of list) {
        if (S.hitCd.has(tg.id)) continue;
        const aa = (S.sw || S.thrust > 0) && AA() && (tg.kind === 'foe' || tg.kind === 'boss'); const d = segPointDist(p0, p1, tg.pos); if (d > tg.r * (aa ? 1.3 : 1)) continue;
        const commit = commitK();
        const speed = S.thrust > 0 ? Math.max(S.tipSpeed, 5) : S.tipSpeed * (aa ? Math.max(f, 0.8) : f) * commit; // 辅助瞄准命中算“刃中段以上”，不因为靠近刀根而掉伤害
        if (speed < 2) { if (S.wiggle && tg.kind !== 'head' && now - (S.wigT || 0) > 2.5) { S.wigT = now; G.toast && G.toast('🌀 来回乱晃没有冲力——大幅度挥砍 / 连点刺击才有伤害', '#9fd0ff', 1.8); } continue; }
        const info = { point: p1.clone(), vel: _vel.clone().multiplyScalar(f), speed, kind: S.thrust > 0 ? 'thrust' : 'slash', dir: dirName(), frac: f,
          commit, seg: { b0: S.lastBase.clone(), t0: S.lastTip.clone(), b1: _baseW.clone(), t1: _tipW.clone() }, from: fromAng(), assist: aa, charged: S.charged > 0 && S.thrust === 0, tipSpeed: S.thrust > 0 ? Math.max(S.tipSpeed, 5) : S.tipSpeed };
        if (window.CFX3D) try { CFX3D.pre(info, tg); } catch (e) { } let res = true; try { res = tg.onHit ? tg.onHit(info) : true; } catch (e) { console.warn('onHit', e); } // 第二十六轮(i)：出错也进冷却
        if (res === false) continue; // 目标说“刃其实没碰到身体”：不进冷却，这一刀继续扫
        S.hitCd.set(tg.id, now); if (S.sw) S.sw.hit = true; if (info.charged && tg.kind !== 'head') S.charged = 0;
        const heavy = Math.min(1, speed / 10);
        S.stop = 0; // 第二十二轮（续 13）：命中不再冻结武器/手部更新（15~50ms 的冻结会被手感当成输入卡顿）；反馈只靠屏震 + 音效 + 血花
        S.shake = 0.004 + heavy * 0.012; if (G.kick) G.kick(heavy * 0.6); // 第二十二轮：这行原来被上面的注释吞掉了，屏震一直没生效
      }
    }
  }
  // 冲力系数：挥幅 < 60px 几乎无伤；≥ 340px 满额；蓄力斩/刺击不受影响
  function commitK() { if (S.thrust > 0) return 1; if (S.sw) return S.charged > 0 ? 1.25 : 0.85 + 0.3 * S.sw.pw; if (S.charged > 0) return 1.25; if (!XH() || (window.Mods && !Mods.on('swing_momentum'))) return 1; const a = S.arc || 0; return Math.max(0.1, Math.min(1.2, (a - 40) / 300)); }
  function XH() { return !window.Mods || Mods.on('crosshair_slash'); }
  function motion() { if (S.sw) return S.sw.v; return XH() && S.lmb && S.thrust === 0 && S.mv.lengthSq() > 4e4 ? S.mv : S.hv; }
  function fromAng() { const v = motion(); return Math.atan2(-v.y, -v.x); }
  function dirName() { const v = motion(); return Math.abs(v.x) > Math.abs(v.y) ? (v.x > 0 ? 'right' : 'left') : (v.y > 0 ? 'up' : 'down'); }
  const _ab = new V3(), _ap = new V3();
  function segPointDist(a, b, p) { _ab.copy(b).sub(a); _ap.copy(p).sub(a); const t = Math.max(0, Math.min(1, _ap.dot(_ab) / Math.max(1e-8, _ab.lengthSq()))); return _ap.copy(a).addScaledVector(_ab, t).distanceTo(p); }
  // 屏震（在相机就位后、渲染前调用）
  function prerender() {
    if (drawn && MM()) { const k = M.kick; if (k.p > 0.0004 || Math.abs(k.r) > 0.0004) { cam.rotation.x -= k.p; cam.rotation.z += k.r; }
      if (k.f > 0.03) { if (!M.fovOn) { M.fovOn = true; M.baseFov = cam.fov; } cam.fov = M.baseFov + k.f; cam.updateProjectionMatrix(); } else if (M.fovOn) { M.fovOn = false; cam.fov = M.baseFov; cam.updateProjectionMatrix(); } }
    if (drawn && S.shake > 0.0005) { cam.position.x += (Math.random() - 0.5) * S.shake * 1.5; cam.position.y += (Math.random() - 0.5) * S.shake * 1.5; } }

  // ---------- 准星指示层：自己的格挡角（蓝）、敌人来刀方向（红/橙=重击）+ 收缩的时机圈、蓄力环 ----------
  let ov = null, ovDirty = false, threatSrc = null;
  // 第十九轮：来刀提示大改（用户：防御 UI 很不明显）—— 大号方向楔形 + 收缩时机圈 + 文字（方向/格挡/完美格挡/闪身）+ 屏幕边缘泛红 + 格挡弧对准变绿 + “叮”=完美格挡时刻
  const DIRN = (a) => { const d = ((a * 180 / Math.PI) % 360 + 540) % 360 - 180; return Math.abs(d) < 22.5 ? '右' : Math.abs(d) > 157.5 ? '左' : d > 0 ? (d < 67.5 ? '右上' : d < 112.5 ? '上' : '左上') : (d > -67.5 ? '右下' : d > -112.5 ? '下' : '左下'); };
  const adiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  const tickHi = new WeakMap();
  function drawOverlay(now) {
    const W0 = 560, C = W0 / 2;
    if (!ov) { const c = document.createElement('canvas'); c.width = c.height = W0; c.style.cssText = `position:fixed;left:50%;top:50%;width:${W0}px;height:${W0}px;margin:-${C}px 0 0 -${C}px;pointer-events:none;z-index:19`; document.body.appendChild(c);
      const e = document.createElement('div'); e.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:18;opacity:0;transition:opacity .08s'; document.body.appendChild(e);
      ov = { c, g: c.getContext('2d'), edge: e, eKey: '' }; }
    const th = (threatSrc ? threatSrc() : []).slice().sort((a, b) => a.left - b.left), g = ov.g;
    const edge = (side, k, heavy) => { const key = side + '|' + (k * 10 | 0) + heavy; if (key === ov.eKey) return; ov.eKey = key;
      if (!k) { ov.edge.style.opacity = 0; return; } const col = heavy ? '255,140,20' : '255,30,20';
      ov.edge.style.background = side ? `linear-gradient(${side > 0 ? 'to left' : 'to right'}, rgba(${col},0.55), rgba(${col},0) 28%)` : `radial-gradient(ellipse at center, rgba(${col},0) 55%, rgba(${col},0.45) 100%)`; ov.edge.style.opacity = Math.min(1, 0.25 + k * 0.85); };
    if (!th.length && !S.rmb && !(S.charge > 0 && S.lmb) && !(S.charged > 0)) { if (ovDirty) { g.clearRect(0, 0, W0, W0); ovDirty = false; } edge(0, 0, 0); return; }
    g.clearRect(0, 0, W0, W0); ovDirty = true; g.lineCap = 'round'; g.textAlign = 'center';
    const arc = (a, r, w, col, span, blur) => { g.save(); if (blur) { g.shadowColor = col; g.shadowBlur = blur; } g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(C, C, r, -a - span, -a + span); g.stroke(); g.restore(); };
    const text = (t, y, col, size) => { g.save(); g.font = `900 ${size}px "Noto Serif CJK SC","Songti SC",serif`; g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.strokeText(t, C, y); g.fillStyle = col; g.fillText(t, C, y); g.restore(); };
    const top = th[0];
    edge(top ? (top.side || 0) : 0, top ? top.k : 0, top && top.heavy);
    th.forEach((t, n) => {
      const col = t.heavy ? '255,150,30' : '255,55,40', a1 = n === 0 ? 1 : 0.45;
      // 完美格挡时刻的提示音：收缩圈碰到内圈前一瞬
      if (n === 0 && t.k > 0.86 && t.fo) { const hi = t.fo.atk ? t.fo.atk.hi : -1, last = tickHi.get(t.fo); if (last !== hi + ':' + (t.fo.atk && t.fo.atk.clip)) { tickHi.set(t.fo, hi + ':' + (t.fo.atk && t.fo.atk.clip)); try { SFX.play('bell', 0.22, 2.2, 0.02); } catch (e) {} } }
      if (t.side) { // 视野外：屏幕边缘大箭头 + 文字
        const x = t.side > 0 ? W0 - 30 : 30; g.fillStyle = `rgba(${col},${(0.55 + 0.45 * t.k) * a1})`; g.beginPath(); const dx = t.side > 0 ? 1 : -1; g.moveTo(x + dx * 24, C); g.lineTo(x - dx * 10, C - 30); g.lineTo(x - dx * 10, C + 30); g.fill();
        if (n === 0) text(t.side > 0 ? '右后方来袭 →' : '← 左后方来袭', C + 150, `rgb(${col})`, 22); return; }
      if (t.thrust) { arc(0, 38, 9, `rgba(${col},${(0.4 + 0.6 * t.k) * a1})`, Math.PI, 14); arc(0, 38 + 150 * (1 - t.k), 3, `rgba(${col},${(0.3 + 0.6 * t.k) * a1})`, Math.PI);
        if (n === 0) text(t.k > 0.8 ? '刺击！Q 闪身 / 正面格挡' : '刺击', C + 120, `rgb(${col})`, 22); return; }
      const R0 = 150;
      arc(t.ang, R0, 22, `rgba(${col},${(0.45 + 0.55 * t.k) * a1})`, 0.52, 18 * t.k); // 大号方向楔形
      arc(t.ang, R0 + 120 * (1 - t.k), 5, `rgba(${t.k > 0.86 ? '255,255,255' : col},${(0.35 + 0.65 * t.k) * a1})`, 0.4); // 收缩时机圈：碰到楔形 = 命中那一刻
      const x = C + Math.cos(t.ang) * (R0 + 34), y = C - Math.sin(t.ang) * (R0 + 34); g.fillStyle = `rgba(${col},${(0.6 + 0.4 * t.k) * a1})`; g.beginPath();
      g.moveTo(x - Math.cos(t.ang) * 26, y + Math.sin(t.ang) * 26); g.lineTo(x + Math.sin(t.ang) * 16, y + Math.cos(t.ang) * 16); g.lineTo(x - Math.sin(t.ang) * 16, y - Math.cos(t.ang) * 16); g.fill();
      if (n === 0) { const ok = S.rmb ? adiff(S.gAng, t.ang) : 9; const hint = t.heavy ? (t.k > 0.86 ? '重击 · 就是现在！' : `重击！${DIRN(t.ang)}侧 · 需完美格挡`) : (ok < 0.7 ? `${DIRN(t.ang)}侧 · 挡住了` : `${DIRN(t.ang)}侧来刀 · 右键格挡`);
        text(hint, C + 128, t.k > 0.86 ? '#fff' : (!t.heavy && ok < 0.7) ? '#7dff9a' : `rgb(${col})`, t.heavy ? 26 : 22); }
    });
    if (S.rmb) { const d = top && !top.side && !top.thrust ? adiff(S.gAng, top.ang) : 9, gc = d < 0.7 ? '110,255,140' : d < 1.26 ? '255,230,90' : '150,210,255';
      arc(S.gAng, 122, 12, `rgba(${gc},0.95)`, 0.62, 12); arc(S.gAng, 122, 3, 'rgba(255,255,255,0.95)', 0.62); }
    if (S.lmb && S.charge > 0 && S.charged <= 0) { g.strokeStyle = 'rgba(255,210,80,0.85)'; g.lineWidth = 4; g.beginPath(); g.arc(C, C, 24, -Math.PI / 2, -Math.PI / 2 + S.charge * 6.283); g.stroke(); }
    if (S.charged > 0) { g.strokeStyle = `rgba(255,200,60,${0.6 + 0.3 * Math.sin(now * 12)})`; g.lineWidth = 4; g.beginPath(); g.arc(C, C, 24, 0, 7); g.stroke(); }
  }
  // 格挡角度 t 秒前与 a 的夹角（用于“最后一刻转对方向”的完美格挡）
  function guardWas(tAgo, a) { const now = performance.now() / 1000; let best = null; for (const [t, g] of S.gHist) if (now - t >= tAgo) best = g; if (best == null) return Math.PI; return Math.abs(Math.atan2(Math.sin(best - a), Math.cos(best - a))); }
  // 被敌人格挡：弹刀
  function recoil(k = 1) { S.stop = 0.05 * k; S.shake = 0.02 * k; S.hv.multiplyScalar(-0.7); S.ctrl.x *= 0.6; S.ctrl.y *= 0.6; S.stam = Math.max(0, S.stam - (MM() ? 3 : 8) * k); if (G.kick) G.kick(0.8 * k); }
  function useStam(n) { if (window.Stamina && Stamina.on) return Stamina.spend(n); if (S.stam < n * 0.5) return false; S.stam = Math.max(0, S.stam - n); return true; }
  const attach = (sc) => { if (trail && trail.m) sc.add(trail.m); if (trail) trail.pts.length = 0; };
  return { attach, init, toggle, onWeapon, onDown, onUp, onMove, update, prerender, addProvider, guardWas, recoil, useStam, setThreats(fn) { threatSrc = fn; }, get drawn() { return drawn; }, get enabled() { return enabled; }, get state() { return S; }, get guardDir() { return S.rmb ? S.gdir : null; } };
})();
