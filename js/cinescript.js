// R59t cine_stage 剧本：把地区入场电影 / 宿敌插曲写成“多场景 + 特写 + 转场”的分镜（由 CineStage 播放）。
// 地区电影的演员全部是“这片土地上的人”（按地区/本趟种子生成，不在场上）——进图时看不到她们；
// 讨伐目标用她本人的 h（之后在地图里遇到的就是这张脸）。
window.CineScript = (() => {
  const G = () => window.G || window.__game;
  const D = () => window.SagaData || {};
  const fill = (tpl, c) => String(tpl).replace(/\{(\w+)\}/g, (m, k) => c[k] != null ? c[k] : m);
  const roleN = id => (window.Lore && Lore.ID && Lore.ID[id] && Lore.ID[id].n) || '女子';
  const LOC = k => (window.Lore && Lore.LOCS.find(l => l.k === k)) || (window.Lore && Lore.LOCS[0]) || { n: k, k };
  const L = (t, w, col, it, who) => ({ t, w: w || '', col: col || '', it: !!it, who: who || null });
  const hasW = n => !!(window.Assets && Assets.has && Assets.has(n));
  const M = (ic, t, fx, col) => ({ ic, t, fx, col }); // 每一幕的意义：这一幕讲什么 + 对游戏造成的影响
  const KATANA = 'antique_katana_01';
  function clipOf(id) {
    id = id || '';
    if (/witch|hexer|coven|alchem|herbal|shaman|druid|moonpriest|courtmage|saint|archangel|singer|choir|nun|succubus/.test(id)) return 'Spell_Simple_Idle_Loop';
    if (/knight|merc|guard|assassin|general|slayer|paladin|dragon|inquisitor|wolfwarrior|chieftess/.test(id)) return 'Sword_Idle';
    return 'Idle_FoldArms_Loop';
  }
  function woman(sg, id, name, salt) {
    const h = RPG.foe(G().S, LOC(sg.k), ((sg.seed || 7) ^ salt) >>> 0, new Set(), new Set());
    h.c = Object.assign({}, h.c, { name, id, idN: roleN(id) }); return h;
  }
  function targetH(sg) {
    if (sg.fo && sg.fo.h && sg.fo.f) return { h: sg.fo.h, body: sg.fo.f.bodyName };
    const node = sg.node; let h = node && node.sagaH;
    if (!h) { h = RPG.foe(G().S, (node && node.loc) || LOC(sg.k), (Math.random() * 4294967296) >>> 0, G().usedNames || new Set(), G().usedSig || new Set()); if (node) node.sagaH = h; }
    Object.assign(h.c, { name: sg.T.n, id: sg.T.id, idN: roleN(sg.T.id), title: sg.T.title, rar: sg.envoy ? 4 : 3 }); // 同 saga.js 注入时的写法
    return { h };
  }

  // ---- 台词库（具体，不迷幻）----
  const KNEEL = ['{W}蹲在{src}边，把手伸进去，又飞快地缩了回来。', '{W}用指尖抹过{src}边的石头，指尖上是一层发亮的灰。', '{W}把耳朵贴近地面。{sound}里，混着一个不该有的声音。', '{W}数了三遍。{beast}还是少了{num}只。', '{W}捡起一块石头丢进{src}，等了很久，没有听见回声。'];
  const W_OPEN = ['你来看。昨天还不是这样的。', '别碰它！……我刚才碰了一下，现在手还是凉的。', '{folk}都说是天意。我不信。', '你闻到了吗？{scent}的味道里，多了一股铁锈味。', '我在这儿守了一夜。天亮的时候，它就变成这样了。'];
  const W_PREV = ['上次{PT}的事之后，{L}安静了好几天。现在又……', '你还记得那头食人魔吗？它走了以后，我以为一切都结束了。'];
  const V_REPLY = ['小声点。{fac}说了，这事不许往外传。', '又是这样……上个月是{beast}，这个月是{src}。', '我奶奶说过，{L}上一次这样，是一百年前。', '我刚从{place}那边回来。那里……有灯。半夜还亮着。', '你别一个人待在这儿。天快黑了。'];
  const W_2 = ['……是{T}。我看见她半夜去了{place}。', '{Tt}{T}这几天，一句话都没跟人说过。', '你还记得{T}以前的样子吗？她会在{place}教孩子们唱歌。', '我跟着她走到{place}门口。她回头看了我一眼——就一眼。'];
  const V_2 = ['别说了。被她听见，我们都得——', '{T}？不可能。她救过我的命。', '……那我们该怎么办？去告诉{fac}？', '她看你的那一眼……是什么样的？'];
  const TDESC = ['{T}站在{place}，背对着所有人。', '{Tt}{T}。{L}的人提起她，都会先压低声音。', '她脚边的{craft}已经放坏了。她没有看一眼。', '{light}照不到{place}的那一头。她就站在那里。'];
  const T_MONO = ['{mot}……你们不会懂的。', '来吧。我在{place}等你。', '再等一晚。只要再等一晚，就够了。', '谁也别想把它从我手里拿走。'];
  const NEWS = ['它来了。那个腰上挂着首级的食人魔……进了{L}。', '你听见了吗？{sound}停了。……它来了。', '{folk}在敲钟。是那头食人魔——它进{L}了。'];
  const W_HOOK = ['也许……让它去{place}。让它去找{T}。', '如果那个怪物真要砍头……我希望它砍对人。', '别出声。它要找的不是我们——是{T}。'];
  const W_FEAR = ['……我们就这么看着？', '那{T}会怎么样？', '求求你，别让它看见我们。'];
  const FIN = ['{T}，{place}。就这么定了。', '她们怕我。很好——怕我的人，不会挡路。', '首级在{place}等我。走。', '先找到{T}。剩下的，路上再说。'];
  const HUNT = ['{L}。我闻得到它——血、铁锈，还有首级的味道。', '这一次，我不会再让它跑了。', '悬赏单上的价钱又涨了。很好。'];
  const HUNT2 = ['我数着你砍下的每一颗头，食人魔。', '跑吧。我喜欢追。', '你的脚印很新。你就在附近。'];
  // 最近播过的台词跨场次记着，下一部优先挑没听过的
  const RECENT = []; try { RECENT.push(...JSON.parse(localStorage.getItem('cs_recent') || '[]')); } catch (e) { }

  // ================= 地区入场电影 =================
  function region(sg, opt) {
    if (!window.RPG || !RPG.foe || !sg || !sg.T || !sg.W) return null;
    const r = sg.r || Math.random, pk = a => a[Math.floor(r() * a.length)], used = new Set();
    const pick = arr => { let a = arr.filter(x => !used.has(x) && !RECENT.includes(x)); if (!a.length) a = arr.filter(x => !used.has(x)); const v = pk(a.length ? a : arr); used.add(v); RECENT.push(v); while (RECENT.length > 70) RECENT.shift(); return v; };
    const A = sg.arch || {}, Lc = LOC(sg.k), REG = (D().REG || {})[sg.k] || {};
    const c = Object.assign({}, sg.ctx || {}, { W: sg.W.n, Wr: sg.W.role, V: sg.V, PT: (sg.prev && sg.prev.T) || '她', L: Lc.n }), f = t => fill(t, c);
    const vid = (REG.wit || []).find(x => x !== sg.W.id) || sg.W.id;
    const W = { h: woman(sg, sg.W.id, sg.W.n, 0x51ed), nm: sg.W.n, col: '#ffe0a8', clip: 'Idle_Loop' };
    const V = { h: woman(sg, vid, sg.V, 0x2b7f), nm: sg.V, col: '#c8e8ff', clip: 'Idle_FoldArms_Loop' };
    const th = targetH(sg), Tcol = sg.envoy ? '#d8d0ff' : '#ffc8c8';
    const T = { h: th.h, body: th.body, nm: sg.T.n, col: Tcol, clip: clipOf(sg.T.id) };
    if (T.clip === 'Sword_Idle' && hasW(KATANA)) T.wpn = KATANA;
    W.pair = V; V.pair = W;
    const actors = [W, V, T];
    let Hn = null;
    if (sg.hunterId && window.Hunters2 && Hunters2.BY[sg.hunterId]) {
      const d = Hunters2.BY[sg.hunterId]; let hh = null; try { hh = Hunters2.recFor(sg.hunterId, Lc); } catch (e) { }
      if (hh) { Hn = { h: hh, nm: d.n, col: d.col || '#ffd890', clip: 'Idle_FoldArms_Loop', d, id: sg.hunterId }; actors.push(Hn); }
    }
    const sp = (p, t) => L('“' + f(t).replace(/^“|”$/g, '') + '”', p.nm, p.col, false, p), nar = t => L(f(t), '', '#e8dcc6', true);
    const cardW = { k: '这 片 土 地 上 的 人', n: W.nm, t: roleN(sg.W.id), ch: [Lc.n], col: W.col };
    const cardV = { k: '另 一 位', n: V.nm, t: roleN(vid), ch: [], col: V.col };
    const cardT = { k: sg.envoy ? '月 之 使 者' : '讨 伐 目 标', n: T.nm, t: sg.T.title, ch: ['🎯 本次讨伐目标', roleN(sg.T.id)], col: Tcol };
    const kneel = pk(['Fixing_Kneeling', 'Crouch_Idle_Loop', 'Farm_Harvest']);
    const sA = { key: 'A', cap: c.src || Lc.n, sub: `${Lc.n} · ${c.sky || ''}`, cast: [W, V] };
    const sB = { key: 'B', cap: c.place || '远处', sub: '同 一 时 刻', cast: [T] };
    const beats = [];
    const ge = (opt && opt.ge) || '', be = (opt && opt.be) || '';
    const mTest = M('🗣', '当地人的证词指向成因', [`异变与「${T.nm}」有关`, '击败她才能让这里恢复原样'], Tcol);
    // —— 第一场：异变现场 ——
    beats.push({ mean: M('🌀', A.nm ? `异变「${A.nm}」的现场` : '这片土地出了问题', [be ? '本地区异变带来：' + be : '本地区出现了异变', '异变持续期间对你不利，击败成因即可解除'], '#ffe0a8'), scene: sA, shot: 'est', castFo: W, act: [[W, kneel]], card: { a: sg.vis <= 1 ? '初 访' : `第 ${sg.vis} 次 踏 入`, b: Lc.n, c: c.sky || '' }, lines: [nar(pick(A.sign || KNEEL))], min: 3.6, tag: (A.nm ? '异变 · ' + A.nm : '') });
    if (r() < 0.4) beats.push({ shot: 'hand', castFo: W, lines: [nar(pick(KNEEL))], react: false });
    beats.push({ shot: 'mcu', castFo: W, act: [[W, 'Idle_Loop']], cc: cardW, lines: [sp(W, pick(sg.prev ? W_PREV.concat(W_OPEN) : W_OPEN))] });
    beats.push({ shot: 'mcu', castFo: V, walk: { who: V, d: 2.8 }, cc: cardV, lines: [sp(V, pick(V_REPLY))] });
    if (r() < 0.65) { beats.push({ shot: 'ots', castFo: W, mean: mTest, lines: [sp(W, pick(W_2))] }); beats.push({ shot: 'ots', castFo: V, lines: [sp(V, pick(V_2))] }); }
    else beats.push({ shot: 'two', castFo: W, mean: mTest, lines: [sp(W, pick(W_2)), sp(V, pick(V_2))] });
    // —— 第二场：她 ——
    beats.push({ mean: M('🎯', sg.envoy ? '月之使者现身' : '讨伐目标登场：' + T.nm, [(sg.T.title ? '「' + sg.T.title + '」' : '') + T.nm + ' 就在这片地图里', ge ? '斩下她的首级：' + ge : '斩下她的首级，异变就会解除'], Tcol), scene: sB, shot: 'est', castFo: T, lines: [nar(pick(A.cause || TDESC))], min: 3.2 });
    if (r() < 0.5) beats.push({ shot: 'back', castFo: T, lines: [nar(pick(TDESC))] });
    beats.push({ shot: 'low', castFo: T, cc: cardT, lines: [sp(T, pick(((sg.envoy ? D().ELINE : D().TLINE) || {}).meet || T_MONO))] });
    if (r() < 0.6) beats.push({ shot: 'ecu', castFo: T, lines: [sp(T, pick(T_MONO))], tr: 'cut' });
    // —— 猎手：同一时刻，有人跟着你 ——
    if (Hn) {
      const sH = { key: 'C', cap: Lc.n + ' · 外围', sub: '同 一 时 刻', cast: [Hn] }, d = Hn.d;
      let lv = ''; try { lv = 'Lv.' + Hunters2.lvOf(Hn.id); } catch (e) { }
      beats.push({ mean: M(d.ic || '⚔', `猎手 ${d.n} 已盯上你`, [`${d.n} ${lv}：战斗中她可能穿越过来插手`, '她在场时所有的门都会封锁，打倒她或撑到她撤退'], Hn.col), scene: sH, shot: 'est', castFo: Hn, lines: [nar('与此同时，有人踩着你的脚印，走进了' + Lc.n + '。')], min: 3.6 });
      beats.push({ shot: 'low', castFo: Hn, walk: { who: Hn, d: 3.2, clip: 'Walk_Formal_Loop' }, cc: { k: '猎 手', n: d.n, t: d.t || '', ch: [(d.ic || '⚔') + ' ' + lv].filter(Boolean), col: Hn.col }, lines: [sp(Hn, pick(HUNT))] });
      beats.push({ shot: 'ecu', castFo: Hn, lines: [sp(Hn, pick(HUNT2))] });
    }
    // —— 第三场：回到异变现场，消息传来 ——
    beats.push({ mean: M('🔔', '你的到来传开了', [be ? '异变副作用正在生效：' + be : '异变还在扩散', '时间越久，此地越难收拾'], '#ffb0a0'), scene: Object.assign({}, sA, { cap: '', sub: '' }), tr: 'dissolve', shot: 'two', castFo: W, lines: [sp(V, pick(NEWS)), sp(W, pick(W_FEAR))] });
    beats.push({ shot: 'mcu', castFo: W, lines: [sp(W, pick(W_HOOK))] });
    { // 情报卡：这场电影真正要交代的事
      const lvH = Hn ? (() => { try { return ' Lv.' + Hunters2.lvOf(Hn.id); } catch (e) { return ''; } })() : '';
      const rows = [{ ic: sg.envoy ? '🌙' : '🎯', a: (sg.envoy ? '月之使者 ' : '讨伐目标 ') + T.nm + (sg.T.title ? '「' + sg.T.title + '」' : ''), e: '在' + (c.place || Lc.n) + '，是本地区的主要敌人', col: Tcol }];
      if (A.nm) rows.push({ ic: '🌀', a: '异变：' + A.nm, e: f(pk(A.sign || KNEEL)).slice(0, 38), col: '#ffe0a8' });
      if (Hn) rows.push({ ic: Hn.d.ic || '⚔', a: '猎手 ' + Hn.nm + lvH, e: '正在外围追踪你，战斗中可能插手', col: Hn.col });
      beats.push({ shot: 'mcu', castFo: T, boost: { k: '情 报', n: Lc.n, col: REG.col || '#e7c27a', rows, f: '击败她，才能让这里恢复原样' }, lines: [], min: 4.2 });
    }
    beats.push({ shot: 'two', castFo: W, tr: 'flash', stake: { good: f(pk(A.good || ['{L}会恢复原样。'])), bad: f(pk(A.bad || ['{L}会更糟。'])), ge: opt && opt.ge || '', be: opt && opt.be || '', head: opt && opt.head || '' }, lines: [] });
    beats.push({ mean: M('⚔', '接下讨伐', ['地图里会出现她；左侧「异变」追踪卡指引方向', ge ? '击败她：' + ge : '击败她，这里恢复原样'], Tcol), scene: Object.assign({}, sB, { cap: '', sub: '' }), shot: 'est', castFo: T, card: { a: '讨 伐', b: T.nm, c: sg.T.title ? `「${sg.T.title}」` : '' }, lines: [L(f(pick(FIN)), '我', '#fff', true)], min: 3.4 });
    try { localStorage.setItem('cs_recent', JSON.stringify(RECENT)); } catch (e) { }
    return { actors, beats, col: (REG.col || '#e7c27a'), hunter: !!Hn };
  }

  // ================= 宿敌插曲：在原剧本上加场景 / 动作 / 特写 =================
  const ASP_ACT = { blade: { clip: 'Sword_Regular_Combo', wpn: 1 }, armor: { clip: 'Fixing_Kneeling' }, skill: { clip: 'Spell_Simple_Shoot' }, study: { clip: 'Crouch_Idle_Loop' }, swift: { run: 1 }, bless: { clip: 'Spell_Simple_Idle_Loop' }, vow: { clip: 'Sword_Idle', wpn: 1 }, ally: { clip: 'Idle_Talking_Loop' } };
  const HPLACE = { aerin: '晨星神殿的废墟', nove: '猎魔公会 · 后巷', gwen: '铁砧镇 · 锻炉', mia: '星象学院 · 禁书库' };
  const HACT = { aerin: { clip: 'Sword_Idle', wpn: 1 }, nove: { clip: 'Idle_FoldArms_Loop' }, gwen: { clip: 'Fixing_Kneeling' }, mia: { clip: 'Spell_Simple_Idle_Loop' } };
  function nem(spec, ev) {
    const B = spec.beats; if (!B || !B.length) return spec;
    const acts = spec.rigs || [];
    if (ev && ev.why === 'intro') return nemIntro(spec);
    const her = B[0].castFo || (B[1] && B[1].castFo), other = acts.find(a => a !== her) || null;
    const aa = ASP_ACT[ev && ev.a] || null;
    if (aa && aa.wpn && hasW(KATANA)) her.wpn = KATANA;
    const out = [], origin = ev && ev.why === 'origin';
    let seenOther = false;
    B.forEach((b, i) => {
      if (i === 0) { b.scene = { key: 'A', cast: acts.slice(), cap: '', sub: '' }; b.shot = 'est'; if (origin) b.act = [[her, 'Crouch_Idle_Loop']]; out.push(b);
        const rp = !origin && window.NemStory && NemStory.report && NemStory.report(); // 开场先交代：这段时间宿敌怎么变强的
        if (rp) out.push({ shot: 'mcu', castFo: her, boost: { k: '这 段 时 间', n: rp.mins ? `你离开的 ${rp.mins} 分钟里` : '你不在的时候', col: '#ff9a8a', rows: rp.rows, f: rp.foot }, lines: [], min: 4.8, tr: 'cut' });
        return; }
      if (origin && i === 1) b.act = [[her, 'Crouch_Idle_Loop']];
      if (b.castFo === other && !seenOther && other) { seenOther = true; b.walk = { who: other, d: 2.6 }; b.shot = 'cFace'; if (origin) b.act = [[her, 'Idle_Loop']]; }
      if (b.shot === 'cHand') {
        // 换个地方：她一个人在做准备（每个方面的动作不同），手部特写
        b.scene = { key: 'B', cast: [her], cap: origin ? '那天夜里' : '同 一 夜', sub: '' };
        b.shot = 'side';
        if (origin) b.act = [[her, 'Fixing_Kneeling']];
        else if (aa && aa.run) { b.walk = { who: her, d: 4.5, clip: 'Jog_Fwd_Loop', speed: 3 }; b.shot = 'low'; }
        else if (aa && aa.clip) b.act = [[her, aa.clip]];
        out.push(b);
        out.push({ shot: 'hand', castFo: her, lines: [], min: 2.4, react: false });
        return;
      }
      if (b.boost && !b.lines.some(l => /同一时间/.test(l.t))) { b.scene = { key: 'A', cast: acts.slice(), cap: '', sub: '' }; b.tr = 'dissolve'; b.act = [[her, 'Idle_Loop']]; }
      if (b.lines && b.lines.some(l => /同一时间/.test(l.t))) { b.tr = 'dip'; b.scene = { key: 'B', cast: [her], cap: '同 一 时 间', sub: '' }; b.shot = 'back'; }
      out.push(b);
    });
    spec.beats = out; return spec;
  }
  function nemIntro(spec) {
    const B = spec.beats, out = [], acts = spec.rigs || [];
    const idOf = b => { const n = b.cc && b.cc.n; if (!n || !window.Hunters2) return null; for (const k in Hunters2.BY) if (Hunters2.BY[k].n === n) return k; return null; };
    B.forEach((b, i) => {
      if (i === 0) { b.scene = { key: 'A', cast: acts.slice(), cap: '', sub: '' }; b.shot = 'est'; out.push(b); return; }
      const id = idOf(b);
      if (id && b.lines.length >= 2) {
        const fo = b.castFo, ha = HACT[id] || {}; if (ha.wpn && hasW(KATANA)) fo.wpn = KATANA;
        out.push({ scene: { key: 'H' + id, cast: [fo], cap: HPLACE[id] || '', sub: '' }, tr: 'dip', shot: id === 'gwen' ? 'hand' : 'back', castFo: fo, act: ha.clip ? [[fo, ha.clip]] : [], lines: [b.lines[0]], react: false, mean: b.mean });
        out.push(Object.assign({}, b, { shot: id === 'gwen' || id === 'aerin' ? 'low' : 'mcu', lines: b.lines.slice(1) }));
        return;
      }
      if (b.shot === 'cTwo') { b.scene = { key: 'A', cast: acts.slice(), cap: '', sub: '' }; b.tr = 'dip'; b.shot = 'wide'; b.act = acts.map(a => [a, 'Idle_Loop']); }
      out.push(b);
    });
    spec.beats = out; return spec;
  }
  return { region, nem, clipOf };
})();
