// 第二十四轮：人设 Persona（MOD persona，默认开）—— 让每个敌人有“性格”：
//   · 8 种性格原型（由角色已有的 c.traits 推出，同一个角色永远同一种）：高傲 / 冷静 / 温柔 / 胆小 / 好战 / 毒舌 / 狡黠 / 开朗
//   · 真人语音（voice/voice.js，按需加载，AI 语音合成；每人按名字哈希微调音高），台词与气泡文字一致；没有语音的原型只显示文字
//   · 性格决定：见人是打还是逃、会不会重伤撤退、挑衅频率、对峙时的姿态动作（点头/摇头/抱臂）、没发现你时的日常（干活/蹲守/巡逻/两人聊天）
//   · 初见时弹出“【性格·职业】名字 ——「台词」”
// 与 foe_roles.js（职业=战斗方式）互补：职业管“怎么打”，人设管“是什么样的人”。foe.js 只有薄钩子：apply / line / idle / gesture / tick。
window.Persona = (() => {
  'use strict';
  const on = () => !window.Mods || Mods.on('persona');
  const voiceOn = () => on() && (!window.Mods || Mods.on('persona_voice'));
  const PL = () => window.PERSONA_LINES || { keys: [], p: {} };
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };

  // ---------------- 原型 ----------------
  const A = {
    proud:    { n: '高傲', col: '#ffd27a', rate: 1.0,  brave: 0.95, iq: 0.05, noRetreat: true,  taunt: 1.4, gest: ['Yes', 'Idle_FoldArms_Loop'], idle: ['Idle_FoldArms_Loop', 'Idle_Loop'], walk: 'Walk_Formal_Loop', chat: 0.4 },
    cold:     { n: '冷静', col: '#9fd8ff', rate: 0.96, brave: 0.8,  iq: 0.18, noRetreat: false, taunt: 0.5, gest: [], idle: ['Idle_Loop'], walk: 'Walk_Loop', chat: 0.05 },
    gentle:   { n: '温柔', col: '#ffc4e0', rate: 1.0,  brave: 0.45, iq: 0.0,  noRetreat: false, taunt: 0.8, gest: ['Idle_No_Loop'], idle: ['Farm_Harvest', 'Idle_Talking_Loop', 'Idle_Loop'], walk: 'Walk_Loop', chat: 0.8 },
    timid:    { n: '胆小', col: '#d8f0a0', rate: 1.05, brave: 0.12, iq: -0.05, noRetreat: false, taunt: 0.6, gest: ['Idle_No_Loop'], idle: ['Idle_Loop', 'Farm_Harvest'], walk: 'Walk_Loop', chat: 0.5, fleeHp: 0.55 },
    fierce:   { n: '好战', col: '#ff9a70', rate: 1.0,  brave: 1.0,  iq: 0.0,  noRetreat: true,  taunt: 1.6, gest: ['Yes'], idle: ['Idle_FoldArms_Loop', 'Consume', 'Idle_Loop'], walk: 'Walk_Loop', chat: 0.5 },
    sharp:    { n: '毒舌', col: '#e0a0ff', rate: 1.03, brave: 0.7,  iq: 0.05, noRetreat: false, taunt: 1.5, gest: ['Idle_FoldArms_Loop', 'Idle_No_Loop'], idle: ['Idle_FoldArms_Loop', 'Consume', 'Idle_Loop'], walk: 'Walk_Formal_Loop', chat: 0.6 },
    sly:      { n: '狡黠', col: '#b0ffcf', rate: 1.0,  brave: 0.6,  iq: 0.12, noRetreat: false, taunt: 1.2, gest: ['Idle_Talking_Loop'], idle: ['PickUp_Table', 'Interact', 'Idle_Loop'], walk: 'Walk_Loop', chat: 0.5 },
    cheerful: { n: '开朗', col: '#fff08a', rate: 1.06, brave: 0.55, iq: -0.05, noRetreat: false, taunt: 1.3, gest: ['Idle_Talking_Loop', 'Yes'], idle: ['Idle_Talking_Loop', 'Consume', 'Farm_Harvest', 'Idle_Loop'], walk: 'Walk_Loop', chat: 0.9 },
  };
  const TR = {
    proud: ['高傲', '自恋', '骄纵', '傲娇', '野心勃勃', '固执'], cold: ['冷酷', '冷静', '沉默寡言', '孤僻', '严谨', '残忍', '多疑', '偏执'],
    gentle: ['温柔', '慈悲', '虔诚', '浪漫', '多情', '忠诚', '坚韧'], timid: ['胆小', '爱哭', '优柔寡断', '悲观', '神经质'],
    fierce: ['暴躁', '好战', '勇敢', '叛逆'], sharp: ['毒舌', '洁癖', '嫉妒心强', '懒散'], sly: ['狡黠', '腹黑', '贪婪', '善变'],
    cheerful: ['天真', '开朗', '乐观', '好奇', '迷糊', '话痨', '贪吃'],
  };
  const T2A = {}; for (const k in TR) for (const t of TR[k]) T2A[t] = k;
  const KEYS = Object.keys(A);
  function archOf(c) { const ts = (c && c.traits) || []; for (const t of ts) if (T2A[t]) return T2A[t]; return KEYS[Math.floor(hash((c && c.name) || 'x') * KEYS.length)]; }
  const ROLE_N = { brute: '蛮兵', skirm: '游击', guard: '盾卫', assassin: '刺客', berserk: '狂战', ranged: '投掷手' };

  function apply(fo, r) {
    if (!on() || !fo || fo.boss) return;
    if (voiceOn()) loadVoice(); // 进场就开始异步加载语音（~1.4MB，不阻塞）
    const c = fo.h && fo.h.c; const k = archOf(c), P = A[k], h = hash((c && c.name) || fo.id2 || '');
    const h2 = hash(((c && c.name) || fo.id2 || '') + '#v'), vk = (PL().p[k + '2'] && h2 < 0.5) ? k + '2' : k; // 第二十四轮(6)：同性格有两套声线/台词时按名字哈希分配
    fo.per = { k, vk, P, pitch: P.rate * (0.95 + h * 0.1), lastV: -1e9, title: `【${P.n}${ROLE_N[fo.role] ? '·' + ROLE_N[fo.role] : ''}】${(c && c.name) || ''}` };
    fo.iq = Math.max(0.2, Math.min(1.3, fo.iq + P.iq));
    if (fo.role !== 'berserk') { const rr = r ? r() : Math.random(); fo.brave = fo.armed ? rr < Math.max(P.brave, 0.35) : rr < P.brave * 0.8; }
    if (P.noRetreat) fo.retreated = true;
    // 日常作息：职业专属的 idleClip 优先，其后是性格动作
    const pool = [fo.idleClip].concat(P.idle).filter((x, i, a) => x && a.indexOf(x) === i && fo.f.clips && fo.f.clips[x]);
    fo.per.pool = pool.length ? pool : [fo.idleClip];
    fo.per.nextT = 2 + h * 6;
    // 对峙姿态：用包装过的 play 让一次性“点头/摇头”动作不被每帧的循环动作顶掉
    const f = fo.f, orig = f.play;
    f.play = function (clip, o) { if (fo.gestT > 0 && clip !== fo.gestClip && !(o && o.once)) return null; return orig.call(f, clip, o); };
  }

  // ---------------- 台词 + 语音 ----------------
  let lastGlobal = -1e9, lastTitle = -1e9; const playing = [];
  function idxFor(key) { const K = PL().keys, out = []; for (let i = 0; i < K.length; i++) if (K[i] === key) out.push(i); return out; }
  const IDX = {}; const idx = (k) => IDX[k] || (IDX[k] = idxFor(k));
  // key → 台词文字（同时播语音）；voiceOnly=true 时只播语音不返回文字（喝声/痛呼）
  function line(fo, key, voiceOnly) {
    if (!on() || !fo || !fo.per) return null;
    const vk = fo.per.vk || fo.per.k, d = PL().p[vk]; if (!d) return null; const ii = idx(key); if (!ii.length) return null;
    let i = ii[Math.floor(Math.random() * ii.length)]; if (ii.length > 1 && i === fo.per.lastI) i = ii[(ii.indexOf(i) + 1) % ii.length]; fo.per.lastI = i;
    voice(fo, vk, i, key);
    return voiceOnly ? null : d.l[i];
  }
  // 语音：按需加载 voice/voice.js → 单条解码缓存 → 立体声方位 + 距离衰减；同时最多 2 条，同一人 ≥1.2s 间隔
  let vload = null; const dec = {};
  function loadVoice() { if (window.VOICE_DATA) return Promise.resolve(); if (typeof document === 'undefined') return Promise.resolve(); return vload || (vload = new Promise((res) => { const s = document.createElement('script'); s.src = 'voice/voice.js'; s.onload = res; s.onerror = () => res(); document.head.appendChild(s); })); }
  function buf(ac, k, i) {
    const key = k + i; if (dec[key]) return dec[key]; const D = window.VOICE_DATA && window.VOICE_DATA[k]; if (!D || !D[i]) return null;
    const bin = atob(D[i]), u = new Uint8Array(bin.length); for (let j = 0; j < bin.length; j++) u[j] = bin.charCodeAt(j);
    return dec[key] = ac.decodeAudioData(u.buffer).catch(() => null);
  }
  const PRIO = { die: 3, pain: 2, atk: 1 };
  function voice(fo, k, i, key) {
    if (!voiceOn() || !window.SFX || !SFX.ctx || SFX.on === false) return;
    const now = performance.now(), pr = PRIO[key] || 0;
    if (now - fo.per.lastV < (pr >= 2 ? 350 : 1200)) return; if (pr < 2 && now - lastGlobal < 350) return;
    for (let j = playing.length - 1; j >= 0; j--) if (playing[j].end < now) playing.splice(j, 1);
    if (playing.length >= 2 && pr < 2) return;
    const cam = window.G && G.camera; if (!cam) return; const dx = fo.pos.x - cam.position.x, dz = fo.pos.z - cam.position.z, dist = Math.hypot(dx, dz); if (dist > 20) return;
    fo.per.lastV = now; lastGlobal = now;
    if (!window.VOICE_DATA) { loadVoice(); return; } // 第一次：先加载，这一句先不念
    const ac = SFX.ctx, p = buf(ac, k, i); if (!p) return;
    const slot = { end: now + 2500 }; playing.push(slot);
    p.then((b) => {
      if (!b || fo.dead && key !== 'die') return; const s = ac.createBufferSource(); s.buffer = b; s.playbackRate.value = fo.per.pitch;
      const g = ac.createGain(), yaw = Math.atan2(dx, dz), cy = window.G && G.player ? G.player.yaw : 0; // 相机朝 -Z 旋转 yaw
      const rel = Math.sin(yaw - (cy + Math.PI)); g.gain.value = Math.min(1, 1.25 / (1 + dist * 0.16)) * 0.95;
      let out = g; if (ac.createStereoPanner) { const pn = ac.createStereoPanner(); pn.pan.value = Math.max(-0.8, Math.min(0.8, -rel * 0.8)); g.connect(pn); out = pn; }
      s.connect(g); out.connect((SFX.bus && SFX.bus('voice')) || SFX.out || ac.destination); s.start(); slot.end = performance.now() + b.duration / fo.per.pitch * 1000;
      fo._pv = performance.now(); // 告诉 CombatFX：这一下已经有真人喝声了，不再叠合成的“哈”
    });
  }
  // 初见标题卡（多人同时发现时只弹一次）
  function meet(fo, text) {
    if (!on() || !fo || !fo.per || !window.G || !G.toast) return; const now = performance.now(); if (now - lastTitle < 3500) return; lastTitle = now;
    G.toast(`${fo.per.title}${text ? ' ——「' + text + '」' : ''}`, fo.per.P.col, 2.6);
  }

  // ---------------- 没发现你时：日常 ----------------
  const tv = { x: 0, z: 0 };
  function idle(fo, dt, FOES) {
    if (!on() || !fo.per || fo.boss) return false; const S = fo.per, f = fo.f;
    if (!S.home) S.home = { x: fo.pos.x, z: fo.pos.z }; // 出生点：闲逛不会越走越远
    S.nextT -= dt;
    if (S.walk) { // 走向新位置 / 走去和同伴聊天
      const dx = S.walk.x - fo.pos.x, dz = S.walk.z - fo.pos.z, d = Math.hypot(dx, dz);
      if (d < (S.walk.mate ? 1.4 : 0.35) || S.nextT < -8) { const m = S.walk.mate; S.walk = null; S.nextT = 5 + Math.random() * 8; if (m && !m.dead && !m.seen) { S.act = 'Idle_Talking_Loop'; S.face = m; if (m.per && !m.per.walk) { m.per.act = 'Idle_Talking_Loop'; m.per.face = fo; m.per.nextT = S.nextT; } } }
      else { fo.pidle = { turnTo: Math.atan2(dx, dz), spd: S.P.walk === 'Crouch_Fwd_Loop' ? 0.8 : 1.05 }; f.play(f.clips[S.P.walk] ? S.P.walk : 'Walk_Loop', { fade: 0.4, speed: 0.95 }); return true; }
    }
    if (S.nextT <= 0) { // 换一件事做
      S.face = null; const r = Math.random();
      let mate = null; if (r < S.P.chat * 0.22) { let bd = 9; for (const o of FOES) { if (o === fo || o.dead || o.seen || !o.per || o.per.walk) continue; const dd = Math.hypot(o.pos.x - fo.pos.x, o.pos.z - fo.pos.z); if (dd < bd) { bd = dd; mate = o; } } }
      if (mate) { S.walk = { x: mate.pos.x, z: mate.pos.z, mate }; S.nextT = 0; }
      else if (r < 0.55) { const a = Math.random() * 6.283, rad = 1.5 + Math.random() * 4; const hx = S.home.x, hz = S.home.z; S.walk = { x: hx + Math.cos(a) * rad, z: hz + Math.sin(a) * rad }; S.nextT = 0; }
      else { S.act = S.pool[Math.floor(Math.random() * S.pool.length)]; S.nextT = 6 + Math.random() * 9; }
      if (S.walk) { fo.pidle = { turnTo: null, spd: 0 }; return true; }
    }
    let turnTo = null; if (S.face && !S.face.dead) { turnTo = Math.atan2(S.face.pos.x - fo.pos.x, S.face.pos.z - fo.pos.z); const cam = window.G && G.camera; if (Math.random() < dt * 0.12 && window.Foe && Foe.say && cam && Math.hypot(cam.position.x - fo.pos.x, cam.position.z - fo.pos.z) < 22) Foe.say(fo, CHAT[Math.floor(Math.random() * CHAT.length)]); }
    f.play(S.act && f.clips[S.act] ? S.act : fo.idleClip, { fade: 0.5 }); fo.pidle = { turnTo, spd: 0 }; return true;
  }
  const CHAT = ['听说北边又有人失踪了……', '今天的汤太咸了。', '你也听到那声音了？', '晚上别一个人走。', '最近林子里怪怪的。', '回去我请你喝一杯。', '嘘……好像有什么动静。', '明天去集市吗？'];

  // ---------------- 对峙姿态 ----------------
  function gesture(fo) {
    if (!on() || !fo.per || fo.atk || fo.gestT > 0) return; const G_ = fo.per.P.gest; if (!G_.length) return;
    if (window.Brain && Brain.on() && fo.seen && fo.state === 'chase') return; // R55f：交战中不再停下来点头/摇头/抱臂（站着不动 1.1~1.6 秒）
    const clip = G_[Math.floor(Math.random() * G_.length)]; if (!fo.f.clips[clip]) return;
    fo.gestClip = clip; fo.gestT = /Loop/.test(clip) ? 1.6 : 1.1; fo.f.play(clip, { fade: 0.2, once: !/Loop/.test(clip), restart: true });
  }
  function tick(fo, dt) { if (fo.gestT > 0) { fo.gestT -= dt; if (fo.atk || fo.stag > 0 || fo.dead) fo.gestT = 0; } }
  const tauntK = (fo) => (fo && fo.per ? fo.per.P.taunt : 1);
  const fleeHp = (fo) => (fo && fo.per && fo.per.P.fleeHp) || 0;
  const archList = () => KEYS.map(k => ({ k, n: A[k].n, voiced: !!(window.VOICE_DATA && window.VOICE_DATA[k]) }));
  return { apply, line, meet, idle, gesture, tick, tauntK, fleeHp, archOf, archList, loadVoice, A };
})();
