// trial(kind, opts): 返回 {ttk, hits, dmgOut, dmgIn, alive}
async function trial(kind, o) {
  o = o || {}; H.log = []; H.dmgIn = 0; H.dmgOut = 0; H.hits = 0; H.kills = 0; H.stop = false; window.__vt = 0;
  H.ttk = null; if (window.G) { G.player.pos.set(0,0,0); G.player.yaw = 0; G.player.pitch = 0; G.S.hp = 200; const C = Combat.state; C.lmb = C.rmb = false; C.sw = null; C.thrust = 0; C.thrustQ = 0; C.charge = 0; C.charged = 0; C.stam = 100; C.hitCd.clear(); if (window.Stamina && Stamina.ex !== undefined) { try { Stamina.reset && Stamina.reset(); } catch (e) {} } }
  const info = await setup(Object.assign({}, o));
  let t0 = 0, phase = 0, nextT = 0, swings = 0; const f0 = Foe.foes[0];
  const bot = (t, dt) => {
    const f = aim(o.zy); if (f && o.walk) approach(o.stand || 1.5, dt);
    if (Foe.foes.every(f => f.dead)) { H.stop = true; H.ttk = t; return; }
    if (kind === 'click') { // 连点：按下 70ms 松开，间隔 0.38s
      if (phase === 0 && t >= nextT) { Combat.onDown(0); phase = 1; nextT = t + 0.07; swings++; }
      else if (phase === 1 && t >= nextT) { Combat.onUp(0); phase = 0; nextT = t + 0.3; } }
    else if (kind === 'flick') { // 按住 → 向右微动 → 松开
      if (phase === 0 && t >= nextT) { Combat.onDown(0); phase = 1; nextT = t + 0.18; swings++; }
      else if (phase === 1) { mouse(1.2, 0); if (t >= nextT) { Combat.onUp(0); phase = 0; nextT = t + 0.45; } } }
    else if (kind === 'hold') { // 按住不动 0.35s 松开
      if (phase === 0 && t >= nextT) { Combat.onDown(0); phase = 1; nextT = t + 0.35; swings++; }
      else if (phase === 1 && t >= nextT) { Combat.onUp(0); phase = 0; nextT = t + 0.4; } }
    else if (kind === 'wave') { // 按住左键左右大幅晃鼠标（老玩法）
      if (phase === 0) { Combat.onDown(0); phase = 1; }
      const w = Math.sin(t * 9); mouse(w * 26, 0); }
  };
  run(o.sec || 40, bot);
  return { kind, foes: info.foes.map(f => f.role + ':' + f.hp), ttk: H.ttk || null, swings, hits: H.hits, dmgOut: H.dmgOut, dmgIn: Math.round(H.dmgIn), st: status(), ev: H.log.filter(x => x !== 'hit').slice(0, 12).join(','), stam: Math.round(Combat.state.stam) };
}
