// R54i MOD run_loop（默认开）：把所有机制拧成一个“章节 × 回合”的循环，并控住数值：
// ① 回合：一次出猎（出洞→回洞）= 一回合。魂晶主要来自出猎（击杀 / 清空地点）和回合结算（摆出的首级按阶位定量产出）；
//    洞里把玩首级、头棋、建筑自动产出等“洞内收入”每回合有上限，超出部分不进口袋，而是变成下一回合结算的加成（最多 +60%）→ 资源不能无限刷。
// ② 章节：每章前往 2 个地区后，第 3 次出洞只能迎战本章 BOSS（选地点面板里能看到她的等级/血量/伤害）；每过一章 BOSS 更强（+5 级）。
// ③ 清空地点：杀光一个地点的人有清空奖励；离开时按清空程度结算（越干净越多）。
// ④ 肉鸽开局：每个新存档随机 2 条“世道”（全局规则），每一局都不一样。
// ⑤ 新宿敌：被你逃掉的老兵以上敌人（她正在追你时你离开了地点）会记住你，成为宿敌并随时间变强（由 nemesis 派出）。
// R54k：章节 BOSS 是独立的 7 位「月之使徒」+ 独立擂台（不再把地区霸主搬过去）；round_yield：首级不再靠点，每次回洞按建筑规则定量结算 + 套装。
window.Loop = (() => {
  const on = () => !window.Mods || Mods.on('run_loop') !== false;
  const rOn = () => on() && (!window.Mods || Mods.on('round_yield') !== false);
  const G = () => window.G, W = () => (window.Worlds && Worlds.active ? Worlds._W : null);
  const toast = (t, c, s) => { try { G().toast(t, c, s); } catch (e) { } };
  const plv = () => { try { return RPG.lvOf(G().S.xp).lv; } catch (e) { return 1; } };
  const MODS = [
    { k: 'bloodmoon', n: '血月之年', d: '敌人生命 +20%，回合产出 +25%', ehp: 1.2, pay: 1.25 },
    { k: 'barren', n: '贫瘠岁月', d: '回合产出 -20%，清空奖励 +40%', pay: 0.8, clear: 1.4 },
    { k: 'zealot', n: '狂热猎手', d: '宿敌逼近快 50%，回合产出 +15%', nem: 1.5, pay: 1.15 },
    { k: 'iron', n: '铁骨', d: '你的生命 +15%，移速 -5%', hp: 0.15, spd: -0.05 },
    { k: 'grip', n: '巨人之握', d: '你的伤害 +10%，敌人伤害 +10%', dmg: 0.1, edmg: 1.1 },
    { k: 'swift', n: '疾风岁月', d: '移速 +8%，敌人伤害 +8%', spd: 0.08, edmg: 1.08 },
    { k: 'feast', n: '盛宴', d: '每杀一人回复 3% 生命，回合产出 -10%', heal: 0.03, pay: 0.9 },
    { k: 'curse', n: '诅咒深重', d: '敌人等级 +2，清空奖励 +30%', elv: 2, clear: 1.3 }
  ];
  function R() {
    const S = G().S; if (!S.run) { const pool = MODS.slice(), m = []; for (let i = 0; i < 2; i++) m.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].k);
      S.run = { chap: 1, n: 0, round: 0, cave: 0, bonus: 0, last: 0, mods: m, boss: false, regs: [] }; setTimeout(() => { try { G().toast(`🎲 这一局的世道：${m.map(k => MODS.find(x => x.k === k).n).join(' · ')}（出洞选地点面板可查看规则）`, '#e8d0ff', 5); } catch (e) { } }, 4000); }
    const r = S.run; if (r.stash == null) r.stash = 0; r.src = r.src || {}; r.nb = r.nb || {}; r.bst = r.bst || {}; r.cbk = r.cbk || [];
    return r;
  }
  const mod = (f, def) => { if (!on()) return def; let v = def; for (const k of R().mods) { const M = MODS.find(x => x.k === k); if (M && M[f] != null) v = typeof def === 'number' && def === 1 ? v * M[f] : v + M[f]; } return v; };
  // ---- 玩家/敌人倍率（被 nemesis / living 读取）；nb = 上回合建筑给的「下一趟」祝福；Rogue = 本局肉鸽流派/祝福 ----
  const nb = () => (on() && R().nb) || {};
  const RG = k => (window.Rogue && Rogue.on && Rogue.on() && Rogue[k] ? Rogue[k]() : 1);
  let wc = { t: 0, v: 0 };
  function ward() { const n = performance.now(); if (n - wc.t < 2000) return wc.v; wc.t = n; let k = 0; try { for (const h of G().heads || []) if (h && h.mount && h.mount.type === 'rh_palisade') k++; } catch (e) { } wc.v = Math.min(0.45, k * 0.08); return wc.v; }
  const MK = k => (window.Momentum && Momentum[k] ? Momentum[k]() : 1);
  const runDmg = () => (1 + mod('dmg', 0) + (nb().dmg || 0)) * RG('dmgK') * MK('dmgK'), runHp = () => (1 + mod('hp', 0) + (nb().hp || 0)) * RG('hpK'), runSpd = () => (1 + mod('spd', 0) + (nb().spd || 0)) * RG('spdK') * MK('spdK');
  const enemyHp = () => mod('ehp', 1) * (1 - Math.min(0.3, nb().fear || 0)), enemyDmg = () => mod('edmg', 1), nemRate = () => mod('nem', 1) * (1 - ward()), enemyLv = () => mod('elv', 0);
  const chapLv = () => on() ? (R().chap - 1) * 5 : 0;
  // ---- 章节 BOSS：月之巫女的使徒，无限随机生成（下面是角色模板；名字/种族/长相/称号/擂台/词缀每局每章都不同），各有独立擂台 ----
  const AFN = { frenzy: '🔥狂热', iron: '🛡️铁壁', leech: '🩸噬血', volatile: '💥爆裂', phantom: '👻幽影', relentless: '⚔️连斩', regen: '✚再生' };
  const HAIR = [['银白', '#eef0fa', '#9aa2c8'], ['酒红', '#a0203a', '#3a0812'], ['灰白', '#d8d8dc', '#6a6a74'], ['淡金', '#f4e8b8', '#c8b070'], ['墨黑', '#2a2a30', '#0a0a0e'], ['雪白', '#ffffff', '#d8c8e8'], ['夜紫', '#4a3a80', '#10081e'], ['血红', '#c02028', '#40080a'], ['冰蓝', '#bfe6ff', '#4a7aa8'], ['翡翠', '#6ae09a', '#1a7a4a'], ['蜜糖金', '#f0c860', '#b07a28'], ['玫瑰', '#ff9ab8', '#a03a5a']];
  const EYE = [['冰蓝', '#8ad0ff', '#e8f6ff'], ['血红', '#ff3050', '#ffb0c0'], ['琥珀', '#ffb020', '#ffe090'], ['翡翠', '#40e0a0', '#d0fff0'], ['灰白', '#d8d8d0', '#ffffff'], ['紫红', '#ff40a0', '#ffd0f0'], ['金', '#ffd040', '#fff4c0'], ['月银', '#c8e8ff', '#ffffff']];
  const TPRE = ['霜月', '血月', '蚀月', '骨月', '雾月', '烬月', '盲月', '倒月', '镜月', '新月', '残月', '朔月', '哭月', '无面'], PPRE = ['沉月', '无光', '倒悬', '蚀骨', '白雾', '千烛', '血色', '寂静', '碎镜', '锈蚀', '哭泣', '永夜'];
  const FEAT = { elf: 'elf', darkelf: 'elf', halfelf: 'elf', beast: 'beast', angel: 'halo', demon: 'horn', dragon: 'horn2' };
  const cbC = new Map();
  const CHB = [
    { n: '伊莎贝拉', title: '银镰修女', race: 'human', id: 'nun', traits: ['虔诚', '冷酷'], belief: '月之巫女', goal: '替月亮收割第一批首级', pow: 2.0, col: '#c8d4ff', place: '月蚀礼拜堂', base: 'abbey',
      look: { hn: '银白', hc1: '#eef0fa', hc2: '#9aa2c8', en: '冰蓝', ec1: '#8ad0ff', ec2: '#e8f6ff', acc: ['tiara'] },
      intro: '礼拜堂的彩窗只剩一片：一轮被咬掉一角的月亮。修女跪在祭坛前磨镰刀，磨刀声和祷词一个节拍。', say: '月亮说你的头很好看。我只是来取货的。',
      taunt: ['阿门。', '跪下，好让我够得着。', '月亮在看。'], hurt: ['……主啊。', '你在玷污圣所。'], win: '回去吧。月亮还没准备好收你。', lose: '……月亮……会另派人来……', story: '月之巫女的第一位使徒。她把礼拜堂改成了收头的地方，祷词里的「主」早就换了人。' },
    { n: '薇洛妮卡', title: '蜡面伯爵夫人', race: 'vampire', id: 'countess', traits: ['高傲', '腹黑'], belief: '月之巫女', goal: '把世上最美的脸都封进蜡里', pow: 2.1, col: '#ff9ab8', place: '千烛长廊', base: 'capital',
      look: { hn: '酒红', hc1: '#a0203a', hc2: '#3a0812', en: '血红', ec1: '#ff3050', ec2: '#ffb0c0', acc: ['crown'] },
      intro: '长廊两侧站满了蜡像，每一座都是她请来做客的贵族。蜡还没干透的那一座，正朝你微笑。', say: '你来得正好，我的收藏还缺一张粗糙的脸。',
      taunt: ['别乱动，蜡会歪。', '真不优雅。', '微笑，亲爱的。'], hurt: ['我的妆！', '你弄花了我的脸！'], win: '走吧。改天我派人接你来——做成蜡像。', lose: '……蜡……要化了……', story: '把客人封进蜡里的伯爵夫人。长廊里一千根蜡烛，每一根都曾是一个名字。' },
    { n: '赛菈', title: '狼月猎手', race: 'beast', id: 'huntress', traits: ['好战', '冷静'], belief: '月之巫女', goal: '在嚎月石林的最高处挂上你的头骨', pow: 2.2, col: '#ffb060', place: '嚎月石林', base: 'wilds',
      look: { hn: '灰白', hc1: '#d8d8dc', hc2: '#6a6a74', en: '琥珀', ec1: '#ffb020', ec2: '#ffe090', feat: 'beast', paint: 1, paintC: '#3a3a60' },
      intro: '石柱上挂满猎物的头骨，最高那根还空着一个位置。银发猎手蹲在柱顶，舔了舔刀背。', say: '食人魔的头骨，挂在最上面正合适。',
      taunt: ['跑啊。', '我闻到你怕了。', '嗷呜——！'], hurt: ['哈！', '好硬的皮。'], win: '下次跑快点，猎物。', lose: '……柱子……就空着吧……', story: '月光下狩猎的兽人女猎手，月之巫女的猎犬。' },
    { n: '艾琳', title: '雾纱新娘', race: 'elf', id: 'lady', traits: ['温柔', '偏执'], belief: '月之巫女', goal: '让每位宾客永远留在婚礼上', pow: 2.3, col: '#bff0e0', place: '雾纱婚礼堂', base: 'forest',
      look: { hn: '淡金', hc1: '#f4e8b8', hc2: '#c8b070', en: '翡翠', ec1: '#40e0a0', ec2: '#d0fff0', feat: 'elf', acc: ['tiara'] },
      intro: '婚礼堂里坐满了宾客，全都没有头。新娘撩起雾纱，问你是不是她等的那个人。', say: '你来了……你是来娶我的，对吧？对吧？',
      taunt: ['别走。', '说你愿意。', '我们会很幸福的。'], hurt: ['你……弄疼我了。', '为什么？'], win: '婚礼改期了。你会回来的。', lose: '……我……愿意……', story: '婚礼当天被抛弃的精灵新娘，从此每位客人都会被留下来。' },
    { n: '玛格丽特', title: '白骨审判官', race: 'human', id: 'inquisitor', traits: ['严谨', '冷酷'], belief: '月之巫女', goal: '给世上每一颗头定罪', pow: 2.4, col: '#f0e6c8', place: '骸骨审判庭', base: 'fortress',
      look: { hn: '墨黑', hc1: '#2a2a30', hc2: '#0a0a0e', en: '灰白', ec1: '#d8d8d0', ec2: '#ffffff' },
      intro: '审判庭的长椅是骨头拼的，法槌是一截大腿骨。她翻开卷宗：你的名字下面已经写满了罪名。', say: '被告食人魔，罪名：太多了。判决：斩首。',
      taunt: ['肃静！', '罪加一等。', '下一项罪名——'], hurt: ['藐视法庭！', '反对无效！'], win: '休庭。下次开庭，你必须到场。', lose: '……判决……驳回……', story: '月之巫女的审判官，从不判无罪。' },
    { n: '千夜', title: '双月巫祝', race: 'human', id: 'foxmiko', traits: ['狡黠', '神秘'], belief: '月之巫女', goal: '让第二个月亮永远挂在天上', pow: 2.5, col: '#ff8ad8', place: '双月神社', base: 'peak',
      look: { hn: '雪白', hc1: '#ffffff', hc2: '#d8c8e8', en: '紫红', ec1: '#ff40a0', ec2: '#ffd0f0', feat: 'beast' },
      intro: '山顶鸟居后面升起了两个月亮。巫女摇着铃，一个月亮在笑，另一个在哭。', say: '两个月亮，一个要你的头，一个要你的魂。你选哪个？',
      taunt: ['铃——', '月亮转过来了。', '嘻嘻。'], hurt: ['哎呀。', '铃声乱了。'], win: '下次，两个月亮都会等你。', lose: '……月亮……只剩一个了……', story: '侍奉两个月亮的狐巫女。她说其中一个是假的，但她也不确定是哪个。' },
    { n: '露西菲娅', title: '堕月天使', race: 'angel', id: 'fallen', traits: ['高傲', '绝望'], belief: '月之巫女', goal: '拦住一切走向月亮的人', pow: 2.6, col: '#b090ff', place: '堕月深渊', base: 'abyss',
      look: { hn: '夜紫', hc1: '#4a3a80', hc2: '#10081e', en: '金', ec1: '#ffd040', ec2: '#fff4c0', feat: 'halo' },
      intro: '深渊里倒悬着一片天空，天使从月亮上坠下来，翅膀还在燃烧。她是巫女最后的屏障。', say: '我从月亮上掉下来，就是为了拦住你。',
      taunt: ['坠落吧。', '月亮不会救你。', '跪下，罪人。'], hurt: ['……光在熄灭……', '你竟敢！'], win: '回去。月之巫女还轮不到见你。', lose: '……巫女大人……对不起……', story: '月之巫女最忠诚的护卫，曾经是天使。' },
    { n: '沃尔兹', title: '断头台女工', race: 'human', id: 'merc', traits: ['冷酷'], belief: '月之巫女', goal: '把刃口磨到能切开月光', pow: 2.2, col: '#d0c0a0', place: '血槽刑场', base: 'fortress',
      intro: '刑场中央的断头台擦得发亮。她把一篮子头倒进坑里，坐在篮沆上等你。', say: '工钱按颗算。你这颗，算三颗。',
      taunt: ['下一个。', '别乱动，会切歪。', '价钱不变。'], hurt: ['工伤……', '你把我的刃弄钝了。'], win: '今天收工。明天开工先穿你。', lose: '……工钱……归你了……', story: '给月亮切了一辈子头的女刑手。' },
    { n: '内洛', title: '挂尸歌姬', race: 'elf', id: 'singer', traits: ['高傲'], belief: '月之巫女', goal: '用一首歌让所有头一起唱', pow: 2.2, col: '#ffc0e0', place: '无声剧院', base: 'capital',
      intro: '剧院座席上都是头，她们一起张嘴，却只有一个声音——歌姬的。', say: '你的头很适合唱低音部。',
      taunt: ['啦——', '跟上节拍。', '安可！'], hurt: ['走音了！', '我的嗓子！'], win: '谢幕。下一场你当主角。', lose: '……幕……落……', story: '把观众的头训练成合唱团的精灵歌姬。' },
    { n: '格蕾塔', title: '守墓人', race: 'human', id: 'shepherd', traits: ['沉默'], belief: '月之巫女', goal: '让每一座墓都有头可埋', pow: 2.1, col: '#a8c0a0', place: '无碑墓园', base: 'village',
      intro: '墓园里的墓碑都是空的，只有一块刻着字——是你的名字。守墓人扶着铁锹等着。', say: '坑挖好了。尺寸按你的头量的。',
      taunt: ['安息吧。', '土很软。', '别挤。'], hurt: ['……大地在哭。', '还没到时候。'], win: '你的坑我留着。', lose: '……把我……埋浅一点……', story: '月之巫女的守墓人，她埋的头比任何人都多。' },
    { n: '科莉尔', title: '魂水炼金师', race: 'darkelf', id: 'alchemist', traits: ['狡黠'], belief: '月之巫女', goal: '把月光蒸馏成一滴水', pow: 2.3, col: '#90f0d0', place: '蒸馏温室', base: 'swamp',
      intro: '玻璃缸里泡着一排排头，管子把她们的眼泪收集到一只烧瓶里。炼金师摇了摇瓶子，很不满意。', say: '就差一味——食人魔的眉毛。',
      taunt: ['加热中。', '别打翻烧瓶。', '反应很激烈。'], hurt: ['实验失败……', '配方乱了！'], win: '样本不够，下次再采。', lose: '……记录……失败……', story: '把月光当配方的暗精灵炼金师。' }
  ];
  function CB(ch) {
    ch = ch || R().chap; const r0 = R(); if (!r0.seed) r0.seed = (Math.random() * 4294967296) >>> 0; const key = r0.seed + ':' + ch; if (cbC.has(key)) return cbC.get(key);
    let s = (r0.seed ^ Math.imul(ch + 11, 2654435761)) >>> 0; const r = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }, pk = a => a[Math.floor(r() * a.length) % a.length];
    const T = pk(CHB), LR = (window.Lore && Lore.RACES) || {}, race = r() < 0.4 || !LR[T.race] ? T.race : pk(Object.keys(LR).length ? Object.keys(LR) : [T.race]), syl = (LR[race] && LR[race].syl) || ['莉', '娜', '丝', '藇'];
    const hr = pk(HAIR), ey = pk(EYE), L = (window.Lore && Lore.LOCS) || [{ k: T.base }], TR = (window.Lore && Lore.TRAITS) || T.traits, tr = [pk(TR), pk(TR)].filter((x, i, a) => a.indexOf(x) === i);
    const look = { hn: hr[0], hc1: hr[1], hc2: hr[2], en: ey[0], ec1: ey[1], ec2: ey[2] }; if (FEAT[race]) look.feat = FEAT[race]; if (r() < 0.5) look.acc = [pk(['tiara', 'crown', 'witchhat'])];
    const aff = Object.keys(AFN).sort(() => r() - 0.5).slice(0, Math.min(3, 1 + Math.floor((ch - 1) / 3))), sk = ['volley', 'cleave', 'pull', 'quake', 'mark', 'nova', 'rally'].sort(() => r() - 0.5).slice(0, Math.min(6, 3 + Math.floor((ch - 1) / 3)));
    const B = Object.assign({}, T, { k: 'ch' + ch, ch, sk, n: Array.from({ length: 2 + (r() < 0.45 ? 1 : 0) }, () => pk(syl)).join(''), race, traits: tr.length ? tr : T.traits, title: pk(TPRE) + '·' + T.title, place: pk(PPRE) + T.place.slice(2), base: pk(L).k, col: hr[1], look, aff, pow: 2.0 + 0.1 * Math.min(20, ch - 1) });
    cbC.set(key, B); return B;
  }
  function bossAff(fo) { const B = CB(); fo.aff = fo.aff || {}; for (const k of B.aff) { fo.aff[k] = 1; if (k === 'iron') fo.shield = 2 + Math.floor(B.ch / 4); if (k === 'frenzy') { fo.spdMul = (fo.spdMul || 1) * 1.15; fo.dmgMul = (fo.dmgMul || 1) * 1.08; } } fo.affName = B.aff.map(k => AFN[k]).join(' '); }
  const chBoss = k => CB(parseInt(String(k).slice(2), 10) || R().chap);
  const bossLv = () => Math.max(1, 5 + 6 * (R().chap - 1) + enemyLv() - (R().bdeb || 0));
  function arena() { const B = CB(), L = (window.Lore && Lore.LOCS) || [], li = Math.min(L.length - 1, Math.round((R().chap - 1) * 1.3)); return { k: B.k, place: B.place, rec: (L[li] && L[li].rec) || 100 }; }
  let bossTrip = false;
  const isBossTrip = () => on() && bossTrip;
  function bossCard() {
    const B = CB(), lv = bossLv(), d = lv - plv(), hk = Math.max(0.7, Math.min(4, Math.pow(1.1, d))) * enemyHp(), dk = Math.max(0.7, Math.min(3, Math.pow(1.07, d))) * enemyDmg();
    return `<div id="lpBoss" style="--bc:${B.col}"><div class="t">第 ${R().chap} 章 · 章节 BOSS · 第 ${B.ch} 位月之使徒（每局随机、无限延续）</div><div class="n">👑 ${B.n} <small>${B.title} · 擂台「${B.place}」</small></div>
<div class="s"><span>等级 <b>Lv.${lv}</b>（你 Lv.${plv()}${d >= 6 ? ' · <i>极度危险</i>' : d >= 2 ? ' · 危险' : ''}）</span><span>生命 ×<b>${hk.toFixed(2)}</b></span><span>伤害 ×<b>${dk.toFixed(2)}</b></span><span>威压 ×${B.pow.toFixed(1)}</span><span>词缀：<b>${B.aff.map(k => AFN[k]).join(' ')}</b></span><span>招牌技：<b>${B.sk.map(k => (window.FoeAI2 && FoeAI2.SK2 && FoeAI2.SK2[k] ? FoeAI2.SK2[k].n : k)).join(' · ')}</b></span><span>${B.traits.join(' · ')}</span></div>
<p>${B.intro}</p><p>她不是哪个地区的霸主——她是月之巫女的「${B.title}」，只在自己的擂台上等你。打赢：进入第 ${R().chap + 1} 章 + 1 次祝福抉择（月之线索要在跑图时的「月之踪迹」里找）；逃回来：下次还是她。</p><button data-lp="boss">⚔️ 前往「${B.place}」</button></div>`;
  }
  function css() { if (document.getElementById('lpCss')) return; const s = document.createElement('style'); s.id = 'lpCss'; s.textContent = `
#lpHead{margin:6px 0 10px;padding:8px 14px;border-left:3px solid #e1c07e;background:linear-gradient(90deg,#1a1410d0,transparent);font-size:13px;color:#e8dcc4;letter-spacing:.04em}#lpHead b{color:#ffd890}#lpHead small{color:#a89880}
#lpSide{position:fixed;right:16px;top:70px;z-index:120;width:min(330px,28vw);display:flex;flex-direction:column;gap:10px;pointer-events:none;font:13.5px/1.6 "Microsoft YaHei UI",sans-serif;color:#eadcc4;animation:lpIn .35s ease-out}@keyframes lpIn{from{opacity:0;transform:translateX(24px)}}
#lpSide section{padding:12px 14px;background:linear-gradient(160deg,rgba(30,20,16,.94),rgba(10,7,6,.94));border:1px solid var(--bc,#6a4a2a);border-left:3px solid var(--bc,#e1c07e);box-shadow:0 10px 30px #0009}
#lpSide h4{margin:0 0 6px;font:700 15px "Noto Serif SC",serif;letter-spacing:.12em;color:#ffd890}#lpSide h4 small{float:right;font:12px sans-serif;color:#a89880;letter-spacing:0}#lpSide p{margin:4px 0}#lpSide .m{font-size:12px;color:#b8a890}#lpSide .hot{color:#ff8a6a}
#lpSide .bar{height:6px;background:#0008;margin:4px 0 6px}#lpSide .bar i{display:block;height:100%;background:linear-gradient(90deg,#8a5a20,#ffd27a)}
#lpSide .bn{font:800 20px "Noto Serif SC",serif;color:var(--bc);margin:2px 0}#lpSide .bn small{display:block;font:12px sans-serif;color:#c8b8a8}
#lpSide .pips{margin:4px 0 6px}#lpSide .pp{display:inline-block;width:14px;height:14px;border-radius:50%;margin-right:5px;vertical-align:middle;box-shadow:inset 0 0 0 2px #8878c8}#lpSide .pp.on{background:radial-gradient(circle,#fff,#b8a8ff);box-shadow:0 0 8px #b8a8ff}#lpSide .pips b{margin-left:6px;color:#fff}#lpSide .cl{font-size:12.5px;color:#d8d0ff}
#lpBoss{margin:10px 0;padding:16px 18px;border:1px solid var(--bc);background:radial-gradient(120% 140% at 0 0,#2a1414ee,#0a0607f2);border-radius:4px}#lpBoss .t{font-size:12px;letter-spacing:.3em;color:#c8a8a0}#lpBoss .n{font-size:24px;color:var(--bc);margin:4px 0 8px;font-weight:700}#lpBoss .n small{font-size:13px;color:#c8b8a8;font-weight:400}
#lpBoss .s{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:13px;color:#e8d8c0}#lpBoss .s i{color:#ff7a6a;font-style:normal}#lpBoss p{font-size:13px;color:#b8a890;line-height:1.7}#lpBoss button{padding:9px 26px;border:1px solid var(--bc);background:linear-gradient(#4a1c14,#220c08);color:#ffe8c8;font-size:15px;letter-spacing:.2em;cursor:pointer;border-radius:3px}
#lpSettle{position:fixed;right:18px;top:84px;z-index:60;width:min(440px,92vw);max-height:78vh;overflow:auto;padding:14px 16px;background:linear-gradient(160deg,#1c1410f4,#0a0706f6);border:1px solid #c9a35e;border-radius:4px;color:#eadcc4;font:13px/1.6 "Microsoft YaHei UI",sans-serif;box-shadow:0 18px 60px #000a;opacity:0;transform:translateX(30px);transition:opacity .35s,transform .35s;pointer-events:none}
#lpSettle.on{opacity:1;transform:none;pointer-events:auto}#lpSettle .h{font-size:16px;font-weight:700;color:#ffd890;letter-spacing:.1em;margin-bottom:6px}
#lpSettle table{width:100%;border-collapse:collapse}#lpSettle td{padding:3px 4px;border-bottom:1px solid #ffffff12;vertical-align:top}#lpSettle td.v{color:#ffe08a;text-align:right;white-space:nowrap;font-weight:700}#lpSettle td.c{color:#a89880;white-space:nowrap}#lpSettle .nt{display:block;font-size:11px;color:#b8a890}
#lpSettle .s{margin-top:6px;color:#c8e0ff;font-size:12px}#lpSettle .x{margin-top:4px;color:#ffc8a0;font-size:12px}#lpSettle .m{margin-top:6px;color:#a89880;font-size:12px}#lpSettle .t{margin-top:6px;font-size:22px;font-weight:800;color:#ffe08a;text-align:right}#lpSettle .k{font-size:11px;color:#8a7a68;text-align:right}`; document.head.appendChild(s); }
  const nbText = o => [o.dmg ? `伤害 +${Math.round(o.dmg * 100)}%` : '', o.hp ? `生命 +${Math.round(o.hp * 100)}%` : '', o.spd ? `移速 +${Math.round(o.spd * 100)}%` : '', o.fear ? `敌人生命 -${Math.round(o.fear * 100)}%` : '', o.heal ? `每杀回血 ${Math.round(o.heal * 100)}%` : '', o.clear ? `清空奖励 +${Math.round(o.clear * 100)}%` : ''].filter(Boolean).join(' · ');
  function inject() {
    const host = document.querySelector('.rq-pick') || document.querySelector('.locs'); if (!host || !host.offsetParent || document.getElementById('lpHead')) return; css(); const r = R();
    const h = document.createElement('div'); h.id = 'lpHead'; let hn = 0; try { hn = (G().heads || []).filter(x => x && x.mount).length; } catch (e) { }
    const eco = rOn() ? ` · 在岗首级 <b>${hn}</b> 颗（每次回洞定量结算，上回合 +${r.last || 0}）· 洞内活动已存 ${Math.round(r.stash)}/${capCave()}` : ` · 洞内收入 ${Math.round(r.cave)}/${capCave()}（超出转为下回合产出 +${Math.round(r.bonus * 100)}%）`, bl = nbText(nb());
    h.innerHTML = SP() ? `⏳ 回合 ${r.round}${eco}${bl ? `<br>🎐 建筑给这一趟的祝福：<b>${bl}</b>` : ''}` : `📖 <b>第 ${r.chap} 章</b> · 本章已去 ${Math.min(2, r.n)}/2 个地区${r.n >= 2 ? ' · <b>章节 BOSS 战</b>' : ''} · 回合 ${r.round}${eco}${bl ? `<br>🎐 建筑给这一趟的祝福：<b>${bl}</b>` : ''}<br><small>世道：${r.mods.map(k => { const M = MODS.find(x => x.k === k); return M.n + '（' + M.d + '）'; }).join('；')}</small>`;
    host.parentNode.insertBefore(h, host);
    if (r.n >= 2) { host.style.display = 'none'; const b = document.createElement('div'); b.innerHTML = bossCard(); host.parentNode.insertBefore(b, host); b.addEventListener('click', e => { if (!e.target.closest('[data-lp="boss"]')) return; e.stopPropagation(); try { UI._startTrip(CB().base); } catch (er) { bossTrip = false; console.warn(er); } }); }
  }
  // ---- 回合经济 ----
  const capCave = () => rOn() ? Math.round(30 + 0.35 * (R().last || 60)) : Math.round(40 + 0.5 * (R().last || 60));
  function payout() {
    const r = R(); let v = 0, n = 0; try { for (const h of G().heads || []) { if (!h || !h.mount || !h.rec) continue; n++; v += 2 + 3 * ((h.rec.c && h.rec.c.rar) || 0); } } catch (e) { }
    const p = Math.round((10 + v) * (1 + r.bonus) * mod('pay', 1) * (1 + (r.chap - 1) * 0.15)); return { p, n, b: r.bonus };
  }
  function caveGate(v) {
    if (!on() || W() || !(v > 0)) return v; const r = R(), cap = capCave(), keep = Math.max(0, Math.min(v, cap - r.cave)), extra = v - keep; r.cave += keep;
    if (extra > 0) { r.bonus = Math.min(0.6, r.bonus + extra / Math.max(60, r.last || 60) * 0.25); if (!caveGate.told) { caveGate.told = 1; try { G().toast(`🔒 本回合洞内收入已到上限 ${cap}——再把玩的魂晶转为下回合结算加成（现在 +${Math.round(r.bonus * 100)}%，最多 +60%）`, '#d8c8ff', 3.6); } catch (e) { } } }
    return keep;
  }
  // ---- R54k round_yield：首级每次回洞按建筑规则定量结算（把玩不再给魂晶）；洞里小游戏赚的魂晶先存着，回合结算时一起发（有上限）----
  const ROUND = {}; // 建筑类型 → (b, heads, ctx) => { v, note }（js/roundhalls.js 注册）
  const BASE = [10, 20, 36, 60, 100];
  const hv = h => { const c = h.rec.c; return BASE[Math.max(0, Math.min(4, c.rar | 0))] * (c.shiny ? 1.5 : 1) * (c.boss ? 2 : 1) * (h.rec.calm ? 1.1 : 1); };
  const bf = d => !d || !d.mount || d.mount.mult === 0 ? 0 : Math.min(1.5, 0.85 + 0.12 * Math.min(5, d.mount.mult || 1)) + (d.showcase ? 0.15 : 0);
  const raceN = k => (window.Lore && Lore.RACES && Lore.RACES[k] && Lore.RACES[k].n) || k;
  const bkey = b => b.type + '@' + (+b.x).toFixed(1) + ',' + (+b.z).toFixed(1);
  function settle(died) {
    const g = G(), r = R(), C = (window.BuildCat && BuildCat.C) || {}, out = { lines: [], sets: [], notes: [], heads: 0, v: 0 };
    const hs = (g.heads || []).filter(h => h && h.mount && h.rec && h.rec.c);
    const setK = new Map(), add = (h, k) => setK.set(h, (setK.get(h) || 0) + k);
    const group = f => { const m = {}; for (const h of hs) { const k = f(h); if (k) (m[k] = m[k] || []).push(h); } return m; };
    const byRace = group(h => h.rec.c.race), byId = group(h => h.rec.c.id);
    for (const k in byRace) { const L = byRace[k], n = L.length; if (n < 3) continue; const b = n >= 7 ? 0.8 : n >= 5 ? 0.45 : 0.2; L.forEach(h => add(h, b)); out.sets.push(`🧬 ${raceN(k)} ×${n}：这些首级 +${Math.round(b * 100)}%${n < 5 ? '（5 颗 +45%）' : n < 7 ? '（7 颗 +80%）' : ''}`); }
    for (const k in byId) { const L = byId[k], n = L.length; if (n < 2) continue; const b = n >= 3 ? 0.6 : 0.3; L.forEach(h => add(h, b)); out.sets.push(`👥 同为「${L[0].rec.c.idN || k}」×${n}：+${Math.round(b * 100)}%${n < 3 ? '（3 颗 +60%）' : ''}`); }
    if (new Set(hs.map(h => h.rec.c.rar | 0)).size >= 5) { hs.forEach(h => add(h, 0.25)); out.sets.push('🌈 凡/灵/英/圣/神 五阶齐全：全部 +25%'); }
    const C0 = (window.BuildCat && BuildCat.C) || {}, auras = (g.builds || []).filter(b => C0[b.type] && C0[b.type].aura && C0[b.type].auraMul), aC = new Map();
    const aura = h => { if (aC.has(h)) return aC.get(h); let m = 1; const p = h.g.position; for (const b of auras) { const d = C0[b.type]; if ((p.x - b.x) ** 2 + (p.z - b.z) ** 2 < d.aura * d.aura) m *= d.auraMul; } try { if (window.Props && Props.on && Props.on()) m *= Props.roundMul ? Props.roundMul(p) : Props.auraMul(p); } catch (e) { } m = Math.min(2, m); aC.set(h, m); return m; };
    const ctx = { r, g, hv, setK, nb: {}, rm: [], boons: 0, notes: out.notes, val: (h, k = 1) => hv(h) * k * (1 + (setK.get(h) || 0)) * aura(h), st: b => (r.bst[bkey(b)] = r.bst[bkey(b)] || {}), bless: (k, v) => { ctx.nb[k] = (ctx.nb[k] || 0) + v; } };
    const byB = new Map(); for (const h of hs) { if (!byB.has(h.mount)) byB.set(h.mount, []); byB.get(h.mount).push(h); }
    for (const [b, L] of byB) {
      const d = C[b.type]; if (!d) continue; let v = 0, note = ''; const fn = ROUND[b.type];
      if (fn) { try { const o = fn(b, L, ctx) || {}; v = o.v || 0; note = o.note || ''; } catch (e) { console.warn('round', b.type, e); } }
      else { const f = bf(d); for (const h of L) v += ctx.val(h, f); note = f ? `每颗 ×${f.toFixed(2)}` : '这座建筑不产魂晶'; }
      v = Math.max(0, Math.round(v)); out.v += v; out.heads += L.length; out.lines.push({ t: b.type, ic: d.icon, n: d.n, k: L.length, v, note });
    }
    try { if (window.Props && Props.on && Props.on() && window.Sack) { let pc = 0; const got = {}; for (const it of Props.items || []) { const d = it.d; if (it.ghost || !d || !d.tick) continue; if (d.tick.kind === 'coin') pc += d.tick.n * 3; else if (Sack.IT[d.tick.kind]) { Sack.stashAdd(Sack.mk(d.tick.kind, d.tick.n * 3)); got[d.tick.kind] = (got[d.tick.kind] || 0) + d.tick.n * 3; } }
      if (pc) { out.v += pc; out.lines.push({ t: '_props', ic: '🧰', n: '摆件产出', k: 0, v: pc, note: '藏宝箱等每回合结算一次' }); } const gs = Object.keys(got); if (gs.length) out.notes.push('🧰 摆件产出材料：' + gs.map(k => Sack.IT[k].icon + Sack.IT[k].n + '×' + got[k]).join('、') + '（已进储物箱）'); } } catch (e) { }
    const chK = 1 + (r.chap - 1) * 0.2, pay = mod('pay', 1), ex = g.exhibit ? 1 + g.exhibit().tier * 0.04 : 1, inc = 1 + (r.inc || 0); r.inc = 0;
    out.mul = { chK, pay, ex, inc }; out.stash = Math.round(r.stash || 0); out.src = Object.assign({}, r.src);
    out.tot = Math.round(out.v * chK * pay * ex * inc) + out.stash; out.died = died; out.nb = ctx.nb; out.boons = ctx.boons;
    for (const h of ctx.rm) { try { g.burst && g.burst(h.g.position, '#ff8a3a', 30, 1.6, 0.8, 1); g.removeHead(h); } catch (e) { } }
    r.nb = ctx.nb; if (ctx.rm.length) try { g.save(); } catch (e) { }
    return out;
  }
  const SRCN = { curios: '🎡 洞内玩意', rites: '🕯️ 祭仪', oddities: '🫖 奇物', sanctum: '🗄️ 藏首', play: '🎳 魂球/盗魂灵', props: '🧰 摆件', chess: '♟️ 头棋胜局' };
  function showSettle(P) {
    css(); let el = document.getElementById('lpSettle'); if (!el) { el = document.createElement('div'); el.id = 'lpSettle'; document.body.appendChild(el); el.addEventListener('click', () => el.classList.remove('on')); }
    const M = new Map(); for (const l of P.lines) { const o = M.get(l.t) || { ic: l.ic, n: l.n, k: 0, v: 0, b: 0, nt: new Set() }; o.k += l.k; o.v += l.v; o.b++; if (l.note) o.nt.add(l.note); M.set(l.t, o); }
    const rows = [...M.values()].sort((a, b) => b.v - a.v).map(o => `<tr><td>${o.ic} ${o.n}${o.b > 1 ? ` ×${o.b}` : ''}<span class="nt">${[...o.nt].slice(0, 2).join('；')}</span></td><td class="c">${o.k} 颗</td><td class="v">+${o.v}</td></tr>`).join('');
    const src = Object.keys(P.src || {}).filter(k => P.src[k] > 0).map(k => `${SRCN[k] || k} +${Math.round(P.src[k])}`).join(' · ');
    if (window.GrandUI && GrandUI.on()) {
      const rw = [...M.values()].sort((a, b) => b.v - a.v).map(o => ({ ic: o.ic, n: o.n + (o.b > 1 ? ` ×${o.b}` : ''), sub: `${o.k} 颗首级在岗${o.nt.size ? ' · ' + [...o.nt].slice(0, 2).join('；') : ''}`, v: '+' + o.v }));
      if (P.stash) rw.push({ ic: '📦', n: '洞内活动', sub: src || '存着的收益', v: '+' + P.stash });
      if (!rw.length) rw.push({ ic: '🕸️', n: '空荡的洞穴', sub: '没有首级在岗——把首级插到建筑上，下次回洞就有产出', v: '+0' });
      const ex = [...P.sets, ...P.notes, P.boons ? `🎴 额外祝福抉择 ×${P.boons}` : '', nbText(P.nb) ? `🎐 下一趟祝福：${nbText(P.nb)}` : '', `第 ${R().chap} 章 ×${P.mul.chK.toFixed(2)} · 世道 ×${P.mul.pay.toFixed(2)} · 展厅 ×${P.mul.ex.toFixed(2)}${P.mul.inc > 1 ? ` · 回合香 ×${P.mul.inc.toFixed(2)}` : ''}`].filter(Boolean);
      GrandUI.ceremony({ kicker: `第 ${R().round} 回 合`, title: P.died ? '你倒下了，但首级还在' : '魂首归窟', sub: '洞里的首级替你干完了这一回合的活', rows: rw, extras: ex, total: P.tot, ok: '收下', onClose: () => { try { if (window.Rogue && Rogue.st().pend > 0) setTimeout(Rogue.openBoon, 300); } catch (e) { } } });
      try { SFX.coins && SFX.coins(); } catch (e) { } return;
    }
    el.innerHTML = `<div class="h">🔄 第 ${R().round} 回合结算${P.died ? ' <small style="color:#ff9a8a">（你倒下了——首级照常结算）</small>' : ''}</div>
${rows ? `<table>${rows}</table>` : '<div class="m">没有首级在岗。把首级插到建筑上，下次回洞就有产出——不同建筑规则不同。</div>'}
${P.sets.length ? `<div class="s">${P.sets.join('<br>')}</div>` : '<div class="m">套装：同族 3/5/7 颗、同身份 2/3 颗、五阶齐全都有加成。</div>'}
${P.notes.length ? `<div class="x">${P.notes.join('<br>')}</div>` : ''}
${P.boons ? `<div class="x">🎴 额外祝福抉择 ×${P.boons}</div>` : ''}${nbText(P.nb) ? `<div class="x">🎐 下一趟祝福：${nbText(P.nb)}</div>` : ''}
<div class="m">第 ${R().chap} 章 ×${P.mul.chK.toFixed(2)} · 世道 ×${P.mul.pay.toFixed(2)} · 展厅评级 ×${P.mul.ex.toFixed(2)}${P.mul.inc > 1 ? ` · 🕯️回合香 ×${P.mul.inc.toFixed(2)}` : ''}${P.stash ? `<br>洞内活动（${src || '存着的'}）+${P.stash}` : ''}</div>
<div class="t">🔮 +${P.tot}</div><div class="k">点击关闭 · 首级每回合只结算一次，摆得越巧越多</div>`;
    el.classList.add('on'); clearTimeout(showSettle.t); showSettle.t = setTimeout(() => el.classList.remove('on'), 16000);
    try { SFX.coins && SFX.coins(); } catch (e) { }
  }
  const CAVE_SRC = /\/js\/(curios|rites|oddities|sanctum|play|props|chess)\.js/;
  function stash(n, src) {
    const r = R(), cap = capCave(), keep = Math.max(0, Math.min(n, cap - r.stash)); r.stash += keep; r.src[src] = (r.src[src] || 0) + keep;
    if (!stash.told) { stash.told = 1; toast(`📦 洞里赚的魂晶不会马上到手——下次回洞的回合结算时一起发（本回合已存 ${Math.round(r.stash)}/${cap}）`, '#d8c8ff', 3.6); }
    if (keep < n && !stash.full) { stash.full = 1; toast(`🔒 本回合洞内活动收益已满 ${cap}——再玩也不会多了，出去打猎吧`, '#c8b8ff', 3.2); }
  }
  function wrapCoins() {
    const g = G(); if (!g || !g.addCoins || g.addCoins.__lp) return; const f = g.addCoins;
    g.addCoins = function (n) { if (n > 0 && rOn() && !W()) { const m = CAVE_SRC.exec(new Error().stack || ''); if (m) { stash(n, m[1]); return; } } return f.apply(this, arguments); }; g.addCoins.__lp = 1;
  }
  function roundEnd(died) {
    const r = R(); r.round++; caveGate.told = 0; stash.told = stash.full = 0;
    if (bossTrip) { if (W0won()) { const B = CB(); r.cbk.push({ ch: r.chap, n: B.n, t: B.title, at: Date.now() }); r.chap++; r.n = 0; r.bdeb = 0; try { window.Rogue && Rogue.grant && Rogue.grant(1, '章节 BOSS 倒下'); } catch (e) { } toast(`📖 第 ${r.chap - 1} 章完结！「${B.title}」${B.n} 倒下了——进入第 ${r.chap} 章，下一位 BOSS 更强`, '#ffd890', 5); } }
    else if (!died) r.n = Math.min(2, r.n + 1);
    bossTrip = false;
    if (!rOn()) {
      if (died) { r.cave = 0; r.bonus = 0; return; }
      const P = payout(); G().addCoins(P.p); r.last = P.p; r.cave = 0; r.bonus = 0;
      setTimeout(() => { try { G().toast(`🔄 回合 ${r.round} 结算：魂晶 +${P.p}（摆出的首级 ${P.n} 颗${P.b ? ` · 上回合把玩/头棋加成 +${Math.round(P.b * 100)}%` : ''}）`, '#ffe0a0', 4.2); } catch (e) { } }, 1600);
      return;
    }
    setTimeout(() => { try { const P = settle(died); G().addCoins(P.tot); r.last = P.tot; r.stash = 0; r.src = {}; showSettle(P); if (window.Rogue && Rogue.on && Rogue.on()) { const earned = !died && (trip.k >= 3 || trip.c >= 1); if (earned) Rogue.roundPick(); else toast('🎴 这一趟没杀够 3 人、也没清空地点——没有祝福抉择', '#a898b8', 3); if (P.boons) Rogue.grant(P.boons, '建筑'); } try { G().save(); } catch (e) { } } catch (e) { console.warn('settle', e); } }, 1500);
  }
  let bossKilledThisTrip = false; const W0won = () => bossKilledThisTrip; const trip = { k: 0, c: 0 };
  // ---- 清空地点 ----
  function nodeStat() { const w = W(); if (!w || !w.foes) return null; const all = w.foes.filter(f => !f.hunter2 && !f.nemClone && !f.nemX), dead = all.filter(f => f.dead && !f.escaped).length; return { all: all.length, dead }; }
  function clearReward(final) {
    const w = W(), st = nodeStat(); if (!w || !st || !st.all || !node0 || node0.paid) return; const ratio = st.dead / st.all; if (!final && ratio < 1) return; node0.paid = 1;
    const base = (w.graph.loc && w.graph.loc.loot ? (w.graph.loc.loot[0] + w.graph.loc.loot[1]) / 2 : 20) * 0.25 * st.all, c = Math.round(base * ratio * ratio * mod('clear', 1) * (1 + (nb().clear || 0)));
    if (c <= 0) return; if (ratio >= 1) trip.c++; G().addCoins(c); try { w.trip.coins += c; } catch (e) { }
    try { G().toast(ratio >= 1 ? `🏁 地点清空！所有 ${st.all} 人都倒下了 · 清空奖励 🔮+${c}` : `🏳️ 离开时清空 ${Math.round(ratio * 100)}% · 奖励 🔮+${c}`, ratio >= 1 ? '#ffd890' : '#d8c8b0', 3); SFX.coins && SFX.coins(); } catch (e) { }
  }
  // ---- 离开地点：结算清空 + 正在追你的高阶敌人成为新宿敌 ----
  function leaveNode() {
    if (!on()) return; const w = W(); if (!w) return; clearReward(true);
    try { if (window.Foe && window.Nemesis) for (const fo of Foe.foes) { if (fo.dead || !fo.seen || fo.state !== 'chase' || (fo.tier || 0) < 1 || fo.hunter2 || fo.nemClone || fo.boss) continue; Nemesis.addFoe(fo); } } catch (e) { }
  }
  // R54p MOD side_panels：章节 / 章节 BOSS / 主线不再塞在出发面板角落，独立挂在右侧
  const SP = () => !window.Mods || Mods.on('side_panels') !== false;
  function side() {
    const host = document.querySelector('.rq-pick') || document.querySelector('.locs'), vis = !!(host && host.offsetParent) && !W(); let el = document.getElementById('lpSide');
    if (!vis || !SP()) { if (el) el.remove(); return; } if (el && performance.now() - el._t < 1500) return; css();
    if (!el) { el = document.createElement('div'); el.id = 'lpSide'; document.body.appendChild(el); } el._t = performance.now();
    const r = R(), B = CB(), lv = bossLv(), d = lv - plv(), n2 = Math.min(2, r.n), S = window.Saga, cn = S && S.clues ? S.clues() : 0, need = S && S.NEED || 7, pips = Array.from({ length: need }, (_, i) => `<i class="pp${i < cn ? ' on' : ''}"></i>`).join('');
    const cl = S && S.SS ? (S.SS().cl || []).slice(-3).map(c => `<div class="cl">🌙 ${esc(String(c.t || '').replace(/^“|”$/g, ''))}</div>`).join('') : '';
    el.innerHTML = `<section><h4>📖 第 ${r.chap} 章 <small>回合 ${r.round}</small></h4><div class="bar"><i style="width:${n2 * 50}%"></i></div><p>本章已去 <b>${n2}/2</b> 个地区 → ${r.n >= 2 ? '<b class="hot">章节 BOSS 已开放！</b>' : `再去 ${2 - n2} 个地区解锁章节 BOSS`}</p><p class="m">世道：${r.mods.map(k => { const M = MODS.find(x => x.k === k); return M ? `<b>${M.n}</b>` : ''; }).join(' · ')}</p></section>
<section style="--bc:${B.col}"><h4>👑 章节 BOSS</h4><div class="bn">${esc(B.n)}<small>${esc(B.title)}</small></div><p>Lv.<b>${lv}</b>（你 Lv.${plv()}${d >= 6 ? ' · <b class="hot">极度危险</b>' : d >= 2 ? ' · 危险' : ''}）· 擂台「${esc(B.place)}」</p><p class="m">词缀 ${B.aff.map(k => AFN[k]).join(' ')} · 招牌技 ${B.sk.map(k => (window.FoeAI2 && FoeAI2.SK2 && FoeAI2.SK2[k] ? FoeAI2.SK2[k].n : k)).join('、')}</p></section>
${S ? `<section><h4>🌙 主线 · 月之魔女</h4><div class="pips">${pips}<b>${cn}/${need}</b></div>${cl || '<p class="m">在各地区斩下“月之使者”或触发章节闪回拿到线索；集齐后神殿打开。</p>'}</section>` : ''}`;
  }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let wasW = null, node0 = null;
  function tick() {
    if (!on() || !G() || !G().S) return; R(); wrapCoins(); const w = W();
    if (w !== wasW) { if (w && !wasW) { bossKilledThisTrip = false; trip.k = 0; trip.c = 0; if (!bossTrip) R().regs.push(w.graph && w.graph.loc ? w.graph.loc.k : ''); } if (!w && wasW) roundEnd(!!wasW.dead || (G().S.hp <= 0)); wasW = w; node0 = null; }
    if (w) { if (!w.busy && w.B && !w.B.corr && (!node0 || node0.i !== w.cur)) node0 = { i: w.cur }; clearReward(false); if (bossTrip && window.Foe && Foe.foes.some(f => f.boss && f.dead)) bossKilledThisTrip = true; }
    else inject();
    try { side(); } catch (e) { }
  }
  setInterval(() => { try { tick(); } catch (e) { } }, 500);
  // 本章已去 2 个地区 → 任何出发入口（地点卡 / 委托 / 精英）都改为前往本章 BOSS 的独立擂台
  function wrapStart() { if (!window.UI || !UI._startTrip || UI._startTrip.__lp) return; const f = UI._startTrip; UI._startTrip = function (k) { if (on() && G() && G().S && R().n >= 2) { k = CB().base; bossTrip = true; } else bossTrip = false; return f.call(this, k); }; UI._startTrip.__lp = 1; }
  wrapStart(); setTimeout(wrapStart, 0);
  // 每杀一人回血（世道“盛宴” / 议会祝福）
  function onKill() { trip.k++; const h = mod('heal', 0) + (nb().heal || 0); if (h > 0) try { const s = G().st(); G().S.hp = Math.min(s.maxHp, G().S.hp + s.maxHp * h); } catch (e) { } }
  return { on, rOn, R, MODS, runDmg, runHp, runSpd, enemyHp, enemyDmg, nemRate, enemyLv, chapLv, isBossTrip, leaveNode, onKill, payout, capCave, caveGate, ROUND, hv, bf, settle, showSettle, stash, CB, CHB, chBoss, bossLv, bossAff, arena, nb, ward };
})();
