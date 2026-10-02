// R41 · 3D 战斗特效（MOD cfx3d，默认开）—— 用户反馈“战斗效果非常劣质，质感、动作都差”
//   旧版只有：DOM 里的一条白线 + 血/火花用的 1~3cm 圆点 Sprite + 一条 14 点的刃光带。
//   这里换成真正画在 3D 场景里的一套（全部走两个合批 draw call：加法混合 / 普通混合，每批 ≤700 个四边形）：
//     · 斩击弧光：沿出刀方向的新月形刃光（白芯 + 橙边，0.16s 内拉长→收细）+ 冲击星芒 + 冲击环（重击/击杀）
//     · 血：拉伸的高速血滴（沿速度方向拉长、带高光点、受重力）+ 红雾团 + 伤口处一团浓血；部位在头/颈时更多
//     · 火花：拉长的热火花线（格挡/弹刀/打到硬物），橙白渐变，带拖尾与重力
//     · 刃光拖尾 v2：按“时间”淡出（不再依赖帧率）、Catmull-Rom 细分、白芯亮边 → 暖色尾
//   钩子：combat.js sweep 里 CFX3D.pre(info,tg)/post(info,tg,res)；CombatFX.event 包一层拿到 hit/kill/blocked…；
//        每帧 HOOK.frame（在 Combat.update 之后）更新。不碰 foe.js / worlds.js；贴图是 canvas 画的光效贴图（VFX 纹理，不是模型/场景纹理）。
window.CFX3D = (() => {
  'use strict';
  const on = () => !window.Mods || Mods.on('cfx3d') !== false;
  const V3 = THREE.Vector3;
  let G = null, cam = null, hooked = false, cur = null, last = { t: '', fo: null, d: null, at: 0 };
  const _a = new V3(), _b = new V3(), _c = new V3(), _R = new V3(), _U = new V3(), _F = new V3(), _s = new V3(), _d = new V3(), _cp = new V3();
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---------------- 贴图集：4×2 格，每格 128px ----------------
  const CELLS = { dot: 0, streak: 1, star: 2, ring: 3, slash: 4, mist: 5, drop: 6, line: 7 };
  let atlas = null;
  function makeAtlas() {
    if (atlas) return atlas;
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
    const cell = (i) => { g.save(); g.translate((i % 4) * 128, Math.floor(i / 4) * 128); g.beginPath(); g.rect(0, 0, 128, 128); g.clip(); };
    // 0 软圆点
    cell(0); { const r = g.createRadialGradient(64, 64, 0, 64, 64, 60); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,0.7)'); r.addColorStop(0.6, 'rgba(255,255,255,0.18)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); } g.restore();
    // 1 彗星形火花（头在右：u=1）
    cell(1); { g.filter = 'blur(2px)'; const gr = g.createLinearGradient(6, 0, 122, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.75)'); gr.addColorStop(0.93, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(6, 64); g.quadraticCurveTo(70, 52, 116, 58); g.quadraticCurveTo(126, 64, 116, 70); g.quadraticCurveTo(70, 76, 6, 64); g.fill(); g.filter = 'none'; } g.restore();
    // 2 星芒
    cell(2); { const r = g.createRadialGradient(64, 64, 0, 64, 64, 62); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.15, 'rgba(255,255,255,0.75)'); r.addColorStop(0.5, 'rgba(255,255,255,0.12)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128);
      g.globalCompositeOperation = 'lighter'; g.translate(64, 64);
      for (let k = 0; k < 4; k++) { g.save(); g.rotate(k * Math.PI / 4 + 0.1); const L = k % 2 ? 40 : 62, w = k % 2 ? 2.2 : 3.4; const lg = g.createLinearGradient(-L, 0, L, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,1)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = lg; g.beginPath(); g.moveTo(-L, 0); g.quadraticCurveTo(0, -w, L, 0); g.quadraticCurveTo(0, w, -L, 0); g.fill(); g.restore(); } } g.restore();
    // 3 冲击环
    cell(3); { const r = g.createRadialGradient(64, 64, 34, 64, 64, 62); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.55, 'rgba(255,255,255,0.9)'); r.addColorStop(0.72, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); } g.restore();
    // 4 新月刃光（沿 u 轴，略弯）
    cell(4); { g.shadowColor = 'rgba(255,255,255,1)'; g.shadowBlur = 10; g.fillStyle = 'rgba(255,255,255,1)';
      g.beginPath(); g.moveTo(4, 78); g.bezierCurveTo(34, 52, 88, 46, 124, 56); g.bezierCurveTo(92, 58, 40, 66, 4, 78); g.fill();
      g.shadowBlur = 0; g.globalAlpha = 0.35; g.beginPath(); g.moveTo(4, 78); g.bezierCurveTo(34, 44, 88, 38, 124, 56); g.bezierCurveTo(92, 52, 40, 64, 4, 78); g.fill(); } g.restore();
    // 5 雾团（多个软圆叠加，固定种子）
    cell(5); { let s = 7; const rr = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 26; i++) { const x = 64 + (rr() - 0.5) * 56, y = 64 + (rr() - 0.5) * 56, R = 14 + rr() * 22; const r = g.createRadialGradient(x, y, 0, x, y, R); r.addColorStop(0, 'rgba(255,255,255,0.22)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); } } g.restore();
    // 6 血滴（头在右，带一点高光）
    cell(6); { g.fillStyle = 'rgba(255,255,255,1)'; g.beginPath(); g.moveTo(4, 64); g.quadraticCurveTo(50, 60, 80, 44); g.quadraticCurveTo(122, 46, 122, 64); g.quadraticCurveTo(122, 82, 80, 84); g.quadraticCurveTo(50, 68, 4, 64); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.0)'; g.globalCompositeOperation = 'source-atop'; const h = g.createRadialGradient(96, 54, 0, 96, 54, 14); h.addColorStop(0, 'rgba(255,255,255,1)'); h.addColorStop(1, 'rgba(255,255,255,0.0)'); g.fillStyle = h; g.fillRect(0, 0, 128, 128); } g.restore();
    // 7 细火花线
    cell(7); { const gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.75, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 64); g.quadraticCurveTo(80, 60.5, 128, 64); g.quadraticCurveTo(80, 67.5, 0, 64); g.fill(); } g.restore();
    atlas = new THREE.CanvasTexture(c); atlas.encoding = THREE.sRGBEncoding; atlas.needsUpdate = true; return atlas;
  }
  const cellUV = (i) => { const cx = i % 4, cy = Math.floor(i / 4); return [cx / 4, 1 - (cy + 1) / 2, (cx + 1) / 4, 1 - cy / 2]; };

  // ---------------- 合批四边形 ----------------
  class Batch {
    constructor(cap, add, order) {
      this.cap = cap; this.ps = [];
      const pos = new Float32Array(cap * 12), uv = new Float32Array(cap * 8), col = new Float32Array(cap * 16), idx = new Uint16Array(cap * 6);
      for (let i = 0; i < cap; i++) { const a = i * 4; idx.set([a, a + 1, a + 2, a, a + 2, a + 3], i * 6); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage)); geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.setDrawRange(0, 0);
      const mat = new THREE.MeshBasicMaterial({ map: makeAtlas(), vertexColors: true, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide, fog: false });
      this.m = new THREE.Mesh(geo, mat); this.m.frustumCulled = false; this.m.renderOrder = order; this.m.userData.noShadow = true; this.m.matrixAutoUpdate = false;
    }
    spawn(o) {
      if (this.ps.length >= this.cap) this.ps.shift();
      const p = Object.assign({ p: new V3(), v: new V3(), g: 0, drag: 0, age: 0, life: 0.4, w0: 0.05, w1: 0.05, l0: 0.05, l1: 0.05, rot: 0, vr: 0, cell: 0, r: 1, gg: 1, b: 1, a: 1, pw: 1, ain: 0.06, mode: 's', ax: null, delay: 0 }, o);
      this.ps.push(p); return p;
    }
    update(dt, camera) {
      const ps = this.ps, geo = this.m.geometry, pa = geo.attributes.position.array, ua = geo.attributes.uv.array, ca = geo.attributes.color.array;
      camera.matrixWorld.extractBasis(_R, _U, _F); _F.negate(); const cp = camera.getWorldPosition(_cp);
      let n = 0;
      for (let i = 0; i < ps.length; i++) {
        const q = ps[i]; if (q.delay > 0) { q.delay -= dt; continue; }
        q.age += dt; if (q.age >= q.life) { ps.splice(i--, 1); continue; }
        if (q.drag) q.v.multiplyScalar(Math.max(0, 1 - q.drag * dt)); q.v.y -= q.g * dt; q.p.addScaledVector(q.v, dt); q.rot += q.vr * dt;
        const t = q.age / q.life, e = 1 - Math.pow(1 - t, 2); // e：先快后慢的进度
        const w = q.w0 + (q.w1 - q.w0) * e, l = q.l0 + (q.l1 - q.l0) * e;
        let al = q.a * Math.pow(1 - t, q.pw) * Math.min(1, t / Math.max(1e-3, q.ain)); if (al < 0.004) continue;
        const o = n * 12;
        if (q.mode === 'b') {
          const cs = Math.cos(q.rot), sn = Math.sin(q.rot), hx = w / 2, hy = l / 2;
          const rx = _a.copy(_R).multiplyScalar(cs).addScaledVector(_U, sn), ry = _b.copy(_U).multiplyScalar(cs).addScaledVector(_R, -sn);
          const cx = [-1, 1, 1, -1], cy = [-1, -1, 1, 1];
          for (let k = 0; k < 4; k++) { pa[o + k * 3] = q.p.x + rx.x * hx * cx[k] + ry.x * hy * cy[k]; pa[o + k * 3 + 1] = q.p.y + rx.y * hx * cx[k] + ry.y * hy * cy[k]; pa[o + k * 3 + 2] = q.p.z + rx.z * hx * cx[k] + ry.z * hy * cy[k]; }
        } else {
          _d.copy(q.ax || q.v); if (_d.lengthSq() < 1e-8) _d.copy(_R); _d.normalize();
          _c.copy(q.p).sub(cp); _s.crossVectors(_d, _c); if (_s.lengthSq() < 1e-10) _s.copy(_U); _s.normalize();
          const hl = l / 2, hw = w / 2;
          const sx = [-1, 1, 1, -1], sy = [-1, -1, 1, 1];
          for (let k = 0; k < 4; k++) { pa[o + k * 3] = q.p.x + _d.x * hl * sx[k] + _s.x * hw * sy[k]; pa[o + k * 3 + 1] = q.p.y + _d.y * hl * sx[k] + _s.y * hw * sy[k]; pa[o + k * 3 + 2] = q.p.z + _d.z * hl * sx[k] + _s.z * hw * sy[k]; }
        }
        const u = cellUV(q.cell), uo = n * 8; ua[uo] = u[0]; ua[uo + 1] = u[1]; ua[uo + 2] = u[2]; ua[uo + 3] = u[1]; ua[uo + 4] = u[2]; ua[uo + 5] = u[3]; ua[uo + 6] = u[0]; ua[uo + 7] = u[3];
        for (let k = 0; k < 4; k++) { const co = n * 16 + k * 4; ca[co] = q.r; ca[co + 1] = q.gg; ca[co + 2] = q.b; ca[co + 3] = al; }
        n++;
      }
      geo.setDrawRange(0, n * 6); geo.attributes.position.needsUpdate = geo.attributes.uv.needsUpdate = geo.attributes.color.needsUpdate = true; this.m.visible = n > 0;
    }
  }
  let ADD = null, ALP = null, TRL = null;

  // ---------------- 刃光拖尾 v2 ----------------
  const TMAX = 40;
  class Trail {
    constructor() {
      this.S = []; const cap = TMAX * 4;
      const pos = new Float32Array(cap * 2 * 3), col = new Float32Array(cap * 2 * 4), idx = []; for (let i = 0; i < cap - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)); geo.setAttribute('color', new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage)); geo.setIndex(idx); geo.setDrawRange(0, 0);
      this.m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
      this.m.frustumCulled = false; this.m.renderOrder = 6; this.m.userData.noShadow = true; this.m.matrixAutoUpdate = false; this.cap = cap; this.tint = new THREE.Color('#ffd9a0'); this.cold = new THREE.Color('#ff7a3a');
    }
    sample(b0, t, sp, now) {
      const b = _cp.copy(b0).lerp(t, 0.6); // 只取刀身外 40%：靠近镜头的刃根不画（否则一大片糊在脸上）
      const S = this.S, l = S[S.length - 1];
      if (l && l.b.distanceToSquared(b) + l.t.distanceToSquared(t) < 1e-7) { l.s = sp; return; }
      if (l && l.t.distanceToSquared(t) > 2.25) S.length = 0; // 瞬移
      S.push({ b: b.clone(), t: t.clone(), s: sp, at: now }); if (S.length > TMAX) S.shift();
    }
    update(now, charged) {
      const S = this.S, life = charged ? 0.26 : 0.17; while (S.length && now - S[0].at > life) S.shift();
      const geo = this.m.geometry, pa = geo.attributes.position.array, ca = geo.attributes.color.array; let n = 0;
      if (S.length < 2) { geo.setDrawRange(0, 0); this.m.visible = false; return; }
      // Catmull-Rom 细分：每段 3 份
      const P = (arr, i) => arr[Math.max(0, Math.min(arr.length - 1, i))];
      const put = (b, t, age, sp) => {
        if (n >= this.cap) return; const k = Math.max(0, Math.min(1, (sp - 2.0) / 6)) * Math.pow(1 - age / life, 1.9); const o = n * 6, c = n * 8;
        pa[o] = b.x; pa[o + 1] = b.y; pa[o + 2] = b.z; pa[o + 3] = t.x; pa[o + 4] = t.y; pa[o + 5] = t.z;
        // 刃根一侧：暖色、半透明；刃尖一侧：白芯
        ca[c] = this.cold.r; ca[c + 1] = this.cold.g; ca[c + 2] = this.cold.b; ca[c + 3] = k * 0.05;
        ca[c + 4] = 1; ca[c + 5] = 0.96 + 0.04 * this.tint.g; ca[c + 6] = 0.86; ca[c + 7] = k * (charged ? 0.95 : 0.8);
        n++;
      };
      const bs = S.map(s => s.b), ts = S.map(s => s.t), tmp1 = new V3(), tmp2 = new V3();
      const cr = (a, b, c, d, t, out) => { const t2 = t * t, t3 = t2 * t; out.x = 0.5 * ((2 * b.x) + (-a.x + c.x) * t + (2 * a.x - 5 * b.x + 4 * c.x - d.x) * t2 + (-a.x + 3 * b.x - 3 * c.x + d.x) * t3); out.y = 0.5 * ((2 * b.y) + (-a.y + c.y) * t + (2 * a.y - 5 * b.y + 4 * c.y - d.y) * t2 + (-a.y + 3 * b.y - 3 * c.y + d.y) * t3); out.z = 0.5 * ((2 * b.z) + (-a.z + c.z) * t + (2 * a.z - 5 * b.z + 4 * c.z - d.z) * t2 + (-a.z + 3 * b.z - 3 * c.z + d.z) * t3); return out; };
      for (let i = S.length - 1; i >= 0; i--) { // 从最新往最旧
        const s0 = S[i], sN = S[i - 1] || s0;
        for (let k = 0; k < 3; k++) {
          const f = k / 3, ia = i, ib = i - 1; if (ib < 0) { put(s0.b, s0.t, now - s0.at, s0.s); break; }
          // 在 S[i] → S[i-1] 之间细分（Catmull-Rom：控制点 i+1, i, i-1, i-2）
          cr(P(bs, ia + 1), bs[ia], bs[ib], P(bs, ib - 1), f, tmp1); cr(P(ts, ia + 1), ts[ia], ts[ib], P(ts, ib - 1), f, tmp2);
          put(tmp1, tmp2, (now - s0.at) * (1 - f) + (now - sN.at) * f, s0.s * (1 - f) + sN.s * f);
        }
      }
      geo.setDrawRange(0, Math.max(0, (n - 1)) * 6); geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = true; this.m.visible = n > 1;
    }
  }

  // ---------------- 特效配方 ----------------
  function camDir(out) { cam.getWorldDirection(out); return out; }
  function swingDirW(info, out) { // 出刀方向（世界，沿镜头平面）
    if (info && info.vel && info.vel.lengthSq() > 0.01) out.copy(info.vel); else { const S = window.Combat && Combat.state, v = S && S.sw && S.sw.v; cam.matrixWorld.extractBasis(_R, _U, _F); if (v) out.copy(_R).multiplyScalar(v.x).addScaledVector(_U, v.y); else out.copy(_R).add(_U.multiplyScalar(-0.6)); }
    if (out.lengthSq() < 1e-6) out.set(1, 0, 0); return out.normalize();
  }
  function slashArc(P, dir, big, col) { // 新月弧光 + 细白芯
    const c = col || [1, 0.62, 0.25], L = big ? 1.55 : 1.05, W = big ? 0.2 : 0.13;
    ADD.spawn({ p: P.clone().addScaledVector(dir, 0.0), ax: dir.clone(), cell: CELLS.slash, l0: L * 0.45, l1: L, w0: W * 0.5, w1: W * 1.1, r: c[0], gg: c[1], b: c[2], a: 0.85, life: big ? 0.2 : 0.15, pw: 1.4, ain: 0.02 });
    ADD.spawn({ p: P.clone(), ax: dir.clone(), cell: CELLS.slash, l0: L * 0.5, l1: L * 1.15, w0: W * 0.25, w1: W * 0.5, r: 1, gg: 0.97, b: 0.88, a: 1, life: big ? 0.16 : 0.12, pw: 1.8, ain: 0.02 });
  }
  function flash(P, size, col, life) { ADD.spawn({ p: P.clone(), mode: 'b', cell: CELLS.star, w0: size * 0.45, w1: size, l0: size * 0.45, l1: size, rot: rnd(0, 6.28), vr: rnd(-2, 2), r: col[0], gg: col[1], b: col[2], a: 1, life: life || 0.12, pw: 1.6, ain: 0.02 }); }
  function ring(P, size, col, life) { ADD.spawn({ p: P.clone(), mode: 'b', cell: CELLS.ring, w0: size * 0.15, w1: size, l0: size * 0.15, l1: size, r: col[0], gg: col[1], b: col[2], a: 0.9, life: life || 0.2, pw: 1.3, ain: 0.02 }); }
  function sparks(P, dir, n, spd, hot) {
    for (let i = 0; i < n; i++) {
      const v = new V3(rnd(-1, 1), rnd(-0.3, 1.1), rnd(-1, 1)).normalize().multiplyScalar(spd * rnd(0.35, 1)).addScaledVector(dir, spd * rnd(0.2, 0.9));
      const k = Math.random(); ADD.spawn({ p: P.clone(), v, g: 7, drag: 1.3, cell: k < 0.35 ? CELLS.line : CELLS.streak, w0: rnd(0.012, 0.022), w1: 0.004, l0: rnd(0.08, 0.2), l1: 0.03, r: 1, gg: hot ? rnd(0.65, 0.92) : rnd(0.8, 0.95), b: hot ? rnd(0.2, 0.45) : rnd(0.55, 0.9), a: 1, life: rnd(0.22, 0.55), pw: 1.2, ain: 0.01 });
    }
  }
  function blood(P, dir, n, big, zoneHi) {
    const dk = [[0.62, 0.03, 0.035], [0.8, 0.06, 0.06], [0.45, 0.015, 0.02]];
    for (let i = 0; i < n; i++) { // 高速血滴：沿速度拉长
      const v = new V3(rnd(-1, 1), rnd(-0.2, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(0.8, 2.6) * big).addScaledVector(dir, rnd(2.2, 6.0) * big); if (zoneHi) v.y += rnd(0.4, 1.4);
      const c = dk[(Math.random() * 3) | 0]; const s = rnd(0.022, 0.05) * (0.8 + big * 0.3);
      ALP.spawn({ p: P.clone().addScaledVector(v, 0.012), v, g: 9.5, drag: 0.45, cell: CELLS.drop, w0: s, w1: s * 0.7, l0: s * 3.6, l1: s * 1.5, r: c[0], gg: c[1], b: c[2], a: 0.95, life: rnd(0.45, 1.0), pw: 0.6, ain: 0.01 });
    }
    // 伤口处浓血 + 雾
    ALP.spawn({ p: P.clone(), mode: 'b', cell: CELLS.dot, w0: 0.09 * big, w1: 0.26 * big, l0: 0.09 * big, l1: 0.26 * big, r: 0.45, gg: 0.02, b: 0.03, a: 0.85, life: 0.22, pw: 1.3, ain: 0.02 });
    const nm = Math.round(3 + big * 2);
    for (let i = 0; i < nm; i++) { const v = new V3(rnd(-0.4, 0.4), rnd(0.0, 0.5), rnd(-0.4, 0.4)).addScaledVector(dir, rnd(0.6, 1.8)); const sz = rnd(0.22, 0.42) * big; ALP.spawn({ p: P.clone(), v, drag: 2.2, mode: 'b', cell: CELLS.mist, w0: sz * 0.4, w1: sz * 1.5, l0: sz * 0.4, l1: sz * 1.5, rot: rnd(0, 6.28), vr: rnd(-1.5, 1.5), r: 0.62, gg: 0.04, b: 0.05, a: rnd(0.5, 0.7), life: rnd(0.35, 0.6), pw: 1.2, ain: 0.05 }); }
  }
  // ---- 命中位置：优先落在被打中的部位骨骼上 ----
  function bodyPoint(fo, d, info, out) {
    if (fo && fo.f && fo.f.bones) {
      const z = d && d.zone, B = fo.f.bones; let bone = z && B[z];
      if (!bone && z) { const alt = { spine: 'spine', hips: 'hips', chest: 'chest', upperChest: 'upperChest' }[z]; bone = alt && B[alt]; }
      bone = bone || B.upperChest || B.chest || B.spine || B.hips;
      if (bone) { bone.getWorldPosition(out); if (info && info.point) out.lerp(info.point, 0.18); return out.addScaledVector(camDir(_c).negate(), 0.14); }
    }
    if (fo && fo.pos) { out.copy(fo.pos); out.y += 1.0; return out.addScaledVector(camDir(_c).negate(), 0.2); }
    return info && info.point ? out.copy(info.point) : out.copy(cam.getWorldPosition(_a)).addScaledVector(camDir(_c), 1.5);
  }
  function fx(t, fo, d) {
    if (!on() || !ADD || !G) return; d = d || {};
    const info = cur && now() - cur.at < 0.05 ? cur.info : null;
    const P = bodyPoint(fo, d, info, new V3()), dir = swingDirW(info, new V3());
    const thrust = info && info.kind === 'thrust', heavy = !!(d.charged || d.brk || d.crit || d.skill || (info && info.charged));
    const fwd = camDir(new V3());
    if (t === 'hit') {
      const hi = d.zone === 'head' || d.zone === 'neck';
      const big = (heavy ? 1.5 : 1) * (hi ? 1.15 : 1);
      if (thrust) { flash(P, 0.4, [1, 0.8, 0.55], 0.1); blood(P, fwd.clone().multiplyScalar(0.8).add(dir.clone().multiplyScalar(0.2)), Math.round(12 * big), big, hi); }
      else { slashArc(P, dir, heavy); flash(P, heavy ? 0.6 : 0.4, [1, 0.85, 0.6], heavy ? 0.14 : 0.1); blood(P, dir.clone().multiplyScalar(0.9).add(fwd.clone().multiplyScalar(0.25)), Math.round(24 * big), big, hi); }
      if (heavy) ring(P, 0.9, [1, 0.75, 0.5], 0.22);
      sparks(P, dir, heavy ? 7 : 4, 4.2, true);
    } else if (t === 'kill' || t === 'decap' || t === 'execute' || t === 'onecut' || t === 'decapAlive' || t === 'sever' || t === 'halve') {
      const big = t === 'kill' ? 1.4 : 2.1; if (t !== 'kill') { slashArc(P, dir, true, [1, 0.3, 0.2]); flash(P, 0.8, [1, 0.6, 0.4], 0.16); ring(P, 1.2, [1, 0.45, 0.3], 0.26); }
      blood(P, dir.clone().add(fwd.clone().multiplyScalar(0.3)), Math.round(24 * big), big, true);
    } else if (t === 'blocked' || t === 'guard' || t === 'parry' || t === 'guardbreak') {
      const pr = t === 'parry' || t === 'guardbreak'; P.lerp(cam.getWorldPosition(_a), 0.25);
      flash(P, pr ? 0.75 : 0.5, pr ? [0.75, 0.9, 1] : [1, 0.9, 0.6], 0.13); ring(P, pr ? 1.0 : 0.6, pr ? [0.6, 0.85, 1] : [1, 0.85, 0.5], 0.2);
      sparks(P, dir.clone().negate(), pr ? 34 : 22, pr ? 6.5 : 5.2, !pr);
      ADD.spawn({ p: P.clone(), ax: dir.clone().applyAxisAngle(fwd, Math.PI / 2), cell: CELLS.slash, l0: 0.3, l1: 0.8, w0: 0.05, w1: 0.1, r: 1, gg: 0.92, b: 0.6, a: 0.9, life: 0.12, pw: 1.5 });
    }
  }
  const now = () => performance.now() / 1000;

  // ---------------- 接线 ----------------
  function ensure() {
    const W = window.Worlds && Worlds.active && Worlds._W && Worlds._W.B;
    const sc = (W && W.sc) || (G && G.scene); if (!sc) return;
    for (const o of [ADD && ADD.m, ALP && ALP.m, TRL && TRL.m]) if (o && o.parent !== sc) sc.add(o);
  }
  function frame(dt, tnow) {
    if (!G || !ADD) return; const enabled = on(); dt = Math.min(dt, 0.05);
    if (!enabled) { ADD.m.visible = ALP.m.visible = TRL.m.visible = false; api.trailOwn = false; return; }
    api.trailOwn = true; ensure(); cam.updateMatrixWorld();
    ADD.update(dt, cam); ALP.update(dt, cam);
    // 拖尾：取 Combat 每帧写好的世界坐标刃线
    const C = window.Combat, S = C && C.state;
    if (C && C.drawn && S && S.lastTip && S.lastBase) { const sp = S.rmb ? 0 : S.tipSpeed * (S.charged > 0 ? 1.4 : 1); TRL.sample(S.lastBase, S.lastTip, sp, tnow); }
    else TRL.S.length = 0;
    TRL.update(tnow, S && S.charged > 0);
  }
  function init(game) {
    if (hooked || !window.THREE) return; G = game; cam = G.camera; ADD = new Batch(700, true, 7); ALP = new Batch(700, false, 4); TRL = new Trail();
    [ADD.m, ALP.m, TRL.m].forEach(m => G.scene.add(m)); hooked = true;
    if (G.HOOK) G.HOOK.frame.push(frame);
    const wrap = () => { if (!window.CombatFX) return false; if (CombatFX._c3w) return true; const orig = CombatFX.event; CombatFX.event = function (t, fo, d) { let r; try { r = orig.apply(this, arguments); } finally { try { fx(t, fo, d); } catch (e) { console.warn('cfx3d', e); } } return r; }; CombatFX._c3w = true; return true; };
    const go = () => { if (!wrap()) setTimeout(go, 400); }; go();
  }
  const api = {
    on, init, fx, frame, trailOwn: false,
    pre(info, tg) { cur = { info, tg, at: now() }; },
    post() { },
    _dbg: { get add() { return ADD; }, get alp() { return ALP; }, get trail() { return TRL; }, hit: (t, fo, d, info) => { cur = info ? { info, at: now() } : null; fx(t, fo, d); } }
  };
  return api;
})();
