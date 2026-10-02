// R55 MOD dissect_pick（默认开）：战场解剖界面 —— 靠近尸体 →「🔪 解剖」→ 弹出选择界面：
//   肢体（上臂 / 前臂 / 大腿 / 小腿 / 胸腔）与内脏（心 / 肺 / 肝 / 肾 / 胃 / 肠 / 脾 / 胆 / 脊椎 / 血液）里，选你要的那几件（名额有限）。
//   每一件都有用处（属性 / 光环 / 戳击 / 定时产出，摆进洞里的标本罐生效，也可炼化成魂尘）。头部器官（大脑 / 眼球 / 舌）已移出，不再可解剖。
//   只能在战场上解剖尸体；工坊里不再有合成断手 / 断脚 / 肠索的配方。
window.Dissect = (() => {
  const on = () => !window.Mods || Mods.on('dissect_pick') !== false;
  const O = () => window.Organs, Sk = () => window.Sack, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let root = null, css = false;
  function addCss() {
    if (css) return; css = true; const st = document.createElement('style'); st.textContent = `
#dsRoot{position:fixed;inset:0;z-index:120;background:radial-gradient(ellipse at 50% 30%,rgba(60,10,16,.92),rgba(8,4,8,.97));color:#eadfc8;font-family:system-ui,"Noto Sans CJK SC","PingFang SC","Microsoft YaHei",sans-serif;display:flex;flex-direction:column;overflow:hidden;animation:dsIn .25s ease-out}
@keyframes dsIn{from{opacity:0;transform:scale(1.02)}to{opacity:1}}
#dsRoot .hd{display:flex;align-items:flex-end;gap:22px;padding:22px 34px 12px;border-bottom:1px solid rgba(231,194,122,.35)}
#dsRoot h1{margin:0;font:900 clamp(30px,4.6vh,46px)/1 "Noto Serif CJK SC","Songti SC",serif;letter-spacing:.12em;color:#ffe2a8;text-shadow:0 0 22px rgba(220,40,50,.6)}
#dsRoot .who{font-size:clamp(17px,2.4vh,22px);color:#cdbfa6}#dsRoot .who b{color:#fff;font-size:1.15em}
#dsRoot .qt{margin-left:auto;text-align:right}#dsRoot .qt b{display:block;font:900 clamp(34px,5.4vh,54px)/1 "Noto Serif CJK SC",serif;color:#ffd27a}#dsRoot .qt span{font-size:17px;color:#bba;}
#dsRoot .bd{flex:1;overflow:auto;padding:14px 34px 10px}
#dsRoot h2{margin:14px 0 10px;font:800 clamp(20px,2.8vh,26px) "Noto Serif CJK SC",serif;color:#f3d9a0;letter-spacing:.1em}#dsRoot h2 small{font:16px system-ui;color:#a99d88;margin-left:12px;letter-spacing:0}
#dsRoot .gr{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}
#dsRoot .cd{position:relative;padding:14px 16px 14px;border:2px solid rgba(255,255,255,.14);background:linear-gradient(160deg,rgba(40,24,30,.95),rgba(14,9,13,.95));cursor:pointer;display:flex;flex-direction:column;gap:7px;transition:transform .12s,border-color .12s,box-shadow .12s;user-select:none}
#dsRoot .cd:hover{transform:translateY(-3px);border-color:rgba(255,210,122,.6)}
#dsRoot .cd.on{border-color:#ffd27a;box-shadow:0 0 0 2px rgba(255,210,122,.35),0 0 30px rgba(255,150,70,.35),inset 0 0 28px rgba(255,170,80,.12);background:linear-gradient(160deg,rgba(84,44,30,.95),rgba(26,14,12,.95))}
#dsRoot .cd.bad{opacity:.38;cursor:not-allowed;filter:grayscale(.8)}#dsRoot .cd.bad:hover{transform:none;border-color:rgba(255,255,255,.14)}
#dsRoot .cd .ic{font-size:54px;line-height:1;filter:drop-shadow(0 4px 8px #000)}
#dsRoot .cd .nm{font:800 clamp(22px,3vh,28px) "Noto Serif CJK SC",serif;color:#fff}
#dsRoot .cd .ql{display:flex;align-items:center;gap:8px;font-size:16px;color:#cdbfa6}#dsRoot .ql i{flex:1;height:7px;background:rgba(255,255,255,.12);border-radius:4px;overflow:hidden}#dsRoot .ql i b{display:block;height:100%;background:linear-gradient(90deg,#c0503a,#ffd27a)}
#dsRoot .ch{display:flex;flex-wrap:wrap;gap:6px}#dsRoot .ch span{font-size:16px;font-weight:700;padding:3px 10px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.35);color:#ffe9b8}
#dsRoot .ch .s{color:#9fe0a0}#dsRoot .ch .a{color:#9ad0ff}#dsRoot .ch .p{color:#ffb090}#dsRoot .ch .t{color:#e8c8ff}
#dsRoot .nt{font-size:16px;line-height:1.45;color:#b8ab94}
#dsRoot .tk{position:absolute;right:10px;top:8px;font-size:30px;opacity:0;transform:scale(.4);transition:.15s}#dsRoot .cd.on .tk{opacity:1;transform:none}
#dsRoot .ft{display:flex;align-items:center;gap:16px;padding:14px 34px 20px;border-top:1px solid rgba(231,194,122,.35);background:rgba(0,0,0,.35)}
#dsRoot .ft .tip{flex:1;font-size:17px;color:#cdbfa6}
#dsRoot button{font:800 clamp(18px,2.6vh,24px) "Noto Serif CJK SC",serif;letter-spacing:.14em;padding:12px 34px;border:2px solid #b8914a;background:linear-gradient(180deg,#3a2a1a,#1d130b);color:#f3d9a0;cursor:pointer}
#dsRoot button:hover{filter:brightness(1.25)}#dsRoot button.go{background:linear-gradient(180deg,#a8452c,#5a1a10);border-color:#ffb070;color:#fff}#dsRoot button:disabled{opacity:.4;cursor:not-allowed}`;
    document.head.appendChild(st);
  }
  function roll(L) { // 一具尸体只掷一次：哪些部位完好、各自的品质
    if (L.dpool) return L.dpool; const Og = O(), c = L.fo && L.fo.h && L.fo.h.c, boss = !!(L.fo && (L.fo.boss || L.fo.isBoss));
    let own, race, rar, age, tr, af;
    if (c) { own = c.name; race = c.raceN || c.race; rar = c.rar | 0; age = c.age; tr = (c.traits || []).slice(); const a = window.RPG && c.aff && c.aff[0] && RPG.AFF[c.aff[0]]; af = a ? a.n : ''; }
    else { own = L.bst || '野兽'; race = '野兽'; rar = 0; age = 0; tr = []; af = ''; }
    const base = clamp(0.3 + rar * 0.08 + (boss ? 0.2 : 0), 0, 0.85), pool = Og.poolOf(!!c), parts = [];
    for (const t of pool) { const d = Og.OG[t], ok = boss || Math.random() <= (d.p || 1) * (c ? 1 : 0.85); parts.push({ t, ok, og: { t, own, race, rar, age, tr, af, q: +clamp(base + Math.random() * 0.4, 0.1, 1).toFixed(2), oid: own + '|' + (c ? c.id : 'b') } }); }
    return (L.dpool = { own, race, rar, boss, parts, budget: 3 + (rar >= 2 ? 1 : 0) + (boss ? 2 : 0) });
  }
  const chips = (og) => { const e = O().effect(og, 1), a = []; if (e.stat) for (const [k, v] of Object.entries(e.stat)) a.push(`<span class="s">${({ str: '💪力量', con: '❤️体魄', agi: '💨敏捷', ter: '👹胆魄', soul: '🔮魂力' })[k] || k} +${v}</span>`);
    if (e.aura) a.push(`<span class="a">◎ 光环 ${e.aura.r}m ×${e.aura.m}</span>`); if (e.poke) a.push(`<span class="p">⚔ 戳击 ×${e.poke.m}</span>`);
    if (e.tick) a.push(`<span class="t">⏱ ${e.tick.every}s 产出 ${e.tick.kind === 'coin' ? '🔮魂晶' : (Sk() && Sk().IT[e.tick.kind] ? Sk().IT[e.tick.kind].n : e.tick.kind)}×${e.tick.n}</span>`); return a.join(''); };
  function open(L, done) {
    if (!on() || !O() || !Sk()) { if (O()) O().dissect(L); done && done(); return; }
    if (!O().canDissect(L)) return; addCss(); close(true);
    const P = roll(L), sel = new Set(); root = document.createElement('div'); root.id = 'dsRoot';
    const sec = (cat, title, hint) => { const ps = P.parts.filter(p => (O().OG[p.t].cat || 'organ') === cat); if (!ps.length) return ''; return `<h2>${title}<small>${hint}</small></h2><div class="gr">${ps.map(p => { const d = O().OG[p.t]; return `<div class="cd ${p.ok ? '' : 'bad'}" data-t="${p.t}"><div class="tk">✅</div><div class="ic">${d.icon}</div><div class="nm">${esc(d.n)}</div>${p.ok ? `<div class="ql">品质<i><b style="width:${Math.round(p.og.q * 100)}%"></b></i>${Math.round(p.og.q * 100)}%</div><div class="ch">${chips(p.og)}</div><div class="nt">${esc(d.note)}</div>` : '<div class="nt">受损严重，取不出来。</div>'}</div>`; }).join('')}</div>`; };
    root.innerHTML = `<div class="hd"><h1>🔪 战场解剖</h1><div class="who">尸体：<b>${esc(P.own)}</b>　${esc(P.race || '')} · ${O().RN[P.rar] || ''}</div><div class="qt"><span>可取名额</span><b id="dsLeft"></b></div></div><div class="bd">${sec('limb', '💪 肢体', '摆进洞里的标本罐，提供属性 / 光环 / 戳击 / 产出')}${sec('organ', '🫀 内脏', '头部器官不在此列')}</div><div class="ft"><div class="tip" id="dsTip">点卡片选择要取的部位。每一件都有用处；摆成标本生效，也能炼化成魂尘。</div><button id="dsX">放弃</button><button class="go" id="dsGo" disabled>取出</button></div>`;
    document.body.appendChild(root);
    const upd = () => { root.querySelector('#dsLeft').textContent = (P.budget - sel.size) + ' / ' + P.budget; const g = root.querySelector('#dsGo'); g.disabled = !sel.size; g.textContent = sel.size ? `取出 ${sel.size} 件` : '取出'; root.querySelectorAll('.cd').forEach(e => e.classList.toggle('on', sel.has(e.dataset.t))); };
    root.addEventListener('click', e => {
      const c = e.target.closest('.cd'); if (c && !c.classList.contains('bad')) { const t = c.dataset.t; if (sel.has(t)) sel.delete(t); else if (sel.size < P.budget) sel.add(t); else { const tp = root.querySelector('#dsTip'); tp.textContent = '名额用完了——先取消一件再选。'; tp.style.color = '#ff9a8a'; } upd(); return; }
      if (e.target.id === 'dsX') close(); else if (e.target.id === 'dsGo' && sel.size) take(L, P, sel, done);
    });
    addEventListener('keydown', onKey, true); upd();
  }
  function onKey(e) { if (!root) return; if (e.code === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); } else if (e.code !== 'F12') e.stopPropagation(); }
  function take(L, P, sel, done) {
    const S = Sk(), items = S.itemsOf ? S.itemsOf(L) : (L.items = L.items || []); O().defsNow && O().defsNow(); const got = [];
    for (const p of P.parts) if (sel.has(p.t) && p.ok) { const it = O().mkItem(p.og); items.push(it); got.push(it); }
    L.dissected = true; close(); try { if (window.SFX && SFX.play) SFX.play('hit', 0.5, 0.6); } catch (e) { }
    window.G && G.toast && G.toast(`🔪 取出 <b>${got.length}</b> 件：${got.map(i => O().name(i)).join('、')}（已放进尸体旁的战利品）`, '#e88', 3.2); window.G && G.save && G.save(); done && done();
  }
  function close(silent) { removeEventListener('keydown', onKey, true); if (root) root.remove(); root = null; }
  return { open, close, roll, on, get isOpen() { return !!root; } };
})();
