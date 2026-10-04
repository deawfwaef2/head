// R73 MOD moon73（默认开）：主线「月之魔女」一目了然 + 她会一点点影响这个世界。
//  用户：「主线你要把月之魔女、线索、BOSS 这个显示清晰，而且月之魔女也会逐渐对游戏造成影响」。
//  ① 主线追踪（野外左侧）：线索 x/7 · 本章使徒和她的布局 · 月蚀度；Tab 菜单「世界 → 🌙 主线」打开完整面板（三步路线 + 月蚀阶段 + 月之记录）。
//     出发选地点的右侧面板里也多出「月蚀度」和「本章使徒的布局」。
//  ② 月蚀度 0~100（本局）：时间流逝、砍头、使徒布局得逞会让它上涨；破坏布局、打倒使徒、拿到线索、清掉月之事件会让它下降。
//     25 月晕：有的地图里出现「月光哨兵」（被月光标记的敌人，更硬，打倒 −3）
//     50 血月夜：每趟 35% 机会血月当空——敌人伤害 +10%，但这一趟每颗首级让月蚀 −1
//     75 月之信徒：每趟有一处信徒在画月环（3 人，全清 −8；放着不管 +4）
//     100 月蚀：塞勒涅之影亲自来找你（打倒她 = 月蚀 −30 + 1 条月之线索）
window.M73 = (() => {
  'use strict';
  const on = () => !window.Mods || !Mods.on || Mods.on('moon73') !== false;
  const LP = () => (window.Loop && Loop.on && Loop.on() ? Loop : null);
  const Wd = () => (window.Worlds && Worlds.active ? Worlds._W : null);
  const now = () => performance.now() / 1000;
  const T = () => window.THREE;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const toast = (t, c, s) => { try { G.toast(t, c || '#d8d0ff', s || 2.8); } catch (e) { } };
  const ndOf = W => W && W.graph && W.graph.nodes[W.cur];
  const fieldOK = W => { const nd = ndOf(W); return !!(W && W.B && !W.busy && !W.dead && nd && !nd.home && !nd.arena && !nd.eliteArena && !nd.huntArena && !W.B.corr && !(W.graph && W.graph.arena)); };
  const strong = fo => !!(window.Foe && Foe.STRONG && Foe.STRONG(fo));
  const TIERS = [
    { at: 0, n: '月 静', ic: '🌙', col: '#c8c0e8', d: '月亮还在正常地升落。' },
    { at: 25, n: '月 晕', ic: '🌘', col: '#b8a8ff', d: '有的地图里出现「月光哨兵」：被月光标记的敌人（紫环），更硬更疼，打倒她月蚀 −3。' },
    { at: 50, n: '血月夜', ic: '🩸', col: '#ff7a8a', d: '每趟 35% 机会血月当空：敌人伤害 +10%；但这一趟每砍下一颗头，月蚀 −1。' },
    { at: 75, n: '月之信徒', ic: '🕯️', col: '#d090ff', d: '每趟有一处地图里，3 名月之信徒在画月环：全部放倒月蚀 −8，放着不管 +4。' },
    { at: 100, n: '月 蚀', ic: '🌑', col: '#ff5a8a', d: '塞勒涅之影亲自来找你：打倒她 = 月蚀 −30，并拿到 1 条月之线索。' }
  ];
  // ---------------- 存档 ----------------
  function S() { const L = LP(), host = L ? L.R() : (window.G && G.S); if (!host) return null; if (!host.m73) host.m73 = { e: 8, log: [], tier: 0, ch: L ? L.R().chap : 0, cl: -1, t: 0 }; return host.m73; }
  const tierOf = e => { let k = 0; for (let i = 0; i < TIERS.length; i++) if (e >= TIERS[i].at) k = i; return k; };
  function log(s) { const m = S(); if (!m) return; m.log.unshift({ t: Date.now(), ch: LP() ? LP().R().chap : 0, s }); if (m.log.length > 24) m.log.length = 24; }
  function bump(d, why, quiet) {
    if (!on()) return; const m = S(); if (!m) return; const e0 = m.e; m.e = Math.max(0, Math.min(100, m.e + d)); const k0 = tierOf(e0), k1 = tierOf(m.e);
    if (why && Math.abs(d) >= 3) log(`${d > 0 ? '🌘 月蚀 +' + Math.round(d) : '🌕 月蚀 ' + Math.round(d)}：${why}`);
    if (k1 > k0) { const t = TIERS[k1]; log(`${t.ic} 月蚀进入「${t.n}」`); toast(`${t.ic} 月蚀 ${Math.round(m.e)}% —— 进入「${t.n}」：${t.d}`, t.col, 5); try { SFX.roar && SFX.roar(0.35); } catch (e) { } }
    else if (k1 < k0) toast(`🌕 月蚀退回「${TIERS[k1].n}」（${Math.round(m.e)}%）`, '#e8e0ff', 3);
    else if (!quiet && why && Math.abs(d) >= 3) toast(`${d > 0 ? '🌘' : '🌕'} 月蚀 ${d > 0 ? '+' : ''}${Math.round(d)}（${Math.round(m.e)}%）· ${why}`, d > 0 ? '#c8a8ff' : '#e8e0ff', 2.2);
  }
  const eNow = () => { const m = S(); return m ? m.e : 0; };

  // ---------------- 主线状态汇总 ----------------
  function clues() { try { return window.Saga && Saga.clues ? Saga.clues() : 0; } catch (e) { return 0; } }
  const NEED = () => (window.Saga && Saga.NEED) || 7;
  const moonDead = () => { try { return !!(G.S.el && G.S.el.dead && G.S.el.dead.moon); } catch (e) { return false; } };
  function chap() { const L = LP(); if (!L) return null; const r = L.R(), B = L.CB(); return { ch: r.chap, n: Math.min(2, r.n), B, boss: r.n >= 2, lv: L.bossLv ? L.bossLv() : 0 }; }
  function apo() { try { return window.Apostle73 && Apostle73.on() ? Apostle73.status() : null; } catch (e) { return null; } }

  // ---------------- 野外追踪 HUD（左侧）----------------
  let el = null, sig = '', hAt = 0;
  function css() { if (document.getElementById('m73css')) return; const s = document.createElement('style'); s.id = 'm73css'; s.textContent = `
#m73t{position:fixed;left:14px;top:168px;z-index:29;width:min(300px,28vw);pointer-events:none;color:#efe8ff;font:600 12.5px/1.55 "Microsoft YaHei UI",system-ui,sans-serif;text-shadow:0 1px 3px #000;background:linear-gradient(90deg,rgba(14,8,26,.78),rgba(14,8,26,0));padding:6px 12px 7px 10px;border-left:3px solid var(--mc,#b8a8ff);display:none}
#m73t .h{font-size:13px;letter-spacing:.18em;color:#d8ccff;font-weight:900}#m73t .h small{float:right;letter-spacing:0;font-weight:600;color:#a898d8;font-size:11px}
#m73t .p i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:3px;box-shadow:inset 0 0 0 1.5px #8878c8;vertical-align:-1px}#m73t .p i.on{background:radial-gradient(circle,#fff,#b8a8ff);box-shadow:0 0 6px #b8a8ff}
#m73t .r{margin-top:2px}#m73t .a{color:var(--ac,#ffd8a0)}#m73t .e{display:flex;align-items:center;gap:6px;margin-top:3px}#m73t .e s{flex:1;height:5px;background:rgba(0,0,0,.6);border:1px solid rgba(200,180,255,.3);text-decoration:none}#m73t .e s b{display:block;height:100%;background:linear-gradient(90deg,#6a5ad0,#c070ff,#ff4a7a)}
body.sgcine #m73t,body.hubon #m73t,body.riw-on #m73t{display:none!important}
#m73pn{position:fixed;inset:0;z-index:118;display:none;background:radial-gradient(ellipse at 50% 30%,rgba(30,18,52,.97),rgba(6,4,10,.98));color:#eee6ff;font:14px/1.65 "Microsoft YaHei UI",system-ui,sans-serif;overflow:auto}
#m73pn.on{display:block}body.hubon #m73pn{padding-left:var(--hubW,196px);box-sizing:border-box}
#m73pn .w{max-width:980px;margin:0 auto;padding:78px 28px 90px}
#m73pn h2{font:900 30px/1.3 "Noto Serif SC",serif;letter-spacing:.3em;color:#e8dcff;margin:0 0 4px;text-shadow:0 0 18px rgba(180,160,255,.4)}#m73pn .sub{color:#a898d8;margin-bottom:18px}
#m73pn .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:14px 0}#m73pn .st{padding:12px 14px;background:rgba(255,255,255,.04);border:1px solid rgba(200,180,255,.2);position:relative}#m73pn .st.ok{border-color:#ffe28a;background:rgba(255,226,138,.07)}#m73pn .st.cur{border-color:#c8b0ff;box-shadow:0 0 18px rgba(180,150,255,.25)}
#m73pn .st .k{font-size:12px;letter-spacing:.3em;color:#a898d8}#m73pn .st .n{font-size:18px;font-weight:900;color:#fff;margin:2px 0 6px}#m73pn .st .d{font-size:13px;color:#d8d0f0}
#m73pn .pp i{display:inline-block;width:16px;height:16px;border-radius:50%;margin-right:5px;box-shadow:inset 0 0 0 2px #8878c8;vertical-align:middle}#m73pn .pp i.on{background:radial-gradient(circle,#fff,#b8a8ff);box-shadow:0 0 10px #b8a8ff}
#m73pn .sec{margin-top:18px;padding:14px 16px;background:rgba(0,0,0,.25);border-left:3px solid var(--c,#b8a8ff)}#m73pn .sec h3{margin:0 0 8px;font-size:16px;letter-spacing:.2em;color:var(--c,#d8ccff)}
#m73pn .eb{height:12px;background:rgba(0,0,0,.6);border:1px solid rgba(200,180,255,.35);position:relative;margin:8px 0 4px}#m73pn .eb b{display:block;height:100%;background:linear-gradient(90deg,#6a5ad0,#c070ff,#ff4a7a)}#m73pn .eb u{position:absolute;top:-3px;bottom:-3px;width:1px;background:#fff8}
#m73pn .tr{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;font-size:12px}#m73pn .tr div{padding:6px 8px;background:rgba(255,255,255,.03);border-top:2px solid var(--c);opacity:.55}#m73pn .tr div.on{opacity:1;background:rgba(255,255,255,.07)}
#m73pn .lg{font-size:13px;color:#cfc6e8;max-height:220px;overflow:auto}#m73pn .x{position:fixed;right:22px;top:16px;background:none;border:1px solid #8878c8;color:#e8dcff;padding:6px 14px;cursor:pointer;font:inherit;z-index:2}
#m73pn button.go{margin-top:8px;padding:6px 14px;background:linear-gradient(#3a2a5a,#1e1430);border:1px solid #b8a8ff;color:#fff;cursor:pointer;font:inherit}
@media (max-width:900px){#m73pn .steps{grid-template-columns:1fr}#m73pn .tr{grid-template-columns:1fr 1fr}}`; document.head.appendChild(s); }
  function hud() {
    const t = now(); if (t - hAt < 0.25) return; hAt = t; const W = Wd();
    if (!W || !on() || !W.B || W.busy) { if (el) el.style.display = 'none'; return; }
    css(); if (!el) { el = document.createElement('div'); el.id = 'm73t'; document.body.appendChild(el); }
    const m = S(), cn = clues(), N = NEED(), c = chap(), a = apo(), k = tierOf(m.e), tr = TIERS[k], md = moonDead();
    const pips = Array.from({ length: N }, (_, i) => `<i class="${i < cn ? 'on' : ''}"></i>`).join('');
    let r1 = ''; if (c) r1 = `📖 第 ${c.ch} 章 · <b style="color:${esc(c.B.col)}">${esc(c.B.n)}</b> <span style="opacity:.8">${esc(c.B.title)}</span> · ${c.boss ? '<b style="color:#ffd27a">BOSS 已开放</b>' : `地区 ${c.n}/2`}`;
    const r2 = a && a.live ? `<div class="r a" style="--ac:${esc(a.S.col)}">${esc(a.live)}</div>` : '';
    const r0 = md ? '✔ 月之魔女已被斩杀' : cn >= N ? '<b style="color:#ffe28a">神殿已开 → Tab · 精英挑战 · 月之魔女</b>' : `线索 <span class="p">${pips}</span> ${cn}/${N}`;
    const ex = W.m73 || {}; const flag = [ex.blood ? '🩸 血月夜' : '', ex.cult && !ex.cult.done ? '🕯️ 信徒在画月环' : '', ex.shadow && !ex.shadow.done ? '🌑 塞勒涅之影' : ''].filter(Boolean).join(' · ');
    const html = `<div class="h">🌙 主线 · 月之魔女<small>Tab → 🌙 主线</small></div><div class="r">${r0}</div>${r1 ? `<div class="r">${r1}</div>` : ''}${r2}<div class="e">${tr.ic} 月蚀 ${Math.round(m.e)}%<s><b style="width:${m.e.toFixed(1)}%"></b></s>${tr.n.replace(/ /g, '')}</div>${flag ? `<div class="r" style="color:#ff9ac0">${flag}</div>` : ''}`;
    el.style.display = 'block'; el.style.setProperty('--mc', tr.col); if (html !== sig) { sig = html; el.innerHTML = html; }
  }
  const ownsHud = () => on() && !!el && el.style.display !== 'none';

  // ---------------- 完整面板（Tab 菜单 → 世界 → 🌙 主线）----------------
  let pn = null;
  function panelHTML() {
    const m = S(), cn = clues(), N = NEED(), c = chap(), a = apo(), k = tierOf(m.e), md = moonDead(), MO = (window.Elites && Elites.MOON) || { n: '塞勒涅·永夜', t: '月之魔女' };
    const pips = Array.from({ length: N }, (_, i) => `<i class="${i < cn ? 'on' : ''}"></i>`).join('');
    const cl = (window.Saga && Saga.SS ? Saga.SS().cl || [] : []).map((x, i) => `<div>🌙 ${i + 1}. ${esc(String(x.t || '').replace(/^“|”$/g, ''))}</div>`).join('');
    const s1 = cn >= N ? 'ok' : 'cur', s2 = c ? (c.boss ? 'cur' : 'cur') : '', s3 = md ? 'ok' : cn >= N ? 'cur' : '';
    const apHTML = a ? `<div style="margin-top:6px"><b style="color:${esc(a.S.col)}">${esc(a.S.ic)} 她的布局：${esc(a.S.obj)}</b><br>${esc(a.S.story)}<br>🎯 ${esc(a.S.goal)}<br>⚠ ${esc(a.S.boss)}<br>本章两处：${a.res.map(r => r === 'win' ? '<b style="color:#ffe28a">✦ 已破坏</b>' : '<b style="color:#ff9a8a">✧ 得逞</b>').concat(Array.from({ length: 2 - a.res.length }, () => '○ 还没去')).join(' · ')}</div>` : '';
    const steps = `<div class="steps">
<div class="st ${s1}"><div class="k">第 一 步</div><div class="n">集齐月之线索</div><div class="pp">${pips} <b>${cn}/${N}</b></div><div class="d">来源：各地区的「月之使者」（地区电影会标出）、章节闪回、打倒塞勒涅之影（月蚀满时出现）。</div></div>
<div class="st ${s2}"><div class="k">第 二 步 · 每 章</div><div class="n">${c ? `第 ${c.ch} 章：${esc(c.B.n)}` : '章节使徒'}</div><div class="d">${c ? `${esc(c.B.title)} · 擂台「${esc(c.B.place)}」· Lv.${c.lv}<br>去过 ${c.n}/2 个地区 → ${c.boss ? '<b style="color:#ffd27a">BOSS 已开放（出发面板）</b>' : '再去 ' + (2 - c.n) + ' 个地区'}` : '开启「肉鸽循环」后每章一位使徒。'}${apHTML}</div></div>
<div class="st ${s3}"><div class="k">最 终</div><div class="n">${esc(MO.t)} · ${esc(MO.n)}</div><div class="d">${md ? '✔ 已斩杀。月亮安静了。' : cn >= N ? '<b style="color:#ffe28a">神殿已开！</b>Tab → 挑战 → 精英挑战 → 月之魔女。' : `线索集齐 ${N} 条后，她的神殿会打开（在「精英挑战」里挑战她）。`}</div></div></div>`;
    const tr = TIERS.map((t, i) => `<div class="${i <= k ? 'on' : ''}" style="--c:${t.col}"><b>${t.ic} ${t.n}</b> ≥${t.at}<br>${esc(t.d)}</div>`).join('');
    const lg = (m.log || []).map(x => `<div>· ${x.ch ? `第${x.ch}章 ` : ''}${esc(x.s)}</div>`).join('') || '<div style="opacity:.6">还没有记录。</div>';
    return `<button class="x" data-x>✕ 关闭（Esc）</button><div class="w"><h2>🌙 主 线 · 月 之 魔 女</h2><div class="sub">${esc(MO.n)}——${esc(MO.t)}。每一位章节 BOSS 都是她的使徒，每一条线索都指向她的神殿。</div>${steps}
<div class="sec" style="--c:${TIERS[k].col}"><h3>${TIERS[k].ic} 月蚀度 ${Math.round(m.e)}% · ${TIERS[k].n}</h3><div class="eb"><b style="width:${m.e}%"></b>${[25, 50, 75].map(x => `<u style="left:${x}%"></u>`).join('')}</div>
<div style="font-size:13px;color:#cfc6e8;margin-bottom:8px">上涨：时间流逝、砍头（每颗 +0.3）、使徒布局得逞（+8）。下降：破坏布局（−6）、打倒章节使徒（−15）、拿到线索（−5）、清掉月光哨兵 / 月之信徒 / 塞勒涅之影。</div><div class="tr">${tr}</div></div>
<div class="sec"><h3>🌙 已得线索</h3><div class="lg">${cl || '<div style="opacity:.6">还没有线索。</div>'}</div></div>
${window.Ng73 && Ng73.on() && Ng73.list().length ? `<div class="sec" style="--c:#ff8a7a"><h3>🩸 宿敌动向</h3><div style="font-size:13px">${Ng73.html(6)}</div></div>` : ''}
<div class="sec" style="--c:#a898d8"><h3>📜 月之记录</h3><div class="lg">${lg}</div></div></div>`;
  }
  function openP() { css(); if (!pn) { pn = document.createElement('div'); pn.id = 'm73pn'; pn.setAttribute('data-noi18n', '1'); document.body.appendChild(pn); pn.addEventListener('click', e => { if (e.target.closest('[data-x]')) closeP(); }); ['mousedown', 'pointerdown', 'wheel'].forEach(k => pn.addEventListener(k, e => e.stopPropagation())); }
    const W = Wd(); if (W && (W.foes || []).some(f => !f.dead && f.seen && (f.state === 'chase' || f.atk))) { toast('⚔️ 战斗中不能打开主线面板', '#ffb0a0', 1.4); return; }
    pn.innerHTML = panelHTML(); pn.classList.add('on'); try { G.setUI && G.setUI(true); document.exitPointerLock && document.exitPointerLock(); } catch (e) { } }
  function closeP() { if (!pn || !pn.classList.contains('on')) return; pn.classList.remove('on'); try { if (!(window.Hub && Hub.open)) { G.setUI && G.setUI(false); } } catch (e) { } }
  const isOpen = () => !!(pn && pn.classList.contains('on'));
  addEventListener('keydown', e => { if (isOpen() && e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closeP(); } }, true);
  function hubReg() { if (!window.Hub || !Hub.PAGES || Hub.PAGES.some(p => p.id === 'moon73')) return !!(window.Hub && Hub.PAGES); const i = Hub.PAGES.findIndex(p => p.id === 'logs'); Hub.PAGES.splice(i < 0 ? Hub.PAGES.length : i, 0, { id: 'moon73', g: 'world', ic: '🌙', k: '', n: { zh: '主线 · 月之魔女', ja: '本筋・月の魔女', en: 'Main quest · Moon Witch' }, isOpen, open: openP, close: closeP, ok: on }); return true; }

  // ---------------- 选地点右侧面板：加「月蚀度」「使徒的布局」----------------
  function sideAug() { const el2 = document.getElementById('lpSide'); if (!el2 || el2.querySelector('.m73s') || !on()) return; const m = S(); if (!m) return; const k = tierOf(m.e), t = TIERS[k], a = apo();
    const sec = document.createElement('section'); sec.className = 'm73s'; sec.style.setProperty('--bc', t.col);
    sec.innerHTML = `<h4>${t.ic} 月蚀度 ${Math.round(m.e)}% · ${t.n}</h4><div class="bar"><i style="width:${m.e}%;background:linear-gradient(90deg,#6a5ad0,#c070ff,#ff4a7a)"></i></div><p class="m">${esc(t.d)}</p>${a ? `<p><b style="color:${esc(a.S.col)}">${esc(a.S.ic)} 本章使徒的布局：${esc(a.S.obj)}</b>（${a.wins} 破坏 / ${a.fails} 得逞）<br><span class="m">${esc(a.S.goal)}</span></p>` : ''}<p><button class="m73go" style="pointer-events:auto;padding:4px 10px;background:#2a1e44;border:1px solid #b8a8ff;color:#fff;cursor:pointer">🌙 打开主线面板</button></p>`;
    el2.appendChild(sec); sec.querySelector('.m73go').addEventListener('click', e => { e.stopPropagation(); openP(); }); }

  // ================= 月之事件（野外）=================
  let lastW = null, lastB = null, play = 0;
  function newH(name, title, rar) { const W = Wd(), nd = ndOf(W); if (!nd || !window.RPG) return null; let h = null; try { h = RPG.foe(G.S, nd.loc, (Math.random() * 4294967296) >>> 0, G.usedNames, G.usedSig); } catch (e) { return null; } if (!h) return null; h.c.name = name + (h.c.name ? '·' + h.c.name : ''); if (title) h.c.title = title; if (rar != null) h.c.rar = rar; return h; }
  async function spawn(h, x, z, set) { const C = window.Foe && Foe.ctx && Foe.ctx(), W = Wd(); if (!C || !W || !W.B || C.sc !== W.B.sc) return null; const pos = new (T().Vector3)(x, 0, z); if (W.B.lp && W.B.lp.clamp) W.B.lp.clamp(pos, 1.5); let out = null; try { out = await Foe.populate(C, [{ h, pos }], { keep: true }); } catch (e) { return null; } const fo = out && out[0]; if (!fo || Wd() !== W) return null; fo._liv = 1; if (!W.foes) W.foes = Foe.foes; else if (!W.foes.includes(fo)) W.foes.push(fo); if (set) set(fo); return fo; }
  let glowTex = null; const glowT = () => { if (glowTex) return glowTex; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.4)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return (glowTex = new (T().CanvasTexture)(c)); };
  const glow = (col, s) => { const sp = new (T().Sprite)(new (T().SpriteMaterial)({ map: glowT(), color: col, blending: T().AdditiveBlending, depthWrite: false, transparent: true, fog: false })); sp.scale.setScalar(s); sp.raycast = () => { }; return sp; };
  let RG = null; const ringG = () => RG || (RG = new (T().RingGeometry)(0.8, 1, 48).rotateX(-Math.PI / 2));
  const ring = (sc, col, r, op) => { const m = new (T().Mesh)(ringG(), new (T().MeshBasicMaterial)({ color: col, transparent: true, opacity: op, depthWrite: false, blending: T().AdditiveBlending, side: T().DoubleSide, fog: false })); m.scale.setScalar(r); m.renderOrder = 4; sc.add(m); return m; };
  const drop = o => { if (o && o.parent) o.parent.remove(o); try { o.material && o.material.dispose(); } catch (e) { } };
  let NO = []; // 本节点的月之物体 { m, fo?, k }
  function clearNode() { for (const o of NO) { drop(o.m); if (o.g) drop(o.g); } NO = []; }
  let fogSc = null;
  function moodBlood(W, onB) { const sc = W.B.sc; if (onB) { fogSc = sc; try { R73.fog(sc, 'blood', '#6a0a14', 0.4, 1); } catch (e) { } const m = glow('#ff2a3a', 54), P = W.pos; m.position.set(P.x - 160, 125, P.z - 150); m.renderOrder = -1; sc.add(m); NO.push({ m, k: 'moon' }); } }
  function restoreFog() { if (fogSc) { try { R73.fogClear(fogSc, 'blood'); } catch (e) { } fogSc = null; } }
  function tripStart(W) { const m = S(), k = tierOf(m.e); W.m73 = { blood: k >= 2 && Math.random() < 0.35, cultNode: k >= 3 ? 'next' : null, shadow: k >= 4 ? { at: 0, done: false } : null, nodes: 0 };
    if (W.m73.blood) { log('🩸 血月夜降临'); setTimeout(() => toast('🩸 血月当空——这一趟敌人伤害 +10%；但每砍下一颗头，月蚀 −1', '#ff8a9a', 4.5), 2500); } }
  function nodeEnter(W) { const x = W.m73; if (!x) return; x.nodes++; clearNode(); restoreFog(); const k = tierOf(eNow()); const B = W.B;
    if (x.blood) moodBlood(W, true);
    if (k >= 1 && Math.random() < 0.3) setTimeout(() => markSentinel(W), 4000);
    if (x.cultNode === 'next' && x.nodes >= 1 && Math.random() < 0.6) { x.cultNode = W.cur; x.cult = { list: [], done: false, cur: W.cur }; setTimeout(() => cultRite(W), 3000); }
    else if (x.cult && !x.cult.done && x.cult.cur !== W.cur) { x.cult.done = true; bump(4, '月之信徒画完了月环'); }
    if (x.shadow && !x.shadow.done && !x.shadow.at) x.shadow.at = now() + 30 + Math.random() * 15; }
  function markSentinel(W) { if (Wd() !== W || !fieldOK(W)) return; const c = (W.foes || []).filter(f => !f.dead && !strong(f) && !f.moon73 && !f.wax73); if (!c.length) return; const fo = c[Math.floor(Math.random() * c.length)]; fo.moon73 = 1; fo.maxHp = fo.hp = Math.round(fo.maxHp * 1.3); fo.dmgMul = (fo.dmgMul || 1) * 1.1; const m = ring(W.B.sc, '#b080ff', 0.75, 0.5), g = glow('#c8a8ff', 1); W.B.sc.add(g); NO.push({ m, g, fo, k: 'sent' }); toast('🌘 一名敌人被月光标记了（紫环）——「月光哨兵」：打倒她月蚀 −3', '#c8b8ff', 3); }
  async function cultRite(W) { if (Wd() !== W || !fieldOK(W)) return; const x = W.m73; const P = W.pos; let cx = P.x, cz = P.z; for (let i = 0; i < 20; i++) { const a = Math.random() * 6.283, d = 14 + Math.random() * 8, tx = P.x + Math.sin(a) * d, tz = P.z + Math.cos(a) * d; if (W.B.edge) { const E = W.B.edge(tx, tz); if (!E || E[0] < 5) continue; } else if (Math.hypot(tx, tz) > (W.B.R || 30) - 5) continue; cx = tx; cz = tz; break; }
    const y = W.B.H(cx, cz), m = ring(W.B.sc, '#b060ff', 3.2, 0.45); m.position.set(cx, y + 0.08, cz); NO.push({ m, k: 'cult' }); toast('🕯️ 远处有人在画月环——3 名月之信徒（全部放倒：月蚀 −8）', '#d8a8ff', 3.4);
    for (let i = 0; i < 3; i++) { const a = i / 3 * 6.283, h = newH('月之信徒', '塞勒涅的信徒', 1); if (!h) continue; spawn(h, cx + Math.sin(a) * 2.6, cz + Math.cos(a) * 2.6, fo => { fo.cult73 = 1; fo.yaw = Math.atan2(cx - fo.pos.x, cz - fo.pos.z); x.cult.list.push(fo); }); } }
  async function shadowCome(W) { const x = W.m73; x.shadow.done = 'spawning'; const h = newH('塞勒涅之影', '月之魔女的分身', 4); if (!h) { x.shadow.done = false; return; } h.c.name = '塞勒涅之影'; const a = Math.random() * 6.283;
    toast('🌑 月光骤冷——塞勒涅之影亲自来了。打倒她：月蚀 −30 + 1 条月之线索', '#e0d0ff', 5); try { G.flash && G.flash('#2a2050', 0.5, 700); SFX.roar && SFX.roar(0.7); } catch (e) { }
    const fo = await spawn(h, W.pos.x + Math.sin(a) * 11, W.pos.z + Math.cos(a) * 11, f => { f.maxHp = f.hp = Math.round(f.maxHp * 3.2); f.tier = 3; f.iq = 1.3; f.nemClone = 1; f.brave = true; f.seen = true; f.state = 'chase'; f.shadow73 = 1; });
    if (fo) { x.shadow.fo = fo; x.shadow.done = false; } else x.shadow.done = false; }
  function frame(dt) {
    if (!on()) return; const W = Wd(); hud();
    if (W !== lastW) { if (W && !lastW) { tripStart(W); lastB = null; } if (!W && lastW) { clearNode(); restoreFog(); const x = lastW.m73; if (x && x.cult && !x.cult.done && x.cult.list.some(f => !f.dead)) bump(4, '月之信徒画完了月环'); } lastW = W; }
    const m = S(); if (!m) return; watch(m);
    if (!W || !W.m73) return;
    if (!G.uiOpen && W.B && !W.busy) { play += dt; if (play > 90) { play = 0; bump(1, '', true); } }
    if (W.B !== lastB && fieldOK(W)) { lastB = W.B; nodeEnter(W); }
    const x = W.m73, t = now();
    for (let i = NO.length - 1; i >= 0; i--) { const o = NO[i]; if (!o.fo) continue; const fo = o.fo; if (fo.dead) { drop(o.m); drop(o.g); NO.splice(i, 1); if (!fo.escaped && o.k === 'sent') bump(-3, '打倒了月光哨兵'); continue; } o.m.position.set(fo.pos.x, W.B.H(fo.pos.x, fo.pos.z) + 0.08, fo.pos.z); o.g.position.set(fo.pos.x, fo.pos.y + 2.15, fo.pos.z); o.m.material.opacity = 0.35 + 0.2 * Math.sin(t * 4); }
    if (x.cult && !x.cult.done && x.cult.list.length >= 3 && x.cult.list.every(f => f.dead)) { x.cult.done = true; bump(-8, '打散了月之信徒'); for (const o of NO) if (o.k === 'cult') o.m.visible = false; }
    if (x.shadow && !x.shadow.done && x.shadow.at && t > x.shadow.at && fieldOK(W) && !x.shadow.fo) shadowCome(W);
    if (x.shadow && x.shadow.fo && x.shadow.fo.dead && x.shadow.done !== true) { x.shadow.done = true; if (!x.shadow.fo.escaped) { bump(-30, '打倒了塞勒涅之影'); try { const d = window.Saga && Saga.giveClue && Saga.giveClue('m73'); if (d && Saga.banner) Saga.banner('🌙 月之线索 +1', String(d.t || '').replace(/^“|”$/g, ''), `${clues()}/${NEED()}`, '#c8b8ff'); } catch (e) { } } }
  }
  function watch(m) {
    { const cn = clues(); if (m.cl < 0) m.cl = cn; else if (cn > m.cl) { bump(-5 * (cn - m.cl), '得到了月之线索'); m.cl = cn; } }
    { const L = LP(); if (L) { const ch = L.R().chap; if (m.ch && ch > m.ch) { bump(-15, `打倒了第 ${m.ch} 章的使徒`); } m.ch = ch; } }
  }
  function onEv(t, fo) { if (!on() || t !== 'decap' || !fo) return; const W = Wd(); if (!W || !W.m73) return; if (LP() && LP().isBossTrip && LP().isBossTrip()) return; if (W.m73.blood) bump(-1, '', true); else bump(0.3, '', true); }
  // 血月：敌人出手前加伤（每个敌人一次）
  setInterval(() => { try { const W = Wd(); if (!W || !W.m73 || !W.m73.blood || !on()) return; for (const fo of (window.Foe && Foe.foes) || []) if (!fo.dead && !fo.bm73) { fo.bm73 = 1; fo.dmgMul = (fo.dmgMul || 1) * 1.1; } } catch (e) { } }, 700);
  setInterval(() => { try { if (!on()) return; hubReg(); sideAug(); if (isOpen() && !(window.G && G.playing)) closeP(); if (el && !Wd()) el.style.display = 'none'; if (window.G && G.S && !Wd()) { const m = S(); if (m) watch(m); } } catch (e) { } }, 400);
  let wired = false;
  function wire() { if (wired || !window.G || !G.HOOK || !window.R73) return false; wired = true; G.HOOK.world = G.HOOK.world || []; G.HOOK.world.push(frame); R73.on(onEv); return true; }
  if (!wire()) { const iv = setInterval(() => { if (wire()) clearInterval(iv); }, 400); }
  return { on, S, bump, eNow, TIERS, tierOf, open: openP, close: closeP, isOpen, ownsHud, panelHTML, log };
})();
