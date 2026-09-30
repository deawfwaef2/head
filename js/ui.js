// 《魂首窟》界面：主菜单面板(属性/装备/建造/首级/日志)、首级档案与回忆、训练小游戏、出洞远征(点击60次回家)、死亡
window.UI = (() => {
  let root, panel, cur = null, trip = null;
  const RC = ['#b8b8c0', '#4aa8ff', '#c05aff', '#ffb020', '#ff4a8a'];
  const RN = ['凡魂', '灵魂', '英魂', '圣魂', '神魂'];
  const fmt = n => { n = Math.floor(n); return n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'k' : String(n); };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const para = s => esc(s).split(/\n+/).map(p => `<p>${p}</p>`).join('');
  const statName = k => (RPG.STATS.find(s => s[0] === k) || [k, k])[1];
  const statTxt = o => o ? Object.entries(o).map(([k, v]) => `${statName(k)}+${v}`).join(' ') : '';

  function init() {
    document.querySelectorAll('.musicBtn').forEach(b => b.textContent = SFX.musicOn ? '🎵 BGM 开' : '🔇 BGM 关');
    root = document.createElement('div'); root.id = 'uiroot';
    root.innerHTML = '<div class="modal" id="uipanel"></div>';
    document.body.appendChild(root);
    panel = root.querySelector('#uipanel');
    root.addEventListener('mousedown', e => { if (e.target === root && cur && cur !== 'trip' && cur !== 'dead' && cur !== 'intro') close(); });
    panel.addEventListener('click', onClick);
    if (G.S.dead || G.S.hp <= 0) { G.S.hp = 0; }
  }

  // ---------------- 通用 ----------------
  function open(name, html, cls = '') {
    cur = name; G.setUI(true); document.getElementById('menu').classList.add('hidden');
    panel.className = 'modal ' + cls; panel.innerHTML = html; panel.scrollTop = 0;
    root.classList.add('on');
  }
  function close(relock = true) {
    if (!cur) return;
    root.classList.remove('on'); cur = null; G.setUI(false);
    if (relock) G.lockPointer(); else document.getElementById('menu').classList.remove('hidden');
    SFX.close();
  }
  function onKey(e) {
    if (cur === 'trip') { if (trip && trip.choose && (e.code === 'Digit1' || e.code === 'Digit2')) { pickChoice(e.code === 'Digit1' ? 0 : 1); return true; } if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (!e.repeat) tripTap(); } return true; }
    if (cur === 'dead' || cur === 'intro') return true;
    if (cur) {
      if (e.code === 'Escape') { close(false); return true; }
      if (e.code === 'KeyB' || e.code === 'Tab' || e.code === 'KeyI') { e.preventDefault(); close(); return true; }
      if (cur === 'train' && e.code === 'Space') { e.preventDefault(); if (!e.repeat) trainTap(); return true; }
      return true;
    }
    if (!G.playing) return false;
    if (e.code === 'KeyB') { openMenu('build'); return true; }
    if (e.code === 'Tab' || e.code === 'KeyI') { e.preventDefault(); openMenu('stats'); return true; }
    if (e.code === 'KeyK') { openMenu('heads'); return true; }
    if (e.code === 'KeyL') { openMenu('logs'); return true; }
    return false;
  }
  function onClick(e) {
    const a = e.target.closest('[data-a]'); if (!a) return;
    const act = a.dataset.a, v = a.dataset.v;
    SFX.click();
    switch (act) {
      case 'close': close(); break;
      case 'tab': openMenu(v, a.dataset.sub); break;
      case 'sub': menuState.sub = v; openMenu('build', v); break;
      case 'place': { const k = v; const d = BuildCat.C[k]; if (G.S.coins < G.cost(k)) { deny(a); break; } if (d.max && G.bought(k) >= d.max) { deny(a); break; } if (window.RegEcon && RegEcon.can && !RegEcon.can(k)) { deny(a); G.toast && G.toast('材料不足：' + RegEcon.lackText(RegEcon.need(k)), '#f96', 2.6); break; } close(); G.startPlace(k); break; }
      case 'dig': if (G.dig()) openMenu('build', 'dig'); else deny(a); break;
      case 'equip': if (G.buyEquip(v)) openMenu('equip'); else deny(a); break;
      case 'buy': if (G.buyItem(v)) openMenu(menuState.tab); else deny(a); break;
      case 'use': G.useItem(v); openMenu(menuState.tab); break;
      case 'card': { const rec = G.S.heads.find(r => r.id == v); if (rec) openCard(rec, true); break; }
      case 'hf': { const [k, x] = v.split(':'); HV[k] = (k === 'rar') ? +x : x; HV.page = 0; openMenu('heads'); break; }
      case 'hpg': HV.page = Math.max(0, HV.page + (+v)); openMenu('heads'); break;
      case 'storeAll': { const n = G.storeLoose(); G.toast(n ? `📥 ${n} 颗散落首级已存入魂库` : '没有散落在地上的首级', n ? '#e8c070' : '#aaa'); openMenu('heads'); break; }
      case 'store': { const h = G.headOf(+v); if (h && G.storeHead(h)) { G.save(); SFX.sack && SFX.sack(); G.toast('📥 已存入魂库', '#e8c070'); openMenu('heads'); } else deny(a); break; }
      case 'take': { const rec = G.S.heads.find(r => r.id == v); if (rec && G.takeOut(rec)) { G.save(); close(); G.toast('📤 从魂库取出：' + NM(rec.c), '#e8c070'); } else deny(a); break; }
      case 'mem': showMemory(); break;
      case 'recall': { const r = cardRec; close(); if (r && window.Recall) Recall.open(r); break; }
      case 'log': openLog(+v); break;
      case 'back': openMenu(menuState.tab); break;
      case 'loc': startTrip(v); break;
      case 'trainGo': trainStart(); break;
      case 'arrive': finishTrip(); break;
      case 'tripch': pickChoice(+v); break;
      case 'restart': G.wipe(); location.reload(); break;
      case 'reroll': if (G.rerollBounties()) openBounty(); else deny(a); break;
      case 'introNext': introStep(); break;
    }
  }
  function deny(el) { SFX.deny(); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }


  // ---------------- 图鉴 ----------------
  function codexBody() {
    const cx = G.codexInfo(), S = G.S, ex = G.exhibit(true);
    const byId = {}; for (const k in (S.codex || {})) { const [r, i] = k.split('|'); (byId[i] = byId[i] || []).push([r, S.codex[k]]); }
    const cards = Object.entries(Lore.ID).sort((a, b) => a[1].r - b[1].r).map(([k, d]) => {
      const seen = byId[k]; const col = ['#b8b8c0', '#4aa8ff', '#c05aff', '#ffb020', '#ff4a8a'][Math.min(4, d.r)];
      return seen ? `<div class="cx on" style="--c:${col}"><b>${esc(d.n)}</b><small>${seen.map(([r, n]) => (Lore.RACES[r] ? Lore.RACES[r].n : r) + '×' + n).join(' ')}</small></div>`
                  : `<div class="cx" style="--c:${col}"><b>？？？</b><small>${'★'.repeat(d.r + 1)}</small></div>`;
    }).join('');
    const races = Object.entries(Lore.RACES).map(([k, r]) => `<span class="cxr ${cx.races.has(k) ? 'on' : ''}">${cx.races.has(k) ? r.n : '？？'}</span>`).join('');
    const nextM = (Math.floor(cx.nIds / 5) + 1) * 5;
    const ms = [5, 10, 15, 20, 25, 30, 40, 50].map(n => `<span class="cxm ${cx.nIds >= n ? 'on' : ''}">${n}</span>`).join('');
    return `<div class="cx-top"><div><b>📖 身份图鉴</b> ${cx.nIds}/${cx.totalIds} · 种族 ${cx.nRaces}/${cx.totalRaces} · 组合 ${cx.combos} · ✨异色 ${cx.shiny}</div>
      <div>图鉴加成：全体产出 <b>×${cx.mul.toFixed(2)}</b>（每收集 5 种身份 +5%，下一档 ${nextM}）</div><div class="cxms">${ms}</div>
      <div>🏛️ 展厅评级 <b>${ex.grade}</b> · ${G.fmtN(ex.score)} 分${ex.next ? '（下一级 ' + G.fmtN(ex.next) + '）' : ''} · 全体产出 +${ex.tier * 8}% <small>展出首级 ${ex.shown} · 种族 ${ex.races} · 身份 ${ex.ids} · 装饰 ${ex.deco}</small></div>
      <div>📅 今日魂潮：<b>${G.daily.n}</b> —— ${G.daily.d}</div>
      <div class="cxrs">${races}</div></div><div class="cx-grid">${cards}</div>
      <p class="hint2">展厅分 = 挂出（上架）的首级：稀有度 × 异色 ×3 × 已安息 ×1.2 × 展示柜 ×1.6 × 每条魂印 +10%，再加上种族/身份多样性与装饰数量。多样化陈列比堆同一种更划算。</p>`;
  }
  // ---------------- 悬赏榜 ----------------
  function openBounty() {
    const list = G.bounties(), S = G.S, mul = G.daily.k === 'bounty' ? 2 : 1;
    const rows = list.map(b => { const have = S.heads.filter(r => !r.inBag && ok(b, r)).length;
      return `<div class="bty"><div class="bty-n">${esc(b.n)}</div><div class="bty-r">🔮 ${G.fmtN(b.rw * mul)}${mul > 1 ? ' <small>赏金日×2</small>' : ''}</div><div class="bty-h ${have ? 'on' : ''}">${have ? '洞里有 ' + have + ' 颗符合' : '暂无符合的首级'}</div></div>`; }).join('');
    open('bounty', `<h2>📜 悬赏榜</h2><p class="hint2">拿着符合条件的首级，对准悬赏榜按 <b>E</b> 交付（首级会被赏金猎人带走）。声望 <b>${S.fame || 0}</b> · 远征幸运 <b>${RPG.luckOf(S)}</b>（每 3 声望 +1）</p>
      <div class="btys">${rows}</div><div class="row"><button data-a="reroll">🔄 刷新委托（🔮 ${50 + S.depth * 40}）</button><button data-a="close">关闭</button></div>`);
    function ok(b, rec) { const c = rec.c, L = rec.look; switch (b.k) { case 'shiny': return !!c.shiny; case 'race': return c.race === b.v; case 'id': return c.id === b.v; case 'rar': return c.rar >= b.v; case 'aff': return !!(c.aff && c.aff.includes(b.v)); case 'hair': return L.hn === b.v || L.hn2 === b.v; case 'hetero': return L.en2 && L.en2 !== L.en; case 'trait': return (c.traits || []).includes(b.v); } return false; }
  }

  // ---------------- 主菜单 ----------------
  const menuState = { tab: 'stats', sub: 'func' };
  const TABS = [['stats', '👹 属性'], ['equip', window.Sack && Sack.on() ? '⚔️ 装备·物品·工坊' : '🪓 装备·斯尼克'], ['build', '🔨 建造'], ['heads', '💀 首级收藏'], ['codex', '📖 图鉴·展厅'], ['logs', '📜 狩猎日志']];
  function openMenu(tab = menuState.tab, sub) {
    menuState.tab = tab; if (sub) menuState.sub = sub;
    const S = G.S;
    const head = `<div class="m-head"><div class="m-title">魂首窟</div><div class="m-tabs">${TABS.map(([k, n]) => `<button class="m-tab ${k === tab ? 'on' : ''}" data-a="tab" data-v="${k}">${n}</button>`).join('')}</div>
      <div class="m-coins">🔮 ${fmt(S.coins)}</div><button class="m-close" data-a="close">✕ 关闭</button></div>`;
    let body = '';
    if (tab === 'stats') body = statsBody();
    else if (tab === 'equip' && window.Sack && Sack.on()) { body = '<div id="skHost"></div>'; setTimeout(() => Sack.mountCave(document.getElementById('skHost')), 0); } // 第十九轮：储物·附魔·合成
    else if (tab === 'equip') body = equipBody();
    else if (tab === 'build') body = buildBody();
    else if (tab === 'heads') { body = headsBody(); setTimeout(bindHeads, 0); }
    else if (tab === 'logs') body = logsBody();
    else if (tab === 'codex') body = codexBody();
    if (cur !== 'menu') SFX.open();
    open('menu', head + '<div class="m-body">' + body + '</div>', 'big');
  }
  function statsBody() {
    const S = G.S, s = G.st(), e = RPG.eqSum(S), bb = G.buildBonus();
    const rows = RPG.STATS.map(([k, n, ic, d]) => `<div class="st-row"><div class="st-ic">${ic}</div><div class="st-n">${n}<small>${d}</small></div><div class="st-v">${s[k]}</div>
      <div class="st-br">基础 ${S.base[k] || 0} · 装备 +${e[k] || 0} · 建筑 +${bb[k] || 0}</div></div>`).join('');
    const hpF = Math.max(0, S.hp / s.maxHp);
    return `<div class="cols"><div class="col">
      <div class="big-power">⚔️ 战力 <b>${fmt(s.power)}</b></div>
      <div class="hpline"><div class="hpfill" style="width:${hpF * 100}%"></div><span>❤️ ${Math.round(S.hp)} / ${s.maxHp}</span></div>
      <div class="kv"><span>攻击</span><b>${s.atk}</b><span>防御</span><b>${s.def}</b><span>闪避</span><b>${(s.dodge * 100).toFixed(1)}%</b><span>背篓容量</span><b>${s.cap} 颗</b><span>魂晶产出</span><b>×${s.yieldMul.toFixed(2)}</b><span>生命恢复</span><b>${(1 + (bb.regen || 0))}%/10秒</b></div>
      <div class="items">${RPG.CONSUM.map(c => `<div class="item"><span class="ic">${c.icon}</span><b>${c.n}</b> ×${S.items[c.k] || 0}<button data-a="use" data-v="${c.k}" ${S.items[c.k] ? '' : 'disabled'}>使用</button></div>`).join('')}<small>快捷键 H 喝药</small></div>
      <div class="kv small"><span>食人魔等级</span><b>Lv.${s.lv} <small style="opacity:.6">(${RPG.lvOf(S.xp).cur}/${RPG.lvOf(S.xp).need || 'MAX'})</small></b><span>出猎次数</span><b>${S.stats.trips}</b><span>斩首总数</span><b>${S.stats.kills}</b><span>累计魂晶</span><b>${fmt(S.stats.earned)}</b><span>把玩次数</span><b>${fmt(S.stats.pokes)}</b></div>
    </div><div class="col">${rows}<p class="hint2">提升属性：在洞里建造<b>训练器械</b>（建造 → 训练）后对着它按 E 训练；购买<b>装备</b>；每一件<b>建筑/装饰</b>都会永久提升属性。</p></div></div>`;
  }
  function equipBody() {
    const S = G.S;
    const lines = ['「嘿嘿，大块头，又带魂晶来了？」', '「斯尼克的货，童叟无欺——主要是没有童叟敢来。」', '「这把好东西，上一个主人……嗯，现在挂在你洞里吧？」', '「魂晶，魂晶，嘿嘿嘿……」'];
    const slots = RPG.SLOTS.map(sl => {
      const E = RPG.EQUIP[sl], ci = S.eq[sl] || 0, c = E.tiers[ci], n = E.tiers[ci + 1];
      const eff = t => ['atk', 'def', 'hp', 'str', 'con', 'agi', 'ter', 'soul', 'cap'].filter(k => t[k]).map(k => ({ atk: '攻击', def: '防御', hp: '生命', cap: '容量' }[k] || statName(k)) + '+' + t[k]).join(' ');
      return `<div class="eq ${n && S.coins < n.cost ? 'poor' : ''}">
        <div class="eq-slot">${E.icon} ${E.n}</div>
        <div class="eq-cur"><b>${c.n}</b> <small>${eff(c)}</small><div class="desc">${esc(c.desc || '')}</div></div>
        ${n ? `<div class="eq-next" data-a="equip" data-v="${sl}"><div>⬆ <b>${n.n}</b> <small>${eff(n)}</small></div><div class="desc">${esc(n.desc || '')}</div><div class="cost">🔮 ${fmt(n.cost)}</div></div>` : '<div class="eq-next max">已是最强</div>'}
      </div>`;
    }).join('');
    const cons = RPG.CONSUM.map(c => `<div class="bp-item ${S.coins < c.cost ? 'poor' : ''}" data-a="buy" data-v="${c.k}"><div class="bp-icon">${c.icon}</div><div class="bp-name">${c.n}</div><div class="bp-cost">🔮 ${c.cost}</div><div class="bp-desc">${c.desc}<br>持有 ${S.items[c.k] || 0}</div></div>`).join('');
    return `<div class="merchant">🧌 <b>地精行商·斯尼克</b>：${lines[Math.floor(Math.random() * lines.length)]}</div><div class="eqs">${slots}</div><h3>消耗品</h3><div class="bp-grid">${cons}</div>`;
  }
  function buildBody() {
    const S = G.S, C = BuildCat.C, sub = menuState.sub;
    const tabs = BuildCat.CATS.map(([k, n]) => `<button class="bp-tab ${k === sub ? 'on' : ''}" data-a="sub" data-v="${k}">${n}</button>`).join('');
    let grid = '';
    if (sub === 'dig') {
      grid = BuildCat.DIG.slice(1).map(d => {
        const done = S.depth >= d.depth, next = S.depth + 1 === d.depth, rmN = window.RegEcon && RegEcon.digNeed ? RegEcon.digNeed(d.depth) : {}, rmOk = !window.RegEcon || RegEcon.hasAll(rmN);
        return `<div class="bp-item dig ${done ? 'done' : next ? (S.coins < d.cost || !rmOk ? 'poor' : '') : 'locked'}" ${next ? 'data-a="dig"' : ''}><div class="bp-icon">${done ? '✅' : next ? '⛏️' : '🔒'}</div><div class="bp-name">${d.n}</div><div class="bp-cost">${done ? '已完成' : '🔮 ' + fmt(d.cost)}</div>${done || !window.RegEcon ? '' : RegEcon.needHTML(rmN)}<div class="bp-desc">洞窟半径 ${d.r}m。${done ? '' : '岩壁后面也许藏着新的东西……'}</div></div>`;
      }).join('');
    } else {
      const vis = Object.keys(C).filter(k => C[k].cat === sub && (!window.Unlocks || Unlocks.has(k)));
      grid = vis.map(k => {
        const d = C[k], lock = d.depth && d.depth > S.depth, c = G.cost(k), own = G.bought(k), maxed = d.max && own >= d.max, rmN = window.RegEcon && RegEcon.need ? RegEcon.need(k) : {}, rmOk = !window.RegEcon || RegEcon.hasAll(rmN);
        return `<div class="bp-item ${lock ? 'locked' : maxed ? 'done' : S.coins < c || !rmOk ? 'poor' : ''}" ${lock || maxed ? '' : `data-a="place" data-v="${k}"`}>
          ${own ? `<div class="bp-own">已建 ${own}</div>` : ''}<div class="bp-icon">${lock ? '🔒' : d.icon}</div><div class="bp-name">${d.n}</div>
          <div class="bp-cost">${lock ? `需洞窟第 ${d.depth} 层` : maxed ? '已建成' : '🔮 ' + fmt(c)}</div>${lock || maxed || !window.RegEcon ? '' : RegEcon.needHTML(rmN)}
          <div class="bp-stat">${statTxt(d.stat)}${d.regen ? ' 恢复+' + d.regen + '%' : ''}</div><div class="bp-desc" title="${esc((d.desc || '').replace(/<[^>]+>/g, ''))}">${esc(d.desc || '')}</div></div>`;
      }).join('');
      const hid = Object.keys(C).filter(k => C[k].cat === sub).length - vis.length;
      if (hid > 0) grid += `<div class="bp-item locked"><div class="bp-icon">❔</div><div class="bp-name">??? × ${hid}</div><div class="bp-desc">还有未发现的建造灵感，条件未知。</div></div>`;
    }
    return `<div class="bp-tabs">${tabs}</div><p class="hint2">每件建筑都会<b>永久提升主角属性</b>（战力）。放置时：左键确认 · R/Shift+R 任意角度旋转 · 右键取消。新建筑会在达成<b>隐藏条件</b>后出现。对建筑连按 XX 拆除（返还 50%）。</p><div class="bp-grid">${grid}</div>`;
  }
  // 首级收藏 + 魂库（第九轮）：9999 颗也不卡 —— 筛选 / 排序 / 搜索 / 分页，每页只渲染 60 张卡
  const HV = { where: 'all', rar: -1, sort: 'rar', q: '', page: 0 }, PAGE = 60;
  function headsBody() {
    const all = G.S.heads;
    if (!all.length) return '<p class="empty">洞里还没有首级。走到洞口（发光的出口）按 E，出去狩猎吧。</p>';
    let nCave = 0, nVault = 0, nBag = 0; for (const r of all) { if (r.inBag) nBag++; else if (r.vault) nVault++; else nCave++; }
    const q = HV.q.trim();
    let list = all.filter(r => (HV.where === 'all' || (HV.where === 'vault' ? r.vault : HV.where === 'bag' ? r.inBag : (!r.vault && !r.inBag))) && (HV.rar < 0 || r.c.rar === HV.rar) && (!q || (NM(r.c) + r.c.raceN + r.c.idN + r.c.locN).includes(q)));
    const Y = r => (G.yieldOf ? G.yieldOf(r) : 0);
    list.sort(HV.sort === 'new' ? (a, b) => b.id - a.id : HV.sort === 'yield' ? (a, b) => Y(b) - Y(a) : (a, b) => b.c.rar - a.c.rar || (b.c.shiny ? 1 : 0) - (a.c.shiny ? 1 : 0) || b.id - a.id);
    const pages = Math.max(1, Math.ceil(list.length / PAGE)); HV.page = Math.min(HV.page, pages - 1);
    const shown = list.slice(HV.page * PAGE, HV.page * PAGE + PAGE);
    const chip = (k, v, n) => `<button class="hv-chip ${String(HV[k]) === String(v) ? 'on' : ''}" data-a="hf" data-v="${k}:${v}">${n}</button>`;
    const where = r => r.vault ? '<span class="hd-w v">魂库</span>' : r.inBag ? '<span class="hd-w b">麻袋</span>' : '<span class="hd-w c">洞内</span>';
    const bar = `<div class="hv-bar">${chip('where', 'all', '全部 ' + all.length)}${chip('where', 'cave', '洞内 ' + nCave + '/' + G.MAX_HEADS)}${chip('where', 'vault', '🗝️ 魂库 ' + nVault)}${nBag ? chip('where', 'bag', '麻袋 ' + nBag) : ''}
      <span class="hv-sep"></span>${chip('rar', -1, '全品阶')}${RN.map((n, i) => chip('rar', i, n)).join('')}
      <span class="hv-sep"></span>${chip('sort', 'rar', '按品阶')}${chip('sort', 'new', '最新')}${chip('sort', 'yield', '产魂')}
      <input id="hvQ" class="hv-q" placeholder="🔍 名字 / 种族 / 地点" value="${esc(HV.q)}"></div>
      <div class="hv-bar"><button class="hv-chip" data-a="storeAll">📥 一键收纳：散落在地上的首级全部存入魂库</button><span class="hint2">共 ${list.length} 颗 · 魂库上限 ${G.VAULT_MAX} · 入库的首级不占洞内名额、不耗性能，随时可取出。</span></div>`;
    const pager = pages > 1 ? `<div class="hv-pg"><button class="hv-chip" data-a="hpg" data-v="-1" ${HV.page ? '' : 'disabled'}>◀</button><b>${HV.page + 1} / ${pages}</b><button class="hv-chip" data-a="hpg" data-v="1" ${HV.page < pages - 1 ? '' : 'disabled'}>▶</button></div>` : '';
    return bar + pager + `<div class="hd-grid">` + shown.map(r => `<div class="hd" data-a="card" data-v="${r.id}" style="--c:${RC[r.c.rar]}"><div class="hd-r">${RN[r.c.rar]}${r.c.shiny ? ' ✨' : ''} ${where(r)}</div><div class="hd-n">${esc(NM(r.c))}</div>${window.Ranks ? `<div class="hd-i" style="color:${Ranks.of(r.c).col}">${esc(Ranks.short(r.c))}</div>` : ''}<div class="hd-i">${window.Recall && !Recall.known(r.c, 'race') ? '？？？' : esc(r.c.raceN) + ' · ' + esc(r.c.idN)}</div><div class="hd-l">${esc(r.c.locN)}</div></div>`).join('') + '</div>' + pager;
  }
  function bindHeads() { const el = document.getElementById('hvQ'); if (!el) return; el.onchange = () => { HV.q = el.value; HV.page = 0; openMenu('heads'); }; el.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') el.onchange(); }; el.onkeyup = e => e.stopPropagation(); }
  function logsBody() {
    const L = G.S.logs;
    if (!L.length) return '<p class="empty">还没有狩猎记录。</p>';
    return '<div class="logs">' + L.map((l, i) => ({ l, i })).reverse().map(({ l, i }) => `<div class="log ${l.dead ? 'dead' : ''}" data-a="log" data-v="${i}"><div class="log-t">${l.icon || ''} ${esc(l.locN)} <small>${new Date(l.date).toLocaleString()}</small></div><div class="log-s">${l.dead ? '☠️ 死于途中' : `带回 ${l.heads.length} 颗首级 · 🔮 +${fmt(l.coins)} · ❤️ -${l.hpLost}`}</div><div class="log-h">${l.heads.map(h => `<span style="color:${RC[h.r]}">${esc(h.n)}</span>`).join(' · ')}</div></div>`).join('') + '</div>';
  }
  function openLog(i) {
    const l = G.S.logs[i]; if (!l) return;
    SFX.book();
    open('log', `<div class="story"><h2>${l.icon || ''} ${esc(l.locN)} 狩猎记</h2><div class="sub">${new Date(l.date).toLocaleString()}</div>
      ${l.beats.map(b => `<p class="${b.cls || ''}">${esc(b.t)}${b.d ? ` <span class="dmg">${esc(b.d)}</span>` : ''}</p>`).join('')}
      <div class="btns"><button data-a="back">← 返回日志</button><button data-a="close">关闭</button></div></div>`, 'story-m');
  }

  // ---------------- 首级档案 ----------------
  let cardRec = null;
  function modelNote(rec) {
    const a = ModelHeads.meta(rec.look && rec.look.f), b = ModelHeads.meta(rec.look && rec.look.h);
    const items = [...new Set([a,b].filter(Boolean).map(m => `${esc(m.name)}（${esc(m.credit || '许可见 CREDITS.md')}）`))];
    return `<div class="model-license"><b>模型来源 / 公开状态</b><br>${items.join(' + ') || '程序化生成'}<br><small>本颗首级使用的模型当前允许随本仓库公开分发（须遵守上方原许可/署名）。标为“未公开/受限”的候选模型不会进入随机池。详见根目录 CREDITS.md。</small></div>`;
  }
  function openCard(rec, fromMenu) {
    cardRec = rec; const c = rec.c; const K = window.Recall && Recall.on() ? Recall.card(rec) : null, Q = '<span style="opacity:.5">？？？</span>';
    open('card', `<div class="card" style="--c:${RC[c.rar]}">
      <div class="card-r">【${RN[c.rar]}】${c.shiny ? ' <span class="shiny">✨异色</span>' : ''}${rec.calm ? ' <span class="calm">🕊️已安息</span>' : ''}${rec.seance ? ' <span class="calm">🔮已通灵</span>' : ''}</div>${c.title ? `<div class="card-t">『${esc(c.title)}』</div>` : ''}<h2>${esc(NM(c))}</h2>
      ${window.Ranks ? `<div class="card-rk">${Ranks.badge(c)}</div>` : ''}
      <div class="card-id">${K ? esc(K.idLine) : `${esc(c.raceN)} · ${esc(c.idN)} · ${c.age} 岁 · 得自 ${esc(c.locN)}`}</div>
      <div class="kv"><span>性格</span><b>${K ? K.trait : esc((c.traits || []).join('、'))}</b><span>信仰</span><b>${K ? K.belief : esc(c.belief)}</b><span>生前目的</span><b>${K ? K.goal : esc(c.goal)}</b><span>魂晶产出</span><b>${K && !K.yield ? Q : '×' + +G.yieldOf(rec).toFixed(1)}</b></div>
      ${K && !K.aff ? '<div class="affs none">🔰 魂印：想不起来（回忆「魂印与产出」——鉴定 / 通灵）</div>' : (c.aff || []).length ? `<div class="affh">🔰 魂印 <b>${c.aff.length}</b><small>${[...new Set(c.aff.map(k => RPG.AFF[k] && RPG.AFF_CAT[RPG.AFF[k].cat].n))].filter(Boolean).join(' · ')}</small></div><div class="affs">${c.aff.map(k => RPG.affHTML(k, 'card')).join('')}</div>` : '<div class="affs none">无魂印 · 读到写着她名字的书或笔记，带到洞里对证，可以为她添上魂印</div>'}
      ${window.HeadWear && HeadWear.names(rec.look.hw).length ? `<div class="hwl">🎀 ${HeadWear.names(rec.look.hw).join(' · ')}</div>` : ''}
      ${window.Ranks ? Ranks.ladderHTML(c) : ''}${K && K.bio && window.Overhear ? `<h3>小习惯与秘密</h3>${Overhear.bioHTML(c)}` : ''}
      <h3>外貌</h3>${K && !K.app ? para('（你还没有好好看过她的脸。按 F 进入回忆。）') : para(rec.app)}${modelNote(rec)}
      <h3>生平</h3>${K && !K.story ? para('（她的一生你还想不起来——回忆 / 通灵可以拼出来。）') : para(rec.story)}
      <div id="memBox"></div>
      <div class="btns">${K ? '<button class="red" data-a="recall">🧠 回忆她（' + K.n + '/' + K.total + '）</button>' : ''}<button class="red" data-a="mem">🩸 回忆：我是怎么得到这颗头的</button>${rec.vault ? `<button data-a="take" data-v="${rec.id}">📤 取出到洞里</button>` : (!rec.inBag && G.headOf(rec.id) && G.held !== G.headOf(rec.id)) ? `<button data-a="store" data-v="${rec.id}">📥 存入魂库</button>` : ''}${fromMenu ? '<button data-a="back">← 返回</button>' : ''}<button data-a="close">关闭</button></div></div>`, 'card-m');
  }
  function showMemory() {
    const box = document.getElementById('memBox'); if (!box || !cardRec) return;
    SFX.page();
    const text = cardRec.mem || '……记忆模糊了。';
    box.innerHTML = '<h3>回忆</h3><div class="mem"></div>';
    const el = box.querySelector('.mem'); let i = 0;
    const tick = () => { if (!el.isConnected) return; i += 3; el.innerHTML = para(text.slice(0, i)); if (i < text.length) setTimeout(tick, 16); };
    tick();
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------------- 训练 ----------------
  let tr = null;
  function openTraining(k, name) {
    const c = RPG.trainCost(G.S, k), lv = G.S.trained[k] || 0;
    tr = { k, name, clicks: 0, t: 0, on: false };
    open('train', `<div class="train"><h2>${esc(name)} · 训练 ${statName(k)}</h2><p>花费 <b>🔮 ${fmt(c)}</b>（已训练 ${lv} 次）。开始后 <b>8 秒内疯狂点击</b>（或按空格）——越快，${statName(k)}涨得越多（每 9 下 +1）。</p>
      <div class="train-pad" id="trainPad"><div id="trainTxt">${G.S.coins >= c ? '准备好了就点「开始」' : '魂晶不足'}</div><div class="train-bar"><i id="trainBar"></i></div></div>
      <div class="btns"><button class="red" data-a="trainGo" ${G.S.coins >= c ? '' : 'disabled'}>开始训练</button><button data-a="close">离开</button></div></div>`, 'train-m');
    document.getElementById('trainPad').addEventListener('mousedown', e => { e.preventDefault(); trainTap(e); });
  }
  function trainStart() {
    if (!tr || tr.on) return;
    if (G.S.coins < RPG.trainCost(G.S, tr.k)) { SFX.deny(); return; }
    tr.on = true; tr.clicks = 0; const t0 = performance.now();
    const txt = document.getElementById('trainTxt'), bar = document.getElementById('trainBar');
    panel.querySelector('[data-a="trainGo"]').disabled = true;
    const loop = () => {
      if (!tr || !tr.on || cur !== 'train') return;
      const el = (performance.now() - t0) / 1000; bar.style.width = Math.min(100, el / 8 * 100) + '%';
      txt.innerHTML = `<b style="font-size:54px">${tr.clicks}</b><br>剩余 ${Math.max(0, 8 - el).toFixed(1)} 秒`;
      if (el >= 8) { tr.on = false; const g = G.train(tr.k, tr.clicks); txt.innerHTML = `<b style="font-size:40px">${tr.clicks} 下！</b><br>${statName(tr.k)} <b style="color:#6f6">+${g}</b>`; panel.querySelector('[data-a="trainGo"]').disabled = G.S.coins < RPG.trainCost(G.S, tr.k); panel.querySelector('[data-a="trainGo"]').textContent = '再练一次（🔮 ' + fmt(RPG.trainCost(G.S, tr.k)) + '）'; return; }
      requestAnimationFrame(loop);
    };
    loop();
  }
  function trainTap(e) {
    if (!tr || !tr.on) return;
    tr.clicks++; SFX.punch();
    const pad = document.getElementById('trainPad'); pad.classList.remove('hit'); void pad.offsetWidth; pad.classList.add('hit');
  }

  // ---------------- 远征 ----------------
  function danger(q) {
    if (q < 0.45) return ['必死无疑', '#ff2020'];
    if (q < 0.7) return ['九死一生', '#ff5a3a'];
    if (q < 0.95) return ['危险', '#ffa030'];
    if (q < 1.4) return ['势均力敌', '#ffe060'];
    if (q < 2.2) return ['轻松', '#8fe080'];
    return ['屠宰场', '#60d0ff'];
  }
  function bossLine(l) {
    const B = window.Explore && Explore.BOSSES[l.k]; if (!B) return '';
    const done = G.S.bosses && G.S.bosses[l.k];
    return `<div class="loc-boss" style="margin-top:4px;font-size:12.5px;color:${done ? '#ffd060' : '#c8b8d8'}">${done ? `👑 已征服：${esc(B.title)}·${esc(B.n)}` : `👑 霸主：${(G.S.visits && G.S.visits[l.k]) ? esc(B.title) : '？？？'}（随机现身）`}</div>`;
  }
  function openExpedition() {
    if (window.Worlds && window.Mods && Mods.on('worldgraph') && Mods.on('bigworld')) { // 可选 MOD：一整片大陆，无选关
      const S = G.S, s0 = G.st(); if (S.hp < s0.maxHp * 0.35) G.toast(`⚠️ 你只剩 ${Math.round(S.hp)}/${s0.maxHp} 血，死在外面一切归零`, '#ff8060', 3.5);
      startTrip('village'); return;
    }
    const S = G.S, s = G.st();
    const hpF = S.hp / s.maxHp;
    const cards = Lore.LOCS.map(l => {
      const q = s.power / l.rec, [dn, dc] = danger(q);
      const races = Object.keys(l.races).map(k => (Lore.RACES[k] || { n: k }).n).join(' / ');
      return `<div class="loc" data-a="loc" data-v="${l.k}" style="--lc:${l.color}"><div class="loc-ic">${l.icon}</div><div class="loc-n">${l.n}</div>
        <div class="loc-d" style="color:${dc}">${dn}</div><div class="loc-rec">推荐战力 ${l.rec}</div><div class="loc-desc">${esc(l.desc)}</div><div class="loc-r">猎物：${esc(races)}</div><div class="loc-loot">魂晶 ${l.loot[0]}~${l.loot[1]}</div>${bossLine(l)}</div>`;
    }).join('');
    SFX.open();
    const rqPick = window.RegionQuest && RegionQuest.pickOn() ? RegionQuest.pickHTML({ power: s.power, danger }) : null; // 第二十六轮(m)：卡片+预览图选地点（MOD region_pick）
    open('exp', `<div class="m-head"><div class="m-title">🌄 出洞狩猎</div><div class="m-coins">⚔️ 战力 ${fmt(s.power)} · ❤️ ${Math.round(S.hp)}/${s.maxHp} · 🧺 ${s.cap} 颗</div><button class="m-close" data-a="close">✕ 留在洞里</button></div>
      ${hpF < 0.5 ? `<div class="warn">⚠️ 你的生命只剩 ${Math.round(hpF * 100)}%。死在外面就一切归零——先喝药或在洞里休息吧。 ${RPG.CONSUM.map(c => `<button data-a="use" data-v="${c.k}" ${S.items[c.k] ? '' : 'disabled'}>${c.icon}${c.n}×${S.items[c.k] || 0}</button>`).join('')}</div>` : ''}
      ${window.Elites && Elites.on() && (!window.Mods || Mods.on('victory2')) ? (v => `<p class="hint2" style="color:#ffd060">👑 征服目标（Z/U 窗口的「精英挑战」页签查看）：霸主 ${v.b}/7 · 精英 ${v.el}/13 · 猎手 ${v.h}/4 · 月之魔女 ${v.m ? '✔' : '✘'}${G.S.won ? ' · 你已是魂首窟之主' : ''}</p>`)(Elites.victoryState()) : window.Explore ? `<p class="hint2" style="color:#ffd060">👑 征服目标：击败每个地区的霸主，带回她们的首级（${Object.keys(G.S.bosses || {}).length}/${Lore.LOCS.filter(l => Explore.BOSSES[l.k]).length}）${G.S.won ? ' · 你已是魂首窟之主' : ''}</p>` : ''}
      <p class="hint2">选择狩猎地点。${window.Explore && (!window.Mods || Mods.on('explore3d')) ? '你会沿着道路一路走过去：路上的每个人都可以<b>交谈、放过或砍下首级</b>，按住鼠标/空格赶路。' : '结束后要<b>点击屏幕 60 次</b>才能背着首级走回洞里。'}战力越高、背篓越大，带回的首级越多；地点太难可能空手而归，甚至死在路上（<b>死亡 = 重新开始</b>）。</p>
      <div class="locs">${cards}</div>`.replace(/<p class="hint2">选择狩猎地点[\s\S]*$/, m => rqPick || m), 'big');
    if (rqPick) RegionQuest.bindPick();
    menuState.tab = 'exp';
  }
  const TAPS = 60;
  function startTrip(k) {
    const loc = Lore.LOCS.find(l => l.k === k); if (!loc) return;
    const s = G.st();
    const worldOn = window.Worlds && (!window.Mods || Mods.on('worldgraph'));
    const res = worldOn ? { beats: [{ t: '' }, { t: '' }], heads: [] } : RPG.expedition(G.S, s, loc, (Math.random() * 4294967296) >>> 0, G.usedNames, G.usedSig);
    const n = res.beats.length;
    // 第一段立刻出现，其余均匀分布在 60 次点击上，最后一段在第 60 下
    const at = res.beats.map((b, i) => i === 0 ? 0 : Math.round(i / (n - 1) * TAPS));
    trip = { loc, res, at, taps: 0, shown: 0, hp0: G.S.hp, coins: 0, log: [], dead: false, done: false, choose: null,
      ev: [Math.round(TAPS * (0.3 + Math.random() * 0.1)), Math.round(TAPS * (0.62 + Math.random() * 0.1))], evPool: EVENTS.slice().sort(() => Math.random() - 0.5) };
    if (window.Worlds && (!window.Mods || Mods.on('worldgraph'))) { // 第十四轮：地点图出猎（默认）
      root.classList.remove('on'); cur = null;
      Worlds.start(trip, { finish: finishTrip, die, fallback: () => textTrip() });
      return;
    }
    if (window.Explore && window.ExWorld && (!window.Mods || Mods.on('explore3d'))) {
      root.classList.remove('on'); cur = null; if (document.pointerLockElement) document.exitPointerLock();
      Explore.start(trip, { choose: applyChoice, finish: finishTrip, die, fallback: () => textTrip() });
      return;
    }
    textTrip();
  }
  function textTrip() {
    const loc = trip.loc;
    G.setUI && G.setUI(true);
    SFX.music('expedition'); SFX.roar(0.7);
    open('trip', `<div class="trip" style="--lc:${loc.color}">
      <div class="trip-top"><div class="trip-loc">${loc.icon} ${loc.n}</div><div class="trip-hp"><div class="hpline"><div class="hpfill" id="tripHp"></div><span id="tripHpT"></span></div></div></div>
      <div class="trip-feed" id="tripFeed"></div>
      <div class="trip-bottom"><div class="trip-prog"><i id="tripBar"></i></div><div class="trip-cta" id="tripCta">👣 点击屏幕赶路回洞！ <b id="tripN">0</b>/${TAPS}</div></div>
    </div>`, 'trip-m');
    const t = panel.querySelector('.trip');
    t.addEventListener('mousedown', e => { if (e.target.closest('button')) return; e.preventDefault(); tripTap(e); });
    t.addEventListener('touchstart', e => { if (e.target.closest('button')) return; e.preventDefault(); tripTap(e.touches[0]); }, { passive: false });
    revealUpTo(0); tripHud();
  }
  function tripHud() {
    const m = G.st().maxHp; const f = Math.max(0, G.S.hp / m);
    const hp = document.getElementById('tripHp'); if (!hp) return;
    hp.style.width = f * 100 + '%'; document.getElementById('tripHpT').textContent = `❤️ ${Math.round(G.S.hp)} / ${m}`;
    document.getElementById('tripBar').style.width = trip.taps / TAPS * 100 + '%'; const tn = document.getElementById('tripN'); if (tn) tn.textContent = trip.taps;
  }
  function tripTap(e) {
    if (!trip || trip.dead || trip.done || trip.choose) return;
    trip.taps = Math.min(TAPS, trip.taps + 1);
    SFX.step(); if (trip.taps % 6 === 0) SFX.play('step', 0.5, 0.7);
    if (e && e.clientX != null) { const f = document.createElement('div'); f.className = 'tapfx'; f.textContent = ['👣', '💢', '🩸', '⚔️'][trip.taps % 4]; f.style.left = e.clientX + 'px'; f.style.top = e.clientY + 'px'; root.appendChild(f); setTimeout(() => f.remove(), 700); }
    const t = panel.querySelector('.trip'); t.classList.remove('bob'); void t.offsetWidth; t.classList.add('bob');
    revealUpTo(trip.taps); tripHud();
    if (!trip.dead && trip.ev.length && trip.taps >= trip.ev[0]) { trip.ev.shift(); showChoice(); return; }
    if (trip.taps >= TAPS && !trip.dead) arrive();
  }
  function revealUpTo(taps) {
    const feed = document.getElementById('tripFeed');
    while (trip.shown < trip.res.beats.length && trip.at[trip.shown] <= taps && !trip.dead) {
      const b = trip.res.beats[trip.shown++];
      const p = document.createElement('div'); p.className = 'beat';
      let extra = '', rec = { t: b.t };
      if (b.hp && b.hp < 0) {
        const d = -b.hp; G.damage(d); extra += ` <span class="dmg">-${d} HP</span>`; rec.d = `-${d} HP`;
        const t = panel.querySelector('.trip'); t.classList.remove('hurt'); void t.offsetWidth; t.classList.add('hurt');
      } else if (b.hp > 0) { const m = G.st().maxHp; G.S.hp = Math.min(m, G.S.hp + b.hp); extra += ` <span class="heal">+${b.hp} HP</span>`; rec.d = `+${b.hp} HP`; }
      if (b.coin) { G.addCoins(b.coin); trip.coins += b.coin; extra += ` <span class="coin">🔮+${b.coin}</span>`; rec.d = (rec.d ? rec.d + ' ' : '') + `魂晶+${b.coin}`; SFX.coins(); }
      if (b.head) {
        const c = b.head.c; p.classList.add('gethead'); p.style.setProperty('--c', RC[c.rar]);
        extra += `<div class="gh">💀 获得首级【${RN[c.rar]}】${esc(NM(c))}</div>`; rec.cls = 'gethead';
        SFX.chop(); SFX.squish(1); if (c.rar >= 2) SFX.fanfare(c.rar);
      }
      p.innerHTML = esc(b.t) + extra; feed.appendChild(p); trip.log.push(rec);
      requestAnimationFrame(() => p.classList.add('in'));
      feed.scrollTop = feed.scrollHeight;
      if (G.S.hp <= 0) { die(); return; }
    }
  }

  // ---- 旅途抉择事件（每趟 2 次，按 1/2 或点按钮）----
  const loot = (k) => Math.round((trip.loc.loot[0] + Math.random() * (trip.loc.loot[1] - trip.loc.loot[0])) * k);
  const EVENTS = [
    { t: '🛤️ 前方出现岔路。一条是陡峭的险道，一条是绕远的小路。', o: [
      ['⛰️ 走险道', () => Math.random() < 0.6 ? { coin: loot(1), msg: '险道尽头有一处被遗忘的藏宝洞！' } : { hurt: 0.12, msg: '你一脚踩空滚下山坡。' }],
      ['🌿 绕小路', () => ({ heal: 0.05, msg: '小路安静又平坦，你顺便喘了口气。' })]] },
    { t: '🔥 天黑了，你找到一处避风的岩洞。', o: [
      ['😴 休息一晚', () => ({ heal: 0.22, msg: '你枕着战利品麻袋，打着震天响的呼噜睡了一整夜。' })],
      ['🌙 连夜赶路', () => ({ coin: loot(0.5), msg: '夜色中你撞见一队落单的巡逻兵，他们丢下钱袋就跑了。' })]] },
    { t: '✨ 远处的林间飘着一缕奇异的魂光……', o: [
      ['👣 追踪魂光', () => Math.random() < 0.55 ? { head: true, msg: '魂光把你引向了又一个猎物！' } : { hurt: 0.1, msg: '那是沼气鬼火。你被它烧焦了眉毛。' }],
      ['🙈 不去管它', () => ({ msg: '你挠挠头，继续赶路。' })]] },
    { t: '📦 路边的灌木丛里藏着一只上锁的铁箱。', o: [
      ['🔨 砸开它', () => Math.random() < 0.7 ? { coin: loot(0.8), msg: '箱子里全是闪亮的魂晶！' } : { hurt: 0.14, msg: '是个陷阱箱！毒针扎了你一下。' }],
      ['🚶 不碰为妙', () => ({ msg: '谨慎是食人魔少有的美德。' })]] },
    { t: '🧌 你遇到一支地精商队，领头的地精吓得发抖。', o: [
      ['🧪 买瓶药（🔮60）', () => G.S.coins >= 60 ? (G.S.coins -= 60, G.S.items.potion = (G.S.items.potion || 0) + 1, { msg: '地精找零时手抖得把钱撒了一地。获得 🧪×1' }) : { msg: '你的魂晶不够。地精松了口气。' }],
      ['🗣️ 打听消息', () => ({ coin: loot(0.25), msg: '地精告诉你附近有一处无人看守的宝库。' })]] },
    { t: '🩸 血月下，一座古老的献祭祭坛正渴望着首级。', o: [
      ['💀 献上一颗首级', () => trip.res.heads.length ? (() => { let wi = 0; trip.res.heads.forEach((h, i) => { if (h.c.rar < trip.res.heads[wi].c.rar) wi = i; }); const h = trip.res.heads.splice(wi, 1)[0]; return { coin: loot(2.2 + h.c.rar * 1.2), msg: `你把【${RN[h.c.rar]}】${NM(h.c)}的首级摆上祭坛。血月一亮，祭坛吐出大把魂晶。` }; })() : { msg: '你的麻袋里还没有首级。祭坛冷冷地沉寂下去。' }],
      ['🚶 转身离开', () => ({ msg: '首级是你的战利品，不是贡品。' })]] },
    { t: '⚔️ 你路过一片刚结束厮杀的战场，遍地断矛与破盾。', o: [
      ['🔍 翻找战利品', () => Math.random() < 0.65 ? { coin: loot(0.9), msg: '你从一面破盾后面摸出一只沉甸甸的钱袋。' } : { hurt: 0.16, msg: '一个装死的佣兵突然跳起来砍了你一刀，然后逃了。' }],
      ['🏃 快步通过', () => ({ heal: 0.03, msg: '你没有多看一眼，脚步反而更轻快了。' })]] }
  ];
  function showChoice() {
    const ev = trip.evPool.pop(); if (!ev) return;
    trip.choose = ev;
    const feed = document.getElementById('tripFeed');
    const p = document.createElement('div'); p.className = 'beat choice';
    p.innerHTML = esc(ev.t) + '<div class="chs">' + ev.o.map((o, i) => `<button class="red" data-a="tripch" data-v="${i}"><b>${i + 1}</b> ${esc(o[0])}</button>`).join('') + '</div>';
    feed.appendChild(p); requestAnimationFrame(() => p.classList.add('in')); feed.scrollTop = feed.scrollHeight;
    const cta = document.getElementById('tripCta'); if (cta) cta.dataset.old = cta.innerHTML, cta.innerHTML = '⚖️ 做出选择（1 / 2）';
    SFX.open && SFX.open();
  }
  // 3D 探索用：只结算不碰 DOM，返回 {msg, coin, heal, hurt, head, headMsg}
  function applyChoice(ev, i) {
    const s = G.st(), r = ev.o[i][1](), out = { msg: r.msg };
    let rec = { t: ev.t + ' → ' + ev.o[i][0] + '：' + r.msg };
    if (r.coin) { G.addCoins(r.coin); trip.coins += r.coin; out.coin = r.coin; rec.d = `魂晶+${r.coin}`; }
    if (r.heal) { const n = Math.round(s.maxHp * r.heal); G.S.hp = Math.min(s.maxHp, G.S.hp + n); out.heal = n; rec.d = `+${n} HP`; }
    if (r.hurt) { const n = Math.max(1, Math.round(s.maxHp * r.hurt * (1 - s.dodge))); G.damage(n); out.hurt = n; rec.d = `-${n} HP`; }
    trip.log.push(rec);
    if (r.head) {
      const res2 = RPG.expedition(G.S, s, trip.loc, (Math.random() * 4294967296) >>> 0, G.usedNames, G.usedSig);
      const hb = res2.beats.find(b => b.head);
      if (hb && trip.res.heads.length < s.cap) { const c = hb.head.c; trip.res.heads.push(hb.head); out.head = hb.head; out.headMsg = hb.t + ` 💀 获得首级【${RN[c.rar]}】${NM(c)}`; trip.log.push({ t: hb.t, cls: 'gethead' }); SFX.chop(); if (c.rar >= 2) SFX.fanfare(c.rar); }
      else out.headMsg = trip.res.heads.length >= s.cap ? '可你的麻袋已经装满了，只能目送猎物远去。' : '猎物消失在了夜色里。';
    }
    return out;
  }
  function pickChoice(i) {
    const ev = trip && trip.choose; if (!ev || !ev.o[i]) return; trip.choose = null;
    const s = G.st(), r = ev.o[i][1]();
    const feed = document.getElementById('tripFeed');
    const box = feed.querySelector('.choice:last-child .chs'); if (box) box.innerHTML = `<i class="chosen">→ ${esc(ev.o[i][0])}</i>`;
    const p = document.createElement('div'); p.className = 'beat'; let extra = '', rec = { t: ev.t + ' → ' + ev.o[i][0] + '：' + r.msg };
    if (r.coin) { G.addCoins(r.coin); trip.coins += r.coin; extra += ` <span class="coin">🔮+${r.coin}</span>`; rec.d = `魂晶+${r.coin}`; SFX.coins(); }
    if (r.heal) { const n = Math.round(s.maxHp * r.heal); G.S.hp = Math.min(s.maxHp, G.S.hp + n); extra += ` <span class="heal">+${n} HP</span>`; rec.d = `+${n} HP`; }
    if (r.hurt) { const n = Math.max(1, Math.round(s.maxHp * r.hurt * (1 - s.dodge))); G.damage(n); extra += ` <span class="dmg">-${n} HP</span>`; rec.d = `-${n} HP`; const t = panel.querySelector('.trip'); t.classList.remove('hurt'); void t.offsetWidth; t.classList.add('hurt'); }
    p.innerHTML = esc(r.msg) + extra; feed.appendChild(p); requestAnimationFrame(() => p.classList.add('in')); trip.log.push(rec);
    if (r.head) {
      const res2 = RPG.expedition(G.S, s, trip.loc, (Math.random() * 4294967296) >>> 0, G.usedNames, G.usedSig);
      const hb = res2.beats.find(b => b.head);
      const q = document.createElement('div'); q.className = 'beat';
      if (hb && trip.res.heads.length < s.cap) {
        const c = hb.head.c; trip.res.heads.push(hb.head); q.classList.add('gethead'); q.style.setProperty('--c', RC[c.rar]);
        q.innerHTML = esc(hb.t) + `<div class="gh">💀 获得首级【${RN[c.rar]}】${esc(NM(c))}</div>`; trip.log.push({ t: hb.t, cls: 'gethead' });
        SFX.chop(); SFX.squish(1); if (c.rar >= 2) SFX.fanfare(c.rar);
      } else q.textContent = trip.res.heads.length >= s.cap ? '可你的麻袋已经装满了，只能目送猎物远去。' : '猎物消失在了夜色里。';
      feed.appendChild(q); requestAnimationFrame(() => q.classList.add('in'));
    }
    feed.scrollTop = feed.scrollHeight;
    const cta = document.getElementById('tripCta'); if (cta && cta.dataset.old) { cta.innerHTML = cta.dataset.old; delete cta.dataset.old; }
    tripHud();
    if (G.S.hp <= 0) { die(); return; }
  }
  function arrive() {
    trip.done = true;
    const r = trip.res, hpLost = Math.max(0, Math.round(trip.hp0 - G.S.hp));
    const cta = document.getElementById('tripCta');
    cta.innerHTML = `<div class="arrive"><div class="arr-t">🕳️ 回到了魂首窟</div>
      <div>带回首级 <b>${r.heads.length}</b> 颗 · 🔮 +${fmt(trip.coins)} · ❤️ -${hpLost}</div>
      <div class="arr-h">${r.heads.map(h => `<span style="color:${RC[h.c.rar]}">【${RN[h.c.rar]}】${esc(NM(h.c))}</span>`).join('<br>') || '<span style="color:#999">两手空空……</span>'}</div>
      <button class="red" data-a="arrive">扛起战利品麻袋 ▶</button></div>`;
    SFX.levelup();
  }
  function logTrip(dead) {
    const S = G.S;
    S.logs.push({ locN: trip.loc.n, icon: trip.loc.icon, date: Date.now(), dead, coins: trip.coins, hpLost: Math.max(0, Math.round(trip.hp0 - S.hp)), heads: dead ? [] : trip.res.heads.map(h => ({ n: h.c.name, r: h.c.rar })), beats: trip.log });
    if (S.logs.length > 60) S.logs.shift();
  }
  function finishTrip() {
    if (!trip) return;
    const S = G.S;
    logTrip(false);
    S.stats.trips++; S.stats.kills += trip.res.heads.length;
    const recs = G.addHeadRecs(trip.res.heads);
    const n = recs.length; trip = null;
    if (window.Sack) Sack.homeArrive(n);
    close();
    SFX.music('cave');
    setTimeout(() => { if (n) G.createReturnBag(recs); else G.toast('这趟什么都没带回来……', '#aaa', 3); }, 200);
    G.save();
  }
  function die() {
    trip.dead = true;
    logTrip(true);
    const S = G.S;
    const lines = trip.log.map(b => `<p class="${b.cls || ''}">${esc(b.t)}${b.d ? ` <span class="dmg">${esc(b.d)}</span>` : ''}</p>`).join('');
    SFX.roar(1.2); SFX.music('cave');
    setTimeout(() => {
      open('dead', `<div class="dead"><div class="dead-t">☠️ 你死了</div><div class="dead-s">食人魔格罗克倒在了${esc(trip.loc.n)}。他的头被挂上了城门——猎人终成猎物。</div>
        <div class="kv small"><span>出猎次数</span><b>${S.stats.trips}</b><span>斩首总数</span><b>${S.stats.kills}</b><span>收藏首级</span><b>${S.heads.length}</b><span>累计魂晶</span><b>${fmt(S.stats.earned)}</b></div>
        <details><summary>最后一次狩猎</summary><div class="story">${lines}</div></details>
        <div class="btns"><button class="red" data-a="restart">重新开始</button></div></div>`, 'dead-m');
      G.wipe();
    }, 900);
  }

  // ---------------- 开场剧情 ----------------
  const INTRO = [
    ['🌑 很久以前……', '食人魔<b>格罗克</b>曾是群山里最凶残的怪物。直到那一夜，他吃掉了月之魔女的使者。'],
    ['🌙 诅咒', '魔女降下诅咒：<b>凡人的血肉再也无法填饱你的肚子。</b>从此，格罗克只能以<b>魂</b>为食。'],
    ['💀 残魂', '他发现，被他亲手斩下的首级里，会残留一缕不肯离去的<b>残魂</b>。越是强大的女子，残魂越是浓烈。<br>把玩、敲打、折磨这些首级，残魂就会痛苦地渗出——凝结成<b>🔮魂晶</b>。'],
    ['🧌 斯尼克', '一个贪婪的地精行商<b>斯尼克</b>在你洞里摆了摊。他收魂晶，卖装备、卖药——不问来路。'],
    ['⚔️ 你的洞窟', '走到发光的<b>洞口按 E</b> 出去狩猎；把首级带回来<b>左键把玩</b>收魂晶；按 <b>B</b> 建造（每件建筑都让你更强）；<b>Tab</b> 查看属性。<br>小心：<b>在外面死掉，一切归零。</b>']
  ];
  let introI = 0;
  function showIntro() { if (G.S.intro) return; introI = 0; introStep(); }
  function introStep() {
    if (introI >= INTRO.length) { G.S.intro = true; G.save(); close(); return; }
    const [t, b] = INTRO[introI++];
    SFX.page();
    open('intro', `<div class="intro"><h2>${t}</h2><p>${b}</p><div class="btns"><button class="red" data-a="introNext">${introI >= INTRO.length ? '开始狩猎 ▶' : '继续 ▶'}</button></div><div class="dots">${INTRO.map((_, i) => `<i class="${i < introI ? 'on' : ''}"></i>`).join('')}</div></div>`, 'intro-m');
  }

  return { init, onKey, showIntro, needIntro: () => !G.S.intro, openMenu, openBounty, openCard, openTraining, openExpedition, close, get open() { return cur; }, get trip() { return trip; }, _startTrip: startTrip, _pick: pickChoice };
})();
