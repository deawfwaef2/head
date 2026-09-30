#!/usr/bin/env python3
"""通用 headless 测试：python3 tools/test/run.py <page> <script.js> [wait_s] —— 页面错误打印 + 脚本 evaluate 结果。
环境: PLAYWRIGHT_BROWSERS_PATH=/var/work/pw; 需要 python -m http.server 8080 在仓库根目录。"""
import sys, time, json
from playwright.sync_api import sync_playwright
page = sys.argv[1]; script = open(sys.argv[2]).read() if len(sys.argv) > 2 else ''; wait = float(sys.argv[3]) if len(sys.argv) > 3 else 20
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--js-flags=--max-old-space-size=1200"])
    pg = b.new_page(viewport={'width': 960, 'height': 540})
    pg.add_init_script("Element.prototype.requestPointerLock=undefined;Object.defineProperty(document,'pointerLockElement',{get(){return document.body}});")
    errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:300]))
    pg.on('console', lambda m: (m.type in ('error',) and errs.append('CONSOLE ' + m.text[:300])) or (m.text.startswith('T:') and print(m.text[:400])))
    pg.goto('http://localhost:8080/' + page, wait_until='load', timeout=120000)
    t0 = time.time()
    pg.wait_for_timeout(int(wait * 1000))
    if script:
        try: r = pg.evaluate(script); print('RESULT', json.dumps(r, ensure_ascii=False)[:3000])
        except Exception as e: print('EVALERR', str(e)[:600])
    for e in errs[:20]: print(e)
    if len(sys.argv) > 4: pg.screenshot(path=sys.argv[4])
    b.close()
