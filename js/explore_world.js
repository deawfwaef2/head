// 外出探索 · 世界生成（第十轮）
// 每个地区一套主题：天空/雾/地形配色/布景道具/粒子/动态元素。道路沿 -z 方向蜿蜒，玩家第一人称沿路前进。
// 所有几何都是程序生成（file:// 可用），重复物件用 InstancedMesh；动态：草随风、鸟群、炊烟、风车、旗帜、粒子。
window.ExWorld = (() => {
  const V3 = THREE.Vector3;
  // ---------- 噪声 ----------
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const fbm = (x, y) => vn(x, y) * 0.55 + vn(x * 2.1, y * 2.1) * 0.28 + vn(x * 4.3, y * 4.3) * 0.17;
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  // ---------- 主题 ----------
  const T = {
    village: { sky: ['#7fb0e0', '#f6dcb0'], fog: '#e6d6bc', fd: 0.011, g: ['#6f9448', '#8cae58', '#b0a868'], road: '#a08058', sun: '#fff0cc', si: 1.7, hemi: ['#d6e8ff', '#5a4a30', 0.75], hill: 9, parts: 'pollen', grass: '#7aa048',
      props: [['house', 16, 9, 30], ['tree', 55, 7, 60], ['fence', 26, 3.2, 3.6], ['field', 10, 8, 26], ['windmill', 2, 22, 45], ['well', 3, 5, 9], ['hay', 12, 5, 20], ['rock', 25, 5, 50]] },
    forest: { sky: ['#4a7a8a', '#b8d8b0'], fog: '#8fb898', fd: 0.02, g: ['#3a6a34', '#4a7a3a', '#5a6a30'], road: '#6a5a3a', sun: '#e8ffd8', si: 1.2, hemi: ['#b8e0c0', '#2a3a20', 0.8], hill: 7, parts: 'firefly', grass: '#4a8a3a',
      props: [['giant', 34, 6, 40], ['tree', 90, 5, 55], ['mushroom', 40, 3, 16], ['lantern', 14, 3, 6], ['log', 14, 4, 18], ['rock', 30, 4, 40], ['fern', 60, 3, 18]] },
    wilds: { sky: ['#c89a60', '#f0d8a0'], fog: '#d8b888', fd: 0.012, g: ['#a88a50', '#b89a5a', '#8a7a48'], road: '#b89a6a', sun: '#ffe0a0', si: 1.9, hemi: ['#ffe8c0', '#6a4a28', 0.7], hill: 12, parts: 'dust', grass: '#a89048',
      props: [['tent', 12, 8, 26], ['totem', 10, 4, 14], ['spire', 26, 12, 60], ['bones', 18, 4, 30], ['rock', 45, 5, 60], ['deadtree', 16, 6, 40]] },
    abbey: { sky: ['#6a7ab0', '#f0c8b0'], fog: '#d8c8d0', fd: 0.012, g: ['#6a8a5a', '#7a9a68', '#8a9a80'], road: '#b8b0a0', sun: '#ffe0c8', si: 1.5, hemi: ['#e0e0ff', '#4a4a3a', 0.8], hill: 8, parts: 'petal', grass: '#6a9a58',
      props: [['chapel', 3, 16, 30], ['grave', 40, 4, 18], ['statue', 10, 3.5, 6], ['cypress', 40, 5, 40], ['wallseg', 12, 6, 14], ['candle', 20, 3, 5], ['rock', 16, 6, 40]] },
    swamp: { sky: ['#2a3a34', '#6a7a5a'], fog: '#4a5a44', fd: 0.035, g: ['#2a3a24', '#3a4a2a', '#2a3020'], road: '#4a4030', sun: '#c8e0a0', si: 0.8, hemi: ['#8aa080', '#1a2014', 0.9], hill: 3, parts: 'wisp', grass: '#3a5a2a', water: '#1a2a20',
      props: [['deadtree', 50, 4, 50], ['hut', 8, 8, 24], ['reed', 90, 3, 20], ['pool', 16, 5, 30], ['lantern', 10, 3.5, 8], ['bones', 10, 4, 20]] },
    fortress: { sky: ['#6a7888', '#c8c0b0'], fog: '#a8a8a8', fd: 0.014, g: ['#6a6a50', '#7a7a58', '#5a5a48'], road: '#8a8070', sun: '#fff0e0', si: 1.4, hemi: ['#d8dce8', '#3a3a30', 0.8], hill: 10, parts: 'ember', grass: '#6a7a48',
      props: [['wallseg', 16, 18, 26], ['tower', 7, 16, 30], ['banner', 18, 3.2, 4], ['tent', 10, 8, 20], ['spikes', 20, 4, 10], ['rock', 30, 6, 50]] },
    capital: { sky: ['#3a4a8a', '#e8a878'], fog: '#c8a898', fd: 0.012, g: ['#5a7a48', '#6a8a50', '#8a8a70'], road: '#c8c0b0', sun: '#ffd8a8', si: 1.5, hemi: ['#e8d8ff', '#4a3a3a', 0.85], hill: 5, parts: 'petal', grass: '#5a8a48',
      props: [['townhouse', 30, 7, 22], ['lamp', 24, 3, 3.4], ['tower', 5, 18, 34], ['fountain', 2, 6, 8], ['cypress', 20, 5, 30], ['banner', 14, 3.4, 4]] },
    abyss: { sky: ['#1a0508', '#6a1a10'], fog: '#3a0e0a', fd: 0.03, g: ['#2a1a18', '#3a2220', '#1a1010'], road: '#4a3028', sun: '#ff7a40', si: 1.1, hemi: ['#ff9a70', '#1a0505', 0.7], hill: 11, parts: 'ember', grass: null,
      props: [['obsidian', 50, 5, 50], ['lava', 16, 5, 34], ['bonearch', 6, 0, 0], ['floatrock', 16, 10, 40], ['bones', 20, 4, 30]] },
    peak: { sky: ['#5a8ad8', '#f0f4ff'], fog: '#e8eef8', fd: 0.016, g: ['#c8ccd4', '#e8ecf0', '#a8acb4'], road: '#a8a098', sun: '#ffffff', si: 1.9, hemi: ['#e8f0ff', '#6a6a78', 0.9], hill: 18, parts: 'snow', grass: null,
      props: [['ribs', 8, 0, 0], ['pillar', 16, 4, 12], ['pine', 50, 6, 50], ['cloud', 20, 30, 90], ['rock', 40, 5, 60]] }
  };
  function themeOf(loc) {
    if (T[loc.k]) return T[loc.k];
    // 新地区：按地区色生成
    const c = new THREE.Color(loc.color || '#8a8a8a'), hsl = {}; c.getHSL(hsl);
    const col = (h, s, l) => '#' + new THREE.Color().setHSL(h, s, l).getHexString();
    return Object.assign({}, T.wilds, { sky: [col(hsl.h, 0.4, 0.45), col(hsl.h, 0.35, 0.8)], fog: col(hsl.h, 0.25, 0.7), g: [col(hsl.h, 0.3, 0.35), col(hsl.h, 0.3, 0.42), col(hsl.h, 0.2, 0.3)], grass: col(hsl.h, 0.35, 0.4) });
  }
  // ---------- 材质 ----------
  const lin = c => new THREE.Color(c).convertSRGBToLinear(); // 渲染器是 sRGB 输出：所有手写颜色先转线性
  let grad = null;
  function toon(color, o) {
    if (!grad) { const d = new Uint8Array([90, 160, 225, 255]); grad = new THREE.DataTexture(d, 4, 1, THREE.RedFormat); grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true; }
    return new THREE.MeshToonMaterial(Object.assign({ color: lin(color), gradientMap: grad }, o || {}));
  }
  function build(loc, L) {
    const th = themeOf(loc), scene = new THREE.Scene(), disp = [], anim = [];
    const M = {}; const mat = (k, f) => M[k] || (M[k] = f());
    const G = (g) => { disp.push(g); return g; };
    // 路径
    const ph = (loc.k || 'x').split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 0.37;
    const pathX = z => 7 * Math.sin(z * 0.019 + ph) + 3 * Math.sin(z * 0.053 + ph * 2) + 1.2 * Math.sin(z * 0.13);
    const hill = th.hill;
    const height = (x, z) => { const d = Math.abs(x - pathX(z)); const far = sstep(3.5, 34, d); return (fbm(x * 0.018 + ph, z * 0.018) - 0.35) * hill * far + (fbm(x * 0.09, z * 0.09) - 0.5) * 0.35 + far * far * hill * 0.35; };
    // 天空
    const skyC = [new THREE.Color(th.sky[0]), new THREE.Color(th.sky[1])];
    const sunDir = new V3(-0.4, 0.35, -0.85).normalize();
    const sky = new THREE.Mesh(G(new THREE.SphereGeometry(600, 32, 16)), mat('sky', () => new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: skyC[0] }, hor: { value: skyC[1] }, sun: { value: sunDir }, sunC: { value: new THREE.Color(th.sun) } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }',
      fragmentShader: 'uniform vec3 top, hor, sun, sunC; varying vec3 vD; void main(){ float h = clamp(vD.y, -0.2, 1.0); vec3 c = mix(hor, top, pow(max(h, 0.0), 0.55)); c = mix(c, hor * 0.7, clamp(-h * 4.0, 0.0, 1.0)); float s = max(dot(normalize(vD), sun), 0.0); c += sunC * (pow(s, 600.0) * 2.0 + pow(s, 12.0) * 0.25); gl_FragColor = vec4(c, 1.0); }' })));
    sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
    scene.fog = new THREE.FogExp2(lin(th.fog), th.fd);
    // 灯光
    const hemi = new THREE.HemisphereLight(lin(th.hemi[0]), lin(th.hemi[1]), th.hemi[2]); scene.add(hemi);
    const sun = new THREE.DirectionalLight(lin(th.sun), th.si); sun.position.copy(sunDir).multiplyScalar(50); scene.add(sun); scene.add(sun.target);
    // 地形
    const W = 240, Lz = L + 160, SX = 120, SZ = Math.round(Lz / 1.5);
    const tg = G(new THREE.PlaneGeometry(W, Lz, SX, SZ)); tg.rotateX(-Math.PI / 2); tg.translate(0, 0, -L / 2);
    const pos = tg.attributes.position, cols = new Float32Array(pos.count * 3);
    const g0 = new THREE.Color(th.g[0]), g1 = new THREE.Color(th.g[1]), g2 = new THREE.Color(th.g[2]), rc = new THREE.Color(th.road), tc = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), px = pathX(z); pos.setX(i, x + px * 0.6 * sstep(60, 20, Math.abs(x))); // 地形跟着路弯
      const xx = pos.getX(i), y = height(xx, z); pos.setY(i, y);
      const n = fbm(xx * 0.05, z * 0.05), n2 = vn(xx * 0.3, z * 0.3);
      tc.copy(g0).lerp(g1, n).lerp(g2, sstep(0.55, 0.8, n2) * 0.6);
      const d = Math.abs(xx - px); const road = 1 - sstep(1.7, 2.6 + n2 * 0.6, d);
      tc.lerp(rc, road * 0.92); tc.multiplyScalar(0.92 + n2 * 0.16);
      tc.convertSRGBToLinear(); cols[i * 3] = tc.r; cols[i * 3 + 1] = tc.g; cols[i * 3 + 2] = tc.b;
    }
    tg.setAttribute('color', new THREE.BufferAttribute(cols, 3)); tg.computeVertexNormals();
    const ground = new THREE.Mesh(tg, mat('ground', () => new THREE.MeshLambertMaterial({ vertexColors: true }))); scene.add(ground);
    if (th.water) { const w = new THREE.Mesh(G(new THREE.PlaneGeometry(W, Lz)), mat('water', () => new THREE.MeshStandardMaterial({ color: ExWorld.lin(th.water), roughness: 0.15, metalness: 0.4, transparent: true, opacity: 0.85 }))); w.rotation.x = -Math.PI / 2; w.position.set(0, -0.05, -L / 2); scene.add(w); }
    // 路边石
    { const n = Math.round(L / 2.2); const im = new THREE.InstancedMesh(G(new THREE.DodecahedronGeometry(0.18, 0)), mat('pebble', () => toon('#8a8078')), n); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
      for (let i = 0; i < n; i++) { const z = -i * 2.2 + (hash(i, 3) - 0.5); const side = i % 2 ? 1 : -1, x = pathX(z) + side * (2.1 + hash(i, 5) * 0.5); const s = 0.6 + hash(i, 7) * 1.1; q.setFromEuler(new THREE.Euler(hash(i, 1) * 3, hash(i, 2) * 3, 0)); m4.compose(new V3(x, height(x, z) + 0.05, z), q, new V3(s, s * 0.6, s)); im.setMatrixAt(i, m4); }
      scene.add(im); }
    // 草（风动）
    if (th.grass) {
      const n = 3200; const bg = G(new THREE.ConeGeometry(0.035, 0.5, 3, 1, true)); bg.translate(0, 0.25, 0);
      const gm = toon(th.grass, { side: THREE.DoubleSide, emissive: lin(th.grass).multiplyScalar(0.35) }); disp.push(gm); const wind = { value: 0 };
      gm.onBeforeCompile = sh => { sh.uniforms.uWind = wind; sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n float wph = instanceMatrix[3].x * 0.35 + instanceMatrix[3].z * 0.21; transformed.x += sin(uWind * 1.7 + wph) * 0.09 * position.y * position.y * 4.0; transformed.z += cos(uWind * 1.3 + wph) * 0.05 * position.y * position.y * 4.0;'); };
      gm.customProgramCacheKey = () => 'exgrass1';
      const im = new THREE.InstancedMesh(bg, gm, n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
      let k = 0; for (let i = 0; k < n && i < n * 3; i++) { const z = -(hash(i, 11) * (L + 40)) + 20, off = (hash(i, 13) - 0.5) * 60; if (Math.abs(off) < 2.4) continue; const x = pathX(z) + off; const s = 0.6 + hash(i, 17) * 1.0; q.setFromEuler(new THREE.Euler((hash(i, 19) - 0.5) * 0.4, hash(i, 23) * 6, (hash(i, 29) - 0.5) * 0.4)); m4.compose(new V3(x, height(x, z) - 0.02, z), q, new V3(s, s * (0.7 + hash(i, 31) * 0.8), s)); im.setMatrixAt(k, m4); c.set(th.grass).multiplyScalar(0.75 + hash(i, 37) * 0.5); c.convertSRGBToLinear(); im.setColorAt(k, c); k++; }
      im.count = k; scene.add(im); anim.push((dt, t) => { wind.value = t; });
    }
    // ---------- 道具构件 ----------
    const P = PROPS(toon, mat, G, anim, th);
    const placed = [];
    for (const [kind, count, dmin, dmax] of th.props) {
      const f = P[kind]; if (!f) continue;
      if (kind === 'bonearch' || kind === 'ribs') { for (let i = 0; i < count; i++) { const z = -((i + 0.6) / count) * L; const o = f(); o.position.set(pathX(z), height(pathX(z), z), z); o.rotation.y = Math.atan2(pathX(z - 1) - pathX(z), -1) * -1; scene.add(o); } continue; }
      const inst = f.inst ? [] : null;
      for (let i = 0, tries = 0; i < count && tries < count * 8; tries++) {
        const z = 25 - hash(tries * 7 + kind.length, i * 13 + dmin) * (L + 60);
        const side = hash(tries, 99 + i) < 0.5 ? -1 : 1, off = side * (dmin + hash(i * 3 + tries, 71) * (dmax - dmin));
        const x = pathX(z) + off, y = height(x, z);
        let ok = true; const rr = f.r || 1.5; for (const p of placed) { if ((p.x - x) ** 2 + (p.z - z) ** 2 < (p.r + rr) ** 2) { ok = false; break; } } if (!ok) continue;
        placed.push({ x, z, r: rr }); i++;
        const rot = kind === 'fence' || kind === 'lamp' || kind === 'banner' || kind === 'candle' || kind === 'lantern' ? Math.atan2(pathX(z - 1) - pathX(z), 1) : hash(i, 5) * Math.PI * 2;
        const s = f.s ? f.s[0] + hash(i, 9) * (f.s[1] - f.s[0]) : 1;
        if (inst) inst.push({ x, y, z, rot, s, i }); else { const o = f(i); o.position.set(x, y + (f.dy || 0), z); o.rotation.y = rot + (kind === 'house' || kind === 'townhouse' || kind === 'hut' || kind === 'chapel' ? (side > 0 ? -Math.PI / 2 : Math.PI / 2) : 0); o.scale.setScalar(s); scene.add(o); }
      }
      if (inst && inst.length) f.inst(scene, inst);
    }
    // ---------- 粒子 ----------
    const parts = particles(th.parts, scene, disp); if (parts) anim.push(parts.update);
    // ---------- 鸟群 ----------
    if (th.parts !== 'wisp' && loc.k !== 'abyss') { const birds = flock(scene, disp, loc.k === 'peak' ? '#f0f0f0' : '#2a2420'); anim.push(birds); }
    return {
      scene, pathX, height, theme: th, fogBase: lin(th.fog), fogDBase: th.fd,
      update(dt, t, cam) { for (const f of anim) f(dt, t, cam); sky.position.copy(cam.position); },
      dispose() { disp.forEach(d => d.dispose && d.dispose()); for (const k in M) M[k].dispose && M[k].dispose(); scene.traverse(o => { if (o.isInstancedMesh) o.dispose(); }); }
    };
  }
  // ---------- 道具库 ----------
  function PROPS(toon, mat, G, anim, th) {
    const mk = (geo, m) => new THREE.Mesh(geo, m);
    const wood = () => mat('wood', () => toon('#6a4a30')), wood2 = () => mat('wood2', () => toon('#8a6a44')), stone = () => mat('stone', () => toon('#8a8680')), stoneD = () => mat('stoneD', () => toon('#5a5650'));
    const roofM = (c) => mat('roof' + c, () => toon(c)), glow = (c, i = 1.4) => mat('glow' + c + i, () => new THREE.MeshBasicMaterial({ color: ExWorld.lin(new THREE.Color(c).multiplyScalar(i)), fog: true }));
    const leafC = th.g[1];
    const blobGeo = G(new THREE.IcosahedronGeometry(1, 1));
    { const p = blobGeo.attributes.position; for (let i = 0; i < p.count; i++) { const v = new V3().fromBufferAttribute(p, i); const k = 1 + (hash(v.x * 9, v.y * 7 + v.z * 3) - 0.5) * 0.28; p.setXYZ(i, v.x * k, v.y * k, v.z * k); } blobGeo.computeVertexNormals(); }
    const cyl = (rt, rb, h, s = 8) => G(new THREE.CylinderGeometry(rt, rb, h, s));
    const box = (w, h, d) => G(new THREE.BoxGeometry(w, h, d));
    // 三棱柱屋顶：屋脊沿 x（alongX）或 z
    const prism = (len, span, h, alongX = true) => { const s = new THREE.Shape(); s.moveTo(-span / 2, 0); s.lineTo(span / 2, 0); s.lineTo(0, h); s.lineTo(-span / 2, 0); const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); g.translate(0, 0, -len / 2); if (alongX) g.rotateY(Math.PI / 2); return G(g); };
    // 实例化工具：parts = [{geo, mat, m: Matrix4(local)}]
    const instOf = (parts) => (scene, list) => { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
      for (const pt of parts) { const im = new THREE.InstancedMesh(pt.geo, pt.mat, list.length);
        list.forEach((it, k) => { q.setFromAxisAngle(new V3(0, 1, 0), it.rot); m4.compose(new V3(it.x, it.y, it.z), q, new V3(it.s, it.s, it.s)).multiply(pt.m); im.setMatrixAt(k, m4); if (pt.tint) { c.set(pt.tint).multiplyScalar(0.8 + hash(it.i, 41) * 0.4); c.offsetHSL((hash(it.i, 43) - 0.5) * 0.04, 0, 0); c.convertSRGBToLinear(); im.setColorAt(k, c); } });
        scene.add(im); } };
    const L4 = (x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(sx, sy, sz));
    const P = {};
    // 阔叶树：树干 + 3 团树冠
    P.tree = () => null; P.tree.r = 2.2; P.tree.s = [0.8, 1.5];
    P.tree.inst = instOf([{ geo: cyl(0.16, 0.28, 3.2, 7), mat: wood(), m: L4(0, 1.6, 0) },
      { geo: blobGeo, mat: mat('leafI', () => toon('#ffffff')), m: L4(0, 3.9, 0, 1.9, 1.6, 1.9), tint: leafC }, { geo: blobGeo, mat: mat('leafI', () => toon('#ffffff')), m: L4(0.9, 3.3, 0.4, 1.2, 1.0, 1.2), tint: leafC }, { geo: blobGeo, mat: mat('leafI', () => toon('#ffffff')), m: L4(-0.8, 3.5, -0.5, 1.3, 1.1, 1.3), tint: th.g[0] }]);
    P.giant = () => null; P.giant.r = 4; P.giant.s = [1.0, 1.6];
    P.giant.inst = instOf([{ geo: cyl(0.7, 1.4, 14, 9), mat: mat('bark', () => toon('#4a3a2a')), m: L4(0, 7, 0) }, { geo: cyl(0.25, 0.5, 4, 6), mat: mat('bark', () => toon('#4a3a2a')), m: L4(1.2, 0.8, 0, 1, 1, 1, 0, 0, -1.1) }, { geo: cyl(0.25, 0.5, 4, 6), mat: mat('bark', () => toon('#4a3a2a')), m: L4(-1.1, 0.8, 0.4, 1, 1, 1, 0.3, 0, 1.1) },
      { geo: blobGeo, mat: mat('leafI', () => toon('#ffffff')), m: L4(0, 15, 0, 6, 3.6, 6), tint: '#2e5a2e' }, { geo: blobGeo, mat: mat('leafI', () => toon('#ffffff')), m: L4(3, 12.5, 1, 3.6, 2.4, 3.6), tint: '#3a6a34' }, { geo: blobGeo, mat: mat('leafI', () => toon('#ffffff')), m: L4(-3, 13, -1, 3.8, 2.4, 3.8), tint: '#2a5230' }]);
    P.pine = () => null; P.pine.r = 1.8; P.pine.s = [0.8, 1.6];
    P.pine.inst = instOf([{ geo: cyl(0.1, 0.2, 2, 6), mat: wood(), m: L4(0, 1, 0) }, { geo: G(new THREE.ConeGeometry(1.5, 2.6, 8)), mat: mat('leafI', () => toon('#ffffff')), m: L4(0, 2.4, 0), tint: '#3a5a4a' }, { geo: G(new THREE.ConeGeometry(1.15, 2.2, 8)), mat: mat('leafI', () => toon('#ffffff')), m: L4(0, 3.6, 0), tint: '#3a5a4a' }, { geo: G(new THREE.ConeGeometry(0.8, 1.8, 8)), mat: mat('snowcap', () => toon('#f4f8ff')), m: L4(0, 4.7, 0) }]);
    P.cypress = () => null; P.cypress.r = 1; P.cypress.s = [0.8, 1.3];
    P.cypress.inst = instOf([{ geo: cyl(0.1, 0.15, 1, 6), mat: wood(), m: L4(0, 0.5, 0) }, { geo: blobGeo, mat: mat('leafI', () => toon('#ffffff')), m: L4(0, 3.2, 0, 0.8, 3, 0.8), tint: '#2a4a2a' }]);
    P.deadtree = (i) => { const g = new THREE.Group(); const m = mat('dead', () => toon('#3a3028')); const t = mk(cyl(0.12, 0.3, 4, 6), m); t.position.y = 2; t.rotation.z = (hash(i, 1) - 0.5) * 0.3; g.add(t);
      for (let k = 0; k < 4; k++) { const b = mk(cyl(0.04, 0.1, 1.8, 5), m); const a = k * 1.7 + hash(i, k); b.position.set(Math.cos(a) * 0.5, 2.6 + k * 0.4, Math.sin(a) * 0.5); b.rotation.set(Math.sin(a) * 0.9, 0, Math.cos(a) * 0.9); g.add(b); } return g; }; P.deadtree.r = 1.5; P.deadtree.s = [0.8, 1.5];
    P.rock = () => null; P.rock.r = 1.2; P.rock.s = [0.4, 2.2];
    P.rock.inst = instOf([{ geo: G(new THREE.DodecahedronGeometry(1, 1)), mat: mat('rockI', () => toon('#ffffff')), m: L4(0, 0.3, 0, 1.2, 0.8, 1), tint: '#8a8478' }]);
    P.spire = () => null; P.spire.r = 3; P.spire.s = [0.8, 2];
    P.spire.inst = instOf([{ geo: G(new THREE.CylinderGeometry(0.8, 2.2, 9, 7)), mat: mat('rockI', () => toon('#ffffff')), m: L4(0, 4.5, 0), tint: '#a07850' }, { geo: G(new THREE.DodecahedronGeometry(1.4, 0)), mat: mat('rockI', () => toon('#ffffff')), m: L4(0, 9.2, 0, 1, 0.6, 1), tint: '#b08858' }]);
    P.obsidian = () => null; P.obsidian.r = 1.5; P.obsidian.s = [0.6, 2.4];
    P.obsidian.inst = instOf([{ geo: G(new THREE.ConeGeometry(0.9, 5, 5)), mat: mat('obs', () => toon('#1a1418', { emissive: ExWorld.lin(new THREE.Color('#3a0805')) })), m: L4(0, 2.4, 0, 1, 1, 1, 0.1, 0, 0.12) }, { geo: G(new THREE.ConeGeometry(0.5, 3, 5)), mat: mat('obs', () => toon('#1a1418', { emissive: ExWorld.lin(new THREE.Color('#3a0805')) })), m: L4(0.8, 1.4, 0.3, 1, 1, 1, 0, 0, -0.4) }]);
    P.fern = () => null; P.fern.r = 0.6; P.fern.s = [0.6, 1.3];
    P.fern.inst = instOf([{ geo: blobGeo, mat: mat('leafI', () => toon('#ffffff')), m: L4(0, 0.25, 0, 0.7, 0.35, 0.7), tint: '#3a7a3a' }]);
    P.reed = () => null; P.reed.r = 0.5; P.reed.s = [0.7, 1.4];
    P.reed.inst = instOf([{ geo: cyl(0.02, 0.03, 1.6, 4), mat: mat('reed', () => toon('#6a7a3a')), m: L4(0, 0.8, 0) }, { geo: cyl(0.02, 0.03, 1.3, 4), mat: mat('reed', () => toon('#6a7a3a')), m: L4(0.15, 0.65, 0.1, 1, 1, 1, 0, 0, 0.15) }, { geo: cyl(0.04, 0.04, 0.25, 5), mat: mat('cattail', () => toon('#5a3a20')), m: L4(0, 1.65, 0) }]);
    P.mushroom = (i) => { const g = new THREE.Group(); const c = ['#e04a4a', '#5ad0ff', '#d08aff', '#f0c040'][i % 4]; const st = mk(cyl(0.05, 0.08, 0.35, 8), mat('mstem', () => toon('#f0e8d8'))); st.position.y = 0.17; g.add(st);
      const cap = mk(G(new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), mat('mcap' + c, () => toon(c, { emissive: ExWorld.lin(new THREE.Color(c).multiplyScalar(i % 4 === 1 ? 0.6 : 0.15)) }))); cap.position.y = 0.33; cap.scale.y = 0.7; g.add(cap); return g; }; P.mushroom.r = 0.5; P.mushroom.s = [0.8, 2.5];
    P.log = () => { const g = new THREE.Group(); const l = mk(cyl(0.3, 0.34, 3.5, 9), wood()); l.rotation.z = Math.PI / 2; l.position.y = 0.3; g.add(l); const m = mk(blobGeo, mat('moss', () => toon('#4a7a3a'))); m.scale.set(0.9, 0.2, 0.3); m.position.set(0.3, 0.55, 0); g.add(m); return g; }; P.log.r = 2;
    P.lantern = (i) => { const g = new THREE.Group(); const p = mk(cyl(0.035, 0.05, 2.2, 6), wood()); p.position.y = 1.1; g.add(p); const arm = mk(box(0.5, 0.04, 0.04), wood()); arm.position.set(0.22, 2.1, 0); g.add(arm);
      const l = mk(G(new THREE.OctahedronGeometry(0.14, 0)), glow(th.parts === 'wisp' ? '#9aff7a' : '#ffc070', 1.6)); l.position.set(0.44, 1.92, 0); g.add(l); anim.push((dt, t) => { l.rotation.y = t + i; l.position.y = 1.92 + Math.sin(t * 2 + i) * 0.03; }); return g; }; P.lantern.r = 0.6;
    P.lamp = (i) => { const g = new THREE.Group(); const m = mat('iron', () => toon('#2a2a30')); const p = mk(cyl(0.05, 0.08, 3.4, 8), m); p.position.y = 1.7; g.add(p); const top = mk(G(new THREE.ConeGeometry(0.22, 0.25, 6)), m); top.position.y = 3.75; g.add(top);
      const l = mk(G(new THREE.SphereGeometry(0.14, 10, 8)), glow('#ffd890', 1.8)); l.position.y = 3.5; g.add(l); return g; }; P.lamp.r = 0.5;
    P.candle = (i) => { const g = new THREE.Group(); for (let k = 0; k < 3; k++) { const c = mk(cyl(0.035, 0.035, 0.2 + k * 0.08, 8), mat('wax', () => toon('#f0e8d0'))); c.position.set((k - 1) * 0.1, 0.1 + k * 0.04, (k % 2) * 0.08); g.add(c); const f = mk(G(new THREE.ConeGeometry(0.025, 0.07, 6)), glow('#ffb040', 2)); f.position.set((k - 1) * 0.1, 0.24 + k * 0.08, (k % 2) * 0.08); g.add(f); anim.push((dt, t) => { f.scale.y = 1 + Math.sin(t * 15 + k + i) * 0.2; }); } return g; }; P.candle.r = 0.4;
    P.house = (i) => { const g = new THREE.Group(); const w = 3.4 + hash(i, 1) * 1.6, d = 3 + hash(i, 2) * 1.2, h = 2.4 + hash(i, 3) * 0.8;
      const wall = mk(box(w, h, d), mat('plaster' + (i % 3), () => toon(['#e8dcc0', '#d8c8a8', '#c8b898'][i % 3]))); wall.position.y = h / 2; g.add(wall);
      for (const sx of [-1, 1]) { const beam = mk(box(0.14, h, 0.14), wood()); beam.position.set(sx * w / 2, h / 2, d / 2 + 0.01); g.add(beam); const b2 = beam.clone(); b2.position.z = -d / 2 - 0.01; g.add(b2); }
      const hb = mk(box(w + 0.1, 0.14, 0.14), wood()); hb.position.set(0, h * 0.55, d / 2 + 0.02); g.add(hb);
      const roof = mk(prism(w + 0.6, d + 0.8, 1.7), roofM(['#8a3a2a', '#6a4a3a', '#5a4a6a'][i % 3])); roof.position.y = h - 0.05; g.add(roof);
      const door = mk(box(0.8, 1.5, 0.08), wood2()); door.position.set(-w * 0.2, 0.75, d / 2 + 0.05); g.add(door);
      for (const sx of [0.22, -0.4]) { const win = mk(box(0.6, 0.55, 0.06), glow('#ffcf80', 1.2)); win.position.set(w * sx + (sx > 0 ? 0.3 : 0), h * 0.62, d / 2 + 0.05); if (sx < 0) win.position.set(-w * 0.2, h * 0.8 + 0.1, d / 2 + 0.05); g.add(win); }
      const ch = mk(box(0.45, 1.4, 0.45), stone()); ch.position.set(w * 0.3, h + 1.1, -d * 0.15); g.add(ch);
      smoke(g, new V3(w * 0.3, h + 1.9, -d * 0.15), anim, mat); return g; }; P.house.r = 3.4;
    P.townhouse = (i) => { const g = new THREE.Group(); const w = 3 + hash(i, 1), d = 3.4, h = 5 + hash(i, 3) * 3;
      const wall = mk(box(w, h, d), mat('tw' + (i % 4), () => toon(['#e8e0d0', '#d8b8a0', '#c8c8d8', '#e0d0b0'][i % 4]))); wall.position.y = h / 2; g.add(wall);
      const roof = mk(G(new THREE.ConeGeometry(Math.max(w, d) * 0.8, 2.6, 4)), roofM(['#3a4a6a', '#6a2a2a', '#2a4a3a', '#4a3a2a'][i % 4])); roof.rotation.y = Math.PI / 4; roof.position.y = h + 1.3; g.add(roof);
      for (let fl = 0; fl < Math.floor(h / 1.8); fl++) for (let k = -1; k <= 1; k += 2) { const win = mk(box(0.55, 0.8, 0.06), (fl + k + i) % 3 ? glow('#ffd890', 1.1) : mat('winD', () => toon('#2a3040'))); win.position.set(k * w * 0.25, 1.2 + fl * 1.8, d / 2 + 0.04); g.add(win); }
      const door = mk(box(0.9, 1.7, 0.08), wood2()); door.position.set(0, 0.85, d / 2 + 0.05); g.add(door); return g; }; P.townhouse.r = 2.8;
    P.fence = () => null; P.fence.r = 1.2;
    P.fence.inst = instOf([{ geo: box(0.1, 0.9, 0.1), mat: wood2(), m: L4(-1.1, 0.45, 0) }, { geo: box(0.1, 0.9, 0.1), mat: wood2(), m: L4(1.1, 0.45, 0) }, { geo: box(2.3, 0.08, 0.06), mat: wood2(), m: L4(0, 0.65, 0) }, { geo: box(2.3, 0.08, 0.06), mat: wood2(), m: L4(0, 0.3, 0) }]);
    P.field = (i) => { const g = new THREE.Group(); const c = ['#c8a848', '#7a9a3a', '#a8b848'][i % 3]; for (let k = 0; k < 7; k++) { const row = mk(box(8, 0.35, 0.5), mat('crop' + c, () => toon(c))); row.position.set(0, 0.15, (k - 3) * 1.0); g.add(row); } return g; }; P.field.r = 5;
    P.hay = () => { const g = new THREE.Group(); const hy = mk(cyl(0.6, 0.6, 1, 12), mat('hay', () => toon('#d8b860'))); hy.rotation.z = Math.PI / 2; hy.position.y = 0.6; g.add(hy); return g; }; P.hay.r = 1;
    P.well = () => { const g = new THREE.Group(); const r = mk(cyl(0.8, 0.85, 0.8, 14), stone()); r.position.y = 0.4; g.add(r); const wat = mk(cyl(0.7, 0.7, 0.05, 14), mat('wwat', () => toon('#2a4a6a'))); wat.position.y = 0.6; g.add(wat);
      for (const s of [-1, 1]) { const p = mk(box(0.12, 1.8, 0.12), wood()); p.position.set(s * 0.75, 1.2, 0); g.add(p); } const rf = mk(G(new THREE.ConeGeometry(1.3, 0.9, 4)), roofM('#6a3a2a')); rf.position.y = 2.4; rf.rotation.y = Math.PI / 4; g.add(rf); return g; }; P.well.r = 1.5;
    P.windmill = (i) => { const g = new THREE.Group(); const t = mk(cyl(1.2, 2, 8, 10), mat('mill', () => toon('#e8dcc8'))); t.position.y = 4; g.add(t); const rf = mk(G(new THREE.ConeGeometry(1.5, 2, 10)), roofM('#7a3a2a')); rf.position.y = 9; g.add(rf);
      const hub = new THREE.Group(); hub.position.set(0, 7.5, 1.4); g.add(hub); for (let k = 0; k < 4; k++) { const bl = mk(box(0.5, 5, 0.08), mat('sail', () => toon('#f0e8d8'))); bl.position.y = 2.6; const arm = new THREE.Group(); arm.rotation.z = k * Math.PI / 2; arm.add(bl); hub.add(arm); }
      anim.push((dt) => { hub.rotation.z += dt * 0.8; }); return g; }; P.windmill.r = 3;
    P.tent = (i) => { const g = new THREE.Group(); const c = ['#a07a50', '#8a3a2a', '#c8b898', '#5a6a8a'][i % 4]; const t = mk(G(new THREE.ConeGeometry(2, 3, 8, 1, true)), mat('tent' + c, () => toon(c, { side: THREE.DoubleSide }))); t.position.y = 1.5; g.add(t);
      const pole = mk(cyl(0.05, 0.05, 3.8, 5), wood()); pole.position.y = 1.9; g.add(pole); const fl = mk(box(0.6, 0.35, 0.02), mat('flag', () => toon('#c02a2a'))); fl.position.set(0.3, 3.6, 0); g.add(fl); anim.push((dt, t) => { fl.rotation.y = Math.sin(t * 3 + i) * 0.4; }); return g; }; P.tent.r = 2.4;
    P.totem = (i) => { const g = new THREE.Group(); const cs = ['#8a5a3a', '#a0302a', '#d0a040', '#3a5a7a']; for (let k = 0; k < 4; k++) { const s = mk(cyl(0.32, 0.36, 0.7, 8), mat('tot' + k, () => toon(cs[k]))); s.position.y = 0.35 + k * 0.7; g.add(s); const e = mk(box(0.12, 0.1, 0.05), glow('#ffe080', 1)); e.position.set(0.12, 0.45 + k * 0.7, 0.33); g.add(e); const e2 = e.clone(); e2.position.x = -0.12; g.add(e2); }
      const wing = mk(box(1.8, 0.3, 0.08), mat('tot2', () => toon('#d0a040'))); wing.position.y = 2.7; g.add(wing); return g; }; P.totem.r = 1;
    P.bones = (i) => { const g = new THREE.Group(); const m = mat('bone', () => toon('#e8e0cc')); const sk = mk(G(new THREE.SphereGeometry(0.22, 10, 8)), m); sk.scale.set(1, 0.85, 1.1); sk.position.y = 0.18; g.add(sk);
      for (let k = 0; k < 4; k++) { const b = mk(cyl(0.035, 0.035, 0.8, 5), m); b.rotation.set(Math.PI / 2, 0, k * 0.8 + hash(i, k)); b.position.set(Math.cos(k * 1.6) * 0.5, 0.04, Math.sin(k * 1.6) * 0.5); g.add(b); } return g; }; P.bones.r = 0.8;
    P.chapel = () => { const g = new THREE.Group(); const w = 6, d = 10, h = 5; const wall = mk(box(w, h, d), stone()); wall.position.y = h / 2; g.add(wall);
      const roof = mk(prism(d + 0.6, w + 0.8, 3.2, false), roofM('#3a3a4a')); roof.position.y = h - 0.05; g.add(roof);
      const tw = mk(box(2.2, 11, 2.2), stone()); tw.position.set(0, 5.5, d / 2 + 0.6); g.add(tw); const sp = mk(G(new THREE.ConeGeometry(1.7, 4.5, 4)), roofM('#3a3a4a')); sp.position.set(0, 13.2, d / 2 + 0.6); sp.rotation.y = Math.PI / 4; g.add(sp);
      const rose = mk(G(new THREE.CircleGeometry(0.8, 16)), glow('#b070ff', 1.3)); rose.position.set(0, 8, d / 2 + 1.72); g.add(rose);
      for (let k = -1; k <= 1; k++) { const wn = mk(box(0.06, 1.8, 0.7), glow(['#ff7070', '#70a0ff', '#f0d060'][k + 1], 1.1)); wn.position.set(w / 2 + 0.04, 2.6, k * 2.8); g.add(wn); const wn2 = wn.clone(); wn2.position.x = -w / 2 - 0.04; g.add(wn2); }
      const bell = mk(G(new THREE.SphereGeometry(0.4, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2)), mat('bronze', () => toon('#b08a3a'))); bell.position.set(0, 9.6, d / 2 + 0.6); g.add(bell); anim.push((dt, t) => { bell.rotation.z = Math.sin(t * 1.3) * 0.25; }); return g; }; P.chapel.r = 7;
    P.grave = () => null; P.grave.r = 0.8; P.grave.s = [0.8, 1.2];
    P.grave.inst = instOf([{ geo: box(0.6, 0.9, 0.15), mat: mat('rockI', () => toon('#ffffff')), m: L4(0, 0.45, 0, 1, 1, 1, 0.06, 0, 0.05), tint: '#9a9aa0' }, { geo: box(0.7, 0.12, 1.3), mat: mat('rockI', () => toon('#ffffff')), m: L4(0, 0.06, 0.7), tint: '#6a7a58' }]);
    P.statue = (i) => { const g = new THREE.Group(); const m = mat('marble', () => toon('#e8e6ea')); const b = mk(box(1, 0.8, 1), stone()); b.position.y = 0.4; g.add(b);
      const body = mk(G(new THREE.CylinderGeometry(0.2, 0.45, 1.8, 12)), m); body.position.y = 1.7; g.add(body); const hd = mk(G(new THREE.SphereGeometry(0.2, 12, 10)), m); hd.position.y = 2.8; g.add(hd);
      for (const s of [-1, 1]) { const wg = mk(box(0.08, 1.2, 0.7), m); wg.position.set(s * 0.35, 2.2, -0.25); wg.rotation.set(0.3, s * 0.5, s * 0.4); g.add(wg); } const halo = mk(G(new THREE.TorusGeometry(0.22, 0.02, 6, 20)), glow('#fff0b0', 1.4)); halo.position.set(0, 3.1, -0.05); g.add(halo); return g; }; P.statue.r = 1;
    P.wallseg = (i) => { const g = new THREE.Group(); const w = 8, h = th === T.fortress ? 6 : 2.2; const wl = mk(box(w, h, 1.2), stone()); wl.position.y = h / 2; g.add(wl);
      if (h > 3) for (let k = 0; k < 5; k++) { const c = mk(box(0.9, 0.8, 1.3), stone()); c.position.set(-w / 2 + 0.8 + k * 1.6, h + 0.4, 0); g.add(c); } return g; }; P.wallseg.r = 4.5;
    P.tower = (i) => { const g = new THREE.Group(); const h = 12 + hash(i, 1) * 6; const t = mk(cyl(2, 2.4, h, 12), stone()); t.position.y = h / 2; g.add(t); const rf = mk(G(new THREE.ConeGeometry(2.8, 4, 12)), roofM('#3a4a7a')); rf.position.y = h + 2; g.add(rf);
      for (let k = 0; k < 3; k++) { const w = mk(box(0.4, 0.8, 0.1), glow('#ffd080', 1.1)); const a = k * 2.1; w.position.set(Math.sin(a) * 2.05, h * 0.5 + k * 2, Math.cos(a) * 2.05); w.rotation.y = a; g.add(w); }
      const fl = mk(box(1.4, 0.8, 0.03), mat('flag', () => toon('#c02a2a'))); fl.position.set(0.75, h + 4.6, 0); g.add(fl); const pl = mk(cyl(0.04, 0.04, 1.8, 5), wood()); pl.position.y = h + 4.4; g.add(pl); anim.push((dt, t) => { fl.rotation.y = Math.sin(t * 2.5 + i) * 0.35; fl.scale.x = 1 + Math.sin(t * 5 + i) * 0.06; }); return g; }; P.tower.r = 3.4;
    P.banner = (i) => { const g = new THREE.Group(); const p = mk(cyl(0.04, 0.05, 3.2, 6), wood()); p.position.y = 1.6; g.add(p); const c = ['#c02a2a', '#2a4aa0', '#d0a040'][i % 3];
      const fl = mk(G(new THREE.PlaneGeometry(0.7, 1.4, 1, 6)), mat('ban' + c, () => toon(c, { side: THREE.DoubleSide }))); fl.position.set(0, 2.4, 0.02); g.add(fl);
      anim.push((dt, t) => { fl.rotation.y = Math.sin(t * 2 + i) * 0.25; }); return g; }; P.banner.r = 0.6;
    P.spikes = (i) => { const g = new THREE.Group(); for (let k = 0; k < 4; k++) { const s = mk(cyl(0.02, 0.08, 2, 5), wood()); s.position.set(k * 0.5 - 0.75, 0.8, 0); s.rotation.x = 0.6; g.add(s); } const bar = mk(box(2.2, 0.12, 0.12), wood()); bar.position.y = 0.4; g.add(bar); return g; }; P.spikes.r = 1.4;
    P.hut = (i) => { const g = new THREE.Group(); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const s = mk(cyl(0.08, 0.1, 2, 5), wood()); s.position.set(x * 1.2, 1, z * 1.2); g.add(s); }
      const fl = mk(box(3, 0.2, 3), wood()); fl.position.y = 1.9; g.add(fl); const wl = mk(box(2.4, 1.6, 2.4), mat('hutw', () => toon('#5a4a34'))); wl.position.y = 2.8; g.add(wl); const rf = mk(G(new THREE.ConeGeometry(2.3, 1.8, 6)), mat('thatch', () => toon('#6a5a3a'))); rf.position.y = 4.4; g.add(rf);
      const wn = mk(box(0.5, 0.4, 0.06), glow('#b0ff70', 1.2)); wn.position.set(0, 2.9, 1.23); g.add(wn); smoke(g, new V3(0.5, 5, 0), anim, mat, '#7a9a6a'); return g; }; P.hut.r = 2.6;
    P.pool = (i) => { const g = new THREE.Group(); const p = mk(G(new THREE.CircleGeometry(1.8 + hash(i, 2) * 1.5, 20)), mat('poolw', () => new THREE.MeshStandardMaterial({ color: ExWorld.lin('#1a3020'), roughness: 0.1, metalness: 0.3, emissive: ExWorld.lin(new THREE.Color('#0a2a10')) }))); p.rotation.x = -Math.PI / 2; p.position.y = 0.04; g.add(p);
      const bub = mk(G(new THREE.SphereGeometry(0.08, 8, 6)), glow('#8aff6a', 1)); g.add(bub); anim.push((dt, t) => { const k = (t * 0.6 + i * 0.37) % 1; bub.position.set(Math.sin(i) * 0.6, 0.05 + k * 0.1, Math.cos(i) * 0.6); bub.scale.setScalar(k < 0.9 ? k + 0.2 : 0.01); }); return g; }; P.pool.r = 2.6;
    P.lava = (i) => { const g = new THREE.Group(); const lm = mat('lavaM', () => new THREE.MeshBasicMaterial({ color: ExWorld.lin(new THREE.Color('#ff5a10').multiplyScalar(1.3))})); const p = mk(G(new THREE.CircleGeometry(2 + hash(i, 3) * 2, 18)), lm); p.rotation.x = -Math.PI / 2; p.position.y = 0.06; g.add(p);
      const crust = mk(G(new THREE.RingGeometry(2 + hash(i, 3) * 2, 2.6 + hash(i, 3) * 2, 18)), mat('crust', () => toon('#2a1410'))); crust.rotation.x = -Math.PI / 2; crust.position.y = 0.07; g.add(crust); anim.push((dt, t) => { lm.color.setRGB(1.3, 0.35 + Math.sin(t * 2) * 0.06, 0.05); }); return g; }; P.lava.r = 3.5;
    P.floatrock = (i) => { const g = new THREE.Group(); const r = mk(G(new THREE.ConeGeometry(1.4, 2.6, 6)), mat('frock', () => toon('#3a2a28', { emissive: ExWorld.lin(new THREE.Color('#2a0805')) }))); r.rotation.x = Math.PI; g.add(r); const top = mk(G(new THREE.CylinderGeometry(1.4, 1.4, 0.3, 6)), mat('frock', () => toon('#3a2a28'))); top.position.y = 1.4; g.add(top);
      const base = 5 + hash(i, 4) * 6; anim.push((dt, t) => { g.position.y = base + Math.sin(t * 0.6 + i) * 0.6; g.rotation.y = t * 0.05 + i; }); return g; }; P.floatrock.r = 2; P.floatrock.dy = 6;
    P.bonearch = () => { const g = new THREE.Group(); const m = mat('bone', () => toon('#e8e0cc')); const arc = new THREE.Mesh(G(new THREE.TorusGeometry(4.6, 0.26, 8, 28, Math.PI)), m); arc.scale.y = 1.15; g.add(arc);
      for (let k = 0; k <= 8; k++) { const a = k / 8 * Math.PI; const v = new THREE.Mesh(G(new THREE.SphereGeometry(0.36, 8, 6)), m); v.position.set(Math.cos(a) * 4.6, Math.sin(a) * 4.6 * 1.15, 0); v.scale.set(1, 0.7, 1); g.add(v); }
      for (const s of [-1, 1]) { const sp = new THREE.Mesh(G(new THREE.ConeGeometry(0.3, 1.6, 6)), m); sp.position.set(s * 3.3, 4.6, 0); sp.rotation.z = s * -0.9; g.add(sp); } return g; };
    P.ribs = () => { const g = new THREE.Group(); const m = mat('bone', () => toon('#f0ead8')); const arcG = G(new THREE.TorusGeometry(5.4, 0.3, 8, 26, Math.PI * 0.86));
      for (let k = 0; k < 6; k++) { const rb = new THREE.Mesh(arcG, m); rb.rotation.z = Math.PI * 0.07; rb.position.z = k * 2.4 - 6; rb.scale.set(1, 1.25 - Math.abs(k - 2.5) * 0.08, 1); g.add(rb); }
      const spine = new THREE.Mesh(G(new THREE.CylinderGeometry(0.4, 0.4, 15, 10)), m); spine.rotation.x = Math.PI / 2; spine.position.y = 6.6; g.add(spine);
      for (let k = 0; k < 7; k++) { const v = new THREE.Mesh(G(new THREE.ConeGeometry(0.25, 1.1, 6)), m); v.position.set(0, 7.3, k * 2.2 - 6.6); g.add(v); } return g; };
    P.pillar = (i) => { const g = new THREE.Group(); const m = mat('marble', () => toon('#e8e6ea')); const h = 2 + hash(i, 1) * 5; const c = mk(cyl(0.45, 0.5, h, 14), m); c.position.y = h / 2; g.add(c); const b = mk(box(1.3, 0.3, 1.3), m); b.position.y = 0.15; g.add(b);
      if (h > 5) { const cap = mk(box(1.3, 0.35, 1.3), m); cap.position.y = h + 0.17; g.add(cap); } return g; }; P.pillar.r = 1;
    P.cloud = (i) => { const g = new THREE.Group(); const m = mat('cloud', () => new THREE.MeshLambertMaterial({ color: ExWorld.lin('#ffffff'), transparent: true, opacity: 0.9 })); for (let k = 0; k < 5; k++) { const b = mk(blobGeo, m); b.scale.set(3 + hash(i, k) * 3, 1.5 + hash(i, k + 3), 2.5 + hash(i, k + 5) * 2); b.position.set(k * 3 - 6, hash(i, k + 7) * 1.5, hash(i, k + 9) * 2); g.add(b); }
      const base = -4 - hash(i, 8) * 8; anim.push((dt, t) => { g.position.y = base; g.position.x += dt * 0.3; }); return g; }; P.cloud.r = 6;
    return P;
  }
  function smoke(g, at, anim, mat, col = '#b8b0a8') {
    const m = mat('smoke' + col, () => new THREE.MeshBasicMaterial({ color: ExWorld.lin(col), transparent: true, opacity: 0.35, depthWrite: false }));
    const pf = []; for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), m); s.position.copy(at); g.add(s); pf.push(s); }
    anim.push((dt, t) => pf.forEach((s, k) => { const u = (t * 0.25 + k / 6) % 1; s.position.set(at.x + Math.sin(u * 5 + k) * 0.3 + u * 0.8, at.y + u * 4, at.z); s.scale.setScalar(0.5 + u * 2.2); }));
  }
  // ---------- 粒子 ----------
  function particles(kind, scene, disp) {
    if (!kind) return null;
    const C = { pollen: ['#fff6c0', 0.06, 300, 0.25], firefly: ['#c8ff70', 0.12, 260, 0.2], dust: ['#e8c898', 0.07, 420, 1.4], petal: ['#ffc0d8', 0.09, 260, 0.6], wisp: ['#9aff8a', 0.16, 120, 0.2], ember: ['#ff8a3a', 0.08, 380, 0.5], snow: ['#ffffff', 0.08, 700, 0.3] }[kind];
    if (!C) return null;
    const n = C[2], g = new THREE.BufferGeometry(), p = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) { p[i * 3] = (Math.random() - 0.5) * 40; p[i * 3 + 1] = Math.random() * 12; p[i * 3 + 2] = (Math.random() - 0.5) * 40; seed[i] = Math.random() * 100; }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); disp.push(g);
    const cv = document.createElement('canvas'); cv.width = cv.height = 32; const x = cv.getContext('2d'); const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
    const tex = new THREE.CanvasTexture(cv); disp.push(tex);
    const m = new THREE.PointsMaterial({ color: ExWorld.lin(C[0]), size: C[1] * 2.5, map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }); disp.push(m);
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts);
    return { update(dt, t, cam) {
      const c = cam.position;
      for (let i = 0; i < n; i++) {
        let X = p[i * 3], Y = p[i * 3 + 1], Z = p[i * 3 + 2]; const s = seed[i];
        if (kind === 'snow') { Y -= dt * (0.8 + (s % 1)); X += Math.sin(t + s) * dt * 0.4; }
        else if (kind === 'ember') { Y += dt * (0.6 + (s % 1)); X += Math.sin(t * 2 + s) * dt * 0.3; }
        else if (kind === 'dust') { X += dt * C[3] * (1 + (s % 1)); Y += Math.sin(t + s) * dt * 0.2; }
        else if (kind === 'petal') { Y -= dt * 0.35; X += Math.sin(t * 1.3 + s) * dt * 0.6; Z += Math.cos(t + s) * dt * 0.3; }
        else { X += Math.sin(t * 0.7 + s) * dt * C[3]; Y += Math.cos(t * 0.5 + s * 1.3) * dt * C[3]; Z += Math.sin(t * 0.6 + s * 0.7) * dt * C[3]; }
        // 以相机为中心循环
        if (X - c.x > 20) X -= 40; else if (X - c.x < -20) X += 40; if (Z - c.z > 20) Z -= 40; else if (Z - c.z < -20) Z += 40;
        if (Y < c.y - 4) Y += 14; else if (Y > c.y + 10) Y -= 14;
        p[i * 3] = X; p[i * 3 + 1] = Y; p[i * 3 + 2] = Z;
      }
      g.attributes.position.needsUpdate = true;
      if (kind === 'firefly' || kind === 'wisp') m.opacity = 0.65 + Math.sin(t * 3) * 0.3;
    } };
  }
  // ---------- 鸟 ----------
  function flock(scene, disp, col) {
    const m = new THREE.MeshBasicMaterial({ color: ExWorld.lin(col), side: THREE.DoubleSide, fog: true }); disp.push(m);
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0.15, 0, 0, -0.15, 0.7, 0.05, 0]), 3)); disp.push(wg);
    const birds = []; for (let i = 0; i < 9; i++) { const b = new THREE.Group(); const l = new THREE.Mesh(wg, m), r = new THREE.Mesh(wg, m); r.scale.x = -1; b.add(l, r); scene.add(b); birds.push({ b, l, r, ph: Math.random() * 6, rad: 14 + Math.random() * 10, h: 16 + Math.random() * 8, sp: 0.25 + Math.random() * 0.15 }); }
    return (dt, t, cam) => birds.forEach((o, i) => { const a = t * o.sp + o.ph; o.b.position.set(cam.position.x + Math.cos(a) * o.rad, o.h + Math.sin(t + i) * 0.8, cam.position.z - 30 + Math.sin(a) * o.rad); o.b.rotation.y = -a; const f = Math.sin(t * 9 + i) * 0.7; o.l.rotation.z = f; o.r.rotation.z = -f; });
  }
  return { build, themeOf, toon, T, lin };
})();
