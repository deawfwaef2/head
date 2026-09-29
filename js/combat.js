// 第十四轮 · 手势战斗内核（MOD：gesture_combat）
// F 拔刀/收刀。拔刀后：
//   按住左键 = 武器实时跟随鼠标轨迹（从下往上滑 = 上撩，从上往下 = 下劈，左右 = 横斩）；伤害取决于刃尖真实速度
//   快速点击左键 = 刺（连点连刺）
//   按住右键 = 格挡；按住时轻微移动鼠标 = 切换格挡方向（上 / 下 / 左 / 右）
// 命中判定：沿刃线取若干点，逐帧扫掠（上一帧→这一帧）对目标球体求交；目标由 Combat.addProvider 注册（敌人 AI 之后接入）
// 反馈：顿帧、屏震、火花、刃光拖尾、音效、体力
window.Combat = (() => {
  const V3 = THREE.Vector3;
  let G = null, cam = null, vm = null, wpn = null, fist = null;
  let drawn = false, enabled = false;
  const WEIGHT = [1.0, 1.3, 0.8, 1.5, 1.4, 0.9, 1.0];
  // 相机空间：x 右，y 上，-z 前
  const IDLE_H = new V3(0.26, -0.3, -0.5), IDLE_B = new V3(-0.22, 0.92, -0.32).normalize();
  const PIVOT = new V3(0.06, -0.38, 0.22); // 右肩/胸口：刃从这里向外辐射
  const S = {
    hand: IDLE_H.clone(), hv: new V3(), tgt: IDLE_H.clone(), blade: IDLE_B.clone(), bladeT: IDLE_B.clone(),
    lmb: false, rmb: false, lmbT: 0, drag: 0, ctrl: { x: 0.6, y: -0.6 },
    thrust: 0, thrustQ: 0, thrustSide: 1, guard: { x: 0, y: 1 }, gdir: 'up',
    stam: 100, stop: 0, shake: 0, lastTip: null, lastBase: null, tipSpeed: 0, swingSnd: 0, hitCd: new Map(), len: 0.8, wt: 1, edge: new V3(1, 0, 0)
  };
  const providers = [];
  const addProvider = (f) => providers.push(f);

  // ---------- 刃光拖尾（特效，不是模型）----------
  const TN = 14; let trail = null;
  function makeTrail() {
    const geo = new THREE.BufferGeometry(); const pos = new Float32Array(TN * 2 * 3), col = new Float32Array(TN * 2 * 3); const idx = [];
    for (let i = 0; i < TN - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setIndex(idx); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    m.frustumCulled = false; m.userData.noShadow = true; m.renderOrder = 5; m.visible = false;
    return { m, pts: [], col: new THREE.Color('#ffe2b0') };
  }
  function pushTrail(base, tip, speed) {
    const t = trail; t.pts.unshift({ b: base.clone(), t: tip.clone(), s: speed }); if (t.pts.length > TN) t.pts.pop();
    const pa = t.m.geometry.attributes.position, ca = t.m.geometry.attributes.color; let any = false;
    for (let i = 0; i < TN; i++) {
      const p = t.pts[Math.min(i, t.pts.length - 1)]; pa.setXYZ(i * 2, p.b.x, p.b.y, p.b.z); pa.setXYZ(i * 2 + 1, p.t.x, p.t.y, p.t.z);
      const k = Math.max(0, Math.min(1, (p.s - 2.5) / 6)) * (1 - i / TN) ** 1.6; if (k > 0.01) any = true;
      ca.setXYZ(i * 2, t.col.r * k * 0.15, t.col.g * k * 0.15, t.col.b * k * 0.15); ca.setXYZ(i * 2 + 1, t.col.r * k, t.col.g * k, t.col.b * k);
    }
    pa.needsUpdate = ca.needsUpdate = true; t.m.visible = any;
  }

  // ---------- 体力条 ----------
  let hud = null;
  function makeHud() {
    const d = document.createElement('div'); d.id = 'combatHud';
    d.style.cssText = 'position:fixed;left:50%;top:calc(50% + 26px);transform:translateX(-50%);width:120px;height:5px;border-radius:3px;background:rgba(0,0,0,.45);pointer-events:none;display:none;z-index:20;box-shadow:0 0 6px rgba(0,0,0,.6)';
    const b = document.createElement('i'); b.style.cssText = 'display:block;height:100%;width:100%;border-radius:3px;background:linear-gradient(90deg,#ffd27a,#ff9a3a);transition:width .08s';
    const g = document.createElement('div'); g.style.cssText = 'position:absolute;left:50%;top:-44px;transform:translateX(-50%);font:600 13px sans-serif;color:#cfe6ff;text-shadow:0 1px 3px #000;opacity:0;transition:opacity .15s;white-space:nowrap';
    d.appendChild(b); d.appendChild(g); document.body.appendChild(d); return { d, b, g };
  }

  function init(game) {
    G = game; cam = G.camera; vm = G.vm; enabled = !window.Mods || Mods.on('gesture_combat');
    trail = makeTrail(); G.scene.add(trail.m); hud = makeHud();
    addProvider(headTargets);
  }
  function grabWeapon() {
    wpn = G.weapon; fist = G.fist; if (!wpn) return;
    const t = (G.S.eq && G.S.eq.weapon) || 0; S.len = (wpn.userData && wpn.userData.len) || 0.8; S.wt = WEIGHT[Math.min(t, WEIGHT.length - 1)];
    if (!wpn.userData.rest) wpn.userData.rest = { p: wpn.position.clone(), r: wpn.rotation.clone() };
  }
  function toggle(force) {
    if (!enabled) return false;
    drawn = force == null ? !drawn : !!force; grabWeapon();
    if (drawn) {
      vm.userData.rest = vm.userData.rest || { p: vm.position.clone(), r: vm.rotation.clone() };
      vm.position.set(0, 0, 0); vm.rotation.set(0, 0, 0); if (fist) fist.visible = false;
      S.hand.set(0.2, -0.55, -0.35); S.hv.set(0, 0, 0); S.blade.copy(IDLE_B); S.lastTip = null; trail.pts.length = 0; S.stam = Math.max(S.stam, 30);
      SFX.play('draw', 0.7); G.toast && G.toast('⚔️ 拔刀：按住左键挥砍 · 连点刺 · 按住右键格挡（F 收刀）', '#ffd27a', 2.2);
    } else {
      const r = vm.userData.rest; if (r) { vm.position.copy(r.p); vm.rotation.copy(r.r); }
      if (wpn && wpn.userData.rest) { wpn.position.copy(wpn.userData.rest.p); wpn.rotation.copy(wpn.userData.rest.r); }
      if (fist) fist.visible = !(wpn && wpn.userData.asset);
      S.lmb = S.rmb = false; trail.m.visible = false; hud.d.style.display = 'none'; SFX.play('draw', 0.45, 0.8);
    }
    return true;
  }
  function onWeapon() { if (!G) return; const was = drawn; if (was) { drawn = false; toggle(true); } else grabWeapon(); }

  // ---------- 输入 ----------
  function onDown(btn) {
    if (!drawn) return false;
    if (btn === 0) { S.lmb = true; S.lmbT = performance.now(); S.drag = 0; const c = invCtrl(S.hand); S.ctrl.x = c.x; S.ctrl.y = c.y; }
    if (btn === 2) { S.rmb = true; S.guard.x = 0; S.guard.y = 1; }
    return true;
  }
  function onUp(btn) {
    if (!drawn) return false;
    if (btn === 0 && S.lmb) { S.lmb = false; const dt = performance.now() - S.lmbT; if (dt < 190 && S.drag < 0.12) queueThrust(); }
    if (btn === 2) S.rmb = false;
    return true;
  }
  // 返回镜头转动系数：挥砍/格挡时鼠标主要用于控制武器
  function onMove(dx, dy) {
    if (!drawn) return 1;
    if (S.lmb) { const k = 0.0062; S.ctrl.x += dx * k; S.ctrl.y -= dy * k; S.drag += Math.hypot(dx, dy) * k; const r = Math.hypot(S.ctrl.x, S.ctrl.y); if (r > 1.25) { S.ctrl.x *= 1.25 / r; S.ctrl.y *= 1.25 / r; } return 1; }
    if (S.rmb) { S.guard.x += dx * 0.03; S.guard.y -= dy * 0.03; const r = Math.hypot(S.guard.x, S.guard.y); if (r > 1) { S.guard.x /= r; S.guard.y /= r; } return 1; }
    return 1;
  }
  function queueThrust() { if (S.thrust > 0.55 || S.thrust === 0) { S.thrust = 0.0001; S.thrustSide = -S.thrustSide; S.stam -= 9; SFX.play('draw', 0.35, 1.5); } else S.thrustQ = Math.min(2, S.thrustQ + 1); }

  // 控制点 → 手的目标位置（前方一个椭球面）
  function ctrlToHand(cx, cy, out) { const r2 = Math.min(1, cx * cx + cy * cy); return out.set(cx * 0.42, cy * 0.34 - 0.08, -0.42 - 0.2 * (1 - r2)); }
  function invCtrl(h) { return { x: Math.max(-1.25, Math.min(1.25, h.x / 0.42)), y: Math.max(-1.25, Math.min(1.25, (h.y + 0.08) / 0.34)) }; }
  const GUARD = {
    up: { h: new V3(0.1, 0.17, -0.5), b: new V3(-1, 0.18, -0.3) },
    down: { h: new V3(0.1, -0.44, -0.46), b: new V3(-1, -0.35, -0.2) },
    left: { h: new V3(-0.2, -0.22, -0.46), b: new V3(0.12, 1, -0.12) },
    right: { h: new V3(0.32, -0.22, -0.46), b: new V3(-0.12, 1, -0.12) }
  };

  // ---------- 目标：散落在地上的首级（挂载/手持的不受影响）----------
  const _hp = new V3();
  function headTargets(center) {
    const out = []; if (!G.heads || (window.Worlds && Worlds.active)) return out;
    for (const h of G.heads) {
      if (!h || h.mount || h === G.held || !h.g.visible) continue;
      _hp.copy(h.g.position); _hp.y += 0.02; if (_hp.distanceToSquared(center) > 9) continue;
      out.push({ id: h, pos: _hp.clone(), r: 0.17, kind: 'head', onHit(info) {
        const v = info.vel.clone().multiplyScalar(0.55); v.y = Math.max(v.y, 1.2 + info.speed * 0.12); h.vel.copy(v); h.sleep = 0; if (h.av) h.av.set((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18);
        SFX.thud(Math.min(1, info.speed / 9)); G.burst(info.point, '#ffd9a0', 10 + Math.round(info.speed), 1.2, 0.45, -4);
      } });
    }
    return out;
  }

  // ---------- 每帧 ----------
  const _t = new V3(), _b = new V3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _x = new V3(), _y = new V3(), _z = new V3(), UP = new V3(0, 1, 0);
  const _tipW = new V3(), _baseW = new V3(), _vel = new V3(), _seg = new V3(), _cp = new V3();
  function update(dt, now) {
    if (!drawn || !wpn) { if (hud && hud.d.style.display !== 'none' && !drawn) hud.d.style.display = 'none'; return; }
    if (G.uiOpen) { S.lmb = S.rmb = false; }
    // 顿帧：武器冻结一小会，屏震衰减
    if (S.stop > 0) { S.stop -= dt; S.shake *= 0.85; placeWeapon(); return; }
    const tired = S.stam <= 0 ? 0.5 : 1;
    let omega = 26 / Math.sqrt(S.wt) * tired;
    // 目标姿态
    if (S.rmb) {
      const g = S.guard; S.gdir = Math.abs(g.x) > Math.abs(g.y) ? (g.x < 0 ? 'left' : 'right') : (g.y < 0 ? 'down' : 'up');
      S.tgt.copy(GUARD[S.gdir].h); S.bladeT.copy(GUARD[S.gdir].b).normalize(); omega *= 1.25; S.stam = Math.min(100, S.stam + dt * 6);
    } else if (S.thrust > 0) {
      S.thrust += dt / (0.24 * Math.sqrt(S.wt)); const k = S.thrust < 0.45 ? S.thrust / 0.45 : Math.max(0, 1 - (S.thrust - 0.45) / 0.55);
      const e = 1 - (1 - k) * (1 - k); S.tgt.set(0.1 * S.thrustSide * 0.5 + 0.08, -0.16, -0.42 - e * 0.55); S.bladeT.set(-0.04 * S.thrustSide, 0.08, -1).normalize(); omega *= 1.6;
      if (S.thrust >= 1) { S.thrust = 0; if (S.thrustQ > 0) { S.thrustQ--; queueThrust(); } }
    } else if (S.lmb) {
      ctrlToHand(S.ctrl.x, S.ctrl.y, S.tgt);
      S.bladeT.copy(S.tgt).sub(PIVOT).normalize().add(_t.set(0, 0, -0.35)).normalize();
    } else {
      // 松开：控制点缓慢回到待机位
      S.ctrl.x += (0.6 - S.ctrl.x) * Math.min(1, dt * 5); S.ctrl.y += (-0.6 - S.ctrl.y) * Math.min(1, dt * 5);
      S.tgt.lerp(IDLE_H, Math.min(1, dt * 8)); S.bladeT.lerp(IDLE_B, Math.min(1, dt * 6)).normalize();
      S.stam = Math.min(100, S.stam + dt * 28);
    }
    // 临界阻尼弹簧：手跟随目标
    // 临界阻尼弹簧的解析解：任意帧率都稳定（显式欧拉在 ω·dt > 1 时会发散）
    { const e = Math.exp(-omega * dt); const x0 = _t.copy(S.hand).sub(S.tgt); const j = _x.copy(S.hv).addScaledVector(x0, omega).multiplyScalar(dt);
      S.hv.addScaledVector(j, -omega).multiplyScalar(e); S.hand.copy(S.tgt).add(x0.add(j).multiplyScalar(e)); }
    // 刃方向：朝目标方向转，并被手速拖拽（重量感）
    const lag = Math.min(0.5, S.hv.length() * 0.035 * S.wt);
    _b.copy(S.bladeT); if (lag > 0.01) _b.addScaledVector(S.hv.clone().normalize(), -lag);
    S.blade.lerp(_b.normalize(), Math.min(1, dt * 18 / S.wt)).normalize();
    placeWeapon();
    // 世界坐标刃线 + 扫掠命中
    const L = S.len; cam.updateMatrixWorld();
    _baseW.copy(S.hand).addScaledVector(S.blade, L * 0.3); _tipW.copy(S.hand).addScaledVector(S.blade, L * 0.95);
    cam.localToWorld(_baseW); cam.localToWorld(_tipW);
    if (S.lastTip && S.lastTip.distanceToSquared(_tipW) > 2.25) { S.lastTip = null; trail.pts.length = 0; } // 瞬移/传送：不把跳变当成挥砍
    if (S.lastTip) {
      _vel.copy(_tipW).sub(S.lastTip).divideScalar(Math.max(1e-3, dt)); S.tipSpeed = S.tipSpeed * 0.6 + _vel.length() * 0.4;
      if (S.tipSpeed > 3 && !S.rmb) { S.stam = Math.max(0, S.stam - dt * S.tipSpeed * 2.2); }
      if (S.tipSpeed > 6.5 && now - S.swingSnd > 0.28) { S.swingSnd = now; SFX.play('draw', Math.min(0.5, S.tipSpeed / 30), 1.6 + Math.random() * 0.3); }
      if (!S.rmb) sweep(now);
      pushTrail(_baseW, _tipW, S.rmb ? 0 : S.tipSpeed);
    }
    S.lastTip = (S.lastTip || new V3()).copy(_tipW); S.lastBase = (S.lastBase || new V3()).copy(_baseW);
    // HUD
    hud.d.style.display = 'block'; hud.b.style.width = Math.max(0, S.stam) + '%'; hud.b.style.background = S.stam < 25 ? 'linear-gradient(90deg,#ff6a5a,#ff3a3a)' : 'linear-gradient(90deg,#ffd27a,#ff9a3a)';
    hud.g.style.opacity = S.rmb ? 1 : 0; if (S.rmb) hud.g.textContent = '🛡️ ' + { up: '上', down: '下', left: '左', right: '右' }[S.gdir] + '格挡';
    for (const [k, t] of S.hitCd) if (now - t > 0.3) S.hitCd.delete(k);
  }
  function placeWeapon() {
    // 基：y = 刃方向；z 尽量指向运动方向（刃口领先）
    _y.copy(S.blade); _z.copy(S.hv); _z.addScaledVector(_y, -_z.dot(_y));
    if (_z.lengthSq() > 0.02) S.edge.lerp(_z.normalize(), 0.3); _z.copy(S.edge).addScaledVector(_y, -S.edge.dot(_y));
    if (_z.lengthSq() < 1e-4) _z.set(0, 0, 1).addScaledVector(_y, -_y.z); _z.normalize();
    _x.crossVectors(_y, _z).normalize(); _z.crossVectors(_x, _y);
    _m.makeBasis(_x, _y, _z); wpn.quaternion.setFromRotationMatrix(_m);
    wpn.position.copy(S.hand);
    if (S.shake > 0.0005) wpn.position.add(_t.set((Math.random() - 0.5) * S.shake, (Math.random() - 0.5) * S.shake, 0));
  }
  // 线段-球扫掠：刃上 5 个点，从上一帧位置到这一帧位置
  function sweep(now) {
    if (S.tipSpeed < 2 && S.thrust === 0) return;
    const center = G.player.pos; let list = [];
    for (const p of providers) { try { list = list.concat(p(center) || []); } catch (e) { console.warn(e); } }
    if (!list.length) return;
    for (let k = 1; k <= 5; k++) {
      const f = k / 5; const p0 = _cp.copy(S.lastBase).lerp(S.lastTip, f); const p1 = _seg.copy(_baseW).lerp(_tipW, f);
      for (const tg of list) {
        if (S.hitCd.has(tg.id)) continue;
        const d = segPointDist(p0, p1, tg.pos); if (d > tg.r) continue;
        const speed = S.thrust > 0 ? Math.max(S.tipSpeed, 5) : S.tipSpeed * f;
        if (speed < 2) continue;
        const info = { point: p1.clone(), vel: _vel.clone().multiplyScalar(f), speed, kind: S.thrust > 0 ? 'thrust' : 'slash', dir: dirName(), frac: f,
          seg: { b0: S.lastBase.clone(), t0: S.lastTip.clone(), b1: _baseW.clone(), t1: _tipW.clone() }, tipSpeed: S.thrust > 0 ? Math.max(S.tipSpeed, 5) : S.tipSpeed };
        const res = tg.onHit ? tg.onHit(info) : true;
        if (res === false) continue; // 目标说“刃其实没碰到身体”：不进冷却，这一刀继续扫
        S.hitCd.set(tg.id, now);
        const heavy = Math.min(1, speed / 10);
        S.stop = 0.03 + heavy * 0.06; S.shake = 0.004 + heavy * 0.012; if (G.kick) G.kick(heavy * 0.6);
      }
    }
  }
  function dirName() { const v = S.hv; return Math.abs(v.x) > Math.abs(v.y) ? (v.x > 0 ? 'right' : 'left') : (v.y > 0 ? 'up' : 'down'); }
  const _ab = new V3(), _ap = new V3();
  function segPointDist(a, b, p) { _ab.copy(b).sub(a); _ap.copy(p).sub(a); const t = Math.max(0, Math.min(1, _ap.dot(_ab) / Math.max(1e-8, _ab.lengthSq()))); return _ap.copy(a).addScaledVector(_ab, t).distanceTo(p); }
  // 屏震（在相机就位后、渲染前调用）
  function prerender() { if (drawn && S.shake > 0.0005) { cam.position.x += (Math.random() - 0.5) * S.shake * 1.5; cam.position.y += (Math.random() - 0.5) * S.shake * 1.5; } }

  const attach = (sc) => { if (trail && trail.m) sc.add(trail.m); if (trail) trail.pts.length = 0; };
  return { attach, init, toggle, onWeapon, onDown, onUp, onMove, update, prerender, addProvider, get drawn() { return drawn; }, get enabled() { return enabled; }, get state() { return S; }, get guardDir() { return S.rmb ? S.gdir : null; } };
})();
