// R38 多语言（中 / 日 / 英）：开局选语言 → 再开始加载；游戏中随时可切换（右上角 🌐）。
// 做法：游戏里的文字都是中文源码，所以不改每个模块，而是在 DOM 层翻译——
//   ① 整句精确匹配（词典 zh → en / ja）；② 带占位符的句型（key 里用 {0} {1} 表示数字/名字，如 '第 {0} 层'）；③ 词组替换（≥2 字的词条，长的优先）。
// 找不到的句子原样显示中文，并记录在 I18N.missing() 里（控制台输入 I18N.dump() 可看到还没翻译的句子，继续往 js/i18n_data*.js 里补即可）。
// 词典：js/i18n_data.js（I18N.add([[zh, en, ja], …])）。JS 里要翻译非 DOM 文字（confirm/alert）用 I18N.t('中文')。
window.I18N = (() => {
  const KEY = 'soulhead_lang', LANGS = [{ id: 'zh', n: '中文', s: '简体中文' }, { id: 'ja', n: '日本語', s: '日本語' }, { id: 'en', n: 'English', s: 'English' }];
  const TITLE_ZH = document.title || '魂首窟 · Soulhead Cave';
  let lang = 'zh', chosen = false; try { const v = localStorage.getItem(KEY); if (v && LANGS.some(l => l.id === v)) { lang = v; chosen = true; } } catch (e) { }
  const EX = { en: new Map(), ja: new Map() }, PAT = { en: [], ja: [] }, PH = { en: new Map(), ja: new Map() }, SUB = { en: null, ja: null }, subSrc = { en: new Map(), ja: new Map() };
  const RULES = []; /* 自定义句型：I18N.rule(/正则/, (m, L, T) => 译文|null) */
  const CJK = /[\u3400-\u9fff\uff00-\uffef]/, missing = new Map(), memo = { en: new Map(), ja: new Map() };
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function add(list) { // [[zh, en, ja], ...]
    for (const r of list) {
      const zh = r[0]; if (!zh) continue;
      ['en', 'ja'].forEach((L, i) => { const out = r[i + 1]; if (out == null || out === '') return;
        if (/\{[#@]?\d+\}/.test(zh)) { const re = new RegExp('^' + esc(zh).replace(/\\\{([#@]?)(\d+)\\\}/g, (m, k) => k === '#' ? '([+\\-]?[\\d.,]+%?)' : k === '@' ? '(.+?)' : '([^·]+?)') + '$'); PAT[L].push({ re, out: out.replace(/\{[#@]?(\d+)\}/g, (m, d) => '$' + (+d + 1)), len: zh.replace(/\{[#@]?\d+\}/g, '').length }); }
        else { EX[L].set(zh, out); if ((zh.length >= 3 || r[3]) && CJK.test(zh)) subSrc[L].set(zh, out); /* 2 字词条默认只做整句匹配，第 4 项给 1 才允许词组替换 */ SUB[L] = null; } });
    }
    memo.en.clear(); memo.ja.clear(); for (const L of ['en', 'ja']) PAT[L].sort((a, b) => b.len - a.len);
    if (lang !== 'zh' && document.body && window.__i18nRW == null) window.__i18nRW = setTimeout(() => { window.__i18nRW = null; FORCE = true; walk(document.body); FORCE = false; }, 60);
  }
  function subRe(L) { if (!SUB[L]) { const ks = [...subSrc[L].keys()].sort((a, b) => b.length - a.length); SUB[L] = ks.length ? new RegExp(ks.map(esc).join('|'), 'g') : /$^/; } return SUB[L]; }

  function tr(text, L) {
    L = L || lang; if (L === 'zh' || !text || !CJK.test(text)) return text;
    const m = memo[L], hit = m.get(text); if (hit !== undefined) return hit;
    const lead = text.match(/^\s*/)[0], trail = text.match(/\s*$/)[0], core = text.trim(); let out = EX[L].get(core);
    if (out === undefined) { for (const p of PAT[L]) { const mm = core.match(p.re); if (mm) { const o = p.out.replace(/\$(\d)/g, (_, d) => { const v = mm[+d] || ''; return CJK.test(v) ? tr(v, L) : v; }); if (o !== core) { out = o; break; } } } }
    if (out === undefined) { for (const r of RULES) { const mm = core.match(r.re); if (mm) { const o = r.f(mm, L, x => tr(x, L)); if (o != null) { out = o; break; } } } }
    if (out === undefined && core.indexOf(' · ') > 0) { /* 「A · B · C」逐段翻译 */ let ch = false; const parts = core.split(' · ').map(x => { const o = tr(x, L); if (o !== x) ch = true; return o; }); if (ch) out = parts.join(' · '); }
    const matched = out !== undefined;
    if (out === undefined) { out = core.replace(subRe(L), s => subSrc[L].get(s)); }
    if (!matched && (out === core || (L === 'en' && CJK.test(out)))) missing.set(core, (missing.get(core) || 0) + 1);
    out = lead + out + trail; if (m.size > 6000) m.clear(); m.set(text, out); return out;
  }

  // 通用句型：开头的表情/符号 + 中文；「标签 数字+单位」
  RULES.push({ re: /^([^\u3400-\u9fffA-Za-z0-9{]+)([\u3400-\u9fff][\s\S]*)$/, f: (m, L, T) => { const o = T(m[2]); return o !== m[2] ? m[1] + o : null; } });
  RULES.push({ re: /^(· ?)?([\u3400-\u9fff]{1,6}) ?([≈+\-]? ?[\d.,\/×]+%? ?(?:ms|m|s|\/s|秒)?)$/, f: (m, L, T) => { const o = T(m[2]); return o !== m[2] ? (m[1] || '') + o + ' ' + m[3] : null; } });

  // ---------- DOM ----------
  const SKIP = 'script,style,textarea,[data-copy],.langtabs,#i18nSel,#i18nBtn,[data-noi18n],#credits';
  let FORCE = false; const TN = new WeakMap(), AN = new WeakMap(), ATTRS = ['title', 'placeholder', 'alt', 'aria-label'];
  const skipEl = el => !el || (el.closest && el.closest(SKIP));
  function doText(n) {
    const v = n.nodeValue, rec = TN.get(n);
    if (rec && v === rec.out) { if (lang === 'zh') { n.nodeValue = rec.zh; TN.delete(n); return; } if (!FORCE) return; n.nodeValue = rec.zh; TN.delete(n); return doText(n); } // 我们自己写进去的
    if (lang === 'zh' || !CJK.test(v) || skipEl(n.parentElement)) return;
    const out = tr(v); if (out !== v) { TN.set(n, { zh: v, out }); n.nodeValue = out; }
  }
  function doAttrs(el) {
    if (!el.getAttribute || skipEl(el)) return;
    for (const a of ATTRS) { const v = el.getAttribute(a); if (v == null) continue; let rec = AN.get(el); const r = rec && rec[a];
      if (r && v === r.out) { if (lang === 'zh') { el.setAttribute(a, r.zh); delete rec[a]; continue; } if (!FORCE) continue; el.setAttribute(a, r.zh); delete rec[a]; doAttrs(el); continue; }
      if (lang === 'zh' || !CJK.test(v)) continue; const out = tr(v); if (out !== v) { if (!rec) AN.set(el, rec = {}); rec[a] = { zh: v, out }; el.setAttribute(a, out); } }
  }
  function walk(root) {
    if (!root) return; if (root.nodeType === 3) { doText(root); return; } if (root.nodeType !== 1 && root.nodeType !== 9) return;
    if (root.nodeType === 1) { if (skipEl(root)) return; doAttrs(root); }
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null); let n = w.nextNode();
    while (n) { if (n.nodeType === 3) doText(n); else doAttrs(n); n = w.nextNode(); }
  }
  let mo = null;
  function startObs() {
    if (mo || !document.documentElement) return;
    mo = new MutationObserver(recs => { for (const r of recs) { if (r.type === 'characterData') doText(r.target); else if (r.type === 'attributes') doAttrs(r.target); else for (const n of r.addedNodes) walk(n); } });
    mo.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  // ---------- 语言状态 ----------
  const listeners = [];
  function set(l, silent) {
    if (!LANGS.some(x => x.id === l)) return; const changed = l !== lang; lang = l; chosen = true; try { localStorage.setItem(KEY, l); } catch (e) { }
    document.documentElement.lang = l === 'zh' ? 'zh-CN' : l;
    if (changed || silent !== false) { memo.en.clear(); memo.ja.clear(); startObs(); FORCE = true; if (document.body) walk(document.body); FORCE = false; const tt = tr(TITLE_ZH); document.title = tt; }
    const tab = document.querySelector('#introCopy [data-lang="' + l + '"]'); if (tab && !tab.classList.contains('on')) tab.click();
    const b = document.getElementById('i18nBtn'); if (b) b.textContent = '🌐 ' + LANGS.find(x => x.id === l).n;
    if (changed) for (const f of listeners) try { f(l); } catch (e) { }
  }
  const rule = (re, f) => RULES.push({ re, f }), t = (s) => tr(s), onChange = f => listeners.push(f);

  // ---------- 选语言界面 ----------
  let readyRes, readyP = new Promise(r => readyRes = r);
  function css() {
    if (document.getElementById('i18nCss')) return; const s = document.createElement('style'); s.id = 'i18nCss'; s.textContent = `
#i18nSel{position:fixed;inset:0;z-index:100000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;background:radial-gradient(ellipse at 50% 35%,#3a0f12 0%,#140709 55%,#050304 100%);color:#f3e2bf;font-family:"Noto Serif SC","Songti SC","Source Han Serif SC",serif;transition:opacity .45s}
#i18nSel.out{opacity:0;pointer-events:none}
#i18nSel .tt{font-size:68px;letter-spacing:18px;padding-left:18px;background:linear-gradient(#fff2c4,#d8a24a 60%,#8a5a1a);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 0 30px rgba(255,150,60,.25)}
#i18nSel .st{font-size:14px;letter-spacing:6px;color:#b79a6a}
#i18nSel .hd{font-size:15px;color:#d9c7a0;letter-spacing:2px;margin-top:6px}
#i18nSel .row{display:flex;gap:22px;flex-wrap:wrap;justify-content:center}
#i18nSel button{width:210px;padding:22px 10px 18px;border:1px solid #8c7148;border-radius:10px;background:linear-gradient(180deg,rgba(60,38,26,.92),rgba(24,14,12,.95));color:#fff0bc;cursor:pointer;font-family:inherit;transition:transform .15s,box-shadow .15s,border-color .15s}
#i18nSel button:hover,#i18nSel button:focus{transform:translateY(-4px);border-color:#ffd27a;box-shadow:0 10px 30px rgba(255,140,40,.25);outline:none}
#i18nSel button b{display:block;font-size:30px;font-weight:600;margin-bottom:6px}#i18nSel button small{display:block;font-size:12px;color:#b79a6a;letter-spacing:1px}
#i18nSel .kb{font-size:12px;color:#7d6a4c}
#i18nBtn{position:fixed;right:10px;top:54px;z-index:99999;padding:3px 10px;border:1px solid rgba(200,170,110,.5);border-radius:14px;background:rgba(18,10,10,.7);color:#e8d6ac;font:12px system-ui,"Noto Sans CJK SC",sans-serif;cursor:pointer;opacity:.55;transition:opacity .15s}
#i18nBtn:hover{opacity:1}
#i18nMenu{position:fixed;right:10px;top:80px;z-index:99999;display:none;flex-direction:column;border:1px solid #8c7148;border-radius:8px;background:rgba(18,10,10,.96);overflow:hidden}
#i18nMenu.on{display:flex}#i18nMenu button{padding:8px 22px;border:0;background:transparent;color:#f0dfb8;font:14px system-ui,"Noto Sans CJK SC",sans-serif;cursor:pointer;text-align:left}#i18nMenu button:hover{background:rgba(255,200,110,.15)}#i18nMenu button.on{color:#ffd27a}`;
    document.head.appendChild(s);
  }
  function corner() { // 右上角切换按钮
    if (document.getElementById('i18nBtn') || !document.body) return; css();
    const b = document.createElement('div'); b.id = 'i18nBtn'; b.textContent = '🌐 ' + LANGS.find(x => x.id === lang).n; b.title = 'Language / 言語 / 语言';
    const m = document.createElement('div'); m.id = 'i18nMenu'; m.innerHTML = LANGS.map(l => `<button data-l="${l.id}">${l.n}</button>`).join('');
    b.addEventListener('click', e => { e.stopPropagation(); m.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.l === lang)); m.classList.toggle('on'); });
    m.addEventListener('click', e => { const x = e.target.closest('button'); if (!x) return; e.stopPropagation(); set(x.dataset.l); m.classList.remove('on'); });
    document.addEventListener('click', () => m.classList.remove('on'));
    ['mousedown', 'pointerdown'].forEach(ev => { b.addEventListener(ev, e => e.stopPropagation()); m.addEventListener(ev, e => e.stopPropagation()); });
    document.body.appendChild(b); document.body.appendChild(m);
  }
  function choose() {
    if (chosen) { set(lang, true); corner(); readyRes(lang); return; }
    css(); const o = document.createElement('div'); o.id = 'i18nSel';
    o.innerHTML = `<div class="tt">魂首窟</div><div class="st">SOULHEAD CAVE · ソウルヘッド洞窟</div><div class="hd">选择语言 · 言語を選択 · Choose your language</div>
<div class="row">${LANGS.map((l, i) => `<button data-l="${l.id}"><b>${l.n}</b><small>${['游戏界面与教程', 'ゲーム画面とチュートリアル', 'Game UI & tutorial'][i]}</small></button>`).join('')}</div><div class="kb">1 · 2 · 3 / Enter</div>`;
    document.body.appendChild(o);
    const pick = id => { set(id); o.classList.add('out'); setTimeout(() => o.remove(), 500); corner(); document.removeEventListener('keydown', kd, true); readyRes(id); };
    const kd = e => { const k = { Digit1: 'zh', Digit2: 'ja', Digit3: 'en', Numpad1: 'zh', Numpad2: 'ja', Numpad3: 'en', Enter: 'zh' }[e.code]; if (k) { e.preventDefault(); e.stopImmediatePropagation(); pick(k); } };
    document.addEventListener('keydown', kd, true);
    o.addEventListener('click', e => { const b = e.target.closest('button'); if (b) pick(b.dataset.l); });
    const b0 = o.querySelector('button'); if (b0) b0.focus();
  }
  // 介绍页里原有的 中文/日本語/English 页签：点它也同步整体语言
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('#introCopy [data-lang]'); if (b && b.dataset.lang !== lang) set(b.dataset.lang); }, true);

  function init() { if (document.body) choose(); else document.addEventListener('DOMContentLoaded', choose, { once: true }); }
  init();
  const dump = () => { const a = [...missing.entries()].sort((x, y) => y[1] - x[1]).map(x => x[0]); console.log(a.join('\n')); return a; };
  return { get lang() { return lang; }, LANGS, add, rule, t, tr, set, ready: () => readyP, onChange, missing: () => [...missing.keys()], dump, walk };
})();
