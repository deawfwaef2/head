// R34 MOD dev_mode（开发者模式）：资源无限 + 全解锁 + 开发者面板（F8 或右上角 DEV 按钮）。
// 只做「包一层」：不改 game.js / sack.js / unlocks.js 的源码，关掉 MOD 即完全恢复原样（已刷出来的东西会留在存档里）。
window.DevMode = (() => {
  const on = () => !window.Mods || Mods.on('dev_mode');
  if (!on()) return { off: true };
  const KEY = 'hs_dev_opts';
  let O = { inf: true, unl: true, god: true, stam: true };
  try { Object.assign(O, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { }
  const saveO = () => { try { localStorage.setItem(KEY, JSON.stringify(O)); } catch (e) { } };
  const S_ = () => window.G && G.S;
  const toast = (t, c) => { try { G.toast(t, c || '#9fe8ff', 1.6); } catch (e) { } };
  const RARN = ['普通', '精良', '稀有', '史诗', '传说', '神话'];

  // ---- 资源 ----
  function fillMats(n) {
    const Sk = window.Sack; if (!Sk || !Sk.IT || !Sk.mk) return 0; let k = 0;
    try { Sk.inv && Sk.inv(); } catch (e) { }
    for (const id in Sk.IT) { const d = Sk.IT[id]; if (!d || (d.kind !== 'mat' && d.kind !== 'use')) continue; const h = Sk.have(id); if (h < n) { try { Sk.stashAdd(Sk.mk(id, n - h)); k++; } catch (e) { } } }
    return k;
  }
  function maxHp() { try { return RPG.stats(S_(), {}).maxHp; } catch (e) { return 0; } }
  function unlockAll(silent) {
    const S = S_(); if (!S || !window.BuildCat) return; S.unl = S.unl || {}; let n = 0;
    for (const k in BuildCat.C) if (!S.unl[k]) { S.unl[k] = '开发者模式'; n++; }
    if (!silent && n) toast(`已解锁 ${n} 个建筑/功能`);
  }
  function tick() {
    const S = S_(); if (!S) return;
    if (O.inf) { if ((S.coins || 0) < 999999) S.coins = 999999; S.stats = S.stats || {}; fillMats(999); const it = S.items || (S.items = {}); if ((it.potion || 0) < 99) it.potion = 99; if ((it.bigpotion || 0) < 99) it.bigpotion = 99; }
    if (O.unl) unlockAll(true);
    if (O.god) { const m = maxHp(); if (m && S.hp < m) S.hp = m; S.dead = false; }
  }

  // ---- 包一层：解锁 / 体力 ----
  function wrap() {
    if (window.Unlocks && !Unlocks._dev) { const h = Unlocks.has; Unlocks.has = k => (O.unl ? true : h(k)); Unlocks._dev = 1; }
    if (window.Stamina && !Stamina._dev) { const sp = Stamina.spend, dr = Stamina.drain; Stamina.spend = (n, k) => (O.stam ? true : sp(n, k)); Stamina.drain = x => (O.stam ? undefined : dr(x)); Stamina._dev = 1; }
    if (window.RegEcon && RegEcon.can && !RegEcon._dev) { const c = RegEcon.can; RegEcon.can = k => (O.inf ? true : c(k)); RegEcon._dev = 1; }
  }

  // ---- 刷首级 ----
  function addHeads(n, rar, toCave) {
    const G = window.G; if (!G || !window.RPG) return; const out = [];
    for (let i = 0; i < n; i++) {
      try {
        const r = rar == null ? Math.floor(Math.random() * 5) : rar;
        const raw = RPG.forgeHead(G.S, r, (Math.random() * 4294967296) >>> 0, G.usedNames, G.usedSig, 3);
        const rec = G.addHeadRecs([raw])[0]; if (!rec) break; rec.vault = true; out.push(rec);
      } catch (e) { console.warn('dev head', e); }
    }
    if (toCave && G.takeOut) { const cam = G.camera; out.forEach((rec, i) => { try { const p = cam.position.clone().add(new THREE.Vector3((i - (out.length - 1) / 2) * 0.45, -0.3, -1.4).applyQuaternion(cam.quaternion)); G.takeOut(rec, p); } catch (e) { } }); }
    try { G.save(); window.UI && UI.refresh && UI.refresh(); } catch (e) { }
    toast(`+${out.length} 颗首级${rar != null ? '（' + RARN[rar] + '）' : ''}${toCave ? '，放在面前' : '，已进魂库'}`);
  }
  function maxEquip() {
    const S = S_(); if (!S || !window.RPG) return; S.eq = S.eq || {};
    for (const sl in RPG.EQUIP) { const t = RPG.EQUIP[sl].tiers; if (t && t.length) S.eq[sl] = t.length - 1; }
    try { G.refreshWeapon && G.refreshWeapon(); } catch (e) { }
    toast('装备已全部升到最高阶');
  }
  function maxLevel() { const S = S_(); if (!S) return; S.xp = (S.xp || 0) + 1e7; for (const k in (S.base || {})) S.base[k] = Math.max(S.base[k], 60); toast('等级/属性已拉满'); }

  // ---- 面板 ----
  let el = null;
  function css() {
    const s = document.createElement('style'); s.textContent = `
#devbtn{position:fixed;right:12px;bottom:12px;z-index:60;padding:4px 10px;border-radius:8px;background:rgba(20,60,80,.85);color:#bff;border:1px solid #5cc;font:600 12px system-ui;cursor:pointer;opacity:.75}
#devbtn:hover{opacity:1}
#devp{position:fixed;right:12px;bottom:46px;z-index:61;width:330px;max-height:80vh;overflow:auto;padding:12px 14px;border-radius:12px;background:rgba(10,18,24,.94);border:1px solid #4aa;color:#dff;font:13px/1.5 system-ui;display:none}
#devp.on{display:block}#devp h4{margin:8px 0 4px;color:#8ee;font-size:13px}#devp .row{display:flex;flex-wrap:wrap;gap:5px}
#devp button{padding:4px 8px;border-radius:6px;border:1px solid #3a7a80;background:#143038;color:#dff;font:12px system-ui;cursor:pointer}#devp button:hover{background:#1e4a55}
#devp label{display:flex;align-items:center;gap:6px;margin:2px 0;cursor:pointer}#devp .t{font-weight:700;color:#9ff;font-size:14px}#devp .s{color:#8aa;font-size:11px}`;
    document.head.appendChild(s);
  }
  function build() {
    css();
    const b = document.createElement('div'); b.id = 'devbtn'; b.textContent = '🛠 DEV (F8)'; b.onclick = e => { e.stopPropagation(); toggle(); }; document.body.appendChild(b);
    el = document.createElement('div'); el.id = 'devp';
    const R = RARN.map((n, i) => `<button data-a="h" data-r="${i}">${n}×5</button>`).join('');
    el.innerHTML = `<div class="t">🛠 开发者模式</div><div class="s">MOD「开发者模式」可在 MOD 菜单关闭。F8 开关本面板。</div>
<h4>开关</h4>
<label><input type="checkbox" data-o="inf"> 资源无限（魂晶 999999、材料/药剂 999 自动补满）</label>
<label><input type="checkbox" data-o="unl"> 全部解锁（建筑/功能全开）</label>
<label><input type="checkbox" data-o="god"> 无敌（生命自动回满）</label>
<label><input type="checkbox" data-o="stam"> 体力无限</label>
<h4>刷首级</h4><div class="row"><button data-a="h10">随机 ×10 进魂库</button><button data-a="h3c">随机 ×3 放面前</button><button data-a="h50">随机 ×50</button></div>
<div class="row" style="margin-top:5px">${R}</div>
<h4>一键</h4><div class="row"><button data-a="eq">装备满阶</button><button data-a="lv">等级拉满</button><button data-a="coin">+100万魂晶</button><button data-a="mat">材料补满</button><button data-a="unl">立即全解锁</button><button data-a="recall">全部首级回忆全开</button></div>`;
    el.addEventListener('click', e => {
      e.stopPropagation(); const t = e.target.closest('button'); if (!t) return; const a = t.dataset.a;
      if (a === 'h') addHeads(5, +t.dataset.r, false); else if (a === 'h10') addHeads(10, null, false); else if (a === 'h3c') addHeads(3, null, true); else if (a === 'h50') addHeads(50, null, false);
      else if (a === 'eq') maxEquip(); else if (a === 'lv') maxLevel(); else if (a === 'coin') { S_().coins = (S_().coins || 0) + 1e6; toast('+1000000 魂晶'); }
      else if (a === 'mat') toast(`补满了 ${fillMats(999)} 种材料`); else if (a === 'unl') unlockAll(false);
      else if (a === 'recall') { let n = 0; for (const r of S_().heads) { if (r.c) { r.c.kn = r.c.kn || {}; if (window.Recall && Recall.FAC) Recall.FAC.forEach(k => { r.c.kn[typeof k === 'string' ? k : k.k] = 1; }); n++; } } toast(`${n} 颗首级的回忆已全部揭开`); }
      try { G.save(); window.UI && UI.refresh && UI.refresh(); } catch (e2) { }
    });
    el.addEventListener('change', e => { const k = e.target.dataset.o; if (!k) return; O[k] = e.target.checked; saveO(); tick(); });
    ['mousedown', 'pointerdown', 'wheel'].forEach(ev => el.addEventListener(ev, e => e.stopPropagation()));
    document.body.appendChild(el);
  }
  function toggle(v) {
    if (window.DevLab && !DevLab.off) { DevLab.toggle(v); return; } // R63：DEV 按钮 / F8 改开「开发者工坊」大面板
    if (!el) build(); const open = v == null ? !el.classList.contains('on') : v; el.classList.toggle('on', open);
    el.querySelectorAll('input[data-o]').forEach(i => { i.checked = !!O[i.dataset.o]; });
    try { if (open) { G.setUI(true); } else { G.setUI(false); G.lockPointer && G.lockPointer(); } } catch (e) { }
  }
  addEventListener('keydown', e => { if (e.code === 'F8' && !(window.DevLab && !DevLab.off)) { e.preventDefault(); e.stopImmediatePropagation(); toggle(); } }, true);

  function boot() {
    if (!window.G || !G.S) { setTimeout(boot, 500); return; }
    wrap(); if (!el) build(); tick(); setInterval(() => { wrap(); tick(); }, 800);
    try { window.Unlocks && Unlocks.scan && Unlocks.scan(true); } catch (e) { }
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot); else setTimeout(boot, 0);
  return { O, toggle, addHeads, fillMats, unlockAll, maxEquip, maxLevel, tick };
})();
