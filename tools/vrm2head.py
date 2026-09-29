#!/usr/bin/env python3
"""VRM(0.x / 1.0) → 魂首窟头部模型 models/<File>.js

用法: python3 tools/vrm2head.py input.vrm File "显示名" "作者 (授权)" [--grp vroid] [--hair-drop 0.12]

处理：
  1. 按静止姿势完整蒙皮（关节世界矩阵 × 逆绑定矩阵），得到模型空间顶点
  2. 保留：脸部全部图元；头发（HAIR 材质，按头骨权重）；身体皮肤的颈部；
     头部权重 ≥0.95 的衣物/饰品三角形（帽子、发饰）
  3. 平面切颈：切面以下的顶点压平到切面，并加圆形封盖（材质 __CUT__）
  4. 长发截断在切面以下 hair-drop 米
  5. 只保留表情预设用到的 morph（仅 POSITION），重新编号
  6. 贴图转 WebP（脸/头发 ≤1024，身体 ≤256）
  7. 坐标：原点 = 切面与头顶的中点，x 居中，z = 头骨中心；朝向 +Z
授权：只处理 VRM 元数据允许 暴力表现 + 再分发 + 修改 的模型（否则报错退出，--force 跳过检查）。
"""
import sys, json, struct, io, base64, math, argparse
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('file'); ap.add_argument('name'); ap.add_argument('credit')
ap.add_argument('--grp', default='vroid'); ap.add_argument('--hair-drop', type=float, default=0.12)
ap.add_argument('--norm', type=float, default=0.194)  # 统一 切面→头顶 高度（与现有模型一致）
ap.add_argument('--sc', type=float, default=0); ap.add_argument('--noflip', action='store_true'); ap.add_argument('--out', default=None); ap.add_argument('--force', action='store_true')
A = ap.parse_args()

raw = open(A.src, 'rb').read()
assert raw[:4] == b'glTF', 'not a GLB/VRM'
off = 12; J = None; BIN = None
while off < len(raw):
    ln, ty = struct.unpack('<II', raw[off:off + 8]); ch = raw[off + 8: off + 8 + ln]
    if ty == 0x4E4F534A: J = json.loads(ch)
    elif ty == 0x004E4942: BIN = ch
    off += 8 + ln
EX = J.get('extensions', {})
V1 = 'VRMC_vrm' in EX

# ---------- 授权检查 ----------
if V1:
    meta = EX['VRMC_vrm']['meta']
    ok = meta.get('allowExcessivelyViolentUsage') and meta.get('allowRedistribution') and meta.get('modification') in ('allowModification', 'allowModificationRedistribution')
else:
    meta = EX['VRM']['meta']
    lic = meta.get('licenseName', ''); url = meta.get('otherPermissionUrl', '') or ''
    ok = meta.get('violentUssageName') == 'Allow' and (lic.startswith('CC0') or lic.startswith('CC_BY') or ('redistribution=allow' in url and 'modification=allow' in url))
if not ok and not A.force:
    sys.exit('授权不允许（暴力/再分发/修改），已跳过: ' + json.dumps(meta, ensure_ascii=False)[:300])

# ---------- 访问器 ----------
CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
def acc(i):
    a = J['accessors'][i]
    dt = CT[a['componentType']]; n = NC[a['type']]; cnt = a['count']
    if 'bufferView' not in a:  # 稀疏访问器（UniVRM 导出的 morph）：零底 + 稀疏值
        out = np.zeros((cnt, n) if n > 1 else cnt, np.float64 if dt == np.float32 else dt)
        sp = a.get('sparse')
        if sp:
            ib = J['bufferViews'][sp['indices']['bufferView']]; vb = J['bufferViews'][sp['values']['bufferView']]
            ii = np.frombuffer(BIN, CT[sp['indices']['componentType']], count=sp['count'], offset=ib.get('byteOffset', 0) + sp['indices'].get('byteOffset', 0))
            vv = np.frombuffer(BIN, dt, count=sp['count'] * n, offset=vb.get('byteOffset', 0) + sp['values'].get('byteOffset', 0))
            out[ii.astype(np.int64)] = vv.reshape(-1, n) if n > 1 else vv
        return out
    bv = J['bufferViews'][a['bufferView']]
    start = bv.get('byteOffset', 0) + a.get('byteOffset', 0); stride = bv.get('byteStride', 0)
    isz = np.dtype(dt).itemsize * n
    if stride and stride != isz:
        buf = np.frombuffer(BIN, np.uint8, count=stride * (cnt - 1) + isz, offset=start)
        out = np.stack([np.frombuffer(buf[k * stride:k * stride + isz].tobytes(), dt) for k in range(cnt)])
    else:
        out = np.frombuffer(BIN, dt, count=cnt * n, offset=start).reshape(cnt, n) if n > 1 else np.frombuffer(BIN, dt, count=cnt, offset=start)
    out = out.astype(np.float64) if dt == np.float32 else out
    if a.get('normalized') and dt in (np.uint8, np.uint16):
        out = out.astype(np.float64) / (255.0 if dt == np.uint8 else 65535.0)
    return out

# ---------- 节点矩阵 ----------
def trs(n):
    if 'matrix' in n: return np.array(n['matrix'], dtype=np.float64).reshape(4, 4).T
    t = n.get('translation', [0, 0, 0]); r = n.get('rotation', [0, 0, 0, 1]); s = n.get('scale', [1, 1, 1])
    x, y, z, w = r
    R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                  [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                  [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    M = np.eye(4); M[:3, :3] = R * np.array(s); M[:3, 3] = t; return M
N = J['nodes']; parent = {}
for i, n in enumerate(N):
    for c in n.get('children', []): parent[c] = i
W = [None] * len(N)
def world(i):
    if W[i] is None: W[i] = (world(parent[i]) if i in parent else np.eye(4)) @ trs(N[i])
    return W[i]
for i in range(len(N)): world(i)

if V1:
    hb = EX['VRMC_vrm']['humanoid']['humanBones']; HEAD = hb['head']['node']; NECK = hb['neck']['node']
else:
    hb = {b['bone']: b['node'] for b in EX['VRM']['humanoid']['humanBones']}; HEAD = hb['head']; NECK = hb['neck']
def under(i, root):
    while True:
        if i == root: return True
        if i not in parent: return False
        i = parent[i]
headSet = {i for i in range(len(N)) if under(i, HEAD)}

# ---------- 收集图元 ----------
def clean(nm): return nm.replace(' (Instance)', '').strip()
prims = []  # dict(kind, mat, pos, nrm, uv, idx, hw, targets, srcMesh, primIdx, node)
for ni, n in enumerate(N):
    if 'mesh' not in n: continue
    mesh = J['meshes'][n['mesh']]
    skin = J['skins'][n['skin']] if 'skin' in n else None
    if skin:
        joints = skin['joints']; ibm = acc(skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1) if 'inverseBindMatrices' in skin else np.tile(np.eye(4), (len(joints), 1, 1))
        JM = np.stack([world(j) @ ibm[k] for k, j in enumerate(joints)])
        jHead = np.array([1.0 if j in headSet else 0.0 for j in joints])
    for pi, p in enumerate(mesh['primitives']):
        at = p['attributes']; mat = J['materials'][p['material']] if 'material' in p else {'name': 'mat'}
        mname = clean(mat.get('name', 'mat'))
        pos = acc(at['POSITION']); nrm = acc(at['NORMAL']) if 'NORMAL' in at else np.zeros_like(pos)
        uv = acc(at['TEXCOORD_0']) if 'TEXCOORD_0' in at else np.zeros((len(pos), 2))
        idx = acc(p['indices']).astype(np.int64) if 'indices' in p else np.arange(len(pos))
        tg = [acc(t['POSITION']) if 'POSITION' in t else np.zeros_like(pos) for t in p.get('targets', [])]
        if skin:
            jn = acc(at['JOINTS_0']).astype(np.int64); wt = acc(at['WEIGHTS_0']).astype(np.float64)
            wt = wt / np.maximum(wt.sum(1, keepdims=True), 1e-9)
            M = np.einsum('vk,vkij->vij', wt, JM[jn])
            ph = np.c_[pos, np.ones(len(pos))]
            pos2 = np.einsum('vij,vj->vi', M, ph)[:, :3]
            nrm2 = np.einsum('vij,vj->vi', M[:, :3, :3], nrm)
            tg = [np.einsum('vij,vj->vi', M[:, :3, :3], t) for t in tg]
            hw = (wt * jHead[jn]).sum(1)
        else:
            Mw = world(ni); pos2 = (np.c_[pos, np.ones(len(pos))] @ Mw.T)[:, :3]; nrm2 = nrm @ Mw[:3, :3].T
            tg = [t @ Mw[:3, :3].T for t in tg]; hw = np.ones(len(pos)) * (1.0 if ni in headSet else 0.0)
        nl = np.linalg.norm(nrm2, axis=1, keepdims=True); nrm2 = nrm2 / np.maximum(nl, 1e-9)
        U = mname.upper()
        kind = 'hair' if 'HAIR' in U else 'face' if ('_FACE' in U or '_EYE' in U or ('FACE' in U and 'SKIN' in U)) else 'body' if 'SKIN' in U else 'cloth'
        prims.append(dict(kind=kind, mat=p.get('material'), mname=mname, pos=pos2, nrm=nrm2, uv=uv, idx=idx.reshape(-1, 3), hw=hw, tg=tg, mesh=n['mesh'], node=ni, pi=pi))

face = [p for p in prims if p['kind'] == 'face']
def up(p): return p['pos'][np.unique(p['idx'].ravel())]  # 只统计本图元实际引用的顶点（VRoid 2.x 图元共享顶点缓冲）
assert face, 'no face primitives found'
# 头部参考
fskin = [p for p in face if 'SKIN' in p['mname'].upper()] or face
FP = np.concatenate([up(p) for p in fskin])
eyeP = [p for p in face if 'IRIS' in p['mname'].upper()] or [p for p in face if 'HIGHLIGHT' in p['mname'].upper()] or [p for p in face if 'EYEWHITE' in p['mname'].upper()]
EP = np.concatenate([up(p) for p in eyeP]) if eyeP else FP
cxm = (FP[:, 0].min() + FP[:, 0].max()) / 2
eyeC = EP.mean(0)
headPos = world(HEAD)[:3, 3]
# 朝向：眼睛应在头骨中心前方(+Z)
flip = (eyeC[2] < headPos[2]) and not A.noflip
def orient(v):
    v = v.copy()
    if flip: v[..., 0] *= -1; v[..., 2] *= -1
    return v
for p in prims:
    p['pos'] = orient(p['pos']); p['nrm'] = orient(p['nrm']); p['tg'] = [orient(t) for t in p['tg']]
    if flip: p['idx'] = p['idx'][:, [0, 2, 1]]
FP = np.concatenate([up(p) for p in fskin]); EP = np.concatenate([up(p) for p in eyeP]) if eyeP else FP
eyeC = EP.mean(0); cxm = (FP[:, 0].min() + FP[:, 0].max()) / 2

# 头顶：脸部皮肤 + 身体皮肤中高于眼睛的最高点（VRoid 头皮在 Face 皮肤里）
skinTop = FP[:, 1].max()
yEye = eyeC[1]
yCut0 = yEye - 0.81 * (skinTop - yEye)   # 比例基准（保持与其他模型同样的头部大小）
# 第十一轮：切口不许切到下巴——取脸前半部分皮肤的最低点，切面至少在它下面 6mm
_front = FP[FP[:, 2] > np.median(FP[:, 2])]
chinY = float(_front[:, 1].min()) if len(_front) else yCut0
yCut = max(min(yCut0, chinY - 0.006), yCut0 - 0.02)  # 最多比比例切口低 2cm（否则会切进肩膀）
hairCut = yCut0 - A.hair_drop

# 颈部中心 / 半径
body = [p for p in prims if p['kind'] == 'body']
BP = np.concatenate([up(p) for p in body]) if body else FP
band = BP[(BP[:, 1] > yCut) & (BP[:, 1] < yCut + 0.015)]
if len(band) < 8: band = FP[FP[:, 1] < FP[:, 1].min() + 0.01]
# 只取颈柱附近的顶点（排除锁骨/肩膀/衣领皮肤把半径撑大）
nx, nz = np.median(band[:, 0]), np.median(band[:, 2])
_rr = np.hypot(band[:, 0] - nx, band[:, 2] - nz); band = band[_rr < max(0.02, np.median(_rr) * 1.5)]
nx, nz = band[:, 0].mean(), band[:, 2].mean()
nr = float(np.percentile(np.hypot(band[:, 0] - nx, band[:, 2] - nz), 90)) * 1.02
nr = min(0.055, max(0.025, nr))  # 真实脖子半径范围（米）

# ---------- 选择三角形 ----------
out = []  # (name, kind, matIndex, pos, nrm, uv, idx, targets)
def subset(p, triMask, clampY=None):
    tri = p['idx'][triMask]
    if len(tri) == 0: return None
    used, inv = np.unique(tri.ravel(), return_inverse=True)
    pos = p['pos'][used].copy(); nrm = p['nrm'][used]; uv = p['uv'][used]
    if clampY is not None: pos[:, 1] = np.maximum(pos[:, 1], clampY)
    tg = [t[used] for t in p['tg']]
    return pos, nrm, uv, inv.reshape(-1, 3), tg
for p in prims:
    P = p['pos']; T = p['idx']; ty = P[T][:, :, 1]
    if p['kind'] == 'face':
        m = ty.max(1) > yCut - 0.005; r = subset(p, m, yCut)
    elif p['kind'] == 'hair':
        hwT = p['hw'][T].min(1)
        m = (hwT > 0.5) & (ty.max(1) > hairCut)
        r = subset(p, m, None)
        if r:  # 截断：低于 hairCut 的顶点压到 hairCut
            r[0][:, 1] = np.maximum(r[0][:, 1], hairCut)
    elif p['kind'] == 'body':
        rad = np.hypot(P[T][:, :, 0] - nx, P[T][:, :, 2] - nz).max(1)
        m = (ty.min(1) > yCut - 0.03) & (rad < nr * 1.3) & (ty.max(1) > yCut)
        r = subset(p, m, yCut)
    else:  # 衣物：只要牢牢挂在头骨上的（帽子、发饰）
        m = (p['hw'][T].min(1) > 0.95) & (ty.min(1) > yEye - 0.02)
        r = subset(p, m, None)
    if r: out.append((p, ) + r)
assert out, 'nothing selected'

# ---------- 坐标变换 ----------
hairOut = [o for o in out if o[0]['kind'] == 'hair']
allP = np.concatenate([o[1] for o in out])
skullTopAbs = skinTop
yMid = (skullTopAbs + yCut0) / 2
czm = (FP[:, 2].min() + FP[:, 2].max()) / 2 - 0.01  # 头骨中心略靠后（脸前突）
origin = np.array([cxm, yMid, czm])
SC = A.sc if A.sc > 0 else (A.norm / (skullTopAbs - yCut0) if A.norm > 0 else 1.0)

# ---------- 表情预设 ----------
PRESET_MAP = {'aa': 'aa', 'ih': 'ih', 'ou': 'ou', 'ee': 'ee', 'oh': 'oh', 'blink': 'blink', 'blinkLeft': 'blinkleft', 'blinkRight': 'blinkright',
              'angry': 'angry', 'relaxed': 'relaxed', 'happy': 'happy', 'sad': 'sad', 'surprised': 'surprised',
              'a': 'aa', 'i': 'ih', 'u': 'ou', 'e': 'ee', 'o': 'oh', 'blink_l': 'blinkleft', 'blink_r': 'blinkright', 'fun': 'relaxed', 'joy': 'happy', 'sorrow': 'sad'}
binds = {}  # key -> [(srcMesh, morphIdx, weight)]
if V1:
    ex = EX['VRMC_vrm'].get('expressions', {})
    for k, e in list(ex.get('preset', {}).items()) + [(kk.lower(), vv) for kk, vv in ex.get('custom', {}).items()]:
        key = PRESET_MAP.get(k, 'surprised' if k.lower() == 'surprised' else None)
        if not key: continue
        for b in e.get('morphTargetBinds', []):
            binds.setdefault(key, []).append((N[b['node']]['mesh'], b['index'], float(b['weight'])))
else:
    for g in EX['VRM']['blendShapeMaster']['blendShapeGroups']:
        pn = g.get('presetName', ''); key = PRESET_MAP.get(pn) or ('surprised' if g.get('name', '').lower() == 'surprised' else None)
        if not key: continue
        for b in g.get('binds', []):
            binds.setdefault(key, []).append((b['mesh'], b['index'], b['weight'] / 100.0))
usedMorph = {}  # srcMesh -> sorted list of morph idx
for key, L in binds.items():
    for (ms, mi, w) in L: usedMorph.setdefault(ms, set()).add(mi)
usedMorph = {k: sorted(v) for k, v in usedMorph.items()}

# ---------- 贴图 ----------
imgCache = {}
def texImage(texIndex, maxSize):
    key = (texIndex, maxSize)
    if key in imgCache: return imgCache[key]
    tex = J['textures'][texIndex]; src = tex.get('source')
    if src is None: src = tex.get('extensions', {}).get('EXT_texture_webp', {}).get('source')
    im = J['images'][src]; bv = J['bufferViews'][im['bufferView']]
    data = BIN[bv.get('byteOffset', 0): bv.get('byteOffset', 0) + bv['byteLength']]
    img = Image.open(io.BytesIO(data)); img.load()
    img = img.convert('RGBA')
    if max(img.size) > maxSize:
        s = maxSize / max(img.size); img = img.resize((max(1, int(img.size[0] * s)), max(1, int(img.size[1] * s))), Image.LANCZOS)
    b = io.BytesIO(); img.save(b, 'WEBP', quality=86, method=6); imgCache[key] = b.getvalue(); return imgCache[key]

# ---------- 写 GLB ----------
bin_ = bytearray(); G = {'asset': {'version': '2.0', 'generator': 'vrm2head.py'}, 'extensionsUsed': ['KHR_materials_unlit'], 'buffers': [], 'bufferViews': [], 'accessors': [],
                        'meshes': [], 'nodes': [], 'scenes': [{'nodes': []}], 'scene': 0, 'materials': [], 'textures': [], 'images': [], 'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}]}
def addView(b, target=None):
    while len(bin_) % 4: bin_.append(0)
    o = len(bin_); bin_.extend(b); v = {'buffer': 0, 'byteOffset': o, 'byteLength': len(b)}
    if target: v['target'] = target
    G['bufferViews'].append(v); return len(G['bufferViews']) - 1
def addAcc(arr, typ, ct, target=None, minmax=False):
    a = np.ascontiguousarray(arr); v = addView(a.tobytes(), target)
    d = {'bufferView': v, 'componentType': ct, 'count': int(len(a)), 'type': typ}
    if minmax: d['min'] = [float(x) for x in a.min(0)]; d['max'] = [float(x) for x in a.max(0)]
    G['accessors'].append(d); return len(G['accessors']) - 1
matMap = {}; texMap = {}
def outMat(p):
    mi = p['mat']
    if mi in matMap: return matMap[mi]
    src = J['materials'][mi] if mi is not None else {}
    pbr = src.get('pbrMetallicRoughness', {})
    kind = p['kind']; maxS = 256 if kind == 'body' else 1024
    m = {'name': p['mname'], 'pbrMetallicRoughness': {'baseColorFactor': pbr.get('baseColorFactor', [1, 1, 1, 1]), 'metallicFactor': 0, 'roughnessFactor': 0.9},
         'alphaMode': src.get('alphaMode', 'OPAQUE'), 'doubleSided': bool(src.get('doubleSided', False)), 'extensions': {'KHR_materials_unlit': {}}}
    if src.get('alphaMode') == 'MASK': m['alphaCutoff'] = src.get('alphaCutoff', 0.5)
    bt = pbr.get('baseColorTexture')
    if bt is not None:
        k = (bt['index'], maxS)
        if k not in texMap:
            data = texImage(bt['index'], maxS); v = addView(data)
            G['images'].append({'bufferView': v, 'mimeType': 'image/webp'}); G['textures'].append({'sampler': 0, 'source': len(G['images']) - 1, 'name': p['mname']})
            texMap[k] = len(G['textures']) - 1
        m['pbrMetallicRoughness']['baseColorTexture'] = {'index': texMap[k]}
    G['materials'].append(m); matMap[mi] = len(G['materials']) - 1; return matMap[mi]

presets = {}; hairNames = []; nodeCount = 0
order = sorted(out, key=lambda o: {'hair': 0, 'face': 1, 'body': 2, 'cloth': 3}[o[0]['kind']])
for (p, pos, nrm, uv, idx, tg) in order:
    name = 'm%d' % nodeCount; nodeCount += 1
    pos = ((pos - origin) * SC).astype(np.float32); nrm = nrm.astype(np.float32); uv = uv.astype(np.float32)
    prim = {'mode': 4, 'attributes': {'POSITION': addAcc(pos, 'VEC3', 5126, 34962, True), 'NORMAL': addAcc(nrm, 'VEC3', 5126, 34962), 'TEXCOORD_0': addAcc(uv, 'VEC2', 5126, 34962)},
            'material': outMat(p)}
    ii = idx.ravel(); prim['indices'] = addAcc(ii.astype(np.uint16) if ii.max() < 65535 else ii.astype(np.uint32), 'SCALAR', 5123 if ii.max() < 65535 else 5125, 34963)
    meshD = {'primitives': [prim]}
    um = usedMorph.get(p['mesh'], []) if tg else []
    if um:
        prim['targets'] = [{'POSITION': addAcc((tg[k] * SC).astype(np.float32), 'VEC3', 5126, 34962, True)} for k in um]
        meshD['weights'] = [0] * len(um); meshD['extras'] = {'targetNames': [str(i) for i in range(len(um))]}
        for key, L in binds.items():
            for (ms, mi, w) in L:
                if ms == p['mesh'] and mi in um: presets.setdefault(key, []).append([name, um.index(mi), round(w, 3)])
    G['meshes'].append(meshD); G['nodes'].append({'name': name, 'mesh': len(G['meshes']) - 1}); G['scenes'][0]['nodes'].append(len(G['nodes']) - 1)
    if p['kind'] == 'hair': hairNames.append(name)

# 封盖
seg = 40; cy = (yCut - origin[1]) * SC; ccx = (nx - origin[0]) * SC; ccz = (nz - origin[2]) * SC; nr = nr * SC
cp = [[ccx, cy, ccz]] + [[ccx + nr * math.cos(2 * math.pi * k / seg), cy, ccz + nr * math.sin(2 * math.pi * k / seg)] for k in range(seg)]
ci = []
for k in range(seg): ci += [0, 1 + (k + 1) % seg, 1 + k]
cp = np.array(cp, np.float32)
G['materials'].append({'name': '__CUT__', 'pbrMetallicRoughness': {'baseColorFactor': [0.5, 0.05, 0.08, 1], 'metallicFactor': 0, 'roughnessFactor': 0.6}, 'doubleSided': True})
cutPrim = {'mode': 4, 'attributes': {'POSITION': addAcc(cp, 'VEC3', 5126, 34962, True), 'NORMAL': addAcc(np.tile(np.array([0, -1, 0], np.float32), (len(cp), 1)), 'VEC3', 5126, 34962),
           'TEXCOORD_0': addAcc(np.zeros((len(cp), 2), np.float32), 'VEC2', 5126, 34962)}, 'indices': addAcc(np.array(ci, np.uint16), 'SCALAR', 5123, 34963), 'material': len(G['materials']) - 1}
G['meshes'].append({'primitives': [cutPrim]}); G['nodes'].append({'name': 'cut', 'mesh': len(G['meshes']) - 1}); G['scenes'][0]['nodes'].append(len(G['nodes']) - 1)

while len(bin_) % 4: bin_.append(0)
G['buffers'] = [{'byteLength': len(bin_)}]
if not G['images']: del G['images'], G['textures']
js = json.dumps(G, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bin_)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(bin_), 0x004E4942) + bytes(bin_)

# ---------- 元数据 ----------
fsk = (np.concatenate([o[1] for o in out if o[0]['kind'] == 'face' and 'SKIN' in o[0]['mname'].upper()] or [FP]) - origin) * SC
hp = (np.concatenate([o[1] for o in hairOut]) - origin) * SC if hairOut else fsk
ap_ = (allP - origin) * SC
eyeR = EP[EP[:, 0] > cxm] if (EP[:, 0] > cxm).any() else EP
eyeV = (eyeR.mean(0) - origin) * SC
metaOut = {
    'presets': presets, 'hair': hairNames,
    'cut': {'y': round(float(cy), 4), 'r': round(nr, 4), 'x': round(float(ccx), 4), 'z': round(float(ccz), 4)},
    'box': [[round(float(x), 3) for x in ap_.min(0)], [round(float(x), 3) for x in ap_.max(0)]],
    'bottom': round(float(cy), 4), 'skinW': round(float(fsk[:, 0].max() - fsk[:, 0].min()), 3),
    'skullTop': round(float((skullTopAbs - origin[1]) * SC), 4), 'hairTop': round(float(max(hp[:, 1].max(), (skullTopAbs - origin[1]) * SC)), 4),
    'front': round(float(fsk[:, 2].max()), 4), 'eye': [round(float(abs(eyeV[0])), 4), round(float(eyeV[1]), 4), round(float(eyeV[2]), 4)],
    'file': A.file, 'name': A.name, 'credit': A.credit, 'grp': A.grp
}
outPath = A.out or ('models/%s.js' % A.file)
body = dict(metaOut); body['glb'] = base64.b64encode(glb).decode()
with open(outPath, 'w') as f:
    f.write('(window.HEAD_MODELS=window.HEAD_MODELS||[]).push(' + json.dumps(body, ensure_ascii=False, separators=(',', ':')) + ');\n')
print('wrote', outPath, 'glb %.0f KB' % (len(glb) / 1024), 'nodes', nodeCount, 'hair', len(hairNames), 'presets', {k: len(v) for k, v in presets.items()}, 'flip', flip)
print('meta', json.dumps({k: v for k, v in metaOut.items() if k not in ('presets', 'hair')}, ensure_ascii=False))
