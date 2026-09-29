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

  function build(scene, R, depth) {
    textures();
    const g = new THREE.Group(); g.name = 'cave';
    const H = 3.6 + R * 0.28;
    // 地面
    // 第十二轮修复：原 CircleGeometry 只有圆心+外圈顶点，外圈抬高后整个地面变成缓坡锥面（离中心越远越高，头"陷进地里"）。
    // 改为带径向分环的 RingGeometry：中间严格平坦，只有墙根处起伏；并导出 floorAt 供物理使用。
    const floorAt = (x, z) => { const d = Math.hypot(x, z) / R; return d > 0.85 ? (d - 0.85) * 2.5 * fbm(x * 0.5, 0, z * 0.5) : 0; };
    const fg = new THREE.RingGeometry(0.001, R + 0.8, 96, Math.max(24, Math.round((R + 0.8) * 5))); fg.rotateX(-Math.PI / 2);
    { const p = fg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, floorAt(x, z)); } fg.computeVertexNormals();
      const uv = fg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 3, p.getZ(i) / 3); }
    const floor = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95, color: '#b8a898' })); floor.receiveShadow = true; g.add(floor);
    // 穹顶岩壁
    const dg = new THREE.SphereGeometry(1, 96, 40, 0, Math.PI * 2, 0, Math.PI * 0.62);
    { const p = dg.attributes.position; const col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const n = fbm(x * 3 + 10, y * 3, z * 3 + 5);
        const k = 0.82 + n * 0.36;
        let X = x * R * k, Z = z * R * k, Y = y * H * (0.85 + n * 0.3);
        if (y < 0) { Y = y * 2.2; } // 裙边插入地下
        // 出口：在 -Z 方向开一道口
        const ang = Math.atan2(x, -z);
        if (Math.abs(ang) < 0.16 && Y < 2.6) { X *= 1.6; Z *= 1.6; }
        p.setXYZ(i, X, Math.max(-1, Y), Z);
        const c = 0.55 + n * 0.5; col[i * 3] = c * 1.0; col[i * 3 + 1] = c * 0.92; col[i * 3 + 2] = c * 0.82;
      }
      dg.setAttribute('color', new THREE.BufferAttribute(col, 3)); dg.computeVertexNormals();
      const uv = dg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * R * 1.2, uv.getY(i) * H / 2); }
    const wall = new THREE.Mesh(dg, new THREE.MeshStandardMaterial({ map: rockTex, vertexColors: true, roughness: 0.95, side: THREE.BackSide, color: '#c8b8a8' })); wall.receiveShadow = true; g.add(wall);
    // 钟乳石 / 石笋
    const M = B().M;
    const stal = new THREE.Group(); g.add(stal);
    const nStal = Math.round(R * R * 0.35); const pillars = []; // 地面石笋/岩石：简单圆柱碰撞
    const cg = new THREE.ConeGeometry(1, 1, 7, 3);
    for (let i = 0; i < nStal; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R * 0.85; const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(Math.atan2(x, -z)) < 0.3 && r > R * 0.5) continue;
      const h = 0.3 + Math.random() * 1.4 * (1 - r / R * 0.5);
      const m = new THREE.Mesh(cg, M.stone); m.scale.set(0.08 + h * 0.12, h, 0.08 + h * 0.12);
      const ceilY = H * (0.85 + 0.15) * Math.sqrt(Math.max(0, 1 - (r / R) ** 2)) * 0.95;
      m.position.set(x, ceilY - h / 2 + 0.2, z); m.rotation.x = Math.PI; stal.add(m);
    }
    for (let i = 0; i < Math.round(R * 2.2); i++) {
      const a = Math.random() * Math.PI * 2; const r = R * (0.8 + Math.random() * 0.12); const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(Math.atan2(x, -z)) < 0.35) continue;
      const h = 0.3 + Math.random() * 1.2; const m = new THREE.Mesh(cg, M.stone); m.scale.set(0.12 + h * 0.15, h, 0.12 + h * 0.15); m.position.set(x, h / 2 - 0.05, z); stal.add(m);
      pillars.push({ x, z, r: 0.12 + h * 0.15, h });
      if (Math.random() < 0.5) { const rs = 0.2 + Math.random() * 0.35, rx = x + (Math.random() - 0.5) * 0.8, rz = z + (Math.random() - 0.5) * 0.8; const rr = B().rock(rs, M.stone, rx, 0.05, rz); stal.add(rr); pillars.push({ x: rx, z: rz, r: rs * 0.9, h: rs }); }
    }
    // 出口隧道与天光
    const exitZ = -R * 1.05;
    const tunnel = new THREE.Group(); tunnel.position.set(0, 0, exitZ); g.add(tunnel);
    const tg = new THREE.CylinderGeometry(1.5, 1.5, 6, 20, 6, true, Math.PI / 2, Math.PI); tg.rotateX(Math.PI / 2); tg.rotateZ(Math.PI);
    { const p = tg.attributes.position; for (let i = 0; i < p.count; i++) { const n = fbm(p.getX(i) * 2, p.getY(i) * 2, p.getZ(i) * 2); p.setXYZ(i, p.getX(i) * (0.85 + n * 0.3), Math.max(0, p.getY(i) * (0.9 + n * 0.3) + 0.2), p.getZ(i)); } tg.computeVertexNormals(); }
    const tm = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ map: rockTex, side: THREE.DoubleSide, roughness: 1, color: '#9a8a7a' })); tm.position.z = -2.6; tunnel.add(tm);
    const sky = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.1, 1.8) })); sky.position.set(0, 1.1, -5.4); tunnel.add(sky);
    const shaft = new THREE.Mesh(new THREE.ConeGeometry(1.8, 6, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#fff4d8', transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    shaft.rotation.x = -Math.PI / 2; shaft.position.set(0, 1.1, -2.2); tunnel.add(shaft);
    const sign = makeSign('⟵ 出洞狩猎 [E]'); sign.position.set(0, 2.3, 0.6); tunnel.add(sign);
    // 中央篝火
    const fire = new THREE.Group(); g.add(fire); fire.position.set(0, 0, 0);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; fire.add(B().rock(0.14, M.stone, Math.cos(a) * 0.45, 0.06, Math.sin(a) * 0.45)); }
    for (let i = 0; i < 5; i++) { const l = B().cyl(0.04, 0.05, 0.7, M.wood, 0, 0.12, 0, 6); l.rotation.set(Math.PI / 2 - 0.4, i * 1.26, 0); l.position.set(Math.cos(i * 1.26) * 0.12, 0.15, Math.sin(i * 1.26) * 0.12); fire.add(l); }
    const flames = []; for (let i = 0; i < 5; i++) { const f = B().flame((Math.random() - 0.5) * 0.2, 0.1, (Math.random() - 0.5) * 0.2, 2.2 + Math.random() * 1.2); fire.add(f); flames.push(f); }
    const spit = B().cyl(0.015, 0.015, 1.4, M.iron, 0, 0.9, 0, 4); spit.rotation.z = Math.PI / 2; fire.add(spit); for (const s of [-1, 1]) { const st = B().cyl(0.02, 0.02, 0.95, M.iron, s * 0.62, 0.47, 0, 4); fire.add(st); }
    // 地精商人
    const merchant = new THREE.Group(); const ma = Math.PI * 0.62; merchant.position.set(Math.sin(ma) * (R - 1.6), 0, -Math.cos(ma) * (R - 1.6)); merchant.rotation.y = -ma + Math.PI; g.add(merchant);
    {
      const stall = new THREE.Group(); merchant.add(stall);
      stall.add(B().box(1.6, 0.8, 0.6, M.wood, 0, 0.4, 0.4)); for (const s of [-1, 1]) stall.add(B().cyl(0.04, 0.04, 2.0, M.wood, s * 0.78, 1.0, 0.65, 6));
      const roof = B().box(1.8, 0.05, 1.0, B().M.cloth, 0, 2.0, 0.35); roof.rotation.x = 0.2; stall.add(roof);
      const skin = B().std('#6a9a3a', { roughness: 0.7 });
      const body = B().mesh(new THREE.CapsuleGeometry(0.22, 0.35, 6, 12), B().std('#5a3a6a'), 0, 0.95, -0.05); stall.add(body);
      const head = B().mesh(new THREE.SphereGeometry(0.2, 16, 12), skin, 0, 1.45, -0.02); head.scale.set(1.1, 0.95, 1); stall.add(head);
      for (const s of [-1, 1]) { const e = B().mesh(new THREE.ConeGeometry(0.06, 0.32, 6), skin, s * 0.26, 1.5, -0.02); e.rotation.z = -s * 1.2; stall.add(e); stall.add(B().mesh(new THREE.SphereGeometry(0.035, 8, 6), B().glowMat('#ffe040', 1.6), s * 0.075, 1.48, 0.16)); }
      const nose = B().mesh(new THREE.ConeGeometry(0.04, 0.14, 6), skin, 0, 1.42, 0.2); nose.rotation.x = Math.PI / 2; stall.add(nose);
      const lantern = B().mesh(new THREE.SphereGeometry(0.09, 10, 8), B().glowMat('#ffb050', 2), 0.6, 1.7, 0.65); stall.add(lantern);
      for (let i = 0; i < 5; i++) stall.add(B().mesh(new THREE.OctahedronGeometry(0.06), new THREE.MeshStandardMaterial({ color: '#b06aff', emissive: '#6a2aaa' }), -0.6 + i * 0.25, 0.86, 0.45));
      const sg = makeSign('地精行商·斯尼克 [E]'); sg.position.set(0, 2.35, 0.5); merchant.add(sg);
    }
    scene.add(g);
    return { group: g, R, H, exitPos: new THREE.Vector3(0, 0, exitZ + 0.3), merchantPos: merchant.position.clone(), flames, firePos: new THREE.Vector3(0, 0.4, 0), sky, floorAt, pillars };
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
    cave.group.traverse(o => { if (o.isMesh && o.geometry && !o.geometry.__shared) o.geometry.dispose(); });
  }
  return { build, dispose, fbm };
})();
