// R49h MOD decap_cam（默认开）：斩首特写 —— 慢动作电影镜头。
// 流程：黑边滑入 → 时间慢下来（只慢敌人/头/血，玩家照常）+ 音效 → 镜头不切走，只是轻轻推近并转向飞出的头，
// 让你看清她的头飞出去、表情从惊愕变成绝望 → 颈口动脉式喷血（雾 + 拉丝血线 + 落地血斑）→ 时间平滑恢复。
// 约束：不卡帧（平滑时间曲线，Foe.slowSet）；出错/切场景/死亡一律还原相机、FOV、色调、音乐；Enter 可跳过；
//       多敌围攻时不触发（Boss 除外）；特写期间锁血；不新建模型/贴图（血线/血斑为粒子，雾为画布光斑）。
// 注：出猎世界里 HOOK 不跑，本模块由 worlds.js 直接调用 DecapCam.onEvent / DecapCam.pre。
window.DecapCam = (() => {
  const on = () => !window.Mods || Mods.on('decap_cam') !== false;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), ease = t => t * t * (3 - 2 * t), lerp = (a, b, t) => a + (b - a) * t;
  const TL = { in: 0.15, hold: 4.6, out: 5.8 }; // 真实秒
  const kAt = t => t < TL.in ? lerp(1, 0.075, ease(t / TL.in)) : t < TL.hold ? 0.075 + 0.04 * ((t - TL.in) / (TL.hold - TL.in)) : lerp(0.115, 1, ease(clamp((t - TL.hold) / (TL.out - TL.hold), 0, 1)));
  // 表情关键帧（真实秒）：惊愕 → 难以置信 → 绝望 → 眼神熄灭
  const EX = [[0, { surprised: 0.5, oh: 0.3 }], [0.9, { surprised: 0.5, sad: 0.3, oh: 0.2 }], [2.0, { sad: 0.85, surprised: 0.3 }], [3.2, { sad: 1, blink: 0.3 }], [4.6, { sad: 0.9, blink: 0.75 }], [5.8, { sad: 0.85, blink: 0.85 }]];
  function exprAt(t) {
    let i = 0; while (i < EX.length - 1 && t >= EX[i + 1][0]) i++; const a = EX[i], b = EX[Math.min(i + 1, EX.length - 1)], u = a === b ? 0 : ease(clamp((t - a[0]) / (b[0] - a[0]), 0, 1)), o = {};
    for (const k of new Set([...Object.keys(a[1]), ...Object.keys(b[1])])) o[k] = lerp(a[1][k] || 0, b[1][k] || 0, u); return o;
  }
  let S = null, lastEnd = -99, css = false, root = null, bl = null, kNow = 1;
  const V3 = () => window.THREE && THREE.Vector3;
  // ---------------- 音效（Web Audio 合成，走 SFX 的 sfx 总线）----------------
  let nbuf = null, duck = null;
  const A = () => { const s = window.SFX; if (!s || !s.on || !s.ctx) return null; return { c: s.ctx, o: s.bus ? s.bus('sfx') : s.out }; };
  function tone(a, type, f0, f1, t, d, vol) { const o = a.c.createOscillator(), g = a.c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + d); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, d * 0.2)); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(a.o); o.start(t); o.stop(t + d + 0.05); }
  function noise(a, t, d, vol, type, f0, f1, q) {
    if (!nbuf || nbuf.sampleRate !== a.c.sampleRate) { nbuf = a.c.createBuffer(1, a.c.sampleRate * 2, a.c.sampleRate); const ch = nbuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
    const s = a.c.createBufferSource(), f = a.c.createBiquadFilter(), g = a.c.createGain(); s.buffer = nbuf; f.type = type; f.Q.value = q || 0.8; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, d * 0.25)); g.gain.exponentialRampToValueAtTime(0.0001, t + d); s.connect(f); f.connect(g); g.connect(a.o); s.start(t, Math.random()); s.stop(t + d + 0.05);
  }
  function sfxStart() {
    const a = A(); if (!a) return; const t = a.c.currentTime + 0.005;
    tone(a, 'sine', 120, 32, t, 0.8, 0.6); noise(a, t, 0.16, 0.38, 'highpass', 4200, 1600, 0.7); noise(a, t, 0.5, 0.28, 'lowpass', 1000, 180, 0.7); // 斩击 + 闷响
    tone(a, 'sine', 2700, 2550, t + 0.05, 1.3, 0.03); // 耳鸣
    tone(a, 'triangle', 420, 40, t + 0.1, 2.6, 0.07); noise(a, t + 0.1, 2.2, 0.09, 'bandpass', 2400, 120, 1.2); // 时间被拉长
    [0.9, 2.1, 3.3, 4.5].forEach(d => { tone(a, 'sine', 62, 40, t + d, 0.24, 0.5); tone(a, 'sine', 54, 38, t + d + 0.18, 0.22, 0.3); }); // 心跳
    noise(a, t + 1.8, 2.2, 0.05, 'bandpass', 1500, 900, 3); tone(a, 'triangle', 500, 260, t + 1.8, 2.4, 0.04); // 极轻的一声抽气 / 哀鸣
    try { const b = SFX.bus('music'), b2 = SFX.bus('amb'); duck = [[b, b.gain.value], [b2, b2.gain.value]]; duck.forEach(([g, v]) => g.gain.setTargetAtTime(v * 0.22, a.c.currentTime, 0.08)); } catch (e) { duck = null; }
  }
  function sfxSpurt(str) { const a = A(); if (!a) return; const t = a.c.currentTime; noise(a, t, 0.32, 0.2 * str + 0.05, 'bandpass', 800, 260, 1.6); tone(a, 'sine', 90, 55, t, 0.2, 0.12 * str); }
  function sfxEnd() { const a = A(); if (!a) return; const t = a.c.currentTime; noise(a, t, 0.7, 0.13, 'bandpass', 300, 2600, 1.1); tone(a, 'sine', 55, 130, t, 0.5, 0.1); }
  function unduck() { if (!duck) return; try { duck.forEach(([g, v]) => g.gain.setTargetAtTime(v, SFX.ctx.currentTime, 0.25)); } catch (e) { } duck = null; }
  // ---------------- 界面 ----------------
  function addCss() {
    if (css) return; css = true; const st = document.createElement('style'); st.textContent = `
body.dcam>*:not(#game):not(#dcRoot):not(script):not(style):not(link){visibility:hidden!important}
#dcRoot{position:fixed;inset:0;z-index:90;pointer-events:none;overflow:hidden}
#dcRoot .bar{position:absolute;left:0;right:0;height:13vh;background:#000;transition:transform .32s cubic-bezier(.2,.8,.2,1)}
#dcRoot .bt{top:0;transform:translateY(-101%)}#dcRoot .bb{bottom:0;transform:translateY(101%)}
#dcRoot.on .bar{transform:none}
#dcRoot .vg{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 45%,rgba(40,0,6,.65) 100%);opacity:0;transition:opacity .25s}
#dcRoot.on .vg{opacity:1}
#dcRoot .fl{position:absolute;inset:0;background:#fff;opacity:0}
#dcRoot .sl{position:absolute;left:50%;top:50%;width:150vw;height:5px;margin-left:-75vw;background:linear-gradient(90deg,transparent,#fff 30%,#ffd8d0 50%,#fff 70%,transparent);box-shadow:0 0 28px 8px rgba(255,120,110,.8);opacity:0;transform:rotate(-24deg) scaleX(.2)}
#dcRoot .cap{position:absolute;left:0;right:0;bottom:27vh;text-align:center;opacity:0;transform:translateY(14px);transition:opacity .7s,transform 1.2s cubic-bezier(.2,.8,.2,1)}
#dcRoot .cap.on{opacity:1;transform:none}
#dcRoot .cap b{display:block;font:900 clamp(54px,9vh,104px)/1 "Noto Serif SC","Songti SC","STKaiti",serif;letter-spacing:.5em;margin-right:-.5em;color:#fff;text-shadow:0 0 22px rgba(220,20,40,.95),0 4px 0 #6a0010,0 0 60px rgba(160,0,20,.8)}
#dcRoot .cap i{display:block;margin-top:12px;font:700 clamp(20px,3.1vh,30px)/1.3 system-ui,"PingFang SC","Microsoft YaHei",sans-serif;font-style:normal;letter-spacing:.2em;color:#ffd7d0;text-shadow:0 2px 8px #000}
#dcRoot .sub{position:absolute;left:0;right:0;bottom:15.2vh;text-align:center;font:800 clamp(24px,3.8vh,38px)/1.3 system-ui,"PingFang SC","Microsoft YaHei",sans-serif;color:#fff;text-shadow:0 2px 10px #000,0 0 18px rgba(0,0,0,.9);opacity:0;transform:translateY(8px);transition:opacity .35s,transform .5s}
#dcRoot .sub.on{opacity:1;transform:none}#dcRoot .sub em{font-style:normal;color:#ff9a8a;margin-right:.5em}
#dcRoot .ld{position:absolute;border-radius:48% 52% 46% 54%/55% 45% 55% 45%;background:radial-gradient(circle at 38% 34%,rgba(255,120,120,.55),rgba(140,6,16,.82) 40%,rgba(80,0,8,.78) 100%);filter:blur(.7px);opacity:0;transition:opacity .08s,top 3.2s cubic-bezier(.5,0,1,.6)}
#dcRoot .ld.on{opacity:.85}#dcRoot .ld.off{opacity:0;margin-top:140px;transition:opacity 1.6s 1.4s,margin-top 3.2s cubic-bezier(.5,0,1,.6)}`;
    document.head.appendChild(st);
  }
  function mkUI(n, name, sa) {
    addCss(); if (root) root.remove(); root = document.createElement('div'); root.id = 'dcRoot';
    root.innerHTML = '<div class="vg"></div><div class="sl"></div><div class="fl"></div><div class="bar bt"></div><div class="bar bb"></div><div class="cap"><b>斩 首</b><i></i></div><div class="sub"></div>';
    root.querySelector('.cap i').textContent = '第 ' + n + ' 颗首级' + (name ? ' · ' + name : ''); document.body.appendChild(root); document.body.classList.add('dcam'); void root.offsetWidth; root.classList.add('on');
    const fl = root.querySelector('.fl'), sl = root.querySelector('.sl'), dg = sa == null ? -24 : Math.round(-sa * 180 / Math.PI);
    try { fl.animate([{ opacity: 0.75 }, { opacity: 0 }], { duration: 260, easing: 'ease-out' }); sl.animate([{ opacity: 1, transform: `rotate(${dg}deg) scaleX(.2)` }, { opacity: 1, transform: `rotate(${dg}deg) scaleX(1)`, offset: 0.35 }, { opacity: 0, transform: `rotate(${dg}deg) scaleX(1.1)` }], { duration: 900, easing: 'ease-out' }); } catch (e) { }
  }
  // 刀痕：颈口一道沿挥刀方向的亮痕，慢镜头里慢慢淡出
  function slashArc(s) {
    const T = THREE, np = new T.Vector3(); if (!neckPos(s, np)) return;
    if (!slashArc.tex) { const c = document.createElement('canvas'); c.width = 256; c.height = 16; const g = c.getContext('2d'), h = g.createLinearGradient(0, 0, 256, 0); h.addColorStop(0, 'rgba(255,255,255,0)'); h.addColorStop(0.35, 'rgba(255,240,230,.9)'); h.addColorStop(0.6, 'rgba(255,255,255,1)'); h.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = h; g.fillRect(0, 0, 256, 16); const v = g.createLinearGradient(0, 0, 0, 16); v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.5, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = v; g.fillRect(0, 0, 256, 16); slashArc.tex = new T.CanvasTexture(c); }
    const grp = slashArc.grp || (slashArc.grp = (() => { const g0 = new T.Group(); for (const [w, h, col, op] of [[1.9, 0.07, '#ffffff', 1], [2.3, 0.2, '#ff3a30', 0.55]]) { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: slashArc.tex, color: col, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false, depthTest: false, side: T.DoubleSide })); m.renderOrder = 9; m.userData.op = op; m.frustumCulled = false; g0.add(m); } return g0; })());
    grp.children.forEach(m => { m.material.opacity = m.userData.op; }); grp.position.copy(np); grp.rotation.set(0, 0, 0); grp.lookAt(G.camera.position); grp.rotateZ(s.sa || 0); grp.scale.set(0.3, 1, 1); s.sc.add(grp); s.arc = grp;
  }
  function arcTick(s, real) {
    const a = s.arc; if (!a) return; s.arcT = (s.arcT || 0) + real; const k = s.arcT; a.scale.x = Math.min(1.15, 0.3 + k * 6); const op = k < 0.15 ? 1 : Math.max(0, 1 - (k - 0.15) / 1.4);
    a.children.forEach(m => { m.material.opacity = m.userData.op * op; }); if (op <= 0) { a.parent && a.parent.remove(a); s.arc = null; } // 几何/材质复用，不再每次新建再丢弃
  }
  function lensBlood(dist) {
    if (!root || dist > 4.8) return; const n = dist < 2.5 ? 9 : 5;
    for (let i = 0; i < n; i++) { const d = document.createElement('div'); d.className = 'ld'; const s = 9 + Math.random() * (dist < 2.5 ? 52 : 30); d.style.cssText = `left:${6 + Math.random() * 88}%;top:${8 + Math.random() * 58}%;width:${s}px;height:${s * (1.1 + Math.random() * 0.9)}px;transform:rotate(${(Math.random() - 0.5) * 50}deg)`; root.insertBefore(d, root.querySelector('.bar')); setTimeout(() => d.classList.add('on'), 40 + i * 50); setTimeout(() => d.classList.add('off'), 1500 + i * 120); }
  }
  // ---------------- 血：动脉喷射（拉丝血线 + 落地血斑 + 血雾）----------------
  const CAP = 340, NSPLAT = 70, NMIST = 22;
  function bloodInit(sc, H) {
    if (bl && bl.sc === sc) { bl.H = H; return bl; } if (bl) bloodKill();
    const geo = new THREE.IcosahedronGeometry(0.014, 1), mat = new THREE.MeshStandardMaterial({ color: 0x8a0710, emissive: 0x3a0006, roughness: 0.22, metalness: 0.0 }); // R54n：滴状血珠，不再是拉长的圆柱
    const im = new THREE.InstancedMesh(geo, mat, CAP); im.frustumCulled = false; im.count = 0; im.renderOrder = 4; const c0 = new THREE.Color(), cs = ['#7a0610', '#a50d16', '#c4141c', '#8a0710']; for (let i = 0; i < CAP; i++) { c0.set(cs[i & 3]); im.setColorAt(i, c0); } sc.add(im);
    const sg = new THREE.CircleGeometry(1, 10).rotateX(-Math.PI / 2), sm = new THREE.MeshBasicMaterial({ color: 0x5a0309, transparent: true, opacity: 0.88, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
    const splats = []; for (let i = 0; i < NSPLAT; i++) { const m = new THREE.Mesh(sg, sm); m.visible = false; m.renderOrder = 2; sc.add(m); splats.push(m); }
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, 'rgba(170,10,20,.95)'); gr.addColorStop(0.5, 'rgba(120,4,12,.5)'); gr.addColorStop(1, 'rgba(90,0,8,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(cv), mist = []; for (let i = 0; i < NMIST; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 })); sp.visible = false; sp.renderOrder = 5; sc.add(sp); mist.push({ o: sp, t: 0, d: 1, v: new THREE.Vector3(), s: 0.2 }); }
    bl = { sc, H, im, splats, si: 0, mist, mi: 0, P: [], tmpM: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3(), Y: new THREE.Vector3(0, 1, 0), d: new THREE.Vector3() }; return bl;
  }
  function bloodKill() { if (!bl) return; try { bl.sc.remove(bl.im); bl.splats.forEach(m => bl.sc.remove(m)); bl.mist.forEach(m => bl.sc.remove(m.o)); if (bl.pools) bl.pools.forEach(p => bl.sc.remove(p.m)); bl.im.dispose(); } catch (e) { } bl = null; }
  function drop(p, v, life, big) { if (!bl || bl.P.length >= CAP) return; bl.P.push({ x: p.x, y: p.y, z: p.z, vx: v.x, vy: v.y, vz: v.z, t: life, big: big || 1 }); }
  function puff(p, s, v) { if (!bl) return; const m = bl.mist[bl.mi++ % bl.mist.length]; m.o.position.copy(p); m.o.visible = true; m.t = m.d = 0.5 + Math.random() * 0.5; m.s = s; m.v.copy(v).multiplyScalar(0.25); m.o.scale.setScalar(s); }
  function splat(x, z, sz) { if (!bl) return; const m = bl.splats[bl.si++ % NSPLAT]; m.position.set(x, bl.H(x, z) + 0.014, z); m.scale.set(sz * (0.8 + Math.random() * 0.8), 1, sz * (0.8 + Math.random() * 0.8)); m.rotation.y = Math.random() * 6.28; m.visible = true; }
  function bloodTick(gd) { // gd = 游戏时间 dt（已乘慢放系数）
    if (!bl) return; const B = bl, P = B.P; let n = 0;
    for (let i = P.length - 1; i >= 0; i--) {
      const d = P[i]; d.t -= gd; d.vy -= 9.8 * gd; d.vx *= 1 - 0.35 * gd; d.vz *= 1 - 0.35 * gd; d.x += d.vx * gd; d.y += d.vy * gd; d.z += d.vz * gd;
      const gy = B.H(d.x, d.z) + 0.01; if (d.y <= gy || d.t <= 0) { if (d.y <= gy && d.big > 0.7 && Math.random() < 0.55) splat(d.x, d.z, 0.05 + Math.random() * 0.1 * d.big); P[i] = P[P.length - 1]; P.pop(); }
    }
    for (let i = 0; i < P.length; i++) {
      const d = P[i], sp = Math.hypot(d.vx, d.vy, d.vz) || 1, len = clamp(1 + sp * 0.16, 1, 2.4), r = d.big;
      B.d.set(d.vx / sp, d.vy / sp, d.vz / sp); B.q.setFromUnitVectors(B.Y, B.d); B.s.set(r, len, r); B.p.set(d.x, d.y, d.z); B.tmpM.compose(B.p, B.q, B.s); B.im.setMatrixAt(n++, B.tmpM);
    }
    B.im.count = n; B.im.instanceMatrix.needsUpdate = true;
    for (const m of B.mist) if (m.o.visible) { m.t -= gd; if (m.t <= 0) { m.o.visible = false; continue; } const u = 1 - m.t / m.d; m.o.position.addScaledVector(m.v, gd); m.v.y -= 0.6 * gd; m.o.scale.setScalar(m.s * (1 + u * 2.4)); m.o.material.opacity = 0.5 * (1 - u) * Math.min(1, u * 8 + 0.2); }
  }
  // ---------------- 流程 ----------------
  function gate(fo) {
    if (!on() || S || !window.THREE || !window.G || !G.camera || !window.Worlds || !Worlds.active) return false; const W = Worlds._W; if (!W || !W.B) return false;
    if (performance.now() / 1000 - lastEnd < 6) return false; if (G.uiOpen || G.cine || !G.playing || (G.S && G.S.hp <= 0)) return false;
    const cl = document.body.classList; if (cl.contains('sgcine') || cl.contains('hubon') || cl.contains('dcam')) return false;
    if (!fo || !fo.f || !fo.f.holder) return false;
    if (!fo.boss && window.Foe && Foe.foes) { let n = 0; for (const o of Foe.foes) if (o !== fo && !o.dead && o.seen && o.pos && fo.pos && o.pos.distanceTo(fo.pos) < 10) n++; if (n >= 4) return false; }
    return true;
  }
  function onEvent(t, fo) {
    if (t !== 'decap') return; try {
      if (window.G && G.S) G.S.decapN = (G.S.decapN || (G.S.heads ? G.S.heads.length : 0)) + 1;
      if (!gate(fo)) return; const W = Worlds._W, n = (G.S && G.S.decapN) || 1, P = G.postFx && G.postFx.P, hp = fo.h && fo.h.name;
      const sw = window.Combat && Combat.state && Combat.state.sw, sa = sw ? Math.atan2(sw.dy || 0, sw.dx || 1) : -0.42;
      S = { t: 0, fo, hb: fo.f.hb, hp0: G.S.hp, pg: 0, pulse: -1, sc: W.B.sc, H: W.B.H, P0: P ? { sat: P.sat, contrast: P.contrast, vig: P.vig } : null, P, fov0: G.camera.fov, lens: false, skipped: false, tr: 0, ended: false, ex: '', sa };
      plan(S); (B2() ? bloodInit2 : bloodInit)(S.sc, S.H); mkUI(n, fo.h && (fo.h.name || fo.h.n), sa); sfxStart(); slashArc(S);
      const hv = headPos(S, new THREE.Vector3()), dd = hv ? hv.distanceTo(G.camera.position) : 9; S.dist = dd; setTimeout(() => lensBlood(dd), 60);
    } catch (e) { console.warn('DecapCam', e); finish(); }
  }
  const SH = n => [n + '——！！', '不……不可能……', '她的头……！', '怎么会……！', '啊啊啊——！'], BRV = ['你这个怪物！', '我要杀了你！', '为她报仇！', '别让他跑了！', '拿命来！'], FEAR = ['快逃！快逃啊！', '别、别过来……', '他是恶魔！', '我不想死……', '神啊……', '救命——！'];
  function witnesses(s) {
    const o = []; try { for (const w of (Foe.foes || [])) { if (w === s.fo || w.dead || !w.pos || !s.fo.pos) continue; const d = w.pos.distanceTo(G.camera.position); if (d < 24) o.push([d, w]); } } catch (e) { } o.sort((a, b) => a[0] - b[0]); return o.slice(0, 3).map(x => x[1]);
  }
  function plan(s) {
    const nm = (s.fo.h && (s.fo.h.name || s.fo.h.n)) || '她', pick = a => a[Math.floor(Math.random() * a.length)], ws = witnesses(s), sh = SH(nm), at = [0.8, 2.1, 3.4];
    s.talk = ws.map((w, i) => ({ t: at[i], w, line: w.boss ? pick(['……有意思。你，会后悔的。', '一颗头而已……下一个就是你。']) : i === 0 ? pick(sh) : (w.brave ? pick(BRV) : pick(FEAR)) }));
  }
  function sayLines(s) {
    if (!s.talk) return; for (const q of s.talk) { if (q.done || s.t < q.t) continue; q.done = true; try { if (q.w.dead) continue; if (window.Foe && Foe.say) Foe.say(q.w, q.line, '#ffd0c0'); const el = root && root.querySelector('.sub'); if (el) { el.innerHTML = ''; const em = document.createElement('em'); em.textContent = (q.w.h && (q.w.h.name || q.w.h.n)) || ''; el.appendChild(em); el.appendChild(document.createTextNode('「' + q.line + '」')); el.classList.add('on'); clearTimeout(s.subT); s.subT = setTimeout(() => el.classList.remove('on'), 1900); } } catch (e) { } }
  }
  function headPos(s, out) { try { s.fo.f.holder.getWorldPosition(out); out.y += 0.08; return out; } catch (e) { return null; } }
  function neckPos(s, out, up) {
    const nb = s.fo.f.bones && (s.fo.f.bones.neck || s.fo.f.bones.head); if (nb) { nb.getWorldPosition(out); if (up) { up.set(0, 1, 0).applyQuaternion(nb.getWorldQuaternion(bl.q)); } return true; } if (s.fo.pos) { out.copy(s.fo.pos); out.y += 1.4; up && up.set(0, 1, 0); return true; } return false;
  }
  const _n = { v: null }, _u = { v: null };
  function spray(s, gd) {
    if (!bl) return; const T = THREE; _n.v = _n.v || new T.Vector3(); _u.v = _u.v || new T.Vector3(); const np = _n.v, up = _u.v; if (!neckPos(s, np, up)) return; if (up.y < 0.2) up.y = 0.2; up.normalize();
    s.pg += gd; const idx = Math.floor(s.pg / 0.16), ph = (s.pg % 0.16) / 0.16, str = Math.pow(0.86, idx), live = s.pg < 1.2;
    if (idx !== s.pulse) { s.pulse = idx; s.yaw = Math.random() * 6.283; s.lean = 0.7 + Math.random() * 0.8; if (live) { sfxSpurt(str); const z = new T.Vector3(Math.cos(s.yaw) * 0.6, 0.8, Math.sin(s.yaw) * 0.6); for (let k = 0; k < 2; k++) puff(np, 0.22 + 0.08 * str, z); } }
    if (!live) return; const burst = ph < 0.42 ? 1 : 0.14, rate = (420 * burst * str + 60) * gd; let nn = Math.floor(rate); if (Math.random() < rate - nn) nn++; const v = new T.Vector3(), p = new T.Vector3();
    for (let i = 0; i < nn; i++) {
      const sp = (2.4 + Math.random() * 2.2) * (0.55 + 0.45 * str) * (burst > 0.5 ? 1 : 0.45), ang = (Math.random() - 0.5) * 0.3;
      v.set(Math.cos(s.yaw) * s.lean + (Math.random() - 0.5) * 0.5, 1, Math.sin(s.yaw) * s.lean + (Math.random() - 0.5) * 0.5).normalize().multiplyScalar(sp); v.x += up.x * 0.8 * sp * 0.2; v.z += up.z * 0.8 * sp * 0.2;
      p.copy(np).addScaledVector(up, 0.03 + Math.random() * 0.06 * (1 + ang)); drop(p, v, 1.8 + Math.random() * 1.0, 0.9 + Math.random() * 1.1);
    }
    // 飞出的头一路淌血（头顶的拖尾）
    if (s.pg < 1.0) { const hp = headPos(s, p); if (hp) { let hn = Math.floor(260 * gd + Math.random()); while (hn-- > 0) { v.set((Math.random() - 0.5) * 0.9, -0.2 + Math.random() * 0.6, (Math.random() - 0.5) * 0.9); drop(hp, v, 0.9 + Math.random() * 0.5, 0.65 + Math.random() * 0.5); } } }
  }
  // ---------------- R70 MOD decap_blood2：新血效（连贯血柱 + 速度拉丝 + 湿润高光 + 不规则溅射血斑 + 血泊）----------------
  const B2 = () => !window.Mods || !Mods.on || Mods.on('decap_blood2') !== false;
  const CAP2 = 760, NSPLAT2 = 110, NMIST2 = 30;
  function blobPath(g, x, y, r, n, j) { g.beginPath(); for (let k = 0; k <= n; k++) { const a = k / n * 6.2832, rr = r * (1 + (Math.random() - 0.5) * j), px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; k ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); g.fill(); }
  function splatTex(i) { // 溅射形状（只用作 alpha）：主斑 + 甩出的卫星点 + 拖尾
    const K = splatTex.c || (splatTex.c = []); if (K[i]) return K[i];
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.translate(64, 64); g.fillStyle = '#fff';
    blobPath(g, 0, 0, 20 + Math.random() * 8, 30, 0.5); const dir = Math.random() * 6.28;
    for (let k = 0; k < 22; k++) { const a = dir + (Math.random() - 0.5) * (k < 10 ? 1.0 : 6.28), d = 22 + Math.random() * 38, r = Math.max(1.2, (1.5 + Math.random() * 5.5) * (1 - d / 70)); blobPath(g, Math.cos(a) * d, Math.sin(a) * d, r, 10, 0.4); }
    for (let k = 0; k < 3; k++) { const a = dir + (Math.random() - 0.5) * 0.7, L = 24 + Math.random() * 30; g.save(); g.rotate(a); g.beginPath(); g.ellipse(L * 0.62, 0, L * 0.5, 2.5 + Math.random() * 3, 0, 0, 6.2832); g.fill(); g.restore(); }
    return (K[i] = new THREE.CanvasTexture(c));
  }
  function poolTex() { if (poolTex.t) return poolTex.t; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.translate(64, 64); g.fillStyle = '#fff'; blobPath(g, 0, 0, 40, 40, 0.22); for (let k = 0; k < 5; k++) { const a = Math.random() * 6.28; blobPath(g, Math.cos(a) * 30, Math.sin(a) * 30, 14 + Math.random() * 10, 20, 0.3); } return (poolTex.t = new THREE.CanvasTexture(c)); }
  function mistTex() { if (mistTex.t) return mistTex.t; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    for (let k = 0; k < 7; k++) { const x = 32 + (Math.random() - 0.5) * 24, y = 32 + (Math.random() - 0.5) * 24, r = 10 + Math.random() * 14, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(150,8,16,.55)'); gr.addColorStop(0.6, 'rgba(105,3,10,.25)'); gr.addColorStop(1, 'rgba(80,0,6,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
    return (mistTex.t = new THREE.CanvasTexture(c)); }
  function bloodInit2(sc, H) {
    if (bl && bl.sc === sc && bl.v2) { bl.H = H; return bl; } if (bl) bloodKill();
    const T = THREE, geo = new T.SphereGeometry(1, 10, 8), mat = new T.MeshStandardMaterial({ color: 0x8e0a12, emissive: 0x1e0003, roughness: 0.13, metalness: 0.06 });
    const im = new T.InstancedMesh(geo, mat, CAP2); im.frustumCulled = false; im.count = 0; im.renderOrder = 4; const c0 = new T.Color(), cs = ['#6e050d', '#9c0c15', '#b8121b', '#83070f', '#a00e17']; for (let i = 0; i < CAP2; i++) { c0.set(cs[i % 5]); im.setColorAt(i, c0); } sc.add(im);
    const pg = new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), sms = [0, 1, 2, 3].map(i => new T.MeshStandardMaterial({ color: 0x55020a, roughness: 0.2, metalness: 0.04, alphaMap: splatTex(i), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }));
    const splats = []; for (let i = 0; i < NSPLAT2; i++) { const m = new T.Mesh(pg, sms[i & 3]); m.visible = false; m.renderOrder = 2; sc.add(m); splats.push(m); }
    const pm = new T.MeshStandardMaterial({ color: 0x48010a, roughness: 0.06, metalness: 0.05, alphaMap: poolTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }), pools = [];
    for (let i = 0; i < 4; i++) { const m = new T.Mesh(pg, pm); m.visible = false; m.renderOrder = 2; sc.add(m); pools.push({ m, t: 0, max: 0 }); }
    const tex = mistTex(), mist = []; for (let i = 0; i < NMIST2; i++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, rotation: Math.random() * 6.28 })); sp.visible = false; sp.renderOrder = 5; sc.add(sp); mist.push({ o: sp, t: 0, d: 1, v: new T.Vector3(), s: 0.2 }); }
    bl = { v2: true, sc, H, im, splats, si: 0, grow: [], pools, pi: 0, mist, mi: 0, P: [], tmpM: new T.Matrix4(), q: new T.Quaternion(), s: new T.Vector3(), p: new T.Vector3(), Y: new T.Vector3(0, 1, 0), d: new T.Vector3() }; return bl;
  }
  function drop2(p, v, life, r) { if (!bl || bl.P.length >= CAP2) return; bl.P.push({ x: p.x, y: p.y, z: p.z, vx: v.x, vy: v.y, vz: v.z, t: life, big: r, r: 0.0105 * r }); }
  function splat2(x, z, sz) { if (!bl || !bl.v2) return; const m = bl.splats[bl.si++ % NSPLAT2], k = sz * (0.8 + Math.random() * 0.6); m.position.set(x, bl.H(x, z) + 0.012 + (bl.si % 7) * 0.0004, z); m.rotation.y = Math.random() * 6.28; m.scale.set(k * 0.3, 1, k * 0.3); m.visible = true; bl.grow.push({ m, t: 0, k }); if (bl.grow.length > 60) bl.grow.shift(); }
  function poolAt(x, z) { if (!bl || !bl.v2) return; const p = bl.pools[bl.pi++ % bl.pools.length]; p.m.position.set(x, bl.H(x, z) + 0.011, z); p.m.rotation.y = Math.random() * 6.28; p.m.scale.set(0.05, 1, 0.05); p.m.visible = true; p.t = 0; p.max = 0.75 + Math.random() * 0.4; }
  function bloodTick2(gd) {
    if (!bl) return; const B = bl, P = B.P; let n = 0;
    for (let i = P.length - 1; i >= 0; i--) {
      const d = P[i]; d.t -= gd; d.vy -= 9.8 * gd; const dr = 1 - 0.25 * gd; d.vx *= dr; d.vz *= dr; d.x += d.vx * gd; d.y += d.vy * gd; d.z += d.vz * gd;
      const gy = B.H(d.x, d.z) + 0.01; if (d.y <= gy || d.t <= 0) { if (d.y <= gy && Math.random() < (d.big > 0.9 ? 0.55 : 0.22)) splat2(d.x, d.z, 0.05 + 0.09 * d.big + Math.min(0.12, Math.hypot(d.vx, d.vz) * 0.02)); P[i] = P[P.length - 1]; P.pop(); }
    }
    for (let i = 0; i < P.length; i++) { // 血珠沿速度方向拉成血丝（越快越长）
      const d = P[i], sp = Math.hypot(d.vx, d.vy, d.vz) || 1, len = clamp(1 + sp * 0.6, 1, 6.5);
      B.d.set(d.vx / sp, d.vy / sp, d.vz / sp); B.q.setFromUnitVectors(B.Y, B.d); B.s.set(d.r, d.r * len, d.r); B.p.set(d.x, d.y, d.z); B.tmpM.compose(B.p, B.q, B.s); B.im.setMatrixAt(n++, B.tmpM);
    }
    B.im.count = n; B.im.instanceMatrix.needsUpdate = true;
    for (let i = B.grow.length - 1; i >= 0; i--) { const g = B.grow[i]; g.t += gd; const u = Math.min(1, g.t / 0.22), k = g.k * (0.3 + 0.7 * (1 - (1 - u) * (1 - u))); g.m.scale.set(k, 1, k); if (u >= 1) B.grow.splice(i, 1); }
    for (const p of B.pools) if (p.m.visible && p.t < 6) { p.t += gd; const k = p.max * (1 - Math.exp(-p.t / 1.5)) + 0.05; p.m.scale.set(k, 1, k * 0.85); }
    for (const m of B.mist) if (m.o.visible) { m.t -= gd; if (m.t <= 0) { m.o.visible = false; continue; } const u = 1 - m.t / m.d; m.o.position.addScaledVector(m.v, gd); m.v.multiplyScalar(1 - 1.5 * gd); m.v.y -= 0.35 * gd; m.o.scale.setScalar(m.s * (1 + u * 2.2)); m.o.material.opacity = 0.62 * (1 - u) * Math.min(1, u * 10 + 0.25); }
  }
  function spray2(s, gd) {
    if (!bl) return; const T = THREE; _n.v = _n.v || new T.Vector3(); _u.v = _u.v || new T.Vector3(); const np = _n.v, up = _u.v; if (!neckPos(s, np, up)) return; if (up.y < 0.25) up.y = 0.25; up.normalize();
    const v = s._v || (s._v = new T.Vector3()), p = s._p || (s._p = new T.Vector3());
    if (!s.cut) { s.cut = 1; // 刀口那一瞬：沿刀路两侧甩出一扇细血珠 + 一团血雾
      const q = G.camera.quaternion, rx = new T.Vector3(1, 0, 0).applyQuaternion(q), uy = new T.Vector3(0, 1, 0).applyQuaternion(q), sd = rx.multiplyScalar(Math.cos(s.sa || 0)).addScaledVector(uy, -Math.sin(s.sa || 0)).normalize();
      for (let i = 0; i < 110; i++) { const sg = Math.random() < 0.72 ? 1 : -1, sp = 1.8 + Math.random() * 5.2; v.copy(sd).multiplyScalar(sg * sp); v.x += (Math.random() - 0.5) * 1.4; v.y += 0.3 + Math.random() * 1.8; v.z += (Math.random() - 0.5) * 1.4; drop2(np, v, 1.8, 0.35 + Math.random() * 0.75); }
      for (let k = 0; k < 7; k++) puff(np, 0.16 + Math.random() * 0.22, v.set((Math.random() - 0.5) * 2.2, 0.5 + Math.random(), (Math.random() - 0.5) * 2.2));
    }
    s.pg += gd; const idx = Math.floor(s.pg / 0.2), ph = (s.pg % 0.2) / 0.2, str = Math.pow(0.84, idx), live = s.pg < 1.6;
    if (idx !== s.pulse) { s.pulse = idx; s.aim = s.aim || new T.Vector3(); s.aim.copy(up).add(v.set((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6)).normalize(); // 每一搏：沿颈轴、方向轻微摆动
      if (live) { sfxSpurt(str); for (let k = 0; k < 3; k++) puff(np, 0.13 + 0.1 * str, v.copy(s.aim).multiplyScalar(1.1 + Math.random())); } }
    if (!s.pool && s.pg > 0.3) { s.pool = 1; poolAt(np.x, np.z); }
    if (live) { const burst = ph < 0.45, rate = (burst ? 950 * str : 110) * gd; let nn = Math.floor(rate); if (Math.random() < rate - nn) nn++;
      for (let i = 0; i < nn; i++) { const sp = (burst ? 3.0 + Math.random() * 2.8 : 0.9 + Math.random() * 1.1) * (0.5 + 0.5 * str); v.copy(s.aim).multiplyScalar(sp); const j = burst ? 0.22 : 0.6; v.x += (Math.random() - 0.5) * j * sp; v.y += (Math.random() - 0.5) * j * 0.5 * sp; v.z += (Math.random() - 0.5) * j * sp; p.copy(np).addScaledVector(up, 0.02 + Math.random() * 0.03); drop2(p, v, 2.4, burst ? 0.75 + Math.random() * 1.0 : 0.45 + Math.random() * 0.5); } }
    else if (s.pg < 4 && Math.random() < 30 * gd) { v.set((Math.random() - 0.5) * 0.3, 0.2, (Math.random() - 0.5) * 0.3); drop2(np, v, 1.5, 0.5 + Math.random() * 0.4); } // 喷完后颈口还在往下淌
    if (s.pg < 1.2) { const hp = headPos(s, p); if (hp) { let hn = Math.floor(200 * gd + Math.random()); while (hn-- > 0) { v.set((Math.random() - 0.5) * 0.8, -0.3 + Math.random() * 0.5, (Math.random() - 0.5) * 0.8); drop2(hp, v, 1.1, 0.5 + Math.random() * 0.6); } } }
  }
  // R70 hit_feel2：普通命中也用同一套高质量血（沿刀路喷溅 + 血雾 + 地上溅斑）
  function hitBlood(pt, vel, k) {
    try { const W = window.Worlds && Worlds.active && Worlds._W; if (!W || !W.B || !B2() || !window.THREE) return false; bloodInit2(W.B.sc, W.B.H);
      const T = THREE, v = new T.Vector3(), dir = new T.Vector3(0, 1, 0); if (vel && (vel.x || vel.y || vel.z)) dir.set(vel.x, vel.y || 0, vel.z).normalize();
      const n = Math.round(16 + 30 * k); for (let i = 0; i < n; i++) { const sp = 1.0 + Math.random() * 3.4 * (0.6 + 0.4 * k); v.copy(dir).multiplyScalar(sp); v.x += (Math.random() - 0.5) * 1.6; v.y += 0.3 + Math.random() * 1.5; v.z += (Math.random() - 0.5) * 1.6; drop2(pt, v, 1.4, 0.3 + Math.random() * 0.7 * (0.6 + 0.5 * k)); }
      puff(pt, 0.08 + 0.07 * k, v.copy(dir).multiplyScalar(0.7)); if (k > 0.9) puff(pt, 0.14, v.set(0, 0.4, 0)); return true;
    } catch (e) { return false; }
  }
  const _q = { a: null, m: null, v: null };
  // 进图后空闲时把血珠实例网格 / 血雾 / 刀痕的着色器提前编好（以前第一次斩首的慢镜头里现编 = 卡一下）
  let warmSc = null, warmSeen = 0, warmFor = null;
  function warm() {
    try {
      const W = window.Worlds && Worlds.active && Worlds._W; if (!W || !W.B || !G.renderer || !G.camera || G.uiOpen || W.busy || !on()) { warmFor = null; return; }
      if (warmSc === W.B.sc) return; if (warmFor !== W.B.sc) { warmFor = W.B.sc; warmSeen = performance.now(); return; } if (performance.now() - warmSeen < 3500) return;
      warmSc = W.B.sc; const R = G.renderer, sc = W.B.sc; (B2() ? bloodInit2 : bloodInit)(sc, W.B.H);
      const T = THREE; slashArc({ sc, sa: 0, fo: { f: { bones: {} }, pos: new T.Vector3() } }); const arc = slashArc.grp; if (arc) arc.position.set(0, -50, 0);
      const post = G.post, viaRT = !!(post && post.on), tm = R.toneMapping, rt0 = R.getRenderTarget();
      try { if (window.ShaderQ && ShaderQ.async) ShaderQ.compile(R, sc, G.camera); else { if (viaRT) { const rt = warm.rt || (warm.rt = new T.WebGLRenderTarget(16, 16, { depthBuffer: true })); R.toneMapping = T.NoToneMapping; R.setRenderTarget(rt); } R.compile(sc, G.camera); } } finally { R.toneMapping = tm; R.setRenderTarget(rt0); }
      if (arc && arc.parent === sc) sc.remove(arc);
    } catch (e) { console.warn('DecapCam.warm', e); }
  }
  function pre(dt, now) {
    if (!S) warm(); if (!bl && !S) return; try {
      const real = Math.min(dt || 0.016, 0.05);
      if (!S) { if (bl) { if (bl.v2) bloodTick2(real); else bloodTick(real); } return; }
      const s = S, W = window.Worlds && Worlds.active ? Worlds._W : null;
      if (!W || !W.B || !G.camera || (G.S && G.S.hp <= 0 && s.hp0 > 0 && false)) { finish(); return; }
      s.t += real; if (s.skip && s.t < TL.hold) { s.t = TL.hold; s.skip = false; }
      const t = s.t, k = kAt(t); kNow = k; if (t >= TL.out) { finish(); return; }
      // 1) 时间：只慢敌人/头/血（Foe 内部），玩家照常
      if (window.Foe && Foe.slowSet) Foe.slowSet(k, 0.25);
      // 2) 锁血
      if (G.S) { if (G.S.hp < s.hp0) G.S.hp = s.hp0; else s.hp0 = G.S.hp; }
      // 3) 血
      const gd = real * k; if (bl && bl.v2) { spray2(s, gd); bloodTick2(gd); } else { spray(s, gd); bloodTick(gd); } arcTick(s, real);
      sayLines(s);
      // 4) 头的表情
      try { const ex = exprAt(t), key = Object.keys(ex).map(q => q + ':' + ex[q].toFixed(2)).join(','); if (key !== s.ex && s.hb && s.hb.setExpression) { s.ex = key; s.hb.setExpression(ex); } } catch (e) { }
      // 5) 色调：略褪色、加暗角、对比更高（心跳起伏）
      if (s.P && s.P0) { const w = clamp((1 - k) / 0.8, 0, 1), hb = 0.5 + 0.5 * Math.sin(t * 7.5); s.P.sat = s.P0.sat * (1 - 0.38 * w); s.P.contrast = s.P0.contrast * (1 + 0.12 * w); s.P.vig = s.P0.vig + (0.26 + 0.05 * hb) * w; }
      // 6) 黑边 / 字幕
      if (root) { const c = root.querySelector('.cap'); if (c) c.classList.toggle('on', t > 1.0 && t < TL.out - 0.7); if (t > TL.out - 0.38) root.classList.remove('on'); }
      // 7) 镜头：不切走，只轻推近 + 柔和转向飞出的头（渲染后还原，不影响玩家操控）
      camMove(s, t);
    } catch (e) { console.warn('DecapCam.pre', e); finish(); }
  }
  function camMove(s, t) {
    const cam = G.camera, T = window.FPV && FPV.TP, tp = T && T.restore && T.p0 ? T : null;
    const u = t < 1.3 ? ease(t / 1.3) : t < TL.hold ? 1 : 1 - ease(clamp((t - TL.hold) / (TL.out - TL.hold), 0, 1));
    const pos0 = tp ? tp.p0.clone() : cam.position.clone(), rot0 = tp ? tp.e0.clone() : cam.rotation.clone(), fov0 = cam.fov;
    _q.a = _q.a || new THREE.Quaternion(); _q.m = _q.m || new THREE.Matrix4(); _q.v = _q.v || new THREE.Vector3();
    cam.fov = s.fov0 * (1 - 0.3 * u); cam.updateProjectionMatrix();
    const hp = headPos(s, _q.v);
    if (hp && !tp) { _q.m.lookAt(cam.position, hp, new THREE.Vector3(0, 1, 0)); _q.a.setFromRotationMatrix(_q.m); const ang = cam.quaternion.angleTo(_q.a), w = Math.min(0.85 * u, ang > 1e-4 ? (0.8 / ang) : 1); cam.quaternion.slerp(_q.a, w); }
    cam.rotation.z += Math.sin(t * 1.7) * 0.004 * u; cam.updateMatrixWorld(true);
    const restore = () => { cam.fov = s.fov0; cam.updateProjectionMatrix(); if (!tp) { cam.position.copy(pos0); cam.rotation.copy(rot0); cam.updateMatrixWorld(true); } };
    if (T && T.restore) Promise.resolve().then(() => Promise.resolve().then(restore)); else Promise.resolve().then(restore);
  }
  function finish() {
    const s = S; S = null; if (!s) return; lastEnd = performance.now() / 1000; kNow = 1; if (s.arc) { s.arcT = 99; arcTick(s, 0); }
    try { if (window.Foe && Foe.slowSet) Foe.slowSet(1, 0); } catch (e) { }
    try { if (s.P && s.P0) { s.P.sat = s.P0.sat; s.P.contrast = s.P0.contrast; s.P.vig = s.P0.vig; } } catch (e) { }
    try { if (G.camera) { G.camera.fov = s.fov0; G.camera.updateProjectionMatrix(); } } catch (e) { }
    try { s.hb && s.hb.setExpression && s.hb.setExpression({ sad: 0.85, blink: 0.85 }); } catch (e) { }
    unduck(); if (s.t > 2) sfxEnd(); document.body.classList.remove('dcam');
    const r = root; if (r) { r.classList.remove('on'); setTimeout(() => { r.remove(); if (root === r) root = null; }, 700); }
  }
  addEventListener('keydown', e => { if (S && (e.code === 'Enter' || e.code === 'NumpadEnter')) S.skip = true; });
  return { onEvent, pre, hitBlood, get active() { return !!S; }, get k() { return kNow; }, skip() { if (S) S.skip = true; }, _kAt: kAt, _exprAt: exprAt, _bl: () => bl };
})();
