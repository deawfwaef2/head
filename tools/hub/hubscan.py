#!/usr/bin/env python3
"""VRoid Hub 公开 API（无需登录）扫描：按关键词列出「可下载 + 授权三项全允许 + 非R18」的候选模型，只读元数据，不下载。
用法: python3 tools/hub/hubscan.py out.json 关键词1 关键词2 ...   （下载仍需用户自己登录 pixiv）"""
import sys, json, time, urllib.request, urllib.parse
H = {'User-Agent': 'Mozilla/5.0', 'X-Api-Version': '11'}
def get(u):
    for i in range(3):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(u, headers=H), timeout=30))
        except Exception as e: time.sleep(1.5)
    return None
def ok(v):
    m = v.get('vrm_meta') or {}
    if 'allowExcessivelyViolentUsage' in m:  # VRM1
        return bool(m.get('allowExcessivelyViolentUsage') and m.get('allowRedistribution') and m.get('modification') in ('allowModification', 'allowModificationRedistribution')), m
    # VRM0：条件写在 otherPermissionUrl / otherLicenseUrl 的查询串里（与 tools/vrm2head.py 的授权检查一致）
    u = m.get('otherPermissionUrl') or m.get('otherLicenseUrl') or ''; lic = m.get('licenseName') or ''
    g = m.get('violentUssageName') == 'Allow' and (lic.startswith('CC0') or lic.startswith('CC_BY') or ('redistribution=allow' in u and 'modification=allow' in u)) and 'allowed_to_use_user=everyone' in (u or 'allowed_to_use_user=everyone')
    return bool(g), m
out = {}
for kw in sys.argv[2:]:
    nxt = '/api/search/character_models?' + urllib.parse.urlencode({'keyword': kw, 'is_downloadable': 'true', 'count': 50})
    for page in range(8):
        d = get('https://hub.vroid.com' + nxt)
        if not d or not d.get('data'): break
        nxt = (d.get('_links') or {}).get('next', {}).get('href')
        for m in d['data']:
            v = m.get('latest_character_model_version') or {}
            if m['age_limit']['is_r18'] or m['age_limit']['is_r15'] or m.get('is_private'): continue
            g, meta = ok(v)
            if not g: continue
            out[m['id']] = dict(id=m['id'], char=m['character']['name'], author=m['character']['user']['name'], hearts=m['heart_count'], dl=m['download_count'], tri=v.get('triangle_count'), spec=v.get('spec_version'), size=v.get('original_file_size'), kw=kw, img=m['portrait_image']['w300']['url'], url='https://hub.vroid.com/en/characters/%s/models/%s' % (m['character']['id'], m['id']), booth=[b.get('url') for b in m.get('character_model_booth_items', [])], credit=meta.get('creditNotation'), com=meta.get('commercialUsage') or meta.get('commercialUssageName'), tags=[t['name'] for t in m.get('tags', [])][:8])
        if not nxt: break
json.dump(sorted(out.values(), key=lambda x: -x['hearts']), open(sys.argv[1], 'w'), ensure_ascii=False, indent=1)
print(len(out), 'candidates')
