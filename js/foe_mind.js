// 第三十七轮 R37：敌人“读你”——用户：“战斗太简单了，AI 很弱智、逻辑单一，不需要技巧”
// 新文件，不改 foe.js / foe_ai2.js 的逻辑：启动时把 FoeAI2 的 update / tune / after / tick 包一层（foe.js 是运行时读 window.FoeAI2.xxx 的）。MOD `foe_mind`（默认开，关掉 = R36 的敌人）。
// 1) 习惯记忆（全局、会衰减）：你常举盾？（guard）/ 常在够不着时乱挥？（spam）/ 常绕圈？（circle，带方向）/ 吃招后常后撤？（retreat）
// 2) 每个敌人一种“性格”（耐心型 / 突进型 / 诈术型 / 反击型）——同一批敌人节奏不再一致，不能靠背“前摇 → 弹反”一把过。
// 3) 每一刀的出手节奏是 6 选 1：快刀（前摇短、只给 ~0.45s）/ 常规 / 拖刀（多停一拍）/ 假动作再快刀（先收刀、再立刻出真刀）/ 破防刀（红光、格挡无效）/ 读盾后的补刀。
// 4) 读你的反应接连招：你举盾 → 下一刀是红光破防；你后撤 → 突进刀追；你侧闪 → 立刻快刀；你站着挨 → 可能拉开距离再来。
// 5) 走位：反击型在你乱挥时后撤到够不着再反击（“引你空挥”）；诈术型打完后撤；突进型在你绕圈时横向预判。后撤/预判都有预算，不会一直躲。
// 所有新招都有预警（站定蓄力 / 红光），都不改伤害数值（伤害走 FoeAbs）。
window.FoeMind = (() => {
  'use strict';
  const on = () => !window.Mods || !Mods.on || Mods.on('foe_mind') !== false;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const H = { guard: 0.3, spam: 0.2, circle: 0, retreat: 0.3, hurt: 0.3, n: 0 };
  let CLK = 0;
  const FOES = () => (window.Foe && Foe.foes) || [];
  const cue = (fo, k) => { try { window.CombatFX && CombatFX.roleCue(fo, k); } catch (e) { } };

  function mindOf(fo) {
    if (fo.mind) return fo.mind;
    const r = Math.random, st = ['pat', 'rush', 'tri', 'cnt'], m = {}; const dom = st[Math.floor(r() * 4)];
    st.forEach(k => m[k] = k === dom ? 0.75 + r() * 0.25 : r() * 0.35); m.dom = dom;
    if (fo.role === 'skirm' || fo.role === 'duelist') { m.tri = Math.max(m.tri, 0.7); m.cnt = Math.max(m.cnt, 0.5); }
    if (fo.boss) { for (const k of st) m[k] = Math.max(m[k], 0.6); }
    m.backBudget = 1.2; m.depth = 0; m.lastAtk = -9;
    return (fo.mind = m);
  }
  const iqOf = fo => clamp(fo.iq == null ? 0.5 : fo.iq, 0, 1.2);

  // ---------- 习惯采样 ----------
  function sample(dt, ctx) {
    const P = ctx && ctx.player, pv = ctx && ctx.pvel, S = window.Combat && Combat.state; if (!P || !pv || !S) return;
    let near = null, nd = 1e9;
    for (const fo of FOES()) { if (fo.dead || fo.escaped || !fo.seen) continue; const d = Math.hypot(P.pos.x - fo.pos.x, P.pos.z - fo.pos.z); if (d < nd) { nd = d; near = fo; } }
    if (near && nd < 9) {
      const ux = (near.pos.x - P.pos.x) / Math.max(0.1, nd), uz = (near.pos.z - P.pos.z) / Math.max(0.1, nd);
      const lat = pv.x * -uz + pv.z * ux; const sp = Math.hypot(pv.x, pv.z);
      if (nd < 7 && sp > 1.0) H.circle += (clamp(lat / 3, -1, 1) - H.circle) * Math.min(1, dt * 0.25);
      if (nd > 2.4 && nd < 4.2) { const sw = ctx.playerSwinging ? ctx.playerSwinging() : false; H.spam += ((sw ? 1 : 0) - H.spam) * Math.min(1, dt * 0.3); }
    }
    for (const fo of FOES()) { // 命中前一瞬：读你在干什么
      const A = fo.atk; if (fo.dead || !A || A.ranged || A._rd) continue; const h = A.hits && A.hits[A.hi]; if (!h || !A.act) continue;
      if (h.t - A.act.time < 0.22) {
        A._rd = 1; const dx = fo.pos.x - P.pos.x, dz = fo.pos.z - P.pos.z, d = Math.max(0.1, Math.hypot(dx, dz)), ux = dx / d, uz = dz / d;
        const rad = pv.x * ux + pv.z * uz, lat = pv.x * -uz + pv.z * ux, g = !!S.rmb;
        fo.rd = { guard: g, back: rad < -1.0, dodge: Math.abs(lat) > 2.0, lat };
        H.guard += ((g ? 1 : 0) - H.guard) * 0.25; H.retreat += ((rad < -1.0 ? 1 : 0) - H.retreat) * 0.2; H.n++;
      }
    }
  }

  // ---------- 每一刀的节奏 ----------
  function pick(w) { let s = 0; for (const k in w) s += w[k]; let r = Math.random() * s; for (const k in w) { r -= w[k]; if (r <= 0) return k; } return 'normal'; }
  function mindTune(fo, A, d) {
    if (!on() || !A || A.ranged) return;
    const m = mindOf(fo), iq = iqOf(fo), tier = fo.tier || 0;
    const w = { quick: 0.8 + 0.6 * m.rush + 0.5 * tier, normal: 1.8, delayed: 0.6 + 1.2 * m.pat, bait: iq > 0.45 ? 0.3 + 1.5 * m.tri : 0, brk: 0 };
    if (H.guard > 0.45 && iq > 0.35) w.brk = (H.guard - 0.35) * 4.5 * (0.4 + 0.6 * clamp(iq, 0, 1));
    if (H.guard < 0.22) { w.quick += 1.1; w.delayed *= 0.6; }
    if (fo.rdNext) { const t = fo.rdNext; fo.rdNext = null; if (t === 'brk') { w.brk += 8; } else if (t === 'quick') { w.quick += 6; } }
    if (fo.mFollow) { w.quick += 9; w.bait = 0; w.brk = 0; fo.mFollow = false; } // 假动作之后的真刀：只要快
    const k = pick(w); A.mk = k; const hit0 = A.hits && A.hits[0];
    if (k === 'quick') { A.hold = 0; A.ws = Math.min(0.95, Math.max(A.ws, 0.78)); A.feint = false; }
    else if (k === 'delayed') { A.hold += 0.3 + Math.random() * 0.4; A.feint = false; }
    else if (k === 'bait') { A.hold = Math.max(A.hold, 0.3 + Math.random() * 0.3); A.feint = true; fo.mFollow = true; }
    else if (k === 'brk') { for (const h of A.hits) { h.unblock = true; h.heavy = true; } A.hold = Math.max(A.hold, 0.22); A.reach += 0.3; A.feint = false; cue(fo, 'backstab'); }
    if (k !== 'bait') fo.mFollow = false;
    m.lastAtk = CLK;
  }

  // 假动作取消后 foe.js 会置 fo.cd=0.35、atk=null；这里在 tick 里立刻补真刀
  // ---------- 收招后：读你的反应接连招 ----------
  function mindAfter(fo) {
    if (!on() || fo.dead) return; const m = mindOf(fo), iq = iqOf(fo), tier = fo.tier || 0, rd = fo.rd; fo.rd = null; if (iq > 0.5 && !fo.boss) fo.cd *= 0.9 - 0.2 * m.rush; /* 压迫感：聪明的敌人收招更短 */ if (!rd) return;
    if (CLK - m.lastAtk > 4) m.depth = 0;
    if (m.depth >= 2 || iq < 0.35) { m.depth = 0; return; }
    const p = clamp(0.25 + 0.35 * iq + 0.25 * tier + (fo.boss ? 0.15 : 0), 0, 0.85);
    if (Math.random() > p) { if (Math.random() < 0.3 * (m.tri + m.cnt) && fo.armed) fo.kiteT = 0.5 + Math.random() * 0.45; return; }
    m.depth++;
    if (rd.guard) fo.mnext = { clip: fo.armed ? 'Sword_Attack' : 'Melee_Hook', brk: true, wait: 0.14 + Math.random() * 0.25 };
    else if (rd.back) fo.mnext = { clip: fo.armed ? 'Sword_Dash' : 'Punch_Cross', wait: 0.05, gap: true };
    else if (rd.dodge) fo.mnext = { clip: null, quick: true, wait: 0.05 };
    else if (Math.random() < 0.5) fo.mnext = { clip: null, wait: 0.35 + Math.random() * 0.4 };
    else fo.kiteT = 0.5 + Math.random() * 0.5;
    if (fo.mnext) fo.mnext.ttl = 1.6;
  }

  // ---------- 走位 / 执行排队的招 ----------
  function mindTick(fo, dt, d, face, dx, dz, P, ctx) {
    if (!on() || fo.dead || fo.stag > 0 || fo.atk || fo.sk) return null;
    const m = mindOf(fo), iq = iqOf(fo), F = window.Foe, ux = dx / Math.max(0.1, d), uz = dz / Math.max(0.1, d);
    m.backBudget = Math.min(1.4, m.backBudget + dt * 0.45);
    const tok = () => F.tokenOK && F.tokenOK(fo);
    // 假动作后的真刀
    if (fo.mFollow) { if (fo.cd <= 0.14 && d < 3.0 && tok()) { fo.punish = true; F.attack(fo, d); return { turnTo: face, spd: 0 }; } if (fo.cd < -0.6) fo.mFollow = false; }
    // 排队的连招
    const q = fo.mnext;
    if (q) { q.ttl -= dt; if (q.ttl <= 0 || d > 5.2) fo.mnext = null;
      else if (fo.cd <= q.wait && tok() && (d < 3.2 || q.gap)) { fo.mnext = null; if (q.quick) fo.rdNext = 'quick'; if (q.brk) fo.rdNext = 'brk'; F.attack(fo, d, q.clip || undefined); return { turnTo: face, spd: 0 }; } }
    // 打完后拉开（打了就跑）
    if (fo.kiteT > 0) { fo.kiteT -= dt; if (d < 4.6) { fo.rv = { x: -ux * 2.7, z: -uz * 2.7 }; return { turnTo: face, spd: 0 }; } }
    // 反击型：你在够不着的距离乱挥 → 后撤到够不着，等你收刀（foe_ai2 的“挥空反击”会接上）
    const sw = ctx.playerSwinging ? ctx.playerSwinging() : false;
    if (sw && d < 3.0 && d > 1.2 && m.cnt > 0.3 && iq > 0.5 && m.backBudget > 0 && fo.state === 'chase' && (H.spam > 0.35 || m.cnt > 0.7)) {
      m.backBudget -= dt; fo.rv = { x: -ux * 3.4, z: -uz * 3.4 }; return { turnTo: face, spd: 0 };
    }
    // 突进型：你总往一个方向绕 → 横向预判（抄你的前路）
    if (Math.abs(H.circle) > 0.45 && d > 2.4 && d < 6.5 && m.rush > 0.45 && iq > 0.55 && fo.cd > 0.3) {
      const s = H.circle > 0 ? 1 : -1; fo.rv = { x: -uz * s * 2.2, z: ux * s * 2.2 }; return { turnTo: face, spd: 1.6 };
    }
    return null;
  }

  // ---------- 包装 FoeAI2 ----------
  function install() {
    const A2 = window.FoeAI2; if (!A2 || A2.__mind) return false; A2.__mind = true;
    const o = { update: A2.update, tune: A2.tune, after: A2.after, tick: A2.tick, clear: A2.clear };
    A2.update = function (dt, ctx) { CLK += dt; o.update.apply(this, arguments); try { if (on()) sample(dt, ctx); } catch (e) { console.warn('FoeMind.update', e); } };
    A2.tune = function (fo, A, d) { o.tune.apply(this, arguments); try { mindTune(fo, A, d); } catch (e) { console.warn('FoeMind.tune', e); } };
    A2.after = function (fo) { o.after.apply(this, arguments); try { mindAfter(fo); } catch (e) { console.warn('FoeMind.after', e); } };
    A2.tick = function (fo, dt, d, face, dx, dz, P, ctx) { let r = null; try { r = mindTick(fo, dt, d, face, dx, dz, P, ctx); } catch (e) { console.warn('FoeMind.tick', e); } return r || o.tick.apply(this, arguments); };
    A2.clear = function () { H.guard = 0.3; H.spam = 0.2; H.circle = 0; H.retreat = 0.3; H.n = 0; return o.clear.apply(this, arguments); };
    return true;
  }
  install();
  return { install, _H: H, mindOf };
})();
