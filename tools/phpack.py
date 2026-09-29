# Poly Haven (CC0) 模型 → 游戏资产 assets/<名>.js（base64 GLB，file:// 可用）
# 下载 1k glTF → meshoptimizer 按三角形预算减面 → 法线 int8 / UV uint16 量化 → 贴图缩放重编码 JPEG → 单 buffer GLB
# 用法：PYTHONPATH=~/.cache/pylib2 python3 tools/phpack.py <polyhaven_id> [--tris 8000] [--tex 512] [--q 82] [--name 名] [--res 1k]
import sys, os, json, struct, io, base64, urllib.request
import numpy as np
import meshoptimizer as mo
from PIL import Image

CACHE = os.path.expanduser('~/.cache/ph')
DT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
ERR = 0.02  # meshopt 目标误差（foliage.py 对树干放宽）
NORM = {5120: 127.0, 5121: 255.0, 5122: 32767.0, 5123: 65535.0}

UA = {'User-Agent': 'soulhead-asset-packer/1.0'}
def get(url): return urllib.request.urlopen(urllib.request.Request(url, headers=UA)).read()

def fetch(pid, res='1k'):
    d = os.path.join(CACHE, pid); os.makedirs(d, exist_ok=True)
    j = json.loads(get('https://api.polyhaven.com/files/' + pid))
    g = j['gltf'][res]['gltf']
    files = [(g['url'], os.path.basename(g['url']))] + [(v['url'], k) for k, v in g['include'].items()]
    for url, rel in files:
        out = os.path.join(d, rel)
        if os.path.exists(out) and os.path.getsize(out) > 0: continue
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, 'wb').write(get(url))
    return os.path.join(d, os.path.basename(g['url']))

def read(G, bins, ai):
    a = G['accessors'][ai]; n = NC[a['type']]; dt = np.dtype(DT[a['componentType']])
    v = G['bufferViews'][a['bufferView']]; b = bins[v['buffer']]
    o = v.get('byteOffset', 0) + a.get('byteOffset', 0); st = v.get('byteStride') or n * dt.itemsize
    raw = np.frombuffer(b[o:o + st * (a['count'] - 1) + n * dt.itemsize], dtype=np.uint8)
    arr = np.lib.stride_tricks.as_strided(raw, shape=(a['count'], n * dt.itemsize), strides=(st, 1)).copy().view(dt).reshape(a['count'], n)
    if a.get('normalized'): arr = np.maximum(arr.astype(np.float32) / NORM[a['componentType']], -1)
    return arr

class Out:
    def __init__(self): self.bin = bytearray(); self.views = []; self.accs = []
    def view(self, data, target=None):
        while len(self.bin) % 4: self.bin.append(0)
        v = {'buffer': 0, 'byteOffset': len(self.bin), 'byteLength': len(data)}
        if target: v['target'] = target
        self.bin += data; self.views.append(v); return len(self.views) - 1
    def acc(self, arr, typ, ct, target, normalized=False, mm=False):
        vi = self.view(np.ascontiguousarray(arr).tobytes(), target)
        a = {'bufferView': vi, 'componentType': ct, 'count': int(arr.shape[0]), 'type': typ}
        if normalized: a['normalized'] = True
        if mm: a['min'] = [float(x) for x in arr.min(0)]; a['max'] = [float(x) for x in arr.max(0)]
        self.accs.append(a); return len(self.accs) - 1

def pack(gltf_path, tris=8000, tex=512, q=82, texmap=None):
    G = json.load(open(gltf_path)); base = os.path.dirname(gltf_path)
    bins = [open(os.path.join(base, b['uri']), 'rb').read() for b in G['buffers']]
    prims = [p for m in G['meshes'] for p in m['primitives']]
    total = sum(len(read(G, bins, p['indices'])) // 3 for p in prims)
    keep = min(1.0, tris / max(1, total))
    O = Out()
    for p in prims:
        pos = read(G, bins, p['attributes']['POSITION']).astype(np.float32)
        idx = read(G, bins, p['indices']).reshape(-1).astype(np.uint32)
        if keep < 0.999 and len(idx) > 300:
            tgt = max(96, int(len(idx) * keep) // 3 * 3)
            dst = np.zeros_like(idx); n = mo.simplify(dst, idx, pos, target_index_count=tgt, target_error=ERR)
            if n >= 3: idx = dst[:n]
        used = np.unique(idx); remap = np.full(len(pos), 0, np.int64); remap[used] = np.arange(len(used)); idx = remap[idx]
        at = {}
        for k, ai in p['attributes'].items():
            arr = read(G, bins, ai).astype(np.float32)[used]
            if k == 'POSITION': at[k] = O.acc(arr, 'VEC3', 5126, 34962, mm=True)
            elif k == 'NORMAL': at[k] = O.acc(np.concatenate([np.clip(np.round(arr * 127), -127, 127).astype(np.int8), np.zeros((len(arr), 1), np.int8)], 1), 'VEC3', 5120, 34962, normalized=True)
            elif k == 'TEXCOORD_0':
                if arr.min() >= 0 and arr.max() <= 1: at[k] = O.acc(np.round(arr * 65535).astype(np.uint16), 'VEC2', 5123, 34962, normalized=True)
                else: at[k] = O.acc(arr, 'VEC2', 5126, 34962)
            # TANGENT / 其他 UV 丢弃（three 用导数重建切线空间）
        p['attributes'] = at
        p['indices'] = O.acc(idx.astype(np.uint16 if len(used) < 65536 else np.uint32), 'SCALAR', 5123 if len(used) < 65536 else 5125, 34963)
        p.pop('targets', None)
    # 法线 VEC3 int8 需要 4 字节对齐的 stride：上面补了第 4 分量，这里把 byteStride 设为 4
    for a in O.accs:
        if a['componentType'] == 5120 and a['type'] == 'VEC3': O.views[a['bufferView']]['byteStride'] = 4
    # 贴图
    imgs = []
    for i, im in enumerate(G.get('images', [])):
        src = Image.open(os.path.join(base, im['uri']))
        size = (texmap or {}).get(i, tex)
        hasA = src.mode in ('RGBA', 'LA') and np.array(src.getchannel('A')).min() < 250
        src = src.convert('RGBA' if hasA else 'RGB')
        if max(src.size) > size: src = src.resize((size, size) if src.size[0] == src.size[1] else (size, int(size * src.size[1] / src.size[0])), Image.LANCZOS)
        buf = io.BytesIO()
        if hasA: src.save(buf, 'PNG', optimize=True); mime = 'image/png'
        else: src.save(buf, 'JPEG', quality=q, optimize=True, progressive=False); mime = 'image/jpeg'
        imgs.append({'bufferView': O.view(buf.getvalue()), 'mimeType': mime, 'name': im.get('name', str(i))})
    G['images'] = imgs
    G['accessors'] = O.accs; G['bufferViews'] = O.views; G['buffers'] = [{'byteLength': len(O.bin)}]
    for k in ('extensionsUsed', 'extensionsRequired'): G.pop(k, None)
    for s in G.get('samplers', []): pass
    js = json.dumps(G, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    while len(O.bin) % 4: O.bin.append(0)
    glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(O.bin)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(O.bin), 0x004E4942) + bytes(O.bin)
    return glb, total, sum(len(read_out(O, p)) for p in prims) // 3

def read_out(O, p):
    a = O.accs[p['indices']]; return range(a['count'])

def write_asset(name, glb, outdir):
    os.makedirs(outdir, exist_ok=True)
    s = '(window.ASSETS=window.ASSETS||{})[' + json.dumps(name) + ']="' + base64.b64encode(glb).decode() + '";\n'
    open(os.path.join(outdir, name + '.js'), 'w').write(s); return len(s)

if __name__ == '__main__':
    a = sys.argv[1:]; pid = a[0]; opt = {'--tris': '8000', '--tex': '512', '--q': '82', '--name': pid, '--res': '1k', '--out': 'assets'}
    for i in range(1, len(a) - 1, 2): opt[a[i]] = a[i + 1]
    path = fetch(pid, opt['--res'])
    glb, t0, t1 = pack(path, int(opt['--tris']), int(opt['--tex']), int(opt['--q']))
    n = write_asset(opt['--name'], glb, opt['--out'])
    print(f"{opt['--name']}: tris {t0} -> {t1}, {n // 1024} KB")
