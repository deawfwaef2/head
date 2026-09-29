// 第十三轮：外部 CC0 资产加载器（assets/*.js 里的 base64 GLB / 贴图组 / HDRI），file:// 可用
// Assets.init(onProgress) → 解析全部；Assets.clone(名) / Assets.part(名, 节点名) 取模型；Assets.tex(名) 取 PBR 贴图组；Assets.env(renderer) 取 PMREM 环境光
window.Assets = (() => {
  const MODELS = {}, TEX = {}, IMG = {}; let hdriSrc = null, envTex = null;
  const b64buf = (s) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
  const loadImg = (url) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
  function parseGLB(s) {
    return new Promise((res, rej) => new THREE.GLTFLoader().parse(b64buf(s), '', g => res(g.scene), rej));
  }
  async function texSet(o) {
    const out = {};
    for (const k of Object.keys(o)) {
      const t = new THREE.Texture(await loadImg(o[k])); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
      if (k === 'diff') t.encoding = THREE.sRGBEncoding; t.needsUpdate = true; out[k] = t;
    }
    return out;
  }
  async function init(onProgress) {
    const A = window.ASSETS || {}; const keys = Object.keys(A); let i = 0;
    for (const k of keys) {
      try {
        if (k.startsWith('tex_')) TEX[k.slice(4)] = await texSet(A[k]);
        else if (k.startsWith('hdri_')) hdriSrc = await loadImg(A[k]);
        else if (k.startsWith('img_')) { const t = new THREE.Texture(await loadImg(A[k])); t.encoding = THREE.sRGBEncoding; t.needsUpdate = true; IMG[k.slice(4)] = t; }
        else {
          const sc = await parseGLB(A[k]);
          sc.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; const m = o.material; if (m && m.isMeshStandardMaterial) { m.envMapIntensity = 0.35; if (m.map) m.map.anisotropy = 8; } } });
          MODELS[k] = sc;
        }
      } catch (e) { console.warn('asset', k, e); }
      A[k] = null; i++; onProgress && onProgress(i / keys.length, k);
      await new Promise(r => setTimeout(r, 0));
    }
  }
  const has = (n) => !!MODELS[n];
  function clone(n) { const m = MODELS[n]; return m ? m.clone(true) : null; }
  function part(n, node) { const m = MODELS[n]; if (!m) return null; let f = null; m.traverse(o => { if (!f && o.name === node) f = o; }); if (!f) return null; const c = f.clone(true); c.position.set(0, 0, 0); c.rotation.set(0, 0, 0); c.scale.set(1, 1, 1); return c; }
  function names(n) { const m = MODELS[n], out = []; if (m) m.traverse(o => { if (o.isMesh) out.push(o.name); }); return out; }
  // HDRI：RGBE PNG → 半浮点 → PMREM
  function env(renderer) {
    if (envTex || !hdriSrc) return envTex;
    const c = document.createElement('canvas'); c.width = hdriSrc.width; c.height = hdriSrc.height; const g = c.getContext('2d'); g.drawImage(hdriSrc, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data; const n = c.width * c.height; const hf = new Uint16Array(n * 4);
    for (let i = 0; i < n; i++) { const e = d[i * 4 + 3]; const f = e ? Math.pow(2, e - 136) : 0; hf[i * 4] = THREE.DataUtils.toHalfFloat(d[i * 4] * f); hf[i * 4 + 1] = THREE.DataUtils.toHalfFloat(d[i * 4 + 1] * f); hf[i * 4 + 2] = THREE.DataUtils.toHalfFloat(d[i * 4 + 2] * f); hf[i * 4 + 3] = THREE.DataUtils.toHalfFloat(1); }
    const t = new THREE.DataTexture(hf, c.width, c.height, THREE.RGBAFormat, THREE.HalfFloatType); t.mapping = THREE.EquirectangularReflectionMapping; t.magFilter = t.minFilter = THREE.LinearFilter; t.flipY = true; t.needsUpdate = true;
    const pm = new THREE.PMREMGenerator(renderer); envTex = pm.fromEquirectangular(t).texture; pm.dispose(); t.dispose();
    // 只给外部资产材质挂环境光（首级保持原有调校）
    for (const k in MODELS) MODELS[k].traverse(o => { if (o.isMesh && o.material && o.material.isMeshStandardMaterial) { o.material.envMap = envTex; o.material.needsUpdate = true; } });
    return envTex;
  }
  // 三平面映射 PBR（岩壁/地面用：不依赖 UV，世界空间投射，whiteout 法线混合）
  function triplanar(set, opt) {
    opt = opt || {};
    const m = new THREE.MeshStandardMaterial({ map: set.diff, normalMap: set.nor, roughness: opt.roughness == null ? 1 : opt.roughness, metalness: 0, color: opt.color || '#ffffff', side: opt.side || THREE.FrontSide, vertexColors: !!opt.vertexColors, envMapIntensity: opt.env == null ? 0.3 : opt.env, envMap: envTex || null });
    m.normalScale = new THREE.Vector2(opt.normal || 1.2, opt.normal || 1.2);
    const U = { uScale: { value: opt.scale || 0.4 }, uArm: { value: set.arm || set.diff }, uAO: { value: opt.ao == null ? 0.85 : opt.ao }, uFlat: { value: opt.flat || 0 } };
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('void main() {', 'varying vec3 vTP; varying vec3 vTN;\nvoid main() {')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n vTP = (modelMatrix * vec4(transformed, 1.0)).xyz; vTN = normalize(mat3(modelMatrix) * objectNormal);');
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', `varying vec3 vTP; varying vec3 vTN; uniform float uScale; uniform sampler2D uArm; uniform float uAO; uniform float uFlat;
        vec3 triW(vec3 n){ vec3 b = pow(abs(n), vec3(5.0)); return b / (b.x + b.y + b.z); }
        vec4 tri(sampler2D t, vec3 p, vec3 w){ return texture2D(t, p.zy) * w.x + texture2D(t, p.xz) * w.y + texture2D(t, p.xy) * w.z; }
        void main() {`)
        .replace('#include <map_fragment>', `vec3 tN = normalize(vTN); if (uFlat > 0.5) tN = vec3(0.0, 1.0, 0.0); vec3 tW = triW(tN); vec3 tP = vTP * uScale;
          vec4 tDiff = tri(map, tP, tW); diffuseColor *= tDiff; vec4 tArm = tri(uArm, tP, tW);`)
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * tArm.g;')
        .replace('#include <aomap_fragment>', '#include <aomap_fragment>\n reflectedLight.indirectDiffuse *= mix(1.0, tArm.r, uAO); reflectedLight.directDiffuse *= mix(1.0, tArm.r, uAO * 0.5);')
        .replace('#include <normal_fragment_maps>', `{
          vec3 n0 = tN * faceDirection;
          vec3 nX = texture2D(normalMap, tP.zy).xyz * 2.0 - 1.0, nY = texture2D(normalMap, tP.xz).xyz * 2.0 - 1.0, nZ = texture2D(normalMap, tP.xy).xyz * 2.0 - 1.0;
          nX.xy *= normalScale; nY.xy *= normalScale; nZ.xy *= normalScale;
          nX = vec3(nX.xy + n0.zy, abs(nX.z) * n0.x); nY = vec3(nY.xy + n0.xz, abs(nY.z) * n0.y); nZ = vec3(nZ.xy + n0.xy, abs(nZ.z) * n0.z);
          vec3 wn = normalize(nX.zyx * tW.x + nY.xzy * tW.y + nZ.xyz * tW.z);
          normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz);
        }`);
    };
    m.customProgramCacheKey = () => 'tri1' + (opt.flat ? 'f' : '');
    return m;
  }
  return { init, has, clone, part, names, tex: n => TEX[n], img: n => IMG[n], env, triplanar, get models() { return MODELS; } };
})();
