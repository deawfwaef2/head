// R73 地图与画面（三个 MOD）。用户：「地图单调、要有高度和远景、宣传图质量、天气」。
//  · vista73（默认开）远山层：每张野外地图外面加 3 层程序生成的远山剪影（150 / 200 / 260 米，空气透视：越远越淡、越接近天色），
//    按地区换形状（圣山尖峰 / 深渊黑刺 / 沼泽低平 / 森林圆丘 / 要塞与王都远处有塔影）——一眼看出「这里有多高、有多远」。只在加载时建一次，零每帧开销。
//  · weather73（默认开）天气：每张图按地区随机 晴 / 雨 / 暴雨（闪电雷声）/ 浓雾 / 雪；雨雪用着色器动画（不占 CPU、不每帧分配），雾用 R73 雾层叠加。
//  · photo73（默认开）拍照模式：野外安静时按 F2——自由镜头（WASD 平移 · Q/E 升降 · 鼠标拖动转向 · 滚轮变焦 · Shift 加速），
//    隐藏 HUD；1~6 切换调色（原色 / 电影 / 暖金 / 冷月 / 黑白 / 血月），L 切换宽银幕黑边，Enter 存一张 PNG（带调色和黑边），F2 / Esc 退出。拍照时世界暂停。
window.World73 = (() => {
  'use strict';
  const M_ = k => !window.Mods || !Mods.on || Mods.on(k) !== false;
  const Wd = () => (window.Worlds && Worlds.active ? Worlds._W : null);
  const T = () => window.THREE;
  const now = () => performance.now() / 1000;
  const toast = (t, c, s) => { try { G.toast(t, c || '#d8e8ff', s || 2.4); } catch (e) { } };
  const ndOf = W => W && W.graph && W.graph.nodes[W.cur];
  const styleOf = W => { const nd = ndOf(W); return ((nd && (nd.region || (nd.loc && nd.loc.k))) || 'meadow') + ''; };
  function mul(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // ================= 远山 =================
  const SHAPE = { peak: { h: [55, 85, 120], j: 1.0, sp: 0 }, abyss: { h: [32, 58, 86], j: 1.3, sp: 0.6 }, swamp: { h: [12, 20, 32], j: 0.3, sp: 0 }, forest: { h: [34, 54, 80], j: 0.45, sp: 0 }, fortress: { h: [36, 58, 86], j: 0.75, sp: 0.35 }, capital: { h: [26, 42, 64], j: 0.5, sp: 0.5 }, wilds: { h: [42, 66, 96], j: 0.85, sp: 0 }, village: { h: [30, 50, 76], j: 0.45, sp: 0.1 }, meadow: { h: [36, 58, 86], j: 0.5, sp: 0 }, ruins: { h: [34, 54, 80], j: 0.7, sp: 0.25 } };
  const RAD = [150, 200, 262];
  let vMat = null;
  function vmat() { if (vMat) return vMat; vMat = new (T().MeshBasicMaterial)({ vertexColors: true, fog: false, side: T().DoubleSide }); return vMat; }
  function ridge(r, H, seed, layer, haze, base, sp) {
    const rnd = mul(seed + layer * 977), N = 420, pos = new Float32Array((N + 1) * 2 * 3), col = new Float32Array((N + 1) * 2 * 3), idx = [];
    const ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28, rnd() * 6.28], S = SHAPE[sp] || SHAPE.meadow, hmax = S.h[layer] * (0.85 + rnd() * 0.3);
    const spires = []; if (S.sp && rnd() < S.sp + 0.2) for (let i = 0; i < 2 + Math.floor(rnd() * 4); i++) spires.push({ a: rnd() * 6.283, w: 0.006 + rnd() * 0.01, h: hmax * (0.5 + rnd() * 0.6) });
    const k = layer / 2, top = base.clone().lerp(haze, 0.35 + 0.45 * k), bot = base.clone().lerp(haze, 0.62 + 0.3 * k);
    for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, Jr = Math.max(0, Math.min(1, S.j - 0.35)), ab = Math.abs;
      const sm = 0.55 + 0.25 * Math.sin(a * 3 + ph[0]) + 0.15 * Math.sin(a * 7 + ph[1]) + 0.06 * Math.sin(a * 17 + ph[2]);
      const rg = 0.3 + 0.38 * (1 - ab(Math.sin(a * 2.5 + ph[0]))) + 0.22 * (1 - ab(Math.sin(a * 6 + ph[1]))) + 0.12 * (1 - ab(Math.sin(a * 13 + ph[2]))) + 0.06 * (1 - ab(Math.sin(a * 29 + ph[3])));
      let h = Math.max(0.08, sm * (1 - Jr) + rg * Jr + 0.03 * Math.sin(a * 53 + ph[3]) * S.j);
      if (S.j > 0.9) h = Math.pow(h, 1.5) * 1.35; for (const s of spires) { const d = Math.abs(Math.atan2(Math.sin(a - s.a), Math.cos(a - s.a))); if (d < s.w) h += (s.h / hmax) * (1 - d / s.w); }
      const x = Math.cos(a) * r, z = Math.sin(a) * r, y = h * hmax; const o = i * 6; pos[o] = x; pos[o + 1] = -30; pos[o + 2] = z; pos[o + 3] = x; pos[o + 4] = y; pos[o + 5] = z;
      col[o] = bot.r; col[o + 1] = bot.g; col[o + 2] = bot.b; col[o + 3] = top.r; col[o + 4] = top.g; col[o + 5] = top.b; if (i < N) { const b = i * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); } }
    const g = new (T().BufferGeometry)(); g.setAttribute('position', new (T().BufferAttribute)(pos, 3)); g.setAttribute('color', new (T().BufferAttribute)(col, 3)); g.setIndex(idx);
    const m = new (T().Mesh)(g, vmat()); m.frustumCulled = false; m.renderOrder = -8; m.userData.v73 = 1; return m; }
  function buildVista(W) {
    const sc = W.B.sc; if (!sc || sc.userData.v73) return; sc.userData.v73 = 1; const nd = ndOf(W); if (!nd || nd.home) return;
    const haze = sc.fog ? sc.fog.color.clone() : new (T().Color)('#9aa8b8'), sp = styleOf(W), base = new (T().Color)({ peak: '#3a4250', abyss: '#1a1018', swamp: '#2a3424', forest: '#24342a', fortress: '#383a40', capital: '#3a3c44', wilds: '#4a3a2a', village: '#34402e', meadow: '#34442e', ruins: '#3c3a34' }[sp] || '#34402e');
    if (haze.getHSL({}).l < 0.12) haze.multiplyScalar(1.6); const seed = (nd.seed || 7) >>> 0, grp = new (T().Group)(); grp.userData.v73 = 1;
    for (let L = 2; L >= 0; L--) grp.add(ridge(RAD[L], 0, seed, L, haze, base, sp)); sc.add(grp); }
  // ================= 天气 =================
  const WX = { rain: { n: '🌧️ 下雨了', col: '#9fc8ff' }, storm: { n: '⛈️ 暴雨——远处在打雷', col: '#c8d8ff' }, fog: { n: '🌫️ 起雾了', col: '#d8e0e8' }, snow: { n: '❄️ 下雪了', col: '#eef4ff' } };
  function rollWx(sp, r) { const p = r(); if (sp === 'abyss') return p < 0.25 ? 'fog' : null; if (sp === 'peak') return p < 0.35 ? 'snow' : p < 0.5 ? 'fog' : null; if (sp === 'swamp') return p < 0.3 ? 'fog' : p < 0.5 ? 'rain' : null; if (sp === 'capital' || sp === 'fortress') return p < 0.15 ? 'rain' : p < 0.22 ? 'storm' : p < 0.3 ? 'fog' : null; return p < 0.15 ? 'rain' : p < 0.22 ? 'storm' : p < 0.32 ? 'fog' : p < 0.35 ? 'snow' : null; }
  let PMAT = {}; const uT = { value: 0 }, uC = { value: null };
  function prMat(kind) { if (PMAT[kind]) return PMAT[kind]; uC.value = uC.value || new (T().Vector3)();
    const snow = kind === 'snow', vs = `uniform float uT; uniform vec3 uC; attribute float aE; varying float vA;
void main(){ vec3 p = position; float sp = ${snow ? '1.6' : '17.0'}; float y = mod(p.y - uT * sp, 16.0); vec3 w = vec3(mod(p.x - uC.x + 12.0, 24.0) - 12.0 + uC.x, y + uC.y - 4.0, mod(p.z - uC.z + 12.0, 24.0) - 12.0 + uC.z);
${snow ? 'w.x += sin(uT * 0.9 + p.z) * 0.6; w.z += cos(uT * 0.7 + p.x) * 0.6;' : 'w.y -= aE * 0.55; w.x += aE * 0.08;'} vA = 1.0 - smoothstep(9.0, 12.0, length(w.xz - uC.xz)); vec4 mv = modelViewMatrix * vec4(w, 1.0); gl_Position = projectionMatrix * mv; ${snow ? 'gl_PointSize = 2.2 * (12.0 / max(1.0, -mv.z));' : ''} }`;
    const fs = `varying float vA; void main(){ ${snow ? 'vec2 c = gl_PointCoord - 0.5; if (dot(c, c) > 0.25) discard; gl_FragColor = vec4(1.0, 1.0, 1.0, 0.85 * vA);' : 'gl_FragColor = vec4(0.75, 0.82, 0.95, 0.32 * vA);'} }`;
    PMAT[kind] = new (T().ShaderMaterial)({ uniforms: { uT, uC }, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, fog: false }); return PMAT[kind]; }
  let PG = {};
  function prGeo(kind) { if (PG[kind]) return PG[kind]; const n = kind === 'snow' ? 1400 : 1800, r = mul(kind === 'snow' ? 91 : 37), pos = new Float32Array(n * (kind === 'snow' ? 1 : 2) * 3), aE = new Float32Array(n * (kind === 'snow' ? 1 : 2));
    for (let i = 0; i < n; i++) { const x = r() * 24 - 12, y = r() * 16, z = r() * 24 - 12; if (kind === 'snow') { pos.set([x, y, z], i * 3); aE[i] = 0; } else { pos.set([x, y, z, x, y, z], i * 6); aE[i * 2] = 0; aE[i * 2 + 1] = 1; } }
    const g = new (T().BufferGeometry)(); g.setAttribute('position', new (T().BufferAttribute)(pos, 3)); g.setAttribute('aE', new (T().BufferAttribute)(aE, 1)); g.boundingSphere = new (T().Sphere)(new (T().Vector3)(), 1e6); PG[kind] = g; return g; }
  let wxNow = null, wxObj = null, wxSc = null, boltT = 0;
  function setWx(W, kind) { clearWx(); wxNow = kind; if (!kind) return; const sc = W.B.sc; wxSc = sc;
    if (kind === 'rain' || kind === 'storm') { wxObj = new (T().LineSegments)(prGeo('rain'), prMat('rain')); } else if (kind === 'snow') { wxObj = new (T().Points)(prGeo('snow'), prMat('snow')); }
    if (wxObj) { wxObj.frustumCulled = false; wxObj.renderOrder = 6; sc.add(wxObj); }
    try { if (kind === 'fog') R73.fog(sc, 'wx', '#c8d0d8', 0.3, 1.9); else if (kind === 'storm') R73.fog(sc, 'wx', '#38404c', 0.35, 1.25); else if (kind === 'rain') R73.fog(sc, 'wx', '#606a78', 0.25, 1.15); else if (kind === 'snow') R73.fog(sc, 'wx', '#e8eef8', 0.3, 1.2); } catch (e) { }
    boltT = now() + 8 + Math.random() * 10; setTimeout(() => toast(WX[kind].n, WX[kind].col, 2.4), 1800); }
  function clearWx() { if (wxObj && wxObj.parent) wxObj.parent.remove(wxObj); wxObj = null; if (wxSc) { try { R73.fogClear(wxSc, 'wx'); } catch (e) { } wxSc = null; } wxNow = null; }
  // ================= 拍照模式 =================
  const GRADE = [['原色', ''], ['电影', 'contrast(1.12) saturate(0.88) brightness(0.98)'], ['暖金', 'sepia(0.28) saturate(1.2) contrast(1.06) brightness(1.04)'], ['冷月', 'hue-rotate(-14deg) saturate(0.75) contrast(1.1) brightness(0.92)'], ['黑白', 'grayscale(1) contrast(1.25)'], ['血月', 'sepia(0.35) hue-rotate(-28deg) saturate(1.6) contrast(1.12) brightness(0.9)']];
  const PH = { on: false, pos: null, yaw: 0, pitch: 0, fov: 60, g: 1, lb: true, keys: {}, drag: false, fov0: 72 };
  let phEl = null;
  function phUI() { if (phEl) return phEl; phEl = document.createElement('div'); phEl.id = 'ph73'; phEl.style.cssText = 'position:fixed;inset:0;z-index:140;pointer-events:none;display:none'; phEl.innerHTML = '<div class="lbt" style="position:absolute;left:0;right:0;top:0;height:11vh;background:#000"></div><div class="lbb" style="position:absolute;left:0;right:0;bottom:0;height:11vh;background:#000"></div><div class="tip" style="position:absolute;left:50%;bottom:12px;transform:translateX(-50%);font:12px/1.5 system-ui,sans-serif;color:#ddd;text-shadow:0 1px 2px #000;background:rgba(0,0,0,.45);padding:3px 12px;white-space:nowrap"></div>'; document.body.appendChild(phEl); return phEl; }
  function phTip() { const el = phUI(); el.querySelector('.lbt').style.display = el.querySelector('.lbb').style.display = PH.lb ? 'block' : 'none'; el.querySelector('.tip').textContent = `📷 拍照模式 · WASD 平移 · Q/E 升降 · 拖动鼠标转向 · 滚轮变焦（${Math.round(PH.fov)}°）· 1~6 调色【${GRADE[PH.g][0]}】· L 黑边 · Enter 存图 · F2/Esc 退出`; }
  function canvas() { return G.renderer && G.renderer.domElement; }
  function phOn() { const W = Wd(); if (!W || !W.B || W.busy || W.dead) return; if ((W.foes || []).some(f => !f.dead && f.seen && (f.state === 'chase' || f.atk))) { toast('⚔️ 战斗中不能拍照', '#ffb0a0', 1.4); return; }
    PH.on = true; const c = G.camera; PH.pos = c.position.clone(); PH.yaw = G.player.yaw; PH.pitch = G.player.pitch || 0; PH.fov0 = c.fov; PH.fov = c.fov; PH.keys = {};
    try { G.setUI && G.setUI(true); document.exitPointerLock && document.exitPointerLock(); } catch (e) { } document.body.classList.add('ph73'); phUI().style.display = 'block'; phTip(); const cv = canvas(); if (cv) cv.style.filter = GRADE[PH.g][1]; }
  function phOff() { if (!PH.on) return; PH.on = false; const c = G.camera; c.fov = PH.fov0; c.updateProjectionMatrix(); const cv = canvas(); if (cv) cv.style.filter = ''; document.body.classList.remove('ph73'); if (phEl) phEl.style.display = 'none'; try { G.setUI && G.setUI(false); G.lockPointer && G.lockPointer(); } catch (e) { } }
  function shot() { const W = Wd(), cv = canvas(); if (!W || !cv) return; try { const c = G.camera; if (G.post && G.post.on) G.post.render(W.B.sc, c); else G.renderer.render(W.B.sc, c);
      const o = document.createElement('canvas'); o.width = cv.width; o.height = cv.height; const x = o.getContext('2d'); x.filter = GRADE[PH.g][1] || 'none'; x.drawImage(cv, 0, 0); x.filter = 'none'; if (PH.lb) { const h = Math.round(o.height * 0.11); x.fillStyle = '#000'; x.fillRect(0, 0, o.width, h); x.fillRect(0, o.height - h, o.width, h); }
      const a = document.createElement('a'); a.download = `soulhead_${Date.now()}.png`; a.href = o.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove(); toast('📷 已保存截图', '#d8e8ff', 1.4); } catch (e) { toast('📷 截图失败：' + e.message, '#ffb0a0', 2); } }
  addEventListener('keydown', e => { if (!M_('photo73')) return;
    if (e.code === 'F2' && !e.repeat) { if (PH.on) phOff(); else if (Wd() && window.G && G.playing && !G.uiOpen) phOn(); else return; e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (!PH.on) return; e.preventDefault(); e.stopImmediatePropagation(); if (e.code === 'Escape') { phOff(); return; }
    const d = /^Digit([1-6])$/.exec(e.code); if (d) { PH.g = +d[1] - 1; const cv = canvas(); if (cv) cv.style.filter = GRADE[PH.g][1]; phTip(); return; }
    if (e.code === 'KeyL' && !e.repeat) { PH.lb = !PH.lb; phTip(); return; } if (e.code === 'Enter' && !e.repeat) { shot(); return; } PH.keys[e.code] = true; }, true);
  addEventListener('keyup', e => { if (PH.on) PH.keys[e.code] = false; }, true);
  addEventListener('mousedown', e => { if (PH.on) { PH.drag = true; e.stopPropagation(); } }, true);
  addEventListener('mouseup', () => { PH.drag = false; }, true);
  addEventListener('mousemove', e => { if (!PH.on || !PH.drag) return; PH.yaw -= e.movementX * 0.0035; PH.pitch = Math.max(-1.45, Math.min(1.45, PH.pitch - e.movementY * 0.0035)); }, true);
  addEventListener('wheel', e => { if (!PH.on) return; PH.fov = Math.max(14, Math.min(100, PH.fov * (e.deltaY > 0 ? 1.06 : 0.94))); phTip(); e.preventDefault(); e.stopPropagation(); }, { capture: true, passive: false });
  function phFrame(dt, W) { const c = G.camera, K = PH.keys, sp = (K.ShiftLeft || K.ShiftRight ? 14 : 4.5) * dt, fw = new (T().Vector3)(-Math.sin(PH.yaw), 0, -Math.cos(PH.yaw)), rt = new (T().Vector3)(Math.cos(PH.yaw), 0, -Math.sin(PH.yaw));
    if (K.KeyW) PH.pos.addScaledVector(fw, sp); if (K.KeyS) PH.pos.addScaledVector(fw, -sp); if (K.KeyD) PH.pos.addScaledVector(rt, sp); if (K.KeyA) PH.pos.addScaledVector(rt, -sp); if (K.KeyE) PH.pos.y += sp; if (K.KeyQ) PH.pos.y -= sp;
    const d = Math.hypot(PH.pos.x - W.pos.x, PH.pos.z - W.pos.z); if (d > 70) { PH.pos.x = W.pos.x + (PH.pos.x - W.pos.x) * 70 / d; PH.pos.z = W.pos.z + (PH.pos.z - W.pos.z) * 70 / d; }
    PH.pos.y = Math.max(W.B.H(PH.pos.x, PH.pos.z) + 0.3, Math.min(W.pos.y + 60, PH.pos.y)); c.position.copy(PH.pos); c.rotation.set(PH.pitch, PH.yaw, 0, 'YXZ'); if (Math.abs(c.fov - PH.fov) > 0.01) { c.fov = PH.fov; c.updateProjectionMatrix(); }
    if (W.B.sc.userData.skyM) W.B.sc.userData.skyM.position.copy(c.position); }
  // ================= 每帧 =================
  let lastB = null, compiled = false;
  function frame(dt) {
    const W = Wd(); if (!W || !W.B) { if (PH.on) phOff(); return; } const t = now();
    if (W.B !== lastB) { lastB = W.B; clearWx(); if (M_('vista73')) try { buildVista(W); } catch (e) { console.warn('vista73', e); } if (M_('weather73')) { const nd = ndOf(W); if (nd && !nd.home && !(W.graph && W.graph.arena)) { const r = mul(((nd.seed || 1) ^ ((W.trip && W.trip.t0) || Date.now())) >>> 0); try { setWx(W, rollWx(styleOf(W), r)); } catch (e) { console.warn('weather73', e); } } } }
    if (wxObj) { uT.value = t; uC.value.copy(G.camera.position); }
    if (wxNow === 'storm' && t > boltT && !G.uiOpen) { boltT = t + 9 + Math.random() * 14; try { G.flash && G.flash('#e8f0ff', 0.35, 140); setTimeout(() => { try { SFX.thud && SFX.thud(0.9); SFX.roar && SFX.roar(0.15); } catch (e) { } }, 600 + Math.random() * 1400); } catch (e) { } }
    if (PH.on) phFrame(dt, W);
  }
  function precompile() { if (compiled || !window.G || !G.renderer || !G.camera || !window.THREE) return; compiled = true; try { const sc = new (T().Scene)(); const m = new (T().Mesh)(new (T().PlaneGeometry)(1, 1), vmat()); sc.add(m); if (M_('weather73')) { sc.add(new (T().LineSegments)(prGeo('rain'), prMat('rain'))); sc.add(new (T().Points)(prGeo('snow'), prMat('snow'))); } G.renderer.compile(sc, G.camera); m.geometry.dispose(); } catch (e) { console.warn('world73 precompile', e); } }
  let wired = false;
  function wire() { if (wired || !window.G || !G.HOOK || !G.renderer) return false; wired = true; G.HOOK.world = G.HOOK.world || []; G.HOOK.world.push(frame); (window.requestIdleCallback || (f => setTimeout(f, 1500)))(precompile); return true; }
  if (!wire()) { const iv = setInterval(() => { if (wire()) clearInterval(iv); }, 400); }
  const css = document.createElement('style'); css.textContent = 'body.ph73 #wRoot,body.ph73 #m73t,body.ph73 #o73chip,body.ph73 #h73pl,body.ph73 #a73hud,body.ph73 #sgTrack,body.ph73 #nemChip,body.ph73 .wskills,body.ph73 #hubBtn,body.ph73 #c73ps{visibility:hidden!important}'; document.head.appendChild(css);
  return { buildVista, setWx, clearWx, rollWx, SHAPE, GRADE, PH, phOn, phOff, get wx() { return wxNow; } };
})();
