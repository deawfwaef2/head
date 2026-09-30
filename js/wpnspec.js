// R36b：武器详细属性（用户：“武器属性应该描述更多！比如攻击前摇时间，以及各种各种更详细的属性”）
// 只读：把 combat.js / foe.js / foe_abs.js 里真实用到的公式（自重 WEIGHT、握长、前摇 wu、出刀时长、冷却、体力、命中倍率）算出来显示。
// 改公式时请同步：combat.js mmAttack（wu/dur/cd/体力）、foe.js hit（12×q×速度系数×部位倍率）、foe_abs.js power()。
window.WpnSpec = (() => {
  const CT = () => window.CombatTune || { WEIGHT: [1.0, 1.3, 0.8, 1.5, 1.4, 0.9, 1.0], WK: w => Math.sqrt(Math.max(0.6, w)), CDB: { light: 500, fin: 750, heavy: 950 }, WU: { light: 0.08, fin: 0.09, heavy: 0.05 }, SW: { light: 0.15, fin: 0.22, heavy: 0.25 } }; // R37（主管）：直接读 combat.js 导出的 CombatTune，改公式不再需要两边同步
  const WT = CT().WEIGHT;
  const LEN = [0.8, 0.72, 0.72, 0.8, 0.85, 1.0, 1.08];       // = game.js WPN_ASSET 的握长（米）
  const KIND = ['钝击', '钝击 · 带钉', '砍刀', '链锤 · 甩击', '重斧', '长刀 · 镰', '刺剑'];
  const FEEL = [
    '普通手感：不快不慢，新手刀。',
    '略沉：比木棒慢一丝，但单击更扎实。',
    '最轻最快：前摇短、收招短，适合连击和抢破绽。',
    '偏沉：出手稍慢，一下砸得很重——别被人抢了空档。',
    '很沉的重斧：重击和破防强，连击节奏慢。',
    '偏轻的长刀：触及远、节奏快，魂力加成。',
    '最长的刺剑：触及最远，凶威加成，节奏中等。'
  ];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const G0 = () => window.G, S0 = () => G0() && G0().S;
  const cdOn = () => !window.Mods || Mods.on('atk_cd') !== false;

  function stAt(tier, plus) { // 临时换上该武器算出的面板
    const S = S0(), eq = S.eq.weapon, pl = (S.eqPlus || {}).weapon; S.eq.weapon = tier; S.eqPlus = S.eqPlus || {}; S.eqPlus.weapon = plus;
    try { return Object.assign({}, G0().st()); } finally { S.eq.weapon = eq; S.eqPlus.weapon = pl || 0; }
  }
  function spec(tier, plus) {
    tier = clamp(tier | 0, 0, WT.length - 1); plus = plus || 0; const T = RPG.EQUIP.weapon.tiers[tier], st = stAt(tier, plus);
    const wt = WT[tier], len = LEN[tier], ex = window.Stamina && Stamina.ex ? 1.3 : 1, kk = CT().WK(wt) * ex;
    const q = Math.pow(Math.max(5, st.power || 50) / 40, 0.8) * (window.Sack && Sack.dmgMul ? Sack.dmgMul() : 1) * (window.Balance && Balance.on() ? Balance.earlyDmg(st.power || 50) : 1); // R41：与 foe_abs.power() 一致
    const base = 12 * q, cdk = CT().WK(wt) * ex, C = CT(), sp = v => clamp(v / 8, 0.5, 1.8);
    const mk = (wu, swing, cd, stam, spd, mult, reach) => ({ wu: Math.round(wu * 1000), swing: Math.round((wu + swing) * 1000), cd: Math.round(cd), stam, reach: +reach.toFixed(2), dmg: Math.round(base * sp(spd) * mult) });
    const L = mk(C.WU.light * kk, C.SW.light * kk, C.CDB.light * cdk, 4, 8.2, 1, 1.5 + len * 0.8);
    const F = mk(C.WU.fin * kk, C.SW.fin * kk, C.CDB.fin * cdk, 6, 8.8, 1.3, 1.5 + len * 0.8);
    const H = mk(C.WU.heavy * kk, C.SW.heavy * kk, C.CDB.heavy * cdk, 12, 12.5, 2.2, 1.5 + len * 0.8 + 0.3);
    const cyc = cdOn() ? 2 * L.cd + F.cd : 2 * L.swing + F.swing, dps = Math.round((2 * L.dmg + F.dmg) / (cyc / 1000));
    const crit = Math.max(0, st.crit || 0), critD = st.critD || 150;
    return { tier, plus, name: T.n, atk: st.atk, power: Math.round(st.power || 0), wt, len, kind: KIND[tier], feel: FEEL[tier], L, F, H, dps, cyc: Math.round(cyc), crit, critD, ter: T.ter || 0, soul: T.soul || 0, base: Math.round(base), charge: 0.26 + 0.6, cdOn: cdOn(), ex: ex > 1, stat: st };
  }

  let css = 0;
  function addCss() {
    if (css) return; css = 1; const s = document.createElement('style'); s.textContent = `
.wsp{margin-top:8px;padding:8px 10px;border:1px solid rgba(255,210,122,.25);border-radius:8px;background:rgba(0,0,0,.28);font-size:12px;line-height:1.55;color:#e8dcc8}
.wsp h6{margin:0 0 4px;font-size:12px;color:#ffd27a;letter-spacing:1px}
.wsp table{width:100%;border-collapse:collapse}.wsp td,.wsp th{padding:1px 4px;text-align:right;font-weight:400;white-space:nowrap}.wsp th{color:#b9a98a;font-size:11px}
.wsp td:first-child,.wsp th:first-child{text-align:left;color:#ffe3a8}.wsp .n{color:#fff;font-weight:600}.wsp .u{color:#8fe88f}.wsp .d{color:#ff8f86}.wsp .z{color:#9a8e78}
.wsp .ft{color:#b9a98a;margin-top:4px}.wsp .tg{display:flex;flex-wrap:wrap;gap:4px;margin:2px 0 5px}.wsp .tg span{background:rgba(255,210,122,.12);border-radius:4px;padding:0 6px}`;
    document.head.appendChild(s);
  }
  // better: 'lo' 越小越好（前摇/间隔/体力）、'hi' 越大越好（伤害/触及/DPS）
  const dl = (a, b, better, unit, fix) => { if (b == null) return ''; const d = a - b; if (!d || Math.abs(d) < 1e-9) return ''; const good = better === 'hi' ? d > 0 : d < 0; return ` <span style="color:${good ? '#8fe88f' : '#ff8f86'}">${d > 0 ? '▲' : '▼'}${Math.abs(d).toFixed(fix || 0)}${unit || ''}</span>`; };
  function html(tier, plus, cmpTier, cmpPlus) {
    try {
      addCss(); const a = spec(tier, plus), b = cmpTier != null && (cmpTier !== tier || cmpPlus !== plus) ? spec(cmpTier, cmpPlus || 0) : null;
      const r = (nm, k, o) => `<tr><td>${nm}</td><td class="n">${a[k].wu} ms${dl(a[k].wu, b && b[k].wu, 'lo', '')}</td><td>${a[k].swing} ms${dl(a[k].swing, b && b[k].swing, 'lo', '')}</td><td>${a[k].cd} ms${dl(a[k].cd, b && b[k].cd, 'lo', '')}</td><td>${a[k].reach} m${dl(a[k].reach, b && b[k].reach, 'hi', '', 2)}</td><td>${a[k].stam}${dl(a[k].stam, b && b[k].stam, 'lo', '')}</td><td class="n">${a[k].dmg}${dl(a[k].dmg, b && b[k].dmg, 'hi', '')}</td></tr>`;
      const tags = [`⚖️ 自重 ${a.wt.toFixed(1)}${dl(a.wt, b && b.wt, 'lo', '', 1)}`, `📏 握长 ${a.len.toFixed(2)} m`, `🗡️ ${a.kind}`, `攻击 +${a.atk}`]; if (a.ter) tags.push(`凶威 +${a.ter}`); if (a.soul) tags.push(`魂力 +${a.soul}`); if (a.plus) tags.push(`强化 +${a.plus}`);
      const mm = v => Math.round(v * 10) / 10;
      return `<div class="wsp"><h6>⚔️ 武器详细属性${b ? ` <span class="z">（对比当前：${esc(b.name)}）</span>` : ''}</h6><div class="tg">${tags.map(t => `<span>${t}</span>`).join('')}</div>
<table><tr><th>出招</th><th>前摇</th><th>出刀</th><th>间隔</th><th>触及</th><th>体力</th><th>单击伤害</th></tr>
${r('轻击（1、2 段）', 'L')}${r('收招（第 3 段）', 'F')}${r('重击（蓄力）', 'H')}</table>
<table style="margin-top:4px"><tr><td>连击节奏</td><td class="n">${a.cyc} ms / 三连${dl(a.cyc, b && b.cyc, 'lo', '')}</td><td>连击输出</td><td class="n">≈ ${a.dps} /秒${dl(a.dps, b && b.dps, 'hi', '')}</td></tr>
<tr><td>暴击</td><td class="n">${a.crit.toFixed(1)}%${b ? dl(a.crit, b.crit, 'hi', '%', 1) : ''}</td><td>暴击伤害</td><td class="n">${Math.round(a.critD)}%</td></tr>
<tr><td>部位倍率</td><td colspan="3" class="n">头 ×1.6 · 颈 ×1.8 · 躯干 ×1 · 四肢 ×0.7 · 破绽中 ×2</td></tr>
<tr><td>蓄力</td><td colspan="3">按住左键 0.26 s 后开始蓄，约 ${mm(a.charge - 0.26)} s 蓄满；蓄满重击可破防（×2.2）</td></tr></table>
<div class="ft">💬 ${esc(a.feel)}${a.ex ? '　<span class="d">（体力耗尽：所有前摇/收招 ×1.3）</span>' : ''}${a.cdOn ? '' : '　（攻击冷却 MOD 已关：间隔 = 出刀时长）'}<br><span class="z">前摇 = 起手到刀开始判定；出刀 = 起手到收刀；间隔 = 到下一次能出手；伤害为基础面板 ×（0.85~1.15）随机，未计暴击/天赋；霸主·精英·猎手单刀最多扣 10% 血。</span></div></div>`;
    } catch (e) { console.warn('WpnSpec', e); return ''; }
  }
  function tip(tier, plus, cmpTier, cmpPlus) { // 背包悬浮提示用的紧凑版（窄框）
    try {
      const a = spec(tier, plus), b = cmpTier != null ? spec(cmpTier, cmpPlus || 0) : null, g = (k, f) => b ? dl(f(a), f(b), k === 'lo' ? 'lo' : 'hi', '', k === 'fl' ? 1 : 0) : '';
      return `<div style="margin-top:6px;padding-top:5px;border-top:1px solid rgba(255,210,122,.3);line-height:1.6"><span style="color:#ffd27a">⚔️ ${esc(a.kind)} · 自重 ${a.wt.toFixed(1)} · 握长 ${a.len.toFixed(2)}m</span><br>轻击 前摇 <b>${a.L.wu}ms</b>${g('lo', x => x.L.wu)} · 出刀 ${a.L.swing}ms · 间隔 ${a.L.cd}ms<br>伤害 <b>${a.L.dmg}</b>${g('hi', x => x.L.dmg)} / 收招 ${a.F.dmg} / 重击 <b>${a.H.dmg}</b>${g('hi', x => x.H.dmg)}<br>触及 ${a.L.reach}m${g('fl', x => x.L.reach)} · 体力 ${a.L.stam}/${a.F.stam}/${a.H.stam} · 连击 ≈ <b>${a.dps}</b>/秒${g('hi', x => x.dps)}<br><span style="color:#9a8e78">${esc(a.feel)}（完整数据：铁匠台）</span></div>`;
    } catch (e) { return ''; }
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return { spec, html, tip, WT, LEN };
})();
