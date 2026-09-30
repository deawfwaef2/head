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
          sc.traverse(o => { if (o.isMesh) { o.geometry.__shared = true; o.castShadow = true; o.receiveShadow = true; const m = o.material; if (m && m.isMeshStandardMaterial) { m.envMapIntensity = (m.metalness > 0.5 && m.roughness < 0.3) || m.roughness < 0.12 ? 0.1 : 0.35; if (m.map) m.map.anisotropy = 8; } } });
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
    for (let i = 0; i < n; i++) { const e = d[i * 4 + 3]; let f = e ? Math.pow(2, e - 136) : 0; const mx = Math.max(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) * f; if (mx > 1.5) f *= 1.5 / mx; /* 压住洞口阳光，防止镜面/黄铜反射过曝 */ hf[i * 4] = THREE.DataUtils.toHalfFloat(d[i * 4] * f); hf[i * 4 + 1] = THREE.DataUtils.toHalfFloat(d[i * 4 + 1] * f); hf[i * 4 + 2] = THREE.DataUtils.toHalfFloat(d[i * 4 + 2] * f); hf[i * 4 + 3] = THREE.DataUtils.toHalfFloat(1); }
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
    const U = { uScale: { value: opt.scale || 0.4 }, uArm: { value: set.arm || set.diff }, uAO: { value: opt.ao == null ? 0.85 : opt.ao }, uFlat: { value: opt.flat || 0 }, uMac: { value: opt.macro || 0 } };
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('void main() {', 'varying vec3 vTP; varying vec3 vTN;\nvoid main() {')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n vTP = (modelMatrix * vec4(transformed, 1.0)).xyz; vTN = normalize(mat3(modelMatrix) * objectNormal);');
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', `varying vec3 vTP; varying vec3 vTN; uniform float uScale; uniform sampler2D uArm; uniform float uAO; uniform float uFlat; uniform float uMac;
        vec3 triW(vec3 n){ vec3 b = pow(abs(n), vec3(5.0)); return b / (b.x + b.y + b.z); }
        vec4 tri(sampler2D t, vec3 p, vec3 w){ return texture2D(t, p.zy) * w.x + texture2D(t, p.xz) * w.y + texture2D(t, p.xy) * w.z; }
        float mH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float mN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(mH(i), mH(i + vec2(1.0, 0.0)), f.x), mix(mH(i + vec2(0.0, 1.0)), mH(i + vec2(1.0, 1.0)), f.x), f.y); }
        void main() {`)
        .replace('#include <map_fragment>', `vec3 tN = normalize(vTN); if (uFlat > 0.5) tN = vec3(0.0, 1.0, 0.0); vec3 tW = triW(tN); vec3 tP = vTP * uScale;
          vec4 tDiff = tri(map, tP, tW);
          if (uMac > 0.5) { // R46 world_master：大尺度色块 + 双尺度混合打散平铺感 + 陡坡去饱和
            float m1 = mN(vTP.xz * 0.055), m2 = mN(vTP.xz * 0.21 + 7.3);
            if (uMac > 1.5) { vec4 tD2 = tri(map, tP * 0.173 + vec3(0.41, 0.17, 0.63), tW); tDiff = mix(tDiff, tD2, 0.55 * smoothstep(0.25, 0.75, m1)); }
            tDiff.rgb *= 0.76 + 0.48 * (m1 * 0.65 + m2 * 0.35);
            float lum = dot(tDiff.rgb, vec3(0.3, 0.59, 0.11));
            tDiff.rgb = mix(tDiff.rgb, vec3(lum) * 0.82, smoothstep(0.86, 0.55, tN.y) * 0.55);
          }
          diffuseColor *= tDiff; vec4 tArm = tri(uArm, tP, tW);`)
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
    m.customProgramCacheKey = () => 'tri1' + (opt.flat ? 'f' : '') + (opt.macro ? 'm' : '');
    return m;
  }
  // 序列帧火焰（建筑用：烛台/火把/火盆），onBeforeRender 自驱动，无需全局 tick
  let _gl = null;
  const glowT = () => { if (_gl) return _gl; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return (_gl = new THREE.CanvasTexture(c)); };
  function flame(x, y, z, s, col) {
    s = s || 1; const img = IMG.fire; if (!img) return null;
    const g = new THREE.Group(); g.position.set(x || 0, y || 0, z || 0); g.userData.flame = true;
    const c = new THREE.Color(col || '#ff9a3a'), hsl = {}; c.getHSL(hsl);
    const warm = hsl.h > 0.02 && hsl.h < 0.14; // 橙黄火保持贴图原色，其它颜色（魂火）染色
    const tint = warm ? new THREE.Color(2.2, 1.35, 0.8) : new THREE.Color(1, 1, 1).lerp(c, 0.75).multiplyScalar(2.2);
    const t = img.clone(); t.needsUpdate = true; t.repeat.set(0.2, 0.2);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, color: tint, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    sp.center.set(0.5, 0.08); sp.scale.set(0.2 * s, 0.3 * s, 1); sp.raycast = () => {};
    const ph = Math.random() * 25, spd = 24 + Math.random() * 8;
    sp.onBeforeRender = () => { const fr = Math.floor(performance.now() * 0.001 * spd + ph) % 25; t.offset.set((fr % 5) * 0.2, 1 - (Math.floor(fr / 5) + 1) * 0.2); };
    g.add(sp);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT(), color: (warm ? new THREE.Color('#ff8a3a') : c).clone().multiplyScalar(0.5), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    gl.scale.setScalar(0.3 * s); gl.position.y = 0.05 * s; gl.raycast = () => {}; g.add(gl);
    return g;
  }
  // 把模型按目标尺寸放进一个组：o = { w, h, d（任给其一=等比；给多个=分轴）, x, y, z, ry, rx, rz }
  function fit(name, o) {
    o = o || {}; const m = o.node ? part(name, o.node) : clone(name); if (!m) return null;
    const inner = new THREE.Group(); if (o.ry) m.rotation.y = o.ry; inner.add(m); inner.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(m), sz = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
    m.position.set(-c.x, -bb.min.y, -c.z);
    const ks = [o.w && o.w / sz.x, o.h && o.h / sz.y, o.d && o.d / sz.z].filter(Boolean); const u = ks.length ? ks[0] : 1;
    if (ks.length > 1) inner.scale.set(o.w ? o.w / sz.x : u, o.h ? o.h / sz.y : u, o.d ? o.d / sz.z : u); else inner.scale.setScalar(u);
    const out = new THREE.Group(); out.add(inner); out.position.set(o.x || 0, o.y || 0, o.z || 0); out.rotation.set(o.rx || 0, 0, o.rz || 0);
    out.userData.size = new THREE.Vector3(sz.x * inner.scale.x, sz.y * inner.scale.y, sz.z * inner.scale.z);
    return out;
  }
  return { flame, fit, init, has, clone, part, names, tex: n => TEX[n], img: n => IMG[n], env, triplanar, get models() { return MODELS; } };
})();
