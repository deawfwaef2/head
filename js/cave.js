// 程序化洞穴：岩壁穹顶、地面、钟乳石/石笋、中央篝火、出口隧道、地精商人摊位；可按深度重建（扩建）
window.Cave = (() => {
  const B = () => window.BuildCat;
  // 3D 值噪声
  const hash = (x, y, z) => { let h = x * 374761393 + y * 668265263 + z * 2147483647; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) & 0xffff) / 0xffff; };
  function vnoise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z); const xf = x - xi, yf = y - yi, zf = z - zi;
    const s = t => t * t * (3 - 2 * t); const u = s(xf), v = s(yf), w = s(zf);
    const L = (a, b, t) => a + (b - a) * t;
    return L(L(L(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), L(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v), L(L(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), L(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v), w);
  }
  const fbm = (x, y, z) => vnoise(x, y, z) * 0.55 + vnoise(x * 2.1, y * 2.1, z * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3, z * 4.3) * 0.15;

  let rockTex = null, floorTex = null;
  function textures() {
    if (rockTex) return;
    const mk = (base, spots, n, lines) => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < n; i++) { g.fillStyle = spots[Math.floor(Math.random() * spots.length)]; g.globalAlpha = 0.05 + Math.random() * 0.2; g.beginPath(); g.ellipse(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 18, 2 + Math.random() * 10, Math.random() * 3, 0, 6.283); g.fill(); }
      g.globalAlpha = 0.25; g.strokeStyle = '#1a1612'; for (let i = 0; i < lines; i++) { g.lineWidth = 0.5 + Math.random() * 1.5; g.beginPath(); let x = Math.random() * 512, y = Math.random() * 512; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 60; y += (Math.random() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
      g.globalAlpha = 1; const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
    rockTex = mk('#5e564c', ['#3a342c', '#7a7064', '#4a4238', '#8a7e6e', '#2e2822'], 2500, 60);
    floorTex = mk('#4a4036', ['#2e2620', '#5e5244', '#3a3028', '#6a5a48', '#201a14'], 3500, 30);
  }

  // 第十三轮画质重做：Poly Haven CC0 资产（三平面 PBR 岩壁/地面、真实岩体、石砌火坑、铁门、商摊道具）+ 序列帧火焰
  const A = () => window.Assets;
  const rnd = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  function place(g, name, x, y, z, s, ry) { const o = A() && A().clone(name); if (!o) return null; o.position.set(x, y, z); o.scale.setScalar(s); o.rotation.y = ry || 0; g.add(o); return o; }
  function placePart(g, name, node, x, y, z, s, ry) { const o = A() && A().part(name, node); if (!o) return null; o.position.set(x, y, z); o.scale.setScalar(s); o.rotation.y = ry || 0; g.add(o); return o; }

  // CC0 小物分批实例化：用现成资产变体装饰地表，不为每个物件单独创建 draw call。
  function scatterSmallProps(parent, R, floorAt, rand, merchantPos) {
    if (!(window.Mods && Mods.on('cave_detail'))) return 0;
    // 第十九轮（总管理师，用户反馈“洞穴地面上莫名其妙各种非常小的物体”）：这里的实例矩阵 S(baseScale) × norm(已含 baseScale) 是双重缩放，
    // 物件被缩成几毫米～几厘米，且本身就是 9～32cm 的迷你酒杯/木箱/酒桶随机撒地。先停用散布（地表贴图部分不受影响）；协作者如要恢复请修缩放并按真实尺寸摆在合理位置。
    if (!window.__caveSmallProps) return 0;
    const am = A(), pack = window.PropModels && PropModels.T;
    const specs = [
      { name: 'brass_goblets', count: 18, h: 0.09, root: () => am && am.models.brass_goblets },
      { name: 'brass_candleholders', count: 12, h: 0.17, root: () => am && am.models.brass_candleholders },
      { name: 'wooden_lantern_01', count: 10, h: 0.28, root: () => am && am.models.wooden_lantern_01 },
      { name: 'wooden_crate_01', count: 8, h: 0.24, root: () => am && am.models.wooden_crate_01 },
      { name: 'wine_barrel_01', count: 6, h: 0.32, root: () => am && am.models.wine_barrel_01 },
      { name: 'antique_ceramic_vase_01', count: 10, h: 0.24, root: () => pack && pack.antique_ceramic_vase_01 && pack.antique_ceramic_vase_01.scene }
    ];
    const minR = Math.max(1.7, R * 0.16), maxR = R - 1.25, density = Math.min(1.8, Math.max(1, Math.pow(R / 7, 0.72)));
    const rootInv = new THREE.Matrix4(), norm = new THREE.Matrix4(), srcM = new THREE.Matrix4(), M = new THREE.Matrix4(), T = new THREE.Matrix4(), Y = new THREE.Matrix4(), S = new THREE.Matrix4();
    let total = 0;
    for (const spec of specs) {
      const root = spec.root(); if (!root) continue;
      root.updateMatrixWorld(true); const bounds = new THREE.Box3().setFromObject(root); if (bounds.isEmpty()) continue;
      const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
      const baseScale = spec.h / Math.max(0.001, size.y);
      norm.makeScale(baseScale, baseScale, baseScale).multiply(new THREE.Matrix4().makeTranslation(-center.x, -bounds.min.y, -center.z));
      rootInv.copy(root.matrixWorld).invert();
      const placements = [], wanted = Math.max(1, Math.round(spec.count * density));
      for (let tries = 0; tries < wanted * 18 && placements.length < wanted; tries++) {
        const a = rand() * Math.PI * 2, r = Math.sqrt(minR * minR + rand() * Math.max(0.01, maxR * maxR - minR * minR));
        const x = Math.sin(a) * r, z = -Math.cos(a) * r;
        if (Math.hypot(x - merchantPos.x, z - merchantPos.z) < 2.0) continue;
        if (r > R * 0.45 && Math.abs(Math.atan2(x, -z)) < 0.38) continue; // 留出通往洞口的走廊
        placements.push({ x, y: floorAt(x, z), z, yaw: rand() * Math.PI * 2, s: 0.88 + rand() * 0.24 });
      }
      if (!placements.length) continue;
      const meshes = [];
      root.traverse(o => { if (o.isMesh && o.geometry && o.material) { o.geometry.__shared = true; meshes.push({ geo: o.geometry, mat: o.material, local: srcM.copy(rootInv).multiply(o.matrixWorld).clone() }); } });
      for (const part of meshes) {
        const inst = new THREE.InstancedMesh(part.geo, part.mat, placements.length); inst.name = 'cave_decor_' + spec.name; inst.castShadow = false; inst.receiveShadow = false; inst.frustumCulled = false; inst.raycast = () => {};
        inst.instanceMatrix.setUsage(THREE.StaticDrawUsage);
        for (let i = 0; i < placements.length; i++) {
          const q = placements[i]; T.makeTranslation(q.x, q.y, q.z); Y.makeRotationY(q.yaw); S.makeScale(baseScale * q.s, baseScale * q.s, baseScale * q.s);
          M.copy(T).multiply(Y).multiply(S).multiply(norm).multiply(part.local); inst.setMatrixAt(i, M);
        }
        inst.instanceMatrix.needsUpdate = true; parent.add(inst);
      }
      total += placements.length;
    }
    return total;
  }

  let _glowT = null;
  function flameGlowTex() { if (_glowT) return _glowT; const gc = document.createElement('canvas'); gc.width = gc.height = 64; const gg = gc.getContext('2d'); const gr = gg.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,200,120,1)'); gr.addColorStop(0.35, 'rgba(255,120,40,0.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, 64, 64); return (_glowT = new THREE.CanvasTexture(gc)); }
  function flameSprites(parent) {
    const img = A() && A().img('fire'); const out = [];
    if (!img) return out;
    const L = [[0, 0, 0, 1.25, 0], [0.13, 0, 0.06, 0.85, 7], [-0.12, 0, -0.05, 0.9, 13], [0.02, 0, -0.14, 0.7, 19], [-0.05, 0, 0.14, 0.62, 4], [0.0, 0.05, 0.0, 0.55, 10]];
    for (const [x, y, z, sc, ph] of L) {
      const t = img.clone(); t.needsUpdate = true; t.repeat.set(0.2, 0.2);
      const m = new THREE.SpriteMaterial({ map: t, color: new THREE.Color(2.3, 1.35, 0.78), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
      const sp = new THREE.Sprite(m); sp.center.set(0.5, 0.06); sp.position.set(x, 0.12 + y, z); sp.scale.set(sc * 0.72, sc, 1); sp.userData.noShadow = true;
      sp.userData.fl = { ph, sc, sp: 26 + (ph % 5) * 2 }; parent.add(sp); out.push(sp);
    }
    // 底部辉光
    const gc = document.createElement('canvas'); gc.width = gc.height = 64; const gg = gc.getContext('2d'); const gr = gg.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,160,70,1)'); gr.addColorStop(0.4, 'rgba(255,90,20,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, 64, 64);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), color: new THREE.Color(0.7, 0.42, 0.26), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    glow.position.set(0, 0.2, 0); glow.scale.set(0.95, 0.55, 1); parent.add(glow);
    return out;
  }

  function build(scene, R, depth) {
    const useA = !!(A() && A().has('stone_fire_pit') && A().tex('dark_rock'));
    if (!useA) textures();
    const g = new THREE.Group(); g.name = 'cave';
    const H = 3.6 + R * 0.28;
    const rand = rnd(9173 + Math.round(R * 100));
    const floorAt = (x, z) => { const d = Math.hypot(x, z) / R; return d > 0.85 ? (d - 0.85) * 2.5 * fbm(x * 0.5, 0, z * 0.5) : 0; };
    const fg = new THREE.RingGeometry(0.001, R + 0.8, 96, Math.max(24, Math.round((R + 0.8) * 5))); fg.rotateX(-Math.PI / 2);
    { const p = fg.attributes.position; const col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, floorAt(x, z));
        // 宏观明暗变化：打破贴图平铺感；火坑周围焦黑，墙根更暗
        const n = fbm(x * 0.35 + 3, 0.5, z * 0.35 - 7), d = Math.hypot(x, z); const burn = Math.max(0, 1 - d / 1.8);
        const c = (0.62 + n * 0.55) * (1 - burn * 0.55) * (1 - Math.max(0, d / R - 0.7) * 0.9);
        col[i * 3] = c; col[i * 3 + 1] = c * 0.95; col[i * 3 + 2] = c * 0.9; }
      fg.setAttribute('color', new THREE.BufferAttribute(col, 3)); fg.computeVertexNormals();
      const uv = fg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 3, p.getZ(i) / 3); }
    const floorMat = useA ? A().triplanar(A().tex('rock_ground'), { scale: window.Mods && Mods.on('cave_detail') ? 0.18 : 0.42, flat: 1, vertexColors: true, normal: window.Mods && Mods.on('cave_detail') ? 1.0 : 1.4, env: 0.25, color: '#d8cfc4' })
      : new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95, color: '#b8a898' });
    const floor = new THREE.Mesh(fg, floorMat); floor.receiveShadow = true; g.add(floor);
    // 穹顶岩壁
    const dg = new THREE.SphereGeometry(1, 128, 48, 0, Math.PI * 2, 0, Math.PI * 0.62);
    { const p = dg.attributes.position; const col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const n = fbm(x * 3 + 10, y * 3, z * 3 + 5), n2 = fbm(x * 9 - 4, y * 9, z * 9 + 2);
        const k = 0.82 + n * 0.36 + (n2 - 0.5) * 0.06;
        let X = x * R * k, Z = z * R * k, Y = y * H * (0.85 + n * 0.3);
        if (y < 0) { Y = y * 2.2; }
        const ang = Math.atan2(x, -z);
        if (Math.abs(ang) < 0.16 && Y < 2.6) { X *= 1.6; Z *= 1.6; }
        p.setXYZ(i, X, Math.max(-1, Y), Z);
        const c = 0.5 + n * 0.6; col[i * 3] = c * 1.0; col[i * 3 + 1] = c * 0.93; col[i * 3 + 2] = c * 0.86;
      }
      dg.setAttribute('color', new THREE.BufferAttribute(col, 3)); dg.computeVertexNormals();
      const uv = dg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * R * 1.2, uv.getY(i) * H / 2); }
    const wallMat = useA ? A().triplanar(A().tex('dark_rock'), { scale: 0.3, side: THREE.BackSide, vertexColors: true, normal: 1.6, env: 0.75, color: '#ffe6c8' })
      : new THREE.MeshStandardMaterial({ map: rockTex, vertexColors: true, roughness: 0.95, side: THREE.BackSide, color: '#c8b8a8' });
    const wall = new THREE.Mesh(dg, wallMat); wall.receiveShadow = true; g.add(wall);
    const stal = new THREE.Group(); g.add(stal); const pillars = [];
    const inExit = (x, z, w) => Math.abs(Math.atan2(x, -z)) < w;
    // 与穹顶同一噪声：角度 a 处（贴地高度）墙面的实际半径
    const wallR = (a) => { const x = Math.sin(a), z = -Math.cos(a); return R * (0.82 + fbm(x * 3 + 10, 0.15, z * 3 + 5) * 0.36); };
    if (useA) {
      // 岩壁崖面：沿墙一圈，正面朝向洞心，打破穹顶轮廓
      const nFace = Math.max(6, Math.round(R * 1.3));
      for (let i = 0; i < nFace; i++) {
        const a = (i + rand() * 0.5) / nFace * Math.PI * 2; const s = 0.6 + rand() * 0.4, rr = wallR(a) - 1.4 * s; const x = Math.sin(a) * rr, z = -Math.cos(a) * rr;
        if (inExit(x, z, 0.42)) continue;
        const th = Math.atan2(-x, -z) + (rand() - 0.5) * 0.4; place(stal, 'rock_face_01', x, -0.2 - rand() * 0.3, z, s, th);
        // 崖面前缘碰撞（局部坐标 → 世界）
        for (const lx of [-1.3, 0.4, 2.0]) { const lz = -0.7; pillars.push({ x: x + (lx * Math.cos(th) + lz * Math.sin(th)) * s, z: z + (-lx * Math.sin(th) + lz * Math.cos(th)) * s, r: 0.95 * s, h: 1.6 * s }); }
      }
      // 巨石 / 苔石：墙根散布（带碰撞）
      const MOSS = A().names('rock_moss_set_02');
      const nB = Math.round(R * 2.0);
      for (let i = 0; i < nB; i++) {
        const a = rand() * Math.PI * 2, r = Math.min(R * 0.9, wallR(a) - 0.5 - rand() * 0.9); const x = Math.sin(a) * r, z = -Math.cos(a) * r;
        if (inExit(x, z, 0.38)) continue;
        const k = rand(); let o, rad, h, s;
        if (k < 0.35) { s = 0.55 + rand() * 0.4; o = place(stal, rand() < 0.5 ? 'namaqualand_boulder_02' : 'namaqualand_boulder_05', x, -0.05, z, s, rand() * 6.28); rad = 0.55 * s; h = 0.7 * s; }
        else { s = 0.6 + rand() * 0.5; o = placePart(stal, 'rock_moss_set_02', MOSS[Math.floor(rand() * MOSS.length)], x, -0.06, z, s, rand() * 6.28); rad = 0.7 * s; h = 0.9 * s; }
        if (o) pillars.push({ x, z, r: rad, h });
      }
    } else {
      const M = B().M; const cg = new THREE.ConeGeometry(1, 1, 7, 3);
      for (let i = 0; i < Math.round(R * 2.2); i++) {
        const a = Math.random() * Math.PI * 2; const r = R * (0.8 + Math.random() * 0.12); const x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (inExit(x, z, 0.35)) continue;
        const h = 0.3 + Math.random() * 1.2; const m = new THREE.Mesh(cg, M.stone); m.scale.set(0.12 + h * 0.15, h, 0.12 + h * 0.15); m.position.set(x, h / 2 - 0.05, z); stal.add(m);
        pillars.push({ x, z, r: 0.12 + h * 0.15, h });
      }
    }
    // 出口隧道与天光
    const exitZ = -R * 1.05;
    const tunnel = new THREE.Group(); tunnel.position.set(0, 0, exitZ); g.add(tunnel);
    const tg = new THREE.CylinderGeometry(1.5, 1.5, 6, 32, 12, true, Math.PI / 2, Math.PI); tg.rotateX(Math.PI / 2); tg.rotateZ(Math.PI);
    { const p = tg.attributes.position; for (let i = 0; i < p.count; i++) { const n = fbm(p.getX(i) * 2, p.getY(i) * 2, p.getZ(i) * 2); p.setXYZ(i, p.getX(i) * (0.85 + n * 0.3), Math.max(0, p.getY(i) * (0.9 + n * 0.3) + 0.2), p.getZ(i)); } tg.computeVertexNormals(); }
    const tunMat = useA ? A().triplanar(A().tex('dark_rock'), { scale: 0.3, side: THREE.DoubleSide, normal: 1.6, env: 0.3, color: '#cfc0b0' }) : new THREE.MeshStandardMaterial({ map: rockTex, side: THREE.DoubleSide, roughness: 1, color: '#9a8a7a' });
    const tm = new THREE.Mesh(tg, tunMat); tm.position.z = -2.6; tunnel.add(tm);
    const sky = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 3.0, 2.6), fog: false })); sky.position.set(0, 1.1, -5.4); tunnel.add(sky);
    const shaft = new THREE.Mesh(new THREE.ConeGeometry(1.8, 6, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#fff4d8', transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    shaft.rotation.x = -Math.PI / 2; shaft.position.set(0, 1.1, -2.2); shaft.userData.noShadow = true; if (!useA) tunnel.add(shaft);
    if (useA) { const gate = place(tunnel, 'large_iron_gate', 0, 0, -0.6, 0.78, 0); if (gate) gate.traverse(o => { if (o.isMesh) o.castShadow = false; });
      for (const sx of [-1, 1]) { place(tunnel, 'Lantern_01', sx * 1.25, 0, 0.75, 2.2, sx * 0.6); const pl = new THREE.PointLight('#ffa850', 1.3, 5.5, 2); pl.position.set(sx * 1.25, 0.45, 0.85); tunnel.add(pl);
        const hs = new THREE.Sprite(new THREE.SpriteMaterial({ color: new THREE.Color(1.8, 1.0, 0.5), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false, map: flameGlowTex() })); hs.position.set(sx * 1.25, 0.24, 0.75); hs.scale.set(0.35, 0.35, 1); tunnel.add(hs); } }
    const sign = makeSign('⟵ 出洞狩猎 [E]'); sign.position.set(0, 2.55, 0.6); tunnel.add(sign);
    // 中央篝火
    const fire = new THREE.Group(); g.add(fire); fire.position.set(0, 0, 0);
    let flames = [];
    if (useA) {
      place(fire, 'stone_fire_pit', 0, 0.16, 0, 0.85, 0.4);
      flames = flameSprites(fire);
    } else {
      const M = B().M;
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; fire.add(B().rock(0.14, M.stone, Math.cos(a) * 0.45, 0.06, Math.sin(a) * 0.45)); }
      for (let i = 0; i < 5; i++) { const f = B().flame((Math.random() - 0.5) * 0.2, 0.1, (Math.random() - 0.5) * 0.2, 2.2 + Math.random() * 1.2); fire.add(f); flames.push(f); }
    }
    // 地精商人
    const merchant = new THREE.Group(); const ma = Math.PI * 0.62; merchant.position.set(Math.sin(ma) * (R - 1.6), 0, -Math.cos(ma) * (R - 1.6)); merchant.rotation.y = -ma + Math.PI; g.add(merchant);
    {
      const stall = new THREE.Group(); merchant.add(stall);
      if (useA) {
        place(stall, 'WoodenTable_01', 0, 0, 0.42, 0.9, 0);
        place(stall, 'treasure_chest', 0.25, 0.495, 0.42, 0.55, -0.2);
        place(stall, 'Lantern_01', -0.55, 0.495, 0.5, 1.6, 0.5);
        place(stall, 'wine_barrel_01', 1.1, 0, 0.2, 0.9, 1.1);
        place(stall, 'wooden_crate_01', -1.05, 0, 0.25, 1, 0.3); place(stall, 'wooden_crate_01', -1.02, 0.34, 0.22, 1, -0.2);
        const lg = new THREE.PointLight('#ffb060', 0.9, 3.2, 2); lg.position.set(-0.55, 0.72, 0.55); stall.add(lg);
      } else {
        stall.add(B().box(1.6, 0.8, 0.6, B().M.wood, 0, 0.4, 0.4));
      }
      const skin = B().std('#6a9a3a', { roughness: 0.7 });
      const body = B().mesh(new THREE.CapsuleGeometry(0.22, 0.35, 6, 12), B().std('#5a3a6a'), 0, 0.95, -0.05); stall.add(body);
      const head = B().mesh(new THREE.SphereGeometry(0.2, 16, 12), skin, 0, 1.45, -0.02); head.scale.set(1.1, 0.95, 1); stall.add(head);
      for (const s of [-1, 1]) { const e = B().mesh(new THREE.ConeGeometry(0.06, 0.32, 6), skin, s * 0.26, 1.5, -0.02); e.rotation.z = -s * 1.2; stall.add(e); stall.add(B().mesh(new THREE.SphereGeometry(0.035, 8, 6), B().glowMat('#ffe040', 1.6), s * 0.075, 1.48, 0.16)); }
      const nose = B().mesh(new THREE.ConeGeometry(0.04, 0.14, 6), skin, 0, 1.42, 0.2); nose.rotation.x = Math.PI / 2; stall.add(nose);
      const sg = makeSign('地精行商·斯尼克 [E]'); sg.position.set(0, 2.1, 0.5); merchant.add(sg);
    }
    if (window.Mods && Mods.on('cave_detail')) scatterSmallProps(stal, R, floorAt, rand, merchant.position);
    scene.add(g);
    const FR = 25;
    function update(now) {
      for (const f of flames) {
        const d = f.userData.fl;
        if (!d) { continue; }
        const fr = Math.floor(now * d.sp + d.ph) % FR; f.material.map.offset.set((fr % 5) * 0.2, 1 - (Math.floor(fr / 5) + 1) * 0.2);
        const k = 1 + Math.sin(now * 7 + d.ph) * 0.07 + Math.sin(now * 19 + d.ph * 2) * 0.04; f.scale.set(d.sc * 0.72 * (2 - k), d.sc * k, 1);
      }
    }
    return { group: g, R, H, exitPos: new THREE.Vector3(0, 0, exitZ + 0.3), merchantPos: merchant.position.clone(), flames, firePos: new THREE.Vector3(0, 0.4, 0), sky, floorAt, pillars, update: useA ? update : null };
  }

  function makeSign(text) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 96; const g = c.getContext('2d');
    g.fillStyle = 'rgba(20,12,8,0.75)'; g.beginPath(); g.roundRect ? g.roundRect(4, 4, 504, 88, 18) : g.rect(4, 4, 504, 88); g.fill();
    g.strokeStyle = '#c89a4a'; g.lineWidth = 4; g.stroke();
    g.fillStyle = '#ffd890'; g.font = 'bold 44px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 50);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false })); s.scale.set(1.6, 0.3, 1); return s;
  }

  function dispose(cave) {
    if (!cave) return;
    cave.group.parent && cave.group.parent.remove(cave.group);
    cave.group.traverse(o => { if (o.isInstancedMesh && o.dispose) o.dispose(); if (o.isMesh && o.geometry && !o.geometry.__shared) o.geometry.dispose(); });
  }
  return { build, dispose, fbm };
})();
