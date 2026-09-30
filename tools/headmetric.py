# 头模解剖尺寸：两眼间距 ipd、眼→下巴 ech、嘴高处脸宽 cw（单位与模型一致，未经 head_norm）
# usage: python3 tools/headmetric.py models/*.js > /tmp/hm.json
import sys, json, base64, struct, re
import numpy as np
out = {}
for fn in sys.argv[1:]:
    try:
        s = open(fn, encoding='utf-8').read(); i = s.index('.push(') + 6; j = json.loads(s[i:s.rindex(')')])
        g = base64.b64decode(j['glb']); L = struct.unpack('<I', g[12:16])[0]; G = json.loads(g[20:20 + L]); B = g[20 + L + 8:]
        def acc(k):
            a = G['accessors'][k]
            if a.get('componentType') != 5126: return np.zeros((0, 3), np.float32)  # 量化顶点：跳过
            bv = G['bufferViews'][a['bufferView']]; o = bv.get('byteOffset', 0) + a.get('byteOffset', 0); st = bv.get('byteStride', 12)
            if st == 12: return np.frombuffer(B, np.float32, a['count'] * 3, o).reshape(-1, 3)
            raw = np.frombuffer(B, np.uint8, (a['count'] - 1) * st + 12, o); idx = (np.arange(a['count'])[:, None] * st + np.arange(12)[None, :])
            return raw[idx].copy().view(np.float32).reshape(-1, 3)
        # 节点变换（只处理平移/缩放/矩阵的简单情形）
        def xf(node):
            M = np.eye(4)
            if 'matrix' in node: M = np.array(node['matrix']).reshape(4, 4).T
            else:
                if 'scale' in node: M = M @ np.diag(list(node['scale']) + [1])
                if 'translation' in node: T = np.eye(4); T[:3, 3] = node['translation']; M = T @ M
            return M
        skin, iris = [], []
        for n in G['nodes']:
            if 'mesh' not in n: continue
            M = xf(n)
            for p in G['meshes'][n['mesh']]['primitives']:
                nm = G['materials'][p['material']].get('name', '') if 'material' in p else ''
                P = acc(p['attributes']['POSITION']); P = P @ M[:3, :3].T + M[:3, 3]
                if re.search(r'FACE_SKIN|Face.*SKIN|_Face_', nm) and not re.search(r'Mouth|Brow|Eye', nm): skin.append(P)
                elif re.search(r'Iris', nm): iris.append(P)
        S = np.concatenate(skin) if skin else None; I = np.concatenate(iris) if iris else None
        r = {'grp': j.get('grp'), 'skinW': j.get('skinW')}
        if I is not None and len(I) > 8:
            Lf, Rt = I[I[:, 0] > 0], I[I[:, 0] < 0]
            if len(Lf) > 3 and len(Rt) > 3 and 0.02 < Lf[:, 0].mean() - Rt[:, 0].mean() < 0.3: r['ipd'] = float(Lf[:, 0].mean() - Rt[:, 0].mean()); r['eyeY'] = float(I[:, 1].mean())
        if 'eyeY' not in r and j.get('eye'): r['eyeY'] = j['eye'][1]; r['ipd0'] = 2 * abs(j['eye'][0])
        if S is not None and 'eyeY' in r:
            ey = r['eyeY']; C = S[np.abs(S[:, 0]) < 0.012]; C = C[C[:, 1] < ey]
            if len(C) > 10:
                bins = np.arange(C[:, 1].min(), ey, 0.004); fz = []
                for b0 in bins:
                    q = C[(C[:, 1] >= b0) & (C[:, 1] < b0 + 0.004)]
                    fz.append(q[:, 2].max() if len(q) else np.nan)
                fz = np.array(fz)
                # 从上往下：前轮廓 z 相对眼下最前点回退超过 35% 的第一个位置 = 下巴下沿
                top = np.nanmax(fz); depth = top - np.nanmin(fz); chin = None
                for k in range(len(bins) - 1, -1, -1):
                    if not np.isnan(fz[k]) and fz[k] < top - 0.35 * max(depth, 1e-4) and bins[k] < ey - 0.02: chin = bins[k] + 0.004; break
                if chin is not None:
                    r['ech'] = float(ey - chin)
                    ym = ey - 0.55 * (ey - chin); W = S[(S[:, 1] > ym - 0.004) & (S[:, 1] < ym + 0.004)]
                    if len(W) > 6: r['cw'] = float(W[:, 0].max() - W[:, 0].min())
        out[j['file']] = r
    except Exception as e:
        print(fn, 'ERR', e, file=sys.stderr)
json.dump(out, sys.stdout, ensure_ascii=False, indent=0)
