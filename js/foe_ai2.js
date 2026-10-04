// 第三十四轮 R34：敌人强化 —— 用户：“AI 太弱智、敌人种类太少、技能太少、多样性太少；新手装备到最高难度也随便吊打”
// 新系统放新文件；对 js/foe.js / worlds.js 只有几处薄钩子（见 HANDOFF R34）。全部是 MOD（默认开），关掉 = 回到 R33 之前的敌人。
//   foe_scale  区域强度缩放：敌人“推荐战力”(区域 rec × 稀有度) 对比玩家战力 → 血量 / 伤害 / 智力按比例放大，下限 0.9（超额装备也不会被敌人打成纸）。
//              新手装备进最深的地区：敌人血量 ×2.4~×3.0、伤害 ×3.0，砍死所需刀数（保险刀数）同比例增加。
//   foe_pack   成群出现：越深的地区，一个地点的敌人越多（最多 +2，上限 5）。
//   foe_affix  精英词缀（7 种）：狂热 / 铁壁(护盾层) / 噬血 / 爆裂(死后炸) / 幽影(瞬移绕背) / 连斩 / 再生。深处、稀有敌人更常见，可叠 2 个。
//   foe_skills 新技能（任何敌人都可能会）：跃斩(落点红圈、落地震击、落地后破绽) · 冲锋(红色走廊、格挡无效) · 旋风斩(脚下红圈、要跳出圈或举盾) · 破防击(红光 = 格挡无效，只能闪身)
//   foe_tactics 战术层：你挥空刀 → 立刻反击(punish)；你乱挥 → 侧翻躲开；你背对她 → 偷袭；出手节奏被故意打乱（延迟 / 连斩），不再可以死记“前摇 → 弹反”。
// 钩子（foe.js）：populate→init · attack→tune · hit→evade/preHit · die→onDie · update→update · 追击分支→tick · 收招→after · clear→clear
window.FoeAI2 = (() => {
  'use strict';
  const M = k => !window.Mods || !Mods.on || Mods.on(k) !== false;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), ang = a => Math.atan2(Math.sin(a), Math.cos(a));
  const T = () => window.THREE, F_ = () => window.Foe;
  const cue = (fo, k) => { try { window.CombatFX && CombatFX.roleCue(fo, k); } catch (e) {} };
  const say = (fo, t, col) => { try { F_().say(fo, t, col); } catch (e) {} };
  const spark = (p, n, col) => { try { F_().spark(p, n, col); } catch (e) {} };
  const now = () => performance.now() / 1000;
  const FXL = []; // 场景里的提示物（红圈 / 走廊 / 词缀光环）
  let CLKA = 0, swEnd = -9, swWas = false, hpWrapped = null;

  // ================= 词缀 =================
  const AFF = {
    frenzy: { n: '狂热', ic: '🔥', col: '#ff7a50', tint: [1, 0.78, 0.7], tip: '更快更狠，出手间隔很短——别贪刀，保持移动' },
    iron: { n: '铁壁', ic: '🛡️', col: '#9fc8ff', tint: [0.75, 0.85, 1], tip: '身上有几层护盾：每挨一刀消一层，蓄力重斩 / 破防 / 绕背的“破绽”一刀直接打碎' },
    leech: { n: '噬血', ic: '🩸', col: '#ff5070', tint: [1, 0.7, 0.78], tip: '每次打中你，都会把伤害的一部分变成自己的血——别让她得手' },
    volatile: { n: '爆裂', ic: '💥', col: '#ffb040', tint: [1, 0.88, 0.6], tip: '死后会爆炸——斩首后立刻后退，地上红圈就是范围' },
    phantom: { n: '幽影', ic: '👻', col: '#b8a0ff', tint: [0.8, 0.75, 1], tip: '会瞬移到你背后偷袭——听到“嗖”的一声就转身 / 按 Q' },
    relentless: { n: '连斩', ic: '⚔️', col: '#ffd070', tint: [1, 0.92, 0.7], tip: '一轮攻击之后马上接第二轮——别在她收招时就放松' },
    regen: { n: '再生', ic: '✚', col: '#80f0a0', tint: [0.8, 1, 0.85], tip: '不被打的时候会快速回血——要打就一口气打完' }
  };
  const AKEYS = Object.keys(AFF);
  const LBL = {};

  // ================= 区域强度 =================
  function thrOf(fo, ctx) {
    const rec = ctx && ctx.rec ? ctx.rec(fo) : 0, st = ctx && ctx.st ? ctx.st() : null, pw = st && st.power;
    if (rec > 0 && pw > 0) return { t: rec / Math.max(25, pw), tier: clamp(Math.log(rec / 30) / Math.log(80), 0, 1) };
    return { t: window.__foeThreat || 1, tier: window.__foeTier || 0 }; // 测试台：可用 window.__foeThreat / __foeTier 指定
  }
  function dmgK(fo) {
    if (!M('foe_scale') || (window.FoeAbs && FoeAbs.on)) return 1; /* R35：foe_abs 下伤害由 hitPlayer 按地区绝对换算 */ const C = F_() && Foe.ctx && Foe.ctx(); const x = thrOf(fo, C);
    return clamp(Math.pow(x.t, 0.42), 0.9, fo.boss ? 2.6 : 3.0) * (1 + 0.2 * x.tier);
  }
  function packBonus(ri, r) {
    if (!M('foe_pack')) return 0; let b = 0;
    if (r() < clamp(0.09 * ri, 0, 0.6)) b++; if (ri >= 5 && r() < 0.4) b++; return Math.min(2, b);
  }

  // ================= 初始化（populate）=================
  function init(fo, r, it, ctx) {
    fo.aff = {}; fo.sk = null; fo.skCd = 2 + Math.random() * 4; fo.dodgeCd = 1.5 + Math.random() * 2;
    wrapHit(ctx);
    const x = thrOf(fo, ctx); fo.thr = x.t; fo.tier = x.tier;
    if (M('foe_scale') || (window.FoeAbs && FoeAbs.on)) {
      const hpK = (window.FoeAbs && FoeAbs.on) ? FoeAbs.hpK(ctx && ctx.rec ? ctx.rec(fo) : 40) : clamp(Math.pow(x.t, 0.4), 0.9, fo.boss ? 1.8 : 2.4) * (1 + 0.25 * x.tier);
      fo.hpK = hpK; fo.maxHp = fo.hp = Math.max(8, Math.round(fo.maxHp * hpK)); fo.floorK = 1 / Math.max(1, hpK); fo.capK = Math.max(1, hpK);
      fo.iq = Math.min(1.3, fo.iq + 0.25 * x.tier); fo.spdMul = (fo.spdMul || 1) * (1 + 0.1 * x.tier);
    }
    if (M('foe_affix') && !fo.boss) {
      const p = clamp(0.06 + 0.42 * x.tier + 0.04 * fo.rar, 0, 0.6) * (window.__foeAffixP != null ? 0 : 1) + (window.__foeAffixP || 0);
      if (r() < p) {
        const n = x.tier > 0.55 && fo.rar >= 2 && r() < 0.35 ? 2 : 1, pool = AKEYS.slice();
        if (fo.role === 'mage' || fo.role === 'healer' || fo.role === 'ranged') pool.splice(pool.indexOf('phantom'), 1);
        if (fo.role === 'berserk') pool.splice(pool.indexOf('frenzy'), 1);
        const forced = window.__forceAff; if (forced) { for (const k of [].concat(forced)) if (AFF[k]) fo.aff[k] = 1; }
        else for (let i = 0; i < n && pool.length; i++) { const k = pool.splice(Math.floor(r() * pool.length), 1)[0]; fo.aff[k] = 1; }
        applyAff(fo, x);
      } else if (window.__forceAff) { for (const k of [].concat(window.__forceAff)) if (AFF[k]) fo.aff[k] = 1; applyAff(fo, x); }
    }
  }
  function applyAff(fo, x) {
    const keys = Object.keys(fo.aff); if (!keys.length) return; fo.elite = true; fo.maxHp = fo.hp = Math.round(fo.maxHp * (1.2 + 0.1 * keys.length)); fo.floorK = (fo.floorK || 1) / 1.2; fo.capK = (fo.capK || 1) * 1.2;
    for (const k of keys) {
      const a = AFF[k];
      if (k === 'frenzy') { fo.spdMul = (fo.spdMul || 1) * 1.2; fo.dmgMul = (fo.dmgMul || 1) * 1.1; }
      if (k === 'iron') fo.shield = 3 + (x.tier > 0.65 ? 1 : 0);
      if (k === 'regen') fo.rgT = 0;
      fo.affT = fo.affT || 0;
      for (const m of fo.mats || []) if (m.color) { m.color.r *= a.tint[0]; m.color.g *= a.tint[1]; m.color.b *= a.tint[2]; }
    }
    fo.affCol = AFF[keys[0]].col; fo.affName = keys.map(k => AFF[k].ic + AFF[k].n).join('');
  }

  // 玩家被打到之后：噬血回血（包一层 ctx.hitPlayer，只包一次）
  function hpNow() { return window.G && G.S && typeof G.S.hp === 'number' ? G.S.hp : null; }
  function wrapHit(ctx) {
    if (!ctx || ctx.__ai2) return; ctx.__ai2 = 1; const orig = ctx.hitPlayer; if (!orig) return;
    ctx.hitPlayer = function (fo, n, h) {
      const h0 = hpNow(); const r = orig.apply(this, arguments); const h1 = hpNow();
      if (fo && fo.aff && fo.aff.leech && h0 != null && h1 != null && h0 - h1 > 0 && !fo.dead) { const g = Math.round((h0 - h1) * 0.6); fo.hp = Math.min(fo.maxHp, fo.hp + g); try { ctx.floatDmg(fo.anchor.pos, `🩸+${g}`, false); } catch (e) {} spark(fo.pos.clone ? fo.pos.clone().add(new (T().Vector3)(0, 1.1, 0)) : fo.pos, 6); }
      if (fo && fo.aff && fo.aff.leech) fo.rgT = 0; return r;
    };
  }

  // ================= 提示物 =================
  function disc(ctx, x, z, r, col, life, op) { // 红色实心圈（AoE 预警）
    const t = T(); if (!t || !ctx || !ctx.sc) return null; const g = disc.g || (disc.g = new t.CircleGeometry(1, 40).rotateX(-Math.PI / 2));
    const m = new t.Mesh(g, new t.MeshBasicMaterial({ color: col, transparent: true, opacity: op || 0.3, depthWrite: false, blending: t.AdditiveBlending, side: t.DoubleSide, fog: false }));
    m.position.set(x, (ctx.H ? ctx.H(x, z) : 0) + 0.07, z); m.scale.setScalar(r); m.renderOrder = 4; ctx.sc.add(m); const e = { m, life, t: 0, op: op || 0.3, kind: 'disc' }; FXL.push(e); return e;
  }
  function strip(ctx, col, w, op) { // 冲锋走廊
    const t = T(); if (!t || !ctx || !ctx.sc) return null; const g = strip.g || (strip.g = new t.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5));
    const m = new t.Mesh(g, new t.MeshBasicMaterial({ color: col, transparent: true, opacity: op || 0.28, depthWrite: false, blending: t.AdditiveBlending, side: t.DoubleSide, fog: false })); m.renderOrder = 4; m.scale.set(w, 1, 1); ctx.sc.add(m);
    const e = { m, life: 9, t: 0, op: op || 0.28, kind: 'strip' }; FXL.push(e); return e;
  }
  function kill(e) { if (!e || e.dead) return; e.dead = true; e.m.parent && e.m.parent.remove(e.m); e.m.material.dispose(); }
  function aura(fo, ctx) { // 精英脚下的词缀光环
    const t = T(); if (!t || !ctx || !ctx.sc || fo.auraM) return; const g = aura.g || (aura.g = new t.RingGeometry(0.62, 0.78, 32).rotateX(-Math.PI / 2));
    fo.auraM = new t.Mesh(g, new t.MeshBasicMaterial({ color: fo.affCol || '#ffffff', transparent: true, opacity: window.Mods && Mods.on('soft_glow') === false ? 0.75 : 0.26, depthWrite: false, blending: t.AdditiveBlending, side: t.DoubleSide, fog: false })); fo.auraM.renderOrder = 4; ctx.sc.add(fo.auraM);
  }

  // ================= 攻击参数调整（attack → tune）=================
  function tune(fo, A, d) {
    if (!A) return; const k = dmgK(fo); let m = k;
    if (fo.aff) { if (fo.aff.frenzy) { A.ws = Math.min(0.92, A.ws * 1.12); A.hold *= 0.75; } }
    if (M('foe_tactics') && !fo.boss) {
      if (fo.punish) { A.hold *= 0.35; A.ws = Math.min(0.92, A.ws * 1.12); A.feint = false; m *= 1.1; fo.punish = false; }
      else if (Math.random() < 0.18 + 0.3 * (fo.tier || 0) + 0.15 * (fo.iq > 0.9 ? 1 : 0)) { A.hold += 0.22 + Math.random() * 0.38; } // 故意拖一拍：按节奏弹反会落空
      if (fo.backstab) { m *= 1.3; fo.backstab = false; }
    }
    A.dmg = Math.max(1, Math.round(A.dmg * m));
  }
  function after(fo) { // 收招之后
    if (fo.aff && fo.aff.frenzy) fo.cd *= 0.6;
    if (fo.aff && fo.aff.relentless && !fo.chain && Math.random() < 0.6) { fo.chain = 1; fo.cd = 0.12; cue(fo, 'rally'); }
    else if (M('foe_tactics') && !fo.boss && !fo.chain && fo.iq > 0.75 && Math.random() < 0.12 + 0.3 * (fo.tier || 0)) { fo.chain = 1; fo.cd = Math.min(fo.cd, 0.28); } // 聪明的敌人偶尔直接接第二轮
    else fo.chain = 0;
  }

  // ================= 命中钩子 =================
  function evade(fo, info) { // 翻滚中 / 腾空：刃穿过去（返回 true = 没砍到）
    const s = fo.sk; if (!s || fo.dead) return false;
    if (s.ev) { const C = F_().ctx(); if (performance.now() - (s.evT || 0) > 300) { s.evT = performance.now(); try { C.floatDmg(fo.anchor.pos, '闪', false); } catch (e) {} } return true; } // R73 扩展技能的无敌段（影步 / 烟遁）
    if (s.k === 'roll' || (s.k === 'leap' && s.ph === 'air')) { const C = F_().ctx(); if (performance.now() - (s.evT || 0) > 300) { s.evT = performance.now(); try { C.floatDmg(fo.anchor.pos, '闪', false); } catch (e) {} } return true; }
    return false;
  }
  function preHit(fo, info, c, zone, slash) { // 返回 true = 被吸收（护盾）
    if (fo.ward73 && !fo.dead) { try { if (fo.ward73(fo, info, c)) return true; } catch (e) { console.warn('ward73', e); } } // R73：使徒阶段护盾 / 无敌段（r73_apostle.js）
    { const s = fo.sk, X = s && EXT[s.k]; if (X && X.preHit && !fo.dead) { try { if (X.preHit(fo, info, c, api())) return true; } catch (e) { console.warn('skill3 preHit', e); } } }
    if (fo.shield > 0 && !fo.dead) {
      if (info.charged || fo.broken > 0 || info.combo === 2) { fo.shield = 0; shieldMsg(fo, '💥 护盾碎了！'); spark(c.point, 24, 'blue'); return false; }
      fo.shield--; const C = F_().ctx(); try { C.floatDmg(fo.anchor.pos, fo.shield > 0 ? `🛡×${fo.shield}` : '🛡破', false); } catch (e) {}
      spark(c.point, 14, 'blue'); try { C.clang && C.clang(c.point, 'block'); } catch (e) {} cue(fo, 'armor');
      if (fo.shield <= 0) { fo.stag = Math.max(fo.stag || 0, 0.35); shieldMsg(fo, '🛡 护盾被打光了'); } return true;
    }
    if (fo.aff && fo.aff.regen) fo.rgT = 0; return false;
  }
  function shieldMsg(fo, t) { const C = F_().ctx(); try { if (C.toast && !LBL.shield) { LBL.shield = 1; C.toast(t, '#9fc8ff', 1.4); } } catch (e) {} }
  function onDie(fo, info) {
    if (fo.auraM) { fo.auraM.parent && fo.auraM.parent.remove(fo.auraM); fo.auraM = null; }
    if (fo.sk) { if (fo.sk.fx) for (const e of fo.sk.fx) kill(e); fo.sk = null; } fo.yOff = 0;
    if (fo.aff && fo.aff.volatile) { // 爆裂：0.9 秒后炸开
      const C = F_().ctx(); if (!C) return; const x = fo.pos.x, z = fo.pos.z, e = disc(C, x, z, 2.7, 0xff8a30, 0.95, 0.4);
      BOOMS.push({ x, z, t: 0, fo, e, C, R: 2.7 }); cue(fo, 'rage');
      try { C.toast && C.toast('💥 她要爆炸了——后退！', '#ffb040', 1.4); } catch (er) {}
    }
  }
  const BOOMS = [];

  // ================= 每帧 =================
  function update(dt, ctx) {
    CLKA += dt; const sw = ctx && ctx.playerSwinging ? !!ctx.playerSwinging() : false; if (swWas && !sw) swEnd = CLKA; swWas = sw;
    const foes = (F_() && Foe.foes) || [], P = ctx && ctx.player;
    for (const fo of foes) {
      if (fo.dead || fo.escaped) { if (fo.auraM) { fo.auraM.parent && fo.auraM.parent.remove(fo.auraM); fo.auraM = null; } continue; }
      if (fo.elite) { aura(fo, ctx); if (fo.auraM) { fo.auraM.position.set(fo.pos.x, (ctx.H ? ctx.H(fo.pos.x, fo.pos.z) : 0) + 0.06, fo.pos.z); fo.auraM.material.opacity = (window.Mods && Mods.on('soft_glow') === false ? 1 : 0.35) * (0.5 + 0.25 * Math.sin(CLKA * 4 + fo.id)); }
        if (fo.seen && !fo.affShown) { fo.affShown = true; say(fo, `【精英】${fo.affName}`, fo.affCol); const ks = Object.keys(fo.aff); for (const k of ks) if (!LBL[k] && ctx.toast) { LBL[k] = 1; ctx.toast(`${AFF[k].ic} 精英·${AFF[k].n}：${AFF[k].tip}`, AFF[k].col, 3.2); break; } } }
      if (fo.sk && fo.stag > 0 && fo.sk.k !== 'roll') { const k = fo.sk; if (k.fx) for (const e of k.fx) kill(e); fo.sk = null; fo.yOff = 0; fo.skCd = 3; } // 被打断：取消技能
      if (fo.aff && fo.aff.regen && fo.hp < fo.maxHp) { fo.rgT = (fo.rgT || 0) + dt; if (fo.rgT > 2.2) fo.hp = Math.min(fo.maxHp, fo.hp + fo.maxHp * 0.035 * dt); }
    }
    for (let i = BOOMS.length - 1; i >= 0; i--) { // 爆裂倒计时
      const b = BOOMS[i]; b.t += dt; if (b.e) b.e.m.material.opacity = 0.25 + 0.35 * Math.abs(Math.sin(b.t * 12));
      if (b.t >= 0.9) { spark({ x: b.x, y: (ctx.H ? ctx.H(b.x, b.z) : 0) + 0.8, z: b.z }, 40); cue(b.fo, 'slam'); try { ctx.shake && ctx.shake(0.4); } catch (e) {}
        if (P && Math.hypot(P.pos.x - b.x, P.pos.z - b.z) < b.R) { const st = ctx.st(); ctx.hitPlayer(b.fo, Math.max(3, Math.round(st.maxHp * 0.13 * dmgK(b.fo))), { ang: 0, thrust: true, heavy: true, unblock: true }); }
        if (b.e) kill(b.e); BOOMS.splice(i, 1); }
    }
    for (let i = FXL.length - 1; i >= 0; i--) { const e = FXL[i]; if (e.dead) { FXL.splice(i, 1); continue; } e.t += dt; if (e.t > e.life) { kill(e); FXL.splice(i, 1); } }
  }
  function clear() {
    for (const e of FXL) kill(e); FXL.length = 0; BOOMS.length = 0;
    for (const fo of ((F_() && Foe.foes) || [])) { if (fo.auraM) { fo.auraM.parent && fo.auraM.parent.remove(fo.auraM); fo.auraM = null; } }
  }

  // ================= 技能 / 战术（追击分支里、先于职业调用；返回非空 = 接管本帧移动）=================
  const fin = (fo, cd, brk) => { const s = fo.sk; if (s && s.fx) for (const e of s.fx) kill(e); fo.sk = null; fo.yOff = 0; fo.cd = Math.max(fo.cd, cd || 1); fo.skCd = (4.5 + Math.random() * 4) * (1 - 0.4 * (fo.tier || 0)); if (brk) { fo.broken = Math.max(fo.broken || 0, brk); } fo.f.play(fo.armed ? 'Sword_Idle' : 'Idle_Loop', { fade: 0.2 }); };
  const baseDmg = (fo, ctx, mul) => { const st = ctx.st(); return Math.max(2, Math.round(st.maxHp * (0.05 + fo.rar * 0.013 + (fo.armed ? 0.02 : 0)) * dmgK(fo) * (fo.dmgMul || 1) * (mul || 1))); };
  const arenaClamp = (ctx, x, z) => { if (ctx.edge) { for (let i = 0; i < 4; i++) { const E = ctx.edge(x, z); if (E[0] >= 1.6) break; x += E[1] * (1.6 - E[0]); z += E[2] * (1.6 - E[0]); } return [x, z]; } const R = (ctx.R || 40) - 1.6, d = Math.hypot(x, z); return d > R ? [x / d * R, z / d * R] : [x, z]; }; // R46：特殊形状按真实边界
  const others = fo => { for (const o of F_().foes) if (o !== fo && !o.dead && o.sk) return true; return false; };
  // R73 foe_skills3：外部注册的技能（js/r73_skills.js）：{ can(fo,d,ctx,P)→权重, start(fo,d,P,ctx,face,api), run(fo,dt,d,face,dx,dz,P,ctx,api), preHit? }
  const EXT = {}; let API = null;
  const api = () => API || (API = { disc, strip, ringM, sector, kill, fin, baseDmg, hint, setV, spark, cue, say, arenaClamp, inStrip, M, T });
  function reg(k, def) { EXT[k] = def; }

  function startSkill(fo, k, d, P, ctx, face) {
    const f = fo.f, pv = ctx.pvel || { x: 0, z: 0 };
    if (EXT[k]) { try { return EXT[k].start(fo, d, P, ctx, face, api()) !== false; } catch (e) { console.warn('skill3', k, e); fo.sk = null; return false; } }
    if (SK2[k]) return start2(fo, k, d, P, ctx, face);
    if (k === 'leap') {
      const lx = P.pos.x + pv.x * 0.45, lz = P.pos.z + pv.z * 0.45, [tx, tz] = arenaClamp(ctx, lx, lz);
      fo.sk = { k, ph: 'wind', t: 0, tx, tz, x0: fo.pos.x, z0: fo.pos.z, fx: [disc(ctx, tx, tz, 2.0, 0xff3020, 0.9, 0.28)], dmg: baseDmg(fo, ctx, 1.25) };
      f.play('Jump_Start', { once: true, fade: 0.1, restart: true, speed: 2.1 }); cue(fo, 'rage'); hint(ctx, 'leap', '⚠ 跃斩！红圈就是落点——侧闪出圈，她落地后有破绽');
    } else if (k === 'charge') {
      const e = strip(ctx, 0xff3020, 1.2, 0.28);
      fo.sk = { k, ph: 'wind', t: 0, yaw: face, fx: [e], dmg: baseDmg(fo, ctx, 1.3), hit: false, len: Math.min(11, d + 3.5) };
      f.play(fo.armed ? 'Idle_Shield_Loop' : 'Crouch_Idle_Loop', { fade: 0.15 }); cue(fo, 'rage'); hint(ctx, 'charge', '⚠ 冲锋！红色走廊内格挡无效——向两侧闪开');
    } else if (k === 'whirl') {
      fo.sk = { k, ph: 'wind', t: 0, R: 2.5, fx: [disc(ctx, fo.pos.x, fo.pos.z, 2.5, 0xff3020, 0.9, 0.22)], dmg: baseDmg(fo, ctx, 0.85), hits: 0 };
      f.play('Sword_Idle', { fade: 0.1 }); cue(fo, 'backstab'); hint(ctx, 'whirl', '⚠ 旋风斩！离开脚下红圈（后退 / 闪身），或举盾硬吃');
    } else if (k === 'breaker') {
      const clip = fo.armed ? 'Sword_Attack' : 'Melee_Hook'; F_().attack(fo, d, clip); const A = fo.atk; if (!A) return false;
      for (const h of A.hits) { h.unblock = true; h.heavy = true; } A.hold += 0.32; A.reach += 0.55; A.dmg = Math.round(A.dmg * 1.15); fo.skBreak = true; fo.skCd = (5 + Math.random() * 4) * (1 - 0.4 * (fo.tier || 0));
      cue(fo, 'backstab'); hint(ctx, 'breaker', '⚠ 红光破防击！格挡无效——只能按 Q 闪身或走位躲开'); return true;
    }
    return true;
  }
  function hint(ctx, k, t) { if (LBL['h' + k]) return; LBL['h' + k] = 1; try { ctx.toast && ctx.toast(t, '#ff9a80', 2.8); } catch (e) {} }
  const setV = (fo, vx, vz) => { fo.rv = { x: vx, z: vz }; };

  function runSkill(fo, dt, d, face, dx, dz, P, ctx) {
    const s = fo.sk, f = fo.f; s.t += dt; const C = ctx;
    if (EXT[s.k]) { try { return EXT[s.k].run(fo, dt, d, face, dx, dz, P, ctx, api()); } catch (e) { console.warn('skill3 run', s.k, e); fin(fo, 1, 0); return null; } }
    if (s.k === 'leap') {
      if (s.ph === 'wind') { if (s.fx[0]) { s.fx[0].m.material.opacity = 0.2 + 0.2 * Math.abs(Math.sin(s.t * 14)); s.fx[0].m.scale.setScalar(2.0); }
        if (s.t >= 0.62) { s.ph = 'air'; s.t = 0; s.x0 = fo.pos.x; s.z0 = fo.pos.z; }
        return { turnTo: Math.atan2(s.tx - fo.pos.x, s.tz - fo.pos.z), spd: 0 }; }
      if (s.ph === 'air') { const k = Math.min(1, s.t / 0.5); fo.pos.x = s.x0 + (s.tx - s.x0) * k; fo.pos.z = s.z0 + (s.tz - s.z0) * k; fo.yOff = 2.6 * Math.sin(Math.PI * k);
        if (k >= 1) { s.ph = 'land'; s.t = 0; fo.yOff = 0; f.play('Jump_Land', { once: true, fade: 0.05, restart: true, speed: 1.6 }); cue(fo, 'slam'); spark({ x: s.tx, y: (C.H ? C.H(s.tx, s.tz) : 0) + 0.3, z: s.tz }, 30); try { C.shake && C.shake(0.55); } catch (e) {}
          if (Math.hypot(P.pos.x - s.tx, P.pos.z - s.tz) < 2.0) C.hitPlayer(fo, s.dmg, { ang: 0, thrust: true, heavy: true }); for (const e of s.fx) kill(e); s.fx = []; fo.broken = Math.max(fo.broken || 0, 1.1); try { C.toast && C.toast('💢 她落地了——破绽！砍她！', '#ffe070', 1.2); } catch (e) {} }
        return { turnTo: fo.yaw, spd: 0 }; }
      if (s.t >= 1.05) fin(fo, 1.0, 0); return { turnTo: face, spd: 0 };
    }
    if (s.k === 'charge') {
      if (s.ph === 'wind') { const e = s.fx[0]; if (s.t < 0.5) s.yaw = face; // 最后 0.15 秒锁定方向
        if (e) { e.m.position.set(fo.pos.x, (C.H ? C.H(fo.pos.x, fo.pos.z) : 0) + 0.07, fo.pos.z); e.m.rotation.y = s.yaw; e.m.scale.set(1.2, 1, s.len); e.m.material.opacity = 0.16 + 0.22 * (s.t / 0.65); }
        if (s.t >= 0.65) { s.ph = 'rush'; s.t = 0; s.dx = Math.sin(s.yaw); s.dz = Math.cos(s.yaw); f.play('Shield_Dash', { once: true, fade: 0.06, restart: true, speed: 1.3 }); for (const x of s.fx) kill(x); s.fx = []; }
        return { turnTo: s.yaw, spd: 0 }; }
      if (s.ph === 'rush') { setV(fo, s.dx * 10.5, s.dz * 10.5); fo.yaw = s.yaw;
        if (!s.hit && Math.hypot(P.pos.x - fo.pos.x, P.pos.z - fo.pos.z) < 1.15) { s.hit = true; C.hitPlayer(fo, s.dmg, { ang: 0, thrust: true, heavy: true, unblock: true }); try { C.shake && C.shake(0.5); } catch (e) {} }
        const pr = Math.hypot(fo.pos.x, fo.pos.z); if (s.t >= 0.72 || (C.R && (C.edge ? C.edge(fo.pos.x, fo.pos.z)[0] < 1.7 : pr > C.R - 1.7))) { s.ph = 'rec'; s.t = 0; f.play(fo.armed ? 'Sword_Idle' : 'Idle_Loop', { fade: 0.2 }); fo.broken = Math.max(fo.broken || 0, 1.0); if (!s.hit) { try { C.toast && C.toast('💢 冲空了——破绽！', '#ffe070', 1.1); } catch (e) {} } }
        return { turnTo: s.yaw, spd: 0 }; }
      if (s.t >= 0.9) fin(fo, 1.0, 0); return { turnTo: face, spd: 0 };
    }
    if (s.k === 'whirl') {
      if (s.ph === 'wind') { const e = s.fx[0]; if (e) { e.m.position.set(fo.pos.x, (C.H ? C.H(fo.pos.x, fo.pos.z) : 0) + 0.07, fo.pos.z); e.m.scale.setScalar(s.R); e.m.material.opacity = 0.12 + 0.3 * Math.abs(Math.sin(s.t * 13)); }
        if (s.t >= 0.5) { s.ph = 'spin'; s.t = 0; f.play(fo.armed ? 'Sword_Regular_C' : 'Melee_Hook', { once: true, fade: 0.05, restart: true, speed: 1.6 }); }
        return { turnTo: face, spd: 0 }; }
      if (s.ph === 'spin') { const e = s.fx[0]; fo.yaw += 14 * dt; if (e) { e.m.position.set(fo.pos.x, (C.H ? C.H(fo.pos.x, fo.pos.z) : 0) + 0.07, fo.pos.z); e.m.material.opacity = 0.35; }
        const ux = dx / Math.max(0.1, d), uz = dz / Math.max(0.1, d); if (d > 1.6) setV(fo, ux * 1.6, uz * 1.6);
        const due = s.hits === 0 ? 0.3 : s.hits === 1 ? 0.62 : 9; if (s.t >= due) { s.hits++; cue(fo, 'backstab'); if (d < s.R) C.hitPlayer(fo, s.dmg, { ang: 0, thrust: true, heavy: false }); }
        if (s.t >= 0.95) { s.ph = 'rec'; s.t = 0; for (const x of s.fx) kill(x); s.fx = []; f.play('Sword_Idle', { fade: 0.15 }); fo.broken = Math.max(fo.broken || 0, 0.7); }
        return { turnTo: fo.yaw, spd: 0 }; }
      if (s.t >= 0.6) fin(fo, 0.9, 0); return { turnTo: face, spd: 0 };
    }
    if (SK2[s.k]) return run2(fo, dt, d, face, dx, dz, P, ctx);
    if (s.k === 'roll') { // 侧翻：躲你的乱挥
      if (s.t < 0.42) { setV(fo, Math.cos(face) * s.dir * 5.6 - Math.sin(face) * 0.6, -Math.sin(face) * s.dir * 5.6 - Math.cos(face) * 0.6); return { turnTo: face, spd: 0 }; }
      fin(fo, 0.1, 0); fo.cd = 0; fo.punish = true; return { turnTo: face, spd: 0 }; // 翻完立刻反击
    }
    if (s.k === 'blink') { // 幽影：闪到背后
      if (s.t < 0.22) return { turnTo: face, spd: 0 };
      if (!s.done) { s.done = true; const pyaw = P.yaw, bx = P.pos.x + Math.sin(pyaw) * 2.0, bz = P.pos.z + Math.cos(pyaw) * 2.0; // 玩家面朝 -Z 方向 = (−sin,−cos)，背后 = +
        const [tx, tz] = arenaClamp(ctx, bx, bz); spark(fo.pos.clone().add(new (T().Vector3)(0, 1, 0)), 14, 'blue'); fo.pos.x = tx; fo.pos.z = tz; spark(fo.pos.clone().add(new (T().Vector3)(0, 1, 0)), 14, 'blue'); cue(fo, 'blink'); fo.yaw = Math.atan2(P.pos.x - tx, P.pos.z - tz); }
      if (s.t >= 0.5) { fin(fo, 0, 0); fo.cd = 0; fo.backstab = true; if (d < 3) F_().attack(fo, d, fo.armed ? 'Sword_Dash' : 'Punch_Cross'); }
      return { turnTo: face, spd: 0 };
    }
    fin(fo, 1, 0); return null;
  }

  // ================= R54l MOD foe_skills2：高阶 / BOSS 专属技能（都有预警和解法）=================
  const SK2 = {
    volley: { n: '三向飞刃', tip: '⚠ 三向飞刃！站到三条红线之间的空隙里' },
    cleave: { n: '半月横扫', tip: '⚠ 半月横扫！前方扇形——绕到她身后或后退出扇区' },
    pull: { n: '锁链拉拽', tip: '⚠ 锁链！红线锁定后横向闪开，否则被拖到她面前挨一刀' },
    quake: { n: '震地三波', tip: '⚠ 震地！三圈地波一圈一圈往外炸——踩着节奏往里或往外走' },
    mark: { n: '月蚀印记', tip: '⚠ 月蚀印记！紫圈跟着你，锁定后立刻走开' },
    rally: { n: '嗜血战吼', tip: '⚠ 战吼！她在回血变强——趁她喊的时候猛码打断', boss: false },
    nova: { n: '月光新星', tip: '⚠ 月光新星！大红圈格挡无效——跑出去，或卡时机闪身', boss: true }
  };
  const SIG = { village: ['cleave', 'volley', 'rally'], forest: ['volley', 'mark', 'pull'], wilds: ['quake', 'cleave', 'pull'], abbey: ['nova', 'mark', 'rally'], swamp: ['mark', 'pull', 'nova'], fortress: ['quake', 'cleave', 'volley'], capital: ['volley', 'mark', 'cleave'], abyss: ['nova', 'quake', 'pull'], peak: ['nova', 'quake', 'mark', 'rally'] };
  const bossSig = fo => (fo.boss && fo.boss.sk) || SIG[fo.bossK] || ['nova', 'quake', 'cleave'];
  function ringM(ctx, x, z, r0, r1, col, op) { const t = T(); const m = new t.Mesh(new t.RingGeometry(r0, r1, 48).rotateX(-Math.PI / 2), new t.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, blending: t.AdditiveBlending, side: t.DoubleSide, fog: false })); m.position.set(x, (ctx.H ? ctx.H(x, z) : 0) + 0.08, z); m.renderOrder = 4; ctx.sc.add(m); const e = { m, life: 9, t: 0, op, kind: 'ring' }; FXL.push(e); return e; }
  function sector(ctx, x, z, r, th, yaw, col, op) { const t = T(); const m = new t.Mesh(new t.CircleGeometry(1, 28, -Math.PI / 2 - th / 2, th).rotateX(-Math.PI / 2), new t.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, blending: t.AdditiveBlending, side: t.DoubleSide, fog: false })); m.position.set(x, (ctx.H ? ctx.H(x, z) : 0) + 0.08, z); m.scale.setScalar(r); m.rotation.y = yaw; m.renderOrder = 4; ctx.sc.add(m); const e = { m, life: 9, t: 0, op, kind: 'sector' }; FXL.push(e); return e; }
  const inStrip = (fo, P, yaw, len, w) => { const rx = P.pos.x - fo.pos.x, rz = P.pos.z - fo.pos.z, ux = Math.sin(yaw), uz = Math.cos(yaw), al = rx * ux + rz * uz, lat = Math.abs(rx * uz - rz * ux); return al > -0.3 && al < len && lat < w / 2 + 0.25; };
  function start2(fo, k, d, P, ctx, face) {
    const f = fo.f, S = SK2[k]; hint(ctx, k, S.tip); try { F_().say(fo, `「${S.n}」`, k === 'nova' || k === 'mark' ? '#d8b8ff' : '#ffb0a0'); } catch (e) { }
    if (k === 'volley') { const fx = [-0.38, 0, 0.38].map(o => { const e = strip(ctx, 0xff4020, 0.9, 0.22); if (e) { e.m.position.set(fo.pos.x, (ctx.H ? ctx.H(fo.pos.x, fo.pos.z) : 0) + 0.07, fo.pos.z); e.m.rotation.y = face + o; e.m.scale.set(0.9, 1, 9); } return e; }); fo.sk = { k, t: 0, yaw: face, fx, dmg: baseDmg(fo, ctx, 0.9) }; f.play('Idle_Shield_Loop', { fade: 0.15 }); }
    else if (k === 'cleave') { fo.sk = { k, t: 0, yaw: face, fx: [sector(ctx, fo.pos.x, fo.pos.z, 3.4, 2.6, face, 0xff3020, 0.2)], dmg: baseDmg(fo, ctx, 1.15) }; f.play('Sword_Idle', { fade: 0.12 }); }
    else if (k === 'pull') { const e = strip(ctx, 0xc060ff, 0.8, 0.22); fo.sk = { k, t: 0, yaw: face, len: Math.min(10, d + 1), fx: [e] }; f.play('Spell_Simple_Idle_Loop', { fade: 0.15 }); }
    else if (k === 'quake') { const B = [[0.4, 2], [2, 3.6], [3.6, 5.2]]; fo.sk = { k, t: 0, B, fx: B.map(b => ringM(ctx, fo.pos.x, fo.pos.z, b[0], b[1], 0xff6020, 0.08)), hit: [0, 0, 0], dmg: baseDmg(fo, ctx, 0.8), x: fo.pos.x, z: fo.pos.z }; f.play('Jump_Start', { once: true, fade: 0.1, restart: true, speed: 0.8 }); }
    else if (k === 'mark') { fo.sk = { k, t: 0, fx: [disc(ctx, P.pos.x, P.pos.z, 1.7, 0xa040ff, 9, 0.25)], dmg: baseDmg(fo, ctx, 1.35) }; f.play('Spell_Simple_Shoot', { once: true, fade: 0.1, restart: true }); }
    else if (k === 'rally') { fo.sk = { k, t: 0, hp0: fo.hp, fx: [ringM(ctx, fo.pos.x, fo.pos.z, 0.6, 1.0, 0xff2020, 0.5)] }; f.play('Idle_Shield_Loop', { fade: 0.12 }); cue(fo, 'rage'); }
    else if (k === 'nova') { fo.sk = { k, t: 0, fx: [disc(ctx, fo.pos.x, fo.pos.z, 4.6, 0xb080ff, 9, 0.18)], dmg: baseDmg(fo, ctx, 1.5) }; f.play('Spell_Simple_Idle_Loop', { fade: 0.15 }); cue(fo, 'cast'); }
    return true;
  }
  function run2(fo, dt, d, face, dx, dz, P, ctx) {
    const s = fo.sk, f = fo.f, C = ctx, hitP = (mul, h) => C.hitPlayer(fo, Math.round(s.dmg * (mul || 1)), Object.assign({ ang: 0, thrust: true }, h || {}));
    if (s.k === 'volley') { if (s.t < 0.75) { for (const e of s.fx) if (e) e.m.material.opacity = 0.12 + 0.25 * (s.t / 0.75); return { turnTo: s.yaw, spd: 0 }; }
      if (!s.done) { s.done = 1; f.play('Spell_Simple_Shoot', { once: true, fade: 0.05, restart: true }); cue(fo, 'cast'); if ([-0.38, 0, 0.38].some(o => inStrip(fo, P, s.yaw + o, 9, 0.9))) hitP(1); for (const e of s.fx) kill(e); s.fx = []; }
      if (s.t > 1.25) fin(fo, 0.8, 0.5); return { turnTo: s.yaw, spd: 0 }; }
    if (s.k === 'cleave') { const e = s.fx[0]; if (s.t < 0.7) { if (e) { e.m.position.set(fo.pos.x, e.m.position.y, fo.pos.z); e.m.material.opacity = 0.12 + 0.3 * (s.t / 0.7); } return { turnTo: s.yaw, spd: 0 }; }
      if (!s.done) { s.done = 1; f.play(fo.armed ? 'Sword_Regular_C' : 'Melee_Hook', { once: true, fade: 0.05, restart: true, speed: 1.4 }); cue(fo, 'backstab'); const a = Math.atan2(P.pos.x - fo.pos.x, P.pos.z - fo.pos.z); if (d < 3.4 && Math.abs(ang(a - s.yaw)) < 1.3) hitP(1, { heavy: true, thrust: false, ang: 0 }); for (const x of s.fx) kill(x); s.fx = []; }
      if (s.t > 1.35) fin(fo, 0.9, 0.7); return { turnTo: s.yaw, spd: 0 }; }
    if (s.k === 'pull') { const e = s.fx[0]; if (s.t < 0.55) s.yaw = face;
      if (s.t < 0.8) { if (e) { e.m.position.set(fo.pos.x, (C.H ? C.H(fo.pos.x, fo.pos.z) : 0) + 0.07, fo.pos.z); e.m.rotation.y = s.yaw; e.m.scale.set(0.8, 1, s.len); e.m.material.opacity = s.t < 0.55 ? 0.15 : 0.45; } return { turnTo: s.yaw, spd: 0 }; }
      if (!s.done) { s.done = 1; for (const x of s.fx) kill(x); s.fx = []; cue(fo, 'cast');
        if (inStrip(fo, P, s.yaw, s.len, 0.8)) { s.pull = { x0: P.pos.x, z0: P.pos.z, x1: fo.pos.x + Math.sin(s.yaw) * 1.3, z1: fo.pos.z + Math.cos(s.yaw) * 1.3, t: 0 }; try { C.toast && C.toast('⛓️ 你被锁链拖了过去！', '#d8b0ff', 1.2); } catch (er) { } } }
      if (s.pull) { s.pull.t += dt; const k2 = Math.min(1, s.pull.t / 0.25); P.pos.x = s.pull.x0 + (s.pull.x1 - s.pull.x0) * k2; P.pos.z = s.pull.z0 + (s.pull.z1 - s.pull.z0) * k2; if (k2 >= 1) { s.pull = null; fin(fo, 0, 0); fo.cd = 0; F_().attack(fo, 1.3, fo.armed ? 'Sword_Dash' : 'Punch_Cross'); return null; } return { turnTo: s.yaw, spd: 0 }; }
      if (s.t > 1.2) fin(fo, 0.9, 0.6); return { turnTo: face, spd: 0 }; }
    if (s.k === 'quake') { if (s.t < 0.8) { s.fx.forEach(e => { if (e) e.m.material.opacity = 0.06 + 0.12 * (s.t / 0.8); }); return { turnTo: face, spd: 0 }; }
      if (!s.slam) { s.slam = 1; f.play('Jump_Land', { once: true, fade: 0.05, restart: true, speed: 1.4 }); cue(fo, 'slam'); try { C.shake && C.shake(0.4); } catch (er) { } }
      const pd = Math.hypot(P.pos.x - s.x, P.pos.z - s.z); s.B.forEach((b, i) => { const at = 0.8 + i * 0.38, e = s.fx[i]; if (s.t >= at && !s.hit[i]) { s.hit[i] = 1; if (e) e.m.material.opacity = 0.55; if (pd >= b[0] - 0.2 && pd <= b[1] + 0.2) hitP(1, { heavy: true }); } else if (s.hit[i] && e) e.m.material.opacity = Math.max(0, e.m.material.opacity - dt * 1.6); });
      if (s.t > 2.1) fin(fo, 1.0, 0.9); return { turnTo: face, spd: 0 }; }
    if (s.k === 'mark') { const e = s.fx[0], FF = !window.Mods || Mods.on('fair_fight') !== false, tEnd = FF ? 0.9 : 1.3, fr = FF ? 2.2 : 6; if (s.t < tEnd) { if (e) { e.m.position.x += (P.pos.x - e.m.position.x) * Math.min(1, dt * fr); e.m.position.z += (P.pos.z - e.m.position.z) * Math.min(1, dt * fr); e.m.material.opacity = 0.18 + 0.1 * Math.sin(s.t * 12); } return { turnTo: face, spd: 0 }; } // R54n：追踪圈只追 0.9 秒且跟得慢，锁定后有 0.95 秒走出去
      if (s.t < 1.85) { if (e) e.m.material.opacity = 0.5; return { turnTo: face, spd: 0 }; }
      if (!s.done) { s.done = 1; if (e) { spark(new (T().Vector3)(e.m.position.x, e.m.position.y + 0.4, e.m.position.z), 26, 'blue'); if (Math.hypot(P.pos.x - e.m.position.x, P.pos.z - e.m.position.z) < (FF ? 1.4 : 1.7)) hitP(1, { unblock: true }); } for (const x of s.fx) kill(x); s.fx = []; try { C.shake && C.shake(0.3); } catch (er) { } }
      if (s.t > 2.2) fin(fo, 0.7, 0); return { turnTo: face, spd: 0 }; }
    if (s.k === 'rally') { if (fo.hp < s.hp0 - fo.maxHp * 0.08) { for (const x of s.fx) kill(x); s.fx = []; fo.rallied = 1; fin(fo, 1.2, 1.3); try { C.toast && C.toast('💥 打断了她的战吼！', '#ffe070', 1.3); } catch (er) { } return null; }
      if (s.t < 1.0) { const e = s.fx[0]; if (e) { e.m.position.set(fo.pos.x, e.m.position.y, fo.pos.z); e.m.scale.setScalar(1 + s.t * 1.2); } return { turnTo: face, spd: 0 }; }
      fo.rallied = 1; fo.hp = Math.min(fo.maxHp, fo.hp + fo.maxHp * 0.1); fo.dmgMul = (fo.dmgMul || 1) * 1.15; for (const x of s.fx) kill(x); s.fx = []; cue(fo, 'rage'); try { C.toast && C.toast('🩸 她的战吼完成了：回血、变狠', '#ff9a80', 1.6); C.bossHp && fo.boss && C.bossHp(fo); } catch (er) { } fin(fo, 0.6, 0); return null; }
    if (s.k === 'nova') { const e = s.fx[0]; if (s.t < 1.2) { if (e) { e.m.position.set(fo.pos.x, e.m.position.y, fo.pos.z); e.m.material.opacity = 0.1 + 0.3 * (s.t / 1.2); } return { turnTo: face, spd: 0 }; }
      if (!s.done) { s.done = 1; f.play('Spell_Simple_Shoot', { once: true, fade: 0.05, restart: true }); spark(fo.pos.clone().add(new (T().Vector3)(0, 1, 0)), 40, 'blue'); try { C.shake && C.shake(0.6); C.flash && C.flash('#c8b0ff'); } catch (er) { } if (d < 4.6) hitP(1, { unblock: true, heavy: true }); for (const x of s.fx) kill(x); s.fx = []; }
      if (s.t > 1.9) fin(fo, 1.2, 1.2); return { turnTo: face, spd: 0 }; }
    fin(fo, 1, 0); return null;
  }

  function tick(fo, dt, d, face, dx, dz, P, ctx) {
    if (!fo.aff || fo.dead || fo.stag > 0 || fo.atk) return null;
    if (fo.sk) return runSkill(fo, dt, d, face, dx, dz, P, ctx);
    fo.skCd -= dt; fo.dodgeCd -= dt;
    const Foe_ = F_(), tok = () => Foe_.tokenOK(fo) && !others(fo); const tact = M('foe_tactics');
    const tier = fo.tier || 0, rel = ang(Math.atan2(-dx, -dz) - P.yaw);
    // --- 战术层 ---
    if (tact) {
      // 1) 你挥空 → 立刻反击
      if (CLKA - swEnd < 0.35 && d < 3.0 && fo.cd < 0.9 && fo.iq > 0.6 && !fo.punishT && Math.random() < 0.5 + 0.4 * tier) { fo.cd = 0; fo.punish = true; fo.punishT = 1.2; }
      if (fo.punishT) fo.punishT = Math.max(0, fo.punishT - dt);
      // 2) 你在乱挥 → 侧翻躲开（盾卫/游击/决斗者有自己的一套，不重复）
      if (fo.dodgeCd <= 0 && d < 3.0 && ctx.playerSwinging && ctx.playerSwinging() && fo.iq > 0.6 && !fo.boss && !/skirm|guard|duelist|juggernaut/.test(fo.role || '') && Math.random() < dt * 5 * (0.3 + 0.9 * tier)) {
        fo.dodgeCd = 3.6 / (1 + tier); fo.sk = { k: 'roll', t: 0, dir: Math.random() < 0.5 ? -1 : 1 }; fo.f.play('Roll', { once: true, fade: 0.05, restart: true, speed: 1.9 }); cue(fo, 'roll'); return { turnTo: face, spd: 0 }; }
      // 3) 你背对她 → 偷袭
      if (Math.abs(rel) > 2.2 && d < 5.5 && d > 1.6 && fo.cd <= 0 && fo.iq > 0.8 && fo.armed && !fo.role && tok() && Math.random() < dt * 1.4) { fo.backstab = true; cue(fo, 'backstab'); Foe_.attack(fo, d, 'Sword_Dash'); return { turnTo: face, spd: 0 }; }
    }
    // --- 幽影：瞬移绕背 ---
    if (fo.aff.phantom) { fo.phT = (fo.phT == null ? 4 + Math.random() * 3 : fo.phT) - dt; if (fo.phT <= 0 && d > 3.2 && d < 12 && fo.cd < 2) { fo.phT = 6.5 + Math.random() * 3; fo.sk = { k: 'blink', t: 0 }; fo.f.play('Spell_Simple_Shoot', { once: true, fade: 0.05, restart: true }); cue(fo, 'cast'); return { turnTo: face, spd: 0 }; } }
    // --- 技能 ---
    if (M('foe_skills') && fo.skCd <= 0 && fo.cd <= 0.4 && tok()) {
      const gate = 0.2 + 0.65 * tier + (fo.boss ? 0.2 : 0) + 0.05 * fo.rar + (window.__skillP || 0) + (M('foe_skills3') ? 0.12 : 0);
      if (Math.random() > gate) { fo.skCd = 2 + Math.random() * 2.5; return null; }
      const pool = [];
      if (d >= 3.6 && d <= 9.5) { pool.push('leap', 'leap'); pool.push('charge'); }
      if (d >= 4 && d <= 10) pool.push('charge');
      if (d < 2.7 && fo.armed) pool.push('whirl');
      if (d < 2.6) pool.push('breaker', 'breaker');
      if (fo.skPool) { for (let i = pool.length - 1; i >= 0; i--) if (!fo.skPool.includes(pool[i])) pool.splice(i, 1); } /* R35：猎手/精英限定技能池 */
      if (M('foe_skills2')) { // R54l：阶位越高技能越多；BOSS 有自己的招牌技
        const T2 = fo.boss ? 3 : Math.max(0, Math.min(3, fo.tier | 0)), sig = fo.boss ? bossSig(fo) : null, add = (k, ok) => { if (ok && (!sig || sig.includes(k) || !SK2[k].boss)) pool.push(k); };
        if (T2 >= 1) { add('volley', d >= 3 && d <= 9); add('cleave', d < 3.4); }
        if (T2 >= 2) { add('pull', d >= 3.5 && d <= 9); add('quake', d < 4.5); }
        if (T2 >= 3) { add('mark', d < 12); add('rally', fo.hp < fo.maxHp * 0.75 && !fo.rallied); }
        if (fo.boss) add('nova', d < 4.2);
        if (sig) for (const k of sig) if (pool.includes(k)) pool.push(k, k); // 招牌技更常见
      }
      if (M('foe_skills3')) for (const k in EXT) { try { const w = EXT[k].can(fo, d, ctx, P) | 0; for (let i = 0; i < w; i++) pool.push(k); } catch (e) { } }
      if (!fo.skPool && (fo.role === 'mage' || fo.role === 'healer' || fo.role === 'ranged' || fo.role === 'guard')) { fo.skCd = 3; return null; }
      if (!pool.length) { fo.skCd = 0.6; return null; }
      const forced = window.__forceSkill; const k = forced && pool.includes(forced) ? forced : forced ? forced : pool[Math.floor(Math.random() * pool.length)];
      if (startSkill(fo, k, d, P, ctx, face)) return fo.sk ? { turnTo: face, spd: 0 } : null;
    }
    return null;
  }

  return { init, tune, after, evade, preHit, onDie, update, tick, clear, packBonus, dmgK, AFF, SK2, SIG, M, reg, EXT, api, get _fx() { return FXL; } };
})();
