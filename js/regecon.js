// 第二十六轮(k) · MOD region_econ（默认开）：地区材料经济 + 九座「霸主首级合成器」
// 用户：造建筑 / 合成任何东西都要地图材料搜刮，不同地区有不同材料，不能只靠魂晶——魂晶是洞里休息时能无限刷的资源，不然太无敌。
//       魂晶多了 + 地区霸主首级 → 低级资源合成器；每个地区一座不同的合成器（放霸主首级）。恶趣味，让玩家爽。
// 挂载方式：Sack.def（材料）、Sack.roll / genLoot / placeLoot / carcass 的钩子（掉落与采集点）、
//          game.js placeBuild / dig / 拆除 / mountHead(accept) 与 ui.js 建造卡片（材料消耗）、sack.js enchCost（附魔）、
//          BuildCat.C / Unlocks.R / G.HOOK（合成器建筑）。关掉 MOD = 全部回到只花魂晶。
window.RegEcon = (() => {
  if (window.Mods && Mods.on && !Mods.on('region_econ')) return { off: true };
  const Sk = () => window.Sack, V3 = THREE.Vector3;
  // ---------------------------------------------------------------------------
  // 1) 地区材料：9 个地区 × (常见 + 稀有)，顺序 = 地区难度（与 Lore.LOCS 一致）
  // ---------------------------------------------------------------------------
  const REG = [
    { k: 'village', c: ['rm_straw', '稻草人稻草', '🌾', '从稻草人肚子里掏出来的。稻草人没有发表意见。'], r: ['rm_bell', '牧羊铃铛', '🔔', '牧羊女挂在羊脖子上的铜铃。摇一下，全村的羊都回头看你。'], vein: ['稻草垛', 'wicker_basket_01', 0.7], col: '#e8c860' },
    { k: 'forest', c: ['rm_laurel', '月桂枝', '🍃', '精灵说这棵树有三千岁了。现在它是一捆柴。'], r: ['rm_firefly', '萤火虫罐', '🫙', '一罐会发光的小虫。它们集体对你亮起了警告色。'], vein: ['精灵花圃', 'planter_box_01', 0.9], col: '#7ad07a' },
    { k: 'wilds', c: ['rm_mane', '狼鬃', '🐺', '兽人战士最引以为傲的鬃毛。你打算拿它编鞋垫。'], r: ['rm_totem', '图腾骨', '🗿', '部落图腾柱上最老的一根骨头，上面刻着「别碰」。'], vein: ['兽骨堆', 'bull_head', 0.6], col: '#b08a5a' },
    { k: 'abbey', c: ['rm_holy', '圣水', '💧', '装在小银瓶里的圣水。对食人魔完全无效，但泡茶不错。'], r: ['rm_silver', '圣银十字', '✝️', '修道院的纯银十字架。熔了能打出一把很虔诚的刀。'], vein: ['烛台祭坛', 'brass_candleholders', 0.5], col: '#bfe6ff' },
    { k: 'swamp', c: ['rm_mud', '沼泽黑泥', '🫧', '冒泡的黑泥，魔女们拿它敷脸。据说能年轻十岁。'], r: ['rm_toad', '魔女蛤蟆', '🐸', '魔女的使魔。它这辈子只会说一个字：「呱」。'], vein: ['魔女坩埚', 'brass_pot_01', 0.6], col: '#7aa04a' },
    { k: 'fortress', c: ['rm_steel', '要塞精钢', '🔗', '从城门铰链上拧下来的。守军至今没想明白门为什么关不上。'], r: ['rm_powder', '火药桶', '🧨', '标签上写着「远离火源与食人魔」。你两样都占了。'], vein: ['军械桶堆', 'wine_barrel_01', 0.7], col: '#ffa050' },
    { k: 'capital', c: ['rm_silk', '王都丝绸', '🎀', '贵族裙摆上的丝绸，软得让你不好意思拿它擦刀。'], r: ['rm_gold', '王座金箔', '🪙', '从王座扶手上刮下来的。国王现在坐着有点硌。'], vein: ['贵族行李箱', 'treasure_chest', 0.8], col: '#ff9ac8' },
    { k: 'abyss', c: ['rm_obsid', '深渊黑曜', '🌑', '裂隙里长出来的黑玻璃，照出来的你比本人还丑。'], r: ['rm_core', '深渊魔核', '🔴', '还在一跳一跳的深渊魔核，像颗很有干劲的小心脏。'], vein: ['黑曜裂石', 'namaqualand_boulder_02', 0.9], col: '#b070ff' },
    { k: 'peak', c: ['rm_scale', '龙鳞', '🐉', '从龙骨上剥落的鳞片，敲起来像一面小锣。'], r: ['rm_frost', '万年霜晶', '❄️', '山顶永不融化的冰。含在嘴里能凉一整年。'], vein: ['龙鳞石堆', 'stone_01', 0.7], col: '#cfefff' }
  ];
  const BY = {}; REG.forEach((R, i) => { R.i = i; BY[R.k] = R; });
  const GEN = ['wood', 'bone', 'cloth', 'iron', 'hide']; // 通用搜刮材料（容器 / 尸体 / 野兽）
  const locOf = k => (window.Lore && Lore.LOCS.find(l => l.k === k)) || { n: k };
  const bossOf = k => (window.Explore && Explore.BOSSES && Explore.BOSSES[k]) || { n: '霸主', title: '' };
  const IT = () => Sk().IT;
  const nm = id => (IT()[id] ? IT()[id].icon + IT()[id].n : id);
  (function defs() {
    const S = Sk(); if (!S || !S.def) return;
    REG.forEach((R, i) => {
      const ln = locOf(R.k).n;
      S.def(R.c[0], { n: R.c[1], icon: R.c[2], st: 20, rar: Math.min(3, Math.floor(i / 3)), reg: R.k, desc: `${R.c[3]}（地区材料 · 产地：${ln}）` });
      S.def(R.r[0], { n: R.r[1], icon: R.r[2], st: 10, rar: Math.min(5, 2 + Math.floor(i / 3)), reg: R.k, desc: `${R.r[3]}（稀有地区材料 · 产地：${ln}；霸主身上最多）` });
    });
  })();

  // ---------------------------------------------------------------------------
  // 2) 掉落：当前地点所属地区的材料（容器 / 敌人尸体 / 霸主 / 野兽）+ 每个地点 1–3 处地区采集点
  // ---------------------------------------------------------------------------
  function curReg() { try { const W = window.Worlds && Worlds._W, nd = W && W.graph && W.graph.nodes[W.cur]; return (nd && BY[nd.region]) || null; } catch (e) { return null; } }
  function rollLoot(r, kind, lv, extra) {
    const R = curReg(); if (!R) return null; const mk = Sk().mk, out = [], c = R.c[0], rr = R.r[0];
    const add = (id, a, b) => out.push(mk(id, a + Math.floor(r() * (b - a + 1))));
    if (kind === 'vein') { add(c, 2, 4); if (r() < 0.15) add(rr, 1, 1); if (r() < 0.35) add(GEN[Math.floor(r() * GEN.length)], 1, 2); }
    else if (kind === 'chest') { if (r() < 0.8) add(c, 1, 3); if (r() < 0.2) add(rr, 1, 1); }
    else if (kind === 'crate' || kind === 'barrel') { if (r() < 0.55) add(c, 1, 2); if (r() < 0.05) add(rr, 1, 1); }
    else if (kind === 'basket' || kind === 'bucket') { if (r() < 0.45) add(c, 1, 2); }
    else if (kind === 'rack') { if (r() < 0.25) add(c, 1, 1); }
    else if (kind === 'corpse') { if (extra && extra.boss) { add(c, 6, 10); add(rr, 3, 5); } else { if (r() < 0.5) add(c, 1, 2); if (r() < 0.07) add(rr, 1, 1); } }
    return out.length ? out : null;
  }
  function carcassExtra() { const R = curReg(); return R && Math.random() < 0.35 ? [Sk().mk(R.c[0], 1)] : []; }
  function veins(node) { // 独立随机数（不消耗地点布局的 r），保证老地图布局不变
    const R = node && BY[node.region]; if (!R) return [];
    let s = ((node.seed || 1) ^ 0x9e3779b9) >>> 0; const r = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const n = 1 + (r() < 0.5 ? 1 : 0) + (node.size === 'l' ? 1 : 0), out = [];
    for (let i = 0; i < n; i++) out.push({ kind: 'vein', seed: ((node.seed || 1) * 131 + i * 104729) >>> 0, items: null });
    return out;
  }
  const veinKind = node => { const R = node && BY[node.region]; return R ? R.vein : null; };

  // ---------------------------------------------------------------------------
  // 3) 消耗：建筑 / 挖深 / 附魔 / 配方都要材料
  // ---------------------------------------------------------------------------
  const CAT = () => window.BuildCat && BuildCat.C;
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  // 价位档：<150 免材料（开局建筑）；<400 只要通用材料；之后按价格 / 所需洞层升档，档越高地区越远、越要稀有料
  const BANDS = [null, { lo: 0, hi: 1, c: [2, 4] }, { lo: 1, hi: 4, c: [4, 7] }, { lo: 3, hi: 7, c: [6, 10], r: [1, 2] }, { lo: 5, hi: 8, c: [8, 12], r: [2, 3] }];
  const baseCache = {};
  function baseNeed(k) {
    if (baseCache[k]) return baseCache[k]; const d = CAT() && CAT()[k]; if (!d) return {};
    if (d.rmNeed) return (baseCache[k] = d.rmNeed);
    const B = d.base || 0, o = {}; if (B < 150) return (baseCache[k] = o);
    const h = hash(k), dep = d.depth || 1, g1 = GEN[h % 5], g2 = GEN[(h >>> 4) % 5];
    o[g1] = 2 + ((h >>> 8) % 3); if (B >= 400) o[g2] = (o[g2] || 0) + 2 + ((h >>> 11) % 3);
    let band = B < 400 ? 0 : B < 1500 ? 1 : B < 5000 ? 2 : B < 20000 ? 3 : 4; band = Math.max(band, dep >= 5 ? 4 : dep >= 4 ? 3 : dep >= 3 ? 2 : 0);
    const bd = BANDS[band];
    if (bd) { const R = REG[bd.lo + ((h >>> 14) % (bd.hi - bd.lo + 1))]; o[R.c[0]] = bd.c[0] + ((h >>> 18) % (bd.c[1] - bd.c[0] + 1)); if (bd.r) o[R.r[0]] = bd.r[0] + ((h >>> 22) % (bd.r[1] - bd.r[0] + 1)); }
    return (baseCache[k] = o);
  }
  function need(k, n) { // 第 n+1 座（n = 已建数量）的材料
    const b = baseNeed(k), o = {}; if (n == null) n = window.G && G.bought ? G.bought(k) : 0; const m = 1 + 0.5 * n;
    for (const id in b) o[id] = Math.ceil(b[id] * m); return o;
  }
  const have = id => { try { return Sk().have(id); } catch (e) { return 0; } };
  const lack = o => Object.keys(o || {}).filter(id => have(id) < o[id]);
  const hasAll = o => !lack(o).length;
  function payO(o) { for (const id in o || {}) Sk().take(id, o[id]); }
  const lackText = o => lack(o).map(id => `${nm(id)} ${have(id)}/${o[id]}`).join('、');
  const can = k => hasAll(need(k));
  const pay = k => payO(need(k));
  function refund(k) { // 拆除：返还当时消耗的一半（拆除后 bought 已减 1 → need(k) 正是那一座的消耗）
    const o = need(k), got = []; for (const id in o) { const n = Math.floor(o[id] / 2); if (n > 0) { Sk().stashAdd(Sk().mk(id, n)); got.push(nm(id) + '×' + n); } } return got.join('、');
  }
  function needHTML(o) {
    const ks = Object.keys(o || {}); if (!ks.length) return '';
    return '<div class="re-mats">' + ks.map(id => { const d = IT()[id] || { n: id, icon: '▪' }, h = have(id), reg = d.reg ? locOf(d.reg).n : '通用';
      return `<span class="${h >= o[id] ? 'ok' : 'no'}" title="${d.n}（${reg}）">${d.icon}<b>${h}</b>/${o[id]}</span>`; }).join('') + '</div>';
  }
  // 挖深：每层需要更远地区的材料（按目标层数）
  const DIG = { 2: { wood: 10, rm_straw: 8, rm_laurel: 4 }, 3: { bone: 10, rm_mane: 10, rm_holy: 6 }, 4: { iron: 12, rm_steel: 12, rm_mud: 10, rm_toad: 2 },
    5: { rm_silk: 12, rm_gold: 3, rm_obsid: 8 }, 6: { rm_scale: 15, rm_frost: 4, rm_core: 3 } };
  const digNeed = depth => DIG[depth] || {};
  // 附魔：+2 起要地区材料；越高越远，+6 起加稀有料。护甲类比武器类晚一个地区（两条线都要跑）
  function enchNeed(p, sl) {
    if (p < 2) return {}; const alt = sl === 'weapon' || sl === 'charm' ? 0 : 1, ri = Math.min(8, p - 2 + (p >= 4 ? alt : 0)), o = {};
    o[REG[ri].c[0]] = 2 + p; if (p >= 6) o[REG[Math.max(0, ri - 2)].r[0]] = p - 5; return o;
  }
  // 配方：高阶背篓 / 巨魔再生药加地区材料
  (function recipes() {
    const L = Sk() && Sk().RECIPES; if (!L) return;
    const add = { b2: { rm_straw: 4 }, b3: { rm_mane: 4 }, b4: { rm_silk: 5, rm_holy: 3 }, b5: { rm_scale: 4, rm_frost: 1 }, bigpotion: { rm_holy: 1 } };
    for (const rc of L) if (add[rc.out]) Object.assign(rc.need, add[rc.out]);
  })();
  // 样式（建造卡片材料行、合成器提示）
  (function css() {
    const s = document.createElement('style');
    s.textContent = `.re-mats{display:flex;flex-wrap:wrap;gap:3px 6px;justify-content:center;margin:3px 0 1px;font-size:12px;line-height:1.35}
.re-mats span{padding:0 4px;border-radius:4px;background:rgba(0,0,0,.28);white-space:nowrap}.re-mats span.ok{color:#9fe89f}.re-mats span.no{color:#ff8a7a}
.re-mats b{font-weight:600}`;
    (document.head || document.documentElement).appendChild(s);
  })();

  // ---------------------------------------------------------------------------
  // 4) 霸主首级合成器：每个地区一座，只认该地区霸主的首级；把魂晶慢慢合成成当地常见材料（稀有材料仍要去搜刮）
  // ---------------------------------------------------------------------------
  const PER = 36, E_CD = 20, RUSH = 12;
  const price = R => Math.round(25 * Math.pow(1.6, R.i));
  const F = (g, name, o) => { const a = window.Assets; const m = a && a.has && a.has(name) ? a.fit(name, o || {}) : null; if (m) g.add(m); return m; };
  function PF(g, name, o) { // PropModels（Poly Haven 高精包）按尺寸摆放
    o = o || {}; const PM = window.PropModels; if (!PM || !PM.T || !PM.T[name]) return null;
    const w = PM.model(name, {}), inner = new THREE.Group(); if (o.ry) w.rotation.y = o.ry; inner.add(w); inner.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(w), sz = bb.getSize(new V3()), c = bb.getCenter(new V3()); if (!(sz.x > 0)) return null;
    w.position.set(-c.x, -bb.min.y, -c.z); const u = o.w ? o.w / sz.x : o.h ? o.h / sz.y : o.d ? o.d / sz.z : 1; inner.scale.setScalar(u);
    const out = new THREE.Group(); out.add(inner); out.position.set(o.x || 0, o.y || 0, o.z || 0); out.rotation.set(o.rx || 0, 0, o.rz || 0); out.userData.size = sz.multiplyScalar(u); g.add(out); return out;
  }
  const tint = (m, col, em, ei) => { if (m) m.traverse(o => { if (o.isMesh && o.material) { o.material = o.material.clone(); o.material.color && o.material.color.set(col); if (em && o.material.emissive) { o.material.emissive.set(em); o.material.emissiveIntensity = ei || 1; } } }); return m; };
  const topAt = (g, x, z, r, y0, dflt) => { const t = window.HeadPhys && HeadPhys.top ? HeadPhys.top(g, x, z, r, y0) : null; return t ? [t.x, t.y, t.z] : [x, dflt, z]; }; // 首级必须落在实物上（head_support）
  const piv = (g, x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); g.add(p); return p; };
  const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  function arcPts(g, n, col, size) { // 喷水 / 丝线用的粒子弧（只是特效，不是模型）
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const p = new THREE.Points(geo, new THREE.PointsMaterial({ color: col, size, transparent: true, opacity: 0.85, depthWrite: false })); p.frustumCulled = false; g.add(p); return p;
  }
  // 各地区合成器：make(g,U) 摆模型并写 U.seat=[x,y,z,yaw]；anim(b,U,st) 做动画并返回首级偏移 {off,rx,ry,rz}
  const MACH = {
    village: { n: '稻草人脱粒机', icon: '🌾', verb: '摇稻草人', fp: [0.6, 0.5],
      desc: B => '玛蒂尔达的头插在斧柄上当稻草人。',
      poke: B => `你抓住稻草人的横杆猛转——${B.n}的金发在风里乱飞，脱粒机咔咔狂转。`,
      make(g, U) {
        F(g, 'wooden_axe_02', { h: 1.42, y: 1.42, rx: Math.PI });
        U.arm = piv(g, 0, 1.08, 0); F(U.arm, 'wooden_axe_02', { h: 0.95, x: 0.47, rz: Math.PI / 2 });
        F(g, 'wicker_basket_01', { w: 0.55, x: 0.36, z: 0.34 }); F(g, 'wicker_basket_01', { w: 0.46, x: -0.36, z: 0.3, ry: 0.6 });
        const t = topAt(g, 0, 0, 0.12, 2, 1.42); U.seat = [t[0], t[1], t[2], 0];
      },
      anim(b, U, st) {
        U.arm.rotation.y += st.dt * (st.rush ? 9 : st.on ? 0.6 : 0);
        const sh = st.poke < 1.2 ? Math.sin(st.poke * 40) * 0.25 * (1 - st.poke / 1.2) : 0;
        return { rz: Math.sin(st.t * 1.1) * 0.06 + sh * 0.5, ry: st.rush ? U.arm.rotation.y : Math.sin(st.t * 0.5) * 0.3, rx: st.pop < 0.4 ? Math.sin(st.pop / 0.4 * Math.PI) * 0.12 : 0 };
      } },
    forest: { n: '女王盆栽', icon: '🪴', verb: '浇水', fp: [0.55, 0.35],
      desc: B => '希瑟莉亚种在花槽里，浇水长月桂枝。',
      poke: B => `你拎起水壶往${B.n}头顶浇水。她发间冒出几根新枝——精灵女王果然是植物系的。`,
      make(g, U) {
        F(g, 'planter_box_01', { w: 0.9 });
        U.fl = []; const nodes = (window.Assets && Assets.names && Assets.names('flower_ursinia')) || [];
        for (let i = 0; i < 6; i++) { const q = piv(g, [-0.32, -0.18, 0.18, 0.32, -0.3, 0.3][i], 0.39, [0.1, -0.11, -0.11, 0.1, -0.1, -0.1][i]); const f = nodes.length ? F(q, 'flower_ursinia', { node: nodes[i % nodes.length], h: 0.16, ry: i * 1.7 }) : null; if (f) U.fl.push(q); else g.remove(q); }
        U.can = piv(g, 0.58, 0, 0.12); F(U.can, 'watering_can_metal_01', { h: 0.28, ry: -Math.PI / 2 });
        U.drip = arcPts(g, 18, '#9fd8ff', 0.03); U.drip.visible = false;
        U.seat = [0, 0.33, 0, 0];
      },
      anim(b, U, st) {
        const k = st.on ? st.k : 0; U.fl.forEach((q, i) => q.scale.setScalar(0.55 + 0.9 * ease(k * 1.3 - i * 0.05)));
        const w = st.poke < 2.2 ? Math.sin(Math.min(1, st.poke / 0.3, (2.2 - st.poke) / 0.4) * Math.PI / 2) : 0;
        U.can.position.set(0.58 - 0.3 * w, 0.62 * w, 0.12); U.can.rotation.z = 0.9 * w; U.drip.visible = w > 0.6;
        if (U.drip.visible) { const a = U.drip.geometry.attributes.position; for (let i = 0; i < 18; i++) { const u = ((i / 18) + st.t * 1.6) % 1; a.setXYZ(i, 0.2 - 0.18 * u + Math.sin(i * 7) * 0.02, 0.58 - 0.12 * u - 0.45 * u * u, 0.12 + Math.cos(i * 5) * 0.02); } a.needsUpdate = true; }
        return { ry: Math.sin(st.t * 0.4) * 0.35, rz: w > 0.6 ? Math.sin(st.t * 30) * 0.05 : Math.sin(st.t * 0.7) * 0.04 };
      } },
    wilds: { n: '狼嚎图腾', icon: '🐺', verb: '让她嚎', fp: [0.55, 0.45],
      desc: B => '三尊兽首托着加尔莎，她一嚎狼就送毛来。',
      poke: B => `你拍了拍图腾。${B.n}仰头长嚎——荒原上的狼群闻声而来，留下一地掉毛。`,
      make(g, U) {
        F(g, 'namaqualand_boulder_02', { w: 0.9 });
        F(g, 'bull_head', { h: 0.52, y: 0.2 }); F(g, 'lion_head', { h: 0.42, x: -0.36, y: 0.08, z: 0.1, ry: 0.5 }); F(g, 'horse_head', { h: 0.42, x: 0.36, y: 0.08, z: 0.1, ry: -0.5 });
        const t = topAt(g, 0, 0.02, 0.05, 1.5, 0.7); U.seat = [t[0], t[1], t[2], 0];
      },
      anim(b, U, st) {
        const h = st.poke < 2 ? Math.sin(Math.min(1, st.poke / 0.25, (2 - st.poke) / 0.5) * Math.PI / 2) : 0;
        return { rx: -0.6 * h + Math.sin(st.t * 0.9) * 0.03, rz: h * Math.sin(st.t * 22) * 0.04, ry: Math.sin(st.t * 0.3) * 0.25 * (1 - h) };
      } },
    abbey: { n: '圣水喷泉', icon: '⛲', verb: '拍后脑勺', fp: [0.5, 0.55],
      desc: B => '塞拉菲娜供在祭台上，嘴里吐圣水。',
      poke: B => `你一巴掌拍在${B.n}后脑勺上。圣水「噗」地喷出一大口——神迹。`,
      make(g, U) {
        const alt = F(g, 'GothicCommode_01', { w: 0.8, z: -0.1 }); const H = alt ? alt.userData.size.y : 0.8, D = alt ? alt.userData.size.z : 0.45;
        F(g, 'brass_candleholders', { w: 0.62, y: H, z: -0.1 - D * 0.28 });
        F(g, 'wooden_bucket_02', { w: 0.5, z: 0.5 });
        U.arc = arcPts(g, 28, '#bfe6ff', 0.035); U.H = H; U.z0 = -0.1 + D * 0.1;
        U.seat = [0, H, U.z0, 0];
      },
      anim(b, U, st) {
        const big = st.poke < 1.5 ? 1 - st.poke / 1.5 : 0, on = st.on, a = U.arc.geometry.attributes.position; U.arc.visible = on;
        if (on) { const y0 = U.H + 0.1, z0 = U.z0 + 0.13, z1 = 0.5, v = 1 + big * 0.6; for (let i = 0; i < 28; i++) { const u = ((i / 28) + st.t * (st.rush ? 2.2 : 1.1)) % 1, z = z0 + (z1 - z0) * u * v; a.setXYZ(i, Math.sin(i * 9.1) * 0.012 * (1 + big * 3), y0 + 0.12 * u * v - (y0 + 0.12 * v - 0.3) * u * u, Math.min(z, 0.7)); } a.needsUpdate = true; U.arc.material.size = 0.035 * (1 + big * 1.5); }
        return { rx: big * 0.35 * Math.sin(Math.min(1, st.poke / 0.1) * Math.PI / 2) + 0.12, ry: 0 };
      } },
    swamp: { n: '魔女大坩埚', icon: '🧙', verb: '搅拌', fp: [0.55, 0.55],
      desc: B => '莫甘娜压在锅盖上，熬沼泽黑泥。',
      poke: B => `你抓起搅拌棍猛搅。${B.n}在坩埚盖上转成了陀螺——「黑沼之母」，名副其实。`,
      make(g, U) {
        F(g, 'stone_fire_pit', { w: 0.95 }); if (window.Assets && Assets.flame) { const fl = Assets.flame(0, 0.02, 0, 0.55, '#7ad040'); if (fl) g.add(fl); }
        const pot = F(g, 'brass_pot_01', { w: 0.62, y: 0.08 }); const top = 0.08 + (pot ? pot.userData.size.y : 0.6);
        U.stir = piv(g, 0, top - 0.12, 0); F(U.stir, 'wooden_axe_02', { h: 0.75, x: 0.24, rz: -0.35, ry: Math.PI });
        const t = topAt(g, 0, 0, 0.05, top + 0.3, top - 0.02); U.seat = [t[0], t[1], t[2], 0]; U.top = top;
      },
      anim(b, U, st) {
        const sp = st.poke < 3 ? (1 - st.poke / 3) : 0; U.stir.rotation.y += st.dt * (0.4 + sp * 14 + (st.rush ? 3 : 0));
        if (st.on && Math.random() < st.dt * (st.rush ? 8 : 2.5)) G.burst(new V3(b.x + (Math.random() - 0.5) * 0.4, U.top, b.z + (Math.random() - 0.5) * 0.4), '#7aa04a', 3, 0.3, 0.7, 1.2);
        return { ry: sp > 0 ? U.stir.rotation.y * 1.3 : Math.sin(st.t * 0.6) * 0.4, rz: st.on ? Math.sin(st.t * 5) * 0.05 : 0 };
      } },
    fortress: { n: '元帅督造锻炉', icon: '⚒️', verb: '下令开工', fp: [0.7, 0.5],
      desc: B => '布伦希尔德坐镇酒桶，督着铁锤打精钢。',
      poke: B => `你替${B.n}吼了一声「开工！」铁锤立刻疯了一样砸下去，火星溅了你一脸。`,
      make(g, U) {
        const br = F(g, 'wine_barrel_01', { h: 0.72, x: -0.45, z: -0.05 });
        PF(g, 'bench_vice_01', { h: 0.42, x: 0.25, z: 0.08 }) || F(g, 'stone_01', { w: 0.3, x: 0.25, z: 0.08 });
        F(g, 'stone_fire_pit', { w: 0.55, x: 0.3, z: -0.42 }); if (window.Assets && Assets.flame) { const fl = Assets.flame(0.3, 0.02, -0.42, 0.45); if (fl) g.add(fl); }
        U.ham = piv(g, 0.78, 0.5, 0.08); F(U.ham, 'ornate_war_hammer', { h: 0.62, rz: Math.PI / 2 });
        { const t = topAt(g, -0.45, -0.05, 0.08, 1.5, br ? br.userData.size.y : 0.72); U.seat = [t[0], t[1], t[2], 0.5]; } U.ph = 0;
      },
      anim(b, U, st) {
        const per = st.rush || st.poke < 3 ? 0.42 : 1.3; if (!st.on) { U.ham.rotation.z += (-0.7 - U.ham.rotation.z) * Math.min(1, st.dt * 3); return {}; }
        const p0 = U.ph; U.ph = (U.ph + st.dt / per) % 1; const u = U.ph; U.ham.rotation.z = -(u < 0.75 ? 0.9 * ease(u / 0.75) : 0.9 * (1 - (u - 0.75) / 0.25) ** 2);
        if (p0 > u) { G.burst(new V3(0, 0, 0).set(...wp(b, 0.25, 0.46, 0.08)), '#ffb050', 8, 1.6, 0.35, -6); if (st.near && window.SFX && SFX.play) SFX.play('metal', st.rush ? 0.3 : 0.12, 0.9 + Math.random() * 0.2); U.nod = st.t; }
        const nd = st.t - (U.nod || -9); return { rx: nd < 0.3 ? Math.sin(nd / 0.3 * Math.PI) * 0.2 : 0 };
      } },
    capital: { n: '女王纺车', icon: '🧶', verb: '猛蹬踏板', fp: [0.55, 0.35],
      desc: B => '伊莎贝拉当线轴，转出王都丝绸。',
      poke: B => `你猛蹬踏板。${B.n}在纺锤上转得飞快，头发都快缠成丝了。`,
      make(g, U) {
        const w = PF(g, 'spinning_wheel_01', { w: 1.0 }); const H = w ? w.userData.size.y : 0.97;
        { const t = topAt(g, -0.36, 0, 0.07, H * 0.62 + 0.04, H * 0.62); U.seat = [t[0], t[1], t[2], 0]; } U.silk = arcPts(g, 22, '#ff9ac8', 0.03);
      },
      anim(b, U, st) {
        const sp = st.poke < 3 ? 1 - st.poke / 3 : 0; U.rot = (U.rot || 0) + st.dt * (st.on ? 0.8 + sp * 16 + (st.rush ? 4 : 0) : 0);
        const a = U.silk.geometry.attributes.position; U.silk.visible = st.on;
        if (st.on) { const s = U.seat; for (let i = 0; i < 22; i++) { const u = ((i / 22) + st.t * 0.5) % 1; a.setXYZ(i, s[0] + 0.62 * u, s[1] + 0.12 + Math.sin(u * Math.PI) * 0.1 + Math.sin(u * 20 + st.t * 4) * 0.01, 0.02); } a.needsUpdate = true; }
        return { ry: U.rot, rz: sp * Math.sin(st.t * 18) * 0.08 };
      } },
    abyss: { n: '深渊凝视炉', icon: '👁️', verb: '与她对视', fp: [0.6, 0.45],
      desc: B => '莉莉丝供在裂石上，黑曜碎片绕着她转。',
      poke: B => `你和${B.n}对视了三秒。深渊也在回望你——然后吐出了一堆黑曜石。`,
      make(g, U) {
        F(g, 'namaqualand_boulder_02', { w: 1.0 });
        const t = topAt(g, 0, 0, 0.16, 2, 0.35); U.orb = piv(g, t[0], t[1] + 0.2, t[2]); U.sh = [];
        for (let i = 0; i < 6; i++) { const q = piv(U.orb, 0, 0, 0); const m = tint(F(q, 'stone_01', { w: 0.13, ry: i }), '#2a1c38', '#5a1890', 0.6); if (m) U.sh.push(q); }
        U.seat = [t[0], t[1], t[2], 0];
      },
      anim(b, U, st) {
        const bl = st.poke < 1.6 ? Math.sin(st.poke / 1.6 * Math.PI) : 0, r = 0.34 + bl * 0.45;
        U.sh.forEach((q, i) => { const a = st.t * (st.rush ? 2.6 : 0.9) + i * Math.PI / 3; q.position.set(Math.cos(a) * r, Math.sin(st.t * 1.3 + i) * 0.08, Math.sin(a) * r); q.rotation.set(st.t + i, st.t * 0.7, 0); });
        return { ry: bl > 0 ? 0 : Math.sin(st.t * 0.35) * 0.6, rx: -bl * 0.15 };
      } },
    peak: { n: '龙骨风铃', icon: '🎐', verb: '敲风铃', fp: [0.55, 0.4],
      desc: B => '奥瑞莉娅供在石堆上，风铃一响掉龙鳞。',
      poke: B => `你敲响风铃。${B.n}跟着一晃一晃，龙鳞叮当落了一地。`,
      make(g, U) {
        const ld = F(g, 'wooden_ladder', { h: 2.2, ry: Math.PI }); const H = ld ? ld.userData.size.y : 2.2;
        F(g, 'namaqualand_boulder_05', { w: 0.52 }); F(g, 'stone_01', { w: 0.3, y: 0.12 });
        const t = topAt(g, 0, 0, 0.07, 0.8, 0.3); U.seat = [t[0], t[1], t[2], 0];
        U.sw = piv(g, 0, H - 0.04, 0); const ch = PF(U.sw, 'Chandelier_01', { w: 0.42 }); if (ch) ch.position.y = -ch.userData.size.y;
      },
      anim(b, U, st) {
        const kick = st.poke < 4 ? (1 - st.poke / 4) : 0, amp = 0.04 + kick * 0.4 + (st.rush ? 0.1 : 0), a = Math.sin(st.t * 2.1) * amp; U.sw.rotation.z = a;
        if (st.poke < 4 && st.near && window.SFX && SFX.play && Math.floor((st.t) * 2.1 / Math.PI) !== U.lb) { U.lb = Math.floor(st.t * 2.1 / Math.PI); SFX.play('bell', 0.28, 1.1 + Math.random() * 0.3); }
        return { rz: a * 0.25, ry: Math.sin(st.t * 0.8) * 0.3 };
      } }
  };
  function wp(b, x, y, z) { const a = -b.rot * Math.PI / 2, c = Math.cos(a), s = Math.sin(a); return [b.x + x * c + z * s, y, b.z - x * s + z * c]; }
  const HS = 1.55, _e = new THREE.Euler(0, 0, 0, 'YXZ'), _q = new THREE.Quaternion(), _so = new V3();
  function seat(b, o) { // 按机器动画把首级摆到位（每帧）；o = {off,rx,ry,rz}
    const h = b.heads && b.heads[0]; if (!h || !h.g || (window.G && G.held === h)) return; const U = b.g.userData, s = U.seat; if (!s) return; o = o || {};
    const f = o.off || [0, 0, 0], a = -b.rot * Math.PI / 2, p = wp(b, s[0] + f[0], s[1] + f[1], s[2] + f[2]);
    _e.set(o.rx || 0, a + (s[3] || 0) + (o.ry || 0), o.rz || 0, 'YXZ'); _q.setFromEuler(_e); h.g.quaternion.copy(_q);
    const m = (h.hb && h.hb.meta) || {}, cut = m.cut || { x: 0, y: m.bottom != null ? m.bottom : -0.1, z: 0 };
    _so.set((cut.x || 0) * HS, (cut.y != null ? cut.y : -0.1) * HS - 0.005, (cut.z || 0) * HS).applyQuaternion(_q);
    h.g.position.set(p[0], p[1], p[2]).sub(_so); h.g.updateMatrixWorld && h.g.updateMatrixWorld(true);
  }
  const isM = t => typeof t === 'string' && t.slice(0, 4) === 'syn_' && MACH[t.slice(4)];
  const SS = () => { const S = G.S; if (!S.regecon) S.regecon = { made: {} }; return S.regecon; };
  function produce(b, R, n, now) {
    Sk().stashAdd(Sk().mk(R.c[0], n)); const st = SS(); st.made[R.k] = (st.made[R.k] || 0) + n; b._pop = now;
    const h = b.heads[0], p = h && h.g ? h.g.position.clone().add(new V3(0, 0.5, 0)) : new V3(b.x, 1.3, b.z);
    try { G.floatText(`+${n} ${R.c[2]} ${R.c[1]}`, p, R.col, 17); G.burst(p, R.col, 12, 1, 0.7, -2); } catch (e) { }
    if (window.SFX && G.player && G.player.pos && Math.hypot(G.player.pos.x - b.x, G.player.pos.z - b.z) < 9) { SFX.play && SFX.play('coins', 0.35, 1.2); }
  }
  function tickM(b, dt, now) {
    const R = BY[b.type.slice(4)], M = MACH[R.k], U = b.g.userData, h = b.heads && b.heads[0] && b.heads[0] !== G.held ? b.heads[0] : null, d = CAT()[b.type];
    const rush = now < (b._rush || 0);
    if (h) {
      b._prog = (b._prog || 0) + dt * (rush ? 3 : 1);
      if (b._prog >= PER) { const c = price(R); if (G.S.coins >= c) { G.S.coins -= c; b._prog = 0; produce(b, R, 1, now); } else { b._prog = PER; if (now > (b._starve || 0)) { b._starve = now + 90; G.toast(`${M.icon} ${M.n}停了：合成一份${R.c[1]}要 ${price(R)} 魂晶`, '#fb8', 2.4); } } }
    }
    b.timer = Math.min(0.999, (b._prog || 0) / PER) * d.mount.period; // 借用游戏自带的进度条标签
    const pp = G.player && G.player.pos, near = !!pp && Math.hypot(pp.x - b.x, pp.z - b.z) < 10;
    if (!near && !rush && now - (b._pokeT || -99) > 5 && (b._farT = (b._farT || 0) + dt) < 0.25) return; b._farT = 0; // 远处降频
    const st = { dt: near ? dt : 0.25, t: now, on: !!h, rush, k: Math.min(1, (b._prog || 0) / PER), pop: now - (b._pop || -99), poke: now - (b._pokeT || -99), near };
    let o = {}; try { o = M.anim(b, U, st) || {}; } catch (e) { if (!tickM._w) { tickM._w = 1; console.warn('regecon.anim', b.type, e); } }
    if (h) seat(b, o);
  }
  function tick(dt, now) { for (const b of G.builds) if (isM(b.type)) try { tickM(b, dt, now); } catch (e) { if (!tick._w) { tick._w = 1; console.warn('regecon.tick', e); } } }
  function onE(hit, held, pickup) {
    const b = hit && hit.build; if (!b || pickup || held || !isM(b.type)) return false;
    const R = BY[b.type.slice(4)], M = MACH[R.k], B = bossOf(R.k), now = G.clock ? G.clock.elapsedTime : performance.now() / 1000, h = b.heads && b.heads[0];
    if (!h) { G.toast(`${M.icon} ${M.n}缺少动力源：把${locOf(R.k).n}霸主「${B.n}」的首级放上去`, '#fc9', 2.8); return true; }
    const left = (b._ecd || 0) - now; if (left > 0) { G.toast(`${M.icon} 刚${M.verb}过，${Math.ceil(left)} 秒后再来`, '#ccc', 1.4); return true; }
    const c = price(R); if (G.S.coins < c) { G.toast(`魂晶不够（每份 ${c}）`, '#f96', 1.8); return true; }
    b._ecd = now + E_CD; b._rush = now + RUSH; b._pokeT = now; G.S.coins -= c; produce(b, R, 1 + (Math.random() < 0.35 ? 1 : 0), now);
    G.toast(`${M.icon} ${M.poke(B)}`, R.col, 3.2); if (window.SFX) { SFX.wood && SFX.wood(); } if (R.k === 'abyss' && G.flash) G.flash('rgba(120,40,200,.55)'); if (R.k === 'wilds' && window.SFX && SFX.roar) SFX.roar(0.6);
    return true;
  }
  function onTip(hit, held) {
    const b = hit && hit.build; if (!b || !isM(b.type)) return null; const R = BY[b.type.slice(4)], M = MACH[R.k], B = bossOf(R.k), h = b.heads && b.heads[0];
    if (!h) return held ? (held.rec && held.rec.c && held.rec.c.boss === R.k ? `<b>${M.icon} ${M.n}</b> · <b>[E]</b> 把「${B.n}」装上去` : `<b>${M.icon} ${M.n}</b> · 只认${locOf(R.k).n}霸主「${B.n}」的首级`) : `<b>${M.icon} ${M.n}</b> · 缺少动力源：需要${locOf(R.k).n}霸主「${B.n}」的首级`;
    const now = G.clock ? G.clock.elapsedTime : 0, cd = Math.ceil((b._ecd || 0) - now), made = (SS().made[R.k] || 0);
    return `<b>${M.icon} ${M.n}</b> · 下一份${R.c[2]} ${Math.max(0, Math.ceil((PER - (b._prog || 0)) / (now < (b._rush || 0) ? 3 : 1)))} 秒 · 每份 ${price(R)} 魂晶 · 已产 ${made} · <b>[E]</b> ${cd > 0 ? M.verb + '（' + cd + ' 秒）' : M.verb}<br><small>Shift+E 取下首级 · 稀有的${R.r[2]}${R.r[1]}仍需去${locOf(R.k).n}搜刮</small>`;
  }
  (function register() {
    const C = CAT(); if (!C) return;
    REG.forEach(R => {
      const M = MACH[R.k], B = bossOf(R.k), L = locOf(R.k), key = 'syn_' + R.k, g2 = GEN[(R.i * 2 + 1) % 5];
      C[key] = { cat: 'func', n: M.n, icon: M.icon, base: Math.round(2000 * Math.pow(1.6, R.i)), grow: 1, max: 1, fp: M.fp, stat: {}, depth: 1,
        desc: `${M.desc(B)} 需${B.n}的首级 · 每${PER}秒产${R.c[2]} · E ${M.verb}`,
        rmNeed: { [R.c[0]]: 10 + R.i * 2, [R.r[0]]: 1, [g2]: 6 },
        mount: { y: 1, period: 1e9, mult: 0, labelY: 1.2, selfSeat: true, slots: [[0, 1, 0, 0]], accept: h => !!(h && h.rec && h.rec.c && h.rec.c.boss === R.k), deny: () => `${M.icon} ${M.n}只认${L.n}霸主「${B.n}」的首级` },
        make() { const g = new THREE.Group(); try { M.make(g, g.userData); } catch (e) { console.warn('regecon.make', key, e); } const s = g.userData.seat; if (s) { C[key].mount.slots[0] = s.slice(); C[key].mount.y = s[1]; C[key].mount.labelY = s[1] + 0.35; } return g; },
        cols: () => [[-M.fp[0], 0, -M.fp[1], M.fp[0], 1.2, M.fp[1]]] };
      if (window.Unlocks && Unlocks.R) Unlocks.R[key] = [S => !!(S.bosses && S.bosses[R.k]), `你带回了${L.n}霸主「${B.n}」的首级。地精斯尼克盯着她看了很久：「……这颗头，能带动一台机器。」（建造 → 功能：${M.n}）`];
    });
  })();
  const wait = setInterval(() => {
    if (!window.G || !G.HOOK) return; clearInterval(wait);
    G.HOOK.frame.push(tick); G.HOOK.e.unshift(onE); G.HOOK.tip.unshift(onTip);
    if (window.Unlocks && Unlocks.scan && G.S) try { Unlocks.scan(true); } catch (e) { }
  }, 150);
  const API = { MACH, price, _dbg: { tickM, onE, onTip, seat, tick }, REG, BY, GEN, rollLoot, carcassExtra, veins, veinKind, need, can, pay, refund, needHTML, lack, lackText, hasAll, payO, digNeed, enchNeed, curReg, locOf, bossOf, nm, have };
  return API;
})();
