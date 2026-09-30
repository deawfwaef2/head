// 第二十七轮：角色人设扩展 + 进场“偷听”对话框（window.Overhear，MOD `overhear`）
// 用户：让角色人设更丰富——进入场地时弹出框框，让你听到她们的对话、人设信息。
// 1) Overhear.bio(c)：确定性生成的私人设定（小习惯 / 喜好 / 讨厌 / 恐惧 / 秘密 / 口头禅），不写存档，旧存档的头也有。
// 2) Overhear.enter(node, ctx)：进入地点时，如果这里有 ≥1 个活着的“猎物”，在左侧弹出对话框（不冻结、不抢操作、自动消失）：
//    角色按「性格（8 种原型）× 话题」说话；话题由她们的关系决定（同系 / 阶位差 / 同身份 / 偶遇）。
//    话里会透露她的信息（目的 / 信仰 / 身份 / 性格 / 小习惯）——直接写进 c.kn，之后回忆时不用再想。
(function () {
  const RCOL = ['#b8b8c0', '#4aa8ff', '#c05aff', '#ffb020', '#ff4a8a'], RN = ['凡魂', '灵魂', '英魂', '圣魂', '神魂'];
  const AN = { proud: '高傲', cold: '冷静', gentle: '温柔', timid: '胆小', fierce: '好战', sharp: '毒舌', sly: '狡黠', cheerful: '开朗' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hash = s => { s = String(s); let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100003) / 100003; };
  const hp = (s, arr) => arr[Math.floor(hash(s) * arr.length) % arr.length];
  const rp = arr => arr[Math.floor(Math.random() * arr.length)];
  const on = () => !window.Mods || Mods.on('overhear') !== false;
  const sh = c => String(c.name || '？').split('·')[0];
  const arche = c => window.Persona && Persona.archOf ? Persona.archOf(c) : 'cheerful';

  // ---------- 私人设定池 ----------
  const QUIRK = ['咬指甲', '哼走调的歌', '摸耳朵', '数自己的步子', '转手里的武器玩', '对着影子说话', '反复擦同一件东西', '把头发绕在手指上', '偷偷舔嘴唇', '点头像啄木鸟', '在地上画小圈', '吹口哨', '嚼草根', '攥着护身符', '用脚尖敲地面', '自言自语', '叹气'];
  const LIKE = ['热汤', '雨后的泥土味', '亮晶晶的东西', '旧书的气味', '蜂蜜', '一个人待着的时间', '被夸奖', '夜里的星星', '磨得锋利的刀刃', '猫', '甜点', '花环', '赢的感觉', '热闹的集市'];
  const HATE = ['吵闹', '潮湿的袜子', '被人碰头发', '说谎的人', '迟到', '血腥味', '醉汉', '被命令', '蜘蛛', '冷饭', '被人盯着看', '雷声'];
  const FEAR = ['黑暗', '被遗忘', '火', '深水', '孤身一人', '失去重要的人', '自己的影子', '被抛弃', '高处', '被人背叛', '怪物', '变老'];
  const SECRET = ['偷偷藏着一封没寄出的信', '其实一直害怕打仗', '有一半的名字是自己编的', '曾经救过一个本该杀掉的人', '背着大家攒了一笔钱', '夜里会梦游', '从来没有真正信过自己的神', '藏着一把不属于自己的钥匙', '会唱一首没人听过的歌', '暗恋过一个再也见不到的人', '其实不会游泳', '很想回老家看一眼', '手上有洗不掉的旧伤疤', '偷吃过别人的供品', '说过一个至今没兑现的承诺', '记得每一个被自己击败的人'];
  const CATCH = {
    proud: ['本小姐可不是谁都能见的。', '这种程度，不值一提。', '站着说话。我不喜欢仰头。'], cold: ['无所谓。', '按计划行事。', '……多说无益。'],
    gentle: ['没关系的，慢慢来。', '愿你平安。', '我会陪着你的。'], timid: ['对、对不起……', '千万别靠近……', '我什么都没看见。'],
    fierce: ['来啊！', '痛快！', '拳头硬才是道理！'], sharp: ['啧，无聊。', '你是认真的吗？', '真让人失望。'],
    sly: ['嘿嘿，这个嘛……', '价钱好商量。', '别说是我说的。'], cheerful: ['耶！', '肚子饿啦～', '今天也要加油！']
  };
  const bioCache = new WeakMap();
  function bio(c) {
    if (!c) return null; let b = bioCache.get(c); if (b) return b; const s = c.name + '|' + c.id, a = arche(c);
    b = { quirk: hp(s + 'q', QUIRK), like: hp(s + 'l', LIKE), hate: hp(s + 'h', HATE), fear: hp(s + 'f', FEAR), secret: hp(s + 's', SECRET), catch: hp(s + 'c', CATCH[a] || CATCH.cheerful), arche: a, an: AN[a] };
    bioCache.set(c, b); return b;
  }
  const bioHTML = c => { const b = bio(c); return `<p><b>口头禅</b>　「${esc(b.catch)}」</p><p><b>小习惯</b>　爱${esc(b.quirk)}</p><p><b>喜欢</b>　${esc(b.like)}　<b>讨厌</b>　${esc(b.hate)}</p><p><b>最怕</b>　${esc(b.fear)}</p><p><b>秘密</b>　${esc(b.secret)}</p>`; };

  // ---------- 台词：O = 开口，R = 回应；按性格原型各 2 句 ----------
  const T = {
    work: {
      O: { proud: ['{b}，你看见我方才{act}的样子了吗？这一带没人比得上那份从容。', '我{act}，是因为别人做不好。仅此而已。'], cold: ['我刚才{act}。没有异常。', '{act}——这件事我做过很多遍，不会出错。'], gentle: ['{b}，我刚才{act}，还想着要不要叫上你呢。', '今天{act}的时候，天气特别好……真希望大家都平安。'], timid: ['那个……我刚才{act}……你有没有听到什么奇怪的声音？', '我、我只是{act}而已，不会有事的吧……'], fierce: ['哈！我{act}，浑身都是劲儿，就等着谁撞上来！', '别废话了，我刚才{act}，手都痒了！'], sharp: ['我{act}，结果某人还嫌我慢。你说好不好笑？', '{act}——对，我就是这么无聊，你有意见？'], sly: ['嘘，{b}，我{act}的时候，看见了点有意思的东西。', '我刚才{act}，顺手还摸到了别的——别告诉别人。'], cheerful: ['{b}{b}！我刚才{act}，超级好玩！你要不要一起？', '今天也好好地{act}啦！肚子好饿哦。'] },
      R: { proud: ['哼，那种小事也值得拿来说？', '你做得……还行，不过比我差一点。'], cold: ['嗯。记下了。', '没有问题就继续。'], gentle: ['辛苦你了，要不要先歇一会儿？', '听起来很不错呢，我也想试试。'], timid: ['诶、诶？真的没事吗……我有点害怕……', '那、那我也跟着你吧，一个人不安心。'], fierce: ['哈哈，有劲！下次算我一个！', '少说两句，先把家伙拿稳！'], sharp: ['是啊，无聊得恰到好处。', '你每次都是这个开头，我都能背了。'], sly: ['哦？说下去，我最爱听这种。', '有意思……我们晚点再细聊。'], cheerful: ['好呀好呀！我也要去！', '哇，听起来好棒！我也饿了！'] }, rev: 'race'
    },
    you: {
      O: { proud: ['听说最近有个拿麻袋的东西在到处割头——区区猎头者，也配站在我面前？', '要是那个猎头的敢来，我会让她知道什么叫身份。'], cold: ['有人在附近猎头。脚印很新，不止一个方向。', '猎头者在这一带活动。警戒，别落单。'], gentle: ['我听说有人在收集……头颅。真让人难过，为什么要这样呢。', '如果那个人真的来了，我想先和她说句话。'], timid: ['你听到了吗……有人在割头……会不会就在附近……', '我昨晚梦见那个提麻袋的人了……'], fierce: ['猎头的？正好！我一直想试试她的刀有多硬！', '来啊！谁怕她！'], sharp: ['传闻里的猎头者？呵，我猜不过是个会拿刀的胆小鬼。', '人人都在传，我倒想亲眼看看她是不是三头六臂。'], sly: ['嘿，听说猎头者的麻袋里有不少魂晶……我们要不要……', '我有个主意：让别人先上，我们捡便宜。'], cheerful: ['听说有个很厉害的猎头者！我想看！', '她会不会带点心？她应该也会饿吧？'] },
      R: { proud: ['无礼之徒，来了我亲手料理。', '别慌。有我在。'], cold: ['确认。我守左边。', '不要出声，听脚步。'], gentle: ['希望她只是路过……', '要是能不打就好了。'], timid: ['别、别说了，我腿都软了……', '我们、我们要不要躲起来……'], fierce: ['哈哈，那就先下手为强！', '来一个砍一个！'], sharp: ['你倒是比她更让我烦。', '吓唬谁呢。'], sly: ['嘘，小声点，有人在听。', '分我一半，我就配合你。'], cheerful: ['好刺激！我们去找她玩吧！', '她要是来了，我请她吃东西！'] }, rev: 'trait'
    },
    dream: {
      O: { proud: ['我总有一天要{goal}——这是我配得上的。', '{goal}。这世上只有我做得到。'], cold: ['我只有一件事要做：{goal}。其他的不重要。', '目标很简单：{goal}。'], gentle: ['其实……我一直想{goal}。你不会笑我吧？', '我最大的心愿，是{goal}。'], timid: ['我、我有时候会想……要是能{goal}就好了……', '说出来你别笑我……我想{goal}。'], fierce: ['我发过誓，一定要{goal}！谁拦我我砍谁！', '{goal}——等着瞧！'], sharp: ['我想{goal}。对，没错，很俗很天真，你笑吧。', '{goal}。别用那种眼神看我。'], sly: ['告诉你个秘密：我想{goal}，谁也不知道。', '表面上我在{act}，其实心里惦记的是——{goal}。'], cheerful: ['我啊，我想{goal}！一定会成功的！', '我的愿望是{goal}！你呢你呢？'] },
      R: { proud: ['不自量力……不过，倒也有几分志气。', '你的愿望太小了。'], cold: ['可行性很低。但我不阻止。', '祝你成功。别指望我帮忙。'], gentle: ['我相信你做得到，我会在心里为你祈祷。', '谢谢你愿意告诉我。'], timid: ['好、好厉害……我就不敢想那么大……', '你一定可以的，我、我会帮你看着后面！'], fierce: ['好！有种！算我一个！', '那就别废话，现在就去做！'], sharp: ['行吧，比我的愿望体面一点。', '你要是失败我第一个嘲笑你，成功我第二个祝贺你。'], sly: ['嘿嘿，我帮你，不过有报酬的。', '好主意……我也有个类似的，下次告诉你。'], cheerful: ['哇！我支持你！', '好棒好棒，我们一起加油！'] }, rev: 'goal'
    },
    belief: {
      O: { proud: ['我只信{belief}——其余的，不过是凡人的迷信。', '{belief}会庇佑我这样的人。'], cold: ['{belief}。我没有别的可说。', '信不信随你，我的信仰是{belief}。'], gentle: ['我每天都向{belief}祈祷，为大家，也为自己。', '有{belief}陪着，我就不怕了。'], timid: ['我、我每晚都向{belief}祈祷……希望今天也没事……', '{belief}会保佑我们的吧？对吧？'], fierce: ['我信{belief}——不过最信的还是手里的家伙！', '{belief}给我力量，我替它砍人。'], sharp: ['你们那套我听腻了。不过我倒没别的可信，{belief}凑合吧。', '{belief}？呵，神要是真灵，我们现在就不在这儿站着了。'], sly: ['我对外说信{belief}，嘘，其实……看情况。', '信{belief}有好处，所以我信。'], cheerful: ['我信{belief}！因为它会给我好运的！', '{belief}一定喜欢我，因为我每天都很乖！'] },
      R: { proud: ['愚昧。不过别让我的话动摇你。', '你的神，配得上你吗？'], cold: ['信仰不影响刀的走向。', '我不评价。'], gentle: ['愿你的神也庇佑我们。', '你的信仰让我很安心。'], timid: ['我、我也想信点什么……可是不知道该信谁。', '要是神真的在听就好了……'], fierce: ['哈！管他神不神，先打赢再说！', '拜什么都行，别在战场上发呆！'], sharp: ['信仰是胆小鬼的盔甲。我说的是好话。', '你倒是坚定。'], sly: ['信仰可以换饭吃吗？我就问问。', '嗯嗯，很虔诚……真的。'], cheerful: ['好耶！我们都有神保佑！', '我也要向它许愿！'] }, rev: 'belief'
    },
    rank: { // A = 阶位更高者
      O: { proud: ['身为「{rank}」，我吩咐的事，你最好一次做对，「{brank}」。', '你才是「{brank}」吧？在我面前，站直。'], cold: ['「{brank}」，按我的安排：你守外围，我守中间。', '报告你的位置。别让我问第二遍。'], gentle: ['「{brank}」，别太勉强自己，有我这个「{rank}」在呢。', '你已经很努力了，我这个「{rank}」都看在眼里。'], timid: ['那、那个……虽然我是「{rank}」……但还是你来拿主意吧……', '我、我不太会命令人……「{brank}」，你先来……'], fierce: ['「{brank}」！跟紧了，让你看看「{rank}」是怎么打仗的！', '别给我丢脸，我可是「{rank}」！'], sharp: ['「{brank}」，你的站位烂透了，我这个「{rank}」看不下去了。', '要我一个「{rank}」教你怎么站岗，真是荣幸。'], sly: ['「{brank}」，有件事，只有「{rank}」才能托付给你……别声张。', '跟着我，我这个「{rank}」不会亏待你的。'], cheerful: ['「{brank}」，今天我们一起加油！我可是「{rank}」哦！', '来来来，我这个「{rank}」请你吃东西！'] },
      R: { proud: ['……遵命。但这只是因为你确实比我高几阶。', '有朝一日，我会超过你。'], cold: ['明白。', '收到。'], gentle: ['谢谢您，我会努力的。', '有您在，我很安心。'], timid: ['是、是！我、我会尽力……', '请、请不要对我太凶……'], fierce: ['是！看我的！', '交给我，保证打得漂亮！'], sharp: ['是是，「{rank}」大人。', '您说得都对，您说得都对。'], sly: ['是，当然，我自有打算。', '好的——您放心，我什么都没听见。'], cheerful: ['好的好的！我们一起努力！', '好耶，有人请客！'] }, rev: 'rank'
    },
    craft: { // 同一大系
      O: { proud: ['「{sub}」这条路，我走得比你久，也比你远。', '同是{sys}系，别拿你的路数跟我比。'], cold: ['{sys}系的人，该做的只有一件事：精进。', '「{sub}」之道，讲究的是稳。'], gentle: ['同样走{sys}系的路，你我也算有缘呢。', '我很喜欢「{sub}」，它教会我好多。'], timid: ['我、我是走「{sub}」的……可是总觉得自己不够格……', '听说「{rank}」以后要熬很多年……我能熬到吗……'], fierce: ['「{sub}」之路？就是一路打上去！', '我离下一阶只差一场硬仗！'], sharp: ['都是{sys}系的，你那套花架子我看得出来。', '「{sub}」，说好听是传承，说难听是内卷。'], sly: ['其实「{sub}」有条捷径，只告诉你一个人。', '晋升的事，不全靠本事，你懂的。'], cheerful: ['我们都是{sys}系的呀！好有缘！', '今天我又学会了一招「{sub}」的新把戏！'] },
      R: { proud: ['哼，你也配谈传承。', '路数不同，但我承认你不差。'], cold: ['嗯。各走各的。', '有空切磋。'], gentle: ['以后多多指教。', '能遇到你真好。'], timid: ['请、请多关照……', '我会努力跟上的……'], fierce: ['好！打一场就知道谁更强！', '下次切磋，我不会手软！'], sharp: ['你倒是看得清楚。', '那你说说，捷径在哪？'], sly: ['哦？捷径——说来听听。', '嘘，先别让别人知道。'], cheerful: ['好呀好呀，我们交换招式吧！', '哇，你好厉害！'] }, rev: 'rank'
    },
    habit: { // A 取笑/观察 B 的小习惯
      O: { proud: ['{b}，你又{bq}，真是不成体统。', '{b}那个{bq}的毛病，什么时候能改？'], cold: ['你又{bq}了。浪费时间。', '{b}，{bq}对任务没有帮助。'], gentle: ['{b}，你{bq}的样子真可爱呢。', '我已经习惯你{bq}了，看到还挺安心。'], timid: ['{b}、{b}，你又{bq}了……被发现就糟糕了……', '你、你{bq}的时候……别人会看过来的……'], fierce: ['哈！{b}，你又{bq}！真有你的！', '别{bq}了，专心点！'], sharp: ['{b}，你{bq}的样子，我都看腻了。', '啧，又{bq}。真是丢人。'], sly: ['{b}，你{bq}的时候，我都看见了哦。', '你以为没人知道你爱{bq}？'], cheerful: ['哈哈，{b}又{bq}啦！', '{b}，教我{bq}好不好？'] },
      R: { proud: ['这是我的个人风格。', '与你无关。'], cold: ['习惯。改不掉。', '……随你怎么想。'], gentle: ['被你看见了呢，有点害羞。', '谢谢你没有嫌弃我。'], timid: ['对、对不起……我会注意的……', '我、我不是故意的……'], fierce: ['哈！我就这样，怎么了！', '来比比谁更厉害！'], sharp: ['我乐意，你管得着？', '你也不遑多让。'], sly: ['嘘，这可是我的小秘密。', '知道就好，别说出去。'], cheerful: ['嘿嘿，被发现了！', '你也来试试嘛！'] }, rev: 'bio'
    }
  };
  const MONO = { // 一个人时的自言自语：{act} / {goal} / {fear}
    proud: ['……这种地方，也配让我停留？', '{goal}。只有我配得上。'], cold: ['……安静。太安静了。', '刚才{act}……一切如常。'], gentle: ['今天也要平平安安的……', '我怕{fear}，可我还是会{goal}。'],
    timid: ['有、有人吗……没人吧……', '我最怕{fear}了……可别出现……'], fierce: ['怎么还没人来？手都痒了！', '{goal}——我一定会做到！'], sharp: ['无聊透顶。连个说话的人都没有。', '又是这种日子。真是让人失望。'],
    sly: ['嘿嘿，周围没人……正好数数我攒了多少。', '{goal}……要是有捷径就好了。'], cheerful: ['啦啦啦～今天天气真好～', '好饿……有没有吃的呀……']
  };
  const fill = (s, X) => s.replace(/\{(\w+)\}/g, (m, k) => X[k] != null ? X[k] : '');
  function ctxOf(a, b, node) {
    const Ia = (window.Lore && Lore.ID[a.id]) || {}, ra = window.Ranks ? Ranks.of(a) : null, rb = b && window.Ranks ? Ranks.of(b) : null, bb = b && bio(b);
    return { a: sh(a), b: b ? sh(b) : '', act: rp(Ia.act || ['发呆']), goal: a.goal || '活下去', belief: a.belief || '运气', fear: bio(a).fear, rank: ra ? ra.name : '无名氏', brank: rb ? rb.name : '无名氏', sub: ra ? ra.B.n : '', sys: ra ? ra.S.n : '', bq: bb ? bb.quirk : '发呆', loc: node && node.name || '这里' };
  }
  const RK = c => window.Ranks ? Ranks.of(c) : { tier: 1, sys: 'x' };
  const relation = (a, b) => {
    const ra = window.Ranks ? Ranks.of(a) : null, rb = window.Ranks ? Ranks.of(b) : null; if (!ra || !rb) return '偶遇';
    if (a.id === b.id) return '同行'; if (Math.abs(ra.tier - rb.tier) >= 2) return '上下阶'; if (ra.sys === rb.sys) return '同系'; return '偶遇';
  };
  // 组织一段对话：返回 { who:[c...], lines:[{i, t, topic}], facts:[文本], rel }
  function compose(cs, node) {
    cs = cs.slice(0, 3); const lines = [], facts = [], tag = (c, k, txt) => { if (c.kn && !c.kn[k]) { c.kn[k] = 1; facts.push(txt); } };
    if (cs.length === 1) {
      const c = cs[0], a = arche(c), X = ctxOf(c, null, node), pool = MONO[a];
      lines.push({ i: 0, t: fill(rp(pool), X) }); lines.push({ i: 0, t: fill(pool.find(s => s !== lines[0].t) || pool[0], X) });
      tag(c, 'trait', `${sh(c)}的性格`); return { who: cs, lines, facts, rel: '独处' };
    }
    let A = cs[0], B = cs[1]; const ra = RK(A), rb = RK(B), rel = relation(A, B);
    if (rel === '上下阶' && ra.tier < rb.tier) { const t = A; A = B; B = t; }
    const cand = ['work', 'you', 'dream', 'belief', 'habit']; if (rel === '上下阶') cand.push('rank', 'rank'); if (rel === '同系' || rel === '同行') cand.push('craft', 'craft');
    const topics = []; while (topics.length < 2 && cand.length) { const k = cand.splice(Math.floor(Math.random() * cand.length), 1)[0]; if (!topics.includes(k)) topics.push(k); }
    topics.forEach((k, n) => {
      const a = n % 2 ? B : A, b = n % 2 ? A : B, ia = cs.indexOf(a), ib = cs.indexOf(b), TT = T[k], X = ctxOf(a, b, node);
      const o = rp(TT.O[arche(a)]), r = rp(TT.R[arche(b)]); lines.push({ i: ia, t: fill(o, X), topic: k }); lines.push({ i: ib, t: fill(r, X), topic: k });
      if (k === 'work') tag(a, 'race', `${sh(a)}的身份`); if (k === 'you') tag(a, 'trait', `${sh(a)}的性格`); if (k === 'dream') tag(a, 'goal', `${sh(a)}生前的目的`);
      if (k === 'belief') tag(a, 'belief', `${sh(a)}的信仰`); if (k === 'rank' || k === 'craft') { tag(a, 'rank', `${sh(a)}的阶位传承`); } if (k === 'habit') tag(b, 'bio', `${sh(b)}的小习惯与秘密`);
    });
    if (cs[2]) { const C = cs[2], X = ctxOf(C, A, node), k = arche(C), third = { proud: '你们吵得我头疼。', cold: '……安静点。', gentle: '大家别吵，慢慢说。', timid: '你们、你们小声点啊……', fierce: '吵什么，想打就直说！', sharp: '我在旁边听了半天，你们都很无聊。', sly: '有趣，你们继续，我只是路过。', cheerful: '我也要加入！说什么呢说什么呢？' }[k]; lines.push({ i: 2, t: third }); }
    return { who: cs, lines, facts, rel };
  }

  // ---------- 弹框 UI（不冻结、自动消失）----------
  let el = null, timers = [], hist = [];
  const CSS = '#ohear{position:fixed;left:50%;bottom:17vh;width:min(780px,88vw);z-index:66;pointer-events:none;opacity:0;transform:translate(-50%,24px) scale(.96);transition:opacity .45s,transform .45s cubic-bezier(.2,.9,.25,1.2);font-family:"Noto Serif SC","Songti SC",serif;color:#f3e8d2}#ohear.on{opacity:1;transform:translate(-50%,0) scale(1)}'
    + '#ohear .oh-box{background:linear-gradient(160deg,#241710f5,#0c0807f5);border:2px solid #e0ad5a;border-radius:14px;box-shadow:0 0 0 1px #000,0 14px 60px #000c,0 0 40px #e0ad5a30;padding:14px 20px 16px;position:relative}'
    + '#ohear .oh-box::before{content:"";position:absolute;left:50%;bottom:-11px;width:20px;height:20px;background:#0c0807;border-right:2px solid #e0ad5a;border-bottom:2px solid #e0ad5a;transform:translateX(-50%) rotate(45deg)}'
    + '#ohear .oh-h{display:flex;justify-content:space-between;align-items:baseline;font-size:19px;font-weight:700;color:#ffd890;letter-spacing:3px;border-bottom:1px solid #ffffff22;padding-bottom:8px;margin-bottom:10px;text-shadow:0 2px 8px #000}#ohear .oh-h small{opacity:.75;font-size:14px;font-weight:400;letter-spacing:1px}'
    + '#ohear .oh-who{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px}#ohear .oh-w{flex:1 1 180px;padding:7px 12px;border-left:5px solid var(--c);background:#00000070;border-radius:6px;font-size:14px;line-height:1.55;animation:ohpop .5s cubic-bezier(.2,1.4,.3,1) backwards}#ohear .oh-w:nth-child(2){animation-delay:.12s}#ohear .oh-w:nth-child(3){animation-delay:.24s}#ohear .oh-w b{color:var(--c);font-size:18px;text-shadow:0 0 10px var(--c)}#ohear .oh-w i{font-style:normal;opacity:.8;display:block;font-size:13px}@keyframes ohpop{from{transform:scale(.6) translateY(10px);opacity:0}}'
    + '#ohear .oh-l{max-height:min(34vh,300px);overflow:hidden;display:flex;flex-direction:column;gap:9px}#ohear .oh-ln{font-size:clamp(17px,1.5vw,21px);line-height:1.6;opacity:0;animation:ohin .4s forwards;padding:2px 0}#ohear .oh-ln b{color:var(--c);margin-right:10px;font-size:.92em;text-shadow:0 0 8px var(--c)}@keyframes ohin{from{transform:translateY(8px)}to{opacity:1;transform:none}}'
    + '#ohear .oh-f{margin-top:10px;font-size:14px;color:#ffd27a;opacity:0;transition:opacity .5s}#ohear .oh-f.on{opacity:1}';
  function build() {
    if (el) return; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
    el = document.createElement('div'); el.id = 'ohear'; el.innerHTML = '<div class="oh-box"><div class="oh-h"><span>🎧 偷听</span><small></small></div><div class="oh-who"></div><div class="oh-l"></div><div class="oh-f"></div></div>'; document.body.appendChild(el);
  }
  const clear = () => { timers.forEach(clearTimeout); timers = []; if (el) el.classList.remove('on'); };
  function show(conv, node, ctx) {
    build(); clear(); const q = s => el.querySelector(s), cs = conv.who;
    q('.oh-h small').textContent = `「${node.name}」 · ${conv.rel}`;
    q('.oh-who').innerHTML = cs.map(c => { const r = window.Ranks ? Ranks.of(c) : null, b = bio(c); return `<div class="oh-w" style="--c:${RCOL[c.rar]}"><b>${esc(c.name)}</b> <small>【${RN[c.rar]}】</small><i>${r ? esc(r.S.ic + ' ' + r.S.n + '·' + r.B.n + ' ' + r.tn + '「' + r.name + '」') : ''}</i><i>口头禅：「${esc(b.catch)}」</i></div>`; }).join('');
    q('.oh-l').innerHTML = ''; q('.oh-f').className = 'oh-f'; q('.oh-f').textContent = '';
    requestAnimationFrame(() => el.classList.add('on'));
    let t = 900; conv.lines.forEach((ln, n) => {
      timers.push(setTimeout(() => { const c = cs[ln.i], d = document.createElement('div'); d.className = 'oh-ln'; d.style.setProperty('--c', RCOL[c.rar]); d.innerHTML = `<b>${esc(sh(c))}</b>「${esc(ln.t)}」`; q('.oh-l').appendChild(d); if (window.SFX && SFX.play) try { SFX.play('click', 0.12, 1.4 + ln.i * 0.25); } catch (e) { } }, t));
      t += 1500 + ln.t.length * 70;
    });
    if (conv.facts.length) timers.push(setTimeout(() => { const f = q('.oh-f'); f.textContent = '📝 你从她们的话里听出了：' + conv.facts.join('、'); f.classList.add('on'); }, t));
    t += 3800; timers.push(setTimeout(() => clear(), t));
    if (ctx && ctx.log) ctx.log(`🎧 你在「${node.name}」偷听到：` + conv.lines.map(l => sh(cs[l.i]) + '：「' + l.t + '」').join(' ') + (conv.facts.length ? `（听出了${conv.facts.join('、')}）` : ''));
    hist.push({ node: node.name, who: cs.map(c => c.name), lines: conv.lines.map(l => [sh(cs[l.i]), l.t]), facts: conv.facts }); if (hist.length > 30) hist.shift();
  }
  // 进入地点（worlds.js goto 结束时调用）
  function enter(node, ctx) {
    if (!on() || !node || node._heard) return; const cs = (node.prey || []).map(h => h && h.c).filter(Boolean); if (!cs.length) return; node._heard = 1;
    setTimeout(() => { try { show(compose(cs, node), node, ctx); } catch (e) { console.warn('Overhear', e); } }, 1600);
  }
  window.Overhear = { enter, compose, bio, bioHTML, hist: () => hist, clear, AN, arche, T, MONO };
})();
