// 壳层草地（MOD shell_grass，默认开）——js/wgrass.js。接口：WGrass.build(tg, o) → { group, update(p, now) }
// R52 · MOD grass_master（默认开，依赖 shell_grass）：画质 Agent 的大师级重写（v2）；关掉 = R50 原版 12 层壳（v1，代码原样保留在下面）。
// 用户：“壳形草地的效果非常不好，但是感觉有潜力，大师级写下”。仍是 shell texturing（无草模型、无贴图，全部在着色器里），但：
//  · 实例化壳层：地形子网格按 9m 分块，每块画 N 层（ultra 48 / high 32 / mid 18），从上往下；视锥剔除 + 距离 LOD（远块隔 2/4 层抽稀）。
//  · 两遍渲染：深度预通道只做草叶求交（便宜），着色通道 depthFunc=EQUAL → 每个像素只着色一次（光照/阴影/IBL 不再按层数翻倍）。
//  · 扫掠子步：每层片元把“本层 → 下一层”的视线切成 K 段（ultra 4 / high 3 / mid 2），线段-椭圆求交 → 低角度不再是一摞薄片。
//  · 草叶 = 扁椭圆截面、随机朝向、叶尖收窄、个体卷曲；梳理过的倒向场 + 高矮成片 + 秃斑 + 枯叶斑块 + 少量野花。
//    静态的大尺度场（覆盖率/高矮/色块/倒向/枯斑）建图时在 CPU 上烘进顶点属性，片元里不再算噪声。
//  · 风：全局风向 + 滚动阵风（看得见的“风浪”，阵风处叶片压弯、翻出亮面）+ 个体颤动；玩家 / 敌人 / 野兽走过会把草拨开。
//  · 光照：MeshStandard 打补丁（和地面同一套 IBL / 太阳阴影 / 雾）；叶片法线由截面 + 弯曲推出；包裹漫反射、逆光透射、
//    根部 AO + 冠层自遮挡、叶尖蜡质高光。草不走 world_cel 硬阴影（草要软光）。
//  · 抗锯齿：4×MSAA（ultra）时 alpha-to-coverage + 解析边缘；远处按像素足迹加粗叶片、降低个体反差 → 不闪烁。
//  · 衔接：叶根渐变到地面贴图颜色；长草区的地面染成草冠色、近处压暗（叶间阴影）→ 草地边缘与地面无缝。
// 测试：?gq=ultra|high|mid 强制草地档位；?wg=0 临时关；?wg=1 临时用 v1。
window.WGrass = (() => {
  'use strict';
  const QS = new URLSearchParams(location.search);
  const M = (id) => !(window.Mods && Mods.on && Mods.on(id) === false);
  const on = () => QS.get('wg') !== '0' && M('shell_grass');
  const v2on = () => QS.get('wg') !== '1' && M('grass_master');
  const LUSH = { meadow: 1, forest: 0.9, swamp: 0.8, village: 0.8, wilds: 0.38, ruins: 0.5, fortress: 0.42, capital: 0.45, abyss: 0.06, peak: 0.12 };
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const seeded = (s) => { let a = ((s || 1) ^ 0x9E3779B9) >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = (t + Math.imul(t ^ t >>> 7, 61 | t)) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const vnoise = (seed) => { const h = (x, y) => { let n = (x * 374761393 + y * 668265263 + seed * 69069) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
    return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf); return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - w) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * w; }; };
  const BIO = { meadow: ['fresh', 'yg', 'lime', 'straw'], forest: ['moss', 'bg', 'olive', 'fresh'], swamp: ['olive', 'moss', 'bg'], village: ['fresh', 'yg', 'straw'], wilds: ['straw', 'rust', 'olive', 'yg'], ruins: ['olive', 'straw', 'yg', 'moss'], fortress: ['fresh', 'olive', 'straw'], capital: ['fresh', 'olive', 'yg'], peak: ['bg', 'straw', 'moss'], abyss: ['moss', 'rust'] };
  const FLOWERS = [[.95, .93, .85], [.95, .8, .2], [.85, .35, .55], [.55, .4, .85], [.95, .5, .15]];

  // ======================= v2（R52 grass_master）=======================
  const TIER = { ultra: { N: 32, K: 4, far: 36 }, high: { N: 24, K: 3, far: 30 }, mid: { N: 16, K: 2, far: 22 } };
  if (+QS.get('gn')) for (const k in TIER) TIER[k].N = +QS.get('gn');
  if (+QS.get('gk')) for (const k in TIER) TIER[k].K = +QS.get('gk');
  const postFx = () => { const G = window.__game; return (G && (G.postFx || G.post)) || null; };
  const tierOf = () => { const q = QS.get('gq'); if (TIER[q]) return q; const p = postFx(); return p && TIER[p.tier] ? p.tier : 'high'; };
  const msaaOn = () => { const p = postFx(), G = window.__game, r = G && G.renderer; return !!(p && p.style === 'master' && window.Master && Master.Q && Master.Q[p.tier] && Master.Q[p.tier].msaa > 0 && r && r.capabilities.isWebGL2); };
  const HASH = `
    float wgH1(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    float wgN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(wgH1(i), wgH1(i + vec2(1.0, 0.0)), f.x), mix(wgH1(i + vec2(0.0, 1.0)), wgH1(i + vec2(1.0, 1.0)), f.x), f.y); }`;
  const VERT_PRE = `
    attribute float gm; attribute float aI; attribute vec4 wgF; attribute vec2 wgL;
    uniform float uN, uStride, uH, uFar, uRad, uT, uWind; uniform vec2 uWD, uSeed;
    varying vec3 vGW; varying vec3 vGN; varying float vGH; varying float vGS; varying float vGF; varying float vGM; varying vec4 vGF4; varying vec3 vGB;
    ${HASH}`;
  const VERT_MAIN = `
    { float lay = uN - 1.0 - aI * uStride; // 实例 0 = 最上层：从上往下画
      float hn = (lay + 1.0) / uN;
      vec3 wp0 = (modelMatrix * vec4(position, 1.0)).xyz; vec3 wn = normalize(mat3(modelMatrix) * normal);
      float dc = distance(wp0.xz, cameraPosition.xz);
      float fd = (1.0 - smoothstep(uFar * 0.55, uFar, dc)) * (1.0 - smoothstep(uRad - 4.0, uRad, length(wp0.xz)));
      float hk = uH * (0.6 + 0.4 * fd);
      transformed += normal * (hk * hn);
      vGW = wp0 + wn * (hk * hn); vGN = wn; vGH = hk * hn; vGS = hk / uN * uStride; vGF = fd;
      vGM = gm * smoothstep(0.74, 0.9, wn.y); vGF4 = wgF;
      float g1 = wgN(wp0.xz * 0.06 - uWD * uT * 0.42 + uSeed), g2 = wgN(wp0.xz * 0.17 - uWD * uT * 1.05 + uSeed + 5.7);
      float gust = smoothstep(0.32, 0.85, g1 * 0.62 + g2 * 0.38); // 沿风向滚动的阵风：看得见的风浪
      float ph = uT * 2.1 + dot(wp0.xz, vec2(1.3, 0.9));
      vec2 fl = vec2(sin(ph), cos(ph * 0.83 + 1.7)) * 0.02 * uWind * (0.4 + gust);
      vGB = vec3((uWD * uWind * (0.035 + 0.17 * gust) + fl) * (uH / 0.45) + wgL, gust); }`;
  const FRAG_PRE = `
    uniform float uT, uH, uDens, uWid, uFlD, uDry, uA2C, uGS, uWind;
    uniform vec2 uCell; uniform vec3 uBase, uTip, uBase2, uTip2, uFl, uDryC; uniform vec4 uPush[6]; uniform sampler2D uGT;
    varying vec3 vGW; varying vec3 vGN; varying float vGH; varying float vGS; varying float vGF; varying float vGM; varying vec4 vGF4; varying vec3 vGB;
    float gTr = 0.0, gSelf = 1.0, gAO = 1.0, gA = 1.0, gT = 0.0; vec3 gTrC = vec3(0.0), gNW = vec3(0.0, 1.0, 0.0);
    vec4 wgH4(vec2 p) { vec4 p4 = fract(vec4(p.xyxy) * vec4(0.1031, 0.1030, 0.0973, 0.1099)); p4 += dot(p4, p4.wzxy + 33.33); return fract((p4.xxyz + p4.yzzw) * p4.zywx); }
    struct WB { float a; float t; float r; float x; vec2 d; float bh; };
    // 一根草叶 × 一段视线：pm = 线段中点（世界 xz），sv = 半段向量，h = 中点离地高度，hs = 远处变矮系数
    WB wgBlade(vec2 pm, vec2 sv, float h, vec2 bend, float fp, float cover, float tall, float hs) {
      WB o = WB(0.0, 0.0, 0.0, 0.0, vec2(1.0, 0.0), 1.0);
      float hn = h / (uH * hs);
      vec2 uv = (pm - bend * hn * hn) * uDens + uCell;
      vec2 c = floor(uv), f = uv - c; vec4 r = wgH4(c);
      if (r.z > cover) return o;
      bool flw = fract(r.w * 31.7) > 1.0 - uFlD;
      float bh = uH * hs * mix(0.4, 1.0, flw ? 1.0 : r.w * r.w) * tall;
      float t = h / bh; if (t >= 1.0) return o;
      vec2 d = vec2(fract(r.z * 13.17), fract(r.w * 7.73)) - 0.5; d *= inversesqrt(dot(d, d) + 1e-4); vec2 nd = vec2(-d.y, d.x);
      float w = uWid * (0.75 + 0.5 * r.y) * sqrt(max(1.0 - t * t * t, 0.0));
      if (flw && t > 0.84) w = max(w, uWid * 1.3);
      vec2 c0 = vec2(0.5) + (r.xy - 0.5) * (1.0 - 2.0 * uWid - 0.06);
      c0 += nd * (r.w - 0.5) * 0.45 * t * t;                                    // 个体卷曲
      float wx = max(w, fp * 0.55), wy = max(w * 0.45 + 0.015, fp * 0.55);    // 远处按像素足迹加粗
      vec2 e = f - c0, s = sv * uDens;
      vec2 A = vec2(dot(e - s, d) / wx, dot(e - s, nd) / wy), AB = vec2(dot(s, d) / wx, dot(s, nd) / wy) * 2.0;
      vec2 cl = A + AB * clamp(-dot(A, AB) / max(dot(AB, AB), 1e-6), 0.0, 1.0); // 线段到叶心的最近点（椭圆度量）
      float q = length(cl);
      o.a = clamp((1.0 - q) * wy / fp + 0.5, 0.0, 1.0);
      o.t = t; o.r = r.w; o.x = clamp(cl.x, -1.0, 1.0); o.d = d; o.bh = bh;
      return o;
    }`;
  const FRAG_MAIN = `
    { vec2 wfw = fwidth(vGW.xz) * uDens; float fp = max(max(wfw.x, wfw.y) * 0.75, 1e-3); // 先求导（之后有 discard）
      if (vGF < 0.005 || vGM < 0.02) discard;
      float cover = vGF4.x * vGM * smoothstep(0.0, 0.45, vGF);
      if (cover < 0.01) discard;
      float hs = 0.6 + 0.4 * vGF, gust = vGB.z, wk = uH / 0.45;
      if (vGH - vGS > uH * hs * vGF4.y) discard; // 本层视线段整体高于这里最高的草叶
      vec2 bend = vGB.xy;
      for (int i = 0; i < 6; i++) { vec4 q = uPush[i]; vec2 dd = vGW.xz - q.xz; float l2 = dot(dd, dd);
        if (l2 < q.w * q.w) { float l = sqrt(l2), k = 1.0 - l / q.w; bend += dd / max(l, 0.05) * k * k * 0.42 * wk; } } // 被人踩过/拨开
      vec3 V = normalize(vGW - cameraPosition), Nt = normalize(vGN);
      float vy = dot(V, Nt), dh = vGS;
      vec3 stp = vy < -0.02 ? V * (dh / -vy) : vec3(0.0);
      float sl = length(stp.xz); if (sl > 0.4) stp *= 0.4 / sl;
      float thr = uA2C > 0.5 ? 0.04 : 0.5;
      WB hb = WB(0.0, 0.0, 0.0, 0.0, vec2(1.0, 0.0), 1.0); float hh = vGH;
      for (int k = 0; k < WG_K; k++) { // 扫掠子步：K 段线段覆盖“本层 → 下一层”的视线
        float s = (float(k) + 0.5) / float(WG_K), h = vGH - dh * s;
        if (h <= 0.002) break;
        WB b = wgBlade(vGW.xz + stp.xz * s, stp.xz * (0.5 / float(WG_K)), h, bend, fp, cover, vGF4.y, hs);
        if (b.a > thr) { hb = b; hh = h; break; }
      }
      if (hb.a <= thr) discard;
      gA = uA2C > 0.5 ? hb.a : 1.0;
      #ifdef WG_PRE
        gl_FragColor = vec4(0.0, 0.0, 0.0, gA); return;
      #endif
      float t = hb.t; gT = t;
      float cm = vGF4.z, vary = 1.0 - smoothstep(0.3, 1.1, fp);
      vec3 alb = mix(mix(mix(uBase, uTip, 0.3), mix(uBase2, uTip2, 0.3), cm), mix(uTip, uTip2, cm), pow(t, 0.85));
      alb *= 1.0 + (hb.r - 0.5) * 0.5 * vary;
      float r2 = fract(hb.r * 17.13), dry = step(1.0 - uDry - vGF4.w * 0.35, r2) * mix(0.6, 1.0, vary);
      alb = mix(alb, uDryC * (0.7 + 0.6 * fract(hb.r * 5.71)), dry * smoothstep(0.0, 0.45, t));
      alb = mix(alb, alb * vec3(1.2, 1.12, 0.72), smoothstep(0.72, 1.0, t) * 0.45); // 晒白的叶尖
      bool flw = fract(hb.r * 31.7) > 1.0 - uFlD && t > 0.84;
      if (flw) alb = uFl * (0.8 + 0.3 * r2);
      #ifdef USE_COLOR
        alb *= mix(vec3(1.0), vColor.rgb, 0.35);
      #endif
      alb = mix(texture2D(uGT, vGW.xz * uGS).rgb * 0.75, alb, smoothstep(0.0, 0.2, t)); // 叶根融进地面
      alb *= 1.0 + gust * 0.22 * t;
      diffuseColor.rgb = alb;
      vec3 dW = vec3(hb.d.x, 0.0, hb.d.y), fN = vec3(-hb.d.y, 0.0, hb.d.x);
      if (dot(fN, V) > 0.0) fN = -fN;
      vec3 nb = normalize(fN + dW * hb.x * 0.75);
      vec3 bw = vec3(bend.x, 0.0, bend.y) / max(uH, 0.05);
      gNW = normalize(mix(nb, Nt, 0.12 + 0.5 * t * t) - bw * t * 0.7);
      if (flw) gNW = normalize(Nt - V * 0.5);
      float hc = hh / (uH * hs);
      gAO = mix(0.18, 1.0, smoothstep(0.0, 0.85, hc));
      gSelf = mix(0.25, 1.0, smoothstep(0.05, 0.9, hc));
      gTr = smoothstep(0.1, 1.0, t) * (1.0 - 0.6 * dry) * (flw ? 0.3 : 1.0);
      gTrC = alb * vec3(1.35, 1.5, 0.75) * 1.2;
    }`;
  const LIGHT = `
    void RE_Direct_WG( const in IncidentLight directLight, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
      float nl = dot( geometry.normal, directLight.direction ); vec3 c = directLight.color * gSelf;
      reflectedLight.directDiffuse += c * saturate( ( nl + 0.55 ) / 1.55 ) * BRDF_Lambert( material.diffuseColor );
      reflectedLight.directSpecular += c * saturate( nl ) * BRDF_GGX( directLight.direction, geometry.viewDir, geometry.normal, material.specularColor, material.specularF90, material.roughness ) * 0.6;
      float bl = pow( saturate( dot( -geometry.viewDir, directLight.direction ) ), 4.0 );
      reflectedLight.directDiffuse += directLight.color * gTrC * ( bl * 0.85 + saturate( -nl ) * 0.25 ) * gTr * mix( 0.45, 1.0, gSelf ) * RECIPROCAL_PI;
    }
    #undef RE_Direct
    #define RE_Direct RE_Direct_WG`;
  function patchGrass(m, U, su, pre) {
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U, su);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + VERT_PRE).replace('#include <begin_vertex>', '#include <begin_vertex>\n' + VERT_MAIN);
      // 预通道与着色通道顶点着色器逐字相同（EQUAL 深度测试要求位置完全一致）；WG_PRE 只写进片元
      sh.fragmentShader = (pre ? '#define WG_PRE\n' : '') + '#define CHAR_MAT\n' + sh.fragmentShader // CHAR_MAT：不吃 world_cel 的硬阴影
        .replace('#include <common>', '#include <common>\n' + FRAG_PRE)
        .replace('#include <lights_physical_pars_fragment>', '#include <lights_physical_pars_fragment>\n' + LIGHT)
        .replace('#include <map_fragment>', FRAG_MAIN)
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix(0.72, 0.45, gT);')
        .replace('#include <normal_fragment_maps>', 'normal = normalize((viewMatrix * vec4(gNW, 0.0)).xyz);')
        .replace('#include <aomap_fragment>', '#include <aomap_fragment>\n reflectedLight.indirectDiffuse *= gAO; reflectedLight.indirectSpecular *= gAO * gAO;')
        .replace('#include <output_fragment>', '#include <output_fragment>\n gl_FragColor.a = gA;');
    };
    m.customProgramCacheKey = () => 'wgrass2' + (pre ? 'p' : 'm');
  }
  // 地面：长草区染成草冠色（远处）/ 叶间压暗（近处）——用与草相同的烘焙覆盖率 / 色块
  function patchGround(mat, U) {
    if (!mat || mat.userData.wg2) return; mat.userData.wg2 = 1;
    const prev = mat.onBeforeCompile, key = mat.customProgramCacheKey;
    mat.onBeforeCompile = function (sh, r) {
      if (prev) prev.call(this, sh, r);
      if (!/varying vec3 vTP;/.test(sh.fragmentShader)) return;
      for (const k of ['uFar', 'uBase', 'uTip', 'uBase2', 'uTip2']) sh.uniforms[k] = U[k];
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float gm; attribute vec4 wgF; varying vec2 vWgC;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n vWgC = vec2(wgF.x * gm * smoothstep(0.74, 0.9, normalize(mat3(modelMatrix) * normal).y), wgF.z);');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uFar; uniform vec3 uBase, uTip, uBase2, uTip2; varying vec2 vWgC;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          { float cv = vWgC.x, cm = vWgC.y;
            vec3 gc = mix(mix(uBase, uBase2, cm), mix(uTip, uTip2, cm), 0.62);
            #ifdef USE_COLOR
              gc *= mix(vec3(1.0), vColor.rgb, 0.35);
            #endif
            float fr = smoothstep(uFar * 0.45, uFar * 1.05, distance(vTP.xz, cameraPosition.xz));
            float lg = max(dot(gc, vec3(0.3, 0.59, 0.11)), 1e-3), ld = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
            vec3 gt = gc * clamp(mix(1.0, ld / lg, 0.7), 0.4, 1.8); // 保留地面贴图自身的明暗纹理，只换成草的色相
            diffuseColor.rgb = mix(diffuseColor.rgb, gt * 1.1, cv * mix(0.45, 0.65, fr));
            diffuseColor.rgb *= mix(1.0, mix(0.55, 1.0, fr), cv); }`);
    };
    mat.customProgramCacheKey = () => (key ? key.call(mat) : '') + '|wg2';
    mat.needsUpdate = true;
  }
  let FALLBACK = null; const groundFallback = () => { if (!FALLBACK) { FALLBACK = new THREE.DataTexture(new Uint8Array([140, 120, 90, 255]), 1, 1); FALLBACK.needsUpdate = true; } return FALLBACK; };
  function buildV2(tg, o, lush) {
    const TI = tierOf(), TC = TIER[TI], N = TC.N, A2C = msaaOn();
    const pos = tg.attributes.position, nor = tg.attributes.normal, n = pos.count, idx = tg.index.array, Rg = Math.max(8, (o.RM || o.R || 20) + 3), R2 = (Rg + 2) * (Rg + 2);
    // 本地点的“草基因”（种子决定，每个地点都不一样）
    const gr = o.g.grassMul || new THREE.Color(1, 1, 1), rr = seeded(o.g.seed);
    const PAL = { // [根 / 中段, 叶尖]（线性色）
      fresh: [[.055, .11, .028], [.22, .35, .075]], yg: [[.065, .10, .024], [.28, .35, .075]], lime: [[.05, .12, .022], [.25, .42, .07]],
      bg: [[.032, .09, .045], [.13, .28, .13]], olive: [[.06, .072, .028], [.23, .26, .085]], straw: [[.10, .08, .034], [.40, .33, .14]],
      moss: [[.028, .065, .024], [.11, .21, .075]], rust: [[.085, .052, .026], [.34, .21, .09]] };
    const pool = (BIO[o.style] || ['fresh', 'olive', 'straw']).slice(), pa = pool.splice(Math.floor(rr() * pool.length), 1)[0], pb = pool.length ? pool[Math.floor(rr() * pool.length)] : pa;
    const fl = FLOWERS[Math.floor(rr() * FLOWERS.length)];
    const V = (p, k) => new THREE.Vector3(PAL[p][k][0] * gr.r, PAL[p][k][1] * gr.g, PAL[p][k][2] * gr.b);
    const dry = /straw|rust/.test(pa + pb) || o.style === 'wilds';
    const terr = o.sc && o.sc.children.find(c => c.isMesh && c.geometry === tg), tm = terr && terr.material;
    let gs = 0.35; try { if (tm && tm.onBeforeCompile) { const f = { uniforms: {}, vertexShader: '', fragmentShader: '' }; tm.onBeforeCompile.call(tm, f, null); if (f.uniforms.uScale) gs = f.uniforms.uScale.value; } } catch (e) { }
    const wa = rr() * Math.PI * 2, uH = (0.24 + 0.12 * lush) * (0.85 + 0.4 * rr()), lushU = Math.min(1, lush * (0.85 + rr() * 0.3)), pf = 0.7 + rr() * 0.9;
    // 顶点属性：生长遮罩（路/水）+ 烘焙的大尺度场（覆盖率、高矮、色块、枯斑；倒向）
    const nz = vnoise((rr() * 65535) | 0), sx = rr() * 500, sz = rr() * 500, lk = 0.22 * uH / 0.45;
    const gmA = new Float32Array(n), inR = new Uint8Array(n), fA = new Float32Array(n * 4), lA = new Float32Array(n * 2), wd = o.g.wd, LP = o.LP;
    for (let i = 0; i < n; i++) { const x = pos.getX(i), z = pos.getZ(i); let m = 1;
      if (x * x + z * z <= R2) { inR[i] = 1;
        if (wd) { const d = wd(x, z).d; m *= sstep(0.3, 2.2, d); }
        if (LP && LP.pathD) { const d = LP.pathD(x, z); m *= sstep(0.5, 1.9, d); } }
      gmA[i] = m;
      const X = x + sx, Z = z + sz, pm = nz(X * 0.09 * pf, Z * 0.09 * pf) * 0.6 + nz(X * 0.22 * pf + 50, Z * 0.22 * pf + 50) * 0.4;
      fA[i * 4] = Math.min(1, Math.max(0, lushU * (0.32 + 0.95 * sstep(0.24, 0.6, pm))));
      fA[i * 4 + 1] = 0.55 + 0.45 * sstep(0.2, 0.8, nz(X * 0.13 * pf + 29, Z * 0.13 * pf + 29));
      fA[i * 4 + 2] = sstep(0.3, 0.7, nz(X * 0.05 * pf + 11, Z * 0.05 * pf + 11) * 0.65 + nz(X * 0.17 * pf + 3, Z * 0.17 * pf + 3) * 0.35);
      fA[i * 4 + 3] = sstep(0.55, 0.85, nz(X * 0.11 + 5, Z * 0.11 + 5));
      lA[i * 2] = (nz(X * 0.33 + 17, Z * 0.33 + 17) - 0.5) * lk; lA[i * 2 + 1] = (nz(X * 0.33 + 41, Z * 0.33 + 41) - 0.5) * lk; }
    const gmAttr = new THREE.BufferAttribute(gmA, 1), fAttr = new THREE.BufferAttribute(fA, 4), lAttr = new THREE.BufferAttribute(lA, 2);
    tg.setAttribute('gm', gmAttr); tg.setAttribute('wgF', fAttr);
    const CH = 9, cmap = new Map(), px = (v) => pos.getX(v), py = (v) => pos.getY(v), pz = (v) => pos.getZ(v);
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t], b = idx[t + 1], c = idx[t + 2];
      if (!(inR[a] | inR[b] | inR[c]) || gmA[a] + gmA[b] + gmA[c] < 0.05) continue;
      const k = Math.floor((px(a) + px(b) + px(c)) / 3 / CH) * 4096 + Math.floor((pz(a) + pz(b) + pz(c)) / 3 / CH);
      let ch = cmap.get(k); if (!ch) cmap.set(k, ch = { i: [], x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9, z0: 1e9, z1: -1e9 });
      ch.i.push(a, b, c);
      for (const v of [a, b, c]) { const x = px(v), y = py(v), z = pz(v); if (x < ch.x0) ch.x0 = x; if (x > ch.x1) ch.x1 = x; if (y < ch.y0) ch.y0 = y; if (y > ch.y1) ch.y1 = y; if (z < ch.z0) ch.z0 = z; if (z > ch.z1) ch.z1 = z; }
    }
    if (!cmap.size) return null;
    const U = {
      uT: { value: 0 }, uH: { value: uH }, uDens: { value: 30 + rr() * 10 }, uWid: { value: 0.15 + rr() * 0.05 },
      uFlD: { value: lush > 0.3 && rr() < 0.4 ? 0.002 + rr() * 0.004 : 0 }, uDry: { value: (dry ? 0.2 : 0.04) + rr() * 0.06 }, uA2C: { value: A2C ? 1 : 0 }, uGS: { value: gs },
      uWind: { value: 0.8 + rr() * 0.7 }, uFar: { value: TC.far }, uRad: { value: Rg }, uN: { value: N },
      uWD: { value: new THREE.Vector2(Math.cos(wa), Math.sin(wa)) }, uSeed: { value: new THREE.Vector2(rr() * 400, rr() * 400) }, uCell: { value: new THREE.Vector2(Math.floor(rr() * 900), Math.floor(rr() * 900)) },
      uBase: { value: V(pa, 0) }, uTip: { value: V(pa, 1) }, uBase2: { value: V(pb, 0) }, uTip2: { value: V(pb, 1) },
      uFl: { value: new THREE.Vector3(fl[0], fl[1], fl[2]) }, uDryC: { value: new THREE.Vector3(.36 * gr.r, .29 * gr.g, .12 * gr.b) },
      uPush: { value: [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector4(0, 0, 0, 0)) }, uGT: { value: (tm && tm.map) || groundFallback() } };
    const aI = new THREE.InstancedBufferAttribute(new Float32Array(N).map((_, i) => i), 1);
    const grp = new THREE.Group(), chunks = [], vc = !!tg.attributes.color, mats = [];
    const mkMat = (su, pre) => {
      const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0, vertexColors: vc, envMapIntensity: 0.4 });
      m.defines = { WG_K: TC.K }; m.extensions = { derivatives: true }; m.alphaToCoverage = A2C;
      if (pre) m.colorWrite = false; else { m.depthWrite = false; m.depthFunc = THREE.EqualDepth; }
      patchGrass(m, U, su, pre); mats.push(m); return m;
    };
    for (const ch of cmap.values()) {
      const geo = new THREE.InstancedBufferGeometry();
      geo.setAttribute('position', pos); geo.setAttribute('normal', nor); if (vc) geo.setAttribute('color', tg.attributes.color);
      geo.setAttribute('gm', gmAttr); geo.setAttribute('wgF', fAttr); geo.setAttribute('wgL', lAttr); geo.setAttribute('aI', aI);
      geo.setIndex(new THREE.BufferAttribute(n > 65535 ? new Uint32Array(ch.i) : new Uint16Array(ch.i), 1)); geo.instanceCount = N;
      geo.boundingSphere = new THREE.Sphere(new THREE.Vector3((ch.x0 + ch.x1) / 2, (ch.y0 + ch.y1) / 2 + uH / 2, (ch.z0 + ch.z1) / 2), Math.hypot(ch.x1 - ch.x0, ch.y1 - ch.y0 + uH, ch.z1 - ch.z0) / 2 + 0.5);
      const su = { uStride: { value: 1 } };
      const pre = new THREE.Mesh(geo, mkMat(su, true)), main = new THREE.Mesh(geo, mkMat(su, false));
      pre.renderOrder = -2; // 所有草的深度预通道先画，之后的地面/石头也能被草挡住省掉着色
      for (const me of [pre, main]) { me.castShadow = false; me.receiveShadow = !(me === pre); me.userData.wg = 1; me.raycast = () => { }; grp.add(me); }
      chunks.push({ pre, main, geo, su, s: 1, x0: ch.x0, x1: ch.x1, z0: ch.z0, z1: ch.z1 });
    }
    if (tm) patchGround(tm, U);
    o.sc.add(grp);
    const api = { group: grp, U, chunks, tier: TI,
      update(p, now) {
        U.uT.value = now;
        const a2c = msaaOn(); if (a2c !== (U.uA2C.value > 0.5)) { U.uA2C.value = a2c ? 1 : 0; for (const m of mats) m.alphaToCoverage = a2c; }
        // 把草拨开：玩家脚下 + 最近的 5 个敌人 / 野兽（含倒地的尸体）
        const P = U.uPush.value; let k = 0; P[k++].set(p.x, 0, p.z, 0.55);
        const cand = [], d2 = (q) => (q.x - p.x) * (q.x - p.x) + (q.z - p.z) * (q.z - p.z);
        try { if (window.Foe && Foe.foes) for (const fo of Foe.foes) if (fo && fo.pos) cand.push(fo.pos); if (window.Beasts && Beasts.list) for (const b of Beasts.list) if (b && b.pos) cand.push(b.pos); } catch (e) { }
        cand.sort((a, b) => d2(a) - d2(b));
        for (const q of cand) { if (k >= 6 || d2(q) > 900) break; P[k++].set(q.x, 0, q.z, 0.5); }
        for (; k < 6; k++) P[k].w = 0;
        // 距离 LOD：远处隔层抽稀（子步跨度随之变大，草叶仍连续）
        for (const c of chunks) {
          const dx = Math.max(c.x0 - p.x, 0, p.x - c.x1), dz = Math.max(c.z0 - p.z, 0, p.z - c.z1), d = Math.hypot(dx, dz);
          const vis = d < TC.far + 1; c.pre.visible = c.main.visible = vis; if (!vis) continue;
          const s = d < 12 ? 1 : d < 22 ? 2 : 4; if (s !== c.s) { c.s = s; c.su.uStride.value = s; c.geo.instanceCount = Math.ceil(N / s); }
        }
      } };
    WGrass._last = api;
    return api;
  }

  // ======================= v1（R50 原版，grass_master 关闭时使用）=======================
  function patchV1(mat, U, L) {
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { uT: U.uT, uCam: U.uCam, uFar: U.uFar, uRad: U.uRad, uH: U.uH, uWind: U.uWind, uBase: U.uBase, uTip: U.uTip, uBase2: U.uBase2, uTip2: U.uTip2, uFl: U.uFl, uFlD: U.uFlD, uHt: U.uHt, uWid: U.uWid, uPF: U.uPF, uLush: U.uLush, uDens: U.uDens, uSeed: U.uSeed, uLy: L.uLy });
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float gm; uniform float uT, uFar, uRad, uH, uWind, uLy; uniform vec3 uCam; varying float vFade, vLy, vGm, vSl; varying vec2 vW;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vec3 wp0 = (modelMatrix * vec4(position, 1.0)).xyz; float dc = distance(wp0.xz, uCam.xz);
          vFade = (1.0 - smoothstep(uFar * 0.5, uFar, dc)) * (1.0 - smoothstep(uRad - 4.0, uRad, length(wp0.xz)));
          vW = wp0.xz; vLy = uLy; vGm = gm; vSl = smoothstep(0.78, 0.92, normal.y);
          transformed += normal * (uH * uLy * vFade);
          transformed.x += sin(wp0.x * 0.9 + wp0.z * 0.4 + uT * 1.7) * 0.07 * uLy * uLy * vFade * uWind;
          transformed.z += cos(wp0.z * 0.8 - wp0.x * 0.3 + uT * 1.4) * 0.05 * uLy * uLy * vFade * uWind;`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform vec3 uBase, uTip, uBase2, uTip2, uFl; uniform float uLush, uDens, uSeed, uFar, uFlD, uHt, uWid, uPF; varying float vFade, vLy, vGm, vSl; varying vec2 vW;
          float hh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hh(i), hh(i + vec2(1.0, 0.0)), f.x), mix(hh(i + vec2(0.0, 1.0)), hh(i + vec2(1.0, 1.0)), f.x), f.y); }`)
        .replace('void main() {', 'void main() { if (vFade < 0.03 || vGm * vSl < 0.03) discard;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          {
            vec2 q = vW + uSeed; float pm = smoothstep(0.28, 0.6, vn(q * 0.09 * uPF) * 0.6 + vn(q * 0.31 * uPF) * 0.4);
            float cover = clamp(uLush * (0.35 + 0.9 * pm), 0.0, 1.0) * vGm * vSl;
            float cm = smoothstep(0.34, 0.66, vn(q * 0.05 * uPF + 11.0) * 0.65 + vn(q * 0.17 * uPF + 3.0) * 0.35);
            float tm = vn(q * 0.13 * uPF + 29.0); float tall = mix(0.55, 1.45, smoothstep(0.25, 0.75, tm)) * uHt;
            vec2 uv = q * uDens, cell = floor(uv), f = fract(uv) - 0.5; float r1 = hh(cell), r2 = hh(cell + 17.3);
            float hgt = (0.25 + 0.75 * r1 * r1 + 0.25 * r2) * cover * vFade * 1.25 * tall;
            float rad = 0.5 * uWid * (1.0 - vLy / max(hgt, 0.04) * 0.9); vec2 off = vec2(r2 - 0.5, r1 - 0.5) * 0.35;
            if (vLy > hgt || length(f - off) > rad || cover < 0.04) discard;
            vec3 gb = mix(uBase, uBase2, cm), gt = mix(uTip, uTip2, cm);
            vec3 gc = mix(gb, gt, pow(vLy, 0.8)) * (0.78 + 0.44 * r2) * (0.9 + 0.2 * vn(q * 1.7));
            gc *= mix(0.5, 1.0, smoothstep(0.0, 0.5, vLy));
            if (r2 > 1.0 - uFlD && vLy > hgt * 0.72) gc = uFl * (0.8 + 0.4 * r1);
            #ifdef USE_COLOR
              gc *= mix(vec3(1.0), vColor.rgb, 0.45);
            #endif
            diffuseColor.rgb = gc;
          }`);
    };
  }
  function buildV1(tg, o, lush) {
    const pos = tg.attributes.position, nor = tg.attributes.normal, n = pos.count, idx = tg.index.array, Rg = Math.max(8, (o.RM || o.R || 20) + 3);
    const gmA = new Float32Array(n), inR = new Uint8Array(n), wd = o.g.wd, LP = o.LP;
    for (let i = 0; i < n; i++) { const x = pos.getX(i), z = pos.getZ(i); if (x * x + z * z > Rg * Rg) continue; inR[i] = 1; let m = 1;
      if (wd) { const d = wd(x, z).d; m *= sstep(0.3, 2.2, d); }
      if (LP && LP.pathD) { const d = LP.pathD(x, z); m *= sstep(0.5, 1.9, d); }
      gmA[i] = m; }
    const keep = []; for (let t = 0; t < idx.length; t += 3) { const a = idx[t], b = idx[t + 1], c = idx[t + 2]; if ((inR[a] | inR[b] | inR[c]) && (gmA[a] + gmA[b] + gmA[c]) > 0.05) keep.push(a, b, c); }
    if (!keep.length) return null;
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', pos); geo.setAttribute('normal', nor); if (tg.attributes.color) geo.setAttribute('color', tg.attributes.color); geo.setAttribute('gm', new THREE.BufferAttribute(gmA, 1));
    geo.setIndex(new THREE.BufferAttribute(n > 65535 ? new Uint32Array(keep) : new Uint16Array(keep), 1)); geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Rg * 1.6);
    const gr = o.g.grassMul || new THREE.Color(1, 1, 1), rr = seeded(o.g.seed);
    const PAL = { fresh: [[.09, .15, .045], [.27, .38, .11]], yg: [[.10, .14, .035], [.31, .37, .09]], bg: [[.05, .13, .07], [.16, .33, .18]], olive: [[.09, .10, .04], [.27, .29, .10]], straw: [[.15, .12, .05], [.40, .32, .14]], moss: [[.04, .09, .04], [.12, .24, .10]], rust: [[.14, .08, .04], [.40, .23, .10]], lime: [[.10, .18, .03], [.36, .52, .10]] };
    const pool = (BIO[o.style] || ['fresh', 'olive', 'straw']).slice(), pa = pool.splice(Math.floor(rr() * pool.length), 1)[0], pb = pool.length ? pool[Math.floor(rr() * pool.length)] : pa;
    const fl = FLOWERS[Math.floor(rr() * FLOWERS.length)];
    const V = (p, k) => new THREE.Vector3(PAL[p][k][0] * gr.r, PAL[p][k][1] * gr.g, PAL[p][k][2] * gr.b);
    const dens = 11 + rr() * 12, ht = 0.65 + rr() * 0.85, lk = lush * (0.8 + rr() * 0.4);
    const U = { uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uFar: { value: 27 }, uRad: { value: Rg }, uH: { value: (0.42 + 0.18 * lush) * (0.9 + 0.3 * rr()) }, uWind: { value: 0.7 + rr() * 0.8 },
      uBase: { value: V(pa, 0) }, uTip: { value: V(pa, 1) }, uBase2: { value: V(pb, 0) }, uTip2: { value: V(pb, 1) }, uFl: { value: new THREE.Vector3(fl[0], fl[1], fl[2]) }, uFlD: { value: lush > 0.3 && rr() < 0.7 ? 0.015 + rr() * 0.05 : 0 },
      uHt: { value: ht }, uWid: { value: 0.75 + rr() * 0.4 }, uPF: { value: 0.7 + rr() * 0.9 },
      uLush: { value: Math.min(1, lk) }, uDens: { value: dens }, uSeed: { value: ((o.g.seed || 1) % 997) * 1.37 } };
    const N = 12, grp = new THREE.Group();
    for (let i = 0; i < N; i++) {
      const m = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: !!tg.attributes.color }), L = { uLy: { value: (i + 1) / N } };
      patchV1(m, U, L); m.customProgramCacheKey = () => 'wgrass1';
      const mesh = new THREE.Mesh(geo, m); mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = true; mesh.renderOrder = 0; mesh.userData.wg = 1; grp.add(mesh);
    }
    o.sc.add(grp);
    return { group: grp, update(p, now) { U.uCam.value.copy(p); U.uT.value = now; } };
  }

  // tg = 地形 PlaneGeometry（已写好 y / normal / color）；o = { g, style, RM, R, LP, sc }
  function build(tg, o) {
    if (!on() || !o.g) return null;
    const lush = (o.style in LUSH ? LUSH[o.style] : 0.5) * (o.g.lushK != null ? o.g.lushK : 1); if (lush < 0.04) return null;
    return v2on() ? buildV2(tg, o, lush) : buildV1(tg, o, lush);
  }
  return { on, v2on, build, TIER };
})();
