// 第十三轮：大师画质渲染管线（默认渲染器；画风 MOD 开启时仍走 render.js 的旧链）
// 场景 → HDR 线性 RT(HalfFloat, 4×MSAA, 深度纹理)
//   → SAO 环境光遮蔽（半分辨率，深度重建法线，螺旋采样 + 深度感知双边模糊）
//   → 体积光（从光源屏幕位置的径向散射：洞口天光 / 篝火）
//   → 物理泛光（Unreal 式 6 级 mip 下采样 + 帐篷上采样，软阈值）
//   → 合成：AO → 泛光 → 体积光 → 曝光 → ACES 拟合 → 分离色调调色 / S 曲线 / 饱和 / 暗角 / 颗粒 / 边缘色差
//   → FXAA 3.11 → 屏幕
window.Master = (() => {
  const Q = { // 画质档位参数（auto 降档由 game.js 的 FPS 监测触发 setTier）
    ultra: { ao: 1, aoScale: 0.5, aoSamples: 16, bloom: 1, rays: 1, fxaa: 1, msaa: 4 },
    high: { ao: 1, aoScale: 0.5, aoSamples: 10, bloom: 1, rays: 1, fxaa: 1, msaa: 0 },
    mid: { ao: 0, aoScale: 0.5, aoSamples: 8, bloom: 1, rays: 0, fxaa: 1, msaa: 0 }
  };
  const P = { // 调色（黑暗奇幻：暖高光、冷暗部、偏低饱和的中间调、电影感对比）
    exposure: 1.25, bloomStr: 0.9, bloomThresh: 0.9, bloomKnee: 0.6, aoStr: 1.0, aoRadius: 0.55,
    rayStr: 0.55, rayDecay: 0.965, rayDensity: 0.9,
    sat: 1.08, contrast: 1.07, shadowTint: [0.93, 0.98, 1.08], highTint: [1.06, 1.0, 0.9], vig: 0.42, grain: 0.028, ca: 0.0007,
    // R52 world_atmos：空气透视（朝太阳的 Mie 散射）/ 低地薄雾 / 太阳光束
    mie: 0.9, mieG: 0.76, mieDist: 0.012, mist: 0.55, mistH: 2.2, mistDist: 0.03, sunRay: 0.85, sunRayDecay: 0.972
  };
  const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const quad = new THREE.PlaneGeometry(2, 2), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  function mk(fs, u, deriv) {
    const m = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false, toneMapped: false });
    if (deriv) m.extensions = { derivatives: true };
    const sc = new THREE.Scene(); const q = new THREE.Mesh(quad, m); q.frustumCulled = false; sc.add(q);
    return { m, u, sc };
  }
  const COMMON = `
    float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
    float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }`;

  // ---------- SAO ----------
  const AO = (n) => `${COMMON}
    uniform sampler2D tDepth; uniform mat4 uProjInv; uniform vec2 uRes; uniform float uRadius; uniform float uProjScale; uniform float uT;
    varying vec2 vUv;
    vec3 vpos(vec2 uv){ float d = texture2D(tDepth, uv).x; vec4 c = vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); vec4 v = uProjInv * c; return v.xyz / v.w; }
    void main(){
      float d = texture2D(tDepth, vUv).x; if (d >= 0.99999) { gl_FragColor = vec4(1.0); return; }
      vec3 P = vpos(vUv);
      vec2 px = 1.0 / uRes;
      vec3 Pr = vpos(vUv + vec2(px.x, 0.0)), Pl = vpos(vUv - vec2(px.x, 0.0)), Pu = vpos(vUv + vec2(0.0, px.y)), Pd = vpos(vUv - vec2(0.0, px.y));
      vec3 dx = abs(Pr.z - P.z) < abs(P.z - Pl.z) ? Pr - P : P - Pl;
      vec3 dy = abs(Pu.z - P.z) < abs(P.z - Pd.z) ? Pu - P : P - Pd;
      vec3 N = normalize(cross(dx, dy));
      float rS = uRadius * uProjScale / -P.z; // 屏幕半径（像素）
      rS = min(rS, 90.0);
      float noise = ign(gl_FragCoord.xy + uT * 7.0) * 6.2831;
      float occ = 0.0; float R2 = uRadius * uRadius;
      for (int i = 0; i < ${n}; i++) {
        float fi = float(i);
        float a = fi * 2.3999632 + noise; float r = (fi + 0.5) / float(${n});
        vec2 off = vec2(cos(a), sin(a)) * r * rS * px;
        vec3 S = vpos(vUv + off); vec3 v = S - P;
        float vv = dot(v, v); float vn = dot(v, N);
        float f = max(R2 - vv, 0.0) / R2;
        occ += f * f * f * max((vn - 0.012) / (0.02 + vv), 0.0);
      }
      float ao = clamp(1.0 - occ * 2.2 * uRadius / float(${n}), 0.0, 1.0);
      gl_FragColor = vec4(vec3(ao), 1.0);
    }`;
  const AOBLUR = `
    uniform sampler2D tAO; uniform sampler2D tDepth; uniform vec2 uDir; uniform float uNear; uniform float uFar; varying vec2 vUv;
    float lin(float d){ float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
    void main(){
      float d0 = lin(texture2D(tDepth, vUv).x); float s = 0.0, w = 0.0;
      for (int i = -4; i <= 4; i++) {
        vec2 uv = vUv + uDir * float(i);
        float di = lin(texture2D(tDepth, uv).x);
        float wi = exp(-float(i * i) * 0.08) * max(0.0, 1.0 - abs(di - d0) / (0.05 * d0 + 0.02));
        s += texture2D(tAO, uv).r * wi; w += wi;
      }
      gl_FragColor = vec4(vec3(s / max(w, 1e-4)), 1.0);
    }`;
  // ---------- 泛光 ----------
  const BRIGHT = `${COMMON}
    uniform sampler2D tSrc; uniform float uThresh; uniform float uKnee; uniform vec2 uTex; varying vec2 vUv;
    void main(){
      // 4 点预滤波 + 软阈值（Karis 平均抑制萤火虫像素）
      vec3 a = texture2D(tSrc, vUv + uTex * vec2(-1.0, -1.0)).rgb, b = texture2D(tSrc, vUv + uTex * vec2(1.0, -1.0)).rgb;
      vec3 c = texture2D(tSrc, vUv + uTex * vec2(-1.0, 1.0)).rgb, d = texture2D(tSrc, vUv + uTex * vec2(1.0, 1.0)).rgb;
      float wa = 1.0 / (1.0 + luma(a)), wb = 1.0 / (1.0 + luma(b)), wc = 1.0 / (1.0 + luma(c)), wd = 1.0 / (1.0 + luma(d));
      vec3 col = (a * wa + b * wb + c * wc + d * wd) / (wa + wb + wc + wd);
      float br = max(col.r, max(col.g, col.b));
      float rq = clamp(br - uThresh + uKnee, 0.0, 2.0 * uKnee); rq = rq * rq / (4.0 * uKnee + 1e-4);
      float k = max(rq, br - uThresh) / max(br, 1e-4);
      gl_FragColor = vec4(min(col * k, vec3(40.0)), 1.0);
    }`;
  const DOWN = `uniform sampler2D tSrc; uniform vec2 uTex; varying vec2 vUv;
    void main(){ // 13 点 CoD 下采样
      vec3 A = texture2D(tSrc, vUv + uTex * vec2(-2.0, -2.0)).rgb, B = texture2D(tSrc, vUv + uTex * vec2(0.0, -2.0)).rgb, C = texture2D(tSrc, vUv + uTex * vec2(2.0, -2.0)).rgb;
      vec3 D = texture2D(tSrc, vUv + uTex * vec2(-1.0, -1.0)).rgb, E = texture2D(tSrc, vUv + uTex * vec2(1.0, -1.0)).rgb;
      vec3 F = texture2D(tSrc, vUv + uTex * vec2(-2.0, 0.0)).rgb, G = texture2D(tSrc, vUv).rgb, H = texture2D(tSrc, vUv + uTex * vec2(2.0, 0.0)).rgb;
      vec3 I = texture2D(tSrc, vUv + uTex * vec2(-1.0, 1.0)).rgb, J = texture2D(tSrc, vUv + uTex * vec2(1.0, 1.0)).rgb;
      vec3 K = texture2D(tSrc, vUv + uTex * vec2(-2.0, 2.0)).rgb, L = texture2D(tSrc, vUv + uTex * vec2(0.0, 2.0)).rgb, M = texture2D(tSrc, vUv + uTex * vec2(2.0, 2.0)).rgb;
      vec3 o = (D + E + I + J) * 0.125 + (A + B + G + F) * 0.03125 + (B + C + H + G) * 0.03125 + (F + G + L + K) * 0.03125 + (G + H + M + L) * 0.03125;
      gl_FragColor = vec4(o, 1.0); }`;
  const UP = `uniform sampler2D tSrc; uniform sampler2D tPrev; uniform vec2 uTex; uniform float uR; varying vec2 vUv;
    void main(){ // 3×3 帐篷上采样 + 叠加本级
      vec3 s = texture2D(tSrc, vUv).rgb * 4.0;
      s += (texture2D(tSrc, vUv + uTex * vec2(-uR, 0.0)).rgb + texture2D(tSrc, vUv + uTex * vec2(uR, 0.0)).rgb + texture2D(tSrc, vUv + uTex * vec2(0.0, -uR)).rgb + texture2D(tSrc, vUv + uTex * vec2(0.0, uR)).rgb) * 2.0;
      s += texture2D(tSrc, vUv + uTex * vec2(-uR, -uR)).rgb + texture2D(tSrc, vUv + uTex * vec2(uR, -uR)).rgb + texture2D(tSrc, vUv + uTex * vec2(-uR, uR)).rgb + texture2D(tSrc, vUv + uTex * vec2(uR, uR)).rgb;
      gl_FragColor = vec4(s / 16.0 + texture2D(tPrev, vUv).rgb, 1.0); }`;
  // ---------- 体积光（径向散射） ----------
  const RAYS = `${COMMON}
    uniform sampler2D tSrc; uniform vec2 uLight; uniform float uDecay; uniform float uDensity; uniform float uT; varying vec2 vUv;
    void main(){
      vec2 d = (vUv - uLight) * uDensity / 40.0; vec2 uv = vUv; float w = 1.0; vec3 s = vec3(0.0);
      uv -= d * ign(gl_FragCoord.xy + uT * 3.0);
      for (int i = 0; i < 40; i++) { uv -= d; s += texture2D(tSrc, clamp(uv, 0.0, 1.0)).rgb * w; w *= uDecay; }
      gl_FragColor = vec4(s / 40.0, 1.0);
    }`;
  // ---------- 合成 ----------
  // ---------- R52 world_atmos：空气透视 + 低地薄雾（HDR → HDR） ----------
  const ATMOS = `${COMMON}
    uniform sampler2D tScene; uniform sampler2D tDepth; uniform mat4 uProjInv; uniform mat4 uViewInv; uniform vec3 uCam; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uFogCol;
    uniform float uMie; uniform float uG; uniform float uMieDist; uniform float uMist; uniform float uMistH; uniform float uMistDist; uniform float uGround; uniform float uT; varying vec2 vUv;
    void main(){
      vec3 col = texture2D(tScene, vUv).rgb; float d = texture2D(tDepth, vUv).x;
      vec4 v = uProjInv * vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); vec3 vp = v.xyz / v.w;
      bool sky = d >= 0.99999; float dist = sky ? 400.0 : length(vp);
      vec3 dir = normalize((uViewInv * vec4(vp, 0.0)).xyz); vec3 wp = uCam + dir * dist;
      float cs = dot(dir, uSunDir), g2 = uG * uG;
      float ph = (1.0 - g2) / pow(max(1.0 + g2 - 2.0 * uG * cs, 1e-4), 1.5) * 0.0796; // Henyey-Greenstein
      float ext = 1.0 - exp(-dist * uMieDist);
      col += uSunCol * ph * ext * uMie * (sky ? 0.35 : 1.0);
      if (!sky) { // 低地薄雾：沿视线对高度指数衰减的雾密度积分（解析式）
        float b = 1.0 / uMistH, h0 = uCam.y - uGround, dy = wp.y - uCam.y;
        float od = uMistDist * exp(-b * h0) * dist * (abs(dy) > 0.01 ? (1.0 - exp(-b * dy)) / (b * dy) : 1.0);
        float f = (1.0 - exp(-od)) * uMist;
        vec3 mc = uFogCol * (1.0 + 0.6 * ph * 6.0) + uSunCol * ph * 0.25;
        col = mix(col, mc, clamp(f, 0.0, 0.85));
      }
      gl_FragColor = vec4(col, 1.0);
    }`;
  // 太阳光束的源：只取天空像素（深度=远平面）× 太阳附近的径向衰减 → 树叶/建筑的缝隙里漏出光柱
  const SUNSRC = `${COMMON}
    uniform sampler2D tScene; uniform sampler2D tDepth; uniform vec2 uSun; uniform float uAsp; uniform vec2 uTex; varying vec2 vUv;
    void main(){
      vec3 s = vec3(0.0);
      for (int i = 0; i < 4; i++) { vec2 o = vec2(i == 1 || i == 3 ? 1.0 : -1.0, i >= 2 ? 1.0 : -1.0) * uTex; float d = texture2D(tDepth, vUv + o).x; if (d >= 0.99999) s += min(texture2D(tScene, vUv + o).rgb, vec3(6.0)); }
      vec2 q = (vUv - uSun) * vec2(uAsp, 1.0); float r = length(q);
      gl_FragColor = vec4(s * 0.25 * (exp(-r * 4.5) + 0.25 * exp(-r * 1.4)), 1.0);
    }`;
  const COMP = `${COMMON}
    uniform sampler2D tScene; uniform sampler2D tAO; uniform sampler2D tBloom; uniform sampler2D tRays; uniform sampler2D tSunRays; uniform float uSunRay; uniform vec3 uSunRayCol;
    uniform float uAO; uniform float uBloom; uniform float uRay; uniform float uExp; uniform float uSat; uniform float uCon;
    uniform vec3 uShT; uniform vec3 uHiT; uniform float uVig; uniform float uGrain; uniform float uCA; uniform float uT; uniform vec2 uRes; uniform vec3 uRayCol;
    varying vec2 vUv;
    vec3 aces(vec3 v){ // Stephen Hill 拟合 RRT+ODT
      const mat3 i = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
      const mat3 o = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
      v = i * v; vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return clamp(o * (a / b), 0.0, 1.0);
    }
    vec3 srgb(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
    void main(){
      vec2 uv = vUv; vec2 cc = uv - 0.5;
      vec3 col;
      if (uCA > 0.0) { vec2 o = cc * dot(cc, cc) * uCA * 8.0; col = vec3(texture2D(tScene, uv - o).r, texture2D(tScene, uv).g, texture2D(tScene, uv + o).b); }
      else col = texture2D(tScene, uv).rgb;
      float L0 = luma(col);
      if (uAO > 0.0) { float ao = texture2D(tAO, uv).r; ao = mix(ao, 1.0, smoothstep(0.8, 3.0, L0)); col *= mix(1.0, ao, uAO); }
      col += texture2D(tBloom, uv).rgb * uBloom;
      if (uRay > 0.0) col += texture2D(tRays, uv).rgb * uRay * uRayCol;
      if (uSunRay > 0.0) col += texture2D(tSunRays, uv).rgb * uSunRay * uSunRayCol;
      col = aces(col * uExp);
      // 分离色调：暗部偏冷、亮部偏暖
      float l = luma(col);
      col *= mix(uShT, uHiT, smoothstep(0.05, 0.6, l));
      col = mix(vec3(l), col, uSat);
      col = clamp(col, 0.0, 1.0);
      col = mix(col, col * col * (3.0 - 2.0 * col), uCon - 1.0); // S 曲线
      col *= 1.0 - uVig * smoothstep(0.2, 0.95, dot(cc, cc) * 2.3);
      col = srgb(clamp(col, 0.0, 1.0));
      col += (ign(gl_FragCoord.xy + fract(uT * 13.0) * 97.0) - 0.5) * uGrain; // 颗粒（顺便抖动去色带）
      gl_FragColor = vec4(col, luma(col));
    }`;
  // ---------- FXAA 3.11（精简 PC 质量档） ----------
  const FXAA = `uniform sampler2D tSrc; uniform vec2 uTex; varying vec2 vUv;
    float L(vec2 uv){ return texture2D(tSrc, uv).a; }
    void main(){
      vec2 p = vUv; float lM = L(p), lN = L(p + vec2(0.0, uTex.y)), lS = L(p - vec2(0.0, uTex.y)), lE = L(p + vec2(uTex.x, 0.0)), lW = L(p - vec2(uTex.x, 0.0));
      float mx = max(lM, max(max(lN, lS), max(lE, lW))), mn = min(lM, min(min(lN, lS), min(lE, lW))), rng = mx - mn;
      if (rng < max(0.0312, mx * 0.125)) { gl_FragColor = vec4(texture2D(tSrc, p).rgb, 1.0); return; }
      float lNW = L(p + vec2(-uTex.x, uTex.y)), lNE = L(p + uTex), lSW = L(p - uTex), lSE = L(p + vec2(uTex.x, -uTex.y));
      float eH = abs(lNW + lNE - 2.0 * lN) + 2.0 * abs(lW + lE - 2.0 * lM) + abs(lSW + lSE - 2.0 * lS);
      float eV = abs(lNW + lSW - 2.0 * lW) + 2.0 * abs(lN + lS - 2.0 * lM) + abs(lNE + lSE - 2.0 * lE);
      bool hor = eH >= eV;
      float l1 = hor ? lS : lW, l2 = hor ? lN : lE; float g1 = abs(l1 - lM), g2 = abs(l2 - lM);
      float step = hor ? uTex.y : uTex.x; float lA; if (g1 >= g2) { step = -step; lA = 0.5 * (l1 + lM); } else lA = 0.5 * (l2 + lM);
      float gS = 0.25 * max(g1, g2);
      vec2 cur = p; if (hor) cur.y += step * 0.5; else cur.x += step * 0.5;
      vec2 off = hor ? vec2(uTex.x, 0.0) : vec2(0.0, uTex.y);
      vec2 u1 = cur - off, u2 = cur + off; float e1 = L(u1) - lA, e2 = L(u2) - lA; bool r1 = abs(e1) >= gS, r2 = abs(e2) >= gS;
      for (int i = 0; i < 10; i++) { if (r1 && r2) break; float q = i < 3 ? 1.0 : (i < 6 ? 2.0 : 4.0);
        if (!r1) { u1 -= off * q; e1 = L(u1) - lA; r1 = abs(e1) >= gS; } if (!r2) { u2 += off * q; e2 = L(u2) - lA; r2 = abs(e2) >= gS; } }
      float d1 = hor ? p.x - u1.x : p.y - u1.y, d2 = hor ? u2.x - p.x : u2.y - p.y; bool near1 = d1 < d2; float dm = min(d1, d2);
      float len = d1 + d2; float po = -dm / len + 0.5;
      bool smaller = lM < lA; bool ok = ((near1 ? e1 : e2) < 0.0) != smaller; float fo = ok ? po : 0.0;
      float la = (2.0 * (lN + lS + lE + lW) + lNW + lNE + lSW + lSE) / 12.0; float sub = clamp(abs(la - lM) / rng, 0.0, 1.0); sub = (-2.0 * sub + 3.0) * sub * sub; fo = max(fo, sub * sub * 0.75);
      vec2 fp = p; if (hor) fp.y += fo * step; else fp.x += fo * step;
      gl_FragColor = vec4(texture2D(tSrc, fp).rgb, 1.0);
    }`;

  function create(renderer, opts) {
    opts = opts || {};
    const gl2 = renderer.capabilities.isWebGL2;
    const hf = (gl2 && renderer.extensions.has('EXT_color_buffer_float')) || renderer.extensions.has('EXT_color_buffer_half_float') ? THREE.HalfFloatType : THREE.UnsignedByteType;
    let tier = opts.tier || 'ultra'; let q = Q[tier];
    const RT = (w, h, o) => new THREE.WebGLRenderTarget(w, h, Object.assign({ type: hf, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, generateMipmaps: false }, o || {}));
    let W = 0, H = 0, T = null; const MIPS = 6;
    const aoP = {}; const mkAO = n => aoP[n] || (aoP[n] = mk(AO(n), { tDepth: { value: null }, uProjInv: { value: new THREE.Matrix4() }, uRes: { value: new THREE.Vector2() }, uRadius: { value: P.aoRadius }, uProjScale: { value: 500 }, uT: { value: 0 } }));
    const aoBlur = mk(AOBLUR, { tAO: { value: null }, tDepth: { value: null }, uDir: { value: new THREE.Vector2() }, uNear: { value: 0.03 }, uFar: { value: 80 } });
    const bright = mk(BRIGHT, { tSrc: { value: null }, uThresh: { value: P.bloomThresh }, uKnee: { value: P.bloomKnee }, uTex: { value: new THREE.Vector2() } });
    const down = mk(DOWN, { tSrc: { value: null }, uTex: { value: new THREE.Vector2() } });
    const up = mk(UP, { tSrc: { value: null }, tPrev: { value: null }, uTex: { value: new THREE.Vector2() }, uR: { value: 1.0 } });
    const rays = mk(RAYS, { tSrc: { value: null }, uLight: { value: new THREE.Vector2(0.5, 0.5) }, uDecay: { value: P.rayDecay }, uDensity: { value: P.rayDensity }, uT: { value: 0 } });
    const CU = { tScene: { value: null }, tAO: { value: null }, tBloom: { value: null }, tRays: { value: null }, tSunRays: { value: null }, uSunRay: { value: 0 }, uSunRayCol: { value: new THREE.Vector3(1, 0.9, 0.75) }, uAO: { value: 0 }, uBloom: { value: P.bloomStr }, uRay: { value: 0 }, uExp: { value: P.exposure }, uSat: { value: P.sat }, uCon: { value: P.contrast },
      uShT: { value: new THREE.Vector3(...P.shadowTint) }, uHiT: { value: new THREE.Vector3(...P.highTint) }, uVig: { value: P.vig }, uGrain: { value: P.grain }, uCA: { value: P.ca }, uT: { value: 0 }, uRes: { value: new THREE.Vector2() }, uRayCol: { value: new THREE.Vector3(1, 0.85, 0.65) } };
    const comp = mk(COMP, CU);
    const atm = mk(ATMOS, { tScene: { value: null }, tDepth: { value: null }, uProjInv: { value: new THREE.Matrix4() }, uViewInv: { value: new THREE.Matrix4() }, uCam: { value: new THREE.Vector3() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Vector3(1, 1, 1) }, uFogCol: { value: new THREE.Vector3(0.5, 0.6, 0.7) },
      uMie: { value: P.mie }, uG: { value: P.mieG }, uMieDist: { value: P.mieDist }, uMist: { value: P.mist }, uMistH: { value: P.mistH }, uMistDist: { value: P.mistDist }, uGround: { value: 0 }, uT: { value: 0 } });
    const sunSrc = mk(SUNSRC, { tScene: { value: null }, tDepth: { value: null }, uSun: { value: new THREE.Vector2() }, uAsp: { value: 1 }, uTex: { value: new THREE.Vector2() } });
    const sunRays = mk(RAYS, { tSrc: { value: null }, uLight: { value: new THREE.Vector2(0.5, 0.5) }, uDecay: { value: P.sunRayDecay }, uDensity: { value: 1.0 }, uT: { value: 0 } });
    const fxaa = mk(FXAA, { tSrc: { value: null }, uTex: { value: new THREE.Vector2() } });
    const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); white.needsUpdate = true;
    const black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); black.needsUpdate = true;

    function alloc(w, h) {
      if (T) for (const k in T) { const v = T[k]; if (Array.isArray(v)) v.forEach(x => x.dispose()); else if (v && v.dispose) v.dispose(); }
      const scene = RT(w, h, { depthBuffer: true, samples: gl2 ? q.msaa : 0 });
      scene.depthTexture = new THREE.DepthTexture(w, h); scene.depthTexture.type = THREE.UnsignedIntType;
      const aw = Math.max(2, Math.round(w * q.aoScale)), ah = Math.max(2, Math.round(h * q.aoScale));
      const ldr = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
      const mips = [], ups = []; let mw = w >> 1, mh = h >> 1;
      for (let i = 0; i < MIPS; i++) { mw = Math.max(2, mw); mh = Math.max(2, mh); mips.push(RT(mw, mh)); ups.push(RT(mw, mh)); mw >>= 1; mh >>= 1; }
      T = { scene, ao: RT(aw, ah, { type: THREE.UnsignedByteType }), ao2: RT(aw, ah, { type: THREE.UnsignedByteType }), ldr, mips, ups, rays: RT(Math.max(2, w >> 2), Math.max(2, h >> 2)), atm: RT(w, h), sun: RT(Math.max(2, w >> 2), Math.max(2, h >> 2)), sunRays: RT(Math.max(2, w >> 2), Math.max(2, h >> 2)), aw, ah };
      CU.uRes.value.set(w, h); fxaa.u.uTex.value.set(1 / w, 1 / h);
    }
    function setSize(w, h) { if (w === W && h === H && T) return; W = w; H = h; alloc(w, h); }
    function setTier(t) { if (!Q[t] || t === tier) return; const msaaChanged = Q[t].msaa !== q.msaa; tier = t; q = Q[t]; if (msaaChanged && W) alloc(W, H); }
    const _v = new THREE.Vector2(), _l = new THREE.Vector3();
    function pass(p, target) { renderer.setRenderTarget(target); renderer.render(p.sc, cam); }
    let rayWorld = null, rayStr = 0; // 体积光光源（世界坐标）
    function setRayLight(v3, strength, col) { rayWorld = v3; rayStr = strength == null ? 1 : strength; if (col) CU.uRayCol.value.set(col.r, col.g, col.b); }
    // R52 world_atmos：只在野外场景（worlds.js 的天空球 sc.userData.skyM）生效；太阳 = 场景里最亮的投影平行光
    const sunCache = new WeakMap(), _sd = new THREE.Vector3(), _sp = new THREE.Vector3();
    const atmosOn = (scene) => !!(scene && scene.userData && scene.userData.skyM) && !(window.Mods && Mods.on && Mods.on('world_atmos') === false) && !/[?&]atm=0/.test(location.search);
    function sunOf(scene) { let s = sunCache.get(scene); if (s && s.parent) return s; s = null; scene.traverse(o => { if (o.isDirectionalLight && (!s || o.intensity > s.intensity)) s = o; }); if (s) sunCache.set(scene, s); return s; }

    function render(scene, camera) {
      renderer.getDrawingBufferSize(_v); setSize(_v.x, _v.y);
      const t = performance.now() / 1000;
      const ac = renderer.autoClear, tm = renderer.toneMapping; renderer.autoClear = true;
      renderer.toneMapping = THREE.NoToneMapping; // 场景保持线性 HDR，统一在合成里做 ACES
      renderer.setRenderTarget(T.scene); renderer.clear(); renderer.render(scene, camera);
      renderer.toneMapping = tm;
      let src = T.scene; CU.uSunRay.value = 0; CU.tSunRays.value = black;
      const sun = atmosOn(scene) ? sunOf(scene) : null;
      if (sun) {
        _sd.setFromMatrixPosition(sun.matrixWorld).sub(_sp.setFromMatrixPosition(sun.target.matrixWorld)).normalize();
        const sc = sun.color, si = sun.intensity, fg = scene.fog ? scene.fog.color : null, A = atm.u;
        A.tScene.value = T.scene.texture; A.tDepth.value = T.scene.depthTexture; A.uProjInv.value.copy(camera.projectionMatrixInverse); A.uViewInv.value.copy(camera.matrixWorld);
        A.uCam.value.setFromMatrixPosition(camera.matrixWorld); A.uSunDir.value.copy(_sd); A.uSunCol.value.set(sc.r * si, sc.g * si, sc.b * si); if (fg) A.uFogCol.value.set(fg.r, fg.g, fg.b);
        A.uMie.value = P.mie; A.uG.value = P.mieG; A.uMieDist.value = P.mieDist; A.uMist.value = P.mist; A.uMistH.value = P.mistH; A.uMistDist.value = P.mistDist; A.uGround.value = sun.target.position.y; A.uT.value = t;
        pass(atm, T.atm); src = T.atm;
        // 太阳光束：太阳在镜头前方（可以略在画外）时沿屏幕径向散射天空像素
        if (q.rays && P.sunRay > 0) {
          _l.copy(A.uCam.value).addScaledVector(_sd, 1000).project(camera);
          const inFront = _l.z < 1 && _l.z > -1, edge = Math.max(Math.abs(_l.x), Math.abs(_l.y)), fade = inFront ? Math.max(0, 1 - Math.max(0, edge - 1.0) / 0.8) : 0;
          if (fade > 0.01) {
            const S = sunSrc.u; S.tScene.value = T.scene.texture; S.tDepth.value = T.scene.depthTexture; S.uSun.value.set(_l.x * 0.5 + 0.5, _l.y * 0.5 + 0.5); S.uAsp.value = W / H; S.uTex.value.set(1.5 / W, 1.5 / H);
            pass(sunSrc, T.sun);
            sunRays.u.tSrc.value = T.sun.texture; sunRays.u.uLight.value.copy(S.uSun.value); sunRays.u.uDecay.value = P.sunRayDecay; sunRays.u.uT.value = (t * 60 | 0) % 64;
            pass(sunRays, T.sunRays); CU.tSunRays.value = T.sunRays.texture; CU.uSunRay.value = P.sunRay * fade * Math.min(1.5, 0.35 + Math.max(0, _sd.y) * 0.9);
            CU.uSunRayCol.value.set(Math.min(2, sc.r * 1.1), Math.min(2, sc.g), Math.min(2, sc.b * 0.85));
          }
        }
      }
      // AO
      if (q.ao) {
        const ap = mkAO(q.aoSamples);
        ap.u.tDepth.value = T.scene.depthTexture; ap.u.uProjInv.value.copy(camera.projectionMatrixInverse); ap.u.uRes.value.set(T.aw, T.ah);
        ap.u.uProjScale.value = T.ah / (2 * Math.tan(camera.fov * Math.PI / 360)); ap.u.uT.value = (t * 60 | 0) % 64; ap.u.uRadius.value = P.aoRadius;
        pass(ap, T.ao);
        aoBlur.u.tDepth.value = T.scene.depthTexture; aoBlur.u.uNear.value = camera.near; aoBlur.u.uFar.value = camera.far;
        aoBlur.u.tAO.value = T.ao.texture; aoBlur.u.uDir.value.set(1.2 / T.aw, 0); pass(aoBlur, T.ao2);
        aoBlur.u.tAO.value = T.ao2.texture; aoBlur.u.uDir.value.set(0, 1.2 / T.ah); pass(aoBlur, T.ao);
        CU.tAO.value = T.ao.texture; CU.uAO.value = P.aoStr;
      } else { CU.tAO.value = white; CU.uAO.value = 0; }
      // 泛光
      if (q.bloom) {
        bright.u.tSrc.value = src.texture; bright.u.uTex.value.set(1 / W, 1 / H); bright.u.uThresh.value = P.bloomThresh; pass(bright, T.mips[0]);
        for (let i = 1; i < MIPS; i++) { down.u.tSrc.value = T.mips[i - 1].texture; down.u.uTex.value.set(1 / T.mips[i - 1].width, 1 / T.mips[i - 1].height); pass(down, T.mips[i]); }
        let prev = T.mips[MIPS - 1];
        for (let i = MIPS - 2; i >= 0; i--) { up.u.tSrc.value = prev.texture; up.u.tPrev.value = T.mips[i].texture; up.u.uTex.value.set(1 / prev.width, 1 / prev.height); pass(up, T.ups[i]); prev = T.ups[i]; }
        CU.tBloom.value = T.ups[0].texture; CU.uBloom.value = P.bloomStr / MIPS * 2.2;
      } else { CU.tBloom.value = black; CU.uBloom.value = 0; }
      // 体积光：光源在画面前方时才做
      CU.uRay.value = 0; CU.tRays.value = black;
      if (q.rays && q.bloom && rayWorld && rayStr > 0) {
        _l.copy(rayWorld).project(camera);
        const inFront = _l.z < 1 && _l.z > -1; const edge = Math.max(Math.abs(_l.x), Math.abs(_l.y));
        const fade = inFront ? Math.max(0, 1 - Math.max(0, edge - 0.9) / 0.9) : 0;
        if (fade > 0.01) {
          rays.u.tSrc.value = T.mips[1].texture; rays.u.uLight.value.set(_l.x * 0.5 + 0.5, _l.y * 0.5 + 0.5); rays.u.uT.value = (t * 60 | 0) % 64;
          pass(rays, T.rays); CU.tRays.value = T.rays.texture; CU.uRay.value = P.rayStr * rayStr * fade;
        }
      }
      CU.tScene.value = src.texture; CU.uT.value = t; CU.uExp.value = P.exposure;
      CU.uSat.value = P.sat; CU.uCon.value = P.contrast; CU.uShT.value.set(P.shadowTint[0], P.shadowTint[1], P.shadowTint[2]); CU.uHiT.value.set(P.highTint[0], P.highTint[1], P.highTint[2]); CU.uVig.value = P.vig; CU.uGrain.value = P.grain; // R46：调色可被 WorldMaster 按地区实时调整
      if (q.fxaa) { pass(comp, T.ldr); fxaa.u.tSrc.value = T.ldr.texture; pass(fxaa, null); } else pass(comp, null);
      renderer.autoClear = ac;
    }
    function warm() { try { for (const p of [mkAO(q.aoSamples), aoBlur, bright, down, up, rays, comp, fxaa, atm, sunSrc, sunRays]) renderer.compile(p.sc, cam); for (const k in Q) renderer.compile(mkAO(Q[k].aoSamples).sc, cam); } catch (e) { } } // 第二十一轮：三档 AO 变体一起预编，切档不再现编
    return { on: true, style: 'master', setSize, render, setTier, get tier() { return tier; }, setRayLight, warm, P };
  }
  return { create, P, Q };
})();
