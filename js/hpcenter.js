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
#hpC .lv{position:absolute;left:-18px;top:-9px;min-width:46px;height:46px;border-radius:50%;box-sizing:border-box;background:radial-gradient(#6a4438,#1a0f12);border:3px solid #ffd27a;color:#fff;font-weight:900;font-size:21px;display:flex;align-items:center;justify-content:center;text-shadow:0 2px 3px #000;z-index:2;box-shadow:0 3px 10px #000a}
#hpC .lv small{position:absolute;bottom:-9px;font-size:12px;background:#ffd27a;color:#2a1800;border-radius:7px;padding:0 5px;line-height:15px}
#hpC .xp{position:relative;height:6px;margin:5px 4% 0;border-radius:4px;background:#0009;border:1px solid #ffd27a55;overflow:hidden}
#hpC .xp i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#b8841c,#ffd86a);transition:width .3s}
@media (max-width:760px){#hpC .hp b{font-size:18px}}
`;
  function build() {
    if (el) return; const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    el = document.createElement('div'); el.id = 'hpC'; el.innerHTML = '<div class="hp"><i class="g"></i><i class="f"></i><i class="sh"></i><em>❤</em><b></b></div><div class="lv">1<small>Lv</small></div><div class="mp"><i></i><b></b></div><div class="xp"><i></i></div>'; document.body.appendChild(el);
    lowV = document.createElement('div'); lowV.id = 'hpV'; document.body.appendChild(lowV);
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
    const mp = el.querySelector('.mp'); if (V && V.maxMana) { mp.style.display = ''; mp.firstChild.style.width = Math.min(100, V.mana / V.maxMana * 100) + '%'; mp.lastChild.textContent = `魂能 ${Math.round(V.mana)} / ${V.maxMana}`; } else mp.style.display = 'none';
    if (prev >= 0 && hp < prev - 0.5) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
    prev = hp; el.classList.toggle('low', pc < 35); lowV.classList.toggle('on', pc < 20 && hp > 0);
  }
  const wait = setInterval(() => { if (window.G && G.HOOK) { clearInterval(wait); G.HOOK.frame.push(() => { try { frame(); } catch (e) { } }); setInterval(() => { try { if (!(window.Worlds && Worlds.active)) frame(); } catch (e) { } }, 250); } }, 300);
  return { on, extra: () => (on() && shown ? 80 + ((el && el.querySelector('.mp').style.display !== 'none') ? 21 : 0) : 0), get shown() { return shown; } };
})();
