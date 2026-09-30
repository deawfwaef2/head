#!/usr/bin/env python3
"""分步驱动测试：python3 tools/test/drive.py <page> <steps.json>；steps = [["eval","js",timeout_s],["wait",s],["shot",path]]。
每步结果打印到 stdout（带 T+ 时间）。页面崩溃/超时会报出来而不是卡住。需 PLAYWRIGHT_BROWSERS_PATH=/var/work/pw。"""
import sys, time, json
from playwright.sync_api import sync_playwright
page = sys.argv[1]; steps = json.load(open(sys.argv[2]))
T0 = time.time()
def log(*a): print('T+%03d' % (time.time() - T0), *a, flush=True)
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--js-flags=--max-old-space-size=1400"])
    pg = b.new_page(viewport={'width': int(__import__('os').environ.get('VW', 800)), 'height': int(__import__('os').environ.get('VH', 450))})
    pg.add_init_script("Element.prototype.requestPointerLock=undefined;")
    pg.on('pageerror', lambda e: log('PAGEERR', str(e)[:300]))
    pg.on('crash', lambda: log('PAGE CRASHED'))
    pg.on('console', lambda m: (m.type == 'error' and log('CONSOLE.ERR', m.text[:250])) or (m.text.startswith('T:') and log(m.text[:500])))
    pg.goto('http://localhost:8080/' + page, wait_until='load', timeout=180000); log('loaded')
    for st in steps:
        try:
            if st[0] == 'wait': pg.wait_for_timeout(int(st[1] * 1000)); log('waited', st[1])
            elif st[0] == 'shot': pg.screenshot(path=st[1], timeout=60000); log('shot', st[1])
            elif st[0] == 'eval':
                pg.set_default_timeout(int((st[2] if len(st) > 2 else 60) * 1000))
                r = pg.evaluate(st[1]); log('EVAL', json.dumps(r, ensure_ascii=False)[:2500])
        except Exception as e: log('STEPERR', str(e)[:300])
    b.close()
