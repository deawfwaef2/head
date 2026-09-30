// R41 · 第一人称兽人双手 + 武器动感 + 第一/第三人称切换（MOD fp_hands / view_toggle）
//   用户反馈：“战斗效果很劣质……能不能加第一/第三人称切换，第一人称能看见兽人的手”。
//   · 手：复用 recall_iw 已经在用的 limb_hand_*（从 VRM 身体取下来的手掌，放大 ×1.7、染兽人绿皮）+ 手指沿圆弧卷成握拳（按顶点弯曲，不是新模型）
//        + 前臂 + 皮护腕。右手握在武器柄上（柄轴 = 手的指节线），左手：大武器/格挡时托在柄尾，否则护在身侧；空手时是一对拳头。
//   · 武器动感：呼吸、走路摆动、转头拖拽（弹簧）、命中后坐 —— 只加在 Combat 每帧写好的武器姿势之上，不改判定。
//   · 第三人称（V）：见文件后半（TP）。
window.FPV = (() => {
  'use strict';
  const V3 = THREE.Vector3, Q = THREE.Quaternion, M4 = THREE.Matrix4;
  const modOn = (id) => !window.Mods || Mods.on(id) !== false;
  const onHands = () => modOn('fp_hands'), onView = () => modOn('view_toggle');
  let G = null, cam = null, vm = null, hooked = false;
  const HS = 1.35; // 兽人手比 VRM 手大
  const GL = new V3(0.008, -0.05, -0.085); // 握持点（手模型局部，缩放前）：柄穿过握紧的手指里
  const ELB_R = new V3(0.55, -1.0, 0.35), ELB_L = new V3(-0.55, -1.0, 0.35); // 相机空间的肘部锚点（画面外）
  const _a = new V3(), _b = new V3(), _c = new V3(), _X = new V3(), _Y = new V3(), _Z = new V3(), _m = new M4(), _mw = new M4(), _inv = new M4(), _q = new Q();
  const smooth = (cur, tgt, k, dt) => cur.lerp(tgt, 1 - Math.exp(-k * dt));

  // ---------------- 手资产 ----------------
  let HSRC = null, HLOAD = false;
  const HN = ['limb_hand_avatar', 'limb_hand_jean', 'limb_hand_amber', 'limb_hand_mona'];
  function b64buf(s) { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u.buffer; }
  function loadHandSrc() {
    if (HSRC || HLOAD) return; const A = window.Assets, nm = HN.find(n => A && A.has && A.has(n));
    if (nm) { HSRC = A.clone(nm); return; }
    const raw = HN.find(n => window.ASSETS && typeof ASSETS[n] === 'string'); if (!raw) return; HLOAD = true;
    new THREE.GLTFLoader().parse(b64buf(ASSETS[raw]), '', g => { HSRC = g.scene; HLOAD = false; }, () => { HLOAD = false; });
  }
  // 手指沿圆弧卷向掌心（掌心 -Y、手指 -Z；指根 u0 之后开始弯，总弯角 total，指长 Lf）
  function curl(geo, total, u0, Lf) {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), z = p.getZ(i), u = -z, s = u - u0; if (s <= 0) continue;
      const R = Lf / total, sc = Math.min(s, Lf), t = sc / R, ex = s - sc, nu = R * Math.sin(t) + y * Math.sin(t), ny = -R * (1 - Math.cos(t)) + y * Math.cos(t);
      p.setZ(i, -(u0 + nu + ex * Math.cos(t))); p.setY(i, ny - ex * Math.sin(t));
    }
    p.needsUpdate = true; geo.computeVertexNormals();
  }
  let MAT = null;
  function mats() {
    if (MAT) return MAT;
    return MAT = {
      skin: new THREE.MeshStandardMaterial({ color: '#5f8040', roughness: 0.66, emissive: '#22361a', emissiveIntensity: 0.35, side: THREE.DoubleSide }),
      dark: new THREE.MeshStandardMaterial({ color: '#2a1d18', roughness: 0.9 }),
      leather: new THREE.MeshStandardMaterial({ color: '#4a3020', roughness: 0.72, emissive: '#1a0f08', emissiveIntensity: 0.5 }),
      metal: new THREE.MeshStandardMaterial({ color: '#8a8478', roughness: 0.4, metalness: 0.7, emissive: '#22201c', emissiveIntensity: 0.4 }),
    };
  }
  function buildHand(mirror, curlTot) {
    const M = mats(), hand = new THREE.Group(), arm = new THREE.Group(), w = new THREE.Group();
    const m = HSRC.clone(true);
    m.traverse(o => { if (!o.isMesh) return; o.frustumCulled = false; o.renderOrder = 2; o.castShadow = false; o.receiveShadow = false;
      if (/cut/i.test(o.name)) o.material = M.dark; else { o.geometry = o.geometry.clone(); curl(o.geometry, curlTot, 0.058, 0.07); o.material = M.skin; } });
    w.add(m); w.scale.set(mirror ? -HS : HS, HS, HS); hand.add(w);
    // 前臂（+Z 指向肘部）+ 皮护腕（两道束带 + 铆钉环）
    const fa = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.033, 0.75, 16), M.skin); fa.rotation.x = Math.PI / 2; fa.position.z = 0.38; fa.frustumCulled = false; arm.add(fa);
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.0485, 0.0455, 0.13, 18), M.leather); br.rotation.x = Math.PI / 2; br.position.z = 0.09; br.frustumCulled = false; arm.add(br);
    for (const z of [0.04, 0.135]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0495, 0.0065, 8, 20), M.metal); ring.position.z = z; ring.frustumCulled = false; arm.add(ring); }
    const br2 = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.055, 0.08, 18), M.leather); br2.rotation.x = Math.PI / 2; br2.position.z = 0.27; br2.frustumCulled = false; arm.add(br2);
    arm.traverse(o => { if (o.isMesh) o.renderOrder = 2; });
    return { hand, arm, mirror, pos: new V3(), init: false };
  }
  let rig = null;
  function ensureRig() {
    if (rig) return rig; loadHandSrc(); if (!HSRC) return null;
    const g = new THREE.Group(); g.name = 'fpHands'; g.renderOrder = 2;
    const R = buildHand(true, 2.5), L = buildHand(false, 2.5);
    for (const H of [R, L]) { g.add(H.hand); g.add(H.arm); } cam.add(g); return rig = { g, R, L, lgrip: new V3(-0.3, -0.38, -0.44), lb: new V3(0, 1, 0) };
  }
  // 把一只手放到 cam 空间：握点 grip、柄轴 b、肘锚点 elbow
  function placeHand(H, grip, b, elbow) {
    _Z.copy(elbow).sub(grip); _Z.addScaledVector(b, -_Z.dot(b)); if (_Z.lengthSq() < 1e-6) _Z.set(0.5, 0, 0.85); _Z.normalize();
    _X.copy(b); if (H.mirror) _X.negate(); _Y.crossVectors(_Z, _X).normalize(); _X.crossVectors(_Y, _Z).normalize();
    const gx = H.mirror ? -GL.x : GL.x;
    H.hand.position.copy(grip).addScaledVector(_X, -gx * HS).addScaledVector(_Y, -GL.y * HS).addScaledVector(_Z, -GL.z * HS);
    _m.makeBasis(_X, _Y, _Z); H.hand.quaternion.setFromRotationMatrix(_m);
    H.arm.position.copy(H.hand.position); _b.copy(elbow).sub(H.hand.position).normalize(); H.arm.quaternion.setFromUnitVectors(_c.set(0, 0, 1), _b);
  }

  // ---------------- 武器动感（在 Combat 已写好的姿势上叠加）----------------
  const FX = { off: new V3(), offT: new V3(), rec: new V3(), tilt: 0, lastYaw: 0, lastPitch: 0, lastCam: new V3(), speed: 0, t: 0, init: false };
  function weaponFeel(dt, now, wpn, drawn) {
    const P = G.player; if (!FX.init) { FX.init = true; FX.lastYaw = P.yaw; FX.lastPitch = P.pitch; FX.lastCam.copy(cam.position); }
    const dy = Math.atan2(Math.sin(P.yaw - FX.lastYaw), Math.cos(P.yaw - FX.lastYaw)), dp = P.pitch - FX.lastPitch; FX.lastYaw = P.yaw; FX.lastPitch = P.pitch;
    const inv = 1 / Math.max(dt, 1e-3), yr = Math.max(-6, Math.min(6, dy * inv)), pr = Math.max(-6, Math.min(6, dp * inv));
    const hs = Math.hypot(cam.position.x - FX.lastCam.x, cam.position.z - FX.lastCam.z) * inv; FX.lastCam.copy(cam.position);
    FX.speed += (Math.min(7, hs) - FX.speed) * Math.min(1, dt * 8); if (!(P.onGround == null || P.onGround)) FX.speed *= 0.9;
    FX.offT.set(yr * 0.0085, -pr * 0.0085, 0); smooth(FX.off, FX.offT, 9, dt); FX.rec.multiplyScalar(Math.exp(-dt / 0.085));
    const k = Math.min(1, FX.speed / 4), bob = Math.sin(now * 9) * 0.011 * k, sway = Math.cos(now * 4.5) * 0.008 * k;
    const br = Math.sin(now * 1.7) * 0.0035 + Math.sin(now * 0.63) * 0.002;
    wpn.position.x += FX.off.x + sway + Math.sin(now * 1.1) * 0.0025; wpn.position.y += FX.off.y + bob + br; wpn.position.z += FX.rec.z;
    wpn.position.x += FX.rec.x; wpn.position.y += FX.rec.y;
    _q.setFromEuler(new THREE.Euler(FX.rec.z * 2.2 - pr * 0.004, 0, -yr * 0.012 - sway * 0.9, 'XYZ')); wpn.quaternion.multiply(_q);
  }
  function onStrike(t, d) { // 命中/格挡后坐：沿出刀反方向退一点
    if (!G) return; const C = window.Combat, S = C && C.state, v = S && S.sw && S.sw.v; const k = t === 'hit' ? (d && (d.charged || d.brk) ? 1.6 : 1) : t === 'blocked' || t === 'parry' || t === 'guardbreak' ? 1.3 : t === 'kill' ? 1.4 : 0;
    if (!k) return; FX.rec.z += 0.032 * k; if (v) { FX.rec.x -= v.x * 0.00004 * k * 100; FX.rec.y -= v.y * 0.00004 * k * 100; }
    FX.rec.clampLength(0, 0.09);
  }

  // ---------------- 每帧 ----------------
  function gripOf(wpn, out, gy) { return out.set(0, gy, 0).applyMatrix4(_mw); }
  function frame(dt, now) {
    if (!G) return; dt = Math.min(dt, 0.05);
    const wpn = G.weapon, hands = onHands(), tp = TP.active();
    // 旧的圆柱手臂 / 球拳头：启用新手时隐藏
    if (vm) for (const o of vm.children) if (o.isMesh && o.geometry && o.geometry.type === 'CylinderGeometry' && o !== wpn) o.visible = !hands;
    if (G.fist && hands) G.fist.visible = false;
    const r = hands ? ensureRig() : null; if (rig) rig.g.visible = false;
    const C = window.Combat, drawn = !!(C && C.drawn);
    if (wpn && vm && vm.visible && !tp && drawn) weaponFeel(dt, now, wpn, drawn);
    if (!r || !wpn || !vm || !vm.visible || tp) { if (window.FPV && FPV.tp) FPV.tp.frame(dt, now); return; }
    r.g.visible = true; cam.updateMatrixWorld(); wpn.updateMatrixWorld(true);
    _inv.copy(cam.matrixWorld).invert(); _mw.multiplyMatrices(_inv, wpn.matrixWorld);
    const asset = !!(wpn.userData && wpn.userData.asset), gy = asset ? -0.02 : 0;
    const grip = gripOf(wpn, new V3(), gy + 0.03), b = new V3(0, 1, 0).transformDirection(_mw).normalize();
    placeHand(r.R, grip, b, ELB_R);
    // 左手
    const S = C && C.state, len = (wpn.userData && wpn.userData.len) || 0.8, two = drawn && (len >= 1.0 || (S && S.rmb));
    let lg, lb;
    if (two) { lg = gripOf(wpn, new V3(), gy - 0.085); lb = b.clone(); }
    else { const H = S && drawn ? S.hand : null; lg = new V3(-0.3 + (H ? (H.x - 0.26) * 0.25 : 0), -0.4 + (H ? (H.y + 0.3) * 0.25 : 0) + Math.sin(now * 1.7 + 1) * 0.004, -0.42 + (H ? (H.z + 0.5) * 0.2 : 0)); lb = new V3(0.75, 0.5, -0.4).normalize(); }
    if (!r.lInit) { r.lgrip.copy(lg); r.lb.copy(lb); r.lInit = true; } else { smooth(r.lgrip, lg, two ? 22 : 10, dt); smooth(r.lb, lb, 14, dt); }
    placeHand(r.L, r.lgrip, r.lb.clone().normalize(), ELB_L);
    if (FPV.tp) FPV.tp.frame(dt, now);
  }

  // ---------------- 第三人称 ----------------
  // 身体：Quaternius「Goblin Animated」CC0（assets/ogre_body.js，FBX→GLB），放大成兽人、染绿皮；动作 Idle/Walk/Run/Jump/Attack/Attack2。
  // 逻辑：战斗判定始终按第一人称（眼睛位置的镜头）算；第三人称只是 HOOK.pre 里把相机挪到身后（渲染完在微任务里还原，不影响拾取/瞄准），
  //      武器按“第一人称算好的真实位置”画在世界里，右臂（持双手武器时左臂也）做两段 IK 够到握柄 —— 所以刀划过哪里、就砍在哪里。
  const TP = (() => {
    const T = { want: false, ready: false, loading: false, body: null, root: null, mixer: null, act: {}, bones: {}, cur: '', H: 1.75, scale: 1, yaw: 0, wclone: null, wsrc: null, dist: 2.6, atkT: 0, atkAct: null, lastSw: null, lastThrust: 0, alt: 0, fpPos: new V3(), fpQuat: new Q(), fpEuler: new THREE.Euler(0, 0, 0, 'YXZ'), lastCam: new V3(), sp: 0, vel: new V3(), init: false, restore: null };
    const UPPER = new Set(['Abdomen', 'Torso', 'ShoulderL', 'ShoulderR', 'UpperArmL', 'UpperArmR', 'LowerArmL', 'LowerArmR', 'PalmL', 'PalmR', 'MiddleHandL', 'MiddleHandR', 'FingersL', 'FingersR', 'Neck', 'Head']);
    const KEY = 'soulhead_view';
    try { T.want = localStorage.getItem(KEY) === 'tp'; } catch (e) { }
    const curScene = () => { const W = window.Worlds && Worlds.active && Worlds._W && Worlds._W.B; return (W && W.sc) || (G && G.scene); };
    const _A = new V3(), _B = new V3(), _C = new V3(), _D = new V3(), _E = new V3(), _wq = new Q(), _pq = new Q(), _q1 = new Q();
    function load() {
      if (T.ready || T.loading || !window.OGRE_BODY || !window.THREE.GLTFLoader) return; T.loading = true;
      new THREE.GLTFLoader().parse(b64buf(window.OGRE_BODY), '', g => {
        const root = g.scene, body = new THREE.Group(); body.add(root);
        const M = { Skin: ['#4c7a30', 0.8], BeltBoots: ['#2b1c12', 0.9], Pants: ['#3a2f28', 0.9], Shirt: ['#6b4428', 0.85], Eyebrows: ['#1a100a', 0.9], Eyes: ['#fff0b0', 0.4] };
        root.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; o.receiveShadow = false; const fix = m => { const c = M[m.name] || ['#5f8a3a', 0.8]; const n = new THREE.MeshStandardMaterial({ color: c[0], roughness: c[1], metalness: 0, flatShading: true, emissive: m.name === 'Eyes' ? '#aa8820' : c[0], emissiveIntensity: m.name === 'Eyes' ? 0.6 : 0.07 }); return n; }; o.material = Array.isArray(o.material) ? o.material.map(fix) : fix(o.material); }
          if (o.isBone) T.bones[o.name] = o; });
        root.updateMatrixWorld(true);
        const bb = new THREE.Box3(); root.traverse(o => { if (o.isBone) bb.expandByPoint(o.getWorldPosition(new V3())); });
        T.scale = T.H / Math.max(0.5, bb.max.y - Math.min(0, bb.min.y)); root.scale.multiplyScalar(T.scale); T.root = root; T.body = body;
        T.mixer = new THREE.AnimationMixer(root);
        for (const c of g.animations) T.act[c.name] = T.mixer.clipAction(c);
        for (const n of ['Attack', 'Attack2']) { const c = g.animations.find(x => x.name === n); if (c) { const u = new THREE.AnimationClip(n + 'U', c.duration, c.tracks.filter(tr => UPPER.has(tr.name.split('.')[0]))); T.act[n + 'U'] = T.mixer.clipAction(u); } }
        for (const k of ['Idle', 'Walk', 'Run']) if (T.act[k]) { T.act[k].setLoop(THREE.LoopRepeat, Infinity); }
        for (const k of ['AttackU', 'Attack2U']) if (T.act[k]) { T.act[k].setLoop(THREE.LoopOnce, 1); T.act[k].clampWhenFinished = true; }
        play('Idle', 0); T.ready = true; T.loading = false; body.visible = false; const sc = curScene(); sc && sc.add(body);
      }, () => { T.loading = false; });
    }
    function play(n, fade) { const a = T.act[n]; if (!a || T.cur === n) return; a.reset().setEffectiveWeight(1).play(); const o = T.act[T.cur]; if (o && fade > 0) o.crossFadeTo(a, fade, false); else if (o) o.stop(); T.cur = n; }
    function setView(v, silent) {
      T.want = v === 'tp'; try { localStorage.setItem(KEY, T.want ? 'tp' : 'fp'); } catch (e) { }
      if (T.want) load(); if (!silent && G && G.toast) G.toast(T.want ? '🎥 第三人称（V 切回第一人称）' : '👁️ 第一人称（V 切换第三人称）', '#cfe8ff', 1.6);
    }
    function blocked() { return !G || !G.playing || G.uiOpen || G.held || (window.RecallIW && RecallIW.active) || (window.Recall && Recall.open && Recall.open.call && false); }
    const active = () => T.want && T.ready && !blocked() && onView();
    // -------- 两段 IK：让 hd 够到世界坐标 tgt，肘部朝 pole --------
    function rotW(bone, q) { bone.getWorldQuaternion(_wq); _wq.premultiply(q); if (bone.parent) { bone.parent.getWorldQuaternion(_pq); _pq.invert(); } else _pq.identity(); bone.quaternion.copy(_pq.multiply(_wq)); bone.updateMatrixWorld(true); }
    function ik(up, lo, hd, tgt, pole) {
      up.getWorldPosition(_A); lo.getWorldPosition(_B); hd.getWorldPosition(_C);
      const l1 = _A.distanceTo(_B), l2 = _B.distanceTo(_C); let d = _A.distanceTo(tgt); d = Math.max(Math.abs(l1 - l2) + 1e-3, Math.min(l1 + l2 - 1e-3, d));
      _D.copy(tgt).sub(_A).normalize(); const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
      _E.copy(pole).sub(_A); _E.addScaledVector(_D, -_E.dot(_D)); if (_E.lengthSq() < 1e-6) _E.set(0, -1, 0); _E.normalize();
      const elbow = new V3().copy(_A).addScaledVector(_D, a).addScaledVector(_E, h), wrist = new V3().copy(_A).addScaledVector(_D, d);
      _q1.setFromUnitVectors(_B.clone().sub(_A).normalize(), elbow.clone().sub(_A).normalize()); rotW(up, _q1);
      lo.getWorldPosition(_B); hd.getWorldPosition(_C); _q1.setFromUnitVectors(_C.clone().sub(_B).normalize(), wrist.clone().sub(_B).normalize()); rotW(lo, _q1);
    }
    const fpCam = { p: new V3() };
    function frameTP(dt, now) {
      const wpn = G.weapon, on = active();
      if (T.body) { T.body.visible = on; const sc = curScene(); if (sc && T.body.parent !== sc) sc.add(T.body); }
      if (T.wclone) T.wclone.visible = on;
      if (!on) { T.init = false; if (T.hid) { T.hid = false; if (vm) vm.visible = true; } return; }
      const P = G.player, C = window.Combat, S = C && C.state, drawn = !!(C && C.drawn);
      cam.updateMatrixWorld(true);
      // 第一人称（眼睛）相机位姿：本帧 Combat 已按它算完
      T.fpPos.copy(cam.position); T.fpEuler.copy(cam.rotation); T.fpQuat.copy(cam.quaternion);
      if (!T.init) { T.init = true; T.lastCam.copy(cam.position); T.yaw = P.yaw + Math.PI; }
      T.vel.set((cam.position.x - T.lastCam.x) / Math.max(dt, 1e-3), 0, (cam.position.z - T.lastCam.z) / Math.max(dt, 1e-3)); if (T.vel.length() > 14) T.vel.set(0, 0, 0); T.lastCam.copy(cam.position);
      T.sp += (T.vel.length() - T.sp) * Math.min(1, dt * 10);
      // 身体朝向跟着视线（出刀时更快）
      const want = P.yaw + Math.PI; let dy = Math.atan2(Math.sin(want - T.yaw), Math.cos(want - T.yaw)); T.yaw += dy * Math.min(1, dt * (T.atkT > 0 ? 18 : 10));
      const crouch = P.crouch || 0, feet = cam.position.y - (P.h || 1.45);
      T.body.position.set(cam.position.x, feet, cam.position.z); T.body.rotation.y = T.yaw; T.body.scale.set(1.08, 1 - 0.18 * crouch, 1.08);
      // 动作：Idle / Walk / Run（Walk 倒走 = 负速度）
      const fwd = new V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), back = T.vel.dot(fwd) < -0.5;
      const loco = T.sp < 0.5 ? 'Idle' : T.sp < 4.4 ? 'Walk' : 'Run'; play(loco, 0.18);
      const a = T.act[loco]; if (a) a.timeScale = loco === 'Walk' ? Math.max(0.6, T.sp / 2.2) * (back ? -1 : 1) : loco === 'Run' ? Math.max(0.8, T.sp / 5.2) : 1;
      // 出刀：上半身攻击动作（覆盖）
      const sw = S && S.sw, th = S ? S.thrust : 0;
      if (drawn && ((sw && sw !== T.lastSw) || (th > 0 && !(T.lastThrust > 0)))) { const n = (T.alt++ % 2) ? 'Attack2U' : 'AttackU', aa = T.act[n]; if (aa) { if (T.atkAct && T.atkAct !== aa) T.atkAct.stop(); aa.reset(); aa.timeScale = Math.max(1.3, Math.min(3.5, aa.getClip().duration / Math.max(0.3, ((sw && sw.dur) || 0.3) * 1.6))); aa.setEffectiveWeight(30); aa.play(); T.atkAct = aa; T.atkT = aa.getClip().duration / aa.timeScale; } }
      T.lastSw = sw; T.lastThrust = th;
      if (T.atkT > 0) { T.atkT -= dt; const k = Math.min(1, T.atkT / 0.14); if (T.atkAct) T.atkAct.setEffectiveWeight(30 * Math.max(0.02, k)); if (T.atkT <= 0 && T.atkAct) { T.atkAct.stop(); T.atkAct = null; } }
      T.mixer.update(dt); T.body.updateMatrixWorld(true);
      // 武器：画在第一人称算好的世界位置；没拔刀就挂在右手上
      if (wpn) {
        if (T.wsrc !== wpn) { if (T.wclone && T.wclone.parent) T.wclone.parent.remove(T.wclone); T.wsrc = wpn; T.wclone = wpn.clone(true); T.wclone.traverse(o => { o.frustumCulled = false; }); T.wclone.matrixAutoUpdate = false; }
        const sc = curScene(); if (sc && T.wclone.parent !== sc) sc.add(T.wclone);
        wpn.updateMatrixWorld(true);
        T.wclone.matrix.copy(wpn.matrixWorld); T.wclone.matrixWorld.copy(T.wclone.matrix); T.wclone.visible = drawn;
        // 右臂 IK 到握柄（拔刀时）；双手武器 / 格挡时左臂也上
        if (drawn) {
          const asset = !!(wpn.userData && wpn.userData.asset), gy = asset ? -0.02 : 0, B = T.bones, len = (wpn.userData && wpn.userData.len) || 0.8;
          const right = new V3(Math.cos(P.yaw), 0, -Math.sin(P.yaw)), ppR = new V3();
          if (B.UpperArmR && B.LowerArmR && B.PalmR) { B.UpperArmR.getWorldPosition(ppR); const gp = new V3(0, gy + 0.03, 0).applyMatrix4(wpn.matrixWorld); ik(B.UpperArmR, B.LowerArmR, B.PalmR, gp, ppR.clone().addScaledVector(right, 0.6).add(new V3(0, -1, 0)).addScaledVector(fwd, -0.3)); }
          if ((len >= 1.0 || (S && S.rmb)) && B.UpperArmL && B.LowerArmL && B.PalmL) { const ppL = new V3(); B.UpperArmL.getWorldPosition(ppL); const gp = new V3(0, gy - 0.085, 0).applyMatrix4(wpn.matrixWorld); ik(B.UpperArmL, B.LowerArmL, B.PalmL, gp, ppL.clone().addScaledVector(right, -0.6).add(new V3(0, -1, 0)).addScaledVector(fwd, -0.3)); }
        }
      }
    }
    // -------- 相机 --------
    function okPoint(p) {
      const W = window.Worlds && Worlds.active && Worlds._W && Worlds._W.B;
      if (W) { if (Math.hypot(p.x, p.z) > W.R - 0.45) return false; if (W.H && p.y < W.H(p.x, p.z) + 0.22) return false; for (const c of W.cols || []) { if (p.y < 3 && Math.hypot(p.x - c.x, p.z - c.z) < c.r + 0.18) return false; } return true; }
      const cv = G.cave; if (cv) { if (Math.hypot(p.x, p.z) > cv.R - 0.4) return false; if (cv.H && p.y > cv.H - 0.25) return false; if (cv.floorAt && p.y < cv.floorAt(p.x, p.z) + 0.2) return false; for (const c of cv.pillars || []) { if (p.y < c.h + 0.3 && Math.hypot(p.x - c.x, p.z - c.z) < c.r + 0.2) return false; } }
      return true;
    }
    function preTP(dt, now) {
      const on = active(); if (on) { vm.visible = false; T.hid = true; if (rig) rig.g.visible = false; }
      if (!on) return;
      const eye = T.fpPos, ex = T.fpEuler; const q = T.fpQuat;
      const desired = new V3(0.6, 0.32, 3.0);
      const dirs = desired.clone().applyQuaternion(q), head = eye.clone().add(new V3(0, 0.05, 0));
      let best = 0; for (let i = 1; i <= 12; i++) { const f = i / 12; const p = head.clone().addScaledVector(dirs, f); if (!okPoint(p)) break; best = f; }
      best = Math.max(0.12, best - 0.06); T.dist += (best - T.dist) * (best < T.dist ? 1 : Math.min(1, dt * 3)); if (!isFinite(T.dist) || T.dist > 1) T.dist = best;
      const f0 = Math.min(1, T.dist); cam.position.copy(head).addScaledVector(dirs, f0);
      // 准星收敛到眼睛前方 ~10 米：向左转一点、向下压一点
      cam.rotation.set(ex.x - 0.03 * f0, ex.y + 0.05 * f0, 0, 'YXZ'); cam.updateMatrixWorld(true);
      T.p0 = T.p0 || new V3(); T.e0 = T.e0 || new THREE.Euler(0, 0, 0, 'YXZ'); T.p0.copy(eye); T.e0.copy(ex);
      if (!T.restore) { T.restore = true; Promise.resolve().then(() => { cam.position.copy(T.p0); cam.rotation.copy(T.e0); cam.updateMatrixWorld(true); T.restore = null; }); }
    }
    addEventListener('keydown', e => {
      if (e.code !== 'KeyV' || e.repeat || !G || !onView() || !G.playing || G.uiOpen || G.held || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.stopImmediatePropagation(); setView(T.want ? 'fp' : 'tp');
    }, true);
    return { active, setView, load, frame: frameTP, pre: preTP, get want() { return T.want; }, _T: T, ik };
  })();

  function init(game) {
    if (hooked) return; G = game; cam = G.camera; vm = G.vm; hooked = true; loadHandSrc();
    if (G.HOOK) { G.HOOK.frame.push(frame); G.HOOK.pre.push((dt, now) => TP.pre(dt, now)); } if (TP.want) TP.load();
    const wrap = () => { if (!window.CombatFX) return false; if (CombatFX._fpvw) return true; const o = CombatFX.event; CombatFX.event = function (t, fo, d) { let r; try { r = o.apply(this, arguments); } finally { try { onStrike(t, d); } catch (e) { } } return r; }; CombatFX._fpvw = true; return true; };
    const go = () => { if (!wrap()) setTimeout(go, 400); }; go();
  }
  return { init, onStrike, frame, pre: (dt, now) => TP.pre(dt, now), get rig() { return rig; }, TP, tp: TP, setView: v => TP.setView(v), _curl: curl };
})();
