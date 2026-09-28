// 建造目录：功能建筑 / 装饰 / 升级。所有模型程序化生成（无外部资源）
window.BuildCat = (() => {
  const M = {
    white: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2 }),
    metal: new THREE.MeshStandardMaterial({ color: '#dfe3e8', metalness: 0.9, roughness: 0.25 }),
    dark: new THREE.MeshStandardMaterial({ color: '#2a2d33', roughness: 0.4, metalness: 0.4 }),
    red: new THREE.MeshStandardMaterial({ color: '#ff3b4e', emissive: '#ff1030', emissiveIntensity: 0.4, roughness: 0.3 }),
  };
  const canvasTex = (w, h, fn, srgb = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; };
  const wood = canvasTex(512, 128, (g) => { g.fillStyle = '#d8b48a'; g.fillRect(0, 0, 512, 128); for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(${120 + Math.random() * 40},${70 + Math.random() * 30},30,${0.1 + Math.random() * 0.2})`; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); const y = Math.random() * 128; g.moveTo(0, y); for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 3); g.stroke(); } });
  M.wood = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.45 });
  const std = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.6 }, o));
  const glowMat = (c, k = 2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) });
  const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
  const box = (w, h, d, mat, x = 0, y = 0, z = 0) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  const cyl = (rt, rb, h, mat, x = 0, y = 0, z = 0, s = 24) => mesh(new THREE.CylinderGeometry(rt, rb, h, s), mat, x, y, z);

  const TABLE = { w: 1.4, d: 0.8, h: 0.76 };
  const C = {};
  // ---------------- 功能 ----------------
  C.table = { cat: 'func', n: '桌子', icon: '🪵', base: 40, grow: 1.45, fp: [0.7, 0.4], desc: '把玩桌上任一头 → 桌上所有头连锁产出',
    make() { const g = new THREE.Group(); g.add(box(TABLE.w, 0.05, TABLE.d, M.wood, 0, TABLE.h - 0.025, 0));
      const edge = box(TABLE.w + 0.01, 0.012, TABLE.d + 0.01, new THREE.MeshBasicMaterial({ color: '#cfe8dc' }), 0, TABLE.h - 0.05, 0); g.add(edge); g.userData.edge = edge;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(cyl(0.025, 0.02, TABLE.h - 0.05, M.white, sx * (TABLE.w / 2 - 0.08), (TABLE.h - 0.05) / 2, sz * (TABLE.d / 2 - 0.08), 12));
      return g; },
    cols: (hx, hz) => [[-hx, TABLE.h - 0.05, -hz, hx, TABLE.h, hz]], surface: TABLE.h };
  C.pole = { cat: 'func', n: '杆子', icon: '🍡', base: 30, grow: 1.4, fp: [0.22, 0.22], desc: '插一个头，每 10 秒自动触发一次', mount: { y: 1.32, period: 10, mult: 1 },
    make() { const g = new THREE.Group(); g.add(cyl(0.2, 0.24, 0.05, M.white, 0, 0.025, 0, 32)); g.add(cyl(0.022, 0.022, 1.3, M.metal, 0, 0.675, 0, 16));
      const cup = mesh(new THREE.TorusGeometry(0.06, 0.015, 8, 24), M.metal, 0, 1.32, 0); cup.rotation.x = Math.PI / 2; g.add(cup); return g; },
    cols: () => [[-0.2, 0, -0.2, 0.2, 0.05, 0.2], [-0.025, 0, -0.025, 0.025, 1.3, 0.025]] };
  C.pedestal = { cat: 'func', n: '展示台', icon: '🏛️', base: 220, grow: 1.5, fp: [0.28, 0.28], desc: '大理石台 + 聚光灯：每 20 秒触发 ×4 产出', mount: { y: 1.05, period: 20, mult: 4 },
    make() { const g = new THREE.Group(); const marble = std('#f4f1ec', { roughness: 0.15 });
      g.add(box(0.5, 0.08, 0.5, marble, 0, 0.04, 0)); g.add(cyl(0.16, 0.18, 0.9, marble, 0, 0.53, 0, 8)); g.add(box(0.44, 0.07, 0.44, marble, 0, 1.0, 0));
      const cone = mesh(new THREE.ConeGeometry(0.35, 1.6, 32, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe9a8', transparent: true, opacity: 0.05, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), 0, 1.85, 0); g.add(cone);
      return g; },
    cols: () => [[-0.25, 0, -0.25, 0.25, 1.03, 0.25]] };
  C.clicker = { cat: 'func', n: '自动按钮器', icon: '🤖', base: 25, grow: 1.35, fp: [0.2, 0.2], desc: '每 2 秒自动帮你按一次按钮（可叠加）', rate: 0.5,
    make() { const g = new THREE.Group();
      g.add(box(0.36, 0.3, 0.36, M.white, 0, 0.15, 0));
      const scr = box(0.22, 0.1, 0.01, glowMat('#40e0ff', 1.3), 0, 0.2, 0.181); g.add(scr);
      g.add(cyl(0.05, 0.05, 0.2, M.metal, 0, 0.4, 0, 16));
      const piston = new THREE.Group(); piston.add(cyl(0.03, 0.03, 0.25, M.metal, 0, 0.12, 0, 12)); piston.add(cyl(0.07, 0.07, 0.04, M.red, 0, 0.26, 0, 20)); piston.position.y = 0.45; g.add(piston); g.userData.piston = piston;
      const led = mesh(new THREE.SphereGeometry(0.02, 10, 8), glowMat('#40ff90', 2), 0.13, 0.31, 0.13); g.add(led); g.userData.led = led;
      return g; },
    cols: () => [[-0.18, 0, -0.18, 0.18, 0.5, 0.18]] };
  C.turntable = { cat: 'func', n: '转盘', icon: '💿', base: 150, grow: 1.5, fp: [0.62, 0.62], desc: '头放在转盘上会旋转，每 6 秒全部触发一次', period: 6, radius: 0.58,
    make() { const g = new THREE.Group(); g.add(cyl(0.62, 0.64, 0.08, M.dark, 0, 0.04, 0, 48));
      const top = new THREE.Group(); const tex = canvasTex(256, 256, (c) => { c.fillStyle = '#f7f7fa'; c.fillRect(0, 0, 256, 256); for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#ff8fb8' : '#ffd1e2'; c.beginPath(); c.moveTo(128, 128); c.arc(128, 128, 128, i / 12 * Math.PI * 2, (i + 1) / 12 * Math.PI * 2); c.fill(); } c.fillStyle = '#fff'; c.beginPath(); c.arc(128, 128, 20, 0, 7); c.fill(); });
      const disc = cyl(0.6, 0.6, 0.04, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3 }), 0, 0.1, 0, 48); top.add(disc); g.add(top); g.userData.spin = top;
      return g; },
    cols: () => [[-0.6, 0, -0.6, 0.6, 0.12, 0.6]], surface: 0.12 };
  C.speaker = { cat: 'func', n: '音箱', icon: '🔊', base: 120, grow: 1.5, fp: [0.22, 0.2], desc: '半径 1.8m 内的头产出 ×1.5（可叠加）', aura: 1.8,
    make() { const g = new THREE.Group(); g.add(box(0.42, 0.8, 0.38, M.dark, 0, 0.4, 0));
      const cone = std('#111', { roughness: 0.8 });
      const w1 = cyl(0.14, 0.14, 0.02, cone, 0, 0.3, 0.19, 32); w1.rotation.x = Math.PI / 2; g.add(w1);
      const w2 = cyl(0.07, 0.07, 0.02, cone, 0, 0.62, 0.19, 24); w2.rotation.x = Math.PI / 2; g.add(w2);
      const ring = mesh(new THREE.RingGeometry(1.75, 1.8, 64), new THREE.MeshBasicMaterial({ color: '#b56bff', transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }), 0, 0.01, 0); ring.rotation.x = -Math.PI / 2; g.add(ring);
      g.userData.woofers = [w1, w2]; return g; },
    cols: () => [[-0.21, 0, -0.19, 0.21, 0.8, 0.19]] };

  // ---------------- 装饰（每件 +舒适度 → 全局产出加成） ----------------
  C.plant = { cat: 'decor', n: '盆栽', icon: '🪴', base: 20, grow: 1.15, fp: [0.2, 0.2], comfort: 3, desc: '绿意盎然',
    make() { const g = new THREE.Group(); g.add(cyl(0.16, 0.12, 0.3, std('#e8d6c4', { roughness: 0.8 }), 0, 0.15, 0, 20));
      const leaf = std('#4caf6a', { roughness: 0.7 }), leaf2 = std('#6fcf7f', { roughness: 0.7 });
      for (let i = 0; i < 9; i++) { const l = mesh(new THREE.SphereGeometry(0.1 + Math.random() * 0.06, 10, 8), i % 2 ? leaf : leaf2, (Math.random() - 0.5) * 0.25, 0.4 + Math.random() * 0.35, (Math.random() - 0.5) * 0.25); l.scale.y = 1.3; g.add(l); }
      return g; }, cols: () => [[-0.16, 0, -0.16, 0.16, 0.8, 0.16]] };
  C.lamp = { cat: 'decor', n: '落地灯', icon: '💡', base: 35, grow: 1.15, fp: [0.2, 0.2], comfort: 4, desc: '暖光氛围',
    make() { const g = new THREE.Group(); g.add(cyl(0.18, 0.2, 0.03, M.dark, 0, 0.015, 0)); g.add(cyl(0.015, 0.015, 1.5, M.metal, 0, 0.77, 0, 10));
      g.add(cyl(0.16, 0.26, 0.3, new THREE.MeshStandardMaterial({ color: '#fff4e0', emissive: '#ffcc80', emissiveIntensity: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.95 }), 0, 1.6, 0, 24));
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW(), color: '#ffcf80', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.setScalar(1.3); glow.position.y = 1.55; g.add(glow);
      return g; }, cols: () => [[-0.05, 0, -0.05, 0.05, 1.7, 0.05]] };
  C.rug = { cat: 'decor', n: '地毯', icon: '🟣', base: 30, grow: 1.15, fp: [1.0, 0.7], comfort: 4, desc: '柔软圆毯（可以踩）',
    make() { const hue = Math.random(); const tex = canvasTex(256, 256, (c) => { const col = new THREE.Color().setHSL(hue, 0.55, 0.72), col2 = new THREE.Color().setHSL(hue, 0.5, 0.85); c.fillStyle = '#' + col.getHexString(); c.fillRect(0, 0, 256, 256); c.strokeStyle = '#' + col2.getHexString(); c.lineWidth = 10; for (let r = 30; r < 128; r += 26) { c.beginPath(); c.ellipse(128, 128, r, r, 0, 0, 7); c.stroke(); } });
      const g = new THREE.Group(); const m = mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }), 0, 0.006, 0); m.rotation.x = -Math.PI / 2; m.scale.set(1, 0.7, 1); g.add(m); m.receiveShadow = true; return g; },
    cols: () => [] };
  C.sofa = { cat: 'decor', n: '沙发', icon: '🛋️', base: 80, grow: 1.2, fp: [0.8, 0.4], comfort: 8, desc: '头也可以放在沙发上',
    make() { const g = new THREE.Group(); const hue = [0.95, 0.55, 0.12, 0.75][Math.floor(Math.random() * 4)]; const fab = std(new THREE.Color().setHSL(hue, 0.35, 0.62), { roughness: 0.95 });
      g.add(box(1.6, 0.4, 0.8, fab, 0, 0.25, 0)); g.add(box(1.6, 0.5, 0.2, fab, 0, 0.6, -0.3)); g.add(box(0.2, 0.3, 0.8, fab, -0.7, 0.55, 0)); g.add(box(0.2, 0.3, 0.8, fab, 0.7, 0.55, 0));
      for (const x of [-0.37, 0.37]) { const c = box(0.66, 0.1, 0.56, std(new THREE.Color().setHSL(hue, 0.3, 0.72), { roughness: 1 }), x, 0.5, 0.07); g.add(c); }
      return g; }, cols: () => [[-0.8, 0, -0.4, 0.8, 0.55, 0.4], [-0.8, 0, -0.4, 0.8, 0.85, -0.2]], surface: 0.55 };
  C.shelf = { cat: 'decor', n: '书架', icon: '📚', base: 60, grow: 1.2, fp: [0.5, 0.18], comfort: 6, desc: '五颜六色的书',
    make() { const g = new THREE.Group(); g.add(box(1.0, 1.6, 0.03, M.wood, 0, 0.8, -0.15)); for (const x of [-0.5, 0.5]) g.add(box(0.03, 1.6, 0.34, M.wood, x, 0.8, 0));
      for (let s = 0; s < 4; s++) { g.add(box(1.0, 0.03, 0.34, M.wood, 0, 0.02 + s * 0.52, 0)); if (s < 3) { let x = -0.46; while (x < 0.44) { const w = 0.03 + Math.random() * 0.04, h = 0.3 + Math.random() * 0.15; g.add(box(w, h, 0.24, std(new THREE.Color().setHSL(Math.random(), 0.5, 0.6)), x + w / 2, 0.035 + s * 0.52 + h / 2, 0)); x += w + 0.005; } } }
      return g; }, cols: () => [[-0.5, 0, -0.17, 0.5, 1.6, 0.17]], surface: 1.6 };
  C.easel = { cat: 'decor', n: '画架', icon: '🖼️', base: 45, grow: 1.2, fp: [0.35, 0.3], comfort: 5, desc: '随机抽象画',
    make() { const g = new THREE.Group(); const art = canvasTex(256, 320, (c, w, h) => { c.fillStyle = '#fbfaf6'; c.fillRect(0, 0, w, h); for (let i = 0; i < 14; i++) { c.fillStyle = `hsla(${Math.random() * 360},70%,${55 + Math.random() * 20}%,0.8)`; c.beginPath(); c.arc(Math.random() * w, Math.random() * h, 20 + Math.random() * 70, 0, 7); c.fill(); } c.strokeStyle = '#222'; c.lineWidth = 4; c.beginPath(); for (let i = 0; i < 6; i++) c.lineTo(Math.random() * w, Math.random() * h); c.stroke(); });
      const legs = std('#9a7650'); for (const x of [-0.25, 0.25]) { const l = box(0.03, 1.6, 0.03, legs, x, 0.78, 0); l.rotation.z = -x * 0.25; g.add(l); } const bl = box(0.03, 1.5, 0.03, legs, 0, 0.72, -0.25); bl.rotation.x = 0.35; g.add(bl);
      const p = box(0.62, 0.78, 0.03, new THREE.MeshStandardMaterial({ map: art, roughness: 0.8 }), 0, 1.15, 0.04); p.rotation.x = -0.12; g.add(p); g.add(box(0.7, 0.04, 0.1, legs, 0, 0.74, 0.07)); return g; },
    cols: () => [[-0.3, 0, -0.28, 0.3, 1.5, 0.12]] };
  C.neon = { cat: 'decor', n: '霓虹灯牌', icon: '🌈', base: 90, grow: 1.2, fp: [0.5, 0.12], comfort: 7, desc: '闪烁的 HEAD 灯牌',
    make() { const g = new THREE.Group(); const hue = Math.random() * 360; const tex = canvasTex(512, 200, (c) => { c.clearRect(0, 0, 512, 200); c.font = 'bold 140px Arial Black, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = `hsl(${hue},100%,60%)`; c.shadowBlur = 30; c.fillStyle = `hsl(${hue},100%,85%)`; c.fillText('HEAD', 256, 105); c.fillText('HEAD', 256, 105); });
      g.add(box(1.0, 0.45, 0.04, std('#1b1c22', { roughness: 0.3 }), 0, 1.2, -0.02)); const sign = mesh(new THREE.PlaneGeometry(1.0, 0.4), new THREE.MeshBasicMaterial({ map: tex, transparent: true, color: new THREE.Color(1.6, 1.6, 1.6) }), 0, 1.2, 0.005); g.add(sign); g.userData.neon = sign;
      for (const x of [-0.4, 0.4]) g.add(cyl(0.015, 0.015, 1.0, M.metal, x, 0.5, -0.02, 8)); g.add(box(1.0, 0.04, 0.2, M.dark, 0, 0.02, 0)); return g; },
    cols: () => [[-0.5, 0, -0.1, 0.5, 1.45, 0.1]] };
  C.beanbag = { cat: 'decor', n: '懒人豆袋', icon: '🫘', base: 40, grow: 1.15, fp: [0.4, 0.4], comfort: 5, desc: '软乎乎',
    make() { const g = new THREE.Group(); const m = mesh(new THREE.SphereGeometry(0.42, 24, 16), std(new THREE.Color().setHSL(Math.random(), 0.5, 0.6), { roughness: 1 }), 0, 0.25, 0); m.scale.set(1, 0.6, 1); g.add(m); return g; },
    cols: () => [[-0.36, 0, -0.36, 0.36, 0.42, 0.36]], surface: 0.42 };
  C.aquarium = { cat: 'decor', n: '鱼缸', icon: '🐠', base: 150, grow: 1.25, fp: [0.45, 0.25], comfort: 10, desc: '会游动的小鱼',
    make() { const g = new THREE.Group(); g.add(box(0.9, 0.7, 0.5, M.wood, 0, 0.35, 0));
      const water = box(0.86, 0.5, 0.46, new THREE.MeshStandardMaterial({ color: '#7fd0ff', transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false }), 0, 0.95, 0); g.add(water);
      const fr = std('#222'); g.add(box(0.9, 0.03, 0.5, fr, 0, 0.71, 0)); g.add(box(0.9, 0.03, 0.5, fr, 0, 1.21, 0));
      const fish = []; for (let i = 0; i < 6; i++) { const f = mesh(new THREE.ConeGeometry(0.025, 0.07, 8), std(new THREE.Color().setHSL(Math.random(), 0.9, 0.55), { emissive: '#331100' }), 0, 0.8 + Math.random() * 0.3, 0); f.rotation.z = Math.PI / 2; f.userData.ph = Math.random() * 6; f.userData.sp = 0.5 + Math.random(); g.add(f); fish.push(f); }
      g.userData.fish = fish; return g; }, cols: () => [[-0.45, 0, -0.25, 0.45, 1.22, 0.25]], surface: 1.22 };
  C.fairy = { cat: 'decor', n: '星星灯柱', icon: '✨', base: 55, grow: 1.15, fp: [0.15, 0.15], comfort: 5, desc: '缠绕的彩色小灯',
    make() { const g = new THREE.Group(); g.add(cyl(0.03, 0.03, 1.8, std('#f0f0f0'), 0, 0.9, 0, 10)); g.add(cyl(0.14, 0.16, 0.04, M.white, 0, 0.02, 0));
      const bulbs = []; for (let i = 0; i < 26; i++) { const a = i * 0.9, y = 0.15 + i * 0.062; const b = mesh(new THREE.SphereGeometry(0.018, 8, 6), glowMat(new THREE.Color().setHSL(i / 26, 1, 0.6), 2.2), Math.cos(a) * 0.06, y, Math.sin(a) * 0.06); g.add(b); bulbs.push(b); }
      const star = mesh(new THREE.OctahedronGeometry(0.07), glowMat('#ffe066', 2.5), 0, 1.88, 0); g.add(star); g.userData.bulbs = bulbs; g.userData.star = star; return g; },
    cols: () => [[-0.05, 0, -0.05, 0.05, 1.9, 0.05]] };
  C.cat = { cat: 'decor', n: '猫咪抱枕', icon: '🐱', base: 25, grow: 1.15, fp: [0.2, 0.2], comfort: 3, desc: '圆滚滚的猫',
    make() { const g = new THREE.Group(); const col = ['#f2c48d', '#ffffff', '#555555', '#f0a060'][Math.floor(Math.random() * 4)]; const fur = std(col, { roughness: 1 });
      const b = mesh(new THREE.SphereGeometry(0.2, 20, 14), fur, 0, 0.17, 0); b.scale.set(1, 0.8, 1.1); g.add(b);
      for (const s of [-1, 1]) { const e = mesh(new THREE.ConeGeometry(0.05, 0.09, 4), fur, s * 0.1, 0.33, 0.06); e.rotation.z = -s * 0.3; g.add(e); const eye = mesh(new THREE.SphereGeometry(0.018, 8, 6), std('#222'), s * 0.07, 0.2, 0.2); g.add(eye); }
      return g; }, cols: () => [[-0.2, 0, -0.2, 0.2, 0.32, 0.2]], surface: 0.32 };

  // ---------------- 升级 ----------------
  C.luck = { cat: 'up', n: '幸运符', icon: '🍀', base: 60, grow: 1.8, desc: '提高高稀有度掉率' };
  C.power = { cat: 'up', n: '按钮强化', icon: '💪', base: 50, grow: 2.0, desc: '每次按按钮 +1 次计数' };
  C.theme = { cat: 'up', n: '房间主题', icon: '🎨', base: 80, grow: 1.0, desc: '切换墙面/地板配色（纯白→樱粉→薄荷→夜空→纯白…）' };

  let _glow = null;
  function GLOW() { if (_glow) return _glow; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.3, 'rgba(255,255,255,0.6)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); _glow = new THREE.CanvasTexture(c); return _glow; }

  const CATS = [['func', '功能'], ['decor', '装饰'], ['up', '升级']];
  return { C, CATS, TABLE, GLOW, M };
})();
