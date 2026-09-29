// 叙事引擎（第十轮）：按“因素”组合句子，而不是套模板。
// 因素：她的性格声线 / 是否察觉你（注意力）/ 你与她的实力差 / 你的伤势 / 你在这一带的恶名与仁名 /
//       她是否亲眼见过你刚才动手（目击）/ 她的宿愿与信仰 / 她是否立誓要杀你 / 所在地的景物与时辰。
// 每类句子有多条候选并带条件，按权重抽取；最近用过的句子会被避开，保证同一趟、甚至连续几趟都不重样。
window.Tale = (() => {
  const VOICE = {
    proud: ['高傲', '自恋', '骄纵', '傲娇', '野心勃勃'], gentle: ['温柔', '慈悲', '天真', '多情', '浪漫'],
    cold: ['冷酷', '冷静', '沉默寡言', '孤僻', '严谨', '腹黑'], fierce: ['暴躁', '好战', '勇敢', '残忍', '叛逆', '坚韧', '固执'],
    timid: ['胆小', '爱哭', '优柔寡断', '神经质', '悲观'], sly: ['狡黠', '贪婪', '毒舌', '嫉妒心强', '善变'],
    pious: ['虔诚', '忠诚', '偏执'], cheerful: ['开朗', '乐观', '话痨', '好奇', '贪吃', '迷糊', '懒散'], odd: ['洁癖', '多疑']
  };
  const voiceOf = (t) => { for (const k in VOICE) if (VOICE[k].includes(t)) return k; return 'cold'; };
  const recent = []; const RECENT_MAX = 80;
  // 从候选中选：[text, cond?, weight?]；cond 为函数(ctx)→bool
  function choose(ctx, list) {
    const ok = list.filter(e => typeof e === 'string' || !e[1] || e[1](ctx));
    const items = ok.map(e => typeof e === 'string' ? [e, null, 1] : [e[0], e[1], e[2] == null ? (e[1] ? 2.2 : 1) : e[2]]);
    const fresh = items.filter(e => !recent.includes(e[0])); const pool = fresh.length ? fresh : items;
    let tot = pool.reduce((s, e) => s + e[2], 0), x = ctx.r() * tot, pickd = pool[0];
    for (const e of pool) { x -= e[2]; if (x <= 0) { pickd = e; break; } }
    recent.push(pickd[0]); if (recent.length > RECENT_MAX) recent.shift();
    return fill(pickd[0], ctx);
  }
  function fill(s, c) {
    return s.replace(/\{(\w+)\}/g, (m, k) => c[k] != null ? c[k] : m);
  }
  // ---------- 地点意象 ----------
  const PLACE = {
    village: ['麦田边的石墙旁', '村口那口老井边', '晒着干草的篱笆后', '风车投下的影子里', '炊烟弯弯的屋檐下'],
    forest: ['一棵需要十人合抱的古树下', '发光蘑菇围成的圆圈里', '萤火虫聚集的溪边', '藤蔓垂落的林间小径上', '长满青苔的倒木旁'],
    wilds: ['一座风化的石柱下', '兽骨图腾的阴影里', '被风吹得猎猎作响的帐篷旁', '干裂的河床边', '一簇枯黄的荆棘后'],
    abbey: ['修道院的墓园里', '一尊天使石像前', '爬满常春藤的回廊外', '钟楼的阴影下', '烛火摇曳的路旁神龛边'],
    swamp: ['高脚木屋下的浅水里', '冒着气泡的毒沼旁', '一棵扭曲的枯树下', '绿色鬼火飘荡的芦苇丛中', '腐木搭成的栈桥上'],
    fortress: ['要塞城墙的垛口下', '一排尖木桩后面', '军帐之间的空地上', '瞭望塔的阴影里', '插满残旗的土坡上'],
    capital: ['大理石喷泉边', '一排煤气路灯下', '钟塔俯瞰的石板路上', '花坛围着的小广场里', '贵族宅邸的铁栅栏外'],
    abyss: ['流淌的岩浆河边', '一根黑曜石尖刺下', '巨大的骨拱门下', '悬浮岩块投下的阴影里', '硫磺烟雾弥漫的裂谷边'],
    peak: ['巨龙的肋骨之间', '一根断裂的古老石柱旁', '云海翻涌的崖边', '积雪覆盖的松林边', '被风刻出纹路的冰岩下']
  };
  const V = {};
  // ---------- 开场叙述 ----------
  const INTRO_SEE = [
    ['{place}，{raceN}{idN}「{name}」正{act}。她还没有发现你。', c => !c.noticed],
    ['{place}有个人影。走近了才看清，是一名{idN}——{hn}色的头发，{en}色的眼睛。她正{act}，完全没注意到身后。', c => !c.noticed],
    ['你放轻脚步。{place}，{idN}「{name}」背对着你，正{act}。', c => !c.noticed && c.q > 1],
    ['{place}，一名{raceN}{idN}猛地转过身来——她早就听到你的脚步声了。', c => c.noticed],
    ['{place}站着一个{hn}发的{idN}。她{en}色的眼睛直直地盯着你，手按在{wpn}上。', c => c.noticed],
    ['还没等你靠近，{place}的{idN}「{name}」就抬起了头。', c => c.noticed],
    ['{place}，「{name}」挡在了路中间，好像已经在那里等了你很久。', c => c.noticed && c.vendetta, 5]
  ];
  const INTRO_EXTRA = [
    ['她显然听到了刚才那边的动静，{wpn}已经握在手里。', c => c.witness, 4],
    ['这一带的炉火边，早就有人在讲食人魔格罗克的故事了。', c => c.rep >= 4 && c.rep < 12],
    ['你在这里的恶名已经传遍了每一条小路。她一看到你，脸色就变了。', c => c.rep >= 12, 3],
    ['听说最近有个会放人走的食人魔在这附近游荡——她看你的眼神里，戒备少了几分。', c => c.mercy >= 3 && c.mercy > c.rep * 0.5, 3],
    ['她身上散发出的气息让你的后颈发凉。她比你强。', c => c.q < 0.75, 2],
    ['她握武器的手微微发抖。她知道自己不是你的对手。', c => c.q > 2 && c.noticed, 2],
    ['你身上的伤口还在渗血，每走一步都在地上留下暗红的印子。', c => c.hpF < 0.35, 2],
    ['她的头上{acc}，在光下闪闪发亮。', c => !!c.acc, 0.8],
    ['', null, 2.5]
  ];
  // ---------- 她的第一句话（按声线）----------
  V.greet = {
    proud: ['一头食人魔，也敢挡本小姐的路？', '哼。跪下，或者滚开——今天我心情好，允许你选。', '你的气味隔着三条街都闻得到。', ['……你就是那个食人魔？无所谓，我可不会后退半步。', c => c.q > 1.8], ['就凭你？回你的洞里去吧，丑八怪。', c => c.q < 0.75], ['格罗克！我等这一天等了很久。今天，你的头归我。', c => c.vendetta, 6], ['我听说过你。传言把你说得太高大了。', c => c.rep >= 4], ['受了伤还敢出来晃？真是勇气可嘉。', c => c.hpF < 0.35]],
    gentle: ['啊……你迷路了吗？这里不是你该来的地方。', '你看起来很累。要是你不打算伤人，就请从这里过去吧。', '我不想打架……可我也不会逃。', ['你在流血……那些伤，是谁弄的？', c => c.hpF < 0.5, 3], ['你就是大家说的那个……可你的眼睛看起来没有那么可怕。', c => c.rep >= 4], ['我发过誓要找到你。可真的见到你，我的手却在发抖。', c => c.vendetta, 6], ['刚才那声惨叫……是你做的吗？', c => c.witness, 4]],
    cold: ['……', '让开。', '食人魔。十二步。你走不到我面前。', '我不和怪物说话。', ['你比情报里写的还要强。有意思。', c => c.q > 1.8], ['你的动作太大了，我在很远的地方就看见你了。', c => c.noticed], ['目标确认。格罗克。', c => c.vendetta, 6]],
    fierce: ['来得正好！我正嫌今天太无聊！', '拔出你的武器，怪物！', '我数到三。一——算了，直接来吧！', ['哈！就这？我还以为传说中的食人魔有多大呢！', c => c.q < 0.75], ['格罗克！我的{wpn}认得你的名字！', c => c.vendetta, 6], ['刚才是你吧？很好，省得我去找你！', c => c.witness, 4]],
    timid: ['呀！别、别过来！我、我有武器的！', '……请、请当作没看见我……', '为什么偏偏是今天……', ['是、是那个食人魔……传说是真的……', c => c.rep >= 4, 3], ['我、我听见了……刚才那边……', c => c.witness, 4]],
    sly: ['哎呀，大块头。我们做个交易怎么样？', '你背篓里装的是什么？让我猜猜……', '你的弱点在左边，对吧？开个玩笑。', ['伤得不轻嘛。要不要我帮你包扎一下——收费的那种。', c => c.hpF < 0.5, 3], ['听说你收藏首级？真巧，我也收藏——收藏金币。', c => c.rep >= 4]],
    pious: ['以{belief}之名，退下，邪物！', '我为你祈祷过。现在看来没什么用。', '神在看着我们两个。你猜祂站在哪边？', ['{belief}告诉我，今天会遇见考验。原来就是你。', c => c.noticed], ['你手上的血，{belief}都看见了。', c => c.witness || c.rep >= 8, 3]],
    cheerful: ['哇！真的是食人魔！比画上的还大！', '嗨！你也是出来散步的吗？', '你饿不饿？我这里有面包——啊，你好像不吃面包。', ['你受伤了？要不要吃块糖？吃糖伤口会好得快！', c => c.hpF < 0.5, 3]],
    odd: ['离我远点……你身上多少天没洗了？', '你是一个人来的？真的？……我不信。', ['你身后还有谁？别骗我。', c => c.noticed]]
  };
  // ---------- 交谈 ----------
  V.talk1 = {
    proud: ['我将来要{goal}。像你这样的东西，不过是路上的一块石头。', '{goal}——这种事，也只有我配去做。'],
    gentle: ['我只是想{goal}……这个愿望，很奇怪吗？', '我想{goal}。每天晚上睡前，我都会想一遍。'],
    cold: ['{goal}。这就是我活着的理由。说完了。', '……{goal}。别再问了。'],
    fierce: ['我要{goal}！谁挡路我就砍谁——包括你！', '{goal}！等我做到了，全世界都会记住我的名字！'],
    timid: ['我、我想{goal}……所以我还不能……', '其实……我想{goal}。很傻吧……'],
    sly: ['我？我想{goal}。你要是帮我，说不定我还能分你点好处。', '秘密。……好吧，告诉你也无妨：我想{goal}。'],
    pious: ['我信奉{belief}。祂指引我去{goal}。', '{belief}在梦里对我说，我要{goal}。'],
    cheerful: ['我的梦想是{goal}！很棒吧？你呢，你的梦想是什么？', '我要{goal}！还有，想吃遍王都所有的点心！'],
    odd: ['……为什么问这个？就算我想{goal}，又关你什么事。', '你打听这些干什么？……我想{goal}，行了吧。']
  };
  V.talk2 = {
    proud: ['听说你收藏首级。真没品位——除非你收藏的是我这种。', '你的洞里要是真挂满了人头，那也一定没有一颗比我美。'],
    gentle: ['那些被你带走的人……她们也有想做的事吧。', '你为什么要那样做呢？……算了，你大概也不知道。'],
    cold: ['你看我的眼神，像在估价。', '你的收藏里缺一颗像我这样的头。你是这么想的吧。'],
    fierce: ['想要我的头？那就凭本事来拿！', '少废话，你到底打不打？'],
    timid: ['那些传言……是真的吗？你洞里的……', '你、你一直盯着我的脖子看……'],
    sly: ['你的收藏品值多少钱？我认识几个买家。', '我们都是收藏家嘛。只是我收藏的东西，不会瞪着我。'],
    pious: ['你带走的那些灵魂都在哭。你听不见吗？', '就算是你，{belief}也会给一次机会的。'],
    cheerful: ['你的洞里真的有那么多……哇。你一定很寂寞吧？', '你平时都吃什么？……啊，还是别告诉我了。'],
    odd: ['你靠近一步，我就后退一步。这样最安全。', '你刚才是不是在笑？食人魔会笑吗？']
  };
  // ---------- 结局台词 ----------
  V.spare = {
    proud: ['……哼。算你识相。', '别以为这样我就会感激你。'], gentle: ['谢谢你。我会记住的——格罗克。', '你……其实是个好人吧？'], cold: ['……我欠你一次。', '……记下了。'],
    fierce: ['下次见面，我不会手下留情！', '你会后悔今天没动手的！'], timid: ['诶？诶……谢、谢谢……', '我、我可以走了？真的？'], sly: ['真是个奇怪的食人魔。好吧，我会替你说几句好话。', '这份人情，我会找机会还……大概。'],
    pious: ['愿{belief}宽恕你。……也许祂真的会。', '{belief}会记得你今天的仁慈。'], cheerful: ['你是个好食人魔！我要告诉所有人！', '拜拜！下次请你吃东西！'], odd: ['……一定有什么阴谋。', '我不会转身背对你的。']
  };
  V.last = {
    proud: ['……记住我的名字。', '……哼，便宜你了。'], gentle: ['……如果可以，替我去{goalObj}吧。', '……天快黑了呢。'], cold: ['……就这样吧。', '……原来如此。'],
    fierce: ['好一刀……！', '哈……痛快！'], timid: ['……', '……啊。'], sly: ['真是……亏本买卖……', '算你……狠……'],
    pious: ['{belief}……我来了。', '……终于可以休息了。'], cheerful: ['……啊，天空好蓝啊。', '……下次，一起吃点心……'], odd: ['我就知道……', '……果然。']
  };
  V.win = {
    proud: ['滚回你的洞里去吧！', '这就是你和我的差距。'], gentle: ['请别再来了。', '对不起……可我不能输。'], cold: ['下次瞄准一点。', '太慢。'],
    fierce: ['哈哈！再来啊！', '就这点本事？！'], timid: ['我、我赢了？！', '呜……好可怕……快走开！'], sly: ['谢谢惠顾~', '下次记得带钱来。'],
    pious: ['神与我同在。', '{belief}护佑着我。'], cheerful: ['耶！我赢了！', '哇，你好弱！啊，我不是那个意思！'], odd: ['你太慢了。', '我就知道你会从左边来。']
  };
  // 开战叙述
  const FIGHT_WIN = ['你的{weapon}划出一道弧线。', '你咆哮着扑了上去。', '一声闷响之后，一切都安静了。', '她的{wpn}只来得及举起一半。', ['她甚至没来得及回头。', c => c.sneak, 4]];
  const FIGHT_LOSE = ['她的身影一晃，你的{weapon}劈了个空。', '你冲上去，迎面挨了狠狠一击。', '她比你想象的要快得多。'];
  const SPARE_GO = ['她退后几步，转身消失在{placeS}。', '她没有回头，很快就走远了。', '她朝你点了点头，然后离开了。', ['她一路小跑着逃走了，差点被自己的裙角绊倒。', c => c.voice === 'timid' || c.voice === 'cheerful']];
  const SNEAK_BY = ['你压低身子，从她身后悄悄绕了过去。', '你屏住呼吸，等她走远才重新上路。'];
  // ---------- 构建上下文 ----------
  function ctx(c, look, env) {
    let s = (env.seed || (Math.random() * 1e9)) >>> 0; const r = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const I = Lore.ID[c.id] || { act: ['站在那里'], wpn: '匕首' };
    const t0 = c.traits && c.traits[0] || '冷静';
    const voice = voiceOf(t0);
    // 注意力：性格 + 你的恶名 + 目击 + 伤势（血腥味）
    let att = 0.45;
    if (['多疑', '冷静', '严谨', '神经质', '腹黑', '好战'].some(t => c.traits.includes(t))) att += 0.25;
    if (['迷糊', '天真', '懒散', '贪吃', '浪漫', '话痨'].some(t => c.traits.includes(t))) att -= 0.25;
    if (env.witness) att += 0.35; if ((env.rep || 0) >= 8) att += 0.1; if (env.hpF < 0.35) att += 0.1;
    const vendetta = c.goal === '亲手斩杀洞穴食人魔格罗克';
    if (vendetta) att += 0.4;
    const noticed = r() < Math.max(0.1, Math.min(0.95, att));
    const goalObj = c.goal.replace(/^(找到|成为|寻找|登上|看一次|开一家|写一本)/, '');
    const accN = (look.acc || []).map(a => ({ crown: '戴着一顶小王冠', tiara: '戴着一顶宝石头冠', witchhat: '戴着一顶尖尖的魔女帽', veil: '披着一层薄纱' })[a]).filter(Boolean)[0] || '';
    const C = Object.assign({ r, c, voice, noticed, vendetta, q: env.q || 1, hpF: env.hpF == null ? 1 : env.hpF, rep: env.rep || 0, mercy: env.mercy || 0, witness: !!env.witness, sneak: false,
      name: c.name, idN: c.idN, raceN: (c.raceN || '').replace(/（.*）/, ''), act: I.act[Math.floor(r() * I.act.length)], wpn: I.wpn, belief: c.belief, goal: c.goal, goalObj,
      hn: look.hn || '深', en: look.en || '黑', acc: accN, weapon: env.weapon || '木棒',
      place: pickP(r, env.loc), placeS: pickP(r, env.loc).replace(/(旁|边|里|下|后|上|前|中|外)$/, '') }, {});
    return C;
  }
  function pickP(r, k) { const l = PLACE[k] || ['路旁']; return l[Math.floor(r() * l.length)]; }
  const lineOf = (C, set) => choose(C, (set[C.voice] || set.cold));
  return {
    voiceOf, ctx,
    intro: C => { const a = choose(C, INTRO_SEE), b = choose(C, INTRO_EXTRA); return a + (b ? ' ' + b : ''); },
    greet: C => lineOf(C, V.greet), talk: (C, n) => lineOf(C, n ? V.talk2 : V.talk1),
    spare: C => lineOf(C, V.spare), last: C => lineOf(C, V.last), win: C => lineOf(C, V.win),
    fightWin: C => choose(C, FIGHT_WIN), fightLose: C => choose(C, FIGHT_LOSE), spareGo: C => choose(C, SPARE_GO), sneakBy: C => choose(C, SNEAK_BY),
    PLACE, VOICE
  };
})();
