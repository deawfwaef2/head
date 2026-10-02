// R61 大师级转盘菜单（用户：“按住 TAB 不是左侧一个列表，而是一个转盘，然后你可选择你要进哪个 UI 页面……3A 游戏那种神作 UI 感”）。MOD `ui_wheel`（默认开）。
// 轻点 Tab = 开 / 关菜单（和以前一样，改成松手时触发）；按住 Tab 超过 190ms = 转盘：鼠标往哪个方向推，就选中那个方向的页面，松开 Tab 进入。
//   布局：内圈是 5 个分组弧（角色 / 挑战 / 收藏 / 世界 / 系统），外圈每个页面占一个扇区，扇区角度和所属分组对齐；中心圆盘显示选中页面的图标 / 名称 / 说明 / 热键。
//   鼠标是“虚拟光标”：用 movementX/Y 累加（指针锁定时也能用），打开期间 window.__wheelOpen=true，game.js 据此冻结视角和攻击。点击左键也能确认，Esc 取消。
window.Wheel = (() => {
  'use strict';
  const modOn = () => !window.Mods || !Mods.on || Mods.on('ui_wheel') !== false;
  const enabled = () => modOn() && !!window.Hub && Hub.on();
  const L = () => (window.Hub && Hub.curLang()) || 'zh';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const DESC = {
    overview: ['战力、六维属性、武技熟练度与狩猎统计', 'Power, attributes, weapon mastery and hunt stats'],
    kit: ['装备纸娃娃、背包、铁匠、工坊与典籍', 'Paper doll, bag, smith, workshop and tomes'],
    talents: ['天赋树加点与技能快捷栏', 'Talent tree and skill bar'],
    san: ['SAN 强化、武器附魔、本局流派与祝福', 'SAN buffs, enchants, run style and boons'],
    elite: ['精英挑战与首领悬赏', 'Elite trials and boss bounties'],
    hunt: ['猎手档案与宿敌', 'Hunter files and nemeses'],
    heads: ['首级收藏与魂库', 'Head collection and vault'],
    codex: ['图鉴与展厅评级', 'Codex and exhibition hall'],
    spirits: ['先祖神灵与灵契', 'Ancestral spirits and pacts'],
    logs: ['狩猎日志与战绩', 'Hunt log and records'],
    build: ['建造洞窟：建筑、训练与摆件', 'Build your cave'],
    keys: ['全部按键一览', 'Key guide'],
    mods: ['MOD 开关与画质设置', 'Mods and graphics']
  };
  const rad = d => d * Math.PI / 180, f1 = n => n.toFixed(1);
  const pt = (r, a) => [500 + r * Math.sin(rad(a)), 500 - r * Math.cos(rad(a))];
  const sector = (r0, r1, a0, a1) => { const A = pt(r1, a0), B = pt(r1, a1), C = pt(r0, a1), D = pt(r0, a0), big = a1 - a0 > 180 ? 1 : 0; return `M${f1(A[0])} ${f1(A[1])}A${r1} ${r1} 0 ${big} 1 ${f1(B[0])} ${f1(B[1])}L${f1(C[0])} ${f1(C[1])}A${r0} ${r0} 0 ${big} 0 ${f1(D[0])} ${f1(D[1])}Z`; };
  const R_CORE = 176, R_G0 = 192, R_G1 = 254, R_P0 = 268, R_P1 = 436, R_DEAD = 112;
  const GC = { role: '#e7c27a', fight: '#e8574e', coll: '#b992ff', world: '#6fd0a4', sys: '#8fb8dc' };
  const arcPath = (r, a0, a1) => { const A = pt(r, a0), B = pt(r, a1); return `M${f1(A[0])} ${f1(A[1])}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${f1(B[0])} ${f1(B[1])}`; };
  let css0 = false, el = null, S = null, raf = 0;

  function addCss() {
    if (css0) return; css0 = true; const s = document.createElement('style'); s.id = 'whlCss'; s.textContent = `
#whl{position:fixed;inset:0;z-index:140;pointer-events:none;display:none;--sz:min(94vh,94vw,1040px);font-family:var(--u-serif,"Noto Serif SC","Songti SC",serif);color:#eadfca;user-select:none}
#whl.on{display:block}
#whl .bg{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,rgba(14,6,8,.55) 0,rgba(4,2,4,.82) 55%,rgba(0,0,0,.94) 100%);backdrop-filter:blur(9px) saturate(.7) brightness(.62);-webkit-backdrop-filter:blur(9px) saturate(.7) brightness(.62);animation:whl-fade .22s ease-out both}
#whl .bg::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.018) 0 1px,transparent 1px 3px);mix-blend-mode:overlay}
#whl .stage{position:absolute;left:50%;top:50%;width:var(--sz);height:var(--sz);transform:translate(-50%,-50%);animation:whl-in .26s cubic-bezier(.16,.9,.2,1) both}
#whl.out .stage{animation:whl-out .14s ease-in both}#whl.out .bg{animation:whl-fadeout .14s ease-in both}
@keyframes whl-in{from{opacity:0;transform:translate(-50%,-50%) scale(.82) rotate(-7deg)}}@keyframes whl-out{to{opacity:0;transform:translate(-50%,-50%) scale(1.06)}}
@keyframes whl-fade{from{opacity:0}}@keyframes whl-fadeout{to{opacity:0}}
#whl svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
#whl .spin{transform-box:view-box;transform-origin:50% 50%;animation:whl-spin 90s linear infinite}#whl .spin2{transform-box:view-box;transform-origin:50% 50%;animation:whl-spin 140s linear infinite reverse}
@keyframes whl-spin{to{transform:rotate(360deg)}}
#whl .pg{fill:rgba(18,12,16,.86);stroke:color-mix(in srgb,var(--gc,#e7c27a) 34%,transparent);stroke-width:1.2;transition:fill .12s,stroke .12s,filter .12s}
#whl .pg.cur{stroke:color-mix(in srgb,var(--gc,#e7c27a) 70%,transparent)}
#whl .pg.hot{fill:color-mix(in srgb,var(--gc,#e7c27a) 48%,#150b0e);stroke:color-mix(in srgb,var(--gc,#e7c27a) 60%,#fff);stroke-width:2.6;filter:drop-shadow(0 0 22px color-mix(in srgb,var(--gc,#e7c27a) 90%,transparent))}
#whl .gp{fill:color-mix(in srgb,var(--gc,#e7c27a) 7%,#0a070a);stroke:color-mix(in srgb,var(--gc,#e7c27a) 30%,transparent);stroke-width:1;transition:fill .12s,stroke .12s}
#whl .gp.hot{fill:color-mix(in srgb,var(--gc,#e7c27a) 42%,#0a070a);stroke:color-mix(in srgb,var(--gc,#e7c27a) 85%,#fff)}
#whl .rim{fill:none;stroke:var(--rc,#e7c27a);stroke-width:5;stroke-linecap:round;filter:drop-shadow(0 0 8px var(--rc,#e7c27a));opacity:0;transition:opacity .12s}#whl .rim.on{opacity:1}
#whl .sep{stroke:rgba(231,194,122,.22);stroke-width:1}
#whl .nd{stroke:#ffe9b0;stroke-width:2.2;filter:drop-shadow(0 0 6px rgba(255,210,130,.9))}#whl .nd-dot{fill:#fff3d0;filter:drop-shadow(0 0 8px rgba(255,220,150,1))}
#whl .ic{position:absolute;transform:translate(-50%,-50%);text-align:center;width:calc(var(--sz)*.17);transition:transform .14s cubic-bezier(.16,.9,.2,1),filter .14s,opacity .14s;opacity:.88}
#whl .ic i{display:block;font-style:normal;font-size:calc(var(--sz)*.043);line-height:1;filter:drop-shadow(0 2px 4px #000)}
#whl .ic i .u-i{width:1em;height:1em}
#whl .ic b{display:block;margin-top:calc(var(--sz)*.006);font-size:calc(var(--sz)*.0148);font-weight:700;letter-spacing:.08em;color:#cdbd9f;text-shadow:0 1px 4px #000;white-space:nowrap}
#whl .ic.hot{opacity:1;transform:translate(-50%,-50%) scale(1.22);filter:drop-shadow(0 0 12px color-mix(in srgb,var(--gc,#e7c27a) 85%,transparent))}#whl .ic.hot b{color:#fff4d4}
#whl .ic .dot{position:absolute;left:50%;top:-40%;width:5px;height:5px;margin-left:-2.5px;background:#e7c27a;transform:rotate(45deg);box-shadow:0 0 8px #e7c27a}
#whl .gl{position:absolute;transform:translate(-50%,-50%);font-size:calc(var(--sz)*.0158);font-weight:700;letter-spacing:.34em;text-indent:.34em;color:color-mix(in srgb,var(--gc,#e7c27a) 78%,#fff);opacity:.8;white-space:nowrap;text-shadow:0 1px 3px #000;transition:opacity .12s}
#whl .gl.hot{opacity:1;text-shadow:0 0 12px var(--gc),0 1px 3px #000}
#whl .core{position:absolute;left:50%;top:50%;width:35.2%;height:35.2%;transform:translate(-50%,-50%);border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 7%;box-sizing:border-box;
  background:radial-gradient(circle at 50% 30%,rgba(78,44,34,.96),rgba(14,8,11,.98) 66%);box-shadow:inset 0 0 0 1px rgba(231,194,122,.55),inset 0 0 0 8px rgba(6,3,6,.92),inset 0 0 0 9px rgba(231,194,122,.2),0 0 70px rgba(0,0,0,.85),0 0 46px rgba(194,20,31,.28)}
#whl .core .cic{font-size:calc(var(--sz)*.082);line-height:1;filter:drop-shadow(0 4px 12px rgba(0,0,0,.9)) drop-shadow(0 0 18px rgba(231,194,122,.45));animation:whl-pop .2s cubic-bezier(.16,.9,.2,1)}
#whl .core .cic .u-i{width:1em;height:1em}
#whl .core .cgr{margin-top:calc(var(--sz)*.012);font-size:calc(var(--sz)*.0128);letter-spacing:.42em;text-indent:.42em;color:rgba(231,194,122,.7)}
#whl .core .cnm{margin-top:calc(var(--sz)*.004);font-size:calc(var(--sz)*.034);font-weight:900;letter-spacing:.14em;text-indent:.14em;background:linear-gradient(180deg,#fff6dc,#e7c27a 58%,#b98a45);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 2px 6px #000)}
#whl .core .cds{margin-top:calc(var(--sz)*.008);font-size:calc(var(--sz)*.0145);line-height:1.5;color:#bfae92;max-width:92%}
#whl .core .ck{margin-top:calc(var(--sz)*.012);display:inline-flex;gap:6px;align-items:center;font-size:calc(var(--sz)*.0125);color:#9b8a6c;letter-spacing:.1em}
#whl .core .ck kbd{min-width:calc(var(--sz)*.024);height:calc(var(--sz)*.024);padding:0 6px;display:inline-flex;align-items:center;justify-content:center;font:700 calc(var(--sz)*.0125)/1 var(--u-serif,serif);color:#fff0c4;background:linear-gradient(180deg,#3a2b30,#1a1116);border:1px solid rgba(231,194,122,.5);border-bottom-width:2px;border-radius:4px}
#whl .core .cst{margin-top:calc(var(--sz)*.014);display:flex;gap:calc(var(--sz)*.014);font-size:calc(var(--sz)*.0135);color:#cbb894;letter-spacing:.04em}#whl .core .cst b{color:#ffe0a0;font-weight:700}
#whl .core .cst2{margin-top:calc(var(--sz)*.012);font-size:calc(var(--sz)*.0125);letter-spacing:.3em;color:rgba(168,151,124,.8)}
@keyframes whl-pop{from{transform:scale(.7);opacity:0}}
#whl .hint{position:absolute;left:50%;bottom:calc(50% - var(--sz)*.5 - 6px);transform:translateX(-50%);font-size:12.5px;letter-spacing:.2em;color:rgba(231,194,122,.65);white-space:nowrap;display:none}
body.whl-on #hud,body.whl-on #hint{filter:saturate(.5) brightness(.6);transition:filter .2s}
@media (max-width:700px){#whl .ic b{display:none}}`;
    document.head.appendChild(s);
  }

  function layout() { // → {pages:[{p,a0,a1,mid,g}], groups:[{id,name,a0,a1,mid}]}
    const GR = Hub.GROUPS, L0 = L(), pages = [], groups = [];
    for (const [gid, gn] of GR) { const list = Hub.PAGES.filter(p => p.g === gid && Hub.avail(p)); if (list.length) groups.push({ id: gid, name: gn[L0] || gn.zh, list }); }
    const n = groups.reduce((a, g) => a + g.list.length, 0); if (!n) return { pages, groups };
    const GAP = 6, pageSpan = (360 - groups.length * GAP) / n; let a = -(groups[0].list.length * pageSpan) / 2;
    for (const g of groups) { g.a0 = a; for (const p of g.list) { const a0 = a, a1 = a + pageSpan; pages.push({ p, g, a0, a1, mid: (a0 + a1) / 2 }); a = a1; } g.a1 = a; g.mid = (g.a0 + g.a1) / 2; a += GAP; }
    return { pages, groups };
  }

  function build(cur) {
    addCss(); if (el) el.remove(); const { pages, groups } = layout(); if (!pages.length) return false; const L0 = L(), dg = 0.9;
    el = document.createElement('div'); el.id = 'whl'; el.setAttribute('data-noi18n', '');
    let sv = `<svg viewBox="0 0 1000 1000"><defs><radialGradient id="whHot" cx="500" cy="500" r="440" gradientUnits="userSpaceOnUse"><stop offset=".55" stop-color="rgba(120,30,30,.55)"/><stop offset=".8" stop-color="rgba(231,194,122,.34)"/><stop offset="1" stop-color="rgba(255,226,160,.5)"/></radialGradient></defs>`;
    // 外圈装饰：刻度环 + 缓慢旋转的虚线符文环
    let ticks = ''; for (let i = 0; i < 120; i++) { const a = i * 3, big = i % 10 === 0, p0 = pt(big ? 452 : 458, a), p1 = pt(466, a); ticks += `M${f1(p0[0])} ${f1(p0[1])}L${f1(p1[0])} ${f1(p1[1])}`; }
    sv += `<circle cx="500" cy="500" r="486" fill="none" stroke="rgba(231,194,122,.34)" stroke-width="1.4"/><circle cx="500" cy="500" r="446" fill="none" stroke="rgba(231,194,122,.22)" stroke-width="1"/><path d="${ticks}" stroke="rgba(231,194,122,.5)" stroke-width="1" fill="none"/>`;
    sv += `<g class="spin"><circle cx="500" cy="500" r="476" fill="none" stroke="rgba(231,194,122,.4)" stroke-width="2" stroke-dasharray="2 14 40 14 8 14"/></g><g class="spin2"><circle cx="500" cy="500" r="181" fill="none" stroke="rgba(231,194,122,.35)" stroke-width="1.4" stroke-dasharray="3 9 22 9"/></g>`;
    for (const q of [0, 90, 180, 270]) { const a = pt(493, q), b = pt(473, q + 2.2), c = pt(473, q - 2.2); sv += `<path d="M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}L${f1(c[0])} ${f1(c[1])}Z" fill="#e7c27a" opacity=".85"/>`; }
    // 分组弧
    for (const g of groups) sv += `<path class="gp" data-g="${g.id}" style="--gc:${GC[g.id] || '#e7c27a'}" d="${sector(R_G0, R_G1, g.a0 + 0.4, g.a1 - 0.4)}"/>`;
    // 页面扇区
    for (const o of pages) sv += `<path class="pg${cur && cur.id === o.p.id ? ' cur' : ''}" data-id="${o.p.id}" style="--gc:${GC[o.g.id] || '#e7c27a'}" d="${sector(R_P0, R_P1, o.a0 + dg, o.a1 - dg)}"/>`;
    sv += '<path class="rim" id="whRim"/>';
    // 分组分隔线
    for (const g of groups) { const a = pt(R_G0 - 6, g.a0 - 3), b = pt(R_P1 + 8, g.a0 - 3); sv += `<path class="sep" d="M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}"/>`; }
    sv += `<circle cx="500" cy="500" r="${R_CORE + 4}" fill="none" stroke="rgba(231,194,122,.5)" stroke-width="1.4"/><g id="whNd"><line class="nd" x1="500" y1="${500 - R_CORE - 6}" x2="500" y2="${500 - R_CORE - 6}"/><path class="nd-dot" d="M500 ${500 - 450}l7 9-7 9-7-9z"/></g></svg>`;
    // 图标 / 名称 / 分组名（HTML 叠层，emoji 会被 UI3A 换成 SVG 图标）
    let h = '';
    for (const o of pages) { const [x, y] = pt(352, o.mid), nm = o.p.n[L0] || o.p.n.zh; h += `<div class="ic" data-id="${o.p.id}" style="--gc:${GC[o.g.id] || '#e7c27a'};left:${f1(x / 10)}%;top:${f1(y / 10)}%">${cur && cur.id === o.p.id ? '<span class="dot"></span>' : ''}<i>${o.p.ic}</i><b>${esc(nm)}</b></div>`; }
    for (const g of groups) { const [x, y] = pt((R_G0 + R_G1) / 2, g.mid); h += `<div class="gl" data-g="${g.id}" style="--gc:${GC[g.id] || '#e7c27a'};left:${f1(x / 10)}%;top:${f1(y / 10)}%">${esc(g.name)}</div>`; }
    el.innerHTML = `<div class="bg"></div><div class="stage">${sv}${h}<div class="core"></div></div>`;
    document.body.appendChild(el); S = { pages, groups, cur, vx: 0, vy: 0, sel: undefined, ang: 0, shown: 0 };
    return true;
  }

  function coreHTML(o) {
    const g = window.G, st = g && g.st ? g.st() : null, SS = g && g.S, L0 = L();
    if (!o) {
      const san = SS && SS.san ? (window.SAN_CFG ? SAN_CFG.fmt(SS.san.v) : Math.floor(SS.san.v)) : 0;
      return `<div class="cic">🗝️</div><div class="cnm" style="font-size:calc(var(--sz)*.04)">魂首窟</div><div class="cst2">SOULHEAD CAVE</div>${st ? `<div class="cst"><span>Lv.<b>${st.lv || 1}</b></span><span>⚔ <b>${st.power}</b></span></div><div class="cst"><span>🔮 <b>${Math.floor(SS.coins).toLocaleString()}</b></span><span>🌀 <b>${san}</b></span></div>` : ''}<div class="cst2" style="margin-top:calc(var(--sz)*.02)">${L0 === 'zh' ? '推动鼠标选择 · 松开 Tab 进入' : 'Move mouse · release Tab'}</div>`;
    }
    const d = DESC[o.p.id], nm = o.p.n[L0] || o.p.n.zh;
    return `<div class="cic">${o.p.ic}</div><div class="cgr">${esc(o.g.name)}</div><div class="cnm">${esc(nm)}</div><div class="cds">${esc(d ? (L0 === 'zh' ? d[0] : d[1]) : '')}</div>${o.p.k ? `<div class="ck"><kbd>${esc(o.p.k)}</kbd></div>` : ''}`;
  }
  function setSel(o) {
    if (S.sel === o) return; S.sel = o; const id = o && o.p.id, gid = o && o.g.id;
    el.querySelectorAll('.pg,.ic').forEach(n => n.classList.toggle('hot', n.dataset.id === id)); el.querySelectorAll('.gp,.gl').forEach(n => n.classList.toggle('hot', n.dataset.g === gid));
    el.querySelector('.core').innerHTML = coreHTML(o); const rim = el.querySelector('#whRim'); if (rim) { rim.classList.toggle('on', !!o); if (o) { rim.setAttribute('d', arcPath(458, o.a0 + 1.2, o.a1 - 1.2)); rim.style.setProperty('--rc', GC[o.g.id] || '#e7c27a'); } }
    if (o && S.shown) { try { SFX.click && SFX.click(); } catch (e) { } }
  }
  function pick() { // 虚拟光标 → 选中的扇区（角度决定页面，半径小于死区 = 不选）
    const sz = el.querySelector('.stage').offsetWidth, k = sz / 1000, r = Math.hypot(S.vx, S.vy) / k;
    let ang = Math.atan2(S.vx, -S.vy) * 180 / Math.PI; S.ang = ang; if (r < R_DEAD) return null;
    let best = null, bd = 1e9; for (const o of S.pages) { let a = ang; while (a < o.a0 - 180) a += 360; while (a > o.a0 + 180) a -= 360; const d = a >= o.a0 && a <= o.a1 ? 0 : Math.min(Math.abs(a - o.a0), Math.abs(a - o.a1)); if (d < bd) { bd = d; best = o; } }
    return best;
  }
  function frame() {
    if (!el || !S) return; const sz = el.querySelector('.stage').offsetWidth, k = sz / 1000, r = Math.hypot(S.vx, S.vy) / k, rr = Math.min(r, 452);
    const nd = el.querySelector('#whNd'); if (nd) { const a = S.disp == null ? S.ang : S.disp; let d = S.ang - a; while (d > 180) d -= 360; while (d < -180) d += 360; S.disp = a + d * 0.35; nd.setAttribute('transform', `rotate(${S.disp.toFixed(2)} 500 500)`);
      const ln = nd.querySelector('line'), far = Math.max(R_CORE + 6, rr); ln.setAttribute('y2', 500 - far); nd.querySelector('path').setAttribute('transform', `translate(0 ${450 - far})`); nd.style.opacity = r < R_DEAD ? 0 : 1; }
    raf = requestAnimationFrame(frame);
  }
  const onMove = e => { if (!S) return; const sz = el.querySelector('.stage').offsetWidth, mx = sz * 0.48; S.vx += (e.movementX || 0) * 1.15; S.vy += (e.movementY || 0) * 1.15; const r = Math.hypot(S.vx, S.vy); if (r > mx) { S.vx *= mx / r; S.vy *= mx / r; } S.shown = 1; setSel(pick()); e.stopPropagation(); };
  const onDown = e => { if (!S) return; e.preventDefault(); e.stopPropagation(); if (e.button === 0) { try { commit(); } catch (x) { } } };
  const onKey = e => { if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); cancel(); } };
  function open(cur) {
    if (!enabled() || el && el.classList.contains('on')) return; if (!build(cur)) return;
    // 初始指向当前页 / 上次页，松开 Tab 不动鼠标等于“回到那一页”
    el.classList.add('on'); el.classList.remove('out');
    const o0 = S.pages.find(o => cur && o.p.id === cur.id) || S.pages.find(o => o.p.id === Hub.last) || S.pages[0]; const sz = el.querySelector('.stage').offsetWidth; S.vx = Math.sin(rad(o0.mid)) * 330 * sz / 1000; S.vy = -Math.cos(rad(o0.mid)) * 330 * sz / 1000; S.ang = o0.mid; S.disp = o0.mid;
    window.__wheelOpen = true; document.body.classList.add('whl-on'); setSel(pick()); S.shown = 1;
    window.addEventListener('mousemove', onMove, true); window.addEventListener('mousedown', onDown, true); window.addEventListener('keydown', onKey, true); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    try { SFX.open && SFX.open(); } catch (e) { }
  }
  function close() {
    if (!el) return; window.__wheelOpen = false; document.body.classList.remove('whl-on'); window.removeEventListener('mousemove', onMove, true); window.removeEventListener('mousedown', onDown, true); window.removeEventListener('keydown', onKey, true); cancelAnimationFrame(raf);
    const e0 = el; e0.classList.add('out'); setTimeout(() => { if (e0 === el && e0.classList.contains('out')) { e0.classList.remove('on'); } e0.remove(); if (el === e0) el = null; }, 150); S = null;
  }
  function commit() { if (!S) return; const o = S.sel, cur = S.cur; close(); if (o && !(cur && cur.id === o.p.id)) { try { Hub.go(o.p.id); } catch (e) { console.warn('wheel go', e); } } }
  function cancel() { if (!S) return; close(); }
  return { enabled, open, commit, cancel, get isOpen() { return !!S; } };
})();
