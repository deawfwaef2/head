// 第二十四轮：脚步声 Steps（MOD footsteps，默认开）—— 全合成，无新资源。
//   · 你（食人魔）：沉重的低频“咚”+ 按地面材质叠一层（草沙沙 / 落叶脆响 / 碎石 / 石板回声 / 泥浆噗叽 / 雪地嘎吱），左右脚交替轻微偏移；洞穴 = 石地
//   · 敌人：轻快的女性脚步（跑动更密更响），带方位与距离衰减；盾卫/蛮兵附带甲片叮当；已发现你的刺客无声；每秒最多 ~16 个，远于 16m 不响
window.Steps = (() => {
  'use strict';
  const on = () => !window.Mods || Mods.on('footsteps');
  const SURF = (g) => !g ? 'stone' : /snow/.test(g) ? 'snow' : /mud/.test(g) ? 'mud' : /grass/.test(g) ? 'grass' : /leaves/.test(g) ? 'leaves' : /burn/.test(g) ? 'ash' : /rock|dry/.test(g) ? 'gravel' : 'stone';
  let noiseBuf = null, lr = 1;
  function ac() { const c = window.SFX && SFX.ctx; return c && c.state !== 'closed' && SFX.on !== false ? c : null; }
  function noise(c) { if (noiseBuf) return noiseBuf; const n = c.sampleRate * 0.6 | 0, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return noiseBuf = b; }
  function bus(c, vol, pan) { const g = c.createGain(); g.gain.value = vol; let o = g; if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = Math.max(-0.9, Math.min(0.9, pan)); g.connect(p); o = p; } o.connect((SFX.bus && SFX.bus('steps')) || SFX.out || c.destination); return g; }
  function nz(c, o, t, dur, vol, type, f0, f1, q, att) {
    const s = c.createBufferSource(); s.buffer = noise(c); s.playbackRate.value = 0.8 + Math.random() * 0.4; const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(o); s.start(t, Math.random() * 0.3, dur + 0.05);
  }
  function tn(c, o, t, type, f0, f1, dur, vol, att) {
    const s = c.createOscillator(); s.type = type; s.frequency.setValueAtTime(f0, t); s.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(g); g.connect(o); s.start(t); s.stop(t + dur + 0.02);
  }
  // 地面材质层（k：长度系数；你 1.2，敌人 0.55）
  function layer(c, o, t, surf, k) {
    const r = () => 0.85 + Math.random() * 0.3;
    if (surf === 'grass') { nz(c, o, t, 0.22 * k, 0.22, 'bandpass', 3200 * r(), 1800, 0.8, 0.02); }
    else if (surf === 'leaves') { nz(c, o, t, 0.2 * k, 0.28, 'bandpass', 2600 * r(), 1400, 1.2, 0.006); nz(c, o, t + 0.04, 0.12, 0.14, 'highpass', 4200, 3000, 0.7, 0.004); }
    else if (surf === 'gravel' || surf === 'ash') { for (let i = 0; i < 3; i++) nz(c, o, t + i * 0.025 * Math.random(), 0.07, 0.2, 'bandpass', 1800 * r() + i * 600, 1200, 2, 0.002); nz(c, o, t, 0.16 * k, 0.12, 'lowpass', 1200, 400, 0.7, 0.01); }
    else if (surf === 'mud') { tn(c, o, t + 0.03, 'sine', 180 * r(), 70, 0.14, 0.22, 0.01); nz(c, o, t, 0.2 * k, 0.2, 'lowpass', 900, 250, 2.5, 0.02); }
    else if (surf === 'snow') { for (let i = 0; i < 4; i++) nz(c, o, t + i * 0.03, 0.06, 0.13, 'bandpass', 1200 * r() + i * 300, 800, 3, 0.004); }
    else { nz(c, o, t, 0.05, 0.25, 'highpass', 2500 * r(), 2000, 0.7, 0.002); tn(c, o, t, 'triangle', 260 * r(), 140, 0.06, 0.12, 0.002); nz(c, o, t + 0.07, 0.25 * k, 0.04, 'bandpass', 700, 500, 1, 0.03); } // 石板：脆响 + 短回声尾
  }
  // 你的脚步（worlds.js / game.js 调用；返回 true = 已替代原来的 step 采样）
  function player(ground) {
    if (!on()) return false; const c = ac(); if (!c) return false; const t = c.currentTime + 0.005; lr = -lr;
    const o = bus(c, window.Mods && Mods.on('move_sfx') === false ? 0.75 : 1.05, lr * 0.12), surf = ground === 'cave' ? 'stone' : SURF(ground);
    tn(c, o, t, 'sine', 95 * (0.92 + Math.random() * 0.16), 38, 0.22, 0.55, 0.006); // 食人魔的体重
    nz(c, o, t, 0.12, 0.2, 'lowpass', 500, 150, 1, 0.005);
    layer(c, o, t + 0.01, surf, 1.2);
    return true;
  }
  // 敌人脚步：每帧对全部敌人调用一次（foe.js update 末尾）
  const last = new WeakMap(); let budgetT = 0, n = 0;
  function foes(FOES, dt) {
    if (!on() || !FOES.length) return; const c = ac(); const cam = window.G && G.camera; if (!c || !cam) return;
    budgetT += dt; if (budgetT > 1) { budgetT = 0; n = 0; }
    const surf = SURF(api.ground), cy = G.player ? G.player.yaw : 0;
    for (const fo of FOES) {
      if (fo.dead) continue; let L = last.get(fo); if (!L) { last.set(fo, L = { x: fo.pos.x, z: fo.pos.z, acc: 0 }); continue; }
      const dx = fo.pos.x - L.x, dz = fo.pos.z - L.z, mv = Math.hypot(dx, dz); L.x = fo.pos.x; L.z = fo.pos.z; if (mv > 1.5) continue; // 传送/复位
      const sp = mv / Math.max(dt, 1e-3); L.acc += mv; const run = sp > 2.6, stride = run ? 0.95 : 0.65; if (L.acc < stride) continue; L.acc = 0;
      if (fo.role === 'assassin' && fo.seen) continue; // 刺客：无声
      const ex = fo.pos.x - cam.position.x, ez = fo.pos.z - cam.position.z, d = Math.hypot(ex, ez); if (d > 16 || n > 16) continue; n++;
      const rel = Math.sin(Math.atan2(ex, ez) - (cy + Math.PI)), big = !!fo.boss;
      const t = c.currentTime + 0.005, o = bus(c, Math.min(1, 1.6 / (1 + d * 0.35)) * (run ? 0.28 : 0.16) * (big ? 1.8 : 1), -rel * 0.8);
      tn(c, o, t, 'sine', (big ? 90 : 150) * (0.9 + Math.random() * 0.2), big ? 40 : 80, big ? 0.16 : 0.07, big ? 0.5 : 0.28, 0.003); // 鞋跟
      layer(c, o, t, surf, big ? 1 : 0.55);
      if (fo.role === 'guard' || fo.role === 'brute') { for (let i = 0; i < 2; i++) tn(c, o, t + 0.02 + i * 0.03, 'triangle', 2200 + Math.random() * 1400, 2000, 0.05, 0.04, 0.002); } // 甲片叮当
    }
  }
  const api = { player, foes, SURF, ground: '' };
  return api;
})();
