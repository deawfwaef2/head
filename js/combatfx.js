// 第二十二轮（续 9）：战斗反馈 —— 程序合成的“打击感”音效库 + 命中准星反馈（零新增音频资源，全部 WebAudio 现场合成）
// MOD：combat_fx（默认开）。关掉 = 只剩原来的 Kenney 采样音效。
// 接口（都是“尽力而为”：任何一处没加载都不会报错）：
//   CombatFX.event(type, fo, data)      ← worlds.js foeEvent 转发：hit / kill / decap / execute / sever / halve / parry / guard / guardbreak / blocked / outflank / dodge / perfectdodge
//   CombatFX.swing(dx, dy, pw, charged) ← combat.js 挥刀起手     CombatFX.thrust()  ← 突刺
//   CombatFX.whiff()                    ← 挥空                   CombatFX.charge(k) ← 蓄力进度 0..1（<=0 结束）
//   CombatFX.draw(on)                   ← 拔刀 / 收刀            CombatFX.stamina() ← 体力耗尽喘息
//   CombatFX.windup(fo, clip)           ← 敌人起手（按角色/性别/轻重发不同的“哈！”与预警音）
//   CombatFX.enemySwing(fo, h)          ← 敌人出手瞬间（挥刀破风，带方位）
//   CombatFX.hurt(n, fo, h)             ← 玩家受伤           CombatFX.clang(type, pos) ← 弹刀 / 格挡 / 破防
//   CombatFX.tick(dt)                   ← 每帧：敌人脚步 / 蓄力音 / 刺客潜行音
//   CombatFX.demo()                     ← 控制台试听全部音效
window.CombatFX = (() => {
  'use strict';
  const modOn = () => !window.Mods || Mods.on('combat_fx');
  const GG = () => window.G || window.__game || {};
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), rnd = (a, b) => a + Math.random() * (b - a);
  let c = null, dry = null, conv = null, lp = null, nbuf = null, lastCtx = null;
  const last = {}; // 每种音效的最小间隔（防止同一帧叠几十层）
  function gate(k, gap) { const t = performance.now(); if (last[k] && t - last[k] < gap) return false; last[k] = t; return true; }

  // ---------------- 引擎 ----------------
  function au() {
    if (!modOn() || !window.SFX || !SFX.ctx || SFX.on === false) return null;
    if (c !== SFX.ctx || !dry) { // 首次 / AudioContext 重建
      c = SFX.ctx; lastCtx = c;
      lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 20000; lp.Q.value = 0.5; lp.connect(SFX.out);
      dry = c.createGain(); dry.gain.value = 0.95; dry.connect(lp);
      const len = Math.floor(c.sampleRate * 1.3), ir = c.createBuffer(2, len, c.sampleRate); // 合成小型混响：指数衰减噪声
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6) * (i < 200 ? i / 200 : 1); }
      conv = c.createConvolver(); conv.buffer = ir; const wet = c.createGain(); wet.gain.value = 0.5; conv.connect(wet); wet.connect(lp);
      nbuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const nd = nbuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    }
    if (c.state === 'suspended') c.resume();
    return c;
  }
  // 输出节点：vol 音量、pan [起,止]（-1 左 .. 1 右）、rv 混响发送
  function bus(vol, pan, rv) {
    const g = c.createGain(); g.gain.value = vol; let n = g;
    if (pan != null && c.createStereoPanner) { const p = c.createStereoPanner(), t = c.currentTime, a = Array.isArray(pan) ? pan : [pan, pan]; p.pan.setValueAtTime(clamp(a[0], -1, 1), t); if (a[1] !== a[0]) p.pan.linearRampToValueAtTime(clamp(a[1], -1, 1), t + 0.25); g.connect(p); n = p; }
    n.connect(dry); if (rv > 0) { const s = c.createGain(); s.gain.value = rv; n.connect(s); s.connect(conv); }
    return g;
  }
  function nz(dst, t, dur, vol, type, f0, f1, q, att) { // 带滤波扫频的噪声爆发
    const s = c.createBufferSource(); s.buffer = nbuf; s.loop = true; const f = c.createBiquadFilter(); f.type = type; f.Q.value = q || 0.8;
    f.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    vol *= type === 'bandpass' ? 2.2 + (q || 1) * 1.1 : type === 'highpass' ? 1.3 : 1; // 带通/高通滤掉了大部分噪声能量：补偿回来，音量才和合成音相称
    const g = c.createGain(), a = att || 0.003; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dst); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  function tn(dst, type, f0, f1, t, dur, vol, att) { // 音高滑动的振荡器
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const a = att || 0.004; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dst); o.start(t); o.stop(t + dur + 0.05);
  }
  const PART = [[1, 1, 1], [2.76, 0.6, 0.65], [5.4, 0.36, 0.4], [8.93, 0.2, 0.25]]; // 金属（钟/刃）的非谐泛音：[频率比, 音量, 衰减比]
  function ring(dst, t, f, vol, dur, parts) { for (const [r, v, d] of parts || PART) tn(dst, 'sine', f * r, f * r * 0.995, t, dur * d, vol * v, 0.001); }
  function voice(dst, t, f0, f1, dur, vol, form, type) { // 简易人声：锯齿波 + 两个共振峰 + 气息
    const o = c.createOscillator(); o.type = type || 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f1, t + dur);
    const vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = 6 + Math.random() * 2; vg.gain.value = f0 * 0.02; vib.connect(vg); vg.connect(o.frequency); vib.start(t); vib.stop(t + dur + 0.05);
    vol *= 4.5; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.04, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    for (const fm of form || [800, 1500]) { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = fm; b.Q.value = 5; o.connect(b); b.connect(g); }
    g.connect(dst); o.start(t); o.stop(t + dur + 0.05); nz(dst, t, dur * 0.8, vol * 0.5, 'bandpass', form ? form[1] : 1500, 0, 1.2);
  }
  // 空间化：相对镜头的音量与左右声道
  const _v = { x: 0, y: 0, z: 0 };
  function spatial(pos) {
    const cam = GG().camera; if (!cam || !pos) return { v: 1, p: 0, d: 0 };
    cam.updateMatrixWorld && cam.updateMatrixWorld(); const e = cam.matrixWorld.elements; const dx = pos.x - e[12], dy = pos.y - e[13], dz = pos.z - e[14], d = Math.hypot(dx, dy, dz) || 1e-3;
    return { v: clamp(1.15 / (1 + d * 0.22), 0.05, 1), p: clamp((dx * e[0] + dy * e[1] + dz * e[2]) / d * 0.9, -0.9, 0.9) * Math.min(1, d / 1.5), d };
  }
  const posOf = (fo) => fo && (fo.anchor && fo.anchor.pos && !fo.anchor.gone ? fo.anchor.pos : fo.pos);
  const heavyRole = (fo) => !!(fo && (fo.boss || fo.role === 'brute'));

  // ---------------- 你的刀 ----------------
  function swing(dx, dy, pw, charged) {
    if (!au() || !gate('swing', 60)) return; const t = c.currentTime, s = clamp(pw || 0.8, 0.3, 1.2), d = charged ? 0.34 : 0.2 + (1 - s) * 0.1;
    const o = bus(0.6, [-0.45 * Math.sign(dx || 0), 0.45 * Math.sign(dx || 0)], 0.08), up = dy > 0.3 ? 1.25 : dy < -0.3 ? 0.85 : 1;
    nz(o, t, d, 0.3 + 0.25 * s, 'bandpass', (520 + 500 * s) * up, (1900 + 1800 * s) * up, 1.3, 0.04);
    nz(o, t + 0.02, d * 0.6, 0.07 * s, 'highpass', 3200, 6500, 0.7, 0.05);
    if (charged) { tn(o, 'sine', 170, 62, t, 0.3, 0.28, 0.01); nz(o, t, 0.4, 0.14, 'lowpass', 500, 120, 0.7, 0.05); ring(o, t + 0.02, 1500, 0.04, 0.5); }
    else if (s > 0.85) tn(o, 'sine', 120, 70, t, 0.16, 0.13, 0.01);
  }
  function thrust() { if (!au() || !gate('thrust', 70)) return; const t = c.currentTime, o = bus(0.65, rnd(-0.1, 0.1), 0.05); nz(o, t, 0.13, 0.36, 'highpass', 1600, 5200, 0.8, 0.012); tn(o, 'triangle', 650, 1500, t, 0.09, 0.06, 0.005); tn(o, 'sine', 200, 110, t, 0.1, 0.1, 0.004); }
  function whiff() { if (!au() || !gate('whiff', 200)) return; const t = c.currentTime, o = bus(1, 0, 0.04); nz(o, t, 0.22, 0.09, 'lowpass', 1400, 300, 0.6, 0.03); tn(o, 'sine', 210, 120, t + 0.03, 0.12, 0.05, 0.02); } // 挥空：衰减的风声 + 一个泄气的“噗”
  function draw(on) {
    if (!au()) return; const t = c.currentTime, o = bus(1, 0.15, 0.2);
    if (on) { nz(o, t, 0.4, 0.3, 'highpass', 1800, 7800, 0.9, 0.02); ring(o, t + 0.25, 3100, 0.1, 0.5, [[1, 1, 1], [1.5, 0.5, 0.8], [2.3, 0.3, 0.6]]); tn(o, 'sine', 300, 150, t + 0.05, 0.08, 0.14, 0.004); }
    else { nz(o, t, 0.3, 0.2, 'highpass', 6500, 1800, 0.9, 0.02); tn(o, 'sine', 260, 120, t + 0.3, 0.09, 0.22, 0.003); nz(o, t + 0.3, 0.05, 0.3, 'bandpass', 2500, 2500, 2, 0.002); }
  }
  function stamina() { if (!au() || !gate('stam', 1500)) return; const t = c.currentTime, o = bus(1, 0, 0.12); for (let i = 0; i < 2; i++) { nz(o, t + i * 0.34, 0.3, 0.3, 'bandpass', 1100 + i * 100, 500, 0.9, 0.09); tn(o, 'sine', 150, 120, t + i * 0.34, 0.25, 0.02, 0.08); } }
  // 蓄力：升调嗡鸣 + 满格“叮”
  let ch = null;
  function charge(k) {
    if (k > 0.1 && au()) {
      if (!ch) { const g = c.createGain(), o1 = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; o1.type = 'triangle'; o2.type = 'sawtooth'; g.gain.value = 0.0001; o1.connect(f); o2.connect(f); f.connect(g); g.connect(bus(1, 0, 0.1)); o1.start(); o2.start(); ch = { g, o1, o2, f, ready: false }; }
      const t = c.currentTime, kk = clamp(k, 0, 1); ch.o1.frequency.setTargetAtTime(150 + kk * 520, t, 0.05); ch.o2.frequency.setTargetAtTime(75 + kk * 260, t, 0.05); ch.f.frequency.setTargetAtTime(500 + kk * 2400, t, 0.05); ch.g.gain.setTargetAtTime(0.012 + kk * 0.05, t, 0.06);
      if (kk >= 0.995 && !ch.ready) { ch.ready = true; const o = bus(1, 0, 0.3); ring(o, t, 1480, 0.2, 0.7); tn(o, 'sine', 740, 1480, t, 0.12, 0.12, 0.005); nz(o, t, 0.25, 0.14, 'highpass', 4000, 8000, 0.8, 0.01); }
    } else if (ch) { const t = c.currentTime, x = ch; x.g.gain.setTargetAtTime(0.0001, t, 0.04); x.o1.stop(t + 0.3); x.o2.stop(t + 0.3); ch = null; }
  }

  // ---------------- 命中 ----------------
  function fleshHit(zone, k, slash, o, t) { // k：0..1 力度
    const limb = /Arm|Leg|Hand|Foot/.test(zone || ''), head = zone === 'head' || zone === 'neck';
    nz(o, t, 0.07, 0.5 * (0.55 + k * 0.6), 'lowpass', 2400, 600, 0.7, 0.002);
    tn(o, 'sine', 180, 52, t, 0.14 + k * 0.08, 0.55 * (0.5 + k), 0.003);
    if (slash) nz(o, t, 0.2, 0.24, 'bandpass', 950, 320, 3, 0.012); else { nz(o, t, 0.28, 0.26, 'bandpass', 520, 210, 3.5, 0.02); tn(o, 'sine', 240, 120, t + 0.03, 0.12, 0.12, 0.01); }
    if (head) { nz(o, t, 0.035, 0.4, 'highpass', 3500, 3500, 0.7, 0.001); tn(o, 'square', 2400, 900, t, 0.05, 0.05, 0.001); }
    else if (limb) { nz(o, t, 0.05, 0.3, 'bandpass', 2600, 1800, 6, 0.001); tn(o, 'triangle', 440, 200, t, 0.09, 0.16, 0.002); }
    else nz(o, t, 0.14, 0.4 * (0.5 + k * 0.5), 'lowpass', 380, 120, 0.8, 0.004);
    if (k > 0.55) { tn(o, 'sine', 78, 30, t, 0.45, 0.6 * k, 0.006); nz(o, t, 0.3, 0.2, 'lowpass', 600, 100, 0.7, 0.01); }
    if (window.SFX && SFX.play) SFX.play(slash ? 'chop' : 'punch', 0.3 + 0.25 * k, slash ? 1.05 : 0.9, 0.12);
  }
  // 命中准星
  let mk = null, mkT = 0;
  function marker(kind) { // white 普通 / crit 弱点 / kill 击杀 / block 被挡
    if (!modOn()) return; if (!mk) {
      const st = document.createElement('style'); st.textContent = '#cfxMk{position:fixed;left:50%;top:50%;width:0;height:0;pointer-events:none;z-index:9}#cfxMk i{position:absolute;left:-2px;top:-2px;width:4px;height:15px;background:currentColor;border-radius:2px;box-shadow:0 0 6px #000a;transform-origin:2px 2px}'
        + '#cfxMk.go i{animation:cfxm .28s ease-out}@keyframes cfxm{0%{opacity:1;margin-top:0}100%{opacity:0;margin-top:0}}'
        + '#cfxMk.go{animation:cfxs .28s ease-out}@keyframes cfxs{0%{transform:scale(.6)}35%{transform:scale(1.25)}100%{transform:scale(1.45)}}';
      document.head.appendChild(st); mk = document.createElement('div'); mk.id = 'cfxMk'; for (let a = 0; a < 4; a++) { const i = document.createElement('i'); i.style.transform = `rotate(${45 + a * 90}deg) translateY(9px)`; mk.appendChild(i); } document.body.appendChild(mk); }
    mk.style.color = kind === 'kill' ? '#ff3a2a' : kind === 'crit' ? '#ffd040' : kind === 'block' ? '#8fd0ff' : '#ffffff'; mk.style.filter = kind === 'kill' ? 'drop-shadow(0 0 4px #f00)' : ''; mk.firstChild.style.height = kind === 'kill' ? '20px' : '15px';
    mk.classList.remove('go'); void mk.offsetWidth; mk.classList.add('go'); mkT = performance.now();
  }
  function kick(v) { const W = window.Worlds && Worlds._W; if (W) W.shake = Math.max(W.shake || 0, v); const S = window.Combat && Combat.state; if (S && S.shake != null) S.shake = Math.max(S.shake, v * 0.05); }
  let cmb = 0, cmbT = 0;
  function ping(n, big) { const t = c.currentTime, o = bus(1, 0, 0.25), sc = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24], f = 660 * Math.pow(2, sc[Math.min(sc.length - 1, n)] / 12); tn(o, 'triangle', f, f, t + 0.02, 0.14, big ? 0.1 : 0.05, 0.002); tn(o, 'sine', f * 2, f * 2, t + 0.03, 0.2, big ? 0.06 : 0.03, 0.002); }
  function onHit(fo, d) {
    d = d || {}; const k = clamp((d.dealt || 8) / 26 + (d.charged ? 0.3 : 0) + (d.spd || 6) / 40, 0.15, 1), zone = d.zone || '', slash = d.kind !== 'thrust', P = posOf(fo), s = spatial(P);
    const now = performance.now(); cmb = now - cmbT < 2500 ? cmb + 1 : 1; cmbT = now;
    if (au()) { const t = c.currentTime, o = bus(1.15 * Math.max(0.65, s.v), s.p, 0.12 + k * 0.15); fleshHit(zone, k, slash, o, t);
      if (d.brk) { ring(o, t, 2300, 0.07, 0.4); tn(o, 'sine', 90, 40, t, 0.35, 0.3, 0.004); } // 破绽追击：额外一声重响
      if (cmb >= 3) ping(Math.min(10, cmb - 2), false); }
    marker(zone === 'neck' || zone === 'head' || d.brk ? 'crit' : 'white'); kick(0.05 + k * 0.17 + (d.charged ? 0.1 : 0));
  }
  function onKill(fo, d, how) {
    const P = posOf(fo), s = spatial(P); marker('kill'); if (!au()) return; const t = c.currentTime, o = bus(0.95 * Math.max(0.6, s.v), s.p, 0.35);
    tn(o, 'sine', 64, 27, t, 0.8, 0.6, 0.004); nz(o, t, 0.5, 0.26, 'lowpass', 260, 70, 0.7, 0.01);
    if (how !== 'decap') { voice(bus(0.8 * s.v, s.p, 0.3), t + 0.04, rnd(380, 460), 170, 0.55, 0.11, [900, 1700]); } // 倒下前的短促悲鸣
    const oo = bus(1, 0, 0.3); ping(Math.min(10, 4 + cmb), true); ring(oo, t + 0.03, 880, 0.06, 0.6, [[1, 1, 1], [1.5, 0.4, 0.8]]);
    kick(0.3);
  }
  function onDecap(fo) {
    const P = posOf(fo), s = spatial(P); if (!au()) return; const t = c.currentTime, o = bus(1 * Math.max(0.65, s.v), s.p, 0.3);
    nz(o, t, 0.25, 0.32, 'highpass', 4000, 9500, 0.8, 0.004); // 刃光“嘶”
    fleshHit('neck', 1, true, o, t + 0.02);
    nz(o, t + 0.08, 0.7, 0.2, 'highpass', 2600, 1800, 0.6, 0.05); // 断颈喷血
    tn(o, 'sine', 120, 50, t + 0.42, 0.18, 0.3, 0.005); nz(o, t + 0.42, 0.12, 0.3, 'lowpass', 400, 120, 0.7, 0.003); // 头颅落地
    if (window.SFX && SFX.play) SFX.play('chop', 0.6, 0.85, 0.05); kick(0.45);
  }
  function onSever(fo) { const s = spatial(posOf(fo)); if (!au()) return; const t = c.currentTime, o = bus(Math.max(0.6, s.v), s.p, 0.2); fleshHit('Arm', 0.85, true, o, t); nz(o, t + 0.05, 0.4, 0.14, 'highpass', 3000, 2000, 0.7, 0.03); tn(o, 'sine', 140, 60, t + 0.3, 0.12, 0.2, 0.004); }
  function clang(type, pos) {
    const s = spatial(pos); marker(type === 'break' ? 'crit' : 'block'); if (!au() || !gate('clang', 50)) return; const t = c.currentTime, o = bus(Math.max(0.6, s.v), s.p, 0.3), f = rnd(1050, 1450);
    nz(o, t, 0.04, 0.5, 'highpass', 3500, 3500, 0.7, 0.001); tn(o, 'sine', 140, 60, t, 0.16, 0.4, 0.002);
    if (type === 'block') { ring(o, t, f * 0.85, 0.22, 0.45); tn(o, 'sine', 90, 45, t, 0.25, 0.4, 0.004); } // 沉闷的格挡
    else if (type === 'break') { ring(o, t, f * 1.2, 0.26, 0.9); ring(o, t + 0.06, f * 0.8, 0.2, 0.8); nz(o, t, 0.3, 0.3, 'highpass', 5000, 9000, 0.7, 0.002); tn(o, 'sine', 70, 28, t, 0.6, 0.6, 0.004); kick(0.35); } // 破防：玻璃般碎裂 + 重低音
    else ring(o, t, f, 0.24, 0.6);
  }
  function onParry(fo) { if (!au()) return; const t = c.currentTime, o = bus(1, 0, 0.45); // 完美格挡：清亮长鸣 + 重低
    nz(o, t, 0.05, 0.6, 'highpass', 4000, 4000, 0.7, 0.001); ring(o, t, 1900, 0.2, 1.1); ring(o, t + 0.02, 2850, 0.1, 0.8, [[1, 1, 1], [1.5, 0.5, 0.8]]); tn(o, 'sine', 100, 38, t, 0.45, 0.42, 0.003); tn(o, 'sine', 1300, 2600, t + 0.04, 0.22, 0.08, 0.004);
    marker('crit'); kick(0.3); }
  function onGuard(fo) { if (!au()) return; const t = c.currentTime, o = bus(1, 0, 0.2); nz(o, t, 0.05, 0.4, 'highpass', 3000, 3000, 0.7, 0.001); ring(o, t, 1000, 0.18, 0.4); tn(o, 'sine', 95, 42, t, 0.3, 0.5, 0.003); }
  function onDodge(perfect) { if (!au()) return; const t = c.currentTime, o = bus(1, 0, 0.2);
    nz(o, t, 0.3, 0.5, 'bandpass', 380, 1500, 1.1, 0.04); nz(o, t + 0.03, 0.14, 0.08, 'highpass', 3000, 5000, 0.7, 0.02);
    if (perfect) { nz(o, t, 0.45, 0.16, 'lowpass', 300, 1800, 0.8, 0.3); const f = 988; tn(o, 'sine', f, f * 2, t + 0.05, 0.3, 0.1, 0.004); ring(o, t + 0.1, 1976, 0.08, 0.7, [[1, 1, 1], [1.5, 0.5, 0.8]]); } }
  function hurt(n, fo, h) {
    if (!au()) return; const t = c.currentTime, o = bus(1, 0, 0.25), st = (GG().st && GG().st()) || {}, k = clamp(n / Math.max(20, st.maxHp || 100) * 4, 0.25, 1);
    tn(o, 'sine', 110, 36, t, 0.35, 0.75 * k + 0.2, 0.003); nz(o, t, 0.22, 0.5 * k + 0.1, 'lowpass', 1000, 180, 0.7, 0.002); nz(o, t, 0.05, 0.3, 'highpass', 2500, 2500, 0.7, 0.001);
    voice(bus(0.7, 0, 0.2), t + 0.02, rnd(300, 360), 170, 0.2 + k * 0.12, 0.12, [700, 1200]); // 短促的吃痛声
    if (h && h.heavy) { tn(o, 'sine', 70, 28, t, 0.6, 0.55, 0.004); }
    if (k > 0.45 && lp) { lp.frequency.cancelScheduledValues(t); lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(20000, t + 0.55 + k * 0.3); tn(bus(0.6, 0, 0), 'sine', 4300, 4200, t + 0.05, 0.7, 0.014, 0.05); } // 重击：耳鸣 + 短暂闷音
    kick(0.1 + k * 0.2);
  }
  // ---------------- 敌人 ----------------
  const ROLEV = { brute: [170, 130, [500, 900]], skirm: [420, 520, [900, 1800]], guard: [260, 230, [700, 1300]], assassin: [0, 0, null], berserk: [300, 380, [850, 1500]], ranged: [360, 300, [900, 1600]] };
  function windup(fo, clip) {
    const P = posOf(fo), s = spatial(P); if (s.d > 16 || !au() || !gate('wu' + (fo && fo.id2), 200)) return; const t = c.currentTime, heavy = /Heavy|Sword_Attack/.test(clip || '') || heavyRole(fo), o = bus(Math.min(1, s.v * 1.1), s.p, 0.22);
    const rv = ROLEV[fo && fo.role] || [330, 420, [850, 1500]];
    const pv = !!(fo && fo.per && window.VOICE_DATA && window.VOICE_DATA[fo.per.k] && (!window.Mods || Mods.on('persona_voice'))); // 第二十四轮：有真人语音的人设不再叠合成喝声
    if (fo && fo.role === 'assassin') { nz(o, t, 0.3, 0.16, 'bandpass', 2400, 4200, 4, 0.05); tn(o, 'sine', 2600, 3100, t + 0.1, 0.16, 0.04, 0.01); } // 刺客：无声的“嘶”
    else if (fo && fo.boss) { voice(o, t, 120, 80, 0.7, 0.2, [400, 800]); voice(o, t, 122, 82, 0.7, 0.14, [420, 820]); nz(o, t, 0.6, 0.2, 'lowpass', 500, 120, 0.7, 0.1); }
    else if (heavy) { if (!pv) voice(o, t, rv[0] * 0.7, rv[1] * 0.6, 0.45, 0.16, rv[2]); tn(o, 'sawtooth', 80, 190, t, 0.5, 0.05, 0.08); nz(o, t + 0.05, 0.4, 0.12, 'bandpass', 700, 300, 1, 0.1); }
    else if (!pv) voice(o, t, rv[0], rv[1], 0.17, 0.11, rv[2]);
    if (heavy) { const b = bus(0.6 * s.v, s.p, 0.4); tn(b, 'sine', 160, 240, t + 0.05, 0.38, 0.12, 0.2); ring(b, t + 0.3, 700, 0.04, 0.6, [[1, 1, 1], [1.5, 0.5, 0.8]]); } // 重击预警：低沉升调
    if (fo && fo.role === 'ranged') { tn(o, 'sine', 500, 900, t + 0.1, 0.25, 0.04, 0.01); }
  }
  function enemySwing(fo, h) {
    const P = posOf(fo), s = spatial(P); if (s.d > 14 || !au()) return; const t = c.currentTime, o = bus(Math.min(1, s.v * 1.2), [s.p - 0.2, s.p + 0.2], 0.15), hv = h && h.heavy;
    nz(o, t, hv ? 0.36 : 0.22, hv ? 0.7 : 0.62, 'bandpass', 450, hv ? 1200 : 2200, 1.2, 0.03); if (hv) tn(o, 'sine', 150, 60, t, 0.3, 0.3, 0.01); if (!hv) nz(o, t, 0.09, 0.06, 'highpass', 4000, 6500, 0.7, 0.02);
    if (fo && fo.armed) ring(o, t + 0.02, 2600, 0.03, 0.2, [[1, 1, 1], [1.5, 0.5, 0.8]]);
    if (hv && fo && fo.role === 'brute' && s.d < 6) roleCue(fo, 'slam'); // 蛮兵重击：地面一震
  }
  function roleCue(fo, kind) { // 角色专属提示：刺客绕背 / 投掷出手 / 翻滚闪避 / 狂暴
    const P = posOf(fo), s = spatial(P); if (!au()) return; const t = c.currentTime, o = bus(Math.min(1, s.v * 1.1), s.p, 0.2);
    if (kind === 'stalk') { if (!gate('stalk', 900)) return; nz(o, t, 0.25, 0.07 * s.v, 'bandpass', 1800, 900, 2, 0.06); tn(o, 'sine', 120, 100, t, 0.1, 0.03, 0.02); }
    else if (kind === 'backstab') { const b = bus(1, s.p, 0.3); nz(b, t, 0.08, 0.4, 'highpass', 3000, 7000, 0.8, 0.002); ring(b, t, 3400, 0.08, 0.35, [[1, 1, 1], [1.5, 0.5, 0.8]]); tn(b, 'sawtooth', 1400, 700, t, 0.25, 0.07, 0.01); } // 背后的利刃出鞘声
    else if (kind === 'throw') { nz(o, t, 0.25, 0.5, 'bandpass', 600, 2400, 1.2, 0.02); tn(o, 'triangle', 500, 1100, t, 0.15, 0.06, 0.01); }
    else if (kind === 'roll') { nz(o, t, 0.3, 0.2, 'bandpass', 300, 1100, 1, 0.05); tn(o, 'sine', 110, 70, t + 0.25, 0.1, 0.18, 0.004); }
    else if (kind === 'rage') { voice(o, t, 240, 420, 0.6, 0.18, [900, 1600]); voice(o, t + 0.1, 160, 330, 0.5, 0.12, [700, 1300]); tn(o, 'sawtooth', 70, 140, t, 0.5, 0.08, 0.1); nz(o, t, 0.6, 0.2, 'bandpass', 900, 300, 0.8, 0.1); }
    else if (kind === 'armor') { if (!gate('armor', 120)) return; ring(o, t, 820, 0.14, 0.3); nz(o, t, 0.04, 0.3, 'highpass', 3000, 3000, 0.7, 0.001); tn(o, 'sine', 110, 50, t, 0.2, 0.3, 0.003); } // 蛮兵硬吃一刀：当啷
    else if (kind === 'dodged') { nz(o, t, 0.14, 0.18, 'bandpass', 1200, 500, 1, 0.01); }
    else if (kind === 'slam') { tn(o, 'sine', 90, 32, t, 0.7, 0.9, 0.004); nz(o, t, 0.5, 0.4, 'lowpass', 400, 80, 0.7, 0.01); kick(0.4); }
  }
  // 敌人脚步（按距离 + 体型）/ 刺客潜行
  let tk = 0;
  function tick(dt) {
    const now = performance.now(); if (now - tk < 8) return; tk = now; // 同帧被 game.js 与 worlds.js 各调一次：去重
    if (ch && !(window.Combat && Combat.drawn)) charge(0);
    if (!window.Foe || !Foe.foes || !au()) return;
    for (const fo of Foe.foes) {
      if (fo.dead || !fo.seen || fo.state === 'idle' || !fo.fv) continue; const v = Math.hypot(fo.fv.x, fo.fv.z); if (v < 1.2) continue;
      if (fo.role === 'assassin') { if (now - (fo.stalkAt || 0) > 1100) { fo.stalkAt = now; if (spatial(fo.pos).d < 12) roleCue(fo, 'stalk'); } continue; } // 刺客：只有极轻的衣料摩擦
      const cad = 1000 / (0.75 * v + 0.6) * (fo.role === 'brute' ? 1.35 : 1); if (now - (fo.stepAt || 0) < cad) continue; fo.stepAt = now;
      const s = spatial(fo.pos); if (s.d > 13) continue; const big = heavyRole(fo);
      if (window.SFX && SFX.play) { SFX.play('step', Math.min(0.5, 0.3 * s.v * (big ? 1.8 : 1)), big ? 0.6 : 0.95, 0.15); if (big && s.d < 9) SFX.play('thud', 0.3 * s.v, 0.6, 0.1); }
    }
  }
  // ---------------- 事件分发 ----------------
  function event(t, fo, d) {
    if (!modOn()) return;
    try {
      if (t === 'hit') onHit(fo, d);
      else if (t === 'kill') onKill(fo, d, fo && fo.decap ? 'decap' : '');
      else if (t === 'decap') onDecap(fo);
      else if (t === 'execute') { onDecap(fo); ring(bus(1, 0, 0.4), c.currentTime, 1200, 0.1, 0.8); }
      else if (t === 'sever' || t === 'halve') onSever(fo);
      else if (t === 'parry') onParry(fo);
      else if (t === 'guard') onGuard(fo);
      else if (t === 'guardbreak') { /* 弹刀声在 clang('break') 里 */ }
      else if (t === 'perfectdodge') onDodge(true);
      else if (t === 'dodge') onDodge(false);
      else if (t === 'outflank') { if (au()) { const o = bus(0.8, 0, 0.2); ring(o, c.currentTime, 1700, 0.07, 0.4); marker('crit'); } }
    } catch (e) { console.warn('CombatFX', e); }
  }
  function demo() { // 控制台：CombatFX.demo() 依次试听
    const steps = [() => swing(1, 0, 0.8), () => swing(-1, 0, 1, true), () => thrust(), () => whiff(), () => onHit({ pos: { x: 0, y: 1, z: -2 } }, { dealt: 10, zone: 'chest' }), () => onHit({ pos: { x: 0, y: 1, z: -2 } }, { dealt: 26, zone: 'neck', charged: true }), () => clang('block'), () => clang('break'), () => onParry(), () => onDecap({ pos: { x: 0, y: 1, z: -2 } }), () => onKill({ pos: { x: 0, y: 1, z: -2 } }), () => windup({ pos: { x: 2, y: 0, z: -3 }, role: 'brute' }, 'Sword_Attack'), () => windup({ pos: { x: -2, y: 0, z: -3 } }, 'Sword_Regular_A'), () => hurt(25, null, { heavy: true }), () => onDodge(true)];
    steps.forEach((f, i) => setTimeout(() => { try { f(); } catch (e) { console.warn(e); } }, i * 900)); return steps.length;
  }
  return { event, swing, thrust, whiff, charge, draw, stamina, windup, enemySwing, roleCue, hurt, clang, tick, demo, marker, kick, get on() { return modOn(); } };
})();
