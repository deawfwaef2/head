// R35 MOD elite_bosses（默认开）：13 名精英BOSS + 最终BOSS「月之魔女」。
//   每人有：身份/主题（不与地区霸主、小BOSS、四名猎手重复）、解锁条件（带剧情的“传闻”）、推荐战力、预估胜率。
//   解锁后在「精英挑战」面板（C 键 / 洞里）点“挑战” → 出猎到她所在的地区 → 进入「决斗场」节点（门封锁，直到她倒下或你倒下）。
//   精英不是霸主（不走 fo.boss 流程）：强化精英怪 = 2~3 个 R34 词缀 + 限定技能池 + 职业 + fo.absRec（FoeAbs 按她的战力算血量/伤害）。
// R35 MOD victory2（默认开）：胜利条件改为 任意 7 个地区霸主 + 13 名精英 + 4 名食人魔猎手 + 月之魔女（包裹 Explore.checkVictory）。
window.Elites = (() => {
  const on = () => !window.Mods || Mods.on('elite_bosses');
  const vOn = () => !window.Mods || Mods.on('victory2');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const G_ = () => window.G;
  const S_ = () => G_().S;
  const nB = S => Object.keys(S.bosses || {}).length;
  const nEl = S => Object.keys((S.el && S.el.dead) || {}).filter(k => k !== 'moon').length;
  const hu = S => (S.h2 && S.h2.L) || {};
  const huDead = S => Object.values(hu(S)).filter(x => x.dead).length;
  const huEsc = S => Object.values(hu(S)).reduce((a, x) => a + (x.esc || 0), 0);
  const HP0 = 130;
  // loc = 决斗场所在地区（沿用地貌）
  const D = [
    { id: 'circus', n: '塞拉菲娜·万花', t: '午夜马戏团团长', ic: '🎪', col: '#ff7ac8', loc: 'village', rec: 90, fid: 'assassin', role: 'skirm', aff: ['phantom', 'frenzy'], sk: ['leap', 'whirl'],
      bio: '她的马戏团只在午夜开演，观众从来没有走出过帐篷。她收藏“表情最好看的头”，据说已经集满了一整排镜子。', cond: S => (S.heads || []).length >= 8, need: '魂库里有 8 颗首级',
      rumor: '雾溪村的孩子们说，午夜的田埂上有彩色的帐篷。「团长听说有个家伙的收藏比她还多——她很不服气。」', lines: ['欢迎光临午夜马戏团！', '你的收藏……让我看看。', '掌声呢？'] },
    { id: 'pirate', n: '薇丝珀·黑帆', t: '黑帆海盗女王', ic: '🏴‍☠️', col: '#8ab0d0', loc: 'wilds', rec: 150, fid: 'merc', role: 'duelist', aff: ['relentless', 'leech'], sk: ['charge', 'breaker', 'whirl'],
      bio: '七海最凶的女海盗，船沉了三次都没死。她上岸只为一件事——传说中“把人头当宝石”的食人魔，一定藏着宝藏。', cond: S => !!(S.bosses && S.bosses.wilds), need: '击败兽牙荒原的霸主',
      rumor: '荒原上来了一群晒得黝黑的水手。「女王说，能砍下女酋脑袋的家伙，宝藏一定不少。」', lines: ['宝藏在哪儿？', '哈！有点意思！', '船长从不认输——'] },
    { id: 'plague', n: '塞西莉亚·鸦喙', t: '瘟疫医生', ic: '🐦‍⬛', col: '#a0c080', loc: 'swamp', rec: 240, fid: 'inquisitor', role: 'healer', aff: ['regen', 'volatile'], sk: ['leap', 'breaker'],
      bio: '戴着鸦喙面具的女医生，走过十二座被瘟疫吞没的城。她认为“食人魔症”是一种病，而她有治疗方案：切除病灶——你的头。', cond: S => ((S.stats && S.stats.kills) || 0) >= 60, need: '累计放倒 60 人',
      rumor: '黑沼边的草药铺挂出了告示：「诊断：食人魔症。病例：60 例以上。处方：面谈。」落款是一只乌鸦。', lines: ['别怕，只是一场小手术。', '症状比预想的严重。', '病灶……切除失败……'] },
    { id: 'champion', n: '凯丝·雷鸣', t: '王都竞技场不败冠军', ic: '🏆', col: '#ffd060', loc: 'capital', rec: 380, fid: 'knight', role: 'brute', aff: ['frenzy', 'iron'], sk: ['leap', 'charge', 'breaker', 'whirl'],
      bio: '竞技场三百一十七连胜，从没有对手活着走下擂台。她厌倦了人类对手——听说有精英倒在你手里，她亲自下了战书。', cond: S => nEl(S) >= 2, need: '击败任意 2 名精英',
      rumor: '一封盖着雷纹火漆的战书钉在洞口：「听说你赢了两场。我赢了三百一十七场。来。」', lines: ['第三百一十八场！', '好拳！再来！', '……原来输是这种感觉。'] },
    { id: 'sand', n: '伊索德·沙暴', t: '沙海商队女王', ic: '🐪', col: '#e0b070', loc: 'wilds', rec: 520, fid: 'huntress', role: 'skirm', aff: ['phantom', 'relentless'], sk: ['leap', 'charge', 'whirl'],
      bio: '掌控东方沙海所有商路的女王，传说她能在沙暴里看清一里外的影子。你劫掠过的商队太多了——账单终于递到了她桌上。', cond: S => ((S.stats && S.stats.trips) || 0) >= 8, need: '出猎 8 次',
      rumor: '驼铃声从荒原深处传来。「女王清点了损失：八次劫掠，货物全毁。她要亲自来收账。」', lines: ['账，该清了。', '沙暴会替我找到你。', '商路……留给你了。'] },
    { id: 'clock', n: '奥菲莉亚·千机', t: '发条机关大师', ic: '⚙️', col: '#c0a080', loc: 'fortress', rec: 700, fid: 'guard', role: 'juggernaut', aff: ['iron', 'volatile', 'regen'], sk: ['charge', 'breaker'],
      bio: '要塞所有的机关、吊桥和连弩都出自她手。她给自己装了一副发条骨架——“血肉太脆弱了”。她想拆开你，研究食人魔为什么不会累。', cond: S => !!(S.bosses && S.bosses.fortress), need: '击败铁盔要塞的霸主',
      rumor: '要塞的废墟里，齿轮还在转。一张图纸被风吹到你脚边：上面画着你的骨架，旁边写着「待拆解」。', lines: ['让我看看你的构造。', '齿轮咬合——完美。', '发条……松了……'] },
    { id: 'alch', n: '贝娅特丽丝·金秤', t: '炼金女大公', ic: '⚖️', col: '#ffe08a', loc: 'capital', rec: 900, fid: 'inquisitor', role: 'mage', aff: ['leech', 'regen'], sk: [],
      bio: '王国一半的金库是她的。她用炼金术把铅变成金，把人变成……别的东西。魂晶是她最想要的原料，而你手里的魂晶多得不正常。', cond: S => ((S.stats && S.stats.earned) || 0) >= 20000, need: '累计获得 20000 魂晶',
      rumor: '一个戴金边眼镜的管家来到洞口，递上一张估价单：「大公愿意收购您全部的魂晶——连同您本人。」', lines: ['一切都有价格。', '你的魂晶，成色不错。', '天平……倾斜了……'] },
    { id: 'thief', n: '伊芙琳·千丝', t: '盗贼行会之主', ic: '🕸️', col: '#b090d0', loc: 'abyss', rec: 1150, fid: 'assassin', role: 'assassin', aff: ['phantom', 'frenzy', 'leech'], sk: ['leap', 'whirl', 'breaker'],
      bio: '地下世界的蛛后，千条丝线连着王国每一个秘密。猎手们到处打听你的下落，这些消息全都经过她的手——她决定亲自去看看这个“大生意”。', cond: S => huEsc(S) >= 2 || huDead(S) >= 1, need: '让猎手逃脱 2 次，或斩杀 1 名猎手',
      rumor: '你的枕边出现了一根蛛丝，末端系着纸条：「猎手们逃回来时都在念叨你。我对你很感兴趣。」', lines: ['每根丝都通向你。', '秘密，总会被发现。', '……线断了。'] },
    { id: 'naga', n: '娜迦·翠鳞', t: '蛇母祭司', ic: '🐍', col: '#60d0a0', loc: 'forest', rec: 1400, fid: 'huntress', role: 'healer', aff: ['regen', 'leech', 'iron'], sk: ['charge', 'whirl'],
      bio: '精灵林最深处古蛇神殿的大祭司，比精灵更古老。女王的死惊醒了她——在蛇母的教义里，森林的主人被杀，凶手必须献给蛇神。', cond: S => !!(S.bosses && S.bosses.forest), need: '击败翠影精灵林的霸主',
      rumor: '女王死后的第七夜，林中的蛇全都朝着一个方向爬去——朝着你的洞。', lines: ['蛇神在看着你。', '褪下你的皮吧。', '蛇母……回归大地……'] },
    { id: 'valk', n: '布伦希尔德·寒鸦', t: '冰海女武神', ic: '🪽', col: '#a0d8ff', loc: 'fortress', rec: 1700, fid: 'knight', role: 'warcaller', aff: ['relentless', 'iron', 'frenzy'], sk: ['leap', 'charge', 'breaker', 'whirl'],
      bio: '从北方冰海来的女武神，只为迎接最英勇的亡魂。你斩下了一名猎手——她认为那名猎手死得英勇，而你，配得上一场真正的决斗。', cond: S => huDead(S) >= 1, need: '斩杀 1 名食人魔猎手',
      rumor: '寒鸦落满了洞口的枯树。一个声音从风里传来：「英勇的亡魂已经上路了。现在，轮到你。」', lines: ['为英灵殿而战！', '好一个对手！', '……英灵殿，在等我。'] },
    { id: 'pharaoh', n: '纳芙蒂·永眠', t: '黄金陵墓女法老', ic: '𓂀', col: '#f0c040', loc: 'abyss', rec: 2100, fid: 'guard', role: 'mage', aff: ['regen', 'iron', 'volatile'], sk: [],
      bio: '沉睡了三千年的女法老，深渊裂开时她的陵墓也一起醒了。她要找回被盗走的东西——她的头，三千年前被一个食人魔带走了。', cond: S => !!(S.bosses && S.bosses.abyss), need: '击败深渊裂隙的霸主',
      rumor: '裂隙深处升起一座金字塔。石壁上的象形文字只重复一句话：「把头还给我。」', lines: ['跪下，凡人。', '三千年了……', '再……睡一会儿……'] },
    { id: 'blade', n: '玲·墨染', t: '无名剑圣', ic: '🗡️', col: '#e0e0e0', loc: 'peak', rec: 2600, fid: 'dragonslayer', role: 'duelist', aff: ['relentless', 'phantom', 'frenzy'], sk: ['leap', 'charge', 'breaker', 'whirl'],
      bio: '来自东方的剑客，没有名字，只有一把墨色的刀。她走遍天下寻找值得拔刀的对手，已经十年没有拔过刀了。你打倒了六名精英——她的刀在鞘里鸣响。', cond: S => nEl(S) >= 6, need: '击败任意 6 名精英',
      rumor: '一片墨色的樱花落在你的刀刃上，刃口多了一道细细的缺口。有人在很远的地方试了你的刀。', lines: ['拔刀吧。', '……好刀。', '十年，值得。'] },
    { id: 'giant', n: '霍尔达·山心', t: '山巨人女王', ic: '⛰️', col: '#b0a090', loc: 'peak', rec: 3200, fid: 'merc', role: 'brute', aff: ['iron', 'regen', 'frenzy'], sk: ['leap', 'charge', 'breaker', 'whirl'],
      bio: '圣山本身就是她的王座。巨人一族和龙裔订过千年之约，共同守护云端。龙之主倒下的那一刻，山在震动——巨人女王醒了。', cond: S => !!(S.bosses && S.bosses.peak), need: '击败龙骨圣山的霸主',
      rumor: '整夜地震不停，洞顶掉下来的碎石里夹着一块巨大的指甲。圣山在找你。', lines: ['渺小的东西。', '山，不会倒下。', '千年之约……到此为止。'] }
  ];
  const MOON = { id: 'moon', n: '塞勒涅·永夜', t: '月之魔女', ic: '🌙', col: '#d8d0ff', loc: 'peak', rec: 4200, fid: 'inquisitor', role: 'mage', aff: ['phantom', 'regen', 'leech', 'iron'], sk: ['leap', 'breaker'], final: 1,
    bio: '是她把你变成了食人魔。三百年前，她把诅咒刻进你的骨头：「去收集吧，收集到月亮满了为止。」你带回的每一颗首级，魂魄都流向了她的月亮。十三名精英倒下的那一夜，月亮终于满了——她来收取最后一颗：你的。',
    cond: S => nEl(S) >= 13, need: '击败全部 13 名精英', rumor: '月亮变成了血红色，每一颗首级都在同一时刻睁开了眼睛，望向天空。', lines: ['我的孩子，你做得很好。', '月亮已经满了。', '……原来，诅咒也会反噬。'] };
  const ALL = D.concat([MOON]); const BY = {}; ALL.forEach(d => BY[d.id] = d);

  function SS() { const S = S_(); S.el = S.el || { dead: {}, tries: {}, rec: {} }; S.el.rec = S.el.rec || {}; S.el.tries = S.el.tries || {}; return S.el; }
  const unlocked = d => { try { return !!d.cond(S_()) || !!(window.DevMode && !DevMode.off && DevMode.O && DevMode.O.unl); } catch (e) { return false; } };
  const HPOf = d => Math.round((window.FoeAbs && FoeAbs.on ? HP0 * FoeAbs.hpK(d.rec) : HP0) * (1.2 + 0.1 * d.aff.length) * (d.final ? 1.6 : 1));
  function odds(d) {
    if (!window.FoeAbs) return { p: 0.5, my: 0, her: 0 };
    const st = G_().st(), myD = 12 * FoeAbs.power() * (window.Gear2 ? Gear2.avgMul() : 1), herHp = HPOf(d), herD = FoeAbs.REF(d.rec) * 0.13 * (1 - Math.min(0.5, (st.def || 0) / ((st.def || 0) + 300))) * (1 - ((window.Gear2 && Gear2.sum().dr) || 0) / 100);
    const my = Math.max(1, Math.ceil(herHp / myD)), her = Math.max(1, Math.ceil(st.maxHp / Math.max(1, herD))), ratio = her * 2 / my;
    return { p: Math.max(0.01, Math.min(0.99, ratio * ratio / (1 + ratio * ratio))), my, her, hp: herHp };
  }
  function recFor(d, loc) {
    const s = SS();
    if (!s.rec[d.id]) { const h = RPG.foe(S_(), loc, (Math.imul(ALL.indexOf(d) + 101, 2654435761) ^ 0xe11e) >>> 0, G_().usedNames, G_().usedSig); s.rec[d.id] = { c: Object.assign({}, h.c), look: h.look }; }
    const r = s.rec[d.id]; return { c: Object.assign({}, r.c, { id: d.fid, idN: d.t, title: d.t, name: d.n, rar: 4 }), look: r.look, elite: d.id, story: d.bio };
  }

  // ================= 挑战流程 =================
  let pend = null, E = null; // E = { id, node, fo, prev, t0, done }
  function challenge(id) {
    const d = BY[id]; if (!d || !unlocked(d) || SS().dead[id]) return;
    if (window.Worlds && Worlds.active) { G_().toast('先回到洞里再发起挑战', '#ffb080', 1.6); return; }
    pend = id; SS().tries[id] = (SS().tries[id] || 0) + 1; toggle(false);
    try { UI._startTrip(d.loc); } catch (e) { console.warn('Elite start', e); pend = null; }
  }
  async function toArena(id) {
    const W = Worlds._W; if (!W || !Worlds._debug || !Worlds._debug.goto) return;
    const d = BY[id], g = W.graph, cur = g.nodes[W.cur];
    const node = { i: g.nodes.length, x: Math.min(148, cur.x + 10), y: Math.max(4, cur.y - 8), region: cur.region, loc: cur.loc, style: cur.style, size: 'm', R: 24, name: d.final ? '月蚀祭坛' : d.t + '的决斗场', seed: (Math.random() * 4294967296) >>> 0,
      adj: [W.cur], depth: cur.depth, visited: false, known: true, home: false, stone: false, boss: false, lay: 'plain', eliteArena: id };
    node.prey = [recFor(d, cur.loc)]; node.chests = []; node.loot = [];
    g.nodes.push(node); E = { id, node: node.i, fo: null, prev: W.cur, t0: performance.now(), done: false };
    const fr = window.__forceRole, fa = window.__forceAff; window.__forceRole = d.role; window.__forceAff = d.aff;
    try { await Worlds._debug.goto(node.i); } finally { window.__forceRole = fr; window.__forceAff = fa; }
    banner(d.ic + ' ' + d.n, '「' + d.t + '」 · 推荐战力 ' + d.rec, d.final ? '月亮已经满了。' : '决斗场的门已经封死——她倒下，或者你倒下。', d.col);
    try { SFX.roar && SFX.roar(0.9); } catch (e) { }
  }
  function wrap() {
    if (window.Foe && !Foe.__el) {
      const p0 = Foe.populate;
      Foe.populate = async function (ctx, list) {
        const out = await p0.apply(this, arguments);
        try {
          const W = window.Worlds && Worlds._W, node = W && W.graph && W.graph.nodes[W.cur];
          if (E && node && node.eliteArena && out) for (const fo of out) if (fo.h && fo.h.elite) {
            const d = BY[fo.h.elite]; fo.absRec = d.rec; fo.eliteId = d.id; fo.maxHp = fo.hp = HPOf(d); fo.iq = 1.3; fo.tier = 1; fo.brave = true; fo.seen = true; fo.state = 'chase'; fo.cd = 1.5;
            fo.dmgMul = (fo.dmgMul || 1) * (d.final ? 1.35 : 1.2); fo.skPool = d.sk.length ? d.sk : null; fo.skCd = 2; E.fo = fo; setTimeout(() => { try { Foe.say(fo, d.lines[0], d.col); } catch (e) { } }, 1200);
          }
        } catch (e) { console.warn('Elite boost', e); }
        return out;
      };
      Foe.__el = 1;
    }
    if (window.Worlds && !Worlds.__el) {
      const k0 = Worlds.onKey; Worlds.onKey = function (e) {
        const W = Worlds._W;
        if (on() && E && !E.done && W && W.cur === E.node && e.code === 'KeyE' && !e.repeat && W.doorNear && E.fo && !E.fo.dead) { G_().toast(`🔒 ${BY[E.id].n} 挡在门前——决斗还没结束！`, '#ff9070', 1.8); return true; }
        return k0.apply(this, arguments);
      };
      Worlds.__el = 1;
    }
    if (window.Explore && Explore.checkVictory && !Explore.__v2) {
      const c0 = Explore.checkVictory; Explore.checkVictory = function () { if (!vOn()) return c0.apply(this, arguments); const S = S_(); if (S.won) return false; if (victoryState().all) { S.won = Date.now(); return true; } return false; };
      Explore.__v2 = 1;
    }
  }
  function tick() {
    if (!on() || !window.G || !G.S) return;
    const W = window.Worlds && Worlds.active && Worlds._W;
    if (!W) { E = null; if (hud) hud.style.display = 'none'; return; }
    if (pend && !W.busy && W.graph && W.graph.nodes[W.cur]) { const id = pend; pend = null; toArena(id).catch(e => console.warn('Elite arena', e)); return; }
    if (E && !E.done && E.fo) {
      const d = BY[E.id], fo = E.fo;
      if (fo.dead && !fo.escaped) {
        E.done = true; SS().dead[d.id] = Date.now(); const c = Math.round(d.rec * 15); try { G.addCoins && G.addCoins(c); if (W.trip) W.trip.coins += c; } catch (e) { }
        let loot = ''; try { if (window.Gear2 && Gear2.dropFor) loot = Gear2.dropFor(d.rec, 5, fo.pos, d.id); } catch (e) { }
        banner('☠ ' + d.n + ' 倒下了', d.lines[d.lines.length - 1], `+${c}🔮${loot ? ' · 掉落 ' + loot : ''} · 精英 ${nEl(S_())}/13 · 带走她的首级`, d.col); try { G.save(); } catch (e) { }
      }
      drawHud(W, d, fo);
    } else if (hud) hud.style.display = 'none';
  }

  // ================= UI =================
  let hud = null, banEl = null, pn = null;
  function css() {
    if (css.done) return; css.done = 1; const s = document.createElement('style'); s.textContent = `
#elHud{position:fixed;top:58px;left:50%;transform:translateX(-50%);width:min(560px,72vw);z-index:34;pointer-events:none;text-align:center;color:#fff;text-shadow:0 1px 4px #000;display:none}
#elHud .n{font-size:17px;font-weight:900;letter-spacing:2px}#elHud .t{font-size:11.5px;opacity:.85}#elHud .hp{height:10px;background:#0009;border:1px solid #fff5;border-radius:5px;overflow:hidden;margin:4px 0}#elHud .hp i{display:block;height:100%;background:linear-gradient(90deg,#8a2a9a,#e070ff)}
#elBan{position:fixed;top:30%;left:50%;transform:translate(-50%,-50%);z-index:35;pointer-events:none;opacity:0;transition:opacity .5s;text-align:center;color:#fff;text-shadow:0 2px 12px #000;padding:16px 40px;background:radial-gradient(ellipse at center,#0a0612e8 30%,#0a061200 72%)}
#elBan.on{opacity:1}#elBan .a{font-size:27px;font-weight:900;letter-spacing:3px}#elBan .b{font-size:15px;margin:4px 0;color:#f0e0ff}#elBan .c{font-size:13px;color:#d8c8e8}
#elPn{position:fixed;inset:4% 5%;z-index:66;background:rgba(10,8,16,.96);border:1px solid #8a70c088;border-radius:14px;color:#eee;font:13px/1.55 inherit;overflow:auto;padding:14px 18px;display:none}
#elPn.on{display:block}.elp-h{display:flex;gap:12px;align-items:baseline;margin-bottom:8px}.elp-h b{font-size:18px;color:#d8c0ff}.elp-h span{flex:1;opacity:.8}.elp-h i{cursor:pointer;font-style:normal;font-size:18px}
.elp-v{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 12px;padding:8px 10px;border-radius:10px;background:#ffffff0c}.elp-v div{min-width:150px}.elp-v b{font-size:15px}.elp-v .ok{color:#9fe89f}.elp-v small{display:block;opacity:.7}
.elp-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:10px}.elp-c{border:1px solid var(--c);border-radius:10px;padding:9px 11px;background:linear-gradient(160deg,#ffffff0a,#0000);position:relative}
.elp-c.lock{border-color:#555;background:#0003}.elp-c.dead{opacity:.55;filter:grayscale(.6)}.elp-c.final{grid-column:1/-1;border-width:2px;background:linear-gradient(160deg,#6050a022,#0000)}
.elp-n{font-size:15.5px;font-weight:800;color:var(--c)}.elp-c.lock .elp-n{color:#999}.elp-t{opacity:.8;font-size:12px}.elp-s{display:flex;gap:10px;flex-wrap:wrap;margin:3px 0}.elp-o .bar{height:6px;background:#0008;border-radius:3px;overflow:hidden;margin:2px 0}.elp-o .bar i{display:block;height:100%;background:linear-gradient(90deg,#c04040,#e0c040,#60c060)}
.elp-c p{margin:4px 0;font-size:12.5px;color:#ddd}.elp-r{color:#c8b8e8!important;font-style:italic}.elp-need{font-size:12px;color:#ffb080}.elp-need.ok{color:#9fe89f}
.elp-c button{margin-top:5px;padding:5px 14px;border-radius:7px;border:1px solid var(--c);background:#ffffff14;color:#fff;font:600 13px inherit;cursor:pointer}.elp-c button:hover{background:#ffffff26}.elp-c button[disabled]{opacity:.4;cursor:default}`;
    document.head.appendChild(s);
  }
  function banner(a, b, c, col) { css(); if (!banEl) { banEl = document.createElement('div'); banEl.id = 'elBan'; document.body.appendChild(banEl); } banEl.innerHTML = `<div class="a" style="color:${col || '#fff'}">${esc(a)}</div><div class="b">${esc(b)}</div><div class="c">${esc(c)}</div>`; banEl.classList.add('on'); clearTimeout(banEl._t); banEl._t = setTimeout(() => banEl.classList.remove('on'), 5200); }
  function drawHud(W, d, fo) {
    css(); if (!hud) { hud = document.createElement('div'); hud.id = 'elHud'; document.body.appendChild(hud); }
    if (fo.dead || W.cur !== E.node) { hud.style.display = 'none'; return; }
    const o = odds(d); hud.style.display = 'block';
    hud.innerHTML = `<div class="n" style="color:${d.col}">${d.ic} ${esc(d.n)}</div><div class="t">「${esc(d.t)}」 · 精英 · 推荐战力 ${d.rec} vs 你 ${G_().st().power} · 胜率约 ${Math.round(o.p * 100)}%</div><div class="hp"><i style="width:${Math.max(0, fo.hp / fo.maxHp * 100)}%"></i></div><div class="t">${Object.keys(fo.aff || {}).map(k => window.FoeAI2 && FoeAI2.AFF[k] ? FoeAI2.AFF[k].ic + FoeAI2.AFF[k].n : k).join(' · ')} · 🔒 门已封锁</div>`;
  }
  function victoryState() {
    const S = S_(), b = nB(S), el = nEl(S), h = huDead(S), m = !!(S.el && S.el.dead && S.el.dead.moon);
    return { b, el, h, m, all: b >= 7 && el >= 13 && h >= 4 && m };
  }
  function card(d) {
    const s = SS(), dead = !!s.dead[d.id], un = unlocked(d), o = odds(d), mp = G_().st().power;
    const cls = ['elp-c', dead ? 'dead' : '', !un ? 'lock' : '', d.final ? 'final' : ''].join(' ');
    if (!un) return `<div class="${cls}" style="--c:${d.col}"><div class="elp-n">🔒 ？？？ ${d.final ? '· 最终' : ''}</div><div class="elp-t">「${esc(d.t)}」 · 推荐战力 ${d.rec}</div><p class="elp-r">传闻：${esc(d.rumor)}</p><div class="elp-need">解锁条件：${esc(d.need)}</div></div>`;
    return `<div class="${cls}" style="--c:${d.col}"><div class="elp-n">${d.ic} ${esc(d.n)}${dead ? ' ☠ 已斩杀' : ''}</div><div class="elp-t">「${esc(d.t)}」 · 决斗场：${esc((Lore.LOCS.find(l => l.k === d.loc) || {}).n || d.loc)}</div>
<div class="elp-s"><span>推荐战力 <b>${d.rec}</b></span><span>你 <b style="color:${mp >= d.rec ? '#9fe89f' : '#ff8a7a'}">${mp}</b></span><span>血量 ${o.hp}</span></div>
${dead ? '' : `<div class="elp-o"><div class="bar"><i style="width:${Math.round(o.p * 100)}%"></i></div>预估胜率 <b>${Math.round(o.p * 100)}%</b> · 你约 ${o.my} 刀 · 她约 ${o.her} 下打倒你</div>`}
<p>${esc(d.bio)}</p><div class="elp-need ok">✔ ${esc(d.need)}</div><div class="elp-t">词缀：${d.aff.map(k => window.FoeAI2 && FoeAI2.AFF[k] ? FoeAI2.AFF[k].ic + FoeAI2.AFF[k].n : k).join(' · ')}${s.tries[d.id] ? ' · 挑战 ' + s.tries[d.id] + ' 次' : ''}</div>
${dead ? '' : `<button data-ch="${d.id}" ${window.Worlds && Worlds.active ? 'disabled' : ''}>⚔ 挑战${window.Worlds && Worlds.active ? '（回洞后）' : ''}</button>`}</div>`;
  }
  function panelHTML() {
    const v = victoryState(), S = S_();
    return `<div class="elp-h"><b>👑 精英挑战 · 征服之路</b><span>满足条件解锁精英；挑战 = 出猎到她的地区并进入决斗场（门封锁到分出胜负）。胜率按你当前战力/生命预估。</span><i data-x>✕</i></div>
<div class="elp-v"><div>🏰 地区霸主 <b class="${v.b >= 7 ? 'ok' : ''}">${v.b}/7</b><small>任意 7 个地区</small></div><div>👑 精英 <b class="${v.el >= 13 ? 'ok' : ''}">${v.el}/13</b><small>本面板</small></div><div>🏹 食人魔猎手 <b class="${v.h >= 4 ? 'ok' : ''}">${v.h}/4</b><small>U 查看</small></div><div>🌙 月之魔女 <b class="${v.m ? 'ok' : ''}">${v.m ? '✔' : '✘'}</b><small>最终</small></div><div style="flex:1;min-width:200px"><b>${v.all ? '🎉 全部达成！回到洞里即胜利' : '胜利目标'}</b><small>斩下 7 名霸主、13 名精英、4 名猎手与月之魔女——带回她们的首级。</small></div></div>
<div class="elp-g">${D.map(card).join('')}${card(MOON)}</div>`;
  }
  function toggle(v) {
    css(); if (!pn) { pn = document.createElement('div'); pn.id = 'elPn'; document.body.appendChild(pn); pn.addEventListener('click', e => { if (e.target.closest('[data-x]')) toggle(false); const b = e.target.closest('[data-ch]'); if (b && !b.disabled) challenge(b.dataset.ch); }); ['mousedown', 'pointerdown', 'wheel'].forEach(ev => pn.addEventListener(ev, e => e.stopPropagation())); }
    const open = v == null ? !pn.classList.contains('on') : v; if (open) pn.innerHTML = panelHTML(); pn.classList.toggle('on', open);
    try { if (open) G.setUI(true); else { G.setUI(false); if (!(window.Worlds && Worlds.active)) G.lockPointer && G.lockPointer(); } } catch (e) { }
  }
  addEventListener('keydown', e => { if (!on() || !window.G || !G.S) return; if (e.code === 'KeyC' && !e.repeat) { e.preventDefault(); toggle(); } else if (e.code === 'Escape' && pn && pn.classList.contains('on')) { e.stopImmediatePropagation(); toggle(false); } }, true);
  // 新解锁提示（剧情传闻）
  let known = null;
  setInterval(() => {
    if (!on() || !window.G || !G.S) return; const s = SS(); s.seen = s.seen || {};
    for (const d of ALL) if (!s.seen[d.id] && !s.dead[d.id] && (() => { try { return d.cond(G.S); } catch (e) { return false; } })()) { s.seen[d.id] = Date.now(); banner('📜 新的挑战：' + d.n, '「' + d.t + '」', d.rumor + '（C 打开精英挑战）', d.col); try { G.save(); } catch (e) { } break; }
  }, 3000);

  wrap(); setTimeout(wrap, 0); addEventListener('load', wrap);
  setInterval(() => { try { wrap(); tick(); } catch (e) { console.warn('Elite tick', e); } }, 150);
  return { on, D, MOON, ALL, BY, SS, odds, unlocked, challenge, toggle, victoryState, get E() { return E; }, _toArena: toArena };
})();
