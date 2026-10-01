// 《魂首窟》核心：世界、首级物理、头发摆动、把玩/连锁/枪桩、建造、属性、存档
window.startGame = function () {
  const V3 = THREE.Vector3;
  const SAVE_KEY = 'soulhead_v3';
  const HS = 1.55, RC = 0.165, GRAV = -9.8, LOD_ON = !!(window.Mods && Mods.on('lod') && window.HeadLOD), MAX_HEADS = LOD_ON ? 320 : 200; // 洞内 3D 上限；超出的进魂库（上限 9999）
  const VAULT_MAX = 9999;
  const RAR = [
    { n: '凡魂', c: '#b8b8c0', y: 1 }, { n: '灵魂', c: '#4aa8ff', y: 3 }, { n: '英魂', c: '#c05aff', y: 8 }, { n: '圣魂', c: '#ffb020', y: 20 }, { n: '神魂', c: '#ff4a8a', y: 55 }
  ];
  if (window.Mods) try { Mods.apply(); } catch (e) { console.warn('Mods.apply', e); }
  const CAT = BuildCat.C;

  // ---------------- 渲染器 ----------------
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  let pixelRatio = Math.min(devicePixelRatio, (window.Mods && Mods.on('lowspec')) ? 0.85 : 1.5);
  renderer.setPixelRatio(pixelRatio); renderer.setSize(innerWidth, innerHeight);
  if (window.Eco) Eco.attach(renderer);
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  // 第十三轮：默认走大师画质管线（master.js）；开了画风 MOD 才用旧的 render.js 链；lowspec 两者都不开
  const FORCE_Q = new URLSearchParams(location.search).get('q');
  const LOWSPEC = window.Mods && Mods.on('lowspec');
  renderer.shadowMap.enabled = !LOWSPEC; renderer.shadowMap.type = THREE.PCFShadowMap;
  const post = (window.Post && Post.STYLE !== 'classic') ? Post.create(renderer) : (window.Master && !LOWSPEC ? Master.create(renderer, { tier: FORCE_Q || 'ultra' }) : (window.Post ? Post.create(renderer) : null));
  document.getElementById('game').appendChild(renderer.domElement);
  const canvas = renderer.domElement;
  const scene = new THREE.Scene();
  const CZ = !window.Mods || Mods.on('cave_cozy') !== false; // R49e：洞穴舒适化（暖色抬亮、降低雾密度与闪烁）
  scene.background = new THREE.Color(CZ ? '#2c2119' : '#0e0a08');
  scene.fog = new THREE.FogExp2(CZ ? '#3a2c21' : '#140e0a', CZ ? 0.026 : 0.045);
  const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.03, 80);
  scene.add(camera);
  const hemi = CZ ? new THREE.HemisphereLight(0xffe2c0, 0x6a5240, 1.0) : new THREE.HemisphereLight(0x8a7a6a, 0x201510, 0.55); scene.add(hemi);
  const moon = new THREE.DirectionalLight(CZ ? 0xc8d8ff : 0xaab4ff, CZ ? 0.32 : 0.18); moon.position.set(-3, 8, 2); scene.add(moon);
  const LIGHTS = []; for (let i = 0; i < 6; i++) { const l = new THREE.PointLight(0xff8a3a, 0, 9, 1.6); scene.add(l); LIGHTS.push(l); }
  // 篝火主光投射柔和阴影（立方体阴影贴图 + PCF 半径模糊）
  LIGHTS[0].castShadow = true; LIGHTS[0].shadow.mapSize.set(1024, 1024); LIGHTS[0].shadow.bias = -0.0025; LIGHTS[0].shadow.normalBias = 0.025; LIGHTS[0].shadow.radius = 5; LIGHTS[0].shadow.camera.near = 0.15; LIGHTS[0].shadow.camera.far = 16;
  const shadowize = (o) => { o.traverse(m => { if (m.isMesh && !m.userData.noShadow) { m.castShadow = true; m.receiveShadow = true; } }); return o; };
  let shadowT = 0; const shadowHeads = new Set();
  function updateHeadShadows(dt) { // 只有离镜头最近的 24 颗首级投射真实阴影（其余保留软阴影贴花）
    if ((shadowT -= dt) > 0 || !renderer.shadowMap.enabled) return; shadowT = 0.5;
    const cp = camera.getWorldPosition(new V3());
    const near = heads.filter(h => h.g.visible !== false && !h.impostor).map(h => [h, h.g.position.distanceToSquared(cp)]).filter(a => a[1] < 36).sort((a, b) => a[1] - b[1]).slice(0, 24).map(a => a[0]);
    const want = new Set(near);
    for (const h of shadowHeads) if (!want.has(h) || !heads.includes(h)) { h.g.traverse(m => { if (m.isMesh) m.castShadow = false; }); shadowHeads.delete(h); if (h.blob) h.blob.material = blobMat; }
    for (const h of want) if (!shadowHeads.has(h)) { h.hb.group.traverse(m => { if (m.isMesh && !/_mask$/.test(m.name)) m.castShadow = true; }); shadowHeads.add(h); }
  }
  const exitLight = CZ ? new THREE.PointLight(0xfff4dc, 2.6, 14, 1.4) : new THREE.PointLight(0xfff0d0, 1.4, 10, 1.5); scene.add(exitLight);
  let lodStat = null; let fpsHi = 0; const _rayP = new V3();
  const lod = LOD_ON ? HeadLOD.create(renderer, scene) : null; // 远处静止首级 → 图集替身，一次 draw call

  // ---------------- 状态 ----------------
  const fresh = () => ({ v: 3, coins: 30, hp: 150, base: { str: 5, con: 5, agi: 5, ter: 5, soul: 5 }, trained: {}, eq: { weapon: 0, helm: 0, armor: 0, charm: 0, bag: 0 }, items: { potion: 1, bigpotion: 0 }, depth: 1, builds: [], heads: [], sigs: [], names: [], logs: [], stats: { trips: 0, kills: 0, earned: 0, pokes: 0 }, nextId: 1, dead: false, intro: false });
  let S = fresh();
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) S = Object.assign(fresh(), JSON.parse(raw)); } catch (e) { console.warn(e); }
  try { if (window.Store) Store.loadVault(S); } catch (e) { console.warn('vault', e); }
  const usedSig = new Set(S.sigs), usedNames = new Set(S.names);

  // ---------------- 洞穴 ----------------
  let cave = null;
  function buildCave() {
    if (cave) Cave.dispose(cave);
    const R = BuildCat.DIG[S.depth - 1].r;
    if (window.Assets) Assets.env(renderer);
    cave = Cave.build(scene, R, S.depth);
    exitLight.position.set(cave.exitPos.x, 2.2, cave.exitPos.z - 1.5);
    scene.fog.density = (0.05 - S.depth * 0.004) * (CZ ? 0.52 : 1);
  }
  buildCave();

  // ---------------- 通用 UI 工具 ----------------
  const $ = id => document.getElementById(id);
  const ui = { coins: $('coins'), power: $('power'), hpbar: $('hpbar'), hptxt: $('hptxt'), tip: $('tip'), toast: $('toast'), labels: $('labels'), hint: $('hint'), headcount: $('headcount'), cross: $('cross'), vign: $('vign') };
  let toastT = 0;
  function toast(html, color = '#ffd890', dur = 2.4) { ui.toast.innerHTML = html; ui.toast.style.color = color; ui.toast.classList.add('show'); toastT = dur; }
  const proj = new V3();
  function screenPos(p) { proj.copy(p).project(camera); return { x: (proj.x + 1) / 2 * innerWidth, y: (1 - proj.y) / 2 * innerHeight, vis: proj.z < 1 && proj.z > -1 }; }
  function floatText(txt, pos, color = '#ffd24d', size = 22) {
    const sp = screenPos(pos); if (!sp.vis) return;
    const d = document.createElement('div'); d.className = 'float'; d.textContent = txt; d.style.left = sp.x + 'px'; d.style.top = sp.y + 'px'; d.style.color = color; d.style.fontSize = size + 'px';
    ui.labels.appendChild(d); setTimeout(() => d.remove(), 1100);
  }

  // ---------------- 粒子 ----------------
  const PMAX = 1500; let pN = 0;
  const pGeo = new THREE.BufferGeometry(); const pPos = new Float32Array(PMAX * 3), pCol = new Float32Array(PMAX * 3);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const dotTex = BuildCat.GLOW();
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.07, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  points.frustumCulled = false; scene.add(points);
  const parts = [];
  function burst(pos, color, n = 20, speed = 1.5, life = 0.8, grav = -3) {
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) { if (parts.length >= PMAX) parts.shift(); const v = new V3(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.8)); parts.push({ p: pos.clone(), v, c, life: life * (0.6 + Math.random() * 0.6), t: 0, g: grav }); }
  }
  function updateParticles(dt) {
    for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.t += dt; if (q.t > q.life) { parts.splice(i, 1); continue; } q.v.y += q.g * dt; q.p.addScaledVector(q.v, dt); }
    pN = parts.length;
    for (let i = 0; i < pN; i++) { const q = parts[i]; const f = 1 - q.t / q.life; pPos[i * 3] = q.p.x; pPos[i * 3 + 1] = q.p.y; pPos[i * 3 + 2] = q.p.z; pCol[i * 3] = q.c.r * f; pCol[i * 3 + 1] = q.c.g * f; pCol[i * 3 + 2] = q.c.b * f; }
    pGeo.setDrawRange(0, pN); pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
  }
  // 魂流：从首级飞向玩家
  const wisps = [];
  function soulWisp(from, color) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.scale.setScalar(0.14); m.position.copy(from); scene.add(m); wisps.push({ m, t: 0, from: from.clone(), mid: from.clone().add(new V3((Math.random() - 0.5) * 0.8, 0.6 + Math.random() * 0.4, (Math.random() - 0.5) * 0.8)) }); }
  function updateWisps(dt) {
    const tgt = camera.position.clone().add(new V3(0, -0.4, 0));
    for (let i = wisps.length - 1; i >= 0; i--) { const w = wisps[i]; w.t += dt * 1.8; const t = Math.min(1, w.t); const a = w.from.clone().lerp(w.mid, t), b = w.mid.clone().lerp(tgt, t); w.m.position.copy(a.lerp(b, t)); w.m.material.opacity = 1 - t * 0.5; if (t >= 1) { scene.remove(w.m); w.m.material.dispose(); wisps.splice(i, 1); } }
  }
  // 地面血迹
  const bloodTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); for (let i = 0; i < 26; i++) { const r = Math.random() * 40, a = Math.random() * 6.28; g.fillStyle = `rgba(${60 + Math.random() * 50},0,${Math.random() * 8},${0.5 + Math.random() * 0.4})`; g.beginPath(); g.arc(64 + Math.cos(a) * r * 0.8, 64 + Math.sin(a) * r * 0.8, 4 + Math.random() * (22 - r * 0.4), 0, 6.283); g.fill(); } const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; })();
  const bloodMat = new THREE.MeshStandardMaterial({ map: bloodTex, transparent: true, depthWrite: false, roughness: 0.15, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2 });
  const bloodGeo = new THREE.PlaneGeometry(1, 1); bloodGeo.rotateX(-Math.PI / 2);
  const decals = [];
  function bloodSplat(x, y, z, s = 0.4) { const m = new THREE.Mesh(bloodGeo, bloodMat); m.position.set(x, y + 0.004 + decals.length * 0.00002, z); m.rotation.y = Math.random() * 6.28; m.scale.setScalar(s * (0.7 + Math.random() * 0.6)); m.renderOrder = -1; scene.add(m); decals.push(m); if (decals.length > 90) scene.remove(decals.shift()); }

  // ---------------- 属性 ----------------
  let bonusCache = null;
  function buildBonus() {
    if (bonusCache) return bonusCache;
    const o = { str: 0, con: 0, agi: 0, ter: 0, soul: 0, regen: 0 };
    for (const b of builds) { const d = CAT[b.type]; if (d.stat) for (const k in d.stat) o[k] += d.stat[k]; if (d.regen) o.regen += d.regen; }
    return (bonusCache = o);
  }
  // 第二十二轮：展示在洞里的首级魂印给玩家属性（guardian/warlord/windrunner/keeper/regen/porter/mentor），每种最多计 5 颗；1 秒缓存
  let hbC = { t: -9, o: null };
  function headBonus() {
    const now = performance.now(); if (hbC.o && now - hbC.t < 1000) return hbC.o; hbC.t = now;
    const n = {}; for (const h of heads) if (h.mount && h.rec.c.aff) for (const k of h.rec.c.aff) n[k] = (n[k] || 0) + 1;
    const m = k => Math.min(5, n[k] || 0), o = { hp: m('guardian') * 12, str: m('warlord'), ter: m('warlord'), agi: m('windrunner') * 2, soul: m('keeper'), regen: m('regen') * 0.4, cap: Math.min(3, n.porter || 0), xp: m('mentor') * 0.06 };
    o.any = !!(o.hp || o.str || o.agi || o.soul || o.regen || o.cap || o.xp); return (hbC.o = o);
  }
  function xpMul() { return 1 + headBonus().xp; }
  function st() {
    const b = buildBonus(), hb = headBonus(), pb = window.Props ? Props.bonus() : null; if (!hb.any && !pb) return RPG.stats(S, b);
    const m = Object.assign({}, b); for (const k of ['hp', 'str', 'ter', 'agi', 'soul', 'regen', 'cap']) m[k] = (m[k] || 0) + (hb[k] || 0) + (pb ? pb[k] || 0 : 0); return RPG.stats(S, m);
  }

  // ---------------- 首级 ----------------
  const heads = [];
  const hitGeo = new THREE.SphereGeometry(RC * 1.05, 10, 8), hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32); rg.addColorStop(0, 'rgba(0,0,0,0.6)'); rg.addColorStop(0.6, 'rgba(0,0,0,0.25)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false });
  const blobGeo = new THREE.PlaneGeometry(1, 1); blobGeo.rotateX(-Math.PI / 2);
  const hasAff = (h, k) => !!(h && h.rec.c.aff && h.rec.c.aff.includes(k));
  function yieldOf(rec) {
    const c = rec.c; let y = RAR[c.rar].y;
    if (c.aff && c.aff.includes('greed')) y *= 1.5;
    if (c.aff && c.aff.length) { if (c.aff.includes('scholar')) y *= 1.25; if (c.aff.includes('noble')) y *= 1.2; if (c.aff.includes('sage')) y *= 1.4; }
    if (c.shiny) y *= 3;
    if (c.aff && c.aff.includes('eternal')) y *= 1 + Math.min(1.2, (Date.now() - (rec.date || Date.now())) / 86400000 * 0.08);
    if (rec.calm) y *= 1.5; // 通灵后安抚
    return y;
  }
  // 神魂 / 异色：环绕的魂光粒子
  const auraTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const rg = g.createRadialGradient(16, 16, 0, 16, 16, 16); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.35, 'rgba(255,255,255,0.5)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
  function makeAura(col, n) {
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r = 0.12 + Math.random() * 0.2; pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = Math.random() * 0.5 - 0.15; pos[i * 3 + 2] = Math.sin(a) * r; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ map: auraTex, color: col, size: 0.05, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    return p;
  }
  const HOOK = { frame: [], e: [], click: [], tip: [], pre: [] }; // pre：相机就位后、渲染前（第十四轮：屏震/第三人称）
  function rebuildHead(h) {
    const rec = h.rec, old = h.hb; h.g.remove(old.group); old.dispose();
    const hb = ModelHeads.create(rec.look); hb.group.scale.setScalar(HS); hb.group.position.y = -0.005; h.g.add(hb.group);
    if (old.glow) hb.glow = old.glow; h.hb = hb; h.yield = yieldOf(rec); return h;
  }
  function prepLook(rec) {
    if (rec.look.hw === undefined && window.HeadWear) rec.look.hw = HeadWear.roll(rec.look.seed || rec.id, rec.c, rec.look);
    if (!rec.look.mk) { let s = ((rec.look.seed || rec.id) * 9301 + 49297) % 233280; const rr = () => (s = (s * 9301 + 49297) % 233280) / 233280; rec.look.mk = [rr() < 0.5 ? +(0.35 + rr() * 0.6).toFixed(2) : 0, rr() < 0.2 ? 1 + Math.floor(rr() * 3) : 0, rr() < 0.13 ? 1 : 0]; }
  }
  // 第十六轮：倒袋卡顿 —— 新脸模首次渲染要编译约 11 个着色器。回洞转场时就把袋里的首级预先造好并编译/渲染一次，倒袋时直接取用
  const PREHB = new Map();
  function prebuildHeads(recs) {
    const grp = new THREE.Group(); { const cp = camera.getWorldPosition(new V3()), cd = camera.getWorldDirection(new V3()); grp.position.copy(cp).addScaledVector(cd, 2.5); } // 第十九轮：相机前（离屏渲染看不见）
    for (const r of recs) { if (PREHB.has(r.id)) continue; try { prepLook(r); const hb = ModelHeads.create(r.look); hb.group.scale.setScalar(HS); grp.add(hb.group); PREHB.set(r.id, hb); } catch (e) { console.warn('prebuild', e); } }
    if (!grp.children.length) return; scene.add(grp);
    if (!prebuildHeads.beam) { prebuildHeads.beam = 1; try { const bm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1, 8, 1, true), new THREE.MeshBasicMaterial({ map: beamTex, color: '#fff', transparent: true, opacity: 0.01, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); grp.add(bm); } catch (e) {} } // 光柱材质也预编
    if (window.Foe && Foe.warm) Foe.warm(renderer, scene, camera); else try { renderer.compile(scene, camera); renderer.render(scene, camera); } catch (e) { console.warn('prewarm heads', e); }
    grp.children.slice().forEach(c => grp.remove(c)); scene.remove(grp);
  }
  function createHead(rec, pos, quat) {
    prepLook(rec);
    const hb = PREHB.get(rec.id) || ModelHeads.create(rec.look); PREHB.delete(rec.id); hb.group.position.set(0, 0, 0); hb.group.quaternion.identity();
    const g = new THREE.Group(); hb.group.scale.setScalar(HS); hb.group.position.y = -0.005; g.add(hb.group);
    const hit = new THREE.Mesh(hitGeo, hitMat); g.add(hit);
    if (rec.c.rar >= 2) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: RAR[rec.c.rar].c, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.setScalar(rec.c.rar >= 3 ? 0.55 : 0.42); g.add(sp); hb.glow = sp; }
    g.position.copy(pos); if (quat) g.quaternion.copy(quat);
    scene.add(g);
    const blob = new THREE.Mesh(blobGeo, blobMat); blob.scale.setScalar(0.4); blob.renderOrder = -1; scene.add(blob);
    const h = { rec, hb, g, hit, blob, vel: new V3(), av: new V3(), mount: null, lastPoke: -9, squash: 0, sleep: 0, grounded: false, idx: 0,
      sway: new V3(), swayV: new V3(), prevVel: new V3(), yield: yieldOf(rec) };
    if (rec.c.rar >= 4 || rec.c.shiny) { h.aura = makeAura(rec.c.shiny ? '#fff2b0' : RAR[rec.c.rar].c, rec.c.shiny ? 22 : 14); scene.add(h.aura); }
    hit.userData.head = h;
    heads.push(h);
    return h;
  }
  function despawnHead(h) { // 只拆 3D，不删记录（入魂库用）
    const i = heads.indexOf(h); if (i >= 0) heads.splice(i, 1);
    if (lod) lod.release(h);
    if (h.mount) h.mount.heads[h.slot] = null;
    if (held === h) held = null;
    scene.remove(h.g); scene.remove(h.blob); if (h.aura) { scene.remove(h.aura); h.aura.geometry.dispose(); h.aura.material.dispose(); } h.hb.dispose(); if (h.hb.glow) h.hb.glow.material.dispose();
  }
  // 魂库：存入 / 取出
  function vaultCount() { let n = 0; for (const r of S.heads) if (r.vault) n++; return n; }
  function storeHead(h) { if (!h || h === held && cine) return false; const rec = h.rec; despawnHead(h); rec.vault = true; rec.inBag = false; delete rec.p; delete rec.q; rec.mt = -1; return true; }
  function takeOut(rec, pos) {
    if (!rec || !rec.vault) return null;
    if (heads.length >= MAX_HEADS) { toast(`洞里已有 ${heads.length} 颗（上限 ${MAX_HEADS}），先存几颗进魂库`, '#f88'); return null; }
    rec.vault = false; rec.vv = (rec.vv || 0) + 1;
    const fwd = new V3(); camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
    const p = pos || player.pos.clone().addScaledVector(fwd, 1.0).setY(1.2);
    const h = createHead(rec, p, null); h.vel.set((Math.random() - 0.5) * 0.4, 0.6, (Math.random() - 0.5) * 0.4); return h;
  }
  function storeLoose() { // 一键收纳：没上架、没被拿着的散落首级全部入库
    const list = heads.filter(h => !h.mount && h !== held); list.forEach(storeHead); save(); return list.length;
  }
  function removeHead(h) {
    const i = heads.indexOf(h); if (i >= 0) heads.splice(i, 1);
    if (lod) lod.release(h);
    if (h.mount) h.mount.heads[h.slot] = null;
    if (held === h) held = null;
    scene.remove(h.g); scene.remove(h.blob); if (h.aura) { scene.remove(h.aura); h.aura.geometry.dispose(); h.aura.material.dispose(); } h.hb.dispose(); if (h.hb.glow) h.hb.glow.material.dispose();
    const j = S.heads.indexOf(h.rec); if (j >= 0) S.heads.splice(j, 1);
  }
  function headOf(id) { return heads.find(h => h.rec.id === id); }

  // ---------------- 建造 ----------------
  const builds = [];
  const colliders = [];
  // rot = 以 90° 为单位的浮点数（0.25 = 22.5°），支持任意角度；碰撞盒取旋转后外接 AABB
  function rotAabb(a, rot, x, z) {
    const [x0, y0, z0, x1, y1, z1] = a, t = -rot * Math.PI / 2, c = Math.cos(t), sn = Math.sin(t);
    let mnx = 1e9, mnz = 1e9, mxx = -1e9, mxz = -1e9;
    for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) { const wx = px * c + pz * sn, wz = -px * sn + pz * c; mnx = Math.min(mnx, wx); mxx = Math.max(mxx, wx); mnz = Math.min(mnz, wz); mxz = Math.max(mxz, wz); }
    return { min: new V3(x + mnx, y0, z + mnz), max: new V3(x + mxx, y1, z + mxz) };
  }
  function fpOf(type, rot) { const f = CAT[type].fp, t = rot * Math.PI / 2, c = Math.abs(Math.cos(t)), sn = Math.abs(Math.sin(t)); return [f[0] * c + f[1] * sn, f[0] * sn + f[1] * c]; }
  function rebuildColliders() { colliders.length = 0; for (const b of builds) { const d = CAT[b.type]; const [hx, hz] = CAT[b.type].fp; for (const a of (d.cols ? d.cols(hx, hz) : [])) colliders.push(Object.assign(rotAabb(a, b.rot, b.x, b.z), { b })); } bonusCache = null; }
  function addBuild(type, x, z, rot = 0, save = true) {
    const d = CAT[type]; const g = d.make(); g.position.set(x, 0, z); g.rotation.y = -rot * Math.PI / 2;
    shadowize(g); scene.add(g);
    const b = { type, x, z, rot, g, heads: d.mount ? slotsOf(d).map(() => null) : null, timer: Math.random() * (d.mount ? d.mount.period : d.period || 5) };
    if (d.mount) {
      const lab = document.createElement('div'); lab.className = 'wlabel'; lab.innerHTML = '<div class="pbar"><i></i></div>'; ui.labels.appendChild(lab); b.label = lab;
    }
    builds.push(b); rebuildColliders(); if (save) persistBuilds();
    return b;
  }
  function removeBuild(b) {
    const i = builds.indexOf(b); if (i >= 0) builds.splice(i, 1);
    if (b.heads) { b.heads.forEach(h => { if (h) { h.mount = null; h.sleep = 0; } }); b.heads.fill(null); }
    scene.remove(b.g); if (b.label) b.label.remove();
    b.g.traverse(o => { if (o.isMesh && !o.geometry.__shared) o.geometry.dispose(); });
    rebuildColliders(); persistBuilds();
  }
  function persistBuilds() { S.builds = builds.map(b => ({ type: b.type, x: +b.x.toFixed(2), z: +b.z.toFixed(2), rot: +(+b.rot).toFixed(4) })); }
  const bought = k => builds.filter(b => b.type === k).length;
  const cost = k => Math.round(CAT[k].base * Math.pow(CAT[k].grow, bought(k)));
  // ---- 展示位：一个建筑可有多个插槽（mount.slots = [[lx, ly, lz, yaw?], ...]）----
  function slotsOf(d) { return d.mount.slots || [[0, d.mount.y, 0]]; }
  function mountPos(b, i = 0) { const s = slotsOf(CAT[b.type])[i] || [0, CAT[b.type].mount.y, 0]; const a = -b.rot * Math.PI / 2, c = Math.cos(a), sn = Math.sin(a); return new V3(b.x + s[0] * c + s[2] * sn, s[1] + RC * 0.8, b.z - s[0] * sn + s[2] * c); }
  // 让首级的颈部切口中心（而不是模型原点）对准尖桩 / 台面 —— 各模型切口位置不同（z 最多差 5cm）
  const _so = new V3();
  function seatHead(h, b, i) {
    const d = CAT[b.type], s = slotsOf(d)[i] || [0, d.mount.y, 0];
    const a = -b.rot * Math.PI / 2, c = Math.cos(a), sn = Math.sin(a);
    const m = h.hb.meta || {}, cut = m.cut || { x: 0, y: m.bottom != null ? m.bottom : -0.1, z: 0 };
    _so.set((cut.x || 0) * HS, (cut.y != null ? cut.y : -0.1) * HS - 0.005, (cut.z || 0) * HS).applyQuaternion(h.g.quaternion);
    const y = d.mount.top != null ? d.mount.top - 0.003 : s[1] - 0.02;
    h.g.position.set(b.x + s[0] * c + s[2] * sn - _so.x, y - _so.y, b.z - s[0] * sn + s[2] * c - _so.z);
  }
  function firstHead(b) { return b && b.heads ? b.heads.find(Boolean) || null : null; }
  function nearestHead(b, pt) { if (!b || !b.heads) return null; let best = null, bd = 1e9; b.heads.forEach(h => { if (!h) return; const d = pt ? h.g.position.distanceToSquared(pt) : 0; if (d < bd) { bd = d; best = h; } }); return best; }
  function freeSlot(b, pt) { if (!b || !b.heads) return -1; let bi = -1, bd = 1e9; b.heads.forEach((h, i) => { if (h) return; const d = pt ? mountPos(b, i).distanceToSquared(pt) : i; if (d < bd) { bd = d; bi = i; } }); return bi; }
  // 共鸣：满座 / 同族 / 同阶，多插槽展示位的额外倍率
  function resonance(b) {
    const n = b.heads ? b.heads.length : 0, hs = n ? b.heads.filter(Boolean) : [];
    if (n < 2 || hs.length < 2) return { mul: 1, tags: [] };
    const tags = []; let mul = 1;
    if (hs.length === n) { mul += 0.25; tags.push('满座'); }
    if (hs.every(h => h.rec.c.race === hs[0].rec.c.race)) { mul += 0.15 * hs.length; tags.push('同族'); }
    if (hs.every(h => h.rec.c.rar === hs[0].rec.c.rar)) { mul += 0.1 * hs.length; tags.push('同阶'); }
    const ch = hs.filter(h => hasAff(h, 'choir')).length; if (ch) { mul += 0.3 * ch; tags.push('共鸣体'); }
    return { mul, tags };
  }
  function mountHead(h, b, i) {
    if (h.mount || !b.heads) return false;
    { const mt = CAT[b.type] && CAT[b.type].mount; if (mt && mt.accept && !mt.accept(h)) { if (mt.deny) { SFX.deny(); toast(mt.deny(h), '#fb8', 2.6); } return false; } } /* 第二十六轮(k)：只收特定首级的展位（霸主合成器） */
    if (i == null || i < 0) i = freeSlot(b);
    if (i < 0 || b.heads[i]) return false;
    if (held === h) held = null;
    b.heads[i] = h; h.mount = b; h.slot = i; h.vel.set(0, 0, 0); h.av.set(0, 0, 0); h.sleep = 0;
    const s = slotsOf(CAT[b.type])[i];
    h.g.quaternion.setFromEuler(new THREE.Euler(0, -b.rot * Math.PI / 2 + (s[3] != null ? s[3] : Math.PI), 0)); seatHead(h, b, i);
    SFX.chop(); SFX.squish(0.8); burst(h.g.position, '#8a0010', 26, 1.2, 0.7, -6); if (b.heads.filter(Boolean).length === 1) b.timer = 0;
    bloodSplat(h.g.position.x + 0.05, 0, h.g.position.z + 0.03, 0.35);
    const rs = resonance(b); if (rs.tags.length && b.heads.length > 1) toast(`${CAT[b.type].n}：${rs.tags.join(' · ')} 共鸣 ×${rs.mul.toFixed(2)}`, '#ffcf7a', 2);
    return true;
  }
  function unmount(h) { if (!h.mount) return; h.mount.heads[h.slot] = null; h.mount = null; h.sleep = 0; }

  // 灯光分配
  function lightSources() {
    const L = [{ p: cave.firePos, c: CZ ? '#ffb468' : '#ff8a3a', k: CZ ? 2.7 : 2.4, fire: true }];
    for (const b of builds) { const d = CAT[b.type]; if (d.light) L.push({ p: new V3(b.x, 1.2, b.z), c: d.light, k: d.type === 'torch' ? 1.2 : 1.1, fire: /ff/.test(d.light), b }); }
    return L;
  }
  let lightList = [], lightTimer = 0;
  function assignLights() {
    const src = lightSources(); const cp = camera.position;
    src.sort((a, b) => a.p.distanceToSquared(cp) - b.p.distanceToSquared(cp));
    lightList = src.slice(0, LIGHTS.length);
    LIGHTS.forEach((l, i) => { const s = lightList[i]; if (!s) { l.intensity = 0; return; } l.position.copy(s.p); if (i === 0 && s.fire) l.position.y = Math.max(l.position.y, 0.95); l.color.set(s.c); l.userData.k = s.k; l.userData.fire = s.fire; l.distance = CZ ? (s === src[0] && s.fire ? 16 : 9) : (s === src[0] && s.fire ? 12 : 7); });
  }

  // ---------------- 视角模型（食人魔的手+武器） ----------------
  const vm = new THREE.Group(); camera.add(vm); vm.position.set(0.42, -0.42, -0.62);
  const ogreSkin = new THREE.MeshStandardMaterial({ color: '#5a7a3a', roughness: 0.75 });
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.1, 0.7, 12), ogreSkin); arm.rotation.x = Math.PI / 2 - 0.3; arm.position.set(0.06, -0.08, 0.28); vm.add(arm);
  const fist = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), ogreSkin); fist.scale.set(1, 0.9, 1.15); fist.position.set(0, 0.02, -0.05); vm.add(fist);
  let weaponMesh = null;
  function makeWeapon(tier) {
    const M = BuildCat.M; const g = new THREE.Group();
    const shaft = (l, r, mat) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.1, l, 8), mat); s.position.y = l / 2 - 0.1; g.add(s); return s; };
    if (tier === 0) { const s = shaft(0.8, 0.035, M.wood); s.scale.set(1, 1, 1); const k = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.04, 0.3, 8), M.wood); k.position.y = 0.55; g.add(k); }
    else if (tier === 1) { shaft(0.8, 0.035, M.wood); const k = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.05, 0.3, 8), M.wood); k.position.y = 0.55; g.add(k); for (let i = 0; i < 10; i++) { const n = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.07, 4), M.iron); const a = i * 2.4; n.position.set(Math.cos(a) * 0.075, 0.45 + (i % 4) * 0.06, Math.sin(a) * 0.075); n.rotation.z = -Math.cos(a) * 1.57; n.rotation.x = Math.sin(a) * 1.57; g.add(n); } }
    else if (tier === 2) { shaft(0.5, 0.03, M.bone); const bl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.02), M.bone); bl.position.set(0.06, 0.55, 0); g.add(bl); }
    else if (tier === 3) { shaft(0.45, 0.03, M.iron); const ch = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 4, 8), M.iron); ch.position.y = 0.4; g.add(ch); const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), M.iron); ball.position.set(0.05, 0.55, 0); g.add(ball); }
    else if (tier === 4) { shaft(0.9, 0.03, M.wood); const ax = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 16, 1, false, 0, Math.PI), M.iron); ax.rotation.set(0, 0, Math.PI / 2); ax.rotation.x = Math.PI / 2; ax.position.set(0.02, 0.62, 0); g.add(ax); }
    else if (tier === 5) { shaft(1.0, 0.025, new THREE.MeshStandardMaterial({ color: '#2a1a3a' })); const bl = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.018, 6, 24, Math.PI * 0.9), new THREE.MeshStandardMaterial({ color: '#c8c8ff', emissive: '#4a3aff', emissiveIntensity: 0.6, metalness: 1, roughness: 0.2 })); bl.position.set(0.22, 0.8, 0); g.add(bl); }
    else { shaft(0.4, 0.035, M.gold); const bl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.02), new THREE.MeshStandardMaterial({ color: '#1a0a0a', emissive: '#aa1010', emissiveIntensity: 0.8, metalness: 1, roughness: 0.25 })); bl.position.y = 0.75; g.add(bl); }
    g.rotation.set(-0.6, 0, -0.35); g.position.set(0, 0.02, -0.06);
    return g;
  }
  // 第十三轮：Poly Haven CC0 武器模型（自动找长轴、细端为握柄），缺失时退回旧模型
  const WPN_ASSET = [['baseball_bat', 0.8], ['ornate_medieval_mace', 0.72], ['machete', 0.72, null, 1], ['ornate_war_hammer', 0.8], ['wooden_axe_02', 0.85, null, 1], ['antique_katana_01', 1.0, '#6a4aff'], ['antique_estoc', 1.08, '#ff2020', 1]];
  function assetWeapon(tier) {
    const W = WPN_ASSET[Math.min(tier, WPN_ASSET.length - 1)]; if (!window.Assets || !Assets.has(W[0])) return null;
    const src = Assets.clone(W[0]); src.updateMatrixWorld(true);
    const pts = []; src.traverse(o => { if (o.isMesh) { const pa = o.geometry.attributes.position; const v = new V3(); for (let i = 0; i < pa.count; i += 3) { v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld); pts.push(v.clone()); } } });
    const bb = new THREE.Box3().setFromPoints(pts), sz = bb.getSize(new V3()), c = bb.getCenter(new V3());
    const ax = sz.x > sz.y ? (sz.x > sz.z ? 'x' : 'z') : (sz.y > sz.z ? 'y' : 'z'); const len = sz[ax];
    // 两端 15% 段的横截面散布：细的一端是握柄
    let lo = 0, hi = 0, nl = 0, nh = 0; const others = ['x', 'y', 'z'].filter(k => k !== ax);
    for (const q of pts) { const t = (q[ax] - bb.min[ax]) / len; const w = Math.hypot(q[others[0]] - c[others[0]], q[others[1]] - c[others[1]]); if (t < 0.15) { lo += w; nl++; } else if (t > 0.85) { hi += w; nh++; } }
    const handleAtMin = ((lo / Math.max(1, nl)) < (hi / Math.max(1, nh))) !== !!W[3]; // W[3]=1：自动判断反了（R41主管：砍刀的扁刀身比木柄“细”，原来握在刀刃上）
    { let sx = 0, sy = 0, n = 0; for (const q of pts) { const t = (q[ax] - bb.min[ax]) / len; if (handleAtMin ? t < 0.12 : t > 0.88) { sx += q[others[0]]; sy += q[others[1]]; n++; } } if (n > 3) { c[others[0]] = sx / n; c[others[1]] = sy / n; } } // R41主管：以握柄那端的截面中心为轴（弯柄斧子/偏心刀头以前手够不到柄）
    const inner = new THREE.Group(); src.position.sub(c); inner.add(src);
    const dir = new V3(ax === 'x' ? 1 : 0, ax === 'y' ? 1 : 0, ax === 'z' ? 1 : 0).multiplyScalar(handleAtMin ? 1 : -1);
    inner.quaternion.setFromUnitVectors(dir, new V3(0, 1, 0));
    const k = W[1] / len; const g = new THREE.Group(); inner.scale.setScalar(k); inner.position.y = W[1] / 2 - 0.12; g.add(inner);
    if (W[2]) src.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.emissive = new THREE.Color(W[2]); o.material.emissiveIntensity = 0.35; o.material.emissiveMap = o.material.map; } });
    g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    g.rotation.set(-0.6, 0, -0.35); g.position.set(0, 0.02, -0.06); g.userData.asset = 1; g.userData.len = W[1];
    return g;
  }
  function refreshWeapon() { if (weaponMesh) vm.remove(weaponMesh); weaponMesh = assetWeapon(S.eq.weapon || 0) || makeWeapon(S.eq.weapon || 0); fist.visible = !weaponMesh.userData.asset; vm.add(weaponMesh); if (window.Combat && Combat.onWeapon) try { Combat.onWeapon(); } catch (e) {} }
  refreshWeapon();
  let swing = 0;

  // ---------------- 玩家与输入 ----------------
  const player = { pos: new V3(0, 0, 2.5), vel: new V3(), yaw: 0, pitch: -0.15, h: 1.45, onGround: true, crouch: 0 };
  const keys = {};
  let locked = false, noLock = false, playing = false, uiOpen = false;
  const ray = new THREE.Raycaster(); ray.far = 3.4;
  let film = null; // 电影模式：自由镜头
  let hplace = null, eDown = 0, eLong = false;
  let held = null, bagGroup = null, bagCarrying = false, heldYaw = 0, heldFace = 0, buildMode = null, buildRot = 0, ghost = null, ghostOk = false;
  const lastHeldPos = new V3(), heldVel = new V3();
  // 锁鼠标失败（比如刚退出锁定 1 秒内再请求、或不是用户手势触发）只是暂时的：下次点画面就重锁，不再永久退回拖拽模式
  let lockRetry = false;
  if (!canvas.requestPointerLock) noLock = true;
  function lockFailed() { lockRetry = true; startPlaying(); try { toast('🖱️ 点一下画面锁定鼠标'); } catch (e) {} }
  function lockPointer() { if (noLock) { startPlaying(); return; } try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => lockFailed()); } catch (e) { lockFailed(); } }
  function startPlaying() { playing = true; $('menu').classList.add('hidden'); SFX.music('cave'); if (uiOpen && document.pointerLockElement) document.exitPointerLock(); }
  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
    if (locked) { lockRetry = false; startPlaying(); }
    else if (!noLock && !uiOpen && !lockRetry) { playing = false; $('menu').classList.remove('hidden'); save(); }
  });
  document.addEventListener('pointerlockerror', () => lockFailed());
  function setUI(open) { uiOpen = open; if (open) { if (document.pointerLockElement) document.exitPointerLock(); } else if (playing && !noLock) setTimeout(() => { if (playing && !uiOpen && !document.pointerLockElement && !film) lockPointer(); }, 60); /* R37：关面板后自动尝试重新锁定（ESC 关闭时浏览器会拒绝 → 走 lockFailed 提示，点一下画面即可） */ }
  // R37（用户：“有时候鼠标出现之后点不回去游戏了，没法按 ESC 也没法锁定鼠标”）——鼠标找回：
  //  1) 游戏中（playing 且没开 UI）鼠标没被锁定 → 屏幕下方常驻提示“点击画面回到游戏”，任意位置按下（不是按钮/输入框）就重新锁定；
  //  2) 某个面板异常退出导致 uiOpen 卡死：按 ESC（250ms 后屏幕中心是画面而不是面板）或连点画面 3 次 → 强制复位 uiOpen 并重新锁定；
  //  3) Esc 被浏览器吞掉、Chrome 要求“用户手势”才能再次 requestPointerLock：所以一律用 mousedown 手势重试。
  const relockNeeded = () => playing && !uiOpen && !noLock && !locked && !document.pointerLockElement && !film;
  { const hint = document.createElement('div'); hint.id = 'relockHint'; hint.textContent = '🖱️ 鼠标已释放 — 点击画面回到游戏';
    hint.style.cssText = 'position:fixed;left:50%;bottom:9vh;transform:translateX(-50%);z-index:99999;padding:10px 22px;border-radius:999px;background:rgba(20,10,10,.82);border:1px solid #ffcf80;color:#ffe2a8;font:600 16px/1.2 system-ui,sans-serif;pointer-events:none;display:none;box-shadow:0 4px 24px #000a';
    document.body.appendChild(hint); setInterval(() => { const d = relockNeeded() ? 'block' : 'none'; if (hint.style.display !== d) hint.style.display = d; }, 250); }
  let stuckClicks = [];
  const unstick = (why) => { if (!uiOpen) return false; uiOpen = false; lockRetry = true; try { toast('🖱️ ' + (why || '界面已复位') + ' — 点一下画面锁定鼠标'); } catch (e) {} return true; };
  document.addEventListener('mousedown', e => {
    if (e.target === canvas && uiOpen && playing) { const n = performance.now(); stuckClicks = stuckClicks.filter(t => n - t < 2500); stuckClicks.push(n); if (stuckClicks.length >= 3) { stuckClicks = []; unstick('检测到界面卡住'); } return; }
    if (!relockNeeded()) return; const t = e.target; if (t && t.closest && t.closest('button,a,input,select,textarea,label,[data-act],[contenteditable]')) return;
    lockRetry = true; if (e.target !== canvas) { try { lockPointer(); } catch (err) {} }
  }, true);
  document.addEventListener('keydown', e => {
    if (e.code !== 'Escape' || !uiOpen || !playing) return;
    setTimeout(() => { if (!uiOpen) return; const top = (document.elementsFromPoint ? document.elementsFromPoint(innerWidth / 2, innerHeight / 2) : [])[0]; if (!top || top === canvas || top === document.body || top === document.documentElement || top.id === 'relockHint') unstick('界面已复位'); }, 250);
  }, false);
  let dragLook = false, dragMoved = 0, mouseDown = false;
  document.addEventListener('mousemove', e => {
    if (!playing || uiOpen) return;
    if (!locked && !(noLock && dragLook)) return;
    let dx = e.movementX, dy = e.movementY; if (Math.abs(dx) > 250 || Math.abs(dy) > 250) return;
    if (window.Combat && Combat.drawn) { const k = Combat.onMove(dx, dy); dx *= k; dy *= k; } // 第十四轮：挥砍/格挡时鼠标主要控制武器
    if (noLock) dragMoved += Math.abs(dx) + Math.abs(dy);
    player.yaw -= dx * 0.0022; player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch - dy * 0.0022));
  });
  canvas.addEventListener('mousedown', e => {
    if (uiOpen) return;
    if (!playing) return;
    if (lockRetry && !locked) { lockRetry = false; lockPointer(); return; }
    if (window.Worlds && Worlds.active) { Worlds.onDown(e.button); return; }
    if (window.Combat && Combat.drawn && !hplace && !buildMode && !held && Combat.onDown(e.button)) { if (noLock && e.button === 0) { dragLook = true; dragMoved = 99; } return; }
    if (noLock && e.button === 0) { dragLook = true; dragMoved = 0; mouseDown = true; return; }
    if (cine) { cine.fast = true; return; }
    if (e.button === 0) mouseDown = true;
    action(e.button);
  });
  document.addEventListener('mouseup', e => { if (window.Combat && Combat.drawn) Combat.onUp(e.button); if (e.button === 0) mouseDown = false; if (noLock && dragLook && e.button === 0) { dragLook = false; if (dragMoved < 6) action(0); } });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('wheel', e => { if (!playing || uiOpen) return; if (film && !held) { e.preventDefault(); camera.fov = Math.max(12, Math.min(95, camera.fov * (e.deltaY > 0 ? 1.06 : 0.94))); camera.updateProjectionMatrix(); return; } if (hplace) { e.preventDefault(); hplace.yaw += Math.sign(e.deltaY) * (e.shiftKey ? Math.PI / 36 : Math.PI / 12); return; } if (held) { e.preventDefault(); heldYaw += Math.sign(e.deltaY) * 0.32; } }, { passive: false });
  let lastX = 0;
  document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (hplace && e.code === 'Escape') { cancelHP(); return; }
    if (window.Worlds && Worlds.active && playing && !uiOpen && Worlds.onKey(e)) return;
    if (window.UI && UI.onKey(e)) return;
    if (!playing || uiOpen) return;
    if (e.code === 'KeyP' && (!window.Mods || Mods.on('film'))) { toggleFilm(); return; }
    if (e.code === 'KeyG' && held) { placeHeld(); return; }
    if (film && (e.code === 'BracketLeft' || e.code === 'BracketRight')) { film.sp = Math.max(0.3, Math.min(12, film.sp * (e.code === 'BracketRight' ? 1.4 : 0.7))); toast('镜头速度 ' + film.sp.toFixed(1), '#ccc', 0.8); return; }
    if (e.code === 'KeyE') { if (e.repeat) return; if (hplace) { confirmHP(); return; } eDown = performance.now(); eLong = false; return; } // 短按 = 松开时交互；长按 = 摆放模式
    if (e.code === 'KeyR' && hplace) { hplace.pose = (hplace.pose + (e.shiftKey ? RESTS.length - 1 : 1)) % RESTS.length; SFX.click(); toast('姿势：' + HP_POSE[hplace.pose], '#8fe0a0', 0.9); return; }
    if (e.code === 'KeyF') { const lh0 = window.Recall && Recall.on() && !held ? (lookHit() || {}).head : null; if (window.Combat && Combat.enabled && !held && !lh0 && !hplace && !buildMode && !bagCarrying) Combat.toggle(); else inspectLook(); } // 回忆：手里/看着首级时 F = 回忆她
    if (e.code === 'KeyI') inspectLook();
    if (e.code === 'KeyR' && buildMode) { buildRot = ((buildRot + (e.shiftKey ? -0.125 : 0.125)) % 4 + 4) % 4; SFX.click(); toast(`旋转 ${Math.round(buildRot * 90)}°（R / Shift+R，每次 11.25°）`, '#8fe0a0', 0.8); }
    if (e.code === 'KeyQ' && held) throwHeld(true);
    if (e.code === 'KeyQ' && bagCarrying) { bagCarrying = false; if (bagGroup) { bagGroup.position.copy(player.pos).add(new V3(0, 0, -0.8)); bagGroup.position.y = 0; } toast('你放下了麻袋。靠近它按 E 再扛起。', '#ccc'); }
    if (e.code === 'KeyV' && held) cycleHeldFace();
    if (e.code === 'KeyH' && window.Sack && Sack.on()) { Sack.quickUse(); return; }
    if (e.code === 'KeyH') useItem(S.items.bigpotion && st().maxHp - S.hp > st().maxHp * 0.6 ? 'bigpotion' : 'potion');
    if (e.code === 'KeyM') { const on = SFX.toggleMusic(); toast('音乐 ' + (on ? '开' : '关'), '#ccc', 1); }
    if (e.code === 'KeyX') { const t = performance.now(); if (t - lastX < 450) { doubleX(); lastX = 0; } else { lastX = t; toast('再按一次 X：碾碎首级吸魂 / 拆除建筑', '#f88', 1); } }
    if (e.code === 'Escape' && buildMode) cancelBuild();
  });
  document.addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'KeyE' && eDown) { const long = eLong; eDown = 0; if (!long && playing && !uiOpen) interactE(); } });

  // 准星目标：射线命中 → 该头；否则 3m 内、与视线夹角 < ~6.5° 的最接近视线中心者（不隔建筑）
  const _tf = new V3(), _tv = new V3();
  function targetHead(hit) {
    if (hit === undefined) hit = lookHit();
    if (hit && hit.head && hit.d < 3.2) return hit.head;
    camera.getWorldDirection(_tf); let best = null, bc = 0.9935;
    for (const h of heads) {
      if (h === held) continue; _tv.subVectors(h.g.position, camera.position); const d = _tv.length(); if (d > 3.0 || d < 1e-3) continue;
      const c = _tv.dot(_tf) / d; if (c > bc && (!hit || !hit.build || hit.d + 0.35 > d)) { bc = c; best = h; }
    }
    return best;
  }
  function lookHit() {
    ray.setFromCamera({ x: 0, y: 0 }, camera);
    const hs = ray.intersectObjects(heads.filter(h => h !== held).map(h => h.hit), false);
    const bs = ray.intersectObjects(builds.map(b => b.g), true);
    const hh = hs[0], bb = bs[0];
    if (hh && (!bb || hh.distance <= bb.distance + 0.05)) return { head: hh.object.userData.head, d: hh.distance, point: hh.point };
    if (bb) { let o = bb.object; while (o && !builds.find(b => b.g === o)) o = o.parent; return { build: builds.find(b => b.g === o), d: bb.distance, point: bb.point }; }
    return null;
  }
  function action(btn) {
    if (hplace) { if (btn === 0) confirmHP(); else if (btn === 2) cancelHP(); return; }
    if (buildMode) { if (btn === 0) placeBuild(); else cancelBuild(); return; }
    if (btn === 2) { if (bagCarrying) { bagCarrying = false; if (bagGroup) { bagGroup.position.copy(player.pos).add(new V3(0, 0, -0.8)); bagGroup.position.y = 0; } toast('麻袋放下了。', '#ccc'); } else if (held) throwHeld(false); return; }
    if (btn === 0) for (const f of HOOK.click) { try { if (f()) return; } catch (e) { console.warn(e); } }
    swing = 1;
    if (held) { poke(held, 'hold'); return; }
    const hit = lookHit();
    if (hit && hit.head) poke(hit.head, 'manual', hit.point);
    else if (hit && hit.build && firstHead(hit.build)) poke(nearestHead(hit.build, hit.point), 'manual');
  }
  function interactE() {
    if (cine) { cine.fast = true; return; }
    if (buildMode) return;
    if (bagCarrying) {
      if (player.pos.distanceTo(cave.exitPos) < 3.2) { toast('先把麻袋扛离洞口，到篝火旁的空地再按 E 倒出来。', '#ffd890', 2.5); return; }
      unloadBag(); return;
    }
    const hit = lookHit();
    // 只拿准星对准的那颗（或准星 ~6° 小圆锥内最近的一颗，且不能隔着建筑）；不再“附近随便抓一颗”
    const pickup = targetHead(hit);
    for (const f of HOOK.e) { try { if (f(hit, held, pickup)) return; } catch (e) { console.warn(e); } }
    const shift = keys.ShiftLeft || keys.ShiftRight;
    if (pickup && !held && !shift && pickup.mount && CAT[pickup.mount.type].seance) { startSeance(pickup); return; }
    if (pickup) { const h = pickup; unmount(h); held = h; heldYaw = 0; h.sleep = 0; SFX.sack(); poke(h, 'hold'); return; }
    if (bagGroup && !bagCarrying && player.pos.distanceTo(bagGroup.position) < 2.8) { bagCarrying = true; toast('麻袋扛上肩了！走到洞内空地按 E 倒出来；按 Q 可放下。', '#ffd890', 4); SFX.sack(); return; }
    // A portable sack can be collected even if the ray points past it.
    if (player.pos.distanceTo(cave.exitPos) < 2.6) { UI.openExpedition(); return; }
    if (player.pos.distanceTo(cave.merchantPos) < 2.4) { UI.openMenu('equip'); SFX.coins(); return; }
    if (held && hit && hit.build && CAT[hit.build.type].bounty) { submitBounty(held); return; }
    if (hit && hit.build && CAT[hit.build.type].bounty) { if (window.UI && UI.openBounty) UI.openBounty(); return; }
    if (held) {
      if (hit && hit.build && CAT[hit.build.type].mount && freeSlot(hit.build) >= 0) { mountHead(held, hit.build, freeSlot(hit.build, hit.point)); return; }
      dropHeld(); return;
    }
    if (hit && hit.build) { const d = CAT[hit.build.type]; if (d.train) { UI.openTraining(d.train, d.n); return; } if (d.seance && !shift && firstHead(hit.build)) { startSeance(firstHead(hit.build)); return; } if (firstHead(hit.build)) { const h = nearestHead(hit.build, hit.point); unmount(h); held = h; return; } }
  }
  function toggleFilm() {
    if (film) { film = null; document.body.classList.remove('film'); camera.fov = 75; camera.updateProjectionMatrix(); toast('🎬 电影模式 关', '#ccc', 1.2); return; }
    film = { pos: camera.position.clone(), vel: new V3(), sp: 2 };
    document.body.classList.add('film'); toast('🎬 电影模式：WASD 飞行 · 空格/C 升降 · Shift 加速 · [ ] 调速 · 滚轮变焦 · 仍可拿头(E)/G 精确摆放 · P 退出', '#ffd890', 4);
  }
  // G：把手里的首级按当前朝向，轻放到准星指向的表面（之后照常受物理约束，不会浮空）
  function placeHeld() {
    if (!held) return; const h = held;
    ray.setFromCamera(new THREE.Vector2(0, 0), camera);
    const objs = [cave.group]; for (const b of builds) objs.push(b.g);
    const hit = ray.intersectObjects(objs, true).find(x => x.distance < 8 && !(x.object.material && x.object.material.transparent && x.object.material.opacity < 0.3));
    if (!hit) { toast('没有可以放置的表面', '#f88', 1); return; }
    held = null; const n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : UP.clone();
    const up = n.y > 0.5; h.g.position.copy(hit.point).addScaledVector(up ? UP : n, up ? supportH(h) + 0.005 : RC + 0.01);
    h.vel.set(0, 0, 0); h.av.set(0, 0, 0); h.sleep = 0; SFX.thud(0.3, 1); toast('轻轻放下了。', '#ccc', 0.8);
  }
  // ---------------- 首级摆放模式（第十轮）：长按 E → 绿色/红色预览，贴附朝上的表面 / 自动吸附空展位，遵守物理 ----------------
  const HP_POSE = ['断面朝下（立）', '右脸贴地', '左脸贴地', '后脑贴地', '脸朝下'];
  const hpOk = new THREE.MeshBasicMaterial({ color: '#5dff7a', transparent: true, opacity: 0.42, depthWrite: false, blending: THREE.AdditiveBlending });
  const hpBad = new THREE.MeshBasicMaterial({ color: '#ff3a3a', transparent: true, opacity: 0.38, depthWrite: false, blending: THREE.AdditiveBlending });
  const hpRing = new THREE.Mesh(new THREE.RingGeometry(RC * 0.9, RC * 1.1, 40), new THREE.MeshBasicMaterial({ color: '#5dff7a', transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
  hpRing.rotation.x = -Math.PI / 2; hpRing.visible = false; hpRing.raycast = () => {}; scene.add(hpRing);
  const _hq = new THREE.Quaternion(), _hy = new THREE.Quaternion(), hpRay = new THREE.Raycaster(); hpRay.far = 6.5;
  function startHP(h) {
    if (!h || hplace || buildMode || cine) return false;
    if (held !== h) unmount(h);
    held = null;
    const i = heads.indexOf(h); if (i >= 0) heads.splice(i, 1);
    if (lod) lod.release(h);
    h.g.visible = true; h.blob.visible = false; h.vel.set(0, 0, 0); h.av.set(0, 0, 0);
    // 绿色外壳：共享几何，换成半透明叠加材质，略放大
    const ov = new THREE.Group(); h.g.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(h.g.matrixWorld).invert();
    h.hb.group.traverse(o => { if (o.isMesh && o.geometry && o.visible) { const m = new THREE.Mesh(o.geometry, hpOk); m.matrixAutoUpdate = false; m.matrix.multiplyMatrices(inv, o.matrixWorld); m.raycast = () => {}; m.renderOrder = 6; ov.add(m); } });
    ov.scale.setScalar(1.025); h.g.add(ov);
    hplace = { h, ov, yaw: player.yaw, pose: 0, ok: false, mount: null };
    SFX.click(); toast('🟩 摆放模式：左键/E 放下 · 滚轮旋转（Shift 微调）· R 换姿势 · 右键/Esc 取消', '#8fe0a0', 3.5);
    return true;
  }
  function setHPTint(ok) { if (!hplace) return; hplace.ok = ok; const m = ok ? hpOk : hpBad; hplace.ov.children.forEach(c => c.material = m); hpRing.material.color.set(ok ? '#5dff7a' : '#ff3a3a'); }
  function updateHP() {
    const hp = hplace; if (!hp) return; const h = hp.h;
    hpRay.setFromCamera(new THREE.Vector2(0, 0), camera);
    const objs = [cave.group]; for (const b of builds) objs.push(b.g); for (const o of heads) objs.push(o.hit);
    const hit = hpRay.intersectObjects(objs, true).find(x => x.distance < 6 && !(x.object.material && x.object.material.transparent && x.object.material.opacity < 0.3 && x.object.material.visible !== false));
    hp.mount = null; hpRing.visible = false;
    if (!hit) { h.g.position.copy(camera.position).addScaledVector(hpRay.ray.direction, 2.2); setHPTint(false); return; }
    // 命中了哪座建筑 / 哪颗头
    let b = null; for (let o = hit.object; o && !b; o = o.parent) b = builds.find(x => x.g === o) || null;
    // 1) 空展位吸附
    if (b && CAT[b.type].mount && b.heads && (!CAT[b.type].mount.accept || CAT[b.type].mount.accept(h))) {
      const slot = freeSlot(b, hit.point);
      if (slot >= 0 && mountPos(b, slot).distanceTo(hit.point) < 0.6) {
        const s = slotsOf(CAT[b.type])[slot];
        h.g.quaternion.setFromEuler(new THREE.Euler(0, -b.rot * Math.PI / 2 + (s[3] != null ? s[3] : Math.PI), 0)); seatHead(h, b, slot);
        hp.mount = { b, slot }; setHPTint(true); return;
      }
    }
    const n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : UP.clone();
    if (hit.object.userData && hit.object.userData.head) n.subVectors(hit.point, hit.object.userData.head.g.position).normalize(); // 叠在别的头上
    // 2) 朝上的表面：按姿势 + 旋转摆好，底部贴合
    _hq.setFromUnitVectors(RESTS[hp.pose], DOWN); _hy.setFromAxisAngle(UP, hp.yaw); h.g.quaternion.copy(_hy).multiply(_hq);
    if (n.y < 0.55) { h.g.position.copy(hit.point).addScaledVector(n, RC + 0.02); setHPTint(false); return; } // 墙面：物理上放不住
    h.g.position.copy(hit.point); h.g.position.y += supportH(h) + 0.004;
    hpRing.position.set(hit.point.x, hit.point.y + 0.006, hit.point.z); hpRing.visible = true;
    let ok = camera.position.distanceTo(hit.point) < 5.5 && Math.hypot(h.g.position.x, h.g.position.z) < cave.R - 0.75;
    if (ok && Math.hypot(h.g.position.x - cave.firePos.x, h.g.position.z - cave.firePos.z) < 0.75) ok = false;
    if (ok) for (const o of heads) { if (o.g.position.distanceToSquared(h.g.position) < (RC * 1.85) ** 2) { ok = false; break; } }
    setHPTint(ok);
  }
  function endHP() { const hp = hplace; if (!hp) return null; hp.h.g.remove(hp.ov); hpRing.visible = false; hplace = null; heads.push(hp.h); return hp; }
  function confirmHP() {
    if (!hplace) return;
    updateHP();
    if (!hplace.ok) { SFX.deny(); toast('这里放不稳 / 放不下', '#f66', 1); return; }
    const hp = endHP(), h = hp.h;
    if (hp.mount) { mountHead(h, hp.mount.b, hp.mount.slot); }
    else { h.vel.set(0, 0, 0); h.av.set(0, 0, 0); h.sleep = 1.05; h.grounded = true; SFX.thud(0.35, 1.1); burst(h.g.position.clone().setY(h.g.position.y - supportH(h)), '#d8c8a8', 8, 0.5, 0.5, -2); }
    save();
  }
  function cancelHP() { const hp = endHP(); if (!hp) return; held = hp.h; heldYaw = 0; hp.h.sleep = 0; SFX.click(); }
  function startSeance(h) {
    if (!window.Seance || Seance.active) return;
    setUI(true); SFX.play('bell', 0.5, 0.8);
    Seance.open(h.rec, {
      onApply(ex, kind) { h.hb.setExpression(ex); if (kind === 'calm') burst(h.g.position, '#cfe8ff', 40, 1.2, 1.4, 0.5); else { burst(h.g.position, '#8a0010', 60, 2.4, 1.0); for (let i = 0; i < 12; i++) setTimeout(() => SFX.soul(i, h.rec.c.rar), i * 60); } },
      onClose() { setUI(false); save(); if (window.UI && UI.refresh) UI.refresh(); lockPointer(); }
    });
  }
  function makeBagMesh() {
    const g = new THREE.Group();
    const cloth = new THREE.MeshStandardMaterial({ color: '#72502d', roughness: 0.96 });
    const sack = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), cloth); sack.scale.set(1, 1.22, 0.78); sack.position.y = 0.27; g.add(sack);
    const neck = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.025, 6, 12), new THREE.MeshStandardMaterial({ color: '#b38a4c', roughness: 0.8 })); neck.position.y = 0.52; neck.rotation.x = Math.PI / 2; g.add(neck);
    const tie = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshStandardMaterial({ color: '#d1b17b', roughness: 0.9 })); tie.position.set(0, 0.62, 0); g.add(tie);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.018, 5, 16, Math.PI), new THREE.MeshStandardMaterial({ color: '#3e2a19', roughness: 0.9 })); strap.rotation.set(Math.PI / 2, 0, Math.PI / 2); strap.position.y = 0.34; g.add(strap);
    g.userData.cloth = cloth; return g;
  }
  function createReturnBag(recs) {
    recs.forEach(r => r.inBag = true);
    if (bagGroup) { scene.remove(bagGroup); bagGroup = null; }
    if (!recs.length) return;
    bagGroup = makeBagMesh();
    const d = new V3(Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    bagGroup.position.copy(player.pos).addScaledVector(d, 1.05); bagGroup.position.y = 0;
    bagGroup.rotation.y = player.yaw; scene.add(bagGroup); save();
    setTimeout(() => prebuildHeads(recs.filter(r => r.inBag)), 60);
    toast(`背篓里有 ${recs.length} 颗首级。对着麻袋按 E 扛起，再到洞内按 E 倒出。`, '#ffd890', 5);
  }
  // ---------------- 倒袋仪式：抽卡式揭晓 ----------------
  // 麻袋悬空 → 按袋中最高稀有度发出预兆光 → 抖动 → 翻转 → 首级按稀有度从低到高依次抛出，落地升起光柱 + 卡片；E / 点击加速
  let cine = null;
  const beamTex = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 128; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = gr; g.fillRect(0, 0, 4, 128); return new THREE.CanvasTexture(c); })();
  const cineFx = [];
  function spawnBeam(pos, col, rar, shiny) {
    const H = 1.2 + rar * 0.9 + (shiny ? 1.5 : 0);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.16 + rar * 0.03, 0.2 + rar * 0.04, H, 20, 1, true), new THREE.MeshBasicMaterial({ map: beamTex, color: col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(pos.x, H / 2, pos.z); scene.add(m);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.16, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(pos.x, 0.02, pos.z); scene.add(ring);
    const life = 1.4 + rar * 0.35;
    cineFx.push({ t: 0, life, upd(k) { m.material.opacity = (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85) * (0.55 + rar * 0.1); m.scale.x = m.scale.z = 0.6 + k * 0.7; m.rotation.y += 0.05; ring.scale.setScalar(1 + k * (6 + rar * 2)); ring.material.opacity = (1 - k) * 0.9; },
      end() { scene.remove(m); scene.remove(ring); m.geometry.dispose(); m.material.dispose(); ring.geometry.dispose(); ring.material.dispose(); } });
  }
  let gachaBox = null;
  function gachaCard(rec, isNew) {
    if (!gachaBox) { gachaBox = document.createElement('div'); gachaBox.id = 'gacha'; document.body.appendChild(gachaBox); }
    const c = rec.c, R = RAR[c.rar];
    const el = document.createElement('div'); el.className = 'gcard r' + c.rar + (c.shiny ? ' shiny' : ''); el.style.setProperty('--c', R.c);
    el.innerHTML = `<div class="gstars">${'★'.repeat(c.rar + 1)}</div>${isNew ? '<div class="gnew">NEW</div>' : ''}
      <div class="grar">【${R.n}】${c.shiny ? ' ✨异色' : ''}</div>${c.title ? `<div class="gtitle">『${c.title}』</div>` : ''}<div class="gname">${NM(c)}</div>${window.Ranks ? `<div class="gsub" style="color:${Ranks.of(c).col}">${Ranks.text(c)}</div>` : ''}
      <div class="gsub">${c.raceN} · ${c.idN} · ${c.age}岁</div>${(c.aff || []).length ? `<div class="gaff">${c.aff.map(k => RPG.AFF[k] ? `${RPG.affHTML(k, 'pill')}` : '').join('')}</div>` : ''}`;
    gachaBox.appendChild(el); requestAnimationFrame(() => el.classList.add('in'));
    while (gachaBox.children.length > 3) gachaBox.firstChild.remove();
    return el;
  }
  // 第八轮：更自然的倒袋 —— 麻袋放到地上，食人魔抓住袋底提起、倾斜、抖两下，首级按物理从袋口一颗颗滚出来（无悬浮/光柱仪式）
  function unloadBag() {
    if (!bagCarrying || cine) return;
    bagCarrying = false;
    const list = S.heads.filter(r => r.inBag);
    list.forEach(r => { r.inBag = false; });
    if (bagGroup) { scene.remove(bagGroup); bagGroup = null; }
    if (!list.length) return;
    // 袋里的顺序是乱的：随机，但让最稀有的稍晚出来（压在袋底）
    list.sort((a, b) => (a.c.rar + Math.random() * 2.2) - (b.c.rar + Math.random() * 2.2));
    const fwd = new V3(); camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
    const pivot = new THREE.Group(); pivot.position.copy(player.pos).addScaledVector(fwd, 1.25); pivot.position.y = 0; pivot.rotation.y = player.yaw; scene.add(pivot);
    const bag = makeBagMesh(); bag.scale.setScalar(0.85); pivot.add(bag);
    player.pitch = -0.5;
    S.codex = S.codex || {};
    const ev = []; let at = 1.25; const n = list.length; let toVault = 0;
    ev.push({ at: 0.05, fn() { SFX.play('heavy', 0.45, 0.8); SFX.sack(); } });
    ev.push({ at: 0.7, fn() { SFX.sack(); } });
    list.forEach((rec, i) => {
      const r = rec.c.rar, sh = !!rec.c.shiny;
      ev.push({ at, fn() {
        if (heads.length >= MAX_HEADS) { rec.vault = true; toVault++; const key = rec.c.race + '|' + rec.c.id; if (!S.codex[key]) S.codex[key] = 1; return; }
        const mouth = bag.localToWorld(new V3(0, 0.5, 0)), md = bag.localToWorld(new V3(0, 1.5, 0)).sub(mouth).normalize();
        const h = createHead(rec, mouth.addScaledVector(md, 0.12), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6)));
        h.vel.copy(md).multiplyScalar(0.9 + Math.random() * 0.9).add(new V3((Math.random() - 0.5) * 0.9, 0.2, (Math.random() - 0.5) * 0.9));
        h.av.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
        SFX.play('sack', 0.25, 0.9 + Math.random() * 0.3); cine.jolt = 1;
        const key = rec.c.race + '|' + rec.c.id, isNew = !S.codex[key]; S.codex[key] = (S.codex[key] || 0) + 1; rec.isNew = isNew; if (sh) S.shinySeen = (S.shinySeen || 0) + 1;
        ev.push({ at: cine.t + 0.7, fn() { gachaCard(rec, isNew); if (r >= 3 || sh) { SFX.fanfare(Math.min(4, r + (sh ? 1 : 0))); spawnBeam(h.g.position, sh ? '#fff2b0' : RAR[r].c, Math.min(2, r), sh); } else if (r >= 2) SFX.soul(2, r); saveSoon(); } });
      } });
      // 一团一团地出来：有时连着滚出两三颗，有时卡住要抖一下
      at += Math.random() < 0.3 ? 0.12 : 0.28 + Math.random() * 0.35;
      if (Math.random() < 0.18 && i < n - 1) { at += 0.4; ev.push({ at: at - 0.3, fn() { cine.shakeT = 0.35; SFX.sack(); } }); }
    });
    ev.push({ at: at + 0.35, fn() { cine.drop = 0.001; SFX.play('sack', 0.35, 0.7); } });
    ev.push({ at: at + 1.6, fn() {
      scene.remove(pivot);
      const best = list.slice().sort((a, b) => b.c.rar - a.c.rar)[0], nNew = list.filter(r => r.isNew).length;
      toast(`倒出 ${list.length} 颗首级 · 最高【${RAR[best.c.rar].n}】${best.c.shiny ? '✨异色' : ''}${nNew ? ` · 图鉴 +${nNew}` : ''}${toVault ? ` · ${toVault} 颗洞里放不下，已存入魂库` : ''}`, RAR[best.c.rar].c, 4);
      const remain = S.heads.filter(r => r.inBag); if (remain.length) createReturnBag(remain);
      if (window.Sack && Sack.on()) setTimeout(() => Sack.pourPending(), 1400); // 第十九轮：麻袋里其它东西一起倒出 → 储物箱
      setTimeout(() => { if (gachaBox && !cine) gachaBox.innerHTML = ''; }, 2500);
      cine = null; saveSoon(0.6);
    } });
    cine = { t: 0, ev, bag, pivot, fast: false, pourAt: 1.1, drop: 0, jolt: 0, shakeT: 0 };
    toast('解开袋口，抓住袋底……', '#d8c8a8', 1.6);
    save();
  }
  function updateCine(dt) {
    if (!cine) return;
    const c = cine; c.t += dt * (c.fast ? 3.2 : 1);
    const b = c.bag, pv = c.pivot, sm = k => k * k * (3 - 2 * k);
    c.jolt = Math.max(0, c.jolt - dt * 6); c.shakeT = Math.max(0, c.shakeT - dt);
    if (!c.drop) {
      // 0~0.5s 放地上略塌；0.5~1.1s 提起袋底并倾斜到袋口朝前下方；倒的过程中持续轻微颠簸
      const k1 = sm(Math.min(1, c.t / 0.5)), k2 = sm(Math.max(0, Math.min(1, (c.t - 0.5) / 0.6)));
      b.scale.set(0.85 * (1 + 0.06 * (1 - k2) * k1), 0.85 * (1 - 0.08 * (1 - k2) * k1), 0.85 * (1 + 0.06 * (1 - k2) * k1));
      const shake = Math.sin(c.t * 40) * (c.shakeT > 0 ? 0.12 : 0.025) * k2 + c.jolt * 0.05;
      b.rotation.x = -(1.95 * k2) + shake; b.rotation.z = Math.sin(c.t * 7) * 0.05 * k2;
      pv.position.y = 0.85 * k2 + (c.shakeT > 0 ? Math.abs(Math.sin(c.t * 30)) * 0.08 : 0);
      b.position.y = 0; b.position.z = -0.2 * k2;
    } else {
      // 倒空：甩一下丢在地上，瘪下去
      c.drop = Math.min(1, c.drop + dt * 1.4); const k = sm(c.drop);
      pv.position.y = Math.max(0, 0.85 * (1 - k * 1.6)); b.rotation.x = -1.95 + k * 0.4; b.rotation.z = k * 0.9;
      b.scale.set(0.85 * (1 + k * 0.25), 0.85 * (1 - k * 0.7), 0.85 * (1 + k * 0.1));
    }
    for (const e of c.ev) if (!e.done && c.t >= e.at) { e.done = true; e.fn(); if (!cine) return; }
  }
  function updateCineFx(dt) { for (let i = cineFx.length - 1; i >= 0; i--) { const f = cineFx[i]; f.t += dt; const k = f.t / f.life; if (k >= 1) { f.end(); cineFx.splice(i, 1); } else f.upd(k); } }
  function cycleHeldFace() {
    if (!held) return;
    const names = ['半阖死寂', '双目紧闭', '失焦凝视', '颌骨松垂', '极度惊恐', '狰狞痛苦'];
    const expressions = [
      { blink: 0.55, aa: 0.12 }, { blink: 1, sad: 0.2 }, { blink: 0.05, surprised: 0.35 },
      { blink: 0.3, aa: 0.55, oh: 0.3 }, { surprised: 1, oh: 0.55 }, { blink: 0.42, angry: 0.95, ee: 0.6, sad: 0.45 }
    ];
    heldFace = (heldFace + 1) % expressions.length; held.rec.look.ex = expressions[heldFace]; held.rec.look.exT = names[heldFace];
    held.hb.setExpression && held.hb.setExpression(held.rec.look.ex); SFX.click(); toast(`表情：${names[heldFace]} · 滚轮转向 · V 换表情`, '#e6c7a0', 1.6); save();
  }
  function inspectLook() {
    const lh = lookHit() || {}; const h = held || lh.head || (lh.build ? nearestHead(lh.build, lh.point) : null);
    if (h) { if (window.Recall && Recall.on()) { Recall.open(h.rec); SFX.book(); return; } UI.openCard(h.rec); SFX.book(); }
  }
  function dropHeld() { if (!held) return; const h = held; held = null; h.sleep = 0; h.vel.multiplyScalar(0.3); SFX.play('sack', 0.3); }
  function throwHeld(soft) {
    if (!held) return; const h = held; held = null; const d = new V3(); camera.getWorldDirection(d);
    h.vel.copy(d).multiplyScalar(soft ? 3 : 8.5).add(new V3(0, soft ? 1 : 2, 0)); h.av.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16); h.sleep = 0;
    SFX.play('draw', 0.4, 1.3);
  }
  function doubleX() {
    const hit = held ? { head: held } : lookHit(); if (!hit) return;
    if (hit.head) {
      const h = hit.head; const v = Math.round(h.yield * 15 * st().yieldMul * (hasAff(h, 'relic') ? 8 : hasAff(h, 'burst') ? 4 : 1));
      addCoins(v); floatText('碾碎吸魂 +' + v, h.g.position, '#ff4a6a', 30);
      burst(h.g.position, '#8a0010', 60, 2.5, 1.0, -8); burst(h.g.position, RAR[h.rec.c.rar].c, 40, 2, 1.2, 1);
      bloodSplat(h.g.position.x, 0, h.g.position.z, 0.8); SFX.squish(1.4); SFX.play('heavy', 0.8, 0.7); shake = 0.3;
      toast(`你捏碎了「${NM(h.rec.c)}」的头颅，吸干了她最后的残魂。`, '#ff6a7a', 2.5);
      removeHead(h); save();
    } else if (hit.build) {
      const b = hit.build; const refund = Math.round(cost(b.type) / CAT[b.type].grow * 0.5);
      removeBuild(b); addCoins(refund); SFX.wood();
      { const rm = window.RegEcon && RegEcon.refund ? RegEcon.refund(b.type) : ''; toast('拆除，返还 ' + refund + ' 魂晶' + (rm ? '、' + rm : ''), '#ccc', rm ? 2.6 : undefined); }
      save();
    }
  }

  // ---------------- 把玩 / 触发 ----------------
  let combo = 0, comboT = 0, shake = 0;
  function addCoins(n) { S.coins += n; if (n > 0) S.stats.earned += n; ui.coins.classList.remove('bump'); void ui.coins.offsetWidth; ui.coins.classList.add('bump'); }
  function beaconMul(h) { let m = 1; for (const o of heads) { if (o === h || !hasAff(o, 'beacon')) continue; if (o.g.position.distanceToSquared(h.g.position) < 3.24) m += 0.25; } return m; }
  function auraMul(pos) { let m = 1; for (const b of builds) { const d = CAT[b.type]; if (d.aura) { const dx = pos.x - b.x, dz = pos.z - b.z; if (dx * dx + dz * dz < d.aura * d.aura) m *= d.auraMul; } } return m; }
  // ---------------- 展厅评级 / 图鉴 / 每日魂潮 / 悬赏 ----------------
  const EX_T = [[0, 'F'], [150, 'E'], [500, 'D'], [1500, 'C'], [4000, 'B'], [10000, 'A'], [25000, 'S'], [60000, 'SS']];
  const EX_P = [10, 30, 80, 200, 500];
  let exCache = { score: 0, tier: 0, t: -9 };
  function exhibit(force) {
    const now = clock.elapsedTime; if (!force && now - exCache.t < 1.5) return exCache;
    let sc = 0, shown = 0; const races = new Set(), ids = new Set();
    for (const h of heads) if (h.mount) { const c = h.rec.c; sc += EX_P[c.rar] * (c.shiny ? 3 : 1) * (h.rec.calm ? 1.2 : 1) * (CAT[h.mount.type].showcase ? 1.6 : 1) * (1 + (c.aff ? c.aff.length : 0) * 0.1) * (hasAff(h, 'noble') ? 1.5 : 1) * (hasAff(h, 'sage') ? 1.2 : 1); races.add(c.race); ids.add(c.id); shown++; }
    const deco = builds.filter(b => CAT[b.type] && CAT[b.type].cat === 'decor').length;
    sc = Math.round(sc + races.size * 25 + ids.size * 12 + deco * 6);
    let tier = 0; for (let i = 0; i < EX_T.length; i++) if (sc >= EX_T[i][0]) tier = i;
    if (exCache.t > 0 && tier > exCache.tier) { toast(`🏛️ 展厅评级提升 → <b>${EX_T[tier][1]}</b>！全体产出 +${tier * 8}%`, '#ffd86a', 4); SFX.fanfare(Math.min(4, tier)); flash('rgba(255,210,100,.45)'); }
    exCache = { score: sc, tier, grade: EX_T[tier][1], t: now, shown, races: races.size, ids: ids.size, deco, next: EX_T[tier + 1] ? EX_T[tier + 1][0] : null };
    return exCache;
  }
  let cxCache = null, cxT = -9;
  function codexInfo() {
    if (cxCache && clock.elapsedTime - cxT < 1) return cxCache; cxT = clock.elapsedTime;
    const seenIds = new Set(), seenRaces = new Set();
    for (const k in (S.codex || {})) { const [r, i] = k.split('|'); seenRaces.add(r); seenIds.add(i); }
    const totalIds = Object.keys(Lore.ID).length, totalRaces = Object.keys(Lore.RACES).length;
    cxCache = { ids: seenIds, races: seenRaces, nIds: seenIds.size, totalIds, nRaces: seenRaces.size, totalRaces, combos: Object.keys(S.codex || {}).length, shiny: S.shinySeen || 0, mul: 1 + 0.05 * Math.floor(seenIds.size / 5) }; return cxCache;
  }
  const DAILY = [
    { k: 'moon', n: '🌕 血月', d: '远征幸运 +3，更容易遇到高稀有' },
    { k: 'shiny', n: '✨ 异色之夜', d: '异色首级出现几率 ×3' },
    { k: 'harvest', n: '💰 丰饶', d: '全体魂晶产出 +50%' },
    { k: 'seance', n: '🔮 通灵日', d: '首次通灵奖励 ×3' },
    { k: 'bounty', n: '📜 赏金日', d: '悬赏奖励 ×2' }
  ];
  const daily = (() => { const d = new Date(); return DAILY[(d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate()) % DAILY.length]; })();
  function globalMul() { return (window.Play ? Play.mul() : 1) * (1 + exhibit().tier * 0.08) * codexInfo().mul * (daily.k === 'harvest' ? 1.5 : 1); }
  // 悬赏
  const pickA = a => a[Math.floor(Math.random() * a.length)];
  function makeBounty() {
    const pool = S.heads.filter(r => !r.inBag), c0 = pool.length ? pickA(pool) : null, sc = 1 + S.depth * 0.6;
    const R = Math.random(); let b;
    if (R < 0.05) b = { k: 'shiny', n: '献上一颗✨异色首级', rw: 4000 };
    else if (R < 0.22) { const races = Object.keys(Lore.RACES); const k = c0 && Math.random() < 0.5 ? c0.c.race : pickA(races); b = { k: 'race', v: k, n: `献上一颗【${Lore.RACES[k].n}】的首级`, rw: 220 }; }
    else if (R < 0.38) { const ids = Object.keys(Lore.ID); const k = c0 && Math.random() < 0.6 ? c0.c.id : pickA(ids); b = { k: 'id', v: k, n: `献上「${Lore.ID[k].n}」的首级`, rw: 360 }; }
    else if (R < 0.54) { const n = Math.min(4, 1 + Math.floor(Math.random() * (1.5 + S.depth * 0.5))); b = { k: 'rar', v: n, n: `献上一颗【${RAR[n].n}】或更高的首级`, rw: Math.round(150 * Math.pow(n + 1, 1.7)) }; }
    else if (R < 0.66) { const ks = RPG.AFF_WILD; const k = pickA(ks); b = { k: 'aff', v: k, n: `献上带魂印【${RPG.AFF[k].icon}${RPG.AFF[k].n}】的首级`, rw: 520 }; }
    else if (R < 0.78) { const hn = c0 && Math.random() < 0.6 ? c0.look.hn : pickA(ModelHeads.HAIR.map(x => x[0])); b = { k: 'hair', v: hn, n: `献上一颗${hn}色头发的首级`, rw: 260 }; }
    else if (R < 0.88) b = { k: 'hetero', n: '献上一颗异色瞳的首级', rw: 420 };
    else { const k = c0 && Math.random() < 0.5 ? c0.c.traits[0] : pickA(Lore.TRAITS); b = { k: 'trait', v: k, n: `献上一颗「${k}」性格的首级`, rw: 240 }; }
    b.rw = Math.round(b.rw * sc); b.id = Math.random().toString(36).slice(2, 8); return b;
  }
  function bountyOk(b, rec) {
    const c = rec.c, L = rec.look;
    switch (b.k) {
      case 'shiny': return !!c.shiny; case 'race': return c.race === b.v; case 'id': return c.id === b.v; case 'rar': return c.rar >= b.v;
      case 'aff': return !!(c.aff && c.aff.includes(b.v)); case 'hair': return L.hn === b.v || L.hn2 === b.v; case 'hetero': return L.en2 && L.en2 !== L.en; case 'trait': return (c.traits || []).includes(b.v);
    }
    return false;
  }
  function bounties() { S.bounty = S.bounty || { list: [], fame: 0 }; while (S.bounty.list.length < 3) S.bounty.list.push(makeBounty()); return S.bounty.list; }
  function rerollBounties() { const c = 50 + S.depth * 40; if (S.coins < c) return false; addCoins(-c); S.bounty.list = []; bounties(); SFX.page(); return true; }
  function submitBounty(h) {
    const list = bounties(), i = list.findIndex(b => bountyOk(b, h.rec));
    if (i < 0) { toast('这颗头不符合任何悬赏条件。对着悬赏榜按 E（空手）查看委托。', '#f99', 3); SFX.deny(); return false; }
    const b = list[i], rw = Math.round(b.rw * (daily.k === 'bounty' ? 2 : 1) * (hasAff(h, 'bounty') ? 1.5 : 1));
    if (held === h) held = null;
    burst(h.g.position, '#ffd86a', 40, 2, 1); removeHead(h);
    addCoins(rw); S.fame = (S.fame || 0) + 1; S.stats.bounties = (S.stats.bounties || 0) + 1;
    list.splice(i, 1, makeBounty()); SFX.coins(); SFX.fanfare(2);
    const lk = S.fame % 3 === 0 ? ` · 远征幸运 +1（当前 ${RPG.luckOf(S)}）` : '';
    toast(`📜 悬赏完成：${b.n}<br>+${fmtN(rw)} 魂晶 · 声望 ${S.fame}${lk}`, '#ffd86a', 4.5); save();
    return true;
  }
  const fmtN = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'k' : String(n);
  function drawPlaque(b) {
    const P = b.g.userData.plaque, h = b.heads && b.heads[0], id = h ? h.rec.id : 0; if (!P || P.id === id) return; P.id = id;
    const g = P.cv.getContext('2d'); const W = 256, H = 96;
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#d8b060'); gr.addColorStop(1, '#8a6420'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#4a3208'; g.lineWidth = 4; g.strokeRect(5, 5, W - 10, H - 10);
    g.fillStyle = '#2a1a04'; g.textAlign = 'center';
    if (h) { const c = h.rec.c; g.font = 'bold 15px sans-serif'; g.fillText((c.shiny ? '✦ ' : '') + RAR[c.rar].n + ' · ' + c.raceN, W / 2, 28); g.font = 'bold 26px serif'; g.fillText(NM(c), W / 2, 60); g.font = '13px sans-serif'; g.fillText(c.title || c.idN, W / 2, 82); }
    else { g.font = 'bold 20px serif'; g.fillText('— 虚位以待 —', W / 2, 56); }
    P.tex.needsUpdate = true;
  }
  function trigger(h, src, mult = 1) {
    const s = st();
    const cap = hasAff(h, 'charm') ? 20 : 10;
    let v = h.yield * mult * s.yieldMul * globalMul() * auraMul(h.g.position) * (window.Props ? Props.auraMul(h.g.position) : 1) * (window.Props && (src === 'manual' || src === 'hold') ? Props.pokeMul(h.g.position) : 1) * beaconMul(h) * (h.buff && h.buff > clock.elapsedTime ? 2 : 1) * (src === 'manual' || src === 'hold' ? (1 + Math.min(combo, cap) * 0.1) : 1);
    let tag = '';
    if (src === 'auto' && hasAff(h, 'wrath') && Math.random() < 0.2) { v *= 5; tag = '怨念爆发！'; SFX.play('heavy', 0.4, 1.4); burst(h.g.position, '#b04aff', 30, 1.6, 0.8, 1); }
    if ((src === 'manual' || src === 'hold') && hasAff(h, 'destiny') && Math.random() < 0.12) { v *= 15; tag = '🌠天命 ×15！'; SFX.fanfare(3); }
    else if ((src === 'manual' || src === 'hold') && hasAff(h, 'lucky') && Math.random() < 0.06) { v *= 10; tag = '🍀幸运 ×10！'; SFX.fanfare(2); }
    if ((src === 'manual' || src === 'hold') && hasAff(h, 'echo') && Math.random() < 0.25) { v *= 1.6; tag = tag || '🔔回响'; }
    if ((src === 'manual' || src === 'hold') && hasAff(h, 'scholar') && Math.random() < 0.25 && window.RPG && RPG.addXp) { const up = RPG.addXp(S, 1); floatText('📚+1 经验', h.g.position.clone().add(new V3(0, 0.65, 0)), '#9fd0ff', 16); if (up) toast('🆙 食人魔升到了 Lv.' + RPG.lvOf(S.xp).lv, '#ffd27a', 3); }
    const val = Math.max(1, Math.round(v));
    if (tag) floatText(tag, h.g.position.clone().add(new V3(0, 0.45, 0)), '#ffe27a', 24);
    addCoins(val);
    const r = h.rec.c.rar;
    floatText('+' + val, h.g.position.clone().add(new V3(0, 0.25, 0)), RAR[r].c, 18 + r * 4 + Math.min(combo, 10));
    if (Math.random() < 0.6) soulWisp(h.g.position.clone().add(new V3(0, 0.1, 0)), RAR[r].c);
    burst(h.g.position, RAR[r].c, 6 + r * 4, 0.8, 0.6, 1.2);
    h.squash = 1; h.swayV.add(new V3((Math.random() - 0.5) * 0.6, 0.4, (Math.random() - 0.5) * 0.6));
    return val;
  }
  function poke(h, src, point) {
    const t = clock.elapsedTime;
    if (t - h.lastPoke < 0.18) return;
    h.lastPoke = t; S.stats.pokes++;
    combo = comboT > 0 ? combo + 1 : 0; comboT = 1.2;
    trigger(h, src);
    SFX.squish(0.6); SFX.soul(Math.min(combo, 10), h.rec.c.rar);
    // 不再把头打飞：果冻式挤压 + 摇晃 + 头发甩动（纯视觉，物理位置不动）
    if (src !== 'hold') { h.squash = 1; h.wob = 1; h.wobA = (Math.random() - 0.5) * 2; h.swayV.add(new V3((Math.random() - 0.5) * 1.2, 0.5, (Math.random() - 0.5) * 1.2)); }
    if (Math.random() < 0.3) burst(h.g.position.clone().add(new V3(0, -0.1, 0)), '#6a0008', 8, 1, 0.5, -8);
    // 桌子连锁
    const tb = tableOf(h);
    if (tb) {
      const others = heads.filter(o => o !== h && tableOf(o) === tb);
      others.forEach((o, i) => setTimeout(() => { trigger(o, 'chain'); SFX.soul(Math.min(combo + i + 1, 10), o.rec.c.rar); drawBeam(h.g.position, o.g.position, '#ff3a4a'); }, 80 + i * 70));
      if (tb.g.userData.edge) { tb.g.userData.edge.material.opacity = 0.8; }
    }
    if (combo > 0 && combo % 10 === 0) { toast(`连击 ×${combo}！`, '#ff6a3a', 1); SFX.fanfare(1); }
  }
  const beams = [];
  function drawBeam(a, b, color) { const geo = new THREE.BufferGeometry().setFromPoints([a.clone(), a.clone().lerp(b, 0.5).add(new V3(0, 0.2, 0)), b.clone()]); const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending })); scene.add(l); beams.push({ l, t: 0 }); }
  function tableOf(h) {
    if (h.mount || h === held) return null;
    const p = h.g.position;
    for (const b of builds) {
      const d = CAT[b.type]; if (!d.surface) continue;
      const [hx, hz] = fpOf(b.type, b.rot);
      if (b.type !== 'table') continue;
      if (Math.abs(p.x - b.x) < hx && Math.abs(p.z - b.z) < hz && p.y > d.surface && p.y < d.surface + RC * 2.5) return b;
    }
    return null;
  }
  function wheelOf(h) {
    if (h.mount || h === held) return null;
    const p = h.g.position;
    for (const b of builds) { if (b.type !== 'wheel') continue; const dx = p.x - b.x, dz = p.z - b.z; if (dx * dx + dz * dz < 0.36 && p.y < 0.14 + RC * 2.5) return b; }
    return null;
  }

  // 目标高亮：脚下/周围一圈脉动光环，明确 E 会拿哪一颗
  let aimHead = null;
  let hoverH = null;
  function updateAim(t) {
    const h = !buildMode && !held && !uiOpen ? aimHead : null;
    // 准星对准：头部边缘暖色柔光（不再使用圆圈）
    if (hoverH && hoverH !== h && hoverH.hb.U.hover) hoverH.hb.U.hover.value = 0;
    hoverH = h; if (!h) return;
    if (h.hb.U.hover) h.hb.U.hover.value = 0.55 + Math.sin(t * 5) * 0.2;
  }

  // ---------------- 物理 ----------------
  const tmp = new V3(), tmp2 = new V3(), UP = new V3(0, 1, 0), DOWN = new V3(0, -1, 0), qtmp = new THREE.Quaternion();
  const RESTS = [new V3(0, -1, 0), new V3(1, 0, 0), new V3(-1, 0, 0), new V3(0, 0, -1), new V3(0, 0, 1)];
  // 按当前朝下的方向估算首级的支撑高度（椭球近似：断面/侧脸/后脑/脸），侧躺时不会悬空
  const _ld = new V3(), _iq = new THREE.Quaternion();
  // 第十二轮：按真实形状求支撑高度——预计算约 160 个极值点（脸/耳/角/饰品 + 贴近头骨的头发，不含长发尾），
  // 支撑高度 = 当前朝向下最低点的深度；旧的椭球近似会让侧躺/带角的头陷进地面。
  const HULL_DIRS = (() => { const a = [], n = 200, ga = Math.PI * (3 - Math.sqrt(5)); for (let i = 0; i < n; i++) { const y = 1 - (i + 0.5) / n * 2, r = Math.sqrt(1 - y * y), t = ga * i; a.push(new V3(Math.cos(t) * r, y, Math.sin(t) * r)); } return a; })();
  const _hv = new V3(), _hm = new THREE.Matrix4(), _hi = new THREE.Matrix4();
  const HULLC = new Map(); // 同外观签名共享
  function hullKey(h) { const l = h.rec && h.rec.look; let nm = 0, nv = 0; h.hb.group.traverse(o => { if (o.isMesh && o.geometry && o.geometry.attributes.position) { nm++; nv += o.geometry.attributes.position.count; } }); return l ? [nm + ':' + nv, l.f, l.h, (l.acc || []).join('+'), l.feat || '', l.hx ? l.hx.s + (l.hx.ahoge || '') + (l.hx.len || '') : '', (l.hw || []).map(w => w.k || w).join('+')].join('|') : null; }
  function hullOf(h) {
    if (h._hullHb === h.hb && h._hull) return h._hull;
    const hk = hullKey(h); if (hk && HULLC.has(hk)) { h._hull = HULLC.get(hk); h._hullHb = h.hb; return h._hull; }
    const g = h.g, q0 = g.quaternion.clone(), p0 = g.position.clone(), sc = h.hb.group.scale.clone();
    g.quaternion.identity(); g.position.set(0, 0, 0); h.hb.group.scale.setScalar(HS); g.updateMatrixWorld(true); _hi.copy(g.matrixWorld).invert();
    const best = new Float32Array(HULL_DIRS.length).fill(-1e9), pts = new Array(HULL_DIRS.length);
    const lim = 0.16 * HS, skinOnly = !!(window.Mods && Mods.on('ground_contact')); // 平滑贴地 MOD 只让皮肤/断口承担支撑，避免头饰与长发虚抬
    h.hb.group.traverse(o => {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.position || o.isSprite) return;
      if (skinOnly && o.userData.kind !== 'skin' && o.userData.kind !== 'cut') return;
      const P = o.geometry.attributes.position, step = Math.max(1, Math.floor(P.count / 1500)); // 第十二轮：新 VRoid 模型网格更密，350 采样会漏掉耳朵/领口等突出点
      _hm.multiplyMatrices(_hi, o.matrixWorld);
      // 旧模式仅限制头发子组半径；新模式上面已筛为皮肤和封盖
      const faceLvl = o.parent === h.hb.group;
      for (let i = 0; i < P.count; i += step) {
        _hv.fromBufferAttribute(P, i).applyMatrix4(_hm);
        if (!faceLvl && _hv.length() > lim) continue;
        for (let k = 0; k < HULL_DIRS.length; k++) { const d = _hv.dot(HULL_DIRS[k]); if (d > best[k]) { best[k] = d; pts[k] = _hv.clone(); } }
      }
    });
    g.quaternion.copy(q0); g.position.copy(p0); h.hb.group.scale.copy(sc); g.updateMatrixWorld(true);
    const out = []; const seen = new Set();
    pts.forEach(p => { if (!p) return; const key = p.x.toFixed(4) + p.y.toFixed(4) + p.z.toFixed(4); if (!seen.has(key)) { seen.add(key); out.push(p.x, p.y, p.z); } });
    if (out.length < 12) { const r = 0.1 * HS; for (const d of HULL_DIRS) out.push(d.x * r, d.y * r, d.z * r); }
    h._hull = new Float32Array(out); h._hullHb = h.hb; if (hk) HULLC.set(hk, h._hull); return h._hull;
  }
  function supportH(h) {
    const H = hullOf(h), q = h.g.quaternion;
    // 局部点旋转后的 y 分量：y' = 2(xy+wz)x·... 用矩阵第二行更快
    const x = q.x, y = q.y, z = q.z, w = q.w;
    const r0 = 2 * (x * y + w * z), r1 = 1 - 2 * (x * x + z * z), r2 = 2 * (y * z - w * x); // 旋转矩阵第二行（原来误用了第二列=逆旋转，长耳/角的头侧躺时会插进地里）
    let mn = 0; for (let i = 0; i < H.length; i += 3) { const yy = r0 * H[i] + r1 * H[i + 1] + r2 * H[i + 2]; if (yy < mn) mn = yy; }
    return window.Mods && Mods.on('ground_contact') ? Math.max(0.02, -mn + 0.0015) : Math.max(0.06, -mn + 0.004);
  }
  function impact(h, v) {
    if (h.lastHit > 0) return; h.lastHit = 0.08;
    const k = Math.min(1, v / 6);
    SFX.thud(k, 0.9 + Math.random() * 0.2);
    if (v > 3) { burst(h.g.position.clone().setY(h.g.position.y - RC * 0.6), '#7a0008', Math.round(8 * k + 4), 1.2 * k + 0.4, 0.6, -8); if (v > 4.5 && h.g.position.y < 0.5) bloodSplat(h.g.position.x, 0, h.g.position.z, 0.25 + k * 0.35); }
    if (v > 5.5 && player.pos.distanceTo(h.g.position) < 4) shake = Math.max(shake, 0.12 * k);
    h.squash = Math.max(h.squash, k * 0.7);
  }
  function contact(h, nx, ny, nz, pen) {
    const p = h.g.position; p.x += nx * pen; p.y += ny * pen; p.z += nz * pen;
    const vn = h.vel.x * nx + h.vel.y * ny + h.vel.z * nz;
    if (vn < 0) {
      if (-vn > 1.4) impact(h, -vn);
      const e = -vn > 2 ? 0.28 : 0.05;
      h.vel.x -= nx * vn * (1 + e); h.vel.y -= ny * vn * (1 + e); h.vel.z -= nz * vn * (1 + e);
      // 滚动
      tmp2.set(nx, ny, nz); tmp.copy(h.vel).cross(tmp2).multiplyScalar(-1 / RC * 0.6); h.av.lerp(tmp, 0.3);
    }
    if (ny > 0.5) h.grounded = true;
  }
  const grid = new Map(); const CELL = RC * 2; const gkey = (x, y, z) => ((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512);
  function physStep(dt) {
    const R = cave.R - 0.82; // visual head radius is wider than the conservative collision sphere; keep thrown heads inside the wall
    for (const h of heads) {
      if (h === held || h.mount || h.sleep > 1.0) continue;
      h.grounded = false;
      h.vel.y += GRAV * dt;
      h.g.position.addScaledVector(h.vel, dt);
      const p = h.g.position;
      const floorHead = supportH(h); // 由朝向决定的支撑高度（断面朝下≈旧值，侧躺更低）
      const fl = floorOf(p) + floorHead; // 地面真实高度（墙根起伏）
      if (p.y < fl) contact(h, 0, 1, 0, fl - p.y);
      if (cave.pillars) for (const c of cave.pillars) { const dx = p.x - c.x, dz = p.z - c.z, rr0 = c.r + RC * 0.8; if (p.y < c.h + RC && dx * dx + dz * dz < rr0 * rr0) { const d = Math.hypot(dx, dz) || 1e-4; contact(h, dx / d, 0, dz / d, rr0 - d); } }
      if (p.y > cave.H - 0.5) contact(h, 0, -1, 0, p.y - (cave.H - 0.5));
      const rr = Math.hypot(p.x, p.z); if (rr > R) contact(h, -p.x / rr, 0, -p.z / rr, rr - R);
      for (const c of colliders) {
        if (p.x < c.min.x - RC || p.x > c.max.x + RC || p.z < c.min.z - RC || p.z > c.max.z + RC || p.y < c.min.y - RC || p.y > c.max.y + RC) continue;
        const cx = Math.max(c.min.x, Math.min(p.x, c.max.x)), cy = Math.max(c.min.y, Math.min(p.y, c.max.y)), cz = Math.max(c.min.z, Math.min(p.z, c.max.z));
        const dx = p.x - cx, dy = p.y - cy, dz = p.z - cz, d2 = dx * dx + dy * dy + dz * dz;
        if (dy > 0 && Math.abs(dx) < 1e-6 && Math.abs(dz) < 1e-6) { if (dy < floorHead) contact(h, 0, 1, 0, floorHead - dy); continue; } // 顶面：按朝向的真实支撑高度，不再悬空
        const rc = Math.min(RC, floorHead + 0.01);
        if (d2 < rc * rc) { const d = Math.sqrt(d2); if (d > 1e-5) contact(h, dx / d, dy / d, dz / d, rc - d); else contact(h, 0, 1, 0, floorHead); }
      }
      for (const b of builds) {
        const mt = CAT[b.type].mount;
        if (mt && b.heads && h.vel.y < 0) { let done = false; for (let i = 0; i < b.heads.length; i++) { if (b.heads[i]) continue; const mp = mountPos(b, i), dx = p.x - mp.x, dz = p.z - mp.z, sy = mp.y - RC * 0.8; if (dx * dx + dz * dz < 0.05 && p.y > sy && p.y < sy + RC * 2.4) { mountHead(h, b, i); done = true; break; } } if (done) break; }
      }
    }
    for (let i = 0; i < heads.length; i++) heads[i].idx = i;
    for (const a of grid.values()) a.length = 0;
    for (const h of heads) { if (h === held) continue; const k = gkey(Math.floor(h.g.position.x / CELL), Math.floor(h.g.position.y / CELL), Math.floor(h.g.position.z / CELL)); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(h); }
    for (const a of heads) {
      if (a === held || (a.sleep > 1 && !a.mount)) continue;
      const ax = Math.floor(a.g.position.x / CELL), ay = Math.floor(a.g.position.y / CELL), az = Math.floor(a.g.position.z / CELL);
      for (let ix = -1; ix <= 1; ix++) for (let iy = -1; iy <= 1; iy++) for (let iz = -1; iz <= 1; iz++) {
        const cell = grid.get(gkey(ax + ix, ay + iy, az + iz)); if (!cell || !cell.length) continue;
        for (const b of cell) {
          if (b === a) continue;
          const bAct = b.mount || b.sleep <= 1;
          if (bAct && b.idx < a.idx) continue;
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
          if (rv < 0) { const j = -1.25 * rv / tot; a.vel.addScaledVector(tmp, -j * am); b.vel.addScaledVector(tmp, j * bm); if (-rv > 1.4) { impact(a, -rv * 0.7); impact(b, -rv * 0.7); } }
          if (pen > 0.004) { if (!b.mount) b.sleep = Math.min(b.sleep, 0.5); if (!a.mount) a.sleep = Math.min(a.sleep, 0.5); }
        }
      }
    }
    // 被推挤的休眠首级也要做地面约束（修复“头陷进地里”）
    for (const h of heads) { if (h === held || h.mount || (h.sleep > 1 && h._hullHb !== h.hb && floorOf(h.g.position) < 0.002)) continue; const fy = supportH(h) + floorOf(h.g.position); if (h.g.position.y < fy - 0.002) { h.g.position.y = fy; if (h.vel.y < 0) h.vel.y = 0; h.sleep = Math.min(h.sleep, 0.5); } const rr2 = Math.hypot(h.g.position.x, h.g.position.z), R2 = cave.R - 0.82; if (rr2 > R2) { h.g.position.x *= R2 / rr2; h.g.position.z *= R2 / rr2; } }
    for (const h of heads) {
      if (h === held || h.mount || h.sleep > 1.0) continue;
      if (h.grounded) {
        // 不再强制“回正”：朝最近的稳定姿态（断面朝下 / 侧脸贴地 / 后脑贴地 / 脸朝下）轻轻落定，保留随机朝向
        if (h.vel.length() < 1.2) {
          const q = h.g.quaternion; let best = RESTS[0], bd = -2;
          for (const L of RESTS) { tmp.copy(L).applyQuaternion(q); if (-tmp.y > bd) { bd = -tmp.y; best = L; } }
          tmp.copy(best).applyQuaternion(q); const ax = tmp2.crossVectors(tmp, DOWN);
          if (bd < 0.995) h.av.addScaledVector(ax, 16 * dt);
        }
        h.av.multiplyScalar(Math.pow(0.02, dt));
        h.vel.x *= Math.pow(0.12, dt); h.vel.z *= Math.pow(0.12, dt);
      } else h.av.multiplyScalar(Math.pow(0.6, dt));
      const w = h.av.length();
      if (w > 1e-4) { qtmp.setFromAxisAngle(tmp.copy(h.av).divideScalar(w), w * dt); h.g.quaternion.premultiply(qtmp); }
      if (h.grounded && h.vel.lengthSq() < 0.02 && w < 0.4) h.sleep += dt; else h.sleep = 0;
    }
  }

  // ---------------- 头发摆动（弹簧） ----------------
  const qInv = new THREE.Quaternion(), acc = new V3(), gl = new V3(), want = new V3();
  function updateSway(h, dt) {
    qInv.copy(h.g.quaternion).invert();
    acc.subVectors(h.vel, h.prevVel).divideScalar(Math.max(dt, 1e-3)); h.prevVel.copy(h.vel);
    if (acc.lengthSq() > 400) acc.setLength(20);
    gl.set(0, -1, 0).applyQuaternion(qInv); // 局部重力方向
    want.set(gl.x, gl.y + 1, gl.z).multiplyScalar(0.03).addScaledVector(acc.applyQuaternion(qInv), -0.0022);
    // 弹簧阻尼
    h.swayV.addScaledVector(tmp.subVectors(want, h.sway), 110 * dt);
    h.swayV.multiplyScalar(Math.pow(0.02, dt));
    h.sway.addScaledVector(h.swayV, dt);
    if (h.sway.length() > 0.04) h.sway.setLength(0.04);
    h.hb.setSway(h.sway);
  }

  // ---------------- 建造放置 ----------------
  function startPlace(k) {
    if (window.Unlocks && !Unlocks.has(k)) { SFX.deny(); return; }
    cancelBuild();
    buildMode = k; buildRot = 0;
    ghost = CAT[k].make(); ghost.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.55; o.material.depthWrite = false; } });
    scene.add(ghost);
    toast(`放置 <b>${CAT[k].n}</b>：左键确认 · R/Shift+R 任意角度旋转 · 右键取消`, '#8fe0a0', 3);
  }
  function cancelBuild() { if (ghost) { scene.remove(ghost); ghost = null; } buildMode = null; }
  function updateGhost() {
    if (!ghost) return;
    const d = new V3(); camera.getWorldDirection(d);
    let x, z;
    if (d.y < -0.05) { const t = -camera.position.y / d.y; x = camera.position.x + d.x * Math.min(t, 6); z = camera.position.z + d.z * Math.min(t, 6); }
    else { x = camera.position.x + d.x * 3; z = camera.position.z + d.z * 3; }
    x = Math.round(x * 10) / 10; z = Math.round(z * 10) / 10;
    ghost.position.set(x, 0, z); ghost.rotation.y = -buildRot * Math.PI / 2;
    const [hx, hz] = fpOf(buildMode, buildRot);
    ghostOk = Math.hypot(x, z) + Math.max(hx, hz) < cave.R - 0.7;
    if (Math.hypot(x - cave.firePos.x, z - cave.firePos.z) < 0.9 + Math.max(hx, hz)) ghostOk = false;
    if (Math.hypot(x - cave.exitPos.x, z - cave.exitPos.z) < 2.2) ghostOk = false;
    if (Math.hypot(x - cave.merchantPos.x, z - cave.merchantPos.z) < 1.8) ghostOk = false;
    for (const b of builds) { const [bx, bz] = fpOf(b.type, b.rot); if (Math.abs(b.x - x) < bx + hx - 0.02 && Math.abs(b.z - z) < bz + hz - 0.02) { ghostOk = false; break; } }
    if (Math.hypot(player.pos.x - x, player.pos.z - z) < Math.max(hx, hz) + 0.25) ghostOk = false;
    ghost.traverse(o => { if (o.isMesh) { o.material.color && o.material.color.set(ghostOk ? '#8fffa0' : '#ff5a5a'); } });
  }
  function placeBuild() {
    if (!ghost) return;
    const k = buildMode, c = cost(k), d = CAT[k];
    if (!ghostOk) { SFX.deny(); toast('这里放不下', '#f66', 1); return; }
    if (S.coins < c) { SFX.deny(); toast('魂晶不足', '#f66', 1); cancelBuild(); return; }
    if (d.max && bought(k) >= d.max) { SFX.deny(); toast('只能建一个', '#f66', 1); cancelBuild(); return; }
    if (window.RegEcon && RegEcon.can && !RegEcon.can(k)) { SFX.deny(); toast('材料不足：' + RegEcon.lackText(RegEcon.need(k)) + ' —— 去对应地区搜刮', '#f96', 3); cancelBuild(); return; }
    S.coins -= c;
    if (window.RegEcon && RegEcon.pay) RegEcon.pay(k);
    const b = addBuild(k, ghost.position.x, ghost.position.z, buildRot);
    SFX.wood(); SFX.mine(); burst(new V3(b.x, 0.3, b.z), '#b0a090', 30, 2, 0.8, -6); shake = 0.1;
    const statTxt = d.stat ? Object.entries(d.stat).map(([k2, v]) => RPG.STATS.find(s => s[0] === k2)[1] + '+' + v).join(' ') : '';
    toast(`建成 <b>${d.n}</b> ${statTxt}`, '#8fe0a0', 2);
    save();
    if (S.coins < cost(k) || (d.max && bought(k) >= d.max) || (window.RegEcon && RegEcon.can && !RegEcon.can(k))) cancelBuild();
  }
  function RegEcon_ok(o) { return !window.RegEcon || !RegEcon.hasAll || RegEcon.hasAll(o); }
  function dig() {
    const next = BuildCat.DIG[S.depth]; if (!next) return false;
    if (S.coins < next.cost) { SFX.deny(); return false; }
    { const dn = window.RegEcon && RegEcon.digNeed ? RegEcon.digNeed(S.depth + 1) : {}; if (!RegEcon_ok(dn)) { SFX.deny(); toast('挖深材料不足：' + RegEcon.lackText(dn), '#f96', 3); return false; } if (window.RegEcon) RegEcon.payO(dn); }
    S.coins -= next.cost; S.depth++;
    // 超出新范围的不会发生（只会变大）
    buildCave(); assignLights();
    shake = 0.8; SFX.roar(1); for (let i = 0; i < 6; i++) setTimeout(() => SFX.mine(), i * 120);
    for (let i = 0; i < 8; i++) burst(new V3((Math.random() - 0.5) * 8, 2.5, (Math.random() - 0.5) * 8), '#a09080', 30, 2, 1.4, -9);
    toast(`⛏️ 洞窟挖深到第 ${S.depth} 层！空间扩大，解锁新建筑`, '#ffd890', 3.5);
    heads.forEach(h => h.sleep = 0);
    save(); return true;
  }

  // ---------------- 装备 / 物品 ----------------
  function buyEquip(slot) {
    const E = RPG.EQUIP[slot]; const nt = (S.eq[slot] || 0) + 1; const t = E.tiers[nt];
    if (window.Sack && Sack.on() && window.Mods && Mods.on('forge_buy') === false) { toast('装备不能用魂晶购买——只能野外搜刮；魂晶用来强化已有的装备', '#ffb070', 2.6); SFX.deny(); return false; }
    if (!t) return false; if (S.coins < t.cost) { SFX.deny(); return false; }
    const hpFrac = S.hp / st().maxHp;
    S.coins -= t.cost; S.eq[slot] = nt; SFX.metal(); SFX.levelup();
    S.hp = Math.round(hpFrac * st().maxHp);
    if (slot === 'weapon') refreshWeapon();
    toast(`装备 <b>${t.n}</b>！`, '#ffd890', 2); save(); return true;
  }
  function buyItem(k) { const it = RPG.CONSUM.find(c => c.k === k); if (S.coins < it.cost) { SFX.deny(); return false; } S.coins -= it.cost; S.items[k] = (S.items[k] || 0) + 1; SFX.coins(); save(); return true; }
  function useItem(k) {
    if (!S.items[k]) { toast('没有' + (RPG.CONSUM.find(c => c.k === k) || {}).n, '#f88', 1); return false; }
    const it = RPG.CONSUM.find(c => c.k === k); const m = st().maxHp; if (S.hp >= m) { toast('生命已满', '#ccc', 1); return false; }
    S.items[k]--; S.hp = Math.min(m, S.hp + Math.round(m * it.heal)); SFX.play('sack', 0.3, 1.5); SFX.soul(5, 2); flash('#3aff6a'); toast(`喝下${it.n}，生命恢复`, '#6aff8a', 1.5); save(); return true;
  }
  function train(k, clicks) {
    const c = RPG.trainCost(S, k); if (S.coins < c) { SFX.deny(); return 0; }
    S.coins -= c; const gain = Math.max(1, Math.floor(clicks / 9));
    S.base[k] = (S.base[k] || 0) + gain; S.trained[k] = (S.trained[k] || 0) + 1;
    SFX.levelup(); if (k === 'ter') SFX.roar(0.8); save(); return gain;
  }
  function flash(color) { ui.vign.style.boxShadow = `inset 0 0 180px 60px ${color}`; ui.vign.style.opacity = 1; setTimeout(() => ui.vign.style.opacity = 0, 120); }
  function damage(n) { S.hp = Math.max(0, S.hp - n); flash('#ff0010'); SFX.heartbeat(); }

  // ---------------- 远征返回：倒出首级 ----------------
  function spawnReturnHeads(list) {
    const dir = new V3(); camera.getWorldDirection(dir); dir.y = 0; dir.normalize();
    list.forEach((rec, i) => setTimeout(() => {
      if (heads.length >= MAX_HEADS) { rec.vault = true; if (!spawnReturnHeads.warned) { spawnReturnHeads.warned = 1; toast('洞里放不下了（上限 ' + MAX_HEADS + '），多出来的已存入魂库（H 档案 → 魂库）', '#e8c070', 4); setTimeout(() => spawnReturnHeads.warned = 0, 3000); } save(); return; }
      const p = player.pos.clone().addScaledVector(dir, 1.2).add(new V3((Math.random() - 0.5) * 0.5, 1.6 + i * 0.15, (Math.random() - 0.5) * 0.5));
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 3, Math.random() * 6, Math.random() * 3));
      const h = createHead(rec, p, q); h.vel.set((Math.random() - 0.5) * 1.5, 0.5, (Math.random() - 0.5) * 1.5); h.av.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
      SFX.sack(); if (rec.c.rar >= 3) { SFX.fanfare(rec.c.rar); burst(p, RAR[rec.c.rar].c, 80, 3, 1.3, 0); }
    }, 300 + i * 260));
  }
  function addHeadRecs(list) { if (S.heads.length + list.length > VAULT_MAX) { toast(`魂库已满（${VAULT_MAX}），多余的首级化作了魂尘`, '#f88'); list = list.slice(0, Math.max(0, VAULT_MAX - S.heads.length)); } for (const h of list) { if (h.c && h.c.lookRace) { h.c = Object.assign({}, h.c); delete h.c.lookRace; } const rec = { id: S.nextId++, c: h.c, look: h.look, mem: h.mem, story: h.story, app: h.app, date: h.date }; S.heads.push(rec); S.sigs.push(h.sig); S.names.push(h.c.name); h.rec = rec; } return list.map(h => h.rec); }

  // ---------------- 存档 ----------------
  // 第十九轮：倒袋时每颗头都整档存一次（序列化全部首级+魂库+localStorage）→ 每颗都卡。改为合并到空闲时存一次
  let _svT = 0;
  function saveSoon(d = 1.2) { clearTimeout(_svT); _svT = setTimeout(() => { if (cine) return saveSoon(0.8); (window.requestIdleCallback || ((f) => setTimeout(f, 0)))(() => save(), { timeout: 2000 }); }, d * 1000); }
  function save() {
    clearTimeout(_svT);
    if (S.dead) return;
    for (const h of heads) { h.rec.p = h.g.position.toArray().map(v => +v.toFixed(3)); h.rec.q = h.g.quaternion.toArray().map(v => +v.toFixed(3)); h.rec.mt = h.mount ? builds.indexOf(h.mount) : -1; h.rec.ms = h.mount ? h.slot : 0; }
    persistBuilds();
    let all = null; try { if (window.Store) { all = S.heads; S.heads = Store.saveVault(S); } } catch (e) { console.warn('vault save', e); }
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { console.warn('save failed', e); }
    if (all) S.heads = all;
  }
  function load() {
    S.codex = S.codex || {}; for (const r of S.heads) { const k = r.c.race + '|' + r.c.id; if (!S.codex[k]) S.codex[k] = 1; }
    for (const b of S.builds) if (CAT[b.type]) addBuild(b.type, b.x, b.z, b.rot, false);
    let nLoaded = 0;
    for (const rec of S.heads) {
      if (rec.inBag || rec.vault) continue;
      if (nLoaded >= MAX_HEADS) { rec.vault = true; continue; } nLoaded++;
      try {
        const p = rec.p ? new V3().fromArray(rec.p) : new V3((Math.random() - 0.5) * 3, 1, (Math.random() - 0.5) * 3);
        const q = rec.q ? new THREE.Quaternion().fromArray(rec.q) : null;
        const h = createHead(rec, p, q);
        const mb = rec.mt >= 0 ? builds[rec.mt] : null, ms = rec.ms || 0;
        if (mb && mb.heads && ms < mb.heads.length && !mb.heads[ms]) { mb.heads[ms] = h; h.mount = mb; h.slot = ms; seatHead(h, mb, ms); }
        else h.sleep = 0.9;
      } catch (e) { console.warn('head load fail', e); }
    }
  }
  load();
  // 着色器预热：在开始界面期间把场景里所有材质编译好（否则进入游戏后头几秒边看边编译 → 卡顿）
  setTimeout(() => { try { const t0 = performance.now(); if (window.Foe && Foe.warm) Foe.warm(renderer, scene, camera); else renderer.compile(scene, camera); if (post && post.warm) post.warm(); console.log('shader prewarm ms', Math.round(performance.now() - t0)); } catch (e) { console.warn('prewarm', e); } }, 50);
  if (S.heads.some(r => r.inBag)) createReturnBag(S.heads.filter(r => r.inBag));
  S.hp = Math.min(S.hp, st().maxHp);
  if (window.Mods && Mods.on('steady_save')) {
    let autoSavePending = false;
    const queueAutoSave = () => {
      if (autoSavePending) return; autoSavePending = true;
      const run = () => { autoSavePending = false; save(); };
      if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 8000 }); else setTimeout(run, 1200);
    };
    setInterval(queueAutoSave, 20000); // 高频交互仍显式 save；这里只把物理姿态快照移到空闲时段
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });
  } else setInterval(save, 8000);
  addEventListener('beforeunload', save);
  function wipe() { S.dead = true; localStorage.removeItem(SAVE_KEY); if (window.Store) Store.wipeVault(); }

  // ---------------- 主循环 ----------------
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  const clock = new THREE.Clock();
  let acc2 = 0, regenT = 0, hudT = 0, fpsAcc = 0, fpsN = 0, stepT = 0;
  const fw = new V3(), rt = new V3(), wantV = new V3(), dirV = new V3();
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, clock.getDelta()); const now = clock.elapsedTime;
    if ((window.Seance && Seance.active) || (window.Recall && Recall.active) || window.__pauseMain) return; // 通灵 MV / 头棋等全屏小游戏期间暂停主场景渲染
    if (window.Worlds && Worlds.active) { Worlds.frame(dt, now); return; } // 第十四轮：出猎世界（地点图）接管主循环
    for (const f of HOOK.frame) { try { f(dt, now); } catch (e) { console.warn(e); } }
    if (eDown && !eLong && performance.now() - eDown > 350) { eLong = true; if (playing && !uiOpen && !cine && !bagCarrying) { const tgt = held || targetHead(lookHit()); if (tgt) startHP(tgt); else eLong = false; } }
    if (hplace) updateHP();
    updateAim(now); ModelHeads.tick(now); updateCine(dt); updateCineFx(dt);
    for (const h of heads) if (h.aura) { const ap = h.aura.geometry.attributes.position; for (let i = 0; i < ap.count; i++) { let y = ap.getY(i) + dt * (0.06 + (i % 5) * 0.015); if (y > 0.38) y = -0.15; ap.setY(i, y); } ap.needsUpdate = true; h.aura.position.copy(h.g.position); h.aura.rotation.y = now * 0.25 + h.rec.id; h.aura.visible = h.g.visible !== false; }
    // 自适应分辨率
    fpsAcc += dt; fpsN++; if (fpsAcc > 2 && !FORCE_Q && post && post.setTier && post.style === 'master') { const fps = fpsN / fpsAcc; // 先降画质档，再降分辨率
      if (fps < 38 && post.tier !== 'mid') { post.setTier(post.tier === 'ultra' ? 'high' : 'mid'); if (post.tier === 'mid') renderer.shadowMap.enabled = false; fpsAcc = 0; fpsN = 0; }
      else if (fps > 58 && pixelRatio >= Math.min(devicePixelRatio, 1.5) - 0.01 && post.tier !== 'ultra' && (fpsHi = (fpsHi || 0) + 1) > 3) { post.setTier(post.tier === 'mid' ? 'high' : 'ultra'); renderer.shadowMap.enabled = !LOWSPEC; fpsHi = 0; fpsAcc = 0; fpsN = 0; } }
    if (fpsAcc > 2) { const fps = fpsN / fpsAcc; if (fps < 40 && pixelRatio > 0.7 && !FORCE_Q) { pixelRatio = Math.max(0.7, pixelRatio - 0.15); renderer.setPixelRatio(pixelRatio); } else if (fps > 58 && pixelRatio < Math.min(devicePixelRatio, 1.5)) { pixelRatio = Math.min(Math.min(devicePixelRatio, 1.5), pixelRatio + 0.1); renderer.setPixelRatio(pixelRatio); } fpsAcc = 0; fpsN = 0; }
    // 玩家
    if (playing && !uiOpen && !cine && !film) {
      const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
      const s = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
      // 下蹲（按住 C）：视线降低 0.8m，移速 ×0.45，不能跳
      player.crouch += ((keys.KeyC ? 1 : 0) - player.crouch) * Math.min(1, dt * 12); player.h = 1.45 - 0.55 * player.crouch; // 眼高与女角色一致
      const sp = (keys.ShiftLeft && player.crouch < 0.5 ? 6 : 3.4) * (1 - 0.55 * player.crouch);
      fw.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)); rt.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
      wantV.copy(fw).multiplyScalar(f).addScaledVector(rt, s); if (wantV.lengthSq() > 0) wantV.normalize().multiplyScalar(sp);
      player.vel.x += (wantV.x - player.vel.x) * Math.min(1, dt * 10); player.vel.z += (wantV.z - player.vel.z) * Math.min(1, dt * 10);
      if (keys.Space && player.onGround && player.crouch < 0.3) { player.vel.y = 4.2; player.onGround = false; }
    } else { player.vel.x *= 0.8; player.vel.z *= 0.8; }
    player.vel.y += GRAV * dt; player.pos.addScaledVector(player.vel, dt);
    if (player.pos.y <= 0) { player.pos.y = 0; player.vel.y = 0; player.onGround = true; }
    { const pr = 0.35, R = cave.R - 0.6; const rr = Math.hypot(player.pos.x, player.pos.z);
      // 出口隧道允许走进去一点
      const inTunnel = Math.abs(player.pos.x) < 1 && player.pos.z < 0;
      const lim = inTunnel ? cave.R + 1.2 : R;
      if (rr > lim) { player.pos.x *= lim / rr; player.pos.z *= lim / rr; }
      for (const c of colliders) {
        if (c.max.y < 0.25 || player.pos.y > c.max.y - 0.05) continue;
        const cx = Math.max(c.min.x, Math.min(player.pos.x, c.max.x)), cz = Math.max(c.min.z, Math.min(player.pos.z, c.max.z));
        const dx = player.pos.x - cx, dz = player.pos.z - cz, d = Math.hypot(dx, dz);
        if (d < pr && d > 1e-5) { player.pos.x += dx / d * (pr - d); player.pos.z += dz / d * (pr - d); }
      }
      let fd = Math.hypot(player.pos.x - cave.firePos.x, player.pos.z - cave.firePos.z); if (fd < 1e-4) { player.pos.z += 0.01; fd = Math.hypot(player.pos.x - cave.firePos.x, player.pos.z - cave.firePos.z); } if (fd < 0.75) { player.pos.x = cave.firePos.x + (player.pos.x - cave.firePos.x) / fd * 0.75; player.pos.z = cave.firePos.z + (player.pos.z - cave.firePos.z) / fd * 0.75; }
    }
    const moving = Math.hypot(player.vel.x, player.vel.z);
    if (playing && player.onGround && moving > 1) { stepT -= dt * moving; if (stepT <= 0) { stepT = 1.6; if (!(window.Steps && Steps.player('cave'))) SFX.step(); } } // 第二十四轮：洞穴石地脚步
    const bob = playing && player.onGround ? Math.sin(now * 9) * Math.min(1, moving / 3) * 0.03 : 0;
    camera.position.set(player.pos.x, player.pos.y + player.h + bob, player.pos.z);
    camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
    if (film) { // 自由飞行：WASD 平移（沿视线）、空格上升、C 下降、Shift 加速、[ ] 调速、滚轮变焦
      const f2 = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), s2 = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), u2 = (keys.Space ? 1 : 0) - (keys.KeyC ? 1 : 0);
      const dir3 = new V3(0, 0, -1).applyEuler(new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ')), rt3 = new V3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
      const want3 = dir3.multiplyScalar(f2).addScaledVector(rt3, s2).addScaledVector(UP, u2); if (want3.lengthSq() > 0) want3.normalize().multiplyScalar(film.sp * (keys.ShiftLeft ? 3 : 1));
      film.vel.lerp(want3, Math.min(1, dt * 4)); film.pos.addScaledVector(film.vel, dt);
      const rr3 = Math.hypot(film.pos.x, film.pos.z), lim3 = cave.R + 1.5; if (rr3 > lim3) { film.pos.x *= lim3 / rr3; film.pos.z *= lim3 / rr3; }
      film.pos.y = Math.max(0.08, Math.min(cave.H - 0.2, film.pos.y));
      camera.position.copy(film.pos);
    }
    if (shake > 0) { shake -= dt; camera.position.x += (Math.random() - 0.5) * shake * 0.1; camera.position.y += (Math.random() - 0.5) * shake * 0.1; }
    // 视角模型
    swing = Math.max(0, swing - dt * 5);
    if (!(window.Combat && Combat.drawn)) { vm.rotation.x = -Math.sin(swing * Math.PI) * 0.7; vm.position.y = -0.42 + bob * 0.5 - Math.sin(swing * Math.PI) * 0.05; }
    vm.visible = !held;

    acc2 += dt; let steps = 0;
    while (acc2 > 1 / 120 && steps < 5) { physStep(1 / 120); acc2 -= 1 / 120; steps++; }
    if (steps >= 5) acc2 = 0;

    // 手持
    if (bagCarrying && bagGroup) { camera.getWorldDirection(dirV); bagGroup.position.copy(camera.position).addScaledVector(dirV, 0.75).add(new V3(0, -0.48, 0)); bagGroup.rotation.set(0, player.yaw + Math.sin(now * 4) * 0.06, 0); }
    if (held) {
      camera.getWorldDirection(dirV);
      const target = camera.position.clone().addScaledVector(dirV, 0.6).add(new V3(0, -0.12, 0));
      lastHeldPos.copy(held.g.position);
      held.g.position.lerp(target, Math.min(1, dt * 16)); { const fy = supportH(held) + floorOf(held.g.position); if (held.g.position.y < fy) held.g.position.y = fy; }
      heldVel.subVectors(held.g.position, lastHeldPos).divideScalar(Math.max(dt, 1e-4)); held.vel.copy(heldVel);
      const faceQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-player.pitch * 0.4, player.yaw, 0, 'YXZ'));
      faceQ.multiply(new THREE.Quaternion().setFromAxisAngle(UP, heldYaw)); held.g.quaternion.slerp(faceQ, Math.min(1, dt * 12));
      if (mouseDown && !noLock) { /* 按住左键连续把玩 */ if (now - held.lastPoke > 0.22) poke(held, 'hold'); }
    } else if (mouseDown && !noLock && playing && !uiOpen && !buildMode) {
      const hit = lookHit(); if (hit && hit.head && now - hit.head.lastPoke > 0.22) { swing = 1; poke(hit.head, 'manual', hit.point); }
    }

    // 枪桩/骨龛/魂轮 自动
    for (const b of builds) {
      const d = CAT[b.type];
      if (b.g.userData.orb) { const o = b.g.userData.orb, tt = performance.now() / 1000; o.position.y = 0.55 + Math.sin(tt * 1.7) * 0.05; o.rotation.y = tt * 0.8; o.rotation.x = tt * 0.5; }
      const fh = d.mount ? firstHead(b) : null;
      if (fh) {
        b.timer += dt;
        if (b.timer >= d.mount.period) { b.timer = 0; const rs = resonance(b); let top = 0; for (const h of b.heads) if (h) { trigger(h, 'auto', d.mount.mult * rs.mul); burst(h.g.position, '#6a0008', 10, 0.8, 0.5, -6); top = Math.max(top, h.rec.c.rar); } SFX.soul(3, top); }
        if (b.label) { const sp = screenPos(new V3(b.x, (d.mount.labelY || d.mount.y) + 0.55, b.z)); const dd = camera.position.distanceTo(fh.g.position); if (sp.vis && dd < 9) { b.label.style.display = 'block'; b.label.style.left = sp.x + 'px'; b.label.style.top = sp.y + 'px'; b.label.querySelector('i').style.width = (b.timer / d.mount.period * 100) + '%'; if (b.heads.length > 1) { const rs = resonance(b), k = b.heads.filter(Boolean).length + '/' + b.heads.length + (rs.tags.length ? ' ' + rs.tags.join('·') + ' ×' + rs.mul.toFixed(2) : ''); if (b.label.dataset.k !== k) { b.label.dataset.k = k; let s = b.label.querySelector('s'); if (!s) { s = document.createElement('s'); b.label.appendChild(s); } s.textContent = k; } } } else b.label.style.display = 'none'; }
      } else if (b.label) b.label.style.display = 'none';
      if (d.period && b.type === 'wheel') {
        b.g.userData.spin.rotation.y += dt * 0.5;
        b.timer += dt; const on = heads.filter(h => wheelOf(h) === b);
        on.forEach(h => { const dx = h.g.position.x - b.x, dz = h.g.position.z - b.z; const a = dt * 0.5; const c = Math.cos(a), s = Math.sin(a); h.g.position.x = b.x + dx * c - dz * s; h.g.position.z = b.z + dx * s + dz * c; h.g.rotateY(-a); });
        if (b.timer >= d.period) { b.timer = 0; on.forEach((h, i) => setTimeout(() => { trigger(h, 'auto', 1); SFX.soul(i, h.rec.c.rar); }, i * 90)); }
      }
      if (b.g.userData.turn) { b.g.userData.turn.rotation.y += dt * 0.6; const h0 = b.heads && b.heads[0]; if (h0 && held !== h0) { h0.g.rotateOnWorldAxis(UP, dt * 0.6); seatHead(h0, b, 0); } drawPlaque(b); }
      if (b.g.userData.float) { const f = b.g.userData.float; f.rotation.y += dt * 0.6; f.position.y = 1.1 + Math.sin(now * 1.5) * 0.02; }
      const u = b.g.userData;
      if (u.edge && u.edge.material.opacity > 0) u.edge.material.opacity = Math.max(0, u.edge.material.opacity - dt * 1.5);
      if (u.orb) u.orb.position.y = 1.1 + Math.sin(now * 2) * 0.08;
      if (u.cloth) { const p = u.cloth.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 0.35; p.setZ(i, Math.sin(now * 3 + x * 6) * 0.04 * x); } p.needsUpdate = true; }
      if (u.lava) u.lava.material.map.offset.set(now * 0.01, now * 0.013);
      if (u.bell) u.bell.rotation.z = Math.sin(now * 1.5) * 0.08;
      if (d.swing) b.g.rotation.z = Math.sin(now * 0.7 + b.x) * 0.02;
    }

    // 首级：视觉、摆动、阴影
    for (const h of heads) {
      if (h.lastHit > 0) h.lastHit -= dt;
      if (h.squash > 0) { h.squash = Math.max(0, h.squash - dt * 3.2); const k = Math.sin(h.squash * Math.PI * 2.5) * 0.16 * h.squash; h.hb.group.scale.set(HS * (1 + k * 0.7), HS * (1 - k), HS * (1 + k * 0.7)); }
      if (h.wob > 0) { h.wob = Math.max(0, h.wob - dt * 1.8); const w = h.wob * h.wob, ph = (1 - h.wob) * 26; h.hb.group.rotation.set(Math.sin(ph) * 0.1 * w, Math.sin(ph * 0.7) * 0.06 * w * h.wobA, Math.cos(ph) * 0.14 * w * h.wobA); h.hb.group.position.y = -0.005 + Math.abs(Math.sin(ph * 0.5)) * 0.025 * w; if (h.wob === 0) { h.hb.group.rotation.set(0, 0, 0); h.hb.group.position.y = -0.005; } }
      const dd = camera.position.distanceToSquared(h.g.position);
      if (!lod) h.g.visible = dd < 400;
      if (dd < 64 && (h.sleep <= 1 || h === held || h.mount || h.sway.lengthSq() > 1e-6 || h.swayV.lengthSq() > 1e-6)) updateSway(h, dt);
      if (!h.mount && h !== held && h.sleep < 1.5) { h.blob.visible = true; const gy = groundY(h.g.position); h.blob.position.set(h.g.position.x, gy + 0.004, h.g.position.z); const hgt = h.g.position.y - gy; h.blob.scale.setScalar(0.42 * Math.max(0.4, 1 - hgt * 0.3)); h.blob.material.opacity = 1; }
      else if (h.mount || h === held) h.blob.visible = false;
      if (h.hb.glow) h.hb.glow.material.opacity = 0.16 + Math.sin(now * 3 + h.idx) * 0.06;
    }
    if (lod) { const st2 = lod.update(heads, camera, held); lodStat = st2; }
    // 光束
    for (let i = beams.length - 1; i >= 0; i--) { const bm = beams[i]; bm.t += dt; bm.l.material.opacity = 1 - bm.t / 0.5; if (bm.t > 0.5) { scene.remove(bm.l); bm.l.geometry.dispose(); bm.l.material.dispose(); beams.splice(i, 1); } }
    updateParticles(dt); updateWisps(dt); updateGhost();
    // 灯光闪烁
    lightTimer -= dt; if (lightTimer <= 0) { assignLights(); lightTimer = 0.7; }
    LIGHTS.forEach((l, i) => { if (!lightList[i]) return; const k = l.userData.k || 1; l.intensity = l.userData.fire ? k * (CZ ? 1.08 + Math.sin(now * 5 + i) * 0.04 + Math.sin(now * 11 + i * 3) * 0.02 : 0.85 + Math.sin(now * 13 + i) * 0.08 + Math.sin(now * 29 + i * 3) * 0.05 + (Math.random() - 0.5) * 0.06) : k * (CZ ? 1.15 : 1); });
    if (cave.update) cave.update(now); else cave.flames.forEach((f, i) => { f.scale.y = 1 + Math.sin(now * 12 + i * 2) * 0.25 + Math.sin(now * 31 + i) * 0.1; f.scale.x = f.scale.z = 1 + Math.sin(now * 17 + i) * 0.08; f.rotation.y = now * 2 + i; });
    if (Math.random() < dt * 14) burst(new V3(cave.firePos.x + (Math.random() - 0.5) * 0.3, 0.25, cave.firePos.z + (Math.random() - 0.5) * 0.3), Math.random() < 0.5 ? '#ff7a20' : '#ffb040', 1, 0.5, 1.4, 1.2);
    scene.traverseVisible && null;
    // 连击
    if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0; }
    // 生命恢复
    regenT += dt; if (regenT >= 10) { regenT = 0; const s = st(); if (S.hp < s.maxHp) { S.hp = Math.min(s.maxHp, S.hp + Math.max(1, Math.round(s.maxHp * (1 + buildBonus().regen + headBonus().regen) / 100))); } }
    // HUD
    hudT -= dt; if (hudT <= 0) { hudT = 0.15; updateHud(); }
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) ui.toast.classList.remove('show'); }
    updateHeadShadows(dt);
    if (post && post.setRayLight && cave) post.setRayLight(_rayP.set(cave.firePos.x, 0.75, cave.firePos.z), 1);
    for (const f of HOOK.pre) { try { f(dt, now); } catch (e) { console.warn(e); } }
    if (post && post.on) post.render(scene, camera); else renderer.render(scene, camera);
  }
  function floorOf(p) { return cave && cave.floorAt ? cave.floorAt(p.x, p.z) : 0; }
  function groundY(p) {
    for (const b of builds) { const d = CAT[b.type]; if (!d.surface) continue; const [hx, hz] = fpOf(b.type, b.rot); if (Math.abs(p.x - b.x) < hx && Math.abs(p.z - b.z) < hz && p.y >= d.surface) return d.surface; }
    return floorOf(p);
  }
  function updateHud() {
    const s = st();
    setT(ui.coins, Math.floor(S.coins).toLocaleString());
    setT(ui.power, s.power);
    { const w = (S.hp / s.maxHp * 100).toFixed(1) + '%'; if (ui.hpbar._w !== w) { ui.hpbar._w = w; ui.hpbar.style.width = w; } }
    setT(ui.hptxt, `${Math.round(S.hp)} / ${s.maxHp}`);
    let bagCount = 0, vN = 0; for (const r of S.heads) { if (r.inBag) bagCount++; else if (r.vault) vN++; }
    { const ex = exhibit(), cx = codexInfo(); const hc = `洞内首级 ${heads.length}/${MAX_HEADS}` + (vN ? ` · 魂库 ${vN}` : '') + (bagCount ? ` · 麻袋 ${bagCount}` : '') + ` · 第 ${S.depth} 层<br><span class="exl">🏛️ 展厅 <b class="g${ex.tier}">${ex.grade}</b> ${fmtN(ex.score)}${ex.next ? '/' + fmtN(ex.next) : ''} · 📖 ${cx.nIds}/${cx.totalIds} · ${daily.n}</span>`; if (hc !== ui._hc) { ui._hc = hc; ui.headcount.innerHTML = hc; } }
    // 准星提示
    let tip = '';
    if (playing && !uiOpen) {
      if (buildMode) tip = '';
      else if (bagCarrying) tip = player.pos.distanceTo(cave.exitPos) < 3.2 ? '<b>[E]</b> 把麻袋扛到洞内空地再倒出 · <b>Q</b>放下' : '<b>[E]</b> 倒出麻袋里的首级 · <b>Q</b>放下';
      else if (bagGroup && player.pos.distanceTo(bagGroup.position) < 2.8) tip = '<b>[E]</b> 扛起战利品麻袋';
      else {
        let hit = lookHit(); const th = targetHead(hit); if (th && !(hit && hit.head === th)) hit = { head: th, d: 1 };
        aimHead = th;
        let htip = null; for (const f of HOOK.tip) { try { htip = f(hit, held); } catch (e) {} if (htip) break; }
        if (htip) tip = htip;
        else if (held) tip = `手持「${NM(held.rec.c)}」 · <b>左键</b>把玩 · <b>滚轮</b>转向 · <b>V</b>换表情 · <b>E</b>放下/插桩 · <b>长按E</b>精确摆放 · <b>右键</b>扔 · <b>F</b>查看`;
        else if (hit && hit.head) { const c = hit.head.rec.c; tip = `<span style="color:${RAR[c.rar].c}">【${RAR[c.rar].n}】</span>${c.shiny ? ' <span style="color:#ffe27a">✨异色</span>' : ''} <b>${NM(c)}</b>${c.title ? ` <small style="color:#e6c7a0">『${c.title}』</small>` : ''} · ${c.raceN}${c.idN}${(c.aff || []).length ? '<br><small>' + c.aff.map(k => RPG.AFF[k] ? RPG.affHTML(k, 'pill') : '').join('') + '</small>' : ''}<br><small>左键把玩 · E 拿起 · 长按E 摆放 · F 查看/回忆 · XX 碾碎</small>`; }
        else if (player.pos.distanceTo(cave.exitPos) < 2.6) tip = '<b>[E]</b> 离开洞窟，出去狩猎';
        else if (player.pos.distanceTo(cave.merchantPos) < 2.4) tip = '<b>[E]</b> 和地精行商斯尼克交易';
        else if (hit && hit.build) { const d = CAT[hit.build.type]; tip = `<b>${d.n}</b>` + (d.train ? ' · <b>[E]</b> 开始训练' : '') + (d.mount ? (() => { const n = hit.build.heads.length, k = hit.build.heads.filter(Boolean).length; return (k ? ' · 左键把玩 · E 取下' : '') + (k < n ? ' · 手持首级按 E 插上' : '') + (n > 1 ? ` · ${k}/${n} 位` : ''); })() : '') + ' <small>· XX 拆除</small>'; }
      }
    }
    if (hplace) tip = `🟩 摆放「${NM(hplace.h.rec.c)}」 · ${hplace.mount ? '吸附到展位' : HP_POSE[hplace.pose]} · <b>左键/E</b>放下 · <b>滚轮</b>旋转(Shift微调) · <b>R</b>换姿势 · <b>右键/Esc</b>取消`;
    setH(ui.tip, tip); { const dsp = tip ? 'block' : 'none'; if (ui.tip._d !== dsp) { ui.tip._d = dsp; ui.tip.style.display = dsp; } }
    ui.cross.classList.toggle('active', !!tip && !buildMode);
    ui.vign.style.background = S.hp / s.maxHp < 0.3 ? 'radial-gradient(ellipse at center, transparent 55%, rgba(160,0,0,0.45) 100%)' : '';
  }
  frame();

  // ---------------- 对外 ----------------
  window.G = {
    _dbg: { supportH: h => supportH(h), hullOf: h => hullOf(h), submitBounty: h => submitBounty(h), interactE: () => interactE(), startSeance: h => startSeance(h), carry() { bagCarrying = true; }, unloadBag: () => unloadBag(), get cine() { return cine; } },
    hasAff, yieldOf, xpMul, headBonus, exhibit, codexInfo, daily, DAILY, bounties, rerollBounties, EX_T, fmtN, S, heads, builds, player, RAR, st, buildBonus, cost, bought, startPlace, cancelBuild, dig, buyEquip, buyItem, useItem, train, damage, flash, toast, addCoins,
    save, wipe, setUI, lockPointer, spawnReturnHeads, addHeadRecs, createReturnBag, usedSig, usedNames, headOf, removeHead, refreshWeapon, burst, get cave() { return cave; },
    post, lod, get lodStat() { return lodStat; }, startHP, confirmHP, cancelHP, updateHP, get hplace() { return hplace; }, storeHead, takeOut, storeLoose, vaultCount, MAX_HEADS, VAULT_MAX, HOOK, rebuildHead, floatText, spawnBeam, gachaCard, lookHit, unmount, soulWisp, trigger, SAVE_KEY, get clock() { return clock; }, get held() { return held; }, set held(v) { held = v; }, get keys() { return keys; }, get cine() { return cine; }, setUIOpen: v => setUI(v),
    get playing() { return playing; }, get uiOpen() { return uiOpen; }, unstick, relockNeeded, vm, get weapon() { return weaponMesh; }, fist, get held() { return held; }, renderer, camera, scene, poke, mountHead, createHead, addBuild
  };
  G.postFx = post; G.renderer = G.renderer || renderer; window.__game = G;
  if (window.Play) try { Play.init(); } catch (e) { console.warn('Play.init', e); }
  if (window.Combat) try { Combat.init(G); HOOK.frame.push((dt, now) => Combat.update(dt, now)); HOOK.pre.push(() => Combat.prerender()); } catch (e) { console.warn('Combat.init', e); }
  if (window.CFX3D) try { CFX3D.init(G); } catch (e) { console.warn('CFX3D.init', e); } // R41：3D 战斗特效（在 Combat.update 之后更新）
  if (window.FPV) try { FPV.init(G); } catch (e) { console.warn('FPV.init', e); } // R41：第一人称双手 / 第三人称
  if (window.UI) UI.init();
};
