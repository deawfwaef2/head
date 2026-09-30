// ============================================================================
// ⚔️ forge.js —— 斯尼克的铁匠台（第二十二轮续 8 · Arena Agent，MOD「forge_buy」默认开）
//   用户反馈：装备/物品 UI 太小不好看；合成太乱；没有“直接花钱升级武器”好玩。
//   这里是洞窟菜单「⚔️ 装备」页：
//     · 5 个大装备卡（武器/头盔/护甲/护符/背篓）：3D 图标、当前属性、阶梯进度、下一阶预览（每项 +Δ、战力 +Δ）、一键花魂晶升级
//     · 武器卡内嵌「附魔」（材料 + 魂晶），不再单独一页
//     · 储物箱里搜刮到的同部位装备，直接在卡片下方“换上 / 分解”
//     · 顶部「🎯 下一个目标」：告诉你现在最值得升级什么、还差多少魂晶
//   关闭 MOD：回到第十九轮规则（魂晶不能直接买装备，仅附魔；装备靠野外搜刮）。
// ============================================================================
window.Forge = (() => {
  const on = () => !(window.Mods && Mods.on && Mods.on('forge_buy') === false);
  const SL = ['weapon', 'helm', 'armor', 'charm', 'bag'], PRE = { weapon: 'w', helm: 'h', armor: 'a', charm: 'c', bag: 'b' };
  const SN = { atk: '攻击', def: '防御', hp: '生命', str: '力量', con: '体魄', agi: '敏捷', ter: '凶威', soul: '魂力', cap: '背篓' };
  const STK = ['atk', 'def', 'hp', 'str', 'con', 'agi', 'ter', 'soul', 'cap'];
  const RARC = ['#b9b4aa', '#7fd07a', '#5fa6ff', '#c27cff', '#ffb347', '#ff5a4a', '#ffe27a'];
  const LINES = ['「嘿嘿，大块头，又带魂晶来了？」', '「斯尼克的货，童叟无欺——主要是没有童叟敢来。」', '「升一阶？小事。钱放桌上，别碰我的手指。」', '「这把好东西，上一个主人……嗯，现在挂在你洞里吧？」', '「魂晶，魂晶，嘿嘿嘿……」', '「附魔要血玉？那玩意儿比你的脑袋值钱。」'];
  const G = () => window.G, S = () => G().S, Sk = () => window.Sack;
  const fmt = n => Math.floor(n).toLocaleString();
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let flash = null, line = LINES[0], swapOpen = {};

  function css() {
    if (document.getElementById('fgCSS')) return; const st = document.createElement('style'); st.id = 'fgCSS';
    st.textContent = `
.fg{color:#eadcc4;font-family:system-ui,"Noto Sans CJK SC",sans-serif}
.fg-hero{display:flex;gap:22px;align-items:center;flex-wrap:wrap;padding:14px 18px;margin-bottom:14px;background:linear-gradient(100deg,rgba(120,70,20,.35),rgba(20,12,16,.6) 60%);border:1px solid rgba(231,194,122,.45)}
.fg-pw{font:700 13px system-ui;letter-spacing:.2em;color:#c9b48a}.fg-pw b{display:block;font:800 46px/1.05 "Noto Serif CJK SC",serif;color:#ffe2a0;letter-spacing:.04em;text-shadow:0 0 22px rgba(255,190,90,.55)}
.fg-st{display:grid;grid-template-columns:repeat(4,auto);gap:4px 22px;font-size:16px}.fg-st span{color:#a99d88}.fg-st b{color:#fff2d0;font-size:18px}
.fg-npc{flex:1;min-width:240px;font-size:15px;color:#cfc2a8;line-height:1.6}.fg-npc b{color:#f3d9a0}
.fg-goal{margin-bottom:16px;padding:11px 16px;border-left:4px solid #ffb347;background:rgba(255,179,71,.08);font-size:16px;line-height:1.6}.fg-goal b{color:#ffd890}.fg-goal.ok{border-color:#7fe07f;background:rgba(127,224,127,.08)}
.fg-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.fg-card{position:relative;padding:16px 18px 14px;background:linear-gradient(160deg,color-mix(in srgb,var(--rc) 14%,#1b1219),#100b12 70%);border:1px solid color-mix(in srgb,var(--rc) 55%,#3a2a2a);box-shadow:inset 0 0 28px color-mix(in srgb,var(--rc) 12%,transparent)}
.fg-card.weapon{grid-column:1/-1}
.fg-card.flash{animation:fgFlash .9s ease-out}
@keyframes fgFlash{0%{box-shadow:0 0 0 0 #ffd890,inset 0 0 60px #ffd890;filter:brightness(1.8)}100%{box-shadow:0 0 0 18px transparent,inset 0 0 28px transparent;filter:none}}
.fg-row{display:flex;gap:16px;align-items:stretch}
.fg-ic{flex:0 0 112px;height:112px;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle,color-mix(in srgb,var(--rc) 35%,#2a1e26),#0c080c 75%);border:1px solid var(--rc);box-shadow:0 0 18px color-mix(in srgb,var(--rc) 40%,transparent)}
.fg-ic img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 4px 5px #000c)}.fg-ic i{font-style:normal;font-size:58px}
.fg-main{flex:1;min-width:0}
.fg-top{display:flex;justify-content:space-between;font-size:14px;color:#b5a78c;letter-spacing:.1em}
.fg-name{font:800 26px/1.25 "Noto Serif CJK SC",serif;margin:2px 0 4px}.fg-name em{font-style:normal;font-size:19px;color:#c9a0ff;margin-left:6px}
.fg-chips{display:flex;flex-wrap:wrap;gap:6px 8px;margin:4px 0}.fg-chips span{font-size:15px;padding:2px 9px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);color:#f0e4cc}
.fg-desc{font-size:14px;color:#a0957f;min-height:20px}
.fg-pips{display:flex;gap:5px;margin-top:8px;align-items:center}.fg-pips i{width:26px;height:8px;background:rgba(255,255,255,.12)}.fg-pips i.d{background:var(--rc);box-shadow:0 0 8px var(--rc)}.fg-pips i.n{outline:1px dashed #ffd890;outline-offset:1px}.fg-pips small{margin-left:6px;color:#b5a78c;font-size:13px}
.fg-up{margin-top:12px;padding:11px 14px;background:rgba(0,0,0,.35);border:1px dashed rgba(231,194,122,.45);display:flex;gap:14px;align-items:center;flex-wrap:wrap}
.fg-up .nx{flex:1;min-width:200px}.fg-up .nx b{font-size:18px}.fg-up .df{margin-top:4px;display:flex;flex-wrap:wrap;gap:4px 12px;font-size:15px;color:#cfc2a8}.fg-up .df u{text-decoration:none;color:#8fe88f;font-weight:800}.fg-up .df s{text-decoration:none;color:#7a6f60}
.fg-up .pd{color:#ffd890;font-size:14px;margin-top:3px}
.fg-go{min-width:170px;font-size:17px !important;padding:12px 18px !important}
.fg-go small{display:block;font-size:12px;opacity:.8;letter-spacing:0;font-weight:500}
.fg-max{color:#ffe27a;font-size:16px;letter-spacing:.2em;padding:6px 0 0}
.fg-ench{margin-top:10px;padding:11px 14px;background:rgba(120,60,200,.12);border:1px dashed rgba(194,124,255,.5);display:flex;gap:14px;align-items:center;flex-wrap:wrap;font-size:15px}
.fg-ench .nx{flex:1;min-width:220px}.fg-ench b{color:#d8b4ff;font-size:17px}
.fg-need{display:inline-block;margin:2px 10px 0 0}.fg-need.ok{color:#8fe88f}.fg-need.no{color:#ff8f86}
.fg-swap{margin-top:12px;border-top:1px solid rgba(231,194,122,.2);padding-top:8px}
.fg-swap h5{margin:0 0 6px;font:700 14px system-ui;color:#c9b48a;letter-spacing:.1em;cursor:pointer}
.fg-sw{display:flex;gap:12px;align-items:center;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.06);font-size:15px}.fg-sw .ic{width:46px;height:46px;display:flex;align-items:center;justify-content:center;border:1px solid var(--rc);background:#140e14;flex:none}.fg-sw .ic img{width:100%;height:100%;object-fit:contain}.fg-sw .ic i{font-style:normal;font-size:26px}
.fg-sw .tx{flex:1;min-width:0}.fg-sw .tx small{display:block;color:#a99d88;font-size:13px}
.fg-sw .up{color:#8fe88f;font-weight:800}.fg-sw .dn{color:#ff8f86;font-weight:800}
@media (max-width:980px){.fg-grid{grid-template-columns:1fr}}
`; document.head.appendChild(st);
  }

  // ---- 数值 ----
  const tierOf = (sl, i) => RPG.EQUIP[sl].tiers[i];
  function statsOf(t, plus, sl) { const o = {}; for (const k of STK) if (typeof t[k] === 'number' && (t[k] || k === 'cap')) o[k] = t[k]; if (sl === 'weapon' && plus) o.atk = (o.atk || 0) + Math.round(t.atk * 0.15 * plus); return o; }
  const chips = (o) => Object.keys(o).filter(k => o[k]).map(k => `<span>${SN[k]} ${k === 'cap' ? o[k] + ' 颗' : '+' + o[k]}</span>`).join('') || '<span style="opacity:.6">无属性</span>';
  function powerWith(sl, tier) { const s = S(), keep = s.eq[sl]; s.eq[sl] = tier; let p = 0; try { p = G().st().power; } catch (e) { } s.eq[sl] = keep; return p; }
  function icon(sl, tier) { const id = PRE[sl] + tier, u = window.ItemIcons && ItemIcons.url && ItemIcons.url(id); return u ? `<img src="${u}" alt="">` : `<i>${sl === 'weapon' ? (Sk().IT[id] ? Sk().IT[id].icon : '🗡️') : RPG.EQUIP[sl].icon}</i>`; }
  const need = (id, n, have) => n ? `<span class="fg-need ${have >= n ? 'ok' : 'no'}">${Sk().IT[id].icon}${Sk().IT[id].n} ${have}/${n}</span>` : '';

  function card(sl) {
    const s = S(), E = RPG.EQUIP[sl], ci = s.eq[sl] || 0, c = E.tiers[ci], n = E.tiers[ci + 1], rc = RARC[Math.min(6, ci)];
    const plus = sl === 'weapon' ? (s.eqPlus.weapon || 0) : 0, cs = statsOf(c, plus, sl);
    const pips = E.tiers.map((t, i) => `<i class="${i <= ci ? 'd' : ''}${i === ci + 1 ? ' n' : ''}" title="${esc(t.n)}${t.cost ? ' · 🔮' + fmt(t.cost) : ''}"></i>`).join('');
    let up = '';
    if (!n) up = `<div class="fg-max">✦ 已是最强 ✦</div>`;
    else if (on()) {
      const ns = statsOf(n, plus, sl), keys = STK.filter(k => ns[k] !== undefined || cs[k] !== undefined);
      const df = keys.map(k => { const a = cs[k] || 0, b = ns[k] || 0; if (a === b) return ''; return `<span>${SN[k]} ${a} → <b>${b}</b> <u style="color:${b > a ? '#8fe88f' : '#ff8f86'}">${b > a ? '+' : ''}${b - a}</u></span>`; }).join('');
      const pd = powerWith(sl, ci + 1) - (G().st().power), poor = s.coins < n.cost;
      up = `<div class="fg-up"><div class="nx">⬆ 下一阶：<b style="color:${RARC[Math.min(6, ci + 1)]}">${esc(n.n)}</b><div class="df">${df}</div>${pd > 0 ? `<div class="pd">⚔️ 战力 +${fmt(pd)}</div>` : ''}<div class="fg-desc">${esc(n.desc || '')}</div></div>
        <button class="sk-btn fg-go" data-fup="${sl}" ${poor ? 'disabled' : ''}>⬆ 升级 🔮 ${fmt(n.cost)}${poor ? `<small>还差 🔮 ${fmt(n.cost - s.coins)}</small>` : '<small>花魂晶直接升级</small>'}</button></div>`;
    } else up = `<div class="fg-desc" style="margin-top:8px">下一阶「${esc(n.n)}」要去野外搜刮（铁匠台升级已关闭）。</div>`;
    // 武器：内嵌附魔
    let ench = '';
    if (sl === 'weapon') {
      const p = plus, cc = Sk().enchCost(p), have = Sk().have, ok = s.coins >= cc.coin && have('iron') >= cc.iron && have('dust') >= cc.dust && have('gem') >= cc.gem;
      ench = `<div class="fg-ench"><div class="nx">🔮 <b>附魔 +${p}</b>${p >= 10 ? ' · 已满' : ` → +${p + 1}`}　每级攻击 +15%（+5 起要血玉）<br>${p >= 10 ? '' : `<span class="fg-need ${s.coins >= cc.coin ? 'ok' : 'no'}">🔮 ${fmt(cc.coin)}</span>${need('iron', cc.iron, have('iron'))}${need('dust', cc.dust, have('dust'))}${need('gem', cc.gem, have('gem'))}`}</div>
        <button class="sk-btn fg-go" data-ench="eq" ${p >= 10 || !ok ? 'disabled' : ''}>${p >= 10 ? '已满' : '附魔'}<small>${p >= 10 ? '' : ok ? '材料齐了' : '材料/魂晶不足'}</small></button></div>`;
    }
    // 储物箱里的同部位装备
    const Ik = Sk().IT, list = Sk().inv().stash.filter(o => Ik[o.id] && Ik[o.id].kind === 'equip' && Ik[o.id].slot === sl);
    let swap = '';
    if (list.length) {
      const open = swapOpen[sl] !== false;
      swap = `<div class="fg-swap"><h5 data-fsw="${sl}">${open ? '▾' : '▸'} 🎒 储物箱里有 ${list.length} 件${E.n}</h5>${open ? list.map(o => { const d = Ik[o.id], t = tierOf(sl, d.tier), better = d.tier > ci, same = d.tier === ci; const u = window.ItemIcons && ItemIcons.url && ItemIcons.url(o.id);
        return `<div class="fg-sw" style="--rc:${RARC[Math.min(6, d.rar)]}"><div class="ic">${u ? `<img src="${u}" alt="">` : `<i>${d.icon}</i>`}</div><div class="tx"><b style="color:${RARC[Math.min(6, d.rar)]}">${esc(Sk().nameOf(o))}</b> <span class="${better ? 'up' : same ? '' : 'dn'}">${better ? '▲ 比身上的强' : same ? '＝ 同阶' : '▼ 不如身上的'}</span><small>${Object.entries(statsOf(t, o.plus || 0, sl)).map(([k, v]) => SN[k] + ' ' + v).join(' · ')}</small></div>
          <button class="sk-btn" data-fwear="${o.u}">换上</button><button class="sk-btn" data-fsal="${o.u}">分解</button></div>`; }).join('') : ''}</div>`;
    }
    return `<div class="fg-card ${sl}${flash === sl ? ' flash' : ''}" style="--rc:${rc}"><div class="fg-row"><div class="fg-ic">${icon(sl, ci)}</div><div class="fg-main"><div class="fg-top"><span>${E.icon} ${E.n}</span><span>阶 ${ci + 1} / ${E.tiers.length}</span></div>
      <div class="fg-name" style="color:${rc}">${esc(c.n)}${plus ? `<em>+${plus}</em>` : ''}</div><div class="fg-chips">${chips(cs)}</div><div class="fg-desc">${esc(c.desc || '')}</div><div class="fg-pips">${pips}</div></div></div>${up}${ench}${swap}</div>`;
  }

  function goal() {
    const s = S(); if (!on()) return '';
    const cand = SL.map(sl => { const ci = s.eq[sl] || 0, n = RPG.EQUIP[sl].tiers[ci + 1]; return n ? { sl, n, cost: n.cost, pd: powerWith(sl, ci + 1) - G().st().power } : null; }).filter(Boolean);
    if (!cand.length) return `<div class="fg-goal ok">✦ 全身装备已经是最强。剩下的路：附魔武器到 +10、去深处猎更稀有的首级。</div>`;
    const can = cand.filter(c => c.cost <= s.coins).sort((a, b) => b.pd / b.cost - a.pd / a.cost || b.pd - a.pd);
    if (can.length) { const c = can[0]; return `<div class="fg-goal ok">✅ <b>现在就能升级</b>：${RPG.EQUIP[c.sl].icon} ${esc(c.n.n)}（🔮 ${fmt(c.cost)}，战力 +${fmt(c.pd)}）——性价比最高的一项。</div>`; }
    const c = cand.sort((a, b) => a.cost - b.cost)[0];
    return `<div class="fg-goal">🎯 <b>下一个目标</b>：${RPG.EQUIP[c.sl].icon} ${esc(c.n.n)}，还差 <b>🔮 ${fmt(c.cost - s.coins)}</b>（战力 +${fmt(c.pd)}）。魂晶来自出猎斩首、展厅陈列、建筑产出。</div>`;
  }

  function tabHtml() {
    css(); const st = G().st(), s = S();
    if (!flash) line = LINES[Math.floor(Math.random() * LINES.length)];
    return `<div class="fg"><div class="fg-hero"><div class="fg-pw">战力<b>${fmt(st.power)}</b></div>
      <div class="fg-st"><span>攻击</span><b>${st.atk}</b><span>防御</span><b>${st.def}</b><span>生命</span><b>${st.maxHp}</b><span>闪避</span><b>${(st.dodge * 100).toFixed(1)}%</b><span>背篓</span><b>${st.cap} 颗</b><span>产出</span><b>×${st.yieldMul.toFixed(2)}</b><span>麻袋</span><b>${(() => { const g = Sk().inv().sack; return g.w + '×' + g.h; })()}</b><span>魂晶</span><b>🔮 ${fmt(s.coins)}</b></div>
      <div class="fg-npc">🧌 <b>地精行商·斯尼克</b><br>${line}</div></div>
      ${goal()}<div class="fg-grid">${SL.map(card).join('')}</div>
      <div class="sk-foot">装备有两条路：<b>花魂晶在这里直接升阶</b>，或在野外搜刮到高阶装备后回这里“换上”。花魂晶升阶时武器的附魔等级会保留；换上搜刮来的武器，附魔跟着那把武器走。</div></div>`;
  }

  function bind(root, rerender) {
    root.querySelectorAll('[data-fup]').forEach(b => b.onclick = () => {
      const sl = b.dataset.fup, g = G(); if (!g.buyEquip(sl)) { window.SFX && SFX.deny && SFX.deny(); return; }
      if (sl === 'bag' && Sk().resizeSack) Sk().resizeSack(); flash = sl; rerender(); setTimeout(() => { flash = null; }, 1200);
    });
    root.querySelectorAll('[data-fsw]').forEach(h => h.onclick = () => { const k = h.dataset.fsw; swapOpen[k] = swapOpen[k] === false; rerender(); });
    root.querySelectorAll('[data-fwear]').forEach(b => b.onclick = () => { const st = Sk().inv().stash, o = st.find(q => q.u === +b.dataset.fwear); if (!o) return; st.splice(st.indexOf(o), 1); Sk().equip(o, Sk().stashAdd); flash = Sk().IT[o.id].slot; rerender(); setTimeout(() => { flash = null; }, 1200); });
    root.querySelectorAll('[data-fsal]').forEach(b => b.onclick = () => { const o = Sk().inv().stash.find(q => q.u === +b.dataset.fsal); if (o) Sk().salvage(o); });
  }
  return { on, tabHtml, bind, css };
})();
