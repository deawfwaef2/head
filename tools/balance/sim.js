#!/usr/bin/env node
// R41 平衡模拟器：node tools/balance/sim.js [base|new] [seed]
// 直接加载真实 js/rpg.js（装备表 / 属性公式），用蒙特卡洛模拟“从 Lv1 出发的一局”：
// 战斗节奏(combat.js CDB/WK/前摇)、伤害(foe.js hit + foe_abs.js power)、敌人血量/伤害(foe_abs.js hpK/REF/conv)、经验曲线(talents.js need)、
// 装备购买(rpg.js EQUIP)，输出：① Lv1 起手 TTK 表 ② 升级时间线 ③ 各地区当前等级的“砍几刀 / 挨几刀”。
// 调参：下面 TUNES.new 与游戏内 js/balance.js(MOD balance_r41) 必须同值——改这里之后同步改 balance.js。
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..', '..');
const T0 = null;
const win = { Mods: { on: () => true } }; win.window = win;
win.Talents = { on: () => true, need: lv => Math.round(T.needA + T.needB * Math.pow(lv, 1.6)), bonus: (S, b) => { const a = S.__at || {}; return Object.assign({}, b, { str: a.str || 0, con: a.con || 0, agi: a.agi || 0 }); }, post() { } };
vm.createContext(win); vm.runInContext(fs.readFileSync(path.join(root, 'js/rpg.js'), 'utf8'), win);
const RPG = win.RPG, EQ = RPG.EQUIP;

const TUNES = {
  // needA/needB：升级经验曲线 need(lv)=A+B*lv^1.6；coinK：金币收入系数

  base: { // 现状（R37/R35）
    CDB: { light: 380, fin: 560, heavy: 800 }, tempo: [1, 1], tempoLv: 1, dmgBase: 12, earlyDmg: [1, 1], earlyDmgP: [55, 150],
    foeDmgEarly: 0, xpRec: 0, needA: 28, needB: 9, coinK: 3, WEIGHT: [0.85, 0.95, 0.8, 1.2, 1.25, 0.9, 1.0]
  },
  new: { // R41
    CDB: { light: 380, fin: 560, heavy: 800 }, tempo: [1.5, 1.0], tempoLv: 26, dmgBase: 12, earlyDmg: [0.5, 1], earlyDmgP: [55, 170], foeDmgEarly: 1.0, xpRec: 0.3, needA: 40, needB: 11, coinK: 2,
    WEIGHT: [0.85, 0.95, 0.8, 1.2, 1.25, 0.9, 1.0]
  }
};
const which = process.argv[2] || 'new', T = TUNES[which]; let seed = +process.argv[3] || 7;
const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;

// ---- 公式（与游戏同源）----
const WK = w => Math.pow(Math.max(0.6, w || 1), 0.35);
const hpK = rec => Math.pow(Math.max(0.5, rec / 40), 0.8);
const REF = rec => 140 * Math.pow(Math.max(0.5, rec / 40), 0.65);
const RAR = [0.7, 0.9, 1.15, 1.5, 2.1];
const tempoK = lv => lerp(T.tempo[0], T.tempo[1], clamp((lv - 1) / Math.max(1, T.tempoLv - 1), 0, 1));
const earlyDmg = P => { const t = clamp((P - T.earlyDmgP[0]) / (T.earlyDmgP[1] - T.earlyDmgP[0]), 0, 1); return lerp(T.earlyDmg[0], T.earlyDmg[1], t * t * (3 - 2 * t)); };
const foeDmgK = rec => 1 + T.foeDmgEarly * clamp(1 - (rec - 40) / 160, 0, 1);
const LV = xp => { let lv = 1, x = xp; while (lv < 60 && x >= win.Talents.need(lv)) { x -= win.Talents.need(lv); lv++; } return lv; };

function mkPlayer() { return { v: 3, hp: 140, base: { str: 5, con: 5, agi: 5, ter: 5, soul: 5 }, trained: {}, eq: { weapon: 0, helm: 0, armor: 0, charm: 0, bag: 0 }, eqPlus: {}, xp: 0, coins: 30, __at: { str: 0, con: 0, agi: 0 }, bosses: {} }; }
function st(S) { const lv = LV(S.xp), n = lv - 1; S.__at = { str: Math.round(n * 3 * 0.4), con: Math.round(n * 3 * 0.35), agi: Math.round(n * 3 * 0.25) }; const s = RPG.stats(S, {}); s.lv = lv; return s; }

// 玩家一刀的平均伤害与出手节奏（light,light,fin 循环）
function playerDps(S, s, rec, rar) {
  const tier = S.eq.weapon, wt = T.WEIGHT[tier] || 1, kk = WK(wt) * tempoK(s.lv);
  const q = Math.pow(Math.max(5, s.power) / 40, 0.8) * earlyDmg(s.power), b = T.dmgBase * q;
  const cyc = [['light', 1, 8.2], ['light', 1, 8.2], ['fin', 1.3, 8.8]];
  return { b, kk, cyc };
}
// 模拟一场 1vN 战斗；返回 {win,t,hpLoss}
function fight(S, s, foes, opt) {
  const up = opt.uptime, tier = S.eq.weapon, wt = T.WEIGHT[tier] || 1, kk = WK(wt) * tempoK(s.lv);
  const q = Math.pow(Math.max(5, s.power) / 40, 0.8) * earlyDmg(s.power), b = T.dmgBase * q;
  let t = 0, hp = S.hp, ci = 0, nextAtk = 0.25, tgt = 0;
  for (const f of foes) { f.cdT = 0.6 + rnd() * 1.0; }
  const dmgK = (1 - s.def / (s.def + 300)) * (1 - s.dodge * 0.5);
  while (t < 240) {
    // 玩家出刀
    if (t >= nextAtk) {
      const f = foes.find(x => x.hp > 0); if (!f) return { win: true, t, hpLoss: S.hp - hp };
      const [ty, mk, spd] = [['light', 1, 8.2], ['light', 1, 8.2], ['fin', 1.3, 8.8]][ci % 3]; ci++;
      const cd = T[ty === 'fin' ? 'CDB' : 'CDB'][ty] / 1000 * kk;
      if (rnd() < opt.acc) {
        const z = rnd(), zm = z < 0.15 ? 1.6 : z < 0.25 ? 1.8 : z < 0.4 ? 0.7 : 1, neck = z >= 0.15 && z < 0.25;
        const sp = clamp(spd / 8, 0.5, 1.8), d = Math.max(1, Math.round(b * sp * zm * mk * (0.85 + rnd() * 0.3)));
        f.hp -= d;
        if (neck && f.hp > 0 && f.hp <= f.max * 0.5) f.hp = 0; // 斩首规则（脖子 + 剩不到一半血）
      }
      nextAtk = t + cd / up; // up：有效出手占比（走位 / 格挡 / 瞄准占掉的时间）
    }
    // 敌人
    for (const f of foes) if (f.hp > 0) { f.cdT -= 0.01; if (f.cdT <= 0) { f.cdT = 0.9 + 1.15 + rnd() * 1.2; if (rnd() < opt.pHit) { const d = Math.max(1, Math.round(f.dmg * (0.85 + rnd() * 0.3) * dmgK)); hp -= d; if (hp <= 0) return { win: false, t, hpLoss: S.hp }; } } }
    t += 0.01;
  }
  return { win: false, t, hpLoss: S.hp - hp };
}
const REGIONS = [['雾溪村', 40], ['翠影林', 80], ['兽牙荒原', 130], ['白银修道院', 200], ['黑沼', 300], ['铁盔要塞', 450], ['王都', 700], ['深渊', 1100], ['圣山', 1700]];
const RW = [0.32, 0.36, 0.2, 0.09, 0.03];
function mkFoe(rec, rar) {
  const r = rec * RAR[rar], base = 26 + rar * 16, max = Math.round(base * hpK(r)), dp = 0.03 + rar * 0.014 + (rar >= 2 ? 0.02 : 0) * 0; // 早期多数徒手；rar≥2 算持械的一半
  const armed = rar >= 2 ? 0.02 : 0;
  return { hp: max, max, dmg: Math.max(1, (dp + armed) * REF(r) * foeDmgK(rec)), rar };
}
function pickRar() { let x = rnd(), a = 0; for (let i = 0; i < 5; i++) { a += RW[i]; if (x < a) return i; } return 0; }
function bestRegion(power) { let k = 0; for (let i = 0; i < REGIONS.length; i++) if (power >= REGIONS[i][1] * 0.8) k = i; return k; }
function shop(S) { // 金币买装备：武器优先，其次护甲 / 头盔 / 护符；只买下一档
  for (const sl of ['weapon', 'armor', 'helm', 'charm']) { const tiers = EQ[sl].tiers, n = (S.eq[sl] || 0) + 1; if (n < tiers.length && S.coins >= tiers[n].cost && tiers[n].cost <= S.coins * 1.0) { const wp = S.eq.weapon; if (sl !== 'weapon' && n > wp + 1) continue; S.coins -= tiers[n].cost; S.eq[sl] = n; return true; } }
  return false;
}

// ===== ① Lv1 起手 TTK =====
function tableStart() {
  console.log(`\n[${which}] ① Lv1 起手（粗木棒 / 无防具）对 雾溪村 各稀有度：平均 TTK(秒) / 需要砍几刀 / 敌人几刀打死你`);
  const S = mkPlayer(), s = st(S);
  const kk = WK(T.WEIGHT[0]) * tempoK(1), cd = (2 * T.CDB.light + T.CDB.fin) / 3000 * kk;
  console.log(`   面板：战力 ${s.power}  生命 ${s.maxHp}  平均出刀间隔 ${(cd * 1000).toFixed(0)}ms（轻击 ${(T.CDB.light * kk).toFixed(0)} / 收招 ${(T.CDB.fin * kk).toFixed(0)}）  单刀基础伤害 ${(T.dmgBase * Math.pow(s.power / 40, 0.8) * earlyDmg(s.power)).toFixed(1)}`);
  for (let rar = 0; rar < 4; rar++) {
    let tt = 0, n = 200, w = 0, hits = 0;
    for (let i = 0; i < n; i++) { S.hp = s.maxHp; const f = mkFoe(40, rar); const r = fight(S, s, [f], { uptime: 0.75, acc: 0.85, pHit: 0.6 }); tt += r.t; w += r.win ? 1 : 0; hits += 0; }
    const f = mkFoe(40, rar); console.log(`   rar${rar}  血 ${f.max}  敌单击 ${f.dmg.toFixed(1)}（= ${(f.dmg / s.maxHp * 100).toFixed(0)}% 生命，${Math.ceil(s.maxHp / f.dmg)} 下倒）  TTK ${(tt / n).toFixed(1)}s  胜率 ${(w / n * 100).toFixed(0)}%`);
  }
  // 三个敌人一起上
  let w = 0, n = 200, loss = 0; for (let i = 0; i < n; i++) { S.hp = s.maxHp; const r = fight(S, s, [mkFoe(40, 1), mkFoe(40, 1), mkFoe(40, 0)], { uptime: 0.75, acc: 0.85, pHit: 0.6 }); w += r.win; loss += r.hpLoss / s.maxHp; }
  console.log(`   1 对 3（2×rar1 + 1×rar0）胜率 ${(w / n * 100).toFixed(0)}%，平均掉血 ${(loss / n * 100).toFixed(0)}%`);
}
// ===== ② 升级时间线 =====
function timeline() {
  console.log(`\n[${which}] ② 升级时间线（每场遭遇含 18s 走路/搜索；战后休整回满；死亡=罚 10% 金币 + 回满）`);
  const S = mkPlayer(); let time = 0, kills = 0, deaths = 0, lastLv = 1, fights = 0, tsum = 0, lossSum = 0, win = 0, nf = 0;
  const rows = [];
  const cur = { t: 0, kills: 0, deaths: 0 };
  while (time < 3600 * 3 && LV(S.xp) < 60) {
    const s = st(S), k = bestRegion(s.power), rec = REGIONS[k][1];
    const n = 1 + (rnd() < 0.4) + (rnd() < 0.15), foes = []; for (let i = 0; i < n; i++) foes.push(mkFoe(rec, pickRar()));
    S.hp = s.maxHp; const r = fight(S, s, foes, { uptime: 0.75, acc: 0.85, pHit: 0.6 }); time += r.t + 18; nf++; tsum += r.t; lossSum += r.hpLoss / s.maxHp;
    if (!r.win) { deaths++; S.coins = Math.floor(S.coins * 0.9); continue; }
    win++;
    for (const f of foes) { kills++; const mul = 1 + f.rar * 0.5, rw = 6 + (rnd() < 0.5 ? 10 : 0); const xpk = Math.pow(Math.max(1, rec / 40), T.xpRec); S.xp += Math.max(1, Math.round(rw * mul * 0.8 * xpk)); S.coins += Math.round(6 * mul * 1.5 * T.coinK); }
    while (shop(S));
    const lv = LV(S.xp); if (lv !== lastLv) { if ([2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50].includes(lv)) rows.push({ lv, t: Math.round(time / 60), kills, deaths, power: s.power, reg: REGIONS[k][0], wp: EQ.weapon.tiers[S.eq.weapon].n, ttk: +(tsum / nf).toFixed(1), loss: Math.round(lossSum / nf * 100), win: Math.round(win / nf * 100) }); lastLv = lv; if (lv % 1 === 0) { tsum = lossSum = win = nf = 0; } }
  }
  console.log('   Lv   分钟  击杀  死亡  战力  地区        武器      本级均TTK  均掉血%  胜率%');
  for (const r of rows) console.log(`   ${String(r.lv).padStart(2)}  ${String(r.t).padStart(5)} ${String(r.kills).padStart(5)} ${String(r.deaths).padStart(5)} ${String(r.power).padStart(5)}  ${r.reg.padEnd(6, '　')}  ${r.wp.padEnd(6, '　')}  ${String(r.ttk).padStart(6)}s  ${String(r.loss).padStart(6)}  ${String(r.win).padStart(6)}`);
}
tableStart(); timeline();
