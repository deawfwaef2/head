// R37（主管）：更多敌人类型 · 第三批（MOD `foe_roles3`，默认开；关掉 = 没有这 6 种）
// 用户：“敌人种类太少，而且太简单，战斗过程很粗糙”。每种都有清楚的预警（地面标记 / 起手动作）和明确的应对方法：
//   长枪手 lancer（持械）：保持 3~4 米，地上亮一条红线 0.75 秒后直线突刺 5 米——横移躲开；突刺落空后她会踉跄（破绽）
//   双刀舞姬 twinblade（持械）：快速三连斩，砍完立刻后跳；你出刀时她会侧闪——等她落地、或用格挡接住连斩
//   炼金投弹手 bomber（徒手）：远处抛药瓶，落点先亮橙圈 ~1.1 秒后爆炸并点燃——看到橙圈就走出去
//   猎网手 netter（持械）：甩出网，被网住 1.3 秒不能移动（连按空格挣脱）——挥刀砍断网 / 右键格挡；她会趁你被网住冲上来
//   陷阱师 trapper（持械）：在你和她之间埋捕兽夹（红色小圈），踩中夹住 + 流血——绕开红圈，她本人很脆
//   唤灵师 wispcaller（徒手）：召唤会追人的鬼火，碰到就炸——挥刀把鬼火打散，然后追上去砍她（被打会中断吟唱）
// 全部是特效（发光球 / 光环 / 地面标记），不新建模型；动画只用已有的 Sword_* / Spell_* / Roll / Fixing_Kneeling 片段。
// 接入方式：不改 foe_roles.js / foe_roles2.js——加载时包一层 FoeRoles2 的钩子（foe_roles.js 每次都通过 window.FoeRoles2.X 调用）。
// 定身：worlds.js 玩家移动速度乘 FoeRoles3.moveK()（主管文件，一处）。
window.FoeRoles3 = (() => {
  'use strict';
  const on = () => !window.Mods || !Mods.on || Mods.on('foe_roles3') !== false;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), ang = a => Math.atan2(Math.sin(a), Math.cos(a));
  const T = () => window.THREE, FR = () => window.FoeRoles, cue = (fo, k) => { try { window.CombatFX && CombatFX.roleCue(fo, k); } catch (e) {} };
  const spark = (p, n, c) => { try { window.Foe && Foe.spark && Foe.spark(p, n, c); } catch (e) {} };
  const say = (fo, s, c) => { try { window.Foe && Foe.say && Foe.say(fo, s, c); } catch (e) {} };
  const INFO = {
    lancer: { n: '长枪手', ic: '🔱', col: '#ffb070', hp: 1.0, spd: 0.95, dmg: 1.1, tint: [1, 0.86, 0.72], tip: '地上亮红线 = 马上直线突刺：横移躲开！突刺落空后她会踉跄——那就是破绽' },
    twinblade: { n: '双刀舞姬', ic: '⚔️', col: '#ff9ad0', hp: 0.8, spd: 1.2, dmg: 0.8, tint: [1, 0.8, 0.92], tip: '快速三连斩后立刻后跳，你出刀她会侧闪——右键格挡接住连斩，或等她落地再砍' },
    bomber: { n: '炼金投弹手', ic: '🧪', col: '#ffa040', hp: 0.7, spd: 1.0, dmg: 1.0, tint: [1, 0.85, 0.6], tip: '抛药瓶：落点先亮橙圈，约一秒后爆炸并点燃——看到橙圈立刻走出去，然后冲过去砍她' },
    netter: { n: '猎网手', ic: '🕸️', col: '#d8e0c0', hp: 0.95, spd: 1.0, dmg: 0.9, tint: [0.9, 0.95, 0.8], tip: '甩网：被网住就动不了（连按空格挣脱）——挥刀砍断飞来的网，或右键格挡' },
    trapper: { n: '陷阱师', ic: '🪤', col: '#ff7060', hp: 0.75, spd: 1.05, dmg: 0.8, tint: [0.95, 0.8, 0.75], tip: '在地上埋捕兽夹（红色小圈），踩中会被夹住流血——绕开红圈，她本人很脆' },
    wispcaller: { n: '唤灵师', ic: '👻', col: '#90e0ff', hp: 0.7, spd: 1.0, dmg: 1.0, tint: [0.8, 0.92, 1], tip: '召唤会追人的鬼火，碰到就炸——挥刀打散鬼火，再追上去砍她（打中她会中断吟唱）' }
  };
  const R = { lancer: 1, twinblade: 1, bomber: 1, netter: 1, trapper: 1, wispcaller: 1 };
  const CNT = { bomb: 0, net: 0, trap: 0, wisp: 0, lunge: 0, rooted: 0, netCut: 0, wispPop: 0 };
  const FX = [], BOMBS = [], NETS = [], TRAPS = [], WISPS = [], LINES = [];
  const st = (ctx) => { try { return ctx.st ? ctx.st() : G.st(); } catch (e) { return { maxHp: 100 }; } };
  const dmgOf = (fo, ctx, k) => Math.max(2, Math.round(st(ctx).maxHp * k * (fo.dmgMul || 1) * (1 + 0.08 * (fo.rar || 0))));
  const gy = (ctx, x, z) => (ctx && ctx.H ? ctx.H(x, z) : 0);

  // ---------- 特效小件 ----------
  let ringGeo = null, discGeo = null;
  function addMesh(ctx, m) { m.renderOrder = 4; ctx.sc.add(m); return m; }
  function kill3(o) { if (!o) return; o.parent && o.parent.remove(o); o.traverse && o.traverse(c => { if (c.material) c.material.dispose(); if (c.geometry && c.geometry !== ringGeo && c.geometry !== discGeo) c.geometry.dispose(); }); }
  function mat(col, op) { const t = T(); return new t.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, blending: t.AdditiveBlending, side: t.DoubleSide, fog: false }); }
  function ringAt(ctx, x, z, col, r, op) { const t = T(); ringGeo = ringGeo || new t.RingGeometry(0.86, 1.0, 48).rotateX(-Math.PI / 2); const m = new t.Mesh(ringGeo, mat(col, op)); m.position.set(x, gy(ctx, x, z) + 0.06, z); m.scale.setScalar(r); return addMesh(ctx, m); }
  function discAt(ctx, x, z, col, r, op) { const t = T(); discGeo = discGeo || new t.CircleGeometry(1, 40).rotateX(-Math.PI / 2); const m = new t.Mesh(discGeo, mat(col, op)); m.position.set(x, gy(ctx, x, z) + 0.05, z); m.scale.setScalar(r); return addMesh(ctx, m); }
  function pulse(ctx, x, z, col, r0, r1, life) { const m = ringAt(ctx, x, z, col, r0, 0.85); FX.push({ m, t: 0, life, r0, r1 }); }
  function orb(col, r) { const t = T(), g = new t.Group(); g.add(new t.Mesh(new t.SphereGeometry(r * 0.45, 10, 8), new t.MeshBasicMaterial({ color: 0xffffff, fog: false }))); g.add(new t.Mesh(new t.SphereGeometry(r, 12, 10), mat(col, 0.5))); return g; }
  function handPos(fo) { const t = T(), b = fo.f.bones, h = b.rightHand || b.leftHand || b.chest, v = new t.Vector3(); if (h) h.getWorldPosition(v); else v.set(fo.pos.x, fo.pos.y + 1.3, fo.pos.z); return v; }

  // ---------- 玩家状态：定身 / 燃烧 ----------
  let rootT = 0, burnT = 0, burnTick = 0, burnFo = null, ovl = null, lastP = null; const pv = { x: 0, z: 0 };
  function overlay() {
    if (ovl || typeof document === 'undefined') return ovl; ovl = document.createElement('div'); ovl.id = 'fr3root';
    ovl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:40;display:none;background:repeating-linear-gradient(45deg,rgba(230,230,200,.0) 0 26px,rgba(230,230,200,.22) 26px 29px),repeating-linear-gradient(-45deg,rgba(230,230,200,.0) 0 26px,rgba(230,230,200,.22) 26px 29px);box-shadow:inset 0 0 120px rgba(0,0,0,.55)';
    const tx = document.createElement('div'); tx.style.cssText = 'position:absolute;left:50%;top:62%;transform:translateX(-50%);font:700 18px/1.4 sans-serif;color:#f4f0d8;text-shadow:0 2px 6px #000;letter-spacing:2px;background:rgba(20,18,12,.55);padding:4px 16px;border-radius:8px;border:1px solid rgba(240,230,190,.35)'; ovl.appendChild(tx);
    document.body.appendChild(ovl); return ovl;
  }
  function root(sec, why) {
    rootT = Math.max(rootT, sec); CNT.rooted++; const o = overlay(); if (o) { o.style.display = 'block'; o.firstChild.textContent = why + ' —— 连按空格挣脱'; }
    try { window.CombatFX && CombatFX.marker && CombatFX.marker('hit'); } catch (e) {}
  }
  if (typeof addEventListener !== 'undefined') addEventListener('keydown', e => { if (rootT > 0 && e.code === 'Space' && !e.repeat) { rootT = Math.max(0, rootT - 0.28); } }, true);
  function moveK() { return !on() ? 1 : rootT > 0 ? 0 : 1; }

  // ---------- 分配 ----------
  function pick(fo, r, cur) {
    if (!on()) return null; { const fr = window.__forceRole; if (fr) { const k = Array.isArray(fr) ? fr[Foe.foes.length] : fr; if (R[k]) return k; return null; } }
    if (r() > 0.38) return null; // 约 38% 的敌人换成第三批职业（旧 11 种仍占多数）
    const n = (window.Foe && Foe.foes ? Foe.foes.length : 0);
    const pool = fo.armed ? [['lancer', 0.3], ['twinblade', 0.28], ['netter', 0.22], ['trapper', 0.2]] : [['bomber', 0.55], ['wispcaller', n >= 1 ? 0.45 : 0.15]];
    const sum = pool.reduce((a, b) => a + b[1], 0); let x = r() * sum; for (const [k, p] of pool) if ((x -= p) <= 0) return k; return null;
  }
  function init(fo, role) {
    const rs = fo.rs = fo.rs || {}; rs.c3 = 1 + Math.random() * 1.5; rs.dodgeCd = 1.5;
    if (role === 'bomber' || role === 'wispcaller' || role === 'trapper') { fo.brave = true; fo.retreated = true; }
    if (role === 'lancer') { fo.brave = true; fo.retreated = true; }
  }
  function clip(fo, cur, d, force) {
    const r = Math.random();
    switch (fo.role) {
      case 'lancer': return r < 0.6 ? 'Sword_Attack' : 'Sword_Regular_B';
      case 'twinblade': return r < 0.65 ? 'Sword_Regular_Combo' : 'Sword_Dash';
      case 'netter': return r < 0.5 ? 'Sword_Regular_A' : null;
      case 'trapper': return r < 0.5 ? 'Sword_Regular_C' : null;
      case 'bomber': case 'wispcaller': return 'Punch_Cross';
    }
    return null;
  }
  function tune(fo, A, d) {
    const role = fo.role;
    if (role === 'twinblade') { A.dmgMul = (A.dmgMul || 1) * 0.72; A.hold *= 0.55; A.feint = false; } // 起手短、刀多、每刀轻
    else if (role === 'lancer') { A.reach += 0.6; A.hold *= 0.9; for (const h of A.hits) h.thrust = true; }
    else if (role === 'trapper') { A.dmgMul = (A.dmgMul || 1) * 0.85; }
  }
  function after(fo) {
    const rs = fo.rs || {};
    if (fo.role === 'twinblade') { rs.counter = 0; rs.hop = 0.42; fo.cd = Math.max(0.7, fo.cd * 0.6); fo.f.play('Roll', { once: true, fade: 0.06, restart: true, speed: -1.6 }); }
    else if (fo.role === 'lancer') fo.cd += 0.3;
  }

  // ---------- 投掷 / 召唤 ----------
  function throwBomb(fo, ctx, spread) {
    const P = ctx.player, from = handPos(fo), fl = 1.05 + Math.min(0.5, Math.hypot(P.pos.x - fo.pos.x, P.pos.z - fo.pos.z) * 0.03);
    let tx = P.pos.x + pv.x * fl * 0.55, tz = P.pos.z + pv.z * fl * 0.55; if (spread) { const a = Math.random() * 6.28; tx += Math.cos(a) * spread; tz += Math.sin(a) * spread; }
    const g = orb(0xff8a30, 0.14); g.position.copy(from); ctx.sc.add(g);
    const warn = ringAt(ctx, tx, tz, 0xff7a20, 2.2, 0.75), fill = discAt(ctx, tx, tz, 0xff5a10, 0.1, 0.28);
    CNT.bomb++; BOMBS.push({ fo, g, warn, fill, x0: from.x, y0: from.y, z0: from.z, tx, tz, t: 0, T: fl, R: 2.2 }); cue(fo, 'cast');
  }
  function throwNet(fo, ctx) {
    const t = T(), P = ctx.player, from = handPos(fo), to = new t.Vector3(P.pos.x + pv.x * 0.3, P.pos.y + 1.0, P.pos.z + pv.z * 0.3), v = to.sub(from).normalize().multiplyScalar(10.5);
    const g = new t.Group(); const net = new t.Mesh(new t.RingGeometry(0.1, 0.55, 8, 1), mat(0xeeeecc, 0.55)); const knot = new t.Mesh(new t.RingGeometry(0.28, 0.33, 8), mat(0xffffff, 0.8)); g.add(net); g.add(knot);
    g.position.copy(from); ctx.sc.add(g); CNT.net++; NETS.push({ fo, g, v, life: 1.4 }); cue(fo, 'cast');
  }
  function placeTrap(fo, ctx, x, z) {
    const mine = TRAPS.filter(q => q.fo === fo); if (mine.length >= 3) { const o = mine[0]; kill3(o.a); kill3(o.b); TRAPS.splice(TRAPS.indexOf(o), 1); }
    const a = ringAt(ctx, x, z, 0xff3a2a, 0.55, 0.0), b = discAt(ctx, x, z, 0xff2a1a, 0.18, 0.0); CNT.trap++; TRAPS.push({ fo, x, z, a, b, t: 0 }); pulse(ctx, x, z, 0xff5040, 0.2, 0.9, 0.5);
  }
  function summon(fo, ctx) {
    const hp = handPos(fo); let n = 0; for (const w of WISPS) if (w.fo === fo) n++;
    const k = Math.min(2, 4 - n); for (let i = 0; i < k; i++) { const g = orb(0x80d8ff, 0.2); g.position.set(hp.x + (i ? 0.6 : -0.6), hp.y + 0.4, hp.z); ctx.sc.add(g); CNT.wisp++; WISPS.push({ fo, g, t: 0, life: 8, ph: Math.random() * 6 }); }
    spark(hp, 14, 'blue'); cue(fo, 'cast');
  }

  // ---------- 长枪手的地面红线 ----------
  function lineShow(fo, ctx, dir, len) {
    const t = T(); if (!fo.rs.line) { const m = new t.Mesh(new t.PlaneGeometry(0.75, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5), mat(0xff3020, 0.1)); fo.rs.line = addMesh(ctx, m); LINES.push(fo); }
    const m = fo.rs.line; m.position.set(fo.pos.x, gy(ctx, fo.pos.x, fo.pos.z) + 0.07, fo.pos.z); m.rotation.y = Math.atan2(dir.x, dir.z); m.scale.set(1, 1, len); return m;
  }
  function lineHide(fo) { if (fo.rs && fo.rs.line) { kill3(fo.rs.line); fo.rs.line = null; } const i = LINES.indexOf(fo); if (i >= 0) LINES.splice(i, 1); }

  // ---------- 每帧接管移动 ----------
  function tick(fo, dt, d, face, dx, dz, P, ctx) {
    const rs = fo.rs, f = fo.f, role = fo.role, ux = dx / (d || 1), uz = dz / (d || 1), tok = () => window.Foe && Foe.tokenOK(fo);
    rs.c3 -= dt; rs.dodgeCd = (rs.dodgeCd || 0) - dt;
    const swinging = () => ctx.playerSwinging && ctx.playerSwinging();
    const hold = (clipN, sp) => { if (clipN) f.play(clipN, { fade: 0.25, speed: sp || 1 }); return { turnTo: face, spd: 0 }; };
    const back = (v) => { fo.rv = { x: -ux * v, z: -uz * v }; f.play('Walk_Loop', { fade: 0.25, speed: -0.95 }); return { turnTo: face, spd: 0 }; };
    const strafe = (v, per) => { const sg = (Math.floor(rs.t / (per || 2.2)) % 2) ? 1 : -1; fo.rv = { x: -uz * sg * v, z: ux * sg * v }; f.play('Walk_Loop', { fade: 0.25, speed: 1 }); return { turnTo: face, spd: 0 }; };

    if (rs.esc > 0) { rs.esc -= dt; const v = role === 'twinblade' ? 5.8 : 6.2; fo.rv = role === 'twinblade' ? { x: -uz * rs.escSide * v, z: ux * rs.escSide * v } : { x: -ux * v, z: -uz * v }; return { turnTo: face, spd: 0 }; }
    if (role === 'lancer') {
      if (rs.lunge > 0) { // 突刺中：沿锁定方向高速前冲
        rs.lunge -= dt; fo.rv = { x: rs.ld.x * 12.5, z: rs.ld.z * 12.5 };
        if (!rs.lhit && Math.hypot(P.pos.x - fo.pos.x, P.pos.z - fo.pos.z) < 1.15) { rs.lhit = true; ctx.hitPlayer(fo, dmgOf(fo, ctx, 0.15), { ang: 0, thrust: true, heavy: true }); try { ctx.shake && ctx.shake(0.4); } catch (e) {} }
        if (rs.lunge <= 0) { rs.armor = 0; lineHide(fo); fo.cd = 1.6 + Math.random() * 0.6; if (!rs.lhit) { fo.broken = Math.max(fo.broken || 0, 1.2); f.play('Hit_Knockback', { once: true, fade: 0.08, restart: true }); if (!FR().tip3l) { FR().tip3l = 1; ctx.toast && ctx.toast('🔱 突刺落空——她踉跄了，砍她！', '#ffb070', 1.6); } } }
        return { turnTo: Math.atan2(rs.ld.x, rs.ld.z), spd: 0 };
      }
      if (rs.aim > 0) { // 蓄势：地面红线越来越亮，方向锁定（前 0.35 秒还会微调）
        rs.aim -= dt; if (rs.aim > 0.3) { rs.ld = { x: ux, z: uz }; } const m = lineShow(fo, ctx, rs.ld, 5.2); m.material.opacity = 0.18 + 0.5 * (1 - rs.aim / (rs.aim0 || 0.8));
        if (rs.aim <= 0) { rs.lunge = 0.42; rs.lhit = false; CNT.lunge++; f.play('Sword_Dash', { once: true, fade: 0.05, restart: true, speed: 1.4 }); cue(fo, 'dash'); }
        fo.rv = { x: 0, z: 0 }; return { turnTo: Math.atan2(rs.ld.x, rs.ld.z), spd: 0 };
      }
      if (rs.c3 <= 0 && d > (rs.quick ? 1.8 : 2.4) && d < 5.6 && (rs.quick || tok())) { rs.c3 = 3.6 + Math.random() * 1.6; rs.aim = rs.aim0 = rs.quick ? 0.55 : 0.8; rs.armor = rs.quick ? 1 : 0; rs.quick = 0; rs.ld = { x: ux, z: uz }; f.play('Sword_Block', { once: true, fade: 0.1, restart: true }); say(fo, '……', '#ffb070'); return { turnTo: face, spd: 0 }; }
      if (d < 2.2) return fo.cd <= 0 ? null : back(1.8); // 被贴近：普通刺击，或退开拉距离
      if (d > 5.2) { f.play('Jog_Fwd_Loop', { fade: 0.25 }); return { turnTo: face, spd: 3.4 }; }
      return strafe(1.3, 2.6);
    }
    if (role === 'twinblade') {
      if (rs.hop > 0) { rs.hop -= dt; fo.rv = { x: -ux * 5.2, z: -uz * 5.2 }; return { turnTo: face, spd: 0 }; }
      if (rs.side > 0) { rs.side -= dt; fo.rv = { x: -uz * rs.sd * 5.6, z: ux * rs.sd * 5.6 }; return { turnTo: face, spd: 0 }; }
      if (rs.dodgeCd <= 0 && d < 3.2 && swinging() && Math.random() < dt * 5) { rs.dodgeCd = 2.4 + Math.random(); rs.side = 0.34; rs.sd = Math.random() < 0.5 ? -1 : 1; fo.atk = null; f.play('Roll', { once: true, fade: 0.05, restart: true, speed: 1.9 }); cue(fo, 'dodge'); return { turnTo: face, spd: 0 }; }
      if (fo.cd <= 0) return null; // 该出手：原逻辑贴上去连斩
      if (d > 4.5) { f.play('Sprint_Loop', { fade: 0.2 }); return { turnTo: face, spd: 4.6 }; }
      return strafe(2.2, 1.4); // 快速左右游走
    }
    if (role === 'netter') {
      if (rootT > 0) { rs.cast = 0; fo.cd = Math.min(fo.cd, 0.25); if (d > 2.0) { f.play('Sprint_Loop', { fade: 0.2 }); return { turnTo: face, spd: 5.0 }; } return null; } // 你被网住：冲上来
      if (rs.cast > 0) { rs.cast -= dt; if (!rs.fired && rs.cast < 0.25) { rs.fired = true; throwNet(fo, ctx); } return { turnTo: face, spd: 0 }; }
      if (rs.c3 <= 0 && d > 3 && d < 10) { rs.c3 = 5.5 + Math.random() * 2; rs.cast = 0.7; rs.fired = false; f.play('Spell_Simple_Shoot', { once: true, fade: 0.08, restart: true, speed: 0.8 }); say(fo, '别跑！', '#e8f0d0'); return { turnTo: face, spd: 0 }; }
      return null;
    }
    if (role === 'trapper') {
      if (rs.kneel > 0) { rs.kneel -= dt; if (!rs.placed && rs.kneel < 0.3) { rs.placed = true; placeTrap(fo, ctx, rs.tx, rs.tz); } return { turnTo: face, spd: 0 }; }
      if (rs.c3 <= 0 && d > 3.2 && d < 12) { // 在你和她之间（偏你那边）埋夹子
        rs.c3 = 3.8 + Math.random() * 1.5; rs.kneel = 0.8; rs.placed = false; const k = clamp(1.6 / d, 0.15, 0.6); rs.tx = fo.pos.x + dx * k + (Math.random() - 0.5) * 1.2; rs.tz = fo.pos.z + dz * k + (Math.random() - 0.5) * 1.2;
        f.play('Fixing_Kneeling', { once: true, fade: 0.12, restart: true, speed: 1.4 }); return { turnTo: face, spd: 0 };
      }
      if (d < 2.6) return fo.cd <= 0 ? null : back(2.2);
      if (d < 5) return back(1.6); // 引你踩夹子
      if (d > 11) { f.play('Jog_Fwd_Loop', { fade: 0.25 }); return { turnTo: face, spd: 3.3 }; }
      return strafe(1.2, 2.8);
    }
    if (role === 'bomber' || role === 'wispcaller') {
      if (rs.cast > 0) { rs.cast -= dt; if (!rs.fired && rs.cast < 0.35) { rs.fired = true; if (role === 'bomber') { throwBomb(fo, ctx, 0); if (fo.hp < fo.maxHp * 0.5) throwBomb(fo, ctx, 2.4); } else summon(fo, ctx); } return { turnTo: face, spd: 0 }; }
      const lo = role === 'bomber' ? 5.5 : 6.5, hi = role === 'bomber' ? 12 : 13;
      if (rs.c3 <= 0 && d >= 3.5 && d <= hi + 1) {
        if (role === 'bomber') { rs.c3 = (fo.hp < fo.maxHp * 0.5 ? 2.6 : 3.4) + Math.random() * 1.2; rs.cast = 0.75; } else { rs.c3 = 6.5 + Math.random() * 2; rs.cast = 1.2; pulse(ctx, fo.pos.x, fo.pos.z, 0x80d8ff, 0.6, 2.2, 1.1); say(fo, '来吧……小家伙们', '#b8ecff'); }
        rs.fired = false; f.play('Spell_Simple_Shoot', { once: true, fade: 0.08, restart: true, speed: role === 'bomber' ? 1 : 0.7 }); return { turnTo: face, spd: 0 };
      }
      if (d < 2.3) return null; // 被贴脸：挥拳
      if (d < lo) return back(2.0);
      if (d > hi) { f.play('Jog_Fwd_Loop', { fade: 0.25, speed: 0.95 }); return { turnTo: face, spd: 3.3 }; }
      return hold('Spell_Simple_Idle_Loop');
    }
    return null;
  }
  function evade(fo, info) { return false; }
  function hurt(fo, dealt, info, zone) {
    const rs = fo.rs; if (!rs) return false;
    if (rs.esc > 0 || (rs.armor && (rs.aim > 0 || rs.lunge > 0)) || (rs.counter && fo.atk)) return true; // 脱身翻滚中 / 反击突刺（霸体）：不硬直不打断
    { // 反“贴脸狂点”：1.4 秒内挨第 3 刀 → 这一下不硬直，立刻职业专属脱身（冷却 4 秒）
      const now = performance.now() / 1000; rs.hq = (rs.hq || []).filter(x => now - x < 1.4); rs.hq.push(now);
      if (rs.hq.length >= 3 && now >= (rs.escAt || 0) && !fo.dead && !(fo.broken > 0)) {
        rs.escAt = now + 4; rs.hq = []; rs.esc = fo.role === 'twinblade' ? 0.34 : 0.5; rs.escSide = Math.random() < 0.5 ? -1 : 1; fo.atk = null; fo.stag = 0; rs.aim = 0; rs.cast = 0; rs.kneel = 0; lineHide(fo);
        fo.f.play('Roll', { once: true, fade: 0.05, restart: true, speed: fo.role === 'twinblade' ? 1.9 : -1.7 }); cue(fo, 'dodge'); CNT.esc = (CNT.esc || 0) + 1;
        const C = window.Foe && Foe.ctx && Foe.ctx();
        if (fo.role === 'bomber' && C && C.sc) { const T0 = { x0: fo.pos.x, y0: fo.pos.y + 1.2, z0: fo.pos.z }; const g = orb(0xff8a30, 0.14); g.position.set(T0.x0, T0.y0, T0.z0); C.sc.add(g); BOMBS.push({ fo, g, warn: ringAt(C, fo.pos.x, fo.pos.z, 0xff7a20, 2.0, 0.75), fill: discAt(C, fo.pos.x, fo.pos.z, 0xff5a10, 0.1, 0.28), x0: T0.x0, y0: T0.y0, z0: T0.z0, tx: fo.pos.x, tz: fo.pos.z, t: 0, T: 0.95, R: 2.0 }); CNT.bomb++; say(fo, '尝尝这个！', '#ffc080'); }
        if (fo.role === 'lancer') { rs.c3 = 0; rs.quick = 1; } else if (fo.role === 'netter' || fo.role === 'trapper') rs.c3 = Math.min(rs.c3, 0.5); // 拉开后马上放技能
        if (fo.role === 'wispcaller') rs.c3 = Math.min(rs.c3, 1.0);
        if (fo.role === 'twinblade') { fo.cd = 0; rs.counter = 1; } // 侧闪后立刻反击（这一套连斩霸体）
        if (!FR().tip3e && C && C.toast) { FR().tip3e = 1; C.toast('💨 连着砍同一个敌人太久，她会挣脱反制——打几下就换位 / 找破绽', '#ffd27a', 2.2); }
        return true;
      }
    }
    if ((fo.role === 'bomber' || fo.role === 'wispcaller' || fo.role === 'netter') && rs.cast > 0) { rs.cast = 0; rs.fired = true; fo.f.play('Hit_Chest', { once: true, fade: 0.05, restart: true }); }
    if (fo.role === 'trapper' && rs.kneel > 0) { rs.kneel = 0; rs.placed = true; }
    if (fo.role === 'lancer' && rs.aim > 0) { rs.aim = 0; lineHide(fo); rs.c3 = Math.max(rs.c3, 1.5); } // 蓄势中被砍：打断
    if (fo.role === 'lancer' && rs.lunge > 0) return true; // 突刺中不硬直（霸体）
    return false;
  }

  // ---------- 每帧：飞行物 / 陷阱 / 鬼火 / 玩家状态 ----------
  function update(dt, ctx) {
    const t = T(); if (!t) return; const P = ctx && ctx.player;
    if (P) { if (lastP && dt > 0) { pv.x += ((P.pos.x - lastP.x) / dt - pv.x) * Math.min(1, dt * 6); pv.z += ((P.pos.z - lastP.z) / dt - pv.z) * Math.min(1, dt * 6); } lastP = { x: P.pos.x, z: P.pos.z }; }
    if (rootT > 0) { rootT -= dt; if (rootT <= 0 && ovl) ovl.style.display = 'none'; }
    if (burnT > 0 && P) { burnT -= dt; burnTick -= dt; if (burnTick <= 0) { burnTick = 0.55; if (burnFo) ctx.hitPlayer(burnFo, dmgOf(burnFo, ctx, 0.018), { ang: 0, thrust: true, heavy: false, unblock: true, dot: true }); } }
    for (let i = FX.length - 1; i >= 0; i--) { const e = FX[i]; e.t += dt; const k = e.t / e.life; e.m.scale.setScalar(e.r0 + (e.r1 - e.r0) * Math.min(1, k)); e.m.material.opacity = 0.85 * (1 - k); if (k >= 1) { kill3(e.m); FX.splice(i, 1); } }
    for (let i = LINES.length - 1; i >= 0; i--) { const fo = LINES[i]; if (fo.dead || fo.escaped || fo.stag > 0 || !(fo.rs && (fo.rs.aim > 0 || fo.rs.lunge > 0))) { if (fo.rs) { fo.rs.aim = 0; fo.rs.lunge = 0; } lineHide(fo); } }
    if (!P) return;
    const CS = window.Combat && Combat.drawn && Combat.state, cam = ctx.camera;
    const slashHit = (pos, R) => { if (!CS || !cam || !(CS.sw || CS.thrust > 0)) return false; const l = cam.worldToLocal(pos.clone()); return l.z < -0.2 && l.length() < R && Math.atan2(Math.abs(l.x), -l.z) < 0.95; };
    const blockHit = (pos) => { if (!CS || !cam || !CS.rmb) return false; const l = cam.worldToLocal(pos.clone()); return l.z < -0.2 && l.length() < 1.6; };
    // 药瓶：抛物线飞行，落地爆炸
    for (let i = BOMBS.length - 1; i >= 0; i--) {
      const b = BOMBS[i]; b.t += dt; const k = Math.min(1, b.t / b.T), g0 = gy(ctx, b.tx, b.tz);
      b.g.position.set(b.x0 + (b.tx - b.x0) * k, b.y0 + (g0 + 0.1 - b.y0) * k + 3.2 * k * (1 - k) * 2, b.z0 + (b.tz - b.z0) * k); b.g.rotation.x += dt * 9;
      b.fill.scale.setScalar(0.1 + (b.R - 0.1) * k); b.fill.material.opacity = 0.18 + 0.22 * k; b.warn.material.opacity = 0.5 + 0.4 * Math.abs(Math.sin(b.t * (8 + k * 14)));
      if (k >= 1) {
        const p = new t.Vector3(b.tx, g0 + 0.3, b.tz); spark(p, 26); spark(p, 12); pulse(ctx, b.tx, b.tz, 0xff7a20, 0.4, b.R * 1.15, 0.45); cue(b.fo, 'boom');
        try { window.CombatFX && CombatFX.clang && CombatFX.clang('heavy', p); } catch (e) {}
        if (Math.hypot(P.pos.x - b.tx, P.pos.z - b.tz) < b.R) { ctx.hitPlayer(b.fo, dmgOf(b.fo, ctx, 0.11), { ang: 0, thrust: true, heavy: true, unblock: true }); burnT = 1.7; burnTick = 0.5; burnFo = b.fo; try { ctx.shake && ctx.shake(0.45); } catch (e) {} if (!FR().tip3b) { FR().tip3b = 1; ctx.toast && ctx.toast('🔥 被点燃了——下次看到橙圈立刻走出去', '#ffa040', 1.8); } }
        kill3(b.g); kill3(b.warn); kill3(b.fill); BOMBS.splice(i, 1);
      }
    }
    // 网：直线飞行，可砍断 / 格挡
    for (let i = NETS.length - 1; i >= 0; i--) {
      const n = NETS[i], g = n.g; n.life -= dt; g.position.addScaledVector(n.v, dt); g.rotation.z += dt * 7; g.lookAt(P.pos.x, g.position.y, P.pos.z); const s = 1 + Math.min(1.2, (1.4 - n.life) * 1.4); g.scale.setScalar(s);
      let done = n.life <= 0 || g.position.y < gy(ctx, g.position.x, g.position.z) + 0.05;
      if (!done && slashHit(g.position, 2.4)) { done = true; spark(g.position, 14); cue(n.fo, 'pop'); try { CombatFX.marker('crit'); } catch (e) {} CNT.netCut++; if (!FR().tip3n) { FR().tip3n = 1; ctx.toast && ctx.toast('🕸️ 把网砍断了！', '#e8f0d0', 1.2); } }
      else if (!done && blockHit(g.position)) { done = true; spark(g.position, 10); try { CombatFX.clang('block', g.position); } catch (e) {} if (CS) CS.stam = Math.max(0, CS.stam - 8); }
      if (!done && Math.hypot(g.position.x - P.pos.x, g.position.z - P.pos.z) < 0.75 && Math.abs(g.position.y - (P.pos.y + 1.0)) < 1.0) { done = true; ctx.hitPlayer(n.fo, dmgOf(n.fo, ctx, 0.035), { ang: 0, thrust: true, heavy: false, unblock: true }); root(1.3, '🕸️ 被网住了'); }
      if (done) { kill3(g); NETS.splice(i, 1); }
    }
    // 捕兽夹：0.6 秒后生效；踩中 = 定身 + 流血
    for (let i = TRAPS.length - 1; i >= 0; i--) {
      const q = TRAPS[i]; q.t += dt; const arm = q.t > 0.6, w = 0.5 + 0.5 * Math.sin(q.t * 5 + i);
      q.a.material.opacity = arm ? 0.45 + 0.35 * w : 0.2 * q.t / 0.6; q.b.material.opacity = arm ? 0.2 + 0.25 * w : 0.1;
      if (arm && Math.hypot(P.pos.x - q.x, P.pos.z - q.z) < 0.62) {
        const p = new t.Vector3(q.x, gy(ctx, q.x, q.z) + 0.2, q.z); spark(p, 18); try { CombatFX.clang('heavy', p); } catch (e) {} pulse(ctx, q.x, q.z, 0xff3020, 0.3, 1.2, 0.35);
        ctx.hitPlayer(q.fo, dmgOf(q.fo, ctx, 0.07), { ang: 0, thrust: true, heavy: true, unblock: true }); root(1.5, '🪤 踩中捕兽夹'); kill3(q.a); kill3(q.b); TRAPS.splice(i, 1);
      } else if (q.t > 40) { kill3(q.a); kill3(q.b); TRAPS.splice(i, 1); }
    }
    // 鬼火：先绕着主人升起，0.8 秒后追你；碰到爆炸；可挥刀打散
    for (let i = WISPS.length - 1; i >= 0; i--) {
      const w = WISPS[i], g = w.g; w.t += dt; w.life -= dt; let done = w.life <= 0, boom = false;
      if (w.t < 0.8 && !w.fo.dead) { const a = w.ph + w.t * 5; g.position.x += (w.fo.pos.x + Math.cos(a) * 0.9 - g.position.x) * Math.min(1, dt * 6); g.position.z += (w.fo.pos.z + Math.sin(a) * 0.9 - g.position.z) * Math.min(1, dt * 6); g.position.y += dt * 0.6; }
      else { const tx = P.pos.x - g.position.x, ty = P.pos.y + 1.1 - g.position.y, tz = P.pos.z - g.position.z, L = Math.hypot(tx, ty, tz) || 1, sp = 3.4 + Math.sin(w.t * 3 + w.ph) * 0.5; g.position.x += tx / L * sp * dt + Math.cos(w.t * 4 + w.ph) * dt * 0.8; g.position.y += ty / L * sp * dt + Math.sin(w.t * 6) * dt * 0.4; g.position.z += tz / L * sp * dt + Math.sin(w.t * 4 + w.ph) * dt * 0.8; }
      g.children[1].scale.setScalar(1 + Math.sin(w.t * 12 + w.ph) * 0.18);
      if (!done && slashHit(g.position, 2.3)) { done = true; spark(g.position, 14, 'blue'); cue(w.fo, 'pop'); CNT.wispPop++; try { CombatFX.marker('crit'); } catch (e) {} }
      else if (!done && Math.hypot(g.position.x - P.pos.x, g.position.z - P.pos.z) < 0.7 && Math.abs(g.position.y - (P.pos.y + 1.1)) < 1.0) { done = true; boom = true; }
      if (boom) { spark(g.position, 20, 'blue'); ctx.hitPlayer(w.fo, dmgOf(w.fo, ctx, 0.075), { ang: 0, thrust: true, heavy: false, unblock: true }); }
      if (done) { if (!boom && w.life <= 0) spark(g.position, 8, 'blue'); kill3(g); WISPS.splice(i, 1); }
    }
    // 主人死了：鬼火散掉；陷阱师死了夹子留着（仍然危险）
    for (let i = WISPS.length - 1; i >= 0; i--) { const w = WISPS[i]; if (w.fo.dead && w.t > 0.3) { spark(w.g.position, 8, 'blue'); kill3(w.g); WISPS.splice(i, 1); } }
  }
  function clear() {
    for (const b of BOMBS) { kill3(b.g); kill3(b.warn); kill3(b.fill); } BOMBS.length = 0;
    for (const n of NETS) kill3(n.g); NETS.length = 0; for (const q of TRAPS) { kill3(q.a); kill3(q.b); } TRAPS.length = 0;
    for (const w of WISPS) kill3(w.g); WISPS.length = 0; for (const e of FX) kill3(e.m); FX.length = 0; for (const fo of LINES.slice()) lineHide(fo);
    rootT = 0; burnT = 0; lastP = null; if (ovl) ovl.style.display = 'none';
  }

  // ---------- 挂到 FoeRoles2 的钩子上 ----------
  if (window.FoeRoles && FoeRoles.INFO) for (const k in INFO) FoeRoles.INFO[k] = INFO[k];
  const F2 = window.FoeRoles2;
  if (F2) {
    const o = { pick: F2.pick, init: F2.init, clip: F2.clip, tune: F2.tune, after: F2.after, tick: F2.tick, evade: F2.evade, hurt: F2.hurt, update: F2.update, clear: F2.clear };
    for (const k in R) F2.R[k] = 1;
    const mine = fo => fo && R[fo.role];
    F2.pick = (fo, r, cur) => { const fr = window.__forceRole; if (fr) { const k = Array.isArray(fr) ? fr[Foe.foes.length] : fr; if (R[k]) return on() ? k : null; } const a = pick(fo, r, cur); return a || o.pick(fo, r, cur); };
    F2.init = (fo, role) => R[role] ? init(fo, role) : o.init(fo, role);
    F2.clip = (fo, cur, d, force) => mine(fo) ? clip(fo, cur, d, force) : o.clip(fo, cur, d, force);
    F2.tune = (fo, A, d) => { o.tune(fo, A, d); if (mine(fo)) tune(fo, A, d); };
    F2.after = (fo) => mine(fo) ? after(fo) : o.after(fo);
    F2.tick = (fo, dt, d, face, dx, dz, P, ctx) => mine(fo) ? tick(fo, dt, d, face, dx, dz, P, ctx) : o.tick(fo, dt, d, face, dx, dz, P, ctx);
    F2.evade = (fo, info) => { const r = o.evade(fo, info); if (mine(fo)) evade(fo, info); return r; };
    F2.hurt = (fo, dealt, info, zone) => mine(fo) ? hurt(fo, dealt, info, zone) : o.hurt(fo, dealt, info, zone);
    F2.update = (dt, ctx) => { o.update(dt, ctx); try { update(dt, ctx); } catch (e) { if (!FoeRoles3.err) { FoeRoles3.err = 1; console.warn('foe_roles3', e); } } };
    F2.clear = () => { o.clear(); clear(); };
  }
  return { on, INFO, R, CNT, moveK, root, pick, BOMBS, NETS, TRAPS, WISPS, get rootT() { return rootT; } };
})();
