// 《魂首窟》文本生成：种族/地点/身份/名字/个性/信仰/目的/外貌/背景/「回忆」斩首故事/远征故事
window.Lore = (() => {
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const pickN = (r, a, n) => { const c = a.slice(), o = []; while (o.length < n && c.length) o.push(c.splice(Math.floor(r() * c.length), 1)[0]); return o; };
  const wpick = (r, obj) => { let t = 0; for (const k in obj) t += obj[k]; let x = r() * t; for (const k in obj) { x -= obj[k]; if (x <= 0) return k; } return Object.keys(obj)[0]; };
  const chance = (r, p) => r() < p;
  const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => (o[k] !== undefined ? o[k] : '{' + k + '}'));

  // ---------------- 种族 ----------------
  const RACES = {
    human: { n: '人类', look: {}, syl: ['艾', '莉', '安', '娜', '塞', '琳', '薇', '拉', '贝', '丝', '卡', '洛', '蒂', '芙', '蕾', '雅', '米', '露', '伊', '莎', '缇', '妮', '玛', '格', '瑞', '希', '朵', '苔', '温', '海', '伦', '克', '萝', '黛', '茜'], sur: ['布兰特', '斯通', '霍克', '米勒', '格林', '温特', '阿什福德', '洛克伍德', '布莱克', '怀特', '塔纳', '费舍', '卡特', '哈珀', '韦伯', '克劳利', '索恩', '莫里斯', '贝尔', '德雷克', '奥斯汀', '温莎', '罗斯', '赫斯特'], noble: ['冯·', '德·', '范·'] },
    elf: { n: '精灵', look: { feat: ['elf'], skins: ['瓷白', '象牙', '象牙'], hair: ['铂金', '亚麻金', '银白', '翠绿', '薄荷', '月银蓝', '蜜糖金', '雪白'], eye: ['翡翠', '冰蓝', '金', '青碧', '苍紫'], acc: { circletS: 0.35, flowers: 0.3 } }, syl: ['艾', '琉', '希', '瑟', '菲', '兰', '缇', '薇', '恩', '雅', '洛', '瑞', '茵', '妮', '尔', '塔', '丽', '桑', '萨', '莉', '诺', '奥'], sur: ['月叶', '星语', '银歌', '晨露', '风吟', '青藤', '白桦', '夜莺', '霜花', '溪光', '橡心', '柳梢'] },
    halfelf: { n: '半精灵', look: { feat: ['elf', 'elf', null], skins: ['象牙', '蜜色', '瓷白'] }, syl: ['艾', '莉', '希', '娜', '瑟', '薇', '菲', '丝', '洛', '缇', '雅', '琳'], sur: ['半月', '河叶', '灰羽', '双歌', '流光', '雾林'] },
    darkelf: { n: '暗精灵', look: { feat: ['elf'], skins: ['灰紫', '暗青', '灰紫'], hair: ['银白', '雪白', '夜紫', '紫丁香', '铂金', '黑紫'], eye: ['血红', '紫罗兰', '金', '橙'], paint: 0.35 }, syl: ['薇', '赛', '伊', '莉', '丝', '卓', '莎', '维', '拉', '柯', '妮', '瑟', '娅', '缇', '玛'], sur: ['影刃', '夜蛛', '暗月', '毒棘', '深渊之女', '黑曜', '蛛后之裔', '无光'] },
    beast: { n: '兽人', look: { feat: ['beast'], skins: ['象牙', '蜜色', '小麦', '古铜'], paint: 0.4 }, syl: ['露', '琪', '卡', '雅', '萝', '铃', '米', '妮', '塔', '可', '蒂', '娅', '莉', '菈'], sur: ['灰爪', '赤牙', '银尾', '风鬃', '月嚎', '裂耳', '疾足', '血吻', '霜毛', '金瞳'], sub: ['狼族', '狐族', '猫族', '豹族', '兔族'] },
    demon: { n: '魅魔', look: { feat: ['horn', 'horn2'], skins: ['淡紫', '苍白', '赤红', '瓷白'], hair: ['黑紫', '夜紫', '血红', '酒红', '玫瑰', '乌黑', '雪白'], eye: ['血红', '金', '紫罗兰', '粉晶'], paint: 0.2 }, syl: ['莉', '瑟', '卡', '缪', '蕾', '维', '贝', '娜', '丝', '缇', '拉', '希', '墨', '妲'], sur: ['血蔷薇', '焰心', '渊语', '罪欲', '黑棘', '夜宴', '魂噬', '烬冠'] },
    angel: { n: '天使', look: { feat: ['halo'], skins: ['瓷白', '象牙'], hair: ['铂金', '雪白', '亚麻金', '蜜糖金', '银白', '冰蓝'], eye: ['金', '冰蓝', '银', '琥珀'], acc: { circletS: 0.3, circlet: 0.3 } }, syl: ['赛', '拉', '菲', '尔', '伊', '瑟', '琳', '亚', '米', '迦', '露', '恩'], sur: ['光翼', '圣辉', '晨星', '天秤', '白羽', '炽羽'] },
    dragon: { n: '龙裔', look: { feat: ['horn2'], skins: ['象牙', '蜜色', '瓷白', '小麦'], eye: ['金', '琥珀', '血红', '橙', '翡翠'], paint: 0.25 }, syl: ['伊', '格', '琳', '希', '娅', '薇', '珂', '缇', '奥', '瑟', '菈', '妲'], sur: ['焰鳞', '霜鳞', '雷鳞', '黑鳞', '金瞳', '龙喉', '炎翼'] },
    vampire: { n: '吸血鬼', look: { skins: ['苍白', '瓷白'], hair: ['乌黑', '血红', '银白', '酒红', '黑紫', '铂金'], eye: ['血红', '血红', '紫罗兰', '金'] }, syl: ['卡', '米', '拉', '伊', '莉', '丝', '薇', '缇', '娜', '瑟', '贝', '萝'], sur: ['血月', '夜冠', '蝠翼', '永眠', '赤棺', '凋蔷薇'] }
  };

  // ---------------- 身份 ----------------
  // r: 基础稀有度 0-4, acc: 饰品概率, wpn: 她的武器, act: 被遇到时在做什么, fight: 战斗方式
  const ID = {
    villager: { n: '村姑', r: 0, wpn: '晾衣叉', act: ['在溪边捶洗衣物', '提着水桶从井边走回家', '在麦田里捆麦穗'], fight: '抓起身边的一切往你脸上砸' },
    shepherd: { n: '牧羊女', r: 0, wpn: '牧羊杖', act: ['赶着羊群翻过山坡', '坐在石头上吹木笛'], fight: '挥舞牧羊杖，吹响求救的哨子' },
    barmaid: { n: '酒馆女侍', r: 0, wpn: '啤酒杯', act: ['端着满满一托盘麦酒', '在酒馆后门倒泔水'], fight: '把滚烫的炖锅泼了过来' },
    smithgirl: { n: '铁匠之女', r: 1, wpn: '锻锤', act: ['在铁砧前锤打一把镰刀', '拉着风箱'], fight: '抡起锻锤，一锤砸在你膝盖上' },
    herbalist: { n: '采药姑娘', r: 0, wpn: '药镰', act: ['跪在林边挖草根', '背着药篓哼着歌'], fight: '撒出一把刺鼻的药粉' },
    huntress: { n: '女猎户', r: 1, wpn: '猎弓', act: ['蹲在树上等鹿', '检查兽夹'], fight: '拉弓连射，箭箭奔着你的眼睛' },
    bard: { n: '流浪吟游诗人', r: 1, wpn: '鲁特琴', act: ['在篝火旁弹唱屠魔英雄的歌谣', '数着今天讨到的铜板'], fight: '用刺耳的魔音琴弦扰乱你的神志' },
    novice: { n: '见习修女', r: 1, wpn: '念珠', act: ['跪在路边神龛前祈祷', '给村里的病人送面包'], fight: '高举圣徽，念诵驱邪的祷文' },
    ranger: { n: '精灵游侠', r: 1, wpn: '双手短刀', act: ['在树冠间无声穿行', '追踪一头受伤的白鹿'], fight: '身形如风，双刀在你身上划出数十道口子' },
    druid: { n: '德鲁伊', r: 2, wpn: '橡木法杖', act: ['与一棵古树低声交谈', '在月光下的石环中冥想'], fight: '召唤藤蔓缠住你的四肢，又化身母熊扑来' },
    singer: { n: '林地歌者', r: 1, wpn: '竖琴', act: ['在瀑布旁唱着古老的歌', '教小鹿辨认浆果'], fight: '以歌声催眠，让你的眼皮沉重如铅' },
    archer: { n: '精灵弓手', r: 1, wpn: '月木长弓', act: ['在哨塔上警戒', '擦拭她的月木长弓'], fight: '三箭齐发，钉穿你的肩膀' },
    moonpriest: { n: '月神祭司', r: 2, wpn: '月牙镰', act: ['在祭坛上点燃月光香', '为逝去的族人吟唱安魂曲'], fight: '引下月光凝成锋刃' },
    elfprincess: { n: '精灵王女', r: 3, wpn: '世界树之枝', act: ['在侍卫簇拥下巡视森林', '独自在秘泉边沐浴月光'], fight: '唤醒整片森林与你为敌' },
    wolfwarrior: { n: '狼族战士', r: 1, wpn: '骨刃', act: ['在营火边啃着烤肉', '带着狼群巡猎'], fight: '獠牙与骨刃并用，像疯狼一样撕咬' },
    foxmiko: { n: '狐族巫女', r: 2, wpn: '符咒铃', act: ['在神社前摇铃', '用狐火占卜'], fight: '九团狐火绕身飞舞，灼烧你的皮肉' },
    catthief: { n: '猫族盗贼', r: 1, wpn: '匕首', act: ['正在偷你洞口的魂晶', '在屋檐上打盹'], fight: '闪到你背后，匕首直捅腰眼' },
    shaman: { n: '部落萨满', r: 2, wpn: '图腾杖', act: ['在图腾柱前跳着祈雨舞', '熬煮某种冒泡的汤药'], fight: '召唤祖灵附身，双眼燃起白火' },
    chieftess: { n: '兽人女酋长', r: 3, wpn: '双刃战斧', act: ['在王座上审判俘虏', '独自一人徒手搏杀巨熊'], fight: '战斧每一次落下都带着开山裂石之力' },
    falconer: { n: '驯鹰人', r: 1, wpn: '鹰爪手套', act: ['放飞她的猎鹰', '给雏鹰喂食'], fight: '猎鹰俯冲啄向你的眼睛' },
    nun: { n: '修女', r: 1, wpn: '铁十字', act: ['在回廊下抄写经文', '敲响晚祷的钟'], fight: '颤抖着举起十字架，结结巴巴念着驱魔词' },
    paladin: { n: '圣骑士', r: 2, wpn: '圣光战锤', act: ['在庭院里操练', '为出征的战马祈福'], fight: '战锤裹着圣光，每一击都烫得你皮开肉绽' },
    choir: { n: '圣歌队长', r: 1, wpn: '银铃杖', act: ['指挥着唱诗班', '在钟楼顶独自练声'], fight: '圣歌化作音浪冲击你的耳膜' },
    inquisitor: { n: '审判官', r: 2, wpn: '链锯剑', act: ['正在拷问一名异端', '在火刑柱前宣读罪状'], fight: '一边念着你的罪行，一边用铁链鞭笞你' },
    saint: { n: '圣女', r: 3, wpn: '圣杯', act: ['在大殿中央悬浮祈祷', '为朝圣者洗足'], fight: '圣光如瀑布倾泻，几乎把你烧成焦炭' },
    abbess: { n: '修道院长', r: 2, wpn: '钥匙串', act: ['清点地窖里的圣物', '训斥偷懒的修女'], fight: '启动了修道院的古老防御结界' },
    witch: { n: '魔女', r: 1, wpn: '扫帚', act: ['在大锅里熬着蛤蟆汤', '骑着扫帚在沼泽上空巡游'], fight: '把你的脚趾变成了蠕虫（暂时的）' },
    alchemist: { n: '药剂师', r: 1, wpn: '爆炸药瓶', act: ['调配一瓶冒绿烟的药剂', '在沼泽里采集发光苔藓'], fight: '扔出一串爆炸药瓶，炸得你满脸是血' },
    hexer: { n: '诅咒师', r: 2, wpn: '稻草人偶', act: ['往人偶上扎针', '在墓地里收集骨灰'], fight: '拔下你一根毛发，塞进人偶里狠狠一拧' },
    bogwitch: { n: '沼泽女巫', r: 2, wpn: '骨杖', act: ['唤醒沉在泥里的尸骸', '和一只乌鸦讨价还价'], fight: '从泥沼中召唤出成群的溺尸抓住你的腿' },
    covenlady: { n: '魔女集会之主', r: 3, wpn: '禁书', act: ['主持月圆之夜的黑弥撒', '在高塔中翻阅禁书'], fight: '念出一个音节，整片沼泽都沸腾了' },
    countess: { n: '吸血鬼伯爵夫人', r: 3, wpn: '血刃', act: ['在血池中沐浴', '举办一场只有她一个活人的晚宴'], fight: '化作蝙蝠群，又在你身后凝聚，吸走你的血' },
    knight: { n: '女骑士', r: 2, wpn: '长剑与塔盾', act: ['在城墙上巡逻', '擦拭她祖传的盔甲'], fight: '盾墙推进，长剑从盾缝中精准刺出' },
    merc: { n: '佣兵队长', r: 1, wpn: '双手巨剑', act: ['在营帐里清点赏金', '和手下掷骰子'], fight: '巨剑横扫，一边骂着最脏的脏话' },
    crossbow: { n: '弩手', r: 1, wpn: '重弩', act: ['在箭塔上瞄准', '给弩弦上油'], fight: '一发重弩几乎射穿你的肚子' },
    medic: { n: '战地医师', r: 1, wpn: '骨锯', act: ['在伤兵营里截肢', '清洗沾血的绷带'], fight: '骨锯锯进你的胳膊，她居然还在冷静地计算失血量' },
    engineer: { n: '攻城工程师', r: 1, wpn: '火油弹', act: ['校准投石机', '画着城防图纸'], fight: '点燃了一整排火油桶' },
    general: { n: '女将军', r: 3, wpn: '将军斩马刀', act: ['在沙盘前指挥千军', '在校场上单挑三名百夫长'], fight: '刀势如潮，每一刀都是教科书般的杀招' },
    dragonknight: { n: '龙骑士', r: 3, wpn: '龙枪', act: ['骑着飞龙巡视边境', '给她的龙刷鳞片'], fight: '自高空俯冲，龙枪直贯而下' },
    princess: { n: '公主', r: 3, wpn: '镶宝石的礼仪剑', act: ['在花园里喂孔雀', '偷偷溜出宫去逛集市'], fight: '尖叫着拔出那把从没开过刃的礼仪剑' },
    lady: { n: '贵族千金', r: 2, wpn: '扇子', act: ['在舞会上被众人簇拥', '在马车里补妆'], fight: '用扇子打你的脸，然后大喊“你知道我父亲是谁吗”' },
    courtmage: { n: '宫廷法师', r: 2, wpn: '水晶法杖', act: ['在观星台记录星象', '给国王表演烟火魔法'], fight: '陨石术、冰枪术、闪电链，一个比一个疼' },
    assassin: { n: '皇家刺客', r: 2, wpn: '淬毒袖剑', act: ['潜伏在房梁上', '擦去刀刃上的血'], fight: '袖剑上的毒让你半边身子都麻了' },
    guard: { n: '女王近卫', r: 2, wpn: '戟', act: ['守在女王寝宫门口', '在走廊里巡逻'], fight: '以命相搏，死死挡在门前' },
    musician: { n: '宫廷乐师', r: 1, wpn: '小提琴', act: ['为宴会演奏', '在月下拉着忧伤的曲子'], fight: '琴弓折断后，她用琴弦勒住了你的手指' },
    queen: { n: '女王', r: 4, wpn: '王权之剑', act: ['端坐在黄金王座上', '在密室里批阅战报'], fight: '王权之剑一出，整座王都的禁制都向你压来' },
    succubus: { n: '魅魔', r: 2, wpn: '鞭子', act: ['在深渊酒馆里勾引恶魔', '吸食一个倒霉冒险者的梦境'], fight: '鞭子缠住你的脖子，媚术侵蚀你的心智' },
    fallen: { n: '堕天使', r: 3, wpn: '黑焰圣剑', act: ['坐在裂隙边缘俯瞰深渊', '撕下自己最后一根白羽'], fight: '黑色的圣焰与残存的神性交替爆发' },
    duchess: { n: '恶魔公爵', r: 3, wpn: '地狱长枪', act: ['在骸骨宫殿中接见下属', '惩罚一个失职的小恶魔'], fight: '地狱火从地缝中喷涌而出' },
    shadow: { n: '暗影刺客', r: 2, wpn: '影刃', act: ['与影子融为一体', '在裂隙边缘磨刀'], fight: '从你自己的影子里刺出刀来' },
    abyssqueen: { n: '深渊女王', r: 4, wpn: '万魂权杖', act: ['在王座上吞噬罪魂', '俯瞰着翻腾的魂海'], fight: '万千怨魂从权杖中涌出，撕扯你的灵魂' },
    dragonprincess: { n: '龙裔公主', r: 3, wpn: '龙息', act: ['在龙巢里数着财宝', '在山巅迎风而立'], fight: '张口喷出龙息，熔化了你脚下的岩石' },
    avatar: { n: '女神化身', r: 4, wpn: '神罚', act: ['在云端俯视人间', '于神殿中接受万民朝拜'], fight: '一句神谕，天雷滚滚而下' },
    archangel: { n: '天使长', r: 4, wpn: '炽天之剑', act: ['率领天使军团巡视圣山', '审判着堕落者'], fight: '六翼展开，炽天之剑斩落星辰' },
    dragonslayer: { n: '屠龙者', r: 3, wpn: '屠龙巨剑', act: ['在龙骨堆上歇息', '给一头幼龙补刀'], fight: '屠龙的剑技，对付食人魔也绰绰有余' },
    dragonmiko: { n: '龙之巫女', r: 3, wpn: '龙骨铃', act: ['在龙神祭坛前起舞', '为沉睡的古龙唱摇篮曲'], fight: '唤醒古龙之魂附于己身' }
  };
  // 身份饰品
  const ID_ACC = { princess: { tiara: 0.7, crown: 0.2 }, queen: { crown: 1 }, elfprincess: { tiara: 0.8, flowers: 0.3 }, lady: { tiara: 0.35 }, saint: { circletS: 0.8 }, abbess: { circletS: 0.3 },
    witch: { witchhat: 0.85 }, covenlady: { witchhat: 0.7, circlet: 0.3 }, bogwitch: { witchhat: 0.4 }, hexer: { witchhat: 0.25 }, druid: { flowers: 0.6 }, singer: { flowers: 0.5 }, herbalist: { flowers: 0.4 }, villager: { flowers: 0.15 },
    duchess: { crown: 0.5 }, abyssqueen: { crown: 1 }, dragonprincess: { tiara: 0.6 }, countess: { tiara: 0.5 }, courtmage: { circlet: 0.5 }, avatar: { circlet: 0.7 }, archangel: { circlet: 0.5 }, general: { circlet: 0.3 }, chieftess: {}, foxmiko: { flowers: 0.3 } };

  // ---------------- 地点 ----------------
  const LOCS = [
    { k: 'village', n: '雾溪村', icon: '🏘️', rec: 40, color: '#8fb07a', desc: '炊烟袅袅的小村庄。村民手无寸铁，适合新手食人魔。', races: { human: 85, halfelf: 10, beast: 5 }, ids: { villager: 5, shepherd: 3, barmaid: 3, smithgirl: 2, herbalist: 3, huntress: 2, bard: 1, novice: 1 }, loot: [20, 60],
      scene: ['晨雾还没散去，雾溪村的鸡才刚叫第一遍。', '村口的稻草人被你一脚踩扁。', '炊烟从茅草屋顶升起，空气里有烤面包的味道——还有人的味道。'] },
    { k: 'forest', n: '翠影精灵林', icon: '🌲', rec: 80, color: '#3aa060', desc: '古树参天，精灵们在树冠上建起月光之城。', races: { elf: 70, halfelf: 20, beast: 10 }, ids: { ranger: 4, druid: 2, singer: 3, archer: 4, moonpriest: 1.5, elfprincess: 0.4 }, loot: [40, 120],
      scene: ['巨木的树根像蟒蛇一样盘在地上，萤火虫在你身边打转。', '树冠上传来精灵的歌声，歌声在你踏入的瞬间戛然而止。', '你撞断了一棵据说有三千年树龄的古橡树。'] },
    { k: 'wilds', n: '兽牙荒原', icon: '🐺', rec: 130, color: '#b08a4a', desc: '风沙呼啸的荒原，兽人部落逐水草而居。', races: { beast: 80, human: 15, halfelf: 5 }, ids: { wolfwarrior: 4, foxmiko: 2, catthief: 3, shaman: 2, chieftess: 0.5, falconer: 2 }, loot: [60, 180],
      scene: ['风沙打在你的獠牙上沙沙作响。', '远处的部落营地燃着篝火，图腾柱上挂着狼头。', '荒原上的秃鹫一路跟着你，它们知道你会留下什么。'] },
    { k: 'abbey', n: '白银修道院', icon: '⛪', rec: 200, color: '#c8d0e0', desc: '圣光笼罩的修道院，圣骑士与修女守护着圣物。', races: { human: 80, angel: 8, halfelf: 12 }, ids: { nun: 5, paladin: 2, choir: 2, inquisitor: 1.5, saint: 0.5, abbess: 1 }, loot: [90, 260],
      scene: ['晚祷的钟声回荡在山谷里，白银修道院的尖顶在夕阳下发光。', '你推倒了修道院的大门，门上“邪恶止步”的铭文碎了一地。', '彩绘玻璃窗上画着圣骑士斩杀食人魔的故事。你觉得画得不太像。'] },
    { k: 'swamp', n: '黑沼魔女泽', icon: '🧙', rec: 300, color: '#6a4a8a', desc: '毒雾弥漫的沼泽，魔女与不死者的乐园。', races: { human: 50, darkelf: 20, demon: 12, vampire: 18 }, ids: { witch: 4, alchemist: 3, hexer: 2, bogwitch: 2, covenlady: 0.5, countess: 0.5 }, loot: [120, 360],
      scene: ['沼泽冒着绿色的气泡，每一个泡破掉都像是一声叹息。', '枯树上挂满了风干的蛤蟆和小动物骨头做成的风铃。', '毒雾中有什么东西在低语你的名字。'] },
    { k: 'fortress', n: '铁盔要塞', icon: '🏰', rec: 450, color: '#8a8a94', desc: '王国边境的铁血要塞，女骑士与佣兵驻守。', races: { human: 70, dragon: 8, beast: 10, halfelf: 12 }, ids: { knight: 4, merc: 3, crossbow: 3, medic: 2, engineer: 2, general: 0.4, dragonknight: 0.4 }, loot: [180, 520],
      scene: ['要塞的城墙上插满了旗帜，号角声此起彼伏。', '城下堆着无数失败攻城者的骸骨——其中有几具是食人魔的。', '你徒手掀翻了一架投石机。守军的脸色变了。'] },
    { k: 'capital', n: '金冠王都', icon: '👑', rec: 700, color: '#e0b040', desc: '繁华的王都，公主、贵族和宫廷法师都住在这里。', races: { human: 70, elf: 12, halfelf: 18 }, ids: { princess: 1.2, lady: 3, courtmage: 2, assassin: 2, guard: 3, musician: 2, queen: 0.15 }, loot: [300, 800],
      scene: ['王都的大理石街道在月光下泛着光，舞会的音乐从宫殿里飘出。', '你踩碎了广场中央的国王雕像，鸽子四散飞逃。', '护城河里的水被你搅成了红色。'] },
    { k: 'abyss', n: '深渊裂隙', icon: '🔥', rec: 1100, color: '#c0302a', desc: '大地的伤口，魔族与堕落者从中涌出。', races: { demon: 50, darkelf: 22, vampire: 13, angel: 15 }, ids: { succubus: 4, fallen: 1.5, duchess: 1, shadow: 3, abyssqueen: 0.25 }, loot: [500, 1300],
      scene: ['裂隙中喷出硫磺味的热风，远处传来万魂的哀嚎。', '岩浆河上架着骸骨桥，你每走一步桥都在呻吟。', '深渊在凝视你。你凝视回去。深渊先移开了目光。'] },
    { k: 'peak', n: '龙骨圣山', icon: '🐉', rec: 1700, color: '#f0e0a0', desc: '神话之地。龙裔、天使与女神在云端之上。', races: { dragon: 50, angel: 32, elf: 18 }, ids: { dragonprincess: 2, avatar: 0.5, archangel: 0.8, dragonslayer: 2, dragonmiko: 2 }, loot: [900, 2200],
      scene: ['你爬过了一截横在山道上的古龙肋骨，每一根都有城墙那么粗。', '云海在脚下翻涌，空气稀薄得让你的肺像着了火。', '圣山之巅的神殿发出刺眼的金光，那是凡人一生都到不了的地方。'] }
  ];

  const TRAITS = ['高傲', '温柔', '冷酷', '天真', '狡黠', '暴躁', '胆小', '虔诚', '贪婪', '忠诚', '孤僻', '开朗', '毒舌', '固执', '多疑', '浪漫', '懒散', '勇敢', '残忍', '慈悲', '好奇', '野心勃勃', '优柔寡断', '自恋', '沉默寡言', '爱哭', '好战', '腹黑', '迷糊', '严谨', '叛逆', '嫉妒心强', '乐观', '悲观', '神经质', '洁癖', '贪吃', '话痨', '傲娇', '偏执', '多情', '冷静', '骄纵', '坚韧', '善变'];
  const BELIEF = {
    common: ['圣光教会', '丰收女神德米拉', '无神论——只信自己的拳头', '金币', '祖先之魂', '星辰占卜', '秩序之神', '战神', '智慧之神', '爱神', '命运三女神', '海神', '旅者之神'],
    elf: ['月神希琳', '世界树', '古树之灵', '星辰之歌'], halfelf: ['月神希琳', '圣光教会', '自由'],
    beast: ['狼祖', '大地之母', '风暴之灵', '祖灵'], darkelf: ['蛛后罗丝', '无光之神', '复仇'], demon: ['深渊之主', '欲望本身', '混沌'],
    angel: ['至高神', '天秤审判', '圣光'], dragon: ['龙神', '力量', '血脉荣耀'], vampire: ['血月', '永夜女神', '死亡女神']
  };
  const GOALS = ['为被杀的父亲报仇', '找到失散多年的妹妹', '成为王国第一剑士', '攒够自己的嫁妆', '亲手斩杀洞穴食人魔格罗克', '寻找传说中的圣杯', '摆脱家族强加的婚约', '复兴没落的家族', '研究被禁止的死灵魔法', '成为大魔导师', '开一家属于自己的酒馆', '在死前看一次大海', '证明自己不是废物', '统治整个王国', '赎清过去犯下的罪孽', '守护她的村子', '找回被偷走的记忆', '与心上人私奔', '找到治愈瘟疫的药方', '登上龙骨圣山之巅', '写一本流传后世的诗集', '驯服一头真正的龙', '让妹妹吃上一顿饱饭', '揭穿教会的谎言', '成为传奇冒险者', '杀光所有魔物', '活到一百岁', '被所有人记住', '偿还父亲的赌债', '找到自己的亲生母亲', '把她的名字刻在英雄碑上', '打败那个一直压她一头的宿敌', '收集世上所有种类的蝴蝶', '当上女王', '在王都拥有一座带花园的房子'];
  const HAIRSTYLE = { Sendagaya_Shino: '黑长直式长发', Sendagaya_Shibu: '齐肩短发', Darkness_Shibu: '凌乱短发', Vivi: '蘑菇头', Vita: '蓬松短发', Victoria_Rubin: '侧马尾', HairSample_Female: '双马尾', AvatarSample_A: '波波头', AvatarSample_B: '编辫长发', AvatarSample_D_Darkness: '姬发式长发', Base_Female: '盘发', 'Seed-san': '利落短发', Twist: '及腰长发', Godette: '双丸子头', AvatarSample_K: '姬发式长发', AvatarSample_L: '凌乱碎短发', AvatarSample_S: '蓬松短发' };
  const HX_TXT = { pony: '在脑后束成一束高马尾', twin: '左右各扎一束双马尾', drill: '两侧垂着螺旋的钻头卷', bun: '在头顶挽成一个丸子', odango: '在头顶两侧盘着双丸子', braid: '在脑后编成一条麻花辫', braid2: '两侧各垂一条麻花辫' };
  const FEAT_TXT = { elf: '一对尖长的精灵耳', horn: '一对弯曲的魔角', horn2: '一对短小的龙角', beast: '一对毛茸茸的兽耳', halo: '头顶悬着一圈残光的光环' };
  const ACC_TXT = { circlet: '金色额环', circletS: '银色额环', crown: '王冠', tiara: '宝石头冠', flowers: '花冠', witchhat: '尖顶魔女帽', patch: '黑色眼罩' };
  const RAR = ['凡魂', '灵魂', '英魂', '圣魂', '神魂'];

  // ---------------- 名字 ----------------
  function makeName(r, race, id, used) {
    const R = RACES[race];
    for (let tries = 0; tries < 40; tries++) {
      const len = r() < 0.55 ? 2 : 3;
      let g = ''; for (let i = 0; i < len; i++) g += pick(r, R.syl);
      if (/(.)\1/.test(g)) continue;
      let full;
      const noble = ['princess', 'queen', 'lady', 'elfprincess', 'countess', 'duchess', 'general'].includes(id);
      if (race === 'human') full = g + '·' + (noble ? pick(r, R.noble) : '') + pick(r, R.sur);
      else if (race === 'beast') full = g + '·' + pick(r, R.sur);
      else full = g + '·' + pick(r, R.sur);
      if (tries > 20) full += '·' + pick(r, ['二世', '三世', '小', '幼女', '长女', '次女', '之女']);
      if (!used || !used.has(full)) return full;
    }
    return '无名者' + Math.floor(r() * 99999);
  }

  function rollRace(r, loc) { return wpick(r, loc.races); }
  function rollId(r, loc) { return wpick(r, loc.ids); }

  // 生成一个角色（文本 + 外观约束）
  function makeCharacter(r, loc, usedNames, luck = 0) {
    const race = rollRace(r, loc);
    const idk = rollId(r, loc);
    const I = ID[idk];
    let rar = I.r;
    if (chance(r, 0.18 + luck * 0.02)) rar++;
    if (chance(r, 0.05 + luck * 0.01)) rar++;
    if (chance(r, 0.1)) rar--;
    rar = Math.max(0, Math.min(4, rar));
    const R = RACES[race];
    const sub = R.sub ? pick(r, R.sub) : '';
    const name = makeName(r, race, idk, usedNames);
    const age = race === 'elf' || race === 'darkelf' ? 80 + Math.floor(r() * 600) : race === 'vampire' ? 120 + Math.floor(r() * 400) : race === 'angel' || race === 'dragon' ? 50 + Math.floor(r() * 900) : 16 + Math.floor(r() * 18);
    const traits = pickN(r, TRAITS, 2);
    const belief = pick(r, (BELIEF[race] || []).concat(r() < 0.4 ? BELIEF.common : []).concat(BELIEF[race] ? [] : BELIEF.common));
    const goal = pick(r, GOALS);
    const lookRace = Object.assign({}, R.look);
    lookRace.acc = Object.assign({}, R.look.acc || {}, ID_ACC[idk] || {});
    if (race === 'beast' && sub === '兔族') lookRace.feat = ['beast'];
    return { race, raceN: R.n + (sub ? '（' + sub + '）' : ''), id: idk, idN: I.n, rar, name, age, traits, belief, goal, loc: loc.k, locN: loc.n, lookRace };
  }

  function appearance(c, look) {
    const hs = HAIRSTYLE[look.h] || '长发';
    let s = `${look.hn}${look.hn2 !== look.hn ? '渐变' + look.hn2 : ''}色的${hs}${look.hx && HX_TXT[look.hx.s] ? '，' + HX_TXT[look.hx.s] : ''}${look.hx && look.hx.ahoge ? '，头顶翘着' + (look.hx.ahoge > 1 ? '两根' : '一根') + '呆毛' : ''}，${look.en}${look.en2 !== look.en ? '与' + look.en2 + '异色' : ''}的眼瞳（如今已蒙上一层死灰），${look.sk}色的肌肤`;
    if (look.feat && FEAT_TXT[look.feat]) s += '，' + FEAT_TXT[look.feat];
    const acc = (look.acc || []).map(a => ACC_TXT[a]).filter(Boolean);
    if (acc.length) s += '，戴着' + acc.join('与');
    if (look.scar) s += '，脸上有一道旧伤疤';
    if (look.paint) s += '，脸上涂着' + ['', '部族战纹', '竖直的血誓纹', '额心的圣印', '遮目的黑纹'][look.paint];
    const exd = { half: '双眼半阖，像是困极了', closed: '双眼紧闭，神情意外地安详', stare: '双眼圆睁，死死盯着前方', slack: '嘴巴松垮地张着，目光涣散', agony: '眉头紧锁，牙关咬紧，定格在最后的痛苦里', wide: '眼睛和嘴都张得大大的，仿佛最后一刻还在惊叫' }[look.exT] || '';
    return s + '。' + exd + '。';
  }

  function backstory(r, c) {
    const I = ID[c.id];
    const openers = [`{name}是{locN}出了名的{idN}。`, `在{locN}，人人都认识那位{t0}的{idN}——{name}。`, `{name}，{age}岁，{raceN}，{locN}的{idN}。`];
    const mids = [`她{t0}而{t1}，信奉{belief}，`, `熟人说她{t0}，却也{t1}；她一生信奉{belief}，`, `她性格{t0}、{t1}，在{belief}的神像前立过誓，`];
    const ends = [`一心只想{goal}。`, `毕生的心愿是{goal}。`, `她说过，总有一天要{goal}。`, `直到死前那一刻，她都还想着要{goal}。`];
    const o = Object.assign({ t0: c.traits[0], t1: c.traits[1] }, c);
    return fill(pick(r, openers), o) + fill(pick(r, mids), o) + fill(pick(r, ends), o);
  }

  // ---------------- 「回忆」：斩首的经过 ----------------
  function memory(r, c, ctx) {
    // ctx: {weapon, hurt(0-1), q(战力比), locScene}
    const I = ID[c.id];
    const o = Object.assign({ t0: c.traits[0], t1: c.traits[1], w: ctx.weapon, her: I.wpn, act: pick(r, I.act), fight: I.fight }, c);
    const P = [];
    P.push(pick(r, [
      `那是在{locN}。{name}正{act}，完全没注意到身后那团越来越大的阴影。`,
      `你在{locN}发现她的时候，{name}正{act}。`,
      `{locN}的风里有她的气味。你循着气味找到了{name}——她正{act}。`
    ]));
    // 反应（按个性）
    const react = {
      '胆小': '她看见你的一瞬间就腿软了，手里的东西掉在地上。', '爱哭': '她还没开打就先哭了出来，眼泪和鼻涕糊了一脸。', '勇敢': '她没有逃。她握紧了{her}，挡在你面前。', '好战': '她反而笑了：“终于来了个像样的对手！”', '高傲': '她抬起下巴：“区区一头食人魔，也敢挡本小姐的路？”',
      '冷酷': '她一言不发，眼神冷得像冰，已经在计算你的弱点。', '虔诚': '她跪下来飞快地祈祷，求{belief}赐她力量。', '傲娇': '“才、才不怕你呢！”她的声音在发抖。', '毒舌': '“你身上的味道比沼泽还臭，”她捏着鼻子说，“离我远点。”', '狡黠': '她假装投降，却偷偷把手伸向了背后。',
      '天真': '她歪着头问你：“你迷路了吗？要不要我带你回家？”', '暴躁': '“滚开！”她吼得比你还大声。', '腹黑': '她甜甜地笑着向你走来，袖子里藏着刀。', '话痨': '她一边后退一边语速飞快地讲着她家里还有生病的母亲和三只猫。'
    };
    const k = c.traits.find(t => react[t]);
    P.push(k ? react[k] : pick(r, ['她尖叫起来，声音在四周回荡。', '她愣了一秒，然后转身就跑。', '她咬紧嘴唇，摆出了架势。', '“是……是格罗克！”她认出了你，脸色惨白。']));
    // 战斗
    if (ctx.q > 1.6) {
      P.push(pick(r, [`战斗短得可笑。她{fight}——但这些对你来说连挠痒都算不上。你一把攥住她的腰，把她整个人提了起来。`, `她{fight}。你站着没动，任由那些攻击落在你岩石般的皮肤上，然后轻轻一挥{w}，她就飞了出去，撞在墙上滑落下来。`, `你甚至没用上{w}。一巴掌下去，她手里的{her}就断成了两截。`]));
    } else if (ctx.q > 0.9) {
      P.push(pick(r, [`她{fight}，确实有两下子。你身上多了几道口子，血顺着獠牙往下滴——但这只让你更兴奋了。`, `你们缠斗了很久。她{fight}，你被打得踉跄后退了两步。然后你咆哮着抡起{w}，一击砸碎了她的防御。`, `她比你想象的难缠：{fight}。你挨了几下狠的，但{w}终究还是找到了她的破绽。`]));
    } else {
      P.push(pick(r, [`这是一场恶战。她{fight}，你几次差点倒下，半边身子都被鲜血浸透。最后是运气——她脚下一滑，你的{w}才终于落了下去。`, `你低估了她。她{fight}，你断了两根肋骨，眼前一阵阵发黑。你用尽最后的力气扑上去，把她压在身下。`]));
    }
    // 斩首（黑暗奇幻）
    P.push(pick(r, [
      `你把她按在地上，{w}高高举起。她最后看了一眼天空。{w}落下时的声音很闷，像劈开一截湿木头。她的头滚出去两步，停在一丛野草边，眼睛还睁着。`,
      `你单手掐住她的脖子把她举到面前。她踢着腿，指甲在你手背上划出血痕。你另一只手握住她的头，一拧，一扯——骨头断裂的声音清脆得出奇。热血喷了你一脸。`,
      `{w}横扫而过。一瞬间什么都没发生，然后她的头才慢慢从肩膀上滑落，身体还往前走了半步才跪倒。`,
      `她还想说什么。你没给她机会。一刀，两刀——第二刀才砍断颈骨。你拎着她的头发把头提起来，血顺着断口滴成一条线。`,
      `你抓住她的双马尾……不，你抓住她的头发，像拔萝卜一样把她拎起来，然后{w}一挥，身体掉了下去，头还留在你手里晃荡。`
    ]).replace('你抓住她的双马尾……不，', ''));
    // 遗言
    P.push(pick(r, [
      `她的嘴唇还在动。你凑近了听，她在说：“我还没有……{goal}……”`,
      `她最后的遗言是向{belief}祈祷。{belief}没有回应。`,
      `临死前她瞪着你，一字一顿：“总有人……会来杀你的。”`,
      `她没留下遗言，只有一声短促的抽气。`,
      `“妈妈……”这是她说的最后一个词。`,
      `她居然笑了一下：“至少……不用再{goal}了……”`
    ]));
    P.push(pick(r, [`你把她的头塞进背篓。她的残魂在里面轻轻颤抖——回到洞窟后，它会为你渗出上好的魂晶。`, `你舔掉獠牙上的血，把头夹在腋下往回走。{rarN}级的残魂，今晚可以好好“把玩”了。`, `你把头举到眼前端详了一会儿。{t0}的女人，魂也带着{t0}的味道。你喜欢。`]));
    const txt = P.map(p => fill(p, Object.assign({ rarN: RAR[c.rar] }, o))).join('\n\n');
    return txt;
  }

  // ---------------- 远征：事件与故事 ----------------
  function travelEvents(r, loc) {
    const ev = [
      { t: '你在路上踩中了一个猎人留下的捕兽夹，铁齿咬进了你的脚踝。', hp: -0.05 },
      { t: '一队巡逻兵发现了你。你把领头的扔进了河里，但也挨了好几枪矛。', hp: -0.08 },
      { t: '你在废墟里翻到一个锈迹斑斑的宝箱，里面有些魂晶。', coin: 1 },
      { t: '你抓了一头野猪当点心，精神为之一振。', hp: 0.05 },
      { t: '暴雨倾盆，山路泥泞，你摔了一跤滚下山坡。', hp: -0.04 },
      { t: '路边的神龛里供着几枚魂晶。你顺手拿走了，神像的眼睛好像动了一下。', coin: 0.6 },
      { t: '一个吟游诗人远远看见你，吓得弃琴而逃。你把琴踩成了柴火。' },
      { t: '一群乌鸦跟在你身后，嘎嘎叫着像是在给你报幕。' },
      { t: '你在河边喝水，河水倒映出你满是伤疤的脸。你咧嘴笑了笑，吓跑了一群鱼。' },
      { t: '冒险者公会贴出了悬赏你的告示。你撕下来擦了擦屁股。' },
      { t: '一个醉醺醺的矮人向你挑衅。你把他塞进了他自己的酒桶。', hp: -0.02 }
    ];
    return pickN(r, ev, 2 + Math.floor(r() * 2));
  }

  return { RACES, ID, LOCS, TRAITS, RAR, HAIRSTYLE, makeCharacter, appearance, backstory, memory, travelEvents, pick, pickN, fill, chance };
})();
