// 第十九轮（陈列/地图 Agent）：流畅度 II —— 不改画面的渲染减负（MOD：perf2，默认开）
// 实测（22 座陈列 + 211 颗首级，_t.html）：每帧 ~9000 次 draw call，其中首级每颗 ~30 个网格；游戏逻辑 JS 每帧仅 ~3ms，
// 瓶颈完全在 three.js 的逐网格提交。帧率一低，game.js 的自适应会主动降画质档 / 关阴影 / 降分辨率 —— 所以减负 = 保住画面。
// ① 阴影缓存：篝火点光源的立方体阴影（6 面 × 所有投影网格）以前每帧重画，lod 替身每拍一张还会再画一遍。
//    现在只在「投影网格的世界矩阵 / 可见性 / 顶点版本 / 表情 morph / 材质」或「光源位置/范围」真的变了的那一帧重画，
//    逐项精确比较（不是降频），所以画面与原来逐帧一致；另外每 60 帧兜底重画一次。只作用于洞窟场景里的投影光源。
// ② 首级静态合批：一颗首级里的头饰/饰品常常是同一材质的很多小件（珠串、花瓣、镜框……）。把「同材质、同渲染顺序、
//    无 morph、无模板、非透明、无自定义着色器」的静态网格按相对首级根节点的矩阵烘成一个网格（原网格隐藏、保留引用），
//    每颗 ~30 → ~22 次 draw call。只处理进入 9m 内、完整显示的首级；带骨骼（身体）的模型整颗跳过；首级销毁时释放合并几何。
// 调试：window.__p2 = { shadow:false, merge:false } 可单独关闭；Perf2.stat() 看统计。
window.Perf2 = (() => {
  if (window.Mods && Mods.on && !Mods.on('perf2')) return { off: true };
  const T = window.THREE; if (!T) return {};
  const OPT = () => window.__p2 || {};
  const st = { shadowDraws: 0, shadowSkips: 0, merged: 0, mergedMeshes: 0, mergedInto: 0, mergedVerts: 0 };

  // ---------------- ① 阴影缓存 ----------------
  let SC = null, R = null, casters = [], slights = [], listT = 0, lastN = -1, buf = null, prev = null, armed = false, lastT = 0, safeT = 0, wasEn = false;
  function rebuild() {
    casters = []; slights = [];
    SC.traverse(o => { if (o.isLight) { if (o.castShadow && o.shadow) slights.push(o); } else if ((o.isMesh || o.isPoints || o.isLine) && o.castShadow) casters.push(o); });
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
    G.HOOK.frame.push((dt) => { if (G.camera) mergeTick(dt, G.camera); });
  }, 150);

  function mergeAll() { if (!window.G) return 0; let n = 0; for (const h of G.heads) if (h.hb && h._p2m !== h.hb) { mergeHead(h); n++; } return n; }
  return { mergeAll, stat: () => Object.assign({ casters: casters.length, lights: slights.length }, st), mergeHead, _rebuild: () => rebuild() };
})();
