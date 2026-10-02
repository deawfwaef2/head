# 在你自己的电脑上批量下载 VRoid Hub 模型（不需要沙箱、不需要把密码/验证码交给任何人）

为什么要在本机：沙箱每轮对话都会重置，而 VRoid Hub 下载必须 pixiv 登录（验证码只能你自己点）。在你自己的电脑上，浏览器窗口是你的，登录一次就行，之后全自动。

## 一次性准备（Windows / macOS / Linux 通用，已有 Python 3.10+）
```
pip install playwright numpy pillow meshoptimizer
python -m playwright install chromium
```

## 下载 + 转换（在仓库根目录运行；id 清单在 tools/hub/ids/）
```
set HUB_LOCAL=1          (PowerShell: $env:HUB_LOCAL="1"；macOS/Linux: export HUB_LOCAL=1)
python tools/hub/hubpipe.py tools/hub/ids/b1.txt
python tools/hub/hubpipe.py tools/hub/ids/b2.txt
python tools/hub/hubpipe.py tools/hub/ids/b3.txt
```
- 会弹出一个浏览器窗口：你自己点 “Sign in with pixiv ID” → 登录（密码或邮箱验证码、验证码图都你来）。登录成功后脚本自动开始下载（最多等 30 分钟），登录状态保存在 `~/.vroid_hub_profile`，下次不用再登。
- 每个模型：先在 Hub API 核对授权（暴力/改造/再分发三项全允许才下载）→ 下载 → 转成 `models/VH_*.js` + `big/body/VH_*.js` → 删原始 .vrm。结果在 `vrm_out/`。约 35 秒/个，可随时中断重跑（已完成的会跳过）。
- 三批共 125 个，约一半会通过授权 + 质检。

## 收尾（质检 + 拷进仓库 + 登记）
```
python tools/hub/local_finish.py
git add models big js/vroid_pack.js CREDITS.md
git commit -m "VRoid Hub 追加模型"
git pull --rebase && git push
```
登记按标签自动分身份（魔女/骑士/精灵…）；不合眼的在 `js/vroid_pack.js` 里删掉对应条目即可。
