// 第二十四轮(7)：环境音 Ambience（MOD ambience，默认开）—— 每种地点一套声景，洞穴也有；全部 WebAudio 现场合成，零新增音频资源。
// 底噪层（循环噪声 → 滤波 → 阵风包络）：风 / 树叶沙沙 / 水声 / 洞穴低鸣 / 深渊低频嗡鸣
// 随机事件（带左右方位、远近音量）：鸟鸣 / 啄木鸟 / 猫头鹰 / 蟋蟀 / 蛙鸣 / 蚊虫掠过 / 乌鸦 / 远处狼嚎 / 猛禽长鸣 / 旗帜拍打 / 金属轻响 / 远钟 / 滴水 / 闷雷
// 不改任何共享文件的逻辑：自带 250ms 轮询（出猎时 Worlds 接管主循环、G.HOOK.frame 不跑），读 Worlds._W 当前地点风格；暂停/菜单/切到后台时淡出。
// 调试：Ambience.debug() 返回当前场景与各层音量；Ambience.demo('forest') 强制某场景；Ambience.demo() 恢复自动。
window.Ambience = (() => {
  'use strict';
  const on = () => !window.Mods || Mods.on('ambience');
  const R = (a, b) => a + Math.random() * (b - a);
  // 每种场景：底噪层音量 + 事件每秒概率
  const SCN = {
    meadow:   { wind: 0.22, leaves: 0.22, water: 0, room: 0, drone: 0, ev: { bird: 0.45, cricket: 0.25, raptor: 0.02 } },
    forest:   { wind: 0.16, leaves: 0.38, water: 0, room: 0, drone: 0, ev: { bird: 0.35, pecker: 0.04, owl: 0.03, cricket: 0.08 } },
    wilds:    { wind: 0.55, leaves: 0.06, water: 0, room: 0, drone: 0, gust: 1.4, ev: { raptor: 0.05, howl: 0.018, cricket: 0.05 } },
    ruins:    { wind: 0.38, leaves: 0.08, water: 0, room: 0, drone: 0, whistle: 1, ev: { crow: 0.06, drip: 0.05, bird: 0.06 } },
    swamp:    { wind: 0.12, leaves: 0.1, water: 0.28, room: 0, drone: 0, ev: { frog: 0.55, bug: 0.07, bubble: 0.5, crow: 0.02, owl: 0.01 } },
    fortress: { wind: 0.42, leaves: 0, water: 0, room: 0, drone: 0, ev: { flag: 0.12, metal: 0.04, crow: 0.04, bell: 0.008 } },
    capital:  { wind: 0.12, leaves: 0.04, water: 0, room: 0, drone: 0, night: 1, ev: { cricket: 0.6, bell: 0.012, owl: 0.03, metal: 0.02 } },
    abyss:    { wind: 0.3, leaves: 0, water: 0, room: 0.12, drone: 0.26, whistle: 1, night: 1, ev: { thunder: 0.02, drip: 0.08 } },
    peak:     { wind: 0.8, leaves: 0, water: 0, room: 0, drone: 0, gust: 1.8, whistle: 1, ev: { raptor: 0.015, howl: 0.01 } },
    cave:     { wind: 0.04, leaves: 0, water: 0, room: 0.3, drone: 0.05, ev: { drip: 0.45, rumble: 0.012, bat: 0.02 } },
  };
  let ac = null, bus = null, L = null, cur = null, force = null, nb = null, bb = null, lastT = 0, gustP = 0, whP = 0;
  function noiseBufs() {
    const n = ac.sampleRate * 4; nb = ac.createBuffer(1, n, ac.sampleRate); bb = ac.createBuffer(1, n, ac.sampleRate);
    const w = nb.getChannelData(0), b = bb.getChannelData(0); let last = 0;
    for (let i = 0; i < n; i++) { const x = Math.random() * 2 - 1; w[i] = x; last = (last + 0.02 * x) / 1.02; b[i] = last * 3.5; } // 白噪 / 布朗噪
    // 循环接缝：首尾 2000 个样本交叉淡化，避免每 4 秒一声“咔”
    for (let i = 0; i < 2000; i++) { const k = i / 2000; w[i] = w[i] * k + w[n - 2000 + i] * (1 - k); b[i] = b[i] * k + b[n - 2000 + i] * (1 - k); }
  }
  function bed(buf, type, f, q) { const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.loopStart = 0.05; s.loopEnd = 3.95; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q || 0.7; const g = ac.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(bus); s.start(0, Math.random() * 3); return { s, fl, g }; }
  function build() {
    ac = SFX.ctx; noiseBufs();
    bus = ac.createGain(); bus.gain.value = 0; bus.connect(SFX.out);
    L = {
      wind: bed(bb, 'lowpass', 520, 0.6), leaves: bed(nb, 'bandpass', 4200, 0.5), water: bed(nb, 'bandpass', 900, 0.4),
      room: bed(bb, 'lowpass', 160, 0.5), whistle: bed(nb, 'bandpass', 900, 18),
    };
    const o1 = ac.createOscillator(), o2 = ac.createOscillator(), dg = ac.createGain(); o1.frequency.value = 43; o2.frequency.value = 45.5; o1.type = o2.type = 'sine'; dg.gain.value = 0; o1.connect(dg); o2.connect(dg); dg.connect(bus); o1.start(); o2.start(); L.drone = { g: dg };
  }
  // ---------------- 事件：一次性小声源 ----------------
  function out(pan, vol) { const g = ac.createGain(); g.gain.value = vol; if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(bus); } else g.connect(bus); return g; }
  function tone(dst, type, f0, f1, t, dur, vol, att) { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (att || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(dst); o.start(t); o.stop(t + dur + 0.05); return o; }
  function burst(dst, t, dur, vol, type, f, q, buf) { const s = ac.createBufferSource(); s.buffer = buf || nb; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q || 1; const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(fl); fl.connect(g); g.connect(dst); s.start(t, Math.random() * 3, dur + 0.05); }
  const EV = {
    bird(t) { const d = out(R(-0.9, 0.9), R(0.05, 0.12)), base = R(2400, 4600), n = 2 + (Math.random() * 6 | 0), sp = R(0.07, 0.16), up = Math.random() < 0.5;
      for (let i = 0; i < n; i++) { const tt = t + i * sp + R(0, 0.03), f = base * R(0.85, 1.2); tone(d, 'sine', up ? f * 0.8 : f * 1.25, up ? f * 1.3 : f * 0.75, tt, sp * R(0.5, 0.9), 0.9, 0.006); } },
    pecker(t) { const d = out(R(-0.9, 0.9), R(0.06, 0.1)); const n = 10 + (Math.random() * 8 | 0); for (let i = 0; i < n; i++) burst(d, t + i * 0.055, 0.03, 0.9, 'bandpass', 1500, 3); },
    owl(t) { const d = out(R(-0.8, 0.8), R(0.08, 0.13)); tone(d, 'sine', 400, 360, t, 0.45, 0.8, 0.12); tone(d, 'sine', 380, 330, t + 0.65, 0.75, 0.8, 0.15); },
    cricket(t) { const d = out(R(-0.9, 0.9), R(0.02, 0.05)), f = R(4200, 4900), n = 3 + (Math.random() * 5 | 0); for (let k = 0; k < n; k++) for (let i = 0; i < 3; i++) tone(d, 'sine', f, f * 0.99, t + k * 0.32 + i * 0.035, 0.025, 0.9, 0.003); },
    frog(t) { const d = out(R(-0.9, 0.9), R(0.07, 0.13)), f = R(180, 340), n = 1 + (Math.random() * 3 | 0);
      for (let k = 0; k < n; k++) { const tt = t + k * R(0.25, 0.45); for (let i = 0; i < 6; i++) tone(d, 'sawtooth', f * 1.1, f, tt + i * 0.028, 0.03, 0.5, 0.003); } },
    bubble(t) { const d = out(R(-0.7, 0.7), R(0.03, 0.07)); const n = 1 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) { const f = R(220, 520); tone(d, 'sine', f, f * 2.2, t + i * R(0.05, 0.12), 0.06, 0.8, 0.004); } },
    bug(t) { const d = out(0, 0.04); const o = tone(d, 'sawtooth', R(520, 620), R(560, 640), t, 1.6, 0.35, 0.3); if (d.gain && ac.createStereoPanner) { /* 掠过：通过 gain 包络模拟远近 */ d.gain.setValueAtTime(0.005, t); d.gain.linearRampToValueAtTime(0.05, t + 0.8); d.gain.linearRampToValueAtTime(0.004, t + 1.6); } return o; },
    crow(t) { const d = out(R(-0.9, 0.9), R(0.05, 0.09)), n = 1 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) { const tt = t + i * R(0.35, 0.5); tone(d, 'sawtooth', 780, 560, tt, 0.28, 0.5, 0.02); burst(d, tt, 0.25, 0.25, 'bandpass', 1300, 4); } },
    raptor(t) { const d = out(R(-0.9, 0.9), R(0.04, 0.07)); tone(d, 'sine', 3000, 2000, t, 1.1, 0.6, 0.08); tone(d, 'sine', 3100, 2100, t + 0.02, 1.0, 0.25, 0.08); },
    howl(t) { const d = out(R(-0.9, 0.9), R(0.03, 0.05)); const o = ac.createOscillator(), g = ac.createGain(), v = ac.createOscillator(), vg = ac.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(420, t); o.frequency.linearRampToValueAtTime(640, t + 0.9); o.frequency.linearRampToValueAtTime(600, t + 2.2); o.frequency.linearRampToValueAtTime(380, t + 3.2);
      v.frequency.value = 5.5; vg.gain.value = 9; v.connect(vg); vg.connect(o.frequency); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.5); g.gain.setValueAtTime(0.9, t + 2.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.3);
      o.connect(g); g.connect(d); o.start(t); v.start(t); o.stop(t + 3.4); v.stop(t + 3.4); },
    flag(t) { const d = out(R(-0.8, 0.8), R(0.06, 0.11)), n = 3 + (Math.random() * 5 | 0); for (let i = 0; i < n; i++) burst(d, t + i * R(0.09, 0.16), 0.08, 0.9, 'bandpass', R(500, 900), 1.2); },
    metal(t) { if (window.SFX && SFX.play && Math.random() < 0.5) { setTimeout(() => SFX.play('metal', 0.05, R(0.6, 0.9), 0.1), Math.max(0, (t - ac.currentTime) * 1000)); return; } const d = out(R(-0.8, 0.8), R(0.02, 0.04)); tone(d, 'triangle', 1850, 1840, t, 0.5, 0.6, 0.002); tone(d, 'triangle', 2710, 2700, t, 0.35, 0.3, 0.002); },
    bell(t) { const d = out(R(-0.6, 0.6), R(0.05, 0.08)); for (let i = 0; i < 3; i++) { const tt = t + i * 2.2; tone(d, 'sine', 220, 219, tt, 2.6, 0.7, 0.004); tone(d, 'sine', 440 * 1.19, 440 * 1.18, tt, 1.8, 0.25, 0.004); tone(d, 'sine', 660 * 0.99, 655, tt, 1.2, 0.15, 0.004); } },
    drip(t) { const d = out(R(-0.9, 0.9), R(0.05, 0.12)), f = R(1100, 2400); tone(d, 'sine', f, f * 0.55, t, 0.09, 0.9, 0.002); tone(d, 'sine', f * 0.5, f * 0.3, t + 0.11, 0.25, 0.12, 0.01); tone(d, 'sine', f * 0.52, f * 0.31, t + 0.28, 0.3, 0.05, 0.01); }, // 带两次衰减回声 = 洞里的空间感
    thunder(t) { const d = out(R(-0.5, 0.5), R(0.25, 0.4)); burst(d, t, 3.5, 0.9, 'lowpass', 140, 0.7, bb); burst(d, t + R(0.2, 0.6), 2.2, 0.6, 'lowpass', 90, 0.7, bb); },
    rumble(t) { const d = out(R(-0.5, 0.5), R(0.15, 0.25)); burst(d, t, 2.8, 0.8, 'lowpass', 110, 0.7, bb); },
    bat(t) { const d = out(R(-0.9, 0.9), R(0.02, 0.035)), n = 4 + (Math.random() * 6 | 0); for (let i = 0; i < n; i++) tone(d, 'sine', 6200, 5400, t + i * R(0.04, 0.08), 0.02, 0.8, 0.002); },
  };
  // ---------------- 主轮询 ----------------
  function scene() {
    if (force) return force;
    const Wd = window.Worlds && Worlds.active && Worlds._W;
    if (Wd) { const nd = Wd.graph && Wd.graph.nodes && Wd.graph.nodes[Wd.cur]; return nd && SCN[nd.style] ? nd.style : 'meadow'; }
    return 'cave';
  }
  function audible() { const G = window.G; if (force) return true; if (document.hidden || !G || !G.playing) return false; if (G.uiOpen) return 0.4; return 1; }
  function tick() {
    if (!window.SFX || !SFX.ctx || SFX.on === false || !SFX.out) { if (bus) bus.gain.setTargetAtTime(0, ac.currentTime, 0.3); return; }
    if (ac !== SFX.ctx || !bus) build();
    const now = ac.currentTime, dt = lastT ? Math.min(1, now - lastT) : 0.25; lastT = now;
    const au = on() ? audible() : 0; bus.gain.setTargetAtTime(au ? (au === true ? 1 : au) * 0.55 : 0, now, au ? 1.2 : 0.35);
    if (!au) return;
    const k = scene(), S = SCN[k]; cur = k;
    // 阵风：随机游走的包络，决定风/树叶/口哨层的音量与滤波
    gustP += (Math.random() - 0.5) * 0.35 * (S.gust || 1); gustP = Math.max(-1, Math.min(1, gustP * 0.97)); const gust = 0.65 + 0.35 * gustP * (S.gust || 1);
    whP += dt * R(0.1, 0.4);
    const set = (ly, v) => ly.g.gain.setTargetAtTime(Math.max(0, v), now, 0.9);
    set(L.wind, S.wind * gust); L.wind.fl.frequency.setTargetAtTime(380 + 420 * Math.max(0, gust), now, 0.8);
    set(L.leaves, S.leaves * (0.5 + 0.7 * Math.max(0, gust)) * 0.5);
    set(L.water, S.water * 0.6); L.water.fl.frequency.setTargetAtTime(700 + 400 * Math.sin(whP * 0.7), now, 1.5);
    set(L.room, S.room); set(L.drone, S.drone * 0.5);
    set(L.whistle, S.whistle ? S.wind * 0.06 * Math.max(0, gustP + 0.3) : 0); L.whistle.fl.frequency.setTargetAtTime(700 + 500 * (0.5 + 0.5 * Math.sin(whP)), now, 1.2);
    // 事件
    for (const e in S.ev) if (Math.random() < S.ev[e] * dt) { try { EV[e](now + R(0.02, 0.2)); } catch (x) { } }
  }
  let timer = null;
  function start() { if (timer) return; timer = setInterval(() => { try { tick(); } catch (e) { console.warn('Ambience', e); } }, 250); }
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start(); }
  return {
    SCN, EV,
    debug: () => ({ scene: cur, force, bus: bus && +bus.gain.value.toFixed(3), layers: L && Object.fromEntries(Object.entries(L).map(([k, v]) => [k, +v.g.gain.value.toFixed(3)])) }),
    demo: (k) => { force = k && SCN[k] ? k : null; return force; },
    _tick: tick,
  };
})();
