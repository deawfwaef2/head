// HEAD · 头部收集 · 主逻辑 v2
window.startGame = function () {
  const V3 = THREE.Vector3;
  const RC = 0.17; // 头碰撞半径
  const ROOM = { x: 5, z: 5, h: 4 };
  const G = -9.8;
  const PRESS_NEED = 60;
  const MAX_HEADS = 150;
  const RAR = [
    { n: 'N', c: '#8a96a3', y: 1, w: 55 },
    { n: 'R', c: '#4da3ff', y: 3, w: 28 },
    { n: 'SR', c: '#b56bff', y: 8, w: 12 },
    { n: 'SSR', c: '#ffb300', y: 25, w: 4.5 },
    { n: 'UR', c: '#ff4fd0', y: 100, w: 0.5 }
  ];
  const CAT = BuildCat.C;
  const SAVE_KEY = 'head_game_save_v2';
  const useModels = ModelHeads.ready;

  // ---------------- 渲染器 ----------------
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  document.getElementById('game').appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f2f3f5');
  const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.03, 60);
  camera.rotation.order = 'YXZ';
  {
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.BoxGeometry(10, 5, 10), new THREE.MeshBasicMaterial({ color: 0xdddddd, side: THREE.BackSide })));
    const pm = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 6, 6) });
    for (let i = -1; i <= 1; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), pm); p.position.set(i * 3, 2.45, 0); p.rotation.x = Math.PI / 2; env.add(p); }
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(env, 0.04).texture;
  }
  const hemi = new THREE.HemisphereLight(0xffffff, 0xd8dce4, 0.75); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0.85);
  sun.position.set(2.5, 6, 3); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const updateShadows = () => { renderer.shadowMap.needsUpdate = true; };

  // ---------------- 房间 ----------------
  function panelTex(size, line, tile, base, lc) {
    const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, size, size);
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.015})`; g.fillRect(Math.random() * size, Math.random() * size, 2, 2); }
    g.strokeStyle = lc; g.lineWidth = line; const s = size / tile;
    for (let i = 0; i <= tile; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, size); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(size, i * s); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
  }
  const floorTex = panelTex(512, 3, 4, '#ffffff', 'rgba(0,0,0,0.06)'); floorTex.repeat.set(2.5, 2.5);
  const wallTex = panelTex(512, 2, 2, '#ffffff', 'rgba(0,0,0,0.045)'); wallTex.repeat.set(5, 2);
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.35, color: '#f4f4f5' });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.x * 2, ROOM.z * 2), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9, color: '#fafafa' });
  [[0, -ROOM.z, 0], [0, ROOM.z, Math.PI], [-ROOM.x, 0, Math.PI / 2], [ROOM.x, 0, -Math.PI / 2]].forEach(([x, z, ry]) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.x * 2, ROOM.h), wallMat); w.position.set(x, ROOM.h / 2, z); w.rotation.y = ry; w.receiveShadow = true; scene.add(w); });
  const ceilMat = new THREE.MeshStandardMaterial({ color: '#f6f6f6', roughness: 1 });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.x * 2, ROOM.z * 2), ceilMat); ceil.rotation.x = Math.PI / 2; ceil.position.y = ROOM.h; scene.add(ceil);
  const lightMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.4, 1.4) });
  for (let i = -1; i <= 1; i += 2) for (let j = -1; j <= 1; j += 2) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), lightMat); p.rotation.x = Math.PI / 2; p.position.set(i * 2.2, ROOM.h - 0.005, j * 2.2); scene.add(p); }
  const THEMES = [
    { n: '纯白', wall: '#fafafa', floor: '#f4f4f5', ceil: '#f6f6f6', bg: '#f2f3f5', hemi: 0.75, sun: 0.85, exp: 0.9 },
    { n: '樱粉', wall: '#ffe6ef', floor: '#fff1f5', ceil: '#fff4f8', bg: '#ffeef4', hemi: 0.75, sun: 0.85, exp: 0.9 },
    { n: '薄荷', wall: '#dff5ec', floor: '#eefaf5', ceil: '#f1fbf7', bg: '#e8f7f1', hemi: 0.75, sun: 0.85, exp: 0.9 },
    { n: '夜空', wall: '#3a3f66', floor: '#454a70', ceil: '#262a48', bg: '#1d2038', hemi: 0.5, sun: 0.55, exp: 1.05 }
  ];
  function applyTheme(i) {
    const t = THEMES[i % THEMES.length];
    wallMat.color.set(t.wall); floorMat.color.set(t.floor); ceilMat.color.set(t.ceil); scene.background.set(t.bg);
    hemi.intensity = t.hemi; sun.intensity = t.sun; renderer.toneMappingExposure = t.exp;
    lightMat.color.setScalar(i % THEMES.length === 3 ? 0.6 : 1.4);
  }

  const colliders = [];
  const addBox = (a, b, owner) => { const c = { min: a, max: b, owner }; colliders.push(c); return c; };

  // 管道
  const PIPE = new V3(-1.3, 3.05, -3.4);
  const metal = BuildCat.M.metal;
  const pipeG = new THREE.Group(); scene.add(pipeG);
  {
    const pr = 0.3;
    const v = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr, ROOM.h - PIPE.y, 32, 1, true), metal); v.position.set(PIPE.x, (ROOM.h + PIPE.y) / 2, PIPE.z); pipeG.add(v);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(pr * 0.92, pr * 0.92, 0.6, 32, 1, true), new THREE.MeshStandardMaterial({ color: '#15161a', side: THREE.BackSide, roughness: 1 })); inner.position.set(PIPE.x, PIPE.y + 0.3, PIPE.z); pipeG.add(inner);
    const mouth = new THREE.Mesh(new THREE.CylinderGeometry(pr * 1.05, pr * 1.25, 0.18, 32, 1, true), metal); mouth.position.set(PIPE.x, PIPE.y + 0.05, PIPE.z); pipeG.add(mouth);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(pr * 1.25, 0.03, 12, 40), metal); rim.rotation.x = Math.PI / 2; rim.position.set(PIPE.x, PIPE.y - 0.04, PIPE.z); pipeG.add(rim);
    const flange = new THREE.Mesh(new THREE.CylinderGeometry(pr * 1.6, pr * 1.6, 0.04, 40), metal); flange.position.set(PIPE.x, ROOM.h - 0.02, PIPE.z); pipeG.add(flange);
    for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.TorusGeometry(pr * 1.04, 0.025, 10, 36), metal); b.rotation.x = Math.PI / 2; b.position.set(PIPE.x, PIPE.y + 0.25 + i * 0.22, PIPE.z); pipeG.add(b); }
    const ringLight = new THREE.Mesh(new THREE.TorusGeometry(pr * 1.15, 0.012, 8, 40), new THREE.MeshBasicMaterial({ color: '#7fd4ff' }));
    ringLight.rotation.x = Math.PI / 2; ringLight.position.set(PIPE.x, PIPE.y - 0.06, PIPE.z); pipeG.add(ringLight); pipeG.userData.ring = ringLight;
    pipeG.traverse(o => { if (o.isMesh) o.castShadow = true; });
  }

  // 按钮
  const BTN = new V3(0.3, 0, -3.2);
  const btnG = new THREE.Group(); btnG.position.copy(BTN); scene.add(btnG);
  const whiteGloss = BuildCat.M.white;
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.95, 40), whiteGloss); ped.position.y = 0.475; ped.castShadow = true; btnG.add(ped);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.05, 40), BuildCat.M.dark); plate.position.y = 0.975; btnG.add(plate);
  const btnMat = new THREE.MeshStandardMaterial({ color: '#ff3b4e', emissive: '#ff1030', emissiveIntensity: 0.5, roughness: 0.25 });
  const btnCap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.07, 40), btnMat); btnCap.position.y = 1.03; btnCap.castShadow = true; btnG.add(btnCap);
  const btnTop = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 12, 0, Math.PI * 2, 0, 0.5), btnMat); btnTop.position.set(0, -0.08, 0); btnCap.add(btnTop);
  // 按钮进度环
  const progMat = new THREE.MeshBasicMaterial({ color: '#40e090', side: THREE.DoubleSide });
  let progRing = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.215, 64, 1, 0, 0.001), progMat); progRing.rotation.x = -Math.PI / 2; progRing.position.y = 1.002; btnG.add(progRing);
  addBox(new V3(BTN.x - 0.24, 0, BTN.z - 0.24), new V3(BTN.x + 0.24, 1.0, BTN.z + 0.24), 'button');
  [btnCap, btnTop, ped, plate].forEach(o => o.userData.kind = 'button');

  // ---------------- 状态 ----------------
  const S = { coins: 0, presses: 0, spawned: 0, luck: 0, power: 0, theme: 0, bought: {}, total: 0, collection: [0, 0, 0, 0, 0], pressTotal: 0 };
  const heads = [], builds = [];
  let held = null, now = 0;
  const clock = new THREE.Clock();

  // ---------------- UI ----------------
  const $ = id => document.getElementById(id);
  const ui = { coins: $('coins'), rate: $('rate'), combo: $('combo'), tip: $('tip'), toast: $('toast'), labels: $('labels'), build: $('buildPanel'), menu: $('menu'), info: $('info'), cross: $('cross'), bonus: $('bonus') };
  const fmt = n => n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : Math.floor(n).toString();
  let coinShown = 0; const incomeLog = [];
  function addCoins(n, at, color) {
    S.coins += n; S.total += n; incomeLog.push([now, n]);
    ui.coins.classList.remove('bump'); void ui.coins.offsetWidth; ui.coins.classList.add('bump');
    if (at) floatText('+' + fmt(n), at, color);
  }
  const floats = [];
  function floatText(txt, pos, color = '#ffb800', size = 26) {
    if (floats.length > 60) { const f = floats.shift(); f.el.remove(); }
    const el = document.createElement('div'); el.className = 'float'; el.textContent = txt; el.style.color = color; el.style.fontSize = size + 'px'; ui.labels.appendChild(el);
    floats.push({ el, pos: pos.clone(), t: 0, vx: (Math.random() - 0.5) * 0.3 });
  }
  let toastTimer = 0;
  function toast(html, color = '#333', dur = 2.2) { ui.toast.innerHTML = html; ui.toast.style.color = color; ui.toast.classList.add('show'); toastTimer = dur; }
  const bought = k => S.bought[k] || 0;
  const cost = k => Math.floor(CAT[k].base * Math.pow(CAT[k].grow, bought(k)));
  const btnLabel = document.createElement('div'); btnLabel.className = 'wlabel'; ui.labels.appendChild(btnLabel);

  // ---------------- 粒子 & 特效 ----------------
  const PMAX = 1500;
  const pGeo = new THREE.BufferGeometry(); const pPos = new Float32Array(PMAX * 3), pCol = new Float32Array(PMAX * 3);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const dotTex = BuildCat.GLOW();
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.05, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  points.frustumCulled = false; scene.add(points);
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
    for (let i = parts.length - 1; i >= 0; i--) { parts[i].t += dt; if (parts[i].t > parts[i].life) parts.splice(i, 1); }
    for (const q of parts) {
      q.v.y += q.g * dt; q.p.addScaledVector(q.v, dt); if (q.p.y < 0.01) { q.p.y = 0.01; q.v.y *= -0.4; q.v.x *= 0.7; q.v.z *= 0.7; }
      const a = 1 - q.t / q.life;
      pPos[k * 3] = q.p.x; pPos[k * 3 + 1] = q.p.y; pPos[k * 3 + 2] = q.p.z; pCol[k * 3] = q.c.r * a; pCol[k * 3 + 1] = q.c.g * a; pCol[k * 3 + 2] = q.c.b * a; k++;
    }
    pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true; pGeo.setDrawRange(0, Math.max(1, k));
  }
  const rings = [], ringGeo = new THREE.RingGeometry(0.8, 1, 48);
  function shockRing(pos, color, size = 0.5) {
    if (rings.length > 30) return;
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.copy(pos); m.lookAt(camera.position); m.scale.setScalar(0.05); scene.add(m); rings.push({ m, t: 0, size });
  }
  const beams = [];
  function beam(a, b, color) {
    const g = new THREE.BufferGeometry().setFromPoints([a.clone(), a.clone().lerp(b, 0.5).add(new V3(0, 0.2, 0)), b.clone()]);
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending })); scene.add(l); beams.push({ l, t: 0 });
  }
  const pillars = [];
  function pillar(pos, color) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 4, 24, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    m.position.set(pos.x, 2, pos.z); scene.add(m); pillars.push({ m, t: 0 });
  }
  let shake = 0, camKick = 0;

  // 圆形软阴影（代替实时阴影，提升性能）
  const blobGeo = new THREE.PlaneGeometry(1, 1); blobGeo.rotateX(-Math.PI / 2);
  const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32); rg.addColorStop(0, 'rgba(0,0,0,0.45)'); rg.addColorStop(0.6, 'rgba(0,0,0,0.18)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false });

  // ---------------- 头 ----------------
  function rollRarity() {
    const boost = Math.pow(1.3, S.luck);
    const ws = RAR.map((r, i) => r.w * (i === 0 ? 1 : boost));
    let s = ws.reduce((a, b) => a + b), x = Math.random() * s;
    for (let i = 0; i < ws.length; i++) { x -= ws[i]; if (x <= 0) return i; }
    return 0;
  }
  const hitGeo = new THREE.SphereGeometry(RC * 1.1, 10, 8), hitMat = new THREE.MeshBasicMaterial({ visible: false });
  function createHead(d, pos, quat) {
    // d: {m(file), r, s(seed), e(expr)}
    let hb;
    if (useModels) {
      let mi = ModelHeads.indexOf(d.m); if (mi < 0) { mi = Math.floor(Math.random() * ModelHeads.count); d.m = ModelHeads.fileOf(mi); }
      hb = ModelHeads.create(mi, d.r, d.s, d.e);
    } else {
      const pg = HeadGen.build(d.s, d.r);
      hb = { group: pg.group, name: pg.name, exprName: pg.exprName, acc: pg.acc, react: pg.react, setExpr: pg.setExpr, update() { }, animate() { }, dispose: pg.dispose };
    }
    const g = new THREE.Group(); g.add(hb.group);
    const hit = new THREE.Mesh(hitGeo, hitMat); g.add(hit);
    if (d.r >= 2) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: RAR[d.r].c, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
      sp.scale.setScalar(d.r >= 3 ? 0.9 : 0.65); g.add(sp); hb.glow = sp;
    }
    g.position.copy(pos); if (quat) g.quaternion.copy(quat);
    scene.add(g);
    const blob = new THREE.Mesh(blobGeo, blobMat); blob.scale.setScalar(0.42); blob.renderOrder = -1; scene.add(blob);
    const h = { d, rarity: d.r, hb, g, hit, blob, vel: new V3(), av: new V3(), mount: null, lastPoke: -9, squash: 0, spin: 0, lastHit: 0, sleep: 0, yield: RAR[d.r].y, grounded: false };
    hit.userData.head = h;
    heads.push(h);
    return h;
  }
  function removeHead(h) {
    const i = heads.indexOf(h); if (i >= 0) heads.splice(i, 1);
    if (h.mount) h.mount.head = null;
    if (held === h) held = null;
    scene.remove(h.g); scene.remove(h.blob); h.hb.dispose();
    if (h.hb.glow) h.hb.glow.material.dispose();
  }

  // ---------------- 按钮 / 掉落 ----------------
  let pendingDrops = 0, dropTimer = 0, pipeShake = 0, btnPress = 0;
  function pressButton(src) {
    const n = 1 + S.power;
    S.presses += n; S.pressTotal += n;
    if (src !== 'auto') {
      btnPress = 0.12; camKick = 0.006;
      SFX.press(S.presses / PRESS_NEED);
      burst(new V3(BTN.x, 1.08, BTN.z), '#ff5a6e', 4, 1, 0.4, -3);
      floatText('+' + n, new V3(BTN.x + (Math.random() - 0.5) * 0.2, 1.25, BTN.z), '#ff5a6e', 18);
    } else { btnPress = Math.max(btnPress, 0.06); }
    while (S.presses >= PRESS_NEED) {
      S.presses -= PRESS_NEED;
      if (heads.length + pendingDrops >= MAX_HEADS) { toast('头太多啦！(上限 ' + MAX_HEADS + ')  对着头连按两次 X 卖掉一些', '#e33'); S.presses = PRESS_NEED - 1; break; }
      pendingDrops++;
    }
    rebuildProg();
  }
  let lastProg = -1;
  function rebuildProg() {
    const f = Math.max(0.001, S.presses / PRESS_NEED);
    if (Math.abs(f - lastProg) < 0.004) return; lastProg = f;
    progRing.geometry.dispose(); progRing.geometry = new THREE.RingGeometry(0.16, 0.215, 64, 1, Math.PI / 2, -f * Math.PI * 2);
    progMat.color.setHSL(0.35 - f * 0.35, 0.9, 0.55);
  }
  function dropHead() {
    const r = rollRarity();
    const d = { m: useModels ? ModelHeads.fileOf(Math.floor(Math.random() * ModelHeads.count)) : '', r, s: (Math.random() * 2 ** 31) | 0, e: Math.floor(Math.random() * 14) };
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((Math.random() - 0.5) * 0.6, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.6));
    const h = createHead(d, new V3(PIPE.x, PIPE.y + 0.15, PIPE.z), q);
    h.vel.set((Math.random() - 0.5) * 0.8, -2, 0.6 + Math.random() * 0.6);
    h.av.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    S.collection[r]++; S.spawned++;
    burst(new V3(PIPE.x, PIPE.y, PIPE.z), RAR[r].c, 20 + r * 20, 1.5 + r * 0.5, 1.0, -2);
    toast(`<b style="font-size:1.4em">【${RAR[r].n}】</b> ${h.hb.name} <span style="opacity:.75">· ${h.hb.exprName} · 产出 ${RAR[r].y}</span>`, RAR[r].c, r >= 3 ? 3.5 : 2.2);
    SFX.rumble();
    if (r >= 2) { SFX.fanfare(r); pillar(new V3(PIPE.x, 0, PIPE.z + 0.5), RAR[r].c); }
    if (r >= 3) { shake = 0.4; burst(new V3(PIPE.x, 1.5, PIPE.z + 0.5), RAR[r].c, 150, 4, 1.8, -3); }
    pipeShake = 0.4;
  }

  // ---------------- 产出 ----------------
  let combo = 0, comboT = 0;
  const queue = [];
  let comfort = 0;
  function recalcComfort() { comfort = builds.reduce((a, b) => a + (CAT[b.type].comfort || 0), 0); }
  const comfortMult = () => 1 + comfort / 100;
  function auraMult(h) {
    let m = 1; const p = h.g.position;
    for (const b of builds) if (b.type === 'speaker') { const dx = p.x - b.x, dz = p.z - b.z; if (dx * dx + dz * dz < 1.8 * 1.8) m *= 1.5; }
    return m;
  }
  function trigger(h, src, mult = 1) {
    let amt = h.yield * mult * comfortMult() * auraMult(h);
    if (src === 'manual') { combo++; comboT = 1.2; amt *= 1 + Math.min(combo, 40) * 0.05; }
    amt = Math.max(1, Math.round(amt));
    const wp = h.g.position.clone().add(new V3(0, 0.26, 0));
    const col = src === 'auto' ? '#3fc8ff' : src === 'chain' ? '#6fdc3a' : h.rarity === 0 ? '#ffb300' : RAR[h.rarity].c;
    addCoins(amt, wp, col);
    h.squash = 1; h.hb.react();
    burst(h.g.position.clone().add(new V3(0, 0.15, 0)), src === 'chain' ? '#b8ff7a' : '#ffd24d', 8 + h.rarity * 4, 1.8, 0.7);
    shockRing(h.g.position, RAR[h.rarity].c, 0.35 + h.rarity * 0.08);
    SFX.ding(h.rarity, src === 'manual' ? combo : (src === 'chain' ? 3 + Math.floor(Math.random() * 5) : 0));
    if (src === 'manual') {
      const tb = tableOf(h);
      if (tb) heads.filter(o => o !== h && tableOf(o) === tb).forEach((o, i) => queue.push({ t: now + 0.1 + i * 0.08, h: o, from: h }));
    }
  }
  function poke(h) {
    if (now - h.lastPoke < 0.12) return;
    h.lastPoke = now;
    SFX.boop(combo);
    if (h === held || h.mount) h.spin = 1;
    else { h.vel.y += 1.4; h.av.add(new V3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8)); h.sleep = 0; }
    trigger(h, 'manual');
    camKick = 0.012;
  }

  // ---------------- 建造 ----------------
  function rotAabb(a, rot) { // a: [x0,y0,z0,x1,y1,z1] 局部 → 旋转 rot*90°
    const pts = [[a[0], a[2]], [a[3], a[2]], [a[0], a[5]], [a[3], a[5]]].map(([x, z]) => { for (let i = 0; i < rot; i++) { const t = x; x = z; z = -t; } return [x, z]; });
    const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
    return [Math.min(...xs), a[1], Math.min(...zs), Math.max(...xs), a[4], Math.max(...zs)];
  }
  function footprint(type, rot) { const fp = CAT[type].fp || [0.2, 0.2]; return rot % 2 ? [fp[1], fp[0]] : [fp[0], fp[1]]; }
  function addBuild(type, x, z, rot = 0) {
    const def = CAT[type];
    const g = def.make(); g.position.set(x, 0, z); g.rotation.y = -rot * Math.PI / 2; scene.add(g);
    g.traverse(o => { if (o.isMesh) { const tr = o.material.transparent || o.material.isMeshBasicMaterial; o.castShadow = !tr; o.receiveShadow = !tr; } });
    const b = { type, x, z, rot, g, cols: [], head: null, timer: Math.random() * 0.5, spinA: 0 };
    const fp = def.fp || [0.2, 0.2];
    (def.cols ? def.cols(fp[0], fp[1]) : []).forEach(a => { const r = rotAabb(a, rot); b.cols.push(addBox(new V3(x + r[0], r[1], z + r[2]), new V3(x + r[3], r[4], z + r[5]), b)); });
    g.traverse(o => { if (o.isMesh) o.userData.build = b; });
    builds.push(b); recalcComfort(); updateShadows();
    return b;
  }
  function removeBuild(b) {
    builds.splice(builds.indexOf(b), 1);
    b.cols.forEach(c => colliders.splice(colliders.indexOf(c), 1));
    if (b.head) { const h = b.head; h.mount = null; b.head = null; h.vel.set(0, 1, 0); h.sleep = 0; }
    heads.forEach(h => h.sleep = 0);
    scene.remove(b.g); recalcComfort(); updateShadows();
  }
  function tableOf(h) {
    if (h === held || h.mount) return null;
    const p = h.g.position;
    for (const b of builds) {
      if (b.type !== 'table') continue;
      const [hx, hz] = footprint('table', b.rot);
      if (Math.abs(p.x - b.x) < hx + 0.02 && Math.abs(p.z - b.z) < hz + 0.02 && p.y > BuildCat.TABLE.h && p.y < BuildCat.TABLE.h + RC * 2.2) return b;
    }
    return null;
  }
  function onTurntable(h, b) {
    if (h === held || h.mount) return false;
    const p = h.g.position, dx = p.x - b.x, dz = p.z - b.z;
    return dx * dx + dz * dz < 0.58 * 0.58 && p.y > 0.12 && p.y < 0.12 + RC * 1.6;
  }
  function mountHead(h, b) {
    if (b.head) return false;
    if (held === h) held = null;
    b.head = h; h.mount = b; h.vel.set(0, 0, 0); h.av.set(0, 0, 0); b.timer = 0;
    h.g.position.set(b.x, CAT[b.type].mount.y + RC, b.z);
    SFX.mount(); burst(h.g.position, '#7fe0ff', 25, 1.5, 0.6); shockRing(h.g.position, '#7fe0ff', 0.5);
    return true;
  }

  // 建造面板（鼠标可点击）
  let buildMode = null, buildRot = 0, ghost = null, ghostOk = false, uiOpen = false, curTab = 'func';
  const ghostMatOk = new THREE.MeshBasicMaterial({ color: '#40e090', transparent: true, opacity: 0.4, depthWrite: false });
  const ghostMatBad = new THREE.MeshBasicMaterial({ color: '#ff4060', transparent: true, opacity: 0.4, depthWrite: false });
  function setBuildMode(t) {
    if (ghost) { scene.remove(ghost); ghost = null; }
    buildMode = t;
    if (t) { ghost = CAT[t].make(); ghost.traverse(o => { if (o.isMesh) { o.material = ghostMatOk; o.castShadow = false; } if (o.isSprite) o.visible = false; }); scene.add(ghost); }
  }
  function openPanel(open) {
    uiOpen = open;
    ui.build.classList.toggle('open', open);
    if (open) { renderPanel(); setBuildMode(null); if (document.pointerLockElement) document.exitPointerLock(); }
  }
  function renderPanel() {
    let h = `<div class="bp-head"><div class="bp-title">🔨 建造</div><div class="bp-tabs">` + BuildCat.CATS.map(([k, n]) => `<button class="bp-tab ${curTab === k ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('') + `</div><div class="bp-coins">🪙 ${fmt(S.coins)}</div><button class="bp-close" data-close="1">✕ 关闭 (B)</button></div>`;
    h += `<div class="bp-sub">${curTab === 'decor' ? '装饰：每件增加舒适度，舒适度 = 全局产出加成（当前 +' + comfort + '%）' : curTab === 'up' ? '升级：立即生效' : '功能建筑：让头自动或连锁产出'}</div><div class="bp-grid">`;
    for (const k in CAT) {
      const d = CAT[k]; if (d.cat !== curTab) continue;
      const c = k === 'theme' ? d.base : cost(k), can = S.coins >= c;
      const lv = k === 'luck' ? ' Lv.' + S.luck : k === 'power' ? ' Lv.' + S.power : k === 'theme' ? '（当前：' + THEMES[S.theme % THEMES.length].n + '）' : '';
      h += `<div class="bp-item ${can ? '' : 'poor'}" data-k="${k}"><div class="bp-icon">${d.icon}</div><div class="bp-name">${d.n}${lv}</div><div class="bp-cost">🪙 ${fmt(c)}</div><div class="bp-desc">${d.desc}${d.comfort ? ' · 舒适 +' + d.comfort : ''}</div>${bought(k) && d.cat !== 'up' ? `<div class="bp-own">已有 ${builds.filter(b => b.type === k).length}</div>` : ''}</div>`;
    }
    ui.build.innerHTML = h + '</div>';
  }
  ui.build.addEventListener('mousedown', e => {
    e.stopPropagation();
    const tab = e.target.closest('[data-tab]'); if (tab) { curTab = tab.dataset.tab; renderPanel(); SFX.click(); return; }
    if (e.target.closest('[data-close]')) { openPanel(false); lockPointer(); return; }
    const it = e.target.closest('.bp-item'); if (!it) return;
    const k = it.dataset.k, d = CAT[k], c = k === 'theme' ? d.base : cost(k);
    if (S.coins < c) { SFX.deny(); it.classList.add('shake'); setTimeout(() => it.classList.remove('shake'), 300); return; }
    if (d.cat === 'up') {
      S.coins -= c; S.bought[k] = bought(k) + 1;
      if (k === 'luck') { S.luck++; SFX.fanfare(2); toast('🍀 幸运符 Lv.' + S.luck + '！高稀有度掉率提升', '#b56bff'); }
      if (k === 'power') { S.power++; SFX.fanfare(1); toast('💪 按钮强化 Lv.' + S.power + '：每按一次 +' + (1 + S.power), '#ff5a6e'); }
      if (k === 'theme') { S.theme = (S.theme + 1) % THEMES.length; applyTheme(S.theme); SFX.build(); toast('🎨 房间主题：' + THEMES[S.theme].n, '#555'); }
      renderPanel(); save(); return;
    }
    openPanel(false); setBuildMode(k); lockPointer();
    toast('放置 ' + d.n + '：左键确认 · R 旋转 · 右键取消', '#2a8', 2.5);
  });

  // ---------------- 玩家 & 输入 ----------------
  const player = { pos: new V3(0, 0, 1.5), vel: new V3(), yaw: 0, pitch: -0.1, h: 1.6, onGround: true };
  const keys = {};
  let locked = false, noLock = false, playing = false;
  const ray = new THREE.Raycaster(); ray.far = 3.2;
  let look = null;
  function updateLook() {
    ray.setFromCamera({ x: 0, y: 0 }, camera);
    const objs = [btnCap, btnTop, ped, plate];
    for (const h of heads) if (h !== held) objs.push(h.hit);
    for (const b of builds) for (const c of b.pick || (b.pick = collectPick(b))) objs.push(c);
    const hits = ray.intersectObjects(objs, false);
    look = null;
    if (hits.length) {
      const o = hits[0].object;
      if (o.userData.head) look = { kind: 'head', head: o.userData.head };
      else if (o.userData.kind === 'button') look = { kind: 'button' };
      else if (o.userData.build) look = { kind: 'build', build: o.userData.build };
    }
  }
  function collectPick(b) { const a = []; b.g.traverse(o => { if (o.isMesh && !(o.material && o.material.transparent && o.material.opacity < 0.5)) a.push(o); }); return a; }

  const canvas = renderer.domElement;
  function startPlaying() { playing = true; ui.menu.classList.add('hidden'); }
  function lockPointer() {
    if (noLock) { startPlaying(); return; }
    try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { noLock = true; startPlaying(); }); }
    catch (e) { noLock = true; startPlaying(); }
  }
  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
    if (locked) startPlaying();
    else if (!noLock && !uiOpen) { playing = false; ui.menu.classList.remove('hidden'); save(); }
  });
  document.addEventListener('pointerlockerror', () => { noLock = true; startPlaying(); });
  $('startBtn').addEventListener('click', e => { e.stopPropagation(); SFX.init(); lockPointer(); });
  $('resetBtn').addEventListener('click', e => { e.stopPropagation(); if (confirm('确定重置所有进度？')) { localStorage.removeItem(SAVE_KEY); location.reload(); } });

  let dragLook = false, dragMoved = 0, mouseDown = false, holdT = 0;
  document.addEventListener('mousemove', e => {
    if (!playing || uiOpen) return;
    if (locked || (noLock && dragLook)) {
      if (Math.abs(e.movementX) > 250 || Math.abs(e.movementY) > 250) return;
      player.yaw -= e.movementX * 0.0022; player.pitch = Math.max(-1.5, Math.min(1.5, player.pitch - e.movementY * 0.0022));
      if (dragLook) dragMoved += Math.abs(e.movementX) + Math.abs(e.movementY);
    }
  });
  canvas.addEventListener('mousedown', e => {
    if (uiOpen) { openPanel(false); lockPointer(); return; }
    if (!playing) return;
    if (noLock && e.button === 0) { dragLook = true; dragMoved = 0; return; }
    if (e.button === 0) { mouseDown = true; holdT = 0; }
    action(e.button);
  });
  document.addEventListener('mouseup', e => {
    if (e.button === 0) mouseDown = false;
    if (noLock && dragLook && e.button === 0) { dragLook = false; if (dragMoved < 6) action(0); }
  });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  let lastX = 0;
  document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'KeyB' && (playing || uiOpen)) { if (uiOpen) { openPanel(false); lockPointer(); } else openPanel(true); return; }
    if (e.code === 'Escape' && uiOpen) { openPanel(false); return; }
    if (!playing || uiOpen) return;
    if (e.code === 'KeyE') interactE();
    if (e.code === 'KeyR' && buildMode) buildRot = (buildRot + 1) % 4;
    if (e.code === 'KeyQ' && held) throwHeld(true);
    if (e.code === 'KeyM') { const on = SFX.toggleMusic(); toast('音乐 ' + (on ? '开' : '关'), '#555', 1); }
    if (e.code === 'KeyX') {
      if (now - lastX < 0.6) { sellLooked(); lastX = 0; }
      else { lastX = now; if (look && (look.kind === 'head' || look.kind === 'build')) toast('再按一次 X 确认' + (look.kind === 'head' ? '卖出头' : '拆除（返还50%）'), '#e67', 0.8); }
    }
    if (e.code === 'Escape' && buildMode) setBuildMode(null);
    if (e.code === 'KeyP' && noLock) { playing = false; ui.menu.classList.remove('hidden'); }
  });
  document.addEventListener('keyup', e => { keys[e.code] = false; });
  function sellLooked() {
    if (!look) return;
    if (look.kind === 'head') {
      const h = look.head; const v = h.yield * 8;
      burst(h.g.position, RAR[h.rarity].c, 40, 2.5, 1); addCoins(v, h.g.position.clone(), '#ffb300'); SFX.sell(); removeHead(h); save();
    } else if (look.kind === 'build') {
      const b = look.build; const k = b.type; S.bought[k] = Math.max(0, bought(k) - 1); const v = Math.floor(cost(k) * 0.5);
      addCoins(v, new V3(b.x, 1, b.z), '#ffb300'); SFX.sell(); burst(new V3(b.x, 0.5, b.z), '#ffffff', 40, 2, 1); removeBuild(b); save();
    }
  }
  function action(button) {
    if (button === 0) {
      if (buildMode) { placeBuild(); return; }
      if (held) { poke(held); return; }
      if (look && look.kind === 'button') { pressButton('manual'); return; }
      if (look && look.kind === 'head') { poke(look.head); return; }
    } else if (button === 2) {
      if (buildMode) { setBuildMode(null); return; }
      if (held) throwHeld(true);
    }
  }
  function interactE() {
    if (held) {
      if (look && look.kind === 'build' && CAT[look.build.type].mount && !look.build.head) { mountHead(held, look.build); return; }
      throwHeld(false); return;
    }
    if (look && look.kind === 'head') {
      const h = look.head;
      if (h.mount) { h.mount.head = null; h.mount = null; }
      held = h; h.sleep = 0; SFX.pickup(); h.spin = 1; trigger(h, 'manual');
    } else if (look && look.kind === 'button') pressButton('manual');
  }
  const heldVel = new V3(), lastHeldPos = new V3();
  function throwHeld(hard) {
    const h = held; held = null;
    const dir = new V3(); camera.getWorldDirection(dir);
    if (hard) { h.vel.copy(dir).multiplyScalar(7).add(new V3(0, 1, 0)); h.av.set(Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5); SFX.whoosh(); }
    else h.vel.copy(heldVel).clampLength(0, 6);
    h.sleep = 0; h.lastHit = now;
  }
  function placeBuild() {
    if (!ghostOk) { SFX.deny(); return; }
    const c = cost(buildMode);
    if (S.coins < c) { SFX.deny(); toast('金币不足', '#e33', 1); setBuildMode(null); return; }
    S.coins -= c; S.bought[buildMode] = bought(buildMode) + 1;
    addBuild(buildMode, ghost.position.x, ghost.position.z, buildRot);
    SFX.build(); burst(ghost.position.clone().add(new V3(0, 0.3, 0)), '#8ff0c0', 40, 2, 0.8); shockRing(ghost.position.clone().add(new V3(0, 0.05, 0)), '#8ff0c0', 1);
    const k = buildMode; setBuildMode(null);
    if (S.coins >= cost(k)) setBuildMode(k); // 连续放置
    heads.forEach(h => h.sleep = 0);
    save();
  }
  function updateGhost() {
    if (!ghost) return;
    const dir = new V3(); camera.getWorldDirection(dir);
    const o = camera.position;
    let t = dir.y < -0.05 ? -o.y / dir.y : 3; t = Math.min(t, 4.5);
    const p = o.clone().addScaledVector(dir, t);
    p.x = Math.round(p.x * 10) / 10; p.z = Math.round(p.z * 10) / 10; p.y = 0;
    ghost.position.copy(p); ghost.rotation.y = -buildRot * Math.PI / 2;
    const [hx, hz] = footprint(buildMode, buildRot);
    let ok = Math.abs(p.x) + hx < ROOM.x - 0.02 && Math.abs(p.z) + hz < ROOM.z - 0.02;
    const flat = !CAT[buildMode].cols || CAT[buildMode].cols(hx, hz).length === 0;
    if (!flat) {
      for (const c of colliders) if (p.x + hx > c.min.x && p.x - hx < c.max.x && p.z + hz > c.min.z && p.z - hz < c.max.z) { ok = false; break; }
      if (Math.abs(p.x - player.pos.x) < hx + 0.3 && Math.abs(p.z - player.pos.z) < hz + 0.3) ok = false;
    }
    if (Math.abs(p.x - PIPE.x) < hx + 0.35 && Math.abs(p.z - PIPE.z) < hz + 0.35 && !flat) ok = false;
    ghostOk = ok;
    ghost.traverse(m => { if (m.isMesh) m.material = ok ? ghostMatOk : ghostMatBad; });
  }

  // ---------------- 物理（空间哈希 + 休眠） ----------------
  const tmp = new V3(), tmp2 = new V3(), nrm = new V3(), UP = new V3(0, 1, 0), qtmp = new THREE.Quaternion();
  function impact(h, speed) {
    if (speed > 0.9 && now - h.lastHit > 0.08) {
      h.lastHit = now;
      SFX.thud(Math.min(1, (speed - 0.6) / 5), 0.9 + Math.random() * 0.2);
      if (speed > 3) burst(h.g.position.clone().add(new V3(0, -RC * 0.8, 0)), '#ffffff', 6, 0.8, 0.4, -2);
      if (speed > 4.5) h.hb.react();
    }
  }
  function contact(h, nx, ny, nz, pen, rest = 0.3, fric = 0.5) {
    nrm.set(nx, ny, nz);
    h.g.position.addScaledVector(nrm, pen);
    const vn = h.vel.dot(nrm);
    if (vn < 0) {
      impact(h, -vn);
      h.vel.addScaledVector(nrm, -vn * (1 + rest));
      tmp.copy(h.vel).addScaledVector(nrm, -h.vel.dot(nrm)); h.vel.addScaledVector(tmp, -fric * 0.25);
      tmp2.crossVectors(nrm, h.vel).multiplyScalar(1 / RC); h.av.lerp(tmp2, 0.35);
    }
    if (ny > 0.5) h.grounded = true;
  }
  const grid = new Map(); const CELL = RC * 2;
  function physStep(dt) {
    for (const h of heads) {
      if (h === held || h.mount || h.sleep > 1.0) continue;
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
        if (p.x < c.min.x - RC || p.x > c.max.x + RC || p.z < c.min.z - RC || p.z > c.max.z + RC || p.y < c.min.y - RC || p.y > c.max.y + RC) continue;
        const cx = Math.max(c.min.x, Math.min(p.x, c.max.x)), cy = Math.max(c.min.y, Math.min(p.y, c.max.y)), cz = Math.max(c.min.z, Math.min(p.z, c.max.z));
        const dx = p.x - cx, dy = p.y - cy, dz = p.z - cz, d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < RC * RC) { const d = Math.sqrt(d2); if (d > 1e-5) contact(h, dx / d, dy / d, dz / d, RC - d); else contact(h, 0, 1, 0, RC); }
      }
      for (const b of builds) {
        const mt = CAT[b.type].mount;
        if (mt && !b.head && h.vel.y < 0) { const dx = p.x - b.x, dz = p.z - b.z; if (dx * dx + dz * dz < 0.04 && p.y > mt.y && p.y < mt.y + RC * 2.2) { mountHead(h, b); break; } }
      }
    }
    // 头-头：空间哈希
    grid.clear();
    for (let i = 0; i < heads.length; i++) heads[i].idx = i;
    for (const h of heads) {
      if (h === held) continue;
      const k = Math.floor(h.g.position.x / CELL) + ',' + Math.floor(h.g.position.y / CELL) + ',' + Math.floor(h.g.position.z / CELL);
      let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(h);
    }
    for (const a of heads) {
      if (a === held || (a.sleep > 1 && !a.mount)) continue;
      const ax = Math.floor(a.g.position.x / CELL), ay = Math.floor(a.g.position.y / CELL), az = Math.floor(a.g.position.z / CELL);
      for (let ix = -1; ix <= 1; ix++) for (let iy = -1; iy <= 1; iy++) for (let iz = -1; iz <= 1; iz++) {
        const cell = grid.get((ax + ix) + ',' + (ay + iy) + ',' + (az + iz)); if (!cell) continue;
        for (const b of cell) {
          if (b === a) continue;
          const bAct = b.mount || b.sleep <= 1;
          if (bAct && b.idx < a.idx) continue; // 双方都活跃时只算一次
          if (a.mount && b.mount) continue;
          tmp.subVectors(b.g.position, a.g.position);
          let d2 = tmp.lengthSq(); const m = RC * 2;
          if (d2 >= m * m) continue;
          if (d2 < 1e-8) { tmp.set(Math.random() - 0.5, 0.1, Math.random() - 0.5); d2 = tmp.lengthSq(); }
          const d = Math.sqrt(d2); tmp.divideScalar(d);
          const pen = m - d;
          const am = a.mount ? 0 : 1, bm = b.mount ? 0 : 1, tot = am + bm; if (!tot) continue;
          a.g.position.addScaledVector(tmp, -pen * am / tot); b.g.position.addScaledVector(tmp, pen * bm / tot);
          const rv = tmp2.subVectors(b.vel, a.vel).dot(tmp);
          if (rv < 0) { const j = -1.3 * rv / tot; a.vel.addScaledVector(tmp, -j * am); b.vel.addScaledVector(tmp, j * bm); if (-rv > 1.2) { impact(a, -rv * 0.7); impact(b, -rv * 0.7); } }
          if (pen > 0.004) { if (!b.mount) b.sleep = Math.min(b.sleep, 0.5); if (!a.mount) a.sleep = Math.min(a.sleep, 0.5); }
        }
      }
    }
    for (const h of heads) {
      if (h === held || h.mount || h.sleep > 1.0) continue;
      if (h.grounded) {
        const lu = tmp.set(0, 1, 0).applyQuaternion(h.g.quaternion);
        const ax = tmp2.crossVectors(lu, UP);
        if (h.vel.length() < 1.2) h.av.addScaledVector(ax, 30 * dt);
        h.av.multiplyScalar(Math.pow(0.02, dt));
        h.vel.x *= Math.pow(0.15, dt); h.vel.z *= Math.pow(0.15, dt);
      } else h.av.multiplyScalar(Math.pow(0.6, dt));
      const w = h.av.length();
      if (w > 1e-4) { qtmp.setFromAxisAngle(tmp.copy(h.av).divideScalar(w), w * dt); h.g.quaternion.premultiply(qtmp); h.g.quaternion.normalize(); }
      if (h.grounded && h.vel.lengthSq() < 0.004 && w < 0.15) h.sleep += dt; else h.sleep = 0;
      h.blobDirty = true;
    }
  }
  function surfaceBelow(p) {
    let y = 0.003;
    for (const c of colliders) if (p.x > c.min.x && p.x < c.max.x && p.z > c.min.z && p.z < c.max.z && c.max.y < p.y && c.max.y + 0.003 > y) y = c.max.y + 0.003;
    return y;
  }

  // ---------------- 存档 ----------------
  function save() {
    try {
      const d = {
        S,
        heads: heads.map(h => ({ d: h.d, p: h.g.position.toArray().map(v => +v.toFixed(3)), q: h.g.quaternion.toArray().map(v => +v.toFixed(3)), mt: h.mount ? builds.indexOf(h.mount) : -1 })),
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
      Object.assign(S, d.S); S.bought = Object.assign({}, d.S.bought || {});
      d.builds.forEach(b => { if (CAT[b.t]) addBuild(b.t, b.x, b.z, b.r); });
      d.heads.forEach(hd => {
        const h = createHead(hd.d, new V3().fromArray(hd.p), new THREE.Quaternion().fromArray(hd.q));
        const b = builds[hd.mt];
        if (hd.mt >= 0 && b && CAT[b.type].mount && !b.head) { b.head = h; h.mount = b; h.g.position.set(b.x, CAT[b.type].mount.y + RC, b.z); }
        h.sleep = 0.5;
      });
      if (d.player) { player.pos.x = d.player.x; player.pos.z = d.player.z; player.yaw = d.player.yaw; player.pitch = d.player.pitch; }
      return true;
    } catch (e) { console.warn(e); return false; }
  }
  const loaded = load();
  applyTheme(S.theme || 0);
  rebuildProg();
  if (!loaded) toast('走到红色按钮前，连续点击 60 次召唤第一颗头！（按住左键可连按）', '#444', 6);
  setInterval(save, 5000);
  addEventListener('beforeunload', save);
  updateShadows();

  // ---------------- 主循环 ----------------
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  const proj = new V3();
  function screenPos(p) { proj.copy(p).project(camera); return { x: (proj.x + 1) / 2 * innerWidth, y: (1 - proj.y) / 2 * innerHeight, vis: proj.z < 1 && proj.z > -1 }; }
  let acc = 0, panelRefresh = 0;
  const fw = new V3(), rt = new V3(), want = new V3(), dirV = new V3();
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, clock.getDelta()); now += dt;

    // 玩家
    if (playing && !uiOpen) {
      const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
      const s = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
      const sp = keys.ShiftLeft ? 5.5 : 3.2;
      fw.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)); rt.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
      want.copy(fw).multiplyScalar(f).addScaledVector(rt, s); if (want.lengthSq() > 0) want.normalize().multiplyScalar(sp);
      player.vel.x += (want.x - player.vel.x) * Math.min(1, dt * 12); player.vel.z += (want.z - player.vel.z) * Math.min(1, dt * 12);
      if (keys.Space && player.onGround) { player.vel.y = 4; player.onGround = false; }
    } else { player.vel.x *= 0.8; player.vel.z *= 0.8; }
    player.vel.y += G * dt; player.pos.addScaledVector(player.vel, dt);
    if (player.pos.y <= 0) { player.pos.y = 0; player.vel.y = 0; player.onGround = true; }
    const pr = 0.3;
    player.pos.x = Math.max(-ROOM.x + pr, Math.min(ROOM.x - pr, player.pos.x));
    player.pos.z = Math.max(-ROOM.z + pr, Math.min(ROOM.z - pr, player.pos.z));
    for (const c of colliders) {
      if (c.max.y < 0.2) continue;
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

    acc += dt; let steps = 0;
    while (acc > 1 / 120 && steps < 5) { physStep(1 / 120); acc -= 1 / 120; steps++; }
    if (steps >= 5) acc = 0;

    // 手持
    if (held) {
      camera.getWorldDirection(dirV);
      const target = camera.position.clone().addScaledVector(dirV, 0.62).add(new V3(0, -0.1, 0));
      lastHeldPos.copy(held.g.position);
      held.g.position.lerp(target, Math.min(1, dt * 18));
      heldVel.subVectors(held.g.position, lastHeldPos).divideScalar(Math.max(dt, 1e-4)); held.vel.copy(heldVel);
      const faceQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-player.pitch * 0.4, player.yaw, 0, 'YXZ'));
      if (held.spin > 0) faceQ.multiply(qtmp.setFromAxisAngle(UP, (1 - held.spin) * Math.PI * 2));
      held.g.quaternion.slerp(faceQ, Math.min(1, dt * 14)); held.blobDirty = true;
    }
    // 按住左键连按按钮
    if (mouseDown && playing && !buildMode && !held && look && look.kind === 'button') { holdT += dt; if (holdT > 0.25) { holdT -= 0.12; pressButton('manual'); } }

    // 头动画
    const cp = camera.position;
    for (const h of heads) {
      if (h.spin > 0) h.spin = Math.max(0, h.spin - dt * 2.6);
      if (h.squash > 0) { h.squash = Math.max(0, h.squash - dt * 3); const s = h.squash, k = Math.sin(s * Math.PI * 3) * s * 0.18; h.hb.group.scale.set(1 + k, 1 - k, 1 + k); }
      const near = h.g.position.distanceToSquared(cp) < 16;
      h.hb.update(dt, near);
      if (h.mount) {
        const b = h.mount; h.g.position.set(b.x, CAT[b.type].mount.y + RC, b.z);
        const tq = qtmp.setFromAxisAngle(UP, now * 0.3 + b.x);
        if (h.spin > 0) tq.multiply(new THREE.Quaternion().setFromAxisAngle(UP, (1 - h.spin) * Math.PI * 2));
        h.g.quaternion.slerp(tq, Math.min(1, dt * 6)); h.blobDirty = true;
      }
      if (h.hb.acc) for (const a of h.hb.acc) a.rotation.z = now * 1.5;
      if (h.rarity === 4) h.hb.animate(now);
      if (h.hb.glow) h.hb.glow.material.opacity = 0.22 + Math.sin(now * 3 + h.d.s) * 0.08;
      if (h.blobDirty !== false) {
        const p = h.g.position; const sy = surfaceBelow(p);
        h.blob.position.set(p.x, sy, p.z); const hgt = Math.max(0, p.y - RC - sy);
        h.blob.scale.setScalar(0.42 * (1 + hgt * 0.5)); h.blob.material = blobMat; h.blob.visible = hgt < 2.5;
        h.blobDirty = false;
      }
    }
    // 建筑逻辑
    for (const b of builds) {
      const def = CAT[b.type], ud = b.g.userData;
      if (def.mount) {
        if (b.head) { b.timer += dt; if (b.timer >= def.mount.period) { b.timer = 0; trigger(b.head, 'auto', def.mount.mult); b.head.spin = 1; } } else b.timer = 0;
      }
      if (b.type === 'clicker') {
        b.timer += dt;
        const ph = Math.min(1, b.timer / 2);
        ud.piston.position.y = 0.45 - (ph > 0.9 ? (1 - ph) * 10 * 0.12 : 0);
        if (b.timer >= 2) { b.timer = 0; pressButton('auto'); ud.led.material.color.setRGB(0.2, 3, 1); if (camera.position.distanceTo(b.g.position) < 5) SFX.tick(); }
        else ud.led.material.color.lerp(new THREE.Color(0.1, 0.8, 0.3), dt * 4);
      }
      if (b.type === 'turntable') {
        const w = 0.7 * dt; ud.spin.rotation.y += w; b.timer += dt;
        const on = heads.filter(h => onTurntable(h, b));
        const c = Math.cos(w), s = Math.sin(w);
        for (const h of on) { const dx = h.g.position.x - b.x, dz = h.g.position.z - b.z; h.g.position.x = b.x + dx * c + dz * s; h.g.position.z = b.z - dx * s + dz * c; h.g.quaternion.premultiply(qtmp.setFromAxisAngle(UP, w)); h.blobDirty = true; }
        if (b.timer >= def.period) { b.timer = 0; on.forEach((h, i) => queue.push({ t: now + i * 0.07, h, from: null, src: 'auto' })); }
      }
      if (b.type === 'speaker') { const k = 1 + Math.max(0, Math.sin(now * Math.PI * 2 * 76 / 60)) * 0.08; ud.woofers.forEach(w => w.scale.set(k, 1, k)); }
      if (b.type === 'neon') ud.neon.material.opacity = Math.random() < 0.01 ? 0.3 : 1;
      if (b.type === 'aquarium') ud.fish.forEach(f => { const t = now * f.userData.sp + f.userData.ph; f.position.x = Math.sin(t) * 0.35; f.position.z = Math.cos(t * 1.3) * 0.15; f.rotation.y = Math.cos(t) > 0 ? 0 : Math.PI; });
      if (b.type === 'fairy') ud.bulbs.forEach((bl, i) => bl.visible = ((i + Math.floor(now * 4)) % 3) !== 0);
      if (b.type === 'table') { const cnt = heads.filter(h => tableOf(h) === b).length; ud.edge.material.color.set(cnt > 1 ? '#5dffb0' : '#cfe8dc'); }
    }
    // 连锁队列
    for (let i = queue.length - 1; i >= 0; i--) {
      const q = queue[i];
      if (now >= q.t) { queue.splice(i, 1); if (heads.includes(q.h)) { if (q.from) beam(q.from.g.position, q.h.g.position, '#b8ff7a'); trigger(q.h, q.src || 'chain'); if (!q.h.mount) { q.h.vel.y += 0.8; q.h.sleep = 0; } } }
    }
    // 掉落队列
    if (pendingDrops > 0) { dropTimer -= dt; if (dropTimer <= 0) { dropTimer = 0.45; pendingDrops--; dropHead(); } }
    // 按钮 & 管道
    if (btnPress > 0) btnPress -= dt;
    btnCap.position.y = 1.03 - (btnPress > 0 ? 0.035 : 0);
    btnMat.emissiveIntensity = 0.4 + Math.sin(now * 4) * 0.2 + (btnPress > 0 ? 1 : 0);
    if (pipeShake > 0) { pipeShake -= dt; pipeG.position.set((Math.random() - 0.5) * 0.02, 0, (Math.random() - 0.5) * 0.02); } else pipeG.position.set(0, 0, 0);
    pipeG.userData.ring.material.color.setHSL(0.55 - S.presses / PRESS_NEED * 0.5, 1, 0.6 + Math.sin(now * 3) * 0.15);

    updateParticles(dt);
    for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; const k = r.t / 0.5; r.m.scale.setScalar(0.05 + k * r.size); r.m.material.opacity = 0.8 * (1 - k); r.m.lookAt(cp); if (k >= 1) { scene.remove(r.m); r.m.material.dispose(); rings.splice(i, 1); } }
    for (let i = beams.length - 1; i >= 0; i--) { const b = beams[i]; b.t += dt; b.l.material.opacity = 1 - b.t / 0.4; if (b.t > 0.4) { scene.remove(b.l); b.l.geometry.dispose(); b.l.material.dispose(); beams.splice(i, 1); } }
    for (let i = pillars.length - 1; i >= 0; i--) { const p = pillars[i]; p.t += dt; p.m.scale.set(1 + p.t, 1, 1 + p.t); p.m.material.opacity = 0.5 * (1 - p.t / 2); if (p.t > 2) { scene.remove(p.m); p.m.geometry.dispose(); p.m.material.dispose(); pillars.splice(i, 1); } }

    updateLook(); updateGhost();

    // UI
    coinShown += (S.coins - coinShown) * Math.min(1, dt * 10); if (Math.abs(S.coins - coinShown) < 0.5) coinShown = S.coins;
    ui.coins.textContent = fmt(coinShown);
    while (incomeLog.length && incomeLog[0][0] < now - 30) incomeLog.shift();
    ui.rate.textContent = '≈ ' + fmt(incomeLog.reduce((a, b) => a + b[1], 0) * 2) + ' / 分钟';
    ui.bonus.innerHTML = `舒适度 +${comfort}% · 按钮 ×${1 + S.power} · 自动 ${builds.filter(b => b.type === 'clicker').length * 0.5}/秒`;
    if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0; }
    ui.combo.style.opacity = combo > 2 ? 1 : 0;
    if (combo > 2) ui.combo.innerHTML = `COMBO <b>${combo}</b> <small>x${(1 + Math.min(combo, 40) * 0.05).toFixed(2)}</small>`;
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) ui.toast.classList.remove('show'); }
    if (uiOpen) { panelRefresh -= dt; if (panelRefresh <= 0) { panelRefresh = 0.5; const c = ui.build.querySelector('.bp-coins'); if (c) c.textContent = '🪙 ' + fmt(S.coins); ui.build.querySelectorAll('.bp-item').forEach(el => { const k = el.dataset.k; el.classList.toggle('poor', S.coins < (k === 'theme' ? CAT[k].base : cost(k))); }); } }
    let tip = '';
    if (buildMode) tip = `放置 <b>${CAT[buildMode].n}</b> · 左键确认 · R 旋转 · 右键取消`;
    else if (held) {
      tip = `<b>${held.hb.name}</b> 【${RAR[held.rarity].n}】 · 左键 把玩 · E 放下 · 右键/Q 扔出`;
      if (look && look.kind === 'build' && CAT[look.build.type].mount && !look.build.head) tip = `按 <b>E</b> 放到${CAT[look.build.type].n}上`;
    } else if (look) {
      if (look.kind === 'button') tip = `左键 按下（按住连按）· <b>${S.presses}/${PRESS_NEED}</b>`;
      else if (look.kind === 'head') { const h = look.head; tip = `<span style="color:${RAR[h.rarity].c}">【${RAR[h.rarity].n}】</span> <b>${h.hb.name}</b> · ${h.hb.exprName} · 产出 ${h.yield}<br>左键 把玩 · E 拿起 · XX 卖出(${h.yield * 8})` + (tableOf(h) ? ' · <span style="color:#2c9">桌上连锁</span>' : '') + (h.mount ? ` · <span style="color:#39c">${(CAT[h.mount.type].mount.period - h.mount.timer).toFixed(1)}s</span>` : ''); }
      else if (look.kind === 'build') { const b = look.build, d = CAT[b.type]; tip = `${d.icon} ${d.n}` + (d.mount ? (b.head ? ` · 下次触发 ${(d.mount.period - b.timer).toFixed(1)}s` : ' · 拿着头按 E 放上去') : b.type === 'table' ? ` · 桌上 ${heads.filter(h => tableOf(h) === b).length} 个头` : b.type === 'turntable' ? ` · 下次 ${(d.period - b.timer).toFixed(1)}s` : '') + ' · XX 拆除'; }
    }
    ui.tip.innerHTML = tip;
    ui.cross.className = look && !buildMode ? 'active' : '';
    const bp = screenPos(new V3(BTN.x, 1.35, BTN.z));
    const dist = camera.position.distanceTo(new V3(BTN.x, 1.2, BTN.z));
    if (bp.vis && dist < 9 && !uiOpen) {
      btnLabel.style.display = 'block'; btnLabel.style.transform = `translate(${bp.x}px,${bp.y}px) translate(-50%,-100%) scale(${Math.max(0.55, 1.6 / dist)})`;
      const pc = Math.floor(S.presses / PRESS_NEED * 100);
      btnLabel.innerHTML = `召唤头部 <b>${S.presses}/${PRESS_NEED}</b><div class="pbar"><i style="width:${pc}%"></i></div>` + (pendingDrops ? `<small>掉落中 ×${pendingDrops}</small>` : '');
    } else btnLabel.style.display = 'none';
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i]; f.t += dt; f.pos.y += dt * 0.5; f.pos.x += f.vx * dt;
      const s = screenPos(f.pos);
      if (f.t > 1.1 || !s.vis) { f.el.remove(); floats.splice(i, 1); continue; }
      const sc = f.t < 0.12 ? 0.6 + f.t / 0.12 * 0.8 : 1.4 - Math.min(0.4, (f.t - 0.12) * 2);
      f.el.style.transform = `translate(${s.x}px,${s.y}px) translate(-50%,-50%) scale(${sc})`; f.el.style.opacity = f.t > 0.7 ? 1 - (f.t - 0.7) / 0.4 : 1;
    }
    ui.info.innerHTML = `头 ${heads.length}/${MAX_HEADS} · 幸运 Lv.${S.luck}<br>` + RAR.map((r, i) => `<span style="color:${r.c}">${r.n}:${S.collection[i]}</span>`).join(' ');

    renderer.render(scene, camera);
  }
  frame();
  window.__game = { S, heads, builds, player, dropHead, addCoins, poke, trigger, addBuild, mountHead, tableOf, save, pressButton, openPanel, renderer };
};
