// R54 MOD workshop_plus（默认开）：🔨 工坊扩充。
//   · 配方从 12 个扩到 ~45 个：药品 / 料理 / 战斗增益（伤害·防御·疾行·再生·魂能）/ 护具·饰品（头盔、护甲、护符）/ 材料转化 / 肢体拆解。
//   · 砍断的上臂 / 下臂 / 大腿 / 小腿，腰斩得到的残胸，会收进麻袋成为材料（在工坊「拆解 · 肢体」里拆成骨、筋、皮）。
//   · 内容边界：只有四肢与躯干，不含任何生殖 / 性相关部位（见 organs.js 声明）；内脏（心 / 肠 / 肝…）仍走既有的「解剖」系统。
//   · 武器仍只能靠野外搜刮与铁匠台强化——这里不做武器配方。
window.Workshop = (() => {
  const on = () => !window.Mods || Mods.on('workshop_plus') !== false;
  const PART = { UpperArm: 'ua', LowerArm: 'la', UpperLeg: 'th', LowerLeg: 'ca' };
  const DEF = {
    ua: { n: '断上臂', icon: '💪', st: 5, h: 2, rar: 1, desc: '砍下来的整段上臂。骨粗、筋韧，拆开能得到骨头。' },
    la: { n: '断下臂', icon: '🤚', st: 5, rar: 1, desc: '前臂，连着细长的指骨。拆开能得到指骨与筋。' },
    th: { n: '断大腿', icon: '🦵', st: 5, h: 2, rar: 1, desc: '最大的一块肌腱与骨。拆开能抽出大量筋索。' },
    ca: { n: '断小腿', icon: '🦶', st: 5, rar: 1, desc: '小腿骨又直又硬，拆开能得到骨头与筋。' },
    torso: { n: '残胸', icon: '🥩', st: 3, w: 2, h: 2, rar: 2, desc: '腰斩留下的上半身躯干。拆开能剥出整张兽皮级的厚皮与肋骨。' },
    // 药品 / 料理 / 增益
    tonic: { n: '回春茶', icon: '🍵', kind: 'use', st: 5, heal: 0.25, desc: '苦中带甜的草药茶。恢复 25% 生命。' },
    salve: { n: '尸蜡膏', icon: '🧴', kind: 'use', st: 3, heal: 0.35, rar: 1, desc: '蜡质药膏，抹上去伤口发凉。恢复 35% 生命。' },
    soulwine: { n: '魂酒', icon: '🍷', kind: 'use', st: 3, heal: 0.7, rar: 2, desc: '魂尘泡的烈酒，一口下去全身发热。恢复 70% 生命。' },
    manadraught: { n: '魂能药', icon: '🔮', kind: 'use', st: 3, mana: 45, rar: 2, desc: '冰蓝色的药水。立刻恢复 45 点魂能。' },
    bonebroth: { n: '骨汤', icon: '🍲', kind: 'use', st: 3, heal: 0.55, desc: '大骨熬出来的浓汤。恢复 55% 生命。' },
    jerky: { n: '肉干', icon: '🍖', kind: 'use', st: 5, heal: 0.3, desc: '盐渍风干的兽肉，耐放。恢复 30% 生命。' },
    huntstew: { n: '猎人浓汤', icon: '🥘', kind: 'use', st: 3, heal: 0.75, rar: 2, desc: '肉、草药与兽牙粉慢炖。恢复 75% 生命。' },
    ironskin: { n: '铁肤散', icon: '🛡️', kind: 'use', st: 3, rar: 2, bf: { kind: 'def', k: 0.75, t: 120, msg: '皮肤发硬：120 秒内受到的伤害 −25%' }, desc: '骨灰与铁屑调成的粉，抹遍全身。120 秒内受到的伤害 −25%。' },
    swiftdust: { n: '疾风粉', icon: '💨', kind: 'use', st: 3, rar: 2, bf: { kind: 'spd', k: 1.18, t: 90, msg: '脚下生风：90 秒内移动速度 +18%' }, desc: '魂尘混兽牙粉。90 秒内移动速度 +18%。' },
    bloodoil: { n: '血油', icon: '🩸', kind: 'use', st: 3, rar: 3, bf: { kind: 'dmg', k: 1.4, t: 60, msg: '兵刃涂满血油：60 秒内伤害 +40%' }, desc: '尸蜡熬的黏稠血油，涂在刃上。60 秒内伤害 +40%（与磨刀石叠乘）。' },
    regenbalm: { n: '再生香膏', icon: '🌿', kind: 'use', st: 3, rar: 3, bf: { kind: 'regen', k: 0.02, t: 60, msg: '伤口在愈合：60 秒内每秒回复 2% 生命' }, desc: '草药、尸蜡与血玉粉。60 秒内每秒回复 2% 生命。' }
  };
  // g: med 药品 / food 料理 / buff 增益 / gear 护具 / conv 转化 / body 拆解
  const R = [
    { out: 'tonic', n: 2, need: { herb: 3 }, coin: 8, g: 'med' },
    { out: 'salve', n: 1, need: { wax: 2, herb: 2 }, coin: 25, g: 'med' },
    { out: 'soulwine', n: 1, need: { dust: 3, herb: 3 }, coin: 60, g: 'med' },
    { out: 'manadraught', n: 1, need: { dust: 2, herb: 2, wax: 1 }, coin: 45, g: 'med' },
    { out: 'bonebroth', n: 1, need: { bone: 3, herb: 1, meat: 1 }, coin: 5, g: 'food' },
    { out: 'jerky', n: 3, need: { meat: 3, ash: 1 }, coin: 5, g: 'food' },
    { out: 'huntstew', n: 1, need: { meat: 3, herb: 2, fang: 1 }, coin: 15, g: 'food' },
    { out: 'ironskin', n: 1, need: { ash: 2, iron: 1, hide: 1 }, coin: 40, g: 'buff' },
    { out: 'swiftdust', n: 1, need: { dust: 1, fang: 2, herb: 1 }, coin: 35, g: 'buff' },
    { out: 'bloodoil', n: 1, need: { wax: 2, fang: 2, meat: 1 }, coin: 90, g: 'buff' },
    { out: 'regenbalm', n: 1, need: { herb: 4, wax: 1, gem: 1 }, coin: 150, g: 'buff' },
    // 护具·饰品（材料为主，魂晶只是工费）
    { out: 'c1', n: 1, need: { bone: 3, lock: 1 }, coin: 60, g: 'gear' },
    { out: 'c2', n: 1, need: { fang: 8, sinew: 2, ash: 1 }, coin: 300, g: 'gear' },
    { out: 'c3', n: 1, need: { gem: 2, dust: 12, wax: 2 }, coin: 1500, g: 'gear' },
    { out: 'h1', n: 1, need: { bone: 4, horn: 1, sinew: 1 }, coin: 80, g: 'gear' },
    { out: 'h2', n: 1, need: { iron: 8, cloth: 2, hide: 1 }, coin: 400, g: 'gear' },
    { out: 'h3', n: 1, need: { horn: 4, iron: 6, dust: 6, ua: 1 }, coin: 1800, g: 'gear' },
    { out: 'h4', n: 1, need: { bone: 12, horn: 6, dust: 20, gem: 3 }, coin: 8000, g: 'gear' },
    { out: 'a1', n: 1, need: { hide: 6, sinew: 2 }, coin: 100, g: 'gear' },
    { out: 'a2', n: 1, need: { iron: 10, cloth: 4, sinew: 4 }, coin: 500, g: 'gear' },
    { out: 'a3', n: 1, need: { iron: 18, hide: 6, th: 2 }, coin: 2500, g: 'gear' },
    { out: 'a4', n: 1, need: { dust: 30, iron: 20, gem: 4, torso: 1 }, coin: 9000, g: 'gear' },
    // 材料转化
    { out: 'dust', n: 1, need: { bone: 4 }, coin: 10, g: 'conv' },
    { out: 'dust', n: 2, need: { ash: 3, herb: 1 }, coin: 12, g: 'conv' },
    { out: 'cloth', n: 3, need: { hide: 2, sinew: 1 }, coin: 8, g: 'conv' },
    { out: 'sinew', n: 2, need: { lock: 3 }, coin: 6, g: 'conv' },
    { out: 'gem', n: 1, need: { dust: 6 }, coin: 300, g: 'conv' },
    { out: 'dust', n: 5, need: { gem: 1 }, coin: 0, g: 'conv' },
    { out: 'iron', n: 2, need: { bone: 2, wood: 2 }, coin: 20, g: 'conv' },
    // 拆解·肢体
    { out: 'bone', n: 3, need: { ua: 1 }, coin: 0, g: 'body' },
    { out: 'phal', n: 4, need: { la: 1 }, coin: 0, g: 'body' },
    { out: 'sinew', n: 4, need: { th: 1 }, coin: 0, g: 'body' },
    { out: 'bone', n: 2, need: { ca: 1 }, coin: 0, g: 'body' },
    { out: 'hide', n: 3, need: { torso: 1 }, coin: 0, g: 'body' },
    { out: 'bone', n: 4, need: { torso: 1 }, coin: 0, g: 'body' }
  ];
  let done = false;
  function install() {
    if (done || !on() || !window.Sack || !Sack.RECIPES || !window.RPG) return; const IT = Sack.IT; if (!IT.herb) return; done = true;
    for (const k in DEF) Sack.def(k, DEF[k]);
    let add = 0, skip = [];
    for (const r of R) { const ids = [r.out, ...Object.keys(r.need)]; const miss = ids.filter(i => !IT[i]); if (miss.length && !(miss.every(i => /^[hac]\d$/.test(i)))) { skip.push(r.out + ':' + miss.join()); continue; } Sack.RECIPES.push(r); add++; }
    if (skip.length) console.warn('Workshop: skipped recipes (missing items)', skip);
    // 装备档位的物品定义在 inv() 里惰性创建；先触发一次，避免配方卡渲染时缺图标
    try { Sack.inv(); } catch (e) { }
    for (const r of Sack.RECIPES) if (!IT[r.out]) { r._hide = 1; }
  }
  const w = setInterval(() => { try { install(); } catch (e) { console.warn('Workshop', e); clearInterval(w); } if (done) clearInterval(w); }, 400);
  // 砍断的肢体 → 麻袋
  function onSever(fo, t) {
    if (!on() || !window.Sack || !window.G || !G.S) return; const z = fo && fo.lastSev || ''; let id = null;
    if (t === 'halve' || z === 'spine') id = 'torso'; else { const m = /(UpperArm|LowerArm|UpperLeg|LowerLeg)/.exec(z); if (m) id = PART[m[1]]; }
    if (!id || !Sack.IT[id]) return; if (id !== 'torso' && Math.random() > 0.8) return;
    const I = Sack.inv(), o = Sack.mk(id, 1); if (!Sack.addTo(I.sack, o)) I.pending.push(o);
    G.toast && G.toast(`🩸 收进麻袋：${Sack.IT[id].n}（工坊里可拆解成材料）`, '#ffb090', 2.2);
  }
  return { onSever, install, R, DEF, get done() { return done; } };
})();
