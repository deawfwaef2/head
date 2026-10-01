// 第十九轮（总管理师）：麻袋格子物品栏 + 野外搜刮 + 储物箱 + 附魔强化 + 材料合成（MOD sack_grid）
// 规则（用户原话要点）：
//  · 武器装备要去野外搜刮，不能用魂晶买；魂晶只能用于「附魔强化武器」和「配合材料合成道具」。
//  · 麻袋 = 格子物品栏（类似 Unturned：物品按形状占格，可旋转），取代「麻袋装几颗头」的上限；首级 2×2。
//  · 野外翻找：放入 / 取出一件 = 0.6~2 秒（排队进行，受击打断，挥刀时暂停）；倒袋 = 瞬间倒出全部格子里的东西。
//  · 回洞倒袋：首级照旧滚出来，其余物品进储物箱。洞里整理不计时。
window.Sack = (() => {
  const G = new Proxy({}, { get: (_, k) => { const g = window.G || window.__game; return g && g[k]; } });
  const on = () => !(window.Mods && !Mods.on('sack_grid'));
  // 第二十二轮（用户：装东西时间太久）：每件 5 秒 → 按动作分：拿/放/丢 0.6s、腰带/使用 0.9s、换装 1.8s、塞首级 2.2s
  const DUR = { take: 0.6, put: 0.6, drop: 0.6, belt: 0.9, use: 0.9, equip: 1.8, head: 2.2 }, dur = (j) => DUR[j && j.k] || 0.8;
  let CELL = 40; // CELL 随屏幕自适应（css() 里计算）：第二十二轮把格子从 40px 放大到 44~64px
  const RARC = ['#b9b4aa', '#7fd07a', '#5fa6ff', '#c27cff', '#ffb347', '#ff5a4a', '#ffe27a'];
  const RARN = ['普通', '优良', '稀有', '史诗', '传说', '神话', '神话'];
  const IT = {};
  const def = (id, o) => { IT[id] = Object.assign({ id, w: 1, h: 1, st: 1, rar: 0, kind: 'mat', icon: '▪' }, o); };
  // ---- 材料 / 消耗品 / 首级 ----
  def('iron', { n: '铁片', icon: '🔩', st: 10, desc: '从盔甲和门闩上撬下来的铁。附魔、合成都要用。' });
  def('cloth', { n: '布条', icon: '🧵', st: 10, desc: '撕碎的衣物。' });
  def('herb', { n: '草药', icon: '🌿', st: 10, desc: '苦涩的草叶，能熬药。' });
  def('dust', { n: '魂尘', icon: '✨', st: 20, rar: 1, desc: '残魂凝成的微光粉末。附魔的主料。' });
  def('hide', { n: '兽皮', icon: '🟫', h: 2, st: 5, desc: '硝好的厚皮。' });
  def('bone', { n: '骨头', icon: '🦴', h: 2, st: 5, desc: '又长又硬。' });
  def('wood', { n: '木料', icon: '🪵', h: 2, st: 5, desc: '干燥的硬木。' });
  def('gem', { n: '血玉', icon: '💎', st: 5, rar: 3, desc: '罕见的红色宝石，高阶附魔必需。' });
  def('potion', { n: '血肉药剂', icon: '🧪', kind: 'use', st: 3, heal: 0.4, desc: '立刻恢复 40% 生命。' });
  def('bigpotion', { n: '巨魔再生药', icon: '⚗️', kind: 'use', h: 2, st: 1, heal: 1, rar: 2, desc: '立刻恢复全部生命。' });
  def('bandage', { n: '绷带', icon: '🩹', kind: 'use', st: 5, heal: 0.2, desc: '恢复 20% 生命。' });
  def('whet', { n: '磨刀石', icon: '🪨', kind: 'use', st: 3, buff: 1, rar: 1, desc: '本次出猎 120 秒内伤害 +25%。' });
  def('meat', { n: '生肉', icon: '🥩', st: 10, desc: '还带着体温的兽肉。炖汤、熬药都行。' });
  def('fang', { n: '兽牙', icon: '🦷', st: 10, rar: 1, desc: '尖利的犬齿。磨成刀尖能让武器更锋利。' });
  def('horn', { n: '兽角', icon: '🐂', h: 2, st: 5, rar: 1, desc: '弯曲坚硬的角，能做护具与背篓的骨架。' });
  def('stew', { n: '炖肉', icon: '🍲', kind: 'use', st: 3, heal: 0.5, desc: '热腾腾的浓汤。恢复 50% 生命。' });
  def('head', { n: '首级', icon: '💀', kind: 'head', w: 2, h: 2 });
  const WICON = ['🏏', '🔨', '🔪', '⛓️', '🪓', '🌙', '⚔️'], WSZ = [[1, 3], [1, 3], [1, 3], [2, 3], [2, 4], [2, 4], [2, 5]];
  const BAGSZ = [[4, 4], [5, 4], [6, 4], [6, 5], [7, 6], [8, 7]];
  function initDefs() {
    if (initDefs.done || !window.RPG) return; initDefs.done = 1; const E = RPG.EQUIP;
    E.weapon.tiers.forEach((t, i) => def('w' + i, { n: t.n, icon: WICON[i] || '🗡️', kind: 'equip', slot: 'weapon', tier: i, w: WSZ[i][0], h: WSZ[i][1], rar: Math.min(6, i), desc: `攻击 ${t.atk}。${t.desc || ''}` }));
    E.helm.tiers.forEach((t, i) => i && def('h' + i, { n: t.n, icon: '⛑️', kind: 'equip', slot: 'helm', tier: i, w: 2, h: 2, rar: i, desc: `防御 ${t.def}。${t.desc || ''}` }));
    E.armor.tiers.forEach((t, i) => i && def('a' + i, { n: t.n, icon: '🛡️', kind: 'equip', slot: 'armor', tier: i, w: 2, h: 3, rar: i, desc: `防御 ${t.def} · 生命 +${t.hp || 0}。${t.desc || ''}` }));
    E.charm.tiers.forEach((t, i) => i && def('c' + i, { n: t.n, icon: '📿', kind: 'equip', slot: 'charm', tier: i, w: 1, h: 1, rar: i, desc: t.desc || '' }));
    E.bag.tiers.forEach((t, i) => i && def('b' + i, { n: t.n, icon: '🎒', kind: 'equip', slot: 'bag', tier: i, w: 2, h: 2, rar: i, desc: `麻袋 ${BAGSZ[i][0]}×${BAGSZ[i][1]} 格。` }));
  }
  const RECIPES = [
    { out: 'potion', n: 1, need: { herb: 2, dust: 1 }, coin: 20 },
    { out: 'bandage', n: 2, need: { cloth: 2 }, coin: 5 },
    { out: 'stew', n: 1, need: { meat: 2, herb: 1 }, coin: 5 },
    { out: 'whet', n: 2, need: { fang: 2, iron: 1 }, coin: 15 },
    { out: 'whet', n: 1, need: { iron: 2, wood: 1 }, coin: 30 },
    { out: 'bigpotion', n: 1, need: { potion: 2, gem: 1 }, coin: 80 },
    { out: 'b1', n: 1, need: { hide: 4, cloth: 2 }, coin: 150 },
    { out: 'b2', n: 1, need: { wood: 6, cloth: 4, hide: 2 }, coin: 600 },
    { out: 'b3', n: 1, need: { iron: 10, wood: 4, hide: 4 }, coin: 2000 },
    { out: 'b3', n: 1, need: { hide: 8, horn: 3, iron: 4 }, coin: 1500 },
    { out: 'b4', n: 1, need: { cloth: 16, bone: 6, dust: 10 }, coin: 6000 },
    { out: 'b5', n: 1, need: { gem: 5, dust: 30, iron: 10 }, coin: 20000 }
  ];
  let uid = 1; const mk = (id, n = 1, x) => Object.assign({ u: uid++, id, n }, x || {});
  const mkHead = (h) => Object.defineProperty(mk('head', 1), 'h', { value: h, enumerable: false, writable: true }); // 首级对象不进存档 JSON

  // ---- 存档结构 ----
  function inv() {
    const S = G.S; initDefs();
    if (!S.inv) {
      S.inv = { sack: { items: [] }, belt: [null, null, null], stash: [], pending: [] };
      const it = S.items || {}; // 旧存档：药剂搬进储物箱 / 腰带
      if (it.potion) { S.inv.belt[0] = mk('potion', Math.min(3, it.potion)); if (it.potion > 3) S.inv.stash.push(mk('potion', it.potion - 3)); it.potion = 0; }
      if (it.bigpotion) { S.inv.stash.push(mk('bigpotion', it.bigpotion)); it.bigpotion = 0; }
      S.inv.stash.push(mk('bandage', 2), mk('cloth', 3), mk('herb', 2));
    }
    S.eqPlus = S.eqPlus || { weapon: 0 }; for (const k of ['weapon', 'helm', 'armor', 'charm']) S.eqPlus[k] = S.eqPlus[k] || 0;
    if (!(window.Worlds && Worlds.active)) S.inv.sack.items = S.inv.sack.items.filter(o => o.id !== 'head' || o.h); // 读档后失效的首级格子
    const [w, h] = BAGSZ[Math.min(BAGSZ.length - 1, S.eq.bag || 0)]; S.inv.sack.w = w; S.inv.sack.h = h;
    for (const L of [S.inv.sack.items, S.inv.stash, S.inv.pending]) for (const o of L) if (o && o.u >= uid) uid = o.u + 1;
    if (window.Books && Books.starter) try { Books.starter(S.inv); } catch (e) { console.warn('Books.starter', e); }
    if (window.Props && Props.starter) try { Props.starter(S.inv); } catch (e) { console.warn('Props.starter', e); }
    return S.inv;
  }
  // ---- 格子运算 ----
  const dims = (o) => { const d = IT[o.id] || IT.iron; return o.r ? [d.h, d.w] : [d.w, d.h]; };
  function occ(g, skip) { const m = new Uint8Array(g.w * g.h); for (const o of g.items) { if (o === skip) continue; const [w, h] = dims(o); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (o.y + y) * g.w + o.x + x; if (i >= 0 && i < m.length) m[i] = 1; } } return m; }
  function fits(g, o, x, y, r, skip, m) { const d = IT[o.id]; const w = r ? d.h : d.w, h = r ? d.w : d.h; if (x < 0 || y < 0 || x + w > g.w || y + h > g.h) return false; m = m || occ(g, skip); for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (m[(y + yy) * g.w + x + xx]) return false; return true; }
  function spot(g, o) { const m = occ(g); for (const r of [0, 1]) { const d = IT[o.id]; if (r && d.w === d.h) continue; for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (fits(g, o, x, y, r, null, m)) return { x, y, r }; } return null; }
  function addTo(g, o, dry) { // 先叠堆再找空位；dry = 只检查
    const d = IT[o.id]; let n = o.n;
    if (d.st > 1) for (const q of g.items) if (q.id === o.id && q.n < d.st) { const k = Math.min(d.st - q.n, n); if (!dry) q.n += k; n -= k; if (!n) break; }
    if (!n) { if (!dry) o.n = 0; return true; }
    const s = spot(g, o); if (!s) { if (!dry) o.n = n; return false; }
    if (!dry) { o.n = n; Object.assign(o, s); g.items.push(o); } return true;
  }
  const canAdd = (g, o) => addTo({ w: g.w, h: g.h, items: g.items.map(q => Object.assign({}, q)) }, Object.assign({}, o), false);
  const stashAdd = (o) => { const st = inv().stash, d = IT[o.id]; if (d.st > 1) for (const q of st) if (q.id === o.id && !q.plus) { q.n += o.n; return; } delete o.x; delete o.y; delete o.r; st.push(o); };
  const RN = ['凡魂', '灵魂', '英魂', '圣魂', '神魂'];
  const nameOf = (o) => o.g2 && window.Gear2 ? Gear2.name(o) : o.og && window.Organs ? Organs.name(o) : o.bk ? `《${o.bk.ti}》` : o.id === 'head' && o.h ? `【${RN[o.h.c.rar] || ''}】${NM(o.h.c)}` : (IT[o.id] ? IT[o.id].n : o.id) + (o.plus ? ` +${o.plus}` : '');
  const rarOf = (o) => o.g2 ? (o.g2.rar | 0) : o.og ? (o.og.rar | 0) : o.id === 'head' && o.h ? o.h.c.rar : (IT[o.id] ? IT[o.id].rar : 0);

  // ---- 掉落 ----
  function lvOf(node) { const L = window.Lore && Lore.LOCS; const i = L ? Math.max(0, L.findIndex(l => l.k === (node.loc && node.loc.k))) : 0; return i + (node.depth || 0) * 0.15; }
  const KINDS = { chest: ['宝箱', 'treasure_chest', 0.9], crate: ['木箱', 'wooden_crate_01', 0.8], barrel: ['酒桶', 'wine_barrel_01', 0.72], basket: ['藤篮', 'wicker_basket_01', 0.55], bucket: ['木桶', 'wooden_bucket_02', 0.45], rack: ['武器架', 'katana_stand_01', 1.0] };
  function rollEquip(r, lv, bonus) {
    const k = r(), slot = k < 0.5 ? 'weapon' : k < 0.68 ? 'armor' : k < 0.84 ? 'helm' : 'charm';
    const mx = { weapon: 6, armor: 5, helm: 4, charm: 5 }[slot], t = Math.max(1, Math.min(mx, Math.floor(lv * 0.62 + r() * 1.7 + (bonus || 0))));
    return mk({ weapon: 'w', armor: 'a', helm: 'h', charm: 'c' }[slot] + t, 1, r() < 0.16 + lv * 0.03 ? { plus: 1 + Math.floor(r() * Math.min(4, 1 + lv * 0.5)) } : null);
  }
  const rollW = (r, lv, b) => mk('w' + Math.max(1, Math.min(6, Math.floor(lv * 0.62 + r() * 1.6 + b))), 1, r() < 0.12 + lv * 0.03 ? { plus: 1 + Math.floor(r() * Math.min(4, 1 + lv * 0.5)) } : null);
  function roll(kind, lv, seed, extra) {
    let s = seed >>> 0; const r = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const out = [], add = (id, a, b) => out.push(mk(id, a + Math.floor(r() * (b - a + 1))));
    const mats = (n, pool) => { for (let i = 0; i < n; i++) { const id = pool[Math.floor(r() * pool.length)]; add(id, 1, IT[id].st > 5 ? 3 : 2); } };
    if (kind === 'chest') { mats(2 + Math.floor(r() * 2), ['iron', 'dust', 'dust', 'cloth', 'bone']); if (r() < 0.75) out.push(rollEquip(r, lv, 0.6)); if (r() < 0.35) add('potion', 1, 2); if (r() < 0.12 + lv * 0.03) add('gem', 1, 1); }
    else if (kind === 'crate') { mats(1 + Math.floor(r() * 3), ['iron', 'wood', 'cloth', 'hide', 'bone']); if (r() < 0.3) out.push(rollEquip(r, lv, 0)); if (r() < 0.3) add(r() < 0.5 ? 'bandage' : 'whet', 1, 2); }
    else if (kind === 'barrel') { mats(1 + Math.floor(r() * 2), ['wood', 'herb', 'cloth', 'herb']); if (r() < 0.2) add('potion', 1, 1); }
    else if (kind === 'basket' || kind === 'bucket') { mats(1 + Math.floor(r() * 2), ['herb', 'cloth', 'herb', 'dust']); if (r() < 0.3) add('bandage', 1, 2); }
    else if (kind === 'rack') { out.push(rollW(r, lv, 0.4)); if (r() < 0.35) out.push(rollEquip(r, lv, 0.2)); if (r() < 0.4) add('whet', 1, 1); }
    else if (kind === 'corpse') { mats(1 + Math.floor(r() * 2), ['cloth', 'cloth', 'bone', 'hide', 'iron', 'dust']); if (extra && extra.armed && r() < 0.65) out.push(r() < 0.55 ? rollW(r, lv, 0) : rollEquip(r, lv, 0)); else if (r() < 0.1) out.push(rollEquip(r, lv, -0.4));
      if (r() < 0.12) add('potion', 1, 1); if (extra && extra.boss) { out.push(rollEquip(r, lv, 1.5)); out.push(rollW(r, lv, 1.5)); add('gem', 1, 2); add('dust', 6, 12); } }
    { const bkI = window.Books && Books.rollLoot(r, kind, lv, extra); if (bkI) out.push(bkI); } // 第二十二轮：书与笔记
    { const pr = window.Props && Props.rollLoot ? Props.rollLoot(r, kind, lv, extra) : null; if (pr) out.push(...pr); } // 续 4：道具原料
    { const g2 = window.Gear2 && Gear2.rollLoot ? Gear2.rollLoot(r, kind, lv, extra) : null; if (g2) out.push(...g2); } /* R35 gear2：饰品掉落 */
    { const rg = window.RegEcon && RegEcon.rollLoot ? RegEcon.rollLoot(r, kind, lv, extra) : null; if (rg) out.push(...rg); } /* 第二十六轮(k) region_econ：地区材料 */
    return out;
  }
  // worlds.populate：给地点分配容器（只定种类，物品首次打开时再按种子生成）
  function genLoot(node, r) {
    if (!on()) return []; const n = ({ s: 2, m: 3, l: 5 }[node.size] || 3) + (r() < 0.5 ? 1 : 0), out = [];
    for (let i = 0; i < n; i++) { const k = r(); out.push({ kind: k < 0.12 ? 'rack' : k < 0.42 ? 'crate' : k < 0.64 ? 'barrel' : k < 0.82 ? 'basket' : 'bucket', seed: (node.seed * 31 + i * 7919) >>> 0, items: null }); }
    if (window.RegEcon && RegEcon.veins) out.push(...RegEcon.veins(node)); /* 第二十六轮(k)：地区采集点 */
    return out;
  }
  let sparkMat = null;
  function spark() { if (sparkMat) return sparkMat; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,236,170,0.9)'); gr.addColorStop(0.3, 'rgba(255,200,90,0.35)'); gr.addColorStop(1, 'rgba(255,180,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return sparkMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }); }
  // worlds.buildNode：摆放容器（CC0 资产），推入可交互列表
  function placeLoot(node, C) {
    if (!on() || !node.loot) return; const lv = lvOf(node);
    node.loot.forEach((L, k) => {
      const K = (L.kind === 'vein' && window.RegEcon && RegEcon.veinKind(node)) || KINDS[L.kind] || KINDS.crate; L.name = K[0]; L.lv = lv;
      let x = 0, z = 0; for (let t = 0; t < 40; t++) { const a = C.r() * 6.28, d = C.R * (0.18 + C.r() * 0.7); x = Math.cos(a) * d; z = Math.sin(a) * d; if (C.free(x, z, 1.4)) break; }
      C.mark(x, z, 1.3); const y = C.H(x, z);
      const name = window.Assets && Assets.has(K[1]) ? K[1] : 'wooden_crate_01';
      const g = window.Assets && Assets.fit(name, { w: K[2], x, y: y - 0.02, z, ry: C.r() * 6.3 }); if (g) C.sc.add(g);
      const sp = new THREE.Sprite(spark()); sp.scale.setScalar(0.5); sp.position.set(x, y + 1.0, z); sp.visible = !(L.items && !L.items.length); C.sc.add(sp); L.sp = sp;
      L.x = x; L.z = z; C.inter.push({ kind: 'loot', L, x, z }); C.cols.push({ x, z, r: 0.42 });
    });
  }
  function corpse(fo, W) { // 敌人死后：尸体可搜
    if (!on() || !W || !W.B) return; const nd = W.graph.nodes[W.cur];
    const L = { kind: 'corpse', name: `${NM(fo.h.c)}的尸体`, lv: lvOf(nd), seed: ((((fo.h.look && fo.h.look.seed) || Math.floor(Math.random() * 1e6)) * 2654435761) >>> 0), items: null, extra: { armed: fo.armed, boss: !!fo.boss, B: fo.boss || null }, x: fo.pos.x, z: fo.pos.z, fo };
    W.B.inter.push({ kind: 'loot', L, x: L.x, z: L.z, corpse: true });
  }
  function carcass(b, W) { // 第二十二轮：野兽尸骸（不掉首级，只有材料）
    if (!on() || !W || !W.B || !window.Beasts) return; const nd = W.graph.nodes[W.cur];
    const L = { kind: 'corpse', name: `${b.T.n}的尸骸`, bst: b.T.n, lv: lvOf(nd), seed: b.e.seed >>> 0, items: Beasts.dropsOf(b).map(([id, n]) => mk(id, n)).concat(window.Props && Props.carcassExtra ? Props.carcassExtra() : []).concat(window.RegEcon && RegEcon.carcassExtra ? RegEcon.carcassExtra() : []), extra: {}, x: b.pos.x, z: b.pos.z };
    W.B.inter.push({ kind: 'loot', L, x: L.x, z: L.z, corpse: true });
  }
  const itemsOf = (L) => L.items || (L.items = L.kind === 'pile' ? [] : roll(L.kind, L.lv || 0, L.seed || 1, L.extra));

  // ---- 翻找队列 ----
  const Q = []; let cont = null, panel = null, mode = null, hudEl = null, drag = null, menuEl = null, caveTab = 'forge';
  const W_ = () => window.Worlds && Worlds._W;
  function near(L) { const W = W_(); return W && L && L.x != null && Math.hypot(W.pos.x - L.x, W.pos.z - L.z) < 3.2; }
  function queue(j) { if (Q.length >= 8) { toast('一次最多排 8 件', '#ccc'); return; } j.t = 0; Q.push(j); SFX.sack && SFX.sack(); render(); }
  function interrupt(why) { if (!Q.length) return; Q.length = 0; toast(why || '⚠ 翻找被打断！', '#ff9a7a', 1.4); render(); hud(); }
  function tick(dt) {
    if (!on()) return; if (!Q.length) { if (hudEl && hudEl.style.display !== 'none') hudEl.style.display = 'none'; return; }
    const W = W_(); if (!W) { Q.length = 0; return; }
    const j = Q[0]; if (!valid(j)) { Q.shift(); render(); return; }
    if (window.Combat && Combat.state && Combat.state.lmb) j.t = Math.max(0, j.t - dt * 2); else j.t += dt; // 挥刀时翻找不前进
    if (j.t >= dur(j)) { Q.shift(); try { finish(j); } catch (e) { console.warn('sack job', e); } render(); }
    hud();
  }
  function valid(j) {
    const sack = inv().sack;
    if (j.k === 'take') return near(j.L) && itemsOf(j.L).includes(j.o);
    if (j.k === 'head') return j.ok() && j.hd.g && W_() && W_().pos.distanceTo(j.hd.g.position) < 3.5;
    return sack.items.includes(j.o);
  }
  function finish(j) {
    const S = G.S, I = inv(), sack = I.sack;
    if (j.k === 'take') { const L = itemsOf(j.L), o = j.o; if (!addTo(sack, o)) { toast('麻袋放不下了', '#ffb070'); return; } L.splice(L.indexOf(o), 1); toast(`🎒 ${nameOf(o)} 装进麻袋`, RARC[rarOf(o)], 1.2); if (j.L.sp && !L.length) j.L.sp.visible = false; return; }
    if (j.k === 'head') { const o = mkHead(j.hd.h); if (!addTo(sack, o)) { toast('麻袋里没有 2×2 的空位放首级', '#ffb070', 2); return; } j.done(); return; }
    const o = j.o; sack.items.splice(sack.items.indexOf(o), 1);
    if (j.k === 'put') { itemsOf(j.L).push(o); return; }
    if (j.k === 'drop') { dropPile([o]); return; }
    if (j.k === 'use') { if (o.n > 1) { o.n--; sack.items.push(o); } use(o.id); return; }
    if (j.k === 'belt') { const b = I.belt, i = b.findIndex(q => q && q.id === o.id && q.n < IT[o.id].st); if (i >= 0) { const k = Math.min(IT[o.id].st - b[i].n, o.n); b[i].n += k; o.n -= k; } if (o.n) { const e = b.indexOf(null); if (e >= 0) { b[e] = o; delete o.x; delete o.y; } else { addTo(sack, o) || dropPile([o]); toast('腰带满了', '#ccc'); } } return; }
    if (j.k === 'equip') { equip(o, (old) => { if (!addTo(sack, old)) dropPile([old]); }); return; }
  }
  function dropPile(list) { // 野外：倒在脚下形成一堆，可以再翻
    const W = W_(); if (!W || !W.B) return; let pile = W.B.inter.find(it => it.L && it.L.kind === 'pile' && Math.hypot(W.pos.x - it.x, W.pos.z - it.z) < 2.2);
    if (!pile) { const L = { kind: 'pile', name: '地上的一堆', items: [], x: W.pos.x, z: W.pos.z }; pile = { kind: 'loot', L, x: L.x, z: L.z };
      if (window.Assets && Assets.has('wicker_basket_01')) { const g = Assets.fit('wicker_basket_01', { w: 0.55, x: L.x, y: W.B.H(L.x, L.z), z: L.z }); if (g) { W.B.sc.add(g); L.g = g; } }
      W.B.inter.push(pile); }
    for (const o of list) { delete o.x; delete o.y; pile.L.items.push(o); }
    return pile.L;
  }
  function use(id) {
    const d = IT[id], S = G.S, s = G.st();
    if (d.heal) { S.hp = Math.min(s.maxHp, S.hp + Math.round(s.maxHp * d.heal)); SFX.play && SFX.play('sack', 0.3, 1.5); SFX.soul && SFX.soul(5, 2); G.flash && G.flash('#3aff6a'); toast(`用了${d.n}，生命恢复`, '#6aff8a', 1.5); }
    if (d.buff) { buffT = 120; toast('🪨 刀刃磨得雪亮：120 秒内伤害 +25%', '#ffd27a', 2); }
    if (d.mana && window.Talents && Talents.addMana) { Talents.addMana(d.mana); SFX.soul && SFX.soul(6, 2); G.flash && G.flash('#5ab8ff'); toast(`用了${d.n}，魂能 +${d.mana}`, '#8fd0ff', 1.6); } /* R54：魂能药 */
    if (d.bf) { addBuff(d.bf.kind, d.bf.k, d.bf.t); toast(`${d.icon} ${d.bf.msg}`, '#ffd27a', 2.2); } /* R54：新增益（防御/疾行/再生/暴伤） */
    if (d.onUse) try { d.onUse(); } catch (e) { console.warn('onUse', id, e); }
    G.save && G.save();
  }
  let buffT = 0; const BF = {}; const addBuff = (kind, k, t) => { BF[kind] = { k, t, t0: t }; };
  function dmgMul() { return (buffT > 0 ? 1.25 : 1) * (BF.dmg ? BF.dmg.k : 1); }
  const defMul = () => BF.def ? BF.def.k : 1, spdMul = () => BF.spd ? BF.spd.k : 1, buffList = () => Object.entries(BF).map(([kind, b]) => ({ kind, k: b.k, t: b.t }));
  function quickUse() { // H：腰带里的药瞬间喝
    const I = inv(), S = G.S, s = G.st(), miss = s.maxHp - S.hp; const pref = miss > s.maxHp * 0.6 ? ['bigpotion', 'potion', 'bandage'] : miss > s.maxHp * 0.3 ? ['potion', 'bandage', 'bigpotion'] : ['bandage', 'potion', 'bigpotion'];
    for (const id of pref) { const i = I.belt.findIndex(q => q && q.id === id); if (i >= 0) { const q = I.belt[i]; if (--q.n <= 0) I.belt[i] = null; use(id); render(); return true; } }
    if (!W_()) { const q = I.stash.find(o => IT[o.id] && IT[o.id].heal); if (q) { if (--q.n <= 0) I.stash.splice(I.stash.indexOf(q), 1); use(q.id); render(); return true; } }
    toast('腰带里没有药（从麻袋里翻一下就好）', '#f99', 1.6); return false;
  }
  function equip(o, putOld) { // 穿上 o；旧装备交给 putOld
    if (o.g2 && window.Gear2) return Gear2.equip(o, putOld); /* R35 gear2 饰品 */
    const S = G.S, d = IT[o.id], sl = d.slot, cur = S.eq[sl] || 0;
    if (cur > 0 || sl === 'weapon') { const pre = { weapon: 'w', helm: 'h', armor: 'a', charm: 'c', bag: 'b' }[sl]; if (!(sl === 'bag' && cur === 0)) putOld(mk(pre + cur, 1, sl !== 'bag' && S.eqPlus[sl] ? { plus: S.eqPlus[sl] } : null)); }
    S.eq[sl] = d.tier; if (sl !== 'bag') S.eqPlus[sl] = o.plus || 0; if (sl === 'weapon') { G.refreshWeapon && G.refreshWeapon(); }
    if (sl === 'bag') resizeSack();
    SFX.metal && SFX.metal(); toast(`装备了 ${nameOf(o)}`, RARC[d.rar], 1.5); G.save && G.save();
  }
  function resizeSack() { const I = inv(), g = I.sack, all = g.items.splice(0); for (const o of all) { delete o.x; if (!addTo(g, o)) { if (W_()) dropPile([o]); else stashAdd(o); } } }
  // ---- 出猎起止 ----
  function heads() { return inv().sack.items.filter(o => o.id === 'head' && o.h).map(o => o.h); }
  function tripEnd() { // 回洞：首级交给原流程，其余进「待倒出」
    const I = inv(); Q.length = 0; closePanel(); const rest = I.sack.items.filter(o => o.id !== 'head'); I.sack.items = []; for (const o of rest) { delete o.x; delete o.y; I.pending.push(o); }
  }
  function onDeath() { const I = inv(); Q.length = 0; closePanel(); const n = I.sack.items.length; I.sack.items = []; if (n) setTimeout(() => toast(`麻袋里的 ${n} 样东西都丢在了野外……`, '#aaa', 3), 1500); }
  function pourPending(quiet) { // 洞里倒袋结束 / 没有首级时直接
    const I = inv(); if (!I.pending.length) return; const list = I.pending.splice(0);
    for (const o of list) stashAdd(o);
    if (!quiet) { const s = list.slice(0, 6).map(o => `${IT[o.id] ? IT[o.id].icon : ''}${nameOf(o)}${o.n > 1 ? '×' + o.n : ''}`).join('、'); toast(`🎒 倒出：${s}${list.length > 6 ? ` 等 ${list.length} 样` : ''} → 已放进储物箱`, '#ffd890', 4.5); }
    G.save && G.save();
  }
  function homeArrive(nHeads) { if (!on()) return; if (!nHeads) setTimeout(() => pourPending(), 400); }

  // ---- 附魔 / 分解 / 合成（洞里）----
  const ENF = { weapon: 1, armor: 0.9, helm: 0.7, charm: 0.8 };
  function enchCost(p, sl) { return { coin: Math.round(80 * (ENF[sl] || 1) * Math.pow(1.75, p)), iron: p + 1, dust: 2 * p + 2, gem: p >= 5 ? p - 4 : 0, rm: window.RegEcon && RegEcon.enchNeed ? RegEcon.enchNeed(p, sl) : {} }; } /* 第二十六轮(k)：rm = 地区材料 */
  const have = (id) => inv().stash.reduce((a, o) => a + (o.id === id ? o.n : 0), 0);
  function take(id, n) { const st = inv().stash; for (const o of st.slice()) { if (o.id !== id || n <= 0) continue; const k = Math.min(n, o.n); o.n -= k; n -= k; if (!o.n) st.splice(st.indexOf(o), 1); } }
  function enchant(target, sl) { // target: 'eq'（sl = 部位，默认武器）或储物箱里的装备
    const S = G.S; sl = sl || 'weapon'; const p = target === 'eq' ? (S.eqPlus[sl] || 0) : (target.plus || 0); if (p >= 10) return;
    if (target !== 'eq') sl = (IT[target.id] || {}).slot || 'weapon';
    const c = enchCost(p, sl); if (S.coins < c.coin || have('iron') < c.iron || have('dust') < c.dust || have('gem') < c.gem || Object.keys(c.rm).some(id => have(id) < c.rm[id])) { SFX.deny && SFX.deny(); toast('魂晶或材料不足', '#f88'); return; }
    S.coins -= c.coin; take('iron', c.iron); take('dust', c.dust); if (c.gem) take('gem', c.gem);
    for (const id in c.rm) take(id, c.rm[id]);
    if (target === 'eq') { S.eqPlus[sl] = p + 1; if (sl === 'weapon') G.refreshWeapon && G.refreshWeapon(); } else target.plus = p + 1;
    SFX.metal && SFX.metal(); SFX.levelup && SFX.levelup(); toast(`🔮 附魔成功：+${p + 1}`, '#c9a0ff', 2); G.save && G.save(); render();
  }
  function salvage(o) {
    const d = IT[o.id]; if (!d || d.kind !== 'equip') return; const t = d.tier || 1, st = inv().stash; st.splice(st.indexOf(o), 1);
    const got = d.slot === 'weapon' ? { iron: 1 + t, wood: 1, dust: t * 2 + (o.plus || 0) * 3 } : d.slot === 'armor' ? { iron: t, hide: 1 + t } : d.slot === 'helm' ? { iron: t, bone: 1 } : d.slot === 'bag' ? { cloth: 2 + t * 2, hide: t } : { dust: 3 + t * 3 };
    for (const k in got) stashAdd(mk(k, got[k])); toast('分解得到：' + Object.entries(got).map(([k, n]) => IT[k].n + '×' + n).join('、'), '#ddd', 2.5); G.save && G.save(); render();
  }
  function craft(rc) {
    const S = G.S; for (const k in rc.need) if (have(k) < rc.need[k]) { SFX.deny && SFX.deny(); toast('材料不足', '#f88'); return; }
    if (S.coins < rc.coin) { SFX.deny && SFX.deny(); toast('魂晶不足', '#f88'); return; }
    S.coins -= rc.coin; for (const k in rc.need) take(k, rc.need[k]);
    const o = mk(rc.out, rc.n); const d = IT[rc.out];
    if (d.slot === 'bag' && d.tier > (S.eq.bag || 0)) equip(o, stashAdd); else stashAdd(o);
    SFX.metal && SFX.metal(); toast(`🔨 合成：${d.n}${rc.n > 1 ? '×' + rc.n : ''}`, RARC[d.rar], 1.8); G.save && G.save(); render();
  }

  // ---- UI ----
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const toast = (t, c, d) => G.toast && G.toast(t, c, d);
  function css() {
    if (document.getElementById('skCSS')) return; CELL = Math.max(54, Math.min(76, Math.floor(Math.min(innerWidth / 19.5, innerHeight / 11.5)))); const st = document.createElement('style'); st.id = 'skCSS';
    st.textContent = `
.modal.big:has(.sk-host){width:min(1560px,97vw)}
.sk-host{font-size:15px}
.sk-tabs{align-items:center;gap:8px;margin-bottom:14px}.sk-host button.sk-tab{font-size:17px !important;padding:11px 26px !important;letter-spacing:.14em}.sk-host button.sk-tab.on{filter:brightness(1.25) drop-shadow(0 0 10px rgba(255,190,90,.5))}.sk-coin{margin-left:auto;color:#ffe2a0;font:800 22px "Noto Serif CJK SC",serif}
.sk-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}.sk-chip{background:rgba(255,255,255,.06) !important;border:1px solid rgba(231,194,122,.3) !important;color:#d8cbb2 !important;border-radius:0 !important;font:600 14px system-ui !important;padding:5px 12px !important;cursor:pointer}.sk-chip::before,.sk-chip::after{display:none !important}.sk-chip.on{background:#c89a4a !important;color:#1a0e08 !important;border-color:#ffd890 !important}
.sk-it i{filter:drop-shadow(0 2px 3px #000c)}
#skTip{position:fixed;z-index:95;display:none;pointer-events:none;max-width:300px;padding:10px 14px;background:linear-gradient(180deg,rgba(26,18,26,.98),rgba(10,7,12,.98));border:1px solid #b8914a;box-shadow:0 10px 30px rgba(0,0,0,.7);font:14px/1.55 system-ui,"Noto Sans CJK SC",sans-serif;color:#e8dcc8}#skTip .tn{font:800 17px "Noto Serif CJK SC",serif}#skTip .tr{font-size:12px;letter-spacing:.08em;margin-bottom:5px;opacity:.9}#skTip .tb{color:#d8cbb2}
.wk-sub{display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap}.sk-host .wk-sub button.sk-btn{font-size:15px !important;padding:8px 18px !important}.sk-host .wk-sub button.on{filter:brightness(1.3)}.wk-only{margin-left:auto;font-size:15px;color:#cfc2a8;cursor:pointer}.wk-only input{width:16px;height:16px;vertical-align:-3px;margin-right:6px}
.wk-mats{margin:0 0 12px;padding:9px 14px;background:rgba(0,0,0,.3);border:1px solid rgba(231,194,122,.2);font-size:15px;color:#cfc2a8;display:flex;flex-wrap:wrap;gap:6px 18px;align-items:center}.wk-mats b{color:#f3d9a0}.wk-mats span b{color:#fff}
.wk-h{margin:16px 0 8px !important;font:800 18px "Noto Serif CJK SC",serif !important;color:#f3d9a0 !important}.wk-h small{font:15px system-ui;color:#a99d88;margin-left:8px;letter-spacing:0}
.wk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:12px}
.wk-card{padding:12px 14px;background:linear-gradient(160deg,color-mix(in srgb,var(--rc) 10%,#1a1219),#100b12);border:1px solid rgba(255,255,255,.12);display:flex;flex-direction:column;gap:8px}.wk-card.can{border-color:color-mix(in srgb,var(--rc) 70%,#fff 0%);box-shadow:inset 0 0 22px color-mix(in srgb,var(--rc) 16%,transparent)}
.wk-top{display:flex;gap:12px;align-items:center}.wk-ic{flex:0 0 64px;height:64px;display:flex;align-items:center;justify-content:center;border:1px solid var(--rc);background:radial-gradient(circle,color-mix(in srgb,var(--rc) 30%,#2a1e26),#0c080c 75%)}.wk-ic img{width:100%;height:100%;object-fit:contain}.wk-ic i{font-style:normal;font-size:34px}
.wk-nm{font:800 21px "Noto Serif CJK SC",serif;filter:brightness(1.25);text-shadow:0 1px 6px #000a}.wk-ds{font-size:15px;color:#cdbfa6;line-height:1.5}.wk-note{font-size:14px;color:#cfc2a8}.wk-note b{color:#ffd890}.wk-note .no{color:#ff8f86}
.wk-need{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:16px;font-weight:600}.wk-need .ok{color:#8fe88f}.wk-need .no{color:#ff8f86}
.sk-host button.wk-go{font-size:16px !important;padding:9px 16px !important;margin-top:auto}
#skUI{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:70;background:linear-gradient(180deg,rgba(18,14,20,.96),rgba(8,6,10,.97));border:1px solid var(--u-gold,#b8914a);box-shadow:0 20px 60px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,220,150,.15);padding:14px 16px 10px;color:#e8dcc8;font:13px/1.4 system-ui,"Noto Sans CJK SC",sans-serif;user-select:none;max-width:96vw;max-height:94vh;overflow:auto}
.sk-host{color:#e8dcc8;user-select:none}
.sk-cols{display:flex;gap:18px;align-items:flex-start}
.sk-col h4{white-space:nowrap;margin:0 0 8px;font:700 15px "Noto Serif CJK SC","Songti SC",serif;color:#f3d9a0;letter-spacing:1px;display:flex;align-items:center;gap:8px}
.sk-col h4 small{color:#a99;font:12px system-ui;letter-spacing:0}
.sk-list{display:flex;flex-wrap:wrap;gap:6px;align-content:flex-start;min-width:${CELL * 5}px;max-width:${CELL * 8 + 60}px;min-height:${CELL * 2}px;max-height:${CELL * 7}px;overflow:auto;padding:6px;background:rgba(0,0,0,.35);border:1px solid rgba(184,145,74,.35)}
.sk-grid{position:relative;background-color:rgba(0,0,0,.4);background-image:linear-gradient(rgba(184,145,74,.22) 1px,transparent 1px),linear-gradient(90deg,rgba(184,145,74,.22) 1px,transparent 1px);background-size:${CELL}px ${CELL}px;border:1px solid rgba(184,145,74,.6)}
.sk-it{position:absolute;box-sizing:border-box;border:1px solid var(--rc);background:linear-gradient(160deg,rgba(255,255,255,.07),rgba(0,0,0,.25)),rgba(30,24,30,.92);box-shadow:inset 0 0 12px color-mix(in srgb,var(--rc) 35%,transparent);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;text-align:center}
.sk-list .sk-it,.sk-slot .sk-it{position:relative}
.sk-it:hover{filter:brightness(1.35);z-index:3}
.sk-it i{font-style:normal;font-size:${Math.round(CELL * 0.5)}px;line-height:1}
.sk-it img{flex:1 1 0;min-height:0;width:100%;object-fit:contain;pointer-events:none;filter:drop-shadow(0 2px 3px #000c)}.sk-it.i3 b{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(transparent,#000c);text-align:center;font-size:${Math.max(10, Math.round(CELL * 0.2))}px}.sk-menu .mi{display:block;width:120px;height:120px;margin:4px auto 0;cursor:default;background:radial-gradient(circle,#3a2c1e,#0e0a0e 70%)}.sk-menu .mi:hover{background:radial-gradient(circle,#3a2c1e,#0e0a0e 70%)}.sk-menu .mi img{width:100%;height:100%;object-fit:contain}
.sk-it b{font-size:10px;font-weight:600;color:#eee;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;padding:0 2px}
.sk-it em{position:absolute;right:2px;bottom:0;font-style:normal;font-size:11px;font-weight:800;color:#fff;text-shadow:0 0 3px #000}
.sk-it .pg{position:absolute;left:0;bottom:0;height:4px;background:#ffd27a;box-shadow:0 0 6px #ffb040}
.sk-it.q{outline:2px dashed #ffd27a;outline-offset:-3px}
.sk-it.ghost{pointer-events:none;opacity:.8;z-index:9}.sk-it.bad{border-color:#f44;background:rgba(120,20,20,.8)}
.sk-belt{display:flex;gap:6px;margin-top:8px;align-items:center}.sk-slot{width:${CELL}px;height:${CELL}px;border:1px dashed rgba(184,145,74,.5);position:relative}
.sk-eq{margin-top:8px;display:grid;grid-template-columns:auto 1fr;gap:2px 8px;font-size:12px;color:#cbb}.sk-eq b{color:#f3e2c0;font-weight:600}
.sk-btn{background:linear-gradient(180deg,#3a2a1c,#1d140e);border:1px solid #b8914a;color:#f3d9a0;padding:3px 10px;cursor:pointer;font:600 12px system-ui}.sk-btn:hover{filter:brightness(1.3)}.sk-btn[disabled]{opacity:.4;cursor:default}
.sk-foot{margin-top:8px;color:#998f80;font-size:12px}
.sk-menu{position:fixed;z-index:80;background:rgba(14,10,14,.98);border:1px solid #b8914a;min-width:130px;box-shadow:0 8px 24px rgba(0,0,0,.6)}
.sk-menu div{padding:6px 12px;cursor:pointer;font-size:13px;color:#e8dcc8}.sk-menu div:hover{background:rgba(184,145,74,.25)}.sk-menu .t{color:#f3d9a0;font-weight:700;cursor:default;border-bottom:1px solid rgba(184,145,74,.3)}.sk-menu .t:hover{background:none}
.sk-menu .d{color:#9a9080;font-size:11px;cursor:default;max-width:220px;white-space:normal}.sk-menu .d:hover{background:none}
#skHud{position:fixed;left:50%;bottom:118px;transform:translateX(-50%);z-index:30;background:rgba(10,8,12,.85);border:1px solid #b8914a;padding:6px 14px;color:#f3d9a0;font:600 13px system-ui;min-width:260px;text-align:center;pointer-events:none}
#skHud .bar{height:5px;background:rgba(255,255,255,.12);margin-top:5px}#skHud .bar i{display:block;height:100%;background:linear-gradient(90deg,#ffb040,#ffe0a0)}
.sk-tabs{display:flex;gap:6px;margin-bottom:10px}.sk-tabs .on{background:linear-gradient(180deg,#7a5424,#3a2410)}
.sk-rc{display:flex;align-items:center;gap:10px;padding:6px 8px;border-bottom:1px solid rgba(184,145,74,.2)}.sk-rc .nm{min-width:120px;font-weight:700}.sk-rc .nd{flex:1;color:#bba}.sk-rc .no{color:#f77}.sk-rc .ok{color:#8f8}
`; document.head.appendChild(st);
  }
  function tile(o, extra) { // 物品方块
    const [w, h] = dims(o), d = IT[o.id] || {}, rc = RARC[Math.min(6, rarOf(o))];
    const q = Q.find(j => j.o === o || (j.hd && o.h && j.hd.h === o.h)), pg = q && Q[0] === q ? `<span class="pg" style="width:${q.t / dur(q) * 100}%"></span>` : '';
    return `<div class="sk-it${q ? ' q' : ''}${window.ItemIcons && ItemIcons.has(o.id) && ItemIcons.ready ? ' i3' : ''}" data-u="${o.u}" ${extra || ''} style="--rc:${rc};width:${w * CELL - 2}px;height:${h * CELL - 2}px;${o.x != null && extra == null ? `left:${o.x * CELL + 1}px;top:${o.y * CELL + 1}px` : ''}">${(() => { const u = window.ItemIcons && ItemIcons.url(o.id); return u ? `<img src="${u}" alt="">` : `<i>${d.icon || '?'}</i>`; })()}${h > 1 || w > 1 ? `<b>${esc(nameOf(o))}</b>` : ''}${o.n > 1 ? `<em>${o.n}</em>` : ''}${pg}</div>`;
  }
  function sackHtml(I) {
    const g = I.sack, used = g.items.reduce((a, o) => { const [w, h] = dims(o); return a + w * h; }, 0);
    const belt = I.belt.map((o, i) => `<div class="sk-slot" data-belt="${i}">${o ? tile(o, '') : ''}</div>`).join('');
    const S = G.S, E = RPG.EQUIP, eqn = (sl) => { const t = S.eq[sl] || 0; return E[sl].tiers[t].n + (sl !== 'bag' && S.eqPlus[sl] ? ` +${S.eqPlus[sl]}` : ''); };
    return `<div class="sk-col"><h4>🎒 麻袋 <small>${g.w}×${g.h} · 已用 ${used}/${g.w * g.h} 格</small>${mode === 'wild' ? '<button class="sk-btn" data-act="pour">倒空麻袋</button>' : ''}</h4>
      <div class="sk-grid" id="skGrid" style="width:${g.w * CELL}px;height:${g.h * CELL}px">${g.items.map(o => tile(o)).join('')}</div>
      <div class="sk-belt"><span style="color:#cbb;white-space:nowrap">腰带</span>${belt}<small style="color:#998;white-space:nowrap">H 瞬间用药</small></div>
      <div class="sk-eq"><span>武器</span><b>${esc(eqn('weapon'))}</b><span>头盔</span><b>${esc(eqn('helm'))}</b><span>护甲</span><b>${esc(eqn('armor'))}</b><span>护符</span><b>${esc(eqn('charm'))}</b><span>背篓</span><b>${esc(eqn('bag'))}</b></div></div>`;
  }
  function render() {
    if (mode === 'wild' && panel) {
      const I = inv(), L = cont ? itemsOf(cont) : null;
      panel.innerHTML = `<div class="sk-cols">${cont ? `<div class="sk-col"><h4>📦 ${esc(cont.name)} <small>${L.length ? '点击 = 装进麻袋' : '空了'}</small>${window.Organs && Organs.canDissect(cont) ? '<button class="sk-btn" data-act="dissect" title="取出整具身体的器官，每件带归属和属性">🔪 解剖</button>' : ''}</h4><div class="sk-list" id="skCont">${L.map(o => tile(o, '')).join('')}</div></div>` : ''}${sackHtml(I)}</div>
        <div class="sk-foot">${Q.length ? `翻找中：${Q.length} 件排队（受击会打断）· ` : ''}点击麻袋物品 = 取出/使用/装备· 拖动整理（拖动时 R 旋转）· Tab / B / Esc 关闭</div>`;
      bind(panel);
    }
    if (mode === 'cave' && panel && panel.isConnected) renderCave();
  }
  // 第二十二轮（用户：装备/物品 UI 太小、合成太乱、没有直接花钱升级好玩）：洞里页签重做 —— ⚔️ 装备（铁匠台，js/forge.js） · 🎒 物品（分类筛选 + 悬停详情） · 🔨 工坊（配方分组 + 摆件）
  let itemFilter = 'all', craftOnly = false;
  const FILT = [['all', '全部'], ['equip', '⚔️ 装备'], ['mat', '🪨 材料'], ['use', '🧪 药品'], ['body', '💀 首级·器官'], ['book', '📖 典籍'], ['prop', '🧷 摆件']];
  const catOf = (o) => { const k = (IT[o.id] || {}).kind; return k === 'equip' ? 'equip' : k === 'use' ? 'use' : (k === 'head' || k === 'organ') ? 'body' : k === 'book' ? 'book' : k === 'prop' ? 'prop' : 'mat'; };
  const RGRP = [['🌙 回合 · 肉鸽 · 月之踪迹', r => r.grp === 'run', '围绕章节/回合循环：祈福、结算、宿敌、章节 BOSS、月之线索（大多每回合/每章限用）'], ['🧪 药品 · 消耗', r => r.g === 'med' || ['potion', 'bandage', 'stew', 'bigpotion'].includes(r.out), '出猎前带上，腰带按 H 瞬间喝'], ['🍲 料理 · 汤食', r => r.g === 'food', '便宜顶饱，出猎前多备几份'], ['🗡️ 战斗增益', r => r.g === 'buff' || r.out === 'whet', '喝下 / 使用后限时生效：伤害、防御、疾行、再生'], ['🛡️ 护具 · 饰品', r => r.g === 'gear', '用野外材料直接打造；做好后在「装备」页穿上'], ['♻️ 材料转化', r => r.g === 'conv', '把多余的材料换成缺的那一种'], ['🩸 拆解 · 肢体', r => r.g === 'body', '砍断的肢体会收进麻袋；在这里拆成骨、筋、皮'], ['🎒 背篓 · 扩容', r => /^b\d/.test(r.out), '合成后自动换上，麻袋格子变大、能多装东西']];
  function recipeCard(rc, i) {
    const S = G.S, d = IT[rc.out], okN = Object.entries(rc.need).every(([k, n]) => have(k) >= n), ok = okN && S.coins >= rc.coin, u = window.ItemIcons && ItemIcons.url && ItemIcons.url(rc.out);
    const bag = d.slot === 'bag' ? `<div class="wk-note">麻袋 ${inv().sack.w}×${inv().sack.h} → <b>${BAGSZ[d.tier][0]}×${BAGSZ[d.tier][1]}</b>${d.tier <= (S.eq.bag || 0) ? ' <span class="no">（你已有同级或更高）</span>' : ''}</div>` : '';
    return `<div class="wk-card ${ok ? 'can' : ''}" style="--rc:${RARC[Math.min(6, d.rar)]}"><div class="wk-top"><div class="wk-ic">${u ? `<img src="${u}" alt="">` : `<i>${d.icon}</i>`}</div><div><div class="wk-nm" style="color:${RARC[Math.min(6, d.rar)]}">${esc(d.n)}${rc.n > 1 ? ' ×' + rc.n : ''}</div><div class="wk-ds">${esc(d.desc || '')}</div></div></div>${bag}
      <div class="wk-need">${Object.entries(rc.need).map(([k, n]) => `<span class="${have(k) >= n ? 'ok' : 'no'}" title="${esc((IT[k] || {}).desc || '')}">${IT[k].icon}${IT[k].n} ${have(k)}/${n}</span>`).join('')}<span class="${S.coins >= rc.coin ? 'ok' : 'no'}">🔮 ${rc.coin.toLocaleString()}</span></div>
      <button class="sk-btn wk-go" data-craft="${i}" ${ok ? '' : 'disabled'}>${ok ? '合成' : okN ? '魂晶不足' : '材料不足'}</button></div>`;
  }
  function renderCave() {
    const I = inv(), S = G.S;
    if (I.pending.length) pourPending();
    if (caveTab === 'ench' || (caveTab === 'forge' && !window.Forge)) caveTab = window.Forge ? 'forge' : 'items';
    const top = caveTab === 'props' ? 'craft' : caveTab;
    const tabs = `<div class="sk-tabs">${[['forge', '⚔️ 装备'], ['items', '🎒 物品'], ['craft', '🔨 工坊']].concat(window.Books && Books.on() ? [['books', '📖 典籍']] : []).map(([k, n]) => `<button class="sk-btn sk-tab ${top === k ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('')}<span class="sk-coin">🔮 ${Math.floor(S.coins).toLocaleString()}</span></div>`;
    let body = '';
    if (caveTab === 'forge') {
      body = Forge.tabHtml();
    } else if (caveTab === 'items') {
      const all = I.stash.slice().sort((a, b) => ((IT[b.id] || {}).kind === 'equip') - ((IT[a.id] || {}).kind === 'equip') || rarOf(b) - rarOf(a));
      const cnt = {}; for (const o of all) { const c = catOf(o); cnt[c] = (cnt[c] || 0) + 1; }
      const st = itemFilter === 'all' ? all : all.filter(o => catOf(o) === itemFilter);
      const chips = FILT.map(([k, n]) => `<button class="sk-chip ${itemFilter === k ? 'on' : ''}" data-ifilt="${k}">${n}${k === 'all' ? ` ${all.length}` : cnt[k] ? ` ${cnt[k]}` : ''}</button>`).join('');
      body = `<div class="sk-cols"><div class="sk-col"><h4>📦 储物箱 <small>点物品：装进麻袋 / 装备 / 使用 / 放置 · 悬停看详情</small></h4><div class="sk-chips">${chips}</div><div class="sk-list" id="skCont">${st.map(o => tile(o, '')).join('') || `<span style="color:#877;font-size:15px;padding:8px">${all.length ? '这一类是空的。' : '空空如也——去野外搜刮吧。'}</span>`}</div></div>${sackHtml(I)}</div>
        <div class="sk-foot">装备与首级来自野外（容器、武器架、尸体、霸主）。回洞倒袋时，麻袋里的东西全部倒出：首级进洞，其余进储物箱。想升级装备 → 去「⚔️ 装备」页。</div>`;
    } else if (caveTab === 'craft' || caveTab === 'props') {
      const sub = caveTab === 'props' && window.Props ? 'props' : 'rc';
      const mats = Object.values(IT).filter(d => d.kind === 'mat' && have(d.id) > 0).slice(0, 26).map(d => `<span>${d.icon}${d.n} <b>${have(d.id)}</b></span>`).join('');
      const head = `<div class="wk-sub"><button class="sk-btn ${sub === 'rc' ? 'on' : ''}" data-wsub="craft">🔨 配方（药品·增益·背篓）</button>${window.Props && Props.on() ? `<button class="sk-btn ${sub === 'props' ? 'on' : ''}" data-wsub="props">🧷 摆件（洞里的 BUFF 道具）</button>` : ''}${sub === 'rc' ? `<label class="wk-only"><input type="checkbox" data-wonly ${craftOnly ? 'checked' : ''}> 只看现在能合成的</label>` : ''}</div>`;
      if (sub === 'props') body = head + Props.tabHtml();
      else {
        const grp = RGRP.map(([nm, f, hint]) => { const rs = RECIPES.map((rc, i) => [rc, i]).filter(([rc]) => IT[rc.out] && Object.keys(rc.need).every(k => IT[k])).filter(([rc]) => f(rc)).filter(([rc]) => !craftOnly || (Object.entries(rc.need).every(([k, n]) => have(k) >= n) && S.coins >= rc.coin)); return rs.length ? `<h4 class="wk-h">${nm} <small>${hint}</small></h4><div class="wk-grid">${rs.map(([rc, i]) => recipeCard(rc, i)).join('')}</div>` : ''; }).join('');
        body = head + `<div class="wk-mats"><b>库存材料</b> ${mats || '<span style="opacity:.6">还没有材料——去野外容器、尸体、野兽身上翻</span>'}</div>` + (grp || '<p style="color:#a99;font-size:15px">现在没有能合成的配方。取消“只看能合成”看看缺什么。</p>');
      }
    } else if (caveTab === 'books' && window.Books) {
      body = Books.tabHtml(I.sack.items.concat(I.stash));
    }
    panel.innerHTML = tabs + body; bind(panel);
    if (caveTab === 'forge' && window.Forge) Forge.bind(panel, render);
    if (caveTab === 'books' && window.Books) Books.bindTab(panel, I.sack.items.concat(I.stash));
    if ((caveTab === 'props' || caveTab === 'craft') && window.Props && panel.querySelector('[data-pcraft],[data-pplace],[data-precall]')) Props.bindTab(panel, render);
  }
  // ---- 悬停详情卡（装备会和身上的对比）----
  let tipEl = null;
  const hideTip = () => { if (tipEl) tipEl.style.display = 'none'; };
  function tipHtml(o) {
    const d = IT[o.id] || {}, r = Math.min(6, rarOf(o)), RNm = window.RN_ || RARN; let body = '';
    if (o.og && window.Organs) body = esc(Organs.info(o)).replace(/\n/g, '<br>');
    else if (o.h) body = `${esc(RN[o.h.c.rar] || '')} · ${esc(o.h.c.raceN || o.h.c.race || '')}<br>回洞倒袋时滚出来`;
    else if (o.bk) body = esc(`${o.bk.sub || ''}（${o.bk.names.length} 个名字）`);
    else if (o.g2 && window.Gear2) body = Gear2.tipBody(o); /* R35 gear2 */
    else if (d.kind === 'equip' && window.RPG) {
      const E = RPG.EQUIP[d.slot], t = E.tiers[d.tier], c = E.tiers[G.S.eq[d.slot] || 0], K = ['atk', 'def', 'hp', 'str', 'con', 'agi', 'ter', 'soul', 'cap'], NM = { atk: '攻击', def: '防御', hp: '生命', str: '力量', con: '体魄', agi: '敏捷', ter: '凶威', soul: '魂力', cap: '背篓' };
      body = K.filter(k => t[k] || c[k]).map(k => { const a = t[k] || 0, b = c[k] || 0, df = a - b; return `${NM[k]} <b>${a}</b> <span style="color:${df > 0 ? '#8fe88f' : df < 0 ? '#ff8f86' : '#998'}">${df > 0 ? '▲+' + df : df < 0 ? '▼' + df : '＝'}</span>`; }).join('<br>') + `<br><span style="color:#a99">${esc(t.desc || '')}</span>` + (d.slot === 'weapon' && window.WpnSpec ? WpnSpec.tip(d.tier, o.plus || 0, G.S.eq.weapon || 0, (G.S.eqPlus || {}).weapon || 0) : '');
    } else { body = esc(d.desc || ''); const us = [...new Set(RECIPES.filter(rc => rc.need[o.id]).map(rc => IT[rc.out] ? IT[rc.out].icon + IT[rc.out].n : rc.out))]; if (us.length) body += `<br><span style="color:#9fd0a0">🔨 可合成：${esc(us.slice(0, 8).join('、'))}${us.length > 8 ? ' …' : ''}</span>`; }
    return `<div class="tn" style="color:${RARC[r]}">${d.icon || ''} ${esc(nameOf(o))}${o.n > 1 ? ' ×' + o.n : ''}</div><div class="tr" style="color:${RARC[r]}">${RARN[r]} · ${({ equip: '装备', use: '消耗品', head: '首级', organ: '人体器官', book: '典籍', prop: '摆件' })[d.kind] || '材料'}${d.st > 1 ? ' · 可堆叠 ' + d.st : ''} · ${dims(o).join('×')} 格</div><div class="tb">${body}</div>`;
  }
  function bindTips(root) {
    hideTip(); if (root._tips) return; root._tips = 1;
    root.addEventListener('mousemove', (e) => {
      const el = e.target.closest && e.target.closest('.sk-it'); if (!el || drag || menuEl) { hideTip(); return; }
      const f = findU(el.dataset.u); if (!f[0]) { hideTip(); return; }
      if (!tipEl) { tipEl = document.createElement('div'); tipEl.id = 'skTip'; document.body.appendChild(tipEl); }
      if (tipEl._u !== f[0].u || tipEl._s !== JSON.stringify([f[0].n, f[0].plus])) { tipEl._u = f[0].u; tipEl._s = JSON.stringify([f[0].n, f[0].plus]); tipEl.innerHTML = tipHtml(f[0]); }
      tipEl.style.display = 'block'; const w = tipEl.offsetWidth, h = tipEl.offsetHeight; tipEl.style.left = Math.max(6, Math.min(innerWidth - w - 8, e.clientX + 18)) + 'px'; tipEl.style.top = Math.max(6, Math.min(innerHeight - h - 8, e.clientY + 14)) + 'px';
    });
    root.addEventListener('mouseleave', hideTip); root.addEventListener('mousedown', hideTip);
  }
  function findU(u) { const I = inv(); u = +u; for (const [where, L] of [['sack', I.sack.items], ['stash', I.stash], ['cont', cont ? itemsOf(cont) : []]]) { const o = L.find(q => q.u === u); if (o) return [o, where]; } const bi = I.belt.findIndex(q => q && q.u === u); if (bi >= 0) return [I.belt[bi], 'belt', bi]; return [null]; }
  function bind(root) {
    bindTips(root);
    root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { caveTab = b.dataset.tab; SFX.page && SFX.page(); render(); });
    root.querySelectorAll('[data-ifilt]').forEach(b => b.onclick = () => { itemFilter = b.dataset.ifilt; SFX.page && SFX.page(); render(); });
    root.querySelectorAll('[data-wsub]').forEach(b => b.onclick = () => { caveTab = b.dataset.wsub; SFX.page && SFX.page(); render(); });
    root.querySelectorAll('[data-wonly]').forEach(b => b.onchange = () => { craftOnly = b.checked; render(); });
    root.querySelectorAll('[data-ench]').forEach(b => b.onclick = () => { const k = b.dataset.ench; if (k.indexOf('eq') === 0) enchant('eq', k.split(':')[1] || 'weapon'); else enchant(inv().stash.find(o => o.u === +k)); });
    root.querySelectorAll('[data-craft]').forEach(b => b.onclick = () => craft(RECIPES[+b.dataset.craft]));
    const dsb = root.querySelector('[data-act="dissect"]'); if (dsb) dsb.onclick = () => { if (!near(cont)) { toast('离尸体太远了', '#ccc'); return; } Organs.dissect(cont); render(); };
    const pour = root.querySelector('[data-act="pour"]'); if (pour) pour.onclick = () => pourWild();
    root.querySelectorAll('.sk-it').forEach(el => { el.onmousedown = (e) => itemDown(e, el); el.oncontextmenu = (e) => e.preventDefault(); });
  }
  function itemDown(e, el) {
    e.preventDefault(); e.stopPropagation(); closeMenu();
    const [o, where, bi] = findU(el.dataset.u); if (!o) return;
    if (where === 'sack' && e.button === 0) { // 可能是拖动
      const g = inv().sack, grid = document.getElementById('skGrid'), r0 = grid.getBoundingClientRect(), sx = e.clientX, sy = e.clientY; let moved = false, rot = o.r || 0, gh = null;
      const mv = (ev) => { if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return; if (!moved) { moved = true; el.style.opacity = 0.25; gh = el.cloneNode(true); gh.classList.add('ghost'); grid.appendChild(gh); drag = { o, rotate() { rot ^= 1; place(ev); } }; } place(ev); };
      const cell = (ev) => { const d = IT[o.id], w = rot ? d.h : d.w, h = rot ? d.w : d.h; return [Math.round((ev.clientX - r0.left) / CELL - w / 2), Math.round((ev.clientY - r0.top) / CELL - h / 2), w, h]; };
      let last = null; const place = (ev) => { last = ev; if (!gh) return; const [x, y, w, h] = cell(ev); gh.style.left = x * CELL + 1 + 'px'; gh.style.top = y * CELL + 1 + 'px'; gh.style.width = w * CELL - 2 + 'px'; gh.style.height = h * CELL - 2 + 'px'; gh.classList.toggle('bad', !fits(g, o, x, y, rot, o)); };
      drag = null; const up = (ev) => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up);
        if (moved) { const [x, y] = cell(last || ev); if (fits(g, o, x, y, rot, o)) { o.x = x; o.y = y; o.r = rot; SFX.click && SFX.click(); } drag = null; render(); } else itemMenu(o, where, ev, bi); };
      addEventListener('mousemove', mv); addEventListener('mouseup', up); dragRot = () => { if (drag) { rot ^= 1; place(last || e); } };
      return;
    }
    itemMenu(o, where, e, bi);
  }
  let dragRot = null;
  function itemMenu(o, where, e, bi) {
    const I = inv(), d = IT[o.id] || {}, wild = mode === 'wild', acts = [];
    if (wild) {
      if (where === 'cont') { queue({ k: 'take', o, L: cont }); return; }
      if (where === 'sack') { if (d.kind === 'use') acts.push(['使用', () => queue({ k: 'use', o })], ['放进腰带', () => queue({ k: 'belt', o })]);
        if (d.kind === 'equip') acts.push(['装备', () => queue({ k: 'equip', o })]);
        if (cont && cont.kind !== 'corpse') acts.push([`放进${cont.name}`, () => queue({ k: 'put', o, L: cont })]);
        if (o.id !== 'head') acts.push(['丢在地上', () => queue({ k: 'drop', o })]);
        const jq = Q.find(j => j.o === o); if (jq) { acts.length = 0; acts.push(['取消翻找', () => { Q.splice(Q.indexOf(jq), 1); render(); }]); } }
      if (where === 'belt') acts.push(['使用', () => { if (--o.n <= 0) I.belt[bi] = null; use(o.id); render(); }]);
    } else {
      if (where === 'stash') { acts.push(['装进麻袋', () => { const c = Object.assign({}, o); if (!addTo(I.sack, c)) { if (c.n < o.n) o.n = c.n; toast('麻袋放不下', '#fb7'); render(); return; } I.stash.splice(I.stash.indexOf(o), 1); render(); }]);
        if (d.kind === 'use') acts.push(['放进腰带', () => { const e2 = I.belt.findIndex(q => q && q.id === o.id && q.n < d.st), fr = I.belt.indexOf(null); const k = e2 >= 0 ? e2 : fr; if (k < 0) { toast('腰带满了', '#ccc'); return; } if (!I.belt[k]) I.belt[k] = mk(o.id, 0); const n = Math.min(d.st - I.belt[k].n, o.n); I.belt[k].n += n; o.n -= n; if (!o.n) I.stash.splice(I.stash.indexOf(o), 1); render(); }], ['使用', () => { if (--o.n <= 0) I.stash.splice(I.stash.indexOf(o), 1); use(o.id); render(); }]);
        if (d.kind === 'equip') acts.push(['装备', () => { I.stash.splice(I.stash.indexOf(o), 1); equip(o, stashAdd); render(); }], ['分解成材料', () => salvage(o)]); }
      if (where === 'sack') { acts.push(['放回储物箱', () => { I.sack.items.splice(I.sack.items.indexOf(o), 1); stashAdd(o); render(); }]); if (d.kind === 'equip') acts.push(['装备', () => { I.sack.items.splice(I.sack.items.indexOf(o), 1); equip(o, stashAdd); render(); }]); }
      if (where === 'belt') acts.push(['放回储物箱', () => { I.belt[bi] = null; stashAdd(o); render(); }]);
    }
    if (o.og && window.Organs) acts.unshift(...Organs.menu(o, wild, render).filter(() => where === 'stash' || where === 'sack'));
    if (d.kind === 'prop' && window.Props && (where === 'stash' || where === 'sack')) acts.unshift(['放置到洞里', () => Props.startPlace(d.ptype)]);
    if (d.kind === 'book' && o.bk && window.Books && (where === 'sack' || where === 'stash')) acts.unshift(...Books.menu(o, wild));
    if (!acts.length) return;
    closeMenu(); menuEl = document.createElement('div'); menuEl.className = 'sk-menu';
    const miu = window.ItemIcons && ItemIcons.url(o.id);
    menuEl.innerHTML = (miu ? `<div class="mi"><img src="${miu}" alt=""></div>` : '') + `<div class="t" style="color:${RARC[rarOf(o)]}">${d.icon || ''} ${esc(nameOf(o))}${o.n > 1 ? ' ×' + o.n : ''}</div>${d.desc || o.h || o.bk || o.og ? `<div class="d" style="white-space:pre-line">${esc(o.og && window.Organs ? Organs.info(o) : o.h ? `${RN[o.h.c.rar] || ''} · 回洞倒袋时滚出来` : o.bk ? `${o.bk.sub || ''}（${o.bk.names.length} 个名字）` : d.desc)}</div>` : ''}` + acts.map((a, i) => `<div data-i="${i}">${a[0]}</div>`).join('');
    document.body.appendChild(menuEl); menuEl.style.left = Math.min(innerWidth - 180, e.clientX + 4) + 'px'; menuEl.style.top = Math.min(innerHeight - 40 - acts.length * 30, e.clientY + 4) + 'px';
    menuEl.querySelectorAll('[data-i]').forEach(el => el.onmousedown = (ev) => { ev.stopPropagation(); const a = acts[+el.dataset.i]; closeMenu(); a[1](); });
    setTimeout(() => addEventListener('mousedown', closeMenu, { once: true }), 0);
  }
  function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } }
  function pourWild() { const I = inv(), all = I.sack.items.splice(0); if (!all.length) return; Q.length = 0; dropPile(all); SFX.sack && SFX.sack(); SFX.play && SFX.play('heavy', 0.35, 0.9); toast(`麻袋倒空了：${all.length} 样东西倒在脚下（再装要一件件翻，但很快）`, '#ffd890', 3); cont = W_().B.inter.find(it => it.L && it.L.kind === 'pile' && it.L.items.includes(all[0])).L; render(); }
  function openWild(L) { // 野外：打开麻袋（可带一个容器）
    if (!on()) return false; css(); inv(); const W = W_(); if (!W) return false;
    cont = L || null; if (cont) { itemsOf(cont); SFX.open && SFX.open(); }
    if (!panel || mode !== 'wild') { closePanel(); panel = document.createElement('div'); panel.id = 'skUI'; document.body.appendChild(panel); mode = 'wild'; }
    G.setUI(true); render(); if (window.ItemIcons && !ItemIcons.ready) ItemIcons.onReady(() => { if (panel && !drag) render(); }); return true;
  }
  function closePanel(relock) { closeMenu(); if (mode === 'wild' && panel) { if (panel._hub) { panel._hub = 0; panel = null; mode = null; cont = null; return; } /* R42：挂在 Tab 菜单里的麻袋，由菜单自己管关闭 */ panel.remove(); panel = null; mode = null; cont = null; G.setUI(false); if (relock) try { G.lockPointer(); } catch (e) {} } }
  function unmount() { if (panel && panel._hub) closePanel(); } // R42
  function mountWild(host) { if (!on() || !host || !W_()) return false; css(); inv(); if (panel && panel !== host) closePanel(); host.className = 'sk-host'; host._hub = 1; panel = host; mode = 'wild'; cont = null; render(); if (window.ItemIcons && !ItemIcons.ready) ItemIcons.onReady(() => { if (panel === host && !drag) render(); }); return true; } // R42：野外也能在 Tab 菜单里看麻袋
  function toggleWild() { if (mode === 'wild') closePanel(true); else openWild(null); }
  function mountCave(host) { if (!on() || !host) return; css(); inv(); closePanel(); host.className = 'sk-host'; panel = host; mode = 'cave'; cont = null; render(); if (window.ItemIcons && !ItemIcons.ready) ItemIcons.onReady(() => { if (panel === host && !drag) render(); }); }
  function hud() {
    if (!Q.length) return; if (!hudEl) { hudEl = document.createElement('div'); hudEl.id = 'skHud'; document.body.appendChild(hudEl); css(); }
    const j = Q[0], nm = j.k === 'head' ? `把首级「${NM(j.hd.h.c)}」塞进麻袋` : j.k === 'take' ? `装进麻袋：${nameOf(j.o)}` : j.k === 'use' ? `从麻袋里翻出${nameOf(j.o)}` : j.k === 'equip' ? `翻出并换上${nameOf(j.o)}` : `翻找：${nameOf(j.o)}`;
    hudEl.style.display = 'block'; // 第二十二轮：只在文字变化时重写 DOM，进度条只改宽度（原先每帧 innerHTML 导致闪烁）
    const txt = `🎒 ${esc(nm)} · ${(dur(j) - j.t).toFixed(1)}s${Q.length > 1 ? ` · 还有 ${Q.length - 1} 件` : ''}`;
    if (!hudEl._bar) { hudEl.innerHTML = '<span class="tx"></span><div class="bar"><i></i></div>'; hudEl._bar = hudEl.querySelector('.bar i'); hudEl._tx = hudEl.querySelector('.tx'); }
    if (hudEl._t !== txt) { hudEl._t = txt; hudEl._tx.innerHTML = txt; } hudEl._bar.style.width = j.t / dur(j) * 100 + '%';
    if (panel && mode === 'wild') { const pg = panel.querySelector('.sk-it.q .pg'); if (pg) pg.style.width = j.t / dur(j) * 100 + '%'; }
  }
  function queueHead(hd, ok, done) { if (!on()) return false; if (!canAdd(inv().sack, mk('head', 1))) { toast('麻袋里没有 2×2 的空位放首级（Tab 整理 / 倒掉点东西）', '#ffb070', 2.5); return true; } if (Q.some(j => j.hd === hd)) return true; queue({ k: 'head', hd, ok, done }); toast('把首级塞进麻袋……（别挨打）', '#ffd890', 1.6); return true; }
  function capture(h) { const o = mkHead(h); return addTo(inv().sack, o); } // 追上猎物：直接入袋（需要空位）
  function usage() { const g = inv().sack; return [g.items.reduce((a, o) => { const [w, h] = dims(o); return a + w * h; }, 0), g.w * g.h, g.items.filter(o => o.id === 'head').length]; }
  // 按键：面板打开时拦截（捕获阶段，先于游戏）
  addEventListener('keydown', (e) => {
    if (mode !== 'wild' || !panel) return;
    if (e.code === 'KeyR' && drag) { dragRot && dragRot(); e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (panel._hub) return; // R42：菜单自己处理 Tab / B / Esc / H
    if (e.code === 'Tab' || e.code === 'KeyB' || e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closePanel(true); return; }
    if (e.code === 'KeyH') { e.preventDefault(); e.stopImmediatePropagation(); quickUse(); return; }
  }, true);
  function frame(dt) { if (buffT > 0) buffT -= dt; for (const k in BF) { BF[k].t -= dt; if (BF[k].t <= 0) delete BF[k]; } if (BF.regen && W_() && G.S.hp > 0) { const mx = G.st().maxHp; G.S.hp = Math.min(mx, G.S.hp + mx * BF.regen.k * dt); } tick(dt); }
  return { equip, enchant, enchCost, salvage, resizeSack, nameOf, RARC, on, IT, def, mk, stashAdd, have, take, RECIPES, defMul, spdMul, buffList, inv, lvOf, genLoot, placeLoot, corpse, carcass, openWild, toggleWild, closePanel, mountCave, mountWild, unmount, frame, interrupt, queueHead, capture, heads, tripEnd, onDeath, pourPending, homeArrive, quickUse, dmgMul, usage, itemsOf, roll, addTo, canAdd, get panelOpen() { return mode === 'wild' && !!panel; }, get queue() { return Q; } };
})();
