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
body.dcam>*:not(canvas):not(#dcRoot):not(script):not(style){opacity:0!important;transition:opacity .2s}
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
  function mkUI(n, name) {
    addCss(); if (root) root.remove(); root = document.createElement('div'); root.id = 'dcRoot';
    root.innerHTML = '<div class="vg"></div><div class="sl"></div><div class="fl"></div><div class="bar bt"></div><div class="bar bb"></div><div class="cap"><b>斩 首</b><i></i></div><div class="sub"></div>';
    root.querySelector('.cap i').textContent = '第 ' + n + ' 颗首级' + (name ? ' · ' + name : ''); document.body.appendChild(root); document.body.classList.add('dcam'); void root.offsetWidth; root.classList.add('on');
    const fl = root.querySelector('.fl'), sl = root.querySelector('.sl');
    try { fl.animate([{ opacity: 0.75 }, { opacity: 0 }], { duration: 260, easing: 'ease-out' }); sl.animate([{ opacity: 1, transform: 'rotate(-24deg) scaleX(.2)' }, { opacity: 1, transform: 'rotate(-24deg) scaleX(1)', offset: 0.35 }, { opacity: 0, transform: 'rotate(-24deg) scaleX(1.1)' }], { duration: 380, easing: 'ease-out' }); } catch (e) { }
  }
  function lensBlood(dist) {
    if (!root || dist > 4.8) return; const n = dist < 2.5 ? 9 : 5;
    for (let i = 0; i < n; i++) { const d = document.createElement('div'); d.className = 'ld'; const s = 9 + Math.random() * (dist < 2.5 ? 52 : 30); d.style.cssText = `left:${6 + Math.random() * 88}%;top:${8 + Math.random() * 58}%;width:${s}px;height:${s * (1.1 + Math.random() * 0.9)}px;transform:rotate(${(Math.random() - 0.5) * 50}deg)`; root.insertBefore(d, root.querySelector('.bar')); setTimeout(() => d.classList.add('on'), 40 + i * 50); setTimeout(() => d.classList.add('off'), 1500 + i * 120); }
  }
  // ---------------- 血：动脉喷射（拉丝血线 + 落地血斑 + 血雾）----------------
  const CAP = 340, NSPLAT = 70, NMIST = 22;
  function bloodInit(sc, H) {
    if (bl && bl.sc === sc) { bl.H = H; return bl; } if (bl) bloodKill();
    const geo = new THREE.CapsuleGeometry(0.007, 0.5, 2, 6), mat = new THREE.MeshStandardMaterial({ color: 0x8a0710, emissive: 0x3a0006, roughness: 0.22, metalness: 0.0 });
    const im = new THREE.InstancedMesh(geo, mat, CAP); im.frustumCulled = false; im.count = 0; im.renderOrder = 4; const c0 = new THREE.Color(), cs = ['#7a0610', '#a50d16', '#c4141c', '#8a0710']; for (let i = 0; i < CAP; i++) { c0.set(cs[i & 3]); im.setColorAt(i, c0); } sc.add(im);
    const sg = new THREE.CircleGeometry(1, 10).rotateX(-Math.PI / 2), sm = new THREE.MeshBasicMaterial({ color: 0x5a0309, transparent: true, opacity: 0.88, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
    const splats = []; for (let i = 0; i < NSPLAT; i++) { const m = new THREE.Mesh(sg, sm); m.visible = false; m.renderOrder = 2; sc.add(m); splats.push(m); }
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, 'rgba(170,10,20,.95)'); gr.addColorStop(0.5, 'rgba(120,4,12,.5)'); gr.addColorStop(1, 'rgba(90,0,8,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(cv), mist = []; for (let i = 0; i < NMIST; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 })); sp.visible = false; sp.renderOrder = 5; sc.add(sp); mist.push({ o: sp, t: 0, d: 1, v: new THREE.Vector3(), s: 0.2 }); }
    bl = { sc, H, im, splats, si: 0, mist, mi: 0, P: [], tmpM: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3(), Y: new THREE.Vector3(0, 1, 0), d: new THREE.Vector3() }; return bl;
  }
  function bloodKill() { if (!bl) return; try { bl.sc.remove(bl.im); bl.splats.forEach(m => bl.sc.remove(m)); bl.mist.forEach(m => bl.sc.remove(m.o)); bl.im.dispose(); } catch (e) { } bl = null; }
  function drop(p, v, life, big) { if (!bl || bl.P.length >= CAP) return; bl.P.push({ x: p.x, y: p.y, z: p.z, vx: v.x, vy: v.y, vz: v.z, t: life, big: big || 1 }); }
  function puff(p, s, v) { if (!bl) return; const m = bl.mist[bl.mi++ % NMIST]; m.o.position.copy(p); m.o.visible = true; m.t = m.d = 0.5 + Math.random() * 0.5; m.s = s; m.v.copy(v).multiplyScalar(0.25); m.o.scale.setScalar(s); }
  function splat(x, z, sz) { if (!bl) return; const m = bl.splats[bl.si++ % NSPLAT]; m.position.set(x, bl.H(x, z) + 0.014, z); m.scale.set(sz * (0.8 + Math.random() * 0.8), 1, sz * (0.8 + Math.random() * 0.8)); m.rotation.y = Math.random() * 6.28; m.visible = true; }
  function bloodTick(gd) { // gd = 游戏时间 dt（已乘慢放系数）
    if (!bl) return; const B = bl, P = B.P; let n = 0;
    for (let i = P.length - 1; i >= 0; i--) {
      const d = P[i]; d.t -= gd; d.vy -= 9.8 * gd; d.vx *= 1 - 0.35 * gd; d.vz *= 1 - 0.35 * gd; d.x += d.vx * gd; d.y += d.vy * gd; d.z += d.vz * gd;
      const gy = B.H(d.x, d.z) + 0.01; if (d.y <= gy || d.t <= 0) { if (d.y <= gy && d.big > 0.7 && Math.random() < 0.55) splat(d.x, d.z, 0.05 + Math.random() * 0.1 * d.big); P[i] = P[P.length - 1]; P.pop(); }
    }
    for (let i = 0; i < P.length; i++) {
      const d = P[i], sp = Math.hypot(d.vx, d.vy, d.vz) || 1, len = clamp(sp * 0.06, 0.05, 0.5) / 0.514, r = d.big;
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
    if (!fo.boss && window.Foe && Foe.foes) { let n = 0; for (const o of Foe.foes) if (o !== fo && !o.dead && o.seen && o.pos && fo.pos && o.pos.distanceTo(fo.pos) < 10) n++; if (n >= 2) return false; }
    return true;
  }
  function onEvent(t, fo) {
    if (t !== 'decap') return; try {
      if (!gate(fo)) return; const W = Worlds._W, n = (W.stats && W.stats.decap) || 1, P = G.postFx && G.postFx.P, hp = fo.h && fo.h.name;
      S = { t: 0, fo, hb: fo.f.hb, hp0: G.S.hp, pg: 0, pulse: -1, sc: W.B.sc, H: W.B.H, P0: P ? { sat: P.sat, contrast: P.contrast, vig: P.vig } : null, P, fov0: G.camera.fov, lens: false, skipped: false, tr: 0, ended: false, ex: '' };
      plan(S); bloodInit(S.sc, S.H); mkUI(n, fo.h && (fo.h.name || fo.h.n)); sfxStart();
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
  const _q = { a: null, m: null, v: null };
  function pre(dt, now) {
    if (!bl && !S) return; try {
      const real = Math.min(dt || 0.016, 0.05);
      if (!S) { if (bl) { bloodTick(real); if (!bl.P.length && !bl.mist.some(m => m.o.visible)) { /* 保留血斑，不清理 */ } } return; }
      const s = S, W = window.Worlds && Worlds.active ? Worlds._W : null;
      if (!W || !W.B || !G.camera || (G.S && G.S.hp <= 0 && s.hp0 > 0 && false)) { finish(); return; }
      s.t += real; if (s.skip && s.t < TL.hold) { s.t = TL.hold; s.skip = false; }
      const t = s.t, k = kAt(t); kNow = k; if (t >= TL.out) { finish(); return; }
      // 1) 时间：只慢敌人/头/血（Foe 内部），玩家照常
      if (window.Foe && Foe.slowSet) Foe.slowSet(k, 0.25);
      // 2) 锁血
      if (G.S) { if (G.S.hp < s.hp0) G.S.hp = s.hp0; else s.hp0 = G.S.hp; }
      // 3) 血
      const gd = real * k; spray(s, gd); bloodTick(gd);
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
    const s = S; S = null; if (!s) return; lastEnd = performance.now() / 1000; kNow = 1;
    try { if (window.Foe && Foe.slowSet) Foe.slowSet(1, 0); } catch (e) { }
    try { if (s.P && s.P0) { s.P.sat = s.P0.sat; s.P.contrast = s.P0.contrast; s.P.vig = s.P0.vig; } } catch (e) { }
    try { if (G.camera) { G.camera.fov = s.fov0; G.camera.updateProjectionMatrix(); } } catch (e) { }
    try { s.hb && s.hb.setExpression && s.hb.setExpression({ sad: 0.85, blink: 0.85 }); } catch (e) { }
    unduck(); if (s.t > 2) sfxEnd(); document.body.classList.remove('dcam');
    const r = root; if (r) { r.classList.remove('on'); setTimeout(() => { r.remove(); if (root === r) root = null; }, 700); }
  }
  addEventListener('keydown', e => { if (S && (e.code === 'Enter' || e.code === 'NumpadEnter')) S.skip = true; });
  return { onEvent, pre, get active() { return !!S; }, get k() { return kNow; }, skip() { if (S) S.skip = true; }, _kAt: kAt, _exprAt: exprAt, _bl: () => bl };
})();
