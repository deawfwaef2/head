// 第六十三轮（R63b）：真实音效包 SfxPack —— CC0 录音（Kenney / OpenGameArt，见 CREDITS.md）+ 战斗分情境 + 多环境声。
// MOD：sfx_pack（真实音效，默认开）、sfx_amb（环境声层，默认开）。关掉 = 回到原来的合成音 / Kenney 老采样。
// 做法：不改原模块的内部逻辑，在运行时“包一层”：
//   · CombatFX.event/swing/thrust/whiff/draw/clang/hurt/enemySwing/windup/roleCue/stamina —— 原合成音照常播（CombatFX.setMix 降到 0.6 垫底），再叠真实录音
//   · SFX.play(名字)/chop/squish/thud/roar/soul/levelup/fanfare/… —— 名字重映射到真实采样
//   · Steps.player / SfxPack.foot —— 按地面材质的真实脚步；SfxPack.cue('nail'|…) —— 装具/道具/奖励的语义音
//   · 环境：按 Worlds 当前区域风格切换循环层 + 随机远处事件 + 回音（洞穴长混响，旷野几乎干声）；低血量心跳
// 接口：SfxPack.play(key,{vol,rate,jit,pos,pan,rv,delay,bus,gap,gk,lp,dur}) · cue(name,a,b) · foot(surf,pos,k,d) · demo(key) · list() · env() · setEnv(s) · layers() · ready
// 资源：sfx/pack.js（window.SFXPACK，58 池 mp3 base64）与 sfx/amb.js（window.SFXAMB，12 条无缝循环）按需注入 <script>，file:// 下可用；构建见 tools/build_sfxpack.py
window.SfxPack = (() => {
  'use strict';
  const GG = () => window.G || window.__game || {};
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), rnd = (a, b) => a + Math.random() * (b - a);
  const on = () => !window.Mods || !Mods.on || Mods.on('sfx_pack') !== false;
  const ambOn = () => !window.Mods || !Mods.on || Mods.on('sfx_amb') !== false;
  let ac = null, state = 0, bank = {}, ambBuf = {}, ambLoad = null; // state 0 未启动 / 1 解码中 / 2 就绪 / -1 失败
  let conv = null, revOut = null, ambOut = null, envName = 'cave', retryT = 0;
  const last = {}, lastIdx = {};

  // ---------------- 加载 ----------------
  function inject(src, name) {
    return new Promise((res) => {
      if (window[name]) return res(window[name]);
      const s = document.createElement('script'); s.src = src; s.onload = () => res(window[name] || null); s.onerror = () => res(null); document.head.appendChild(s);
    });
  }
  const b64 = (str) => { const bin = atob(str), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
  const dec = (str) => new Promise((res) => { try { const p = ac.decodeAudioData(b64(str), res, () => res(null)); if (p && p.catch) p.catch(() => res(null)); } catch (e) { res(null); } });
  async function boot() {
    if (state === 1 || !window.SFX || !SFX.ctx) return;
    if (ac === SFX.ctx && state === 2) return;
    ac = SFX.ctx; buildNodes();
    if (Object.keys(bank).length) { state = 2; return; }
    state = 1; const me = ac;
    const D = await inject('sfx/pack.js', 'SFXPACK');
    if (!D) { state = -1; retryT = performance.now(); return; }
    const out = {}; const ks = Object.keys(D);
    await Promise.all(ks.map(async (k) => { const a = await Promise.all(D[k].map(dec)); out[k] = a.filter(Boolean); }));
    if (me !== ac) { state = 0; return; }
    bank = out; state = 2;
  }
  function buildNodes() {
    ambOut = ac.createGain(); ambOut.gain.value = 1; ambOut.connect(SFX.bus('amb'));
    conv = ac.createConvolver(); revOut = ac.createGain(); revOut.gain.value = 0.55; conv.connect(revOut); revOut.connect(SFX.bus('sfx'));
    for (const k in AL) delete AL[k]; ambScene = ''; hbSrc = null;
    setEnv(curEnv(), true);
  }
  // ---------------- 环境（混响） ----------------
  const ENV = { // sec 混响长度 / dec 衰减指数 / k 发送系数
    cave: { sec: 2.4, dec: 2.2, k: 1.0 }, ruins: { sec: 1.6, dec: 2.4, k: 0.8 }, fortress: { sec: 1.3, dec: 2.6, k: 0.6 }, abyss: { sec: 3.0, dec: 2.0, k: 1.1 },
    peak: { sec: 1.8, dec: 3.0, k: 0.5 }, wilds: { sec: 0.6, dec: 3.0, k: 0.2 }, meadow: { sec: 0.45, dec: 3.0, k: 0.12 }, forest: { sec: 0.7, dec: 2.8, k: 0.25 },
    swamp: { sec: 0.8, dec: 2.6, k: 0.3 }, capital: { sec: 1.0, dec: 2.6, k: 0.45 },
  };
  function setEnv(n, force) {
    if (!ENV[n]) n = 'meadow'; if (n === envName && !force) return; envName = n; if (!ac || !conv) return;
    const E = ENV[n], len = Math.floor(ac.sampleRate * E.sec), ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); let y = 0; for (let i = 0; i < len; i++) { y += ((Math.random() * 2 - 1) - y) * 0.4; d[i] = y * Math.pow(1 - i / len, E.dec) * (i < 300 ? i / 300 : 1); } }
    const t = ac.currentTime; revOut.gain.cancelScheduledValues(t); revOut.gain.setTargetAtTime(0, t, 0.03);
    setTimeout(() => { if (!conv) return; try { conv.buffer = ir; revOut.gain.setTargetAtTime(0.55, ac.currentTime, 0.1); } catch (e) { } }, 120);
  }
  function curEnv() {
    const W = window.Worlds; if (W && W.active && W._W) { const g = W._W.graph, nd = g && g.nodes && g.nodes[W._W.cur], st = nd && nd.style; return st && ENV[st] ? st : 'meadow'; }
    return 'cave';
  }
  // ---------------- 空间化 ----------------
  function spatial(pos) {
    const cam = GG().camera; if (!cam || !pos) return null;
    cam.updateMatrixWorld && cam.updateMatrixWorld(); const e = cam.matrixWorld.elements, dx = pos.x - e[12], dy = pos.y - e[13], dz = pos.z - e[14], d = Math.hypot(dx, dy, dz) || 1e-3;
    return { v: clamp(1.15 / (1 + d * 0.22), 0.05, 1), p: clamp((dx * e[0] + dy * e[1] + dz * e[2]) / d * 0.9, -0.9, 0.9) * Math.min(1, d / 1.5), d };
  }
  // ---------------- 播放 ----------------
  function play(key, o) {
    o = o || {}; if (state !== 2 || !ac || !on()) return null; const pool = bank[key]; if (!pool || !pool.length) return null;
    const now = performance.now(), gk = o.gk || key, gap = o.gap != null ? o.gap : 25; if (gap && last[gk] && now - last[gk] < gap) return null; last[gk] = now;
    if (ac.state === 'suspended') ac.resume();
    let i = Math.floor(Math.random() * pool.length); if (pool.length > 1 && i === lastIdx[key]) i = (i + 1) % pool.length; lastIdx[key] = i;
    const sp = o.pos ? spatial(o.pos) : null, t = ac.currentTime + (o.delay || 0) + 0.003;
    const s = ac.createBufferSource(); s.buffer = pool[i]; s.playbackRate.value = (o.rate || 1) * (1 + rnd(-1, 1) * (o.jit != null ? o.jit : 0.06));
    const g = ac.createGain(); g.gain.value = (o.vol != null ? o.vol : 1) * (sp ? sp.v : 1);
    let n = s;
    const lpf = o.lp || (sp && sp.d > 7 ? clamp(16000 / (1 + sp.d * 0.18), 1800, 16000) : 0);
    if (lpf) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lpf; n.connect(f); n = f; }
    n.connect(g); n = g;
    const pan = o.pan != null ? o.pan : sp ? sp.p : 0;
    if (pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); n.connect(p); n = p; }
    const dst = o.bus ? SFX.bus(o.bus) : SFX.bus('sfx'); n.connect(dst);
    const rv = (o.rv != null ? o.rv : 0.15) * ENV[envName].k * (sp ? clamp(0.6 + sp.d * 0.05, 0.6, 1.6) : 1);
    if (rv > 0.01 && conv) { const r = ac.createGain(); r.gain.value = rv; n.connect(r); r.connect(conv); }
    if (o.dur) { s.start(t, 0, o.dur); g.gain.setTargetAtTime(0, t + o.dur - 0.05, 0.02); } else s.start(t);
    return s;
  }
  const seqp = (list) => list.forEach(([k, o]) => play(k, o));
  function duck(depth, secs) { if (!ambOut || !ac) return; const t = ac.currentTime; ambOut.gain.cancelScheduledValues(t); ambOut.gain.setTargetAtTime(1 - depth, t, 0.02); ambOut.gain.setTargetAtTime(1, t + (secs || 0.5), 0.35); }

  // ---------------- 战斗：按 武器 × 对方材质 × 力度 ----------------
  const WC = ['blunt', 'blunt', 'blade', 'flail', 'axe', 'scythe', 'rapier'];
  const wcls = () => { const S = GG().S; return WC[(S && S.eq && +S.eq.weapon) || 0] || 'blade'; };
  const posOf = (fo) => fo && (fo.anchor && fo.anchor.pos && !fo.anchor.gone ? fo.anchor.pos : fo.pos);
  const isBeast = (fo) => !!(fo && fo.beast);
  const matOf = (fo) => !fo ? 'flesh' : isBeast(fo) ? 'beast' : (fo.boss || fo.role === 'guard' || fo.role === 'brute') ? 'plate' : (fo.armed || fo.role === 'berserk') ? 'leather' : 'flesh';
  const sizeOf = (fo) => fo && fo.boss ? 0.78 : fo && fo.role === 'brute' ? 0.88 : isBeast(fo) ? 0.92 : 1;
  let cmb = 0, cmbT = 0;
  function hitCue(fo, d) {
    d = d || {}; const k = clamp((d.dealt || 8) / 26 + (d.charged ? 0.3 : 0) + (d.spd || 6) / 40, 0.15, 1), w = wcls(), m = matOf(fo), pos = posOf(fo), zone = d.zone || '', head = zone === 'head' || zone === 'neck', sz = sizeOf(fo);
    const B = { pos, rv: 0.28 + k * 0.1 }, edge = w === 'blade' || w === 'axe' || w === 'scythe' || w === 'rapier' || d.kind === 'thrust', X = (o) => Object.assign({}, B, o);
    const t = performance.now(); cmb = t - cmbT < 2500 ? cmb + 1 : 1; cmbT = t;
    if (m === 'plate') { // 重甲：钢板闷响，刃器带金属刮擦，钝器带凹陷
      play(k > 0.55 ? 'plate_h' : 'plate_l', X({ vol: 0.55 + k * 0.5, rate: sz }));
      if (edge) { play('metal_hit', X({ vol: 0.35 + k * 0.25, rate: 1.1 })); if (k > 0.6) play('sheet', X({ vol: 0.28, delay: 0.02 })); }
      else { play('crack', X({ vol: 0.45 * k, rate: 0.8 })); play('metal', X({ vol: 0.5 * k })); }
    } else if (m === 'beast') { // 野兽：闷肉声 + 兽吼痛叫
      play('soft', X({ vol: 0.6 + k * 0.4, rate: 0.85 })); play('flesh', X({ vol: 0.7, rate: 0.82 }));
      if (edge) play('slice', X({ vol: 0.5, rate: 0.9 })); if (k > 0.35) play('beast', X({ vol: 0.35 + k * 0.3, rate: rnd(0.9, 1.15), delay: 0.04, gk: 'bpain', gap: 300, lp: 3600 }));
    } else if (edge) { // 刃：嘶——+ 切肉
      play('slice', X({ vol: w === 'rapier' ? 0.5 : 0.75, rate: w === 'rapier' ? 1.25 : w === 'axe' ? 0.75 : 1 })); play('flesh', X({ vol: 0.55 + k * 0.5, rate: 1 - k * 0.12 }));
      if (w === 'axe' || w === 'scythe') { play('soft', X({ vol: 0.5 * k, rate: 0.7, delay: 0.015 })); if (k > 0.6) play('crack', X({ vol: 0.3, rate: 1.1, delay: 0.02 })); }
      if (m === 'leather') play('leather', X({ vol: 0.3, delay: 0.01 }));
    } else { // 钝：闷击 + 骨裂
      play(k > 0.5 ? 'punch' : 'soft', X({ vol: 0.65 + k * 0.45, rate: w === 'flail' ? 0.75 : 0.9 })); play('flesh', X({ vol: 0.5 + k * 0.3 }));
      if (k > 0.45 || w === 'flail') play('crack', X({ vol: 0.35 + k * 0.35, rate: 1.2, delay: 0.01 })); if (w === 'flail') play('chain', X({ vol: 0.4, rate: 1.1, delay: 0.03 }));
      if (m === 'leather') play('leather', X({ vol: 0.3, delay: 0.01 }));
    }
    if (head) play('crack', X({ vol: 0.4, rate: 1.35, delay: 0.012, gk: 'hcrk' })); // 头部：多一声脆响
    if (d.brk) { play('glass', X({ vol: 0.38, rate: 1.7 })); play('bell', X({ vol: 0.3, rate: 1.6, delay: 0.01, rv: 0.5 })); duck(0.25, 0.3); } // 破绽追击：清脆的“叮”
    if (cmb >= 3) play('glass', { vol: 0.2, rate: 1 + Math.min(9, cmb - 2) * 0.09, rv: 0.4, gk: 'combo', gap: 60 }); // 连击：音阶上行
    if (k > 0.7) duck(0.18, 0.25);
  }
  function killCue(fo, t) {
    const pos = posOf(fo), m = matOf(fo), B = { pos, rv: 0.4 };
    if (fo && fo.boss) { duck(0.5, 1.4); seqp([['giant', Object.assign({ vol: 0.9, rate: 0.62 }, B)], ['fall', Object.assign({ vol: 1, rate: 0.6, delay: 0.5, gk: 'k1' }, B)], ['bell', { vol: 0.5, rate: 0.5, delay: 0.1, rv: 0.6 }], ['rock', Object.assign({ vol: 0.5, rate: 0.6, delay: 0.6, gk: 'k2' }, B)], ['plate_h', Object.assign({ vol: 0.7, rate: 0.7, delay: 0.7, gk: 'k3' }, B)]]); }
    else if (m === 'beast') seqp([['beast', Object.assign({ vol: 0.85, rate: 0.7, lp: 3200 }, B)], ['fall', Object.assign({ vol: 0.7, rate: 0.9, delay: 0.35, gk: 'k1' }, B)], ['wet', Object.assign({ vol: 0.3, delay: 0.3, gk: 'k2' }, B)]]);
    else if (m === 'plate') seqp([['plate_h', Object.assign({ vol: 0.8, rate: 0.85 }, B)], ['fall', Object.assign({ vol: 0.8, rate: 0.85, delay: 0.3, gk: 'k1' }, B)], ['sheet', Object.assign({ vol: 0.5, delay: 0.38, gk: 'k2' }, B)], ['armor', Object.assign({ vol: 0.5, delay: 0.45, gk: 'k3' }, B)]]);
    else seqp([['fall', Object.assign({ vol: 0.7, rate: 1, delay: 0.35, gk: 'k1' }, B)], ['cloth', Object.assign({ vol: 0.5, delay: 0.3, gk: 'k2' }, B)], ['soft', Object.assign({ vol: 0.45, rate: 0.8, delay: 0.38, gk: 'k3' }, B)]]);
    if (t === 'execute') { play('bell', { vol: 0.5, rate: 0.9, rv: 0.6 }); duck(0.35, 0.8); }
    play('glass', { vol: 0.28, rate: 1.4, delay: 0.05, rv: 0.5, gk: 'kping' }); // 击杀的“魂晶”清响
  }
  function decapCue(fo) { // 斩首：嘶 — 噗 — 颅落地 — 身倒下（慢放特写时拉长）
    const B = { pos: posOf(fo), rv: 0.35 };
    duck(0.4, 3.5);
    play('sw_h', Object.assign({ vol: 0.7, rate: 0.55 }, B)); play('slice', Object.assign({ vol: 1, rate: 0.85, delay: 0.03 }, B)); play('flesh', Object.assign({ vol: 0.9, rate: 0.75, delay: 0.05 }, B));
    play('crack', Object.assign({ vol: 0.5, rate: 0.9, delay: 0.06 }, B)); play('wet', Object.assign({ vol: 0.55, rate: 0.85, delay: 0.14 }, B));
    play('soft', Object.assign({ vol: 0.7, rate: 0.8, delay: 0.7, gk: 'd1' }, B)); play('wood', Object.assign({ vol: 0.35, rate: 0.7, delay: 0.72, gk: 'd2' }, B));
    play('fall', Object.assign({ vol: 0.9, rate: 0.8, delay: 1.1, gk: 'd3' }, B)); play('bell', { vol: 0.3, rate: 0.6, delay: 0.1, rv: 0.6 });
    play('ghost', { vol: 0.28, rate: 0.7, delay: 0.5, rv: 0.7, lp: 2600, gk: 'dg' });
  }
  function clangCue(type, pos) {
    const B = { pos, rv: 0.4 };
    if (type === 'block') seqp([['plate_l', Object.assign({ vol: 0.7, rate: 0.9 }, B)], ['clash', Object.assign({ vol: 0.5, rate: 0.9, delay: 0.005 }, B)], ['wood_hit', Object.assign({ vol: 0.35, rate: 0.8 }, B)]]);
    else if (type === 'break') { duck(0.5, 0.6); seqp([['glass_h', Object.assign({ vol: 0.8 }, B)], ['plate_h', Object.assign({ vol: 0.9, rate: 0.85 }, B)], ['clash', Object.assign({ vol: 0.6, rate: 0.8 }, B)], ['wood', Object.assign({ vol: 0.5, rate: 0.7, delay: 0.03 }, B)]]); }
    else if (type === 'heavy') seqp([['metal', Object.assign({ vol: 0.85, rate: 0.8 }, B)], ['plate_h', Object.assign({ vol: 0.7, rate: 0.8 }, B)], ['rock', Object.assign({ vol: 0.4, rate: 0.9, delay: 0.03 }, B)]]);
    else seqp([['clash', Object.assign({ vol: 0.75 }, B)], ['metal_hit', Object.assign({ vol: 0.5, rate: 1.2, delay: 0.005 }, B)], ['bell', Object.assign({ vol: 0.18, rate: 1.9, delay: 0.02 }, B)]]);
  }
  function eventCue(t, fo, d) {
    const pos = posOf(fo);
    if (t === 'hit') hitCue(fo, d);
    else if (t === 'kill' || t === 'execute') killCue(fo, t);
    else if (t === 'decap') decapCue(fo);
    else if (t === 'sever' || t === 'halve') { seqp([['slice', { pos, vol: 0.9, rate: 0.9 }], ['flesh', { pos, vol: 0.8, rate: 0.8 }], ['crack', { pos, vol: 0.7, rate: 0.85, delay: 0.02 }]]); if (t === 'halve') play('fall', { pos, vol: 0.8, rate: 0.8, delay: 0.5, gk: 'hv' }); }
    else if (t === 'parry') { duck(0.55, 0.5); seqp([['clash', { vol: 0.8, rv: 0.5 }], ['clash', { vol: 0.5, rate: 1.35, delay: 0.035, rv: 0.5 }], ['bell', { vol: 0.55, rate: 1.5, delay: 0.01, rv: 0.55 }], ['glass', { vol: 0.35, rate: 1.9, delay: 0.03 }]]); }
    else if (t === 'guard' || t === 'blocked') seqp([['plate_l', { vol: 0.65, rate: 0.95 }], ['wood_hit', { vol: 0.4, rate: 0.85 }]]);
    else if (t === 'guardbreak') { duck(0.4, 0.5); seqp([['glass_h', { vol: 0.6 }], ['plate_h', { vol: 0.7, rate: 0.85 }]]); }
    else if (t === 'dodge' || t === 'perfectdodge') { seqp([['cloth', { vol: 0.6, rate: 0.9 }], ['sw_l', { vol: 0.45, rate: 0.7, delay: 0.02 }]]); if (t === 'perfectdodge') seqp([['glass', { vol: 0.35, rate: 1.8, delay: 0.04 }], ['magic', { vol: 0.25, rate: 1.2, delay: 0.05, lp: 5000 }]]); }
    else if (t === 'outflank') seqp([['cloth', { vol: 0.4, rate: 1.2 }], ['sw_l', { vol: 0.35, rate: 1.1 }]]);
  }
  function hurtCue(n, fo, h) {
    const st = (GG().st && GG().st()) || {}, k = clamp(n / Math.max(20, st.maxHp || 100) * 4, 0.25, 1);
    seqp([['punch', { vol: 0.35 + k * 0.3, rate: 0.9, rv: 0.2 }], ['soft', { vol: 0.3 + k * 0.2, rate: 0.7, rv: 0.2 }], ['armor', { vol: 0.2, delay: 0.02 }]]);
    if (k > 0.35) play('ogre', { vol: 0.25 + k * 0.3, rate: rnd(1.05, 1.3), lp: 2800, delay: 0.03, gap: 700, gk: 'ohurt', rv: 0.2 });
    if (k > 0.65 || (h && h.heavy)) { duck(0.5, 0.9); play('crack', { vol: 0.3, rate: 0.8, rv: 0.2, gk: 'hc' }); play('bell', { vol: 0.12, rate: 2.6, delay: 0.05, rv: 0.1, lp: 4000, gk: 'ear' }); } // 重伤：耳鸣 + 环境声被压低
  }
  function swingCue(dx, dy, pw, ch) {
    const c = wcls(), s = clamp(pw || 0.8, 0.3, 1.2), pan = 0.4 * Math.sign(dx || 0), B = { pan, rv: 0.12 }, BV = 1.6; // 挥击的“嗖”原本偏轻
    const X = (o) => Object.assign({}, B, o);
    if (c === 'rapier') play('sw_l', X({ vol: 0.5 * BV, rate: 1.3 }));
    else if (c === 'blunt' || c === 'flail') { play('sw_h', X({ vol: (0.55 + s * 0.2) * BV, rate: 0.7 })); if (c === 'flail') play('chain', X({ vol: 0.35, rate: 1.2, delay: 0.02 })); else play('wood_hit', X({ vol: 0.12, rate: 0.6, delay: 0.01 })); }
    else if (c === 'axe') { play('sw_h', X({ vol: 0.7 * BV, rate: 0.62 })); play('sw_h', X({ vol: 0.4, rate: 0.5, delay: 0.04 })); }
    else if (c === 'scythe') { play('sw_h', X({ vol: 0.55 * BV, rate: 0.85 })); play('sword', X({ vol: 0.25, rate: 1.1, delay: 0.03 })); }
    else play('sw_l', X({ vol: (0.5 + s * 0.2) * BV, rate: 0.85 + s * 0.2 }));
    if (ch) { play('sw_h', X({ vol: 0.5, rate: 0.5, delay: 0.05 })); play('cloth', X({ vol: 0.3 })); }
  }
  function enemySwingCue(fo, h) {
    const pos = posOf(fo), hv = h && h.heavy, m = matOf(fo), B = { pos, rv: 0.2 };
    if (isBeast(fo)) { play('beast', Object.assign({ vol: 0.55, rate: rnd(0.9, 1.1), gk: 'bsw', gap: 250, lp: 3800 }, B)); play('bite', Object.assign({ vol: 0.45, delay: 0.1, gk: 'bite' }, B)); return; }
    play(hv ? 'sw_h' : 'sw_l', Object.assign({ vol: (hv ? 0.95 : 0.8) * 1.4, rate: hv ? 0.6 : rnd(0.9, 1.1), gk: 'esw', gap: 90 }, B));
    if (m === 'plate') play('armor', Object.assign({ vol: 0.5, delay: 0.01, gk: 'earm' }, B));
    if (fo && fo.role === 'brute') play('fall', Object.assign({ vol: 0.6, rate: 0.7, delay: 0.25, gk: 'slam' }, B));
  }
  function windupCue(fo, clip) {
    const pos = posOf(fo); if (!fo) return;
    if (isBeast(fo)) play('beast', { pos, vol: 0.7, rate: rnd(0.85, 1.05), gk: 'bwu' + (fo.id2 || ''), gap: 800, lp: 4000, rv: 0.25 });
    else if (fo.boss) play('ogre', { pos, vol: 0.8, rate: rnd(0.75, 0.9), gk: 'ewu' + (fo.id2 || ''), gap: 900, rv: 0.4 });
    else if (fo.role === 'brute') play('giant', { pos, vol: 0.55, rate: rnd(1.0, 1.2), gk: 'ewu' + (fo.id2 || ''), gap: 900, rv: 0.3 });
    else play('cloth', { pos, vol: 0.35, rate: rnd(0.9, 1.1), gk: 'ewc' + (fo.id2 || ''), gap: 400 }); // 其余人：衣料拉扯声（语音由 Persona 负责）
  }
  function roleCueFx(fo, kind) {
    const pos = posOf(fo), B = { pos, rv: 0.2 };
    if (kind === 'stalk') play('cloth', Object.assign({ vol: 0.12, rate: 1.2, gk: 'stalk', gap: 900 }, B));
    else if (kind === 'backstab') { play('draw', Object.assign({ vol: 0.8, rate: 1.3, gk: 'bs' }, B)); play('metal_hit', Object.assign({ vol: 0.3, rate: 1.4, delay: 0.05 }, B)); }
    else if (kind === 'throw') play('sw_l', Object.assign({ vol: 0.9, rate: 1.2 }, B));
    else if (kind === 'roll') { play('cloth', Object.assign({ vol: 0.55 }, B)); play('soft', Object.assign({ vol: 0.35, rate: 0.7, delay: 0.25 }, B)); }
    else if (kind === 'rage') { play('beast', Object.assign({ vol: 0.7, rate: 0.8, gk: 'rage', lp: 3500 }, B)); play('giant', Object.assign({ vol: 0.5, rate: 1.1, delay: 0.1 }, B)); }
    else if (kind === 'slam') { play('fall', Object.assign({ vol: 0.8, rate: 0.65, gk: 'slam2' }, B)); play('rock', Object.assign({ vol: 0.5, rate: 0.7, delay: 0.03 }, B)); }
  }
  // ---------------- 脚步 ----------------
  const SURFK = { stone: 'st_stone', grass: 'st_grass', leaves: 'st_leaves', gravel: 'st_gravel', mud: 'st_mud', snow: 'st_snow', ash: 'st_dirt', dirt: 'st_dirt', wood: 'st_wood' };
  function foot(surf, pos, k, d) {
    if (state !== 2 || !on()) return; const key = SURFK[surf] || 'st_stone', me = !pos;
    play(key, { vol: 0.55 * (k || 1), pos, rate: k > 1 ? 0.8 : 1, rv: surf === 'stone' ? 0.3 : 0.1, gap: 40, gk: pos ? 'f' + (((pos.x * 7 + pos.z * 3) | 0) % 5) : 'fp', jit: 0.1 });
    if (me || k > 1) play('soft', { vol: 0.14 * (k || 1), pos, rate: 0.5, rv: 0.1, gap: 40, gk: 'fb' }); // 体重
    if (me && Math.random() < 0.3) play('leather', { vol: 0.08, rate: 1.2, gk: 'fl', gap: 120 }); // 皮带/背包的轻响
  }
  // ---------------- 语义音（装具 / 道具 / 奖励） ----------------
  const CUES = {
    nail: (a) => seqp([['hammer', { vol: 0.9, pos: a }], ['metal_hit', { vol: 0.5, rate: 1.1, delay: 0.06, pos: a }], ['wood_hit', { vol: 0.4, delay: 0.1, pos: a }], ['hammer', { vol: 0.7, rate: 1.1, delay: 0.3, pos: a, gk: 'nail2' }]]),
    pull: (a) => seqp([['creak', { vol: 0.7, rate: 1.1, pos: a }], ['latch', { vol: 0.5, rate: 0.8, delay: 0.12, pos: a }], ['wood', { vol: 0.3, rate: 1.2, delay: 0.2, pos: a }]]),
    chain: (a) => seqp([['chain', { vol: 0.8, pos: a }], ['metal_hit', { vol: 0.35, rate: 1.2, delay: 0.08, pos: a }]]),
    hook: (a) => seqp([['latch', { vol: 0.7, pos: a }], ['metal_hit', { vol: 0.5, rate: 1.2, delay: 0.04, pos: a }]]),
    ring: (a) => seqp([['metal_hit', { vol: 0.5, rate: 0.9, pos: a }], ['bell', { vol: 0.22, rate: 2.2, delay: 0.02, pos: a, rv: 0.5 }], ['chain', { vol: 0.35, delay: 0.1, pos: a }]]),
    weight: (a) => seqp([['metal', { vol: 0.55, rate: 0.8, pos: a }], ['fall', { vol: 0.5, rate: 0.8, delay: 0.06, pos: a }], ['chain', { vol: 0.35, delay: 0.1, pos: a }]]),
    lantern: (a) => seqp([['latch', { vol: 0.6, pos: a }], ['glass', { vol: 0.28, rate: 0.9, delay: 0.05, pos: a }], ['chain', { vol: 0.3, delay: 0.1, pos: a }]]),
    bell: (a, b) => { seqp([['bell', { vol: 0.85, rate: b || rnd(0.8, 1.05), pos: a, rv: 0.6, gk: 'rbell', gap: 120 }], ['metal_hit', { vol: 0.2, rate: 1.4, pos: a }]]); duck(0.2, 0.6); },
    rattle: (a, b) => play('chain', { vol: clamp(0.15 + (b || 0) * 0.1, 0.1, 0.5), pos: a, rate: rnd(0.9, 1.3), gk: 'rattle', gap: 180, rv: 0.3 }),
    stash: () => seqp([['leather', { vol: 0.7 }], ['cloth', { vol: 0.4, delay: 0.04 }]]),
    loot: () => seqp([['coins', { vol: 0.6 }], ['beads', { vol: 0.3, delay: 0.03 }], ['glass', { vol: 0.3, rate: 1.5, delay: 0.06 }]]),
    equip: () => seqp([['armor', { vol: 0.7 }], ['leather', { vol: 0.5, delay: 0.05 }], ['latch', { vol: 0.3, delay: 0.1 }]]),
    craft: () => seqp([['hammer', { vol: 0.8 }], ['metal_hit', { vol: 0.5, delay: 0.1 }], ['sheet', { vol: 0.3, rate: 1.2, delay: 0.18 }], ['glass', { vol: 0.25, rate: 1.6, delay: 0.3 }]]),
    door: (a) => seqp([['door', { vol: 0.8, pos: a }], ['creak', { vol: 0.5, delay: 0.05, pos: a }]]),
    magic: (a) => seqp([['magic', { vol: 0.6, pos: a, rv: 0.4 }], ['glass', { vol: 0.35, rate: 1.4, delay: 0.1, pos: a }]]),
  };
  function cue(name, a, b) { if (!CUES[name]) return false; if (state !== 2 || !on()) return false; try { CUES[name](a && typeof a === 'object' ? a : undefined, typeof a === 'number' ? a : b); } catch (e) { console.warn('SfxPack.cue', name, e); } return true; }

  // ---------------- 环境声 ----------------
  const SC = { // loops：循环层与音量；ev：随机事件（每秒概率）
    cave:     { loops: { cave: 0.5, drips: 0.16, fire: 0.1 }, ev: { creak: 0.015, rock: 0.012, rustle: 0.01 } },
    meadow:   { loops: { wind: 0.2 }, ev: { rustle: 0.1, crow: 0.004 } },
    forest:   { loops: { wind: 0.28 }, ev: { rustle: 0.22, crow: 0.012, howl: 0.004 } },
    wilds:    { loops: { gale: 0.3, wind: 0.22 }, ev: { howl: 0.012, crow: 0.006, rustle: 0.04, thunder: 0.003 } },
    ruins:    { loops: { wind: 0.3, drips: 0.1 }, ev: { crow: 0.03, creak: 0.04, ghost: 0.008, rock: 0.01, rustle: 0.05 } },
    swamp:    { loops: { swamp: 0.45, river: 0.1 }, ev: { rustle: 0.06, crow: 0.01, ghost: 0.004 } },
    fortress: { loops: { wind: 0.25, gale: 0.1 }, ev: { creak: 0.03, crow: 0.02, bell: 0.008, sheet: 0.02 } },
    capital:  { loops: { crickets: 0.32, fire: 0.1, wind: 0.08 }, ev: { bell: 0.01, crow: 0.01 } },
    abyss:    { loops: { abyss: 0.55, abyss2: 0.3, cave_dark: 0.22 }, ev: { ghost: 0.03, thunder: 0.012, horror: 0.004, rock: 0.015 } },
    peak:     { loops: { gale: 0.5, wind: 0.3 }, ev: { howl: 0.008, thunder: 0.006 } },
  };
  const AMBK = 0.36; // 循环层总体比例：洞穴里待得最久，要“安全舒适”，环境声只做底，不压过战斗（洞穴总环境声约 −31 dB RMS）
  const AL = {}; let ambScene = '', tickT = 0, hbSrc = null, hbPending = 0;
  async function getLoop(k) {
    if (ambBuf[k]) return ambBuf[k];
    if (!ambLoad) ambLoad = inject('sfx/amb.js', 'SFXAMB'); const D = await ambLoad; if (!D || !D[k]) return null;
    return ambBuf[k] = await dec(D[k]);
  }
  async function layerSet(want) {
    const t = ac.currentTime;
    for (const k in AL) if (k[0] !== '_' && !(k in want) && !AL[k].fading) { const L = AL[k]; L.fading = 1; L.g.gain.setTargetAtTime(0, t, 1.2); setTimeout(() => { try { L.s.stop(); L.s.disconnect(); L.g.disconnect(); } catch (e) { } if (AL[k] === L) delete AL[k]; }, 6000); }
    for (const k in want) {
      const L = AL[k]; if (L && !L.fading) { L.g.gain.setTargetAtTime(want[k] * AMBK, t, 1.5); continue; } if (AL['_' + k]) continue; AL['_' + k] = 1;
      const bf = await getLoop(k); delete AL['_' + k]; if (!bf || ambScene === '' || !(k in (SC[ambScene] || SC.meadow).loops)) continue;
      if (AL[k] && !AL[k].fading) continue;
      const s = ac.createBufferSource(); s.buffer = bf; s.loop = true; s.loopStart = 0.05; s.loopEnd = Math.max(0.2, bf.duration - 0.05); const g = ac.createGain(); g.gain.value = 0; s.connect(g); g.connect(ambOut);
      s.start(0, Math.random() * bf.duration); g.gain.setTargetAtTime(want[k] * AMBK, ac.currentTime, 1.8); AL[k] = { s, g };
    }
  }
  function audible() { const G = GG(); if (document.hidden || !G || !G.playing) return 0; if (G.uiOpen) return 0.45; return 1; }
  function evPlay(e) {
    const cam = GG().camera; if (!cam) return; const az = rnd(0, Math.PI * 2), r = rnd(12, 40), o = { pos: { x: cam.position.x + Math.sin(az) * r, y: cam.position.y + rnd(0, 6), z: cam.position.z + Math.cos(az) * r }, bus: 'amb', rv: 0.5, gap: 2000 };
    const P = (k, x) => play(k, Object.assign({}, o, x));
    if (e === 'crow') P('crow', { vol: 0.7, rate: rnd(0.85, 1.1) });
    else if (e === 'howl') P('howl', { vol: 0.9, rate: rnd(0.8, 1) });
    else if (e === 'thunder') P('thunder', { vol: 1.1, rate: rnd(0.7, 1), delay: rnd(0.2, 0.9), lp: 2400 });
    else if (e === 'rustle') P('rustle', { vol: 0.35, pos: { x: o.pos.x * 0.4 + cam.position.x * 0.6, y: cam.position.y, z: o.pos.z * 0.4 + cam.position.z * 0.6 } });
    else if (e === 'creak') P('creak', { vol: 0.42, rate: rnd(0.7, 1) });
    else if (e === 'rock') P('rock', { vol: 0.55, rate: rnd(0.55, 0.8), lp: 1800, rv: 0.7 });
    else if (e === 'ghost') P('ghost', { vol: 0.5, rate: rnd(0.75, 1), lp: 3200, rv: 0.7 });
    else if (e === 'bell') P('bell', { vol: 0.5, rate: rnd(0.45, 0.6), lp: 3500, rv: 0.6 });
    else if (e === 'sheet') P('sheet', { vol: 0.25, rate: rnd(0.7, 1), lp: 3000 });
    else if (e === 'horror') P('horror', { vol: 0.5, lp: 2800, rv: 0.7 });
  }
  function ambTick() {
    if (state !== 2 || !on() || !window.SFX || !SFX.ctx || ac !== SFX.ctx) return; const now = performance.now(), dt = tickT ? Math.min(1, (now - tickT) / 1000) : 0.4; tickT = now;
    const au = audible(), sc = curEnv(); setEnv(sc);
    const amb = ambOn() ? 1 : 0;
    if (!au || !amb) { if (ambScene) { ambScene = ''; layerSet({}); } }
    else if (sc !== ambScene) { ambScene = sc; const S = SC[sc] || SC.meadow, w = {}; for (const k in S.loops) w[k] = S.loops[k]; layerSet(w); }
    if (au && amb && ambScene) { const S = SC[ambScene] || SC.meadow; for (const e in S.ev) if (S.ev[e] > 0 && Math.random() < S.ev[e] * dt * au) evPlay(e); }
    // 低血量：心跳（越低越快越响）
    try { const G = GG(), st = G.st && G.st(), S = G.S, f = st && S && st.maxHp ? S.hp / st.maxHp : 1; lowHp(au && f < 0.38 ? f : 1); } catch (e) { }
    try { if (window.CombatFX && CombatFX.setMix) CombatFX.setMix(0.6); } catch (e) { }
  }
  async function lowHp(f) {
    const want = f < 1;
    if (want && !hbSrc && !hbPending) { hbPending = 1; const bf = await getLoop('heart'); hbPending = 0; if (!bf || hbSrc) return; const s = ac.createBufferSource(); s.buffer = bf; s.loop = true; s.loopStart = 0.02; s.loopEnd = Math.max(0.2, bf.duration - 0.02); const g = ac.createGain(); g.gain.value = 0; s.connect(g); g.connect(SFX.bus('sfx')); s.start(); hbSrc = { s, g }; }
    if (hbSrc) { const t = ac.currentTime; hbSrc.g.gain.setTargetAtTime(want ? clamp((0.38 - f) / 0.38, 0.1, 1) * 0.9 : 0, t, 0.4); hbSrc.s.playbackRate.setTargetAtTime(want ? 1.1 + (0.38 - f) * 2.2 : 1, t, 0.6); if (!want) { const h = hbSrc; hbSrc = null; setTimeout(() => { try { h.s.stop(); h.s.disconnect(); h.g.disconnect(); } catch (e) { } }, 2000); } }
  }
  // ---------------- 旧 SFX 名字重映射 ----------------
  const MAPS = {
    thud: (v, r) => play('fall', { vol: 0.45 + 0.45 * v, rate: r * 0.95, rv: 0.35 }),
    heavy: (v, r) => { play('fall', { vol: 0.7 * v + 0.2, rate: r * 0.8, rv: 0.4 }); play('rock', { vol: 0.28 * v, rate: r * 0.9, delay: 0.02 }); },
    punch: (v, r) => { play('soft', { vol: 0.6 * v + 0.2, rate: r }); play('flesh', { vol: 0.35 * v, rate: r }); },
    hit: (v, r) => { play('flesh', { vol: 0.7 * v + 0.2, rate: r }); play('soft', { vol: 0.4 * v, rate: r }); },
    squish: (v, r) => { play('flesh', { vol: 0.5 * v + 0.15, rate: r * 0.9 }); play('wet', { vol: 0.4 * v, rate: r, delay: 0.03 }); },
    chop: (v, r) => { play('slice', { vol: 0.6 * v + 0.15, rate: r * 0.9 }); play('flesh', { vol: 0.55 * v, rate: r * 0.9, delay: 0.01 }); play('crack', { vol: 0.35 * v, rate: r, delay: 0.02 }); },
    draw: (v, r) => { if (r >= 1.1) play('sw_l', { vol: Math.min(1, v * 1.4), rate: r * 0.8 }); else if (r < 0.95) play('sw_h', { vol: Math.min(1, v * 1.4), rate: r }); else { play('draw', { vol: v * 0.8, rate: r }); play('latch', { vol: v * 0.25, delay: 0.1 }); } },
    wood: (v, r) => { play('wood', { vol: 0.6 * v + 0.15, rate: r }); play('wood_hit', { vol: 0.3 * v, rate: r, delay: 0.02 }); },
    mine: (v, r) => { play('rock', { vol: 0.5 * v + 0.2, rate: r }); play('metal_hit', { vol: 0.5 * v, rate: r * 0.9 }); play('crack', { vol: 0.3 * v, delay: 0.03 }); },
    metal: (v, r) => { play('metal', { vol: 0.5 * v + 0.15, rate: r }); play('metal_hit', { vol: 0.3 * v, rate: r * 1.1, delay: 0.01 }); },
    bell: (v, r) => play('bell', { vol: 0.5 * v + 0.2, rate: r, rv: 0.45 }),
    plate: (v, r) => play('plate_l', { vol: 0.5 * v + 0.2, rate: r }),
    coins: (v, r) => { play('coins', { vol: 0.6 * v + 0.2, rate: r }); play('beads', { vol: 0.2 * v, delay: 0.04 }); },
    sack: (v, r) => { play('leather', { vol: 0.7 * v, rate: r }); play('cloth', { vol: 0.4 * v, delay: 0.04 }); },
    page: (v, r) => play('page', { vol: 0.6 * v + 0.2, rate: r }),
    latch: (v, r) => play('latch', { vol: 0.6 * v + 0.2, rate: r }),
  };
  MAPS.coin = MAPS.coins; MAPS.book = MAPS.page;
  function wrapAll() {
    const S = window.SFX; if (S && !S.__sp) {
      S.__sp = 1;
      const orig = S.play;
      if (typeof orig === 'function') S.play = function (name, vol, rate, jit) { if (state === 2 && on() && MAPS[name]) { try { MAPS[name](vol == null ? 1 : vol, rate || 1); return; } catch (e) { } } return orig.apply(this, arguments); };
      const rep = (nm, fn) => { const o = S[nm]; if (typeof o !== 'function') return; S[nm] = function () { if (state === 2 && on()) { try { fn.apply(this, arguments); return; } catch (e) { } } return o.apply(this, arguments); }; };
      const wrap = (nm, fn) => { const o = S[nm]; if (typeof o !== 'function') return; S[nm] = function () { let r; try { r = o.apply(this, arguments); } finally { if (state === 2 && on()) { try { fn.apply(this, arguments); } catch (e) { } } } return r; }; };
      rep('thud', (v, p) => MAPS.thud(v == null ? 1 : v, p || 1)); rep('punch', () => MAPS.punch(0.9, 1)); rep('chop', () => MAPS.chop(1, 1)); rep('squish', (v) => MAPS.squish(v == null ? 1 : v, 1));
      rep('coins', () => MAPS.coins(1, 1)); rep('sack', () => MAPS.sack(1, 1)); rep('wood', () => MAPS.wood(1, 1)); rep('mine', () => MAPS.mine(1, 1)); rep('metal', () => MAPS.metal(1, 1));
      rep('page', () => MAPS.page(1, 1)); rep('book', () => MAPS.page(1, 1)); rep('latch', () => MAPS.latch(1, 1)); rep('bell', () => MAPS.bell(1, 1)); rep('plate', () => MAPS.plate(1, 1));
      wrap('roar', (v) => { v = v == null ? 1 : v; play('giant', { vol: 0.8 * v, rate: rnd(0.9, 1.05), rv: 0.45 }); play('beast', { vol: 0.5 * v, rate: 0.8, delay: 0.03 }); if (v > 0.6) duck(0.5, 0.8); });
      wrap('soul', (c, r) => { const n = c || 0; play('glass', { vol: 0.32, rate: 1 + Math.min(10, n) * 0.07 + (r || 0) * 0.1, rv: 0.4, gap: 60 }); });
      wrap('levelup', () => { seqp([['bell', { vol: 0.6, rate: 1.2 }], ['magic', { vol: 0.45, delay: 0.05 }], ['glass', { vol: 0.5, delay: 0.12 }], ['glass', { vol: 0.5, rate: 1.26, delay: 0.2 }], ['glass', { vol: 0.5, rate: 1.5, delay: 0.28 }]]); });
      wrap('fanfare', (r) => { r = r || 0; seqp([['bell', { vol: 0.5 + r * 0.1, rate: 1 + r * 0.05 }], ['magic', { vol: 0.3 + r * 0.1, delay: 0.04 }], ['glass', { vol: 0.5, delay: 0.1 }], ['glass', { vol: 0.5, rate: 1.26, delay: 0.18 }], ['glass', { vol: 0.5, rate: 1.5, delay: 0.26 }], ['coins', { vol: 0.5, delay: 0.3 }]]); });
    }
    const CF = window.CombatFX; if (CF && !CF.__sp) {
      CF.__sp = 1;
      const w = (nm, fn) => { const o = CF[nm]; if (typeof o !== 'function') return; CF[nm] = function () { let r; try { r = o.apply(this, arguments); } catch (e) { console.warn('CombatFX.' + nm, e); } if (state === 2 && on()) { try { fn.apply(this, arguments); } catch (e) { console.warn('SfxPack ' + nm, e); } } return r; }; };
      w('event', eventCue); w('swing', swingCue); w('hurt', hurtCue); w('enemySwing', enemySwingCue); w('windup', windupCue); w('roleCue', roleCueFx);
      w('thrust', () => { play('sw_l', { vol: 0.9, rate: 1.3, rv: 0.1 }); play('cloth', { vol: 0.15, rate: 1.4 }); });
      w('whiff', () => { play('sw_l', { vol: 0.4, rate: 0.7, rv: 0.1 }); play('cloth', { vol: 0.25, rate: 0.9, delay: 0.05 }); });
      w('draw', (onn) => { if (onn) { play('draw', { vol: 0.8 }); play('latch', { vol: 0.25, delay: 0.12 }); } else { play('draw', { vol: 0.5, rate: 0.85 }); play('leather', { vol: 0.5, delay: 0.2 }); } });
      w('stamina', () => { play('breath', { vol: 0.8, rate: 1, lp: 3500, gk: 'stam', gap: 1200, rv: 0.1 }); });
      w('clang', clangCue);
    }
    const ST = window.Steps; if (ST && !ST.__sp) { ST.__sp = 1; const o = ST.player; if (typeof o === 'function') ST.player = function (ground) { const r = o.apply(this, arguments); if (state === 2 && on()) { try { foot(ST.SURF ? (ground === 'cave' ? 'stone' : ST.SURF(ground)) : 'stone', null, 1.2, 0); } catch (e) { } } return r; }; }
  }
  // ---------------- 试听 ----------------
  function demo(k) { if (k) return !!play(k, { vol: 1, gap: 0 }); const ks = Object.keys(bank); ks.forEach((x, i) => setTimeout(() => play(x, { vol: 1, gap: 0 }), i * 900)); return ks; }
  // ---------------- 启动 ----------------
  setInterval(() => {
    try {
      if (!window.SFX || !SFX.ctx) return;
      if (state === -1 && performance.now() - retryT > 15000) state = 0;
      if (state === 0 || (ac !== SFX.ctx && state !== 1)) boot();
      if (state === 2) { wrapAll(); ambTick(); }
    } catch (e) { console.warn('SfxPack', e); }
  }, 250);
  return { play, cue, foot, demo, boot, duck, env: () => envName, setEnv, layers: () => Object.keys(AL).filter(k => k[0] !== '_'), list: () => Object.fromEntries(Object.keys(bank).map(k => [k, bank[k].length])), get ready() { return state === 2; }, get state() { return state; }, get bank() { return bank; }, SC, ENV, eventCue, hitCue, MAPS, _gain: () => ambOut && ambOut.gain.value };
})();
