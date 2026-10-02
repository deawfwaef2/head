// R59s MOD cine_stage：剧情短片的“摄影棚”。宿敌插曲（NemStory）与地区入场电影（Saga）都在这里播。
// v1（R59s）：独立小场景 + 三点布光 + 每镜头一张虚化大地图背景 → 不再每帧渲染大地图，不掉帧。
// v2（R59t，用户：“太土了，应该各种剧情对话、各种场景特写描写转换”；“刚进场就能看见电影人物”）：
//  · 多场景：一段电影 2–3 个地点（自动在地图里找带地标的空地），每个场景的背景都不同；场景之间黑场/溶接转场 + 地点字幕。
//  · 镜头语言：环境空镜（清晰全景 + 慢推，变焦与背景同步缩放，透视不穿帮）、手部特写、眼部特写、背影看远方、脚步、
//    固定机位人物走入画面、过肩/反打、听者反应镜头（长台词说到一半切过去）、低机位、侧面。
//  · 表演：跪地/蹲下/施法/持剑连斩/抱臂/摇头……（UAL 动作库），姿势类动作说话时不会站起来；走位入画。
//  · 转场：dip（黑场）/ dissolve（截上一帧淡出）/ flash（闪白）。
//  · 进图黑场：有电影要播时，从地图第一帧起就盖黑（hook），看不到场上的人，直到电影开始。
// 接口：CineStage.play({ actors:[{h, body?, clip?, nm?, col?, pair?, wpn?}], beats:[...], col, onBeat, onEnd, world })
// beat：{ shot, castFo(actor spec), lines:[{t,w,col,it}], scene:{key,cap,sub,cast:[spec]}, act:Map|[[spec,clip]], walk:{who,d,side,clip},
//         tr:'cut'|'dip'|'dissolve'|'flash', card:{a,b,c}, cc:{k,n,t,ch,col}, boost, stake:{good,bad,ge,be,head}, min, tag }
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
  const STAND = new Set(['Idle_Loop', 'Idle_FoldArms_Loop', 'Idle_Talking_Loop']);
  let A = null; // 正在播放 / 搭建的短片
  let ST = null; // 摄影棚（复用）

  // ================= 摄影棚 =================
  function shadowTex() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(0.45, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  }
  function stage() {
    if (ST) return ST;
    const sc = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(30, 2.39, 0.04, 600);
    const hemi = new THREE.HemisphereLight(0xdfe6ff, 0x3a2e28, 0.55);
    const key = new THREE.DirectionalLight(0xffe2c4, 1.25), rim = new THREE.DirectionalLight(0xbfd4ff, 2.8), fill = new THREE.DirectionalLight(0x9fb0ff, 0.3);
    sc.add(hemi); for (const l of [key, rim, fill]) { sc.add(l); sc.add(l.target); }
    const bgMat = new THREE.ShaderMaterial({
      uniforms: { tMap: { value: null }, uR: { value: new THREE.Vector2(0.006, 0.014) }, uZ: { value: 1 }, uTint: { value: new THREE.Color(1, 1, 1) }, uDim: { value: 0.8 }, uVig: { value: 0.6 }, uSat: { value: 0.8 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }',
      fragmentShader: `uniform sampler2D tMap; uniform vec2 uR; uniform float uZ; uniform vec3 uTint; uniform float uDim, uVig, uSat; varying vec2 vUv;
void main(){
  vec2 uv = 0.5 + (vUv - 0.5) * uZ;
  vec3 c = vec3(0.0);
  if (uR.x < 0.0004) c = texture2D(tMap, uv).rgb;
  else { for (int i = 0; i < 20; i++) { float fi = float(i); float r = sqrt((fi + 0.5) / 20.0); float a = fi * 2.39996; c += texture2D(tMap, uv + vec2(cos(a), sin(a)) * r * uR).rgb; } c /= 20.0; }
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
    if (hemi) { S.hemi.color.copy(hemi.color).lerp(new THREE.Color(0xffffff), 0.3); S.hemi.groundColor.copy(hemi.groundColor); }
    else { S.hemi.color.copy(fog).lerp(new THREE.Color(0xffffff), 0.5); S.hemi.groundColor.set(0x3a2e28); }
    S.hemi.intensity = 0.55;
    S.bgMat.uniforms.uTint.value.copy(new THREE.Color(1, 1, 1).lerp(fog, 0.18));
    S.sc.environment = wsc && wsc.environment || null;
  }

  // ================= 演员 =================
  const _v = new V3();
  function headPos(a, out) { const b = a.f.bones.head || a.f.root; b.getWorldPosition(out); return out; }
  function boneW(a, n, out) { const b = a.f.bones[n] || a.f.bones.head || a.f.root; b.getWorldPosition(out); return out; }
  // 规划镜头用的“站位头部”：站位点 + 当前姿势的头高（不受走位/呼吸影响）
  function headRef(a, out) { headPos(a, out); const y = out.y - a.f.root.position.y; return out.set(a.home.x, a.home.y + y, a.home.z).addScaledVector(a.facing, 0.04); }
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
    return { spec, h, f, sh, nm, col: spec.col || '#f0e6d8', title: spec.title || spec.role || '', rest, idle: spec.clip || 'Idle_Loop', clip: '', ly: 0, lp: 0, tgt: new V3(), hasT: false,
      blinkT: 1 + Math.random() * 3, talkT: 0, nodT: 9, exT: 0, emo: spec.emo || null, seed: Math.random() * 100, home: new V3(), facing: new V3(0, 0, 1), yaw: 0, walk: null, turn: null, on: true };
  }
  function dropActors(list) {
    for (const a of list || []) {
      try { if (a.f.root.parent) a.f.root.parent.remove(a.f.root); a.f.mixer.stopAllAction(); } catch (e) { }
      try { if (a.sh.parent) a.sh.parent.remove(a.sh); a.sh.geometry.dispose(); a.sh.material.dispose(); } catch (e) { }
      try { a.f.hb && a.f.hb.dispose && a.f.hb.dispose(); } catch (e) { }
    }
  }
  function setClip(a, name, fade) {
    const ok = a.f.clips && a.f.clips[name] ? name : (a.f.clips && a.f.clips[a.idle] ? a.idle : 'Idle_Loop');
    if (a.clip === ok) return; try { a.f.play(ok, { fade: fade == null ? 0.5 : fade }); a.clip = ok; } catch (e) { }
  }
  function show(a, v) { a.on = v; a.f.root.visible = v; a.sh.visible = v; }
  // 站位：相机永远在观众一侧（aud = 从舞台中心指向观众），演员彼此相对再朝观众侧转一点
  function block(acts, ctr, aud, H) {
    const rt = new V3(-aud.z, 0, aud.x), n = acts.length;
    const put = (a, off, faceTo, turn) => {
      const p = ctr.clone().addScaledVector(rt, off.x).addScaledVector(aud, off.z); p.y = H(p.x, p.z);
      a.f.root.position.copy(p); a.home.copy(p);
      const d = faceTo.clone().sub(p), y0 = Math.atan2(d.x, d.z), t = Math.abs(turn), dotA = y => Math.sin(y) * aud.x + Math.cos(y) * aud.z;
      const yaw = dotA(y0 + t) >= dotA(y0 - t) ? y0 + t : y0 - t; a.f.root.rotation.y = yaw; a.yaw = yaw; a.facing.set(Math.sin(yaw), 0, Math.cos(yaw));
      a.sh.position.set(p.x, p.y + 0.015, p.z); a.walk = null; a.turn = null;
    };
    const audPt = ctr.clone().addScaledVector(aud, 6);
    if (n === 1) put(acts[0], { x: 0.1, z: 0 }, audPt, 0.5);
    else if (n === 2) {
      const pa = ctr.clone().addScaledVector(rt, -0.62), pb = ctr.clone().addScaledVector(rt, 0.62);
      put(acts[0], { x: -0.62, z: 0 }, pb, 0.6); put(acts[1], { x: 0.62, z: 0.05 }, pa, 0.6);
    } else if (n === 3) {
      const pa = ctr.clone().addScaledVector(rt, -0.7), pb = ctr.clone().addScaledVector(rt, 0.7);
      put(acts[0], { x: -0.7, z: 0 }, pb, 0.55); put(acts[1], { x: 0.7, z: 0 }, pa, 0.55); put(acts[2], { x: 0.05, z: -0.95 }, audPt, 0);
    } else {
      const xs = [-1.65, -0.55, 0.55, 1.65];
      acts.forEach((a, i) => { const x = xs[i] != null ? xs[i] : (i - n / 2) * 1.1; put(a, { x, z: -Math.abs(x) * 0.28 }, ctr.clone().addScaledVector(aud, 3.2), 0); });
    }
    for (const a of acts) a.f.root.updateMatrixWorld(true);
  }
  // 骨骼绕世界轴转（同 stance.js）
  const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _ax = new V3();
  function rotW(b, axis, ang) {
    if (!b || !ang) return; b.parent.getWorldQuaternion(_q2); _ax.copy(axis).applyQuaternion(_q2.invert()).normalize();
    _q.setFromAxisAngle(_ax, ang); b.quaternion.premultiply(_q); b.updateMatrixWorld(true);
  }
  const _hp = new V3(), _d = new V3(), _r = new V3();
  function act(a, dt, t) {
    if (!a.on) return;
    // 走位
    if (a.walk) {
      const w = a.walk; w.t += dt; const u = clamp(w.t / w.dur, 0, 1);
      a.f.root.position.lerpVectors(w.from, w.to, u); a.f.root.position.y = A.world.H(a.f.root.position.x, a.f.root.position.z);
      a.f.root.rotation.y = w.yw;
      if (u >= 1) { a.walk = null; setClip(a, a.idle, 0.45); a.turn = { from: w.yw, to: a.yaw, t: 0 }; }
    } else if (a.turn) {
      const tr = a.turn; tr.t += dt; const u = sm(tr.t / 0.6); let d = tr.to - tr.from; d = Math.atan2(Math.sin(d), Math.cos(d));
      a.f.root.rotation.y = tr.from + d * u; if (u >= 1) a.turn = null;
    }
    a.sh.position.set(a.f.root.position.x, a.f.root.position.y + 0.015, a.f.root.position.z);
    for (const [b, q] of a.rest) b.quaternion.copy(q);
    if (a.f._L && window.Locomo) { const fk = a.fk || (a.fk = { f: a.f, pos: a.f.root.position, yaw: 0, yawV: 0 }); fk.yaw = a.f.root.rotation.y; try { Locomo.tick(fk, dt); } catch (e) { } } // npc_locomo 把走路动作权重交给 tick 驱动；摄影棚不调用就会 T 字形平移
    try { a.f.mixer.update(dt); } catch (e) { }
    a.f.root.updateMatrixWorld(true);
    // 注视（走路时不扭头）
    let dy = 0, dp = 0;
    if (a.hasT && !a.walk) {
      headPos(a, _hp); _d.copy(a.tgt).sub(_hp); const hz = Math.hypot(_d.x, _d.z) || 1e-4;
      const yawT = Math.atan2(_d.x, _d.z); let rel = yawT - a.f.root.rotation.y; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      dy = clamp(rel, -0.55, 0.55); dp = clamp(Math.atan2(_d.y, hz), -0.35, 0.3);
    }
    const k = 1 - Math.exp(-dt * 5);
    a.ly += (dy - a.ly) * k; a.lp += (dp - a.lp) * k;
    let nod = 0; if (a.nodT < 0.5) { a.nodT += dt; nod = Math.sin(a.nodT / 0.5 * Math.PI) * 0.13; }
    const tk = a.talkT > 0 ? 1 : 0, nx = (Math.sin(t * 1.9 + a.seed) * 0.6 + Math.sin(t * 3.1 + a.seed * 2) * 0.4) * 0.035 * tk;
    const yaw = a.ly + nx, pitch = a.lp + 0.07 - nod + Math.sin(t * 2.3 + a.seed) * 0.02 * tk;
    const ch = a.f.bones.upperChest || a.f.bones.chest, nk = a.f.bones.neck, hd = a.f.bones.head;
    rotW(ch, UP, yaw * 0.2); rotW(nk, UP, yaw * 0.35); rotW(hd, UP, yaw * 0.45);
    const fy = a.f.root.rotation.y + yaw; _r.set(Math.cos(fy), 0, -Math.sin(fy));
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
      if (ex.happy > 0.15) { ex.relaxed = Math.max(ex.relaxed || 0, 0.25); ex.happy = 0.1; } ex.ee = Math.min(ex.ee || 0, 0.08); ex.aa = Math.min(ex.aa || 0, 0.12); // 剧情里不要大笑（脸型形变会变得很怪）：只留淡淡的神态
      ex.blink = Math.max(ex.blink || 0, bl); if (aa) ex.aa = aa; if (oh) ex.oh = oh;
      try { a.f.hb.setExpression(ex); } catch (e) { }
    }
  }

  // ================= 场景地点 =================
  // key 'A' = 玩家面前；其他 key = 地图里另找一块空地（离之前的地点 ≥ 9m），背后有地标（大柱/树/石）
  function spotFor(key) {
    if (A.spots.has(key)) return A.spots.get(key);
    const W = A.world; let sp = null;
    if (!A.spots.size || !W.cols) sp = { ctr: W.ctr.clone(), aud: W.aud.clone() };
    else {
      const R = W.R || 30, prev = [...A.spots.values()].map(s => s.ctr), cols = W.cols || [];
      let best = null, bs = -1e9;
      for (let i = 0; i < 48; i++) {
        let x, z; const p0 = W.samp ? W.samp() : null;
        if (p0) { x = p0[0]; z = p0[1]; } else { const an = Math.random() * 6.283, d = R * (0.15 + Math.random() * 0.55); x = W.P0.x + Math.cos(an) * d; z = W.P0.z + Math.sin(an) * d; }
        if (cols.some(c => Math.hypot(c.x - x, c.z - z) < c.r + 1.7)) continue;
        const y = W.H(x, z); if (Math.abs(W.H(x + 1.5, z) - y) > 0.5 || Math.abs(W.H(x, z + 1.5) - y) > 0.5) continue;
        const dp = Math.min(...prev.map(p => Math.hypot(p.x - x, p.z - z))); if (dp < 9) continue;
        let lm = null, ld = 1e9; for (const c of cols) { const d = Math.hypot(c.x - x, c.z - z); if (c.r >= 0.5 && d > 3 && d < 14 && d - c.r * 2 < ld) { ld = d - c.r * 2; lm = c; } }
        const sc = (lm ? 3 : 0) - Math.abs(dp - 16) * 0.05 + Math.random();
        if (sc > bs) { bs = sc; best = { x, z, lm }; }
      }
      if (best) { const ctr = new V3(best.x, W.H(best.x, best.z), best.z); let aud; if (best.lm) aud = new V3(best.x - best.lm.x, 0, best.z - best.lm.z).normalize(); else { const an = Math.random() * 6.283; aud = new V3(Math.cos(an), 0, Math.sin(an)); } sp = { ctr, aud }; }
      else sp = { ctr: W.ctr.clone(), aud: W.aud.clone().applyAxisAngle(UP, 1.6 * A.spots.size) };
    }
    A.spots.set(key, sp); return sp;
  }
  function enterScene(sc) {
    const sp = spotFor(sc.key || 'A'); A.aud = sp.aud.clone(); A.ctr = sp.ctr.clone();
    const cast = (sc.cast || A.acts.map(a => a.spec)).map(s => A.byFo.get(s)).filter(Boolean);
    for (const a of A.acts) show(a, cast.includes(a));
    if (cast.length) block(cast, sp.ctr, sp.aud, A.world.H);
    A.cast = cast; A.scene = sc;
  }

  // ================= 镜头 =================
  function sideOf(u) { const s = A.aud.clone().addScaledVector(u, -A.aud.dot(u)); s.y = 0; if (s.lengthSq() < 1e-4) s.set(-u.z, 0, u.x); return s.normalize(); }
  const camRt = v => new V3(-v.z, 0, v.x);
  function planShot(type, X, L) {
    const S = { type, follow: null };
    if (type === 'est' || !X) return planEst(S, X);
    const hX = headRef(X, new V3()), feet = X.home.clone();
    const hL = L ? headRef(L, new V3()) : null;
    const toL = hL ? hL.clone().sub(hX).setY(0).normalize() : X.facing.clone();
    const fwdish = X.facing.clone().multiplyScalar(0.75).add(A.aud.clone().multiplyScalar(0.55)).setY(0).normalize();
    const look3 = (p, look, side) => { const dir = look.clone().sub(p).setY(0).normalize(); return look.clone().addScaledVector(camRt(dir), side); };
    switch (type) {
      case 'ecu': { const d = fwdish; S.p0 = hX.clone().addScaledVector(d, 0.95).addScaledVector(UP, 0.06); S.p1 = hX.clone().addScaledVector(d, 0.82).addScaledVector(UP, 0.06); const lk = hX.clone().addScaledVector(UP, 0.07); S.l0 = look3(S.p0, lk, L ? toL.dot(camRt(d.clone().negate())) * 0.07 : 0.05); S.l1 = S.l0; S.f0 = 22; S.f1 = 21; S.blur = 2.2; S.follow = 'head'; break; }
      case 'ots': {
        if (!L || !L.on) return planShot('mcu', X, null);
        const u = hX.clone().sub(hL).setY(0).normalize(), s = sideOf(u);
        S.p0 = hL.clone().addScaledVector(u, -0.62).addScaledVector(s, 0.5).addScaledVector(UP, 0.04); S.p1 = S.p0.clone().addScaledVector(u, 0.14);
        S.l0 = hX.clone().lerp(hL, 0.16).addScaledVector(UP, -0.05); S.l1 = S.l0.clone(); S.f0 = 30; S.f1 = 27.5; S.blur = 1.6; break;
      }
      case 'two': {
        const B = (L && L.on) ? L : A.cast.find(a => a !== X) || X, hB = headRef(B, new V3()), M = hX.clone().lerp(hB, 0.5), u = hB.clone().sub(hX).setY(0); const dAB = u.length() || 1; u.normalize(); const s = sideOf(u);
        const dist = Math.max(2.7, dAB * 2.1);
        S.p0 = M.clone().addScaledVector(s, dist).addScaledVector(u, -0.25).addScaledVector(UP, -0.12); S.p1 = S.p0.clone().addScaledVector(u, 0.5).addScaledVector(s, -0.2);
        S.l0 = M.clone().addScaledVector(UP, -0.2); S.l1 = S.l0.clone().addScaledVector(u, 0.1); S.f0 = 31; S.f1 = 30; S.blur = 1.0; break;
      }
      case 'wide': {
        const C = new V3(); let sp = 0; const cs = A.cast.length ? A.cast : [X]; for (const a of cs) C.add(headRef(a, new V3())); C.multiplyScalar(1 / cs.length);
        for (const a of cs) sp = Math.max(sp, headRef(a, new V3()).distanceTo(C));
        const rt = camRt(A.aud.clone().negate()); const dist = 2.4 + sp * 1.7;
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
        S.p0 = hX.clone().addScaledVector(d, 1.5).addScaledVector(toL, -0.3).addScaledVector(UP, -0.1); S.p1 = S.p0.clone().addScaledVector(toL, 0.35);
        S.l0 = hX.clone().addScaledVector(UP, -0.2).addScaledVector(toL, 0.12); S.l1 = S.l0.clone().addScaledVector(toL, 0.12); S.f0 = 31; S.f1 = 30; S.blur = 1.5; break;
      }
      case 'entr': { // 固定机位：人物从画外走到站位（背景静止，透视正确）
        const d = fwdish; S.p0 = hX.clone().addScaledVector(d, 2.6).addScaledVector(UP, -0.25); S.p1 = S.p0.clone().addScaledVector(d, -0.08);
        S.l0 = hX.clone().addScaledVector(UP, -0.4); S.l1 = S.l0.clone(); S.f0 = 33; S.f1 = 32.5; S.blur = 1.2; break;
      }
      case 'hand': { // 手部特写（跟着手走）
        const hn = X.f.bones.rightHand ? 'rightHand' : 'leftHand', hp = boneW(X, hn, new V3());
        const d = fwdish.clone().addScaledVector(camRt(fwdish), 0.35).normalize();
        S.p0 = hp.clone().addScaledVector(d, 0.62).addScaledVector(UP, 0.16); S.p1 = hp.clone().addScaledVector(d, 0.52).addScaledVector(UP, 0.13);
        S.l0 = hp.clone().addScaledVector(UP, 0.03); S.l1 = S.l0.clone(); S.f0 = 31; S.f1 = 29; S.blur = 2.6; S.follow = hn; S.fk = 0.85; break;
      }
      case 'back': { // 背影：越过她的肩膀看远处
        const r = camRt(X.facing);
        S.p0 = hX.clone().addScaledVector(X.facing, -1.05).addScaledVector(r, 0.34).addScaledVector(UP, 0.08); S.p1 = S.p0.clone().addScaledVector(X.facing, 0.18);
        S.l0 = hX.clone().addScaledVector(X.facing, 4).addScaledVector(UP, -0.25); S.l1 = S.l0.clone().addScaledVector(r, -0.2); S.f0 = 36; S.f1 = 34; S.blur = 0.45; S.dim = 0.9; break;
      }
      case 'feet': {
        const d = fwdish;
        S.p0 = feet.clone().addScaledVector(d, 0.9).addScaledVector(UP, 0.22); S.p1 = S.p0.clone().addScaledVector(d, -0.12);
        S.l0 = feet.clone().addScaledVector(UP, 0.18).addScaledVector(d, 0.1); S.l1 = S.l0.clone().addScaledVector(UP, 0.05); S.f0 = 36; S.f1 = 34; S.blur = 2.0; break;
      }
      default: { // mcu：3/4 正面中近景，留出视线方向空间
        const d = fwdish; S.p0 = hX.clone().addScaledVector(d, 1.45); S.p1 = hX.clone().addScaledVector(d, 1.25);
        const room = L ? 0.13 : 0.08, sgn = L ? Math.sign(toL.dot(camRt(d.clone().negate()))) || 1 : 1;
        const lk = hX.clone().addScaledVector(UP, -0.02); S.l0 = look3(S.p0, lk, room * sgn); S.l1 = look3(S.p1, lk, room * 0.9 * sgn); S.f0 = 27; S.f1 = 25; S.blur = 1.8; S.follow = 'head'; S.fk = 0.5;
      }
    }
    if (S.follow) { S.fa = X; S.ref = boneW(X, S.follow, new V3()); }
    if (!['ots', 'two', 'wide', 'est', 'back'].includes(type)) clearLine(S, X, hX);
    return S;
  }
  // 环境空镜：从远处高一点看这片地点（人物很小或不在），清晰背景 + 慢推
  function planEst(S, X) {
    const c = (X ? X.home : A.ctr).clone(), r = A.rng || Math.random, side = r() < 0.5 ? -1 : 1;
    const dir = A.aud.clone().applyAxisAngle(UP, side * (0.45 + r() * 0.5)), dist = 5.5 + r() * 2.5, hgt = 1.2 + r() * 0.9;
    S.p0 = c.clone().addScaledVector(dir, dist).addScaledVector(UP, hgt); S.p1 = S.p0.clone();
    S.l0 = c.clone().addScaledVector(UP, 1.0).addScaledVector(camRt(dir), side * 0.9); S.l1 = S.l0.clone();
    S.f0 = 40; S.f1 = 30; S.blur = 0; S.dim = 0.95; S.sharp = 1; S.type = 'est'; return S;
  }
  // 单人镜头：别让别的演员挡在镜头和主角之间（绕主角转相机，最多 6 次）
  const _sg = new V3(), _pt = new V3();
  function segD(p, a, b) { _sg.copy(b).sub(a); const t = clamp(_pt.copy(p).sub(a).dot(_sg) / Math.max(1e-6, _sg.lengthSq()), 0, 1); return _pt.copy(a).addScaledVector(_sg, t).distanceTo(p); }
  function clearLine(S, X, hX) {
    for (let k = 0; k < 6; k++) {
      let worst = null, wd = 0.55;
      for (const a of A.cast) { if (a === X || !a.on) continue; const h = headRef(a, new V3()), c = h.clone().addScaledVector(UP, -0.45); const d = Math.min(segD(h, S.p0, hX), segD(c, S.p0, hX), segD(h, S.p1, hX), segD(c, S.p1, hX)); if (d < wd) { wd = d; worst = h; } }
      if (!worst) return;
      const v = S.p0.clone().sub(hX), w = worst.clone().sub(hX), side = Math.sign(v.x * w.z - v.z * w.x) || 1;
      const q = new THREE.Quaternion().setFromAxisAngle(UP, side * 0.3);
      for (const kk of ['p0', 'p1', 'l0', 'l1']) S[kk] = S[kk].clone().sub(hX).applyQuaternion(q).add(hX);
    }
  }
  const SHOT = { cLow: 'low', cFace: 'mcu', cOS: 'ots', cEyes: 'ecu', cHand: 'side', cTwo: 'two', cOver: 'two', cWide: 'wide' };
  const _c = new V3(), _l = new V3(), _fd = new V3();
  function camAt(S, u, t, dt) {
    const e = sm(u) * 0.7 + u * 0.3; _c.lerpVectors(S.p0, S.p1, e); _l.lerpVectors(S.l0, S.l1, e);
    if (S.follow && S.fa && dt != null) { boneW(S.fa, S.follow, _fd).sub(S.ref).multiplyScalar(S.fk || 0.6); if (!S.fv) S.fv = _fd.clone(); else S.fv.lerp(_fd, 1 - Math.exp(-dt * 4)); _c.add(S.fv); _l.add(S.fv); }
    const hh = S.sharp ? 0.5 : 1; // 手持感：很轻（空镜更稳）
    _c.x += (Math.sin(t * 0.9) * 0.006 + Math.sin(t * 2.3) * 0.002) * hh; _c.y += Math.sin(t * 1.3 + 1) * 0.004 * hh; _l.y += Math.sin(t * 1.1 + 2) * 0.003 * hh;
    return { p: _c, l: _l, fov: lerp(S.f0, S.f1, e), roll: Math.sin(t * 0.7) * 0.004 * hh };
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
    const bw = Math.max(1, Math.round(sz.x * pr * (S.sharp ? 0.75 : 0.3))), bh = Math.max(1, Math.round(bw / A.asp));
    const rt = rtFor(renderer, bw, bh), c = T.bgCam, m = camAt(S, 0, A.t);
    const fBg = Math.max(S.f0, S.f1) + 2; // 拍得比镜头略宽，慢推/变焦时用 uZ 缩放，不露边
    c.aspect = A.asp; c.fov = fBg; c.near = 0.1; c.far = 2000; c.position.copy(m.p); c.up.set(0, 1, 0); c.lookAt(m.l); c.updateProjectionMatrix(); c.updateMatrixWorld(true);
    S.fBg = fBg;
    const hide = []; try { for (const fn of A.hideFns) fn(hide); } catch (e) { }
    const sky = W.sc.userData && W.sc.userData.skyM, skyP = sky ? sky.position.clone() : null; if (sky) sky.position.copy(c.position);
    const prevT = renderer.getRenderTarget(), ac = renderer.autoClear; renderer.autoClear = true;
    try { renderer.setRenderTarget(rt); renderer.clear(); renderer.render(W.sc, c); } catch (e) { console.warn('cine bg', e); }
    renderer.setRenderTarget(prevT); renderer.autoClear = ac;
    if (sky) sky.position.copy(skyP); for (const [o, v] of hide) o.visible = v;
    const b = S.blur || 0; T.bgMat.uniforms.uR.value.set(0.0085 * b, 0.0085 * b * A.asp);
    T.bgMat.uniforms.uDim.value = S.dim || (S.type === 'wide' || S.type === 'two' ? 0.8 : 0.66);
    T.bgMat.uniforms.uSat.value = S.sharp ? 0.92 : 0.8;
    // 背景照片只在镜头起点拍：相机平移后只做缩放，所以起点相机必须等于拍照相机（不加跟随偏移）
  }

  // ================= 剧本（beats 原样使用；castFo → 演员） =================
  function convert(beats) {
    const actOf = fo => fo ? A.byFo.get(fo) || null : null, out = [];
    const findSpk = (l, def) => {
      if (l.it || !l.w || l.w === '我') return null;
      if (l.who) return actOf(l.who) || def;
      const w = String(l.w).split(' · ')[0];
      for (const a of A.acts) { const n = a.nm || ''; if (!n) continue; if (w === n || n.startsWith(w) || w.startsWith(n) || n.split('·')[0] === w.split('·')[0]) return a; }
      return def;
    };
    let lastScene = null;
    beats.forEach((b, i) => {
      const X = actOf(b.castFo) || null;
      let scene = b.scene || null; if (!scene && i === 0) scene = { key: 'A' };
      if (scene) lastScene = scene;
      const lines = (b.stake ? [] : (b.lines || [])).map(l => Object.assign({}, l, { spk: findSpk(l, X) }));
      const actL = b.act ? (b.act instanceof Map ? [...b.act] : b.act).map(([s, c]) => [actOf(s), c]).filter(x => x[0]) : [];
      out.push({ src: b, X, shot: b.stake ? 'two' : SHOT[b.shot] || b.shot || 'mcu', lines, scene, act: actL, walk: b.walk ? Object.assign({}, b.walk, { a: actOf(b.walk.who) }) : null, tr: b.tr || (scene && i ? 'dip' : 'cut'),
        card: b.card || null, cc: b.cc && !b.cc2 ? b.cc : null, boost: b.boost || null, stake: b.stake || null, tag: b.tag || '', min: b.min || 0, react: b.react !== false, mean: b.mean || null });
    });
    let last = null; for (const o of out) { if (o.mean) last = o.mean; else if (!o.boost && !o.stake) o.mean = last; } // 没写意义的镜头沿用上一幕
    return out;
  }

  // ================= UI =================
  let root = null, el = {};
  function css() {
    if (document.getElementById('csCss')) return; const s = document.createElement('style'); s.id = 'csCss';
    s.textContent = `
body.cscine>*:not(#game):not(#csRoot):not(script):not(style):not(link){visibility:hidden!important;pointer-events:none!important}
body.cscine .wsay,body.cscine .hbub,body.cscine .wlabel{visibility:hidden!important}
body.cscine #hud,body.cscine .hud,body.cscine #crosshair,body.cscine #xh,body.cscine #skills,body.cscine #bar,body.cscine #toast,body.cscine .float,body.cscine #minimap,body.cscine #compass,body.cscine #sgRoot,body.cscine #nsHud,body.cscine .wsay,body.cscine .hbub,body.cscine .wlabel,body.cscine #wRoot,body.cscine #hubBtn,body.cscine #mmBox,body.cscine #nemChip,body.cscine #h2Hud,body.cscine #tbBar,body.cscine #hpC,body.cscine #tbCol,body.cscine #rqHud,body.cscine #cross,body.cscine #combatHud,body.cscine #hitHud,body.cscine #icCard,body.cscine #atkCd,body.cscine #tut,body.cscine #tutArrow,body.cscine #arTrack,body.cscine #mtTrack,body.cscine #sgTrack{visibility:hidden!important}
#csRoot{position:fixed;inset:0;z-index:9500;pointer-events:none;font-family:"Noto Serif SC","Source Han Serif SC","Songti SC",serif;color:#f4ece0;display:none}
#csRoot.on{display:block}
#csRoot .bar{position:absolute;left:0;right:0;height:var(--bh,12vh);background:#000;transition:transform .7s cubic-bezier(.2,.8,.2,1)}
#csRoot .bar.t{top:0;transform:translateY(-100%)}#csRoot .bar.b{bottom:0;transform:translateY(100%)}
#csRoot.in .bar{transform:none}
#csRoot .blk{position:absolute;inset:0;background:#000;opacity:1;transition:opacity .45s}
#csRoot .blk.off{opacity:0}
#csRoot .sub{position:absolute;left:50%;bottom:calc(var(--bh,12vh) * .5);transform:translate(-50%,50%);width:min(1100px,88vw);text-align:center}
#csRoot .sub:before{content:"";position:absolute;left:-5vw;right:-5vw;top:-16px;bottom:-12px;background:radial-gradient(ellipse at 50% 55%,rgba(0,0,0,.66),transparent 76%);z-index:-1}
#csRoot .who{font-family:system-ui,"PingFang SC","Microsoft YaHei",sans-serif;font-size:clamp(15px,1.3vw,21px);letter-spacing:.22em;font-weight:800;margin-bottom:6px;opacity:0;transition:opacity .25s;text-shadow:0 1px 8px #000,0 0 3px #000}
#csRoot .who i{font-style:normal;font-size:.72em;font-weight:600;letter-spacing:.1em;margin-left:.9em;color:#d8cdbd}
#csRoot .who.on{opacity:1}
#csRoot .ln{font-size:clamp(21px,2vw,32px);font-weight:600;line-height:1.5;letter-spacing:.05em;text-shadow:0 2px 12px rgba(0,0,0,.95),0 0 3px #000;min-height:1.5em;opacity:0;transition:opacity .2s}
#csRoot .ln.on{opacity:1}#csRoot .ln.it{font-style:italic;color:#d9cdb8}
#csRoot .ln .gh{opacity:0}
#csRoot .lt{position:absolute;right:6vw;text-align:right;bottom:calc(var(--bh,12vh) + 5vh);opacity:0;transform:translateX(18px);transition:opacity .5s,transform .7s cubic-bezier(.2,.9,.3,1)}
#csRoot .lt.on{opacity:1;transform:none}
#csRoot .lt:before{content:"";position:absolute;left:-7vw;right:-8vw;top:-3vh;bottom:-3vh;background:radial-gradient(ellipse at 70% 50%,rgba(0,0,0,.55),transparent 72%);z-index:-1}
#csRoot .lt .k{font-family:system-ui,"PingFang SC",sans-serif;font-size:11px;letter-spacing:.45em;color:var(--c,#e7c27a);margin-bottom:6px}
#csRoot .lt .n{font-size:clamp(26px,2.6vw,40px);font-weight:900;letter-spacing:.08em;line-height:1.1;text-shadow:0 3px 18px rgba(0,0,0,.8)}
#csRoot .lt .rule{height:2px;width:0;background:linear-gradient(270deg,var(--c,#e7c27a),transparent);margin:9px 0 7px auto;transition:width .9s .15s cubic-bezier(.2,.9,.3,1)}
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
#csRoot .ep{position:absolute;left:4vw;top:calc(var(--bh,12vh) + 6.4vh);max-width:min(460px,42vw);padding:10px 18px 10px 14px;border-left:3px solid var(--ec,#e7c27a);background:linear-gradient(90deg,rgba(0,0,0,.68),rgba(0,0,0,0));opacity:0;transition:opacity .6s,left .9s,top .9s,max-width .9s,padding .9s;font-family:system-ui,"PingFang SC",sans-serif}
#csRoot .ep.on{opacity:1}
#csRoot .ep .k{font-size:12px;letter-spacing:.4em;color:var(--ec,#e7c27a)}
#csRoot .ep .n{font-size:19px;font-weight:900;letter-spacing:.05em;margin-top:3px;text-shadow:0 2px 10px #000;transition:font-size .9s}
#csRoot .ep .s{font-size:13px;color:#d8cdbd;margin-top:3px;text-shadow:0 1px 6px #000}
#csRoot .ep .c{margin-top:8px;display:flex;flex-direction:column;gap:3px}
#csRoot .ep .c span{text-shadow:0 1px 6px #000}#csRoot .ep .c b{color:var(--cc,#f0e6d8);font-size:14px;margin-right:8px;transition:font-size .9s}#csRoot .ep .c i{font-style:normal;font-size:12px;color:#cdbfae}
#csRoot .ep .nt{margin-top:6px;font-size:11.5px;color:#a89c8c}
#csRoot .ep.big{left:6vw;top:calc(var(--bh,12vh) + 5vh);max-width:min(760px,72vw);padding:20px 34px 20px 24px}
#csRoot .ep.big .n{font-size:clamp(30px,3vw,46px)}#csRoot .ep.big .s{font-size:clamp(14px,1.2vw,18px)}#csRoot .ep.big .c b{font-size:clamp(17px,1.5vw,24px)}#csRoot .ep.big .c i{font-size:clamp(13px,1.1vw,16px)}
#csRoot .mn{position:absolute;right:4vw;top:calc(var(--bh,12vh) + 6.4vh);width:min(390px,36vw);padding:12px 16px;border-left:3px solid var(--mc,#e7c27a);background:linear-gradient(90deg,rgba(0,0,0,.72),rgba(0,0,0,.45));opacity:0;transform:translateX(18px);transition:opacity .45s,transform .6s cubic-bezier(.2,.9,.3,1);font-family:system-ui,"PingFang SC",sans-serif;text-shadow:0 1px 6px #000}
#csRoot .mn.on{opacity:1;transform:none}
#csRoot .mn .k{font-size:11px;letter-spacing:.4em;color:var(--mc,#e7c27a)}
#csRoot .mn .t{font-size:clamp(15px,1.25vw,19px);font-weight:800;margin:4px 0 8px;line-height:1.4}
#csRoot .mn .f{font-size:clamp(13px,1.05vw,15px);line-height:1.6;color:#e8dcc8}
#csRoot .mn .f b{display:inline-block;margin-right:8px;padding:0 7px;font-size:11px;letter-spacing:.2em;background:var(--mc,#e7c27a);color:#140e0a;border-radius:2px}
#csRoot .vq{position:absolute;left:50%;top:calc(50% + 44px);transform:translateX(-50%);text-align:center;font-family:system-ui,"PingFang SC",sans-serif;color:#e8dcc8;opacity:0;transition:opacity .4s;max-width:80vw}
#csRoot .vq.on{opacity:1}
#csRoot .vq .h{font-size:12px;letter-spacing:.5em;color:var(--tc,#e7c27a);margin-bottom:8px}
#csRoot .vq .l{font-size:clamp(15px,1.3vw,20px);line-height:1.8;text-shadow:0 2px 8px #000}#csRoot .vq .l.d{font-size:13px;color:#a89c8c}
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
#csRoot .fd{position:absolute;inset:0;width:100%;height:100%;opacity:0}
#csRoot .fl{position:absolute;inset:0;background:#fff;opacity:0}
#csRoot .fl.on{animation:csFl .7s ease-out}
@keyframes csFl{0%{opacity:.9}100%{opacity:0}}
#csRoot .loc{position:absolute;left:4.2vw;bottom:calc(var(--bh,12vh) + 3.2vh);opacity:0;transform:translateY(8px);transition:opacity .8s,transform 1s cubic-bezier(.2,.9,.3,1);text-shadow:0 2px 12px rgba(0,0,0,.9)}
#csRoot .loc.on{opacity:1;transform:none}
#csRoot .loc .c{font-size:clamp(18px,1.7vw,26px);font-weight:700;letter-spacing:.18em}
#csRoot .loc .c:before{content:"";display:inline-block;width:28px;height:1px;background:var(--tc,#e7c27a);vertical-align:middle;margin-right:12px}
#csRoot .loc .s{margin:6px 0 0 40px;font-family:system-ui,"PingFang SC",sans-serif;font-size:12px;letter-spacing:.3em;color:#d8ccb8}
@keyframes csLd{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}
@keyframes csIn{to{opacity:1;transform:none}}`;
    document.head.appendChild(s);
  }
  function ensureUI() {
    css(); if (root && root.isConnected) return;
    root = document.createElement('div'); root.id = 'csRoot';
    root.innerHTML = `<canvas class="fd"></canvas><div class="fl"></div><div class="blk"></div><div class="bar t"></div><div class="bar b"><div class="prog"></div></div><div class="ld"></div><div class="tag"></div>
<div class="loc"><div class="c"></div><div class="s"></div></div>
<div class="lt"><div class="k"></div><div class="n"></div><div class="rule"></div><div class="t"></div><div class="ch"></div></div>
<div class="ttl"><div class="a"></div><div class="b"></div><div class="c"></div></div>
<div class="bst"></div><div class="sh"></div><div class="ep"></div><div class="mn"></div><div class="vq"></div>
<div class="stk"><div class="cd g" style="--sc:#ffe28a"><div class="h">若 她 倒 下</div><div class="v"></div><div class="e"></div></div><div class="cd x" style="--sc:#ff9a8a"><div class="h">若 她 活 着</div><div class="v"></div><div class="e"></div></div></div>
<div class="sub"><div class="who"></div><div class="ln"></div></div>
<div class="hint"><b>空格</b>继续　<b>Esc</b>跳过</div>`;
    document.body.appendChild(root);
    const q = s => root.querySelector(s);
    el = { fd: q('.fd'), fl: q('.fl'), blk: q('.blk'), who: q('.who'), ln: q('.ln'), lt: q('.lt'), ttl: q('.ttl'), tag: q('.tag'), loc: q('.loc'), bst: q('.bst'), stk: q('.stk'), sg: q('.cd.g'), sx: q('.cd.x'), sh: q('.sh'), ep: q('.ep'), mn: q('.mn'), vq: q('.vq'), prog: q('.prog'), ld: q('.ld') };
    root.addEventListener('pointerdown', () => { if (A && A.phase === 'play') next(); });
  }
  function barH() { const w = innerWidth, h = innerHeight; return Math.max(h * 0.085, (h - w / 2.39) / 2); }
  function showTitle(a, b, c) { el.ttl.querySelector('.a').textContent = a || ''; el.ttl.querySelector('.b').textContent = b || ''; el.ttl.querySelector('.c').textContent = c || ''; el.ttl.classList.add('on'); }
  function showLT(a, cc) {
    const c = cc || { k: '', n: a.nm, t: a.title, ch: [], col: a.col };
    el.lt.style.setProperty('--c', c.col || a.col); el.lt.querySelector('.k').textContent = c.k || ''; el.lt.querySelector('.n').textContent = c.n || a.nm;
    el.lt.querySelector('.t').textContent = c.t || ''; el.lt.querySelector('.ch').innerHTML = (c.ch || []).slice(0, 3).map(x => `<span>${esc(x)}</span>`).join('');
    el.lt.classList.remove('on'); void el.lt.offsetWidth; el.lt.classList.add('on'); A.ltT = 3.8;
  }
  function showLoc(c, s) { el.loc.querySelector('.c').textContent = c || ''; el.loc.querySelector('.s').textContent = s || ''; el.loc.classList.remove('on'); void el.loc.offsetWidth; el.loc.classList.add('on'); A.locT = 3.6; }
  function showBoost(B) {
    if (!B) { el.bst.classList.remove('on'); return; }
    el.bst.style.setProperty('--nc', B.col || '#ffb070');
    el.bst.innerHTML = `<div class="k">${esc(B.k)}</div><div class="n">${esc(B.n)}</div>${B.lv ? `<div class="lv">${B.lv}</div>` : ''}` + (B.rows || []).map((r, i) => `<div class="r" style="animation-delay:${0.4 + i * 0.3}s"><i>${r.ic}</i><div><div class="a" style="color:${r.col || '#fff'}">${esc(r.a)}</div><div class="e">${esc(r.e)}</div></div></div>`).join('') + (B.f ? `<div class="f">${esc(B.f)}</div>` : '');
    el.bst.classList.remove('on'); void el.bst.offsetWidth; el.bst.classList.add('on');
  }
  function hideAll() { if (!el.ttl) return; for (const k of ['ttl', 'lt', 'bst', 'stk', 'sg', 'sx', 'sh', 'tag', 'ln', 'who', 'loc', 'ep', 'mn', 'vq']) el[k].classList.remove('on'); el.mn._m = null; }
  // 每一幕的意义：这一幕在讲什么 + 对游戏造成的影响
  function showMean(m) {
    if (!m) { el.mn.classList.remove('on'); el.mn._m = null; return; }
    if (el.mn._m === m) return; el.mn._m = m;
    const fx = [].concat(m.fx || []).filter(Boolean);
    el.mn.style.setProperty('--mc', m.col || (A && A.o && A.o.col) || '#e7c27a');
    el.mn.innerHTML = `<div class="k">🎬 这 一 幕</div><div class="t">${m.ic ? esc(m.ic) + ' ' : ''}${esc(m.t || '')}</div>${fx.length ? `<div class="f"><b>影响</b>${fx.map(esc).join('<br>')}</div>` : ''}`;
    el.mn.classList.remove('on'); void el.mn.offsetWidth; setTimeout(() => { if (el.mn._m === m) el.mn.classList.add('on'); }, 350);
  }
  // 剧情信息牌：开场大字展示「这是什么剧情 / 登场角色是谁」，5.5 秒后缩到角落常驻
  function showEp(E) {
    if (!E || !el.ep) return; el.ep.style.setProperty('--ec', E.col || '#e7c27a');
    el.ep.innerHTML = `<div class="k">${esc(E.kind || '')}</div><div class="n">${esc(E.title || '')}</div>${E.sub ? `<div class="s">${esc(E.sub)}</div>` : ''}<div class="c">${(E.cast || []).map(c => `<span style="--cc:${esc(c.col || '#f0e6d8')}"><b>${esc(c.n)}</b>${c.t ? `<i>${esc(c.t)}</i>` : ''}</span>`).join('')}</div>${E.note ? `<div class="nt">${esc(E.note)}</div>` : ''}`;
    el.ep.classList.add('big'); void el.ep.offsetWidth; el.ep.classList.add('on'); if (A) A.epT = 0;
  }
  // 进图黑场时列出将要播放的电影序列
  let vqKey = '';
  function veilInfo() {
    const L = []; try { if (window.NemStory && NemStory.preview) L.push(...NemStory.preview()); } catch (e) { }
    try { const sg = window.Saga && Saga.T, W = window.Worlds && Worlds._W; if (sg && !sg.cinDone && !sg.noNode && Saga.on()) { const nd = W && W.graph && W.graph.nodes[W.cur]; L.push('地区电影 · ' + ((nd && nd.loc && nd.loc.n) || '新的地区')); } } catch (e) { }
    return L;
  }
  function updateVq() {
    const L = veilInfo(), key = L.join('|'); if (key === vqKey) return; vqKey = key;
    if (!L.length) { el.vq.classList.remove('on'); return; }
    el.vq.innerHTML = `<div class="h">🎬 即 将 播 放</div>` + L.map((t, i) => `<div class="l${/^之后/.test(t) ? ' d' : ''}">${/^之后/.test(t) ? '' : ['①', '②', '③', '④'][i] + ' '}${esc(t)}</div>`).join(''); el.vq.classList.add('on');
  }

  // ================= 播放 =================
  const lineDur = l => clamp(0.9 + String(l.t).replace(/[“”「」—…，。？！、]/g, '').length * 0.12, 1.8, 6.2);
  async function play(o) {
    if (A || !o || !o.beats || !o.beats.length || !o.actors || !o.actors.length || !o.world) return false;
    ensureUI(); const T = stage();
    A = { phase: 'build', o, t0: now(), acts: [], hideFns: o.hide ? [o.hide] : [], world: o.world, asp: 2.39, t: 0, last: 0, spots: new Map(), byFo: new Map(), cast: [], rng: mul((Math.random() * 1e9) | 0) };
    root.style.setProperty('--tc', o.col || '#e7c27a'); root.style.setProperty('--bh', barH() + 'px');
    root.className = 'on'; el.blk.classList.remove('off'); el.ld.classList.add('on'); hideAll(); veilShown = false;
    document.body.classList.add('cscine');
    try { G() && G().setUI && G().setUI(true); } catch (e) { }
    const g = G(); A.saved = []; try { for (const c of g.camera.children) { A.saved.push([c, c.visible]); c.visible = false; } } catch (e) { }
    let ok = false; const me = A; setTimeout(() => { if (A === me && A.phase === 'build') { console.warn('CineStage: build timeout'); stop(false); } }, 45000);
    try {
      const used = new Set();
      for (const sp of o.actors) { if (sp.body) { used.add(sp.body); continue; } try { if (window.IdLook) IdLook.apply(sp.h); const h = sp.h; sp.body = Foe.bodyFor(h, mul(((h.look.seed || 7) * 2654435761) >>> 0), !!sp.boss, used); used.add(sp.body); } catch (e) { } }
      const built = await Promise.all(o.actors.map(sp => buildActor(sp, used).catch(e => { console.warn('CineStage actor', e); return null; }))); // 模型并行搭（身体模板有缓存 Promise，不会重复读）
      if (A !== me) { dropActors(built.filter(Boolean)); return false; }
      if (built.some(a => !a)) { dropActors(built.filter(Boolean)); throw new Error('actor build failed'); }
      o.actors.forEach((sp, i) => { A.acts.push(built[i]); A.byFo.set(sp, built[i]); });
      for (const a of A.acts) { const pr = a.spec.pair; a.pair = pr ? A.byFo.get(pr) || null : null; T.sc.add(a.f.root); T.sc.add(a.sh); setClip(a, a.idle, 0); try { a.f.mixer.setTime(Math.random() * 3); } catch (e) { } }
      matchLights(A.world.sc);
      A.beats = convert(o.beats);
      enterScene(A.beats[0].scene || { key: 'A' });
      try { const r = g.renderer || o.renderer; T.cam.position.copy(A.ctr).addScaledVector(A.aud, 3).addScaledVector(UP, 1.4); T.cam.lookAt(A.ctr.clone().addScaledVector(UP, 1.2)); T.cam.updateMatrixWorld(true); for (const a of A.acts) show(a, true); r.compile(T.sc, T.cam); for (const a of A.acts) show(a, A.cast.includes(a)); } catch (e) { }
      ok = true;
    } catch (e) { console.warn('CineStage build', e); }
    if (A !== me) return false;
    if (!ok) { stop(false); return false; }
    A.phase = 'play'; A.bi = -1; A.t = 0; A.last = now();
    el.ld.classList.remove('on'); root.classList.add('in');
    beginBeat(0, true);
    showEp(o.episode);
    setTimeout(() => { if (A === me) el.blk.classList.add('off'); }, 150);
    return true;
  }
  // 进入下一拍：按转场方式处理
  function beginBeat(i, first) {
    const b = A.beats[i]; if (!b) return stop(true);
    const tr = first ? 'cut' : b.tr;
    el.ln.classList.remove('on'); el.who.classList.remove('on');
    if (tr === 'dip') { A.trans = { k: 'dip', t: 0, i }; el.blk.classList.remove('off'); return; }
    if (tr === 'dissolve') { A.capReq = () => coreBeat(i); return; }
    if (tr === 'flash') { el.fl.classList.remove('on'); void el.fl.offsetWidth; el.fl.classList.add('on'); }
    coreBeat(i);
  }
  function coreBeat(i) {
    const b = A.beats[i];
    A.bi = i; A.bt = 0; A.li = -1; A.cut = null; A.lineT = 0; A.typed = 0; A.done = false; A.chars = [];
    el.prog.style.width = ((i + 1) / A.beats.length * 100).toFixed(1) + '%';
    for (const k of ['ttl', 'stk', 'sg', 'sx', 'sh']) el[k].classList.remove('on');
    el.tag.textContent = b.tag || ''; el.tag.classList.toggle('on', !!b.tag);
    if (!b.boost) showBoost(null);
    showMean(b.boost || b.stake ? null : b.mean);
    if (b.scene && (i > 0 || A.scene !== b.scene)) enterScene(b.scene);
    if (b.scene && b.scene.cap && !b.card) showLoc(b.scene.cap, b.scene.sub);
    // 动作 / 走位
    for (const [a, c] of b.act) { a.idle = c; setClip(a, c, 0); try { a.f.mixer.update(0.001); a.f.root.updateMatrixWorld(true); } catch (e) { } }
    if (b.walk && b.walk.a && b.walk.a.on) {
      const a = b.walk.a, d = b.walk.d || 2.6, rt = camRt(A.aud), sd = b.walk.side || (a.home.clone().sub(A.ctr).dot(rt) >= 0 ? 1 : -1);
      const from = a.home.clone().addScaledVector(rt, sd * d).addScaledVector(A.aud, -0.6), dir = a.home.clone().sub(from).setY(0);
      a.walk = { from, to: a.home.clone(), t: 0, dur: dir.length() / (b.walk.speed || 1.15), yw: Math.atan2(dir.x, dir.z) };
      a.f.root.position.copy(from); if (a.f._L) { a.f._L.lastP = null; a.f._L.s = 0; } setClip(a, b.walk.clip || 'Walk_Loop', 0);
    }
    b.lead = b.card ? (b.lines.length ? 2.8 : 0.4) : (b.walk ? 1.2 : 0.45);
    b.cardShow = b.card ? [b.card.a, b.card.b, b.card.c] : null; b.cardOn = b.cardOff = b.bOn = false;
    if (b.stake) {
      el.sg.querySelector('.v').textContent = b.stake.good || ''; el.sx.querySelector('.v').textContent = b.stake.bad || '';
      el.sg.querySelector('.e').textContent = b.stake.ge || ''; el.sx.querySelector('.e').textContent = b.stake.be || '';
      el.sh.textContent = b.stake.head || '';
    }
    b.total = b.stake ? 7.5 : b.lead + b.lines.reduce((s, l) => s + lineDur(l) + 0.35, 0) + 0.5; b.total = Math.max(b.total, b.min || 0, b.lines.length ? 0 : 3.2);
    try { if (A.o.onBeat) A.o.onBeat(b.src, i); } catch (e) { console.warn('cine beat', e); }
    const l0 = b.lines[0], X = b.shot === 'est' ? b.X : ((l0 && l0.spk && l0.spk.on && !['hand', 'back', 'feet', 'entr', 'low', 'side'].includes(b.shot)) ? l0.spk : b.X || A.cast[0]);
    cutTo(b.walk && b.shot !== 'est' ? 'entr' : b.shot, X, b);
    if (b.cc && b.X) showLT(b.X, b.cc);
  }
  function partnerOf(X) { if (!X) return null; if (X.pair && X.pair.on) return X.pair; return A.cast.find(a => a !== X && a.on) || null; }
  function cutTo(type, X, b) {
    const L = partnerOf(X); A.cut = { S: planShot(type, X, L), t: 0, X, L, dur: clamp(b ? b.total : 4, 2.5, 9) };
    lightFor(A.cut.S, X ? headRef(X, new V3()).addScaledVector(UP, -0.4) : A.ctr.clone().addScaledVector(UP, 1.1));
    // 注视：所有人看说话者；说话者看搭档（独白时看向观众侧前方一点，不正对镜头）
    for (const a of A.cast) {
      if (!X) { a.hasT = false; continue; }
      if (a === X) { if (L) headRef(L, a.tgt).addScaledVector(UP, 0.08); else a.tgt.copy(headRef(a, new V3())).addScaledVector(A.aud, 3).addScaledVector(camRt(A.aud), 0.8); a.hasT = true; }
      else { headRef(X, a.tgt).addScaledVector(UP, 0.08); a.hasT = true; }
    }
    if (A.renderer) shootBg(A.renderer, A.cut.S); else A.needBg = true;
  }
  function startLine(b, li) {
    const l = b.lines[li]; A.li = li; A.lineT = 0; A.typed = 0; A.lineD = lineDur(l); A.reactAt = 0;
    const spk = l.spk && l.spk.on ? l.spk : null;
    if (li > 0 && spk && A.cut && spk !== A.cut.X && A.cut.S.type !== 'est') cutTo(spk.pair && A.cut.X === spk.pair ? 'ots' : 'mcu', spk, null);
    // 反应镜头：长台词说到一半，切到听者
    const lst = spk && partnerOf(spk);
    if (b.react && spk && lst && String(l.t).length > 15 && A.rng() < 0.55 && A.cut && ['mcu', 'ots', 'ecu'].includes(A.cut.S.type)) A.reactAt = A.lineD * (0.5 + A.rng() * 0.15);
    for (const a of A.acts) {
      if (a === spk) { a.talkT = A.lineD * 0.85; a.nodT = 0; if (STAND.has(a.idle) && !a.walk) setClip(a, 'Idle_Talking_Loop'); }
      else if (a.clip === 'Idle_Talking_Loop' && a.idle !== 'Idle_Talking_Loop' && !a.walk) setClip(a, a.idle, 0.8);
    }
    el.who.innerHTML = l.it ? '' : esc(l.w || '') + (spk && spk.title && l.w ? `<i>${esc(spk.title)}</i>` : ''); el.who.style.color = l.col || '#e7c27a'; el.who.classList.toggle('on', !!l.w && !l.it);
    el.ln.classList.toggle('it', !!l.it); el.ln.style.color = l.it ? '' : '#f6efe4';
    A.chars = Array.from(String(l.t)); el.ln.innerHTML = `<span class="vis"></span><span class="gh">${esc(l.t)}</span>`; el.ln.classList.add('on');
  }
  function typeTo(n) { const v = el.ln.querySelector('.vis'), gh = el.ln.querySelector('.gh'); if (!v) return; v.textContent = A.chars.slice(0, n).join(''); gh.textContent = A.chars.slice(n).join(''); }
  function update(dt) {
    if (!A || A.phase !== 'play') return;
    A.t += dt; if (A.epT != null) { A.epT += dt; if (A.epT > 5.5) { A.epT = null; el.ep.classList.remove('big'); } }
    if (A.trans) { // 黑场转场：0.45s 变黑 → 换场 → 变亮
      const tr = A.trans; tr.t += dt;
      if (tr.t >= 0.5 && !tr.done) { tr.done = true; coreBeat(tr.i); el.blk.classList.add('off'); }
      if (tr.t < 0.5) return; if (tr.t > 0.7) A.trans = null;
    }
    if (A.capReq) return;
    A.bt += dt; const b = A.beats[A.bi]; if (!b) return;
    if (A.cut) A.cut.t += dt;
    if (A.ltT > 0 && (A.ltT -= dt) <= 0) el.lt.classList.remove('on');
    if (A.locT > 0 && (A.locT -= dt) <= 0) el.loc.classList.remove('on');
    if (b.cardShow && A.bt > 0.35 && !b.cardOn) { b.cardOn = true; showTitle(...b.cardShow); }
    if (b.cardOn && !b.cardOff && A.bt > (b.lines.length ? b.lead - 0.2 : b.total - 0.6) && !b.finale) { b.cardOff = true; el.ttl.classList.remove('on'); }
    if (b.boost && A.bt > 0.5 && !b.bOn) { b.bOn = true; showBoost(b.boost); }
    if (b.stake) { if (A.bt > 0.3) el.stk.classList.add('on'); if (A.bt > 0.6) el.sg.classList.add('on'); if (A.bt > 2.2) el.sx.classList.add('on'); if (A.bt > 1 && b.stake.head) el.sh.classList.add('on'); }
    if (b.lines.length) {
      if (A.li < 0 && A.bt >= b.lead) startLine(b, 0);
      else if (A.li >= 0) {
        A.lineT += dt;
        const n = Math.min(A.chars.length, Math.floor(A.lineT * 26)); if (n !== A.typed) { A.typed = n; typeTo(n); }
        if (A.reactAt && A.lineT > A.reactAt) { A.reactAt = 0; const l = b.lines[A.li], lst = l.spk && partnerOf(l.spk); if (lst) cutTo('mcu', lst, null), lst.nodT = 0.15; for (const a of A.cast) if (a !== l.spk) headRef(l.spk, a.tgt).addScaledVector(UP, 0.08); }
        if (A.lineT > A.lineD + 0.35) {
          if (A.li < b.lines.length - 1) startLine(b, A.li + 1);
          else if (!A.done) { A.done = true; A.doneT = A.bt; }
        }
      }
    } else if (!A.done && A.bt > b.total) { A.done = true; A.doneT = A.bt; }
    if (!A.done && A.bt > b.total + 3) { A.done = true; A.doneT = A.bt; }
    if (A.done && A.bt > A.doneT + (b.boost || b.card ? 1.0 : 0.25)) advance();
  }
  function advance() { if (A.bi < A.beats.length - 1) beginBeat(A.bi + 1); else stop(true); }
  function next() {
    if (!A || A.phase !== 'play' || A.trans || A.capReq) return; const b = A.beats[A.bi]; if (!b || A.bt < 0.45) return;
    if (A.li >= 0 && A.typed < A.chars.length) { A.typed = A.chars.length; typeTo(A.typed); A.lineT = Math.max(A.lineT, A.chars.length / 26); return; }
    if (A.li >= 0 && A.li < b.lines.length - 1) { startLine(b, A.li + 1); return; }
    if (b.lines.length && A.li < 0) { startLine(b, 0); return; }
    advance();
  }
  // 截当前画面给溶接用（必须在 render 之后、同一帧里）
  function capture(renderer) {
    try {
      const src = renderer.domElement, cv = el.fd; cv.width = Math.max(2, src.width >> 1); cv.height = Math.max(2, src.height >> 1);
      cv.getContext('2d').drawImage(src, 0, 0, cv.width, cv.height);
      cv.style.transition = 'none'; cv.style.opacity = '1'; void cv.offsetWidth; cv.style.transition = 'opacity .8s ease'; requestAnimationFrame(() => { cv.style.opacity = '0'; });
    } catch (e) { }
  }
  // 每帧由宿主调用（worlds.js 的渲染处）。返回 true = 本帧已由摄影棚渲染
  function draw(renderer) {
    if (!A) return false;
    const T = stage(); A.renderer = renderer;
    const tn = now(), dt = Math.min(0.05, Math.max(0, tn - (A.last || tn))); A.last = tn;
    const sz = renderer.getSize(new THREE.Vector2());
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
        const S = A.cut.S, m = camAt(S, A.cut.t / A.cut.dur, A.t, dt), c = T.cam;
        c.aspect = A.asp; c.fov = m.fov; c.position.copy(m.p); c.up.set(Math.sin(m.roll), Math.cos(m.roll), 0); c.lookAt(m.l); c.updateProjectionMatrix(); c.updateMatrixWorld(true);
        T.bgMat.uniforms.uZ.value = S.fBg ? Math.tan(m.fov * Math.PI / 360) / Math.tan(S.fBg * Math.PI / 360) : 1;
        const ac = renderer.autoClear; renderer.autoClear = false;
        renderer.setViewport(0, bh, sz.x, vh); renderer.setScissor(0, bh, sz.x, vh); renderer.setScissorTest(true);
        renderer.clearDepth(); renderer.render(T.sc, c);
        renderer.setScissorTest(false); renderer.setViewport(0, 0, sz.x, sz.y); renderer.autoClear = ac;
        if (A.capReq) { const fn = A.capReq; A.capReq = null; capture(renderer); fn(); }
      } else if (A.capReq) { const fn = A.capReq; A.capReq = null; fn(); }
    }
    renderer.setClearColor(cc, ca);
    return true;
  }
  function stop(natural, skipped) {
    if (!A) return; const a0 = A; A = null; graceT = performance.now() + 2200;
    let sumList = null; if (skipped && a0.beats) sumList = a0.beats.slice(Math.max(0, a0.bi)).filter(b => b.boost && !b.bOn).map(b => b.boost);
    window.__skipMenuUntil = performance.now() + 1500;
    el.blk.classList.remove('off'); hideAll();
    setTimeout(() => { if (!A && root && !veilShown) root.className = ''; }, 380);
    try { root.classList.remove('in'); } catch (e) { }
    document.body.classList.remove('cscine');
    try { for (const [o, v] of a0.saved || []) o.visible = v; } catch (e) { }
    dropActors(a0.acts);
    try { G() && G().setUI && G().setUI(false); G() && G().lockPointer && G().lockPointer(); } catch (e) { }
    try { a0.o.onEnd && a0.o.onEnd(!!natural); } catch (e) { console.warn('cine end', e); }
    if (sumList && sumList.length) { try { showSummary(sumList); } catch (e) { console.warn('cine summary', e); } }
  }
  // 跳过剧情后：把没看到的「变强卡 / 情报卡」直接列出来
  let sumEl = null, sumTm = 0;
  function showSummary(list) {
    if (!sumEl || !sumEl.isConnected) {
      const st = document.createElement('style'); st.textContent = `#csSum{position:fixed;right:4vw;top:50%;transform:translate(24px,-50%);opacity:0;transition:opacity .5s,transform .6s cubic-bezier(.2,.9,.3,1);z-index:140;width:min(400px,86vw);max-height:84vh;overflow:hidden;padding:16px 20px 14px;border-radius:12px;background:linear-gradient(160deg,rgba(24,16,22,.94),rgba(10,8,14,.96));border:1px solid rgba(255,176,112,.5);box-shadow:0 18px 50px rgba(0,0,0,.6);color:#f2e8dc;font-family:system-ui,'PingFang SC',sans-serif;pointer-events:none}#csSum.on{opacity:1;transform:translate(0,-50%)}#csSum .h{font-size:12px;letter-spacing:.3em;color:#ffb070;margin-bottom:8px}#csSum .t{margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,.08)}#csSum .t:first-of-type{margin-top:0;padding-top:0;border:0}#csSum .k{font-size:11px;letter-spacing:.35em;color:var(--nc,#ffb070)}#csSum .n{font-size:20px;font-weight:900;margin:2px 0}#csSum .lv{font-size:13px;color:#cdbfae}#csSum .lv b{color:#fff}#csSum .r{display:flex;gap:10px;margin:6px 0;padding:6px 8px;border-radius:8px;background:rgba(255,255,255,.05)}#csSum .r i{font-style:normal;font-size:19px;width:24px;text-align:center}#csSum .r .a{font-size:14px;font-weight:800}#csSum .r .e{font-size:12.5px;color:#d8ccb8;margin-top:1px}#csSum .f{font-size:12px;color:#a89c8c;margin-top:4px}`; document.head.appendChild(st);
      sumEl = document.createElement('div'); sumEl.id = 'csSum'; document.body.appendChild(sumEl);
    }
    sumEl.innerHTML = `<div class="h">⏭ 已跳过剧情 · 以下内容已生效</div>` + list.slice(0, 3).map(B => `<div class="t" style="--nc:${esc(B.col || '#ffb070')}"><div class="k">${esc(B.k)}</div><div class="n">${esc(B.n)}</div>${B.lv ? `<div class="lv">${B.lv}</div>` : ''}${(B.rows || []).slice(0, 6).map(r => `<div class="r"><i>${r.ic}</i><div><div class="a" style="color:${esc(r.col || '#fff')}">${esc(r.a)}</div><div class="e">${esc(r.e)}</div></div></div>`).join('')}${B.f ? `<div class="f">${esc(B.f)}</div>` : ''}</div>`).join('');
    sumEl.classList.remove('on'); void sumEl.offsetWidth; setTimeout(() => sumEl && sumEl.classList.add('on'), 60);
    clearTimeout(sumTm); sumTm = setTimeout(() => { if (sumEl) sumEl.classList.remove('on'); }, 14000);
  }
  addEventListener('keydown', e => {
    if (!A) { if (veilOn() && !/^F\d+$/.test(e.code)) { e.preventDefault(); e.stopImmediatePropagation(); } return; }
    if (/^F\d+$/.test(e.code)) return;
    e.preventDefault(); e.stopImmediatePropagation(); if (e.repeat) return;
    if (A.phase !== 'play') return;
    if (e.code === 'Escape') return stop(false, true);
    if (['Space', 'Enter', 'NumpadEnter', 'KeyE'].includes(e.code)) next();
  }, true);
  addEventListener('keyup', e => { if (A || veilOn()) e.stopImmediatePropagation(); }, true);
  // 过场期间鼠标全部吞掉（以前还能挥武器）；左键 = 继续
  for (const t of ['mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'wheel', 'pointerdown', 'pointerup', 'mousemove', 'pointermove']) {
    addEventListener(t, e => { if (!(A || veilOn())) return; e.stopImmediatePropagation(); if (e.cancelable) e.preventDefault(); if (t === 'mousedown' && e.button === 0 && A && A.phase === 'play') next(); }, true);
  }
  let graceT = 0, veilAt = 0;
  const veilOn = () => veilShown && performance.now() - veilAt < 45000;
  addEventListener('resize', () => { if (root) root.style.setProperty('--bh', barH() + 'px'); });

  // ================= 进图黑场（有电影要播时，先别让玩家看到场上的人）=================
  let veilShown = false, lastB = null, bAt = 0;
  function veilWanted() {
    if (!on()) return false; const W = window.Worlds && Worlds.active && Worlds._W; if (!W || !W.B) return false;
    if (W.B !== lastB) { lastB = W.B; bAt = performance.now(); }
    if (performance.now() - bAt > 40000) return false;
    if (window.Saga && Saga.cine) return false; // 旧播放器在播
    if (window.Arrival2 && Arrival2.isOpen && Arrival2.isOpen()) return false;
    const sagaP = window.Saga && Saga.pendingCine && Saga.pendingCine(), nemP = window.NemStory && (NemStory.busy || (NemStory.pending && NemStory.pending()));
    return !!(sagaP || nemP);
  }
  function hook(renderer) {
    if (A) return draw(renderer);
    if (veilWanted()) {
      ensureUI(); if (!veilShown) { veilShown = true; veilAt = performance.now(); root.className = 'on'; el.blk.classList.remove('off'); el.ld.classList.add('on'); hideAll(); vqKey = ''; }
      updateVq();
      const cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha(); renderer.setRenderTarget(null); renderer.setClearColor(0, 1); renderer.clear(); renderer.setClearColor(cc, ca);
      return true;
    }
    if (veilShown) { veilShown = false; if (!A && root) { el.blk.classList.add('off'); el.ld.classList.remove('on'); setTimeout(() => { if (!A && !veilShown && root) root.className = ''; }, 460); } }
    return false;
  }

  // 在大地图里取舞台：玩家前方 3m，观众侧 = 玩家这边；其余场景地点由 spotFor 在地图里找
  function worldHere(extraHide) {
    const g = G(), W = window.Worlds && Worlds._W; if (!g || !W || !W.B) return null;
    const P0 = W.pos.clone(), yaw = g.player.yaw, fw = new V3(-Math.sin(yaw), 0, -Math.cos(yaw));
    let d = 3.2; const B = W.B;
    for (let k = 0; k < 4; k++) { const c = P0.clone().addScaledVector(fw, d); if (!(B.cols || []).some(o => Math.hypot(c.x - o.x, c.z - o.z) < o.r + 1.1)) break; d -= 0.6; }
    const ctr = P0.clone().addScaledVector(fw, Math.max(1.6, d));
    const hide = list => {
      try { for (const fo of (window.Foe && Foe.foes) || []) { const r = fo.f && fo.f.root; if (r) { list.push([r, r.visible]); r.visible = false; } if (fo.warn) { list.push([fo.warn, fo.warn.visible]); fo.warn.visible = false; } } } catch (e) { }
      try { for (const c of g.camera.children) { list.push([c, c.visible]); c.visible = false; } } catch (e) { }
      try { for (const dd of B.doors || []) if (dd.label) { list.push([dd.label, dd.label.visible]); dd.label.visible = false; } } catch (e) { }
      if (extraHide) extraHide(list);
    };
    const H = (x, z) => { try { return B.H(x, z); } catch (e) { return P0.y; } };
    const inside = (x, z) => { const rr = Math.hypot(x, z), lim = (B.Rf ? B.Rf(Math.atan2(z, x)) : B.R) - 2; return rr < lim; };
    const samp = () => { for (let i = 0; i < 6; i++) { const p = B.lp && B.lp.samp ? B.lp.samp(Math.random, 6) : null; if (p) return p; const a = Math.random() * 6.283, r = (B.R || 30) * (0.1 + Math.random() * 0.6); const x = Math.cos(a) * r, z = Math.sin(a) * r; if (inside(x, z)) return [x, z]; } return null; };
    return { sc: B.sc, H, ctr, aud: fw.clone().negate(), hide, cols: B.cols || [], R: B.R || 30, P0, samp };
  }
  function playHere(o) { const w = worldHere(); if (!w) return Promise.resolve(false); o.world = w; o.hide = w.hide; return play(o); }

  return { _ui: { ensure: () => { ensureUI(); return el; }, showMean, showEp: e => showEp(e), updateVq }, on, play, playHere, draw, hook, next, summary: showSummary, stop: () => stop(false), get active() { return !!A; }, get playing() { return !!A && A.phase === 'play'; }, get hold() { return !!A || veilOn(); }, get grace() { return !!A || veilOn() || performance.now() < graceT; }, _A: () => A, _stage: stage, SHOT };
})();
