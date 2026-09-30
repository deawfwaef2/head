# R40：VRoid Hub 上标注 CC0 的高质量 VRoid 模型（待下载）

筛选条件：标题/标签含 CC0，且 VRoid Hub 许可全部放开（允许改造、再分发、无需署名、允许暴力表现、法人商用），外观为成年人、动漫 VRoid 品质。
VRoid Hub 下载需要 pixiv 登录（沙箱拿不到；不要破解 optimized_preview）。用户下载 .vrm 后放到 `/home/user/vrm_in/`，然后：

    python3 tools/vrm2head.py X.vrm File "名" "作者, CC0 (VRoid Hub)" --grp vroid
    python3 tools/glbsimp.py models/File.js && python3 tools/glbpack.py models/File.js
    然后：js/cc0mode.js HEADS 加 File；index.html 在 models/Vivi.js 后加 script；CREDITS 记作者+链接。
    （本地 .vrm 的许可：vrm2head 会读内嵌元数据；网上文件可 `echo URL | python3 tools/vrmmeta.py`。）

| # | 模型 | 作者 | 链接 |
|---|---|---|---|
| 1 | シャペル | ウンフェルス | https://hub.vroid.com/characters/2659905496918897597/models/406149290929678011 |
| 5 | AvatarSample_D_y9v1_cluster | yomox9 | https://hub.vroid.com/characters/6628342677668392369/models/8785131824056155088 |
| 6 | ASB_y9_v01_light | yomox9 | https://hub.vroid.com/characters/5051316063919653405/models/5146787795395424939 |
| 7 | AvatarSample_F_y9v1_cluster | yomox9 | https://hub.vroid.com/characters/6267272519916057255/models/2508944431276983474 |
| 11 | AvatarSample_G_y9v1_cluster | yomox9 | https://hub.vroid.com/characters/5793088324290311504/models/2834672600425765919 |
| 13 | AvatarSample_E_y9v1_cluster | yomox9 | https://hub.vroid.com/characters/2352749120422359098/models/7728747207472580216 |
| 19 | 茜犬 | 赤山みんと | https://hub.vroid.com/characters/7783212946795266915/models/1034302951678894376 |
| 24 | Sample 9 | gearlock | https://hub.vroid.com/characters/6876108756705726896/models/7576909906258568381 |
| 25 | Albert_v01 | yomox9 | https://hub.vroid.com/characters/5530381503891126589/models/9047978792178743228 |
| 26 | Sample 4 | gearlock | https://hub.vroid.com/characters/1810012364843492635/models/3201780442372929833 |
| 28 | Albert_v01_longcoat | yomox9 | https://hub.vroid.com/characters/5530381503891126589/models/6869834906500348700 |
| 31 | RottenGaim | yomox9 | https://hub.vroid.com/characters/9170519640204813719/models/6937854530592091310 |
| 33 | Sample 3 | gearlock | https://hub.vroid.com/characters/7064666516222162540/models/3599763887323480161 |
| 36 | HSF_y9v4_light | yomox9 | https://hub.vroid.com/characters/2393625750756790328/models/5175495156955133454 |
| 39 | HSF_y9v5_light_cluster | yomox9 | https://hub.vroid.com/characters/2393625750756790328/models/643210572806694905 |
| 45 | Ayanami_Rai_v01 | yomox9 | https://hub.vroid.com/characters/5875268174209623316/models/7471784842568411511 |
| 48 | Sample 8 | gearlock | https://hub.vroid.com/characters/1299381457981558116/models/1962804665858444342 |
| 62 | Sample 10 | gearlock | https://hub.vroid.com/characters/8748184191785117496/models/2777017477580707437 |
| 64 | Sample 1 | gearlock | https://hub.vroid.com/characters/1362263613685418388/models/781452289802403859 |
| 66 | Yae | yomox9 | https://hub.vroid.com/characters/5086551592823577706/models/7181307547413724224 |
| 73 | Sayori | gearlock | https://hub.vroid.com/characters/7512037754883475589/models/5917348229326244979 |
| 81 | Sample 2 | gearlock | https://hub.vroid.com/characters/5102806202678145134/models/2474074627248171776 |
| 86 | LebieDie_v01_NormalEye | yomox9 | https://hub.vroid.com/characters/4350961428258985074/models/1875967301299573490 |
| 118 | Queen_v01 | yomox9 | https://hub.vroid.com/characters/5425161427972668073/models/5676438052907528485 |
| 123 | Kiichi_v10_CC0_NotSMB | yomox9 | https://hub.vroid.com/characters/8178969129265654107/models/6274798789132562037 |
