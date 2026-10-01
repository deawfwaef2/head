// R54m MOD grand_ui（默认开）：重要抉择 / 结算不再挤在面板角落——全屏仪式感界面。
// GrandUI.choose：大卡片三选一（流派 / 祝福），GrandUI.ceremony：回合结算逐行揭晓 + 总数滚动。键盘 1/2/3、回车、Esc 都能用。
window.GrandUI = (() => {
  const on = () => !window.Mods || Mods.on('grand_ui') !== false;
  const G = () => window.G, esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let root = null, cur = null;
  function css() {
    if (document.getElementById('guCss')) return; const s = document.createElement('style'); s.id = 'guCss'; s.textContent = `
#guRoot{position:fixed;inset:0;z-index:90;display:none;align-items:center;justify-content:center;flex-direction:column;font-family:"Microsoft YaHei UI","PingFang SC",sans-serif;color:#efe4d2;
 background:radial-gradient(ellipse at 50% 42%,rgba(40,18,14,.72) 0%,rgba(6,3,4,.94) 70%);backdrop-filter:blur(5px) saturate(.8)}
#guRoot.on{display:flex;animation:guIn .35s ease-out}@keyframes guIn{from{opacity:0}}
#guRoot .kick{font:600 13px/1 "Microsoft YaHei UI",sans-serif;letter-spacing:.6em;color:#c9a46a;opacity:.85;margin-bottom:12px}
#guRoot .ttl{font:900 clamp(34px,4.2vw,58px)/1.1 "Noto Serif CJK SC","Songti SC",serif;letter-spacing:.18em;color:#f6e3bb;text-shadow:0 0 28px #c0602a88,0 4px 0 #1a0805}
#guRoot .orn{width:min(560px,70vw);height:14px;margin:14px 0 6px;background:radial-gradient(circle at 50% 50%,#e7c27a 0 3px,transparent 4px),linear-gradient(90deg,transparent,#e7c27a88 30%,#e7c27a88 70%,transparent) 0 50%/100% 1px no-repeat}
#guRoot .sub{font-size:15px;color:#cdbb9c;max-width:min(820px,86vw);text-align:center;line-height:1.7;margin-bottom:26px}
#guRoot .cards{display:flex;gap:clamp(14px,2vw,30px);justify-content:center;flex-wrap:wrap;perspective:1200px}
.guC{position:relative;width:clamp(240px,22vw,320px);min-height:clamp(380px,48vh,470px);padding:0 0 18px;cursor:pointer;border:1px solid color-mix(in srgb,var(--c) 55%,#000);border-radius:6px;overflow:hidden;
 background:linear-gradient(180deg,color-mix(in srgb,var(--c) 22%,#1a1012) 0%,#120a0c 46%,#0b0608 100%);box-shadow:0 20px 50px #000c,inset 0 1px 0 #ffffff14;transition:transform .18s,box-shadow .18s,border-color .18s;
 animation:guCard .5s cubic-bezier(.2,1.2,.3,1) both;animation-delay:calc(var(--i) * 90ms);display:flex;flex-direction:column;align-items:center;text-align:center}
@keyframes guCard{from{opacity:0;transform:translateY(40px) rotateX(18deg)}}
.guC:hover,.guC.sel{transform:translateY(-10px) scale(1.03);border-color:var(--c);box-shadow:0 28px 60px #000e,0 0 40px color-mix(in srgb,var(--c) 45%,transparent),inset 0 0 40px color-mix(in srgb,var(--c) 18%,transparent)}
.guC .key{position:absolute;left:10px;top:10px;width:24px;height:24px;border:1px solid #ffffff40;border-radius:50%;font:700 13px/22px sans-serif;color:#fff9;background:#0006}
.guC .rib{position:absolute;right:0;top:14px;padding:3px 12px 3px 16px;font:700 12px sans-serif;letter-spacing:.2em;color:#160a06;background:var(--c);clip-path:polygon(10px 0,100% 0,100% 100%,10px 100%,0 50%)}
.guC .sig{margin:30px 0 8px;width:104px;height:104px;border-radius:50%;display:grid;place-items:center;font-size:54px;background:radial-gradient(circle,color-mix(in srgb,var(--c) 40%,#2a1a14) 0%,#0c0608 70%);border:1px solid color-mix(in srgb,var(--c) 70%,#000);box-shadow:0 0 30px color-mix(in srgb,var(--c) 40%,transparent),inset 0 0 20px #000}
.guC .nm{font:900 28px/1.2 "Noto Serif CJK SC","Songti SC",serif;color:var(--c);letter-spacing:.12em;text-shadow:0 2px 10px #000;margin-top:6px}
.guC .ep{font:italic 600 14px "Noto Serif CJK SC",serif;color:#e8c88c;margin:4px 0 10px;letter-spacing:.06em}
.guC .lv{font:700 12px sans-serif;color:#160a06;background:#e7c27a;border-radius:9px;padding:1px 9px;margin-bottom:8px}
.guC .dv{width:70%;height:1px;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--c) 70%,#fff 0%),transparent);margin:2px 0 12px}
.guC .tx{padding:0 20px;font-size:15px;line-height:1.65;color:#efe2cc;flex:1}.guC .tx b{color:#fff}.guC .tx .hl{color:var(--c);font-weight:700}
.guC .fl{padding:12px 22px 0;font:italic 13px/1.6 "Noto Serif CJK SC",serif;color:#a8977c}
#guRoot .foot{margin-top:28px;display:flex;gap:14px;align-items:center;font-size:13px;color:#a8977c}
#guRoot button.gb{font:700 15px "Microsoft YaHei UI",sans-serif;letter-spacing:.2em;padding:11px 30px;border:1px solid #c9a46a;background:linear-gradient(#3a2414,#1a0e08);color:#f6e3bb;cursor:pointer;border-radius:3px}
#guRoot button.gb:hover{filter:brightness(1.3)}#guRoot button.gb.main{background:linear-gradient(#8a2414,#4a0e08);border-color:#ff9a6a;padding:13px 46px;font-size:17px}
#guRoot .cer{width:min(720px,90vw);max-height:62vh;overflow:auto;padding:6px 4px}
#guRoot .row{display:flex;align-items:center;gap:14px;padding:10px 16px;margin:6px 0;background:linear-gradient(90deg,#2a1810cc,#140c0a66);border-left:3px solid #e7c27a;opacity:0;transform:translateX(-24px);transition:opacity .3s,transform .3s}
#guRoot .row.in{opacity:1;transform:none}#guRoot .row .ic{font-size:26px;width:34px;text-align:center}#guRoot .row .t{flex:1}#guRoot .row .t b{font-size:16px;color:#f6e3bb}#guRoot .row .t small{display:block;color:#b8a688;font-size:12.5px;margin-top:2px}
#guRoot .row .v{font:900 24px "Noto Serif CJK SC",serif;color:#ffd86a;min-width:90px;text-align:right}
#guRoot .ex{margin:10px 0 0;padding:10px 16px;border:1px solid #ffffff18;background:#0006;font-size:13.5px;line-height:1.8;color:#d8c8ff;opacity:0;transition:opacity .4s}#guRoot .ex.in{opacity:1}
#guRoot .tot{margin-top:18px;font:900 clamp(40px,5vw,64px)/1 "Noto Serif CJK SC",serif;color:#ffd86a;text-shadow:0 0 30px #ff9a2a88,0 4px 0 #2a1405;letter-spacing:.06em}
#guRoot .tot small{font-size:.4em;color:#e8d0a0;letter-spacing:.3em;margin-right:12px}`; document.head.appendChild(s);
  }
  function ensure() {
    if (root) return; css(); root = document.createElement('div'); root.id = 'guRoot'; document.body.appendChild(root);
    ['mousedown', 'pointerdown', 'wheel', 'contextmenu'].forEach(ev => root.addEventListener(ev, e => e.stopPropagation()));
    addEventListener('keydown', e => { if (!cur) return; e.stopImmediatePropagation(); if (e.repeat) return; if (cur.key) cur.key(e); }, true);
    addEventListener('keyup', e => { if (cur) e.stopImmediatePropagation(); }, true);
  }
  function open(html, ctl) {
    ensure(); const g = G(); const wasUI = !!(g && g.uiOpen); cur = Object.assign({ wasUI }, ctl); root.innerHTML = html; root.classList.add('on');
    try { if (!wasUI) g.setUI(true); document.exitPointerLock && document.exitPointerLock(); SFX.open && SFX.open(); } catch (e) { }
  }
  function close() {
    if (!cur) return; const c = cur; cur = null; root.classList.remove('on'); root.innerHTML = '';
    try { if (!c.wasUI) { G().setUI(false); G().lockPointer && G().lockPointer(); } SFX.close && SFX.close(); } catch (e) { }
    if (c.after) try { c.after(); } catch (e) { console.warn('GrandUI after', e); }
  }
  const isOpen = () => !!cur;
  function choose(o) {
    const cards = o.cards.map((c, i) => `<div class="guC" data-k="${esc(c.k)}" style="--c:${c.col || '#e7c27a'};--i:${i}"><div class="key">${i + 1}</div>${c.rib ? `<div class="rib">${esc(c.rib)}</div>` : ''}<div class="sig">${c.ic || '✦'}</div>
<div class="nm">${esc(c.name)}</div>${c.epi ? `<div class="ep">「${esc(c.epi)}」</div>` : ''}${c.lv ? `<div class="lv">${esc(c.lv)}</div>` : ''}<div class="dv"></div><div class="tx">${c.html || esc(c.text || '')}</div>${c.fl ? `<div class="fl">${esc(c.fl)}</div>` : ''}</div>`).join('');
    open(`<div class="kick">${esc(o.kicker || '')}</div><div class="ttl">${esc(o.title)}</div><div class="orn"></div><div class="sub">${o.sub || ''}</div><div class="cards">${cards}</div>
<div class="foot">${o.later ? `<button class="gb" data-later>${esc(o.later)}</button>` : ''}<span>点击卡片或按 1 / 2 / 3 选择</span></div>`, {
      key(e) { const n = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code]; if (n != null && o.cards[n]) pick(o.cards[n].k); else if (e.code === 'Escape' && o.later) close(); }
    });
    const pick = k => { const el = root.querySelector(`.guC[data-k="${CSS.escape(k)}"]`); if (el) el.classList.add('sel'); try { SFX.fanfare && SFX.fanfare(2); } catch (e) { } cur.after = () => o.onPick && o.onPick(k); setTimeout(close, 260); };
    root.querySelectorAll('.guC').forEach(el => el.addEventListener('click', () => pick(el.dataset.k)));
    const lt = root.querySelector('[data-later]'); if (lt) lt.addEventListener('click', () => { cur.after = o.onLater; close(); });
  }
  function ceremony(o) {
    const rows = o.rows.map(r => `<div class="row"><div class="ic">${r.ic || '✦'}</div><div class="t"><b>${esc(r.n)}</b>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</div><div class="v" data-v="${r.v}">+0</div></div>`).join('');
    open(`<div class="kick">${esc(o.kicker || '')}</div><div class="ttl">${esc(o.title)}</div><div class="orn"></div><div class="sub">${o.sub || ''}</div><div class="cer">${rows || '<div class="ex in">没有首级在岗——把首级插到建筑上，下次回洞就有收成。</div>'}${(o.extras || []).map(x => `<div class="ex">${x}</div>`).join('')}</div>
<div class="tot"><small>合 计</small>🔮 <span id="guTot">0</span></div><div class="foot"><button class="gb main" data-ok>${esc(o.ok || '收 下')}</button><span>回车 / 空格</span></div>`, {
      key(e) { if (['Enter', 'Space', 'NumpadEnter', 'Escape', 'KeyE'].includes(e.code)) done(); }, after: o.onClose
    });
    const els = [...root.querySelectorAll('.row')], exs = [...root.querySelectorAll('.ex')], tot = root.querySelector('#guTot'); let i = 0, finished = false;
    const count = (node, to, ms) => { const t0 = performance.now(); const f = () => { const k = Math.min(1, (performance.now() - t0) / ms); node.textContent = (node.dataset.v != null ? '+' : '') + Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1 && cur) requestAnimationFrame(f); }; f(); };
    const step = () => { if (!cur || finished) return; if (i < els.length) { const r = els[i++]; r.classList.add('in'); count(r.querySelector('.v'), +r.querySelector('.v').dataset.v, 380); try { SFX.coins && SFX.coins(); } catch (e) { } setTimeout(step, 230); } else { exs.forEach(x => x.classList.add('in')); count(tot, o.total, 900); finished = true; } };
    const done = () => { if (!finished) { finished = true; els.forEach(r => { r.classList.add('in'); r.querySelector('.v').textContent = '+' + r.querySelector('.v').dataset.v; }); exs.forEach(x => x.classList.add('in')); tot.textContent = o.total; return; } close(); };
    root.querySelector('[data-ok]').addEventListener('click', done); setTimeout(step, 350);
  }
  return { on, choose, ceremony, close, isOpen };
})();
