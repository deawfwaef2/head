// R41 平衡：前期攻速 / 伤害 / 升级曲线（用户：“初期攻速太快了太强了……模拟游戏过程、升级过程，数值调整”）。MOD `balance_r41`（默认开）。
// 数值来自 tools/balance/sim.js 的蒙特卡洛模拟（node tools/balance/sim.js base|new），改这里请同步改 sim.js 的 TUNES.new。
//   ① tempo(lv)：出刀节奏（冷却 / 前摇 / 出刀时长）倍率，Lv1 ×1.5 → Lv26 ×1.0（熟能生巧）。combat.js 的 WK() 读它，wpnspec.js 显示也跟着变。
//   ② earlyDmg(power)：低战力时你的伤害打折，战力 55 → ×0.5，170 以上 → ×1（平滑）。foe_abs.power() 读它（所以 foe.js / 精英 / 猎手估算一致）。
//   ③ foeDmgK(rec)：低强度地区的普通敌人出手更疼：村庄 ×2.0 → 推荐战力 200 起 ×1.0。foe_abs.conv() 读它（霸主 / 猎手 / 精英不加成）。
//   ④ need(lv)：升级经验 40 + 11·lv^1.6（原 28 + 9·lv^1.6，前几级约慢 35%）；xpK(rec)：深层地区经验 ×(rec/40)^0.3（上限 ×2.2）。
//   ⑤ 旧存档迁移：第一次进入时把 S.xp 按旧曲线换算的等级 → 新曲线同等级的起点，等级不降（S.balV=41）。
//   保留 R35：敌人伤害 / 血量仍是 FoeAbs 的绝对数值，没有按玩家最大生命的百分比伤害，没有保底刀数。
window.Balance = (() => {
  const TUNE = { tempo: [1.5, 1.0], tempoLv: 26, earlyDmg: [0.5, 1.0], earlyP: [55, 170], foeEarly: 1.0, needA: 40, needB: 11, xpRec: 0.3, xpCap: 2.2 };
  const on = () => !window.Mods || !Mods.on || Mods.on('balance_r41') !== false;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  let lvC = 1, lvT = 0;
  function curLv() { const now = performance.now(); if (now - lvT < 400) return lvC; lvT = now; try { lvC = window.RPG && window.G && G.S ? RPG.lvOf(G.S.xp).lv : 1; } catch (e) { lvC = 1; } return lvC; }
  const tempo = () => lerp(TUNE.tempo[0], TUNE.tempo[1], clamp((curLv() - 1) / (TUNE.tempoLv - 1), 0, 1));
  const earlyDmg = P => { const t = clamp((P - TUNE.earlyP[0]) / (TUNE.earlyP[1] - TUNE.earlyP[0]), 0, 1); return lerp(TUNE.earlyDmg[0], TUNE.earlyDmg[1], t * t * (3 - 2 * t)); };
  const foeDmgK = rec => 1 + TUNE.foeEarly * clamp(1 - ((rec || 40) - 40) / 160, 0, 1);
  const need = lv => Math.round(TUNE.needA + TUNE.needB * Math.pow(lv, 1.6));
  const oldNeed = lv => Math.round(28 + 9 * Math.pow(lv, 1.6));
  const xpK = rec => clamp(Math.pow(Math.max(1, (rec || 40) / 40), TUNE.xpRec), 1, TUNE.xpCap);
  function migrate(S) { // 旧存档：保持等级
    if (!S || S.balV === 41) return; S.balV = 41; const xp = S.xp || 0; if (xp <= 0) return;
    let lv = 1, x = xp; while (lv < 60 && x >= oldNeed(lv)) { x -= oldNeed(lv); lv++; }
    const frac = lv >= 60 ? 0 : x / oldNeed(lv); let base = 0; for (let i = 1; i < lv; i++) base += need(i);
    S.xp = Math.round(base + frac * (lv >= 60 ? 0 : need(lv)));
  }
  const wait = setInterval(() => { if (window.G && G.HOOK && G.S) { clearInterval(wait); G.HOOK.frame.push(() => { if (G.S && G.S.balV !== 41 && on()) migrate(G.S); }); } }, 500);
  return { TUNE, on, tempo, earlyDmg, foeDmgK, need, xpK, migrate };
})();
