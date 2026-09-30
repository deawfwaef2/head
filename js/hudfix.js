// R40b：底栏不被挡 + 界面更清楚（用户：“我按 F，底部 UI 栏被挡住了，UI 真的看不清楚”）。MOD `hud_legible`（默认开）。
// 做法：① 量出热键栏（#tbBar）顶边 → CSS 变量 --tbH；所有“贴底”的小部件（提示条、[E] 提示、麻袋HUD、手持书、灵契、按键按钮、偷听字幕…）
// 在热键栏出现时统一抬到 --tbH 之上，互相错开；② 热键栏显示时隐藏整行底部提示 #hint（它会从槽位缝隙里透出来糊在栏上）；
// ③ 第二排（Shift+1~0）全空且没按 Shift 时折叠，栏变矮；④ 提示 / 字幕 / 底部提示加深底板、加大字号；⑤ F 拔刀提示改为一行短字（combat.js）。
(() => {
  'use strict';
  const on = () => !window.Mods || !Mods.on || Mods.on('hud_legible') !== false;
  const CSS = `
:root{--tbH:0px}
body.hudl #toast{font-size:19px;max-width:min(62vw,760px);padding:9px 22px;background:rgba(10,6,10,.78);border:1px solid rgba(255,210,122,.35);border-radius:10px;line-height:1.45;top:14%}
body.hudl #toast::before,body.hudl #toast::after{display:none}
body.hudl #hint{font-size:13.5px;color:rgba(248,238,218,.92);text-shadow:0 1px 3px #000,0 0 6px #000}
body.hudl.tbon #hint,body.hudl.tbon #hintTag{display:none!important}
body.hudl #wHint{font-size:16px;color:#fff;background:rgba(8,4,8,.88);border:1px solid rgba(255,210,122,.3);border-radius:8px;padding:8px 22px}
body.hudl.tbon #wHint{bottom:calc(var(--tbH) + 12px)!important}
body.hudl.tbon #wRun{bottom:calc(var(--tbH) + 56px)!important}
body.hudl.tbon #tbCast{bottom:calc(var(--tbH) + 160px)!important}
body.hudl.tbon #skHud{bottom:calc(var(--tbH) + 126px)!important}
body.hudl.tbon #propHint{bottom:calc(var(--tbH) + 92px)!important}
body.hudl.tbon #gacha{bottom:calc(var(--tbH) + 20px)!important}
body.hudl.tbon #bkHeld{bottom:calc(var(--tbH) + 12px)!important}
body.hudl.tbon #kgBtn{bottom:calc(var(--tbH) + 10px)!important}
body.hudl.tbon #spchip{bottom:calc(var(--tbH) + 50px)!important}
body.hudl #kgBtn{background:rgba(12,8,6,.9);color:#f3dfb4;font-size:13px}
body.hudl #tbBar.r2off .tbgrp.g2,body.hudl #tbBar.r2off .r2{display:none}
body.hudl .tbs b{font-size:max(11px,calc(var(--s)*.25));color:#fff3cf}
body.hudl .tbs{border-color:#7a6446}
body.hudl .tbs.em{border-color:#6a5640}body.hudl .tbs.em b{opacity:.85}
body.hudl .tbgrp{background:linear-gradient(#241a1fee,#0f0a0eee)}
body.hudl .bar span,body.hudl .pfl{font-size:13.5px}
`;
  let st = null, tb = null, shift = false;
  addEventListener('keydown', e => { if (e.key === 'Shift') shift = true; }); addEventListener('keyup', e => { if (e.key === 'Shift') shift = false; }); addEventListener('blur', () => { shift = false; });
  function tick() {
    if (!on()) { document.body.classList.remove('hudl'); return; }
    if (!st) { st = document.createElement('style'); st.id = 'hudlCss'; st.textContent = CSS; document.head.appendChild(st); }
    document.body.classList.add('hudl');
    tb = tb || document.getElementById('tbBar');
    try { /* R49d 看门狗：野外（非加载/非死亡/非电影）时，技能栏及相关 HUD 若被行内样式或遗留类藏起来，强制恢复 */
      const Wd = window.Worlds && Worlds.active && Worlds._W;
      if (Wd && !Wd.busy && !Wd.dead && !(window.Saga && Saga.cine)) {
        document.body.classList.remove('sgcine');
        for (const id of ['tbBar', 'tbCol', 'hud', 'wHint', 'hpC']) { const e = document.getElementById(id); if (e) { if (e.style.opacity === '0') e.style.opacity = ''; if (e.style.visibility === 'hidden') e.style.visibility = ''; if (e.style.pointerEvents === 'none' && id !== 'tbBar') e.style.pointerEvents = ''; } }
        if (tb && !tb.classList.contains('on') && window.Talents && Talents.on() && (!window.Mods || Mods.on('talent_ui')) && window.G && G.playing && !G.uiOpen) tb.classList.add('on');
      }
    } catch (e) { }
    let h = 0;
    if (tb && tb.classList.contains('on')) {
      const r2 = tb.querySelectorAll('.r2 .tbs'); const empty = r2.length && [...r2].every(x => x.classList.contains('em'));
      tb.classList.toggle('r2off', !!(empty && !shift));
      const r = tb.getBoundingClientRect(); h = Math.max(0, Math.round(innerHeight - r.top));
    }
    document.documentElement.style.setProperty('--tbB', h + 'px'); try { if (window.HpCenter) h += HpCenter.extra(); } catch (e) { }
    document.documentElement.style.setProperty('--tbH', h + 'px');
  }
  setInterval(tick, 200); addEventListener('load', tick);
  window.HudFix = { tick, get on() { return on(); } };
})();
