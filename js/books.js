// 第二十二轮：书与笔记（MOD books，默认开）——在野外从容器/尸体/霸主身上捡到，文字里的角色名会被染色；
//   读书：鼠标释放、点 ✕ 关闭；洞里可以“拿在手里”（T 切换指向的名字、Y 阅读），对准名字吻合的头按左键 = 对证 → 这颗头获得一枚魂印（新词条）。
//   名字来源：生成书时 60% 取自已收藏的首级（S.heads），40% 取自本趟世界里还活着的猎物（Worlds.peekPrey）；没有就现编。
//   一本书里的一个名字只能对证一次（bk.cl[name]）。文本库在 js/bookdata.js。
window.Books = (() => {
  'use strict';
  const on = () => !(window.Mods && Mods.on('books') === false);
  const D = () => window.BookData, F = () => window.BookData.F;
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const mulberry = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const hashS = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const N = (x) => '⟦' + x.c.name + '⟧';           // 名字标记
  const NM = (n) => '⟦' + n + '⟧';
  const TIER = { note: { n: '笔记', icon: '📄', rar: 0 }, book: { n: '书', icon: '📕', rar: 1 }, tome: { n: '典籍', icon: '📚', rar: 2 } };
  const MAXAFF = 6;
  const S = () => G.S;
  const bkS = () => (S().bk = S().bk || { n: 0, read: {} });

  // ---------- 物品定义（借用麻袋格子系统）----------
  function defs() {
    if (!window.Sack || !Sack.def || Sack.IT.note) return;
    Sack.def('note', { n: '笔记', icon: '📄', kind: 'book', w: 1, h: 1, st: 1, rar: 0, desc: '一张写着字的纸。' });
    Sack.def('book', { n: '书', icon: '📕', kind: 'book', w: 1, h: 2, st: 1, rar: 1, desc: '一本旧书。' });
    Sack.def('tome', { n: '典籍', icon: '📚', kind: 'book', w: 2, h: 2, st: 1, rar: 2, desc: '一部厚重的典籍。' });
  }

  // ---------- 名字池 ----------
  function drawer(r) {
    const used = new Set(), Sx = S();
    const own = (Sx.heads || []).filter(x => x && x.c && x.c.name && !x.inBag);
    const tryOwn = () => { const l = own.filter(x => !used.has(x.c.name)); if (!l.length) return null; const x = l[Math.floor(r() * l.length)]; return { c: x.c, src: 'own' }; };
    const tryPrey = () => { if (!(window.Worlds && Worlds.peekPrey)) return null; for (let k = 0; k < 4; k++) { const p = Worlds.peekPrey(r); if (p && p.c && !used.has(p.c.name)) return { c: p.c, src: 'prey', where: p.where }; } return null; };
    const tryRand = () => { const L = Lore.LOCS, loc = L[Math.floor(r() * L.length)]; return { c: Lore.makeCharacter(r, loc, new Set(used), 0), src: 'rand' }; };
    const draw = (want) => { const a = want || (r() < 0.6 ? 'own' : 'prey'); let x = a === 'own' ? (tryOwn() || tryPrey()) : (tryPrey() || tryOwn()); if (!x) x = tryRand(); used.add(x.c.name); return x; };
    draw.used = used; return draw;
  }
  const traitsOf = c => (c.traits || []).join('、');

  // ---------- 笔记模板 ----------
  const NOTE = {
    diary(r, d) { const s = d(), o1 = d(), o2 = d(), c = s.c, f = F(), day = 1 + Math.floor(r() * 300);
      return { ti: `${c.idN}的日记页`, sub: '字迹潦草的一页，边角被水渍晕开。', chars: [s, o1, o2], pg: [
        `【第 ${day} 日】\n我是${N(s)}，${c.age} 岁，${c.raceN}，在${c.locN}做${c.idN}。今天，${pick(r, f.diaryEv)}。`,
        `我对「${c.belief}」发过誓：${c.goal}。人们说我${c.traits[0]}，又${c.traits[1]}——大概吧。可我至少知道自己在做什么。\n\n${N(o1)}悄悄对我说，关于${N(o2)}：${pick(r, f.rumor)}。我不知道该不该信。`,
        pick(r, f.diaryEnd).replace('⟦O⟧', N(o1))] }; },
    wanted(r, d) { const s = d(), o1 = d(), c = s.c, f = F(), gold = (2 + Math.floor(r() * 18)) * 50;
      return { ti: `悬赏告示 · ${c.name}`, sub: '钉在告示板上的旧纸，边角被撕过。', chars: [s, o1], pg: [
        `**悬　赏**\n\n姓名：${N(s)}\n种族：${c.raceN}\n年龄：${c.age}\n身份：${c.idN}\n特征：${traitsOf(c)}\n最后目击：${s.where || c.locN}\n\n罪名：${pick(r, f.crimes)}；${pick(r, f.crimes)}。\n\n赏金：${gold} 枚金币。死活不论。\n\n　　　　　　　　治安官 ${N(o1)} 谨启`] }; },
    letter(r, d) { const s = d(), o1 = d(), c = s.c;
      return { ti: `${c.locN}来信`, sub: '折成四折的信，信封上只写了一个名字。', chars: [s, o1], pg: [
        `亲爱的${N(o1)}：\n\n见字如面。${c.locN}这几日${pick(r, ['连着下雨', '起了大雾', '风大得吓人', '安静得不像话'])}，我常常想起你说过的话——“${pick(r, ['人总得为点什么活着', '别回头', '记得把灯留着', '能被记住，就不算白活'])}”。\n\n我还在${c.idN}的位子上，人家说我${traitsOf(c)}，我觉得他们说得不全对。`,
        `你问我信不信「${c.belief}」——我信。我信到愿意为它去做那件事：${c.goal}。\n\n如果这封信到你手里的时候我已经不在原来的地方，别找我。\n\n　　　　　　　　　　你的　${N(s)}\n\n又及：桃树今年开花了。`] }; },
    will(r, d) { const s = d(), o1 = d(), o2 = d(), c = s.c, f = F();
      return { ti: `${c.name}的遗书`, sub: '一页墨迹很稳的遗书。', chars: [s, o1, o2], pg: [
        `我，${N(s)}，${c.age} 岁，神志清醒地写下这几句：\n\n把${pick(r, f.will)}留给${N(o1)}；\n把${pick(r, f.will)}留给${N(o2)}；\n若有人问我为什么这样做，就说：${c.goal}。\n\n不要为我办葬礼。若我的头颅有一天被人带走，也别去找。\n\n　　　　　　　　　　${N(s)}`] }; },
    ledger(r, d) { const a = [d(), d(), d(), d()], f = F(), line = (x) => `${N(x)}　${pick(r, f.ledger)}　${(1 + Math.floor(r() * 30)) * 5} 金　${pick(r, ['已付', '欠着', '记账', '“下次”', '以物抵'])}`;
      return { ti: '一页账本', sub: '沾着酒渍的账页，字迹一笔一划很认真。', chars: a, pg: [`**${a[0].c.locN}杂货铺 · 月底结算**\n\n${a.map(line).join('\n')}\n\n备注：${N(a[0])}说下个月一定还；${N(a[3])}没说。`] }; },
    inter(r, d) { const s = d(), o1 = d(), o2 = d(), c = s.c, f = F(), q = f.interQ, a = f.interA, i = Math.floor(r() * q.length), j = (i + 2) % q.length;
      return { ti: `审讯记录 · ${c.name}`, sub: '衙门文书，页脚盖着半枚印。', chars: [s, o1, o2], pg: [
        `**审　讯　记　录**\n被讯人：${N(s)}（${c.idN}）\n主审：${N(o1)}\n\n问：${q[i]}\n答：${a[i]}\n问：${q[j]}\n答：${a[j]}\n问：认识${N(o2)}吗？\n答：……（此处沉默约半刻钟）\n\n备注：被讯人${c.traits[0]}，供述前后不一。建议再问。`] }; },
    hunter(r, d) { const s = d(), o1 = d(), c = s.c, f = F();
      return { ti: '猎人手记', sub: '皮面小本，边角沾着泥和别的什么。', chars: [s, o1], pg: [
        `我追踪${N(s)}已经第三天。\n\n她${traitsOf(c)}，走路的声音很轻，但每次经过${pick(r, f.hunterSign)}，我就知道她刚刚来过。${s.where ? `\n人们说她最近出没在「${s.where}」。` : `\n${c.locN}是她最后被人看见的地方。`}`,
        `${N(o1)}劝我放弃。她说${N(s)}身后有「${c.belief}」撑腰，不是我这种人惹得起的。\n\n我说：她想要的东西是——“${c.goal}”。这样的人，迟早会撞上什么。\n\n我只是想赶在别人前面。`] }; },
    prayer(r, d) { const s = d(), o1 = d(), o2 = d(), c = s.c, f = F();
      return { ti: `献给${c.belief}的短祷`, sub: '祭坛下压着的一页祷文。', chars: [s, o1, o2], pg: [
        `**献给「${c.belief}」的短祷**\n\n为${N(s)}祈：${pick(r, f.prayer)}\n为${N(o1)}祈：${pick(r, f.prayer)}\n为${N(o2)}祈：${pick(r, f.prayer)}\n\n——阿门（或它的等价物）`] }; },
    roster(r, d) { const a = [d(), d(), d(), d(), d()], loc = a[0].c.locN;
      return { ti: `${loc}名册（残页）`, sub: '半张被火烤黄的名册。', chars: a, pg: [`**${loc}居民名册（残页）**\n\n${a.map((x, i) => `${i + 1}. ${N(x)}　${x.c.idN}，${traitsOf(x.c)}`).join('\n')}\n\n（下略）`] }; },
    rumor(r, d) { const s = d(), o1 = d(), o2 = d(), c = s.c, f = F();
      return { ti: '酒馆听来的', sub: '有人把酒馆里听到的闲话记在了菜单背面。', chars: [s, o1, o2], pg: [
        `“${N(s)}？你说的是那个${c.traits[0]}的${c.idN}？${pick(r, f.rumor)}。”\n“别乱讲。${N(o1)}才是真危险的那个。”\n“……你们俩谁也别信。${N(o2)}上周还欠我三杯麦酒。”`] }; }
  };
  const NOTE_K = Object.keys(NOTE);

  // ---------- 地方志（带霸主与名人录）----------
  function regionBook(r, d, li) {
    const L = Lore.LOCS, loc = L[Math.max(0, Math.min(L.length - 1, li))], B = window.Explore && Explore.BOSSES[loc.k];
    const races = Object.entries(loc.races).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${Lore.RACES[k] ? Lore.RACES[k].n : k}约占 ${v}%`).join('，');
    const ids = Object.entries(loc.ids).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => Lore.ID[k] ? Lore.ID[k].n : k).join('、');
    const chars = [d(), d(), d()];
    const pg = [`**${loc.icon} ${loc.n}**\n\n${loc.desc}\n\n${loc.scene[0]}\n${pick(r, loc.scene.slice(1))}`,
      `**居民与营生**\n\n${races}。\n最常见的身份有：${ids}。\n\n据本册作者估算，此地的危险程度约为“推荐战力 ${loc.rec}”——低于这个数字的旅人，请自带担架。`];
    if (B) pg.push(`**霸主 · ${B.title}**\n\n${NM(B.n)}\n${B.story}\n\n她信奉「${B.belief}」，一心要“${B.goal}”。据说她见到食人魔时，会说：\n“${B.say}”`);
    pg.push(`**${loc.n}名人录**\n\n${chars.map(x => `${N(x)}（${x.c.idN}，${x.c.raceN}）\n　${traitsOf(x.c)}；信仰「${x.c.belief}」。${x.where ? `\n　据传最近出没于「${x.where}」。` : ''}`).join('\n\n')}`);
    return { ti: `${loc.n}风物志`, sub: `一本旅行者写的${loc.n}小册子，页边全是批注。`, chars, pg, extraNames: B ? [B.n] : [] };
  }

  // ---------- 魂印通鉴（从 RPG.AFF 现场生成）----------
  function affixBook() {
    const A = RPG.AFF, C = RPG.AFF_CAT, pg = [`**魂印通鉴**\n\n魂印是魂在世上留下的“痕”。一颗头最多带六枚。\n\n通鉴按作用把魂印分成五类：\n· **产出**——决定魂晶产得多快；\n· **把玩**——你亲手碰她时的额外好事；\n· **展示**——摆在架上时对周围的影响；\n· **战力**——摆在洞里时，反过来给你属性；\n· **典籍**——只有读书、对证名字才能得到。`];
    for (const k of Object.keys(C)) { const ks = Object.keys(A).filter(x => A[x].cat === k); pg.push(`**${C[k].n}类**\n\n${ks.map(x => `${A[x].icon} **${A[x].n}**　${A[x].d}`).join('\n\n')}`); }
    return { ti: '魂印通鉴', sub: '斯尼克出的“权威手册”，每一页都盖着他的手印（和油渍）。', chars: [], pg, fixed: 'affix' };
  }
  // ---------- 断头台年鉴（动态名字）----------
  function annalBook(r, d) {
    const chars = [d(), d(), d(), d(), d()], f = ['被记入洞窟的名册', '魂晶三百，至今仍在最深处的台上', '一夜之间没了影子，只留下名字', '被带回来的时候，还在念一句没有念完的祷词', '唯一的遗物是一枚生锈的发簪'];
    return { ti: '洞窟年鉴', sub: '洞窟深处的抄本，一年一行。', chars, pg: [`**魂首窟年鉴 · 节选**\n\n${chars.slice(0, 3).map((x, i) => `第 ${3 + i * 4 + Math.floor(r() * 3)} 年 · ${N(x)}（${x.c.idN}，${x.c.locN}）——${pick(r, f)}。`).join('\n\n')}`,
      `**续**\n\n${chars.slice(3).map((x, i) => `第 ${16 + i * 5 + Math.floor(r() * 3)} 年 · ${N(x)}（${x.c.idN}，${x.c.locN}）——${pick(r, f)}。`).join('\n\n')}\n\n（此后的页被人撕去了，只剩下一行字：“名字不必是真的，只要有人念。”）`] };
  }
  // ---------- 霸主手记 ----------
  function bossTome(r, d, B) {
    const chars = [d(), d()];
    return { ti: `${B.title}手记`, sub: `${B.n}的私人笔记，扉页上有一个用力划过的叉。`, chars, extraNames: [B.n], pg: [
      `**${B.title}**\n\n${NM(B.n)}\n\n${B.story}`, `${B.intro}\n\n她的口头禅：“${B.say}”`,
      `她的目标：“${B.goal}”。\n她信奉：「${B.belief}」。\n她给自己留的遗言只有一句：“${B.lose}”\n\n手记最后一页写着几个名字，是她想记住的人：\n${chars.map(N).join('\n')}`] };
  }

  // ---------- 组装成物品 ----------
  function finish(raw, tier, id, hintsFrom) {
    const names = []; const seen = new Set();
    for (const t of raw.pg) t.replace(/⟦([^⟧]+)⟧/g, (m, n) => { if (!seen.has(n)) { seen.add(n); names.push(n); } });
    const hint = {}; for (const n of (raw.extraNames || [])) hint[n] = '一方霸主——要深入她的领地、击败她，才能带回她的头';
    for (const x of (raw.chars || [])) { if (!x || !x.c) continue; hint[x.c.name] = x.src === 'prey' && x.where ? `据说出没于「${x.where}」` : x.src === 'own' ? '' : '下落不明——也许只是个传闻里的名字'; }
    return { id, t: tier, ti: raw.ti, sub: raw.sub, pg: raw.pg, names, hint, cl: {}, seed: hashS(id) };
  }
  function addMargin(r, d, raw, n) { // 给固定书附上“页边批注”页，注入名字
    const M = D().MARG, xs = []; for (let i = 0; i < n; i++) xs.push(d());
    raw.chars = (raw.chars || []).concat(xs);
    raw.pg = raw.pg.concat(`**页边批注**\n\n${xs.map(x => pick(r, M).replace('⟦N⟧', N(x))).join('\n\n')}`);
  }
  // kind: 'note' | 'book' | 'tome'；ctx: { lv, B, fixed }
  function gen(kind, r, ctx) {
    ctx = ctx || {}; const d = drawer(r); let raw, tier = kind, id = 'bk' + Math.floor(r() * 1e9).toString(36);
    if (ctx.B) { raw = bossTome(r, d, ctx.B); tier = 'tome'; }
    else if (kind === 'note' && r() >= 0.15) raw = NOTE[pick(r, NOTE_K)](r, d);
    else if (kind === 'note') { const p = pick(r, D().LORE.filter(x => x.tier === 'note')); raw = { ti: p.ti, sub: p.sub, pg: p.pg.slice(), chars: [] }; id = p.id + '_' + id; if (p.app) addMargin(r, d, raw, 1 + Math.floor(r() * 2)); }
    else {
      const LORE = D().LORE.filter(x => x.tier === kind), roll = r();
      if (roll < 0.42) { const L = Lore.LOCS, hi = Math.max(0, Math.min(L.length - 1, Math.round((ctx.lv || 0) + r() * 2.4 - 0.7))); raw = regionBook(r, d, hi); id = 'reg_' + L[hi].k + '_' + id; }
      else if (roll < 0.5 && kind === 'tome') raw = affixBook();
      else if (roll < 0.62) raw = annalBook(r, d);
      else { const p = LORE.length ? pick(r, LORE) : pick(r, D().LORE); tier = kind === 'tome' && p.tier !== 'tome' ? 'book' : p.tier; raw = { ti: p.ti, sub: p.sub, pg: p.pg.slice(), chars: [] }; id = p.id + '_' + id; if (p.app) addMargin(r, d, raw, 1 + Math.floor(r() * 3)); }
    }
    const bk = finish(raw, tier, id); bk.id = id; return bk;
  }
  function item(bk) { defs(); return Sack.mk(bk.t, 1, { bk }); }
  const rate = { chest: 0.26, crate: 0.13, barrel: 0.05, basket: 0.09, bucket: 0.05, rack: 0.03, corpse: 0.15 };
  // Sack.roll 钩子：返回一个物品（或 null）
  function rollLoot(r, kind, lv, extra) {
    if (!on() || !window.Sack || !window.G || !G.S) return null;
    try {
      defs();
      if (extra && extra.boss && extra.B) return item(gen('tome', r, { lv, B: extra.B }));
      if (r() > (rate[kind] || 0.05) * (1 + Math.min(0.6, lv * 0.05))) return null;
      const k = r(), tier = kind === 'corpse' ? (k < 0.7 ? 'note' : 'book') : (k < 0.5 ? 'note' : k < 0.85 ? 'book' : 'tome');
      return item(gen(tier, r, { lv }));
    } catch (e) { console.warn('Books.rollLoot', e); return null; }
  }
  // 首次进洞的礼物：教程书 + 一张能立刻对证的笔记
  function starter(inv) {
    if (!on()) return; const b = bkS(); if (b.starter) return; b.starter = 1; defs();
    const first = D().LORE.find(x => x.id === 'first'), raw = { ti: first.ti, sub: first.sub, pg: first.pg.slice(), chars: [] };
    inv.stash.push(item(finish(raw, 'book', 'first_' + Date.now().toString(36))));
    const r = mulberry(hashS('starter' + (S().heads || []).length + Date.now())), d = drawer(r);
    const own = (S().heads || []).length; if (own) inv.stash.push(item(gen('note', r, {})));
  }

  // ---------- 名字状态 ----------
  const inCave = () => !(window.Worlds && Worlds.active) && !(window.Explore && Explore.active);
  const recOf = (name) => (S().heads || []).find(x => x && x.c && x.c.name === name && !x.inBag);
  const stOf = (bk, n) => bk.cl[n] ? 'done' : recOf(n) ? 'own' : 'out';
  const STL = { done: '已对证', own: '洞里有她', out: '尚未找到' };

  // ---------- 奖励 ----------
  function rewardKind(bk, name, rec) {
    const r = mulberry(hashS(bk.id + '|' + name)), have = rec.c.aff || [], A = RPG.AFF;
    const lorePool = RPG.AFF_LORE.filter(k => !have.includes(k)), wildPool = RPG.AFF_WILD.filter(k => !have.includes(k));
    const pl = { note: 0.2, book: 0.45, tome: 0.75 }[bk.t] || 0.3;
    const usePool = (r() < pl && lorePool.length) ? lorePool : (wildPool.length ? wildPool : lorePool);
    return usePool.length ? usePool[Math.floor(r() * usePool.length)] : null;
  }
  // 对证：成功返回 { aff, rec }，失败返回 { err }
  function claim(bk, name) {
    if (!bk || !bk.names.includes(name)) return { err: `《${bk ? bk.ti : '?'}》里没有提到「${name}」。` };
    if (bk.cl[name]) return { err: `「${name}」在这本书里已经对证过了。` };
    const rec = recOf(name); if (!rec) return { err: `洞里没有名叫「${name}」的头。` };
    if (!inCave()) return { err: '要回到洞里才能把书和头对上。' };
    rec.c.aff = rec.c.aff || []; if (rec.c.aff.length >= MAXAFF) return { err: `「${name}」的魂印已经满了（${MAXAFF} 枚）。` };
    const k = rewardKind(bk, name, rec); if (!k) return { err: `「${name}」已经拥有所有魂印了！` };
    rec.c.aff.push(k); bk.cl[name] = 1; const b = bkS(); b.n = (b.n || 0) + 1;
    const h = G.headOf && G.headOf(rec.id);
    if (h) { h.yield = G.yieldOf(rec) * (h._apprK || 1); try { const P = h.g.position; G.floatText('📖 魂印：' + RPG.AFF[k].icon + RPG.AFF[k].n, P.clone().add(new THREE.Vector3(0, 0.55, 0)), '#d8a8ff', 26); G.burst(P, '#d8a8ff', 46, 2.2, 1.1, 1); G.burst(P, '#ffe6a0', 24, 1.6, 0.9, 0.5); } catch (e) { } }
    const coin = 120 * (rec.c.rar + 1) * (bk.t === 'tome' ? 2 : bk.t === 'book' ? 1.4 : 1); G.addCoins(Math.round(coin));
    try { SFX.fanfare && SFX.fanfare(2); } catch (e) { }
    G.toast(`📖 对证成功！「${name}」获得魂印【${RPG.AFF[k].icon}${RPG.AFF[k].n}】：${RPG.AFF[k].d}<br>+${Math.round(coin)} 魂晶`, '#d8a8ff', 5.5);
    G.save(); return { aff: k, rec };
  }

  // ---------- CSS ----------
  function css() {
    if (document.getElementById('bkCSS')) return; const st = document.createElement('style'); st.id = 'bkCSS';
    st.textContent = `
#bkRead{position:fixed;inset:0;z-index:100000;background:radial-gradient(ellipse at center,rgba(20,10,8,.86),rgba(0,0,0,.94));display:flex;align-items:center;justify-content:center;font-family:'Noto Serif SC','Songti SC','SimSun',serif;color:#2a1a08;animation:bkIn .25s ease-out}
@keyframes bkIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:none}}
#bkRead .bk-box{position:relative;display:flex;gap:18px;width:min(1040px,94vw);height:min(660px,90vh)}
#bkRead .bk-x{position:absolute;right:-6px;top:-14px;z-index:5;width:40px;height:40px;border-radius:50%;border:2px solid #e7c27a;background:#2a0f10;color:#f6dca0;font-size:22px;line-height:1;cursor:pointer;box-shadow:0 0 16px #000}
#bkRead .bk-x:hover{background:#7a1a1a;color:#fff}
#bkRead .bk-main{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;background:linear-gradient(90deg,rgba(0,0,0,.14),transparent 6%,transparent 94%,rgba(0,0,0,.14)),radial-gradient(ellipse at 30% 20%,#f2e2b8,#dcc18a 70%,#c8a96e);border-radius:6px 14px 14px 6px;padding:26px 34px 16px;box-shadow:0 0 0 3px #4a2a12,0 0 0 6px #1a0c06,0 24px 60px #000;overflow:hidden}
#bkRead .bk-hd{border-bottom:2px double #8a6a3a;padding-bottom:8px;margin-bottom:12px;display:flex;align-items:center;gap:12px}
#bkRead .bk-hd img{width:54px;height:54px;object-fit:contain;filter:drop-shadow(0 3px 4px rgba(0,0,0,.5))}
#bkRead .bk-hd h2{margin:0;font-size:24px;letter-spacing:3px;color:#3a1608}
#bkRead .bk-hd small{display:block;margin-top:2px;color:#6a4a26;font-size:12.5px;font-style:italic;letter-spacing:.5px}
#bkRead .bk-hd .tg{margin-left:auto;font-size:12px;border:1px solid #8a6a3a;border-radius:8px;padding:1px 8px;color:#6a3a16;white-space:nowrap}
#bkRead .bk-page{flex:1 1 auto;overflow:auto;font-size:17.5px;line-height:1.95;letter-spacing:.6px;padding-right:6px;white-space:normal}
#bkRead .bk-page b{color:#5a1a0a}
#bkRead .bk-nav{display:flex;align-items:center;justify-content:center;gap:16px;padding-top:10px;border-top:1px solid rgba(90,60,30,.4);color:#5a3a1a;font-size:14px}
#bkRead .bk-nav button{background:#5a2a12;color:#f6e2b0;border:0;border-radius:6px;padding:5px 16px;cursor:pointer;font-family:inherit;font-size:14px}
#bkRead .bk-nav button:disabled{opacity:.3;cursor:default}
.bk-n{cursor:pointer;font-weight:700;border-radius:4px;padding:0 3px;transition:background .15s;white-space:nowrap}
.bk-n.own{color:#a86000;background:rgba(255,190,60,.28);box-shadow:0 0 0 1px rgba(168,96,0,.5)}
.bk-n.out{color:#a01020;background:rgba(200,30,40,.12);box-shadow:0 0 0 1px rgba(160,16,32,.35)}
.bk-n.done{color:#0c7a6a;background:rgba(20,180,150,.16);box-shadow:0 0 0 1px rgba(12,122,106,.5)}
.bk-n.done::after{content:' ✔';font-size:.8em}
.bk-n.sel{outline:2px solid #5a1a8a;outline-offset:1px}
.bk-n:hover{background:rgba(255,255,255,.55)}
#bkRead .bk-side{flex:0 0 300px;display:flex;flex-direction:column;gap:8px;background:linear-gradient(180deg,rgba(30,18,14,.97),rgba(14,8,8,.98));border:1px solid #6a4a2a;border-radius:12px;padding:14px;color:#e8d8b8;overflow:auto;font-family:system-ui,'Microsoft YaHei',sans-serif}
#bkRead .bk-side h3{margin:0 0 2px;font-size:15px;color:#f3d9a0;letter-spacing:2px}
#bkRead .bk-side .lg{font-size:11.5px;color:#a89878;line-height:1.7}
#bkRead .bk-side .lg i{font-style:normal;font-weight:700;padding:0 4px;border-radius:4px}
.bk-row{border:1px solid rgba(255,255,255,.12);border-left:4px solid #888;border-radius:6px;padding:7px 9px;background:rgba(255,255,255,.04);cursor:pointer}
.bk-row.own{border-left-color:#ffb020}.bk-row.out{border-left-color:#e03040}.bk-row.done{border-left-color:#20d0b0}.bk-row.sel{background:rgba(216,168,255,.14);box-shadow:0 0 0 1px #d8a8ff}
.bk-row b{font-size:15px;color:#fff}.bk-row .s{float:right;font-size:11.5px;opacity:.85}
.bk-row.own .s{color:#ffc860}.bk-row.out .s{color:#ff8a94}.bk-row.done .s{color:#5ee8d0}
.bk-row small{display:block;color:#b8a888;margin-top:3px;line-height:1.5;font-size:12px}
.bk-row .bk-go{margin-top:6px;width:100%;padding:6px;border:0;border-radius:6px;background:linear-gradient(180deg,#7a3ac8,#4a1a8a);color:#fff;font-size:13px;cursor:pointer;letter-spacing:1px}
.bk-row .bk-go:hover{filter:brightness(1.2)}
.bk-row .bk-go.off{background:#3a3438;color:#999;cursor:default}
#bkRead .bk-tip{font-size:12px;color:#a89878;margin-top:auto;line-height:1.6}
#bkHeld{position:fixed;left:16px;bottom:96px;z-index:35;width:250px;background:linear-gradient(180deg,rgba(38,22,14,.94),rgba(16,8,8,.94));border:1px solid #b08a4a;border-radius:10px;padding:8px 10px;color:#e8d8b8;font-size:12.5px;line-height:1.55;box-shadow:0 6px 24px #000;pointer-events:none;font-family:system-ui,'Microsoft YaHei',sans-serif}
#bkHeld .hd{display:flex;gap:8px;align-items:center}#bkHeld img{width:34px;height:34px;object-fit:contain}
#bkHeld .hd b{color:#f6dca0;font-size:14px}
#bkHeld .nm{display:block;padding:1px 6px;margin:2px 0;border-radius:5px;border-left:3px solid #888;background:rgba(255,255,255,.05)}
#bkHeld .nm.own{border-left-color:#ffb020;color:#ffd890}#bkHeld .nm.out{border-left-color:#e03040;color:#ff9aa4}#bkHeld .nm.done{border-left-color:#20d0b0;color:#6aead4;text-decoration:line-through;opacity:.7}
#bkHeld .nm.pt{background:rgba(216,168,255,.22);box-shadow:0 0 0 1px #d8a8ff}
#bkHeld .ky{margin-top:4px;color:#a89878;font-size:11.5px}
#bkPt{position:fixed;left:0;top:0;z-index:34;pointer-events:none;display:none;color:#f0d0ff;font-size:12px;text-align:center;text-shadow:0 0 6px #000,0 1px 3px #000;font-family:system-ui,'Microsoft YaHei',sans-serif}
#bkPt .ar{display:block;font-size:26px;line-height:1;color:#d8a8ff;filter:drop-shadow(0 0 6px #b070ff);transform-origin:50% 50%}
#bkPt .lb{display:block;white-space:nowrap;background:rgba(30,10,50,.75);border:1px solid #b070ff;border-radius:8px;padding:0 8px}
.bk-tab .bk-card{display:flex;gap:12px;align-items:center;border:1px solid rgba(231,194,122,.22);border-radius:8px;padding:8px 10px;margin:6px 0;background:rgba(255,255,255,.04)}
.bk-tab .bk-card img{width:46px;height:46px;object-fit:contain}
.bk-tab .bk-card .bi{flex:1;min-width:0}.bk-tab .bk-card b{color:#f6dca0;font-size:15px}.bk-tab .bk-card small{display:block;color:#a89878;margin:1px 0 3px}
.bk-tab .chip{display:inline-block;font-size:12px;border-radius:6px;padding:0 6px;margin:1px 3px 1px 0;border:1px solid}
.bk-tab .chip.own{color:#ffc860;border-color:#ffb02099;background:rgba(255,176,32,.12)}.bk-tab .chip.out{color:#ff8a94;border-color:#e0304099}.bk-tab .chip.done{color:#5ee8d0;border-color:#20d0b099}
.bk-tab .bk-b{background:#4a2a12;color:#f6e2b0;border:1px solid #b08a4a;border-radius:6px;padding:5px 10px;cursor:pointer;margin-left:4px;font-size:13px}.bk-tab .bk-b:hover{background:#7a3a12}
.bk-tab .sum{color:#bba;font-size:13px;margin-bottom:6px}`;
    document.head.appendChild(st);
  }

  // ---------- 阅读器 ----------
  let R = null; // { el, item, bk, pg, sel, wasUI, msg }
  function fmt(bk, text) {
    return esc(text).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/⟦([^⟧]+)⟧/g, (m, n) => `<span class="bk-n ${stOf(bk, n)}${R && R.sel === n ? ' sel' : ''}" data-n="${esc(n)}">${esc(n)}</span>`).replace(/\n/g, '<br>');
  }
  function nameRow(bk, n) {
    const st = stOf(bk, n), rec = recOf(n), c = rec && rec.c, RN = ['凡魂', '灵魂', '英魂', '圣魂', '神魂'];
    let sub = '';
    if (st === 'done') sub = '这本书已经替她添过魂印了。';
    else if (st === 'own') sub = `${RN[c.rar]} · ${esc(c.raceN)} ${esc(c.idN)}<br>${(c.aff || []).map(k => RPG.affHTML(k, 'pill')).join('') || '<span style="opacity:.6">还没有魂印</span>'}`;
    else sub = esc(bk.hint[n] || '一个你还没有遇到的名字。也许她就活在下一扇门后面。');
    const can = st === 'own' && inCave() && !bk.cl[n];
    const go = st === 'own' && !bk.cl[n] ? `<button class="bk-go ${can ? '' : 'off'}" data-go="${esc(n)}">${can ? '📖 对证：赐予魂印' : '回到洞里才能对证'}</button>` : '';
    return `<div class="bk-row ${st}${R.sel === n ? ' sel' : ''}" data-n="${esc(n)}"><b>${esc(n)}</b><span class="s">${STL[st]}</span><small>${sub}</small>${go}</div>`;
  }
  function paint() {
    if (!R) return; const bk = R.bk, T = TIER[bk.t] || TIER.note, u = window.ItemIcons && ItemIcons.url(bk.t);
    const npg = bk.pg.length, pgI = Math.max(0, Math.min(npg - 1, R.pg));
    R.el.innerHTML = `<div class="bk-box"><button class="bk-x" title="合上书 (Esc)">✕</button>
      <div class="bk-main"><div class="bk-hd">${u ? `<img src="${u}" alt="">` : `<span style="font-size:38px">${T.icon}</span>`}<div><h2>${esc(bk.ti)}</h2><small>${esc(bk.sub || '')}</small></div><span class="tg">${T.n} · ${npg} 页</span></div>
      <div class="bk-page">${fmt(bk, bk.pg[pgI])}</div>
      <div class="bk-nav"><button data-pv ${pgI <= 0 ? 'disabled' : ''}>◀ 上一页</button><span>第 ${pgI + 1} / ${npg} 页</span><button data-nx ${pgI >= npg - 1 ? 'disabled' : ''}>下一页 ▶</button></div></div>
      <div class="bk-side"><h3>📇 书中的名字（${bk.names.length}）</h3>
        <div class="lg"><i style="background:rgba(255,190,60,.25);color:#ffc860">金</i>洞里有她 · <i style="background:rgba(200,30,40,.2);color:#ff8a94">红</i>还没找到 · <i style="background:rgba(20,180,150,.2);color:#5ee8d0">青</i>已对证</div>
        ${bk.names.length ? bk.names.map(n => nameRow(bk, n)).join('') : '<div class="lg">这本书里没有出现任何名字。</div>'}
        ${R.msg ? `<div class="lg" style="color:#ffe27a">${R.msg}</div>` : ''}
        <div class="bk-tip">点击正文或右侧的名字查看她的情况。${inCave() ? '在洞里，点“对证”即可，或者拿着书直接对准那颗头按左键。' : '带着书回洞，才能和洞里的头对证。'}</div></div></div>`;
    R.el.querySelector('.bk-x').onclick = close;
    R.el.querySelector('[data-pv]').onclick = () => { R.pg--; R.msg = ''; paint(); };
    R.el.querySelector('[data-nx]').onclick = () => { R.pg++; R.msg = ''; paint(); };
    R.el.querySelectorAll('.bk-n,.bk-row').forEach(e => e.addEventListener('click', ev => { if (ev.target.closest('[data-go]')) return; R.sel = e.dataset.n; paint(); }));
    R.el.querySelectorAll('[data-go]').forEach(b => b.onclick = (ev) => { ev.stopPropagation(); const n = b.dataset.go; if (!inCave()) return; const res = claim(bk, n); R.sel = n; R.msg = res.err ? esc(res.err) : `✨「${esc(n)}」获得魂印 ${RPG.AFF[res.aff].icon}${RPG.AFF[res.aff].n}！`; paint(); });
  }
  function open(o, pgN) {
    if (!on() || !o || !o.bk) return; css(); close(true);
    const el = document.createElement('div'); el.id = 'bkRead'; document.body.appendChild(el);
    R = { el, item: o, bk: o.bk, pg: pgN || 0, sel: null, wasUI: !!G.uiOpen, msg: '' };
    if (!R.wasUI) G.setUI(true);
    const b = bkS(); b.read = b.read || {}; b.read[o.bk.id] = 1;
    el.addEventListener('mousedown', e => e.stopPropagation()); el.addEventListener('wheel', e => e.stopPropagation());
    paint(); try { SFX.page && SFX.page(); } catch (e) { }
  }
  function close(silent) {
    if (!R) return; const w = R.wasUI; R.el.remove(); R = null;
    if (silent === true) return;
    if (!w) { G.setUI(false); try { G.lockPointer(); } catch (e) { } }
    if (heldItem) drawHeld();
  }

  // ---------- 拿在手里：指向名字 + 对证 ----------
  let heldItem = null, ptName = null, hudEl = null, ptEl = null;
  const V3 = () => THREE.Vector3;
  function firstPt(bk) { return bk.names.find(n => stOf(bk, n) === 'own') || bk.names.find(n => stOf(bk, n) === 'out') || bk.names[0] || null; }
  function hold(o) {
    if (!o || !o.bk) return; if (!inCave()) { G.toast('要在洞里才能拿着书对证。', '#ccc', 2); return; }
    css(); close(true); heldItem = o; ptName = firstPt(o.bk);
    try { if (window.UI && UI.open) UI.close(true); else { G.setUI(false); G.lockPointer(); } } catch (e) { }
    G.toast(`📖 手里拿着《${o.bk.ti}》 · <b>T</b> 切换指向的名字 · <b>Y</b> 阅读 · 对准名字吻合的头按<b>左键</b>对证`, '#d8a8ff', 4);
    drawHeld();
  }
  function drop() { heldItem = null; ptName = null; if (hudEl) { hudEl.remove(); hudEl = null; } if (ptEl) ptEl.style.display = 'none'; }
  function drawHeld() {
    if (!heldItem) return; css(); const bk = heldItem.bk;
    if (!hudEl) { hudEl = document.createElement('div'); hudEl.id = 'bkHeld'; document.body.appendChild(hudEl); }
    const u = window.ItemIcons && ItemIcons.url(bk.t);
    setH(hudEl, `<div class="hd">${u ? `<img src="${u}" alt="">` : '📖'}<div><b>《${esc(bk.ti)}》</b><br><span style="opacity:.7">${(TIER[bk.t] || TIER.note).n} · 名字 ${bk.names.length}</span></div></div>`
      + bk.names.map(n => `<span class="nm ${stOf(bk, n)}${n === ptName ? ' pt' : ''}">${n === ptName ? '▶ ' : ''}${esc(n)}${stOf(bk, n) === 'done' ? ' ✔' : ''}</span>`).join('')
      + `<div class="ky"><b>T</b> 换名字（到头 = 收起）· <b>Y</b> 阅读 · <b>左键</b> 对准头对证</div>`);
  }
  function cycle() {
    if (!heldItem) return; const ns = heldItem.bk.names, i = ns.indexOf(ptName);
    if (i + 1 >= ns.length) { G.toast('📕 把书收起来了。', '#ccc', 1.6); drop(); return; }
    ptName = ns[i + 1]; drawHeld();
  }
  function frame() {
    if (!heldItem || !on()) { if (ptEl && ptEl.style.display !== 'none') ptEl.style.display = 'none'; return; }
    if (!inCave()) { drop(); return; }
    if (!ptEl) { ptEl = document.createElement('div'); ptEl.id = 'bkPt'; ptEl.innerHTML = '<span class="ar">▼</span><span class="lb"></span>'; document.body.appendChild(ptEl); }
    if (G.uiOpen || !G.playing || !ptName) { ptEl.style.display = 'none'; return; }
    // 每 0.5 秒刷新一次手持面板（名字状态可能变化）
    const now = performance.now(); if (!frame._t || now - frame._t > 500) { frame._t = now; drawHeld(); }
    const h = G.heads.find(x => x.rec && x.rec.c.name === ptName && !x.gone);
    const lb = ptEl.querySelector('.lb'), ar = ptEl.querySelector('.ar');
    if (!h) { const rec = recOf(ptName); setT(lb, rec ? `「${ptName}」在魂库里——先取出来` : `「${ptName}」不在洞里`); ptEl.style.display = 'block'; ptEl.style.transform = `translate(${innerWidth / 2 - 90}px,${innerHeight * 0.16}px)`; ar.style.display = 'none'; return; }
    ar.style.display = 'block';
    const cam = G.camera, T3 = THREE, p = h.g.position.clone(); p.y += 0.3; const dist = cam.position.distanceTo(p);
    const q = p.clone().project(cam), behind = q.z > 1;
    let x = (q.x * 0.5 + 0.5) * innerWidth, y = (-q.y * 0.5 + 0.5) * innerHeight, ang = 0, inside = !behind && Math.abs(q.x) < 0.9 && Math.abs(q.y) < 0.82;
    if (!inside) { const v = p.clone().applyMatrix4(cam.matrixWorldInverse); let dx = v.x, dy = v.y; if (Math.abs(dx) + Math.abs(dy) < 0.001) dx = 1; const a = Math.atan2(-dy, dx), ex = innerWidth * 0.5 - 60, ey = innerHeight * 0.5 - 70; x = innerWidth / 2 + Math.cos(a) * ex; y = innerHeight / 2 + Math.sin(a) * ey; ang = a * 180 / Math.PI - 90 + 180; ar.textContent = '▲'; ar.style.transform = `rotate(${(a * 180 / Math.PI + 90).toFixed(1)}deg)`; }
    else { ar.textContent = '▼'; ar.style.transform = ''; y -= 34; }
    setT(lb, `${ptName} · ${dist.toFixed(1)}m`);
    ptEl.style.display = 'block'; ptEl.style.transform = `translate(${(x - 40).toFixed(0)}px,${(y - 18).toFixed(0)}px)`;
  }
  // 准星对准的头
  function tipFor(hit, heldHead) {
    if (!heldItem || heldHead || !on() || !hit || !hit.head) return null;
    const bk = heldItem.bk, c = hit.head.rec.c, n = c.name, RN = ['凡魂', '灵魂', '英魂', '圣魂', '神魂'];
    const head = `<b>${esc(n)}</b> <small>· ${RN[c.rar]} ${esc(c.raceN)}${esc(c.idN)}</small><br>`;
    if (!bk.names.includes(n)) return `${head}<span style="color:#ff9aa4">📖 《${esc(bk.ti)}》里没有提到她的名字</span>`;
    if (bk.cl[n]) return `${head}<span style="color:#5ee8d0">✔ 这本书已经为她对证过了</span>`;
    return `${head}<span style="color:#d8a8ff">📖 名字吻合！<b>[左键]</b> 对证 → 获得一枚魂印</span>`;
  }
  function clickHead() {
    if (!heldItem || !on() || G.uiOpen) return false; const hit = G.lookHit && G.lookHit(); if (!hit || !hit.head || G.held) return false;
    const bk = heldItem.bk, n = hit.head.rec.c.name;
    if (!bk.names.includes(n)) { G.toast(`《${bk.ti}》里没有提到「${n}」。`, '#ff9aa4', 1.8); return true; }
    const res = claim(bk, n); if (res.err) G.toast(res.err, '#ffb0b0', 2.2); else drawHeld();
    return true;
  }
  function keyCap(e) {
    if (!on()) return;
    if (R) { if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } return; }
    if (!heldItem || !G.playing || G.uiOpen) return;
    if (e.code === 'KeyT') { e.preventDefault(); e.stopPropagation(); cycle(); }
    else if (e.code === 'KeyY') { e.preventDefault(); e.stopPropagation(); open(heldItem); }
  }

  // ---------- 麻袋菜单 / 典籍页签 ----------
  function menu(o, wild) {
    const a = [['📖 阅读', () => open(o)]];
    if (!wild) a.push(['✋ 拿在手里（对证）', () => hold(o)]);
    return a;
  }
  function tabHtml(items) {
    const list = items.filter(o => o && o.bk), b = bkS();
    const sum = `<div class="sum">📖 已收藏 <b>${list.length}</b> 份书籍 · 累计对证 <b>${b.n || 0}</b> 次。金色名字 = 洞里有她，可以对证；红色 = 还没找到；青色 = 已对证。</div>`;
    if (!list.length) return `<div class="bk-tab">${sum}<p style="color:#877">还没有书。野外的箱子、武器架、尸体（尤其是有名字的、和霸主）身上有机会摸到书或笔记。</p></div>`;
    return `<div class="bk-tab">${sum}${list.map(o => { const bk = o.bk, u = window.ItemIcons && ItemIcons.url(bk.t), T = TIER[bk.t] || TIER.note;
      return `<div class="bk-card">${u ? `<img src="${u}" alt="">` : `<span style="font-size:32px">${T.icon}</span>`}<div class="bi"><b>《${esc(bk.ti)}》</b><small>${T.n} · ${bk.pg.length} 页 · ${esc(bk.sub || '')}</small>${bk.names.map(n => `<span class="chip ${stOf(bk, n)}">${esc(n)}${bk.cl[n] ? ' ✔' : ''}</span>`).join('') || '<span style="color:#877">没有名字</span>'}</div><button class="bk-b" data-bkr="${o.u}">阅读</button><button class="bk-b" data-bkh="${o.u}">拿在手里</button></div>`; }).join('')}</div>`;
  }
  function bindTab(root, all) {
    css();
    root.querySelectorAll('[data-bkr]').forEach(b => b.onclick = () => open(all.find(o => o.u === +b.dataset.bkr)));
    root.querySelectorAll('[data-bkh]').forEach(b => b.onclick = () => hold(all.find(o => o.u === +b.dataset.bkh)));
  }

  function init() {
    if (init.done) return; init.done = true; defs(); css();
    document.addEventListener('keydown', keyCap, true);
    if (G.HOOK) {
      G.HOOK.frame.push(frame); G.HOOK.tip.unshift(tipFor); G.HOOK.click.unshift(clickHead);
    }
  }
  // 等 G 就绪
  const wait = setInterval(() => { if (window.G && G.HOOK && window.Sack && Sack.def) { clearInterval(wait); try { init(); } catch (e) { console.warn('Books.init', e); } } }, 300);

  return { on, open, close, hold, drop, gen, item, rollLoot, starter, claim, menu, tabHtml, bindTab, defs, recOf, stOf, TIER, get held() { return heldItem; }, get reading() { return !!R; } };
})();
