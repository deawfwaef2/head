// SAN / 魂晶 经济模拟：node tools/test/sanbench.js [rounds=40] [--csv]
// 用 js/san_cfg.js 的真实数值 + 建筑目录（周期/倍率/槽位/价格）模拟“一个会玩的人”：每回合获得首级、按最优方式摆放、用魂晶买建筑，
// 再把 SAN 花在“下一趟增益”上。输出每回合：魂晶收入、SAN 挂机速度、SAN 回合产量、可买的增益级数、魂晶香折算比。
// 假设（可改）：一回合 240 秒，在洞里 35%，其余出猎（离洞挂机按 AWAY 折算）；野外魂晶 H(ch)=200·1.3^(ch-1)；
// 稀有度随章节上升；soul 属性让 yieldMul 缓慢增长。目的是看“数量级与比值”，不是精确预测。
const fs = require('fs'), path = require('path'), vm = require('vm');
const win = {}; vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../js/san_cfg.js'), 'utf8'), { window: win, Math, Number }); const S = win.SAN_CFG;
// type, 基础价, 增长, 槽位, 周期, 倍率, 展柜(showcase)；周期 0 = 回合厅（SAN 用 SPEC 12s × 厅倍率）
const T = `pole 50 1.4 1 10 1|shrine 400 1.5 1 20 4|headrack 800 1.55 3 12 1.2|lampost 4500 1.6 4 15 1.8|bloodpool 20000 1.7 5 24 4|seance 260 1.7 1 30 2|showcase 180 1.55 1 12 1.5 1|gothic_cabinet 1400 1.65 6 14 2 1|head_chandelier 2200 1.65 6 12 2.2|curio_shelf 1800 1.6 8 15 1.75 1|gothic_commode 1600 1.6 4 16 2.6|bust_pedestal 650 1.5 1 13 3 1|headless_statue 3200 1.7 1 18 4.8 1|soul_urns 950 1.55 3 11 1.6|pickle_barrels 1350 1.6 3 12 1.8|vault 3600 2.2 4 14 2.8|tea_party 900 1.6 4 13 1.7|portrait_gallery 1300 1.6 3 14 1.8 1|rocker 650 1.7 1 12 1.4|trophy_lodge 1800 1.6 4 15 2|appraisal 2400 1.9 1 16 1.2|tv_couch 1600 1.65 3 12 1.5|head_garden 800 1.6 3 14 1.3|cuckoo 900 1.7 1 45 4|vending 1200 1.7 1 30 1.3|roulette 1800 1.7 6 14 1.2|head_piano 2600 1.75 7 16 1.15|sworn 2200 1.7 3 18 1.25|auction 3200 1.75 1 20 1.1|kubi_jikken 1100 1.6 5 12 1.8 1|traitor_gate 1600 1.6 7 16 2 1|tsantsa 2000 1.6 12 10 1.4|jingguan 3000 1.65 10 18 2.2|salome_feast 2400 1.6 6 15 1.9|drum_rite 1500 1.6 6 11 1.5|rh_moondial 700 1.6 4 0 1.2|rh_brewjar 500 1.6 1 0 0.8|rh_scales 600 1.6 2 0 1|rh_maw 900 1.7 1 0 0.6|rh_palisade 400 1.55 5 0 1|rh_dice 450 1.6 1 0 1.2|rh_council 1200 1.65 5 0 1|rh_pyre 350 1.55 1 0 1.5|rh_family 1500 1.7 6 0 1|rh_twins 800 1.6 2 0 1.2`.split('|').map(s => { const a = s.split(' '); return { t: a[0], base: +a[1], grow: +a[2], slots: +a[3], per: +a[4] || 12, mult: +a[5], sc: !!a[6], hall: !+a[4] }; });
const Y = [1, 3, 8, 20, 55], BASE = [10, 20, 36, 60, 100];
const rounds = +process.argv[2] || 40, TR = 240, CAVE = 0.35, SANF = CAVE + (1 - CAVE) * S.C.AWAY;
const chOf = r => 1 + Math.floor((r - 1) / 5);
const wts = ch => { const t = Math.min(1, (ch - 1) / 9); return [0.6 - 0.6 * t, 0.3 + 0.1 * t - 0.3 * t * t, 0.1 + 0.3 * t, 0.0 + 0.45 * t * (1 - t) + 0.1 * t, 0.2 * t * t].map(x => Math.max(0, x)); };
const bf = d => d.hall ? 1.05 : Math.min(1.5, 0.85 + 0.12 * Math.min(5, d.mult)) + (d.sc ? 0.15 : 0);
const sanRate = d => (d.hall ? (S.SPEC[d.t] ? S.SPEC[d.t][1] / S.SPEC[d.t][0] : d.mult / 12) : d.mult / d.per) * (S.SANX[d.t] || 1); // 每颗首级每秒的“倍率”
if (process.argv.includes('--bld')) { // 每座建筑：放满英魂(rar2)时每回合 魂晶 / SAN / 折算总值，以及 1 座的回本回合数
  const out = T.map(d => { const coin = d.slots * BASE[2] * bf(d) * 1.25, san = d.slots * Y[2] * sanRate(d) * S.C.K * 1.5 * TR * SANF, val = coin + san / 20; return { t: d.t, cost: d.base, slots: d.slots, coin: Math.round(coin), san: S.fmt(san), val: Math.round(val), payback: +(d.base / val).toFixed(2), sanShare: Math.round(san / 20 / val * 100) + '%' }; }).sort((a, b) => a.payback - b.payback);
  console.log('type'.padEnd(18), 'cost  slots coin/rd  SAN/rd   value  payback(rounds) SAN占比'); for (const o of out) console.log(o.t.padEnd(18), String(o.cost).padStart(6), String(o.slots).padStart(4), String(o.coin).padStart(7), String(o.san).padStart(8), String(o.val).padStart(7), String(o.payback).padStart(8), String(o.sanShare).padStart(8)); process.exit(0);
}
let coins = 120, heads = [], owned = []; const cnt = {}; const rows = [];
const cost = d => Math.round(d.base * Math.pow(d.grow, cnt[d.t] || 0));
function layout() { // 最优摆放：高倍率槽位给高阶首级
  const slots = []; for (const b of owned) for (let i = 0; i < b.d.slots; i++) slots.push(b.d);
  slots.sort((a, b) => sanRate(b) - sanRate(a)); const hs = heads.slice().sort((a, b) => b - a);
  let san = 0, coin = 0; const n = Math.min(slots.length, hs.length);
  for (let i = 0; i < n; i++) { const d = slots[i], r = hs[i]; san += Y[r] * sanRate(d); coin += BASE[r] * bf(d); }
  return { san, coin, n };
}
const sample = (w, rnd) => { let x = rnd * w.reduce((a, b) => a + b, 0); for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0) return i; } return 4; };
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let r = 1; r <= rounds; r++) {
  const ch = chOf(r), w = wts(ch);
  for (let i = 0; i < Math.round(3 + ch * 0.8); i++) heads.push(sample(w, rnd())); // 每回合带回的首级
  const yieldMul = 1 + 0.04 * (5 + 2.5 * Math.pow(r, 0.8)), aura = 1.3;
  // 买建筑：每次选“Δ(魂晶 + SAN 折成魂晶)/价格”最大的（SAN 20 : 魂晶 1），直到买不起
  const ratio = 20; for (let guard = 0; guard < 40; guard++) {
    const base = layout(), sc0 = base.coin * (1 + 0.2 * (ch - 1)) + base.san * S.C.K * yieldMul * aura * TR * SANF / ratio; let best = null;
    for (const d of T) { if (cost(d) > coins) continue; owned.push({ d }); const l = layout(); owned.pop(); const sc = l.coin * (1 + 0.2 * (ch - 1)) + l.san * S.C.K * yieldMul * aura * TR * SANF / ratio; const g = (sc - sc0) / cost(d); if (g > 0 && (!best || g > best.g)) best = { d, g }; }
    if (!best) break; coins -= cost(best.d); cnt[best.d.t] = (cnt[best.d.t] || 0) + 1; owned.push({ d: best.d });
  }
  const L = layout(), chK = 1 + 0.2 * (ch - 1), settle = L.coin * chK * 1.1 * 1.25, hunt = 200 * Math.pow(1.3, ch - 1);
  const rate = L.san * S.C.K * yieldMul * aura; // SAN / 秒（洞里）
  const sanRound = rate * TR * SANF + rate * 0.4 * 0.35 * TR * 0.5; // 含少量手点
  coins += settle + hunt;
  // 这一回合的 SAN 能买几级：单项全押 / 六项均分
  const lv = (b, budget) => { let n = 0, c = 0; while (c + S.price(b, n, ch) <= budget) { c += S.price(b, n, ch); n++; } return n; };
  const dmgB = S.BUFFS[0].b, one = lv(dmgB, sanRound), six = lv(dmgB, sanRound / 6);
  // 魂晶香：把这回合 SAN 的一半换成香，能加几成魂晶 → 折算 SAN/魂晶
  let n = 0, spent = 0; while (spent + S.price(S.INCENSE.b, n, ch, S.INCENSE.g) <= sanRound / 2) { spent += S.price(S.INCENSE.b, n, ch, S.INCENSE.g); n++; }
  const incPct = S.sat(S.INCENSE.A, n, S.INCENSE.q), incCoin = incPct * (settle + hunt * 0);
  rows.push({ r, ch, heads: heads.length, bld: owned.length, coin: Math.round(settle + hunt), rate: +rate.toFixed(1), san: Math.round(sanRound), dmgOne: one, dmgSix: six, dmgOneEff: Math.round(S.sat(S.BUFFS[0].A, one) * 100), inc: n, incPct: Math.round(incPct * 100), sanPerCoin: incCoin > 0 ? Math.round(spent / incCoin) : 0, bank: Math.round(coins) });
}
if (process.argv.includes('--csv')) console.log(Object.keys(rows[0]).join(',') + '\n' + rows.map(r => Object.values(r).join(',')).join('\n'));
else { console.log('r  ch heads bld  coin/rd  SAN/s   SAN/rd  | dmg级(全押/六分) 效果%  | 香级 +%魂晶 SAN/魂晶 | 存款'); for (const x of rows) if (x.r <= 12 || x.r % 5 === 0) console.log(String(x.r).padEnd(3), String(x.ch).padEnd(2), String(x.heads).padEnd(5), String(x.bld).padEnd(4), String(x.coin).padStart(7), String(x.rate).padStart(8), S.fmt(x.san).padStart(8), ' |', String(x.dmgOne).padStart(3), '/', String(x.dmgSix).padEnd(3), String(x.dmgOneEff).padStart(4) + '%', ' |', String(x.inc).padStart(3), String(x.incPct).padStart(4) + '%', String(x.sanPerCoin).padStart(6), ' |', S.fmt(x.bank)); }
