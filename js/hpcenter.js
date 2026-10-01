// R49d MOD hp_center（默认开）：屏幕底部正中的「大血条」——以前血量只在左上角小框里，没人看得见。
// 读取 G.S.hp / G.st().maxHp / Talents.view()（护盾、魂能）。掉血时有白色残影回落；血量 < 35% 红光脉动；< 20% 整屏边缘泛红。
// hudfix.js 会调用 HpCenter.extra()，把它的高度并进 --tbH，让别的贴底提示自动上移，不被遮住。
window.HpCenter = (() => {
  'use strict';
  const on = () => !window.Mods || Mods.on('hp_center') !== false;
  let el = null, prev = -1, ghost = 100, gT = 0, shown = false, lowV = null;
  const CSS = `
#hpC{position:fixed;left:50%;bottom:calc(var(--tbB,0px) + 10px);transform:translateX(-50%);width:min(680px,64vw);z-index:32;pointer-events:none;display:none;font-family:var(--u-serif,serif);user-select:none}
#hpC.on{display:block}
#hpC .hp{position:relative;height:34px;border-radius:9px;background:linear-gradient(#0a0508f2,#1a0a10f2);border:2px solid #d8a25a;box-shadow:0 4px 22px #000c,inset 0 0 14px #000a;overflow:hidden}
#hpC .hp i{position:absolute;left:0;top:0;bottom:0;width:100%;transition:width .12s}
#hpC .hp .g{background:linear-gradient(#fff,#ffb0a0);opacity:.9;transition:none}
#hpC .hp .f{background:linear-gradient(#ff6a5a,#c01830 55%,#7a0c1c)}
#hpC .hp .sh{background:linear-gradient(#cfeeffcc,#6ab0ffcc);mix-blend-mode:screen}
#hpC .hp b{position:absolute;inset:0;text-align:center;line-height:34px;font-size:23px;font-weight:900;letter-spacing:.06em;color:#fff;text-shadow:0 2px 4px #000,0 0 8px #000}
#hpC .hp em{position:absolute;left:12px;top:0;line-height:34px;font-style:normal;font-size:20px;filter:drop-shadow(0 1px 2px #000)}
#hpC .mp{position:relative;height:16px;margin:5px 14% 0;border-radius:6px;background:#0a0a18e6;border:1px solid #4a7ac8;overflow:hidden}
#hpC .mp i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(#7ac4ff,#2a5ac8);transition:width .12s}
#hpC .mp b{position:absolute;inset:0;text-align:center;line-height:16px;font-size:13px;font-weight:800;color:#fff;text-shadow:0 1px 2px #000}
#hpC.low .hp{border-color:#ff4a3a;animation:hpPulse .8s infinite}
#hpC.hit .hp{animation:hpHit .35s}
@keyframes hpPulse{0%,100%{box-shadow:0 4px 22px #000c,0 0 0 rgba(255,60,40,0)}50%{box-shadow:0 4px 22px #000c,0 0 30px rgba(255,60,40,.85)}}
@keyframes hpHit{0%{transform:translateX(-7px)}30%{transform:translateX(6px)}60%{transform:translateX(-3px)}100%{transform:none}}
#hpV{position:fixed;inset:0;z-index:30;pointer-events:none;opacity:0;transition:opacity .4s;background:radial-gradient(ellipse at center,transparent 55%,rgba(180,10,20,.55) 100%)}
#hpV.on{opacity:1;animation:hpVp 1.1s infinite}@keyframes hpVp{50%{opacity:.55}}
body.hubon #hpC,body.sgcine #hpC{display:none!important}
/* ===== R49g 魂能条（MOD mana_ui）：大号、带技能消耗刻度、涨/耗飘字、不足时抖动 ===== */
#hpC .mq{position:relative;margin:7px 2% 0;display:none}#hpC.mqon .mq{display:block}#hpC.mqon .mp{display:none!important}
#hpC .mqr{position:relative;height:0;transition:height .2s}#hpC .mqr.has{height:22px}
#hpC .mqr .tk{position:absolute;bottom:2px;transform:translateX(-50%);min-width:20px;height:19px;padding:0 4px;box-sizing:border-box;border-radius:6px 6px 0 0;background:#10264a;border:1px solid #5ab8ff;border-bottom:0;color:#cfeaff;font-weight:900;font-size:15px;line-height:19px;text-align:center;text-shadow:0 1px 2px #000;transition:.2s}
#hpC .mqr .tk.ok{background:#2a78d8;color:#fff;box-shadow:0 0 10px #5ab8ffcc}
#hpC .mqr .tk.no{opacity:.6}
#hpC .mqb{position:relative;height:32px;border-radius:9px;background:linear-gradient(#050a18f2,#0b1a38f2);border:2px solid #5ab8ff;box-shadow:0 4px 18px #000b,inset 0 0 12px #000;overflow:hidden}
#hpC .mqb .mf{position:absolute;left:0;top:0;bottom:0;width:100%;background:linear-gradient(#b8ecff 0,#4fb4ff 38%,#1f5fe0 100%);transition:width .14s;box-shadow:0 0 14px #5ab8ff}
#hpC .mqb .mf::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,#ffffff66 50%,transparent 70%);background-size:220% 100%;animation:mqSh 2.6s linear infinite}
@keyframes mqSh{from{background-position:120% 0}to{background-position:-120% 0}}
#hpC .mqb .ln{position:absolute;top:0;bottom:0;width:2px;background:#ffffff55;pointer-events:none}
#hpC .mqb .mt{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:10px;font-size:20px;font-weight:900;color:#fff;text-shadow:0 2px 4px #000,0 0 8px #000;letter-spacing:.04em}
#hpC .mqb .mt em{font-style:normal;font-size:19px}#hpC .mqb .mt small{font-size:15px;color:#9fe8ff;font-weight:800}
#hpC.mqon.mlow .mqb{border-color:#ff7a5a;animation:mqLow .9s infinite}
@keyframes mqLow{50%{box-shadow:0 4px 18px #000b,0 0 22px #ff7a5a}}
#hpC.mqon.mfull .mqb{box-shadow:0 4px 18px #000b,0 0 18px #5ab8ffaa}
#hpC .mq.fail .mqb{border-color:#ff4a3a;animation:mqFail .45s}
@keyframes mqFail{0%,100%{transform:none}20%{transform:translateX(-9px)}45%{transform:translateX(8px)}70%{transform:translateX(-4px)}}
#hpC .mq.fail .mf{filter:hue-rotate(160deg) saturate(1.5)}
#hpC .mq .fl{position:absolute;right:14px;top:-8px;font-size:23px;font-weight:900;color:#9fe8ff;text-shadow:0 2px 4px #000,0 0 10px #5ab8ff;pointer-events:none;animation:mqFl 1s forwards}
#hpC .mq .fl.neg{color:#ff9a8a;text-shadow:0 2px 4px #000,0 0 10px #ff5a4a}
@keyframes mqFl{from{transform:translateY(0);opacity:1}to{transform:translateY(-38px);opacity:0}}
#hpC .lv{position:absolute;left:-18px;top:-9px;min-width:46px;height:46px;border-radius:50%;box-sizing:border-box;background:radial-gradient(#6a4438,#1a0f12);border:3px solid #ffd27a;color:#fff;font-weight:900;font-size:21px;display:flex;align-items:center;justify-content:center;text-shadow:0 2px 3px #000;z-index:2;box-shadow:0 3px 10px #000a}
#hpC .lv small{position:absolute;bottom:-9px;font-size:12px;background:#ffd27a;color:#2a1800;border-radius:7px;padding:0 5px;line-height:15px}
#hpC .xp{position:relative;height:6px;margin:5px 4% 0;border-radius:4px;background:#0009;border:1px solid #ffd27a55;overflow:hidden}
#hpC .xp i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#b8841c,#ffd86a);transition:width .3s}
@media (max-width:760px){#hpC .hp b{font-size:18px}}
`;
  function build() {
    if (el) return; const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    el = document.createElement('div'); el.id = 'hpC'; el.innerHTML = '<div class="hp"><i class="g"></i><i class="f"></i><i class="sh"></i><em>❤</em><b></b></div><div class="lv">1<small>Lv</small></div><div class="mp"><i></i><b></b></div><div class="mq"><div class="mqr"></div><div class="mqb"><i class="mf"></i><div class="mt"><em>🔮</em><span class="mn"></span><small class="rg"></small></div></div></div><div class="xp"><i></i></div>'; document.body.appendChild(el);
    lowV = document.createElement('div'); lowV.id = 'hpV'; document.body.appendChild(lowV);
  }
  let mPrev = -1, mSig = '', mFailT = 0, mFailUntil = 0;
  const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  function manaUI(V, g) {
    const mq = el.querySelector('.mq'); if (!V || !V.maxMana) { mq.style.display = 'none'; return; } mq.style.display = '';
    const mx = V.maxMana, m = V.mana, pc = Math.max(0, Math.min(100, m / mx * 100)); const s = g.st();
    mq.querySelector('.mf').style.width = pc + '%';
    const mn = mq.querySelector('.mn'), tx = Date.now() < mFailUntil ? mn._t : `魂能 ${Math.floor(m)} / ${mx}`; if (mn.textContent !== tx) { mn._t = tx; mn.textContent = tx; }
    const inC = V.M && V.M.combat > 0, rg = (s.manaReg || 2) * (inC ? 1 : 1.5), rs = m >= mx - 0.05 ? '满' : `+${rg.toFixed(1)}/秒`, rgEl = mq.querySelector('.rg'); if (rgEl._t !== rs) { rgEl._t = rs; rgEl.textContent = rs; }
    el.classList.toggle('mlow', pc < 25); el.classList.toggle('mfull', pc >= 99.5);
    // 刻度：已装备技能的魂能消耗（数字 = 按键），够用时点亮
    let ticks = []; try { const bar = Talents.tal().bar, SK = TalData.SK; for (let i = 0; i < 10; i++) { const id = bar[i], sk = id && SK[id]; if (sk && sk.cost > 0 && sk.cost <= mx) ticks.push([i, sk.cost]); } } catch (e) { }
    const sig = ticks.map(t => t.join(':')).join(',') + '|' + mx; const rr = mq.querySelector('.mqr'), bb = mq.querySelector('.mqb');
    if (sig !== mSig) { mSig = sig; rr.classList.toggle('has', !!ticks.length); rr.innerHTML = ticks.map(([i, c]) => `<div class="tk" data-c="${c}" style="left:${c / mx * 100}%">${KEYS[i]}</div>`).join(''); bb.querySelectorAll('.ln').forEach(x => x.remove()); for (const [i, c] of ticks) { const l = document.createElement('i'); l.className = 'ln'; l.style.left = `calc(${c / mx * 100}% - 1px)`; bb.insertBefore(l, bb.querySelector('.mt')); } }
    rr.querySelectorAll('.tk').forEach(t => { const ok = m + 0.01 >= +t.dataset.c; t.classList.toggle('ok', ok); t.classList.toggle('no', !ok); });
    // 飘字：涨（命中 / 格挡 / 击杀回魂）与耗（施法）
    if (mPrev >= 0) { const d = m - mPrev; if (d >= 1.2 || d <= -4) { const f = document.createElement('div'); f.className = 'fl' + (d < 0 ? ' neg' : ''); f.textContent = (d > 0 ? '+' : '') + Math.round(d); f.style.right = (14 + Math.random() * 60) + 'px'; mq.appendChild(f); setTimeout(() => f.remove(), 1000); } }
    mPrev = m;
  }
  function manaFail(need) { // 魂能不足：整条抖一下变红，写出差多少（不再只是左上角一闪而过的小字）
    if (!el || !el.classList.contains('on') || !el.classList.contains('mqon')) return false; const mq = el.querySelector('.mq'); mq.classList.remove('fail'); void mq.offsetWidth; mq.classList.add('fail');
    const mn = mq.querySelector('.mn'); mn._t = `魂能不足 · 还差 ${Math.ceil(need)}`; mn.textContent = mn._t; mFailUntil = Date.now() + 800; clearTimeout(mFailT); mFailT = setTimeout(() => mq.classList.remove('fail'), 700); return true;
  }
  function frame() {
    if (!on()) { if (el) { el.classList.remove('on'); lowV.classList.remove('on'); } shown = false; return; }
    const g = window.G; if (!g || !g.S || !g.playing || !g.st) { if (el) el.classList.remove('on'); shown = false; return; }
    build();
    const W = window.Worlds && Worlds.active ? Worlds._W : null, s = g.st(), hp = Math.max(0, g.S.hp), mx = Math.max(1, s.maxHp), pc = Math.min(100, hp / mx * 100);
    const vis = W ? !W.busy : true; // R49f：洞里也常驻（用户：血条要在屏幕底部正中，不要藏在左上角）
    shown = !!vis; el.classList.toggle('on', shown); if (!shown) { lowV.classList.remove('on'); return; }
    let V = null; try { V = window.Talents && Talents.on() ? Talents.view() : null; } catch (e) { }
    const f = el.querySelector('.f'), gh = el.querySelector('.g'), sh = el.querySelector('.sh'), b = el.querySelector('.hp b');
    f.style.width = pc + '%'; const nw = performance.now(); if (pc >= ghost) ghost = pc; else { if (prev >= 0 && hp < prev - 0.5) gT = nw + 450; if (nw > gT) ghost += (pc - ghost) * 0.12; } gh.style.width = ghost + '%';
    sh.style.width = V ? Math.min(100, (V.shield || 0) / mx * 100) + '%' : '0%';
    b.textContent = `${Math.round(hp)} / ${mx}` + (V && V.shield > 0 ? `  +${Math.round(V.shield)}🛡` : '');
    try { const lv = RPG.lvOf(g.S.xp), le = el.querySelector('.lv'); const lt = String(lv.lv); if (le.firstChild.nodeValue !== lt) le.firstChild.nodeValue = lt; el.querySelector('.xp i').style.width = (lv.need ? lv.cur / lv.need * 100 : 100) + '%'; } catch (e) { }
    const mqOn = !window.Mods || Mods.on('mana_ui') !== false; el.classList.toggle('mqon', mqOn);
    if (mqOn) try { manaUI(V, g); } catch (e) { }
    const mp = el.querySelector('.mp'); if (V && V.maxMana) { mp.style.display = ''; mp.firstChild.style.width = Math.min(100, V.mana / V.maxMana * 100) + '%'; mp.lastChild.textContent = `魂能 ${Math.round(V.mana)} / ${V.maxMana}`; } else mp.style.display = 'none';
    if (prev >= 0 && hp < prev - 0.5) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
    prev = hp; el.classList.toggle('low', pc < 35); lowV.classList.toggle('on', pc < 20 && hp > 0);
  }
  const wait = setInterval(() => { if (window.G && G.HOOK) { clearInterval(wait); G.HOOK.frame.push(() => { try { frame(); } catch (e) { } }); setInterval(() => { try { if (!(window.Worlds && Worlds.active)) frame(); } catch (e) { } }, 250); } }, 300);
  return { on, manaFail, extra: () => (on() && shown && el ? Math.round(el.getBoundingClientRect().height) + 12 : 0), get shown() { return shown; } };
})();
