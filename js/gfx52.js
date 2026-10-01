// R52 画质 Agent · 野外细节 MOD 合集（js/gfx52.js；只挂钩子，不改别人的文件）
//  · MOD foliage_glow：所有 alpha 裁剪的非角色 PBR 材质（树叶 / 灌木 / 草卡片）加逆光透射 —— 迎着太阳的树冠发出黄绿色透光。
//  · MOD sky_master：天空球改用 Catmull-Rom 双三次采样（2K 天空照片放大不再糊）+ 太阳周围的 HDR 光晕（驱动泛光与光束）。
//  · MOD water_master：水面菲涅尔反射增强（掠射角像镜子、俯视透出水色）+ 更锐利的天空反射。
//  · MOD pcss_shadows：太阳阴影改为 PCSS（接触处锐利、离遮挡物越远越柔，树影有真实的半影）。只对 shadow.radius>8 的光生效（由这里给野外太阳设置）。
window.Gfx52 = (() => {
  'use strict';
  const M = (id) => !(window.Mods && Mods.on && Mods.on(id) === false);
  if (M('pcss_shadows') && THREE.ShaderChunk.shadowmap_pars_fragment.indexOf('pcss52') < 0) {
    const PC = `float pcss52( sampler2D sm, vec2 smSize, float lk, vec3 c ) {
      float rot = fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) ) * 6.2831853;
      float tx = 1.0 / smSize.x, sr = max( lk * 0.00025, 3.0 * tx ), bs = 0.0, bn = 0.0;
      for ( int i = 0; i < 12; i ++ ) { float fi = float( i ), a = fi * 2.3999632 + rot; vec2 o = vec2( cos( a ), sin( a ) ) * sqrt( ( fi + 0.5 ) / 12.0 ) * sr;
        float d = unpackRGBAToDepth( texture2D( sm, c.xy + o ) ); if ( d < c.z ) { bs += d; bn += 1.0; } }
      if ( bn < 0.5 ) return 1.0;
      float pen = clamp( ( c.z - bs / bn ) * lk * 0.001, 1.2 * tx, sr * 2.0 ), s = 0.0;
      for ( int i = 0; i < 16; i ++ ) { float fi = float( i ), a = fi * 2.3999632 + rot + 1.3; vec2 o = vec2( cos( a ), sin( a ) ) * sqrt( ( fi + 0.5 ) / 16.0 ) * pen; s += texture2DCompare( sm, c.xy + o, c.z ); }
      return s / 16.0;
    }
    `;
    let C = THREE.ShaderChunk.shadowmap_pars_fragment;
    const sig = 'float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord ) {';
    if (C.indexOf(sig) >= 0 && /if \( frustumTest \) \{\s*#if defined\( SHADOWMAP_TYPE_PCF \)/.test(C)) {
      C = C.replace(sig, PC + sig).replace(/if \( frustumTest \) \{(\s*)#if defined\( SHADOWMAP_TYPE_PCF \)/, 'if ( frustumTest ) {$1if ( shadowRadius > 8.0 ) return pcss52( shadowMap, shadowMapSize, shadowRadius, shadowCoord.xyz );$1#if defined( SHADOWMAP_TYPE_PCF )');
      THREE.ShaderChunk.shadowmap_pars_fragment = C;
    }
  }
  if (M('foliage_glow') && THREE.ShaderChunk.lights_physical_pars_fragment.indexOf('RE_Direct_Fol') < 0) {
    THREE.ShaderChunk.lights_physical_pars_fragment += `
#if defined( USE_ALPHATEST ) && !defined( CHAR_MAT )
void RE_Direct_Fol( const in IncidentLight directLight, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
  RE_Direct_Physical( directLight, geometry, material, reflectedLight );
  float nl = dot( geometry.normal, directLight.direction ), bl = pow( saturate( dot( -geometry.viewDir, directLight.direction ) ), 3.0 );
  reflectedLight.directDiffuse += directLight.color * material.diffuseColor * vec3( 1.25, 1.35, 0.72 ) * ( bl * 0.75 + saturate( -nl ) * 0.4 ) * RECIPROCAL_PI;
}
#undef RE_Direct
#define RE_Direct RE_Direct_Fol
#endif`;
  }
  const CR = `uniform vec2 uTS; uniform vec3 uSunD; uniform float uSunK;
    vec3 wsCR(sampler2D tex, vec2 uv) { // Catmull-Rom 5 次采样（Jimenez）
      vec2 sp = uv * uTS, t1 = floor(sp - 0.5) + 0.5, f = sp - t1;
      vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f)), w1 = 1.0 + f * f * (-2.5 + 1.5 * f), w2 = f * (0.5 + f * (2.0 - 1.5 * f)), w3 = f * f * (-0.5 + 0.5 * f);
      vec2 w12 = w1 + w2, o12 = w2 / w12, t0 = (t1 - 1.0) / uTS, t3 = (t1 + 2.0) / uTS, tc = (t1 + o12) / uTS;
      vec3 r = texture2D(tex, vec2(tc.x, t0.y)).rgb * w12.x * w0.y + texture2D(tex, vec2(t0.x, tc.y)).rgb * w0.x * w12.y + texture2D(tex, tc).rgb * w12.x * w12.y
        + texture2D(tex, vec2(t3.x, tc.y)).rgb * w3.x * w12.y + texture2D(tex, vec2(tc.x, t3.y)).rgb * w12.x * w3.y;
      return max(r / (w12.x * w0.y + w0.x * w12.y + w12.x * w12.y + w3.x * w12.y + w12.x * w3.y), 0.0);
    }
    void main(){`;
  function sky(sc, B) {
    const m = sc.userData.skyM && sc.userData.skyM.material; if (!m || m.userData.s52 || !m.uniforms || !m.uniforms.map || !m.uniforms.map.value || !m.uniforms.map.value.image) return;
    m.userData.s52 = 1; const tx = m.uniforms.map.value, im = tx.image;
    tx.wrapS = THREE.RepeatWrapping; tx.needsUpdate = true;
    let sun = null; sc.traverse(o => { if (o.isDirectionalLight && (!sun || o.intensity > sun.intensity)) sun = o; });
    const sd = B && B.sunDir ? B.sunDir.clone().normalize() : new THREE.Vector3(0, 1, 0);
    const ry = sc.userData.skyM.rotation.y; sd.applyAxisAngle(new THREE.Vector3(0, 1, 0), -ry); // 天空球自身旋转了 yaw：转到球的局部方向
    Object.assign(m.uniforms, { uTS: { value: new THREE.Vector2(im.width, im.height) }, uSunD: { value: sd }, uSunK: { value: sun ? Math.min(2.5, sun.intensity) : 0 } });
    m.fragmentShader = m.fragmentShader.replace('void main(){', CR).replace('texture2D(map, uv).rgb', 'wsCR(map, uv)')
      .replace('gl_FragColor = vec4(c, 1.0);', '{ float sa = max(dot(d, uSunD), 0.0); c *= 1.0 + uSunK * (5.0 * pow(sa, 1600.0) + 0.6 * pow(sa, 48.0) * smoothstep(0.6, 1.0, dot(c, vec3(0.33)))); } gl_FragColor = vec4(c, 1.0);');
    m.needsUpdate = true;
  }
  function water(sc) {
    const sm = sc.userData.skyM && sc.userData.skyM.material; if (!sm || !sm.uniforms || !sm.uniforms.map) return;
    const SU = { uSkyMap: sm.uniforms.map, uSkyK: sm.uniforms.k, uSkyT: sm.uniforms.tint, uSkyYaw: { value: sc.userData.skyM.rotation.y } };
    sc.traverse(o => { const m = o.material; if (!o.isMesh || !m || !m.isMeshStandardMaterial || !m.userData || !m.userData.U || m.userData.fx === undefined || m.userData.w52) return;
      m.userData.w52 = 1;
      const prev = m.onBeforeCompile; m.onBeforeCompile = function (sh, r) { if (prev) prev.call(this, sh, r); Object.assign(sh.uniforms, SU);
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uSkyMap; uniform float uSkyK; uniform vec3 uSkyT; uniform float uSkyYaw;')
          .replace('#include <output_fragment>', `{ vec3 nW = inverseTransformDirection(normal, viewMatrix), vW = normalize(vWP - cameraPosition), rW = reflect(vW, nW); rW.y = abs(rW.y);
            float cy = cos(uSkyYaw), sy = sin(uSkyYaw); vec3 d = vec3(cy * rW.x - sy * rW.z, rW.y, sy * rW.x + cy * rW.z);
            vec3 sk = texture2D(uSkyMap, vec2(atan(d.z, d.x) * 0.1591549 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.3183099 + 0.5)).rgb * uSkyK * uSkyT;
            float fr = 0.02 + 0.98 * pow(1.0 - saturate(dot(nW, -vW)), 5.0);
            outgoingLight = mix(outgoingLight, sk * 0.85, fr * 0.8); diffuseColor.a = mix(diffuseColor.a, 1.0, fr * 0.7); }
          #include <output_fragment>`); };
      const k = m.customProgramCacheKey; m.customProgramCacheKey = () => (k ? k.call(m) : '') + 'w52'; m.needsUpdate = true; });
  }
  let cur = null;
  function tick() {
    requestAnimationFrame(tick);
    const W = window.Worlds && Worlds._W, B = (W && W.B) || window.__B; if (!B || !B.sc) return;
    if (B.sun && B.sun.shadow && M('pcss_shadows')) { const R = 2070 / Math.max(4, B.sun.shadow.camera.right || 26); if (Math.abs(B.sun.shadow.radius - R) > 0.5) B.sun.shadow.radius = R; } // 太阳角径约 1.5° 的半影
    if (B === cur) return; cur = B;
    try { if (M('sky_master')) sky(B.sc, B); } catch (e) { console.warn('Gfx52 sky', e); }
    try { if (M('water_master')) water(B.sc); } catch (e) { console.warn('Gfx52 water', e); }
  }
  requestAnimationFrame(tick);
  return { sky, water };
})();
