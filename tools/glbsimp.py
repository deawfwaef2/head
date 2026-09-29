# 头发减面：只对无 morph 的 HAIR 图元用 meshoptimizer 简化索引，再压缩掉没用到的顶点（UV/法线原样保留）。
# 用法：PYTHONPATH=~/.cache/pylib2 python3 tools/glbsimp.py [--budget 16000] models/X.js ...
# 之后再跑 tools/glbpack.py 量化/稀疏化。
import sys, json, base64, struct
import numpy as np
import meshoptimizer as mo
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from glbpack import unpack, parse_glb, build_glb

DT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
NORM = {5120: 127.0, 5121: 255.0, 5122: 32767.0, 5123: 65535.0}

def read(G, bin_, ai):
    a = G['accessors'][ai]; n = NC[a['type']]; dt = np.dtype(DT[a['componentType']])
    v = G['bufferViews'][a['bufferView']]; o = v.get('byteOffset', 0) + a.get('byteOffset', 0); st = v.get('byteStride') or n * dt.itemsize
    raw = np.frombuffer(bytes(bin_[o:o + st * (a['count'] - 1) + n * dt.itemsize]), dtype=np.uint8)
    arr = np.lib.stride_tricks.as_strided(raw, shape=(a['count'], n * dt.itemsize), strides=(st, 1)).copy().view(dt).reshape(a['count'], n)
    if a.get('normalized'): arr = np.maximum(arr.astype(np.float32) / NORM[a['componentType']], -1)
    return arr

def write(G, bin_, arr, typ, target, ai=None):
    while len(bin_) % 4: bin_.append(0)
    data = arr.tobytes(); v = {'buffer': 0, 'byteOffset': len(bin_), 'byteLength': len(data)}
    if target: v['target'] = target
    G['bufferViews'].append(v); bin_ += data
    ct = 5126 if arr.dtype == np.float32 else 5125
    acc = {'bufferView': len(G['bufferViews']) - 1, 'componentType': ct, 'count': int(arr.shape[0] if arr.ndim > 1 else arr.size), 'type': typ}
    if typ == 'VEC3' and ct == 5126: acc['min'] = [float(x) for x in arr.min(0)]; acc['max'] = [float(x) for x in arr.max(0)]
    if ai is not None: G['accessors'][ai] = acc; return ai
    G['accessors'].append(acc); return len(G['accessors']) - 1

def simp(G, bin_, budget):
    prims = [(m, p) for m in G['meshes'] for p in m['primitives']]
    total = sum(G['accessors'][p['attributes']['POSITION']]['count'] for m, p in prims)
    hair = [p for m, p in prims if 'HAIR' in (G['materials'][p['material']].get('name', '').upper()) and not p.get('targets')]
    hv = sum(G['accessors'][p['attributes']['POSITION']]['count'] for p in hair)
    if total <= budget or not hv: return total, total
    keep = max(0.25, min(1.0, (budget - (total - hv)) / hv))
    for p in hair:
        pos = read(G, bin_, p['attributes']['POSITION']).astype(np.float32)
        idx = read(G, bin_, p['indices']).reshape(-1).astype(np.uint32)
        if len(pos) < 600: continue
        tgt = max(300, int(len(idx) * keep) // 3 * 3)
        dst = np.zeros_like(idx)
        n = mo.simplify(dst, idx, pos, target_index_count=tgt, target_error=0.012)
        nidx = dst[:n]
        used = np.unique(nidx); remap = np.full(len(pos), -1, np.int64); remap[used] = np.arange(len(used))
        for k, ai in list(p['attributes'].items()):
            arr = read(G, bin_, ai).astype(np.float32)[used]
            p['attributes'][k] = write(G, bin_, np.ascontiguousarray(arr), G['accessors'][ai]['type'], 34962, ai)
        p['indices'] = write(G, bin_, remap[nidx].astype(np.uint32), 'SCALAR', 34963, p['indices'])
    after = sum(G['accessors'][p['attributes']['POSITION']]['count'] for m, p in prims)
    return total, after

if __name__ == '__main__':
    args = sys.argv[1:]; budget = 16000
    if args and args[0] == '--budget': budget = int(args[1]); args = args[2:]
    for path in args:
        pre, body, post = unpack(path)
        G, bin_ = parse_glb(base64.b64decode(body['glb']))
        a, b = simp(G, bin_, budget)
        body['glb'] = base64.b64encode(build_glb(G, bin_)).decode()
        open(path, 'w', encoding='utf-8').write(pre + json.dumps(body, ensure_ascii=False, separators=(',', ':')) + post)
        print('%-20s verts %6d -> %6d' % (path.split('/')[-1], a, b))
