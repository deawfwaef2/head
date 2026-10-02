// R57 nem_story：宿敌剧情系统（MOD nem_story，默认开，仅中文）
// ① 宿敌每次变强（8 分钟成长 / 仇恨升级 / 从你手里逃走 / 额外宿敌每 5 分钟）都会生成一个“成长事件”：
//    随机一个方面（新武器/新护甲/新招式/研究你的打法/轻装特训/祝福/复仇誓言/结盟），这个方面会真的改她下次出场的属性
//    （伤害、血量、速度、iq、技能池、词缀、撤退血线、带同伴一起来）。
// ② 下次加载地图时（地区电影之前）播放一段插曲：在别处，她和导师/新同伴/救下她的人对话，内容围绕追猎你、你最近干了什么；
//    最后一张“变强卡”写清楚强在哪。可空格翻页 / Esc 跳过。
// ③ 起源：第一次进游戏 → 四名猎手接下悬赏的开篇（并埋下月之魔女的钩子）；有人从你刀下逃走成为新宿敌 → 她的起源短片。
// 实现：Foe.build 临时搭真人模型（同战斗里的身体/头），放在玩家脚边，Saga.reel 播放（复用地区电影的字幕/名牌/相机接管）。
// 存档：G.S.nst = { q:[事件], lv:{key:等级}, xs:[已见过的额外宿敌名], intro, p:{key:{blade,armor,swift,study,vow,skill:[],bless:[],ally:[]}} }
window.NemStory = (() => {
  const G = () => window.G, on = () => (!window.Mods || Mods.on('nem_story') !== false) && (!window.Saga || Saga.on());
  const S = () => { const s = G().S; if (!s.nst) s.nst = { q: [], lv: {}, xs: [], intro: 0, p: {} }; const n = s.nst; n.q = n.q || []; n.lv = n.lv || {}; n.xs = n.xs || []; n.p = n.p || {}; return n; };
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const fill = (t, c) => String(t).replace(/\{(\w+)\}/g, (m, k) => c[k] != null ? c[k] : m);

  // ================= 方面（真改属性） =================
  const SKN = { leap: '跃斩', charge: '冲锋', breaker: '破防击', whirl: '旋风斩' };
  const AFN = { iron: '铁壁', regen: '再生', relentless: '连斩', leech: '噬血' };
  const ASP = {
    blade: { nm: '新武器', ic: '⚔', col: '#ffb070', max: 3, eff: () => '伤害 +12%' },
    armor: { nm: '新护甲', ic: '🛡', col: '#9fc8ff', max: 3, eff: () => '生命 +18%' },
    skill: { nm: '新招式', ic: '🌀', col: '#c8a0ff', eff: e => `学会「${SKN[e.sk] || '新招'}」` },
    study: { nm: '研究你的打法', ic: '📜', col: '#e8dca0', max: 2, eff: () => '更会预判、格挡你的攻击' },
    swift: { nm: '轻装特训', ic: '💨', col: '#b0f0d0', max: 2, eff: () => '移动速度 +10%' },
    bless: { nm: '祝福', ic: '✨', col: '#fff0a0', eff: e => `获得词缀「${AFN[e.af] || '祝福'}」` },
    vow: { nm: '复仇誓言', ic: '🔥', col: '#ff8a7a', max: 1, eff: () => '血更少才会撤退 · 伤害 +8%' },
    ally: { nm: '结盟', ic: '👥', col: '#a8e0ff', eff: e => `下次带着「${e.ally ? e.ally.n : '同伴'}」一起来` }
  };
  const P = k => { const p = S().p; return p[k] || (p[k] = { blade: 0, armor: 0, swift: 0, study: 0, vow: 0, skill: [], bless: [], ally: [] }); };
  function rollAspect(key, ev) { // 选一个还能涨的方面，并立刻记到 perks 上
    const p = P(key), hid = key.startsWith('h:') ? key.slice(2) : null, d = hid && window.Hunters2 && Hunters2.BY[hid];
    const base = d ? d.sk : [], skLeft = Object.keys(SKN).filter(s => !base.includes(s) && !p.skill.includes(s) && hid !== 'mia');
    const afLeft = Object.keys(AFN).filter(a => !p.bless.includes(a) && !(d && d.aff.includes(a)));
    const cand = [];
    for (const k of ['blade', 'armor', 'study', 'swift', 'vow']) if (p[k] < ASP[k].max) cand.push(k, k);
    if (skLeft.length && p.skill.length < 2) cand.push('skill', 'skill');
    if (afLeft.length && p.bless.length < 2) cand.push('bless');
    if (p.ally.length < 2) cand.push('ally', 'ally');
    if (ev.why === 'esc' && p.vow < 1) cand.push('vow', 'vow', 'vow');
    const recent = (S().q.filter(e => e.k === key).map(e => e.a)).concat(p.last || []);
    let pool = cand.filter(a => !recent.includes(a)); if (!pool.length) pool = cand; if (!pool.length) pool = ['blade'];
    const a = rnd(pool); ev.a = a; p.last = [a].concat(p.last || []).slice(0, 2);
    if (ASP[a].max) p[a] = Math.min(ASP[a].max, p[a] + 1);
    if (a === 'skill') { ev.sk = rnd(skLeft); p.skill.push(ev.sk); }
    if (a === 'bless') { ev.af = rnd(afLeft); p.bless.push(ev.af); }
    if (a === 'ally') { ev.ally = makeAlly(key); p.ally.push(ev.ally); }
    return a;
  }
  const ALLYN = ['赛拉', '露西安', '卡琳', '维奥拉', '希尔达', '伊薇特', '罗莎', '缇娜', '艾达', '芙蕾雅', '奥黛特', '塞西莉亚', '莉迪亚', '诺拉', '贝雅特丽丝', '温蒂'];
  const ALLYS = ['·白鸦', '·红缨', '·铁蔷薇', '·霜刃', '·夜莺', '·琥珀', '·银铃', '·野玫瑰', ''];
  function locOf(k) { const L = (window.Lore && Lore.LOCS) || []; return L.find(l => l.k === k) || L[0]; }
  function curLoc() { try { const W = Worlds._W, nd = W && W.graph && W.graph.nodes[W.cur]; if (nd && nd.loc) return nd.loc; } catch (e) { } const k = lastReg(); return locOf(k); }
  function lastReg() { try { const s = window.Saga && Saga.SS && Saga.SS(); if (s && s.v) { const ks = Object.keys(s.v); if (ks.length) return ks.sort((a, b) => s.v[b] - s.v[a])[0]; } } catch (e) { } return 'village'; }
  function makeAlly(key) {
    const used = new Set(); for (const k in S().p) for (const a of S().p[k].ally || []) used.add(a.n);
    let n = rnd(ALLYN.filter(x => !used.has(x)).concat(['无名'])); n += rnd(ALLYS);
    const loc = curLoc(), seed = (Math.random() * 4294967296) >>> 0; let t = '佣兵';
    try { const h = RPG.foe(G().S, loc, seed, new Set(), new Set()); t = (window.Lore && Lore.ID && Lore.ID[h.c.id] && Lore.ID[h.c.id].n) || h.c.idN || h.c.title || t; } catch (e) { }
    return { n, seed, lk: loc && loc.k, t };
  }
  function allyH(a) { const h = RPG.foe(G().S, locOf(a.lk) || curLoc(), a.seed, new Set(), new Set()); h.c = Object.assign({}, h.c, { name: a.n }); return h; }

  // ---- 出场时套用 ----
  function aff(key) { if (!on()) return []; const p = S().p[key]; return p ? p.bless.slice() : []; }
  function apply(fo, key, C, pos) {
    if (!on() || !fo) return; const p = S().p[key]; if (!p) return;
    if (p.blade) fo.dmgMul = (fo.dmgMul || 1) * Math.pow(1.12, p.blade);
    if (p.vow) { fo.dmgMul = (fo.dmgMul || 1) * 1.08; fo.nsVow = 1; }
    if (p.armor) fo.maxHp = fo.hp = Math.round(fo.maxHp * Math.pow(1.18, p.armor));
    if (p.swift) fo.spdMul = (fo.spdMul || 1) * Math.pow(1.1, p.swift);
    if (p.study) fo.iq = Math.min(2.2, (fo.iq || 1) + 0.22 * p.study);
    if (p.skill.length) fo.skPool = Array.from(new Set((fo.skPool || []).concat(p.skill)));
    fo.nsKey = key;
    if (p.ally.length && C && pos) spawnAllies(fo, p.ally.slice(-2), C, pos);
  }
  async function spawnAllies(lead, list, C, pos) {
    const W = Worlds._W; if (!W) return;
    for (let i = 0; i < list.length; i++) {
      try {
        const a = list[i], h = allyH(a), ang = Math.random() * 6.28, p2 = pos.clone(); p2.x += Math.sin(ang) * 2.2; p2.z += Math.cos(ang) * 2.2;
        if (W.B && W.B.lp && W.B.lp.clamp) W.B.lp.clamp(p2, 1.5);
        const out = await Foe.populate(C, [{ h, pos: p2 }], { keep: true }), f2 = out && out[0]; if (!f2) continue;
        f2.brave = true; f2.seen = true; f2.state = 'chase'; f2.iq = Math.max(f2.iq || 0, 1); f2.maxHp = f2.hp = Math.round(f2.maxHp * 1.6); f2.dmgMul = (f2.dmgMul || 1) * 1.1; f2.nsAlly = lead.nsKey; f2._liv = 1;
        if (!W.foes) W.foes = Foe.foes; else if (!W.foes.includes(f2)) W.foes.push(f2);
        if (i === 0) setTimeout(() => { try { Foe.say(f2, rnd(['我也在！', '别想只盯着她一个。', '这就是那个食人魔？比画像上丑。', '说好了，头归她，赏金归我。'])); } catch (e) { } }, 1600);
      } catch (e) { console.warn('NemStory ally', e); }
    }
    try { G().toast(`👥 ${list.map(a => a.n).join('、')} 和她一起来了`, '#a8e0ff', 2.8); } catch (e) { }
  }

  // ================= 人设 / 台词 =================
  const HX = {
    aerin: { sn: '艾琳', wpn: '晨星之剑', home: '山茶村', clip: 'Idle_Loop',
      mentor: { n: '贝尔妲', t: '老骑士团长 · 她的剑术老师', col: '#d8c8a8' },
      place: { blade: '王都 · 矮人工坊', armor: '晨星神殿 · 圣器库', skill: '骑士团演武场 · 深夜', study: '晨星神殿 · 书库', swift: '雪山修行路', bless: '晨星神殿 · 祭坛前', vow: '山茶村 · 废墟', ally: '王都 · 冒险者酒馆' },
      say: {
        blade: ['矮人说这把剑撑不住第四次重铸。我说，那就让它在食人魔的脖子上碎掉。', '刃里熔进了山茶村那口钟的铜。每砍一下，它都会响。'],
        armor: ['上次那一刀砍穿了我的护肩。这次，我让神殿把圣徽钉进了铁里。'],
        skill: ['它的刀总是从右边来。所以我练了一千次左边。'],
        study: ['我把它砍过的每个人都记下来了：哪个地区，第几夜，用的哪只手。'],
        swift: ['卸掉了一半的铠甲。团长骂我疯了——可上次，我就差半步。'],
        bless: ['大祭司说，晨星只祝福不肯放弃的人。那我应该是被祝福最多的那个吧。'],
        vow: ['村口那棵山茶树又开花了。我答应过它，下一次花开之前，把它的头带回来。'],
        ally: ['一个人追不上它，那就两个人。']
      },
      react: ['它又在{reg}砍下了{n}颗头。我数着呢。', '{heads}颗首级……它到底还要收集多少？', '{reg}的人说，它走的时候在笑。'],
      end: ['以晨星之名——下一次，我不会再让你走。', '洗干净你的脖子，食人魔。', '我会在{reg}等你。'] },
    nove: { sn: '诺薇', wpn: '双刃「夜鸦」', home: '灰隼巷', clip: 'Idle_FoldArms_Loop',
      mentor: { n: '莉塔', t: '情报贩子 · 外号「灰鼠」', col: '#c8c0b0' },
      place: { blade: '黑市 · 地下拍卖会', armor: '灰隼巷 · 裁缝铺后屋', skill: '钟楼屋檐上', study: '{reg} · 你走过的路', swift: '王都屋顶 · 午夜', bless: '废弃的小教堂', vow: '赏金公会 · 悬赏墙前', ally: '港口 · 雨夜' },
      say: {
        blade: ['黑市的老头说这对刀杀过一头龙。我不在乎，我只在乎它够不够快。'],
        armor: ['皮甲里缝了十二层蛛丝。它的刀会慢一点点。一点点就够了。'],
        skill: ['我在钟楼上跳了一整晚。现在，我能从它的影子里钻出来。'],
        study: ['它在{reg}留下的脚印，左脚比右脚深。受过伤，对吧？', '它砍完人之后总会停一下。就停那么一下。'],
        swift: ['我把靴底磨薄了。现在连雪都听不见我。'],
        bless: ['我不信神。但莉塔硬塞给我的护身符……就当是运气吧。'],
        vow: ['悬赏单上它的价钱又涨了。不过我说过，这次不是为了钱。'],
        ally: ['我平时不跟人组队。它是例外——因为它太难抓了。']
      },
      react: ['血迹还是新的。它昨天在{reg}。', '它又砍了{n}颗头。每一颗，都是给我留的路标。', '它以为躲回洞里就没人知道。可我闻得到。'],
      end: ['找到你了——下一次，你会先听见我的声音。', '别回头。我已经在路上了。', '下次，我会更快。'] },
    gwen: { sn: '葛温', wpn: '斩斧「炉心」', home: '铁砧镇', clip: 'Idle_FoldArms_Loop',
      mentor: { n: '布伦希尔德', t: '矮人锻师 · 她父亲的老友', col: '#e0b090' },
      place: { blade: '铁砧镇 · 锻炉前', armor: '铁砧镇 · 锻炉前', skill: '城外采石场', study: '锻炉旁的长桌', swift: '山道 · 负重跑', bless: '炉神祭坛', vow: '父亲的墓前', ally: '铁砧镇 · 民兵营' },
      say: {
        blade: ['斧刃加重了两斤。挥不动？那就练到挥得动为止。'],
        armor: ['这层甲是用它砍断的那些剑熔的。很合适，不是吗？'],
        skill: ['我把采石场的石柱一根根劈开了。下一根，是它。'],
        study: ['它的刀砍在我甲上的时候，手腕会抖。我看见了。'],
        swift: ['背着铁砧爬山，一天三趟。现在穿着甲，我也追得上它。'],
        bless: ['炉神给了我一块不会冷的炭。我把它塞进了胸甲里。'],
        vow: ['父亲，锻炉还烧着。等它的头挂上城门，我再来看你。'],
        ally: ['拉风箱要两个人。砍头……大概也一样。']
      },
      react: ['{heads}颗头。每一颗都是一个没回家的人。', '听说它在{reg}又砍了{n}个。锻炉今晚烧得特别旺。'],
      end: ['锻炉还没熄。你也别想熄。', '站好，下次让我看看你的骨头有多硬。', '我会回来，带着更重的锤。'] },
    mia: { sn: '米娅', wpn: '星象法杖「第七象限」', home: '星象学院', clip: 'Idle_Talking_Loop',
      mentor: { n: '奥菲莉娅', t: '学院院长 · 不相信她的人', col: '#d0c8f0' },
      place: { blade: '星象学院 · 禁书库', armor: '星象学院 · 炼金实验室', skill: '天文塔顶 · 流星夜', study: '她的书房 · 墙上贴满了你的路线', swift: '学院中庭 · 清晨', bless: '星辰圣坛', vow: '天文塔 · 黎明', ally: '学院 · 学生宿舍' },
      say: {
        blade: ['从禁书库偷……借出来的。院长不会发现的。大概。'],
        armor: ['魔力护盾第三版。上一版被它一刀砍碎了——这版我算过，能挡七刀。'],
        skill: ['我推算了七百次它的闪避路线。第七百零一次，它会正好站在我的落点上。'],
        study: ['它在{reg}出现的时间，和满月的相位误差不超过一个时辰。它自己知道吗？'],
        swift: ['体能训练……我最讨厌体能训练。但上次，它离我只有三步。'],
        bless: ['星辰圣坛回应了我。它说——那个食人魔，也被月亮注视着。'],
        vow: ['院长说我的推算是小孩子的游戏。那我就带着它的头去见她。'],
        ally: ['我才不需要帮手！……只是需要有人帮我挡一下。就一下。']
      },
      react: ['星图上又多了{n}个红点，全在{reg}。', '{heads}颗首级……正好是一个星座的星数。巧合吗？', '推算显示，它下一次会去更深的地方。'],
      end: ['星图说，下一次你会输。', '推算完毕——下次见面，就是你的终点。', '下一次的星象，对我有利。'] }
  };
  const MENT = {
    blade: ['{wpn}已经第{k}次回炉了，{sn}。再这样下去，它会恨你的。', '拿去。刃口按你说的磨偏了半分——专砍脖子。'],
    armor: ['别再用肩膀去接它的刀了。这身甲能救你一次，不是每次。', '腰带系紧。它最喜欢从侧面砍。'],
    skill: ['再来一次。你出手之前，脚还是会先动。它也看得见。', '……好。这一招，连我都没看清。'],
    study: ['你已经三天没睡了。那些路线图明天看也不会跑掉。', '它不是野兽，{sn}。它会学。所以你要学得比它快。'],
    swift: ['卸甲是好事。但下次挨一刀，就没东西替你挡了。', '再跑一趟。它可不会等你喘气。'],
    bless: ['祝福只能点亮你心里本来就有的东西。去吧。', '把手给我。……很烫。你在发抖？'],
    vow: ['复仇会让刀变快，也会让人看不见路。答应我，活着回来。', '……我拦不住你，对吧。'],
    ally: ['多一个人，就多一双眼睛。别再一个人逞强了。']
  };
  const HAND = {
    blade: ['{sn}把新磨的{wpn}举到火光下。刃口上，映出一个模糊的、长着獠牙的影子。', '铁锤落下最后一次，火星溅在{sn}的手背上。她没有缩手。'],
    armor: ['{sn}一根一根系紧护甲的皮带。最后一根，系了两次。'],
    skill: ['木桩上多了一道新的斩痕——比旧的那道深了一指。'],
    study: ['桌上摊着一张地图。你去过的地区，被红墨水一个一个圈了起来。'],
    swift: ['{sn}踢掉沉重的胫甲，在石阶上来回奔跑，直到天亮。'],
    bless: ['烛火忽然一齐偏向{sn}。她低下头，把额头贴在{wpn}上。'],
    vow: ['{sn}用匕首在掌心划了一道，把血按在悬赏单上你的画像上。'],
    ally: ['两只手在酒馆的木桌上握在一起。桌角，钉着你的悬赏单。']
  };
  const ALLYSAY = ['我叫{an}，{at}。听说你在追那个砍头的家伙——算我一个。', '{an}，{at}。我姐姐死在{reg}。那个食人魔欠我一颗头。', '报酬一半归我。……另一半，用它的头来付。', '{an}。别问我为什么——它砍了我们村的井边那棵树下的每一个人。'];
  const ALLYHI = ['跟紧我。它喜欢先砍落单的人。', '好。下次，我们一起去。', '别拖我后腿就行。'];
  // 额外宿敌（逃走的人）
  const XSAY = {
    blade: ['我把旧刀扔了。它没能砍进你的皮。这一把可以。'], armor: ['伤口长好了，留下一道疤。我请铁匠照着这道疤，给我打了一副护甲。'],
    skill: ['每天夜里，我都梦见你那一刀。现在我知道该往哪边躲了。'], study: ['我问遍了被你袭击过的村子。你习惯从背后来，对吧？'],
    swift: ['上次我差一点就跑不掉。所以这次——轮到你跑不掉。'], bless: ['修女给我念了三天祷文。她说，从食人魔手里活下来的人，是神留下来的。'],
    vow: ['我活下来，只为了一件事。'], ally: ['我不是一个人逃回来的。这次，也不会一个人去找你。']
  };
  const XHELP = ['{N}，你的伤还没好透。', '……你又要去找它？', '至少，把这个带上。', '外面的人都在说，你是唯一一个从它手里活下来的。'];
  const XPLACE = ['{reg} · 一间漏雨的小屋', '{reg}外 · 河边的磨坊', '{reg} · 修道院的病房', '{reg} · 篝火旁', '{reg} · 废弃的瞭望塔'];

  function deeds() {
    let heads = 0, n = 0, reg = '这片土地';
    try { heads = (G().S.heads || []).length || 0; } catch (e) { }
    try { const W = Worlds._W; if (W && W.stats) n = W.stats.decap || W.stats.kill || 0; } catch (e) { }
    try { const k = (G().S.nst && G().S.nst.lastK) || lastReg(), L = locOf(k); if (L) reg = L.n; } catch (e) { }
    if (!n) n = 2 + Math.floor(Math.random() * 6); if (!heads) heads = 7 + Math.floor(Math.random() * 20);
    return { heads, n, reg };
  }

  // ================= 成长侦测 =================
  function poll() {
    if (!on() || !G() || !G().S) return; const s = S(), H2 = window.Hunters2;
    if (!s.intro && G().S) { s.intro = 1; queue({ k: 'intro', why: 'intro', t: Date.now() }); }
    if (H2 && H2.SS && (!H2.on || H2.on())) {
      const hs = H2.SS();
      for (const d of H2.D) {
        const L = hs.L && hs.L[d.id]; if (!L || L.dead) continue; const key = 'h:' + d.id, lv = H2.lvOf(d.id);
        if (s.lv[key] == null) { s.lv[key] = lv; s.esc = s.esc || {}; s.esc[d.id] = L.esc; continue; }
        if (lv > s.lv[key]) { s.esc = s.esc || {}; const why = L.esc > (s.esc[d.id] || 0) ? 'esc' : 'grow'; s.esc[d.id] = L.esc; grow(key, why, s.lv[key], lv); s.lv[key] = lv; }
      }
    }
    const N = window.Nemesis && Nemesis.S && Nemesis.S(); if (N && N.extra) {
      for (const x of N.extra) {
        const key = 'x:' + x.n, lv = x.lv + Math.floor(((N.play || 0) - x.at) / 300);
        if (!s.xs.includes(x.n)) { s.xs.push(x.n); s.lv[key] = lv; queue({ k: key, why: 'origin', lv1: lv, t: Date.now(), lk: lastK() }); continue; }
        if (s.lv[key] == null) s.lv[key] = lv; else if (lv > s.lv[key]) { grow(key, 'grow', s.lv[key], lv); s.lv[key] = lv; }
      }
      if (s.xs.length > 12) s.xs = s.xs.slice(-12);
    }
    try { const W = Worlds.active && Worlds._W, nd = W && W.graph && W.graph.nodes[W.cur]; if (nd && nd.loc && nd.loc.k) s.lastK = nd.loc.k; } catch (e) { }
  }
  const lastK = () => S().lastK || lastReg();
  function grow(key, why, lv0, lv1) {
    const s = S(), old = s.q.find(e => e.k === key && e.why !== 'origin' && e.why !== 'intro');
    if (old) { old.lv1 = lv1; const ev2 = { why }; rollAspect(key, ev2); (old.more = old.more || []).push(ev2); return; } // 同一人攒了多次：合并成一段，变强卡列出全部
    const ev = { k: key, why, lv0, lv1, t: Date.now(), lk: lastK() }; rollAspect(key, ev); queue(ev);
  }
  function queue(ev) { const q = S().q; q.push(ev); while (q.length > 8) { const i = q.findIndex(e => e.why !== 'intro' && e.why !== 'origin'); q.splice(i < 0 ? 0 : i, 1); } }

  // ================= 播放 =================
  let st = null; // {key, phase:'build'|'play', rigs:[], t0}
  let lastMap = null;
  const hold = () => { try { return !!st || !!(G() && G().S && on() && S().q.length && ready()); } catch (e) { return false; } };
  function ready() {
    const W = window.Worlds && Worlds.active && Worlds._W; if (!W || !W.B || W.busy || W.dead || !W.graph) return false;
    const nd = W.graph.nodes[W.cur]; if (!nd || nd.eliteArena || nd.huntArena || W.graph.arena) return false;
    if (window.Elites && Elites.E) return false; if (W.mapKey && W.mapKey === lastMap) return false;
    return !(window.Saga && Saga.cine) && !(window.Arrival2 && Arrival2.isOpen());
  }
  function pickEvent() { // 每次加载地图最多一段：开篇 > 起源 > 成长；其余成长事件做成“同一时间”蒙太奇
    const q = S().q; let i = q.findIndex(e => e.why === 'intro'); if (i < 0) i = q.findIndex(e => e.why === 'origin'); if (i < 0) i = 0;
    const ev = q.splice(i, 1)[0]; let side = [];
    if (ev && ev.why !== 'intro' && ev.why !== 'origin') { side = q.filter(e => e.why !== 'intro' && e.why !== 'origin').slice(0, 3); for (const e of side) q.splice(q.indexOf(e), 1); }
    return { ev, side };
  }
  function tick() {
    if (!G() || !G().S) return;
    poll();
    const W = window.Worlds && Worlds.active && Worlds._W;
    if (st) { if (st.phase === 'build' && performance.now() - st.t0 > 60000) { console.warn('NemStory: build timeout'); const ev = st.ev; abort(); if (ev && (ev.tries = (ev.tries || 0) + 1) < 2) S().q.unshift(ev); } return; } // 慢机器第一次搭模型可能很久：超时就留到下一张地图再播（最多重试 1 次）
    if (!W) { lastMap = null; return; }
    if (!on() || !S().q.length || !ready()) return;
    W.mapKey = W.mapKey || ('m' + Math.random()); lastMap = W.mapKey;
    const pk = pickEvent(); if (!pk.ev) return; try { G().save(); } catch (e) { }
    start(pk.ev, pk.side);
  }
  // 地图换了（worlds.goto 重建 B）→ 新 mapKey
  setInterval(() => { try { const W = window.Worlds && Worlds._W; if (W && W.B && W.B !== W.__nsB) { W.__nsB = W.B; W.mapKey = 'm' + Math.random(); } } catch (e) { } }, 200);

  // ---- 临时演员 ----
  function mul(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  async function rig(h, pos, yaw, clip, used) {
    if (st && st.stage) return { h, clip: clip || 'Idle_Loop', nm: (h.c && h.c.name) || '', stageSpec: 1 }; // R59 cine_stage：只给演员表，由摄影棚搭模型/站位
    const C = Foe.ctx && Foe.ctx(), W = Worlds._W; if (!C || !C.sc) throw new Error('no ctx');
    if (window.IdLook) { try { IdLook.apply(h); } catch (e) { } }
    const r = mul(((h.look.seed || 7) * 2654435761) >>> 0), body = Foe.bodyFor(h, r, false, used); used.add(body);
    const f = await Foe.build(body, h.look); await Foe.animate(f);
    if (window.IdLook) { try { IdLook.dress(f, h.c.id, h.look.seed); } catch (e) { } }
    const y = (() => { try { return W.B.H(pos.x, pos.z); } catch (e) { return pos.y || 0; } })();
    f.root.position.set(pos.x, y, pos.z); f.root.rotation.y = yaw; C.sc.add(f.root);
    try { f.play(clip || 'Idle_Loop', { fade: 0 }); f.mixer.setTime(Math.random() * 3); } catch (e) { try { f.play('Idle_Loop', { fade: 0 }); } catch (e2) { } }
    f.root.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
    return { f, pos: f.root.position, h, blinkT: 1 + Math.random() * 3, sc: C.sc };
  }
  function dropRigs(rigs) { for (const r of rigs || []) { try { if (r.f.root.parent) r.f.root.parent.remove(r.f.root); r.f.mixer.stopAllAction(); } catch (e) { } try { r.f.hb && r.f.hb.dispose && r.f.hb.dispose(); } catch (e) { } } }
  let animRaf = 0, animLast = 0;
  function animLoop() {
    if (!st) return; animRaf = requestAnimationFrame(animLoop); const now = performance.now(), dt = Math.min(0.05, (now - (animLast || now)) / 1000); animLast = now;
    for (const r of st.rigs) {
      try { r.f.mixer.update(dt); r.f.root.updateMatrixWorld(true); } catch (e) { }
      r.blinkT -= dt; if (r.blinkT < 0) { const b = r.blinkT > -0.07 ? -r.blinkT / 0.07 : r.blinkT > -0.16 ? 1 - (-r.blinkT - 0.07) / 0.09 : 0; try { r.f.hb.setExpression({ blink: Math.max(0, b) }); } catch (e) { } if (r.blinkT < -0.16) r.blinkT = 2 + Math.random() * 3; }
    }
  }
  function abort() { if (!st) return; const s0 = st; st = null; cancelAnimationFrame(animRaf); dropRigs(s0.rigs); }
  const face = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);

  async function start(ev, side) {
    st = { phase: 'build', rigs: [], t0: performance.now(), ev, stage: !!(window.CineStage && CineStage.on()) };
    const W = Worlds._W, P0 = W.pos, yaw = G().player.yaw, fw = { x: -Math.sin(yaw), z: -Math.cos(yaw) }, rt = { x: Math.cos(yaw), z: -Math.sin(yaw) };
    const V = (f, r) => new THREE.Vector3(P0.x + fw.x * f + rt.x * r, 0, P0.z + fw.z * f + rt.z * r);
    const used = new Set(), c = Object.assign(deeds(), {}); if (ev.lk) { const L = locOf(ev.lk); if (L) c.reg = L.n; }
    let spec = null;
    try {
      if (ev.why === 'intro') spec = await buildIntro(V, used, c);
      else if (ev.k.startsWith('h:')) spec = await buildHunter(ev, side, V, used, c);
      else spec = await buildExtra(ev, side, V, used, c);
    } catch (e) { console.warn('NemStory build', e); }
    if (!st || st.ev !== ev) { if (spec) dropRigs(spec.rigs); return; }
    if (!spec || !spec.beats.length) { abort(); return; }
    if (st.stage) { // R59：摄影棚播放（变强卡/名牌/标题卡都在摄影棚 UI 里）
      st.phase = 'play'; const s0 = st; if (window.CineScript) { try { CineScript.nem(spec, ev); } catch (e) { console.warn('CineScript.nem', e); } }
      CineStage.playHere({ actors: spec.rigs, beats: spec.beats, col: spec.col, onEnd: () => { if (st === s0) abort(); } }).then(ok => { if (!ok && st === s0) abort(); }).catch(e => { console.warn('NemStory stage', e); if (st === s0) abort(); });
      return;
    }
    st.rigs = spec.rigs; st.phase = 'play'; animLast = 0; animRaf = requestAnimationFrame(animLoop);
    timing(spec.beats);
    const ok = window.Saga && Saga.reel && Saga.reel({ beats: spec.beats, col: spec.col, onBeat: b => boost(b), onEnd: () => { boost(null); abort(); } });
    if (!ok) abort();
  }
  const durOf = t => Math.min(5.4, 1.0 + String(t).length / 10);
  function timing(beats) {
    for (const b of beats) {
      let t = b.lead || 0.45; for (const l of b.lines) { l.at = t; l.d = durOf(l.t); t += l.d + 0.2; }
      b.dur = Math.max(b.min || 2.6, t + 0.3); if (b.cut == null) b.cut = true;
    }
    beats[beats.length - 1].cut = false;
  }
  const L = (t, w, col, it) => ({ t, w: w || '', col: col || '', it: !!it });

  // ---- 变强卡（挂在 #sgRoot 里） ----
  let bx = null;
  function css() {
    if (document.getElementById('nsCss')) return; const st2 = document.createElement('style'); st2.id = 'nsCss';
    st2.textContent = `#sgRoot .nsb{position:absolute;right:6vw;top:50%;transform:translate(30px,-50%);opacity:0;transition:opacity .5s,transform .6s cubic-bezier(.2,.9,.3,1);min-width:300px;max-width:420px;padding:18px 22px 16px;border-radius:14px;background:linear-gradient(160deg,rgba(24,16,22,.88),rgba(10,8,14,.92));border:1px solid color-mix(in srgb,var(--nc,#ffb070) 55%,transparent);box-shadow:0 0 0 1px rgba(255,255,255,.04) inset,0 18px 50px rgba(0,0,0,.6),0 0 40px color-mix(in srgb,var(--nc,#ffb070) 18%,transparent);color:#f2e8dc;font-family:inherit;pointer-events:none;z-index:3}
#sgRoot .nsb.on{opacity:1;transform:translate(0,-50%)}
#sgRoot .nsb .k{font-size:12px;letter-spacing:.42em;color:var(--nc,#ffb070);opacity:.9;margin-bottom:6px}
#sgRoot .nsb .n{font-size:24px;font-weight:900;letter-spacing:.06em;margin-bottom:2px}
#sgRoot .nsb .lv{font-size:14px;color:#cdbfae;margin-bottom:10px}#sgRoot .nsb .lv b{color:#fff;font-size:18px}
#sgRoot .nsb .r{display:flex;align-items:center;gap:10px;margin:7px 0;padding:8px 10px;border-radius:9px;background:rgba(255,255,255,.045);opacity:0;transform:translateX(14px);animation:nsIn .45s forwards}
#sgRoot .nsb .r i{font-style:normal;font-size:22px;width:28px;text-align:center}#sgRoot .nsb .r .a{font-size:15px;font-weight:800}#sgRoot .nsb .r .e{font-size:13px;color:#d8ccb8}
#sgRoot .nsb .f{margin-top:10px;font-size:12px;color:#a89c8c;line-height:1.5}
@keyframes nsIn{to{opacity:1;transform:none}}`;
    document.head.appendChild(st2);
  }
  function boost(b) {
    const root = document.getElementById('sgRoot'); if (!root) return; css();
    if (!bx || !bx.isConnected) { bx = document.createElement('div'); bx.className = 'nsb'; root.appendChild(bx); }
    if (!b || !b.boost) { bx.classList.remove('on'); return; }
    const B = b.boost; bx.style.setProperty('--nc', B.col || '#ffb070');
    bx.innerHTML = `<div class="k">${esc(B.k)}</div><div class="n">${esc(B.n)}</div>${B.lv ? `<div class="lv">${B.lv}</div>` : ''}` + (B.rows || []).map((r, i) => `<div class="r" style="animation-delay:${0.35 + i * 0.28}s"><i>${r.ic}</i><div><div class="a" style="color:${r.col || '#fff'}">${esc(r.a)}</div><div class="e">${esc(r.e)}</div></div></div>`).join('') + (B.f ? `<div class="f">${esc(B.f)}</div>` : '');
    bx.classList.remove('on'); void bx.offsetWidth; setTimeout(() => bx && bx.classList.add('on'), 150);
  }
  const esc = t => String(t).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const row = e => ({ ic: ASP[e.a].ic, a: ASP[e.a].nm, e: ASP[e.a].eff(e), col: ASP[e.a].col });

  // ---- 剧本：猎手变强 ----
  async function buildHunter(ev, side, V, used, c) {
    const id = ev.k.slice(2), d = Hunters2.BY[id], X = HX[id]; if (!d || !X) return null;
    const a = ev.a, loc = curLoc(), hH = Hunters2.recFor(id, loc);
    const cx = Object.assign({}, c, { sn: X.sn, wpn: X.wpn, k: 2 + (P('h:' + id).blade || 1) });
    const f = t => fill(t, cx);
    const pA = V(2.4, -0.5), pB = V(2.6, 0.75);
    const her = await rig(hH, pA, face(pA, pB) + 0.35, X.clip, used); st.rigs.push(her);
    let other, oName, oCol, oTitle;
    if (a === 'ally' && ev.ally) { const h2 = allyH(ev.ally); other = await rig(h2, pB, face(pB, pA) - 0.35, 'Idle_Talking_Loop', used); oName = ev.ally.n; oCol = '#a8e0ff'; oTitle = ev.ally.t; cx.an = ev.ally.n; cx.at = ev.ally.t; }
    else { const h2 = RPG.foe(G().S, loc, (Math.imul(id.length * 97 + id.charCodeAt(0), 2654435761) ^ 0x3e17) >>> 0, new Set(), new Set()); h2.c = Object.assign({}, h2.c, { name: X.mentor.n }); other = await rig(h2, pB, face(pB, pA) - 0.35, 'Idle_Talking_Loop', used); oName = X.mentor.n; oCol = X.mentor.col; oTitle = X.mentor.t; }
    st.rigs.push(other); her.pair = other; other.pair = her;
    const nm = d.n, col = d.col, place = f(X.place[a] || X.home);
    const card = { k: '宿 敌', n: nm, t: d.t, ch: [`Lv.${ev.lv0} → Lv.${ev.lv1}`, ASP[a].ic + ' ' + ASP[a].nm], col };
    const ocard = { k: a === 'ally' ? '新 同 伴' : '身 边 的 人', n: oName, t: oTitle, ch: [a === 'ally' ? '👥 和' + X.sn + '结盟' : '与' + X.sn + '同行'], col: oCol };
    const whyT = ev.why === 'esc' ? `——${X.sn}从你手里逃走后的第 ${2 + Math.floor(Math.random() * 5)} 天` : rnd(['——你在洞里数首级的时候', `——你离开${c.reg}的那个晚上`, '——没人看见的地方']);
    const beats = [];
    beats.push({ shot: 'cLow', castFo: her, card: { a: '此 刻 · 在 别 处', b: place, c: whyT }, tag: '宿 敌 · ' + nm, lines: [], min: 3.6 });
    beats.push({ shot: 'cFace', castFo: her, cc: card, lines: [L(f(rnd(X.react)), nm, col)], min: 3.2 });
    const conv = [];
    if (a === 'ally') { conv.push(L(f(rnd(ALLYSAY)), oName, oCol)); conv.push(L(f(rnd(X.say.ally.concat(ALLYHI))), X.sn, col)); }
    else { conv.push(L(f(rnd(MENT[a])), oName, oCol)); conv.push(L(f(rnd(X.say[a])), X.sn, col)); }
    beats.push({ shot: 'cOS', castFo: other, cc: ocard, lines: [conv[0]] });
    beats.push({ shot: 'cOS', castFo: her, cc: card, cc2: 1, lines: [conv[1]] });
    beats.push({ shot: 'cHand', castFo: her, lines: [L(f(rnd(HAND[a])), '', '#e8dcc6', true)] });
    const rows = [row(ev)].concat((ev.more || []).map(row));
    beats.push({ shot: 'cTwo', castFo: her, lines: [L(f(rnd(X.end)), nm, col)], min: 4.6, boost: { k: '宿 敌 变 强', n: nm, col, lv: `Lv.${ev.lv0} → <b>Lv.${ev.lv1}</b>`, rows, f: '下次遇到她时生效' + (a === 'ally' ? '：她不会一个人来' : '') } });
    if (side && side.length) beats.push(montage(her, side));
    return { beats, rigs: st.rigs, col };
  }
  function montage(fo, side) {
    const rows = [], lines = [];
    for (const e of side) {
      const nm = nameOf(e.k); rows.push(Object.assign(row(e), { a: nm + ' · ' + ASP[e.a].nm }));
      for (const m of e.more || []) rows.push(Object.assign(row(m), { a: nm + ' · ' + ASP[m.a].nm }));
    }
    const hx = side.map(e => e.k.startsWith('h:') ? HX[e.k.slice(2)] : null).filter(Boolean);
    lines.push(L(hx.length ? `同一时间，${side.map(e => nameOf(e.k)).join('、')}也没有闲着。` : '同一时间，别的宿敌也在变强。', '', '#e8dcc6', true));
    return { shot: 'cEyes', castFo: fo, lines, min: 4.4, boost: { k: '同 一 时 间', n: '其他宿敌', col: '#ff9a8a', rows: rows.slice(0, 5), f: '每个变化都已经落到她们身上' } };
  }
  function nameOf(k) { if (k.startsWith('h:')) { const d = window.Hunters2 && Hunters2.BY[k.slice(2)]; return d ? d.n : k; } if (k === 'intro') return '猎手们'; return k.slice(2); }

  // ---- 剧本：额外宿敌（逃走的人） ----
  async function buildExtra(ev, side, V, used, c) {
    const n = ev.k.slice(2), N = window.Nemesis && Nemesis.S && Nemesis.S(), x = N && (N.extra || []).find(e => e.n === n); if (!x) return null;
    const loc = curLoc(), hX = JSON.parse(JSON.stringify(x.h)), cc = hX.c || {};
    const bio = (() => { try { return (window.Overhear && Overhear.bio(cc)) || {}; } catch (e) { return {}; } })();
    const idn = (window.Lore && Lore.ID && Lore.ID[cc.id] && Lore.ID[cc.id].n) || cc.idN || cc.title || '旅人';
    const cx = Object.assign({}, c, { N: n }), f = t => fill(t, cx), col = '#ffb0a0';
    const pA = V(2.4, -0.5), pB = V(2.6, 0.75);
    const her = await rig(hX, pA, face(pA, pB) + 0.35, 'Idle_Loop', used); st.rigs.push(her);
    let other, oName, oTitle, oCol = '#d8d0c0';
    if (ev.a === 'ally' && ev.ally) { other = await rig(allyH(ev.ally), pB, face(pB, pA) - 0.35, 'Idle_Talking_Loop', used); oName = ev.ally.n; oTitle = ev.ally.t; oCol = '#a8e0ff'; cx.an = oName; cx.at = oTitle; }
    else { const h2 = RPG.foe(G().S, loc, (Math.random() * 4294967296) >>> 0, new Set(), new Set()); other = await rig(h2, pB, face(pB, pA) - 0.35, 'Idle_Talking_Loop', used); oName = h2.c.name || '路人'; oTitle = (window.Lore && Lore.ID && Lore.ID[h2.c.id] && Lore.ID[h2.c.id].n) || h2.c.idN || '收留她的人'; }
    st.rigs.push(other); her.pair = other; other.pair = her;
    const place = f(rnd(XPLACE)), card = { k: ev.why === 'origin' ? '新 宿 敌' : '宿 敌', n, t: idn, ch: ev.why === 'origin' ? ['🩸 从你刀下逃生', bio.secret ? '秘密 · ' + bio.secret : '记住了你的脸'].slice(0, 2) : [`Lv.${ev.lv0} → Lv.${ev.lv1}`, ASP[ev.a].ic + ' ' + ASP[ev.a].nm], col };
    const ocard = { k: ev.a === 'ally' ? '新 同 伴' : '身 边 的 人', n: oName, t: oTitle, ch: [ev.a === 'ally' ? '👥 和' + n + '结盟' : '收留了她'], col: oCol };
    const beats = [];
    if (ev.why === 'origin') {
      beats.push({ shot: 'cLow', castFo: her, card: { a: '她 活 了 下 来', b: n, c: `——${c.reg}，你没能砍下的那颗头` }, tag: '宿 敌 · 起 源', lines: [L(`那场战斗结束时，${n}拖着一条伤腿，躲进了${place.replace(/^.*· /, '')}。`, '', '#e8dcc6', true)], min: 4.2 });
      beats.push({ shot: 'cFace', castFo: her, cc: card, lines: [L(rnd(['我看见它的脸了……我记住了。', '它的刀离我的脖子只有一寸。一寸。', '它在笑。砍人的时候，它在笑。']), n, col)], min: 3.4 });
      beats.push({ shot: 'cOS', castFo: other, cc: ocard, lines: [L(rnd(['别出声。它可能还在附近。', '把手松开，我给你包扎……你在发抖。', '从来没有人能从它手里逃出来。你是第一个。']), oName, oCol)] });
      beats.push({ shot: 'cOS', castFo: her, cc: card, cc2: 1, lines: [L(bio.catch ? `……${bio.catch}` : '我不会再逃了。下一次，是我去找它。', n, col)] });
      beats.push({ shot: 'cHand', castFo: her, lines: [L(rnd([`${n}把断掉的刀柄缠上布条，一圈，又一圈。`, `${n}在墙上刻下第一道痕。她说，每一道，都是它欠她的一天。`, `${n}把你的样子画在了纸上，钉在床头。`]), '', '#e8dcc6', true)] });
      beats.push({ shot: 'cEyes', castFo: her, lines: [L('食人魔。你会后悔放我走的。', n, col)], min: 4.6, boost: { k: '新 宿 敌', n, col, rows: [{ ic: '🩸', a: '她会追猎你', e: '出猎时可能找上门来', col: '#ff9a8a' }, { ic: '📈', a: '她会成长', e: '每 5 分钟 +1 级，每次变强都会有剧情', col: '#ffd890' }], f: '斩下她的头，这段恩怨才会结束' } });
    } else {
      beats.push({ shot: 'cLow', castFo: her, card: { a: '此 刻 · 在 别 处', b: place, c: '——她没有忘记你' }, tag: '宿 敌 · ' + n, lines: [], min: 3.4 });
      beats.push({ shot: 'cOS', castFo: other, cc: ocard, lines: [L(f(ev.a === 'ally' ? rnd(ALLYSAY) : rnd(XHELP)), oName, oCol)] });
      beats.push({ shot: 'cFace', castFo: her, cc: card, lines: [L(f(rnd(XSAY[ev.a] || XSAY.vow)), n, col)], min: 3.4 });
      beats.push({ shot: 'cHand', castFo: her, lines: [L(f(rnd(HAND[ev.a]).replace(/\{sn\}/g, n).replace(/\{wpn\}/g, '刀')), '', '#e8dcc6', true)] });
      const rows = [row(ev)].concat((ev.more || []).map(row));
      beats.push({ shot: 'cTwo', castFo: her, lines: [L(rnd(['这一次，轮到我找你了。', `${c.reg}见。`, '你会认出我的。我脸上，有你留下的疤。']), n, col)], min: 4.6, boost: { k: '宿 敌 变 强', n, col, lv: `Lv.${ev.lv0} → <b>Lv.${ev.lv1}</b>`, rows, f: '下次遇到她时生效' } });
      if (side && side.length) beats.push(montage(her, side));
    }
    return { beats, rigs: st.rigs, col };
  }

  // ---- 剧本：开篇 · 四名猎手接下悬赏 ----
  const INTRO = {
    aerin: ['神谕说，持晨星之剑者，将终结食人之魔。——那就是我。', '神谕点名的那一年，她的村子被屠尽了。'],
    nove: ['我从没失手过。它是第一个。也会是最后一个。', '王国最贵的赏金追迹者。她能从一滴干掉的血里读出你走过的路。'],
    gwen: ['锻炉烧了三年没熄。今天，该添一块新铁了。', '铁匠的女儿。那把比她还高的斩斧，是她亲手打的。'],
    mia: ['我算出了它的下一次出猎。……跟不上的话，我就一个人去。', '十九岁的星象学院首席。学院不相信她的推算。']
  };
  async function buildIntro(V, used, c) {
    if (!window.Hunters2) return null; const loc = curLoc(), ids = ['aerin', 'nove', 'gwen', 'mia'], rigs = {};
    const ctr = V(3.4, 0), xs = [-1.6, -0.55, 0.55, 1.6];
    const hs = ids.map(id => Hunters2.recFor(id, loc)); const got = await Promise.all(ids.map((id, i) => { const p = V(3.0 + Math.abs(xs[i]) * 0.25, xs[i]); return rig(hs[i], p, face(p, V(0, 0)) + (xs[i] < 0 ? 0.25 : -0.25), HX[id].clip, used); })); ids.forEach((id, i) => { rigs[id] = got[i]; st.rigs.push(got[i]); });
    rigs.aerin.pair = rigs.mia; rigs.mia.pair = rigs.aerin; rigs.nove.pair = rigs.gwen; rigs.gwen.pair = rigs.nove;
    const beats = [];
    beats.push({ shot: 'cLow', castFo: rigs.nove, card: { a: '猎 魔 公 会', b: '第 七 号 悬 赏 · 食 人 魔', c: `罪名：在九个地区砍下 ${c.heads} 颗首级　赏金：一万枚金币` }, tag: '序 章', lines: [L('悬赏单钉上墙的那天晚上，有四个人同时伸出了手。', '', '#e8dcc6', true)], min: 5 });
    for (const id of ids) {
      const d = Hunters2.BY[id], fo = rigs[id];
      beats.push({ shot: id === 'gwen' ? 'cLow' : 'cFace', castFo: fo, cc: { k: '猎 手', n: d.n, t: d.t, ch: [d.ic + ' Lv.' + Hunters2.lvOf(id), d.style.split(/[，。]/)[0]], col: d.col }, lines: [L(INTRO[id][1], '', '#e8dcc6', true), L(INTRO[id][0], d.n, d.col)], min: 5 });
    }
    beats.push({ shot: 'cTwo', castFo: rigs.aerin, lines: [L('我们没必要做朋友。', '诺薇·灰隼', Hunters2.BY.nove.col), L('只要它的头落地就行。', '艾琳·晨星', Hunters2.BY.aerin.col), L('四个人，四个理由。目标只有一个——你。', '', '#e8dcc6', true)], min: 6 });
    beats.push({ shot: 'cHand', castFo: rigs.mia, lines: [L('没有人注意到：悬赏单的落款处，没有名字，只印着一枚银色的新月。', '', '#d8d0ff', true)], min: 4.4 });
    beats.push({ shot: 'cEyes', castFo: rigs.mia, lines: [L('……这个月印，我在禁书库里见过。是「月之魔女」。', '米娅·星语', Hunters2.BY.mia.col)], min: 5, boost: { k: '主 线', n: '🌙 月之魔女', col: '#c8b8ff', rows: [{ ic: '⚔', a: '四名猎手', e: '会追猎你、会逃走、会变强——每次变强都有剧情', col: '#ffd890' }, { ic: '🌙', a: '集齐 7 条月之线索', e: '找到是谁在背后悬赏你，然后砍下她的头', col: '#c8b8ff' }], f: '在各地区斩下“月之使者”或触发闪回得到线索' } });
    return { beats, rigs: st.rigs, col: '#c8b8ff' };
  }

  setInterval(() => { try { tick(); } catch (e) { console.warn('NemStory', e); } }, 250);
  function pending() { // \u8fdb\u56fe\u90a3\u4e00\u523b\u5c31\u76d6\u9ed1\uff0c\u4e0d\u8ba9\u73a9\u5bb6\u5148\u770b\u5230\u5730\u56fe\u518d\u5361\u987f\u52a0\u8f7d\u7535\u5f71
    try {
      if (st || !on() || !G() || !G().S || !S().q.length) return false;
      const W = window.Worlds && Worlds.active && Worlds._W; if (!W || !W.B || W.dead || !W.graph) return false;
      const nd = W.graph.nodes[W.cur]; if (!nd || nd.eliteArena || nd.huntArena || W.graph.arena) return false;
      if (window.Elites && Elites.E) return false; if (window.Saga && Saga.cine) return false; if (window.Arrival2 && Arrival2.isOpen()) return false;
      return W.B !== W.__nsB || !(W.mapKey && W.mapKey === lastMap);
    } catch (e) { return false; }
  }
  return { on, hold, apply, aff, S, ASP, grow, queue, pending, get busy() { return !!st; }, _dbg: { start, pickEvent, poll } };
})();
