// R35 MOD foe_abs（默认开）：删除两套“保险”机制——
//   ① 敌人伤害 = 玩家最大生命 × 百分比（→ 换成按 地区推荐战力 的绝对数值：越深越疼，血厚才扛得住）
//   ② 每刀保底伤害 + 普通敌人第 6 刀必死 / 霸主第 12 刀必死 / 野兽第 6~8 刀必死（foe.js / beasts.js 里 if (!FoeAbs.on) 跳过）
// 敌人血量 = 基础 × (推荐战力/40)^0.8；你的伤害 = 12 × (你的战力/40)^0.8（不再夹在 0.25~3 倍之间）。
// 结果：新手装备去最深地区 ≈ 砍几十刀才死一个、自己挨两下就倒——必须刷装备/练级。
// 改动点（都带 FoeAbs.on 判断，关 MOD 恢复原样）：foe.js hit()、beasts.js hit()/hpM、worlds.js ctx.power/hitPlayer、foe_ai2.js dmgK/hpK。
window.FoeAbs = (() => {
  const modOn = () => !window.Mods || Mods.on('foe_abs');
  const RAR = [0.7, 0.9, 1.15, 1.5, 2.1];
  const hpK = rec => Math.pow(Math.max(0.5, (rec || 40) / 40), 0.8);
  const REF = rec => 140 * Math.pow(Math.max(0.5, (rec || 40) / 40), 0.65); // 该强度下“参考生命”：敌人原本按玩家最大生命算的百分比，改成乘这个
  function recOf(fo, locRec) {
    if (fo && fo.absRec) return fo.absRec; // 猎手 / 精英BOSS 自带强度
    const r = locRec || 40; if (!fo) return r;
    return r * (fo.boss ? (fo.boss.pow || 2) : RAR[Math.max(0, Math.min(4, fo.rar | 0))] || 1);
  }
  function conv(fo, n, s, locRec) { const mh = Math.max(1, s.maxHp || 140); const eb = window.Balance && Balance.on() && fo && !fo.boss && !fo.hunter && !fo.absRec ? Balance.foeDmgK(locRec || 40) : 1; /* R41：前期敌人出手更疼 */ return Math.max(1, Math.round(n / mh * REF(recOf(fo, locRec)) * eb)); }
  function power() { const st = window.G && G.st ? G.st() : { power: 50 }; return Math.pow(Math.max(5, st.power || 50) / 40, 0.8) * (window.Sack && Sack.dmgMul ? Sack.dmgMul() : 1) * (window.Balance && Balance.on() ? Balance.earlyDmg(st.power || 50) : 1); /* R41：低战力时伤害打折，见 js/balance.js */ }
  // 小BOSS（regionquest 在 populate 后把血设成固定 100）→ 也按地区缩放一次
  setInterval(() => {
    if (!modOn() || !window.Foe || !Foe.foes || !window.Worlds || !Worlds.active) return; const W = Worlds._W, node = W && W.graph && W.graph.nodes[W.cur]; if (!node || !node.loc) return;
    for (const fo of Foe.foes) if (fo.rqMini && !fo._absMini && !fo.dead) { fo._absMini = 1; const k = hpK(node.loc.rec * 1.5); fo.maxHp = Math.round(fo.maxHp * k); fo.hp = Math.round(fo.hp * k); }
  }, 500);
  // 给其它系统用：该地区普通敌人要砍几刀（预估，用于胜率/差距显示）
  function hitsToKill(rec, hp0) { const dmg = 12 * power(); return Math.max(1, Math.ceil((hp0 || 42) * hpK(rec) / Math.max(1, dmg))); }
  return { get on() { return modOn(); }, hpK, REF, recOf, conv, power, hitsToKill };
})();
