import struct,json,base64,io
import numpy as np
from PIL import Image
b=open('fem_vroid.vrm','rb').read(); cl,ct=struct.unpack('<II',b[12:20]); j=json.loads(b[20:20+cl]); bo=20+cl+8
def acc(i):
    a=j['accessors'][i]; bv=j['bufferViews'][a['bufferView']]; off=bo+bv.get('byteOffset',0)+a.get('byteOffset',0)
    n=a['count']; t={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]; dt={5126:np.float32,5123:np.uint16,5125:np.uint32,5121:np.uint8}[a['componentType']]
    st=bv.get('byteStride') or t*np.dtype(dt).itemsize
    raw=np.frombuffer(b,dtype=np.uint8,count=n*st,offset=off).reshape(n,st) if bv.get('byteStride') else None
    if raw is None: return np.frombuffer(b,dtype=dt,count=n*t,offset=off).reshape(n,t)
    return np.frombuffer(raw[:, :t*np.dtype(dt).itemsize].tobytes(),dtype=dt).reshape(n,t)
# which mesh/node has the body
bodyMesh=[i for i,m in enumerate(j['meshes']) if m['name'].startswith('Body')][0]
node=[n for n in j['nodes'] if n.get('mesh')==bodyMesh][0]; skin=j['skins'][node['skin']]
prim=[p for p in j['meshes'][bodyMesh]['primitives'] if 'Body_00_SKIN' in j['materials'][p['material']]['name']][0]
at=prim['attributes']; P=acc(at['POSITION']).astype(np.float32); UV=acc(at['TEXCOORD_0']).astype(np.float32); J=acc(at['JOINTS_0']).astype(np.uint16); W=acc(at['WEIGHTS_0']).astype(np.float32); I=acc(prim['indices']).reshape(-1).astype(np.uint32)
print(P.shape,I.shape,P.min(0),P.max(0))
# humanoid map node->name
hb={h['node']:h['bone'] for h in j['extensions']['VRM']['humanoid']['humanBones']}
# world transforms
parent={}
for i,n in enumerate(j['nodes']):
    for c in n.get('children',[]): parent[c]=i
import math
def local(n):
    t=np.array(n.get('translation',[0,0,0]),dtype=np.float64)
    return t
def world(i):
    p=np.zeros(3); k=i
    while k is not None:
        n=j['nodes'][k]; p=p+local(n); k=parent.get(k)   # rest pose in VRM: rotations identity
    return p
# check rotations identity
nonid=[(i,n['rotation']) for i,n in enumerate(j['nodes']) if 'rotation' in n and any(abs(x)>1e-6 for x in n['rotation'][:3])]
print('non-identity rot nodes',len(nonid), nonid[:3]); print('scales',set(tuple(n.get('scale',[1,1,1])) for n in j['nodes']))
jn=skin['joints']; names=[hb.get(x,'') for x in jn]
bw={hb[x]:world(x).tolist() for x in hb}
print({k:[round(v,3) for v in bw[k]] for k in ['hips','spine','chest','neck','head','leftUpperArm','leftHand','leftUpperLeg','leftFoot']})
# bone-name for each joint idx: for non-humanoid joints inherit nearest humanoid ancestor
def hname(nodeidx):
    k=nodeidx
    while k is not None:
        if k in hb: return hb[k]
        k=parent.get(k)
    return 'hips'
jb=[hname(x) for x in jn]
# collapse JOINTS to humanoid names indices
hn=sorted(set(jb)); hmap={n:i for i,n in enumerate(hn)}
J2=np.vectorize(lambda x:hmap[jb[x]])(J).astype(np.uint8)
# merge duplicate joints within a vertex
W2=W.copy()
for v in range(len(P)):
    d={}
    for k in range(4):
        d[J2[v,k]]=d.get(J2[v,k],0)+W[v,k]
    items=sorted(d.items(),key=lambda x:-x[1])[:4]
    s=sum(w for _,w in items) or 1
    for k in range(4):
        if k<len(items): J2[v,k]=items[k][0]; W2[v,k]=items[k][1]/s
        else: J2[v,k]=0; W2[v,k]=0
# texture
tex=j['materials'][[m['name'] for m in j['materials']].index(next(m['name'] for m in j['materials'] if 'Body_00_SKIN' in m['name']))]['pbrMetallicRoughness']['baseColorTexture']['index']
src=j['textures'][tex]['source']; iv=j['bufferViews'][j['images'][src]['bufferView']]; img=Image.open(io.BytesIO(b[bo+iv.get('byteOffset',0):bo+iv.get('byteOffset',0)+iv['byteLength']])); print('tex',img.size,img.mode)
img.save('body_full.png')
arr=np.array(img.convert('RGBA')).astype(np.float32); al=(arr[...,:3].mean(-1)>110)
avg=arr[...,:3][al].mean(0)/255; print('avg(opaque)',avg, 'opaque frac',al.mean())
arr[~al,:3]=avg*255  # 透明区域填肤色，避免缩小时出现黑边
img2=Image.fromarray(arr.astype(np.uint8),'RGBA').resize((512,512),Image.LANCZOS); buf=io.BytesIO(); img2.save(buf,'PNG',optimize=True); print('png',len(buf.getvalue())); img2.save('body_512a.png')
out={'n':int(len(P)),'pos':base64.b64encode(P.tobytes()).decode(),'uv':base64.b64encode(UV.tobytes()).decode(),'idx':base64.b64encode(I.astype(np.uint16 if len(P)<65536 else np.uint32).tobytes()).decode(),'jn':base64.b64encode(J2.tobytes()).decode(),'jw':base64.b64encode((W2*255+0.5).astype(np.uint8).tobytes()).decode(),'names':hn,'bones':bw,'tex':'data:image/png;base64,'+base64.b64encode(buf.getvalue()).decode(),'avg':avg.tolist()}
s='/* CC0 素体：VRoid Studio 旧 β 版「新規作成」默认女性素体（pixiv，CC0）——只含 Body_00_SKIN 一层（无头/发/衣）。由 tools/convert_basebody.py 提取。用于解剖台：角色自带皮肤层不完整时作皮肤底模。 */\nwindow.BASE_BODY=%s;\n'%json.dumps(out)
open('basebody.js','w').write(s); print('js bytes',len(s))
