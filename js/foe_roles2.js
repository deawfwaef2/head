// 第二十六轮：更多敌人类型（MOD `foe_roles2`，默认开；关掉 = 只有原来的 6 种职业）
// 在 js/foe_roles.js 的职业体系上加 5 种新职业（foe_roles.js 里只有几行委托钩子）：
//   决斗者 duelist（持械）：盯着你的刀——你出刀的瞬间举剑格挡，紧接着反击；换方向 / 蓄力重斩 / 等她收招再砍
//   重甲卫 juggernaut（持械）：血厚、慢、正面轻击几乎无效（当啷）；绕背、终结劈砍或蓄力重斩才伤得到；不易硬直
//   术士 mage（徒手）：远处放魂火球（可挥刀打散 / Q 闪开 / 举盾挡）；被贴近就瞬移拉开；半血后三连发
//   疗愈者 healer（徒手，同伴≥2 时才出现）：躲在后面给受伤的同伴回 30% 血（绿色光环 + 吟唱），被打中吟唱中断——优先杀
//   战旗手 warcaller（持械）：脚下红圈 9 米内的同伴更快更狠；半血时战吼让同伴全体转为进攻——先解决她
// 全部是特效（发光球 / 光环），不新建模型；动画用已有的 Spell_Simple_* / Sword_* 片段。
window.FoeRoles2 = (() => {
  'use strict';
  const on = () => !window.Mods || !Mods.on || Mods.on('foe_roles2') !== false;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), ang = a => Math.atan2(Math.sin(a), Math.cos(a));
  const T = () => window.THREE, FR = () => window.FoeRoles, F_ = () => window.Foe, cue = (fo, k) => { try { window.CombatFX && CombatFX.roleCue(fo, k); } catch (e) {} };
  const INFO = {
    duelist: { n: '决斗者', ic: '🤺', col: '#ffd0a0', hp: 0.9, spd: 1.1, dmg: 1.1, tint: [1, 0.92, 0.8], tip: '盯着你的刀——你一出刀她就格挡再反击。别连着同一方向砍：换方向、蓄力重斩破防，或等她收招' },
    juggernaut: { n: '重甲卫', ic: '🛡️', col: '#b8c4d8', hp: 2.0, spd: 0.7, dmg: 1.3, tint: [0.6, 0.66, 0.8], tip: '正面轻击几乎无效（当啷）——绕到背后，用下劈终结或蓄力重斩；她很少被打断' },
    mage: { n: '术士', ic: '🔮', col: '#c890ff', hp: 0.7, spd: 1.0, dmg: 1.0, tint: [0.8, 0.7, 1], tip: '远处放魂火球：挥刀打散它 / 右键举刀挡 / Q 闪开。贴近她，她会瞬移拉开距离' },
    healer: { n: '疗愈者', ic: '✚', col: '#8fe8a0', hp: 0.6, spd: 1.05, dmg: 0.5, tint: [0.75, 1, 0.8], tip: '躲在同伴后面给受伤的人回血——优先杀她；打中她会打断吟唱' },
    warcaller: { n: '战旗手', ic: '🚩', col: '#ff8a70', hp: 1.1, spd: 0.95, dmg: 0.9, tint: [1, 0.72, 0.7], tip: '脚下红圈 9 米内的同伴更快更狠——先解决她，战吼会让所有人一起冲上来' }
  };
  const FX = [], ORBS = [];
  let ringGeo = null;
  function ring(ctx, pos, col, r0, life, big) {
    const t = T(); if (!t || !ctx || !ctx.sc) return; ringGeo = ringGeo || new t.RingGeometry(0.8, 1.0, 40).rotateX(-Math.PI / 2);
    const m = new t.Mesh(ringGeo, new t.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8, depthWrite: false, blending: t.AdditiveBlending, side: t.DoubleSide, fog: false }));
    m.position.set(pos.x, (ctx.H ? ctx.H(pos.x, pos.z) : 0) + 0.06, pos.z); m.scale.setScalar(r0); m.renderOrder = 4; ctx.sc.add(m); FX.push({ m, t: 0, life, r0, big: big || 2.6 });
  }
  const orbMat = {};
  function orbMesh(col) {
    const t = T(); const g = new t.Group(); const c = new t.Color(col);
    const core = new t.Mesh(new t.SphereGeometry(0.16, 12, 10), new t.MeshBasicMaterial({ color: 0xffffff, fog: false }));
    const halo = new t.Mesh(new t.SphereGeometry(0.34, 12, 10), new t.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.45, depthWrite: false, blending: t.AdditiveBlending, fog: false }));
    g.add(core); g.add(halo); return g;
  }

  // ---- 分配（foe_roles.assign 调用）：返回新职业名或 null ----
  function pick(fo, r, cur) {
    if (!on()) return null; { const fr = window.__forceRole; if (fr) { const k = Array.isArray(fr) ? fr[Foe.foes.length] : fr; if (INFO[k]) return k; if (Array.isArray(fr)) return null; } }
    if (cur && r() > 0.45) return null; // 已经抽到旧职业的，有 45% 改成新职业（新旧职业大致各半）
    const n = (window.Foe && Foe.foes ? Foe.foes.length : 0);
    const pool = fo.armed ? [['duelist', 0.3], ['juggernaut', 0.26], ['warcaller', n >= 1 ? 0.2 : 0.06]] : [['mage', 0.5], ['healer', n >= 2 ? 0.3 : 0]];
    const sum = pool.reduce((a, b) => a + b[1], 0); if (sum <= 0) return null; let x = r() * sum;
    for (const [k, p] of pool) { if ((x -= p) <= 0) return k; } return null;
  }
  function init(fo, role) { // 分配后的额外初始化（foe_roles.assign 末尾）
    fo.rs = fo.rs || {}; fo.rs.castCd = 1 + Math.random() * 1.5;
    if (role === 'mage' || role === 'healer') { fo.brave = true; fo.retreated = true; }
    if (role === 'warcaller' || role === 'duelist' || role === 'juggernaut') { fo.brave = true; fo.retreated = true; } // 不会吓跑
    if (role === 'juggernaut') { fo.poise = 0; }
  }

  // ---- 选招 / 调参 ----
  function clip(fo, cur, d, force) {
    const r = Math.random();
    switch (fo.role) {
      case 'duelist': return r < 0.55 ? 'Sword_Dash' : r < 0.8 ? 'Sword_Regular_A' : null;
      case 'juggernaut': return 'Sword_Attack';
      case 'warcaller': return r < 0.5 ? 'Sword_Regular_B' : null;
      case 'mage': case 'healer': return 'Punch_Cross'; // 被贴脸：挥拳
    }
    return null;
  }
  function tune(fo, A, d) {
    const role = fo.role; if (fo.buf > 0) A.dmgMul = (A.dmgMul || 1) * 1.25;
    if (role === 'duelist') { A.ws = Math.min(0.9, A.ws * 1.15); A.hold *= 0.7; A.feint = false; }
    else if (role === 'juggernaut') { A.hold += 0.3; A.reach += 0.25; A.feint = false; A.ws *= 0.85; for (const h of A.hits) h.heavy = true; }
    else if (role === 'warcaller') { A.hold *= 0.9; }
  }
  function after(fo) {
    if (fo.role === 'duelist') { fo.cd += 0.4; if (fo.rs) fo.rs.parryCd = Math.min(fo.rs.parryCd || 0, 0.4); }
    else if (fo.role === 'juggernaut') fo.cd += 1.3;
  }

  // ---- 法球 ----
  function fireOrb(fo, ctx, off) {
    const t = T(), P = ctx.player, hand = fo.f.bones.rightHand || fo.f.bones.leftHand || fo.f.bones.chest, from = new t.Vector3(); hand.getWorldPosition(from);
    const to = new t.Vector3(P.pos.x, P.pos.y + 1.15, P.pos.z), dir = to.clone().sub(from), dist = dir.length(); dir.normalize();
    if (off) { const s = new t.Vector3(-dir.z, 0, dir.x); dir.addScaledVector(s, off).normalize(); }
    const g = orbMesh(fo.role === 'healer' ? '#8fe8a0' : '#b070ff'); g.position.copy(from); ctx.sc.add(g);
    ORBS.push({ g, fo, v: dir.multiplyScalar(7.5 + Math.min(2, dist * 0.12)), life: 3.4, dmg: Math.max(4, Math.round((fo.atk ? fo.atk.dmg : 7) || 7)) });
    cue(fo, 'cast');
  }
  function blink(fo, P, ctx) {
    const dx = fo.pos.x - P.pos.x, dz = fo.pos.z - P.pos.z, d = Math.hypot(dx, dz) || 1; let best = null;
    for (let i = 0; i < 10; i++) { const a = Math.atan2(dz, dx) + (Math.random() - 0.5) * 2.4, R = 6.5 + Math.random() * 2.5, x = P.pos.x + Math.cos(a) * R, z = P.pos.z + Math.sin(a) * R; if (Math.hypot(x, z) > (ctx.R || 30) - 2) continue; let ok = true; for (const c of ctx.cols || []) if (Math.hypot(x - c.x, z - c.z) < (c.r || 0.5) + 0.6) { ok = false; break; } if (ok) { best = [x, z]; break; } }
    if (!best) return false; if (window.Foe && Foe.spark) Foe.spark(fo.pos.clone().add(new (T().Vector3)(0, 1, 0)), 16, 'blue');
    fo.pos.x = best[0]; fo.pos.z = best[1]; if (window.Foe && Foe.spark) Foe.spark(fo.pos.clone().add(new (T().Vector3)(0, 1, 0)), 16, 'blue'); cue(fo, 'blink'); return true;
  }

  // ---- 每帧接管移动（foe_roles.tick 委托；返回 null = 走原逻辑）----
  function tick(fo, dt, d, face, dx, dz, P, ctx) {
    const rs = fo.rs, f = fo.f, role = fo.role, Foe_ = F_(); if (!rs) return null; const ux = dx / Math.max(0.01, d), uz = dz / Math.max(0.01, d);
    const tok = () => Foe_ && Foe_.tokenOK(fo); rs.castCd = (rs.castCd == null ? 1 : rs.castCd) - dt; rs.parryCd = (rs.parryCd || 0) - dt;
    if (role === 'duelist') {
      if (fo.block > 0) return { turnTo: face, spd: 0 };
      if (fo.cd <= 0 && tok() && d < 4.2) return null; // 轮到出手：原逻辑上步 + 起手
      const swinging = ctx.playerSwinging && ctx.playerSwinging();
      if (swinging && d < 3.3 && rs.parryCd <= 0 && Math.random() < dt * 9) { // 你一出刀：格挡（窗口 0.5 秒），弹开后立刻反击（foe.hit 里 blocked → cd ≤ 0.25）
        rs.parryCd = 2.2; fo.block = 0.5; const a = ctx.handAng ? ctx.handAng(fo) : null; fo.gAng = (a != null ? a : Math.PI / 2) + (Math.random() - 0.5) * 0.25;
        f.play('Sword_Block', { once: true, fade: 0.05, restart: true }); cue(fo, 'parry'); return { turnTo: face, spd: 0 };
      }
      if (d > 3.0) { fo.rv = { x: ux * 2.6, z: uz * 2.6 }; f.play('Jog_Fwd_Loop', { fade: 0.25, speed: 1 }); return { turnTo: face, spd: 0 }; }
      if (d < 1.9) { fo.rv = { x: -ux * 1.2, z: -uz * 1.2 }; return { turnTo: face, spd: 0 }; }
      const sg = (Math.floor(rs.t / 2.4) % 2) ? 1 : -1; fo.rv = { x: -uz * sg * 1.5, z: ux * sg * 1.5 }; f.play('Walk_Loop', { fade: 0.25, speed: 1 }); return { turnTo: face, spd: 0 }; // 绕圈游走
    }
    if (role === 'juggernaut') {
      if (fo.cd <= 0 && tok()) return null;
      if (d > 2.2) { fo.rv = { x: ux * 1.6, z: uz * 1.6 }; f.play('Walk_Loop', { fade: 0.25, speed: 0.85 }); } else f.play('Sword_Idle', { fade: 0.3 });
      return { turnTo: face, spd: 0 };
    }
    if (role === 'mage' || role === 'healer') {
      if (rs.casting > 0) { rs.casting -= dt; if (!rs.fired && rs.casting < 0.5) { rs.fired = true; if (role === 'mage') { fireOrb(fo, ctx, 0); if (fo.hp < fo.maxHp * 0.5) { fireOrb(fo, ctx, 0.22); fireOrb(fo, ctx, -0.22); } } else heal(fo, ctx); } if (rs.casting <= 0) f.play('Spell_Simple_Idle_Loop', { fade: 0.2 }); return { turnTo: face, spd: 0 }; }
      rs.blinkCd = (rs.blinkCd || 0) - dt;
      if (d < 3.2 && rs.blinkCd <= 0 && blink(fo, P, ctx)) { rs.blinkCd = 5; rs.castCd = Math.min(rs.castCd, 0.8); return { turnTo: face, spd: 0 }; }
      if (d < 2.6) return null; // 被逼到墙角：挥拳
      if (role === 'mage' && rs.castCd <= 0 && d >= 3.5 && d <= 14) { rs.castCd = (fo.hp < fo.maxHp * 0.5 ? 2.2 : 3.2) + Math.random() * 1.2; rs.casting = 0.95; rs.fired = false; f.play('Spell_Simple_Shoot', { once: true, fade: 0.08, restart: true }); return { turnTo: face, spd: 0 }; }
      if (role === 'healer') {
        const need = woundedNear(fo, 10);
        if (need && rs.castCd <= 0) { rs.castCd = 5.5; rs.casting = 1.05; rs.fired = false; f.play('Spell_Simple_Shoot', { once: true, fade: 0.08, restart: true }); ring(ctx, fo.pos, 0x8fe8a0, 0.6, 0.9, 3); cue(fo, 'cast'); return { turnTo: face, spd: 0 }; }
        const ally = nearestAlly(fo); // 向同伴靠拢，但离你至少 5 米
        if (!ally) { if (d < 3.4) return null; f.play('Idle_Loop', { fade: 0.3 }); return { turnTo: face, spd: 0 }; } // 同伴都死了：慌得站在原地，贴近就挥拳
        if (ally && d > 5 && ally.d > 3.5) { const ax = ally.fo.pos.x - fo.pos.x, az = ally.fo.pos.z - fo.pos.z, al = Math.hypot(ax, az) || 1; fo.rv = { x: ax / al * 2.4, z: az / al * 2.4 }; f.play('Jog_Fwd_Loop', { fade: 0.25, speed: 0.9 }); return { turnTo: face, spd: 0 }; }
        if (d < 4.5) { fo.rv = { x: -ux * 1.8, z: -uz * 1.8 }; f.play('Walk_Loop', { fade: 0.25, speed: -0.9 }); return { turnTo: face, spd: 0 }; }
        f.play('Spell_Simple_Idle_Loop', { fade: 0.3 }); return { turnTo: face, spd: 0 };
      }
      if (d < 5.5) { fo.rv = { x: -ux * 1.9, z: -uz * 1.9 }; f.play('Walk_Loop', { fade: 0.25, speed: -0.9 }); return { turnTo: face, spd: 0 }; }
      if (d > 9.5) { f.play('Jog_Fwd_Loop', { fade: 0.25, speed: 0.95 }); return { turnTo: face, spd: 3.3 }; }
      f.play('Spell_Simple_Idle_Loop', { fade: 0.3 }); return { turnTo: face, spd: 0 };
    }
    if (role === 'warcaller') {
      if (!rs.rallied && fo.hp < fo.maxHp * 0.55) { rs.rallied = true; rally(fo, ctx); }
      return null; // 其余走原逻辑（近战）
    }
    return null;
  }
  const allies = (fo) => ((F_() && Foe.foes) || []).filter(a => a !== fo && !a.dead && !a.escaped && !a.boss);
  function nearestAlly(fo) { let b = null, bd = 1e9; for (const a of allies(fo)) { const d = Math.hypot(a.pos.x - fo.pos.x, a.pos.z - fo.pos.z); if (d < bd) { bd = d; b = a; } } return b ? { fo: b, d: bd } : null; }
  function woundedNear(fo, R) { return allies(fo).some(a => a.hp < a.maxHp * 0.75 && Math.hypot(a.pos.x - fo.pos.x, a.pos.z - fo.pos.z) < R); }
  function heal(fo, ctx) {
    let n = 0; for (const a of allies(fo)) { if (Math.hypot(a.pos.x - fo.pos.x, a.pos.z - fo.pos.z) > 10 || a.hp >= a.maxHp) continue; const h = Math.round(a.maxHp * 0.3); a.hp = Math.min(a.maxHp, a.hp + h); n++; ring(ctx, a.pos, 0x8fe8a0, 0.5, 0.8, 1.8); try { ctx.floatDmg(a.anchor ? a.anchor.pos : a.pos, `✚${h}`, false); } catch (e) {} }
    if (n) { cue(fo, 'heal'); if (ctx.toast) ctx.toast('✚ 疗愈者治好了同伴——优先杀她', '#8fe8a0', 1.4); }
  }
  function rally(fo, ctx) {
    cue(fo, 'rally'); ring(ctx, fo.pos, 0xff6a50, 1, 1.0, 9); try { Foe.say(fo, '全体——冲！', '#ffb0a0'); } catch (e) {}
    for (const a of allies(fo)) { a.brave = true; a.seen = true; if (a.state !== 'chase') a.state = 'chase'; a.cd = Math.min(a.cd || 0, 0.3); a.buf = Math.max(a.buf || 0, 6); }
    if (ctx.toast) ctx.toast('🚩 战旗手吹响号角——所有人一起冲上来！', '#ff9a80', 1.8);
  }

  // ---- 命中前钩子（foe.hit 最先调用 FoeRoles.evade；返回 true = 刃穿过去）----
  function evade(fo, info) {
    if (fo.role === 'juggernaut' && !fo.dead) {
      const C = F_() && Foe.ctx && Foe.ctx(); let front = true; if (C && C.player) front = Math.abs(ang(Math.atan2(C.player.pos.x - fo.pos.x, C.player.pos.z - fo.pos.z) - fo.yaw)) < 1.35;
      if (front && !info.charged && !(fo.broken > 0) && info.combo !== 2) { info.mult = (info.mult || 1) * 0.3; info.fmul = (info.fmul || 1) * 0.3; cue(fo, 'armor'); if (window.Foe && Foe.spark && info.point) Foe.spark(info.point, 8); if (!FR().tipped2) { FR().tipped2 = 1; if (C && C.toast) C.toast('🛡️ 重甲——正面轻击几乎无效：绕背，或用下劈终结 / 蓄力重斩', '#b8c4d8', 2.4); } }
    }
    return false;
  }
  function hurt(fo, dealt, info, zone) { // 返回 true = 不硬直
    const role = fo.role, rs = fo.rs;
    if (role === 'mage' || role === 'healer') { if (rs && rs.casting > 0) { rs.casting = 0; rs.fired = true; fo.f.play('Hit_Chest', { once: true, fade: 0.05, restart: true }); } return false; } // 打断吟唱
    if (role === 'juggernaut') { fo.poise = (fo.poise || 0) + dealt; if (fo.poise >= 40 || info.charged || fo.broken > 0) { fo.poise = 0; return false; } return true; }
    return false;
  }

  // ---- 每帧（foe_roles.update 委托）：法球 / 光环 / 战旗加成 ----
  function update(dt, ctx) {
    const t = T(); if (!t) return;
    for (let i = FX.length - 1; i >= 0; i--) { const e = FX[i]; e.t += dt; const k = e.t / e.life; e.m.scale.setScalar(e.r0 + (e.big - e.r0) * Math.min(1, k)); e.m.material.opacity = 0.8 * (1 - k); if (k >= 1) { e.m.parent && e.m.parent.remove(e.m); e.m.material.dispose(); FX.splice(i, 1); } }
    const foes = (F_() && Foe.foes) || [];
    // 战旗：9 米内同伴 buf（持续刷新）；脚下红圈
    for (const fo of foes) { if (fo.buf > 0) fo.buf -= dt; }
    for (const w of foes) {
      if (w.role !== 'warcaller') continue;
      if (w.dead || w.escaped) { if (w.aura) { w.aura.parent && w.aura.parent.remove(w.aura); w.aura = null; } continue; }
      if (!w.aura && ctx && ctx.sc) { w.aura = new t.Mesh(new t.RingGeometry(8.6, 9.0, 64).rotateX(-Math.PI / 2), new t.MeshBasicMaterial({ color: 0xff5a40, transparent: true, opacity: 0.22, depthWrite: false, blending: t.AdditiveBlending, side: t.DoubleSide, fog: false })); w.aura.renderOrder = 3; ctx.sc.add(w.aura); }
      if (w.aura) w.aura.position.set(w.pos.x, (ctx.H ? ctx.H(w.pos.x, w.pos.z) : 0) + 0.05, w.pos.z);
      for (const a of foes) { if (a.dead || a.escaped || a.boss) continue; if (Math.hypot(a.pos.x - w.pos.x, a.pos.z - w.pos.z) < 9) a.buf = Math.max(a.buf || 0, 0.4); }
    }
    for (const fo of foes) { const b = fo.buf > 0 && !fo.dead; if (b && !fo.bufOn) { fo.bufOn = true; fo.spdMul = (fo.spdMul || 1) * 1.2; } else if (!b && fo.bufOn) { fo.bufOn = false; fo.spdMul = (fo.spdMul || 1) / 1.2; } }
    // 法球
    const CS = window.Combat && Combat.drawn && Combat.state, P = ctx && ctx.player; if (!P) return;
    for (let i = ORBS.length - 1; i >= 0; i--) {
      const o = ORBS[i], g = o.g; o.life -= dt; g.position.addScaledVector(o.v, dt); g.children[1].scale.setScalar(1 + Math.sin(performance.now() * 0.02 + i) * 0.12); let kill = o.life <= 0, hitP = false;
      const gy = ctx.H ? ctx.H(g.position.x, g.position.z) : 0; if (g.position.y < gy + 0.05) { kill = true; if (window.Foe && Foe.spark) Foe.spark(g.position, 8, 'blue'); }
      if (!kill && CS && ctx.camera) { // 挥刀打散：出刀中、球在身前 2.3 米内
        const cam = ctx.camera, l = cam.worldToLocal(g.position.clone()); const swinging = CS.sw || CS.thrust > 0;
        if (l.z < -0.2 && l.length() < 2.3 && Math.atan2(Math.abs(l.x), -l.z) < 0.9 && swinging) { kill = true; if (window.Foe && Foe.spark) Foe.spark(g.position, 16, 'blue'); cue(o.fo, 'pop'); if (window.CombatFX) CombatFX.marker('crit'); if (!FR().tipped3) { FR().tipped3 = 1; if (ctx.toast) ctx.toast('✨ 把魂火打散了！', '#d8b0ff', 1.2); } }
        else if (CS.rmb && l.z < -0.2 && l.length() < 1.5) { kill = true; if (window.Foe && Foe.spark) Foe.spark(g.position, 12, 'blue'); cue(o.fo, 'pop'); CS.stam = Math.max(0, CS.stam - 6); if (window.CombatFX) CombatFX.clang('block', g.position); }
      }
      if (!kill && Math.hypot(g.position.x - P.pos.x, g.position.z - P.pos.z) < 0.6 && Math.abs(g.position.y - (P.pos.y + 1.1)) < 0.9) { kill = true; hitP = true; }
      if (hitP) { if (window.Foe && Foe.spark) Foe.spark(g.position, 14, 'blue'); ctx.hitPlayer(o.fo, o.dmg, { ang: 0, thrust: true, heavy: false }); }
      if (kill) { g.parent && g.parent.remove(g); g.children.forEach(c => { c.geometry.dispose(); c.material.dispose(); }); ORBS.splice(i, 1); }
    }
  }
  function clear() {
    for (const o of ORBS) o.g.parent && o.g.parent.remove(o.g); ORBS.length = 0;
    for (const e of FX) e.m.parent && e.m.parent.remove(e.m); FX.length = 0;
    for (const fo of ((F_() && Foe.foes) || [])) if (fo.aura) { fo.aura.parent && fo.aura.parent.remove(fo.aura); fo.aura = null; }
  }
  // 注册到 FoeRoles.INFO（foe_roles.js 先加载）
  if (window.FoeRoles && FoeRoles.INFO) for (const k in INFO) FoeRoles.INFO[k] = INFO[k];
  const R = { duelist: 1, juggernaut: 1, mage: 1, healer: 1, warcaller: 1 };
  return { on, INFO, R, pick, init, clip, tune, after, tick, evade, hurt, update, clear, ORBS };
})();
