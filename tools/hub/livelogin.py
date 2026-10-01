#!/usr/bin/env python3
"""用户亲手登录 VRoid Hub 的“实时页面”（端口 8081）：无头浏览器的画面每秒刷新到网页里，用户自己点验证码、输邮箱验证码。
我（agent）不点验证码、不用自动解题。登录成功后把会话保存到 /home/user/pxstate2.json（含 cookie，绝不提交，用完删除）。
用法：PYTHONPATH=... PLAYWRIGHT_BROWSERS_PATH=... python3 tools/hub/livelogin.py [邮箱]"""
import json, os, queue, sys, threading, time, http.server, socketserver, urllib.parse
from playwright.sync_api import sync_playwright
EMAIL = sys.argv[1] if len(sys.argv) > 1 else ''
Q = queue.Queue(); W, H = 900, 1000
HTML = f'''<!doctype html><meta charset=utf-8><title>VRoid Hub 登录（你来点）</title>
<body style="margin:0;background:#111;color:#eee;font:14px sans-serif">
<div style="padding:8px;background:#222">在下面的画面里直接点（验证码、按钮都由你点）。输入文字：<input id=t size=30> <button onclick="send('type',document.getElementById('t').value)">输入</button>
<button onclick="send('key','Enter')">回车</button> <button onclick="send('key','Backspace')">退格</button> <button onclick="send('login','')">点“登录”按钮</button> <button onclick="send('go','https://hub.vroid.com/en')">回到 Hub 首页</button>
<span id=s style="margin-left:12px;color:#8f8"></span></div>
<img id=i style="cursor:crosshair;display:block" width={W} height={H}>
<script>
const im=document.getElementById('i');
function send(k,v){{fetch('/cmd?k='+k+'&v='+encodeURIComponent(v))}}
im.onwheel=e=>{{e.preventDefault();send('wheel',e.deltaY)}};
im.onclick=e=>{{const r=im.getBoundingClientRect();send('click',Math.round((e.clientX-r.left)*{W}/r.width)+','+Math.round((e.clientY-r.top)*{H}/r.height))}};
setInterval(()=>{{im.src='/shot.png?'+Date.now();fetch('/status').then(r=>r.text()).then(t=>document.getElementById('s').textContent=t)}},900);
</script>'''
STATUS = ['启动中…']
import re
def clicklogin(pg):
    for fr in pg.frames:
        try:
            b = fr.get_by_role('button', name=re.compile(r'^\s*(log ?in|login|sign in|ログイン)\s*$', re.I)).first
            if b.count(): b.click(timeout=3000); return True
        except Exception: pass
    return False
clicked = [0]
class Hd(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        u = urllib.parse.urlparse(self.path); q = urllib.parse.parse_qs(u.query)
        if u.path == '/': b = HTML.encode(); t = 'text/html; charset=utf-8'
        elif u.path == '/shot.png':
            try: b = open('/tmp/live.png', 'rb').read()
            except Exception: b = b''
            t = 'image/png'
        elif u.path == '/status': b = STATUS[0].encode(); t = 'text/plain; charset=utf-8'
        elif u.path == '/cmd': Q.put((q['k'][0], q['v'][0])); b = b'ok'; t = 'text/plain'
        else: b = b''; t = 'text/plain'
        self.send_response(200); self.send_header('Content-Type', t); self.send_header('Cache-Control', 'no-store'); self.end_headers(); self.wfile.write(b)
class S(socketserver.ThreadingTCPServer): allow_reuse_address = True
threading.Thread(target=lambda: S(('0.0.0.0', 8081), Hd).serve_forever(), daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox']); c = b.new_context(viewport={'width': W, 'height': H}, locale='en-US'); pg = c.new_page()
    pg.goto('https://hub.vroid.com/en', timeout=60000); time.sleep(2)
    for t in ('Accept', 'OK', 'Agree'):
        try: pg.get_by_role('button', name=t).first.click(timeout=1500)
        except Exception: pass
    for t in ('Sign in with pixiv ID', 'Sign in'):
        try: pg.get_by_text(t, exact=False).first.click(timeout=3000, force=True); time.sleep(1.5)
        except Exception: pass
    if EMAIL:
        try: pg.wait_for_selector('input[type=text],input[type=email]', timeout=15000); pg.fill('input[type=text],input[type=email]', EMAIL)
        except Exception: pass
    last = 0; done = False
    while not done:
        try:
            while True:
                k, v = Q.get_nowait()
                if k == 'click': x, y = map(int, v.split(',')); pg.mouse.click(x, y)
                elif k == 'type': pg.keyboard.type(v, delay=40)
                elif k == 'key': pg.keyboard.press(v)
                elif k == 'wheel': pg.mouse.wheel(0, float(v))
                elif k == 'login': clicklogin(pg)
                elif k == 'go': pg.goto(v, timeout=60000)
        except queue.Empty: pass
        except Exception as e: STATUS[0] = '操作出错：' + str(e)[:60]
        if 'pixiv.net' in pg.url and time.time() - clicked[0] > 12:
            try:  # 用户亲手过了验证码（响应令牌非空）之后，按用户要求替他点“登录”按钮
                if pg.evaluate("[...document.querySelectorAll('textarea[name=g-recaptcha-response]')].some(t=>t.value.length>20)"):
                    clicked[0] = time.time(); clicklogin(pg)
            except Exception: pass
        if time.time() - last > 0.8:
            last = time.time()
            try: pg.screenshot(path='/tmp/live.png')
            except Exception: pass
            try:
                if 'hub.vroid.com' in pg.url:
                    r = c.request.get('https://hub.vroid.com/api/account', headers={'X-Api-Version': '11'})
                    if r.status == 200 and '"id"' in r.text():
                        c.storage_state(path='/home/user/pxstate2.json'); STATUS[0] = '登录成功，已保存'; done = True
                    else: STATUS[0] = '在 Hub 页面，尚未登录'
                else: STATUS[0] = '在 pixiv 登录页：' + pg.url[:50]
            except Exception as e: STATUS[0] = '检查中…'
        time.sleep(0.1)
    time.sleep(4); b.close()
print('LOGIN_OK')
