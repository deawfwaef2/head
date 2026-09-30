// R35 MOD gear2（默认开）：传奇式装备。
//  - 新增 8 个饰品槽：项链、戒指×2、手镯×2、腰带、靴子、勋章（原 武器/头盔/护甲/护符/背篓 保留）。
//  - 饰品只能在野外找到（宝箱/武器架/木箱/尸体/霸主/精英/猎手），找到后装进麻袋 → 右键“装备”或 Z 面板点击穿上。
//  - 每件带 0~5 条随机词条（按稀有度），13 名精英 + 月之魔女各掉一件专属神话装备（固定词条 + 典故）。
//  - 武器/头盔/护甲/护符 不能再用魂晶直接买（只能找到；背篓仍可买）；强化 +N 不变。
//  - 效果接入：RPG.stats（属性/攻防血）、Sack.dmgMul/worlds ctx.power（伤害%、暴击）、FoeAbs.conv（减伤%）、每秒回血、击倒回血、魂晶/魂力获取、猎手仇恨/感应。
window.Gear2 = (() => {
  const on = () => !window.Mods || Mods.on('gear2');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const RARC = ['#c8c2b6', '#7fd07a', '#5fa6ff', '#c27cff', '#ffb347', '#ff5a4a'], RARN = ['普通', '优良', '稀有', '史诗', '传说', '神话'];
  const M = [0, 1, 2, 3.5, 5.5, 8, 12];
  const SL = {
    neck: { n: '项链', ic: '📿', w: 1, h: 1, base: t => ({ soul: Math.ceil(M[t] * 1.5), ter: Math.ceil(M[t]) }), nm: ['麻绳骨坠', '狼牙项链', '银链护颈', '秘银吊坠', '龙心项链', '星辰之链'] },
    ring: { n: '戒指', ic: '💍', w: 1, h: 1, base: t => ({ atk: Math.ceil(M[t] * 1.2) }), nm: ['铜戒', '骨戒', '银戒', '血玉戒', '魔金指环', '永夜之戒'] },
    brace: { n: '手镯', ic: '⭕', w: 1, h: 1, base: t => ({ def: Math.ceil(M[t] * 2), str: Math.ceil(M[t] * 0.8) }), nm: ['皮护腕', '铁手镯', '钢骨手镯', '符文手镯', '圣银手镯', '龙鳞手镯'] },
    belt: { n: '腰带', ic: '🎗️', w: 2, h: 1, base: t => ({ hp: Math.ceil(M[t] * 12), con: Math.ceil(M[t]) }), nm: ['麻绳腰带', '皮带', '铆钉腰带', '巨人腰带', '泰坦束带', '神王腰带'] },
    boots: { n: '靴子', ic: '🥾', w: 1, h: 2, base: t => ({ agi: Math.ceil(M[t] * 1.5), def: Math.ceil(M[t]) }), nm: ['草鞋', '皮靴', '铁靴', '疾风靴', '影步靴', '天行者之靴'] },
    medal: { n: '勋章', ic: '🎖️', w: 1, h: 1, base: t => ({ ter: Math.ceil(M[t]), soul: Math.ceil(M[t]) }), nm: ['木质徽记', '铜勋章', '银勋章', '金勋章', '王者勋章', '屠神勋章'] }
  };
  // 穿戴位（ring/brace 两个）
  const POS = [['neck', 'neck', '项链'], ['ring1', 'ring', '左戒'], ['ring2', 'ring', '右戒'], ['brace1', 'brace', '左镯'], ['brace2', 'brace', '右镯'], ['belt', 'belt', '腰带'], ['boots', 'boots', '靴子'], ['medal', 'medal', '勋章']];
  // 词条：k, 名称, 前缀, 值(t, r) , 格式
  const AF = {
    str: ['力量', '蛮力的', t => Math.ceil(M[t] * (0.7 + Math.random() * 0.6))], con: ['体魄', '坚韧的', t => Math.ceil(M[t] * (0.7 + Math.random() * 0.6))],
    agi: ['敏捷', '迅捷的', t => Math.ceil(M[t] * (0.7 + Math.random() * 0.6))], ter: ['凶威', '凶戾的', t => Math.ceil(M[t] * (0.7 + Math.random() * 0.6))],
    soul: ['魂力', '魂语的', t => Math.ceil(M[t] * (0.7 + Math.random() * 0.6))], atk: ['攻击', '锐利的', t => Math.ceil(M[t] * (1 + Math.random()))],
    def: ['防御', '厚重的', t => Math.ceil(M[t] * (1.8 + Math.random() * 1.5))], hp: ['生命上限', '健壮的', t => Math.ceil(M[t] * (10 + Math.random() * 10))],
    dmg: ['伤害', '嗜血的', t => 2 + Math.floor(Math.random() * (2 + 2 * t)), '%'], crit: ['暴击率', '锋锐的', t => 1 + Math.floor(Math.random() * (2 + t)), '%'],
    dr: ['受到伤害', '坚壁的', t => 1 + Math.floor(Math.random() * (2 + t)), '%', -1], regen: ['每秒回复生命', '再生的', t => +(0.2 + M[t] * 0.15 * (0.7 + Math.random() * 0.6)).toFixed(1)],
    kheal: ['放倒敌人回复生命', '饮魂的', t => 1 + Math.floor(Math.random() * (1 + t)), '%'], coin: ['魂晶获取', '贪婪的', t => 3 + Math.floor(Math.random() * (2 + 3 * t)), '%'],
    yield: ['首级魂力产出', '通灵的', t => 3 + Math.floor(Math.random() * (2 + 3 * t)), '%'], hate: ['猎手仇恨增长', '隐匿的', t => 3 + Math.floor(Math.random() * (2 + 2 * t)), '%', -1],
    sense: ['猎手感应增长', '无声的', t => 3 + Math.floor(Math.random() * (2 + 2 * t)), '%', -1]
  };
  const AFK = Object.keys(AF);
  const SUF = ['·狼王之噬', '·孤月', '·血誓', '·黄昏', '·寒鸦', '·无光', '·断罪', '·千夜', '·骨冠', '·灰烬', '·白夜', '·静默'];
  const LORE = ['上一个主人没能带着它回家。', '内侧刻着一个已经没人记得的名字。', '握在手里，能听见很远的地方有人在哭。', '从一具穿着华服的骸骨上取下来的。', '它比看起来要重，像是装满了往事。', '据说是用第一滴月光打磨的。', '上面的血迹怎么擦都擦不掉。', '戴上它的人，都会梦见同一片麦田。'];
  // 精英专属神话装备
  const UNQ = {
    circus: ['ring', '万花镜之戒', [['crit', 12], ['agi', 14], ['dmg', 8]], '镜面里映出的永远是别人的脸。塞拉菲娜说，这是她最好的一场演出的门票。'],
    pirate: ['belt', '黑帆船长腰带', [['coin', 30], ['hp', 160], ['dr', 6]], '挂过七把弯刀、三把钥匙和一张永远找不到的藏宝图。'],
    plague: ['neck', '鸦喙面具吊坠', [['regen', 3.5], ['kheal', 5], ['con', 10]], '吊坠里装着没药和丁香——瘟疫医生唯一相信的护身符。'],
    champion: ['medal', '三百一十七胜勋章', [['dmg', 15], ['ter', 16], ['str', 12]], '背面刻着三百一十七道划痕。你亲手补上了最后一道。'],
    sand: ['boots', '沙暴行者之靴', [['agi', 22], ['sense', 30], ['def', 20]], '靴底永远有沙子倒不干净。穿着它走路，连风都听不见。'],
    clock: ['brace', '千机发条手镯', [['def', 50], ['dr', 10], ['str', 14]], '手镯里的齿轮还在转，每一格都卡在你的心跳上。'],
    alch: ['ring', '金秤指环', [['coin', 40], ['yield', 20], ['soul', 16]], '戴着它称任何东西，都会显示“值得”。'],
    thief: ['brace', '千丝手镯', [['crit', 10], ['hate', 25], ['agi', 16]], '一千根看不见的丝从镯子上垂下去，连着一千个秘密。'],
    naga: ['neck', '蛇母蜕皮项链', [['regen', 5], ['hp', 220], ['con', 14]], '一整张蛇蜕编成的链子，冰凉、柔软，会自己缩紧。'],
    valk: ['medal', '英灵殿徽记', [['dmg', 12], ['kheal', 6], ['ter', 18]], '女武神说：只有英勇的亡魂才配戴它。她把它留给了你。'],
    pharaoh: ['neck', '永眠圣甲虫', [['soul', 24], ['yield', 25], ['dr', 8]], '三千年前的圣甲虫，翅膀下面还压着一粒没发芽的麦子。'],
    blade: ['ring', '墨染剑穗指环', [['crit', 18], ['dmg', 18], ['atk', 30]], '剑穗的墨色丝线缠成了一枚指环。那把刀你没能带走——它自己碎了。'],
    giant: ['belt', '山心束带', [['hp', 420], ['con', 24], ['dr', 10]], '巨人女王的腰带，你得绕三圈才系得住。'],
    moon: ['medal', '月蚀之印', [['dmg', 25], ['dr', 15], ['soul', 30], ['str', 20], ['regen', 6]], '月之魔女最后的诅咒，也是最后的祝福：「从今以后，月亮只为你一个人升起。」']
  };
  const SUM_K = ['str', 'con', 'agi', 'ter', 'soul', 'atk', 'def', 'hp', 'dmg', 'crit', 'dr', 'regen', 'kheal', 'coin', 'yield', 'hate', 'sense'];
  const CAP = { crit: 45, dr: 55, hate: 70, sense: 70 };

  // ---------- 物品 ----------
  function defs() {
    if (defs.done || !window.Sack || !Sack.def) return; defs.done = 1;
    for (const s in SL) for (let t = 1; t <= 6; t++) Sack.def(`g2_${s}_${t}`, { n: SL[s].nm[t - 1], icon: SL[s].ic, kind: 'equip', slot: 'g2', g2s: s, tier: t, w: SL[s].w, h: SL[s].h, rar: 0, desc: SL[s].n });
  }
  function make(slot, t, rar, fixed) {
    defs(); t = Math.max(1, Math.min(6, t | 0)); rar = Math.max(0, Math.min(5, rar | 0));
    const aff = []; if (fixed) aff.push(...fixed.map(a => a.slice())); else { const pool = AFK.slice(); for (let i = 0; i < rar && pool.length; i++) { const k = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; if ((k === 'hate' || k === 'sense') && rar < 3) { i--; continue; } aff.push([k, AF[k][2](t)]); } }
    const g2 = { s: slot, t, rar, aff, req: Math.max(1, (t - 1) * 7 + rar * 2 - 4), lore: LORE[Math.floor(Math.random() * LORE.length)] };
    if (!fixed && rar >= 1 && aff.length) g2.pre = AF[aff[0][0]][1];
    if (!fixed && rar >= 4) g2.suf = SUF[Math.floor(Math.random() * SUF.length)];
    return Sack.mk(`g2_${slot}_${t}`, 1, { g2 });
  }
  const name = o => { const g = o.g2; if (!g) return ''; if (g.un) return g.un; return (g.pre || '') + SL[g.s].nm[g.t - 1] + (g.suf || ''); };
  const fmt = (k, v) => { const a = AF[k]; return `${a[0]} ${a[4] === -1 ? '-' : '+'}${v}${a[3] || ''}`; };
  function rollRar(r, lv, bonus) { const u = r() - (bonus || 0) * 0.12; return u < 0.006 + lv * 0.006 ? 4 : u < 0.04 + lv * 0.018 ? 3 : u < 0.14 + lv * 0.03 ? 2 : u < 0.4 + lv * 0.04 ? 1 : 0; }
  function rollOne(r, lv, bonus) { const ks = Object.keys(SL), s = ks[Math.floor(r() * ks.length)], t = Math.floor(lv * 0.62 + r() * 1.7 + (bonus || 0)) + 1; return make(s, t, rollRar(r, lv, bonus)); }
  function rollLoot(r, kind, lv, extra) {
    if (!on()) return null; const out = [];
    const p = { chest: 0.4, rack: 0.12, crate: 0.1, barrel: 0.04, basket: 0.05, bucket: 0.04 }[kind];
    if (p && r() < p) out.push(rollOne(r, lv, kind === 'chest' ? 0.5 : 0));
    if (kind === 'corpse') { if (extra && extra.boss) { out.push(rollOne(r, lv, 2), rollOne(r, lv, 1.5)); } else if (r() < (extra && extra.armed ? 0.12 : 0.05)) out.push(rollOne(r, lv, 0)); }
    return out.length ? out : null;
  }
  function give(o) { // 野外 → 麻袋（放不下就送回洞里的储物箱）；洞里 → 储物箱
    const I = Sack.inv(), wild = window.Worlds && Worlds.active;
    if (wild && Sack.addTo(I.sack, o)) return 'sack'; Sack.stashAdd(o); return 'stash';
  }
  function dropFor(rec, rar, pos, id) {
    if (!on()) return ''; let o;
    if (id && UNQ[id]) { const u = UNQ[id]; o = make(u[0], id === 'moon' ? 6 : Math.min(6, 2 + Math.round(Math.log(rec / 60) / Math.log(2.2))), 5, u[2]); o.g2.un = u[1]; o.g2.lore = u[3]; o.g2.req = 1; }
    else { const lv = Math.min(9, Math.log(Math.max(40, rec) / 40) / Math.log(1.45)); o = rollOne(Math.random, lv, 1.5); if ((o.g2.rar | 0) < (rar | 0)) { const n = make(o.g2.s, o.g2.t, rar); o = n; } }
    const w = give(o); try { G.toast(`${SL[o.g2.s].ic} 获得【${RARN[o.g2.rar]}】${name(o)}${w === 'stash' ? '（送回洞里储物箱）' : '（在麻袋里）'}`, RARC[o.g2.rar], 3); } catch (e) { }
    return name(o);
  }

  // ---------- 穿戴 ----------
  function SS() { const S = G.S; S.g2 = S.g2 || { eq: {} }; S.g2.eq = S.g2.eq || {}; return S.g2; }
  function lvNow() { try { return G.st().lv || 1; } catch (e) { return 1; } }
  function equip(o, putOld, pos) {
    const s = o.g2.s, eq = SS().eq;
    if ((o.g2.req || 1) > lvNow()) { G.toast(`需要食人魔等级 ${o.g2.req}（你 Lv.${lvNow()}）`, '#ff9a7a', 2); putOld(o); return false; }
    const opts = POS.filter(p => p[1] === s).map(p => p[0]); const at = pos && opts.includes(pos) ? pos : (opts.find(p => !eq[p]) || opts[0]);
    const old = eq[at]; eq[at] = o; if (old) putOld(old);
    try { SFX.metal && SFX.metal(); SFX.levelup && o.g2.rar >= 4 && SFX.levelup(); } catch (e) { }
    G.toast(`${SL[s].ic} 穿上【${RARN[o.g2.rar]}】${name(o)}`, RARC[o.g2.rar], 1.6); try { G.save(); } catch (e) { } render();
    return true;
  }
  function unequip(at) { const eq = SS().eq, o = eq[at]; if (!o) return; delete eq[at]; const w = give(o); G.toast(`卸下 ${name(o)}${w === 'stash' ? '（储物箱）' : '（麻袋）'}`, '#ccc', 1.3); try { G.save(); } catch (e) { } render(); }
  let cache = null, cacheT = 0;
  function sum() {
    const now = performance.now(); if (cache && now - cacheT < 250) return cache;
    const o = {}; for (const k of SUM_K) o[k] = 0;
    if (on() && window.G && G.S) for (const p of POS) { const it = SS().eq[p[0]]; if (!it || !it.g2) continue; const b = SL[it.g2.s].base(it.g2.t); for (const k in b) o[k] += b[k]; for (const [k, v] of it.g2.aff) o[k] = (o[k] || 0) + v; }
    for (const k in CAP) o[k] = Math.min(CAP[k], o[k]);
    cache = o; cacheT = now; return o;
  }
  const bust = () => { cache = null; };

  // ---------- 接入 ----------
  function hook() {
    defs();
    if (window.RPG && RPG.stats && !RPG.__g2) {
      const s0 = RPG.stats; RPG.stats = function (S, bb) {
        const o = s0.call(this, S, bb || {}); if (!on() || !S || !S.g2) return o; const a = sum();
        for (const k of ['str', 'con', 'agi', 'ter', 'soul']) o[k] += a[k];
        o.atk += a.atk; o.def += a.def; o.maxHp = Math.round(o.maxHp + a.con * 12 + a.hp);
        o.power = Math.round(o.power + (a.str + a.atk) * 3 + a.agi * 2 + a.ter * 2 + a.con * 1.5 + a.def * 1.5);
        o.dodge = o.agi / (o.agi + 80); o.yieldMul = (o.yieldMul + a.soul * 0.04) * (1 + a.yield / 100);
        o.g2 = a; return o;
      }; RPG.__g2 = 1;
    }
    if (window.G && G.buyEquip && !G.__g2) {
      const b0 = G.buyEquip; G.buyEquip = function (slot) { if (on() && slot !== 'bag') { G.toast('⚔ 装备只能在野外找到：宝箱、武器架、尸体、霸主和精英（Z 查看装备）', '#ffb070', 2.6); return false; } return b0.apply(this, arguments); };
      const c0 = G.addCoins; if (c0) G.addCoins = function (n) { if (on() && n > 0 && window.Worlds && Worlds.active) { const a = sum(); if (a.coin) n = Math.round(n * (1 + a.coin / 100)); } return c0.call(this, n); };
      G.__g2 = 1;
    }
    if (window.FoeAbs && !FoeAbs.__g2) { const c0 = FoeAbs.conv; FoeAbs.conv = function () { const v = c0.apply(this, arguments); return on() ? v * (1 - sum().dr / 100) : v; }; FoeAbs.__g2 = 1; }
  }
  // worlds ctx.power 调用（每次命中）：伤害% × 暴击
  let lastCrit = 0;
  function hitMul() { if (!on()) return 1; const a = sum(); let m = 1 + a.dmg / 100; if (a.crit && Math.random() * 100 < a.crit) { m *= 1.8; lastCrit = performance.now(); } return m; }
  const avgMul = () => { if (!on()) return 1; const a = sum(); return (1 + a.dmg / 100) * (1 + 0.8 * a.crit / 100); };
  const hateMul = () => on() ? 1 - sum().hate / 100 : 1, senseMul = () => on() ? 1 - sum().sense / 100 : 1;
  let lk = null, rgAcc = 0;
  setInterval(() => {
    try {
      hook(); if (!on() || !window.G || !G.S) return; if (!SS().hint && G.toast && document.getElementById('menu') && document.getElementById('menu').classList.contains('hidden')) { SS().hint = 1; setTimeout(() => G.toast('🆕 Z 装备（传奇式饰品） · C 精英挑战 / 胜利进度 · U 食人魔猎手档案', '#ffd890', 6), 2500); } const W = window.Worlds && Worlds.active && Worlds._W; if (!W) { lk = null; return; }
      const a = sum(), st = G.st(); if (W.dead) return;
      if (a.regen && G.S.hp < st.maxHp && G.S.hp > 0) { rgAcc += a.regen * 0.25; if (rgAcc >= 1) { const n = Math.floor(rgAcc); rgAcc -= n; G.S.hp = Math.min(st.maxHp, G.S.hp + n); } }
      const k = (W.stats && W.stats.kill) || 0; if (lk == null) lk = k;
      if (k > lk && a.kheal) { const n = Math.round(st.maxHp * a.kheal / 100 * (k - lk)); G.S.hp = Math.min(st.maxHp, G.S.hp + n); try { G.floatText && G.floatText('+' + n, '#6aff8a'); } catch (e) { } }
      lk = k;
    } catch (e) { }
  }, 250);

  // ---------- 提示文字 ----------
  function tipBody(o, cmp) {
    const g = o.g2, b = SL[g.s].base(g.t), NM = { atk: '攻击', def: '防御', hp: '生命上限', str: '力量', con: '体魄', agi: '敏捷', ter: '凶威', soul: '魂力' };
    const ok = (g.req || 1) <= lvNow();
    let h = `<div style="color:#bbb">${SL[g.s].n} · ${g.t} 阶 · <span style="color:${ok ? '#9fe89f' : '#ff7a6a'}">需要等级 ${g.req || 1}</span></div>`;
    h += Object.entries(b).map(([k, v]) => `<div>${NM[k]} +${v}</div>`).join('');
    if (g.aff.length) h += `<div style="margin-top:3px">${g.aff.map(([k, v]) => `<div style="color:${g.un ? '#ffb070' : '#8fc8ff'}">✦ ${fmt(k, v)}</div>`).join('')}</div>`;
    if (cmp) { const c = SS().eq[cmp]; h += `<div style="color:#999;margin-top:3px">${c ? '替换：' + esc(name(c)) : '空位'}</div>`; }
    h += `<div style="color:#a99;font-style:italic;margin-top:4px">${esc(g.lore || '')}</div>`;
    return h;
  }
  function tipFull(o) { return `<div class="tn" style="color:${RARC[o.g2.rar]}">${SL[o.g2.s].ic} ${esc(name(o))}</div><div style="color:${RARC[o.g2.rar]};font-size:11px">${RARN[o.g2.rar]}${o.g2.un ? ' · 专属' : ''}</div>${tipBody(o)}`; }
  function oldTip(sl, it) {
    const E = RPG.EQUIP[sl], t = E.tiers[it ? Sack.IT[it.id].tier : (G.S.eq[sl] || 0)], p = it ? (it.plus || 0) : ((G.S.eqPlus && G.S.eqPlus[sl]) || 0), NM = { atk: '攻击', def: '防御', hp: '生命', str: '力量', con: '体魄', agi: '敏捷', ter: '凶威', soul: '魂力', cap: '可装首级' };
    const tr = it ? Sack.IT[it.id].tier : (G.S.eq[sl] || 0);
    return `<div class="tn" style="color:${RARC[Math.min(5, tr)]}">${E.icon} ${esc(t.n)}${p ? ' +' + p : ''}</div><div style="color:#bbb">${E.n}</div>${Object.keys(NM).filter(k => t[k]).map(k => `<div>${NM[k]} ${t[k]}</div>`).join('')}<div style="color:#a99;font-style:italic">${esc(t.desc || '')}</div>`;
  }

  // ---------- 面板（传奇风纸娃娃）— R35b：并入 R35UI 统一窗口 ----------
  let tipEl = null, LIST = [];
  function css() {
    if (css.done) return; css.done = 1; const s = document.createElement('style'); s.textContent = `
.g2w{display:grid;grid-template-columns:auto 1fr;gap:22px;align-items:start}
.g2doll{position:relative;padding:14px;background:radial-gradient(ellipse 70% 60% at 50% 45%,rgba(120,70,30,.18),transparent 70%),linear-gradient(180deg,rgba(0,0,0,.25),rgba(0,0,0,.45));box-shadow:inset 0 0 0 1px var(--u-line,rgba(231,194,122,.28))}
.g2grid{display:grid;grid-template-columns:repeat(4,92px);grid-auto-rows:84px;gap:8px}
.g2s{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:4px;cursor:pointer;background:radial-gradient(circle at 50% 40%,#2a1d16,#0d0909 80%);clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px);box-shadow:inset 0 0 0 1px var(--rc,rgba(231,194,122,.3)),inset 0 0 18px color-mix(in srgb,var(--rc,#000) 25%,transparent);transition:filter .12s,transform .12s}
.g2s:hover{filter:brightness(1.35);transform:translateY(-1px)}.g2s .i{font-size:30px;line-height:1}.g2s .n{font-size:11.5px;line-height:1.2;margin-top:5px;max-width:86px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700}
.g2s .l{position:absolute;top:3px;left:8px;font-size:10px;letter-spacing:.15em;color:var(--u-dim,#a8977c)}.g2s.empty .i{opacity:.16;filter:grayscale(1)}.g2s.empty .n{color:#6a5a48;font-weight:400}
.g2body{grid-column:2/4;grid-row:2/5;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 55%,rgba(194,20,31,.16),transparent 65%)}
.g2body .o{font-size:96px;line-height:1;filter:drop-shadow(0 6px 16px #000) sepia(.3)}.g2body .pw{font-family:var(--u-serif,serif);font-size:13px;letter-spacing:.3em;color:var(--u-dim,#a8977c);margin-top:6px}.g2body .pw b{display:block;font-size:30px;letter-spacing:.05em;color:var(--u-gold,#e7c27a);text-align:center}
.g2h4{font-family:var(--u-serif,serif);color:var(--u-gold,#e7c27a);letter-spacing:.2em;font-size:15px;margin:0 0 8px;padding-bottom:6px;background:linear-gradient(90deg,rgba(231,194,122,.5),transparent 70%) 0 100%/100% 1px no-repeat}
.g2tb{display:grid;grid-template-columns:1fr 1fr;column-gap:22px}.g2tb div{display:flex;justify-content:space-between;padding:3px 2px;border-bottom:1px solid rgba(231,194,122,.1);font-size:13px;color:#cdbfa6}.g2tb b{color:#fff;font-family:var(--u-serif,serif)}.g2tb .sp b{color:#9ccaff}.g2tb .z b{color:#6a5e50}
.g2inv{display:grid;grid-template-columns:repeat(auto-fill,minmax(82px,1fr));gap:7px;margin-top:4px}
.g2it{height:74px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-size:11px;line-height:1.2;padding:3px;background:radial-gradient(circle at 50% 35%,color-mix(in srgb,var(--rc) 18%,#1a120e),#0c0808 80%);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rc) 60%,transparent);color:var(--rc);transition:filter .12s,transform .12s}
.g2it:hover{filter:brightness(1.3);transform:translateY(-1px)}.g2it .i{font-size:24px;margin-bottom:3px}.g2it.no{opacity:.55}
.g2note{margin-top:10px;font-size:12px;color:var(--u-dim,#a8977c);line-height:1.65}
#g2Tip{position:fixed;z-index:90;pointer-events:none;display:none;max-width:300px;padding:10px 13px;font-size:12.5px;line-height:1.6;color:#e8dcc0;background:linear-gradient(180deg,rgba(28,19,22,.98),rgba(10,7,9,.98));box-shadow:0 0 0 1px var(--tc,rgba(231,194,122,.5)),0 0 0 4px rgba(0,0,0,.8),0 10px 30px #000}
#g2Tip .tn{font-family:var(--u-serif,serif);font-size:16px;font-weight:900}
@media (max-width:980px){.g2w{grid-template-columns:1fr}}`;
    document.head.appendChild(s);
  }
  const OLD = [['helm', '头盔'], ['weapon', '武器'], ['armor', '护甲'], ['charm', '护符'], ['bag', '背篓']];
  function slotHtml(key, label, it, old) {
    if (old) { const t = RPG.EQUIP[key].tiers[G.S.eq[key] || 0], em = !G.S.eq[key] && key !== 'weapon' && key !== 'armor', p = (G.S.eqPlus && G.S.eqPlus[key]) || 0, c = RARC[Math.min(5, G.S.eq[key] || 0)]; return `<div class="g2s ${em ? 'empty' : ''}" data-old="${key}" style="--rc:${em ? '' : c}"><span class="l">${label}</span><span class="i">${RPG.EQUIP[key].icon}</span><span class="n" style="color:${c}">${em ? '空' : esc(t.n) + (p ? ' +' + p : '')}</span></div>`; }
    return `<div class="g2s ${it ? '' : 'empty'}" data-pos="${key}" style="--rc:${it ? RARC[it.g2.rar] : ''}"><span class="l">${label}</span><span class="i">${SL[POS.find(p => p[0] === key)[1]].ic}</span><span class="n" style="color:${it ? RARC[it.g2.rar] : ''}">${it ? esc(name(it)) : '空'}</span></div>`;
  }
  function invList() { const I = Sack.inv(), wild = window.Worlds && Worlds.active, out = [], isEq = o => o.g2 || (Sack.IT[o.id] && Sack.IT[o.id].kind === 'equip'); for (const o of I.sack.items) if (isEq(o)) out.push([o, 'sack']); if (!wild) for (const o of I.stash) if (isEq(o)) out.push([o, 'stash']); const rr = o => o.g2 ? o.g2.rar : Math.min(5, Sack.IT[o.id].rar); return out.sort((a, b) => rr(b[0]) - rr(a[0])); }
  function panelHTML() {
    defs(); css(); bust(); const eq = SS().eq, st = G.st(), a = sum(), e = x => eq[x] || null, lv = lvNow();
    const cells = [slotHtml('helm', '头盔', 0, 1), slotHtml('neck', '项链', e('neck')), slotHtml('medal', '勋章', e('medal')), slotHtml('charm', '护符', 0, 1),
      slotHtml('weapon', '武器', 0, 1), `<div class="g2body"><div class="o">🧌</div><div class="pw">战 力<b>${st.power}</b></div></div>`, slotHtml('armor', '护甲', 0, 1),
      slotHtml('brace1', '左镯', e('brace1')), slotHtml('brace2', '右镯', e('brace2')), slotHtml('ring1', '左戒', e('ring1')), slotHtml('ring2', '右戒', e('ring2')),
      slotHtml('belt', '腰带', e('belt')), slotHtml('boots', '靴子', e('boots')), slotHtml('bag', '背篓', 0, 1)];
    const r = (n, v, sp, z) => `<div class="${sp ? 'sp' : ''}${z ? ' z' : ''}"><span>${n}</span><b>${v}</b></div>`;
    const base = r('等级', 'Lv.' + (st.lv || 1)) + r('生命', `${Math.round(G.S.hp)} / ${st.maxHp}`) + r('攻击', st.atk) + r('防御', st.def) + r('力量', st.str) + r('体魄', st.con) + r('敏捷', st.agi) + r('凶威', st.ter) + r('魂力', st.soul) + r('闪避', Math.round(st.dodge * 100) + '%');
    const sp = r('伤害加成', '+' + a.dmg + '%', 1, !a.dmg) + r('暴击率 ×1.8', a.crit + '%', 1, !a.crit) + r('受到伤害', '-' + a.dr + '%', 1, !a.dr) + r('每秒回复', a.regen.toFixed(1), 1, !a.regen) + r('放倒回复', a.kheal + '%', 1, !a.kheal) + r('魂晶获取', '+' + a.coin + '%', 1, !a.coin) + r('魂力产出', '+' + a.yield + '%', 1, !a.yield) + r('猎手仇恨', '-' + a.hate + '%', 1, !a.hate) + r('猎手感应', '-' + a.sense + '%', 1, !a.sense);
    LIST = invList(); const wild = window.Worlds && Worlds.active;
    const inv = LIST.map(([o], i) => { const g = o.g2, d = Sack.IT[o.id], rr = g ? g.rar : Math.min(5, d.rar), no = g && (g.req || 1) > lv; return `<div class="g2it${no ? ' no' : ''}" data-inv="${i}" style="--rc:${RARC[rr]}"><span class="i">${g ? SL[g.s].ic : d.icon}</span>${esc(g ? name(o) : Sack.nameOf(o))}${no ? `<small style="color:#ff8a7a">需 Lv.${g.req}</small>` : ''}</div>`; }).join('');
    return `<div class="r3-sub">饰品和装备<b>只能在野外找到</b>：宝箱、武器架、木箱、尸体、霸主、精英、猎手。点下方物品穿上，点格子卸下。悬停查看全部词条。</div>
<div class="g2w"><div class="g2doll"><div class="g2grid">${cells.join('')}</div></div>
<div><div class="g2h4">属 性</div><div class="g2tb">${base}${sp}</div>
<div class="g2h4" style="margin-top:16px">${wild ? '麻袋里的装备' : '麻袋 + 储物箱里的装备'} · ${LIST.length}</div><div class="g2inv">${inv || '<span class="g2note">还没有找到装备——去野外翻翻宝箱和尸体吧。</span>'}</div>
<div class="g2note">稀有度：${RARN.map((n, i) => `<span style="color:${RARC[i]}">${n}</span>`).join(' · ')}。词条数 = 稀有度。武器/护甲/头盔/护符的强化（+N）仍在铁匠处。</div></div></div>`;
  }
  function render() { if (window.R35UI && R35UI.isOpen('gear')) R35UI.render(); }
  function showTip(html, e, col) { if (!tipEl) { tipEl = document.createElement('div'); tipEl.id = 'g2Tip'; document.body.appendChild(tipEl); } if (!html) { tipEl.style.display = 'none'; return; } tipEl.innerHTML = html; tipEl.style.setProperty('--tc', col || 'rgba(231,194,122,.5)'); tipEl.style.display = 'block'; const x = Math.min(innerWidth - tipEl.offsetWidth - 8, e.clientX + 16), y = Math.min(innerHeight - tipEl.offsetHeight - 8, e.clientY + 12); tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px'; }
  function onMove(e) {
    const s = e.target.closest('[data-pos],[data-old],[data-inv]'); if (!s) return showTip(null);
    if (s.dataset.pos) { const it = SS().eq[s.dataset.pos], P = POS.find(p => p[0] === s.dataset.pos); showTip(it ? tipFull(it) + '<div style="color:#ffd890;margin-top:5px">左键：卸下</div>' : `<div class="tn">${P[2]}</div><div style="color:#999">空 —— 野外找到${SL[P[1]].n}后穿上</div>`, e, it ? RARC[it.g2.rar] : null); }
    else if (s.dataset.old) showTip(oldTip(s.dataset.old), e);
    else { const o = LIST[+s.dataset.inv][0]; showTip(o.g2 ? tipFull(o) + '<div style="color:#ffd890;margin-top:5px">左键：穿上</div>' : oldTip(Sack.IT[o.id].slot, o) + '<div style="color:#ffd890;margin-top:5px">左键：装备（替换当前）</div>', e, o.g2 ? RARC[o.g2.rar] : null); }
  }
  function onClick(e) {
    const s = e.target.closest('[data-pos],[data-inv]'); if (!s) return; showTip(null);
    if (s.dataset.pos) return unequip(s.dataset.pos);
    const [o, w] = LIST[+s.dataset.inv], I = Sack.inv();
    const back = w === 'sack' ? (x => { if (!Sack.addTo(I.sack, x)) Sack.stashAdd(x); }) : (x => Sack.stashAdd(x));
    if (w === 'sack') I.sack.items.splice(I.sack.items.indexOf(o), 1); else I.stash.splice(I.stash.indexOf(o), 1);
    if (o.g2) equip(o, back); else Sack.equip(o, back);
    bust(); render();
  }
  function toggle(v) { if (!window.R35UI) return; if (v === false) { if (R35UI.isOpen('gear')) R35UI.close(); } else if (v === true) R35UI.open('gear'); else R35UI.toggle('gear'); }
  if (window.R35UI) R35UI.reg('gear', { n: '💍 装备', title: '装 备', on, html: panelHTML, click: onClick, move: onMove, leave: () => showTip(null) });
  addEventListener('keydown', e => { if (!on() || !window.G || !G.S) return; if (e.code === 'KeyZ' && !e.repeat && !(document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName))) { if (window.UI && UI.open) return; e.preventDefault(); toggle(); } }, true);
  hook(); setTimeout(hook, 0); addEventListener('load', hook);
  return { on, SL, POS, AF, UNQ, make, name, rollLoot, dropFor, equip, unequip, sum, hitMul, avgMul, hateMul, senseMul, tipBody, tipFull, toggle, owns: o => !!(o && o.g2), get lastCrit() { return lastCrit; }, _bust: bust };
})();
