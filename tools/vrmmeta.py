# R40: 读 VRM 内嵌许可（只下载 GLB 头部 JSON，支持 URL，用 curl Range）。用法: echo URL | python3 tools/vrmmeta.py
import sys,json,struct,subprocess,concurrent.futures as cf
def meta(u):
    try:
        b=subprocess.run(['curl','-sL','-m','40','-r','0-20',u],capture_output=True).stdout
        if b[:4]!=b'glTF': return {'err':'notglb'}
        L=struct.unpack('<I',b[12:16])[0]
        j=subprocess.run(['curl','-sL','-m','60','-r','20-%d'%(19+L),u],capture_output=True).stdout
        J=json.loads(j.decode('utf8','replace'))
        E=J.get('extensions',{})
        if 'VRM' in E:
            m=E['VRM'].get('meta',{}); return {'v':0,'title':m.get('title'),'author':m.get('author'),'lic':m.get('licenseName'),'other':m.get('otherLicenseUrl'),'redis':None,'gen':J.get('asset',{}).get('generator')}
        if 'VRMC_vrm' in E:
            m=E['VRMC_vrm'].get('meta',{}); return {'v':1,'title':m.get('name'),'author':m.get('authors'),'lic':m.get('licenseUrl'),'redis':m.get('allowRedistribution'),'mod':m.get('modification'),'gen':J.get('asset',{}).get('generator')}
        return {'err':'novrm'}
    except Exception as e: return {'err':str(e)[:60]}
if __name__=='__main__':
    U=[l.strip() for l in sys.stdin if l.strip()]
    with cf.ThreadPoolExecutor(10) as ex:
        for u,m in zip(U,ex.map(meta,U)): print(json.dumps([u.split('/')[-1],m],ensure_ascii=False))
