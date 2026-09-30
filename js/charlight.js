// R47（R41 主管 e/f）人物光影
//  e：MOD char_unify 总开关（旁路 heads.js 的 anime_shade / skin_sss / 面部补光绝对下限，头身同一段着色）。
//  f：用户：“改成二次元渲染，带点边缘勾线；颜色更丰富有层次：基础色、阴影色、环境影响色、高光、最暗；色调不要写死，和环境暗调-亮色匹配。
//      可以尝试多种风格给我展示；环境可以玩风格化高级 3D 材质感但阴影对齐二次元。”
//  → 人物风格（MOD 组 cstyle，单选）：cs_cel 赛璐璐 / cs_soft 柔光动画 / cs_paint 厚涂质感 / cs_real 写实相对光（e 版）
//    全部颜色从当前环境推出：Ei = 环境（天空/环境图/半球光）辐照度颜色，S = 太阳颜色，Di = 实际直射（含阴影、篝火点光）。
//    亮面 = 环境 + 主光色（平涂）；阴影色 = 亮面亮度 × 比例，色相偏向环境光色并提高饱和；最暗 = 朝下/下巴下的第二阶影；
//    高光 = 阶梯化 Blinn 带（发丝/衣褶），逆光轮廓光 = 太阳色；整体亮度永远随环境（洞里暗、黄昏橙、阴天灰蓝）。
//  → 勾线 MOD char_outline：反向外壳（背面沿法线按屏幕像素外扩，远处变细），颜色 = 贴图色压暗提饱和 × 环境亮度/色调。
//  → 环境 MOD world_cel：场景 PBR 材质保留贴图质感，但阴影边缘收硬、阴影染天空色（二次元式阴影），亮面略平。
window.CharLight = (() => {
  const M = () => window.Mods && Mods.on ? Mods : null;
  const on = () => !!(M() && Mods.on('char_unify'));
  const style = () => { const m = M(); if (!m) return 'cel'; for (const s of ['cel', 'soft', 'paint', 'real']) if (m.on('cs_' + s)) return s; return 'cel'; };
  // 每种风格：w 明暗交界宽度、th 阈值、sh 阴影/亮面亮度比、dp 最暗阶强度、hl 高光、rim 逆光边、sp 保留 PBR 高光、mixP 保留原 PBR 明暗比例、ol 勾线像素、ter 交界暖色带
  const ST = {
    cel:   { w: 0.02, th: 0.3, sh: 0.6, dp: 0.62, hl: 0.3, rim: 0.9, sp: 0.0, mixP: 0.0, ol: 1.8, ter: 0.0 },
    soft:  { w: 0.13, th: 0.3, sh: 0.66, dp: 0.75, hl: 0.18, rim: 1.2, sp: 0.05, mixP: 0.0, ol: 1.3, ter: 0.35 },
    paint: { w: 0.06, th: 0.28, sh: 0.56, dp: 0.7, hl: 0.12, rim: 0.7, sp: 0.35, mixP: 0.3, ol: 1.1, ter: 0.15 },
  };
  const U = { uCLs: { value: 0.4 }, uCLr: { value: 1.1 }, uCLp: { value: 0.2 } };
  const REAL = `// CHARLIGHT_BLOCK real
    { const vec3 W = vec3(0.299, 0.587, 0.114);
      vec3 _ind = reflectedLight.indirectDiffuse, _cur = reflectedLight.directDiffuse + _ind;
      vec3 _alb = diffuseColor.rgb * 0.31831, _sun = vec3(0.0), _L = vec3(0.0, 1.0, 0.0);
      #if NUM_DIR_LIGHTS > 0
        _sun = directionalLights[0].color; _L = directionalLights[0].direction;
      #endif
      vec3 _full = _alb * _sun + _ind;
      float _lf = max(dot(_full, W), 1e-4), _r = dot(_cur, W) / _lf;
      if (_r < 1.0) {
        float _t = smoothstep(0.2, 0.75, _r);
        vec3 _tint = mix(vec3(0.97, 0.93, 0.95), vec3(1.0), _t);
        vec3 _up = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz); float _fm = 0.72 + 0.28 * (dot(normalize(normal), _up) * 0.5 + 0.5);
        vec3 _new = mix(max(_full * uCLs * _fm * _tint, _cur), _cur, _t);
        reflectedLight.directDiffuse = max(_new - _ind, vec3(0.0));
      }
      vec3 _N = normalize(normal), _V = normalize(vViewPosition);
      float _nv = clamp(dot(_N, _V), 0.0, 1.0);
      float _bk = smoothstep(-0.05, 0.6, -dot(_V, _L));
      float _rim = smoothstep(0.45, 0.85, 1.0 - _nv) * smoothstep(-0.25, 0.35, dot(_N, _L)) * _bk;
      totalEmissiveRadiance += _sun * (diffuseColor.rgb * 0.5 + 0.35) * 0.31831 * _rim * uCLr;
      reflectedLight.directSpecular *= uCLp; reflectedLight.indirectSpecular *= uCLp; }`;
  const f = x => x.toFixed(3);
  // 二次元着色核心（按风格常量展开，每种风格一个 program）
  const TOON = s => `// CHARLIGHT_BLOCK ${s.k}
    { const vec3 W = vec3(0.299, 0.587, 0.114);
      vec3 N = normalize(normal), V = normalize(vViewPosition);
      vec3 alb = max(diffuseColor.rgb, vec3(0.004)), A = alb * 0.31831;
      vec3 ind = reflectedLight.indirectDiffuse, dd = reflectedLight.directDiffuse;
      vec3 S = vec3(0.0), L = vec3(0.0, 1.0, 0.0); float shd = 1.0;
      #if NUM_DIR_LIGHTS > 0
        S = directionalLights[0].color; L = directionalLights[0].direction;
      #endif
      #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
        { DirectionalLightShadow _dls = directionalLightShadows[0];
          shd = receiveShadow ? getShadow(directionalShadowMap[0], _dls.shadowMapSize, _dls.shadowBias, _dls.shadowRadius, vDirectionalShadowCoord[0]) : 1.0; }
      #endif
      #ifdef CL_HEAD
        shd = mix(1.0, shd, 0.3);                               // 头：刘海/头发投到脸上的影子大幅减弱（二次元脸不被自身阴影切碎）
      #endif
      vec3 Ei = ind / A, Di = dd / A;                           // 环境辐照度（带颜色）/ 实际直射辐照度
      float eL = max(dot(Ei, W), 1e-4), sL = dot(S, W);
      float sunQ = clamp(dot(N, L), 0.0, 1.0) * shd;            // 只由太阳决定的受光量（法线 × 阴影图）
      vec3 Pi = max(Di - S * sunQ, vec3(0.0));                  // 篝火/灯等点光（太阳之外的直射）
      #ifdef TOON
        Pi = max(Di - S * max(sunQ, shd), vec3(0.0));            // 卡通材质的直射经过色阶贴图，估不准：只取超出满日照的部分
      #endif
      vec3 eC = Ei / eL;                                        // 环境色调（天空蓝 / 黄昏橙 / 洞穴暗红…）
      vec3 kC = sL > 1e-3 ? S / sL : eC;                        // 主光色调
      vec3 up = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
      // 皮肤判定（按反照率色相/饱和度）：皮肤用柔和宽过渡 + 更亮的阴影，不出硬阴影块（二次元脸靠设计好的面部阴影，没有就宁可平）
      float _mx = max(alb.r, max(alb.g, alb.b)), _mn = min(alb.r, min(alb.g, alb.b)), _st = (_mx - _mn) / max(_mx, 1e-3), _al = dot(alb, W);
      float skin = smoothstep(0.06, 0.16, _st) * (1.0 - smoothstep(0.55, 0.75, _st)) * step(alb.g, alb.r + 0.01) * step(alb.b, alb.g + 0.03) * smoothstep(0.12, 0.28, _al);
      float sunQs = smoothstep(-0.25, 0.55, dot(N, L)) * mix(1.0, shd, 0.3);
      #ifdef CL_HEAD
        float tc = smoothstep(${f(s.th * 0.35 - s.w)}, ${f(s.th * 0.35 + s.w)}, sunQ);
      #else
        float tc = smoothstep(${f(s.th - s.w)}, ${f(s.th + s.w)}, sunQ);
      #endif
      float t = mix(tc, sunQs, skin) * step(1e-3, sL);
      // —— 五层颜色（辐照度，最后 × 反照率）——
      float fullL = eL + sL;
      vec3 litI = Ei + S * mix(0.62, 0.9, sunQ);                                   // 基础色：亮面平涂（主光色）
      vec3 shC = eC * vec3(0.94, 0.97, 1.08); shC /= max(dot(shC, W), 1e-4);       // 阴影色调：环境色、略冷
      float shL = max(fullL * mix(${f(s.sh)}, ${f(Math.min(0.85, s.sh + 0.18))}, skin), eL * 0.78);
      vec3 shI = shC * shL;                                                        // 阴影色：亮度随环境（永远不超过满受光）
      float dpK = smoothstep(-0.1, -0.55, dot(N, up)) * (1.0 - t) * (1.0 - 0.6 * skin);                 // 最暗：朝下的面（下巴下、袖底、裙底）
      vec3 dpI = shI * mix(1.0, ${f(s.dp)}, dpK) * mix(vec3(1.0), vec3(0.97, 0.93, 1.02), dpK); // 最暗：略偏紫，不发橙
      vec3 I = mix(dpI, litI, t) + Pi * 0.85;                                      // 环境影响色：点光（篝火暖光）叠在两侧
      float aL = dot(alb, W); vec3 albS = max(mix(vec3(aL), alb, 1.0 + 0.15 * (1.0 - t) * (1.0 - dpK)), vec3(0.0)); // 阴影侧略提饱和（更浓的同色，不发灰）
      vec3 outD = albS * 0.31831 * I;
      ${s.ter > 0 ? `float ter = (1.0 - abs(t * 2.0 - 1.0)) * step(1e-3, sL); outD += max(mix(vec3(aL), alb, 1.6), vec3(0.0)) * 0.31831 * sL * ter * ${f(s.ter)} * 0.3 * vec3(1.0, 0.6, 0.5);` : ''}
      ${s.mixP > 0 ? `outD = mix(outD, dd + ind, ${f(s.mixP)});` : ''}
      reflectedLight.directDiffuse = outD; reflectedLight.indirectDiffuse = vec3(0.0);
      // 高光：阶梯化 Blinn（只在亮面）
      vec3 H = normalize(L + V); float sp = pow(max(dot(N, H), 0.0), 48.0);
      totalEmissiveRadiance += (alb * 0.5 + 0.5) * 0.31831 * S * smoothstep(0.55, 0.62, sp) * t * ${f(s.hl)};
      // 逆光轮廓光（太阳色）+ 极淡的环境色轮廓（从背景里分离）
      float nv = clamp(dot(N, V), 0.0, 1.0), fr = smoothstep(0.5, 0.85, 1.0 - nv);
      float bk = smoothstep(-0.05, 0.6, -dot(V, L));
      totalEmissiveRadiance += (alb * 0.5 + 0.35) * 0.31831 * (S * fr * smoothstep(-0.2, 0.3, dot(N, L)) * mix(0.35, 1.0, shd) * bk * ${f(s.rim)} + Ei * fr * 0.05);
      reflectedLight.directSpecular *= ${f(s.sp)}; reflectedLight.indirectSpecular *= ${f(s.sp)};
      ${window.__CLDBG ? 'reflectedLight.directDiffuse = vec3(0.0); reflectedLight.directSpecular = vec3(0.0); reflectedLight.indirectSpecular = vec3(0.0); totalEmissiveRadiance = vec3(sunQ, t, dot(Pi, W) / max(fullL, 1e-3)) * 0.5;' : ''} }`;
  const cache = {};
  function glsl() { const s = style(); if (s === 'real') return REAL; return cache[s] || (cache[s] = TOON(Object.assign({ k: s }, ST[s]))); }
  // sh：onBeforeCompile 的 shader；插在 aomap 之前（卡通头的 uEnvA 间接光已加上之后）
  function patch(sh, head) {
    if (!on() || sh.fragmentShader.indexOf('CHARLIGHT_BLOCK') >= 0 || sh.fragmentShader.indexOf('#include <aomap_fragment>') < 0) return;
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = '#define CHAR_MAT\n' + (head ? '#define CL_HEAD\n' : '') + sh.fragmentShader.replace('void main() {', 'uniform float uCLs, uCLr, uCLp;\nvoid main() {')
      .replace('#include <aomap_fragment>', glsl() + '\n#include <aomap_fragment>');
  }
  const key = () => on() ? 'U' + style() + (window.__CLDBG ? 'd' : '') : '';
  function tune(o) { Object.assign(U.uCLs, { value: o.shade != null ? o.shade : U.uCLs.value }); if (o.rim != null) U.uCLr.value = o.rim; if (o.spec != null) U.uCLp.value = o.spec; }

  // ===== 勾线：反向外壳 =====
  const olOn = () => on() && !!(M() && Mods.on('char_outline'));
  const OL = { uOLc: { value: new THREE.Color(0.3, 0.26, 0.28) }, uOLr: { value: new THREE.Vector2(1920, 1080) }, uOLw: { value: 1.5 } };
  const SKIP = /eye|iris|pupil|highlight|brow|lash|mouth|teeth|tooth|tongue|cheek|blush|tear|shadow|face_?ex|mayu|matsuge|hitomi|kuchi/i;
  const olMats = new Map(); let lastFrame = -1, lightsAt = -1e9, LS = null, lastScene = null;
  function envSample(scene) { // 环境亮度/色调 → 勾线颜色（每帧一次；灯列表每 2 秒刷新）
    const now = performance.now();
    if (scene !== lastScene || now - lightsAt > 2000) { LS = []; scene.traverse(l => { if (l.isLight && l.visible) LS.push(l); }); lastScene = scene; lightsAt = now; }
    let r = 0, g = 0, b = 0;
    for (const l of LS) { const k = l.isDirectionalLight ? 0.55 : l.isHemisphereLight ? 1.0 : l.isAmbientLight ? 1.0 : 0; if (!k) continue; r += l.color.r * l.intensity * k; g += l.color.g * l.intensity * k; b += l.color.b * l.intensity * k; }
    if (scene.environment) { r += 0.35; g += 0.35; b += 0.37; }
    const lum = r * 0.3 + g * 0.59 + b * 0.11, br = Math.min(1, Math.max(0.12, lum * 0.9)), n = Math.max(lum, 1e-3);
    OL.uOLc.value.setRGB(0.2 * br * (0.6 + 0.4 * r / n), 0.17 * br * (0.6 + 0.4 * g / n), 0.19 * br * (0.6 + 0.4 * b / n));
  }
  function olMat(src) {
    const k = src.uuid; if (olMats.has(k)) return olMats.get(k);
    const m = new THREE.MeshBasicMaterial({ map: src.map || null, color: src.color ? src.color.clone() : 0xffffff, side: THREE.BackSide, alphaTest: src.alphaTest || 0, transparent: false, fog: true });
    m.userData.outline = 1;
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, OL);
      sh.vertexShader = sh.vertexShader.replace('void main() {', 'uniform vec2 uOLr; uniform float uOLw;\nvoid main() {')
        .replace('#include <project_vertex>', `#include <project_vertex>
        #ifdef USE_SKINNING
          vec3 _n = objectNormal;
        #else
          vec3 _n = normal;
        #endif
        gl_Position = projectionMatrix * (mvPosition + vec4(0.0, 0.0, -0.02, 0.0)); // 外壳往后推 2cm：内部褶皱/发丝不出线，只留外轮廓
        vec3 _nv = normalize(normalMatrix * _n);
        vec2 _d = (projectionMatrix * vec4(_nv, 0.0)).xy * uOLr; float _l = length(_d);
        if (_l > 1e-5) { _d /= _l; float _w = uOLw * clamp(3.5 / gl_Position.w, 0.3, 1.0) * step(gl_Position.w, 30.0);
          gl_Position.xy += _d / uOLr * 2.0 * _w * gl_Position.w; }`);
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform vec3 uOLc;\nvoid main() {')
        .replace('#include <map_fragment>', '#include <map_fragment>\n  { float _l = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)); diffuseColor.rgb = max(mix(vec3(_l), diffuseColor.rgb, 1.5), 0.0) * uOLc; }');
    };
    m.customProgramCacheKey = () => 'charOL';
    olMats.set(k, m); return m;
  }
  const tmpV = new THREE.Vector2();
  function onOL(renderer, scene) {
    const fr = renderer.info.render.frame; if (fr === lastFrame) return; lastFrame = fr;
    renderer.getDrawingBufferSize(tmpV); OL.uOLr.value.copy(tmpV); OL.uOLw.value = (ST[style()] || ST.cel).ol * Math.max(1, tmpV.y / 1080);
    envSample(scene);
  }
  // 给一个角色（身体 + 挂好的头）加勾线外壳；外壳作为子物体挂在原网格下 → 可见性/变换随原网格
  function dress(root) {
    if (!olOn() || !root || (style() === 'real')) return;
    const list = []; root.traverse(o => { if (o.isMesh && !o.userData.olHull && !o.userData.olDone && o.material && !Array.isArray(o.material) && o.geometry && o.geometry.attributes.normal) list.push(o); });
    for (const o of list) {
      const m = o.material; o.userData.olDone = 1;
      if (m.transparent || m.userData.outline || o.userData.kind === 'cut' || SKIP.test(o.name) || SKIP.test(m.name || '')) continue;
      if (!(m.isMeshStandardMaterial || m.isMeshToonMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial)) continue;
      let h;
      if (o.isSkinnedMesh) { h = new THREE.SkinnedMesh(o.geometry, olMat(m)); h.bind(o.skeleton, o.bindMatrix); h.bindMode = o.bindMode; }
      else h = new THREE.Mesh(o.geometry, olMat(m));
      if (o.morphTargetInfluences) { h.morphTargetInfluences = o.morphTargetInfluences; h.morphTargetDictionary = o.morphTargetDictionary; }
      h.userData.olHull = 1; h.castShadow = false; h.receiveShadow = false; h.frustumCulled = false; h.renderOrder = o.renderOrder; h.raycast = () => {};
      h.onBeforeRender = onOL; o.add(h);
    }
  }

  // ===== 环境：风格化材质 + 二次元阴影（全局 ShaderChunk，只作用于非角色的 MeshStandardMaterial）=====
  const WCEL = `
  #if defined( STANDARD ) && !defined( CHAR_MAT )
  { const vec3 W = vec3(0.299, 0.587, 0.114);
    vec3 A = max(diffuseColor.rgb, vec3(0.004)) * 0.31831;
    vec3 Ei = reflectedLight.indirectDiffuse / A, Di = reflectedLight.directDiffuse / A;
    vec3 S = vec3(0.0);
    #if NUM_DIR_LIGHTS > 0
      S = directionalLights[0].color;
    #endif
    float eL = max(dot(Ei, W), 1e-4), sL = max(dot(S, W), eL * 1.2 + 1e-4), q = dot(Di, W) / sL;
    float t = smoothstep(0.16, 0.3, q);
    float l2 = mix(0.0, max(q, 0.72), t);
    reflectedLight.directDiffuse *= l2 / max(q, 1e-3);
    vec3 eC = Ei / eL; vec3 shT = mix(vec3(1.0), normalize(eC * vec3(0.88, 0.95, 1.18) + 1e-4) * 1.732, 0.55);
    float _gl = dot(diffuseColor.rgb, W); vec3 _st = max(mix(vec3(_gl), diffuseColor.rgb, 1.15), vec3(0.0)) / max(diffuseColor.rgb, vec3(0.02));
    reflectedLight.indirectDiffuse *= mix(shT * 1.12 * mix(vec3(1.0), min(_st, vec3(1.6)), 0.6), vec3(1.0), t);
    reflectedLight.directSpecular *= mix(0.4, 1.0, t); }
  #endif`;
  let wDone = false;
  function worldInit() {
    if (wDone || !M() || !Mods.on('world_cel')) return; wDone = true;
    const C = THREE.ShaderChunk; C.lights_fragment_end = C.lights_fragment_end + '\n' + WCEL;
  }
  worldInit();
  return { on, patch, key, tune, style, dress, ST, U, OL, worldInit };
})();
