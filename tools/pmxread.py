import struct, numpy as np
class R:
    def __init__(s,b): s.b=b; s.o=0
    def u(s,f):
        v=struct.unpack_from(f,s.b,s.o); s.o+=struct.calcsize(f); return v if len(v)>1 else v[0]
    def arr(s,dt,n):
        a=np.frombuffer(s.b,dt,n,s.o); s.o+=a.nbytes; return a
def read(path):
    r=R(open(path,'rb').read()); assert r.u('4s')[:3]==b'PMX'
    ver=r.u('f'); n=r.u('B'); g=r.u('%dB'%n)
    enc='utf-16-le' if g[0]==0 else 'utf-8'; addUV=g[1]; vis,tis,mis,bis,mois,ris=g[2:8]
    def t(): l=r.u('i'); s=r.b[r.o:r.o+l].decode(enc,'replace'); r.o+=l; return s
    def idx(sz,signed=True):
        return r.u({1:'b',2:'h',4:'i'}[sz] if signed else {1:'B',2:'H',4:'i'}[sz])
    M={'name':t(),'name_en':t(),'cmt':t(),'cmt_en':t()}
    nv=r.u('i'); pos=np.zeros((nv,3));nrm=np.zeros((nv,3));uv=np.zeros((nv,2));bi=np.zeros((nv,4),int);bw=np.zeros((nv,4))
    for i in range(nv):
        v=r.u('8f'); pos[i]=v[0:3];nrm[i]=v[3:6];uv[i]=v[6:8]
        r.o+=16*addUV
        w=r.u('B')
        if w==0: bi[i,0]=idx(bis); bw[i,0]=1
        elif w==1: bi[i,0]=idx(bis);bi[i,1]=idx(bis);a=r.u('f');bw[i,:2]=[a,1-a]
        elif w==2 or w==4:
            for k in range(4): bi[i,k]=idx(bis)
            bw[i]=r.u('4f')
        elif w==3:
            bi[i,0]=idx(bis);bi[i,1]=idx(bis);a=r.u('f');bw[i,:2]=[a,1-a]; r.o+=36
        r.o+=4
    nf=r.u('i'); ft={1:np.uint8,2:np.uint16,4:np.int32}[vis]; faces=r.arr(ft,nf).astype(np.int64).reshape(-1,3)
    nt=r.u('i'); tex=[t() for _ in range(nt)]
    mats=[];fo=0
    for _ in range(r.u('i')):
        nm=t();ne=t();c=r.u('4f');sp=r.u('3f');spp=r.u('f');amb=r.u('3f');flag=r.u('B');ec=r.u('4f');es=r.u('f')
        ti=idx(tis);si=idx(tis);sm=r.u('B');tf=r.u('B'); toon=r.u('B') if tf==1 else idx(tis); memo=t(); fc=r.u('i')
        mats.append(dict(name=nm,en=ne,color=c,flag=flag,tex=ti,f0=fo//3,nf=fc//3)); fo+=fc
    bones=[]
    for _ in range(r.u('i')):
        nm=t();ne=t();p=r.u('3f');par=idx(bis);lay=r.u('i');fl=r.u('H')
        if fl&1: idx(bis)
        else: r.u('3f')
        if fl&0x300: idx(bis);r.u('f')
        if fl&0x400: r.u('3f')
        if fl&0x800: r.u('6f')
        if fl&0x2000: r.u('i')
        if fl&0x20:
            idx(bis);r.u('i');r.u('f');
            for _ in range(r.u('i')):
                idx(bis)
                if r.u('B'): r.u('6f')
        bones.append(dict(name=nm,en=ne,pos=p,parent=par))
    morphs=[]
    for _ in range(r.u('i')):
        nm=t();ne=t();panel=r.u('B');ty=r.u('B');cnt=r.u('i');d=None
        if ty==1:
            d=[]
            for _ in range(cnt): d.append((idx(vis,False),r.u('3f')))
        else:
            sz={0:mois+4,2:bis+28,3:vis+16,4:vis+16,5:vis+16,6:vis+16,7:vis+16,8:mis+113,9:mois+4,10:ris+25}[ty]
            if ty==0: d=[(idx(mois),r.u('f')) for _ in range(cnt)]
            else: r.o+=sz*cnt
        morphs.append(dict(name=nm,en=ne,type=ty,data=d))
    return dict(M=M,pos=pos,nrm=nrm,uv=uv,bi=bi,bw=bw,faces=faces,tex=tex,mats=mats,bones=bones,morphs=morphs)
if __name__=='__main__':
    import sys;P=read(sys.argv[1]);print(P['M']['name'],P['M']['cmt'][:300]);print(len(P['pos']),'verts')
    for m in P['mats']:print(' mat',m['name'],m['nf'],P['tex'][m['tex']] if m['tex']>=0 else None)
    print('bones',[b['name'] for b in P['bones']][:30])
    print('morphs',[(m['name'],m['type']) for m in P['morphs']][:80])

# ---- PMD（MMD 老格式，あにまさ式 / kome-ken 东方等经典模型）----
# PMD 材质没有名字：按“贴图名 + 顶点主骨骼 + 颜色”推断类别，生成 pmx2vrm.cls() 能识别的伪名字
def read_pmd(path):
    b = open(path, 'rb').read(); r = R(b); assert r.u('3s') == b'Pmd'
    r.u('f'); sj = lambda n: r.u('%ds' % n).split(b'\0')[0].decode('cp932', 'replace')
    M = {'name': sj(20), 'cmt': sj(256)}; M['name_en'] = ''; M['cmt_en'] = ''
    nv = r.u('I'); V = np.frombuffer(b, np.dtype([('p', '<3f'), ('n', '<3f'), ('uv', '<2f'), ('b', '<2H'), ('w', 'u1'), ('e', 'u1')]), nv, r.o); r.o += V.nbytes
    pos = V['p'].astype(float); nrm = V['n'].astype(float); uv = V['uv'].astype(float)
    bi = np.zeros((nv, 4), int); bw = np.zeros((nv, 4)); bi[:, :2] = V['b']; w = V['w'] / 100.0; bw[:, 0] = w; bw[:, 1] = 1 - w
    ni = r.u('I'); faces = r.arr('<u2', ni).astype(np.int64).reshape(-1, 3)
    nm = r.u('I'); raw = []
    for _ in range(nm):
        dif = r.u('4f'); r.u('f'); r.u('3f'); amb = r.u('3f'); toon = r.u('B'); edge = r.u('B'); fc = r.u('I'); tn = sj(20)
        raw.append((dif, amb, fc, tn.split('*')[0]))
    nb = r.u('H'); bones = []
    for _ in range(nb):
        n = sj(20); par = r.u('h'); r.u('h'); r.u('B'); r.u('h'); p = r.u('3f'); bones.append(dict(name=n, en='', pos=p, parent=par))
    for _ in range(r.u('H')):
        r.u('H'); r.u('H'); cl = r.u('B'); r.u('H'); r.u('f'); r.o += 2 * cl
    morphs = []; base = None
    for _ in range(r.u('H')):
        n = sj(20); cnt = r.u('I'); ty = r.u('B'); D = np.frombuffer(b, np.dtype([('i', '<u4'), ('p', '<3f')]), cnt, r.o); r.o += D.nbytes
        if ty == 0: base = D['i'].copy(); continue
        if base is None: continue
        morphs.append(dict(name=n, en='', type=1, data=[(int(base[i]), tuple(p)) for i, p in zip(D['i'], D['p']) if i < len(base)]))
    tex = []; mats = []; fo = 0; segs = []
    # ---- 推断材质类别 ----
    bn = [x['name'] for x in bones]
    def anc(i, keys):
        k = 0
        while 0 <= i < len(bones) and k < 64:
            if any(q in bn[i] for q in keys): return True
            i = bones[i]['parent']; k += 1
        return False
    head_i = next((i for i, x in enumerate(bn) if x in ('頭', 'head')), -1)
    isHair = np.array([anc(i, ('髪', 'hair', 'Hair', 'アホ毛', 'ツインテ', 'テール', 'もみあげ', 'リボン')) for i in range(len(bones))])
    isHead = np.array([anc(i, ('頭',)) for i in range(len(bones))])
    isTail = np.array([anc(i, ('尻尾', 'しっぽ', 'シッポ', 'tail', 'Tail')) for i in range(len(bones))])
    isMouth = np.array([any(q in bn[i] for q in ('舌', 'tongue')) for i in range(len(bones))])
    isEye = np.array([any(q in bn[i] for q in ('目', 'eye')) and '目' in bn[i] for i in range(len(bones))])
    sk = lambda c: c[0] > 0.75 and 0.55 < c[1] < 0.95 and 0.45 < c[2] < 0.9 and c[0] >= c[1] >= c[2] and c[0] - c[2] > 0.08
    import os
    base_dir = os.path.dirname(path); TC = {}
    def texcol(tn, vs):  # 贴图在这些顶点 UV 处的平均色
        try:
            from PIL import Image
            if tn not in TC:
                im = Image.open(os.path.join(base_dir, tn.replace('\\', '/'))).convert('RGB'); TC[tn] = np.asarray(im.resize((128, 128))).astype(float) / 255
            A = TC[tn]; u = (uv[vs, 0] % 1 * 127).astype(int); v = (uv[vs, 1] % 1 * 127).astype(int); return A[v, u].mean(0)
        except Exception: return None
    eyeY = next((x['pos'][1] for x in bones if x['name'] in ('左目', '右目')), None)
    for k, (dif, amb, fc, tn) in enumerate(raw):
        f = faces[fo // 3:(fo + fc) // 3]; fo += fc; vs = np.unique(f.ravel()) if len(f) else np.zeros(0, int); pb = V['b'][vs, 0] if len(vs) else np.zeros(0, int)
        pb = pb[pb < len(bones)]; fr = lambda A: float(A[pb].mean()) if len(pb) else 0.0
        hh, hr, he = fr(isHead), fr(isHair), fr(isEye); tl = tn.lower(); ti = -1
        ht, hm = fr(isTail), fr(isMouth)
        if tn and not tl.endswith(('.sph', '.spa')): tex.append(tn); ti = len(tex) - 1
        col = [dif[0], dif[1], dif[2]]
        if ti >= 0 and len(vs):
            tc = texcol(tn, vs)
            if tc is not None: col = [float(tc[0]), float(tc[1]), float(tc[2])]
        cy = float(pos[vs, 1].mean()) if len(vs) else 0
        if ht > 0.4: c = 'cloth'  # 尾巴（八云蓝九尾）：建模姿势下高过肩，别切进头里
        elif hm > 0.4: c = '歯'
        elif any(q in tl for q in ('face', 'kao', '顔')): c = '顔'
        elif any(q in tl for q in ('hair', 'kami', '髪')): c = '髪'
        elif 'eye' in tl or '目' in tn or he > 0.5: c = '白目' if (min(col) > 0.9 and ti < 0) else '目'
        elif hr > 0.5 and hh > 0.5: c = '髪'
        elif hh > 0.3 and sk(col): c = '顔'
        elif hh > 0.6 and min(col) > 0.85 and len(vs) < 400: c = '白目' if (eyeY is not None and abs(cy - eyeY) < 0.5) else '歯'
        elif hh > 0.6 and max(col) < 0.12: c = '眉'
        elif hh > 0.6: c = '髪' if len(vs) > 150 else 'cloth'
        elif sk(col): c = '肌'
        else: c = 'cloth'
        if c == '肌' and hh > 0.01 and len(f):  # 脸+身体共用一个“肌”材质（あにまさ式）：按三角形拆出头部那块当脸皮
            pbF = V['b'][f, 0].clip(0, len(bones) - 1); hm = isHead[pbF].sum(1) >= 2
            if hm.any(): segs.append(('顔', dif, ti, f[hm]))
            if (~hm).any(): segs.append(('肌', dif, ti, f[~hm]))
        else: segs.append((c, dif, ti, f))
    F2 = []; o = 0
    for c, dif, ti, f in segs:
        mats.append(dict(name=c, en='', color=dif, flag=1, tex=ti, f0=o, nf=len(f))); F2.append(f); o += len(f)
    faces = np.concatenate(F2) if F2 else faces
    return dict(M=M, pos=pos, nrm=nrm, uv=uv, bi=bi, bw=bw, faces=faces, tex=tex, mats=mats, bones=bones, morphs=morphs)
_read_pmx = read
def read(path):
    return read_pmd(path) if path.lower().endswith('.pmd') else _read_pmx(path)
