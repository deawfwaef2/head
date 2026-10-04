// R73 战斗深度（三个 MOD，默认开）。用户：「无限后撤 + 格挡，完美格挡直接秒杀宿敌和强敌；敌人技能弱、少」。
//  · poise73    强敌（BOSS / 宿敌 / 猎手 / 精英）头顶有「架势」。完美格挡 / 完美闪避 / 蓄力破防 / 砍脖子只削架势（约 3 次完美格挡削空），
//               削空才露出真正的破绽（2.4 秒：伤害翻倍、按 E 处决 = 22% 重创，血量 ≤25% 才能斩首）。2.5 秒没被削就回复。
//               技能落空的「破绽」对强敌只剩 0.6 秒（以前 1~1.6 秒 + 伤害翻倍 = 白捡）。
//  · parry_adapt 敌人记住你的格挡：被弹过以后改用 延迟出刀 / 假动作 / 红光不可格挡 / 连段；6 秒内完美格挡 3 次以上，判定窗口逐次收窄。
//  · guard_cost 硬挡有代价：强敌的刀挡住也掉血（22%），1.6 秒内连挡 3 下格挡被压垮（体力清零）。
// 另：R73 事件总线 window.R73（worlds.js foeEvent 转发），给 r73_*.js 其它模块订阅。
window.R73 = window.R73 || (() => {
  const L = [];
  // 雾色叠加器：多个 R73 模块（使徒布局 / 血月 / 宿敌猎场 / 天气）各自登记一层染色，按登记顺序叠加，撤掉某层时从原始雾色重新计算（不会互相覆盖）
  function fogApply(sc) { const u = sc && sc.userData && sc.userData.f73; if (!u || !sc.fog) return; const c = u.c0.clone(); let d = u.d0; for (const k in u.L) { const l = u.L[k]; c.lerp(l.col, l.amt); if (d != null) d *= l.dens; } sc.fog.color.copy(c); if (d != null && sc.fog.density != null) sc.fog.density = d; }
  function fog(sc, key, col, amt, dens) { if (!sc || !sc.fog || !window.THREE) return; const u = sc.userData.f73 || (sc.userData.f73 = { c0: sc.fog.color.clone(), d0: sc.fog.density, L: {} }); u.L[key] = { col: new THREE.Color(col), amt: amt == null ? 0.35 : amt, dens: dens || 1 }; fogApply(sc); }
  function fogClear(sc, key) { const u = sc && sc.userData && sc.userData.f73; if (!u || !u.L[key]) return; delete u.L[key]; fogApply(sc); }
  function sortSide(el) { const L = [...el.querySelectorAll(':scope > section[data-ord]')].sort((a, b) => a.dataset.ord - b.dataset.ord); for (const s of L) el.appendChild(s); } // 选地点右侧面板：R73 各模块插入的分节按固定顺序排列
  return { on(fn) { if (typeof fn === 'function') L.push(fn); }, emit(t, fo, d) { for (const f of L) { try { f(t, fo, d); } catch (e) { console.warn('R73 bus', t, e); } } }, fog, fogClear, sortSide };
})();
window.C73 = (() => {
  'use strict';
  const M = k => !window.Mods || !Mods.on || Mods.on(k) !== false;
  const onP = () => M('poise73'), onA = () => M('parry_adapt'), onG = () => M('guard_cost');
  const now = () => performance.now() / 1000;
  const pk = a => a[Math.floor(Math.random() * a.length) % a.length];
  const strong = fo => !!(fo && (window.Foe && Foe.STRONG ? Foe.STRONG(fo) : (fo.boss || fo.hunter || fo.hunter2 || fo.eliteId || fo.nemX || fo.nemClone)));
  const toast = (t, c, s) => { try { window.G && G.toast && G.toast(t, c || '#ffe070', s || 1.6); } catch (e) { } };
  const say = (fo, t, c) => { try { Foe.say(fo, t, c); } catch (e) { } };
  const cue = (fo, k) => { try { window.CombatFX && CombatFX.roleCue(fo, k); } catch (e) { } };
  const told = {}; const hint = (k, t) => { if (told[k]) return; told[k] = 1; toast(t, '#ff9a80', 2.6); };

  // ---------------- 架势 ----------------
  const psMax = fo => fo.boss ? 105 : fo.nemClone ? 120 : fo.nemX ? 100 : fo.hunter2 ? 100 : fo.eliteId ? 95 : 85;
  function ensure(fo) { if (fo.psM == null) { fo.psM = psMax(fo); fo.ps = fo.psM; fo.psT = 0; fo.psBroke = 0; } }
  const segs = fo => { ensure(fo); const n = Math.max(1, Math.round(fo.psM / 35)), f = Math.ceil(fo.ps / fo.psM * n - 1e-3); return '◆'.repeat(Math.max(0, f)) + '◇'.repeat(Math.max(0, n - f)); };
  function poiseHit(fo, amt) {
    if (!onP() || !strong(fo) || fo.dead) return false; ensure(fo); if (fo.psBroke) return false;
    fo.ps = Math.max(0, fo.ps - amt); fo.psT = now(); if (fo.ps > 0) return false;
    fo.psBroke = now() + 2.4; fo.atk = null; fo.stag = Math.max(fo.stag || 0, 1.7); fo.broken = Math.max(fo.broken || 0, 2.4);
    try { fo.f.play('Hit_Knockback', { once: true, fade: 0.05, restart: true }); } catch (e) { }
    toast('💥 架势崩溃！真正的破绽——砍脖子，或按 E 处决', '#ffd060', 2.2);
    try { G.flash && G.flash('#ffe8a0', 0.35, 200); SFX.play && SFX.play('bell', 0.7, 1.15); SFX.thud && SFX.thud(1.2); } catch (e) { }
    say(fo, pk(['……架势……乱了……', '不可能——！', '呃啊——！']), '#ffe0a0'); window.R73.emit('poisebreak', fo, {});
    return true;
  }

  // ---------------- 记住你的格挡 ----------------
  const streak = [];
  const memoOf = fo => fo && fo._pp ? fo._pp * Math.exp(-(now() - (fo._ppT || 0)) / 8) : 0;
  function memo(fo) { const t = now(); fo._pp = memoOf(fo) + 1; fo._ppT = t; streak.push(t); }
  const gStreak = () => { const t = now(); while (streak.length && t - streak[0] > 6) streak.shift(); return streak.length; };
  function parK(fo) { // 完美格挡判定窗口倍率（worlds.js hitPlayer）
    if (!onA()) return 1; let k = 1; const g = gStreak(); if (g >= 3) k *= Math.max(0.55, 1 - 0.12 * (g - 2)); if (memoOf(fo) >= 2.5) k *= 0.82; return k;
  }
  function adapt(fo, A) {
    if (!onA() || !A || !fo || fo.dead || A.ranged || A._mx != null) return; A._mx = '';
    const pp = memoOf(fo), st = strong(fo), tier = fo.tier | 0;
    let p = st ? 0.16 + 0.2 * pp : tier >= 1 ? 0.05 + 0.12 * pp : 0.03 * pp; if (gStreak() >= 3) p += 0.15; p = Math.min(st ? 0.8 : 0.5, p);
    if (Math.random() > p) return;
    const opts = ['delay', 'delay', 'feint', 'red']; if (st || tier >= 2) opts.push('chain', 'red', 'delay');
    const k = pk(opts); A._mx = k;
    if (k === 'delay') A.hold = Math.max(0, A.hold) + 0.32 + Math.random() * 0.32;
    else if (k === 'red') { for (const h of A.hits) { h.unblock = true; h.heavy = true; } A.hold = Math.max(0, A.hold) + 0.12; cue(fo, 'backstab'); hint('red', '⚠ 她看穿了你的格挡：红光一击不能挡——Q 闪身或走位'); }
    else if (k === 'chain') { if (!fo.cq || !fo.cq.length) fo.cq = [A.alias || A.clip]; }
    if (pp >= 1.5 && (fo.sayT || 0) <= 0 && Math.random() < 0.45) say(fo, pk(['同样的招，我不会再上当。', '看穿你了。', '你只会挡吗？', '再挡一次试试。']), '#ffb0a0');
    if (pp >= 1.5) hint('adapt', '🧠 敌人会记住你的格挡：延迟出刀、假动作、红光不可挡——别只会举刀');
  }

  // ---------------- 硬挡代价（worlds.js hitPlayer 对正格挡调用，返回伤害倍率）----------------
  const gq = [];
  function chip(fo, CS) {
    if (!onG()) return 1; const t = now(); gq.push(t); while (gq.length && t - gq[0] > 1.6) gq.shift();
    let k = strong(fo) ? 2.2 : 1;
    if (strong(fo) && CS) CS.stam = Math.max(0, CS.stam - 6);
    if (gq.length >= 3) { gq.length = 0; if (CS) CS.stam = 0; k = Math.max(k, 3); toast('🛡️ 连挡太多，格挡被压垮了！侧移 / 闪身 / 找时机完美格挡', '#ffb060', 1.8); try { SFX.thud && SFX.thud(1); } catch (e) { } window.R73.emit('guardcrush', fo, {}); }
    return k;
  }

  // ---------------- 挂钩 ----------------
  let hooked = false;
  function hook() {
    if (hooked || !window.Foe || !Foe.parried || !window.FoeAI2 || !FoeAI2.tune) return; hooked = true;
    const P0 = Foe.parried;
    Foe.parried = function (fo) {
      try { memo(fo); } catch (e) { }
      if (onP() && strong(fo) && !fo.dead) { ensure(fo); if (fo.psBroke) return P0.apply(this, arguments);
        if (poiseHit(fo, 36)) return;
        fo.atk = null; fo.stag = Math.max(fo.stag || 0, 0.38); fo.broken = 0; try { fo.f.play('Hit_Chest', { once: true, fade: 0.05, restart: true }); } catch (e) { }
        toast(`⚔️ 完美格挡——她的架势 ${segs(fo)}　削空才有真正的破绽`, '#ffe070', 1.3); return; }
      return P0.apply(this, arguments);
    };
    const T0 = FoeAI2.tune; FoeAI2.tune = function (fo, A) { const r = T0.apply(this, arguments); try { adapt(fo, A); } catch (e) { } return r; };
    const E0 = Foe.execute; Foe.execute = function (fo) { const r = E0.apply(this, arguments); try { if (fo && !fo.dead && fo.psBroke) { fo.psBroke = 0; fo.ps = fo.psM; } } catch (e) { } return r; };
    window.R73.on((t, fo, d) => {
      if (!fo || fo.dead || !strong(fo)) return;
      if (t === 'perfectdodge') poiseHit(fo, 24);
      else if (t === 'guardbreak') poiseHit(fo, 26);
      else if (t === 'hit' && d) { if (d.charged) poiseHit(fo, 16); else if (d.zone === 'neck' || d.zone === 'head') poiseHit(fo, 6); }
    });
  }

  // ---------------- 每帧（G.HOOK.world）+ 架势条 ----------------
  let bar = null, barT = 0; const _v = (window.THREE ? new THREE.Vector3() : null);
  function css() {
    if (document.getElementById('c73css')) return; const s = document.createElement('style'); s.id = 'c73css';
    s.textContent = `#c73ps{position:fixed;z-index:31;pointer-events:none;transform:translate(-50%,-100%);text-align:center;font:700 12px/1.2 "Microsoft YaHei UI",sans-serif;color:#ffe9b8;text-shadow:0 1px 3px #000,0 0 6px #000;display:none;white-space:nowrap}
#c73ps .n{font-size:12px;letter-spacing:.08em;color:#f4e2c4}#c73ps .s{font-size:15px;letter-spacing:.18em;color:#ffd060}#c73ps i{display:block;width:110px;height:4px;margin:2px auto 0;background:#000a;border:1px solid #ffd06055}#c73ps i b{display:block;height:100%;background:linear-gradient(90deg,#c08020,#ffe070)}
#c73ps.low .s{color:#ff8a5a}#c73ps.brk .s{color:#fff;animation:c73p .45s infinite alternate}@keyframes c73p{to{color:#ffd060;text-shadow:0 0 12px #ff6a3a}}`;
    document.head.appendChild(s);
  }
  function drawBar() {
    if (!bar) { css(); bar = document.createElement('div'); bar.id = 'c73ps'; document.body.appendChild(bar); }
    const C = Foe.ctx && Foe.ctx(), P = C && C.player && C.player.pos, cam = window.G && G.camera; let best = null, bd = 9;
    if (P && cam && onP()) for (const fo of Foe.foes) { if (fo.dead || !strong(fo) || !fo.seen || !fo.anchor) continue; const d = Math.hypot(fo.pos.x - P.x, fo.pos.z - P.z); if (d < bd) { bd = d; best = fo; } }
    if (!best || !_v) { if (bar.style.display !== 'none') bar.style.display = 'none'; return; }
    ensure(best); _v.copy(best.anchor.pos); _v.y += 0.42; _v.project(cam);
    if (_v.z > 1 || Math.abs(_v.x) > 1.1 || Math.abs(_v.y) > 1.1) { bar.style.display = 'none'; return; }
    const brk = !!best.psBroke, html = brk ? `<div class="s">破 绽 · E 处决</div>` : `<div class="n">架势</div><div class="s">${segs(best)}</div><i><b style="width:${(best.ps / best.psM * 100).toFixed(0)}%"></b></i>`;
    if (bar._h !== html) { bar._h = html; bar.innerHTML = html; } bar.className = brk ? 'brk' : best.ps < best.psM * 0.36 ? 'low' : '';
    bar.style.display = 'block'; bar.style.left = ((_v.x * 0.5 + 0.5) * innerWidth).toFixed(0) + 'px'; bar.style.top = ((-_v.y * 0.5 + 0.5) * innerHeight).toFixed(0) + 'px';
  }
  function frame(dt) {
    hook(); if (!(window.Worlds && Worlds.active) || !window.Foe || !Foe.foes) { if (bar) bar.style.display = 'none'; return; }
    const t = now();
    for (const fo of Foe.foes) {
      if (fo.dead) continue;
      if (onP() && strong(fo)) { ensure(fo);
        if (fo.psBroke && t > fo.psBroke) { fo.psBroke = 0; fo.ps = fo.psM; }
        if (!fo.psBroke && fo.broken > 0.6) fo.broken = 0.6;
        if (!fo.psBroke && fo.ps < fo.psM && t - fo.psT > 2.5) fo.ps = Math.min(fo.psM, fo.ps + fo.psM * 0.15 * dt); }
      const A = fo.atk; if (A && A._mx === 'feint' && !A._fs) { A._fs = 1; A.feint = true; }
    }
    barT += dt; if (barT > 0.033) { barT = 0; try { drawBar(); } catch (e) { } }
  }
  function reg() { if (window.G && G.HOOK) { G.HOOK.world = G.HOOK.world || []; if (!G.HOOK.world.includes(frame)) G.HOOK.world.push(frame); return true; } return false; }
  if (!reg()) { const iv = setInterval(() => { if (reg()) clearInterval(iv); }, 500); }
  return { on: onP, strong, poiseHit, parK, chip, segs, memoOf, gStreak };
})();
