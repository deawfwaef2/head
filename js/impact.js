// 第二十六轮(h)：打击感强化（MOD hit_impact，默认开）—— 用户反馈“战斗效果太烂，打击感非常弱”
//   不改 combat.js / foe.js：包一层 CombatFX.event（worlds.js 每次命中/击杀/格挡都会调用它），命中时叠加：
//   1. 受击顿帧：被砍中的敌人/野兽动画冻结 55–150ms（重斩/破绽/击杀更长）——“砍进肉里”的停顿感（玩家镜头不冻，操作不卡）
//   2. 斩痕：沿你的出刀方向在命中处划过一道亮刃光（重斩/击杀更宽更红），格挡时是黄色火花
//   3. 低频重击：命中叠一层 110→40Hz 的“闷响” + 短促撕裂噪声，走 SFX 战斗通道（受音量面板控制）
//   4. 屏幕边缘脉冲：击杀红色、破防/重斩白色，180ms
window.Impact = (() => {
  'use strict';
  const on = () => !window.Mods || Mods.on('hit_impact') !== false;
  let root = null, vign = null;
  const _v = window.THREE ? new THREE.Vector3() : null;
  function css() {
    if (document.getElementById('impCss')) return; const s = document.createElement('style'); s.id = 'impCss';
    s.textContent = `#impFx{position:fixed;inset:0;pointer-events:none;z-index:24;overflow:hidden}
#impFx .sw{position:absolute;height:0;transform-origin:50% 50%}
#impFx .sl{position:absolute;left:0;top:-3px;width:100%;height:6px;border-radius:6px;transform-origin:0 50%;background:linear-gradient(90deg,transparent,#fff 18%,#fff 82%,transparent);box-shadow:0 0 10px #fff,0 0 22px #ff6a3a;animation:impSl .2s ease-out forwards}
#impFx .sl.hv{height:11px;top:-5px;box-shadow:0 0 14px #fff,0 0 34px #ff2a1a,0 0 60px #ff2a1a88}
#impFx .sl.bk{height:4px;background:linear-gradient(90deg,transparent,#fff6a0 30%,#ffd040 70%,transparent);box-shadow:0 0 12px #ffc030}
#impFx .bu{position:absolute;width:90px;height:90px;margin:-45px 0 0 -45px;border-radius:50%;background:radial-gradient(circle,#fffbe8 0,#ffb070aa 30%,transparent 65%);animation:impBu .16s ease-out forwards;mix-blend-mode:screen}
#impFx .bu.bk{background:radial-gradient(circle,#fff 0,#ffd040cc 25%,transparent 60%)}
@keyframes impSl{0%{opacity:1;transform:scaleX(0)}35%{opacity:1;transform:scaleX(1)}100%{opacity:0;transform:scaleX(1.04)}}
@keyframes impBu{0%{opacity:1;transform:scale(.3)}100%{opacity:0;transform:scale(1.25)}}
#impVg{position:fixed;inset:0;pointer-events:none;z-index:23;opacity:0;transition:opacity .18s ease-out}`;
    document.head.appendChild(s);
  }
  function ensure() {
    if (root && root.isConnected) return; css();
    root = document.createElement('div'); root.id = 'impFx'; document.body.appendChild(root);
    vign = document.createElement('div'); vign.id = 'impVg'; document.body.appendChild(vign);
  }
  function proj(p, dy) {
    const cam = window.G && G.camera; if (!cam || !_v || !p) return null;
    _v.copy(p); _v.y += dy || 0; _v.project(cam); if (_v.z > 1 || _v.z < -1) return null;
    return [(_v.x + 1) / 2 * innerWidth, (1 - _v.y) / 2 * innerHeight];
  }
  // 出刀方向（屏幕角度）：combat.js 的 S.sw.v（x 右 y 上）；没有就按连招默认斜劈
  function swingAng() {
    const S = window.Combat && Combat.state, v = S && S.sw && S.sw.v;
    if (v && (v.x || v.y)) return Math.atan2(-v.y, v.x);
    return Math.PI / 4 * (Math.random() < 0.5 ? 1 : 3);
  }
  function streak(x, y, ang, len, cls) {
    const el = document.createElement('div'); el.className = 'sw'; el.innerHTML = `<div class="sl ${cls || ''}"></div>`;
    el.style.width = len + 'px'; el.style.left = (x - len / 2) + 'px'; el.style.top = y + 'px'; el.style.transform = `rotate(${ang}rad)`;
    root.appendChild(el); setTimeout(() => el.remove(), 260);
    const b = document.createElement('div'); b.className = 'bu ' + (cls === 'bk' ? 'bk' : ''); b.style.left = x + 'px'; b.style.top = y + 'px';
    root.appendChild(b); setTimeout(() => b.remove(), 200);
  }
  let vgT = 0;
  function pulse(col, a) {
    vign.style.transition = 'none'; vign.style.background = `radial-gradient(ellipse at center, transparent 45%, ${col} 100%)`; vign.style.opacity = String(a);
    void vign.offsetWidth; vign.style.transition = 'opacity .22s ease-out'; clearTimeout(vgT); vgT = setTimeout(() => { vign.style.opacity = '0'; }, 40);
  }
  // 受击顿帧：冻结受害者的动画 mixer
  const frozen = new Map();
  function freeze(mixer, ms) {
    if (!mixer) return; const now = performance.now(); let rec = frozen.get(mixer);
    if (rec && rec.end >= now + ms) return; // 已经在更长的顿帧里：只延长不缩短
    if (rec) clearTimeout(rec.t); else { rec = { ts: mixer.timeScale || 1 }; frozen.set(mixer, rec); }
    rec.end = now + ms; mixer.timeScale = 0;
    rec.t = setTimeout(() => { mixer.timeScale = rec.ts; frozen.delete(mixer); }, ms);
  }
  function mixerOf(fo) {
    if (!fo) return null; if (fo.f && fo.f.mixer) return fo.f.mixer;
    if (window.Beasts && Beasts.list) { const b = Beasts.list.find(x => x.stub === fo); if (b) return b.mixer; }
    return null;
  }
  function posOf(fo) {
    if (!fo) return null; if (fo.f && fo.anchor) return [fo.anchor.pos, -0.12];
    if (window.Beasts && Beasts.list) { const b = Beasts.list.find(x => x.stub === fo); if (b) return [b.pos, (b.T && b.T.h || 0.8) * 0.6]; }
    return fo.pos ? [fo.pos, 1.1] : null;
  }
  function thump(k) {
    const ac = window.SFX && SFX.ctx, out = window.SFX && SFX.out; if (!ac || !out || SFX.on === false) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(115, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.16);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.42 * k, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.22);
    if (!thump.nb) { thump.nb = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate); const d = thump.nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2); }
    const n = ac.createBufferSource(), f = ac.createBiquadFilter(), ng = ac.createGain(); n.buffer = thump.nb; f.type = 'bandpass'; f.frequency.value = 900 + 500 * k; f.Q.value = 0.8;
    ng.gain.setValueAtTime(0.22 * k, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.09); n.connect(f); f.connect(ng); ng.connect(out); n.start(t, 0, 0.1);
  }
  function fx(t, fo, d) {
    if (!on() || !window.Worlds || !Worlds.active) return;
    ensure(); d = d || {};
    const heavy = !!(d.charged || d.brk), P = posOf(fo), s = P && proj(P[0], P[1]);
    if (t === 'hit') {
      freeze(mixerOf(fo), heavy ? 115 : 60);
      if (s) streak(s[0], s[1], swingAng(), heavy ? 330 : 230, heavy ? 'hv' : '');
      thump(heavy ? 1.25 : 0.85);
      if (heavy) pulse('#ffffff55', 1);
    } else if (t === 'kill' || t === 'decap' || t === 'execute' || t === 'onecut' || t === 'decapAlive') {
      freeze(mixerOf(fo), 150);
      if (s && t !== 'decap') streak(s[0], s[1], swingAng(), 380, 'hv');
      thump(1.5); pulse('#c0101088', 1);
    } else if (t === 'blocked' || t === 'guard' || t === 'parry') {
      if (s) streak(s[0], s[1], swingAng() + Math.PI / 2, 120, 'bk');
    }
  }
  function wrap() {
    if (!window.CombatFX || CombatFX._impWrapped) return !!(window.CombatFX && CombatFX._impWrapped);
    const orig = CombatFX.event;
    CombatFX.event = function (t, fo, d) { let r; try { r = orig.apply(this, arguments); } finally { try { fx(t, fo, d); } catch (e) { } } return r; };
    CombatFX._impWrapped = true; return true;
  }
  if (typeof document !== 'undefined') { const go = () => { if (!wrap()) setTimeout(go, 500); }; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go(); }
  return { on, fx, freeze, _frozen: frozen };
})();
