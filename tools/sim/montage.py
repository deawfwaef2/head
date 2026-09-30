import json,base64,sys
from PIL import Image,ImageDraw
cells=json.load(open('/home/user/r46/montage.json')); T=360
cols=int(sys.argv[2]) if len(sys.argv)>2 else 4; rows=(len(cells)+cols-1)//cols
out=Image.new('RGB',(cols*T,rows*(T+22)),(20,20,24)); d=ImageDraw.Draw(out)
for i,c in enumerate(cells):
    im=Image.frombytes('RGB',(c['N'],c['N']),base64.b64decode(c['b64'])).resize((T,T),Image.LANCZOS)
    x,y=(i%cols)*T,(i//cols)*(T+22); out.paste(im,(x,y+22)); d.text((x+6,y+5),c['label'],fill=(255,255,255))
out.save(sys.argv[1]); print(out.size)
