#!/usr/bin/env python3
"""从 index.html 生成轻量测试页 _t.html（只保留少数头模，去掉 GI_ 原神头模），避免 2GB 沙箱里 headless 浏览器 OOM。
用法: python3 tools/test/mk_t.py [保留的头模个数=3]"""
import re, sys
n = int(sys.argv[1]) if len(sys.argv) > 1 else 3
src = open('index.html', encoding='utf-8').read()
keep = {'models/AvatarSample_K.js', 'models/AvatarSample_L.js', 'models/AvatarSample_S.js', 'models/Hikari.js', 'models/Touka.js'}
keep = list(keep)[:n]
def f(m):
    p = m.group(1)
    if p.startswith('models/') and p != 'models/props_pack.js' and p not in keep: return ''
    return m.group(0)
out = re.sub(r'<script src="([^"]+)"></script>', f, src)
open('_t.html', 'w', encoding='utf-8').write(out)
print('ok', len(out))
