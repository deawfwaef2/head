// R45 技能特效（用户：“加了技能不知道怎么用……使用技能后要有特效”）。MOD `skill_vfx`（默认开）。
// 每次 Talents.cast 成功后（talents_ui.js 的 TalUI.cast 调用 SkillFX.cast(id)）：
//   ① 屏幕：门派色边缘闪光 +（大招）冲击波环 / 速度线 / 屏震；
//   ② 技能栏：那一格爆出光环 + 火花，并弹出“大图标 + 技能名 + 类型/耗魂”的横幅（替代原来小小的 #tbCast 文字）；
//   ③ 3D 场景：面前迸发的加法混合火花、脚下双层冲击环、光柱；按门派再加 —— 刃舞/狂血/猎首：新月刃光；铁壁：罩住你的护盾壳；
//      魂术：上升的螺旋魂火；影袭：细长的紫色残影线。
// 不碰 talents.js 的技能逻辑（各技能原有的环 / 弹道 / 闪电照旧）；全部特效纹理是 canvas 画的光点（VFX 纹理）。
window.SkillFX = (() => {
  'use strict';
  const on = () => !window.Mods || !Mods.on || Mods.on('skill_vfx') !== false;
  const G0 = () => window.G, D = () => window.TalData;
  const SCH = { b: ['blade', '#ffd27a'], w: ['ward', '#9fd0ff'], s: ['shadow', '#b8a0ff'], r: ['rage', '#ff6a6a'], m: ['soul', '#7af0ff'], h: ['hunt', '#ffd060'], x: ['soul', '#d07aff'] };
  const info = id => { const k = id === 'dodge' ? 's' : String(id)[0], s = SCH[k] || ['blade', '#ffd27a']; return { school: s[0], col: s[1], ult: /_ult$/.test(id), dodge: id === 'dodge' }; };
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const lang = () => { const l = (window.I18N && I18N.lang) || localStorage.getItem('soulhead_lang') || 'zh'; return ['zh', 'ja', 'en'].includes(l) ? l : 'zh'; };

  // ---------------- DOM ----------------
  const CSS = `
body.sfxon #tbCast{display:none!important}
#skfx{position:fixed;inset:0;z-index:33;pointer-events:none;overflow:hidden}
.sf-flash{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 58%,transparent 38%,color-mix(in srgb,var(--c) 20%,transparent) 78%,color-mix(in srgb,var(--c) 48%,transparent) 100%);animation:sff .55s ease-out forwards}
.sf-flash.ult{animation-duration:.95s;background:radial-gradient(ellipse at 50% 55%,color-mix(in srgb,var(--c) 22%,transparent) 0,transparent 30%,color-mix(in srgb,var(--c) 50%,transparent) 75%,color-mix(in srgb,var(--c) 85%,transparent) 100%)}
@keyframes sff{0%{opacity:0}14%{opacity:1}100%{opacity:0}}
.sf-wave{position:absolute;left:50%;top:52%;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;border:5px solid var(--c);box-shadow:0 0 40px var(--c),inset 0 0 40px var(--c);animation:sfw .8s cubic-bezier(.1,.7,.2,1) forwards}
@keyframes sfw{to{transform:scale(34);opacity:0;border-width:1px}}
.sf-lines{position:absolute;inset:-20%;background:repeating-conic-gradient(from 0deg at 50% 52%,transparent 0 5deg,color-mix(in srgb,var(--c) 55%,transparent) 5.6deg 6.2deg,transparent 6.8deg 11deg);-webkit-mask:radial-gradient(circle at 50% 52%,transparent 22%,#000 70%);mask:radial-gradient(circle at 50% 52%,transparent 22%,#000 70%);animation:sfl .7s ease-out forwards}
@keyframes sfl{0%{opacity:0;transform:scale(.7) rotate(0)}20%{opacity:.9}100%{opacity:0;transform:scale(1.25) rotate(14deg)}}
.sf-ban{position:absolute;left:50%;bottom:calc(var(--tbH,230px) + 46px);transform:translateX(-50%);display:flex;align-items:center;gap:18px;padding:10px 38px 10px 22px;background:linear-gradient(90deg,transparent,rgba(10,5,10,.9) 14%,rgba(10,5,10,.9) 86%,transparent);border-top:3px solid var(--c);border-bottom:1px solid color-mix(in srgb,var(--c) 40%,transparent);animation:sfb 1.25s cubic-bezier(.16,.9,.2,1) forwards;white-space:nowrap}
.sf-ban i{font-style:normal;font-size:64px;line-height:1;filter:drop-shadow(0 0 14px var(--c)) drop-shadow(0 3px 0 #000)}
.sf-ban b{display:block;font:900 40px/1.05 "Songti SC","Noto Serif CJK SC","Source Han Serif SC",serif;letter-spacing:.14em;color:#fff;text-shadow:0 3px 0 #000,0 0 22px var(--c)}
.sf-ban small{display:block;margin-top:3px;font-size:19px;font-weight:800;letter-spacing:.12em;color:var(--c);text-shadow:0 1px 4px #000}
.sf-ban.ult b{font-size:54px}.sf-ban.ult i{font-size:84px}
@keyframes sfb{0%{opacity:0;transform:translateX(-50%) scale(1.5)}12%{opacity:1;transform:translateX(-50%) scale(1)}70%{opacity:1;transform:translateX(-50%) translateY(0)}100%{opacity:0;transform:translateX(-50%) translateY(-22px)}}
.sf-slot{position:fixed;width:10px;height:10px;margin:-5px 0 0 -5px}
.sf-slot .rg{position:absolute;inset:0;border-radius:50%;border:4px solid var(--c);box-shadow:0 0 22px var(--c),inset 0 0 14px var(--c);animation:sfr .7s ease-out forwards}
.sf-slot .rg.b{animation-delay:.08s;border-width:2px}
@keyframes sfr{0%{transform:scale(1);opacity:1}100%{transform:scale(var(--k,9));opacity:0}}
.sf-slot .sp{position:absolute;left:50%;top:50%;width:4px;height:22px;margin:-11px 0 0 -2px;border-radius:2px;background:linear-gradient(#fff,var(--c));box-shadow:0 0 10px var(--c);transform:rotate(var(--a)) translateY(-14px);animation:sfs .65s ease-out forwards}
@keyframes sfs{to{transform:rotate(var(--a)) translateY(calc(var(--d) * -1));opacity:0}}
.tbs.sfhit{animation:sfh .45s ease-out}
@keyframes sfh{0%{transform:scale(1.28);border-color:#fff;box-shadow:0 0 30px var(--hc,#ffd27a),inset 0 0 18px #fff}100%{transform:scale(1)}}`;
  let layer = null;
  function ensure() {
    if (layer && layer.isConnected) return layer;
    if (!document.getElementById('sfxCss')) { const s = document.createElement('style'); s.id = 'sfxCss'; s.textContent = CSS; document.head.appendChild(s); }
    layer = document.createElement('div'); layer.id = 'skfx'; layer.setAttribute('data-noi18n', ''); document.body.appendChild(layer); return layer;
  }
  const put = (el, ms) => { layer.appendChild(el); setTimeout(() => el.remove(), ms); return el; };
  const mk = (cls, css, html) => { const e = document.createElement('div'); e.className = cls; if (css) e.style.cssText = css; if (html) e.innerHTML = html; return e; };
  const KIND = { zh: '', ja: '', en: '' };
  function domFx(id, inf) {
    ensure(); document.body.classList.add('sfxon');
    const sk = D().SK[id] || { n: id, ic: '✨', kind: '', cost: 0 }, c = `--c:${inf.col};`;
    put(mk('sf-flash' + (inf.ult ? ' ult' : ''), c), inf.ult ? 1000 : 600);
    if (inf.ult) { put(mk('sf-wave', c), 900); put(mk('sf-lines', c), 800); }
    else if (!inf.dodge) put(mk('sf-wave', c + 'opacity:.55;animation-duration:.6s'), 700);
    const sub = [sk.kind, sk.cost ? `🔹${sk.cost}` : ''].filter(Boolean).join(' · ');
    for (const o of layer.querySelectorAll('.sf-ban')) o.remove();
    put(mk('sf-ban' + (inf.ult ? ' ult' : ''), c, `<i>${esc(sk.ic)}</i><div><b>${esc(sk.n)}</b><small>${esc(sub)}</small></div>`), 1300);
    // 技能栏那一格：光环 + 火花
    const t = window.Talents && Talents.tal(), slot = t ? t.bar.indexOf(id) : -1;
    const el = id === 'dodge' ? document.querySelector('#tbBar .tbs[data-util="q"]') : slot >= 0 ? document.querySelector(`#tbBar .tbs[data-slot="${slot}"]`) : null;
    if (el) {
      const r = el.getBoundingClientRect(), box = mk('sf-slot', `${c}left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;--k:${Math.max(6, r.width / 10 * (inf.ult ? 2.6 : 1.7))}`);
      box.appendChild(mk('rg')); box.appendChild(mk('rg b'));
      const n = inf.ult ? 18 : 12; for (let i = 0; i < n; i++) box.appendChild(mk('sp', `--a:${(i * 360 / n + Math.random() * 12).toFixed(0)}deg;--d:${(r.width * (0.7 + Math.random() * 0.7)).toFixed(0)}px`));
      put(box, 800); el.style.setProperty('--hc', inf.col); el.classList.remove('sfhit'); void el.offsetWidth; el.classList.add('sfhit');
    }
  }

  // ---------------- 3D ----------------
  const FX = []; let tex = null, scene = null;
  const V3 = () => THREE.Vector3;
  function glowTex() {
    if (tex) return tex; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,255,255,.85)'); r.addColorStop(.6, 'rgba(255,255,255,.2)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    tex = new THREE.CanvasTexture(c); return tex;
  }
  function sceneOf() { const W = window.Worlds && Worlds.active ? Worlds._W : null; return (W && W.B && W.B.sc) || G0().scene; }
  const addM = (m, life, upd, pos) => { if (pos) m.position.copy(pos); scene.add(m); FX.push({ m, t: 0, life, upd }); return m; };
  const amat = (col, op, map) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, map: map || null });
  const GEO = {}; const geo = (k, f) => GEO[k] || (GEO[k] = f());
  function spark(pos, vel, col, size, life, grav) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: col, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.scale.setScalar(size); const v = vel.clone();
    return addM(m, life, (f, k, dt) => { v.y -= (grav || 0) * dt; f.m.position.addScaledVector(v, dt); f.m.material.opacity = 1 - k * k; f.m.scale.setScalar(size * (1 - 0.6 * k)); }, pos);
  }
  const SOFT = () => !window.Mods || Mods.on('soft_vfx') !== false;
  const TX2 = {};
  function radTex(k, a0, a1, a2) { if (TX2[k]) return TX2[k]; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(a0, 'rgba(255,255,255,0)'); r.addColorStop(a1, 'rgba(255,255,255,1)'); r.addColorStop(a2, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return TX2[k] = new THREE.CanvasTexture(c); }
  function beamTex() { if (TX2.beam) return TX2.beam; const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d'), v = g.createLinearGradient(0, 0, 0, 128); v.addColorStop(0, 'rgba(255,255,255,0)'); v.addColorStop(0.55, 'rgba(255,255,255,.45)'); v.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = v; g.fillRect(0, 0, 64, 128); const h = g.createLinearGradient(0, 0, 64, 0); h.addColorStop(0, 'rgba(0,0,0,.65)'); h.addColorStop(0.5, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,.65)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = h; g.fillRect(0, 0, 64, 128); return TX2.beam = new THREE.CanvasTexture(c); }
  function ringFx(pos, col, r0, r1, life, delay) {
    const m = new THREE.Mesh(geo('ring', () => new THREE.RingGeometry(0.82, 1, 56)), amat(col, 0.9, SOFT() ? radTex('ring', 0.8, 0.91, 0.97) : null)); m.rotation.x = -Math.PI / 2; m.visible = !delay; m.scale.setScalar(r0);
    const f = addM(m, life + (delay || 0), (f, k) => { const tt = f.t - (delay || 0); if (tt < 0) return; f.m.visible = true; const q = Math.min(1, tt / life); f.m.scale.setScalar(r0 + (r1 - r0) * (1 - Math.pow(1 - q, 3))); f.m.material.opacity = 0.9 * (1 - q); }, pos); return f;
  }
  function pillar(pos, col, h, life) {
    const m = new THREE.Mesh(geo('pil', () => new THREE.CylinderGeometry(1, 1, 1, 24, 1, true)), amat(col, 0.4, SOFT() ? beamTex() : null)); m.scale.set(0.7, h, 0.7); m.position.set(pos.x, pos.y + h / 2, pos.z);
    return addM(m, life, (f, k) => { f.m.scale.set(0.7 * (1 - k * 0.8), h * (1 + k * 0.3), 0.7 * (1 - k * 0.8)); f.m.material.opacity = 0.4 * (1 - k); });
  }
  function crescent(pos, yaw, col, size, life, roll) {
    const ct = SOFT() ? radTex('cres', 0.68, 0.86, 0.95) : null;
    const m = new THREE.Mesh(geo('cres', () => new THREE.RingGeometry(0.7, 1, 32, 1, 0, Math.PI)), amat(col, 1, ct)); m.rotation.set(0, yaw, roll || 0); m.scale.setScalar(size * 0.6);
    const a = new THREE.Mesh(geo('cres', () => new THREE.RingGeometry(0.7, 1, 32, 1, 0, Math.PI)), amat('#ffffff', SOFT() ? 0.55 : 0.9, ct)); a.scale.setScalar(0.86); m.add(a);
    return addM(m, life, (f, k) => { const q = 1 - Math.pow(1 - k, 3); f.m.scale.setScalar(size * (0.6 + q * 0.7)); f.m.material.opacity = 1 - k; a.material.opacity = 0.9 * (1 - k); }, pos);
  }
  function shell(pos, col, r, life) {
    const m = new THREE.Mesh(geo('shell', () => new THREE.SphereGeometry(1, 28, 18)), amat(col, 0.16)); m.scale.setScalar(r * 0.5);
    return addM(m, life, (f, k) => { const q = 1 - Math.pow(1 - k, 2); f.m.scale.setScalar(r * (0.5 + q * 0.6)); f.m.material.opacity = 0.16 * (1 - k); }, pos);
  }
  function fx3d(id, inf) {
    const g = G0(), cam = g.camera; if (!cam || !window.THREE) return; scene = sceneOf(); if (!scene) return;
    const T = THREE, P = (window.Worlds && Worlds.active && Worlds._W && Worlds._W.pos) || g.player.pos, feet = new T.Vector3(P.x, P.y, P.z);
    const f = new T.Vector3(); cam.getWorldDirection(f); f.y = 0; if (f.lengthSq() < 1e-4) f.set(0, 0, -1); f.normalize(); const r = new T.Vector3(f.z, 0, -f.x);
    const eye = cam.getWorldPosition(new T.Vector3()), chest = feet.clone(); chest.y += 1.15;
    const front = chest.clone().addScaledVector(f, 3.0), col = inf.col, S = inf.ult ? 2 : 1, yaw = Math.atan2(f.x, f.z);
    // 火花迸发（面前扇形 + 四散）
    const n = inf.dodge ? 8 : 18 * S;
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = (3 + Math.random() * 5) * (inf.ult ? 1.5 : 1); const v = r.clone().multiplyScalar(Math.cos(a) * sp).add(new T.Vector3(0, Math.sin(a) * sp * 0.8 + 1.5, 0)).addScaledVector(f, Math.random() * sp * 0.7); spark(front.clone().addScaledVector(r, (Math.random() - .5) * 0.8), v, i % 4 === 0 ? '#ffffff' : col, 0.1 + Math.random() * 0.16, 0.45 + Math.random() * 0.5, 6); }
    ringFx(feet, col, 0.4, inf.ult ? 11 : 4.6, inf.ult ? 0.9 : 0.6); ringFx(feet, '#ffffff', 0.2, inf.ult ? 7 : 3, 0.5, 0.06);
    if (!inf.dodge) pillar(feet.clone().addScaledVector(f, inf.ult ? 5 : 3.4), col, inf.ult ? 12 : 6, inf.ult ? 0.9 : 0.55); // 光柱立在前方，避免相机在柱内被糊屏
    switch (inf.school) {
      case 'blade': case 'rage': case 'hunt':
        crescent(front.clone(), yaw, col, 2.3 * S, 0.3, -0.5 + Math.random() * 0.4); if (inf.ult || Math.random() < 0.5) crescent(front.clone().addScaledVector(f, 0.6), yaw, '#ffffff', 1.9 * S, 0.28, 0.6);
        for (let i = 0; i < 8; i++) { const v = f.clone().multiplyScalar(14 + Math.random() * 8).addScaledVector(r, (Math.random() - .5) * 5); v.y = (Math.random() - .3) * 3; spark(chest.clone().addScaledVector(r, (Math.random() - .5) * 1.4), v, '#ffffff', 0.18, 0.35, 0); } break;
      case 'ward': shell(chest, col, inf.ult ? 5 : 2.8, 0.7); shell(chest, '#ffffff', inf.ult ? 4 : 2.2, 0.45); break;
      case 'soul': for (let i = 0; i < 26 * S; i++) { const a0 = Math.random() * Math.PI * 2, h = Math.random() * 2.4, rr = 1.4 + Math.random() * 0.8; const cx = feet.x, cz = feet.z, y0 = feet.y + 0.1; const m = new T.Sprite(new T.SpriteMaterial({ map: glowTex(), color: i % 3 ? col : '#ffffff', transparent: true, opacity: 1, blending: T.AdditiveBlending, depthWrite: false })); m.scale.setScalar(0.3); addM(m, 0.9 + Math.random() * 0.4, (fx, k) => { const a = a0 + k * 7, y = y0 + h * 0.3 + k * (1.8 + h); fx.m.position.set(cx + Math.cos(a) * rr * (1 - k * 0.5), y, cz + Math.sin(a) * rr * (1 - k * 0.5)); fx.m.material.opacity = 1 - k; }, new T.Vector3(cx, y0, cz)); } break;
      case 'shadow': for (let i = 0; i < 14; i++) { const v = r.clone().multiplyScalar((Math.random() - .5) * 18).addScaledVector(f, -6 - Math.random() * 6); v.y = Math.random() * 2; const m = new T.Mesh(geo('streak', () => new T.PlaneGeometry(1, 0.05)), amat(i % 3 ? col : '#ffffff', 0.9)); m.scale.set(2 + Math.random() * 2.5, 1, 1); m.rotation.y = yaw + Math.PI / 2; const p0 = chest.clone().addScaledVector(f, 2 + Math.random() * 3).addScaledVector(r, (Math.random() - .5) * 3); p0.y += (Math.random() - .5) * 1.4; addM(m, 0.35 + Math.random() * 0.2, (fx, k) => { fx.m.position.addScaledVector(v, 0.016); fx.m.material.opacity = 0.9 * (1 - k); }, p0); } break;
    }
    const W = window.Worlds && Worlds.active ? Worlds._W : null; if (W) W.shake = Math.max(W.shake || 0, inf.ult ? 0.9 : inf.dodge ? 0 : 0.28);
    try { window.SFX && SFX.play && SFX.play(inf.ult ? 'bell' : 'draw', inf.ult ? 0.7 : 0.35, inf.ult ? 0.7 : 1.3 + Math.random() * 0.3); } catch (e) { }
  }
  function frame(dt) {
    for (let i = FX.length - 1; i >= 0; i--) { const f = FX[i]; f.t += dt; const k = Math.min(1, f.t / f.life); try { f.upd && f.upd(f, k, dt); } catch (e) { } if (k >= 1) { f.m.parent && f.m.parent.remove(f.m); f.m.traverse && f.m.traverse(o => { if (o.material && o.material.dispose) o.material.dispose(); }); FX.splice(i, 1); } }
  }
  function cast(id) { if (!on() || !G0() || !D()) return; const inf = info(id); try { domFx(id, inf); } catch (e) { console.warn('SkillFX dom', e); } try { fx3d(id, inf); } catch (e) { console.warn('SkillFX 3d', e); } }
  const wait = setInterval(() => { if (window.G && G.HOOK && G.S) { clearInterval(wait); G.HOOK.frame.push(dt => { if (!on()) document.body.classList.remove('sfxon'); else document.body.classList.add('sfxon'); frame(dt); }); } }, 300);
  { let lt = 0; const lp = t => { requestAnimationFrame(lp); if (!(window.Worlds && Worlds.active) || !FX.length) { lt = 0; return; } const dt = lt ? Math.min(0.05, (t - lt) / 1000) : 0.016; lt = t; frame(dt); }; requestAnimationFrame(lp); } // 野外 HOOK.frame 不跑：技能特效以前在野外永远不消失
  return { cast, info, on, _FX: FX };
})();
