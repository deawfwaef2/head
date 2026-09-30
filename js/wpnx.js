// R41主管 · 武器属性 + 单武器熟练度
//   用户：“为什么武器属性那么少；生疏/前摇/后摇系统最好绑定每个武器的武器熟练度；武器要有各种基础属性（前摇、后摇…）”
//   MOD wpn_stats（默认开）：每把武器一套基础属性，全部真的参与战斗（不是只显示）：
//     前摇 wu / 出刀 sw / 后摇·间隔 cd / 体力 st（倍率，替代原来单一的“自重”WK）· 触及 reach（米，加到索敌距离）
//     破防 pb（普通一击直接打破格挡的概率）· 暴击 crit% / 暴伤 critD% · 切割 cut（砍颈加伤）· 击退 kb
//     格挡耗体 bst（你格挡一次掉的体力倍率）· 招架窗口 par（完美格挡判定时间倍率）
//     接入：combat.js mmAttack / 旧挥砍节奏 / 索敌距离；foe.js hit（破防/暴击/切割/击退）；beasts.js hit（暴击）；worlds.js hitPlayer（格挡耗体/招架窗口）；wpnspec.js 显示。
//   MOD wpn_mastery（默认开）：熟练度按“每把武器”各自累计，不再按角色等级。
//     经验：用这把武器命中 +1（重击 +2）、击倒 +6、斩首/处决/一刀斩 +10。境界 生疏 0 → 入门 60 → 熟练 300 → 精通 900 → 宗师 2200。
//     倍率从新手线性过渡到宗师：前摇 ×1.8→×0.9 · 出刀 ×1.4→×0.9 · 后摇 ×1.7→×0.85 · 体力 ×1.4→×1.0 · 伤害 ×0.6→×1.0。
//     balance.js 的 m()/dmgK()/label()/card() 在本 MOD 开启时转给这里（combat.js MT()、foe_abs.power、wpnspec 都自动跟着走）。
//     旧存档：第一次载入时，把按角色等级算出的境界记到当前手上那把武器上（不掉档）；其它武器从生疏开始。
window.WpnX = (() => {
  const mod = id => !window.Mods || !Mods.on || Mods.on(id) !== false;
  const onS = () => mod('wpn_stats'), onM = () => mod('wpn_mastery');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const S0 = () => window.G && G.S;
  const curT = () => { const S = S0(); return (S && S.eq && S.eq.weapon) || 0; };
  //                 前摇  出刀  后摇  体力  触及   破防   暴击 暴伤  切割  击退  格挡耗体 招架窗口
  const P = [
    /* 粗木棒   */ { wu: 1.15, sw: 1.1, cd: 1.15, st: 1.1, reach: 0, pb: 0.04, crit: 2, critD: 140, cut: 0, kb: 1.2, bst: 1.25, par: 0.9 },
    /* 钉头棒   */ { wu: 1.1, sw: 1.05, cd: 1.1, st: 1.15, reach: -0.05, pb: 0.12, crit: 5, critD: 150, cut: 0.05, kb: 1.3, bst: 1.05, par: 0.9 },
    /* 骨刃砍刀 */ { wu: 0.8, sw: 0.85, cd: 0.8, st: 0.85, reach: -0.1, pb: 0.03, crit: 8, critD: 160, cut: 0.35, kb: 0.7, bst: 1.2, par: 1.15 },
    /* 铁链流星锤 */ { wu: 1.35, sw: 1.2, cd: 1.35, st: 1.4, reach: 0, pb: 0.3, crit: 3, critD: 170, cut: 0, kb: 1.8, bst: 0.9, par: 0.8 },
    /* 斩首巨斧 */ { wu: 1.3, sw: 1.15, cd: 1.3, st: 1.35, reach: 0.05, pb: 0.22, crit: 6, critD: 190, cut: 0.5, kb: 1.4, bst: 1.0, par: 0.85 },
    /* 月蚀魂镰 */ { wu: 0.85, sw: 0.9, cd: 0.85, st: 0.95, reach: 0.15, pb: 0.08, crit: 12, critD: 175, cut: 0.45, kb: 0.8, bst: 0.9, par: 1.3 },
    /* 噬神者   */ { wu: 0.95, sw: 0.95, cd: 1.0, st: 1.0, reach: 0.3, pb: 0.1, crit: 15, critD: 200, cut: 0.2, kb: 0.9, bst: 0.85, par: 1.2 }
  ];
  const NEUTRAL = { wu: 1, sw: 1, cd: 1, st: 1, reach: 0, pb: 0, crit: 0, critD: 150, cut: 0, kb: 1, bst: 1, par: 1 };
  const prof = t => P[clamp(t == null ? curT() : t, 0, P.length - 1)];
  const pf = () => onS() ? prof() : null; // 战斗代码用：null = MOD 关，走原公式

  // ---------------- 熟练度 ----------------
  const TH = [0, 60, 300, 900, 2200];
  const TUNE = { wu: [1.8, 0.9], sw: [1.4, 0.9], cd: [1.7, 0.85], st: [1.4, 1.0], dmg: [0.6, 1.0] };
  const lang = () => { const l = (window.I18N && I18N.lang) || localStorage.getItem('soulhead_lang') || 'zh'; return ['zh', 'ja', 'en'].includes(l) ? l : 'zh'; };
  const STN = () => (window.Balance && Balance.STAGES) ? Balance.STAGES.map(s => s[1]) : [{ zh: '生疏' }, { zh: '入门' }, { zh: '熟练' }, { zh: '精通' }, { zh: '宗师' }];
  function store() { const S = S0(); if (!S) return {}; if (!S.wmx) S.wmx = {}; return S.wmx; }
  const xpOf = t => store()[t == null ? curT() : t] || 0;
  function stageOf(xp) { let i = 0; for (let k = 0; k < TH.length; k++) if (xp >= TH[k]) i = k; const nx = TH[i + 1] || 0, frac = nx ? (xp - TH[i]) / (nx - TH[i]) : 1; return { i, frac: clamp(frac, 0, 1), nx, cur: TH[i], t01: clamp((i + (nx ? frac : 0)) / (TH.length - 1), 0, 1) }; }
  function m(t) { const s = stageOf(xpOf(t)), k = s.t01; return { wu: lerp(TUNE.wu[0], TUNE.wu[1], k), sw: lerp(TUNE.sw[0], TUNE.sw[1], k), cd: lerp(TUNE.cd[0], TUNE.cd[1], k), st: lerp(TUNE.st[0], TUNE.st[1], k), dmg: lerp(TUNE.dmg[0], TUNE.dmg[1], k) }; }
  const MASTER = { wu: TUNE.wu[1], sw: TUNE.sw[1], cd: TUNE.cd[1], st: TUNE.st[1], dmg: TUNE.dmg[1] };
  function stage(t) { const s = stageOf(xpOf(t)), L = lang(); return Object.assign(s, { name: STN()[s.i][L] || STN()[s.i].zh }); }
  const wname = t => { try { return RPG.EQUIP.weapon.tiers[t == null ? curT() : t].n; } catch (e) { return '武器'; } };
  function migrate() {
    const S = S0(); if (!S || S.wmxV) return; S.wmxV = 1; const W = store();
    let i = 0; try { if (window.Balance && Balance.STAGES && window.RPG) { const lv = RPG.lvOf(S.xp || 0).lv; Balance.STAGES.forEach((s, k) => { if (lv >= s[0]) i = k; }); } } catch (e) { }
    const t = curT(); W[t] = Math.max(W[t] || 0, TH[i]);
  }
  let lastHitMs = 0;
  function gain(n, t) {
    if (!onM()) return; const S = S0(); if (!S) return; migrate(); t = t == null ? curT() : t; const W = store();
    const before = stageOf(W[t] || 0).i; W[t] = (W[t] || 0) + n; const after = stageOf(W[t]).i;
    if (after > before) { const L = lang(), nm = `${wname(t)} · ${STN()[after][L] || STN()[after].zh}`; try { if (window.Balance && Balance.banner) Balance.banner({ i: after, name: nm }, L); else if (G.toast) G.toast('🗡️ ' + nm, '#ffd27a', 2.4); } catch (e) { } try { window.SFX && SFX.play && SFX.play('bell', 0.5, 1.5); } catch (e) { } }
  }
  function onEvent(t, fo, d) { // worlds.js foeEvent0 调用；只算你自己挥武器打出来的（技能/法术不算）
    if (!onM() || (d && (d.skill || d.spell || d.proc))) return;
    if (t === 'hit') { const ms = performance.now(); if (ms - lastHitMs < 120) return; lastHitMs = ms; gain(d && d.charged ? 2 : 1); }
    else if (t === 'kill') gain(6);
    else if (t === 'execute' || t === 'onecut' || t === 'decapAlive' || t === 'decap') gain(10);
  }
  function label() { const a = m(), s = stage(), p = x => (x >= 1 ? '×' + x.toFixed(1) : '×' + x.toFixed(2)); return `${wname()} 熟练：${s.name}　前摇 ${p(a.wu)} · 后摇 ${p(a.cd)} · 伤害 ${Math.round(a.dmg * 100)}%`; }

  // ---------------- 熟练度卡片（替换 Balance.card，沿用 css/mastery.css 的 ms-* 样式）----------------
  const COLS = ['#a79a86', '#86d07f', '#6fb8ff', '#c08cff', '#ffcf6a'], NUM = ['壹', '贰', '叁', '肆', '伍'];
  const ICON = ['🪵', '🔩', '🗡️', '⛓️', '🪓', '🌙', '⚔️'];
  function card() {
    migrate(); const t = curT(), s = stage(t), a = m(t), M0 = MASTER, c = COLS[s.i], xp = xpOf(t);
    const ratings = [M0.wu / a.wu, M0.cd / a.cd, M0.st / a.st, a.dmg / M0.dmg].map(v => clamp(v, 0, 1)), vals = [a.wu, a.cd, a.st, a.dmg], mv = [M0.wu, M0.cd, M0.st, M0.dmg];
    const R = 54, C = 2 * Math.PI * R, prog = s.nx ? s.frac : 1;
    const seal = `<svg viewBox="0 0 140 140" class="ms-seal"><circle cx="70" cy="70" r="66" fill="#0b0709" stroke="${c}" stroke-opacity=".5" stroke-width="1.5"/><circle cx="70" cy="70" r="${R}" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="7"/><circle cx="70" cy="70" r="${R}" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(C * prog).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 70 70)" style="filter:drop-shadow(0 0 6px ${c})"/><text x="70" y="82" text-anchor="middle" font-size="44" font-weight="900" fill="#fff6dc" stroke="#000" stroke-width="3" paint-order="stroke">${NUM[s.i]}</text></svg>`;
    const L = lang(), track = TH.map((x, i) => `<div class="ms-st ${i < s.i ? 'done' : i === s.i ? 'cur' : ''}" style="--c:${COLS[i]}"><i></i><b>${STN()[i][L] || STN()[i].zh}</b><small>${x}</small></div>`).join('');
    const BN = ['前摇速度', '后摇速度', '体力效率', '造成伤害'], NT = ['出刀前的蓄势越短越好', '挥完之后恢复越快越好', '每一刀更省体力', '相对宗师的伤害'];
    const bars = BN.map((n, i) => `<div class="ms-bar" style="--c:${c}"><div class="ms-bh"><b>${n}</b><em>${Math.round(ratings[i] * 100)}<u>%</u></em></div><div class="ms-bt"><span style="width:${(ratings[i] * 100).toFixed(1)}%"></span></div><div class="ms-bn"><span class="v">×${vals[i].toFixed(2)} <i>→</i> <b>×${mv[i].toFixed(2)}</b> <small>宗师</small></span><span class="n">${NT[i]}</span></div></div>`).join('');
    const W = store(), owned = RPG.EQUIP.weapon.tiers.map((w, i) => ({ i, w, xp: W[i] || 0 })).filter(o => o.xp > 0 || o.i === t);
    const list = owned.map(o => { const q = stageOf(o.xp); return `<div style="display:flex;align-items:center;gap:8px;margin:3px 0;${o.i === t ? 'font-weight:800' : 'opacity:.8'}"><span style="width:22px;text-align:center">${ICON[o.i]}</span><span style="flex:0 0 96px">${o.w.n}</span><span style="flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden"><span style="display:block;height:100%;width:${(q.t01 * 100).toFixed(1)}%;background:${COLS[q.i]}"></span></span><span style="flex:0 0 40px;color:${COLS[q.i]}">${STN()[q.i][L] || STN()[q.i].zh}</span></div>`; }).join('');
    return `<div class="ms-card ${s.i === 4 ? 'top' : ''}" data-noi18n style="--c:${c}"><div class="ms-hero">${seal}<div class="ms-ti"><small>武器熟练 · ${ICON[t]} ${wname(t)}</small><div class="ms-name">${s.name}</div><div class="ms-sub"><b>${xp}</b><span>${s.nx ? `再获得 ${s.nx - xp} 熟练 晋升下一境界` : '已臻宗师'}</span></div></div></div>
      <div class="ms-track">${track}</div><div class="ms-bars">${bars}</div><div style="margin:8px 4px 0;font-size:13px">${list}</div><p class="ms-tip">熟练度跟着武器走：用哪把就练哪把（命中 +1 · 击倒 +6 · 斩首/处决 +10）。换新武器要从生疏练起。</p></div>`;
  }

  // ---------------- 属性条（背包悬浮提示用的图形版）----------------
  function bars(t) {
    const p = prof(t), sp = 1 / ((p.wu + p.sw + p.cd) / 3); // 速度：越大越快
    const R = [['速度', clamp((sp - 0.6) / 0.75, 0, 1), '#7ad8ff'], ['触及', clamp((p.reach + 0.15) / 0.5, 0, 1), '#b8e07a'], ['破防', clamp(p.pb / 0.32, 0, 1), '#ffb060'], ['暴击', clamp(p.crit / 16, 0, 1), '#ff7a8a'], ['切割', clamp(p.cut / 0.5, 0, 1), '#ff5050'], ['击退', clamp((p.kb - 0.6) / 1.3, 0, 1), '#d0a0ff'], ['格挡', clamp((1.3 - p.bst) / 0.5, 0, 1), '#e8d8a0']];
    return `<div style="display:grid;grid-template-columns:34px 1fr;gap:2px 6px;align-items:center;margin-top:5px;font-size:11px">${R.map(r => `<span style="color:#cbb">${r[0]}</span><span style="height:6px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden"><span style="display:block;height:100%;width:${Math.round(8 + r[1] * 92)}%;background:${r[2]}"></span></span>`).join('')}</div>`;
  }
  const wait = setInterval(() => { if (window.G && G.S) { clearInterval(wait); if (onM()) migrate(); } }, 800);
  return { onS, onM, P, NEUTRAL, prof, pf, m, MASTER, stage, stageOf, xpOf, gain, onEvent, label, card, bars, TH, migrate, wname };
})();
