import struct, numpy as np
class R:
    def __init__(s,b): s.b=b; s.o=0
    def u(s,f):
        v=struct.unpack_from(f,s.b,s.o); s.o+=struct.calcsize(f); return v if len(v)>1 else v[0]
    def arr(s,dt,n):
        a=np.frombuffer(s.b,dt,n,s.o); s.o+=a.nbytes; return a
def read(path):
    r=R(open(path,'rb').read()); assert r.u('4s')==b'PMX '
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
