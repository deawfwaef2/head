// 头部收集 · 主逻辑
(() => {
  const V3 = THREE.Vector3;
  const R = HeadGen.R, RC = R * 1.08; // 碰撞半径
  const ROOM = { x: 5, z: 5, h: 4 };
  const G = -9.8;
  const RAR = [
    { n: 'N', c: '#c9d1da', y: 1, w: 55 },
    { n: 'R', c: '#4da3ff', y: 3, w: 28 },
    { n: 'SR', c: '#b56bff', y: 8, w: 12 },
    { n: 'SSR', c: '#ffc53d', y: 25, w: 4.5 },
    { n: 'UR', c: '#ff5fd2', y: 100, w: 0.5 }
  ];
  const BUILDS = {
    table: { n: '桌子', base: 40, grow: 1.45, desc: '把玩桌上任一头 → 桌上其他头一起产出' },
    pole: { n: '杆子', base: 30, grow: 1.4, desc: '插一个头，每10秒自动触发一次' },
    luck: { n: '幸运符', base: 60, grow: 1.8, desc: '提高高稀有度掉率（升级）' }
  };
  const SAVE_KEY = 'head_game_save_v1';
  const MAX_HEADS = 60;

  // ---------------- 渲染器 ----------------
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('game').appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f2f3f5');
  const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.03, 60);
  camera.rotation.order = 'YXZ';

  // 环境反射
  {
    const env = new THREE.Scene();
    const box = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 10), new THREE.MeshBasicMaterial({ color: 0xdddddd, side: THREE.BackSide }));
    env.add(box);
    const pm = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 6, 6) });
    for (let i = -1; i <= 1; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), pm); p.position.set(i * 3, 2.45, 0); p.rotation.x = Math.PI / 2; env.add(p); }
    const side = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2, 2.2) })); side.position.set(4.9, 0.5, 0); side.rotation.y = -Math.PI / 2; env.add(side);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(env, 0.04).texture;
  }

  // 灯光
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8dce4, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(2.5, 6, 3); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -6; sun.shadow.camera.right = 6; sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -6;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
  scene.add(sun);
  const fill = new THREE.PointLight(0xfff4ea, 0.35, 12); fill.position.set(0, 3.5, 0); scene.add(fill);

  // ---------------- 房间 ----------------
  function panelTex(size, line, tile, base = '#f7f7f8', lc = 'rgba(0,0,0,0.07)') {
    const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, size, size);
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.015})`; g.fillRect(Math.random() * size, Math.random() * size, 2, 2); }
    g.strokeStyle = lc; g.lineWidth = line;
    const s = size / tile;
    for (let i = 0; i <= tile; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, size); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(size, i * s); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    return t;
  }
  const floorTex = panelTex(512, 3, 4, '#f4f4f5', 'rgba(0,0,0,0.06)'); floorTex.repeat.set(2.5, 2.5);
  const wallTex = panelTex(512, 2, 2, '#fafafa', 'rgba(0,0,0,0.045)'); wallTex.repeat.set(5, 2);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.x * 2, ROOM.z * 2), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.35, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 });
  const walls = [[0, ROOM.h / 2, -ROOM.z, 0], [0, ROOM.h / 2, ROOM.z, Math.PI], [-ROOM.x, ROOM.h / 2, 0, Math.PI / 2], [ROOM.x, ROOM.h / 2, 0, -Math.PI / 2]];
  walls.forEach(([x, y, z, ry]) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.x * 2, ROOM.h), wallMat); w.position.set(x, y, z); w.rotation.y = ry; w.receiveShadow = true; scene.add(w); });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.x * 2, ROOM.z * 2), new THREE.MeshStandardMaterial({ color: '#f6f6f6', roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = ROOM.h; scene.add(ceil);
  // 顶灯面板
  const lightMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.4, 1.4) });
  for (let i = -1; i <= 1; i += 2) for (let j = -1; j <= 1; j += 2) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), lightMat); p.rotation.x = Math.PI / 2; p.position.set(i * 2.2, ROOM.h - 0.005, j * 2.2); scene.add(p); }
  // 踢脚线
  const skMat = new THREE.MeshStandardMaterial({ color: '#e9eaec', roughness: 0.6 });
  [[0, -ROOM.z + 0.01, ROOM.x * 2, 0.02], [0, ROOM.z - 0.01, ROOM.x * 2, 0.02], [-ROOM.x + 0.01, 0, 0.02, ROOM.z * 2], [ROOM.x - 0.01, 0, 0.02, ROOM.z * 2]].forEach(([x, z, w, d]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), skMat); m.position.set(x, 0.05, z); scene.add(m); });

  const colliders = []; // AABB：{min:V3,max:V3, owner}
  const addBox = (min, max, owner) => { const b = { min, max, owner }; colliders.push(b); return b; };

  // 管道
  const PIPE = new V3(-1.3, 3.05, -3.4);
  const metal = new THREE.MeshStandardMaterial({ color: '#dfe3e8', metalness: 0.9, roughness: 0.22 });
  const pipeG = new THREE.Group(); scene.add(pipeG);
  {
    const pr = 0.3;
    const v = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr, ROOM.h - PIPE.y - 0.35, 32, 1, true), metal);
    v.position.set(PIPE.x, (ROOM.h - 0.35 + PIPE.y) / 2, PIPE.z); pipeG.add(v);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(pr * 0.92, pr * 0.92, 0.6, 32, 1, true), new THREE.MeshStandardMaterial({ color: '#15161a', side: THREE.BackSide, roughness: 1 }));
    inner.position.set(PIPE.x, PIPE.y + 0.3, PIPE.z); pipeG.add(inner);
    const mouth = new THREE.Mesh(new THREE.CylinderGeometry(pr * 1.05, pr * 1.25, 0.18, 32, 1, true), metal); mouth.position.set(PIPE.x, PIPE.y + 0.05, PIPE.z); pipeG.add(mouth);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(pr * 1.25, 0.03, 12, 40), metal); rim.rotation.x = Math.PI / 2; rim.position.set(PIPE.x, PIPE.y - 0.04, PIPE.z); pipeG.add(rim);
    const elbow = new THREE.Mesh(new THREE.TorusGeometry(0.35, pr, 20, 32, Math.PI / 2), metal);
    elbow.rotation.y = Math.PI / 2; elbow.position.set(PIPE.x, ROOM.h - 0.35, PIPE.z - 0.35); pipeG.add(elbow);
    const hlen = PIPE.z - 0.35 + ROOM.z;
    const h = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr, hlen, 32, 1, true), metal); h.rotation.x = Math.PI / 2; h.position.set(PIPE.x, ROOM.h - 0.0, -ROOM.z + hlen / 2); h.position.y = ROOM.h - 0.35 + 0.35; pipeG.add(h);
    h.position.y = ROOM.h; // 贴顶
    for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.TorusGeometry(pr * 1.04, 0.025, 10, 36), metal); b.rotation.x = Math.PI / 2; b.position.set(PIPE.x, PIPE.y + 0.25 + i * 0.22, PIPE.z); pipeG.add(b); }
    // 出口指示灯
    const ringLight = new THREE.Mesh(new THREE.TorusGeometry(pr * 1.15, 0.012, 8, 40), new THREE.MeshBasicMaterial({ color: '#7fd4ff' }));
    ringLight.rotation.x = Math.PI / 2; ringLight.position.set(PIPE.x, PIPE.y - 0.06, PIPE.z); pipeG.add(ringLight); pipeG.userData.ring = ringLight;
    pipeG.traverse(o => { if (o.isMesh) o.castShadow = true; });
  }

  // 按钮
  const BTN = new V3(0.3, 0, -3.2);
  const btnG = new THREE.Group(); btnG.position.copy(BTN); scene.add(btnG);
  const whiteGloss = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.18, metalness: 0 });
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.95, 40), whiteGloss); ped.position.y = 0.475; ped.castShadow = true; ped.receiveShadow = true; btnG.add(ped);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.05, 40), new THREE.MeshStandardMaterial({ color: '#2a2d33', roughness: 0.3, metalness: 0.6 })); plate.position.y = 0.975; btnG.add(plate);
  const btnMat = new THREE.MeshStandardMaterial({ color: '#ff3b4e', emissive: '#ff1030', emissiveIntensity: 0.5, roughness: 0.25 });
  const btnCap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.07, 40), btnMat); btnCap.position.y = 1.03; btnCap.castShadow = true; btnG.add(btnCap);
  const btnTop = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 12, 0, Math.PI * 2, 0, 0.5), btnMat); btnTop.position.y = 1.0; btnCap.add(btnTop); btnTop.position.set(0, -0.08, 0);
  addBox(new V3(BTN.x - 0.24, 0, BTN.z - 0.24), new V3(BTN.x + 0.24, 1.0, BTN.z + 0.24), 'button');
  btnG.traverse(o => { if (o.isMesh) o.userData.kind = 'button'; });

  // ---------------- 状态 ----------------
  const S = { coins: 0, spawned: 0, luck: 0, bought: { table: 0, pole: 0, luck: 0 }, total: 0, best: 0, collection: [0, 0, 0, 0, 0] };
  const heads = [];
  const builds = [];
  let held = null;
  const clock = new THREE.Clock();
  let now = 0;

  // ---------------- UI ----------------
  const $ = id => document.getElementById(id);
  const ui = { coins: $('coins'), rate: $('rate'), combo: $('combo'), tip: $('tip'), toast: $('toast'), labels: $('labels'), build: $('buildPanel'), menu: $('menu'), info: $('info'), cross: $('cross') };
  const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : Math.floor(n).toString();
  let coinShown = 0;
  const incomeLog = [];
  function addCoins(n, at, color) {
    S.coins += n; S.total += n; incomeLog.push([now, n]);
    ui.coins.classList.remove('bump'); void ui.coins.offsetWidth; ui.coins.classList.add('bump');
    if (at) floatText('+' + fmt(n), at, color);
  }
  const floats = [];
  function floatText(txt, pos, color = '#ffd24d', size = 26) {
    const el = document.createElement('div'); el.className = 'float'; el.textContent = txt;
    el.style.color = color; el.style.fontSize = size + 'px'; ui.labels.appendChild(el);
    floats.push({ el, pos: pos.clone(), t: 0, vx: (Math.random() - 0.5) * 0.3 });
  }
  let toastTimer = 0;
  function toast(html, color = '#333', dur = 2.2) {
    ui.toast.innerHTML = html; ui.toast.style.color = color; ui.toast.classList.add('show'); toastTimer = dur;
  }
  function btnCost() { const n = Math.max(0, S.spawned - 2); return n === 0 && S.spawned < 2 ? 0 : Math.floor(5 * Math.pow(1.22, n)); }
  function buildCost(k) { return Math.floor(BUILDS[k].base * Math.pow(BUILDS[k].grow, S.bought[k])); }

  // 按钮标签（3D投影）
  const btnLabel = document.createElement('div'); btnLabel.className = 'wlabel'; ui.labels.appendChild(btnLabel);

  // ---------------- 粒子 ----------------
  const PMAX = 1500;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(PMAX * 3), pCol = new Float32Array(PMAX * 3);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.3, 'rgba(255,255,255,0.8)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const pMat = new THREE.PointsMaterial({ size: 0.05, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(pGeo, pMat); points.frustumCulled = false; scene.add(points);
  const parts = [];
  function burst(pos, color, n = 20, speed = 2, life = 0.8, grav = -4) {
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      if (parts.length >= PMAX) parts.shift();
      const d = new V3(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.8));
      parts.push({ p: pos.clone(), v: d, life, t: 0, c: c.clone().offsetHSL((Math.random() - 0.5) * 0.05, 0, (Math.random() - 0.5) * 0.2), g: grav });
    }
  }
  function updateParticles(dt) {
    let k = 0;
    for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.t += dt; if (q.t > q.life) { parts.splice(i, 1); } }
    for (const q of parts) {
      q.v.y += q.g * dt; q.p.addScaledVector(q.v, dt); if (q.p.y < 0.01) { q.p.y = 0.01; q.v.y *= -0.4; q.v.x *= 0.7; q.v.z *= 0.7; }
      const a = 1 - q.t / q.life;
      pPos[k * 3] = q.p.x; pPos[k * 3 + 1] = q.p.y; pPos[k * 3 + 2] = q.p.z;
      pCol[k * 3] = q.c.r * a; pCol[k * 3 + 1] = q.c.g * a; pCol[k * 3 + 2] = q.c.b * a; k++;
    }
    for (let i = k; i < PMAX; i++) { pPos[i * 3 + 1] = -100; }
    pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
    pGeo.setDrawRange(0, Math.max(1, k));
  }
  // 冲击环
  const rings = [];
  function shockRing(pos, color, size = 0.5) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.copy(pos); m.lookAt(camera.position); m.scale.setScalar(0.05); scene.add(m); rings.push({ m, t: 0, size });
  }
  // 连锁光线
  const beams = [];
  function beam(a, b, color) {
    const g = new THREE.BufferGeometry().setFromPoints([a.clone(), a.clone().lerp(b, 0.5).add(new V3(0, 0.2, 0)), b.clone()]);
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending }));
    scene.add(l); beams.push({ l, t: 0 });
  }
  // 稀有光柱
  const pillars = [];
  function pillar(pos, color) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 4, 24, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    m.position.set(pos.x, 2, pos.z); scene.add(m); pillars.push({ m, t: 0 });
  }

  let shake = 0;

  // ---------------- 头 ----------------
  function rollRarity() {
    const boost = Math.pow(1.3, S.luck);
    const ws = RAR.map((r, i) => r.w * (i === 0 ? 1 : boost));
    let s = ws.reduce((a, b) => a + b), x = Math.random() * s;
    for (let i = 0; i < ws.length; i++) { x -= ws[i]; if (x <= 0) return i; }
    return 0;
  }
  function createHead(seed, rarity, pos, quat) {
    const hb = HeadGen.build(seed, rarity);
    const g = new THREE.Group(); g.add(hb.group);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(RC * 1.1, 12, 10), new THREE.MeshBasicMaterial({ visible: false }));
    g.add(hit);
    // 稀有度光晕
    if (rarity >= 2) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: RAR[rarity].c, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
      sp.scale.setScalar(R * (rarity >= 3 ? 6 : 4.5)); g.add(sp); hb.glow = sp;
    }
    g.position.copy(pos); if (quat) g.quaternion.copy(quat);
    scene.add(g);
    const h = { seed, rarity, hb, g, hit, vel: new V3(), av: new V3(), pole: null, lastPoke: -9, squash: 0, spin: 0, reactT: 0, lastHit: 0, sleep: 0, yield: RAR[rarity].y };
    hit.userData.head = h;
    heads.push(h);
    return h;
  }
  function removeHead(h) {
    const i = heads.indexOf(h); if (i >= 0) heads.splice(i, 1);
    if (h.pole) h.pole.head = null;
    if (held === h) held = null;
    scene.remove(h.g); h.hb.dispose();
  }

  let pendingDrop = 0;
  function pressButton() {
    btnPress = 0.25;
    if (heads.length >= MAX_HEADS) { SFX.deny(); toast('头太多啦！(上限 ' + MAX_HEADS + ') 按 X 两次卖掉一些', '#e33'); return; }
    if (pendingDrop > 0) { SFX.deny(); return; }
    const cost = btnCost();
    if (S.coins < cost) { SFX.deny(); toast('金币不足：需要 ' + fmt(cost), '#e33', 1.4); return; }
    S.coins -= cost; S.spawned++;
    SFX.click(); SFX.rumble();
    pendingDrop = 0.7;
    pipeShake = 0.7;
  }
  let pipeShake = 0, btnPress = 0;
  function dropHead() {
    const rar = rollRarity();
    const seed = (Math.random() * 2 ** 31) | 0;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((Math.random() - 0.5) * 0.6, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.6));
    const h = createHead(seed, rar, new V3(PIPE.x, PIPE.y + 0.15, PIPE.z), q);
    h.vel.set((Math.random() - 0.5) * 0.8, -2, 0.6 + Math.random() * 0.6);
    h.av.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    S.collection[rar]++;
    burst(new V3(PIPE.x, PIPE.y, PIPE.z), RAR[rar].c, 20 + rar * 20, 1.5 + rar * 0.5, 1.0, -2);
    const r = RAR[rar];
    toast(`<b style="font-size:1.4em">【${r.n}】</b> ${h.hb.name} <span style="opacity:.7">· ${h.hb.exprName} · 产出 ${r.y}</span>`, r.c, rar >= 3 ? 3.5 : 2.2);
    if (rar >= 2) { SFX.fanfare(rar); pillar(new V3(PIPE.x, 0, PIPE.z + 0.5), r.c); }
    if (rar >= 3) { shake = 0.4; burst(new V3(PIPE.x, 1.5, PIPE.z + 0.5), r.c, 150, 4, 1.8, -3); }
    save();
  }

  // ---------------- 触发 & 产出 ----------------
  let combo = 0, comboT = 0;
  const queue = [];
  function trigger(h, src, originHead) {
    let amt = h.yield;
    if (src === 'manual') {
      combo++; comboT = 1.2;
      amt *= 1 + Math.min(combo, 40) * 0.05;
    }
    amt = Math.max(1, Math.round(amt));
    const wp = h.g.position.clone().add(new V3(0, R * 1.6, 0));
    addCoins(amt, wp, src === 'pole' ? '#7fe0ff' : src === 'chain' ? '#b8ff7a' : RAR[h.rarity].c === '#c9d1da' ? '#ffd24d' : RAR[h.rarity].c);
    h.squash = 1; h.reactT = 0.35; h.hb.react();
    burst(h.g.position.clone().add(new V3(0, R, 0)), src === 'chain' ? '#b8ff7a' : '#ffd24d', 10 + h.rarity * 5, 1.8, 0.7);
    shockRing(h.g.position, RAR[h.rarity].c, 0.35 + h.rarity * 0.08);
    SFX.ding(h.rarity, src === 'manual' ? combo : (src === 'chain' ? 3 + Math.floor(Math.random() * 5) : 0));
    if (src === 'manual') {
      const tb = tableOf(h);
      if (tb) {
        const others = heads.filter(o => o !== h && tableOf(o) === tb);
        others.forEach((o, i) => queue.push({ t: now + 0.1 + i * 0.09, h: o, from: h }));
      }
    }
  }
  function poke(h) {
    if (now - h.lastPoke < 0.12) return;
    h.lastPoke = now;
    SFX.boop(combo);
    if (h === held) { h.spin = 1; }
    else if (!h.pole) { h.vel.y += 1.4; h.av.add(new V3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8)); h.sleep = 0; }
    else { h.spin = 1; }
    trigger(h, 'manual');
    camKick = 0.015;
  }
  let camKick = 0;

  // ---------------- 建造 ----------------
  const woodTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#d8b48a'; g.fillRect(0, 0, 512, 128); for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(${120 + Math.random() * 40},${70 + Math.random() * 30},30,${0.1 + Math.random() * 0.2})`; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); const y = Math.random() * 128; g.moveTo(0, y); for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 3); g.stroke(); } const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; })();
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.45 });
  const TABLE = { w: 1.4, d: 0.8, h: 0.76 };
  function makeBuildMesh(type) {
    const g = new THREE.Group();
    if (type === 'table') {
      const top = new THREE.Mesh(new THREE.BoxGeometry(TABLE.w, 0.05, TABLE.d), woodMat); top.position.y = TABLE.h - 0.025; g.add(top);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(TABLE.w + 0.01, 0.012, TABLE.d + 0.01), new THREE.MeshBasicMaterial({ color: '#8ff0c0' })); edge.position.y = TABLE.h - 0.05; g.add(edge); g.userData.edge = edge;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, TABLE.h - 0.05, 12), whiteGloss); l.position.set(sx * (TABLE.w / 2 - 0.08), (TABLE.h - 0.05) / 2, sz * (TABLE.d / 2 - 0.08)); g.add(l); }
    } else if (type === 'pole') {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.05, 32), whiteGloss); base.position.y = 0.025; g.add(base);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.3, 16), metal); rod.position.y = 0.675; g.add(rod);
      const cup = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 8, 24), metal); cup.rotation.x = Math.PI / 2; cup.position.y = 1.32; g.add(cup);
      const prog = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.2, 48, 1, 0, 0.001), new THREE.MeshBasicMaterial({ color: '#7fe0ff', side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
      prog.rotation.x = -Math.PI / 2; prog.position.y = 0.055; g.add(prog); g.userData.prog = prog;
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }
  function footprint(type, rot) { if (type === 'table') return rot % 2 ? [TABLE.d / 2, TABLE.w / 2] : [TABLE.w / 2, TABLE.d / 2]; return [0.24, 0.24]; }
  function addBuild(type, x, z, rot = 0) {
    const g = makeBuildMesh(type); g.position.set(x, 0, z); g.rotation.y = rot * Math.PI / 2; scene.add(g);
    const b = { type, x, z, rot, g, cols: [], head: null, timer: 0 };
    const [hx, hz] = footprint(type, rot);
    if (type === 'table') b.cols.push(addBox(new V3(x - hx, TABLE.h - 0.05, z - hz), new V3(x + hx, TABLE.h, z + hz), b));
    else { b.cols.push(addBox(new V3(x - 0.2, 0, z - 0.2), new V3(x + 0.2, 0.05, z + 0.2), b)); b.cols.push(addBox(new V3(x - 0.025, 0, z - 0.025), new V3(x + 0.025, 1.3, z + 0.025), b)); }
    g.traverse(o => { if (o.isMesh) o.userData.build = b; });
    builds.push(b);
    return b;
  }
  function removeBuild(b) {
    builds.splice(builds.indexOf(b), 1);
    b.cols.forEach(c => colliders.splice(colliders.indexOf(c), 1));
    if (b.head) { const h = b.head; h.pole = null; b.head = null; h.vel.set(0, 1, 0); h.sleep = 0; }
    scene.remove(b.g);
  }
  function tableOf(h) {
    if (h === held || h.pole) return null;
    const p = h.g.position;
    for (const b of builds) {
      if (b.type !== 'table') continue;
      const [hx, hz] = footprint('table', b.rot);
      if (Math.abs(p.x - b.x) < hx + 0.02 && Math.abs(p.z - b.z) < hz + 0.02 && p.y > TABLE.h && p.y < TABLE.h + RC * 2.2) return b;
    }
    return null;
  }
  function mountOnPole(h, b) {
    if (b.head) return false;
    if (held === h) held = null;
    b.head = h; h.pole = b; h.vel.set(0, 0, 0); h.av.set(0, 0, 0); b.timer = 0;
    h.g.position.set(b.x, 1.32 + R * 1.02, b.z);
    SFX.mount(); burst(h.g.position, '#7fe0ff', 25, 1.5, 0.6); shockRing(h.g.position, '#7fe0ff', 0.5);
    return true;
  }

  // 建造模式
  let buildMode = null, buildRot = 0, ghost = null, ghostOk = false;
  const ghostMatOk = new THREE.MeshBasicMaterial({ color: '#40e090', transparent: true, opacity: 0.4, depthWrite: false });
  const ghostMatBad = new THREE.MeshBasicMaterial({ color: '#ff4060', transparent: true, opacity: 0.4, depthWrite: false });
  function setBuildMode(t) {
    if (ghost) { scene.remove(ghost); ghost = null; }
    buildMode = t;
    if (t) {
      ghost = makeBuildMesh(t); ghost.traverse(o => { if (o.isMesh) { o.material = ghostMatOk; o.castShadow = false; } }); scene.add(ghost);
    }
    renderBuildPanel();
  }
  function tryBuy(k) {
    const c = buildCost(k);
    if (S.coins < c) { SFX.deny(); toast('金币不足：' + BUILDS[k].n + ' 需要 ' + fmt(c), '#e33', 1.4); return; }
    if (k === 'luck') {
      S.coins -= c; S.bought.luck++; S.luck++; SFX.fanfare(2); toast('幸运符 Lv.' + S.luck + '！高稀有度掉率提升', '#b56bff'); renderBuildPanel(); save(); return;
    }
    setBuildMode(buildMode === k ? null : k);
  }
  function renderBuildPanel() {
    const open = ui.build.classList.contains('open');
    let h = '<div class="bp-title">建造 <span>[B] 关闭 · 数字键选择 · R 旋转 · 左键放置</span></div><div class="bp-row">';
    Object.keys(BUILDS).forEach((k, i) => {
      const c = buildCost(k), can = S.coins >= c;
      h += `<div class="bp-item ${buildMode === k ? 'sel' : ''} ${can ? '' : 'poor'}" data-k="${k}"><div class="bp-key">${i + 1}</div><div class="bp-name">${BUILDS[k].n}${k === 'luck' ? ' Lv.' + S.luck : ''}</div><div class="bp-cost">🪙 ${fmt(c)}</div><div class="bp-desc">${BUILDS[k].desc}</div></div>`;
    });
    h += '</div>';
    ui.build.innerHTML = h;
    if (!open) ui.build.classList.remove('open');
  }
  ui.build.addEventListener('mousedown', e => { const it = e.target.closest('.bp-item'); if (it) { e.stopPropagation(); tryBuy(it.dataset.k); } });

  // ---------------- 玩家 ----------------
  const player = { pos: new V3(0, 0, 1.5), vel: new V3(), yaw: 0, pitch: -0.1, h: 1.6, onGround: true };
  const keys = {};
  let locked = false, noLock = false, playing = false;
  const ray = new THREE.Raycaster(); ray.far = 3.2;
  let look = null; // {kind, head, build, point}

  function updateLook() {
    ray.setFromCamera({ x: 0, y: 0 }, camera);
    const objs = [btnCap, ped, plate];
    heads.forEach(h => { if (h !== held) objs.push(h.hit); });
    builds.forEach(b => b.g.traverse(o => { if (o.isMesh && o !== b.g.userData.prog) objs.push(o); }));
    const hits = ray.intersectObjects(objs, false);
    look = null;
    if (hits.length) {
      const o = hits[0].object;
      if (o.userData.head) look = { kind: 'head', head: o.userData.head, point: hits[0].point };
      else if (o.userData.kind === 'button') look = { kind: 'button', point: hits[0].point };
      else if (o.userData.build) look = { kind: 'build', build: o.userData.build, point: hits[0].point };
    }
  }

  // 输入
  const canvas = renderer.domElement;
  function lockPointer() {
    if (noLock) { playing = true; ui.menu.classList.add('hidden'); return; }
    try {
      const p = canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => { noLock = true; playing = true; ui.menu.classList.add('hidden'); });
    } catch (e) { noLock = true; playing = true; ui.menu.classList.add('hidden'); }
  }
  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
    if (locked) { playing = true; ui.menu.classList.add('hidden'); }
    else if (!noLock) { playing = false; ui.menu.classList.remove('hidden'); save(); }
  });
  document.addEventListener('pointerlockerror', () => { noLock = true; playing = true; ui.menu.classList.add('hidden'); });
  $('startBtn').addEventListener('click', e => { e.stopPropagation(); SFX.init(); lockPointer(); });
  $('resetBtn').addEventListener('click', e => { e.stopPropagation(); if (confirm('确定重置所有进度？')) { localStorage.removeItem(SAVE_KEY); location.reload(); } });

  let dragLook = false, dragMoved = 0;
  document.addEventListener('mousemove', e => {
    if (!playing) return;
    if (locked || (noLock && dragLook)) {
      player.yaw -= e.movementX * 0.0022; player.pitch -= e.movementY * 0.0022;
      player.pitch = Math.max(-1.5, Math.min(1.5, player.pitch));
      if (dragLook) dragMoved += Math.abs(e.movementX) + Math.abs(e.movementY);
    }
  });
  canvas.addEventListener('mousedown', e => {
    if (!playing) { return; }
    if (noLock && e.button === 0) { dragLook = true; dragMoved = 0; return; }
    action(e.button);
  });
  document.addEventListener('mouseup', e => {
    if (noLock && dragLook && e.button === 0) { dragLook = false; if (dragMoved < 6) action(0); }
  });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  let lastX = 0;
  document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (!playing) return;
    if (e.code === 'KeyE') interactE();
    if (e.code === 'KeyB') { ui.build.classList.toggle('open'); if (!ui.build.classList.contains('open')) setBuildMode(null); renderBuildPanel(); }
    if (e.code === 'KeyR' && buildMode) buildRot = (buildRot + 1) % 2;
    if (['Digit1', 'Digit2', 'Digit3'].includes(e.code)) { if (!ui.build.classList.contains('open')) ui.build.classList.add('open'); tryBuy(Object.keys(BUILDS)[+e.code.slice(5) - 1]); }
    if (e.code === 'KeyQ' && held) throwHeld(true);
    if (e.code === 'KeyM') { const on = SFX.toggleMusic(); toast('音乐 ' + (on ? '开' : '关'), '#555', 1); }
    if (e.code === 'KeyX') {
      if (now - lastX < 0.6) { sellLooked(); lastX = 0; } else { lastX = now; if (look && (look.kind === 'head' || look.kind === 'build')) toast('再按一次 X 确认' + (look.kind === 'head' ? '卖出头' : '拆除（返还50%）'), '#e67', 0.8); }
    }
    if (e.code === 'Escape' && buildMode) setBuildMode(null);
    if (e.code === 'KeyP' && noLock) { playing = false; ui.menu.classList.remove('hidden'); }
  });
  document.addEventListener('keyup', e => { keys[e.code] = false; });
  function sellLooked() {
    if (!look) return;
    if (look.kind === 'head') {
      const h = look.head; const v = h.yield * 8;
      burst(h.g.position, RAR[h.rarity].c, 40, 2.5, 1); addCoins(v, h.g.position.clone(), '#ffd24d'); SFX.sell(); removeHead(h); save();
    } else if (look.kind === 'build') {
      const b = look.build; const k = b.type; S.bought[k] = Math.max(0, S.bought[k] - 1); const v = Math.floor(buildCost(k) * 0.5);
      addCoins(v, new V3(b.x, 1, b.z), '#ffd24d'); SFX.sell(); burst(new V3(b.x, 0.5, b.z), '#ffffff', 40, 2, 1); removeBuild(b); save();
    }
  }

  function action(button) {
    if (button === 0) {
      if (buildMode) { placeBuild(); return; }
      if (held) { poke(held); return; }
      if (look && look.kind === 'button') { pressButton(); return; }
      if (look && look.kind === 'head') { poke(look.head); return; }
    } else if (button === 2) {
      if (buildMode) { setBuildMode(null); return; }
      if (held) throwHeld(true);
    }
  }
  function interactE() {
    if (held) {
      if (look && look.kind === 'build' && look.build.type === 'pole' && !look.build.head) { mountOnPole(held, look.build); return; }
      throwHeld(false); return;
    }
    if (look && look.kind === 'head') {
      const h = look.head;
      if (h.pole) { h.pole.head = null; h.pole = null; }
      held = h; h.sleep = 0; SFX.pickup();
      // 手持把玩（拿起也算一次触发）
      h.spin = 1; trigger(h, 'manual');
    } else if (look && look.kind === 'button') pressButton();
  }
  const heldVel = new V3(), lastHeldPos = new V3();
  function throwHeld(hard) {
    const h = held; held = null;
    const dir = new V3(); camera.getWorldDirection(dir);
    if (hard) { h.vel.copy(dir).multiplyScalar(7).add(new V3(0, 1, 0)); h.av.set(Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5); SFX.whoosh(); }
    else { h.vel.copy(heldVel).clampLength(0, 6); }
    h.sleep = 0; h.lastHit = now;
  }
  function placeBuild() {
    if (!ghostOk) { SFX.deny(); return; }
    const c = buildCost(buildMode);
    if (S.coins < c) { SFX.deny(); toast('金币不足', '#e33', 1); return; }
    S.coins -= c; S.bought[buildMode]++;
    addBuild(buildMode, ghost.position.x, ghost.position.z, buildRot);
    SFX.build(); burst(ghost.position.clone().add(new V3(0, 0.3, 0)), '#8ff0c0', 40, 2, 0.8); shockRing(ghost.position.clone().add(new V3(0, 0.05, 0)), '#8ff0c0', 1);
    const k = buildMode; setBuildMode(null); if (S.coins >= buildCost(k)) setBuildMode(k);
    save();
  }
  function updateGhost() {
    if (!ghost) return;
    const dir = new V3(); camera.getWorldDirection(dir);
    const o = camera.position;
    let t = dir.y < -0.05 ? -o.y / dir.y : 3; t = Math.min(t, 4);
    const p = o.clone().addScaledVector(dir, t);
    p.x = Math.round(p.x * 10) / 10; p.z = Math.round(p.z * 10) / 10; p.y = 0;
    ghost.position.copy(p); ghost.rotation.y = buildRot * Math.PI / 2;
    const [hx, hz] = footprint(buildMode, buildRot);
    let ok = Math.abs(p.x) + hx < ROOM.x - 0.05 && Math.abs(p.z) + hz < ROOM.z - 0.05;
    for (const c of colliders) {
      if (p.x + hx > c.min.x - 0.05 && p.x - hx < c.max.x + 0.05 && p.z + hz > c.min.z - 0.05 && p.z - hz < c.max.z + 0.05) { ok = false; break; }
    }
    if (Math.abs(p.x - player.pos.x) < hx + 0.3 && Math.abs(p.z - player.pos.z) < hz + 0.3) ok = false;
    ghostOk = ok;
    ghost.traverse(m => { if (m.isMesh) m.material = ok ? ghostMatOk : ghostMatBad; });
  }

  // ---------------- 物理 ----------------
  const tmp = new V3(), tmp2 = new V3(), n = new V3();
  const UP = new V3(0, 1, 0);
  function impact(h, speed) {
    if (speed > 0.9 && now - h.lastHit > 0.08) {
      h.lastHit = now;
      SFX.thud(Math.min(1, (speed - 0.6) / 5), 0.9 + Math.random() * 0.2);
      if (speed > 3) { burst(h.g.position.clone().add(new V3(0, -RC * 0.8, 0)), '#ffffff', 6, 0.8, 0.4, -2); }
      if (speed > 4.5 && h.reactT <= 0) { h.reactT = 0.4; h.hb.react(); }
    }
  }
  function contact(h, nx, ny, nz, pen, rest = 0.35, fric = 0.5) {
    n.set(nx, ny, nz);
    h.g.position.addScaledVector(n, pen);
    const vn = h.vel.dot(n);
    if (vn < 0) {
      impact(h, -vn);
      h.vel.addScaledVector(n, -vn * (1 + rest));
      // 摩擦 + 滚动
      tmp.copy(h.vel).addScaledVector(n, -h.vel.dot(n));
      h.vel.addScaledVector(tmp, -fric * 0.25);
      tmp2.crossVectors(n, h.vel).multiplyScalar(1 / RC);
      h.av.lerp(tmp2, 0.35);
    }
    if (ny > 0.5) h.grounded = true;
  }
  function physStep(dt) {
    for (const h of heads) {
      if (h === held || h.pole) continue;
      if (h.sleep > 1.0) continue;
      h.grounded = false;
      h.vel.y += G * dt;
      h.g.position.addScaledVector(h.vel, dt);
      const p = h.g.position;
      if (p.y < RC) contact(h, 0, 1, 0, RC - p.y);
      if (p.y > ROOM.h - RC) contact(h, 0, -1, 0, p.y - (ROOM.h - RC));
      if (p.x < -ROOM.x + RC) contact(h, 1, 0, 0, -ROOM.x + RC - p.x);
      if (p.x > ROOM.x - RC) contact(h, -1, 0, 0, p.x - (ROOM.x - RC));
      if (p.z < -ROOM.z + RC) contact(h, 0, 0, 1, -ROOM.z + RC - p.z);
      if (p.z > ROOM.z - RC) contact(h, 0, 0, -1, p.z - (ROOM.z - RC));
      for (const c of colliders) {
        const cx = Math.max(c.min.x, Math.min(p.x, c.max.x)), cy = Math.max(c.min.y, Math.min(p.y, c.max.y)), cz = Math.max(c.min.z, Math.min(p.z, c.max.z));
        const dx = p.x - cx, dy = p.y - cy, dz = p.z - cz, d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < RC * RC) {
          const d = Math.sqrt(d2);
          if (d > 1e-5) contact(h, dx / d, dy / d, dz / d, RC - d);
          else contact(h, 0, 1, 0, RC);
        }
      }
      // 自动插杆
      for (const b of builds) {
        if (b.type === 'pole' && !b.head && h.vel.y < 0) {
          const dx = p.x - b.x, dz = p.z - b.z;
          if (dx * dx + dz * dz < 0.035 && p.y > 1.3 && p.y < 1.3 + RC * 2) { mountOnPole(h, b); break; }
        }
      }
    }
    // 头-头碰撞
    for (let i = 0; i < heads.length; i++) {
      const a = heads[i]; if (a === held) continue;
      for (let j = i + 1; j < heads.length; j++) {
        const b = heads[j]; if (b === held) continue;
        if (a.pole && b.pole) continue;
        tmp.subVectors(b.g.position, a.g.position);
        const d2 = tmp.lengthSq(), m = RC * 2;
        if (d2 < m * m && d2 > 1e-8) {
          const d = Math.sqrt(d2); tmp.divideScalar(d);
          const pen = m - d;
          const am = a.pole ? 0 : 1, bm = b.pole ? 0 : 1, tot = am + bm;
          if (!tot) continue;
          a.g.position.addScaledVector(tmp, -pen * am / tot); b.g.position.addScaledVector(tmp, pen * bm / tot);
          const rv = tmp2.subVectors(b.vel, a.vel).dot(tmp);
          if (rv < 0) {
            const jimp = -(1.3) * rv / tot;
            a.vel.addScaledVector(tmp, -jimp * am); b.vel.addScaledVector(tmp, jimp * bm);
            if (-rv > 1.2) { impact(a, -rv * 0.7); impact(b, -rv * 0.7); }
          }
          if (a.sleep > 1 && -rv > 0.05) a.sleep = 0; if (b.sleep > 1 && -rv > 0.05) b.sleep = 0;
          if (d2 < m * m * 0.9) { a.sleep = Math.min(a.sleep, 0.5); b.sleep = Math.min(b.sleep, 0.5); }
        }
      }
    }
    // 旋转积分 + 自扶正
    const q = new THREE.Quaternion();
    for (const h of heads) {
      if (h === held || h.pole) continue;
      if (h.sleep > 1.0) continue;
      if (h.grounded) {
        const lu = tmp.set(0, 1, 0).applyQuaternion(h.g.quaternion);
        const ax = tmp2.crossVectors(lu, UP);
        const sp = h.vel.length();
        if (sp < 1.2) h.av.addScaledVector(ax, 30 * dt);
        h.av.multiplyScalar(Math.pow(0.02, dt));
        h.vel.x *= Math.pow(0.15, dt); h.vel.z *= Math.pow(0.15, dt);
      } else h.av.multiplyScalar(Math.pow(0.6, dt));
      const w = h.av.length();
      if (w > 1e-4) { q.setFromAxisAngle(tmp.copy(h.av).divideScalar(w), w * dt); h.g.quaternion.premultiply(q); h.g.quaternion.normalize(); }
      if (h.grounded && h.vel.lengthSq() < 0.004 && w < 0.15) h.sleep += dt; else h.sleep = 0;
    }
  }

  // ---------------- 存档 ----------------
  function save() {
    try {
      const d = {
        S, heads: heads.map(h => ({ s: h.seed, r: h.rarity, p: h.g.position.toArray().map(v => +v.toFixed(3)), q: h.g.quaternion.toArray().map(v => +v.toFixed(3)), pole: h.pole ? builds.indexOf(h.pole) : -1 })),
        builds: builds.map(b => ({ t: b.type, x: b.x, z: b.z, r: b.rot })),
        player: { x: player.pos.x, z: player.pos.z, yaw: player.yaw, pitch: player.pitch }
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(d));
    } catch (e) { }
  }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!d) return false;
      Object.assign(S, d.S);
      S.bought = Object.assign({ table: 0, pole: 0, luck: 0 }, d.S.bought);
      d.builds.forEach(b => addBuild(b.t, b.x, b.z, b.r));
      d.heads.forEach(hd => {
        const h = createHead(hd.s, hd.r, new V3().fromArray(hd.p), new THREE.Quaternion().fromArray(hd.q));
        if (hd.pole >= 0 && builds[hd.pole] && !builds[hd.pole].head) { builds[hd.pole].head = h; h.pole = builds[hd.pole]; h.g.position.set(h.pole.x, 1.32 + R * 1.02, h.pole.z); }
      });
      if (d.player) { player.pos.x = d.player.x; player.pos.z = d.player.z; player.yaw = d.player.yaw; player.pitch = d.player.pitch; }
      return true;
    } catch (e) { console.warn(e); return false; }
  }
  const loaded = load();
  if (!loaded) toast('走到按钮前，点击它召唤第一颗头！', '#444', 5);
  setInterval(save, 5000);
  addEventListener('beforeunload', save);
  renderBuildPanel();

  // ---------------- 主循环 ----------------
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  const proj = new V3();
  function screenPos(p) {
    proj.copy(p).project(camera);
    return { x: (proj.x + 1) / 2 * innerWidth, y: (1 - proj.y) / 2 * innerHeight, vis: proj.z < 1 && proj.z > -1 };
  }
  let acc = 0;
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, clock.getDelta()); now += dt;

    // 玩家移动
    if (playing) {
      const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
      const s = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
      const sp = keys.ShiftLeft ? 5.5 : 3.2;
      const fw = new V3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)), rt = new V3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
      const want = fw.multiplyScalar(f).add(rt.multiplyScalar(s)); if (want.lengthSq() > 0) want.normalize().multiplyScalar(sp);
      player.vel.x += (want.x - player.vel.x) * Math.min(1, dt * 12); player.vel.z += (want.z - player.vel.z) * Math.min(1, dt * 12);
      if (keys.Space && player.onGround) { player.vel.y = 4; player.onGround = false; }
    } else { player.vel.x *= 0.8; player.vel.z *= 0.8; }
    player.vel.y += G * dt;
    player.pos.addScaledVector(player.vel, dt);
    if (player.pos.y <= 0) { player.pos.y = 0; player.vel.y = 0; player.onGround = true; }
    const pr = 0.3;
    player.pos.x = Math.max(-ROOM.x + pr, Math.min(ROOM.x - pr, player.pos.x));
    player.pos.z = Math.max(-ROOM.z + pr, Math.min(ROOM.z - pr, player.pos.z));
    for (const c of colliders) {
      if (c.max.y < 0.3 && c.owner && c.owner.type === 'pole') continue;
      if (player.pos.y > c.max.y - 0.05) continue;
      const cx = Math.max(c.min.x, Math.min(player.pos.x, c.max.x)), cz = Math.max(c.min.z, Math.min(player.pos.z, c.max.z));
      const dx = player.pos.x - cx, dz = player.pos.z - cz, d = Math.hypot(dx, dz);
      if (d < pr && d > 1e-5) { player.pos.x += dx / d * (pr - d); player.pos.z += dz / d * (pr - d); }
    }
    const bob = playing && player.onGround ? Math.sin(now * 10) * Math.min(1, Math.hypot(player.vel.x, player.vel.z) / 3) * 0.02 : 0;
    camera.position.set(player.pos.x, player.pos.y + player.h + bob, player.pos.z);
    camKick *= Math.pow(0.001, dt);
    camera.rotation.set(player.pitch + camKick, player.yaw, 0);
    if (shake > 0) { shake -= dt; camera.position.x += (Math.random() - 0.5) * shake * 0.08; camera.position.y += (Math.random() - 0.5) * shake * 0.08; }

    // 物理
    acc += dt;
    while (acc > 1 / 120) { physStep(1 / 120); acc -= 1 / 120; }

    // 手持
    if (held) {
      const dir = new V3(); camera.getWorldDirection(dir);
      const target = camera.position.clone().addScaledVector(dir, 0.62).add(new V3(0, -0.1, 0));
      lastHeldPos.copy(held.g.position);
      held.g.position.lerp(target, Math.min(1, dt * 18));
      heldVel.subVectors(held.g.position, lastHeldPos).divideScalar(Math.max(dt, 1e-4));
      held.vel.copy(heldVel);
      const faceQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-player.pitch * 0.4, player.yaw, 0, 'YXZ'));
      if (held.spin > 0) faceQ.multiply(new THREE.Quaternion().setFromAxisAngle(UP, (1 - held.spin) * Math.PI * 2));
      held.g.quaternion.slerp(faceQ, Math.min(1, dt * 14));
    }

    // 头动画
    for (const h of heads) {
      if (h.spin > 0) h.spin = Math.max(0, h.spin - dt * 2.6);
      if (h.squash > 0) h.squash = Math.max(0, h.squash - dt * 3);
      const s = h.squash, k = Math.sin(s * Math.PI * 3) * s * 0.18;
      h.hb.group.scale.set(1 + k, 1 - k, 1 + k);
      if (h.reactT > 0) { h.reactT -= dt; if (h.reactT <= 0) h.hb.setExpr(); }
      if (h.pole) {
        const b = h.pole;
        h.g.position.set(b.x, 1.32 + R * 1.02, b.z);
        const tq = new THREE.Quaternion().setFromAxisAngle(UP, now * 0.3 + b.x);
        if (h.spin > 0) tq.multiply(new THREE.Quaternion().setFromAxisAngle(UP, (1 - h.spin) * Math.PI * 2));
        h.g.quaternion.slerp(tq, Math.min(1, dt * 6));
      }
      h.hb.acc.forEach(a => a.rotation.z = now * 1.5);
      if (h.hb.glow) h.hb.glow.material.opacity = 0.25 + Math.sin(now * 3 + h.seed) * 0.1;
    }
    // 杆定时
    for (const b of builds) {
      if (b.type !== 'pole') continue;
      const prog = b.g.userData.prog;
      if (b.head) {
        b.timer += dt;
        if (b.timer >= 10) { b.timer = 0; trigger(b.head, 'pole'); b.head.spin = 1; }
      } else b.timer = 0;
      const frac = Math.max(0.001, b.timer / 10);
      prog.geometry.dispose(); prog.geometry = new THREE.RingGeometry(0.16, 0.2, 48, 1, Math.PI / 2, frac * Math.PI * 2);
    }
    // 桌子高亮：桌上头数
    for (const b of builds) if (b.type === 'table') { const c = heads.filter(h => tableOf(h) === b).length; b.g.userData.edge.material.color.set(c > 1 ? '#5dffb0' : '#cfe8dc'); }
    // 连锁队列
    for (let i = queue.length - 1; i >= 0; i--) {
      const qi = queue[i];
      if (now >= qi.t) {
        queue.splice(i, 1);
        if (heads.includes(qi.h)) { beam(qi.from.g.position, qi.h.g.position, '#b8ff7a'); trigger(qi.h, 'chain'); qi.h.vel.y += 0.8; qi.h.sleep = 0; }
      }
    }
    // 按钮 & 管道
    if (btnPress > 0) btnPress -= dt;
    btnCap.position.y = 1.03 - (btnPress > 0 ? 0.035 : 0);
    btnMat.emissiveIntensity = 0.4 + Math.sin(now * 4) * 0.2 + (btnPress > 0 ? 1 : 0);
    if (pendingDrop > 0) { pendingDrop -= dt; if (pendingDrop <= 0) dropHead(); }
    if (pipeShake > 0) { pipeShake -= dt; pipeG.position.set((Math.random() - 0.5) * 0.02 * pipeShake, 0, (Math.random() - 0.5) * 0.02 * pipeShake); } else pipeG.position.set(0, 0, 0);
    pipeG.userData.ring.material.color.setHSL(0.55, 1, 0.6 + Math.sin(now * 3) * 0.15);

    // 特效
    updateParticles(dt);
    for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; const k = r.t / 0.5; r.m.scale.setScalar(0.05 + k * r.size); r.m.material.opacity = 0.8 * (1 - k); r.m.lookAt(camera.position); if (k >= 1) { scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); rings.splice(i, 1); } }
    for (let i = beams.length - 1; i >= 0; i--) { const b = beams[i]; b.t += dt; b.l.material.opacity = 1 - b.t / 0.4; if (b.t > 0.4) { scene.remove(b.l); b.l.geometry.dispose(); beams.splice(i, 1); } }
    for (let i = pillars.length - 1; i >= 0; i--) { const p = pillars[i]; p.t += dt; p.m.scale.set(1 + p.t, 1, 1 + p.t); p.m.material.opacity = 0.5 * (1 - p.t / 2); if (p.t > 2) { scene.remove(p.m); pillars.splice(i, 1); } }

    updateLook();
    updateGhost();

    // UI
    coinShown += (S.coins - coinShown) * Math.min(1, dt * 10); if (Math.abs(S.coins - coinShown) < 0.5) coinShown = S.coins;
    ui.coins.textContent = fmt(coinShown);
    while (incomeLog.length && incomeLog[0][0] < now - 30) incomeLog.shift();
    const rate = incomeLog.reduce((a, b) => a + b[1], 0) * 2;
    ui.rate.textContent = '≈ ' + fmt(rate) + ' / 分钟';
    if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0; }
    ui.combo.style.opacity = combo > 2 ? 1 : 0;
    if (combo > 2) ui.combo.innerHTML = `COMBO <b>${combo}</b> <small>x${(1 + Math.min(combo, 40) * 0.05).toFixed(2)}</small>`;
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) ui.toast.classList.remove('show'); }
    // 提示
    let tip = '';
    if (buildMode) tip = `放置 <b>${BUILDS[buildMode].n}</b> · 左键确认 · R 旋转 · 右键取消`;
    else if (held) {
      tip = `<b>${held.hb.name}</b> 【${RAR[held.rarity].n}】 · 左键 把玩 · E 放下 · 右键/Q 扔出`;
      if (look && look.kind === 'build' && look.build.type === 'pole' && !look.build.head) tip = '按 <b>E</b> 插到杆上';
    } else if (look) {
      if (look.kind === 'button') { const c = btnCost(); tip = `左键/E 按下召唤 · <b>${c ? '🪙 ' + fmt(c) : '免费'}</b>`; }
      else if (look.kind === 'head') { const h = look.head; tip = `<span style="color:${RAR[h.rarity].c}">【${RAR[h.rarity].n}】</span> <b>${h.hb.name}</b> · ${h.hb.exprName} · 产出 ${h.yield}<br>左键 把玩 · E 拿起 · XX 卖出(${h.yield * 8})` + (tableOf(h) ? ' · <span style="color:#5dffb0">在桌上：连锁</span>' : '') + (h.pole ? ' · <span style="color:#7fe0ff">杆上：' + (10 - h.pole.timer).toFixed(1) + 's</span>' : ''); }
      else if (look.kind === 'build') { const b = look.build; tip = `${BUILDS[b.type].n}` + (b.type === 'pole' ? (b.head ? ` · 下次触发 ${(10 - b.timer).toFixed(1)}s` : ' · 拿着头按 E 插上去') : ` · 桌上 ${heads.filter(h => tableOf(h) === b).length} 个头`) + ' · XX 拆除'; }
    }
    ui.tip.innerHTML = tip;
    ui.cross.className = look && !buildMode ? 'active' : '';
    // 按钮标签
    const bp = screenPos(new V3(BTN.x, 1.35, BTN.z));
    const dist = camera.position.distanceTo(new V3(BTN.x, 1.2, BTN.z));
    if (bp.vis && dist < 8) { btnLabel.style.display = 'block'; btnLabel.style.transform = `translate(${bp.x}px,${bp.y}px) translate(-50%,-100%) scale(${Math.max(0.5, 1.6 / dist)})`; const c = btnCost(); btnLabel.innerHTML = `召唤头部<br><b>${c ? '🪙 ' + fmt(c) : '免费'}</b>`; btnLabel.classList.toggle('poor', S.coins < c); }
    else btnLabel.style.display = 'none';
    // 飘字
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i]; f.t += dt; f.pos.y += dt * 0.5; f.pos.x += f.vx * dt;
      const s = screenPos(f.pos);
      if (f.t > 1.1 || !s.vis) { f.el.remove(); floats.splice(i, 1); continue; }
      const sc = f.t < 0.12 ? 0.6 + f.t / 0.12 * 0.8 : 1.4 - Math.min(0.4, (f.t - 0.12) * 2);
      f.el.style.transform = `translate(${s.x}px,${s.y}px) translate(-50%,-50%) scale(${sc})`;
      f.el.style.opacity = f.t > 0.7 ? 1 - (f.t - 0.7) / 0.4 : 1;
    }
    ui.info.innerHTML = `头 ${heads.length}/${MAX_HEADS} · 幸运 Lv.${S.luck}<br>` + RAR.map((r, i) => `<span style="color:${r.c}">${r.n}:${S.collection[i]}</span>`).join(' ');

    renderer.render(scene, camera);
  }
  frame();
  window.__game = { S, heads, builds, dropHead, addCoins };
})();
