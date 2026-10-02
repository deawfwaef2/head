// R59 SAN 值（洞穴挂机的临时资源）：用户“SAN 是无限刷的挂机资源，所有建筑既产 SAN 又产魂晶，临时加成每项都能无限点、越点越贵（高一个数阶），把一堆机制有机整合”。
// 一句话模型：🔮魂晶 = 永久经济（造建筑 / 训练；回合结算按在岗首级发，稀有）；🌀SAN = 临时经济（洞里每个建筑都在持续产，花在“下一趟”的强化上；高阶首级 / 高阶建筑 SAN 多几个数量级）。
//   SAN → 变强：下一趟增益 / 武器附魔（每项独立升级、无限级、渐近上限）；SAN → 魂晶：魂晶香；SAN → 本局 build：月光窥视（每回合 1 次祝福抉择）；SAN → SAN：躁动。
//   魂晶 → SAN：造更好的建筑、摆更高阶的首级；出猎 → 首级 + 魂晶；洞里小游戏超出回合上限的魂晶改折成 SAN。流派 / 祝福面板也并进同一页（Tab → 出征准备）。
// 数值全部在 js/san_cfg.js；改完跑 node tools/test/sanbench.js 看曲线。
window.San = (() => {
  'use strict';
  const CF = window.SAN_CFG, fmt = CF.fmt;
  const on = () => !window.Mods || !Mods.on || Mods.on('san') !== false;
  const G0 = () => window.G, wild = () => !!(window.Worlds && Worlds.active);
  const rOn = () => !!(window.Loop && Loop.rOn && Loop.rOn());
  const live = () => on() && rOn() && !wild(); // 洞里且回合制：SAN 才会产出
  const now = () => performance.now() / 1000;
  const chap = () => { try { return Loop.R().chap || 1; } catch (e) { return 1; } };
  const BB = Object.fromEntries(CF.BUFFS.map(b => [b.k, b])), EB = Object.fromEntries(CF.ENCH.map(e => [e.k, e]));

  // ---- 状态（S.san）：arm = 已备好（下一趟），act = 本趟生效中 ----
  const blankSet = () => ({ b: {}, e: {} });
  const blank = () => ({ v: 0, tot: 0, arm: blankSet(), act: blankSet(), fz: 0, log: 0, idle: 0, ix: 0, bx: 0, fx: 0, told: 0 });
  function st() {
    const g = G0(), S = g && g.S; if (!S) return blank(); const s = S.san || (S.san = blank());
    for (const k of ['arm', 'act']) { if (!s[k] || typeof s[k].e !== 'object' || s[k].e === null) s[k] = blankSet(); if (!s[k].b) s[k].b = {}; }
    for (const k of ['ix', 'bx', 'fx', 'fz', 'log', 'idle', 'tot', 'v']) if (!(s[k] >= 0)) s[k] = 0; return s;
  }

  // ---- 建筑的 SAN 规格 / 说明 ----
  function spec(type) {
    const d = window.BuildCat && BuildCat.C[type]; if (!d) return null; const sx = CF.SANX[type] || 1;
    if (d.mount && d.mount.mult > 0 && d.mount.period < 1e6) return { period: d.mount.period, mult: d.mount.mult * sx };
    const p = CF.SPEC[type]; return p ? { period: p[0], mult: p[1] * sx } : null;
  }
  const slotN = d => (d.mount && d.mount.slots ? d.mount.slots.length : 1);
  function prodLine(type) {
    const d = BuildCat.C[type], sp = spec(type); if (!d || !d.mount) return ''; const ro = window.Loop && Loop.ROUND && Loop.ROUND[type];
    const a = sp ? `<span style="color:#8fe6ff">🌀 每 ${sp.period}s ×${(+sp.mult.toFixed(2))}</span>` : '<span style="opacity:.55">🌀 不产</span>';
    const bf = window.Loop && Loop.bf ? Loop.bf(d) : 0, f = ro ? '特殊规则' : bf > 0 ? `每颗 ×${bf.toFixed(2)}` : '不产';
    return `${a} · <span style="color:#ffd27a">🔮 ${f}</span> · ${slotN(d)} 槽`;
  }
  const badge = type => { const d = window.BuildCat && BuildCat.C[type]; return d && d.mount && spec(type) ? '<small style="margin-left:5px;font-size:10px;font-weight:400;color:#8fe6ff">🌀</small><small style="font-size:10px;font-weight:400;color:#ffd27a">🔮</small>' : ''; };

  // ---- 产出 ----
  const win = []; // [t, n]（只记非手点）
  const add = (n, idle) => { const s = st(); s.v += n; s.tot += n; s.log += n; if (idle) win.push([now(), n]); };
  function gain(val, h, src, combo) {
    const s = st(), man = src === 'manual' || src === 'hold', fz = s.fz > 0 ? CF.C.FRENZY_X : 1;
    const n = Math.max(1, Math.round((man ? CF.poke(val, s.idle || 0, combo) : val * CF.C.K) * fz)); add(n, !man);
    if (!s.told) { s.told = 1; tip('🌀 SAN：洞里每个建筑都在持续产它，把玩首级也会产。它是临时资源——Tab →「出征准备」可以换下一趟的增益和武器附魔；魂晶则在回洞结算时按在岗首级发。', '#8fe6ff', 7); }
    return n;
  }
  function play(coins) { const n = Math.round(coins * CF.PLAY_SAN * (st().fz > 0 ? CF.C.FRENZY_X : 1)); if (n > 0) add(n, false); }
  function idleRate() { const t = now(); while (win.length && t - win[0][0] > 24) win.shift(); let sum = 0, t0 = t; for (const w of win) { sum += w[1]; t0 = Math.min(t0, w[0]); } return sum / Math.max(8, Math.min(24, t - t0)); }

  // ---- 增益 / 附魔 ----
  const bLv = k => { const s = st(); return (s.arm.b[k] | 0) + (s.act.b[k] | 0); };
  const eLv = k => { const s = st(); return (s.arm.e[k] | 0) + (s.act.e[k] | 0); };
  function nb() { const o = {}; let any = 0; for (const b of CF.BUFFS) { const n = bLv(b.k); if (n > 0) { o[b.k] = CF.sat(b.A, n); any = 1; } } return any ? o : null; }
  const incense = () => CF.sat(CF.INCENSE.A, st().ix, CF.INCENSE.q);
  function sumTxt() { const s = st(), p = []; for (const e of CF.ENCH) { const n = eLv(e.k); if (n) p.push(e.ic + n); } for (const b of CF.BUFFS) { const n = bLv(b.k); if (n) p.push(b.ic + n); } if (s.fz > 0) p.push('⚡' + Math.ceil(s.fz) + 's'); return p.join(' '); }

  // ---- 武器附魔（worlds.js foeEvent → San.event）----
  const alive = () => (window.Foe && Foe.foes ? Foe.foes.filter(f => !f.dead && f.pos) : []);
  const near = (fo, r, n) => alive().filter(f => f !== fo && Math.hypot(f.pos.x - fo.pos.x, f.pos.z - fo.pos.z) < r).sort((a, b) => Math.hypot(a.pos.x - fo.pos.x, a.pos.z - fo.pos.z) - Math.hypot(b.pos.x - fo.pos.x, b.pos.z - fo.pos.z)).slice(0, n);
  const fx = (fo, col) => { try { const p = fo.pos.clone(); p.y += 1.2; Foe.spark(p, 10, col); } catch (e) { } };
  const dot = (fo, n, col) => { if (!fo || fo.dead || !(n >= 1)) return; try { Foe.dot(fo, n, { proc: true }); if (col !== undefined) fx(fo, col); } catch (e) { } };
  function bleed(fo, total, ticks, secs, col) { const per = total / ticks; for (let i = 1; i <= ticks; i++) setTimeout(() => dot(fo, per, i === ticks ? col : undefined), i * 1000 * secs / ticks); }
  const heal = k => { try { const g = G0(), s = g.st(); g.S.hp = Math.min(s.maxHp, g.S.hp + s.maxHp * k); } catch (e) { } };
  let hits = 0, healT = 0;
  function event(t, fo, d) {
    if (!on() || !fo) return; const E = st().act.e; let any = 0; for (const k in E) if (E[k] > 0) { any = 1; break; } if (!any) return;
    const P = k => CF.potency(E[k] | 0);
    if (t === 'hit') {
      const dealt = (d && d.dealt) || 0; if (!dealt || (d && d.proc)) return; hits++;
      if (E.fire > 0 && Math.random() < 0.3) bleed(fo, dealt * 0.5 * P('fire'), 3, 3, null);
      if (E.frost > 0) { fo._chill = now() + 3; fo.cd = (fo.cd || 0) + 0.2; dot(fo, dealt * 0.15 * P('frost'), 'blue'); }
      if (E.thunder > 0 && hits % 4 === 0) for (const f of near(fo, 6, Math.min(3, 1 + Math.floor(P('thunder') * 2)))) dot(f, dealt * 0.8 * P('thunder'), 'blue');
      if (E.venom > 0) { const cap = 3 + Math.floor(P('venom') * 2); fo._sv = fo._sv || 0; if (fo._sv < cap) { fo._sv++; bleed(fo, dealt * 0.4 * P('venom'), 4, 4, undefined); setTimeout(() => { fo._sv = Math.max(0, (fo._sv || 1) - 1); }, 4000); } }
      if (E.blood > 0) { const t0 = now(); if (t0 - healT > 0.4) { healT = t0; heal(0.004 * P('blood')); } }
    } else if (t === 'kill') {
      if (E.blood > 0) heal(0.015 * P('blood'));
      if (E.soul > 0) { try { const c = Math.max(1, Math.round(3 * P('soul') * (1 + 0.2 * chap()))); G0().addCoins(c); const w = Worlds._W; if (w && w.trip) w.trip.coins += c; } catch (x) { } }
    }
  }

  // ---- 购买 ----
  function tip(t, c, s) { try { G0().toast(t, c || '#8fe6ff', s || 2.6); } catch (e) { } }
  const sfx = n => { try { SFX[n] && SFX[n](); } catch (e) { } };
  const fail = why => { tip(why, '#ff9a8a', 1.8); sfx('click'); return false; };
  const buffPrice = k => CF.price(BB[k].b, st().arm.b[k] | 0, chap());
  const enchPrice = k => CF.price(EB[k].b, st().arm.e[k] | 0, chap());
  const frenzyPrice = () => CF.frenzyPrice(Math.max(idleRate(), st().idle || 0), chap(), st().fx);
  const incensePrice = () => CF.price(CF.INCENSE.b, st().ix, chap(), CF.INCENSE.g);
  const boonPrice = () => CF.price(CF.BOON.b, st().bx, chap(), CF.BOON.g);
  function pay(c) { const s = st(); if (s.v < c) return fail('SAN 不够'); s.v -= c; return true; }
  function buyBuff(k) { const b = BB[k]; if (!b || !pay(buffPrice(k))) return false; const s = st(), n = s.arm.b[k] = (s.arm.b[k] | 0) + 1; tip(`${b.ic} ${b.n} Lv${n}：下一趟 ${b.d(CF.sat(b.A, bLv(k)))}`); sfx('coins'); return true; }
  function buyEnch(k) { const e = EB[k]; if (!e || !pay(enchPrice(k))) return false; const s = st(), n = s.arm.e[k] = (s.arm.e[k] | 0) + 1; tip(`${e.ic} ${e.n} Lv${n}：${e.d(CF.potency(eLv(k)))}（下一趟）`); sfx('coins'); return true; }
  function buyRite(k) {
    const s = st();
    if (k === 'frenzy') { if (s.fz >= 600) return fail('躁动已叠满'); if (!pay(frenzyPrice())) return false; s.fx++; s.fz += CF.C.FRENZY_SEC; tip(`⚡ 躁动：洞里 ${Math.ceil(s.fz)} 秒内 SAN 产量 ×${CF.C.FRENZY_X}（离洞不计时）`); sfx('fanfare'); return true; }
    if (k === 'incense') { if (!pay(incensePrice())) return false; s.ix++; tip(`🕯️ 魂晶香 Lv${s.ix}：本回合结算魂晶 +${Math.round(incense() * 100)}%`, '#ffd890'); sfx('coins'); return true; }
    if (k === 'boon') { if (!(window.Rogue && Rogue.on())) return fail('肉鸽 MOD 没开'); if (s.bx >= CF.BOON.max) return fail('这回合已经窥视过了——祝福是整局永久的，每回合只能换 1 次'); if (!pay(boonPrice())) return false; s.bx++; Rogue.grant(1, '月光窥视'); sfx('fanfare'); return true; }
    return false;
  }

  // ---- 出发 / 回洞 ----
  let prevWild = false, wildAt = 0, inited = false;
  function tick(dt) {
    const s = st(), w = wild();
    if (!inited) { inited = 1; prevWild = w; if (!w) s.act = blankSet(); }
    if (w && !prevWild) { // 出发：arm → act
      s.act = { b: Object.assign({}, s.arm.b), e: Object.assign({}, s.arm.e) }; s.arm = blankSet(); wildAt = now();
      const t = sumTxt(); if (t) tip('🌀 SAN 强化生效：' + t + '（只管这一趟，回洞即消散）', '#8fe6ff', 4);
    } else if (!w && prevWild) { // 回洞
      const had = Object.keys(s.act.b).length || Object.keys(s.act.e).length; s.act = blankSet();
      const secs = Math.min(CF.C.AWAY_MAX, now() - wildAt), r = s.idle || 0;
      if (on() && rOn() && r > 0.2 && secs > 15) { const n = Math.round(r * secs * CF.C.AWAY); if (n > 0) { add(n, false); tip(`🌀 你不在的时候，洞里的首级还在挂机：SAN +${fmt(n)}${had ? '（带出去的强化已消散）' : ''}`, '#8fe6ff', 4.2); } }
      else if (had) tip('🌀 这一趟的 SAN 强化消散了', '#a8c8d8', 2.4);
    }
    prevWild = w;
    if (!w && s.fz > 0) s.fz = Math.max(0, s.fz - dt);
    const r = idleRate(); if (r > 0.05 && !w) s.idle = r;
  }
  function endTrip() { const s = st(), n = s.log; s.log = 0; s.ix = 0; s.bx = 0; s.fx = 0; return n > 0 ? `🌀 这一回合洞里累计产出 SAN +${fmt(n)}（现有 ${fmt(s.v)}）——Tab →「出征准备」换下一趟的强化` : ''; }

  // ---- HUD / 样式 ----
  let hud = null, chip = null;
  function css() {
    if (document.getElementById('sanCss')) return; const el = document.createElement('style'); el.id = 'sanCss'; el.textContent = `
#hud .u-san{display:flex;flex-direction:column;align-items:flex-start;border-left:1px solid rgba(143,230,255,.35);padding-left:10px;min-width:60px}
#hud .u-san b{font:800 17px/1.1 "SF Mono",Consolas,monospace;color:#8fe6ff;text-shadow:0 0 8px rgba(80,200,255,.5)}#hud .u-san b.bump{animation:sanBump .25s}@keyframes sanBump{50%{transform:scale(1.18)}}
#hud .u-san .u-lbl{color:#7fb8cc!important;font-size:12px}#hud .u-san .fx{font-size:12px;color:#c8f0ff;max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#sanChip{position:fixed;right:14px;bottom:88px;z-index:30;display:none;flex-direction:column;align-items:flex-end;gap:5px;pointer-events:none;font:700 13px "Microsoft YaHei UI",sans-serif}
#sanChip span{padding:4px 11px;border:1px solid #8a6ab8;background:rgba(18,10,26,.85);color:#e8d0ff;border-radius:3px;letter-spacing:.04em}#sanChip kbd{margin-left:6px;padding:0 5px;border:1px solid #8a6ab8;border-bottom-width:2px;border-radius:3px;font-size:11px;color:#ffd98a}
.bp-prod{font-size:12px;margin-top:4px;line-height:1.4}.bp-e{font-size:12px;color:#c9a870;margin-top:3px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.bp-desc.br{-webkit-line-clamp:3!important;color:#d8c8a8!important}
#sanPn{position:fixed;inset:0;z-index:110;display:none;justify-content:center;align-items:flex-start;padding:26px 20px;box-sizing:border-box;background:rgba(4,7,12,.96);overflow:auto;color:#dfe8f0;font:14px/1.6 "Microsoft YaHei UI","Noto Sans CJK SC",system-ui,sans-serif;user-select:none}
#sanPn.on{display:flex}body.hubon #sanPn{padding-left:calc(var(--hubW,196px) + 20px)}
#sanPn .box{width:min(1060px,100%);position:relative}#sanPn h2{margin:0 0 4px;font:800 24px "Noto Serif SC",serif;letter-spacing:.14em;color:#8fe6ff}#sanPn h3{margin:18px 0 8px;font:700 15px "Noto Serif SC",serif;letter-spacing:.1em;color:#d9eef8;border-bottom:1px solid rgba(143,230,255,.2);padding-bottom:4px}#sanPn h3 small{font:12px sans-serif;color:#8aa4b0;letter-spacing:0;margin-left:8px}
#sanPn .top{display:flex;flex-wrap:wrap;gap:6px 26px;align-items:baseline;padding:10px 14px;background:linear-gradient(90deg,rgba(40,90,110,.35),rgba(10,20,28,.4));border:1px solid rgba(143,230,255,.3);border-radius:4px}
#sanPn .top .n{font:800 34px "SF Mono",Consolas,monospace;color:#8fe6ff;text-shadow:0 0 12px rgba(80,200,255,.5)}#sanPn .top span{color:#a8c4d0;font-size:13px}#sanPn .top b{color:#e8f8ff}
#sanPn .sum{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}#sanPn .sum span{padding:2px 10px;border:1px solid rgba(143,230,255,.3);border-radius:12px;background:#0a161d;font-size:13px;color:#d8f0f8}#sanPn .sum span.g{border-color:rgba(255,210,122,.45);color:#ffd890}#sanPn .sum span.p{border-color:rgba(200,160,255,.45);color:#e0c8ff}
#sanPn .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(235px,1fr));gap:9px}
#sanPn .cd{padding:10px 12px;border:1px solid rgba(143,230,255,.28);background:linear-gradient(#10202a,#0a1219);border-radius:4px;cursor:pointer;transition:transform .1s,border-color .1s}
#sanPn .cd:hover{transform:translateY(-1px);border-color:#8fe6ff}#sanPn .cd.poor{opacity:.5;cursor:not-allowed}#sanPn .cd.on{border-color:#6fc8e0}
#sanPn .cd b{display:block;font-size:15px;color:#e8f8ff}#sanPn .cd b em{font-style:normal;font-size:12px;color:#ffd27a;margin-left:6px}#sanPn .cd i{display:block;font-style:normal;font-size:12.5px;color:#8fe6ff;margin-top:2px}#sanPn .cd span{display:block;font-size:12.5px;color:#a8bcc8;margin-top:3px}#sanPn .cd .pr{float:right;font:700 14px "SF Mono",Consolas,monospace;color:#8fe6ff}
#sanPn table{width:100%;border-collapse:collapse;font-size:13px}#sanPn td,#sanPn th{padding:3px 8px;border-bottom:1px solid #ffffff12;text-align:right}#sanPn th{color:#8aa4b0;font-weight:400}#sanPn td:first-child,#sanPn th:first-child{text-align:left}#sanPn td.s{color:#8fe6ff}#sanPn td.c{color:#ffd890}
#sanPn .note{margin-top:14px;font-size:12.5px;color:#8aa4b0;line-height:1.7}#sanPn .x{position:absolute;right:0;top:-8px;color:#6a8490;font-size:12px}
#sanPn #rgPanel{margin:0}`;
    document.head.appendChild(el);
  }
  function build() {
    if (hud && hud.isConnected) return; const c = document.getElementById('coins'); if (!c || !c.parentNode) return; css();
    hud = document.createElement('div'); hud.className = 'u-san'; hud.setAttribute('data-noi18n', ''); hud.innerHTML = '<b id="sanN">0</b><div class="u-lbl">SAN <span id="sanR"></span></div><div class="fx" id="sanFx"></div>'; c.parentNode.after(hud);
    chip = document.createElement('div'); chip.id = 'sanChip'; chip.setAttribute('data-noi18n', ''); document.body.appendChild(chip);
  }
  let lastV = -1, sigC = '';
  function paint() {
    if (!on()) { if (hud) hud.style.display = 'none'; if (chip) chip.style.display = 'none'; return; }
    build(); if (!hud) return; const s = st(), w = wild(), g = G0();
    hud.style.display = rOn() ? 'flex' : 'none';
    const nEl = hud.querySelector('#sanN'); if (Math.floor(s.v) !== lastV) { if (lastV >= 0 && s.v > lastV) { nEl.classList.remove('bump'); void nEl.offsetWidth; nEl.classList.add('bump'); } lastV = Math.floor(s.v); nEl.textContent = fmt(s.v); }
    const r = idleRate(); hud.querySelector('#sanR').textContent = w ? '' : (r >= 0.1 ? `+${fmt(r)}/s` : ''); hud.querySelector('#sanFx').textContent = sumTxt();
    let c = ''; if (!w && g && g.playing && !g.uiOpen && window.Rogue && Rogue.on() && rOn()) { const rs = Rogue.st(); if (!rs.arch) c = '⚔️ 还没选本局杀法'; else if (rs.pend > 0) c = `🎴 祝福抉择 ×${rs.pend}`; }
    if (c !== sigC) { sigC = c; chip.innerHTML = c ? `<span>${c}<kbd>Tab → 出征准备</kbd></span>` : ''; chip.style.display = c ? 'flex' : 'none'; }
  }

  // ---- 「出征准备」页：SAN 祭坛 + 流派 / 祝福 + 全洞产出一览 ----
  let pn = null, open0 = false, refreshT = 0;
  const nbTxt = o => CF.BUFFS.map(b => o[b.k] ? `${b.ic} ${b.d(o[b.k])}` : '').filter(Boolean).join(' · ');
  function mkPn() {
    if (pn) return pn; css(); pn = document.createElement('div'); pn.id = 'sanPn'; pn.setAttribute('data-noi18n', '');
    ['mousedown', 'pointerdown', 'wheel', 'contextmenu'].forEach(ev => pn.addEventListener(ev, e => e.stopPropagation()));
    pn.addEventListener('click', e => {
      const t = e.target.closest('[data-b],[data-e],[data-x]'); if (!t) return; if (t.classList.contains('poor')) { fail('SAN 不够'); return; }
      const ok = t.dataset.b ? buyBuff(t.dataset.b) : t.dataset.e ? buyEnch(t.dataset.e) : buyRite(t.dataset.x);
      if (ok) { try { G0().save(); } catch (x) { } render(); }
    });
    document.body.appendChild(pn); return pn;
  }
  function sources() { // 在岗首级的产出估算：按建筑类型汇总
    const g = G0(), C = BuildCat.C, M = new Map(), ym = (g.st && g.st().yieldMul) || 1; let tS = 0, tC = 0;
    for (const h of (g.heads || [])) {
      if (!h || !h.mount || !h.rec) continue; const b = h.mount, d = C[b.type]; if (!d) continue; const sp = spec(b.type), ro = Loop.ROUND && Loop.ROUND[b.type];
      const o = M.get(b.type) || { ic: d.icon, n: d.n, k: 0, s: 0, c: 0, ro: !!ro }; o.k++;
      if (sp) o.s += (h.yield || 1) * sp.mult / sp.period * CF.C.K * ym; if (!ro) o.c += Loop.hv(h) * Loop.bf(d); M.set(b.type, o);
    }
    const rows = [...M.values()].sort((a, b) => b.s - a.s); for (const o of rows) { tS += o.s; tC += o.c; } return { rows, tS, tC };
  }
  function lvCard(attr, k, ic, name, lv, nowT, nextT, price, afford, extra) {
    return `<div class="cd ${lv ? 'on' : ''} ${afford ? '' : 'poor'}" data-${attr}="${k}" data-c="${price}"><span class="pr">${fmt(price)}</span><b>${ic} ${name}${lv ? `<em>Lv${lv}</em>` : ''}</b><i>${lv ? `现在 ${nowT}` : '未备'}</i><span>升级后：${nextT}${extra || ''}</span></div>`;
  }
  function sanHTML() {
    const s = st(), ck = CF.chapK(chap()), r = Math.max(idleRate(), s.idle || 0), src = sources(), N = Loop.nb(), rg = window.Rogue && Rogue.on() ? Rogue.st() : null;
    let h = `<div class="x">Esc / Tab 关闭 · SAN 强化只管「下一趟」，回洞即消散</div><h2>🌀 出征准备</h2>`;
    h += `<div class="top"><span class="n" id="sanBig">${fmt(s.v)}</span><span>SAN</span><span>挂机 <b>${r >= 0.1 ? '+' + fmt(r) : '0'}/s</b>${s.fz > 0 ? ` · <b style="color:#ffd27a">⚡躁动 ×${CF.C.FRENZY_X}（${Math.ceil(s.fz)}s）</b>` : ''}</span><span>点击一次 ≈ <b>+${fmt(CF.poke(5, r, 5))}</b></span><span>累计 <b>${fmt(s.tot)}</b></span><span>第 ${chap()} 章：价格 ×${ck.toFixed(2)}</span></div>`;
    const chips = []; const bt = nbTxt(N); if (bt) chips.push(`<span>🎐 ${bt}</span>`);
    for (const e of CF.ENCH) { const n = eLv(e.k); if (n) chips.push(`<span>${e.ic} ${e.n} Lv${n}</span>`); }
    if (s.ix) chips.push(`<span class="g">🕯️ 魂晶香 结算魂晶 +${Math.round(incense() * 100)}%</span>`);
    if (Loop.R().inc) chips.push(`<span class="g">🕯️ 回合香 ×${(1 + Loop.R().inc).toFixed(2)}</span>`);
    if (rg) chips.push(`<span class="p">${rg.arch ? '⚔️ ' + ((Rogue.ARCH.find(a => a.k === rg.arch) || {}).n || '') : '⚔️ 未选杀法'} · 祝福 ${Object.keys(rg.b).length} 种${rg.pend > 0 ? ` · 待选 ×${rg.pend}` : ''}</span>`);
    h += `<h3>📋 下一趟总览 <small>建筑 / 祭仪厅给的祝福 + 本页买的 SAN 强化 + 本局流派，合在一起</small></h3><div class="sum">${chips.join('') || '<span style="opacity:.6">还什么都没备——先去下面花点 SAN</span>'}</div>`;
    if (rg) h += `<h3>🎴 本局流派 · 祝福 <small>流派整局不变；祝福每次回洞结算后挑 1 个（3 选 1，可升 Lv3，同标签 3 种成套）</small></h3><div id="rgHost"></div>`;
    h += `<h3>🎐 下一趟增益 <small>每级 ×${CF.C.G} 价（≈每 3 级高一个数阶）；效果 = 上限 ×(1−${CF.C.Q}<sup>级数</sup>)，能无限点，但越点越不划算</small></h3><div class="grid">${CF.BUFFS.map(b => { const n = bLv(b.k), p = buffPrice(b.k); return lvCard('b', b.k, b.ic, b.n, n, b.d(CF.sat(b.A, n)), b.d(CF.sat(b.A, n + 1)), p, s.v >= p, ` <small>（上限 ${b.d(b.A)}）</small>`); }).join('')}</div>`;
    h += `<h3>⚔️ 武器附魔 <small>六种各自独立升级、可同时附上；强度 = 2n/(n+4)，1 级 0.4 → 4 级 1.0 → 12 级 1.5 → 上限 2.0</small></h3><div class="grid">${CF.ENCH.map(e => { const n = eLv(e.k), p = enchPrice(e.k); return lvCard('e', e.k, e.ic, e.n, n, e.d(CF.potency(n)), e.d(CF.potency(n + 1)), p, s.v >= p); }).join('')}</div>`;
    const fp = frenzyPrice(), ip = incensePrice(), bp = boonPrice(), boonOk = !!rg && s.bx < CF.BOON.max;
    h += `<h3>✨ 特别仪式</h3><div class="grid">
<div class="cd ${s.v >= fp ? '' : 'poor'}" data-x="frenzy" data-c="${fp}"><span class="pr">${fmt(fp)}</span><b>⚡ 躁动</b><i>洞里 ${CF.C.FRENZY_SEC} 秒 SAN ×${CF.C.FRENZY_X}</i><span>价格 ≈ 当前挂机 ${CF.FRENZY.secs} 秒产量（本回合连买 ×${CF.FRENZY.g}）。在洞里才计时——回洞第一件事就点它。</span></div>
<div class="cd ${s.v >= ip ? '' : 'poor'}" data-x="incense" data-c="${ip}"><span class="pr">${fmt(ip)}</span><b>🕯️ 魂晶香${s.ix ? `<em>Lv${s.ix}</em>` : ''}</b><i>${Math.round(incense() * 100)}% → ${Math.round(CF.sat(CF.INCENSE.A, s.ix + 1, CF.INCENSE.q) * 100)}%（上限 ${Math.round(CF.INCENSE.A * 100)}%）</i><span>本回合回洞结算的魂晶 +x%。SAN → 魂晶的唯一通道（每回合重置）。</span></div>
${rg ? `<div class="cd ${boonOk && s.v >= bp ? '' : 'poor'}" data-x="boon" data-c="${boonOk ? bp : 1e18}"><span class="pr">${boonOk ? fmt(bp) : '本回合已用'}</span><b>🎴 月光窥视</b><i>立刻 +1 次祝福抉择</i><span>祝福是整局永久的，所以每回合只能换 1 次。</span></div>` : ''}</div>`;
    h += `<h3>🏛️ 全洞产出一览 <small>估算：SAN/s 含魂力加成、不含光环 / 共鸣；魂晶 = 回合结算基础值（不含套装 / 章节 / 展厅）</small></h3>`;
    h += src.rows.length ? `<table><tr><th>建筑</th><th>在岗首级</th><th>🌀 SAN/s</th><th>🔮 魂晶/回合</th></tr>${src.rows.map(o => `<tr><td>${o.ic} ${o.n}</td><td>${o.k}</td><td class="s">${o.s > 0 ? '+' + fmt(o.s) : '—'}</td><td class="c">${o.ro ? '特殊规则' : fmt(o.c)}</td></tr>`).join('')}<tr><td><b>合计</b></td><td></td><td class="s"><b>+${fmt(src.tS)}</b></td><td class="c"><b>${fmt(src.tC)}+</b></td></tr></table>` : '<div class="note">还没有首级在岗——把首级插到建筑上，SAN 和魂晶就都有了。</div>';
    h += `<div class="note"><b>怎么理解这两样东西：</b>🔮 魂晶是<b>永久</b>的——造建筑、训练、鉴定；🌀 SAN 是<b>临时</b>的——洞里所有建筑都在持续刷，高阶首级、高阶建筑让它多几个数量级，但只能换“下一趟”的强化。<br>循环：魂晶买更好的建筑和更高阶的首级 → SAN 涨得更快 → 换更强的下一趟 → 打更多地方、带回更多首级和魂晶。点击把玩 ≈ 挂机产量的一小段，所以后期也不会失效。</div>`;
    return h;
  }
  function render() { if (!pn) return; const sc = pn.scrollTop || 0; const box = pn.querySelector('.box') || pn.appendChild(Object.assign(document.createElement('div'), { className: 'box' })); box.innerHTML = sanHTML(); const host = box.querySelector('#rgHost'); if (host) try { Rogue.mount(host); } catch (e) { console.warn('rogue mount', e); } pn.scrollTop = sc; }
  function softRefresh() { if (!pn || !open0) return; const s = st(), big = pn.querySelector('#sanBig'); if (big) big.textContent = fmt(s.v); pn.querySelectorAll('.cd[data-c]').forEach(el => el.classList.toggle('poor', s.v < +el.dataset.c)); }
  function open() {
    mkPn(); if (open0) return; open0 = true; pn.classList.add('on'); const g = G0(); try { if (g && g.setUIOpen) g.setUIOpen(true); document.exitPointerLock && document.exitPointerLock(); sfx('open'); } catch (e) { }
    pn.innerHTML = ''; render(); clearInterval(refreshT); refreshT = setInterval(softRefresh, 350);
  }
  function close() { if (!pn || !open0) return; open0 = false; pn.classList.remove('on'); clearInterval(refreshT); const g = G0(); try { if (g && g.setUIOpen) g.setUIOpen(false); sfx('close'); } catch (e) { } }
  addEventListener('keydown', e => {
    if (!on() || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return; const a = document.activeElement; if (a && (/INPUT|TEXTAREA|SELECT/.test(a.tagName) || a.isContentEditable)) return;
    if (e.code === 'Escape' && open0) { e.preventDefault(); e.stopImmediatePropagation(); if (window.Hub) Hub.closeAll(); else close(); return; }
    if (e.code === 'Backquote') { const g = G0(); if (!g || !g.playing || wild()) return; if (open0) { e.preventDefault(); e.stopImmediatePropagation(); window.Hub ? Hub.closeAll() : close(); return; } if (g.uiOpen || !rOn() || (window.GrandUI && GrandUI.isOpen())) return; e.preventDefault(); e.stopImmediatePropagation(); window.Hub ? Hub.go('san') : open(); }
  }, true);
  function reg() {
    if (!window.Hub || !Hub.PAGES || Hub.PAGES.some(p => p.id === 'san')) return;
    const i = Math.max(0, Hub.PAGES.findIndex(p => p.id === 'talents')) + 1;
    Hub.PAGES.splice(i, 0, { id: 'san', g: 'role', ic: '🌀', k: '`', n: { zh: '出征准备', ja: '出陣の準備', en: 'Expedition prep' }, isOpen: () => open0, open, close, ok: () => on() && rOn(), cave: 1 });
  }
  reg();
  let last = performance.now();
  setInterval(() => { try { const t = performance.now(), dt = Math.min(1, (t - last) / 1000); last = t; if (!G0() || !G0().S) return; reg(); if (on()) tick(dt); paint(); } catch (e) { console.warn('san', e); } }, 200);
  return { on, live, spec, prodLine, badge, gain, play, nb, incense, event, endTrip, st, idleRate, buyBuff, buyEnch, buyRite, open, close, fmt };
})();
