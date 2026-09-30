# -*- coding: utf-8 -*-
# 游戏主界面：装备 / 材料 / 品阶 / 标签页 / 战斗飘字 / 成就
D = [
# attributes (rpg)
("提高战力（攻击）","Raises Power (attack)","戦力（攻撃）を上げる"),("提高生命上限与战力","Raises max HP and Power","最大HPと戦力を上げる"),("闪避伤害、提高战力","Avoids damage, raises Power","ダメージを回避し、戦力を上げる"),
("敌人更易崩溃投降，多带回首级","Enemies break and surrender more easily — more heads to bring home","敵が崩れて降参しやすくなり、持ち帰れる首級が増える"),
("武器","Weapon","武器"),("头盔","Helm","兜"),("护甲","Armor","鎧"),("护符","Charm","護符"),("背篓","Backpack","背負い籠"),("无","None","なし"),
# weapons
("粗木棒","Rough Club","粗末な棍棒"),("随手折的树干。","A trunk snapped off at random.","その辺でへし折った木の幹。"),("钉头棒","Spiked Club","鋲付き棍棒"),("木棒上钉满了生锈的铁钉。","A club studded with rusty nails.","錆びた釘だらけの木の棒。"),
("骨刃砍刀","Bone Cleaver","骨刃の鉈"),("铁链流星锤","Chain Flail","鎖付き流星鎚"),("一甩就是一片血雾。","One swing, a cloud of blood.","振り回せば血煙が舞う。"),("斩首巨斧","Beheading Greataxe","斬首の大斧"),("月蚀魂镰","Eclipse Soul Scythe","月蝕の魂鎌"),("噬神者","Godeater","神喰らい"),("据说斩过一位真正的神。","Said to have slain a true god.","本物の神を斬ったと言われる。"),
("兽骨头盔","Beast-bone Helm","獣骨の兜"),("熊头骨做的。","Made from a bear skull.","熊の頭骨で作られている。"),("铁桶盔","Bucket Helm","鉄桶兜"),("恶魔角盔","Demon-horn Helm","悪魔角の兜"),("戴上后连自己都有点怕自己。","Wearing it, even you are a little afraid of yourself.","被ると自分でも少し怖くなる。"),("龙颅盔","Dragon-skull Helm","竜頭蓋の兜"),("一整颗幼龙头骨。","An entire young dragon's skull.","幼竜の頭骨まるごと。"),
("破兽皮","Tattered Hide","破れた獣皮"),("厚熊皮","Thick Bearskin","分厚い熊皮"),("温暖又结实。","Warm and sturdy.","暖かくて頑丈。"),("缝合锁子甲","Stitched Mail","縫い合わせの鎖帷子"),("十几件锁子甲缝成一件。","A dozen mail shirts sewn into one.","十数着の鎖帷子を縫い合わせた一着。"),("巨人板甲","Giant's Plate","巨人の板金鎧"),("山丘巨人的遗物。","A relic of the hill giants.","丘の巨人の遺品。"),("黑曜石甲","Obsidian Armor","黒曜石の鎧"),("刀枪不入，只是有点重。","Impervious to blades — just a bit heavy.","刀も槍も通さない。ただ少し重い。"),("龙鳞重铠","Dragonscale Plate","竜鱗の重鎧"),("每一片鳞都能挡住一次龙息。","Every scale can block a dragon's breath once.","鱗一枚ごとに竜の息吹を一度防げる。"),
("鼠骨项链","Rat-bone Necklace","鼠骨のネックレス"),("据说能带来好运。","Said to bring good luck.","幸運を呼ぶと言われる。"),("狼牙护符","Wolf-fang Charm","狼牙の護符"),("十二颗狼王的牙。","Twelve fangs of the wolf king.","狼王の牙12本。"),("月之泪","Moon's Tear","月の涙"),("魔女的心脏","Witch's Heart","魔女の心臓"),("还在跳。","Still beating.","まだ脈打っている。"),("神之眼","Eye of God","神の眼"),("能看见每一个魂魄的价格。","Sees the price of every soul.","すべての魂の値段が見える。"),
("破麻袋","Torn Sack","破れた麻袋"),("一次最多装 2 颗头。","Holds up to 2 heads at a time.","一度に最大2個の首を入れられる。"),("皮囊","Leather Pouch","革袋"),("最多装 3 颗。","Holds up to 3.","最大3個。"),("大藤篓","Big Wicker Basket","大きな藤籠"),("最多装 4 颗。","Holds up to 4.","最大4個。"),("铁笼背架","Iron-cage Rack","鉄籠の背負子"),("最多装 5 颗。","Holds up to 5.","最大5個。"),("尸布大包","Shroud Bundle","屍布の大包み"),("最多装 6 颗。","Holds up to 6.","最大6個。"),("魂之匣","Soul Box","魂の匣"),("空间魔法，最多装 8 颗。","Space magic — holds up to 8.","空間魔法、最大8個。"),
("血肉药剂","Flesh Potion","血肉ポーション"),("立刻恢复 40% 生命。","Instantly restores 40% HP.","即座にHPを40%回復する。"),("巨魔再生药","Troll Regen Potion","トロル再生薬"),("立刻恢复全部生命。","Instantly restores all HP.","即座にHPを全回復する。"),
# rarity / soul ranks / materials
("普通","Common","コモン"),("优良","Fine","良質"),("稀有","Rare","レア"),("史诗","Epic","エピック"),("传说","Legendary","伝説"),("神话","Mythic","神話"),
("凡魂","Mortal Soul","凡魂"),("灵魂","Spirit Soul","霊魂"),("英魂","Heroic Soul","英魂"),("圣魂","Holy Soul","聖魂"),("神魂","Divine Soul","神魂"),
("铁片","Iron Scrap","鉄片"),("布条","Cloth Strip","布切れ"),("撕碎的衣物。","Torn clothing.","引き裂かれた衣服。"),("草药","Herb","薬草"),("苦涩的草叶，能熬药。","Bitter leaves, good for brewing medicine.","苦い葉、薬を煎じられる。"),("魂尘","Soul Dust","魂の塵"),("兽皮","Hide","獣皮"),("硝好的厚皮。","Well-tanned thick hide.","よくなめした厚い皮。"),("骨头","Bone","骨"),("又长又硬。","Long and hard.","長くて硬い。"),("木料","Timber","木材"),("干燥的硬木。","Dry hardwood.","乾燥した硬い木。"),("血玉","Blood Jade","血玉"),("绷带","Bandage","包帯"),("恢复 20% 生命。","Restores 20% HP.","HPを20%回復する。"),("磨刀石","Whetstone","砥石"),("生肉","Raw Meat","生肉"),("兽牙","Beast Fang","獣の牙"),("兽角","Beast Horn","獣の角"),("炖肉","Stew","シチュー"),("首级","Head","首級"),
("木箱","Wooden Crate","木箱"),("酒桶","Wine Barrel","酒樽"),("藤篮","Wicker Basket","藤籠"),("木桶","Wooden Bucket","木桶"),("武器架","Weapon Rack","武器架"),("一次最多排 8 件","Holds up to 8 at once","一度に最大8個並べられる"),
# tabs / UI
("👹 属性","👹 Stats","👹 ステータス"),("⚔️ 装备·物品·工坊","⚔️ Gear · Items · Workshop","⚔️ 装備・アイテム・工房"),("🪓 装备·斯尼克","🪓 Gear · Snik","🪓 装備・スニック"),("🔨 建造","🔨 Build","🔨 建築"),("💀 首级收藏","💀 Head Collection","💀 首級コレクション"),("📖 图鉴·展厅","📖 Codex · Gallery","📖 図鑑・展示室"),("📜 狩猎日志","📜 Hunt Log","📜 狩猟日誌"),
("攻击","Attack","攻撃"),("防御","Defense","防御"),("容量","Capacity","容量"),("已建成","Built","建築済み"),("全部","All","すべて"),("洞内","In cave","洞内"),("麻袋","Sack","麻袋"),("全品阶","All tiers","全ランク"),("按品阶","By tier","ランク順"),("最新","Newest","新しい順"),("产魂","Soul output","魂産出"),("🔍 名字 / 种族 / 地点","🔍 Name / race / place","🔍 名前 / 種族 / 場所"),
("🗝️ 魂库","🗝️ Soul Vault","🗝️ 魂の倉庫"),("📥 已存入魂库","📥 Stored in the Soul Vault","📥 魂の倉庫に保存した"),("暂无符合的首级","No matching heads","該当する首級がありません"),("材料不足：","Not enough materials: ","材料が足りない："),
("⚔️ 装备","⚔️ Gear","⚔️ 装備"),("🪨 材料","🪨 Materials","🪨 素材"),("🧪 药品","🧪 Potions","🧪 薬品"),("💀 首级·器官","💀 Heads · Organs","💀 首級・器官"),("📖 典籍","📖 Tomes","📖 典籍"),("🧷 摆件","🧷 Decor","🧷 飾り"),("🧪 药品 · 消耗","🧪 Potions · Consumables","🧪 薬品・消耗品"),("🗡️ 战斗增益","🗡️ Combat Buffs","🗡️ 戦闘強化"),("🎒 背篓 · 扩容","🎒 Backpack · Upgrades","🎒 背負い籠・拡張"),
("合成","Craft","合成"),("这一类是空的。","This category is empty.","このカテゴリは空です。"),("空空如也——去野外搜刮吧。","Nothing here — go loot the wilds.","空っぽ——野外へ漁りに行こう。"),("使用","Use","使う"),("放进腰带","Put on belt","ベルトに入れる"),("装备","Equip","装備する"),("丢在地上","Drop","地面に捨てる"),("取消翻找","Cancel search","捜索をやめる"),("装进麻袋","Put in sack","麻袋に入れる"),("麻袋放不下","The sack is full","麻袋に入らない"),("分解成材料","Break down into materials","素材に分解"),("放回储物箱","Return to chest","収納箱に戻す"),("放置到洞里","Place in the cave","洞窟に置く"),
("强化","Upgrade","強化"),("已满","Maxed","上限"),("没有可强化的属性","No upgradable stats","強化できる属性がない"),("材料齐了","Materials ready","材料が揃った"),("材料/魂晶不足","Not enough materials / crystals","材料／魂晶が足りない"),("▲ 比身上的强","▲ Better than what you wear","▲ 装備中より強い"),("＝ 同阶","＝ Same tier","＝ 同ランク"),("▼ 不如身上的","▼ Worse than what you wear","▼ 装備中より弱い"),
("魂晶不足","Not enough soul crystals","魂晶が足りない"),("这里放不下","No room here","ここには置けない"),("麻袋放不下了","The sack is full","麻袋がいっぱい"),("腰带满了","Belt is full","ベルトがいっぱい"),("生命已满","HP is full","HPは満タン"),("魂晶或材料不足","Not enough crystals or materials","魂晶か材料が足りない"),("分解得到：","Salvaged: ","分解して入手："),("材料不足","Not enough materials","材料不足"),
("⚠ 翻找被打断！","⚠ Search interrupted!","⚠ 捜索が中断された！"),
# combat feedback
("💥 破防！","💥 Guard Break!","💥 ガード崩し！"),("💨 完美闪避！她露出了破绽","💨 Perfect dodge! She's left open","💨 完全回避！彼女に隙ができた"),("🛡️ 格挡偏了","🛡️ Block off-angle","🛡️ ガードがずれた"),("❌ 格挡方向错了！","❌ Wrong block direction!","❌ ガードの向きが違う！"),("🛡️ 格挡！","🛡️ Block!","🛡️ ガード！"),
("反击","Counter","反撃"),("破防","Guard Break","ガード崩し"),("完美闪避","Perfect Dodge","完全回避"),("破绽","Opening","隙"),("击杀","Kill","撃破"),("斩首","Decapitate","斬首"),("活斩","Live Slash","生け斬り"),("处决！","Execute!","処刑！"),("一刀斩首！","One-stroke decapitation!","一刀両断の斬首！"),("断肢","Dismember","断肢"),("完美格挡","Perfect Block","完全ガード"),
("双杀！","Double Kill!","ダブルキル！"),("三杀！","Triple Kill!","トリプルキル！"),("四杀！","Quadra Kill!","クアッドキル！"),("屠戮！","Slaughter!","殺戮！"),("新技能解锁","New skill unlocked","新スキル解放"),
("闪身","Sidestep","身かわし"),("战吼","War Cry","雄叫び"),("旋风斩","Whirlwind","旋風斬"),("体力不足","Not enough stamina","スタミナ不足"),("力 竭","Exhausted","力 尽"),("没力气了……","Out of strength…","力が出ない……"),("缓过来了","Caught my breath","息が整った"),("😮‍💨 跑不动了……","😮‍💨 Can't run any more…","😮‍💨 もう走れない……"),
("📣 R 战吼：震慑周围敌人","📣 R War Cry: terrify nearby enemies","📣 R 雄叫び：周囲の敵を威圧"),("🌀 G 旋风斩：斩击周围一圈","🌀 G Whirlwind: slash all around you","🌀 G 旋風斬：周囲を一周斬る"),
("刺击！Q 闪身 / 正面格挡","Thrust! Q to sidestep / block head-on","刺突！Qで回避／正面からガード"),("刺击","Thrust","刺突"),("重击 · 就是现在！","Heavy · now's the time!","強攻撃 ・ 今だ！"),
("右后方来袭 →","Attack from behind right →","右後方から攻撃 →"),("← 左后方来袭","← Attack from behind left","← 左後方から攻撃"),
("右","Right","右"),("左","Left","左"),("右上","Upper right","右上"),("上","Up","上"),("左上","Upper left","左上"),("右下","Lower right","右下"),("下","Down","下"),("左下","Lower left","左下"),
("▲ 你在这里","▲ You are here","▲ 現在地"),("宝箱","Chest","宝箱"),("<b>E</b> 打开宝箱","<b>E</b> Open chest","<b>E</b> 宝箱を開ける"),("搜身","Frisk","身体検査"),("搜刮","Loot","漁る"),
("🎬 电影模式 关","🎬 Cinematic mode off","🎬 シネマティックモード オフ"),("🖱️ 点一下画面锁定鼠标","🖱️ Click the screen to lock the mouse","🖱️ 画面をクリックしてマウスを固定"),("界面已复位","Interface reset","画面をリセットした"),("检测到界面卡住","UI stuck detected","画面の固着を検出"),
("麻袋放下了。","Sack put down.","麻袋を置いた。"),("轻轻放下了。","Set down gently.","そっと置いた。"),("没有可以放置的表面","No surface to place on","置ける面がない"),("这里放不稳 / 放不下","Can't place it steadily here","ここでは安定して置けない"),
("魂晶","Soul Crystals","魂晶"),
# danger / ranks of encounters
("必死无疑","Certain death","確実に死ぬ"),("九死一生","Barely survivable","九死に一生"),("危险","Dangerous","危険"),("势均力敌","Evenly matched","互角"),("轻松","Easy","楽勝"),("屠宰场","Slaughterhouse","屠殺場"),
("🌕 血月","🌕 Blood Moon","🌕 血の月"),("✨ 异色之夜","✨ Night of Shinies","✨ 異色の夜"),("异色首级出现几率 ×3","Shiny heads appear ×3 as often","異色の首級の出現率 ×3"),("💰 丰饶","💰 Bounty","💰 豊穣"),("全体魂晶产出 +50%","All soul crystal output +50%","全魂晶産出 +50%"),("🔮 通灵日","🔮 Séance Day","🔮 降霊の日"),("首次通灵奖励 ×3","First séance reward ×3","初回降霊の報酬 ×3"),("📜 赏金日","📜 Bounty Day","📜 賞金の日"),("悬赏奖励 ×2","Bounty rewards ×2","賞金報酬 ×2"),
# achievements
("初猎","First Hunt","初狩り"),("第一次亲手放倒猎物","Take down prey with your own hands for the first time","初めて自分の手で獲物を倒した"),("林间恶名","Notorious of the Woods","森の悪名"),("累计放倒 25 人","Take down 25 in total","累計25人倒す"),("魂首窟之主","Lord of Soulhead Cave","魂首窟の主"),("累计放倒 100 人","Take down 100 in total","累計100人倒す"),
("第一颗首级","First Head","最初の首級"),("第一次斩首","First decapitation","初めての斬首"),("刽子手","Executioner","処刑人"),("累计斩首 10 次","Decapitate 10 times","累計10回斬首"),("首级收藏家","Head Collector","首級コレクター"),("累计斩首 50 次","Decapitate 50 times","累計50回斬首"),
("处决","Execution","処刑"),("完美格挡后一刀斩首","Decapitate in one stroke after a perfect block","完全ガード後に一刀で斬首"),("以刃还刃","Blade for Blade","刃には刃を"),("处决 10 次","Execute 10 times","処刑10回"),("一刀","One Stroke","一刀"),("毫发未伤时一刀斩首","Decapitate in one stroke while unscathed","無傷のまま一刀で斬首"),("居合","Iai","居合"),("一刀斩首 10 次","Decapitate in one stroke 10 times","一刀で斬首10回"),
("铁壁","Iron Wall","鉄壁"),("完美格挡 10 次","Perfect block 10 times","完全ガード10回"),("弹刀","Parry","弾き"),("第一次完美格挡","First perfect block","初めての完全ガード"),("碎盾","Shieldbreaker","盾砕き"),("蓄力重斩破防 5 次","Break guards with charged heavy hits 5 times","溜め強斬りでガード崩し5回"),("残影","Afterimage","残像"),("完美闪避 5 次","Perfect dodge 5 times","完全回避5回"),
("拆解","Dismantle","解体"),("断肢 10 次","Dismember 10 times","断肢10回"),("腰斩","Bisect","胴斬り"),("第一次腰斩","First bisection","初めての胴斬り"),("连斩","Flurry","連斬"),("一次连击 10 下","A 10-hit combo","1回で10連撃"),("血舞","Blood Dance","血舞"),("一次连击 20 下","A 20-hit combo","1回で20連撃"),("三杀","Triple Kill","トリプルキル"),("8 秒内放倒 3 人","Take down 3 within 8 seconds","8秒以内に3人倒す"),("弑主","Lordslayer","弑主"),("砍下第一位霸主的头","Cut off the head of the first overlord","最初の覇者の首を刎ねる"),
("🆙 食人魔升到了 Lv.","🆙 The ogre reached Lv.","🆙 オーガがレベルアップ Lv."),("食人魔等级","Ogre level","オーガのレベル"),
# boss ranks
("🕳️ 回魂首窟","🕳️ Return to Soulhead Cave","🕳️ 魂首窟へ戻る"),("🌀 魂门 · 回洞","🌀 Soul Gate · Return","🌀 魂の門・帰還"),
("⚔️ 动手","⚔️ Attack","⚔️ 手を出す"),("🗣️ 交谈","🗣️ Talk","🗣️ 話す"),("🚶 放她走","🚶 Let her go","🚶 見逃す"),("🗡️ 偷袭","🗡️ Ambush","🗡️ 奇襲"),("⚔️ 挑战","⚔️ Challenge","⚔️ 挑戦"),("🚶 绕开","🚶 Go around","🚶 迂回する"),
("🔨 重击","🔨 Heavy strike","🔨 強打"),("🗡️ 连刺","🗡️ Flurry thrust","🗡️ 連続突き"),("✨ 施法","✨ Cast","✨ 詠唱"),("💢 猛攻","💢 Onslaught","💢 猛攻"),("克制施法","Counters casting","詠唱に強い"),("🛡️ 格挡","🛡️ Block","🛡️ ガード"),("克制连刺","Counters flurry thrust","連続突きに強い"),("💨 闪避","💨 Dodge","💨 回避"),("克制重击","Counters heavy strike","強打に強い"),("🏳️ 撤退","🏳️ Retreat","🏳️ 撤退"),("挨一下后脱身","Take a hit, then escape","一撃受けて離脱"),
("击败她可得地区霸主首级","Defeat her to claim the regional overlord's head","彼女を倒すと地域覇者の首級が手に入る"),("她会消失在雾里","She will vanish into the mist","彼女は霧の中へ消える"),("受到的伤害减半","Damage taken halved","受けるダメージ半減"),
("开","On","オン"),("关","Off","オフ"),("🔇 BGM 关","🔇 BGM Off","🔇 BGM オフ"),("镜头速度 ","Camera speed ","カメラ速度 "),("音乐 ","Music ","音楽 "),("姿势：","Pose: ","ポーズ："),
("🌙 诅咒","🌙 Curse","🌙 呪い"),("💀 残魂","💀 Remnant Soul","💀 残魂"),("🧌 斯尼克","🧌 Snik","🧌 スニック"),("⚔️ 你的洞窟","⚔️ Your Cave","⚔️ あなたの洞窟"),("🌑 很久以前……","🌑 Long ago…","🌑 遠い昔……"),
]
