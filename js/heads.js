// 首级生成器 v3：跨模型混搭（脸×发型）、染发/瞳色/肤色、死气表情、血迹/伤疤/战纹着色器、头发摆动物理、种族特征与饰品
window.ModelHeads = (() => {
  const T = [];               // templates
  const SRC = new WeakMap();  // mesh -> src material（不要放 userData，clone 会 JSON 序列化贴图）
  let ready = false;
  const V3 = THREE.Vector3;
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

  const grad = (() => { const d = new Uint8Array([120, 190, 235, 255]); const t = new THREE.DataTexture(d, 4, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();

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

  function kindOf(mesh, matName, meta) {
    if (matName === '__CUT__') return 'cut';
    if (meta.hair.includes(mesh.name) || /HAIR/i.test(matName) || matName === 'hair') return 'hair';
    if (/Highlight|eye_trans|EyeExtra/i.test(matName)) return 'hl';
    if (/Iris/i.test(matName) || matName === 'eye') return 'iris';
    if (/Brow/i.test(matName)) return 'brow';
    if (/SKIN|^Face$|^Body$|body_bake/i.test(matName)) return 'skin';
    return 'other';
  }

  function parseOne(entry) {
    return new Promise((res) => {
      try {
        new THREE.GLTFLoader().parse(b64ToBuf(entry.glb), '', (gltf) => {
          entry.glb = null;
          const meshes = [];
          gltf.scene.traverse(o => { if (o.isMesh && !(entry.skip || []).includes(o.name)) meshes.push(o); });
          const lum = new Map();
          meshes.forEach(m => {
            const src = m.material; const nm = src.name || '';
            SRC.set(m, src);
            m.userData.kind = kindOf(m, nm, entry);
            m.renderOrder = /Highlight/i.test(nm) ? 4 : /Iris/i.test(nm) ? 3 : /Eyeline|Eyelash|Brow/i.test(nm) ? 3 : /EyeWhite/i.test(nm) ? 2 : 0;
            if ((m.userData.kind === 'hair' || m.userData.kind === 'iris' || m.userData.kind === 'brow') && !lum.has(src)) lum.set(src, avgLum(src.map));
            m.geometry.computeBoundingSphere();
          });
          const hairMeshes = meshes.filter(m => m.userData.kind === 'hair');
          let hairMinY = 0; hairMeshes.forEach(m => { m.geometry.computeBoundingBox(); hairMinY = Math.min(hairMinY, m.geometry.boundingBox.min.y); });
          T.push({ meta: entry, meshes, hairMeshes, faceMeshes: meshes.filter(m => m.userData.kind !== 'hair'), lum, hairMinY, shared: new Map() });
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

  // ---------- 断面材质（黑暗奇幻：皮、肉、颈椎、气管） ----------
  let cutMat = null;
  function getCut() {
    if (cutMat) return cutMat;
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
    cutMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.28, metalness: 0.05, bumpMap: t, bumpScale: 0.004, name: '__CUT__' });
    return cutMat;
  }

  // ---------- 着色器注入 ----------
  const NOISE = `
  float hh3(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float vn3(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(hh3(i),hh3(i+vec3(1,0,0)),f.x),mix(hh3(i+vec3(0,1,0)),hh3(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hh3(i+vec3(0,0,1)),hh3(i+vec3(1,0,1)),f.x),mix(hh3(i+vec3(0,1,1)),hh3(i+vec3(1,1,1)),f.x),f.y),f.z); }`;

  function injectVertex(sh, sway) {
    sh.vertexShader = sh.vertexShader
      .replace('void main() {', `varying vec3 vHP;\n${sway ? 'uniform vec3 uSway; uniform float uHTop; uniform float uHLen;' : ''}\nvoid main() {`)
      .replace('#include <morphtarget_vertex>', `#include <morphtarget_vertex>\n${sway ? 'float sw = clamp((uHTop - transformed.y) / uHLen, 0.0, 1.0); sw = sw * sw * (0.4 + 0.6 * clamp(length(transformed.xz) * 12.0, 0.0, 1.0)); vec3 hs = uSway; hs.x *= 0.72; hs.z *= 0.28; transformed += hs * sw;' : ''}\nvHP = transformed;`);
  }

  function hairMat(src, U, lum) {
    const m = new THREE.MeshToonMaterial({ map: src.map || null, gradientMap: grad, transparent: src.transparent, alphaTest: src.alphaTest || (src.transparent ? 0.25 : 0.4), side: THREE.DoubleSide, depthWrite: src.depthWrite });
    m.name = src.name;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { uHC1: U.hc1, uHC2: U.hc2, uGrad: U.grad, uHK: { value: 0.95 / lum }, uSway: U.sway, uHTop: U.hTop, uHLen: U.hLen, uShiny: U.shiny, uT: GT });
      injectVertex(sh, true);
      sh.fragmentShader = sh.fragmentShader
        .replace('void main() {', 'varying vec3 vHP; uniform vec3 uHC1; uniform vec3 uHC2; uniform vec2 uGrad; uniform float uHK; uniform float uShiny; uniform float uT;\nvoid main() {')
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
    m.customProgramCacheKey = () => 'hair3';
    return m;
  }
  function browMat(src, U, lum) {
    const m = new THREE.MeshToonMaterial({ map: src.map || null, gradientMap: grad, transparent: src.transparent, alphaTest: src.alphaTest, side: src.side, depthWrite: src.depthWrite });
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
    const m = new THREE.MeshToonMaterial({ map: src.map || null, gradientMap: grad, transparent: src.transparent, alphaTest: src.alphaTest, side: src.side, depthWrite: src.depthWrite });
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
    const m = new THREE.MeshToonMaterial({ map: src.map || null, color: src.color ? src.color.clone() : new THREE.Color(1, 1, 1), gradientMap: grad, transparent: src.transparent, alphaTest: src.alphaTest, side: src.side, depthWrite: src.depthWrite });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { uSkin: U.skin, uPale: U.pale, uBlood: U.blood, uSpat: U.spat, uSeed: U.seed, uCutY: U.cutY, uH: U.hH, uScar: U.scar, uPaint: U.paint, uPaintC: U.paintC, uEye: U.eye });
      injectVertex(sh, false);
      sh.fragmentShader = sh.fragmentShader
        .replace('void main() {', `varying vec3 vHP; uniform vec3 uSkin; uniform float uPale; uniform float uBlood; uniform float uSpat; uniform float uSeed; uniform float uCutY; uniform float uH;
          uniform vec4 uScar; uniform float uPaint; uniform vec3 uPaintC; uniform vec3 uEye; ${NOISE}
          float segD(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0); return length(pa-ba*h); }
          void main() {`)
        .replace('#include <map_fragment>', `#include <map_fragment>
          diffuseColor.rgb *= uSkin;
          float gl = dot(diffuseColor.rgb, vec3(0.3,0.59,0.11));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(gl) * vec3(0.9, 0.93, 1.0), uPale);
          bool front = vHP.z > 0.0;
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
    m.customProgramCacheKey = () => 'skin3';
    return m;
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
      const m = new THREE.MeshToonMaterial({ color: new THREE.Color(look.skinHex).multiplyScalar(0.98), gradientMap: grad }); disposables.push(m);
      for (const s of [-1, 1]) { const e = new THREE.Mesh(elfEarGeo(), m); e.position.set(s * 0.074, eye[1] - 0.004, -0.006); e.rotation.set(-0.5, 0, -s * 1.15); g.add(e); }
    }
    if (f === 'horn' || f === 'horn2') {
      const m = mat('horn' + look.featC, () => new THREE.MeshStandardMaterial({ color: look.featC, roughness: 0.35, metalness: 0.1 }));
      const k = f === 'horn' ? 1 : 2;
      for (const s of [-1, 1]) { const h = new THREE.Mesh(hornGeo(k), m); h.position.set(s * 0.042, skullTop - 0.012, 0.012); h.rotation.set(0.2, 0, -s * 0.45); g.add(h); }
    }
    if (f === 'beast') {
      const m = new THREE.MeshToonMaterial({ color: new THREE.Color(look.hc1).multiplyScalar(0.9), gradientMap: grad }); disposables.push(m);
      const inner = mat('earIn', () => new THREE.MeshToonMaterial({ color: '#f0a8b0', gradientMap: grad }));
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
      if (a === 'flowers') {
        const cols = ['#ffffff', '#ffd0e0', '#ffe27a', '#c8a8ff', '#ff8aa8'];
        for (let i = 0; i < 9; i++) {
          const an = (i / 9) * Math.PI * 2;
          const fl = new THREE.Mesh(geo('flower', () => new THREE.IcosahedronGeometry(0.009, 0)), mat('fl' + i % 5, () => new THREE.MeshToonMaterial({ color: cols[i % 5], gradientMap: grad })));
          fl.position.set(Math.cos(an) * 0.078, top - 0.028 + Math.sin(an * 3) * 0.004, Math.sin(an) * 0.078 - 0.005); g.add(fl);
        }
      }
      if (a === 'witchhat') {
        const hc = look.hatC || '#2a1a3a';
        const hm = mat('hat' + hc, () => new THREE.MeshToonMaterial({ color: hc, gradientMap: grad, side: THREE.DoubleSide }));
        const hat = new THREE.Group();
        const brim = new THREE.Mesh(geo('brim', () => new THREE.CylinderGeometry(0.125, 0.125, 0.004, 32)), hm); hat.add(brim);
        const cone = new THREE.Mesh(geo('hcone', () => { const c = new THREE.ConeGeometry(0.085, 0.2, 24, 6, true); c.translate(0, 0.1, 0); const p = c.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, p.getZ(i) - Math.pow(y / 0.2, 2.2) * 0.07); } c.computeVertexNormals(); return c; }), hm); hat.add(cone);
        const band = new THREE.Mesh(geo('band', () => new THREE.CylinderGeometry(0.082, 0.085, 0.018, 24, 1, true)), mat('bandM', () => new THREE.MeshToonMaterial({ color: '#8a1a2a', gradientMap: grad }))); band.position.y = 0.012; hat.add(band);
        hat.position.set(0, top - 0.03, -0.01); hat.rotation.set(-0.12, 0, 0.1); g.add(hat);
      }
      if (a === 'patch') {
        const pm = mat('patch', () => new THREE.MeshStandardMaterial({ color: '#15110f', roughness: 0.6 }));
        const s = look.patchSide || 1;
        const p = new THREE.Mesh(geo('patchG', () => { const c = new THREE.CircleGeometry(0.017, 16); return c; }), pm); p.position.set(s * Math.abs(eye[0]), eye[1] + 0.002, (meta.front || 0.075) + 0.004); g.add(p);
      }
    }
  }

  function rnd(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const pick = (r, a) => a[Math.floor(r() * a.length)];

  // 可换发型的组
  const MIX = { vroid: ['vroid', 'twist', 'seed'], twist: ['vroid', 'twist'], seed: ['seed', 'vroid'], godette: ['godette'] };
  function idxOf(file) { return T.findIndex(t => t.meta.file === file); }

  // ---------- 随机外观（种族约束由 lore 传入） ----------
  // race: {skins:[名], feat:[...], hair:[名], eye:[名], acc:{name:prob}, faces:[file]?}
  function randomLook(r, race = {}, rarity = 0) {
    const faceIdx = race.faces ? Math.max(0, idxOf(pick(r, race.faces))) : Math.floor(r() * T.length);
    const face = T[faceIdx];
    const grp = face.meta.grp || 'vroid';
    const allHair = T.map((t, i) => i).filter(i => T[i].hairMeshes.length && !T[i].meta.noHair);
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
    if (r() < 0.06) acc.push('patch');
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
    return LOOK;
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
      skin: { value: new V3(sk.r / baseSkin.r, sk.g / baseSkin.g, sk.b / baseSkin.b) }, pale: { value: look.pale },
      blood: { value: look.blood }, spat: { value: look.spat }, seed: { value: look.seed },
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
    const rib = new THREE.MeshToonMaterial({ color: hx.rib || '#b01a2a', gradientMap: grad }); disposables.push(rib);
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

  function create(look) {
    let fi = idxOf(look.f); if (fi < 0) fi = 0;
    let hi = idxOf(look.h); if (hi < 0) hi = fi;
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
      if (k === 'cut') out = getCut();
      else if (k === 'hair') { out = hairMat(src, U, t.lum.get(src) || 0.6); own.push(out); }
      else if (k === 'brow') { out = browMat(src, U, t.lum.get(src) || 0.4); own.push(out); }
      else if (k === 'iris') { out = irisMat(src, U, t.lum.get(src) || 0.5); own.push(out); }
      else if (k === 'skin') { out = skinMat(src, U); own.push(out); }
      else {
        out = t.shared.get(key);
        if (!out) { out = new THREE.MeshToonMaterial({ map: src.map || null, color: src.color ? src.color.clone() : new THREE.Color(1, 1, 1), gradientMap: grad, transparent: src.transparent, alphaTest: src.alphaTest, side: src.side, depthWrite: src.depthWrite }); t.shared.set(key, out); }
      }
      matMap.set(key, out); return out;
    };
    const presets = F.meta.presets || {};
    const byName = {};
    for (const m of F.faceMeshes) {
      if (m.userData.kind === 'hl') continue; // 死眼：去掉高光
      const c = new THREE.Mesh(m.geometry, getMat(m, F)); c.name = m.name; c.renderOrder = m.renderOrder;
      if (m.morphTargetInfluences) { c.morphTargetInfluences = new Array(m.morphTargetInfluences.length).fill(0); c.morphTargetDictionary = m.morphTargetDictionary; }
      byName[m.name] = c; g.add(c);
    }
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
    // 发型
    const hg = new THREE.Group(); g.add(hg);
    // 借用发型：按头皮高度图精确贴合（见 fitHair），不再整体缩放
    if (hi === fi) { hg.scale.set(1.008, 1.008, 1.008); hg.position.z = 0.002; }
    const hairGeos = hi !== fi ? fitHair(F, H) : H.hairMeshes.map(m => m.geometry);
    H.hairMeshes.forEach((m, i) => { const c = new THREE.Mesh(hairGeos[i], getMat(m, H)); c.renderOrder = m.renderOrder; hg.add(c); });
    const disposables = [];
    const S = hairShell(F, H, F.meta.file + '|' + H.meta.file + (hi === fi ? '|own' : ''), hairGeos);
    if (look.hx && F.meta.grp !== 'godette') try { addHairX(hg, look, S, U, disposables); } catch (e) { console.warn('hairX', e); }
    addAccessories(g, look, F.meta, U, disposables, S.top);
    const radius = 0.1;
    return {
      group: g, U, radius, meta: F.meta,
      setSway(v) { U.sway.value.copy(v); },
      setExpression,
      dispose() { own.forEach(m => m.dispose()); disposables.forEach(m => m.dispose()); }
    };
  }

  return {
    init, create, randomLook, HAIR, EYE, SKIN, tick(t) { GT.value = t; },
    get ready() { return ready; },
    get count() { return T.length; },
    files: () => T.map(t => t.meta.file),
    meta: (file) => { const i = idxOf(file); return i >= 0 ? T[i].meta : null; },
    credits: () => T.map(t => t.meta.name + ' — ' + t.meta.credit)
  };
})();
