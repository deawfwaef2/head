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
