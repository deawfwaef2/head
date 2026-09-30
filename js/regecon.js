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
  const BANDS = [null, { lo: 0, hi: 1, c: [2, 4] }, { lo: 0, hi: 3, c: [4, 7] }, { lo: 2, hi: 5, c: [6, 10], r: [1, 2] }, { lo: 4, hi: 8, c: [8, 12], r: [2, 3] }];
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
  // 4) 霸主首级合成器（第二阶段，见 regecon_mach 部分）
  // ---------------------------------------------------------------------------
  const API = { REG, BY, GEN, rollLoot, carcassExtra, veins, veinKind, need, can, pay, refund, needHTML, lack, lackText, hasAll, payO, digNeed, enchNeed, curReg, locOf, bossOf, nm, have };
  return API;
})();
