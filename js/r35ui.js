// R35b：R35 系统（精英 C / 猎手 U / 装备 Z）的统一窗口。
//  - 外壳 = 遮罩层 + 游戏原生 .modal（body.ui3a 下自动套用 UI Agent 的金色角框/双层描边/衬线标题/按钮），和出洞狩猎等原窗口同一风格。
//  - 页签 .m-tab 切换；各模块注册 { n, html(), bind?(root), click?(e) }。
//  - 共用卡片样式 .r3-*（使用 ui3a 的 --u-* 配色变量，未加载 ui3a 时有回退色）。
window.R35UI = (() => {
  const TABS = {}, ORDER = [];
  let root = null, box = null, cur = null;
  function css() {
    if (css.done) return; css.done = 1; const s = document.createElement('style'); s.id = 'r35uiCss'; s.textContent = `
#r35root{position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 45%,rgba(24,8,12,.55),rgba(0,0,0,.9));backdrop-filter:blur(5px) saturate(.8) brightness(.8);-webkit-backdrop-filter:blur(5px) saturate(.8) brightness(.8)}
#r35root.on{display:flex;animation:r3fade .25s ease-out}@keyframes r3fade{from{opacity:0}}
#r35root .modal{width:min(1220px,95vw);max-height:90vh;overflow:auto;box-sizing:border-box}
#r35root .m-head{display:flex;align-items:center;flex-wrap:wrap}#r35root .m-tabs{display:flex;gap:2px;margin-left:10px;flex:1}
#r35root .m-close{margin-left:auto}
#r35root .r3-sub{color:var(--u-dim,#a8977c);font-size:13px;margin:-6px 0 14px;line-height:1.6}#r35root .r3-sub b{color:var(--u-gold,#e7c27a)}
/* 进度条（胜利目标） */
.r3-goal{display:grid;grid-template-columns:repeat(4,1fr) 1.6fr;gap:0;margin:0 0 18px;border:1px solid var(--u-line,rgba(231,194,122,.28));background:linear-gradient(180deg,rgba(231,194,122,.06),rgba(0,0,0,.25))}
.r3-goal>div{padding:10px 14px;border-right:1px solid var(--u-line,rgba(231,194,122,.18));position:relative}.r3-goal>div:last-child{border-right:0}
.r3-goal .k{font-size:11.5px;letter-spacing:.2em;color:var(--u-dim,#a8977c)}.r3-goal .v{font-family:var(--u-serif,serif);font-size:24px;font-weight:900;color:var(--u-text,#eadfca);line-height:1.2}.r3-goal .v small{font-size:13px;color:var(--u-dim,#a8977c);font-weight:400}
.r3-goal .ok .v{color:#9fe89f}.r3-goal .bar{height:3px;background:rgba(0,0,0,.6);margin-top:6px}.r3-goal .bar i{display:block;height:100%;background:linear-gradient(90deg,var(--u-gold-lo,#8a6a3a),var(--u-gold,#e7c27a))}
.r3-goal .t{font-size:12.5px;color:var(--u-dim,#a8977c);line-height:1.55}.r3-goal .t b{color:var(--u-gold,#e7c27a);font-family:var(--u-serif,serif);font-size:15px}
/* 人物卡 */
.r3-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px}
.r3-card{--c:#e7c27a;position:relative;padding:14px 16px 14px 16px;background:linear-gradient(135deg,color-mix(in srgb,var(--c) 13%,#16100f) 0%,#110b0d 55%,#0c0809 100%);
  clip-path:polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 38%,transparent);transition:transform .15s,box-shadow .15s}
.r3-card:hover{transform:translateY(-2px);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 75%,transparent),inset 0 0 40px color-mix(in srgb,var(--c) 10%,transparent)}
.r3-card:before{content:'';position:absolute;left:0;top:12px;bottom:0;width:3px;background:linear-gradient(180deg,var(--c),transparent)}
.r3-card.final{grid-column:1/-1;--c:#cfc4ff;background:radial-gradient(ellipse 60% 120% at 12% 0%,rgba(150,130,255,.22),transparent 60%),linear-gradient(135deg,#17122a,#0c0914)}
.r3-card.lock{--c:#6a5a4a;background:linear-gradient(135deg,#14100e,#0c0909)}.r3-card.lock .r3-pt{filter:grayscale(1) brightness(.5)}
.r3-card.dead{opacity:.62}.r3-card.dead .r3-pt{filter:grayscale(.9)}
.r3-top{display:flex;gap:13px;align-items:center}
.r3-pt{flex:none;width:58px;height:58px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;background:radial-gradient(circle at 35% 30%,color-mix(in srgb,var(--c) 45%,#2a1c18),#0a0606 75%);box-shadow:0 0 0 2px color-mix(in srgb,var(--c) 70%,#000),0 0 0 5px rgba(0,0,0,.7),0 0 0 6px color-mix(in srgb,var(--c) 30%,transparent),0 0 18px color-mix(in srgb,var(--c) 35%,transparent)}
.r3-nm{min-width:0;flex:1}.r3-nm .tt{font-size:11.5px;letter-spacing:.22em;color:var(--c);filter:brightness(1.25);font-weight:700}
.r3-nm .n{font-family:var(--u-serif,serif);font-size:20px;font-weight:900;color:#fff;letter-spacing:.08em;line-height:1.25;text-shadow:0 2px 8px #000}.r3-nm .n em{font-style:normal;font-size:12px;color:#ff8a7a;letter-spacing:.1em;margin-left:6px;font-family:inherit}
.r3-tag{flex:none;align-self:flex-start;font-size:11.5px;padding:2px 8px;border:1px solid color-mix(in srgb,var(--c) 55%,transparent);color:var(--c);letter-spacing:.1em;background:rgba(0,0,0,.35)}
.r3-st{display:grid;grid-template-columns:repeat(3,1fr);margin:12px 0 8px;border-top:1px solid rgba(231,194,122,.12);border-bottom:1px solid rgba(231,194,122,.12)}
.r3-st>div{padding:6px 0;text-align:center}.r3-st .k{font-size:11px;color:var(--u-dim,#a8977c);letter-spacing:.15em}.r3-st .v{font-family:var(--u-serif,serif);font-size:19px;font-weight:900;color:var(--u-text,#eadfca)}
.r3-odds{margin:6px 0 4px}.r3-odds .row{display:flex;justify-content:space-between;align-items:baseline;font-size:12.5px;color:var(--u-dim,#a8977c)}.r3-odds .row b{font-family:var(--u-serif,serif);font-size:18px;color:var(--oc,#fff)}
.r3-meter{height:8px;margin-top:4px;background:repeating-linear-gradient(90deg,transparent 0 calc(10% - 1px),rgba(0,0,0,.8) calc(10% - 1px) 10%),rgba(0,0,0,.55);box-shadow:inset 0 0 0 1px rgba(231,194,122,.18);position:relative}
.r3-meter i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#8a1a1a,#d0402a 30%,#e0b040 60%,#6ac060);-webkit-mask:repeating-linear-gradient(90deg,#000 0 calc(10% - 1px),transparent calc(10% - 1px) 10%);mask:repeating-linear-gradient(90deg,#000 0 calc(10% - 1px),transparent calc(10% - 1px) 10%)}
.r3-bio{font-size:13px;line-height:1.7;color:#d6c8b0;margin:8px 0 6px}.r3-lore{font-family:var(--u-serif,serif);font-style:italic;color:#c8b8e0;font-size:13px;line-height:1.7;margin:8px 0 6px;padding-left:10px;border-left:2px solid rgba(200,184,224,.35)}
.r3-meta{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:12px;color:var(--u-dim,#a8977c)}.r3-meta .ok{color:#9fe89f}.r3-meta .no{color:#ffb080}
.r3-aff{display:inline-flex;align-items:center;gap:3px;font-size:11.5px;padding:1px 7px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#e8d8c0}
.r3-act{display:flex;justify-content:flex-end;margin-top:10px}.r3-act button{padding:8px 22px!important;font-size:14px!important}
.r3-foot{margin-top:16px;font-size:12.5px;color:var(--u-dim,#a8977c);line-height:1.7;padding-top:10px;border-top:1px solid rgba(231,194,122,.14)}
#elBan,#h2Ban{background:radial-gradient(ellipse at center,rgba(12,6,9,.92) 25%,rgba(12,6,9,0) 72%)!important;padding:22px 70px!important}
#elBan .a,#h2Ban .a{font-family:var(--u-serif,serif);font-size:32px!important;letter-spacing:.25em!important;text-shadow:0 3px 18px #000,0 0 30px currentColor}
#elBan .b,#h2Ban .b{font-family:var(--u-serif,serif);font-size:16px!important;letter-spacing:.12em;color:#f0e2c8!important}
#elBan .c,#h2Ban .c{font-size:13px!important;color:#d8c8b0!important;max-width:620px;line-height:1.7}
#elBan:before,#h2Ban:before{content:'';display:block;height:1px;margin:0 auto 10px;width:70%;background:linear-gradient(90deg,transparent,var(--u-gold,#e7c27a),transparent)}
#elBan:after,#h2Ban:after{content:'';display:block;height:1px;margin:10px auto 0;width:70%;background:linear-gradient(90deg,transparent,var(--u-gold,#e7c27a),transparent)}
#elHud .n,#h2Bar .n{font-family:var(--u-serif,serif);letter-spacing:.18em!important;font-size:19px!important}
#elHud .hp,#h2Bar .hp{height:11px!important;border-radius:0!important;border:0!important;background:rgba(0,0,0,.7)!important;box-shadow:0 0 0 1px rgba(231,194,122,.45),0 0 0 3px rgba(0,0,0,.6)}
#h2Sense{background:linear-gradient(90deg,#120c08cc,#120c0800);padding:5px 14px 5px 10px;border-left:3px solid #d05070;width:auto!important;max-width:260px}
#h2Sense .b{border-radius:0!important}
@media (max-width:760px){.r3-goal{grid-template-columns:1fr 1fr}.r3-grid{grid-template-columns:1fr}}`;
    document.head.appendChild(s);
  }
  function ensure() {
    css(); if (root) return;
    root = document.createElement('div'); root.id = 'r35root'; root.innerHTML = '<div class="modal big r35m"></div>'; document.body.appendChild(root); box = root.firstChild;
    ['mousedown', 'pointerdown', 'wheel', 'contextmenu'].forEach(ev => root.addEventListener(ev, e => e.stopPropagation()));
    root.addEventListener('mousedown', e => { if (e.target === root) close(); });
    box.addEventListener('click', e => {
      if (e.target.closest('[data-r3x]')) return close();
      const tb = e.target.closest('[data-r3tab]'); if (tb) { show(tb.dataset.r3tab); try { SFX.tick && SFX.tick(); } catch (e2) { } return; }
      const T = TABS[cur]; if (T && T.click) T.click(e, box);
    });
    box.addEventListener('mousemove', e => { const T = TABS[cur]; if (T && T.move) T.move(e, box); });
    box.addEventListener('mouseleave', e => { const T = TABS[cur]; if (T && T.leave) T.leave(e, box); });
  }
  function reg(id, def) { TABS[id] = def; if (!ORDER.includes(id)) ORDER.push(id); }
  function head() {
    const tabs = ORDER.filter(k => !TABS[k].on || TABS[k].on()).map(k => `<button class="m-tab ${k === cur ? 'on' : ''}" data-r3tab="${k}">${TABS[k].n}</button>`).join('');
    const T = TABS[cur];
    return `<div class="m-head"><div class="m-title">${T.title || T.n}</div><div class="m-tabs">${tabs}</div><button class="m-close" data-r3x>✕ 关闭</button></div>`;
  }
  function render() { if (!cur || !box) return; const st = box.scrollTop; box.innerHTML = head() + TABS[cur].html(); if (TABS[cur].bind) TABS[cur].bind(box); box.scrollTop = st; }
  function show(id) { ensure(); const was = cur; cur = id; box.innerHTML = head() + TABS[id].html(); if (TABS[id].bind) TABS[id].bind(box); if (was !== id) box.scrollTop = 0; }
  function open(id) {
    ensure(); if (window.UI && UI.open) try { UI.close(false); } catch (e) { }
    show(id); root.classList.add('on'); try { G.setUI(true); SFX.open && SFX.open(); } catch (e) { }
  }
  function close() {
    if (!root || !root.classList.contains('on')) return; root.classList.remove('on'); const T = TABS[cur]; if (T && T.leave) T.leave(); cur = null;
    try { G.setUI(false); SFX.close && SFX.close(); G.lockPointer && G.lockPointer(); } catch (e) { }
  }
  const isOpen = id => !!(root && root.classList.contains('on') && (!id || cur === id));
  function toggle(id) { if (isOpen(id)) close(); else open(id); }
  // Esc：先于游戏处理
  addEventListener('keydown', e => { if (e.code === 'Escape' && isOpen()) { e.preventDefault(); e.stopImmediatePropagation(); close(); } }, true);
  return { reg, open, close, toggle, isOpen, render, get cur() { return cur; }, get box() { return box; } };
})();
