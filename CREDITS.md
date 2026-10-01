# 模型来源、授权与公开发布状态

## R38：CC0 模式（MOD `cc0_only`，默认开）
开启时游戏里只出现 **CC0（公有领域）** 人物模型：头 = Sendagaya_Shino、Sendagaya_Shibu、Darkness_Shibu、Vivi、Vita、Victoria_Rubin、HairSample_Female、AvatarSample_D_Darkness、Base_Female；身体 = Vita、Victoria_Rubin、Darkness_Shibu、HairSample_Female（均为 pixiv Inc. CC0）。
注意：pixiv 官方说明 AvatarSample_A/B/C（及 K/L/S 等样本）**不是 CC0**，只是“样本条款”，因此不在 CC0 模式内。动作（Quaternius UAL）、野兽/道具（Quaternius）、场景（Poly Haven）本来就是 CC0。关闭 CC0 模式才会加载下面其它许可的模型（含仅限私人使用者）。

## 当前随机池：公开仓库可用（按表中原许可署名/遵守条件）

下表中的基础脸与发型会被组合，角色卡显示该角色实际使用的脸模/发型来源。它们都已收录在本仓库的 `models/` 中；不代表作者对游戏剧情背书。分发时请连同本文件保留。

| 文件 | 模型 | 来源/许可 | 本仓库状态 |
|---|---|---|---|
| `Sendagaya_Shino.js` | 千驮谷·篠 | pixiv Inc.，CC0 | 可公开分发 |
| `Sendagaya_Shibu.js` | 千驮谷·涩 | pixiv Inc.，CC0 | 可公开分发 |
| `Darkness_Shibu.js` | Darkness Shibu | pixiv Inc.，CC0 | 可公开分发 |
| `Vivi.js` | Vivi | pixiv Inc.，CC0 | 可公开分发 |
| `Vita.js` | Vita | pixiv Inc.，CC0 | 可公开分发 |
| `Victoria_Rubin.js` | Victoria Rubin | pixiv Inc.，CC0 | 可公开分发 |
| `HairSample_Female.js` | 女性发型样本 | pixiv Inc.，CC0 | 可公开分发 |
| `AvatarSample_D_Darkness.js` | 暗精灵 D | pixiv Inc.，CC0 | 可公开分发 |
| `Base_Female.js` | 女性基础模型 | pixiv Inc.，CC0 | 可公开分发 |
| `AvatarSample_A.js` / `AvatarSample_B.js` | 样本 A / B | pixiv VRoid 样本模型条款：允许编辑与分发编辑后模型；不得把原始模型文件作为原样资源再分发 | 仅分发本游戏处理后的头部版本；遵守[官方条款](https://vroid.pixiv.help/hc/en-us/articles/4402394424089) |
| `AvatarSample_K.js` / `AvatarSample_L.js` / `AvatarSample_S.js` | 样本 K / L / S | pixiv Inc. VRoid Studio 2.x 官方样本；文件内 VRM 1.0 元数据：允许再分发、允许改造及改造再分发、允许过度暴力表现、允许法人商用（[VRM 1.0 许可](https://vrm.dev/licenses/1.0/)） | 仅分发 `tools/vrm2head.py` 处理后的头部版本 |
| `Seed-san.js` | Seed-san | VRM Consortium，VRM Public License 1.0 | 依该许可及署名要求分发 |
| `Twist.js` | VRM1 Constraint Twist Sample | VRM Consortium，VRM Public License 1.0 | 依该许可及署名要求分发 |
| `Godette.js` | Low-Poly Godette | SirRichard94，CC-BY | 可公开分发，须署名 SirRichard94 |

源文件来自 `madjin/vrm-samples`、`vrm-c/vrm-specification` 与 `2439905184/openSizebox`。本项目处理内容包括头部裁切、断面封盖、贴图压缩与程序化配色/表情/饰品；来源许可不因处理而改变。

## 不得直接放进公开随机池的候选模型

这些名字**不会在当前游戏中随机出现**，角色剧情也不会为它们生成“可公开使用”标记。只有取得明确授权，或确认许可同时允许公开分发、改造与本作的暴力剧情，才会考虑加入。

| 模型/来源 | 不公开收录原因 |
|---|---|
| AliciaSolid | 元数据/作者条款不允许暴力表现 |
| lilylily、anata | 来源条款禁止暴力表现 |
| fem_vroid | 公开再分发/改造条件不明确 |
| VRoid Hub 上只允许作者使用、禁止改造或禁止再分发的模型 | 个人可下载不等于可打包进公开游戏；逐个核对前不收录 |
| 原神官方 MMD 模型 | 官方禁止再分发及商业使用；不收录 |

**当前游戏随机池没有上述受限模型。** 首级档案会标出每颗头所用的脸模与发型，以及相应公开状态；如未来接入新模型，必须先更新此表与模型卡标记。

## 之后寻找模型的筛选标准

用户接受私下测试时使用非商业/有限许可素材，但仓库目前保持公开，因此不能据此把“仅限私用”“禁止暴力”或禁止再分发的模型打包进来。欢迎推荐明确允许公开分发、改造、暴力表现的中世纪奇幻女性模型；偏好 CC0 / CC-BY，并需要逐个检查模型本身及其贴图许可。


## 第十二轮新增头部基础模型（VRM，经 tools/vrm2head.py 裁切、glbsimp 减面、glbpack 压缩）

- DN_07273（宝煲）— 咸小夏
- Hikari（光莉）— あわ
- Nemesia（涅墨西亚）— awa
- Touka（冻香）— あわ
- Hinata（日向）— rosspeili
- Iris（艾瑞丝）— antem
- Judy（茱蒂）— antem
- Kohaku（琥珀御影）— Sunwood-ai-labs
- LIA（莉娅）— LIA project
- Lookmouse（绯鼠）— lookmouse
- MDK2（鸥）— KamomeAshizawa
- Mel（夜空梅露）— 風籟
- Neleac（茶发水手）— 水銀メイド
- Olivia（奥莉维亚）— xishensoft
- Pink1（冬樱）— Hopu
- Pink2（苍猫）— Hopu
- Pink4（花洛丽）— Hopu
- RP_C（薄荷镜）— eric chow
- Seph（翠妖瑟芙）— Marin
- TS_Girl（青瞳）— Tyreece
- TS_Enemy（翠焰）— Tyreece
- XiaoYun（小云）— YunYouJun
- Zat（夜猫）— kekw
- EE（金砂）— EE

## 建筑与道具 3D 扫描模型（`models/props_pack.js`）
来自 [Poly Haven](https://polyhaven.com/models)，全部为 **CC0（公有领域）** 授权，允许商用、修改及再分发：
- `GothicCabinet_01`, `GothicCommode_01`, `Chandelier_01`, `wooden_display_shelves_01`, `marble_bust_01`, `gothic_statue`, `antique_ceramic_vase_01`, `wine_barrel_01`, `bench_vice_01`, `BarberShopChair_01`, `vintage_grandfather_clock_01`, `cannon_01`, `dartboard`, `chemistry_set`, `round_wooden_table_01`, `large_iron_gate`, `ornate_mirror_01`, `spinning_wheel_01`


## 出猎世界资产（`big/world/`，第十四轮）
来自 [Poly Haven](https://polyhaven.com)，全部 **CC0（公有领域）**。树木经 `tools/foliage.py` 减面（原模型为影视级 1~2M 面），其余经 `tools/worldpack.py` 打包。
- 天空 HDRI：`cobblestone_street_night`, `drakensberg_solitary_mountain`, `evening_meadow`, `misty_pines`, `moonless_golf`, `muddy_autumn_forest`, `roofless_ruins`, `snowy_hillside`, `teutonic_castle_moat`
- 地面材质：`brown_mud_leaves_01`, `burned_ground_01`, `cobblestone_floor_04`, `dry_ground_rocks`, `forest_leaves_02`, `leafy_grass`, `mossy_cobblestone`, `patterned_cobblestone`, `snow_02`
- 模型：`Barrel_02`, `coast_land_rocks_03`, `dandelion_01`, `dead_quiver_trunk`, `dead_tree_trunk`, `dead_tree_trunk_02`, `dry_branches_medium_01`, `fern_02`, `gothic_statue`, `grass_medium_01`, `grass_medium_02`, `horse_statue_01`, `island_tree_01`, `island_tree_02`, `modular_fort_01`, `moon_rock_01`, `moon_rock_03`, `moon_rock_05`, `moss_01`, `namaqualand_boulder_03`, `namaqualand_boulder_04`, `namaqualand_cliff_02`, `namaqualand_rocks_01`, `nettle_plant`, `quiver_tree_01`, `rock_07`, `rock_09`, `rock_moss_set_01`, `root_cluster_01`, `root_cluster_02`, `shrub_01`, `shrub_02`, `shrub_04`, `street_lamp_01`, `tree_small_02`, `tree_stump_01`, `tree_stump_02`, `wild_rooibos_bush`, `wooden_barrels_01`, `wooden_military_crate`


## 身体与动作（第十四轮 14b）
- 原神角色 VRM（Jean, Noelle, Amber, Rosaria, Lisa, Sucrose, Xiangling, Ningguang, Furina, Kokomi, Yae Miko, Shenhe, Mona, Eula, Beidou）：角色与美术 © HoYoverse（原神），MMD→VRM 转换版（来自 dionaka/py.turtle 仓库）。仅供私人使用，不公开发布。
- 光莉 HikariCape / HikariScholar：あわ (VRoid) · VRM。
- Vita / Victoria_Rubin / Darkness_Shibu / HairSample_Female（CC0）、AvatarSample_B（VRoid 样本条款：Everyone / 暴力 Allow / 商用 Allow）：pixiv Inc. VRoid 官方样本模型原装身体（第二十四轮，MOD vroid_bodies），源文件取自 github.com/madjin/vrm-samples。
- Osage（おさげちゃん_mate2，浴衣）：Iwashi（https://twitter.com/ishiand151）· VRoid Hub 许可：everyone / 改造 allow / 再分发 allow / 暴力 allow / 法人商用 allow / 署名不要。源文件取自 github.com/josephrocca/ChatVRM-js/avatars。
- AvatarSample_A：pixiv VRoid 官方样例（VRoid Studio sample, 许可见 VRM 元数据）。
- 动作：Quaternius — Universal Animation Library 1 & 2（CC0）。
- 地区野怪（R41）：Quaternius — Ultimate Monsters（CC0 1.0），beasts/m_*.js，经 tools/beast_pack.py 精简（只删未用动画，几何不变）。
- 武器：Poly Haven（CC0）。

## 断面 PBR 贴图（head_repair MOD）
- `assets/tex_cut_wagyu.js`：TextureCan「A5 Wagyu Beef Steak with Marbling Texture (Others 0003)」PBR 底色、OpenGL 法线与粗糙度贴图；下载后缩至 512 px，许可为 CC0 1.0 Universal，允许修改、商业使用与随项目再分发，无署名义务（仍记录来源）。[资产页](https://www.texturecan.com/details/154/) · [许可条款](https://www.texturecan.com/terms/)

## 恶趣味陈列馆（第十五轮 · js/oddities.js）
来自 [Poly Haven](https://polyhaven.com/models)，全部 **CC0（公有领域）**，经 `tools/phpack.py` 减面 + 512px 贴图打包：
ClassicConsole_01、Rockingchair_01、Sofa_01、Television_01、bull_head、horse_head、lion_head、chinese_console_table、dining_chair_02、round_wooden_table_02、tea_set_01、fancy_picture_frame_01/02、hanging_picture_frame_01/02/03、flower_ursinia、garden_gnome、planter_box_01、watering_can_metal_01、magnifying_glass_01、vintage_microscope、vintage_oil_lamp、throw_pillows_01。

### 第十八轮 地点布局原型（Poly Haven, CC0）
modular_wooden_pier, painted_wooden_bench, wooden_picnic_table, wooden_stool_01, wooden_bucket_01, wicker_basket_01, wooden_crate_02, rock_face_01, rock_face_02, flower_empodium, flower_gazania, shrub_sorrel_01 — https://polyhaven.com （CC0）
## 第十八轮 · 史录陈列（js/rites.js）与地图布景（js/wlayout.js）
Poly Haven（https://polyhaven.com），CC0：wooden_cutting_board、brass_pot_01、stone_01、gothic_coffee_table、carved_wooden_plate、wicker_basket_01、wooden_ladder、wooden_bucket_02。
地图布景复用已有 CC0 资产（刀剑/盾/锤斧/牛头狮头马头/花园侏儒/花槽/木箱/酒桶/灯笼/烛台/酒杯/火盆及 big/world 的岩石树干雕像）。

## MMD 头模（第二十三轮，grp: mmd）— ⚠ 仅限私人使用
models/GI_*.js：原神角色 MMD 模型（模型提供 miHoYo，各改造者见原模型 readme），取自 phoshco.github.io 镜像。
原规约禁止二次配布、禁止血腥猎奇及商用；用户已知悉并表示仓库将设为私人。**不得公开发布/商用。**

## 人设语音 voice/voice.js（第二十四轮）
- 全部为本项目用 AI 语音合成（TTS）自制的中文女声台词，13 套 × 22 句；文字表见 `tools/voice_lines.py`（与录音一一对应）。无第三方音频素材。
- 环境音 `js/ambience.js`、脚步 `js/steps.js`、打击音 `js/combatfx.js` 为 WebAudio 现场合成，无音频文件。

## MMD 头模包（第二十五轮，grp: mmd）— ⚠ 仅限私人使用
models/HSR_*.js（崩坏：星穹铁道，miHoYo）、models/ZZZ_*.js（绝区零，miHoYo）、models/NTE_*.js（异环，Hotta Studio）：各游戏官方发布的 MMD 模型，取自 phoshco.github.io 镜像。
原规约禁止二次配布与猎奇/血腥用途；用户已知悉并表示仓库将设为私人。**不得公开发布/商用。** 由 js/headpacks.js 按 MOD pack_hsr / pack_zzz / pack_nte 加载。

## 经典日系 MMD 头模包（第二十七轮，grp: mmd）— ⚠ 仅限私人使用
models/CLS_*.js，由 js/headpacks.js 按 MOD pack_voc / pack_touhou / pack_cls 加载。均非 CC0，原规约大多禁止二次配布及猎奇/血腥用途；用户已知悉并表示仓库设为私人。**不得公开发布/商用。**
- VOCALOID/VOICEROID：初音未来・KAITO・MEIKO・弱音ハク（あにまさ式，Animasa）；YYB 式初音 10th；Racing Miku 2022；VBS 初音；IA（IA-beta_custom）；結月ゆかり ver7。
- 东方 Project（上海アリス幻樂団 二次创作）：藤原妹紅、蓬莱山輝夜、八雲藍 Ver1.00B、八雲紫 Ver1.011A。
- 其他：Tda 式レム（Re:ゼロ）、トール（小林さんちのメイドラゴン）、2B（NieR:Automata）、ミカサ（進撃の巨人）、江ノ島盾子（ダンガンロンパ）、大梵天（深空之眼）、YYB 式秦始皇、LoveLive! μ's 六人（穂乃果・絵里・ことり・海未・真姫・希）。
- 来源：takahirox/mmd-viewer-js、bear0830/mmd、若干 babylon-mmd 示例仓库中附带的模型；原作者见各模型 readme。转换脚本 tools/pmx2vrm.py + tools/vrm2head.py（只取头部）。

## R40：新增 pixiv CC0 头
| 文件 | 名称 | 作者 / 许可 | 备注 |
|---|---|---|---|
| `models/Sakurada_Fumiriya.js` | Sakurada Fumiriya（櫻田文里弥） | pixiv Inc.，CC0（VRM 内嵌 licenseName=CC0；源 madjin/vrm-samples vroid/beta） | 可公开分发 |
| `models/HairSample_Male.js` | HairSample_Male | pixiv Inc.，CC0（pixiv 官方 FAQ 列为 CC0；源同上） | 可公开分发 |

## R43b（R48 轮）：Quaternius CC0 职业服身体（big/body/Q_*.js，仅远程）
| 文件 | 来源 | 作者 / 许可 | 备注 |
|---|---|---|---|
| `big/body/Q_Witch / Q_Medieval / Q_Adventurer / Q_Formal / Q_Soldier` | Ultimate Modular Women Pack（quaternius.com，经 Cinevva 镜像 cdn.cinevva.com/assets/packs/quaternius/ultimate-modular-women/） | Quaternius，CC0 | 自带头已删，换动漫头；`tools/glb2body.py` 转换（IK 骨架重挂到 FK） |
| `big/body/Q_Ranger / Q_Peasant` | Modular Character Outfits – Fantasy [Standard]（quaternius.itch.io，免费版 Female_Ranger / Female_Peasant） | Quaternius，CC0（License_Standard.txt） | 只取 baseColor 贴图（1024 WebP）；兜帽随头删除 |
- 尝试并否决：Ultimate Animated Characters 的 *_Female（Knight_Golden/Viking/Pirate/Soldier/BlueSoldier/Cowboy，身高 ~1.35m、Q 版粗短，像大头娃娃）；pixiv AvatarSample_E（身高 1.17m 幼态）/F/G（与已有 Vita 系同款）；Kenney 迷你角色（Q 版）；Quaternius RPG Characters（Q 版）。

### R51 身体
- `big/body/V_KF.js`（AvatarSample K·F）：pixiv VRoid Project 官方样本，VRM 内嵌 meta = VRM Public License 1.0、avatarPermission everyone、allowExcessivelyViolentUsage true、allowRedistribution true、modification allowModificationRedistribution、creditNotation unnecessary。文件取自 github.com/temuulen1221/Bodify（assets/models/AvatarSample_K_F.vrm），tools/vrm2body.py 转换。
- 已删除 `big/body/Q_*.js`（Quaternius Ultimate Modular Women，R43b 引入）——用户要求只用 VRoid 女性身体。

## VRoid Hub 模型（R53，头 `models/VH_*.js` + 身体 `big/body/VH_*.js`）
每个模型在 hub.vroid.com 条件页核对为：允许暴力表现 / 允许改造 / 允许再分发（或 CC0 / CC-BY）。若作者要求署名，署名即下列作者名。

- `VH_963851` 錬金術師のワンピース — マユラ (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/1880767666855927745/models/3171992335144963851
- `VH_263529` 歴代サンプルモデル — Coatie（Koh-Tee） (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/4593660874193246717/models/5008365454243263529
- `VH_921690` 月城ムーン超ハッカソン用 — tsukisiromoon (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/6235639059178780043/models/2968652229362921690
- `VH_763989` 光莉 — あわ (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/7574619046991064867/models/4411539083619763989
- `VH_711679` Preset Nekomimi Girls — 七百屋 (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/6562992088211538595/models/7611892932977711679
- `VH_170825` 錬金術師の少女 — マユラ (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/7326706638307722032/models/9111574850521170825
- `VH_592508` Geminiちゃん — マユラ (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/7622872635463746057/models/950422655037592508
- `VH_922318` エルフさん — ひなゆずき (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/7295574207011729136/models/6503303582901922318
- `VH_375224` 【VRoidファイル販売中】メイド服カチューシャ着用サンプル — 白い白米 (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/1209921514676884727/models/3546853004395375224
- `VH_698890` 白夜 — あわ (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/876445510960098637/models/5102542936430698890
- `VH_067202` エース式なこむすめ — エース隊長 / Taichoo (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/8882447825618674321/models/5945210569136067202
- `VH_478458` ダイドー - アビス・ホライズン — lumis (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/5813324930958434099/models/6434903048487478458
- `VH_683418` メイド鹿島 — すえ (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/4184222219477833273/models/8912494846381683418
- `VH_208264` ブラッディルビー — 餅丸よう (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/8532109173656919610/models/6158488866753208264
- `VH_626787` スウェーデンちゃん — バーネット (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/4095024816131573121/models/6042927270325626787
- `VH_338003` リヴィ — めるぞぺる (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/2067013302225845212/models/8723309735329338003
- `VH_007907` 【版権フリー】エルフ — misaki (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/222360161605488523/models/7058931113539007907
- `VH_350271` グノーム — ネセネセ (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/1714810747070456300/models/5082804560147350271
- `VH_384719` 菜ツ音りとせ — ＮＲ／ＭＬ (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/2168018732710122760/models/438605804164384719
- `VH_925229` DROCK!! — kana~ (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/3667883437290326857/models/5149510615692925229
- `VH_388471` カザハ — キリナレイル (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/7402007000090150733/models/3313146848163388471
- `VH_720884` nekomimi maid — owo (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/8620852199811893721/models/1972866515957720884
- `VH_757356` アリス — 永遠力吹雪@Skeb募集中 (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/4696869983204914625/models/2442704882327757356
- `VH_151706` Model 2 — 鷲羽あずさ (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/3005936562042173277/models/2162808127113151706
- `VH_407264` 重音テトSV　麻十a十式v1.5 — 摩十a十 (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/1618767370597549811/models/8264070903309407264
- `VH_611845` サイドテールな少女 — ひなゆずき (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/4476699882452975148/models/7519114352520611845
- `VH_662171` お試し4 — yamochan7 (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/5085958830310947461/models/289113830910662171
- `VH_104806` レイカ — Tovie (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/4220132588234183943/models/6361244108665104806
- `VH_796605` AI（アイ）ちゃん — マユラ (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/9117432442733715615/models/8249199474611796605
- `VH_775012` ver12aka — ぶーたきちゃん (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/9078856536562664185/models/7804687272331775012
- `VH_057183` ペパーミントドレス — 餅丸よう (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/5210687575611148088/models/5165957922947057183
- `VH_173040` ピンクのチロルめいど — 餅丸よう (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/6216046191932128492/models/5911351483580173040
- `VH_786947` カクテルベリー — 餅丸よう (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/5956157495788537521/models/2194566611037786947
- `VH_390116` 安岡　真奈 — うさ (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/6057953589277922507/models/3730592115841390116
- `VH_960801` 白黒ぐるぐる目ちゃん — 紫乃桜甘味料 (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/1313219482666259333/models/4422403184066960801
- `VH_997601` 9 — GoKi御器 (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/1633414261567720896/models/7828776083448997601
- `VH_048015` レイチェルちゃん — マユラ (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/827815393298964854/models/6275124255425048015
- `VH_382000` ニャルラトホテプ — マユラ (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/2380309382611423311/models/5292605843110382000
- `VH_400132` AvatarSample — yomox9 (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/2175138617022572467/models/1646378957069400132
- `VH_035130` ジトメちゃん — ヽ｜∵｜ゝ(Fantom) (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/2089525207077426323/models/3806710271773035130
- `VH_487209` おさげ？ちゃん — ひなゆずき (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/767334058303576906/models/9073030574770487209
- `VH_999667` 風音リム — 夢喰ねるよ (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/7573892730382934303/models/1380206967745999667
- `VH_273237` maid — owo (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/7563662045241140659/models/255350776653273237
- `VH_855223` スカイブルードレス — 餅丸よう (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/286113380493805153/models/2248616446848855223
- `VH_334274` 配布キャラ＿12 — 今6　エクモン (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/2735220209351543392/models/506768837298334274
- `VH_248595` Celeste — JustAPal (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/6685370406885124983/models/5295951488219248595
- `VH_933940` 気だるげシスターメイドさん — かんなっ！（別名:これ） (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/5784282389576220298/models/2529419180646933940
- `VH_793513` ｔｔ — アミ (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/8438484546938384856/models/5992844497770793513
- `VH_061299` 赤居浮奈 — 永遠力吹雪@Skeb募集中 (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/4405457166853439284/models/4403766635056061299
- `VH_127512` モブ子ちゃん — マユラ (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/5746502360712405535/models/2998677666839127512
- `VH_216139` お試し2 — yamochan7 (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/3293756840432485398/models/8624915900578216139

### R53b（骑士/精灵/冒险者批）
- `VH_665801` Jinx — Archi (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/2904771558218700181/models/9089459980967665801
- `VH_654907` スウェーデンちゃん — バーネット (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/4095024816131573121/models/6681066214779654907
- `VH_470048` samplecft0.0 — SunLace✨ (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/4625139936223931935/models/4599730645493470048
- `VH_407402` AI子3 — misaki (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/6372258706445967624/models/2974275768817407402
- `VH_862934` Boothにて無料配布中 — 安全太郎(旧01_mit) (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/2825453020096694533/models/6896701093787862934
- `VH_329278` Brenda — BrunixxVT (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/7421534503591137114/models/8674465397224329278
- `VH_172387` 陸上少女 — ひなゆずき (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/3825745923642048810/models/714615516957172387
- `VH_110696` Dream_Patora — 素材利用時は利用規約を読でね (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/9081248154626929492/models/2086305716430110696
- `VH_866480` Lea Loxnoct — omgwhocares14 (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/8262859030199215254/models/1912025010562866480
- `VH_348798` 名前不詳１ — レオ (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/3872299465362313211/models/2219483509765348798
- `VH_483515` Lisara Gozen — Lisara Gozen_VT (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/9204064368673026870/models/3664734996884483515
- `VH_730511` Female dark elf — ᴮᵉʳᵘᵗʰⁱᵉˡ (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/4614100189762954631/models/6769475352946730511
- `VH_436970` Lilia — archekitai (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/7204213222772510185/models/2255237240786436970
- `VH_579317` skinny elf women — LittleMxStar (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/181278512695377023/models/1170536215708579317
- `VH_255863` +anatasia+ — Joii (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/4744645135358012250/models/8751785310530255863
- `VH_846051` Actor2 — つあ a.k.a 開星 ヨキ (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/8709531605683402840/models/5063585635226846051
- `VH_507309` ドラセラ — クロリ (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/2387423309867367631/models/3002878208344507309
- `VH_398626` Asula — Heady (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/7171429020801271881/models/4270651959988398626
- `VH_476605` ander — Eya Rizgi (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/3837322738024036009/models/2370468579952476605
- `VH_092224` katei_kyousi — 素材利用時は利用規約を読でね (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/154232427885440366/models/8762854870688092224
- `VH_028455` Phoenix — BeanMChocolate (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/656707744707807167/models/1430813664729028455
- `VH_996092` Cyber Android 21 armor (full) — VtuberSAIN (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/2114068361230241913/models/8800473713369996092
- `VH_058208` SL14 — 桜田とまこ (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/838957408149116567/models/8851210693205058208
- `VH_477048` Jinny — Andrew M (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/3430760887649883569/models/792233110711477048
- `VH_914350` アルマ — さとうたくや (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/9149881920343406910/models/2275186222502914350
