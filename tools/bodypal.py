# 离线统计每具身体“衣服”的主色（跳过皮肤材质），输出 JS 表 BODY_PAL（供 foe.js 按发色挑身体）
# usage: python3 tools/bodypal.py big/body/*.js
import sys, json, re, base64, struct, io, colorsys
import numpy as np
from PIL import Image
out = {}
for fn in sys.argv[1:]:
    s = open(fn, encoding='utf-8').read(); j = json.loads(s[s.index('=', s.index(']')) + 1:].rstrip().rstrip(';'))
    glb = base64.b64decode(j['glb']); L = struct.unpack('<I', glb[12:16])[0]; G = json.loads(glb[20:20 + L]); B = glb[20 + L + 8:]
    def acc(i):
        a = G['accessors'][i]; bv = G['bufferViews'][a['bufferView']]; n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
        dt = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}[a['componentType']]
        o = bv.get('byteOffset', 0) + a.get('byteOffset', 0); st = bv.get('byteStride', 0); isz = np.dtype(dt).itemsize * n
        if st and st != isz: raw = np.frombuffer(B, np.uint8, a['count'] * st, o).reshape(-1, st)[:, :isz].copy(); return raw.view(dt).reshape(-1, n)
        return np.frombuffer(B, dt, a['count'] * n, o).reshape(-1, n)
    imgs = {}
    def img(ti):
        if ti not in imgs:
            src = G['textures'][ti]['source']; bv = G['bufferViews'][G['images'][src]['bufferView']]
            im = Image.open(io.BytesIO(B[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']])).convert('RGBA'); im.thumbnail((256, 256))
            imgs[ti] = np.asarray(im).astype(np.float32) / 255
        return imgs[ti]
    cols, ws = [], []
    for allm in (False, True):
     if cols: break
     for me in G['meshes']:
         for p in me['primitives']:
             m = G['materials'][p['material']] if 'material' in p else {}; nm = m.get('name', '')
             if nm == '__CUT__' or (not allm and (re.search(r'SKIN|肌', nm, re.I) or (re.search(r'body', nm, re.I) and not re.search(r'cloth|tops|bottom|shoe|acc', nm, re.I)))): continue
             if re.search(r'HAIR|FACE|EYE', nm, re.I): continue
             P = acc(p['attributes']['POSITION']).astype(np.float64); I = acc(p['indices']).reshape(-1, 3) if 'indices' in p else np.arange(len(P)).reshape(-1, 3)
             area = 0.5 * np.linalg.norm(np.cross(P[I[:, 1]] - P[I[:, 0]], P[I[:, 2]] - P[I[:, 0]]), axis=1)
             yc = P[I].mean(1)[:, 1]; keep = yc > j.get('foot', 0) + 0.25  # 鞋子不算
             bc = np.array(m.get('pbrMetallicRoughness', {}).get('baseColorFactor', [1, 1, 1, 1])[:3])
             tx = m.get('pbrMetallicRoughness', {}).get('baseColorTexture')
             if tx and 'TEXCOORD_0' in p['attributes']:
                 im = img(tx['index']); UV = acc(p['attributes']['TEXCOORD_0']); uv = UV[I].mean(1) % 1.0
                 X = np.clip((uv[:, 0] * im.shape[1]).astype(int), 0, im.shape[1] - 1); Y = np.clip((uv[:, 1] * im.shape[0]).astype(int), 0, im.shape[0] - 1)
                 px = im[Y, X]; keep &= px[:, 3] > 0.5; c = px[:, :3] * bc
             else: c = np.tile(bc, (len(I), 1))
             if allm:  # 材质合并的身体：剔除像肤色的像素
                 r_, g_, b_ = c[:, 0], c[:, 1], c[:, 2]; keep &= ~((r_ > 0.45) & (r_ >= g_) & (g_ >= b_ * 0.85) & (r_ - b_ < 0.45))
             cols.append(c[keep]); ws.append(area[keep])
    C = np.concatenate(cols); W = np.concatenate(ws); W = W / W.sum()
    hsv = np.array([colorsys.rgb_to_hsv(*x) for x in C])
    sat = (hsv[:, 1] * hsv[:, 2]); dark = (W * (hsv[:, 2] < 0.28)).sum(); neutral = (W * (sat < 0.18)).sum()
    # 彩色部分的主色相（按面积×彩度加权的圆均值）
    wc = W * sat; ang = hsv[:, 0] * 2 * np.pi
    hx, hy = (wc * np.cos(ang)).sum(), (wc * np.sin(ang)).sum(); hue = (np.degrees(np.arctan2(hy, hx)) + 360) % 360
    conc = np.hypot(hx, hy) / max(1e-6, wc.sum())  # 色相集中度 0..1
    lum = float((W * (C @ np.array([0.3, 0.59, 0.11]))).sum())
    out[j['file']] = dict(h=round(float(hue)), s=round(float((W * sat).sum()), 3), c=round(float(conc), 2), n=round(float(neutral), 2), d=round(float(dark), 2), L=round(lum, 3))
    print(j['file'], out[j['file']], file=sys.stderr)
print('const BODY_PAL = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';')
