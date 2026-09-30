// R41主管 · MOD hud_bottom（用户：“底部那一大串文本应该放在底部不然很卡眼，那个技能槽有点大”）
//   R45 把技能栏放大后，hudfix / talents_ui 会把野外提示 #wHint 和洞里的 #hint 抬到技能栏上方 → 一长串字横在画面中下部、正挡视线。
//   改成：① 提示文字贴屏幕最底（技能栏下面）一条细行，小字、半透明底、超长省略；技能栏整体上移 30px 给它让位；
//         ② 技能栏格子 clamp(60,5.4vw,88) → clamp(50,4.6vw,72)（介于 R45 前后之间）；③ 技能用法发光提示字号 18→15，洞里的“出洞后才能释放技能”挪到栏上方的小字；
//         ④ 野外默认提示去掉括号里那一长段战斗说明（F1 按键表里有），见 worlds.js hud()。
//   只加 CSS（body.hbot 前缀 + !important 覆盖 hudfix / talents_ui / ui3a），关 MOD = 原样。不改任何 DOM id。
window.HudBot = (() => {
  const on = () => !window.Mods || !Mods.on || Mods.on('hud_bottom') !== false;
  const css = `
body.hbot{--u:clamp(50px,4.6vw,72px)!important}
body.hbot #tbBar{bottom:34px!important}
body.hbot #wHint,body.hbot.hudl.tbon #wHint,body.hbot.ui3a #wHint{bottom:5px!important;top:auto!important;font-size:13px!important;line-height:18px!important;padding:3px 26px!important;max-width:92vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:.02em;color:rgba(248,238,218,.9)!important;background:linear-gradient(90deg,transparent,rgba(6,3,6,.62) 12%,rgba(6,3,6,.62) 88%,transparent)!important;border:0!important;border-radius:0!important;box-shadow:none!important}
body.hbot #wHint b{font-size:.92em}
body.hbot.tbcave #hint,body.hbot.hudl.tbcave #hint{bottom:5px!important;font-size:13px!important;max-width:92vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
body.hbot #tbBar .tbhint{font-size:15px!important;padding:5px 14px!important}
body.hbot #tbBar .tbhint kbd{font-size:13px!important;min-width:20px!important;padding:0 6px 2px!important}
body.hbot #tbBar.cave::after{position:absolute;left:50%;bottom:calc(100% + 4px);transform:translateX(-50%);white-space:nowrap;margin:0!important;font-size:13px!important;opacity:.85}
body.hbot #tbBar.cave .tbhint{bottom:calc(100% + 26px)!important}
`;
  let st = null;
  function apply() {
    const v = on();
    if (v && !st) { st = document.createElement('style'); st.id = 'hudBotCss'; st.textContent = css; document.head.appendChild(st); }
    if (document.body) document.body.classList.toggle('hbot', v);
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', apply); else apply();
  setInterval(apply, 1000); // MOD 面板切换后 1 秒内生效
  return { on, apply };
})();
