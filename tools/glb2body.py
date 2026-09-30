#!/usr/bin/env python3
"""R43b：Quaternius 'Ultimate Modular Women' 系（CC0）GLB → 魂首窟身体 big/body/<File>.js
做法：给 GLB 注入一份 VRMC_vrm.humanoid（Quaternius 骨名 → VRM 人形骨），再交给 tools/vrm2body.py（删头、封颈、改名 H_<bone>）。
用法: python3 tools/glb2body.py in.glb File "显示名" "Quaternius (CC0)" --out path [--cut 0.3]
"""
import sys, json, struct, subprocess, os, tempfile
src, file_, name, credit = sys.argv[1:5]; rest = sys.argv[5:]
def pack_gltf(path):  # .gltf + .bin + PNG → 内存 GLB（只带 baseColor 贴图，缩到 1024 WebP）
    import io
    from PIL import Image
    J = json.load(open(path)); base = os.path.dirname(path); buf = bytearray(open(os.path.join(base, J['buffers'][0]['uri']), 'rb').read())
    use = {m['pbrMetallicRoughness']['baseColorTexture']['index'] for m in J['materials'] if 'baseColorTexture' in m.get('pbrMetallicRoughness', {})}
    for m in J['materials']:
        m.pop('normalTexture', None); m['pbrMetallicRoughness'].pop('metallicRoughnessTexture', None)
    imgs = []
    for ti, t in enumerate(J['textures']):
        if ti not in use: continue
        im = Image.open(os.path.join(base, J['images'][t['source']]['uri'])).convert('RGB'); im.thumbnail((1024, 1024))
        b = io.BytesIO(); im.save(b, 'WEBP', quality=88); data = b.getvalue()
        while len(buf) % 4: buf.append(0)
        J['bufferViews'].append({'buffer': 0, 'byteOffset': len(buf), 'byteLength': len(data)}); buf.extend(data)
        J['images'][t['source']] = {'bufferView': len(J['bufferViews']) - 1, 'mimeType': 'image/webp'}
    for ti, t in enumerate(J['textures']):
        if ti not in use: t['source'] = t['source']
    J['textures'] = [t for t in J['textures']]; J['buffers'] = [{'byteLength': len(buf)}]
    # 去掉没用到的图片引用（无 uri 的空壳会让 loader 报错）
    keep = sorted({J['textures'][ti]['source'] for ti in use}); remap = {o: n for n, o in enumerate(keep)}
    J['images'] = [J['images'][o] for o in keep]; newt = []; tmap = {}
    for ti in sorted(use): tmap[ti] = len(newt); newt.append({'source': remap[J['textures'][ti]['source']], **({'sampler': J['textures'][ti]['sampler']} if 'sampler' in J['textures'][ti] else {})})
    J['textures'] = newt
    for m in J['materials']:
        pb = m['pbrMetallicRoughness']
        if 'baseColorTexture' in pb: pb['baseColorTexture']['index'] = tmap[pb['baseColorTexture']['index']]
    return J, bytes(buf)
if src.endswith('.gltf'):
    J, BINB = pack_gltf(src); d = None; tail = None
else:
    d = open(src, 'rb').read(); l = struct.unpack('<I', d[12:16])[0]; J = json.loads(d[20:20 + l]); tail = d[20 + l:]
idx = {n['name']: i for i, n in enumerate(J['nodes'])}
UE = any(n['name'] == 'pelvis' for n in J['nodes'])
if not UE:  # Modular Women 是 IK 骨架：大腿挂在 Body 下、脚骨挂在 Root 下（靠 IK 带动）→ 重新挂到 Hips / 小腿下（保持静止世界矩阵不变），FK 动画才能带动腿和脚
    import numpy as np
    Nn = J['nodes']; par = {c: i for i, n in enumerate(Nn) for c in n.get('children', [])}
    def lm(n):
        if 'matrix' in n: return np.array(n['matrix'], float).reshape(4, 4).T
        x, y, z, w = n.get('rotation', [0, 0, 0, 1]); sc = n.get('scale', [1, 1, 1]); t = n.get('translation', [0, 0, 0])
        R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
        Mx = np.eye(4); Mx[:3, :3] = R * np.array(sc); Mx[:3, 3] = t; return Mx
    def wm(i): return (wm(par[i]) @ lm(Nn[i])) if i in par else lm(Nn[i])
    nid = {n['name']: i for i, n in enumerate(Nn)}
    for ch, np_ in (('UpperLegL', 'Hips'), ('UpperLegR', 'Hips'), ('FootL', 'LowerLegL'), ('FootR', 'LowerLegR')):
        if ch not in nid or np_ not in nid: continue
        i, q = nid[ch], nid[np_]; W = wm(i); L = np.linalg.inv(wm(q)) @ W
        Nn[par[i]]['children'].remove(i); Nn[q].setdefault('children', []).append(i)
        for k in ('translation', 'rotation', 'scale'): Nn[i].pop(k, None)
        Nn[i]['matrix'] = L.T.reshape(-1).tolist(); par[i] = q

M = {'hips': 'Hips', 'spine': 'Abdomen', 'chest': 'Torso', 'upperChest': 'Chest', 'neck': 'Neck', 'head': 'Head'}
for s, S in (('left', 'L'), ('right', 'R')):
    M.update({s + 'Shoulder': 'Shoulder' + S, s + 'UpperArm': 'UpperArm' + S, s + 'LowerArm': 'LowerArm' + S, s + 'Hand': 'Wrist' + S,
              s + 'UpperLeg': 'UpperLeg' + S, s + 'LowerLeg': 'LowerLeg' + S, s + 'Foot': 'Foot' + S})
    for f, F in (('Index', 'Index'), ('Middle', 'Middle'), ('Ring', 'Ring'), ('Little', 'Pinky')):
        for k, (a, b) in enumerate((('Proximal', 1), ('Intermediate', 2), ('Distal', 3))): M[s + f + a if k == 0 else s + f + ('Intermediate' if k == 1 else 'Distal')] = F + str(b) + S
    M[s + 'ThumbMetacarpal'] = 'Thumb1' + S; M[s + 'ThumbProximal'] = 'Thumb2' + S; M[s + 'ThumbDistal'] = 'Thumb3' + S
if UE:  # Quaternius Modular Outfits（UE 人形骨）
    M = {'hips': 'pelvis', 'spine': 'spine_01', 'chest': 'spine_02', 'upperChest': 'spine_03', 'neck': 'neck_01', 'head': 'Head'}
    for s_, S in (('left', 'l'), ('right', 'r')):
        M.update({s_ + 'Shoulder': 'clavicle_' + S, s_ + 'UpperArm': 'upperarm_' + S, s_ + 'LowerArm': 'lowerarm_' + S, s_ + 'Hand': 'hand_' + S,
                  s_ + 'UpperLeg': 'thigh_' + S, s_ + 'LowerLeg': 'calf_' + S, s_ + 'Foot': 'foot_' + S, s_ + 'Toes': 'ball_' + S})
        for f, F in (('Index', 'index'), ('Middle', 'middle'), ('Ring', 'ring'), ('Little', 'pinky')):
            for k, a in enumerate(('Proximal', 'Intermediate', 'Distal')): M[s_ + f + a] = F + '_0' + str(k + 1) + '_' + S
        M[s_ + 'ThumbMetacarpal'] = 'thumb_01_' + S; M[s_ + 'ThumbProximal'] = 'thumb_02_' + S; M[s_ + 'ThumbDistal'] = 'thumb_03_' + S
hb = {k: {'node': idx[v]} for k, v in M.items() if v in idx}
J.setdefault('extensions', {})['VRMC_vrm'] = {'specVersion': '1.0', 'humanoid': {'humanBones': hb}}
js = json.dumps(J, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
if tail is None: tail = struct.pack('<II', len(BINB) + (-len(BINB) % 4), 0x004E4942) + BINB + b'\0' * (-len(BINB) % 4)
out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + len(tail)) + struct.pack('<II', len(js), 0x4E4F534A) + js + tail
tmp = tempfile.mktemp(suffix='.vrm'); open(tmp, 'wb').write(out)
sys.exit(subprocess.call([sys.executable, os.path.join(os.path.dirname(__file__), 'vrm2body.py'), tmp, file_, name, credit] + rest))
