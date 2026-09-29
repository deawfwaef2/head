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
    E.glb = null; // 解析完就丢掉 base64，省内存（被淘汰后会重新加载脚本）
    const T = TMPL[name] = { name, E, gltf, root }; T.skin = root.userData.skin || null; return T;
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
    if (SKIN_FIX[bodyName]) { const f = SKIN_FIX[bodyName], L = f[0] * 0.3 + f[1] * 0.59 + f[2] * 0.11; look.skinMul = f.map(x => +(L + (x - L) * 0.25).toFixed(3)); } // 主要校亮度，色相只跟 25%（避免脸发绿/发黄） // 渲染标定（_tools/calib.py）：脸颊与脖子渲染出来同色
    const hb = ModelHeads.create(alive ? Object.assign({}, look, { ex: {}, pale: 0, blood: 0, spat: 0 }) : look, { alive });
    hb.group.traverse(o => { if (o.isMesh && o.userData.kind === 'cut') o.visible = false; }); // 活人：头自己的断口盖藏起来
    const sk = hb.U && hb.U.skin && hb.U.skin.value;
    if (TINT[bodyName]) { // 可染色身体：身体皮肤 × (头肤色 / 身体贴图肤色)，两边精确一致
      const hc = new THREE.Color(look.skinHex).convertSRGBToLinear(), bc = T.skin ? new THREE.Color('#' + T.skin).convertSRGBToLinear() : null;
      const k = bc ? [hc.r / bc.r, hc.g / bc.g, hc.b / bc.b] : (sk ? [sk.x, sk.y, sk.z] : [1, 1, 1]);
      root.traverse(o => { if (o.isMesh && o.material && o.material.userData && o.material.userData.skin) o.material.color.setRGB(Math.min(1.6, k[0]), Math.min(1.6, k[1]), Math.min(1.6, k[2])); });
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
      if (cur === a && !o.restart) return a;
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
      fo.maxHp = fo.hp = it.boss ? 100 : 26 + rar * 16;
      const wn = it.boss ? (it.bossK === 'swamp' || it.bossK === 'village' ? null : 'antique_katana_01') : ARMED[id];
      if (wn) fo.wpn = attachWeapon(f, wn);
      fo.armed = !!fo.wpn || !!it.boss;
      f.root.position.copy(it.pos); f.root.position.y = ctx.H(it.pos.x, it.pos.z); f.root.rotation.y = fo.yaw;
      ctx.sc.add(f.root); f.play(fo.idleClip, { fade: 0 }); f.mixer.setTime(r() * 3);
      FOES.push(fo); out.push(fo);
    }
    evict(used, 5);
    return out;
  }
  function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function clear() {
    for (const fo of FOES) { fo.anchor.gone = true; if (fo.f.root.parent) fo.f.root.parent.remove(fo.f.root); try { fo.f.hb.dispose(); } catch (e) {} }
    for (const h of HEADS) { if (h.g.parent) h.g.parent.remove(h.g); }
    for (const p of PIECES) { if (p.g.parent) p.g.parent.remove(p.g); }
    for (const x of FX) { if (x.o.parent) x.o.parent.remove(x.o); }
    FOES.length = HEADS.length = PIECES.length = FX.length = 0;
  }
  // ---- 每帧 ----
  const tv = new V3(), tv2 = new V3(), up = new V3(0, 1, 0);
  function update(dt, now) {
    if (!CTX) return; const ctx = CTX, P = ctx.player;
    for (const fo of FOES) {
      const f = fo.f;
      if (fo.dead) { if (fo.rag) ragStep(fo, dt); continue; }
      fo.t += dt; fo.cd -= dt; fo.sayT -= dt; if (fo.stag > 0) fo.stag -= dt; if (fo.block > 0) fo.block -= dt;
      const dx = P.pos.x - fo.pos.x, dz = P.pos.z - fo.pos.z, d = Math.hypot(dx, dz) || 1e-3;
      const face = Math.atan2(dx, dz);
      const see = ctx.sees(fo.pos, (fo.boss ? 16 : 9 + fo.rar * 2) * (P.crouch > 0.5 ? 0.55 : 1)) && (fo.seen || Math.abs(ang(face - fo.yaw)) < 1.4 || d < 3);
      if (see && !fo.seen) { fo.seen = true; fo.cd = Math.max(fo.cd, 0.5 + (1 - fo.iq) * 0.8); if (fo.boss) ctx.bossMeet(fo); else talk(fo, pickR(Math.random, SAY.see)); if (!fo.boss) fo.state = fo.brave ? 'chase' : 'flee'; else fo.state = 'chase'; }
      if (fo.seen && d > 26) { fo.seen = false; fo.state = 'idle'; }
      let spd = 0, turnTo = null;
      if (fo.atk) { // 攻击动作进行中：到命中帧判定
        const a = fo.atk; a.t += dt; turnTo = a.t < a.hitAt * 0.6 ? face : null;
        if (!a.hit && a.t >= a.hitAt) { a.hit = true; if (d < a.reach && Math.abs(ang(face - fo.yaw)) < 0.9) ctx.hitPlayer(fo, a.dmg); else if (fo.sayT <= 0 && Math.random() < 0.3) { talk(fo, '……躲开了？'); } }
        if (a.t >= a.dur) { fo.atk = null; fo.cd = (fo.boss ? 0.6 : 1.1) + Math.random() * (1.6 - fo.iq); f.play(fo.armed ? 'Sword_Idle' : 'Idle_Loop', { fade: 0.2 }); }
      } else if (fo.stag > 0) { /* 受击硬直 */ }
      else if (fo.block > 0) { turnTo = face; }
      else if (fo.state === 'chase') {
        turnTo = face;
        const reach = fo.armed ? 1.35 : 1.05;
        if (d > reach) { spd = d > 6 ? 4.4 : 2.9; f.play(d > 6 ? 'Sprint_Loop' : 'Jog_Fwd_Loop', { fade: 0.2 }); }
        else if (fo.cd <= 0) attack(fo, d);
        else f.play(fo.armed ? 'Sword_Idle' : 'Idle_Loop', { fade: 0.25 });
        // 玩家挥刀靠近时聪明的敌人会格挡
        if (fo.armed && d < 2.6 && ctx.playerSwinging() && fo.block <= 0 && Math.random() < fo.iq * 0.02) { fo.block = 0.9; f.play('Sword_Block', { once: true, fade: 0.1 }); }
      } else if (fo.state === 'flee') {
        turnTo = Math.atan2(-dx, -dz); spd = 4.0 + fo.rar * 0.3; f.play('Sprint_Loop', { fade: 0.2 });
        const pr = Math.hypot(fo.pos.x, fo.pos.z);
        if (pr > ctx.R - 3) { const tx = -fo.pos.z / pr, tz = fo.pos.x / pr, sg = (tx * -dx + tz * -dz) > 0 ? 1 : -1; turnTo = Math.atan2(tx * sg * 0.9 - fo.pos.x / pr * 0.3, tz * sg * 0.9 - fo.pos.z / pr * 0.3); if (d < 2.2 && fo.cd <= 0) { fo.state = 'chase'; talk(fo, pickR(Math.random, SAY.fight)); } }
        else if (fo.sayT <= 0 && Math.random() < 0.006) talk(fo, pickR(Math.random, SAY.flee));
      } else { f.play(fo.idleClip, { fade: 0.3 }); }
      if (turnTo != null) fo.yaw += clampA(ang(turnTo - fo.yaw), 6 * dt * (0.6 + fo.iq));
      if (spd > 0) { fo.pos.x += Math.sin(fo.yaw) * spd * dt; fo.pos.z += Math.cos(fo.yaw) * spd * dt; }
      collide(fo.pos, 0.35); fo.pos.y = ctx.H(fo.pos.x, fo.pos.z); f.root.rotation.y = fo.yaw;
      f.mixer.update(dt);
      fo.f.bones.head.getWorldPosition(fo.anchor.pos); fo.anchor.pos.y -= 0.3;
      if (fo.flash > 0) fo.flash -= dt;
    }
    for (const h of HEADS) bodyPhys(h, dt, 0.11);
    for (const p of PIECES) bodyPhys(p, dt, p.rad);
    for (let i = FX.length - 1; i >= 0; i--) { const x = FX[i]; x.t -= dt; x.v.y -= 9.8 * dt; x.o.position.addScaledVector(x.v, dt); const gy = ctx.H(x.o.position.x, x.o.position.z) + 0.01; if (x.o.position.y < gy) { x.o.position.y = gy; x.v.set(0, 0, 0); } x.o.material.opacity = Math.min(1, x.t * 1.5); if (x.t <= 0) { x.o.parent && x.o.parent.remove(x.o); FX.splice(i, 1); } }
  }
  const ang = a => Math.atan2(Math.sin(a), Math.cos(a)), clampA = (a, m) => Math.max(-m, Math.min(m, a));
  function collide(p, r) { const ctx = CTX; for (const c of ctx.cols) { const ex = p.x - c.x, ez = p.z - c.z, e = Math.hypot(ex, ez), m = c.r + r; if (e < m && e > 1e-5) { p.x += ex / e * (m - e); p.z += ez / e * (m - e); } } const pr = Math.hypot(p.x, p.z), pl = ctx.R - 1; if (pr > pl) { p.x *= pl / pr; p.z *= pl / pr; } }
  function talk(fo, text, col) { if (!CTX || fo.dead) return; CTX.say(fo.anchor, text, col); fo.sayT = 3 + Math.random() * 2; }
  function attack(fo, d) {
    const f = fo.f, s = CTX.st();
    let clip, hitAt, reach = fo.armed ? 1.75 : 1.35;
    if (fo.armed) { const r = Math.random(); clip = fo.boss && r < 0.25 ? 'Sword_Heavy_Combo' : r < 0.45 ? 'Sword_Regular_A' : r < 0.75 ? 'Sword_Regular_B' : 'Sword_Regular_C'; }
    else clip = pickR(Math.random, ['Punch_Jab', 'Punch_Cross', 'Melee_Hook']);
    const c = f.clips[clip]; if (!c) return;
    hitAt = { Sword_Regular_A: 0.42, Sword_Regular_B: 0.42, Sword_Regular_C: 0.5, Sword_Heavy_Combo: 0.3, Punch_Jab: 0.4, Punch_Cross: 0.45, Melee_Hook: 0.45 }[clip] * c.duration;
    const sp = fo.boss ? 1.1 : 0.85 + fo.iq * 0.2;
    const base = fo.boss ? 0.1 : 0.03 + fo.rar * 0.014 + (fo.armed ? 0.02 : 0);
    fo.atk = { clip, t: 0, dur: c.duration / sp, hitAt: hitAt / sp, hit: false, reach, dmg: Math.max(1, Math.round(s.maxHp * base * (0.85 + Math.random() * 0.3))) };
    f.play(clip, { once: true, fade: 0.12, speed: sp, restart: true });
    if (fo.sayT <= 0 && Math.random() < 0.25) talk(fo, fo.boss ? '' : pickR(Math.random, SAY.fight), '#ffb0a0');
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
      segs.push([z, a, b, r + (z === 'neck' ? 0.06 : 0.035)]); }
    let best = null, bd = 1, neckB = null, nd = 1;
    for (let i = 0; i <= 6; i++) { const u = i / 6; _s0.copy(sg.b0).lerp(sg.t0, u); _s1.copy(sg.b1).lerp(sg.t1, u);
      for (let j = 0; j <= 4; j++) { _sp.copy(_s0).lerp(_s1, j / 4);
        for (const [z, a, b, r] of segs) { _sa.subVectors(b, a); const t = Math.max(0, Math.min(1, _sb.subVectors(_sp, a).dot(_sa) / Math.max(1e-6, _sa.lengthSq()))); const d = _sb.copy(a).addScaledVector(_sa, t).distanceTo(_sp) / r;
          if (d < bd || (z === 'neck' && d < nd)) { const hit = { zone: z, point: _sp.clone(), speed: info.kind === 'thrust' ? info.speed : Math.max(2, info.tipSpeed * (0.3 + 0.65 * u) / 0.95) }; if (d < bd) { bd = d; best = hit; } if (z === 'neck' && d < nd) { nd = d; neckB = hit; } } } } }
    return neckB || best; // 刃确实扫过脖子（在脖子半径内）就算脖子：斩首要好砍
  }
  function targets() {
    const out = [];
    HEADS.forEach((h, i) => out.push({ id: 'fh' + i + '_' + h.fo.id2, pos: h.g.position, r: 0.15, kind: 'head', onHit: (info) => { const v = (info.vel || new V3()).clone().multiplyScalar(0.45); v.y = Math.max(v.y, 1 + (info.speed || 4) * 0.1); h.vel.copy(v); h.av.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 14); h.rest = 0; sfx().thud && sfx().thud(0.6); return true; } }));
    for (const fo of FOES) {
      const c = fo.f.bones.hips; if (!c) continue; const pos = c.getWorldPosition(new V3()); pos.y += 0.12;
      out.push({ id: fo.id2, pos, r: 1.05, kind: fo.boss ? 'boss' : 'foe', onHit: (info) => hit(fo, info) });
      if (fo.headOnPiece && !fo.decap) out.push({ id: fo.id2 + '_hp', pos: fo.f.holder.getWorldPosition(new V3()), r: 0.3, kind: 'foe', onHit: (info) => { if (info.kind !== 'thrust' && info.speed > 3) { decapitate(fo, info); return true; } return false; } });
    }
    return out;
  }
  function hit(fo, info) {
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
    if (fo.block > 0 && Math.abs(ang(Math.atan2(ctx.player.pos.x - fo.pos.x, ctx.player.pos.z - fo.pos.z) - fo.yaw)) < 1.1) {
      if (fo.sayT <= 0) talk(fo, pickR(Math.random, SAY.block)); sfx().thud && sfx().thud(0.8); ctx.clang && ctx.clang(c.point); fo.block = Math.max(0, fo.block - 0.3); return true;
    }
    const q = ctx.power(fo), mult = zone === 'head' ? 1.6 : zone === 'neck' ? 1.8 : /Arm|Leg/.test(zone) ? 0.7 : 1;
    const dealt = Math.max(1, Math.round((fo.boss ? 11 : 12) * q * sp * mult * (slash ? 1 : 0.8) * (0.85 + Math.random() * 0.3)));
    fo.hp -= dealt; fo.flash = 0.15; ctx.floatDmg(fo.anchor.pos, dealt, sp > 1.2);
    if (!fo.seen) { fo.seen = true; fo.state = fo.brave ? 'chase' : 'flee'; if (fo.boss) ctx.bossMeet(fo); }
    if (!fo.brave && Math.random() < 0.35) { fo.brave = true; fo.state = 'chase'; }
    if (fo.boss) ctx.bossHp(fo);
    // 斩首：够快的横砍砍中脖子，且这一刀后她剩不到一半血（霸主要剩不到 25%）
    if (slash && zone === 'neck' && spd > 4.5 && fo.hp <= fo.maxHp * (fo.boss ? 0.25 : 0.5)) { fo.hp = 0; die(fo, info, true); decapitate(fo, info); return true; }
    if (fo.hp <= 0) {
      die(fo, info, false);
      if (slash && /Arm|Leg/.test(zone) && spd > 5) sever(fo, zone, info);                    // 致命一刀砍在四肢：顺势砍断
      else if (slash && (zone === 'spine' || zone === 'hips') && spd > 9) sever(fo, 'spine', info); // 致命的快刀砍在腰：腰斩
      return true;
    }
    if (zone === 'neck' && slash && !fo.boss) ctx.toast && fo.hp > fo.maxHp * 0.5 && Math.random() < 0.5 && ctx.toast('脖子砍中了——再削弱她一些就能一刀斩首', '#ffc0a0', 1.6);
    // 受击硬直（霸主不容易被打断）
    if (!fo.boss || Math.random() < 0.25 || sp > 1.3) { fo.atk = null; fo.stag = fo.boss ? 0.35 : 0.55; fo.f.play(zone === 'head' || zone === 'neck' ? 'Hit_Head' : sp > 1.3 ? 'Hit_Knockback' : 'Hit_Chest', { once: true, fade: 0.06, restart: true }); }
    if (fo.sayT <= 0 && Math.random() < 0.5) talk(fo, fo.boss ? '' : pickR(Math.random, SAY.hit), '#ffb0a0');
    sfx().chop && sfx().chop(); sfx().squish && sfx().squish(0.5);
    return true;
  }
  function die(fo, info, quiet) {
    fo.dead = true; fo.atk = null; fo.anchor.gone = true;
    ragStart(fo, info); // 先按当前动作姿势建粒子，再停动画（停动画会把骨骼还原成 T 姿势）
    fo.f.mixer.stopAllAction(); ragPose(fo);
    CTX.onDeath && CTX.onDeath(fo);
    if (!quiet) CTX.toast('☠️ 她倒下了——砍下她的头才能带走首级', '#ffb0a0', 2.6);
  }
  function decapitate(fo, info) {
    if (fo.decap) return; fo.decap = true; const ctx = CTX, f = fo.f;
    f.holder.updateMatrixWorld(true);
    const hb = ModelHeads.create(fo.h.look); // 首级 = 死去的样子（与带回洞里的一致）
    const g = new THREE.Group(); const m = new M4().copy(f.holder.matrixWorld); m.decompose(g.position, g.quaternion, g.scale);
    hb.group.scale.setScalar(f.fit.s); g.add(hb.group); g.scale.set(1, 1, 1); hb.group.traverse(o => { if (o.isMesh) o.castShadow = true; });
    f.holder.parent.remove(f.holder); try { f.hb.dispose(); } catch (e) {}
    f.cut.forEach(o => o.visible = true);
    ctx.sc.add(g);
    const v = (info.vel || info.dir || new V3(0, 0, 1)).clone(); v.y = 0; if (v.lengthSq() < 1e-4) v.set(0, 0, 1); v.normalize().multiplyScalar(1.8 + Math.random()); v.y = 2.4;
    HEADS.push({ g, hb, fo, h: fo.h, vel: v, av: new V3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 12), rest: 0 });
    blood(g.position, 14, v); sfx().chop && sfx().chop(); sfx().squish && sfx().squish(1.2); ctx.shake && ctx.shake(0.35);
    ctx.toast('🩸 斩首！走过去按 E 拾取首级', '#ff9080', 3);
    if (fo.rag) { fo.rag.act.head = false; ragKick(fo, info, 0.4); }
  }
  // 断肢：把这段骨头子树上的三角形按当前姿势“拍”成一块静态网格飞出去，身体上这段骨头缩成 0
  function subtreeBones(root) { const s = new Set(); root.traverse(o => { if (o.isBone || o.type === 'Bone' || o.isObject3D) s.add(o); }); return s; }
  function sever(fo, zone, info) {
    const f = fo.f, bone = f.bones[zone]; if (!bone || (fo.gone && fo.gone.has(zone))) return;
    if (zone === 'spine') fo.halved = true;
    f.root.updateMatrixWorld(true);
    const sub = subtreeBones(bone), piece = new THREE.Group(), v = new V3(), center = new V3(); let nv = 0;
    f.root.traverse(o => {
      if (!o.isSkinnedMesh || !o.visible) return; const geo = o.geometry, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, pa = geo.attributes.position; if (!si) return;
      const bones = o.skeleton.bones, inSub = bones.map(b => sub.has(b));
      const wv = new Float32Array(pa.count), SA = si.array, WA = sw.array, ss = si.itemSize, ws = sw.itemSize; for (let i = 0; i < pa.count; i++) { let w = 0, tot = 0; for (let k = 0; k < 4; k++) { const wk = WA[i * ws + k]; tot += wk; if (inSub[SA[i * ss + k]]) w += wk; } wv[i] = tot > 0 ? w / tot : 0; } // 权重可能是归一化整数：按总和归一
      const idx = geo.index ? geo.index.array : null, tri = []; const n = idx ? idx.length : pa.count;
      for (let t = 0; t < n; t += 3) { const a = idx ? idx[t] : t, b = idx ? idx[t + 1] : t + 1, c = idx ? idx[t + 2] : t + 2; if (wv[a] + wv[b] + wv[c] >= 1.5) tri.push(a, b, c); }
      if (!tri.length) return;
      const used = [...new Set(tri)], remap = new Map(used.map((x, i) => [x, i])), P = new Float32Array(used.length * 3), UV = geo.attributes.uv ? new Float32Array(used.length * 2) : null;
      used.forEach((x, i) => { v.fromBufferAttribute(pa, x); o.boneTransform(x, v); v.applyMatrix4(o.matrixWorld); P.set([v.x, v.y, v.z], i * 3); center.add(v); nv++; if (UV) UV.set([geo.attributes.uv.getX(x), geo.attributes.uv.getY(x)], i * 2); });
      const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.BufferAttribute(P, 3)); if (UV) g2.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
      g2.setIndex(tri.map(x => remap.get(x))); g2.computeVertexNormals();
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
    blood(center, 10, info.vel); sfx().chop && sfx().chop(); sfx().squish && sfx().squish(1);
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
  function blood(p, n, dir) {
    if (!CTX) return; if (!blood.tex) { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 2, 16, 16, 15); gr.addColorStop(0, 'rgba(120,8,8,1)'); gr.addColorStop(0.6, 'rgba(90,4,4,0.9)'); gr.addColorStop(1, 'rgba(60,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); blood.tex = new THREE.CanvasTexture(c); blood.mat = new THREE.SpriteMaterial({ map: blood.tex, transparent: true, depthWrite: false }); }
    for (let i = 0; i < n; i++) {
      const m = new THREE.Sprite(blood.mat.clone()); m.scale.setScalar(0.012 + Math.random() * 0.02); m.position.copy(p);
      const v = new V3((Math.random() - 0.5) * 2.4, 1 + Math.random() * 2, (Math.random() - 0.5) * 2.4); if (dir) v.addScaledVector(tv.copy(dir).normalize(), 1.2);
      CTX.sc.add(m); FX.push({ o: m, v, t: 1.2 + Math.random() * 1.2 });
    }
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
    for (let it = 0; it < 10; it++) {
      for (const [a, b, L, soft] of rg.sticks) {
        if (!actIdx[a] || !actIdx[b]) continue; const pa = rg.pts[a], pb = rg.pts[b]; tv.subVectors(pb.p, pa.p); const d = tv.length() || 1e-6;
        if (soft === 2 && d >= L) continue; const diff = (d - L) / d * (soft === 1 ? 0.2 : 1), wa = pb.m / (pa.m + pb.m), wb = pa.m / (pa.m + pb.m);
        pa.p.addScaledVector(tv, diff * wa); pb.p.addScaledVector(tv, -diff * wb);
      }
      for (const q of rg.pts) { const gy = ctx.H(q.p.x, q.p.z) + 0.045; if (q.p.y < gy) { q.p.y = gy; q.o.x += (q.p.x - q.o.x) * 0.45; q.o.z += (q.p.z - q.o.z) * 0.45; } }
    }
    for (const q of rg.pts) collide(q.p, 0.05);
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
    const Wq = {}; const byName = {}; root.traverse(o => { byName[o.name] = o; });
    const hbName = {}; Object.entries(f.bones).forEach(([k, o]) => hbName[o.name] = k);
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
  return { template, build, animate, clipsFor, loadAnim, headFit, cloneSkinned, script, has, populate, update, targets, hit, clear, nearHead, pickup, IDENT, get foes() { return FOES; }, get heads() { return HEADS; }, get pieces() { return PIECES; }, _sever: sever, _decap: decapitate };
})();
