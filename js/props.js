// 第二十二轮（续 4）· 道具系统（MOD：props，默认开）——用野外搜刮来的骨、筋、蜡、发、灰，在「🧷 道具」页签里合成可摆放的 BUFF 道具。
// 设计要点（玩家的要求）：无碰撞、无物理、随便摆；模型可拉伸；每件都有效果（光环 / 戳击加成 / 属性 / 定时产出 / 风铃共鸣）。
//   · 摆放：背包/道具页点「放置」→ 准星指哪摆哪（地面、岩壁、建筑表面、半空都行）。
//     滚轮 = 旋转 · Shift+滚轮 = 缩放 · Alt+滚轮 = 沿长轴拉伸 · Ctrl+滚轮 = 升降 · R = 倾斜 15° · 左键 = 确认 · 右键 = 取消。
//     绳索类（牵魂线、指骨风铃、尸布幡链、宝石串链）：左键定第一个端点，再看向另一处点第二下；滚轮调垂坠，Shift+滚轮调粗细。
//   · 改动：准星对准已摆的道具按 E 拿起（绳索靠近端点则只拖这一端，像拉肠子一样随便拉长）；E/左键放下、右键收回储物箱、Esc 放回原处。
//   · 拉伸会改变效果范围（半径 ∝ 缩放×√拉伸）；同类道具最多 3 件生效，避免堆叠刷屏。
// 存档 S.props：[{t,x,y,z,ry,rx,s,sl,a,b,th,sag}]。模型：Quaternius CC0（items/items.js，经 ItemIcons.make）+ Poly Haven CC0（assets/*.js）。
// 声明：道具全部是「骨头 / 筋 / 蜡 / 头发 / 骨灰」这类暗黑奇幻材料；不做性相关的人体部位。
window.Props = (() => {
  const on = () => !(window.Mods && Mods.on && Mods.on('props') === false);
  const STUB = { on, off: true, auraMul: () => 1, pokeMul: () => 1, bonus: () => null, rollLoot: () => null, carcassExtra: () => [], starter() {}, tabHtml: () => '', bindTab() {}, startPlace() {}, matPool: () => [] };
  if (!on() || !window.THREE) return STUB;
  const V3 = THREE.Vector3, A = window.Assets, II = () => window.ItemIcons;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const MAXN = 60, MAXLEN = 14, PER = 3;

  // ---------------------------------------------------------------- 材料与道具定义
  const MATS = {
    phal: { n: '指骨', icon: '🖐️', rar: 1, desc: '从枯骨上掰下来的细骨。出手的人都知道它有多轻。' },
    sinew: { n: '筋索', icon: '🧵', rar: 1, desc: '晾干的筋，韧得像弓弦。能拉得很长。' },
    wax: { n: '尸蜡', icon: '🕯️', rar: 1, desc: '潮湿墓穴里凝成的蜡质。点起来是冷的蓝火。' },
    lock: { n: '发束', icon: '🪢', rar: 1, desc: '一缕扎好的长发。没有人认领。' },
    ash: { n: '骨灰', icon: '⚱️', rar: 1, desc: '细细的一捧。别打喷嚏。' }
  };
  const P = {
    bonehand: { n: '遗骨堆', icon: '🦴', rar: 1, model: 'Bones', size: 0.6, aura: { r: 3.2, m: 1.15 }, stat: { ter: 1 }, need: { phal: 3, sinew: 1 }, coin: 120,
      desc: '一堆码得整整齐齐的白骨，像有人在这里守了很久。<b>半径 3.2 米内首级产出 ×1.15</b>，地魄 +1。放大/拉高它，范围跟着变大。' },
    mhand: { n: '断手', icon: '🖐️', rar: 2, limbs: ['limb_hand_amber', 'limb_hand_avatar', 'limb_hand_jean', 'limb_hand_mona', 'limb_hand_shenhe'], size: 0.32, poke: { r: 3.5, m: 1.25 }, stat: { str: 1 }, need: { phal: 3, cloth: 2, ash: 1 }, coin: 180,
      desc: '从角色原模型身上取下来的手（带着她的手套），断口还是红的。每次摆出来是随机的一只、随机左右。<b>半径 3.5 米内你亲手戳/按住的收益 ×1.25</b>，力量 +1。可任意旋转、缩放、拉长。' },
    mfoot: { n: '断脚', icon: '🦶', rar: 2, limbs: ['limb_foot_amber', 'limb_foot_jean', 'limb_foot_mona'], size: 0.36, aura: { r: 2.6, m: 1.1 }, stat: { agi: 2 }, need: { phal: 3, cloth: 2, wax: 1 }, coin: 180,
      desc: '角色原模型上的一只脚（连鞋），随机一只、随机左右。<b>半径 2.6 米内首级产出 ×1.1</b>，敏捷 +2。' },
    gut: { n: '肠索', icon: '🪱', rar: 2, cord: true, rad: 0.032, wob: true, th0: 1.6, col: '#a02c36', glow: '#3a0006', aura: { r: 1.4, m: 1.4 }, need: { sinew: 4, herb: 2, hide: 1 }, coin: 170,
      desc: '湿漉漉、软塌塌的一长条，<b>想拉多长拉多长（最长 14 米）</b>，两端随便拖，还能垂下来晃。<b>线两侧 1.4 米内首级产出 ×1.4</b>；线越粗，范围越宽。' },
    bonefoot: { n: '碎骨毯', icon: '🦴', rar: 1, model: 'Bones', size: 0.9, sl0: 0.4, aura: { r: 2.5, m: 1.08 }, stat: { agi: 2 }, need: { phal: 3, ash: 1 }, coin: 100,
      desc: '摊平铺在地上的碎骨，踩上去咯吱响。<b>半径 2.5 米内产出 ×1.08</b>，敏捷 +2。' },
    scroll: { n: '血契卷轴', icon: '📜', rar: 2, model: 'Scroll', size: 0.5, poke: { r: 4, m: 1.5 }, need: { cloth: 2, ash: 1, dust: 2 }, coin: 160,
      desc: '摊开的契约。<b>半径 4 米内，你亲手戳/按住产出的收益 ×1.5</b>（自动产出不吃这个）。' },
    candle: { n: '尸蜡烛', icon: '🕯️', rar: 2, asset: 'brass_candleholders', size: 0.42, flame: '#9fe8d0', aura: { r: 3, m: 1.25 }, need: { wax: 3, bone: 1 }, coin: 200,
      desc: '点着冷蓝火的烛台，首级最爱待在这种光里。<b>半径 3 米内产出 ×1.25</b>。' },
    urn: { n: '骨灰瓮', icon: '⚱️', rar: 1, asset: 'brass_pot_01', size: 0.4, tick: { every: 60, kind: 'dust', n: 2 }, need: { ash: 3, hide: 1 }, coin: 150,
      desc: '黄铜罐里的灰总是不够用。<b>每 60 秒自动往储物箱里添 2 份魂尘</b>（在洞里才计时）。' },
    shield: { n: '战盾饰', icon: '🛡️', rar: 2, model: 'Shield_Celtic_Golden', size: 0.6, stat: { str: 2, con: 1 }, need: { iron: 4, wood: 2 }, coin: 240,
      desc: '挂在岩壁上的圆盾。<b>力量 +2、体魄 +1</b>。靠墙放会自动贴墙、正面朝外。' },
    blade: { n: '断刃碑', icon: '🗡️', rar: 2, model: 'Claymore', size: 1.3, rz0: Math.PI, sink: 0.22, stat: { str: 3, ter: 1 }, need: { iron: 5, bone: 1 }, coin: 300,
      desc: '插进地里的断刃，谁也没拔出来过。<b>力量 +3、地魄 +1</b>。' },
    cache: { n: '藏宝箱', icon: '🧰', rar: 3, model: 'Chest', size: 0.6, tick: { every: 90, kind: 'coin', n: 70 }, need: { wood: 4, iron: 2, gem: 1 }, coin: 400,
      desc: '不知道谁留下的小箱子。<b>每 90 秒产出 70×洞穴层数 魂晶</b>。' },
    thread: { n: '牵魂线', icon: '🪡', rar: 2, cord: true, col: '#8a2a4a', glow: '#c05aff', aura: { r: 1.3, m: 1.35 }, need: { sinew: 3, lock: 1 }, coin: 150,
      desc: '一根拉得很长的筋线。<b>线两侧 1.3 米内首级产出 ×1.35</b>。最长 14 米，两端想拖到哪就拖到哪；线粗一点，范围更宽。' },
    chime: { n: '指骨风铃', icon: '🔔', rar: 2, cord: true, col: '#b8a890', pend: { model: 'Bones', size: 0.2, gap: 0.36 }, chimeR: 2, need: { phal: 4, sinew: 2 }, coin: 200,
      desc: '一串挂着指骨的细绳。<b>每 25 秒自己响一次：线两侧 2 米内的首级各被「敲」一下（×1.5）</b>，发出清脆的骨声。' },
    bunting: { n: '尸布幡链', icon: '🚩', rar: 1, cord: true, col: '#6a2a2a', pend: { model: 'Scroll', size: 0.26, gap: 0.45 }, aura: { r: 1.5, m: 1.15 }, stat: { soul: 1 }, need: { cloth: 4, sinew: 1, lock: 1 }, coin: 120,
      desc: '挂满布条的长绳。<b>两侧 1.5 米内产出 ×1.15，魂力 +1</b>。' },
    garland: { n: '宝石串链', icon: '📿', rar: 3, cord: true, col: '#c9a24a', pend: { model: 'Gems', size: 0.14, gap: 0.3 }, aura: { r: 1.5, m: 1.1 }, stat: { soul: 2 }, need: { gem: 1, sinew: 2, fang: 2 }, coin: 260,
      desc: '血玉和兽牙串成的链子。<b>两侧 1.5 米内产出 ×1.1，魂力 +2</b>。' }
  };
  // ---- R62 装具（逻辑在 js/rigging.js，这里只登记配方 / 说明，复用「道具」页签的制作与背包「放置到洞里」）
  const RIGS = {
    nail: { n: '铁钉', icon: '📌', rar: 1, rig: 1, out: 4, need: { iron: 1 }, coin: 40, eff: ['一次制作 4 颗。可钉进岩壁、地面、首级、摆件里；E 拔出（收回）', '钉在岩壁/地面 = 固定点；钉在首级/摆件上 = 它身上多一个挂点'],
      desc: '粗黑的铁钉。钉在哪里，哪里就成了能吊起东西的固定点。' },
    chain: { n: '锁链', icon: '🔗', rar: 2, rig: 1, need: { iron: 3, sinew: 1 }, coin: 90, eff: ['最长 8 米，有重量、会垂、会晃；滚轮调长短（短了会把两端拉近）', '能连接：钉子、铁环、挂钩、首级、摆件。连锁段数越多，相连首级产出越高（最多 +18%）'],
      desc: '一整盘黑铁链。肉块、头颅、断脚……都能拴在一起。' },
    hook: { n: '挂钩', icon: '🪝', rar: 2, rig: 1, need: { iron: 2, bone: 1 }, coin: 70, eff: ['0.3 米的铁钩：上端挂在钉子/铁环上，下端钩住首级或摆件，会把它提上来', '被吊离地面的首级：产出 +5%（需锚定在钉子上）'],
      desc: '弯成 J 形的铁钩，钩尖磨得发亮。' },
    ring: { n: '三叉铁环', icon: '⭕', rar: 2, rig: 1, need: { iron: 2 }, coin: 60, eff: ['链与链的分叉点：可以同时接多根锁链/挂钩（例：一颗头 → 铁环 → 两只脚）', '落在地上也行，之后用链子把它吊起来'],
      desc: '一只带三个耳的铁环，什么都能往上拴。' },
    weight: { n: '秤砣', icon: '⚓', rar: 2, rig: 1, need: { iron: 4, ash: 1 }, coin: 100, eff: ['沉甸甸的铁砣：把链子坠直、拉紧，还能当配重把轻的东西吊起来', '连锁组里有秤砣：相连首级产出 +4%'],
      desc: '黑铁铸的砣，比看上去重得多。' },
    bell: { n: '招魂铜铃', icon: '🔔', rar: 3, rig: 1, need: { iron: 2, phal: 2, wax: 1 }, coin: 160, eff: ['挂着晃：被撞或摆动得够快就会“响”', '连锁共鸣：响一次，同一连锁组里最多 4 颗首级各触发一次产出 ×1.25（9 秒冷却，需锚定）'],
      desc: '铃舌是一节指骨。碰一下，整条链上的头都会应声。' },
    lantern: { n: '吊灯', icon: '🏮', rar: 2, rig: 1, need: { iron: 1, wax: 3, hide: 1 }, coin: 180, eff: ['挂在钉子或链子上，被碰到会来回荡（Poly Haven CC0 灯笼）', '连锁组里每盏吊灯：相连首级产出 +4%（最多 2 盏）'],
      desc: '一盏冷蓝火的小灯，影子会跟着它晃。' }
  };
  Object.assign(P, RIGS);
  const KEYS = Object.keys(P), LEG = { mhand: 1, mfoot: 1, gut: 1 }; // R55: 这三件改走战场解剖，不再出现在制作列表
  P.og = { n: '器官标本', icon: '🫀', rar: 2, size: 0.36, organ: true, need: {}, coin: 0, desc: '' };

  // Sack 物品定义（脚本加载时 Sack 已就绪；没就绪则等）
  function defs() {
    const Sk = window.Sack; if (!Sk || !Sk.def) return false; if (Sk.IT.phal) return true;
    for (const k in MATS) Sk.def(k, Object.assign({ st: 20, kind: 'mat' }, MATS[k]));
    for (const k of KEYS) Sk.def('pr_' + k, { n: P[k].n, icon: P[k].icon, kind: 'prop', ptype: k, st: 5, rar: P[k].rar, desc: P[k].desc.replace(/<[^>]+>/g, '') });
    return true;
  }
  defs(); const dwait = setInterval(() => { if (defs()) clearInterval(dwait); }, 200);
  const matPool = () => Object.keys(MATS);

  // ---------------------------------------------------------------- 战利品
  function rollLoot(r, kind, lv, extra) {
    const Sk = window.Sack; if (!Sk || !defs()) return null; const out = []; const give = (id, p, a, b) => { if (r() < p) out.push(Sk.mk(id, a + Math.floor(r() * (b - a + 1)))); };
    if (kind === 'corpse') { give('phal', 0.35, 1, 3); give('sinew', 0.25, 1, 2); give('lock', 0.22, 1, 1); give('wax', 0.1, 1, 2); if (extra && extra.boss) { give('ash', 1, 2, 4); give('wax', 1, 2, 3); give('lock', 1, 1, 2); give('sinew', 1, 2, 3); } }
    else if (kind === 'chest') { give('wax', 0.2, 1, 2); give('ash', 0.25, 1, 3); give('phal', 0.15, 1, 2); give('sinew', 0.2, 1, 2); }
    else if (kind === 'crate') { give('sinew', 0.25, 1, 2); give('wax', 0.15, 1, 1); }
    else if (kind === 'barrel') give('ash', 0.22, 1, 2);
    else if (kind === 'basket' || kind === 'bucket') { give('lock', 0.15, 1, 1); give('sinew', 0.12, 1, 1); }
    return out.length ? out : null;
  }
  const carcassExtra = () => { const Sk = window.Sack; if (!Sk || !defs()) return []; return Math.random() < 0.6 ? [Sk.mk('sinew', 1 + Math.floor(Math.random() * 2))] : []; };
  function starter(I) { if (I.propsStart || !defs()) return; I.propsStart = 1; if (window.Mods && Mods.on && Mods.on('no_freebies') !== false) return; const Sk = window.Sack; for (const [k, n] of [['phal', 4], ['sinew', 4], ['wax', 3], ['lock', 2], ['ash', 3]]) I.stash.push(Sk.mk(k, n)); }

  // ---------------------------------------------------------------- 场景对象
  const pg = new THREE.Group(); pg.name = 'props'; const items = []; let ver = 0, dirty = true, bonusC = null, mode = null, hintEl = null, ringM = null;
  const S_ = () => G.S.props || (G.S.props = []);
  // ---- 器官标本：每件的效果按「品质/阶/同主套装」算，写进各自的 it.d（其余代码无需改动）
  const ckey = it => it.p.t === 'og' && it.p.og ? 'og' + it.p.og.t : it.p.t;
  const setN = (og) => items.filter(i => !i.ghost && i.p.t === 'og' && i.p.og && i.p.og.oid === og.oid).length;
  const orgD = (p, n) => Object.assign({}, P.og, window.Organs ? Organs.effect(p.og, n || 1) : {});
  function markDirty() { dirty = true; ver++; for (const it of items) if (it.p.t === 'og' && it.p.og) { const n = setN(it.p.og) + (it.ghost ? 1 : 0); it.d = orgD(it.p, n); it.setN = n; } }
  const cordMat = {}; const cmat = (c, glow) => cordMat[c + glow] || (cordMat[c + glow] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, emissive: glow || '#000', emissiveIntensity: glow ? 0.55 : 0 }));
  const pickMat = new THREE.MeshBasicMaterial({ visible: false });

  function makeModel(d, p) {
    let m = null;
    if (d.organ && window.Organs && p && p.og) m = Organs.model(p.og);
    if (d.limbs && A) { const nm = d.limbs[((p && p.v) || 0) % d.limbs.length]; if (A.has(nm)) { m = A.fit(nm, { d: d.size }); if (m && p && p.fl) m.scale.x = -1; } }
    if (!m && d.model && II() && II().make) { m = II().make(d.model === 'Gems' ? 'Gems#' + (Math.floor(Math.random() * 6)) : d.model, d.size); }
    else if (!m && d.asset && A && A.has(d.asset)) m = A.fit(d.asset, { h: d.size });
    if (!m) { m = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(d.size * 0.5, d.size, d.size * 0.5), cmat('#888', '')); b.position.y = d.size / 2; m.add(b); m.userData.fallback = true; m.userData.size = new V3(d.size * 0.5, d.size, d.size * 0.5); }
    const w = new THREE.Group(); w.add(m); w.rotation.set(d.rx0 || 0, 0, d.rz0 || 0); w.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(w); w.position.y = -bb.min.y - (d.sink || 0);
    const out = new THREE.Group(); out.add(w); out.userData.ext = bb.getSize(new V3()); out.userData.fallback = !!m.userData.fallback;
    if (d.flame && A && A.flame) { const f = A.flame(0, d.size * 0.92, 0, 0.5, d.flame); if (f) out.add(f); }
    return out;
  }
  function disposeKids(g) { for (const c of g.children.slice()) { g.remove(c); c.traverse(o => { if (o.userData && o.userData.ownGeo && o.geometry) o.geometry.dispose(); }); } }

  function layout(it) { layout0(it); if (it.pick) it.pick.userData.propIt = it; }
  function layout0(it) {
    const p = it.p, d = it.d, g = it.g; disposeKids(g); it.pend = []; it.pick = null;
    if (!d.cord) {
      const m = makeModel(d, p); g.add(m); it.ext = m.userData.ext; it.fb = m.userData.fallback;
      g.position.set(p.x, p.y, p.z); g.rotation.set(p.rx || 0, p.ry || 0, 0, 'YXZ'); g.scale.set(p.s, p.s * (p.sl || 1), p.s);
      const ex = it.ext, rad = Math.max(ex.x, ex.y, ex.z) * 0.6 + 0.05, pk = new THREE.Mesh(new THREE.SphereGeometry(rad, 8, 6), pickMat); pk.position.y = ex.y / 2; g.add(pk); it.pick = pk;
    } else {
      g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); g.scale.set(1, 1, 1);
      const a = new V3(...p.a), b = new V3(...p.b), len = a.distanceTo(b); it.len = len; if (len < 0.04) return;
      const mid = a.clone().lerp(b, 0.5); mid.y -= (p.sag || 0.25) * Math.min(len, 6) * 0.35 + 0.02;
      const curve = new THREE.CatmullRomCurve3([a, a.clone().lerp(mid, 0.5).setY(a.y * 0.25 + mid.y * 0.75 + (b.y - a.y) * 0.02), mid, b.clone().lerp(mid, 0.5), b]); it.curve = curve;
      const seg = clamp(Math.ceil(len * 10), 8, 140), rad = d.rad || 0.014, tg = new THREE.TubeGeometry(curve, seg, rad * (p.th || 1), d.wob ? 8 : 6, false);
      if (d.wob) { const pa = tg.attributes.position, rs = 9, c0 = new V3(), v = new V3(); for (let r = 0; r <= seg; r++) { curve.getPointAt(r / seg, c0); const f = 1 + 0.28 * Math.sin(r * 0.85 + 1) + 0.12 * Math.sin(r * 2.3); for (let j = 0; j < rs; j++) { const i = r * rs + j; v.fromBufferAttribute(pa, i).sub(c0).multiplyScalar(f).add(c0); pa.setXYZ(i, v.x, v.y, v.z); } } tg.computeVertexNormals(); }
      const tube = new THREE.Mesh(tg, cmat(d.col, d.glow)); tube.userData.ownGeo = true; g.add(tube);
      const pk = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(seg, 40), 0.1 + rad * 2, 4, false), pickMat); pk.userData.ownGeo = true; g.add(pk); it.pick = pk;
      for (const e of [a, b]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.03 * (p.th || 1) + 0.012, 8, 6), cmat(d.col, d.glow)); k.userData.ownGeo = true; k.position.copy(e); g.add(k); }
      if (d.pend) {
        const n = Math.min(40, Math.floor(len / d.pend.gap));
        for (let i = 1; i <= n; i++) {
          const t = i / (n + 1), pt = curve.getPoint(t); let pm = d.model === 'Gems' ? null : null; const dd = { model: d.pend.model, size: d.pend.size, rz0: Math.PI };
          const m = makeModel(dd); const h = new THREE.Group(); h.position.copy(pt); h.add(m); m.rotation.y = i * 1.7; m.position.y = -d.pend.size * 0.95; g.add(h); it.pend.push(h);
          if (m.userData.fallback) m.children[0].children.forEach(c => { c.material = cmat(d.col, ''); });
        }
      }
    }
  }
  function spawn(p, ghost) {
    let d = P[p.t]; if (!d) return null; if (p.t === 'og') { if (!p.og) return null; d = orgD(p, 1); }
    const it = { p, d, g: new THREE.Group(), ghost: !!ghost, tm: Math.random() * 10, pend: [] }; layout(it); it.g.userData.propIt = it; if (it.pick) it.pick.userData.propIt = it; pg.add(it.g); items.push(it); markDirty(); return it;
  }
  function remove(it) { try { window.Rig && Rig.releaseProp && Rig.releaseProp(it); } catch (e) { } const i = items.indexOf(it); if (i >= 0) items.splice(i, 1); pg.remove(it.g); disposeKids(it.g); markDirty(); }
  function rebuildAll() { for (const it of items) layout(it); }
  function load() {
    for (const it of items.slice()) remove(it);
    for (const p of S_()) { if (P[p.t]) spawn(p); }
    if (S_().length && II()) II().onReady(rebuildAll);
  }

  // ---------------------------------------------------------------- 效果
  // 点到线段距离
  const _ab = new V3(), _ap = new V3();
  function segDist(pt, a, b) { _ab.subVectors(b, a); _ap.subVectors(pt, a); const l2 = _ab.lengthSq(); const t = l2 > 1e-6 ? clamp(_ap.dot(_ab) / l2, 0, 1) : 0; return _ap.sub(_ab.multiplyScalar(t)).length(); }
  const scaleOf = p => clamp(p.s * Math.sqrt(p.sl || 1), 0.6, 2.6);
  function within(it, pos, r) {
    const p = it.p;
    if (it.d.cord) { if (it.len < 0.04) return false; return segDist(pos, new V3(...p.a), new V3(...p.b)) < r * (p.th || 1) * 0.8 + 0.25 * (p.th || 1) * 0.5; }
    return it.g.position.distanceTo(pos) < r * scaleOf(p);
  }
  function mulOf(key, pos) {
    if (!items.length) return 1; let m = 1; const cnt = {};
    for (const it of items) { if (it.ghost) continue; const e = it.d[key]; if (!e) continue; if ((cnt[ckey(it)] || 0) >= PER) continue; if (within(it, pos, e.r)) { cnt[ckey(it)] = (cnt[ckey(it)] || 0) + 1; m *= e.m; } }
    return Math.min(m, 3);
  }
  const auraMul = pos => mulOf('aura', pos) * (window.Rig && Rig.mul ? Rig.mul(pos) : 1), pokeMul = pos => mulOf('poke', pos);
  const RM = () => !!(window.Loop && Loop.rOn && Loop.rOn()), SCAP = () => !(window.Mods && Mods.on && Mods.on('build_stat_cap') === false);
  function roundMul(pos) { let c = 1; for (const it of items) { if (it.ghost || !it.d.chimeR || !it.p.a) continue; if (segDist(pos, new V3(...it.p.a), new V3(...it.p.b)) < it.d.chimeR * (it.p.th || 1)) { c = 1.2; break; } } return Math.min(2, auraMul(pos) * (1 + (pokeMul(pos) - 1) * 0.5) * c); }
  const STN = { str: '力量', con: '体魄', agi: '敏捷', ter: '凶威', soul: '魂力' };
  function effTxt(d) {
    const o = [], Sk = window.Sack; if (d.eff) return d.eff.slice();
    if (d.aura) o.push(RM() ? `回洞结算时，${d.cord ? '线两侧' : '半径'} ${d.aura.r} 米内的首级 ×${d.aura.m}` : `${d.cord ? '线两侧' : '半径'} ${d.aura.r} 米内首级产出 ×${d.aura.m}`);
    if (d.poke) o.push(RM() ? `回洞结算时，半径 ${d.poke.r} 米内的首级 ×${(1 + (d.poke.m - 1) / 2).toFixed(2)}` : `半径 ${d.poke.r} 米内亲手戳的收益 ×${d.poke.m}`);
    if (d.chimeR) o.push(RM() ? `回洞结算时，线两侧 ${d.chimeR} 米内的首级 ×1.2` : `每 25 秒敲响：两侧 ${d.chimeR} 米内首级各产出 ×1.5`);
    if (d.tick) { const nm = d.tick.kind === 'coin' ? '魂晶' : (Sk && Sk.IT[d.tick.kind] ? Sk.IT[d.tick.kind].n : d.tick.kind); o.push(RM() ? `每回合结算：${nm} +${d.tick.n * 3}` : `每 ${d.tick.every} 秒：${nm} +${d.tick.n}`); }
    if (d.stat) o.push(Object.entries(d.stat).map(([k, v]) => `${STN[k] || k} +${v}`).join('、') + (SCAP() ? '（同种只算 1 件）' : '（同种最多 3 件）'));
    if ((d.aura || d.poke) && !d.cord) o.push('放大/拉长它，范围跟着变大');
    return o;
  }
  const flav = d => String(d.desc || '').split('<b>')[0].replace(/<[^>]+>/g, '').trim();
  function bonus() {
    if (!dirty && bonusC !== undefined) return bonusC; dirty = false; const o = { str: 0, con: 0, agi: 0, ter: 0, soul: 0 }, cnt = {}; let any = false;
    for (const it of items) { if (it.ghost || !it.d.stat) continue; if ((cnt[ckey(it)] = (cnt[ckey(it)] || 0) + 1) > (SCAP() ? 1 : PER)) continue; for (const k in it.d.stat) { o[k] += it.d.stat[k]; any = true; } }
    return (bonusC = any ? o : null);
  }
  const inWild = () => !!(window.Worlds && Worlds.active);
  function frame(dt, now) {
    pg.visible = !inWild(); if (inWild()) { if (mode) cancel(true); return; }
    if (G.cave && pg.parent !== G.scene) G.scene.add(pg);
    if (mode) follow(dt);
    const hs = items.some(i => i.d.chimeR) ? G.heads.filter(h => h.mount) : [];
    for (const it of items) {
      if (it.ghost) continue; const d = it.d, p = it.p; it.tm += dt;
      if (d.tick && G.playing && it.tm >= d.tick.every && !(window.Loop && Loop.rOn && Loop.rOn())) { // R54k round_yield：改成每回合结算一次（Loop.settle）
        it.tm = 0; const Sk = window.Sack, pos = it.g.position.clone().add(new V3(0, 0.4, 0));
        if (d.tick.kind === 'coin') { const v = d.tick.n * (G.S.depth || 1); G.addCoins(v); G.floatText('🧰 +' + Math.round(v), pos, '#ffd84a', 15); }
        else if (Sk && Sk.IT[d.tick.kind]) { Sk.stashAdd(Sk.mk(d.tick.kind, d.tick.n)); G.floatText(`${Sk.IT[d.tick.kind].icon} +${d.tick.n}`, pos, '#cfc6ff', 15); G.save && G.save(); }
        G.burst && G.burst(pos, '#cfc6ff', 6, 0.6, 0.5, -1);
      }
      if (d.chimeR) {
        const k = it.ring || 0; it.ring = Math.max(0, k - dt * 0.8);
        if (G.playing && it.tm >= 25) { it.tm = 0; it.ring = 1; const a = new V3(...p.a), b = new V3(...p.b); let n = 0;
          for (const h of hs) if (segDist(h.g.position, a, b) < d.chimeR * (p.th || 1)) { G.trigger(h, 'auto', 1.5); n++; if (n < 6) G.burst(h.g.position, '#e8dcc0', 6, 0.6, 0.5, -1); }
          window.SFX && SFX.soul && SFX.soul(3, 0); if (n) G.floatText('🔔 ×' + n, it.curve ? it.curve.getPoint(0.5).add(new V3(0, 0.3, 0)) : a, '#e8dcc0', 14); }
      }
      if (it.pend && it.pend.length) { const a = 0.06 + (it.ring || 0) * 0.5; it.pend.forEach((h, i) => { h.rotation.z = Math.sin(now * (1.3 + (i % 3) * 0.2) + i) * a; h.rotation.x = Math.cos(now * 1.1 + i * 1.3) * a * 0.6; }); }
    }
  }

  // ---------------------------------------------------------------- 摆放 / 拿起
  const ray = new THREE.Raycaster();
  function aim() {
    ray.setFromCamera({ x: 0, y: 0 }, G.camera); ray.far = 9;
    const tg = []; if (G.cave && G.cave.group) tg.push(G.cave.group); for (const b of G.builds) tg.push(b.g);
    for (const h of ray.intersectObjects(tg, true)) { if (h.distance > 8) break; if (!h.face || h.object.isSprite || h.object.isPoints) continue; if (h.object.material && h.object.material.transparent && h.object.material.opacity < 0.3) continue;
      return { pt: h.point.clone(), n: h.face.normal.clone().transformDirection(h.object.matrixWorld), d: h.distance }; }
    const dir = ray.ray.direction; return { pt: ray.ray.origin.clone().addScaledVector(dir, 3), n: new V3(0, 1, 0), d: 3, air: true };
  }
  function pickProp() {
    if (!items.length) return null; ray.setFromCamera({ x: 0, y: 0 }, G.camera); ray.far = 7;
    const ps = items.filter(i => !i.ghost && i.pick).map(i => i.pick), h = ray.intersectObjects(ps, false)[0]; if (!h) return null;
    const lh = G.lookHit && G.lookHit(); if (lh && lh.d < h.distance - 0.05) return null;
    return { it: h.object.userData.propIt, pt: h.point, d: h.distance };
  }
  function hint() {
    if (!hintEl) { hintEl = document.createElement('div'); hintEl.id = 'propHint'; hintEl.style.cssText = 'position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:30;pointer-events:none;background:rgba(14,10,22,.82);border:1px solid #6b4a8a;border-radius:8px;padding:7px 14px;color:#e8dcff;font:13px/1.55 system-ui,"Microsoft YaHei",sans-serif;text-align:center;white-space:nowrap;display:none'; document.body.appendChild(hintEl); }
    return hintEl;
  }
  function setHint(html) { const h = hint(); if (!html) { h.style.display = 'none'; return; } if (h._s !== html) { h._s = html; h.innerHTML = html; } h.style.display = 'block'; }
  function ringShow(it) {
    const d = it.d, e = d.aura || d.poke; if (!e || d.cord) { if (ringM) ringM.visible = false; return; }
    if (!ringM) { ringM = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 48), new THREE.MeshBasicMaterial({ color: '#c08aff', transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false, fog: false })); ringM.rotation.x = -Math.PI / 2; ringM.raycast = () => {}; G.scene.add(ringM); }
    const r = e.r * scaleOf(it.p); ringM.visible = true; ringM.scale.set(r, r, 1); ringM.position.set(it.g.position.x, (G.cave && G.cave.floorAt ? G.cave.floorAt(it.g.position.x, it.g.position.z) : 0) + 0.03, it.g.position.z);
  }
  function hudText() {
    const it = mode.it, d = it.d, p = it.p;
    if (d.cord) return `<b>${d.icon} ${d.n}</b>　长 ${(it.len || 0).toFixed(1)} 米/${MAXLEN}　粗 ${(p.th || 1).toFixed(1)}　垂坠 ${(p.sag || 0).toFixed(2)}<br>${mode.k === 'place' ? (mode.stage ? '再看向另一处 · <b>左键</b> 定第二个端点' : '<b>左键</b> 定第一个端点') : (mode.grab === 'all' ? '整根拖动（Alt+滚轮 拉长/缩短）' : '只拖一端')} · 滚轮 垂坠 · Shift+滚轮 粗细 · Ctrl+滚轮 升降 · <b>右键</b> ${mode.k === 'place' ? '取消' : '收回'}`;
    const r = (d.aura || d.poke) ? `　范围 ${((d.aura || d.poke).r * scaleOf(p)).toFixed(1)} 米` : '';
    return `<b>${d.icon} ${d.n}</b>　缩放 ${p.s.toFixed(2)}　拉伸 ${(p.sl || 1).toFixed(2)}${r}<br><b>滚轮</b> 旋转 · <b>Shift</b> 缩放 · <b>Alt</b> 拉伸 · <b>Ctrl</b> 升降 · <b>R</b> 倾斜 · <b>${mode.k === 'place' ? '左键 放下 · 右键 取消' : '左键/E 放下 · 右键 收回 · Esc 放回'}</b>`;
  }
  function follow(dt) {
    const it = mode.it, d = it.d, p = it.p, a = aim(), lift = mode.lift || 0;
    if (!d.cord) {
      const wall = Math.abs(a.n.y) < 0.55 && !a.air, sz = (it.ext ? it.ext.y : d.size) * p.s * (p.sl || 1);
      if (wall) p.ry = Math.atan2(a.n.x, a.n.z) + (mode.dyaw || 0);
      p.x = a.pt.x + (wall ? a.n.x * 0.03 : 0); p.z = a.pt.z + (wall ? a.n.z * 0.03 : 0); p.y = a.pt.y + lift - (wall ? sz * 0.5 : 0);
      if (!wall) p.ry = mode.yaw || 0;
      const g = it.g; g.position.set(p.x, p.y, p.z); g.rotation.set(p.rx || 0, p.ry, 0, 'YXZ'); g.scale.set(p.s, p.s * (p.sl || 1), p.s); ringShow(it);
    } else {
      const pt = a.pt.clone(); pt.y += lift + 0.02; let ch = false;
      const lim = (from, q) => { const v = q.clone().sub(from); if (v.length() > MAXLEN) q.copy(from).addScaledVector(v.normalize(), MAXLEN); return q; };
      if (mode.k === 'place') { if (mode.stage === 0) { p.a = p.b = pt.toArray(); ch = true; } else { const A_ = new V3(...p.a), B = lim(A_, pt); p.b = B.toArray(); ch = true; } }
      else if (mode.grab === 'a') { const B = new V3(...p.b); p.a = lim(B, pt).toArray(); ch = true; }
      else if (mode.grab === 'b') { const A_ = new V3(...p.a); p.b = lim(A_, pt).toArray(); ch = true; }
      else { const c = new V3(...mode.o.a).add(new V3(...mode.o.b)).multiplyScalar(0.5), sh = pt.clone().sub(c).add(new V3(0, 0, 0)); const k = mode.scale || 1; const A0 = new V3(...mode.o.a), B0 = new V3(...mode.o.b);
        const na = c.clone().add(A0.sub(c).multiplyScalar(k)).add(sh), nb = c.clone().add(B0.sub(c).multiplyScalar(k)).add(sh); p.a = na.toArray(); p.b = nb.toArray(); ch = true; }
      if (ch) { const sig = p.a.concat(p.b, [p.sag, p.th]).map(v => Math.round(v * 500)).join(','); if (sig !== it.sig) { it.sig = sig; layout(it); } }
    }
    setHint(hudText());
  }
  function findIn(id) { const I = Sack.inv(); for (const L of [I.stash, I.sack.items]) { const o = L.find(q => q.id === id && q.n > 0); if (o) return [L, o]; } return null; }
  function findU(u) { const I = window.Sack.inv(); for (const L of [I.stash, I.sack.items]) { const o = L.find(x => x && x.u === u); if (o) return [L, o]; } return null; }
  function takeU(u) { const f = findU(u); if (!f) return false; f[0].splice(f[0].indexOf(f[1]), 1); return true; }
  function takeOne(id) { const f = findIn(id); if (!f) return false; const [L, o] = f; o.n--; if (o.n <= 0) L.splice(L.indexOf(o), 1); return true; }
  function closeUI() { try { if (window.UI && UI.close) UI.close(true); } catch (e) { } if (G.uiOpen && G.setUIOpen) G.setUIOpen(false); }
  function startPlace(t, item) {
    const d = P[t]; if (!d || !window.Sack) return; if (d.rig) { if (window.Rig && Rig.startPlace) Rig.startPlace(t); return; } if (mode) cancel(true);
    if (t === 'og' && !(item && item.og && findU(item.u))) { G.toast('这件器官不在背包里。', '#f88'); return; }
    if (inWild()) { G.toast('回洞里才能布置道具。', '#f88'); return; }
    if (t !== 'og' && !findIn('pr_' + t)) { G.toast('没有这件道具——先在「🧷 道具」页签里制作。', '#f88'); return; }
    if (items.filter(i => !i.ghost).length >= MAXN) { G.toast(`洞里最多摆 ${MAXN} 件道具。`, '#f88'); return; }
    if (G.held || G.hplace) { G.toast('先放下手里的首级。', '#f88'); return; }
    if (II() && !II().ready) II().onReady(() => { rebuildAll(); });
    closeUI();
    const yaw = Math.atan2(-(G.camera.getWorldDirection(new V3()).x), -(G.camera.getWorldDirection(new V3()).z)) + Math.PI;
    const p = { t, x: 0, y: 0, z: 0, ry: yaw, rx: 0, s: 1, sl: d.sl0 || 1 }; if (t === 'og') p.og = JSON.parse(JSON.stringify(item.og)); if (d.limbs) { p.v = Math.floor(Math.random() * 9); p.fl = Math.random() < 0.5 ? 1 : 0; }
    if (d.cord) { p.a = [0, 0, 0]; p.b = [0, 0, 0]; p.th = d.th0 || 1; p.sag = d.wob ? 0.45 : 0.25; }
    const it = spawn(p, true); mode = { k: 'place', type: t, item, it, stage: 0, lift: 0, yaw };
    G.toast(`摆放 <b>${d.n}</b>：${d.cord ? '左键定第一个端点，再看向别处点第二下' : '准星指哪摆哪，滚轮旋转'}，右键取消`, '#cfb8ff', 3.4);
  }
  function grab(hit) {
    if (mode) return; const it = hit.it, d = it.d, p = it.p; if (!it) return; try { window.Rig && Rig.releaseProp && Rig.releaseProp(it); } catch (e) { }
    mode = { k: 'carry', it, o: JSON.parse(JSON.stringify(p)), lift: 0, yaw: p.ry || 0 };
    if (d.cord) { const a = new V3(...p.a), b = new V3(...p.b); mode.grab = hit.pt.distanceTo(a) < 0.45 ? 'a' : hit.pt.distanceTo(b) < 0.45 ? 'b' : 'all'; }
    G.toast(`拿起 <b>${d.n}</b>`, '#cfb8ff', 1.4);
  }
  function endMode() { mode = null; setHint(null); if (ringM) ringM.visible = false; }
  function cancel(force) {
    if (!mode) return; const it = mode.it;
    if (mode.k === 'place') remove(it);
    else { Object.assign(it.p, JSON.parse(JSON.stringify(mode.o))); it.sig = null; layout(it); markDirty(); }
    endMode();
  }
  function commit() {
    const it = mode.it, d = it.d, p = it.p;
    if (mode.k === 'place') {
      if (d.cord) { if (mode.stage === 0) { mode.stage = 1; p.a = p.a.slice(); window.SFX && SFX.play && SFX.play('wood', 0.4, 1.2); return; } if ((it.len || 0) < 0.3) { G.toast('太短了，再拉远一点。', '#f88', 1.4); return; } }
      if (mode.type === 'og' ? !takeU(mode.item.u) : !takeOne('pr_' + mode.type)) { G.toast('道具不够了。', '#f88'); cancel(); return; }
      it.ghost = false; S_().push(p); window.SFX && SFX.play && SFX.play('wood', 0.5, 0.7); G.toast(`已摆放 <b>${d.n}</b>`, '#cfb8ff', 1.6);
    } else { if (d.cord && (it.len || 0) < 0.3) { G.toast('太短了。', '#f88', 1.4); return; } }
    markDirty(); G.save && G.save(); endMode();
  }
  function stow() {
    const it = mode.it, Sk = window.Sack; if (mode.k === 'place') { cancel(); return; }
    const i = S_().indexOf(it.p); if (i >= 0) S_().splice(i, 1); remove(it); Sk.stashAdd(it.p.t === 'og' ? Organs.mkItem(it.p.og) : Sk.mk('pr_' + it.p.t, 1)); G.toast(`收回 <b>${it.d.n}</b>（储物箱）`, '#cfb8ff', 1.6); dirty = true; G.save && G.save(); endMode();
  }

  // 输入拦截：摆放模式里吃掉鼠标/滚轮/部分按键
  document.addEventListener('mousedown', e => { if (!mode) return; e.preventDefault(); e.stopImmediatePropagation(); if (e.button === 0) commit(); else if (e.button === 2) stow(); }, true);
  document.addEventListener('contextmenu', e => { if (mode) { e.preventDefault(); } }, true);
  document.addEventListener('wheel', e => {
    if (!mode) return; e.preventDefault(); e.stopImmediatePropagation(); const dir = e.deltaY < 0 ? 1 : -1, it = mode.it, p = it.p, d = it.d;
    if (d.cord) {
      if (e.shiftKey) p.th = clamp((p.th || 1) * (1 + 0.15 * dir), 0.4, 4); else if (e.ctrlKey) mode.lift = clamp((mode.lift || 0) + 0.06 * dir, -1.5, 3);
      else if (e.altKey) { if (mode.k === 'carry' && mode.grab === 'all') mode.scale = clamp((mode.scale || 1) * (1 + 0.1 * dir), 0.3, 3); } else p.sag = clamp((p.sag || 0) + 0.05 * dir, 0, 0.9);
    } else {
      if (e.shiftKey) p.s = clamp(p.s * (1 + 0.08 * dir), 0.3, 4); else if (e.altKey) p.sl = clamp((p.sl || 1) * (1 + 0.08 * dir), 0.25, 5);
      else if (e.ctrlKey) mode.lift = clamp((mode.lift || 0) + 0.05 * dir, -1.5, 3); else { mode.yaw = (mode.yaw || 0) + dir * Math.PI / 12; mode.dyaw = (mode.dyaw || 0) + dir * Math.PI / 12; }
    }
    it.sig = null; if (!d.cord) { /* follow 每帧更新 */ }
  }, { capture: true, passive: false });
  document.addEventListener('keydown', e => {
    if (!mode) return;
    if (e.code === 'Escape') { cancel(); return; }
    if (e.code === 'KeyR') { e.preventDefault(); e.stopImmediatePropagation(); const p = mode.it.p; if (!mode.it.d.cord) p.rx = ((p.rx || 0) + Math.PI / 12) % (Math.PI * 2); return; }
    if (e.code === 'KeyE') { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat && mode.k === 'carry') commit(); return; }
    if (['KeyQ', 'KeyG', 'KeyH', 'KeyF', 'KeyT', 'KeyY', 'Tab'].includes(e.code)) { e.stopImmediatePropagation(); }
  }, true);

  // E：拿起准星指着的道具；准星提示
  function onE(hit, held, pickup) { if (mode || held || pickup || !items.length) return false; const h = pickProp(); if (!h) return false; grab(h); return true; }
  function onTip(hit, held) {
    if (mode || held || !items.length) return null; if (hit && hit.head) return null; const h = pickProp(); if (!h) return null; const d = h.it.d;
    if (d.organ && window.Organs && h.it.p.og) return Organs.tipHtml(h.it.p.og, h.it.setN || 1);
    const e = d.aura ? `范围 ${(d.aura.r * scaleOf(h.it.p)).toFixed(1)} 米 ×${d.aura.m}` : d.poke ? (RM() ? `范围 ${(d.poke.r * scaleOf(h.it.p)).toFixed(1)} 米 ×${(1 + (d.poke.m - 1) / 2).toFixed(2)}` : `戳击 ×${d.poke.m}`) : d.tick ? (RM() ? '每回合结算' : '定时产出') : d.chimeR ? '风铃' : d.stat ? '属性加成' : '';
    return `<b>${d.icon} ${d.n}</b> · ${e} · <b>[E]</b> 拿起${d.cord ? '（靠近端点只拖一端）' : ''}`;
  }

  // ---------------------------------------------------------------- 「🧷 道具」页签
  function tabHtml() {
    const Sk = window.Sack, S = G.S; defs(); const have = id => Sk.have(id), IT = Sk.IT;
    const need = (id, n) => `<span class="${have(id) >= n ? 'ok' : 'no'}">${IT[id] ? IT[id].icon + IT[id].n : id} ${have(id)}/${n}</span>`;
    const placed = items.filter(i => !i.ghost).length, RC = ['#b9b4aa', '#7fd07a', '#5fa6ff', '#c27cff', '#ffb347'];
    const ownN = k => Sk.inv().stash.concat(Sk.inv().sack.items).filter(o => o.id === 'pr_' + k).reduce((a, o) => a + o.n, 0);
    const mats = Object.keys(MATS).map(k => `<span>${MATS[k].icon}${MATS[k].n} <b>${have(k)}</b></span>`).join('');
    return `<div class="wk-mats"><b>🧷 摆件材料</b>${mats}<span style="margin-left:auto">洞里已摆 <b>${placed}/${MAXN}</b>${placed ? ' <button class="sk-btn" data-precall="1">全部收回</button>' : ''}</span></div>`
      + `<p class="wk-ds" style="margin:0 0 10px">材料从野外容器、尸体和野兽尸骸里翻出来。摆件没有碰撞，准星指哪摆哪；对准已摆的摆件按 <b>E</b> 拿起、拉伸、收回。${RM() ? '<b>回合制：</b>效果在每次回洞结算首级时生效。' : ''}</p><div class="wk-grid">`
      + KEYS.filter(k => !LEG[k]).map(k => { const d = P[k], okN = Object.entries(d.need).every(([i, n]) => have(i) >= n), ok = okN && S.coins >= d.coin, own = ownN(k), col = RC[d.rar] || '#ddd';
        return `<div class="wk-card ${ok ? 'can' : ''}" style="--rc:${col}"><div class="wk-top"><div class="wk-ic"><i>${d.icon}</i></div><div><div class="wk-nm" style="color:${col}">${esc(d.n)}${own ? ` <small style="font-size:14px;color:#cfc2a8">已有 ${own}</small>` : ''}</div><div class="wk-ds">${esc(flav(d))}</div></div></div>`
          + `<div class="wk-note">${effTxt(d).map(t => '▸ ' + esc(t)).join('<br>')}</div><div class="wk-need">${Object.entries(d.need).map(([i, n]) => need(i, n)).join('')}<span class="${S.coins >= d.coin ? 'ok' : 'no'}">🔮 ${d.coin}</span></div>`
          + `<div style="display:flex;gap:8px;margin-top:auto"><button class="sk-btn wk-go" style="flex:1" data-pcraft="${k}" ${ok ? '' : 'disabled'}>${ok ? '制作' : okN ? '魂晶不足' : '材料不足'}</button>${own ? `<button class="sk-btn wk-go" data-pplace="${k}">放置</button>` : ''}</div></div>`; }).join('') + '</div>';
  }
  function bindTab(panel, rerender) {
    panel.querySelectorAll('[data-pcraft]').forEach(b => b.onclick = () => {
      const k = b.dataset.pcraft, d = P[k], Sk = window.Sack, S = G.S;
      for (const i in d.need) if (Sk.have(i) < d.need[i]) { window.SFX && SFX.deny && SFX.deny(); G.toast('材料不足', '#f88'); return; }
      if (S.coins < d.coin) { window.SFX && SFX.deny && SFX.deny(); G.toast('魂晶不足', '#f88'); return; }
      S.coins -= d.coin; for (const i in d.need) Sk.take(i, d.need[i]); Sk.stashAdd(Sk.mk('pr_' + k, d.out || 1)); window.SFX && SFX.play && SFX.play('wood', 0.5, 0.9);
      G.toast(`🧷 制作完成：${d.icon} <b>${d.n}</b>${d.out > 1 ? ' ×' + d.out : ''}（在本页点「放置」）`, '#cfb8ff', 2.4); G.save && G.save(); rerender();
    });
    panel.querySelectorAll('[data-pplace]').forEach(b => b.onclick = () => startPlace(b.dataset.pplace));
    panel.querySelectorAll('[data-precall]').forEach(b => b.onclick = () => { const Sk = window.Sack; for (const it of items.slice()) { if (it.ghost) continue; const i = S_().indexOf(it.p); if (i >= 0) S_().splice(i, 1); Sk.stashAdd(it.p.t === 'og' ? Organs.mkItem(it.p.og) : Sk.mk('pr_' + it.p.t, 1)); remove(it); } G.toast('道具已全部收回储物箱。', '#cfb8ff', 2); G.save && G.save(); rerender(); });
  }

  const wait = setInterval(() => {
    if (!window.G || !G.HOOK || !G.scene || !G.S || !G.cave) return; clearInterval(wait);
    G.scene.add(pg); G.HOOK.frame.push(frame); G.HOOK.e.push(onE); G.HOOK.tip.push(onTip); load();
  }, 200);
  return { on, auraMul, pokeMul, roundMul, effTxt, bonus, rollLoot, carcassExtra, starter, tabHtml, bindTab, startPlace, matPool, P, MATS, get items() { return items; }, get mode() { return mode; }, _dbg: { spawn, remove, layout, load, grab, pickProp, commit, cancel, stow, follow, frame } };
})();
