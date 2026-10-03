// R70（总设计师）：打击感增强 hit_feel2 + 野外自动画质 field_tier。
//  · HitFeel.hit(fo, point, vel, k, flags)：foe.js hit() 扣血后调用 —— 高质量血（DecapCam.hitBlood）+ 命中点白热冲击光 + 重击/暴击屏幕边缘红色冲击。
//  · FieldTier：以前 game.js 的自动降档只在洞里跑（野外 frame() 提前 return），野外永远 ultra（4×MSAA+16 采样 AO+体积光+最厚的草）。
//    现在野外帧时间持续偏高 → 记住本机能撑住的野外档位（localStorage r70_ftier），下次进图（加载画面里）直接用；不在战斗中途切档（切档会重编着色器 = 卡一下）。
window.HitFeel = (() => {
  const on = () => !window.Mods || !Mods.on || Mods.on('hit_feel2') !== false;
  let tex = null, pool = [], live = [], vg = null, raf = 0;
  function flashTex() {
    if (tex) return tex; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,245,1)'); gr.addColorStop(0.14, 'rgba(255,230,200,.95)'); gr.addColorStop(0.35, 'rgba(255,90,60,.45)'); gr.addColorStop(1, 'rgba(160,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,240,220,.9)'; g.lineCap = 'round';
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283 + Math.random() * 0.3, L = 34 + Math.random() * 26; g.lineWidth = 2 + Math.random() * 3; g.beginPath(); g.moveTo(64 + Math.cos(a) * 8, 64 + Math.sin(a) * 8); g.lineTo(64 + Math.cos(a) * L, 64 + Math.sin(a) * L); g.stroke(); }
    return (tex = new THREE.CanvasTexture(c));
  }
  function sprite(sc) { let s = pool.pop(); if (!s) { s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex(), transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false })); s.renderOrder = 8; s.frustumCulled = false; } if (s.parent !== sc) sc.add(s); return s; }
  function tick() {
    raf = 0; const now = performance.now();
    for (let i = live.length - 1; i >= 0; i--) { const L = live[i], u = (now - L.t0) / L.d; if (u >= 1) { L.s.visible = false; if (L.s.parent) L.s.parent.remove(L.s); pool.push(L.s); live.splice(i, 1); continue; }
      const e = 1 - (1 - u) * (1 - u); L.s.scale.setScalar(L.r0 + (L.r1 - L.r0) * e); L.s.material.opacity = (1 - u) * (1 - u) * L.op; L.s.material.rotation = L.rot + u * 0.4; }
    if (live.length) raf = requestAnimationFrame(tick);
  }
  function edge(k, col) {
    if (!vg) { vg = document.createElement('div'); vg.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:31;opacity:0;background:radial-gradient(ellipse at 50% 50%,transparent 52%,var(--c,rgba(170,0,10,.85)) 100%)'; document.body.appendChild(vg); }
    vg.style.setProperty('--c', col || 'rgba(170,0,10,.85)'); try { vg.animate([{ opacity: Math.min(0.9, 0.35 + 0.4 * k) }, { opacity: 0 }], { duration: 220 + 160 * k, easing: 'ease-out' }); } catch (e) { }
  }
  function hit(fo, pt, vel, k, fl) {
    if (!on() || !pt || !window.THREE) return; fl = fl || {};
    try { if (window.DecapCam && DecapCam.hitBlood) DecapCam.hitBlood(pt, vel, k); } catch (e) { }
    try {
      const W = window.Worlds && Worlds.active && Worlds._W; if (!W || !W.B) return; const s = sprite(W.B.sc); s.visible = true; s.position.copy(pt);
      const big = fl.crit || fl.charged || fl.brk || fl.kill; live.push({ s, t0: performance.now(), d: big ? 150 : 95, r0: 0.08, r1: (big ? 0.75 : 0.42) * (0.7 + 0.5 * Math.min(1.5, k)), op: big ? 1 : 0.8, rot: Math.random() * 6.28 });
      if (!raf) raf = requestAnimationFrame(tick);
      if (big) edge(Math.min(1.4, k + 0.3), fl.crit ? 'rgba(255,170,40,.8)' : 'rgba(170,0,10,.85)');
    } catch (e) { }
  }
  function warm(sc) { const s = sprite(sc); s.visible = true; s.position.set(0, -50, 0); s.material.opacity = 0; pool.push(s); return s; } // DecapCam.warm 进图时一起预编译（不在第一次命中时现编）
  return { on, hit, edge, warm };
})();

window.FieldTier = (() => {
  const on = () => !window.Mods || !Mods.on || Mods.on('field_tier') !== false;
  const ORDER = ['mid', 'high', 'ultra'], KEY = 'r70_ftier', QS = new URLSearchParams(location.search);
  let last = 0, buf = [], badN = 0, goodT = 0, lastStep = 0;
  const post = () => { const g = window.G || window.__game; return g && g.post && g.post.setTier && g.post.style === 'master' ? g.post : null; };
  const stored = () => { try { const v = localStorage.getItem(KEY); return ORDER.includes(v) ? v : null; } catch (e) { return null; } };
  const store = v => { try { localStorage.setItem(KEY, v); } catch (e) { } };
  function apply() { const p = post(), t = stored(); if (p && t && p.tier !== t && ORDER.indexOf(t) < ORDER.indexOf(p.tier)) { try { p.setTier(t); } catch (e) { } } }
  function frame() {
    requestAnimationFrame(frame); const now = performance.now(), d = last ? now - last : 0; last = now;
    if (!on() || QS.has('q')) return; const W = window.Worlds && Worlds.active && Worlds._W, g = window.G; if (!W) { buf.length = 0; return; }
    if (W.busy || !W.B) { apply(); buf.length = 0; return; } // 加载画面期间切档：着色器在黑屏里编，不在战斗中卡（建场景前就生效，草的层数也跟着变）
    if (!g || g.uiOpen || !g.playing || document.hidden || (window.DecapCam && DecapCam.active) || d <= 0 || d > 400) return;
    buf.push(d); if (buf.length < 90) return; const a = buf.slice().sort((x, y) => x - y), med = a[a.length >> 1]; buf.length = 0;
    const p = post(); if (!p) return; const cur = ORDER.indexOf(p.tier), st = stored(), si = st ? ORDER.indexOf(st) : 2;
    if (med > 21) { badN++; goodT = 0; if (badN >= 2 && cur > 0 && now - lastStep > 12000) { lastStep = now; badN = 0; store(ORDER[cur - 1]); if (window.G && G.toast && !FieldTier._said) { FieldTier._said = 1; G.toast('⚡ 野外画质自动调为「' + (cur - 1 === 1 ? '高' : '中') + '」以保持流畅（下一个地点生效 · MOD「野外自动画质」可关）', '#cfe0ff', 3.2); } } }
    else { badN = 0; if (med < 18) { goodT += 1.5; if (goodT > 240 && si < 2) { goodT = 0; store(ORDER[si + 1]); } } }
  }
  requestAnimationFrame(frame);
  return { on, apply, reset() { try { localStorage.removeItem(KEY); } catch (e) { } }, get tier() { return stored(); } };
})();
