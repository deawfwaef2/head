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
    { id: 'diff', g: 'sys', ic: '⚔', k: '', n: { zh: '难度', ja: '難易度', en: 'Difficulty' }, isOpen: () => !!(window.Diff && Diff.isOpen() && window.G && G.playing), open: () => Diff.open(), close: () => Diff.close(), ok: () => !!(window.Diff && Diff.on()) },
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
body.hubon #uiroot,body.hubon #r35root,body.hubon #tbPn,body.hubon #modbox,body.hubon #kg,body.hubon #sppan,body.hubon #sanPn{padding-left:var(--hubW)!important;box-sizing:border-box}
body.hubwheel{--hubW:0px}body.hubwheel #hubRail{display:none!important}
body.hubon #uiroot .modal,body.hubon #r35root .modal,body.hubon #tbPn>*,body.hubon #modbox>*,body.hubon #kg .box{max-width:calc(100vw - var(--hubW) - 18px)!important}
body.hubon #uiroot .m-tabs,body.hubon #r35root .m-tabs{display:none!important}
body.hubon #kgBtn,body.hub #kgBtn{display:none!important}
body.hubon:not(.hubpg-talents) #tbBar,body.hubon:not(.hubpg-talents) #tbCol,body.hubon #tbCast,body.hubon #wStat,body.hubon #wHint,body.hubon #wRun,body.hubon #hud{visibility:hidden!important}
#hubBtn{position:fixed;right:14px;bottom:46px;z-index:30;display:none;background:rgba(12,8,6,.9);border:1px solid #8a6a3a;color:#f3dfb4;padding:6px 12px;font:700 13px system-ui,sans-serif;cursor:pointer;border-radius:4px}
#hubBtn:hover{border-color:#ffd27a;color:#fff}#hubBtn kbd{margin-left:6px;padding:1px 5px;border:1px solid #8a6a3a;border-bottom-width:2px;border-radius:3px;font-size:11px;color:#ffd98a}
body.hudl.tbon #hubBtn{bottom:calc(var(--tbH) + 10px)!important}
/* 装备与背包：左纸娃娃 + 右物品 */
.hk{display:grid;grid-template-columns:330px minmax(0,1fr);gap:18px;align-items:start}.hk.one{grid-template-columns:1fr}
.hk .g2grid{grid-template-columns:repeat(4,68px);grid-auto-rows:64px;gap:6px}.hk .g2doll{padding:10px}.hk .g2s .i{font-size:22px}.hk .g2s .n{max-width:64px;font-size:10.5px}.hk .g2body .o{font-size:72px}.hk-r{min-width:0;overflow-x:auto}
.hk-l{position:sticky;top:0}
@media (max-width:1080px){.hk{grid-template-columns:1fr}.hk-l{position:static}}
@media (max-width:860px){:root{--hubW:64px}#hubRail .nm,#hubRail .ky,#hubRail .gh,#hubRail .me,#hubRail .ft,#hubRail .ttl{display:none}#hubRail button{justify-content:center;padding:10px 4px}}`;
    document.head.appendChild(s);
  }
  // ---- R61 转盘模式下的“外框”：顶部页面标题（分组 ❖ 页名 + 上一页 / 下一页）、底部键位提示、面板顶底纹章和扫光 ----
  let css2 = 0, head = null, dock = null, headSig = '';
  const CREST = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='520' height='12' viewBox='0 0 520 12'%3E%3Cdefs%3E%3ClinearGradient id='a'%3E%3Cstop offset='0' stop-color='%23e7c27a' stop-opacity='0'/%3E%3Cstop offset='1' stop-color='%23e7c27a'/%3E%3C/linearGradient%3E%3ClinearGradient id='b'%3E%3Cstop offset='0' stop-color='%23e7c27a'/%3E%3Cstop offset='1' stop-color='%23e7c27a' stop-opacity='0'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect x='0' y='5.5' width='238' height='1' fill='url(%23a)'/%3E%3Crect x='282' y='5.5' width='238' height='1' fill='url(%23b)'/%3E%3Cpath d='M260 0l7 6-7 6-7-6z' fill='%23e7c27a'/%3E%3Cpath d='M244 6l-6-3.500v7zM276 6l6-3.500v7z' fill='%23e7c27a' opacity='.65'/%3E%3C/svg%3E\")";
  function addCss2() {
    if (css2) return; css2 = 1; const s = document.createElement('style'); s.id = 'hubCss2'; s.textContent = `
#hubHead{position:fixed;left:50%;top:max(10px,1.4vh);transform:translateX(-50%);width:min(860px,94vw);z-index:125;display:none;align-items:center;justify-content:space-between;pointer-events:none;font-family:var(--u-serif,"Noto Serif SC","Songti SC",serif);user-select:none}
#hubHead.on{display:flex;animation:hhIn .45s cubic-bezier(.16,.9,.2,1) both}@keyframes hhIn{from{opacity:0;transform:translateX(-50%) translateY(-14px)}}
#hubHead .hh-c{flex:1;text-align:center;padding-top:2px}
#hubHead .hh-g{display:flex;align-items:center;justify-content:center;gap:14px;font-size:12px;letter-spacing:.5em;text-indent:.5em;color:rgba(231,194,122,.72)}
#hubHead .hh-g s{width:clamp(30px,9vw,90px);height:1px;background:linear-gradient(90deg,transparent,rgba(231,194,122,.7))}#hubHead .hh-g s:last-child{transform:scaleX(-1)}
#hubHead .hh-t{display:inline-flex;align-items:center;gap:14px;font-size:clamp(22px,2.6vw,32px);font-weight:900;letter-spacing:.3em;text-indent:.3em;line-height:1.25;background:linear-gradient(180deg,#fff8e2,#f0d28e 52%,#b98a45);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 2px 8px rgba(0,0,0,.9)) drop-shadow(0 0 16px rgba(231,194,122,.25))}
#hubHead .hh-t .hh-i{font-size:.9em;-webkit-text-fill-color:initial;filter:drop-shadow(0 0 10px rgba(231,194,122,.55))}
#hubHead .hh-c::after{content:"";display:block;width:min(520px,72%);height:12px;margin:2px auto 0;background:${CREST} center/100% 100% no-repeat}
#hubHead .hh-a{pointer-events:auto;display:flex;align-items:center;gap:10px;min-width:120px;padding:8px 10px;border:0;background:none;color:#a8977c;font:700 13px/1 inherit;letter-spacing:.16em;cursor:pointer;transition:color .15s,transform .25s cubic-bezier(.16,.9,.2,1)}
#hubHead .hh-a.r{justify-content:flex-end}#hubHead .hh-a i{font-style:normal;font-size:38px;line-height:.8;color:#e7c27a;text-shadow:0 0 12px rgba(231,194,122,.5)}
#hubHead .hh-a:hover{color:#fff0c4}#hubHead .hh-a.l:hover{transform:translateX(-4px)}#hubHead .hh-a.r:hover{transform:translateX(4px)}
@media (max-width:760px){#hubHead .hh-a span{display:none}#hubHead .hh-a{min-width:0}}
#hubDock{position:fixed;left:50%;bottom:max(12px,1.6vh);transform:translateX(-50%);z-index:125;display:none;gap:30px;padding:7px 34px 8px;pointer-events:none;font:600 12.5px/1 var(--u-serif,serif);letter-spacing:.18em;color:#a8977c;background:linear-gradient(90deg,transparent,rgba(6,3,6,.82) 18%,rgba(6,3,6,.82) 82%,transparent)}
#hubDock.on{display:flex;animation:hhUp .45s cubic-bezier(.16,.9,.2,1) both}@keyframes hhUp{from{opacity:0;transform:translateX(-50%) translateY(12px)}}
#hubDock::before,#hubDock::after{content:"";position:absolute;left:8%;right:8%;height:1px;background:linear-gradient(90deg,transparent,rgba(231,194,122,.55),transparent)}#hubDock::before{top:0}#hubDock::after{bottom:0;opacity:.4}
#hubDock span{display:inline-flex;align-items:center;gap:8px}#hubDock kbd{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:22px;padding:0 7px;font:700 11px/1 var(--u-serif,serif);letter-spacing:0;color:#fff0c4;background:linear-gradient(180deg,#3a2b30,#1a1116);border:1px solid rgba(231,194,122,.5);border-bottom-width:2px;border-radius:4px;box-shadow:0 2px 0 rgba(0,0,0,.6),inset 0 1px 0 rgba(255,240,196,.2)}
body.hubwheel.hubon #hint,body.hubwheel.hubon #hubBtn,body.hubwheel.hubon #nemChip,body.hubwheel.hubon #spchip,body.hubwheel.hubon #sanChip,body.hubwheel.hubon #relockHint{display:none!important}\n#hubHead::before{content:\"\";position:absolute;left:-6%;right:-6%;top:-14px;bottom:-26px;z-index:-1;background:radial-gradient(ellipse 60% 70% at 50% 40%,rgba(0,0,0,.7),transparent 75%);pointer-events:none}
/* 面板顶底纹章 + 入场扫光（只在转盘模式） */
body.hubwheel .modal::before{content:"";position:absolute;left:50%;top:-6px;width:300px;height:12px;transform:translateX(-50%);background:${CREST} center/100% 100% no-repeat;pointer-events:none;z-index:3;filter:drop-shadow(0 0 6px rgba(231,194,122,.5))}
body.hubwheel .modal::after{content:"";position:absolute;left:50%;bottom:-6px;width:300px;height:12px;transform:translateX(-50%) scaleY(-1);background:${CREST} center/100% 100% no-repeat;pointer-events:none;z-index:3;opacity:.7}
body.hubwheel #uiroot.on .modal{animation:u-modal-in .5s var(--u-ease),hhShine 1.3s .1s ease-out 1}
@keyframes hhShine{0%{box-shadow:0 0 0 1px rgba(231,194,122,.26),0 0 0 7px rgba(6,4,7,.82),0 0 0 8px rgba(231,194,122,.14),0 40px 140px rgba(0,0,0,.92),inset 0 0 90px rgba(120,16,26,.10)}35%{box-shadow:0 0 0 1px rgba(255,226,160,.9),0 0 0 7px rgba(6,4,7,.82),0 0 0 8px rgba(231,194,122,.5),0 0 90px rgba(231,194,122,.35),0 40px 140px rgba(0,0,0,.92),inset 0 0 90px rgba(120,16,26,.10)}}`;
    document.head.appendChild(s);
  }
  const order = () => { const o = []; for (const [gid] of GROUPS) for (const p of PAGES) if (p.g === gid && avail(p)) o.push(p); return o; };
  function step(d) { const list = order(), cur = openPage(); if (!cur || !list.length) return; const i = Math.max(0, list.findIndex(p => p.id === cur.id)); go(list[(i + d + list.length) % list.length].id, false); try { SFX.click && SFX.click(); } catch (e) { } }
  function chrome(cur) {
    const wl = !!(window.Wheel && Wheel.enabled()); if (!head) { addCss2(); head = document.createElement('div'); head.id = 'hubHead'; dock = document.createElement('div'); dock.id = 'hubDock'; head.setAttribute('data-noi18n', ''); dock.setAttribute('data-noi18n', '');
      ['mousedown', 'pointerdown', 'wheel', 'contextmenu'].forEach(ev => head.addEventListener(ev, e => e.stopPropagation())); head.addEventListener('click', e => { const b = e.target.closest('[data-hh]'); if (b) step(+b.dataset.hh); }); document.body.append(head, dock); }
    const show = wl && !!cur; head.classList.toggle('on', show); dock.classList.toggle('on', show); if (!show) { headSig = ''; return; }
    const L = curLang(), list = order(), i = Math.max(0, list.findIndex(p => p.id === cur.id)), pv = list[(i - 1 + list.length) % list.length], nx = list[(i + 1) % list.length], gn = (GROUPS.find(g => g[0] === cur.g) || [0, {}])[1], sig = [cur.id, L, pv.id, nx.id].join('|'); if (sig === headSig) return; headSig = sig;
    head.innerHTML = `<button class="hh-a l" data-hh="-1"><i>‹</i><span>${esc(pv.n[L])}</span></button><div class="hh-c"><div class="hh-g"><s></s>${esc(gn[L] || '')}<s></s></div><div class="hh-t"><span class="hh-i">${cur.ic}</span>${esc(cur.n[L])}</div></div><button class="hh-a r" data-hh="1"><span>${esc(nx.n[L])}</span><i>›</i></button>`;
    dock.innerHTML = L === 'zh' ? '<span><kbd>Tab</kbd>按住 转盘</span><span><kbd>[</kbd><kbd>]</kbd>切页</span><span><kbd>Esc</kbd>返回</span>' : L === 'ja' ? '<span><kbd>Tab</kbd>長押し ホイール</span><span><kbd>[</kbd><kbd>]</kbd>切替</span><span><kbd>Esc</kbd>戻る</span>' : '<span><kbd>Tab</kbd>Hold: wheel</span><span><kbd>[</kbd><kbd>]</kbd>Switch</span><span><kbd>Esc</kbd>Back</span>';
  }
  function build() {
    if (rail) return; addCss();
    rail = document.createElement('div'); rail.id = 'hubRail'; rail.setAttribute('data-noi18n', '');
    ['mousedown', 'pointerdown', 'wheel', 'contextmenu'].forEach(ev => rail.addEventListener(ev, e => e.stopPropagation()));
    rail.addEventListener('click', e => { const b = e.target.closest('[data-hp]'); if (!b) return; go(b.dataset.hp, false); try { SFX.click && SFX.click(); } catch (x) { } });
    document.body.appendChild(rail);
    btn = document.createElement('button'); btn.id = 'hubBtn'; btn.setAttribute('data-noi18n', ''); btn.addEventListener('click', () => toggle()); document.body.appendChild(btn);
  }
  let sig = '', prevCid = null;
  // 切页/关页时清掉遗留的悬浮提示（物品信息 / 技能信息）：鼠标停在格子上时面板被关，没有 mouseleave 就会一直留在屏幕上
  function purge() { for (const id of ['skTip', 'g2Tip', 'tbTip']) { const e = document.getElementById(id); if (e && e.style.display !== 'none') e.style.display = 'none'; } try { window.Gear2 && Gear2.dollLeave && Gear2.dollLeave(); } catch (e) { } }
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
    build(); document.body.classList.add('hub'); document.body.classList.toggle('hubwheel', !!(window.Wheel && Wheel.enabled()));
    const cur = openPage(); { const cid = cur ? cur.id : null; if (cid !== prevCid) { prevCid = cid; purge(); } } rail.classList.toggle('on', !!cur); document.body.classList.toggle('hubon', !!cur); for (const c of [...document.body.classList]) if (c.startsWith('hubpg-') && (!cur || c !== 'hubpg-' + cur.id)) document.body.classList.remove(c); if (cur) document.body.classList.add('hubpg-' + cur.id);
    if (cur) { paint(cur); if (cur.id !== 'mods' && cur.id !== 'keys') { last = cur.id; } }
    chrome(cur);
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
  const L3 = (z, j, e) => { const l = (window.I18N && I18N.lang) || 'zh'; return l === 'ja' ? j : l === 'en' ? e : z; };
  function kitBody() { const g2 = !!(window.Gear2 && Gear2.on && Gear2.on()); return `<div class="hk ${g2 ? '' : 'one'}">${g2 ? '<div class="hk-l" id="hkDoll"></div>' : ''}<div class="hk-r" id="skHost"></div></div><div class="hk-leg"><span><kbd>LMB</kbd>${L3('取出 / 装备 / 使用', '取る・装備・使う', 'Take / equip / use')}</span><span><kbd>⠿</kbd>${L3('拖动整理', 'ドラッグで整理', 'Drag to arrange')}</span><span><kbd>R</kbd>${L3('旋转', '回転', 'Rotate')}</span><span><kbd>H</kbd>${L3('喝腰带药', 'ベルトの薬', 'Belt potion')}</span><span><kbd>Tab</kbd>${L3('关闭', '閉じる', 'Close')}</span></div>`; }
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
  // ---- Tab：轻点 = 开 / 关菜单；按住超过 190ms = 转盘（js/wheel.js），松开时进入对准的页面 ----
  let tabAt = 0, tabCur = null, tabTimer = 0, tabWheel = false;
  addEventListener('keydown', e => {
    if (e.code !== 'Tab' || !on() || !(window.Wheel && Wheel.enabled()) || e.ctrlKey || e.metaKey || e.altKey || typing()) return; const g = G0(); if (!g || !g.playing) return;
    const cur = openPage(); if (!cur && (g.uiOpen || (window.Worlds && Worlds._W && (Worlds._W.busy || Worlds._W.dead)))) return;
    e.preventDefault(); e.stopImmediatePropagation(); if (e.repeat || tabAt) return; tabAt = performance.now(); tabCur = cur; tabWheel = false; clearTimeout(tabTimer);
    tabTimer = setTimeout(() => { if (tabAt) { tabWheel = true; try { Wheel.open(cur); } catch (x) { console.warn('Wheel', x); tabWheel = false; } } }, 190);
  }, true);
  addEventListener('keyup', e => {
    if (e.code !== 'Tab' || !tabAt) return; e.preventDefault(); e.stopImmediatePropagation(); tabAt = 0; clearTimeout(tabTimer);
    if (tabWheel) { tabWheel = false; try { Wheel.commit(); } catch (x) { } return; }
    if (tabCur) closeAll(); else toggle();
  }, true);
  addEventListener('blur', () => { if (tabWheel) { tabWheel = false; tabAt = 0; try { Wheel.cancel(); } catch (x) { } } });
  // ---- Tab / B ----
  const typing = () => { const a = document.activeElement; return !!(a && (/INPUT|TEXTAREA|SELECT/.test(a.tagName) || a.isContentEditable)); };
  addEventListener('keydown', e => {
    if (!on() || e.repeat || e.ctrlKey || e.metaKey || e.altKey || typing()) return; const g = G0(); if (!g || !g.playing) return;
    const cur = openPage();
    if (cur && (e.code === 'BracketLeft' || e.code === 'BracketRight') && window.Wheel && Wheel.enabled()) { e.preventDefault(); e.stopImmediatePropagation(); step(e.code === 'BracketLeft' ? -1 : 1); return; }
    if (e.code === 'Tab') { if (cur) { e.preventDefault(); e.stopImmediatePropagation(); closeAll(); return; } if (g.uiOpen) return; if (window.Worlds && Worlds._W && (Worlds._W.busy || Worlds._W.dead)) return; e.preventDefault(); e.stopImmediatePropagation(); toggle(); return; }
    if (e.code === 'KeyB' && wild() && !g.uiOpen && !cur && window.Sack && Sack.on()) { e.preventDefault(); e.stopImmediatePropagation(); go('kit', true); }
  }, true);
  setInterval(sync, 200);
  return { on, go, toggle, closeAll, sync, kitBody, kitMount, PAGES, GROUPS, avail, curLang, get last() { return last; }, get open() { return openPage(); } };
})();
