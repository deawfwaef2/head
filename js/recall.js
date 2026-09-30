// 第二十五轮：回忆系统（MOD `recall`，默认开）——所有新头的名字 / 性格 / 身份 / 信仰 / 目的 / 外貌 / 生平 / 属性 / 战斗经过 / 棋路 / 牌面 一开始全是「？？？」，
// 你只看得到稀有度和得自哪里。按 F 打开「回忆」：一只食人魔的手托着她的头，面对面——用各种动作一点点想起她是谁。
//   · 徒手动作（对视 / 抚摸 / 嗅闻 / 倾听 / 把玩 / 回忆战斗）随时可用；更多动作要建筑解锁（通灵台、茶会、魔镜、化妆台、熔魂炉、头棋殿、赌桌……）
//   · 战斗经过由 worlds.js 的 foeEvent / hitPlayer 记录进 c.fight（她打了你多少、你打了她多少、怎么死的）
//   · 知识存在 c.kn（旧存档的头没有 c.kn → 视为全部已知，不会突然失忆）；lore.makeCharacter 新生成的头带 kn:{}
// API：Recall.open(rec, cb) / .close() / .active / .nm(c) 遮罩后的名字 / .known(c,k) / .reveal(rec,k) / .log(fo,type,data) / .hurtBy(fo,n) / .card(rec) 档案卡遮罩 HTML
window.Recall = (() => {
  const RC = ['#b8b8c0', '#4aa8ff', '#c05aff', '#ffb020', '#ff4a8a'], RN = ['凡魂', '灵魂', '英魂', '圣魂', '神魂'];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const GG = () => window.G || window.__game || {};
  const modOn = () => !window.Mods || Mods.on('recall') !== false;
  const hash = s => { s = String(s); let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  // ================= 知识 =================
  const known = (c, k) => !modOn() || !c || c.kn === undefined || k === 'name' || !!c.kn[k]; // 名字/魂阶/阶位不需要回忆（用户要求）
  const tag = c => '#' + (hash((c && c.name) || '') % 4096).toString(16).toUpperCase().padStart(3, '0');
  const nm = c => !c ? '？' : c.name;
  const adorn = rec => { const L = rec.look || {}, out = []; if (window.HeadWear && L.hw) out.push(...HeadWear.names(L.hw)); if (L.scar) out.push('脸上有一道旧伤疤'); if (L.feat && window.Lore && Lore.FEAT_TXT && Lore.FEAT_TXT[L.feat]) out.push(Lore.FEAT_TXT[L.feat]); if (L.glowEye) out.push('瞳孔深处仍燃着魂火'); if (L.shiny) out.push('异色的发光泽'); return out.length ? out.join(' · ') : '没有什么特别的饰物，也没有伤疤'; };
  const FAC = [
    { k: 'trait', ic: '🎭', n: '性格', v: r => (r.c.traits || []).join('、') },
    { k: 'face', ic: '👁', n: '外貌', v: r => r.app || '（看不清）' },
    { k: 'race', ic: '🧬', n: '身份', v: r => `${r.c.raceN} · ${r.c.idN} · ${r.c.age} 岁` },
    { k: 'belief', ic: '🕯', n: '信仰', v: r => r.c.belief },
    { k: 'adorn', ic: '🎀', n: '饰物与印记', v: adorn },
    { k: 'fight', ic: '⚔', n: '那一战', v: r => fightBrief(r) },
    { k: 'rank', ic: '🎖', n: '阶位传承', v: r => window.Ranks ? Ranks.text(r.c) + ' · ' + Ranks.of(r.c).B.d : '—' },
    { k: 'goal', ic: '🎯', n: '生前目的', v: r => r.c.goal },
    { k: 'story', ic: '📜', n: '生平', v: r => r.story || '（一片空白）' },
    { k: 'bio', ic: '🗝', n: '小习惯与秘密', v: r => window.Overhear ? (b => `爱${b.quirk}；喜欢${b.like}；讨厌${b.hate}；最怕${b.fear}；秘密：${b.secret}`)(Overhear.bio(r.c)) : '—' },
    { k: 'stat', ic: '💠', n: '魂印与产出', v: r => statText(r) },
    { k: 'chess', ic: '♟', n: '棋路', v: r => window.HeadGame ? HeadGame.profile(r).chess.style : '—' },
    { k: 'card', ic: '🃏', n: '牌面', v: r => window.HeadGame ? HeadGame.profile(r).card.name : '—' }
  ];
  const FK = {}; FAC.forEach(f => FK[f.k] = f);
  const nKnown = c => FAC.filter(f => known(c, f.k)).length;
  function statText(r) { const c = r.c, G = GG(), y = G.yieldOf ? +G.yieldOf(r).toFixed(1) : 1; const aff = (c.aff || []).map(k => window.RPG && RPG.AFF[k] ? RPG.AFF[k].n : k); return `魂晶产出 ×${y}${aff.length ? ' · 魂印：' + aff.join('、') : ' · 无魂印'}`; }
  function reveal(rec, k, quiet) {
    const c = rec.c; if (!c || c.kn === undefined || c.kn[k]) return false; c.kn[k] = 1;
    const G = GG(); let coins = Math.round(8 * (1 + c.rar * c.rar * 0.6)); if (G.addCoins && coins > 0) G.addCoins(coins);
    if (!quiet && G.toast) G.toast(`🧠 想起了她的${FK[k].n}　+${coins}🔮`, RC[c.rar], 1.8);
    // 自动回想：4 项之后想起名字；7 项之后想起目的；全部想起 → 完全回忆
    const others = FAC.filter(f => f.k !== 'rank' && f.k !== 'goal' && known(c, f.k)).length;
    if (!c.kn.rank && others >= 4) { c.kn.rank = 1; note('她的来路渐渐清楚了——' + (window.Ranks ? Ranks.text(c) : '') + '。'); if (S.open) S.dirty = 1; }
    if (!c.kn.goal && others >= 7) { c.kn.goal = 1; note('拼凑到这里，她生前最想做的事也清晰了：' + c.goal + '。'); }
    if (!c.kn.done && FAC.every(f => known(c, f.k))) { c.kn.done = 1; rec.recalled = true; const b = Math.round(60 * (1 + c.rar * c.rar)); G.addCoins && G.addCoins(b); G.toast && G.toast(`🧠 完全回忆了「${c.name}」　+${b}🔮`, '#ffe070', 3); }
    G.saveSoon ? G.saveSoon() : (G.save && G.save()); if (S.open) S.dirty = 1; return true;
  }
  function note(t) { if (S.open) S.notes.push(t); }
  // ================= 战斗记录（foe.js → worlds.js foeEvent / hitPlayer 调用）=================
  const now = () => performance.now() / 1000;
  function F(fo) { const c = fo && fo.h && fo.h.c; if (!c || c.kn === undefined) return null; return c.fight || (c.fight = { t0: now(), hits: 0, dealt: 0, mx: 0, your: 0, tk: 0, my: 0, hd: 0, brk: 0, ev: {}, first: '', dur: 0 }); }
  function log(fo, t, d) {
    const f = F(fo); if (!f || fo.dead && t !== 'kill') return; d = d || {};
    if (t === 'hit') { if (!f.first) f.first = 'you'; f.your++; f.tk += d.dealt || 0; f.my = Math.max(f.my, d.dealt || 0); if (d.zone === 'head' || d.zone === 'neck') f.hd++; if (d.brk) f.brk++; f.t1 = now(); return; }
    if (t === 'kill') { f.dur = Math.max(1, Math.round(now() - f.t0)); f.role = fo.role || ''; f.armed = !!fo.armed; f.boss = !!fo.boss; f.maxHp = fo.maxHp; f.how = fo.decap ? 'decap' : fo.halved ? 'halve' : (f.ev.execute ? 'execute' : f.ev.onecut ? 'onecut' : f.ev.decapAlive ? 'decapAlive' : 'kill'); return; }
    f.ev[t] = (f.ev[t] || 0) + 1;
  }
  function hurtBy(fo, n) { const f = F(fo); if (!f) return; if (!f.first) f.first = 'her'; f.hits++; f.dealt += n; f.mx = Math.max(f.mx, n); }
  const HOW = { decap: '斩下了她的头', onecut: '一刀斩首——她几乎没来得及叫出声', execute: '趁她露出破绽，当场处决', decapAlive: '她还站着的时候，刀就斩断了脖子', halve: '把她拦腰斩断', kill: '她倒下了，然后你才割下她的头' };
  function fightBrief(r) { const f = r.c.fight; if (!f) return '记忆已经模糊了'; return `${f.dur ? f.dur + ' 秒' : '一瞬'} · 她伤你 ${f.dealt} · 你伤她 ${f.tk}`; }
  function fightHTML(r) {
    const f = r.c.fight, RI = window.FoeRoles && FoeRoles.INFO;
    if (!f) return '<div class="rc-p-h">那一战</div><p>……记忆模糊了。你只记得血的味道，和刀落下去的感觉。</p>' + (r.mem ? `<p>${esc(r.mem)}</p>` : '');
    const role = f.role && RI && RI[f.role] ? RI[f.role].n : '', ev = f.ev || {}, L = [];
    L.push(`你们交手了 <b>${f.dur || '不到 1'}</b> 秒。${f.first === 'her' ? '<b>她先动的手</b>——你是被逼着还手的。' : f.first === 'you' ? '<b>你抢到了先手</b>。' : ''}`);
    L.push(`她命中你 <b>${f.hits}</b> 次，共造成 <b style="color:#ff8a7a">${f.dealt}</b> 点伤害${f.hits ? `，最重的一下 <b>${f.mx}</b>` : '——她一下都没碰到你'}。`);
    L.push(`你砍中她 <b>${f.your}</b> 次，共 <b style="color:#ffe070">${f.tk}</b> 点${f.your ? `，最重的一刀 <b>${f.my}</b>` : ''}；其中 <b>${f.hd}</b> 刀落在头颈${f.brk ? `，<b>${f.brk}</b> 刀趁她破绽` : ''}。`);
    const bits = []; if (ev.parry) bits.push(`完美格挡 ${ev.parry} 次`); if (ev.guard) bits.push(`挡下 ${ev.guard} 次`); if (ev.blocked) bits.push(`她挡住你 ${ev.blocked} 次`); if (ev.guardbreak) bits.push(`破防 ${ev.guardbreak} 次`); if (ev.outflank) bits.push(`绕开她的格挡 ${ev.outflank} 次`); if (ev.perfectdodge) bits.push(`完美闪避 ${ev.perfectdodge} 次`);
    if (bits.length) L.push(bits.join(' · ') + '。');
    L.push(`${role ? `她是个「${role}」${f.armed ? '，拿着武器' : '，赤手空拳'}。` : (f.armed ? '她拿着武器。' : '她赤手空拳。')}${f.boss ? '她是这里的霸主。' : ''}最后，你${HOW[f.how] || HOW.kill}。`);
    const tough = f.dealt >= 40 ? '她是个狠角色，你差点折在她手里。' : f.dealt <= 0 ? '她从头到尾都没能伤到你——这一战几乎是单方面的。' : f.dealt < 12 ? '她只在你身上留下了几道划痕。' : '那是一场不轻松的战斗。';
    return `<div class="rc-p-h">那一战</div>${L.map(x => `<p>${x}</p>`).join('')}<p class="rc-dim">${tough}</p>` + (r.mem ? `<div class="rc-p-h" style="margin-top:10px">你是怎么得到她的</div><p>${esc(r.mem)}</p>` : '');
  }
  // ================= 档案卡遮罩（ui.js openCard 用）=================
  function card(rec) { // 返回 { name, idLine, kv, aff, app, story, hide }
    const c = rec.c, u = k => known(c, k), Q = '<span class="rc-q">？？？</span>';
    return { name: nm(c), title: u('name') && c.title ? c.title : '', idLine: u('race') ? `${c.raceN} · ${c.idN} · ${c.age} 岁 · 得自 ${c.locN}` : `？？？ · 得自 ${c.locN}`,
      trait: u('trait') ? (c.traits || []).join('、') : Q, belief: u('belief') ? c.belief : Q, goal: u('goal') ? c.goal : Q, yield: u('stat'), rank: u('rank'), bio: u('bio'), aff: u('stat'), app: u('face'), story: u('story'), n: nKnown(c), total: FAC.length, all: modOn() ? (c.kn !== undefined ? FAC.every(f => u(f.k)) : true) : true };
  }
  // ================= 动作 =================
  const hasB = keys => { const S_ = GG().S, bs = (S_ && S_.builds) || []; return keys.some(k => bs.some(b => b.type === k)); };
  const bn = keys => keys.map(k => (window.BuildCat && BuildCat.C[k] && BuildCat.C[k].n) || k).join(' / ');
  const ACT = {
    stare: { ic: '👁', n: '对视', d: '把她的脸举到眼前，直直地看进她的眼睛', fac: 'trait', dur: 3.6 },
    stroke: { ic: '🤚', n: '抚摸头发', d: '用手指慢慢梳理她的发丝', fac: 'face', dur: 3.2 },
    sniff: { ic: '👃', n: '嗅闻', d: '凑近她的颈口与发间，深深吸一口气', fac: 'race', fac2: 'rank', dur: 2.8 },
    listen: { ic: '👂', n: '贴耳倾听', d: '把耳朵贴到她冰凉的嘴唇上', fac: 'belief', dur: 3.4 },
    handle: { ic: '🤲', n: '把玩 · 捏脸', d: '自己来：拖动转头，点她的脸颊（捏 + 转满 8 下）', fac: 'adorn', free: true },
    battle: { ic: '⚔', n: '回忆战斗', d: '重温你和她的那一战——她打了你多少？', fac: 'fight', dur: 2.2 },
    seance: { ic: '🔮', n: '通灵', d: '在通灵台上回溯她生前的记忆', fac: 'story', need: ['seance'], dur: 0 },
    tea: { ic: '☕', n: '茶话', d: '请她「喝」一杯茶，听她聊聊往事', fac: 'goal', need: ['tea_party'], dur: 3.6 },
    mirror: { ic: '🪞', n: '照魔镜', d: '让魔镜照出她生前的样子，和藏在镜子里的小秘密', fac: 'bio', need: ['gothic_commode'], dur: 3.6 },
    dress: { ic: '💄', n: '梳妆', d: '给她梳头、点朱唇，换几种表情', fac: 'adorn', need: ['dresser'], dur: 3.4 },
    appraise: { ic: '💠', n: '鉴魂', d: '投入熔魂炉的火光中，试探她的魂印与产出', fac: 'stat', need: ['forge', 'appraisal', 'auction'], dur: 3 },
    chess: { ic: '♟', n: '翻阅棋谱', d: '看她在头棋里会怎么走', fac: 'chess', need: ['chess'], dur: 2.2 },
    card: { ic: '🃏', n: '抽取牌面', d: '看她在头牌里是一张什么牌', fac: 'card', need: ['bowling', 'roulette', 'auction', 'wheel'], dur: 2.2 }
  };
  const ORDER = ['stare', 'stroke', 'sniff', 'listen', 'handle', 'battle', 'seance', 'tea', 'mirror', 'dress', 'appraise', 'chess', 'card'];
  const TRV = window.Seance && Seance.TR;
  const trLine = c => { const T = (window.Seance && Seance.TR) || {}; const t = (c.traits || [])[0]; return T[t] ? T[t][0] : '……'; };
  const trEx = c => { const T = (window.Seance && Seance.TR) || {}; const t = (c.traits || [])[0]; return T[t] ? T[t][1] : {}; };
  function narrate(a, rec) { // → { t: 文本, panel?: html }
    const c = rec.c, tr = (c.traits || []).join('、'), pr = window.HeadGame ? HeadGame.profile(rec) : null;
    switch (a) {
      case 'stare': return { t: `你把她举到和你的眼睛一样高。她的瞳孔里没有光，却像在回看你……看得久了，她是个什么样的人，从眉梢、唇角一点点透了出来——<b>${esc(tr)}</b>。<br><span class="rc-dim">她的嘴唇动了动，像在说：「${esc(trLine(c))}」</span>` };
      case 'stroke': return { t: `指尖顺着发丝滑下去，每一缕都带着旧日的气味。你一点点看清了她的样子——<br>${esc(rec.app || '')}` };
      case 'sniff': return { t: `你把鼻尖凑到她的颈口和发间，深深吸了一口气：血、铁锈，和一点<b>${esc(c.raceN)}</b>特有的味道。这是一个<b>${c.age}</b> 岁的<b>${esc(c.idN)}</b>，来自${esc(c.locN)}。`, panel: window.Ranks ? `<div class="rc-p-h">阶位 · 传承</div>${Ranks.ladderHTML(c)}` : '' };
      case 'listen': return { t: `你把耳朵贴到她的嘴唇上。什么声音也没有……接着，像是很远很远的地方，有人在低声念着：「${esc(c.belief)}……」——那是她信的东西。` };
      case 'handle': return { t: `你把她的脸翻来覆去地看：${esc(adorn(rec))}。` };
      case 'battle': return { t: '你闭上眼，那一战的每一个细节重新涌上来……', panel: fightHTML(rec) };
      case 'tea': return { t: `你把一杯茶放在她的下巴底下，假装她在喝。蒸汽里，她的脸渐渐软下来，开始断断续续地讲自己的事……最后说到：「${esc(c.goal)}」。` };
      case 'mirror': return { t: '魔镜里映出的，是她还活着时的样子——眼睛有光，脸颊带血色。镜面深处，一些她从没对人说过的小事慢慢浮了上来。', panel: window.Overhear ? `<div class="rc-p-h">镜中的她</div>${Overhear.bioHTML(c)}` : '' };
      case 'dress': return { t: `你笨拙地给她梳头、点上一点朱红。她的脸在你手里换了几种表情——像每一种她曾是的样子。<br>${esc(adorn(rec))}` };
      case 'appraise': return { t: '火光映在她的脸上，魂晶在颅骨深处一闪一闪地亮着。你数清了它们。', panel: `<div class="rc-p-h">鉴魂</div><p>${esc(statText(rec))}</p><p class="rc-dim">${(c.aff || []).map(k => window.RPG && RPG.affHTML ? RPG.affHTML(k, 'card') : esc(k)).join('')}</p>` };
      case 'chess': { const p = pr.chess; return { t: `你翻开一本浸过血的棋谱。她下棋的路数是「<b>${esc(p.style)}</b>」。`, panel: chessHTML(rec) }; }
      case 'card': return { t: '你把她的魂光洗成一张牌。', panel: cardHTML(rec) };
    }
    return { t: '' };
  }
  function chessHTML(rec) {
    const p = HeadGame.profile(rec).chess, G8 = 7, cells = [];
    const mv = {}; p.extra.forEach(e => mv[(e.dx) + ',' + (e.dy)] = 1);
    for (let y = G8 - 1; y >= -G8 + 3; y--) { let row = ''; for (let x = -G8 + 3; x <= G8 - 3; x++) { const mid = x === 0 && y === 0; row += `<i class="${mid ? 'me' : mv[x + ',' + y] ? 'on' : ''}">${mid ? '♟' : mv[x + ',' + y] ? '●' : ''}</i>`; } cells.push('<div>' + row + '</div>'); }
    return `<div class="rc-p-h">♟ 「${esc(p.style)}」</div><div class="rc-cb">${cells.join('')}</div><p>底子是<b>${p.baseN}</b>（魂阶决定），再叠加：${p.shapeNames.map(n => `<b>${esc(n)}</b>`).join('、')}——绿点是她额外能跳到的格子（向上为前方，可越子、可吃子）。</p><p class="rc-dim">${p.lines.map(esc).join('<br>')}</p>`;
  }
  const KWI = { taunt: '🛡', charge: '⚡', drain: '🩸', stealth: '👁', shield: '🔰', frenzy: '🔥', venom: '☠', echo: '🔁', swift: '💨' };
  function cardHTML(rec) {
    const k = HeadGame.profile(rec).card, c = rec.c, col = RC[c.rar];
    const tag = t => /^战吼/.test(t) ? ['战吼', '登场时触发'] : /^亡语/.test(t) ? ['亡语', '死亡时触发'] : ['被动', '一直生效'];
    const fx = k.text.map(t => { const g = tag(t); return `<div class="rc-fx"><em>${g[0]}</em>${esc(t.replace(/^(战吼|亡语)[:：]?/, ''))}</div>`; }).join('');
    const kws = k.kw.map(w => `<span class="rc-kc" title="${esc(w.d)}">${KWI[w.k] || '✦'} ${w.n}</span>`).join('');
    const card = `<div class="rc-card foil r${c.rar}${c.shiny ? ' sh' : ''}" style="--c:${col}" onmousemove="RecallCard.tilt(event,this)" onmouseleave="RecallCard.leave(this)"><i class="rc-shine"></i>
      <div class="rc-cost" title="费用">${k.cost}</div><div class="rc-cn">${esc(k.name)}</div><div class="rc-ca">${esc(c.raceN)} · ${esc(k.cls)} · ${RN[c.rar]}${c.shiny ? ' ✨' : ''}</div>
      <div class="rc-kcs">${kws}</div><div class="rc-ct">${fx || '<div class="rc-fx" style="opacity:.6">（没有特殊效果，纯靠身板）</div>'}</div><div class="rc-cf">${esc(k.flavor)}</div>
      <div class="rc-atk" title="攻击">${k.atk}</div><div class="rc-hp" title="生命">${k.hp}</div></div>`;
    const read = `<div class="rc-rd"><div><b style="color:#7fb8ff">${k.cost}</b> 费用　打出它要花 ${k.cost} 点魂力（越强越贵）</div><div><b style="color:#ffd060">${k.atk}</b> 攻击　每次攻击对目标造成的伤害</div><div><b style="color:#ff7a8a">${k.hp}</b> 生命　扛到 0 就阵亡</div></div>`;
    const kd = k.kw.length ? k.kw.map(w => `<div class="rc-kd"><b>${KWI[w.k] || '✦'} ${w.n}</b> ${esc(w.d)}</div>`).join('') : '<div class="rc-kd" style="opacity:.6">没有关键词</div>';
    const cid = 'rcd' + Math.floor(Math.random() * 1e6);
    return `<div class="rc-cw"><div class="rc-cl">${card}<div class="rc-cap">↑ 鼠标在牌上移动可以倾斜看反光</div></div><div class="rc-cr"><h5>怎么读这张牌</h5>${read}<h5>关键词</h5>${kd}
      <h5>试打 <small>对着一只稻草人打一回合</small></h5>
      <div class="rc-arena" id="${cid}" data-k="${esc(JSON.stringify({ n: k.name, cost: k.cost, atk: k.atk, hp: k.hp, kw: k.kw.map(w => w.k), fx: k.text, col }))}">
        <div class="rc-u me"><div class="rc-ub">🂠</div><b class="rc-un"></b><div class="rc-hb"><i></i></div><span class="rc-hn"></span></div><div class="rc-vs">VS</div>
        <div class="rc-u dm"><div class="rc-ub">🎃</div><b class="rc-un">稻草人</b><div class="rc-hb"><i></i></div><span class="rc-hn"></span></div></div>
      <button class="rc-btn" onclick="RecallCard.duel('${cid}',this)">▶ 试打</button><div class="rc-dlog" id="${cid}l">点「试打」看看她在场上是什么样。</div></div></div>`;
  }
  // 卡牌试打：一只稻草人（攻 2）对一回合——演示费用/战吼/关键词怎么起作用
  window.RecallCard = {
    tilt(e, el) { const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height; el.style.setProperty('--rx', ((0.5 - y) * 16).toFixed(1) + 'deg'); el.style.setProperty('--ry', ((x - 0.5) * 20).toFixed(1) + 'deg'); el.style.setProperty('--mx', (x * 100).toFixed(0) + '%'); el.style.setProperty('--my', (y * 100).toFixed(0) + '%'); el.classList.add('hv'); },
    leave(el) { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); el.classList.remove('hv'); },
    duel(id, btn) {
      const A = document.getElementById(id), L = document.getElementById(id + 'l'); if (!A || A._busy) return; A._busy = 1; btn.disabled = true; btn.textContent = '试打中…';
      const k = JSON.parse(A.dataset.k), kw = k.kw, has = x => kw.includes(x), me = A.querySelector('.me'), dm = A.querySelector('.dm');
      let mh = k.hp, ma = k.atk, dh = k.atk + 2, dmax = dh, shield = has('shield'); const dmg = 2;
      const hpSet = (u, h, max) => { u.querySelector('.rc-hb i').style.width = Math.max(0, h / max * 100) + '%'; u.querySelector('.rc-hn').textContent = Math.max(0, h) + '/' + max; };
      me.querySelector('.rc-un').textContent = k.n; me.querySelector('.rc-ub').style.color = k.col; hpSet(me, mh, k.hp); hpSet(dm, dh, dmax); L.innerHTML = '';
      me.classList.remove('dead'); dm.classList.remove('dead'); me.style.opacity = 0; me.style.transform = 'translateY(-30px) scale(1.4)';
      const log = (t, c) => { const d = document.createElement('div'); d.innerHTML = t; if (c) d.style.color = c; d.className = 'rc-dl'; L.appendChild(d); L.scrollTop = 1e5; try { window.SFX && SFX.click && SFX.click(); } catch (e) {} };
      const fl = (u, t, c) => { const d = document.createElement('div'); d.className = 'rc-fl'; d.textContent = t; d.style.color = c; u.appendChild(d); setTimeout(() => d.remove(), 1100); };
      const hit = (u, from) => { u.classList.add('hit'); setTimeout(() => u.classList.remove('hit'), 300); try { window.SFX && SFX.thud && SFX.thud(0.6, 1); } catch (e) {} };
      const lunge = (u, dir) => { u.style.transform = `translateX(${dir * 54}px) scale(1.12)`; setTimeout(() => { u.style.transform = ''; }, 230); };
      const Q = []; const q = (ms, f) => Q.push([ms, f]);
      q(200, () => { me.style.opacity = 1; me.style.transform = ''; log(`① 花 <b>${k.cost}</b> 魂力打出「${k.n}」`, '#9fd0ff'); });
      k.fx.forEach(t => q(650, () => { const b = /^战吼/.test(t), d = /^亡语/.test(t); log(b ? `② 战吼触发：${t.replace(/^战吼[:：]?/, '')}` : d ? `✦ 亡语（她倒下时才会触发）：${t.replace(/^亡语[:：]?/, '')}` : `✦ 被动：${t}`, '#ffd890'); if (b) fl(me, '战吼!', '#ffd060'); }));
      if (has('taunt')) q(600, () => log('🛡 嘲讽：稻草人只能来打她', '#c8e0ff'));
      if (has('stealth')) q(600, () => log('👁 潜行：攻击前不会被盯上', '#c8e0ff'));
      const rounds = has('swift') ? 2 : 1;
      for (let r = 0; r < rounds; r++) {
        q(700, () => { if (dh <= 0) return; lunge(me, 1); const d = has('venom') ? dh : ma; setTimeout(() => { dh -= d; hpSet(dm, dh, dmax); hit(dm); fl(dm, '-' + (has('venom') ? '☠' : d), '#ff7070'); if (has('drain')) fl(me, '+' + ma + ' 英雄', '#7aff9a'); }, 160);
          log(`⚔ ${r ? '疾风：第二次攻击！' : '她冲上去攻击稻草人'}${has('venom') ? '（剧毒：一击即死）' : '，造成 ' + ma + ' 点伤害'}${has('drain') ? '，吸魂为英雄回复 ' + ma : ''}`); });
        q(800, () => { if (dh <= 0 || r === 1) return; lunge(dm, -1); setTimeout(() => { if (shield) { shield = false; fl(me, '魂盾!', '#7fd0ff'); log('🔰 魂盾破裂，抵挡了这次伤害', '#7fd0ff'); } else { mh -= dmg; hpSet(me, mh, k.hp); hit(me); fl(me, '-' + dmg, '#ff7070'); log(`稻草人反击，她受到 ${dmg} 点伤害`, '#ff9a9a'); if (has('frenzy') && mh > 0) { ma += 2; fl(me, '狂怒 +2', '#ff9a40'); log('🔥 狂怒：受伤后攻击 +2', '#ffb070'); } } }, 160); });
      }
      if (has('echo')) q(700, () => log('🔁 回响：回合结束，战吼再触发一次', '#ffd890'));
      q(900, () => { const won = dh <= 0, dead = mh <= 0; if (dead) { me.classList.add('dead'); } if (won) dm.classList.add('dead');
        log(won && !dead ? `🏆 稻草人倒下！她还剩 ${mh}/${k.hp} 生命。` : won ? '💥 同归于尽！' : dead ? '她倒下了……稻草人还剩 ' + dh + ' 点生命。' : `稻草人还剩 ${dh} 点生命，她剩 ${mh}/${k.hp}——下回合继续。`, won ? '#7aff9a' : '#ffb070');
        if (dead && k.fx.some(t => /^亡语/.test(t))) log('✦ 亡语触发！', '#ffd890'); btn.disabled = false; btn.textContent = '↻ 再试一次'; A._busy = 0; });
      let t = 0; Q.forEach(([ms, f]) => { t += ms; setTimeout(f, t); });
    }
  };
  // ================= 3D 场景 =================
  const S = { open: false, rec: null, dirty: 0, notes: [] };
  let el = null, R = null, scene, cam, rig, pivot, hb = null, raf = 0, handG = null, lights = {};
  const EXK = ['happy', 'angry', 'sad', 'relaxed', 'surprised', 'blink', 'blinkleft', 'blinkright', 'aa', 'ih', 'ou', 'ee', 'oh'];
  const $q = s => el.querySelector(s);
  const CSS = `#recall{position:fixed;inset:0;z-index:70;display:none;background:radial-gradient(ellipse at 50% 42%,#3a2a2c 0%,#1d1416 55%,#0b0708 100%);color:#e9dccb;font:14px/1.6 system-ui,'PingFang SC','Microsoft YaHei',sans-serif;user-select:none;opacity:0;transition:opacity .35s}
#recall.on{opacity:1}#recall canvas{position:absolute;inset:0;width:100%;height:100%;cursor:grab}#recall canvas.drag{cursor:grabbing}
#recall .rc-vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 45%,rgba(0,0,0,.65) 100%)}
#recall .rc-flash{position:absolute;inset:0;pointer-events:none;background:#7a0010;opacity:0;transition:opacity .4s}
#recall .rc-top{position:absolute;left:50%;top:14px;transform:translateX(-50%);text-align:center;pointer-events:none;text-shadow:0 2px 10px #000}
#recall .rc-rar{font-size:13px;letter-spacing:.3em}#recall .rc-name{font:700 28px/1.3 serif;letter-spacing:.12em}#recall .rc-sub{font-size:12px;color:#b9a898}
#recall .rc-left,#recall .rc-right{position:absolute;top:84px;bottom:140px;background:rgba(18,12,14,.72);border:1px solid rgba(232,192,112,.25);border-radius:14px;backdrop-filter:blur(6px);padding:14px 14px;overflow:auto;box-shadow:0 8px 30px #0008}
#recall .rc-left{left:18px;width:292px}#recall .rc-right{right:18px;width:336px}
#recall h3{margin:0 0 8px;font:700 15px/1.4 serif;color:#e8c070;letter-spacing:.2em;display:flex;justify-content:space-between;align-items:baseline}#recall h3 small{font:12px system-ui;color:#9d8a78;letter-spacing:0}
#recall .rc-prog{height:4px;background:#0006;border-radius:2px;margin:0 0 10px;overflow:hidden}#recall .rc-prog i{display:block;height:100%;background:linear-gradient(90deg,#c03040,#ffd27a);width:0;transition:width .5s}
#recall .rc-f{display:flex;gap:8px;padding:6px 8px;border-radius:8px;margin-bottom:4px;background:rgba(255,255,255,.03);border:1px solid transparent;cursor:default;transition:background .4s,border-color .4s}
#recall .rc-f.k{background:rgba(232,192,112,.09);cursor:pointer}#recall .rc-f.k:hover{border-color:rgba(232,192,112,.45)}#recall .rc-f.new{background:rgba(255,210,122,.3);border-color:#ffd27a}
#recall .rc-f b{font-weight:600;font-size:12px;color:#c8b8a6;min-width:74px;display:block}#recall .rc-f span{font-size:12.5px;color:#f1e6d6;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#recall .rc-f.u span{color:#6d5d55;letter-spacing:.3em}
#recall .rc-a{display:flex;gap:10px;align-items:center;padding:9px 10px;border-radius:10px;margin-bottom:7px;background:linear-gradient(135deg,rgba(192,48,64,.22),rgba(60,30,36,.5));border:1px solid rgba(232,192,112,.25);cursor:pointer;transition:transform .12s,border-color .2s,filter .2s}
#recall .rc-a:hover{transform:translateX(-3px);border-color:#ffd27a;filter:brightness(1.2)}#recall .rc-a .ic{font-size:26px;width:38px;text-align:center}#recall .rc-a b{display:block;font-size:14px}#recall .rc-a small{display:block;color:#b9a898;font-size:11.5px;line-height:1.35}
#recall .rc-a.done b:after{content:' ✓';color:#9fe08a}#recall .rc-a.lock{filter:grayscale(1) brightness(.55);cursor:not-allowed}#recall .rc-a.lock:hover{transform:none;border-color:rgba(232,192,112,.25)}#recall .rc-acts.busy .rc-a{pointer-events:none;opacity:.55}
#recall .rc-a .need{color:#ff9a7a;font-size:11px}#recall .rc-sec{font-size:11px;color:#8d7a6a;letter-spacing:.25em;margin:10px 0 6px}
#recall .rc-nar{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);width:min(760px,calc(100% - 720px));min-width:420px;min-height:84px;background:rgba(14,9,11,.82);border:1px solid rgba(232,192,112,.3);border-radius:14px;padding:14px 20px;font-size:15px;line-height:1.85;box-shadow:0 10px 40px #000a;backdrop-filter:blur(6px)}
#recall .rc-dim{color:#a8968a;font-size:13px}#recall .rc-q{color:#6d5d55;letter-spacing:.3em}
#recall .rc-panel{position:absolute;left:50%;top:92px;transform:translateX(-50%);width:min(560px,calc(100% - 720px));max-height:calc(100% - 290px);overflow:auto;background:rgba(14,9,11,.93);border:1px solid rgba(232,192,112,.4);border-radius:14px;padding:16px 22px;display:none;box-shadow:0 14px 50px #000c}
#recall .rc-panel.on{display:block;animation:rcin .35s}@keyframes rcin{from{opacity:0;transform:translate(-50%,10px)}}
#recall .rc-p-h{font:700 16px serif;color:#e8c070;letter-spacing:.2em;margin-bottom:6px}#recall .rc-panel p{margin:4px 0;font-size:14px;line-height:1.75}#recall .rc-px{position:absolute;right:10px;top:8px;cursor:pointer;color:#9d8a78}
#recall .rc-x{position:absolute;right:22px;top:16px;padding:8px 16px;border-radius:10px;background:rgba(18,12,14,.8);border:1px solid rgba(232,192,112,.35);color:#e9dccb;cursor:pointer;font:13px system-ui}#recall .rc-x:hover{border-color:#ffd27a}
#recall .rc-hint{position:absolute;left:50%;top:84px;transform:translateX(-50%);font-size:12px;color:#8d7a6a;pointer-events:none}
#recall .rc-cb{display:inline-grid;gap:2px;margin:6px 0}#recall .rc-cb div{display:flex;gap:2px}#recall .rc-cb i{display:inline-block;width:30px;height:30px;line-height:30px;text-align:center;font-style:normal;background:#2b1f22;color:#6fe38a;border-radius:4px}#recall .rc-cb i.me{background:#7a2a36;color:#fff}#recall .rc-cb i.on{background:#21402b}
#recall .rc-card{position:relative;width:236px;margin:6px auto;padding:14px 16px 16px;border-radius:14px;border:2px solid var(--c);background:linear-gradient(160deg,#2a1d22,#140d10);box-shadow:0 0 24px color-mix(in srgb,var(--c) 40%,transparent)}
#recall .rc-cost{position:absolute;left:-12px;top:-12px;width:38px;height:38px;border-radius:50%;background:#2a5fb0;border:2px solid #9fd0ff;font:700 20px/34px serif;text-align:center}#recall .rc-cn{font:700 17px serif;text-align:center;color:var(--c);margin:6px 0 0}
#recall .rc-ca{text-align:center;font-size:11px;color:#9d8a78;margin-bottom:8px}#recall .rc-ct{font-size:12.5px;line-height:1.6;min-height:70px;background:#0005;border-radius:8px;padding:8px 10px}#recall .rc-cf{font-style:italic;font-size:12px;color:#b9a898;margin-top:8px;text-align:center}
#recall .rc-atk,#recall .rc-hp{position:absolute;bottom:-12px;width:38px;height:38px;border-radius:50%;font:700 20px/34px serif;text-align:center;border:2px solid #fff3}#recall .rc-atk{left:-12px;background:#b08a20}#recall .rc-hp{right:-12px;background:#a02a36}
#recall .rc-panel:has(.rc-cw){width:min(820px,calc(100% - 640px));min-width:560px}
#recall .rc-cw{display:flex;flex-wrap:wrap;gap:22px;justify-content:center;align-items:flex-start}#recall .rc-cl{perspective:800px;flex:0 0 auto;padding:10px 14px}#recall .rc-cr{flex:1 1 280px;min-width:260px}
#recall .rc-cr h5{margin:10px 0 5px;font:700 14px serif;letter-spacing:.2em;color:#e8c070}#recall .rc-cr h5 small{font:11px system-ui;letter-spacing:0;color:#9d8a78;margin-left:6px}#recall .rc-cr h5:first-child{margin-top:0}
#recall .rc-cap{text-align:center;font-size:11px;color:#8d7a6a;margin-top:12px}
#recall .rc-card.foil{width:250px;min-height:310px;margin:6px auto;padding:14px 16px 18px;transform:rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .25s ease-out,box-shadow .3s;transform-style:preserve-3d;overflow:visible;border-width:3px}
#recall .rc-card.hv{transition:transform .05s;box-shadow:0 0 38px color-mix(in srgb,var(--c) 70%,transparent),0 18px 40px #000a}
#recall .rc-shine{position:absolute;inset:0;border-radius:11px;pointer-events:none;background:radial-gradient(circle at var(--mx,50%) var(--my,30%),#ffffff55,transparent 45%);mix-blend-mode:overlay;opacity:.5;transition:opacity .3s}#recall .rc-card.hv .rc-shine{opacity:1}
#recall .rc-card.r3::after,#recall .rc-card.r4::after,#recall .rc-card.sh::after{content:"";position:absolute;inset:0;border-radius:11px;pointer-events:none;background:linear-gradient(115deg,transparent 20%,#ff7ad055 35%,#7affd555 50%,#ffe07a55 65%,transparent 80%);background-size:250% 100%;animation:rcfoil 3.2s linear infinite;mix-blend-mode:screen}@keyframes rcfoil{from{background-position:120% 0}to{background-position:-120% 0}}
#recall .rc-card .rc-cn{font-size:21px;margin-top:10px}#recall .rc-card .rc-ca{font-size:12px}
#recall .rc-kcs{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-bottom:8px}#recall .rc-kc{padding:2px 9px;border-radius:12px;background:color-mix(in srgb,var(--c) 28%,#000);border:1px solid var(--c);font-size:12.5px;font-weight:700;cursor:help}
#recall .rc-card .rc-ct{font-size:13.5px;min-height:96px;line-height:1.65}#recall .rc-fx{margin-bottom:5px}#recall .rc-fx em{font-style:normal;font-size:11px;font-weight:700;padding:1px 6px;border-radius:4px;background:#e8c070;color:#2a1a08;margin-right:6px}
#recall .rc-card .rc-atk,#recall .rc-card .rc-hp,#recall .rc-card .rc-cost{width:44px;height:44px;font-size:24px;line-height:40px;box-shadow:0 3px 10px #000a}#recall .rc-card .rc-atk{bottom:-14px;left:-14px}#recall .rc-card .rc-hp{bottom:-14px;right:-14px}#recall .rc-card .rc-cost{left:-14px;top:-14px}
#recall .rc-rd div{font-size:13px;margin:2px 0}#recall .rc-rd b{font:700 18px serif;margin-right:2px}#recall .rc-kd{font-size:13px;margin:3px 0;padding:4px 8px;background:#ffffff0c;border-radius:6px;border-left:3px solid #e8c070}#recall .rc-kd b{color:#ffd890;margin-right:6px}
#recall .rc-arena{display:flex;align-items:center;justify-content:space-around;background:radial-gradient(ellipse at 50% 100%,#3a2a20,#16100e);border:1px solid #ffffff22;border-radius:10px;padding:12px 6px;margin-bottom:6px}#recall .rc-vs{font:700 18px serif;color:#8d7a6a}
#recall .rc-u{position:relative;width:110px;text-align:center;transition:transform .2s,opacity .3s,filter .3s}#recall .rc-u.hit{filter:brightness(2.2) saturate(2);transform:translateX(3px)}#recall .rc-u.dead{opacity:.25;filter:grayscale(1);transform:rotate(-12deg) translateY(8px)}
#recall .rc-ub{font-size:44px;line-height:1.1}#recall .rc-un{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#recall .rc-hb{height:7px;border-radius:4px;background:#0008;margin:3px 8px;overflow:hidden}#recall .rc-hb i{display:block;height:100%;background:linear-gradient(90deg,#d03a4a,#ff8a70);width:100%;transition:width .35s}#recall .rc-hn{font-size:11px;color:#c8b8a8}
#recall .rc-fl{position:absolute;left:50%;top:0;font:900 22px serif;text-shadow:0 2px 0 #000,0 0 8px #000;pointer-events:none;white-space:nowrap;animation:rcfl 1.1s ease-out forwards}@keyframes rcfl{0%{transform:translate(-50%,0) scale(.4);opacity:0}20%{transform:translate(-50%,-14px) scale(1.3);opacity:1}100%{transform:translate(-50%,-56px) scale(1);opacity:0}}
#recall .rc-dlog{min-height:60px;max-height:110px;margin-top:8px;overflow:auto;font-size:13px;line-height:1.6;background:#0006;border-radius:8px;padding:6px 10px;color:#b9a898}#recall .rc-dl{animation:rcin2 .3s}@keyframes rcin2{from{opacity:0;transform:translateX(-8px)}}
#recall .rc-btn{margin-top:2px;width:100%;padding:9px;border-radius:10px;border:1px solid #e8c07088;background:linear-gradient(180deg,#6a3a1a,#3a1e0e);color:#ffe8c0;font:700 15px system-ui;cursor:pointer}#recall .rc-btn:hover:not(:disabled){filter:brightness(1.25)}#recall .rc-btn:disabled{opacity:.6;cursor:default}
@media(max-width:1250px){#recall .rc-left{width:230px}#recall .rc-right{width:280px}#recall .rc-nar,#recall .rc-panel{width:calc(100% - 600px);min-width:300px}}`;
  function build() {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    el = document.createElement('div'); el.id = 'recall';
    el.innerHTML = `<canvas class="rc-3d"></canvas><div class="rc-vig"></div><div class="rc-flash"></div>
      <div class="rc-top"><div class="rc-rar"></div><div class="rc-name"></div><div class="rc-sub"></div></div>
      <div class="rc-left"><h3>记忆碎片<small class="rc-cnt"></small></h3><div class="rc-prog"><i></i></div><div class="rc-facets"></div></div>
      <div class="rc-right"><h3>动作<small>徒手 · 建筑解锁</small></h3><div class="rc-acts"></div></div>
      <div class="rc-panel"><span class="rc-px">✕</span><div class="rc-pb"></div></div>
      <div class="rc-nar"><div class="rc-nt"></div></div><div class="rc-hint">拖动：转动头颅 · 滚轮：拉近 / 拉远 · 点她的脸颊：捏</div>
      <button class="rc-x">✕ 收起回忆（F / Esc）</button>`;
    document.body.appendChild(el);
    R = new THREE.WebGLRenderer({ canvas: $q('.rc-3d'), alpha: true, antialias: true });
    R.outputEncoding = THREE.sRGBEncoding; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.15; R.setClearColor(0x000000, 0);
    scene = new THREE.Scene(); cam = new THREE.PerspectiveCamera(30, 1, 0.02, 10);
    lights.hemi = new THREE.HemisphereLight('#ffe8d0', '#2a1a20', 0.85); scene.add(lights.hemi);
    lights.key = new THREE.DirectionalLight('#ffd9b0', 1.5); lights.key.position.set(-0.7, 0.9, 1.1); scene.add(lights.key);
    lights.rim = new THREE.DirectionalLight('#9a7aff', 1.2); lights.rim.position.set(0.9, 0.4, -0.8); scene.add(lights.rim);
    lights.fire = new THREE.PointLight('#ff5a2a', 0, 1.6); lights.fire.position.set(0, -0.15, 0.25); scene.add(lights.fire);
    rig = new THREE.Group(); scene.add(rig); pivot = new THREE.Group(); rig.add(pivot);
    const cv = $q('.rc-3d');
    cv.addEventListener('pointerdown', onDown); addEventListener('pointermove', onMove); addEventListener('pointerup', onUp);
    cv.addEventListener('wheel', e => { if (!S.open) return; e.preventDefault(); V.dz = Math.max(-0.2, Math.min(0.45, V.dz + (e.deltaY > 0 ? 0.04 : -0.04))); }, { passive: false });
    $q('.rc-x').onclick = close; $q('.rc-px').onclick = () => panel(null);
    $q('.rc-acts').addEventListener('click', e => { const a = e.target.closest('.rc-a'); if (a) act(a.dataset.a); });
    $q('.rc-facets').addEventListener('click', e => { const f = e.target.closest('.rc-f.k'); if (f) showFacet(f.dataset.k); });
    addEventListener('resize', resize);
  }
  function resize() { if (!el || !R) return; const w = innerWidth, h = innerHeight; R.setPixelRatio(Math.min(devicePixelRatio, 1.5)); R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  // 食人魔的手：真实 VRM 手（assets/limb_hand_*，CC0）涂成绿皮、放大，掌心向上托住她的颈口（同时盖住切面）；前臂是一截绿皮圆柱（第一人称手臂同 game.js）
  function makeHand() {
    const g = new THREE.Group(), A = window.Assets, nm = ['limb_hand_avatar', 'limb_hand_jean', 'limb_hand_amber', 'limb_hand_mona', 'limb_hand_shenhe'].find(n => A && A.has && A.has(n));
    const skin = new THREE.MeshStandardMaterial({ color: '#6c9152', roughness: 0.78, metalness: 0 }), dark = new THREE.MeshStandardMaterial({ color: '#2a1d18', roughness: 0.9 });
    if (nm) {
      const h = A.clone(nm); h.traverse(o => { if (o.isMesh) { o.material = /cut/i.test(o.name) ? dark : skin; o.frustumCulled = false; } });
      const bb = new THREE.Box3().setFromObject(h), ctr = bb.getCenter(new THREE.Vector3()); h.position.sub(ctr);
      const hw = new THREE.Group(); hw.add(h); hw.scale.setScalar(3.1); hw.rotation.set(0, 0, Math.PI); // 翻面：掌心朝上
      g.add(hw); g.userData.hand = hw;
    }
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.105, 0.7, 16), skin); arm.rotation.x = Math.PI / 2; arm.position.set(0, 0, 0.5); g.add(arm);
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.112, 0.12, 16), new THREE.MeshStandardMaterial({ color: '#3a2a20', roughness: 0.8 })); br.rotation.x = Math.PI / 2; br.position.set(0, 0, 0.2); g.add(br);
    return g;
  }
  const V = { yaw: 0, pitch: 0, roll: 0, yawT: 0, pitchT: 0, rollT: 0, dz: 0, dzT: 0, ex: {}, exT: {}, sway: new THREE.Vector3(), squash: 0, drag: null, lastDrag: 0, turns: 0, pinches: 0, blinkAt: 0, blinkIn: 2, cx: 0, cy: 0, liftT: 0, lift: 0, mode: '', t0: 0, dur: 0, glow: 0, glowT: 0, alive: 0, aliveT: 0, mouth: 0 };
  let hbBase = 0.3, headR = 0.15;
  function onDown(e) { if (!S.open || V.mode === 'lock') return; V.drag = { x: e.clientX, y: e.clientY, moved: 0, x0: e.clientX, y0: e.clientY }; $q('.rc-3d').classList.add('drag'); try { e.target.setPointerCapture(e.pointerId); } catch (_) {} }
  function onMove(e) {
    if (!S.open || !V.drag) return; const dx = e.clientX - V.drag.x, dy = e.clientY - V.drag.y; V.drag.x = e.clientX; V.drag.y = e.clientY; V.drag.moved += Math.abs(dx) + Math.abs(dy);
    if (V.mode === 'act') return; V.yawT += dx * 0.011; V.pitchT = Math.max(-0.9, Math.min(0.9, V.pitchT + dy * 0.009)); V.lastDrag = performance.now() / 1000; V.turnAcc = (V.turnAcc || 0) + Math.abs(dx) + Math.abs(dy);
    if (V.turnAcc > 500) { V.turnAcc = 0; V.turns++; progressHandle(); }
  }
  function onUp(e) {
    if (!S.open || !V.drag) return; const d = V.drag; V.drag = null; $q('.rc-3d').classList.remove('drag');
    if (d.moved < 6 && V.mode !== 'act') pinch(e);
  }
  function pinch(e) { // 点脸：捏
    const p = new THREE.Vector3(0, 0, 0); pivot.getWorldPosition(p); p.project(cam); const sx = (p.x * 0.5 + 0.5) * innerWidth, sy = (-p.y * 0.5 + 0.5) * innerHeight;
    const rpx = headR / (cam.position.z - 0) / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * innerHeight * 0.5 * 1.0;
    const dx = (e.clientX - sx) / rpx, dy = (e.clientY - sy) / rpx; if (Math.hypot(dx, dy) > 1.15) return;
    V.squash = 1; const ex = {}; if (dy > 0.45) { ex.oh = 0.8; ex.surprised = 0.5; } else if (dy < -0.55) { ex.surprised = 0.9; ex.angry = 0.2; } else if (dx < 0) { ex.blinkleft = 1; ex.happy = 0.8; ex.aa = 0.3; } else { ex.blinkright = 1; ex.happy = 0.8; ex.aa = 0.3; }
    Object.assign(V.exT, ex); setTimeout(() => { for (const k in ex) V.exT[k] = 0; }, 420); window.SFX && SFX.squish && SFX.squish(0.3); V.pinches++; progressHandle();
  }
  function progressHandle() { if (!S.rec || known(S.rec.c, 'adorn')) return; const n = V.turns + V.pinches; msg(`（${Math.min(8, n)} / 8）你把她翻来覆去地看……`); if (n >= 8) finish('handle'); }
  // ---------- 文本 / 面板 ----------
  function msg(html) { const n = $q('.rc-nt'); n._full = html; n._i = 0; n.innerHTML = html; }
  function panel(html) { const p = $q('.rc-panel'); if (!html) { p.classList.remove('on'); return; } $q('.rc-pb').innerHTML = html; p.classList.add('on'); }
  function showFacet(k) { const f = FK[k]; msg(`<b>${f.ic} ${f.n}</b>：${esc(f.v(S.rec))}`); if (k === 'fight') panel(fightHTML(S.rec)); else if (k === 'chess' && window.HeadGame) panel(chessHTML(S.rec)); else if (k === 'card' && window.HeadGame) panel(cardHTML(S.rec)); else if (k === 'rank' && window.Ranks) panel(`<div class="rc-p-h">阶位 · 传承</div>${Ranks.ladderHTML(S.rec.c)}`); else if (k === 'bio' && window.Overhear) panel(`<div class="rc-p-h">小习惯与秘密</div>${Overhear.bioHTML(S.rec.c)}`); else if (k === 'story') panel(`<div class="rc-p-h">生平</div><p>${esc(S.rec.story || '')}</p>`); else if (k === 'face') panel(`<div class="rc-p-h">外貌</div><p>${esc(S.rec.app || '')}</p>`); else panel(null); }
  function refresh() {
    const c = S.rec.c, n = nKnown(c); $q('.rc-rar').innerHTML = `<span style="color:${RC[c.rar]}">【${RN[c.rar]}】${c.shiny ? ' ✨异色' : ''}</span>`;
    $q('.rc-name').textContent = nm(c); $q('.rc-name').style.color = RC[c.rar];
    $q('.rc-sub').innerHTML = esc(`得自 ${c.locN}` + (c.title ? ` · 『${c.title}』` : '')) + (window.Ranks ? ' · ' + Ranks.badge(c) : '');
    $q('.rc-cnt').textContent = `${n} / ${FAC.length}`; $q('.rc-prog i').style.width = (n / FAC.length * 100) + '%';
    $q('.rc-facets').innerHTML = FAC.map(f => { const k = known(c, f.k); return `<div class="rc-f ${k ? 'k' : 'u'}${S.fresh === f.k ? ' new' : ''}" data-k="${f.k}"><b>${f.ic} ${f.n}</b><span>${k ? esc(f.v(S.rec)) : '？？？'}</span></div>`; }).join('');
    if (S.fresh) { const fk = S.fresh; setTimeout(() => { S.fresh = ''; const e = el && el.querySelector(`.rc-f[data-k="${fk}"]`); e && e.classList.remove('new'); }, 1800); }
    let h = '<div class="rc-sec">徒手</div>', locked = false;
    for (const k of ORDER) {
      const a = ACT[k], lock = a.need && !hasB(a.need);
      if (a.need && !locked) { h += '<div class="rc-sec">需要建筑</div>'; locked = true; }
      const done = known(c, a.fac) && !(a.need && lock);
      h += `<div class="rc-a${lock ? ' lock' : ''}${done ? ' done' : ''}" data-a="${lock ? '' : k}"><div class="ic">${a.ic}</div><div><b>${a.n}</b><small>${a.d}</small>${lock ? `<span class="need">🔒 需要：${esc(bn(a.need))}</span>` : ''}</div></div>`;
    }
    $q('.rc-acts').innerHTML = h;
  }
  // ---------- 动作执行 ----------
  function act(k) {
    if (!k || !S.open) return; const a = ACT[k]; if (V.mode === 'act' || V.mode === 'lock') return;
    if (k === 'handle') { V.mode = ''; panel(null); msg(known(S.rec.c, 'adorn') ? '你把她翻来覆去地把玩——拖动转头，点她的脸颊。' : '拖动转动她的头，点一点她的脸颊……（转满 / 捏满 8 下会发现些什么）'); V.turns = V.pinches = 0; return; }
    if (k === 'seance') { startSeance(); return; }
    panel(null); V.mode = 'act'; V.act = k; V.t0 = 0; V.dur = a.dur; $q('.rc-acts').classList.add('busy');
    const r = narrate(k, S.rec); msg('<span class="rc-dim">……</span>'); V.pending = r;
    if (k === 'battle') $q('.rc-flash').style.opacity = 0.35;
    if (k === 'appraise') V.glowT = 1;
    if (k === 'mirror') V.aliveT = 1;
    window.SFX && SFX.play && SFX.play(k === 'battle' ? 'thud' : 'page', 0.25, 1);
  }
  function finish(k) {
    const a = ACT[k], r = V.pending && V.act === k ? V.pending : narrate(k, S.rec); V.pending = null; V.mode = ''; V.act = ''; V.glowT = 0; V.aliveT = 0; $q('.rc-flash').style.opacity = 0;
    const first = reveal(S.rec, a.fac); if (first) S.fresh = a.fac; if (a.fac2) reveal(S.rec, a.fac2, true);
    msg(r.t + (first ? `<br><span style="color:#ffd27a">— 想起了她的${FK[a.fac].n} —</span>` : ''));
    if (r.panel) panel(r.panel); else panel(null);
    while (S.notes.length) msg($q('.rc-nt')._full + `<br><span style="color:#ffd27a">${esc(S.notes.shift())}</span>`);
    $q('.rc-acts').classList.remove('busy'); refresh();
  }
  function startSeance() {
    if (!window.Seance || Seance.active) return; const rec = S.rec; V.mode = 'lock'; el.style.visibility = 'hidden'; cancelAnimationFrame(raf);
    Seance.open(rec, { onApply() { }, onClose() { el.style.visibility = ''; V.mode = ''; reveal(rec, 'story'); S.fresh = 'story'; msg('你从通灵里回过神来，她的一生在脑子里转了一圈。'); refresh(); raf = requestAnimationFrame(loop); } });
  }
  // ---------- 主循环 ----------
  function pose(dt, t) {
    const k = V.act, u = V.dur ? Math.min(1, V.t0 / V.dur) : 0, ease = Math.sin(u * Math.PI); V.exT = V.mode === 'act' ? {} : V.exT;
    const c = S.rec.c, ex = {}; let cz = 0, yaw = null, pitch = null, roll = null, lift = 0;
    if (V.mode === 'act') {
      if (k === 'stare') { yaw = 0; pitch = 0.02; cz = -0.26 * Math.min(1, u * 3); lift = 0.05 * ease; const te = trEx(c); for (const q in te) ex[q] = te[q] * Math.min(1, u * 2.4); ex.blink = V.blinkNow || 0; }
      else if (k === 'stroke') { yaw = Math.sin(t * 1.6) * 0.15; pitch = 0.12; roll = Math.sin(t * 2) * 0.09; cz = -0.1; ex.relaxed = 0.7 * ease; V.sway.set(Math.sin(t * 3.4) * 0.9 * ease, 0, Math.cos(t * 2.6) * 0.7 * ease); }
      else if (k === 'sniff') { yaw = 0.35; pitch = 0.5 * Math.min(1, u * 4); cz = -0.32 * Math.min(1, u * 3); lift = -0.03; }
      else if (k === 'listen') { yaw = 1.25 * Math.min(1, u * 3); pitch = 0; cz = -0.3 * Math.min(1, u * 3); roll = 0.12; ex.aa = (Math.sin(t * 13) > 0.6 ? 0.25 : 0) * ease; }
      else if (k === 'battle') { yaw = -0.65; pitch = 0.3; cz = -0.08; ex.angry = 0.3 * ease; ex.sad = 0.2 * ease; V.sway.set(Math.sin(t * 9) * 0.3, 0, 0); }
      else if (k === 'tea') { yaw = 0.1 + Math.sin(t * 0.9) * 0.12; pitch = 0.15 + Math.sin(t * 7) * 0.03; cz = -0.15; lift = 0.04 * Math.sin(t * 7); ex.relaxed = 0.5; if (Math.sin(t * 11) > 0.1) { ex[['aa', 'oh', 'ih', 'ou'][Math.floor(t * 9) % 4]] = 0.5; } }
      else if (k === 'mirror') { yaw = Math.sin(t * 1.1) * 0.25; pitch = 0.05; cz = -0.18; ex.happy = 0.5 * ease; ex.blink = 0; }
      else if (k === 'dress') { yaw = Math.sin(t * 1.3) * 0.3; roll = Math.sin(t * 1.7) * 0.1; cz = -0.14; const ph = Math.floor(t * 1.2) % 4; ex[['happy', 'sad', 'angry', 'surprised'][ph]] = 0.7; V.sway.set(Math.sin(t * 4) * 0.7, 0, 0.3); }
      else if (k === 'appraise') { yaw = Math.sin(t * 2) * 0.05; pitch = 0.05; cz = -0.12; V.sway.set(Math.sin(t * 20) * 0.3, 0, 0); }
      else if (k === 'chess') { yaw = -0.25; pitch = 0.1; cz = -0.05; ex.relaxed = 0.3; }
      else if (k === 'card') { yaw = 0.25; pitch = -0.05; cz = -0.05; ex.happy = 0.3; }
      V.exT = ex; if (yaw != null) V.yawT = yaw; if (pitch != null) V.pitchT = pitch; V.rollT = roll || 0; V.dzT = cz; V.liftT = lift;
    } else {
      // 空闲：拖动后慢慢转回来正对你（“对视”）
      const idle = performance.now() / 1000 - V.lastDrag > 1.4 && !V.drag; if (idle) { V.yawT += (0 - V.yawT) * Math.min(1, dt * 0.9); V.pitchT += (0.03 - V.pitchT) * Math.min(1, dt * 0.9); }
      V.rollT = 0; V.dzT = V.dz; V.liftT = 0; V.sway.multiplyScalar(0.92);
    }
  }
  function loop(ts) {
    if (!S.open) return; raf = requestAnimationFrame(loop);
    const t = ts / 1000, dt = Math.min(0.05, t - (V.last || t)); V.last = t;
    if (V.mode === 'act') { V.t0 += dt; if (V.dur && V.t0 >= V.dur) finish(V.act); }
    // 眨眼（偶尔）
    V.blinkIn -= dt; if (V.blinkIn < 0) { V.blinkIn = 3 + Math.random() * 4; V.blinkAt = t; } const bk = t - V.blinkAt; V.blinkNow = bk < 0.18 ? 1 - Math.abs(bk - 0.09) / 0.09 : 0;
    pose(dt, t);
    const s1 = 1 - Math.exp(-dt * 5);
    V.yaw += (V.yawT - V.yaw) * s1; V.pitch += (V.pitchT - V.pitch) * s1; V.roll += (V.rollT - V.roll) * s1; V.cz = (V.cz || 0) + (V.dzT - (V.cz || 0)) * s1; V.lift += (V.liftT - V.lift) * s1;
    V.squash *= Math.exp(-dt * 7); V.glow += (V.glowT - V.glow) * s1; V.alive += (V.aliveT - V.alive) * (1 - Math.exp(-dt * 2.5));
    pivot.rotation.set(V.pitch, V.yaw, V.roll); const sq = 1 + Math.sin(V.squash * 3) * V.squash * 0.07; pivot.scale.set(sq, 1 / sq, sq);
    // 托举的手轻微起伏（呼吸）
    const br = Math.sin(t * 1.3) * 0.004, sw = Math.sin(t * 0.7) * 0.004; rig.position.set(sw, br + V.lift, 0);
    if (handG) { handG.rotation.z = Math.sin(t * 0.6) * 0.012; }
    // 表情
    const exb = V.mode === 'act' ? V.exT : V.exT, sp = 1 - Math.exp(-dt * 9), cur = V.ex;
    for (const k of EXK) { let tg = exb[k] || 0; if (k === 'blink' && V.mode !== 'act' || k === 'blink' && V.act === 'stare') tg = Math.max(tg, V.blinkNow * 0.9); cur[k] = (cur[k] || 0) + (tg - (cur[k] || 0)) * sp; }
    if (!(window.Mods && Mods.on('recall_iw'))) hb.setExpression(cur); hb.setSway(V.sway); /* R33：首级已死，不变表情（MOD recall_iw 开时旧界面也不动表情） */
    // 魂光 / 生前
    const L = S.rec.look || {}; const k = 1 - V.alive; hb.U.dull.value = (L.glowEye ? 0.08 : 0.4) * k; hb.U.blood.value = (L.blood || 0) * k; hb.U.spat.value = (L.spat || 0) * k; hb.U.pale.value = (L.pale || 0) * k;
    lights.fire.intensity = V.glow * (1.6 + Math.sin(t * 17) * 0.4);
    const z = 0.95 + (V.cz || 0) * 1.0; cam.position.set(0, -0.01, z); cam.lookAt(0, -0.045, 0);
    ModelHeads.tick(t); R.render(scene, cam);
  }
  function onKey(e) {
    if (!S.open) return; if (V.mode === 'lock') return;
    if (e.code === 'Escape' || e.code === 'KeyF') { e.stopImmediatePropagation(); e.preventDefault(); close(); return; }
    e.stopImmediatePropagation(); if (e.code.startsWith('Digit')) { const i = +e.code.slice(5) - 1, a = ORDER[i]; if (a && ACT[a] && (!ACT[a].need || hasB(ACT[a].need))) act(a); }
  }
  // ---------- 开关 ----------
  function open(rec, cb) {
    if (S.open || !rec) return; if (!el) build(); S.rec = rec; S.cb = cb || {}; S.open = true; S.notes = []; S.fresh = '';
    const G = GG(); G.setUI && G.setUI(true);
    resize(); el.style.display = 'block'; requestAnimationFrame(() => el.classList.add('on'));
    const look = Object.assign({}, rec.look); hb = ModelHeads.create(look, { alive: true });
    const box = new THREE.Box3().setFromObject(hb.group), ctr = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()), sc = 0.3 / Math.max(0.01, size.y);
    hb.group.position.copy(ctr).multiplyScalar(-1); const inner = new THREE.Group(); inner.add(hb.group); inner.scale.setScalar(sc); pivot.add(inner); S.inner = inner; headR = 0.15;
    const hp = hb.group.position; hp.y += size.y * 0.04;
    handG = makeHand(); rig.add(handG); handG.position.set(0, -0.2, -0.02); handG.rotation.set(0.42, 0, 0); // 手托在颈口下方，指尖向后翘
    Object.assign(V, { yaw: 0.6, pitch: 0.15, roll: 0, yawT: 0, pitchT: 0.03, rollT: 0, dz: 0, dzT: 0, cz: 0.1, ex: {}, exT: {}, mode: '', act: '', sway: new THREE.Vector3(), lastDrag: 0, turns: 0, pinches: 0, squash: 0, glow: 0, glowT: 0, alive: 0, aliveT: 0, lift: 0, liftT: 0 });
    for (const k of EXK) V.ex[k] = 0; V.ex.blink = 1; // 睁眼
    panel(null); refresh();
    msg(nKnown(rec.c) ? '你把她举在面前。想起点什么吧——选一个动作。' : '一颗陌生的头。你不知道她是谁，也不知道她经历过什么。选一个动作，试着想起来。');
    addEventListener('keydown', onKey, true); V.last = 0; raf = requestAnimationFrame(loop);
    window.SFX && SFX.duck && SFX.duck(true);
  }
  function close() {
    if (!S.open) return; S.open = false; removeEventListener('keydown', onKey, true); cancelAnimationFrame(raf); el.classList.remove('on');
    const h = hb, hg = handG, inner = S.inner; hb = null; handG = null;
    setTimeout(() => { if (h) { inner && pivot.remove(inner); h.dispose(); } if (hg) { rig.remove(hg); hg.traverse(o => { if (o.geometry && !o.userData.shared) o.geometry.dispose && 0; }); } if (!S.open) el.style.display = 'none'; }, 400);
    window.SFX && SFX.duck && SFX.duck(false); const G = GG(); G.setUI && G.setUI(false); G.save && G.save(); if (window.UI && UI.refresh) UI.refresh(); G.lockPointer && G.lockPointer();
    S.cb && S.cb.onClose && S.cb.onClose();
  }
  return { _dbg: () => ({ V, S, rig, pivot, cam, hb, handG, R, scene }), narrate, chessHTML, cardHTML, hasB, bn, adorn, FK, open, close, nm, known, reveal, log, hurtBy, card, FAC, ACT, fightHTML, fightBrief, nKnown, tag, on: modOn, get active() { return S.open; }, _S: S, _V: V };
})();
