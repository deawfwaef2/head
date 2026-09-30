// 第二十五轮：统一体力系统（MOD `stamina_all`，默认开）——攻击 / 防御 / 移动 / 奔跑 / 跳跃 / 闪避 全部吃同一条体力。
// 体力池 = Combat.state.stam（0~100，沿用原来的池子，不另建一份）。耗尽 → 「力竭」：
//   挥砍 / 刺击 / 格挡 / 奔跑 / 跳跃 / 闪身 / 战吼 / 旋风斩 全部失效，只能拖着脚步慢走（1.5 m/s），刀垂下、屏幕发暗发红、喘息声，
//   歇 ≥0.8 秒后才开始恢复，恢复到 30 才解除。敌人也就趁机围上来了。
// API：Stamina.on / .ex / .val() / .spend(n, kind) → 够不够（够则扣）/ .tick(dt, o) / .speed(base, run) / .canJump()
window.Stamina = (() => {
  const COST = { swing: 11, charged: 18, thrust: 9, jump: 13, dodge: 22 };
  const R = { ex: false, last: -9, exAt: 0, hint: 0, pulse: 0, _on: null };
  const GG = () => window.G || window.__game || {};
  const CS = () => window.Combat && Combat.state;
  const modOn = () => !window.Mods || Mods.on('stamina_all') !== false;
  let fx = null, fxO = -1;
  function el() {
    if (fx) return fx; fx = document.createElement('div'); fx.id = 'stamFx';
    fx.style.cssText = 'position:fixed;inset:0;z-index:18;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 35%,rgba(90,10,10,.55) 75%,rgba(20,0,0,.85) 100%)';
    const t = document.createElement('div'); t.id = 'stamTxt'; t.style.cssText = 'position:absolute;left:50%;bottom:22%;transform:translateX(-50%);font:700 15px/1.4 system-ui,sans-serif;color:#ffb8a0;text-shadow:0 0 8px #000;letter-spacing:.2em;opacity:.0;transition:opacity .2s';
    t.textContent = '力 竭'; fx.appendChild(t); document.body.appendChild(fx); return fx;
  }
  const val = () => { const s = CS(); return s ? s.stam : 100; };
  const set = v => { const s = CS(); if (s) s.stam = Math.max(0, Math.min(100, v)); };
  function exhaust() {
    if (R.ex) return; R.ex = true; R.exAt = performance.now() / 1000; set(0); const g = GG();
    if (window.CombatFX && CombatFX.stamina) CombatFX.stamina();
    g.toast && g.toast('😮‍💨 力竭——攻击 / 格挡 / 奔跑 / 闪身全都做不了，先喘口气！', '#ffb8a0', 2.2);
    const W = window.Worlds && Worlds._W; if (W) W.shake = Math.max(W.shake || 0, 0.25);
  }
  function cue(msg) { const now = performance.now() / 1000; if (now - R.hint < 0.9) return; R.hint = now; const g = GG(); g.toast && g.toast(msg, '#ff9a7a', 0.8); if (window.CombatFX && CombatFX.stamina && R.ex) CombatFX.stamina(); }
  // 花体力做一件事：够（≥ 需要的 30%）就做，并扣到 0 为止（最后一下允许，然后力竭）；不够就失败
  function spend(n, kind) {
    if (!modOn()) return true; if (typeof n === 'string') { kind = n; n = COST[n] || 10; }
    if (R.ex) { cue('没力气了……'); return false; }
    const v = val(); if (v < n * 0.3) { exhaust(); return false; }
    set(v - n); R.last = performance.now() / 1000; if (val() <= 0.01) exhaust(); return true;
  }
  function drain(x) { if (!modOn() || R.ex) return; const v = val() - x; R.last = performance.now() / 1000; set(v); if (v <= 0) exhaust(); }
  function canJump() { return !modOn() || spend(COST.jump, 'jump'); }
  // 每帧：o = { moving, run, crouch, alert }；返回这一帧的移动速度
  function tick(dt, o) {
    o = o || {}; const now = performance.now() / 1000, s = CS(); R._on = modOn(); if (!R._on || !s) return null;
    const guarding = !!(s.rmb && window.Combat && Combat.drawn);
    if (!R.ex && s.stam <= 0.01) exhaust(); // 被重击等外部扣光体力
    if (o.run && !R.ex && o.moving) drain(15 * dt);                 // 奔跑
    if (guarding && !R.ex) drain(5 * dt);                           // 举着格挡也累
    if (o.moving && o.alert && !o.run && !R.ex) drain(0.9 * dt);   // 战斗中走位也慢慢耗
    const MMx = !window.Mods || Mods.on('combat_master') !== false; // R26：大师战斗——喘息更快
    const rest = now - R.last > (R.ex ? (MMx ? 0.6 : 0.8) : (MMx ? 0.3 : 0.45)) && !guarding && !(o.run && o.moving);
    if (rest) { const rate = MMx ? (R.ex ? 22 : o.moving ? (o.alert ? 16 : 24) : 38) : (R.ex ? 15 : o.moving ? (o.alert ? 9 : 17) : 28); set(val() + rate * dt); }
    if (R.ex && val() >= (MMx ? 22 : 30)) { R.ex = false; const g = GG(); g.toast && g.toast('缓过来了', '#cfe8c0', 0.9); }
    // 屏幕反馈
    const low = val() < 20 ? (20 - val()) / 20 : 0, tgt = R.ex ? 0.75 + Math.sin(now * 5) * 0.12 : low * 0.35;
    if (tgt > 0.01 || fxO > 0.01) { R.pulse += (tgt - R.pulse) * Math.min(1, dt * 6); const e = el(), v = Math.round(R.pulse * 100) / 100; if (v !== fxO) { fxO = v; e.style.opacity = v; e.firstChild.style.opacity = R.ex ? 1 : 0; } }
    return R.ex ? 1.5 : null;
  }
  return { tick, spend, drain, canJump, val, COST, get ex() { return R.ex && modOn(); }, get on() { return modOn(); }, reset() { R.ex = false; } };
})();
