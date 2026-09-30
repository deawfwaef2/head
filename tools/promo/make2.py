# -*- coding: utf-8 -*-
"""R40 宣传图（正方形 1080×1080 + 2:3 竖版 1080×1620），中 / 日 / 英各一套，共 3 主题 × 2 比例 × 3 语言 = 18 张。
用法：先在仓库根目录起 `python3 -m http.server 8080`，再 `python3 tools/promo/make2.py [zh|ja|en ...]`。
输出 promo/<lang>/sq_0N_xxx.png、promo/<lang>/p23_0N_xxx.png。
素材（全部是游戏里真实的东西）：
  · tools/promo/cap/title_<lang>.png —— 游戏标题界面真实截图（tools 里的 boot3 脚本抓取，见 HANDOFF R40）
  · tools/promo/cap/wpn_<lang>.png   —— 游戏内「武器详细属性」面板真实截图
  · js/regionart.js 的 CC0 全景做虚化背景；按键帽文案与 js/keyguide.js 的 KeyGuide.SEC 同源（游戏内 F1 面板）
若放入 tools/promo/cap/cave.png / combat.png（你自己在游戏里截的图，任意分辨率），设计 1/2 会自动换成它。
"""
import os, sys, re, base64, json
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CAP = os.path.join(ROOT, 'tools', 'promo', 'cap')

def b64(path, mime=None):
    ext = os.path.splitext(path)[1].lower()
    mime = mime or ('image/png' if ext == '.png' else 'image/jpeg')
    return 'data:%s;base64,%s' % (mime, base64.b64encode(open(path, 'rb').read()).decode())

def crop_b64(path, box):
    from PIL import Image
    import io
    im = Image.open(path).convert('RGB').crop(box); buf = io.BytesIO(); im.save(buf, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()

def region(k):
    s = open(os.path.join(ROOT, 'js', 'regionart.js'), encoding='utf-8').read()
    m = re.search(r"^\s*%s: '(data:image/jpeg;base64,[^']+)'" % k, s, re.M)
    return m.group(1)

FONT = {'zh': ("'Noto Serif CJK SC','Noto Serif SC',serif", "'Noto Sans CJK SC','Noto Sans SC',sans-serif"),
        'ja': ("'Noto Serif CJK JP','Noto Serif JP',serif", "'Noto Sans CJK JP','Noto Sans JP',sans-serif"),
        'en': ("'Noto Serif CJK SC','Noto Serif',Georgia,serif", "'Noto Sans CJK SC','Noto Sans',sans-serif")}

T = {
 'zh': {
  'title': '魂首窟', 'sub': 'SOULHEAD CAVE',
  # 1 hook
  'h1': '挥一刀，<br>收一颗首级', 'tag': '第一人称暗黑奇幻 · 你是被诅咒的食人魔',
  'th': [('sword', '完美格挡 → 破绽 → 处决', '格挡住的那一瞬，敌人脖子大开。按 E，一击了结。'),
         ('skull', '亲手把玩，魂晶哗哗涌出', '首级抛、转、戳、摆上展台——越玩，魂晶越多。'),
         ('map', '每次出洞都是新地图', '九位地区霸主、精英与 4 名猎手，打一个长长的猎首传奇。'),
         ('castle', '把洞窟养成收藏馆', '建造、训练、锻造；万颗首级也不卡（万首优化）。')],
  'real': '实机界面', 'six': '先记住这 6 个键', 'cta': '下载 → 双击 index.html → 开玩', 'cta2': '免费 · 无需安装 · 中文 / 日本語 / English · 按 F1 随时查看全部按键',
  # 2 combat
  'h2': '格挡 · 破防 · 处决', 'tag2': '不是无脑连点：方向、时机、体力，都有讲究',
  'fl': [('F', '拔刀', '出洞后先拔刀'), ('RMB', '按住格挡', '轻移鼠标，选上下左右'), ('!', '破绽！', '完美格挡 / 完美闪避后敌人露出破绽'), ('E', '处决', '一击了结')],
  'more': [('LMB', '点一下出刀，连点三连斩；按住甩鼠标 = 朝该方向斩'), ('Q', '闪身（朝你按的方向）'), ('1 … 0', '技能快捷栏'), ('H', '喝药')],
  'cap2': '游戏内「武器详细属性」面板（实机）', 'hint2': '体力 · 前摇 · 触及 · 部位倍率，一目了然',
  # 3 keys
  'h3': '按键速查', 'tag3': '看这一张就够了 · 游戏里按 F1 也能随时打开',
 },
 'ja': {
  'title': '魂首窟', 'sub': 'SOULHEAD CAVE',
  'h1': '一閃、<br>一首。', 'tag': '一人称ダークファンタジー · あなたは呪われたオーガ',
  'th': [('sword', '完全ガード → 隙 → 処刑', 'ガードが決まった瞬間、敵の首筋はがら空き。Eで一撃必殺。'),
         ('skull', '首を弄べば、魂晶があふれる', '投げる・回す・つつく・展示台に飾る——遊ぶほど魂晶が増える。'),
         ('map', '出るたびに新しいマップ', '九人の地域の覇者、エリート、4人のハンター。長い首狩り伝説へ。'),
         ('castle', '洞窟を収集館に育てる', '建築・訓練・鍛造。1万個の首でも軽快（万首最適化）。')],
  'real': '実機画面', 'six': 'まずはこの6キー', 'cta': 'ダウンロード → index.html をダブルクリック → プレイ', 'cta2': '無料 · インストール不要 · 中文 / 日本語 / English · F1 で全キーをいつでも確認',
  'h2': 'ガード · 崩し · 処刑', 'tag2': '連打だけじゃ勝てない：方向・タイミング・スタミナが物を言う',
  'fl': [('F', '抜刀', '外に出たらまず抜刀'), ('RMB', '押してガード', 'マウスを軽く動かして上下左右を選ぶ'), ('!', '隙！', '完全ガード／完全回避で敵に隙が生まれる'), ('E', '処刑', '一撃で決める')],
  'more': [('LMB', 'クリックで斬る、連打で三連斬。押して振るとその方向へ斬る'), ('Q', '回避（押している方向へ）'), ('1 … 0', 'スキルバー'), ('H', '回復薬')],
  'cap2': 'ゲーム内「武器の詳細」パネル（実画面）', 'hint2': 'スタミナ・予備動作・リーチ・部位倍率が一目で分かる',
  'h3': 'キー早見表', 'tag3': 'この1枚でOK · ゲーム内では F1 でいつでも開ける',
 },
 'en': {
  'title': 'Soulhead Cave', 'sub': '魂首窟',
  'h1': 'One swing.<br>One head.', 'tag': 'First-person dark fantasy · You are a cursed ogre',
  'th': [('sword', 'Perfect block → Opening → Execute', "Nail the block and the enemy's neck is wide open. Press E to finish it."),
         ('skull', 'Play with heads, watch crystals pour out', 'Toss, spin, poke, display — the more you play, the more soul crystals you get.'),
         ('map', 'A new map every run', 'Nine regional overlords, elites and four hunters — one long headhunting saga.'),
         ('castle', 'Grow your cave into a gallery', 'Build, train, forge — and 10,000 heads still run smooth.')],
  'real': 'Real in-game screen', 'six': 'Learn these 6 keys first', 'cta': 'Download → double-click index.html → play', 'cta2': 'Free · no install · English / 中文 / 日本語 · press F1 any time to see every key',
  'h2': 'Block · Break · Execute', 'tag2': 'Not button-mashing: direction, timing and stamina all matter',
  'fl': [('F', 'Draw', 'Draw your weapon outside'), ('RMB', 'Hold to block', 'Nudge the mouse to pick the side'), ('!', 'Opening!', 'Perfect block / dodge leaves the enemy open'), ('E', 'Execute', 'Finish it in one hit')],
  'more': [('LMB', 'Tap to slash, tap 3× for a combo; hold and flick the mouse to cut that way'), ('Q', 'Dodge (toward your move keys)'), ('1 … 0', 'Skill hotbar'), ('H', 'Drink a potion')],
  'cap2': 'The in-game “Weapon Details” panel (real UI)', 'hint2': 'Stamina · wind-up · reach · hit-zone multipliers at a glance',
  'h3': 'Key cheat-sheet', 'tag3': 'Everything you need on one page · press F1 in game any time',
 },
}
SIX = ['W A S D', 'F', 'LMB', 'RMB', 'Q', 'E']

ICON = {
 'sword': '<svg viewBox="0 0 64 64"><path d="M14 50 L44 14 L52 12 L50 20 L18 54Z" fill="none" stroke="#ffcf70" stroke-width="3.5" stroke-linejoin="round"/><path d="M10 40 L24 54 M8 56 L18 46" stroke="#ffcf70" stroke-width="4" stroke-linecap="round"/></svg>',
 'skull': '<svg viewBox="0 0 64 64"><path d="M32 8C18 8 10 18 10 30c0 8 4 12 8 14v8h28v-8c4-2 8-6 8-14C54 18 46 8 32 8Z" fill="none" stroke="#ffcf70" stroke-width="3.5" stroke-linejoin="round"/><circle cx="23" cy="32" r="5" fill="#d8452e"/><circle cx="41" cy="32" r="5" fill="#d8452e"/><path d="M28 44v6M36 44v6" stroke="#ffcf70" stroke-width="3"/></svg>',
 'map': '<svg viewBox="0 0 64 64"><path d="M8 14l16-6 16 6 16-6v42l-16 6-16-6-16 6Z" fill="none" stroke="#ffcf70" stroke-width="3.5" stroke-linejoin="round"/><path d="M24 8v42M40 14v42" stroke="#ffcf70" stroke-width="3"/><circle cx="46" cy="30" r="4" fill="#d8452e"/></svg>',
 'castle': '<svg viewBox="0 0 64 64"><path d="M8 56V22h8v6h6v-6h6v-8h8v8h6v6h6v-6h8v34Z" fill="none" stroke="#ffcf70" stroke-width="3.5" stroke-linejoin="round"/><path d="M26 56V42a6 6 0 0 1 12 0v14" fill="none" stroke="#d8452e" stroke-width="3.5"/></svg>',
}

CSS = """
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:%(W)spx;height:%(H)spx;overflow:hidden;background:#0b0605}
body{font-family:%(sans)s;color:#eadcc4;position:relative}
.bg{position:absolute;inset:-40px;background-size:cover;background-position:center;filter:blur(14px) saturate(.8) brightness(.42)}
.vig{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 35%,rgba(120,30,18,.35),rgba(10,5,4,.55) 55%,rgba(5,2,2,.92)),linear-gradient(180deg,rgba(0,0,0,.25),rgba(0,0,0,.55))}
.frame{position:absolute;inset:18px;border:2px solid rgba(200,150,70,.55);box-shadow:inset 0 0 0 6px rgba(0,0,0,.35),inset 0 0 0 7px rgba(200,150,70,.25);pointer-events:none}
.c{position:absolute;inset:18px;display:flex;flex-direction:column;padding:%(pad)spx}
.logo{display:flex;align-items:baseline;gap:16px;font-family:%(serif)s;letter-spacing:.2em;color:#e9c77e;font-size:30px;font-weight:700}
.logo small{font:600 15px %(sans)s;letter-spacing:.3em;color:#a98c5e}
h1{font-family:%(serif)s;font-weight:900;line-height:1.08;letter-spacing:.04em;background:linear-gradient(180deg,#fff0c4,#ffc45a 55%,#c9702a);-webkit-background-clip:text;color:transparent;text-shadow:0 0 40px rgba(255,140,40,.25);filter:drop-shadow(0 4px 0 rgba(0,0,0,.55))}
.tag{color:#d9c6a2;letter-spacing:.06em}
.cap{display:inline-block;min-width:1.5em;padding:.12em .55em .2em;text-align:center;font:800 1em/1.2 "SF Mono",Consolas,"DejaVu Sans Mono","Noto Sans Mono",monospace;color:#ffe3a6;background:linear-gradient(180deg,#46321f,#241811);border:2px solid #9a7440;border-bottom-width:5px;border-radius:9px;box-shadow:0 2px 0 #000,0 0 18px rgba(255,170,60,.12)}
.shot{flex:none;position:relative;border:2px solid #b08a4e;box-shadow:0 14px 50px rgba(0,0,0,.8),0 0 60px rgba(216,69,46,.18);background:#000;overflow:hidden}
.shot img{display:block;width:100%;filter:brightness(1.35) contrast(1.05)}
.shot .lb{position:absolute;left:0;bottom:0;background:#d8452e;color:#fff;font:700 15px %(sans)s;letter-spacing:.08em;padding:4px 12px}
.ico{width:54px;height:54px;flex:none}
.cta{margin-top:auto;padding:16px 22px;background:linear-gradient(90deg,rgba(150,40,24,.85),rgba(70,22,14,.85));border:1px solid #c98a4a;text-align:center}
.cta b{display:block;font:800 %(ctaF)spx %(serif)s;color:#ffe3a6;letter-spacing:.04em}
.cta span{display:block;margin-top:6px;font-size:%(cta2F)spx;color:#e6cfa6}
"""

def page(lang, design, fmt, scene):
    L = T[lang]; serif, sans = FONT[lang]
    W, H = (1080, 1080) if fmt == 'sq' else (1080, 1620)
    tall = fmt == 'p23'
    css = CSS
    for k_, v_ in dict(W=W, H=H, sans=sans, serif=serif, pad=34 if not tall else 40, ctaF=30 if not tall else 34, cta2F=19 if not tall else 21).items(): css = css.replace('%%(%s)s' % k_, str(v_))
    bg = region(scene)
    cave = os.path.join(CAP, 'cave.png'); combat = os.path.join(CAP, 'combat.png'); title = os.path.join(CAP, 'title_%s.png' % lang); wpn = os.path.join(CAP, 'wpn_%s.png' % lang)
    hero_src = b64(cave) if os.path.exists(cave) else crop_b64(title, (100, 0, 1180, 720))
    hero_full = b64(cave) if os.path.exists(cave) else b64(title)
    body = ''
    logo = '<div class="logo">%s <small>%s</small></div>' % (L['title'], L['sub'])
    cta = '<div class="cta"><b>%s</b><span>%s</span></div>' % (L['cta'], L['cta2'])
    if design == 1:
        h1f = (100 if lang != 'ja' else 84) if not tall else 104
        th = L['th'][:3]
        if not tall:
            th_html = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:20px">' + ''.join(
                '<div style="background:rgba(0,0,0,.42);border:1px solid rgba(200,150,70,.4);padding:14px 16px"><div style="display:flex;gap:12px;align-items:center"><div class="ico" style="width:44px;height:44px">%s</div><b style="font-size:23px;line-height:1.25;color:#ffe3a6">%s</b></div><p style="margin-top:8px;font-size:18px;line-height:1.45;color:#d9c6a2">%s</p></div>' % (ICON[i], a, b) for i, a, b in th) + '</div>'
            shot_w = 580
            six = '<div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:12px"><div style="font:700 20px %s;color:#ffcf70;letter-spacing:.08em">%s</div><div style="display:flex;flex-wrap:wrap;gap:10px;font-size:26px">%s</div></div>' % (sans, L['six'], ''.join('<span class="cap">%s</span>' % k for k in SIX))
            mid = '<div style="display:flex;gap:26px;margin-top:22px;align-items:stretch"><div class="shot" style="width:%dpx;flex:none"><img src="%s"><div class="lb">%s</div></div>%s</div>' % (shot_w, hero_src, L['real'], six)
            body = logo + '<h1 style="font-size:%dpx;margin-top:14px">%s</h1><div class="tag" style="font-size:24px;margin-top:10px">%s</div>' % (h1f, L['h1'], L['tag']) + th_html + mid + cta
        else:
            th_html = '<div style="display:flex;flex-direction:column;gap:12px;margin-top:22px">' + ''.join(
                '<div style="display:flex;gap:20px;align-items:center;background:rgba(0,0,0,.42);border:1px solid rgba(200,150,70,.4);padding:12px 22px"><div class="ico" style="width:60px;height:60px">%s</div><div><b style="font-size:31px;color:#ffe3a6;line-height:1.25">%s</b><p style="margin-top:4px;font-size:22px;line-height:1.45;color:#d9c6a2">%s</p></div></div>' % (ICON[i], a, b) for i, a, b in th) + '</div>'
            mid = '<div class="shot" style="margin-top:22px"><img src="%s"><div class="lb" style="font-size:18px">%s</div></div>' % (hero_full, L['real'])
            six = '<div style="margin-top:22px;display:flex;align-items:center;gap:18px;flex-wrap:wrap"><div style="font:700 24px %s;color:#ffcf70">%s</div><div style="display:flex;gap:10px;font-size:30px">%s</div></div>' % (sans, L['six'], ''.join('<span class="cap">%s</span>' % k for k in SIX))
            body = logo + '<h1 style="font-size:%dpx;margin-top:18px">%s</h1><div class="tag" style="font-size:28px;margin-top:12px">%s</div>' % (h1f, L['h1'], L['tag']) + mid + th_html + six + '<div style="height:20px"></div>' + cta
    elif design == 2:
        h1f = 84 if not tall else 100
        fs = 36 if not tall else 44
        steps = ''
        for i, (k, a, b) in enumerate(L['fl']):
            hot = k == '!'
            kc = ('<div style="font:900 %dpx %s;color:#fff;background:radial-gradient(circle,#ff9a3c,#d8452e 70%%);border-radius:50%%;width:%dpx;height:%dpx;display:flex;align-items:center;justify-content:center;box-shadow:0 0 40px rgba(255,120,40,.7)">!</div>' % (fs + 14, serif, fs * 2, fs * 2)) if hot else '<span class="cap" style="font-size:%dpx">%s</span>' % (fs, k)
            steps += '<div style="flex:1;background:rgba(0,0,0,.45);border:1px solid %s;padding:16px 10px 14px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px;position:relative"><div style="height:%dpx;display:flex;align-items:center">%s</div><b style="font-size:%dpx;color:#ffe3a6">%s</b><p style="font-size:%dpx;line-height:1.4;color:#d9c6a2">%s</p><em style="position:absolute;top:-14px;left:-8px;background:#d8452e;color:#fff;font:800 18px %s;font-style:normal;padding:2px 10px">%d</em></div>' % ('#ff9a3c' if hot else 'rgba(200,150,70,.45)', fs * 2, kc, 26 if not tall else 30, a, 17 if not tall else 21, b, sans, i + 1)
            if i < 3: steps += '<div style="align-self:center;color:#c98a4a;font:900 34px %s">▶</div>' % sans
        flow = '<div style="display:flex;gap:8px;margin-top:%dpx;align-items:stretch">%s</div>' % (34 if not tall else 44, steps)
        more = ''.join('<div style="display:flex;gap:14px;align-items:center;padding:7px 0;border-top:1px dashed rgba(200,150,70,.25)"><span class="cap" style="font-size:%dpx;flex:none">%s</span><span style="font-size:%dpx;line-height:1.35;color:#e6d6b8">%s</span></div>' % (22 if not tall else 26, k, 18 if not tall else 22, d) for k, d in L['more'])
        wimg = '<div><div class="shot"><img src="%s"><div class="lb">%s</div></div><div style="margin-top:10px;font-size:%dpx;color:#d9c6a2">%s</div></div>' % (b64(wpn), L['real'], 17 if not tall else 21, L['hint2'])
        if not tall:
            lower = '<div style="display:flex;gap:26px;margin-top:30px;align-items:flex-start"><div style="width:560px;flex:none">%s</div><div style="flex:1">%s</div></div>' % (wimg, more)
        else:
            lower = '<div style="margin-top:34px">%s</div><div style="margin-top:26px">%s</div>' % (wimg, more)
        body = logo + '<h1 style="font-size:%dpx;margin-top:14px">%s</h1><div class="tag" style="font-size:%dpx;margin-top:10px">%s</div>' % (h1f, L['h2'], 24 if not tall else 28, L['tag2']) + flow + lower + '<div style="height:16px"></div>' + cta
    else:
        # keys：SEC 来自 keyguide.js（同源）
        sec = json.load(open(os.path.join(ROOT, 'tools', 'promo', 'keysec.json'), encoding='utf-8'))
        h1f = 72 if not tall else 96
        fsz = 17 if not tall else 25
        kw = 124 if not tall else 170
        def card(s_):
            rows = ''.join('<div style="display:flex;gap:10px;align-items:flex-start;padding:%dpx 0;border-top:1px dashed rgba(200,150,70,.2)"><div style="flex:none;width:%dpx;display:flex;flex-wrap:wrap;gap:4px;font-size:%dpx">%s</div><div style="font-size:%dpx;line-height:1.3;color:#e6d6b8">%s</div></div>' % (2 if not tall else 6, kw, fsz - 4, ''.join('<span class="cap" style="font-size:1em">%s</span>' % k.replace('<', '&lt;') for k in r[0]), fsz, r[1][lang]) for r in s_['rows'])
            return '<div style="margin-bottom:%dpx;background:rgba(0,0,0,.45);border:1px solid rgba(200,150,70,.4);padding:6px 14px 4px"><div style="font:800 %dpx %s;color:#ffcf70;letter-spacing:.06em;padding:3px 0">%s</div>%s</div>' % (10 if not tall else 18, fsz + 4, sans, s_['t'][lang], rows)
        c1 = ''.join(card(x) for x in (sec[0], sec[1], sec[4])); c2 = ''.join(card(x) for x in (sec[2], sec[3]))
        foot = cta if tall else '<div style="margin-top:auto;text-align:center;font:800 24px %s;color:#ffe3a6;padding-top:8px">%s</div>' % (serif, L['cta'])
        body = logo + '<h1 style="font-size:%dpx;margin-top:8px">%s</h1><div class="tag" style="font-size:%dpx;margin:6px 0 %dpx">%s</div>' % (h1f, L['h3'], 21 if not tall else 27, 12 if not tall else 24, L['tag3']) + '<div style="display:flex;gap:16px;align-items:flex-start"><div style="flex:1">%s</div><div style="flex:1">%s</div></div>' % (c1, c2) + foot
    return '<!doctype html><html lang="%s"><meta charset="utf-8"><style>%s</style><body><div class="bg" style="background-image:url(%s)"></div><div class="vig"></div><div class="frame"></div><div class="c">%s</div></body></html>' % (lang, css, bg, body), W, H

NAMES = {1: '01_hook', 2: '02_combat', 3: '03_keys'}
SCENE = {1: 'forest', 2: 'abyss', 3: 'fortress'}

def main():
    langs = [a for a in sys.argv[1:] if a in T] or ['zh', 'ja', 'en']
    # 取 KeyGuide.SEC（与游戏内 F1 面板同源）
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(); pg.goto('http://localhost:8080/tools/test/keyguide.html?open=0')
        sec = pg.evaluate('KeyGuide.SEC.map(s=>({t:s.t,rows:s.rows.map(r=>[r[0],r[1]])}))')
        json.dump(sec, open(os.path.join(ROOT, 'tools', 'promo', 'keysec.json'), 'w', encoding='utf-8'), ensure_ascii=False)
        for lang in langs:
            os.makedirs(os.path.join(ROOT, 'promo', lang), exist_ok=True)
            for fmt in ('sq', 'p23'):
                for d in (1, 2, 3):
                    html, W, H = page(lang, d, fmt, SCENE[d])
                    pg2 = b.new_page(viewport={'width': W, 'height': H}); pg2.set_content(html); pg2.wait_for_timeout(400)
                    out = os.path.join(ROOT, 'promo', lang, '%s_%s.png' % (fmt, NAMES[d]))
                    pg2.screenshot(path=out); pg2.close(); print(out)
        b.close()

if __name__ == '__main__':
    main()
