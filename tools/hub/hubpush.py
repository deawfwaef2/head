#!/usr/bin/env python3
"""轮询 /tmp/vrm_out/manifest.jsonl：对新转换的模型做体型质检（头身比指标 eyeY/(eyeY-neckY) ≥ 9.8，排除幼态比例；VRoid 成年样本 10.8–11.1），
通过的头/身体用 git plumbing 直接提交到 origin/main（不碰工作区和主索引），再把文件从 /tmp/vrm_out 删掉。
用法: GIT_DIR=... python3 tools/hub/hubpush.py [batch=6]   （需要 gitsetup 已配置 origin）"""
import os, sys, json, re, subprocess, time
OUT = '/tmp/vrm_out'; GD = os.environ.get('GIT_DIR', '/home/user/.cache/headgit'); B = int(sys.argv[1]) if len(sys.argv) > 1 else 6
env = dict(os.environ, GIT_DIR=GD, GIT_WORK_TREE='/home/user/head', GIT_INDEX_FILE='/tmp/hub.idx')
def git(*a, inp=None):
    return subprocess.run(['git'] + list(a), env=env, capture_output=True, text=True, input=inp)
STATE = OUT + '/state.json'; st = json.load(open(STATE)) if os.path.exists(STATE) else {'seen': [], 'ok': [], 'bad': {}}
def eye(file):
    s = open('%s/big/body/%s.js' % (OUT, file), encoding='utf-8').read(3000)
    m = re.search(r'"eyeY": ([0-9.]+)', s); f = re.search(r'"foot": ([0-9.\-]+)', s)
    n = re.search(r'"neckY": ([0-9.\-]+)', s)
    if not (m and n): return 0
    ey = float(m.group(1)); return ey / max(0.05, ey - float(n.group(1)))  # 眼高/(眼-颈) ≈ 头身比指标：VRoid 成年 10.8–11.1，幼态/Q 版 <9.5
def push(files, msg):
    for attempt in range(4):
        git('fetch', '-q', 'origin', 'main'); git('read-tree', 'origin/main')
        for f in files:
            h = git('hash-object', '-w', '--no-filters', OUT + '/' + f).stdout.strip()
            git('update-index', '--add', '--cacheinfo', '100644,%s,%s' % (h, f))
        t = git('write-tree').stdout.strip(); c = git('commit-tree', t, '-p', 'origin/main', '-m', msg).stdout.strip()
        r = git('push', 'origin', c + ':refs/heads/main')
        if r.returncode == 0: return True
        print('push retry', r.stderr[-120:].replace('ghp_', '***'), flush=True); time.sleep(3)
    return False
pending = []
while True:
    lines = [json.loads(l) for l in open(OUT + '/manifest.jsonl')] if os.path.exists(OUT + '/manifest.jsonl') else []
    for m in lines:
        if 'file' not in m or m['file'] in st['seen']: continue
        st['seen'].append(m['file'])
        try: e = eye(m['file'])
        except Exception: e = 0
        m['eye'] = round(e, 3)
        if e < 9.8:
            st['bad'][m['file']] = e; print('QC-REJECT', m['file'], m['name'], round(e, 2), flush=True)
            for p in ('models', 'big/body'):
                fp = '%s/%s/%s.js' % (OUT, p, m['file'])
                if os.path.exists(fp): os.remove(fp)
        else: pending.append(m)
    done_flag = os.path.exists(os.environ.get('FLAG', OUT + '/PIPE_ALL_DONE'))
    if len(pending) >= B or (pending and done_flag):
        files = []; 
        for m in pending: files += ['models/%s.js' % m['file'], 'big/body/%s.js' % m['file']]
        if push(files, 'R53 VRoid Hub 授权全允许模型 +%d (头+身体): %s' % (len(pending), ' '.join(m['file'] for m in pending))):
            print('PUSHED', [m['file'] for m in pending], flush=True)
            for m in pending:
                st['ok'].append(dict(m)); 
                for f in ('models/%s.js' % m['file'], 'big/body/%s.js' % m['file']): os.remove(OUT + '/' + f)
            pending = []
        json.dump(st, open(STATE, 'w'), ensure_ascii=False)
    json.dump(st, open(STATE, 'w'), ensure_ascii=False)
    if done_flag and not pending: print('PUSH_ALL_DONE', flush=True); break
    time.sleep(20)
