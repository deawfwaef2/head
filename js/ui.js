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
    if (cur === 'trip') { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (!e.repeat) tripTap(); } return true; }
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
    if (e.code === 'KeyC') { openMenu('heads'); return true; }
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
      case 'place': { const k = v; const d = BuildCat.C[k]; if (G.S.coins < G.cost(k)) { deny(a); break; } if (d.max && G.bought(k) >= d.max) { deny(a); break; } close(); G.startPlace(k); break; }
      case 'dig': if (G.dig()) openMenu('build', 'dig'); else deny(a); break;
      case 'equip': if (G.buyEquip(v)) openMenu('equip'); else deny(a); break;
      case 'buy': if (G.buyItem(v)) openMenu(menuState.tab); else deny(a); break;
      case 'use': G.useItem(v); openMenu(menuState.tab); break;
      case 'card': { const rec = G.S.heads.find(r => r.id == v); if (rec) openCard(rec, true); break; }
      case 'mem': showMemory(); break;
      case 'log': openLog(+v); break;
      case 'back': openMenu(menuState.tab); break;
      case 'loc': startTrip(v); break;
      case 'trainGo': trainStart(); break;
      case 'arrive': finishTrip(); break;
      case 'restart': G.wipe(); location.reload(); break;
      case 'introNext': introStep(); break;
    }
  }
  function deny(el) { SFX.deny(); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

  // ---------------- 主菜单 ----------------
  const menuState = { tab: 'stats', sub: 'func' };
  const TABS = [['stats', '👹 属性'], ['equip', '🪓 装备·斯尼克'], ['build', '🔨 建造'], ['heads', '💀 首级收藏'], ['logs', '📜 狩猎日志']];
  function openMenu(tab = menuState.tab, sub) {
    menuState.tab = tab; if (sub) menuState.sub = sub;
    const S = G.S;
    const head = `<div class="m-head"><div class="m-title">魂首窟</div><div class="m-tabs">${TABS.map(([k, n]) => `<button class="m-tab ${k === tab ? 'on' : ''}" data-a="tab" data-v="${k}">${n}</button>`).join('')}</div>
      <div class="m-coins">🔮 ${fmt(S.coins)}</div><button class="m-close" data-a="close">✕ 关闭</button></div>`;
    let body = '';
    if (tab === 'stats') body = statsBody();
    else if (tab === 'equip') body = equipBody();
    else if (tab === 'build') body = buildBody();
    else if (tab === 'heads') body = headsBody();
    else if (tab === 'logs') body = logsBody();
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
      <div class="kv small"><span>出猎次数</span><b>${S.stats.trips}</b><span>斩首总数</span><b>${S.stats.kills}</b><span>累计魂晶</span><b>${fmt(S.stats.earned)}</b><span>把玩次数</span><b>${fmt(S.stats.pokes)}</b></div>
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
        const done = S.depth >= d.depth, next = S.depth + 1 === d.depth;
        return `<div class="bp-item dig ${done ? 'done' : next ? (S.coins < d.cost ? 'poor' : '') : 'locked'}" ${next ? 'data-a="dig"' : ''}><div class="bp-icon">${done ? '✅' : next ? '⛏️' : '🔒'}</div><div class="bp-name">${d.n}</div><div class="bp-cost">${done ? '已完成' : '🔮 ' + fmt(d.cost)}</div><div class="bp-desc">洞窟半径 ${d.r}m。${esc(d.desc || '')}</div></div>`;
      }).join('');
    } else {
      grid = Object.keys(C).filter(k => C[k].cat === sub).map(k => {
        const d = C[k], lock = d.depth && d.depth > S.depth, c = G.cost(k), own = G.bought(k), maxed = d.max && own >= d.max;
        return `<div class="bp-item ${lock ? 'locked' : maxed ? 'done' : S.coins < c ? 'poor' : ''}" ${lock || maxed ? '' : `data-a="place" data-v="${k}"`}>
          ${own ? `<div class="bp-own">已建 ${own}</div>` : ''}<div class="bp-icon">${lock ? '🔒' : d.icon}</div><div class="bp-name">${d.n}</div>
          <div class="bp-cost">${lock ? `需洞窟第 ${d.depth} 层` : maxed ? '已建成' : '🔮 ' + fmt(c)}</div>
          <div class="bp-stat">${statTxt(d.stat)}${d.regen ? ' 恢复+' + d.regen + '%' : ''}</div><div class="bp-desc">${esc(d.desc || '')}</div></div>`;
      }).join('');
    }
    return `<div class="bp-tabs">${tabs}</div><p class="hint2">每件建筑都会<b>永久提升主角属性</b>（战力）。放置时：左键确认 · R 旋转 · 右键取消。对建筑连按 XX 拆除（返还 50%）。</p><div class="bp-grid">${grid}</div>`;
  }
  function headsBody() {
    const list = G.S.heads.slice().sort((a, b) => b.c.rar - a.c.rar || b.id - a.id);
    if (!list.length) return '<p class="empty">洞里还没有首级。走到洞口（发光的出口）按 E，出去狩猎吧。</p>';
    return `<p class="hint2">共 ${list.length} 颗 · 点击查看档案与「回忆」。在洞里对着首级按 F 也可以查看。</p><div class="hd-grid">` + list.map(r => `<div class="hd" data-a="card" data-v="${r.id}" style="--c:${RC[r.c.rar]}"><div class="hd-r">${RN[r.c.rar]}</div><div class="hd-n">${esc(r.c.name)}</div><div class="hd-i">${esc(r.c.raceN)} · ${esc(r.c.idN)}</div><div class="hd-l">${esc(r.c.locN)}</div></div>`).join('') + '</div>';
  }
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
  function openCard(rec, fromMenu) {
    cardRec = rec; const c = rec.c;
    open('card', `<div class="card" style="--c:${RC[c.rar]}">
      <div class="card-r">【${RN[c.rar]}】</div><h2>${esc(c.name)}</h2>
      <div class="card-id">${esc(c.raceN)} · ${esc(c.idN)} · ${c.age} 岁 · 得自 ${esc(c.locN)}</div>
      <div class="kv"><span>性格</span><b>${esc((c.traits || []).join('、'))}</b><span>信仰</span><b>${esc(c.belief)}</b><span>生前目的</span><b>${esc(c.goal)}</b><span>魂晶产出</span><b>×${[1, 3, 8, 20, 55][c.rar]}</b></div>
      <h3>外貌</h3>${para(rec.app)}
      <h3>生平</h3>${para(rec.story)}
      <div id="memBox"></div>
      <div class="btns"><button class="red" data-a="mem">🩸 回忆：我是怎么得到这颗头的</button>${fromMenu ? '<button data-a="back">← 返回</button>' : ''}<button data-a="close">关闭</button></div></div>`, 'card-m');
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
  function openExpedition() {
    const S = G.S, s = G.st();
    const hpF = S.hp / s.maxHp;
    const cards = Lore.LOCS.map(l => {
      const q = s.power / l.rec, [dn, dc] = danger(q);
      const races = Object.keys(l.races).map(k => (Lore.RACES[k] || { n: k }).n).join(' / ');
      return `<div class="loc" data-a="loc" data-v="${l.k}" style="--lc:${l.color}"><div class="loc-ic">${l.icon}</div><div class="loc-n">${l.n}</div>
        <div class="loc-d" style="color:${dc}">${dn}</div><div class="loc-rec">推荐战力 ${l.rec}</div><div class="loc-desc">${esc(l.desc)}</div><div class="loc-r">猎物：${esc(races)}</div><div class="loc-loot">魂晶 ${l.loot[0]}~${l.loot[1]}</div></div>`;
    }).join('');
    SFX.open();
    open('exp', `<div class="m-head"><div class="m-title">🌄 出洞狩猎</div><div class="m-coins">⚔️ 战力 ${fmt(s.power)} · ❤️ ${Math.round(S.hp)}/${s.maxHp} · 🧺 ${s.cap} 颗</div><button class="m-close" data-a="close">✕ 留在洞里</button></div>
      ${hpF < 0.5 ? `<div class="warn">⚠️ 你的生命只剩 ${Math.round(hpF * 100)}%。死在外面就一切归零——先喝药或在洞里休息吧。 ${RPG.CONSUM.map(c => `<button data-a="use" data-v="${c.k}" ${S.items[c.k] ? '' : 'disabled'}>${c.icon}${c.n}×${S.items[c.k] || 0}</button>`).join('')}</div>` : ''}
      <p class="hint2">选择狩猎地点。结束后要<b>点击屏幕 60 次</b>才能背着首级走回洞里。战力越高、背篓越大，带回的首级越多；地点太难可能空手而归，甚至死在路上（<b>死亡 = 重新开始</b>）。</p>
      <div class="locs">${cards}</div>`, 'big');
    menuState.tab = 'exp';
  }
  const TAPS = 60;
  function startTrip(k) {
    const loc = Lore.LOCS.find(l => l.k === k); if (!loc) return;
    const s = G.st();
    const res = RPG.expedition(G.S, s, loc, (Math.random() * 4294967296) >>> 0, G.usedNames, G.usedSig);
    const n = res.beats.length;
    // 第一段立刻出现，其余均匀分布在 60 次点击上，最后一段在第 60 下
    const at = res.beats.map((b, i) => i === 0 ? 0 : Math.round(i / (n - 1) * TAPS));
    trip = { loc, res, at, taps: 0, shown: 0, hp0: G.S.hp, coins: 0, log: [], dead: false, done: false };
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
    document.getElementById('tripBar').style.width = trip.taps / TAPS * 100 + '%'; document.getElementById('tripN').textContent = trip.taps;
  }
  function tripTap(e) {
    if (!trip || trip.dead || trip.done) return;
    trip.taps = Math.min(TAPS, trip.taps + 1);
    SFX.step(); if (trip.taps % 6 === 0) SFX.play('step', 0.5, 0.7);
    if (e && e.clientX != null) { const f = document.createElement('div'); f.className = 'tapfx'; f.textContent = ['👣', '💢', '🩸', '⚔️'][trip.taps % 4]; f.style.left = e.clientX + 'px'; f.style.top = e.clientY + 'px'; root.appendChild(f); setTimeout(() => f.remove(), 700); }
    const t = panel.querySelector('.trip'); t.classList.remove('bob'); void t.offsetWidth; t.classList.add('bob');
    revealUpTo(trip.taps); tripHud();
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
        extra += `<div class="gh">💀 获得首级【${RN[c.rar]}】${esc(c.name)}</div>`; rec.cls = 'gethead';
        SFX.chop(); SFX.squish(1); if (c.rar >= 2) SFX.fanfare(c.rar);
      }
      p.innerHTML = esc(b.t) + extra; feed.appendChild(p); trip.log.push(rec);
      requestAnimationFrame(() => p.classList.add('in'));
      feed.scrollTop = feed.scrollHeight;
      if (G.S.hp <= 0) { die(); return; }
    }
  }
  function arrive() {
    trip.done = true;
    const r = trip.res, hpLost = Math.max(0, Math.round(trip.hp0 - G.S.hp));
    const cta = document.getElementById('tripCta');
    cta.innerHTML = `<div class="arrive"><div class="arr-t">🕳️ 回到了魂首窟</div>
      <div>带回首级 <b>${r.heads.length}</b> 颗 · 🔮 +${fmt(trip.coins)} · ❤️ -${hpLost}</div>
      <div class="arr-h">${r.heads.map(h => `<span style="color:${RC[h.c.rar]}">【${RN[h.c.rar]}】${esc(h.c.name)}</span>`).join('<br>') || '<span style="color:#999">两手空空……</span>'}</div>
      <button class="red" data-a="arrive">把首级倒在洞里 ▶</button></div>`;
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
    close();
    SFX.music('cave');
    setTimeout(() => { G.spawnReturnHeads(recs); if (n) G.toast(`背篓一倒，<b>${n}</b> 颗首级滚了出来 · 对着首级按 <b>F</b> 查看她的故事`, '#ffd890', 4); else G.toast('这趟什么都没带回来……', '#aaa', 3); }, 200);
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

  return { init, onKey, showIntro, needIntro: () => !G.S.intro, openMenu, openCard, openTraining, openExpedition, close, get open() { return cur; } };
})();
