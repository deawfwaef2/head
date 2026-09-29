import json,sys,os,urllib.parse,urllib.request
sys.path.insert(0,'/tmp/pmx'); from pmxread import read
d=json.load(open('/tmp/gi.json')); name=sys.argv[1]; c=[c for c in d if c['name']==name][0]
out='/tmp/pmx/src/'+name.replace(' ','_'); os.makedirs(out,exist_ok=True)
def get(rel,fp):
    u='https://phoshco.github.io/'+urllib.parse.quote(c['directory']+'/'+rel)
    os.makedirs(os.path.dirname(fp),exist_ok=True)
    open(fp,'wb').write(urllib.request.urlopen(u,timeout=60).read())
pf=out+'/m.pmx'; get(c['pmx'],pf); P=read(pf)
for t in P['tex']:
    try: get(t.replace('\\','/'),out+'/'+t.replace('\\','/'))
    except Exception as e: print('miss',t,e)
os.rename(pf,out+'/m.pmx'); print(out)
