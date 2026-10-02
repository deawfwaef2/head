// R63 开发者工坊（MOD dev_mode 下才有）：一个独立的大面板，随便造——
//   人物（随机/指定地区·稀有度·身体·行为）、尸体（完整/无头+落头）、首级、建造（免费无上限）、材料（任意数量）、开关。
// F8 / 右下角「🛠 DEV」打开（原 DevMode 小面板的功能全部并入「⚙ 开关」页）。只做外部包装，关掉 dev_mode 即无。
window.DevLab = (() => {
  const on = () => !window.Mods || Mods.on('dev_mode');
  if (!on()) return { off: true, toggle() { } };
  const V3 = () => new THREE.Vector3();
  const GG = () => window.G || window.__game;
  const toast = (t, c) => { try { GG().toast(t, c || '#9fe8ff', 1.8); } catch (e) { } };
  const RARN = ['普通', '精良', '稀有', '史诗', '传说', '神话'], RARC = ['#c8c8c8', '#7fdc7f', '#6aa8ff', '#c27aff', '#ffb84a', '#ff5a6a'];
  const KEY = 'hs_devlab';
  const P = { tab: 'npc', loc: 'cur', rar: -1, body: 'rand', n: 3, beh: 'hostile', ck: 'whole', hn: 10, hrar: -1, hdst: 'vault', free: true, mat: 99 };
  try { Object.assign(P, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { }
  const saveP = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { } };
  const wild = () => !!(window.Worlds && Worlds.active && Worlds._W && Worlds._W.B && window.Foe && Foe.ctx && Foe.ctx());
  const mine = new Set(); // 本面板生成的人/尸体

  // ---------- 生成人物 ----------
  function locOf() { const W = Worlds._W; if (P.loc !== 'cur') return Lore.LOCS.find(l => l.k === P.loc) || Lore.LOCS[0]; return (W && W.graph && W.graph.nodes[W.cur] && W.graph.nodes[W.cur].loc) || Lore.LOCS[0]; }
  function mkH(rar) {
    const S = GG().S, loc = locOf(); let best = null;
    for (let i = 0; i < (rar < 0 ? 1 : 40); i++) { const h = RPG.foe(S, loc, (Math.random() * 4294967296) >>> 0, GG().usedNames || new Set(), GG().usedSig || new Set()); if (!best || Math.abs(h.c.rar - rar) < Math.abs(best.c.rar - rar)) best = h; if (rar < 0 || h.c.rar === rar) break; }
    if (rar >= 0) best.c.rar = rar; return best;
  }
  function bodies() {
    const s = new Set(); try { (window.CC0 && CC0.VRF || []).forEach(b => s.add(b)); } catch (e) { }
    try { if (window.VH_PACK) Object.keys(VH_PACK).forEach(b => s.add(b)); } catch (e) { }
    if (!s.size && window.BODY_LIST) BODY_LIST.forEach(b => s.add(b));
    return [...s];
  }
  function spots(n) {
    const W = Worlds._W, C = Foe.ctx(), cam = GG().camera, d = V3(); cam.getWorldDirection(d); d.y = 0; if (d.lengthSq() < 1e-4) d.set(0, 0, -1); d.normalize();
    const rt = V3().set(-d.z, 0, d.x), out = [], R = (C.R || W.B.R || 20) - 1.5;
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / 5), k = i % 5, m = Math.min(5, n - row * 5), off = (k - (m - 1) / 2) * 1.3;
      const p = W.pos.clone().addScaledVector(d, 3.2 + row * 1.6).addScaledVector(rt, off); p.y = 0;
      const L = Math.hypot(p.x, p.z); if (!C.edge && L > R) p.multiplyScalar(R / L);
      out.push(p);
    }
    return out;
  }
  let busy = false;
  async function spawn(kind) {
    if (!wild()) { toast('人物和尸体要在野外地图里生成（洞里没有角色系统）——出门后再按 F8。', '#f9a'); return; }
    if (busy) { toast('还在生成上一批……', '#fc8'); return; } busy = true;
    const n = +P.n || 1, list = spots(n).map(pos => ({ h: mkH(+P.rar), pos })), W = Worlds._W, C = Foe.ctx();
    let out = [];
    try {
      if (P.body !== 'rand') list.forEach(x => { x.body = P.body; });
      out = await Foe.populate(C, list, { keep: true });
    } catch (e) { console.warn('DevLab spawn', e); } finally { busy = false; }
    out = out || [];
    for (const fo of out) {
      mine.add(fo); if (W.foes && !W.foes.includes(fo)) W.foes.push(fo);
      fo.yaw = Math.atan2(W.pos.x - fo.pos.x, W.pos.z - fo.pos.z); fo.f.root.rotation.y = fo.yaw;
      if (kind === 'npc') {
        if (P.beh === 'hostile') { fo.brave = true; fo.seen = true; fo.state = 'chase'; fo.cd = 1.5 + Math.random(); }
        else if (P.beh === 'timid') { fo.brave = false; }
        else { fo.devDummy = true; fo.seen = true; fo.state = 'dummy'; }
      } else {
        fo.hp = 1; const p = fo.pos.clone(); p.y += 1.2;
        try { Foe.dot(fo, 99, { point: p, vel: V3().set(Math.random() - 0.5, 0, Math.random() - 0.5), speed: 2, kind: 'slash' }); } catch (e) { }
        if (P.ck === 'headless') { try { Foe._decap(fo, { vel: V3().set(Math.random() - 0.5, 0, Math.random() - 0.5), point: p }); } catch (e) { console.warn('decap', e); } }
      }
    }
    toast(kind === 'npc' ? `生成了 ${out.length} 个人（${{ hostile: '敌对', timid: '胆小', dummy: '假人·不动' }[P.beh]}）` : `生成了 ${out.length} 具${P.ck === 'headless' ? '无头尸体（头在地上，按 E 拾取）' : '尸体（可搜身 / 解剖 / 斩首）'}`, '#9fe8a0');
  }
  function clearMine() {
    let k = 0; const W = Worlds._W, F = window.Foe && Foe.foes;
    for (const fo of mine) {
      try { if (fo.f && fo.f.root && fo.f.root.parent) fo.f.root.parent.remove(fo.f.root); if (fo.warn && fo.warn.parent) fo.warn.parent.remove(fo.warn); fo.dead = true; fo.gone = true; if (fo.anchor) fo.anchor.gone = true;
        if (F) { const i = F.indexOf(fo); if (i >= 0) F.splice(i, 1); } if (W && W.foes) { const j = W.foes.indexOf(fo); if (j >= 0) W.foes.splice(j, 1); } k++; } catch (e) { }
    }
    mine.clear(); toast(`清掉了 ${k} 个生成物`);
  }
  // 假人：每帧锁住 AI（不追、不打、不跑），可以随便砍
  function frame() { if (!window.Foe || !Foe.foes) return; for (const fo of Foe.foes) if (fo.devDummy && !fo.dead) { fo.stag = Math.max(fo.stag || 0, 0.15); fo.atk = null; fo.seen = true; fo.state = 'dummy'; } }

  // ---------- 首级 ----------
  function heads() {
    const DM = window.DevMode; const toCave = P.hdst === 'front' && !wild();
    if (DM && DM.addHeads) { for (let left = +P.hn; left > 0; left -= 50) DM.addHeads(Math.min(50, left), P.hrar < 0 ? null : +P.hrar, toCave); }
  }
  // ---------- 材料 ----------
  const KIND_N = { mat: '材料', use: '消耗品', loot: '战利品', pile: '堆叠' };
  function items() { const Sk = window.Sack; if (!Sk || !Sk.IT) return []; return Object.values(Sk.IT).filter(d => d && KIND_N[d.kind] && !/^_/.test(d.id)); }
  function give(id, n) { const Sk = window.Sack; try { Sk.inv && Sk.inv(); Sk.stashAdd(Sk.mk(id, n)); return true; } catch (e) { console.warn('give', id, e); return false; } }
  // ---------- 建造 ----------
  function build(k) {
    if (wild()) { toast('回到洞里才能建造。', '#f9a'); return; }
    toggle(false); setTimeout(() => { try { GG().startPlace(k); } catch (e) { console.warn(e); } }, 60);
  }
  function rig(k) { if (wild()) { toast('回到洞里才能布置装具。', '#f9a'); return; } try { give(k, 50); } catch (e) { } toggle(false); setTimeout(() => { try { Rig.startPlace(k); } catch (e) { } }, 60); }
  const free = () => !!P.free;

  // ---------- 面板 ----------
  let el = null;
  function css() {
    const s = document.createElement('style'); s.textContent = `
#dlab{position:fixed;inset:0;z-index:70;display:none;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,rgba(6,8,12,.55),rgba(0,0,0,.78));font:13px/1.5 system-ui,"PingFang SC","Microsoft YaHei",sans-serif;color:#e4ecef}
#dlab.on{display:flex}
#dlab .box{width:min(1040px,94vw);height:min(680px,88vh);display:flex;flex-direction:column;border-radius:14px;overflow:hidden;background:linear-gradient(180deg,#141a20,#0d1115);border:1px solid #2f4650;box-shadow:0 20px 70px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.05)}
#dlab .hd{display:flex;align-items:center;gap:14px;padding:12px 18px;border-bottom:1px solid #22323a;background:linear-gradient(90deg,rgba(60,170,190,.12),transparent)}
#dlab .hd b{font-size:17px;letter-spacing:.12em;color:#bff3ff}#dlab .hd .s{color:#7c939b;font-size:12px}#dlab .hd .x{margin-left:auto;cursor:pointer;color:#9ab;font-size:20px;padding:0 6px}#dlab .hd .x:hover{color:#fff}
#dlab .mid{flex:1;display:flex;min-height:0}
#dlab .tabs{width:150px;padding:10px 8px;border-right:1px solid #1d2a30;display:flex;flex-direction:column;gap:4px;background:rgba(0,0,0,.18)}
#dlab .tabs div{padding:9px 12px;border-radius:8px;cursor:pointer;color:#a9bcc2;font-size:14px}#dlab .tabs div:hover{background:#18252b;color:#fff}#dlab .tabs div.on{background:linear-gradient(90deg,#1d4450,#16303a);color:#dffaff;box-shadow:inset 3px 0 0 #5fd6e8}
#dlab .pg{flex:1;overflow:auto;padding:16px 20px}
#dlab h5{margin:14px 0 7px;font-size:12px;letter-spacing:.2em;color:#6fc6d4;font-weight:600}#dlab h5:first-child{margin-top:0}
#dlab .row{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
#dlab .ch{padding:5px 11px;border-radius:7px;border:1px solid #2b3f47;background:#141d22;color:#cfdde2;cursor:pointer;font-size:12.5px;user-select:none}#dlab .ch:hover{border-color:#4d8a97;color:#fff}#dlab .ch.on{background:#1f4a56;border-color:#5fd6e8;color:#fff}
#dlab .go{padding:9px 22px;border-radius:9px;border:1px solid #5fd6e8;background:linear-gradient(180deg,#2a7584,#1b4f5a);color:#fff;font-weight:700;font-size:14px;cursor:pointer;letter-spacing:.08em}#dlab .go:hover{filter:brightness(1.18)}#dlab .go.warn{border-color:#c77;background:linear-gradient(180deg,#6a3434,#462222)}
#dlab select{background:#141d22;color:#e4ecef;border:1px solid #2b3f47;border-radius:7px;padding:5px 8px;font-size:12.5px;max-width:260px}
#dlab .note{color:#7f959c;font-size:12px;margin-top:8px}#dlab .note.w{color:#f3b28a}
#dlab .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
#dlab .it{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:9px;border:1px solid #23343b;background:#11181c;cursor:pointer}#dlab .it:hover{border-color:#5fd6e8;background:#15232a}
#dlab .it i{font-style:normal;font-size:20px;width:26px;text-align:center}#dlab .it span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#dlab .it em{font-style:normal;color:#7f959c;font-size:11px}
#dlab label.tg{display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer}
#dlab .ft{padding:9px 18px;border-top:1px solid #1d2a30;color:#6c8188;font-size:11.5px;display:flex;gap:16px}`;
    document.head.appendChild(s);
  }
  const chips = (key, opts) => `<div class="row">${opts.map(([v, t, c]) => `<div class="ch${String(P[key]) === String(v) ? ' on' : ''}" data-k="${key}" data-v="${v}"${c ? ` style="color:${c}"` : ''}>${t}</div>`).join('')}</div>`;
  const rarChips = key => chips(key, [[-1, '随机']].concat(RARN.map((n, i) => [i, n, RARC[i]])));
  const locSel = () => `<select data-sel="loc"><option value="cur"${P.loc === 'cur' ? ' selected' : ''}>当前地区</option>${(window.Lore ? Lore.LOCS : []).map(l => `<option value="${l.k}"${P.loc === l.k ? ' selected' : ''}>${l.n}</option>`).join('')}</select>`;
  const bodySel = () => `<select data-sel="body"><option value="rand">随机（按身份）</option>${bodies().map(b => `<option value="${b}"${P.body === b ? ' selected' : ''}>${b}</option>`).join('')}</select>`;
  const wildNote = () => wild() ? '' : `<div class="note w">⚠ 你现在在洞里：人物/尸体只能在野外地图里生成。出门进入任意地点后再按 F8。</div>`;
  const PAGES = {
    npc: () => `<h5>地区（决定身份/种族/名字）</h5>${locSel()}<h5>稀有度</h5>${rarChips('rar')}<h5>身体</h5>${bodySel()}<h5>数量</h5>${chips('n', [[1, '1'], [3, '3'], [5, '5'], [10, '10']])}
<h5>行为</h5>${chips('beh', [['hostile', '⚔ 敌对（直接冲上来）'], ['timid', '😨 胆小（看见你会逃）'], ['dummy', '🧍 假人（站着不动，随便砍）']])}
<h5></h5><div class="row"><div class="go" data-a="npc">生成人物</div><div class="go warn" data-a="clr">清掉我生成的</div></div>${wildNote()}<div class="note">生成在你面前 3 米处，排成一排、面朝你。头、发型、身体、名字全部随机。</div>`,
    corpse: () => `<h5>地区</h5>${locSel()}<h5>稀有度</h5>${rarChips('rar')}<h5>身体</h5>${bodySel()}<h5>数量</h5>${chips('n', [[1, '1'], [3, '3'], [5, '5'], [10, '10']])}
<h5>尸体</h5>${chips('ck', [['whole', '完整尸体（可斩首 / 搜身 / 解剖）'], ['headless', '无头尸体 + 首级落在地上']])}
<h5></h5><div class="row"><div class="go" data-a="corpse">生成尸体</div><div class="go warn" data-a="clr">清掉我生成的</div></div>${wildNote()}<div class="note">布娃娃物理照常：可以拖、砍断肢、按 E 拾取首级。</div>`,
    head: () => `<h5>稀有度</h5>${rarChips('hrar')}<h5>数量</h5>${chips('hn', [[1, '1'], [5, '5'], [10, '10'], [50, '50'], [200, '200']])}
<h5>放到</h5>${chips('hdst', [['vault', '魂库'], ['front', '面前（洞里）']])}
<h5></h5><div class="row"><div class="go" data-a="head">生成首级</div></div><div class="note">每颗首级的头模、发型、饰品、身份、记忆都是随机生成的。野外想要地上的首级：去「尸体」页选“无头尸体”。</div>`,
    build: () => { const C = (window.BuildCat && BuildCat.C) || {}, cats = (window.BuildCat && BuildCat.CATS) || [];
      let h = `<label class="tg"><input type="checkbox" data-o="free"${P.free ? ' checked' : ''}> 免费无限建造（不花魂晶/材料、不限数量、可重叠、放完可以接着放）</label>`;
      for (const [ck, cn] of cats) { const ks = Object.keys(C).filter(k => C[k].cat === ck); if (!ks.length) continue; h += `<h5>${cn}</h5><div class="grid">${ks.map(k => `<div class="it" data-b="${k}"><i>${C[k].icon || '▪'}</i><span>${C[k].n}</span></div>`).join('')}</div>`; }
      if (window.Rig && Rig.KD && !Rig.off) h += `<h5>装具（钉子 / 链条 / 钩子 / 铁环 / 铃铛）</h5><div class="grid">${Object.keys(Rig.KD).map(k => `<div class="it" data-rig="${k}"><i>${Rig.KD[k].icon || '🔩'}</i><span>${Rig.KD[k].n}</span><em>+50</em></div>`).join('')}</div>`;
      return h + `<div class="note">点一个 → 面板关闭进入放置：左键放下 · R 旋转 · 右键取消。${wild() ? '<b style="color:#f3b28a">（现在在野外，回洞里才能建）</b>' : ''}</div>`; },
    mat: () => { const L = items(), by = {}; L.forEach(d => (by[d.kind] = by[d.kind] || []).push(d));
      let h = `<h5>每次点击给</h5>${chips('mat', [[1, '×1'], [10, '×10'], [99, '×99'], [999, '×999']])}<div class="row" style="margin-top:10px"><div class="go" data-a="allmat">全部 ×999</div><div class="go" data-a="coin">+100 万魂晶</div><div class="go" data-a="pot">药剂 ×99</div></div>`;
      for (const k in by) h += `<h5>${KIND_N[k]}（${by[k].length}）</h5><div class="grid">${by[k].map(d => `<div class="it" data-m="${d.id}"><i>${d.icon || '▪'}</i><span style="color:${RARC[d.rar || 0]}">${d.n || d.id}</span><em>${window.Sack ? Sack.have(d.id) : ''}</em></div>`).join('')}</div>`;
      return h + `<div class="note">进魂窟的仓库（野外按背包查看）。</div>`; },
    opt: () => { const O = (window.DevMode && DevMode.O) || {};
      return `<h5>开关</h5>${[['inf', '资源无限（魂晶 999999、材料/药剂自动补满）'], ['unl', '全部解锁（建筑/功能全开）'], ['god', '无敌（生命自动回满）'], ['stam', '体力无限']].map(([k, t]) => `<label class="tg"><input type="checkbox" data-dm="${k}"${O[k] ? ' checked' : ''}> ${t}</label>`).join('')}
<h5>一键</h5><div class="row"><div class="ch" data-a="eq">装备满阶</div><div class="ch" data-a="lv">等级拉满</div><div class="ch" data-a="unl">立即全解锁</div><div class="ch" data-a="recall">全部首级回忆全开</div></div><div class="note">MOD「开发者模式」可在 MOD 菜单关闭；关闭后这个面板和所有无限效果都会消失。</div>`; }
  };
  const TABS = [['npc', '👤 人物'], ['corpse', '⚰️ 尸体'], ['head', '💀 首级'], ['build', '🏗 建造'], ['mat', '📦 材料'], ['opt', '⚙ 开关']];
  function render() {
    if (!el) return;
    el.querySelector('.tabs').innerHTML = TABS.map(([k, t]) => `<div data-t="${k}" class="${P.tab === k ? 'on' : ''}">${t}</div>`).join('');
    const pg = el.querySelector('.pg'), st = pg.scrollTop; pg.innerHTML = (PAGES[P.tab] || PAGES.npc)(); pg.scrollTop = st;
    el.querySelector('.ft').innerHTML = `<span>F8 开/关</span><span>Esc 关闭</span><span>${wild() ? '📍 野外：' + (locOf().n || '') : '🏠 洞里'}</span><span>本面板生成：${mine.size}</span>`;
  }
  function act(a) {
    const DM = window.DevMode, S = GG().S;
    if (a === 'npc') spawn('npc'); else if (a === 'corpse') spawn('corpse'); else if (a === 'clr') clearMine(); else if (a === 'head') heads();
    else if (a === 'allmat') { let k = 0; items().forEach(d => { const h = Sack.have(d.id); if (h < 999 && give(d.id, 999 - h)) k++; }); toast(`补满了 ${k} 种`); }
    else if (a === 'coin') { S.coins = (S.coins || 0) + 1e6; toast('+1000000 魂晶'); }
    else if (a === 'pot') { const it = S.items || (S.items = {}); it.potion = (it.potion || 0) + 99; it.bigpotion = (it.bigpotion || 0) + 99; toast('药剂 +99'); }
    else if (DM) { if (a === 'eq') DM.maxEquip(); else if (a === 'lv') DM.maxLevel(); else if (a === 'unl') DM.unlockAll(false); else if (a === 'recall') { let n = 0; for (const r of S.heads) if (r.c) { r.c.kn = r.c.kn || {}; if (window.Recall && Recall.FAC) Recall.FAC.forEach(k => { r.c.kn[typeof k === 'string' ? k : k.k] = 1; }); n++; } toast(`${n} 颗首级的回忆已全部揭开`); } }
    try { GG().save(); window.UI && UI.refresh && UI.refresh(); } catch (e) { }
    setTimeout(render, 50);
  }
  function build0() {
    css(); el = document.createElement('div'); el.id = 'dlab';
    el.innerHTML = `<div class="box"><div class="hd"><b>🛠 开发者工坊</b><span class="s">随机人物 · 随机尸体 · 随机首级 · 无限建造 · 无限材料</span><span class="x" data-x="1">✕</span></div><div class="mid"><div class="tabs"></div><div class="pg"></div></div><div class="ft"></div></div>`;
    el.addEventListener('click', e => {
      e.stopPropagation(); const t = e.target;
      if (t === el || t.closest('[data-x]')) { toggle(false); return; }
      const tb = t.closest('[data-t]'); if (tb) { P.tab = tb.dataset.t; saveP(); render(); return; }
      const ch = t.closest('.ch[data-k]'); if (ch) { const v = ch.dataset.v; P[ch.dataset.k] = isNaN(+v) ? v : +v; saveP(); render(); return; }
      const b = t.closest('[data-b]'); if (b) { build(b.dataset.b); return; }
      const rg = t.closest('[data-rig]'); if (rg) { rig(rg.dataset.rig); return; }
      const m = t.closest('[data-m]'); if (m) { if (give(m.dataset.m, +P.mat)) { const em = m.querySelector('em'); if (em) em.textContent = Sack.have(m.dataset.m); m.animate && m.animate([{ background: '#2a6070' }, { background: '#11181c' }], 380); } return; }
      const a = t.closest('[data-a]'); if (a) act(a.dataset.a);
    });
    el.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset.sel) { P[t.dataset.sel] = t.value; saveP(); }
      if (t.dataset.o) { P[t.dataset.o] = t.checked; saveP(); }
      if (t.dataset.dm && window.DevMode) { DevMode.O[t.dataset.dm] = t.checked; try { localStorage.setItem('hs_dev_opts', JSON.stringify(DevMode.O)); DevMode.tick(); } catch (e2) { } }
    });
    ['mousedown', 'pointerdown', 'wheel', 'keyup'].forEach(ev => el.addEventListener(ev, e => e.stopPropagation()));
    document.body.appendChild(el);
  }
  function isOpen() { return !!(el && el.classList.contains('on')); }
  function toggle(v) {
    if (!el) build0(); const open = v == null ? !isOpen() : !!v; el.classList.toggle('on', open);
    if (open) render();
    try { if (open) GG().setUI(true); else { GG().setUI(false); GG().lockPointer && GG().lockPointer(); } } catch (e) { }
  }
  addEventListener('keydown', e => {
    if (e.code === 'F8') { e.preventDefault(); e.stopImmediatePropagation(); toggle(); return; }
    if (isOpen()) { if (e.code === 'Escape') { e.preventDefault(); toggle(false); } e.stopImmediatePropagation(); }
  }, true);
  (function loop() { try { if (mine.size) frame(); } catch (e) { } requestAnimationFrame(loop); })(); // 野外的循环不走 G.HOOK，自己跑（没生成过东西时什么都不做）
  return { toggle, isOpen, free, spawn, clearMine, P, _mine: mine };
})();
