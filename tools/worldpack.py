# 第十四轮：世界节点资产打包（全部 Poly Haven CC0）→ big/world/*.js（与 assets/*.js 同格式：window.ASSETS[名]=...）
# 世界资产按风格懒加载（js/worlds.js 动态插 <script>，file:// 可用），不拖慢开局。
#   python3 tools/worldpack.py model <id> [--tris 8000] [--tex 512]
#   python3 tools/worldpack.py tex <id> [--size 1024]
#   python3 tools/worldpack.py sky <id> [--w 2048]      → sky_<id>.js {bg: JPEG(色调映射全景), env: RGBE PNG 128x64}
#   python3 tools/worldpack.py batch                  → 按下方 LIST 全部打包（已存在的跳过）
import sys, os, io, json, base64
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image
import phtex, phpack

OUT = os.path.join(os.path.dirname(__file__), '..', 'big', 'world')

def w(name, val):
    os.makedirs(OUT, exist_ok=True)
    s = '(window.ASSETS=window.ASSETS||{})[' + json.dumps(name) + ']=' + json.dumps(val) + ';\n'
    open(os.path.join(OUT, name + '.js'), 'w').write(s); print(name, len(s) // 1024, 'KB', flush=True)

def model(pid, tris=8000, tex=512):
    path = phpack.fetch(pid, '1k')
    glb, t0, t1 = phpack.pack(path, tris, tex, 82)
    n = phpack.write_asset(pid, glb, OUT); print(f'{pid}: tris {t0} -> {t1}, {n // 1024} KB', flush=True)

def tex(pid, size=1024):
    j = json.loads(phtex.get('https://api.polyhaven.com/files/' + pid)); out = {}
    for key, name in (('Diffuse', 'diff'), ('nor_gl', 'nor'), ('arm', 'arm')):
        if key not in j: continue
        im = Image.open(phtex.cached(j[key]['1k']['jpg']['url'])).convert('RGB')
        if im.size[0] > size: im = im.resize((size, size), Image.LANCZOS)
        out[name] = phtex.durl(im, 'JPEG', 84)
    w('tex_' + pid, out)

def sky(pid, width=2048):
    j = json.loads(phtex.get('https://api.polyhaven.com/files/' + pid))
    Image.MAX_IMAGE_PIXELS = None
    bg = Image.open(phtex.cached(j['tonemapped']['url'])).convert('RGB').resize((width, width // 2), Image.LANCZOS)
    rgb = phtex.read_hdr(phtex.cached(j['hdri']['1k']['hdr']['url']))
    H0, W0, _ = rgb.shape; ew = 128; h = ew // 2; fy, fx = H0 // h, W0 // ew
    rgb = rgb[:h * fy, :ew * fx].reshape(h, fy, ew, fx, 3).mean((1, 3))
    m = rgb.max(-1); e = np.ceil(np.log2(np.maximum(m, 1e-32))); sc = np.where(m > 1e-32, 256.0 / np.exp2(e), 0)
    rgbe = np.zeros((h, ew, 4), np.uint8); rgbe[..., :3] = np.clip(rgb * sc[..., None], 0, 255).astype(np.uint8); rgbe[..., 3] = np.where(m > 1e-32, e + 128, 0).astype(np.uint8)
    # 太阳方向（env 最亮像素）→ JS 端用来摆平行光
    iy, ix = np.unravel_index(np.argmax(rgb.sum(-1)), rgb.shape[:2])
    w('sky_' + pid, {'bg': phtex.durl(bg, 'JPEG', 80), 'env': phtex.durl(Image.fromarray(rgbe, 'RGBA'), 'PNG'),
                     'sun': [float((ix + 0.5) / ew), float((iy + 0.5) / h)], 'mean': float(rgb.mean())})

# 风格所需全部资产（与 js/worlds.js 的 STYLES 对应）
SKIES = ['evening_meadow', 'misty_pines', 'drakensberg_solitary_mountain', 'roofless_ruins', 'muddy_autumn_forest',
         'teutonic_castle_moat', 'cobblestone_street_night', 'moonless_golf', 'snowy_hillside']
TEXES = ['leafy_grass', 'forest_leaves_02', 'dry_ground_rocks', 'mossy_cobblestone', 'brown_mud_leaves_01',
         'cobblestone_floor_04', 'patterned_cobblestone', 'burned_ground_01', 'snow_02']
MODELS = [  # (id, tris, tex)
    ('quiver_tree_01', 6000, 1024), ('dead_tree_trunk', 4000, 1024), ('dead_tree_trunk_02', 4000, 1024), ('dead_quiver_trunk', 3000, 512),
    ('tree_stump_01', 2000, 512), ('tree_stump_02', 2000, 512), ('fern_02', 2500, 512), ('shrub_01', 3000, 512), ('shrub_02', 3000, 512),
    ('shrub_04', 3000, 512), ('grass_medium_01', 1500, 512), ('grass_medium_02', 1500, 512), ('moss_01', 1500, 512),
    ('root_cluster_01', 3000, 512), ('root_cluster_02', 3000, 512),
    ('wild_rooibos_bush', 2500, 512), ('dry_branches_medium_01', 2500, 512), ('nettle_plant', 2000, 512), ('dandelion_01', 800, 512),
    ('boulder_01', 2500, 1024), ('rock_07', 2000, 512), ('rock_09', 2000, 512), ('rock_moss_set_01', 4000, 1024),
    ('namaqualand_boulder_03', 2500, 1024), ('namaqualand_boulder_04', 2500, 1024), ('namaqualand_rocks_01', 3000, 1024),
    ('namaqualand_cliff_02', 6000, 1024), ('coast_land_rocks_03', 5000, 1024),
    ('moon_rock_01', 2000, 512), ('moon_rock_03', 2000, 512), ('moon_rock_05', 2000, 512),
    ('modular_fort_01', 16000, 1024), ('gothic_statue', 6000, 1024), ('horse_statue_01', 6000, 1024), ('street_lamp_01', 2500, 512),
    ('wooden_barrels_01', 3000, 512), ('wooden_military_crate', 1500, 512), ('Barrel_02', 1500, 512),
]

# 影视级树木走 tools/foliage.py（叶卡稀疏化）：(pid, 节点子串, 输出名, 叶三角形预算, 树干预算)
TREES = [('island_tree_01', '', 'island_tree_01', 14000, 6000), ('island_tree_02', '', 'island_tree_02', 14000, 6000),
         ('tree_small_02', '', 'tree_small_02', 12000, 5000), ('fir_tree_01', 'fir_tree_01_a', 'fir_a', 16000, 5000),
         ('fir_tree_01', 'fir_tree_01_b', 'fir_b', 16000, 5000), ('fir_tree_01', 'fir_tree_01_c', 'fir_c', 16000, 5000),
         ('fir_sapling_medium', 'fir_sapling_medium_a', 'fir_sap_a', 6000, 2000), ('jacaranda_tree', '', 'jacaranda_tree', 16000, 6000)]

def trees():
    import subprocess
    have = set(os.listdir(OUT)) if os.path.isdir(OUT) else set()
    for pid, node, name, leaf, bark in TREES:
        if name + '.js' in have: continue
        subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), 'foliage.py'), pid, '--node', node, '--name', name,
                        '--leaf', str(leaf), '--bark', str(bark), '--tex', '512', '--twigkeep', '0.08', '--err', '0.1'])

def batch():
    have = set(os.listdir(OUT)) if os.path.isdir(OUT) else set()
    for s in SKIES:
        if 'sky_' + s + '.js' not in have:
            try: sky(s)
            except Exception as e: print('FAIL sky', s, e, flush=True)
    for t in TEXES:
        if 'tex_' + t + '.js' not in have:
            try: tex(t)
            except Exception as e: print('FAIL tex', t, e, flush=True)
    for pid, tr, tx in MODELS:
        if pid + '.js' not in have:
            try: model(pid, tr, tx)
            except Exception as e: print('FAIL model', pid, e, flush=True)

if __name__ == '__main__':
    a = sys.argv[1:]; opt = dict(zip(a[2::2], a[3::2]))
    if a[0] == 'batch': batch(); trees()
    elif a[0] == 'trees': trees()
    elif a[0] == 'model': model(a[1], int(opt.get('--tris', 8000)), int(opt.get('--tex', 512)))
    elif a[0] == 'tex': tex(a[1], int(opt.get('--size', 1024)))
    elif a[0] == 'sky': sky(a[1], int(opt.get('--w', 2048)))
