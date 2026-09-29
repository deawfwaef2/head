// 音效（Kenney CC0 采样 + WebAudio 合成）与音乐（Kevin MacLeod CC-BY 4.0，HTMLAudio 播放列表）
window.SFX = (() => {
  let ctx = null, master = null, sfxOn = true;
  const buf = {};
  async function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    const D = window.SFX_DATA || {};
    for (const k in D) {
      buf[k] = [];
      for (const b64 of D[k]) {
        try { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); buf[k].push(await ctx.decodeAudioData(u.buffer)); } catch (e) { }
      }
    }
  }
  const ok = () => ctx && sfxOn;
  function play(name, vol = 1, rate = 1, jitter = 0.08) {
    if (!ok() || !buf[name] || !buf[name].length) return;
    const s = ctx.createBufferSource(); s.buffer = buf[name][Math.floor(Math.random() * buf[name].length)];
    s.playbackRate.value = rate * (1 + (Math.random() - 0.5) * 2 * jitter);
    const g = ctx.createGain(); g.gain.value = vol; s.connect(g); g.connect(master); s.start();
  }
  function osc(type, f0, f1, t, dur, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(t, dur, vol, type = 'lowpass', freq = 800) {
    // 第十八轮：复用一段 3 秒噪声（原来每次现生成缓冲区，击杀时连放多个音效会卡）
    if (!noise.b) { noise.b = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate); const d = noise.b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const n = ctx.createBufferSource(); n.buffer = noise.b; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f); f.connect(g); g.connect(master); const d = Math.min(dur, 2.9); n.start(t, Math.random() * (3 - d), d);
  }
  // 魂晶叮：音高随连击上升（多巴胺）
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  function soul(combo = 0, r = 0) {
    if (!ok()) return; const t = ctx.currentTime; const n = SCALE[Math.min(SCALE.length - 1, combo)] + r * 2;
    const f = 523 * Math.pow(2, n / 12);
    osc('triangle', f, f, t, 0.18, 0.12); osc('sine', f * 2, f * 2, t + 0.03, 0.22, 0.06);
    if (r >= 2) osc('sine', f * 1.5, f * 3, t + 0.05, 0.4, 0.05);
  }
  function squish(v = 1) { if (!ok()) return; const t = ctx.currentTime; noise(t, 0.12, 0.25 * v, 'lowpass', 600); osc('sine', 180, 60, t, 0.12, 0.2 * v); play('punch', 0.5 * v, 1.1); }
  function roar(v = 1) {
    if (!ok()) return; const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) osc('sawtooth', 90 + i * 7, 55 + i * 5, t, 1.1, 0.07 * v);
    noise(t, 1.0, 0.25 * v, 'bandpass', 400);
  }
  function thud(v = 1, pitch = 1) { play('thud', Math.min(1, 0.35 + v * 0.5), pitch * (0.9 + (1 - Math.min(1, v)) * 0.2)); if (v > 0.6) play('heavy', 0.4 * v, pitch * 0.8); }
  function levelup() { if (!ok()) return; const t = ctx.currentTime; [0, 4, 7, 12, 16].forEach((n, i) => osc('square', 392 * Math.pow(2, n / 12), 392 * Math.pow(2, n / 12), t + i * 0.07, 0.25, 0.05)); play('bell', 0.4, 1.2); }
  function heartbeat() { if (!ok()) return; const t = ctx.currentTime; osc('sine', 70, 40, t, 0.15, 0.4); osc('sine', 65, 40, t + 0.2, 0.15, 0.3); }
  function fanfare(r) { if (!ok()) return; const t = ctx.currentTime; const base = [0, 4, 7, 11, 14, 19]; base.slice(0, 3 + r).forEach((n, i) => osc('sawtooth', 262 * Math.pow(2, n / 12), 262 * Math.pow(2, n / 12), t + i * 0.06, 0.4, 0.04)); play('bell', 0.3 + r * 0.1, 0.9 + r * 0.1); }

  // ---------------- 音乐 ----------------
  const LISTS = { cave: ['music/volatile_reaction.mp3', 'music/metalmania.mp3'], expedition: ['music/clash_defiant.mp3', 'music/unholy_knight.mp3'] };
  let cur = null, curList = null, idx = 0, musicOn = (() => { try { return localStorage.getItem('soulhead_music') !== '0'; } catch (e) { return true; } })(), vol = 0.45;
  function fade(a, to, ms, done) { const from = a.volume, t0 = performance.now(); const step = () => { const k = Math.min(1, (performance.now() - t0) / ms); a.volume = Math.max(0, Math.min(1, from + (to - from) * k)); if (k < 1) requestAnimationFrame(step); else done && done(); }; step(); }
  function music(list) {
    if (curList === list && cur) return;
    curList = list; idx = Math.floor(Math.random() * LISTS[list].length);
    const old = cur; if (old) fade(old, 0, 800, () => old.pause());
    if (!musicOn) { cur = null; return; }
    startTrack();
  }
  function startTrack() {
    const a = new Audio(LISTS[curList][idx % LISTS[curList].length]); a.volume = 0; cur = a;
    a.addEventListener('ended', () => { if (cur === a) { idx++; startTrack(); } });
    a.play().then(() => fade(a, vol, 1200)).catch(() => { });
  }
  function toggleMusic() { musicOn = !musicOn; try { localStorage.setItem('soulhead_music', musicOn ? '1' : '0'); } catch (e) {} document.querySelectorAll('.musicBtn').forEach(b => b.textContent = musicOn ? '🎵 BGM 开' : '🔇 BGM 关'); if (!musicOn && cur) { const a = cur; fade(a, 0, 400, () => a.pause()); cur = null; } else if (musicOn && curList) startTrack(); return musicOn; }
  function toggleSfx() { sfxOn = !sfxOn; return sfxOn; }

  return {
    get musicOn() { return musicOn; }, get ctx() { return ctx; }, get out() { return master; }, duck(d) { if (cur) fade(cur, d ? 0 : vol, 700); }, init, play, soul, squish, roar, thud, levelup, heartbeat, fanfare, music, toggleMusic, toggleSfx,
    punch: () => play('punch', 0.6), coins: () => play('coins', 0.6), chop: () => play('chop', 0.8), wood: () => play('wood', 0.7), mine: () => play('mine', 0.8),
    click: () => play('click', 0.5), select: () => play('select', 0.5), confirm: () => play('confirm', 0.6), deny: () => play('error', 0.6), open: () => play('open', 0.5), close: () => play('close', 0.5),
    page: () => play('page', 0.6), book: () => play('book', 0.6), step: () => play('step', 0.25, 1, 0.15), sack: () => play('sack', 0.8), latch: () => play('latch', 0.6), metal: () => play('metal', 0.6), bell: () => play('bell', 0.5), plate: () => play('plate', 0.5)
  };
})();
