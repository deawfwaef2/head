// R42 统一菜单（用户：“UI 设计得非常屎，各种奇怪按键 UI 分类，有没有统一器？按 TAB 分类看到所有 UI；物品栏和装备 UI 也放一起”）。MOD `ui_hub`（默认开）。
// Tab 打开（洞里、野外都行）。左侧是分组导航栏（角色 / 挑战 / 收藏 / 世界 / 系统），右边是各个原有面板，导航栏和面板一起出现、一起消失：
//   角色：总览 · 装备与背包（装备 + 纸娃娃 + 物品 + 铁匠 + 工坊 + 典籍 合并一页）· 天赋技能
//   挑战：精英挑战 · 猎手档案    收藏：首级收藏 · 图鉴展厅 · 灵契    世界：狩猎日志 · 建造    系统：按键一览 · MOD 设置
// 原来的热键（T / O / F1 / C / U / K / L / B / Z / Y）仍然可用——打开任何一个面板，导航栏都会自动出现，可以一键切到别的页。
// 实现：Hub 只做“导航 + 布局”，不重写各模块的内容；面板的打开 / 关闭走各模块自己的公开函数。三语文案；容器带 data-noi18n。
window.Hub = (() => {
  'use strict';
  const on = () => !window.Mods || !Mods.on || Mods.on('ui_hub') !== false;
  const curLang = () => { let l = (window.I18N && I18N.lang) || localStorage.getItem('soulhead_lang') || 'zh'; return ['zh', 'ja', 'en'].includes(l) ? l : 'zh'; };
  const G0 = () => window.G, wild = () => !!(window.Worlds && Worlds.active);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const uiTab = () => (window.UI && UI.open === 'menu') ? UI.tab : null;
  const r35 = id => !!(window.R35UI && R35UI.isOpen(id));
  const GROUPS = [
    ['role', { zh: '角色', ja: 'キャラクター', en: 'Character' }], ['fight', { zh: '挑战', ja: 'チャレンジ', en: 'Challenges' }],
    ['coll', { zh: '收藏', ja: 'コレクション', en: 'Collection' }], ['world', { zh: '世界', ja: 'ワールド', en: 'World' }], ['sys', { zh: '系统', ja: 'システム', en: 'System' }]];
  // 页面表：isOpen / open / close 都用各模块自己的函数。cave = 只在洞里。
  const PAGES = [
    { id: 'overview', g: 'role', ic: '👹', k: 'Tab', n: { zh: '总览', ja: '概要', en: 'Overview' }, ui: 'stats', isOpen: () => uiTab() === 'stats', open: () => UI.openMenu('stats') },
    { id: 'kit', g: 'role', ic: '🎒', k: 'Z', n: { zh: '装备与背包', ja: '装備と持ち物', en: 'Gear & Bag' }, ui: 'equip', isOpen: () => uiTab() === 'equip', open: () => UI.openMenu('equip'), ok: () => !!(window.Sack && Sack.on()) },
    { id: 'talents', g: 'role', ic: '🌳', k: 'T', n: { zh: '天赋 · 技能', ja: '才能・スキル', en: 'Talents' }, isOpen: () => !!(window.TalUI && TalUI._ui.open), open: () => TalUI.open(), close: () => TalUI.close(), ok: () => !!(window.TalUI && window.Talents && Talents.on()) },
    { id: 'elite', g: 'fight', ic: '👑', k: 'C', n: { zh: '精英挑战', ja: 'エリート挑戦', en: 'Elite trials' }, isOpen: () => r35('elite'), open: () => R35UI.open('elite'), close: () => R35UI.close(), ok: () => !!(window.R35UI && R35UI.avail('elite')) },
    { id: 'hunt', g: 'fight', ic: '🏹', k: 'U', n: { zh: '猎手档案', ja: 'ハンター記録', en: 'Hunters' }, isOpen: () => r35('hunt'), open: () => R35UI.open('hunt'), close: () => R35UI.close(), ok: () => !!(window.R35UI && R35UI.avail('hunt')) },
    { id: 'heads', g: 'coll', ic: '💀', k: 'K', n: { zh: '首级收藏', ja: '首級コレクション', en: 'Head vault' }, ui: 'heads', isOpen: () => uiTab() === 'heads', open: () => UI.openMenu('heads'), cave: 1 },
    { id: 'codex', g: 'coll', ic: '📖', k: '', n: { zh: '图鉴 · 展厅', ja: '図鑑・展示室', en: 'Codex & hall' }, ui: 'codex', isOpen: () => uiTab() === 'codex', open: () => UI.openMenu('codex'), cave: 1 },
    { id: 'spirits', g: 'coll', ic: '👻', k: 'Y', n: { zh: '灵契', ja: '霊契', en: 'Spirit pacts' }, isOpen: () => !!(window.Spirits && Spirits.panelOpen), open: () => Spirits.panel(), close: () => Spirits.closePanel(), ok: () => !!window.Spirits, cave: 1 },
    { id: 'logs', g: 'world', ic: '📜', k: 'L', n: { zh: '狩猎日志', ja: '狩猟日誌', en: 'Hunt log' }, ui: 'logs', isOpen: () => uiTab() === 'logs', open: () => UI.openMenu('logs') },
    { id: 'build', g: 'world', ic: '🔨', k: 'B', n: { zh: '建造', ja: '建築', en: 'Build' }, ui: 'build', isOpen: () => uiTab() === 'build', open: () => UI.openMenu('build'), cave: 1 },
    { id: 'keys', g: 'sys', ic: '⌨', k: 'F1', n: { zh: '按键一览', ja: 'キー一覧', en: 'Key guide' }, isOpen: () => !!(window.KeyGuide && KeyGuide.isOpen), open: () => KeyGuide.open(), close: () => KeyGuide.close(), ok: () => !!window.KeyGuide },
    { id: 'mods', g: 'sys', ic: '⚙', k: 'O', n: { zh: 'MOD 设置', ja: 'MOD設定', en: 'Mods' }, isOpen: () => !!(window.Mods && Mods.isOpen), open: () => Mods.open(), close: () => Mods.close(), ok: () => !!(window.Mods && Mods.open) }
  ];
  const avail = p => (!p.cave || !wild()) && (!p.ok || p.ok());
  const openPage = () => PAGES.find(p => { try { return p.isOpen(); } catch (e) { return false; } }) || null;
  let rail = null, btn = null, last = 'overview', css0 = 0;
  try { last = localStorage.getItem('hub_last') || 'overview'; } catch (e) { }

  function addCss() {
    if (css0) return; css0 = 1; const s = document.createElement('style'); s.id = 'hubCss'; s.textContent = `
:root{--hubW:196px}
#hubRail{position:fixed;left:0;top:0;bottom:0;width:var(--hubW);z-index:120;display:none;flex-direction:column;box-sizing:border-box;padding:16px 10px 12px;background:linear-gradient(90deg,rgba(10,6,8,.98),rgba(16,10,12,.94));border-right:1px solid rgba(231,194,122,.35);box-shadow:8px 0 30px rgba(0,0,0,.6);font-family:"Noto Serif SC","Songti SC","Noto Sans CJK SC",system-ui,sans-serif;color:#eadfca;user-select:none;overflow:auto}
#hubRail.on{display:flex}
#hubRail .ttl{font-size:19px;font-weight:900;letter-spacing:.3em;color:#e7c27a;text-align:center;padding:2px 0 10px;border-bottom:1px solid rgba(231,194,122,.25);margin-bottom:8px;text-shadow:0 2px 8px #000}
#hubRail .me{display:flex;justify-content:space-between;font-size:12.5px;color:#cbbd9f;padding:0 6px 8px}#hubRail .me b{color:#ffd98a}
#hubRail .gh{font-size:11.5px;letter-spacing:.3em;color:#9b8a6c;margin:10px 6px 4px;font-weight:700}
#hubRail button{display:flex;align-items:center;gap:9px;width:100%;box-sizing:border-box;margin:1px 0;padding:8px 8px 8px 10px;border:0;border-left:3px solid transparent;background:transparent;color:#eadfca;font:600 15px/1.2 inherit;text-align:left;cursor:pointer;transition:background .12s,border-color .12s}
#hubRail button .ic{width:22px;text-align:center;font-size:18px}#hubRail button .nm{flex:1}
#hubRail button .ky{font:700 11px/1 "SF Mono",Consolas,monospace;color:#c9b48a;background:rgba(231,194,122,.1);border:1px solid rgba(231,194,122,.3);border-bottom-width:2px;border-radius:4px;padding:3px 5px}
#hubRail button:hover{background:rgba(231,194,122,.1)}
#hubRail button.on{background:linear-gradient(90deg,rgba(231,194,122,.26),rgba(231,194,122,.04));border-left-color:#e7c27a;color:#fff}
#hubRail .ft{margin-top:auto;padding:10px 6px 0;font-size:12px;color:#9b8a6c;line-height:1.6;border-top:1px solid rgba(231,194,122,.18)}#hubRail .ft b{color:#e7c27a}
body.hubon #uiroot,body.hubon #r35root,body.hubon #tbPn,body.hubon #modbox,body.hubon #kg,body.hubon #sppan{padding-left:var(--hubW)!important;box-sizing:border-box}
body.hubon #uiroot .modal,body.hubon #r35root .modal,body.hubon #tbPn>*,body.hubon #modbox>*,body.hubon #kg .box{max-width:calc(100vw - var(--hubW) - 18px)!important}
body.hubon #uiroot .m-tabs,body.hubon #r35root .m-tabs{display:none!important}
body.hubon #kgBtn,body.hub #kgBtn{display:none!important}
#hubBtn{position:fixed;right:14px;bottom:46px;z-index:30;display:none;background:rgba(12,8,6,.9);border:1px solid #8a6a3a;color:#f3dfb4;padding:6px 12px;font:700 13px system-ui,sans-serif;cursor:pointer;border-radius:4px}
#hubBtn:hover{border-color:#ffd27a;color:#fff}#hubBtn kbd{margin-left:6px;padding:1px 5px;border:1px solid #8a6a3a;border-bottom-width:2px;border-radius:3px;font-size:11px;color:#ffd98a}
body.hudl.tbon #hubBtn{bottom:calc(var(--tbH) + 10px)!important}
/* 装备与背包：左纸娃娃 + 右物品 */
.hk{display:grid;grid-template-columns:372px minmax(0,1fr);gap:18px;align-items:start}.hk.one{grid-template-columns:1fr}
.hk .g2grid{grid-template-columns:repeat(4,78px);grid-auto-rows:72px;gap:7px}.hk .g2s .i{font-size:26px}.hk .g2s .n{max-width:72px}
.hk-l{position:sticky;top:0}
@media (max-width:1080px){.hk{grid-template-columns:1fr}.hk-l{position:static}}
@media (max-width:860px){:root{--hubW:64px}#hubRail .nm,#hubRail .ky,#hubRail .gh,#hubRail .me,#hubRail .ft,#hubRail .ttl{display:none}#hubRail button{justify-content:center;padding:10px 4px}}`;
    document.head.appendChild(s);
  }
  function build() {
    if (rail) return; addCss();
    rail = document.createElement('div'); rail.id = 'hubRail'; rail.setAttribute('data-noi18n', '');
    ['mousedown', 'pointerdown', 'wheel', 'contextmenu'].forEach(ev => rail.addEventListener(ev, e => e.stopPropagation()));
    rail.addEventListener('click', e => { const b = e.target.closest('[data-hp]'); if (!b) return; go(b.dataset.hp, false); try { SFX.click && SFX.click(); } catch (x) { } });
    document.body.appendChild(rail);
    btn = document.createElement('button'); btn.id = 'hubBtn'; btn.setAttribute('data-noi18n', ''); btn.addEventListener('click', () => toggle()); document.body.appendChild(btn);
  }
  let sig = '';
  function paint(cur) {
    const L = curLang(), g = G0(), S = g && g.S, st = S && g.st ? g.st() : null;
    const key = [L, cur && cur.id, wild(), S ? Math.floor(S.coins) : 0, st ? st.lv + ':' + st.power : ''].join('|'); if (key === sig) return; sig = key;
    let h = `<div class="ttl">${L === 'zh' ? '魂首窟' : L === 'ja' ? '魂首窟' : 'SOULHEAD'}</div>`;
    if (S && st) h += `<div class="me"><span>Lv.<b>${st.lv || 1}</b> · ⚔ <b>${st.power}</b></span><span>🔮 <b>${Math.floor(S.coins).toLocaleString()}</b></span></div>`;
    for (const [gid, gn] of GROUPS) {
      const list = PAGES.filter(p => p.g === gid && avail(p)); if (!list.length) continue;
      h += `<div class="gh">${esc(gn[L])}</div>` + list.map(p => `<button data-hp="${p.id}" class="${cur && cur.id === p.id ? 'on' : ''}"><span class="ic">${p.ic}</span><span class="nm">${esc(p.n[L])}</span>${p.k ? `<span class="ky">${esc(p.k)}</span>` : ''}</button>`).join('');
    }
    h += `<div class="ft"><b>Tab</b> / <b>Esc</b> ${L === 'zh' ? '关闭菜单' : L === 'ja' ? 'メニューを閉じる' : 'close menu'}</div>`;
    rail.innerHTML = h;
  }
  function sync() {
    if (!on()) { if (rail) rail.classList.remove('on'); document.body.classList.remove('hubon', 'hub'); if (btn) btn.style.display = 'none'; return; }
    build(); document.body.classList.add('hub');
    const cur = openPage(); rail.classList.toggle('on', !!cur); document.body.classList.toggle('hubon', !!cur);
    if (cur) { paint(cur); if (cur.id !== 'mods' && cur.id !== 'keys') { last = cur.id; } }
    const g = G0(), show = !cur && g && g.playing && !g.uiOpen && !(window.Worlds && Worlds._W && (Worlds._W.busy || Worlds._W.dead));
    btn.style.display = show ? 'block' : 'none'; if (show) { const L = curLang(); const t = (L === 'zh' ? '☰ 菜单' : L === 'ja' ? '☰ メニュー' : '☰ Menu'); if (btn._t !== L) { btn._t = L; btn.innerHTML = t + '<kbd>Tab</kbd>'; } }
  }
  function closeAll() {
    for (const p of PAGES) { try { if (p.isOpen() && p.close) p.close(); } catch (e) { } }
    try { if (window.UI && UI.open === 'menu') UI.close(true); } catch (e) { }
    try { localStorage.setItem('hub_last', last); } catch (e) { } sync();
  }
  function go(id, toggleIt) {
    if (!on()) return false; const p = PAGES.find(x => x.id === id); if (!p || !avail(p)) return false;
    if (toggleIt && p.isOpen()) { closeAll(); return true; }
    for (const q of PAGES) { if (q === p) continue; try { if (q.isOpen()) { if (q.ui) { if (!p.ui && window.UI) UI.quiet(); } else if (q.close) q.close(); } } catch (e) { } }
    try { p.open(); } catch (e) { console.warn('Hub.go', id, e); }
    last = p.id; try { localStorage.setItem('hub_last', last); } catch (e) { } sig = ''; sync(); return true;
  }
  const toggle = () => { if (openPage()) closeAll(); else go(avail(PAGES.find(p => p.id === last) || PAGES[0]) ? last : 'overview'); };
  // ---- 装备与背包页 ----
  function kitBody() { const g2 = !!(window.Gear2 && Gear2.on && Gear2.on()); return `<div class="hk ${g2 ? '' : 'one'}">${g2 ? '<div class="hk-l" id="hkDoll"></div>' : ''}<div class="hk-r" id="skHost"></div></div>`; }
  let kitObs = null;
  function kitMount() {
    const host = document.getElementById('skHost'), doll = document.getElementById('hkDoll'); if (!host) return;
    if (wild()) Sack.mountWild(host); else Sack.mountCave(host);
    if (!doll || !window.Gear2) return; let lastH = '';
    const draw = () => { if (!doll.isConnected) return; const h = Gear2.dollHTML(); if (h !== lastH) { lastH = h; doll.innerHTML = h; } };
    draw(); doll.addEventListener('click', e => { if (Gear2.dollClick(e)) { draw(); try { host.dispatchEvent(new Event('hubrefresh')); } catch (x) { } } });
    doll.addEventListener('mousemove', e => Gear2.dollMove(e)); doll.addEventListener('mouseleave', () => Gear2.dollLeave());
    if (kitObs) kitObs.disconnect(); let t = 0; kitObs = new MutationObserver(() => { clearTimeout(t); t = setTimeout(draw, 120); }); kitObs.observe(host, { childList: true, subtree: true });
  }
  // ---- Tab / B ----
  const typing = () => { const a = document.activeElement; return !!(a && (/INPUT|TEXTAREA|SELECT/.test(a.tagName) || a.isContentEditable)); };
  addEventListener('keydown', e => {
    if (!on() || e.repeat || e.ctrlKey || e.metaKey || e.altKey || typing()) return; const g = G0(); if (!g || !g.playing) return;
    const cur = openPage();
    if (e.code === 'Tab') { if (cur) { e.preventDefault(); e.stopImmediatePropagation(); closeAll(); return; } if (g.uiOpen) return; if (window.Worlds && Worlds._W && (Worlds._W.busy || Worlds._W.dead)) return; e.preventDefault(); e.stopImmediatePropagation(); toggle(); return; }
    if (e.code === 'KeyB' && wild() && !g.uiOpen && !cur && window.Sack && Sack.on()) { e.preventDefault(); e.stopImmediatePropagation(); go('kit', true); }
  }, true);
  setInterval(sync, 200);
  return { on, go, toggle, closeAll, sync, kitBody, kitMount, PAGES, get open() { return openPage(); } };
})();
