// R36 角色成长重做 · 界面（window.TalUI，MOD talent_ui）：魔兽式 2×10 大快捷栏 / 玩家框 / 目标框 / 增益图标 + T 键「角色·天赋·技能书·流派」大面板
(() => {
  const D = window.TalData, T = () => window.Talents;
  const uiOn = () => !window.Mods || Mods.on('talent_ui');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const G0 = () => window.G, WW = () => (window.Worlds && Worlds.active ? Worlds._W : null);
  const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const ui = { open: false, tab: 'attr', sch: 'blade', built: false };
  let elBar, elCol, elPn, elTip, elCast;

  // ================= 样式 =================
  const CSS = `
:root{--u:clamp(46px,4.4vw,68px)}
#tbBar{position:fixed;left:50%;bottom:10px;transform:translateX(-50%);z-index:31;display:none;pointer-events:none;user-select:none}
#tbBar.on{display:block}#tbBar.ptr{pointer-events:auto}
.tbxp{height:8px;margin:0 6px 7px;border-radius:5px;background:#000a;border:1px solid #ffd27a55;overflow:hidden;position:relative}.tbxp i{display:block;height:100%;background:linear-gradient(90deg,#b8841c,#ffd86a);transition:width .3s}
.tbrow{display:flex;gap:5px;justify-content:center;align-items:flex-end;margin-top:5px}
.tbgrp{display:flex;gap:5px;padding:6px 8px;background:linear-gradient(#1e1519dd,#0d080cdd);border:2px solid #6a5232;border-radius:14px;box-shadow:0 4px 18px #000a}
.tbs{--s:var(--u);position:relative;width:var(--s);height:var(--s);flex:none;border-radius:10px;background:linear-gradient(#2c2028,#130c13);border:2px solid #5e4c3a;box-shadow:inset 0 0 12px #000a;display:flex;align-items:center;justify-content:center;overflow:hidden;color:#fff;cursor:pointer}
.r2 .tbs{--s:calc(var(--u)*.78)}
.tbs i{font-style:normal;font-size:calc(var(--s)*.56);filter:drop-shadow(0 2px 3px #000);line-height:1}
.tbs b{position:absolute;left:4px;top:2px;font-size:calc(var(--s)*.23);color:#ffe9b0;text-shadow:0 1px 2px #000,0 0 3px #000;font-weight:800;line-height:1}
.tbs u{position:absolute;right:4px;bottom:2px;text-decoration:none;font-size:calc(var(--s)*.23);color:#7ad8ff;font-weight:800;text-shadow:0 1px 2px #000;line-height:1}
.tbs s{position:absolute;inset:0;background:conic-gradient(rgba(0,0,0,.74) var(--p,0deg),transparent 0);pointer-events:none}
.tbs em{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:900;font-size:calc(var(--s)*.4);color:#fff;text-shadow:0 0 6px #000,0 0 3px #000;pointer-events:none}
.tbs.nom{filter:saturate(.35) brightness(.65)}.tbs.nom u{color:#ff6a6a}
.tbs.em{background:linear-gradient(#1c1418,#0c070b);border-style:dashed;border-color:#4a3c30}.tbs.em b{opacity:.6}
.tbs.util{border-color:#8a6a30}
.tbs.glow{border-color:#ffe070;box-shadow:0 0 16px #ffd040,inset 0 0 10px #ffd04088;animation:tbg .5s infinite alternate}@keyframes tbg{to{transform:scale(1.07)}}
.tbs.rdy{animation:tbr .55s}@keyframes tbr{0%{box-shadow:0 0 0 #fff}50%{box-shadow:0 0 20px 7px #ffe08a,inset 0 0 16px #fff9}100%{box-shadow:inset 0 0 12px #000a}}
.tbs.drop{border-color:#7af0ff;box-shadow:0 0 14px #7af0ff}
.tbt{--s:var(--u);width:calc(var(--s)*.9);height:var(--s);flex:none;border-radius:10px;border:2px solid #7a5a30;background:linear-gradient(#3a2a18,#1a1008);color:#ffe9b0;font-weight:900;font-size:calc(var(--s)*.26);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;line-height:1.15;text-align:center;position:relative}
.tbt small{font-size:calc(var(--s)*.2);opacity:.8;font-weight:700}.tbt.pulse{animation:tbp 1s infinite alternate;border-color:#ffe070}@keyframes tbp{to{box-shadow:0 0 18px #ffd040}}
.tbt .dot{position:absolute;right:-6px;top:-8px;background:#e03030;color:#fff;border-radius:11px;min-width:22px;height:22px;font-size:13px;line-height:22px;text-align:center;border:2px solid #2a0a0a}
#tbCast{position:fixed;left:50%;bottom:calc(var(--u)*2.15 + 86px);transform:translateX(-50%);z-index:31;pointer-events:none;color:#fff;font-weight:900;font-size:26px;letter-spacing:3px;text-shadow:0 2px 10px #000,0 0 18px var(--c,#ffd27a);opacity:0;transition:opacity .3s}
#tbCast.on{opacity:1}
#tbCol{position:fixed;left:14px;top:12px;z-index:31;display:none;flex-direction:column;gap:10px;width:clamp(280px,23vw,390px);pointer-events:none;user-select:none}
#tbCol.on{display:flex}
.pfc{display:flex;gap:12px;align-items:center;padding:10px 12px;background:linear-gradient(135deg,#1e141cee,#0c070bee);border:2px solid #6a5232;border-radius:18px;box-shadow:0 4px 18px #000a}
.pff{position:relative;width:66px;height:66px;flex:none;border-radius:50%;background:radial-gradient(#6a4438,#1a0f12);border:3px solid #ffd27a;font-size:38px;display:flex;align-items:center;justify-content:center}
.pfl{position:absolute;right:-7px;bottom:-7px;min-width:28px;height:28px;padding:0 4px;box-sizing:border-box;border-radius:14px;background:#ffd27a;color:#2a1800;font-weight:900;font-size:15px;display:flex;align-items:center;justify-content:center;border:2px solid #2a1800}
.pfb{flex:1;min-width:0}
.bar{position:relative;height:21px;border-radius:6px;background:#0009;border:1px solid #fff3;overflow:hidden;margin:3px 0}
.bar i{position:absolute;left:0;top:0;bottom:0;transition:width .12s}.bar i.sh{background:linear-gradient(#bfe6ffcc,#6ab0ffcc);mix-blend-mode:screen}
.bar span{position:absolute;inset:0;text-align:center;font-size:13px;line-height:21px;font-weight:800;color:#fff;text-shadow:0 1px 3px #000}
.bar.hp i{background:linear-gradient(#ee4545,#8a1515)}.bar.mp i{background:linear-gradient(#55b0ff,#1a4a9a)}
.bar.sm{height:9px;margin:2px 0}.bar.sm.st i{background:linear-gradient(#7ae08a,#2a9a3a)}.bar.sm.xp i{background:linear-gradient(#ffd86a,#b8841c)}
.pfpt{display:none;margin-top:4px;font-size:13px;font-weight:800;color:#ffe9b0;cursor:pointer;pointer-events:auto}
.pfbf{display:flex;flex-wrap:wrap;gap:5px;min-height:0}
.bf{position:relative;width:38px;height:38px;border-radius:8px;border:2px solid var(--c,#ffd27a);background:#140c10ee;font-size:21px;display:flex;align-items:center;justify-content:center}
.bf em{position:absolute;bottom:-3px;right:1px;font-size:12px;font-style:normal;font-weight:900;text-shadow:0 0 3px #000,0 0 3px #000;color:#fff}
.tfc{display:none;padding:9px 12px;background:linear-gradient(135deg,#221018ee,#0c070bee);border:2px solid #8a4a4a;border-radius:16px;box-shadow:0 4px 18px #000a}
.tfc.on{display:block}.tfc.el{border-color:#ffd27a}.tfc.bs{border-color:#ff6a4a}
.tfn{display:flex;align-items:baseline;gap:8px;font-weight:900;font-size:17px;color:#ffe0d0;text-shadow:0 1px 4px #000}.tfn small{font-size:12px;opacity:.75;font-weight:700}
.tfic{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}.tfic span{font-size:13px;padding:1px 7px;border-radius:9px;background:#0008;border:1px solid var(--c,#fff5);color:var(--c,#fff);font-weight:800}
/* ===== 面板 ===== */
#tbPn{position:fixed;inset:0;z-index:40;display:none;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,#1a1018ee,#050308f6);color:#f0e6d6;font-family:inherit;user-select:none}
#tbPn.on{display:flex}
.tbw{width:min(1280px,97vw);height:min(880px,96vh);display:flex;flex-direction:column;background:linear-gradient(#1e1522,#0e0a12);border:2px solid #86622f;border-radius:20px;box-shadow:0 10px 70px #000,inset 0 0 50px #ffd27a12;overflow:hidden}
.tbh{display:flex;align-items:center;gap:18px;padding:12px 22px;background:linear-gradient(#2a1d22,#170f14);border-bottom:2px solid #5a4226}
.tbh h2{margin:0;font-size:26px;letter-spacing:4px;color:#ffd27a;text-shadow:0 2px 8px #000}
.tbh .lvb{font-size:16px;color:#ffe9b0}.tbh .lvb b{font-size:22px;color:#fff}
.tbh .xpb{flex:1;max-width:340px}.tbh .xpb .bar{height:14px;margin:0}.tbh .xpb .bar i{background:linear-gradient(90deg,#b8841c,#ffd86a)}.tbh .xpb .bar span{font-size:11px;line-height:14px}
.pts{display:flex;gap:10px;margin-left:auto}.pt{padding:5px 14px;border-radius:12px;border:2px solid #555;background:#0008;font-size:16px;font-weight:800;color:#aaa}.pt b{font-size:22px;margin-left:4px}.pt.has{border-color:#ffd27a;color:#ffe9b0;animation:tbp 1s infinite alternate}
.tbx{font-size:26px;width:44px;height:44px;border-radius:12px;border:2px solid #6a4a30;background:#2a1a14;color:#fff;cursor:pointer}.tbx:hover{background:#5a2a20}
.tbtabs{display:flex;gap:6px;padding:10px 22px 0;background:#120c10}
.tbtab{padding:10px 24px;border-radius:12px 12px 0 0;border:2px solid #4a3a2a;border-bottom:0;background:#1c1318;color:#bba;font-size:18px;font-weight:800;cursor:pointer;letter-spacing:2px}.tbtab.on{background:linear-gradient(#3a2a1a,#241810);color:#ffe9b0;border-color:#b88a40}.tbtab:hover{color:#fff}
.tbb{flex:1;overflow:auto;padding:0;background:linear-gradient(#170f14,#0d090d);border-top:2px solid #b88a4066;min-height:0}
.tbf{--u:50px;display:flex;align-items:center;gap:14px;padding:10px 20px;background:linear-gradient(#170f14,#0a060a);border-top:2px solid #5a4226}
.tbf .hint{flex:1;font-size:13px;color:#a89;line-height:1.5}
.tbbtn{padding:10px 18px;border-radius:11px;border:2px solid #8a6a30;background:linear-gradient(#4a3418,#2a1c0c);color:#ffe9b0;font-size:16px;font-weight:800;cursor:pointer;white-space:nowrap}.tbbtn:hover{filter:brightness(1.25)}.tbbtn.dis{opacity:.4;pointer-events:none}.tbbtn.red{border-color:#8a3a30;background:linear-gradient(#4a1c18,#2a0c0c);color:#ffb0a0}
.atw{display:grid;grid-template-columns:1.3fr 1fr;gap:22px;padding:22px}
@media(max-width:1000px){.atw{grid-template-columns:1fr}}
.ar{display:flex;align-items:center;gap:16px;padding:14px 18px;border:2px solid #ffffff1c;border-radius:16px;background:linear-gradient(90deg,var(--c2),#ffffff06);margin-bottom:12px}
.ar .ic{font-size:44px;width:60px;text-align:center}.ar .nm{font-size:23px;font-weight:900;color:var(--c)}.ar .ds{font-size:14px;color:#b9aeb8;margin-top:3px;line-height:1.45}
.ar .vl{font-size:36px;font-weight:900;color:#fff;min-width:74px;text-align:right;text-shadow:0 0 14px var(--c)}.ar .vl small{display:block;font-size:12px;color:#9a8;font-weight:700;text-align:right}
.ar .ad{display:flex;flex-direction:column;gap:6px}.pb{width:58px;height:34px;border-radius:9px;border:2px solid var(--c);background:#0008;color:#fff;font-size:16px;font-weight:900;cursor:pointer}.pb:hover{background:var(--c);color:#000}.pb.dis{opacity:.25;pointer-events:none}
.dv{padding:16px 20px;border:2px solid #ffffff1c;border-radius:16px;background:#ffffff06}.dv h3{margin:0 0 10px;font-size:20px;color:#ffd27a;letter-spacing:2px}
.dv .rw{display:flex;justify-content:space-between;padding:7px 4px;border-bottom:1px solid #ffffff12;font-size:16px}.dv .rw span{color:#b9aeb8}.dv .rw b{color:#fff}.dv .rw b.g{color:#9fe8b0}
.sct{display:flex;gap:8px;padding:12px 20px 6px;flex-wrap:wrap}
.sc{flex:1;min-width:150px;padding:8px 12px;border-radius:13px;border:2px solid #ffffff22;background:#ffffff08;cursor:pointer;transition:.15s}
.sc:hover{background:#ffffff14}.sc.on{border-color:var(--c);background:linear-gradient(#ffffff14,#ffffff04);box-shadow:0 0 18px var(--c2)}
.sc .t{display:flex;align-items:center;gap:8px;font-size:19px;font-weight:900;color:var(--c)}.sc .t em{margin-left:auto;font-style:normal;font-size:15px;color:#ffe9b0}.sc .g{font-size:12px;color:#a99;margin-top:2px}
.scd{padding:2px 22px 4px;font-size:14px;color:#b9aeb8}
.trw{position:relative;margin:6px 120px 14px 130px}
.trl{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.trg{position:relative;display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:88px}
.tt{position:absolute;left:-104px;width:96px;text-align:right;font-size:13px;color:#8a7a70;line-height:1.3}.tt b{display:block;font-size:16px;color:#c8b090}.tt.ok b{color:#ffd27a}.tt.ok{color:#b9a}
.nc{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:6px}
.nd{position:relative;width:58px;height:58px;border-radius:50%;border:3px solid #6a5a50;background:radial-gradient(#3a2c34,#16101a);display:flex;align-items:center;justify-content:center;font-size:34px;cursor:pointer;transition:transform .12s;color:#fff}
.nd.a{border-radius:16px;border-width:3px;outline:2px solid #ffd27a55;outline-offset:3px}
.nd:hover{transform:scale(1.1)}
.nd.lk{filter:grayscale(1) brightness(.55)}
.nd.cn{border-color:#ffe070;animation:tbp 1s infinite alternate;box-shadow:0 0 14px #ffd040}
.nd.ln{border-color:var(--c);box-shadow:0 0 12px var(--c2)}
.nd.mx{border-color:#ffd27a;background:radial-gradient(#6a4a1a,#24160a);box-shadow:0 0 18px #ffb030}
.nd .rk{position:absolute;right:-6px;bottom:-6px;min-width:24px;padding:0 5px;height:22px;line-height:20px;box-sizing:border-box;text-align:center;border-radius:11px;background:#000;border:2px solid #aaa;font-size:13px;font-weight:900;color:#fff}
.nd.ln .rk{border-color:var(--c)}.nd.mx .rk{border-color:#ffd27a;color:#ffd27a}
.nl{margin-top:6px;font-size:14px;font-weight:800;color:#d8ccd0;text-align:center;white-space:nowrap}.nd.lk+.nl{color:#7a6a70}
.bkw{padding:18px 22px}.bkw h3{margin:6px 0 12px;font-size:20px;color:#ffd27a;letter-spacing:2px}
.bkg{display:grid;grid-template-columns:repeat(auto-fill,minmax(400px,1fr));gap:12px}
.bkc{display:flex;gap:14px;padding:12px 14px;border-radius:14px;border:2px solid var(--c,#555);background:linear-gradient(90deg,var(--c2,#fff1),#ffffff05)}
.bkc .tbs{--s:68px;cursor:grab}.bkc .tx{flex:1;min-width:0}.bkc .nm{font-size:19px;font-weight:900;color:var(--c,#fff)}.bkc .nm small{font-size:12px;color:#a99;margin-left:8px;font-weight:700}
.bkc .ms{font-size:13px;color:#7ad8ff;margin:2px 0}.bkc .ds{font-size:14px;color:#c8bcc4;line-height:1.5}.bkc.un{opacity:.45;filter:grayscale(.6)}
.bdg{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:16px;padding:20px 22px}
.bd{padding:16px 18px;border-radius:16px;border:2px solid #ffffff22;background:#ffffff08}.bd .t{font-size:24px;font-weight:900;color:#ffd27a}.bd .sc2{margin:6px 0;display:flex;gap:6px;flex-wrap:wrap}.bd .sc2 span{padding:2px 10px;border-radius:10px;border:1px solid var(--c);color:var(--c);font-weight:800;font-size:14px}
.bd p{margin:6px 0 12px;font-size:15px;line-height:1.55;color:#c8bcc4}.bd .at{font-size:14px;color:#9fe8b0;margin-bottom:10px}
#tbTip{position:fixed;z-index:50;pointer-events:none;max-width:380px;padding:12px 15px;border-radius:12px;background:#0b0710f5;border:2px solid #b88a40;box-shadow:0 6px 28px #000;color:#eadfe6;font-size:14.5px;line-height:1.55;display:none}
#tbTip h4{margin:0 0 2px;font-size:19px;letter-spacing:1px}#tbTip .sub{font-size:13px;color:#9ab;margin-bottom:6px}#tbTip .cur{color:#9fe8b0}#tbTip .nx{color:#ffe9b0}#tbTip .bad{color:#ff8a7a}#tbTip .ft{margin-top:6px;font-size:12.5px;color:#998}
.wskills{display:none!important}
body.tbon #wHint{bottom:calc(var(--u)*2.2 + 92px)!important}
body.tbon #wRun{bottom:calc(var(--u)*2.2 + 80px)!important}
body.tbon #wStat .hp{display:none}
body.tbon .wskills{display:none!important}
`;
  function addCss() { if (document.getElementById('tbCss')) return; const st = document.createElement('style'); st.id = 'tbCss'; st.textContent = CSS; document.head.appendChild(st); }

  // ================= 构建 DOM =================
  function build() {
    if (ui.built) return; ui.built = true; addCss();
    elBar = document.createElement('div'); elBar.id = 'tbBar'; document.body.appendChild(elBar);
    elCol = document.createElement('div'); elCol.id = 'tbCol'; document.body.appendChild(elCol);
    elCol.innerHTML = `<div class="pfc"><div class="pff">👹<div class="pfl">1</div></div><div class="pfb"><div class="bar hp"><i></i><i class="sh"></i><span></span></div><div class="bar mp"><i></i><span></span></div><div class="bar sm st"><i></i></div><div class="bar sm xp"><i></i></div><div class="pfpt"></div></div></div><div class="pfbf"></div><div class="tfc"><div class="tfn"></div><div class="bar hp"><i></i><span></span></div><div class="tfic"></div></div>`;
    elCast = document.createElement('div'); elCast.id = 'tbCast'; document.body.appendChild(elCast);
    elTip = document.createElement('div'); elTip.id = 'tbTip'; document.body.appendChild(elTip);
    elPn = document.createElement('div'); elPn.id = 'tbPn'; document.body.appendChild(elPn);
    wire();
  }

  // ================= 快捷栏 =================
  function slotHTML(i) {
    const id = T().tal().bar[i], sk = id && D.SK[id], key = i < 10 ? KEYS[i] : '⇧' + KEYS[i - 10];
    return `<div class="tbs${sk ? '' : ' em'}" data-slot="${i}"${sk ? ` draggable="true" data-drag="s:${i}:${id}" data-tip="s:${id}"` : ''}>${sk ? `<i>${sk.ic}</i>` : ''}<b>${key}</b>${sk && sk.cost ? `<u>${sk.cost}</u>` : ''}<s></s><em></em></div>`;
  }
  function barInner(withUtil) {
    const row = (a, cls) => `<div class="tbrow ${cls}"><div class="tbgrp">${withUtil && cls === 'r1' ? utilL() : ''}${Array.from({ length: 10 }, (_, k) => slotHTML(a + k)).join('')}${withUtil && cls === 'r1' ? utilR() : ''}</div></div>`;
    return row(10, 'r2') + row(0, 'r1');
  }
  const utilL = () => `<div class="tbs util" data-util="q" data-tip="u:dodge"><i>💨</i><b>Q</b><u>体</u><s></s><em></em></div><div class="tbs util" data-util="e" data-tip="u:e"><i>🗡️</i><b>E</b><s></s><em></em></div><div class="tbs util" data-util="h" data-tip="u:h"><i>🧪</i><b>H</b><u class="pc"></u><s></s><em></em></div><div style="width:10px"></div>`;
  const utilR = () => `<div style="width:10px"></div><div class="tbt" data-act="open" data-tip="u:t">天赋<small>T</small><span class="dot" style="display:none"></span></div>`;
  let barSig = '';
  function renderBar() {
    if (!elBar) return; const t = T().tal(), sig = t.bar.join(',') + '|' + t.ver; if (sig === barSig) return; barSig = sig;
    elBar.innerHTML = `<div class="tbxp"><i></i></div>` + barInner(true); if (ui.open) renderPanelBar();
  }
  function renderPanelBar() { const b = elPn && elPn.querySelector('.pnbar'); if (b) b.innerHTML = barInner(false); }

  // ================= 每帧刷新 =================
  let acc = 0, lastSig = {};
  const setT = (el, k, v) => { if (!el) return; if (el._k !== v) { el._k = v; el.textContent = v; } };
  const setW = (el, v) => { if (!el) return; v = v.toFixed(1) + '%'; if (el._w !== v) { el._w = v; el.style.width = v; } };
  function frame(dt) {
    if (!uiOn() || !T() || !T().on() || !G0() || !G0().S) { hideAll(); return; }
    build(); const W = WW(); const show = !!W && !W.busy && !W.dead; document.body.classList.toggle('tbon', show);
    elBar.classList.toggle('on', show); elCol.classList.toggle('on', show); elBar.classList.toggle('ptr', !!G0().uiOpen);
    if (!show) { return; }
    acc += dt; if (acc < 0.05) return; acc = 0; renderBar();
    const g = G0(), s = g.st(), V = T().view(), now = performance.now() / 1000;
    // 玩家框
    const hp = Math.max(0, g.S.hp), lv = RPG.lvOf(g.S.xp);
    setT(elCol.querySelector('.pfl'), 0, String(lv.lv));
    const bars = elCol.querySelectorAll('.pfc .bar'); setW(bars[0].children[0], hp / s.maxHp * 100); setW(bars[0].children[1], Math.min(100, V.shield / s.maxHp * 100)); setT(bars[0].children[2], 0, `${Math.round(hp)} / ${s.maxHp}` + (V.shield > 0 ? ` (+${Math.round(V.shield)})` : ''));
    setW(bars[1].children[0], V.mana / V.maxMana * 100); setT(bars[1].children[1], 0, `魂能 ${Math.round(V.mana)} / ${V.maxMana}`);
    const stam = window.Stamina && Stamina.val ? Stamina.val() : (W.run != null ? W.run : 100); setW(bars[2].children[0], stam);
    setW(bars[3].children[0], lv.need ? lv.cur / lv.need * 100 : 100);
    const L = T().left(), pt = elCol.querySelector('.pfpt'); const ptx = L.attr + L.skill > 0 ? `✦ 有 ${L.attr} 点属性 · ${L.skill} 点技能待分配（T）` : ''; if (pt._k !== ptx) { pt._k = ptx; pt.textContent = ptx; pt.style.display = ptx ? 'block' : 'none'; pt.onclick = () => open(); }
    // 增益
    const bf = elCol.querySelector('.pfbf'); let h = ''; for (const id in V.buffs) { const b = V.buffs[id]; h += `<div class="bf" style="--c:${b.col}" title="${esc(b.n)}">${b.ic}<em>${Math.ceil(b.t)}</em></div>`; } if (V.shield > 0) h = `<div class="bf" style="--c:#7ad8ff">🧿<em>${Math.round(V.shield)}</em></div>` + h; if (bf._h !== h) { bf._h = h; bf.innerHTML = h; }
    // 目标框
    const tf = elCol.querySelector('.tfc'), fo = V.target;
    if (fo && !fo.dead) { tf.classList.add('on'); tf.classList.toggle('el', !!fo.elite); tf.classList.toggle('bs', !!fo.boss); const nm = (fo.boss && fo.boss.n) || (fo.h && fo.h.c && fo.h.c.name) || '敌人', rl = fo.role && window.FoeRoles && FoeRoles.INFO[fo.role];
      const n1 = `${esc(nm)}<small>${'★'.repeat(Math.max(0, (fo.rar || 0)) + (fo.boss ? 1 : 0))}${rl ? ' · ' + rl.ic + rl.n : ''}</small>`; const nEl = tf.querySelector('.tfn'); if (nEl._h !== n1) { nEl._h = n1; nEl.innerHTML = n1; }
      const tb = tf.querySelector('.bar'); setW(tb.children[0], fo.hp / fo.maxHp * 100); setT(tb.children[1], 0, `${Math.max(0, Math.round(fo.hp))} / ${fo.maxHp}`);
      let ic = ''; const A = window.FoeAI2 && FoeAI2.AFF; if (fo.aff && A) for (const k in fo.aff) if (A[k]) ic += `<span style="--c:${A[k].col}">${A[k].ic} ${A[k].n}</span>`;
      if (fo.tfx) for (const k in fo.tfx) ic += `<span style="--c:${{ bleed: '#ff6a6a', poison: '#7af06a', burn: '#ffa040' }[k]}">${{ bleed: '🩸流血', poison: '☠️中毒', burn: '🔥灼烧' }[k]}${fo.tfx[k].st > 1 ? '×' + fo.tfx[k].st : ''}</span>`;
      if (fo.mark) ic += `<span style="--c:#ff7a9a">🔻印记</span>`; if (fo.stag > 0.25) ic += `<span style="--c:#ffe070">💫硬直</span>`; if (fo.slowK && fo.slowK < 1) ic += `<span style="--c:#9fd8ff">❄️减速</span>`; if (fo.broken > 0) ic += `<span style="--c:#ffd27a">⚠️破绽</span>`;
      const ie = tf.querySelector('.tfic'); if (ie._h !== ic) { ie._h = ic; ie.innerHTML = ic; } } else tf.classList.remove('on');
    const cb = elCol.getBoundingClientRect(); const ws = document.getElementById('wStat'); if (ws) { const y = Math.round(cb.bottom + 10); if (ws._ty !== y) { ws._ty = y; ws.style.top = y + 'px'; } }
    // 快捷栏冷却 / 魂能
    const all = document.querySelectorAll('#tbBar .tbs, #tbPn .tbs'); const xp = elBar.querySelector('.tbxp i'); if (xp) setW(xp, lv.need ? lv.cur / lv.need * 100 : 100);
    all.forEach(el => {
      let id = el.dataset.slot != null ? T().tal().bar[+el.dataset.slot] : el.dataset.util === 'q' ? 'dodge' : null; const em = el.querySelector('em'), sw = el.querySelector('s');
      if (el.dataset.util === 'e') { const bf2 = window.Foe && W.pos && Foe.brokenNear ? Foe.brokenNear(W.pos, g.player.yaw) : null; el.classList.toggle('glow', !!bf2); return; }
      if (el.dataset.util === 'h') { let n = 0; try { n = window.Sack && Sack.on() ? Sack.inv().belt.filter(Boolean).reduce((a, o) => a + o.n, 0) : (g.S.items.potion || 0); } catch (e) { } const pc = el.querySelector('.pc'); setT(pc, 0, String(n)); el.classList.toggle('nom', !n); return; }
      if (!id) return; const inf = T().slotInfo(id); if (!inf) return;
      const left = inf.left, was = el._cd || 0; el._cd = left;
      const p = Math.round(inf.frac * 360) + 'deg'; if (el._p !== p) { el._p = p; sw.style.setProperty('--p', p); }
      setT(em, 0, left > 0.05 ? (left >= 10 ? String(Math.ceil(left)) : left.toFixed(1)) : ''); el.classList.toggle('nom', !inf.ok && left <= 0.05);
      if (was > 0.05 && left <= 0.05) { el.classList.remove('rdy'); void el.offsetWidth; el.classList.add('rdy'); }
    });
    const dot = elBar.querySelector('.tbt .dot'), tb2 = elBar.querySelector('.tbt'); if (dot) { const n = L.attr + L.skill; dot.style.display = n ? 'block' : 'none'; dot.textContent = n; tb2.classList.toggle('pulse', n > 0); }
  }
  function hideAll() { if (!ui.built) return; elBar.classList.remove('on'); elCol.classList.remove('on'); document.body.classList.remove('tbon'); }

  // ================= 提示 =================
  const fmtD = (nd, k) => nd.d.replace(/\$([a-zA-Z]+)/g, (m, key) => { const v = (nd.m[key] || 0) * k; return String(+v.toFixed(2)); });
  function skillTip(id, nd) {
    const sk = D.SK[id], sc = nd && D.SCHOOLS.find(s => s.id === nd.school);
    return `<h4 style="color:${sc ? sc.col : '#ffe9b0'}">${sk.ic} ${esc(sk.n)}</h4><div class="sub">${esc(sk.kind)}${sc ? ' · ' + esc(sc.n) : ''}</div><div>${esc(sk.d)}</div><div class="sub" style="margin-top:6px">冷却 ${sk.cd} 秒${sk.cost ? ' · 魂能 ' + sk.cost : ''}${sk.hp ? ' · 生命 -' + sk.hp + '%' : ''}${sk.st ? ' · 体力 ' + sk.st : ''}</div>`;
  }
  function tipHTML(key) {
    const [k, id] = key.split(':');
    if (k === 's') return skillTip(id, D.ALL[id]) + (ui.open ? '<div class="ft">拖到别的格子换位 · 拖出格子清空 · 右键清空</div>' : '');
    if (k === 'u') { if (id === 'dodge') return skillTip('dodge'); if (id === 'e') return '<h4>🗡️ E · 处决 / 互动</h4><div>敌人出现「破绽」（完美格挡 / 完美闪避 / 破防 / 眩晕）时按 E 直接处决斩首。格子发光 = 可以处决。平时 E 是拾取 / 开门 / 搜刮。</div>'; if (id === 'h') return '<h4>🧪 H · 药水</h4><div>喝掉腰带里的血肉药剂。</div>'; if (id === 't') return '<h4>🌳 T · 角色 / 天赋</h4><div>分配属性点与技能点、学习技能、拖技能上快捷栏。</div>'; }
    if (k === 'n') { const nd = D.ALL[id], T_ = T(), r = T_.rank(id), sc = D.SCHOOLS.find(s => s.id === nd.school), why = T_.canRank(id); let h;
      if (nd.type === 'a') h = skillTip(id, nd) + `<div class="sub" style="margin-top:6px">${r ? '<span class="cur">已学会</span>' : '技能 · 需要 ' + nd.cost + ' 点'}</div>`;
      else h = `<h4 style="color:${sc.col}">${nd.ic} ${esc(nd.n)}</h4><div class="sub">被动 · ${esc(sc.n)} · 等级 ${r}/${nd.max}</div>` + (r ? `<div class="cur">当前：${esc(fmtD(nd, r))}</div>` : '') + (r < nd.max ? `<div class="nx">${r ? '下一级' : '第一级'}：${esc(fmtD(nd, r + 1))}</div>` : '<div class="cur">已满级</div>');
      if (why === 'need') h += `<div class="bad">需要先学：${nd.need.filter(q => !T_.rank(q)).map(q => esc(D.ALL[q].n)).join('、')}</div>`;
      if (why === 'tier') h += `<div class="bad">需要本系已投入 ${D.TIER_REQ[nd.tier]} 点（现有 ${T_.spent().sch[nd.school] || 0}）</div>`;
      if (why === 'pts') h += `<div class="bad">技能点不足（需要 ${nd.cost} 点）</div>`;
      return h + `<div class="ft">左键学习 · Shift+左键加满 · 右键撤销上一步</div>`; }
    if (k === 'a') { const a = D.ATTR.find(x => x.k === id); return `<h4 style="color:${a.col}">${a.ic} ${a.n}</h4><div>${esc(a.d)}</div><div class="ft">左键 +1 · Shift+左键 +5</div>`; }
    return '';
  }

  // ================= 面板 =================
  function open(tab) { if (!T() || !T().on()) return; build(); const g = G0(); if (ui.open) { if (tab) { ui.tab = tab; render(); } return; } ui.open = true; if (tab) ui.tab = tab; g.setUI && g.setUI(true); elPn.classList.add('on'); render(); }
  function close() { if (!ui.open) return; ui.open = false; elPn.classList.remove('on'); elTip.style.display = 'none'; const t = T().tal(); t.hist = []; const g = G0(); g.setUI && g.setUI(false); g.lockPointer && g.lockPointer(); g.save && g.save(); }
  const toggle = () => ui.open ? close() : open();
  function hdr() {
    const g = G0(), lv = RPG.lvOf(g.S.xp), L = T().left(), ch = (nm, n) => `<div class="pt${n > 0 ? ' has' : ''}">${nm}<b>${n}</b></div>`;
    return `<div class="tbh"><h2>🌳 角色 · 天赋</h2><div class="lvb">食人魔 <b>Lv.${lv.lv}</b></div><div class="xpb"><div class="bar"><i style="width:${lv.need ? lv.cur / lv.need * 100 : 100}%"></i><span>经验 ${lv.cur} / ${lv.need || 'MAX'}</span></div></div><div class="pts">${ch('属性点', L.attr)}${ch('技能点', L.skill)}</div><button class="tbx" data-act="close">✕</button></div>`;
  }
  function attrTab() {
    const g = G0(), s = g.st(), L = T().left(), a = T().agg(), tl = T().tal();
    const rows = D.ATTR.map(x => { const at = tl.at[x.k] || 0; return `<div class="ar" style="--c:${x.col};--c2:${x.col}22" data-tip="a:${x.k}"><div class="ic">${x.ic}</div><div style="flex:1;min-width:0"><div class="nm">${x.n}</div><div class="ds">${esc(x.d)}</div><div class="ds" style="color:#9fe8b0">已投入 ${at} 点 → ${esc(x.f(at))}</div></div><div class="vl">${s[x.k]}<small>含装备等加成</small></div><div class="ad"><button class="pb${L.attr < 1 ? ' dis' : ''}" data-act="attr:${x.k}:1">+1</button><button class="pb${L.attr < 5 ? ' dis' : ''}" data-act="attr:${x.k}:5">+5</button></div></div>`; }).join('');
    const pc = (v, u) => `${(+v).toFixed(1).replace(/\.0$/, '')}${u || ''}`; const R = (n, v, good) => `<div class="rw"><span>${n}</span><b${good ? ' class="g"' : ''}>${v}</b></div>`;
    const sd = `<div class="dv"><h3>📊 战斗属性</h3>${R('战力', s.power)}${R('最大生命', s.maxHp)}${R('攻击 / 防御', `${s.atk} / ${s.def}`)}${R('魂能上限', s.manaMax)}${R('魂能回复', pc(s.manaReg, ' /秒'))}${R('暴击率', pc(s.crit, '%'), s.crit > 10)}${R('暴击伤害', pc(s.critD, '%'), s.critD > 160)}${R('冷却缩减', pc(s.cdr, '%'), s.cdr > 0)}${R('减伤', pc(s.dr, '%'), s.dr > 0)}${R('躲开率', pc(s.avoid, '%'), s.avoid > 0)}${R('移动速度', '+' + pc(a.move || 0, '%'), a.move > 0)}${R('生命回复', pc(s.regenP, '% /秒'))}${R('魂晶收益', '+' + pc(a.coin || 0, '%'), a.coin > 0)}${R('经验收益', '+' + pc(a.xp || 0, '%'), a.xp > 0)}</div>`;
    return `<div class="atw"><div>${rows}<div style="font-size:13px;color:#a99;padding:4px 6px;line-height:1.6">每升 1 级 +3 属性点、+1 技能点（每 10 级多 +1；首杀霸主 / 精英 BOSS 各 +1 技能点）。装备、训练、建筑的加成照常叠加。</div></div>${sd}</div>`;
  }
  function treeTab() {
    const T_ = T(), sch = D.SCHOOLS.find(s => s.id === ui.sch) || D.SCHOOLS[0], u = T_.spent();
    const tabs = D.SCHOOLS.map(s => `<div class="sc${s.id === sch.id ? ' on' : ''}" style="--c:${s.col};--c2:${s.col}44" data-act="sch:${s.id}"><div class="t">${s.ic} ${s.n}<em>${u.sch[s.id] || 0} 点</em></div><div class="g">${s.tag}</div></div>`).join('');
    const pos = n => ({ x: n.c + 0.5, y: n.tier - 1 + 0.5 }); let lines = '';
    for (const n of sch.nodes) for (const q of n.need) { const a = pos(D.ALL[q]), b = pos(n), on = T_.rank(q) > 0; lines += `<line x1="${a.x}" y1="${a.y + 0.3}" x2="${b.x}" y2="${b.y - 0.3}" stroke="${on ? sch.col : '#4a3e44'}" stroke-width="${on ? 4 : 3}" stroke-linecap="round" vector-effect="non-scaling-stroke" opacity="${on ? 0.95 : 0.7}"/>`; }
    let cells = ''; for (let t = 1; t <= 5; t++) for (let c = 0; c < 3; c++) { const n = sch.nodes.find(x => x.tier === t && x.c === c); if (!n) { cells += '<div></div>'; continue; } const r = T_.rank(n.id), why = T_.canRank(n.id);
      const cls = 'nd' + (n.type === 'a' ? ' a' : '') + (r >= n.max ? ' mx' : r > 0 ? ' ln' : !why ? ' cn' : ' lk');
      cells += `<div class="nc"><div class="${cls}" style="--c:${sch.col};--c2:${sch.col}66" data-act="node:${n.id}" data-tip="n:${n.id}">${n.ic}<div class="rk">${n.type === 'a' ? (r ? '✔' : n.cost > 1 ? n.cost + '点' : '1点') : r + '/' + n.max}</div></div><div class="nl">${esc(n.n)}</div></div>`; }
    let tiers = ''; for (let t = 1; t <= 5; t++) { const req = D.TIER_REQ[t], ok = (u.sch[sch.id] || 0) >= req; tiers += `<div class="tt${ok ? ' ok' : ''}" style="top:${(t - 1) * 88 + 18}px"><b>第 ${t} 层</b>${req ? '本系 ' + req + ' 点' : '无门槛'}</div>`; }
    return `<div class="sct">${tabs}</div><div class="scd"><b style="color:${sch.col}">${sch.ic} ${sch.n}</b> · ${esc(sch.d)}</div><div class="trw">${tiers}<svg class="trl" viewBox="0 0 3 5" preserveAspectRatio="none">${lines}</svg><div class="trg">${cells}</div></div>`;
  }
  function bookTab() {
    const T_ = T(), have = [], not = []; have.push('dodge'); for (const s of D.SCHOOLS) for (const n of s.nodes) if (n.type === 'a') (T_.rank(n.id) ? have : not).push(n.id);
    const card = (id, un) => { const sk = D.SK[id], nd = D.ALL[id], sc = nd && D.SCHOOLS.find(s => s.id === nd.school), col = sc ? sc.col : '#ffe9b0';
      return `<div class="bkc${un ? ' un' : ''}" style="--c:${col};--c2:${col}22"><div class="tbs" ${un ? '' : `draggable="true" data-drag="b:-1:${id}" data-act="place:${id}"`} data-tip="s:${id}"><i>${sk.ic}</i></div><div class="tx"><div class="nm">${esc(sk.n)}<small>${esc(sk.kind)}${sc ? ' · ' + sc.n : ' · 基础'}</small></div><div class="ms">冷却 ${sk.cd}s${sk.cost ? ' · 魂能 ' + sk.cost : ''}${sk.hp ? ' · 生命 -' + sk.hp + '%' : ''}${sk.st ? ' · 体力 ' + sk.st : ''}${un ? ' · 🔒 到天赋树里学习' : ''}</div><div class="ds">${esc(sk.d)}</div></div></div>`; };
    return `<div class="bkw"><h3>📖 已学会的技能（${have.length}）——拖到下面的快捷栏，或点一下自动放入空格</h3><div class="bkg">${have.map(id => card(id)).join('')}</div><h3 style="margin-top:22px;opacity:.75">🔒 尚未学会（${not.length}）</h3><div class="bkg">${not.map(id => card(id, true)).join('')}</div></div>`;
  }
  function buildTab() {
    const L = T().left();
    return `<div class="bdg">${D.BUILDS.map(b => `<div class="bd"><div class="t">${b.ic} ${esc(b.n)}</div><div class="sc2">${b.sc.map(id => { const s = D.SCHOOLS.find(x => x.id === id); return `<span style="--c:${s.col}">${s.ic} ${s.n}</span>`; }).join('')}</div><p>${esc(b.d)}</p><div class="at">属性倾向：${Object.keys(b.attr).map(k => D.ATTR.find(a => a.k === k).n + '×' + b.attr[k]).join('  ')}</div><button class="tbbtn${L.attr + L.skill < 1 ? ' dis' : ''}" data-act="build:${b.id}">⚡ 用现有 ${L.attr} 属性点 + ${L.skill} 技能点一键加点</button></div>`).join('')}<div class="bd" style="grid-column:1/-1"><div class="t" style="font-size:19px">💡 怎么玩流派</div><p>同一流派的点数越多，越往下层解锁（第 2–5 层需要本系已投入 4 / 8 / 12 / 16 点）。混搭时，主系点到第 4 层、副系拿 2–3 个关键节点，效果最好。想换打法：先「洗点」（第一次免费），再点对应的推荐流派。</p></div></div>`;
  }
  function render() {
    if (!ui.open) return; const body = elPn.querySelector('.tbb'), sc = body ? body.scrollTop : 0;
    const tabs = [['attr', '👤 角色 · 属性'], ['tree', '🌳 天赋树'], ['book', '📖 技能书'], ['build', '⚡ 推荐流派']].map(([k, n]) => `<div class="tbtab${ui.tab === k ? ' on' : ''}" data-act="tab:${k}">${n}</div>`).join('');
    const cnt = ui.tab === 'attr' ? attrTab() : ui.tab === 'tree' ? treeTab() : ui.tab === 'book' ? bookTab() : buildTab(); const c = T().resetCost();
    elPn.innerHTML = `<div class="tbw">${hdr()}<div class="tbtabs">${tabs}</div><div class="tbb">${cnt}</div><div class="tbf"><div class="pnbar" style="display:flex;flex-direction:column">${''}</div><div class="hint">T / Esc 关闭 · 拖技能到格子 · 右键格子清空<br>游戏不会暂停——别在敌人面前发呆。</div><button class="tbbtn" data-act="undo">↶ 撤销</button><button class="tbbtn red" data-act="reset:all">♻ 洗点${c ? '（' + c + ' 魂晶）' : '（首次免费）'}</button></div></div>`;
    renderPanelBar(); const nb = elPn.querySelector('.tbb'); if (nb) nb.scrollTop = sc; barSig = ''; renderBar();
  }
  const pulse = () => { const b = elBar && elBar.querySelector('.tbt'); if (b) b.classList.add('pulse'); };

  // ================= 事件 =================
  function showTip(e) {
    const el = e.target.closest && e.target.closest('[data-tip]'); if (!el) { elTip.style.display = 'none'; return; }
    const h = tipHTML(el.dataset.tip); if (!h) { elTip.style.display = 'none'; return; } if (elTip._h !== h) { elTip._h = h; elTip.innerHTML = h; } elTip.style.display = 'block';
    const r = elTip.getBoundingClientRect(); let x = e.clientX + 18, y = e.clientY + 18; if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 18; if (y + r.height > innerHeight - 8) y = innerHeight - r.height - 8; elTip.style.left = Math.max(6, x) + 'px'; elTip.style.top = Math.max(6, y) + 'px';
  }
  function act(a, e) {
    const [k, p, q] = a.split(':'), T_ = T();
    if (k === 'open') open(); else if (k === 'close') close(); else if (k === 'tab') { ui.tab = p; render(); } else if (k === 'sch') { ui.sch = p; render(); }
    else if (k === 'node') { if (e.shiftKey) { let n = 0; while (!T_.canRank(p) && n++ < 6) T_.alloc(p); } else T_.alloc(p); render(); sfxOk(); }
    else if (k === 'attr') { T_.allocAttr(p, +q); render(); sfxOk(); }
    else if (k === 'undo') { T_.undo(); render(); } else if (k === 'reset') { if (confirm('确定洗点？技能栏也会清空。')) { T_.reset(p); render(); } }
    else if (k === 'build') { const n = T_.applyBuild(p); G0().toast && G0().toast(n ? `⚡ 已按「${D.BUILDS.find(b => b.id === p).n}」加点` : '没有可用的点数了——先洗点', '#ffd27a', 2); render(); }
    else if (k === 'place') { T_.autoPlace(p); barSig = ''; renderBar(); render(); }
  }
  const sfxOk = () => { try { SFX.play && SFX.play('bell', 0.25, 1.8); } catch (e) { } };
  let dragging = null;
  function wire() {
    elPn.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (el) act(el.dataset.act, e); });
    elBar.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (el) act(el.dataset.act, e); });
    elPn.addEventListener('contextmenu', e => { e.preventDefault(); const n = e.target.closest('.nd'), s = e.target.closest('.tbs[data-slot]'); if (n) { T().undo(); render(); } else if (s) { T().setSlot(+s.dataset.slot, null); barSig = ''; renderBar(); } });
    for (const el of [elPn, elBar]) el.addEventListener('mousemove', showTip); elPn.addEventListener('mouseleave', () => { elTip.style.display = 'none'; });
    elPn.addEventListener('dragstart', e => { const el = e.target.closest('[data-drag]'); if (!el) return; dragging = el.dataset.drag; e.dataTransfer.setData('text/plain', dragging); e.dataTransfer.effectAllowed = 'move'; elTip.style.display = 'none'; });
    elPn.addEventListener('dragover', e => { const s = e.target.closest('.tbs[data-slot]'); if (s && dragging) { e.preventDefault(); s.classList.add('drop'); } });
    elPn.addEventListener('dragleave', e => { const s = e.target.closest('.tbs[data-slot]'); if (s) s.classList.remove('drop'); });
    elPn.addEventListener('drop', e => { const s = e.target.closest('.tbs[data-slot]'); if (!s || !dragging) return; e.preventDefault(); const [kind, from, id] = dragging.split(':'), to = +s.dataset.slot, tl = T().tal(); dragging = null;
      if (kind === 's') { const f = +from, other = tl.bar[to]; tl.bar[to] = id; tl.bar[f] = other || null; T().setSlot(to, id); } else T().setSlot(to, id); barSig = ''; renderBar(); render(); });
    elPn.addEventListener('dragend', e => { const el = e.target.closest('[data-drag]'); const d = dragging; dragging = null; if (d && el && e.dataTransfer.dropEffect === 'none') { const [kind, from] = d.split(':'); if (kind === 's') { T().setSlot(+from, null); barSig = ''; renderBar(); render(); } } });
  }
  addEventListener('keydown', e => {
    try {
      const g = G0(); if (!g || !g.playing || !T() || !T().on() || !uiOn()) return; const typing = /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '');
      if (ui.open) { if (e.code === 'Escape' || e.code === 'KeyT') { e.preventDefault(); e.stopImmediatePropagation(); close(); } return; }
      if (e.code === 'KeyT' && !e.repeat && !typing && !g.uiOpen && !e.ctrlKey && !e.metaKey) { e.preventDefault(); e.stopImmediatePropagation(); open(); }
    } catch (er) { console.warn('TalUI key', er); }
  }, true);

  // ================= 施法提示 =================
  let castT = 0;
  function cast(id) { if (!elCast) return; const sk = D.SK[id], nd = D.ALL[id], sc = nd && D.SCHOOLS.find(s => s.id === nd.school); elCast.style.setProperty('--c', sc ? sc.col : '#ffd27a'); elCast.textContent = `${sk.ic} ${sk.n}`; elCast.classList.add('on'); clearTimeout(castT); castT = setTimeout(() => elCast.classList.remove('on'), 650); }

  window.TalUI = { open, close, toggle, cast, pulse, render, frame, _ui: ui };
  const wait = setInterval(() => { if (window.G && G.HOOK && G.S && window.RPG && window.Talents) { clearInterval(wait); try { addCss(); G.HOOK.frame.push((dt) => { try { frame(dt); } catch (e) { console.warn('TalUI frame', e); } }); } catch (e) { console.warn('TalUI init', e); } } }, 200);
})();
