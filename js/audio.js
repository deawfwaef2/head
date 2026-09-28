// 程序化音频（WebAudio 合成，无外部文件，file:// 可用）
window.SFX = (() => {
  let ctx = null, master, sfxBus, musicBus, reverb, noiseBuf;
  let musicOn = true, sfxOn = true, musicTimer = null;

  function init() {
    if (ctx) { if (ctx.state !== 'running') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.85; master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    comp.connect(master);
    sfxBus = ctx.createGain(); sfxBus.connect(comp);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.32; musicBus.connect(comp);
    reverb = ctx.createConvolver(); reverb.buffer = makeIR(2.8);
    const rv = ctx.createGain(); rv.gain.value = 0.5; reverb.connect(rv); rv.connect(comp);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    startMusic();
  }
  function makeIR(sec) {
    const len = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = b.getChannelData(c);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    return b;
  }
  function out(node, wet = 0.2, bus) {
    node.connect(bus || sfxBus);
    if (wet > 0) { const g = ctx.createGain(); g.gain.value = wet; node.connect(g); g.connect(reverb); }
  }
  function env(g, t, a, peak, d) {
    peak = Math.max(0.0002, peak);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function osc(type, f0, f1, t, dur, vol, a = 0.004, wet = 0.2, bus) {
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); env(g, t, a, vol, dur);
    o.connect(g); out(g, wet, bus); o.start(t); o.stop(t + a + dur + 0.05);
    return o;
  }
  function noise(t, dur, vol, type, freq, q = 1, wet = 0.15, a = 0.002, f1) {
    const n = ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); env(g, t, a, vol, dur);
    n.connect(f); f.connect(g); out(g, wet); n.start(t, Math.random() * 0.5); n.stop(t + a + dur + 0.05);
  }
  const ok = () => ctx && sfxOn;

  // 有质量感的“咚”——头落地
  function thud(vol = 1, pitch = 1) {
    if (!ok()) return; const t = ctx.currentTime; vol = Math.min(1.2, vol);
    osc('sine', 150 * pitch, 42 * pitch, t, 0.28, 1.0 * vol, 0.002, 0.12);
    noise(t, 0.09, 0.8 * vol, 'bandpass', 480 * pitch, 2.5, 0.2);
    osc('triangle', 340 * pitch, 170 * pitch, t, 0.07, 0.35 * vol, 0.001, 0.1);
    noise(t, 0.16, 0.6 * vol, 'lowpass', 260, 0.7, 0.05);
  }
  // 可爱的“啵”——把玩
  function boop(step = 0) {
    if (!ok()) return; const t = ctx.currentTime; const p = 1 + Math.min(step, 24) * 0.03;
    osc('sine', 320 * p, 880 * p, t, 0.07, 0.5, 0.002, 0.1);
    noise(t, 0.03, 0.25, 'highpass', 3000, 0.7, 0.05);
  }
  const PENTA = [0, 2, 4, 7, 9];
  function ding(rar = 0, step = 0) {
    if (!ok()) return; const t = ctx.currentTime;
    const s = Math.min(step, 19);
    const semi = PENTA[s % 5] + 12 * Math.floor(s / 5) + rar * 2;
    const f = 523.25 * Math.pow(2, semi / 12);
    osc('sine', f, f, t, 0.5, 0.28, 0.003, 0.35);
    osc('triangle', f * 2, f * 2, t, 0.25, 0.08, 0.003, 0.35);
    if (rar >= 3) osc('sine', f * 3, f * 3, t + 0.03, 0.4, 0.07, 0.003, 0.5);
  }
  function click() {
    if (!ok()) return; const t = ctx.currentTime;
    noise(t, 0.025, 0.6, 'highpass', 2000, 0.7, 0.05);
    osc('square', 180, 120, t, 0.06, 0.15, 0.001, 0.05);
    osc('sine', 660, 660, t + 0.05, 0.12, 0.2, 0.004, 0.2);
  }
  // 按按钮：音高随进度上升
  function press(frac = 0) {
    if (!ok()) return; const t = ctx.currentTime; const f = 300 + frac * 500;
    noise(t, 0.02, 0.45, 'highpass', 2500, 0.7, 0.03);
    osc('square', f, f * 0.7, t, 0.04, 0.08, 0.001, 0.03);
    osc('sine', f * 2, f * 2, t + 0.01, 0.07, 0.12, 0.002, 0.1);
  }
  function tick() {
    if (!ok()) return; const t = ctx.currentTime;
    noise(t, 0.015, 0.15, 'highpass', 3500, 0.7, 0.02);
    osc('sine', 1400, 900, t, 0.03, 0.05, 0.001, 0.05);
  }
  function deny() {
    if (!ok()) return; const t = ctx.currentTime;
    osc('square', 220, 200, t, 0.09, 0.12, 0.002, 0.05);
    osc('square', 180, 160, t + 0.11, 0.12, 0.12, 0.002, 0.05);
  }
  function rumble() {
    if (!ok()) return; const t = ctx.currentTime;
    noise(t, 0.75, 0.55, 'bandpass', 180, 1.2, 0.3, 0.05, 900);
    osc('sawtooth', 55, 70, t, 0.7, 0.07, 0.05, 0.1);
    for (let i = 0; i < 4; i++) {
      const tt = t + 0.12 + i * 0.15 + Math.random() * 0.05;
      osc('triangle', 900 + Math.random() * 400, 500, tt, 0.05, 0.08, 0.001, 0.3);
    }
  }
  function fanfare(rar) {
    if (!ok()) return; const t = ctx.currentTime;
    const chords = [[0, 4, 7], [0, 4, 7, 12], [0, 4, 7, 11, 14], [0, 4, 7, 12, 16, 19], [0, 4, 7, 11, 14, 17, 21, 24]];
    const notes = chords[rar];
    notes.forEach((n, i) => {
      const f = 392 * Math.pow(2, n / 12);
      osc('triangle', f, f, t + i * 0.07, 0.6, 0.18, 0.004, 0.45);
      osc('sine', f * 2, f * 2, t + i * 0.07, 0.5, 0.07, 0.004, 0.5);
    });
    if (rar >= 3) {
      for (let i = 0; i < 14; i++) {
        const f = 2000 + Math.random() * 3000;
        osc('sine', f, f, t + 0.3 + i * 0.05, 0.25, 0.03, 0.002, 0.7);
      }
      osc('sawtooth', 98, 98, t, 1.4, 0.06, 0.2, 0.4);
    }
  }
  function build() {
    if (!ok()) return; const t = ctx.currentTime;
    thud(0.8, 0.8);
    [0, 4, 7, 12].forEach((n, i) => { const f = 523 * Math.pow(2, n / 12); osc('sine', f, f, t + 0.08 + i * 0.05, 0.3, 0.12, 0.003, 0.4); });
  }
  function sell() {
    if (!ok()) return; const t = ctx.currentTime;
    [12, 7, 4, 0].forEach((n, i) => { const f = 523 * Math.pow(2, n / 12); osc('triangle', f, f, t + i * 0.05, 0.2, 0.12, 0.003, 0.3); });
    noise(t, 0.3, 0.2, 'highpass', 5000, 0.5, 0.4);
  }
  function mount() {
    if (!ok()) return; const t = ctx.currentTime;
    osc('triangle', 1200, 700, t, 0.08, 0.25, 0.001, 0.2);
    noise(t, 0.05, 0.4, 'bandpass', 2500, 4, 0.2);
    osc('sine', 880, 880, t + 0.06, 0.3, 0.15, 0.003, 0.4);
  }
  function whoosh() {
    if (!ok()) return; const t = ctx.currentTime;
    noise(t, 0.25, 0.35, 'bandpass', 400, 1.5, 0.1, 0.03, 2400);
  }
  function pickup() {
    if (!ok()) return; const t = ctx.currentTime;
    osc('sine', 300, 500, t, 0.08, 0.2, 0.002, 0.1);
  }

  // ---------------- BGM：柔和氛围 pad + 八音盒 ----------------
  function startMusic() {
    const bpm = 76, beat = 60 / bpm;
    const prog = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]]; // Fmaj7 Em7 Dm7 Cmaj7
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
    let next = ctx.currentTime + 0.2, step = 0;
    function pad(notes, t, dur) {
      notes.forEach(m => {
        for (const det of [-7, 7]) {
          const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
          const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; f.Q.value = 0.3;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.035, t + 1.6);
          g.gain.linearRampToValueAtTime(0.03, t + dur - 0.8); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
          o.connect(f); f.connect(g); out(g, 0.5, musicBus); o.start(t); o.stop(t + dur + 0.7);
        }
      });
    }
    function bell(m, t, v) {
      const f = mtof(m);
      const car = ctx.createOscillator(); car.frequency.value = f;
      const mod = ctx.createOscillator(); mod.frequency.value = f * 3.5;
      const mg = ctx.createGain(); mg.gain.setValueAtTime(f * 1.2, t); mg.gain.exponentialRampToValueAtTime(1, t + 0.8);
      mod.connect(mg); mg.connect(car.frequency);
      const g = ctx.createGain(); env(g, t, 0.003, v, 1.4);
      car.connect(g); out(g, 0.6, musicBus); car.start(t); mod.start(t); car.stop(t + 1.6); mod.stop(t + 1.6);
    }
    function tick() {
      if (!ctx) return;
      while (next < ctx.currentTime + 0.6) {
        const bar = Math.floor(step / 8) % 4, ch = prog[bar];
        if (musicOn) {
          if (step % 8 === 0) {
            pad(ch, next, beat * 4);
            osc('sine', mtof(ch[0] - 24), mtof(ch[0] - 24), next, beat * 3, 0.12, 0.05, 0.1, musicBus);
          }
          if (Math.random() < (step % 2 === 0 ? 0.6 : 0.3)) {
            const pool = ch.concat(ch.map(n => n + 12));
            bell(pool[Math.floor(Math.random() * pool.length)] + 12, next, 0.06 + Math.random() * 0.04);
          }
        }
        next += beat / 2; step++;
      }
    }
    musicTimer = setInterval(tick, 120); tick();
  }
  function toggleMusic() { musicOn = !musicOn; if (musicBus) musicBus.gain.value = musicOn ? 0.32 : 0; return musicOn; }
  function toggleSfx() { sfxOn = !sfxOn; return sfxOn; }

  return { init, press, tick, thud, boop, ding, click, deny, rumble, fanfare, build, sell, mount, whoosh, pickup, toggleMusic, toggleSfx,
    get musicOn() { return musicOn; }, get sfxOn() { return sfxOn; } };
})();
