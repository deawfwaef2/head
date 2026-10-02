#!/usr/bin/env python3
"""R63 音效包构建：从 CC0 源（见 CREDITS.md）裁切/归一/压成 mp3(22.05k 单声道) → sfx/pack.js + sfx/amb.js
用法：python3 tools/build_sfxpack.py [源目录=/home/user/aud/x]  （源文件不入库）
全部素材 CC0：Kenney(impact/rpg/interface)、OpenGameArt CC0（artisticdude/StarNinjas/qubodup/rubberduck/…）。"""
import os, sys, glob, base64, json, subprocess, tempfile, numpy as np
FF = glob.glob('/usr/local/lib/python3*/site-packages/imageio_ffmpeg/binaries/ffmpeg-*')[0]
X = sys.argv[1] if len(sys.argv) > 1 else '/home/user/aud/x'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sfx')
SR = 22050
def P(*a): return os.path.join(X, *a)
ROOTS = [X, os.path.join(X, '..', 'oga')]
def find(name):  # 在源目录里按文件名(不含扩展名)找
    for R in ROOTS:
      for ext in ('ogg', 'wav', 'flac', 'mp3'):
        r = [f for f in glob.glob(os.path.join(R, '**', name + '.' + ext), recursive=True) if '__MACOSX' not in f and not os.path.basename(f).startswith('._')]
        if r: return sorted(r)[0]
    for R in ROOTS:
      r = [f for f in glob.glob(os.path.join(R, '**', name), recursive=True) if os.path.isfile(f) and '__MACOSX' not in f]
      if r: return sorted(r)[0]
    raise SystemExit('missing source: ' + name)
def load(f):
    r = subprocess.run([FF, '-v', 'error', '-i', f, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True)
    return np.frombuffer(r.stdout, dtype=np.float32).copy()
def enc(x):
    x16 = (np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()
    with tempfile.NamedTemporaryFile(suffix='.mp3') as t:
        subprocess.run([FF, '-y', '-v', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '56k', '-ar', str(SR), t.name], input=x16, check=True)
        return base64.b64encode(open(t.name, 'rb').read()).decode()
def prep(x, maxd, peak=0.9):
    th = 10 ** (-48 / 20); i = np.argmax(np.abs(x) > th) if (np.abs(x) > th).any() else 0
    x = x[max(0, i - 40):]
    j = len(x) - np.argmax(np.abs(x[::-1]) > th) if (np.abs(x) > th).any() else len(x)
    x = x[:min(j + 200, int(maxd * SR))]
    n = min(len(x) // 4, int(0.06 * SR)); 
    if n > 8: x[-n:] *= np.linspace(1, 0, n)  # 淡出，防爆音
    a = np.abs(x).max()
    return x * (peak / a) if a > 1e-4 else x
def dur(f): return len(load(f)) / SR
# ---------------- 池定义：key -> ([源名], 最长秒数) ----------------
def seq(fmt, a, b): return [fmt % i for i in range(a, b + 1)]
K = lambda n, a=0, b=4: ['%s_%03d' % (n, i) for i in range(a, b + 1)]
POOLS = {
 'sword': (['sword.%d' % i for i in range(1, 11)], 1.3),
 'clash': (['sword_clash.%d' % i for i in range(1, 11)], 1.6),
 'draw': (['sword-unsheathe%s' % s for s in ('', '2', '3', '4', '5')] + ['drawKnife1', 'drawKnife2', 'drawKnife3'], 1.2),
 'slice': (['knifeSlice', 'knifeSlice2', 'chop'] + ['sword.%d' % i for i in (2, 5, 8)], 0.6),
 'flesh': (seq('wet_towel_on_body-%02d', 1, 16), 0.7),
 'punch': (K('impactPunch_heavy') + K('impactPunch_medium') + seq('hit%02d.mp3', 1, 6), 0.8),
 'soft': (K('impactSoft_heavy') + K('impactSoft_medium') + seq('hit%02d.mp3', 7, 10), 0.8),
 'plate_l': (K('impactPlate_light') + K('impactPlate_medium'), 1.0),
 'plate_h': (K('impactPlate_heavy') + K('impactMetal_heavy'), 1.4),
 'metal': (K('impactMetal_heavy') + K('impactMetal_medium'), 1.4),
 'metal_hit': (K('impactMetal_light') + seq('metal_hit_%02d', 1, 5), 0.9),
 'wood': (K('impactWood_heavy') + K('impactWood_medium'), 0.9),
 'wood_hit': (K('impactWood_light') + seq('wood_hit_%02d', 1, 9), 0.7),
 'crack': (seq('wood_cracking_%02d', 1, 4) + seq('bfh1_wood_breaking_%02d', 1, 4) + seq('bfh1_breaking_%02d', 1, 3) + seq('bfh1_rock_breaking_%02d', 1, 3), 1.0),
 'rock': (seq('bfh1_rock_falling_%02d', 1, 9) + ['bfh1_rock_hit_01'], 1.2),
 'fall': (seq('bfh1_falling_%02d', 1, 7) + seq('wood_falling_%02d', 1, 5), 1.3),
 'bell': (K('impactBell_heavy'), 3.0),
 'glass': (K('impactGlass_light') + K('impactGlass_medium'), 1.2),
 'glass_h': (K('impactGlass_heavy') + seq('bfh1_glass_breaking_%02d', 1, 3), 1.6),
 'wet': (seq('slime%d', 1, 8) + seq('sfx100v2_footstep_wet_%02d', 1, 3), 0.9),
 'chain': (['chainmail1', 'chainmail2', 'metal_interaction1', 'metal_interaction2'] + seq('keys_%02d', 1, 4), 1.4),
 'sheet': (seq('metal_sheet_%02d', 1, 6), 1.4),
 'hammer': (seq('hammer_%02d', 1, 4) + seq('tools_%02d', 1, 4), 0.7),
 'creak': (['creak1', 'creak2', 'creak3', 'wood_squeak_01', 'wood_squeak_02'], 2.0),
 'door': (['doorOpen_1', 'doorOpen_2', 'doorClose_1', 'doorClose_2', 'doorClose_3', 'door'], 1.4),
 'latch': (['metalLatch', 'metalClick', 'lock_open_01', 'sfx100v2_lock_open_01'], 0.7),
 'cloth': (['cloth1', 'cloth2', 'cloth3', 'cloth4', 'clothBelt', 'clothBelt2', 'cloth', 'cloth-heavy'], 0.9),
 'leather': (['handleSmallLeather', 'handleSmallLeather2', 'dropLeather', 'beltHandle1', 'beltHandle2'], 0.8),
 'armor': (['armor-light', 'chainmail1', 'chainmail2', 'metal-small1', 'metal-small2', 'metal-small3'], 0.9),
 'coins': (['handleCoins', 'handleCoins2', 'coin', 'coin2', 'coin3'], 0.9),
 'beads': (['beads', 'bottle'], 0.9),
 'page': (['bookFlip1', 'bookFlip2', 'bookFlip3', 'bookOpen', 'bookClose'], 0.8),
 'magic': (['magic1', 'spell'], 1.6),
 'ui_s': (seq('confirmation_%03d', 1, 4) + seq('select_%03d', 1, 4), 0.6),
 'horror': (['horror_effect1', 'horror_effect2'], 3.5),
 'ogre': (seq('ogre%d', 1, 5), 2.0),
 'giant': (seq('giant%d', 1, 5), 2.2),
 'beast': (seq('mnstr%d', 1, 15), 1.6),
 'shade': (seq('shade%d', 1, 12), 1.6),
 'hurt': (seq('hurt_%02d', 1, 5) + seq('grunt_%02d', 1, 5), 1.0),
 'scream': (['scream_01', 'scream_02'] + seq('monster_%02d', 1, 6) + ['roar_01', 'roar_02'], 2.2),
 'howl': (['howl', 'wolf_monster_6'], 4.0),
 'bite': (['bite-small', 'bite-small2', 'bite-small3'] + seq('eat_%02d', 1, 4), 0.8),
 'breath': (['breath'], 2.5),
 'ghost': (seq('qubodup-GhostMoan%02d', 1, 5), 4.0),
 'crow': (['crow_caw'], 2.2),
 'thunder': (['sfx100v2_thunder_01'], 5.0),
 'rustle': (seq('rustle%02d', 1, 12), 1.6),
 'st_grass': (K('footstep_grass'), 0.45),
 'st_snow': (K('footstep_snow'), 0.55),
 'st_wood': (K('footstep_wood') + ['wood01', 'wood02', 'wood03'] + seq('sfx100v2_footstep_wood_%02d', 1, 4), 0.5),
 'st_stone': (K('footstep_concrete') + ['stone01'] + ['sfx100v2_footstep_01', 'sfx100v2_footstep_02'], 0.5),
 'st_gravel': (['gravel', 'sfx100v2_stones_01', 'sfx100v2_stones_02'], 0.6),
 'st_leaves': (['leaves01', 'leaves02'] + seq('rustle%02d', 13, 16), 0.6),
 'st_mud': (['mud02'] + seq('sfx100v2_footstep_wet_%02d', 1, 3), 0.6),
 'st_dirt': (K('footstep_carpet'), 0.45),
}
# swishes 按长度分轻/重
SW = sorted(['swish-%d' % i for i in range(1, 14)], key=lambda n: dur(find(n)))
POOLS['sw_l'] = (SW[:6], 0.5)
POOLS['sw_h'] = (SW[6:] + ['swing', 'swing2', 'swing3', 'metal_swing1'], 0.8)
# 循环层：(源, 截取秒, 目标 RMS dBFS)
LOOPS = {
 'cave': ('dungeon_ambient_1_0', 18), 'drips': ('atmosbasement.mp3_', 16), 'fire': ('fire-1_0', 14), 'swamp': ('swamp', 20),
 'river': ('VistulaShort_0', 20), 'wind': ('wind1', 18), 'gale': ('wind woosh loop', 16), 'crickets': ('crickets_1', 14),
 'abyss': ('ambience-1', 18), 'abyss2': ('ambience-3', 18), 'cave_dark': ('dark_cavern_ambient_001', 18), 'heart': ('heartbeat_slow_0', 6),
}
def loop(x, maxd, rms_db=-16):
    x = x[:int(maxd * SR)]; n = len(x); c = min(int(1.5 * SR), n // 3)
    t = np.linspace(0, np.pi / 2, c); body = x[:n - c].copy()   # 尾部 c 秒与开头交叉淡化 → 首尾无缝
    body[:c] = body[:c] * np.sin(t) + x[n - c:] * np.cos(t)
    x = body - body.mean(); r = np.sqrt((x ** 2).mean()) + 1e-9; g = 10 ** (rms_db / 20) / r
    return np.clip(x * g, -0.95, 0.95)
def main():
    os.makedirs(OUT, exist_ok=True); pack = {}; tot = 0
    for k, (names, md) in POOLS.items():
        pool = []
        for n in names:
            try: f = find(n)
            except SystemExit as e: print('skip', n); continue
            x = load(f)
            if len(x) < 200: continue
            pool.append(enc(prep(x, md)))
        pack[k] = pool; tot += sum(len(s) for s in pool); print(k, len(pool))
    hdr = '/* R63 音效包 (CC0, 见 CREDITS.md) —— tools/build_sfxpack.py 生成，勿手改 */\n'
    open(os.path.join(OUT, 'pack.js'), 'w').write(hdr + 'window.SFXPACK=' + json.dumps(pack, separators=(',', ':')) + ';\n')
    amb = {}
    for k, (n, md) in LOOPS.items():
        if k == 'heart': x = loop(load(find(n)), md, -14)
        else: x = loop(load(find(n)), md)
        amb[k] = enc(x)
    open(os.path.join(OUT, 'amb.js'), 'w').write(hdr + 'window.SFXAMB=' + json.dumps(amb, separators=(',', ':')) + ';\n')
    print('pack', os.path.getsize(os.path.join(OUT, 'pack.js')), 'amb', os.path.getsize(os.path.join(OUT, 'amb.js')))
main()
