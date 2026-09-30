// R36 角色成长重做 · 数据层（window.TalData）：属性点 / 6 大流派 / 78 个天赋节点 / 31 个主动技能的说明与数值
// 逻辑在 js/talents.js，界面在 js/talents_ui.js。所有数值都在这里改，不用碰逻辑。
window.TalData = (() => {
  // ---------- 属性（每级 3 点，手动分配）----------
  const ATTR = [
    { k: 'str', n: '力量', ic: '💪', col: '#ff9a6a', d: '每点：战力 +3（基础伤害随战力成长）· 全部伤害 +0.4%', f: v => `战力 +${v * 3} · 伤害 +${(v * 0.4).toFixed(1)}%` },
    { k: 'con', n: '体魄', ic: '❤️', col: '#ff6a7a', d: '每点：最大生命 +12 · 战力 +1.5 · 生命回复 +0.02%/秒', f: v => `生命 +${v * 12}` },
    { k: 'agi', n: '敏捷', ic: '💨', col: '#8fe8b0', d: '每点：战力 +2 · 暴击率 +0.25% · 冷却缩减 +0.2% · 闪避率提高', f: v => `暴击 +${(v * 0.25).toFixed(1)}% · 冷却 -${(v * 0.2).toFixed(1)}%` },
    { k: 'ter', n: '凶威', ic: '👹', col: '#d8a0ff', d: '每点：战力 +2 · 暴击伤害 +1.5% · 对精英/霸主伤害 +0.3%', f: v => `暴伤 +${(v * 1.5).toFixed(1)}%` },
    { k: 'soul', n: '魂力', ic: '🔮', col: '#7ad8ff', d: '每点：魂能上限 +3 · 魂能回复 +0.08/秒 · 法术/技能威力 +1.2% · 魂晶收益 +4%', f: v => `魂能 +${v * 3} · 技能威力 +${(v * 1.2).toFixed(1)}%` }
  ];

  // ---------- 节点工厂 ----------
  // N：被动（可升多级，m = 每级提供的数值，文案里 $key 会被替换成 当前级×数值）
  const N = (id, n, ic, tier, c, max, need, d, m) => ({ id, n, ic, tier, c, max, need: need || [], d, m: m || {}, type: 'p', cost: 1 });
  // A：主动技能（1 级，cost 点；大招 2 点）
  const A = (id, n, ic, tier, c, need, cost) => ({ id, n, ic, tier, c, max: 1, need: need || [], type: 'a', cost: cost || 1, m: {} });

  const SCHOOLS = [
    { id: 'blade', n: '刃舞', ic: '🗡️', col: '#ffd27a', tag: '暴击 · 连击 · 弹反',
      d: '以快制慢的剑士流：连击叠伤害、暴击回冷却、弹反后必暴。手感最“操作”的一系。',
      nodes: [
        N('b_edge', '锋刃', '🗡️', 1, 0, 5, [], '全部伤害 +$dmg%', { dmg: 3 }),
        N('b_crit', '会心', '🎯', 1, 1, 5, [], '暴击率 +$crit%', { crit: 2 }),
        A('b_whirl', '旋风斩', '🌀', 1, 2),
        N('b_combo', '连击精通', '⛓️', 2, 0, 3, ['b_edge'], '连击每层 +$combo% 伤害（最多 15 层）', { combo: 1.2 }),
        A('b_lunge', '突刺', '⚡', 2, 1, ['b_whirl']),
        N('b_parry', '见切', '🤺', 2, 2, 3, ['b_crit'], '完美格挡 / 完美闪避后 4 秒：下一击必暴，伤害 +$parry%', { parry: 20 }),
        N('b_critd', '致命', '💥', 3, 0, 3, ['b_crit'], '暴击伤害 +$critD%', { critD: 15 }),
        A('b_wave', '剑气', '🌊', 3, 1, ['b_lunge']),
        N('b_flow', '行云流水', '💫', 3, 2, 3, ['b_parry'], '暴击时所有技能冷却 -$flow 秒', { flow: 0.4 }),
        A('b_flurry', '百刃', '⚔️', 4, 1, ['b_wave']),
        N('b_haste', '疾风', '🍃', 4, 2, 3, ['b_flow'], '移动速度 +$move% · 冷却缩减 +$cdr%', { move: 4, cdr: 2 }),
        N('b_master', '剑圣', '👑', 5, 0, 1, ['b_critd'], '暴击时 35% 概率追加一记 60% 伤害的斩击', { bmaster: 1 }),
        A('b_ult', '万剑归宗', '🌠', 5, 1, ['b_flurry'], 2)
      ] },
    { id: 'ward', n: '铁壁', ic: '🛡️', col: '#9fd0ff', tag: '减伤 · 反伤 · 控制',
      d: '站桩坦克流：厚血、减伤、荆棘反伤，盾击震地控场。新手装备也能在深处站得住。',
      nodes: [
        N('w_hp', '坚韧', '❤️', 1, 0, 5, [], '最大生命 +$hpP%', { hpP: 4 }),
        N('w_armor', '铁皮', '🛡️', 1, 1, 5, [], '受到的伤害 -$dr%', { dr: 2.5 }),
        A('w_bash', '盾击', '🔰', 1, 2),
        N('w_guard', '格挡精通', '🤚', 2, 0, 3, ['w_hp'], '格挡 / 弹反成功：回复 $guard% 最大生命，+6 魂能', { guard: 2 }),
        N('w_thorns', '荆棘', '🌵', 2, 1, 3, ['w_armor'], '受击时反弹 $thorns% 的伤害给攻击者', { thorns: 15 }),
        A('w_will', '钢铁意志', '🗿', 2, 2, ['w_bash']),
        N('w_regen', '恢复', '🌿', 3, 0, 3, ['w_guard'], '每秒回复 $regen% 最大生命', { regen: 0.5 }),
        A('w_quake', '震地', '🌋', 3, 1, ['w_bash']),
        A('w_ward', '魂盾', '🧿', 3, 2, ['w_will']),
        N('w_undy', '不屈', '✝️', 4, 0, 3, ['w_regen'], '致命一击时留 1 点血并回复 25% 生命、无敌 2 秒（冷却 100 / 80 / 60 秒，随等级缩短）', { undy: 1 }),
        N('w_bold', '无畏', '🦁', 4, 2, 3, ['w_ward'], '生命低于 50% 时：受到的伤害再 -$lowDr%', { lowDr: 6 }),
        N('w_stand', '不动如山', '⛰️', 5, 0, 1, ['w_undy'], '站定不动时受到的伤害 -30%', { stand: 1 }),
        A('w_ult', '战争堡垒', '🏰', 5, 1, ['w_quake'], 2)
      ] },
    { id: 'shadow', n: '影袭', ic: '🌑', col: '#b8a0ff', tag: '闪避 · 背刺 · 毒与流血',
      d: '刺客流：闪避、绕背、瞬移、毒刃与流血。高风险高爆发，需要走位。',
      nodes: [
        N('s_dodge', '迅捷', '💨', 1, 0, 5, [], '有 $avoid% 概率完全躲开一次攻击', { avoid: 2 }),
        N('s_back', '背刺', '🔪', 1, 1, 5, [], '攻击背对你的敌人：伤害 +$back%', { back: 8 }),
        A('s_step', '影遁', '🌫️', 1, 2),
        A('s_blade', '毒刃', '☠️', 2, 0, ['s_dodge']),
        N('s_bleed', '撕裂', '🩸', 2, 1, 3, ['s_back'], '暴击使目标流血：4 秒内额外造成 $bleedCrit% 的伤害', { bleedCrit: 30 }),
        N('s_evade', '闪避大师', '🦊', 2, 2, 3, ['s_step'], '完美闪避后 6 秒：暴击率 +$evadeM%，并回复体力', { evadeM: 15 }),
        A('s_strike', '绞杀', '🥷', 3, 0, ['s_blade']),
        N('s_assn', '暗杀者', '🎭', 3, 1, 3, ['s_bleed'], '对生命低于 50% 的敌人：伤害 +$wound%', { wound: 10 }),
        N('s_venom', '蚀骨', '🐍', 3, 2, 3, ['s_blade'], '毒伤 +$venom%，中毒的敌人移速 -15%', { venom: 15 }),
        A('s_cloud', '毒雾', '☁️', 4, 0, ['s_venom']),
        N('s_lethal', '致命打击', '⚰️', 4, 1, 3, ['s_assn'], '对生命低于 25% 的敌人：伤害 +$exec%', { exec: 25 }),
        N('s_shade', '暗影大师', '🌑', 5, 0, 1, ['s_lethal'], '躲开攻击后 5 秒：下一击必暴，伤害 +50%', { shade: 1 }),
        A('s_ult', '千影杀', '🌌', 5, 1, ['s_strike'], 2)
      ] },
    { id: 'rage', n: '狂血', ic: '🩸', col: '#ff6a6a', tag: '吸血 · 残血爆发 · 冲锋',
      d: '狂战士流：越疼越强，吸血续航，击杀狂热。用血换伤害，赌性最大。',
      nodes: [
        N('r_str', '蛮力', '💪', 1, 0, 5, [], '全部伤害 +$dmg% · 最大生命 +$hpP%', { dmg: 2, hpP: 2 }),
        N('r_leech', '嗜血', '🩸', 1, 1, 5, [], '每次命中回复 $leech% 最大生命', { leech: 0.4 }),
        A('r_roar', '战吼', '📣', 1, 2),
        N('r_rage', '怒火', '🔥', 2, 0, 3, ['r_str'], '生命低于 50% 时：伤害 +$lowDmg%', { lowDmg: 10 }),
        A('r_slam', '血怒斩', '🪓', 2, 1, ['r_roar']),
        N('r_numb', '痛觉麻木', '🦴', 2, 2, 3, ['r_leech'], '生命低于 50% 时：受到的伤害 -$lowDr%', { lowDr: 5 }),
        A('r_lust', '血之狂热', '😡', 3, 0, ['r_rage']),
        N('r_kill', '嗜杀', '☠️', 3, 1, 3, ['r_leech'], '击杀回复 $killHeal% 最大生命，+15 魂能', { killHeal: 4 }),
        N('r_wound', '重创', '🩹', 3, 2, 3, ['r_numb'], '每次命中有 $bleedHit% 概率使目标流血', { bleedHit: 10 }),
        A('r_charge', '蛮牛冲撞', '🐂', 4, 0, ['r_lust']),
        N('r_oath', '血誓', '📜', 4, 1, 3, ['r_kill'], '每损失 10% 生命：伤害 +$lostDmg%', { lostDmg: 2 }),
        N('r_frenzy', '血狂', '🌪️', 5, 0, 1, ['r_oath'], '击杀后 5 秒：伤害 +30%，移速 +20%', { frenzy: 1 }),
        A('r_ult', '屠神血祭', '👹', 5, 1, ['r_charge'], 2)
      ] },
    { id: 'soul', n: '魂术', ic: '🔮', col: '#7af0ff', tag: '法术 · 控场 · 魂能',
      d: '魂能法师流：魂弹、魂焰、闪电链、陨星。吃“魂力”与魂能上限，拉开距离也能打。',
      nodes: [
        N('m_pool', '魂池', '🧿', 1, 0, 5, [], '魂能上限 +$mana', { mana: 12 }),
        N('m_focus', '凝神', '🧘', 1, 1, 5, [], '魂能回复 +$manaReg/秒', { manaReg: 0.5 }),
        A('m_bolt', '魂弹', '🔹', 1, 2),
        A('m_nova', '魂爆', '❄️', 2, 0, ['m_bolt']),
        N('m_pow', '魂能增幅', '✨', 2, 1, 3, ['m_pool'], '法术 / 魂术技能伤害 +$spell%', { spell: 8 }),
        N('m_siphon', '汲魂', '🫧', 2, 2, 3, ['m_focus'], '法术命中回复 $siphon 魂能', { siphon: 3 }),
        A('m_fire', '魂焰', '🔥', 3, 0, ['m_nova']),
        A('m_mark', '死亡印记', '🔻', 3, 1, ['m_pow']),
        N('m_cdr', '速咏', '⏳', 3, 2, 3, ['m_siphon'], '冷却缩减 +$cdr%', { cdr: 5 }),
        A('m_chain', '连锁闪电', '⚡', 4, 0, ['m_fire']),
        N('m_over', '过载', '🔋', 4, 1, 3, ['m_mark'], '施放法术时 $over% 概率：不耗魂能，伤害 +50%', { over: 10 }),
        N('m_master', '魂之主宰', '👁️', 5, 0, 1, ['m_chain'], '魂能高于 80% 时：全部技能伤害 +25%', { mmaster: 1 }),
        A('m_ult', '魂陨', '☄️', 5, 1, ['m_chain'], 2)
      ] },
    { id: 'hunt', n: '猎首', ic: '💀', col: '#ffd060', tag: '处决 · 悬赏 · 收益',
      d: '猎首人流：标记、处决、斩首风暴。专打残血与精英，经验/魂晶收益最高。',
      nodes: [
        N('h_greed', '贪婪', '💰', 1, 0, 5, [], '击杀魂晶收益 +$coin%', { coin: 8 }),
        N('h_xp', '见识', '📖', 1, 1, 5, [], '经验收益 +$xp%', { xp: 6 }),
        A('h_mark', '猎杀标记', '🎯', 1, 2),
        N('h_neck', '斩首专家', '🔪', 2, 0, 3, ['h_greed'], '命中头 / 脖子：伤害 +$zone%', { zone: 15 }),
        A('h_exec', '处决令', '⚖️', 2, 1, ['h_mark']),
        N('h_loot', '战利品', '🎒', 2, 2, 3, ['h_xp'], '击杀有 $lootHeal% 概率掉出血肉：回复 15% 生命', { lootHeal: 4 }),
        A('h_bounty', '悬赏令', '📜', 3, 0, ['h_exec']),
        N('h_soul', '猎魂', '👻', 3, 1, 3, ['h_neck'], '击杀回复 $killMana 魂能', { killMana: 6 }),
        N('h_hunt', '猎物感知', '🧭', 3, 2, 3, ['h_loot'], '对精英 / 霸主伤害 +$elite%', { elite: 5 }),
        A('h_storm', '斩首风暴', '🪚', 4, 0, ['h_bounty']),
        N('h_chain', '连杀', '🔗', 4, 1, 3, ['h_soul'], '8 秒内每连杀 1 人：伤害 +$chain%（最多 5 层）', { chain: 3 }),
        N('h_master', '首级大师', '🏆', 5, 0, 1, ['h_chain'], '处决 / 斩首击杀：回复 20% 生命，所有技能冷却缩短 25%', { hmaster: 1 }),
        A('h_ult', '审判', '🔱', 5, 1, ['h_storm'], 2)
      ] }
  ];

  // ---------- 主动技能（cd 秒 / cost 魂能 / hp 生命代价 %）----------
  const SK = {
    dodge: { n: '闪身', ic: '💨', cd: 0.9, cost: 0, st: 22, kind: '位移', d: '向移动方向（不动则向后）翻滚 0.38 秒无敌；刚翻出的 0.22 秒内躲开攻击 = 完美闪避，敌人露出破绽。消耗 22 体力。', base: true },
    b_whirl: { n: '旋风斩', ic: '🌀', cd: 7, cost: 20, kind: '范围', d: '原地一圈斩击，半径 3.2 米，伤害 ×1.3，同时打破敌人格挡。扫的是脖子高度：敌人生命 ≤35% 时斩首。' },
    b_lunge: { n: '突刺', ic: '⚡', cd: 8, cost: 15, kind: '位移', d: '朝准星方向突进 7 米，穿过路径上的所有敌人，伤害 ×1.5，途中无敌。' },
    b_wave: { n: '剑气', ic: '🌊', cd: 6, cost: 20, kind: '远程', d: '射出一道穿透剑气，飞行 20 米，命中者伤害 ×1.6。' },
    b_flurry: { n: '百刃', ic: '⚔️', cd: 18, cost: 35, kind: '连斩', d: '2.2 秒内对最近敌人连续斩击 8 次，每次 ×0.7，无视格挡；最后一刀斩向脖子，敌人生命 ≤40% 时斩首。' },
    b_ult: { n: '万剑归宗', ic: '🌠', cd: 60, cost: 60, kind: '大招', d: '召来剑阵：5 次半径 5.5 米的斩击脉冲（×1.1），最后一击 ×2.2 并击飞。' },
    w_bash: { n: '盾击', ic: '🔰', cd: 9, cost: 18, kind: '控制', d: '正面 3.6 米扇形猛击，伤害 ×0.8，击退并眩晕 1.4 秒。' },
    w_will: { n: '钢铁意志', ic: '🗿', cd: 25, cost: 25, kind: '增益', d: '7 秒内受到的伤害 -40%，并获得相当于 15% 最大生命的护盾。' },
    w_quake: { n: '震地', ic: '🌋', cd: 14, cost: 30, kind: '控制', d: '重踏地面，半径 5 米，伤害 ×1.1，击退并眩晕 1.6 秒（霸主 0.6 秒）。' },
    w_ward: { n: '魂盾', ic: '🧿', cd: 20, cost: 25, kind: '增益', d: '10 秒护盾：吸收相当于 30% 最大生命（+魂力加成）的伤害。' },
    w_ult: { n: '战争堡垒', ic: '🏰', cd: 75, cost: 60, kind: '大招', d: '9 秒：受到的伤害 -60%，反弹 60% 伤害，每秒回复 2% 生命，并获得 20% 生命的护盾。' },
    s_step: { n: '影遁', ic: '🌫️', cd: 9, cost: 18, kind: '位移', d: '向移动方向位移 8 米，0.55 秒无敌；4 秒内下一击伤害 +60% 且必暴。' },
    s_blade: { n: '毒刃', ic: '☠️', cd: 18, cost: 20, kind: '增益', d: '14 秒内每次命中使目标中毒（5 秒，最多叠 5 层，每层每秒约 28% 命中伤害）。' },
    s_strike: { n: '绞杀', ic: '🥷', cd: 12, cost: 25, kind: '位移', d: '瞬移到准星附近敌人背后，立刻背刺，伤害 ×2.2（算背后）。' },
    s_cloud: { n: '毒雾', ic: '☁️', cd: 22, cost: 30, kind: '区域', d: '在准星处放出 4.5 米毒雾，持续 7 秒：范围内敌人中毒并减速 30%。' },
    s_ult: { n: '千影杀', ic: '🌌', cd: 60, cost: 55, kind: '大招', d: '锁定最多 5 名 14 米内的敌人，依次瞬移斩击（×1.8，必暴），最后回到原处。施法期间无敌。' },
    r_roar: { n: '战吼', ic: '📣', cd: 16, cost: 15, kind: '控制', d: '震慑 8 米内所有敌人（打断、硬直，普通敌人一半会逃跑），自身伤害 +15% 持续 6 秒。' },
    r_slam: { n: '血怒斩', ic: '🪓', cd: 7, cost: 12, hp: 6, kind: '攻击', d: '献祭 6% 最大生命，对正面 3.4 米扇形劈出 ×2.4 重击并使其流血。' },
    r_lust: { n: '血之狂热', ic: '😡', cd: 30, cost: 30, kind: '增益', d: '10 秒：伤害 +25%，移速 +15%，命中回血翻倍。' },
    r_charge: { n: '蛮牛冲撞', ic: '🐂', cd: 12, cost: 20, kind: '位移', d: '向前猛冲 9 米，撞飞路径上的敌人（×1.2，眩晕 0.9 秒）。' },
    r_ult: { n: '屠神血祭', ic: '👹', cd: 80, cost: 0, hp: 25, kind: '大招', d: '献祭 25% 当前生命，12 秒：伤害 +60%，命中回血 +2.5%，受到伤害 -15%。' },
    m_bolt: { n: '魂弹', ic: '🔹', cd: 0.9, cost: 9, kind: '法术', d: '射出一枚魂弹，伤害 ×1.3（受魂力、法术加成）。' },
    m_nova: { n: '魂爆', ic: '❄️', cd: 10, cost: 26, kind: '法术', d: '半径 5.5 米魂能爆发，伤害 ×1.0，敌人减速 45% 持续 3.5 秒。' },
    m_fire: { n: '魂焰', ic: '🔥', cd: 6, cost: 28, kind: '法术', d: '射出魂焰球，命中爆炸（半径 2.6 米，×1.8），并灼烧 4 秒。' },
    m_mark: { n: '死亡印记', ic: '🔻', cd: 15, cost: 15, kind: '增益', d: '标记准星目标 10 秒：它受到你所有伤害 +25%。' },
    m_chain: { n: '连锁闪电', ic: '⚡', cd: 8, cost: 30, kind: '法术', d: '闪电在最多 5 名敌人之间跳跃（7 米内），每跳 ×1.15。' },
    m_ult: { n: '魂陨', ic: '☄️', cd: 70, cost: 60, kind: '大招', d: '1.2 秒后陨星砸向准星位置：半径 6.5 米，×4.0，灼烧并眩晕 1 秒。地上红圈就是落点。' },
    h_mark: { n: '猎杀标记', ic: '🎯', cd: 12, cost: 12, kind: '增益', d: '标记准星目标 12 秒：它受到你的伤害 +20%，击杀时魂晶 / 经验翻倍。' },
    h_exec: { n: '处决令', ic: '⚖️', cd: 10, cost: 20, kind: '攻击', d: '对 6.5 米内最近敌人：生命低于 35%（霸主 15%）直接处决斩首，否则重击脖子 ×1.8（生命 ≤50% 时这一击也会斩首）。' },
    h_bounty: { n: '悬赏令', ic: '📜', cd: 40, cost: 25, kind: '增益', d: '15 秒：伤害 +15%，击杀魂晶 / 经验翻倍。' },
    h_storm: { n: '斩首风暴', ic: '🪚', cd: 25, cost: 40, kind: '范围', d: '0.9 秒内 3 次半径 4.2 米旋斩（×0.8），生命低于 25% 的普通敌人直接斩首。' },
    h_ult: { n: '审判', ic: '🔱', cd: 70, cost: 55, kind: '大招', d: '11 米内所有敌人被标记并受审：生命低于 50% 者 ×2.6，其余 ×1.3，并眩晕 1 秒。' }
  };

  // ---------- 推荐流派（一键按顺序加点，点数不够就加到哪算哪）----------
  const BUILDS = [
    { id: 'sword', n: '暴击剑圣', ic: '👑', sc: ['blade', 'shadow'], attr: { str: 2, agi: 3 }, d: '刃舞 + 影袭：高暴击、弹反必暴、连击叠加。重操作、高上限。',
      ord: ['b_crit', 'b_crit', 'b_edge', 'b_whirl', 'b_lunge', 'b_parry', 'b_crit', 'b_critd', 'b_critd', 'b_wave', 'b_flow', 'b_edge', 'b_combo', 'b_combo', 'b_flurry', 'b_haste', 'b_master', 's_dodge', 's_back', 's_step'] },
    { id: 'fort', n: '不死堡垒', ic: '🏰', sc: ['ward', 'rage'], attr: { con: 4, str: 1 }, d: '铁壁 + 狂血：厚血、减伤、荆棘、吸血，站桩对砍。新手首选。',
      ord: ['w_hp', 'w_armor', 'w_bash', 'w_hp', 'w_armor', 'w_thorns', 'w_guard', 'w_will', 'w_regen', 'w_quake', 'w_undy', 'w_bold', 'r_leech', 'r_leech', 'r_str', 'r_rage', 'w_ult'] },
    { id: 'mage', n: '魂焰法师', ic: '🔮', sc: ['soul'], attr: { soul: 4, con: 1 }, d: '魂术：魂弹清杂、魂焰灼烧、闪电链扫群、陨星收尾。拉开距离打。',
      ord: ['m_bolt', 'm_pool', 'm_focus', 'm_pool', 'm_focus', 'm_nova', 'm_pow', 'm_pow', 'm_fire', 'm_cdr', 'm_mark', 'm_siphon', 'm_chain', 'm_over', 'm_master', 'm_ult'] },
    { id: 'assn', n: '毒影刺客', ic: '🥷', sc: ['shadow', 'soul'], attr: { agi: 4, soul: 1 }, d: '影袭 + 魂术：影遁绕背、毒刃毒雾、魂弹补刀。靠走位吃伤害。',
      ord: ['s_step', 's_back', 's_back', 's_dodge', 's_blade', 's_bleed', 's_venom', 's_strike', 's_assn', 's_venom', 's_cloud', 's_lethal', 's_shade', 's_ult', 'm_bolt'] },
    { id: 'blood', n: '血战士', ic: '👹', sc: ['rage', 'hunt'], attr: { str: 3, con: 2 }, d: '狂血 + 猎首：吸血、残血爆发、击杀狂热，处决收头。赌命流。',
      ord: ['r_leech', 'r_str', 'r_roar', 'r_leech', 'r_rage', 'r_slam', 'r_kill', 'r_lust', 'r_wound', 'r_oath', 'r_charge', 'r_frenzy', 'h_mark', 'h_exec', 'r_ult'] },
    { id: 'head', n: '斩首官', ic: '💀', sc: ['hunt', 'blade'], attr: { str: 2, ter: 3 }, d: '猎首 + 刃舞：标记、处决、斩首风暴，经验魂晶收益拉满。适合刷图。',
      ord: ['h_mark', 'h_greed', 'h_xp', 'h_exec', 'h_neck', 'h_bounty', 'h_soul', 'h_hunt', 'h_storm', 'h_chain', 'h_master', 'b_whirl', 'b_crit', 'b_edge', 'h_ult'] }
  ];

  const ALL = {}; for (const s of SCHOOLS) for (const n of s.nodes) { n.school = s.id; ALL[n.id] = n; }
  const TIER_REQ = [0, 0, 4, 8, 12, 16]; // 第 t 层需要本系已投入的点数
  return { ATTR, SCHOOLS, SK, BUILDS, ALL, TIER_REQ };
})();
