#!/usr/bin/env python3
"""VRoid Hub 批量：下载(需已登录的 storage_state) → vrm2head+glbsimp+glbpack → vrm2body → 删除原始 .vrm。
用法: PYTHONPATH=~/.cache/pylib python3 tools/hub/hubpipe.py ids.txt [outdir=/tmp/vrm_out]
ids.txt 每行: <character_id> <model_id>   输出: outdir/models/VH_<id6>.js, outdir/big/body/VH_<id6>.js, outdir/manifest.jsonl
下载走用户本人登录的会话 + 页面上的「按使用条件使用」确认（只用于已核对授权全允许的模型）。"""
import sys, os, re, json, time, subprocess, urllib.request
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ids = [l.split() for l in open(sys.argv[1]) if l.strip()]
OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/vrm_out'
os.makedirs(OUT + '/models', exist_ok=True); os.makedirs(OUT + '/big/body', exist_ok=True); os.makedirs('/tmp/vrm', exist_ok=True)
done = set()
if os.path.exists(OUT + '/manifest.jsonl'): done = {json.loads(l)['mid'] for l in open(OUT + '/manifest.jsonl')}
def info(mid):
    r = urllib.request.Request('https://hub.vroid.com/api/character_models/%s' % mid, headers={'User-Agent': 'Mozilla/5.0', 'X-Api-Version': '11'})
    d = json.load(urllib.request.urlopen(r, timeout=30))['data']['character_model']
    return d
def lic_ok(d):
    m = (d.get('latest_character_model_version') or {}).get('vrm_meta') or {}
    if 'allowExcessivelyViolentUsage' in m:
        return bool(m.get('allowExcessivelyViolentUsage') and m.get('allowRedistribution') and m.get('modification') in ('allowModification', 'allowModificationRedistribution'))
    u = m.get('otherPermissionUrl') or m.get('otherLicenseUrl') or ''; lic = m.get('licenseName') or ''
    return m.get('violentUssageName') == 'Allow' and (lic.startswith('CC0') or lic.startswith('CC_BY') or ('redistribution=allow' in u and 'modification=allow' in u)) and 'allowed_to_use_user=everyone' in (u or 'allowed_to_use_user=everyone')
def run(cmd):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, env=dict(os.environ, PYTHONPATH='/home/user/.cache/pylib'))
    return r.returncode, (r.stdout + r.stderr)[-300:]
with sync_playwright() as p:
    b = p.chromium.launch(); c = b.new_context(storage_state='/home/user/pxstate2.json', locale='en-US', viewport={'width': 1100, 'height': 1000}, accept_downloads=True)
    for cid, mid in ids:
        if mid in done: continue
        fid = 'VH_' + mid[-6:]; src = '/tmp/vrm/%s.vrm' % mid; t0 = time.time()
        try:
            d = info(mid)
            if not lic_ok(d): print('LICENSE-SKIP', mid, flush=True); open(OUT + '/manifest.jsonl', 'a').write(json.dumps(dict(mid=mid, skip='license')) + '\n'); continue
            name = d['character']['name']; author = d['character']['user']['name']
            if not os.path.exists(src):
                pg = c.new_page(); pg.set_default_timeout(60000)
                pg.goto('https://hub.vroid.com/en/characters/%s/models/%s' % (cid, mid), wait_until='domcontentloaded'); time.sleep(7)
                pg.evaluate("[...document.querySelectorAll('div,button')].filter(e=>e.textContent.trim()==='Use this model').pop().click()"); time.sleep(3)
                pg.get_by_text('I will use this model data').click(); time.sleep(1)
                with pg.expect_download(timeout=150000) as dl: pg.get_by_text('Download', exact=True).last.click()
                dl.value.save_as(src); pg.close()
            credit = '%s (VRoid Hub; 暴力/改造/再分发 允许)' % author
            hp = '%s/models/%s.js' % (OUT, fid); bp = '%s/big/body/%s.js' % (OUT, fid)
            rc, o = run(['python3', 'tools/vrm2head.py', src, fid, name, credit, '--out', hp]); 
            if rc: raise Exception('head: ' + o)
            run(['python3', 'tools/glbsimp.py', hp]); run(['python3', 'tools/glbpack.py', hp])
            rc, o = run(['python3', 'tools/vrm2body.py', src, fid, name, credit, '--tex', '768', '--out', bp])
            if rc: raise Exception('body: ' + o)
            m = dict(mid=mid, cid=cid, file=fid, name=name, author=author, hearts=d['heart_count'], tags=[t['name'] for t in d.get('tags', [])][:6], head_kb=os.path.getsize(hp) // 1024, body_kb=os.path.getsize(bp) // 1024, sec=int(time.time() - t0))
            open(OUT + '/manifest.jsonl', 'a').write(json.dumps(m, ensure_ascii=False) + '\n'); print('OK', fid, name, m['head_kb'], m['body_kb'], m['sec'], flush=True)
        except Exception as e:
            print('FAIL', mid, str(e)[:250].replace('\n', ' '), flush=True)
        finally:
            if os.path.exists(src): os.remove(src)
    b.close(); print('PIPE_DONE', flush=True)
