// 第二十七轮：阶位系统（window.Ranks，MOD `ranks`）
// 用户：名字 / 魂阶（凡魂…神魂）始终显示、不需要回忆；“阶位”太少，而且不要只有一条单线——要有很多分支，和身份有关，也和稀有度有关。
// 结构：12 大系 × 每系 3 个流派 × 10 阶。1-3 阶是大系共用的入门阶；4-6 阶按流派分化；7-10 阶是流派的顶端头衔。
// 阶位由「身份 + 魂阶 + 名字哈希」确定性算出（不写存档，旧存档的头自动有阶位）：
//   身份 → 默认（大系, 流派）；同系另外两个流派有约 30% 概率（“同一身份走了别的路线”）。
//   魂阶 → 阶位区间：凡魂 1-3 / 灵魂 2-5 / 英魂 4-7 / 圣魂 6-9 / 神魂 8-10；区间内由哈希 + 年岁 + “比身份基础魂阶更高”修正。
(function () {
  const RC = ['#b8b8c0', '#4aa8ff', '#c05aff', '#ffb020', '#ff4a8a'];
  const TN = ['', '一阶', '二阶', '三阶', '四阶', '五阶', '六阶', '七阶', '八阶', '九阶', '十阶'];
  const TC = ['', '#9a9a9a', '#9a9a9a', '#a8b89a', '#7ab0e0', '#7ab0e0', '#b088e8', '#e8b050', '#e8b050', '#ff8a5a', '#ff5a8a']; // 阶位色
  const hash = s => { s = String(s); let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100003) / 100003; };

  // 大系：k, n 名, ic 图标, col 颜色, d 一句话, base = 1-3 阶；subs = 三个流派 {k,n,d, mid[3]=4-6 阶, top[4]=7-10 阶}
  const SYS = {
    war: { n: '战阵', ic: '⚔️', col: '#e07a6a', d: '以刀剑、盾阵与军令为生的人。', base: ['新兵', '卫士', '老兵'], subs: {
      shield: { n: '盾卫', d: '站在最前面，把身后的人留住。', mid: ['盾手', '铁壁卫', '城墙守'], top: ['百炼盾将', '圣盾骑士', '不落之壁', '永恒城垣'] },
      blade: { n: '剑士', d: '一把剑走到底，不信别的。', mid: ['剑客', '断刃者', '破阵锋'], top: ['剑术师范', '百战剑豪', '斩星剑圣', '无名剑神'] },
      command: { n: '统帅', d: '不用自己出手，战场就是她的剑。', mid: ['什长', '百夫长', '校尉'], top: ['参将', '将军', '元帅', '战争女主'] } } },
    hunt: { n: '狩猎', ic: '🏹', col: '#7ab86a', d: '荒野里的追踪者与射手。', base: ['学徒猎手', '斥候', '巡林者'], subs: {
      bow: { n: '弓手', d: '百步之外，一支箭就够。', mid: ['射手', '鹰眼', '穿杨者'], top: ['神射手', '月弓使', '贯星射手', '天狼之弓'] },
      trap: { n: '游猎', d: '陷阱、足迹、耐心。', mid: ['陷阱师', '追踪者', '暗林行者'], top: ['林间幽灵', '无痕猎人', '荒野之影', '野猎之主'] },
      beast: { n: '驭兽', d: '与鹰、狼、鹿同行。', mid: ['驯兽学徒', '驭兽师', '兽语者'], top: ['兽群之友', '鹰王', '百兽之语', '荒野母神'] } } },
    holy: { n: '圣职', ic: '✝️', col: '#f0e0a0', d: '信仰、祈祷与审判。', base: ['侍女', '见习', '修士'], subs: {
      nun: { n: '修行', d: '在回廊与经卷里磨一颗心。', mid: ['修女', '执事', '修道长'], top: ['圣堂守护', '大执事', '神圣导师', '圣座之侧'] },
      crusade: { n: '圣战', d: '把祈祷变成刃。', mid: ['护教骑士', '圣殿卫', '审判者'], top: ['圣殿骑士长', '裁决圣骑', '炽焰审判官', '神罚之手'] },
      miracle: { n: '神迹', d: '神明借她的嘴说话。', mid: ['祈祷者', '圣歌者', '施恩者'], top: ['圣乐领唱', '圣女候选', '神迹见证者', '神之代言'] } } },
    nature: { n: '自然', ic: '🌿', col: '#5ac88a', d: '森林、祖灵与月光的道路。', base: ['采集者', '林中人', '护林者'], subs: {
      druid: { n: '德鲁伊', d: '与树木共享一条根。', mid: ['新叶德鲁伊', '橡木德鲁伊', '兽形者'], top: ['古树贤者', '四季使', '世界树守护', '自然之怒'] },
      spirit: { n: '祖灵', d: '死者没有走远，只是换了说话的方式。', mid: ['灵语者', '祭舞者', '祖灵之子'], top: ['图腾长老', '灵魂摆渡', '万灵代言', '先祖回声'] },
      moon: { n: '月神', d: '月亮升起时才完整的人。', mid: ['月之侍', '月光祭司', '望月者'], top: ['月轮祭长', '银辉使', '月神之手', '月之化身'] } } },
    arcane: { n: '奥术', ic: '🔮', col: '#6aa0ff', d: '公式、药剂与契约。', base: ['学徒', '见习法师', '施术者'], subs: {
      court: { n: '宫廷法', d: '为王国写天气与烟火。', mid: ['法师', '星象官', '元素使'], top: ['宫廷法师', '大法师', '塔主', '星界贤者'] },
      alch: { n: '炼金', d: '世上没有废料，只有还没炼成的东西。', mid: ['药师', '炼金师', '毒理师'], top: ['大药剂师', '点金者', '贤者之石', '万物炼成者'] },
      pact: { n: '契术', d: '借别人的力量，付自己的代价。', mid: ['契约者', '召唤师', '缚灵者'], top: ['深契术士', '界门使', '万灵共鸣者', '位面主宰'] } } },
    shadow: { n: '咒影', ic: '🌑', col: '#a07ac8', d: '诅咒、暗杀与沼泽里的秘密。', base: ['暗处的人', '潜行者', '影行者'], subs: {
      curse: { n: '诅咒', d: '一根头发，一枚针，一个名字。', mid: ['咒术学徒', '诅咒师', '噬魂者'], top: ['黑弥撒司仪', '怨念织者', '万咒之母', '灾厄之主'] },
      kill: { n: '暗杀', d: '让人死得像是自己的主意。', mid: ['刀手', '暗刃', '夜行者'], top: ['无声之刃', '影舞者', '暗影之王', '虚无之手'] },
      hex: { n: '魔女', d: '大锅、扫帚与夜里的集会。', mid: ['见习魔女', '沼泽巫婆', '夜宴成员'], top: ['集会长老', '黑森林之主', '禁书守护', '魔女之母'] } } },
    craft: { n: '匠医', ic: '🔨', col: '#d8a860', d: '用手艺和胆量活下来的人。', base: ['帮工', '学徒', '匠人'], subs: {
      forge: { n: '锻造', d: '火、锤、铁——别的都不重要。', mid: ['铁匠', '兵匠', '符文匠'], top: ['大匠', '名匠', '炉火宗师', '神铸者'] },
      medic: { n: '医者', d: '先止血，再问名字。', mid: ['护士', '军医', '解剖师'], top: ['外科圣手', '白袍医师', '生死医者', '救赎之手'] },
      siege: { n: '工程', d: '机括、图纸与火油。', mid: ['技师', '工程师', '机关师'], top: ['攻城总师', '机械大师', '奇械宗师', '万象造物主'] } } },
    art: { n: '艺者', ic: '🎻', col: '#f0a0c8', d: '歌声、琴弦与故事。', base: ['街头艺人', '学徒乐手', '歌手'], subs: {
      bard: { n: '吟游', d: '把别人的一生唱成歌。', mid: ['吟游者', '说书人', '传唱者'], top: ['王廷诗人', '传奇歌者', '史诗诗人', '万世吟咏者'] },
      music: { n: '乐师', d: '手指比嘴诚实。', mid: ['乐手', '宫廷乐师', '演奏家'], top: ['首席乐师', '琴圣', '乐章之主', '天籁之手'] },
      choir: { n: '歌者', d: '声音是她最后的武器。', mid: ['合唱者', '领唱', '歌者'], top: ['圣歌长', '月下歌姬', '天籁歌者', '世界之歌'] } } },
    crown: { n: '王权', ic: '👑', col: '#ffd060', d: '宫廷、血统与王座。', base: ['侍女', '宫廷人', '贵女'], subs: {
      noble: { n: '贵胄', d: '生来就站在别人仰视的地方。', mid: ['世家之女', '伯爵之女', '侯爵千金'], top: ['公爵之女', '宫廷之花', '王储之选', '王国之星'] },
      guard: { n: '近卫', d: '命是王的，剑也是。', mid: ['宫廷侍卫', '近卫', '亲卫'], top: ['近卫队长', '王之剑', '王座之盾', '王权守护者'] },
      ruler: { n: '统治', d: '所有人的命运押在她一个人身上。', mid: ['公主', '摄政', '女爵'], top: ['女王候补', '女王', '女皇', '万王之王'] } } },
    abyss: { n: '深渊', ic: '🔥', col: '#ff6a5a', d: '裂隙另一边的居民。', base: ['小妖', '魅影', '深渊住民'], subs: {
      dream: { n: '织梦', d: '在别人的梦里收租。', mid: ['织梦者', '梦魇使', '摄魂者'], top: ['魅梦贵女', '梦境之主', '迷雾女王', '万梦之源'] },
      fall: { n: '堕落', d: '曾经有过翅膀。', mid: ['失翼者', '堕羽者', '黑焰使'], top: ['堕天使长', '黑焰圣剑', '深渊审判者', '堕落之光'] },
      lord: { n: '领主', d: '骸骨宫殿与不会说谎的契约。', mid: ['小恶魔统领', '骸骨官', '公爵夫人'], top: ['深渊公爵', '地狱侯爵', '深渊女王', '万魂之主'] } } },
    dragon: { n: '龙脉', ic: '🐉', col: '#ffa040', d: '龙的血、龙的敌人与龙的骑手。', base: ['龙裔幼体', '龙之后裔', '守巢者'], subs: {
      blood: { n: '龙裔', d: '血里烧着不属于人的东西。', mid: ['龙血者', '龙息使', '逆鳞者'], top: ['龙之公主', '龙血贵族', '龙王之血', '龙族共主'] },
      slayer: { n: '屠龙', d: '龙骨堆成她的椅子。', mid: ['猎龙人', '屠龙学徒', '龙骨收藏家'], top: ['屠龙者', '弑龙之剑', '龙骸之主', '终焉屠龙'] },
      rider: { n: '龙骑', d: '与龙同飞，或替龙说话。', mid: ['驭龙者', '龙骑士', '龙之巫女'], top: ['龙骑长', '龙语者', '龙神祭司', '龙神之代言'] } } },
    folk: { n: '民间', ic: '🌾', col: '#c8c098', d: '田垄、酒馆与屋檐下的人。', base: ['村人', '帮手', '熟手'], subs: {
      farm: { n: '田园', d: '日子是一茬一茬过的。', mid: ['农女', '牧女', '采药人'], top: ['村中能手', '乡里名医', '乡野智者', '地母之友'] },
      town: { n: '市井', d: '什么消息都会路过她的柜台。', mid: ['店员', '酒馆女侍', '跑腿'], top: ['店主', '行会会员', '城中名人', '市井传说'] },
      thief: { n: '盗贼', d: '今晚的月亮适合借点东西。', mid: ['扒手', '盗贼', '夜盗'], top: ['盗贼头目', '怪盗', '盗王', '无迹之手'] } } }
  };
  // 身份 → [大系, 默认流派]
  const MAP = {
    villager: ['folk', 'farm'], shepherd: ['folk', 'farm'], barmaid: ['folk', 'town'], smithgirl: ['craft', 'forge'], herbalist: ['folk', 'farm'], huntress: ['hunt', 'bow'], bard: ['art', 'bard'], novice: ['holy', 'nun'],
    ranger: ['hunt', 'trap'], druid: ['nature', 'druid'], singer: ['art', 'choir'], archer: ['hunt', 'bow'], moonpriest: ['nature', 'moon'], elfprincess: ['crown', 'noble'], wolfwarrior: ['war', 'blade'], foxmiko: ['nature', 'spirit'],
    catthief: ['folk', 'thief'], shaman: ['nature', 'spirit'], chieftess: ['crown', 'ruler'], falconer: ['hunt', 'beast'], nun: ['holy', 'nun'], paladin: ['holy', 'crusade'], choir: ['holy', 'miracle'], inquisitor: ['holy', 'crusade'],
    saint: ['holy', 'miracle'], abbess: ['holy', 'nun'], witch: ['shadow', 'hex'], alchemist: ['arcane', 'alch'], hexer: ['shadow', 'curse'], bogwitch: ['shadow', 'hex'], covenlady: ['shadow', 'hex'], countess: ['abyss', 'lord'],
    knight: ['war', 'shield'], merc: ['war', 'blade'], crossbow: ['hunt', 'bow'], medic: ['craft', 'medic'], engineer: ['craft', 'siege'], general: ['war', 'command'], dragonknight: ['dragon', 'rider'], princess: ['crown', 'noble'],
    lady: ['crown', 'noble'], courtmage: ['arcane', 'court'], assassin: ['shadow', 'kill'], guard: ['crown', 'guard'], musician: ['art', 'music'], queen: ['crown', 'ruler'], succubus: ['abyss', 'dream'], fallen: ['abyss', 'fall'],
    duchess: ['abyss', 'lord'], shadow: ['shadow', 'kill'], abyssqueen: ['abyss', 'lord'], dragonprincess: ['dragon', 'blood'], avatar: ['holy', 'miracle'], archangel: ['holy', 'crusade'], dragonslayer: ['dragon', 'slayer'], dragonmiko: ['dragon', 'rider']
  };
  const WIN = [[1, 3], [2, 5], [4, 7], [6, 9], [8, 10]]; // 魂阶 → 阶位区间
  // 晋升要求（显示在阶位谱里）：只是描述，不影响数值
  const REQ = ['', '出身', '磨练', '有了名气', '选定流派', '独当一面', '一方名宿', '远近闻名', '传说级', '名字被写进书里', '时代的顶点'];
  const cache = new WeakMap();
  const ladder = (sys, sub) => { const S = SYS[sys], B = S.subs[sub]; return [''].concat(S.base, B.mid, B.top); };
  function of(c) {
    if (!c) return null; let r = cache.get(c); if (r) return r;
    const m = MAP[c.id] || ['folk', 'farm'], seed = c.name + '|' + c.id, S0 = SYS[m[0]], keys = Object.keys(S0.subs);
    let sub = m[1]; if (hash(seed + '#b') < 0.3) { const o = keys.filter(k => k !== sub); sub = o[Math.floor(hash(seed + '#b2') * o.length)]; } // 同一身份走了别的路线
    const rar = Math.max(0, Math.min(4, c.rar | 0)), w = WIN[rar], base = (window.Lore && Lore.ID[c.id] || {}).r || 0;
    let t = w[0] + Math.floor(hash(seed + '#t') * (w[1] - w[0] + 1));
    if (rar > base) t += hash(seed + '#u') < 0.5 ? 1 : 0; // 比身份基础魂阶更高 → 更可能往上走一阶
    if ((c.age || 0) > 300) t += hash(seed + '#a') < 0.4 ? 1 : 0; // 长寿种族多半资历更老
    t = Math.max(w[0], Math.min(10, t)); if (rar === 4) t = Math.max(9, t);
    const L = ladder(m[0], sub), B = S0.subs[sub];
    r = { sys: m[0], sub, S: S0, B, tier: t, tn: TN[t], name: L[t], ladder: L, next: t < 10 ? L[t + 1] : '', col: TC[t], code: m[0] + '/' + sub, lo: w[0], hi: w[1], alt: keys.filter(k => k !== sub).map(k => S0.subs[k].n), branchNote: sub !== m[1] ? `本应走「${S0.subs[m[1]].n}」之路，她却转入了「${B.n}」。` : '' };
    cache.set(c, r); return r;
  }
  const on = () => !window.Mods || Mods.on('ranks') !== false;
  // 一行徽章（纯文本 / HTML）
  const text = c => { if (!on()) return ''; const r = of(c); return r ? `${r.S.n}·${r.B.n} ${r.tn}「${r.name}」` : ''; };
  const short = c => { if (!on()) return ''; const r = of(c); return r ? `${r.tn}·${r.name}` : ''; };
  const badge = c => { if (!on()) return ''; const r = of(c); return r ? `<span class="rk-b" style="--rk:${r.col};--sk:${r.S.col}" title="${r.S.n}系 · ${r.B.n}流派"><i>${r.S.ic}</i>${r.S.n}·${r.B.n}<b>${r.tn}</b>「${r.name}」</span>` : ''; };
  // 阶位谱（档案卡里常显）：十格阶梯 + 当前高亮 + 分支说明
  function ladderHTML(c) {
    if (!on()) return ''; const r = of(c); if (!r) return '';
    const cells = []; for (let i = 1; i <= 10; i++) { const cur = i === r.tier, lo = i >= r.lo && i <= r.hi, seg = i <= 3 ? '共通' : i <= 6 ? r.B.n : '顶端'; cells.push(`<div class="rk-c${cur ? ' cur' : ''}${i < r.tier ? ' past' : ''}${lo ? ' win' : ''}" style="--rk:${TC[i]}"><small>${TN[i]}</small><b>${r.ladder[i]}</b><em>${seg}</em></div>`); }
    return `<div class="rk-l"><div class="rk-h"><b style="color:${r.S.col}">${r.S.ic} ${r.S.n}系 · ${r.B.n}</b><span>${r.B.d}</span></div><div class="rk-row">${cells.join('')}</div>`
      + `<div class="rk-n">「${r.name}」${r.next ? ` → 下一阶「${r.next}」` : '（已是这条路的尽头）'} · 魂阶 ${(window.Lore && Lore.RAR ? Lore.RAR[c.rar] : '') || ''} 的人通常落在 ${r.lo}–${r.hi} 阶${r.branchNote ? ' · ' + r.branchNote : ''}<br>同系另有流派：${r.alt.join('、')}（身份相近的人可能走上这些路线）</div></div>`;
  }
  const CSS = '.rk-b{display:inline-block;padding:1px 8px;margin:2px 0;border:1px solid var(--rk);border-left:3px solid var(--sk);border-radius:3px;background:#0008;color:#eadfc9;font-size:12px;letter-spacing:.5px;white-space:nowrap}.rk-b i{font-style:normal;margin-right:4px}.rk-b b{color:var(--rk);margin-left:6px}'
    + '.rk-l{margin:10px 0;padding:10px 12px;border:1px solid #ffffff22;border-radius:6px;background:#0006}.rk-h{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:baseline;margin-bottom:8px}.rk-h span{opacity:.65;font-size:12px}'
    + '.rk-row{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}.rk-c{padding:4px 6px;border:1px solid #ffffff18;border-radius:4px;background:#0005;opacity:.5}.rk-c.win{opacity:.85}.rk-c.past{opacity:.7}.rk-c.cur{opacity:1;border-color:var(--rk);box-shadow:0 0 10px var(--rk);background:#2a1c10}'
    + '.rk-c small{display:block;color:var(--rk);font-size:10px}.rk-c b{display:block;font-size:12px;color:#eadfc9;font-weight:600}.rk-c em{display:block;font-size:9px;opacity:.5;font-style:normal}.rk-n{margin-top:8px;font-size:12px;opacity:.75;line-height:1.6}';
  function css() { if (document.getElementById('rk-css')) return; const s = document.createElement('style'); s.id = 'rk-css'; s.textContent = CSS; document.head.appendChild(s); }
  if (typeof document !== 'undefined') { if (document.head) css(); else addEventListener('DOMContentLoaded', css); }
  window.Ranks = { of, text, short, badge, ladderHTML, on, SYS, MAP, TN, TC, REQ, css };
})();
