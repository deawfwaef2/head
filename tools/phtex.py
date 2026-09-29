# Poly Haven (CC0) 贴图 / HDRI → assets/*.js
#   贴图：python3 tools/phtex.py tex <id> [--size 1024] [--q 84]   → assets/tex_<id>.js  {diff, nor, arm}（JPEG dataURL）
#   HDRI：python3 tools/phtex.py hdri <id> [--w 512]               → assets/hdri_<id>.js（RGBE 编码 PNG dataURL，JS 端解码成浮点再 PMREM）
import sys, os, io, json, base64, urllib.request
import numpy as np
from PIL import Image
UA = {'User-Agent': 'soulhead-asset-packer/1.0'}
CACHE = os.path.expanduser('~/.cache/ph')
def get(url): return urllib.request.urlopen(urllib.request.Request(url, headers=UA)).read()
def cached(url):
    os.makedirs(CACHE, exist_ok=True); p = os.path.join(CACHE, url.rsplit('/', 1)[1])
    if not os.path.exists(p): open(p, 'wb').write(get(url))
    return p
def durl(img, fmt='JPEG', q=84):
    b = io.BytesIO(); img.save(b, fmt, quality=q, optimize=True) if fmt == 'JPEG' else img.save(b, fmt, optimize=True)
    return 'data:image/' + fmt.lower() + ';base64,' + base64.b64encode(b.getvalue()).decode()

def tex(pid, size=1024, q=84):
    j = json.loads(get('https://api.polyhaven.com/files/' + pid)); res = '2k' if size > 1024 else '1k'
    out = {}
    for key, name in (('Diffuse', 'diff'), ('nor_gl', 'nor'), ('arm', 'arm')):
        if key not in j: continue
        im = Image.open(cached(j[key][res]['jpg']['url'])).convert('RGB')
        if im.size[0] > size: im = im.resize((size, size), Image.LANCZOS)
        out[name] = durl(im, 'JPEG', q)
    s = '(window.ASSETS=window.ASSETS||{})["tex_' + pid + '"]=' + json.dumps(out) + ';\n'
    open('assets/tex_' + pid + '.js', 'w').write(s); print(pid, len(s) // 1024, 'KB')

def read_hdr(path):
    d = open(path, 'rb').read(); i = d.index(b'\n\n') + 2; j = d.index(b'\n', i); hdr = d[i:j].split()
    H, W = int(hdr[1]), int(hdr[3]); p = j + 1; img = np.zeros((H, W, 4), np.uint8)
    for y in range(H):
        if d[p] == 2 and d[p + 1] == 2:  # 新式 RLE
            p += 4
            for c in range(4):
                x = 0
                while x < W:
                    n = d[p]; p += 1
                    if n > 128: n -= 128; img[y, x:x + n, c] = d[p]; p += 1
                    else: img[y, x:x + n, c] = np.frombuffer(d[p:p + n], np.uint8); p += n
                    x += n
        else: img[y] = np.frombuffer(d[p:p + W * 4], np.uint8).reshape(W, 4); p += W * 4
    e = img[..., 3].astype(np.int32); f = np.where(e > 0, np.ldexp(1.0, e - 136), 0.0)
    return img[..., :3].astype(np.float32) * f[..., None]

def hdri(pid, w=512):
    j = json.loads(get('https://api.polyhaven.com/files/' + pid))
    rgb = read_hdr(cached(j['hdri']['1k']['hdr']['url']))
    H0, W0, _ = rgb.shape; h = w // 2; fy, fx = H0 // h, W0 // w
    rgb = rgb[:h * fy, :w * fx].reshape(h, fy, w, fx, 3).mean((1, 3))
    m = rgb.max(-1); e = np.ceil(np.log2(np.maximum(m, 1e-32))); sc = np.where(m > 1e-32, 256.0 / np.exp2(e), 0)
    rgbe = np.zeros((h, w, 4), np.uint8); rgbe[..., :3] = np.clip(rgb * sc[..., None], 0, 255).astype(np.uint8); rgbe[..., 3] = np.where(m > 1e-32, e + 128, 0).astype(np.uint8)
    s = '(window.ASSETS=window.ASSETS||{})["hdri_' + pid + '"]=' + json.dumps(durl(Image.fromarray(rgbe, 'RGBA'), 'PNG')) + ';\n'
    open('assets/hdri_' + pid + '.js', 'w').write(s); print(pid, rgb.shape, 'mean', float(rgb.mean()), len(s) // 1024, 'KB')

if __name__ == '__main__':
    a = sys.argv[1:]; os.makedirs('assets', exist_ok=True); opt = dict(zip(a[2::2], a[3::2]))
    if a[0] == 'tex': tex(a[1], int(opt.get('--size', 1024)), int(opt.get('--q', 84)))
    else: hdri(a[1], int(opt.get('--w', 512)))
