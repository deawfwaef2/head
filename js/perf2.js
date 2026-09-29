// 第十九轮（陈列/地图 Agent）：流畅度 II —— 不改画面的渲染减负（MOD：perf2，默认开）
// 实测（22 座陈列 + 211 颗首级，_t.html）：每帧 ~9000 次 draw call，其中首级每颗 ~30 个网格；游戏逻辑 JS 每帧仅 ~3ms，
// 瓶颈完全在 three.js 的逐网格提交。帧率一低，game.js 的自适应会主动降画质档 / 关阴影 / 降分辨率 —— 所以减负 = 保住画面。
// ① 阴影缓存：篝火点光源的立方体阴影（6 面 × 所有投影网格）以前每帧重画，lod 替身每拍一张还会再画一遍。
//    现在只在「投影网格的世界矩阵 / 可见性 / 顶点版本 / 表情 morph / 材质」或「光源位置/范围」真的变了的那一帧重画，
//    逐项精确比较（不是降频），所以画面与原来逐帧一致；另外每 60 帧兜底重画一次。只作用于洞窟场景里的投影光源。
// ② 首级静态合批：一颗首级里的头饰/饰品常常是同一材质的很多小件（珠串、花瓣、镜框……）。把「同材质、同渲染顺序、
//    无 morph、无模板、非透明、无自定义着色器」的静态网格按相对首级根节点的矩阵烘成一个网格（原网格隐藏、保留引用），
//    每颗 ~30 → ~22 次 draw call。只处理进入 9m 内、完整显示的首级；带骨骼（身体）的模型整颗跳过；首级销毁时释放合并几何。
// ③（第二十一轮）稳定自适应：开局/回洞宽限期内不降画质档/分辨率，之后按 3 秒帧时间中位数判断（单个长帧不触发降档→关阴影→全体着色器重编）。
// ④（第二十一轮）菜单期间空闲分片 initTexture 上传全部贴图 + 隐藏首级临时可见 compile 一次。
// ⑤（第二十一轮）lod 替身拍照相机只看第 5 图层：rebuild() 让「第 5 层上的灯」与主相机（第 0 层）看到的灯严格一致（后加入的灯也跟上），
//    避免拍照时灯数不同而多编一套着色器变体。
// 调试：window.__p2 = { shadow:false, merge:false, steady:false, warm:false } 可单独关闭；Perf2.stat() 看统计。
window.Perf2 = (() => {
  if (window.Mods && Mods.on && !Mods.on('perf2')) return { off: true };
  const T = window.THREE; if (!T) return {};
  const OPT = () => window.__p2 || {};
  const st = { shadowDraws: 0, shadowSkips: 0, merged: 0, mergedMeshes: 0, mergedInto: 0, mergedVerts: 0 };

  // ---------------- ① 阴影缓存 ----------------
  let SC = null, R = null, casters = [], slights = [], listT = 0, lastN = -1, buf = null, prev = null, armed = false, lastT = 0, safeT = 0, wasEn = false;
  function rebuild() {
    casters = []; slights = [];
    SC.traverse(o => { if (o.isLight) { if (o.layers.isEnabled(0)) o.layers.enable(5); else o.layers.disable(5); if (o.castShadow && o.shadow) slights.push(o); } else if ((o.isMesh || o.isPoints || o.isLine) && o.castShadow) casters.push(o); });
    lastN = SC.children.length;
  }
  const effVis = (o) => { while (o) { if (!o.visible) return false; if (o === SC) return true; o = o.parent; } return false; };
  const PER = 22;
  function signature() {
    const need = casters.length * PER + slights.length * 8 + 4;
    if (!buf || buf.length < need) { buf = new Float64Array(Math.ceil(need * 1.5)); prev = null; }
    let k = 0;
    for (let c = 0; c < casters.length; c++) {
      const o = casters[c], v = o.castShadow && effVis(o); buf[k++] = v ? 1 : 0;
      if (!v) { for (let i = 1; i < PER; i++) buf[k++] = 0; continue; }
      const e = o.matrixWorld.elements; for (let i = 0; i < 16; i++) buf[k++] = e[i];
      const g = o.geometry; buf[k++] = g ? g.id : 0; buf[k++] = g && g.attributes.position ? g.attributes.position.version : 0;
      let ms = 0; const mi = o.morphTargetInfluences; if (mi) for (let i = 0; i < mi.length; i++) ms += mi[i] * (i + 1.37); buf[k++] = ms;
      buf[k++] = o.material ? (Array.isArray(o.material) ? o.material.length : o.material.id) : 0;
      buf[k++] = o.isInstancedMesh ? o.count * 1e6 + o.instanceMatrix.version : (o.geometry && o.geometry.drawRange ? o.geometry.drawRange.count : 0);
    }
    for (const l of slights) { const e = l.matrixWorld.elements; buf[k++] = e[12]; buf[k++] = e[13]; buf[k++] = e[14]; buf[k++] = l.distance || 0; buf[k++] = l.castShadow ? 1 : 0; buf[k++] = l.shadow.map ? 1 : 0; buf[k++] = l.shadow.mapSize.x; buf[k++] = effVis(l) ? 1 : 0; }
    buf[k++] = casters.length; buf[k++] = slights.length;
    let dirty = !prev || prev.length !== k;
    if (!dirty) for (let i = 0; i < k; i++) if (prev[i] !== buf[i]) { dirty = true; break; }
    if (dirty) prev = buf.slice(0, k);
    return dirty;
  }
  function onMainRender(scene) {
    if ((listT -= 1) <= 0 || scene.children.length !== lastN) { rebuild(); listT = 6; }
    scene.updateMatrixWorld();
    const en = R.shadowMap.enabled;
    let dirty = signature();
    if (en && !wasEn) dirty = true;             // 画质档重新开阴影
    if (++safeT > 60) dirty = true;             // 兜底：每 60 帧无条件重画一次
    wasEn = en;
    for (const l of slights) { l.shadow.autoUpdate = false; if (dirty) l.shadow.needsUpdate = true; }
    if (dirty) { safeT = 0; st.shadowDraws++; } else st.shadowSkips++;
  }
  function releaseShadows() { if (SC) SC.traverse(o => { if (o.isLight && o.shadow) o.shadow.autoUpdate = true; }); }

  // ---------------- ② 首级静态合批 ----------------
  const BASE_OBC = T.Material.prototype.onBeforeCompile;
  const OK_ATTR = { position: 1, normal: 1, uv: 1, uv2: 1, color: 1 };
  const _inv = new T.Matrix4(), _rel = new T.Matrix4(), _nm = new T.Matrix3(), _v = new T.Vector3();
  function attrSig(g) {
    const ks = Object.keys(g.attributes).sort(); if (!g.attributes.position || !g.attributes.normal) return null;
    for (const k of ks) { const a = g.attributes[k]; if (!OK_ATTR[k] || a.isInterleavedBufferAttribute || a.isInstancedBufferAttribute) return null; }
    if (g.morphAttributes && Object.keys(g.morphAttributes).length) return null;
    return ks.map(k => k + g.attributes[k].itemSize + (g.attributes[k].normalized ? 'n' : '')).join(',');
  }
  function chainOK(o, root) { for (let p = o; p && p !== root; p = p.parent) { if (!p.visible || p.isBone || p.isSkinnedMesh || p.isLOD) return false; } return true; }
  function buildMerged(list, root) {
    let nv = 0, ni = 0; const parts = [];
    for (const o of list) {
      const g = o.geometry, n = g.attributes.position.count;
      const dr = g.drawRange; if (dr && (dr.start !== 0 || (dr.count !== Infinity && dr.count < (g.index ? g.index.count : n)))) return null;
      _rel.multiplyMatrices(_inv, o.matrixWorld); _nm.getNormalMatrix(_rel);
      parts.push({ g, n, rel: _rel.clone(), nm: _nm.clone(), flip: _rel.determinant() < 0 }); nv += n; ni += g.index ? g.index.count : n;
    }
    const g0 = list[0].geometry, out = new T.BufferGeometry();
    for (const k in g0.attributes) {
      const a0 = g0.attributes[k], isz = a0.itemSize, arr = new (a0.array.constructor)(nv * isz); let off = 0;
      for (const p of parts) {
        const a = p.g.attributes[k];
        if (k === 'position') { for (let i = 0; i < p.n; i++) { _v.fromBufferAttribute(a, i).applyMatrix4(p.rel); arr[(off + i) * 3] = _v.x; arr[(off + i) * 3 + 1] = _v.y; arr[(off + i) * 3 + 2] = _v.z; } }
        else if (k === 'normal') { for (let i = 0; i < p.n; i++) { _v.fromBufferAttribute(a, i).applyMatrix3(p.nm).normalize(); arr[(off + i) * 3] = _v.x; arr[(off + i) * 3 + 1] = _v.y; arr[(off + i) * 3 + 2] = _v.z; } }
        else { if (a.array.constructor !== arr.constructor) return null; arr.set(a.array.subarray(0, p.n * isz), off * isz); }
        off += p.n;
      }
      out.setAttribute(k, new T.BufferAttribute(arr, isz, a0.normalized));
    }
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni); let vo = 0, io = 0;
    for (const p of parts) {
      const ix = p.g.index;
      for (let t = 0; t < (ix ? ix.count : p.n); t += 3) {
        const a = ix ? ix.getX(t) : t, b = ix ? ix.getX(t + 1) : t + 1, c = ix ? ix.getX(t + 2) : t + 2;
        idx[io++] = vo + a; if (p.flip) { idx[io++] = vo + c; idx[io++] = vo + b; } else { idx[io++] = vo + b; idx[io++] = vo + c; }
      }
      vo += p.n;
    }
    out.setIndex(new T.BufferAttribute(idx, 1)); out.computeBoundingSphere(); out.computeBoundingBox();
    return out;
  }
  function mergeHead(h) {
    const hb = h.hb, root = hb && hb.group; h._p2m = hb; if (!root) return;
    let bad = false; root.traverse(o => { if (o.isSkinnedMesh || o.isBone) bad = true; }); if (bad) return;
    const skip = new Set(hb.hl || []); if (hb.glow) skip.add(hb.glow);
    root.updateMatrixWorld(true); _inv.copy(root.matrixWorld).invert();
    const groups = new Map();
    root.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || o === root || skip.has(o) || o.userData.p2) return;
      const m = o.material; if (!m || Array.isArray(m)) return;
      if (o.morphTargetInfluences || m.stencilWrite || m.transparent || m.onBeforeCompile !== BASE_OBC || m.customProgramCacheKey !== T.Material.prototype.customProgramCacheKey) return;
      if (Object.keys(o.userData).length || o.onBeforeRender !== T.Object3D.prototype.onBeforeRender || !chainOK(o, root)) return;
      const as = attrSig(o.geometry); if (!as || (o.geometry.groups && o.geometry.groups.length > 1)) return;
      const key = m.id + '|' + o.renderOrder + '|' + as + '|' + o.castShadow + o.receiveShadow + o.frustumCulled + '|' + o.layers.mask;
      let L = groups.get(key); if (!L) groups.set(key, L = []); L.push(o);
    });
    const made = [];
    for (const L of groups.values()) {
      if (L.length < 2) continue;
      const verts = L.reduce((s, o) => s + o.geometry.attributes.position.count, 0); if (verts > 20000) continue;
      let geo = null; try { geo = buildMerged(L, root); } catch (e) { console.warn('perf2 merge', e); }
      if (!geo) continue;
      const mm = new T.Mesh(geo, L[0].material); mm.name = 'p2merge'; mm.userData.p2 = L;
      mm.renderOrder = L[0].renderOrder; mm.castShadow = L[0].castShadow; mm.receiveShadow = L[0].receiveShadow; mm.frustumCulled = L[0].frustumCulled; mm.layers.mask = L[0].layers.mask;
      root.add(mm); L.forEach(o => { o.visible = false; o.userData.p2hid = true; });
      made.push(geo); st.mergedMeshes += L.length; st.mergedInto++; st.mergedVerts += verts;
    }
    if (made.length) {
      st.merged++;
      const d0 = hb.dispose; hb.dispose = function () { made.forEach(g => g.dispose()); made.length = 0; return d0 && d0.apply(this, arguments); };
    }
  }
  let mT = 0;
  function mergeTick(dt, cam) {
    if (OPT().merge === false) return;
    if ((mT -= dt) > 0) return; mT = 0.1;
    let budget = 6; const cp = cam.position;
    for (const h of G.heads) {
      if (!h.hb || h._p2m === h.hb || h.g.visible === false || h._imp) continue;
      if (h.g.position.distanceToSquared(cp) > 81) continue;
      mergeHead(h); if (--budget <= 0) break;
    }
  }


  // ---------------- ③ 稳定的自适应画质（第二十一轮：进洞卡一段的根因之一）----------------
  // game.js 每 2 秒按平均 FPS 调档：开局那几秒有贴图上传/首帧编译/LOD 拍照，平均 FPS 必然很低 → 降到 mid → 关阴影 →
  // 所有受光材质换着色器变体（几十上百个程序重编，卡得更狠）→ 稳定后升档、开阴影 → 再全部重编一遍。
  // 这里拦截 post.setTier / renderer.setPixelRatio 的「降级」：开局/回洞宽限期内不降；之后只看最近 3 秒帧时间的中位数
  // （单个长帧不算），中位数确实慢才放行。升级一律放行。画面只会比原来更稳定，不会更差。
  const FT = new Float32Array(240); let ftN = 0, ftI = 0, lastFT = 0, graceUntil = 0, wasPlaying = false;
  const grace = (ms) => { graceUntil = Math.max(graceUntil, performance.now() + ms); };
  function trackFrame() {
    const n = performance.now();
    if (lastFT && n - lastFT > 600) { grace(4000); ftN = 0; } // 洞窟主循环停过（出猎/小游戏/切后台）→ 回来重新给宽限
    else if (lastFT) { FT[ftI] = n - lastFT; ftI = (ftI + 1) % FT.length; ftN = Math.min(FT.length, ftN + 1); }
    lastFT = n;
    const pl = !!G.playing; if (pl && !wasPlaying) grace(5000); wasPlaying = pl;
  }
  function medianMs(win) { // 最近 win 毫秒内帧时间中位数
    const a = []; let acc = 0; for (let k = 0; k < ftN && acc < win; k++) { const v = FT[(ftI - 1 - k + FT.length) % FT.length]; a.push(v); acc += v; }
    if (a.length < 20) return 0; a.sort((x, y) => x - y); return a[a.length >> 1];
  }
  const slowFor = (fps) => performance.now() > graceUntil && medianMs(3000) > 1000 / fps;
  function steadyAdaptive() {
    if (OPT().steady === false) return;
    const post = G.post, TIER = { mid: 0, high: 1, ultra: 2 };
    if (post && post.setTier && !post._p2) {
      const st0 = post.setTier.bind(post); post._p2 = true;
      post.setTier = function (t) { const cur = TIER[post.tier], nx = TIER[t]; if (OPT().steady !== false && cur != null && nx != null && nx < cur && !slowFor(38)) { st.tierBlocked = (st.tierBlocked || 0) + 1; return; } st.tierSet = (st.tierSet || 0) + 1; return st0(t); };
    }
    if (!R._p2pr) {
      const sp0 = R.setPixelRatio.bind(R); R._p2pr = true;
      R.setPixelRatio = function (v) { if (OPT().steady !== false && v < R.getPixelRatio() - 1e-3 && !slowFor(40)) { st.prBlocked = (st.prBlocked || 0) + 1; return; } return sp0(v); };
    }
  }

  // ---------------- ④ 菜单期间预上传（贴图 + 隐藏首级的着色器）----------------
  // three r147 的 compile() 只编可见物体、也不上传贴图；被 LOD 藏起来的首级、第一次转身才看到的物件，贴图/着色器都会在游戏中现传现编。
  // 这里在空闲时段分片：renderer.initTexture 上传场景里所有贴图；把所有首级临时设为可见做一次 compile（只编译、不渲染）。
  function warmUploads() {
    if (OPT().warm === false) return;
    const texs = new Set(), seen = new Set();
    SC.traverse(o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) { if (!m || seen.has(m)) continue; seen.add(m); for (const k in m) { const v = m[k]; if (v && v.isTexture && !v.isRenderTargetTexture && v.image) texs.add(v); } if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k] && m.uniforms[k].value; if (v && v.isTexture && !v.isRenderTargetTexture && v.image) texs.add(v); } } });
    const list = [...texs]; let i = 0; st.warmTex = list.length;
    const idle = window.requestIdleCallback || (f => setTimeout(() => f({ timeRemaining: () => 8 }), 30));
    const step = (dl) => { const t0 = performance.now(); while (i < list.length && performance.now() - t0 < 6) { try { R.initTexture(list[i]); } catch (e) {} i++; } if (i < list.length) idle(step, { timeout: 400 }); };
    idle(step, { timeout: 400 });
    // 隐藏首级的着色器：一次 compile
    setTimeout(() => { try {
      const hid = []; for (const h of G.heads) if (h.g && !h.g.visible) { h.g.visible = true; hid.push(h.g); }
      if (hid.length) { const tm = R.toneMapping, rt0 = R.getRenderTarget(), viaRT = !!(G.post && G.post.on); // 与 Foe.warm 相同：模拟后处理的离屏状态，否则编出的是用不上的变体
        try { if (viaRT) { warmUploads.rt = warmUploads.rt || new T.WebGLRenderTarget(16, 16, { depthBuffer: true }); R.toneMapping = T.NoToneMapping; R.setRenderTarget(warmUploads.rt); } R.compile(SC, G.camera); } finally { R.toneMapping = tm; R.setRenderTarget(rt0); } }
      hid.forEach(g => g.visible = false); st.warmHidden = hid.length;
    } catch (e) { console.warn('perf2 warm', e); } }, 600);
  }

  // ---------------- 挂载 ----------------
  const wait = setInterval(() => {
    if (!window.G || !G.HOOK || !G.renderer || !G.scene) return;
    clearInterval(wait);
    SC = G.scene; R = G.renderer;
    const orig = R.render;
    R.render = function (s, c) {
      if (s !== SC || !armed) return orig.call(this, s, c);
      armed = false;
      if (OPT().shadow === false) { releaseShadows(); return orig.call(this, s, c); }
      try { onMainRender(s); } catch (e) { console.warn('perf2', e); releaseShadows(); return orig.call(this, s, c); }
      s.matrixWorldAutoUpdate = false; // 刚更新过世界矩阵，本次渲染不必再遍历一遍
      try { return orig.call(this, s, c); } finally { s.matrixWorldAutoUpdate = true; }
    };
    G.HOOK.pre.push(() => { armed = true; });
    G.HOOK.frame.push((dt) => { trackFrame(); if (G.camera) mergeTick(dt, G.camera); });
    grace(8000); try { steadyAdaptive(); } catch (e) { console.warn('perf2 steady', e); }
    setTimeout(() => { try { warmUploads(); } catch (e) { console.warn('perf2 warm', e); } }, 200);
  }, 150);

  function mergeAll() { if (!window.G) return 0; let n = 0; for (const h of G.heads) if (h.hb && h._p2m !== h.hb) { mergeHead(h); n++; } return n; }
  return { mergeAll, stat: () => Object.assign({ casters: casters.length, lights: slights.length }, st), mergeHead, _rebuild: () => rebuild() };
})();
