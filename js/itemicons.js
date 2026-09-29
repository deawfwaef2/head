// 第二十二轮：物品 3D 图标（MOD item_3d，默认开）——把 items/items.js 里的 CC0 模型（Quaternius 武器/RPG/地牢包）渲染成缓存的小图，
// 供麻袋/储物箱格子与物品菜单使用；没有对应模型的物品仍用 emoji。一个共享的离屏 WebGL 渲染器，每个模型只渲染一次。
window.ItemIcons = (() => {
  const MAP = { w0: 'WoodenStaff', w1: 'Hammer_Small', w2: 'Sword_2', w3: 'Hammer_Double', w4: 'Axe_Double', w5: 'Scythe', w6: 'Claymore',
    a1: 'Shield_Round', a2: 'Shield_Heater', a3: 'Shield_Heater_2', a4: 'Shield_Celtic_Golden', a5: 'Shield_Round_2',
    iron: 'Bars', cloth: 'Rollofpaper', herb: 'Potion5', dust: 'Potion2', hide: 'Carpet', bone: 'Bones', wood: 'Barrel', gem: 'Gems#2', potion: 'Potion', bigpotion: 'Potion3', bandage: 'Scroll', note: 'Book', book: 'Book2', tome: 'Book3', whet: 'Rock1' };
  const nameOf = (id) => MAP[id] || (/^h\d/.test(id) ? 'KnightHelmet' : /^c\d/.test(id) ? 'Gems#' + [0, 1, 3, 4, 5, 6][(+id.slice(1) - 1) % 6] : /^b\d/.test(id) ? 'Chest' : null);
  const on = () => !(window.Mods && Mods.on('item_3d') === false);
  let P = null, ready = false, R = null, sc = null, cam = null, root = null; const models = {}, cache = {}, cbs = [];
  const b64buf = (s) => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
  function load() {
    if (!on()) return Promise.resolve(false);
    return P || (P = new Promise((res) => {
      const done = async () => {
        try { const A = window.ITEM_GLB || {}; await Promise.all(Object.keys(A).map(k => new Promise((ok) => { try { new THREE.GLTFLoader().parse(b64buf(A[k]), '', g => { models[k] = g.scene; ok(); }, () => ok()); } catch (e) { ok(); } })));
          tintAll();
          ready = true; cbs.splice(0).forEach(f => { try { f(); } catch (e) { } }); res(true); } catch (e) { console.warn('ItemIcons', e); res(false); }
      };
      if (window.ITEM_GLB) return done();
      const s = document.createElement('script'); s.src = 'items/items.js'; s.onload = done; s.onerror = () => res(false); document.head.appendChild(s);
    }));
  }
  // 这几个 FBX 的材质颜色在导出时丢失（全白）→ 按网格顺序上色
  const TINT = { Barrel: [0x8a5a2e, 0x5a5f66, 0x6b4423], KnightHelmet: [0x8f98a3, 0x8f98a3, 0xb08a3a, 0x7a828d], Rollofpaper: [0xe4d8bd], Book: [0x8a6a3e], Scroll: [0xe8dcc0], Gems: [0xff2a3a, 0x2a6aff, 0x2aff6a, 0xffd02a, 0xb02aff, 0x2affe0, 0xf4f4ff] };
  function tintAll() {
    for (const k of Object.keys(TINT)) { const m = models[k]; if (!m) continue; let i = 0; const ms = [];
      m.traverse(o => { if (o.isMesh) { const mats = Array.isArray(o.material) ? o.material : [o.material]; const same = mats.length; mats.forEach((mt, j) => { const c = TINT[k][k === 'Gems' ? ms.length % 7 : i % TINT[k].length]; if (mt.color && (mt.color.getHex() === 0xffffff)) { mt.color.setHex(c); mt.map = null; mt.needsUpdate = true; } if (k !== 'Gems') i++; }); ms.push(o); } });
      if (k === 'Gems') ms.forEach((o, i) => { const g = new THREE.Group(); const c = o.clone(); c.material = (Array.isArray(o.material) ? o.material[0] : o.material).clone(); c.material.color.setHex(TINT.Gems[i % 7]); c.material.emissive && c.material.emissive.setHex(TINT.Gems[i % 7]).multiplyScalar(0.25); c.position.set(0, 0, 0); c.updateMatrix(); g.add(c); models['Gems#' + i] = g; }); }
  }
  function setup() {
    if (R) return; const c = document.createElement('canvas'); c.width = c.height = 192;
    R = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: true, preserveDrawingBuffer: true }); R.setSize(192, 192, false); R.setClearColor(0x000000, 0); R.outputEncoding = THREE.sRGBEncoding;
    sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xfff2e0, 0x35304a, 1.15)); const d = new THREE.DirectionalLight(0xffffff, 1.5); d.position.set(-2, 3, 4); sc.add(d); const r = new THREE.DirectionalLight(0x9fb8ff, 0.6); r.position.set(3, 1, -3); sc.add(r);
    cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  }
  function render(name) {
    const m = models[name]; if (!m) return null; setup();
    const o = m.clone(true); const g = new THREE.Group(); g.add(o); sc.add(g); o.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(o); const sz = box.getSize(new THREE.Vector3()); o.position.sub(box.getCenter(new THREE.Vector3()));
    const tall = Math.max(sz.x, sz.y) / Math.max(0.001, Math.min(sz.x, sz.y));
    g.rotation.y = -0.5; g.rotation.x = 0.12; if (tall > 1.9 && sz.y > sz.x) g.rotation.z = -0.62; // 长柄武器斜放，塞满方图
    g.updateMatrixWorld(true); box = new THREE.Box3().setFromObject(g); const rad = box.getBoundingSphere(new THREE.Sphere()).radius;
    const bs = box.getSize(new THREE.Vector3()), half = Math.max(bs.x, bs.y) / 2, dist = half / Math.tan(cam.fov * Math.PI / 360) * 1.12 + bs.z / 2; cam.position.set(0, dist * 0.06, dist); cam.near = rad * 0.1; cam.far = rad * 30 + dist; cam.updateProjectionMatrix(); cam.lookAt(0, 0, 0); g.position.sub(box.getCenter(new THREE.Vector3()));
    R.clear(); R.render(sc, cam); const url = R.domElement.toDataURL('image/png'); sc.remove(g); return url;
  }
  // 返回 dataURL 或 null（未加载/无模型）。首次调用会触发加载；加载完成回调 onReady 里的函数。
  function url(id) { const n = nameOf(id); if (!n || !on()) return null; if (!ready) { load(); return null; } return cache[n] || (cache[n] = render(n)); }
  return { load, url, has: (id) => !!nameOf(id) && on(), onReady: (f) => { if (ready) f(); else { cbs.push(f); load(); } }, get ready() { return ready; } };
})();
