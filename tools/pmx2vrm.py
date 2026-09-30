#!/usr/bin/env python3
"""PMX -> VRM0-like GLB so tools/vrm2head.py can cut the head. usage: pmx2vrm.py in.pmx out.vrm"""
import sys, os, io, json, struct, numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__)); from pmxread import read
src, dst = sys.argv[1], sys.argv[2]; base = os.path.dirname(src)
P = read(src); S = 0.08
pos = P['pos'] * S; pos[:, 2] *= -1
nrm = P['nrm'].copy(); nrm[:, 2] *= -1
def cls(n):
    if n.endswith('+') or 'spa' in n.lower() or 'sph' in n.lower() or n.lower().startswith('mmd_edge') or 'edge' in n.lower(): return None  # 描边外壳
    if any(k in n for k in ('白目', '眼白', 'eyewhite', 'EyeWhite')): return '_EYE_EyeWhite'
    if any(k in n for k in ('星', 'ハイライト', '高光', 'highlight', 'Highlight', 'hl')): return '_EYE_Highlight'
    if any(k in n for k in ('脸红', '頬', '照れ', '红晕', 'cheek', '黑', '影', 'shadow')): return '_FACE_Cheek'
    if '眉' in n or 'brow' in n.lower(): return '_FACE_Brow'
    if any(k in n for k in ('睫', '二重', 'まつ', '眼线', 'lash')): return '_FACE_Eyeline'
    if any(k in n for k in ('目', '眼', '瞳', 'eye', 'Eye')): return '_EYE_Iris'
    if any(k in n for k in ('口', '齿', '齒', '歯', '舌', 'mouth', 'teeth')): return '_FACE_Mouth'
    if any(k in n for k in ('颜', '顔', '脸', '臉', '面', 'face', 'Face', '表情')): return 'FACE_SKIN'
    if any(k in n for k in ('髮', '髪', '发', '頭髪', 'hair', 'Hair')): return '_HAIR'
    if any(k in n for k in ('肌', '皮肤', 'skin', 'Skin')): return 'Body_SKIN'
    return 'cloth'
bin_ = bytearray(); G = {'asset': {'version': '2.0'}, 'buffers': [], 'bufferViews': [], 'accessors': [], 'meshes': [], 'nodes': [], 'scenes': [{'nodes': []}], 'scene': 0,
     'materials': [], 'textures': [], 'images': [], 'samplers': [{}], 'skins': []}
def view(b):
    while len(bin_) % 4: bin_.append(0)
    o = len(bin_); bin_.extend(b); G['bufferViews'].append({'buffer': 0, 'byteOffset': o, 'byteLength': len(b)}); return len(G['bufferViews']) - 1
def acc(a, typ, ct):
    a = np.ascontiguousarray(a); G['accessors'].append({'bufferView': view(a.tobytes()), 'componentType': ct, 'count': int(len(a)), 'type': typ}); return len(G['accessors']) - 1
# bones
B = P['bones']; bp = np.array([b['pos'] for b in B]) * S; bp[:, 2] *= -1
for i, b in enumerate(B):
    par = b['parent']; t = bp[i] - (bp[par] if 0 <= par < len(B) else 0)
    G['nodes'].append({'name': 'b%d' % i, 'translation': [float(x) for x in t]})
for i, b in enumerate(B):
    par = b['parent']
    if 0 <= par < len(B): G['nodes'][par].setdefault('children', []).append(i)
    else: G['scenes'][0]['nodes'].append(i)
def bone(*names):
    for n in names:
        for i, b in enumerate(B):
            if b['name'] == n: return i
    return None
HEAD = bone('頭', '头', 'Head', 'head'); NECK = bone('首', '颈', 'Neck', 'neck') or HEAD
assert HEAD is not None, 'no head bone'
ibm = np.zeros((len(B), 4, 4), np.float32)
for i in range(len(B)): M = np.eye(4); M[:3, 3] = -bp[i]; ibm[i] = M.T
G['skins'].append({'joints': list(range(len(B))), 'inverseBindMatrices': acc(ibm.reshape(-1, 16), 'MAT4', 5126)})
# textures
tcache = {}
def tex(ti):
    if ti < 0 or ti >= len(P['tex']): return None
    if ti in tcache: return tcache[ti]
    fp = os.path.join(base, P['tex'][ti].replace('\\', '/'))
    try:
        im = Image.open(fp); im.load(); im = im.convert('RGBA')
        if max(im.size) > 1024: s = 1024 / max(im.size); im = im.resize((int(im.size[0] * s), int(im.size[1] * s)), Image.LANCZOS)
        b = io.BytesIO(); im.save(b, 'PNG'); alpha = im.getchannel('A').getextrema()[0] < 250
        G['images'].append({'bufferView': view(b.getvalue()), 'mimeType': 'image/png'}); G['textures'].append({'sampler': 0, 'source': len(G['images']) - 1})
        tcache[ti] = (len(G['textures']) - 1, alpha)
    except Exception as e:
        print('tex miss', fp, e); tcache[ti] = None
    return tcache[ti]
# morphs
WANT = {'a': ['あ'], 'i': ['い'], 'u': ['う'], 'e': ['え'], 'o': ['お'], 'blink': ['まばたき'], 'blink_l': ['ウィンク'], 'blink_r': ['ウィンク右'],
        'joy': ['笑い', 'にやり'], 'angry': ['怒り', '真面目'], 'sorrow': ['困る', '悲しむ'], 'fun': ['なごみ', 'にこり'], 'surprised': ['びっくり']}
mlist = []; groups = []
byname = {m['name']: m for m in P['morphs'] if m['type'] == 1}
for pn, names in WANT.items():
    binds = []
    for n in names:
        if n in byname:
            if n not in mlist: mlist.append(n)
            binds.append({'mesh': 0, 'index': mlist.index(n), 'weight': 100 if len(binds) == 0 else 60})
    if binds: groups.append({'name': pn, 'presetName': pn, 'binds': binds})
D = []
for n in mlist:
    d = np.zeros((len(pos), 3), np.float32)
    for vi, off in byname[n]['data']: d[vi] = off
    d *= S; d[:, 2] *= -1; D.append(d)
# primitives
prims = []; nv = len(pos)
p32 = pos.astype(np.float32); n32 = nrm.astype(np.float32); uv = P['uv'].astype(np.float32)
J4 = P['bi'].clip(0).astype(np.uint16); W4 = (P['bw'] / np.maximum(P['bw'].sum(1, keepdims=True), 1e-9)).astype(np.float32)
A = {'POSITION': acc(p32, 'VEC3', 5126), 'NORMAL': acc(n32, 'VEC3', 5126), 'TEXCOORD_0': acc(uv, 'VEC2', 5126), 'JOINTS_0': acc(J4, 'VEC4', 5123), 'WEIGHTS_0': acc(W4, 'VEC4', 5126)}
TG = [{'POSITION': acc(d, 'VEC3', 5126)} for d in D]
G['accessors'][A['POSITION']]['min'] = p32.min(0).tolist(); G['accessors'][A['POSITION']]['max'] = p32.max(0).tolist()
seen = {}
for m in P['mats']:
    c = cls(m['name'])
    if c is None or m['nf'] == 0 or m['color'][3] < 0.05: continue
    k = seen.get(c, 0); seen[c] = k + 1; name = c if k == 0 else '%s%d' % (c, k)
    if c == 'cloth': name = 'cloth_%d' % k
    f = P['faces'][m['f0']:m['f0'] + m['nf']][:, [0, 2, 1]].astype(np.uint32)
    mat = {'name': name, 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, float(m['color'][3])]}, 'doubleSided': bool(m['flag'] & 1)}
    t = tex(m['tex'])
    if not t:  # 无贴图材质（あにまさ式等老模型）：颜色全靠材质漫反射色 → 生成 4×4 纯色贴图（×1.2 近似 MMD 环境光补亮），让游戏的贴图路径（亮度/肤色修正）一致
        rgb = tuple(int(min(255, max(0, x * 1.2 * 255))) for x in m['color'][:3]); ck = ('solid',) + rgb
        if ck not in tcache:
            b = io.BytesIO(); Image.new('RGBA', (4, 4), rgb + (255,)).save(b, 'PNG')
            G['images'].append({'bufferView': view(b.getvalue()), 'mimeType': 'image/png'}); G['textures'].append({'sampler': 0, 'source': len(G['images']) - 1}); tcache[ck] = (len(G['textures']) - 1, False)
        t = tcache[ck]
    if t:
        mat['pbrMetallicRoughness']['baseColorTexture'] = {'index': t[0]}
        if t[1]: mat['alphaMode'] = 'BLEND' if 'Highlight' in c else 'MASK'; mat['alphaCutoff'] = 0.5
    G['materials'].append(mat)
    pr = {'attributes': A, 'indices': acc(f.ravel(), 'SCALAR', 5125), 'material': len(G['materials']) - 1}
    if TG: pr['targets'] = TG
    prims.append(pr)
G['meshes'].append({'primitives': prims})
G['nodes'].append({'name': 'body', 'mesh': 0, 'skin': 0}); G['scenes'][0]['nodes'].append(len(G['nodes']) - 1)
G['extensions'] = {'VRM': {'meta': {'violentUssageName': 'Allow', 'licenseName': 'CC0'}, 'humanoid': {'humanBones': [{'bone': 'head', 'node': HEAD}, {'bone': 'neck', 'node': NECK}]},
                   'blendShapeMaster': {'blendShapeGroups': groups}}}
while len(bin_) % 4: bin_.append(0)
G['buffers'] = [{'byteLength': len(bin_)}]
js = json.dumps(G).encode()
while len(js) % 4: js += b' '
open(dst, 'wb').write(struct.pack('<III', 0x46546C67, 2, 28 + len(js) + len(bin_)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(bin_), 0x004E4942) + bytes(bin_))
print('ok', dst, len(bin_) // 1024, 'KB', 'morphs', mlist, 'mats', seen)
