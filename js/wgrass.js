// R50 · 壳层草地（MOD shell_grass，默认开）——js/wgrass.js
// 用户："不是放草模型的那种渲染方案，边缘毛茸茸"。这就是：shell texturing（毛发壳层）——
// 同一块地形网格沿法线外推 12 层，片元着色器按哈希格子丢弃像素，拼出一根根逐渐变细的草；
// 没有任何草模型、没有贴图（纯着色器里的哈希噪声）。每层只是一次 draw call，只覆盖玩家可达区域，
// 离镜头越远草越矮（≥26m 完全消失，退回地面贴图），坡度大 / 路 / 水边自动不长。
// 光照走 MeshLambert（太阳 + 半球 + 阴影 + 雾都正常），风 = 顶端随时间摆动。
window.WGrass = (() => {
  const on = () => !(window.Mods && Mods.on && Mods.on('shell_grass') === false);
  const LUSH = { meadow: 1, forest: 0.9, swamp: 0.8, village: 0.8, wilds: 0.38, ruins: 0.5, fortress: 0.42, capital: 0.45, abyss: 0.06, peak: 0.12 };
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function patch(mat, U, L) {
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
            float cm = smoothstep(0.34, 0.66, vn(q * 0.05 * uPF + 11.0) * 0.65 + vn(q * 0.17 * uPF + 3.0) * 0.35); // 色块：A/B 两种草色成片交错
            float tm = vn(q * 0.13 * uPF + 29.0); float tall = mix(0.55, 1.45, smoothstep(0.25, 0.75, tm)) * uHt; // 高低成片
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
  // tg = 地形 PlaneGeometry（已写好 y / normal / color）；o = { g, style, RM, R, LP, sc }
  function build(tg, o) {
    if (!on() || !o.g) return null;
    const lush = (o.style in LUSH ? LUSH[o.style] : 0.5) * (o.g.lushK != null ? o.g.lushK : 1); if (lush < 0.04) return null;
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
    const gr = o.g.grassMul || new THREE.Color(1, 1, 1);
    const rr = (() => { let a = ((o.g.seed || 1) ^ 0x9E3779B9) >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = (t + Math.imul(t ^ t >>> 7, 61 | t)) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();
    const PAL = { fresh: [[.09, .15, .045], [.27, .38, .11]], yg: [[.10, .14, .035], [.31, .37, .09]], bg: [[.05, .13, .07], [.16, .33, .18]], olive: [[.09, .10, .04], [.27, .29, .10]], straw: [[.15, .12, .05], [.40, .32, .14]], moss: [[.04, .09, .04], [.12, .24, .10]], rust: [[.14, .08, .04], [.40, .23, .10]], lime: [[.10, .18, .03], [.36, .52, .10]] };
    const BIO = { meadow: ['fresh', 'yg', 'lime', 'straw'], forest: ['moss', 'bg', 'olive', 'fresh'], swamp: ['olive', 'moss', 'bg'], village: ['fresh', 'yg', 'straw'], wilds: ['straw', 'rust', 'olive', 'yg'], ruins: ['olive', 'straw', 'yg', 'moss'], fortress: ['fresh', 'olive', 'straw'], capital: ['fresh', 'olive', 'yg'], peak: ['bg', 'straw', 'moss'], abyss: ['moss', 'rust'] };
    const pool = (BIO[o.style] || ['fresh', 'olive', 'straw']).slice(), pa = pool.splice(Math.floor(rr() * pool.length), 1)[0], pb = pool.length ? pool[Math.floor(rr() * pool.length)] : pa;
    const fls = [[.95, .93, .85], [.95, .8, .2], [.85, .35, .55], [.55, .4, .85], [.95, .5, .15]], fl = fls[Math.floor(rr() * fls.length)];
    const V = (p, k) => new THREE.Vector3(PAL[p][k][0] * gr.r, PAL[p][k][1] * gr.g, PAL[p][k][2] * gr.b);
    const dens = 11 + rr() * 12, ht = 0.65 + rr() * 0.85, lk = lush * (0.8 + rr() * 0.4);
    const U = { uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uFar: { value: 27 }, uRad: { value: Rg }, uH: { value: (0.42 + 0.18 * lush) * (0.9 + 0.3 * rr()) }, uWind: { value: 0.7 + rr() * 0.8 },
      uBase: { value: V(pa, 0) }, uTip: { value: V(pa, 1) }, uBase2: { value: V(pb, 0) }, uTip2: { value: V(pb, 1) }, uFl: { value: new THREE.Vector3(fl[0], fl[1], fl[2]) }, uFlD: { value: lush > 0.3 && rr() < 0.7 ? 0.015 + rr() * 0.05 : 0 },
      uHt: { value: ht }, uWid: { value: 0.75 + rr() * 0.4 }, uPF: { value: 0.7 + rr() * 0.9 },
      uLush: { value: Math.min(1, lk) }, uDens: { value: dens }, uSeed: { value: ((o.g.seed || 1) % 997) * 1.37 } };
    const N = 12, grp = new THREE.Group(), mats = [];
    for (let i = 0; i < N; i++) {
      const m = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: !!tg.attributes.color }), L = { uLy: { value: (i + 1) / N } };
      patch(m, U, L); m.customProgramCacheKey = () => 'wgrass1'; mats.push(m);
      const mesh = new THREE.Mesh(geo, m); mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = true; mesh.renderOrder = 0; mesh.userData.wg = 1; grp.add(mesh);
    }
    o.sc.add(grp);
    return { group: grp, update(p, now) { U.uCam.value.copy(p); U.uT.value = now; } };
  }
  return { on, build };
})();
