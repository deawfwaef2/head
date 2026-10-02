// R59 MOD cine_stage：剧情短片的“摄影棚”。宿敌插曲（NemStory）与地区入场对话（Saga talk）都在这里播。
// 旧做法（R57s）的问题：演员放在完整的大地图里、每帧渲染整张图 + 后处理 → 全程掉帧；镜头又近又快、站桩、无布光、卡片杂乱。
// 新做法：
//  · 单独的小场景 stage：只有演员 + 三点布光（暖主光 / 冷轮廓光 / 补光）+ 脚下柔影。
//  · 背景 = 每个镜头开始时用该镜头的相机把大地图拍一张低分辨率照片，铺满全屏并做景深虚化。大地图之后不再每帧渲染 → 不卡。
//    演员站在真实地形高度上、背景与镜头同机位，所以脚下与地面透视一致。
//  · 只渲染 2.39:1 画幅（上下黑边不画），开播前在黑场里 compile 着色器。
//  · 表演：说话者播放说话循环 + 口型 + 开口点头；听者看着说话的人；每人眨眼；头/颈程序化注视（夹角限制）。
//  · 镜头：遵守 180° 轴线（相机永远在观众一侧），过肩/反打、中近景、特写、双人、低机位、侧面跟拍；慢推 + 轻微手持感。
//  · UI：单行字幕（上方说话人名）、首次出场下三分之一名牌、干净的标题卡/变强卡/恩祸卡；空格 = 下一句，Esc = 跳过。
// 接口：CineStage.play({ actors:[{h, body?, clip?, nm?, col?, pair?}], beats:[Saga 格式 beat，castFo 指向 actors 元素], col, onBeat, onEnd, info })
window.CineStage = (() => {
  const on = () => !window.Mods || Mods.on('cine_stage') !== false;
  const G = () => window.G || window.__game;
  const V3 = THREE.Vector3, UP = new V3(0, 1, 0);
  const now = () => performance.now() / 1000;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, u) => a + (b - a) * u;
  const sm = u => { u = clamp(u, 0, 1); return u * u * u * (u * (u * 6 - 15) + 10); };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const mul = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  let A = null; // 正在播放 / 搭建的短片
  let ST = null; // 摄影棚（复用）

  // ================= 摄影棚 =================
  function shadowTex() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(0.45, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t;
  }
  function stage() {
    if (ST) return ST;
    const sc = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(30, 2.39, 0.04, 600);
    const hemi = new THREE.HemisphereLight(0xdfe6ff, 0x3a2e28, 0.7);
    const key = new THREE.DirectionalLight(0xffe2c4, 1.4), rim = new THREE.DirectionalLight(0xbfd4ff, 2.0), fill = new THREE.DirectionalLight(0x9fb0ff, 0.3);
    sc.add(hemi); for (const l of [key, rim, fill]) { sc.add(l); sc.add(l.target); }
    const bgMat = new THREE.ShaderMaterial({
      uniforms: { tMap: { value: null }, uR: { value: new THREE.Vector2(0.006, 0.014) }, uTint: { value: new THREE.Color(1, 1, 1) }, uDim: { value: 0.8 }, uVig: { value: 0.6 }, uSat: { value: 0.8 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }',
      fragmentShader: `uniform sampler2D tMap; uniform vec2 uR; uniform vec3 uTint; uniform float uDim, uVig, uSat; varying vec2 vUv;
void main(){
  vec3 c = vec3(0.0);
  for (int i = 0; i < 20; i++) { float fi = float(i); float r = sqrt((fi + 0.5) / 20.0); float a = fi * 2.39996; c += texture2D(tMap, vUv + vec2(cos(a), sin(a)) * r * uR).rgb; }
  c /= 20.0;
  float l = dot(c, vec3(0.299, 0.587, 0.114)); c = mix(vec3(l), c, uSat) * uTint * uDim;
  vec2 q = vUv - 0.5; c *= clamp(1.0 - uVig * dot(q, q) * 1.8, 0.0, 1.0);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}`, depthTest: false, depthWrite: false
    });
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat); bg.frustumCulled = false; bg.renderOrder = -1e5; sc.add(bg);
    ST = { sc, cam, hemi, key, rim, fill, bg, bgMat, rt: null, bgCam: new THREE.PerspectiveCamera(30, 2.39, 0.1, 2000), stex: shadowTex() };
    return ST;
  }
  function rtFor(renderer, w, h) {
    const S = stage();
    if (S.rt && S.rt.width === w && S.rt.height === h) return S.rt;
    if (S.rt) S.rt.dispose();
    const half = renderer.capabilities && renderer.capabilities.isWebGL2;
    S.rt = new THREE.WebGLRenderTarget(w, h, { type: half ? THREE.HalfFloatType : THREE.UnsignedByteType, depthBuffer: true, stencilBuffer: false });
    S.bgMat.uniforms.tMap.value = S.rt.texture; return S.rt;
  }
  // 从大地图取光色，让棚里的光和背景是同一个时辰
  function matchLights(wsc) {
    const S = stage(); let sun = null, hemi = null;
    try { wsc.traverse(o => { if (o.isDirectionalLight && (!sun || o.intensity > sun.intensity)) sun = o; if (o.isHemisphereLight && !hemi) hemi = o; }); } catch (e) { }
    const fog = wsc && wsc.fog && wsc.fog.color ? wsc.fog.color.clone() : new THREE.Color(0x8090a8);
    const sk = sun ? sun.color.clone() : new THREE.Color(0xffe2c4);
    S.key.color.copy(sk).lerp(new THREE.Color(0xfff1e0), 0.45); S.key.intensity = 1.25;
    const rc = fog.clone().lerp(new THREE.Color(0xc8dcff), 0.5); const hsl = {}; rc.getHSL(hsl); rc.setHSL(hsl.h, Math.min(0.5, hsl.s), Math.max(0.72, hsl.l));
    S.rim.color.copy(rc); S.rim.intensity = 2.8;
    S.fill.color.copy(fog).lerp(new THREE.Color(0x9fb0ff), 0.5); S.fill.intensity = 0.35;
    if (hemi) { S.hemi.color.copy(hemi.color).lerp(new THREE.Color(0xffffff), 0.3); S.hemi.groundColor.copy(hemi.groundColor); S.hemi.intensity = 0.55; }
    else { S.hemi.color.copy(fog).lerp(new THREE.Color(0xffffff), 0.5); S.hemi.groundColor.set(0x3a2e28); S.hemi.intensity = 0.55; }
    // 背景调色：往雾色偏一点、压暗 → 人物跳出来
    S.bgMat.uniforms.uTint.value.copy(new THREE.Color(1, 1, 1).lerp(fog, 0.18));
    S.sc.environment = wsc && wsc.environment || null;
  }

  // ================= 演员 =================
  function headPos(a, out) { const b = a.f.bones.head || a.f.root; b.getWorldPosition(out); return out; }
  function bonePos(a, n, out) { const b = a.f.bones[n] || a.f.bones.head || a.f.root; b.getWorldPosition(out); return out; }
  async function buildActor(spec, used) {
    const h = spec.h;
    if (window.IdLook) { try { IdLook.apply(h); } catch (e) { } }
    let body = spec.body;
    if (!body) { const r = mul(((h.look.seed || 7) * 2654435761) >>> 0); body = Foe.bodyFor(h, r, !!spec.boss, used); }
    used.add(body);
    const f = await Foe.build(body, h.look); await Foe.animate(f);
    if (window.IdLook && !spec.boss) { try { IdLook.dress(f, h.c.id, h.look.seed); } catch (e) { } }
    if (spec.wpn && Foe.attachWeapon) { try { Foe.attachWeapon(f, spec.wpn); } catch (e) { } }
    f.root.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; } });
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: stage().stex, transparent: true, depthWrite: false, opacity: 0.55, toneMapped: false }));
    sh.renderOrder = -10; sh.scale.set(1.0, 1, 0.8);
    const rest = new Map(); for (const n of ['neck', 'head', 'spine', 'chest', 'upperChest']) { const b = f.bones[n]; if (b) rest.set(b, b.quaternion.clone()); }
    const nm = spec.nm || (h.c && h.c.name) || '';
    return { spec, h, f, sh, nm, col: spec.col || '#f0e6d8', title: spec.title || '', rest, idle: spec.clip || 'Idle_Loop', clip: '', ly: 0, lp: 0, tgt: new V3(), hasT: false,
      blinkT: 1 + Math.random() * 3, talk: 0, talkT: 0, nodT: 9, exT: 0, emo: spec.emo || null, intro: false, seed: Math.random() * 100 };
  }
  function dropActors(list) {
    for (const a of list || []) {
      try { if (a.f.root.parent) a.f.root.parent.remove(a.f.root); a.f.mixer.stopAllAction(); } catch (e) { }
      try { if (a.sh.parent) a.sh.parent.remove(a.sh); a.sh.geometry.dispose(); a.sh.material.dispose(); } catch (e) { }
      try { a.f.hb && a.f.hb.dispose && a.f.hb.dispose(); } catch (e) { }
    }
  }
  function setClip(a, name, fade) {
    if (a.clip === name) return; const ok = a.f.clips && a.f.clips[name] ? name : (a.f.clips && a.f.clips[a.idle] ? a.idle : 'Idle_Loop');
    if (a.clip === ok) return; try { a.f.play(ok, { fade: fade == null ? 0.5 : fade }); a.clip = ok; } catch (e) { }
  }
  // 站位：相机永远在观众一侧（aud = 从舞台中心指向观众），演员彼此相对再朝观众侧转一点
  function block(acts, ctr, aud, H) {
    const rt = new V3(-aud.z, 0, aud.x), n = acts.length;
    const put = (a, off, faceTo, turn) => {
      const p = ctr.clone().addScaledVector(rt, off.x).addScaledVector(aud, off.z); p.y = H(p.x, p.z);
      a.f.root.position.copy(p); a.home = p.clone();
      const d = faceTo.clone().sub(p), y0 = Math.atan2(d.x, d.z), t = Math.abs(turn), dotA = y => Math.sin(y) * aud.x + Math.cos(y) * aud.z; const yaw = dotA(y0 + t) >= dotA(y0 - t) ? y0 + t : y0 - t; a.f.root.rotation.y = yaw; a.yaw = yaw; // 朝观众侧转 |turn|
      a.sh.position.set(p.x, p.y + 0.015, p.z);
    };
    const audPt = ctr.clone().addScaledVector(aud, 6);
    if (n === 1) put(acts[0], { x: 0.15, z: 0 }, audPt, 0.35);
    else if (n === 2) {
      const pa = ctr.clone().addScaledVector(rt, -0.62), pb = ctr.clone().addScaledVector(rt, 0.62);
      put(acts[0], { x: -0.62, z: 0 }, pb, -0.6); put(acts[1], { x: 0.62, z: 0.05 }, pa, 0.6);
    } else if (n === 3) {
      const pa = ctr.clone().addScaledVector(rt, -0.7), pb = ctr.clone().addScaledVector(rt, 0.7);
      put(acts[0], { x: -0.7, z: 0 }, pb, -0.45); put(acts[1], { x: 0.7, z: 0 }, pa, 0.45); put(acts[2], { x: 0.05, z: -0.95 }, audPt, 0);
    } else {
      const xs = [-1.65, -0.55, 0.55, 1.65];
      acts.forEach((a, i) => { const x = xs[i] != null ? xs[i] : (i - n / 2) * 1.1; put(a, { x, z: -Math.abs(x) * 0.28 }, ctr.clone().addScaledVector(aud, 3.2), 0); });
    }
    for (const a of acts) { a.f.root.updateMatrixWorld(true); a.facing = new V3(Math.sin(a.yaw), 0, Math.cos(a.yaw)); }
  }
  // 骨骼绕世界轴转（同 stance.js）
  const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _ax = new V3();
  function rotW(b, axis, ang) {
    if (!b || !ang) return; b.parent.getWorldQuaternion(_q2); _ax.copy(axis).applyQuaternion(_q2.invert()).normalize();
    _q.setFromAxisAngle(_ax, ang); b.quaternion.premultiply(_q); b.updateMatrixWorld(true);
  }
  const _hp = new V3(), _d = new V3(), _r = new V3();
  function act(a, dt, t) {
    for (const [b, q] of a.rest) b.quaternion.copy(q);
    try { a.f.mixer.update(dt); } catch (e) { }
    a.f.root.updateMatrixWorld(true);
    // 注视
    let dy = 0, dp = 0;
    if (a.hasT) {
      headPos(a, _hp); _d.copy(a.tgt).sub(_hp); const hz = Math.hypot(_d.x, _d.z) || 1e-4;
      const yawT = Math.atan2(_d.x, _d.z); let rel = yawT - a.yaw; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      dy = clamp(rel, -0.55, 0.55); dp = clamp(Math.atan2(_d.y, hz), -0.35, 0.3);
    }
    const k = 1 - Math.exp(-dt * 5);
    a.ly += (dy - a.ly) * k; a.lp += (dp - a.lp) * k;
    let nod = 0; if (a.nodT < 0.5) { a.nodT += dt; nod = Math.sin(a.nodT / 0.5 * Math.PI) * 0.13; }
    const tk = a.talkT > 0 ? 1 : 0, nx = (Math.sin(t * 1.9 + a.seed) * 0.6 + Math.sin(t * 3.1 + a.seed * 2) * 0.4) * 0.035 * tk;
    const yaw = a.ly + nx, pitch = a.lp + 0.07 - nod + Math.sin(t * 2.3 + a.seed) * 0.02 * tk;
    const ch = a.f.bones.upperChest || a.f.bones.chest, nk = a.f.bones.neck, hd = a.f.bones.head;
    rotW(ch, UP, yaw * 0.2); rotW(nk, UP, yaw * 0.35); rotW(hd, UP, yaw * 0.45);
    const fy = a.yaw + yaw; _r.set(Math.cos(fy), 0, -Math.sin(fy));
    rotW(nk, _r, -pitch * 0.4); rotW(hd, _r, -pitch * 0.6);
    // 表情：眨眼 + 口型 + 情绪（setExpression 每次会清空全部形变，必须合在一次调用里；30Hz）
    a.blinkT -= dt; let bl = 0;
    if (a.blinkT < 0) { const x = -a.blinkT; bl = x < 0.06 ? x / 0.06 : x < 0.16 ? 1 - (x - 0.06) / 0.1 : 0; if (x > 0.16) a.blinkT = 1.8 + Math.random() * 3.2; }
    if (a.talkT > 0) a.talkT -= dt;
    let aa = 0, oh = 0;
    if (a.talkT > 0) { const s = Math.abs(Math.sin(t * 11.3 + a.seed) * Math.sin(t * 6.7)); const gap = Math.sin(t * 2.2 + a.seed * 3) > -0.55 ? 1 : 0.15; aa = s * 0.26 * gap; oh = Math.max(0, Math.sin(t * 4.1)) * 0.08 * gap; }
    a.exT -= dt;
    if (a.exT <= 0 && a.f.hb && a.f.hb.setExpression) {
      a.exT = 1 / 30; const ex = Object.assign({}, (a.h.look && a.h.look.ex) || {});
      if (a.emo) for (const kk in a.emo) ex[kk] = Math.max(ex[kk] || 0, a.emo[kk]);
      ex.blink = Math.max(ex.blink || 0, bl); if (aa) ex.aa = aa; if (oh) ex.oh = oh;
      try { a.f.hb.setExpression(ex); } catch (e) { }
    }
  }

  // ================= 镜头 =================
  // 所有镜头都在“观众侧”（aud）——两人对话时不越轴
  function sideOf(u) { const s = A.aud.clone().addScaledVector(u, -A.aud.dot(u)); s.y = 0; if (s.lengthSq() < 1e-4) s.set(-u.z, 0, u.x); return s.normalize(); }
  function planShot(type, X, L) {
    const S = {}, hX = headPos(X, new V3()), feet = X.f.root.position.clone();
    const hL = L ? headPos(L, new V3()) : null;
    const toL = hL ? hL.clone().sub(hX).setY(0).normalize() : X.facing.clone();
    const fwdish = X.facing.clone().multiplyScalar(0.75).add(A.aud.clone().multiplyScalar(0.55)).setY(0).normalize();
    const camRt = v => new V3(-v.z, 0, v.x); // v = 相机朝向（水平）的右手
    const look3 = (p, look, side) => { const dir = look.clone().sub(p).setY(0).normalize(); return look.clone().addScaledVector(camRt(dir), side); };
    switch (type) {
      case 'ecu': { const d = fwdish; S.p0 = hX.clone().addScaledVector(d, 0.95).addScaledVector(UP, 0.06); S.p1 = hX.clone().addScaledVector(d, 0.82).addScaledVector(UP, 0.06); const lk = hX.clone().addScaledVector(UP, 0.07); S.l0 = look3(S.p0, lk, L ? toL.dot(camRt(d.clone().negate())) * 0.07 : 0.05); S.l1 = S.l0; S.f0 = 22; S.f1 = 21; S.blur = 2.2; break; }
      case 'ots': {
        if (!L) return planShot('mcu', X, null);
        const u = hX.clone().sub(hL).setY(0).normalize(), s = sideOf(u);
        S.p0 = hL.clone().addScaledVector(u, -0.62).addScaledVector(s, 0.5).addScaledVector(UP, 0.04); S.p1 = S.p0.clone().addScaledVector(u, 0.14);
        S.l0 = hX.clone().lerp(hL, 0.16).addScaledVector(UP, -0.05); S.l1 = S.l0.clone(); S.f0 = 30; S.f1 = 27.5; S.blur = 1.6; break;
      }
      case 'two': case 'over': {
        const B = L || A.acts.find(a => a !== X) || X, hB = headPos(B, new V3()), M = hX.clone().lerp(hB, 0.5), u = hB.clone().sub(hX).setY(0); const dAB = u.length() || 1; u.normalize(); const s = sideOf(u);
        const dist = Math.max(2.7, dAB * 2.1);
        S.p0 = M.clone().addScaledVector(s, dist).addScaledVector(u, -0.25).addScaledVector(UP, -0.12); S.p1 = S.p0.clone().addScaledVector(u, 0.5).addScaledVector(s, -0.2);
        S.l0 = M.clone().addScaledVector(UP, -0.2); S.l1 = S.l0.clone().addScaledVector(u, 0.1); S.f0 = 31; S.f1 = 30; S.blur = 1.0; break;
      }
      case 'wide': {
        const C = new V3(); let sp = 0; for (const a of A.acts) C.add(headPos(a, new V3())); C.multiplyScalar(1 / A.acts.length);
        for (const a of A.acts) sp = Math.max(sp, headPos(a, new V3()).distanceTo(C));
        const rt = camRt(A.aud.clone().negate()); const dist = 2.6 + sp * 1.8;
        S.p0 = C.clone().addScaledVector(A.aud, dist).addScaledVector(rt, -0.35).addScaledVector(UP, 0.05); S.p1 = S.p0.clone().addScaledVector(A.aud, -0.55).addScaledVector(rt, 0.5);
        S.l0 = C.clone().addScaledVector(UP, -0.28); S.l1 = S.l0.clone(); S.f0 = 36; S.f1 = 34; S.blur = 0.7; break;
      }
      case 'low': {
        const d = X.facing.clone().add(A.aud.clone().multiplyScalar(0.35)).addScaledVector(toL, L ? -0.3 : 0).setY(0).normalize();
        S.p0 = feet.clone().addScaledVector(d, 2.0).addScaledVector(UP, 0.42); S.p1 = S.p0.clone().addScaledVector(d, -0.25).addScaledVector(UP, 0.08);
        const lk = hX.clone().addScaledVector(UP, -0.32); S.l0 = look3(S.p0, lk, -0.42); S.l1 = look3(S.p1, lk, -0.38); S.f0 = 38; S.f1 = 36; S.blur = 1.1; break;
      }
      case 'side': {
        const s = sideOf(toL), d = s.clone().addScaledVector(toL, 0.25).normalize();
        S.p0 = hX.clone().addScaledVector(d, 1.35).addScaledVector(toL, -0.3).addScaledVector(UP, -0.08); S.p1 = S.p0.clone().addScaledVector(toL, 0.35);
        S.l0 = hX.clone().addScaledVector(UP, -0.12).addScaledVector(toL, 0.12); S.l1 = S.l0.clone().addScaledVector(toL, 0.12); S.f0 = 29; S.f1 = 28; S.blur = 1.6; break;
      }
      default: { // mcu：3/4 正面中近景，留出视线方向空间
        const d = fwdish; S.p0 = hX.clone().addScaledVector(d, 1.45).addScaledVector(UP, 0.0); S.p1 = hX.clone().addScaledVector(d, 1.25).addScaledVector(UP, 0.0);
        const room = L ? 0.13 : 0.08, sgn = L ? Math.sign(toL.dot(camRt(d.clone().negate()))) || 1 : 1;
        const lk = hX.clone().addScaledVector(UP, -0.02); S.l0 = look3(S.p0, lk, room * sgn); S.l1 = look3(S.p1, lk, room * 0.9 * sgn); S.f0 = 27; S.f1 = 25; S.blur = 1.8;
      }
    }
    S.type = type; if (type !== 'ots' && type !== 'two' && type !== 'over' && type !== 'wide') clearLine(S, X, hX);
    return S;
  }
  // 单人镜头：别让别的演员挡在镜头和主角之间（绕主角转相机，最多 6 次）
  const _sg = new V3(), _pt = new V3();
  function segD(p, a, b) { _sg.copy(b).sub(a); const t = clamp(_pt.copy(p).sub(a).dot(_sg) / Math.max(1e-6, _sg.lengthSq()), 0, 1); return _pt.copy(a).addScaledVector(_sg, t).distanceTo(p); }
  function clearLine(S, X, hX) {
    for (let k = 0; k < 6; k++) {
      let worst = null, wd = 0.55;
      for (const a of A.acts) { if (a === X) continue; const h = headPos(a, new V3()), c = h.clone().addScaledVector(UP, -0.45); const d = Math.min(segD(h, S.p0, hX), segD(c, S.p0, hX), segD(h, S.p1, hX), segD(c, S.p1, hX)); if (d < wd) { wd = d; worst = h; } }
      if (!worst) return;
      const v = S.p0.clone().sub(hX), w = worst.clone().sub(hX), side = Math.sign(v.x * w.z - v.z * w.x) || 1; // 往远离挡路者的方向转
      const q = new THREE.Quaternion().setFromAxisAngle(UP, side * 0.3);
      for (const kk of ['p0', 'p1', 'l0', 'l1']) S[kk] = S[kk].clone().sub(hX).applyQuaternion(q).add(hX);
    }
  }
  const SHOT = { cLow: 'low', cFace: 'mcu', cOS: 'ots', cEyes: 'ecu', cHand: 'side', cTwo: 'two', cOver: 'two', cWide: 'wide' };
  const _c = new V3(), _l = new V3();
  function camAt(S, u, t) {
    const e = sm(u) * 0.7 + u * 0.3; _c.lerpVectors(S.p0, S.p1, e); _l.lerpVectors(S.l0, S.l1, e);
    // 手持感：很轻
    _c.x += Math.sin(t * 0.9) * 0.006 + Math.sin(t * 2.3) * 0.002; _c.y += Math.sin(t * 1.3 + 1) * 0.004; _l.y += Math.sin(t * 1.1 + 2) * 0.003;
    return { p: _c, l: _l, fov: lerp(S.f0, S.f1, e), roll: Math.sin(t * 0.7) * 0.004 };
  }
  // 布光跟着镜头走：主光在相机侧 45°上方，轮廓光在人物背后
  function lightFor(S, subj) {
    const T = stage(), d = S.p0.clone().sub(subj).setY(0).normalize(), rt = new V3(-d.z, 0, d.x);
    T.key.position.copy(subj).addScaledVector(d, 4).addScaledVector(rt, 3.2).addScaledVector(UP, 4); T.key.target.position.copy(subj);
    T.rim.position.copy(subj).addScaledVector(d, -5).addScaledVector(rt, -2.2).addScaledVector(UP, 3); T.rim.target.position.copy(subj);
    T.fill.position.copy(subj).addScaledVector(d, 4).addScaledVector(rt, -4).addScaledVector(UP, 0.5); T.fill.target.position.copy(subj);
  }

  // ================= 背景照片 =================
  function shootBg(renderer, S) {
    const T = stage(), W = A.world; if (!W || !W.sc) return;
    const sz = renderer.getSize(new THREE.Vector2()), pr = renderer.getPixelRatio();
    const bw = Math.max(1, Math.round(sz.x * pr * 0.3)), bh = Math.max(1, Math.round(bw / A.asp));
    const rt = rtFor(renderer, bw, bh), c = T.bgCam, m = camAt(S, 0.5, A.t);
    c.aspect = A.asp; c.fov = m.fov; c.near = 0.1; c.far = 2000; c.position.copy(m.p); c.up.set(0, 1, 0); c.lookAt(m.l); c.updateProjectionMatrix(); c.updateMatrixWorld(true);
    const hide = []; try { for (const fn of A.hideFns) fn(hide); } catch (e) { }
    const sky = W.sc.userData && W.sc.userData.skyM, skyP = sky ? sky.position.clone() : null; if (sky) sky.position.copy(c.position);
    const prevT = renderer.getRenderTarget(), ac = renderer.autoClear; renderer.autoClear = true;
    try { renderer.setRenderTarget(rt); renderer.clear(); renderer.render(W.sc, c); } catch (e) { console.warn('cine bg', e); }
    renderer.setRenderTarget(prevT); renderer.autoClear = ac;
    if (sky) sky.position.copy(skyP); for (const [o, v] of hide) o.visible = v;
    const b = S.blur || 1; T.bgMat.uniforms.uR.value.set(0.0085 * b, 0.0085 * b * A.asp);
    T.bgMat.uniforms.uDim.value = S.type === 'wide' || S.type === 'two' ? 0.8 : 0.66;
  }

  // ================= 剧本转换（Saga beat → 镜头 / 台词） =================
  function convert(beats, acts, byFo) {
    const actOf = fo => fo ? byFo.get(fo) || null : null, out = [];
    const shotOf = b => b.stake ? 'two' : SHOT[b.shot] || b.shot || 'mcu';
    const findSpk = (l, def) => {
      if (l.it || !l.w || l.w === '我') return null;
      const w = String(l.w).split(' · ')[0];
      for (const a of acts) { const n = a.nm || ''; if (!n) continue; if (w === n || n.startsWith(w) || w.startsWith(n) || n.split('·')[0] === w.split('·')[0]) return a; }
      return def;
    };
    for (const b of beats) {
      const X = actOf(b.castFo) || acts[0];
      const lines = (b.lines || []).map(l => Object.assign({}, l, { spk: findSpk(l, X) }));
      out.push({ src: b, X, shot: shotOf(b), lines: b.stake ? [] : lines, card: b.card || null, title: b.title || null, finale: b.finale || null, cc: b.cc && !b.cc2 ? b.cc : null, boost: b.boost || null, stake: b.stake || null, tag: b.tag || '', min: b.min || 0 });
    }
    // 开场：两人以上、第一镜不是全景 → 先给一个双人/群像建立镜头
    if (out.length && acts.length >= 2 && !['two', 'wide'].includes(out[0].shot) && (!out[0].lines.length || out[0].card || out[0].title)) out[0].shot = acts.length >= 3 ? 'wide' : 'two';
    return out;
  }

  // ================= UI =================
  let root = null, el = {};
  function css() {
    if (document.getElementById('csCss')) return; const s = document.createElement('style'); s.id = 'csCss';
    s.textContent = `
body.cscine #hud,body.cscine .hud,body.cscine #crosshair,body.cscine #xh,body.cscine #skills,body.cscine #bar,body.cscine #toast,body.cscine .float,body.cscine #minimap,body.cscine #compass,body.cscine #sgRoot,body.cscine #nsHud{visibility:hidden!important}
#csRoot{position:fixed;inset:0;z-index:9500;pointer-events:none;font-family:"Noto Serif SC","Source Han Serif SC","Songti SC",serif;color:#f4ece0;display:none}
#csRoot.on{display:block}
#csRoot .bar{position:absolute;left:0;right:0;height:var(--bh,12vh);background:#000;transition:transform .7s cubic-bezier(.2,.8,.2,1)}
#csRoot .bar.t{top:0;transform:translateY(-100%)}#csRoot .bar.b{bottom:0;transform:translateY(100%)}
#csRoot.in .bar{transform:none}
#csRoot .blk{position:absolute;inset:0;background:#000;opacity:1;transition:opacity .45s}
#csRoot .blk.off{opacity:0}
#csRoot .sub{position:absolute;left:50%;bottom:calc(var(--bh,12vh) * .5);transform:translate(-50%,50%);width:min(1100px,86vw);text-align:center}
#csRoot .who{font-family:system-ui,"PingFang SC","Microsoft YaHei",sans-serif;font-size:13px;letter-spacing:.32em;font-weight:700;margin-bottom:7px;opacity:0;transition:opacity .25s;text-shadow:0 1px 6px #000}
#csRoot .who.on{opacity:.95}
#csRoot .ln{font-size:clamp(17px,1.55vw,25px);line-height:1.55;letter-spacing:.04em;text-shadow:0 2px 10px rgba(0,0,0,.9);min-height:1.55em;opacity:0;transition:opacity .2s}
#csRoot .ln.on{opacity:1}#csRoot .ln.it{font-style:italic;color:#d9cdb8}
#csRoot .ln .gh{opacity:0}
#csRoot .lt{position:absolute;left:6.5vw;bottom:calc(var(--bh,12vh) + 5vh);opacity:0;transform:translateX(-18px);transition:opacity .5s,transform .7s cubic-bezier(.2,.9,.3,1)}
#csRoot .lt.on{opacity:1;transform:none}
#csRoot .lt:before{content:"";position:absolute;left:-7vw;right:-8vw;top:-3vh;bottom:-3vh;background:radial-gradient(ellipse at 30% 50%,rgba(0,0,0,.55),transparent 72%);z-index:-1}
#csRoot .lt .k{font-family:system-ui,"PingFang SC",sans-serif;font-size:11px;letter-spacing:.45em;color:var(--c,#e7c27a);margin-bottom:6px}
#csRoot .lt .n{font-size:clamp(26px,2.6vw,40px);font-weight:900;letter-spacing:.08em;line-height:1.1;text-shadow:0 3px 18px rgba(0,0,0,.8)}
#csRoot .lt .rule{height:2px;width:0;background:linear-gradient(90deg,var(--c,#e7c27a),transparent);margin:9px 0 7px;transition:width .9s .15s cubic-bezier(.2,.9,.3,1)}
#csRoot .lt.on .rule{width:min(340px,30vw)}
#csRoot .lt .t{font-family:system-ui,"PingFang SC",sans-serif;font-size:13px;letter-spacing:.12em;color:#d8cdbd}
#csRoot .lt .ch{margin-top:6px;font-family:system-ui,"PingFang SC",sans-serif;font-size:12px;color:#e0d5c4;text-shadow:0 1px 4px #000;letter-spacing:.06em}
#csRoot .lt .ch span+span:before{content:"·";margin:0 .6em;opacity:.6}
#csRoot .ttl{position:absolute;left:6vw;top:50%;transform:translateY(-50%);text-align:left;opacity:0;transition:opacity .9s;padding:3vh 6vw 3vh 0;background:radial-gradient(ellipse at 20% 50%,rgba(0,0,0,.5),transparent 70%)}
#csRoot .ttl.on{opacity:1}
#csRoot .ttl .a{font-family:system-ui,"PingFang SC",sans-serif;font-size:12px;letter-spacing:.6em;color:var(--tc,#e7c27a);margin-bottom:14px}
#csRoot .ttl .b{font-size:clamp(30px,3.6vw,58px);font-weight:900;letter-spacing:.22em;text-shadow:0 4px 30px rgba(0,0,0,.85)}
#csRoot .ttl .c{margin-top:14px;font-size:clamp(13px,1.05vw,16px);color:#d6cab8;letter-spacing:.1em;text-shadow:0 2px 10px #000}
#csRoot .ttl .b:after{content:"";display:block;width:min(260px,22vw);height:1px;background:linear-gradient(90deg,var(--tc,#e7c27a),transparent);margin-top:14px}
#csRoot .tag{position:absolute;left:4vw;top:calc(var(--bh,12vh) + 2.6vh);font-family:system-ui,"PingFang SC",sans-serif;font-size:11px;letter-spacing:.42em;color:var(--tc,#e7c27a);opacity:0;transition:opacity .6s}
#csRoot .tag.on{opacity:.85}
#csRoot .bst{position:absolute;right:5vw;top:50%;transform:translate(24px,-50%);width:min(380px,30vw);opacity:0;transition:opacity .5s,transform .7s cubic-bezier(.2,.9,.3,1);padding:20px 22px;border-left:2px solid var(--nc,#ffb070);background:linear-gradient(90deg,rgba(8,6,10,.82),rgba(8,6,10,.45))}
#csRoot .bst.on{opacity:1;transform:translate(0,-50%)}
#csRoot .bst .k{font-family:system-ui,"PingFang SC",sans-serif;font-size:11px;letter-spacing:.45em;color:var(--nc,#ffb070)}
#csRoot .bst .n{font-size:26px;font-weight:900;letter-spacing:.06em;margin:6px 0 2px}
#csRoot .bst .lv{font-family:system-ui,sans-serif;font-size:14px;color:#cdbfae;margin-bottom:8px}#csRoot .bst .lv b{color:#fff;font-size:18px}
#csRoot .bst .r{display:flex;gap:12px;align-items:flex-start;padding:9px 0;border-top:1px solid rgba(255,255,255,.07);opacity:0;transform:translateX(10px);animation:csIn .5s forwards}
#csRoot .bst .r i{font-style:normal;font-size:20px;width:26px;text-align:center;line-height:1.2}
#csRoot .bst .r .a{font-family:system-ui,"PingFang SC",sans-serif;font-size:15px;font-weight:800}
#csRoot .bst .r .e{font-family:system-ui,"PingFang SC",sans-serif;font-size:12.5px;color:#cfc3b0;margin-top:2px;line-height:1.45}
#csRoot .bst .f{margin-top:10px;font-family:system-ui,sans-serif;font-size:12px;color:#a89c8c}
#csRoot .stk{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;gap:3vw;opacity:0;transition:opacity .5s}
#csRoot .stk.on{opacity:1}
#csRoot .stk .cd{width:min(330px,27vw);padding:22px 24px;background:linear-gradient(180deg,rgba(10,8,12,.86),rgba(10,8,12,.62));border-top:2px solid var(--sc);opacity:0;transform:translateY(16px);transition:opacity .6s,transform .8s cubic-bezier(.2,.9,.3,1)}
#csRoot .stk .cd.on{opacity:1;transform:none}
#csRoot .stk .cd .h{font-family:system-ui,"PingFang SC",sans-serif;font-size:12px;letter-spacing:.4em;color:var(--sc)}
#csRoot .stk .cd .v{font-size:19px;line-height:1.6;margin:10px 0 12px}
#csRoot .stk .cd .e{font-family:system-ui,"PingFang SC",sans-serif;font-size:13px;color:var(--sc);opacity:.9}
#csRoot .sh{position:absolute;left:0;right:0;top:calc(var(--bh,12vh) + 6vh);text-align:center;font-family:system-ui,sans-serif;font-size:13px;letter-spacing:.3em;color:#c8b8ff;opacity:0;transition:opacity .6s}#csRoot .sh.on{opacity:.9}
#csRoot .hint{position:absolute;right:2.4vw;bottom:calc(var(--bh,12vh) * .5);transform:translateY(50%);font-family:system-ui,sans-serif;font-size:11px;color:#8d8478;letter-spacing:.12em}
#csRoot .hint b{display:inline-block;padding:1px 6px;border:1px solid #5a5248;border-radius:3px;margin:0 3px;color:#bfb4a4;font-weight:600}
#csRoot .prog{position:absolute;left:0;bottom:0;height:2px;background:var(--tc,#e7c27a);opacity:.5;width:0;transition:width .4s}
#csRoot .ld{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:120px;height:1px;background:rgba(255,255,255,.12);overflow:hidden;opacity:0;transition:opacity .4s}
#csRoot .ld.on{opacity:1}#csRoot .ld:after{content:"";position:absolute;inset:0;width:40%;background:var(--tc,#e7c27a);animation:csLd 1.2s infinite ease-in-out}
@keyframes csLd{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}
@keyframes csIn{to{opacity:1;transform:none}}`;
    document.head.appendChild(s);
  }
  function ensureUI() {
    css(); if (root && root.isConnected) return;
    root = document.createElement('div'); root.id = 'csRoot';
    root.innerHTML = `<div class="blk"></div><div class="bar t"></div><div class="bar b"><div class="prog"></div></div><div class="ld"></div><div class="tag"></div>
<div class="lt"><div class="k"></div><div class="n"></div><div class="rule"></div><div class="t"></div><div class="ch"></div></div>
<div class="ttl"><div class="a"></div><div class="b"></div><div class="c"></div></div>
<div class="bst"></div><div class="sh"></div>
<div class="stk"><div class="cd g" style="--sc:#ffe28a"><div class="h">若 她 倒 下</div><div class="v"></div><div class="e"></div></div><div class="cd x" style="--sc:#ff9a8a"><div class="h">若 她 活 着</div><div class="v"></div><div class="e"></div></div></div>
<div class="sub"><div class="who"></div><div class="ln"></div></div>
<div class="hint"><b>空格</b>继续　<b>Esc</b>跳过</div>`;
    document.body.appendChild(root);
    const q = s => root.querySelector(s);
    el = { blk: q('.blk'), who: q('.who'), ln: q('.ln'), lt: q('.lt'), ttl: q('.ttl'), tag: q('.tag'), bst: q('.bst'), stk: q('.stk'), sg: q('.cd.g'), sx: q('.cd.x'), sh: q('.sh'), prog: q('.prog'), ld: q('.ld') };
    root.addEventListener('pointerdown', () => { if (A && A.phase === 'play') next(); });
  }
  function barH() { const w = innerWidth, h = innerHeight; return Math.max(h * 0.085, (h - w / 2.39) / 2); }
  function showTitle(a, b, c) { el.ttl.querySelector('.a').textContent = a || ''; el.ttl.querySelector('.b').textContent = b || ''; el.ttl.querySelector('.c').textContent = c || ''; el.ttl.classList.add('on'); }
  function showLT(a, cc) {
    const c = cc || { k: '', n: a.nm, t: a.title, ch: [], col: a.col };
    el.lt.style.setProperty('--c', c.col || a.col); el.lt.querySelector('.k').textContent = c.k || ''; el.lt.querySelector('.n').textContent = c.n || a.nm;
    el.lt.querySelector('.t').textContent = c.t || ''; el.lt.querySelector('.ch').innerHTML = (c.ch || []).slice(0, 3).map(x => `<span>${esc(x)}</span>`).join('');
    el.lt.classList.remove('on'); void el.lt.offsetWidth; el.lt.classList.add('on'); A.ltT = 3.6;
  }
  function showBoost(B) {
    if (!B) { el.bst.classList.remove('on'); return; }
    el.bst.style.setProperty('--nc', B.col || '#ffb070');
    el.bst.innerHTML = `<div class="k">${esc(B.k)}</div><div class="n">${esc(B.n)}</div>${B.lv ? `<div class="lv">${B.lv}</div>` : ''}` + (B.rows || []).map((r, i) => `<div class="r" style="animation-delay:${0.4 + i * 0.3}s"><i>${r.ic}</i><div><div class="a" style="color:${r.col || '#fff'}">${esc(r.a)}</div><div class="e">${esc(r.e)}</div></div></div>`).join('') + (B.f ? `<div class="f">${esc(B.f)}</div>` : '');
    el.bst.classList.remove('on'); void el.bst.offsetWidth; el.bst.classList.add('on');
  }

  // ================= 播放 =================
  const lineDur = l => clamp(0.9 + String(l.t).replace(/[“”「」—…，。？！、]/g, '').length * 0.12, 1.8, 6.2);
  async function play(o) {
    if (A || !o || !o.beats || !o.beats.length || !o.actors || !o.actors.length) return false;
    ensureUI(); const T = stage();
    A = { phase: 'build', o, t0: now(), acts: [], hideFns: [], world: o.world || null, asp: 2.39, t: 0, last: 0 };
    root.style.setProperty('--tc', o.col || '#e7c27a'); root.style.setProperty('--bh', barH() + 'px');
    root.className = 'on'; el.blk.classList.remove('off'); el.ld.classList.add('on'); hideAll();
    document.body.classList.add('cscine');
    try { G() && G().setUI && G().setUI(true); } catch (e) { }
    const g = G(); A.saved = []; try { for (const c of g.camera.children) { A.saved.push([c, c.visible]); c.visible = false; } } catch (e) { }
    let ok = false; const me = A; setTimeout(() => { if (A === me && A.phase === 'build') { console.warn('CineStage: build timeout'); stop(false); } }, 45000); // 慢机器：超时放弃
    try {
      const used = new Set(), byFo = new Map();
      for (const sp of o.actors) { const a = await buildActor(sp, used); if (A !== me) { dropActors([a]); return false; } A.acts.push(a); byFo.set(sp, a); }
      for (const a of A.acts) { const pr = a.spec.pair; a.pair = pr ? byFo.get(pr) || null : null; T.sc.add(a.f.root); T.sc.add(a.sh); setClip(a, a.idle, 0); try { a.f.mixer.setTime(Math.random() * 3); } catch (e) { } }
      const W = A.world;
      A.aud = W.aud.clone().setY(0).normalize(); block(A.acts, W.ctr, A.aud, W.H);
      matchLights(W.sc);
      A.beats = convert(o.beats, A.acts, byFo);
      A.hideFns = o.hide ? [o.hide] : [];
      // 黑场里先编译着色器（第一帧不卡）
      try { const r = g.renderer || (o.renderer); const S0 = planShot('two', A.acts[0], A.acts[1] || null); const m = camAt(S0, 0, 0); T.cam.position.copy(m.p); T.cam.lookAt(m.l); T.cam.updateMatrixWorld(true); r.compile(T.sc, T.cam); } catch (e) { }
      ok = true;
    } catch (e) { console.warn('CineStage build', e); }
    if (A !== me) return false;
    if (!ok) { stop(false); return false; }
    A.phase = 'play'; A.bi = -1; A.t = 0; A.last = now(); A.introduced = new Set();
    el.ld.classList.remove('on'); root.classList.add('in');
    setTimeout(() => { if (A) el.blk.classList.add('off'); }, 120);
    beginBeat(0);
    return true;
  }
  function hideAll() { if (!el.ttl) return; el.ttl.classList.remove('on'); el.lt.classList.remove('on'); el.bst.classList.remove('on'); el.stk.classList.remove('on'); el.sg.classList.remove('on'); el.sx.classList.remove('on'); el.sh.classList.remove('on'); el.tag.classList.remove('on'); el.ln.classList.remove('on'); el.who.classList.remove('on'); }
  function beginBeat(i) {
    const b = A.beats[i]; if (!b) return stop(true);
    A.bi = i; A.bt = 0; A.li = -1; A.cut = null; A.lineT = 0; A.typed = 0; A.done = false;
    el.prog.style.width = ((i + 1) / A.beats.length * 100).toFixed(1) + '%';
    el.ttl.classList.remove('on'); el.stk.classList.remove('on'); el.sg.classList.remove('on'); el.sx.classList.remove('on'); el.sh.classList.remove('on');
    el.tag.textContent = b.tag || ''; el.tag.classList.toggle('on', !!b.tag);
    if (!b.boost) showBoost(null);
    const info = A.o.info || {};
    b.titleT = 0; b.lead = 0.4;
    if (b.card) { b.cardShow = [b.card.a, b.card.b, b.card.c]; b.lead = b.lines.length ? 2.8 : 0.4; }
    else if (b.title && info.title) { b.cardShow = [info.title.a, info.title.b, info.title.c]; b.lead = b.lines.length ? 2.8 : 0.4; }
    else b.cardShow = null;
    if (b.finale && info.finale) b.finaleShow = [info.finale.a, info.finale.b, info.finale.c];
    if (b.stake) {
      el.sg.querySelector('.v').textContent = b.stake.good || ''; el.sx.querySelector('.v').textContent = b.stake.bad || '';
      el.sg.querySelector('.e').textContent = b.stake.ge || ''; el.sx.querySelector('.e').textContent = b.stake.be || '';
      el.sh.textContent = b.stake.head || '';
    }
    b.total = b.stake ? 7.5 : b.lead + b.lines.reduce((s, l) => s + lineDur(l) + 0.35, 0) + 0.5; b.total = Math.max(b.total, b.min || 0, b.lines.length ? 0 : 3.4);
    try { if (A.o.onBeat) A.o.onBeat(b.src, i); } catch (e) { console.warn('cine beat', e); }
    // 第一镜
    const l0 = b.lines[0], X = (l0 && l0.spk) || b.X;
    cutTo(b.shot, X, b);
    if (b.cc) { showLT(b.X, b.cc); A.introduced.add(b.X); }
  }
  function partnerOf(X) { if (!X) return null; if (X.pair) return X.pair; return A.acts.find(a => a !== X) || null; }
  function cutTo(type, X, b) {
    const L = partnerOf(X); A.cut = { S: planShot(type, X, L), t: 0, X, L, dur: 4 };
    const est = b ? b.total : 4; A.cut.dur = clamp(est, 2.5, 9);
    lightFor(A.cut.S, headPos(X, new V3()).addScaledVector(UP, -0.4));
    // 注视：所有人看说话者；说话者看搭档（独白时看向观众侧前方一点，不正对镜头）
    for (const a of A.acts) {
      if (a === X) { if (L) headPos(L, a.tgt).addScaledVector(UP, 0.08); else a.tgt.copy(headPos(a, new V3())).addScaledVector(A.aud, 3).addScaledVector(new V3(-A.aud.z, 0, A.aud.x), 0.8); a.hasT = true; }
      else { headPos(X, a.tgt).addScaledVector(UP, 0.08); a.hasT = true; }
    }
    if (A.renderer) shootBg(A.renderer, A.cut.S); else A.needBg = true;
  }
  function startLine(b, li) {
    const l = b.lines[li]; A.li = li; A.lineT = 0; A.typed = 0; A.lineD = lineDur(l);
    const spk = l.spk;
    if (li > 0 && spk && A.cut && spk !== A.cut.X) cutTo(spk.pair && A.cut.X === spk.pair ? 'ots' : 'mcu', spk, null);
    for (const a of A.acts) { if (a === spk) { a.talkT = A.lineD * 0.85; a.nodT = 0; setClip(a, 'Idle_Talking_Loop'); } else if (a.clip === 'Idle_Talking_Loop' && a.idle !== 'Idle_Talking_Loop') setClip(a, a.idle, 0.8); }
    if (spk && !A.introduced.has(spk) && !b.cc && spk.nm) { A.introduced.add(spk); }
    el.who.textContent = l.it ? '' : (l.w || ''); el.who.style.color = l.col || '#e7c27a'; el.who.classList.toggle('on', !!l.w && !l.it);
    el.ln.classList.toggle('it', !!l.it); el.ln.style.color = l.it ? '' : '#f6efe4';
    A.chars = Array.from(String(l.t)); el.ln.innerHTML = `<span class="vis"></span><span class="gh">${esc(l.t)}</span>`; el.ln.classList.add('on');
  }
  function typeTo(n) { const v = el.ln.querySelector('.vis'), gh = el.ln.querySelector('.gh'); if (!v) return; v.textContent = A.chars.slice(0, n).join(''); gh.textContent = A.chars.slice(n).join(''); }
  function update(dt) {
    if (!A || A.phase !== 'play') return;
    A.t += dt; A.bt += dt; const b = A.beats[A.bi]; if (!b) return;
    if (A.cut) A.cut.t += dt;
    if (A.ltT > 0 && (A.ltT -= dt) <= 0) el.lt.classList.remove('on');
    // 标题卡
    if (b.cardShow && A.bt > 0.35 && !b.cardOn && !b.cardOff) { b.cardOn = true; showTitle(...b.cardShow); }
    if (b.cardOn && !b.cardOff && A.bt > (b.lines.length ? b.lead - 0.2 : b.total - 0.6)) { b.cardOff = true; el.ttl.classList.remove('on'); }
    if (b.finaleShow && A.bt > 0.9 && !b.finOn) { b.finOn = true; showTitle(...b.finaleShow); }
    if (b.boost && A.bt > 0.5 && !b.bOn) { b.bOn = true; showBoost(b.boost); }
    if (b.stake) { if (A.bt > 0.3) el.stk.classList.add('on'); if (A.bt > 0.6) el.sg.classList.add('on'); if (A.bt > 2.2) el.sx.classList.add('on'); if (A.bt > 1 && b.stake.head) el.sh.classList.add('on'); }
    // 台词
    if (b.lines.length) {
      if (A.li < 0 && A.bt >= b.lead) startLine(b, 0);
      else if (A.li >= 0) {
        A.lineT += dt; const l = b.lines[A.li];
        const n = Math.min(A.chars.length, Math.floor(A.lineT * 26)); if (n !== A.typed) { A.typed = n; typeTo(n); }
        if (A.lineT > A.lineD + 0.35) {
          if (A.li < b.lines.length - 1) startLine(b, A.li + 1);
          else if (!A.done) { A.done = true; A.doneT = A.bt; }
        }
      }
    } else if (!A.done && A.bt > b.total) { A.done = true; A.doneT = A.bt; }
    if (b.stake && !A.done && A.bt > b.total) { A.done = true; A.doneT = A.bt; }
    if (A.done && A.bt > A.doneT + (b.boost || b.finale ? 1.2 : 0.25)) { if (A.bi < A.beats.length - 1) { el.ln.classList.remove('on'); el.who.classList.remove('on'); beginBeat(A.bi + 1); } else stop(true); }
  }
  function next() {
    if (!A || A.phase !== 'play') return; const b = A.beats[A.bi]; if (!b || A.bt < 0.45) return;
    if (A.li >= 0 && A.typed < A.chars.length) { A.typed = A.chars.length; typeTo(A.typed); A.lineT = Math.max(A.lineT, A.chars.length / 26); return; }
    if (A.li >= 0 && A.li < b.lines.length - 1) { startLine(b, A.li + 1); return; }
    if (b.lines.length && A.li < 0) { startLine(b, 0); return; }
    if (A.bi < A.beats.length - 1) { el.ln.classList.remove('on'); el.who.classList.remove('on'); beginBeat(A.bi + 1); } else stop(true);
  }
  // 每帧由宿主调用（worlds.js 的渲染处）：更新演员 + 镜头并渲染摄影棚。返回 true = 本帧已渲染
  function draw(renderer) {
    if (!A) return false;
    const T = stage(); A.renderer = renderer;
    const tn = now(), dt = Math.min(0.05, Math.max(0, tn - (A.last || tn))); A.last = tn;
    const pr = renderer.getPixelRatio(), sz = renderer.getSize(new THREE.Vector2());
    const bh = Math.round(Math.max(sz.y * 0.085, (sz.y - sz.x / 2.39) / 2)), vh = sz.y - bh * 2; A.asp = sz.x / Math.max(1, vh);
    const cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha();
    renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 1); renderer.setScissorTest(false); renderer.clear();
    try { const S0 = G().S; if (A.hp0 == null) A.hp0 = S0.hp; if (S0.hp < A.hp0) S0.hp = A.hp0; } catch (e) { } // 过场期间不掉血
    if (A.phase === 'play') {
      update(dt);
      if (!A) { renderer.setClearColor(cc, ca); return true; }
      for (const a of A.acts) act(a, dt, A.t);
      if (A.needBg && A.cut) { A.needBg = false; shootBg(renderer, A.cut.S); }
      if (A.cut) {
        const m = camAt(A.cut.S, A.cut.t / A.cut.dur, A.t), c = T.cam;
        c.aspect = A.asp; c.fov = m.fov; c.position.copy(m.p); c.up.set(Math.sin(m.roll), Math.cos(m.roll), 0); c.lookAt(m.l); c.updateProjectionMatrix(); c.updateMatrixWorld(true);
        const ac = renderer.autoClear; renderer.autoClear = false;
        renderer.setViewport(0, bh, sz.x, vh); renderer.setScissor(0, bh, sz.x, vh); renderer.setScissorTest(true);
        renderer.clearDepth(); renderer.render(T.sc, c);
        renderer.setScissorTest(false); renderer.setViewport(0, 0, sz.x, sz.y); renderer.autoClear = ac;
      }
    }
    renderer.setClearColor(cc, ca);
    return true;
  }
  function stop(natural) {
    if (!A) return; const a0 = A; A = null;
    window.__skipMenuUntil = performance.now() + 1500;
    el.blk.classList.remove('off'); hideAll();
    setTimeout(() => { if (!A && root) root.className = ''; }, 380);
    try { root.classList.remove('in'); } catch (e) { }
    document.body.classList.remove('cscine');
    try { for (const [o, v] of a0.saved || []) o.visible = v; } catch (e) { }
    dropActors(a0.acts);
    try { G() && G().setUI && G().setUI(false); G() && G().lockPointer && G().lockPointer(); } catch (e) { }
    try { a0.o.onEnd && a0.o.onEnd(!!natural); } catch (e) { console.warn('cine end', e); }
  }
  addEventListener('keydown', e => {
    if (!A) return; if (/^F\d+$/.test(e.code)) return;
    e.preventDefault(); e.stopImmediatePropagation(); if (e.repeat) return;
    if (A.phase !== 'play') return;
    if (e.code === 'Escape') return stop(false);
    if (['Space', 'Enter', 'NumpadEnter', 'KeyE'].includes(e.code)) next();
  }, true);
  addEventListener('keyup', e => { if (A) e.stopImmediatePropagation(); }, true);
  addEventListener('resize', () => { if (root) root.style.setProperty('--bh', barH() + 'px'); });

  // 在大地图里取舞台：玩家前方 3m，观众侧 = 玩家这边
  function worldHere(extraHide) {
    const g = G(), W = window.Worlds && Worlds._W; if (!g || !W || !W.B) return null;
    const P0 = W.pos, yaw = g.player.yaw, fw = new V3(-Math.sin(yaw), 0, -Math.cos(yaw));
    let d = 3.2; const B = W.B;
    // 舞台中心别落进柱子/树里：往回收
    for (let k = 0; k < 4; k++) { const c = P0.clone().addScaledVector(fw, d); if (!(B.cols || []).some(o => Math.hypot(c.x - o.x, c.z - o.z) < o.r + 1.1)) break; d -= 0.6; }
    const ctr = P0.clone().addScaledVector(fw, Math.max(1.6, d));
    const hide = list => {
      try { for (const fo of (window.Foe && Foe.foes) || []) { const r = fo.f && fo.f.root; if (r) { list.push([r, r.visible]); r.visible = false; } if (fo.warn) { list.push([fo.warn, fo.warn.visible]); fo.warn.visible = false; } } } catch (e) { }
      try { for (const c of g.camera.children) { list.push([c, c.visible]); c.visible = false; } } catch (e) { }
      if (extraHide) extraHide(list);
    };
    return { sc: B.sc, H: (x, z) => { try { return B.H(x, z); } catch (e) { return P0.y; } }, ctr, aud: fw.clone().negate(), hide };
  }
  // NemStory / Saga 用的便捷入口：自动取大地图舞台
  function playHere(o) { const w = worldHere(); if (!w) return Promise.resolve(false); o.world = w; o.hide = w.hide; return play(o); }

  return { on, play, playHere, draw, next, stop: () => stop(false), get active() { return !!A; }, get playing() { return !!A && A.phase === 'play'; }, _A: () => A, _stage: stage, SHOT };
})();
