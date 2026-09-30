// 第十四轮 · 敌人身体（js/foe.js，总管理师）
// 身体 = 原 VRM 的完整身体（tools/vrm2body.py 生成 big/body/<File>.js：骨骼+蒙皮+原衣服，只去掉原头），
// 头 = 游戏里的组合首级（ModelHeads.create），按身体的眼睛/头骨关节位置缩放并挂在 H_head 骨上。
// 身份 → 身体：按角色身份挑衣服合适的身体（见 IDENT），画风统一为日式动画 VRM。
window.Foe = (() => {
  const V3 = THREE.Vector3, Q = THREE.Quaternion, M4 = THREE.Matrix4;
  const LOADED = {}, TMPL = {};
  function script(name) {
    if (LOADED[name]) return LOADED[name];
    return LOADED[name] = new Promise((res, rej) => { if (window.BODY_MODELS && BODY_MODELS[name]) return res(); const s = document.createElement('script'); s.src = 'big/body/' + name + '.js'; s.onload = () => res(); s.onerror = () => rej(new Error('body ' + name)); document.head.appendChild(s); });
  }
  let _tg = null; const TOON_GRAD = () => _tg || (_tg = (() => { const t = new THREE.DataTexture(new Uint8Array([120, 190, 235, 255]), 4, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })());
  function b64buf(s) { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u.buffer; }
  // 载入身体模板（只解析一次，之后 SkeletonUtils 式克隆）
  async function template(name) {
    if (TMPL[name]) return TMPL[name];
    await script(name); const E = BODY_MODELS[name];
    const gltf = await new Promise((res, rej) => new THREE.GLTFLoader().parse(b64buf(E.glb), '', res, rej));
    const root = gltf.scene; root.updateMatrixWorld(true);
    root.traverse(o => {
      if (!o.isMesh) return; o.frustumCulled = false; o.castShadow = true; o.receiveShadow = true;
      const m = o.material; if (!m) return;
      m.envMapIntensity = 0.55; if (m.map) { m.map.anisotropy = 4; m.map.encoding = THREE.sRGBEncoding; }
      if (m.transparent && m.alphaTest === 0) { m.alphaTest = 0.4; m.transparent = false; m.depthWrite = true; } // 布料半透明边缘：改成裁剪，避免排序问题
      m.userData.skin = /SKIN|肌/i.test(m.name) || (/body/i.test(m.name) && !/cloth|tops|bottom|shoe|acc/i.test(m.name));
      if (m.name === '__CUT__') { o.visible = false; o.userData.cut = true; return; }
      // 身体改用与首级相同的卡通材质（同一条光照曲线 + 同样的柔性压缩）：否则同样的肤色，头会比身体暗 40%
      if (!window.Mods || Mods.on('foe_toon') !== false) {
        const t = new THREE.MeshToonMaterial({ map: m.map || null, color: m.color ? m.color.clone() : new THREE.Color(1, 1, 1), gradientMap: TOON_GRAD(), transparent: false, alphaTest: m.alphaTest || 0, side: m.side, name: m.name });
        t.userData.skin = m.userData.skin; o.material = t; m.dispose();
      }
    });
    try { sampleSkin({ E, root }); } catch (e) { console.warn('skin sample', name, e); }
    // 第十八轮：身体比头暗时提亮整个身体（而不是把头压暗去迁就身体）→ 角色和头都不再发暗
    const gain = bodyGain(name); root.traverse(o => { if (o.isMesh && o.material && !o.userData.cut && o.material.color) o.material.color.multiplyScalar(gain); });
    E.glb = null; // 解析完就丢掉 base64，省内存（被淘汰后会重新加载脚本）
    const T = TMPL[name] = { name, E, gltf, root, gain }; T.skin = root.userData.skin || null; return T;
  }
  // 从身体贴图上读脖子一圈的真实肤色（原神身体皮肤和衣服同一张图，不能染色 → 让头跟身体一致）
  function sampleSkin({ E, root }) {
    const cy = E.cut ? E.cut.y : E.neckY, cx = E.cut ? E.cut.x : 0, cz = E.cut ? E.cut.z : 0;
    const cvs = new Map(), px = [], v = new V3();
    root.traverse(o => {
      if (!o.isMesh || o.userData.cut) return; const m = Array.isArray(o.material) ? o.material[0] : o.material; const img = m && m.map && m.map.image; const uv = o.geometry.attributes.uv; if (!img || !uv) return;
      let cv = cvs.get(img); if (!cv) { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, 512, 512); cv = g.getImageData(0, 0, 512, 512).data; cvs.set(img, cv); }
      const pa = o.geometry.attributes.position;
      for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld); const dy = cy - v.y;
        if (dy < 0.005 || dy > 0.07 || Math.hypot(v.x - cx, v.z - cz) > 0.075) continue;
        const X = Math.min(511, Math.max(0, Math.floor(uv.getX(i) * 512))), Y = Math.min(511, Math.max(0, Math.floor(uv.getY(i) * 512))), k = (Y * 512 + X) * 4;
        const r = cv[k] / 255, g = cv[k + 1] / 255, b = cv[k + 2] / 255; if (cv[k + 3] < 128) continue;
        if (r > 0.45 && r >= g && g >= b * 0.85 && r - b < 0.45) px.push([r, g, b]); }
    });
    if (px.length < 6) return;
    px.sort((a, b) => (b[0] + b[1] + b[2]) - (a[0] + a[1] + a[2])); const top = px.slice(0, Math.max(4, Math.floor(px.length * 0.5))); // 取亮的一半：避开贴图里画好的下巴阴影
    const avg = [0, 1, 2].map(j => top.reduce((s, p) => s + p[j], 0) / top.length);
    root.userData.skin = new THREE.Color().setRGB(avg[0], avg[1], avg[2]).getHexString();
  }
  // 克隆骨骼网格（three r147 没有内置 SkeletonUtils，这里按名字重绑）
  function cloneSkinned(src) {
    const clone = src.clone(true); const map = {};
    src.traverse(o => { if (o.isBone || o.type === 'Object3D' || o.isGroup) map[o.name] = null; });
    clone.traverse(o => { map[o.name] = o; });
    const srcMeshes = [], dstMeshes = []; src.traverse(o => { if (o.isSkinnedMesh) srcMeshes.push(o); }); clone.traverse(o => { if (o.isSkinnedMesh) dstMeshes.push(o); });
    dstMeshes.forEach((m, i) => { const s = srcMeshes[i]; const bones = s.skeleton.bones.map(b => map[b.name]); m.bind(new THREE.Skeleton(bones, s.skeleton.boneInverses), s.bindMatrix); m.material = Array.isArray(s.material) ? s.material.map(x => x.clone()) : s.material.clone(); });
    return clone;
  }
  // 头的尺寸与位置（标定见 HANDOFF：VRoid 真实头骨高 ≈ 4.15×(眼高-头关节高)；首级模型头骨高 0.194、眼在原点下 0.0102、头骨中心在眼骨后 0.02×缩放）
  function headFit(E) {
    const eyeY = E.eyeY != null ? E.eyeY : E.headY + 0.058, skull = Math.max(0.17, Math.min(0.3, 4.15 * (eyeY - E.headY)));
    const s = skull / 0.194;
    return { s, pos: new V3(E.headX || 0, eyeY + 0.0102 * s, (E.eyeZ != null ? E.eyeZ : (E.headZ || 0) + 0.03) - 0.02 * s) };
  }
  // 组装一个活人：身体 + 组合头
  async function build(bodyName, look, opts = {}) {
    const T = await template(bodyName); const E = T.E;
    const root = cloneSkinned(T.root); root.name = 'foe_' + bodyName;
    const bones = {}; root.traverse(o => { if (o.name && o.name.startsWith('H_')) bones[o.name.slice(2)] = o; });
    const cut = []; root.traverse(o => { if (o.userData.cut) cut.push(o); });
    // 身体皮肤跟头的肤色一致
    const alive = opts.alive !== false;
    if (T.skin && !TINT[bodyName]) { look.skinHex = '#' + T.skin; look.sk = look.sk || '象牙'; } // 身体不能染色：头随身体
    { const f = SKIN_FIX[bodyName] || [1, 1, 1], L = f[0] * 0.3 + f[1] * 0.59 + f[2] * 0.11, n = L < 1 ? L : 1; look.skinMul = f.map(x => +((L + (x - L) * 0.25) / n * LIFT).toFixed(3)); } // 第十八轮：头只随身体变亮、不再被压暗 // 主要校亮度，色相只跟 25%（避免脸发绿/发黄） // 渲染标定（_tools/calib.py）：脸颊与脖子渲染出来同色
    const hb = ModelHeads.create(alive ? Object.assign({}, look, { ex: {}, pale: 0, blood: 0, spat: 0 }) : look, { alive });
    hb.group.traverse(o => { if (o.isMesh && o.userData.kind === 'cut') o.visible = false; }); // 活人：头自己的断口盖藏起来
    const sk = hb.U && hb.U.skin && hb.U.skin.value;
    if (TINT[bodyName]) { // 可染色身体：身体皮肤 × (头肤色 / 身体贴图肤色)，两边精确一致
      const hc = new THREE.Color(look.skinHex).convertSRGBToLinear(), bc = T.skin ? new THREE.Color('#' + T.skin).convertSRGBToLinear() : null;
      const k = bc ? [hc.r / bc.r, hc.g / bc.g, hc.b / bc.b] : (sk ? [sk.x, sk.y, sk.z] : [1, 1, 1]);
      root.traverse(o => { if (o.isMesh && o.material && o.material.userData && o.material.userData.skin) o.material.color.setRGB(Math.min(1.6, k[0]) * (T.gain || 1), Math.min(1.6, k[1]) * (T.gain || 1), Math.min(1.6, k[2]) * (T.gain || 1)); });
    }
    // 挂头：静止姿势下算好相对 H_head 的偏移
    root.updateMatrixWorld(true);
    const fit = headFit(E), headBone = bones.head;
    const holder = new THREE.Group(); holder.name = 'headHolder';
    const want = new M4().compose(fit.pos, new Q(), new V3(1, 1, 1));
    const inv = new M4().copy(root.matrixWorld).invert().multiply(headBone.matrixWorld).invert(); // 身体根空间 → 头骨局部
    const local = new M4().multiplyMatrices(inv, want); local.decompose(holder.position, holder.quaternion, holder.scale);
    hb.group.scale.setScalar(fit.s); holder.add(hb.group); headBone.add(holder);
    hb.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    return { root, bones, E, hb, holder, cut, fit, look, bodyName, alive: true };
  }
  // ---- 动作重定向：UAL 世界旋转增量 → 这具身体的局部旋转（每个身体模板算一次，克隆体共用 AnimationClip）----
  let animP = null;
  function loadAnim() { return animP || (animP = new Promise((res, rej) => { if (window.UAL_ANIM) return res(); const s = document.createElement('script'); s.src = 'big/anim/ual.js'; s.onload = res; s.onerror = () => rej(new Error('anim')); document.head.appendChild(s); })); }
  function dec16(b64) { const b = atob(b64), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new Int16Array(u.buffer); }
  function clipsFor(T) {
    if (T.clips) return T.clips;
    const A = window.UAL_ANIM; if (!A) return {};
    const root = T.root; root.updateMatrixWorld(true);
    const hb = {}; root.traverse(o => { if (o.name && o.name.startsWith('H_')) hb[o.name.slice(2)] = o; });
    // 只需要人形骨骼及其祖先（前序遍历保证父在前）
    const need = new Set(); Object.values(hb).forEach(o => { let p = o; while (p && p !== root) { need.add(p); p = p.parent; } });
    const order = []; root.traverse(o => { if (need.has(o)) order.push(o); });
    const restL = new Map(), restW = new Map(), rq = new Q();
    order.forEach(o => { restL.set(o, o.quaternion.clone()); o.getWorldQuaternion(rq); restW.set(o, rq.clone()); });
    const rootW = root.getWorldQuaternion(new Q());
    const src = new Map(); A.bones.forEach((b, i) => { if (hb[b]) src.set(hb[b], i); });
    const hips = hb.hips, hipH = hips.getWorldPosition(new V3()).y;
    const hipParentInv = new M4().copy(hips.parent.matrixWorld).invert();
    const nb = A.bones.length, out = {}, W = new Map(), d = new Q(), w = new Q(), l = new Q(), tp = new V3();
    for (const [name, C] of Object.entries(A.clips)) {
      const q = dec16(C.q), hp = dec16(C.hp), n = C.n, times = new Float32Array(n);
      for (let f = 0; f < n; f++) times[f] = f / C.fps;
      const vals = new Map(order.filter(o => src.has(o)).map(o => [o, new Float32Array(n * 4)]));
      const hv = new Float32Array(n * 3);
      for (let f = 0; f < n; f++) {
        W.clear();
        for (const o of order) {
          const pw = o.parent === root || !W.has(o.parent) ? (o.parent === root ? rootW : restW.get(o.parent) || rootW) : W.get(o.parent);
          if (src.has(o)) { const k = (f * nb + src.get(o)) * 4; d.set(q[k] / 32767, q[k + 1] / 32767, q[k + 2] / 32767, q[k + 3] / 32767).normalize(); w.copy(d).multiply(restW.get(o)); }
          else w.copy(pw).multiply(restL.get(o));
          W.set(o, w.clone());
          if (src.has(o)) { l.copy(pw).invert().multiply(w); const v = vals.get(o); v[f * 4] = l.x; v[f * 4 + 1] = l.y; v[f * 4 + 2] = l.z; v[f * 4 + 3] = l.w; }
        }
        tp.set(hp[f * 3] / 10000 * hipH, hp[f * 3 + 1] / 10000 * hipH, hp[f * 3 + 2] / 10000 * hipH).applyMatrix4(hipParentInv); hv.set([tp.x, tp.y, tp.z], f * 3);
      }
      const tracks = []; for (const [o, v] of vals) tracks.push(new THREE.QuaternionKeyframeTrack(o.name + '.quaternion', times, v));
      tracks.push(new THREE.VectorKeyframeTrack(hips.name + '.position', times, hv));
      out[name] = new THREE.AnimationClip(name, C.dur, tracks);
    }
    return T.clips = out;
  }
  // 给一个角色装上动作播放器：f.play('Walk_Loop') / f.play('Sword_Regular_A', { once: true, fade: 0.12, speed })
  async function animate(f) {
    await loadAnim(); const T = await template(f.bodyName), clips = clipsFor(T);
    const mixer = new THREE.AnimationMixer(f.root); let cur = null;
    f.mixer = mixer; f.clips = clips;
    f.play = (name, o = {}) => {
      const c = clips[name]; if (!c) return null; const a = mixer.clipAction(c);
      if (cur === a && !o.restart) { if (o.speed != null && a.timeScale !== o.speed && !o.once) a.timeScale = o.speed; return a; } // 第十九轮：同一循环动作也更新速度（正走/倒走）
      a.reset(); a.setLoop(o.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = !!o.once; a.timeScale = o.speed || 1; a.enabled = true; a.setEffectiveWeight(1);
      if (cur && o.fade !== 0) { a.play(); cur.crossFadeTo(a, o.fade == null ? 0.2 : o.fade, false); } else a.play();
      cur = a; f.cur = name; return a;
    };
    return f;
  }
  const sfx = () => window.SFX || {};
  // ================= 第 4 步：世界里的敌人（身体 + 动作 + AI + 布娃娃 + 斩首/断肢）=================
  // 身份 → 衣服合适的身体（全部是原 VRM 的衣服）
  const IDENT = {
    villager: ['HikariCape', 'Xiangling'], shepherd: ['HikariCape'], barmaid: ['Noelle', 'Xiangling'], smithgirl: ['Noelle', 'Beidou'], herbalist: ['Sucrose', 'HikariScholar'], huntress: ['Amber'], bard: ['Amber', 'Furina'], novice: ['HikariScholar', 'Sucrose'],
    ranger: ['Amber'], druid: ['Sucrose'], singer: ['Furina', 'Kokomi'], archer: ['Amber'], moonpriest: ['Kokomi'], elfprincess: ['Ningguang', 'Kokomi'],
    wolfwarrior: ['Beidou', 'Eula'], foxmiko: ['YaeMiko'], catthief: ['Amber', 'Mona'], shaman: ['Sucrose', 'Kokomi'], chieftess: ['Beidou'], falconer: ['Amber'],
    nun: ['Rosaria'], paladin: ['Jean', 'Eula'], choir: ['Kokomi', 'Rosaria'], inquisitor: ['Rosaria', 'Jean'], saint: ['Kokomi'], abbess: ['Rosaria'],
    witch: ['Lisa', 'Mona'], alchemist: ['Sucrose'], hexer: ['Mona', 'Lisa'], bogwitch: ['Lisa'], covenlady: ['Lisa', 'Ningguang'], countess: ['Ningguang', 'Furina'],
    knight: ['Jean', 'Eula', 'Noelle'], merc: ['Beidou', 'Eula'], crossbow: ['Amber', 'Beidou'], medic: ['HikariScholar', 'Noelle'], engineer: ['Noelle', 'Beidou'], general: ['Jean', 'Beidou'], dragonknight: ['Eula', 'Jean'],
    princess: ['Furina', 'Ningguang'], lady: ['Ningguang', 'Furina'], courtmage: ['Lisa', 'Mona'], assassin: ['Rosaria', 'Shenhe'], guard: ['Jean', 'Noelle'], musician: ['Furina'], queen: ['Ningguang'],
    succubus: ['Mona', 'Rosaria'], fallen: ['Rosaria', 'Shenhe'], duchess: ['Ningguang', 'Rosaria'], shadow: ['Rosaria', 'Shenhe'], abyssqueen: ['Ningguang'],
    dragonprincess: ['Shenhe', 'Ningguang'], avatar: ['YaeMiko', 'Kokomi'], archangel: ['Kokomi', 'Shenhe'], dragonslayer: ['Eula', 'Jean'], dragonmiko: ['YaeMiko', 'Shenhe']
  };
  // 每具身体的头肤色倍数：在同一光照下把首级脸颊渲染色对齐到身体脖子/上胸的渲染色（_tools/calib.py 迭代求得）
  const SKIN_FIX = {"Jean":[0.613,0.652,0.764],"Noelle":[0.991,1.214,1.484],"Amber":[0.749,0.898,1.13],"Rosaria":[0.777,1.044,1.039],"Lisa":[1.272,1.554,1.757],"Sucrose":[2.954,2.213,2.941],"Xiangling":[1.607,1.518,1.406],"Ningguang":[1.019,1.205,1.436],"Furina":[0.849,0.949,1.125],"Kokomi":[0.82,0.839,0.784],"YaeMiko":[1.566,2.149,2.172],"Shenhe":[1.507,1.32,1.558],"Mona":[2.583,2.373,2.564],"Eula":[0.783,0.965,1.236],"Beidou":[0.747,0.767,0.855],"HikariCape":[0.97,1.115,1.302],"HikariScholar":[0.804,0.824,0.806],"AvatarSample_A":[1.04,0.986,1.08]};
  const LIFT = 1.04; // 第十八轮：角色整体稍提亮
  function bodyGain(name) { const f = SKIN_FIX[name]; if (!f) return LIFT; const L = f[0] * 0.3 + f[1] * 0.59 + f[2] * 0.11; return (L < 1 ? Math.min(1.7, 1 / L) : 1) * LIFT; }
  const TINT = { HikariCape: 1, HikariScholar: 1, AvatarSample_A: 1 }; // 皮肤是独立材质、能跟头同色的身体
  const LIGHT = ['瓷白', '象牙', '蜜色', '苍白'];
  const ARMED = { knight: 'antique_katana_01', paladin: 'ornate_medieval_mace', guard: 'antique_estoc', general: 'antique_katana_01', dragonknight: 'ornate_war_hammer', dragonslayer: 'antique_katana_01', merc: 'machete',
    wolfwarrior: 'wooden_axe_02', chieftess: 'ornate_war_hammer', inquisitor: 'ornate_medieval_mace', assassin: 'machete', huntress: 'wooden_axe_02', smithgirl: 'ornate_war_hammer', crossbow: 'machete', shadow: 'machete', fallen: 'antique_estoc' };
  const IDLE = { villager: 'Farm_Harvest', shepherd: 'Idle_Lantern_Loop', smithgirl: 'Fixing_Kneeling', huntress: 'TreeChopping_Loop', herbalist: 'Farm_Harvest', barmaid: 'Idle_Talking_Loop', guard: 'Idle_Shield_Loop', knight: 'Sword_Idle', general: 'Idle_FoldArms_Loop', lady: 'Idle_FoldArms_Loop', queen: 'Idle_FoldArms_Loop', witch: 'Spell_Simple_Idle_Loop', courtmage: 'Spell_Simple_Idle_Loop', nun: 'Idle_Torch_Loop' };
  const BOSS_BODY = { village: 'Lisa', forest: 'Amber', wilds: 'Beidou', abbey: 'Rosaria', swamp: 'Mona', fortress: 'Eula', capital: 'Ningguang', abyss: 'Shenhe', peak: 'YaeMiko' };
  const SAY = {
    see: ['……有人来了。', '那是什么？！', '别过来……', '食人魔！', '谁在那里？', '喂——你！'], flee: ['救命——！', '快跑！', '它追过来了！', '别跟着我！'],
    fight: ['我不会让你得逞！', '来啊！', '休想碰我！', '滚开，怪物！'], hit: ['呃……！', '好痛……', '可恶！'], block: ['哼！', '没那么容易！']
  };
  const pickR = (r, a) => a[Math.floor(r() * a.length) % a.length];
  const FOES = [], HEADS = [], PIECES = [], FX = [];
  let CTX = null;
  function evict(keep, max) { // 模板缓存：超过 max 个就释放本地点没用到的
    const names = Object.keys(TMPL); if (names.length <= max) return;
    for (const n of names) { if (keep.has(n) || Object.keys(TMPL).length <= max) continue; const T = TMPL[n];
      T.root.traverse(o => { if (o.isMesh) { o.geometry.dispose(); [].concat(o.material).forEach(m => { for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); }); } });
      delete TMPL[n]; delete LOADED[n]; if (window.BODY_MODELS) delete BODY_MODELS[n]; document.querySelectorAll('script[src="big/body/' + n + '.js"]').forEach(e => e.remove()); }
  }
  function bodyFor(h, r, bossK, used) {
    if (bossK) return BOSS_BODY[bossK] || 'Jean';
    let list = IDENT[h.c.id] || ['Jean', 'Noelle', 'HikariCape'];
    if (used && used.size >= 3) { const hit = list.filter(b => used.has(b)); if (hit.length) list = hit; } // 同一地点最多 ~3 种身体：加载快、省内存
    const light = LIGHT.includes(h.look.sk);
    if (!light) { const t = list.filter(b => TINT[b]); if (t.length) list = t; else if (r() < 0.45) list = ['HikariCape', 'HikariScholar']; }
    const b = pickR(r, list);
    return b;
  }
  // 武器：静止姿势（T）下剑身朝前(+Z)握在右手里，之后动作的世界旋转增量会把它带到原动作里的位置
  function weaponModel(name) {
    if (!window.Assets || !Assets.has(name)) return null;
    const src = Assets.clone(name); src.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(src), sz = bb.getSize(new V3()), c = bb.getCenter(new V3());
    const ax = sz.x > sz.y ? (sz.x > sz.z ? 'x' : 'z') : (sz.y > sz.z ? 'y' : 'z'), len = sz[ax];
    const pts = []; src.traverse(o => { if (o.isMesh) { const pa = o.geometry.attributes.position, v = new V3(); for (let i = 0; i < pa.count; i += 5) pts.push(v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld).clone()); } });
    const oth = ['x', 'y', 'z'].filter(k => k !== ax); let lo = 0, hi = 0, nl = 0, nh = 0;
    for (const q of pts) { const t = (q[ax] - bb.min[ax]) / len, w = Math.hypot(q[oth[0]] - c[oth[0]], q[oth[1]] - c[oth[1]]); if (t < 0.15) { lo += w; nl++; } else if (t > 0.85) { hi += w; nh++; } }
    const handleAtMin = lo / Math.max(1, nl) < hi / Math.max(1, nh);
    const inner = new THREE.Group(); src.position.sub(c); inner.add(src);
    const g = new THREE.Group(); g.add(inner);
    // 长轴 → +Z，握柄端在原点附近（握点在柄端往里 12%）
    const dir = new V3(); dir[ax] = handleAtMin ? 1 : -1; inner.quaternion.setFromUnitVectors(dir, new V3(0, 0, 1));
    inner.position.set(0, 0, len * (0.5 - 0.12));
    const k = Math.min(1.1, Math.max(0.7, len)) / len; g.scale.setScalar(k);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    return g;
  }
  function attachWeapon(f, name) {
    const hand = f.bones.rightHand; if (!hand) return null; const w = weaponModel(name); if (!w) return null;
    // 在身体静止姿势里算握持矩阵（模板空间），再换成手骨局部
    const T = TMPL[f.bodyName]; let th = null; T.root.traverse(o => { if (o.name === hand.name) th = o; }); T.root.updateMatrixWorld(true);
    const hp = th.getWorldPosition(new V3()), want = new M4().compose(hp.clone().add(new V3(-0.075, -0.025, 0.0)), new Q(), new V3(1, 1, 1));
    const local = new M4().copy(th.matrixWorld).invert().multiply(want); const holder = new THREE.Group(); local.decompose(holder.position, holder.quaternion, holder.scale);
    holder.add(w); hand.add(holder); return holder;
  }
  // ---- 生成：worlds.js 进入地点时调用 ----
  async function populate(ctx, list) { // list = [{h, pos, boss}]
    CTX = ctx; clear(); await loadAnim();
    const out = [], used = new Set(), mx = +(location.search.match(/[?&]foemax=(\d+)/) || [])[1]; if (mx) list = list.slice(-mx);
    for (const it of list) {
      const r = mulberry32(((it.h.look.seed || 7) * 2654435761) >>> 0);
      const bodyName = bodyFor(it.h, r, it.boss && it.bossK, used); used.add(bodyName);
      let f; try { f = await build(bodyName, it.h.look); await animate(f); } catch (e) { console.warn('foe body', bodyName, e); continue; }
      const c = it.h.c, rar = c.rar, id = c.id;
      const fo = { h: it.h, f, pos: f.root.position, yaw: r() * 6.28, rar, id, hp: 0, maxHp: 0, state: 'idle', t: 0, cd: 1 + r() * 2, sayT: 0, seen: false,
        brave: !!it.boss || !!ARMED[id] || r() < 0.2 + rar * 0.1, boss: it.boss || null, bossK: it.bossK, dead: false, decap: false, rag: null, stag: 0, atk: null, block: 0, iq: 0.4 + rar * 0.15 + (it.boss ? 0.4 : 0),
        idleClip: IDLE[id] || pickR(r, ['Idle_Loop', 'Idle_Loop', 'Idle_Talking_Loop', 'Idle_FoldArms_Loop']), wpn: null, id2: 'foe' + FOES.length + '_' + (c.name || ''), anchor: { pos: new V3(), gone: false }, home: it.pos.clone() };
      fo.maxHp = fo.hp = it.boss ? 150 : 26 + rar * 16; // 第十九轮 BOSS 平衡：100→150（配合韧性槽/二阶段）
      fo.mats = []; { const skip = new Set(); if (f.holder) f.holder.traverse(o => skip.add(o)); f.root.traverse(o => { if (o.isMesh && !skip.has(o) && o.material && o.material.emissive && !o.userData.cut && !fo.mats.includes(o.material)) fo.mats.push(o.material); }); } // 第十八轮：不碰头上共享的宝石/头饰材质
      fo.warn = new THREE.Sprite(warnMat()); fo.warn.scale.set(0.16, 0.16, 1); fo.warn.visible = false; fo.warn.renderOrder = 5; ctx.sc.add(fo.warn);
      fo.blinkT = 1 + r() * 4;
      const wn = it.boss ? (it.bossK === 'swamp' || it.bossK === 'village' ? null : 'antique_katana_01') : ARMED[id];
      if (wn) fo.wpn = attachWeapon(f, wn);
      fo.armed = !!fo.wpn || !!it.boss;
      f.root.position.copy(it.pos); f.root.position.y = ctx.H(it.pos.x, it.pos.z); f.root.rotation.y = fo.yaw;
      ctx.sc.add(f.root); f.play(fo.idleClip, { fade: 0 }); f.mixer.setTime(r() * 3);
      if (window.FoeRoles) FoeRoles.assign(fo, r, it); // 第二十二轮（续 9）：敌人职业
      FOES.push(fo); out.push(fo);
    }
    evict(used, 5); prewarm(ctx); { const seenB = new Set(); for (const fo of FOES) if (!seenB.has(fo.f.bodyName)) { seenB.add(fo.f.bodyName); sevWarm(fo); } }
    return out;
  }
  function warnMat() { if (warnMat.m) return warnMat.m; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    g.fillStyle = 'rgba(255,40,30,0.95)'; g.beginPath(); g.moveTo(32, 4); g.lineTo(60, 58); g.lineTo(4, 58); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.fillText('!', 32, 52);
    return warnMat.m = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }); }
  // 预编译：把断肢碎块（静态卡通材质）、血、血迹会用到的着色器在进场时就编好，砍的那一刻不再卡
  // 第十九轮（卡顿根因）：Master 后处理把场景渲到离屏 RT 且关掉色调映射 → 着色器变体（线性输出/无 ACES）与直接渲到屏幕不同。
  // 以前的预热直接 render 到屏幕，编的是用不上的变体，斩首/倒袋时照样现编。这里完全模拟 Master 的状态再 compile+render。
  function warmRender(R, sc, cam) {
    const GG = window.G || window.__game, post = GG && GG.post, viaRT = !!(post && post.on), tm = R.toneMapping, rt0 = R.getRenderTarget();
    try {
      if (viaRT) { const rt = warmRender.rt || (warmRender.rt = new THREE.WebGLRenderTarget(16, 16, { depthBuffer: true })); R.toneMapping = THREE.NoToneMapping; R.setRenderTarget(rt); }
      R.compile(sc, cam); R.render(sc, cam);
    } catch (e) { console.warn('warm', e); }
    finally { R.toneMapping = tm; R.setRenderTarget(rt0); }
  }
  function prewarm(ctx) {
    if (!ctx.renderer || !ctx.camera) return; const grp = new THREE.Group(), geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3)); geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(6), 2)); geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
    const seen = new Set();
    for (const fo of FOES) for (const m of fo.mats) { const k = m.type + (m.map ? 1 : 0) + m.side + (m.alphaTest > 0 ? 'a' : ''); if (seen.has(k)) continue; seen.add(k); grp.add(new THREE.Mesh(geo, m.clone())); }
    bloodMat(); spark(new V3(), 0); grp.add(new THREE.Sprite(blood.mat), new THREE.Mesh(blood.dgeo, blood.dmat), new THREE.Sprite(spark.mat), new THREE.Sprite(warnMat()), new THREE.Sprite(guardMat()));
    const hid = []; for (const fo of FOES) { fo.f.cut.forEach(o => { if (!o.visible) { o.visible = true; hid.push(o); } }); fo.f.hb.group.traverse(o => { if (o.isMesh && o.userData.kind === 'cut' && !o.visible) { o.visible = true; hid.push(o); } }); }
    { const cp = ctx.camera.getWorldPosition(new V3()), cd = ctx.camera.getWorldDirection(new V3()); grp.position.copy(cp).addScaledVector(cd, 3); } // 第十九轮：放在相机前（视锥+阴影相机内），离屏渲染不会被看见
    ctx.sc.add(grp); warmRender(ctx.renderer, ctx.sc, ctx.camera);
    ctx.sc.remove(grp); // render 一次：连阴影深度程序和贴图上传一起预热；不 dispose：保留已编译的程序
    hid.forEach(o => o.visible = false);
  }
  function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function clear() {
    NAV = null; if (window.FoeRoles) FoeRoles.clear();
    for (const fo of FOES) { fo.anchor.gone = true; if (fo.warn && fo.warn.parent) fo.warn.parent.remove(fo.warn); if (fo.gs && fo.gs.parent) fo.gs.parent.remove(fo.gs); if (fo.f.root.parent) fo.f.root.parent.remove(fo.f.root); try { fo.f.hb.dispose(); } catch (e) {} }
    for (const h of HEADS) { if (h.g.parent) h.g.parent.remove(h.g); }
    for (const p of PIECES) { if (p.g.parent) p.g.parent.remove(p.g); }
    for (const x of FX) { if (x.o.parent) x.o.parent.remove(x.o); POOL.push(x); } for (const d of DECALS) if (d && d.parent) d.parent.remove(d);
    FOES.length = HEADS.length = PIECES.length = FX.length = 0;
  }
  // ---- 每帧 ----
  const tv = new V3(), tv2 = new V3(), up = new V3(0, 1, 0);
  function update(dt, now) {
    if (!CTX) return; const ctx = CTX, P = ctx.player;
    CLK += dt; if (window.FoeRoles) FoeRoles.update(dt, ctx);
    if (slowT > 0) { slowT -= dt; dt *= slowK; if (slowT <= 0) slowK = 1; } // 击杀慢动作：只作用于敌人/尸体/头/血，玩家照常
    const SMART = !window.Mods || Mods.on('foe_smart'), DOORESC = !window.Mods || Mods.on('foe_door_escape');
    for (const fo of FOES) {
      const f = fo.f;
      if (fo.dead) { if (fo.rag) ragStep(fo, dt); if (fo.warn) fo.warn.visible = false; if (fo.gs) fo.gs.visible = false;
        if (fo.spurt > 0 && !fo.headOnPiece) { fo.spurt -= dt; const nb = f.bones.neck; if (nb && Math.random() < 0.8) { nb.getWorldPosition(tv2); const up = tv.set(0, 1, 0).applyQuaternion(nb.getWorldQuaternion(_q)); blood(tv2.addScaledVector(up, 0.05), 1, up, 0.9 + fo.spurt * 0.3); } }
        continue; }
      fo.t += dt; fo.cd -= dt; fo.sayT -= dt; if (fo.stag > 0) fo.stag -= dt; if (fo.block > 0) fo.block -= dt;
      const dx = P.pos.x - fo.pos.x, dz = P.pos.z - fo.pos.z, d = Math.hypot(dx, dz) || 1e-3;
      const face = Math.atan2(dx, dz);
      const see = ctx.sees(fo.pos, (fo.boss ? 16 : 9 + fo.rar * 2) * (P.crouch > 0.5 ? 0.55 : 1)) && (fo.seen || Math.abs(ang(face - fo.yaw)) < 1.4 || d < 3);
      if (see && !fo.seen) { alertNear(fo); fo.seen = true; fo.cd = Math.max(fo.cd, 0.5 + (1 - fo.iq) * 0.8); if (fo.boss) ctx.bossMeet(fo); else talk(fo, pickR(Math.random, SAY.see)); if (!fo.boss) fo.state = fo.brave ? 'chase' : 'flee'; else fo.state = 'chase'; }
      if (fo.seen && d > (SMART ? 34 : 26)) { fo.seen = false; fo.state = 'idle'; }
      let spd = 0, turnTo = null, rr = null;
      let strafe = 0, goal = null;
      if (fo.atk) { const r = atkStep(fo, dt, d, face); turnTo = r.turnTo; spd = r.spd; } // 攻击：定格蓄力 → 慢起手 → 快出手（按实测命中帧判定）
      else if (fo.stag > 0) { /* 受击硬直 */ }
      else if (fo.role && fo.seen && fo.state === 'chase' && window.FoeRoles && (rr = FoeRoles.tick(fo, dt, d, face, dx, dz, P, ctx))) { turnTo = rr.turnTo; spd = rr.spd || 0; } // 第二十二轮（续 9）：职业接管移动
      else if (fo.block > 0) { turnTo = face; }
      else if (!SMART && fo.state === 'chase') {
        // 第十九轮：对峙距离 + 攻击令牌 + 平滑移动（旧版贴在 1.3m 绕圈游走、随时换向 = 用户说的“在你附近闪烁”、太快）
        turnTo = face;
        const hold = fo.armed ? 2.7 : 2.2, atkR = fo.armed ? 1.55 : 1.15, mine = tokenOK(fo);
        if (fo.armed && fo.cd <= 0 && mine && d > 2.4 && d < 4.6 && fo.iq > 0.6 && Math.random() < 0.008) attack(fo, d, 'Sword_Dash'); // 冲刺斩
        else if (fo.cd <= 0 && mine) { // 轮到我：先上步到出手距离，再起手
          if (d > atkR) { spd = d > 6 ? 3.0 : 1.6; f.play(d > 6 ? 'Sprint_Loop' : 'Walk_Loop', { fade: 0.3, speed: d > 6 ? 0.9 : 1.1 }); }
          else attack(fo, d);
        }
        else if (d > hold + 1.4) { spd = d > 8 ? 3.0 : 1.8; f.play(d > 8 ? 'Sprint_Loop' : 'Jog_Fwd_Loop', { fade: 0.3, speed: 0.85 }); }
        else { // 对峙：在对峙距离上慢慢游走，经常站定观察
          fo.strafeT = (fo.strafeT || 0) - dt;
          if (fo.strafeT <= 0) { fo.strafeT = 1.8 + Math.random() * 2.2; const r0 = Math.random(); fo.strafeDir = r0 < 0.45 ? 0 : r0 < 0.72 ? -1 : 1; }
          strafe = fo.strafeDir || 0; if (d < hold - 0.6) strafe = 2;
          if (strafe === 2) f.play('Walk_Loop', { fade: 0.35, speed: -0.75 }); // 倒着走 = 后退
          else if (strafe) { f.play('Walk_Loop', { fade: 0.35, speed: 0.7 }); turnTo = face + strafe * 0.75; } // 侧移：身体偏向移动方向
          else f.play(fo.armed ? 'Sword_Idle' : 'Idle_Loop', { fade: 0.35 });
        }
      } else if (!SMART && fo.state === 'flee') {
        turnTo = Math.atan2(-dx, -dz); spd = 3.2 + fo.rar * 0.2; f.play('Sprint_Loop', { fade: 0.2 });
        const pr = Math.hypot(fo.pos.x, fo.pos.z);
        if (pr > ctx.R - 3) { const tx = -fo.pos.z / pr, tz = fo.pos.x / pr, sg = (tx * -dx + tz * -dz) > 0 ? 1 : -1; turnTo = Math.atan2(tx * sg * 0.9 - fo.pos.x / pr * 0.3, tz * sg * 0.9 - fo.pos.z / pr * 0.3); if (d < 2.2 && fo.cd <= 0) { fo.state = 'chase'; talk(fo, pickR(Math.random, SAY.fight)); } }
        else if (fo.sayT <= 0 && Math.random() < 0.006) talk(fo, pickR(Math.random, SAY.flee));
      }
      else if (SMART && fo.state === 'retreat') { // 第二十一轮：重伤后退开整顿（聪明的敌人不会一味送死）
        fo.retT -= dt; turnTo = Math.atan2(-dx, -dz); if (d > 7.5) { turnTo = face; spd = 0; f.play(fo.armed ? 'Sword_Idle' : 'Idle_Loop', { fade: 0.3 }); fo.hp = Math.min(fo.maxHp, fo.hp + fo.maxHp * 0.05 * dt); }
        else { spd = 3.6; f.play('Jog_Fwd_Loop', { fade: 0.25, speed: 0.9 }); }
        if (fo.retT <= 0 || (d < 2.6 && fo.cd <= 0)) { fo.state = 'chase'; fo.cd = 0.3; talk(fo, pickR(Math.random, SAY2.back)); }
      }
      else if (fo.state === 'chase') {
        // 第二十一轮：更聪明的追击 —— 预判拦截、包抄站位、惩罚逃跑、丢失目标会去搜索；速度足以追上疾跑后没体力的玩家
        const hold = fo.armed ? 2.7 : 2.2, atkR = fo.armed ? 1.55 : 1.15, mine = tokenOK(fo);
        const sprint = fo.boss ? 5.9 : 4.9 + fo.iq * 1.1 + fo.rar * 0.15;
        goal = [P.pos.x, P.pos.z, 'P']; const pv = ctx.pvel || { x: 0, z: 0 }, away = (pv.x * dx + pv.z * dz) / d; // 玩家远离我的速度
        const track = see || ((fo.lostT || 0) < 0.05 || fo.t % 0.25 < dt) && d < 22 && ctx.sees(fo.pos, 22); if (track) { fo.lostT = 0; (fo.lastSeen || (fo.lastSeen = new V3())).set(P.pos.x, 0, P.pos.z); } else fo.lostT = (fo.lostT || 0) + dt;
        if (!fo.boss && fo.hp < fo.maxHp * 0.3 && !fo.retreated && fo.iq > 0.45 && !fo.atk) { fo.retreated = true; fo.state = 'retreat'; fo.retT = 3 + Math.random() * 2.5; talk(fo, pickR(Math.random, SAY2.hurt)); }
        else if (fo.lostT > 1.2 && fo.lastSeen) { // 看不见你了：去最后看见的位置找
          const lx = fo.lastSeen.x - fo.pos.x, lz = fo.lastSeen.z - fo.pos.z, ld = Math.hypot(lx, lz);
          if (ld > 1.2) { turnTo = Math.atan2(lx, lz); goal = [fo.lastSeen.x, fo.lastSeen.z, 'P']; spd = 3.4; f.play('Jog_Fwd_Loop', { fade: 0.3, speed: 0.85 }); } else { turnTo = fo.yaw + Math.sin(fo.t * 1.3) * 1.5; f.play(fo.armed ? 'Sword_Idle' : 'Idle_Loop', { fade: 0.3 }); }
          if (fo.lostT > 7) { fo.state = 'idle'; fo.seen = false; talk(fo, pickR(Math.random, SAY2.lost)); }
        }
        else if (fo.armed && fo.cd <= 0 && mine && d > 2.3 && d < 5.2 && (away > 2.2 ? Math.random() < 0.06 : fo.iq > 0.6 && Math.random() < 0.01)) { attack(fo, d, 'Sword_Dash'); if (away > 2.2 && fo.atk && fo.sayT <= 0) talk(fo, pickR(Math.random, SAY2.run)); } // 你一转身逃跑，她就冲刺斩
        else if (fo.cd <= 0 && mine) { // 轮到我：预判你的走位拦截，到出手距离就起手
          if (d > atkR) { const lead = Math.min(0.9, d / sprint) * (0.3 + fo.iq * 0.7); turnTo = Math.atan2(dx + pv.x * lead, dz + pv.z * lead); spd = d > 4 ? sprint : Math.min(sprint, Math.max(2.2, away + 1.4)); f.play(spd > 3.3 ? 'Sprint_Loop' : 'Walk_Loop', { fade: 0.25, speed: spd > 3.3 ? 1 : 1.2 }); }
          else { turnTo = face; attack(fo, d); }
        }
        else if (d > hold + 2.2) { // 追上来：远了就疾跑（带预判）
          const lead = Math.min(1.1, d / sprint) * (0.3 + fo.iq * 0.7); turnTo = Math.atan2(dx + pv.x * lead, dz + pv.z * lead);
          spd = d > 7 ? sprint : Math.min(sprint, Math.max(3.4, away + 1.5)); f.play(spd > 4.2 ? 'Sprint_Loop' : 'Jog_Fwd_Loop', { fade: 0.25, speed: spd > 4.2 ? 1 : 0.9 });
        }
        else { // 包抄：每个敌人占玩家周围不同的角度槽，不再全挤在正面；到位后站定观察/小幅游走
          turnTo = face; let k = 0, n = 0; for (const o of FOES) { if (o.dead || o.state !== 'chase' || !o.seen) continue; if (o === fo) k = n; n++; }
          const pf = Math.atan2(-Math.sin(ctx.player.yaw), -Math.cos(ctx.player.yaw)); // 玩家面朝方向（世界角）
          const off = n <= 1 ? 0 : (k - (n - 1) / 2) * Math.min(1.1, 3.4 / n) * 1.25 + (fo.iq > 0.7 && n > 1 ? 0.25 : 0);
          const sa = pf + off, gx = P.pos.x + Math.sin(sa) * hold, gz = P.pos.z + Math.cos(sa) * hold, ex = gx - fo.pos.x, ez = gz - fo.pos.z, ed = Math.hypot(ex, ez);
          if (ed > 0.6) { // 走向自己的槽位：身体朝玩家，横着/倒着走过去
            fo.slotV = fo.slotV || new V3(); fo.slotV.set(ex / ed, 0, ez / ed); strafe = 3; f.play('Walk_Loop', { fade: 0.35, speed: (fo.slotV.x * dx + fo.slotV.z * dz) < 0 ? -0.8 : 0.8 });
          } else { fo.strafeT = (fo.strafeT || 0) - dt; if (fo.strafeT <= 0) { fo.strafeT = 1.4 + Math.random() * 1.8; const r0 = Math.random(); fo.strafeDir = r0 < 0.5 ? 0 : r0 < 0.75 ? -1 : 1; }
            strafe = fo.strafeDir || 0; if (d < hold - 0.6) strafe = 2;
            if (strafe === 2) f.play('Walk_Loop', { fade: 0.35, speed: -0.75 }); else if (strafe) f.play('Walk_Loop', { fade: 0.35, speed: 0.7 }); else f.play(fo.armed ? 'Sword_Idle' : 'Idle_Loop', { fade: 0.35 }); }
          if (fo.sayT <= 0 && Math.random() < 0.004) talk(fo, pickR(Math.random, n > 1 ? SAY2.pack : SAY2.duel));
        }
      } else if (fo.state === 'flee') { // 第二十一轮：逃向最近的门——跑到门口就真的逃掉了（首级也就没了）
        const doors = DOORESC ? ctx.doors || [] : []; let tg = null, best = 1e9;
        for (const dr of doors) { const ddx = dr.x - fo.pos.x, ddz = dr.z - fo.pos.z, dd = Math.hypot(ddx, ddz) || 1; const toward = -(ddx * dx + ddz * dz) / dd / d; const cost = dd * (1 + Math.max(0, -toward) * 1.6); if (cost < best) { best = cost; tg = dr; } }
        spd = 3.9 + fo.rar * 0.25 + fo.iq * 0.4; f.play('Sprint_Loop', { fade: 0.2 });
        if (tg) { const ddx = tg.x - fo.pos.x, ddz = tg.z - fo.pos.z, dd = Math.hypot(ddx, ddz); turnTo = Math.atan2(ddx, ddz); if (d > 3) goal = [tg.x, tg.z, 'D' + doors.indexOf(tg)];
          if (d < 3 && Math.abs(ang(Math.atan2(ddx, ddz) - face)) < 0.6) turnTo = Math.atan2(ddx, ddz) + (ang(face - Math.atan2(ddx, ddz)) > 0 ? -0.9 : 0.9); // 你挡在门前：绕开
          if (fo.flash > 0) fo.doorT = 0; // 开门时挨了一刀：被打断
          if (dd < 1.7) { spd = 0; turnTo = Math.atan2(ddx, ddz); f.play('Idle_Loop', { fade: 0.2 }); if (!fo.doorT) { fo.doorT = 1e-3; if (ctx.toast) ctx.toast(`🚪 ${fo.h.c.name} 正在开门逃跑——快追上砍她！`, '#ffcf80', 1.4); } fo.doorT += dt; if (fo.doorT > 1.2) { escape(fo); continue; } }
          else if (fo.doorT && dd > 2.5) fo.doorT = 0;
          if (!fo.doorSaid && dd < 8) { fo.doorSaid = true; talk(fo, pickR(Math.random, SAY2.door)); }
        } else turnTo = Math.atan2(-dx, -dz);
        if (d < 1.9 && fo.cd <= 0 && Math.random() < 0.02 + fo.iq * 0.02) { fo.state = 'chase'; fo.brave = true; talk(fo, pickR(Math.random, SAY.fight)); } // 被追上：困兽之斗
        else if (fo.sayT <= 0 && Math.random() < 0.006) talk(fo, pickR(Math.random, SAY.flee));
      } else { f.play(fo.idleClip, { fade: 0.3 }); }
      if (fo.spdMul && fo.spdMul !== 1 && spd > 0.5 && !fo.atk && fo.state !== 'flee') spd *= fo.spdMul;
      if (SMART && spd > 0.5 && turnTo != null && !fo.atk) { // 第二十一轮：绕开树/石头/墙，卡住就换方向绕路
        if (fo.sideT > 0) fo.sideT -= dt; if (fo.detour > 0) { fo.detour -= dt; turnTo = fo.detourYaw; } else turnTo = goal ? steer(fo, turnTo, goal) : avoidC(fo, turnTo);
        fo.stuckT = (fo.stuckT || 0) + dt; if (fo.stuckT > 0.5) { const lp = fo.lastP || (fo.lastP = fo.pos.clone()), mv = Math.hypot(fo.pos.x - lp.x, fo.pos.z - lp.z); if (mv < spd * 0.5 * 0.3 && !fo.detour) { fo.detour = 0.9 + Math.random() * 0.6; fo.detourYaw = unstick(fo, turnTo); } lp.copy(fo.pos); fo.stuckT = 0; } }
      if (turnTo != null) fo.yaw += clampA(ang(turnTo - fo.yaw), 6 * dt * (0.6 + fo.iq) * (spd > 4 ? 1.4 : 1));
      { // 第十九轮：速度带加速度（不再瞬间换向）；侧移/后退都以“面向玩家”的方向为基准
        let vx = 0, vz = 0; if (spd > 0) { vx = Math.sin(fo.yaw) * spd; vz = Math.cos(fo.yaw) * spd; }
        if (strafe === 3 && !fo.atk && fo.stag <= 0 && fo.slotV) { vx += fo.slotV.x * 1.6; vz += fo.slotV.z * 1.6; }
        else if (strafe && !fo.atk && fo.stag <= 0) { if (strafe === 2) { vx -= Math.sin(face) * 0.8; vz -= Math.cos(face) * 0.8; } else { vx += Math.cos(face) * strafe * 0.65; vz -= Math.sin(face) * strafe * 0.65; } }
        if (fo.rv) { vx += fo.rv.x; vz += fo.rv.z; fo.rv = null; } // 职业给的额外世界速度（绕背 / 翻滚 / 倒退）
        const fv = fo.fv || (fo.fv = new V3()), kk = 1 - Math.exp(-(fo.atk ? 14 : 6) * dt); fv.x += (vx - fv.x) * kk; fv.z += (vz - fv.z) * kk;
        fo.pos.x += fv.x * dt; fo.pos.z += fv.z * dt;
        const pd = Math.hypot(fo.pos.x - P.pos.x, fo.pos.z - P.pos.z), mn = 1.05; // 永远不贴进玩家 1.05m 内（第一人称近裁剪穿模闪烁）
        if (pd < mn && pd > 1e-4) { fo.pos.x = P.pos.x + (fo.pos.x - P.pos.x) / pd * mn; fo.pos.z = P.pos.z + (fo.pos.z - P.pos.z) / pd * mn; }
      }
      if (fo.state === 'chase') guardAI(fo, dt, d); guardShow(fo);
      collide(fo.pos, 0.35); fo.pos.y = ctx.H(fo.pos.x, fo.pos.z); f.root.rotation.y = fo.yaw;
      f.mixer.update(dt);
      fo.f.bones.head.getWorldPosition(fo.anchor.pos); fo.anchor.pos.y -= 0.3;
      { // 受击闪红 + 第十九轮：蓄力时身体渐亮（红=普通，橙=重击），出手瞬间最亮 —— 只改 uniform，不新建材质
        if (fo.flash > 0) fo.flash -= dt; let er = 0, eg = 0, eb = 0;
        const A = fo.atk, hh = A && A.hits && A.hits[A.hi];
        if (hh && A.tot > 0) { const k = Math.max(0, 1 - atkLeft(A) / A.tot); const e = 0.08 + 0.42 * k * k; if (hh.heavy) { er = e; eg = e * 0.45; } else { er = e; eg = e * 0.08; eb = e * 0.04; } }
        if (fo.flash > 0) { er = Math.max(er, 0.55); eg = Math.max(eg, 0.04); eb = Math.max(eb, 0.02); }
        const key = Math.round(er * 50) * 10000 + Math.round(eg * 50) * 100 + Math.round(eb * 50);
        if (key !== fo.eKey) { fo.eKey = key; fo.flashOn = fo.flash > 0; for (const m of fo.mats) if (m.emissive) m.emissive.setRGB(er, eg, eb); }
      }
      fo.blinkT -= dt; if (fo.blinkT < 0) { const b = fo.blinkT > -0.07 ? -fo.blinkT / 0.07 : fo.blinkT > -0.16 ? 1 - (-fo.blinkT - 0.07) / 0.09 : 0; try { f.hb.setExpression({ blink: Math.max(0, b) }); } catch (e) {} if (fo.blinkT < -0.16) fo.blinkT = 2 + Math.random() * 4; }
      if (fo.warn) { const A = fo.atk, hh = A && A.act && A.hits && A.hits[A.hi]; fo.warn.visible = !!(hh && hh.t - A.act.time > 0.04); if (fo.warn.visible) { fo.warn.material.color.set(hh.heavy ? '#ffa030' : '#ffffff'); fo.warn.position.copy(fo.anchor.pos); fo.warn.position.y += 0.6; const k = 0.16 + 0.1 * (A.tot > 0 ? Math.max(0, 1 - atkLeft(A) / A.tot) : 0); fo.warn.scale.set(k, k, 1); } } // 第十九轮：不再 30rad/s 脉动闪烁，随蓄力平稳变大
      if (fo.broken > 0) fo.broken -= dt;
    }
    for (const h of HEADS) bodyPhys(h, dt, 0.11);
    for (const p of PIECES) bodyPhys(p, dt, p.rad);
    for (let i = FX.length - 1; i >= 0; i--) { const x = FX[i]; x.t -= dt; x.v.y -= 9.8 * dt; x.o.position.addScaledVector(x.v, dt); const gy = ctx.H(x.o.position.x, x.o.position.z) + 0.01;
      if (x.o.position.y < gy) { x.o.position.y = gy; if (x.decal) { decal(x.o.position, 0.06 + Math.random() * 0.12); x.decal = false; } x.v.set(0, 0, 0); x.t = Math.min(x.t, 0.25); }
      if (x.t <= 0) { x.o.parent && x.o.parent.remove(x.o); FX[i] = FX[FX.length - 1]; FX.pop(); if (POOL.length < 300) POOL.push(x); } }
  }
  let slowT = 0, slowK = 1; function slowmo(t, k) { slowT = Math.max(slowT, t); slowK = Math.min(k, slowT > 0 ? slowK : 1); }
  const ang = a => Math.atan2(Math.sin(a), Math.cos(a)), clampA = (a, m) => Math.max(-m, Math.min(m, a));
  function collideList(p, r, cols) { for (const c of cols) { const ex = p.x - c.x, ez = p.z - c.z, m = c.r + r, e2 = ex * ex + ez * ez; if (e2 >= m * m) continue; const e = Math.sqrt(e2); if (e > 1e-5) { p.x += ex / e * (m - e); p.z += ez / e * (m - e); } } const pr = Math.hypot(p.x, p.z), pl = CTX.R - 1; if (pr > pl) { p.x *= pl / pr; p.z *= pl / pr; } }
  function collide(p, r) { const ctx = CTX; for (const c of ctx.cols) { const ex = p.x - c.x, ez = p.z - c.z, m = c.r + r, e2 = ex * ex + ez * ez; if (e2 >= m * m) continue; const e = Math.sqrt(e2); if (e > 1e-5) { p.x += ex / e * (m - e); p.z += ez / e * (m - e); } } const pr = Math.hypot(p.x, p.z), pl = ctx.R - 1; if (pr > pl) { p.x *= pl / pr; p.z *= pl / pr; } }
  function alertNear(src) { for (const o of FOES) if (o !== src && !o.dead && !o.seen && o.pos.distanceTo(src.pos) < 13) { o.seen = true; o.state = o.boss ? 'chase' : (o.brave ? 'chase' : 'flee'); o.cd = Math.max(o.cd, 0.8 + Math.random()); if (o.boss) CTX.bossMeet(o); else if (Math.random() < 0.5) setTimeout(() => talk(o, pickR(Math.random, ['有人闯进来了！', '在那边！', '小心——', '快去叫人！'])), 400 + Math.random() * 600); } }
  const SAY2 = { hurt: ['唔……先退一步。', '别逼我……', '等等，喘口气——', '我还没输！'], back: ['再来！', '这次不会让你得逞。', '我看穿你了。'], lost: ['……跑哪去了？', '藏起来了吗……', '奇怪，刚才还在这。'],
    run: ['想跑？！', '别走！', '站住——'], pack: ['包围它！', '从侧面上！', '一起上！', '别让它跑了！'], duel: ['来啊。', '你的破绽太多了。', '就这点本事？'], door: ['门就在前面……！', '快出去——！', '只要出了这扇门……'] };
  function avoid(fo, yaw, look) { // 第二十一轮：找挡在路线上最近的圆形障碍，转向它的切线方向（大石头也能绕开）
    const cols = CTX.cols, fx = Math.sin(yaw), fz = Math.cos(yaw); let best = null, bA = 1e9;
    for (const c of cols) { const rx = c.x - fo.pos.x, rz = c.z - fo.pos.z, m = c.r + 0.5, L = look + m; if (rx * rx + rz * rz > L * L) continue; const along = rx * fx + rz * fz; if (along < -0.1) continue;
      const lat = rx * fz - rz * fx; if (Math.abs(lat) < m && along < bA) { bA = along; best = { c, lat, m, rx, rz }; } }
    let out = yaw;
    if (best) { const dC = Math.hypot(best.rx, best.rz) || 1e-3, cA = Math.atan2(best.rx, best.rz), half = Math.asin(Math.min(1, best.m / dC)) + 0.12;
      if (!(fo.sideT > 0)) fo.side = best.lat > 0 ? -1 : 1; fo.sideT = 1.5; // 选定绕行方向后坚持一会儿，沿着树丛/石堆整圈绕过去，不左右摇摆
      out = cA + fo.side * half; }
    const pr = Math.hypot(fo.pos.x, fo.pos.z); if (pr > CTX.R - 3.5) { const k = Math.min(1.5, (pr - (CTX.R - 3.5)) / 3), ox = Math.sin(out) - fo.pos.x / pr * k, oz = Math.cos(out) - fo.pos.z / pr * k; out = Math.atan2(ox, oz); }
    return out; }
  // 第二十一轮：导航网格 + 流场寻路（障碍全是圆，墙=一串小圆；局部绕行会被凹形死角困住，所以用 BFS 距离场）
  let NAV = null; const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  function navBuild() { const R = CTX.R, cs = 0.8, n = Math.ceil(2 * R / cs) + 1, blk = new Uint8Array(n * n), lim = (R - 1.3) * (R - 1.3);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = -R + i * cs, z = -R + j * cs; if (x * x + z * z > lim) blk[j * n + i] = 1; }
    for (const c of CTX.cols) { const rr = c.r + 0.3, i0 = Math.max(0, Math.floor((c.x - rr + R) / cs)), i1 = Math.min(n - 1, Math.ceil((c.x + rr + R) / cs)), j0 = Math.max(0, Math.floor((c.z - rr + R) / cs)), j1 = Math.min(n - 1, Math.ceil((c.z + rr + R) / cs));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const x = -R + i * cs - c.x, z = -R + j * cs - c.z; if (x * x + z * z < rr * rr) blk[j * n + i] = 1; } }
    NAV = { cols: CTX.cols, nc: CTX.cols.length, R, cs, n, blk, fields: new Map(), q: new Int32Array(n * n) }; }
  function navCell(x, z) { const N = NAV, i = Math.max(0, Math.min(N.n - 1, Math.round((x + N.R) / N.cs))), j = Math.max(0, Math.min(N.n - 1, Math.round((z + N.R) / N.cs))); return j * N.n + i; }
  function navFree(c, rad) { const N = NAV; if (!N.blk[c]) return c; const i0 = c % N.n, j0 = (c / N.n) | 0; for (let r = 1; r <= rad; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue; const i = i0 + di, j = j0 + dj; if (i < 0 || j < 0 || i >= N.n || j >= N.n) continue; const k = j * N.n + i; if (!N.blk[k]) return k; } return -1; }
  function navField(key, x, z, minGap) { if (!NAV || NAV.cols !== CTX.cols || NAV.nc !== CTX.cols.length) navBuild(); const N = NAV; let F = N.fields.get(key);
    const src = navFree(navCell(x, z), 6); if (src < 0) return null; if (F && (F.src === src || CLK - F.at < (minGap || 0))) return F.d;
    if (!F) { F = { d: new Uint16Array(N.n * N.n), src: -1, at: 0 }; N.fields.set(key, F); } const d = F.d, q = N.q, n = N.n, blk = N.blk; d.fill(65535); F.src = src; F.at = CLK;
    let h = 0, t = 0; d[src] = 0; q[t++] = src;
    while (h < t) { const c = q[h++], i = c % n, j = (c / n) | 0, dc = d[c] + 1;
      for (let k = 0; k < 8; k++) { const ii = i + NB[k][0], jj = j + NB[k][1]; if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue; const e = jj * n + ii; if (blk[e] || d[e] <= dc) continue;
        if (k >= 4 && (blk[j * n + ii] || blk[jj * n + i])) continue; d[e] = dc; q[t++] = e; } }
    return d; }
  function flowYaw(fo, d) { if (!d) return null; const N = NAV, n = N.n; let c = navFree(navCell(fo.pos.x, fo.pos.z), 3); if (c < 0 || d[c] === 65535) return null;
    for (let s = 0; s < 3; s++) { const i = c % n, j = (c / n) | 0; let b = c, bd = d[c]; for (let k = 0; k < 8; k++) { const ii = i + NB[k][0], jj = j + NB[k][1]; if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue; const e = jj * n + ii; if (d[e] < bd && !(k >= 4 && (N.blk[j * n + ii] || N.blk[jj * n + i]))) { bd = d[e]; b = e; } } if (b === c) break; c = b; }
    const tx = -N.R + (c % n) * N.cs, tz = -N.R + ((c / n) | 0) * N.cs; if (Math.hypot(tx - fo.pos.x, tz - fo.pos.z) < 0.05) return null; return Math.atan2(tx - fo.pos.x, tz - fo.pos.z); }
  function steer(fo, yaw, goal) { // 每个敌人约 8 次/秒重新规划（错开帧），其余帧沿用：直走模式沿用绕障偏角，流场模式沿用方向
    if (fo.planAt != null && CLK - fo.planAt < 0.12) return fo.planFlow ? fo.planYaw : yaw + fo.planOff;
    fo.planAt = CLK + (fo.id % 5) * 0.004; const r = steer0(fo, yaw, goal); fo.planFlow = r[1]; fo.planYaw = r[0]; fo.planOff = ang(r[0] - yaw); return r[0]; }
  function avoidC(fo, yaw) { // 绕障（非寻路时）也限频
    if (fo.avAt != null && CLK - fo.avAt < 0.1) return yaw + fo.avOff; fo.avAt = CLK + (fo.id % 5) * 0.004; const y = avoid(fo, yaw, 2.2); fo.avOff = ang(y - yaw); return y; }
  function steer0(fo, yaw, goal) { // 直线畅通就直走（带小幅绕障），被挡住就沿流场走
    const dx = goal[0] - fo.pos.x, dz = goal[1] - fo.pos.z, dist = Math.hypot(dx, dz);
    if (clearRay(fo, Math.atan2(dx, dz), Math.min(dist, 9))) return [avoid(fo, yaw, 2.2), false];
    const y = flowYaw(fo, navField(goal[2], goal[0], goal[1], goal[2] === 'P' ? 0.25 : 99)); return y == null ? [avoid(fo, yaw, 2.2), false] : [y, true]; }
  function clearRay(fo, yaw, len) { const fx = Math.sin(yaw), fz = Math.cos(yaw); for (const c of CTX.cols) { const rx = c.x - fo.pos.x, rz = c.z - fo.pos.z, along = rx * fx + rz * fz; if (along < -0.2 || along > len + c.r) continue; if (Math.abs(rx * fz - rz * fx) < c.r + 0.45) return false; } const ex = fo.pos.x + fx * len, ez = fo.pos.z + fz * len; return Math.hypot(ex, ez) < CTX.R - 1.5; }
  function unstick(fo, goal) { const pref = fo.side || (Math.random() < 0.5 ? 1 : -1); for (const a of [0.7, 1.3, 1.9, 2.5, 3.1]) for (const sg of [pref, -pref]) { const y = goal + a * sg; if (clearRay(fo, y, 2.6)) { fo.side = sg; fo.sideT = 2; return y; } } return goal + Math.PI; }
  function escape(fo) { fo.dead = true; fo.escaped = true; fo.rag = null; fo.spurt = 0; if (fo.warn) fo.warn.visible = false; if (fo.gs) fo.gs.visible = false; if (fo.f.root.parent) fo.f.root.parent.remove(fo.f.root); talk(fo, ''); if (CTX.escaped) try { CTX.escaped(fo); } catch (e) { console.warn(e); } }
  function talk(fo, text, col) { if (!CTX || fo.dead) return; CTX.say(fo.anchor, text, col); fo.sayT = 3 + Math.random() * 2; }
  // 第十六轮：每个攻击动作实测（_tools/fclip.py：右手蓄力位→命中位的位移）得到命中时刻（动作内秒）与来刀方向（玩家屏幕角：0=右 90=上 ±180=左 -90=下）
  const D2R = Math.PI / 180;
  const ATK = {
    Sword_Regular_A: { hits: [[0.25, -132]] }, Sword_Regular_B: { hits: [[0.27, -23]] }, Sword_Regular_C: { hits: [[0.63, 55]], end: 1.2 },
    Sword_Attack: { hits: [[0.37, 80, 'heavy']], end: 1.1 }, Sword_Dash: { hits: [[0.33, -18]], lunge: 3.4, end: 1.0 },
    Sword_Regular_Combo: { hits: [[0.25, -132], [0.73, -23], [1.25, -173], [1.53, 60]], end: 2.1 },
    Sword_Heavy_Combo: { hits: [[0.4, -22], [1.83, -19], [2.57, 73, 'heavy']], end: 3.2 },
    Punch_Jab: { hits: [[0.3, 0, 'thrust']] }, Punch_Cross: { hits: [[0.22, 0, 'thrust']] }, Melee_Hook: { hits: [[0.23, 150]] },
    OverhandThrow: { hits: [[0.6, 0, 'thrust']], end: 1.05 } // 投掷手（foe_roles）：出手帧为估计值
  };
  // 第十九轮：攻击令牌 —— 同一时间最多 1 人出手（有霸主时 2 人），两次出手之间至少隔 0.6s；霸主总能出手
  let lastAtkAt = -9, CLK = 0;
  function tokenOK(fo) { if (fo.boss) return true; if (CLK - lastAtkAt < 0.6) return false;
    let n = 0, boss = false; for (const o of FOES) { if (o.dead) continue; if (o.boss) boss = true; if (o !== fo && o.atk) n++; } return n < (boss ? 2 : 1); }
  function attack(fo, d, force) {
    const f = fo.f, s = CTX.st(), r = Math.random();
    let clip;
    if (force) clip = force;
    else if (fo.armed) {
      const elite = fo.boss || fo.rar >= 3 || fo.iq > 0.95;
      if (fo.boss) clip = r < 0.22 ? 'Sword_Heavy_Combo' : r < 0.4 ? 'Sword_Regular_Combo' : r < 0.55 ? 'Sword_Attack' : pickR(Math.random, ['Sword_Regular_A', 'Sword_Regular_B', 'Sword_Regular_C']);
      else clip = elite && r < 0.2 ? 'Sword_Regular_Combo' : elite && r < 0.32 ? 'Sword_Attack' : pickR(Math.random, ['Sword_Regular_A', 'Sword_Regular_B', 'Sword_Regular_C', 'Sword_Regular_A']);
    } else clip = pickR(Math.random, ['Punch_Jab', 'Punch_Cross', 'Melee_Hook', 'Melee_Hook']);
    if (fo.role && window.FoeRoles) clip = FoeRoles.clip(fo, clip, d, force) || clip;
    const c = f.clips[clip], T = ATK[clip]; if (!c || !T) return;
    const base = fo.boss ? (fo.rage ? 0.08 : 0.07) : 0.03 + fo.rar * 0.014 + (fo.armed ? 0.02 : 0); // 第十九轮：BOSS 每刀 10%→7%（狂暴 8%）
    const ws = fo.boss ? 0.45 : 0.34 + Math.min(0.2, fo.iq * 0.12);
    const hits = T.hits.map(([t, a, k]) => ({ t, a: a * D2R, ang: a * D2R, heavy: k === 'heavy', thrust: k === 'thrust' }));
    const act = f.play(clip, { once: true, fade: 0.12, speed: 1, restart: true }); if (!act) return; lastAtkAt = CLK; if (CTX.windup) try { CTX.windup(fo, clip); } catch (e) {}
    fo.atk = { clip, act, hits, hi: 0, ws, ws2: Math.min(1, ws * 1.7), end: Math.min(c.duration, T.end || c.duration), lunge: T.lunge || 0,
      holdAt: Math.min(0.1, hits[0].t * 0.4), hold: fo.boss ? 0.3 : 0.34 - Math.min(0.14, fo.iq * 0.1), feint: !fo.boss && fo.iq > 0.8 && Math.random() < 0.14,
      reach: fo.armed ? 1.8 : 1.35, tot: 0, dmg: Math.max(1, Math.round(s.maxHp * base * (0.85 + Math.random() * 0.3))) };
    if (fo.role && window.FoeRoles) FoeRoles.tune(fo, fo.atk, d);
    if (fo.sayT <= 0 && Math.random() < 0.25) talk(fo, fo.boss ? '' : pickR(Math.random, SAY.fight), '#ffb0a0');
  }
  // 当前这一刀还要多久（真实秒）
  function atkLeft(A) { const h = A.hits[A.hi]; if (!h) return 0; const ct = A.act.time, w = A.hi ? A.ws2 : A.ws, hold = A.hold > 0;
    return (hold ? A.hold + Math.max(0, A.holdAt - ct) / w : 0) + Math.max(0, h.t - 0.06 - Math.max(ct, hold ? A.holdAt : 0)) / w + Math.min(0.06, Math.max(0, h.t - ct)); }
  function atkStep(fo, dt, d, face) {
    const A = fo.atk, act = A.act, ct = act.time, h = A.hits[A.hi]; let sc = 0.9, turnTo = null, spd = 0;
    if (h) {
      if (A.hold > 0 && ct >= A.holdAt) { sc = 0; A.hold -= dt; if (A.hold <= 0 && A.feint) { fo.atk = null; fo.cd = 0.35; fo.f.play(fo.armed ? 'Sword_Idle' : 'Idle_Loop', { fade: 0.15 }); if (Math.random() < 0.5) talk(fo, pickR(Math.random, ['骗你的～', '嘿……', '别紧张嘛'])); return { turnTo: face, spd: 0 }; } }
      else sc = ct < h.t - 0.06 ? (A.hi ? A.ws2 : A.ws) : 1;
      if (ct < h.t - 0.14) turnTo = face; // 出手前最后一瞬不再转身：侧闪有效
      if (A.lunge && ct < h.t && d > 1.1 && sc > 0) spd = A.lunge;
      const left = atkLeft(A); if (left > A.tot) A.tot = left;
      if (ct >= h.t) { A.hi++; A.tot = 0;
        if (window.CombatFX) CombatFX.enemySwing(fo, h);
        if (A.ranged) FoeRoles.fire(fo, h, d);
        else if (d < A.reach && Math.abs(ang(face - fo.yaw)) < 0.9) CTX.hitPlayer(fo, Math.round(A.dmg * (h.heavy ? 1.6 : 1)), h);
        else if (fo.sayT <= 0 && Math.random() < 0.3) talk(fo, '……躲开了？'); }
    }
    act.timeScale = sc;
    if (!A.hits[A.hi] && (ct >= A.end - 1e-3 || ct >= act.getClip().duration - 1e-3)) { fo.atk = null; fo.cd = (fo.boss ? (fo.rage ? 1.0 : 1.5) : 2.2) + Math.random() * Math.max(0.6, 2.4 - fo.iq); fo.f.play(fo.armed ? 'Sword_Idle' : 'Idle_Loop', { fade: 0.2 }); if (fo.role && window.FoeRoles) FoeRoles.after(fo); }
    return { turnTo, spd };
  }
  // 给 HUD：正在蓄力/出手的敌人 → 来刀方向 + 进度（1 = 命中那一刻）
  function threats() {
    const out = []; if (!CTX) return out; const P = CTX.player;
    for (const fo of FOES) { const A = fo.atk; if (fo.dead || !A) continue; const h = A.hits[A.hi]; if (!h) continue;
      const dx = fo.pos.x - P.pos.x, dz = fo.pos.z - P.pos.z, d = Math.hypot(dx, dz); if (d > 5.5) continue;
      const left = atkLeft(A), k = A.tot > 0 ? Math.max(0, Math.min(1, 1 - left / A.tot)) : 0;
      const rel = ang(Math.atan2(-dx, -dz) - P.yaw); const side = Math.abs(rel) > 0.95 ? (rel > 0 ? -1 : 1) : 0;
      out.push({ ang: h.a, heavy: h.heavy, thrust: h.thrust, k, left, side, fo }); }
    return out;
  }
  // ---- 敌人的方向格挡（蓝色弧 = 她挡住的那一侧；从别的方向砍 / 蓄力重斩破防）----
  function guardMat() { if (guardMat.tex) return new THREE.SpriteMaterial({ map: guardMat.tex, depthTest: false, transparent: true });
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.lineCap = 'round';
    g.strokeStyle = 'rgba(120,190,255,0.9)'; g.lineWidth = 12; g.beginPath(); g.arc(64, 64, 50, -Math.PI / 2 - 0.75, -Math.PI / 2 + 0.75); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 3; g.beginPath(); g.arc(64, 64, 50, -Math.PI / 2 - 0.75, -Math.PI / 2 + 0.75); g.stroke();
    guardMat.tex = new THREE.CanvasTexture(c); return guardMat(); }
  function guardAI(fo, dt, d) {
    if (!(fo.armed || fo.iq > 0.75) || fo.atk || fo.stag > 0 || d > 2.9) { if (fo.block > 0 && d > 3.5) fo.block = 0; return; }
    fo.gTick = (fo.gTick || 0) - dt; if (fo.gTick > 0) return; fo.gTick = 0.5 - Math.min(0.3, fo.iq * 0.25); // 反应周期：越聪明越快
    const aim = CTX.handAng ? CTX.handAng(fo) : null; if (aim == null) return;
    const err = (Math.random() - 0.5) * 2 * Math.max(0.1, (1.1 - fo.iq)) * 0.7;
    if (fo.block > 0) { fo.gAng = aim + err; return; } // 跟着玩家的手移动格挡
    if (CTX.playerAiming && CTX.playerAiming() && Math.random() < fo.iq * 0.45) { fo.block = 1.2 + Math.random() * 0.9; fo.gAng = aim + err; fo.f.play('Sword_Block', { once: true, fade: 0.1, restart: true }); }
  }
  function guardShow(fo) {
    if (!fo.gs) { fo.gs = new THREE.Sprite(guardMat()); fo.gs.scale.set(0.6, 0.6, 1); fo.gs.renderOrder = 6; CTX.sc.add(fo.gs); }
    const on = fo.block > 0 && !fo.dead; fo.gs.visible = on; if (!on) return;
    const P = CTX.player; tv.set(P.pos.x - fo.pos.x, 0, P.pos.z - fo.pos.z).normalize();
    fo.gs.position.copy(fo.anchor.pos).addScaledVector(tv, 0.35); fo.gs.position.y += 0.12; fo.gs.material.rotation = fo.gAng - Math.PI / 2;
  }
  // ---- 技能接口（worlds.js 调用）----
  function brokenNear(pos, yaw) { let best = null, bd = 2.6; for (const fo of FOES) { if (fo.dead || !(fo.broken > 0)) continue; const dx = fo.pos.x - pos.x, dz = fo.pos.z - pos.z, d = Math.hypot(dx, dz); if (d < bd && Math.abs(ang(Math.atan2(-dx, -dz) - yaw)) < 1.1) { bd = d; best = fo; } } return best; }
  function execute(fo, dir) { // 处决：破绽中按 E
    const nb = fo.f.bones.neck, p = nb.getWorldPosition(new V3()); const v = (dir || new V3(1, 0, 0)).clone().normalize().multiplyScalar(9);
    const info = { point: p, vel: v, speed: 9, kind: 'slash', dir: 'right' }; fo.hp = 0; die(fo, info, true); decapitate(fo, info); slowmo(0.5, 0.3);
    CTX.shake && CTX.shake(0.7); CTX.event && CTX.event('execute', fo); sfx().roar && sfx().roar(0.4);
  }
  function aoe(center, r, mult, kind) { // 旋风斩：周围一圈
    let n = 0; for (const fo of FOES) { if (fo.dead) continue; const dx = fo.pos.x - center.x, dz = fo.pos.z - center.z, d = Math.hypot(dx, dz); if (d > r) continue;
      const cb = fo.f.bones.chest || fo.f.bones.spine, p = cb.getWorldPosition(new V3()); const tg = new V3(-dz, 0, dx).normalize();
      const was = fo.block; fo.block = 0; hit(fo, { point: p, vel: tg.multiplyScalar(9), speed: 9, tipSpeed: 9, kind: 'slash', from: 0, mult, aoe: true }); if (!fo.dead && was > 0) fo.stag = Math.max(fo.stag, 0.6); n++; }
    return n;
  }
  function roar(center, r) { // 战吼：震慑
    let n = 0; for (const fo of FOES) { if (fo.dead) continue; const d = Math.hypot(fo.pos.x - center.x, fo.pos.z - center.z); if (d > r) continue; n++;
      fo.atk = null; fo.block = 0; fo.stag = fo.boss ? 0.8 : 1.6; fo.broken = fo.boss ? 0 : 0.9; fo.f.play('Hit_Knockback', { once: true, fade: 0.05, restart: true });
      if (!fo.boss && Math.random() < 0.5) { fo.state = 'flee'; fo.brave = false; } setTimeout(() => talk(fo, pickR(Math.random, ['呀啊——！', '怪、怪物……', '别过来！']), '#ffd0a0'), 200 + Math.random() * 400); }
    return n;
  }
  // ---- 被砍：部位判定 ----
  const ZN = [['head', 0.13], ['neck', 0.075], ['upperChest', 0.2], ['chest', 0.2], ['spine', 0.19], ['hips', 0.2], ['leftUpperArm', 0.07], ['leftLowerArm', 0.06], ['rightUpperArm', 0.07], ['rightLowerArm', 0.06], ['leftUpperLeg', 0.1], ['leftLowerLeg', 0.08], ['rightUpperLeg', 0.1], ['rightLowerLeg', 0.08]];
  const CHILD = { leftUpperArm: 'leftLowerArm', leftLowerArm: 'leftHand', rightUpperArm: 'rightLowerArm', rightLowerArm: 'rightHand', leftUpperLeg: 'leftLowerLeg', leftLowerLeg: 'leftFoot', rightUpperLeg: 'rightLowerLeg', rightLowerLeg: 'rightFoot', neck: 'head', spine: 'chest', chest: 'neck', upperChest: 'neck', hips: 'spine' };
  function zoneOf(fo, point) { // 点到骨段的最近距离 / 半径，最小者为命中部位
    let best = null, bd = 1e9; const a = new V3(), b = new V3(), ab = new V3(), ap = new V3();
    for (const [z, r] of ZN) { const bo = fo.f.bones[z]; if (!bo || (fo.gone && fo.gone.has(z))) continue; bo.getWorldPosition(a);
      const cb = CHILD[z] && fo.f.bones[CHILD[z]]; if (cb) cb.getWorldPosition(b); else b.copy(a).add(tv2.set(0, z === 'head' ? 0.18 : 0.1, 0));
      if (z === 'head' && fo.decap) continue;
      ab.subVectors(b, a); const t = Math.max(0, Math.min(1, ap.subVectors(point, a).dot(ab) / Math.max(1e-6, ab.lengthSq()))); const dd = a.addScaledVector(ab, t).distanceTo(point) / r;
      if (dd < bd) { bd = dd; best = z; } }
    return best;
  }
  // 刃的扫掠面（上一帧刃线 → 这一帧刃线）与每段骨头（胶囊）求最近距离；返回真正碰到的部位
  const _sp = new V3(), _sa = new V3(), _sb = new V3(), _s0 = new V3(), _s1 = new V3();
  function contact(fo, info) {
    const sg = info.seg; if (!sg) { const z = zoneOf(fo, info.point); return z ? { zone: z, point: info.point, speed: info.speed } : null; }
    const segs = [];
    for (const [z, r] of ZN) { const bo = fo.f.bones[z]; if (!bo || (fo.gone && fo.gone.has(z)) || (z === 'head' && fo.decap)) continue;
      const a = bo.getWorldPosition(new V3()), cb = CHILD[z] && fo.f.bones[CHILD[z]]; const b = cb ? cb.getWorldPosition(new V3()) : a.clone().add(new V3(0, z === 'head' ? 0.18 : 0.1, 0));
      if (z === 'head') { const up = a.clone().sub(fo.f.bones.neck.getWorldPosition(new V3())).normalize(); a.addScaledVector(up, 0.06); b.copy(a).addScaledVector(up, 0.1); }
      segs.push([z, a, b, r * (info.assist ? 1.4 : 1) + (z === 'neck' ? 0.06 : 0.035)]); } // 第二十二轮：辅助瞄准时身体判定略宽
    let best = null, bd = 1, neckB = null, nd = 1;
    for (let i = 0; i <= 6; i++) { const u = i / 6; _s0.copy(sg.b0).lerp(sg.t0, u); _s1.copy(sg.b1).lerp(sg.t1, u);
      for (let j = 0; j <= 4; j++) { _sp.copy(_s0).lerp(_s1, j / 4);
        for (const [z, a, b, r] of segs) { _sa.subVectors(b, a); const t = Math.max(0, Math.min(1, _sb.subVectors(_sp, a).dot(_sa) / Math.max(1e-6, _sa.lengthSq()))); const d = _sb.copy(a).addScaledVector(_sa, t).distanceTo(_sp) / r;
          if (d < bd || (z === 'neck' && d < nd)) { const hit = { zone: z, point: _sp.clone(), speed: info.kind === 'thrust' ? info.speed : Math.max(2, info.tipSpeed * (0.3 + 0.65 * (info.assist ? Math.max(u, 0.75) : u)) / 0.95) }; if (d < bd) { bd = d; best = hit; } if (z === 'neck' && d < nd) { nd = d; neckB = hit; } } } } }
    return neckB || best; // 刃确实扫过脖子（在脖子半径内）就算脖子：斩首要好砍
  }
  function targets() {
    const out = [];
    HEADS.forEach((h, i) => out.push({ id: 'fh' + i + '_' + h.fo.id2, pos: h.g.position, r: 0.15, kind: 'head', onHit: (info) => { const v = (info.vel || new V3()).clone().multiplyScalar(0.45); v.y = Math.max(v.y, 1 + (info.speed || 4) * 0.1); h.vel.copy(v); h.av.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 14); h.rest = 0; sfx().thud && sfx().thud(0.6); return true; } }));
    for (const fo of FOES) { if (fo.escaped) continue;
      const c = fo.f.bones.hips; if (!c) continue; const pos = c.getWorldPosition(new V3()); pos.y += 0.12;
      out.push({ id: fo.id2, pos, r: 1.05, kind: fo.boss ? 'boss' : 'foe', onHit: (info) => hit(fo, info) });
      if (fo.headOnPiece && !fo.decap) out.push({ id: fo.id2 + '_hp', pos: fo.f.holder.getWorldPosition(new V3()), r: 0.3, kind: 'foe', onHit: (info) => { if (info.kind !== 'thrust' && info.speed > 3) { decapitate(fo, info); return true; } return false; } });
    }
    return out;
  }
  function parried(fo) { // worlds.js 在完美格挡时调用
    fo.atk = null; fo.stag = fo.boss ? 1.1 : 1.6; fo.broken = fo.stag + 0.2; fo.f.play('Hit_Knockback', { once: true, fade: 0.05, restart: true }); // 第十八轮：去掉慢动作（被感知为卡顿）
    if (fo.sayT <= 0 || true) talk(fo, pickR(Math.random, ['什……！', '怎么可能……', '呃——！']), '#ffe0a0');
  }
  function hit(fo, info) {
    if (fo.role && window.FoeRoles && !fo.dead && FoeRoles.evade(fo, info)) return false; // 翻滚中：刃穿过去
    const ctx = CTX; const c = contact(fo, info); if (!c) return false; // 刃没碰到身体：不算
    const zone = c.zone, slash = info.kind !== 'thrust', spd = c.speed, sp = Math.max(0.5, Math.min(1.8, spd / 8));
    info = Object.assign({}, info, { point: c.point, speed: spd });
    blood(c.point, slash ? 6 : 3, info.vel);
    if (fo.dead) { // 尸体：可以继续砍——斩首、断肢、腰斩
      if (slash && zone === 'neck' && spd > 3 && !fo.decap) decapitate(fo, info);
      else if (slash && /Arm|Leg/.test(zone) && spd > 4) sever(fo, zone, info);
      else if (slash && (zone === 'spine' || zone === 'hips' || zone === 'chest' || zone === 'upperChest') && spd > 6.5 && !fo.halved) sever(fo, 'spine', info);
      else if (fo.rag) ragKick(fo, info, 0.6);
      sfx().chop && sfx().chop(); return true;
    }
    // 活人：格挡 / 伤害
    let side = 1;
    if (fo.block > 0 && Math.abs(ang(Math.atan2(ctx.player.pos.x - fo.pos.x, ctx.player.pos.z - fo.pos.z) - fo.yaw)) < 1.2) {
      const diff = Math.abs(ang((info.from || 0) - (fo.gAng || 0)));
      if (info.charged) { fo.block = 0; fo.atk = null; fo.stag = fo.boss ? 0.9 : 1.4; fo.broken = fo.stag + 0.2; fo.f.play('Hit_Knockback', { once: true, fade: 0.05, restart: true }); ctx.clang && ctx.clang(c.point, 'break'); ctx.event && ctx.event('guardbreak', fo); talk(fo, pickR(Math.random, ['挡、挡不住……！', '什么力气……', '呜——！']), '#ffe0a0'); }
      else if (!slash || diff < 0.95) { // 正好砍在她格挡的那一侧：弹刀
        if (fo.sayT <= 0) talk(fo, pickR(Math.random, SAY.block)); sfx().thud && sfx().thud(0.8); ctx.clang && ctx.clang(c.point, 'block'); fo.block = Math.max(fo.block, 0.5); fo.cd = Math.min(fo.cd, 0.25); ctx.event && ctx.event('blocked', fo); return true;
      } else { fo.block = 0; side = 1.35; ctx.event && ctx.event('outflank', fo); } // 绕开格挡：破绽伤害
    }
    const q = ctx.power(fo), brk = fo.broken > 0, mult = (zone === 'head' ? 1.6 : zone === 'neck' ? 1.8 : /Arm|Leg/.test(zone) ? 0.7 : 1) * (brk ? 2 : 1) * side * (info.charged ? 2.2 : 1) * (info.mult || 1);
    const dealt = Math.max(1, Math.round((fo.boss ? 11 : 12) * q * sp * mult * (slash ? 1 : 0.8) * (0.85 + Math.random() * 0.3)));
    const first = fo.hp >= fo.maxHp; fo.hp -= dealt; fo.flash = 0.12; ctx.floatDmg(fo.anchor.pos, dealt, sp > 1.2 || brk);
    { const kv = (info.vel || tv.set(0, 0, 0)).clone(); kv.y = 0; if (kv.lengthSq() > 1e-4) { kv.normalize().multiplyScalar((fo.boss ? 0.08 : 0.22) * sp); fo.pos.add(kv); } } // 击退
    ctx.event && ctx.event('hit', fo, { dealt, zone, brk, kind: info.kind, spd, charged: info.charged });
    if (!fo.seen) { fo.seen = true; fo.state = fo.brave ? 'chase' : 'flee'; if (fo.boss) ctx.bossMeet(fo); }
    if (!fo.brave && Math.random() < 0.35) { fo.brave = true; fo.state = 'chase'; }
    if (fo.boss) ctx.bossHp(fo);
    // 斩首：够快的横砍砍中脖子，且这一刀后她剩不到一半血（霸主要剩不到 25%）
    if (slash && zone === 'neck' && spd > 4.5 && (brk || fo.hp <= fo.maxHp * (fo.boss ? 0.25 : 0.5))) { // 破绽中 = 处决，不看血量
      const one = first && !brk; fo.hp = 0; die(fo, info, true); decapitate(fo, info); ctx.event && ctx.event(brk ? 'execute' : one ? 'onecut' : 'decapAlive', fo); return true; }
    if (fo.hp <= 0) {
      die(fo, info, false); if (CTX && CTX.shake) CTX.shake(0.35); // 第十八轮：击杀不再慢放
      if (slash && /Arm|Leg/.test(zone) && spd > 5) sever(fo, zone, info);                    // 致命一刀砍在四肢：顺势砍断
      else if (slash && (zone === 'spine' || zone === 'hips') && spd > 9) sever(fo, 'spine', info); // 致命的快刀砍在腰：腰斩
      return true;
    }
    if (zone === 'neck' && slash && !fo.boss) ctx.toast && fo.hp > fo.maxHp * 0.5 && Math.random() < 0.5 && ctx.toast('脖子砍中了——再削弱她一些就能一刀斩首', '#ffc0a0', 1.6);
    // 受击硬直（霸主不容易被打断）
    if (fo.boss) { fo.poise = (fo.poise || 0) + dealt; // 第十九轮：BOSS 韧性槽取代 25% 随机打断
      if (!fo.rage && fo.hp <= fo.maxHp * 0.5) { fo.rage = true; fo.poise = 0; fo.atk = null; fo.stag = 0.9; fo.f.play('Hit_Knockback', { once: true, fade: 0.05, restart: true }); ctx.shake && ctx.shake(0.5); ctx.toast && ctx.toast('👑 霸主被激怒了——出手更快更狠！', '#ff9a60', 2.4); sfx().roar && sfx().roar(1); if (fo.sayT <= 0) talk(fo, pickR(Math.random, ['……有意思。', '你惹怒我了。', '玩够了。']), '#ffb0a0'); } }
    const poiseBrk = fo.boss && (fo.poise >= (fo.rage ? 34 : 28) || info.charged);
    if (poiseBrk) fo.poise = 0;
    if ((!fo.boss || poiseBrk) && !(fo.role && window.FoeRoles && FoeRoles.hurt(fo, dealt, info, zone))) { fo.atk = null; fo.stag = fo.boss ? 0.35 : 0.55; fo.f.play(zone === 'head' || zone === 'neck' ? 'Hit_Head' : sp > 1.3 ? 'Hit_Knockback' : 'Hit_Chest', { once: true, fade: 0.06, restart: true }); }
    if (fo.sayT <= 0 && Math.random() < 0.5) talk(fo, fo.boss ? '' : pickR(Math.random, SAY.hit), '#ffb0a0');
    if (!(window.CombatFX && CombatFX.on)) { sfx().chop && sfx().chop(); sfx().squish && sfx().squish(0.5); } // 有 combat_fx 时由 CombatFX 合成更丰富的受击音
    return true;
  }
  function die(fo, info, quiet) {
    fo.dead = true; fo.atk = null; fo.anchor.gone = true;
    ragStart(fo, info); // 先按当前动作姿势建粒子，再停动画（停动画会把骨骼还原成 T 姿势）
    fo.f.mixer.stopAllAction(); ragPose(fo);
    CTX.onDeath && CTX.onDeath(fo); CTX.event && CTX.event('kill', fo);
    if (!quiet) CTX.toast('☠️ 她倒下了——砍下她的头才能带走首级', '#ffb0a0', 2.6);
  }
  function decapitate(fo, info) {
    if (fo.decap) return; fo.decap = true; const ctx = CTX, f = fo.f, hb = f.hb, lk = fo.h.look;
    f.holder.updateMatrixWorld(true);
    // 直接把脖子上这颗活人的头摘下来，换成“首级”的样子：只改 uniform/可见性，不新建任何几何、材质、着色器
    const g = new THREE.Group(); f.holder.matrixWorld.decompose(g.position, g.quaternion, g.scale); g.scale.set(1, 1, 1); ctx.sc.add(g); g.attach(f.holder);
    if (hb.U) { if (hb.U.pale) hb.U.pale.value = lk.pale || 0.2; if (hb.U.blood) hb.U.blood.value = lk.blood || 0; if (hb.U.spat) hb.U.spat.value = lk.spat || 0; }
    (hb.hl || []).forEach(m => m.visible = false); // 死眼：去掉高光
    try { hb.setExpression(lk.ex || { blink: 0.6 }); } catch (e) {}
    hb.group.traverse(o => { if (o.isMesh && o.userData.kind === 'cut') o.visible = true; });
    f.cut.forEach(o => o.visible = true);
    fo.blinkT = 1e9;
    const v = (info.vel || info.dir || new V3(0, 0, 1)).clone(); v.y = 0; if (v.lengthSq() < 1e-4) v.set(0, 0, 1); v.normalize().multiplyScalar(1.8 + Math.random()); v.y = 2.6;
    HEADS.push({ g, hb, fo, h: fo.h, vel: v, av: new V3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 12), rest: 0 });
    fo.spurt = 1.8; // 断颈喷血
    blood(g.position, 18, v, 1.4); sfx().chop && sfx().chop(); sfx().squish && sfx().squish(1.3); ctx.shake && ctx.shake(0.45);
    if (CTX && CTX.shake) CTX.shake(0.45); // 第十八轮：斩首不再慢放
    ctx.toast('🩸 斩首！走过去按 E 拾取首级', '#ff9080', 3);
    ctx.event && ctx.event('decap', fo);
    if (fo.rag) { fo.rag.act.head = false; fo.rag.act.top = false; ragKick(fo, info, 0.4); }
  }
  // 断肢：把这段骨头子树上的三角形按当前姿势“拍”成一块静态网格飞出去，身体上这段骨头缩成 0
  function subtreeBones(root) { const s = new Set(); root.traverse(o => { if (o.isBone || o.type === 'Bone' || o.isObject3D) s.add(o); }); return s; }
  function sevData(o, zone, sub) {
    const geo = o.geometry, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, pa = geo.attributes.position;
    const ck = zone + '|' + o.skeleton.bones.length; geo.userData.sev = geo.userData.sev || {}; let C = geo.userData.sev[ck];
      if (!C) {
        const bones = o.skeleton.bones, inSub = bones.map(b => sub.has(b));
      const wv = new Float32Array(pa.count), SA = si.array, WA = sw.array, ss = si.itemSize, ws = sw.itemSize; for (let i = 0; i < pa.count; i++) { let w = 0, tot = 0; for (let k = 0; k < 4; k++) { const wk = WA[i * ws + k]; tot += wk; if (inSub[SA[i * ss + k]]) w += wk; } wv[i] = tot > 0 ? w / tot : 0; } // 权重可能是归一化整数：按总和归一
        const idx = geo.index ? geo.index.array : null, tri = []; const n = idx ? idx.length : pa.count;
        for (let t = 0; t < n; t += 3) { const a = idx ? idx[t] : t, b = idx ? idx[t + 1] : t + 1, c = idx ? idx[t + 2] : t + 2; if (wv[a] + wv[b] + wv[c] >= 1.5) tri.push(a, b, c); }
        const remap = new Int32Array(pa.count).fill(-1), used = []; const ti = new Uint32Array(tri.length);
        for (let q = 0; q < tri.length; q++) { const x = tri[q]; if (remap[x] < 0) { remap[x] = used.length; used.push(x); } ti[q] = remap[x]; }
        C = geo.userData.sev[ck] = { used: Uint32Array.from(used), ti };
      }
    return C;
  }
  function sevWarm(fo) { // 空闲时预先算好各部位的断肢三角形
    const Z = ['leftUpperArm', 'rightUpperArm', 'leftLowerArm', 'rightLowerArm', 'leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg', 'spine'], f = fo.f;
    let zi = 0; const step = () => { if (!CTX || fo.dead && fo.gone) return; const z = Z[zi++]; if (!z) return; const b = f.bones[z]; if (b) { const sub = subtreeBones(b); f.root.traverse(o => { if (o.isSkinnedMesh && o.geometry.attributes.skinIndex) sevData(o, z, sub); }); }
      (window.requestIdleCallback || setTimeout)(step, { timeout: 400 }); };
    (window.requestIdleCallback || setTimeout)(step, { timeout: 1500 });
  }
  function sever(fo, zone, info) {
    const f = fo.f, bone = f.bones[zone]; if (!bone || (fo.gone && fo.gone.has(zone))) return;
    if (zone === 'spine') fo.halved = true;
    f.root.updateMatrixWorld(true);
    const sub = subtreeBones(bone), piece = new THREE.Group(), v = new V3(), center = new V3(); let nv = 0;
    f.root.traverse(o => {
      if (!o.isSkinnedMesh || !o.visible) return; const geo = o.geometry, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, pa = geo.attributes.position; if (!si) return;
      // 缓存：同一几何体 + 同一部位的三角形筛选结果永远相同（几何体在克隆间共享）
      const C = sevData(o, zone, sub);
      if (!C.ti.length) return;
      const used = C.used, P = new Float32Array(used.length * 3), UV = geo.attributes.uv ? new Float32Array(used.length * 2) : null, uva = geo.attributes.uv;
      for (let q = 0; q < used.length; q++) { const x = used[q]; v.fromBufferAttribute(pa, x); o.boneTransform(x, v); v.applyMatrix4(o.matrixWorld); P[q * 3] = v.x; P[q * 3 + 1] = v.y; P[q * 3 + 2] = v.z; center.add(v); nv++; if (UV) { UV[q * 2] = uva.getX(x); UV[q * 2 + 1] = uva.getY(x); } }
      const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.BufferAttribute(P, 3)); if (UV) g2.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
      g2.setIndex(new THREE.BufferAttribute(C.ti, 1)); g2.computeVertexNormals();
      const mat = (Array.isArray(o.material) ? o.material[0] : o.material).clone(); mat.skinning = false;
      const mesh = new THREE.Mesh(g2, mat); mesh.castShadow = true; piece.add(mesh);
    });
    if (!nv) return;
    center.multiplyScalar(1 / nv); piece.children.forEach(m => m.geometry.translate(-center.x, -center.y, -center.z)); piece.position.copy(center);
    // 头还在身上而被腰斩：头跟着上半身走
    if (zone === 'spine' && !fo.decap && f.holder.parent) { piece.attach(f.holder); fo.headOnPiece = piece; }
    if (fo.wpn && sub.has(fo.wpn)) piece.attach(fo.wpn);
    CTX.sc.add(piece);
    bone.scale.setScalar(1e-4); // 身体上这段消失（顶点收拢到关节）
    fo.gone = fo.gone || new Set(); Object.entries(f.bones).forEach(([k, b]) => { if (sub.has(b)) fo.gone.add(k); });
    if (fo.rag) { for (const k of Object.keys(fo.rag.idx)) { const b = f.bones[k]; if (b && sub.has(b)) fo.rag.act[k] = false; } }
    const vel = (info.vel || info.dir || new V3()).clone().multiplyScalar(0.25); vel.y += 2;
    PIECES.push({ g: piece, vel, av: new V3((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9), rad: zone === 'spine' ? 0.18 : 0.06, rest: 0, fo, headPiece: zone === 'spine' && !fo.decap });
    blood(center, 12, info.vel); sfx().chop && sfx().chop(); sfx().squish && sfx().squish(1); CTX.event && CTX.event(zone === 'spine' ? 'halve' : 'sever', fo);
  }
  // 头/残肢的简单刚体：重力、落地弹跳、摩擦、滚动
  function bodyPhys(b, dt, rad) {
    if (b.rest > 1.5) return; const ctx = CTX, g = b.g;
    b.vel.y -= 9.8 * dt; g.position.addScaledVector(b.vel, dt);
    const gy = ctx.H(g.position.x, g.position.z) + rad;
    if (g.position.y < gy) { g.position.y = gy; if (b.vel.y < -1) { b.vel.y *= -0.3; sfx().thud && sfx().thud(Math.min(1, -b.vel.y * 0.3)); } else b.vel.y = 0; b.vel.x *= 0.86; b.vel.z *= 0.86; b.av.multiplyScalar(0.84);
      // 在地上：按滚动速度转
      b.av.x += b.vel.z / rad * 0.08; b.av.z -= b.vel.x / rad * 0.08; }
    collide(g.position, rad);
    const w = b.av.length(); if (w > 1e-3) g.quaternion.premultiply(new Q().setFromAxisAngle(tv.copy(b.av).divideScalar(w), w * dt));
    if (b.vel.lengthSq() < 0.01 && w < 0.2 && g.position.y <= gy + 0.001) b.rest += dt; else b.rest = 0;
  }
  const POOL = [], DECALS = []; let decalI = 0;
  function bloodMat() {
    if (!blood.mat) { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 2, 16, 16, 15); gr.addColorStop(0, 'rgba(130,8,8,1)'); gr.addColorStop(0.6, 'rgba(95,4,4,0.92)'); gr.addColorStop(1, 'rgba(60,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
      blood.tex = new THREE.CanvasTexture(c); blood.mat = new THREE.SpriteMaterial({ map: blood.tex, transparent: true, depthWrite: false });
      const c2 = document.createElement('canvas'); c2.width = c2.height = 64; const g2 = c2.getContext('2d'); // 不规则暗红血迹
      for (let k = 0; k < 9; k++) { const x = 32 + (Math.random() - 0.5) * 30 * (k ? 1 : 0), y = 32 + (Math.random() - 0.5) * 30 * (k ? 1 : 0), rr = k ? 3 + Math.random() * 7 : 15; const gg = g2.createRadialGradient(x, y, 0, x, y, rr); gg.addColorStop(0, 'rgba(62,2,4,0.95)'); gg.addColorStop(0.75, 'rgba(48,0,2,0.85)'); gg.addColorStop(1, 'rgba(40,0,0,0)'); g2.fillStyle = gg; g2.beginPath(); g2.arc(x, y, rr, 0, 7); g2.fill(); }
      blood.dmat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c2), transparent: true, depthWrite: false, opacity: 0.7, polygonOffset: true, polygonOffsetFactor: -2 }); blood.dgeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2); }
    return blood.mat;
  }
  function blood(p, n, dir, big = 1) {
    if (!CTX) return; const mat = bloodMat();
    for (let i = 0; i < n; i++) {
      let x = POOL.pop(); if (!x) { x = { o: new THREE.Sprite(mat), v: new V3(), t: 0 }; x.o.renderOrder = 3; }
      x.o.scale.setScalar((0.014 + Math.random() * 0.022) * big); x.o.position.copy(p); x.o.material = mat;
      x.v.set((Math.random() - 0.5) * 2.4, 0.8 + Math.random() * 2.2, (Math.random() - 0.5) * 2.4); if (dir) x.v.addScaledVector(tv.copy(dir).normalize(), 1.3 * big);
      x.t = 1 + Math.random() * 1.2; x.decal = Math.random() < 0.18; CTX.sc.add(x.o); FX.push(x);
    }
  }
  function spark(p, n, col) { // 刀刃相击的火花（与血共用粒子池）
    if (!CTX) return; if (!spark.mat) { const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'), gr = g.createRadialGradient(8, 8, 0, 8, 8, 8); gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(0.4, 'rgba(255,200,90,0.9)'); gr.addColorStop(1, 'rgba(255,120,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, 16, 16);
      spark.mat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }); spark.blue = spark.mat.clone(); spark.blue.color.set('#9fd0ff'); }
    const mat = col === 'blue' ? spark.blue : spark.mat;
    for (let i = 0; i < n; i++) { let x = POOL.pop(); if (!x) { x = { o: new THREE.Sprite(mat), v: new V3(), t: 0 }; x.o.renderOrder = 3; }
      x.o.material = mat; x.o.scale.setScalar(0.02 + Math.random() * 0.03); x.o.position.copy(p); x.v.set((Math.random() - 0.5) * 7, Math.random() * 5, (Math.random() - 0.5) * 7); x.t = 0.25 + Math.random() * 0.35; x.decal = false; CTX.sc.add(x.o); FX.push(x); }
  }
  function decal(p, sz) { // 地面血迹：最多 80 块，循环复用
    bloodMat(); let d = DECALS[decalI]; if (!d) { d = new THREE.Mesh(blood.dgeo, blood.dmat); d.renderOrder = 1; DECALS[decalI] = d; }
    decalI = (decalI + 1) % 80; d.position.set(p.x, CTX.H(p.x, p.z) + 0.012, p.z); d.scale.setScalar(sz); d.rotation.y = Math.random() * 6.28; if (d.parent !== CTX.sc) CTX.sc.add(d);
  }
  // 拾取首级：只有砍下来的头能捡
  function nearHead(pos, yaw, maxD = 2.3) {
    let best = null, bd = maxD;
    for (const h of HEADS) { const d = Math.hypot(h.g.position.x - pos.x, h.g.position.z - pos.z); if (d < bd) { bd = d; best = h; } }
    return best;
  }
  function pickup(h) { const i = HEADS.indexOf(h); if (i < 0) return null; HEADS.splice(i, 1); h.g.parent && h.g.parent.remove(h.g); return h; }
  // ================= 布娃娃（Verlet 粒子 → 驱动真骨骼）=================
  const RAGB = ['hips', 'chest', 'neck', 'head', 'leftUpperArm', 'leftLowerArm', 'leftHand', 'rightUpperArm', 'rightLowerArm', 'rightHand', 'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot'];
  function ragRest(T) { // 模板静止姿势下的数据（每个身体模板算一次）
    if (T.rag) return T.rag; const root = T.root; root.updateMatrixWorld(true);
    const hb = {}; root.traverse(o => { if (o.name && o.name.startsWith('H_')) hb[o.name.slice(2)] = o; });
    const chest = hb.upperChest || hb.chest;
    const need = new Set(); Object.values(hb).forEach(o => { let p = o; while (p && p !== root) { need.add(p); p = p.parent; } });
    const order = []; root.traverse(o => { if (need.has(o)) order.push(o.name); });
    const restL = {}, restW = {}, restP = {};
    root.traverse(o => { if (need.has(o)) { restL[o.name] = o.quaternion.clone(); restW[o.name] = o.getWorldQuaternion(new Q()); restP[o.name] = o.getWorldPosition(new V3()); } });
    const P = {}; RAGB.forEach(k => { const o = k === 'chest' ? chest : hb[k]; if (o) P[k] = o.getWorldPosition(new V3()); });
    // 末端点：手指尖、脚尖、头顶
    const tip = (a, b, l) => P[a] && P[b] ? P[a].clone().add(P[a].clone().sub(P[b]).normalize().multiplyScalar(l)) : null;
    P.lTip = tip('leftHand', 'leftLowerArm', 0.09); P.rTip = tip('rightHand', 'rightLowerArm', 0.09);
    P.lToe = hb.leftToes ? hb.leftToes.getWorldPosition(new V3()) : P.leftFoot.clone().add(new V3(0, -0.05, 0.12)); P.rToe = hb.rightToes ? hb.rightToes.getWorldPosition(new V3()) : P.rightFoot.clone().add(new V3(0, -0.05, 0.12));
    P.top = P.head.clone().add(new V3(0, 0.2, 0.02));
    return T.rag = { order, restL, restW, restP, P, chestName: chest.name };
  }
  function ragStart(fo, info) {
    const f = fo.f, T = TMPL[f.bodyName], R = ragRest(T);
    f.root.updateMatrixWorld(true);
    const inv = new M4().copy(f.root.matrixWorld).invert(), keys = Object.keys(R.P);
    const pts = [], idx = {};
    const cur = k => { const o = k === 'chest' ? (f.bones.upperChest || f.bones.chest) : f.bones[k]; return o ? o.getWorldPosition(new V3()) : null; };
    const derived = { lTip: ['leftHand', 'leftLowerArm', 0.09], rTip: ['rightHand', 'rightLowerArm', 0.09] };
    for (const k of keys) {
      let p = cur(k);
      if (!p && derived[k]) { const [a, b, l] = derived[k]; const pa = cur(a), pb = cur(b); p = pa.clone().add(pa.clone().sub(pb).normalize().multiplyScalar(l)); }
      if (!p && k === 'lToe') p = f.bones.leftToes ? f.bones.leftToes.getWorldPosition(new V3()) : cur('leftFoot').add(new V3(0, -0.05, 0.1));
      if (!p && k === 'rToe') p = f.bones.rightToes ? f.bones.rightToes.getWorldPosition(new V3()) : cur('rightFoot').add(new V3(0, -0.05, 0.1));
      if (!p && k === 'top') p = cur('head').add(new V3(0, 0.2, 0));
      idx[k] = pts.length; pts.push({ p, o: p.clone(), m: /hips|chest/.test(k) ? 2 : 1 });
    }
    const sticks = [], S = (a, b, soft) => { if (idx[a] == null || idx[b] == null) return; sticks.push([idx[a], idx[b], R.P[a].distanceTo(R.P[b]), soft || 0]); };
    const torso = ['hips', 'chest', 'neck', 'leftUpperArm', 'rightUpperArm', 'leftUpperLeg', 'rightUpperLeg'];
    for (let i = 0; i < torso.length; i++) for (let j = i + 1; j < torso.length; j++) S(torso[i], torso[j]);
    S('neck', 'head'); S('head', 'top'); S('chest', 'head', 1); S('neck', 'top');
    S('leftUpperArm', 'leftLowerArm'); S('leftLowerArm', 'leftHand'); S('leftHand', 'lTip'); S('rightUpperArm', 'rightLowerArm'); S('rightLowerArm', 'rightHand'); S('rightHand', 'rTip');
    S('leftUpperLeg', 'leftLowerLeg'); S('leftLowerLeg', 'leftFoot'); S('leftFoot', 'lToe'); S('rightUpperLeg', 'rightLowerLeg'); S('rightLowerLeg', 'rightFoot'); S('rightFoot', 'rToe');
    // 关节不能对折：最小距离约束（soft=2）
    const MIN = (a, b, k) => { if (idx[a] == null || idx[b] == null) return; sticks.push([idx[a], idx[b], R.P[a].distanceTo(R.P[b]) * k, 2]); };
    MIN('leftUpperLeg', 'leftFoot', 0.55); MIN('rightUpperLeg', 'rightFoot', 0.55); MIN('leftUpperArm', 'leftHand', 0.4); MIN('rightUpperArm', 'rightHand', 0.4); MIN('hips', 'head', 0.8);
    const act = {}; keys.forEach(k => act[k] = true); act.head = act.top = !fo.decap;
    fo.rag = { pts, idx, sticks, act, R, inv, t: 0, sleep: 0 };
    ragKick(fo, info, 1);
  }
  function ragKick(fo, info, k) {
    const rg = fo.rag; if (!rg) return; const v = (info && (info.vel || info.dir)) ? (info.vel || info.dir).clone() : new V3(0, 0, -1);
    if (v.lengthSq() < 1e-4) v.set(Math.sin(fo.yaw), 0, Math.cos(fo.yaw)).multiplyScalar(-1);
    v.y = Math.max(v.y, 0); v.normalize().multiplyScalar(0.035 * k * Math.min(2, (info && info.speed || 6) / 6));
    const pt = info && info.point; rg.sleep = 0;
    for (const q of rg.pts) { const w = pt ? Math.max(0.2, 1 - q.p.distanceTo(pt) * 1.5) : 0.6; q.o.addScaledVector(v, -w); }
  }
  function ragStep(fo, dt) {
    const rg = fo.rag, ctx = CTX; if (rg.sleep > 2) return; dt = Math.min(dt, 1 / 30);
    const g = -9.8 * dt * dt; let moving = 0;
    for (const q of rg.pts) { const vx = (q.p.x - q.o.x) * 0.985, vy = (q.p.y - q.o.y) * 0.985, vz = (q.p.z - q.o.z) * 0.985; q.o.copy(q.p); q.p.x += vx; q.p.y += vy + g; q.p.z += vz; moving += Math.abs(vx) + Math.abs(vy) + Math.abs(vz); }
    const actIdx = rg.pts.map(() => true); for (const [k, i] of Object.entries(rg.idx)) actIdx[i] = rg.act[k] !== false;
    // 第十八轮：地面高度每点每帧只查一次（原来 24 点 × 10 次迭代 = 240 次/具/帧）
    const gys = rg.gys || (rg.gys = new Float32Array(rg.pts.length)); for (let i = 0; i < rg.pts.length; i++) gys[i] = ctx.H(rg.pts[i].p.x, rg.pts[i].p.z) + 0.045;
    for (let it = 0; it < 7; it++) {
      for (const [a, b, L, soft] of rg.sticks) {
        if (!actIdx[a] || !actIdx[b]) continue; const pa = rg.pts[a], pb = rg.pts[b]; tv.subVectors(pb.p, pa.p); const d = tv.length() || 1e-6;
        if (soft === 2 && d >= L) continue; const diff = (d - L) / d * (soft === 1 ? 0.2 : 1), wa = pb.m / (pa.m + pb.m), wb = pa.m / (pa.m + pb.m);
        pa.p.addScaledVector(tv, diff * wa); pb.p.addScaledVector(tv, -diff * wb);
      }
      for (let i = 0; i < rg.pts.length; i++) { const q = rg.pts[i], gy = gys[i]; if (q.p.y < gy) { q.p.y = gy; q.o.x += (q.p.x - q.o.x) * 0.45; q.o.z += (q.p.z - q.o.z) * 0.45; } }
    }
    // 第十八轮：只和尸体附近 4m 的碰撞体比较（每秒刷新一次列表）
    rg.colT = (rg.colT || 0) - dt; if (!rg.cols || rg.colT <= 0) { rg.colT = 1; const c0 = rg.pts[0].p; rg.cols = ctx.cols.filter(c => Math.hypot(c.x - c0.x, c.z - c0.z) < c.r + 4); }
    for (const q of rg.pts) collideList(q.p, 0.05, rg.cols);
    if (moving < 0.002) rg.sleep += dt; else rg.sleep = 0;
    ragPose(fo);
  }
  const _q = new Q(), _q2 = new Q(), _m = new M4(), _a = new V3(), _b = new V3(), _c = new V3();
  function basis(upv, side) { const y = upv.clone().normalize(), z = new V3().crossVectors(side, y).normalize(), x = new V3().crossVectors(y, z); return new Q().setFromRotationMatrix(new M4().makeBasis(x, y, z)); }
  function ragPose(fo) {
    const rg = fo.rag, f = fo.f, R = rg.R, root = f.root; root.updateMatrixWorld(true);
    const inv = new M4().copy(root.matrixWorld).invert();
    const L = {}; for (const [k, i] of Object.entries(rg.idx)) L[k] = rg.pts[i].p.clone().applyMatrix4(inv); // 身体根空间
    const RP = R.P;
    // 躯干：两根向量定朝向
    const dHips = basis(L.chest.clone().sub(L.hips), L.leftUpperLeg.clone().sub(L.rightUpperLeg)).multiply(basis(RP.chest.clone().sub(RP.hips), RP.leftUpperLeg.clone().sub(RP.rightUpperLeg)).invert());
    const dChest = basis(L.neck.clone().sub(L.chest), L.leftUpperArm.clone().sub(L.rightUpperArm)).multiply(basis(RP.neck.clone().sub(RP.chest), RP.leftUpperArm.clone().sub(RP.rightUpperArm)).invert());
    const D = {}; // 每根人形骨骼的世界旋转增量（根空间）
    D.hips = dHips; D.spine = dHips.clone().slerp(dChest, 0.5); D.chest = dChest.clone(); D.upperChest = dChest.clone();
    const swing = (parentD, a, b) => { if (!L[a] || !L[b] || rg.act[b] === false) return parentD.clone(); const rest = RP[b].clone().sub(RP[a]).normalize().applyQuaternion(parentD), cur = L[b].clone().sub(L[a]).normalize(); return new Q().setFromUnitVectors(rest, cur).multiply(parentD); };
    D.neck = swing(dChest, 'neck', 'head'); D.head = rg.act.head ? swing(D.neck, 'head', 'top') : D.neck.clone();
    for (const s of ['left', 'right']) { const t = s === 'left' ? 'lTip' : 'rTip', toe = s === 'left' ? 'lToe' : 'rToe';
      D[s + 'Shoulder'] = dChest.clone(); D[s + 'UpperArm'] = swing(dChest, s + 'UpperArm', s + 'LowerArm'); D[s + 'LowerArm'] = swing(D[s + 'UpperArm'], s + 'LowerArm', s + 'Hand'); D[s + 'Hand'] = swing(D[s + 'LowerArm'], s + 'Hand', t);
      D[s + 'UpperLeg'] = swing(dHips, s + 'UpperLeg', s + 'LowerLeg'); D[s + 'LowerLeg'] = swing(D[s + 'UpperLeg'], s + 'LowerLeg', s + 'Foot'); D[s + 'Foot'] = swing(D[s + 'LowerLeg'], s + 'Foot', toe); D[s + 'Toes'] = D[s + 'Foot'].clone(); }
    // 按层级写回局部旋转
    const Wq = {}; if (!rg.byName) { rg.byName = {}; root.traverse(o => { rg.byName[o.name] = o; }); rg.hbName = {}; Object.entries(f.bones).forEach(([k, o]) => rg.hbName[o.name] = k); } const byName = rg.byName, hbName = rg.hbName;
    for (const nm of R.order) {
      const o = byName[nm]; if (!o) continue; const pW = o.parent === root ? new Q() : (Wq[o.parent.name] || R.restW[o.parent.name] || new Q());
      const hk = hbName[nm]; let w;
      if (hk && D[hk]) w = D[hk].clone().multiply(R.restW[nm]); else w = pW.clone().multiply(R.restL[nm]);
      Wq[nm] = w; o.quaternion.copy(pW.clone().invert().multiply(w));
    }
    // 胯部位置：胯粒子相对静止胯点的偏移
    const hips = f.bones.hips; const want = L.hips.clone(); const par = hips.parent; par.updateMatrixWorld(true);
    const pinv = new M4().copy(par.matrixWorld).invert().multiply(root.matrixWorld); hips.position.copy(want.applyMatrix4(pinv));
  }
  function has(name) { return !!(window.BODY_LIST && BODY_LIST.includes(name)); }
  return { hasHead: (h) => HEADS.includes(h), warm: warmRender, template, build, animate, clipsFor, loadAnim, headFit, cloneSkinned, script, has, populate, update, targets, hit, clear, nearHead, pickup, parried, slowmo, threats, brokenNear, execute, aoe, roar, attack, ATK, tokenOK, ctx: () => CTX, spark, IDENT, get foes() { return FOES; }, get heads() { return HEADS; }, get pieces() { return PIECES; }, _sever: sever, _decap: decapitate };
})();
