#!/usr/bin/env python3
"""VRM(0.x / 1.0) → 魂首窟角色身体 big/body/<File>.js（第十四轮：身体一律保留，不许再删）

用法: python3 tools/vrm2body.py input.vrm File "显示名" "作者 (授权)" [--tex 1024] [--out path]

处理：
  1. 完整保留骨骼、蒙皮、衣服、身体贴图（原模型，不做任何程序化替换）
  2. 只去掉原模型自己的头（脸、头发、帽子等权重在头骨子树上的三角形）——游戏里的首级装在这里
  3. 颈部在“头骨关节下方”切平：切面以上的颈部顶点压到切面、权重改成 100% 颈骨，并加蒙皮封盖（材质 __CUT__）
  4. 记录切口 {y,x,z,r}（模型空间，米）、身高、人形骨骼映射（节点改名 H_<bone>）
  5. VRM0 转 180° 统一朝 +Z；去掉 morph（身体不需要表情）；贴图转 WebP（≤ --tex）
输出: (window.BODY_MODELS=window.BODY_MODELS||{})["File"] = {meta..., glb: base64}
"""
import sys, json, struct, io, base64, math, argparse, os
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('file'); ap.add_argument('name'); ap.add_argument('credit')
ap.add_argument('--tex', type=int, default=1024); ap.add_argument('--out', default=None)
ap.add_argument('--cut', type=float, default=0.3, help='切口位置：头骨关节往颈骨方向的比例')
A = ap.parse_args()

raw = open(A.src, 'rb').read()
assert raw[:4] == b'glTF', 'not a GLB/VRM'
off = 12; J = None; BIN = None
while off < len(raw):
    ln, ty = struct.unpack('<II', raw[off:off + 8]); ch = raw[off + 8: off + 8 + ln]
    if ty == 0x4E4F534A: J = json.loads(ch)
    elif ty == 0x004E4942: BIN = ch
    off += 8 + ln
EX = J.get('extensions', {}); V1 = 'VRMC_vrm' in EX

CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
def acc(i, keep_type=False):
    a = J['accessors'][i]; dt = CT[a['componentType']]; n = NC[a['type']]; cnt = a['count']
    if 'bufferView' not in a:
        out = np.zeros((cnt, n), dt)
    else:
        bv = J['bufferViews'][a['bufferView']]; start = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        isz = np.dtype(dt).itemsize * n; stride = bv.get('byteStride') or isz
        buf = np.frombuffer(BIN, np.uint8, count=stride * (cnt - 1) + isz, offset=start)
        out = np.lib.stride_tricks.as_strided(buf, shape=(cnt, isz), strides=(stride, 1)).copy().view(dt).reshape(cnt, n)
    sp = a.get('sparse')
    if sp:
        ib = J['bufferViews'][sp['indices']['bufferView']]; vb = J['bufferViews'][sp['values']['bufferView']]
        ii = np.frombuffer(BIN, CT[sp['indices']['componentType']], count=sp['count'], offset=ib.get('byteOffset', 0) + sp['indices'].get('byteOffset', 0))
        vv = np.frombuffer(BIN, dt, count=sp['count'] * n, offset=vb.get('byteOffset', 0) + sp['values'].get('byteOffset', 0))
        out = out.copy(); out[ii.astype(np.int64)] = vv.reshape(-1, n)
    if keep_type: return out
    if a.get('normalized') and dt in (np.uint8, np.uint16):
        return out.astype(np.float64) / (255.0 if dt == np.uint8 else 65535.0)
    return out.astype(np.float64) if dt == np.float32 else out

N = J['nodes']
def trs(n):
    if 'matrix' in n: return np.array(n['matrix'], dtype=np.float64).reshape(4, 4).T
    t = n.get('translation', [0, 0, 0]); r = n.get('rotation', [0, 0, 0, 1]); s = n.get('scale', [1, 1, 1])
    x, y, z, w = r
    R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    M = np.eye(4); M[:3, :3] = R * np.array(s); M[:3, 3] = t; return M
parent = {}
for i, n in enumerate(N):
    for c in n.get('children', []): parent[c] = i
_W = {}
def world(i):
    if i in _W: return _W[i]
    M = trs(N[i]); M = world(parent[i]) @ M if i in parent else M
    _W[i] = M; return M

if V1: hb = {k: v['node'] for k, v in EX['VRMC_vrm']['humanoid']['humanBones'].items()}
else: hb = {b['bone']: b['node'] for b in EX['VRM']['humanoid']['humanBones']}
HEAD, NECK = hb['head'], hb['neck']
def under(i, root):
    while True:
        if i == root: return True
        if i not in parent: return False
        i = parent[i]
headSet = {i for i in range(len(N)) if under(i, HEAD)}
yH = world(HEAD)[1, 3]; yN = world(NECK)[1, 3]
yCut = yH - A.cut * (yH - yN)

# ---------- 逐图元：删头、压平颈口 ----------
new_prims = {}   # (mesh, prim) -> dict of arrays
flat_pts = []
tri_total = 0
for ni, n in enumerate(N):
    if 'mesh' not in n: continue
    mesh = J['meshes'][n['mesh']]; skin = J['skins'][n['skin']] if 'skin' in n else None
    if skin:
        joints = skin['joints']
        ibm = acc(skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1) if 'inverseBindMatrices' in skin else np.tile(np.eye(4), (len(joints), 1, 1))
        JM = np.stack([world(j) @ ibm[k] for k, j in enumerate(joints)])
        jHead = np.array([1.0 if j in headSet else 0.0 for j in joints])
        neckJ = joints.index(NECK) if NECK in joints else None
        if neckJ is None:  # 颈骨不在蒙皮里：找最近的祖先
            p = NECK
            while p in parent and p not in joints: p = parent[p]
            neckJ = joints.index(p) if p in joints else 0
    for pi, p in enumerate(mesh['primitives']):
        at = p['attributes']
        pos = acc(at['POSITION']); idx = (acc(p['indices']).astype(np.int64).reshape(-1) if 'indices' in p else np.arange(len(pos)))
        if p.get('mode', 4) != 4: continue
        tri = idx.reshape(-1, 3)
        if skin:
            jn = acc(at['JOINTS_0'], True).astype(np.int64); wt = acc(at['WEIGHTS_0']).astype(np.float64)
            wt = wt / np.maximum(wt.sum(1, keepdims=True), 1e-9)
            M = np.einsum('vk,vkij->vij', wt, JM[jn]); ps = np.einsum('vij,vj->vi', M, np.c_[pos, np.ones(len(pos))])[:, :3]
            hw = (wt * jHead[jn]).sum(1)
        else:
            Mn = world(ni); ps = (Mn @ np.c_[pos, np.ones(len(pos))].T).T[:, :3]; hw = np.full(len(pos), 1.0 if ni in headSet else 0.0); M = None
        th = hw[tri].mean(1); ty = ps[tri][:, :, 1]
        drop = (th >= 0.5) | ((ty.min(1) > yCut + 0.004) & (th > 0.02)) | ((ty.min(1) > yCut + 0.004) & (not skin))
        keep = tri[~drop]
        if len(keep) == 0:
            new_prims[(n['mesh'], pi)] = None; continue
        pos2 = pos.copy(); ex = {}
        if skin:
            used = np.unique(keep)
            hi = used[(ps[used, 1] > yCut)]
            if len(hi):
                jn2 = jn.copy(); wt2 = acc(at['WEIGHTS_0'], True).copy()
                target = ps[hi].copy(); target[:, 1] = yCut
                flat_pts.append(target)
                # 新的绑定位置 = 颈骨矩阵的逆 × 压平后的位置（权重改成 100% 颈骨）
                Mi = np.linalg.inv(JM[neckJ]); pos2[hi] = (Mi @ np.c_[target, np.ones(len(hi))].T).T[:, :3]
                jn2[hi] = 0; jn2[hi, 0] = neckJ
                one = 1.0 if wt2.dtype.kind == 'f' else (255 if wt2.dtype == np.uint8 else 65535)
                wt2[hi] = 0; wt2[hi, 0] = one
                ex['JOINTS_0'] = jn2; ex['WEIGHTS_0'] = wt2
        new_prims[(n['mesh'], pi)] = {'idx': keep.reshape(-1), 'POSITION': pos2, **ex}
        tri_total += len(keep)

# ---------- 颈口封盖 ----------
allp = np.concatenate(flat_pts) if flat_pts else np.zeros((0, 3))
nw = world(NECK); hw_ = world(HEAD); cx, cz = float((nw[0, 3] + hw_[0, 3]) / 2), float((nw[2, 3] + hw_[2, 3]) / 2)
_d = np.hypot(allp[:, 0] - cx, allp[:, 2] - cz) if len(allp) else np.zeros(0); _d = _d[_d < 0.1]
nr = float(np.percentile(_d, 70)) if len(_d) > 8 else 0.045
nr = max(0.03, min(0.08, nr))

# ---------- 重建 GLB ----------
G = {'asset': {'version': '2.0', 'generator': 'vrm2body'}, 'scene': 0, 'scenes': [{'nodes': []}], 'nodes': [], 'meshes': [], 'accessors': [], 'bufferViews': [], 'materials': [], 'textures': [], 'images': [], 'samplers': [{'magFilter': 9729, 'minFilter': 9987}], 'skins': []}
out = bytearray()
def put(arr, typ, ctype, target=None, normalized=False, minmax=False):
    global out
    while len(out) % 4: out.append(0)
    arr = np.ascontiguousarray(arr); data = arr.tobytes(); bv = {'buffer': 0, 'byteOffset': len(out), 'byteLength': len(data)}
    if target: bv['target'] = target
    out += data; G['bufferViews'].append(bv)
    a = {'bufferView': len(G['bufferViews']) - 1, 'componentType': ctype, 'count': int(len(arr)), 'type': typ}
    if normalized: a['normalized'] = True
    if minmax: a['min'] = arr.min(0).astype(float).tolist(); a['max'] = arr.max(0).astype(float).tolist()
    G['accessors'].append(a); return len(G['accessors']) - 1
CTY = {np.dtype(np.float32): 5126, np.dtype(np.uint8): 5121, np.dtype(np.uint16): 5123, np.dtype(np.uint32): 5125, np.dtype(np.int16): 5122, np.dtype(np.int8): 5120}

# 贴图
img_map = {}
def image(ii):
    if ii in img_map: return img_map[ii]
    im = J['images'][ii]; bv = J['bufferViews'][im['bufferView']]
    data = BIN[bv.get('byteOffset', 0): bv.get('byteOffset', 0) + bv['byteLength']]
    I = Image.open(io.BytesIO(data)); I.load()
    has_a = I.mode in ('RGBA', 'LA', 'P') and np.asarray(I.convert('RGBA'))[:, :, 3].min() < 250
    I = I.convert('RGBA' if has_a else 'RGB')
    if max(I.size) > A.tex: s = A.tex / max(I.size); I = I.resize((max(1, int(I.size[0] * s)), max(1, int(I.size[1] * s))), Image.LANCZOS)
    b = io.BytesIO(); I.save(b, 'WEBP', quality=86, method=5); d = b.getvalue()
    while len(out) % 4: out.append(0)
    G['bufferViews'].append({'buffer': 0, 'byteOffset': len(out), 'byteLength': len(d)}); out.extend(d)
    G['images'].append({'bufferView': len(G['bufferViews']) - 1, 'mimeType': 'image/webp'})
    img_map[ii] = len(G['images']) - 1; return img_map[ii]
tex_map = {}
def texture(ti):
    if ti in tex_map: return tex_map[ti]
    t = J['textures'][ti]; src = t.get('source')
    if src is None: src = t.get('extensions', {}).get('EXT_texture_webp', {}).get('source')
    G['textures'].append({'source': image(src), 'sampler': 0}); tex_map[ti] = len(G['textures']) - 1; return tex_map[ti]
mat_map = {}
def material(mi):
    if mi in mat_map: return mat_map[mi]
    m = J['materials'][mi]; nm = m.get('name', 'mat').replace(' (Instance)', '').strip()
    pbr = m.get('pbrMetallicRoughness', {}); o = {'name': nm, 'pbrMetallicRoughness': {'baseColorFactor': pbr.get('baseColorFactor', [1, 1, 1, 1]), 'metallicFactor': 0, 'roughnessFactor': 0.85}}
    if 'baseColorTexture' in pbr: o['pbrMetallicRoughness']['baseColorTexture'] = {'index': texture(pbr['baseColorTexture']['index'])}
    if m.get('alphaMode'): o['alphaMode'] = m['alphaMode']
    if 'alphaCutoff' in m: o['alphaCutoff'] = m['alphaCutoff']
    if m.get('doubleSided'): o['doubleSided'] = True
    G['materials'].append(o); mat_map[mi] = len(G['materials']) - 1; return mat_map[mi]

# 节点（人形骨骼改名 H_<bone>，名字唯一）
inv = {v: k for k, v in hb.items()}; names = set()
for i, n in enumerate(N):
    nm = 'H_' + inv[i] if i in inv else (n.get('name') or 'n%d' % i)
    while nm in names: nm += '_'
    names.add(nm)
    o = {'name': nm}
    for k in ('translation', 'rotation', 'scale', 'matrix'):
        if k in n: o[k] = n[k]
    if n.get('children'): o['children'] = list(n['children'])
    G['nodes'].append(o)
# 网格
acc_cache = {}
def copy_acc(ai):
    if ai in acc_cache: return acc_cache[ai]
    a = J['accessors'][ai]; arr = acc(ai, True)
    r = put(arr, a['type'], CTY[arr.dtype], 34962, a.get('normalized', False), a['type'] == 'VEC3' and arr.dtype == np.float32)
    acc_cache[ai] = r; return r
mesh_map = {}
for mi, mesh in enumerate(J['meshes']):
    prims = []
    for pi, p in enumerate(mesh['primitives']):
        np_ = new_prims.get((mi, pi), 'absent')
        if np_ is None or np_ == 'absent': continue
        at = p['attributes']; attrs = {}
        for k in ('POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0'):
            if k not in at: continue
            if k in np_:
                arr = np_[k]; a = J['accessors'][at[k]]
                if k == 'POSITION': arr = arr.astype(np.float32)
                if k == 'JOINTS_0': arr = arr.astype(CT[a['componentType']])
                attrs[k] = put(arr, a['type'], CTY[arr.dtype], 34962, a.get('normalized', False), k == 'POSITION')
            else: attrs[k] = copy_acc(at[k])
        ix = np_['idx']; ix = ix.astype(np.uint16) if ix.max() < 65535 else ix.astype(np.uint32)
        q = {'attributes': attrs, 'indices': put(ix, 'SCALAR', CTY[ix.dtype], 34963), 'mode': 4}
        if 'material' in p: q['material'] = material(p['material'])
        prims.append(q)
    if prims: G['meshes'].append({'name': mesh.get('name', 'm%d' % mi), 'primitives': prims}); mesh_map[mi] = len(G['meshes']) - 1
for i, n in enumerate(N):
    if 'mesh' in n and n['mesh'] in mesh_map:
        G['nodes'][i]['mesh'] = mesh_map[n['mesh']]
        if 'skin' in n: G['nodes'][i]['skin'] = n['skin']
for s in J.get('skins', []):
    o = {'joints': s['joints']}
    if 'inverseBindMatrices' in s: o['inverseBindMatrices'] = copy_acc(s['inverseBindMatrices'])
    if 'skeleton' in s: o['skeleton'] = s['skeleton']
    G['skins'].append(o)
# 封盖：蒙皮到颈骨（用一个只含颈骨的新 skin，避免改动原 skin）
seg = 32; ang = np.linspace(0, 2 * math.pi, seg, endpoint=False)
cp = np.array([[cx, yCut, cz]] + [[cx + math.cos(a) * nr * 1.02, yCut, cz + math.sin(a) * nr * 1.02] for a in ang], np.float32)
ci = []
for k in range(seg): ci += [0, 1 + (k + 1) % seg, 1 + k]
Mneck = world(NECK); ibmN = np.linalg.inv(Mneck).T.astype(np.float32).reshape(1, 16)
G['materials'].append({'name': '__CUT__', 'pbrMetallicRoughness': {'baseColorFactor': [0.42, 0.08, 0.07, 1], 'metallicFactor': 0, 'roughnessFactor': 0.6}})
capPrim = {'attributes': {'POSITION': put(cp, 'VEC3', 5126, 34962, minmax=True), 'NORMAL': put(np.tile(np.array([0, 1, 0], np.float32), (len(cp), 1)), 'VEC3', 5126, 34962),
           'JOINTS_0': put(np.zeros((len(cp), 4), np.uint16), 'VEC4', 5123, 34962), 'WEIGHTS_0': put(np.tile(np.array([1, 0, 0, 0], np.float32), (len(cp), 1)), 'VEC4', 5126, 34962)},
           'indices': put(np.array(ci, np.uint16), 'SCALAR', 5123, 34963), 'mode': 4, 'material': len(G['materials']) - 1}
G['meshes'].append({'name': '__CUT__', 'primitives': [capPrim]})
G['skins'].append({'joints': [NECK], 'inverseBindMatrices': put(ibmN, 'MAT4', 5126)})
G['nodes'].append({'name': '__CUT__', 'mesh': len(G['meshes']) - 1, 'skin': len(G['skins']) - 1})
# 场景根：VRM0 转 180° 朝 +Z
roots = [i for i in range(len(N)) if i not in parent]
G['nodes'].append({'name': 'BODY_ROOT', 'children': roots + [len(G['nodes']) - 1], **({} if V1 else {'rotation': [0, 1, 0, 0]})})
G['scenes'][0]['nodes'] = [len(G['nodes']) - 1]
for k in ('textures', 'images', 'skins'):
    if not G[k]: del G[k]
if 'textures' not in G: del G['samplers']
while len(out) % 4: out.append(0)
G['buffers'] = [{'byteLength': len(out)}]
js = json.dumps(G, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(out)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(out), 0x004E4942) + bytes(out)

# 身高（脚底 → 原头顶）与切口，统一到输出坐标（VRM0 旋转后 x,z 取反）
ys = []
for (mi, pi), v in new_prims.items(): pass
foot = min(world(hb[b])[1, 3] for b in ('leftFoot', 'rightFoot') if b in hb)
sgn = 1 if V1 else -1
eyes = [world(hb[b])[:3, 3] for b in ('leftEye', 'rightEye') if b in hb]
eyeY = float(np.mean([e[1] for e in eyes])) if eyes else None; eyeZ = float(np.mean([e[2] for e in eyes])) if eyes else 0.0
meta = {'file': A.file, 'name': A.name, 'credit': A.credit, 'v1': V1, 'tris': int(tri_total),
        'cut': {'y': round(float(yCut), 4), 'x': round(float(cx * sgn), 4), 'z': round(float(cz * sgn), 4), 'r': round(nr, 4)},
        'foot': round(float(foot), 4), 'headY': round(float(yH), 4), 'neckY': round(float(yN), 4), 'headZ': round(float(world(HEAD)[2, 3] * sgn), 4), 'headX': round(float(world(HEAD)[0, 3] * sgn), 4),
        'eyeY': round(float(eyeY), 4) if eyeY is not None else None, 'eyeZ': round(float(eyeZ * sgn), 4) if eyeY is not None else None, 'bones': sorted(hb.keys())}
outp = A.out or os.path.join(os.path.dirname(__file__), '..', 'big', 'body', A.file + '.js')
os.makedirs(os.path.dirname(outp), exist_ok=True)
with open(outp, 'w') as f:
    f.write('(window.BODY_MODELS=window.BODY_MODELS||{})[' + json.dumps(A.file) + ']=' + json.dumps({**meta, 'glb': base64.b64encode(glb).decode()}, ensure_ascii=False) + ';\n')
print(json.dumps(meta, ensure_ascii=False), 'bytes', os.path.getsize(outp))
