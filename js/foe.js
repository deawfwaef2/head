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
      if (m.name === '__CUT__') { o.visible = false; o.userData.cut = true; }
    });
    return TMPL[name] = { name, E, gltf, root };
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
    const hb = ModelHeads.create(alive ? Object.assign({}, look, { ex: {}, pale: 0, blood: 0, spat: 0 }) : look, { alive });
    hb.group.traverse(o => { if (o.isMesh && o.userData.kind === 'cut') o.visible = false; }); // 活人：头自己的断口盖藏起来
    const sk = hb.U && hb.U.skin && hb.U.skin.value;
    root.traverse(o => { if (o.isMesh && o.material && o.material.userData && o.material.userData.skin && sk) o.material.color.setRGB(Math.min(1.3, sk.x), Math.min(1.3, sk.y), Math.min(1.3, sk.z)); });
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
  function has(name) { return !!(window.BODY_LIST && BODY_LIST.includes(name)); }
  return { template, build, headFit, cloneSkinned, script, has };
})();
