// 外出探索 · 第一人称沿路前进（第十轮）
// 取代“点击 60 次”的文字旅途：地区 3D 世界（ExWorld）+ 路上真实站着的角色（真实头模 + 程序身体）+ 对话/抉择 + BOSS 决斗。
// 结果仍来自 RPG.expedition 预先算好的 beats（平衡不变），玩家的选择（放过/偷袭/交谈）在其上修正。
window.Explore = (() => {
  const V3 = THREE.Vector3;
  const L = 210;                       // 路长（米）
  const EYE = 2.25;                    // 食人魔视线高度
  const RC = ['#b8b8b8', '#6ad06a', '#5aa0ff', '#c070ff', '#ffb030'], RN = ['凡魂', '灵魂', '英魂', '圣魂', '神魂'];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  // ================= 地区 BOSS =================
  const BOSSES = {
    village: { n: '玛蒂尔达', title: '麦田魔女', race: 'human', id: 'herbalist', traits: ['狡黠', '高傲'], belief: '丰收女神德米拉', goal: '让雾溪村永远属于她一个人', pow: 2.0, col: '#d8a840',
      look: { hn: '麦金', hc1: '#f0c860', hc2: '#b07a28', en: '琥珀', ec1: '#f0a020', ec2: '#ffe070', acc: ['tiara'] },
      intro: '麦穗在无风的空气里沙沙作响。一个金发女人从田埂间站起身，裙摆上沾着新鲜的泥土。村里人从不提她的名字，只在收成前往田边放一碗牛奶。', say: '又一个闯进我麦田的客人。你知道，稻草人都是怎么做出来的吗？',
      taunt: ['收成的季节到了。', '你的影子，看起来很适合站在田里。', '别踩坏我的麦子。'], hurt: ['……有点意思。', '你弄脏了我的裙子。'], win: '回去吧，食人魔。等你的头够分量了，再来。', lose: '……麦子……会记得我的。',
      story: '雾溪村的麦田魔女。三十年来，村子的每一次丰收都要向她献上一样东西。她死后，那一年的麦子第一次在无风的日子里静止了。' },
    forest: { n: '希瑟莉亚', title: '翠影女王', race: 'elf', id: 'elfprincess', traits: ['高傲', '冷静'], belief: '世界树', goal: '让森林重新覆盖整个大陆', pow: 2.1, col: '#40b070',
      look: { hn: '翡翠', hc1: '#6ae09a', hc2: '#1a7a4a', en: '月银', ec1: '#c8e8ff', ec2: '#ffffff', acc: ['crown'], feat: 'elf' },
      intro: '古树们同时低下了枝条，萤火虫在空中排成一道拱门。拱门下走出一位戴着藤冠的精灵女王，她的脚步不在落叶上留下任何声音。', say: '三百年来，没有一头食人魔敢走进这片林子。你是第一个——也会是最后一个。',
      taunt: ['树在看着你。', '你的脚步太吵了。', '森林不会原谅你。'], hurt: ['……你伤到了我？', '有趣的野兽。'], win: '回去吧。森林饶你一次。', lose: '……让我……回到树根里去……',
      story: '翠影精灵林的女王，世界树的守护者。据说她活了七百年，从未离开过森林的边界。' },
    wilds: { n: '加尔莎', title: '裂牙女酋', race: 'beast', id: 'chieftess', traits: ['好战', '坚韧'], belief: '狼祖', goal: '统一荒原上所有的部落', pow: 2.1, col: '#c8783a',
      look: { hn: '银灰', hc1: '#c0c0c8', hc2: '#5a5a66', en: '血红', ec1: '#e03030', ec2: '#ff9a5a', feat: 'beast', paint: 1, paintC: '#c02a2a' },
      intro: '战鼓声从四面八方响起。图腾之间，一名银发的兽人女酋长扛着巨斧走了出来，脸上涂着鲜红的战纹。她身后，整个部落都在嚎叫。', say: '食人魔！我的斧头已经很久没喝过像样的血了。来，让我看看你有多硬！',
      taunt: ['再来！', '就这点力气？', '狼祖在看着！'], hurt: ['哈！痛快！', '好一击！'], win: '滚吧，下次多吃点肉再来！', lose: '哈……好……好一刀……狼祖……我来了……',
      story: '兽牙荒原上最强大的女酋长，一人击败过十二个部落的勇士。她的战吼据说能让野狼夹起尾巴。' },
    abbey: { n: '塞拉菲娜', title: '白银圣女', race: 'angel', id: 'saint', traits: ['虔诚', '偏执'], belief: '圣光教会', goal: '净化世上一切邪物', pow: 2.2, col: '#e0e4ff',
      look: { hn: '白银', hc1: '#f4f4fa', hc2: '#b8c0e0', en: '圣金', ec1: '#f0c040', ec2: '#fff4b0', feat: 'halo', acc: ['tiara'] },
      intro: '钟楼的钟在没有人敲的情况下响了。圣光从云层中落下，一个银发少女从光柱里缓缓降落，脚尖在离地三寸的地方停住。', say: '邪物。我为你祈祷了七天七夜。现在，就让我亲手送你去该去的地方。',
      taunt: ['跪下。', '光会找到你。', '你的罪太重了。'], hurt: ['……这不可能。', '神啊，请赐我力量。'], win: '回去忏悔吧。下一次，光不会再留情。', lose: '……神啊……这也是……您的旨意吗……',
      story: '白银修道院的圣女，据说是圣光教会百年一遇的神选者。她亲手净化过的“邪物”，比整座修道院的墓碑还多。' },
    swamp: { n: '莫甘娜', title: '黑沼之母', race: 'vampire', id: 'covenlady', traits: ['腹黑', '冷酷'], belief: '混沌', goal: '让永夜降临', pow: 2.2, col: '#8a4ac0',
      look: { hn: '墨紫', hc1: '#5a3a80', hc2: '#1a0a2a', en: '毒绿', ec1: '#70ff50', ec2: '#d0ff90', acc: ['witchhat'] },
      intro: '沼泽里所有的鬼火同时熄灭了。黑暗中，一口大锅咕嘟作响，一个戴着尖帽的女人正用长柄勺慢慢搅着锅里的东西。她没有回头。', say: '你来得正好，锅里还缺一味料。食人魔的心……应该很耐煮吧？',
      taunt: ['嘻嘻……', '沼泽在饿着肚子呢。', '你闻到了吗？那是你的恐惧。'], hurt: ['……你这粗鲁的东西。', '我的锅！'], win: '爬回去吧，小虫子。我改天再来收你。', lose: '……锅……要煮干了……',
      story: '黑沼魔女泽所有魔女的“母亲”。她的大锅已经煮了三百年，没有人知道里面到底是什么。' },
    fortress: { n: '布伦希尔德', title: '铁盔女元帅', race: 'human', id: 'general', traits: ['严谨', '勇敢'], belief: '战神', goal: '守住铁盔要塞，直到最后一人', pow: 2.2, col: '#a8b0c0',
      look: { hn: '赤铜', hc1: '#d0602a', hc2: '#8a3418', en: '钢灰', ec1: '#8a9ab0', ec2: '#e0e8f0' },
      intro: '城墙上的号角吹响了三声长音。要塞大门缓缓打开，一名红发女将独自走出，身后的士兵们整齐地用矛杆敲打盾牌。', say: '食人魔格罗克。我读过关于你的每一份战报。今天，我们来写最后一份。',
      taunt: ['阵型！', '你的破绽，我全都看见了。', '要塞从未陷落。'], hurt: ['……记下了。', '有两下子。'], win: '撤回去吧。要塞不追穷寇。', lose: '……要塞……交给你们了……',
      story: '铁盔要塞的女元帅，十九岁起就站在城墙上。她指挥的守城战从无败绩——直到今天。' },
    capital: { n: '伊莎贝拉', title: '金冠女王', race: 'human', id: 'queen', traits: ['高傲', '野心勃勃'], belief: '秩序之神', goal: '让整个大陆跪在她的王座前', pow: 2.3, col: '#f0c040',
      look: { hn: '白金', hc1: '#fcecb8', hc2: '#e0b860', en: '蓝宝石', ec1: '#2a5ad8', ec2: '#90b8ff', acc: ['crown'] },
      intro: '王都的钟声齐鸣，玫瑰花瓣从每一扇窗户洒落。广场尽头，金冠女王坐在临时搭起的王座上，手指轻轻敲着扶手，像是在看一场早就安排好的戏。', say: '我的臣民说，有一头食人魔在王都外面收集人头。真巧——我也喜欢收集东西。比如，王冠。',
      taunt: ['跪下。', '这是我的王都。', '你连做我的狗都不配。'], hurt: ['……放肆！', '卫兵？……不，我自己来。'], win: '滚出我的王都。', lose: '……王冠……不要让它……掉在地上……',
      story: '金冠王都的女王。她十五岁登基，二十岁时已经让三个王国的国王跪在她的王座前。' },
    abyss: { n: '莉莉丝', title: '深渊女王', race: 'demon', id: 'abyssqueen', traits: ['残忍', '自恋'], belief: '深渊之主', goal: '让深渊吞没地表', pow: 2.4, col: '#ff4a2a',
      look: { hn: '血红', hc1: '#d01a2a', hc2: '#4a0610', en: '熔金', ec1: '#ffb020', ec2: '#ff4a10', feat: 'horn', acc: ['crown'] },
      intro: '岩浆河倒流了。裂谷深处升起一座黑曜石王座，王座上的恶魔女王伸了个懒腰，蝙蝠般的翅膀在身后展开，遮住了半边天空。', say: '一头食人魔，走到了深渊的最底层？……可爱。我决定了，你的头要放在我王座的扶手上。',
      taunt: ['跳舞吧。', '再挣扎一点，我喜欢。', '深渊在叫你的名字。'], hurt: ['……你竟敢。', '哈……有意思。'], win: '爬回地面去吧，我会想你的。', lose: '……深渊……永远……在这里……等你……',
      story: '深渊裂隙的女王，所有恶魔的主人。传说她曾经是一位天使，因为太爱自己而坠落。' },
    peak: { n: '奥瑞莉娅', title: '龙骨圣母', race: 'dragon', id: 'dragonmiko', traits: ['冷静', '高傲'], belief: '古龙之魂', goal: '唤醒沉睡在山巅的古龙', pow: 2.5, col: '#a0d8ff',
      look: { hn: '霜白', hc1: '#eef4ff', hc2: '#90b0e0', en: '龙金', ec1: '#f0c020', ec2: '#fff090', feat: 'horn2', acc: ['tiara'] },
      intro: '风停了，云海静止。巨龙的肋骨之间站着一位白发巫女，她的影子不是人形，而是一条盘绕的巨龙。她睁开眼睛时，整座山都在颤抖。', say: '千年来登上这里的人，没有一个活着下山。你的头骨，会和它们放在一起。',
      taunt: ['龙在看着。', '渺小。', '这座山记得每一个挑战者。'], hurt: ['……', '龙鳞……裂了？'], win: '下山去吧。山不留你。', lose: '……古龙啊……原谅我……',
      story: '龙骨圣山之巅的巫女，古龙血脉最后的继承者。她守护着山顶的龙骨，直到它重新苏醒的那一天。' }
  };
  // ================= 服装 =================
  const OUT = {
    villager: ['dress', '#8a6a4a', '#e8dcc0', { apron: '#efe6d0' }], shepherd: ['dress', '#6a7a4a', '#e0d0a0', { cape: '#7a5a3a', staff: 1 }], barmaid: ['dress', '#8a2a2a', '#f0e6d8', { apron: '#f4efe4' }], smithgirl: ['work', '#5a4a3a', '#b08a50', { apron: '#3a2a1a', hammer: 1 }],
    herbalist: ['dress', '#4a6a3a', '#d8c89a', { basket: 1 }], huntress: ['leather', '#5a4028', '#8a6a40', { cape: '#3a4a2a', bow: 1 }], bard: ['dress', '#6a3a7a', '#e8c060', { cape: '#3a2a5a', lute: 1 }], novice: ['robe', '#2a2a34', '#e8e8f0', {}],
    ranger: ['leather', '#3a5a34', '#c0a060', { cape: '#2a4028', bow: 1 }], druid: ['robe', '#4a6a34', '#c8b070', { staff: 1 }], singer: ['dress', '#5a8a6a', '#f0f0d0', {}], archer: ['leather', '#4a6a3a', '#d0c080', { bow: 1 }], moonpriest: ['robe', '#d8dcef', '#9ab0e8', { staff: 1 }], elfprincess: ['gown', '#e0f0e0', '#e8d070', {}],
    wolfwarrior: ['armor', '#5a4a3a', '#a08a60', { fur: 1, sword: 1 }], foxmiko: ['robe', '#f4f0ea', '#c0302a', { hakama: '#b02a2a', tail: '#e8a060' }], catthief: ['leather', '#2a2a30', '#a04a3a', { dagger: 1, tail: '#3a3a40' }], shaman: ['robe', '#7a5a3a', '#d0a040', { fur: 1, staff: 1 }], chieftess: ['armor', '#6a4a2a', '#d0a040', { fur: 1, cape: '#6a1a1a', axe: 1 }], falconer: ['leather', '#6a5030', '#c0a070', {}],
    nun: ['robe', '#1e1e28', '#f0f0f4', {}], paladin: ['armor', '#c8ccd8', '#e0b850', { cape: '#e8e4f0', sword: 1 }], choir: ['robe', '#e8e4f0', '#d0a040', {}], inquisitor: ['armor', '#3a3a44', '#b02a2a', { cape: '#7a1a1a', sword: 1 }], saint: ['gown', '#f4f2fa', '#f0d070', { staff: 1 }], abbess: ['robe', '#2a2a3a', '#d8c070', { cape: '#4a3a6a', staff: 1 }],
    witch: ['robe', '#3a2a4a', '#9a6ad0', { staff: 1 }], alchemist: ['work', '#5a4a6a', '#c0a060', { apron: '#8a7a5a', flask: 1 }], hexer: ['robe', '#2a1a2a', '#8a2a6a', { staff: 1 }], bogwitch: ['robe', '#3a4a2a', '#8a9a4a', { staff: 1 }], covenlady: ['gown', '#2a1a3a', '#c060d0', { cape: '#1a0a2a', staff: 1 }], countess: ['gown', '#3a0a14', '#c0a0a0', { cape: '#1a0508', wings: 'bat' }],
    knight: ['armor', '#9aa0ac', '#3a5aa0', { cape: '#2a4a8a', sword: 1 }], merc: ['armor', '#6a5a4a', '#8a2a2a', { sword: 1 }], crossbow: ['leather', '#5a5040', '#8a8a80', { bow: 1 }], medic: ['robe', '#e8e4dc', '#b02a2a', { flask: 1 }], engineer: ['work', '#6a5a3a', '#c09040', { apron: '#4a3a2a', hammer: 1 }], general: ['armor', '#8a8e98', '#d0a040', { cape: '#8a1a1a', sword: 1 }], dragonknight: ['armor', '#4a2a2a', '#d0a040', { cape: '#2a0a0a', sword: 1, tail: '#6a2a2a' }],
    princess: ['gown', '#f0b8d0', '#f0d070', {}], lady: ['gown', '#8ab0e0', '#f0f0f0', {}], courtmage: ['robe', '#2a3a7a', '#e0c060', { staff: 1 }], assassin: ['leather', '#1a1a22', '#6a1a2a', { dagger: 1 }], guard: ['armor', '#b0b4c0', '#c02a3a', { cape: '#8a1a2a', sword: 1 }], musician: ['dress', '#a04a5a', '#f0e0b0', { lute: 1 }], queen: ['gown', '#6a1a3a', '#f0d070', { cape: '#a01a2a', staff: 1 }],
    succubus: ['dress', '#2a0a1a', '#c02a5a', { wings: 'bat', tail: '#2a0a1a' }], fallen: ['robe', '#1a1a24', '#6a6a8a', { wings: 'dark', sword: 1 }], duchess: ['gown', '#2a0a0a', '#c03a2a', { wings: 'bat', cape: '#1a0505' }], shadow: ['leather', '#101018', '#4a2a6a', { dagger: 1 }], abyssqueen: ['gown', '#1a0508', '#e03a2a', { wings: 'bat', cape: '#0a0204', tail: '#1a0508' }],
    dragonprincess: ['gown', '#a02a2a', '#f0c040', { tail: '#a02a2a' }], avatar: ['gown', '#f8f6ff', '#a0c0ff', { wings: 'white', staff: 1 }], archangel: ['armor', '#e8e8f0', '#f0d070', { wings: 'white', sword: 1 }], dragonslayer: ['armor', '#5a5a64', '#a0a0a0', { cape: '#3a2a1a', sword: 1 }], dragonmiko: ['robe', '#f4f0ea', '#d0a030', { hakama: '#2a3a8a', tail: '#d8e8ff' }]
  };
  const shade = (hex, k) => { const c = new THREE.Color(hex); return k < 0 ? c.multiplyScalar(1 + k) : c.lerp(new THREE.Color('#ffffff'), k); };
  const EXPR = { proud: { angry: 0.18, relaxed: 0.2 }, gentle: { relaxed: 0.45, happy: 0.2 }, cold: { relaxed: 0.1 }, fierce: { angry: 0.45 }, timid: { sad: 0.35, surprised: 0.2 }, sly: { happy: 0.35, relaxed: 0.2 }, pious: { relaxed: 0.4 }, cheerful: { happy: 0.6 }, odd: { sad: 0.2, angry: 0.1 } };

  // ================= 角色：头 + 程序身体 =================
  function makeFigure(c, look, opts = {}) {
    const o = OUT[c.id] || ['dress', '#6a5a8a', '#e0d0a0', {}];
    const style = o[0], ex = Object.assign({}, o[3], opts.ex || {});
    const main = opts.main || o[1], trim = opts.trim || o[2];
    const disp = [], mats = [];
    const T = (col, extra) => { const m = ExWorld.toon(col, extra); mats.push(m); return m; };
    const G = geo => { disp.push(geo); return geo; };
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const skinC = look.skinHex || '#f2d2bc';
    const mMain = T(main), mTrim = T(trim, c.rar >= 3 ? { emissive: ExWorld.lin(new THREE.Color(trim).multiplyScalar(0.25)) } : {}), mSkin = T(skinC), mDark = T(shade(main, -0.4)), mBoot = T('#3a2a20');
    const mMetal = new THREE.MeshStandardMaterial({ color: ExWorld.lin(main), metalness: 0.75, roughness: 0.32 }); mats.push(mMetal);
    const mSkirt = ex.hakama ? T(ex.hakama) : mMain;
    const lathe = (pts, seg = 44, pleat = 0) => { const geo = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg);
      if (pleat) { const p = geo.attributes.position, y0 = pts[0][1], y1 = pts[pts.length - 1][1]; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i), a = Math.atan2(z, x), k = clamp((y0 - y) / (y0 - y1), 0, 1); const f = 1 + Math.sin(a * 14) * pleat * k; p.setX(i, x * f); p.setZ(i, z * f); } geo.computeVertexNormals(); }
      return G(geo); };
    const mesh = (geo, m, x = 0, y = 0, z = 0) => { const k = new THREE.Mesh(geo, m); k.position.set(x, y, z); body.add(k); return k; };
    // 躯干（扁椭圆）
    const armored = style === 'armor';
    const torso = mesh(lathe([[0, 0.97], [0.118, 0.975], [0.112, 1.03], [0.104, 1.075], [0.125, 1.14], [0.14, 1.2], [0.138, 1.245], [0.15, 1.285], [0.11, 1.325], [0.05, 1.345], [0, 1.35]]), ex.hakama ? T('#f4f0ea') : armored ? mMetal : mMain); torso.scale.z = 0.74;
    if (armored) { const plate = mesh(lathe([[0.12, 1.02], [0.143, 1.14], [0.152, 1.22], [0.12, 1.29]], 32), T(trim)); plate.scale.set(1.02, 1, 0.8); plate.position.z = 0.004; }
    // 衣领 / 腰带
    const collar = mesh(G(new THREE.TorusGeometry(0.058, 0.014, 6, 20)), mTrim, 0, 1.325, 0); collar.rotation.x = Math.PI / 2;
    const belt = mesh(G(new THREE.TorusGeometry(0.108, 0.012, 6, 28)), style === 'leather' || armored ? mBoot : mTrim, 0, 1.06, 0); belt.rotation.x = Math.PI / 2; belt.scale.y = 0.74;
    // 下装
    const skirts = { dress: [[0.112, 1.04], [0.15, 0.92], [0.24, 0.66], [0.31, 0.46], [0.32, 0.43]], gown: [[0.112, 1.05], [0.17, 0.88], [0.32, 0.5], [0.44, 0.12], [0.46, 0.02]], robe: [[0.125, 1.05], [0.165, 0.82], [0.22, 0.32], [0.25, 0.02]],
      work: [[0.118, 1.04], [0.16, 0.82], [0.24, 0.32], [0.26, 0.07]], armor: [[0.125, 1.05], [0.18, 0.88], [0.21, 0.74]], leather: [[0.118, 1.04], [0.155, 0.9], [0.17, 0.81]] };
    const sk = skirts[style] || skirts.dress, hem = sk[sk.length - 1][1];
    const skirt = mesh(lathe(sk, 48, style === 'dress' || style === 'gown' ? 0.035 : style === 'armor' ? 0.05 : 0.015), armored ? T(shade(main, -0.25)) : mSkirt); skirt.material.side = THREE.DoubleSide; skirt.scale.z = 0.86;
    const hemRing = mesh(G(new THREE.TorusGeometry(sk[sk.length - 1][0], 0.012, 5, 40)), mTrim, 0, hem + 0.008, 0); hemRing.rotation.x = Math.PI / 2; hemRing.scale.y = 0.86;
    if (style === 'gown') { const ov = mesh(lathe([[0.115, 1.03], [0.19, 0.86], [0.3, 0.6], [0.33, 0.56]], 48, 0.05), mTrim); ov.scale.z = 0.86; ov.material.side = THREE.DoubleSide; }
    if (ex.apron) { const ap = mesh(G(new THREE.CylinderGeometry(0.13, 0.25, Math.max(0.3, 1.02 - hem - 0.06), 16, 1, true, -0.75, 1.5)), T(ex.apron), 0, (1.02 + hem + 0.06) / 2, 0.012); ap.material.side = THREE.DoubleSide; ap.scale.z = 0.9; }
    // 腿与靴
    const legs = [];
    if (hem > 0.2) for (const s of [-1, 1]) {
      const legM = style === 'leather' ? T(shade(main, -0.3)) : armored ? mMetal : T(c.rar >= 2 ? '#f4f0f0' : skinC);
      const leg = mesh(G(new THREE.CylinderGeometry(0.052, 0.038, 0.88, 12)), legM, s * 0.068, 0.52, 0); legs.push(leg);
      const boot = mesh(G(new THREE.CylinderGeometry(0.047, 0.05, 0.3, 12)), armored ? T(shade(main, -0.2)) : mBoot, s * 0.068, 0.15, 0);
      const toe = mesh(G(new THREE.SphereGeometry(0.05, 10, 8)), boot.material, s * 0.068, 0.03, 0.04); toe.scale.set(1, 0.6, 1.5);
      if (armored) { const knee = mesh(G(new THREE.SphereGeometry(0.05, 10, 8)), T(trim), s * 0.068, 0.5, 0.02); knee.scale.set(1, 0.8, 0.7); }
    } else for (const s of [-1, 1]) { const toe = mesh(G(new THREE.SphereGeometry(0.045, 10, 8)), mBoot, s * 0.07, 0.03, 0.12 + (style === 'gown' ? 0.28 : 0.1)); toe.scale.set(1, 0.6, 1.4); }
    // 手臂（肩→肘→腕，自然下垂略向前）
    const arms = [];
    for (const s of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(s * 0.165, 1.265, 0); body.add(sh); sh.rotation.z = s * 0.14; sh.rotation.x = -0.08;
      const sleeveM = ex.hakama ? T('#f4f0ea') : armored ? mMetal : mMain;
      const up = new THREE.Mesh(G(new THREE.CylinderGeometry(0.043, 0.038, 0.29, 10)), sleeveM); up.position.y = -0.145; sh.add(up);
      const el = new THREE.Group(); el.position.y = -0.29; sh.add(el); el.rotation.x = -0.35;
      const fa = new THREE.Mesh(G(new THREE.CylinderGeometry(0.036, 0.03, 0.26, 10)), style === 'robe' || style === 'gown' || style === 'dress' ? mSkin : sleeveM); fa.position.y = -0.13; el.add(fa);
      if (style === 'robe') { const sl = new THREE.Mesh(G(new THREE.CylinderGeometry(0.05, 0.11, 0.26, 14, 1, true)), mMain); sl.material.side = THREE.DoubleSide; sl.position.y = -0.1; el.add(sl); const cuff = new THREE.Mesh(G(new THREE.TorusGeometry(0.105, 0.01, 5, 20)), mTrim); cuff.rotation.x = Math.PI / 2; cuff.position.y = -0.23; el.add(cuff); }
      if (style === 'dress' || style === 'gown') { const puff = new THREE.Mesh(G(new THREE.SphereGeometry(0.068, 12, 10)), style === 'gown' ? mTrim : mMain); puff.position.y = -0.03; puff.scale.set(1, 0.9, 1); sh.add(puff); }
      if (armored) { const pa = new THREE.Mesh(G(new THREE.SphereGeometry(0.078, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), T(trim)); pa.position.y = 0.01; sh.add(pa); const gl = new THREE.Mesh(G(new THREE.CylinderGeometry(0.042, 0.036, 0.1, 10)), mMetal); gl.position.y = -0.21; el.add(gl); }
      if (style === 'leather') { const pad = new THREE.Mesh(G(new THREE.SphereGeometry(0.06, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2)), mBoot); sh.add(pad); }
      const hand = new THREE.Mesh(G(new THREE.SphereGeometry(0.036, 10, 8)), armored ? mMetal : mSkin); hand.position.y = -0.275; hand.scale.set(0.85, 1.15, 0.7); el.add(hand);
      arms.push({ sh, el, hand, s });
    }
    // 脖子（伸进头的断面里，藏住截面）
    const cut = (window.ModelHeads && ModelHeads.meta(look.f) || {}).cut || { x: 0, y: -0.097, z: -0.027, r: 0.03 };
    const HSc = opts.headScale || 1.2, neckTop = 1.44;
    const neck = mesh(G(new THREE.CylinderGeometry(Math.max(0.036, cut.r * HSc * 1.12), 0.05, neckTop - 1.3 + 0.03, 12)), mSkin, 0, (neckTop + 1.3) / 2 + 0.012, 0);
    // 披风
    let cape = null;
    if (ex.cape) { cape = new THREE.Mesh(G(new THREE.CylinderGeometry(0.16, 0.36, 1.12, 20, 6, true, Math.PI * 0.6, Math.PI * 0.8)), T(ex.cape)); cape.material.side = THREE.DoubleSide; cape.position.set(0, 0.73, -0.03); cape.scale.z = 0.8; body.add(cape);
      const clasp = mesh(G(new THREE.SphereGeometry(0.025, 8, 6)), T(trim), 0, 1.3, 0.07); }
    if (ex.fur) { const fm = T('#e8dcc8'); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; const f = mesh(G(new THREE.IcosahedronGeometry(0.05, 0)), fm, Math.cos(a) * 0.14, 1.29, Math.sin(a) * 0.1); } }
    // 翅膀
    let wings = null;
    if (ex.wings) { wings = []; const wc = ex.wings === 'white' ? '#f8f8ff' : ex.wings === 'dark' ? '#2a2a34' : '#3a1020'; const wm = T(wc, { side: THREE.DoubleSide });
      for (const s of [-1, 1]) { const w = new THREE.Group(); w.position.set(s * 0.06, 1.2, -0.1); body.add(w);
        if (ex.wings === 'bat') { const sh2 = new THREE.Shape(); sh2.moveTo(0, 0); sh2.quadraticCurveTo(0.35, 0.35, 0.72, 0.28); sh2.lineTo(0.6, 0.02); sh2.quadraticCurveTo(0.5, -0.06, 0.42, 0.04); sh2.quadraticCurveTo(0.34, -0.1, 0.24, 0.0); sh2.quadraticCurveTo(0.14, -0.12, 0, -0.08); const m = new THREE.Mesh(G(new THREE.ShapeGeometry(sh2, 8)), wm); m.scale.x = s; w.add(m); }
        else for (let k = 0; k < 6; k++) { const f = new THREE.Mesh(G(new THREE.SphereGeometry(0.1, 8, 6)), wm); f.scale.set(1.8 + k * 0.25, 0.28, 0.06); f.position.set(s * (0.14 + k * 0.07), 0.2 - k * 0.07, 0); f.rotation.z = s * (0.5 - k * 0.2); w.add(f); }
        w.rotation.y = s * -0.5; wings.push(w); } }
    // 尾巴
    let tail = null;
    if (ex.tail) { const pts = [new V3(0, 0.95, -0.12), new V3(0, 0.7, -0.35), new V3(0.1, 0.55, -0.5), new V3(0.2, 0.7, -0.62)]; tail = new THREE.Mesh(G(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.035, 8)), T(ex.tail)); body.add(tail); }
    // 武器 / 手持物（右手）
    const R = arms[1].hand, W = new THREE.Group(); R.add(W); W.scale.set(1 / 0.85, 1 / 1.15, 1 / 0.7);
    const wood = T('#6a4a30'), steel = new THREE.MeshStandardMaterial({ color: ExWorld.lin('#d0d4dc'), metalness: 0.9, roughness: 0.25 }); mats.push(steel);
    if (ex.sword) { const bl = new THREE.Mesh(G(new THREE.BoxGeometry(0.035, 0.75, 0.01)), steel); bl.position.y = 0.42; W.add(bl); const gd = new THREE.Mesh(G(new THREE.BoxGeometry(0.16, 0.025, 0.03)), T(trim)); gd.position.y = 0.05; W.add(gd); W.rotation.x = 1.2; }
    else if (ex.axe) { const h = new THREE.Mesh(G(new THREE.CylinderGeometry(0.018, 0.02, 1.0, 6)), wood); h.position.y = 0.3; W.add(h); const hd = new THREE.Mesh(G(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 16, 1, false, 0, Math.PI)), steel); hd.rotation.set(Math.PI / 2, 0, Math.PI / 2); hd.position.set(0.02, 0.7, 0); W.add(hd); W.rotation.x = 0.4; }
    else if (ex.staff) { const h = new THREE.Mesh(G(new THREE.CylinderGeometry(0.014, 0.018, 1.5, 6)), wood); h.position.y = 0.25; W.add(h); const orb = new THREE.Mesh(G(new THREE.IcosahedronGeometry(0.05, 1)), new THREE.MeshBasicMaterial({ color: ExWorld.lin(new THREE.Color(trim).multiplyScalar(1.4))})); mats.push(orb.material); orb.position.y = 1.02; W.add(orb); W.userData.orb = orb; }
    else if (ex.bow) { const bw = new THREE.Mesh(G(new THREE.TorusGeometry(0.4, 0.012, 5, 20, Math.PI * 0.8)), wood); bw.rotation.z = Math.PI / 2 - Math.PI * 0.4; bw.position.x = -0.3; W.add(bw); W.rotation.y = Math.PI / 2; }
    else if (ex.dagger) { const bl = new THREE.Mesh(G(new THREE.BoxGeometry(0.025, 0.22, 0.008)), steel); bl.position.y = 0.13; W.add(bl); W.rotation.x = 1.4; }
    else if (ex.hammer) { const h = new THREE.Mesh(G(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 6)), wood); h.position.y = 0.12; W.add(h); const hd = new THREE.Mesh(G(new THREE.BoxGeometry(0.12, 0.06, 0.06)), steel); hd.position.y = 0.3; W.add(hd); }
    else if (ex.basket) { const b = new THREE.Mesh(G(new THREE.CylinderGeometry(0.1, 0.08, 0.1, 12, 1, true)), T('#b08a50')); b.material.side = THREE.DoubleSide; b.position.y = -0.06; W.add(b); const fl = new THREE.Mesh(G(new THREE.SphereGeometry(0.07, 8, 6)), T('#8ac060')); fl.position.y = -0.03; fl.scale.y = 0.5; W.add(fl); }
    else if (ex.flask) { const f = new THREE.Mesh(G(new THREE.SphereGeometry(0.045, 10, 8)), new THREE.MeshBasicMaterial({ color: ExWorld.lin('#6aff9a'), transparent: true, opacity: 0.8 })); mats.push(f.material); f.position.y = 0.02; W.add(f); }
    else if (ex.lute) { const b = new THREE.Mesh(G(new THREE.SphereGeometry(0.12, 12, 8)), T('#a06a30')); b.scale.set(1, 1.3, 0.4); b.position.set(-0.1, 0.05, 0.05); W.add(b); const n = new THREE.Mesh(G(new THREE.BoxGeometry(0.03, 0.3, 0.02)), wood); n.position.set(-0.1, 0.3, 0.05); W.add(n); W.rotation.z = 0.8; }
    // 头
    const alive = Object.assign({}, look, { blood: 0, spat: 0, ex: EXPR[opts.voice || 'cold'] || {} });
    let hb = null;
    try { hb = ModelHeads.create(alive, { alive: true }); hb.group.scale.setScalar(HSc); hb.group.position.set(-cut.x * HSc, neckTop - cut.y * HSc, -cut.z * HSc); } catch (e) { console.warn('explore head', e); }
    const headPivot = new THREE.Group(); headPivot.position.set(0, neckTop, 0); body.add(headPivot);
    if (hb) { hb.group.position.y -= neckTop; headPivot.add(hb.group); }
    // 地面软阴影
    const shadow = new THREE.Mesh(G(new THREE.CircleGeometry(0.45, 20)), new THREE.MeshBasicMaterial({ color: ExWorld.lin('#000000'), transparent: true, opacity: 0.28, depthWrite: false })); mats.push(shadow.material); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; g.add(shadow);
    // 高稀有度：脚下光环
    let aura = null;
    if (c.rar >= 3 || opts.boss) { aura = new THREE.Mesh(G(new THREE.RingGeometry(0.5, 0.62, 40)), new THREE.MeshBasicMaterial({ color: ExWorld.lin(new THREE.Color(opts.boss ? opts.col : RC[c.rar]).multiplyScalar(1.4)), transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide })); mats.push(aura.material); aura.rotation.x = -Math.PI / 2; aura.position.y = 0.04; g.add(aura); }
    const F = { g, body, hb, headPivot, arms, cape, wings, tail, W, aura, legs, mats, disp, t0: Math.random() * 10, blinkT: 2 + Math.random() * 3, look: new V3(), lookW: 0, voice: opts.voice, expr: alive.ex, walk: 0, dead: false,
      tick(dt, t, camPos) {
        const tt = t + this.t0;
        if (!this.dead) {
          body.scale.y = 1 + Math.sin(tt * 1.6) * 0.006; body.rotation.z = Math.sin(tt * 0.7) * 0.012;
          arms.forEach(a => { a.sh.rotation.x = -0.08 + Math.sin(tt * 1.6 + a.s) * 0.03 + (this.walk ? Math.sin(tt * 7) * 0.4 * a.s * this.walk : 0); });
          legs.forEach((l, i) => { l.rotation.x = this.walk ? Math.sin(tt * 7 + i * Math.PI) * 0.35 * this.walk : 0; });
          // 看向镜头（有限角度）
          if (camPos && this.lookW > 0) { const lp = headPivot.getWorldPosition(new V3()); const d = camPos.clone().sub(lp); const inv = new THREE.Quaternion(); g.getWorldQuaternion(inv).invert(); d.applyQuaternion(inv);
            const yaw = clamp(Math.atan2(d.x, d.z), -1.0, 1.0), pit = clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.45, 0.35);
            headPivot.rotation.y += (yaw * this.lookW - headPivot.rotation.y) * Math.min(1, dt * 4); headPivot.rotation.x += (pit * this.lookW - headPivot.rotation.x) * Math.min(1, dt * 4); }
          else { headPivot.rotation.y += (Math.sin(tt * 0.4) * 0.3 - headPivot.rotation.y) * Math.min(1, dt * 2); headPivot.rotation.x += (0.12 - headPivot.rotation.x) * Math.min(1, dt * 2); }
          // 眨眼
          this.blinkT -= dt; if (this.blinkT < 0 && hb) { const e = Object.assign({}, this.expr, { blink: 1 }); hb.setExpression(e); this.blinkT = 2.5 + Math.random() * 3.5; setTimeout(() => { if (!this.dead && hb) hb.setExpression(this.expr); }, 120); }
          if (hb) hb.setSway(new V3(Math.sin(tt * 1.1) * 0.012, 0, Math.cos(tt * 0.8) * 0.01));
        }
        if (cape) cape.rotation.x = -0.04 - Math.sin(tt * 1.3) * 0.04 - this.walk * 0.15;
        if (wings) wings.forEach((w, i) => { w.rotation.y = (i ? 1 : -1) * (-0.5 - Math.sin(tt * (opts.boss ? 2.2 : 1.4)) * 0.18); });
        if (tail) tail.rotation.y = Math.sin(tt * 1.5) * 0.3;
        if (W.userData.orb) W.userData.orb.scale.setScalar(1 + Math.sin(tt * 3) * 0.15);
        if (aura) { aura.rotation.z = tt * 0.6; aura.material.opacity = 0.45 + Math.sin(tt * 2.2) * 0.2; }
      },
      setExpr(e) { this.expr = e; if (hb) hb.setExpression(e); },
      dispose() { if (hb) hb.dispose(); disp.forEach(d => d.dispose()); mats.forEach(m => m.dispose()); }
    };
    if (opts.scale) g.scale.setScalar(opts.scale);
    return F;
  }

  // ================= 旅途状态 =================
  let X = null;
  const $ = (sel) => X.el.querySelector(sel);
  function css() {
    if (document.getElementById('exCss')) return;
    const s = document.createElement('style'); s.id = 'exCss';
    s.textContent = `
#ex{position:fixed;inset:0;z-index:60;font-family:inherit;color:#f4ecdc;user-select:none;-webkit-user-select:none;touch-action:none;cursor:default}
#ex .ex-top{position:absolute;left:0;right:0;top:0;padding:10px 16px 18px;background:linear-gradient(#000a,#0000);display:flex;gap:14px;align-items:center;pointer-events:none}
#ex .ex-loc{font-size:20px;font-weight:800;text-shadow:0 2px 6px #000;white-space:nowrap}
#ex .ex-prog{flex:1;height:10px;border-radius:6px;background:#0008;position:relative;box-shadow:inset 0 0 0 1px #fff3}
#ex .ex-prog i{position:absolute;left:0;top:0;bottom:0;border-radius:6px;background:linear-gradient(90deg,var(--lc),#fff8)}
#ex .ex-prog b{position:absolute;top:-7px;transform:translateX(-50%);font-size:15px;filter:drop-shadow(0 1px 2px #000)}
#ex .ex-prog b.done{opacity:.35;filter:grayscale(1)}
#ex .ex-stat{display:flex;gap:10px;font-size:16px;font-weight:700;white-space:nowrap;text-shadow:0 1px 4px #000}
#ex .ex-hp{width:150px;height:14px;border-radius:7px;background:#0009;position:relative;overflow:hidden;box-shadow:inset 0 0 0 1px #fff3}
#ex .ex-hp i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#b01818,#ff5040);transition:width .3s}
#ex .ex-hp span{position:absolute;inset:0;text-align:center;font-size:11px;line-height:14px}
#ex .ex-feed{position:absolute;left:16px;bottom:18px;width:min(460px,44vw);display:flex;flex-direction:column;gap:6px;pointer-events:none}
#ex .ex-feed p{margin:0;padding:7px 11px;border-radius:9px;background:#0009;backdrop-filter:blur(3px);font-size:15px;line-height:1.5;border-left:3px solid var(--lc);animation:exIn .5s ease both;transition:opacity 1s}
#ex .ex-feed p.gh{border-left-color:var(--c);box-shadow:0 0 14px -4px var(--c)}
#ex .ex-feed .dmg{color:#ff7a6a;font-weight:700}#ex .ex-feed .heal{color:#8fe080;font-weight:700}#ex .ex-feed .coin{color:#c8a0ff;font-weight:700}
#ex .ex-feed q{color:#ffe6b0;font-style:italic}
@keyframes exIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
#ex .ex-card{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);width:min(640px,92vw);padding:14px 18px 14px;border-radius:14px;background:linear-gradient(#141018ee,#0c0a10f4);box-shadow:0 10px 40px #000a,inset 0 0 0 1px #fff2;display:none;cursor:pointer}
#ex .ex-card.on{display:block;animation:exInC .35s ease both}
@keyframes exInC{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}
#ex .ex-np{font-size:18px;font-weight:800;margin-bottom:6px;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
#ex .ex-np small{font-size:13px;opacity:.7;font-weight:500}
#ex .ex-tx{font-size:16.5px;line-height:1.7;min-height:52px;white-space:pre-wrap}
#ex .ex-tx q{color:#ffe6b0}
#ex q{quotes:none}
body.exploring #hud,body.exploring #hint,body.exploring #cross,body.exploring #tip,body.exploring #labels,body.exploring #musicCorner,body.exploring #vign{display:none!important}
#ex .ex-ch{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
#ex .ex-ch button{flex:1;min-width:120px;padding:10px 12px;font-size:16px;font-weight:700;border-radius:10px;border:0;cursor:pointer;color:#fff;background:linear-gradient(#5a2a2a,#3a1818);box-shadow:inset 0 0 0 1px #fff3,0 3px 0 #0008}
#ex .ex-ch button:hover{filter:brightness(1.3)}#ex .ex-ch button.alt{background:linear-gradient(#2a3a4a,#18222e)}#ex .ex-ch button.ok{background:linear-gradient(#2a4a2a,#183018)}
#ex .ex-ch button small{display:block;font-size:11.5px;font-weight:500;opacity:.75}
#ex .ex-hint{position:absolute;right:16px;bottom:18px;font-size:13px;opacity:.7;text-shadow:0 1px 3px #000;pointer-events:none;text-align:right}
#ex .ex-flash{position:absolute;inset:0;pointer-events:none;opacity:0}
#ex .ex-vig{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,#0000 50%,#a00a 100%);transition:opacity .6s}
#ex .ex-sack{position:absolute;right:18px;top:48px;font-size:22px;font-weight:800;text-shadow:0 2px 6px #000;pointer-events:none;transition:transform .2s}
#ex .ex-sack.pop{transform:scale(1.5)}
#ex .ex-title{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 60%,var(--lc2),#0c0a10 75%);transition:opacity 1.6s;pointer-events:none;text-align:center}
#ex .ex-title .ic{font-size:64px;filter:drop-shadow(0 4px 16px #000)}#ex .ex-title .n{font-size:38px;font-weight:900;letter-spacing:6px;margin:8px 0;text-shadow:0 3px 12px #000}#ex .ex-title .d{font-size:16px;opacity:.8;max-width:520px;line-height:1.7}
#ex .ex-boss{position:absolute;left:50%;top:64px;transform:translateX(-50%);width:min(560px,90vw);display:none;text-align:center;pointer-events:none}
#ex .ex-boss.on{display:block}
#ex .ex-boss .bn{font-size:20px;font-weight:900;letter-spacing:2px;text-shadow:0 2px 8px #000,0 0 18px var(--bc)}
#ex .ex-boss .bh{height:14px;border-radius:7px;background:#0009;margin-top:6px;overflow:hidden;box-shadow:inset 0 0 0 1px #fff4}
#ex .ex-boss .bh i{display:block;height:100%;background:linear-gradient(90deg,var(--bc),#fff);transition:width .4s}
#ex .ex-intent{margin-top:8px;font-size:18px;font-weight:800;text-shadow:0 2px 6px #000}
#ex .ex-center{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;font-size:30px;font-weight:900;text-shadow:0 3px 12px #000;opacity:0;transition:opacity .4s}
#ex .ex-arrive{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(520px,92vw);padding:22px;border-radius:16px;background:#0c0a10f0;box-shadow:0 10px 50px #000,inset 0 0 0 1px #fff3;text-align:center;display:none}
#ex .ex-arrive.on{display:block;animation:exInA .5s ease both}
@keyframes exInA{from{opacity:0;transform:translate(-50%,-46%)}to{opacity:1;transform:translate(-50%,-50%)}}
#ex .ex-arrive h2{margin:0 0 8px;font-size:26px}#ex .ex-arrive .hs{margin:12px 0;line-height:1.8;max-height:34vh;overflow:auto}
#ex .ex-arrive button{padding:12px 26px;font-size:18px;font-weight:800;border:0;border-radius:10px;color:#fff;background:linear-gradient(#8a2a2a,#5a1414);cursor:pointer}
@media (max-width:700px){#ex .ex-feed{width:calc(100vw - 32px);bottom:auto;top:84px}#ex .ex-loc{font-size:15px}#ex .ex-hp{width:90px}#ex .ex-hint{display:none}}
`;
    document.head.appendChild(s);
  }

  function start(trip, api) {
    if (X) return;
    css();
    const loc = trip.loc, S = G.S, st = G.st();
    S.visits = S.visits || {}; S.visits[loc.k] = (S.visits[loc.k] || 0) + 1;
    S.rep = S.rep || {}; S.mercy = S.mercy || {}; S.bosses = S.bosses || {};
    const el = document.createElement('div'); el.id = 'ex';
    const lc = loc.color || '#c08040';
    el.style.setProperty('--lc', lc); el.style.setProperty('--lc2', new THREE.Color(lc).multiplyScalar(0.55).getStyle());
    el.innerHTML = `<div class="ex-top"><div class="ex-loc">${loc.icon} ${esc(loc.n)}</div><div class="ex-prog"><i></i></div>
      <div class="ex-stat"><div class="ex-hp"><i></i><span></span></div><span class="ex-coin">🔮 +0</span></div></div>
      <div class="ex-sack">🧺 0/${st.cap}</div>
      <div class="ex-boss"><div class="bn"></div><div class="bh"><i></i></div><div class="ex-intent"></div></div>
      <div class="ex-feed"></div><div class="ex-hint">按住鼠标 / 空格 赶路 · 移动鼠标环顾</div>
      <div class="ex-card"><div class="ex-np"></div><div class="ex-tx"></div><div class="ex-ch"></div></div>
      <div class="ex-center"></div><div class="ex-arrive"></div><div class="ex-vig"></div><div class="ex-flash"></div>
      <div class="ex-title"><div class="ic">${loc.icon}</div><div class="n">${esc(loc.n)}</div><div class="d">${esc(loc.desc || '')}</div><div class="d" style="margin-top:18px;opacity:.6">你推开洞口的石头，走进了晨光里……</div></div>`;
    document.body.appendChild(el);
    X = { trip, api, loc, el, s: 0, v: 0, hurry: 0, hold: false, t: 0, last: 0, raf: 0, stop: null, beats: [], figs: [], props: [], shake: 0, lunge: 0, mx: 0, my: 0, yawO: 0, pitO: 0, stepAcc: 0, witness: false, done: false, busy: false, fx: [] };
    window.__pauseMain = true; G.setUI(true); document.body.classList.add('exploring');
    X.menuEl = document.getElementById('menu'); X.menuWas = X.menuEl && !X.menuEl.classList.contains('hidden'); if (X.menuEl) X.menuEl.classList.add('hidden');
    SFX.music('expedition'); SFX.roar && SFX.roar(0.5);
    // 让标题卡先画出来，再建世界（避免黑屏）
    setTimeout(() => { try { build(); } catch (e) { console.error('explore build', e); abortToText(); } }, 60);
  }
  function abortToText() { // 3D 失败时退回文字旅途
    const t = X.trip, api = X.api; cleanup(); api.fallback && api.fallback(t);
  }

  function build() {
    const loc = X.loc, st = G.st();
    X.world = ExWorld.build(loc, L);
    const cam = X.cam = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.05, 900);
    const scene = X.world.scene;
    // 洞口（终点）
    { const pz = -(L + 7), px = X.world.pathX(pz), py = X.world.height(px, pz); const g = new THREE.Group(); const rock = new THREE.Mesh(new THREE.SphereGeometry(7, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), ExWorld.toon('#5a524a')); rock.scale.set(1.3, 0.9, 0.9); g.add(rock);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(2.4, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ color: ExWorld.lin('#050304')})); hole.position.set(0, 0.02, 5.7); g.add(hole);
      const fire = new THREE.PointLight('#ff9a40', 2, 14); fire.position.set(0, 1.4, 6.5); g.add(fire); g.position.set(px, py - 0.2, pz); scene.add(g); X.props.push({ g, disp: [rock.geometry, rock.material, hole.geometry, hole.material] }); }
    // beats → 路上的位置
    const beats = X.trip.res.beats, n = beats.length;
    X.beats = beats.map((b, i) => ({ b, i, s: i === 0 ? 1 : i === n - 1 ? L - 10 : 22 + (i - 1) / Math.max(1, n - 3) * (L - 60), shown: false }));
    // 事件 & BOSS 位置
    const EVS = [0.3 + Math.random() * 0.08, 0.6 + Math.random() * 0.08].map(f => ({ s: f * L, ev: X.trip.evPool.pop(), done: false })).filter(e => e.ev);
    X.events = EVS;
    const B = BOSSES[loc.k];
    const visits = G.S.visits[loc.k] || 1;
    const bossP = B && !G.S.bosses[loc.k] ? (Explore.forceBoss ? 1 : Math.min(0.85, 0.22 + 0.13 * (visits - 1))) : 0;
    X.boss = Math.random() < bossP ? { B, s: L * 0.84, done: false } : null;
    // 避让：遭遇不要和事件/BOSS 重叠
    const busyAt = [...EVS.map(e => e.s), X.boss ? X.boss.s : -99];
    X.beats.forEach(o => { if (o.b.enc == null) return; for (const s0 of busyAt) if (Math.abs(o.s - s0) < 12) o.s = clamp(s0 + (o.s < s0 ? -12 : 12), 14, L - 16); });
    // 角色
    const env = { loc: loc.k, q: st.power / loc.rec, weapon: RPG.EQUIP.weapon.tiers[G.S.eq.weapon || 0].n };
    for (const o of X.beats) {
      const who = o.b.who || o.b.head; if (!who || o.b.enc == null) continue;
      const C = Tale.ctx(who.c, who.look, Object.assign({}, env, { rep: G.S.rep[loc.k] || 0, mercy: G.S.mercy[loc.k] || 0, hpF: 1 }));
      const F = makeFigure(who.c, who.look, { voice: C.voice });
      const z = -o.s, x = X.world.pathX(z) + (C.noticed ? 0 : (o.i % 2 ? 1.6 : -1.6)); F.g.position.set(x, X.world.height(x, z), z);
      F.g.rotation.y = C.noticed ? 0 : (o.i % 2 ? -Math.PI / 2 : Math.PI / 2) + 0.4;
      scene.add(F.g); o.fig = F; o.C = C; X.figs.push(F);
    }
    // 事件道具
    for (const e of EVS) { const p = eventProp(e.ev); const z = -e.s, x = X.world.pathX(z) + 2.8; p.position.set(x, X.world.height(x, z), z); scene.add(p); e.prop = p; }
    // BOSS
    if (X.boss) {
      const B = X.boss.B, c = { id: B.id, rar: 4, name: B.n }; const rr = Math.random;
      const look = Object.assign(ModelHeads.randomLook(rr, (Lore.RACES[B.race] || {}).look || {}, 4), B.look); look.glowEye = 1; look.shiny = 3;
      const F = makeFigure(c, look, { voice: Tale.voiceOf(B.traits[0]), boss: true, col: B.col, scale: 1.35 });
      const z = -X.boss.s, x = X.world.pathX(z); F.g.position.set(x, X.world.height(x, z), z); scene.add(F.g); X.boss.fig = F; X.figs.push(F); X.boss.look = look;
      F.g.visible = false;
      const bl = new THREE.PointLight(B.col, 3, 16); bl.position.set(0, 2.5, 1.5); F.g.add(bl);
    }
    // 预编译着色器（一次性卡顿藏在标题卡后面）
    placeCam(0);
    try { G.renderer.compile(scene, cam); } catch (e) {}
    X.last = performance.now();
    addEventListener('resize', onResize); addEventListener('keydown', onKey, true); addEventListener('keyup', onKeyUp, true);
    X.el.addEventListener('mousedown', onDown); addEventListener('mouseup', onUp); X.el.addEventListener('mousemove', onMove);
    X.el.addEventListener('touchstart', onTouch, { passive: false }); X.el.addEventListener('touchend', onUp);
    $('.ex-card').addEventListener('click', e => { if (e.target.closest('button')) return; if (X.tw) X.tw.skip(); });
    marks(); hud();
    X.raf = requestAnimationFrame(loop);
    setTimeout(() => { const t = $('.ex-title'); if (t) { t.style.opacity = 0; setTimeout(() => t.remove(), 1700); } }, 350);
    setTimeout(() => showBeat(X.beats[0]), 1300);
  }
  function eventProp(ev) {
    const g = new THREE.Group(), T = ExWorld.toon, k = [...ev.t][0];
    const glowB = (c, i = 1.5) => new THREE.MeshBasicMaterial({ color: ExWorld.lin(new THREE.Color(c).multiplyScalar(i))});
    if (k === '📦') { const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.6), T('#6a4a2a')); b.position.y = 0.28; g.add(b); const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 12, 1, false, 0, Math.PI), T('#7a5a32')); lid.rotation.z = Math.PI / 2; lid.position.y = 0.55; g.add(lid); for (const x of [-0.35, 0.35]) { const band = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 0.64), T('#d0a040')); band.position.set(x, 0.3, 0); g.add(band); } }
    else if (k === '🩸') { const a = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1), T('#5a5058')); a.position.y = 0.45; g.add(a); const r = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.34, 6), glowB('#ff2020')); r.rotation.x = -Math.PI / 2; r.position.y = 0.91; g.add(r); for (let i = 0; i < 4; i++) { const cnd = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6), T('#e8e0d0')); cnd.position.set(i % 2 ? 0.65 : -0.65, 1.05, i < 2 ? 0.35 : -0.35); g.add(cnd); } const lt = new THREE.PointLight('#ff3020', 2, 8); lt.position.y = 1.5; g.add(lt); }
    else if (k === '✨') { const o = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), glowB('#a0f0ff', 1.8)); o.position.y = 1.6; g.add(o); o.userData.bob = 1; const lt = new THREE.PointLight('#80e0ff', 2, 10); lt.position.y = 1.6; g.add(lt); }
    else if (k === '🔥') { for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.8, 6), T('#5a3a20')); l.rotation.set(Math.PI / 2, i * 0.8, 0); l.position.y = 0.08; g.add(l); } const f = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 8), glowB('#ff8a20', 1.6)); f.position.y = 0.4; f.userData.flick = 1; g.add(f); const lt = new THREE.PointLight('#ff8a30', 2.5, 10); lt.position.y = 1; g.add(lt); }
    else if (k === '🧌') { const cart = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 0.9), T('#7a5a3a')); cart.position.y = 0.7; g.add(cart); for (const x of [-0.5, 0.5]) for (const z of [-0.5, 0.5]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.05, 6, 14), T('#3a2a1a')); w.position.set(x, 0.25, z); g.add(w); } const cv = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.4, 12, 1, true, 0, Math.PI), T('#e8dcc0', { side: THREE.DoubleSide })); cv.rotation.z = Math.PI / 2; cv.position.y = 1.0; g.add(cv); const gob = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), T('#6a9a4a')); gob.position.set(0.9, 0.5, 0.3); g.add(gob); }
    else if (k === '⚔️') { for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 5), T('#6a5040')); sp.position.set((i - 3) * 0.4, 0.5, (i % 2) * 0.5); sp.rotation.set(0.5 + i * 0.1, 0, (i - 3) * 0.2); g.add(sp); } for (let i = 0; i < 3; i++) { const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 14), T(['#8a2a2a', '#2a4a8a', '#8a8a8a'][i])); sh.position.set(i * 0.6 - 0.6, 0.05, -0.4); sh.rotation.x = 0.2; g.add(sh); } }
    else { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2, 6), T('#6a4a30')); p.position.y = 1; g.add(p); for (const [y, r] of [[1.7, 0.3], [1.35, -0.4]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 0.04), T('#8a6a44')); b.position.set(0.3 * Math.sign(r), y, 0); b.rotation.y = r; g.add(b); } }
    return g;
  }

  // ================= 相机 =================
  function placeCam(dt) {
    const W = X.world, s = X.s, z = -s, x = W.pathX(z);
    const bob = Math.sin(X.stepPh || 0) * 0.045 * Math.min(1, X.v / 3), sway = Math.cos((X.stepPh || 0) * 0.5) * 0.03 * Math.min(1, X.v / 3);
    const y = W.height(x, z) + EYE + bob;
    X.cam.position.set(x + sway, y, z);
    // 默认朝前方路面
    const la = 7, tz = z - la, tx = W.pathX(tz);
    let yaw = Math.atan2(-(tx - x), -(tz - z)), pit = -0.08;
    if (X.focus) { const f = X.focus.getWorldPosition(new V3()); yaw = Math.atan2(-(f.x - x), -(f.z - z)); pit = Math.atan2(f.y - y, Math.hypot(f.x - x, f.z - z)) - 0.13; }
    // 鼠标环顾
    const ty = -X.mx * 0.45, tp = -X.my * 0.25;
    X.yawO += (ty - X.yawO) * Math.min(1, dt * 3); X.pitO += (tp - X.pitO) * Math.min(1, dt * 3);
    X.cy = X.cy == null ? yaw : X.cy + angDiff(yaw, X.cy) * Math.min(1, dt * (X.focus ? 3 : 2.2)); X.cp = X.cp == null ? pit : X.cp + (pit - X.cp) * Math.min(1, dt * 3);
    X.cam.rotation.set(0, 0, 0); X.cam.rotation.order = 'YXZ'; X.cam.rotation.y = X.cy + X.yawO * (X.focus ? 0.3 : 1); X.cam.rotation.x = X.cp + X.pitO * (X.focus ? 0.3 : 1);
    // 震屏与前冲
    if (X.shake > 0) { X.cam.position.x += (Math.random() - 0.5) * X.shake * 0.3; X.cam.position.y += (Math.random() - 0.5) * X.shake * 0.3; X.cam.rotation.z = (Math.random() - 0.5) * X.shake * 0.08; }
    if (X.lunge) { const d = new V3(0, 0, -1).applyEuler(X.cam.rotation); X.cam.position.addScaledVector(d, X.lunge); }
  }
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

  // ================= 主循环 =================
  function loop(now) {
    if (!X) return;
    X.raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - X.last) / 1000); X.last = now; X.t += dt;
    // 前进
    const target = X.stop || X.done || X.busy ? 0 : (X.hold ? 7.5 : 3.1) + X.hurry;
    X.v += (target - X.v) * Math.min(1, dt * (target > X.v ? 2.5 : 5));
    X.hurry = Math.max(0, X.hurry - dt * 2.5);
    const ds = X.v * dt; X.s = Math.min(L, X.s + ds);
    X.stepPh = (X.stepPh || 0) + ds * 2.6; X.stepAcc += ds; if (X.stepAcc > 1.2) { X.stepAcc = 0; SFX.step && SFX.step(); }
    X.shake = Math.max(0, X.shake - dt * 2.2);
    if (X.lungeT != null) { X.lungeT += dt; const k = X.lungeT; X.lunge = k < 0.12 ? k / 0.12 * 0.9 : Math.max(0, 0.9 - (k - 0.12) * 2.5); if (k > 0.6) { X.lungeT = null; X.lunge = 0; } }
    if (!X.stop && !X.done && !X.busy) triggers();
    // 角色
    const cp = X.cam.position;
    for (const F of X.figs) { if (!F.g.visible || !F.g.parent) continue; if (F.g.position.distanceToSquared(cp) > 90 * 90) continue; F.tick(dt, X.t, cp); }
    for (const e of X.events || []) if (e.prop) e.prop.traverse(o => { if (o.userData.bob) o.position.y = 1.6 + Math.sin(X.t * 2) * 0.12; if (o.userData.flick) o.scale.y = 1 + Math.sin(X.t * 17) * 0.15; });
    for (let i = X.fx.length - 1; i >= 0; i--) if (X.fx[i](dt) === false) X.fx.splice(i, 1);
    // BOSS 氛围
    if (X.boss && !X.boss.done) { const k = sstep(X.boss.s - 45, X.boss.s - 12, X.s); if (k > 0) X.boss.fig.g.visible = true; const fog = X.world.scene.fog; fog.color.copy(X.world.fogBase).lerp(ExWorld.lin(X.boss.B.col).multiplyScalar(0.35), k * 0.7); fog.density = X.world.fogDBase * (1 + k * 1.2); }
    else if (X.boss && X.boss.done) { const fog = X.world.scene.fog; fog.color.lerp(X.world.fogBase, dt); fog.density += (X.world.fogDBase - fog.density) * dt; }
    placeCam(dt);
    X.world.update(dt, X.t, X.cam);
    try { ModelHeads.tick(now / 1000); } catch (e) {}
    const r = G.renderer; r.setRenderTarget(null); r.render(X.world.scene, X.cam);
    const pb = $('.ex-prog i'); if (pb) pb.style.width = (X.s / L * 100) + '%';
  }
  function triggers() {
    // 普通 beat
    for (const o of X.beats) {
      if (o.shown) continue;
      if (o.b.enc != null) { if (X.s >= o.s - 4.6) { X.s = Math.max(X.s, o.s - 4.6); encounter(o); return; } continue; }
      if (X.s >= o.s) { if (o.i === X.beats.length - 1) continue; showBeat(o); if (!X) return; }
    }
    for (const e of X.events || []) if (!e.done && X.s >= e.s - 4) { event(e); return; }
    if (X.boss && !X.boss.done && X.s >= X.boss.s - 8) { bossMeet(); return; }
    if (X.s >= L - 10) { const last = X.beats[X.beats.length - 1]; if (!last.shown) showBeat(last); }
    if (X.s >= L - 0.01) arrive();
  }

  // ================= 文字流 =================
  function feed(html, cls, c) {
    const f = $('.ex-feed'); if (!f) return;
    const p = document.createElement('p'); if (cls) p.className = cls; if (c) p.style.setProperty('--c', c); p.innerHTML = html; f.appendChild(p);
    while (f.children.length > 5) f.firstChild.remove();
    [...f.children].forEach((q, i, a) => q.style.opacity = 0.45 + 0.55 * (i + 1) / a.length);
  }
  function hud() {
    if (!X) return; const m = G.st().maxHp, f = Math.max(0, G.S.hp / m);
    const hp = $('.ex-hp i'); if (hp) { hp.style.width = f * 100 + '%'; $('.ex-hp span').textContent = `❤️ ${Math.max(0, Math.round(G.S.hp))} / ${m}`; }
    $('.ex-coin').textContent = `🔮 +${X.trip.coins}`; $('.ex-sack').textContent = `🧺 ${X.trip.res.heads.length}/${G.st().cap}`;
    $('.ex-vig').style.opacity = f < 0.3 ? 0.55 + Math.sin(performance.now() / 300) * 0.1 : 0;
  }
  function marks() {
    const p = $('.ex-prog'); p.querySelectorAll('b').forEach(b => b.remove());
    const add = (s, ic, o) => { const b = document.createElement('b'); b.style.left = (s / L * 100) + '%'; b.textContent = ic; p.appendChild(b); if (o) o.mk = b; };
    X.beats.forEach(o => { if (o.b.enc != null) add(o.s, '👤', o); });
    (X.events || []).forEach(e => add(e.s, '❔', e));
    if (X.boss) add(X.boss.s, '👑', X.boss);
    add(L, '🕳️');
  }
  const markDone = o => { if (o && o.mk) o.mk.classList.add('done'); };
  function flash(color, a = 0.8, ms = 220) { const f = $('.ex-flash'); f.style.transition = 'none'; f.style.background = color; f.style.opacity = a; requestAnimationFrame(() => { f.style.transition = `opacity ${ms}ms`; f.style.opacity = 0; }); }
  function hurt(d) {
    if (!d) return; G.damage(d); X.shake = Math.min(1.2, X.shake + 0.6); flash('#c00000', 0.45, 500); hud();
  }
  function applyBeat(b, mul = 1) {
    let extra = '', rec = { t: b.t };
    if (b.hp && b.hp < 0) { const d = Math.max(0, Math.round(-b.hp * mul)); if (d) { hurt(d); extra += ` <span class="dmg">-${d} HP</span>`; rec.d = `-${d} HP`; } }
    else if (b.hp > 0) { const m = G.st().maxHp; G.S.hp = Math.min(m, G.S.hp + b.hp); extra += ` <span class="heal">+${b.hp} HP</span>`; rec.d = `+${b.hp} HP`; }
    if (b.coin) { G.addCoins(b.coin); X.trip.coins += b.coin; extra += ` <span class="coin">🔮+${b.coin}</span>`; rec.d = (rec.d ? rec.d + ' ' : '') + `魂晶+${b.coin}`; SFX.coins(); }
    return { extra, rec };
  }
  function showBeat(o) {
    if (!X || o.shown) return; o.shown = true;
    const { extra, rec } = applyBeat(o.b);
    feed(esc(o.b.t) + extra); X.trip.log.push(rec); hud();
    if (G.S.hp <= 0) dieNow();
  }
  // ================= 对话卡 =================
  function card(np, text, choices, onPick) {
    const c = $('.ex-card'); c.classList.add('on');
    $('.ex-np').innerHTML = np || '';
    const tx = $('.ex-tx'), ch = $('.ex-ch'); ch.innerHTML = '';
    if (X.tw) X.tw.stop();
    // 打字机：保留 <q> 标签
    const full = text; let i = 0, stopped = false; const plain = full.replace(/<[^>]+>/g, '');
    const render = k => { let out = '', cnt = 0, j = 0; while (j < full.length && cnt < k) { if (full[j] === '<') { const e = full.indexOf('>', j); out += full.slice(j, e + 1); j = e + 1; continue; } out += full[j]; j++; cnt++; } if (cnt >= plain.length) out = full; else if ((out.match(/<q>/g) || []).length > (out.match(/<\/q>/g) || []).length) out += '</q>'; return out; };
    const showCh = () => { ch.innerHTML = ''; (choices || []).forEach((o, k) => { const b = document.createElement('button'); if (o.cls) b.className = o.cls; b.innerHTML = `${esc(o.t)}${o.sub ? `<small>${esc(o.sub)}</small>` : ''}`; b.onclick = e => { e.stopPropagation(); if (X.picking) return; X.picking = true; setTimeout(() => X && (X.picking = false), 250); SFX.click && SFX.click(); onPick && onPick(k, o); }; ch.appendChild(b); }); X.keys = choices || []; X.onPick = onPick; };
    const tw = X.tw = { stop() { stopped = true; }, skip() { i = plain.length; } };
    const step = () => { if (stopped || !X) return; i += 2; tx.innerHTML = render(i); if (i < plain.length) setTimeout(step, 28); else { X.tw = null; showCh(); } };
    tx.innerHTML = ''; step();
  }
  function hideCard() { const c = $('.ex-card'); if (c) c.classList.remove('on'); X.keys = null; X.onPick = null; if (X.tw) { X.tw.stop(); X.tw = null; } }
  const np = (c, extra = '') => `<span style="color:${RC[c.rar]}">【${RN[c.rar]}】</span>${esc(c.name)} <small>${esc((c.raceN || '').replace(/（.*）/, ''))} · ${esc(c.idN)}${c.title && c.title !== c.idN ? ' · ' + esc(c.title) : ''}</small>${extra}`;

  // ================= 遭遇 =================
  function encounter(o) {
    o.shown = true; X.stop = o; markDone(o);
    const who = o.b.who || o.b.head, c = who.c, F = o.fig, C = o.C;
    C.hpF = G.S.hp / G.st().maxHp; C.witness = X.witness; C.rep = G.S.rep[X.loc.k] || 0; C.mercy = G.S.mercy[X.loc.k] || 0;
    if (C.witness && !C.noticed) { C.noticed = true; }
    if (C.noticed) { F.lookW = 1; turnTo(F, 0.6); }
    X.focus = F.headPivot;
    const intro = Tale.intro(C);
    const opts = C.noticed ? [{ t: '⚔️ 动手', k: 'fight' }, { t: '🗣️ 交谈', k: 'talk', cls: 'alt' }, { t: '🚶 放她走', k: 'spare', cls: 'ok' }]
      : [{ t: '🗡️ 偷袭', k: 'sneak', sub: '受到的伤害减半' }, { t: '🗣️ 上前搭话', k: 'talk', cls: 'alt' }, { t: '🚶 悄悄绕开', k: 'by', cls: 'ok' }];
    (Explore.hooks.choices || []).forEach(f => f(o, opts));
    const text = esc(intro) + (C.noticed ? `\n<q>「${esc(Tale.greet(C))}」</q>` : '');
    SFX.open && SFX.open();
    card(np(c), text, opts, (k, op) => encPick(o, op.k, 0));
  }
  function turnTo(F, spd) { // 角色转身面向镜头
    const target = Math.atan2(X.cam.position.x - F.g.position.x, X.cam.position.z - F.g.position.z);
    const from = F.g.rotation.y; let t = 0; X.fx.push(dt => { t += dt / spd; F.g.rotation.y = from + angDiff(target, from) * Math.min(1, t); return t < 1; });
  }
  function encPick(o, k, talked) {
    const who = o.b.who || o.b.head, c = who.c, F = o.fig, C = o.C;
    if (Explore.hooks.pick && Explore.hooks.pick(o, k, { card, np, hideCard, resume, feed })) return;
    if (k === 'talk') {
      if (!C.noticed) { C.noticed = true; F.lookW = 1; turnTo(F, 0.6); }
      const line = Tale.talk(C, talked);
      const opts = [{ t: '⚔️ 动手', k: 'fight' }]; if (talked < 1) opts.push({ t: '🗣️ 继续聊', k: 'talk', cls: 'alt' }); opts.push({ t: '🚶 放她走', k: 'spare', cls: 'ok' });
      card(np(c), (talked ? '' : `你没有急着动手，而是开口问她要去哪里。\n`) + `<q>「${esc(line)}」</q>`, opts, (i, op) => encPick(o, op.k, talked + 1));
      return;
    }
    if (k === 'spare' || k === 'by') {
      // 放过：没有伤害，没有首级
      if (o.b.head) { const i = X.trip.res.heads.indexOf(o.b.head); if (i >= 0) X.trip.res.heads.splice(i, 1); }
      G.S.mercy[X.loc.k] = (G.S.mercy[X.loc.k] || 0) + 1;
      const t = k === 'by' ? Tale.sneakBy(C) : `<q>「${esc(Tale.spare(C))}」</q>\n${esc(Tale.spareGo(C))}`;
      feed(k === 'by' ? `你绕开了${esc(c.idN)}「${esc(c.name)}」。` : `你放走了${esc(c.idN)}「${esc(c.name)}」。<q>「${esc(Tale.spare(C))}」</q>`);
      X.trip.log.push({ t: k === 'by' ? `你悄悄绕开了${c.idN}「${c.name}」。` : `你放走了${c.idN}「${c.name}」。` });
      card(np(c), t, [], null);
      walkAway(F, k === 'by' ? 0.2 : 1);
      setTimeout(() => resume(), 1900); return;
    }
    // 战斗
    const sneak = k === 'sneak'; C.sneak = sneak;
    hideCard();
    const b = o.b;
    if (b.won) {
      X.lungeT = 0; SFX.chop && SFX.chop(); setTimeout(() => SFX.squish && SFX.squish(1), 90);
      setTimeout(() => { flash('#ffffff', 0.85, 260); X.shake = 1; }, 110);
      const { extra, rec } = applyBeat(b, sneak ? 0.5 : 1);
      G.S.rep[X.loc.k] = (G.S.rep[X.loc.k] || 0) + 1; X.witness = true;
      const last = Tale.last(C);
      setTimeout(() => {
        if (!X) return;
        if (b.head) {
          killFig(F, true);
          feed(`${esc(Tale.fightWin(C))}${esc(c.idN)}「${esc(c.name)}」倒下了。<q>「${esc(last)}」</q>${extra}<br>💀 获得首级【${RN[c.rar]}】${esc(c.name)}`, 'gh', RC[c.rar]);
          if (c.rar >= 2) SFX.fanfare && SFX.fanfare(c.rar);
          center(`💀 【${RN[c.rar]}】${esc(c.name)}`, RC[c.rar]);
        } else { killFig(F, false); feed(esc(b.t) + extra); }
        rec.t = b.t; rec.cls = b.head ? 'gethead' : undefined; X.trip.log.push(rec); hud();
        if (G.S.hp <= 0) { dieNow(); return; }
        setTimeout(() => resume(), 1500);
      }, 240);
    } else {
      // 输了：被击退，她跑掉
      X.shake = 1.2; SFX.punch && SFX.punch(); flash('#a00000', 0.6, 500);
      const { extra, rec } = applyBeat(b, sneak ? 0.7 : 1); rec.t = b.t;
      X.trip.log.push(rec);
      const line = Tale.win(C);
      card(np(c), `${esc(Tale.fightLose(C))}\n<q>「${esc(line)}」</q>${extra}`, [], null);
      feed(esc(b.t) + extra); hud();
      if (G.S.hp <= 0) { dieNow(); return; }
      setTimeout(() => { if (!X) return; walkAway(F, 1.8); }, 700);
      setTimeout(() => resume(), 2200);
    }
  }
  function resume() { if (!X) return; hideCard(); X.stop = null; X.focus = null; X.busy = false; }
  function walkAway(F, spd) {
    F.lookW = 0; const side = F.g.position.x > X.cam.position.x ? 1 : -1; const dir = side; F.g.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; F.walk = 1; let t = 0;
    X.fx.push(dt => { t += dt; F.g.position.x += dir * dt * 1.6 * spd; F.g.position.y = X.world.height(F.g.position.x, F.g.position.z) + Math.abs(Math.sin(t * 7)) * 0.03; if (t > 6) { F.g.visible = false; return false; } });
  }
  function killFig(F, takeHead) {
    F.dead = true; F.lookW = 0;
    const body = F.body; let t = 0;
    body.traverse(o => { if (o.material && F.mats.includes(o.material)) { o.material.transparent = true; } });
    // 头飞进麻袋
    if (F.hb) {
      const hg = F.hb.group; const wp = hg.getWorldPosition(new V3()), wq = hg.getWorldQuaternion(new THREE.Quaternion()), ws = hg.getWorldScale(new V3());
      X.world.scene.attach(hg); hg.position.copy(wp); hg.quaternion.copy(wq); hg.scale.copy(ws);
      const start = wp.clone(); let u = 0;
      if (takeHead) X.fx.push(dt => { u += dt / 1.0; const k = Math.min(1, u);
        const cam = X.cam, end = new V3(0.55, -0.55, -0.9).applyQuaternion(cam.quaternion).add(cam.position);
        hg.position.lerpVectors(start, end, k * k); hg.position.y += Math.sin(k * Math.PI) * 1.2; hg.rotation.y += dt * 9; hg.rotation.x += dt * 4; hg.scale.copy(ws).multiplyScalar(1 - k * 0.7);
        if (k >= 1) { hg.visible = false; const sk = $('.ex-sack'); if (sk) { sk.classList.add('pop'); setTimeout(() => sk && sk.classList.remove('pop'), 250); } SFX.sack && SFX.sack(); return false; } });
      else { let vy = 2; X.fx.push(dt => { vy -= dt * 9.8; hg.position.y += vy * dt; hg.rotation.x += dt * 5; const gy = X.world.height(hg.position.x, hg.position.z) + 0.12; if (hg.position.y < gy) { hg.position.y = gy; return false; } }); }
    }
    X.fx.push(dt => { t += dt; body.rotation.x = -Math.min(1.45, t * t * 3.5); body.position.y = -Math.min(0.3, t * 0.2);
      if (t > 1.1) { const a = Math.max(0, 1 - (t - 1.1) / 1.2); F.mats.forEach(m => { m.transparent = true; m.opacity = a; }); }
      if (t > 2.4) { F.g.visible = false; return false; } });
  }
  function center(html, col) { const c = $('.ex-center'); c.innerHTML = html; c.style.color = col || '#fff'; c.style.opacity = 1; clearTimeout(X.cT); X.cT = setTimeout(() => { if (X) c.style.opacity = 0; }, 1500); }

  // ================= 旅途事件（原 EVENTS）=================
  function event(e) {
    e.done = true; X.stop = e; markDone(e); X.focus = e.prop;
    const ev = e.ev;
    card(`<span style="color:#ffd070">⚖️ 抉择</span>`, esc(ev.t), ev.o.map((o, i) => ({ t: o[0], cls: i ? 'alt' : '' })), (i) => {
      const r = X.api.choose(ev, i);
      let extra = '';
      if (r.coin) extra += ` <span style="color:#c8a0ff">🔮+${r.coin}</span>`;
      if (r.heal) extra += ` <span style="color:#8fe080">+${r.heal} HP</span>`;
      if (r.hurt) { X.shake = 0.8; flash('#c00000', 0.45, 500); extra += ` <span style="color:#ff7a6a">-${r.hurt} HP</span>`; }
      if (r.coin) SFX.coins();
      feed(esc(ev.o[i][0]) + ' → ' + esc(r.msg) + extra);
      if (r.headMsg) feed(esc(r.headMsg), r.head ? 'gh' : '', r.head ? RC[r.head.c.rar] : null);
      hud();
      card(`<span style="color:#ffd070">⚖️ ${esc(ev.o[i][0])}</span>`, esc(r.msg) + extra + (r.headMsg ? '\n' + esc(r.headMsg) : ''), [], null);
      if (G.S.hp <= 0) { dieNow(); return; }
      setTimeout(() => resume(), 1800);
    });
  }

  // ================= BOSS =================
  function bossMeet() {
    const bo = X.boss; bo.met = true; X.stop = bo; markDone(bo);
    const B = bo.B, F = bo.fig; F.lookW = 1; X.focus = F.headPivot;
    SFX.roar && SFX.roar(1.1); X.shake = 0.5;
    const bn = $('.ex-boss'); bn.style.setProperty('--bc', B.col); bn.classList.add('on'); $('.ex-boss .bn').textContent = `👑 ${B.title} · ${B.n}`; $('.ex-boss .bh i').style.width = '100%'; $('.ex-intent').textContent = '';
    const st = G.st(), q = st.power / (X.loc.rec * B.pow);
    const warn = q < 0.5 ? '她的力量远远超过你。挑战她，几乎是送死。' : q < 0.85 ? '她很强。这会是一场苦战。' : q < 1.4 ? '你们势均力敌。' : '你感觉自己能赢。';
    card(`<span style="color:${B.col}">👑 ${esc(B.title)}</span> ${esc(B.n)}`, `${esc(B.intro)}\n<q>「${esc(B.say)}」</q>\n<span style="opacity:.75">（${warn}）</span>`,
      [{ t: '⚔️ 挑战', sub: '击败她可得地区霸主首级', k: 'duel' }, { t: '🚶 绕开', sub: '她会消失在雾里', k: 'leave', cls: 'ok' }], (i, o) => {
        if (o.k === 'leave') { bossGone(false); return; }
        duelStart();
      });
  }
  function bossGone(defeated) {
    const bo = X.boss; bo.done = true; $('.ex-boss').classList.remove('on');
    if (!defeated) { feed(`你没有理会${esc(bo.B.title)}。等你回头时，她已经不见了。`); X.trip.log.push({ t: `你在${X.loc.n}遇见了${bo.B.title}${bo.B.n}，但没有挑战她。` }); const F = bo.fig; let t = 0; X.fx.push(dt => { t += dt; F.g.position.y += dt * 0.6; F.mats.forEach(m => { m.transparent = true; m.opacity = Math.max(0, 1 - t); }); if (t > 1) { F.g.visible = false; return false; } }); }
    setTimeout(() => resume(), defeated ? 2600 : 900);
  }
  const INTENT = { heavy: ['🔨 重击', '她高高举起武器，全身的力量都压在这一击上……'], rapid: ['🗡️ 连刺', '她压低重心，步伐变得又快又碎……'], spell: ['✨ 施法', '她的指尖开始聚起刺眼的光芒……'] };
  // [对她的伤害倍率, 对你的伤害倍率]
  const MATRIX = { heavy: { atk: [0.9, 1.3], blk: [0.3, 0.55], dge: [1.5, 0] }, rapid: { atk: [0.9, 1.0], blk: [1.3, 0.1], dge: [0.2, 0.8] }, spell: { atk: [1.6, 0.15], blk: [0.2, 1.2], dge: [0.5, 0.6] } };
  function duelStart() {
    const bo = X.boss, B = bo.B, st = G.st();
    const tier = Math.max(0, Lore.LOCS.findIndex(l => l.k === X.loc.k));
    const q = st.power / (X.loc.rec * B.pow);
    bo.duel = { hp: 100, round: 0, q, tier, feint: tier >= 3 ? 0.1 + tier * 0.025 : 0 };
    SFX.music && SFX.music('expedition'); duelRound();
  }
  function duelRound() {
    const bo = X.boss, d = bo.duel, B = bo.B;
    d.round++;
    const keys = ['heavy', 'rapid', 'spell']; d.real = keys[Math.floor(Math.random() * 3)];
    d.shown = Math.random() < d.feint ? keys.filter(k => k !== d.real)[Math.floor(Math.random() * 2)] : d.real;
    const odd = d.shown !== d.real && Math.random() < 0.5;
    $('.ex-intent').innerHTML = `意图：${INTENT[d.shown][0]}${odd ? ' <span style="color:#ffa">（有些古怪……）</span>' : ''}`;
    const taunt = B.taunt[Math.floor(Math.random() * B.taunt.length)];
    card(`<span style="color:${B.col}">👑 第 ${d.round} 回合</span>`, `<q>「${esc(taunt)}」</q>\n${esc(INTENT[d.shown][1])}`,
      [{ t: '💢 猛攻', sub: '克制施法', k: 'atk' }, { t: '🛡️ 格挡', sub: '克制连刺', k: 'blk', cls: 'alt' }, { t: '💨 闪避', sub: '克制重击', k: 'dge', cls: 'alt' }, { t: '🏳️ 撤退', sub: '挨一下后脱身', k: 'run', cls: 'ok' }],
      (i, o) => duelAct(o.k));
  }
  function duelAct(a) {
    const bo = X.boss, d = bo.duel, B = bo.B, st = G.st();
    hideCard();
    if (a === 'run') { const n = Math.max(1, Math.round(st.maxHp * 0.12 * (1 - st.dodge))); hurt(n); feed(`你转身逃离了${esc(B.title)}。<q>「${esc(B.win)}」</q> <span class="dmg">-${n} HP</span>`); X.trip.log.push({ t: `你从${B.title}${B.n}手下逃走了。`, d: `-${n} HP` }); if (G.S.hp <= 0) { dieNow(); return; } bossGone(false); return; }
    const [mB, mP] = MATRIX[d.real][a];
    const qa = Math.pow(clamp(d.q, 0.25, 3), 0.7);
    const dealt = Math.round(22 * qa * mB * (0.85 + Math.random() * 0.3));
    const taken = Math.round(st.maxHp * 0.1 / qa * mP * (0.85 + Math.random() * 0.3) * (1 - st.dodge * 0.5) * (1 - Math.min(0.5, st.def / (st.def + 300))));
    d.hp = Math.max(0, d.hp - dealt);
    X.lungeT = 0; SFX.chop && SFX.chop(); setTimeout(() => { flash(mB >= 1.3 ? '#ffffff' : '#ffe0a0', mB >= 1.3 ? 0.7 : 0.35, 250); }, 100);
    const F = bo.fig; const recoil = () => { let t = 0; X.fx.push(dt => { t += dt; F.body.rotation.x = -Math.sin(Math.min(1, t * 3) * Math.PI) * 0.25; return t < 0.34; }); }; recoil();
    $('.ex-boss .bh i').style.width = d.hp + '%';
    const good = mB >= 1.3, bad = mP >= 1.0;
    const realN = INTENT[d.real][0];
    const msg = (d.real !== d.shown ? `假动作！她真正的招式是${realN}。` : '') + (good ? '你看穿了她的招式，狠狠地反击！' : bad ? '你判断错了，结结实实地挨了一下。' : '你们互有攻守。');
    setTimeout(() => {
      if (!X) return;
      if (taken > 0) hurt(taken);
      feed(`${esc(msg)} <span class="coin">⚔️ ${dealt}</span>${taken ? ` <span class="dmg">-${taken} HP</span>` : ''}`);
      if (G.S.hp <= 0) { X.trip.log.push({ t: `你倒在了${B.title}${B.n}的面前。` }); dieNow(); return; }
      if (d.hp <= 0) { bossWin(); return; }
      if (Math.random() < 0.4) card(`<span style="color:${B.col}">👑 ${esc(B.n)}</span>`, `<q>「${esc(B.hurt[Math.floor(Math.random() * B.hurt.length)])}」</q>`, [], null);
      setTimeout(() => X && duelRound(), 900);
    }, 450);
  }
  function bossWin() {
    const bo = X.boss, B = bo.B;
    const h = RPG.bossHead(G.S, G.st(), X.loc, B, G.usedNames, G.usedSig);
    Object.assign(h.look, bo.look, { blood: 0.25, spat: 0.1 }); h.sig = RPG.sigOf(h.look);
    X.trip.res.heads.push(h);
    G.S.bosses[X.loc.k] = { n: B.n, t: B.title, date: Date.now() };
    G.S.rep[X.loc.k] = (G.S.rep[X.loc.k] || 0) + 5;
    X.shake = 1.4; flash('#ffffff', 1, 700); SFX.fanfare && SFX.fanfare(4); SFX.levelup && SFX.levelup();
    card(`<span style="color:${B.col}">👑 ${esc(B.title)}</span> ${esc(B.n)}`, `<q>「${esc(B.lose)}」</q>`, [], null);
    setTimeout(() => { if (!X) return; killFig(bo.fig, true); center(`👑 击败了${esc(B.title)}！`, B.col); feed(`你击败了${esc(B.title)}「${esc(B.n)}」！<br>👑 获得霸主首级【神魂】${esc(B.n)}`, 'gh', B.col); X.trip.log.push({ t: `你击败了${B.title}${B.n}，带走了她的首级。`, cls: 'gethead' }); hud(); bossGone(true); }, 1400);
  }
  function checkVictory() {
    const S = G.S; if (S.won) return false;
    const all = Lore.LOCS.filter(l => BOSSES[l.k]).every(l => S.bosses && S.bosses[l.k]);
    if (all) { S.won = Date.now(); return true; }
    return false;
  }
  function victoryScreen() {
    const S = G.S, d = document.createElement('div'); d.id = 'exWin';
    d.style.cssText = 'position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,#3a2a08ee,#0a0604f8);color:#fff;text-align:center;font-family:inherit';
    const list = Lore.LOCS.filter(l => BOSSES[l.k]).map(l => `<div>${l.icon} ${esc(BOSSES[l.k].title)} · <b style="color:${BOSSES[l.k].col}">${esc(BOSSES[l.k].n)}</b></div>`).join('');
    d.innerHTML = `<div style="max-width:560px;padding:24px"><div style="font-size:64px">👑</div><div style="font-size:36px;font-weight:900;letter-spacing:6px;margin:6px 0 10px;color:#ffd060;text-shadow:0 0 24px #f80">魂首窟之主</div>
      <div style="font-size:16px;line-height:1.8;opacity:.9">九位霸主的首级，如今都陈列在你的洞穴里。<br>从雾溪村到龙骨圣山，再没有人敢念出格罗克的名字。</div>
      <div style="margin:16px 0;line-height:1.9;font-size:15px">${list}</div><div style="opacity:.75;font-size:14px">出猎 ${S.stats.trips} 次 · 斩首 ${S.stats.kills} · 收藏 ${S.heads.length} 颗</div>
      <button style="margin-top:18px;padding:12px 28px;font-size:18px;font-weight:800;border:0;border-radius:10px;background:linear-gradient(#b08a2a,#6a4a10);color:#fff;cursor:pointer">继续统治 ▶</button><div style="font-size:12px;opacity:.6;margin-top:8px">（游戏会继续，你可以一直收藏下去）</div></div>`;
    document.body.appendChild(d); SFX.fanfare && SFX.fanfare(4);
    d.querySelector('button').onclick = () => { d.remove(); try { G.lockPointer(); } catch (e) {} };
  }

  // ================= 到达 / 死亡 =================
  function arrive() {
    if (X.done) return; X.done = true;
    const r = X.trip.res, hpLost = Math.max(0, Math.round(X.trip.hp0 - G.S.hp));
    const a = $('.ex-arrive'); a.classList.add('on');
    a.innerHTML = `<h2>🕳️ 回到了魂首窟</h2><div>带回首级 <b>${r.heads.length}</b> 颗 · 🔮 +${X.trip.coins} · ❤️ -${hpLost}</div>
      <div class="hs">${r.heads.map(h => `<div style="color:${h.c.boss ? '#ffd060' : RC[h.c.rar]}">${h.c.boss ? '👑' : ''}【${RN[h.c.rar]}】${esc(h.c.name)}</div>`).join('') || '<span style="opacity:.6">两手空空……</span>'}</div>
      <button>扛起战利品麻袋 ▶</button>`;
    SFX.levelup && SFX.levelup();
    a.querySelector('button').onclick = () => { const api = X.api, won = checkVictory(); cleanup(); api.finish(); G.setUI(false); try { G.lockPointer(); } catch (e) {} if (won) setTimeout(victoryScreen, 900); };
  }
  function dieNow() {
    if (X.done) return; X.done = true; X.stop = X.stop || {};
    flash('#600000', 0.9, 1800); X.shake = 1.5; hideCard();
    center('☠️', '#f44');
    let t = 0; X.fx.push(dt => { t += dt; X.cp = (X.cp || 0) - dt * 0.4; return t < 1.2; });
    setTimeout(() => { const api = X.api; cleanup(); api.die(); }, 1300);
  }
  function cleanup() {
    if (!X) return;
    cancelAnimationFrame(X.raf);
    removeEventListener('resize', onResize); removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKeyUp, true); removeEventListener('mouseup', onUp);
    try { X.figs.forEach(F => F.dispose()); } catch (e) {}
    try { X.world && X.world.dispose(); } catch (e) {}
    try { X.world && X.world.scene.traverse(o => { if (o.geometry && o.geometry.dispose) o.geometry.dispose(); }); } catch (e) {}
    if (X.menuEl && X.menuWas) X.menuEl.classList.remove('hidden');
    document.body.classList.remove('exploring');
    X.el.remove(); X = null; window.__pauseMain = false;
    try { G.renderer.setRenderTarget(null); } catch (e) {}
  }
  // ================= 输入 =================
  function onResize() { if (!X || !X.cam) return; X.cam.aspect = innerWidth / innerHeight; X.cam.updateProjectionMatrix(); }
  function onKey(e) {
    if (!X) return; e.stopPropagation();
    if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') { X.hold = true; e.preventDefault(); if (X.tw) X.tw.skip(); }
    const n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 }[e.code];
    if (n != null && X.keys && X.keys[n] && X.onPick && !X.tw) { const f = X.onPick; f(n, X.keys[n]); }
    if (e.code === 'Enter') { const b = X.el.querySelector('.ex-arrive.on button'); if (b) b.click(); }
    if (e.code === 'KeyM' && SFX.toggleMusic) SFX.toggleMusic();
  }
  function onKeyUp(e) { if (!X) return; e.stopPropagation(); if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') X.hold = false; }
  function onDown(e) { if (e.target.closest('button') || e.target.closest('.ex-card') || e.target.closest('.ex-arrive')) return; X.hold = true; X.hurry = Math.min(4, X.hurry + 1.2); }
  function onUp() { if (X) X.hold = false; }
  function onMove(e) { X.mx = (e.clientX / innerWidth - 0.5) * 2; X.my = (e.clientY / innerHeight - 0.5) * 2; }
  function onTouch(e) { if (e.target.closest('button') || e.target.closest('.ex-card') || e.target.closest('.ex-arrive')) return; e.preventDefault(); X.hold = true; X.hurry = Math.min(4, X.hurry + 1.2); }

  return { start, BOSSES, OUT, makeFigure, hooks: { choices: [], pick: null }, forceBoss: false, get active() { return !!X; }, get _X() { return X; }, checkVictory, victoryScreen, L };
})();
