// 第九轮：画风渲染 MOD（自写后处理链，不依赖 EffectComposer）
// 场景 → rtScene(线性, HalfFloat, 带深度) → prep(降采样+sRGB) → 结构张量 → 张量模糊 → 各向异性 Kuwahara(Kyprianidis 2009/2011)
//       → bloom 链 → composite(描边/纸纹/水彩边缘/画布/色调/暗角/颗粒/色差)
// 风格由 Mods 互斥组 render 决定；'outline' / 'bloom' 可叠加；'lowspec' 时整条链关闭。
window.Post = (() => {
  const ON = id => !window.Mods || Mods.on(id);
  const STYLE = ['r_illust', 'r_anime', 'r_water', 'r_oil', 'r_film', 'r_ink'].find(ON) || 'classic';
  // 各风格参数
  const P = {
    classic: { kuwa: 0 },
    r_illust: { kuwa: 1, R: 3.5, q: 10.0, alpha: 1.0, paint: 0.95, line: 0.7, lineW: 1.0, ink: [0.14, 0.06, 0.09], paper: 0.08, sat: 1.18, warm: 0.03, contrast: 1.1, vig: 0.3, bloom: 0.45, glow: 0.06, post: 0, sharp: 0.6 },
    r_anime: { kuwa: 1, R: 2.5, q: 12.0, alpha: 1.0, paint: 0.55, line: 0.95, lineW: 1.4, ink: [0.08, 0.04, 0.07], paper: 0.0, sat: 1.32, warm: 0.02, contrast: 1.12, vig: 0.12, bloom: 0.85, glow: 0.1, post: 4.0 },
    r_water: { kuwa: 1, R: 3.0, q: 6.0, alpha: 1.0, paint: 0.85, line: 0.28, lineW: 1.0, ink: [0.25, 0.14, 0.14], paper: 0.32, sat: 0.92, warm: 0.03, contrast: 0.95, vig: 0.18, bloom: 0.4, glow: 0.12, post: 0, wet: 1.0, wob: 0.0035, lift: 0.1 },
    r_oil: { kuwa: 1, R: 6.0, q: 10.0, alpha: 1.0, paint: 1.0, line: 0.18, lineW: 1.0, ink: [0.12, 0.06, 0.04], paper: 0.0, canvas: 0.22, relief: 0.35, sat: 1.15, warm: 0.07, contrast: 1.08, vig: 0.32, bloom: 0.45, glow: 0.12, post: 0 },
    r_film: { kuwa: 0, line: 0.0, paper: 0.0, sat: 0.95, warm: 0.0, teal: 0.12, contrast: 1.12, vig: 0.55, bloom: 1.0, glow: 0.0, grain: 0.055, ca: 0.0022, post: 0 },
    r_ink: { kuwa: 1, R: 3.0, q: 8.0, alpha: 1.0, paint: 0.8, line: 1.0, lineW: 1.2, ink: [0.03, 0.02, 0.02], paper: 0.3, sat: 1.0, ink2: 1.0, contrast: 1.15, vig: 0.3, bloom: 0.35, glow: 0.0, post: 5.0 }
  };
  const S = Object.assign({ kuwa: 0, R: 4, q: 8, alpha: 1, paint: 0, line: 0, lineW: 1, ink: [0.1, 0.05, 0.08], paper: 0, canvas: 0, relief: 0, sat: 1, warm: 0, teal: 0, contrast: 1, vig: 0.15, bloom: 0.6, glow: 0, grain: 0, ca: 0, post: 0, wet: 0, wob: 0, lift: 0, ink2: 0, sharp: 0.3 }, P[STYLE]);
  if (!ON('bloom')) S.bloom = 0;
  if (ON('outline') && S.line < 0.5) { S.line = 0.5; S.lineW = Math.max(S.lineW, 1.0); }
  const enabled = !ON('lowspec') && (STYLE !== 'classic' || S.bloom > 0 || S.line > 0);

  const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mkPass = (fs, uniforms) => { const m = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false, toneMapped: false }); const sc = new THREE.Scene(); const q = new THREE.Mesh(quadGeo, m); q.frustumCulled = false; sc.add(q); return { m, sc, u: uniforms }; };

  const NOISE = `float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
    float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a * vn(p); p *= 2.03; a *= 0.5; } return s; }`;

  // prep: 降采样 + 线性→sRGB
  const PREP = `uniform sampler2D tSrc; varying vec2 vUv; void main(){ vec3 c = texture2D(tSrc, vUv).rgb; gl_FragColor = vec4(pow(max(c, 0.0), vec3(1.0/2.2)), 1.0); }`;
  // 结构张量（Sobel）
  const SST = `uniform sampler2D tSrc; uniform vec2 uTex; varying vec2 vUv;
    vec3 L(vec2 o){ return texture2D(tSrc, vUv + o * uTex).rgb; }
    void main(){
      vec3 u = (-1.0*L(vec2(-1,-1)) - 2.0*L(vec2(-1,0)) - 1.0*L(vec2(-1,1)) + 1.0*L(vec2(1,-1)) + 2.0*L(vec2(1,0)) + 1.0*L(vec2(1,1))) / 4.0;
      vec3 v = (-1.0*L(vec2(-1,-1)) - 2.0*L(vec2(0,-1)) - 1.0*L(vec2(1,-1)) + 1.0*L(vec2(-1,1)) + 2.0*L(vec2(0,1)) + 1.0*L(vec2(1,1))) / 4.0;
      gl_FragColor = vec4(dot(u,u), dot(v,v), dot(u,v), 1.0);
    }`;
  // 高斯模糊（可分离）
  const BLUR = `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
    void main(){ vec4 s = texture2D(tSrc, vUv) * 0.227027;
      s += (texture2D(tSrc, vUv + uDir * 1.3846) + texture2D(tSrc, vUv - uDir * 1.3846)) * 0.3162162;
      s += (texture2D(tSrc, vUv + uDir * 3.2308) + texture2D(tSrc, vUv - uDir * 3.2308)) * 0.0702703;
      gl_FragColor = s; }`;
  // 各向异性 Kuwahara（多项式权重，8 扇区）
  const MAXR = 6;
  const AKF = `#define MAXR ${MAXR}
    uniform sampler2D tSrc; uniform sampler2D tTen; uniform vec2 uTex; uniform float uR; uniform float uQ; uniform float uAlpha; varying vec2 vUv;
    void main(){
      vec3 t = texture2D(tTen, vUv).xyz; float E = t.x, G = t.y, F = t.z;
      float D = sqrt((E-G)*(E-G) + 4.0*F*F);
      float l1 = 0.5*(E+G+D), l2 = 0.5*(E+G-D);
      vec2 dv = vec2(l1 - E, -F); vec2 d = length(dv) > 1e-6 ? normalize(dv) : vec2(0.0, 1.0);
      float phi = -atan(d.y, d.x);
      float A = (l1 + l2 > 1e-6) ? (l1 - l2) / (l1 + l2) : 0.0;
      float a = uR * clamp((uAlpha + A) / uAlpha, 0.1, 2.0);
      float b = uR * clamp(uAlpha / (uAlpha + A), 0.1, 2.0);
      float cp = cos(phi), sp = sin(phi);
      mat2 SR = mat2(0.5/a, 0.0, 0.0, 0.5/b) * mat2(cp, -sp, sp, cp);
      float mx = min(float(MAXR), sqrt(a*a*cp*cp + b*b*sp*sp)), my = min(float(MAXR), sqrt(a*a*sp*sp + b*b*cp*cp));
      vec4 m0=vec4(0.0),m1=vec4(0.0),m2=vec4(0.0),m3=vec4(0.0),m4=vec4(0.0),m5=vec4(0.0),m6=vec4(0.0),m7=vec4(0.0);
      vec3 s0=vec3(0.0),s1=vec3(0.0),s2=vec3(0.0),s3=vec3(0.0),s4=vec3(0.0),s5=vec3(0.0),s6=vec3(0.0),s7=vec3(0.0);
      float zeta = 2.0 / uR, eta = 0.84;
      for (int j = -MAXR; j <= MAXR; j++) for (int i = -MAXR; i <= MAXR; i++) {
        if (abs(float(i)) > mx || abs(float(j)) > my) continue;
        vec2 v = SR * vec2(float(i), float(j));
        if (dot(v, v) > 0.25) continue;
        vec3 c = texture2D(tSrc, vUv + vec2(float(i), float(j)) * uTex).rgb; vec3 cc = c * c;
        float vxx = zeta - eta*v.x*v.x, vyy = zeta - eta*v.y*v.y, z;
        float w0, w1, w2, w3, w4, w5, w6, w7;
        z = max(0.0,  v.y + vxx); w0 = z*z; z = max(0.0, -v.x + vyy); w2 = z*z; z = max(0.0, -v.y + vxx); w4 = z*z; z = max(0.0,  v.x + vyy); w6 = z*z;
        vec2 r = 0.70710678 * vec2(v.x - v.y, v.x + v.y); vxx = zeta - eta*r.x*r.x; vyy = zeta - eta*r.y*r.y;
        z = max(0.0,  r.y + vxx); w1 = z*z; z = max(0.0, -r.x + vyy); w3 = z*z; z = max(0.0, -r.y + vxx); w5 = z*z; z = max(0.0,  r.x + vyy); w7 = z*z;
        float g = exp(-3.125 * dot(v, v)) / max(1e-5, w0+w1+w2+w3+w4+w5+w6+w7);
        w0*=g; w1*=g; w2*=g; w3*=g; w4*=g; w5*=g; w6*=g; w7*=g;
        m0 += vec4(c*w0, w0); s0 += cc*w0; m1 += vec4(c*w1, w1); s1 += cc*w1; m2 += vec4(c*w2, w2); s2 += cc*w2; m3 += vec4(c*w3, w3); s3 += cc*w3;
        m4 += vec4(c*w4, w4); s4 += cc*w4; m5 += vec4(c*w5, w5); s5 += cc*w5; m6 += vec4(c*w6, w6); s6 += cc*w6; m7 += vec4(c*w7, w7); s7 += cc*w7;
      }
      vec4 o = vec4(0.0);
      #define ACC(M, SS) if (M.w > 1e-5) { vec3 mu = M.rgb / M.w; vec3 va = abs(SS / M.w - mu*mu); float sg = va.r + va.g + va.b; float wk = 1.0 / (1.0 + pow(255.0 * sg, 0.5 * uQ)); o += vec4(mu * wk, wk); }
      ACC(m0, s0) ACC(m1, s1) ACC(m2, s2) ACC(m3, s3) ACC(m4, s4) ACC(m5, s5) ACC(m6, s6) ACC(m7, s7)
      gl_FragColor = vec4(o.w > 1e-6 ? o.rgb / o.w : texture2D(tSrc, vUv).rgb, 1.0);
    }`;
  // 亮部提取（bloom）
  const BRIGHT = `uniform sampler2D tSrc; varying vec2 vUv; void main(){ vec3 c = texture2D(tSrc, vUv).rgb; float l = dot(c, vec3(0.299,0.587,0.114)); gl_FragColor = vec4(c * smoothstep(0.62, 0.95, l), 1.0); }`;
  // 合成
  const COMP = `uniform sampler2D tScene; uniform sampler2D tPaint; uniform sampler2D tDepth; uniform sampler2D tB1; uniform sampler2D tB2;
    uniform vec2 uTex; uniform vec2 uRes; uniform float uNear; uniform float uFar; uniform float uT;
    uniform float uKuwa, uPaint, uLine, uLineW, uPaper, uCanvas, uRelief, uSat, uWarm, uTeal, uContrast, uVig, uBloom, uGlow, uGrain, uCA, uPost, uWet, uWob, uLift, uInk2, uSharp; uniform vec3 uInk;
    varying vec2 vUv; ${NOISE}
    float lin(float z){ return (uNear * uFar) / (uFar - z * (uFar - uNear)); }
    vec3 SRGB(vec3 c){ return pow(max(c, 0.0), vec3(1.0/2.2)); }
    float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
    void main(){
      vec2 uv = vUv;
      if (uWob > 0.0) uv += (vec2(fbm(uv * 9.0 + 3.1), fbm(uv * 9.0 - 7.7)) - 0.5) * uWob;
      vec3 base = SRGB(texture2D(tScene, uv).rgb);
      if (uCA > 0.0) { vec2 dc = (uv - 0.5) * uCA; base.r = SRGB(texture2D(tScene, uv + dc).rgb).r; base.b = SRGB(texture2D(tScene, uv - dc).rgb).b; }
      vec3 col = base;
      if (uKuwa > 0.5) { vec3 pt = texture2D(tPaint, uv).rgb; vec3 pn = (texture2D(tPaint, uv + vec2(uTex.x * 1.5, 0.0)).rgb + texture2D(tPaint, uv - vec2(uTex.x * 1.5, 0.0)).rgb + texture2D(tPaint, uv + vec2(0.0, uTex.y * 1.5)).rgb + texture2D(tPaint, uv - vec2(0.0, uTex.y * 1.5)).rgb) * 0.25; pt += (pt - pn) * uSharp * 2.0; col = mix(base, pt, uPaint); }
      // 色阶化（赛璐璐/水墨）
      if (uPost > 0.5) { float l = luma(col); float q = floor(l * uPost + 0.5) / uPost; col *= mix(1.0, q / max(l, 0.02), 0.65); }
      // 水彩：边缘积色 + 颜料晕开
      if (uWet > 0.0) { vec3 bl = texture2D(tB2, uv).rgb; float e = clamp(length(col - texture2D(tPaint, uv + uTex * 3.0).rgb) * 3.0, 0.0, 1.0); col *= 1.0 - e * 0.22 * uWet; col = mix(col, col * col * 1.15, 0.25 * uWet); }
      // 描边：深度 + 颜色边缘
      if (uLine > 0.0) {
        vec2 o = uTex * uLineW;
        float d0 = lin(texture2D(tDepth, uv).x);
        float d1 = lin(texture2D(tDepth, uv + vec2(o.x, 0.0)).x), d2 = lin(texture2D(tDepth, uv - vec2(o.x, 0.0)).x);
        float d3 = lin(texture2D(tDepth, uv + vec2(0.0, o.y)).x), d4 = lin(texture2D(tDepth, uv - vec2(0.0, o.y)).x);
        float de = abs(d1 + d2 + d3 + d4 - 4.0 * d0) / max(d0, 0.05);
        float eD = smoothstep(0.06, 0.2, de);
        vec3 c1 = SRGB(texture2D(tScene, uv + vec2(o.x, 0.0)).rgb), c2 = SRGB(texture2D(tScene, uv - vec2(o.x, 0.0)).rgb);
        vec3 c3 = SRGB(texture2D(tScene, uv + vec2(0.0, o.y)).rgb), c4 = SRGB(texture2D(tScene, uv - vec2(0.0, o.y)).rgb);
        float eC = smoothstep(0.12, 0.34, length(c1 - c2) + length(c3 - c4));
        float fade = 1.0 - smoothstep(9.0, 22.0, d0);
        float e = max(eD, eC * 0.55) * fade * uLine;
        col = mix(col, uInk * (0.6 + 0.4 * col), clamp(e, 0.0, 0.92));
      }
      // 油画：笔触浮雕 + 画布
      if (uRelief > 0.0) { float lx = luma(texture2D(tPaint, uv + vec2(uTex.x, 0.0)).rgb) - luma(texture2D(tPaint, uv - vec2(uTex.x, 0.0)).rgb); float ly = luma(texture2D(tPaint, uv + vec2(0.0, uTex.y)).rgb) - luma(texture2D(tPaint, uv - vec2(0.0, uTex.y)).rgb); col *= 1.0 + (lx * 0.7 - ly * 0.7) * uRelief * 2.0; }
      if (uCanvas > 0.0) { vec2 p = uv * uRes / 3.0; float w = sin(p.x * 3.14159) * sin(p.y * 3.14159); col *= 1.0 - uCanvas * (0.5 + 0.5 * w) * 0.35 - uCanvas * 0.12 * (fbm(uv * uRes * 0.08) - 0.5); }
      // 泛光 + 柔光晕
      vec3 b = texture2D(tB1, uv).rgb * 0.6 + texture2D(tB2, uv).rgb * 0.8;
      col += b * uBloom;
      if (uGlow > 0.0) { vec3 soft = texture2D(tB2, uv).rgb; col = 1.0 - (1.0 - col) * (1.0 - soft * uGlow * 2.0); }
      // 水墨：去色，只留红
      if (uInk2 > 0.0) { float l = luma(col); float red = clamp((col.r - max(col.g, col.b)) * 2.5, 0.0, 1.0); vec3 g = vec3(l) * vec3(1.0, 0.98, 0.94); col = mix(g, col, red * 0.85); }
      // 调色
      float l = luma(col);
      col = mix(vec3(l), col, uSat);
      col += vec3(uWarm, uWarm * 0.3, -uWarm * 0.6);
      if (uTeal > 0.0) col = mix(col, col * mix(vec3(0.85, 1.0, 1.08), vec3(1.1, 0.98, 0.86), smoothstep(0.2, 0.8, l)), uTeal * 2.0);
      col = (col - 0.5) * uContrast + 0.5;
      if (uLift > 0.0) col = mix(col, vec3(1.0, 0.98, 0.95), uLift * (1.0 - l));
      // 纸纹
      if (uPaper > 0.0) { float n = fbm(uv * uRes * 0.012) * 0.6 + vn(uv * uRes * 0.35) * 0.4; col *= 1.0 - uPaper * (n - 0.35) * 0.55; col = mix(col, col * vec3(1.03, 1.0, 0.94), uPaper); }
      // 暗角 + 颗粒
      vec2 q = vUv - 0.5; col *= 1.0 - uVig * smoothstep(0.25, 0.85, dot(q, q) * 2.2);
      if (uGrain > 0.0) col += (h21(vUv * uRes + fract(uT) * 61.0) - 0.5) * uGrain;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`;

  function create(renderer) {
    if (!enabled) return { on: false, style: STYLE, setSize() {}, render() {} };
    const gl2 = renderer.capabilities.isWebGL2;
    const hf = gl2 && renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType;
    const rt = (w, h, type, depth) => { const t = new THREE.WebGLRenderTarget(w, h, { type: type || THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: !!depth }); if (depth) { t.depthTexture = new THREE.DepthTexture(w, h); t.depthTexture.type = THREE.UnsignedIntType; } return t; };
    let W = 0, H = 0, T = {};
    const prep = mkPass(PREP, { tSrc: { value: null } });
    const sst = mkPass(SST, { tSrc: { value: null }, uTex: { value: new THREE.Vector2() } });
    const blur = mkPass(BLUR, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
    const akf = mkPass(AKF, { tSrc: { value: null }, tTen: { value: null }, uTex: { value: new THREE.Vector2() }, uR: { value: S.R }, uQ: { value: S.q }, uAlpha: { value: S.alpha } });
    const bright = mkPass(BRIGHT, { tSrc: { value: null } });
    const U = { tScene: { value: null }, tPaint: { value: null }, tDepth: { value: null }, tB1: { value: null }, tB2: { value: null }, uTex: { value: new THREE.Vector2() }, uRes: { value: new THREE.Vector2() }, uNear: { value: 0.05 }, uFar: { value: 100 }, uT: { value: 0 }, uInk: { value: new THREE.Vector3(...S.ink) } };
    for (const [k, v] of Object.entries({ uKuwa: S.kuwa, uPaint: S.paint, uLine: S.line, uLineW: S.lineW, uPaper: S.paper, uCanvas: S.canvas, uRelief: S.relief, uSat: S.sat, uWarm: S.warm, uTeal: S.teal, uContrast: S.contrast, uVig: S.vig, uBloom: S.bloom, uGlow: S.glow, uGrain: S.grain, uCA: S.ca, uPost: S.post, uWet: S.wet, uWob: S.wob, uLift: S.lift, uInk2: S.ink2, uSharp: S.sharp })) U[k] = { value: v };
    const comp = mkPass(COMP, U);
    const kScale = 0.75; // Kuwahara 在 60% 分辨率上做，性能友好
    function setSize(w, h) {
      if (w === W && h === H) return; W = w; H = h;
      for (const k in T) if (T[k] && T[k].dispose) T[k].dispose();
      const kw = Math.max(2, Math.round(w * kScale)), kh = Math.max(2, Math.round(h * kScale));
      const bw = Math.max(2, w >> 2), bh = Math.max(2, h >> 2), cw = Math.max(2, w >> 3), ch = Math.max(2, h >> 3);
      T = { scene: rt(w, h, hf, true), s: rt(kw, kh), ten: rt(kw, kh, hf), ten2: rt(kw, kh, hf), paint: rt(kw, kh), b1: rt(bw, bh), b1t: rt(bw, bh), b2: rt(cw, ch), b2t: rt(cw, ch) };
      T.b1.texture.userData = { w: bw, h: bh }; T.b2.texture.userData = { w: cw, h: ch };
      U.uTex.value.set(1 / w, 1 / h); U.uRes.value.set(w, h);
      sst.u.uTex.value.set(1 / kw, 1 / kh); akf.u.uTex.value.set(1 / kw, 1 / kh);
      T.kw = kw; T.kh = kh;
    }
    const _v = new THREE.Vector2();
    function pass(p, target) { renderer.setRenderTarget(target); renderer.render(p.sc, cam); }
    function blurInto(src, tmp, dst, w, h, k) { blur.u.tSrc.value = src.texture; blur.u.uDir.value.set(k / w, 0); pass(blur, tmp); blur.u.tSrc.value = tmp.texture; blur.u.uDir.value.set(0, k / h); pass(blur, dst); }
    function render(scene, camera) {
      renderer.getDrawingBufferSize(_v); setSize(_v.x, _v.y);
      const ac = renderer.autoClear;
      renderer.setRenderTarget(T.scene); renderer.clear(); renderer.render(scene, camera);
      renderer.autoClear = true;
      prep.u.tSrc.value = T.scene.texture; pass(prep, T.s);
      if (S.kuwa) {
        sst.u.tSrc.value = T.s.texture; pass(sst, T.ten);
        blurInto(T.ten, T.ten2, T.ten, T.kw, T.kh, 1.0);
        akf.u.tSrc.value = T.s.texture; akf.u.tTen.value = T.ten.texture; pass(akf, T.paint);
      }
      if (S.bloom > 0 || S.glow > 0 || S.wet > 0) {
        bright.u.tSrc.value = T.s.texture; pass(bright, T.b1);
        blurInto(T.b1, T.b1t, T.b1, T.b1.width, T.b1.height, 1.0);
        blurInto(T.b1, T.b2t, T.b2, T.b2.width, T.b2.height, 1.0);
        blurInto(T.b2, T.b2t, T.b2, T.b2.width, T.b2.height, 1.6);
      }
      U.tScene.value = T.scene.texture; U.tPaint.value = S.kuwa ? T.paint.texture : T.s.texture; U.tDepth.value = T.scene.depthTexture; U.tB1.value = T.b1.texture; U.tB2.value = T.b2.texture;
      U.uNear.value = camera.near; U.uFar.value = camera.far; U.uT.value = performance.now() / 1000;
      pass(comp, null);
      renderer.autoClear = ac;
    }
    return { on: true, style: STYLE, setSize, render };
  }
  return { create, STYLE, enabled, params: S };
})();
