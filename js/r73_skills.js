// R73 MOD foe_skills3（默认开）：12 个新敌人技能，每个都有不同的预警和解法（不和已有的跃斩/冲锋/旋风/破防/飞刃/横扫/锁链/震地/印记/战吼/新星以及 14 个职业的招重复）。
//  每个敌人按身份 / 种族 / 阶位抽 1~3 个「招牌技」（强敌 3 个 + 1 个随机），同一张图里的人招式不一样。
//  低扫（出环 / 闪身，否则被扫倒）· 擒拿（紫色手印，抓中被摔飞；你残血时是处刑擒拿）· 虚晃连刺（先晃一下骗你格挡，再按节奏连刺，逐下格挡）
//  回旋刃（飞出去还会飞回来，去回各判一次）· 地裂斩（沿直线推进的地裂，侧移）· 影步三连（落点先亮紫圈，转身挡背后）
//  霜域（大圈里移速减半，她趁机快攻——先出圈）· 反击架势（发光时别砍她，等或蓄力重斩破架）· 烟遁背刺（烟雾里绕到你身后）
//  锁链回旋（以她为圆心转两圈的锁链，贴身内圈或圈外安全）· 预判箭雨（沿你的移动方向依次落下，别直线后退）· 血契（她割手献血，下 3 刀红光不可挡——仪式中砍她打断）
window.Skills73 = (() => {
  'use strict';
  const on = () => !window.Mods || !Mods.on || Mods.on('foe_skills3') !== false;
  const T = () => window.THREE, now = () => performance.now() / 1000, ang = a => Math.atan2(Math.sin(a), Math.cos(a));
  const Hy = (C, x, z) => (C.H ? C.H(x, z) : 0);
  const dodging = () => { const W = window.Worlds && Worlds._W; return !!(W && W.dodgeT > now()); };
  const root = (s, why) => { try { window.FoeRoles3 && FoeRoles3.root(s, why); } catch (e) { } };
  const shake = (C, v) => { try { C.shake && C.shake(v); } catch (e) { } };
  const toast = (C, t, c, s) => { try { C.toast && C.toast(t, c || '#ffe070', s || 1.3); } catch (e) { } };
  const strong = fo => !!(window.Foe && Foe.STRONG && Foe.STRONG(fo));
  const SK = {
    sweep: { n: '低扫', tip: '⚠ 低扫！红环里会被扫倒——闪身或退出环外', t: 0 }, grab: { n: '擒拿', tip: '⚠ 紫色手印 = 擒拿！格挡没用，侧闪开；抓空她会露出大破绽', t: 0 },
    boomer: { n: '回旋刃', tip: '⚠ 回旋刃会飞回来——躲过去之后别站回原线上', t: 0 }, rain: { n: '预判箭雨', tip: '⚠ 箭雨落在你要去的地方——变向走，别直线后退', t: 0 },
    flurry: { n: '虚晃连刺', tip: '⚠ 先晃一下骗你格挡，然后按节奏连刺——看准每一下再挡', t: 1 }, wave: { n: '地裂斩', tip: '⚠ 地裂沿红线推进——往两侧让开', t: 1 },
    smoke: { n: '烟遁', tip: '⚠ 烟遁：她会绕到你身后——转身', t: 1 }, frost: { n: '霜域', tip: '⚠ 霜域：圈里移速减半，她会趁机快攻——先出圈', t: 1 },
    shadow: { n: '影步三连', tip: '⚠ 影步：紫圈亮在哪她就从哪出刀——转向紫圈格挡', t: 2 }, stance: { n: '反击架势', tip: '⚠ 反击架势（金光）：别砍！等她收势，或蓄力重斩破架', t: 2 },
    chainsweep: { n: '锁链回旋', tip: '⚠ 锁链回旋：贴到她身边的内圈，或者退到圈外', t: 2 }, bloodpact: { n: '血契', tip: '⚠ 血契：她在割手献血——趁现在砍她打断，否则接下来 3 刀不能格挡', t: 2 }
  };
  const POOLS = { fight: ['sweep', 'grab', 'wave', 'stance', 'chainsweep', 'flurry'], bow: ['rain', 'boomer', 'smoke', 'sweep'], witch: ['frost', 'smoke', 'rain', 'bloodpact'], holy: ['wave', 'stance', 'frost', 'flurry'], noble: ['flurry', 'shadow', 'stance', 'bloodpact'], shade: ['shadow', 'smoke', 'flurry', 'boomer'], gen: ['sweep', 'grab', 'boomer', 'rain'] };
  const RACE = { beast: ['grab', 'sweep'], darkelf: ['shadow', 'bloodpact'], vampire: ['bloodpact', 'shadow'], elf: ['boomer', 'rain'], demon: ['chainsweep', 'bloodpact'], dragon: ['wave', 'chainsweep'], angel: ['frost', 'wave'] };
  function grp(c) { const id = (c && c.id) || ''; return /witch|hexer|coven|alchem|herbal|shaman|druid|mage|sorce|oracle/.test(id) ? 'witch' : /archer|ranger|hunt|falcon|cross|scout/.test(id) ? 'bow' : /nun|saint|priest|abbess|choir|miko|novice|inquisitor|angel|paladin|cleric/.test(id) ? 'holy' : /queen|princess|lady|countess|duchess|court|musician|singer|bard|noble|dancer/.test(id) ? 'noble' : /assassin|thief|rogue|spy|ninja|shadow|pirate/.test(id) ? 'shade' : /merc|knight|guard|general|slayer|warrior|chieftess|wolf|barbar|gladiat|soldier|captain/.test(id) ? 'fight' : 'gen'; }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function kit(fo) {
    if (fo._x3) return fo._x3; const c = (fo.h && fo.h.c) || {}, st = strong(fo), tier = st ? 3 : (fo.tier | 0); let s = hash((c.name || '') + (fo.id2 || '') + (c.id || ''));
    const r = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const cand = [...new Set([...(POOLS[grp(c)] || POOLS.gen), ...(RACE[c.race] || [])])].filter(k => SK[k].t <= tier).sort(() => r() - 0.5);
    const n = st ? 3 : tier >= 2 ? 2 : 1; const out = cand.slice(0, n);
    if (st) { const all = Object.keys(SK).filter(k => !out.includes(k)); if (all.length) out.push(all[Math.floor(r() * all.length)]); }
    fo._x3 = out; return out;
  }
  const mine = (fo, k) => kit(fo).includes(k);
  // ---- 自建的特效物体（投射物 / 光束 / 区域）----
  const OWN = [];
  function addObj(C, m, fo) { C.sc.add(m); OWN.push({ m, sc: C.sc, fo }); return m; }
  function delObj(m) { if (!m) return; if (m.parent) m.parent.remove(m); const i = OWN.findIndex(o => o.m === m); if (i >= 0) OWN.splice(i, 1); try { if (m.geometry && !m.geometry._shared) m.geometry.dispose(); if (m.material) m.material.dispose(); } catch (e) { } }
  let GEO = null;
  function geo() { if (GEO) return GEO; const t = T(); GEO = { blade: new t.TorusGeometry(0.26, 0.035, 6, 20), beam: new t.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0.5, 0, 0), seg: new t.PlaneGeometry(1, 1).rotateX(-Math.PI / 2) }; for (const k in GEO) GEO[k]._shared = 1; return GEO; }
  const add = (col, op) => new (T().MeshBasicMaterial)({ color: col, transparent: true, opacity: op, depthWrite: false, blending: T().AdditiveBlending, side: T().DoubleSide, fog: false });
  const ZONES = []; // { k, x, z, r, until, m }
  let slowUntil = 0, veil = 0, ovl = null;
  function overlay(a, col) { if (!ovl) { ovl = document.createElement('div'); ovl.style.cssText = 'position:fixed;inset:0;z-index:29;pointer-events:none;opacity:0;transition:opacity .25s'; document.body.appendChild(ovl); } if (a > 0.01) ovl.style.background = `radial-gradient(ellipse at 50% 50%,transparent 18%,${col} 80%)`; ovl.style.opacity = a.toFixed(2); clearTimeout(ovl._t); if (a > 0.01) ovl._t = setTimeout(() => { ovl.style.opacity = 0; }, 400); }
  function first(fo, k, C, A) { A.hint(C, 's3' + k, SK[k].tip); A.say(fo, `「${SK[k].n}」`, '#ffb0a0'); }

  const DEF = {
    sweep: {
      can: (fo, d) => mine(fo, 'sweep') && d < 2.6 ? 2 : 0,
      start(fo, d, P, C, face, A) { first(fo, 'sweep', C, A); fo.sk = { k: 'sweep', t: 0, fx: [A.ringM(C, fo.pos.x, fo.pos.z, 0.25, 2.4, 0xff3020, 0.08)], dmg: A.baseDmg(fo, C, 0.75) }; fo.f.play('Crouch_Idle_Loop', { fade: 0.1 }); },
      run(fo, dt, d, face, dx, dz, P, C, A) { const s = fo.sk, e = s.fx[0];
        if (s.t < 0.55) { if (e) { e.m.position.set(fo.pos.x, Hy(C, fo.pos.x, fo.pos.z) + 0.08, fo.pos.z); e.m.material.opacity = 0.1 + 0.35 * (s.t / 0.55) * (0.6 + 0.4 * Math.sin(s.t * 30)); } return { turnTo: face, spd: 0 }; }
        if (!s.done) { s.done = 1; fo.f.play(fo.armed ? 'Sword_Regular_C' : 'Melee_Hook', { once: true, fade: 0.04, restart: true, speed: 1.7 }); A.cue(fo, 'backstab'); if (e) e.m.material.opacity = 0.6;
          if (d < 2.45 && !dodging()) { C.hitPlayer(fo, s.dmg, { ang: 0, thrust: true, unblock: true }); root(0.6, '🦵 被扫倒了'); shake(C, 0.35); } }
        if (s.t > 1.05) A.fin(fo, 0.8, 0.5); return { turnTo: fo.yaw, spd: 0 }; }
    },
    grab: {
      can: (fo, d) => mine(fo, 'grab') && d > 1.2 && d < 3.4 ? 2 : 0,
      start(fo, d, P, C, face, A) { first(fo, 'grab', C, A); const e = A.strip(C, 0xb050ff, 1.1, 0.25); fo.sk = { k: 'grab', t: 0, yaw: face, fx: [e], dmg: A.baseDmg(fo, C, 1.3) }; fo.f.play('Idle_Shield_Loop', { fade: 0.12 }); },
      run(fo, dt, d, face, dx, dz, P, C, A) { const s = fo.sk;
        if (s.t < 0.6) { if (s.t < 0.42) s.yaw = face; const e = s.fx[0]; if (e) { e.m.position.set(fo.pos.x, Hy(C, fo.pos.x, fo.pos.z) + 0.07, fo.pos.z); e.m.rotation.y = s.yaw; e.m.scale.set(1.1, 1, 3.0); e.m.material.opacity = 0.12 + 0.35 * s.t / 0.6; } return { turnTo: s.yaw, spd: 0 }; }
        if (!s.lunge) { s.lunge = 1; for (const x of s.fx) A.kill(x); s.fx = []; fo.f.play('Punch_Cross', { once: true, fade: 0.04, restart: true, speed: 1.4 }); }
        if (!s.caught && !s.miss) {
          if (s.t < 0.88) { A.setV(fo, Math.sin(s.yaw) * 8.5, Math.cos(s.yaw) * 8.5); if (d < 1.15 && !dodging()) { const low = window.G && G.S && G.st && G.S.hp < G.st().maxHp * 0.35; s.caught = { t: 0, x0: P.pos.x, z0: P.pos.z, x1: P.pos.x + Math.sin(s.yaw) * 3.4, z1: P.pos.z + Math.cos(s.yaw) * 3.4 };
            C.hitPlayer(fo, Math.round(s.dmg * (low ? 1.6 : 1)), { ang: 0, thrust: true, unblock: true, heavy: true }); root(0.5, low ? '🩸 处刑擒拿！' : '✊ 被她抓住摔了出去'); shake(C, 0.55); toast(C, low ? '🩸 处刑擒拿——她专挑残血的人下手' : '✊ 被擒拿了！', '#ff9a80', 1.2); }
            return { turnTo: s.yaw, spd: 0 }; }
          s.miss = 1; fo.broken = Math.max(fo.broken || 0, 1.0); toast(C, '💢 擒拿抓空——破绽！', '#ffe070', 1.1); }
        if (s.caught) { const c = s.caught; c.t += dt; const k = Math.min(1, c.t / 0.32); P.pos.x = c.x0 + (c.x1 - c.x0) * k; P.pos.z = c.z0 + (c.z1 - c.z0) * k; if (k < 1) return { turnTo: s.yaw, spd: 0 }; A.fin(fo, 0.6, 0.3); return null; }
        if (s.t > 1.7) A.fin(fo, 0.9, 0); return { turnTo: s.yaw, spd: 0 }; }
    },
    flurry: {
      can: (fo, d) => mine(fo, 'flurry') && d < 2.8 ? 2 : 0,
      start(fo, d, P, C, face, A) { first(fo, 'flurry', C, A); fo.sk = { k: 'flurry', t: 0, yaw: face, fx: [A.sector(C, fo.pos.x, fo.pos.z, 2.9, 1.6, face, 0xffd040, 0.22)], n: 3 + ((fo.tier | 0) >= 2 || strong(fo) ? 2 : 0), i: 0, next: 0.62, dmg: A.baseDmg(fo, C, 0.42) }; fo.f.play(fo.armed ? 'Sword_Attack' : 'Melee_Hook', { once: true, fade: 0.08, restart: true, speed: 0.6 }); },
      run(fo, dt, d, face, dx, dz, P, C, A) { const s = fo.sk; if (fo.broken > 0 || fo.psBroke) { A.fin(fo, 0.5, 0); return null; }
        if (s.t < 0.38) return { turnTo: face, spd: 0 };
        if (!s.fake) { s.fake = 1; for (const x of s.fx) A.kill(x); s.fx = []; fo.f.play(fo.armed ? 'Sword_Idle' : 'Idle_Loop', { fade: 0.05 }); }
        if (s.i < s.n && s.t >= s.next) { s.i++; s.next = s.t + 0.27; fo.f.play(fo.armed ? 'Sword_Dash' : 'Punch_Jab', { once: true, fade: 0.03, restart: true, speed: 1.8 }); A.cue(fo, 'backstab');
          if (d < 2.3) C.hitPlayer(fo, s.dmg, { ang: 0, thrust: true }); return { turnTo: face, spd: d > 1.5 ? 2.2 : 0 }; }
        if (s.i >= s.n && s.t > s.next + 0.35) A.fin(fo, 0.9, 0.6); return { turnTo: face, spd: 0 }; }
    },
    boomer: {
      can: (fo, d) => mine(fo, 'boomer') && d > 3 && d < 10 ? 2 : 0,
      start(fo, d, P, C, face, A) { first(fo, 'boomer', C, A); fo.sk = { k: 'boomer', t: 0, yaw: face, dmg: A.baseDmg(fo, C, 0.85), side: Math.random() < 0.5 ? -1 : 1, hit0: 0, hit1: 0 }; fo.f.play('Spell_Simple_Idle_Loop', { fade: 0.12 }); },
      run(fo, dt, d, face, dx, dz, P, C, A) { const s = fo.sk;
        if (s.t < 0.45) { s.yaw = face; return { turnTo: face, spd: 0 }; }
        if (!s.m) { const pv = C.pvel || { x: 0, z: 0 }, tx = P.pos.x + pv.x * 0.25, tz = P.pos.z + pv.z * 0.25, a = Math.atan2(tx - fo.pos.x, tz - fo.pos.z); s.a = a; s.o = { x: fo.pos.x, z: fo.pos.z }; s.L = Math.min(12, Math.hypot(tx - fo.pos.x, tz - fo.pos.z) + 3); s.m = addObj(C, new (T().Mesh)(geo().blade, add(0xffc070, 0.95)), fo); s.m.rotation.x = Math.PI / 2; fo.f.play('Spell_Simple_Shoot', { once: true, fade: 0.04, restart: true }); A.cue(fo, 'cast'); }
        const u = Math.min(1, (s.t - 0.45) / 1.5), out = u < 0.5, q = out ? u * 2 : (1 - u) * 2, lat = Math.sin(u * Math.PI) * 2.4 * s.side * (out ? 0.12 : 1);
        const ux = Math.sin(s.a), uz = Math.cos(s.a), bx = (out ? s.o.x : fo.pos.x) + ux * s.L * q + uz * lat, bz = (out ? s.o.z : fo.pos.z) + uz * s.L * q - ux * lat;
        s.m.position.set(bx, Hy(C, bx, bz) + 1.1, bz); s.m.rotation.z += dt * 28;
        if (Math.hypot(P.pos.x - bx, P.pos.z - bz) < 0.75 && !dodging()) { if (out && !s.hit0) { s.hit0 = 1; C.hitPlayer(fo, s.dmg, { ang: 0, thrust: true }); } else if (!out && !s.hit1) { s.hit1 = 1; C.hitPlayer(fo, s.dmg, { ang: 0, thrust: true }); toast(C, '🪃 回旋刃飞回来了！', '#ffc070', 1); } }
        if (u >= 1) { delObj(s.m); s.m = null; A.fin(fo, 0.7, 0.4); return null; } return { turnTo: face, spd: 0 }; }
    },
    wave: {
      can: (fo, d) => mine(fo, 'wave') && d > 2.5 && d < 9 ? 2 : 0,
      start(fo, d, P, C, face, A) { first(fo, 'wave', C, A); const e = A.strip(C, 0xff4020, 1.7, 0.12); fo.sk = { k: 'wave', t: 0, yaw: face, fx: [e], dmg: A.baseDmg(fo, C, 1.1) }; fo.f.play('Jump_Start', { once: true, fade: 0.1, restart: true, speed: 0.8 }); },
      run(fo, dt, d, face, dx, dz, P, C, A) { const s = fo.sk, e = s.fx[0];
        if (s.t < 0.65) { if (s.t < 0.45) s.yaw = face; if (e) { e.m.position.set(fo.pos.x, Hy(C, fo.pos.x, fo.pos.z) + 0.07, fo.pos.z); e.m.rotation.y = s.yaw; e.m.scale.set(1.7, 1, 11); e.m.material.opacity = 0.08 + 0.18 * s.t / 0.65; } return { turnTo: s.yaw, spd: 0 }; }
        if (!s.seg) { fo.f.play('Jump_Land', { once: true, fade: 0.05, restart: true, speed: 1.4 }); A.cue(fo, 'slam'); shake(C, 0.4); s.seg = addObj(C, new (T().Mesh)(geo().seg, add(0xff5020, 0.75)), fo); s.ox = fo.pos.x; s.oz = fo.pos.z; s.sp = 0; }
        const w = s.t - 0.65, along = Math.min(11, w * 12), ux = Math.sin(s.yaw), uz = Math.cos(s.yaw), cx = s.ox + ux * along, cz = s.oz + uz * along;
        s.seg.position.set(cx, Hy(C, cx, cz) + 0.1, cz); s.seg.rotation.y = s.yaw; s.seg.scale.set(1.7, 1, 1.6); s.seg.material.opacity = 0.75 * (1 - Math.max(0, along - 9) / 2);
        if ((s.sp += dt) > 0.07) { s.sp = 0; A.spark({ x: cx, y: Hy(C, cx, cz) + 0.2, z: cz }, 6); }
        if (!s.hit) { const rx = P.pos.x - cx, rz = P.pos.z - cz, al = rx * ux + rz * uz, la = Math.abs(rx * uz - rz * ux); if (Math.abs(al) < 0.85 && la < 1.05 && !dodging()) { s.hit = 1; C.hitPlayer(fo, s.dmg, { ang: 0, thrust: true, heavy: true, unblock: true }); shake(C, 0.45); } }
        if (along >= 11) { delObj(s.seg); s.seg = null; A.fin(fo, 0.8, 0.7); return null; } return { turnTo: s.yaw, spd: 0 }; }
    },
    shadow: {
      can: (fo, d) => mine(fo, 'shadow') && d < 7 ? 2 : 0,
      start(fo, d, P, C, face, A) { first(fo, 'shadow', C, A); fo.sk = { k: 'shadow', t: 0, i: 0, n: strong(fo) ? 4 : 3, ph: 'mark', pt: 0, fx: [], dmg: A.baseDmg(fo, C, 0.6) }; fo.f.play('Spell_Simple_Shoot', { once: true, fade: 0.05, restart: true }); },
      run(fo, dt, d, face, dx, dz, P, C, A) { const s = fo.sk; s.pt += dt;
        if (s.ph === 'mark') { if (!s.tgt) { const side = [Math.PI / 2, -Math.PI / 2, Math.PI, Math.PI * 0.75, -Math.PI * 0.75][s.i % 5], a = P.yaw + side, tx = P.pos.x - Math.sin(a) * 1.7, tz = P.pos.z - Math.cos(a) * 1.7, [cx, cz] = A.arenaClamp(C, tx, tz); s.tgt = { x: cx, z: cz }; s.fx.push(A.disc(C, cx, cz, 0.45, 0xa040ff, 9, 0.35)); }
          if (s.pt >= 0.38) { s.ph = 'strike'; s.pt = 0; s.ev = true; A.spark(fo.pos.clone().add(new (T().Vector3)(0, 1, 0)), 12, 'blue'); fo.pos.x = s.tgt.x; fo.pos.z = s.tgt.z; A.spark(fo.pos.clone().add(new (T().Vector3)(0, 1, 0)), 12, 'blue'); fo.yaw = Math.atan2(P.pos.x - fo.pos.x, P.pos.z - fo.pos.z); A.cue(fo, 'blink'); fo.f.play(fo.armed ? 'Sword_Dash' : 'Punch_Cross', { once: true, fade: 0.03, restart: true, speed: 1.5 }); }
          return { turnTo: face, spd: 0 }; }
        if (s.ph === 'strike') { if (s.pt > 0.12) s.ev = false;
          if (!s.hitDone && s.pt >= 0.22) { s.hitDone = 1; for (const x of s.fx) A.kill(x); s.fx = []; if (d < 2.1) C.hitPlayer(fo, s.dmg, { ang: 0, thrust: true }); }
          if (s.pt >= 0.42) { s.i++; s.tgt = null; s.hitDone = 0; s.pt = 0; s.ph = s.i >= s.n ? 'end' : 'mark'; } return { turnTo: face, spd: 0 }; }
        A.fin(fo, 0.9, 0.6); return null; }
    },
    frost: {
      can: (fo, d) => mine(fo, 'frost') && d < 6 && !ZONES.some(z => z.k === 'frost') ? 2 : 0,
      start(fo, d, P, C, face, A) { first(fo, 'frost', C, A); fo.sk = { k: 'frost', t: 0, x: P.pos.x, z: P.pos.z, fx: [A.disc(C, P.pos.x, P.pos.z, 4.2, 0x70d0ff, 9, 0.12)] }; fo.f.play('Spell_Simple_Idle_Loop', { fade: 0.12 }); A.cue(fo, 'cast'); },
      run(fo, dt, d, face, dx, dz, P, C, A) { const s = fo.sk, e = s.fx[0];
        if (s.t < 0.85) { if (e) e.m.material.opacity = 0.08 + 0.2 * (s.t / 0.85); return { turnTo: face, spd: 0 }; }
        if (e) { e.m.material.opacity = 0.32; ZONES.push({ k: 'frost', x: s.x, z: s.z, r: 4.2, until: now() + 3.6, fx: e, kill: A.kill, sc: C.sc }); s.fx = []; }
        fo.f.play('Spell_Simple_Shoot', { once: true, fade: 0.05, restart: true }); A.fin(fo, 0.05, 0); fo.cd = 0; fo.frostHaste = now() + 3.6; return null; }
    },
    stance: {
      can: (fo, d) => mine(fo, 'stance') && d < 3.2 ? 2 : 0,
      start(fo, d, P, C, face, A) { first(fo, 'stance', C, A); fo.sk = { k: 'stance', t: 0, ph: 'guard', fx: [A.ringM(C, fo.pos.x, fo.pos.z, 0.6, 1.0, 0xffe070, 0.4)], dmg: A.baseDmg(fo, C, 1.5) }; fo.f.play('Sword_Block', { once: true, fade: 0.08, restart: true }); },
      preHit(fo, info, c, A) { const s = fo.sk; if (s.ph !== 'guard') return false; const C = Foe.ctx();
        if (info.charged) { for (const x of s.fx) A.kill(x); s.fx = []; A.fin(fo, 0.9, 1.0); toast(C, '💥 蓄力重斩破开了她的架势！', '#ffe070', 1.2); return false; }
        s.ph = 'counter'; s.t = 0; A.spark(c.point, 18); try { C.clang && C.clang(c.point, 'block'); } catch (e) { } toast(C, '⚔️ 被她看破了——反击来了！', '#ff9a80', 1.1); fo.f.play(fo.armed ? 'Sword_Attack' : 'Punch_Cross', { once: true, fade: 0.03, restart: true, speed: 1.6 }); return true; },
      run(fo, dt, d, face, dx, dz, P, C, A) { const s = fo.sk, e = s.fx[0];
        if (s.ph === 'guard') { if (e) { e.m.position.set(fo.pos.x, Hy(C, fo.pos.x, fo.pos.z) + 0.08, fo.pos.z); e.m.material.opacity = 0.25 + 0.25 * Math.sin(s.t * 14); } if (s.t > 1.4) { for (const x of s.fx) A.kill(x); s.fx = []; A.fin(fo, 0.4, 0); return null; } return { turnTo: face, spd: 0 }; }
        if (!s.hit && s.t >= 0.24) { s.hit = 1; for (const x of s.fx) A.kill(x); s.fx = []; if (d < 2.6 && !dodging()) { C.hitPlayer(fo, s.dmg, { ang: 0, thrust: true, unblock: true, heavy: true }); shake(C, 0.5); } }
        if (s.t > 0.75) A.fin(fo, 0.8, 0); return { turnTo: face, spd: 0 }; }
    },
    smoke: {
      can: (fo, d) => mine(fo, 'smoke') && d > 2 && d < 8 ? 2 : 0,
      start(fo, d, P, C, face, A) { first(fo, 'smoke', C, A); fo.sk = { k: 'smoke', t: 0, fx: [A.disc(C, fo.pos.x, fo.pos.z, 2.6, 0x808080, 9, 0.3)] }; fo.f.play('Spell_Simple_Shoot', { once: true, fade: 0.05, restart: true }); A.spark(fo.pos.clone().add(new (T().Vector3)(0, 0.8, 0)), 22); veil = Math.max(veil, now() + 2.2); },
      run(fo, dt, d, face, dx, dz, P, C, A) { const s = fo.sk; s.ev = s.t > 0.2 && s.t < 0.7;
        if (s.t < 0.6) return { turnTo: face, spd: 0 };
        if (!s.done) { s.done = 1; for (const x of s.fx) A.kill(x); s.fx = []; const bx = P.pos.x + Math.sin(P.yaw) * 1.8, bz = P.pos.z + Math.cos(P.yaw) * 1.8, [tx, tz] = A.arenaClamp(C, bx, bz); fo.pos.x = tx; fo.pos.z = tz; fo.yaw = Math.atan2(P.pos.x - tx, P.pos.z - tz); A.fin(fo, 0, 0); fo.cd = 0; fo.backstab = true; try { Foe.attack(fo, 1.8, fo.armed ? 'Sword_Dash' : 'Punch_Cross'); } catch (e) { } return null; }
        return { turnTo: face, spd: 0 }; }
    },
    chainsweep: {
      can: (fo, d) => mine(fo, 'chainsweep') && d < 4.2 ? 2 : 0,
      start(fo, d, P, C, face, A) { first(fo, 'chainsweep', C, A); fo.sk = { k: 'chainsweep', t: 0, fx: [A.ringM(C, fo.pos.x, fo.pos.z, 1.1, 4.4, 0xff3020, 0.05)], dmg: A.baseDmg(fo, C, 0.7), a: Math.atan2(P.pos.x - fo.pos.x, P.pos.z - fo.pos.z) + Math.PI, dir: Math.random() < 0.5 ? 1 : -1, cool: 0 }; fo.f.play('Spell_Simple_Idle_Loop', { fade: 0.1 }); },
      run(fo, dt, d, face, dx, dz, P, C, A) { const s = fo.sk;
        if (s.t < 0.65) { const e = s.fx[0]; if (e) e.m.material.opacity = 0.04 + 0.1 * s.t / 0.65; return { turnTo: face, spd: 0 }; }
        if (!s.m) { s.m = addObj(C, new (T().Mesh)(geo().beam, add(0xff4020, 0.7)), fo); s.m.scale.set(3.3, 1, 0.32); fo.f.play(fo.armed ? 'Sword_Regular_C' : 'Melee_Hook', { once: true, fade: 0.05, restart: true, speed: 1.2 }); }
        s.a += dt * 4.2 * s.dir; s.cool -= dt; const y = Hy(C, fo.pos.x, fo.pos.z) + 0.25; s.m.position.set(fo.pos.x + Math.sin(s.a) * 1.1, y, fo.pos.z + Math.cos(s.a) * 1.1); s.m.rotation.y = s.a - Math.PI / 2;
        const pa = Math.atan2(P.pos.x - fo.pos.x, P.pos.z - fo.pos.z); if (s.cool <= 0 && d > 1.05 && d < 4.5 && Math.abs(ang(pa - s.a)) < 0.16 && !dodging()) { s.cool = 0.6; C.hitPlayer(fo, s.dmg, { ang: 0, thrust: true, heavy: true }); shake(C, 0.3); }
        if (s.t > 0.65 + Math.PI * 4 / 4.2) { delObj(s.m); s.m = null; for (const x of s.fx) A.kill(x); s.fx = []; A.fin(fo, 1.0, 0.8); return null; } return { turnTo: fo.yaw, spd: 0 }; }
    },
    rain: {
      can: (fo, d) => mine(fo, 'rain') && d > 3 && d < 14 ? 2 : 0,
      start(fo, d, P, C, face, A) { first(fo, 'rain', C, A); fo.sk = { k: 'rain', t: 0, drops: [], i: 0, dmg: A.baseDmg(fo, C, 0.5), fx: [] }; fo.f.play('Idle_Shield_Loop', { fade: 0.1 }); },
      run(fo, dt, d, face, dx, dz, P, C, A) { const s = fo.sk;
        if (s.t < 0.45) return { turnTo: face, spd: 0 };
        if (s.i < 5 && s.t >= 0.45 + s.i * 0.22) { const pv = C.pvel || { x: 0, z: 0 }, la = 0.35 + 0.28 * s.i, x = P.pos.x + pv.x * la + (Math.random() - 0.5) * 0.6, z = P.pos.z + pv.z * la + (Math.random() - 0.5) * 0.6, [cx, cz] = A.arenaClamp(C, x, z), e = A.disc(C, cx, cz, 1.0, 0xffa040, 9, 0.2); s.fx.push(e); s.drops.push({ x: cx, z: cz, at: s.t + 0.6, e }); s.i++; if (s.i === 1) { fo.f.play('Spell_Simple_Shoot', { once: true, fade: 0.04, restart: true }); A.cue(fo, 'cast'); } }
        for (const r of s.drops) { if (r.done) continue; if (r.e) r.e.m.material.opacity = 0.15 + 0.3 * Math.max(0, 1 - (r.at - s.t) / 0.6); if (s.t >= r.at) { r.done = 1; A.spark({ x: r.x, y: Hy(C, r.x, r.z) + 0.3, z: r.z }, 10); if (Math.hypot(P.pos.x - r.x, P.pos.z - r.z) < 1.0 && !dodging()) C.hitPlayer(fo, s.dmg, { ang: 0, thrust: true, unblock: true }); if (r.e) { A.kill(r.e); r.e = null; } } }
        if (s.i >= 5 && s.drops.every(r => r.done)) { s.fx = []; A.fin(fo, 0.8, 0.4); return null; } return { turnTo: face, spd: 0 }; }
    },
    bloodpact: {
      can: (fo, d) => mine(fo, 'bloodpact') && !(fo.bp > 0) && fo.hp > fo.maxHp * 0.35 && d > 2.5 ? 2 : 0,
      start(fo, d, P, C, face, A) { first(fo, 'bloodpact', C, A); fo.sk = { k: 'bloodpact', t: 0, hp0: fo.hp, fx: [A.ringM(C, fo.pos.x, fo.pos.z, 0.5, 0.9, 0xc00010, 0.45)] }; fo.hp = Math.max(fo.maxHp * 0.3, fo.hp - fo.maxHp * 0.07); fo.f.play('Idle_Shield_Loop', { fade: 0.1 }); A.cue(fo, 'rage'); },
      run(fo, dt, d, face, dx, dz, P, C, A) { const s = fo.sk, e = s.fx[0]; if (e) { e.m.position.set(fo.pos.x, Hy(C, fo.pos.x, fo.pos.z) + 0.08, fo.pos.z); e.m.scale.setScalar(1 + s.t * 0.8); }
        if (fo.hp < s.hp0 - fo.maxHp * 0.13) { A.fin(fo, 1.0, 1.1); toast(C, '💥 血契被你打断了！', '#ffe070', 1.2); return null; }
        if (s.t < 1.0) return { turnTo: face, spd: 0 };
        fo.bp = 3; toast(C, '🩸 血契完成：她接下来 3 刀红光不可格挡', '#ff8a7a', 1.4); A.fin(fo, 0.3, 0); return null; }
    }
  };
  // ---- 每帧：区域效果 / 血契加持 / 霜域加速 / 清理 ----
  function frame(dt) {
    if (!on()) return; const W = window.Worlds && Worlds.active ? Worlds._W : null, C = window.Foe && Foe.ctx && Foe.ctx(), t = now();
    for (let i = OWN.length - 1; i >= 0; i--) { const o = OWN[i], sk = o.fo && o.fo.sk; if (!W || !C || o.sc !== C.sc || (o.fo && (o.fo.dead || !sk || (sk.m !== o.m && sk.seg !== o.m)))) delObj(o.m); }
    let slow = false;
    for (let i = ZONES.length - 1; i >= 0; i--) { const z = ZONES[i]; if (!W || !C || z.sc !== C.sc || t > z.until) { try { if (z.kill) z.kill(z.fx); } catch (e) { } ZONES.splice(i, 1); continue; }
      if (z.fx && z.fx.m) z.fx.m.material.opacity = 0.22 + 0.1 * Math.sin(t * 6); if (W && Math.hypot(W.pos.x - z.x, W.pos.z - z.z) < z.r) slow = true; }
    if (slow) slowUntil = t + 0.15;
    const a = Math.max(veil > t ? Math.min(0.85, (veil - t) * 0.6) : 0, slowUntil > t ? 0.35 : 0); overlay(a, veil > t ? 'rgba(70,70,74,.95)' : 'rgba(120,200,255,.55)');
    if (W && window.Foe && Foe.foes) for (const fo of Foe.foes) { if (fo.dead) continue; const A = fo.atk;
      if (A && fo.bp > 0 && !A._bp) { A._bp = 1; fo.bp--; for (const h of A.hits) { h.unblock = true; h.heavy = true; } A.hold = Math.max(0, A.hold) + 0.1; A.dmg = Math.round(A.dmg * 1.25); try { CombatFX && CombatFX.roleCue(fo, 'backstab'); } catch (e) { } }
      if (A && fo.frostHaste > t && !A._fh) { A._fh = 1; A.ws = Math.min(1.2, A.ws * 1.3); A.hold = Math.max(0, A.hold - 0.12); } }
  }
  let wired = false;
  function wire() {
    if (wired || !window.FoeAI2 || !FoeAI2.reg || !window.G || !G.HOOK) return false; wired = true;
    for (const k in DEF) FoeAI2.reg(k, DEF[k]);
    G.HOOK.world = G.HOOK.world || []; G.HOOK.world.push(frame);
    if (window.FoeRoles3 && FoeRoles3.moveK && !FoeRoles3.moveK.__s73) { const m0 = FoeRoles3.moveK; FoeRoles3.moveK = function () { const b = m0.apply(this, arguments); return on() && slowUntil > now() ? b * 0.5 : b; }; FoeRoles3.moveK.__s73 = 1; }
    return true;
  }
  if (!wire()) { const iv = setInterval(() => { if (wire()) clearInterval(iv); }, 400); }
  return { on, SK, kit, DEF, ZONES };
})();
