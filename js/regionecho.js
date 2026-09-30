// R39 MOD region_echo（默认开）：地区回响 —— 名声 / 势力关系 / 你杀掉的人的后续故事 / 抵达时的随机反馈（资源·麻烦）
// 用户：“探索UI你加入更多文本：地区对你的反馈、你的名声、你杀的角色的后继故事（造成影响-关系）。反馈！而且反馈还会随机+资源之类的。”
// 数据（随存档）：G.S.echo = { v:1, reg:{ [地区k]: { fame, fear, rel:{folk,arms,faith,arcane,noble}, kills, heads, big, trips, grudges:[{who,of,lv}], legends, news:[...], recv } } }
// 流程：
//   ① 出猎中：包装 Recall.log，记录每个被你放倒的“有身份的人”（fo.h.c：名字/职业/稀有度/性格/心愿）。
//   ② 回洞（包装 api.finish）：settle() → 名声/恐惧/势力关系变化 + 至多 3 段“后继故事”（哀悼 / 复仇 / 恐惧 / 传说 / 纪念 / 遗产 / 继任），
//      每段带随机结果（魂晶 / 地区材料 / 药水 / 猎手仇恨 / 仇家），写进 S.echo、出猎日志，并在洞里弹 #reRet 卡片（非阻塞）。
//   ③ 下次抵达该地区：arrive(k) 按当前名声/恐惧/仇家/关系掷一个“地区的反应”（供品 / 警告 / 馈赠 / 信徒 / 沉默 / 无人认识），
//      随机给资源或加仇恨；显示在进入地点窗口（arrival2 的 paras + arrHTML）；没有 arrival2 时用 toast。
//   ④ 选地点界面（regionquest.detHTML）：detHTML(k) = 名声称号 + 5 个势力关系条 + 仇家 + 最近的后继故事；badge(k) 是地区按钮上的称号小章。
// 只读/旁路：不改战斗数值；奖励走 G.addCoins / Sack.stashAdd / S.items / S.h2.hate。MOD 关闭 = 所有钩子空转。
window.RegionEcho = (() => {
  'use strict';
  const on = () => { try { return !window.Mods || !Mods.on || Mods.on('region_echo') !== false; } catch (e) { return true; } };
  const G = () => window.G, LOC = k => (window.Lore ? Lore.LOCS.find(l => l.k === k) : null);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
  const wpick = (items, w) => { let s = 0; const ws = w.map(x => Math.max(0, x)); ws.forEach(x => s += x); if (s <= 0) return items[0]; let t = Math.random() * s; for (let i = 0; i < items.length; i++) { if ((t -= ws[i]) <= 0) return items[i]; } return items[items.length - 1]; };
  const RN = ['凡魂', '灵魂', '英魂', '圣魂', '神魂'];

  // ---------------- 势力 ----------------
  const FAC = { folk: ['🏘️', '百姓'], arms: ['⚔️', '武装'], faith: ['⛪', '圣职'], arcane: ['🔮', '术士'], noble: ['👑', '权贵'] };
  const RIPPLE = { folk: { faith: 0.4, arms: 0.3 }, arms: { noble: 0.4, folk: -0.15 }, faith: { folk: 0.4, arcane: -0.35 }, arcane: { faith: -0.45, folk: 0.1 }, noble: { arms: 0.5, folk: -0.1 } }; // 正数=一起难过/愤怒（关系下降）；负数=拍手称快（关系上升）
  function facOf(c) {
    const n = (c && (c.idN || '')) + '';
    if (/公主|千金|女王|公爵|王女|酋长|夫人|贵族|王后|女神官长/.test(n) && !/伯爵夫人/.test(n)) return 'noble';
    if (/修|圣|祭司|审判|天使|唱诗|圣歌|使徒|神官|祷/.test(n)) return 'faith';
    if (/魔女|女巫|药剂|诅咒|法师|术|萨满|德鲁伊|巫女|伯爵夫人|魅魔|堕|深渊|影|龙女/.test(n)) return 'arcane';
    if (/骑士|将军|卫|猎|弩|佣兵|刺客|战士|弓|工程|屠龙|医师|盗贼|游侠/.test(n)) return 'arms';
    return 'folk';
  }
  const KIN = {
    folk: ['母亲', '妹妹', '邻家的孩子', '未婚夫', '老邻居', '姑母'], arms: ['老部下', '师父', '副手', '同队的姐妹', '战友'],
    faith: ['同院的姐妹', '老修女', '收养的孤儿', '告解神父'], arcane: ['学徒', '师姐', '同门', '老主顾'], noble: ['侍女', '老管家', '族中长辈', '家庭教师']
  };
  const SPOT = {
    village: ['村口', '磨坊边', '水井旁'], forest: ['树城下', '月桂树下', '溪水边'], wilds: ['营火旁', '图腾柱下', '帐篷群里'], abbey: ['回廊里', '钟楼下', '祈祷室外'],
    swamp: ['木栈道上', '沼边小屋前', '大锅旁'], fortress: ['城墙上', '校场边', '哨塔下'], capital: ['广场上', '宫门外', '贵族街上'], abyss: ['骨桥边', '裂隙岸上', '焦岩之间'], peak: ['云阶上', '神殿前', '龙脊道上']
  };

  // ---------------- 状态 ----------------
  function SS() { const S = G().S; if (!S.echo || typeof S.echo !== 'object') S.echo = { v: 1, reg: {} }; S.echo.reg = S.echo.reg || {}; return S.echo; }
  function R(k) { const e = SS(); return e.reg[k] || (e.reg[k] = { fame: 0, fear: 0, rel: { folk: 0, arms: 0, faith: 0, arcane: 0, noble: 0 }, kills: 0, heads: 0, big: 0, trips: 0, grudges: [], legends: 0, news: [], recv: null }); }
  const clampR = v => Math.max(-100, Math.min(100, Math.round(v * 10) / 10));
  const TIERS = [[0, '无名之辈', '🫥'], [1, '只是传闻', '🌫️'], [6, '乡野恶名', '🩸'], [16, '凶名远扬', '🐺'], [36, '孩子们的噩梦', '🌑'], [70, '活着的灾厄', '☠️'], [130, '传说本身', '🔥']];
  const tierOf = f => { let t = TIERS[0]; for (const x of TIERS) if (f >= x[0]) t = x; return t; };
  const BLURB = {
    0: ['{p}还没人听说过你。他们看你的眼神里只有困惑——还没来得及害怕。', '对{p}来说，你只是一个路过的影子。这很快会变。'],
    1: ['{p}有人在酒馆里压低声音议论“那个很高的东西”。大多数人当笑话听。', '{p}的孩子们开始玩一种新游戏：扮演食人魔，被扮演英雄的那个打败。'],
    2: ['{p}的老人们开始在门槛上挂骨头。你的名字被用来吓唬不肯睡觉的孩子。', '{p}已经有人为你画了像——很丑，但獠牙画得很准。'],
    3: ['{p}的商队绕路了。你的名字出现在了告示板上，旁边是一个还没填数字的悬赏。', '{p}的人见到高个子的影子就关窗。连最勇敢的猎户也开始结伴出门。'],
    4: ['{p}的母亲们用你的名字哄孩子，孩子们却不再哭——他们知道那是真的。', '{p}的路口摆着供品。没有人承认是自己放的，也没有人敢拿走。'],
    5: ['{p}的人已经不再谈论你，就像不谈论天气。你是这片土地的一部分了——像瘟疫，像洪水。', '{p}有人说，你不是在猎杀他们，是在收税。没有人笑。'],
    6: ['{p}的史官把你写进了编年史的“灾异”一章，然后停笔很久——不知道该怎么给你的事迹收尾。', '{p}的一切都绕着你的名字转。连敌人都得先想想：你会怎么看这件事。']
  };
  const relName = v => v <= -60 ? '不共戴天' : v <= -30 ? '仇视' : v <= -10 ? '戒备' : v < 10 ? '陌生' : v < 30 ? '另眼相看' : v < 60 ? '默许' : '俯首';

  // ---------------- 后继故事 ----------------
  const ST = {
    grief: { i: '🕯️', n: '哀悼', t: [
      '{K}抱着{n}留下的{wpn}在{spot}坐了一整夜，没有人敢去劝。', '{place}为{n}办了一场没有遗体的葬礼。{K}在空棺里放进了她最爱的东西，然后把门关上，很久没有打开。',
      '{n}的名字被刻上了{spot}的悼念墙。墙已经有点挤了。', '有人说，在{n}倒下的地方，夜里能听见{role}的脚步声。{K}每晚都去那里点一盏灯。'] },
    vengeance: { i: '🗡️', n: '复仇', t: [
      '{K}把{n}生前用的{wpn}磨得雪亮，当着{spot}所有人的面发誓：总有一天，要带着你的名字回来。', '{spot}的告示板上多了一张悬赏，画得很差，但獠牙画得很准。落款是{K}。',
      '{K}抛下了手里的活计，开始四处打听食人魔洞窟的方向。她说：“我只需要知道方向。”', '有人在{n}倒下的地方留了一束干枯的花，和一行刻痕：‘记住我们。’——刻得很深。'] },
    fear: { i: '😨', n: '恐惧', t: [
      '{place}的人再也不敢在天黑后出门。{K}说，{n}倒下的那晚，连狗都没叫。', '{spot}的路口多了一块石头，上面放着面包、麦酒和一只旧鞋——是给“那个很高的影子”的。没人承认是自己放的。',
      '{K}把{n}的事告诉了每一个路过的人，声音一直在抖。于是你的名字传得比商队还快。', '窗板一扇接一扇地钉死了。{n}的事让{place}学会了一件事：别抬头。'] },
    legend: { i: '📯', n: '传说', t: [
      '吟游诗人们已经在编关于{n}之死的歌了。最新的一段里，你有三只眼睛。', '有几个年轻人偷偷把你的轮廓画在{spot}的墙上，被{K}撕掉，第二天又有人画上去。',
      '{place}冒出了一个小小的教派，叫你“收头的神”。他们也给{n}的名字留了位置——作为祭品。'] },
    memorial: { i: '🪦', n: '纪念', t: [
      '{place}的人在{n}倒下的地方立了一块石碑，刻着“{role}{n}”，和一句{belief}式的祈祷。', '{K}把{n}的{wpn}供进了神龛。路过的人都会摸一下，再缩回手。',
      '{spot}多了一盏长明灯，是为{n}点的。灯油总是在你来过的那几夜烧得特别快。'] },
    hidden: { i: '🗝️', n: '遗产', t: [
      '{n}死后，人们在她屋子的地板下发现一只空箱，和一张被撕掉一半的地图。有人说另一半在你这里。', '{K}整理遗物时，在{wpn}的握柄里发现了一小包魂晶粉。她没声张，只是悄悄放在了通往洞窟的小路上。',
      '据说{n}生前藏了一样东西。{K}翻遍了整座{place}都没找到——却有人看见一只乌鸦叼着什么，飞向了山洞的方向。'] },
    successor: { i: '🌱', n: '继任', t: [
      '{place}很快有人接过了{n}的活计。新来的{role}年纪更小，眼神更冷，据说她从小就听着“食人魔”的故事长大。', '{K}顶替了{n}的位置。她对任何人都说：“我不恨。我只是在等。”',
      '{n}留下的缺口很快被补上了——这让你明白，{place}从来不缺下一个{role}。'] }
  };
  const GOAL_LN = ['她生前一直想「{goal}」——这个心愿和她一起留在了{spot}。', '「{goal}」，这是{n}没来得及做的事。有人说，{K}打算替她做完。', '{n}常对人说起「{goal}」。现在没人再提了，也没人敢忘。'];
  // 各立场的结果表：[魂晶, 材料, 药水, 无]；vengeance 另有“仇恨”；其余见 fxOf
  const FXW = { grief: [0.4, 0.15, 0.05, 0.4], vengeance: [0.1, 0.05, 0.1, 0.75], fear: [0.5, 0.3, 0.05, 0.15], legend: [0.3, 0.2, 0.3, 0.2], memorial: [0.2, 0.15, 0.3, 0.35], hidden: [0.65, 0.25, 0.05, 0.05], successor: [0.15, 0.1, 0.05, 0.7] };
  function stanceOf(c) {
    const tr = c.traits || [], has = (...a) => a.some(x => tr.includes(x));
    const w = { grief: 1.2, vengeance: 1, fear: 0.9, legend: 0.5, memorial: 0.7, hidden: 0.3, successor: 0.8 };
    if (has('温柔', '开朗', '慈悲', '忠诚', '天真')) { w.grief += 1.2; w.memorial += 0.8; }
    if (has('暴躁', '固执', '勇敢', '忠诚', '高傲')) w.vengeance += 1.2;
    if (has('胆小', '优柔寡断', '多疑')) w.fear += 1;
    if (has('浪漫', '野心勃勃', '好奇', '开朗')) w.legend += 1.1;
    if (has('贪婪', '狡黠', '孤僻', '多疑')) w.hidden += 1.4;
    if (has('孤僻', '冷酷', '懒散')) { w.grief -= 0.7; w.successor += 0.8; }
    if ((c.rar || 0) >= 3) { w.legend += 1; w.memorial += 1; w.vengeance += 0.6; }
    if ((c.rar || 0) === 0) { w.successor += 0.6; w.fear += 0.3; }
    if (/虔诚/.test(tr.join())) w.memorial += 0.8;
    const ks = Object.keys(w); return wpick(ks, ks.map(k => w[k]));
  }
  function matFor(k) { const Rg = window.RegEcon && RegEcon.BY && RegEcon.BY[k]; return Rg ? Rg.c : null; }
  function addMat(k, n) { const m = matFor(k); if (!m || !(window.Sack && Sack.stashAdd && Sack.mk)) return null; try { Sack.stashAdd(Sack.mk(m[0], n)); return `${m[2]} ${m[1]}×${n}`; } catch (e) { return null; } }
  // 应用一次“结果”，返回 [{tag, cls}] 供显示
  function applyFx(fx, k) {
    const g = G(), S = g.S, out = [];
    if (fx.coin) { try { g.addCoins(fx.coin); out.push(`🔮 魂晶 +${fx.coin}`); } catch (e) { } }
    if (fx.mat) { const t = addMat(k, fx.mat); if (t) out.push(`🎒 ${t}`); else if (!fx.coin) { const c = Math.round((LOC(k) || { rec: 50 }).rec * 0.4); try { g.addCoins(c); out.push(`🔮 魂晶 +${c}`); } catch (e) { } } }
    if (fx.potion) { S.items = S.items || {}; if (window.Sack && Sack.stashAdd && Sack.mk) { try { Sack.stashAdd(Sack.mk('potion', fx.potion)); out.push(`🧪 药水 ×${fx.potion}`); } catch (e) { S.items.potion = (S.items.potion || 0) + fx.potion; out.push(`🧪 药水 ×${fx.potion}`); } } else { S.items.potion = (S.items.potion || 0) + fx.potion; out.push(`🧪 药水 ×${fx.potion}`); } }
    if (fx.hate && S.h2 && typeof S.h2.hate === 'number') { S.h2.hate += fx.hate; out.push(`🏹 猎手仇恨 +${fx.hate}`); }
    return out;
  }
  function rollFx(st, k, c) {
    const L = LOC(k) || { rec: 60 }, rar = c ? c.rar || 0 : 0, w = FXW[st] || FXW.grief, kind = wpick(['coin', 'mat', 'potion', 'none'], w), fx = {};
    const base = Math.max(12, L.rec * (0.22 + rar * 0.12));
    if (kind === 'coin') fx.coin = Math.round(base * (st === 'hidden' ? rnd(1.4, 2.4) : rnd(0.7, 1.3)));
    else if (kind === 'mat') fx.mat = Math.max(1, Math.round(rnd(1, 2.6) + rar * 0.6));
    else if (kind === 'potion') fx.potion = 1;
    if (st === 'vengeance') fx.hate = Math.max(1, Math.round(0.6 + rar * 0.6 + rnd(0, 0.8)));
    if (st === 'successor' && Math.random() < 0.35) fx.hate = 1;
    return fx;
  }
  function story(c, k, st) {
    const L = LOC(k) || { n: '这里' }, fac = facOf(c), kin = pick(KIN[fac] || KIN.folk), spot = pick(SPOT[k] || ['这里']), idd = window.Lore && Lore.ID[c.id] || {};
    const short = (c.name || '').split('·')[0] || c.name; let first = true;
    const nm = () => { if (first) { first = false; return c.name; } return short; };
    const f = s => s.replace(/\{K\}|\{n\}/g, m => m === '{K}' ? `${nm()}的${kin}` : nm()).replace(/\{role\}/g, c.idN || '无名者').replace(/\{wpn\}/g, idd.wpn || '遗物').replace(/\{place\}/g, L.n)
      .replace(/\{spot\}/g, spot).replace(/\{belief\}/g, (c.belief || '旧神').replace(/——.*$/, '')).replace(/\{goal\}/g, c.goal || '活下去');
    let txt = f(pick(ST[st].t)); if (c.goal && Math.random() < 0.55) txt += f(pick(GOAL_LN));
    return { txt, kin: `${short}的${kin}`, fac };
  }

  // ---------------- 出猎中：记录放倒的人 ----------------
  let T = null, hooked = false;
  function cap(fo, t) {
    if (!T || t !== 'kill' || !fo || fo.__ech || !fo.h || !fo.h.c || !fo.h.c.name || fo.hunter) return; fo.__ech = 1;
    const c = fo.h.c; T.kills.push({ c: { name: c.name, id: c.id, idN: c.idN, rar: c.rar || 0, traits: (c.traits || []).slice(), goal: c.goal, belief: c.belief, race: c.race, raceN: c.raceN }, boss: !!fo.boss, mini: !!(fo.rqMini || fo.mini), elite: !!fo.eliteId, decap: !!fo.decap });
  }
  function hook() {
    if (window.Recall && Recall.log && !Recall.log.__ech) { const f = Recall.log; Recall.log = function (fo, t, d) { try { if (on()) cap(fo, t); } catch (e) { } return f.apply(this, arguments); }; Recall.log.__ech = 1; }
    if (window.Worlds && !Worlds.__echo) {
      const s0 = Worlds.start;
      Worlds.start = function (trip, api) {
        try {
          if (on() && G() && G().S && trip && trip.loc) { T = { k: trip.loc.k, kills: [], trip }; R(trip.loc.k);
            if (api && api.finish && !api.finish.__ech) { const f0 = api.finish; api.finish = function () { try { settle(trip); } catch (e) { console.warn('RegionEcho settle', e); } return f0.apply(this, arguments); }; api.finish.__ech = 1; }
            setTimeout(() => { try { if (T && T.trip === trip && !(window.Arrival2 && Arrival2.on && Arrival2.on())) { const r = arrive(trip.loc.k); if (r && r.toast) G().toast(r.toast, '#ffd890', 5); } } catch (e) { } }, 2600);
          }
        } catch (e) { console.warn('RegionEcho start', e); }
        return s0.apply(this, arguments);
      };
      Worlds.__echo = 1;
    }
    hooked = !!(window.Recall && Recall.log && Recall.log.__ech && window.Worlds && Worlds.__echo);
  }

  // ---------------- 回洞结算 ----------------
  let lastRet = null;
  function settle(trip) {
    if (!T || T.trip !== trip) { T = null; return; }
    const k = T.k, ks = T.kills; T = null; const r = R(k), L = LOC(k) || { n: '这里', rec: 60 }; r.trips++;
    const heads = (trip.res && trip.res.heads ? trip.res.heads.length : 0); r.heads += heads;
    if (!ks.length) { lastRet = { k, none: true, heads }; showRet(); return; }
    const fame0 = r.fame, tier0 = tierOf(fame0), rel0 = Object.assign({}, r.rel);
    let dFame = 0, dFear = 0; r.kills += ks.length;
    for (const x of ks) { const rar = x.c.rar || 0; dFame += 1 + rar + (x.decap ? 1 : 0) + (x.boss ? 8 : 0) + (x.mini ? 4 : 0) + (x.elite ? 6 : 0); dFear += 1 + rar * 0.8 + (x.boss ? 6 : 0); if (rar >= 2) r.big++; }
    r.fame = Math.round(r.fame + dFame); r.fear = Math.round((r.fear + dFear) * 10) / 10;
    // 选至多 3 个“有后续”的人
    const sorted = ks.map(x => ({ x, s: (x.boss ? 100 : 0) + (x.mini ? 50 : 0) + (x.elite ? 40 : 0) + x.c.rar * 10 + Math.random() * 6 })).sort((a, b) => b.s - a.s).slice(0, Math.min(3, ks.length)).map(o => o.x);
    const stories = [], log = G().S.logs && trip.log ? trip.log : null;
    for (const x of sorted) {
      const c = x.c, st = x.boss ? pick(['legend', 'vengeance', 'memorial']) : stanceOf(c), sy = story(c, k, st), fx = rollFx(st, k, c), tags = applyFx(fx, k);
      // 关系：死者所属势力下降（按立场加权），波及势力上下浮动
      const wgt = { vengeance: 1.4, grief: 1, fear: 0.6, legend: 0.5, memorial: 0.8, hidden: 0.6, successor: 0.9 }[st], d = (2 + 2 * (c.rar || 0) + (x.boss ? 8 : 0)) * wgt;
      r.rel[sy.fac] = clampR(r.rel[sy.fac] - d); const rp = RIPPLE[sy.fac] || {}; for (const f in rp) r.rel[f] = clampR(r.rel[f] - d * rp[f] * 0.6);
      if (st === 'vengeance') { r.grudges.unshift({ who: sy.kin, of: c.name, lv: 1 + (c.rar || 0) }); r.grudges.length = Math.min(r.grudges.length, 6); }
      if (st === 'legend') r.legends++;
      if (st === 'memorial') r.rel.faith = clampR(r.rel.faith + 2);
      const dl = {}; for (const f in r.rel) { const v = Math.round((r.rel[f] - (rel0[f] || 0)) * 10) / 10; if (Math.abs(v) >= 0.5) dl[f] = v; }
      const ent = { id: Date.now() + '' + stories.length, st, n: c.name, role: c.idN, rar: c.rar || 0, fac: sy.fac, txt: sy.txt, tags, day: G().S.stats ? G().S.stats.trips : 0, boss: x.boss ? 1 : 0 };
      stories.push(ent); r.news.unshift(ent);
      if (log) log.push({ t: `🗞️ 回响·${L.n}：${sy.txt}${tags.length ? '（' + tags.join(' · ') + '）' : ''}`, cls: 'gethead' });
    }
    r.news.length = Math.min(r.news.length, 14);
    const tier1 = tierOf(r.fame), relD = {}; for (const f in r.rel) { const v = Math.round((r.rel[f] - (rel0[f] || 0)) * 10) / 10; if (Math.abs(v) >= 0.5) relD[f] = v; }
    if (log) log.push({ t: `📣 名声：${L.n} ${fame0} → ${r.fame}（${tier1[1]}）${Object.keys(relD).map(f => ` · ${FAC[f][1]}${relD[f] > 0 ? '+' : ''}${relD[f]}`).join('')}`, cls: 'gethead' });
    lastRet = { k, stories, fame0, fame1: r.fame, tier0, tier1, relD, n: ks.length, more: Math.max(0, ks.length - stories.length), heads };
    setTimeout(showRet, 1600); try { G().save && G().save(); } catch (e) { }
  }

  // ---------------- 抵达：地区的反应 ----------------
  const RECV = {
    offer: { i: '🎁', n: '供品', t: ['{spot}的路口摆着一小堆东西——麦酒、面包、一枚旧铜戒，压在一块石头下面。没有人在，但你能感觉到窗后有很多双眼睛。', '有人在你必经的路上留了包东西，用粗布裹着，还打了个歪歪扭扭的结。{place}的人希望你吃饱了就别再来了。', '石头上刻着一行字：“拿走，然后走”。旁边放着的东西，比你想象的要多。'] },
    threat: { i: '⚠️', n: '警告', t: ['一支箭钉在{spot}的木桩上，箭杆上缠着一条写着名字的布带：“{who}”。有人已经在等你了。', '{place}的狗今天叫得特别凶。你闻到了一股新磨过的刀味——有人把“{who}”的仇记在了你身上。', '路边多了几处新挖的陷坑，手法很生。那是复仇者才会有的笨拙和认真。'] },
    gift: { i: '🤝', n: '馈赠', t: ['一个裹着头巾的人站在{spot}，什么也没说，放下一个小包就退回了阴影里。她的手在发抖，但没有发抖到握不住东西。', '{place}里有人觉得你“做了一件别人不敢做的事”——虽然她们不会当面承认，但那包东西是给你的。', '{spot}的台阶上有一瓶药水，瓶塞上系着红线。看起来是某个不想被人看见的人放下的。'] },
    cult: { i: '📿', n: '信徒', t: ['你踏进{place}时，{spot}跪着三四个年轻人。他们不敢抬头，只把一个布袋高高举过头顶：“收头的神啊……请收下。”', '墙上有了新的涂鸦——你的轮廓，下面还画了一个小小的碗。碗里盛着魂晶。有人说，那是“供养”。', '一个陌生人跟了你一路，最后在{spot}放下一袋东西，低声说：“我们会把更多的人带来。”然后跑掉了。'] },
    quiet: { i: '🌫️', n: '沉默', t: ['今天的{place}异常安静。风把你的名字吹过{spot}，没有人回头。', '{spot}的人看了你一眼，又低下头去做自己的事——那种“装作没看见”的本事，你已经很熟悉了。', '没有供品，没有箭，没有人跟踪。{place}什么也没说——它在观察。'] },
    unknown: { i: '👤', n: '陌生', t: ['这里还没有人认识你。{spot}有个孩子好奇地看了你很久，直到母亲把他拽回屋里。', '{place}对你一无所知。这意味着你做的每一件事，都会成为它对你的第一印象。'] }
  };
  function arrive(k) {
    if (!on() || !G() || !G().S) return null;
    const S = G().S, r = R(k), key = (S.stats ? S.stats.trips : 0) + ':' + k;
    if (r.recv && r.recv.key === key) return r.recv;
    const L = LOC(k) || { n: '这里', rec: 60 }, spot = pick(SPOT[k] || ['这里']), tier = tierOf(r.fame), maxRel = Math.max(...Object.values(r.rel)), hasG = r.grudges.length;
    let kind;
    if (r.fame <= 0) kind = 'unknown';
    else kind = wpick(['offer', 'threat', 'gift', 'cult', 'quiet'], [0.2 + Math.min(0.7, r.fear / 25), hasG ? 0.3 + 0.15 * hasG : 0, maxRel > 10 ? 0.45 : 0.05, r.legends > 0 ? 0.25 + 0.1 * r.legends : 0, 0.3]);
    const g = hasG ? r.grudges[Math.floor(Math.random() * r.grudges.length)] : null;
    const txt = pick(RECV[kind].t).replace(/\{spot\}/g, spot).replace(/\{place\}/g, L.n).replace(/\{who\}/g, g ? g.who : '不知名的人');
    const fx = {}, base = Math.max(15, L.rec * 0.35 * (1 + tier[0] / 60));
    if (kind === 'offer') { if (Math.random() < 0.65) fx.coin = Math.round(base * rnd(0.7, 1.4)); else fx.mat = Math.round(rnd(1, 3)); }
    else if (kind === 'gift') { if (Math.random() < 0.5) fx.potion = 1; else fx.mat = Math.round(rnd(1, 3)); }
    else if (kind === 'cult') fx.coin = Math.round(base * rnd(0.9, 1.8));
    else if (kind === 'threat') { fx.hate = 1 + (Math.random() < 0.4 ? 1 : 0); if (g && Math.random() < 0.5) { g.lv = Math.max(0, g.lv - 1); if (g.lv <= 0) r.grudges.splice(r.grudges.indexOf(g), 1); } }
    const tags = applyFx(fx, k);
    const rec = { key, kind, i: RECV[kind].i, n: RECV[kind].n, txt, tags, tier: tier[1], toast: `${RECV[kind].i} <b>${esc(L.n)}的反应 · ${RECV[kind].n}</b><br><span style="font-size:.7em">${esc(txt)}${tags.length ? '<br>' + esc(tags.join(' · ')) : ''}</span>` };
    r.recv = rec; try { G().save && G().save(); } catch (e) { } return rec;
  }
  // 给 arrival2 用：额外的“抵达”段落 + 右栏回响小块
  function paras(k) {
    try { if (!on()) return []; const r = R(k), rec = arrive(k), L = LOC(k) || { n: '这里' }, t = tierOf(r.fame), bl = pick(BLURB[TIERS.indexOf(t)]).replace('{p}', L.n);
      return [['ec', `【${t[2]} ${t[1]}】${bl}`], ['ec', `${rec.i}【${rec.n}】${rec.txt}${rec.tags.length ? '　→ ' + rec.tags.join(' · ') : ''}`]]; } catch (e) { return []; }
  }
  function arrHTML(k) {
    try { if (!on()) return ''; const r = R(k), t = tierOf(r.fame), n = r.news[0];
      return `<h5 style="margin-top:16px">回 响</h5><div class="ar-th"><div>${t[2]} 名声 <b>${r.fame}</b> · <b>${t[1]}</b></div>${Object.keys(FAC).filter(f => Math.abs(r.rel[f]) >= 3).map(f => `<div>${FAC[f][0]} ${FAC[f][1]}：<b>${relName(r.rel[f])}</b> <small style="opacity:.6">${r.rel[f] > 0 ? '+' : ''}${Math.round(r.rel[f])}</small></div>`).join('')}${r.grudges.length ? `<div>🗡️ 仇家 ${r.grudges.length} 名：${esc(r.grudges.slice(0, 2).map(g => g.who).join('、'))}</div>` : ''}${n ? `<div style="opacity:.85">${ST[n.st].i} 最近：${esc(n.n)}之后…</div>` : ''}</div>`; } catch (e) { return ''; }
  }

  // ---------------- 选地点面板 ----------------
  function bars(r) {
    return Object.keys(FAC).map(f => { const v = r.rel[f] || 0, w = Math.min(50, Math.abs(v) / 2);
      return `<div class="re-b"><span class="re-bn">${FAC[f][0]} ${FAC[f][1]}</span><div class="re-bt"><i class="re-mid"></i><i class="re-f ${v < 0 ? 'neg' : 'pos'}" style="${v < 0 ? `right:50%;width:${w}%` : `left:50%;width:${w}%`}"></i></div><span class="re-bv ${v <= -30 ? 'bad' : v >= 30 ? 'ok' : ''}">${relName(v)}${Math.abs(v) >= 1 ? ` <small>${v > 0 ? '+' : ''}${Math.round(v)}</small>` : ''}</span></div>`; }).join('');
  }
  function newsHTML(r, n = 4) {
    if (!r.news.length) return '';
    return `<div class="re-news">${r.news.slice(0, n).map(e => `<div class="re-n"><b>${ST[e.st].i} ${esc(e.n)}<small>（${esc(e.role || '')}·${RN[e.rar] || ''}）之后 · ${ST[e.st].n}</small></b><p>${esc(e.txt)}</p>${e.tags && e.tags.length ? `<div class="re-fx">${e.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}</div>`).join('')}${r.news.length > n ? `<div class="re-more">……还有 ${r.news.length - n} 段更早的传闻</div>` : ''}</div>`;
  }
  function detHTML(k) {
    try {
      if (!on()) return ''; css(); const r = R(k), L = LOC(k) || { n: '这里' }, t = tierOf(r.fame), bl = pick(BLURB[TIERS.indexOf(t)]).replace('{p}', L.n);
      const first = r.trips === 0 && !r.news.length;
      return `<div class="rq-sec re-sec"><h4>🗞️ 地区回响 · 名声与关系</h4>
        <div class="re-top"><div class="re-tier"><span>${t[2]}</span><b>${t[1]}</b><small>名声 ${r.fame} · 恐惧 ${r.fear} · 来访 ${r.trips} 次 · 放倒 ${r.kills} 人</small></div><p class="re-bl">${esc(bl)}</p></div>
        <div class="re-bars">${bars(r)}</div>
        ${r.grudges.length ? `<div class="re-gr"><b>🗡️ 仇家</b>${r.grudges.map(g => `<span title="为 ${esc(g.of)} 复仇">${esc(g.who)} <small>Lv.${g.lv}</small></span>`).join('')}</div>` : ''}
        ${newsHTML(r)}
        <p class="re-hint">${first ? `${esc(L.n)}还不认识你。等你在这里留下一些故事——每趟出猎之后，这里会记住：<b>名声</b>、各方势力的<b>关系</b>、你放倒的人的<b>后继故事</b>（亲人的哀悼 / 复仇 / 恐惧 / 传说 / 遗产……）。下次抵达时，${esc(L.n)}会用<b>供品、警告、馈赠</b>或<b>沉默</b>回应你，并<b>随机</b>给你魂晶、材料、药水——或者一个新的仇家。` : `下次抵达 ${esc(L.n)} 时，这里的人会根据你的名声、恐惧、仇家和势力关系做出反应：可能是<b>供品</b>与<b>馈赠</b>（魂晶 / 材料 / 药水），也可能是<b>警告</b>与<b>复仇</b>（猎手仇恨上升）。`}</p></div>`;
    } catch (e) { return ''; }
  }
  function badge(k) { try { if (!on()) return ''; const r = R(k); if (r.fame <= 0) return ''; const t = tierOf(r.fame); return ` <span class="re-bdg" title="名声：${t[1]}（${r.fame}）">${t[2]}</span>`; } catch (e) { return ''; } }

  // ---------------- 回洞卡片 ----------------
  let card = null, cardT = 0;
  function showRet() {
    if (!on() || !lastRet) return; css(); const g = lastRet; lastRet = null; const L = LOC(g.k) || { n: '这里', icon: '' };
    if (!card) { card = document.createElement('div'); card.id = 'reRet'; document.body.appendChild(card); card.addEventListener('click', e => { if (e.target.closest('[data-x]')) card.classList.remove('on'); }); }
    if (g.none) card.innerHTML = `<div class="rt"><b>🗞️ ${esc(L.n)}</b><span data-x>✕</span></div><p class="r0">这趟你没有放倒任何人，${esc(L.n)}什么也没听说。${g.heads ? '' : '安静得像你从来没来过。'}</p>`;
    else card.innerHTML = `<div class="rt"><b>🗞️ 你在${esc(L.n)}留下的回响</b><span data-x>✕</span></div>
      <div class="r1"><span>${g.tier1[2]} ${g.tier1[1]}</span><em>名声 ${g.fame0} → <b>${g.fame1}</b></em>${g.tier1[1] !== g.tier0[1] ? '<i>称号提升！</i>' : ''}</div>
      ${Object.keys(g.relD).length ? `<div class="r2">${Object.keys(g.relD).map(f => `<span class="${g.relD[f] < 0 ? 'bad' : 'ok'}">${FAC[f][0]}${FAC[f][1]} ${g.relD[f] > 0 ? '+' : ''}${g.relD[f]}</span>`).join('')}</div>` : ''}
      ${g.stories.map(e => `<div class="r3"><b>${ST[e.st].i} ${esc(e.n)}（${esc(e.role || '')}）· ${ST[e.st].n}</b><p>${esc(e.txt)}</p>${e.tags.length ? `<div class="re-fx">${e.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}</div>`).join('')}
      ${g.more ? `<p class="r0">……另外还有 ${g.more} 个人倒在你手下，他们的故事正在${esc(L.n)}传开。</p>` : ''}
      <p class="r0">下次踏进${esc(L.n)}，这些都会有回应。（选地点界面的「地区回响」里能随时查看）</p>`;
    card.classList.add('on'); clearTimeout(cardT); cardT = setTimeout(() => card && card.classList.remove('on'), 26000);
  }

  function css() {
    if (document.getElementById('recss')) return; const s = document.createElement('style'); s.id = 'recss';
    s.textContent = `.re-sec{border:1px solid #5a3e28;border-radius:12px;background:rgba(0,0,0,.22);padding:10px 14px 12px}
.re-top{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap}.re-tier{min-width:170px}.re-tier span{font-size:26px;margin-right:6px}.re-tier b{font-size:19px;color:#ffe2a0}.re-tier small{display:block;font-size:11.5px;color:#a89070;margin-top:2px}
.re-bl{flex:1;min-width:200px;margin:2px 0;font-size:13.5px;line-height:1.7;color:#d9c7a6;font-style:italic}
.re-bars{margin:8px 0 6px;display:grid;grid-template-columns:1fr 1fr;gap:4px 18px}@media(max-width:900px){.re-bars{grid-template-columns:1fr}}
.re-b{display:flex;align-items:center;gap:8px;font-size:12.5px}.re-bn{width:64px;color:#cdb896;flex:none}.re-bt{flex:1;height:8px;border-radius:4px;background:#2a1b10;position:relative;overflow:hidden}
.re-mid{position:absolute;left:50%;top:0;bottom:0;width:1px;background:#6a4a2e}.re-f{position:absolute;top:0;bottom:0}.re-f.neg{background:linear-gradient(270deg,#d04040,#8a2020)}.re-f.pos{background:linear-gradient(90deg,#d8b050,#8fd080)}
.re-bv{width:92px;text-align:right;color:#b9a488;font-size:12px;flex:none}.re-bv.bad{color:#ff8a70}.re-bv.ok{color:#9ae090}.re-bv small{opacity:.6}
.re-gr{margin:6px 0;font-size:12.5px;color:#ffb0a0}.re-gr b{margin-right:8px}.re-gr span{display:inline-block;margin:2px 6px 2px 0;padding:1px 8px;border-radius:999px;border:1px solid #7a3a30;background:rgba(120,30,20,.25);color:#ffc8b8}
.re-news{margin-top:8px;display:flex;flex-direction:column;gap:7px}.re-n{border-left:3px solid #8c6a3c;padding:4px 10px;background:rgba(255,220,150,.04);border-radius:0 8px 8px 0}
.re-n b{font-size:13px;color:#f3e0b8}.re-n b small{font-weight:400;color:#a89070;margin-left:4px}.re-n p,.re-hint{margin:3px 0 0;font-size:13px;line-height:1.7;color:#d8c6a6}
.re-fx{margin-top:4px}.re-fx span{display:inline-block;margin:2px 6px 0 0;padding:0 8px;border-radius:999px;background:#2e2010;border:1px solid #8c6a3c;color:#ffd890;font-size:11.5px}
.re-more{font-size:12px;color:#8f7b60;text-align:center}.re-hint{margin-top:9px;color:#b9a488;font-size:12.5px}.re-hint b{color:#e0b75d}
.re-bdg{font-size:12px;margin-left:2px}
.ar-st p.ec{color:#e9c98a;border-left:2px solid #8c6a3c;padding-left:8px}
#reRet{position:fixed;left:18px;top:150px;width:400px;max-height:calc(100vh - 190px);overflow:auto;z-index:41;background:linear-gradient(180deg,rgba(34,22,14,.95),rgba(20,12,8,.95));border:1px solid #8c6a3c;border-radius:14px;padding:10px 16px 12px;color:#ead8b8;font:13.5px/1.65 system-ui,'Microsoft YaHei',sans-serif;box-shadow:0 8px 34px rgba(0,0,0,.6);display:none;pointer-events:none}
#reRet.on{display:block;animation:reIn .4s}@keyframes reIn{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:none}}
#reRet .rt{display:flex;justify-content:space-between;align-items:center;font-size:15px;color:#ffe2a0}#reRet .rt span{pointer-events:auto;cursor:pointer;color:#a89070;padding:0 6px}
#reRet .r1{display:flex;gap:10px;align-items:baseline;margin:4px 0;font-size:14px}#reRet .r1 em{font-style:normal;color:#c9b08a}#reRet .r1 b{color:#ffd27a}#reRet .r1 i{font-style:normal;color:#9ae090;font-size:12px}
#reRet .r2{display:flex;flex-wrap:wrap;gap:4px 10px;font-size:12.5px;margin-bottom:4px}#reRet .r2 .bad{color:#ff9a80}#reRet .r2 .ok{color:#9ae090}
#reRet .r3{border-top:1px solid #3c2a1a;padding:6px 0 2px}#reRet .r3 b{color:#f3e0b8;font-size:13px}#reRet .r3 p,#reRet .r0{margin:2px 0;color:#d8c6a6}#reRet .r0{font-size:12.5px;color:#a89070;margin-top:6px}`;
    document.head.appendChild(s);
  }

  hook(); setInterval(() => { try { if (!hooked) hook(); } catch (e) { } }, 500); addEventListener('load', hook);
  return { on, R, SS, FAC, TIERS, tierOf, detHTML, badge, arrive, paras, arrHTML, settle, cap, _st: () => ({ T, lastRet }), _setT: t => { T = t; }, _show: showRet, facOf, stanceOf, story, ST };
})();
