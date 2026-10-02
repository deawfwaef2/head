// R64 BOSS 战界面重做（MOD boss_ui，默认开）：名牌 + 称号 + 阶段刻度 + 残影血条 + 全屏登场名牌 + 倒下字幕；配色跟随难度。
// 不动 worlds.js 的逻辑：监听 #wBoss 显示/隐藏，读 Worlds._W.boss（B = 霸主数据，foe = 实体）。
window.BossUI = (() => {
  const on = () => (!window.Mods || !Mods.on || Mods.on('boss_ui') !== false) && document.body.classList.contains('u63');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let css0 = 0, bar = null, shown = false, trail = 100, lastHp = 100, card = null, hdr = null, nums = null, lastB = null;
  function addCss() {
    if (css0) return; css0 = 1; const s = document.createElement('style'); s.id = 'bxCss'; s.textContent = `
body.u63.bossui #wBoss{top:54px!important;width:min(780px,86vw)!important;text-align:center;font-family:var(--u-serif,"Noto Serif SC","Songti SC",serif)!important;text-shadow:none!important;--bc:var(--k-gold,#e7c27a)}
body.u63.bossui #wBoss .bn{display:none!important}
body.u63.bossui #wBoss .bx-h{display:flex;flex-direction:column;align-items:center;gap:2px;margin-bottom:6px;filter:drop-shadow(0 3px 10px rgba(0,0,0,.9))}
body.u63.bossui #wBoss .bx-t{font-size:12px;letter-spacing:.7em;text-indent:.7em;color:color-mix(in srgb,var(--bc) 70%,#fff);font-weight:700}
body.u63.bossui #wBoss .bx-n{font-size:clamp(26px,3.4vw,40px);font-weight:900;letter-spacing:.34em;text-indent:.34em;line-height:1.15;background:linear-gradient(180deg,#fff8e8,var(--bc) 58%,color-mix(in srgb,var(--bc) 55%,#000));-webkit-background-clip:text;background-clip:text;color:transparent}
body.u63.bossui #wBoss .bx-s{font-size:12.5px;letter-spacing:.22em;color:#bfae92;font-weight:600;max-width:90%;line-height:1.7}
body.u63.bossui #wBoss .bar{position:relative;height:16px!important;margin:6px auto 0!important;border:0!important;border-radius:0!important;overflow:visible!important;background:linear-gradient(180deg,rgba(0,0,0,.85),rgba(18,8,10,.85))!important;box-shadow:0 0 0 1px color-mix(in srgb,var(--bc) 55%,transparent),0 0 0 4px rgba(4,2,5,.86),0 0 0 5px color-mix(in srgb,var(--bc) 25%,transparent),0 10px 36px rgba(0,0,0,.7)}
body.u63.bossui #wBoss .bar::before,body.u63.bossui #wBoss .bar::after{content:"";position:absolute;top:50%;width:14px;height:14px;margin-top:-7px;transform:rotate(45deg);background:var(--bc);box-shadow:0 0 12px var(--bc);z-index:3}
body.u63.bossui #wBoss .bar::before{left:-17px}body.u63.bossui #wBoss .bar::after{right:-17px}
body.u63.bossui #wBoss .bar i{position:absolute;left:0;top:0;bottom:0;z-index:2;height:auto!important;border-radius:0!important;background:linear-gradient(180deg,color-mix(in srgb,var(--bc) 70%,#fff) 0,var(--bc) 38%,color-mix(in srgb,var(--bc) 45%,#300) 100%)!important;box-shadow:0 0 14px color-mix(in srgb,var(--bc) 60%,transparent);transition:width .12s linear!important}
body.u63.bossui #wBoss .bar .tl{position:absolute;left:0;top:0;bottom:0;z-index:1;background:linear-gradient(180deg,#fff,#caa070);opacity:.8}
body.u63.bossui #wBoss .bar .nt{position:absolute;top:-3px;bottom:-3px;width:2px;z-index:4;background:rgba(255,236,190,.65);box-shadow:0 0 6px rgba(0,0,0,.9)}
body.u63.bossui #wBoss.low .bar i{animation:bxLow .9s ease-in-out infinite}
@keyframes bxLow{50%{filter:brightness(1.55) saturate(1.3);box-shadow:0 0 26px var(--bc)}}
body.u63.bossui #wBoss .bx-nm{margin-top:6px;font:700 12px/1 system-ui,sans-serif;letter-spacing:.18em;color:#a8977c;display:flex;justify-content:space-between;padding:0 4px}
body.u63.bossui #wBoss .bx-nm b{color:#fff0c4}
#bxCard{position:fixed;inset:0;z-index:132;pointer-events:none;display:none;align-items:center;justify-content:center;flex-direction:column;font-family:var(--u-serif,"Noto Serif SC","Songti SC",serif);text-align:center}
#bxCard.on{display:flex}
#bxCard .bg{position:absolute;inset:0;background:radial-gradient(ellipse 70% 38% at 50% 50%,rgba(0,0,0,.82),transparent 75%);opacity:0;animation:bxBg 3.8s ease both}
#bxCard .ln{position:relative;width:min(760px,70vw);height:1px;background:linear-gradient(90deg,transparent,var(--bc),transparent);transform:scaleX(0);animation:bxLn 3.8s ease both}
#bxCard .a{position:relative;font-size:clamp(13px,1.6vw,18px);letter-spacing:.9em;text-indent:.9em;color:color-mix(in srgb,var(--bc) 70%,#fff);margin:16px 0 4px;opacity:0;animation:bxA 3.8s ease both}
#bxCard .b{position:relative;font-size:clamp(46px,8vw,104px);font-weight:900;letter-spacing:.3em;text-indent:.3em;line-height:1.1;background:linear-gradient(180deg,#fff8e8,var(--bc) 55%,color-mix(in srgb,var(--bc) 50%,#000));-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 4px 16px rgba(0,0,0,.95)) drop-shadow(0 0 40px color-mix(in srgb,var(--bc) 40%,transparent));opacity:0;animation:bxB 3.8s cubic-bezier(.16,.9,.2,1) both}
#bxCard .c{position:relative;max-width:min(820px,84vw);margin-top:14px;font-size:clamp(14px,1.7vw,19px);letter-spacing:.2em;line-height:1.9;color:#e6d8bc;opacity:0;animation:bxA 3.8s .25s ease both}
#bxCard.win .b{animation-duration:4.6s}#bxCard.win .bg,#bxCard.win .ln,#bxCard.win .a,#bxCard.win .c{animation-duration:4.6s}
@keyframes bxBg{0%{opacity:0}12%,80%{opacity:1}100%{opacity:0}}
@keyframes bxLn{0%{transform:scaleX(0)}18%,78%{transform:scaleX(1)}100%{transform:scaleX(1);opacity:0}}
@keyframes bxA{0%{opacity:0;transform:translateY(8px)}16%,78%{opacity:1;transform:none}100%{opacity:0}}
@keyframes bxB{0%{opacity:0;transform:scale(1.18);letter-spacing:.6em}16%{opacity:1;transform:scale(1);letter-spacing:.3em}80%{opacity:1}100%{opacity:0;transform:scale(.98)}}`;
    document.head.appendChild(s);
  }
  function W() { return window.Worlds && Worlds.active && Worlds._W; }
  function col() { const B = lastB; return (B && B.col) || (window.Diff && Diff.cur().col) || '#e7c27a'; }
  function ensure() {
    const el = document.getElementById('wBoss'); if (!el) return null; if (el.__bx) return el;
    addCss(); el.__bx = 1; const b = el.querySelector('.bar');
    hdr = document.createElement('div'); hdr.className = 'bx-h'; hdr.innerHTML = '<div class="bx-t"></div><div class="bx-n"></div><div class="bx-s"></div>'; el.insertBefore(hdr, el.firstChild);
    const tl = document.createElement('div'); tl.className = 'tl'; b.insertBefore(tl, b.firstChild); for (const p of [33.3, 66.6]) { const n = document.createElement('div'); n.className = 'nt'; n.style.left = p + '%'; b.appendChild(n); }
    nums = document.createElement('div'); nums.className = 'bx-nm'; nums.innerHTML = '<span></span><b></b>'; el.appendChild(nums); bar = { el, bar: b, i: b.querySelector('i'), tl, t: hdr.querySelector('.bx-t'), n: hdr.querySelector('.bx-n'), s: hdr.querySelector('.bx-s'), l: nums.firstChild, r: nums.lastChild };
    return el;
  }
  function paintHdr() {
    const w = W(), B = w && w.boss && w.boss.B; if (!B || !bar) return; lastB = B; const c = B.col || (window.Diff && Diff.cur().col) || '#e7c27a'; bar.el.style.setProperty('--bc', c);
    bar.t.textContent = B.title || '霸 主'; bar.n.textContent = B.n || '';
    const dv = window.Diff ? Diff.voice('boss') : ''; bar.s.textContent = [B.sub || B.tag || '', dv].filter(Boolean).join('　·　');
    const dn = window.Diff ? Diff.cur() : null; bar.l.textContent = dn ? `${dn.ic} ${dn.n}` : ''; trail = 100; lastHp = 100; bar.tl.style.width = '100%';
  }
  function showCard(a, b, c, win) {
    addCss(); if (!card) { card = document.createElement('div'); card.id = 'bxCard'; card.setAttribute('data-noi18n', ''); document.body.appendChild(card); }
    card.style.setProperty('--bc', col()); card.className = ''; void card.offsetWidth; card.innerHTML = `<div class="bg"></div><div class="ln"></div><div class="a">${esc(a)}</div><div class="b">${esc(b)}</div><div class="ln" style="margin-top:12px"></div><div class="c">${esc(c)}</div>`; card.className = 'on' + (win ? ' win' : '');
    clearTimeout(card._t); card._t = setTimeout(() => { card.className = ''; }, win ? 4700 : 3900);
  }
  function tick() {
    if (!on()) { document.body.classList.remove('bossui'); return; } document.body.classList.add('bossui');
    const el = ensure(); if (!el) return; const vis = el.style.display === 'block', w = W(), bo = w && w.boss, fo = bo && (bo.foe || null);
    if (vis && !shown) { shown = true; paintHdr(); const B = bo && bo.B; if (B) showCard(B.title || '霸 主', B.n || '', window.Diff ? Diff.voice('boss') : (B.intro || ''), false); try { window.SFX && SFX.roar && SFX.roar(0.9); } catch (e) { } }
    else if (!vis && shown) { shown = false; const B = lastB; if (lastHp <= 2 && B) showCard('首 级 令', `${B.title || ''}　倒下`, window.Diff ? Diff.voice('fall') : '砍下她的头，带回去。', true); }
    if (!vis || !bar) return;
    let hp = lastHp; if (fo && fo.maxHp) hp = Math.max(0, fo.hp / fo.maxHp * 100); else if (bo && typeof bo.hp === 'number') hp = bo.hp; else { const wv = parseFloat(bar.i.style.width); if (!isNaN(wv)) hp = wv; }
    lastHp = hp; bar.i.style.width = hp + '%'; if (trail < hp) trail = hp; else trail = Math.max(hp, trail - 0.9); bar.tl.style.width = trail + '%'; bar.el.classList.toggle('low', hp < 33.4 && hp > 0);
    bar.r.textContent = fo && fo.maxHp ? `${Math.max(0, Math.ceil(fo.hp))} / ${Math.round(fo.maxHp)}` : Math.round(hp) + '%';
  }
  setInterval(() => { try { tick(); } catch (e) { } }, 90);
  return { on, tick, showCard };
})();
