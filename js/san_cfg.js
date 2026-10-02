// SAN 数值表（纯数据 + 纯函数，san.js 和 tools/test/sanbench.js 共用；改数值只改这里，然后跑 node tools/test/sanbench.js 看曲线）。
// 设计：魂晶 = 永久经济（造建筑 / 训练），回合结算按首级发；SAN = 临时经济，洞里持续刷，只花在“下一趟”的临时强化上。
//   ① 产出：每次触发 SAN = 旧魂晶产出 × K；② 价格：每升一级 ×G（约 2.2，每 3 级高一个数阶），随章节再涨；③ 效果：A·(1−Q^n) 渐近上限——能无限点，但越点越不划算；
//   ④ 点击：把玩 = 本颗产出 ×POKE_BASE + 挂机速度 ×POKE_IDLE 秒（点击价值随挂机产量成长，不会后期失效也不会一直碾压挂机）。
window.SAN_CFG = (() => {
  const C = { K: 3, G: 2.2, Q: 0.94, POKE_BASE: 0.25, POKE_IDLE: 0.4, AWAY: 0.5, AWAY_MAX: 600, FRENZY_SEC: 120, FRENZY_X: 2, CH_K: 0.5 };
  const chapK = ch => 1 + C.CH_K * (Math.max(1, ch | 0) - 1); // 章节越深，同一级越贵（敌人也更强）
  const sat = (A, n, q) => A * (1 - Math.pow(q || C.Q, n)); // n 级的效果，上限 A
  const price = (b, n, ch, g) => Math.round(b * chapK(ch) * Math.pow(g || C.G, n)); // 买第 n+1 级的价格（n = 已有级数）
  // 下一趟增益：k = Loop.nb() 的键；A = 无限级的上限；b = 第 1 级基础价；u = 单位（用于显示）
  const BUFFS = [
    { k: 'dmg', ic: '💢', n: '嗜血低语', A: 1.5, b: 150, d: v => `伤害 +${Math.round(v * 100)}%` },
    { k: 'hp', ic: '🛡️', n: '铁肤', A: 1.5, b: 150, d: v => `生命 +${Math.round(v * 100)}%` },
    { k: 'spd', ic: '🏃', n: '疾行', A: 0.4, b: 100, d: v => `移速 +${Math.round(v * 100)}%` },
    { k: 'fear', ic: '😱', n: '恐惧光环', A: 0.25, b: 220, d: v => `敌人生命 -${Math.round(v * 100)}%` },
    { k: 'heal', ic: '🩸', n: '啜饮', A: 0.06, b: 220, d: v => `每杀回血 ${(v * 100).toFixed(1)}%` },
    { k: 'clear', ic: '🪙', n: '贪婪', A: 2, b: 120, d: v => `清空地点奖励 +${Math.round(v * 100)}%` }
  ];
  // 武器附魔：六种各自独立升级、可同时附上；强度 P(n) = 2n/(n+4)：1 级 0.4、4 级 1.0、12 级 1.5、无穷 2.0
  const ENCH = [
    { k: 'fire', ic: '🔥', n: '炽焰', b: 300, d: P => `命中 30% 点燃：3 秒烧掉 ${Math.round(50 * P)}% 本刀伤害` },
    { k: 'frost', ic: '❄️', n: '霜寒', b: 300, d: P => `命中冻伤 3 秒（减速），并追加 ${Math.round(15 * P)}% 本刀伤害的寒伤` },
    { k: 'thunder', ic: '⚡', n: '雷鸣', b: 300, d: P => `每 4 次命中放闪电：劈 ${Math.min(3, 1 + Math.floor(P * 2))} 个附近敌人，各 ${Math.round(80 * P)}% 本刀伤害` },
    { k: 'venom', ic: '☠️', n: '剧毒', b: 300, d: P => `命中叠毒（至多 ${3 + Math.floor(P * 2)} 层），每层 4 秒掉 ${Math.round(40 * P)}% 本刀伤害` },
    { k: 'blood', ic: '🩸', n: '血饮', b: 300, d: P => `命中回 ${(0.4 * P).toFixed(2)}% 最大生命；击杀回 ${(1.5 * P).toFixed(1)}%` },
    { k: 'soul', ic: '👻', n: '噬魂', b: 300, d: P => `每次击杀掉落 ${(3 * P).toFixed(1)} × 章节系数 魂晶` }
  ];
  const potency = n => (n > 0 ? 2 * n / (n + 4) : 0);
  // 其他 SAN 去处
  const INCENSE = { b: 400, A: 0.6, q: 0.88, g: 2.2 };   // 魂晶香：本回合结算魂晶 +eff（SAN → 魂晶的桥，每回合重置）
  const BOON = { b: 1200, g: 2.5, max: 1 };                // 月光窥视：+1 次祝福抉择（每回合限 1 次——祝福是整局永久的，不能拿 SAN 无限买）
  const FRENZY = { floor: 200, secs: 45, g: 1.8 };         // 躁动：价格 = max(下限, 挂机速度×45 秒)，同回合连买 ×1.8；洞里 120 秒内 SAN 产量 ×2（离洞不计时）
  const frenzyPrice = (rate, ch, k) => Math.round(Math.max(FRENZY.floor * chapK(ch), rate * FRENZY.secs) * Math.pow(FRENZY.g, k));
  // 洞里小游戏（魂球 / 盗魂灵 / 摆件…）每进账 1 魂晶 = 多少 SAN
  const PLAY_SAN = 8;
  // 点击产出
  const poke = (val, idleRate, combo) => Math.max(1, Math.round(val * C.K * C.POKE_BASE + idleRate * C.POKE_IDLE * (1 + 0.1 * Math.min(combo | 0, 10))));
  // 建筑产 SAN 的修正：只乘 SAN（不影响魂晶结算）。用 node tools/test/sanbench.js --bld 看“回本回合数”，把贵的、靠互动抓收益的建筑拉到 3~7 回合回本
  const SANX = { lampost: 4, headless_statue: 6, bloodpool: 12, vault: 1.8, rocker: 2, cuckoo: 3, sworn: 3, vending: 10, appraisal: 8, auction: 10 };
  // 没有计时器的建筑（回合厅 / 魂轮 / 联动建筑 / 高阶特殊建筑）的 SAN 规格：[周期秒, 倍率]
  const SPEC = { wheel: [6, 1], rh_moondial: [12, 1.2], rh_brewjar: [12, 1.5], rh_scales: [12, 1], rh_maw: [12, 2], rh_palisade: [12, 1], rh_dice: [12, 1.2], rh_council: [12, 1], rh_pyre: [12, 1.5], rh_family: [12, 1], rh_twins: [12, 1.2], relic_altar: [12, 1],
    syn_village: [12, 1.5], syn_forest: [12, 1.5], syn_wilds: [12, 1.5], syn_abbey: [12, 1.5], syn_swamp: [12, 1.5], syn_fortress: [12, 1.5], syn_capital: [12, 1.5], syn_abyss: [12, 1.5], syn_peak: [12, 1.5] };
  const fmt = n => {
    n = Math.floor(n); if (!isFinite(n)) return '∞'; if (n < 10000) return n.toLocaleString('en-US');
    const U = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc']; let i = 0, v = n; while (v >= 1000 && i < U.length - 1) { v /= 1000; i++; }
    return (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + U[i];
  };
  return { C, chapK, sat, price, BUFFS, ENCH, potency, INCENSE, BOON, FRENZY, frenzyPrice, PLAY_SAN, poke, fmt, SANX, SPEC };
})();
