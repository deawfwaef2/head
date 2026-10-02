// R62 · 装具：钉子 / 锁链 / 挂钩 / 铁环 / 秤砣 / 铜铃 / 吊灯 —— 洞穴里的物理连接系统（MOD：rigging，默认开）
// 用户要求：“钉子钉在任何实体里、可以取出来、可以固定在墙里；锁链能连接肉块和头；挂钩下端钩住头、上端挂在钉子上；头再用锁链连着她的两只脚——要有物理学效果；
//           多设计一些小摆具；这些物理道具的连锁要给资源产出一点点增益，结合现在的新机制。”
//
// 一、做法：基于位置的动力学（PBD / Verlet）
//   · 粒子 Pt {p,o,w}：w=0 的是固定点（钉在岩壁/地面的钉子）。锁链 = 一串粒子 + “最大距离”约束（只拉不推），两端粒子就是被连接物体上的挂点（共用同一个粒子，所以不会断开）。
//   · 刚体 Body：首级（G.heads）、摆件（Props.items，断手/断脚/器官标本/尸块都是）、秤砣/铜铃/吊灯 —— 一个质心粒子 + 若干挂点粒子，彼此用等距约束连成刚性簇；
//     每帧用“挂点方向的最短弧旋转”更新朝向（挂着的首级会自己摆正、晃动）。被连上的首级 sleep 置 5，让 game.js 自己的头部物理跳过它，位置交给本模块。
//   · 钉子打在首级/摆件上 = 在那个实体上多一个“螺柱”挂点（拔出来就还给你）；打在墙/地/建筑上 = 固定点。
//   · 碰撞：地面（G.cave.floorAt）、洞壁、洞顶、石柱，玩家身体会推开粒子并把速度传给它（走过去会撞得晃起来）。
//   · 拿起首级/摆件（E）、首级入座建筑：自动解开它身上的链与钉，物体恢复原来的物理。
// 二、连锁增益（Rig.mul，接在 Props.auraMul 里；回合制的 roundMul 也包含它）：只对“至少一端钉住（锚定）”的连锁组生效，整体封顶 ×1.4：
//   链/钩每多一段 +3%（最多 6 段）、首级被吊离地面 +5%、正在摆动 +0~8%、组里有吊灯 +4%/盏（最多 2）、有秤砣 +4%。
//   铜铃摆动够快会“响”：连锁共鸣，响一次触发同组最多 4 颗首级 ×1.25 产出（每只铃 9 秒冷却）。
// 三、存档：G.S.rig = { v, nid, parts:[{id,k,...}], bq:{ 'p<pid>':[x,y,z,qx,qy,qz,qw] } }；引用 Ref：{t:'part',id,port} / {t:'head',rid,l} / {t:'prop',pid,l}（l = 相对质心的本地偏移）。
// 四、模型：锁链环/钉/钩/环/秤砣/铜铃是最简单的几何体（和 props.js 里的牵魂线同类）；吊灯用 Poly Haven CC0 的 Lantern_01。
window.Rig = (() => {
  // R63b：优先用真实音效包的语义音（SfxPack.cue），没加载时退回原来的 SFX.play
  const snd = (k, p, fb, v, r) => { if (window.SfxPack && SfxPack.ready && SfxPack.cue(k, p)) return; window.SFX && SFX.play && SFX.play(fb, v, r); };
  const on = () => !(window.Mods && Mods.on && Mods.on('rigging') === false);
  const STUB = { on, off: true, mul: () => 1, releaseProp() {}, startPlace() {}, KD: {} };
  if (!on() || !window.THREE) return STUB;
  const V3 = THREE.Vector3, Q = THREE.Quaternion, A = () => window.Assets;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const GRAV = -9.8, SUB = 2, ITER = 10, LINK = 0.1, MAXL = 8, MAXSEG = 90;
  const KD = {
    nail: { n: '铁钉', icon: '📌' }, chain: { n: '锁链', icon: '🔗' }, hook: { n: '挂钩', icon: '🪝' }, ring: { n: '三叉铁环', icon: '⭕' },
    weight: { n: '秤砣', icon: '⚓' }, bell: { n: '招魂铜铃', icon: '🔔' }, lantern: { n: '吊灯', icon: '🏮' }
  };
  const HANG = { weight: { eye: 0.13, mass: 4, rad: 0.09 }, bell: { eye: 0.12, mass: 0.7, rad: 0.08 }, lantern: { eye: 0.17, mass: 1.0, rad: 0.12 }, ring: null };

  const group = new THREE.Group(); group.name = 'rig';
  const inWild = () => !!(window.Worlds && Worlds.active);
  const S = () => G.S.rig || (G.S.rig = { v: 1, nid: 1, parts: [], bq: {} });
  const parts = () => S().parts;
  const pOf = id => parts().find(p => p.id === id);
  const tmp = new V3(), tmp2 = new V3(), _q = new Q(), _q2 = new Q(), X = new V3(1, 0, 0), Zp = new V3(0, 0, 1), Yp = new V3(0, 1, 0);
  const rid6 = () => Math.random().toString(36).slice(2, 9);

  // ---------------------------------------------------------------- 模型（最简几何体 + 暗铁材质）
  const IRON = new THREE.MeshStandardMaterial({ color: 0x2a2825, roughness: 0.5, metalness: 0.5 });
  const BRONZE = new THREE.MeshStandardMaterial({ color: 0x5a3c18, roughness: 0.42, metalness: 0.55 });
  const GLOW = new THREE.MeshBasicMaterial({ color: 0x9fe8d0 });
  const linkGeo = new THREE.TorusGeometry(0.036, 0.0105, 6, 14); linkGeo.scale(1.5, 1, 1);
  const pickMat = new THREE.MeshBasicMaterial({ visible: false });
  const mesh = (g, m) => { const o = new THREE.Mesh(g, m || IRON); return o; };
  function visNail() { // 钉头在原点，钉身沿 -Z
    const g = new THREE.Group(), head = mesh(new THREE.CylinderGeometry(0.024, 0.02, 0.011, 10)), body = mesh(new THREE.CylinderGeometry(0.0075, 0.005, 0.17, 7)), tip = mesh(new THREE.ConeGeometry(0.005, 0.03, 7));
    head.rotation.x = Math.PI / 2; head.position.z = 0.002; body.rotation.x = Math.PI / 2; body.position.z = -0.09; tip.rotation.x = -Math.PI / 2; tip.position.z = -0.19; g.add(head, body, tip); return g;
  }
  function visHook() { // 沿本地 Y：眼圈在 +0.15，钩尖/弯口在 -0.15
    const g = new THREE.Group(), eye = mesh(new THREE.TorusGeometry(0.03, 0.0085, 6, 14)); eye.position.y = 0.12; g.add(eye);
    const shaft = mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.2, 6)); shaft.position.y = 0.0; g.add(shaft);
    const curve = new THREE.CatmullRomCurve3([new V3(0, -0.095, 0), new V3(0.0, -0.135, 0), new V3(0.04, -0.158, 0), new V3(0.075, -0.13, 0), new V3(0.085, -0.085, 0)]);
    const bend = mesh(new THREE.TubeGeometry(curve, 14, 0.0085, 6, false)); g.add(bend); return g;
  }
  function visRing() { const g = new THREE.Group(), r = mesh(new THREE.TorusGeometry(0.075, 0.016, 8, 20)); r.rotation.x = Math.PI / 2; g.add(r); for (let i = 0; i < 3; i++) { const l = mesh(new THREE.TorusGeometry(0.02, 0.006, 5, 8)); const a = i / 3 * Math.PI * 2; l.position.set(Math.cos(a) * 0.088, 0, Math.sin(a) * 0.088); l.rotation.set(0, -a, 0); g.add(l); } return g; }
  function visEye(y) { const e = mesh(new THREE.TorusGeometry(0.026, 0.0075, 6, 12)); e.position.y = y; return e; }
  function visWeight() { const g = new THREE.Group(), b = mesh(new THREE.CylinderGeometry(0.05, 0.1, 0.19, 12)); b.position.y = -0.04; g.add(b, visEye(0.098)); return g; }
  function visBell() {
    const g = new THREE.Group(); const pr = [[0.0, 0.06], [0.03, 0.058], [0.05, 0.04], [0.07, 0.0], [0.09, -0.05], [0.1, -0.09], [0.088, -0.095]].map(p => new THREE.Vector2(p[0], p[1]));
    const b = mesh(new THREE.LatheGeometry(pr, 14), BRONZE); b.material = BRONZE.clone(); b.material.side = THREE.DoubleSide; g.add(b); const c = mesh(new THREE.SphereGeometry(0.02, 8, 6), IRON); c.position.y = -0.085; c.userData.clapper = 1; g.add(c); g.add(visEye(0.078)); return g;
  }
  function visLantern() {
    const g = new THREE.Group(); let m = null; const as = A();
    if (as && as.has && as.has('Lantern_01')) m = as.fit('Lantern_01', { h: 0.3 });
    if (!m) { m = new THREE.Group(); const b = mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.22, 8), BRONZE); b.position.y = 0.11; const gl = mesh(new THREE.SphereGeometry(0.045, 8, 6), GLOW); gl.position.y = 0.11; m.add(b, gl); }
    m.position.y = -0.17; g.add(m); g.add(visEye(0.15)); if (as && as.flame) { const f = as.flame(0, -0.1, 0, 0.35, '#9fe8d0'); if (f) g.add(f); } return g;
  }
  const VIS = { nail: visNail, hook: visHook, ring: visRing, weight: visWeight, bell: visBell, lantern: visLantern };
  function ghostify(o) { o.traverse(m => { if (m.isMesh && m.material) { m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = 0.55; m.material.depthWrite = false; } }); }

  // ---------------------------------------------------------------- 运行时：粒子 / 约束 / 刚体
  let all = [], cons = [], bodies = new Map(), RT = new Map(), chains = [], snap = new Map(), ver = 0, builtVer = -1, sig = '', visOf = [];
  function mkPt(key, p, w, r) { const s = snap.get(key), pt = { key, p: new V3().copy(s || p), o: new V3().copy(s || p), w, r: r || 0.02 }; all.push(pt); return pt; }
  const addCon = (a, b, len, eq) => { if (a !== b) cons.push({ a, b, len, eq: !!eq }); };
  const rnd = v => Math.round(v * 200);
  // 几何量（不创建刚体，量取挂点时用）
  function geomHead(h) { return { key: 'h' + h.rec.id, obj: h.g, lcom: h.hit && h.hit.position ? h.hit.position.clone() : new V3(), mass: 1.6, rad: 0.11 }; }
  function geomProp(it) {
    const p = it.p; p.rid = p.rid || rid6(); const e = it.ext || new V3(0.3, 0.3, 0.3), sz = new V3(e.x * p.s, e.y * p.s * (p.sl || 1), e.z * p.s);
    return { key: 'p' + p.rid, obj: it.g, lcom: new V3(0, sz.y / 2, 0), mass: clamp(0.8 + sz.x * sz.y * sz.z * 30, 0.8, 5), rad: Math.max(0.05, sz.y / 2) };
  }
  const comOfGeom = g => g.lcom.clone().applyQuaternion(g.obj.quaternion).add(g.obj.position);
  function headBody(h) {
    const g = geomHead(h); let b = bodies.get(g.key); if (b) return b;
    b = newBody(g.key, 'head', g.obj, g.lcom, g.mass, g.rad); b.h = h; b.rid = h.rec.id; return b;
  }
  function propBody(it) {
    const g = geomProp(it); let b = bodies.get(g.key); if (b) return b; const p = it.p;
    const bq = S().bq['p' + p.rid]; if (bq && !it._rigLoaded) { it.g.position.set(bq[0], bq[1], bq[2]); it.g.quaternion.set(bq[3], bq[4], bq[5], bq[6]); } it._rigLoaded = true;
    b = newBody(g.key, 'prop', g.obj, g.lcom, g.mass, g.rad); b.it = it; b.pid = p.rid; return b;
  }
  function newBody(key, kind, obj, lcom, mass, rad) {
    obj.updateMatrix && obj.updateMatrixWorld(true);
    const b = { key, kind, obj, lcom, mass, rad, q: obj.quaternion.clone(), att: [], sp: 0, prev: new V3(0, 1, 0), tension: 0 };
    tmp.copy(lcom).applyQuaternion(b.q).add(obj.position); b.com = mkPt('b:' + key, tmp, 1 / mass, rad); bodies.set(key, b); return b;
  }
  function attPt(b, l) { // l：相对质心的本地偏移（Vector3）
    const k = rnd(l.x) + ',' + rnd(l.y) + ',' + rnd(l.z); for (const a of b.att) if (a.k === k) return a.pt;
    tmp.copy(l).applyQuaternion(b.q).add(b.com.p); const pt = mkPt('a:' + b.key + ':' + k, tmp, b.com.w, 0.02);
    addCon(b.com, pt, l.length(), true); for (const a of b.att) addCon(a.pt, pt, a.l.distanceTo(l), true);
    b.att.push({ k, l: l.clone(), pt }); if (b.att.length === 1) { b.prev.copy(pt.p).sub(b.com.p); if (b.prev.lengthSq() < 1e-8) b.prev.set(0, 1, 0); b.prev.normalize(); } return pt;
  }
  function bodyOfRef(r) {
    if (r.t === 'head') { const h = G.heads.find(x => x.rec && x.rec.id === r.rid); if (!h || G.held === h || h.mount || h.dead) return null; return headBody(h); }
    if (r.t === 'prop') { const P = window.Props, it = P && P.items && P.items.find(i => i.p && i.p.rid === r.pid && !i.ghost); if (!it) return null; return propBody(it); }
    return null;
  }
  const lv = r => new V3(r.l[0], r.l[1], r.l[2]);
  function ptOf(r) {
    if (!r) return null;
    if (r.t === 'part') { const rt = ensure(r.id); return rt && rt.ports[r.port || 0] || null; }
    const b = bodyOfRef(r); return b ? attPt(b, lv(r)) : null;
  }
  const building = new Set();
  function ensure(id) {
    if (RT.has(id)) return RT.get(id); if (building.has(id)) return null; const d = pOf(id); if (!d) return null; building.add(id);
    const rt = { d, ports: [], obj: null, body: null }; try { buildPart(rt); } catch (e) { console.warn('Rig build', d.k, e); } building.delete(id); RT.set(id, rt); return rt;
  }
  function addPick(obj, id, port, r) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), pickMat); m.userData.rig = { id, port }; obj.add(m); return m; }
  function buildPart(rt) {
    const d = rt.d, k = d.k;
    if (k === 'nail') {
      let pt; if (d.host) { const b = bodyOfRef(d.host); pt = b ? attPt(b, lv(d.host)) : null; rt.body = b; }
      if (!pt) { pt = mkPt('n' + d.id, new V3().fromArray(d.p), 0, 0.02); if (d.host) { rt.dead = true; } }
      rt.ports = [pt]; rt.obj = visNail(); rt.obj.userData.n = d.n; addPick(rt.obj, d.id, 0, 0.09); rt.anim = rt.d.fresh ? 0 : 1; delete rt.d.fresh; return;
    }
    if (k === 'chain') {
      const pa = ptOf(d.a) || mkPt('c' + d.id + '.a', new V3().fromArray(d.fa || [0, 1, 0]), 1 / 0.25, 0.02), pb = ptOf(d.b) || mkPt('c' + d.id + '.b', new V3().fromArray(d.fb || [0, 1, 0]), 1 / 0.25, 0.02);
      const n = clamp(Math.round(d.len / LINK), 2, MAXSEG), seg = d.len / n, ps = [pa];
      const dist = pa.p.distanceTo(pb.p), sag = Math.sqrt(Math.max(0, d.len * d.len - dist * dist)) * 0.5;
      for (let i = 1; i < n; i++) { const t = i / n; tmp.lerpVectors(pa.p, pb.p, t); tmp.y -= Math.sin(t * Math.PI) * sag * 0.9; tmp.x += (Math.random() - 0.5) * 0.004; tmp.z += (Math.random() - 0.5) * 0.004; ps.push(mkPt('c' + d.id + '.' + i, tmp, 1 / 0.25, 0.03)); }
      ps.push(pb); for (let i = 0; i < n; i++) addCon(ps[i], ps[i + 1], seg, false);
      const im = new THREE.InstancedMesh(linkGeo, IRON, n); im.frustumCulled = false; im.userData.rigChain = d.id; rt.obj = im; rt.chain = ps; rt.seg = seg; rt.ports = [pa, pb]; chains.push(rt); return;
    }
    if (k === 'hook') {
      const pa = ptOf(d.a) || mkPt('p' + d.id + '.0', new V3().fromArray(d.fa || [0, 1.15, 0]), 1 / 0.3, 0.03), pb = ptOf(d.b) || mkPt('p' + d.id + '.1', new V3().fromArray(d.fb || [0, 0.85, 0]), 1 / 0.3, 0.03);
      addCon(pa, pb, 0.3, true); rt.ports = [pa, pb]; rt.obj = visHook(); rt.q = new Q(); rt.prev = new V3(0, -1, 0); addPick(rt.obj, d.id, 0, 0.06).position.y = 0.12; addPick(rt.obj, d.id, 1, 0.07).position.y = -0.12; return;
    }
    // ring / weight / bell / lantern：一个质心 + （吊挂物）一个眼圈挂点
    const H = HANG[k], obj = VIS[k](); rt.obj = obj; const hang = d.hang ? ptOf(d.hang) : null;
    if (k === 'ring') {
      const pt = hang || mkPt('r' + d.id, new V3().fromArray(d.p), 1 / 0.5, 0.07); rt.ports = [pt]; rt.free = !hang; addPick(obj, d.id, 0, 0.11); rt.static = !!hang; return;
    }
    const b = newBodyAt('x' + d.id, obj, new V3(0, 0, 0), H.mass, H.rad, new V3().fromArray(d.p), d.q); rt.body = b;
    const eyeL = new V3(0, H.eye, 0), eye = attPt(b, eyeL);
    if (hang) { // 眼圈与被挂点共用一个粒子：把 b.att[0] 换成共享粒子
      const a0 = b.att[0]; const old = a0.pt; cons = cons.filter(c => c.a !== old && c.b !== old); all.splice(all.indexOf(old), 1); a0.pt = hang; addCon(b.com, hang, eyeL.length(), true);
      b.com.p.copy(hang.p).addScaledVector(Yp, -H.eye); b.com.o.copy(b.com.p); b.prev.set(0, 1, 0);
    }
    rt.ports = [b.att[0].pt]; addPick(obj, d.id, 0, 0.1); rt.bellT = 0;
  }
  function newBodyAt(key, obj, lcom, mass, rad, pos, q) {
    obj.position.copy(pos); if (q) obj.quaternion.set(q[0], q[1], q[2], q[3]); else obj.quaternion.identity(); group.add(obj);
    return newBody(key, 'part', obj, lcom, mass, rad);
  }

  // ---------------------------------------------------------------- 构建 / 重建（保留当前粒子位置）
  function teardown() {
    for (const p of all) if (p.key) snap.set(p.key, p.p.clone());
    for (const rt of RT.values()) if (rt.obj) { group.remove(rt.obj); if (rt.obj.dispose) rt.obj.dispose(); }
    all = []; cons = []; bodies = new Map(); RT = new Map(); chains = []; building.clear();
  }
  function rebuild() {
    teardown(); const L = parts().slice().sort((a, b) => a.id - b.id); for (const d of L) ensure(d.id);
    for (const rt of RT.values()) { if (rt.obj && rt.d.k !== 'chain' && !rt.obj.parent) group.add(rt.obj); }
    for (const rt of chains) group.add(rt.obj);
    snap.clear(); builtVer = ver; sig = structSig(); cluster();
  }
  const structSig = () => (G.heads || []).filter(h => h.rec && !h.mount && G.held !== h).map(h => h.rec.id + ':' + h.g.id).join(',') + '|' + ((window.Props && Props.items) ? Props.items.filter(i => !i.ghost).map(i => (i.p && i.p.rid) || '').join(',') : '');
  const mark = () => { ver++; };
  function addPart(d) { d.id = S().nid++; parts().push(d); mark(); try { persistBodies(); } catch (e) { } G.save && G.save(); return d; }

  // 释放：某个实体被拿走/入座 → 解开它身上的链与钉
  function refBody(r) { return r && ((r.t === 'head' && 'h' + r.rid) || (r.t === 'prop' && 'p' + r.pid)) || null; }
  function releaseKey(key, why) {
    const b = bodies.get(key), vel = new V3(); if (b && b.vel) vel.copy(b.vel);
    let n = 0, nails = 0; for (const d of parts().slice()) {
      for (const f of ['a', 'b', 'hang']) if (d[f] && refBody(d[f]) === key) { const pt = ptOf(d[f]); if (pt) { d['f' + f] = pt.p.toArray(); } d[f] = null; n++; }
      if (d.k === 'nail' && d.host && refBody(d.host) === key) { n++; nails++; removePart(d, true); }
    }
    if (nails) G.toast && G.toast(`🔩 ${nails} 颗钉子随${why || '它'}一起取下，已收回储物箱。`, '#d8c8a8', 2.2);
    if (b && b.h) { b.h.vel && b.h.vel.copy(vel); b.h.sleep = 0; b.h.rigged = false; } if (n) mark(); return n;
  }
  function removePart(d, silent) {
    const i = parts().indexOf(d); if (i < 0) return; parts().splice(i, 1);
    for (const o of parts()) for (const f of ['a', 'b', 'hang']) if (o[f] && o[f].t === 'part' && o[f].id === d.id) { const pt = RT.has(d.id) ? RT.get(d.id).ports[o[f].port || 0] : null; if (pt) o['f' + f] = pt.p.toArray(); o[f] = null; }
    refund(d.k); mark(); if (!silent) G.save && G.save();
  }
  function refund(k) { const Sk = window.Sack; if (Sk && Sk.stashAdd) { Sk.stashAdd(Sk.mk('pr_' + k, 1)); } }
  function takeItem(k) { const Sk = window.Sack; if (!Sk || !Sk.have || Sk.have('pr_' + k) < 1) return false; Sk.take('pr_' + k, 1); return true; }
  const haveItem = k => !!(window.Sack && Sack.have && Sack.have('pr_' + k) >= 1);

  // ---------------------------------------------------------------- 物理步进
  const floorAt = (x, z) => (G.cave && G.cave.floorAt ? G.cave.floorAt(x, z) : 0);
  function step(dt) {
    dt = Math.min(dt, 1 / 30); const h = dt / SUB, cmax = 0.25;
    const cav = G.cave, R = cav && cav.R ? cav.R - 0.5 : 14, Hh = cav && cav.H ? cav.H - 0.3 : 8, pil = (cav && cav.pillars) || [], pl = G.player, ppos = pl && pl.pos, pvel = pl && pl.vel;
    for (let s = 0; s < SUB; s++) {
      for (const p of all) {
        if (p.w === 0) continue; tmp.copy(p.p).sub(p.o).multiplyScalar(0.9988); const v = tmp.length(); if (v > 0.35) tmp.multiplyScalar(0.35 / v); p.o.copy(p.p); p.p.add(tmp); p.p.y += GRAV * h * h;
      }
      for (let it = 0; it < ITER; it++) {
        for (const c of cons) {
          const a = c.a, b = c.b, ws = a.w + b.w; if (ws === 0) continue; tmp.subVectors(b.p, a.p); const d = tmp.length(); if (d < 1e-7) continue; const diff = d - c.len; if (!c.eq && diff <= 0) continue;
          const k = clamp(diff, -cmax, cmax) / (d * ws); a.p.addScaledVector(tmp, a.w * k); b.p.addScaledVector(tmp, -b.w * k);
        }
        for (const p of all) {
          if (p.w === 0) continue; const fy = floorAt(p.p.x, p.p.z) + p.r;
          if (p.p.y < fy) { p.p.y = fy; p.fl = true; p.o.y = Math.min(p.o.y, p.p.y); }
          if (p.p.y > Hh) p.p.y = Hh; const rr = Math.hypot(p.p.x, p.p.z); if (rr > R) { p.p.x *= R / rr; p.p.z *= R / rr; }
          for (const c of pil) { const dx = p.p.x - c.x, dz = p.p.z - c.z, rr0 = c.r + p.r + 0.02; if (p.p.y < c.h + 0.1 && dx * dx + dz * dz < rr0 * rr0) { const dd = Math.hypot(dx, dz) || 1e-4; p.p.x = c.x + dx / dd * rr0; p.p.z = c.z + dz / dd * rr0; } }
          if (ppos && p.p.y > ppos.y - 0.05 && p.p.y < ppos.y + 1.8) { const dx = p.p.x - ppos.x, dz = p.p.z - ppos.z, rr1 = 0.42 + p.r; const d2 = dx * dx + dz * dz; if (d2 < rr1 * rr1) { const dd = Math.sqrt(d2) || 1e-4, push = rr1 - dd; p.p.x += dx / dd * push; p.p.z += dz / dd * push; if (pvel) { p.o.x -= pvel.x * h * 0.5; p.o.z -= pvel.z * h * 0.5; } } }
        }
      }
      const lim = 6 * h; // 速度上限 6 m/s：硬收短的链/钩不会把东西“瞬移”，而是被匀速拉上去
      for (const p of all) { if (p.w === 0) continue; tmp.copy(p.p).sub(p.o); const dd = tmp.length(); if (dd > lim) p.p.copy(p.o).addScaledVector(tmp, lim / dd); }
      for (const p of all) if (p.fl) { p.fl = false; p.o.x += (p.p.x - p.o.x) * 0.1; p.o.z += (p.p.z - p.o.z) * 0.1; }
    }
    for (const p of all) if (!isFinite(p.p.x + p.p.y + p.p.z)) { p.p.copy(p.o); if (!isFinite(p.p.x + p.p.y + p.p.z)) p.p.set(0, 1, 0); p.o.copy(p.p); }
    for (const b of bodies.values()) syncBody(b, dt);
  }
  const _d = new V3(), _t = new V3();
  function syncBody(b, dt) {
    if (b.att.length) { const a0 = b.att[0]; _d.copy(a0.pt.p).sub(b.com.p); const len = _d.length(); if (len > 1e-4) { _d.divideScalar(len); _q2.setFromUnitVectors(b.prev, _d); b.q.premultiply(_q2).normalize(); b.prev.copy(_d); } }
    b.obj.quaternion.copy(b.q); _t.copy(b.lcom).applyQuaternion(b.q); b.obj.position.copy(b.com.p).sub(_t);
    _d.copy(b.com.p).sub(b.com.o); const hs = (dt || 0.016) / SUB, v = _d.length() / hs; b.sp += (Math.min(v, 6) - b.sp) * Math.min(1, dt * 3); b.vel = (b.vel || new V3()).copy(_d).multiplyScalar(1 / hs);
    if (b.h) { b.h.sleep = 5; b.h.rigged = true; b.h.vel && b.h.vel.set(0, 0, 0); b.h.av && b.h.av.set(0, 0, 0); }
  }

  // ---------------------------------------------------------------- 画面
  const _m4 = new THREE.Matrix4(), _s = new V3(1, 1, 1), _p = new V3();
  function visual(now) {
    for (const rt of chains) {
      const ps = rt.chain, im = rt.obj;
      for (let i = 0; i < ps.length - 1; i++) {
        _d.copy(ps[i + 1].p).sub(ps[i].p); const len = _d.length() || 1e-4; _d.divideScalar(len); _p.copy(ps[i].p).add(ps[i + 1].p).multiplyScalar(0.5);
        const ref = Math.abs(_d.y) < 0.9 ? Yp : Zp; tmp.crossVectors(_d, ref).normalize(); tmp2.crossVectors(tmp, _d); // x=_d, z=tmp, y=tmp2
        if (i & 1) { // 隔一环转 90°
          const t = tmp.clone(); tmp.copy(tmp2).negate(); tmp2.copy(t);
        }
        _m4.makeBasis(_d, tmp2, tmp); _q.setFromRotationMatrix(_m4); const sc = clamp(rt.seg / LINK, 0.7, 1.5); _s.set(sc, 1, 1); _m4.compose(_p, _q, _s); im.setMatrixAt(i, _m4);
      }
      im.instanceMatrix.needsUpdate = true;
    }
    for (const rt of RT.values()) {
      const d = rt.d, o = rt.obj; if (!o) continue;
      if (d.k === 'nail') {
        const pt = rt.ports[0]; let n = rt.nn || (rt.nn = new V3().fromArray(d.n || [0, 1, 0])); const nn = tmp.copy(n); if (rt.body) nn.applyQuaternion(rt.body.q);
        if (rt.anim < 1) rt.anim = Math.min(1, rt.anim + 0.1); const off = (1 - rt.anim) * (1 - rt.anim) * 0.12;
        o.position.copy(pt.p).addScaledVector(nn, 0.01 + off); o.quaternion.setFromUnitVectors(Zp, nn);
      } else if (d.k === 'hook') {
        _d.copy(rt.ports[1].p).sub(rt.ports[0].p); const l = _d.length(); if (l > 1e-4) { _d.divideScalar(l); _q2.setFromUnitVectors(rt.prev, _d); rt.q.premultiply(_q2); rt.prev.copy(_d); }
        o.quaternion.copy(rt.q); o.position.copy(rt.ports[0].p).add(rt.ports[1].p).multiplyScalar(0.5);
      } else if (d.k === 'ring') {
        const pt = rt.ports[0]; o.position.copy(pt.p); const neigh = ringNeighbor(d.id); if (neigh) { tmp.copy(neigh).sub(pt.p); if (tmp.lengthSq() > 1e-6) { tmp.normalize(); o.quaternion.setFromUnitVectors(Yp, tmp); } }
      } else if (rt.body && d.k === 'bell') {
        rt.bellT = Math.max(0, (rt.bellT || 0) - 0.016); const cl = o.children.find(c => c.userData.clapper); if (cl) cl.position.x = Math.sin(now * 22) * 0.02 * Math.min(1, rt.body.sp);
      }
    }
  }
  function ringNeighbor(id) { for (const rt of chains) { const d = rt.d; if (d.a && d.a.t === 'part' && d.a.id === id) return rt.chain[1].p; if (d.b && d.b.t === 'part' && d.b.id === id) return rt.chain[rt.chain.length - 2].p; } return null; }

  // ---------------------------------------------------------------- 连锁组：并查集 → 增益
  const mulMap = new Map(); let compInfo = [];
  function cluster() {
    const par = new Map(), find = x => { while (par.get(x) !== x) { par.set(x, par.get(par.get(x))); x = par.get(x); } return x; }, add = x => { if (!par.has(x)) par.set(x, x); return x; }, uni = (a, b) => { if (!a || !b) return; add(a); add(b); par.set(find(a), find(b)); };
    const eid = r => !r ? null : r.t === 'part' ? 'P' + r.id : r.t === 'head' ? 'H' + r.rid : r.t === 'prop' ? 'O' + r.pid : null;
    for (const d of parts()) {
      add('P' + d.id); if (d.k === 'chain' || d.k === 'hook') { uni('P' + d.id, eid(d.a)); uni('P' + d.id, eid(d.b)); }
      if (d.hang) uni('P' + d.id, eid(d.hang)); if (d.k === 'nail' && d.host) uni('P' + d.id, eid(d.host));
    }
    const comps = new Map(); for (const x of par.keys()) { const r = find(x); if (!comps.has(r)) comps.set(r, { heads: [], links: 0, nails: 0, lanterns: 0, weights: 0, bells: [], ids: [] }); comps.get(r).ids.push(x); }
    for (const c of comps.values()) for (const x of c.ids) { if (x[0] === 'H') c.heads.push(x.slice(1)); else if (x[0] === 'P') { const d = pOf(+x.slice(1)); if (!d) continue; if (d.k === 'chain' || d.k === 'hook') c.links++; else if (d.k === 'nail') { if (!d.host) c.nails++; } else if (d.k === 'lantern') c.lanterns++; else if (d.k === 'weight') c.weights++; else if (d.k === 'bell') c.bells.push(d.id); } }
    // 锚定：有钉在岩壁/地面的钉子，或钉在别的（已锚定）实体上——这里只认静态钉
    compInfo = [...comps.values()]; mulMap.clear();
    for (const c of compInfo) { c.anch = c.nails > 0 && c.links > 0; for (const hid of c.heads) { const h = G.heads.find(x => x.rec && x.rec.id === hid); if (h) mulMap.set(h.g.position, { c, h }); } }
  }
  function headMul(e) {
    const c = e.c; if (!c.anch) return 1; const b = bodies.get('h' + e.h.rec.id); let m = 1 + 0.03 * Math.min(c.links, 6);
    if (b) { const hung = b.com.p.y > floorAt(b.com.p.x, b.com.p.z) + 0.3; if (hung) m += 0.05; m += 0.08 * Math.min(1, b.sp / 1.0); }
    m += 0.04 * Math.min(2, c.lanterns) + (c.weights ? 0.04 : 0); return Math.min(1.4, m);
  }
  const mul = pos => { const e = mulMap.get(pos); return e ? headMul(e) : 1; };
  function bells(now) {
    for (const c of compInfo) { if (!c.anch || !c.bells.length || !c.heads.length) continue;
      for (const id of c.bells) { const rt = RT.get(id); if (!rt || !rt.body) continue; rt.cd = Math.max(0, (rt.cd || 0) - 0.016 * 4); if (rt.body.sp > 0.9 && rt.cd <= 0) {
        rt.cd = 9; rt.bellT = 1; snd('bell', rt.body.com.p, 'bell', 0.5, 1 + Math.random() * 0.2); const pos = rt.body.com.p.clone().add(new V3(0, 0.25, 0)); let n = 0;
        for (const hid of c.heads) { const h = G.heads.find(x => x.rec && x.rec.id === hid); if (h && n < 4 && G.playing) { G.trigger && G.trigger(h, 'auto', 1.25); n++; G.burst && G.burst(h.g.position, '#9fe8d0', 5, 0.5, 0.4, -1); } }
        if (n) G.floatText && G.floatText(`🔔 连锁共鸣 ×${n}`, pos, '#9fe8d0', 16); } }
    }
  }

  // ---------------------------------------------------------------- 瞄准 / 放置 / 拔出
  const ray = new THREE.Raycaster();
  function aim(opt) {
    opt = opt || {}; ray.setFromCamera({ x: 0, y: 0 }, G.camera); ray.far = 9; const o = ray.ray.origin, dr = ray.ray.direction; let best = null; const cons_ = c => { if (!best || c.t < best.t) best = c; };
    const tg = []; if (G.cave && G.cave.group) tg.push(G.cave.group); for (const b of (G.builds || [])) tg.push(b.g);
    for (const h of ray.intersectObjects(tg, true)) { if (h.distance > 8.5) break; if (!h.face || h.object.isSprite || h.object.isPoints) continue; if (h.object.material && h.object.material.transparent && h.object.material.opacity < 0.3) continue; cons_({ t: h.distance, type: 'surf', pt: h.point.clone(), n: h.face.normal.clone().transformDirection(h.object.matrixWorld) }); break; }
    for (const hd of (G.heads || [])) { if (hd === G.held || hd.mount || !hd.hit) continue; const hh = ray.intersectObject(hd.hit, false)[0]; if (hh) cons_({ t: hh.distance, type: 'head', h: hd, pt: hh.point.clone(), n: hh.point.clone().sub(hd.hit.getWorldPosition(new V3())).normalize() }); }
    const P = window.Props; if (P && P.items) for (const it of P.items) { if (it.ghost || !it.pick || (it.d && it.d.cord) || P.mode && P.mode.it === it) continue; const hh = ray.intersectObject(it.pick, false)[0]; if (hh) cons_({ t: hh.distance, type: 'prop', it, pt: hh.point.clone(), n: hh.point.clone().sub(it.pick.getWorldPosition(new V3())).normalize() }); }
    if (!opt.noPorts) for (const rt of RT.values()) { rt.ports.forEach((pt, i) => { if (rt.d.k === 'chain' || rt.dead) return; tmp.copy(pt.p).sub(o); const t = tmp.dot(dr); if (t < 0.15 || t > 8.5) return; const d2 = tmp.addScaledVector(dr, -t).length(); const rad = rt.d.k === 'nail' ? 0.1 : 0.14; if (d2 < rad) cons_({ t: t - 0.2, type: 'port', rt, port: i, pt: pt.p.clone(), n: new V3(0, 1, 0) }); }); }
    return best || { type: 'air', t: 3, pt: o.clone().addScaledVector(dr, 3), n: new V3(0, 1, 0) };
  }
  function bodyRef(a, shrink) { // 命中首级/摆件 → Ref
    let g, r; if (a.type === 'head') { g = geomHead(a.h); r = { t: 'head', rid: a.h.rec.id }; } else { g = geomProp(a.it); r = { t: 'prop', pid: a.it.p.rid }; }
    const l = a.pt.clone().sub(comOfGeom(g)).multiplyScalar(shrink).applyQuaternion(g.obj.quaternion.clone().invert()); r.l = [+l.x.toFixed(4), +l.y.toFixed(4), +l.z.toFixed(4)]; r.q0 = g.obj.quaternion.clone().invert(); return r;
  }
  function resolveEnd(a, why) { // → Ref 或 null（失败）
    if (a.type === 'port') return { t: 'part', id: a.rt.d.id, port: a.port };
    if (a.type === 'head' || a.type === 'prop') { const r = bodyRef(a, 0.55); delete r.q0; return r; }
    if (a.type === 'surf') { if (!haveItem('nail')) { G.toast('这里要先钉一颗铁钉才能挂东西，背包里没有铁钉了。', '#f88', 2); return null; } takeItem('nail'); const nd = addPart({ k: 'nail', p: a.pt.toArray(), n: a.n.toArray(), fresh: 1 }); window.SFX && SFX.play && SFX.play('metal', 0.5, 0.8); return { t: 'part', id: nd.id, port: 0 }; }
    G.toast('对准钉子、铁环、首级、摆件或岩壁。', '#f88', 1.6); return null;
  }
  let mode = null, hintEl = null, ghost = null, ghostLine = null;
  function hint() { if (!hintEl) { hintEl = document.createElement('div'); hintEl.id = 'rigHint'; hintEl.style.cssText = 'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:31;pointer-events:none;background:linear-gradient(180deg,rgba(18,20,26,.92),rgba(10,12,16,.92));border:1px solid #7a8aa0;border-radius:12px;padding:10px 22px;color:#e6edf6;font:600 16px/1.6 system-ui,"Microsoft YaHei",sans-serif;text-align:center;white-space:nowrap;display:none;box-shadow:0 6px 24px rgba(0,0,0,.5)'; document.body.appendChild(hintEl); } return hintEl; }
  const setHint = html => { const h = hint(); if (!html) { h.style.display = 'none'; return; } if (h._s !== html) { h._s = html; h.innerHTML = html; } h.style.display = 'block'; };
  function closeUI() { try { if (window.UI && UI.close) UI.close(true); } catch (e) { } if (G.uiOpen && G.setUIOpen) G.setUIOpen(false); }
  function startPlace(k) {
    if (!KD[k]) return; if (mode) cancel(); if (inWild()) { G.toast('回洞里才能布置装具。', '#f88'); return; } if (!haveItem(k)) { G.toast('没有这件装具——先在「🧷 道具」页签里制作。', '#f88'); return; }
    if (G.held || G.hplace) { G.toast('先放下手里的首级。', '#f88'); return; } closeUI();
    mode = { k, stage: 0, a: null, len: null, ref: null }; ensureGhost();
    G.toast(`装具：<b>${KD[k].icon} ${KD[k].n}</b> — ${({ nail: '准星指向岩壁/地面/首级/摆件，左键钉入', chain: '左键点第一端，再点第二端；滚轮调长短', hook: '左键点上端（钉子/铁环），再点下端（首级/摆件）', ring: '对准钉子等就挂上去，对准地面则落在地上', weight: '对准钉子/铁环/链端挂上去', bell: '对准钉子/铁环/链端挂上去，晃它就会响', lantern: '对准钉子/铁环/链端挂上去' })[k]}；右键取消`, '#cfe0f5', 3.6);
  }
  function ensureGhost() {
    clearGhost(); if (!mode) return; if (VIS[mode.k]) { ghost = VIS[mode.k](); ghostify(ghost); group.add(ghost); }
    if (mode.k === 'chain' || mode.k === 'hook') { const g = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 20 }, () => new V3())); ghostLine = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.85, depthTest: false })); ghostLine.frustumCulled = false; group.add(ghostLine); }
  }
  function clearGhost() { if (ghost) { group.remove(ghost); ghost = null; } if (ghostLine) { group.remove(ghostLine); ghostLine = null; } }
  function endMode() { mode = null; clearGhost(); setHint(null); }
  function cancel() { if (!mode) return; if (mode.restore) { const d = mode.restore.d; Object.assign(d, mode.restore.o); mark(); } endMode(); }
  function stagePos(a) { return a.pt; }
  function follow() {
    const m = mode, a = aim(m.k === 'nail' ? { noPorts: true } : {}); m.aim = a; const k = m.k, ok = a.type !== 'air';
    if (k === 'nail') {
      const okN = a.type === 'surf' || a.type === 'head' || a.type === 'prop'; m.ok = okN; ghost.visible = okN; if (okN) { ghost.position.copy(a.pt).addScaledVector(a.n, 0.01); ghost.quaternion.setFromUnitVectors(Zp, a.n); }
      setHint(`<b>🔩 铁钉</b>　${okN ? ({ surf: '钉进岩壁 / 地面（固定点）', head: '钉进这颗首级（它身上多一个挂点）', prop: '钉进这件摆件（它身上多一个挂点）' })[a.type] : '对准要钉的地方'}<br><b>左键</b> 钉入 · <b>右键</b> 取消　剩余 ${window.Sack ? Sack.have('pr_nail') : '?'} 颗`); return;
    }
    if (k === 'chain' || k === 'hook') {
      const a0 = m.a ? ptWorld(m.a) : null; ghost && (ghost.visible = false); const L = k === 'hook' ? 0.3 : null;
      if (!a0) { setHint(`<b>${KD[k].icon} ${KD[k].n}</b>　${k === 'hook' ? '先点<b>上端</b>：钉子 / 铁环 / 岩壁' : '点<b>第一端</b>：钉子 / 铁环 / 首级 / 摆件 / 岩壁'}<br><b>左键</b> 选定 · <b>右键</b> 取消`); if (ghostLine) ghostLine.visible = false; return; }
      const dist = a0.distanceTo(a.pt); if (k === 'chain') { if (m.len == null || m.auto) { m.len = clamp(dist * 1.06 + 0.06, 0.3, MAXL); m.auto = true; } } if (ghostLine) { ghostLine.visible = true; const pa = ghostLine.geometry.attributes.position, len = k === 'chain' ? m.len : 0.3, sag = Math.sqrt(Math.max(0, len * len - dist * dist)) * 0.5; for (let i = 0; i < 20; i++) { const t = i / 19; tmp.lerpVectors(a0, a.pt, t); tmp.y -= Math.sin(t * Math.PI) * sag * 0.9; pa.setXYZ(i, tmp.x, tmp.y, tmp.z); } pa.needsUpdate = true; }
      const tight = k === 'chain' ? m.len < dist - 0.02 : dist > 0.32; m.ok = ok && (k === 'chain' ? true : dist < 3.2);
      setHint(`<b>${KD[k].icon} ${KD[k].n}</b>　${k === 'chain' ? `长 <b>${m.len.toFixed(2)} 米</b>/${MAXL}　${tight ? '<span style="color:#ffb86b">偏短：会把两端拉近（吊起）</span>' : '有余量，会垂下来'}` : (dist > 3.2 ? '<span style="color:#f88">太远，先用锁链拉近</span>' : tight ? '<span style="color:#ffb86b">挂钩只有 0.3 米：会把下端的东西提上来</span>' : '挂钩下端到位')}<br>${k === 'chain' ? '<b>滚轮</b> 加长/缩短 · ' : ''}<b>左键</b> 连接第二端 · <b>右键</b> 取消`); return;
    }
    // 吊挂物 / 铁环
    const hasT = a.type === 'port' || a.type === 'head' || a.type === 'prop' || (a.type === 'surf' && Math.abs(a.n.y) < 0.9 && haveItem('nail') && k !== 'ring'); m.ok = ok; ghost.visible = true;
    ghost.position.copy(a.pt); if (hasT) { ghost.position.y = a.pt.y - (HANG[k] ? HANG[k].eye + 0.05 : 0.05); } else ghost.position.y = a.pt.y + (a.type === 'surf' ? 0.12 : 0);
    setHint(`<b>${KD[k].icon} ${KD[k].n}</b>　${hasT ? '挂在这里' : '放在地上（之后用锁链/挂钩连起来）'}<br><b>左键</b> 放置 · <b>右键</b> 取消`);
  }
  function ptWorld(ref) { const pt = ptOf(ref); return pt ? pt.p.clone() : null; }
  function commit() {
    const m = mode, a = m.aim; if (!a || m.ok === false) { window.SFX && SFX.play && SFX.play('error', 0.4); return; } const k = m.k;
    if (k === 'nail') {
      if (!takeItem('nail')) { G.toast('铁钉不够了。', '#f88'); endMode(); return; }
      const d = { k: 'nail', p: a.pt.toArray(), n: a.n.toArray(), fresh: 1 };
      if (a.type === 'head' || a.type === 'prop') { const r = bodyRef(a, 1.0); d.n = a.n.clone().applyQuaternion(r.q0).toArray(); delete r.q0; d.host = r; }
      addPart(d); snd('nail', null, 'metal', 0.7, 0.9); if (!(window.SfxPack && SfxPack.ready)) setTimeout(() => window.SFX && SFX.play && SFX.play('wood', 0.5, 1.3), 90); if (!haveItem('nail')) endMode(); return;
    }
    if (k === 'chain' || k === 'hook') {
      if (!m.a) { const r = resolveEnd(a); if (!r) return; m.a = r; window.SFX && SFX.play && SFX.play('click', 0.5, 1.2); return; }
      if (!m.restore && !takeItem(k)) { G.toast('这件装具不够了。', '#f88'); endMode(); return; }
      const r = resolveEnd(a); if (!r) { if (!m.restore) refund(k); return; }
      if (JSON.stringify(r) === JSON.stringify(m.a)) { G.toast('两端不能是同一个点。', '#f88', 1.4); if (!m.restore) refund(k); return; }
      let d; if (m.restore) { d = m.restore.d; d[m.restore.end] = r; d.len = m.len; delete d['f' + m.restore.end]; } else d = { k, a: m.a, b: r, len: k === 'chain' ? m.len : 0.3 };
      if (m.restore) { mark(); G.save && G.save(); } else addPart(d); rebuild(); afterConnect(); snd('chain', null, 'metal', 0.6, 1); endMode(); return;
    }
    if (!takeItem(k)) { G.toast('这件装具不够了。', '#f88'); endMode(); return; }
    const d = { k, p: a.pt.toArray() };
    if (a.type === 'port' || a.type === 'head' || a.type === 'prop' || (a.type === 'surf' && k !== 'ring' && Math.abs(a.n.y) < 0.9 && haveItem2(k))) { const r = resolveEnd(a); if (!r) { refund(k); return; } d.hang = r; } else d.p[1] += a.type === 'surf' ? 0.12 : 0;
    if (d.hang && HANG[k]) { const pt = ptWorld(d.hang); if (pt) d.p = [pt.x, pt.y - HANG[k].eye, pt.z]; }
    addPart(d); rebuild(); afterConnect(); snd(({ bell: 'bell', weight: 'weight', lantern: 'lantern', ring: 'ring' })[k] || 'hook', null, k === 'bell' ? 'bell' : 'metal', 0.5, 1); endMode();
  }
  const haveItem2 = () => haveItem('nail');
  function afterConnect() {
    let best = 1; for (const e of mulMap.values()) best = Math.max(best, headMul(e)); if (best > 1.001) G.toast(`🔗 连锁成立：相连首级产出 <b>×${best.toFixed(2)}</b>（钉住 · 悬吊 · 摆动都会加成）`, '#9fe8d0', 2.6);
  }
  // 拔出 / 拿起
  function pickAt() { // E 命中的装具
    const a = aim({}); ray.setFromCamera({ x: 0, y: 0 }, G.camera); const o = ray.ray.origin, dr = ray.ray.direction; let best = null;
    for (const rt of chains) { const ps = rt.chain; for (let i = 0; i < ps.length; i++) { tmp.copy(ps[i].p).sub(o); const t = tmp.dot(dr); if (t < 0.15 || t > 7) continue; const d2 = tmp.addScaledVector(dr, -t).length(); if (d2 < 0.12 && (!best || t < best.t)) best = { t, rt, i, kind: 'chain' }; } }
    if (a.type === 'port' && (!best || a.t + 0.2 <= best.t + 0.1)) best = { t: a.t, rt: a.rt, kind: a.rt.d.k };
    if (!best) return null; if ((a.type === 'head' || a.type === 'prop' || a.type === 'surf') && a.t < best.t + (best.kind === 'chain' ? 0.02 : -0.25)) return null; return best; // 首级/摆件/岩壁在链前面（或贴着）时，E 优先拿首级/摆件
  }
  function onE(hit, held, pickup) {
    if (mode || held || !RT.size) return false; const b = pickAt(); if (!b) return false; const d = b.rt.d;
    if (b.kind === 'chain') {
      const n = b.rt.chain.length - 1;
      if (b.i <= 2 || b.i >= n - 2) { // 靠近端点：重接这一端
        const end = b.i <= 2 ? 'a' : 'b', other = end === 'a' ? 'b' : 'a';
        if (d[other]) {
          mode = { k: 'chain', stage: 1, a: d[other], len: d.len, auto: false, restore: { d, end, o: { a: d.a, b: d.b, len: d.len, fa: d.fa, fb: d.fb } } };
          d['f' + end] = b.rt.ports[end === 'a' ? 0 : 1].p.toArray(); d[end] = null; mark(); rebuild(); ensureGhost();
          G.toast('重接这一端：对准新的挂点，<b>左键</b>连接；<b>右键</b>收回整条；Esc 放回。', '#cfe0f5', 2.8); return true;
        }
      }
    }
    removePart(d); rebuild(); snd('pull', null, 'metal', 0.6, 0.8); G.toast(`${KD[d.k].icon} 收回 <b>${KD[d.k].n}</b>（储物箱）`, '#cfe0f5', 1.5); return true;
  }
  function onTip(hit, held) {
    if (mode || held || !RT.size) return null; if (hit && hit.head && hit.d < 1.2) return null; const b = pickAt(); if (!b) return null; const d = b.rt.d, K = KD[d.k];
    const gain = (() => { let m = 0; for (const e of mulMap.values()) { if (e.c.ids.indexOf('P' + d.id) >= 0) m = Math.max(m, headMul(e)); } return m > 1.001 ? ` · 连锁 ×${m.toFixed(2)}` : ''; })();
    if (d.k === 'chain') return `<b>${K.icon} ${K.n}</b> · 长 ${d.len.toFixed(1)} 米${gain} · <b>[E]</b> 收回（靠近端点：重接）`;
    return `<b>${K.icon} ${K.n}</b>${gain} · <b>[E]</b> ${d.k === 'nail' ? '拔出' : '收回'}`;
  }
  // 输入拦截
  document.addEventListener('mousedown', e => { if (!mode) return; e.preventDefault(); e.stopImmediatePropagation(); if (e.button === 0) commit(); else if (e.button === 2) { if (mode.restore) { const d = mode.restore.d; removePart(d); rebuild(); endMode(); } else cancel(); } }, true);
  document.addEventListener('contextmenu', e => { if (mode) e.preventDefault(); }, true);
  document.addEventListener('wheel', e => { if (!mode) return; e.preventDefault(); e.stopImmediatePropagation(); if (mode.k === 'chain') { const dir = e.deltaY < 0 ? 1 : -1; mode.auto = false; mode.len = clamp((mode.len || 1) + dir * (e.shiftKey ? 0.5 : 0.1), 0.3, MAXL); } }, { capture: true, passive: false });
  document.addEventListener('keydown', e => { if (!mode) return; if (e.code === 'Escape') { cancel(); return; } if (['KeyE', 'KeyQ', 'KeyG', 'KeyH', 'KeyF', 'KeyT', 'KeyY', 'Tab'].includes(e.code)) { e.stopImmediatePropagation(); } }, true);

  // ---------------------------------------------------------------- 每帧
  let acc = 0, clT = 0, svT = 0;
  function frame(dt, now) {
    group.visible = !inWild(); if (inWild()) { if (mode) cancel(); return; } if (G.cave && group.parent !== G.scene) G.scene.add(group);
    if (mode) follow();
    // 被拿起 / 入座 / 删除的实体：解开
    for (const b of Array.from(bodies.values())) {
      if (b.h && (G.held === b.h || b.h.mount || !G.heads.includes(b.h))) { releaseKey(b.key, '这颗首级'); }
      else if (b.it && (window.Props && Props.mode && Props.mode.it === b.it)) { releaseKey(b.key, '这件摆件'); }
    }
    const P = window.Props; if (P && P.items) for (const b of Array.from(bodies.values())) if (b.it && !P.items.includes(b.it)) releaseKey(b.key, '这件摆件');
    if (ver !== builtVer) rebuild(); else if ((clT += dt) > 0.6) { clT = 0; const s = structSig(); if (s !== sig) { sig = s; rebuild(); } }
    if (!RT.size) return; if (G.uiOpen || G.cine) { visual(now); return; }
    step(dt); visual(now); acc += dt; if (acc > 0.25) { acc = 0; bells(now); }
    if ((svT += dt) > 1.0) { svT = 0; persistBodies(); cluster(); }
  }
  function persistBodies() {
    const r = S(); for (const b of bodies.values()) if (b.it) { const p = b.it.p, q = b.q; p.x = b.obj.position.x; p.y = b.obj.position.y; p.z = b.obj.position.z; r.bq['p' + p.rid] = [p.x, p.y, p.z, q.x, q.y, q.z, q.w].map(v => +v.toFixed(4)); }
    for (const rt of RT.values()) { if (rt.body && rt.body.kind === 'part') { rt.d.p = rt.body.obj.position.toArray().map(v => +v.toFixed(3)); const q = rt.body.q; rt.d.q = [q.x, q.y, q.z, q.w].map(v => +v.toFixed(4)); } else if (rt.d.k === 'ring' && rt.free) rt.d.p = rt.ports[0].p.toArray().map(v => +v.toFixed(3)); }
  }
  window.addEventListener('beforeunload', () => { try { persistBodies(); } catch (e) { } });
  const wait = setInterval(() => {
    if (!window.G || !G.HOOK || !G.scene || !G.S || !G.cave) return; clearInterval(wait);
    G.scene.add(group); G.HOOK.frame.push(frame); G.HOOK.e.unshift(onE); G.HOOK.tip.push(onTip); rebuild();
    setTimeout(() => { sig = ''; }, 2500); // 首级加载完之后再对一次
  }, 200);
  return { on, mul, KD, startPlace, releaseProp: it => { if (it && it.p && it.p.rid) releaseKey('p' + it.p.rid, '这件摆件'); }, get mode() { return mode; }, get count() { return parts().length; }, _dbg: { addPart, rebuild, step, bodies: () => bodies, RT: () => RT, all: () => all, cons: () => cons, cluster, compInfo: () => compInfo, mulMap, headMul, aim, commit, group, release: releaseKey, removePart } };
})();
