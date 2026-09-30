// 第二十六轮(g)：音量调节面板（MOD audio_mixer，默认开）—— 用户反馈“来个各种音效音乐调节选项，音乐太大了”
//   通道：总音量 / 音乐 BGM / 战斗与动作音效 / 角色语音 / 环境音 / 脚步 / 界面；0–150%，存 localStorage('soulhead_vol')，实时生效
//   入口：右上角 🔊 按钮（原 BGM 开关）、主菜单/暂停菜单的「🔊 音量」按钮；M 键仍是 BGM 开关
//   音乐默认 50%（= 以前的一半）。通道实现在 sfx.js（SFX.bus / setVol）。
window.Mixer = (() => {
  'use strict';
  const on = () => !window.Mods || Mods.on('audio_mixer') !== false;
  const ROWS = [
    ['master', '🔊', '总音量'], ['music', '🎵', '音乐 BGM'], ['sfx', '⚔️', '战斗 / 动作音效'], ['voice', '🗣️', '角色语音'],
    ['amb', '🌲', '环境音（风/鸟/滴水）'], ['steps', '👣', '脚步声'], ['ui', '🖱️', '界面音效'],
  ];
  let el = null, lastPrev = 0;
  function css() {
    if (document.getElementById('mixCss')) return; const s = document.createElement('style'); s.id = 'mixCss';
    s.textContent = `#mixPanel{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:10050;width:min(440px,92vw);padding:18px 22px 16px;border-radius:14px;background:linear-gradient(160deg,#241610f5,#150c08f5);border:1px solid #8a5a34;box-shadow:0 10px 40px #000c,0 0 0 1px #0008 inset;color:#f0dcc0;font-family:system-ui,sans-serif;user-select:none}
#mixPanel h3{margin:0 0 12px;font-size:19px;letter-spacing:2px;color:#ffd9a0;display:flex;align-items:center;justify-content:space-between}
#mixPanel .x{cursor:pointer;background:none;border:none;color:#e6c7a0;font-size:22px;line-height:1;padding:0 4px}
#mixPanel .r{display:grid;grid-template-columns:26px 1fr 150px 46px;align-items:center;gap:8px;margin:7px 0;font-size:14px}
#mixPanel .r i{font-style:normal;font-size:17px;text-align:center}
#mixPanel input[type=range]{width:100%;accent-color:#e89a4a;cursor:pointer}
#mixPanel .v{text-align:right;font-variant-numeric:tabular-nums;color:#ffd9a0}
#mixPanel .r.off span,#mixPanel .r.off .v{opacity:.45;text-decoration:line-through}
#mixPanel .b{display:flex;gap:8px;margin-top:12px;justify-content:flex-end}
#mixPanel .b button{cursor:pointer;padding:6px 14px;border-radius:8px;border:1px solid #6a4a30;background:#2e1e14;color:#f0dcc0;font-size:13px}
#mixPanel .b button:hover{background:#4a2e1a}
#mixPanel .tip{font-size:11px;opacity:.6;margin-top:8px}
.mixBtn{cursor:pointer}`;
    document.head.appendChild(s);
  }
  const pct = (v) => Math.round(v * 100) + '%';
  function preview(k) {
    const now = performance.now(); if (now - lastPrev < 180 || !window.SFX) return; lastPrev = now;
    try { SFX.init && SFX.init(); } catch (e) { }
    if (k === 'sfx' || k === 'master') SFX.punch && SFX.punch(); else if (k === 'ui') SFX.click && SFX.click(); else if (k === 'steps') SFX.step && SFX.step();
    else if (k === 'amb' && window.Ambience && Ambience.demo) { /* 环境音只在游戏中播放 */ }
  }
  function render() {
    const V = SFX.VOL, mOn = SFX.musicOn;
    el.querySelector('.rows').innerHTML = ROWS.map(([k, ic, n]) => `<div class="r${k === 'music' && !mOn ? ' off' : ''}" data-k="${k}"><i>${ic}</i><span>${n}</span><input type="range" min="0" max="150" step="5" value="${Math.round((V[k] ?? 1) * 100)}"><b class="v">${pct(V[k] ?? 1)}</b></div>`).join('');
    el.querySelector('.bgm').textContent = mOn ? '🎵 BGM：开' : '🔇 BGM：关';
  }
  function build() {
    css(); el = document.createElement('div'); el.id = 'mixPanel'; el.style.display = 'none';
    el.innerHTML = `<h3>🔊 音量调节 <button class="x" title="关闭">×</button></h3><div class="rows"></div>
<div class="b"><button class="bgm"></button><button class="def">恢复默认</button><button class="ok">完成</button></div>
<div class="tip">拖动即时生效，自动保存。M 键 = 开/关 BGM。</div>`;
    ['mousedown', 'mouseup', 'click', 'pointerdown', 'wheel', 'dblclick'].forEach(t => el.addEventListener(t, e => e.stopPropagation()));
    el.addEventListener('input', (e) => { const r = e.target.closest('.r'); if (!r) return; const k = r.dataset.k, v = +e.target.value / 100; SFX.setVol(k, v); r.querySelector('.v').textContent = pct(v); preview(k); });
    el.querySelector('.x').onclick = el.querySelector('.ok').onclick = () => show(false);
    el.querySelector('.def').onclick = () => { for (const k in SFX.VDEF) SFX.setVol(k, SFX.VDEF[k]); render(); };
    el.querySelector('.bgm').onclick = () => { SFX.toggleMusic(); render(); };
    document.body.appendChild(el);
    document.addEventListener('keydown', (e) => { if (el.style.display !== 'none' && e.code === 'Escape') { show(false); e.stopPropagation(); } }, true);
  }
  function show(v) {
    if (!window.SFX || !SFX.setVol) return;
    if (!el) build(); if (v === undefined) v = el.style.display === 'none';
    if (v) { if (document.pointerLockElement) document.exitPointerLock(); render(); }
    el.style.display = v ? '' : 'none';
  }
  function wire() {
    if (!on()) return; css();
    const corner = document.getElementById('musicCorner');
    if (corner) { corner.onclick = (e) => { e.stopPropagation(); show(); }; corner.classList.remove('musicBtn'); corner.textContent = '🔊 音量'; corner.title = '音量调节（M 键开关 BGM）'; }
    document.querySelectorAll('#menu .musicBtn').forEach(b => {
      if (b.nextElementSibling && b.nextElementSibling.classList.contains('mixBtn')) return;
      const m = document.createElement('button'); m.className = 'smallbtn mixBtn'; m.textContent = '🔊 音量'; m.onclick = (e) => { e.stopPropagation(); show(); };
      b.after(document.createTextNode(' '), m);
    });
  }
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire(); }
  return { show, on, wire };
})();
