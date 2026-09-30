#!/usr/bin/env python3
"""R41：Quaternius 怪物 glTF（内嵌 data URI）→ 精简 GLB（只留用到的动画、丢掉未引用的 bufferView）→ beasts/<key>.js
用法：python3 tools/beast_pack.py src.gltf key "Idle,Walk,Run,Punch,HitReact,Death" [out_dir=beasts]"""
import sys, json, base64, struct, os
src, key, keep = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
out_dir = sys.argv[4] if len(sys.argv) > 4 else 'beasts'
g = json.load(open(src))
bufs = []
for b in g['buffers']:
    u = b['uri']; assert u.startswith('data:'); bufs.append(base64.b64decode(u.split(',', 1)[1]))
g['animations'] = [a for a in g.get('animations', []) if a['name'] in keep]
used_acc = set()
for m in g['meshes']:
    for p in m['primitives']:
        used_acc.update(p['attributes'].values())
        if 'indices' in p: used_acc.add(p['indices'])
        for t in p.get('targets', []): used_acc.update(t.values())
for s in g.get('skins', []):
    if 'inverseBindMatrices' in s: used_acc.add(s['inverseBindMatrices'])
for a in g['animations']:
    for sm in a['samplers']: used_acc.update([sm['input'], sm['output']])
used_bv = set(g['accessors'][i]['bufferView'] for i in used_acc if 'bufferView' in g['accessors'][i])
for im in g.get('images', []):
    if 'bufferView' in im: used_bv.add(im['bufferView'])
    elif 'uri' in im and im['uri'].startswith('data:'):
        raise SystemExit('data-uri images not handled')
# 重排 accessors / bufferViews
acc_map = {}; new_acc = []
for i, a in enumerate(g['accessors']):
    if i in used_acc: acc_map[i] = len(new_acc); new_acc.append(a)
bv_map = {}; new_bv = []; blob = bytearray()
for i, v in enumerate(g['bufferViews']):
    if i not in used_bv: continue
    d = bufs[v.get('buffer', 0)][v.get('byteOffset', 0): v.get('byteOffset', 0) + v['byteLength']]
    while len(blob) % 4: blob.append(0)
    nv = dict(v); nv['buffer'] = 0; nv['byteOffset'] = len(blob); blob += d
    bv_map[i] = len(new_bv); new_bv.append(nv)
for a in new_acc:
    if 'bufferView' in a: a['bufferView'] = bv_map[a['bufferView']]
for im in g.get('images', []):
    if 'bufferView' in im: im['bufferView'] = bv_map[im['bufferView']]
for m in g['meshes']:
    for p in m['primitives']:
        p['attributes'] = {k: acc_map[v] for k, v in p['attributes'].items()}
        if 'indices' in p: p['indices'] = acc_map[p['indices']]
        if 'targets' in p: p['targets'] = [{k: acc_map[v] for k, v in t.items()} for t in p['targets']]
for s in g.get('skins', []):
    if 'inverseBindMatrices' in s: s['inverseBindMatrices'] = acc_map[s['inverseBindMatrices']]
for a in g['animations']:
    for sm in a['samplers']: sm['input'] = acc_map[sm['input']]; sm['output'] = acc_map[sm['output']]
g['accessors'] = new_acc; g['bufferViews'] = new_bv
while len(blob) % 4: blob.append(0)
g['buffers'] = [{'byteLength': len(blob)}]
g['asset'] = {'version': '2.0', 'generator': 'beast_pack (Quaternius Ultimate Monsters, CC0)'}
j = json.dumps(g, separators=(',', ':')).encode()
while len(j) % 4: j += b' '
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(j) + 8 + len(blob)) + struct.pack('<II', len(j), 0x4E4F534A) + j + struct.pack('<II', len(blob), 0x004E4942) + bytes(blob)
os.makedirs(out_dir, exist_ok=True)
open(os.path.join(out_dir, key + '.js'), 'w').write('(window.BEAST_GLB=window.BEAST_GLB||{})[%s]="%s";\n' % (json.dumps(key), base64.b64encode(glb).decode()))
print(key, 'clips', [a['name'] for a in g['animations']], 'glb', len(glb), 'js', os.path.getsize(os.path.join(out_dir, key + '.js')))
