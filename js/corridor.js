// R54 MOD corridor（默认开）：地点之间不再有加载画面——穿过山口就踏进一条弯曲的长走廊（峡谷 / 林间小径 / 断墙夹道，随出发地风格），
// 走廊在玩家前方即时生成（每 24m 一段：路面 + 两侧陡坡 + 坡上的树石墙），宽窄、拐弯、起伏都随机；后台同时加载下一个地点，
// 加载好后在前方 ~30m 生成雾中出口，走进去就到。只用已加载的素材 + 程序化地形条带（几毫秒一段）。
window.Corridor = (() => {
  const on = () => !window.Mods || Mods.on('corridor') !== false;
  const V3 = THREE.Vector3, CHUNK = 24;
  const mulberry = (a) => () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  function create(kit, o) {
    const r = mulberry(o.seed || 1), sc = new THREE.Scene(), P = [], grid = new Map(), chunks = [];
    const ph1 = r() * 6.28, ph2 = r() * 6.28, bh0 = 3.5 + r() * 3.5;
    // ---- 路径：分段曲率，左右交替，总朝向限制在 ±70° 内（不会绕回来打结）----
    let x = 0, z = 0, a = 0, k = 0, kT = 0, seg = 0, w = 2.6, wT = 2.6, sgn = r() < 0.5 ? 1 : -1;
    function grow(n) {
      for (let i = 0; i < n; i++) {
        if (seg <= 0) { seg = 9 + r() * 16; const straight = r() < 0.22; sgn = r() < 0.8 ? -sgn : sgn; if (Math.abs(a) > 0.9) sgn = a > 0 ? -1 : 1; kT = straight ? 0 : sgn * (0.035 + r() * 0.07); wT = r() < 0.25 ? 1.6 + r() * 0.6 : r() < 0.3 ? 4.2 + r() * 1.8 : 2.2 + r() * 1.6; }
        seg -= 1; k += (kT - k) * 0.12; a += k; w += (wT - w) * 0.07; x += Math.sin(a); z += Math.cos(a);
        const s = P.length, y = 2.0 * Math.sin(s * 0.021 + ph1) + 1.1 * Math.sin(s * 0.057 + ph2);
        P.push({ x, z, y, w, dx: Math.sin(a), dz: Math.cos(a), nx: Math.cos(a), nz: -Math.sin(a), bh: bh0 + 2 * Math.sin(s * 0.013 + ph2) });
        const key = Math.floor(x / 4) + ',' + Math.floor(z / 4); if (!grid.has(key)) grid.set(key, []); grid.get(key).push(s);
      }
    }
    function nearest(px, pz) {
      const cx = Math.floor(px / 4), cz = Math.floor(pz / 4); let best = -1, bd = 1e18;
      for (let R = 1; R <= 3 && best < 0; R++) for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) { const L = grid.get((cx + i) + ',' + (cz + j)); if (!L) continue; for (const s of L) { const p = P[s], d = (p.x - px) ** 2 + (p.z - pz) ** 2; if (d < bd) { bd = d; best = s; } } }
      return best < 0 ? 0 : best;
    }
    const bank = (e, bh) => e <= 0 ? 0 : bh * sstep(0, 5.5, e) + e * 0.45;
    function H(px, pz) { const p = P[nearest(px, pz)], u = (px - p.x) * p.nx + (pz - p.z) * p.nz; return p.y + bank(Math.abs(u) - p.w, p.bh) + 0.05 * Math.sin(px * 1.3) * Math.sin(pz * 1.1); }
    // ---- 渲染：天空 / 雾 / 光 ----
    const sky = o.sky;
    if (sky) {
      const sm = new THREE.ShaderMaterial({ uniforms: { map: { value: sky.bg }, k: { value: o.st.night ? 0.9 : 1.1 } }, depthWrite: false, side: THREE.BackSide, fog: false,
        vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
        fragmentShader: 'uniform sampler2D map; uniform float k; varying vec3 vD; void main(){ vec3 d = normalize(vD); vec2 uv = vec2(atan(d.z, d.x) * 0.1591549 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.3183099 + 0.5); gl_FragColor = vec4(texture2D(map, uv).rgb * k, 1.0); }' });
      const skyM = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), sm); skyM.frustumCulled = false; skyM.renderOrder = -10; skyM.userData.sky = 1; sc.add(skyM); sc.userData.skyM = skyM;
      sc.environment = sky.env; sc.fog = new THREE.FogExp2(sky.horizon.clone().multiplyScalar(o.st.night ? 0.55 : 0.75), o.st.night ? 0.04 : 0.032);
    } else sc.fog = new THREE.FogExp2('#7d8a90', 0.035);
    let el = sky ? Math.max(0.5, (0.5 - sky.sun[1]) * Math.PI) : 0.9, az = sky ? (sky.sun[0] - 0.5) * Math.PI * 2 : 0.6;
    const sunDir = new V3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).normalize();
    const sun = new THREE.DirectionalLight(o.st.night ? '#9fb4ff' : '#fff1dc', (o.st.sun || 2) * 0.9); sun.castShadow = true;
    Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 160 }); sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sc.add(sun, sun.target);
    sc.add(new THREE.HemisphereLight(sky ? sky.zenith : '#8899aa', sky ? sky.ground : '#443322', o.st.night ? 0.4 : 0.3));
    // ---- 分段：路面条带 + 树石墙 ----
    const COLS = [-11, -7.5, -4.5, -2.5, -1, 0, 0.5, 1, 1.5, 2, 3, 4.5, 7.5, 11].length; // 只用于计数
    const UO = (p) => [-p.w - 11, -p.w - 7, -p.w - 4.2, -p.w - 2.2, -p.w - 0.8, -p.w, -p.w * 0.5, 0, p.w * 0.5, p.w, p.w + 0.8, p.w + 2.2, p.w + 4.2, p.w + 7, p.w + 11];
    function buildChunk(ci) {
      const s0 = ci * CHUNK, s1 = Math.min(P.length - 1, s0 + CHUNK); if (s1 - s0 < 2) return null;
      const rows = s1 - s0 + 1, cols = 15, pos = new Float32Array(rows * cols * 3), idx = [];
      for (let j = 0; j < rows; j++) { const p = P[s0 + j], us = UO(p); for (let c = 0; c < cols; c++) { const u = us[c], px = p.x + p.nx * u, pz = p.z + p.nz * u, k3 = (j * cols + c) * 3; pos[k3] = px; pos[k3 + 1] = p.y + bank(Math.abs(u) - p.w, p.bh) + 0.05 * Math.sin(px * 1.3) * Math.sin(pz * 1.1); pos[k3 + 2] = pz; } }
      for (let j = 0; j < rows - 1; j++) for (let c = 0; c < cols - 1; c++) { const q = j * cols + c; idx.push(q, q + cols, q + 1, q + 1, q + cols, q + cols + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere();
      const m = new THREE.Mesh(g, o.mat); m.receiveShadow = true; sc.add(m); const ch = { ci, mesh: m, ims: [] };
      // 墙：两侧坡上每 3~5m 一棵树/一块石头；路边偶尔小植物
      const per = new Map(); const add = (n, mx) => { if (!per.has(n)) per.set(n, []); per.get(n).push(mx); };
      for (let s = s0 + 1; s < s1; s += 3 + Math.floor(r() * 3)) { const p = P[s];
        for (const sd of [-1, 1]) { if (!o.walls.length) break; const e = 1.2 + r() * 3.4, u = sd * (p.w + e), px = p.x + p.nx * u, pz = p.z + p.nz * u, n = o.walls[Math.floor(r() * o.walls.length)], sz = o.size(n);
          const s2 = (0.9 + r() * 0.6) * (sz.big ? Math.min(1.6, 3.6 / Math.max(0.5, Math.max(sz.x, sz.z))) : 1); add(n, new THREE.Matrix4().compose(new V3(px, H(px, pz) - 0.25 * s2, pz), new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), r() * 6.28), new V3(s2, s2, s2))); }
        if (o.plants.length && r() < 0.6) { const sd = r() < 0.5 ? -1 : 1, u = sd * (p.w * (0.55 + r() * 0.5)), px = p.x + p.nx * u, pz = p.z + p.nz * u, n = o.plants[Math.floor(r() * o.plants.length)], s2 = 0.8 + r() * 0.6; add(n, new THREE.Matrix4().compose(new V3(px, H(px, pz) - 0.02, pz), new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), r() * 6.28), new V3(s2, s2, s2))); } }
      for (const [n, ms] of per) for (const t of kit.templates(n)) for (const part of t.parts) { const im = new THREE.InstancedMesh(part.geo, part.mat, ms.length); ms.forEach((mx, i) => im.setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(mx, part.m))); im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; im.castShadow = !(part.mat.alphaTest > 0 && t.size.y < 1.2); im.receiveShadow = true; sc.add(im); ch.ims.push(im); break; } // 每个模板只取第一个变体
      return ch;
    }
    function killChunk(ch) { sc.remove(ch.mesh); ch.mesh.geometry.dispose(); for (const im of ch.ims) { sc.remove(im); im.dispose(); } }
    // ---- 入口 / 出口：只是两块大石夹出的山口（不要传送门）----
    function gateAt(s) { const p = P[s], n = o.walls.find(w => o.size(w).big) || o.walls[0]; if (!n) return null; const t = kit.templates(n)[0]; if (!t) return null; const g = new THREE.Group(); sc.add(g);
      for (const sd of [-1, 1]) { const u = sd * (p.w + 0.6), px = p.x + p.nx * u, pz = p.z + p.nz * u, s2 = Math.min(1.8, 3.4 / Math.max(0.5, t.size.y)); for (const part of t.parts) { const m = new THREE.Mesh(part.geo, part.mat); m.matrixAutoUpdate = false; m.matrix.compose(new V3(px, H(px, pz) - 0.3, pz), new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), r() * 6.28), new V3(s2, s2, s2)).multiply(part.m); m.castShadow = true; g.add(m); } }
      return g; }
    grow(CHUNK * 4 + 2); for (let i = 0; i < 4; i++) { const c = buildChunk(i); if (c) chunks.push(c); }
    gateAt(3);
    let ready = null, exitS = -1, exitG = null, fired = false, built = 4;
    const B = { corr: true, sc, H, R: 1e4, RM: 1e4, Rf: null, edge: null, cols: [], doors: [], inter: [], spots: [], small: [], grass: null, site: null, sun, sunDir, style: o.st, terr: chunks[0] && chunks[0].mesh,
      lp: { shaped: true, clamp(pos, rad) { const i = nearest(pos.x, pos.z), p = P[i]; let u = (pos.x - p.x) * p.nx + (pos.z - p.z) * p.nz; const lim = Math.max(0.3, p.w - rad - 0.15); if (Math.abs(u) > lim) { const d = Math.sign(u) * lim - u; pos.x += p.nx * d; pos.z += p.nz * d; }
        if (i < 3) { const t = (pos.x - P[3].x) * P[3].dx + (pos.z - P[3].z) * P[3].dz; if (t < 0) { pos.x -= P[3].dx * t; pos.z -= P[3].dz * t; } } } },
      start: (() => { const p = P[4]; return { x: p.x, z: p.z, y: p.y, yaw: Math.atan2(-p.dx, -p.dz) }; })(),
      wx(dt, cam) { const i = nearest(cam.x, cam.z);
        while (P.length < i + 90) grow(CHUNK); while (built * CHUNK < Math.min(P.length - 2, i + 70)) { const c = buildChunk(built); built++; if (c) chunks.push(c); }
        while (chunks.length && (chunks[0].ci + 1) * CHUNK < i - 45) killChunk(chunks.shift());
        if (ready && exitS < 0) { exitS = Math.max(i + 14, 12); while (P.length < exitS + 30) grow(CHUNK); while (built * CHUNK < exitS + 20) { const c = buildChunk(built); built++; if (c) chunks.push(c); } exitG = gateAt(exitS, false); }
        if (exitS > 0 && !fired && i >= exitS) { fired = true; try { ready(); } catch (e) { console.warn('corridor exit', e); } } },
      ready(cb) { ready = cb; },
      progress(px, pz) { return nearest(px, pz); }, _P: P, get exitS() { return exitS; },
      dispose() { for (const ch of chunks) killChunk(ch); chunks.length = 0; sc.traverse(o2 => { if (o2.userData && o2.userData.sky) { o2.geometry.dispose(); o2.material.dispose(); } }); if (sun.shadow.map) sun.shadow.map.dispose(); } };
    return B;
  }
  return { on, create };
})();
