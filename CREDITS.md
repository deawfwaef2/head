# 模型来源、授权与公开发布状态

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
