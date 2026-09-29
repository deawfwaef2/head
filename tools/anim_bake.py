#!/usr/bin/env python3
"""UAL（Quaternius Universal Animation Library，CC0）→ big/anim/ual.js：人形骨骼“世界旋转增量”动画
用法: python3 tools/anim_bake.py UAL1_Standard.glb UAL2_Standard.glb [--probe]
每帧每根人形骨骼存 q_delta = q_world(t) · q_world(Tpose)^-1（统一到 +Z 朝前、+Y 向上），胯部位移按胯高归一。
运行时 js/foe.js 按各身体自己的静止姿势换算成局部旋转（重定向），所以任何 VRM 身体都能用同一套动作。"""
import sys, json, struct, math, base64, os
import numpy as np
MAP = {'pelvis': 'hips', 'spine_01': 'spine', 'spine_02': 'chest', 'spine_03': 'upperChest', 'neck_01': 'neck', 'Head': 'head'}
for s, S in (('l', 'left'), ('r', 'right')):
    MAP.update({f'clavicle_{s}': f'{S}Shoulder', f'upperarm_{s}': f'{S}UpperArm', f'lowerarm_{s}': f'{S}LowerArm', f'hand_{s}': f'{S}Hand',
                f'thigh_{s}': f'{S}UpperLeg', f'calf_{s}': f'{S}LowerLeg', f'foot_{s}': f'{S}Foot', f'ball_{s}': f'{S}Toes'})
    for f, F in (('thumb', 'Thumb'), ('index', 'Index'), ('middle', 'Middle'), ('ring', 'Ring'), ('pinky', 'Little')):
        for k, K in ((1, 'Proximal'), (2, 'Intermediate'), (3, 'Distal')): MAP[f'{f}_0{k}_{s}'] = f'{S}{F}{K}'
CT = {5126: np.float32, 5123: np.uint16, 5121: np.uint8, 5125: np.uint32}
NC = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
def load(f):
    raw = open(f, 'rb').read(); off = 12; J = B = None
    while off < len(raw):
        ln, ty = struct.unpack('<II', raw[off:off + 8]); ch = raw[off + 8:off + 8 + ln]
        if ty == 0x4E4F534A: J = json.loads(ch)
        elif ty == 0x004E4942: B = ch
        off += 8 + ln
    def acc(i):
        a = J['accessors'][i]; bv = J['bufferViews'][a['bufferView']]; n = NC[a['type']]
        return np.frombuffer(B, CT[a['componentType']], count=a['count'] * n, offset=bv.get('byteOffset', 0) + a.get('byteOffset', 0)).reshape(a['count'], n).astype(np.float64)
    return J, acc
def qmul(a, b):
    x1, y1, z1, w1 = np.moveaxis(a, -1, 0); x2, y2, z2, w2 = np.moveaxis(b, -1, 0)
    return np.stack([w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2, w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2, w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2, w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2], -1)
def qinv(q): return q * np.array([-1, -1, -1, 1.0])
def qrot(q, v):
    u = q[..., :3]; w = q[..., 3:4]; t = 2 * np.cross(u, v); return v + w * t + np.cross(u, t)
def slerp(a, b, t):
    d = (a * b).sum(-1, keepdims=True); b = np.where(d < 0, -b, b); d = np.abs(d)
    r = a * (1 - t) + b * t; return r / np.linalg.norm(r, axis=-1, keepdims=True)
def sample(J, acc, anim, times):
    """返回 每个节点 (T, 4) 旋转、(T, 3) 位移（未动画的用静止值）"""
    N = J['nodes']; R = {i: np.tile(np.array(n.get('rotation', [0, 0, 0, 1.0])), (len(times), 1)) for i, n in enumerate(N)}
    P = {i: np.tile(np.array(n.get('translation', [0, 0, 0.0])), (len(times), 1)) for i, n in enumerate(N)}
    Sc = {i: np.array(n.get('scale', [1, 1, 1.0])) for i, n in enumerate(N)}
    for ch in anim['channels']:
        s = anim['samplers'][ch['sampler']]; t = acc(s['input'])[:, 0]; v = acc(s['output']); node = ch['target']['node']; path = ch['target']['path']
        if path not in ('rotation', 'translation'): continue
        k = np.clip(np.searchsorted(t, times) - 1, 0, len(t) - 1); k2 = np.minimum(k + 1, len(t) - 1)
        dt = np.where(t[k2] > t[k], t[k2] - t[k], 1); f = np.clip((times - t[k]) / dt, 0, 1)[:, None]
        if path == 'rotation': R[node] = slerp(v[k], v[k2], f)
        else: P[node] = v[k] * (1 - f) + v[k2] * f
    return R, P, Sc
def world(J, R, P, Sc):
    N = J['nodes']; parent = {c: i for i, n in enumerate(N) for c in n.get('children', [])}
    WR, WP, WS = {}, {}, {}
    def go(i):
        if i in WR: return
        if i in parent:
            p = parent[i]; go(p); WR[i] = qmul(WR[p], R[i]); WP[i] = WP[p] + qrot(WR[p], P[i] * WS[p]); WS[i] = WS[p] * Sc[i]
        else: WR[i] = R[i]; WP[i] = P[i]; WS[i] = Sc[i]
    for i in range(len(N)): go(i)
    return WR, WP
if __name__ == '__main__':
    files = [a for a in sys.argv[1:] if not a.startswith('--')]; probe = '--probe' in sys.argv
    J, acc = load(files[0]); N = J['nodes']; idx = {n.get('name'): i for i, n in enumerate(N)}
    tp = next(a for a in J['animations'] if a['name'] == 'A_TPose')
    R, P, Sc = sample(J, acc, tp, np.array([0.0])); WR, WP = world(J, R, P, Sc)
    for b in ('pelvis', 'Head', 'hand_l', 'upperarm_l', 'lowerarm_l', 'foot_l', 'ball_l'): print(b, np.round(WP[idx[b]][0], 3))

KEEP = ['Idle_Loop', 'Idle_Talking_Loop', 'Walk_Loop', 'Walk_Formal_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Crouch_Idle_Loop', 'Crouch_Fwd_Loop', 'Death01', 'Hit_Chest', 'Hit_Head', 'Roll',
        'Sword_Attack', 'Sword_Idle', 'Punch_Cross', 'Punch_Jab', 'Spell_Simple_Shoot', 'Spell_Simple_Idle_Loop', 'Interact', 'Idle_Torch_Loop', 'Sitting_Idle_Loop', 'Fixing_Kneeling', 'PickUp_Table',
        'Hit_Knockback', 'Idle_FoldArms_Loop', 'Idle_No_Loop', 'Idle_Lantern_Loop', 'Idle_Shield_Loop', 'Idle_Shield_Break', 'Melee_Hook', 'Melee_Hook_Rec', 'OverhandThrow', 'Shield_Dash', 'Shield_OneShot',
        'Sword_Block', 'Sword_Dash', 'Sword_Heavy_Combo', 'Sword_Regular_A', 'Sword_Regular_A_Rec', 'Sword_Regular_B', 'Sword_Regular_B_Rec', 'Sword_Regular_C', 'Sword_Regular_Combo', 'Yes', 'LayToIdle',
        'Farm_Harvest', 'TreeChopping_Loop', 'Chest_Open', 'Consume', 'Jump_Start', 'Jump_Land']
def bake(files, out, fps=30):
    bones = list(MAP.values()); clips = {}
    for f in files:
        J, acc = load(f); N = J['nodes']; idx = {n.get('name'): i for i, n in enumerate(N)}
        tp = next(a for a in J['animations'] if a['name'] == 'A_TPose')
        R, P, Sc = sample(J, acc, tp, np.array([0.0])); WR0, WP0 = world(J, R, P, Sc)
        hipH = WP0[idx['pelvis']][0][1]
        for an in J['animations']:
            if an['name'] not in KEEP or an['name'] in clips: continue
            dur = max(float(acc(s['input'])[-1, 0]) for s in an['samplers']); n = max(2, int(round(dur * fps)) + 1)
            times = np.linspace(0, dur, n); R, P, Sc = sample(J, acc, an, times); WR, WP = world(J, R, P, Sc)
            q = np.zeros((n, len(bones), 4))
            for bi, (src, dst) in enumerate(MAP.items()):
                d = qmul(WR[idx[src]], qinv(WR0[idx[src]][0])); d = d * np.where(d[:, 3:4] < 0, -1, 1); q[:, bi] = d
            hp = WP[idx['pelvis']] / hipH
            clips[an['name']] = {'fps': fps, 'n': n, 'dur': round(dur, 4),
                                 'q': base64.b64encode(np.round(q * 32767).astype(np.int16).tobytes()).decode(),
                                 'hp': base64.b64encode(np.round(hp * 10000).astype(np.int16).tobytes()).decode()}
            print(an['name'], n, 'frames', round(dur, 2), 's')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w') as fh: fh.write('window.UAL_ANIM=' + json.dumps({'bones': bones, 'src': 'Quaternius Universal Animation Library 1+2 (CC0)', 'clips': clips}) + ';\n')
    print('clips', len(clips), 'bytes', os.path.getsize(out))
if __name__ == '__main__' and '--probe' not in sys.argv:
    bake([a for a in sys.argv[1:] if not a.startswith('--')], os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'big', 'anim', 'ual.js'))
