# 第十四轮：Poly Haven 影视级树木（百万~千万面，每片叶/针都是几何体）→ 实时可用的游戏树
# 标准植被 LOD 做法：叶片/枝叶卡片按连通块随机保留一小部分，每块绕自身中心放大 1/sqrt(保留率) 以保持覆盖面积；
# 树干照常 meshopt 减面；叶材质改 alpha MASK（无排序问题、能投影）。仍是原模型的真实几何与贴图，不是自制模型。
#   PYTHONPATH=~/.cache/pylib2 python3 tools/foliage.py <pid> [--node 子串] [--name 输出名] [--leaf 16000] [--bark 5000] [--tex 1024] [--smax 3.2] [--out big/world]
import sys, os, re, json
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
import phpack

def main():
    a = sys.argv[1:]; pid = a[0]
    opt = {'--node': '', '--name': pid, '--leaf': '16000', '--bark': '5000', '--tex': '1024', '--smax': '3.2', '--out': os.path.join(os.path.dirname(__file__), '..', 'big', 'world'), '--seed': '7', '--twig': 'branch|twig', '--twigkeep': '0.12', '--err': '0.06'}
    for i in range(1, len(a) - 1, 2): opt[a[i]] = a[i + 1]
    rng = np.random.default_rng(int(opt['--seed']))
    path = phpack.fetch(pid, '1k'); base = os.path.dirname(path)
    G = json.load(open(path)); bins = [open(os.path.join(base, b['uri']), 'rb').read() for b in G['buffers']]
    # 只保留名字含 --node 的根节点（一个文件里的 a/b/c 变体拆成独立资产）
    if opt['--node']:
        keepN = [n for n in G['nodes'] if 'mesh' in n and opt['--node'] in n.get('name', '')]
        meshes = []; 
        for n in keepN: meshes.append(G['meshes'][n['mesh']]); n['mesh'] = len(meshes) - 1; n.pop('translation', None); n.pop('children', None)
        G['nodes'] = keepN; G['meshes'] = meshes; G['scenes'] = [{'nodes': list(range(len(keepN)))}]; G['scene'] = 0
    mats = G.get('materials', [])
    istwig = lambda p: 'material' in p and not (mats[p['material']].get('alphaMode') in ('BLEND', 'MASK')) and re.search(opt['--twig'], mats[p['material']].get('name', ''), re.I)
    isleaf = lambda p: 'material' in p and (mats[p['material']].get('alphaMode') in ('BLEND', 'MASK') or re.search('leaf|leaves|twig|needle|foliage', mats[p['material']].get('name', ''), re.I))
    prims = [p for m in G['meshes'] for p in m['primitives']]
    leafTot = sum(G['accessors'][p['indices']]['count'] // 3 for p in prims if isleaf(p) and not istwig(p))
    keep = min(1.0, int(opt['--leaf']) / max(1, leafTot)); s = min(float(opt['--smax']), 1 / np.sqrt(keep))
    extra = bytearray(); newB = len(bins)
    def add(arr, typ, ct, target):
        nonlocal extra
        while len(extra) % 4: extra.append(0)
        G['bufferViews'].append({'buffer': newB, 'byteOffset': len(extra), 'byteLength': arr.nbytes, 'target': target}); extra += arr.tobytes()
        acc = {'bufferView': len(G['bufferViews']) - 1, 'componentType': ct, 'count': int(arr.shape[0]), 'type': typ}
        if typ == 'VEC3': acc['min'] = [float(x) for x in arr.min(0)]; acc['max'] = [float(x) for x in arr.max(0)]
        G['accessors'].append(acc); return len(G['accessors']) - 1
    leafOut = 0
    for p in prims:
        tw = istwig(p)
        if not (isleaf(p) or tw): continue
        kp, ss = (float(opt['--twigkeep']), 1.0) if tw else (keep, s)
        pos = phpack.read(G, bins, p['attributes']['POSITION']).astype(np.float32)
        tri = phpack.read(G, bins, p['indices']).reshape(-1, 3).astype(np.int64)
        # 按位置焊接后求连通块（有的导出每个三角形独立顶点）
        q = np.round(pos / 1e-4).astype(np.int64); _, weld = np.unique(q, axis=0, return_inverse=True); weld = weld.reshape(-1)
        wt = weld[tri]; nV = int(weld.max()) + 1
        r = np.concatenate([wt[:, 0], wt[:, 1]]); c = np.concatenate([wt[:, 1], wt[:, 2]])
        ncomp, lab = connected_components(coo_matrix((np.ones(len(r), np.int8), (r, c)), shape=(nV, nV)), directed=False)
        tl = lab[wt[:, 0]]
        # 很大的连通块（整根枝条带叶）不能丢——保留，但不放大
        csize = np.bincount(tl, minlength=ncomp)
        big = csize > max(64, len(tri) * 0.02)
        pick = (rng.random(ncomp) < kp) | big
        kt = tri[pick[tl]]
        # 放大：每块绕其质心
        cen = np.zeros((ncomp, 3)); cnt = np.zeros(ncomp)
        vl = np.full(len(pos), -1, np.int64); vl[tri.reshape(-1)] = np.repeat(tl, 3)
        ok = vl >= 0
        np.add.at(cen, vl[ok], pos[ok]); np.add.at(cnt, vl[ok], 1); cen /= np.maximum(cnt, 1)[:, None]
        sc = np.where(big[np.maximum(vl, 0)] | ~ok, 1.0, ss)[:, None]
        np2 = (cen[np.maximum(vl, 0)] + (pos - cen[np.maximum(vl, 0)]) * sc).astype(np.float32); np2[~ok] = pos[~ok]
        p['attributes']['POSITION'] = add(np2, 'VEC3', 5126, 34962)
        p['indices'] = add(kt.reshape(-1).astype(np.uint32), 'SCALAR', 5125, 34963)
        leafOut += 0 if tw else len(kt)
        if tw: print(f'  twig prim: {len(tri)} -> {len(kt)} tris ({ncomp} comps)', flush=True); continue
        m = mats[p['material']]; m['alphaMode'] = 'MASK'; m['alphaCutoff'] = 0.42; m['doubleSided'] = True
        print(f'  leaf prim: {len(tri)} tris, {ncomp} cards -> {len(kt)} tris (keep {keep:.4f}, scale {s:.2f})', flush=True)
    fb = os.path.join(base, '_fol_' + opt['--name'] + '.bin'); open(fb, 'wb').write(bytes(extra))
    G['buffers'].append({'uri': os.path.basename(fb), 'byteLength': len(extra)})
    # 只打包场景用到的网格：phpack 遍历 G['meshes'] 全部
    gp = os.path.join(base, '_fol_' + opt['--name'] + '.gltf'); json.dump(G, open(gp, 'w'))
    del bins
    phpack.ERR = float(opt['--err'])
    glb, t0, t1 = phpack.pack(gp, int(opt['--bark']) + leafOut, int(opt['--tex']), 82)
    n = phpack.write_asset(opt['--name'], glb, opt['--out'])
    print(f"{opt['--name']}: {t0} -> {t1} tris, {n // 1024} KB", flush=True)

if __name__ == '__main__':
    main()
