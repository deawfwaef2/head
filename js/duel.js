// R54 MOD foe_duel（默认开）：新敌人类型——近战不播固定攻击动画，而是程序化摆出“准备攻击的角度”：
// 刀举到来刀一侧（右臂两节 IK + 刀身朝向），身前浮出一道来刀轨迹弧，准星外圈同步显示来刀方向 → 快速斩过 → 收招。
// 剑斗士：2~3 连斩每刀换方向，偶尔在最后一刻变向（佯攻）；重剑卫：前摇长、多为重击（橙色，挡不住要完美格挡/闪）；疾刃手：快、轻、连斩。
// 钩子：foe.js populate → assign（在职业分配之前）；attack → attack()；每帧 mixer 之后 → post()；foe_roles.js assign 跳过 fo.duel。
window.FoeDuel = (() => {
  const on = () => !window.Mods || Mods.on('foe_duel') !== false;
  const V3 = THREE.Vector3, Qt = THREE.Quaternion, D2R = Math.PI / 180;
  const TYPES = {
    duelist: { n: '剑斗士', ic: '⚔️', w: 0.5, wu: [0.6, 0.85], strike: 0.15, chain: [1, 3], feint: 0.22, dmg: 1.0, heavyP: 0.12, hp: 1.1, spd: 1.05, col: '#ff7a6a', tip: '出刀前会把刀举到来刀一侧——看清方向，右键格挡并把鼠标转到那一侧；她连斩会换方向，还会在最后一刻变向' },
    brute: { n: '重剑卫', ic: '🗡️', w: 0.25, wu: [1.0, 1.3], strike: 0.22, chain: [1, 1], feint: 0.04, dmg: 1.5, heavyP: 0.65, hp: 1.45, spd: 0.85, col: '#ffa04a', tip: '前摇很长、多为橙色重击：普通格挡挡不住——在刀落下那一瞬完美格挡，或按 Q 闪开再反击' },
    twin: { n: '疾刃手', ic: '🌪️', w: 0.25, wu: [0.38, 0.5], strike: 0.11, chain: [2, 3], feint: 0.1, dmg: 0.7, heavyP: 0, hp: 0.85, spd: 1.2, col: '#ff6a9a', tip: '出手快、连斩多但每刀很轻：别贪刀，挡住整串再还手' },
    warlord: { n: '霸主', ic: '👑', w: 0, wu: [0.5, 0.75], strike: 0.16, chain: [2, 4], feint: 0.25, dmg: 1.0, heavyP: 0.35, hp: 1, spd: 1, col: '#ffd060', tip: '' }
  };
  const ALL = () => !window.Mods || Mods.on('duel_all') !== false;
  const DIRS = [90, 135, 45, 180, 0, -135, -45, 160, 20];
  const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
  const easeIn = x => x < 0 ? 0 : x > 1 ? 1 : x * x * x;

  function assign(fo, r, it) {
    const all = ALL(); if (!on() || (!all && (it.boss || r() > 0.42))) return false;
    if (!fo.wpn) { try { fo.wpn = Foe.attachWeapon(fo.f, ['antique_katana_01', 'antique_estoc', 'machete'][Math.floor(r() * 3)]); } catch (e) { fo.wpn = null; } if (!fo.wpn) return false; fo.armed = true; }
    let x = r(), k = 'duelist'; for (const kk in TYPES) { if ((x -= TYPES[kk].w) <= 0) { k = kk; break; } } if (it.boss) k = 'warlord';
    const T = TYPES[k]; fo.duel = { k, T, w: 0, set: null, orig: null, axL: null, rib: null, shown: !!it.boss, lastDir: null };
    if (!all) { fo.spdMul = T.spd; fo.maxHp = fo.hp = Math.max(8, Math.round(fo.maxHp * T.hp)); } fo.iq = Math.min(1.1, fo.iq + 0.15); // duel_all：体型/血量交给职业，这里只管出刀方式
    return true;
  }
  function label(fo) {
    const D = fo.duel; if (D.shown || !fo.seen) return; D.shown = true; const C = window.Foe && Foe.ctx(); if (!C) return;
    try { C.say(fo.anchor, `${D.T.ic}${D.T.n}`, D.T.col); } catch (e) { }
    if (!FoeDuel.tipped) FoeDuel.tipped = {}; if (!FoeDuel.tipped[D.k] && C.toast) { FoeDuel.tipped[D.k] = 1; C.toast(`${D.T.ic} ${D.T.n}：${D.T.tip}`, D.T.col, 3.6); }
  }
  function pickDir(prev) { let a; for (let i = 0; i < 6; i++) { a = DIRS[Math.floor(Math.random() * DIRS.length)]; if (prev == null || Math.abs(((a - prev + 540) % 360) - 180) > 60) break; } return a; }

  function attack(fo, d, force) {
    if (!on() || !fo.duel || (force && /Throw/.test(force))) return false;
    if (fo.role === 'ranged' && d >= 3.2) return false; // 投掷手远距离仍然扔刀
    const C = Foe.ctx(); if (!C) return false; const T = fo.duel.T, s = C.st(), tr = fo.tier || 0; // R54g foe_levels：阶位越高连斩越长、佯攻/重击越多、前摇越短
    const n = T.chain[0] + Math.floor(Math.random() * (T.chain[1] - T.chain[0] + 1)) + (tr >= 2 ? 1 : 0) + (tr >= 3 && Math.random() < 0.5 ? 1 : 0), wu = (T.wu[0] + Math.random() * (T.wu[1] - T.wu[0])) * (1 - 0.06 * tr);
    const hits = []; let t = wu, prev = fo.duel.lastDir;
    for (let i = 0; i < n; i++) { const a = pickDir(prev); prev = a; const heavy = Math.random() < T.heavyP + 0.07 * tr && (i === n - 1 || (tr >= 3 && Math.random() < 0.3));
      hits.push({ t, a: a * D2R, ang: a * D2R, heavy, thrust: false, deg: a, st: i ? t - (T.strike + 0.32) : 0 }); t += T.strike + 0.36 + Math.random() * 0.14 + (heavy ? 0.2 : 0); }
    fo.duel.lastDir = prev;
    const end = hits[n - 1].t + 0.55, act = { time: 0, timeScale: 1, getClip: () => ({ duration: end }) };
    const base = fo.boss ? (fo.rage ? 0.08 : 0.07) : 0.03 + fo.rar * 0.014 + 0.02;
    fo.atk = { clip: 'duel', act, hits, hi: 0, ws: 1, ws2: 1, end, lunge: 0, holdAt: 0, hold: 0, feint: false, reach: 1.95, tot: 0, duel: true,
      dfeint: Math.random() < T.feint + 0.08 * tr ? 0.55 + Math.random() * 0.2 : 0, dmg: Math.max(1, Math.round(s.maxHp * base * T.dmg * (fo.dmgMul || 1) * (0.85 + Math.random() * 0.3))) };
    if (window.FoeAI2) try { FoeAI2.tune(fo, fo.atk, d); } catch (e) { }
    fo.atk.ws = Math.max(0.75, Math.min(1.15, fo.atk.ws || 1)); fo.atk.ws2 = fo.atk.ws; fo.atk.hold = Math.min(0.25, fo.atk.hold || 0); fo.atk.feint = false;
    try { if (C.windup) C.windup(fo, hits.some(h => h.heavy) ? 'Sword_Attack' : 'Sword_Regular_A'); } catch (e) { }
    return true;
  }

  // ---------- 程序化右臂：两节 IK + 刀身朝向 ----------
  const _S = new V3(), _E = new V3(), _H = new V3(), _T = new V3(), _a = new V3(), _b = new V3(), _p = new V3(), _q = new Qt(), _wq = new Qt(), _pq = new Qt();
  const _F = new V3(), _L = new V3(), _U = new V3(0, 1, 0), _O = new V3(), _P0 = new V3(), _P1 = new V3(), _P2 = new V3(), _D0 = new V3(), _D1 = new V3(), _D2 = new V3(), _Dw = new V3();
  function rotTo(bone, from, to) {
    if (from.lengthSq() < 1e-8 || to.lengthSq() < 1e-8) return; _q.setFromUnitVectors(from.normalize(), to.normalize());
    bone.getWorldQuaternion(_wq); _wq.premultiply(_q); bone.parent.getWorldQuaternion(_pq); bone.quaternion.copy(_pq.invert().multiply(_wq)); bone.updateMatrixWorld(true);
  }
  function weaponAxis(fo) {
    const D = fo.duel; if (D.axL) return D.axL; const hd = fo.f.bones.rightHand; if (!hd || !fo.wpn) return null;
    fo.f.root.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(fo.wpn); hd.getWorldPosition(_H);
    let best = null, bd = -1; for (let i = 0; i < 8; i++) { _p.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z); const dd = _p.distanceTo(_H); if (dd > bd) { bd = dd; best = _p.clone(); } }
    if (!best || bd < 0.15) return null; hd.getWorldQuaternion(_wq); D.axL = best.sub(_H).normalize().applyQuaternion(_wq.invert()); return D.axL;
  }
  function ik(fo, tgt, dirW) {
    const B = fo.f.bones, ua = B.rightUpperArm, la = B.rightLowerArm, hd = B.rightHand; if (!ua || !la || !hd) return false;
    ua.getWorldPosition(_S); la.getWorldPosition(_E); hd.getWorldPosition(_H);
    const l1 = _S.distanceTo(_E), l2 = _E.distanceTo(_H); if (l1 < 1e-3 || l2 < 1e-3) return false;
    _T.copy(tgt).sub(_S); let dl = _T.length(); const mx = (l1 + l2) * 0.985; if (dl > mx) { _T.multiplyScalar(mx / dl); dl = mx; } if (dl < Math.abs(l1 - l2) + 0.02) { _T.setLength(Math.abs(l1 - l2) + 0.02); dl = _T.length(); }
    const dir = _a.copy(_T).normalize(); _T.add(_S);
    _p.copy(_U).multiplyScalar(-0.75).addScaledVector(_L, -0.55).addScaledVector(_F, -0.25); _p.addScaledVector(dir, -_p.dot(dir)); if (_p.lengthSq() < 1e-6) _p.set(0, -1, 0); _p.normalize(); // 肘向外下
    const ca = (l1 * l1 - l2 * l2 + dl * dl) / (2 * dl), h = Math.sqrt(Math.max(0, l1 * l1 - ca * ca));
    _b.copy(_S).addScaledVector(dir, ca).addScaledVector(_p, h); // 新肘位
    rotTo(ua, _E.clone().sub(_S), _b.clone().sub(_S));
    la.getWorldPosition(_E); hd.getWorldPosition(_H); rotTo(la, _H.clone().sub(_E), _T.clone().sub(_E));
    const ax = weaponAxis(fo); if (ax && dirW) { hd.getWorldQuaternion(_wq); rotTo(hd, ax.clone().applyQuaternion(_wq), dirW.clone()); }
    return true;
  }
  // 敌人局部（x=她的左，y=上，z=前）→ 世界
  function W(out, x, y, z) { return out.copy(_O).addScaledVector(_L, x).addScaledVector(_U, y).addScaledVector(_F, z); }
  function Wd(out, x, y, z) { return out.set(0, 0, 0).addScaledVector(_L, x).addScaledVector(_U, y).addScaledVector(_F, z).normalize(); }
  function poseFor(deg, heavy) { // 来刀角（玩家屏幕）→ 蓄势/命中/收势 的手位与刀向
    const c = Math.cos(deg * D2R), s = Math.sin(deg * D2R), R = heavy ? 0.6 : 0.52;
    W(_P0, c * R * 0.85 - 0.12, s * R * 0.75 + 0.18, -0.08); Wd(_D0, c, s + 0.25, -0.7);
    W(_P1, -0.08, 0.04, 0.52); Wd(_D1, -c * 0.35, -s * 0.35, 1);
    W(_P2, -c * R * 0.7 - 0.12, -s * R * 0.55 - 0.05, 0.32); Wd(_D2, -c, -s, 0.35);
  }
  const _tmp = new V3(), _tmp2 = new V3();
  function post(fo, dt) {
    const D = fo.duel; if (!D) return; label(fo);
    const B = fo.f.bones, bones = [B.rightUpperArm, B.rightLowerArm, B.rightHand]; if (!bones[0] || !bones[1] || !bones[2]) return;
    if (D.set) for (let i = 0; i < 3; i++) if (bones[i].quaternion.equals(D.set[i])) bones[i].quaternion.copy(D.orig[i]); // mixer 没写这根骨头：先还原，避免逐帧累积
    const A = fo.atk && fo.atk.duel ? fo.atk : null;
    if (A) A.act.time += dt * (A.act.timeScale == null ? 1 : A.act.timeScale);
    const want = A && !fo.dead && !(fo.stag > 0) ? 1 : 0; D.w += (want - D.w) * Math.min(1, dt * (want ? 9 : 5));
    rib(fo, A); if (D.w < 0.01 || fo.dead) { D.set = null; return; }
    // 局部基
    const ch = B.upperChest || B.chest || B.spine; if (!ch) return; ch.getWorldPosition(_O);
    _F.set(Math.sin(fo.yaw), 0, Math.cos(fo.yaw)); _L.set(Math.cos(fo.yaw), 0, -Math.sin(fo.yaw));
    let tgt = null, dir = null;
    if (A) {
      const t = A.act.time, h = A.hits[A.hi] || A.hits[A.hits.length - 1], T = D.T, sd = T.strike * (h.heavy ? 1.3 : 1);
      if (A.dfeint && A.hi === 0 && !A.fed && t > h.t * A.dfeint) { A.fed = 1; const nd = pickDir(h.deg); h.deg = nd; h.a = h.ang = nd * D2R; try { Foe.ctx().say(fo.anchor, '……！', '#ffd0a0'); } catch (e) { } } // 佯攻：最后一刻变向
      poseFor(h.deg, h.heavy);
      if (!A.hits[A.hi] && t > h.t + 0.12) { const k = ease((t - h.t - 0.12) / 0.35); tgt = _tmp.copy(_P2).lerp(_P1, k * 0.4); dir = _tmp2.copy(_D2); D.w = Math.min(D.w, 1 - k); }
      else if (t < h.t - sd) { const k = ease((t - (h.st || 0)) / Math.max(0.12, h.t - sd - (h.st || 0))); tgt = _tmp.copy(_P1).lerp(_P0, k); dir = _tmp2.copy(_D1).lerp(_D0, k).normalize(); if (h.heavy) tgt.addScaledVector(_U, 0.04 * Math.sin(t * 40) * k); }
      else { const u = easeIn(Math.min(1, (t - (h.t - sd)) / (sd + 0.08))); if (u < 0.6) { const k = u / 0.6; tgt = _tmp.copy(_P0).lerp(_P1, k); dir = _tmp2.copy(_D0).lerp(_D1, k).normalize(); } else { const k = (u - 0.6) / 0.4; tgt = _tmp.copy(_P1).lerp(_P2, k); dir = _tmp2.copy(_D1).lerp(_D2, k).normalize(); } }
    } else return;
    const orig = bones.map(b => b.quaternion.clone());
    if (!ik(fo, tgt, dir)) return;
    if (D.w < 0.999) for (let i = 0; i < 3; i++) { bones[i].quaternion.slerpQuaternions(orig[i], bones[i].quaternion.clone(), D.w); }
    bones[0].updateMatrixWorld(true);
    D.orig = orig; D.set = bones.map(b => b.quaternion.clone());
  }

  // ---------- 身前的来刀轨迹弧（世界空间丝带）----------
  const RN = 18;
  function mkRib(C) {
    const g = new THREE.BufferGeometry(), pos = new Float32Array(RN * 2 * 3), al = new Float32Array(RN * 2), idx = [];
    for (let i = 0; i < RN - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('al', new THREE.BufferAttribute(al, 1));
    const m = new THREE.ShaderMaterial({ uniforms: { uC: { value: new THREE.Color('#ff5040') }, uK: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: 'attribute float al; varying float vA; void main(){ vA = al; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uC; uniform float uK; varying float vA; void main(){ gl_FragColor = vec4(uC * uK * vA * 2.2, 1.0); }' });
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 7; mesh.userData.noShadow = true; mesh.visible = false; C.sc.add(mesh); return mesh;
  }
  const _r0 = new V3(), _r1 = new V3(), _rc = new V3(), _rt = new V3(), _rn = new V3();
  function rib(fo, A) {
    const D = fo.duel, C = Foe.ctx(); if (!C) return;
    const h = A && A.hits[A.hi];
    if (!h || fo.dead || !(fo.stag <= 0)) { if (D.rib) D.rib.visible = false; return; }
    if (!D.rib || D.rib.parent !== C.sc) D.rib = mkRib(C);
    const t = A.act.time, sd = D.T.strike * (h.heavy ? 1.3 : 1), k = Math.max(0, Math.min(1, (t - (h.st || 0)) / Math.max(0.12, h.t - sd - (h.st || 0))));
    const ch = fo.f.bones.upperChest || fo.f.bones.chest; if (!ch) return; ch.getWorldPosition(_O); _F.set(Math.sin(fo.yaw), 0, Math.cos(fo.yaw)); _L.set(Math.cos(fo.yaw), 0, -Math.sin(fo.yaw));
    const c = Math.cos(h.deg * D2R), s = Math.sin(h.deg * D2R), R = 0.78;
    const pa = D.rib.geometry.attributes.position, aa = D.rib.geometry.attributes.al;
    for (let i = 0; i < RN; i++) { const u = i / (RN - 1), th = u * Math.PI; // 从来刀一侧弧形扫到另一侧
      const x = c * Math.cos(th) * R - s * Math.sin(th) * R * 0.35, y = s * Math.cos(th) * R * 0.85 + c * Math.sin(th) * R * 0.3; W(_rc, x, y, 0.45 + Math.sin(th) * 0.2);
      _rt.set(-c * Math.sin(th), -s * Math.sin(th), 0); Wd(_rn, -s, c, 0); const wdt = (h.heavy ? 0.07 : 0.045) * (0.4 + 0.6 * Math.sin(Math.PI * u));
      _r0.copy(_rc).addScaledVector(_rn, wdt); _r1.copy(_rc).addScaledVector(_rn, -wdt);
      pa.setXYZ(i * 2, _r0.x, _r0.y, _r0.z); pa.setXYZ(i * 2 + 1, _r1.x, _r1.y, _r1.z); const fa = Math.min(1, u * 3) * (u < k ? 1 : 0.25); aa.setX(i * 2, fa); aa.setX(i * 2 + 1, fa); }
    pa.needsUpdate = aa.needsUpdate = true; D.rib.visible = true;
    const m = D.rib.material; m.uniforms.uC.value.set(h.heavy ? '#ff8a20' : '#ff3a2a'); m.uniforms.uK.value = (0.25 + 0.75 * k) * (t >= h.t - sd ? 1.6 : 1);
  }
  return { on, assign, attack, post, TYPES };
})();
