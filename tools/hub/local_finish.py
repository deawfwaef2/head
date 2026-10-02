#!/usr/bin/env python3
"""在你自己的电脑上：hubpipe.py 下载转换完后运行。
做三件事：① 身体比例质检（eyeY/(eyeY-neckY) >= 9.8）② 把通过的 models/VH_*.js、big/body/VH_*.js 拷进仓库 ③ 登记到 js/vroid_pack.js（按标签分身份）并追加 CREDITS.md。
之后你只需要 git add / commit / push（命令会打印出来）。用法: python tools/hub/local_finish.py [vrm_out 目录]"""
import json, os, re, shutil, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'vrm_out')
M = [json.loads(l) for l in open(os.path.join(OUT, 'manifest.jsonl'), encoding='utf-8') if l.strip()]
M = [m for m in M if m.get('file')]
def ratio(f):
    s = open(os.path.join(OUT, 'big', 'body', f + '.js'), encoding='utf-8').read(3000)
    e = re.search(r'"eyeY": ([0-9.]+)', s); n = re.search(r'"neckY": ([0-9.\-]+)', s)
    if not (e and n): return 0
    ey = float(e.group(1)); return ey / max(0.05, ey - float(n.group(1)))
ok, bad = [], []
for m in M:
    r = ratio(m['file']); (ok if r >= 9.8 else bad).append(m)
print('通过质检 %d，比例不合格 %d' % (len(ok), len(bad)))
os.makedirs(os.path.join(ROOT, 'models'), exist_ok=True); os.makedirs(os.path.join(ROOT, 'big', 'body'), exist_ok=True)
for m in ok:
    shutil.copy(os.path.join(OUT, 'models', m['file'] + '.js'), os.path.join(ROOT, 'models'))
    shutil.copy(os.path.join(OUT, 'big', 'body', m['file'] + '.js'), os.path.join(ROOT, 'big', 'body'))
st = os.path.join(OUT, 'state_local.json'); json.dump({'ok': ok}, open(st, 'w', encoding='utf-8'), ensure_ascii=False)
env = dict(os.environ, NOSTATS='1'); subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'hub', 'mkpack.py'), st], cwd=ROOT, env=env)
import tempfile
cr = os.path.join(tempfile.gettempdir(), 'vh_credits.md')
if os.path.exists(cr): open(os.path.join(ROOT, 'CREDITS.md'), 'a', encoding='utf-8').write('\n### VRoid Hub 追加批（本地下载）\n' + open(cr, encoding='utf-8').read())
print('\n完成。接着执行：\n  git add models big js/vroid_pack.js CREDITS.md\n  git commit -m "VRoid Hub 追加模型"\n  git pull --rebase && git push')
