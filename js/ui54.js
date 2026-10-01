// R54 MOD ui_refine（默认开）：HUD / 菜单精修——更接近 3A 动作游戏的克制风格（只加一层 CSS，不动任何结构和逻辑；关掉 = 原样）
// 细血条 + 魂能细条（数字移到条外、等宽数字）、技能栏细金边方格、命中数字与敌人细血条、极简准星、横幅式提示、毛玻璃面板与衬线标题。
window.UI54 = (() => {
  const on = () => !window.Mods || Mods.on('ui_refine') !== false;
  const NUM = 'Bahnschrift,"DIN Alternate","Segoe UI Semibold","Segoe UI",system-ui,sans-serif';
  const CJK = '"Microsoft YaHei UI","PingFang SC","Noto Sans CJK SC",sans-serif';
  const SERIF = '"Noto Serif SC","Source Han Serif SC","Songti SC","STSong",serif';
  const CSS = `
body.u54{--u:clamp(50px,4.3vw,72px);--g54:#e1c07e;--l54:rgba(232,205,160,.24);--p54:rgba(13,11,15,.8)}
/* 血条 / 魂能 */
body.u54 #hpC{width:min(540px,44vw);font-family:${NUM}}
body.u54 #hpC .hp{height:13px!important;border-radius:2px;border:1px solid var(--l54);background:linear-gradient(#0a070acc,#1a0d12e6);box-shadow:0 0 0 1px #000a,0 8px 22px #0009;overflow:visible}
body.u54 #hpC .hp i{border-radius:1px}
body.u54 #hpC .hp .f{background:linear-gradient(180deg,#e9584b 0%,#ad1b2d 52%,#650a18 100%)}
body.u54 #hpC .hp .f::after{content:"";position:absolute;left:0;right:0;top:0;height:1px;background:#ffd8c855}
body.u54 #hpC .hp .g{background:#f4dcc0;opacity:.7}
body.u54 #hpC .hp b{inset:auto 0 calc(100% + 3px) auto!important;line-height:1!important;font-size:13px!important;font-weight:600!important;letter-spacing:.1em;color:#efe5d4;text-shadow:0 1px 2px #000,0 0 6px #000a;font-variant-numeric:tabular-nums}
body.u54 #hpC .hp em{display:none}
body.u54 #hpC.low .hp{border-color:#e0423a99;animation:u54low 1.1s ease-in-out infinite}
@keyframes u54low{50%{box-shadow:0 0 0 1px #000a,0 0 18px #e0423a88}}
body.u54 #hpC .mqb{height:7px!important;border-radius:2px;border:1px solid rgba(134,198,255,.28);background:#04081299;box-shadow:0 0 0 1px #000a;overflow:visible}
body.u54 #hpC .mqb .mf{background:linear-gradient(180deg,#9fd4ff,#3b7bd8 60%,#1d3f8a);box-shadow:none}
body.u54 #hpC .mqb .mf::after{display:none}
body.u54 #hpC .mqb .ln{background:#ffffff30}
body.u54 #hpC .mqb .mt{inset:50% auto auto calc(100% + 8px)!important;transform:translateY(-50%);white-space:nowrap;justify-content:flex-start;font-size:12px!important;font-weight:600;letter-spacing:.08em;color:#bfe0ff;font-variant-numeric:tabular-nums}
body.u54 #hpC .mqb .mt em{font-size:11px}body.u54 #hpC .mqb .mt small{font-size:11px}
body.u54 #hpC .mqr.has{height:13px}
body.u54 #hpC .mqr .tk{height:12px;min-width:14px;font:600 10px/12px ${NUM};border-radius:2px 2px 0 0;background:#0d1a30;border-color:#4a86c8}
body.u54 #hpC .mqr .tk.ok{background:#2d64b8;box-shadow:none}
body.u54 #hpV{background:radial-gradient(ellipse at center,transparent 62%,rgba(150,8,18,.42) 100%)}
/* 技能栏 */
body.u54 .tbgrp{gap:4px;padding:5px;border-radius:3px;border:1px solid rgba(232,205,160,.14);background:linear-gradient(#0e0c10d9,#070608eb);box-shadow:0 12px 30px #000a}
body.u54 .tbs{border-radius:3px;border:1px solid var(--l54);background:radial-gradient(130% 120% at 50% 0%,#2a2329,#0d0a0d 72%);box-shadow:inset 0 1px 0 #fff1d214,inset 0 0 14px #000c}
body.u54 .tbs b{background:none;border:0;left:4px;top:3px;padding:0;min-width:0;font:600 12px/1 ${NUM};color:#d8c7a2;text-shadow:0 1px 2px #000}
body.u54 .tbs u{font:600 11px/1 ${NUM};color:#8fc8ff}
body.u54 .tbs em{font-family:${NUM};font-weight:600}
body.u54 .tbs.em{border-style:solid;opacity:.5}
body.u54 .tbs.glow{border-color:var(--g54);box-shadow:0 0 0 1px #e1c07e55,0 0 14px #e1c07e55,inset 0 0 10px #e1c07e2a;animation:none}
body.u54 .tbt{border-radius:3px;border:1px solid rgba(232,205,160,.3);background:linear-gradient(#211a14,#0c0907);font-weight:700;letter-spacing:.06em}
body.u54 #tbBar.cave::after{font:600 13px ${CJK};letter-spacing:.1em;color:#d8c7a2}
/* 命中数字 / 敌人血条 / 准星 */
body.u54 #hitHud .hn{font-family:${NUM};font-weight:700;color:#fff3de;letter-spacing:.02em;text-shadow:0 0 1px #000,0 1px 0 #000,0 2px 7px #000c}
body.u54 #hitHud .hn.big{color:#ffb257;text-shadow:0 0 1px #000,0 2px 0 #3a0a00,0 0 16px #ff6a2a8c}
body.u54 #hitHud .hb{width:96px}
body.u54 #hitHud .hb .nm{font:600 11px ${CJK};letter-spacing:.08em;color:#ecdfca}
body.u54 #hitHud .hb .tr{height:4px;border-radius:0;background:#000c;border:1px solid rgba(232,205,160,.28);box-shadow:none}
body.u54 #hitHud .hb .fl{background:linear-gradient(#e9584b,#8f1424)}
body.u54 #cross{width:4px;height:4px;margin:-2px 0 0 -2px;background:#f4ead8;box-shadow:0 0 0 1px #0009,0 0 6px #0007}
body.u54 #cross.active{width:18px;height:18px;margin:-9px 0 0 -9px;background:transparent;border:1px solid #ff6a5a;box-shadow:0 0 6px #ff3a2a88}
/* 提示横幅 */
body.u54 #toast{font:600 17px/1.45 ${CJK};letter-spacing:.06em;padding:9px 56px;background:linear-gradient(90deg,transparent,rgba(9,7,10,.78) 16%,rgba(9,7,10,.78) 84%,transparent);border-top:1px solid;border-bottom:1px solid;border-image:linear-gradient(90deg,transparent,rgba(232,205,160,.42),transparent) 1;text-shadow:0 1px 2px #000}
/* 面板 */
body.u54 .modal{backdrop-filter:blur(14px) saturate(1.08);-webkit-backdrop-filter:blur(14px);background:linear-gradient(160deg,rgba(24,19,24,.88),rgba(9,7,10,.94))!important;border:1px solid rgba(232,205,160,.22)!important;box-shadow:0 30px 90px #000d,inset 0 1px 0 #fff0d20f!important}
body.u54 .m-title,body.u54 .modal h2,body.u54 .modal h3{font-family:${SERIF};font-weight:600;letter-spacing:.16em}
body.u54 .modal button:not(.m-close){letter-spacing:.06em}
body.u54 #menu .bigbtn{letter-spacing:.2em;font-family:${SERIF};font-weight:600}
`;
  function apply() {
    if (!on() || document.getElementById('u54css')) return;
    const s = document.createElement('style'); s.id = 'u54css'; s.textContent = CSS; document.head.appendChild(s);
    document.body.classList.add('u54');
  }
  if (document.body) apply(); else addEventListener('DOMContentLoaded', apply);
  return { on, apply };
})();
