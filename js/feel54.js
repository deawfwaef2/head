// R54 两个战斗 MOD（默认开）
// hit_react：受击时按刀的来向程序化“挨打”——上身被打得后仰/侧歪/扭转，头被带偏，再弹簧回正（叠加在任何动作上，轻击小、重击大，霸主减半）。
// foe_read ：敌人会读你的出刀——你空挥落空时附近的敌人立刻抢攻；你蓄力重斩时聪明的敌人后撤/侧闪；你被打出硬直时会被围上来补刀。
window.Feel54 = (() => {
  const onR = () => !window.Mods || Mods.on('hit_react') !== false;
  const onA = () => !window.Mods || Mods.on('foe_read') !== false;
  const V3 = THREE.Vector3, Qt = THREE.Quaternion;
  const CH = [['hips', 0.12], ['spine', 0.24], ['chest', 0.24], ['upperChest', 0.16], ['neck', 0.12], ['head', 0.12]];
  const _ax = new V3(), _q = new Qt(), _wq = new Qt(), _pq = new Qt(), _F = new V3(), _L = new V3(), _U = new V3(0, 1, 0);
  function st(fo) { return fo.hr || (fo.hr = { p: 0, r: 0, y: 0, vp: 0, vr: 0, vy: 0, set: null, orig: null }); }
  // 受击冲量：p=后仰（远离玩家），r=侧倾，y=扭转
  function impulse(fo, d) {
    if (!onR() || !fo || !fo.f) return; const S = st(fo), CS = window.Combat && Combat.state, sw = CS && CS.sw;
    let k = d && (d.charged || d.crit) ? 1 : d && d.brk ? 0.8 : 0.55; if (d && d.skill) k *= 0.8; if (fo.boss) k *= 0.5;
    const dx = sw ? sw.dx : (Math.random() - 0.5), dy = sw ? sw.dy : -0.3, z = d && d.zone;
    S.vp += k * (z === 'head' || z === 'neck' ? 11 : 8) * (0.8 + Math.random() * 0.4);
    S.vr += -dx * k * 9; S.vy += dx * k * 7 + (Math.random() - 0.5) * 3; if (dy < -0.5) S.vp += k * 3;
  }
  function post(fo, dt) {
    if (!onR() || !fo.hr) return; const S = fo.hr, B = fo.f && fo.f.bones; if (!B) return;
    const bones = CH.map(c => B[c[0]]).filter(Boolean); if (!bones.length) return;
    if (S.set) for (let i = 0; i < bones.length; i++) if (S.set[i] && bones[i].quaternion.equals(S.set[i])) bones[i].quaternion.copy(S.orig[i]); // mixer 不写的骨头先还原
    const w = 15, z = 0.45, step = (x, v) => { const a = -w * w * x - 2 * z * w * v; v += a * dt; x += v * dt; return [x, v]; };
    [S.p, S.vp] = step(S.p, S.vp); [S.r, S.vr] = step(S.r, S.vr); [S.y, S.vy] = step(S.y, S.vy);
    S.p = Math.max(-0.2, Math.min(0.75, S.p)); S.r = Math.max(-0.6, Math.min(0.6, S.r)); S.y = Math.max(-0.6, Math.min(0.6, S.y));
    if (Math.abs(S.p) + Math.abs(S.r) + Math.abs(S.y) + Math.abs(S.vp) + Math.abs(S.vr) + Math.abs(S.vy) < 0.004 || fo.dead) { S.set = null; if (fo.dead) fo.hr = null; return; }
    _F.set(Math.sin(fo.yaw), 0, Math.cos(fo.yaw)); _L.set(Math.cos(fo.yaw), 0, -Math.sin(fo.yaw));
    const orig = bones.map(b => b.quaternion.clone());
    for (let i = 0; i < bones.length; i++) { const b = bones[i], f = CH.find(c => B[c[0]] === b)[1];
      // 世界空间增量：绕左轴后仰、绕前轴侧倾、绕竖轴扭转
      _q.setFromAxisAngle(_L, -S.p * f); _wq.setFromAxisAngle(_F, S.r * f); _q.multiply(_wq); _wq.setFromAxisAngle(_U, S.y * f); _q.multiply(_wq);
      b.getWorldQuaternion(_wq); _wq.premultiply(_q); b.parent.getWorldQuaternion(_pq); b.quaternion.copy(_pq.invert().multiply(_wq)); b.updateMatrixWorld(true); }
    S.orig = orig; S.set = bones.map(b => b.quaternion.clone());
  }
  // ---------- foe_read ----------
  function near(maxD, pred) { const W = window.Worlds && Worlds._W; if (!W || !window.Foe) return []; const out = []; for (const fo of Foe.foes) { if (fo.dead || !fo.seen || fo.state !== 'chase') continue; const d = Math.hypot(fo.pos.x - W.pos.x, fo.pos.z - W.pos.z); if (d < maxD && (!pred || pred(fo, d))) out.push([fo, d]); } return out.sort((a, b) => a[1] - b[1]); }
  function whiff() { if (!onA()) return; const c = near(3.4, fo => !fo.atk && !(fo.stag > 0) && fo.iq > 0.45)[0]; if (!c) return; const fo = c[0]; if (Math.random() < 0.35 + fo.iq * 0.4) { fo.cd = Math.min(fo.cd, 0.04); fo.punish = performance.now(); } }
  let lastHeavy = 0, dodge = new Map();
  function frame(dt) {
    if (!onA() || !window.Combat) return; const a = Combat.state && Combat.state.aim, now = performance.now(), W = window.Worlds && Worlds._W; if (!W) return;
    if (a && (a.heavy || a.k > 0.7) && now - lastHeavy > 900) { lastHeavy = now;
      for (const [fo, d] of near(3.2, f => !f.atk && f.iq > 0.6 && !(f.stag > 0))) { if (Math.random() < (a.heavy ? 0.55 : 0.3) * fo.iq) { const dx = fo.pos.x - W.pos.x, dz = fo.pos.z - W.pos.z, dd = Math.hypot(dx, dz) || 1, sd = Math.random() < 0.5 ? 1 : -1;
        dodge.set(fo, { t: 0.38, x: (dx / dd * 0.7 + dz / dd * 0.7 * sd) * 4.2, z: (dz / dd * 0.7 - dx / dd * 0.7 * sd) * 4.2 }); try { Foe.ctx().say(fo.anchor, ['看穿了！', '太慢了。', '想蓄力？'][Math.floor(Math.random() * 3)], '#cfe0ff'); } catch (e) { } } } }
    for (const [fo, s] of dodge) { if (fo.dead || (s.t -= dt) <= 0) { dodge.delete(fo); continue; } fo.rv = { x: s.x, z: s.z }; }
  }
  function event(t, fo, d) { if (t === 'hit' && fo && !fo.dead) impulse(fo, d); else if ((t === 'kill' || t === 'decap') && fo) impulse(fo, Object.assign({}, d, { charged: true })); }
  // 包一层 CombatFX.whiff：空挥 = 敌人抢攻的时机
  function hook() { if (window.CombatFX && CombatFX.whiff && !CombatFX.whiff.__f54) { const w0 = CombatFX.whiff; CombatFX.whiff = function () { try { whiff(); } catch (e) { } return w0.apply(this, arguments); }; CombatFX.whiff.__f54 = 1; } }
  hook(); setTimeout(hook, 3000);
  return { post, event, frame, impulse };
})();
