// 第二十五轮：头类游戏档案（HeadGame）——每颗头在「头棋」里的走法、在「头牌」里的卡牌效果，全部按她的 id/性格/信仰/目的/魂阶随机生成（同一颗头永远是同一份，不存档）。
// 不是死板的“魂阶 → 棋子”：魂阶只决定底子，性格再叠一到两条「特殊走法」，信仰/目的影响名字、台词与牌面效果。
// API：HeadGame.profile(rec) → { chess:{ base, baseN, style, extra:[{dx,dy,n}], quirk, desc, lines }, card:{ name, cost, atk, hp, kw:[], text, flavor, tier } }
//      HeadGame.chessExtra(rec) → [[dx,dy], …]（相对“前方”的跳跃偏移，x 向右、y 向前；头棋殿把它加进这颗棋子的走法里）
window.HeadGame = (() => {
  const hash = s => { s = String(s); let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const rngOf = seed => { let s = seed >>> 0 || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const BASE = ['兵', '马', '象', '车', '后'];
  // 特殊走法库：offs = 相对“前方”的跳跃（不会被挡住，可吃子）
  const SHAPES = {
    wazir:  { n: '轻步', offs: [[1, 0], [-1, 0], [0, 1], [0, -1]], d: '上下左右各走一小步' },
    ferz:   { n: '斜步', offs: [[1, 1], [-1, 1], [1, -1], [-1, -1]], d: '四个斜角各走一小步' },
    fwd2:   { n: '冲锋', offs: [[0, 2]], d: '向前跃进两格（无视中间的子）' },
    fwd3:   { n: '长驱', offs: [[0, 3]], d: '向前直扑三格（无视中间的子）' },
    back1:  { n: '退身', offs: [[0, -1], [1, -1], [-1, -1]], d: '向后撤一步（含后斜）' },
    camel:  { n: '诡跳', offs: [[3, 1], [-3, 1], [3, -1], [-3, -1], [1, 3], [-1, 3], [1, -3], [-1, -3]], d: '“三一”长跳，棋路刁钻' },
    zebra:  { n: '斑驳', offs: [[3, 2], [-3, 2], [2, 3], [-2, 3]], d: '“三二”跳，只往前半场跳' },
    alfil:  { n: '影步', offs: [[2, 2], [-2, 2], [2, -2], [-2, -2]], d: '斜向跃过一格，落在第二格' },
    dabba:  { n: '跃墙', offs: [[2, 0], [-2, 0], [0, 2], [0, -2]], d: '横竖跃过一格，落在第二格' },
    king:   { n: '环守', offs: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]], d: '周围八格各走一步' },
    side2:  { n: '横移', offs: [[2, 0], [-2, 0], [1, 0], [-1, 0]], d: '左右横移一至两格' },
    hook:   { n: '钩索', offs: [[1, 2], [-1, 2], [0, 3], [2, 1], [-2, 1]], d: '前方的一串钩爪式落点' }
  };
  // 性格 → 偏好的走法（没列到的性格走默认池）。性格越多，组合越多。
  const TRAIT_SHAPES = {
    '高傲': ['fwd2', 'fwd3'], '温柔': ['wazir', 'king'], '冷酷': ['zebra', 'hook'], '天真': ['ferz', 'wazir'], '狡黠': ['camel', 'alfil'], '暴躁': ['fwd2', 'alfil'],
    '胆小': ['back1', 'king'], '虔诚': ['wazir', 'dabba'], '贪婪': ['camel', 'hook'], '忠诚': ['king', 'side2'], '孤僻': ['alfil', 'back1'], '开朗': ['ferz', 'fwd2'],
    '毒舌': ['hook', 'camel'], '固执': ['fwd2', 'dabba'], '多疑': ['back1', 'alfil'], '浪漫': ['ferz', 'camel'], '懒散': ['side2', 'wazir'], '勇敢': ['fwd2', 'fwd3'],
    '残忍': ['fwd3', 'hook'], '慈悲': ['king', 'wazir'], '好奇': ['camel', 'zebra'], '野心勃勃': ['fwd3', 'zebra'], '优柔寡断': ['side2', 'back1'], '自恋': ['ferz', 'alfil'],
    '沉默寡言': ['dabba', 'zebra'], '爱哭': ['back1', 'wazir'], '好战': ['fwd2', 'hook'], '腹黑': ['camel', 'zebra'], '迷糊': ['dabba', 'side2'], '严谨': ['wazir', 'dabba'],
    '叛逆': ['alfil', 'fwd2'], '嫉妒心强': ['hook', 'alfil'], '乐观': ['ferz', 'side2'], '悲观': ['back1', 'dabba'], '神经质': ['camel', 'side2'], '洁癖': ['wazir', 'zebra'],
    '贪吃': ['king', 'fwd2'], '话痨': ['side2', 'ferz'], '傲娇': ['fwd2', 'back1'], '偏执': ['hook', 'dabba'], '多情': ['ferz', 'king'], '冷静': ['zebra', 'wazir'],
    '骄纵': ['fwd3', 'ferz'], '坚韧': ['king', 'dabba'], '善变': ['camel', 'side2']
  };
  const STYLE_A = ['月下', '孤影', '赤潮', '霜刃', '逆风', '残烛', '沉星', '雾隐', '鸦羽', '琉璃', '荆棘', '灰烬', '白昼', '夜行', '潮汐', '断弦'];
  const BELIEF_W = [[/月/, '月光'], [/树|古树|森/, '林间'], [/圣光|教会/, '圣辉'], [/金币/, '金铸'], [/战神|拳头/, '战鼓'], [/星/, '星轨'], [/爱/, '绯色'], [/海/, '潮声'], [/命运/, '织命'], [/祖先/, '祖灵'], [/秩序/, '铁律'], [/智慧/, '明灯'], [/丰收/, '麦浪']];
  const STYLE_B = { fwd2: '突刺', fwd3: '长驱', wazir: '小步舞', ferz: '斜线', back1: '退守', camel: '诡步', zebra: '斑影', alfil: '影遁', dabba: '跃墙', king: '环守', side2: '横移', hook: '钩索' };
  // ---------- 头牌 ----------
  const KW = {
    taunt: ['嘲讽', '必须先被攻击'], charge: ['冲锋', '登场即可攻击'], drain: ['吸魂', '造成伤害时为己方英雄恢复等量生命'], stealth: ['潜行', '首次攻击前不会成为目标'],
    shield: ['魂盾', '抵挡第一次伤害'], frenzy: ['狂怒', '受伤后攻击 +2'], venom: ['剧毒', '伤害到的随从直接消灭'], echo: ['回响', '每回合结束时再触发一次战吼'], swift: ['疾风', '每回合可攻击两次']
  };
  const TRAIT_KW = { '高傲': ['taunt', 'shield'], '温柔': ['drain', 'shield'], '冷酷': ['venom', 'stealth'], '天真': ['echo', 'swift'], '狡黠': ['stealth', 'echo'], '暴躁': ['frenzy', 'charge'], '胆小': ['stealth', 'shield'], '虔诚': ['shield', 'drain'], '贪婪': ['drain', 'echo'], '忠诚': ['taunt', 'shield'], '孤僻': ['stealth', 'venom'], '开朗': ['swift', 'echo'], '毒舌': ['venom', 'frenzy'], '固执': ['taunt', 'frenzy'], '多疑': ['stealth', 'taunt'], '浪漫': ['echo', 'drain'], '懒散': ['taunt', 'shield'], '勇敢': ['charge', 'taunt'], '残忍': ['venom', 'frenzy'], '慈悲': ['drain', 'shield'], '好奇': ['echo', 'swift'], '野心勃勃': ['charge', 'echo'], '好战': ['charge', 'swift'], '腹黑': ['venom', 'stealth'], '叛逆': ['frenzy', 'swift'], '嫉妒心强': ['drain', 'venom'], '坚韧': ['shield', 'taunt'] };
  const BATTLECRY = [
    n => `战吼：对随机一个敌方随从造成 ${n} 点伤害`, n => `战吼：为己方英雄恢复 ${n + 1} 点生命`, n => `战吼：抽 1 张牌，并使其费用 -${Math.min(2, Math.ceil(n / 3))}`,
    n => `战吼：使一个友方随从获得 +${Math.ceil(n / 2)}/+${Math.ceil(n / 2)}`, n => `战吼：冻结一个敌方随从，持续 ${1 + (n > 3 ? 1 : 0)} 回合`, n => `战吼：召唤一个 ${Math.ceil(n / 2)}/${Math.ceil(n / 2)} 的「残魂」`,
    n => `战吼：弃掉 1 张手牌，获得 ${n} 点护甲`, n => `战吼：随机获得 1 张「魂晶」，本回合多 ${Math.min(2, Math.ceil(n / 3))} 点法力`
  ];
  const DEATHRATTLE = [n => `亡语：对所有敌方随从造成 ${Math.max(1, Math.floor(n / 2))} 点伤害`, n => `亡语：召唤一个 ${Math.ceil(n / 2) + 1}/1 的「怨灵」`, n => `亡语：抽 ${n > 4 ? 2 : 1} 张牌`, n => `亡语：使手牌中的一个随从 +${Math.ceil(n / 2)}/+${Math.ceil(n / 2)}`, n => `亡语：为双方英雄各恢复 ${n} 点生命`];
  const BELIEF_CARD = [[/月/, '月光下，它的攻击力 +1'], [/树|森/, '每有一个友方随从，获得 +1 生命'], [/圣光|教会/, '每回合开始时为全体友方随从恢复 1 点生命'], [/金币|魂晶/, '每回合开始时获得 1 点额外法力，下回合失效'], [/战神|拳头/, '每次攻击后 +1 攻击力'], [/星/, '抽牌时有一半概率多抽 1 张'], [/爱/, '相邻的友方随从 +1 攻击力'], [/命运/, '随机选择：+2/+0 或 +0/+2'], [/祖先/, '友方随从死亡时，它 +1/+1']];
  const GOAL_FLAVOR = [[/报仇|复仇|斩杀|杀/, '「总有一天，刀会落在该落的地方。」'], [/妹妹|找到|寻找|失散/, '「再等一下，也许下一个转角就是她。」'], [/嫁妆|攒/, '「每一枚铜板，都是我的底气。」'], [/第一剑士|剑士/, '「我的剑，还没有输给谁。」'], [/圣杯/, '「传说里的东西，为什么不能是真的呢？」'], [/王|女王|继承|王座/, '「这顶冠冕，我戴得起。」'], [/回家|家/, '「屋檐下还亮着灯，我得回去。」'], [/自由|逃/, '「笼子关不住我的。」']];
  function profile(rec) {
    const c = rec && rec.c || {}; if (rec && rec._hg && rec._hgN === (c.name || '')) return rec._hg;
    const seed = hash((rec && rec.id) + '|' + (c.name || '') + '|' + (c.id || '')), r = rngOf(seed), rar = c.rar || 0, traits = (c.traits || []).slice(0, 3);
    // ---- 棋 ----
    const pool = []; traits.forEach(t => (TRAIT_SHAPES[t] || []).forEach(s => pool.push(s)));
    if (!pool.length) for (const k in SHAPES) pool.push(k);
    const nExtra = rar >= 3 ? 2 : (rar >= 1 && r() < 0.6 ? 2 : 1), shapes = [];
    while (shapes.length < nExtra && shapes.length < 4) { const k = r() < 0.78 ? pick(r, pool) : pick(r, Object.keys(SHAPES)); if (!shapes.includes(k)) shapes.push(k); }
    const extra = []; shapes.forEach(k => SHAPES[k].offs.forEach(o => { if (!extra.some(e => e.dx === o[0] && e.dy === o[1])) extra.push({ dx: o[0], dy: o[1], n: SHAPES[k].n }); }));
    let bw = ''; for (const [re, w] of BELIEF_W) if (re.test(c.belief || '')) { bw = w; break; }
    const style = (bw || pick(r, STYLE_A)) + STYLE_B[shapes[0]];
    const lines = [`她下棋的路数是「${style}」——${shapes.map(k => SHAPES[k].n + '（' + SHAPES[k].d + '）').join('；')}。`];
    const tn = traits[0] || '', flav = {
      '高傲': '她从不后退，只会向前——哪怕前面是悬崖。', '温柔': '她的落子很轻，像怕惊醒什么人。', '冷酷': '她走的每一步都算好了你的下一步。', '天真': '她常常走出没人想得到的步子，然后自己先笑起来。', '狡黠': '棋盘上的“意外”，多半是她设的局。',
      '暴躁': '她像是把棋子当成拳头在扔。', '胆小': '她总给自己留一条退路，而且留得很深。', '虔诚': '她的每一步都像祷告一样规矩。', '贪婪': '只要有一颗子可以吃，她就会冲出去。', '好战': '越是混乱的局面她越兴奋。', '腹黑': '她会先让你吃一颗子。'
    }[tn];
    if (flav) lines.push(flav);
    const chess = { base: Math.min(4, rar), baseN: BASE[Math.min(4, rar)], style, shapes, shapeNames: shapes.map(k => SHAPES[k].n), extra, lines, tier: rar };
    // ---- 牌 ----
    const cr = rngOf(seed ^ 0x9e3779b1), kws = [], tk = traits.flatMap(t => TRAIT_KW[t] || []);
    const nkw = rar >= 3 ? 2 : (rar >= 1 ? (cr() < 0.55 ? 2 : 1) : (cr() < 0.4 ? 1 : 0));
    while (kws.length < nkw) { const k = tk.length && cr() < 0.8 ? pick(cr, tk) : pick(cr, Object.keys(KW)); if (!kws.includes(k)) kws.push(k); }
    const power = 2 + rar * 2 + Math.floor(cr() * 3) + (kws.length ? 0 : 1), cost = Math.max(1, Math.min(9, Math.round(power * 0.8 + cr() * 1.5 - 0.3)));
    const heavyAtk = traits.some(t => /勇敢|好战|暴躁|残忍|野心勃勃/.test(t)), heavyHp = traits.some(t => /坚韧|忠诚|固执|慈悲|懒散/.test(t));
    let atk = Math.max(1, Math.round(power * (heavyAtk ? 0.62 : heavyHp ? 0.32 : 0.46) + cr() * 1.2)), hp = Math.max(1, Math.round(power * 1.15 - atk + (heavyHp ? 2 : 0) + cr() * 1.3));
    const effects = []; const n = Math.max(1, Math.round(1 + rar * 1.1 + cr() * 2));
    if (cost >= 3 || rar >= 1) effects.push((cr() < 0.7 ? pick(cr, BATTLECRY) : pick(cr, DEATHRATTLE))(n));
    let pass = ''; for (const [re, t] of BELIEF_CARD) if (re.test(c.belief || '')) { pass = t; break; } if (pass && (rar >= 2 || cr() < 0.45)) effects.push(pass);
    const adjA = ['白骨', '赤瞳', '无首', '凋零', '血月', '灰烬', '潮湿', '荆冠', '寂静', '琥珀', '黑曜', '苍白'], noun = [c.idN || '无名者', '亡魂', '残影', '使徒'];
    const name = `${pick(cr, adjA)}的${noun[Math.floor(cr() * noun.length)]}`;
    let flavor = ''; for (const [re, t] of GOAL_FLAVOR) if (re.test(c.goal || '')) { flavor = t; break; } if (!flavor) flavor = '「……」';
    const card = { name, cost, atk, hp, kw: kws.map(k => ({ k, n: KW[k][0], d: KW[k][1] })), text: effects, flavor, tier: rar, cls: c.idN || '' };
    const out = { chess, card };
    if (rec) { try { Object.defineProperty(rec, '_hg', { value: out, writable: true, enumerable: false, configurable: true }); Object.defineProperty(rec, '_hgN', { value: c.name || '', writable: true, enumerable: false, configurable: true }); } catch (e) {} }
    return out;
  }
  const chessExtra = rec => profile(rec).chess.extra.map(e => [e.dx, e.dy]);
  return { profile, chessExtra, SHAPES, KW };
})();
