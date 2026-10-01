// R54k MOD rogue_boons（默认开，需要 run_loop）：每一局不一样的「武器流派 + 祝福」肉鸽层。
// ① 开局在出发面板选 1 个武器流派（随机给 3 个，8 种：血刃/雷锤/霜镰/炎斧/魂刺/断头刃/盾卫/疾影），整局有效，决定你的打法。
// ② 每次回洞结算后得到 1 次「祝福抉择」（吞首井 / 百族谱 / 章节 BOSS 额外给）：3 选 1，24 种祝福分 8 个流派标签，可升到 Lv3；
//    同标签凑齐 3 种 → 触发该标签的套装效果。抉择会偏向你已有的标签（容易成型），但每局抽到的都不一样。
// 挂载：foe.js 伤害（Rogue.outDmg）、worlds.js 事件（Rogue.event）与受伤（Rogue.inDmg）、Loop.runHp/runSpd（Rogue.hpK/spdK）。
window.Rogue = (() => {
  const on = () => (!window.Mods || (Mods.on('rogue_boons') !== false && Mods.on('run_loop') !== false)) && !!window.Loop;
  const G = () => window.G, W = () => (window.Worlds && Worlds.active ? Worlds._W : null);
  const st = () => { const r = Loop.R(); r.rg = r.rg || { arch: null, b: {}, pend: 0, offer: null, archOffer: null }; return r.rg; };
  const toast = (t, c, s) => { try { G().toast(t, c, s); } catch (e) { } };
  const TAG = { 血: '#ff5a5a', 雷: '#8ad0ff', 霜: '#bfefff', 火: '#ffa040', 魂: '#c8a0ff', 影: '#9fe8b0', 铁: '#c8c8d0', 刃: '#ffe08a' };
  const ARCH = [
    { k: 'blood', ic: '🩸', n: '血刃', tag: '血', d: '每一刀都留下伤口：3 秒内再流掉这刀伤害的 45%。' },
    { k: 'thunder', ic: '⚡', n: '雷锤', tag: '雷', d: '每第 3 次命中劈出闪电，跳向附近 2 个敌人（这刀伤害的 60%）。' },
    { k: 'frost', ic: '❄️', n: '霜镰', tag: '霜', d: '命中让她冻住 3 秒：出手变慢，你对冻住的敌人伤害 +25%。' },
    { k: 'flame', ic: '🔥', n: '炎斧', tag: '火', d: '蓄力重击炸开火焰，烧到周围 3m 内的其他敌人（这刀伤害的 70%）。' },
    { k: 'soul', ic: '🌙', n: '魂刺', tag: '魂', d: '20% 暴击（伤害 ×2），暴击回复 1% 生命。' },
    { k: 'reaper', ic: '🪓', n: '断头刃', tag: '刃', d: '对生命低于 40% 的敌人伤害 +45%；每杀一人回复 2% 生命。' },
    { k: 'warden', ic: '🛡️', n: '盾卫', tag: '铁', d: '格挡 / 完美格挡后下一刀 ×2.2，并回复 6% 生命；受到伤害 -8%。' },
    { k: 'shadow', ic: '💨', n: '疾影', tag: '影', d: '移速 +10%；闪避后接下来 2 刀 ×1.7。' }
  ];
  const BOON = [
    { k: 'b_open', ic: '🩸', n: '开放伤口', tag: '血', d: l => `命中后再流血：这刀伤害的 ${12 * l}%（3 秒）` },
    { k: 'b_feast', ic: '🍷', n: '饮血', tag: '血', d: l => `每杀一人回复 ${1.5 * l}% 生命` },
    { k: 'b_frenzy', ic: '😤', n: '狂血', tag: '血', d: l => `生命低于 50% 时伤害 +${15 * l}%` },
    { k: 't_arc', ic: '🌩️', n: '电弧', tag: '雷', d: l => `${12 * l}% 几率闪电跳向 1 个附近敌人（50%）` },
    { k: 't_static', ic: '🔋', n: '静电', tag: '雷', d: l => `每第 ${6 - l} 次命中让目标僵直 0.8 秒` },
    { k: 't_storm', ic: '⛈️', n: '雷暴', tag: '雷', d: l => `击杀时闪电劈向 2 个附近敌人（最后一刀的 ${30 * l}%）` },
    { k: 'f_chill', ic: '🧊', n: '寒意', tag: '霜', d: l => `命中让她冻住（出手慢 ${0.25 * l} 秒）` },
    { k: 'f_shatter', ic: '💎', n: '碎冰', tag: '霜', d: l => `对冻住的敌人伤害 +${12 * l}%` },
    { k: 'f_armor', ic: '🥶', n: '冰甲', tag: '霜', d: l => `受到伤害 -${6 * l}%` },
    { k: 'h_ignite', ic: '🕯️', n: '点燃', tag: '火', d: l => `${12 * l}% 几率点燃：3 秒内烧掉这刀伤害的 60%` },
    { k: 'h_blast', ic: '💥', n: '爆裂', tag: '火', d: l => `击杀时爆炸，波及 3m 内敌人（最后一刀的 ${35 * l}%）` },
    { k: 'h_fury', ic: '🌋', n: '怒火', tag: '火', d: l => `蓄力重击伤害 +${18 * l}%` },
    { k: 's_crit', ic: '✨', n: '魂锋', tag: '魂', d: l => `暴击率 +${8 * l}%（暴击 ×2）` },
    { k: 's_reap', ic: '🔮', n: '收魂', tag: '魂', d: l => `每杀一人 +${3 * l} 魂晶（出猎中立刻到手）` },
    { k: 's_echo', ic: '🔔', n: '回响', tag: '魂', d: l => `${10 * l}% 几率这一刀再回响一次（50%）` },
    { k: 'w_swift', ic: '🦶', n: '迅影', tag: '影', d: l => `移速 +${5 * l}%` },
    { k: 'w_evade', ic: '👤', n: '残影', tag: '影', d: l => `${6 * l}% 几率让敌人这一击落空` },
    { k: 'w_back', ic: '🗡️', n: '背刺', tag: '影', d: l => `对还没盯上你的敌人伤害 +${25 * l}%` },
    { k: 'i_hide', ic: '🪨', n: '铁皮', tag: '铁', d: l => `生命上限 +${8 * l}%` },
    { k: 'i_thorn', ic: '🌵', n: '荆棘', tag: '铁', d: l => `受伤时反弹 ${25 * l}% 给出手的人` },
    { k: 'i_brace', ic: '🧱', n: '坚守', tag: '铁', d: l => `格挡 / 完美格挡回复 ${2 * l}% 生命` },
    { k: 'k_heavy', ic: '⚒️', n: '重刃', tag: '刃', d: l => `伤害 +${10 * l}%` },
    { k: 'k_exec', ic: '⚰️', n: '处决', tag: '刃', d: l => `对生命低于 35% 的敌人伤害 +${15 * l}%` },
    { k: 'k_combo', ic: '🔁', n: '连斩', tag: '刃', d: l => `2 秒内连续命中，每层 +${4 * l}%（最多 5 层）` }
  ];
  const SETS = { 血: '血契：每杀一人再回复 3% 生命', 雷: '雷网：每一刀 10% 几率闪电跳跃', 霜: '永冻：对冻住的敌人再 +15% 伤害', 火: '焚城：每次击杀都会爆炸', 魂: '魂潮：暴击回复 1% 生命、暴击率 +5%', 影: '无形：移速 +8%、10% 闪避', 铁: '铁壁：受到伤害再 -10%', 刃: '屠夫：伤害 +10%' };
  const LORE = { blood: ['放血人', '她们说你挥刀之后，血会自己继续流。'], thunder: ['风暴屠夫', '每第三下，天空会替你补刀。'], frost: ['冬日收割者', '被你砍过的人，连逃跑都变得很慢。'], flame: ['焚城者', '你的斗落下的地方，草三年不长。'], soul: ['月下刺客', '月光偏爱一击必杀的人。'], reaper: ['行刑官', '她快不行了的时候，你最有精神。'], warden: ['铁壁', '先让她砍，再让她后悔。'], shadow: ['无影者', '她们只看见一阵风，然后就看不见了。'] };
  const TAGN = { 血: '血契之道', 雷: '雷鸣之道', 霜: '凛冬之道', 火: '烈焰之道', 魂: '魂月之道', 影: '暗影之道', 铁: '铁骨之道', 刃: '刀锋之道' };
  const BY = {}; BOON.forEach(b => BY[b.k] = b);
  const lv = k => (on() && st().b[k]) || 0;
  const arch = () => (on() && st().arch) || '';
  function tagCount() { const c = {}; for (const k in st().b) { const B = BY[k]; if (B) c[B.tag] = (c[B.tag] || 0) + 1; } const A = ARCH.find(a => a.k === arch()); if (A) c[A.tag] = (c[A.tag] || 0) + 1; return c; }
  let tc = { t: 0, v: {} }; const set = t => { const n = performance.now(); if (n - tc.t > 1000) { tc.t = n; tc.v = on() ? tagCount() : {}; } return (tc.v[t] || 0) >= 3; };
  // ---- 倍率（Loop.runHp / runSpd 读取）----
  const hpK = () => 1 + 0.08 * lv('i_hide'), spdK = () => 1 + 0.05 * lv('w_swift') + (arch() === 'shadow' ? 0.1 : 0) + (set('影') ? 0.08 : 0), dmgK = () => 1;
  // ---- 战斗 ----
  const P = { hits: 0, combo: 0, comboT: 0, next: 1, nextN: 0, last: 0 };
  const now = () => performance.now() / 1000;
  const alive = () => (window.Foe && Foe.foes ? Foe.foes.filter(f => !f.dead && f.pos) : []);
  const near = (fo, r, n) => alive().filter(f => f !== fo && Math.hypot(f.pos.x - fo.pos.x, f.pos.z - fo.pos.z) < r).sort((a, b) => Math.hypot(a.pos.x - fo.pos.x, a.pos.z - fo.pos.z) - Math.hypot(b.pos.x - fo.pos.x, b.pos.z - fo.pos.z)).slice(0, n);
  const fx = (fo, col) => { try { const p = fo.pos.clone(); p.y += 1.2; Foe.spark(p, 12, col); } catch (e) { } };
  const dot = (fo, n, col) => { if (!fo || fo.dead || !(n >= 1)) return; try { Foe.dot(fo, n, { proc: true }); if (col) fx(fo, col); } catch (e) { } };
  function bleed(fo, total, ticks, col) { const per = total / ticks; for (let i = 1; i <= ticks; i++) setTimeout(() => dot(fo, per, i === ticks ? col : null), i * 1000 * 3 / ticks); }
  function heal(k) { try { const s = G().st(); G().S.hp = Math.min(s.maxHp, G().S.hp + s.maxHp * k); } catch (e) { } }
  const chilled = fo => fo && fo._chill > now();
  function outDmg(fo, info, dealt, zone, brk) {
    if (!on() || !fo || info.proc) return dealt; let m = 1; const hp = fo.hp / Math.max(1, fo.maxHp), A = arch();
    m *= 1 + 0.1 * lv('k_heavy') + (set('刃') ? 0.1 : 0);
    if (hp < 0.35) m *= 1 + 0.15 * lv('k_exec'); if (A === 'reaper' && hp < 0.4) m *= 1.45;
    if (chilled(fo)) m *= 1 + 0.12 * lv('f_shatter') + (A === 'frost' ? 0.25 : 0) + (set('霜') ? 0.15 : 0);
    if (info.charged) m *= 1 + 0.18 * lv('h_fury');
    try { const s = G().st(); if (G().S.hp < s.maxHp * 0.5) m *= 1 + 0.15 * lv('b_frenzy'); } catch (e) { }
    if (lv('w_back') && (!fo.seen || fo.state === 'flee' || fo.state === 'idle')) m *= 1 + 0.25 * lv('w_back');
    const t = now(); if (lv('k_combo')) { P.combo = t - P.comboT < 2 ? Math.min(5, P.combo + 1) : 0; P.comboT = t; m *= 1 + 0.04 * lv('k_combo') * P.combo; }
    if (P.nextN > 0) { m *= P.next; if (--P.nextN <= 0) P.next = 1; }
    const cr = (A === 'soul' ? 0.2 : 0) + 0.08 * lv('s_crit') + (set('魂') ? 0.05 : 0);
    if (cr > 0 && !info.crit && Math.random() < cr) { m *= 2; info.crit = true; if (A === 'soul' || set('魂')) heal(0.01); }
    return Math.max(1, Math.round(dealt * m));
  }
  function onHit(fo, d) {
    const A = arch(), dealt = (d && d.dealt) || 0; if (!dealt || (d && d.proc)) return; P.hits++; P.last = dealt;
    if (A === 'blood') bleed(fo, dealt * 0.45, 3, null); if (lv('b_open')) bleed(fo, dealt * 0.12 * lv('b_open'), 3, null);
    if (A === 'frost' || lv('f_chill')) { fo._chill = now() + 3; fo.cd = (fo.cd || 0) + 0.25 * Math.max(1, lv('f_chill')); fx(fo, 'blue'); }
    if (A === 'thunder' && P.hits % 3 === 0) for (const f of near(fo, 6, 2)) dot(f, dealt * 0.6, 'blue');
    if (lv('t_arc') && Math.random() < 0.12 * lv('t_arc')) for (const f of near(fo, 6, 1)) dot(f, dealt * 0.5, 'blue');
    if (set('雷') && Math.random() < 0.1) for (const f of near(fo, 6, 1)) dot(f, dealt * 0.5, 'blue');
    if (lv('t_static') && P.hits % (6 - lv('t_static')) === 0 && !fo.dead) { fo.stag = Math.max(fo.stag || 0, fo.boss ? 0.35 : 0.8); fo.atk = null; fx(fo, 'blue'); }
    if (A === 'flame' && d.charged) for (const f of near(fo, 3, 6)) dot(f, dealt * 0.7, null);
    if (lv('h_ignite') && Math.random() < 0.12 * lv('h_ignite')) bleed(fo, dealt * 0.6, 3, null);
    if (lv('s_echo') && Math.random() < 0.1 * lv('s_echo')) setTimeout(() => dot(fo, dealt * 0.5, null), 250);
  }
  function onKill(fo) {
    const A = arch(), last = P.last || 10;
    let h = 0.015 * lv('b_feast') + (A === 'reaper' ? 0.02 : 0) + (set('血') ? 0.03 : 0); if (h) heal(h);
    if (lv('t_storm')) for (const f of near(fo, 7, 2)) dot(f, last * 0.3 * lv('t_storm'), 'blue');
    if (lv('h_blast') || set('火')) { const k = 0.35 * Math.max(1, lv('h_blast')); for (const f of near(fo, 3, 6)) dot(f, last * k, null); }
    if (lv('s_reap')) try { const c = 3 * lv('s_reap'); G().addCoins(c); const w = W(); if (w && w.trip) w.trip.coins += c; } catch (e) { }
  }
  function event(t, fo, d) {
    if (!on()) return;
    if (t === 'hit') onHit(fo, d);
    else if (t === 'kill') onKill(fo);
    else if (t === 'parry' || t === 'guard') { if (arch() === 'warden') { P.next = 2.2; P.nextN = 1; heal(t === 'parry' ? 0.06 : 0.02); } if (lv('i_brace')) heal(0.02 * lv('i_brace')); }
    else if (t === 'perfectdodge' || t === 'dodge') { if (arch() === 'shadow') { P.next = 1.7; P.nextN = 2; } }
  }
  function inDmg(fo, n, h) {
    if (!on() || !(n > 0)) return n; const ev = 0.06 * lv('w_evade') + (set('影') ? 0.1 : 0);
    if (ev > 0 && Math.random() < ev) { toast('👤 残影——她砍中的是你的影子', '#9fe8b0', 1); return 0; }
    let k = 1 - 0.06 * lv('f_armor') - (arch() === 'warden' ? 0.08 : 0) - (set('铁') ? 0.1 : 0); n = Math.max(1, Math.round(n * Math.max(0.4, k)));
    if (lv('i_thorn') && fo && !fo.dead) dot(fo, n * 0.25 * lv('i_thorn'), null);
    return n;
  }
  // ---- 抉择 ----
  function pickArchOffer() { const s = st(); if (!s.archOffer) { const p = ARCH.slice().sort(() => Math.random() - 0.5); s.archOffer = p.slice(0, 3).map(a => a.k); } return s.archOffer.map(k => ARCH.find(a => a.k === k)); }
  function boonOffer() {
    const s = st(); if (s.offer && s.offer.length) return s.offer.map(k => BY[k]);
    const tc0 = tagCount(), pool = BOON.filter(b => (s.b[b.k] || 0) < 3), w = b => 1 + (tc0[b.tag] || 0) * 1.2 + ((s.b[b.k] || 0) ? 0.8 : 0), out = [];
    while (out.length < 3 && pool.length) { let tot = pool.reduce((a, b) => a + w(b), 0), r = Math.random() * tot, i = 0; for (; i < pool.length; i++) { r -= w(pool[i]); if (r <= 0) break; } out.push(pool.splice(Math.min(i, pool.length - 1), 1)[0]); }
    s.offer = out.map(b => b.k); return out;
  }
  function grant(n, why) { if (!on() || !(n > 0)) return; st().pend += n; toast(`🎴 获得 ${n} 次祝福抉择${why ? `（${why}）` : ''}——出洞选地点时挑选`, '#e8d0ff', 3.5); }
  function roundPick() { if (!on()) return; st().pend++; }
  function css() { if (document.getElementById('rgCss')) return; const s = document.createElement('style'); s.id = 'rgCss'; s.textContent = `
#rgPanel{margin:8px 0 12px;padding:10px 14px;border:1px solid rgba(200,160,255,.28);background:linear-gradient(90deg,#140c1ccc,#0a070ccc);border-radius:4px;color:#e8dcf0;font-size:13px}
#rgPanel .h{font-weight:700;letter-spacing:.08em;color:#e0c8ff;margin-bottom:6px}#rgPanel .h small{font-weight:400;color:#a898b8;letter-spacing:0}
#rgPanel .cards{display:flex;gap:8px;flex-wrap:wrap}#rgPanel .cd{flex:1;min-width:170px;padding:9px 11px;border-radius:4px;border:1px solid var(--c);background:linear-gradient(#22162a,#120a16);color:#f0e4f8;cursor:pointer;text-align:left;font:inherit}
#rgPanel .cd:hover{background:linear-gradient(#34203e,#1a0e20);transform:translateY(-1px)}#rgPanel .cd b{display:block;font-size:15px;color:var(--c)}#rgPanel .cd i{font-style:normal;font-size:11px;color:var(--c);opacity:.85}#rgPanel .cd span{display:block;font-size:12px;color:#c8b8d8;margin-top:3px}
#rgPanel .chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}#rgPanel .chip{padding:1px 8px;border-radius:10px;border:1px solid var(--c);color:var(--c);font-size:12px;background:#0006}
#rgPanel .sets{margin-top:5px;font-size:12px;color:#a898b8}#rgPanel .sets b{color:#ffe08a}`; document.head.appendChild(s); }
  function panelHTML() {
    const s = st(), A = ARCH.find(a => a.k === s.arch), tcn = tagCount();
    let h = '';
    if (!A && GU()) return `<button class="cd" data-rgopen="1" style="--c:#e7c27a;width:100%;padding:14px;font-size:16px"><b>⚔️ 选择本局杀法</b></button>`;
    if (!A) { h += `<div class="h">⚔️ 本局武器流派 <small>（选一个，整局有效——每局随机给 3 个）</small></div><div class="cards">${pickArchOffer().map(a => `<button class="cd" data-rga="${a.k}" style="--c:${TAG[a.tag]}"><b>${a.ic} ${a.n}</b><i>标签：${a.tag}</i><span>${a.d}</span></button>`).join('')}</div>`; return h; }
    h += `<div class="h">⚔️ 流派：<span style="color:${TAG[A.tag]}">${A.ic} ${A.n}</span> <small>${A.d}</small></div>`;
    const ks = Object.keys(s.b); h += `<div class="chips">${ks.length ? ks.map(k => { const B = BY[k]; return B ? `<span class="chip" style="--c:${TAG[B.tag]}" title="${B.d(s.b[k])}">${B.ic} ${B.n} Lv${s.b[k]}</span>` : ''; }).join('') : '<span style="color:#8a7a98;font-size:12px">还没有祝福——每次回洞结算后可以挑一个</span>'}</div>`;
    const sets = Object.keys(TAG).filter(t => (tcn[t] || 0) >= 1).map(t => `${(tcn[t] || 0) >= 3 ? `<b>${t}×${tcn[t]} ✔ ${SETS[t]}</b>` : `${t} ${tcn[t]}/3`}`).join(' · '); if (sets) h += `<div class="sets">套装：${sets}</div>`;
    if (s.pend > 0 && GU()) h += `<button class="cd" data-rgopen="1" style="--c:#c9a2ff;width:100%;margin-top:8px;padding:12px;font-size:15px"><b>🎴 祝福抉择 ×${s.pend} —— 点击展开</b></button>`;
    else if (s.pend > 0) h += `<div class="h" style="margin-top:8px">🎴 祝福抉择 ×${s.pend} <small>（3 选 1；同一个可升到 Lv3，同标签 3 种成套）</small></div><div class="cards">${boonOffer().map(b => `<button class="cd" data-rgb="${b.k}" style="--c:${TAG[b.tag]}"><b>${b.ic} ${b.n}${s.b[b.k] ? ` → Lv${s.b[b.k] + 1}` : ''}</b><i>标签：${b.tag}${(tcn[b.tag] || 0) === 2 && !s.b[b.k] ? ' · 选它成套！' : ''}</i><span>${b.d((s.b[b.k] || 0) + 1)}</span></button>`).join('')}</div>`;
    return h;
  }
  function inject() {
    if (!on() || W()) return; const host = document.querySelector('.rq-pick') || document.querySelector('.locs'); if (!host || !host.offsetParent || document.getElementById('rgPanel')) return; css();
    const d = document.createElement('div'); d.id = 'rgPanel'; d.innerHTML = panelHTML(); host.parentNode.insertBefore(d, host);
    if (GU() && !st().arch) setTimeout(openArch, 250); else if (GU() && st().pend > 0 && !inject.asked) { inject.asked = 1; setTimeout(openBoon, 250); }
    d.addEventListener('click', e => { if (GU() && e.target.closest('[data-rgopen]')) { e.stopPropagation(); if (!st().arch) openArch(); else openBoon(); return; } const a = e.target.closest('[data-rga]'), b = e.target.closest('[data-rgb]'); if (!a && !b) return; e.stopPropagation(); const s = st();
      if (a && !s.arch) pickArch(a.dataset.rga);
      if (b && s.pend > 0) pickBoon(b.dataset.rgb);
      d.innerHTML = panelHTML(); });
  }
  const GU = () => !!(window.GrandUI && GrandUI.on());
  function refresh() { const d = document.getElementById('rgPanel'); if (d) d.innerHTML = panelHTML(); }
  function pickArch(k) { const s = st(); if (s.arch) return; s.arch = k; s.archOffer = null; const A = ARCH.find(x => x.k === k); toast(`⚔️ 本局流派：${A.ic} ${A.n}「${LORE[k][0]}」——${A.d}`, TAG[A.tag], 4); try { SFX.page && SFX.page(); G().save(); } catch (e) { } refresh(); }
  function pickBoon(k) { const s = st(); if (!(s.pend > 0)) return; const B = BY[k]; s.b[k] = Math.min(3, (s.b[k] || 0) + 1); s.pend--; s.offer = null; tc.t = 0; toast(`🎴 ${B.ic} ${B.n} Lv${s.b[k]}：${B.d(s.b[k])}`, TAG[B.tag], 3); if (tagCount()[B.tag] === 3) setTimeout(() => toast(`✨ 套装成型「${B.tag}」：${SETS[B.tag]}`, '#ffe08a', 4), 600); try { G().save(); } catch (e) { } refresh(); }
  function openArch() {
    if (!on() || !GU() || st().arch || GrandUI.isOpen()) return;
    GrandUI.choose({ kicker: '新 的 一 局', title: '选择你的杀法', sub: '这一局你会怎么杀人？三种流派随机摆在面前——选定之后整局不变，之后的祝福会偏向它的标签。',
      cards: pickArchOffer().map(a => ({ k: a.k, ic: a.ic, col: TAG[a.tag], name: a.n, epi: LORE[a.k][0], rib: a.tag, html: a.d, fl: LORE[a.k][1] })), onPick: pickArch });
  }
  function openBoon() {
    if (!on() || !GU() || !(st().pend > 0) || GrandUI.isOpen()) return; const s = st(), tcn = tagCount();
    GrandUI.choose({ kicker: `祝 福 抉 择 · 还有 ${s.pend} 次`, title: '月光给你三条路', sub: `三选一。同一个祝福可以升到 Lv3；同一标签凑齐 3 种触发套装。${s.arch ? `你的流派：<b style="color:${TAG[(ARCH.find(a => a.k === s.arch) || {}).tag]}">${(ARCH.find(a => a.k === s.arch) || {}).n}</b>` : ''}`,
      cards: boonOffer().map(b => ({ k: b.k, ic: b.ic, col: TAG[b.tag], name: b.n, epi: TAGN[b.tag], rib: b.tag, lv: s.b[b.k] ? `Lv${s.b[b.k]} → Lv${s.b[b.k] + 1}` : '新祝福', html: `${b.d((s.b[b.k] || 0) + 1)}${(tcn[b.tag] || 0) === 2 && !s.b[b.k] ? `<br><br><span class="hl">选它就成套：${SETS[b.tag]}</span>` : `<br><br><small>${b.tag} 标签 ${tcn[b.tag] || 0}/3 · 套装：${SETS[b.tag]}</small>`}` })),
      later: '稍后再选', onPick: k => { pickBoon(k); if (st().pend > 0) setTimeout(openBoon, 350); } });
  }
  setInterval(() => { try { inject(); } catch (e) { } }, 400);
  return { on, outDmg, event, inDmg, hpK, spdK, dmgK, grant, roundPick, st, ARCH, BOON, SETS, tagCount, lv, openArch, openBoon };
})();
