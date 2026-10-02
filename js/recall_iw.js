// R33 MOD recall_iw（默认开）：「回忆」改为 **原场景内** 进行——不再新开一个 3D 界面。
//  · 按 F：镜头在洞里原地拉近到你手里的首级（收窄视野、微微低头），主角的两只手（食人魔绿皮，和第一人称手臂同色；手掌用现成的 limb_hand 资源）
//    左手托着颈口，右手做动作：对视 / 抚摸头发 / 嗅闻 / 贴耳 / 回忆那一战，以及「把玩」：抛接 / 转一圈 / 戳脸颊 / 拍拍头（+ 拖动鼠标转她）。
//  · 首级已死：全程不改表情、不眨眼、不“复活”，只有被手摆弄带来的晃动、头发摆动、被戳时的轻微形变。
//  · 每个动作都有音效（样本 + WebAudio 合成：发丝沙沙、吸气、心跳、低语、呼啸、接住的闷响、戳脸的软响……）和镜头运动。
//  · UI：左上信息卡（名字/魂阶/身份/记忆进度 + 每一项记忆：已想起=内容，未想起=「？？？ · 用哪个动作能想起」），底部数字键动作栏，动作栏上方字幕。
//  · 数据/文案/奖励全部沿用 js/recall.js（Recall.narrate / reveal / ACT / FAC）；recall.js 的旧界面只在首级不在洞里时兜底。
// 依赖：G（game.js）、Recall、ModelHeads、Assets、SFX。只用 G.HOOK.pre（相机偏移 + 摆放手和头，在主循环渲染前）。
window.RecallIW = (() => {
  'use strict';
  const on = () => (!window.Mods || Mods.on('recall_iw')) && window.Recall && Recall.on();
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const RC = ['#b8b8c0', '#4aa8ff', '#c05aff', '#ffb020', '#ff4a8a'], RN = ['凡魂', '灵魂', '英魂', '圣魂', '神魂'];
  const PI = Math.PI;
  let G = null, el = null, hooked = false;
  const S = { active: false, h: null, rec: null, act: '', t: 0, dur: 0, keys: null, cues: null, cueI: 0, blend: 0, fov0: 60, yaw: 0, pitch: 0, dist: 0, drag: null, play: 0, lastTurn: 0, squash: 0, sc0: 1, pend: null, shake: 0, flash: 0, t0: 0, openT: 0 };

  // ---------------- 手 ----------------
  let rig = null; // camera 的子节点：{ g, L, R }
  function makeHand(mirror) {
    const g = new THREE.Group(), A = window.Assets;
    const skin = new THREE.MeshStandardMaterial({ color: '#5a7a3a', roughness: 0.75, side: THREE.DoubleSide }), dark = new THREE.MeshStandardMaterial({ color: '#2a1d18', roughness: 0.9 });
    const nm = ['limb_hand_avatar', 'limb_hand_jean', 'limb_hand_amber', 'limb_hand_mona'].find(n => A && A.has && A.has(n));
    if (nm) {
      const m = A.clone(nm); m.traverse(o => { if (o.isMesh) { o.material = /cut/i.test(o.name) ? dark : skin; o.frustumCulled = false; o.renderOrder = 2; } });
      const w = new THREE.Group(); w.add(m); w.scale.set(mirror ? -1.55 : 1.55, 1.55, 1.55); g.add(w); // 腕在原点，手指朝 -Z，掌心朝 -Y
    }
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.045, 0.26, 14), skin); arm.rotation.x = PI / 2; arm.position.set(0, -0.005, 0.15); arm.frustumCulled = false; g.add(arm);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.054, 0.06, 14), new THREE.MeshStandardMaterial({ color: '#3a2a20', roughness: 0.8 })); cuff.rotation.x = PI / 2; cuff.position.set(0, -0.005, 0.07); g.add(cuff);
    return g;
  }
  function ensureRig() {
    if (rig) return rig; const g = new THREE.Group(), L = makeHand(true), R = makeHand(false); g.add(L); g.add(R); rig = { g, L, R }; return rig;
  }

  // ---------------- 姿势（相机局部坐标：x 右，y 上，-z 前）----------------
  // 每个姿势 = { H:[x,y,z,rx,ry,rz], L:[...], R:[...], C:[x,y,z,rx,ry,rz,fov] }；手：rz 决定掌心朝向（0=向下，PI=向上，-PI/2=朝左，PI/2=朝右），rx>0 手指上翘
  const BASE = { H: [0, -0.07, -0.44, -0.1, 0, 0], L: [-0.105, -0.2, -0.43, 0.95, 0, PI / 2 + 0.35], R: [0.105, -0.2, -0.43, 0.95, 0, -PI / 2 - 0.35], C: [0, 0, 0, -0.06, 0, 0, -14] };
  const YOFF = 0.09; // R51：0.04→0.09，动作栏恢复可见后，头（两眼）抬到画面中部偏下，下巴不压栏
  const cp = p => ({ H: p.H.slice(), L: p.L.slice(), R: p.R.slice(), C: p.C.slice() });
  const P = (o) => { const p = cp(BASE); for (const k in o) { if (k === 'dH' || k === 'dC') { const t = k === 'dH' ? p.H : p.C; o[k].forEach((v, i) => t[i] += v); } else p[k] = o[k].slice(); } return p; };
  const RSIDE = [0.13, -0.19, -0.37, 1.05, 0, -PI / 2], LSIDE = [-0.13, -0.19, -0.37, 1.05, 0, PI / 2]; // 双手夹住两侧脸颊
  const RUNDER = [0.035, -0.215, -0.29, 0.22, -0.06, PI];
  // 动作：dur 秒；k = [[时间, 姿势], ...]；cue = [[时间, 音效名], ...]；fx(u,t,p) 每帧附加（抛接的飞行、旋转等）
  const A = {
    stare: { dur: 3.6, k: [[0.9, P({ H: [0, -0.03, -0.3, 0, 0, 0], L: [-0.11, -0.165, -0.26, 1.1, 0, PI / 2], R: [0.11, -0.165, -0.26, 1.1, 0, -PI / 2], dC: [0, 0, 0, 0.05, 0, 0, -8] })], [2.9, P({ H: [0, -0.025, -0.285, -0.02, 0, 0], L: [-0.11, -0.16, -0.25, 1.1, 0, PI / 2], R: [0.11, -0.16, -0.25, 1.1, 0, -PI / 2], dC: [0, 0, 0, 0.06, 0, 0, -10] })]], cue: [[0.4, 'lift'], [1.0, 'heart'], [1.9, 'heart'], [2.8, 'breath']] },
    stroke: { dur: 3.4, k: [[0.35, P({ R: [0.06, 0.12, -0.3, -0.25, 0.5, 0.1] })], [0.95, P({ R: [0.06, 0.085, -0.52, -0.75, 0.5, 0.1], dH: [0, 0, 0, 0.1, 0, 0] })], [1.2, P({ R: [0.07, 0.16, -0.36, -0.2, 0.5, 0.1] })], [1.45, P({ R: [0.03, 0.12, -0.3, -0.25, 0.5, 0.05] })], [2.05, P({ R: [0.03, 0.085, -0.52, -0.75, 0.5, 0.05], dH: [0, 0, 0, 0.1, 0, 0.05] })], [2.3, P({ R: [0.08, 0.16, -0.36, -0.2, 0.5, 0.1] })], [2.55, P({ R: [0.09, 0.1, -0.31, -0.25, 0.5, 0.3] })], [3.0, P({ R: [0.13, 0.02, -0.5, -0.9, 0.5, 0.9], dH: [0, 0, 0, 0.06, 0, -0.08] })]], cue: [[0.4, 'hair'], [1.5, 'hair'], [2.6, 'hair']], sway: 1 },
    sniff: { dur: 3.0, k: [[0.8, P({ H: [0, -0.11, -0.27, 0.22, 0, 0], L: [-0.03, -0.26, -0.1, 0.5, 0.06, PI], R: [0.12, -0.13, -0.2, 1.0, 0, -PI / 2], dC: [0, -0.02, 0, -0.1, 0, 0, -4] })], [2.3, P({ H: [0.01, -0.105, -0.26, 0.28, 0.12, 0], L: [-0.03, -0.26, -0.09, 0.5, 0.06, PI], R: [0.12, -0.13, -0.19, 1.0, 0, -PI / 2], dC: [0, -0.025, 0, -0.2, 0, 0, -4] })]], cue: [[0.95, 'sniff'], [1.45, 'sniff'], [2.1, 'sniffL']] },
    listen: { dur: 3.4, k: [[0.9, P({ H: [0.16, -0.03, -0.16, 0, -1.25, 0.1], L: [0.08, -0.2, -0.05, 0.4, -0.5, PI], R: [0.3, -0.1, -0.2, 1.0, -0.6, -PI / 2], dC: [0, 0, 0, 0, -0.42, 0.22, 4] })], [2.7, P({ H: [0.155, -0.025, -0.15, 0, -1.3, 0.12], L: [0.08, -0.2, -0.05, 0.4, -0.5, PI], R: [0.3, -0.1, -0.2, 1.0, -0.6, -PI / 2], dC: [0, 0, 0, 0, -0.45, 0.24, 4] })]], cue: [[1.0, 'hush'], [1.7, 'heart'], [2.2, 'whisper']] },
    battle: { dur: 2.6, k: [[0.5, P({ H: [0, 0.0, -0.64, -0.12, 0, 0], L: [-0.3, -0.45, -0.3, 0.2, 0.3, PI], R: [0.02, 0.19, -0.57, -1.35, 0, 0], dC: [0, 0, 0, 0.02, 0, 0, -4] })], [2.1, P({ H: [0, 0.01, -0.62, -0.1, 0, 0.05], L: [-0.3, -0.45, -0.3, 0.2, 0.3, PI], R: [0.02, 0.2, -0.55, -1.35, 0, 0], dC: [0, 0, 0, 0.02, 0, 0, -4] })]], cue: [[0.25, 'draw'], [0.9, 'chop'], [1.3, 'drone'], [1.6, 'heavy']], fx(u, t, p) { if (t > 0.8 && t < 2.1) { const a = Math.sin(t * 38) * 0.04 * (2.1 - t); p.H[4] += a; p.H[5] += a * 0.6; } }, flash: 1 },
    // ---- 把玩 ----
    toss: { dur: 2.3, play: 1, k: [[0.35, P({ dH: [0, -0.06, 0, 0, 0, 0], L: [-0.05, -0.28, -0.3, 0.3, 0.06, PI], R: [0.05, -0.28, -0.3, 0.3, -0.06, PI] })], [0.55, P({ dH: [0, 0.04, 0, 0, 0, 0], L: [-0.05, -0.12, -0.33, 0.6, 0.06, PI], R: [0.05, -0.12, -0.33, 0.6, -0.06, PI] })], [1.35, P({ L: [-0.05, -0.2, -0.33, 0.35, 0.06, PI], R: [0.05, -0.2, -0.33, 0.35, -0.06, PI], dC: [0, 0, 0, 0.05, 0, 0, 0] })], [1.5, P({ dH: [0, -0.07, 0, 0, 0, 0], L: [-0.05, -0.3, -0.31, 0.2, 0.06, PI], R: [0.05, -0.3, -0.31, 0.2, -0.06, PI] })], [1.85, P({ R: RUNDER })]], cue: [[0.55, 'whoosh'], [1.42, 'catch']], sway: 1,
      fx(u, t, p) { if (t > 0.55 && t < 1.42) { const f = (t - 0.55) / 0.87; p.H[1] += 4 * f * (1 - f) * 0.2; p.H[3] += f * 2 * PI; p.C[3] += 4 * f * (1 - f) * 0.42; } } },
    spin: { dur: 2.6, play: 1, k: [[0.3, P({ R: [0.2, -0.1, -0.44, 0.9, 0, -PI / 2] })], [0.45, P({ R: [0.03, -0.1, -0.46, 0.9, 0, -PI / 2] })], [0.75, P({ R: [0.22, -0.26, -0.3, 0.5, -0.2, PI / 2 + 0.2] })]], cue: [[0.45, 'flick'], [0.5, 'spin']], sway: 1,
      fx(u, t, p) { if (t > 0.45) { const f = Math.min(1, (t - 0.45) / 1.9), e = 1 - Math.pow(1 - f, 3); p.H[4] += e * 4 * PI; p.H[1] += Math.sin(f * PI) * 0.015; } } },
    poke: { dur: 2.1, play: 1, k: [[0.3, P({ R: [0.2, -0.13, -0.38, 0.6, 0.55, -PI / 2] })], [0.42, P({ R: [0.155, -0.12, -0.4, 0.6, 0.6, -PI / 2] })], [0.6, P({ R: [0.2, -0.13, -0.38, 0.6, 0.55, -PI / 2] })], [0.85, P({ R: [0.155, -0.11, -0.41, 0.6, 0.6, -PI / 2] })], [1.03, P({ R: [0.2, -0.12, -0.39, 0.6, 0.55, -PI / 2] })], [1.3, P({ R: [0.15, -0.12, -0.4, 0.35, 1.3, -PI / 2] })], [1.6, P({ R: [0.22, -0.2, -0.36, 0.4, 1.0, -PI / 2] })]], cue: [[0.42, 'poke'], [0.85, 'poke'], [1.3, 'poke']],
      fx(u, t, p) { for (const tp of [0.42, 0.85, 1.3]) { const d = t - tp; if (d > 0 && d < 0.5) { const k = Math.exp(-d * 9) * Math.sin(d * 30 + 0.3); p.H[5] += 0.13 * k; p.H[4] -= 0.1 * k; p.H[0] -= 0.012 * k; } } } },
    pat: { dur: 1.9, play: 1, k: [[0.3, P({ R: [0.05, 0.2, -0.42, -0.15, 0.45, 0] })], [0.42, P({ R: [0.05, 0.105, -0.44, -0.3, 0.45, 0], dH: [0, -0.012, 0, 0.06, 0, 0] })], [0.6, P({ R: [0.05, 0.2, -0.42, -0.15, 0.45, 0] })], [0.78, P({ R: [0.05, 0.105, -0.44, -0.3, 0.45, 0], dH: [0, -0.012, 0, 0.06, 0, 0] })], [0.95, P({ R: [0.05, 0.19, -0.42, -0.15, 0.45, 0] })], [1.4, P({})]], cue: [[0.42, 'pat'], [0.78, 'pat']], sway: 1 },
    // ---- 建筑解锁（左手托着，右手做事）----
    tea: { dur: 3.6, k: [[0.8, P({ H: [0, -0.05, -0.36, 0.12, 0.1, 0], R: [0.06, -0.14, -0.3, 0.9, -0.3, -PI / 2 - 0.4] })], [2.8, P({ H: [0, -0.05, -0.36, 0.16, -0.1, 0], R: [0.06, -0.13, -0.3, 0.9, -0.3, -PI / 2 - 0.4] })]], cue: [[0.7, 'pour'], [1.8, 'sip'], [2.6, 'plate']] },
    mirror: { dur: 3.6, k: [[0.9, P({ H: [0, -0.06, -0.46, 0.04, 0.5, 0], dC: [0, 0, 0, 0, 0.15, 0, 0] })], [2.8, P({ H: [0, -0.06, -0.46, 0.04, -0.3, 0], dC: [0, 0, 0, 0, -0.08, 0, 0] })]], cue: [[0.6, 'bell'], [2.0, 'shimmer']] },
    dress: { dur: 3.4, k: [[0.5, P({ R: [0.1, 0.06, -0.39, -0.4, 0.5, -0.6] })], [1.2, P({ R: [0.12, -0.08, -0.48, -0.6, 0.5, -0.8] })], [1.6, P({ R: [0.1, 0.06, -0.39, -0.4, 0.5, -0.6] })], [2.3, P({ R: [0.12, -0.08, -0.48, -0.6, 0.5, -0.8] })], [2.9, P({ R: [0.09, -0.08, -0.3, 0.9, 0, -PI / 2] })]], cue: [[0.6, 'hair'], [1.7, 'hair'], [2.8, 'dab']], sway: 1 },
    appraise: { dur: 3.0, k: [[0.8, P({ H: [0, -0.06, -0.5, 0.02, 0.15, 0], dC: [0, 0, 0, -0.02, 0, 0, -6] })], [2.4, P({ H: [0, -0.06, -0.5, 0.02, -0.15, 0], dC: [0, 0, 0, -0.02, 0, 0, -6] })]], cue: [[0.5, 'fire'], [1.4, 'metal'], [2.2, 'coins']], fx(u, t, p) { p.H[4] += Math.sin(t * 20) * 0.01; } },
    chess: { dur: 2.2, k: [[0.6, P({ H: [-0.02, -0.06, -0.42, 0.1, -0.25, 0] })]], cue: [[0.3, 'book'], [1.0, 'page']] },
    card: { dur: 2.2, k: [[0.6, P({ H: [0.02, -0.06, -0.42, 0.05, 0.25, 0] })]], cue: [[0.3, 'page'], [1.1, 'shimmer']] }
  };
  const PLAY = { toss: { ic: '🤹', n: '抛接', d: '把她往上一抛，再稳稳接住' }, spin: { ic: '🌀', n: '转一圈', d: '托在掌心，拨着她转起来' }, poke: { ic: '👉', n: '戳脸颊', d: '用指尖戳一戳她冰凉的脸颊' }, pat: { ic: '🫳', n: '拍拍头', d: '轻轻拍两下她的头顶' } };
  const PLAY_TXT = {
    toss: ['她在半空翻了一圈，头发散开，又“噗”地落回你掌心。', '你把她抛得老高——落下来的时候，她的脸正好对着你。', '接住的那一下很沉，沉得你手腕一麻。'],
    spin: ['她在你掌心里转起来，发梢甩成一圈，慢慢停下时正好对着你。', '转了两圈，她的脸在火光里一明一暗。', '你拨得太用力，她转得像只陀螺。'],
    poke: ['指尖陷进她的脸颊，软的，凉的，弹回来。', '戳一下，她的头就往旁边歪一点——像是在躲你。', '你又戳了一下。她当然不会生气。'],
    pat: ['“啪、啪”两下，她的头在你掌心里点了点。', '你拍拍她的头顶，像在安抚一个睡着的人。', '拍完，她的发丝乱了一小撮。']
  };

  // ---------------- 音效（样本 + 合成）----------------
  function noise(t, dur, vol, type, f0, f1, q) {
    const X = SFX.ctx; if (!X) return; const n = Math.max(1, Math.floor(X.sampleRate * dur)), b = X.createBuffer(1, n, X.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = X.createBufferSource(); s.buffer = b; const f = X.createBiquadFilter(); f.type = type; f.Q.value = q || 1; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = X.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.05, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(SFX.out); s.start(t); s.stop(t + dur + 0.02);
  }
  function tone(t, f0, f1, dur, vol, type) { const X = SFX.ctx; if (!X) return; const o = X.createOscillator(), g = X.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(SFX.out); o.start(t); o.stop(t + dur + 0.02); }
  function snd(k) {
    if (!window.SFX || !SFX.on) return; const X = SFX.ctx; const t = X ? X.currentTime : 0; const P_ = (n, v, r) => SFX.play && SFX.play(n, v, r || 1);
    try {
      switch (k) {
        case 'lift': P_('sack', 0.22, 1.3); break;
        case 'heart': SFX.heartbeat && SFX.heartbeat(); break;
        case 'breath': noise(t, 0.9, 0.05, 'bandpass', 500, 300, 0.7); break;
        case 'hair': noise(t, 0.55, 0.09, 'highpass', 2500, 5000, 0.6); noise(t + 0.08, 0.4, 0.05, 'bandpass', 6000, 3500, 1.5); break;
        case 'sniff': noise(t, 0.28, 0.12, 'bandpass', 1400, 3200, 2); break;
        case 'sniffL': noise(t, 0.7, 0.13, 'bandpass', 900, 2600, 1.6); break;
        case 'hush': noise(t, 1.2, 0.04, 'lowpass', 400, 200, 0.5); break;
        case 'whisper': for (let i = 0; i < 5; i++) noise(t + i * 0.13, 0.11, 0.05, 'bandpass', 2200 + Math.random() * 1500, 0, 3); break;
        case 'draw': P_('draw', 0.35); break;
        case 'chop': P_('chop', 0.45, 0.8); break;
        case 'drone': tone(t, 55, 40, 1.4, 0.12, 'sawtooth'); noise(t, 1.2, 0.05, 'lowpass', 200, 80); break;
        case 'heavy': P_('heavy', 0.4); break;
        case 'whoosh': noise(t, 0.4, 0.14, 'bandpass', 500, 2400, 1.2); break;
        case 'catch': P_('thud', 0.35, 1.25); P_('sack', 0.4, 1.1); break;
        case 'flick': SFX.squish && SFX.squish(0.35); break;
        case 'spin': noise(t, 1.8, 0.05, 'bandpass', 3200, 900, 1.4); break;
        case 'poke': SFX.squish && SFX.squish(0.45); tone(t, 420, 260, 0.08, 0.05); break;
        case 'pat': P_('thud', 0.14, 1.7); noise(t, 0.12, 0.06, 'lowpass', 900); break;
        case 'pour': noise(t, 1.0, 0.07, 'bandpass', 1800, 1200, 2.5); break;
        case 'sip': noise(t, 0.3, 0.05, 'bandpass', 1200, 2400, 3); break;
        case 'plate': P_('plate', 0.3); break;
        case 'bell': P_('bell', 0.35); break;
        case 'shimmer': [0, 0.07, 0.14, 0.21].forEach((d, i) => tone(t + d, 1800 + i * 300, 2400 + i * 300, 0.35, 0.03, 'triangle')); break;
        case 'dab': noise(t, 0.1, 0.05, 'bandpass', 3000, 0, 2); break;
        case 'fire': for (let i = 0; i < 7; i++) noise(t + Math.random() * 0.8, 0.04, 0.08, 'highpass', 1500); noise(t, 1.0, 0.04, 'lowpass', 300); break;
        case 'metal': P_('metal', 0.3); break;
        case 'coins': P_('coins', 0.35); break;
        case 'book': P_('book', 0.4); break;
        case 'page': P_('page', 0.4); break;
        case 'open': P_('sack', 0.25, 1.2); noise(t, 0.5, 0.03, 'lowpass', 500, 250); break;
        case 'close': P_('sack', 0.25, 0.9); break;
        case 'reveal': [0, 4, 7].forEach((n, i) => tone(t + i * 0.09, 523 * Math.pow(2, n / 12), 523 * Math.pow(2, n / 12), 0.5, 0.05, 'triangle')); break;
        case 'deny': P_('error', 0.3); break;
      }
    } catch (e) { }
  }

  // ---------------- UI ----------------
  const CSS = `#riw{position:fixed;inset:0;z-index:70;pointer-events:none;color:#efe4d4;font:14px/1.55 system-ui,'PingFang SC','Microsoft YaHei',sans-serif;opacity:0;transition:opacity .35s}
#riw.on{opacity:1}#riw .vg{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,transparent 42%,rgba(0,0,0,.55) 100%)}#riw .fl{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 30%,#8a0010 100%);opacity:0}
#riw .rcard{position:absolute;left:18px;top:18px;width:318px;max-height:calc(100% - 230px);overflow:auto;pointer-events:auto;background:rgba(14,10,12,.82);border:1px solid rgba(232,192,112,.28);border-left:4px solid var(--c);border-radius:12px;padding:12px 14px;box-shadow:0 8px 28px #0009}
#riw .rr{font-size:12px;letter-spacing:.25em;color:var(--c)}#riw .nm{font:700 22px/1.25 serif;letter-spacing:.06em;margin:2px 0}#riw .rtt{font-size:12px;color:#c9b59c}#riw .id{font-size:12.5px;color:#d9ccb8;margin-top:4px}
#riw .pg{display:flex;align-items:center;gap:8px;margin:9px 0 8px;font-size:12px;color:#c9b59c}#riw .pg i{flex:1;height:6px;background:#0008;border-radius:3px;overflow:hidden}#riw .pg i b{display:block;height:100%;background:linear-gradient(90deg,#c03040,#ffd27a);transition:width .6s}
#riw .fr{display:grid;grid-template-columns:22px 70px 1fr;gap:4px;align-items:baseline;padding:4px 6px;border-radius:6px;font-size:12.5px;cursor:pointer}#riw .fr:hover{background:#ffffff10}#riw .fr .i{text-align:center}#riw .fr .n{color:#bba88f}#riw .fr .v{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#f4eadb}
#riw .fr.open .v{white-space:normal;overflow:visible;line-height:1.55}#riw .fr.open{background:#ffffff0d}#riw .fr:not(.u) .n:after{content:' ▸';color:#8a7660;font-size:10px}#riw .fr.open .n:after{content:' ▾'}#riw .fr.u .v{color:#7d6d62}#riw .fr.u .v em{font-style:normal;color:#e8c070;margin-left:4px}#riw .fr.nw{animation:riwn 1.8s}@keyframes riwn{0%,40%{background:rgba(255,210,122,.35)}}
#riw .rbar{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);display:flex;gap:14px;align-items:flex-end;pointer-events:auto}
#riw .grp{display:flex;flex-direction:column;align-items:center;gap:4px}#riw .grp>small{font-size:11px;letter-spacing:.3em;color:#bba88f;text-shadow:0 1px 4px #000}#riw .grp>div{display:flex;gap:6px}
#riw .b{position:relative;width:66px;height:70px;border-radius:10px;background:rgba(18,12,14,.86);border:1px solid rgba(232,192,112,.3);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:transform .1s,border-color .15s,background .15s}
#riw .b:hover{transform:translateY(-3px);border-color:#ffd27a;background:rgba(60,34,30,.92)}#riw .b .ic{font-size:25px;line-height:1.1}#riw .b .l{font-size:11.5px;margin-top:3px;white-space:nowrap}#riw .b .k{position:absolute;left:4px;top:2px;font:700 10px monospace;color:#e8c070}
#riw .b.dn:after{content:'✓';position:absolute;right:5px;top:2px;font-size:11px;color:#9fe08a}#riw .b.lk{filter:grayscale(1) brightness(.5);cursor:not-allowed}#riw .b.lk:hover{transform:none}#riw .b.run{border-color:#ffd27a;box-shadow:0 0 14px #ffd27a66}
#riw.busy .b:not(.run){opacity:.45;pointer-events:none}
#riw .tipb{position:absolute;bottom:100px;left:50%;transform:translateX(-50%);font-size:12px;color:#ffcf9a;background:rgba(14,10,12,.9);padding:4px 10px;border-radius:6px;display:none;white-space:nowrap}
#riw .sub{position:absolute;left:50%;bottom:124px;transform:translateX(-50%);width:min(700px,calc(100% - 720px));min-width:380px;text-align:center;font-size:15.5px;line-height:1.8;text-shadow:0 2px 6px #000,0 0 2px #000;background:linear-gradient(90deg,transparent,rgba(8,5,6,.72) 12%,rgba(8,5,6,.72) 88%,transparent);padding:10px 40px;transition:opacity .3s}
#riw .sub .d{color:#b4a290;font-size:13.5px}#riw .sub .g{color:#ffd27a}#riw .pr{position:absolute;left:50%;bottom:112px;transform:translateX(-50%);width:220px;height:3px;background:#0007;border-radius:2px;overflow:hidden;opacity:0;transition:opacity .2s}#riw .pr b{display:block;height:100%;width:0;background:#ffd27a}
#riw .hint{position:absolute;top:14px;left:50%;transform:translateX(-50%);font-size:12px;color:#d8c8b2;background:rgba(14,10,12,.6);padding:4px 12px;border-radius:14px;white-space:nowrap}#riw .hint b{color:#ffd27a;font-weight:600}
#riw .x{position:absolute;right:18px;top:14px;pointer-events:auto;padding:7px 14px;border-radius:10px;background:rgba(18,12,14,.85);border:1px solid rgba(232,192,112,.35);color:#efe4d4;cursor:pointer;font:13px system-ui}#riw .x:hover{border-color:#ffd27a}
#riw .pn{position:absolute;right:18px;top:60px;width:390px;max-height:calc(100% - 260px);overflow:auto;pointer-events:auto;background:rgba(14,10,12,.9);border:1px solid rgba(232,192,112,.35);border-radius:12px;padding:14px 18px;display:none;box-shadow:0 10px 36px #000b}#riw .pn.on{display:block;animation:riwp .3s}@keyframes riwp{from{opacity:0;transform:translateX(12px)}}
#riw .pn .px{position:absolute;right:10px;top:6px;cursor:pointer;color:#9d8a78}#riw .pn p{margin:4px 0;font-size:13.5px;line-height:1.7}
body.riw-on #cross,body.riw-on #tip,body.riw-on #hint,body.riw-on #labels,body.riw-on #hud{opacity:0!important;transition:opacity .3s}
html body.riw-on #hud,html body.riw-on #labels,html body.riw-on #cross,html body.riw-on #toast,html body.riw-on #hintTag,html body.riw-on #feelBubble,html body.riw-on #spbubs,html body.riw-on #spchip,html body.riw-on #tip,html body.riw-on #hint{visibility:hidden!important;opacity:0!important}`;
  function build() {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    el = document.createElement('div'); el.id = 'riw';
    el.innerHTML = `<div class="vg"></div><div class="fl"></div><div class="rcard"></div><div class="hint"><b>拖动鼠标</b> 转动她　<b>滚轮</b> 拿近 / 拿远　<b>数字键</b> 动作　<b>F / Esc</b> 放下</div><button class="x">✕ 放下（F）</button>
      <div class="pn rc-host"><span class="px">✕</span><div class="rpb"></div></div><div class="sub"></div><div class="pr"><b></b></div><div class="tipb"></div><div class="rbar"></div>`;
    document.body.appendChild(el);
    el.querySelector('.x').onclick = () => close(); el.querySelector('.px').onclick = () => panel(null);
    el.querySelector('.rbar').addEventListener('click', e => { const b = e.target.closest('.b'); if (b) go(b.dataset.a); });
    el.querySelector('.rbar').addEventListener('mouseover', e => { const b = e.target.closest('.b'), t = el.querySelector('.tipb'); if (!b) { t.style.display = 'none'; return; } t.innerHTML = b.dataset.tip || ''; t.style.display = b.dataset.tip ? 'block' : 'none'; });
    el.querySelector('.rbar').addEventListener('mouseleave', () => el.querySelector('.tipb').style.display = 'none');
    el.querySelector('.rcard').addEventListener('click', e => { const f = e.target.closest('.fr'); if (!f) return; const k = f.dataset.k, F = Recall.FK[k]; if (Recall.known(S.rec.c, k)) { S.openRows = S.openRows || new Set(); if (S.openRows.has(k)) S.openRows.delete(k); else S.openRows.add(k); f.classList.toggle('open', S.openRows.has(k)); } if (!Recall.known(S.rec.c, k)) { sub(`<span class="d">还想不起来她的${F.n}。试试「${esc(howTo(k))}」。</span>`); return; } sub(`<b>${F.ic} ${F.n}</b>：${esc(F.v(S.rec))}`); if (k === 'fight') panel(Recall.fightHTML(S.rec)); else if (k === 'chess') panel(Recall.chessHTML(S.rec)); else if (k === 'card') panel(Recall.cardHTML(S.rec)); else if (k === 'rank' && window.Ranks) panel(`<div class="rc-p-h">阶位 · 传承</div>${Ranks.ladderHTML(S.rec.c)}`); else if (k === 'bio' && window.Overhear) panel(`<div class="rc-p-h">小习惯与秘密</div>${Overhear.bioHTML(S.rec.c)}`); });
  }
  // 哪个动作能想起哪一项
  function howTo(k) { const out = []; for (const a of Object.keys(Recall.ACT)) { const x = Recall.ACT[a]; if (a === 'handle') continue; if (x.fac === k || x.fac2 === k) out.push(x.n); } if (k === 'adorn') out.unshift('把玩'); if (k === 'rank') out.push('想起任意 4 项'); if (k === 'goal') out.push('想起 7 项'); return out.join(' / ') || '？'; }
  let subT = 0;
  function sub(html) { const s = el.querySelector('.sub'); s.style.opacity = 0; clearTimeout(subT); subT = setTimeout(() => { s.innerHTML = html; s.style.opacity = 1; }, 120); }
  function panel(html) { const p = el.querySelector('.pn'); if (!html) { p.classList.remove('on'); return; } p.querySelector('.rpb').innerHTML = html; p.classList.add('on'); }
  let ORD = [];
  function refresh(fresh) {
    const r = S.rec, c = r.c, K = Recall.known, n = Recall.nKnown(c), tot = Recall.FAC.length;
    const card = el.querySelector('.rcard'); card.style.setProperty('--c', RC[c.rar] || '#ccc');
    const title = window.Ranks && K(c, 'rank') ? Ranks.text(c) : (c.title || '');
    card.innerHTML = `<div class="rr">${RN[c.rar] || ''}${c.shiny ? ' · ✨异色' : ''}</div><div class="nm">${esc(window.NM ? NM(c) : c.name)}</div>${title ? `<div class="rtt">${esc(title)}</div>` : ''}
      <div class="id">${K(c, 'race') ? esc(`${c.raceN} · ${c.idN} · ${c.age} 岁`) : '身份：？？？'} · 得自 ${esc(c.locN || '？')}</div>
      <div class="pg">记忆 <i><b style="width:${n / tot * 100}%"></b></i> ${n} / ${tot}</div>` +
      Recall.FAC.map(f => { const k = K(c, f.k); return `<div class="fr${k ? '' : ' u'}${fresh === f.k ? ' nw' : ''}${k && S.openRows && S.openRows.has(f.k) ? ' open' : ''}" data-k="${f.k}" title="${k ? esc(f.v(r)) : '点击查看怎么想起'}"><span class="i">${f.ic}</span><span class="n">${f.n}</span><span class="v">${k ? esc(f.v(r)) : `？？？<em>${esc(howTo(f.k).split(' / ')[0])}</em>`}</span></div>`; }).join('');
    // 动作栏
    ORD = []; const grp = (name, keys) => { let h = `<div class="grp"><small>${name}</small><div>`; for (const a of keys) { const x = PLAY[a] || Recall.ACT[a], lock = x.need && !Recall.hasB(x.need); ORD.push(a); const i = ORD.length, key = i <= 9 ? i : i === 10 ? 0 : ''; const done = !PLAY[a] && !lock && K(c, x.fac); const tip = lock ? `🔒 需要建筑：${esc(Recall.bn(x.need))}` : `${esc(x.d)}${PLAY[a] ? '' : `　→ 想起：${esc(Recall.FK[x.fac].n)}`}`; h += `<div class="b${lock ? ' lk' : ''}${done ? ' dn' : ''}${S.act === a ? ' run' : ''}" data-a="${lock ? '' : a}" data-tip="${tip}"><span class="k">${key}</span><span class="ic">${x.ic}</span><span class="l">${x.n.replace(/ ·.*$/, '')}</span></div>`; } return h + '</div></div>'; };
    const bld = ['seance', 'tea', 'mirror', 'dress', 'appraise', 'chess', 'card'], avail = bld.filter(a => Recall.hasB(Recall.ACT[a].need)), lockd = bld.filter(a => !Recall.hasB(Recall.ACT[a].need));
    el.querySelector('.rbar').innerHTML = grp('回忆', ['stare', 'stroke', 'sniff', 'listen', 'battle']) + grp(`把玩 ${Math.min(8, S.play)}/8`, ['toss', 'spin', 'poke', 'pat']) + grp('建筑', avail.concat(lockd).slice(0, Math.max(3, avail.length)));
    el.classList.toggle('busy', !!S.act);
  }

  // ---------------- 动作 ----------------
  function go(a) {
    if (!a || !S.active || S.act) return; const x = PLAY[a] || Recall.ACT[a]; if (!x) return;
    if (x.need && !Recall.hasB(x.need)) { snd('deny'); return; }
    if (a === 'seance') { seance(); return; }
    const D = A[a]; if (!D) return; panel(null);
    S.act = a; S.t = 0; S.dur = D.dur; S.cueI = 0; S.pend = PLAY[a] ? null : Recall.narrate(a, S.rec);
    sub(`<span class="d">${esc(x.d)}……</span>`); el.querySelector('.pr').style.opacity = 1; refresh();
  }
  function finish(a) {
    const rec = S.rec; S.act = ''; el.querySelector('.pr').style.opacity = 0; el.querySelector('.fl').style.opacity = 0;
    if (PLAY[a]) {
      S.play++; const L = PLAY_TXT[a]; let t = L[(S.play + a.length) % L.length];
      if (S.play >= 8 && !Recall.known(rec.c, 'adorn')) { Recall.reveal(rec, 'adorn'); snd('reveal'); t += `<br>${esc(Recall.narrate('handle', rec).t.replace(/<[^>]+>/g, ''))}<br><span class="g">— 想起了她的饰物与印记 —</span>`; refresh('adorn'); }
      else { if (!Recall.known(rec.c, 'adorn')) t += `<br><span class="d">（再把玩 ${8 - S.play} 下，也许会发现些什么）</span>`; refresh(); }
      sub(t); return;
    }
    const x = Recall.ACT[a], r = S.pend || Recall.narrate(a, rec); S.pend = null;
    const first = Recall.reveal(rec, x.fac); if (x.fac2) Recall.reveal(rec, x.fac2, true);
    if (first) snd('reveal');
    sub(r.t + (first ? `<br><span class="g">— 想起了她的${Recall.FK[x.fac].n} —</span>` : ''));
    if (r.panel) panel(r.panel); refresh(first ? x.fac : '');
  }
  function seance() {
    if (!window.Seance || Seance.active) return; const rec = S.rec; el.style.visibility = 'hidden';
    Seance.open(rec, { onApply() { }, onClose() { el.style.visibility = ''; Recall.reveal(rec, 'story'); sub('你从通灵里回过神来，她的一生在脑子里转了一圈。<br><span class="g">— 想起了她的生平 —</span>'); refresh('story'); } });
  }

  // ---------------- 每帧：相机 + 手 + 头 ----------------
  const _c = new THREE.Vector3(), _e = new THREE.Euler(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _q2 = new THREE.Quaternion();
  const sm = x => x * x * (3 - 2 * x);
  function lerpP(a, b, k) { const o = {}; for (const n of ['H', 'L', 'R', 'C']) o[n] = a[n].map((v, i) => v + (b[n][i] - v) * k); return o; }
  function sample(a, t) { // 关键帧插值（首尾都是 BASE）
    const D = A[a], ks = [[0, BASE]].concat(D.k, [[D.dur, BASE]]);
    for (let i = 0; i < ks.length - 1; i++) { const [t0, p0] = ks[i], [t1, p1] = ks[i + 1]; if (t <= t1) return lerpP(p0, p1, sm(Math.max(0, Math.min(1, (t - t0) / Math.max(1e-3, t1 - t0))))); }
    return cp(BASE);
  }
  let cur = null;
  // R51：头大小/位置——旧算法用整颗头的包围盒：k = 盒高/0.26、对准盒中心。同一张脸因发长不同 k 从 1.4 跳到 3（长发=拿得远=头显得特别小），
  // 戴高帽子则盒中心上移、脸沉到动作栏后面。ModelHeads 已按脸把每颗头归一（hb.group 缩放 1.55~1.59），所以：
  //   k = 1.4 × 头组世界缩放 / 1.55（与发型、帽子无关）；对准点 = 两眼（iris 网格）中心，没有 iris 才退回盒中心。
  //   刚生成的头网格可能未就绪 → 打开后 0.6s / 1.6s 各复测一次，k 与对准点平滑过渡。
  const _ws = new THREE.Vector3();
  function faceFit(h) {
    const root = h.hb && h.hb.group ? h.hb.group : h.g, q0 = h.g.quaternion.clone(); h.g.quaternion.identity(); h.g.updateMatrixWorld(true);
    root.getWorldScale(_ws); const k = Math.max(1.1, Math.min(1.8, 1.4 * Math.abs(_ws.x) / 1.55));
    const eb = new THREE.Box3(), tb = new THREE.Box3(); let ne = 0;
    root.traverse(o => { if (o.isMesh && o.userData && o.userData.kind === 'iris' && o.geometry) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); tb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); eb.union(tb); ne++; } });
    let hc = null; if (ne) { hc = eb.getCenter(new THREE.Vector3()).sub(h.g.position); if (hc.length() > 0.6) hc = null; }
    h.g.quaternion.copy(q0); h.g.updateMatrixWorld(true);
    return { k, hc };
  }
  function pre(dt, now) {
    if (S.active && S.h) { const el2 = performance.now() - (S.openAt || 0); if ((S.kM === 0 && el2 > 600) || (S.kM === 1 && el2 > 1600)) { S.kM++; const ff = faceFit(S.h); S.kT = ff.k; if (ff.hc) S.hcT = ff.hc; } const a5 = Math.min(1, (dt || 0.016) * 5); if (S.kT && Math.abs(S.kT - S.k) > 1e-3) S.k += (S.kT - S.k) * a5; if (S.hcT && S.hc) S.hc.lerp(S.hcT, a5); }
    if (!S.active || !S.h) return; const cam = G.camera, h = S.h;
    if (!G.uiOpen && G.setUI) G.setUI(true); if (document.pointerLockElement) try { document.exitPointerLock(); } catch (e) { } // R54p：别的模块/连点复位把鼠标重新锁住 → 突然变回第一人称
    if (!h.g || !h.g.parent) { close(true); return; }
    S.openT = Math.min(1, S.openT + dt / 0.55); const oe = sm(S.openT);
    let tgt;
    if (S.act) {
      const D = A[S.act]; if (!S.freeze) S.t += dt; while (D.cue && S.cueI < D.cue.length && S.t >= D.cue[S.cueI][0]) snd(D.cue[S.cueI++][1]);
      tgt = sample(S.act, S.t); if (D.fx) D.fx(S.t / D.dur, S.t, tgt); if (D.flash) el.querySelector('.fl').style.opacity = Math.max(0, Math.sin(Math.min(1, S.t / D.dur) * PI)) * 0.45;
      if (D.flash && S.t > 0.9 && S.t < 1.8) S.shake = 0.012;
      el.querySelector('.pr b').style.width = Math.min(100, S.t / D.dur * 100) + '%';
      if (D.sway && h.hb && h.hb.setSway) { const k = 0.028; h.hb.setSway(_v.set(Math.sin(S.t * 9) * k, 0, Math.cos(S.t * 7) * k * 0.6)); }
      if (S.t >= D.dur) { const a = S.act; finish(a); }
    } else {
      tgt = cp(BASE); const br = Math.sin(now * 1.3) * 0.004; tgt.H[1] += br; tgt.L[1] += br; tgt.R[1] += br * 0.6; // 呼吸
      if (h.hb && h.hb.setSway) h.hb.setSway(_v.set(0, 0, 0));
    }
    tgt.H[1] += YOFF; tgt.L[1] += YOFF; tgt.R[1] += YOFF;
    // 用户拖动/滚轮（叠加在头上；动作期间也保留）
    tgt.H[4] += S.yaw; tgt.H[3] += S.pitch; tgt.H[2] += S.dist; tgt.L[2] += S.dist; if (!S.act) tgt.R[2] += S.dist;
    if (!cur || S.snap) cur = tgt; else cur = lerpP(cur, tgt, 1 - Math.exp(-dt * 14));
    // 打开/关闭过渡：从手里原来的位置平滑过渡
    // 相机
    const C = cur.C; S.shake *= Math.exp(-dt * 8);
    _v.set(C[0] * oe + (Math.random() - 0.5) * S.shake, C[1] * oe + (Math.random() - 0.5) * S.shake, C[2] * oe).applyQuaternion(cam.quaternion); cam.position.add(_v);
    cam.rotateX(C[3] * oe); cam.rotateY(C[4] * oe); cam.rotateZ(C[5] * oe);
    const fov = S.fov0 * (1 - 0.14 * oe) + C[6] * oe; if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld(true);
    // 手
    const R = ensureRig(); if (R.g.parent !== cam) cam.add(R.g);
    const setHand = (m, p) => { m.position.set(p[0], p[1] - (1 - oe) * 0.35, p[2]); m.rotation.set(p[3], p[4], p[5], 'XYZ'); };
    R.g.scale.setScalar(S.k || 1); setHand(R.L, cur.L); setHand(R.R, cur.R); R.g.visible = true;
    // 头：世界坐标 = 相机局部
    const Hh = cur.H, kk = S.k || 1; _v.set(Hh[0] * kk, Hh[1] * kk, Hh[2] * kk); cam.localToWorld(_v);
    _e.set(Hh[3], Hh[4], Hh[5], 'XYZ'); _q.setFromEuler(_e); _q2.copy(cam.quaternion).multiply(_q); if (S.hc) _v.sub(_c.copy(S.hc).applyQuaternion(_q2)); if (oe < 1) h.g.quaternion.slerp(_q2, oe); else h.g.quaternion.copy(_q2);
    if (oe < 1) h.g.position.lerp(_v, oe); else h.g.position.copy(_v);
    h.g.updateMatrixWorld(true); if (h.vel) h.vel.set(0, 0, 0); h.sleep = 0;
  }

  // ---------------- 输入 ----------------
  function onKey(e) {
    if (!S.active) return;
    if (e.type !== 'keydown') { if (e.code === 'KeyE' || e.code === 'KeyF') e.stopImmediatePropagation(); return; } /* R33b：松开 F 不再关闭（之前按 F 打开、松手即关 → 看起来像没打开）；其余松开事件放行，避免移动键卡住 */
    if (e.repeat || performance.now() - (S.openAt || 0) < 300) { e.stopImmediatePropagation(); e.preventDefault(); return; }
    if (e.code === 'Escape' || e.code === 'KeyF') { e.preventDefault(); e.stopImmediatePropagation(); close(); return; }
    e.stopImmediatePropagation();
    const m = /^Digit(\d)$/.exec(e.code); if (m) { const i = m[1] === '0' ? 10 : +m[1]; const a = ORD[i - 1]; if (a) { const x = PLAY[a] || Recall.ACT[a]; if (!x.need || Recall.hasB(x.need)) go(a); else snd('deny'); } }
  }
  function onDown(e) { if (!S.active || e.target.closest && e.target.closest('#riw .rcard,#riw .rbar,#riw .pn,#riw .x')) return; S.drag = { x: e.clientX, y: e.clientY, acc: 0 }; e.preventDefault(); }
  function onMove(e) { if (!S.active || !S.drag) return; const dx = e.clientX - S.drag.x, dy = e.clientY - S.drag.y; S.drag.x = e.clientX; S.drag.y = e.clientY; S.yaw += dx * 0.012; S.pitch = Math.max(-0.9, Math.min(0.9, S.pitch + dy * 0.008)); S.drag.acc += Math.abs(dx) * 0.012 + Math.abs(dy) * 0.008; if (S.drag.acc > 1.4) { S.drag.acc = 0; S.play++; if (window.SFX && SFX.on && SFX.ctx) noise(SFX.ctx.currentTime, 0.3, 0.05, 'highpass', 2600, 4200, 0.6); if (S.play === 8 && !Recall.known(S.rec.c, 'adorn')) finish('pat'); else refresh(); } }
  function onUp() { if (S.drag) { S.drag = null; } }
  function onWheel(e) { if (!S.active) return; if (e.target.closest && e.target.closest('#riw .rcard,#riw .pn')) return; e.preventDefault(); e.stopPropagation(); S.dist = Math.max(-0.28, Math.min(0.14, S.dist + (e.deltaY > 0 ? 0.02 : -0.02))); }
  // 按住左键时也会触发 game.js 的把玩(poke)；回忆中屏蔽 canvas 的 mousedown
  function block(e) { if (S.active && !(e.target.closest && e.target.closest('#riw'))) { e.stopImmediatePropagation(); } }

  // ---------------- 开关 ----------------
  function findHead(rec) { const h = G.heads.find(x => x.rec === rec || (x.rec && rec.id != null && x.rec.id === rec.id)) || null; return h && h.mount ? null : h; } /* 装在架子/身体上的不拔下来，用临时首级 */
  function tempHead(rec) {
    try { if (!window.ModelHeads || !rec.look) return null; const hb = ModelHeads.create(rec.look); const g = new THREE.Group(); hb.group.scale.setScalar(1.55); hb.group.position.y = -0.005; g.add(hb.group); G.scene.add(g); const cam = G.camera; g.position.copy(cam.position).add(new THREE.Vector3(0, -0.25, -0.7).applyQuaternion(cam.quaternion)); g.quaternion.copy(cam.quaternion);
      return { rec, hb, g, temp: true, vel: new THREE.Vector3() }; } catch (e) { console.warn('RecallIW temp', e); return null; }
  }
  function open(rec, cb) {
    G = window.G; if (!G || !rec || S.active) return false;
    if (window.Worlds && Worlds.active) return false;
    let h = findHead(rec);
    if (!h) h = tempHead(rec); /* R33b：头不在洞里（库房/装在角色身上/卡片里点「回忆」）→ 临时生成一颗捧在手上，关闭即消失，不改存档 */
    if (!h) return false;
    if (!el) build();
    if (!hooked) { G.HOOK.pre.push(pre); hooked = true; addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true); addEventListener('pointerdown', onDown, true); addEventListener('pointermove', onMove); addEventListener('pointerup', onUp); addEventListener('wheel', onWheel, { capture: true, passive: false }); addEventListener('mousedown', block, true); }
    if (!h.temp) { if (h.mount && G.unmount) G.unmount(h); G.held = h; h.sleep = 0; }
    { /* 测量首级：包围盒中心（头局部坐标）与高度 → 姿势整体按 k 缩放（设计基准：头高 0.26m） */
      const q0 = h.g.quaternion.clone(); h.g.quaternion.identity(); h.g.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(h.hb && h.hb.group ? h.hb.group : h.g), sz = bb.getSize(new THREE.Vector3()), ctr = bb.getCenter(new THREE.Vector3());
      S.hc = ctr.sub(h.g.position); S.k = Math.max(0.5, Math.min(3, (sz.y || 0.26) / 0.26)); { /* R37：非 VRoid 头（MMD 系）的包围盒把发量/发饰/兽耳都算进去（0.27~0.59 vs VRoid 中位 0.30）→ k 偏大 → 手被放大、头显得小。非 VRoid 头的 k 向 VRoid 中位数（1.15）收敛 */ let gp = ''; try { const lk = (h.rec && h.rec.look) || (rec && rec.look); const mt = lk && window.ModelHeads && ModelHeads.meta(lk); gp = (mt && mt.grp) || ''; } catch (e) { } if (gp && gp !== 'vroid') { S.kRaw = S.k; S.k = Math.max(1.05, Math.min(1.3, 1.15 + 0.1 * (S.k - 1.15))); } } { const ff = faceFit(h); S.kOld = S.k; S.k = ff.k; if (ff.hc) S.hc = ff.hc; S.kT = 0; S.hcT = null; S.kM = 0; }
      h.g.quaternion.copy(q0); h.g.updateMatrixWorld(true); S.hsz = sz.toArray().map(v => +v.toFixed(3)); }
    Object.assign(S, { openAt: performance.now(), active: true, h, rec, cb: cb || {}, act: '', openRows: new Set(), t: 0, yaw: 0, pitch: 0, dist: -0.15, drag: null, play: 0, fov0: G.camera.fov, openT: 0, shake: 0, pend: null });
    cur = null; G.setUI(true); document.body.classList.add('riw-on');
    el.style.display = 'block'; requestAnimationFrame(() => el.classList.add('on')); panel(null); refresh();
    const c = rec.c; sub(Recall.nKnown(c) > 3 ? `你把<b>${esc(NM(c))}</b>捧到面前。她的眼睛半睁着，已经不会再眨了。` : `一颗陌生的头。你把她捧到面前——还想不起她是谁。<br><span class="d">试试下面的动作，一点点想起来。</span>`);
    snd('open'); return true;
  }
  function close(silent) {
    if (!S.active) return; S.active = false; const cam = G.camera;
    if (rig && rig.g.parent) rig.g.parent.remove(rig.g);
    cam.fov = S.fov0; cam.updateProjectionMatrix();
    el.classList.remove('on'); setTimeout(() => { if (!S.active) el.style.display = 'none'; }, 350); panel(null);
    document.body.classList.remove('riw-on'); if (S.h && S.h.hb && S.h.hb.setSway) S.h.hb.setSway(_v.set(0, 0, 0));
    if (!silent) snd('close');
    G.setUI(false); G.save && G.save(); if (window.UI && UI.refresh) UI.refresh(); G.lockPointer && G.lockPointer();
    if (S.h && S.h.temp) { S.h.g.parent && S.h.g.parent.remove(S.h.g); try { S.h.hb.dispose && S.h.hb.dispose(); } catch (e) { } }
    S.cb && S.cb.onClose && S.cb.onClose(); S.h = null; S.act = '';
  }
  // 接管 Recall.open：头在洞里 → 原场景回忆；否则旧界面兜底
  function install() {
    if (!window.Recall || Recall._iw) return; const orig = Recall.open; Recall._iw = true;
    Recall.open = function (rec, cb) { if (on()) { try { if (open(rec, cb)) return; } catch (e) { console.warn('RecallIW', e); try { close(true); } catch (e2) { } } } return orig.call(Recall, rec, cb); };
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', install); else install();
  setTimeout(install, 0);
  return { open, close, go, get active() { return S.active; }, _S: S, _A: A, _BASE: BASE, _pre: pre, _snd: snd };
})();
