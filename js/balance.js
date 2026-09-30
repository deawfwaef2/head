// R41/R43 平衡：武技熟练度（用户：“新手更慢、武器更弱：速度慢、前摇长、后恢复慢；要有从弱到强的过程”）。MOD `balance_r41`（默认开）。
// 数值来自 tools/balance/sim.js 的蒙特卡洛模拟（node tools/balance/sim.js base|new），改这里请同步改 sim.js 的 TUNES.new。
//   ★ 武技熟练度（按食人魔等级）：生疏 Lv1 → 入门 Lv5 → 熟练 Lv10 → 精通 Lv18 → 宗师 Lv27+。等级越高，倍率从「新手」线性过渡到「高手」：
//        前摇 ×2.2 → ×0.9　出刀时长 ×1.6 → ×0.9　收招/冷却 ×2.0 → ×0.85　每刀体力 ×1.5 → ×1.0　你的伤害 ×0.45 → ×1.0（Lv25）
//      （高手比 R37 原来的速度还快 10~15%，新手慢一倍多、伤害不到一半）。combat.js 的 MT() 读 Balance.m()；wpnspec.js 的武器属性页显示同一倍率。
//   ② foeDmgK(rec)：低强度地区的普通敌人出手更疼：村庄 ×2.0 → 推荐战力 200 起 ×1.0。foe_abs.conv() 读它（霸主 / 猎手 / 精英不加成）。
//   ③ need(lv)：升级经验 40 + 11·lv^1.6（原 28 + 9·lv^1.6）；xpK(rec)：深层地区经验 ×(rec/40)^0.3（上限 ×2.2）。
//   ④ 旧存档迁移：第一次进入时把 S.xp 按旧曲线换算的等级 → 新曲线同等级的起点，等级不降（S.balV=41）。
//   ⑤ 可见性：属性页（Tab 总览）有「武技熟练」一行；F 拔刀提示带熟练阶段；晋升阶段时弹字幕。
//   保留 R35：敌人伤害 / 血量仍是 FoeAbs 的绝对数值，没有按玩家最大生命的百分比伤害，没有保底刀数。
window.Balance = (() => {
  const TUNE = { mLv: 30, wu: [2.2, 0.9], sw: [1.6, 0.9], cd: [2.0, 0.85], st: [1.5, 1.0], dmg: [0.45, 1.0], dmgLv: 25, foeEarly: 1.0, needA: 40, needB: 11, xpRec: 0.3, xpCap: 2.2 };
  const STAGES = [ // [起始等级, 名称(zh/ja/en)]
    [1, { zh: '生疏', ja: '未熟', en: 'Novice' }], [5, { zh: '入门', ja: '初級', en: 'Apprentice' }], [10, { zh: '熟练', ja: '熟練', en: 'Adept' }], [18, { zh: '精通', ja: '達人', en: 'Expert' }], [27, { zh: '宗师', ja: '宗師', en: 'Master' }]];
  const on = () => !window.Mods || !Mods.on || Mods.on('balance_r41') !== false;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const lang = () => { const l = (window.I18N && I18N.lang) || localStorage.getItem('soulhead_lang') || 'zh'; return ['zh', 'ja', 'en'].includes(l) ? l : 'zh'; };
  let lvC = 1, lvT = 0;
  function curLv() { const now = performance.now(); if (now - lvT < 400) return lvC; lvT = now; try { lvC = window.RPG && window.G && G.S ? RPG.lvOf(G.S.xp).lv : 1; } catch (e) { lvC = 1; } return lvC; }
  const tOf = (lv, n) => clamp(((lv || curLv()) - 1) / Math.max(1, n - 1), 0, 1);
  // 当前等级的倍率（lv 省略 = 当前玩家）
  const WX = () => window.WpnX && WpnX.onM(); // R41主管：MOD wpn_mastery 开启时，熟练度按“每把武器”算（js/wpnx.js）
  function m(lv) { if (lv == null && WX()) return WpnX.m(); const t = tOf(lv, TUNE.mLv); return { wu: lerp(TUNE.wu[0], TUNE.wu[1], t), sw: lerp(TUNE.sw[0], TUNE.sw[1], t), cd: lerp(TUNE.cd[0], TUNE.cd[1], t), st: lerp(TUNE.st[0], TUNE.st[1], t), dmg: dmgK(lv) }; }
  const dmgK = lv => (lv == null && WX()) ? WpnX.m().dmg : lerp(TUNE.dmg[0], TUNE.dmg[1], tOf(lv, TUNE.dmgLv));
  const tempo = lv => m(lv).cd; // 兼容旧调用
  const earlyDmg = P => dmgK(); // 兼容旧调用（foe_abs.power / wpnspec）：现在按熟练度（等级）而不是战力
  function stage(lv) { lv = lv || curLv(); let k = 0; for (let i = 0; i < STAGES.length; i++) if (lv >= STAGES[i][0]) k = i; const L = lang(); return { i: k, name: STAGES[k][1][L], names: STAGES[k][1], next: STAGES[k + 1] ? STAGES[k + 1][0] : 0 }; }
  function label(lv) { if (lv == null && WX()) return WpnX.label(); const a = m(lv), L = lang(), s = stage(lv), p = x => (x >= 1 ? '×' + x.toFixed(1) : '×' + x.toFixed(2)); const T = { zh: `武技熟练：${s.name}　前摇 ${p(a.wu)} · 收招 ${p(a.cd)} · 伤害 ${Math.round(a.dmg * 100)}%`, ja: `武技熟練：${s.name}　予備動作 ${p(a.wu)} · 硬直 ${p(a.cd)} · ダメージ ${Math.round(a.dmg * 100)}%`, en: `Weapon mastery: ${s.name}  windup ${p(a.wu)} · recovery ${p(a.cd)} · damage ${Math.round(a.dmg * 100)}%` }; return T[L]; }

  // ===== 武技熟练度卡片（Tab → 总览 顶部）：大印章 + 五境界路线 + 四条大进度条。样式见 css/mastery.css =====
  const COLS = ['#a79a86', '#86d07f', '#6fb8ff', '#c08cff', '#ffcf6a'];
  const NUM = { zh: ['壹', '贰', '叁', '肆', '伍'], ja: ['壱', '弐', '参', '肆', '伍'], en: ['I', 'II', 'III', 'IV', 'V'] };
  const TXT = {
    zh: { t: '武技熟练', lv: 'Lv', nx: n => `再升到 Lv.${n} 晋升下一境界`, top: '已臻宗师 · 满熟练在 Lv.30', bars: ['前摇速度', '收招速度', '体力效率', '造成伤害'], note: ['出刀前的蓄势越短越好', '挥完之后恢复越快越好', '每一刀更省体力', '相对满熟练的伤害'], tip: '升级就能变强：出刀更快、前摇更短、收招更短、伤害更高。', of: '满熟练' },
    ja: { t: '武技熟練', lv: 'Lv', nx: n => `Lv.${n} で次の境地へ`, top: '宗師に到達 · 満熟練は Lv.30', bars: ['予備動作', '硬直回復', 'スタミナ効率', '与ダメージ'], note: ['構えが短いほど速い', '振り終わりの回復が速い', '一振りあたりの消費が少ない', '満熟練に対する割合'], tip: 'レベルが上がるほど、振りが速く・予備動作と硬直が短く・ダメージが増える。', of: '満熟練' },
    en: { t: 'WEAPON MASTERY', lv: 'Lv', nx: n => `Reach Lv.${n} for the next rank`, top: 'Master rank · full mastery at Lv.30', bars: ['Windup speed', 'Recovery speed', 'Stamina economy', 'Damage dealt'], note: ['Shorter wind-up = faster strikes', 'Recover faster after each swing', 'Each swing costs less stamina', 'Versus full mastery'], tip: 'Level up to get faster swings, shorter windup & recovery, and more damage.', of: 'full mastery' }
  };
  function card(lv) {
    if (lv == null && WX()) return WpnX.card();
    lv = lv || curLv(); const L = lang(), X = TXT[L], a = m(lv), s = stage(lv), c = COLS[s.i], cur = STAGES[s.i][0], nxt = s.next, prog = nxt ? clamp((lv - cur) / (nxt - cur), 0, 1) : 1;
    const M0 = m(TUNE.mLv), ratings = [M0.wu / a.wu, M0.cd / a.cd, M0.st / a.st, a.dmg / M0.dmg].map(v => clamp(v, 0, 1));
    const vals = [a.wu, a.cd, a.st, a.dmg], mv = [M0.wu, M0.cd, M0.st, M0.dmg];
    const R = 54, C = 2 * Math.PI * R;
    const seal = `<svg viewBox="0 0 140 140" class="ms-seal"><defs><radialGradient id="msg" cx="50%" cy="40%" r="65%"><stop offset="0" stop-color="${c}" stop-opacity=".35"/><stop offset="1" stop-color="#0b0709" stop-opacity=".95"/></radialGradient></defs>
      <circle cx="70" cy="70" r="66" fill="url(#msg)" stroke="${c}" stroke-opacity=".5" stroke-width="1.5"/><circle cx="70" cy="70" r="${R}" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="7"/>
      <circle cx="70" cy="70" r="${R}" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(C * prog).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 70 70)" style="filter:drop-shadow(0 0 6px ${c})"/>
      
      <text x="70" y="82" text-anchor="middle" font-size="44" font-weight="900" fill="#fff6dc" stroke="#000" stroke-width="3" paint-order="stroke" style="font-family:var(--u-serif,serif)">${NUM[L][s.i]}</text></svg>`;
    const track = STAGES.map((g, i) => `<div class="ms-st ${i < s.i ? 'done' : i === s.i ? 'cur' : ''}" style="--c:${COLS[i]}"><i></i><b>${g[1][L]}</b><small>${X.lv}.${g[0]}${i === STAGES.length - 1 ? '+' : ''}</small></div>`).join('');
    const bars = X.bars.map((n, i) => `<div class="ms-bar" style="--c:${c}"><div class="ms-bh"><b>${n}</b><em>${Math.round(ratings[i] * 100)}<u>%</u></em></div><div class="ms-bt"><span style="width:${(ratings[i] * 100).toFixed(1)}%"></span></div><div class="ms-bn"><span class="v">×${vals[i].toFixed(2)} <i>→</i> <b>×${mv[i].toFixed(2)}</b> <small>${X.of}</small></span><span class="n">${X.note[i]}</span></div></div>`).join('');
    return `<div class="ms-card ${s.i === 4 ? 'top' : ''}" data-l="${L}" data-noi18n style="--c:${c}"><div class="ms-hero">${seal}<div class="ms-ti"><small>${X.t}</small><div class="ms-name">${s.name}</div><div class="ms-sub"><b>${X.lv}.${lv}</b><span>${nxt ? X.nx(nxt) : X.top}</span></div></div></div>
      <div class="ms-track">${track}</div><div class="ms-bars">${bars}</div><p class="ms-tip">${X.tip}</p></div>`;
  }
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
  function banner(st, L) { // 晋升大横幅
    const T = { zh: ['武技晋升', '出刀更快 · 前摇更短 · 收招更短 · 伤害更高'], ja: ['武技昇格', '振りが速く · 予備動作と硬直が短く · ダメージ増'], en: ['MASTERY RANK UP', 'Faster swings · shorter windup & recovery · more damage'] }[L];
    let el = document.getElementById('msUp'); if (el) el.remove(); el = document.createElement('div'); el.id = 'msUp'; el.setAttribute('data-noi18n', ''); el.style.setProperty('--c', COLS[st.i]);
    el.innerHTML = `<small>${T[0]}</small><h2>${st.name}</h2><p>${T[1]}</p>`; document.body.appendChild(el); setTimeout(() => el.remove(), 3600);
  }
  let lastStage = -1;
  function frame() {
    const S = window.G && G.S; if (!S) return; if (S.balV !== 41 && on()) migrate(S); if (!on() || WX()) return; /* R41主管：单武器熟练度的晋升横幅由 wpnx.js 发 */
    const st = stage(RPG.lvOf(S.xp).lv); if (lastStage < 0) { lastStage = st.i; return; }
    if (st.i > lastStage) { lastStage = st.i; const L = lang(); try { banner(st, L); } catch (e) { } } else lastStage = st.i;
  }
  const wait = setInterval(() => { if (window.G && G.HOOK && G.S) { clearInterval(wait); G.HOOK.frame.push(frame); } }, 500);
  return { banner, card, TUNE, STAGES, on, m, dmgK, tempo, earlyDmg, stage, label, foeDmgK, need, xpK, migrate };
})();
