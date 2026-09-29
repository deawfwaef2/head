// RPG：属性 / 战力 / 装备 / 训练 / 远征结算
window.RPG = (() => {
  const STATS = [
    ['str', '力量', '💪', '提高战力（攻击）'],
    ['con', '体魄', '❤️', '提高生命上限与战力'],
    ['agi', '敏捷', '💨', '闪避伤害、提高战力'],
    ['ter', '凶威', '👹', '敌人更易崩溃投降，多带回首级'],
    ['soul', '魂力', '🔮', '把玩首级时魂晶产出 +4%/点']
  ];
  // 装备：每槽多个档位
  const EQUIP = {
    weapon: { n: '武器', icon: '🪓', tiers: [
      { n: '粗木棒', cost: 0, atk: 4, desc: '随手折的树干。' },
      { n: '钉头棒', cost: 150, atk: 12, desc: '木棒上钉满了生锈的铁钉。' },
      { n: '骨刃砍刀', cost: 700, atk: 26, desc: '巨兽肩胛骨磨成的砍刀，斩首利器。' },
      { n: '铁链流星锤', cost: 2600, atk: 48, desc: '一甩就是一片血雾。' },
      { n: '斩首巨斧', cost: 9000, atk: 85, desc: '刽子手公会的镇会之宝，斧刃上刻着一百个名字。' },
      { n: '月蚀魂镰', cost: 30000, atk: 150, soul: 6, desc: '月之魔女的镰刀，收割的魂会自动归你。' },
      { n: '噬神者', cost: 100000, atk: 260, ter: 15, desc: '据说斩过一位真正的神。' }
    ] },
    helm: { n: '头盔', icon: '⛑️', tiers: [
      { n: '无', cost: 0, def: 0 },
      { n: '兽骨头盔', cost: 200, def: 5, ter: 2, desc: '熊头骨做的。' },
      { n: '铁桶盔', cost: 1000, def: 12, desc: '从骑士尸体上扒下来的，有点紧。' },
      { n: '恶魔角盔', cost: 4500, def: 24, ter: 8, desc: '戴上后连自己都有点怕自己。' },
      { n: '龙颅盔', cost: 18000, def: 45, ter: 18, desc: '一整颗幼龙头骨。' }
    ] },
    armor: { n: '护甲', icon: '🛡️', tiers: [
      { n: '破兽皮', cost: 0, def: 2, hp: 0 },
      { n: '厚熊皮', cost: 250, def: 8, hp: 30, desc: '温暖又结实。' },
      { n: '缝合锁子甲', cost: 1200, def: 18, hp: 70, desc: '十几件锁子甲缝成一件。' },
      { n: '巨人板甲', cost: 5500, def: 34, hp: 150, desc: '山丘巨人的遗物。' },
      { n: '黑曜石甲', cost: 20000, def: 60, hp: 300, desc: '刀枪不入，只是有点重。' },
      { n: '龙鳞重铠', cost: 70000, def: 100, hp: 600, desc: '每一片鳞都能挡住一次龙息。' }
    ] },
    charm: { n: '护符', icon: '📿', tiers: [
      { n: '无', cost: 0 },
      { n: '鼠骨项链', cost: 180, agi: 2, soul: 1, desc: '据说能带来好运。' },
      { n: '狼牙护符', cost: 900, agi: 5, ter: 3, desc: '十二颗狼王的牙。' },
      { n: '月之泪', cost: 4000, soul: 6, agi: 4, desc: '月之魔女的一滴眼泪，冰冷刺骨。' },
      { n: '魔女的心脏', cost: 16000, soul: 12, con: 6, desc: '还在跳。' },
      { n: '神之眼', cost: 60000, soul: 20, agi: 12, ter: 10, desc: '能看见每一个魂魄的价格。' }
    ] },
    bag: { n: '背篓', icon: '🧺', tiers: [
      { n: '破麻袋', cost: 0, cap: 2, desc: '一次最多装 2 颗头。' },
      { n: '皮囊', cost: 300, cap: 3, desc: '最多装 3 颗。' },
      { n: '大藤篓', cost: 1500, cap: 4, desc: '最多装 4 颗。' },
      { n: '铁笼背架', cost: 6000, cap: 5, desc: '最多装 5 颗。' },
      { n: '尸布大包', cost: 20000, cap: 6, desc: '最多装 6 颗。' },
      { n: '魂之匣', cost: 65000, cap: 8, desc: '空间魔法，最多装 8 颗。' }
    ] }
  };
  const SLOTS = ['weapon', 'helm', 'armor', 'charm', 'bag'];
  const CONSUM = [
    { k: 'potion', n: '血肉药剂', icon: '🧪', cost: 60, desc: '立刻恢复 40% 生命。', heal: 0.4 },
    { k: 'bigpotion', n: '巨魔再生药', icon: '⚗️', cost: 400, desc: '立刻恢复全部生命。', heal: 1 }
  ];

  function eqSum(S) {
    const o = { atk: 0, def: 0, hp: 0, str: 0, con: 0, agi: 0, ter: 0, soul: 0, cap: 2 };
    for (const s of SLOTS) { const t = EQUIP[s].tiers[S.eq[s] || 0]; for (const k in t) if (typeof t[k] === 'number' && k !== 'cost') { if (k === 'cap') o.cap = t.cap; else o[k] += t[k]; } }
    if (S.eqPlus && S.eqPlus.weapon) o.atk += Math.round(EQUIP.weapon.tiers[S.eq.weapon || 0].atk * 0.15 * S.eqPlus.weapon); // 第十九轮：附魔每级 +15% 武器攻击
    if (window.Play) o.cap += Play.cap();
    return o;
  }
  // 最终属性 = 基础 + 训练 + 装备 + 建筑加成
  // ---- 第二十二轮：食人魔等级（MOD ogre_level）：斩杀/处决/斩首/格挡等战斗事件给经验，升级永久提高属性与生命上限 ----
  const LVMAX = 60, lvNeed = lv => Math.round(30 * Math.pow(1.3, lv - 1));
  const lvOn = () => !(window.Mods && Mods.on('ogre_level') === false);
  function lvOf(xp) { let lv = 1, x = Math.max(0, xp || 0); while (lv < LVMAX && x >= lvNeed(lv)) { x -= lvNeed(lv); lv++; } return { lv, cur: Math.round(x), need: lv >= LVMAX ? 0 : lvNeed(lv) }; }
  function lvBonus(S) { if (!lvOn()) return { lv: 1 }; const n = lvOf(S.xp).lv - 1; return { lv: n + 1, str: Math.floor(n * 0.8), con: Math.floor(n * 1.1), agi: Math.floor(n * 0.5), ter: Math.floor(n * 0.4), soul: Math.floor(n * 0.25), hp: n * 5 }; }
  function addXp(S, n) { if (!lvOn() || !(n > 0)) return null; const a = lvOf(S.xp).lv; S.xp = (S.xp || 0) + n; const b = lvOf(S.xp).lv; return b > a ? { from: a, to: b } : null; }
  function stats(S, buildBonus) {
    const e = eqSum(S); const o = {}, lb = lvBonus(S);
    for (const [k] of STATS) o[k] = (S.base[k] || 0) + (e[k] || 0) + (buildBonus[k] || 0) + (lb[k] || 0);
    o.lv = lb.lv;
    o.atk = e.atk; o.def = e.def; o.cap = e.cap + (buildBonus.cap || 0);
    o.maxHp = Math.round(80 + o.con * 12 + e.hp + (buildBonus.hp || 0) + (lb.hp || 0));
    o.power = Math.round((o.str + o.atk) * 3 + o.agi * 2 + o.ter * 2 + o.con * 1.5 + o.def * 1.5);
    o.dodge = o.agi / (o.agi + 80);
    o.yieldMul = 1 + o.soul * 0.04;
    return o;
  }
  const TRAIN = {
    str: { n: '力量', base: 40 }, con: { n: '体魄', base: 40 }, agi: { n: '敏捷', base: 40 }, ter: { n: '凶威', base: 50 }, soul: { n: '魂力', base: 60 }
  };
  function trainCost(S, k) { const lv = S.trained[k] || 0; return Math.round(TRAIN[k].base * Math.pow(1.22, lv)); }

  // 远征结算：返回事件序列（逐步揭示）与结果
  function expedition(S, st, loc, seed, usedNames, usedSig) {
    let s = seed >>> 0; const r = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const q = st.power / loc.rec;
    const beats = []; // {t, hp(绝对伤害,负=掉血), coin, head}
    const wpn = EQUIP.weapon.tiers[S.eq.weapon || 0].n;
    beats.push({ t: Lore.pick(r, loc.scene) + (q < 0.6 ? ' 你隐约觉得，这里不是你现在该来的地方。' : q > 2 ? ' 这里的人在你眼中和羔羊没有区别。' : '') });
    for (const ev of Lore.travelEvents(r, loc)) {
      const b = { t: ev.t };
      if (ev.hp) b.hp = Math.round(ev.hp * st.maxHp * (ev.hp < 0 ? (1 - st.dodge) : 1));
      if (ev.coin) b.coin = Math.round((loc.loot[0] + r() * (loc.loot[1] - loc.loot[0])) * ev.coin);
      beats.push(b);
    }
    // 遭遇
    const n = 2 + Math.floor(r() * 2) + (q > 1.5 ? 1 : 0) + (st.ter > 30 ? 1 : 0);
    let got = 0;
    const heads = [];
    for (let i = 0; i < n; i++) {
      const c = Lore.makeCharacter(r, loc, usedNames, luckOf(S));
      const diff = [0.7, 0.9, 1.15, 1.5, 2.1][c.rar];
      const qq = q / diff;
      const win = Math.max(0.03, Math.min(0.97, 1 / (1 + Math.exp(-(qq - 0.75) * 5)) + st.ter * 0.002));
      const dmgBase = st.maxHp * 0.075 * Math.pow(1 / Math.max(qq, 0.15), 1.45) * (0.5 + r());
      const won = r() < win;
      let dmg = Math.round(dmgBase * (won ? 1 : 1.7) * (1 - st.dodge) * (1 - Math.min(0.6, st.def / (st.def + 200))));
      if (qq > 2.5) dmg = Math.round(dmg * 0.4);
      if (won && got < st.cap) {
        got++;
        const look = ModelHeads.randomLook(r, c.lookRace, c.rar);
        // 保证不重复
        let sig = sigOf(look), tries = 0;
        while (usedSig.has(sig) && tries++ < 30) { const l2 = ModelHeads.randomLook(r, c.lookRace, c.rar); Object.assign(look, l2); sig = sigOf(look); }
        usedSig.add(sig); usedNames.add(c.name);
        rollExtras(r, c, look, luckOf(S));
        const hurt = dmg / st.maxHp;
        const mem = Lore.memory(r, c, { weapon: wpn, q: qq, hurt });
        const h = { c, look, sig, mem, story: Lore.backstory(r, c), app: Lore.appearance(c, look), date: Date.now() };
        heads.push(h);
        beats.push({ t: `你遇到了【${Lore.RAR[c.rar]}】${c.raceN}${c.idN}「${c.name}」。` + (dmg > 0 ? `一番厮杀后你砍下了她的头（-${dmg} HP）。` : '你轻松地砍下了她的头。'), hp: -dmg, head: h, enc: i, who: h, won: true, dmg });
      } else if (won) {
        const who = { c, look: ModelHeads.randomLook(r, c.lookRace, c.rar) };
        beats.push({ t: `你又砍翻了一个${c.idN}「${c.name}」，可背篓已经满了，只能把她的头留在原地。` + (dmg > 0 ? `（-${dmg} HP）` : ''), hp: -dmg, enc: i, coin: Math.round(loc.loot[0] * 0.3), who, won: true, full: true, dmg });
      } else {
        const fail = [`${c.raceN}${c.idN}「${c.name}」${Lore.ID[c.id].fight}。你被打得节节败退，她趁机逃走了。`, `你扑向${c.idN}「${c.name}」，却中了她的圈套。等你挣脱时她早已不见踪影。`, `「${c.name}」比你强。你被她${Lore.ID[c.id].fight.slice(0, 12)}……狼狈地逃了出来。`];
        const who = { c, look: ModelHeads.randomLook(r, c.lookRace, c.rar) };
        beats.push({ t: Lore.pick(r, fail) + (dmg > 0 ? `（-${dmg} HP）` : ''), hp: -dmg, enc: i, who, won: false, dmg });
      }
    }
    const coins = Math.round((loc.loot[0] + r() * (loc.loot[1] - loc.loot[0])) * (0.5 + Math.min(1.5, q) * 0.5));
    beats.push({ t: got ? `你背着沉甸甸的背篓踏上归途，${got} 颗首级在里面轻轻碰撞。` : '你两手空空地往回走，心情糟透了。', coin: Math.round(coins * 0.4) });
    // 打散：把旅途事件和遭遇交错
    const first = beats.shift(), last = beats.pop();
    for (let i = beats.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [beats[i], beats[j]] = [beats[j], beats[i]]; }
    // 遭遇按发生顺序排列（“背篓满了”不会早于装满它的那几次）
    const pos = [], enc = []; beats.forEach((b, i) => { if (b.enc != null) { pos.push(i); enc.push(b); } });
    enc.sort((a, b) => a.enc - b.enc); pos.forEach((p, i) => beats[p] = enc[i]);
    beats.unshift(first); beats.push(last);
    return { beats, heads, q };
  }

  // ---------- 魂印（词缀）：每颗首级按稀有度抽取，给首级真实的玩法差异 ----------
  const AFF = {
    greed:   { n: '贪婪', icon: '💰', d: '所有魂晶产出 ×1.5' },
    wrath:   { n: '怨灵', icon: '👻', d: '自动产出时 20% 几率怨念爆发 ×5' },
    choir:   { n: '共鸣体', icon: '🎼', d: '在多位展示架上时共鸣倍率 +0.3' },
    beacon:  { n: '招魂', icon: '🕯️', d: '1.8 米内其他首级产出 +25%' },
    burst:   { n: '爆魂', icon: '💥', d: '被碾碎时魂晶 ×4' },
    muse:    { n: '歌姬', icon: '🎤', d: '通灵回放奖励 ×2' },
    charm:   { n: '魅惑', icon: '💋', d: '把玩连击上限 10 → 20' },
    lucky:   { n: '幸运', icon: '🍀', d: '被把玩时 6% 几率掉落 ×10 魂晶' },
    eternal: { n: '不朽', icon: '⏳', d: '收藏越久越值钱：每天 +8%（上限 +120%）' }
  };
  const AFF_K = Object.keys(AFF);
  const EPI_A = ['银月', '绯红', '黄昏', '霜雪', '星坠', '蔷薇', '黑棘', '琉璃', '白夜', '灰烬', '苍穹', '深海', '晨曦', '夜樱', '雷鸣', '翡翠', '暮色', '圣焰', '鸦羽', '金穗', '雾中', '血月'];
  function luckOf(S) { return (S.luckLv || 0) + Math.floor((S.fame || 0) / 3) + (window.G && G.daily && G.daily.k === 'moon' ? 3 : 0) + (window.Play ? Play.luck() : 0); }
  function rollExtras(r, c, look, luck) {
    const nA = [r() < 0.3 ? 1 : 0, 1, r() < 0.4 ? 2 : 1, 2, 3][c.rar];
    const shiny = r() < (0.025 + (luck || 0) * 0.004 + c.rar * 0.004) * (window.G && G.daily && G.daily.k === 'shiny' ? 3 : 1);
    const pool = AFF_K.slice(), aff = [];
    for (let i = 0; i < nA + (shiny ? 1 : 0) && pool.length; i++) aff.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    c.aff = aff;
    if (shiny) { c.shiny = 1; look.shiny = 1 + Math.floor(r() * 4); }
    if (c.rar >= 2 || shiny || r() < 0.35) { const A = EPI_A[Math.floor(r() * EPI_A.length)], idn = Lore.ID[c.id].n; c.title = r() < 0.5 ? `${A}之${idn}` : `${A}的${c.traits[0]}${idn}`; }
    if (c.rar >= 3 || shiny || (c.rar === 2 && r() < 0.3)) look.glowEye = 1;
  }
  // 地区 BOSS 的首级（第十轮）：B = Explore.BOSSES[k]
  function bossHead(S, st, loc, B, usedNames, usedSig) {
    const r = Math.random;
    const c = Lore.makeCharacter(r, loc, usedNames, luckOf(S));
    const R = Lore.RACES[B.race] || Lore.RACES.human;
    Object.assign(c, { race: B.race, raceN: R.n, id: B.id, idN: B.title, rar: 4, name: B.n, boss: loc.k, traits: B.traits.slice(), belief: B.belief, goal: B.goal });
    c.lookRace = Object.assign({}, R.look, { acc: Object.assign({}, (R.look || {}).acc || {}) });
    const look = ModelHeads.randomLook(r, c.lookRace, 4);
    Object.assign(look, B.look || {}); look.blood = 0.25; look.spat = 0.1;
    rollExtras(r, c, look, luckOf(S));
    c.shiny = 1; look.shiny = look.shiny || 3; look.glowEye = 1; c.title = B.title;
    let sig = sigOf(look); usedSig.add(sig); usedNames.add(c.name);
    const wpn = EQUIP.weapon.tiers[S.eq.weapon || 0].n;
    const mem = Lore.memory(r, c, { weapon: wpn, q: st.power / (loc.rec * B.pow), hurt: 0.4 });
    return { c, look, sig, mem, story: B.story, app: Lore.appearance(c, look), date: Date.now() };
  }
  function sigOf(l) { return [l.f, l.h, l.hn, l.hn2, l.en, l.en2, l.sk, l.feat || '', (l.acc || []).join('+'), l.exT, l.paint, l.hx ? l.hx.s + (l.hx.ahoge || '') : ''].join('|'); }

  // 熔魂炉：凝聚出一颗指定稀有度的新首级
  function forgeHead(S, rar, seed, usedNames, usedSig, luckBonus = 0) {
    let s = seed >>> 0; const r = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const L = Lore.LOCS, loc = L[Math.floor(r() * L.length)];
    let c = null;
    for (let i = 0; i < 40; i++) { const cc = Lore.makeCharacter(r, loc, usedNames, luckOf(S) + luckBonus); if (!c || Math.abs(cc.rar - rar) < Math.abs(c.rar - rar)) c = cc; if (cc.rar === rar) break; }
    c.rar = rar;
    const look = ModelHeads.randomLook(r, c.lookRace, c.rar);
    let sig = sigOf(look), tries = 0;
    while (usedSig.has(sig) && tries++ < 30) { Object.assign(look, ModelHeads.randomLook(r, c.lookRace, c.rar)); sig = sigOf(look); }
    usedSig.add(sig); usedNames.add(c.name);
    rollExtras(r, c, look, luckOf(S) + luckBonus);
    const mem = Lore.memory(r, c, { weapon: '熔魂炉的烈焰', q: 2, hurt: 0 });
    return { c, look, sig, mem, story: Lore.backstory(r, c), app: Lore.appearance(c, look), date: Date.now() };
  }
  // 第十四轮：世界里的一个敌人（她活着站在那里；砍下首级才算到手，所以这里不占用名字/外观签名）
  function foe(S, loc, seed, usedNames, usedSig) {
    let s = seed >>> 0; const r = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const c = Lore.makeCharacter(r, loc, usedNames, luckOf(S));
    const look = ModelHeads.randomLook(r, c.lookRace, c.rar);
    let sig = sigOf(look), tries = 0;
    while (usedSig.has(sig) && tries++ < 30) { Object.assign(look, ModelHeads.randomLook(r, c.lookRace, c.rar)); sig = sigOf(look); }
    rollExtras(r, c, look, luckOf(S));
    const wpn = EQUIP.weapon.tiers[S.eq.weapon || 0].n;
    const mem = Lore.memory(r, c, { weapon: wpn, q: 1, hurt: 0.1 });
    return { c, look, sig, mem, story: Lore.backstory(r, c), app: Lore.appearance(c, look), date: Date.now() };
  }
  return { lvOf, lvBonus, addXp, lvNeed, STATS, EQUIP, SLOTS, CONSUM, TRAIN, AFF, stats, eqSum, trainCost, expedition, sigOf, rollExtras, luckOf, forgeHead, bossHead, foe };
})();
