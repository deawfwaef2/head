// R35b MOD arrival2（默认开）：进入地点时的大窗口 —— 更大、剧情更详细、任务更多。
//  - 取代 RegionQuest 的 8 秒小卡片（#rqCard 隐藏）；窗口使用游戏原生 .modal（ui3a 金框），洞口节点是安全区，所以窗口阻塞不影响战斗。
//  - 剧情：到达场景（长）+ 地区往事 + “他们怎么看你”（按来访次数/霸主是否已死/仇恨动态生成）+ 一条随机传闻，逐字打出（点击跳过）。
//  - 任务：主线（RegionQuest 的任务）+ 2 条随机支线（搜刮容器/深入/背首级/稀有首级/搜尸）+ 威胁一览（霸主、小BOSS、猎手）。
//  - 支线在左侧追踪（#rqTrack 下方），完成给魂晶，并有机会掉一件饰品（gear2）。
window.Arrival2 = (() => {
  const on = () => !window.Mods || Mods.on('arrival2');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const LOC = k => Lore.LOCS.find(l => l.k === k);
  const TX = {
    village: {
      scene: '你从山坡上的灌木丛里探出头。雾溪村就在脚下——三十来户人家，屋顶上飘着炊烟，麦田一直铺到河边。磨坊的水车吱呀吱呀地转，几个女人蹲在溪边捶衣服，笑声顺着风飘上来。一条黄狗突然抬起头，朝你的方向嗅了嗅，喉咙里滚出一声低吼，又夹着尾巴缩回了篱笆后面。',
      lore: '雾溪村建在一条从不结冰的溪流边，据说是因为溪底埋着一位古代圣女的遗骨。村里的老人们每年秋收都会往溪里撒一把麦子，“替圣女吃饭”。一百年前，这里出过一位屠魔的女英雄；她的石像现在还立在村口，只是鼻子已经被孩子们摸得发亮。',
      rumors: ['磨坊主的女儿说，她在麦田里捡到过一颗比拳头还大的獠牙。', '村口石像的眼睛最近总是湿的，老人们说那是英雄在哭。', '镇上来的税吏说，王都已经在悬赏食人魔的脑袋了——赏金够买下整个村子。'] },
    forest: {
      scene: '古树的根比你的腰还粗，盘在地上像一条条睡着的蛇。头顶的树冠把天空遮得严严实实，只有零星的月光漏下来，照出空气里飘浮的花粉。远处有竖琴声，很轻，时断时续。你踩断了一根枯枝——整片林子的虫鸣在同一瞬间停了下来。',
      lore: '精灵林比人类的王国还要古老。精灵们相信每棵树里都住着一位祖先的灵魂，砍倒一棵树就等于杀死一个人。她们的女王已经统治了八百年，据说她能听见林子里每一片叶子落地的声音——包括你的脚步。',
      rumors: ['林子边缘的猎户说，精灵的箭从来不会射偏，除非她们想让你活着回去报信。', '月圆之夜，树城会点起一千盏萤火灯，所有的精灵都会去看女王跳舞。', '有个精灵游侠在找一头“脖子上挂满头颅的怪物”——她说要替妹妹报仇。'] },
    wilds: {
      scene: '风沙打在脸上像砂纸。荒原一眼望不到头，只有几根巨大的兽骨图腾歪歪斜斜地插在地上，挂着褪色的彩布条。远处的帐篷群冒着黑烟，战鼓声一阵紧过一阵。一只秃鹫落在最近的图腾上，歪着头看了你很久，好像在估算你还能活多久。',
      lore: '兽牙荒原上的部落从不耕种，她们只相信刀和牙。每个部落的女酋长都是用拳头打上位的，输的人要把自己的一颗牙齿献给赢家。现在的裂牙女酋脖子上挂着四十七颗牙——荒原上的每个人都知道那串项链的故事。',
      rumors: ['部落的萨满在火堆里看见了一只“吃魂的巨兽”，她们开始日夜磨刀。', '荒原深处有一座倒塌的古城，据说城里还埋着前一个食人魔的骨头。', '女酋长放出话来：谁能带回食人魔的獠牙，谁就能娶她的妹妹——或者嫁给她的弟弟。'] },
    abbey: {
      scene: '修道院的钟楼在暮色里像一根白骨。晚祷的钟声刚刚敲过第三下，彩窗里透出温暖的烛光，唱诗班的歌声从石墙里渗出来。院门前的石阶上刻满了祷文，你踩上去的时候，那些字好像微微发烫。门楣上的石雕天使低着头，手里的剑正对着你的脑袋。',
      lore: '圣光修道院建在一场大瘟疫的万人坑上。第一代院长用圣水洗净了这片土地，从此这里的修女不怕任何诅咒。她们把食人魔画在壁画的最底层，被圣光烧成灰烬——你是那幅画的原型之一，只是画家把你画丑了。',
      rumors: ['修女们在圣水里加了银粉，据说能烫伤任何不洁之物。', '审判官维罗妮卡的锤子上刻着一百个名字，最新的一个位置还空着。', '有个年轻的修女偷偷在忏悔室里说，她梦见食人魔在月光下哭。'] },
    swamp: {
      scene: '空气又湿又重，每吸一口都带着腐烂的甜味。黑色的水面上浮着一层绿油油的浮萍，偶尔冒出一个大泡，破开时发出一声叹息般的咕嘟。枯树上挂满了稻草人偶和骨头风铃，风一吹就叮叮当当地响。远处的高脚屋里亮着紫色的火光，有人在唱一首没有歌词的歌。',
      lore: '黑沼的魔女们不属于任何王国。她们用沼气熬药，用骨头占卜，用眼泪酿酒。传说第一位魔女是被村民赶进沼泽的草药师，她活了下来，并且学会了沼泽的语言。现在的魔女们每年都会从周围的村子里“借”走一个孩子——还回来的时候，孩子总会多学会一点什么。',
      rumors: ['魔女们的大锅里缺一味药材：“一颗还在思考的头”。', '沼泽深处有一座沉没的神殿，只有在血月的时候才会浮出水面。', '有人看见伯爵夫人卡米拉在沼泽边办宴会，客人们都没有影子。'] },
    fortress: {
      scene: '要塞像一块黑色的铁砧压在山口上。城墙高得要仰起脖子才能看到顶，垛口后面一排排的弩机正在缓缓转动。号角声从塔楼上响起，城门后传来铁靴整齐的踏步声。城墙上挂着一排生锈的铁笼——有几个笼子里还剩着骨头，其中一副的头骨上长着和你一样的獠牙。',
      lore: '铁盔要塞守卫边境三百年，从未失守。它的城墙里掺了龙骨粉，据说连攻城锤都砸不开。要塞的女骑士团只收孤儿，每个人都要在入团那天对着城墙发誓：“我的血属于这堵墙。”她们确实做到了——墙根的泥土至今还是红色的。',
      rumors: ['要塞的铁匠在打造一副“能锁住食人魔的脚镣”，据说已经打坏了三副。', '女骑士团长发誓要把你的头挂在城门上，“和上一个挂在一起”。', '城墙下的酒馆里，佣兵们在打赌你能活到哪一天。'] },
    capital: {
      scene: '王都的城墙上挂满了金色的旗帜，舞会的音乐从宫殿的方向飘过来，混着烤肉和香水的味道。大街上挤满了穿丝绸的贵族和穿破布的乞丐，马车的铃铛声响个不停。一张褪了色的悬赏令被风吹到你脚边——上面画的是你，画得不太像，赏金那一栏的数字后面多了两个零。',
      lore: '金冠王都是这片大陆上最富有的城市。它的公主据说是世上最美的人，她的首级能换十年的魂火——至少洞里的魂火是这么告诉你的。王都的暗巷里藏着比精灵林更深的秘密：刺客、密探、炼金术士，每个人都在等一个机会。',
      rumors: ['王室的密探已经在打听“洞穴”的位置了。', '公主的舞会上少了一位客人——据说是被一个“很高的影子”带走的。', '炼金术士公会出高价收购食人魔的血，说是能做长生不老药。'] },
    abyss: {
      scene: '大地在这里裂开了一道伤口。熔岩在裂缝深处翻滚，把岩壁照成暗红色，硫磺味呛得你眼睛发疼。一座用巨人肋骨搭成的桥横跨在深渊上方，桥面上刻满了扭曲的符文。深处有什么东西在笑——那笑声很轻，很近，好像就贴在你的后颈上。',
      lore: '深渊裂隙是一千年前一场神战留下的伤疤。战败的魔族被封印在裂隙底部，直到十年前封印出现了裂缝。现在魔族们正一个接一个地爬上来，她们的首级燃烧着地狱的火焰——洞里的魂火最喜欢这种燃料，每次闻到都会兴奋地跳起来。',
      rumors: ['裂隙底部的封印每天都在变薄，有人听见下面传来敲门声。', '一个折翼的天使在骸骨桥上徘徊，她说她在等“那个会把她的头带走的人”。', '魔族们在传说一个古老的预言：“獠牙之王将统治深渊。”她们不确定那是不是在说你。'] },
    peak: {
      scene: '你翻过最后一根古龙肋骨，眼前豁然开朗。云海在脚下翻涌，远处的山巅上矗立着一座白玉神殿，在阳光下亮得刺眼。风很冷，带着冰雪和檀香的味道。神殿前的台阶上跪着几个穿白袍的巫女，她们同时抬起头，同时看向你——然后同时站了起来，拔出了剑。',
      lore: '龙骨圣山是众神的阶梯，也是最后一条巨龙的坟墓。巫女们世世代代守护着龙骨，等待巨龙重生的那一天。她们说，只有斩杀过七位女王的勇者才能登上山顶——她们没说“勇者”不能是食人魔。',
      rumors: ['山顶的神殿里供奉着一颗龙的心脏，据说它还在跳动。', '屠龙者西格丽德说，她只差一枚食人魔的獠牙就能凑齐一副项链。', '巫女们在唱一首古老的歌谣：“当獠牙登上圣山，月亮将会流血。”'] }
  };
  const GEN = { scene: '你踏上了一片陌生的土地。空气里有血和铁的味道，远处传来人声。', lore: '这里的故事，还没有人讲给你听。', rumors: ['据说这里的人从来没见过食人魔。'] };

  // ================= 支线 =================
  const SQ = {
    loot: { n: q => `搜刮 ${q.n} 个容器`, why: '箱子、酒桶和武器架里常藏着好东西——包括饰品。', mk: () => ({ n: 3 + Math.floor(Math.random() * 3) }), prog: (q, W) => [Math.min(q.n, opened(W, false)), q.n] },
    corpse: { n: q => `搜 ${q.n} 具尸体`, why: '死人不需要口袋。', mk: () => ({ n: 2 + Math.floor(Math.random() * 2) }), prog: (q, W) => [Math.min(q.n, opened(W, true)), q.n] },
    deep: { n: q => `深入到第 ${q.n} 层`, why: '越深的地方，首级越值钱，守卫也越凶。', mk: W => ({ n: Math.max(2, Math.min(maxDepth(W), 2 + Math.floor(Math.random() * 3))) }), prog: (q, W) => [Math.min(q.n, T.deep), q.n] },
    heads: { n: q => `麻袋里同时装着 ${q.n} 颗首级`, why: '魂火饿了。', mk: () => ({ n: Math.max(1, Math.min(capNow(), 2 + Math.floor(Math.random() * 2))) }), prog: q => [Math.min(q.n, sackHeads().length), q.n] },
    rare: { n: () => '斩下一颗「英魂」以上的首级', why: '稀有的魂，烧得更久。', mk: () => ({}), prog: () => [sackHeads().some(h => h.c && h.c.rar >= 2) ? 1 : 0, 1] }
  };
  const opened = (W, corpse) => { let n = 0; for (const nd of (W.graph && W.graph.nodes) || []) for (const L of nd.loot || []) if (L && L.items && ((L.kind === 'corpse') === corpse) && L.kind !== 'vein') n++; return n; };
  const maxDepth = W => Math.max(2, ...((W.graph && W.graph.nodes) || []).map(n => n.depth || 0));
  const sackHeads = () => { try { return window.Sack && Sack.heads ? Sack.heads() : []; } catch (e) { return []; } };
  const capNow = () => { try { return G.st().cap || 2; } catch (e) { return 2; } };
  let T = null; // { k, side:[{t,q,done}], shown, deep }
  function SS() { const S = G.S; S.arr = S.arr || { v: {} }; S.arr.v = S.arr.v || {}; return S.arr; }
  function newTrip(W, k) {
    const keys = Object.keys(SQ).sort(() => Math.random() - 0.5).slice(0, 2), L = LOC(k);
    T = { k, shown: false, deep: 0, side: keys.map(t => ({ t, q: SQ[t].mk(W), done: false, coin: Math.round(L.rec * (1.2 + Math.random() * 0.8)), gear: Math.random() < 0.4 })) };
    SS().v[k] = (SS().v[k] || 0) + 1;
  }

  // ================= 窗口 =================
  let root = null, box = null, typing = null;
  function css() {
    if (css.done) return; css.done = 1; const s = document.createElement('style'); s.textContent = `
body.arr2 #rqCard{display:none!important}
#arRoot{position:fixed;inset:0;z-index:58;display:none;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 45%,rgba(20,8,10,.45),rgba(0,0,0,.88));backdrop-filter:blur(4px) brightness(.8);-webkit-backdrop-filter:blur(4px) brightness(.8)}
#arRoot.on{display:flex;animation:arIn .5s ease-out}@keyframes arIn{from{opacity:0}}
#arRoot .modal{width:min(1120px,94vw);max-height:92vh;overflow:auto;padding:0!important;box-sizing:border-box}
.ar-hero{position:relative;height:clamp(170px,30vh,290px);background-size:cover;background-position:center}
.ar-hero:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.1) 0%,transparent 35%,rgba(14,9,11,.75) 75%,#0e090b 100%)}
.ar-hx{position:absolute;left:34px;right:34px;bottom:16px;z-index:1}
.ar-tag{font-size:12px;letter-spacing:.5em;color:var(--lc);filter:brightness(1.4);text-shadow:0 1px 4px #000}
.ar-nm{font-family:var(--u-serif,serif);font-size:clamp(34px,5vw,54px);font-weight:900;letter-spacing:.2em;color:#fff;text-shadow:0 3px 18px #000,0 0 40px color-mix(in srgb,var(--lc) 40%,transparent);line-height:1.15}
.ar-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}.ar-chip{font-size:12px;font-weight:700;padding:3px 10px;background:rgba(0,0,0,.6);box-shadow:inset 0 0 0 1px currentColor;letter-spacing:.08em}
.ar-body{display:grid;grid-template-columns:1.35fr 1fr;gap:26px;padding:18px 34px 8px}
.ar-st p{font-size:15px;line-height:1.95;color:#e2d5bd;margin:0 0 12px;text-indent:2em}.ar-st p.lo{color:#c9bca4;font-size:14px}.ar-st p.you{color:#f0c8a8}.ar-st p.ru{text-indent:0;font-family:var(--u-serif,serif);font-style:italic;color:#c8b8e0;padding-left:12px;border-left:2px solid rgba(200,184,224,.4)}
.ar-st h5,.ar-q h5{font-family:var(--u-serif,serif);font-size:14px;letter-spacing:.3em;color:var(--u-gold,#e7c27a);margin:0 0 10px;padding-bottom:6px;background:linear-gradient(90deg,rgba(231,194,122,.5),transparent 70%) 0 100%/100% 1px no-repeat}
.ar-cur:after{content:'▍';color:var(--u-gold,#e7c27a);animation:arBl .8s steps(1) infinite}@keyframes arBl{50%{opacity:0}}
.ar-it{position:relative;padding:10px 12px 10px 14px;margin-bottom:9px;background:linear-gradient(90deg,color-mix(in srgb,var(--qc) 12%,rgba(0,0,0,.4)),rgba(0,0,0,.25));box-shadow:inset 3px 0 0 var(--qc)}
.ar-it .k{font-size:11px;letter-spacing:.3em;color:var(--qc);font-weight:800}.ar-it .n{font-size:15px;font-weight:800;color:#fff;margin:2px 0}.ar-it .w{font-size:12.5px;color:#bfae94;line-height:1.55}.ar-it .r{font-size:12px;color:#ffd88a;margin-top:3px}
.ar-th{font-size:12.5px;color:#cdbda3;line-height:1.75}.ar-th b{color:#fff}.ar-th .bad{color:#ff8a7a}.ar-th .ok{color:#9fe89f}
.ar-go{display:flex;align-items:center;justify-content:center;gap:16px;padding:10px 34px 26px}.ar-go button{min-width:280px;font-size:18px!important;letter-spacing:.3em!important;padding:13px 30px!important}.ar-go small{color:var(--u-dim,#a8977c);font-size:12px}
#arTrack{position:fixed;left:14px;z-index:34;max-width:300px;color:#f3e6cf;font-size:12.5px;line-height:1.55;background:linear-gradient(90deg,#120c08cc,#120c0800);padding:5px 16px 5px 10px;border-left:3px solid #9ab0c8;text-shadow:0 1px 3px #000;pointer-events:none;display:none}
#arTrack b{color:#d8e4f0}#arTrack .ok{color:#8fe080}#arTrack small{color:#bda88a}
@media (max-width:820px){.ar-body{grid-template-columns:1fr}}`;
    document.head.appendChild(s);
  }
  function ensure() {
    css(); if (root) return;
    root = document.createElement('div'); root.id = 'arRoot'; root.innerHTML = '<div class="modal big"></div>'; document.body.appendChild(root); box = root.firstChild;
    ['mousedown', 'pointerdown', 'wheel', 'contextmenu'].forEach(ev => root.addEventListener(ev, e => e.stopPropagation()));
    box.addEventListener('click', e => { if (e.target.closest('[data-argo]')) return close(); if (typing) finishType(); });
  }
  function youLine(k) {
    const S = G.S, v = SS().v[k] || 1, B = window.Explore && Explore.BOSSES[k], won = (S.bosses || {})[k], L = LOC(k), h = (S.h2 && S.h2.hate) || 0;
    const a = v <= 1 ? `这是你第一次踏进${L.n}。这里的人还没有听说过你——他们看你的眼神只有困惑，还没来得及害怕。` : v <= 3 ? `这是你第 ${v} 次来${L.n}。有人认出了你的轮廓，窗户一扇接一扇地关上，母亲们把孩子拖回了屋里。` : `这是你第 ${v} 次来${L.n}。这里已经没有人会问“那是什么”——他们在门槛上挂满了驱邪的骨头，在墙上画满了你的样子。`;
    const b = won ? `${B ? B.title + '·' + B.n : '霸主'}已经死在你手里，她的首级就挂在你的洞里。失去了主人的${L.n}人心惶惶，没有人再敢组织像样的抵抗。` : B ? `${B.title}·${B.n}还在最深处等着你。她听说了你的事，已经开始准备。` : '';
    const c = h >= 30 ? '你身上的血腥味太重了——你能感觉到，远处有几道视线正在穿过山谷，锁定你的方向。四名猎手，一个都没有忘记你。' : h >= 10 ? '猎手们的仇恨正在累积。你砍下的每一颗头，都在替她们指路。' : '';
    return [a, b, c].filter(Boolean).join('');
  }
  function threatHTML(k) {
    const S = G.S, B = window.Explore && Explore.BOSSES[k], won = (S.bosses || {})[k], RQ = window.RegionQuest, D = RQ && RQ.DATA && RQ.DATA[k];
    const minis = D ? D.minis.filter(m => !(S.rq && S.rq.minis && S.rq.minis[m.n])) : [];
    let hu = ''; if (window.Hunters2 && Hunters2.on() && Hunters2.alive().length) { const al = Hunters2.alive().map(d => d.id), top = al.map(id => [id, Hunters2.lvOf(id)]).sort((a, b) => b[1] - a[1])[0], d = Hunters2.BY[top[0]], o = Hunters2.odds(top[0]); hu = `<div>🏹 猎手 <b>${al.length}</b> 名仍在追踪你 · 最强 <b style="color:${d.col}">${esc(d.n)} Lv.${top[1]}</b>（胜率约 <span class="${o.p < 0.4 ? 'bad' : 'ok'}">${Math.round(o.p * 100)}%</span>）</div>`; }
    const el = window.Elites && Elites.on() ? Elites.ALL.filter(d => d.loc === k && !Elites.SS().dead[d.id] && Elites.unlocked(d)) : [];
    return `<div class="ar-th">${B ? `<div>👑 霸主 <b>${esc(B.title)}·${esc(B.n)}</b> ${won ? '<span class="ok">✓ 已被你斩杀</span>' : '<span class="bad">· 在最深处</span>'}</div>` : ''}
${minis.length ? `<div>⚔️ 小BOSS：${minis.map(m => `<b>${esc(m.title)}·${esc(m.n)}</b>`).join('、')}</div>` : ''}${hu}
${el.length ? `<div>👑 可挑战的精英：${el.map(d => `<b style="color:${d.col}">${esc(d.n)}</b>`).join('、')}（出洞选地点时在该地区栏里发起）</div>` : ''}</div>`;
  }
  function html() {
    const k = T.k, L = LOC(k), X = TX[k] || GEN, D = window.RegionQuest && RegionQuest.DATA && RegionQuest.DATA[k], img = window.RegionArt && RegionArt[k], st = G.st(), q = (L.rec ? st.power / L.rec : 1);
    const [dn, dc] = q < 0.45 ? ['必死无疑', '#ff2020'] : q < 0.7 ? ['九死一生', '#ff5a3a'] : q < 0.95 ? ['危险', '#ffa030'] : q < 1.4 ? ['势均力敌', '#ffe060'] : q < 2.2 ? ['轻松', '#8fe080'] : ['屠宰场', '#60d0ff'];
    const RT = window.RegionQuest && RegionQuest.T, main = RT && RT.q ? `<div class="ar-it" style="--qc:#e7c27a"><div class="k">主 线</div><div class="n">📜 ${esc(RegionQuest.mText(RT.q))}</div><div class="w">${esc(D ? D.why : '')}</div><div class="r">奖励 🔮${RT.q.coin}${(RT.q.mats || []).length ? ' + 地区材料' : ''}</div></div>` : '';
    const side = T.side.map(x => `<div class="ar-it" style="--qc:#9ab0c8"><div class="k">支 线</div><div class="n">${esc(SQ[x.t].n(x.q))}</div><div class="w">${esc(SQ[x.t].why)}</div><div class="r">奖励 🔮${x.coin}${x.gear ? ' + 一件饰品' : ''}</div></div>`).join('');
    const paras = [['', X.scene], ['lo', X.lore], ['you', youLine(k)], ...(window.RegionEcho ? RegionEcho.paras(k) /* R39 地区回响 */ : []), ['ru', '「' + X.rumors[Math.floor(Math.random() * X.rumors.length)] + '」']];
    return { h: `<div class="ar-hero" style="--lc:${L.color || '#e7c27a'};${img ? `background-image:url(${img})` : `background:${L.color}`}"><div class="ar-hx"><div class="ar-tag">${esc(D ? D.tag : '')}</div><div class="ar-nm">${L.icon || ''} ${esc(L.n)}</div>
<div class="ar-chips"><span class="ar-chip" style="color:${dc}">${dn}</span><span class="ar-chip" style="color:#e8dcc8">推荐战力 ${L.rec} · 你 ${st.power}</span><span class="ar-chip" style="color:#c8b8e0">第 ${SS().v[k] || 1} 次踏入</span></div></div></div>
<div class="ar-body"><div class="ar-st"><h5>抵 达</h5><div id="arText"></div></div><div class="ar-q"><h5>任 务</h5>${main}${side}<h5 style="margin-top:16px">威 胁</h5>${threatHTML(k)}${window.RegionEcho ? RegionEcho.arrHTML(k) : ''}</div></div>
<div class="ar-go"><button class="red" data-argo>踏入${esc(L.n)} ▶</button><small>空格 / E / 回车</small></div>`, paras };
  }
  function type(paras) {
    const el = box.querySelector('#arText'); let pi = 0, ci = 0; const ps = paras.map(([c]) => { const p = document.createElement('p'); p.className = c; el.appendChild(p); return p; });
    const step = () => { if (!typing) return; const [c, t] = paras[pi]; ci += 2; ps[pi].textContent = t.slice(0, ci); ps[pi].classList.add('ar-cur'); if (ci >= t.length) { ps[pi].classList.remove('ar-cur'); pi++; ci = 0; if (pi >= paras.length) { typing = null; return; } typing.t = setTimeout(step, 260); return; } typing.t = setTimeout(step, 22); };
    typing = { paras, ps }; step();
  }
  function finishType() { if (!typing) return; clearTimeout(typing.t); typing.paras.forEach(([c, t], i) => { typing.ps[i].textContent = t; typing.ps[i].classList.remove('ar-cur'); }); typing = null; }
  function open() {
    ensure(); const H = html(); box.innerHTML = H.h; box.scrollTop = 0; root.classList.add('on'); type(H.paras);
    try { G.setUI(true); SFX.open && SFX.open(); SFX.page && SFX.page(); } catch (e) { }
  }
  function close() { if (!root || !root.classList.contains('on')) return; finishType(); root.classList.remove('on'); try { G.setUI(false); G.lockPointer && G.lockPointer(); SFX.close && SFX.close(); } catch (e) { } }
  const isOpen = () => !!(root && root.classList.contains('on'));
  addEventListener('keydown', e => { if (!isOpen()) return; if (['Space', 'Enter', 'KeyE', 'Escape', 'NumpadEnter'].includes(e.code)) { e.preventDefault(); e.stopImmediatePropagation(); if (e.repeat) return; if (typing && e.code !== 'Escape') finishType(); else close(); } else if (!/^(F\d+)$/.test(e.code)) { e.stopImmediatePropagation(); } }, true);
  addEventListener('keyup', e => { if (isOpen()) e.stopImmediatePropagation(); }, true);

  // ================= 追踪 / 奖励 =================
  let trk = null;
  function track(W) {
    if (!trk) { css(); trk = document.createElement('div'); trk.id = 'arTrack'; document.body.appendChild(trk); }
    const rq = document.getElementById('rqTrack'), r = rq && rq.offsetParent ? rq.getBoundingClientRect() : null, top = r && r.height ? r.bottom + 6 : 132;
    if (!(window.HudTidy && HudTidy.on())) trk.style.top = top + 'px'; trk.style.display = 'block';
    trk.innerHTML = T.side.map(x => { const [a, b] = SQ[x.t].prog(x.q, W); return `🔹 <b>${esc(SQ[x.t].n(x.q))}</b> ${x.done ? '<span class="ok">✓</span>' : `<span>${a}/${b}</span>`}`; }).join('<br>') + `<br><small>支线奖励 🔮${T.side.reduce((s, x) => s + x.coin, 0)}${T.side.some(x => x.gear) ? ' + 饰品' : ''}</small>`;
    const hs = document.getElementById('h2Sense'); if (hs) hs.style.top = (top + trk.offsetHeight + 8) + 'px';
  }
  function tick() {
    if (document.body) document.body.classList.toggle('arr2', on()); if (!on() || !window.G || !G.S) return;
    const W = window.Worlds && Worlds.active && Worlds._W;
    if (!W || !W.graph || !W.graph.trip) { if (T) { T = null; if (trk) trk.style.display = 'none'; const hs = document.getElementById('h2Sense'); if (hs) hs.style.top = ''; } return; }
    const RT = window.RegionQuest && RegionQuest.T; const k = (RT && RT.k) || (W.graph.nodes[0] && W.graph.nodes[0].loc && W.graph.nodes[0].loc.k);
    if (!T && k) newTrip(W, k); if (!T) return;
    const nd = W.graph.nodes[W.cur]; if (nd && !nd.eliteArena && !nd.huntArena) T.deep = Math.max(T.deep, nd.depth || 0);
    if (!T.shown && !W.busy && W.B) {
      T.shown = true;
      setTimeout(() => { if (!T || (window.Elites && Elites.E) || (nd && nd.eliteArena)) return; const W2 = window.Worlds && Worlds._W; if (!W2 || W2.graph.arena || W2.graph.nodes[W2.cur].eliteArena) return; const go = () => { if (!T) return; if (window.Saga && Saga.cine) { setTimeout(go, 400); return; } open(); }; go(); }, 700); // R54m：用户最喜欢的到达大窗口回来了（剧情电影播完再弹）
    }
    for (const x of T.side) {
      if (x.done) continue; const [a, b] = SQ[x.t].prog(x.q, W);
      if (a >= b) {
        x.done = true; try { G.addCoins(x.coin); if (W.trip) W.trip.coins += x.coin; SFX.coins ? SFX.coins() : SFX.play && SFX.play('coins'); } catch (e) { }
        let g = ''; if (x.gear && window.Gear2 && Gear2.on()) try { g = Gear2.dropFor(LOC(T.k).rec, 1 + Math.floor(Math.random() * 2)); } catch (e) { }
        G.toast(`🔹 支线完成：${SQ[x.t].n(x.q)} · 🔮+${x.coin}${g ? ' · ' + g : ''}`, '#b8d0e8', 3.2);
      }
    }
    track(W);
  }
  setInterval(() => { try { tick(); } catch (e) { console.warn('Arrival2', e); } }, 200);
  return { on, TX, SQ, open, close, isOpen, get T() { return T; } };
})();
