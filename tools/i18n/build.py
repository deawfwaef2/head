# -*- coding: utf-8 -*-
# 用法：python3 tools/i18n/build.py  → 生成 js/i18n_data.js（d_*.py 里的词典）
import re, json, glob, importlib.util, os
root = os.path.dirname(os.path.abspath(__file__))
def conv(rows):
    out = []
    for r in rows:
        zh, en, ja = r[0], r[1], r[2]
        toks = []
        for m in re.finditer(r'\$([A-Za-z][A-Za-z0-9_]*)', zh):
            if m.group(1) not in toks: toks.append(m.group(1))
        f = lambda s: re.sub(r'\$([A-Za-z][A-Za-z0-9_]*)', lambda m: '{#%d}' % toks.index(m.group(1)), s)
        row = [f(zh), f(en), f(ja)]
        if len(r) > 3: row.append(r[3])
        out.append(row)
    return out
def load(path):
    spec = importlib.util.spec_from_file_location('d', path); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m.D
seen = {}
for f in sorted(glob.glob(os.path.join(root, 'd_*.py'))):
    for r in conv(load(f)): seen[r[0]] = r
rows = list(seen.values())
js = '// 自动生成：tools/i18n/build.py（词典源在 tools/i18n/d_*.py）。格式 [zh, en, ja]；{0} {1} 是数字/名字占位。\nI18N.add(' + json.dumps(rows, ensure_ascii=False, separators=(',', ':')).replace('],[', '],\n[') + ');\n'
open(os.path.join(root, '..', '..', 'js', 'i18n_data.js'), 'w', encoding='utf-8').write(js)
print(len(rows), 'entries')
