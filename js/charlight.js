// R47（R41 主管 e）MOD char_unify —— 人物统一光影（用户：“二次元人物在背光环境下非常难看，恐怖谷”）
// 病因（heads.js FaceFill）：anime_shade 把暗面抬到“满日照的 80%”、亮面至少 104%；face_light/char_lift 再加一个绝对亮度下限；
// skin_sss 在交界处染红。这些都是【绝对】尺度 → 背光/阴天/黄昏里人物比周围环境亮、整张脸被抬成同一亮度（纸片人、自发光），
// 再叠上粉红阴影和红交界线 = 恐怖谷。
// 做法：环境相对的二次元明暗 —— 先算“此处满受光应有多亮” full = 反照率×太阳色 + 间接光（天空/环境图/半球光），
// 受光比 r = 实际 / full；暗面 = full 的 SHADE 倍（随环境一起变暗，永远不会比环境允许的更亮），亮面平涂到 full；
// 火把/篝火等点光比 full 更亮时原样保留。背光时加一圈逆光边缘光（只在轮廓、朝光的一侧，颜色 = 太阳色）。
// 头（卡通/PBR）和身体走同一段代码 → 头身明暗一致。开启时自动旁路 anime_shade / skin_sss / 面部补光下限（不叠加）。
window.CharLight = (() => {
  const on = () => !!(window.Mods && Mods.on && Mods.on('char_unify'));
  const T = { shade: 0.4, rim: 1.1, spec: 0.2 };
  const U = { uCLs: { value: T.shade }, uCLr: { value: T.rim }, uCLp: { value: T.spec } };
  const GLSL = `// CHARLIGHT_BLOCK
    { const vec3 W = vec3(0.299, 0.587, 0.114);
      vec3 _ind = reflectedLight.indirectDiffuse, _cur = reflectedLight.directDiffuse + _ind;
      vec3 _alb = diffuseColor.rgb * 0.31831, _sun = vec3(0.0), _L = vec3(0.0, 1.0, 0.0);
      #if NUM_DIR_LIGHTS > 0
        _sun = directionalLights[0].color; _L = directionalLights[0].direction;
      #endif
      vec3 _full = _alb * _sun + _ind;
      float _lf = max(dot(_full, W), 1e-4), _r = dot(_cur, W) / _lf;
      if (_r < 1.0) { // 只抬暗面（到此处满受光的 uCLs 倍，软过渡），亮面不动 → 不发白、不自发光
        float _t = smoothstep(0.2, 0.75, _r);
        vec3 _tint = mix(vec3(0.97, 0.93, 0.95), vec3(1.0), _t);
        vec3 _up = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz); float _fm = 0.72 + 0.28 * (dot(normalize(normal), _up) * 0.5 + 0.5); // 上亮下暗的体积感，背光时不成一张平涂纸片
        vec3 _new = mix(max(_full * uCLs * _fm * _tint, _cur), _cur, _t);
        reflectedLight.directDiffuse = max(_new - _ind, vec3(0.0));
      }
      vec3 _N = normalize(normal), _V = normalize(vViewPosition);
      float _nv = clamp(dot(_N, _V), 0.0, 1.0);
      float _bk = smoothstep(-0.05, 0.6, -dot(_V, _L));
      float _rim = smoothstep(0.45, 0.85, 1.0 - _nv) * smoothstep(-0.25, 0.35, dot(_N, _L)) * _bk;
      totalEmissiveRadiance += _sun * (diffuseColor.rgb * 0.5 + 0.35) * 0.31831 * _rim * uCLr;
      reflectedLight.directSpecular *= uCLp; reflectedLight.indirectSpecular *= uCLp; }`;
  // sh：onBeforeCompile 的 shader；插在 aomap 之前（卡通头的 uEnvA 间接光已加上之后）
  function patch(sh) {
    if (!on() || sh.fragmentShader.indexOf('CHARLIGHT_BLOCK') >= 0 || sh.fragmentShader.indexOf('#include <aomap_fragment>') < 0) return;
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform float uCLs, uCLr, uCLp;\nvoid main() {')
      .replace('#include <aomap_fragment>', GLSL + '\n#include <aomap_fragment>');
  }
  function tune(o) { Object.assign(T, o || {}); U.uCLs.value = T.shade; U.uCLr.value = T.rim; U.uCLp.value = T.spec; }
  return { on, patch, tune, T };
})();
