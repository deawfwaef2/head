// 模型头部管理：解析 models/*.js 中的 GLB、材质变体（改色改模）、表情 morph、眨眼、反应
window.ModelHeads = (() => {
  const templates = [];
  const SRC = new WeakMap(); // mesh -> 源材质（不能放 userData：clone 时会 JSON 序列化贴图，极慢）
  let ready = false;
  const grad = (() => {
    const d = new Uint8Array([150, 205, 240, 255]);
    const t = new THREE.DataTexture(d, 4, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
  })();

  // 表情：VRM 预设组合
  const EXPR = [
    { n: '半闭眼·微张嘴', w: { blink: 0.5, aa: 0.28 } },
    { n: '瞪视·紧闭嘴', w: { angry: 0.55, surprised: 0.25 } },
    { n: '微笑', w: { relaxed: 0.75 } },
    { n: '开心', w: { happy: 1 } },
    { n: '困倦', w: { blink: 0.72, ou: 0.25 } },
    { n: '眨眼', w: { blinkleft: 1, relaxed: 0.5 } },
    { n: '惊讶', w: { surprised: 1 } },
    { n: '委屈', w: { sad: 0.9 } },
    { n: '生气', w: { angry: 1, ee: 0.3 } },
    { n: '呆滞', w: { blink: 0.22, oh: 0.45 } },
    { n: '闭眼安详', w: { blink: 1, relaxed: 0.3 } },
    { n: '啊~', w: { aa: 0.9, happy: 0.35 } },
    { n: '嘟嘴', w: { ou: 0.8, angry: 0.3 } },
    { n: '坏笑', w: { relaxed: 0.6, ee: 0.4, angry: 0.2 } }
  ];
  const REACT = [{ blink: 1, aa: 0.7 }, { surprised: 1, oh: 0.4 }, { happy: 1, aa: 0.5 }, { angry: 0.8, blink: 0.5, ee: 0.4 }];

  function b64ToBuf(b64) {
    const bin = atob(b64); const len = bin.length; const u = new Uint8Array(len);
    for (let i = 0; i < len; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  }

  function parseOne(entry) {
    return new Promise((res) => {
      try {
        const loader = new THREE.GLTFLoader();
        loader.parse(b64ToBuf(entry.glb), '', (gltf) => {
          entry.glb = null; // 释放
          const scene = gltf.scene;
          const meshes = [];
          scene.traverse(o => { if (o.isMesh) meshes.push(o); });
          meshes.forEach(m => {
            const src = m.material; const nm = src.name || '';
            SRC.set(m, src);
            m.userData.kind = nm === '__CUT__' ? 'cut' : /HAIR/i.test(nm) || entry.hair.includes(m.name) ? 'hair' : /Iris/i.test(nm) ? 'iris' : 'other';
            m.renderOrder = /Highlight/i.test(nm) ? 4 : /Iris/i.test(nm) ? 3 : /Eyeline|Eyelash|Brow/i.test(nm) ? 3 : /EyeWhite/i.test(nm) ? 2 : 0;
            m.castShadow = false; m.receiveShadow = false;
            if (m.geometry.morphAttributes.position) { m.geometry.computeBoundingSphere(); }
          });
          const box = new THREE.Box3().setFromObject(scene);
          templates.push({ meta: entry, scene, meshes, top: box.max.y, bottom: entry.bottom, matCache: new Map() });
          res(true);
        }, (e) => { console.warn('模型解析失败', entry.file, e); res(false); });
      } catch (e) { console.warn(e); res(false); }
    });
  }

  async function init(onProgress) {
    const list = window.HEAD_MODELS || [];
    for (let i = 0; i < list.length; i++) {
      await parseOne(list[i]);
      onProgress && onProgress((i + 1) / list.length, list[i].name);
      await new Promise(r => setTimeout(r, 0));
    }
    ready = templates.length > 0;
    return ready;
  }

  let cutMat = null;
  function getCut() {
    if (!cutMat) cutMat = HeadGen.cutMaterial('#f6cdb8');
    return cutMat;
  }

  // 色相/饱和度着色器注入
  function hueify(mat, hue, sat) {
    mat.userData.hue = { value: hue }; mat.userData.sat = { value: sat };
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uHue = mat.userData.hue; sh.uniforms.uSat = mat.userData.sat;
      sh.fragmentShader = sh.fragmentShader
        .replace('void main() {', `uniform float uHue; uniform float uSat;
vec3 hueRot(vec3 c, float h){ const vec3 k = vec3(0.57735); float ca = cos(h); vec3 r = c*ca + cross(k,c)*sin(h) + k*dot(k,c)*(1.0-ca); float l = dot(r, vec3(0.299,0.587,0.114)); return max(mix(vec3(l), r, uSat), 0.0); }
void main() {`)
        .replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb = hueRot(diffuseColor.rgb, uHue);');
    };
    mat.customProgramCacheKey = () => 'hue1';
  }
  function makeMat(src, kind, v) {
    const m = new THREE.MeshToonMaterial({
      map: src.map || null, color: src.color ? src.color.clone() : new THREE.Color(1, 1, 1), gradientMap: grad,
      transparent: src.transparent, alphaTest: src.alphaTest, side: src.side, depthWrite: src.depthWrite,
      emissive: new THREE.Color(0x000000)
    });
    m.name = src.name;
    if ((kind === 'hair' && (v.hue !== 0 || v.sat !== 1)) || (kind === 'iris' && v.eye)) hueify(m, kind === 'iris' ? v.eye : v.hue, kind === 'iris' ? 1.1 : v.sat);
    if (v.glow && kind === 'hair') { m.emissive = new THREE.Color(v.glow); m.emissiveIntensity = 0.12; }
    return m;
  }
  function materialsFor(t, v) {
    let key = v.key;
    if (v.unique) key = key + '|' + Math.random();
    if (t.matCache.has(key)) return t.matCache.get(key);
    const map = new Map();
    t.meshes.forEach(m => {
      const k = m.userData.kind;
      map.set(m.name, k === 'cut' ? getCut() : makeMat(SRC.get(m), k, v));
    });
    if (!v.unique) t.matCache.set(key, map);
    return map;
  }

  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // 变体：稀有度越高改色越大胆
  function variant(seed, rarity) {
    const r = rng(seed * 7 + 13);
    let hue = 0, sat = 1, eye = 0, glow = null, unique = false;
    const Q = n => Math.round(n * 12) / 12 * Math.PI * 2; // 12 档色相
    if (rarity === 0) { if (r() < 0.35) hue = Q((r() - 0.5) * 0.25); }
    else if (rarity === 1) { hue = Q(r()); }
    else if (rarity === 2) { hue = Q(r()); sat = 1.25; eye = Q(r()); }
    else if (rarity === 3) { hue = Q(r()); sat = 1.35; eye = Q(r()); glow = '#ffcc55'; }
    else { hue = 0.001; sat = 1.5; eye = Q(r()); glow = '#ff66dd'; unique = true; }
    return { hue, sat, eye, glow, unique, key: [hue.toFixed(2), sat, eye.toFixed(2), glow].join('|') };
  }

  function create(modelIdx, rarity, seed, exprIdx) {
    const t = templates[modelIdx % templates.length];
    const v = variant(seed, rarity);
    const mats = materialsFor(t, v);
    const g = t.scene.clone(true);
    const byName = {};
    const morphMeshes = [];
    const allMats = [];
    g.traverse(o => {
      if (o.isMesh) {
        o.material = mats.get(o.name) || o.material; byName[o.name] = o; allMats.push(o.material);
        if (o.morphTargetInfluences) morphMeshes.push(o);
      }
    });
    const presets = t.meta.presets || {};
    const ex = EXPR[exprIdx % EXPR.length];
    let cur = null;
    function apply(w) {
      morphMeshes.forEach(m => m.morphTargetInfluences.fill(0));
      for (const k in w) {
        const binds = presets[k]; if (!binds) continue;
        for (const [mn, idx, wt] of binds) { const m = byName[mn]; if (m && m.morphTargetInfluences) m.morphTargetInfluences[idx] = Math.min(1, m.morphTargetInfluences[idx] + wt * w[k]); }
      }
    }
    const state = { reactT: 0, blinkT: 2 + Math.random() * 4, blinking: 0, dirty: true };
    function setBase() { cur = ex.w; apply(cur); }
    setBase();
    const eyesClosed = (ex.w.blink || 0) >= 0.7 || ex.w.happy >= 0.9;
    // 稀有度饰品
    const acc = [];
    if (rarity >= 4) {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.008, 10, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.9, 1.0) }));
      halo.rotation.x = Math.PI / 2 - 0.2; halo.position.set(0, t.top + 0.04, -0.01); g.add(halo); acc.push(halo);
    } else if (rarity === 3) {
      const crown = new THREE.Group();
      const gold = new THREE.MeshStandardMaterial({ color: '#ffd36b', metalness: 1, roughness: 0.2 });
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.02, 20, 1, true), gold); crown.add(ring);
      for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.03, 6), gold); const a = i / 5 * Math.PI * 2; s.position.set(Math.cos(a) * 0.047, 0.022, Math.sin(a) * 0.047); crown.add(s); }
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.01), new THREE.MeshStandardMaterial({ color: '#ff3d7f', emissive: '#80002a', roughness: 0.1 })); gem.position.set(0, 0.005, 0.05); crown.add(gem);
      crown.position.set(0.02, t.top - 0.005, -0.01); crown.rotation.z = -0.25; g.add(crown);
    }
    return {
      group: g, name: t.meta.name, exprName: ex.n, credit: t.meta.credit, acc, v, radius: 0.17,
      react() { apply(REACT[Math.floor(Math.random() * REACT.length)]); state.reactT = 0.4; },
      setExpr() { setBase(); },
      update(dt, near) {
        if (state.reactT > 0) { state.reactT -= dt; if (state.reactT <= 0) setBase(); return; }
        if (!near || eyesClosed) return;
        state.blinkT -= dt;
        if (state.blinkT <= 0 && !state.blinking) { state.blinking = 0.13; const w = Object.assign({}, cur); w.blink = 1; w.blinkleft = 0; apply(w); }
        if (state.blinking) { state.blinking -= dt; if (state.blinking <= 0) { state.blinking = 0; state.blinkT = 2 + Math.random() * 5; apply(cur); } }
      },
      animate(now) { if (v.unique) allMats.forEach(m => { if (m.userData.hue) m.userData.hue.value = now * 0.8; }); },
      dispose() { acc.forEach(a => a.geometry.dispose()); if (v.unique) allMats.forEach(m => { if (m !== getCut()) m.dispose(); }); }
    };
  }

  return {
    init, create, EXPR,
    get ready() { return ready; },
    get count() { return templates.length; },
    names: () => templates.map(t => t.meta.name),
    indexOf: (file) => templates.findIndex(t => t.meta.file === file),
    fileOf: (i) => templates[i] && templates[i].meta.file
  };
})();
