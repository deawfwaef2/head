// R64 难度系统（MOD diff_select，默认开）：开局选择 / 随时在 Tab「系统 → 难度」里调整，也可以自己拖滑块。
// 四档预设（安魂 / 血月 / 黑潮 / 无光）+ 自定义：敌人生命、敌人伤害、宿敌成长速度、野外战利品。
// 叙事差异：BOSS 登场语、倒下语、宿敌来袭语、界面色调（body[data-diff] → ui63 的 --k-* 变量）。
// 倍率落点：foe.js populate（生命）· worlds.js hitPlayer（伤害）· nemesis.js（宿敌成长）· G.addCoins（野外战利品）。
window.Diff = (() => {
  const on = () => !window.Mods || !Mods.on || Mods.on('diff_select') !== false;
  const LV = [
    { k: 'calm', n: '安魂', en: 'Requiem', ja: '鎮魂', ic: '🕯️', col: '#f0d8a0', c: { hp: 0.7, dmg: 0.6, nem: 0.5, loot: 1.0 },
      tag: '月亮很温柔。你只是个迷了路的食人魔。',
      story: '洞里的火一直没灭。远处的人们怕你，却没有人真想死在你手里。猎手追得很慢，像是在给你留时间。适合想慢慢收首级、把每一段故事看完的夜晚。',
      boss: '她握剑的手在抖——她也不想走到这一步。', fall: '她倒下得很安静，像是终于被允许休息。', nem: '她追得很慢，像是在给你时间。', arrive: '风里没有杀气，只有炊烟。' },
    { k: 'blood', n: '血月', en: 'Blood Moon', ja: '血月', ic: '🌕', col: '#e7c27a', c: { hp: 1, dmg: 1, nem: 1, loot: 1 },
      tag: '月亮在看。每一个活着回洞的夜晚，都是赢来的。',
      story: '标准的猎杀与被猎杀。敌人会犯错，也会把你逼到墙角；你放进展厅的每一颗首级，外面都有人记得她的名字。',
      boss: '她挡住了去路。月亮在看。', fall: '月光落在她的脖颈上——够你下刀了。', nem: '她们记得你的每一颗头。', arrive: '有人在暗处数你的脚步。' },
    { k: 'black', n: '黑潮', en: 'Black Tide', ja: '黒潮', ic: '🌊', col: '#9fd0f0', c: { hp: 1.35, dmg: 1.4, nem: 1.5, loot: 1.15 },
      tag: '仇恨在发酵。她们不再迟疑。',
      story: '敌人更硬、更狠，宿敌成长更快。黑潮漫过脚踝的时候，没人会再给你第二次机会——但战利品也更肥。',
      boss: '黑潮漫过脚踝，她已经等你很久了。', fall: '黑潮退去一寸。你知道，下一个更难。', nem: '仇恨在发酵——她已不是上次的她。', arrive: '空气发冷。所有人都握紧了武器。' },
    { k: 'void', n: '无光', en: 'Unlit', ja: '無光', ic: '🕳️', col: '#ff8a7a', c: { hp: 1.8, dmg: 2.0, nem: 2.2, loot: 1.35 },
      tag: '没有光了。只剩你，和一个不会有人听见的结局。',
      story: '几乎每一场战斗都能一击改写结局，宿敌疯狂成长，战利品极其丰厚——前提是你能带回来。给想把每一刀都当成最后一刀的人。',
      boss: '没有光了。只剩你和她。', fall: '没有人欢呼。黑暗只是换了一个人看着你。', nem: '她们不再追你——她们只是在等你停下。', arrive: '连风都屏住了呼吸。' }
  ];
  const LABEL = { hp: '敌人生命', dmg: '敌人伤害', nem: '宿敌成长', loot: '野外战利品' };
  const RANGE = { hp: [0.4, 3, 0.05], dmg: [0.3, 3, 0.05], nem: [0, 3, 0.1], loot: [0.5, 2.5, 0.05] };
  const S = () => { const g = window.G; if (!g || !g.S) return null; if (!g.S.diff) g.S.diff = { k: 'blood', set: 0, c: null }; return g.S.diff; };
  const byK = k => LV.find(l => l.k === k) || LV[1];
  const cur = () => { const s = S(); if (!s) return LV[1]; if (s.k === 'custom') return { k: 'custom', n: '自定义', en: 'Custom', ja: 'カスタム', ic: '🎚️', col: '#d8c8ff', c: Object.assign({ hp: 1, dmg: 1, nem: 1, loot: 1 }, s.c || {}), tag: '你亲手调的难度。', story: '每一格滑块都是你自己的选择。', boss: byK('blood').boss, fall: byK('blood').fall, nem: byK('blood').nem, arrive: byK('blood').arrive }; return byK(s.k); };
  const m = k => on() ? (cur().c[k] || 1) : 1;
  const voice = k => on() ? (cur()[k] || '') : '';
  function apply() { try { document.body.dataset.diff = on() ? cur().k : ''; } catch (e) { } }
  function set(k, c) { const s = S(); if (!s) return; s.k = k; s.set = 1; if (k === 'custom') s.c = Object.assign({}, c); else s.c = null; apply(); try { G.save && G.save(); } catch (e) { } paintBtn(); }

  // ---------------- 界面 ----------------
  let root = null, css0 = 0, onDone = null, draft = null;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fx = v => '×' + (+v).toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  function addCss() {
    if (css0) return; css0 = 1; const s = document.createElement('style'); s.id = 'dfCss'; s.textContent = `
#dfRoot{position:fixed;inset:0;z-index:136;display:none;align-items:center;justify-content:flex-start;flex-direction:column;background:radial-gradient(ellipse at 50% 38%,rgba(34,12,16,.985),rgba(2,1,3,.995));color:#eadfca;font-family:var(--u-serif,"Noto Serif SC","Songti SC",serif);user-select:none;overflow:auto;padding:22px 20px 26px;box-sizing:border-box}
#dfRoot>:first-child{margin-top:auto}#dfRoot>:last-child{margin-bottom:auto}
#dfRoot.on{display:flex;animation:dfIn .5s cubic-bezier(.16,.9,.2,1) both}@keyframes dfIn{from{opacity:0;transform:scale(1.02)}}
#dfRoot h1{margin:0;font:900 clamp(30px,4.4vh,46px)/1.1 inherit;letter-spacing:.5em;text-indent:.5em;background:linear-gradient(180deg,#fff8e2,#e7c27a 55%,#b98a45);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 2px 10px rgba(0,0,0,.9))}
#dfRoot .sub{margin:10px 0 22px;font-size:14px;letter-spacing:.3em;color:#a8977c;text-align:center;max-width:760px;line-height:1.9}
#dfRoot .cards{display:grid;grid-template-columns:repeat(5,minmax(168px,236px));gap:14px;justify-content:center;max-width:100%}
@media (max-width:1180px){#dfRoot .cards{grid-template-columns:repeat(3,minmax(168px,236px))}}
#dfRoot .cd{--c:#e7c27a;position:relative;display:flex;flex-direction:column;gap:8px;padding:20px 18px 18px;border:0;text-align:left;cursor:pointer;color:inherit;font:inherit;background:linear-gradient(170deg,rgba(32,22,28,.96),rgba(10,6,9,.98));box-shadow:inset 0 0 0 1px rgba(231,194,122,.18),0 14px 40px rgba(0,0,0,.6);transition:transform .25s cubic-bezier(.16,.9,.2,1),box-shadow .25s}
#dfRoot .cd::before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:var(--c);opacity:.55;transition:opacity .2s}
#dfRoot .cd:hover{transform:translateY(-6px)}#dfRoot .cd.on{transform:translateY(-6px);box-shadow:inset 0 0 0 1px var(--c),0 0 40px color-mix(in srgb,var(--c) 30%,transparent),0 18px 50px rgba(0,0,0,.7)}#dfRoot .cd.on::before{opacity:1;height:4px}
#dfRoot .cd .ic{font-size:34px;filter:drop-shadow(0 0 12px var(--c))}#dfRoot .cd .nm{font:900 26px/1 inherit;letter-spacing:.3em;color:var(--c)}#dfRoot .cd .en{font-size:11px;letter-spacing:.4em;color:#8f8068;margin-top:-4px}
#dfRoot .cd .tg{font-size:13.5px;line-height:1.7;color:#f0e4cc;font-weight:700;min-height:46px}#dfRoot .cd .st{font-size:12.5px;line-height:1.8;color:#b8a98c}
#dfRoot .cd .mx{display:grid;grid-template-columns:1fr auto;gap:2px 10px;margin-top:4px;padding-top:8px;border-top:1px solid rgba(231,194,122,.16);font:600 12px/1.7 system-ui,sans-serif;color:#a8977c}#dfRoot .cd .mx b{color:#fff0c4;text-align:right}
#dfRoot .adv{margin-top:20px;width:min(940px,100%);box-sizing:border-box;padding:14px 20px;background:rgba(10,6,9,.72);box-shadow:inset 0 0 0 1px rgba(231,194,122,.2)}
#dfRoot .adv>b{display:block;margin-bottom:8px;font-size:13px;letter-spacing:.3em;color:#e7c27a}
#dfRoot .row{display:grid;grid-template-columns:110px 1fr 64px;gap:12px;align-items:center;font:600 13px/2 system-ui,sans-serif;color:#cbbd9f}
#dfRoot .row input{width:100%;accent-color:#e7c27a}#dfRoot .row em{font-style:normal;text-align:right;color:#fff0c4;font-weight:800}
#dfRoot .ft{display:flex;gap:16px;margin-top:22px;align-items:center}
#dfRoot .ft button{position:relative;padding:11px 36px;border:0;cursor:pointer;font:900 17px/1 inherit;letter-spacing:.34em;text-indent:.34em;color:#fff2d8;background:linear-gradient(180deg,#a8201a,#4a0a08);box-shadow:inset 0 0 0 1px rgba(255,214,150,.5),0 8px 28px rgba(0,0,0,.6);transition:filter .2s,transform .15s}
#dfRoot .ft button:hover{filter:brightness(1.25);transform:translateY(-2px)}#dfRoot .ft button.g{background:linear-gradient(180deg,#2a1c22,#150d12);color:#cbbd9f;font-size:14px}
#dfRoot .hint{font-size:12px;color:#8f8068;letter-spacing:.15em}
#dfBtn{display:block}`;
    document.head.appendChild(s);
  }
  function paintCards() {
    if (!root) return; const sel = draft.k;
    root.querySelectorAll('.cd').forEach(c => c.classList.toggle('on', c.dataset.k === sel));
    const adv = root.querySelector('.adv'); adv.style.display = sel === 'custom' ? 'block' : 'none';
    const base = sel === 'custom' ? draft.c : byK(sel).c; for (const k in RANGE) { const i = root.querySelector(`input[data-k="${k}"]`), e = root.querySelector(`em[data-k="${k}"]`); if (i) { i.value = base[k]; } if (e) e.textContent = fx(base[k]); }
    const cu = root.querySelector('.cd[data-k="custom"] .mx'); if (cu) cu.innerHTML = Object.keys(RANGE).map(k => `<span>${LABEL[k]}</span><b>${fx(draft.c[k])}</b>`).join('');
  }
  function build() {
    if (root) return; addCss(); root = document.createElement('div'); root.id = 'dfRoot'; root.setAttribute('data-noi18n', '');
    const card = (l) => `<button class="cd" data-k="${l.k}" style="--c:${l.col}"><span class="ic">${l.ic}</span><span class="nm">${esc(l.n)}</span><span class="en">${esc(l.en.toUpperCase())}</span><span class="tg">${esc(l.tag)}</span><span class="st">${esc(l.story || '')}</span><span class="mx">${Object.keys(RANGE).map(k => `<span>${LABEL[k]}</span><b>${fx(l.c[k])}</b>`).join('')}</span></button>`;
    const cu = { k: 'custom', n: '自定义', en: 'Custom', ic: '🎚️', col: '#d8c8ff', tag: '自己决定这一晚有多黑。', story: '拖动下面的滑块，分别调节敌人的生命、伤害、宿敌成长速度和战利品。', c: { hp: 1, dmg: 1, nem: 1, loot: 1 } };
    root.innerHTML = `<h1>选择今夜的月色</h1><div class="sub">难度决定的不只是数字——敌人的台词、BOSS 的登场、宿敌的口气，甚至界面的颜色，都会跟着变。<br>之后随时可以在 Tab →「系统 → 难度」里改。</div>
<div class="cards">${LV.map(card).join('')}${card(cu)}</div>
<div class="adv">${Object.keys(RANGE).map(k => `<div class="row"><span>${LABEL[k]}</span><input type="range" data-k="${k}" min="${RANGE[k][0]}" max="${RANGE[k][1]}" step="${RANGE[k][2]}"><em data-k="${k}"></em></div>`).join('')}</div>
<div class="ft"><button class="g" data-x="1">稍后再说</button><button data-ok="1">就这样</button></div><div class="hint">1–4 快选 · Enter 确定 · Esc 取消</div>`;
    document.body.appendChild(root);
    root.addEventListener('click', e => { const c = e.target.closest('.cd'); if (c) { draft.k = c.dataset.k; paintCards(); try { SFX.click && SFX.click(); } catch (x) { } return; } if (e.target.closest('[data-ok]')) return confirm(); if (e.target.closest('[data-x]')) return close(true); });
    root.addEventListener('input', e => { const i = e.target.closest('input[data-k]'); if (!i) return; draft.c[i.dataset.k] = +i.value; const em = root.querySelector(`em[data-k="${i.dataset.k}"]`); if (em) em.textContent = fx(+i.value); const cu = root.querySelector('.cd[data-k="custom"] .mx'); if (cu) cu.innerHTML = Object.keys(RANGE).map(k => `<span>${LABEL[k]}</span><b>${fx(draft.c[k])}</b>`).join(''); });
    ['mousedown', 'pointerdown', 'wheel', 'keyup'].forEach(ev => root.addEventListener(ev, e => e.stopPropagation()));
    addEventListener('keydown', e => { if (!root || !root.classList.contains('on')) return; e.stopImmediatePropagation(); if (e.code === 'Escape') { e.preventDefault(); close(true); } else if (e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); confirm(); } else if (/^Digit[1-5]$/.test(e.code)) { draft.k = [...LV.map(l => l.k), 'custom'][+e.code.slice(5) - 1]; paintCards(); } }, true);
  }
  function open(cb) {
    if (!on()) { if (cb) cb(); return; } build(); const s = S(), c0 = cur(); draft = { k: s && s.set ? c0.k : 'blood', c: Object.assign({ hp: 1, dmg: 1, nem: 1, loot: 1 }, (s && s.c) || (s && s.k === 'custom' ? {} : c0.c)) };
    onDone = cb || null; try { document.exitPointerLock && document.exitPointerLock(); } catch (e) { } paintCards(); root.classList.add('on'); try { window.G && G.playing && G.setUI && G.setUI(true); } catch (e) { }
    try { window.G && G.playing && window.Hub && Hub.sync && Hub.sync(); } catch (e) { }
  }
  function close(cancel) {
    if (!root) return; root.classList.remove('on'); try { window.G && G.playing && G.setUI && G.setUI(false); } catch (e) { } const cb = onDone; onDone = null; try { window.G && G.playing && window.Hub && Hub.sync && Hub.sync(); } catch (e) { } if (!cancel && cb) setTimeout(cb, 60);
  }
  function confirm() { set(draft.k, draft.c); try { SFX.levelup && SFX.levelup(); } catch (e) { } close(false); try { window.G && G.toast && G.toast(`${cur().ic} 难度：${cur().n} —— ${cur().tag}`, cur().col, 4); } catch (e) { } }
  const isOpen = () => !!(root && root.classList.contains('on'));

  // ---------------- 标题界面：难度按钮 + 首次开始前拦截 ----------------
  let btn = null;
  function paintBtn() { if (btn) btn.innerHTML = `${cur().ic} 难度：<b style="color:${cur().col}">${esc(cur().n)}</b>`; }
  function hookMenu() {
    if (!on()) return; const menu = document.getElementById('menu'), sb = document.getElementById('startBtn'); if (!menu || !sb || btn) return;
    btn = document.createElement('button'); btn.id = 'dfBtn'; btn.className = 'smallbtn'; btn.setAttribute('data-noi18n', ''); btn.addEventListener('click', e => { e.stopPropagation(); open(); });
    const mb = document.getElementById('modBtn'); (mb && mb.parentNode ? mb.parentNode : sb.parentNode).insertBefore(btn, mb ? mb.nextSibling : sb.nextSibling); paintBtn();
    document.addEventListener('click', e => { const t = e.target.closest && e.target.closest('#startBtn'); if (!t || !needPick() || e.__dfRe) return; e.stopImmediatePropagation(); e.preventDefault(); open(() => { const ev = new MouseEvent('click', { bubbles: true, cancelable: true }); ev.__dfRe = true; sb.dispatchEvent(ev); }); }, true);
  }
  const needPick = () => { const s = S(); return on() && !!s && !s.set; };
  function hookCoins() { const g = window.G; if (!g || !g.addCoins || g.__dfc) return; const c0 = g.addCoins; g.addCoins = function (n) { if (on() && n > 0 && window.Worlds && Worlds.active) { const k = m('loot'); if (k !== 1) n = Math.round(n * k); } return c0.apply(this, arguments.length ? [n].concat([].slice.call(arguments, 1)) : arguments); }; g.__dfc = 1; }
  setInterval(() => { try { if (window.G && G.S) { apply(); hookMenu(); paintBtn(); hookCoins(); } } catch (e) { } }, 600);
  return { on, LV, cur, hp: () => m('hp'), dmg: () => m('dmg'), nem: () => m('nem'), loot: () => m('loot'), voice, set, open, close, isOpen, needPick };
})();
