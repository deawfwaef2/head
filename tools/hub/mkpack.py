#!/usr/bin/env python3
"""R53：把 hubpush 推上去的 VH_* 身体登记成 js/vroid_pack.js（VH_PACK[file]={n,a,ids}）+ 生成 CREDITS 片段。
用法：python3 tools/hub/mkpack.py [state.json]    需要测试服务器 8080（tools/test/srv.py，缺的 big/body 会从 GitHub 回源）。
步骤：① 渲染每 8 个一张身体拼图（tools/test/bodygrid.html）并量衣服的明度/饱和度 → ② 按标签 + 明度/饱和度选身份 → ③ 写文件。
EXCLUDE：标签含 ロリ/水着/スク水/下着/ビキニ 的、或人工看图剔除的。"""
import json, os, re, subprocess, sys, colorsys
from PIL import Image
ST = sys.argv[1] if len(sys.argv) > 1 else '/tmp/vrm_out/state.json'
ok = json.load(open(ST))['ok']
BAD_TAG = re.compile('ロリ|水着|スク水|下着|ビキニ|バニー|ネグリジェ|おばけ|赤ちゃん|幼')
MANUAL_OUT = set(os.environ.get('VH_OUT', '').split(','))
import ast
EXIST = {}
if os.path.exists('js/vroid_pack.js'):
    _t = open('js/vroid_pack.js', encoding='utf-8').read(); EXIST = json.loads(_t[_t.index('window.VH_PACK = ') + 17:_t.rindex(';')])  # 追加模式：保留已登记的
ok = [m for m in ok if m['file'] not in EXIST and not BAD_TAG.search(' '.join(m['tags'] + [m['name']])) and m['file'] not in MANUAL_OUT]
env = dict(os.environ, PYTHONPATH='/home/user/.cache/pylib', PLAYWRIGHT_BROWSERS_PATH='/home/user/.cache/pw', VW='1200', VH='520')
stats = {}
os.makedirs('/tmp/vhsheets', exist_ok=True)
for k in (range(0, len(ok), 8) if not os.environ.get('NOSTATS') else []):
    ch = ok[k:k + 8]; names = [m['file'] for m in ch]
    steps = '[["wait",3],["eval","(async()=>{for(let i=0;i<80&&!window.__ready;i++)await new Promise(r=>setTimeout(r,1000));return 1})()",90],["shot","/tmp/vhsheets/s%d.png"]]' % (k // 8)
    open('/tmp/vhsteps.json', 'w').write(steps)
    subprocess.run(['timeout', '150', 'python3', 'tools/test/drive.py', 'tools/test/bodygrid.html?list=' + ','.join(names), '/tmp/vhsteps.json'], env=env, stdout=subprocess.DEVNULL)
    try: im = Image.open('/tmp/vhsheets/s%d.png' % (k // 8)).convert('RGB')
    except Exception: continue
    n = len(ch); cw = 1200 / n if n > 4 else 1200 / 8 * 1.0
    # 版面：相机按 n 缩放，人物居中；简单按列等分（n 个）
    for i, m in enumerate(ch):
        x0 = int(1200 / n * i); x1 = int(1200 / n * (i + 1)); px = []
        for y in range(120, 420, 2):
            for x in range(x0, x1, 2):
                r, g, b = im.getpixel((x, y))
                if abs(r - 0x59) + abs(g - 0x62) + abs(b - 0x6c) > 60: px.append((r, g, b))
        if len(px) < 30: continue
        # 去皮肤色（近似）：保留不像肤色的像素；全是肤色则用全部
        def skin(c): r, g, b = c; return r > 180 and g > 130 and b > 110 and r > g > b and r - b < 110
        q = [c for c in px if not skin(c)] or px
        L = sum(0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2] for c in q) / len(q) / 255
        S = sum(colorsys.rgb_to_hsv(*(v / 255 for v in c))[1] for c in q) / len(q)
        H = sorted(colorsys.rgb_to_hsv(*(v / 255 for v in c))[0] for c in q)[len(q) // 2]
        stats[m['file']] = (L, S, H)
if os.environ.get('NOSTATS'): stats = {m['file']: (0.5, 0.3, 0) for m in ok}  # 不渲染：只按标签分身份
import tempfile
json.dump(stats, open(os.path.join(tempfile.gettempdir(), 'vhstats.json'), 'w'))

def pick(m):
    t = ' '.join(m['tags'] + [m['name']]); L, S, H = stats.get(m['file'], (0.5, 0.3, 0))
    ids = []
    def add(*a): ids.extend(x for x in a if x not in ids)
    if re.search('魔女|ハロウィン|witch|魔法', t): add('witch', 'hexer', 'covenlady', 'bogwitch', 'courtmage')
    if re.search('錬金|薬|アトリエ|alchem', t): add('alchemist', 'herbalist', 'medic', 'druid')
    if re.search('和|着物|巫女|浴衣|kimono', t): add('foxmiko', 'dragonmiko', 'villager', 'barmaid', 'singer')
    if re.search('エルフ|弓|狩|森|elf', t): add('huntress', 'druid', 'shepherd', 'elfprincess', 'ranger', 'archer')
    if re.search('騎士|軍|兵|戦|鎧|アーマー|knight', t): add('guard', 'knight', 'paladin', 'merc', 'general')
    if re.search('忍|暗殺|盗|cat|猫', t): add('assassin', 'shadow', 'catthief', 'crossbow')
    if re.search('吸血|悪魔|ゴシック|ゴス|ダーク|dark', t): add('succubus', 'abyssqueen', 'fallen', 'duchess', 'inquisitor')
    if re.search('姫|貴族|女王|プリンセス|ドレス|princess|queen', t): add('princess', 'lady', 'countess', 'duchess', 'singer', 'musician')
    if re.search('シスター|修道|聖女|天使|nun|angel', t): add('nun', 'novice', 'saint', 'abbess', 'choir', 'archangel')
    if re.search('メイド|maid', t): add('barmaid', 'villager', 'smithgirl', 'novice')
    if re.search('冒険|旅|商|ranger', t): add('ranger', 'merc', 'bard', 'engineer', 'smithgirl')
    # 没有关键字：按衣服明度/饱和度
    if L < 0.33: add('hexer', 'courtmage', 'shaman', 'fallen', 'inquisitor', 'shadow', 'assassin', 'abyssqueen')
    elif L > 0.62 and S < 0.3: add('novice', 'medic', 'saint', 'choir', 'nun', 'abbess', 'villager', 'shepherd')
    elif S > 0.4: add('bard', 'singer', 'musician', 'lady', 'princess', 'barmaid', 'dragonprincess')
    else: add('villager', 'herbalist', 'smithgirl', 'engineer', 'ranger', 'guard', 'merc', 'huntress')
    return ids[:10]
OVR = {'VH_921690': ['guard', 'general', 'knight', 'paladin', 'merc']}  # 人工看图：军装外套
OVR.update(json.loads(os.environ.get('VH_IDS', '{}')))  # 人工指定 {文件:[身份…]}
new = {m['file']: {'n': m['name'], 'a': m['author'], 'ids': OVR.get(m['file']) or pick(m)} for m in ok if m['file'] in stats}
pack = dict(EXIST); pack.update(new)
js = '// R53 VRoid Hub 身体登记（tools/hub/mkpack.py 生成；每条授权在 hub.vroid.com 页面核对：允许暴力表现 / 改造 / 再分发）。\n// VH_PACK[文件名] = {n: 模型名, a: 作者, ids: 适配的身份}；身体本体在 big/body/<文件名>.js（按名字加载），由 js/foe.js vhExt 并入身份候选，MOD vh_bodies 可关。\nwindow.VH_PACK = ' + json.dumps(pack, ensure_ascii=False, indent=0).replace('\n', '') + ';\n'
open('js/vroid_pack.js', 'w').write(js)
open(os.path.join(tempfile.gettempdir(), 'vh_credits.md'), 'w', encoding='utf-8').write('\n'.join('- `%s` %s — %s (VRoid Hub; 暴力/改造/再分发 允许) https://hub.vroid.com/en/characters/%s/models/%s' % (m['file'], m['name'], m['author'], m['cid'], m['mid']) for m in ok if m['file'] in new) + '\n')
print(len(pack), 'registered')
