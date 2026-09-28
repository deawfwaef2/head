// 洞穴建造目录：功能 / 训练 / 装饰。所有装饰都提供属性加成（提升战力）。模型全部程序化。
window.BuildCat = (() => {
  const canvasTex = (w, h, fn, srgb = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  const noiseTex = (base, spots, n = 1400, size = 256) => canvasTex(size, size, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { g.fillStyle = spots[Math.floor(Math.random() * spots.length)]; g.globalAlpha = 0.08 + Math.random() * 0.25; const r = 1 + Math.random() * 5; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, r, 0, 6.283); g.fill(); } g.globalAlpha = 1; });
  const woodTex = canvasTex(512, 128, (g) => { g.fillStyle = '#5a3a22'; g.fillRect(0, 0, 512, 128); for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(${30 + Math.random() * 30},${15 + Math.random() * 15},5,${0.2 + Math.random() * 0.3})`; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); const y = Math.random() * 128; g.moveTo(0, y); for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 3); g.stroke(); } });
  const std = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.8 }, o));
  const M = {
    stone: std('#8a8378', { map: noiseTex('#8a8378', ['#5a544c', '#a8a298', '#6a645a']), roughness: 0.95 }),
    dark: std('#3a3530', { map: noiseTex('#3a3530', ['#22201c', '#4a453e']), roughness: 0.95 }),
    bone: std('#e6dcc4', { roughness: 0.6 }),
    wood: std('#6a4a2a', { map: woodTex, roughness: 0.8 }),
    iron: std('#4a4a50', { metalness: 0.8, roughness: 0.45 }),
    rust: std('#6a3a24', { metalness: 0.5, roughness: 0.7 }),
    fur: std('#6a4a32', { map: noiseTex('#6a4a32', ['#3a2a1a', '#8a6a4a', '#4a3222'], 3000), roughness: 1 }),
    gold: std('#e0b040', { metalness: 1, roughness: 0.3 }),
    blood: std('#5a0508', { roughness: 0.2, metalness: 0.1 }),
    cloth: std('#7a1a1a', { roughness: 0.9, side: THREE.DoubleSide })
  };
  const glowMat = (c, k = 2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) });
  const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
  const box = (w, h, d, mat, x = 0, y = 0, z = 0) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  const cyl = (rt, rb, h, mat, x = 0, y = 0, z = 0, s = 16) => mesh(new THREE.CylinderGeometry(rt, rb, h, s), mat, x, y, z);
  const rock = (r, mat, x = 0, y = 0, z = 0, det = 1) => { const g = new THREE.IcosahedronGeometry(r, det); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.75 + Math.random() * 0.4; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } g.computeVertexNormals(); return mesh(g, mat, x, y, z); };
  const skull = (s = 1, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); const c = mesh(new THREE.SphereGeometry(0.09 * s, 12, 10), M.bone, 0, 0, 0); c.scale.set(1, 0.95, 1.1); g.add(c); const j = box(0.1 * s, 0.05 * s, 0.08 * s, M.bone, 0, -0.07 * s, 0.03 * s); g.add(j); for (const sx of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.022 * s, 8, 6), std('#111'), sx * 0.035 * s, -0.005 * s, 0.085 * s)); g.position.set(x, y, z); return g; };
  const flameMats = {};
  const fMat = (col, op) => { const k = col + op; if (!flameMats[k]) flameMats[k] = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: THREE.NormalBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }); return flameMats[k]; };
  const flame = (x, y, z, s = 1, col = '#ff9a3a') => {
    const g = new THREE.Group();
    const c = new THREE.Color(col);
    const f = mesh(new THREE.ConeGeometry(0.055 * s, 0.2 * s, 10, 1, true), fMat(col, 0.32), 0, 0.1 * s, 0); g.add(f);
    const f2 = mesh(new THREE.ConeGeometry(0.028 * s, 0.13 * s, 8, 1, true), fMat('#' + c.clone().lerp(new THREE.Color('#ffd06a'), 0.42).getHexString(), 0.34), 0, 0.065 * s, 0); g.add(f2);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW(), color: c.clone().multiplyScalar(0.65), transparent: true, opacity: 0.11, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    sp.scale.setScalar(0.22 * s); sp.position.y = 0.07 * s; g.add(sp);
    g.position.set(x, y, z); g.userData.flame = true; return g;
  };

  const TABLE = { w: 1.5, d: 0.85, h: 0.78 };
  const C = {};
  // ============ 功能 ============
  C.table = { cat: 'func', n: '石板祭桌', icon: '🪨', base: 60, grow: 1.45, fp: [0.75, 0.43], stat: { ter: 1 }, desc: '把玩桌上任一首级 → 桌上所有首级共鸣连锁产出',
    make() { const g = new THREE.Group(); g.add(box(TABLE.w, 0.1, TABLE.d, M.stone, 0, TABLE.h - 0.05, 0));
      const edge = box(TABLE.w + 0.01, 0.015, TABLE.d + 0.01, new THREE.MeshBasicMaterial({ color: '#ff4a3a', transparent: true, opacity: 0.0 }), 0, TABLE.h - 0.1, 0); g.add(edge); g.userData.edge = edge;
      for (const sx of [-1, 1]) g.add(box(0.22, TABLE.h - 0.1, TABLE.d * 0.8, M.dark, sx * (TABLE.w / 2 - 0.2), (TABLE.h - 0.1) / 2, 0));
      const stain = mesh(new THREE.CircleGeometry(0.2, 16), M.blood, 0.2, TABLE.h + 0.002, 0.1); stain.rotation.x = -Math.PI / 2; stain.scale.set(1.4, 0.7, 1); g.add(stain);
      return g; },
    cols: (hx, hz) => [[-hx, TABLE.h - 0.1, -hz, hx, TABLE.h, hz], [-hx, 0, -hz * 0.8, -hx + 0.22, TABLE.h, hz * 0.8], [hx - 0.22, 0, -hz * 0.8, hx, TABLE.h, hz * 0.8]], surface: TABLE.h };
  C.pole = { cat: 'func', n: '首级枪桩', icon: '🔱', base: 50, grow: 1.4, fp: [0.22, 0.22], stat: { ter: 1 }, desc: '插一颗首级，每 10 秒自动渗出魂晶', mount: { y: 1.45, period: 10, mult: 1 },
    make() { const g = new THREE.Group(); g.add(rock(0.24, M.stone, 0, 0.08, 0)); g.add(cyl(0.022, 0.03, 1.45, M.wood, 0, 0.72, 0, 8)); const tip = mesh(new THREE.ConeGeometry(0.028, 0.14, 6), M.iron, 0, 1.5, 0); g.add(tip);
      const drip = cyl(0.012, 0.02, 0.4, M.blood, 0.015, 1.25, 0, 6); g.add(drip); return g; },
    cols: () => [[-0.2, 0, -0.2, 0.2, 0.18, 0.2], [-0.03, 0, -0.03, 0.03, 1.45, 0.03]] };
  C.shrine = { cat: 'func', n: '骨龛', icon: '💀', base: 400, grow: 1.5, fp: [0.32, 0.32], stat: { soul: 2 }, desc: '骸骨垒成的神龛：每 20 秒触发 ×4 产出', mount: { y: 1.12, period: 20, mult: 4 }, depth: 2,
    make() { const g = new THREE.Group(); g.add(rock(0.35, M.dark, 0, 0.15, 0));
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.add(skull(0.9, Math.cos(a) * 0.2, 0.35 + (i % 2) * 0.15, Math.sin(a) * 0.2)); }
      g.add(cyl(0.16, 0.22, 0.6, M.bone, 0, 0.7, 0, 10)); g.add(cyl(0.22, 0.2, 0.08, M.bone, 0, 1.04, 0, 10));
      for (const s of [-1, 1]) g.add(flame(s * 0.18, 1.08, 0, 0.8, '#7aff9a'));
      return g; },
    cols: () => [[-0.3, 0, -0.3, 0.3, 1.08, 0.3]] };

  // ---- 多插槽展示位（插满 / 同族 / 同阶 → 共鸣加成）----
  const ring = (n, r, y, yawFn) => Array.from({ length: n }, (_, k) => { const a = k / n * Math.PI * 2 + Math.PI / n; return [Math.cos(a) * r, y, Math.sin(a) * r, yawFn(a)]; });
  C.headrack = { cat: 'func', n: '首级架', icon: '🪵', base: 800, grow: 1.55, fp: [0.75, 0.22], stat: { ter: 2 }, desc: '横梁上三根尖桩，可插 3 颗首级；每 12 秒 ×1.2 产出。插满或同族/同阶会共鸣', depth: 2,
    mount: { y: 1.3, period: 12, mult: 1.2, slots: [[-0.42, 1.3, 0], [0, 1.3, 0], [0.42, 1.3, 0]] },
    make() { const g = new THREE.Group();
      for (const s of [-1, 1]) { g.add(rock(0.16, M.stone, s * 0.62, 0.05, 0)); g.add(cyl(0.035, 0.045, 1.2, M.wood, s * 0.62, 0.6, 0, 8)); }
      const bar = box(1.38, 0.08, 0.08, M.wood, 0, 1.12, 0); g.add(bar);
      for (const s of [-1, 1]) { const r = box(0.5, 0.035, 0.035, M.rust, s * 0.45, 1.02, 0); r.rotation.z = s * 0.6; g.add(r); }
      for (const x of [-0.42, 0, 0.42]) { g.add(cyl(0.012, 0.02, 0.2, M.iron, x, 1.22, 0, 6)); g.add(mesh(new THREE.ConeGeometry(0.02, 0.08, 6), M.iron, x, 1.34, 0)); g.add(cyl(0.008, 0.014, 0.22 + Math.random() * 0.2, M.blood, x + 0.012, 1.0, 0.03, 5)); }
      const st = mesh(new THREE.CircleGeometry(0.35, 16), M.blood, 0, 0.004, 0.05); st.rotation.x = -Math.PI / 2; st.scale.set(1.6, 0.6, 1); g.add(st);
      return g; },
    cols: () => [[-0.68, 0, -0.06, -0.56, 1.16, 0.06], [0.56, 0, -0.06, 0.68, 1.16, 0.06], [-0.7, 1.08, -0.05, 0.7, 1.16, 0.05]] };
  C.lampost = { cat: 'func', n: '万首灯柱', icon: '🏮', base: 4500, grow: 1.6, fp: [0.5, 0.5], stat: { soul: 3, ter: 2 }, desc: '骨柱上的铁环挑着 4 根尖刺，首级朝外示众；每 15 秒 ×1.8 产出，可共鸣', depth: 3,
    mount: { y: 1.45, period: 15, mult: 1.8, labelY: 2.1, slots: ring(4, 0.42, 1.45, a => Math.atan2(Math.cos(a), Math.sin(a))) },
    make() { const g = new THREE.Group(); g.add(rock(0.34, M.dark, 0, 0.1, 0));
      g.add(cyl(0.07, 0.1, 2.2, M.bone, 0, 1.1, 0, 10));
      for (let i = 0; i < 6; i++) g.add(skull(0.7, Math.cos(i) * 0.1, 0.35 + i * 0.3, Math.sin(i) * 0.1));
      const rg = mesh(new THREE.TorusGeometry(0.42, 0.018, 6, 32), M.iron, 0, 1.3, 0); rg.rotation.x = Math.PI / 2; g.add(rg);
      for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + Math.PI / 4; const x = Math.cos(a) * 0.42, z = Math.sin(a) * 0.42;
        const arm = box(0.42, 0.025, 0.025, M.iron, x / 2, 1.3, z / 2); arm.rotation.y = -a; g.add(arm);
        g.add(cyl(0.01, 0.016, 0.16, M.iron, x, 1.38, z, 6)); g.add(mesh(new THREE.ConeGeometry(0.016, 0.07, 6), M.iron, x, 1.48, z)); }
      g.add(cyl(0.12, 0.08, 0.1, M.iron, 0, 2.22, 0, 10)); g.add(flame(0, 2.27, 0, 1.6, '#7aff9a'));
      return g; },
    cols: () => [[-0.3, 0, -0.3, 0.3, 0.2, 0.3], [-0.1, 0, -0.1, 0.1, 2.3, 0.1]] };
  C.bloodpool = { cat: 'func', n: '血池祭坛', icon: '🩸', base: 20000, grow: 1.7, fp: [0.95, 0.95], stat: { soul: 5, ter: 4 }, desc: '五根骨刺环绕血池，首级朝内俯视；每 24 秒 ×4 产出，同族五首共鸣极强', depth: 4,
    mount: { y: 1.0, period: 24, mult: 4, labelY: 1.5, slots: ring(5, 0.78, 1.0, a => Math.atan2(-Math.cos(a), -Math.sin(a))) },
    make() { const g = new THREE.Group();
      const rim = mesh(new THREE.TorusGeometry(0.5, 0.09, 8, 28), M.dark, 0, 0.06, 0); rim.rotation.x = Math.PI / 2; g.add(rim);
      const pool = mesh(new THREE.CircleGeometry(0.5, 28), std('#5a0508', { roughness: 0.08, metalness: 0.2, emissive: '#2a0002' }), 0, 0.08, 0); pool.rotation.x = -Math.PI / 2; g.add(pool);
      const orb = mesh(new THREE.IcosahedronGeometry(0.09, 1), glowMat('#ff2a3a', 1.6), 0, 0.55, 0); g.add(orb); g.userData.orb = orb;
      for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + Math.PI / 5; const x = Math.cos(a) * 0.78, z = Math.sin(a) * 0.78;
        g.add(rock(0.13, M.stone, x, 0.04, z)); const sp = mesh(new THREE.ConeGeometry(0.05, 1.05, 7), M.bone, x, 0.52, z); g.add(sp);
        g.add(cyl(0.008, 0.014, 0.35, M.blood, x + 0.02, 0.8, z, 5)); }
      for (const s of [0, 2]) g.add(flame(Math.cos(s) * 0.3, 0.1, Math.sin(s) * 0.3, 0.7, '#ff4a3a'));
      return g; },
    cols: () => ring(5, 0.78, 0, a => 0).map(([x, , z]) => [x - 0.06, 0, z - 0.06, x + 0.06, 1.0, z + 0.06]) };
  C.seance = { cat: 'func', n: '通灵台', icon: '🔮', base: 260, grow: 1.7, fp: [0.42, 0.42], stat: { soul: 2 }, desc: '放上一颗首级，对准按 E 通灵：观看她生前的记忆，再决定安抚还是榨取（Shift+E 取下）。每 30 秒 ×2 产出', mount: { y: 1.1, period: 30, mult: 2, labelY: 1.7 }, seance: true,
    make() { const g = new THREE.Group();
      g.add(cyl(0.36, 0.42, 0.14, M.dark, 0, 0.07, 0, 20)); g.add(cyl(0.12, 0.2, 0.8, M.stone, 0, 0.54, 0, 10)); g.add(cyl(0.26, 0.14, 0.12, M.stone, 0, 1.0, 0, 16));
      const bowl = mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 28), M.gold, 0, 1.06, 0); bowl.rotation.x = Math.PI / 2; g.add(bowl);
      const runeC = mesh(new THREE.RingGeometry(0.55, 0.6, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color('#b06aff').multiplyScalar(1.4), transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }), 0, 0.012, 0); runeC.rotation.x = -Math.PI / 2; g.add(runeC);
      const float = new THREE.Group(); float.position.y = 1.1; g.add(float);
      const halo = mesh(new THREE.TorusGeometry(0.3, 0.008, 6, 48), glowMat('#a060ff', 1.1), 0, 0.02, 0); halo.rotation.x = Math.PI / 2; float.add(halo);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const rn = box(0.05, 0.07, 0.006, glowMat(i % 2 ? '#4a9aff' : '#a04aff', 1.0), Math.cos(a) * 0.3, 0.06, Math.sin(a) * 0.3); rn.rotation.y = -a + Math.PI / 2; float.add(rn); }
      for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + 0.5; const w = mesh(new THREE.SphereGeometry(0.022, 8, 6), glowMat('#c090ff', 1.2), Math.cos(a) * 0.42, 0.25 + i * 0.07, Math.sin(a) * 0.42); float.add(w); }
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; g.add(cyl(0.025, 0.028, 0.16, M.bone, Math.cos(a) * 0.5, 0.08, Math.sin(a) * 0.5, 8)); g.add(flame(Math.cos(a) * 0.5, 0.16, Math.sin(a) * 0.5, 0.55, '#b07aff')); }
      g.userData.float = float; return g; },
    cols: () => [[-0.36, 0, -0.36, 0.36, 0.14, 0.36], [-0.2, 0, -0.2, 0.2, 1.06, 0.2]] };
  C.showcase = { cat: 'func', n: '展示柜', icon: '🏆', base: 180, grow: 1.55, fp: [0.36, 0.36], stat: { soul: 1 }, desc: '旋转天鹅绒展台 + 铭牌 + 聚光：展出的首级展厅分 ×1.6，每 12 秒 ×1.5 产出', mount: { y: 1.1, period: 12, mult: 1.5, labelY: 1.75 }, showcase: true,
    make() { const g = new THREE.Group();
      g.add(box(0.56, 0.86, 0.56, M.dark, 0, 0.43, 0)); g.add(box(0.62, 0.05, 0.62, M.gold, 0, 0.885, 0)); g.add(box(0.62, 0.05, 0.62, M.gold, 0, 0.025, 0));
      const turn = new THREE.Group(); turn.position.y = 0.92; g.add(turn);
      turn.add(cyl(0.24, 0.25, 0.04, M.gold, 0, 0.0, 0, 28)); turn.add(cyl(0.22, 0.22, 0.03, std('#6a0a1a', { roughness: 0.95 }), 0, 0.03, 0, 28));
      for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.add(cyl(0.012, 0.012, 1.0, M.gold, x * 0.29, 1.4, z * 0.29, 6));
      g.add(box(0.62, 0.03, 0.62, M.gold, 0, 1.9, 0));
      const cone = mesh(new THREE.ConeGeometry(0.34, 0.95, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#fff2c8', transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), 0, 1.4, 0); cone.raycast = () => {}; g.add(cone);
      const lamp = mesh(new THREE.SphereGeometry(0.035, 10, 8), glowMat('#fff2c8', 2.2), 0, 1.87, 0); g.add(lamp);
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96; const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
      const plaque = mesh(new THREE.PlaneGeometry(0.44, 0.165), new THREE.MeshBasicMaterial({ map: tex }), 0, 0.62, 0.282); g.add(plaque);
      g.userData.turn = turn; g.userData.plaque = { cv, tex, id: -1 }; return g; },
    cols: () => [[-0.3, 0, -0.3, 0.3, 0.92, 0.3]] };
  C.bounty = { cat: 'func', n: '悬赏榜', icon: '📜', base: 150, grow: 2, max: 1, fp: [0.7, 0.2], stat: { ter: 1 }, desc: '赏金猎人的委托：交出符合条件的首级换取大量魂晶与声望（每 3 声望 = 远征幸运 +1）。对着它按 E 查看，拿着首级按 E 交付',  bounty: true,
    make() { const g = new THREE.Group();
      for (const sx of [-1, 1]) g.add(cyl(0.035, 0.045, 1.9, M.wood, sx * 0.55, 0.95, 0, 8));
      g.add(box(1.1, 0.8, 0.05, M.wood, 0, 1.35, 0)); g.add(box(1.2, 0.06, 0.08, M.wood, 0, 1.78, 0));
      const pm = std('#e8d8b0', { roughness: 1, side: THREE.DoubleSide });
      for (let i = 0; i < 3; i++) { const p = box(0.28, 0.36, 0.005, pm, -0.34 + i * 0.34, 1.36 + (i % 2 ? -0.03 : 0.03), 0.03); p.rotation.z = (i - 1) * 0.06; g.add(p); g.add(mesh(new THREE.SphereGeometry(0.014, 6, 4), M.blood, -0.34 + i * 0.34, 1.52 + (i % 2 ? -0.03 : 0.03), 0.036)); }
      g.add(skull(0.8, 0, 1.9, 0.02)); return g; },
    cols: () => [[-0.6, 0, -0.06, 0.6, 1.8, 0.06]] };
  C.wheel = { cat: 'func', n: '魂轮', icon: '☸️', base: 900, grow: 1.5, fp: [0.62, 0.62], stat: { soul: 3 }, desc: '缓慢转动的刑轮，放上面的首级每 6 秒全部触发', radius: 0.58, surface: 0.14, period: 6, depth: 3,
    make() { const g = new THREE.Group(); g.add(cyl(0.64, 0.68, 0.08, M.dark, 0, 0.04, 0, 32)); const top = new THREE.Group(); top.position.y = 0.1; g.add(top);
      const disk = cyl(0.6, 0.6, 0.04, M.wood, 0, 0, 0, 40); top.add(disk);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const sp = box(0.04, 0.03, 0.55, M.iron, Math.cos(a) * 0.3, 0.035, Math.sin(a) * 0.3); sp.rotation.y = -a + Math.PI / 2; top.add(sp); }
      const ring = mesh(new THREE.TorusGeometry(0.6, 0.02, 6, 48), glowMat('#8a3aff', 1.6), 0, 0.03, 0); ring.rotation.x = Math.PI / 2; top.add(ring);
      g.userData.spin = top; return g; },
    cols: () => [[-0.6, 0, -0.6, 0.6, 0.12, 0.6]] };
  C.bell = { cat: 'func', n: '招魂铃', icon: '🔔', base: 600, grow: 1.55, fp: [0.3, 0.3], stat: { soul: 2 }, desc: '半径 2m 内首级产出 ×1.5（可叠加）', aura: 2.0, auraMul: 1.5, depth: 2,
    make() { const g = new THREE.Group(); g.add(cyl(0.04, 0.05, 1.6, M.wood, -0.25, 0.8, 0, 8)); g.add(cyl(0.04, 0.05, 1.6, M.wood, 0.25, 0.8, 0, 8)); g.add(box(0.6, 0.06, 0.08, M.wood, 0, 1.6, 0));
      const bell = mesh(new THREE.CylinderGeometry(0.08, 0.16, 0.24, 16, 1, true), M.gold, 0, 1.42, 0); bell.material = M.gold; g.add(bell); g.userData.bell = bell;
      g.add(rock(0.2, M.stone, -0.25, 0.05, 0)); g.add(rock(0.2, M.stone, 0.25, 0.05, 0)); return g; },
    cols: () => [[-0.3, 0, -0.08, 0.3, 1.65, 0.08]] };
  C.nest = { cat: 'func', n: '干草窝', icon: '🛏️', base: 120, grow: 1.6, fp: [0.9, 0.7], stat: { con: 1 }, regen: 1, desc: '睡觉的地方。生命恢复速度 +1%/10秒',
    make() { const g = new THREE.Group(); const hay = std('#b09040', { map: noiseTex('#b09040', ['#8a6a20', '#d0b060', '#6a5018'], 3000), roughness: 1 });
      const b = mesh(new THREE.SphereGeometry(0.8, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), hay, 0, 0, 0); b.scale.set(1.1, 0.3, 0.85); g.add(b);
      const dip = mesh(new THREE.CircleGeometry(0.55, 20), M.fur, 0, 0.2, 0); dip.rotation.x = -Math.PI / 2; dip.scale.set(1.2, 0.9, 1); g.add(dip); return g; },
    cols: () => [[-0.85, 0, -0.65, 0.85, 0.2, 0.65]], surface: 0.22 };
  C.spring = { cat: 'func', n: '疗伤血泉', icon: '♨️', base: 1500, grow: 1.7, fp: [0.8, 0.8], stat: { con: 3 }, regen: 3, desc: '冒着热气的血色温泉。生命恢复 +3%/10秒', depth: 3,
    make() { const g = new THREE.Group(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.add(rock(0.2, M.stone, Math.cos(a) * 0.72, 0.1, Math.sin(a) * 0.72)); }
      const w = mesh(new THREE.CircleGeometry(0.7, 32), new THREE.MeshStandardMaterial({ color: '#8a1020', emissive: '#4a0508', roughness: 0.05, metalness: 0.2 }), 0, 0.12, 0); w.rotation.x = -Math.PI / 2; g.add(w); g.userData.water = w; return g; },
    cols: () => [[-0.85, 0, -0.85, 0.85, 0.2, 0.85]] };
  // ============ 训练 ============
  const trainDesc = (s) => `按 E 开始训练：5 秒内疯狂点击，提升${s}。花费魂晶。建成本身也 +2 ${s}`;
  C.t_str = { cat: 'train', n: '巨石杠铃', icon: '🏋️', base: 80, grow: 1.8, fp: [0.9, 0.3], stat: { str: 2 }, train: 'str', desc: trainDesc('力量'), max: 1,
    make() { const g = new THREE.Group(); const bar = cyl(0.035, 0.035, 1.6, M.wood, 0, 0.35, 0, 8); bar.rotation.z = Math.PI / 2; g.add(bar); g.add(rock(0.32, M.stone, -0.75, 0.32, 0)); g.add(rock(0.32, M.stone, 0.75, 0.32, 0)); return g; },
    cols: () => [[-1.05, 0, -0.3, 1.05, 0.62, 0.3]] };
  C.t_agi = { cat: 'train', n: '木人桩', icon: '🪵', base: 80, grow: 1.8, fp: [0.35, 0.35], stat: { agi: 2 }, train: 'agi', desc: trainDesc('敏捷'), max: 1,
    make() { const g = new THREE.Group(); g.add(cyl(0.14, 0.16, 1.6, M.wood, 0, 0.8, 0, 12)); for (let i = 0; i < 3; i++) { const a = box(0.5, 0.06, 0.06, M.wood, 0, 0.7 + i * 0.3, 0); a.rotation.y = i * 1.2; g.add(a); } g.add(skull(1.1, 0, 1.7, 0)); return g; },
    cols: () => [[-0.18, 0, -0.18, 0.18, 1.7, 0.18]] };
  C.t_con = { cat: 'train', n: '血肉沙袋', icon: '🥩', base: 80, grow: 1.8, fp: [0.35, 0.35], stat: { con: 2 }, train: 'con', desc: trainDesc('体魄'), max: 1,
    make() { const g = new THREE.Group(); g.add(box(0.8, 0.08, 0.08, M.wood, 0, 2.1, 0)); g.add(cyl(0.03, 0.03, 2.1, M.wood, -0.38, 1.05, 0, 6)); const ch = cyl(0.008, 0.008, 0.4, M.iron, 0, 1.9, 0, 4); g.add(ch);
      const bag = mesh(new THREE.CapsuleGeometry(0.2, 0.55, 6, 12), std('#8a3a2a', { roughness: 0.6 }), 0, 1.3, 0); g.add(bag); g.userData.bag = bag; return g; },
    cols: () => [[-0.4, 0, -0.1, -0.35, 2.1, 0.1], [-0.2, 0.95, -0.2, 0.2, 1.65, 0.2]] };
  C.t_ter = { cat: 'train', n: '咆哮深坑', icon: '😤', base: 120, grow: 1.8, fp: [0.7, 0.7], stat: { ter: 2 }, train: 'ter', desc: trainDesc('凶威'), max: 1, depth: 2,
    make() { const g = new THREE.Group(); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; g.add(rock(0.18, M.dark, Math.cos(a) * 0.62, 0.08, Math.sin(a) * 0.62)); }
      const hole = mesh(new THREE.CircleGeometry(0.58, 24), new THREE.MeshBasicMaterial({ color: '#050303' }), 0, 0.02, 0); hole.rotation.x = -Math.PI / 2; g.add(hole);
      for (let i = 0; i < 5; i++) g.add(skull(0.8, (Math.random() - 0.5) * 0.7, 0.05, (Math.random() - 0.5) * 0.7)); return g; },
    cols: () => [] };
  C.t_soul = { cat: 'train', n: '冥想石环', icon: '🔮', base: 200, grow: 1.8, fp: [0.8, 0.8], stat: { soul: 2 }, train: 'soul', desc: trainDesc('魂力'), max: 1, depth: 2,
    make() { const g = new THREE.Group(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const s = box(0.2, 0.9 + Math.random() * 0.3, 0.14, M.stone, Math.cos(a) * 0.7, 0.5, Math.sin(a) * 0.7); s.rotation.y = -a; g.add(s); const rune = box(0.1, 0.1, 0.01, glowMat('#6affff', 1.8), Math.cos(a) * 0.62, 0.7, Math.sin(a) * 0.62); rune.rotation.y = -a + Math.PI / 2; g.add(rune); }
      const orb = mesh(new THREE.IcosahedronGeometry(0.12, 1), glowMat('#6affff', 1.5), 0, 1.1, 0); g.add(orb); g.userData.orb = orb; return g; },
    cols: () => [] };
  // ============ 装饰（全部加属性） ============
  const D = (k, o) => { C[k] = Object.assign({ cat: 'decor', grow: 1.25 }, o); };
  D('torch', { n: '墙边火把', icon: '🔥', base: 25, fp: [0.15, 0.15], stat: { ter: 1 }, light: '#ff8a3a', desc: '照亮洞窟。凶威 +1',
    make() { const g = new THREE.Group(); g.add(rock(0.14, M.stone, 0, 0.05, 0)); g.add(cyl(0.025, 0.035, 1.3, M.wood, 0, 0.65, 0, 6)); g.add(cyl(0.06, 0.04, 0.1, M.iron, 0, 1.32, 0, 8)); g.add(flame(0, 1.36, 0, 1.3)); return g; },
    cols: () => [[-0.04, 0, -0.04, 0.04, 1.4, 0.04]] });
  D('brazier', { n: '铁火盆', icon: '🏮', base: 90, fp: [0.3, 0.3], stat: { ter: 1, soul: 1 }, light: '#ff6a2a', desc: '熊熊燃烧的火盆。凶威 +1 魂力 +1',
    make() { const g = new THREE.Group(); for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const l = cyl(0.02, 0.02, 0.7, M.iron, Math.cos(a) * 0.15, 0.35, Math.sin(a) * 0.15, 6); l.rotation.z = Math.cos(a) * 0.2; l.rotation.x = -Math.sin(a) * 0.2; g.add(l); }
      g.add(mesh(new THREE.CylinderGeometry(0.28, 0.16, 0.18, 16, 1, true), M.iron, 0, 0.75, 0)); g.add(cyl(0.2, 0.2, 0.04, glowMat('#ff5a1a', 1.5), 0, 0.78, 0)); g.add(flame(0, 0.8, 0, 2.2)); g.add(flame(0.08, 0.8, 0.05, 1.5)); g.add(flame(-0.07, 0.8, -0.04, 1.6)); return g; },
    cols: () => [[-0.28, 0, -0.28, 0.28, 0.85, 0.28]] });
  D('skulls', { n: '骷髅堆', icon: '☠️', base: 70, fp: [0.45, 0.45], stat: { ter: 3 }, desc: '历代冒险者的遗骨。凶威 +3',
    make() { const g = new THREE.Group(); for (let i = 0; i < 22; i++) { const a = Math.random() * 6.28, r = Math.random() * 0.35 * (1 - i / 30); const s = skull(0.9 + Math.random() * 0.4, Math.cos(a) * r, 0.07 + i * 0.022, Math.sin(a) * r); s.rotation.set(Math.random() - 0.5, Math.random() * 6, Math.random() - 0.5); g.add(s); } return g; },
    cols: () => [[-0.4, 0, -0.4, 0.4, 0.45, 0.4]], surface: 0.5 });
  D('pelt', { n: '熊皮地毯', icon: '🐻', base: 60, fp: [0.9, 0.6], stat: { con: 2 }, desc: '软乎乎的。体魄 +2',
    make() { const g = new THREE.Group(); const s = new THREE.Shape(); for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; const r = 1 + 0.25 * Math.sin(a * 4) + 0.1 * Math.sin(a * 9); s.lineTo(Math.cos(a) * 0.85 * r, Math.sin(a) * 0.55 * r); }
      const m = mesh(new THREE.ShapeGeometry(s), M.fur, 0, 0.01, 0); m.rotation.x = -Math.PI / 2; g.add(m); const head = mesh(new THREE.SphereGeometry(0.16, 12, 8), M.fur, 0.95, 0.08, 0); head.scale.set(1.3, 0.6, 1); g.add(head); return g; },
    cols: () => [] });
  D('rack', { n: '武器架', icon: '⚔️', base: 150, fp: [0.8, 0.25], stat: { str: 3 }, desc: '战利品兵器。力量 +3',
    make() { const g = new THREE.Group(); g.add(box(1.4, 0.06, 0.1, M.wood, 0, 0.3, 0)); g.add(box(1.4, 0.06, 0.1, M.wood, 0, 1.2, 0)); for (const s of [-1, 1]) g.add(box(0.08, 1.5, 0.12, M.wood, s * 0.68, 0.75, 0));
      for (let i = 0; i < 5; i++) { const x = -0.5 + i * 0.25; const sw = box(0.04, 1.1, 0.012, M.iron, x, 0.8, 0.07); sw.rotation.z = (Math.random() - 0.5) * 0.2; g.add(sw); g.add(box(0.16, 0.03, 0.03, M.gold, x, 0.3 + 0.03, 0.07)); } return g; },
    cols: () => [[-0.72, 0, -0.1, 0.72, 1.5, 0.1]] });
  D('shroom', { n: '荧光蘑菇丛', icon: '🍄', base: 50, fp: [0.35, 0.35], stat: { agi: 2 }, light: '#4affc8', desc: '幽幽发光的洞穴蘑菇。敏捷 +2',
    make() { const g = new THREE.Group(); const col = ['#4affc8', '#6ac8ff', '#c86aff'][Math.floor(Math.random() * 3)]; for (let i = 0; i < 7; i++) { const x = (Math.random() - 0.5) * 0.5, z = (Math.random() - 0.5) * 0.5, h = 0.1 + Math.random() * 0.35;
      g.add(cyl(0.015, 0.025, h, std('#d8d0c0'), x, h / 2, z, 6)); const cap = mesh(new THREE.SphereGeometry(0.05 + h * 0.2, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), glowMat(col, 1.2), x, h, z); cap.scale.y = 0.6; g.add(cap); } return g; },
    cols: () => [] });
  D('crystal', { n: '魂晶簇', icon: '💎', base: 300, fp: [0.4, 0.4], stat: { soul: 4 }, light: '#b06aff', desc: '天然生长的魂晶矿。魂力 +4', depth: 2,
    make() { const g = new THREE.Group(); const col = ['#b06aff', '#6ab0ff', '#ff6ab0'][Math.floor(Math.random() * 3)]; const m = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.85 });
      for (let i = 0; i < 8; i++) { const h = 0.3 + Math.random() * 0.7; const c = mesh(new THREE.CylinderGeometry(0, 0.07 + Math.random() * 0.05, h, 6), m, (Math.random() - 0.5) * 0.3, h / 2, (Math.random() - 0.5) * 0.3); c.rotation.set((Math.random() - 0.5) * 0.7, 0, (Math.random() - 0.5) * 0.7); g.add(c); } g.add(rock(0.2, M.dark, 0, 0.05, 0)); return g; },
    cols: () => [[-0.25, 0, -0.25, 0.25, 0.8, 0.25]] });
  D('banner', { n: '血色战旗', icon: '🚩', base: 180, fp: [0.3, 0.2], stat: { str: 2, ter: 2 }, desc: '从要塞抢来的战旗，被你涂上了血。力量 +2 凶威 +2', depth: 2,
    make() { const g = new THREE.Group(); g.add(rock(0.2, M.stone, 0, 0.06, 0)); g.add(cyl(0.025, 0.03, 2.4, M.wood, 0, 1.2, 0, 6)); const cl = mesh(new THREE.PlaneGeometry(0.7, 1.0, 8, 8), M.cloth, 0.36, 1.8, 0); g.add(cl); g.userData.cloth = cl;
      g.add(skull(1, 0.36, 1.85, 0.02)); return g; },
    cols: () => [[-0.04, 0, -0.04, 0.04, 2.4, 0.04]] });
  D('chest', { n: '战利品宝箱', icon: '🧰', base: 220, fp: [0.4, 0.3], stat: { soul: 2, agi: 1 }, desc: '塞满了抢来的金银首饰。魂力 +2 敏捷 +1',
    make() { const g = new THREE.Group(); g.add(box(0.7, 0.4, 0.45, M.wood, 0, 0.2, 0)); const lid = mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.7, 12, 1, false, 0, Math.PI), M.wood, 0, 0.4, 0); lid.rotation.z = Math.PI / 2; g.add(lid);
      for (const s of [-1, 1]) g.add(box(0.05, 0.42, 0.47, M.iron, s * 0.25, 0.21, 0)); for (let i = 0; i < 12; i++) g.add(cyl(0.035, 0.035, 0.01, M.gold, (Math.random() - 0.5) * 0.9, 0.005, (Math.random() - 0.5) * 0.7, 10)); return g; },
    cols: () => [[-0.36, 0, -0.24, 0.36, 0.62, 0.24]], surface: 0.62 });
  D('candles', { n: '蜡烛祭坛', icon: '🕯️', base: 260, fp: [0.5, 0.35], stat: { soul: 3 }, light: '#ffc86a', desc: '点满黑蜡烛的小祭坛。魂力 +3', depth: 2,
    make() { const g = new THREE.Group(); g.add(box(0.9, 0.7, 0.55, M.dark, 0, 0.35, 0)); g.add(box(1.0, 0.05, 0.62, M.stone, 0, 0.72, 0));
      for (let i = 0; i < 9; i++) { const x = (Math.random() - 0.5) * 0.8, z = (Math.random() - 0.5) * 0.45, h = 0.08 + Math.random() * 0.2; g.add(cyl(0.02, 0.022, h, std('#1a1a1a'), x, 0.745 + h / 2, z, 8)); g.add(flame(x, 0.745 + h, z, 0.35, '#ffb04a')); }
      g.add(skull(1.3, 0, 0.84, -0.1)); return g; },
    cols: () => [[-0.5, 0, -0.31, 0.5, 0.75, 0.31]], surface: 0.75 });
  D('cage', { n: '吊笼', icon: '⛓️', base: 350, fp: [0.35, 0.35], stat: { ter: 4 }, desc: '锈迹斑斑的铁笼，里面还有具骸骨。凶威 +4', depth: 3,
    make() { const g = new THREE.Group(); g.add(cyl(0.3, 0.3, 0.04, M.rust, 0, 0.9, 0, 12)); g.add(cyl(0.3, 0.3, 0.04, M.rust, 0, 1.9, 0, 12)); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.add(cyl(0.01, 0.01, 1, M.rust, Math.cos(a) * 0.3, 1.4, Math.sin(a) * 0.3, 4)); }
      g.add(cyl(0.012, 0.012, 1.6, M.iron, 0, 2.7, 0, 4)); g.add(skull(1.2, 0, 1.05, 0)); g.userData.swing = true; return g; },
    cols: () => [[-0.3, 0.88, -0.3, 0.3, 1.92, 0.3]] });
  D('stalag', { n: '钟乳石灯', icon: '🪔', base: 200, fp: [0.3, 0.3], stat: { agi: 3 }, light: '#6ac8ff', desc: '镶着发光苔藓的石笋。敏捷 +3', depth: 2,
    make() { const g = new THREE.Group(); const c = mesh(new THREE.ConeGeometry(0.22, 1.6, 8, 4), M.stone, 0, 0.8, 0); g.add(c); for (let i = 0; i < 6; i++) { const b = mesh(new THREE.SphereGeometry(0.04, 8, 6), glowMat('#6ac8ff', 1.6), (Math.random() - 0.5) * 0.25, 0.2 + Math.random() * 0.9, (Math.random() - 0.5) * 0.25); g.add(b); } return g; },
    cols: () => [[-0.18, 0, -0.18, 0.18, 1.6, 0.18]] });
  D('throne', { n: '白骨王座', icon: '🪑', base: 2500, grow: 2.5, fp: [0.6, 0.55], stat: { str: 4, con: 4, agi: 2, ter: 8, soul: 4 }, desc: '用一百颗头骨垒成的王座。全属性大幅提升', depth: 3, max: 1,
    make() { const g = new THREE.Group(); g.add(box(1.1, 0.45, 0.9, M.dark, 0, 0.225, 0)); g.add(box(1.1, 1.6, 0.2, M.dark, 0, 1.2, -0.38));
      for (let i = 0; i < 26; i++) { const r = Math.floor(i / 6), c = i % 6; g.add(skull(0.9, -0.45 + c * 0.18, 0.55 + r * 0.33, -0.27)); }
      for (const s of [-1, 1]) { g.add(box(0.14, 0.4, 0.8, M.bone, s * 0.5, 0.65, 0)); g.add(skull(1.3, s * 0.5, 0.95, 0.3)); }
      const h1 = mesh(new THREE.ConeGeometry(0.06, 0.5, 8), M.bone, -0.5, 2.2, -0.38); h1.rotation.z = 0.4; g.add(h1); const h2 = h1.clone(); h2.position.x = 0.5; h2.rotation.z = -0.4; g.add(h2); return g; },
    cols: () => [[-0.55, 0, -0.45, 0.55, 0.45, 0.45], [-0.55, 0, -0.48, 0.55, 2.0, -0.28]], surface: 0.45 });
  D('lava', { n: '熔岩池', icon: '🌋', base: 5000, grow: 2.2, fp: [0.9, 0.9], stat: { str: 6, ter: 6 }, light: '#ff4a0a', desc: '从地底引上来的熔岩。力量 +6 凶威 +6', depth: 4,
    make() { const g = new THREE.Group(); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; g.add(rock(0.24, M.dark, Math.cos(a) * 0.85, 0.1, Math.sin(a) * 0.85)); }
      const l = mesh(new THREE.CircleGeometry(0.82, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.7, 0.1), map: noiseTex('#ffa030', ['#ff4000', '#ffe060', '#a01000'], 2000) }), 0, 0.1, 0); l.rotation.x = -Math.PI / 2; g.add(l); g.userData.lava = l; return g; },
    cols: () => [[-0.95, 0, -0.95, 0.95, 0.2, 0.95]] });
  D('dragonskull', { n: '古龙头骨', icon: '🐲', base: 15000, grow: 2.5, fp: [1.2, 0.8], stat: { str: 10, con: 10, ter: 12, soul: 8 }, desc: '从龙骨圣山拖回来的古龙头骨。全属性巨幅提升', depth: 5, max: 1,
    make() { const g = new THREE.Group(); const b = mesh(new THREE.SphereGeometry(0.7, 20, 14), M.bone, 0, 0.55, 0); b.scale.set(1.6, 0.8, 1); g.add(b); const snout = box(1.0, 0.35, 0.6, M.bone, 1.1, 0.4, 0); g.add(snout);
      for (const s of [-1, 1]) { g.add(mesh(new THREE.SphereGeometry(0.16, 10, 8), std('#050505'), 0.5, 0.7, s * 0.4)); const h = mesh(new THREE.ConeGeometry(0.12, 1.2, 10), M.bone, -0.6, 1.1, s * 0.4); h.rotation.z = 0.9; g.add(h); }
      for (let i = 0; i < 8; i++) { const t = mesh(new THREE.ConeGeometry(0.04, 0.22, 6), M.bone, 0.75 + i * 0.1, 0.15, (i % 2 ? 1 : -1) * 0.25); t.rotation.x = Math.PI; g.add(t); } return g; },
    cols: () => [[-1.1, 0, -0.7, 1.6, 1.0, 0.7]] });

  // 扩建/挖深（特殊：不是摆放物）
  const DIG = [
    { depth: 1, n: '初始洞窟', r: 7, cost: 0 },
    { depth: 2, n: '挖深·第二层', r: 9, cost: 600, desc: '洞窟扩大，解锁骨龛、首级架、招魂铃、魂晶簇等' },
    { depth: 3, n: '挖深·第三层', r: 11.5, cost: 3000, desc: '解锁魂轮、万首灯柱、疗伤血泉、白骨王座等' },
    { depth: 4, n: '挖深·第四层', r: 14, cost: 12000, desc: '解锁熔岩池、血池祭坛' },
    { depth: 5, n: '挖深·第五层', r: 16.5, cost: 45000, desc: '解锁古龙头骨' },
    { depth: 6, n: '挖深·深渊层', r: 19, cost: 150000, desc: '洞窟的尽头……还是开始？' }
  ];

  let _glow = null;
  function GLOW() { if (_glow) return _glow; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.3, 'rgba(255,255,255,0.6)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); _glow = new THREE.CanvasTexture(c); return _glow; }

  const CATS = [['func', '功能'], ['train', '训练'], ['decor', '装饰'], ['dig', '挖深洞窟']];
  return { C, CATS, TABLE, GLOW, M, DIG, rock, skull, flame, noiseTex, std, mesh, box, cyl, glowMat };
})();
