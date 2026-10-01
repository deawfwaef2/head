// R54i MOD run_loop（默认开）：把所有机制拧成一个“章节 × 回合”的循环，并控住数值：
// ① 回合：一次出猎（出洞→回洞）= 一回合。魂晶主要来自出猎（击杀 / 清空地点）和回合结算（摆出的首级按阶位定量产出）；
//    洞里把玩首级、头棋、建筑自动产出等“洞内收入”每回合有上限，超出部分不进口袋，而是变成下一回合结算的加成（最多 +60%）→ 资源不能无限刷。
// ② 章节：每章前往 2 个地区后，第 3 次出洞只能迎战本章 BOSS（选地点面板里能看到她的等级/血量/伤害）；每过一章 BOSS 更强（+5 级）。
// ③ 清空地点：杀光一个地点的人有清空奖励；离开时按清空程度结算（越干净越多）。
// ④ 肉鸽开局：每个新存档随机 2 条“世道”（全局规则），每一局都不一样。
// ⑤ 新宿敌：被你逃掉的老兵以上敌人（她正在追你时你离开了地点）会记住你，成为宿敌并随时间变强（由 nemesis 派出）。
window.Loop = (() => {
  const on = () => !window.Mods || Mods.on('run_loop') !== false;
  const G = () => window.G, W = () => (window.Worlds && Worlds.active ? Worlds._W : null);
  const plv = () => { try { return RPG.lvOf(G().S.xp).lv; } catch (e) { return 1; } };
  const MODS = [
    { k: 'bloodmoon', n: '血月之年', d: '敌人生命 +20%，回合产出 +25%', ehp: 1.2, pay: 1.25 },
    { k: 'barren', n: '贫瘠岁月', d: '回合产出 -20%，清空奖励 +40%', pay: 0.8, clear: 1.4 },
    { k: 'zealot', n: '狂热猎手', d: '宿敌逼近快 50%，回合产出 +15%', nem: 1.5, pay: 1.15 },
    { k: 'iron', n: '铁骨', d: '你的生命 +15%，移速 -5%', hp: 0.15, spd: -0.05 },
    { k: 'grip', n: '巨人之握', d: '你的伤害 +10%，敌人伤害 +10%', dmg: 0.1, edmg: 1.1 },
    { k: 'swift', n: '疾风岁月', d: '移速 +8%，敌人伤害 +8%', spd: 0.08, edmg: 1.08 },
    { k: 'feast', n: '盛宴', d: '每杀一人回复 3% 生命，回合产出 -10%', heal: 0.03, pay: 0.9 },
    { k: 'curse', n: '诅咒深重', d: '敌人等级 +2，清空奖励 +30%', elv: 2, clear: 1.3 }
  ];
  function R() {
    const S = G().S; if (!S.run) { const pool = MODS.slice(), m = []; for (let i = 0; i < 2; i++) m.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].k);
      S.run = { chap: 1, n: 0, round: 0, cave: 0, bonus: 0, last: 0, mods: m, boss: false, regs: [] }; setTimeout(() => { try { G().toast(`🎲 这一局的世道：${m.map(k => MODS.find(x => x.k === k).n).join(' · ')}（出洞选地点面板可查看规则）`, '#e8d0ff', 5); } catch (e) { } }, 4000); }
    return S.run;
  }
  const mod = (f, def) => { if (!on()) return def; let v = def; for (const k of R().mods) { const M = MODS.find(x => x.k === k); if (M && M[f] != null) v = typeof def === 'number' && def === 1 ? v * M[f] : v + M[f]; } return v; };
  // ---- 玩家/敌人倍率（被 nemesis / living 读取）----
  const runDmg = () => 1 + mod('dmg', 0), runHp = () => 1 + mod('hp', 0), runSpd = () => 1 + mod('spd', 0), enemyHp = () => mod('ehp', 1), enemyDmg = () => mod('edmg', 1), nemRate = () => mod('nem', 1), enemyLv = () => mod('elv', 0);
  const chapLv = () => on() ? (R().chap - 1) * 5 : 0;
  // ---- BOSS 回合 ----
  const BREG = () => { const L = (window.Lore && Lore.LOCS) || []; const done = R().regs; const k = L.map(l => l.k).filter(k => window.Explore && Explore.BOSSES[k]); return k[Math.min(k.length - 1, R().chap - 1)] || (L[0] && L[0].k) || 'village'; };
  let bossTrip = false;
  const isBossTrip = () => on() && bossTrip;
  function bossCard() {
    const k = BREG(), B = window.Explore && Explore.BOSSES[k], L = (window.Lore && Lore.LOCS.find(l => l.k === k)) || { n: k, rec: 100 }; if (!B) return '';
    const base = 1 + 4 * Math.max(0, Lore.LOCS.findIndex(l => l.k === k)), lv = base + 4 + chapLv() + enemyLv(), d = lv - plv(), hk = Math.max(0.7, Math.min(4, Math.pow(1.1, d))) * enemyHp(), dk = Math.max(0.7, Math.min(3, Math.pow(1.07, d))) * enemyDmg();
    return `<div id="lpBoss" style="--bc:${B.col || '#ffd060'}"><div class="t">第 ${R().chap} 章 · BOSS 战</div><div class="n">👑 ${B.n} <small>${B.title} · ${L.n}</small></div>
<div class="s"><span>等级 <b>Lv.${lv}</b>（你 Lv.${plv()}${d >= 6 ? ' · <i>极度危险</i>' : d >= 2 ? ' · 危险' : ''}）</span><span>生命 ×<b>${hk.toFixed(2)}</b></span><span>伤害 ×<b>${dk.toFixed(2)}</b></span><span>威压 ×${(B.pow || 1).toFixed(1)}</span><span>${B.traits ? B.traits.join(' · ') : ''}</span></div>
<p>你已经在本章去过 2 个地区。洞口被月光封住，只剩一条路——去「${L.n}」的最深处，砍下她的头。打赢进入第 ${R().chap + 1} 章；逃回来下次还是她。</p><button data-lp="boss">⚔️ 迎战</button></div>`;
  }
  function css() { if (document.getElementById('lpCss')) return; const s = document.createElement('style'); s.id = 'lpCss'; s.textContent = `
#lpHead{margin:6px 0 10px;padding:8px 14px;border-left:3px solid #e1c07e;background:linear-gradient(90deg,#1a1410d0,transparent);font-size:13px;color:#e8dcc4;letter-spacing:.04em}#lpHead b{color:#ffd890}#lpHead small{color:#a89880}
#lpBoss{margin:10px 0;padding:16px 18px;border:1px solid var(--bc);background:radial-gradient(120% 140% at 0 0,#2a1414ee,#0a0607f2);border-radius:4px}#lpBoss .t{font-size:12px;letter-spacing:.3em;color:#c8a8a0}#lpBoss .n{font-size:24px;color:var(--bc);margin:4px 0 8px;font-weight:700}#lpBoss .n small{font-size:13px;color:#c8b8a8;font-weight:400}
#lpBoss .s{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:13px;color:#e8d8c0}#lpBoss .s i{color:#ff7a6a;font-style:normal}#lpBoss p{font-size:13px;color:#b8a890;line-height:1.7}#lpBoss button{padding:9px 26px;border:1px solid var(--bc);background:linear-gradient(#4a1c14,#220c08);color:#ffe8c8;font-size:15px;letter-spacing:.2em;cursor:pointer;border-radius:3px}`; document.head.appendChild(s); }
  function inject() {
    const host = document.querySelector('.rq-pick') || document.querySelector('.locs'); if (!host || !host.offsetParent || document.getElementById('lpHead')) return; css(); const r = R();
    const h = document.createElement('div'); h.id = 'lpHead';
    h.innerHTML = `📖 <b>第 ${r.chap} 章</b> · 本章已去 ${Math.min(2, r.n)}/2 个地区${r.n >= 2 ? ' · <b>只能迎战 BOSS</b>' : ''} · 回合 ${r.round} · 洞内收入 ${Math.round(r.cave)}/${capCave()}（超出转为下回合产出 +${Math.round(r.bonus * 100)}%）<br><small>世道：${r.mods.map(k => { const M = MODS.find(x => x.k === k); return M.n + '（' + M.d + '）'; }).join('；')}</small>`;
    host.parentNode.insertBefore(h, host);
    if (r.n >= 2) { host.style.display = 'none'; const b = document.createElement('div'); b.innerHTML = bossCard(); host.parentNode.insertBefore(b, host); b.addEventListener('click', e => { if (!e.target.closest('[data-lp="boss"]')) return; e.stopPropagation(); bossTrip = true; try { UI._startTrip(BREG()); } catch (er) { bossTrip = false; console.warn(er); } }); }
  }
  // ---- 回合经济 ----
  const capCave = () => Math.round(40 + 0.5 * (R().last || 60));
  function payout() {
    const r = R(); let v = 0, n = 0; try { for (const h of G().heads || []) { if (!h || !h.mount || !h.rec) continue; n++; v += 2 + 3 * ((h.rec.c && h.rec.c.rar) || 0); } } catch (e) { }
    const p = Math.round((10 + v) * (1 + r.bonus) * mod('pay', 1) * (1 + (r.chap - 1) * 0.15)); return { p, n, b: r.bonus };
  }
  function caveGate(v) {
    if (!on() || W() || !(v > 0)) return v; const r = R(), cap = capCave(), keep = Math.max(0, Math.min(v, cap - r.cave)), extra = v - keep; r.cave += keep;
    if (extra > 0) { r.bonus = Math.min(0.6, r.bonus + extra / Math.max(60, r.last || 60) * 0.25); if (!caveGate.told) { caveGate.told = 1; try { G().toast(`🔒 本回合洞内收入已到上限 ${cap}——再把玩的魂晶转为下回合结算加成（现在 +${Math.round(r.bonus * 100)}%，最多 +60%）`, '#d8c8ff', 3.6); } catch (e) { } } }
    return keep;
  }
  function roundEnd(died) {
    const r = R(); r.round++; caveGate.told = 0;
    if (bossTrip) { const won = W0won(); if (won) { r.chap++; r.n = 0; try { G().toast(`📖 第 ${r.chap - 1} 章完结！进入第 ${r.chap} 章——之后的 BOSS 会更强`, '#ffd890', 4.5); } catch (e) { } } }
    else if (!died) r.n = Math.min(2, r.n + 1);
    bossTrip = false;
    if (died) { r.cave = 0; r.bonus = 0; return; }
    const P = payout(); G().addCoins(P.p); r.last = P.p; r.cave = 0; r.bonus = 0;
    setTimeout(() => { try { G().toast(`🔄 回合 ${r.round} 结算：魂晶 +${P.p}（摆出的首级 ${P.n} 颗${P.b ? ` · 上回合把玩/头棋加成 +${Math.round(P.b * 100)}%` : ''}）`, '#ffe0a0', 4.2); } catch (e) { } }, 1600);
  }
  let bossKilledThisTrip = false; const W0won = () => bossKilledThisTrip;
  // ---- 清空地点 ----
  function nodeStat() { const w = W(); if (!w || !w.foes) return null; const all = w.foes.filter(f => !f.hunter2 && !f.nemClone && !f.nemX), dead = all.filter(f => f.dead && !f.escaped).length; return { all: all.length, dead }; }
  function clearReward(final) {
    const w = W(), st = nodeStat(); if (!w || !st || !st.all || !node0 || node0.paid) return; const ratio = st.dead / st.all; if (!final && ratio < 1) return; node0.paid = 1;
    const base = (w.graph.loc && w.graph.loc.loot ? (w.graph.loc.loot[0] + w.graph.loc.loot[1]) / 2 : 20) * 0.25 * st.all, c = Math.round(base * ratio * ratio * mod('clear', 1));
    if (c <= 0) return; G().addCoins(c); try { w.trip.coins += c; } catch (e) { }
    try { G().toast(ratio >= 1 ? `🏁 地点清空！所有 ${st.all} 人都倒下了 · 清空奖励 🔮+${c}` : `🏳️ 离开时清空 ${Math.round(ratio * 100)}% · 奖励 🔮+${c}`, ratio >= 1 ? '#ffd890' : '#d8c8b0', 3); SFX.coins && SFX.coins(); } catch (e) { }
  }
  // ---- 离开地点：结算清空 + 正在追你的高阶敌人成为新宿敌 ----
  function leaveNode() {
    if (!on()) return; const w = W(); if (!w) return; clearReward(true);
    try { if (window.Foe && window.Nemesis) for (const fo of Foe.foes) { if (fo.dead || !fo.seen || fo.state !== 'chase' || (fo.tier || 0) < 1 || fo.hunter2 || fo.nemClone || fo.boss) continue; Nemesis.addFoe(fo); } } catch (e) { }
  }
  let wasW = null, node0 = null;
  function tick() {
    if (!on() || !G() || !G().S) return; R(); const w = W();
    if (w !== wasW) { if (w && !wasW) { bossKilledThisTrip = false; if (!bossTrip) R().regs.push(w.graph && w.graph.loc ? w.graph.loc.k : ''); } if (!w && wasW) roundEnd(!!wasW.dead || (G().S.hp <= 0)); wasW = w; node0 = null; }
    if (w) { if (!w.busy && w.B && !w.B.corr && (!node0 || node0.i !== w.cur)) node0 = { i: w.cur }; clearReward(false); if (bossTrip && window.Foe && Foe.foes.some(f => f.boss && f.dead)) bossKilledThisTrip = true; }
    else inject();
  }
  setInterval(() => { try { tick(); } catch (e) { } }, 500);
  // 本章已去 2 个地区 → 任何出发入口（地点卡 / 委托 / 精英）都改为迎战本章 BOSS
  function wrapStart() { if (!window.UI || !UI._startTrip || UI._startTrip.__lp) return; const f = UI._startTrip; UI._startTrip = function (k) { if (on() && G() && G().S && R().n >= 2) { k = BREG(); bossTrip = true; } else bossTrip = false; return f.call(this, k); }; UI._startTrip.__lp = 1; }
  wrapStart(); setTimeout(wrapStart, 0);
  // 每杀一人回血（世道“盛宴”）
  function onKill() { const h = mod('heal', 0); if (h > 0) try { const s = G().st(); G().S.hp = Math.min(s.maxHp, G().S.hp + s.maxHp * h); } catch (e) { } }
  return { on, R, MODS, runDmg, runHp, runSpd, enemyHp, enemyDmg, nemRate, enemyLv, chapLv, isBossTrip, leaveNode, onKill, payout, capCave, caveGate };
})();
