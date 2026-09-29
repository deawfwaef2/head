# 模型瘦身：把 models/*.js 里 GLB 的表情 morph target 改成 glTF 稀疏访问器（只存有位移的顶点），
# 不需要源 VRM，三.js GLTFLoader 原生支持。用法：python3 tools/glbpack.py models/A.js [models/B.js ...]
import sys, json, base64, struct
import numpy as np

def unpack(path):
    s = open(path, encoding='utf-8').read()
    i = s.index('{'); j = s.rindex('}')
    return s[:i], json.loads(s[i:j + 1]), s[j + 1:]

def parse_glb(glb):
    jl = struct.unpack('<I', glb[12:16])[0]
    G = json.loads(glb[20:20 + jl])
    off = 20 + jl
    bl = struct.unpack('<I', glb[off:off + 4])[0]
    return G, bytearray(glb[off + 8:off + 8 + bl])

def build_glb(G, bin_):
    while len(bin_) % 4: bin_.append(0)
    G['buffers'] = [{'byteLength': len(bin_)}]
    js = json.dumps(G, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    return struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bin_)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(bin_), 0x004E4942) + bytes(bin_)

def pack(G, bin_, eps=1e-6):
    bv, acc = G['bufferViews'], G['accessors']
    targetAcc = set()
    for m in G['meshes']:
        for p in m['primitives']:
            for t in p.get('targets', []):
                for a in t.values(): targetAcc.add(a)
    quant, idxAcc = {}, set()
    for m in G['meshes']:
        for p in m['primitives']:
            at = p['attributes']
            if 'NORMAL' in at: quant[at['NORMAL']] = 'n'
            if 'POSITION' in at: quant[at['POSITION']] = 'p'
            for k in at:
                if k.startswith('TEXCOORD_'): quant[at[k]] = 'uv'
            if 'indices' in p: idxAcc.add(p['indices'])
    # 共享访问器若也被 morph 使用则不量化
    for a in list(quant):
        if a in targetAcc: quant.pop(a)
    newViews = []  # (bytes, target)
    viewMap = {}
    def keepView(i):
        if i not in viewMap:
            v = bv[i]; o = v.get('byteOffset', 0)
            newViews.append((bytes(bin_[o:o + v['byteLength']]), v.get('target'), v.get('byteStride')))
            viewMap[i] = len(newViews) - 1
        return viewMap[i]
    saved = 0
    for ai, a in enumerate(acc):
        if ai in targetAcc and 'bufferView' in a and a.get('componentType') == 5126 and a['type'] == 'VEC3' and 'sparse' not in a:
            v = bv[a['bufferView']]; o = v.get('byteOffset', 0) + a.get('byteOffset', 0)
            data = np.frombuffer(bytes(bin_[o:o + a['count'] * 12]), dtype=np.float32).reshape(-1, 3)
            nz = np.where(np.abs(data).max(1) > eps)[0]
            if len(nz) == 0: nz = np.array([0])
            if len(nz) < a['count'] * 0.6:
                it = 5123 if a['count'] < 65536 else 5125
                ib = nz.astype(np.uint16 if it == 5123 else np.uint32).tobytes()
                while len(ib) % 4: ib += b'\0'
                if False:  # 注意：GLTFLoader 用 setXYZ 写稀疏值会再归一化一次 → 溢出。稀疏值必须保持 float
                    vb = np.round(data[nz] * 32767).astype(np.int16).tobytes()
                    while len(vb) % 4: vb += b'\0'
                    a['componentType'] = 5122; a['normalized'] = True
                    if 'min' in a: a['min'] = [int(round(x * 32767)) for x in a['min']]; a['max'] = [int(round(x * 32767)) for x in a['max']]
                else: vb = data[nz].astype(np.float32).tobytes()
                newViews.append((ib, None, None)); ii = len(newViews) - 1
                newViews.append((vb, None, None)); vi = len(newViews) - 1
                saved += a['count'] * 12 - len(ib) - len(vb)
                a.pop('bufferView'); a.pop('byteOffset', None)
                a['sparse'] = {'count': int(len(nz)), 'indices': {'bufferView': -1 - ii, 'componentType': it}, 'values': {'bufferView': -1 - vi}}
                continue
        if ai in quant and 'bufferView' in a and a.get('componentType') == 5126 and 'sparse' not in a:
            kind = quant[ai]; n = {'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
            v = bv[a['bufferView']]; o = v.get('byteOffset', 0) + a.get('byteOffset', 0); st = v.get('byteStride') or n * 4
            raw = np.frombuffer(bytes(bin_[o:o + st * (a['count'] - 1) + n * 4]), dtype=np.uint8)
            data = np.lib.stride_tricks.as_strided(raw.view(np.uint8), shape=(a['count'], n * 4), strides=(st, 1)).copy().view(np.float32).reshape(-1, n)
            if kind == 'n':
                q = np.clip(np.round(data * 127), -127, 127).astype(np.int8); q = np.concatenate([q, np.zeros((len(q), 1), np.int8)], 1) if n == 3 else q  # 4 字节对齐
                newViews.append((q.tobytes(), 34962, 4 if n == 3 else None)); a['componentType'] = 5120; a['normalized'] = True
                a['bufferView'] = -1 - (len(newViews) - 1); a.pop('byteOffset', None); a.pop('min', None); a.pop('max', None); saved += a['count'] * (n * 4 - 4); continue
            if kind == 'p' and np.abs(data).max() < 0.999:
                q = np.round(data * 32767).astype(np.int16); q = np.concatenate([q, np.zeros((len(q), 1), np.int16)], 1)
                newViews.append((q.tobytes(), 34962, 8)); a['componentType'] = 5122; a['normalized'] = True
                a['bufferView'] = -1 - (len(newViews) - 1); a.pop('byteOffset', None)
                a['min'] = [int(x) for x in q[:, :3].min(0)]; a['max'] = [int(x) for x in q[:, :3].max(0)]; saved += a['count'] * 4; continue
            if kind == 'uv' and data.min() >= 0 and data.max() <= 1:
                q = np.round(data * 65535).astype(np.uint16)
                newViews.append((q.tobytes(), 34962, None)); a['componentType'] = 5123; a['normalized'] = True
                a['bufferView'] = -1 - (len(newViews) - 1); a.pop('byteOffset', None); a.pop('min', None); a.pop('max', None); saved += a['count'] * n * 2; continue
        if ai in idxAcc and 'bufferView' in a and a.get('componentType') == 5125:
            v = bv[a['bufferView']]; o = v.get('byteOffset', 0) + a.get('byteOffset', 0)
            data = np.frombuffer(bytes(bin_[o:o + a['count'] * 4]), dtype=np.uint32)
            if data.max() < 65535:
                q = data.astype(np.uint16).tobytes()
                while len(q) % 4: q += b'\0'
                newViews.append((q, 34963, None)); a['componentType'] = 5123; a['bufferView'] = -1 - (len(newViews) - 1); a.pop('byteOffset', None); saved += a['count'] * 2; continue
        if 'bufferView' in a: a['bufferView'] = -1 - keepView(a['bufferView'])
        if 'sparse' in a and a['sparse']['indices']['bufferView'] >= 0:  # 已是稀疏（重复运行）
            a['sparse']['indices']['bufferView'] = -1 - keepView(a['sparse']['indices']['bufferView'])
            if a.get('normalized') and a['componentType'] == 5122:  # 修复旧版：int16 稀疏值 → float
                v = bv[a['sparse']['values']['bufferView']]; o = v.get('byteOffset', 0) + a['sparse']['values'].get('byteOffset', 0)
                q = np.frombuffer(bytes(bin_[o:o + a['sparse']['count'] * 6]), dtype=np.int16).astype(np.float32) / 32767
                newViews.append((q.tobytes(), None, None)); a['sparse']['values']['bufferView'] = -1 - (len(newViews) - 1)
                a['componentType'] = 5126; a.pop('normalized')
                if 'min' in a: a['min'] = [x / 32767 for x in a['min']]; a['max'] = [x / 32767 for x in a['max']]
            else: a['sparse']['values']['bufferView'] = -1 - keepView(a['sparse']['values']['bufferView'])
    if any(a.get('normalized') for a in acc):
        eu = G.setdefault('extensionsUsed', [])
        if 'KHR_mesh_quantization' not in eu: eu.append('KHR_mesh_quantization')
    for im in G.get('images', []):
        if 'bufferView' in im: im['bufferView'] = -1 - keepView(im['bufferView'])
    # 重建 buffer
    out = bytearray(); views = []
    for data, tgt, stride in newViews:
        while len(out) % 4: out.append(0)
        d = {'buffer': 0, 'byteOffset': len(out), 'byteLength': len(data)}
        if tgt: d['target'] = tgt
        if stride: d['byteStride'] = stride
        views.append(d); out += data
    fix = lambda x: -1 - x
    for a in acc:
        if 'bufferView' in a: a['bufferView'] = fix(a['bufferView'])
        if 'sparse' in a:
            a['sparse']['indices']['bufferView'] = fix(a['sparse']['indices']['bufferView'])
            a['sparse']['values']['bufferView'] = fix(a['sparse']['values']['bufferView'])
    for im in G.get('images', []):
        if 'bufferView' in im: im['bufferView'] = fix(im['bufferView'])
    G['bufferViews'] = views
    return G, out, saved

if __name__ == '__main__':
    tot0 = tot1 = 0
    for path in sys.argv[1:]:
        pre, body, post = unpack(path)
        glb = base64.b64decode(body['glb'])
        G, bin_ = parse_glb(glb)
        G, bin2, saved = pack(G, bin_)
        glb2 = build_glb(G, bin2)
        body['glb'] = base64.b64encode(glb2).decode()
        open(path, 'w', encoding='utf-8').write(pre + json.dumps(body, ensure_ascii=False, separators=(',', ':')) + post)
        tot0 += len(glb); tot1 += len(glb2)
        print('%-28s %7.0f KB -> %7.0f KB' % (path.split('/')[-1], len(glb) / 1024, len(glb2) / 1024))
    print('total %.1f MB -> %.1f MB' % (tot0 / 1048576, tot1 / 1048576))
