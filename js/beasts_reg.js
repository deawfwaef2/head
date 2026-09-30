// R41（主管）：地区野怪（MOD region_beasts，默认开）——每个地区有自己的一套野生怪物，旧四兽也只在合适的地区出现。
// 模型：Quaternius「Ultimate Monsters」（CC0，见 beasts/LICENSE.txt），tools/beast_pack.py 精简成 beasts/m_*.js（base64 GLB，按需加载，file:// 可用）。
// 只往 Beasts.TYPES 里加条目；AI 复用 beasts.js 的四种：pack 群围 / hitrun 咬一口就跑 / charger 蓄力冲撞 / skittish 受惊逃跑。
// 关掉 MOD → Beasts.wOf 让所有带 reg 的类型权重为 0，回到旧的四兽。
(() => {
  if (!window.Beasts) return;
  const BIG = { Gallop: ['Run', 1], Attack: ['Punch', 1.15], Idle_HitReact1: ['HitReact', 1] };
  const BLOB = { Gallop: ['Walk', 2.0], Attack: ['Bite_Front', 1.1], Idle_HitReact1: ['HitRecieve', 1] };
  const FLY = { Idle: ['Flying_Idle', 1], Walk: ['Flying_Idle', 1.35], Gallop: ['Fast_Flying', 1], Attack: ['Headbutt', 1.15], Idle_HitReact1: ['HitReact', 1] };
  const W = [[1, 1, 1]], W2 = [[1, 1, 1], [0.85, 0.9, 1], [1, 0.92, 0.85]];
  // 字段同 beasts.js：h 身高(m) hp walk run dash ai dmg(占玩家最大血量) reach aggro r(碰撞半径) pack[min,max] w(基础权重) reg{地区:倍率} lay{布局:倍率} fly(悬停高度)
  const M = {
    // —— 雾溪村：家禽家畜成了精
    m_chick: { n: '咯咯团子', ico: '🐔', h: 0.72, hp: 16, walk: 1.5, run: 5.6, dash: 7, ai: 'skittish', dmg: 0.02, reach: 1.1, aggro: 10, r: 0.4, pack: [2, 4], w: 0.5, clips: BLOB, tints: W2, reg: { village: 1.4, capital: 0.2 },
      say: ['🐔 一群圆滚滚的咯咯团子，扑腾着翅膀四散逃开'], drops: [['meat', 1, 1, 0.9], ['cloth', 1, 1, 0.2], ['rm_straw', 1, 1, 0.35]] },
    m_bunny: { n: '胡萝卜兔', ico: '🐰', h: 1.25, hp: 30, walk: 1.6, run: 7.2, dash: 8, ai: 'skittish', dmg: 0.05, reach: 1.6, aggro: 12, r: 0.55, pack: [1, 1], w: 0.35, clips: BIG, tints: W, reg: { village: 1, forest: 0.8 },
      say: ['🐰 一只抱着胡萝卜的大兔子竖起了耳朵'], drops: [['hide', 1, 2, 0.8], ['meat', 1, 2, 0.8], ['herb', 1, 2, 0.5]] },
    m_dog: { n: '看门汪', ico: '🐶', h: 0.72, hp: 20, walk: 1.8, run: 6.8, dash: 10, ai: 'hitrun', dmg: 0.03, reach: 1.2, aggro: 13, r: 0.42, pack: [1, 2], w: 0.4, clips: BLOB, tints: W2, reg: { village: 1, fortress: 0.8 },
      say: ['🐶 看门汪冲你汪汪叫——它觉得你不是好人'], drops: [['hide', 1, 1, 0.7], ['fang', 1, 1, 0.5], ['bone', 1, 1, 0.3]] },
    // —— 翠影精灵林：蘑菇与蜂
    m_mushnub: { n: '蘑菇崽', ico: '🍄', h: 0.78, hp: 18, walk: 1.4, run: 5.4, dash: 9, ai: 'pack', dmg: 0.035, reach: 1.25, aggro: 13, r: 0.42, pack: [2, 4], w: 0.55, clips: BLOB, tints: W2, reg: { forest: 1.3, swamp: 0.4 },
      say: ['🍄 一圈蘑菇崽从草里探出头，齐刷刷地盯着你'], drops: [['herb', 1, 2, 0.9], ['dust', 1, 1, 0.3], ['rm_laurel', 1, 1, 0.3]] },
    m_mushking: { n: '蘑菇大王', ico: '👑', h: 1.8, hp: 95, walk: 1.3, run: 3.8, dash: 9, ai: 'charger', dmg: 0.12, reach: 2.0, aggro: 9, r: 0.9, pack: [1, 1], w: 0.12, clips: BIG, tints: W, reg: { forest: 1 }, cap: 9,
      say: ['👑 蘑菇大王抡起了它的小锤子——它不喜欢有人踩它的地盘'], drops: [['herb', 2, 4, 1], ['gem', 1, 1, 0.3], ['rm_firefly', 1, 1, 0.25], ['dust', 1, 2, 0.6]] },
    m_bee: { n: '铠甲蜂', ico: '🐝', h: 0.75, hp: 16, walk: 2, run: 7.5, dash: 11, ai: 'hitrun', dmg: 0.03, reach: 1.3, aggro: 14, r: 0.4, pack: [1, 3], w: 0.4, fly: 0.9, clips: FLY, tints: W, reg: { forest: 1, village: 0.5, wilds: 0.3 },
      say: ['🐝 嗡嗡——铠甲蜂的蜂巢就在附近'], drops: [['herb', 1, 1, 0.6], ['dust', 1, 1, 0.4], ['fang', 1, 1, 0.3]] },
    // —— 兽牙荒原：仙人掌与小恐龙
    m_cactoro: { n: '仙人掌汉', ico: '🌵', h: 1.75, hp: 85, walk: 1.2, run: 3.6, dash: 9.5, ai: 'charger', dmg: 0.13, reach: 1.9, aggro: 9, r: 0.85, pack: [1, 1], w: 0.25, clips: BIG, tints: W, reg: { wilds: 1.2 },
      say: ['🌵 戴草帽的仙人掌汉扶了扶帽檐，刨起了沙子'], drops: [['wood', 1, 3, 0.9], ['herb', 1, 2, 0.6], ['rm_mane', 1, 1, 0.3], ['fang', 1, 1, 0.3]] },
    m_bcact: { n: '仙人球', ico: '🌵', h: 0.8, hp: 18, walk: 1.4, run: 5, dash: 9, ai: 'pack', dmg: 0.035, reach: 1.2, aggro: 12, r: 0.42, pack: [2, 3], w: 0.35, clips: BLOB, tints: W, reg: { wilds: 1 },
      say: ['🌵 几颗仙人球在沙地上蹦跶，刺都竖起来了'], drops: [['wood', 1, 1, 0.8], ['herb', 1, 1, 0.5]] },
    m_dino: { n: '小霸王龙', ico: '🦖', h: 1.6, hp: 70, walk: 1.6, run: 5, dash: 10, ai: 'charger', dmg: 0.11, reach: 1.9, aggro: 11, r: 0.8, pack: [1, 1], w: 0.25, clips: BIG, tints: W2, reg: { wilds: 1, swamp: 0.3 },
      say: ['🦖 小霸王龙张开嘴——里面只有两颗牙，但它很认真'], drops: [['hide', 2, 3, 0.9], ['meat', 2, 3, 0.9], ['fang', 1, 2, 0.6], ['rm_totem', 1, 1, 0.12]] },
    m_alpa: { n: '飞天羊驼', ico: '🦙', h: 0.8, hp: 22, walk: 1.8, run: 7, dash: 10, ai: 'hitrun', dmg: 0.035, reach: 1.3, aggro: 13, r: 0.45, pack: [1, 2], w: 0.3, fly: 1.0, clips: FLY, tints: W, reg: { wilds: 1, peak: 0.5 },
      say: ['🦙 一只长着翅膀的羊驼从头顶掠过——它朝你吐了口水'], drops: [['cloth', 1, 2, 0.8], ['hide', 1, 1, 0.5]] },
    // —— 白银修道院：幽灵与小法师
    m_ghost: { n: '被单幽灵', ico: '👻', h: 1.3, hp: 26, walk: 1.5, run: 6, dash: 10, ai: 'hitrun', dmg: 0.04, reach: 1.4, aggro: 14, r: 0.5, pack: [1, 3], w: 0.5, fly: 0.35, clips: FLY, tints: W, reg: { abbey: 1.3, abyss: 0.4, capital: 0.2 },
      say: ['👻 呜——被单幽灵从墓碑后面飘了出来'], drops: [['cloth', 1, 2, 0.9], ['dust', 1, 2, 0.6], ['rm_holy', 1, 1, 0.3]] },
    m_wizard: { n: '尖帽小法师', ico: '🧙', h: 0.85, hp: 22, walk: 1.4, run: 5.2, dash: 9, ai: 'pack', dmg: 0.04, reach: 1.3, aggro: 13, r: 0.45, pack: [2, 3], w: 0.4, clips: BLOB, tints: W, reg: { abbey: 1, swamp: 0.6 },
      say: ['🧙 一群尖帽小法师围成一圈念念有词'], drops: [['dust', 1, 2, 0.9], ['cloth', 1, 1, 0.5], ['gem', 1, 1, 0.08]] },
    m_hywirl: { n: '旋风灵', ico: '🌀', h: 1.1, hp: 24, walk: 1.8, run: 7, dash: 11, ai: 'hitrun', dmg: 0.04, reach: 1.4, aggro: 14, r: 0.45, pack: [1, 2], w: 0.3, fly: 0.7, clips: FLY, tints: W, reg: { abbey: 0.8, peak: 0.6 },
      say: ['🌀 风里有个紫色的小东西在转圈'], drops: [['dust', 1, 2, 0.8], ['gem', 1, 1, 0.1]] },
    m_pigeon: { n: '胖鸽子', ico: '🕊️', h: 0.7, hp: 14, walk: 1.4, run: 5.4, dash: 7, ai: 'skittish', dmg: 0.02, reach: 1.1, aggro: 9, r: 0.38, pack: [2, 4], w: 0.4, clips: BLOB, tints: W2, reg: { capital: 1.2, abbey: 0.6, village: 0.2 },
      say: ['🕊️ 广场上的胖鸽子们歪着头看你'], drops: [['meat', 1, 1, 0.8], ['cloth', 1, 1, 0.2]] },
    // —— 黑沼魔女泽：史莱姆、蛙与水母
    m_frog: { n: '沼泽蛙王', ico: '🐸', h: 1.35, hp: 70, walk: 1.3, run: 4.6, dash: 10, ai: 'charger', dmg: 0.11, reach: 1.8, aggro: 10, r: 0.75, pack: [1, 1], w: 0.3, clips: BIG, tints: W2, reg: { swamp: 1.2 }, lay: { lake: 2 },
      say: ['🐸 呱！沼泽蛙王鼓起了腮帮子'], drops: [['hide', 1, 2, 0.8], ['meat', 1, 2, 0.8], ['rm_toad', 1, 1, 0.15], ['rm_mud', 1, 2, 0.5]] },
    m_gblob: { n: '绿泡泡', ico: '🟢', h: 0.7, hp: 16, walk: 1.3, run: 5, dash: 9, ai: 'pack', dmg: 0.03, reach: 1.2, aggro: 12, r: 0.42, pack: [2, 4], w: 0.45, clips: BLOB, tints: W, reg: { swamp: 1.2, forest: 0.2 },
      say: ['🟢 一滩绿泡泡咕嘟咕嘟地朝你挪过来'], drops: [['rm_mud', 1, 1, 0.6], ['herb', 1, 1, 0.4], ['dust', 1, 1, 0.2]] },
    m_pblob: { n: '粉泡泡', ico: '🩷', h: 0.72, hp: 16, walk: 1.3, run: 5, dash: 9, ai: 'hitrun', dmg: 0.03, reach: 1.2, aggro: 12, r: 0.42, pack: [1, 3], w: 0.35, clips: BLOB, tints: W, reg: { swamp: 1, capital: 0.2 },
      say: ['🩷 粉泡泡弹起来想咬你一口'], drops: [['rm_mud', 1, 1, 0.5], ['dust', 1, 1, 0.4]] },
    m_spiky: { n: '刺刺泡泡', ico: '🦔', h: 0.9, hp: 26, walk: 1.2, run: 4.6, dash: 9, ai: 'pack', dmg: 0.045, reach: 1.3, aggro: 11, r: 0.5, pack: [1, 2], w: 0.25, clips: BLOB, tints: W, reg: { swamp: 1, abyss: 0.3 },
      say: ['🦔 刺刺泡泡把刺全立起来了——别踩它'], drops: [['fang', 1, 2, 0.7], ['rm_mud', 1, 1, 0.4]] },
    m_glub: { n: '泡眼水母', ico: '🎐', h: 0.9, hp: 18, walk: 1.5, run: 6, dash: 10, ai: 'hitrun', dmg: 0.035, reach: 1.3, aggro: 13, r: 0.45, pack: [1, 2], w: 0.3, fly: 0.8, clips: FLY, tints: W, reg: { swamp: 1 }, lay: { lake: 1.8 },
      say: ['🎐 一只泡眼水母在瘴气里漂浮'], drops: [['herb', 1, 1, 0.6], ['dust', 1, 1, 0.4]] },
    // —— 铁盔要塞：兽人与石像鬼
    m_orc: { n: '兽人大块头', ico: '👹', h: 1.9, hp: 100, walk: 1.4, run: 4.2, dash: 9.5, ai: 'charger', dmg: 0.13, reach: 2.0, aggro: 10, r: 0.9, pack: [1, 1], w: 0.35, clips: BIG, tints: W, reg: { fortress: 1.2, wilds: 0.3 },
      say: ['👹 兽人大块头捶了捶胸口，朝你冲过来'], drops: [['iron', 1, 2, 0.8], ['hide', 1, 2, 0.6], ['rm_steel', 1, 1, 0.35], ['bone', 1, 1, 0.4]] },
    m_orcskull: { n: '骷髅盔兽人', ico: '💀', h: 1.95, hp: 115, walk: 1.4, run: 4.2, dash: 10, ai: 'charger', dmg: 0.14, reach: 2.0, aggro: 10, r: 0.9, pack: [1, 1], w: 0.25, clips: BIG, tints: W, reg: { fortress: 0.8, abyss: 0.7 }, cap: 9,
      say: ['💀 戴骷髅盔的兽人低吼一声——那顶头盔是它最得意的收藏'], drops: [['iron', 1, 2, 0.8], ['bone', 1, 3, 0.8], ['rm_powder', 1, 1, 0.1]] },
    m_gole: { n: '小石像鬼', ico: '🗿', h: 0.8, hp: 26, walk: 1.6, run: 6.5, dash: 10, ai: 'pack', dmg: 0.04, reach: 1.3, aggro: 13, r: 0.45, pack: [2, 3], w: 0.35, fly: 1.0, clips: FLY, tints: W, reg: { fortress: 1, capital: 0.5, abbey: 0.3 },
      say: ['🗿 城垛上的小石像鬼扑棱着翅膀活了过来'], drops: [['iron', 1, 1, 0.5], ['dust', 1, 1, 0.5], ['gem', 1, 1, 0.06]] },
    // —— 金冠王都：猫、忍者与鸽子
    m_cat: { n: '虎斑猫球', ico: '🐱', h: 0.72, hp: 18, walk: 1.8, run: 7, dash: 11, ai: 'hitrun', dmg: 0.03, reach: 1.2, aggro: 12, r: 0.42, pack: [1, 2], w: 0.45, clips: BLOB, tints: W2, reg: { capital: 1.2, village: 0.3 },
      say: ['🐱 虎斑猫球眯着眼睛打量你的钱袋'], drops: [['hide', 1, 1, 0.6], ['rm_silk', 1, 1, 0.3], ['cloth', 1, 1, 0.3]] },
    m_ninja: { n: '蒙面小忍', ico: '🥷', h: 0.85, hp: 24, walk: 2, run: 7.5, dash: 12, ai: 'hitrun', dmg: 0.045, reach: 1.3, aggro: 14, r: 0.45, pack: [1, 3], w: 0.35, clips: BLOB, tints: W, reg: { capital: 1, fortress: 0.3 },
      say: ['🥷 屋檐上有个蒙面小忍——被你发现了，它很尴尬'], drops: [['cloth', 1, 2, 0.7], ['iron', 1, 1, 0.3], ['rm_gold', 1, 1, 0.05]] },
    // —— 深渊裂隙：小恶魔与龙崽
    m_demon: { n: '三叉戟魔', ico: '😈', h: 1.8, hp: 110, walk: 1.5, run: 4.6, dash: 10.5, ai: 'charger', dmg: 0.14, reach: 2.1, aggro: 10, r: 0.85, pack: [1, 1], w: 0.35, clips: BIG, tints: W, reg: { abyss: 1.2 }, cap: 9,
      say: ['😈 三叉戟魔把叉子往地上一顿，火星四溅'], drops: [['bone', 1, 2, 0.6], ['gem', 1, 1, 0.3], ['rm_obsid', 1, 2, 0.5], ['rm_core', 1, 1, 0.08]] },
    m_imp: { n: '蝠翼小魔', ico: '🦇', h: 0.8, hp: 22, walk: 1.8, run: 7, dash: 11, ai: 'pack', dmg: 0.04, reach: 1.3, aggro: 14, r: 0.42, pack: [2, 3], w: 0.45, fly: 1.1, clips: FLY, tints: W, reg: { abyss: 1.2, fortress: 0.2 },
      say: ['🦇 一群蝠翼小魔在裂隙上空盘旋，咯咯直笑'], drops: [['fang', 1, 1, 0.6], ['rm_obsid', 1, 1, 0.4], ['dust', 1, 1, 0.4]] },
    m_drake: { n: '橙龙崽', ico: '🐲', h: 0.8, hp: 28, walk: 1.8, run: 7, dash: 11, ai: 'hitrun', dmg: 0.045, reach: 1.4, aggro: 14, r: 0.45, pack: [1, 2], w: 0.3, fly: 1.0, clips: FLY, tints: W, reg: { abyss: 0.7, peak: 0.8 },
      say: ['🐲 一只橙色的龙崽喷出一小口烟——还没学会喷火'], drops: [['hide', 1, 1, 0.6], ['rm_scale', 1, 1, 0.3], ['fang', 1, 1, 0.4]] },
    // —— 龙骨圣山：雪人与龙
    m_yeti: { n: '大雪人', ico: '🦍', h: 1.9, hp: 120, walk: 1.3, run: 4.2, dash: 10, ai: 'charger', dmg: 0.14, reach: 2.0, aggro: 10, r: 0.9, pack: [1, 1], w: 0.35, clips: BIG, tints: W, reg: { peak: 1.2 }, cap: 9,
      say: ['🦍 大雪人拍掉身上的雪，冲你大吼了一声'], drops: [['hide', 2, 3, 0.9], ['meat', 1, 2, 0.8], ['rm_frost', 1, 1, 0.12], ['bone', 1, 1, 0.4]] },
    m_byeti: { n: '雪团子', ico: '⛄', h: 0.8, hp: 22, walk: 1.4, run: 5.4, dash: 9.5, ai: 'pack', dmg: 0.04, reach: 1.25, aggro: 13, r: 0.44, pack: [2, 4], w: 0.45, clips: BLOB, tints: W, reg: { peak: 1.2 },
      say: ['⛄ 雪地里滚出来一群雪团子'], drops: [['hide', 1, 1, 0.6], ['rm_frost', 1, 1, 0.05], ['meat', 1, 1, 0.5]] },
    m_dragon: { n: '冠羽飞龙', ico: '🐉', h: 1.5, hp: 90, walk: 1.8, run: 6.5, dash: 11, ai: 'hitrun', dmg: 0.1, reach: 1.9, aggro: 14, r: 0.75, pack: [1, 1], w: 0.12, fly: 1.3, clips: FLY, tints: W, reg: { peak: 1 }, cap: 9, cost: 2,
      say: ['🐉 冠羽飞龙从云里俯冲下来！'], drops: [['rm_scale', 1, 3, 0.9], ['gem', 1, 1, 0.35], ['horn', 1, 1, 0.5], ['rm_frost', 1, 1, 0.15]] }
  };
  for (const k in M) Beasts.TYPES[k] = Object.assign({ file: k, reg: {} }, M[k]);
})();
