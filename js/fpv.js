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
  const TP = { active: () => false };

  function init(game) {
    if (hooked) return; G = game; cam = G.camera; vm = G.vm; hooked = true; loadHandSrc();
    if (G.HOOK) G.HOOK.frame.push(frame);
    const wrap = () => { if (!window.CombatFX) return false; if (CombatFX._fpvw) return true; const o = CombatFX.event; CombatFX.event = function (t, fo, d) { let r; try { r = o.apply(this, arguments); } finally { try { onStrike(t, d); } catch (e) { } } return r; }; CombatFX._fpvw = true; return true; };
    const go = () => { if (!wrap()) setTimeout(go, 400); }; go();
  }
  return { init, onStrike, get rig() { return rig; }, TP, tp: null, _curl: curl };
})();
