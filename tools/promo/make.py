# -*- coding: utf-8 -*-
"""宣传图生成器：python3 tools/promo/make.py  （需要 playwright，先起 /tmp/srv.py 服务 http://localhost:8080）
输出 promo/<lang>/0N_xxx.png（1920×1080）。图片全部取自仓库内真实素材：js/spirit_art.js（Q 版神灵）、js/regionart.js（CC0 天空/场景）、
tools/promo/cap/wpn_*.png（游戏内「武器详细属性」面板的真实截图，由翻译引擎输出）。无性化角色图。"""
import os, sys, json
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

T = {
 'zh': {
  'font': '"Noto Serif CJK SC","Noto Serif SC","Songti SC",serif', 'sans': '"Noto Sans CJK SC","Noto Sans SC",sans-serif', 'lang': 'zh-CN',
  'title': '魂首窟', 'sub': 'SOULHEAD CAVE', 'tag': '食人魔的收藏 · 猎首 · 成长 · 守住你的洞窟',
  'k1': ['第一人称暗黑奇幻搜刮战斗', '每次重构的地点与遭遇', '斩首、把玩、收藏每一颗首级'],
  'foot': '魂首窟 · Soulhead Cave — 打开 index.html 即可游玩（中文 / 日本語 / English）',
  'w_h': '世界观', 'w_p': ['你是被诅咒的食人魔格罗克。诅咒让你渴望「魂晶」——只有斩下猎物的首级，魂晶才会涌出。', '大陆被九位地区霸主分割：麦田的魔女、翠影森林的女王、裂牙荒原的女酋……每一颗霸主首级都是传说级的战利品。', '带着战利品回到魂首窟，把首级摆上石龛，训练、锻造、扩建——让洞窟成为你的收藏馆。'],
  'w_n': ['麦田魔女 玛蒂尔达','翠影女王 希瑟莉亚','裂牙女酋 加尔莎','白银圣女 塞拉菲娜','黑沼之母 莫甘娜','铁盔女元帅 布伦希尔德','金冠女王 伊莎贝拉','深渊女王 莉莉丝','龙骨圣母 奥瑞莉娅'],
  'w_t': '九位地区霸主',
  'g_h': '玩法循环', 'g_s': [('出洞探索','每次都是重构的地点：阅读遭遇，判断战斗还是撤离。'),('猎首','用力度真实的挥砍、突刺与方向格挡放倒敌人，斩下首级。'),('回洞经营','把首级摆上展台，训练、锻造、建造，洞窟越来越像你的王座。'),('成长与同伴','天赋树、技能与可选的 Q 版神灵陪你把收藏做大。')],
  'c_h': '战斗', 'c_p': ['挥动鼠标完成有力度的斩击，连点突刺，右键按方向格挡，Q 闪身', '完美格挡 / 完美闪避会让敌人露出「破绽」——按 E 直接处决', '体力、前摇、触及、部位倍率……武器详细属性一目了然', '七类武器手感各异；霸主与精英不会被一刀秒杀', '敌人分职责、会包抄、会撤退——不要站着发呆'],
  'c_cap': '游戏内「武器详细属性」面板（实机界面）',
  'r_h': '成长', 'r_p': ['5 项属性 · 6 大流派 · 78 个天赋节点 · 31 个主动技能', '刃舞 · 铁壁 · 影袭 · 狂血 · 魂术 · 猎首', '6 套推荐流派一键加点，也可以自由混搭', '快捷栏 1–0 / Shift+1–0，T 打开面板，Q 闪身，E 处决'],
  'r_sch': [('刃舞','暴击 · 连击 · 弹反','#ffd27a'),('铁壁','减伤 · 反伤 · 控制','#8fd0ff'),('影袭','闪避 · 背刺 · 毒与流血','#b59cff'),('狂血','吸血 · 残血爆发 · 冲锋','#ff6a6a'),('魂术','法术 · 控场 · 魂能','#6fe6ff'),('猎首','处决 · 悬赏 · 收益','#ffe070')],
  'r_b': '推荐流派', 'r_bn': ['暴击剑圣','不死堡垒','魂焰法师','毒影刺客','血战士','斩首官'],
  's_h': '神灵同伴', 's_p': ['洞里住着 Q 版的小神灵：各有性格、各有需求', '可以和它们聊天，请它们评价你的首级', '开局只有哥布林斯尼克——其余要靠你去招来', '完全可选：Y 面板里随时开关，不想要也没关系'],
 },
 'ja': {
  'font': '"Noto Serif CJK JP","Noto Serif JP","Hiragino Mincho ProN",serif', 'sans': '"Noto Sans CJK JP","Noto Sans JP",sans-serif', 'lang': 'ja',
  'title': '魂首窟', 'sub': 'SOULHEAD CAVE', 'tag': '食人鬼のコレクション ・ 首狩り ・ 成長 ・ 洞窟を守れ',
  'k1': ['一人称ダークファンタジー探索アクション', '毎回姿を変える土地と出会い', '首を刎ね、弄び、コレクションする'],
  'foot': '魂首窟 · Soulhead Cave — index.html を開くだけで遊べます（中文 / 日本語 / English）',
  'w_h': '世界観', 'w_p': ['あなたは呪われた食人鬼グロク。呪いは「魂晶」を求める——獲物の首を刎ねたときだけ、魂晶があふれ出す。', '大陸は九人の地域の覇者に分かたれている。麦畑の魔女、翠影の森の女王、裂牙の荒野の女酋長……覇者の首は伝説級の戦利品だ。', '戦利品を持って魂首窟へ帰り、首を石龕に飾り、鍛え、造り、広げよう——洞窟はあなたのコレクション館になる。'],
  'w_n': ['麦畑の魔女 マチルダ','翠影の女王 ヘザリア','裂牙の女酋長 ガルサ','白銀の聖女 セラフィナ','黒沼の母 モルガナ','鉄兜の女元帥 ブリュンヒルデ','金冠の女王 イザベラ','深淵の女王 リリス','竜骨の聖母 アウレリア'],
  'w_t': '九人の地域の覇者',
  'g_h': 'ゲームの流れ', 'g_s': [('洞窟を出て探索','毎回構成が変わる土地。出会いを読み、戦うか撤退するかを選ぶ。'),('首狩り','重みのある斬撃・突き・方向ガードで敵を倒し、首を刎ねる。'),('洞窟の経営','首を展示台に飾り、訓練・鍛造・建築。洞窟が玉座になっていく。'),('成長と仲間','タレントツリー、スキル、任意のQ版精霊がコレクションを支える。')],
  'c_h': '戦闘', 'c_p': ['マウスを振って重みのある斬撃、連打で突き、右クリックで方向ガード、Qで回避', '完全ガード／完全回避で敵に「隙」——Eで即処刑', 'スタミナ・予備動作・リーチ・部位倍率……武器の詳細性能が一目で分かる', '七種の武器は手触りがそれぞれ違う。覇者や精鋭は一撃では倒れない', '敵は役割を持ち、回り込み、撤退する——ぼんやり立っていてはいけない'],
  'c_cap': 'ゲーム内「武器の詳細」パネル（実画面）',
  'r_h': '成長', 'r_p': ['属性5種 ・ 6系統 ・ タレント78ノード ・ アクティブスキル31種', '刃舞 ・ 鉄壁 ・ 影襲 ・ 狂血 ・ 魂術 ・ 首狩り', 'おすすめビルド6種をワンクリックで割り振り。自由な混成もOK', 'スキルバー 1–0 / Shift+1–0、Tでパネル、Qで回避、Eで処刑'],
  'r_sch': [('刃舞','会心・コンボ・パリィ','#ffd27a'),('鉄壁','軽減・反射・制圧','#8fd0ff'),('影襲','回避・背刺し・毒と出血','#b59cff'),('狂血','吸血・瀕死爆発・突進','#ff6a6a'),('魂術','術・制圧・魂力','#6fe6ff'),('首狩り','処刑・賞金・報酬','#ffe070')],
  'r_b': 'おすすめビルド', 'r_bn': ['会心剣聖','不死の要塞','魂炎の術師','毒影の刺客','血戦士','斬首官'],
  's_h': '精霊の仲間', 's_p': ['洞窟にはQ版の小さな精霊たちが暮らし、それぞれ性格と望みがある', '話しかけたり、あなたの首級を評価してもらったりできる', '最初はゴブリンのスニックだけ——ほかは自分で呼び寄せる', '完全に任意：Yパネルでいつでもオン／オフ'],
 },
 'en': {
  'font': '"Noto Serif CJK SC","Noto Serif",Georgia,serif', 'sans': '"Noto Sans CJK SC","Noto Sans",sans-serif', 'lang': 'en',
  'title': 'Soulhead Cave', 'sub': '魂首窟', 'tag': "The Ogre's Collection · Hunt · Grow · Hold Your Cave",
  'k1': ['First-person dark-fantasy looter brawler', 'Locations and encounters remixed every run', 'Decapitate, handle and collect every head'],
  'foot': 'Soulhead Cave — just open index.html to play (中文 / 日本語 / English)',
  'w_h': 'The World', 'w_p': ["You are Grok, a cursed ogre. The curse craves soul crystals — and they only pour out when you take a head.", "The land is carved among nine regional overlords: the Wheat Witch, the Queen of Green Shadows, the Fang-Cleaver Chieftain… each overlord's head is a legendary trophy.", "Carry your spoils home to Soulhead Cave, set heads in the stone niches, train, forge and expand — until the cave becomes your gallery."],
  'w_n': ['Matilda, the Wheat Witch','Heatheria, Queen of Green Shadows','Garsa, the Fang-Cleaver Chieftain','Seraphina, the Silver Saintess','Morgana, Mother of the Black Marsh','Brunhilde, the Ironhelm Marshal','Isabella, the Gold-Crowned Queen','Lilith, Queen of the Abyss','Aurelia, the Dragonbone Madonna'],
  'w_t': 'Nine regional overlords',
  'g_h': 'How it plays', 'g_s': [('Leave the cave','Every location is remixed. Read the encounter, then fight or retreat.'),('Hunt','Drop foes with committed slashes, thrusts and directional blocks — then take the head.'),('Run the cave','Display heads, train, forge and build until the cave becomes your throne.'),('Grow & companions','Talent trees, skills and optional chibi spirits help you grow the collection.')],
  'c_h': 'Combat', 'c_p': ['Swing the mouse for committed slashes, click to thrust, hold right mouse to block by direction, Q to dodge', 'Perfect blocks / dodges leave enemies an “Opening” — press E to execute', 'Stamina, wind-up, reach, hit-zone multipliers… detailed weapon stats at a glance', 'Seven weapon types that feel different; overlords and elites are never one-shot', 'Enemies have roles, flank and retreat — never stand around'],
  'c_cap': 'The in-game “Weapon Details” panel (real UI)',
  'r_h': 'Growth', 'r_p': ['5 attributes · 6 schools · 78 talent nodes · 31 active skills', 'Bladedance · Iron Wall · Shadow Strike · Bloodrage · Soulcraft · Headhunter', '6 recommended builds in one click — or mix freely', 'Hotbar 1–0 / Shift+1–0, T opens the panel, Q dodges, E executes'],
  'r_sch': [('Bladedance','Crit · Combo · Parry','#ffd27a'),('Iron Wall','Mitigation · Thorns · Control','#8fd0ff'),('Shadow Strike','Evasion · Backstab · Poison & Bleed','#b59cff'),('Bloodrage','Lifesteal · Low-HP Burst · Charge','#ff6a6a'),('Soulcraft','Spells · Control · Soul Energy','#6fe6ff'),('Headhunter','Execute · Bounty · Rewards','#ffe070')],
  'r_b': 'Recommended builds', 'r_bn': ['Crit Sword Saint','Undying Fortress','Soulflame Mage','Venom Shade Assassin','Blood Warrior','Executioner'],
  's_h': 'Spirit Companions', 's_p': ['Tiny chibi spirits live in the cave, each with its own personality and needs', 'Chat with them, and ask them to appraise your heads', 'You start with only Snik the goblin — the rest you must call', 'Fully optional: toggle them any time in the Y panel'],
 },
}
REG = ['village', 'forest', 'wilds', 'abbey', 'swamp', 'fortress', 'capital', 'abyss', 'peak']
SP = ['chudai', 'awu', 'jinguan', 'laogu', 'liaoya', 'paopao', 'shengling', 'tiechui', 'wuyan', 'xiaozhu', 'yeye']

CSS = """
*{box-sizing:border-box;margin:0;padding:0}html,body{width:1920px;height:1080px;overflow:hidden;background:#0b0506;color:#f3e2bf}
body{font-family:var(--sans);position:relative}
.bg{position:absolute;inset:0;background-size:cover;background-position:center;filter:saturate(.7) brightness(.42)}
.vig{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 40%,rgba(58,15,18,.25) 0%,rgba(14,6,8,.78) 70%,#050203 100%)}
.wrap{position:absolute;inset:0;padding:70px 90px}
h1{font-family:var(--font);font-weight:700;letter-spacing:.12em;background:linear-gradient(#fff2c4,#d8a24a 60%,#8a5a1a);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 0 40px rgba(255,150,60,.2)}
h2{font-family:var(--font);font-size:84px;letter-spacing:.14em;color:#ffd27a;font-weight:700}
.rule{width:140px;height:4px;background:linear-gradient(90deg,#d8a24a,transparent);margin:14px 0 30px}
.foot{position:absolute;left:0;right:0;bottom:26px;text-align:center;font-size:20px;color:#b79a6a;letter-spacing:.06em}
.card{background:linear-gradient(180deg,rgba(60,38,26,.88),rgba(22,12,10,.92));border:1px solid #8c7148;border-radius:14px}
p{line-height:1.55}
.sp{mix-blend-mode:screen;-webkit-mask-image:radial-gradient(circle,#000 58%,transparent 74%);mask-image:radial-gradient(circle,#000 58%,transparent 74%)}
"""

def page(lang, n, body, bg=None):
    t = T[lang]
    bgs = f'<div class="bg" data-reg="{bg}"></div>' if bg else ''
    return f"""<!doctype html><html lang="{t['lang']}"><head><meta charset="utf-8"><style>:root{{--font:{t['font']};--sans:{t['sans']}}}{CSS}</style></head><body>{bgs}<div class="vig"></div>{body}
<script src="../../../js/spirit_art.js"></script><script src="../../../js/regionart.js"></script>
<script>document.querySelectorAll('[data-sp]').forEach(e=>e.src=SPIRIT_ART[e.dataset.sp]);document.querySelectorAll('[data-reg]').forEach(e=>{{if(e.tagName=='IMG')e.src=RegionArt[e.dataset.reg];else e.style.backgroundImage='url('+RegionArt[e.dataset.reg]+')'}});</script></body></html>"""

def s1(l):
    t = T[l]
    sp = ''.join(f'<img class="sp" data-sp="{k}" style="width:150px;height:150px;object-fit:contain;margin:0 -6px;opacity:.95">' for k in ['xiaozhu', 'chudai', 'jinguan', 'shengling', 'liaoya', 'yeye', 'paopao', 'wuyan'])
    big = 210 if l != 'en' else 150
    return page(l, 1, f"""<div class="wrap" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
<div style="font-size:26px;letter-spacing:.5em;color:#c9a773;margin-bottom:10px">{t['sub'] if l!='en' else t['sub']}</div>
<h1 style="font-size:{big}px;line-height:1.1">{t['title']}</h1>
<div style="font-size:38px;color:#ead3a2;margin:26px 0 46px;letter-spacing:.08em;font-family:var(--font)">{t['tag']}</div>
<div style="display:flex;gap:26px">{''.join(f'<div class="card" style="padding:18px 28px;font-size:26px;color:#ffe3a8">{x}</div>' for x in t['k1'])}</div>
<div style="display:flex;margin-top:54px;align-items:flex-end">{sp}</div></div><div class="foot">{t['foot']}</div>""", 'abyss')

def s2(l):
    t = T[l]
    strip = ''.join(f'<div style="flex:1;position:relative;height:250px;border:1px solid #6a5434;overflow:hidden"><img data-reg="{r}" style="width:100%;height:100%;object-fit:cover;filter:saturate(.85) brightness(.75)"><div style="position:absolute;left:0;right:0;bottom:0;padding:26px 8px 8px;background:linear-gradient(transparent,rgba(8,3,4,.92));font-size:{18 if l!="en" else 16}px;text-align:center;color:#ffe3a8;line-height:1.25">{n}</div></div>' for r, n in zip(REG, t['w_n']))
    return page(l, 2, f"""<div class="wrap"><h2>{t['w_h']}</h2><div class="rule"></div>
<div style="width:1250px;font-size:31px;color:#ead8b2;display:flex;flex-direction:column;gap:22px">{''.join(f'<p>{x}</p>' for x in t['w_p'])}</div>
<div style="position:absolute;left:90px;right:90px;bottom:76px"><div style="font-size:24px;letter-spacing:.2em;color:#c9a773;margin-bottom:12px">{t['w_t']}</div><div style="display:flex;gap:6px">{strip}</div></div></div>
<img class="sp" data-sp="laogu" style="position:absolute;right:70px;top:70px;width:380px;opacity:.95"><div class="foot">{t['foot']}</div>""", 'peak')

def s3(l):
    t = T[l]; imgs = ['village', 'forest', 'fortress', 'abbey']; cols = ''
    for i, ((h, d), r) in enumerate(zip(t['g_s'], imgs)):
        cols += f"""<div class="card" style="width:404px;height:560px;position:relative;overflow:hidden"><img data-reg="{r}" style="width:100%;height:230px;object-fit:cover;filter:saturate(.8) brightness(.7)">
<div style="position:absolute;left:22px;top:190px;width:76px;height:76px;border-radius:50%;background:#7a1616;border:3px solid #ffd27a;font:700 44px var(--font);text-align:center;line-height:70px;color:#fff2c4">{i+1}</div>
<div style="padding:70px 28px 0"><div style="font:700 40px var(--font);color:#ffd27a;margin-bottom:16px">{h}</div><p style="font-size:26px;color:#ead8b2">{d}</p></div></div>"""
        if i < 3: cols += '<div style="align-self:center;font-size:54px;color:#d8a24a">▶</div>'
    return page(l, 3, f"""<div class="wrap"><h2>{t['g_h']}</h2><div class="rule"></div><div style="display:flex;gap:14px;margin-top:40px;justify-content:space-between">{cols}</div></div><div class="foot">{t['foot']}</div>""", 'wilds')

def s4(l):
    t = T[l]
    return page(l, 4, f"""<div class="wrap"><h2>{t['c_h']}</h2><div class="rule"></div>
<div style="display:flex;gap:50px"><div style="width:700px;font-size:29px;color:#ead8b2;display:flex;flex-direction:column;gap:22px">{''.join(f'<div style="display:flex;gap:16px"><span style="color:#d8a24a">◆</span><p>{x}</p></div>' for x in t['c_p'])}</div>
<div style="flex:1"><img src="../cap/wpn_{l}.png" style="width:1000px;border-radius:12px;border:1px solid #8c7148;box-shadow:0 10px 50px rgba(0,0,0,.6)"><div style="font-size:20px;color:#b79a6a;margin-top:12px;text-align:right">{t['c_cap']}</div></div></div></div><div class="foot">{t['foot']}</div>""", 'fortress')

def s5(l):
    t = T[l]
    sch = ''.join(f'<div class="card" style="padding:18px 24px;border-left:8px solid {c};width:540px"><div style="font:700 36px var(--font);color:{c}">{n}</div><div style="font-size:21px;color:#cdb98f;margin-top:6px">{d}</div></div>' for n, d, c in t['r_sch'])
    bl = ''.join(f'<span class="card" style="padding:8px 18px;font-size:22px;color:#ffe3a8;border-radius:999px">{b}</span>' for b in t['r_bn'])
    an = {'zh': ['力量', '体魄', '敏捷', '凶威', '魂力'], 'ja': ['筋力', '体魄', '敏捷', '凶威', '魂力'], 'en': ['Strength', 'Vitality', 'Agility', 'Ferocity', 'Spirit']}[l]
    ATT = ''.join(f'<div class="card" style="flex:1;padding:22px 10px;text-align:center;font:700 34px var(--font);color:#ffe3a8">{x}</div>' for x in an)
    return page(l, 5, f"""<div class="wrap"><h2>{t['r_h']}</h2><div class="rule"></div>
<div style="display:flex;gap:70px"><div style="display:grid;grid-template-columns:540px 540px;gap:18px">{sch}</div>
<div style="width:600px;font-size:27px;color:#ead8b2;display:flex;flex-direction:column;gap:20px">{''.join(f'<div style="display:flex;gap:14px"><span style="color:#d8a24a">◆</span><p>{x}</p></div>' for x in t['r_p'])}</div></div>
<div style="position:absolute;left:90px;right:90px;bottom:250px;display:flex;gap:18px">{ATT}</div>
<div style="position:absolute;left:90px;right:90px;bottom:80px"><div style="font-size:22px;letter-spacing:.2em;color:#c9a773;margin-bottom:12px">{t['r_b']}</div><div style="display:flex;gap:14px;flex-wrap:wrap">{bl}</div></div></div><div class="foot">{t['foot']}</div>""", 'capital')

def s6(l):
    t = T[l]
    row = ''.join(f'<img class="sp" data-sp="{k}" style="width:{w}px;height:{w}px;object-fit:contain">' for k, w in zip(SP[:9], [200] * 9))
    return page(l, 6, f"""<div class="wrap"><h2>{t['s_h']}</h2><div class="rule"></div>
<div style="width:1500px;font-size:31px;color:#ead8b2;display:flex;flex-direction:column;gap:18px">{''.join(f'<div style="display:flex;gap:16px"><span style="color:#d8a24a">◆</span><p>{x}</p></div>' for x in t['s_p'])}</div>
<div style="position:absolute;left:0;right:0;bottom:70px;display:flex;justify-content:center">{row}</div></div><div class="foot">{t['foot']}</div>""", 'swamp')

NAMES = [('01_key', s1), ('02_world', s2), ('03_loop', s3), ('04_combat', s4), ('05_growth', s5), ('06_spirits', s6)]
if __name__ == '__main__':
    langs = sys.argv[1:] or ['zh', 'ja', 'en']
    os.makedirs(os.path.join(ROOT, 'tools', 'promo', '_tmp'), exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1920, 'height': 1080})
        for l in langs:
            os.makedirs(os.path.join(ROOT, 'promo', l), exist_ok=True)
            for nm, fn in NAMES:
                f = os.path.join(ROOT, 'tools', 'promo', '_tmp', f'{l}_{nm}.html')
                open(f, 'w', encoding='utf-8').write(fn(l))
                pg.goto(f'http://localhost:8080/tools/promo/_tmp/{l}_{nm}.html'); pg.wait_for_timeout(700)
                pg.screenshot(path=os.path.join(ROOT, 'promo', l, nm + '.png'), timeout=60000); print(l, nm, flush=True)
        b.close()
