// R46 画质大师化（野外）。MOD `world_master`（默认开）。?wm=0 可临时关。
// 用户：“现在地图游戏整体画质太低级了……小作坊感，画质大师化”。用户显卡：高端独显 → 高档位放手做，mid 档自动降级。
// 不改场景模型/贴图（不自制资产），只做“看得见的质感层”，全部可回退：
//  ① 地形：大尺度色块 + 双尺度混合打散平铺 + 陡坡去饱和（assets.js triplanar 的 macro 选项，worlds.js 传入 WorldMaster.terr()）
//  ② 植被加密：ultra ×1.7 / high ×1.35（草与灌木），树 ×1.25（WorldMaster.dens(kind)，worlds.js 散布时乘入）
//  ③ 软阴影：ultra 4096 + PCF 半径 4 / high 2048 + 半径 2.5（太阳阴影进场时重建）
//  ④ 空气粒子：按地区不同——草甸花粉/森林光尘+孢子/荒原沙尘/修道院微光/沼泽萤火/要塞灰烬+火星/王都金尘+火星/深渊紫红火星/雪峰飘雪
//     （GPU 顶点着色器里环绕相机循环，CPU 零开销；加法混合，进 HDR 管线后会被泛光点亮）
//  ⑤ 分地区调色：通过 Master.P 的饱和/对比/冷暗暖亮/暗角，进场缓入，离场恢复（master.js 每帧同步 P → 着色器）
// 不碰战斗/UI；无 Worlds 时什么都不做。
window.WorldMaster = (() => {
  'use strict';
  const on = () => !window.Mods || !Mods.on || Mods.on('world_master') !== false;
  const URLOFF = /[?&]wm=0/.test(location.search);
  const act = () => on() && !URLOFF;
  const tier = () => { try { const p = window.__game && window.__game.postFx; return (p && p.tier) || 'high'; } catch (e) { return 'high'; } };
  const TK = () => ({ ultra: 2, high: 1, mid: 0 })[tier()] || 0;
  // ---- 对外：地形 / 密度 ----
  const terr = () => !act() ? 0 : TK() >= 1 ? 2 : 1;
  const dens = (kind) => { if (!act()) return 1; const k = TK(); if (kind === 'grass' || kind === 'plant') return [1, 1.35, 1.7][k]; if (kind === 'tree') return [1, 1.12, 1.25][k]; return 1; };

  // ---- 粒子 ----
  const VS = `uniform float uT; uniform vec3 uC; uniform vec3 uBox; uniform vec3 uDrift; uniform float uSize; uniform float uPx; uniform float uSw; uniform float uYo;
    attribute vec4 aS; varying float vA; varying float vTw;
    void main(){
      vec3 p = aS.xyz * uBox + uDrift * uT;
      p.x += sin(uT * (0.3 + aS.w * 0.5) + aS.y * 40.0) * uSw; p.z += cos(uT * (0.25 + aS.w * 0.4) + aS.x * 40.0) * uSw; p.y += sin(uT * (0.4 + aS.w) + aS.z * 30.0) * uSw * 0.6;
      vec3 rel = mod(p - uC + uBox * 0.5, uBox) - uBox * 0.5; rel.y += uYo;
      vec3 wp = uC + rel;
      vec4 mv = viewMatrix * vec4(wp, 1.0);
      gl_Position = projectionMatrix * mv;
      float d = length(rel.xz);
      vA = smoothstep(uBox.x * 0.5, uBox.x * 0.2, d) * smoothstep(0.3, 1.6, -mv.z);
      vTw = 0.55 + 0.45 * sin(uT * (1.5 + aS.w * 3.0) + aS.x * 60.0);
      gl_PointSize = clamp(uSize * (0.55 + aS.w * 0.9) * uPx / max(0.2, -mv.z), 1.6, 46.0);
    }`;
  const FS = `uniform vec3 uCol; uniform float uAl; uniform float uTwk; varying float vA; varying float vTw;
    void main(){
      float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0) discard;
      float a = 1.0 - r; a = a * a * (0.35 + 0.65 * a);
      float k = mix(1.0, vTw, uTwk);
      gl_FragColor = vec4(uCol * k, a * vA * uAl * k);
    }`;
  const C3 = h => new THREE.Color(h);
  // [色, 亮度倍数, 粒径(m), 数量系数, 漂移[x,y,z], 盒子[x,y,z], alpha, 闪烁, 摆动, y偏移]
  const LAY = {
    village: [['#fff0c2', 1.5, 0.07, 1.0, [0.3, 0.14, 0.1], [38, 9, 38], 0.75, 0.15, 0.6, 1.0]],
    forest: [['#eaffd2', 1.3, 0.05, 1.0, [0.08, -0.03, 0.04], [34, 9, 34], 0.6, 0.35, 0.5, 1.0], ['#ffe08a', 2.0, 0.11, 0.12, [0.05, 0.05, 0.03], [30, 6, 30], 0.9, 0.9, 1.2, 0.3]],
    wilds: [['#ead2a4', 1.2, 0.05, 1.1, [2.4, 0.1, 0.9], [44, 8, 44], 0.55, 0.1, 0.4, 1.0]],
    abbey: [['#dce6ff', 1.3, 0.05, 0.8, [0.05, 0.02, 0.03], [32, 8, 32], 0.6, 0.45, 0.4, 1.0]],
    swamp: [['#c4e08a', 1.1, 0.05, 0.8, [0.05, 0.03, 0.04], [32, 6, 32], 0.55, 0.3, 0.5, 0.6], ['#b6ff5c', 3.2, 0.13, 0.22, [0.04, 0.03, 0.02], [30, 4, 30], 0.95, 1.0, 1.6, 0.0]],
    fortress: [['#b9b1a8', 1.0, 0.07, 0.8, [0.7, -0.35, 0.3], [34, 10, 34], 0.6, 0.0, 0.5, 1.5], ['#ff8a40', 3.0, 0.05, 0.18, [0.25, 0.5, 0.15], [30, 9, 30], 0.95, 0.7, 0.6, 0.5]],
    capital: [['#ffc77a', 2.4, 0.055, 0.5, [0.2, 0.55, 0.1], [32, 10, 32], 0.9, 0.6, 0.5, 0.4], ['#ffe6b0', 1.3, 0.05, 0.7, [0.06, 0.02, 0.04], [32, 8, 32], 0.5, 0.3, 0.4, 1.0]],
    abyss: [['#ff5a96', 3.0, 0.06, 0.55, [0.12, 0.6, 0.08], [32, 11, 32], 0.95, 0.75, 0.6, 0.3], ['#a880ff', 1.6, 0.05, 0.6, [0.04, 0.05, 0.03], [30, 8, 30], 0.6, 0.4, 0.5, 1.0]],
    peak: [['#ffffff', 1.05, 0.085, 1.5, [0.9, -1.25, 0.45], [36, 12, 36], 0.9, 0.0, 0.7, 2.0]]
  };
  LAY.default = LAY.village;
  const NB = { ultra: 1000, high: 650, mid: 250 };
  function mkLayer(c, n) {
    const geo = new THREE.BufferGeometry(); const a = new Float32Array(n * 4), pos = new Float32Array(n * 3);
    for (let i = 0; i < n * 4; i++) a[i] = Math.random();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aS', new THREE.BufferAttribute(a, 4));
    const u = { uT: { value: 0 }, uC: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(...c[5]) }, uDrift: { value: new THREE.Vector3(...c[4]) }, uSize: { value: c[2] }, uPx: { value: 800 }, uSw: { value: c[8] }, uYo: { value: c[9] - 1.2 }, uCol: { value: C3(c[0]).multiplyScalar(c[1]) }, uAl: { value: c[6] }, uTwk: { value: c[7] } };
    const m = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const p = new THREE.Points(geo, m); p.frustumCulled = false; p.renderOrder = 5; p.raycast = () => {}; p.userData.wm = 1;
    p.onBeforeRender = (r, s, cam) => { u.uT.value = performance.now() / 1000; u.uC.value.copy(cam.position); const cv = cvs(); u.uPx.value = (cv ? cv.height : 720) / (2 * Math.tan(cam.fov * Math.PI / 360)); };
    return p;
  }
  let _cv = null; const cvs = () => { if (_cv && _cv.isConnected) return _cv; let best = null, ba = 0; document.querySelectorAll('canvas').forEach(c => { const a = c.width * c.height; if (a > ba && c.clientWidth > 0) { ba = a; best = c; } }); return (_cv = best); };

  // ---- 调色（Master.P）----
  const GR = { // sat, con, shT, hiT, vig
    base: [1.12, 1.09, [0.92, 0.98, 1.1], [1.08, 1.0, 0.88], 0.46],
    village: [1.17, 1.08, [0.93, 0.99, 1.08], [1.1, 1.02, 0.86], 0.42],
    forest: [1.08, 1.1, [0.9, 1.02, 1.06], [1.04, 1.03, 0.9], 0.5],
    wilds: [1.13, 1.09, [0.94, 0.98, 1.06], [1.1, 1.0, 0.84], 0.44],
    abbey: [0.98, 1.08, [0.92, 0.98, 1.1], [1.02, 1.0, 0.96], 0.48],
    swamp: [0.95, 1.1, [0.92, 1.04, 0.98], [1.0, 1.04, 0.86], 0.52],
    fortress: [0.92, 1.13, [0.93, 0.98, 1.06], [1.04, 1.0, 0.94], 0.5],
    capital: [1.05, 1.1, [0.9, 0.96, 1.12], [1.1, 1.0, 0.82], 0.48],
    abyss: [1.1, 1.12, [1.06, 0.92, 1.14], [1.08, 0.96, 0.94], 0.54],
    peak: [0.94, 1.08, [0.9, 1.0, 1.14], [1.0, 1.02, 1.06], 0.44]
  };
  let base = null, gNow = null, gTo = null;
  const MP = () => { const p = window.__game && window.__game.postFx; return p && p.style === 'master' && window.Master ? Master.P : null; };
  const snap = P => ({ sat: P.sat, con: P.contrast, sh: P.shadowTint.slice(), hi: P.highTint.slice(), vig: P.vig });
  function setGradeTarget(k) {
    const P = MP(); if (!P) return; if (!base) base = snap(P);
    const g = GR[k] || GR.base; gTo = { sat: g[0], con: g[1], sh: g[2], hi: g[3], vig: g[4] }; if (!gNow) gNow = snap(P);
  }
  function restoreGrade() { if (base) { gTo = base; } }
  function stepGrade(dt) {
    const P = MP(); if (!P || !gTo || !gNow) return; const k = Math.min(1, dt * 1.2), L = (a, b) => a + (b - a) * k;
    gNow.sat = L(gNow.sat, gTo.sat); gNow.con = L(gNow.con, gTo.con); gNow.vig = L(gNow.vig, gTo.vig);
    for (let i = 0; i < 3; i++) { gNow.sh[i] = L(gNow.sh[i], gTo.sh[i]); gNow.hi[i] = L(gNow.hi[i], gTo.hi[i]); }
    P.sat = gNow.sat; P.contrast = gNow.con; P.vig = gNow.vig; P.shadowTint = gNow.sh.slice(); P.highTint = gNow.hi.slice();
    if (gTo === base && Math.abs(gNow.sat - base.sat) < 0.002 && Math.abs(gNow.vig - base.vig) < 0.002) { gTo = null; gNow = null; }
  }

  // ---- 进场处理 ----
  let curB = null, mine = [];
  function clearMine() { for (const o of mine) { try { if (o.parent) o.parent.remove(o); o.geometry.dispose(); o.material.dispose(); } catch (e) { } } mine = []; }
  function enhance(W, B) {
    clearMine(); const node = W.graph && W.graph.nodes[W.cur]; const rk = (node && node.region) || 'default';
    const tk = TK(), tn = tier();
    // 软阴影
    try {
      const sh = B.sun && B.sun.shadow; if (sh && tk >= 1) {
        const sz = tk >= 2 ? 4096 : 2048; if (sh.map) { sh.map.dispose(); sh.map = null; }
        sh.mapSize.set(sz, sz); sh.radius = tk >= 2 ? 4 : 2.5; sh.needsUpdate = true;
      }
    } catch (e) { console.warn('WM shadow', e); }
    // 粒子
    try {
      const L = LAY[rk] || LAY.default, nb = NB[tn] || 400, night = B.style && B.style.night;
      for (const c of L) { const cc = night ? c.slice() : c; if (night) cc[1] = c[1] * 1.25; const p = mkLayer(cc, Math.max(40, Math.round(nb * c[3]))); B.sc.add(p); mine.push(p); }
    } catch (e) { console.warn('WM particles', e); }
    setGradeTarget(rk);
  }
  let last = 0;
  function tick(t) {
    requestAnimationFrame(tick); const dt = Math.min(0.1, (t - last) / 1000 || 0.016); last = t;
    if (!act()) { if (curB) { clearMine(); curB = null; } restoreGrade(); stepGrade(dt); return; }
    const W = window.Worlds && Worlds._W; const B = W && W.B;
    if (B && B !== curB) { curB = B; try { enhance(W, B); } catch (e) { console.warn('WM', e); } }
    else if (!B && curB) { curB = null; mine = []; }
    if (!W) restoreGrade();
    stepGrade(dt);
  }
  requestAnimationFrame(tick);
  return { terr, dens, act, _lay: LAY, _grade: GR, _mk: mkLayer };
})();
