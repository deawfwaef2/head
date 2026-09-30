// 首级生成器 v3：跨模型混搭（脸×发型）、染发/瞳色/肤色、死气表情、血迹/伤疤/战纹着色器、头发摆动物理、种族特征与饰品
// 第二十四轮：面部补光 FaceFill（MOD face_light）—— 光照算完后，按“已被照亮的程度”把不够亮的地方补到一个下限（偏向朝着相机的面）。
// 已经被照亮的脸不变；背光/阴天/夜里的脸不再黑成一团。全局共享一个 uniform：开关/强度改变都不会重编译着色器。
window.FaceFill = (() => {
  let worldT = -1e9; const done = new WeakSet(); // 不能用 userData 标记：clone() 会复制 userData 却不复制 onBeforeCompile
  const u = { get value() { if (window.Mods && !Mods.on('face_light')) return 0; const L = !window.Mods || Mods.on('char_lift'); return performance.now() - worldT < 600 ? (L ? 0.85 : 0.75) : (L ? 0.8 : 0.45); } }; /* R29 char_lift：洞里 0.45→0.8、野外 0.75→0.85 */ // 亮度下限（满光≈1.08；白天≈0.9–1.0 不受影响，夜里≈0.5 提到 0.75）：野外 0.75，洞穴 0.45
  // 第二十六轮(j) MOD head_tone：野外 PBR 身体从天空环境图（scene.environment × envMapIntensity 0.55）得到间接光，卡通头拿不到 → 头比身体暗。
  // 给卡通材质补同量的天空平均辐亮度（worlds.js parseSky 算出 sky.amb）；洞里/关 MOD 为 0。共享 uniform，不重编译。
  const ZERO = new THREE.Color(0, 0, 0), envA = new THREE.Color(0, 0, 0);
  // 卡通软膝盖（下面 ShaderLib.toon 补丁，满光只到 ≈0.76、烈日封顶 ≈1.08）当初是身体也用卡通材质时加的；现在身体是 PBR 不压缩 → 野外头比身体暗 25%+。
  // head_tone：野外（活人头长在身体上）关掉头的软膝盖；洞里（只有陈列首级、篝火）保留，防止被火光冲白。
  // 野外改成：满光以内线性（与 PBR 身体同一条响应），超过满光再柔性压到 tune.knee 倍封顶。
  const tune = { knee: 1.35, env: 0.4, pbr: 0.62 }; // R33 pbr：head_pbr 头的反照率倍率（PBR 头吃到与身体同样多的环境光，贴图/染色参数是按卡通光标定的，不压一压会偏白）
  const hk = { get value() { return tune.pbr; } }; // 实测（草甸/松林，脸颊 vs 脖子）：1.45/1 发白，1.45/0 偏黄，1.3/0.5 最接近
  const ko = { get value() { return (window.Mods && !Mods.on('head_tone')) || performance.now() - worldT > 600 ? 0 : tune.knee; } };
  const envT = new THREE.Color(); const ea = { get value() { return (window.Mods && !Mods.on('head_tone')) || performance.now() - worldT > 600 ? ZERO : envT.copy(envA).multiplyScalar(tune.env); } };
  // ===== R36 MOD anime_shade（用户：“角色头部像塑料，二次元模型在三次元 shader 上的违和感，改成二次元光影！”）=====
  // 思路：PBR 光照照旧算（天空/太阳/篝火/阴影都照常响应），但在 lights_fragment_end 之后把“受光比 lr”（= 光照亮度 / 反照率亮度，满光≈1）
  // 重新映射成二次元的两段式：亮面（平涂，几乎不随角度变）/ 暗面（抬高到 ~80%，并染上暖粉的阴影色）/ 之间 ~0.12 宽的软过渡；
  // 并彻底去掉高光与环境镜面反射（塑料感的来源）、再加一圈很淡的边缘光。极暗环境（洞里、夜里）仍然保持暗，不会被抬平。
  const animeOn = () => !window.Mods || !Mods.on || Mods.on('anime_shade') !== false;
  const ANIME_GLSL = `// ANIME_BLOCK
    { vec3 _litC = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
      float _alb = max(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)), 1e-3) * 0.3183;
      float _lr = dot(_litC, vec3(0.299, 0.587, 0.114)) / _alb;
      float _tB = smoothstep(0.50, 0.74, _lr);
      float _dk = smoothstep(0.03, 0.32, _lr);
      float _tl = mix(0.80 * _dk, max(1.04, min(_lr * 1.05, 1.28)), _tB);
      float _sc = min(_tl / max(_lr, 0.02), 6.0);
      vec3 _tint = mix(vec3(1.0, 0.885, 0.93), vec3(1.0), _tB);
      reflectedLight.directDiffuse *= _sc * _tint; reflectedLight.indirectDiffuse *= _sc * _tint;
      reflectedLight.directSpecular = vec3(0.0); reflectedLight.indirectSpecular = vec3(0.0);
      float _fr = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);
      reflectedLight.indirectDiffuse += diffuseColor.rgb * 0.3183 * _fr * 0.22 * _dk; }`;
  function animePatch(sh) { if (!animeOn() || sh.fragmentShader.indexOf('ANIME_BLOCK') >= 0 || sh.fragmentShader.indexOf('#include <lights_fragment_end>') < 0) return; sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n' + ANIME_GLSL); }
  // ===== R36b MOD skin_sss（用户：“头渲染改成 3D shader 那种风格，可以加次表面散射之类的，反正看起来更像人的头，而不是塑料”）=====
  // 保留 PBR（天空/太阳/篝火/阴影照常），在 lights_fragment_end 之后只对“肤色像素”（由反照率的色相/饱和度/亮度判定，头发衣服不受影响）做：
  //  ① 明暗交界带染血红色散射（预积分皮肤的经典红晕：受光→背光过渡处偏红橙，而不是灰）；② 背光侧暖色填充（皮下散射回来的光，暗部不发灰发死）；
  //  ③ 掠射角红色透光边（耳廓/鼻翼/指尖的透光感，只在受光时出现）；④ 高光压到 50~80%、加一圈极淡的宽油脂光泽（去掉塑料硬高光，又保留皮肤的湿润感）。
  // 极暗环境（洞里/夜里）不抬亮。参数集中在 SSS_GLSL。关 MOD = 原来的 PBR（或 anime_shade）。
  const sssOn = () => !window.Mods || !Mods.on || Mods.on('skin_sss') !== false;
  const SSS_GLSL = `// SSS_BLOCK
    { vec3 _a = diffuseColor.rgb; float _l = dot(_a, vec3(0.299, 0.587, 0.114));
      float _mx = max(_a.r, max(_a.g, _a.b)), _mn = min(_a.r, min(_a.g, _a.b)), _st = (_mx - _mn) / max(_mx, 1e-3);
      float _sk = smoothstep(0.09, 0.2, _st) * (1.0 - smoothstep(0.55, 0.75, _st)) * step(_a.g, _a.r + 0.01) * step(_a.b, _a.g + 0.03) * smoothstep(0.14, 0.3, _l);
      vec3 _litC = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
      float _lr = dot(_litC, vec3(0.299, 0.587, 0.114)) / (max(_l, 1e-3) * 0.3183);
      float _dk = smoothstep(0.03, 0.30, _lr);
      float _pen = smoothstep(0.10, 0.50, _lr) * (1.0 - smoothstep(0.55, 1.05, _lr));
      float _nv = clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), _fr = pow(1.0 - _nv, 2.6);
      vec3 _base = _a * 0.3183;
      vec3 _add = _base * vec3(1.0, 0.36, 0.22) * (_pen * 0.5 + _fr * smoothstep(0.3, 1.0, _lr) * 0.5)
                + _base * vec3(1.0, 0.64, 0.52) * (1.0 - smoothstep(0.0, 0.65, _lr)) * 0.2;
      reflectedLight.indirectDiffuse = reflectedLight.indirectDiffuse * mix(vec3(1.0), vec3(1.05, 0.97, 0.92), _sk * _dk) + _add * _dk * _sk;
      reflectedLight.directSpecular *= mix(0.3, 0.7, _sk); reflectedLight.indirectSpecular *= mix(0.35, 0.8, _sk); /* 头发/衣服：硬高光压到 30%，不再是一块块塑料反光 */
      reflectedLight.indirectSpecular += vec3(1.0, 0.93, 0.88) * 0.035 * _fr * _dk * _sk; }`;
  function sssPatch(sh) { if (!sssOn() || sh.fragmentShader.indexOf('SSS_BLOCK') >= 0 || sh.fragmentShader.indexOf('#include <lights_fragment_end>') < 0) return; sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n' + SSS_GLSL); }
  function inject(sh, k, toon, hp) {
    if (!toon) { animePatch(sh); sssPatch(sh); }
    sh.uniforms.uFill = u; if (hp) sh.uniforms.uHeadK = hk; if (toon) { sh.uniforms.uEnvA = ea; sh.uniforms.uKneeOff = ko; }
    if (toon) sh.fragmentShader = sh.fragmentShader.replace('float _s = clamp(_t / _ex, 0.0, 1.3);', 'float _s = clamp(_t / _ex, 0.0, 1.3); if (uKneeOff > 1.001) { float _t2 = _ex <= 1.0 ? _ex : 1.0 + (uKneeOff - 1.0) * (1.0 - exp((1.0 - _ex) / (uKneeOff - 1.0))); _s = _t2 / _ex; }');
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', (toon ? 'uniform vec3 uEnvA; uniform float uKneeOff;\n' : '') + (hp ? 'uniform float uHeadK;\n' : '') + 'uniform float uFill;\nvoid main() {')
      .replace('#include <lights_physical_fragment>', hp ? 'diffuseColor.rgb *= uHeadK;\n#include <lights_physical_fragment>' : '#include <lights_physical_fragment>')
      .replace('#include <aomap_fragment>', `${toon ? 'reflectedLight.indirectDiffuse += uEnvA * ' + k.toFixed(2) + ' * diffuseColor.rgb;' : ''}
      #include <aomap_fragment>
      { vec3 litC = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse; float al = max(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)), 1e-3) * 0.3183; // 与上面软膝盖同单位：满光≈1.08
        float lr = dot(litC, vec3(0.299, 0.587, 0.114)) / al; float fc = clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
        totalEmissiveRadiance += diffuseColor.rgb * 0.3183 * max(0.0, uFill * ${k.toFixed(2)} - lr) * (0.45 + 0.55 * fc); }`);
  }
  const HPBR_OBC = function (sh) { animePatch(sh); sssPatch(sh); sh.uniforms.uHeadK = hk; sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform float uHeadK;\nvoid main() {').replace('#include <lights_physical_fragment>', 'diffuseColor.rgb *= uHeadK;\n#include <lights_physical_fragment>'); }; // R33：head_pbr 头材质的默认注入（hair/skin 自带 onBeforeCompile 的由 wrap 注入同一句）
  function wrap(m, k) { // 包一层 onBeforeCompile（clone() 不会复制它：克隆后要重新包）
    if (!m || !(m.isMeshToonMaterial || (m.isMeshStandardMaterial && window.Mods && Mods.on('char_lift'))) || done.has(m)) return m; /* R29 char_lift：身体默认是 PBR 标准材质（foe_toon 关）→ 以前完全没补光，洞里发黑 */ const prev = m.customProgramCacheKey(), o = m.onBeforeCompile;
    const toon = !!m.isMeshToonMaterial, hp = !!(m.userData && m.userData.hpbr) && o !== HPBR_OBC; m.onBeforeCompile = function (sh, r) { o.call(this, sh, r); inject(sh, k, toon, hp); }; m.customProgramCacheKey = () => prev + '|ff' + k + (toon ? 'e' : '') + (hp ? 'h' : '') + (animeOn() ? 'A' : '') + (sssOn() ? 'S' : ''); done.add(m); return m;
  }
  return { u, wrap, tune, hk, HPBR_OBC, animeOn, sssOn, world() { worldT = performance.now(); }, env(c) { if (c) envA.copy(c).multiplyScalar(0.55); else envA.setRGB(0, 0, 0); } };
})();
window.ModelHeads = (() => {
  const T = [];               // templates
  const SRC = new WeakMap();  // mesh -> src material（不要放 userData，clone 会 JSON 序列化贴图）
  let ready = false;
  const V3 = THREE.Vector3;
  let stencilSeq = 0;
  const GT = { value: 0 }; // 全局时间（异色流光 / 魂火眼）

  // ---------- 调色板 ----------
  const HAIR = [
    ['乌黑', '#1b1a20'], ['墨蓝', '#1f2c4e'], ['深褐', '#3b2418'], ['栗棕', '#6a3a24'], ['蜜糖金', '#d9a54a'], ['亚麻金', '#e8d6a0'],
    ['铂金', '#f3ecd6'], ['银白', '#d6dae6'], ['雪白', '#f7f7fa'], ['灰烬', '#77777e'], ['火红', '#cc321e'], ['酒红', '#7a1a2c'],
    ['橘铜', '#c4622a'], ['樱粉', '#f2a2ba'], ['玫瑰', '#d24a7c'], ['薰衣紫', '#a484d4'], ['夜紫', '#4a2a6c'], ['冰蓝', '#9cd2f2'],
    ['湖蓝', '#3a7cc2'], ['翠绿', '#3a9a5c'], ['薄荷', '#8cdac2'], ['墨绿', '#1f4a36'], ['血红', '#8c0c12'], ['月银蓝', '#b8c8ea'],
    ['焦糖', '#9a5a2e'], ['紫丁香', '#c8a2e0'], ['锈红', '#9a3a22'], ['青灰', '#5a6a78'], ['奶茶', '#c8a88a'], ['黑紫', '#2a1a34']
  ];
  const EYE = [
    ['琥珀', '#d99a2a'], ['翡翠', '#2aa86a'], ['冰蓝', '#7cc6f0'], ['深蓝', '#2a4ab0'], ['紫罗兰', '#8a4ad0'], ['血红', '#c01a1a'],
    ['金', '#f0c83a'], ['灰', '#8a8a94'], ['黑曜', '#2a2228'], ['粉晶', '#f08ab0'], ['青碧', '#2ab0b0'], ['榛褐', '#8a5a2a'],
    ['银', '#c8ccd8'], ['橙', '#f07a2a'], ['海绿', '#3a8a8a'], ['苍紫', '#b09ad8']
  ];
  const SKIN = {
    '瓷白': '#fff5f0', '象牙': '#ffe9dc', '蜜色': '#f2cca6', '小麦': '#dcac7c', '古铜': '#b27a52', '深棕': '#7c4c32',
    '灰紫': '#a8a0c4', '暗青': '#7e86a4', '淡紫': '#e0c4ea', '苍白': '#e8e8ec', '赤红': '#e89a8a', '青灰': '#a8b4b0'
  };

  const grad = (() => { const d = new Uint8Array(window.Mods && Mods.on('char_lift') ? [165, 208, 240, 255] : [120, 190, 235, 255]); /* R29 char_lift：洞里角色暗部别发黑（头身同一条色阶） */ const t = new THREE.DataTexture(d, 4, 1, THREE.RedFormat); const sm = !!(window.Mods && Mods.on('smooth_faces')); t.minFilter = t.magFilter = sm ? THREE.LinearFilter : THREE.NearestFilter; t.needsUpdate = true; return t; })();

  // R33 MOD head_pbr：头的材质由卡通（MeshToon，不吃环境光/天空、无高光，只有 4 级色阶）改为与身体同类的 PBR 标准材质（同一套灯光、环境图、envMapIntensity 0.55、同一条响应曲线）。
  // 所有着色器注入（染发/肤色/血迹/FaceFill…）用的都是两种材质共有的 #include 锚点，无需改动。关 MOD = 老卡通头。
  function MTM(p) {
    if (window.Mods && !Mods.on('head_pbr')) return new THREE.MeshToonMaterial(p);
    const q = Object.assign({}, p); delete q.gradientMap; if (q.roughness == null) q.roughness = 0.88; if (q.metalness == null) q.metalness = 0;
    const m = new THREE.MeshStandardMaterial(q); m.envMapIntensity = 0.55; m.userData.hpbr = 1; m.onBeforeCompile = FaceFill.HPBR_OBC; m.customProgramCacheKey = () => 'hpbr1' + (FaceFill.animeOn() ? 'A' : '') + (FaceFill.sssOn() ? 'S' : ''); return m;
  }
  function b64ToBuf(b64) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }

  function avgLum(tex) {
    try {
      const img = tex && tex.image; if (!img) return 0.6;
      const c = document.createElement('canvas'); c.width = c.height = 24; const g = c.getContext('2d');
      g.drawImage(img, 0, 0, 24, 24); const d = g.getImageData(0, 0, 24, 24).data;
      let s = 0, w = 0; for (let i = 0; i < d.length; i += 4) { const a = d[i + 3] / 255; if (a < 0.3) continue; s += (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255 * a; w += a; }
      return w > 0 ? Math.max(0.15, s / w) : 0.6;
    } catch (e) { return 0.6; }
  }
  function skinColorFix(tex) {
    try {
      const img = tex && tex.image; if (!img) return 0;
      const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, 32, 32); const d = g.getImageData(0, 0, 32, 32).data; let r = 0, gg = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 64) continue; r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
      if (!n) return 0; r /= n; gg /= n; b /= n; const sum = Math.max(1, r + gg + b);
      // 只轻度压低贴图本身的青绿偏色；有意设置的幻想肤色仍由 uSkin 保留。
      return THREE.MathUtils.clamp(2.2 * Math.max(0, gg - r) / sum + 1.3 * Math.max(0, b - r) / sum, 0, 1.0);
    } catch (e) { return 0; }
  }
  function softenSkinNormals(geo) {
    const p = geo.attributes.position, n = geo.attributes.normal; if (!p || !n) return;
    const bins = new Map(), keys = new Array(p.count);
    for (let i = 0; i < p.count; i++) {
      const k = Math.round(p.getX(i) * 1e5) + ',' + Math.round(p.getY(i) * 1e5) + ',' + Math.round(p.getZ(i) * 1e5); keys[i] = k;
      let a = bins.get(k); if (!a) bins.set(k, a = [0, 0, 0]); a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i);
    }
    for (let i = 0; i < p.count; i++) { const a = bins.get(keys[i]), l = Math.hypot(a[0], a[1], a[2]); if (l > 1e-6) n.setXYZ(i, a[0] / l, a[1] / l, a[2] / l); }
    n.needsUpdate = true;
  }

  function kindOf(mesh, matName, meta) {
    if (matName === '__CUT__') return 'cut';
    if (meta.hair.includes(mesh.name) || /HAIR/i.test(matName) || matName === 'hair') return 'hair';
    if (/Highlight|eye_trans|EyeExtra/i.test(matName)) return 'hl';
    if (/Iris/i.test(matName) || matName === 'eye') return 'iris';
    if (/Brow/i.test(matName)) return 'brow';
    if (/SKIN|^Face$|^Body$|body_bake/i.test(matName)) return 'skin';
    return 'other';
  }

  // ---------- 第二十二轮：五官形变（look.fm）——眼睛大小/宽窄/吊垂/间距/高低 + 眉高/眉倾 + 脸型缩放 ----------
  // VRoid 的眼/眉是浮在脸皮上的独立网格：只对这些网格做顶点形变，与脸皮不冲突；每个头一份材质（uniform 各不相同），着色器程序共享。
  function eyeCentres(meshes) {
    const ir = meshes.filter(m => m.userData.kind === 'iris'); if (!ir.length) return null;
    let sx = 0, n = 0; for (const m of ir) { const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { sx += p.getX(i); n++; } } if (!n) return null; const mid = sx / n;
    const L = [0, 0, 0, 0], R = [0, 0, 0, 0];
    for (const m of ir) { const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const T = p.getX(i) >= mid ? R : L; T[0] += p.getX(i); T[1] += p.getY(i); T[2] += p.getZ(i); T[3]++; } }
    if (!L[3] || !R[3]) return null;
    return { mid, l: [L[0] / L[3], L[1] / L[3], L[2] / L[3]], r: [R[0] / R[3], R[1] / R[3], R[2] / R[3]] };
  }
  const FW_GLSL = 'if (uFB.z > 0.5) { bool rt = transformed.x >= uFM; vec3 C = rt ? uFR : uFL; float sg = rt ? 1.0 : -1.0; vec2 d0 = transformed.xy - C.xy; float w = 1.0; if (uFB.w > 0.0) w = 1.0 - smoothstep(uFB.w * 0.4, uFB.w, length(d0 * vec2(1.0, 1.1))); vec2 d = d0 * uFA.xy; float a = uFA.z * sg; float ca = cos(a), sa = sin(a); d = vec2(ca * d.x - sa * d.y, sa * d.x + ca * d.y); transformed.xy = mix(transformed.xy, C.xy + d + vec2(uFB.x * sg, uFB.y), w); }';
  function fwWrap(mat, A, B, ec, fall) {
    const old = mat.onBeforeCompile, oldKey = mat.customProgramCacheKey ? mat.customProgramCacheKey() : '';
    const U = { uFA: { value: new THREE.Vector4(A[0], A[1], A[2], 0) }, uFB: { value: new THREE.Vector4(B[0], B[1], 1, fall || 0) }, uFL: { value: new V3(ec.l[0], ec.l[1], ec.l[2]) }, uFR: { value: new V3(ec.r[0], ec.r[1], ec.r[2]) }, uFM: { value: ec.mid } };
    mat.onBeforeCompile = function (sh, r) { if (old) old.call(mat, sh, r); Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('void main() {', 'uniform vec4 uFA; uniform vec4 uFB; uniform vec3 uFL; uniform vec3 uFR; uniform float uFM;\nvoid main() {').replace('#include <morphtarget_vertex>', '#include <morphtarget_vertex>\n' + FW_GLSL); };
    mat.customProgramCacheKey = () => oldKey + '|fw1'; mat.needsUpdate = true; return mat;
  }
  const fwKind = (src, kind) => kind === 'skin' ? (/Face/i.test(src && src.name || '') ? 'skin' : null) : /Brow/i.test(src && src.name || '') || kind === 'brow' ? 'brow' : (kind === 'iris' || kind === 'hl' || /Iris|EyeWhite|Eyeline|Eyelash|Highlight|eye_trans|EyeExtra/i.test(src && src.name || '')) ? 'eye' : null;
  // ---------- 第二十四轮 MOD head_norm：头模尺寸归一 ----------
  // MMD 管线（pmx2vrm → vrm2head --sc 0.75）出来的头比 VRoid 头小约 20%（脸宽 0.116~0.133 vs 0.16），挂到身体上显得特别小。
  // 解析时把几何体（含表情 morph）与元数据一起等比放大到脸宽 0.155；这些 GLB 没有节点变换/蒙皮，放大是安全的。
  const NORM_W = 0.155;
  function normK(entry) {
    if (!(window.Mods && Mods.on('head_norm'))) return 1;
    if (entry.grp !== 'mmd') return 1;
    const w = entry.skinW;
    // 脸宽测不准的（面具等，skinW 过小）用 MMD 组中位比例
    const k = (w && w > 0.09) ? NORM_W / w : 1.2;
    return Math.max(1, Math.min(1.4, k));
  }
  // R30 MOD head_norm2：以前只放大不缩小（1~1.4）且只看脸宽 → 星铁/绝区零/异环/经典 MMD（脸宽≈0.20）成了大头娃娃，脸宽测歪的成了小头/大头怪。
  // 现在：脸宽对标 0.16（VRoid），两眼间距对标 0.16×0.46（MMD 画风眼距/脸宽中位）；两者一致取几何平均，不一致信更接近 1 的那个（面具/狐耳撑大脸宽时信眼距）；可缩可放 0.5~1.5；分歧时用包围盒高裁决。
  function irisIPD(meshes) {
    const v = new THREE.Vector3(); let lx = 0, ln = 0, rx = 0, rn = 0;
    for (const m of meshes) { const mt = [].concat(m.material)[0]; if (!mt || !/Iris/i.test(mt.name || '')) continue;
      m.updateWorldMatrix(true, false); const p = m.geometry.attributes.position; if (!p) continue; const st = Math.max(1, Math.floor(p.count / 400));
      for (let i = 0; i < p.count; i += st) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); if (v.x > 0) { lx += v.x; ln++; } else { rx += v.x; rn++; } } }
    if (ln < 3 || rn < 3) return 0; const d = lx / ln - rx / rn; return d > 0.02 && d < 0.3 ? d : 0;
  }
  function normK2(entry, meshes) {
    if (entry.grp !== 'mmd') return 1;
    const w = entry.skinW, ipd = irisIPD(meshes);
    const kw = w && w > 0.06 && w < 0.5 ? 0.16 / w : 0, ki = ipd ? 0.16 * 0.46 / ipd : 0;
    // 第三指标（只做裁决）：整颗头含头发的包围盒高，对标 VRoid 中位 0.316——发量会让它偏，但足够在前两者之间二选一
    const bh = Array.isArray(entry.box) ? entry.box[1][1] - entry.box[0][1] : 0, kb = bh > 0.05 ? 0.316 / bh : 0;
    const near = (a, b) => !kb ? (Math.abs(Math.log(a)) < Math.abs(Math.log(b)) ? a : b) : (Math.abs(Math.log(a / kb)) < Math.abs(Math.log(b / kb)) ? a : b);
    let k;
    if (kw && ki) k = Math.abs(Math.log(kw / ki)) < 0.25 ? Math.sqrt(kw * ki) : near(kw, ki);
    else { k = kw || ki || kb || 1; if (kb && Math.abs(Math.log(k / kb)) > 0.5) k = kb; }
    entry._normW = w; entry._normIPD = ipd; entry._normKB = kb;
    k = Math.max(0.5, Math.min(1.5, k));
    // R33 MOD head_norm3：脸宽对齐之后，MMD 的发量/发饰/兽耳让整颗头的轮廓仍比 VRoid 大一圈（包围盒高 0.36~0.49 vs 0.316）→ 看起来还是“大头”。
    // 整体再缩 5%；含头发包围盒仍超过 VRoid 中位的，按平方根比例再收（下限 0.82），发量越夸张收得越多。
    if (!window.Mods || Mods.on('head_norm3')) { const bn = bh * k; let k3 = 0.95; if (bn > 0.316) k3 *= Math.max(0.82, Math.sqrt(0.316 / bn)); k = Math.max(0.45, k * k3); entry._normK3 = k3; }
    return k;
  }
  function normSize(entry, meshes) {
    const k = (window.Mods && Mods.on('head_norm2')) ? normK2(entry, meshes) : normK(entry); entry._normK = k; if (Math.abs(k - 1) < 0.01) return;
    const done = new Set();
    for (const m of meshes) {
      const g = m.geometry; if (!g || done.has(g)) continue; done.add(g);
      g.scale(k, k, k);
      const mp = g.morphAttributes && g.morphAttributes.position; if (mp) for (const a of mp) { for (let i = 0; i < a.array.length; i++) a.array[i] *= k; a.needsUpdate = true; }
      g.computeBoundingBox(); g.computeBoundingSphere();
    }
    const sc = v => (typeof v === 'number' ? v * k : v);
    if (entry.cut) for (const kk of ['x', 'y', 'z', 'r']) if (typeof entry.cut[kk] === 'number') entry.cut[kk] *= k;
    for (const kk of ['bottom', 'skullTop', 'hairTop', 'front', 'skinW']) entry[kk] = sc(entry[kk]);
    if (Array.isArray(entry.eye)) entry.eye = entry.eye.map(sc);
    if (Array.isArray(entry.box)) entry.box = entry.box.map(b => b.map(sc));
  }

  function parseOne(entry) {
    return new Promise((res) => {
      try {
        new THREE.GLTFLoader().parse(b64ToBuf(entry.glb), '', (gltf) => {
          entry.glb = null;
          const meshes = [];
          gltf.scene.traverse(o => { if (o.isMesh && !(entry.skip || []).includes(o.name)) meshes.push(o); });
          normSize(entry, meshes); // 第二十四轮 MOD head_norm：MMD 头按脸宽归一到 VRoid 标准，不再“头小身大”
          const lum = new Map(), greenFixes = new Map(), textureLums = new Map();
          const greenFixFor = src => { if (!greenFixes.has(src)) greenFixes.set(src, skinColorFix(src.map)); return greenFixes.get(src); };
          const textureLumFor = src => { if (!textureLums.has(src)) textureLums.set(src, avgLum(src.map)); return textureLums.get(src); };
          meshes.forEach(m => {
            const src = m.material; const nm = src.name || '';
            SRC.set(m, src);
            // 第十二轮：部分 VRoid 导出的眼部三角形绕序相反（MToon _CullMode=0 未体现在 glTF 里），单面会被整块剔除 → 空眼窝。眼/眉一律双面。
            if (/Eye|Iris|Brow|Lash|Highlight/i.test(nm)) src.side = THREE.DoubleSide;
            m.userData.kind = kindOf(m, nm, entry);
            // 有些 VRoid 将脸/下颌的绿色皮肤贴图导出成无材质名的普通网格；用大面积、亮度足够的绿偏贴图补识别，避开暗色眼线/瞳孔。
            if (m.userData.kind === 'other' && !nm && src.map && m.geometry.attributes.position && m.geometry.attributes.position.count >= 320) {
              const bias = greenFixFor(src); if (bias > 0.55 && textureLumFor(src) > 0.32) m.userData.kind = 'skin';
            }
            if (m.userData.kind === 'skin') {
              if (window.Mods && Mods.on('head_repair')) {
                src.userData._headGreenFix = greenFixFor(src);
                src.side = THREE.DoubleSide; // 背颈薄面不因单面绕序/剔除而漏光
              }
              if (window.Mods && Mods.on('smooth_faces')) softenSkinNormals(m.geometry); // 模板解析期仅预处理一次，保留共享几何体，避免每个皮肤网格多占一份内存
            }
            if (m.userData.kind === 'cut') fixCutUV(m.geometry);
            m.renderOrder = /Highlight/i.test(nm) ? 4 : /Iris/i.test(nm) ? 3 : /Eyeline|Eyelash|Brow/i.test(nm) ? 3 : /EyeWhite/i.test(nm) ? 2 : 0;
            if ((m.userData.kind === 'hair' || m.userData.kind === 'iris' || m.userData.kind === 'brow') && !lum.has(src)) lum.set(src, avgLum(src.map));
            m.geometry.computeBoundingSphere();
          });
          try { if (window.Mods && Mods.on('head_repair')) fitCut(meshes, entry); else fitCutLegacy(meshes, entry); } catch (e) { console.warn('fitCut', entry.file, e); }
          const hairMeshes = meshes.filter(m => m.userData.kind === 'hair');
          let hairMinY = 0; hairMeshes.forEach(m => { m.geometry.computeBoundingBox(); hairMinY = Math.min(hairMinY, m.geometry.boundingBox.min.y); });
          let eyeC = null; try { eyeC = eyeCentres(meshes); } catch (e) { }
          T.push({ eyeC, meta: entry, meshes, hairMeshes, faceMeshes: meshes.filter(m => m.userData.kind !== 'hair'), lum, hairMinY, shared: new Map() });
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
    ready = T.length > 0;
    return ready;
  }

  // 断面修复（MOD head_repair）：切面高度以模型元数据 bottom 为准，不再平均原圆片的翘起顶点；
  // 从切平面上的真实皮肤顶点取凸轮廓并三角化，避免 48 段圆扇与颈部错位/留缝。
  function fitCut(meshes, entry) {
    const cut = meshes.find(m => m.userData.kind === 'cut'); if (!cut) return;
    cut.updateMatrixWorld(true); const toCut = cut.matrixWorld.clone().invert(), v = new THREE.Vector3();
    const cp = cut.geometry.attributes.position;
    let plane = Number.isFinite(entry.bottom) ? entry.bottom : (entry.cut && Number.isFinite(entry.cut.y) ? entry.cut.y : NaN);
    if (!Number.isFinite(plane)) { for (let i = 0; i < cp.count; i++) { v.fromBufferAttribute(cp, i).applyMatrix4(cut.matrixWorld); plane = (Number.isFinite(plane) ? plane : 0) + v.y / cp.count; } }
    const ly = new THREE.Vector3(0, plane, 0).applyMatrix4(toCut).y;
    const expected = new THREE.Vector3(entry.cut && entry.cut.x || 0, plane, entry.cut && entry.cut.z || 0).applyMatrix4(toCut);
    const r0 = entry.cut && entry.cut.r || 0.03, maxR = Math.min(0.12, Math.max(0.075, r0 * 2.5 + 0.01));
    const gather = tol => {
      const out = new Map();
      for (const m of meshes) {
        if (m.userData.kind !== 'skin') continue;
        m.updateMatrixWorld(true); const p = m.geometry.attributes.position; if (!p) continue;
        for (let i = 0; i < p.count; i++) {
          v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
          if (Math.abs(v.y - plane) > tol) continue;
          const q = v.clone().applyMatrix4(toCut), dx = q.x - expected.x, dz = q.z - expected.z;
          if (dx * dx + dz * dz > maxR * maxR) continue;
          out.set(Math.round(q.x * 1e5) + ',' + Math.round(q.z * 1e5), { x: q.x, z: q.z });
        }
      }
      return Array.from(out.values());
    };
    let pts = gather(0.0008); if (pts.length < 8) pts = gather(0.0035);
    // R37：部分模型颈圈只有半圈皮肤顶点（后半是空的）→ 凸包成了 D 形半圆盘，断面盖不住颈口、露出里面的皮肤碎片。
    // 最小二乘拟合圆；若点在圆周上的最大空缺 > 100°，就在空缺处补上圆周点再求凸包。
    entry._cutDbg = { n: pts.length, gap: 0, R: 0, filled: false };
    if (pts.length >= 8) try {
      let mx = 0, mz = 0; pts.forEach(p => { mx += p.x; mz += p.z; }); mx /= pts.length; mz /= pts.length;
      let Sxx = 0, Sxz = 0, Szz = 0, Sxr = 0, Szr = 0; pts.forEach(p => { const x = p.x - mx, z = p.z - mz, r2 = x * x + z * z; Sxx += x * x; Sxz += x * z; Szz += z * z; Sxr += x * r2; Szr += z * r2; });
      const det = Sxx * Szz - Sxz * Sxz;
      if (Math.abs(det) > 1e-14) {
        const ux = (Sxr * Szz - Szr * Sxz) / (2 * det), uz = (Szr * Sxx - Sxr * Sxz) / (2 * det);
        const fx = mx + ux, fz = mz + uz; let R = 0; pts.forEach(p => R += Math.hypot(p.x - fx, p.z - fz)); R /= pts.length;
        const ang = pts.map(p => Math.atan2(p.z - fz, p.x - fx)).sort((a, b) => a - b); let gap = 0, g0 = 0;
        for (let i = 0; i < ang.length; i++) { const nx = i + 1 < ang.length ? ang[i + 1] : ang[0] + Math.PI * 2, d = nx - ang[i]; if (d > gap) { gap = d; g0 = ang[i]; } }
        entry._cutDbg.gap = Math.round(gap * 180 / Math.PI); entry._cutDbg.R = +R.toFixed(4);
        if (gap > 1.75 && R > 0.012 && R < maxR) { const K = Math.ceil(gap / (Math.PI / 18)); for (let k = 1; k < K; k++) { const a = g0 + gap * k / K; pts.push({ x: fx + Math.cos(a) * R, z: fz + Math.sin(a) * R }); } entry._cutDbg.filled = true; }
      }
    } catch (e) { console.warn('cut circle fit', e); }
    let hull = [];
    if (pts.length >= 8) {
      pts.sort((a, b) => a.x - b.x || a.z - b.z);
      const turn = (a, b, c) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
      const lo = [], hi = [];
      for (const p of pts) { while (lo.length > 1 && turn(lo[lo.length - 2], lo[lo.length - 1], p) <= 1e-12) lo.pop(); lo.push(p); }
      for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (hi.length > 1 && turn(hi[hi.length - 2], hi[hi.length - 1], p) <= 1e-12) hi.pop(); hi.push(p); }
      hull = lo.slice(0, -1).concat(hi.slice(0, -1));
    }
    entry._cutDbg.r0 = r0; entry._cutDbg.ex = +expected.x.toFixed(4); entry._cutDbg.ez = +expected.z.toFixed(4); entry._cutDbg.pb = pts.length ? [Math.min(...pts.map(p => p.x)), Math.max(...pts.map(p => p.x)), Math.min(...pts.map(p => p.z)), Math.max(...pts.map(p => p.z))].map(v => +v.toFixed(3)) : null; entry._cutDbg.hull = hull.length;
    let g = null, cx = expected.x, cz = expected.z, meanR = r0;
    if (hull.length >= 6) {
      const contour = hull.map(p => new THREE.Vector2(p.x, p.z));
      const faces = THREE.ShapeUtils.triangulateShape(contour, []);
      if (faces && faces.length) {
        let a2 = 0, sx = 0, sz = 0;
        for (let i = 0; i < hull.length; i++) { const a = hull[i], b = hull[(i + 1) % hull.length], k = a.x * b.z - b.x * a.z; a2 += k; sx += (a.x + b.x) * k; sz += (a.z + b.z) * k; }
        if (Math.abs(a2) > 1e-8) { cx = sx / (3 * a2); cz = sz / (3 * a2); }
        // R37：凸包必须“像个颈口”——面积接近原断面圆盘、且近似圆形；否则（点里混入下巴/衣领顶点 → 楔形/扇形断面）退回原圆盘（压到切平面）
        const area = Math.abs(a2) / 2; let rr = 0; hull.forEach(p => rr += Math.hypot(p.x - cx, p.z - cz)); rr /= hull.length;
        const k0 = area / (Math.PI * r0 * r0), kr = area / (Math.PI * rr * rr); entry._cutDbg.ar = [+k0.toFixed(2), +kr.toFixed(2)];
        const bad = k0 < 0.2 || k0 > 2.2 || kr < 0.87; entry._cutDbg.bad = bad;
        if (!bad) {
        const pos = new Float32Array(hull.length * 3), nor = new Float32Array(hull.length * 3), ids = [];
        let rs = 0;
        for (let i = 0; i < hull.length; i++) { const x = cx + (hull[i].x - cx) * 1.002, z = cz + (hull[i].z - cz) * 1.002; pos[i * 3] = x; pos[i * 3 + 1] = ly; pos[i * 3 + 2] = z; nor[i * 3 + 1] = -1; rs += Math.hypot(x - cx, z - cz); }
        faces.forEach(f => ids.push(f[0], f[1], f[2]));
        g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setIndex(ids); meanR = rs / hull.length; }
      }
    }
    if (!g) {
      // 极少数缺少颈圈采样点的旧模型：保留原始封盖轮廓，但强制压回真实切平面。
      g = cut.geometry.clone(); const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setY(i, ly);
      p.needsUpdate = true; const n = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) n[i * 3 + 1] = -1;
      g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
    }
    cut.geometry.dispose(); cut.geometry = g; fixCutUV(g); g.computeBoundingBox(); g.computeBoundingSphere();
    if (entry.cut) {
      const worldC = new THREE.Vector3(cx, ly, cz).applyMatrix4(cut.matrixWorld);
      entry.cut.r0 = entry.cut.r0 || entry.cut.r; entry.cut.r = meanR; entry.cut.x = worldC.x; entry.cut.y = plane; entry.cut.z = worldC.z;
    }
  }
  function fitCutLegacy(meshes, entry) {
    const cut = meshes.find(m => m.userData.kind === 'cut'); if (!cut) return;
    cut.updateMatrixWorld(true); const cp = cut.geometry.attributes.position, toCut = cut.matrixWorld.clone().invert();
    let cy = 0, cx = 0, cz = 0; const v = new THREE.Vector3();
    for (let i = 0; i < cp.count; i++) { v.fromBufferAttribute(cp, i).applyMatrix4(cut.matrixWorld); cy += v.y; } cy /= cp.count;
    const gather = () => { const pts = []; for (const m of meshes) { if (m.userData.kind !== 'skin') continue; m.updateMatrixWorld(true); const p = m.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); if (Math.abs(v.y - cy) < 0.004) pts.push(v.clone().applyMatrix4(toCut)); } } return pts; };
    const pts = gather(); if (pts.length < 16) return;
    pts.forEach(q => { cx += q.x; cz += q.z; }); cx /= pts.length; cz /= pts.length;
    const NB = 48, R = new Array(NB).fill(0);
    for (const q of pts) { const a = Math.atan2(q.z - cz, q.x - cx), b = ((Math.floor((a + Math.PI) / (Math.PI * 2) * NB) % NB) + NB) % NB; R[b] = Math.max(R[b], Math.hypot(q.x - cx, q.z - cz)); }
    if (R.filter(r => r > 0).length < NB * 0.5) return;
    for (let b = 0; b < NB; b++) if (!R[b]) { let l = b, r = b; while (!R[(l + NB) % NB]) l--; while (!R[r % NB]) r++; const a = R[(l + NB) % NB], c = R[r % NB]; R[b] = a + (c - a) * (b - l) / (r - l); }
    const Rs = R.map((r, b) => { const a = [R[(b + NB - 1) % NB], r, R[(b + 1) % NB]].sort((x, y) => x - y); return a[1] * 0.99; });
    const ly = new THREE.Vector3(0, cy, 0).applyMatrix4(toCut).y, pos = [cx, ly, cz], idx = [];
    for (let b = 0; b < NB; b++) { const a = (b + 0.5) / NB * Math.PI * 2 - Math.PI; pos.push(cx + Math.cos(a) * Rs[b], ly, cz + Math.sin(a) * Rs[b]); }
    for (let b = 0; b < NB; b++) idx.push(0, 1 + (b + 1) % NB, 1 + b);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const n = new Float32Array(pos.length); for (let i = 0; i < n.length; i += 3) n[i + 1] = -1; g.setAttribute('normal', new THREE.BufferAttribute(n, 3)); g.setIndex(idx);
    cut.geometry.dispose(); cut.geometry = g; fixCutUV(g);
    const mean = Rs.reduce((s, r) => s + r, 0) / NB;
    if (entry.cut) { entry.cut.r0 = entry.cut.r; entry.cut.r = Math.min(entry.cut.r || mean, mean); entry.cut.x = cx; entry.cut.z = cz; }
  }

  // ---------- 断面材质（黑暗奇幻：皮、肉、颈椎、气管） ----------
  let cutMat = null;
  // 断面 UV 按实际几何重新映射（部分模型转换时按错误半径算 UV，导致整个断面落在外圈肤色区）
  function fixCutUV(geo) {
    const p = geo.attributes.position; if (!p) return;
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; let R = 1e-5;
    for (let i = 0; i < p.count; i++) R = Math.max(R, Math.hypot(p.getX(i) - cx, p.getZ(i) - cz));
    const uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) { uv[i * 2] = 0.5 + (p.getX(i) - cx) / (2 * R) * 0.96; uv[i * 2 + 1] = 0.5 + (p.getZ(i) - cz) / (2 * R) * 0.96; }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
  function getCut() {
    if (cutMat) return cutMat;
    if (window.Mods && Mods.on('head_repair') && window.Assets) {
      const t = Assets.tex('cut_wagyu');
      if (t && t.diff) {
        cutMat = new THREE.MeshStandardMaterial({ map: t.diff, normalMap: t.nor || null, roughnessMap: t.rough || null, roughness: 0.82, metalness: 0, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, name: '__CUT__ CC0 PBR' });
        cutMat.normalScale.set(0.42, 0.42); return cutMat;
      }
    }
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    const rg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    rg.addColorStop(0, '#6a0710'); rg.addColorStop(0.55, '#8e0f1a'); rg.addColorStop(0.8, '#b0303a'); rg.addColorStop(0.9, '#e8b8a0'); rg.addColorStop(1, '#f0c8b0');
    g.fillStyle = rg; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 900; i++) { const a = Math.random() * 6.283, r = Math.random() * S * 0.42; g.fillStyle = `rgba(${40 + Math.random() * 90},0,${Math.random() * 10},${0.15 + Math.random() * 0.3})`; g.beginPath(); g.arc(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r, 1 + Math.random() * 4, 0, 6.283); g.fill(); }
    // 肌肉纹理
    g.strokeStyle = 'rgba(200,60,70,0.35)'; g.lineWidth = 1.5;
    for (let i = 0; i < 40; i++) { const a = Math.random() * 6.283; g.beginPath(); g.moveTo(S / 2 + Math.cos(a) * 30, S / 2 + Math.sin(a) * 30); g.lineTo(S / 2 + Math.cos(a + 0.2) * 105, S / 2 + Math.sin(a + 0.2) * 105); g.stroke(); }
    // 颈椎（靠后）
    g.fillStyle = '#efe6d2'; g.beginPath(); g.ellipse(S / 2, S / 2 + 38, 24, 20, 0, 0, 6.283); g.fill();
    g.fillStyle = '#d8c9a8'; g.beginPath(); g.ellipse(S / 2, S / 2 + 38, 15, 12, 0, 0, 6.283); g.fill();
    g.fillStyle = '#c84a4a'; g.beginPath(); g.ellipse(S / 2, S / 2 + 38, 7, 6, 0, 0, 6.283); g.fill();
    // 气管（靠前）
    g.fillStyle = '#e8b0a8'; g.beginPath(); g.ellipse(S / 2, S / 2 - 40, 16, 13, 0, 0, 6.283); g.fill();
    g.fillStyle = '#2a0406'; g.beginPath(); g.ellipse(S / 2, S / 2 - 40, 10, 8, 0, 0, 6.283); g.fill();
    // 血光
    for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(255,90,90,0.25)'; g.beginPath(); g.arc(Math.random() * S, Math.random() * S, 1 + Math.random() * 2, 0, 6.283); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    cutMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.28, metalness: 0.05, bumpMap: t, bumpScale: 0.004, name: '__CUT__', side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    return cutMat;
  }

  // ---------- 着色器注入 ----------
  const NOISE = `
  float hh3(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float vn3(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(hh3(i),hh3(i+vec3(1,0,0)),f.x),mix(hh3(i+vec3(0,1,0)),hh3(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hh3(i+vec3(0,0,1)),hh3(i+vec3(1,0,1)),f.x),mix(hh3(i+vec3(0,1,1)),hh3(i+vec3(1,1,1)),f.x),f.y),f.z); }`;

  // 卡通材质的柔性光照压缩：篝火点光源会把首级（尤其深色头发）直接冲成白色——这是画面“廉价感”的主因。
  // 对有效光照倍数做 1-exp 软膝盖（≈1.08 封顶），暗处略提亮；只影响 MeshToonMaterial（首级/头饰），不影响洞穴与建筑。
  if (THREE.ShaderLib.toon && !THREE.ShaderLib.toon.__soft) {
    THREE.ShaderLib.toon.fragmentShader = THREE.ShaderLib.toon.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
    { vec3 _dl = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse; float _lk = dot(_dl, vec3(0.299, 0.587, 0.114)); float _lr = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)) * 0.3183 + 1e-4; float _ex = _lk / _lr;
      if (_ex > 1e-4) { float _t = (1.0 - exp(-_ex * 1.2)) * 1.08; float _s = clamp(_t / _ex, 0.0, 1.3); reflectedLight.directDiffuse *= _s; reflectedLight.indirectDiffuse *= _s; } }`);
    THREE.ShaderLib.toon.__soft = 1;
  }
  const BRZ = (!window.Mods || Mods.on('breeze')) ? '1.0' : '0.0';
  function injectVertex(sh, sway) {
    sh.vertexShader = sh.vertexShader
      .replace('void main() {', `varying vec3 vHP;\n${sway ? 'uniform vec3 uSway; uniform float uHTop; uniform float uHLen; uniform float uT; uniform float uPh;' : ''}\nvoid main() {`)
      .replace('#include <morphtarget_vertex>', `#include <morphtarget_vertex>\n${sway ? 'float sw = clamp((uHTop - transformed.y) / uHLen, 0.0, 1.0); sw = sw * sw * (0.4 + 0.6 * clamp(length(transformed.xz) * 12.0, 0.0, 1.0)); vec3 hs = uSway; hs.x *= 0.72; hs.z *= 0.28; hs += ' + BRZ + ' * vec3(sin(uT * 1.15 + uPh + transformed.y * 28.0) * 0.0042 + sin(uT * 2.6 + uPh * 1.7 + transformed.x * 35.0) * 0.0016, sin(uT * 1.7 + uPh) * 0.0008, cos(uT * 0.93 + uPh * 0.6 + transformed.y * 22.0) * 0.0032); transformed += hs * sw;' : ''}\nvHP = transformed;`);
  }

  function hairMat(src, U, lum) {
    const m = new MTM({ map: src.map || null, gradientMap: grad, transparent: src.transparent, alphaTest: src.alphaTest || (src.transparent ? 0.25 : 0.4), side: THREE.DoubleSide, depthWrite: src.depthWrite });
    m.name = src.name;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { uHC1: U.hc1, uHC2: U.hc2, uGrad: U.grad, uHK: { value: 0.95 / lum }, uSway: U.sway, uHTop: U.hTop, uHLen: U.hLen, uShiny: U.shiny, uT: GT, uPh: U.ph, uHover: U.hover });
      injectVertex(sh, true);
      sh.fragmentShader = sh.fragmentShader
        .replace('void main() {', 'varying vec3 vHP; uniform vec3 uHC1; uniform vec3 uHC2; uniform vec2 uGrad; uniform float uHK; uniform float uShiny; uniform float uT; uniform float uHover;\nvoid main() {')
        .replace('#include <dithering_fragment>', '\n#include <dithering_fragment>\n gl_FragColor.rgb += uHover * (0.1 + 0.6 * pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 2.2)) * vec3(1.0, 0.8, 0.5);')
        .replace('#include <map_fragment>', `#include <map_fragment>
          float l = dot(diffuseColor.rgb, vec3(0.299,0.587,0.114));
          vec3 tc = mix(uHC2, uHC1, smoothstep(uGrad.x, uGrad.y, vHP.y));
          diffuseColor.rgb = clamp(tc * pow(l * uHK, 1.15) * 1.05, 0.0, 1.2);
          if (uShiny > 0.5) { // 异色发：金辉 / 银霜 / 虹彩 / 星空，带流光
            float lk = clamp(pow(l * uHK, 1.1), 0.0, 1.3); vec3 sc;
            if (uShiny < 1.5) sc = mix(vec3(0.42, 0.24, 0.05), vec3(1.0, 0.84, 0.42), lk);
            else if (uShiny < 2.5) sc = mix(vec3(0.38, 0.44, 0.56), vec3(0.96, 0.98, 1.0), lk);
            else if (uShiny < 3.5) sc = (0.55 + 0.45 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + vHP.y * 5.0 + uT * 0.22))) * (0.35 + lk * 0.8);
            else { sc = mix(vec3(0.04, 0.03, 0.16), vec3(0.32, 0.18, 0.72), lk); float st = step(0.992, fract(sin(dot(floor(vHP * 380.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453)); sc += st * (0.55 + 0.45 * sin(uT * 3.0 + vHP.x * 180.0)) * vec3(1.6, 1.5, 1.2); }
            sc += pow(max(0.0, sin(vHP.y * 38.0 - uT * 2.2)), 14.0) * 0.4;
            diffuseColor.rgb = sc;
          }`);
    };
    m.customProgramCacheKey = () => 'hair4';
    return FaceFill.wrap(m, 0.6);
  }
  function browMat(src, U, lum) {
    const m = new MTM({ map: src.map || null, gradientMap: grad, transparent: src.transparent, alphaTest: src.alphaTest, side: src.side, depthWrite: src.depthWrite });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { uHC1: U.hc1, uHK: { value: 0.7 / lum } });
      sh.fragmentShader = sh.fragmentShader
        .replace('void main() {', 'uniform vec3 uHC1; uniform float uHK;\nvoid main() {')
        .replace('#include <map_fragment>', `#include <map_fragment>\n float l = dot(diffuseColor.rgb, vec3(0.299,0.587,0.114)); diffuseColor.rgb = uHC1 * l * uHK * 0.8;`);
    };
    m.customProgramCacheKey = () => 'brow3';
    return m;
  }
  function irisMat(src, U, lum) {
    const m = new MTM({ map: src.map || null, gradientMap: grad, transparent: src.transparent, alphaTest: src.alphaTest, side: src.side, depthWrite: src.depthWrite });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { uEC1: U.ec1, uEC2: U.ec2, uDull: U.dull, uHK: { value: 0.85 / lum }, uGlow: U.glow, uT: GT });
      injectVertex(sh, false);
      sh.fragmentShader = sh.fragmentShader
        .replace('void main() {', 'varying vec3 vHP; uniform vec3 uEC1; uniform vec3 uEC2; uniform float uDull; uniform float uHK; uniform float uGlow; uniform float uT;\nvoid main() {')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += irisC * uGlow * (0.8 + 0.2 * sin(uT * 2.3));')
        .replace('#include <map_fragment>', `#include <map_fragment>
          float l = dot(diffuseColor.rgb, vec3(0.299,0.587,0.114));
          vec3 ec = vHP.x > 0.0 ? uEC1 : uEC2;
          vec3 c = ec * pow(l * uHK, 1.3) * 1.1;
          float g = dot(c, vec3(0.333));
          diffuseColor.rgb = mix(c, vec3(g) * 0.75, uDull) * (1.0 - uDull * 0.35);
          vec3 irisC = ec * pow(l * uHK, 1.6);`);
    };
    m.customProgramCacheKey = () => 'iris3';
    return m;
  }
  function skinMat(src, U) {
    const m = new MTM({ map: src.map || null, color: src.color ? src.color.clone() : new THREE.Color(1, 1, 1), gradientMap: grad, transparent: src.transparent, alphaTest: src.alphaTest, side: src.side, depthWrite: src.depthWrite });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { uMk: U.mk, uHover: U.hover, uSkin: U.skin, uSkinFix: { value: (window.Mods && Mods.on('head_repair') && src.userData ? src.userData._headGreenFix || 0 : 0) }, uPale: U.pale, uBlood: U.blood, uSpat: U.spat, uSeed: U.seed, uCutY: U.cutY, uH: U.hH, uScar: U.scar, uPaint: U.paint, uPaintC: U.paintC, uEye: U.eye });
      injectVertex(sh, false);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <dithering_fragment>', '\n#include <dithering_fragment>\n gl_FragColor.rgb += uHover * (0.1 + 0.6 * pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 2.2)) * vec3(1.0, 0.8, 0.5);')
        .replace('void main() {', `varying vec3 vHP; uniform float uHover; uniform vec3 uMk; uniform vec3 uSkin; uniform float uSkinFix; uniform float uPale; uniform float uBlood; uniform float uSpat; uniform float uSeed; uniform float uCutY; uniform float uH;
          uniform vec4 uScar; uniform float uPaint; uniform vec3 uPaintC; uniform vec3 uEye; ${NOISE}
          float segD(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0); return length(pa-ba*h); }
          void main() {`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          if (vHP.y < uCutY + 0.0012) discard; // 断面以下的皮肤（部分 VRoid 2.x 模型颈部超出切面、盖住断面）一律裁掉
          float _skinY = dot(diffuseColor.rgb, vec3(0.299,0.587,0.114));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(_skinY), uSkinFix) * uSkin;
          float gl = dot(diffuseColor.rgb, vec3(0.3,0.59,0.11));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(gl) * vec3(0.9, 0.93, 1.0), uPale);
          bool front = vHP.z > 0.0;
          if (front) { // 腮红 / 泪痣 / 雀斑
            vec2 ck = vec2((abs(vHP.x) - abs(uEye.x) * 1.02) * 0.85, vHP.y - (uEye.y - 0.025));
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.5, 0.55), uMk.x * 0.42 * smoothstep(0.017, 0.0, length(ck)));
            if (uMk.y > 0.5) { vec2 mp = uMk.y < 1.5 ? vec2(abs(uEye.x) + 0.006, uEye.y - 0.017) : uMk.y < 2.5 ? vec2(-abs(uEye.x) - 0.006, uEye.y - 0.017) : vec2(0.013, uEye.y - 0.058);
              diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.25, 0.12, 0.1), 0.85 * smoothstep(0.0019, 0.0011, length(vHP.xy - mp))); }
            if (uMk.z > 0.5) { vec2 cell = floor(vHP.xy * 900.0); float hsh = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
              float inReg = smoothstep(0.022, 0.012, length(vec2(abs(vHP.x) - abs(uEye.x) * 0.9, (vHP.y - (uEye.y - 0.022)) * 1.6)));
              diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.36, 0.26), step(0.93, hsh) * inReg * 0.55); }
          }
          // 战纹
          if (uPaint > 0.5 && front) {
            vec2 q = vec2(abs(vHP.x), vHP.y); float pm = 0.0;
            if (uPaint < 1.5) { pm = step(abs(q.y - (uEye.y - 0.016)), 0.0022) * step(abs(q.x - abs(uEye.x)) , 0.012) + step(abs(q.y - (uEye.y - 0.023)), 0.0018) * step(abs(q.x - abs(uEye.x)), 0.009); }
            else if (uPaint < 2.5) { pm = step(abs(q.x - abs(uEye.x)), 0.0025) * step(uEye.y - 0.04, q.y) * step(q.y, uEye.y + 0.025); }
            else if (uPaint < 3.5) { pm = step(length(vec2(vHP.x, vHP.y - uEye.y - 0.032)), 0.006); }
            else { pm = step(abs(vHP.y - uEye.y), 0.009) * step(q.x, abs(uEye.x) + 0.03); }
            diffuseColor.rgb = mix(diffuseColor.rgb, uPaintC, clamp(pm, 0.0, 1.0) * 0.85);
          }
          // 伤疤
          if (uScar.x > -9.0 && front) {
            float d = segD(vHP.xy, uScar.xy, uScar.zw);
            float sm = 1.0 - smoothstep(0.0012, 0.0026, d);
            float st = step(fract(dot(vHP.xy - uScar.xy, normalize(uScar.zw - uScar.xy)) * 180.0), 0.25) * (1.0 - smoothstep(0.0, 0.0045, d)) * step(0.0022, d);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.55, 0.16, 0.16), clamp(sm + st * 0.8, 0.0, 1.0) * 0.9);
          }
          // 血：颈部浸染 + 向上抹开的血痕 + 喷溅
          float h = (vHP.y - uCutY) / uH;
          float col = floor(vHP.x * 110.0 + uSeed * 7.0);
          float drip = pow(fract(sin(col * 12.9898 + uSeed) * 43758.5453), 5.0);
          float m1 = 1.0 - smoothstep(0.015, 0.04 + (0.05 + 0.22 * drip) * uBlood, h);
          float sp = vn3(vHP * 70.0 + uSeed) * 0.65 + vn3(vHP * 190.0 - uSeed) * 0.35;
          float m2 = smoothstep(0.80 - 0.07 * uSpat, 0.83 - 0.07 * uSpat, sp) * step(0.01, uSpat) * (0.55 + 0.35 * uSpat);
          float bm = clamp(m1 * min(1.0, uBlood * 1.6) + m2, 0.0, 1.0);
          vec3 blood = mix(vec3(0.20, 0.0, 0.01), vec3(0.42, 0.02, 0.03), sp);
          diffuseColor.rgb = mix(diffuseColor.rgb, blood, bm * 0.88);`);
    };
    m.customProgramCacheKey = () => 'skin6';
    return FaceFill.wrap(m, 1.0);
  }

  // ---------- 饰品几何（共享） ----------
  const G = {};
  function geo(name, fn) { return G[name] || (G[name] = fn()); }
  function elfEarGeo() {
    return geo('elf', () => {
      const g = new THREE.ConeGeometry(0.014, 0.075, 8, 4); g.translate(0, 0.0375, 0);
      const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, p.getZ(i) * 0.35); p.setX(i, p.getX(i) + Math.pow(y / 0.075, 2) * 0.006); }
      g.computeVertexNormals(); return g;
    });
  }
  function hornGeo(kind) {
    return geo('horn' + kind, () => {
      const g = new THREE.ConeGeometry(0.012, kind === 1 ? 0.11 : 0.07, 10, 12); g.translate(0, kind === 1 ? 0.055 : 0.035, 0);
      const p = g.attributes.position, L = kind === 1 ? 0.11 : 0.07;
      const bend = kind === 1 ? 1.6 : 0.9, R = L / bend;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i), x0 = p.getX(i), z0 = p.getZ(i); const an = (y / L) * bend; p.setXYZ(i, x0, R * Math.sin(an) + z0 * Math.sin(an), -R * (1 - Math.cos(an)) + z0 * Math.cos(an)); }
      g.computeVertexNormals(); return g;
    });
  }
  function beastEarGeo() { return geo('beast', () => { const g = new THREE.ConeGeometry(0.024, 0.05, 3, 1); g.translate(0, 0.025, 0); g.scale(1, 1, 0.45); g.computeVertexNormals(); return g; }); }
  const MATS = {};
  function mat(name, fn) { return MATS[name] || (MATS[name] = fn()); }
  const gold = () => mat('gold', () => new THREE.MeshStandardMaterial({ color: '#ffcf6a', metalness: 1, roughness: 0.25 }));
  const silver = () => mat('silver', () => new THREE.MeshStandardMaterial({ color: '#dfe6f0', metalness: 1, roughness: 0.2 }));
  const gemMat = (c) => mat('gem' + c, () => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, roughness: 0.1, metalness: 0.2 }));

  function addAccessories(g, look, meta, U, disposables, fitTop) {
    const eye = meta.eye || [0.017, -0.014, 0.03];
    // 用“实际贴上去的发型”顶端（借来的高发型会更高），否则帽子/兽耳会陷进头发
    const top = Math.max(fitTop || meta.hairTop || 0.11, meta.skullTop || 0.1);
    const skullTop = meta.skullTop || 0.1;
    const f = look.feat;
    if (f === 'elf' && meta.file !== 'AvatarSample_D_Darkness') {
      const m = new MTM({ color: new THREE.Color(look.skinHex).multiplyScalar(0.98), gradientMap: grad }); disposables.push(m);
      for (const s of [-1, 1]) { const e = new THREE.Mesh(elfEarGeo(), m); e.position.set(s * 0.074, eye[1] - 0.004, -0.006); e.rotation.set(-0.5, 0, -s * 1.15); g.add(e); }
    }
    if (f === 'horn' || f === 'horn2') {
      const m = mat('horn' + look.featC, () => new THREE.MeshStandardMaterial({ color: look.featC, roughness: 0.35, metalness: 0.1 }));
      const k = f === 'horn' ? 1 : 2;
      for (const s of [-1, 1]) { const h = new THREE.Mesh(hornGeo(k), m); h.position.set(s * 0.042, skullTop - 0.012, 0.012); h.rotation.set(0.2, 0, -s * 0.45); g.add(h); }
    }
    if (f === 'beast') {
      const m = new MTM({ color: new THREE.Color(look.hc1).multiplyScalar(0.9), gradientMap: grad }); disposables.push(m);
      const inner = mat('earIn', () => new MTM({ color: '#f0a8b0', gradientMap: grad }));
      for (const s of [-1, 1]) {
        const e = new THREE.Mesh(beastEarGeo(), m); e.position.set(s * 0.046, top - 0.018, -0.012); e.rotation.set(-0.15, s * 0.3, -s * 0.35); g.add(e);
        const i2 = new THREE.Mesh(beastEarGeo(), inner); i2.scale.set(0.6, 0.7, 0.6); i2.position.set(0, 0.004, 0.006); e.add(i2);
      }
    }
    if (f === 'halo') {
      const h = new THREE.Mesh(geo('halo', () => new THREE.TorusGeometry(0.06, 0.005, 8, 40)), mat('haloM', () => new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.0, 1.1) })));
      h.rotation.x = Math.PI / 2 - 0.25; h.position.set(0, top + 0.035, -0.01); g.add(h);
    }
    for (const a of look.acc || []) {
      if (a === 'circlet' || a === 'circletS') {
        const r = new THREE.Mesh(geo('circ', () => new THREE.TorusGeometry(0.086, 0.0028, 6, 48)), a === 'circlet' ? gold() : silver());
        r.rotation.x = Math.PI / 2 + 0.22; r.position.set(0, eye[1] + 0.036, -0.004); g.add(r);
        const gm = new THREE.Mesh(geo('gem', () => new THREE.OctahedronGeometry(0.0065)), gemMat(look.gem || '#ff2a5a')); gm.position.set(0, eye[1] + 0.036 + 0.019, 0.083); r.parent.add(gm);
      }
      if (a === 'crown' || a === 'tiara') {
        const cr = new THREE.Group(); const gm = gold();
        const ring = new THREE.Mesh(geo('crownR', () => new THREE.CylinderGeometry(0.052, 0.056, 0.016, 24, 1, true)), gm); cr.add(ring);
        const n = a === 'crown' ? 7 : 5;
        for (let i = 0; i < n; i++) {
          const an = a === 'crown' ? i / n * Math.PI * 2 : (i / (n - 1) - 0.5) * 1.6 + Math.PI / 2;
          const s = new THREE.Mesh(geo('spike', () => new THREE.ConeGeometry(0.0065, 0.026, 6)), gm); s.position.set(Math.cos(an) * 0.054, 0.019, Math.sin(an) * 0.054); cr.add(s);
          if (i % 2 === 0) { const gg = new THREE.Mesh(geo('gem', () => new THREE.OctahedronGeometry(0.0065)), gemMat(look.gem || '#ff2a5a')); gg.scale.setScalar(0.7); gg.position.set(Math.cos(an) * 0.057, 0.003, Math.sin(an) * 0.057); cr.add(gg); }
        }
        if (a === 'tiara') { cr.scale.set(1.45, 1, 1.45); cr.position.set(0, eye[1] + 0.068, -0.012); cr.rotation.x = 0.35; ring.visible = false; }
        else { cr.position.set(0.004, top - 0.004, -0.008); cr.rotation.z = -0.12; }
        g.add(cr);
      }
      if (a === 'flowers' && !(look.hw || []).some(e => e.k === 'flowercrown')) {
        const cols = ['#ffffff', '#ffd0e0', '#ffe27a', '#c8a8ff', '#ff8aa8'];
        for (let i = 0; i < 9; i++) {
          const an = (i / 9) * Math.PI * 2;
          const fl = new THREE.Mesh(geo('flower', () => new THREE.IcosahedronGeometry(0.009, 0)), mat('fl' + i % 5, () => new MTM({ color: cols[i % 5], gradientMap: grad })));
          fl.position.set(Math.cos(an) * 0.078, top - 0.028 + Math.sin(an * 3) * 0.004, Math.sin(an) * 0.078 - 0.005); g.add(fl);
        }
      }
      if (a === 'witchhat') {
        const hc = look.hatC || '#2a1a3a';
        const hm = mat('hat' + hc, () => new MTM({ color: hc, gradientMap: grad, side: THREE.DoubleSide }));
        const hat = new THREE.Group();
        const brim = new THREE.Mesh(geo('brim', () => new THREE.CylinderGeometry(0.125, 0.125, 0.004, 32)), hm); hat.add(brim);
        const cone = new THREE.Mesh(geo('hcone', () => { const c = new THREE.ConeGeometry(0.085, 0.2, 24, 6, true); c.translate(0, 0.1, 0); const p = c.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, p.getZ(i) - Math.pow(Math.max(0, y) / 0.2, 2.2) * 0.07); } c.computeVertexNormals(); return c; }), hm); hat.add(cone);
        const band = new THREE.Mesh(geo('band', () => new THREE.CylinderGeometry(0.082, 0.085, 0.018, 24, 1, true)), mat('bandM', () => new MTM({ color: '#8a1a2a', gradientMap: grad }))); band.position.y = 0.012; hat.add(band);
        hat.position.set(0, top - 0.03, -0.01); hat.rotation.set(-0.12, 0, 0.1); g.add(hat);
      }
      if (a === 'patch' && false) {
        const pm = mat('patch', () => new THREE.MeshStandardMaterial({ color: '#15110f', roughness: 0.6 }));
        const s = look.patchSide || 1;
        const p = new THREE.Mesh(geo('patchG', () => { const c = new THREE.CircleGeometry(0.017, 16); return c; }), pm); p.position.set(s * Math.abs(eye[0]), eye[1] + 0.002, (meta.front || 0.075) + 0.004); g.add(p);
      }
    }
  }

  function rnd(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const pick = (r, a) => a[Math.floor(r() * a.length)];

  // 可换发型的组
  const MIX = { mmd: ['mmd'], vroid: ['vroid', 'twist', 'seed'], twist: ['vroid', 'twist'], seed: ['seed', 'vroid'], godette: ['godette'] };
  function idxOf(file) { return T.findIndex(t => t.meta.file === file); }
  // 第二十六轮(j)：脸部贴图下颌一圈的真实肤色（当前未用：试过按“身体脖子肤色÷脸肤色”校色，原神身体脖子贴图画了阴影、反而更糟；留作工具）（线性空间，含 uSkinFix 去绿），与 foe.js sampleSkin 同一取法（取亮的一半）
  const _fs = new Map(), _s2l = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  function faceSkin(look) {
    const fi = idxOf(look && look.f); if (fi < 0) return null; const t = T[fi]; if (_fs.has(t)) return _fs.get(t);
    let out = null;
    try {
      const bot = t.meta.bottom != null ? t.meta.bottom : null, band = [], all = [], cvs = new Map();
      t.meshes.forEach(m => {
        if (m.userData.kind !== 'skin') return; const src = SRC.get(m) || m.material; const img = src && src.map && src.map.image; const uv = m.geometry.attributes.uv, pa = m.geometry.attributes.position; if (!img || !uv || !pa) return;
        let cv = cvs.get(img); if (!cv) { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, 256, 256); cv = g.getImageData(0, 0, 256, 256).data; cvs.set(img, cv); }
        const fix = (window.Mods && Mods.on('head_repair') && src.userData && src.userData._headGreenFix) || 0, step = Math.max(1, Math.floor(pa.count / 4000));
        for (let i = 0; i < pa.count; i += step) {
          const X = Math.min(255, Math.max(0, Math.floor(uv.getX(i) * 256))), Y = Math.min(255, Math.max(0, Math.floor(uv.getY(i) * 256))), k = (Y * 256 + X) * 4; if (cv[k + 3] < 128) continue;
          let r = cv[k] / 255, g = cv[k + 1] / 255, b = cv[k + 2] / 255; if (!(r > 0.45 && r >= g && g >= b * 0.85 && r - b < 0.45)) continue;
          if (fix) { const y = r * 0.299 + g * 0.587 + b * 0.114; r += (y - r) * fix; g += (y - g) * fix; b += (y - b) * fix; }
          const p = [_s2l(r), _s2l(g), _s2l(b)]; all.push(p); const vy = pa.getY(i); if (bot != null && vy > bot + 0.004 && vy < bot + 0.07) band.push(p);
        }
      });
      const px = band.length >= 12 ? band : all;
      if (px.length >= 6) { px.sort((a, b) => (b[0] + b[1] + b[2]) - (a[0] + a[1] + a[2])); const top = px.slice(0, Math.max(4, Math.floor(px.length * 0.5))); out = [0, 1, 2].map(j => top.reduce((s, p) => s + p[j], 0) / top.length); }
    } catch (e) { console.warn('faceSkin', e); }
    _fs.set(t, out); return out;
  }

  // ---------- 随机外观（种族约束由 lore 传入） ----------
  // race: {skins:[名], feat:[...], hair:[名], eye:[名], acc:{name:prob}, faces:[file]?}
  // 五官原型 × 连续抖动：吊眼(凌厉)/垂眼(温柔)/大眼(人偶)/细长眼(冷艳)/困倦/圆润/瓜子/方颌…
  const FM_TYPES = [
    { n: '凌厉', w: 2.2, ew: [0.95, 1.12], eh: [0.78, 0.94], tilt: [0.12, 0.26], sp: [-0.003, 0.006], dy: [-0.002, 0.004], bs: [0.95, 1.1], bt: [0.16, 0.36], bdy: [-0.006, 0.0], fx: [0.93, 1.0], fy: [1.0, 1.06], fz: [0.98, 1.05] },
    { n: '温柔', w: 2.2, ew: [0.98, 1.1], eh: [1.02, 1.2], tilt: [-0.26, -0.1], sp: [0.0, 0.008], dy: [-0.005, 0.0], bs: [0.95, 1.05], bt: [-0.3, -0.1], bdy: [0.001, 0.008], fx: [0.98, 1.06], fy: [0.95, 1.02], fz: [0.98, 1.04] },
    { n: '人偶', w: 1.8, ew: [1.1, 1.24], eh: [1.14, 1.34], tilt: [-0.06, 0.06], sp: [0.002, 0.011], dy: [-0.006, -0.001], bs: [1.0, 1.1], bt: [-0.1, 0.1], bdy: [0.002, 0.01], fx: [1.0, 1.08], fy: [0.93, 0.99], fz: [1.0, 1.06] },
    { n: '冷艳', w: 1.8, ew: [1.05, 1.22], eh: [0.72, 0.88], tilt: [0.02, 0.14], sp: [-0.004, 0.003], dy: [0.0, 0.005], bs: [1.0, 1.15], bt: [0.05, 0.22], bdy: [-0.004, 0.003], fx: [0.9, 0.98], fy: [1.02, 1.09], fz: [0.96, 1.02] },
    { n: '困倦', w: 1.2, ew: [1.0, 1.14], eh: [0.8, 0.95], tilt: [-0.2, -0.04], sp: [0.0, 0.006], dy: [-0.007, -0.002], bs: [0.95, 1.05], bt: [-0.25, -0.05], bdy: [0.0, 0.006], fx: [0.98, 1.06], fy: [0.96, 1.03], fz: [1.0, 1.05] },
    { n: '圆润', w: 1.4, ew: [1.0, 1.15], eh: [1.05, 1.22], tilt: [-0.1, 0.05], sp: [0.0, 0.007], dy: [-0.006, 0.0], bs: [0.95, 1.05], bt: [-0.1, 0.1], bdy: [0.0, 0.006], fx: [1.06, 1.14], fy: [0.92, 0.98], fz: [1.0, 1.07] },
    { n: '瓜子', w: 1.4, ew: [0.92, 1.05], eh: [0.92, 1.08], tilt: [0.0, 0.14], sp: [-0.004, 0.002], dy: [0.0, 0.005], bs: [0.95, 1.05], bt: [0.0, 0.2], bdy: [-0.004, 0.004], fx: [0.88, 0.95], fy: [1.04, 1.1], fz: [0.95, 1.02] },
    { n: '寻常', w: 1.6, ew: [0.94, 1.08], eh: [0.92, 1.1], tilt: [-0.1, 0.1], sp: [-0.003, 0.005], dy: [-0.004, 0.003], bs: [0.95, 1.06], bt: [-0.15, 0.15], bdy: [-0.004, 0.004], fx: [0.95, 1.05], fy: [0.96, 1.05], fz: [0.97, 1.04] }
  ];
  function faceMorph(r, rarity) {
    let t = r() * FM_TYPES.reduce((a, b) => a + b.w, 0), T = FM_TYPES[0]; for (const x of FM_TYPES) { if ((t -= x.w) <= 0) { T = x; break; } }
    const u = (rg) => rg[0] + (rg[1] - rg[0]) * r(), q = (v) => +v.toFixed(4);
    return { t: T.n, ew: q(u(T.ew)), eh: q(u(T.eh)), tilt: q(u(T.tilt)), sp: q(u(T.sp)), dy: q(u(T.dy)), bs: q(u(T.bs)), bt: q(u(T.bt)), bdy: q(u(T.bdy)), fx: q(u(T.fx)), fy: q(u(T.fy)), fz: q(u(T.fz)) };
  }
  /* R31 MOD head_qc：逐个目检后仍然怪异、暂不能修的头模（八云紫 PMD 脸皮与全身同一材质→发白发光；黑鸟 帽子整个盖住脸），不进随机池/混发池；已存档的头照常显示 */
  const QC_BAD = ['CLS_YakumoYukari', 'NTE_Blackbird'];
  const qcBad = (i) => !!(T[i] && QC_BAD.includes(T[i].meta.file) && window.Mods && Mods.on('head_qc'));
  const OK = (i) => !!T[i] && (!window.CC0 || CC0.okHead(T[i].meta.file)); // R38 CC0 模式：只用 CC0 模型
  const okList = () => { const a = T.map((t, i) => i).filter(OK); return a.length ? a : T.map((t, i) => i); };
  function randomLook(r, race = {}, rarity = 0) {
    let faceIdx = race.faces ? Math.max(0, idxOf(pick(r, race.faces))) : tierFace(r(), rarity); // 第二十五轮 MOD tier_look：按魂阶加权挑脸模
    for (let k = 0; k < 12 && qcBad(faceIdx); k++) faceIdx = tierFace(r(), rarity);
    if (!OK(faceIdx)) { const L = okList(); faceIdx = L[Math.floor(r() * L.length)]; } // R38 CC0
    const face = T[faceIdx];
    const grp = face.meta.grp || 'vroid';
    const allHair = T.map((t, i) => i).filter(i => T[i].hairMeshes.length && !T[i].meta.noHair && !qcBad(i) && OK(i));
    const compatible = allHair.filter(i => (MIX[grp] || [grp]).includes(T[i].meta.grp || 'vroid'));
    const hairCands = compatible.length ? compatible : allHair;
    const nativeHair = face.hairMeshes.length > 0 && !face.meta.noHair;
    // Never roll a bald result accidentally: if the chosen face has no usable fringe, borrow a compatible hair mesh.
    const hairIdx = face.meta.grp === 'godette' && nativeHair ? faceIdx : (!hairCands.length ? faceIdx : (nativeHair && r() < 0.12 ? faceIdx : pick(r, hairCands)));
    const hn = race.hair && r() < 0.85 ? pick(r, race.hair) : pick(r, HAIR)[0];
    const hc = (HAIR.find(h => h[0] === hn) || HAIR[0]);
    const two = r() < 0.12 + rarity * 0.08;
    const hc2 = two ? pick(r, HAIR) : hc;
    const en = race.eye && r() < 0.8 ? pick(r, race.eye) : pick(r, EYE)[0];
    const ec = EYE.find(e => e[0] === en) || EYE[0];
    const het = r() < 0.04 + rarity * 0.04;
    const ec2 = het ? pick(r, EYE) : ec;
    const skinName = race.skins ? pick(r, race.skins) : pick(r, ['瓷白', '象牙', '象牙', '蜜色', '小麦', '古铜', '深棕']);
    const feat = race.feat ? pick(r, race.feat) : null;
    const acc = [];
    for (const [k, p] of Object.entries(race.acc || {})) if (r() < p) acc.push(k);
    if (acc.includes('crown') && acc.includes('tiara')) acc.splice(acc.indexOf('tiara'), 1);
    if (acc.includes('witchhat')) { const i = acc.indexOf('crown'); if (i >= 0) acc.splice(i, 1); }
    // 死气表情
    const exT = pick(r, ['half', 'half', 'closed', 'stare', 'slack', 'agony', 'wide']);
    const ex = {};
    if (exT === 'half') { ex.blink = 0.35 + r() * 0.3; ex.aa = r() * 0.3; }
    else if (exT === 'closed') { ex.blink = 0.85 + r() * 0.15; ex.aa = r() * 0.2; ex.sad = r() * 0.3; }
    else if (exT === 'stare') { ex.blink = r() * 0.15; ex.surprised = 0.2 + r() * 0.3; }
    else if (exT === 'slack') { ex.blink = 0.25 + r() * 0.35; ex.aa = 0.25 + r() * 0.35; ex.oh = r() * 0.2; }
    else if (exT === 'agony') { ex.blink = 0.3 + r() * 0.3; ex.angry = 0.3 + r() * 0.4; ex.ee = 0.2 + r() * 0.3; ex.sad = r() * 0.3; }
    else { ex.surprised = 0.6 + r() * 0.4; ex.oh = 0.2 + r() * 0.4; }
    for (const k in ex) ex[k] = +ex[k].toFixed(2);
    const featCols = ['#1a1418', '#e8dcc0', '#6a0f18', '#2a2a3a', '#4a3a2a'];
    const LOOK = {
      f: face.meta.file, h: T[hairIdx].meta.file,
      hn: hc[0], hc1: hc[1], hn2: hc2[0], hc2: hc2[1], gy: +(r() * 0.05 - 0.04).toFixed(3),
      en: ec[0], ec1: ec[1], en2: ec2[0], ec2: ec2[1],
      sk: skinName, skinHex: SKIN[skinName] || '#ffe9dc', pale: +(0.12 + r() * 0.25).toFixed(2),
      feat, featC: pick(r, featCols), acc, gem: pick(r, ['#ff2a5a', '#2ad0ff', '#7aff5a', '#b05aff', '#ffd02a']), hatC: pick(r, ['#2a1a3a', '#1a1a22', '#3a1a1a', '#1a2a3a']),
      patchSide: r() < 0.5 ? -1 : 1,
      ex, exT,
      blood: +(0.25 + r() * 0.75).toFixed(2), spat: +(r() < 0.4 ? r() * 0.7 : 0).toFixed(2), seed: Math.floor(r() * 1000),
      scar: r() < 0.18 ? [+(r() * 0.06 - 0.03).toFixed(3), +(r() * 0.05 - 0.03).toFixed(3), +(r() * 0.06 - 0.03).toFixed(3), +(r() * 0.05 - 0.02).toFixed(3)] : null,
      paint: r() < (race.paint || 0.08) ? 1 + Math.floor(r() * 4) : 0, paintC: pick(r, ['#1a1a2a', '#b01a1a', '#f0f0f0', '#2a5ab0', '#d0a020'])
    };
    // 程序化发饰（放在最后抽签，不改变旧种子的其余外观）
    if (grp !== 'godette' && r() < (race.hxP != null ? race.hxP : 0.42) + rarity * 0.05) {
      const hat = acc.includes('witchhat');
      const styles = hat ? ['pony', 'twin', 'drill', 'braid', 'braid2'] : ['pony', 'pony', 'twin', 'twin', 'drill', 'bun', 'odango', 'braid', 'braid2'];
      let s0 = race.hx && r() < 0.7 ? pick(r, race.hx) : pick(r, styles); if (hat && /bun|odango/.test(s0)) s0 = 'pony';
      LOOK.hx = { s: s0, len: +(0.75 + r() * 0.6).toFixed(2), rib: pick(r, ['#b01a2a', '#1a1a22', '#f0f0f0', '#2a4ab0', '#d0a020', '#6a2a8a', '#1a6a4a']), seed: 1 + Math.floor(r() * 9999) };
      if (!hat && r() < 0.3) LOOK.hx.ahoge = r() < 0.25 ? 2 : 1;
      LOOK.hn3 = { pony: '马尾', twin: '双马尾', drill: '钻头卷', bun: '丸子头', odango: '双丸子', braid: '麻花辫', braid2: '双麻花辫' }[LOOK.hx.s];
    } else if (grp !== 'godette' && !acc.includes('witchhat') && r() < 0.12) LOOK.hx = { s: null, ahoge: 1, seed: 1 + Math.floor(r() * 9999) };
    // face_morph 已按用户要求删除（恐怖谷）
    if (grp === 'mmd') { // MMD 成品头：原发型原配色，一半保留程序化饰品
      const mh = T.map((t, i) => i).filter(i => T[i].meta.grp === 'mmd' && T[i].hairMeshes.length && i !== faceIdx);
      const rr = r(), ra = r();
      LOOK.h = LOOK.f; // 发型移植对 MMD 头失真（尺寸/头皮不匹配），保持原发型
      delete LOOK.hx; delete LOOK.hn3; LOOK.skinHex = '#fbe6da'; LOOK.pale = 0.04;
      if (ra < 0.5) LOOK.acc = LOOK.acc.filter(a => a !== 'witchhat' && a !== 'crown'); else LOOK.acc = [];
    }
    if (window.Mods && (Mods.on('hair_mix2') || Mods.on('acc_mix'))) mixLook(LOOK, faceIdx, grp, rarity);
    if (window.Mods && Mods.on('tier_look')) tierLook(LOOK, race, rarity, grp);
    return resolve(LOOK); // R38 CC0 / 拼图混搭
  }
  function mixLook(L, fi, grp, rarity) {
    let s2 = ((L.seed || 1) * 4271 + 99991) % 2147483647 || 1; const r = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
    const F = T[fi], k = Math.max(0, Math.min(4, Math.round(+rarity || 0)));
    if (Mods.on('hair_mix2') && grp !== 'godette' && r() < (grp === 'mmd' ? 0.3 : 0.22)) { // MMD 发型（原作配色、自带发饰）
      const c = T.map((t, i) => i).filter(i => i !== fi && T[i].meta.grp === 'mmd' && T[i].hairMeshes.length && OK(i));
      for (let tries = 0; tries < 6 && c.length; tries++) { const j = c.splice(Math.floor(r() * c.length), 1)[0];
        if (hairFitOK(F, T[j])) { L.h = T[j].meta.file; delete L.hx; delete L.hn3; L.hn = '原色'; break; } }
    }
    if (Mods.on('acc_mix') && grp !== 'godette' && r() < (grp === 'mmd' && Mods.on('head_collage') ? 0.45 + k * 0.1 : [0.06, 0.14, 0.26, 0.4, 0.55][k])) { /* R38 拼图：MMD 脸更常拼第三个头的饰品 */ // 饰品：同一头最多 2 件，大件（帽子）最多 1 件
      const lib = accLib().filter(a => a.f !== L.h && a.f !== L.f && OK(idxOf(a.f))); const ax = []; let big = accLib().some(x => x.f === F.meta.file && x.big); // 脸自带大件（帽子/大头冠）就不再叠
      let hi = idxOf(L.h); if (hi < 0) hi = fi; hi = coverHair(fi, hi, L); const H = T[hi];
      const S = hairShell(F, H, F.meta.file + '|' + H.meta.file + (hi === fi ? '|own' : ''), hi !== fi ? fitHair(F, H) : H.hairMeshes.map(m => m.geometry));
      const want = r() < 0.3 + k * 0.08 ? 2 : 1;
      for (let tries = 0; tries < 10 && ax.length < want && lib.length; tries++) { const a = lib.splice(Math.floor(r() * lib.length), 1)[0]; if (a.big && (big || r() > 0.35)) continue; if (ax.some(x => x.f === a.f)) continue; // 大件少出（避免满屏同款巫师帽）；同一来源头只取 1 件
        if (!fitAcc(F, S, a, F.meta.file + '|' + H.meta.file + '|' + a.f + '|' + a.n)) continue; // 预检：只写入确实贴合的
        big = big || a.big; ax.push({ f: a.f, n: a.n }); }
      if (ax.length) { L.ax = ax; if (big) L.acc = (L.acc || []).filter(x => x !== 'crown' && x !== 'witchhat' && x !== 'tiara'); }
    }
  }
  // ---------- 第二十五轮 MOD tier_look：魂阶外貌差异 ----------
  // 权重：凡魂偏普通脸模，神魂偏大师级 MMD 头（自带原作头饰）
  const TIER_MMD = [0.15, 0.45, 1, 2.2, 3.5], TIER_STD = [1.5, 1.2, 1, 0.7, 0.45];
  const tierOf = rar => Math.max(0, Math.min(4, Math.round(+rar || 0)));
  function tierFace(u, rarity) {
    if (!(window.Mods && Mods.on('tier_look'))) { const L = okList(); return L[Math.floor(u * L.length)]; }
    const k = tierOf(rarity); let sum = 0; const w = T.map((t, i) => { const x = !OK(i) ? 0 : t.meta.grp === 'mmd' ? TIER_MMD[k] : TIER_STD[k]; sum += x; return x; });
    let t = u * sum; for (let i = 0; i < w.length; i++) { if ((t -= w[i]) <= 0) return i; } return T.length - 1;
  }
  const PLAIN_HAIR = ['乌黑', '深褐', '栗棕', '灰烬', '焦糖', '青灰', '奶茶', '亚麻金', '墨蓝'];
  function tierLook(L, race, rarity, grp) {
    const k = tierOf(rarity); let s = ((L.seed || 1) * 7919 + k * 104729) % 2147483647 || 1; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const setHair = n => { const h = HAIR.find(x => x[0] === n); if (h) { L.hn = h[0]; L.hc1 = h[1]; } };
    const noClash = () => !L.acc.some(a => a === 'crown' || a === 'witchhat' || a === 'tiara' || a === 'circlet' || a === 'circletS');
    L.tier = k;
    if (k === 0) { // 凡魂：朴素、灰扑扑
      L.acc = []; if (!race.hair && r() < 0.9) setHair(pick(r, PLAIN_HAIR));
      L.hn2 = L.hn; L.hc2 = L.hc1; L.en2 = L.en; L.ec2 = L.ec1; L.pale = +Math.min(0.6, L.pale + 0.1).toFixed(2);
      if (L.hx && L.hx.s && r() < 0.6) { delete L.hx; delete L.hn3; }
    } else if (k === 1) { L.acc = L.acc.filter(() => r() < 0.5); }
    else if (k === 3) { // 圣魂：珠宝额饰
      if (noClash() && r() < (grp === 'mmd' ? 0.2 : 0.5)) L.acc.push(pick(r, ['circletS', 'circlet', 'tiara']));
    } else if (k === 4) { // 神魂：王冠 / 异色瞳 / 挑染 / 偶有发光瞳
      if (noClash() && r() < (grp === 'mmd' ? 0.25 : 0.75)) L.acc.push(grp === 'mmd' ? 'circletS' : pick(r, ['crown', 'tiara', 'circlet']));
      if (L.ec2 === L.ec1 && r() < 0.25) { const e = pick(r, EYE); L.en2 = e[0]; L.ec2 = e[1]; }
      if (L.hc2 === L.hc1 && r() < 0.3) { const h = pick(r, HAIR); L.hn2 = h[0]; L.hc2 = h[1]; }
      if (r() < 0.25) L.glowEye = 1;
    }
  }

  function makeUniforms(look, faceMeta, hairMeta, hairT) {
    const baseSkin = new THREE.Color('#fbe6da');
    const sk = new THREE.Color(look.skinHex);
    const top = hairMeta.skullTop || 0.1;
    return {
      hc1: { value: new THREE.Color(look.hc1) }, hc2: { value: new THREE.Color(look.hc2) },
      grad: { value: new THREE.Vector2(look.gy - 0.03, look.gy + 0.03) },
      sway: { value: new V3() }, hTop: { value: top * 0.55 }, hLen: { value: Math.max(0.08, top * 0.55 - hairT.hairMinY) },
      ec1: { value: new THREE.Color(look.ec1) }, ec2: { value: new THREE.Color(look.ec2) }, dull: { value: look.glowEye ? 0.08 : 0.45 }, glow: { value: look.glowEye ? 0.9 : 0 }, shiny: { value: look.shiny || 0 },
      skin: { value: new V3(sk.r / baseSkin.r, sk.g / baseSkin.g, sk.b / baseSkin.b).multiply(look.skinMul ? new V3(...look.skinMul) : new V3(1, 1, 1)) }, pale: { value: look.pale },
      blood: { value: look.blood }, spat: { value: look.spat }, seed: { value: look.seed }, ph: { value: ((look.seed || 0) * 7.13) % 6.283 }, hover: { value: 0 }, mk: { value: new THREE.Vector3(...((look.mk && (!window.Mods || Mods.on('makeup'))) ? look.mk : [0, 0, 0])) },
      cutY: { value: faceMeta.bottom }, hH: { value: (faceMeta.skullTop || 0.1) - faceMeta.bottom },
      scar: { value: look.scar ? new THREE.Vector4(...look.scar) : new THREE.Vector4(-10, 0, 0, 0) },
      paint: { value: look.paint }, paintC: { value: new THREE.Color(look.paintC) },
      eye: { value: new V3(...(faceMeta.eye || [0.017, -0.014, 0.03])) }
    };
  }

  // ---- 发型移植：径向头皮高度图 + 顶点转移（把 H 的头发从 H 的头皮“搬”到 F 的头皮上，保持离头皮的距离） ----
  const NT = 24, NP = 48;
  function skullMap(t) {
    if (t.skull) return t.skull;
    const box = new THREE.Box3(), v = new V3();
    const skins = t.faceMeshes.filter(m => m.userData.kind === 'skin');
    for (const m of skins) { const P = m.geometry.attributes.position; for (let i = 0; i < P.count; i++) box.expandByPoint(v.fromBufferAttribute(P, i)); }
    const eyeY = (t.meta.eye && t.meta.eye[1] != null) ? t.meta.eye[1] : (box.min.y + box.max.y) / 2;
    const c = new V3((box.min.x + box.max.x) / 2, eyeY, (box.min.z + box.max.z) / 2);
    const R = new Float32Array(NT * NP).fill(-1);
    for (const m of skins) {
      const P = m.geometry.attributes.position;
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).sub(c); const r = v.length(); if (r < 1e-5) continue;
        const k = binOf(v.x / r, v.y / r, v.z / r); if (r > R[k]) R[k] = r;
      }
    }
    if (t.meta.grp === 'mmd' && window.Mods && (Mods.on('hair_mix2') || Mods.on('acc_mix'))) { // 第二十五轮：MMD 脸只有前面具 → 按耳平面镜像补出后脑，发型/饰品才贴得准
      const zm = box.min.z + (box.max.z - box.min.z) * 0.3;
      for (const m of skins) { const P = m.geometry.attributes.position; for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); if (v.z <= zm || v.y < box.min.y) continue; v.z = 2 * zm - v.z; v.sub(c); const r = v.length(); if (r < 1e-5) continue; const k = binOf(v.x / r, v.y / r, v.z / r); if (r > R[k]) R[k] = r; } }
    }
    // 空格子用邻居填
    for (let pass = 0; pass < 6; pass++) for (let a = 0; a < NT; a++) for (let b = 0; b < NP; b++) {
      const k = a * NP + b; if (R[k] > 0) continue; let s = 0, n = 0;
      for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const aa = a + da; if (aa < 0 || aa >= NT) continue; const kk = aa * NP + ((b + db + NP) % NP); if (R[kk] > 0) { s += R[kk]; n++; } }
      if (n) R[k] = s / n;
    }
    return (t.skull = { c, R, eyeY, bottom: box.min.y });
  }
  function binOf(x, y, z) { const th = Math.acos(Math.max(-1, Math.min(1, y))); const ph = Math.atan2(z, x) + Math.PI; return Math.min(NT - 1, Math.floor(th / Math.PI * NT)) * NP + Math.min(NP - 1, Math.floor(ph / (2 * Math.PI) * NP)); }
  function radAt(S, x, y, z) { // 双线性插值
    const th = Math.acos(Math.max(-1, Math.min(1, y))) / Math.PI * NT - 0.5, ph = (Math.atan2(z, x) + Math.PI) / (2 * Math.PI) * NP - 0.5;
    const a0 = Math.max(0, Math.min(NT - 1, Math.floor(th))), a1 = Math.min(NT - 1, a0 + 1), fa = Math.max(0, Math.min(1, th - a0));
    const b0 = ((Math.floor(ph) % NP) + NP) % NP, b1 = (b0 + 1) % NP, fb = ph - Math.floor(ph);
    const g = (a, b) => S.R[a * NP + b];
    return (g(a0, b0) * (1 - fb) + g(a0, b1) * fb) * (1 - fa) + (g(a1, b0) * (1 - fb) + g(a1, b1) * fb) * fa;
  }
  const FIT = new Map();
  // ---------- 第二十五轮 MOD hair_mix2 / acc_mix：发型与饰品跨头适配（每对先打分，只用合格的） ----------
  const FITSC = new Map();
  function hairFitOK(F, H) { // 相对原主人：覆盖/陷入不变差；拉伸 0.8~1.25；刘海不挡眼（眼带遮挡 ≤34%）；原主人自身陷入 ≥20% 的坏发型不外借
    const key = F.meta.file + '|' + H.meta.file; if (FITSC.has(key)) return FITSC.get(key).ok;
    const SF = skullMap(F), SH = skullMap(H), v = new V3(), Rh = new Float32Array(NT * NP).fill(-1);
    let n = 0, sink = 0, ratio = 0, nr = 0; const eyeC = new Uint8Array(12), ey = SF.eyeY;
    for (const m of H.hairMeshes) { const P = m.geometry.attributes.position; const step = Math.max(1, Math.floor(P.count / 6000));
      for (let i = 0; i < P.count; i += step) {
        v.fromBufferAttribute(P, i).sub(SH.c); const r = v.length() || 1e-5; const dx = v.x / r, dy = v.y / r, dz = v.z / r;
        const rh = radAt(SH, dx, dy, dz), rf = radAt(SF, dx, dy, dz); const w = Math.max(0, Math.min(1, (v.y + 0.045) / 0.05));
        let r2 = r + (rf - rh) * w; const off = r - rh; if (w > 0.5 && off > -0.004) r2 = Math.max(r2, rf + Math.max(0.0015, off * 0.9));
        if (dy > -0.2) { n++; if (r2 < rf - 0.003) sink++; ratio += rf / Math.max(1e-4, rh); nr++; }
        const k = binOf(dx, dy, dz); if (r2 > Rh[k]) Rh[k] = r2;
        const yy = SF.c.y + dy * r2; if (dz > 0.55 && yy > ey - 0.012 && yy < ey + 0.006 && Math.abs(dx) < 0.6 && r2 > rf) eyeC[Math.min(11, Math.floor((dx + 0.6) / 0.1))] = 1; // 刘海挡住眼睛带
      } }
    let occ = 0; for (const c of eyeC) occ += c; occ /= 12;
    let cov = 0, tot = 0;
    for (let a = 0; a < NT; a++) for (let b = 0; b < NP; b++) { const th = (a + 0.5) / NT * Math.PI, ph = (b + 0.5) / NP * Math.PI * 2 - Math.PI;
      const dy = Math.cos(th), dz = Math.sin(th) * Math.sin(ph); if (dy < -0.15 || (dz > 0.35 && dy < 0.55)) continue; // 头顶/后脑/两侧（不含脸）
      tot++; const k = a * NP + b; if (Rh[k] >= SF.R[k] + 0.001) cov++; }
    const rt = nr ? ratio / nr : 1, cv = cov / Math.max(1, tot), sk = n ? sink / n : 1;
    // 相对标准：不比“戴在原主人头上”更差（覆盖最多掉 5%、陷入最多多 2%）；后颈本就露出的盘发/扎发不算错（VRoid 有真后颈、MMD 有 nape_fill）
    let ok = true; if (F !== H) { hairFitOK(H, H); const b = FITSC.get(H.meta.file + '|' + H.meta.file); ok = b.sink < 0.2 && cv >= b.cov - 0.05 && sk <= b.sink + 0.02 && rt > 0.8 && rt < 1.25 && occ <= Math.min(0.6, Math.max(0.34, (b.occ || 0) + 0.08)); }
    FITSC.set(key, { ok, cov: +cv.toFixed(3), sink: +sk.toFixed(3), rt: +rt.toFixed(3), occ: +occ.toFixed(2) }); return ok;
  }
  let ACCLIB = null;
  function accLib() { // MMD 头上的独立饰品（帽子/头冠/花/发簪…，材质 cloth_*），排除眼睛以下的领口残片
    if (ACCLIB) return ACCLIB; ACCLIB = [];
    T.forEach(t => { if (t.meta.grp !== 'mmd') return; hairFitOK(t, t); const self = FITSC.get(t.meta.file + '|' + t.meta.file); if (self && self.sink >= 0.2) return; /* 头骨/发型本身不正常的头（如 Ganyu）不外借 */ const ey = (t.meta.eye && t.meta.eye[1] != null) ? t.meta.eye[1] : 0;
      for (const m of t.faceMeshes) { const nm = (SRC.get(m) || {}).name || ''; if (!/^cloth/i.test(nm)) continue;
        const P = m.geometry.attributes.position; if (P.count < 24) continue; m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox;
        if ((bb.min.y + bb.max.y) / 2 < ey - 0.005 || bb.max.y < ey + 0.01) continue;
        const sz = bb.getSize(new V3()); if (Math.max(sz.x, sz.y, sz.z) < 0.012) continue;
        ACCLIB.push({ f: t.meta.file, n: m.name, t, m, big: bb.max.y > (t.meta.skullTop || 0.1) * 0.8 && sz.x > 0.12 }); } });
    return ACCLIB;
  }
  const ACCFIT = new Map(), ACCWHY = new Map();
  function fitAcc(F, dstS, a, key) { // 饰品按“离发型外轮廓的距离”搬到新头的发型上；返回 null = 不合格（陷进头皮/挡脸/拉伸过大）
    if (ACCFIT.has(key)) return ACCFIT.get(key);
    const A = a.t, srcS = hairShell(A, A, A.meta.file + '|' + A.meta.file + '|own', A.hairMeshes.map(m => m.geometry)), SF = skullMap(F);
    const src = a.m.geometry, P = src.attributes.position, np = new Float32Array(P.count * 3), v = new V3();
    const ey = SF.eyeY, bottom = F.meta.bottom != null ? F.meta.bottom : -0.1; let bad = 0, face = 0, st = 0;
    // 刚性搬运：按“头骨平均半径之比”整体等比缩放（不扭曲形状），再沿饰品质心方向平移，使“最贴发型的 10% 顶点”到发型的间隙与原主人一致
    const SA = skullMap(A), mR = S => { let t = 0, c = 0; for (let k = 0; k < S.R.length; k++) if (S.R[k] > 0) { t += S.R[k]; c++; } return c ? t / c : 0.1; };
    const sc = Math.max(0.7, Math.min(1.3, mR(SF) / mR(SA))), N = P.count, gs = new Float32Array(N), gd = new Float32Array(N), ks = new Float32Array(N), kd = new Float32Array(N), u = new V3();
    for (let i = 0; i < N; i++) { v.fromBufferAttribute(P, i).sub(srcS.c); u.add(v); const r = v.length() || 1e-5; gs[i] = r - radAt(srcS, v.x / r, v.y / r, v.z / r); ks[i] = r - radAt(SA, v.x / r, v.y / r, v.z / r); }
    u.normalize(); let bur = 0;
    const place = off => { bur = 0; for (let i = 0; i < N; i++) { v.fromBufferAttribute(P, i).sub(srcS.c).multiplyScalar(sc).addScaledVector(u, off);
        np[i * 3] = dstS.c.x + v.x; np[i * 3 + 1] = dstS.c.y + v.y; np[i * 3 + 2] = dstS.c.z + v.z; const r = v.length() || 1e-5; gd[i] = r - radAt(dstS, v.x / r, v.y / r, v.z / r); kd[i] = r - radAt(SF, v.x / r, v.y / r, v.z / r);
        if (gs[i] >= -0.002 && gd[i] < -0.008) bur++; } };
    // 贴合：让“最贴发型的 10% 顶点”间隙 = 原主人头上的间隙×比例（限幅 -3~+4cm，防发散）；之后仍埋进发型就再外推
    const q10 = g => { const c = Array.from(g).sort((x, y) => x - y); return c[Math.floor(c.length * 0.1)]; };
    const g0 = q10(ks) * sc; let off = 0; place(0); // 以头骨为基准（两边头骨都可靠；发型外轮廓 MMD 蓬松/VRoid 贴头，不可比）
    for (let t = 0; t < 3; t++) { off = Math.max(-0.02, Math.min(0.04, off + (g0 - q10(kd)))); place(off); }
    const miss = Math.abs(q10(kd) - g0);
    while (bur / N > 0.12 && off < 0.04) { off += 0.005; place(off); } st = off * N;
    for (let i = 0; i < N; i++) { const x = np[i * 3] - dstS.c.x, y = np[i * 3 + 1] - dstS.c.y, z = np[i * 3 + 2] - dstS.c.z, r = Math.hypot(x, y, z) || 1e-5;
      if (r < radAt(SF, x / r, y / r, z / r) - 0.002) bad++;
      if (z / r > 0.45 && np[i * 3 + 1] < ey + 0.012 && np[i * 3 + 1] > bottom) face++; }
    let why = ''; if (bur / N > 0.2) { bad = N; why += 'B'; } if (miss > 0.015) { bad = N; why += 'M' + miss.toFixed(3); } // 推到 4cm 仍埋在新发型里 = 对不上
    { const c = Array.from(gs).sort((x, y) => x - y); if (c[Math.floor(N * 0.1)] > (a.big ? 0.055 : 0.025)) { /* 小件挂在别的饰品上（如胡桃帽上的梅花）搬走会悬空 */ bad = N; why += 'F' + c[Math.floor(N * 0.1)].toFixed(3); } } // 原主人头上就悬空的（光环/浮翼）不外借
    let hid = 0; for (let i = 0; i < N; i++) if (gd[i] < -0.004) hid++; if (hid / N > 0.6) { bad = N; why += 'H' + (hid / N).toFixed(2); } // 被新发型包住看不见
    { const cell = new Uint8Array(12); for (let i = 0; i < N; i++) { const x = np[i * 3] - dstS.c.x, y = np[i * 3 + 1], z = np[i * 3 + 2] - dstS.c.z, r = Math.hypot(x, y - dstS.c.y, z) || 1e-5;
        if (z / r > 0.3 && y > ey - 0.015 && y < ey + 0.01 && Math.abs(x / r) < 0.6) cell[Math.min(11, Math.floor((x / r + 0.6) / 0.1))] = 1; }
      let o = 0; for (const q of cell) o += q; if (o / 12 > 0.34) { face = N; why += 'E'; } } // 挡眼
    let out = null; ACCWHY.set(key, { why, sc: +sc.toFixed(3), off: +off.toFixed(4), bur: +(bur / P.count).toFixed(3), bad: +(bad / P.count).toFixed(3), face: +(face / P.count).toFixed(3), st: +(st / P.count).toFixed(4) });
    if (bad / P.count < 0.05 && face / P.count < 0.03) {
      out = new THREE.BufferGeometry(); for (const k in src.attributes) out.setAttribute(k, src.attributes[k]);
      out.setAttribute('position', new THREE.BufferAttribute(np, 3)); out.setIndex(src.index); out.computeVertexNormals(); out.computeBoundingSphere();
    }
    ACCFIT.set(key, out); return out;
  }
  function fitHair(F, H) {
    const key = F.meta.file + '|' + H.meta.file; if (FIT.has(key)) return FIT.get(key);
    const SF = skullMap(F), SH = skullMap(H), v = new V3();
    const out = H.hairMeshes.map(m => {
      const src = m.geometry, P = src.attributes.position, np = new Float32Array(P.count * 3);
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).sub(SH.c); const r = v.length() || 1e-5; const dx = v.x / r, dy = v.y / r, dz = v.z / r;
        const rh = radAt(SH, dx, dy, dz), rf = radAt(SF, dx, dy, dz);
        // 眼睛以上完全转移；往下逐渐淡出（长发自然垂落，不按脸颊变形）
        const yy = v.y; const w = Math.max(0, Math.min(1, (yy + 0.045) / 0.05));
        let r2 = r + (rf - rh) * w;
        const off = r - rh; // 原本离头皮的距离
        if (w > 0.5 && off > -0.004) r2 = Math.max(r2, rf + Math.max(0.0015, off * 0.9)); // 头皮上方的头发绝不能陷进新头皮
        np[i * 3] = SF.c.x + dx * r2; np[i * 3 + 1] = SF.c.y + dy * r2; np[i * 3 + 2] = SF.c.z + dz * r2;
      }
      const g = new THREE.BufferGeometry();
      for (const k in src.attributes) g.setAttribute(k, src.attributes[k]);
      g.setAttribute('position', new THREE.BufferAttribute(np, 3)); g.setIndex(src.index);
      src.groups.forEach(gr => g.addGroup(gr.start, gr.count, gr.materialIndex));
      g.computeBoundingSphere(); g.computeBoundingBox();
      return g;
    });
    FIT.set(key, out); return out;
  }


  // ---- 程序化发饰：马尾/双马尾/钻头卷/丸子/双丸子/麻花辫/呆毛（贴在“发壳”上，用同一头发着色器→随染发变色、会摆动） ----
  let STRAND = null;
  function strandTex() {
    if (STRAND) return STRAND;
    const W = 64, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
    x.fillStyle = '#b8b8b8'; x.fillRect(0, 0, W, H);
    let s = 7; const rr = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 90; i++) { const px = rr() * W, w = 0.6 + rr() * 2.2, l = 150 + rr() * 100; x.fillStyle = `rgba(${l|0},${l|0},${l|0},${0.35 + rr() * 0.5})`; x.fillRect(px, 0, w, H); }
    for (let i = 0; i < 40; i++) { const px = rr() * W; x.fillStyle = 'rgba(40,40,40,0.35)'; x.fillRect(px, 0, 0.8, H); }
    const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(255,255,255,0.18)'); gr.addColorStop(0.3, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.12)'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    const tx = new THREE.CanvasTexture(cv); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.encoding = THREE.sRGBEncoding; tx.anisotropy = 4; tx.userData = { lum: avgLum(tx) };
    return (STRAND = tx);
  }
  // 沿曲线扫掠：rad(t) 半径，flat 截面压扁（带状发束）
  function sweep(pts, rad, flat = 1, segs = 36, M = 10, twist = 0) {
    const cur = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const fr = cur.computeFrenetFrames(segs, false);
    const pos = [], uv = [], idx = [], P = new V3(), n = new V3();
    for (let i = 0; i <= segs; i++) {
      const tt = i / segs; cur.getPointAt(tt, P); const r = rad(tt), N = fr.normals[i], B = fr.binormals[i];
      for (let j = 0; j <= M; j++) {
        const a = j / M * Math.PI * 2 + twist * tt;
        n.copy(N).multiplyScalar(Math.cos(a) * flat).addScaledVector(B, Math.sin(a));
        pos.push(P.x + n.x * r, P.y + n.y * r, P.z + n.z * r); uv.push(j / M * 1.5, tt * 2.5);
      }
    }
    for (let i = 0; i < segs; i++) for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b = a + M + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    return { g, cur };
  }
  const SHELL = new Map();
  function hairShell(F, H, key, geos) { // 以 F 头骨中心为原点的发型外轮廓（径向最大值），头皮兜底
    if (SHELL.has(key)) return SHELL.get(key);
    const SF = skullMap(F), R = new Float32Array(NT * NP), v = new V3(); let top = -1;
    for (let k = 0; k < R.length; k++) R[k] = -1;
    for (const g of geos) { const P = g.attributes.position; for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); if (v.y < SF.eyeY - 0.03) continue; if (v.y > top) top = v.y; v.sub(SF.c); const r = v.length(); if (r < 1e-5) continue; const k = binOf(v.x / r, v.y / r, v.z / r); if (r > R[k]) R[k] = r; } }
    const S = { c: SF.c, R };
    for (let a = 0; a < NT; a++) for (let b = 0; b < NP; b++) { const k = a * NP + b; R[k] = Math.max(R[k], SF.R[k] + 0.006); }
    S.top = Math.max(top, F.meta.skullTop || 0.1);
    SHELL.set(key, S); return S;
  }
  function onShell(S, x, y, z, inset = 0.004) { const d = new V3(x, y, z).normalize(); return d.multiplyScalar(radAt(S, d.x, d.y, d.z) - inset).add(S.c); }
  function addHairX(hg, look, S, U, disposables) {
    const hx = look.hx; if (!hx) return;
    const st0 = strandTex(); const hm = hairMat({ map: st0, transparent: false, alphaTest: 0, depthWrite: true, name: 'hx' }, U, st0.userData.lum * 1.08); disposables.push(hm);
    const rib = new MTM({ color: hx.rib || '#b01a2a', gradientMap: grad }); disposables.push(rib);
    const add = (g) => { const m = new THREE.Mesh(g, hm); hg.add(m); disposables.push(g); return m; };
    const L = hx.len || 1, rs = hx.seed || 1;
    let s = rs * 9973 + 1; const rr = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const tie = (p, dir, r = 0.012) => { const tg = new THREE.TorusGeometry(r, 0.0035, 6, 16); disposables.push(tg); const m = new THREE.Mesh(tg, rib); m.position.copy(p); m.quaternion.setFromUnitVectors(new V3(0, 0, 1), dir.clone().normalize()); hg.add(m); };
    const bundle = (A, ctrl, n, r0, spread) => { // 一束 = n 根带状细束，末端散开
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + rr(), o = new V3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(spread * (0.4 + rr() * 0.6));
        const lk = 0.85 + rr() * 0.2;
        const pts = ctrl.map((c, k) => { const f = k / (ctrl.length - 1); return A.clone().add(c.clone().multiplyScalar(k ? lk : 1)).addScaledVector(o, 0.3 + f * 1.4); });
        add(sweep(pts, t => r0 * (t < 0.12 ? 0.7 + t / 0.12 * 0.3 : Math.pow(1 - (t - 0.12) / 0.88, 0.75)) + 0.0008, 0.55 + rr() * 0.3, 32, 8, (rr() - 0.5) * 2).g);
      }
    };
    const st = hx.s;
    if (st === 'pony') {
      const A = onShell(S, 0, 0.45, -1);
      bundle(A, [new V3(0, 0, 0), new V3(0, 0.012, -0.035), new V3(0, -0.05 * L, -0.07), new V3(0.008, -0.15 * L, -0.065), new V3(0, -0.26 * L, -0.045)], 6, 0.016, 0.01);
      tie(A.clone().add(new V3(0, 0.004, -0.012)), new V3(0, 0.3, -1), 0.013);
    }
    if (st === 'twin' || st === 'drill') {
      for (const sd of [-1, 1]) {
        const A = onShell(S, sd * 0.85, 0.5, -0.3);
        if (st === 'twin') bundle(A, [new V3(0, 0, 0), new V3(sd * 0.035, 0.012, -0.012), new V3(sd * 0.062, -0.06 * L, -0.02), new V3(sd * 0.07, -0.16 * L, -0.012), new V3(sd * 0.055, -0.27 * L, 0)], 5, 0.014, 0.009);
        else {
          const pts = [], K = 44, turns = 3.2;
          for (let k = 0; k <= K; k++) { const f = k / K, ang = f * turns * Math.PI * 2 * sd, R = 0.004 + 0.02 * Math.min(1, f * 1.6); pts.push(A.clone().add(new V3(sd * (0.028 + 0.02 * f) + Math.cos(ang) * R, 0.004 - 0.2 * L * f, -0.012 + Math.sin(ang) * R))); }
          add(sweep(pts, t => 0.0105 * (1 - t * 0.55) * (t > 0.92 ? (1 - t) / 0.08 : 1) + 0.001, 0.8, 120, 10).g);
          bundle(A, [new V3(0, 0, 0), new V3(sd * 0.02, 0, -0.008), new V3(sd * 0.03, -0.02, -0.012)], 3, 0.01, 0.004);
        }
        tie(A.clone().add(new V3(sd * 0.008, 0.002, -0.004)), new V3(sd, 0.3, -0.2), 0.012);
      }
    }
    if (st === 'bun' || st === 'odango') {
      const spots = st === 'bun' ? [[0, 0.8, -0.6, 0.034]] : [[-0.62, 0.75, -0.25, 0.026], [0.62, 0.75, -0.25, 0.026]];
      for (const [x, y, z, r] of spots) {
        const A = onShell(S, x, y, z, 0.006), d = new V3(x, y, z).normalize();
        const sg = new THREE.SphereGeometry(r, 22, 16); sg.rotateX(Math.PI / 2); sg.scale(1, 1, 0.82);
        sg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 0, 1), d)); const cp = A.clone().addScaledVector(d, r * 0.55); sg.translate(cp.x, cp.y, cp.z); add(sg); // 位置烘进几何体：头发着色器按局部 y 做渐变/摆动
        tie(A.clone().addScaledVector(d, 0.002), d, r * 0.78);
        if (st === 'odango' && L > 1.0) bundle(A.clone().addScaledVector(d, r * 0.3), [new V3(0, 0, 0), new V3(x * 0.03, -0.03, -0.02), new V3(x * 0.04, -0.13 * L, -0.01)], 3, 0.009, 0.006);
      }
    }
    if (st === 'braid' || st === 'braid2') {
      const roots = st === 'braid' ? [[0, -0.1, -1, 0]] : [[-0.8, -0.25, -0.45, -1], [0.8, -0.25, -0.45, 1]];
      for (const [x, y, z, sd] of roots) {
        const A = onShell(S, x, y, z);
        const axis = [new V3(0, 0, 0), new V3(sd * 0.012, -0.05, -0.02), new V3(sd * 0.018, -0.14 * L, -0.02), new V3(sd * 0.014, -0.25 * L, 0.0)].map(v => v.add(A));
        const cur = new THREE.CatmullRomCurve3(axis), fr = cur.computeFrenetFrames(60, false);
        for (let k = 0; k < 3; k++) {
          const pts = []; for (let i = 0; i <= 60; i++) { const f = i / 60, ph = f * 7 * Math.PI * 2 / 3 * 3 + k * Math.PI * 2 / 3, w = 0.009 * (1 - f * 0.35); pts.push(cur.getPointAt(f).addScaledVector(fr.binormals[i], Math.sin(ph) * w).addScaledVector(fr.normals[i], Math.sin(2 * ph) * w * 0.45)); }
          add(sweep(pts, t => 0.0078 * (1 - t * 0.3), 0.75, 140, 8).g);
        }
        const E = cur.getPointAt(1); tie(E, cur.getTangentAt(1), 0.0075);
        bundle(E, [new V3(0, 0, 0), new V3(0, -0.02, 0), new V3(0, -0.045, 0.004)], 4, 0.007, 0.006);
      }
    }
    if (hx.ahoge) {
      const A = onShell(S, 0.1, 1, 0.25, 0.006);
      for (let k = 0; k < (hx.ahoge > 1 ? 2 : 1); k++) {
        const sd = k ? -1 : 1;
        const pts = [new V3(0, 0, 0), new V3(sd * 0.004, 0.024, 0.006), new V3(sd * 0.018, 0.045, -0.004), new V3(sd * 0.034, 0.046, -0.02), new V3(sd * 0.04, 0.034, -0.026)].map(v => v.add(A));
        add(sweep(pts, t => 0.0042 * (1 - t) + 0.0006, 0.3, 30, 6).g);
      }
    }
  }

  // ---------- 第二十一轮 MOD hair_cover ----------
  // 离线评分表 js/hair_cover.js；评分过高（从后面能看到脸内侧/没有后颈）时换成盖得住的头发。
  // 优先自带头发，其次同组可混用的头发中评分最低的几个（按脸+发名确定性挑选，同一颗首级永远一样）。
  let _hcIdx = null;
  function coverScore(fi, hi) {
    const HC = window.HAIR_COVER; if (!HC) return 0;
    if (!_hcIdx) { _hcIdx = new Map(); HC.files.forEach((f, i) => _hcIdx.set(f, i)); }
    const a = _hcIdx.get(T[fi].meta.file), b = _hcIdx.get(T[hi].meta.file);
    if (a == null || b == null) return 0;
    return parseInt(HC.s[a * HC.files.length + b], 36) / 200;
  }
  function coverHair(fi, hi, look) {
    if (!window.HAIR_COVER || !(window.Mods && Mods.on('hair_cover'))) return hi;
    if (coverScore(fi, hi) < 0.055) return hi;
    const face = T[fi];
    const hasHair = i => T[i].hairMeshes.length && !T[i].meta.noHair && OK(i);
    if (hasHair(fi) && coverScore(fi, fi) <= 0.03) return fi;
    const grp = face.meta.grp || 'vroid';
    const all = T.map((t, i) => i).filter(hasHair);
    const comp = all.filter(i => (MIX[grp] || [grp]).includes(T[i].meta.grp || 'vroid'));
    let c = (comp.length ? comp : all).filter(i => coverScore(fi, i) <= 0.02);
    if (!c.length) c = all.filter(i => coverScore(fi, i) <= 0.02);
    if (!c.length) return hi;
    const key = String(look.f) + '|' + String(look.h); let hsh = 7;
    for (let k = 0; k < key.length; k++) hsh = (hsh * 31 + key.charCodeAt(k)) | 0;
    return c[Math.abs(hsh) % c.length];
  }

  function hairAvgCol(t) { // 发型贴图在其 UV 处的平均色（每个头模只算一次）
    if (t._hairCol !== undefined) return t._hairCol; t._hairCol = null;
    try { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const cx = cv.getContext('2d', { willReadFrequently: true }); let r = 0, g2 = 0, b = 0, n = 0;
      for (const m of t.hairMeshes) { const mt = SRC.get(m) || m.material, img = mt.map && mt.map.image; const mc = mt.color || new THREE.Color(1, 1, 1); if (!img) continue;
        cx.clearRect(0, 0, 64, 64); cx.drawImage(img, 0, 0, 64, 64); const D = cx.getImageData(0, 0, 64, 64).data, U = m.geometry.attributes.uv; if (!U) continue; const st = Math.max(1, Math.floor(U.count / 800));
        for (let i = 0; i < U.count; i += st) { let u = U.getX(i) % 1, v = U.getY(i) % 1; if (u < 0) u += 1; if (v < 0) v += 1; const o = (Math.min(63, Math.floor(v * 64)) * 64 + Math.min(63, Math.floor(u * 64))) * 4; if (D[o + 3] < 128) continue;
          r += D[o] / 255 * mc.r; g2 += D[o + 1] / 255 * mc.g; b += D[o + 2] / 255 * mc.b; n++; } }
      if (n) t._hairCol = new THREE.Color(r / n, g2 / n, b / n).convertSRGBToLinear(); } catch (e) { }
    return t._hairCol;
  }
  function napeGeo(t) {
    if (t.napeGeo !== undefined) return t.napeGeo;
    const skins = t.faceMeshes.filter(m => m.userData.kind === 'skin'); t.napeGeo = null; if (!skins.length) return null;
    const bottom = t.meta.bottom != null ? t.meta.bottom : -0.1, P = [], v = new V3();
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, y1 = -1e9;
    for (const m of skins) { const A = m.geometry.attributes.position; for (let i = 0; i < A.count; i++) { v.fromBufferAttribute(A, i); if (v.y < bottom) continue; P.push(v.x, v.y, v.z);
      x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); z0 = Math.min(z0, v.z); z1 = Math.max(z1, v.z); y1 = Math.max(y1, v.y); } }
    if (P.length < 90) return null;
    const eyeY = (t.meta.eye && t.meta.eye[1] != null) ? t.meta.eye[1] : (bottom + y1) / 2;
    const zm = z0 + (z1 - z0) * 0.3, c = new V3((x0 + x1) / 2, eyeY, zm);
    const n0 = P.length; for (let i = 0; i < n0; i += 3) { const z = P[i + 2]; if (z > zm) P.push(P[i], P[i + 1], 2 * zm - z); } // 后半：镜像
    const cut = t.meta.cut || {}, cr = (cut.r || 0.035) * 0.95, cx = cut.x || c.x, cz = cut.z != null ? cut.z : c.z;
    for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; P.push(cx + Math.cos(a) * cr, bottom, cz + Math.sin(a) * cr); } // 底部：接到断面圆
    const R = new Float32Array(NT * NP).fill(-1);
    for (let i = 0; i < P.length; i += 3) { v.set(P[i] - c.x, P[i + 1] - c.y, P[i + 2] - c.z); const r = v.length(); if (r < 1e-5) continue; const k = binOf(v.x / r, v.y / r, v.z / r); if (R[k] < 0 || r < R[k]) R[k] = r; } // 取最内侧：壳永远在脸皮下面（眼窝不被盖住）
    for (let pass = 0; pass < 12; pass++) for (let a = 0; a < NT; a++) for (let b = 0; b < NP; b++) {
      const k = a * NP + b; if (R[k] > 0) continue; let s2 = 0, n = 0;
      for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const aa = a + da; if (aa < 0 || aa >= NT) continue; const kk = aa * NP + ((b + db + NP) % NP); if (R[kk] > 0) { s2 += R[kk]; n++; } }
      if (n) R[k] = s2 / n;
    }
    // 壳必须在本头发最内层之内（あにまさ式等贴头皮的头发会被壳顶穿）：逐方向限到“头发最小半径 - 3mm”（最多缩到一半）
    const HR = new Float32Array(NT * NP).fill(-1);
    for (const m of t.hairMeshes || []) { const A2 = m.geometry.attributes.position; const st = Math.max(1, Math.floor(A2.count / 8000));
      for (let i = 0; i < A2.count; i += st) { v.fromBufferAttribute(A2, i); if (v.y < bottom) continue; v.sub(c); const r = v.length(); if (r < 1e-5) continue; const k = binOf(v.x / r, v.y / r, v.z / r); if (HR[k] < 0 || r < HR[k]) HR[k] = r; } }
    for (let k = 0; k < R.length; k++) if (HR[k] > 0 && R[k] > 0) R[k] = Math.max(R[k] * 0.5, Math.min(R[k], (HR[k] - 0.003) / 0.9));
    const S = { R }, geo = new THREE.SphereGeometry(1, 40, 24), A = geo.attributes.position;
    for (let i = 0; i < A.count; i++) { v.fromBufferAttribute(A, i).normalize(); const r = Math.max(0.02, radAt(S, v.x, v.y, v.z)), ky = v.y < 0 ? 0.99 : 0.9; // 下半只横向缩进：壳底接到断面，从下往上看不到脸的内侧
      A.setXYZ(i, c.x + v.x * r * 0.9, Math.max(bottom + 0.002, c.y + v.y * r * ky), c.z + v.z * r * 0.9); }
    geo.deleteAttribute('uv'); geo.computeVertexNormals(); geo.computeBoundingSphere();
    return (t.napeGeo = geo);
  }
  // R38：外观解析——① CC0 模式：非 CC0 脸/发型按种子固定换成 CC0（旧存档也不再出现非 CC0 头），非 CC0 饰品去掉；
  // ② MOD head_collage（拼图混搭，CC0 关闭时才有意义）：MMD/原神脸不戴自己的头发，固定换成另一个头的发型（发饰随发型）→ 认不出是哪个角色。
  const COLL = new Map();
  function collageHair(fi, seed) {
    const key = fi + '|' + seed; if (COLL.has(key)) return COLL.get(key);
    const c = T.map((t, i) => i).filter(i => i !== fi && T[i].meta.grp === 'mmd' && T[i].hairMeshes.length && !T[i].meta.noHair && OK(i) && !qcBad(i));
    let a = (seed * 2654435761 >>> 0) || 1; const rr = () => (a = Math.imul(a ^ a >>> 13, 1274126177) >>> 0) / 4294967296; let out = -1;
    for (let k = 0; k < 14 && c.length; k++) { const j = c.splice(Math.floor(rr() * c.length), 1)[0]; try { if (hairFitOK(T[fi], T[j])) { out = j; break; } } catch (e) {} }
    COLL.set(key, out); return out;
  }
  function resolve(look) {
    if (!look || !T.length) return look; let L = look, cp = false; const w = () => { if (!cp) { L = Object.assign({}, look); cp = true; } };
    let fi = idxOf(look.f); const hi = idxOf(look.h);
    const gone = fi < 0 && look.f && window.CC0 && CC0.on(); // 非 CC0 模型在 CC0 模式下根本没加载
    if ((fi >= 0 && !OK(fi)) || gone) { const ok = okList(), hs = ok.filter(i => T[i].hairMeshes.length && !T[i].meta.noHair), h = window.CC0 ? CC0.hash(look.f + '|' + (look.seed || 0)) : 7; w(); fi = ok[h % ok.length]; L.f = T[fi].meta.file; L.h = (!hs.length || (h >>> 9) % 3 === 0) ? L.f : T[hs[(h >>> 4) % hs.length]].meta.file; delete L.ax; if (L.hn === '原色') L.hn = look.hn2 || '乌黑'; }
    else if ((hi >= 0 && !OK(hi)) || (hi < 0 && look.h && look.h !== look.f && window.CC0 && CC0.on())) { w(); L.h = L.f; }
    if (L.ax && L.ax.some(e => !OK(idxOf(e.f)))) { w(); L.ax = L.ax.filter(e => OK(idxOf(e.f))); }
    if (fi >= 0 && T[fi].meta.grp === 'mmd' && window.Mods && Mods.on('head_collage') && idxOf(L.h) === fi) { const j = collageHair(fi, (look.seed || 0) + 17); if (j >= 0) { w(); L.h = T[j].meta.file; L.hn = '原色'; delete L.hx; delete L.hn3; } }
    return L;
  }
  const OWNACC = new Map();
  function ownAcc(t) { // R38 拼图：这张 MMD 脸模自带的头饰网格（帽子/头冠/面纱/发簪…，判定同 accLib，但不排除“坏头”）
    if (OWNACC.has(t)) return OWNACC.get(t); const out = new Set(), ey = (t.meta.eye && t.meta.eye[1] != null) ? t.meta.eye[1] : 0;
    for (const m of t.faceMeshes) { const nm = (SRC.get(m) || {}).name || ''; if (!/^cloth/i.test(nm)) continue; const P = m.geometry.attributes.position; if (P.count < 24) continue;
      m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox; if ((bb.min.y + bb.max.y) / 2 < ey - 0.005 || bb.max.y < ey + 0.01) continue; out.add(m); }
    OWNACC.set(t, out); return out;
  }
  function create(look, opts = {}) {
    look = resolve(look);
    let fi = idxOf(look.f); if (fi < 0) fi = 0;
    let hi = idxOf(look.h); if (hi < 0) hi = fi;
    hi = coverHair(fi, hi, look); // 第二十一轮 MOD hair_cover：避免借来的头发盖不住后脑 → 后颈/后脑露洞
    const F = T[fi], H = T[hi];
    const U = makeUniforms(look, F.meta, H.meta, H);
    const g = new THREE.Group();
    const own = [];
    const matMap = new Map();
    const getMat = (m, t) => {
      const src = SRC.get(m); const k = m.userData.kind;
      const key = src.uuid;
      if (matMap.has(key)) return matMap.get(key);
      let out;
      const keep = t.meta && t.meta.grp === 'mmd' && (k === 'hair' || k === 'brow' || k === 'iris'); // MMD 头模：保留原贴图配色，不重新染色
      if (k === 'cut') out = getCut();
      else if (keep) { out = new MTM({ map: src.map || null, color: src.color ? src.color.clone() : new THREE.Color(1, 1, 1), gradientMap: grad, transparent: src.transparent, alphaTest: src.alphaTest || (k === 'hair' ? 0.4 : 0), side: THREE.DoubleSide, depthWrite: src.depthWrite }); own.push(out); }
      else if (k === 'hair') { out = hairMat(src, U, t.lum.get(src) || 0.6); own.push(out); }
      else if (k === 'brow') { out = browMat(src, U, t.lum.get(src) || 0.4); own.push(out); }
      else if (k === 'iris') { out = irisMat(src, U, t.lum.get(src) || 0.5); own.push(out); }
      else if (k === 'skin') { out = skinMat(src, U); own.push(out); }
      else {
        out = t.shared.get(key);
        if (!out) {
          const ew = /EyeWhite/i.test(src.name || '');
          if (ew && window.Mods && Mods.on('head_repair')) {
            // 第十八轮：不再用不受光的 Basic（亮处发光、比脸亮一截）；改为受光卡通 + 少量自发光打底，暗处也不会变黑
            const c0 = src.color ? src.color.clone() : new THREE.Color(1, 1, 1);
            const ewk = (window.Mods && Mods.on('eye_white')) ? [0.62, 0.62] : [0.9, 0.28]; // 第二十四轮 MOD eye_white：暗洞里眼白发黑 → 一半受光一半自亮
            out = new MTM({ map: src.map || null, color: c0.clone().multiplyScalar(ewk[0]), emissive: c0.clone().multiplyScalar(ewk[1]), emissiveMap: src.map || null, gradientMap: grad, transparent: src.transparent, opacity: src.opacity, alphaTest: src.alphaTest ? Math.min(src.alphaTest, 0.25) : 0.15, side: THREE.DoubleSide, depthWrite: !!(window.Mods && Mods.on('eye_white')), name: src.name + ' · readable sclera' }); // eye_white：写深度，SAO 不再把眼白当成深洞压黑
          } else out = new MTM({ map: src.map || null, color: src.color ? src.color.clone() : new THREE.Color(1, 1, 1), gradientMap: grad, transparent: src.transparent, alphaTest: src.alphaTest, side: src.side, depthWrite: ew ? false : src.depthWrite });
          t.shared.set(key, out);
        } // 修复 MOD：眼白不再被幽暗洞窟光照压黑；关闭 MOD 时保留原 toon 路径
      }
      matMap.set(key, out); return out;
    };
    const FM = null; // face_morph 已删除：旧存档的 look.fm 被忽略
    const fmAB = (fk) => fk === 'eye' || fk === 'skin' ? [[FM.ew, FM.eh, FM.tilt], [FM.sp, FM.dy]] : [[FM.bs, FM.bs, FM.bt], [FM.sp * 0.5, FM.bdy]];
    const fmMat = (mt, src, kind) => {
      const fk = FM && fwKind(src, kind); if (!fk) return mt;
      const key = 'fm|' + mt.uuid; if (matMap.has(key)) return matMap.get(key);
      let x = mt; if (!own.includes(mt)) { x = mt.clone(); x.onBeforeCompile = mt.onBeforeCompile; x.customProgramCacheKey = mt.customProgramCacheKey; own.push(x); }
      const [A, B] = fmAB(fk); fwWrap(x, A, B, F.eyeC, fk === 'skin' ? 0.05 : 0); matMap.set(key, x); return x;
    };
    if (FM) g.scale.set(FM.fx, FM.fy, FM.fz);
    const presets = F.meta.presets || {};
    const byName = {};
    const hlMeshes = [];
    const strip = (F.meta.grp === 'mmd' && hi !== fi && window.Mods && Mods.on('head_collage')) ? ownAcc(F) : null; // R38 拼图：拆掉原作自带头饰（梅花帽/礼帽/面纱…），否则一眼认出是谁
    for (const m of F.faceMeshes) {
      if (strip && strip.has(m)) continue;
      if (m.userData.kind === 'hl' && !opts.alive) continue; // 死眼：去掉高光（通灵 MV 里的“生前”版本保留）
      const c = new THREE.Mesh(m.geometry, fmMat(getMat(m, F), SRC.get(m), m.userData.kind)); c.name = m.name; c.renderOrder = m.renderOrder; c.userData.kind = m.userData.kind;
      if (m.userData.kind === 'hl') hlMeshes.push(c);
      if (m.morphTargetInfluences) { c.morphTargetInfluences = new Array(m.morphTargetInfluences.length).fill(0); c.morphTargetDictionary = m.morphTargetDictionary; }
      byName[m.name] = c; g.add(c);
    }
    // 第二十五轮 MOD nape_fill：MMD 脸模只是“前面具”，后脑/后颈是空的（从后下方能看到脸的内侧、眼睛透出）。
    // 用本头自己的脸部皮肤推出头骨轮廓（前半=脸模，后半=按耳平面镜像，底部接到断面圆），略缩进藏在脸/头发里面。
    if (F.meta.grp === 'mmd' && window.Mods && Mods.on('nape_fill')) try {
      const ng = napeGeo(F);
      if (ng) { const nm = new MTM({ color: new THREE.Color(look.skinHex || '#fbe6da').multiplyScalar(0.86), gradientMap: grad }); own.push(nm);
        // 后脑部分涂发色（真 MMD 模型的头皮本就是发色；あにまさ式短后发+双马尾之间会露出这块），眼线以下渐变回肤色（后颈）
        const hc = H.meta.grp === 'mmd' ? hairAvgCol(H) : new THREE.Color(look.hc1 || '#333333'); const ey = F.meta.eye ? F.meta.eye[1] : 0;
        if (hc) nm.onBeforeCompile = sh => { sh.uniforms.uHairC = { value: hc.clone().multiplyScalar(0.8) }; sh.uniforms.uEyeY = { value: ey };
          sh.vertexShader = sh.vertexShader.replace('void main() {', 'varying float vNy;\nvoid main() { vNy = position.y;');
          sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'varying float vNy; uniform vec3 uHairC; uniform float uEyeY;\nvoid main() {')
            .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, uHairC, smoothstep(uEyeY - 0.05, uEyeY - 0.01, vNy));'); };
        nm.customProgramCacheKey = () => 'nape2';
        const nape = new THREE.Mesh(ng, nm); nape.name = '__NAPE__'; nape.userData.kind = 'nape'; g.add(nape); }
    } catch (e) { console.warn('nape_fill', F.meta.file, e); }
    // 表情：持有时可热切换，不眨眼、不重建模型。
    const setExpression = (ex0 = {}) => {
      for (const m of Object.values(byName)) if (m.morphTargetInfluences) m.morphTargetInfluences.fill(0);
      // 限制张嘴幅度：VRoid 的 A/O/Surprised 大幅张嘴会让下巴脱离脸型
      const ex = Object.assign({}, ex0); if (ex.surprised > 0.5) ex.surprised = 0.5;
      const MOUTH = ['aa', 'oh', 'ee', 'ih', 'ou'];
      const mSum = MOUTH.reduce((s, k) => s + (ex[k] || 0), 0) + (ex.surprised || 0) * 0.5;
      if (mSum > 0.28) { const f = 0.28 / mSum; MOUTH.forEach(k => { if (ex[k]) ex[k] *= f; }); if (ex.surprised) ex.surprised = Math.min(ex.surprised, 0.5 * Math.max(0.4, f)); }
      for (const k in ex) {
        const binds = presets[k]; if (!binds) continue;
        for (const [mn, idx, wt] of binds) { const c = byName[mn]; if (c && c.morphTargetInfluences) c.morphTargetInfluences[idx] = Math.min(1, c.morphTargetInfluences[idx] + wt * ex[k]); }
      }
    };
    setExpression(look.ex || {});
    // 第十二轮：二次元"眼睛透过刘海"——眼白/虹膜/眼线/睫毛/眉毛先写入本头专属模板值（只在被脸皮深度测试通过、真正可见处），
    // 本头的头发跳过这些像素。长刘海盖住眼睛的模型不再"白眼"。每个头用不同的 ref，别的头的头发不受影响。
    const SREF = (stencilSeq = stencilSeq % 254 + 1);
    const maskMats = new Map();
    for (const m of F.faceMeshes) {
      const nm = (SRC.get(m) || {}).name || '', k = m.userData.kind;
      if (!(k === 'iris' || k === 'brow' || /EyeWhite|Eyeline|Eyelash|Iris|Brow/i.test(nm))) continue;
      const c0 = byName[m.name]; if (!c0) continue;
      const src = SRC.get(m); let mm = maskMats.get(src);
      if (!mm) { mm = new THREE.MeshBasicMaterial({ map: src.map || null, alphaTest: 0.35, colorWrite: false, depthWrite: false, side: src.side, stencilWrite: true, stencilRef: SREF, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp }); mm.onBeforeCompile = (sh) => { // 只在镜头位于脸前方时生效；从背后/侧后看（VRoid 后脑没有皮肤遮挡）不许在头发上开洞
          sh.vertexShader = sh.vertexShader.replace('void main() {', 'varying float vFront;\nvoid main() {').replace('#include <project_vertex>', '#include <project_vertex>\n vec4 wpM = modelMatrix * vec4(transformed, 1.0); vFront = dot(normalize((modelMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz), normalize(cameraPosition - wpM.xyz));');
          sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'varying float vFront;\nvoid main() {\n if (vFront < 0.2) discard;');
        };
        mm.customProgramCacheKey = () => 'eyemask1';
        if (FM) { const fk = fwKind(src, k); if (fk) { const [A, B] = fmAB(fk); fwWrap(mm, A, B, F.eyeC); } }
        maskMats.set(src, mm); own.push(mm); }
      const mk = new THREE.Mesh(m.geometry, mm); mk.renderOrder = 1; mk.name = m.name + '_mask';
      if (c0.morphTargetInfluences) { mk.morphTargetInfluences = c0.morphTargetInfluences; mk.morphTargetDictionary = c0.morphTargetDictionary; }
      g.add(mk);
    }
    const stencilHair = (mat) => { mat.stencilWrite = true; mat.stencilRef = SREF; mat.stencilFunc = THREE.NotEqualStencilFunc; mat.stencilFail = THREE.KeepStencilOp; mat.stencilZFail = THREE.KeepStencilOp; mat.stencilZPass = THREE.KeepStencilOp; };
    // 发型
    const hg = new THREE.Group(); g.add(hg);
    // 借用发型：按头皮高度图精确贴合（见 fitHair），不再整体缩放
    if (hi === fi) { hg.scale.set(1.008, 1.008, 1.008); hg.position.z = 0.002; }
    const hairGeos = hi !== fi ? fitHair(F, H) : H.hairMeshes.map(m => m.geometry);
    H.hairMeshes.forEach((m, i) => { const mt = getMat(m, H); stencilHair(mt); const c = new THREE.Mesh(hairGeos[i], mt); c.renderOrder = Math.max(2, m.renderOrder); hg.add(c); });
    const disposables = [];
    const S = hairShell(F, H, F.meta.file + '|' + H.meta.file + (hi === fi ? '|own' : ''), hairGeos);
    if (look.hx && F.meta.grp !== 'godette') try { addHairX(hg, look, S, U, disposables); hg.traverse(o => { if (o.isMesh && o.material && o.material.customProgramCacheKey && o.material.customProgramCacheKey() === 'hair4') { stencilHair(o.material); o.renderOrder = 2; } }); } catch (e) { console.warn('hairX', e); }
    addAccessories(g, look, F.meta, U, disposables, S.top);
    if (look.ax && look.ax.length && window.Mods && Mods.on('acc_mix')) try { // 第二十五轮：跨头饰品（不合格的直接不显示）
      const lib = accLib();
      let axBox = null;
      for (const e of look.ax) { const a = lib.find(x => x.f === e.f && x.n === e.n); if (!a) continue;
        const geo = fitAcc(F, S, a, F.meta.file + '|' + H.meta.file + '|' + e.f + '|' + e.n); if (!geo) continue;
        { if (!geo.boundingBox) geo.computeBoundingBox(); const gb = axBox || (axBox = new THREE.Box3().setFromObject(g).expandByScalar(0.003)); if (!gb.intersectsBox(geo.boundingBox)) continue; } // R38：悬空（不挨着头/发）的借用饰品不显示
        const c = new THREE.Mesh(geo, getMat(a.m, a.t)); c.name = '__AX__' + e.n; c.renderOrder = 2; g.add(c); }
    } catch (err) { console.warn('acc_mix', err); }
    if (window.HeadWear && look.hw && look.hw.length && (!window.Mods || Mods.on('headwear')) && !(window.Mods && Mods.on('head_native') && (() => { const fi = idxOf(look.f); return fi >= 0 && T[fi].meta.grp === 'mmd'; })())) try { /* R36b head_native：MMD/原神头自带发型和头饰，不再额外叠程序化头饰 */ HeadWear.build({ g, look, S, onShell, grad, disp: disposables }); } catch (e) { console.warn('headwear', e); }
    const radius = 0.1;
    return {
      group: g, U, radius, meta: F.meta, hl: hlMeshes, presets,
      setSway(v) { U.sway.value.copy(v); },
      setExpression,
      dispose() { own.forEach(m => m.dispose()); disposables.forEach(m => m.dispose()); }
    };
  }

  return {
    MTM, init, create, randomLook, HAIR, EYE, SKIN, faceSkin, tick(t) { GT.value = t; },
    // R29 body_match：这个头实际显示的发色（mmd 发型用贴图平均色，其他用染发色），给 foe.js 挑配色协调的身体
    hairColor(look) { try { look = resolve(look); const H = T[idxOf(look.h || look.f)]; if (H && H.meta.grp === 'mmd') { const c = hairAvgCol(H); if (c) return c.clone().convertLinearToSRGB(); } return new THREE.Color(look.hc1 || '#333333'); } catch (e) { return null; } },
    get ready() { return ready; },
    get count() { return T.length; },
    files: () => T.map(t => t.meta.file),
    mixDebug: { hairOK: (f, h) => hairFitOK(T[idxOf(f)], T[idxOf(h)]), hairSc: (f, h) => (hairFitOK(T[idxOf(f)], T[idxOf(h)]), FITSC.get(f + '|' + h)), acc: () => accLib().map(a => ({ f: a.f, n: a.n, big: a.big, src: (SRC.get(a.m) || {}).name, vc: a.m.geometry.attributes.position.count })), why: () => [...ACCWHY].map(([k, v]) => k + ' ' + JSON.stringify(v)) },
    debug: () => T.map(t => ({ f: t.meta.file, eye: !!t.eyeC, m: t.faceMeshes.map(m => m.name + ':' + ((SRC.get(m) || {}).name) + ':' + m.userData.kind + ':' + (m.geometry.attributes.position.count)) })),
    // 第十六轮（总管理师）：某个外观会用到的脸/发型贴图 —— 倒袋前逐帧 renderer.initTexture 预上传，避免首次渲染时同步解码大贴图卡顿
    resolve, mapsFor(look) { look = resolve(look); const out = new Set(); for (const k of [look.f, look.h]) { let i = idxOf(k); if (i < 0) i = 0; const t = T[i]; if (t) t.meshes.forEach(m => { const s = SRC.get(m) || m.material; if (s && s.map) out.add(s.map); }); } return [...out]; },
    meta: (file) => { if (file && typeof file === 'object') file = resolve(file).f; /* R38：可传外观对象（CC0 替换后的脸） */ const i = idxOf(file); return i >= 0 ? T[i].meta : null; },
    cutDbg: () => T.map(t => t.meta.file + ' ' + JSON.stringify(t.meta._cutDbg || null)),
    credits: () => T.map(t => t.meta.name + ' — ' + t.meta.credit)
  };
})();
