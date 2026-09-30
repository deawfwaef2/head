// 第二十二轮（续 9）：敌人职业 —— 让敌人不再“一个套路”。MOD：foe_roles（默认开；关掉 = 所有敌人同一套逻辑）
// 新系统放新文件，对 js/foe.js 只有几处薄钩子：
//   populate → FoeRoles.assign(fo, rng, it)   attack → FoeRoles.clip()/tune()   atkStep 命中帧 → A.ranged 时 FoeRoles.fire()
//   atkStep 收招 → FoeRoles.after()           update → FoeRoles.tick()（返回非空则接管本帧移动）/ FoeRoles.update()（飞行物）
//   hit → FoeRoles.evade()（翻滚中刃穿过去）/ FoeRoles.hurt()（蛮兵硬吃、狂战狂暴；返回 true = 不硬直）
// 职业：蛮兵 brute · 游击 skirm · 盾卫 guard · 刺客 assassin · 狂战 berserk · 投掷手 ranged（霸主不分职业，保持原样）
window.FoeRoles = (() => {
  'use strict';
  const on = () => !window.Mods || Mods.on('foe_roles');
  const ang = a => Math.atan2(Math.sin(a), Math.cos(a)), clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const V3 = () => window.THREE.Vector3;
  const INFO = {
    brute: { n: '蛮兵', ic: '🪓', col: '#ff9a60', hp: 1.4, spd: 0.82, dmg: 1.15, tint: [1, 0.78, 0.62], tip: '硬吃轻击，只有蓄力重斩或连续猛砍才能打断；重击前摇很长——看准了闪' },
    skirm: { n: '游击', ic: '💨', col: '#9fe0ff', hp: 0.8, spd: 1.25, dmg: 0.85, tint: [0.75, 0.95, 1], tip: '冲刺斩后撤步，你挥刀时会翻滚闪开——别连续乱挥，等她落地再砍' },
    guard: { n: '盾卫', ic: '🛡️', col: '#9fd0ff', hp: 1.15, spd: 0.85, dmg: 0.9, tint: [0.78, 0.86, 1], tip: '永远举着盾：绕到侧后、换个方向砍或蓄力重斩破防；她被弹刀后会立刻反击' },
    assassin: { n: '刺客', ic: '🗡️', col: '#c890ff', hp: 0.6, spd: 1.0, dmg: 1.0, tint: [0.55, 0.5, 0.65], tip: '潜行绕到你背后，听到拔刀声就按 Q 闪身；正面对着她她就不敢上' },
    berserk: { n: '狂战', ic: '🔥', col: '#ff6050', hp: 1.15, spd: 1.1, dmg: 1.0, tint: [1, 0.7, 0.66], tip: '连击猛攻，不会后退；半血狂暴后更快更狠' },
    ranged: { n: '投掷手', ic: '🎯', col: '#ffe080', hp: 0.8, spd: 1.0, dmg: 0.8, tint: [1, 0.95, 0.75], tip: '远远掷刃并保持距离：举刀格挡，或者在刃飞来时挥刀把它打回去' }
  };
  const PROJ = []; // 飞行中的掷刃

  function assign(fo, r, it) {
    if (!on() || it.boss) return;
    const armed = fo.armed, w = armed ? [['brute', 0.14], ['skirm', 0.2], ['guard', 0.18], ['assassin', 0.15], ['berserk', 0.14], ['ranged', 0.12], [null, 0.07]] : [['brute', 0.22], ['skirm', 0.34], ['berserk', 0.26], [null, 0.18]];
    let x = r() * w.reduce((a, b) => a + b[1], 0), role = null; for (const [k, p] of w) { if ((x -= p) <= 0) { role = k; break; } }
    if (window.FoeRoles2) { const r2 = FoeRoles2.pick(fo, r, role); if (r2) role = r2; } // R26：新职业
    if (!role) return; const I = INFO[role];
    fo.role = role; fo.spdMul = I.spd; fo.dmgMul = I.dmg; fo.maxHp = fo.hp = Math.max(8, Math.round(fo.maxHp * I.hp)); fo.rs = { roll: 0, rollCd: 2 + r() * 2, t: 0 };
    if (window.FoeRoles2 && FoeRoles2.R[role]) FoeRoles2.init(fo, role);
    if (role === 'berserk') { fo.brave = true; fo.retreated = true; } // 不后退
    for (const m of fo.mats || []) if (m.color) { m.color.r *= I.tint[0]; m.color.g *= I.tint[1]; m.color.b *= I.tint[2]; } // 轻微职业色调（不新建材质）
  }
  function label(fo, ctx) { if (fo.roleShown || !ctx || !ctx.say) return; fo.roleShown = true; const I = INFO[fo.role]; try { ctx.say(fo.anchor, `${I.ic}${I.n}`, I.col); } catch (e) {} if (!FoeRoles.tipped) FoeRoles.tipped = {}; if (!FoeRoles.tipped[fo.role] && ctx.toast) { FoeRoles.tipped[fo.role] = 1; ctx.toast(`${I.ic} ${I.n}：${I.tip}`, I.col, 3.4); } }

  // ---- 选招 / 调参 ----
  function clip(fo, cur, d, force) {
    if (window.FoeRoles2 && FoeRoles2.R[fo.role]) return FoeRoles2.clip(fo, cur, d, force);
    const r = Math.random(), a = fo.armed;
    switch (fo.role) {
      case 'brute': return a ? (r < 0.5 ? 'Sword_Attack' : r < 0.65 ? 'Sword_Heavy_Combo' : null) : 'Melee_Hook';
      case 'berserk': return a ? (fo.rage2 ? (r < 0.4 ? 'Sword_Heavy_Combo' : 'Sword_Regular_Combo') : (r < 0.45 ? 'Sword_Regular_Combo' : null)) : null;
      case 'guard': return a ? (r < 0.35 ? 'Sword_Attack' : null) : null;
      case 'assassin': return force ? null : 'Sword_Dash';
      case 'ranged': return !force && d >= 3.2 && window.Foe && Foe.ATK.OverhandThrow ? 'OverhandThrow' : null;
    }
    return null;
  }
  function tune(fo, A, d) {
    const role = fo.role, h0 = A.hits[0]; A.dmgMul = fo.dmgMul * (fo.rage2 ? 1.2 : 1);
    if (role === 'brute') { A.ws *= 0.8; A.ws2 = Math.min(1, A.ws * 1.7); A.hold += 0.32; A.reach += 0.3; A.feint = false; if (!fo.armed) for (const h of A.hits) h.heavy = true; }
    else if (role === 'berserk') { const k = fo.rage2 ? 1.3 : 1.1; A.ws = Math.min(0.9, A.ws * k); A.ws2 = Math.min(1, A.ws * 1.7); A.hold *= fo.rage2 ? 0.45 : 0.8; A.feint = false; }
    else if (role === 'guard') { A.hold += 0.12; }
    else if (role === 'skirm') { A.ws = Math.min(0.9, A.ws * 1.2); A.ws2 = Math.min(1, A.ws * 1.7); A.hold *= 0.7; }
    else if (role === 'assassin') {
      const pl = fo.rs.P, rel = pl ? ang(Math.atan2(-(fo.pos.x - pl.pos.x), -(fo.pos.z - pl.pos.z)) - pl.yaw) : 0;
      A.feint = false; A.hold = 0.42; // 给玩家留出听到拔刀声后闪身的时间
      if (Math.abs(rel) > 2.0) { A.back = true; A.dmgMul *= 1.6; if (window.CombatFX) CombatFX.roleCue(fo, 'backstab'); }
    }
    else if (role === 'ranged') { if (A.clip === 'OverhandThrow') { A.ranged = true; A.ws *= 0.85; A.ws2 = Math.min(1, A.ws * 1.7); A.hold = 0.3; A.feint = false; if (h0) h0.thrust = true; } }
    if (window.FoeRoles2) FoeRoles2.tune(fo, A, d);
    A.dmg = Math.max(1, Math.round(A.dmg * A.dmgMul));
  }
  function after(fo) { // 收招后
    const role = fo.role; if (!role) return; const Foe_ = window.Foe;
    if (window.FoeRoles2 && FoeRoles2.R[role]) FoeRoles2.after(fo);
    if (role === 'skirm' || role === 'assassin') { if (fo.state === 'chase' && !fo.boss) { fo.state = 'retreat'; fo.retT = role === 'assassin' ? 1.8 + Math.random() : 1.0 + Math.random() * 0.7; } fo.cd = Math.max(fo.cd, role === 'assassin' ? 1.5 : 0.6); }
    else if (role === 'berserk') fo.cd *= fo.rage2 ? 0.3 : 0.5;
    else if (role === 'brute') fo.cd += 0.9;
    else if (role === 'ranged') fo.cd = Math.max(1.4, fo.cd * 0.75);
    if (fo.rs) { fo.rs.up = false; }
  }

  // ---- 每帧接管移动（返回 null = 走原来的逻辑）----
  function tick(fo, dt, d, face, dx, dz, P, ctx) {
    const rs = fo.rs; if (!rs || fo.dead) return null; label(fo, ctx); rs.t += dt; rs.P = P; const f = fo.f;
    if (fo.poise > 0 && fo.role === 'brute') fo.poise = Math.max(0, fo.poise - 9 * dt);
    const Foe_ = window.Foe, tok = () => Foe_ && Foe_.tokenOK(fo);
    if (window.FoeRoles2 && FoeRoles2.R[fo.role]) return FoeRoles2.tick(fo, dt, d, face, dx, dz, P, ctx);
    if (fo.role === 'skirm') {
      rs.rollCd -= dt;
      if (rs.roll > 0) { rs.roll -= dt; const sgn = rs.rollDir; fo.rv = { x: Math.cos(face) * sgn * 5.4 - Math.sin(face) * 0.8, z: -Math.sin(face) * sgn * 5.4 - Math.cos(face) * 0.8 }; if (rs.roll <= 0) { f.play(fo.armed ? 'Sword_Idle' : 'Idle_Loop', { fade: 0.15 }); } return { turnTo: face, spd: 0 }; }
      if (rs.rollCd <= 0 && d < 3.4 && ctx.playerSwinging && ctx.playerSwinging() && Math.random() < dt * 3.5) { rs.roll = 0.4; rs.rollCd = 3.2 + Math.random() * 1.5; rs.rollDir = Math.random() < 0.5 ? -1 : 1; fo.atk = null; f.play('Roll', { once: true, fade: 0.05, restart: true, speed: 1.9 }); if (window.CombatFX) CombatFX.roleCue(fo, 'roll'); return { turnTo: face, spd: 0 }; }
      if (fo.cd <= 0 && d > 2.4 && d < 6.5 && tok() && Math.random() < dt * 0.9) { Foe_.attack(fo, d, fo.armed ? 'Sword_Dash' : 'Punch_Cross'); return { turnTo: face, spd: 0 }; } // 冲刺起手
      return null;
    }
    if (fo.role === 'guard') {
      if (fo.cd <= 0 && tok()) { if (fo.block > 0) fo.block = 0; rs.up = false; return null; } // 轮到出手：放下盾，走原来的“上步 + 起手”
      if (d > 7) return null;
      fo.block = Math.max(fo.block, 0.35); // 举盾
      rs.gT = (rs.gT || 0) - dt; if (rs.gT <= 0) { rs.gT = 0.45 + Math.random() * 0.15; const aim = ctx.handAng ? ctx.handAng(fo) : null; if (aim != null) fo.gAng = aim + (Math.random() - 0.5) * 0.5; } // 盾的朝向每 ~0.5 秒才跟上你的刀：快速换向能绕过
      if (fo.gAng == null) fo.gAng = Math.PI / 2;
      const ux = dx / d, uz = dz / d; let vx = 0, vz = 0, mv = 0; // 走位时播走路腿（以前举着盾的定格姿势在地上滑行）；站定才摆格挡姿势
      if (d > 2.5) { vx = ux * 1.4; vz = uz * 1.4; mv = 1; } else if (d < 1.6) { vx = -ux * 0.9; vz = -uz * 0.9; mv = -1; }
      if (mv) { rs.up = false; f.play('Walk_Loop', { fade: 0.25, speed: mv > 0 ? 0.95 : -0.9 }); } else if (!rs.up) { rs.up = true; f.play('Sword_Block', { once: true, fade: 0.2, restart: true }); }
      fo.rv = { x: vx, z: vz }; return { turnTo: face, spd: 0 };
    }
    if (fo.role === 'assassin') {
      if (d > 10) return null;
      const pl = P, ca = Math.atan2(-dx, -dz), delta = ang(pl.yaw - ca), behind = Math.abs(delta) < 0.75;
      if (fo.cd <= 0 && tok() && ((behind && d < 3.4) || rs.t - (rs.stalk0 || 0) > 5)) { rs.stalk0 = rs.t; Foe_.attack(fo, d, 'Sword_Dash'); return { turnTo: face, spd: 0 }; }
      if (fo.cd > 0 || !behind || d > 3.4) { // 潜行绕背
        const sg = delta >= 0 ? 1 : -1, w = clamp(Math.abs(delta) / 0.7, 0.35, 1), R = 2.4, rad = clamp(d - R, -1, 1.2) * 3;
        fo.rv = { x: Math.cos(ca) * sg * 4.3 * w + (dx / d) * rad, z: -Math.sin(ca) * sg * 4.3 * w + (dz / d) * rad };
        f.play('Crouch_Fwd_Loop', { fade: 0.25, speed: 1.7 }); const hd = Math.atan2(fo.rv.x, fo.rv.z); return { turnTo: face + clamp(ang(hd - face), -1.25, 1.25), spd: 0 };
      }
      return null;
    }
    if (fo.role === 'ranged') {
      if (d < 2.3) return null; // 被贴脸：近战
      if (fo.cd <= 0 && d >= 3.2 && d <= 11 && tok() && Foe_.ATK.OverhandThrow) { Foe_.attack(fo, d, null); return { turnTo: face, spd: 0 }; }
      const ux = dx / d, uz = dz / d;
      rs.kT = rs.kT || 0; rs.kC = (rs.kC || 0) - dt; // 拉开距离最多 1.8 秒，然后站住掷刃/近战（以前一直倒着跑，永远追不上）
      if (d < 4.6 && rs.kC <= 0) { rs.kT += dt; if (rs.kT > 1.8) { rs.kT = 0; rs.kC = 3.2; } else { fo.rv = { x: -ux * 2.7, z: -uz * 2.7 }; f.play('Walk_Loop', { fade: 0.25, speed: -1.05 }); return { turnTo: face, spd: 0 }; } }
      if (d < 3.2) return null;
      if (d > 10) { f.play('Jog_Fwd_Loop', { fade: 0.25, speed: 0.95 }); return { turnTo: face, spd: 3.6 }; }
      f.play('Sword_Idle', { fade: 0.3 }); return { turnTo: face, spd: 0 };
    }
    return null;
  }

  // ---- 翻滚中：刃穿过去 / 受击反应 ----
  function evade(fo, info) {
    if (window.FoeRoles2) FoeRoles2.evade(fo, info);
    const rs = fo.rs; if (!rs || !(rs.roll > 0)) return false;
    if (performance.now() - (rs.evT || 0) > 350) { rs.evT = performance.now(); const c = window.Foe && Foe.ctx && Foe.ctx(); if (c && c.floatDmg) c.floatDmg(fo.anchor.pos, '闪', false); if (window.CombatFX) CombatFX.roleCue(fo, 'dodged'); }
    return true;
  }
  function hurt(fo, dealt, info, zone) { // 返回 true = 这一下不产生硬直
    if (!fo.role) return false; const role = fo.role;
    if (window.FoeRoles2 && FoeRoles2.R[role]) return FoeRoles2.hurt(fo, dealt, info, zone);
    if (role === 'berserk' && !fo.rage2 && fo.hp <= fo.maxHp * 0.5) { fo.rage2 = true; fo.spdMul = 1.3; fo.dmgMul *= 1.0; if (window.CombatFX) CombatFX.roleCue(fo, 'rage'); const c = window.Foe && Foe.ctx && Foe.ctx(); if (c && c.toast) c.toast('🔥 狂战进入狂暴——更快更狠！', '#ff8060', 1.8); for (const m of fo.mats || []) if (m.color) { m.color.g *= 0.8; m.color.b *= 0.8; } }
    if (role === 'brute') { fo.poise = (fo.poise || 0) + dealt; if (fo.poise >= 26 || info.charged || (fo.broken > 0)) { fo.poise = 0; return false; } if (window.CombatFX) CombatFX.roleCue(fo, 'armor'); return true; } // 蛮兵硬吃：当啷一声，不硬直
    if (role === 'berserk' && fo.rage2 && !info.charged) { fo.poise = (fo.poise || 0) + dealt; if (fo.poise < 20) return true; fo.poise = 0; }
    return false;
  }

  // ---- 投掷手：掷刃 ----
  function fire(fo, h, d) {
    const F = window.Foe, ctx = F && F.ctx && F.ctx(); if (!ctx || !fo.wpn) return; const T = window.THREE, P = ctx.player;
    const hand = fo.f.bones.rightHand || fo.f.bones.leftHand, from = new T.Vector3(); (hand || fo.f.bones.chest).getWorldPosition(from);
    const to = new T.Vector3(P.pos.x, P.pos.y + 1.15, P.pos.z), dir = to.clone().sub(from), dist = dir.length(); dir.normalize();
    const g = new T.Group(), m = fo.wpn.clone(true); const q = new T.Quaternion(), s = new T.Vector3(); fo.wpn.getWorldQuaternion(q); fo.wpn.getWorldScale(s); m.position.set(0, 0, 0); m.quaternion.copy(q); m.scale.copy(s); m.visible = true; g.add(m); g.position.copy(from); ctx.sc.add(g);
    PROJ.push({ g, fo, v: dir.multiplyScalar(13 + Math.min(4, dist * 0.3)), life: 2.2, dmg: fo.atk ? fo.atk.dmg : 6, rev: false, h });
    if (window.CombatFX) CombatFX.roleCue(fo, 'throw');
  }
  const _t = { x: 0, y: 0, z: 0 };
  function update(dt, ctx) {
    if (window.FoeRoles2) FoeRoles2.update(dt, ctx);
    if (!PROJ.length) return; const P = ctx.player, CS = window.Combat && Combat.drawn && Combat.state, F = window.Foe, T = window.THREE;
    for (let i = PROJ.length - 1; i >= 0; i--) {
      const p = PROJ[i], o = p.g; p.life -= dt; o.position.addScaledVector(p.v, dt); o.rotation.x += 22 * dt; let kill = p.life <= 0;
      const gy = ctx.H(o.position.x, o.position.z); if (o.position.y < gy + 0.05) { kill = true; if (F && F.spark) F.spark(o.position, 6); }
      if (!kill && !p.rev) {
        if (CS && CS.lastTip && CS.tipSpeed > 4 && o.position.distanceTo(CS.lastTip) < 0.9) { // 打飞！
          p.rev = true; const fo = p.fo, tc = new T.Vector3(); (fo.f.bones.chest || fo.f.bones.hips).getWorldPosition(tc); p.v.copy(tc.sub(o.position).normalize().multiplyScalar(17)); p.life = 2;
          if (F && F.spark) F.spark(o.position, 14); if (window.CombatFX) { CombatFX.clang('x', o.position); CombatFX.marker('crit'); } if (ctx.toast) ctx.toast('🔁 把掷刃打回去了！', '#ffe080', 1);
        } else if (Math.hypot(o.position.x - P.pos.x, o.position.z - P.pos.z) < 0.6 && Math.abs(o.position.y - (P.pos.y + 1.1)) < 0.9) {
          kill = true; ctx.hitPlayer(p.fo, p.dmg, { ang: 0, thrust: true, heavy: false });
        }
      } else if (!kill && p.rev) {
        const fo = p.fo; if (!fo.dead) { const tc = new T.Vector3(); (fo.f.bones.chest || fo.f.bones.hips).getWorldPosition(tc); if (tc.distanceTo(o.position) < 0.7) { kill = true; F.hit(fo, { point: tc, vel: p.v.clone(), speed: 9, tipSpeed: 9, kind: 'thrust', mult: 1.8, from: 0 }); } }
      }
      if (kill) { o.parent && o.parent.remove(o); PROJ.splice(i, 1); }
    }
  }
  function clear() { if (window.FoeRoles2) FoeRoles2.clear(); for (const p of PROJ) p.g.parent && p.g.parent.remove(p.g); PROJ.length = 0; }
  return { assign, clip, tune, after, tick, evade, hurt, fire, update, clear, INFO };
})();
