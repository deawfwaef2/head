#!/usr/bin/env node
// KayKit Character Animations（CC0，Kay Lousberg）→ assets/anim_kk.js：与 tools/anim_bake.py 同格式的“世界旋转增量”动画（人形骨骼，重定向到任意 VRM 身体）
// 用法：node tools/anim_bake_kk.js <Rig_Medium_CombatMelee.glb> [out=assets/anim_kk.js]
//       node tools/anim_bake_kk.js --validate <UAL2_Standard.glb> <ual.js 的 URL 或路径>   （用同一套代码重烘 UAL 的一个动作，和已有 big/anim/ual.js 逐帧对比，验证数学一致）
// 格式：每帧每根人形骨骼存 q_delta = q_world(t) · q_world(Tpose)^-1；hips 位置 = 世界位置 / 髋高（水平位移减去第 0 帧：攻击的前冲由 AI 的 lunge 负责，不让身体在原地“滑出去”再弹回来）。
// KayKit 的 Rig_Medium 没有 neck / upperChest / 肩 / 手指：这些骨骼不写入，运行时 foe.js clipsFor 对“没有数据的骨骼”按父骨骼跟随。
const fs = require('fs'), path = require('path');
function loadGLB(f) {
  const b = fs.readFileSync(f); let off = 12, J = null, B = null;
  while (off < b.length) { const len = b.readUInt32LE(off), ty = b.readUInt32LE(off + 4); const ch = b.subarray(off + 8, off + 8 + len); if (ty === 0x4E4F534A) J = JSON.parse(ch.toString('utf8')); else if (ty === 0x004E4942) B = ch; off += 8 + len; }
  const CT = { 5126: [Float32Array, 4], 5123: [Uint16Array, 2], 5121: [Uint8Array, 1], 5125: [Uint32Array, 4] }, NC = { SCALAR: 1, VEC3: 3, VEC4: 4 };
  const acc = i => { const a = J.accessors[i], bv = J.bufferViews[a.bufferView], n = NC[a.type], [T, sz] = CT[a.componentType]; const start = B.byteOffset + (bv.byteOffset || 0) + (a.byteOffset || 0); const ab = B.buffer.slice(start, start + a.count * n * sz); return { n, count: a.count, data: Array.from(new T(ab)) }; };
  return { J, acc };
}
const qmul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const qinv = q => [-q[0], -q[1], -q[2], q[3]];
const qrot = (q, v) => { const u = [q[0], q[1], q[2]], w = q[3]; const t = [2 * (u[1] * v[2] - u[2] * v[1]), 2 * (u[2] * v[0] - u[0] * v[2]), 2 * (u[0] * v[1] - u[1] * v[0])]; return [v[0] + w * t[0] + (u[1] * t[2] - u[2] * t[1]), v[1] + w * t[1] + (u[2] * t[0] - u[0] * t[2]), v[2] + w * t[2] + (u[0] * t[1] - u[1] * t[0])]; };
function slerp(a, b, t) { let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; if (d < 0) { b = b.map(x => -x); d = -d; } let r = a.map((x, i) => x * (1 - t) + b[i] * t); const l = Math.hypot(...r) || 1; return r.map(x => x / l); }
function sampleAt(G, anim, t) { // 返回每个节点的 {r:[x,y,z,w], p:[x,y,z]}
  const { J, acc } = G, N = J.nodes, R = N.map(n => n.rotation || [0, 0, 0, 1]), P = N.map(n => n.translation || [0, 0, 0]);
  for (const ch of anim.channels) {
    const path = ch.target.path; if (path !== 'rotation' && path !== 'translation') continue; const s = anim.samplers[ch.sampler]; const tin = (s._t || (s._t = acc(s.input).data)), vo = (s._v || (s._v = acc(s.output))), n = vo.n;
    let k = 0; while (k < tin.length - 1 && tin[k + 1] <= t) k++; const k2 = Math.min(k + 1, tin.length - 1), dt = tin[k2] - tin[k], f = dt > 1e-9 ? Math.min(1, Math.max(0, (t - tin[k]) / dt)) : 0;
    const v = i => vo.data.slice(i * n, i * n + n);
    if (path === 'rotation') R[ch.target.node] = slerp(v(k), v(k2), f); else { const a = v(k), b = v(k2); P[ch.target.node] = a.map((x, i) => x * (1 - f) + b[i] * f); }
  }
  return { R, P };
}
function worldOf(G, S) { // 世界旋转/位置
  const N = G.J.nodes, parent = {}; N.forEach((n, i) => (n.children || []).forEach(c => parent[c] = i)); const WR = [], WP = [], WS = [];
  const go = i => { if (WR[i]) return; if (i in parent) { const p = parent[i]; go(p); WR[i] = qmul(WR[p], S.R[i]); const sc = WS[p]; WP[i] = qrot(WR[p], S.P[i].map((x, k) => x * sc[k])).map((x, k) => x + WP[p][k]); WS[i] = WS[p].map((x, k) => x * (N[i].scale ? N[i].scale[k] : 1)); } else { WR[i] = S.R[i]; WP[i] = S.P[i]; WS[i] = N[i].scale || [1, 1, 1]; } };
  N.forEach((_, i) => go(i)); return { WR, WP };
}
const i16 = arr => { const u = new Int16Array(arr); return Buffer.from(u.buffer).toString('base64'); };
function bake(G, tposeName, MAP, keep, fps) {
  const { J } = G, idx = {}; J.nodes.forEach((n, i) => idx[n.name] = i);
  const tp = J.animations.find(a => a.name === tposeName); const W0 = worldOf(G, sampleAt(G, tp, 0)); const hip = Object.keys(MAP).find(k => MAP[k] === 'hips'); const hipH = W0.WP[idx[hip]][1];
  const bones = Object.values(MAP), clips = {};
  for (const an of J.animations) {
    if (keep && !keep.includes(an.name)) continue;
    let dur = 0; for (const s of an.samplers) { const t = G.acc(s.input).data; dur = Math.max(dur, t[t.length - 1]); } const n = Math.max(2, Math.round(dur * fps) + 1), q = [], hp = []; let h0 = null;
    for (let f = 0; f < n; f++) {
      const t = Math.min(dur, f / fps), W = worldOf(G, sampleAt(G, an, t));
      for (const src of Object.keys(MAP)) { let d = qmul(W.WR[idx[src]], qinv(W0.WR[idx[src]])); if (d[3] < 0) d = d.map(x => -x); q.push(...d.map(x => Math.round(x * 32767))); }
      const p = W.WP[idx[hip]].map(x => x / hipH); if (!h0) h0 = p; hp.push(Math.round((p[0] - h0[0]) * 10000), Math.round(p[1] * 10000), Math.round((p[2] - h0[2]) * 10000));
    }
    clips[an.name] = { fps, n, dur: +dur.toFixed(4), q: i16(q), hp: i16(hp) };
  }
  return { bones, clips };
}
const KK_MAP = { hips: 'hips', spine: 'spine', chest: 'chest', head: 'head' };
for (const s of ['l', 'r']) { const S = s === 'l' ? 'left' : 'right'; Object.assign(KK_MAP, { ['upperarm.' + s]: S + 'UpperArm', ['lowerarm.' + s]: S + 'LowerArm', ['hand.' + s]: S + 'Hand', ['upperleg.' + s]: S + 'UpperLeg', ['lowerleg.' + s]: S + 'LowerLeg', ['foot.' + s]: S + 'Foot', ['toes.' + s]: S + 'Toes' }); }
const KEEP = ['Melee_1H_Attack_Chop', 'Melee_1H_Attack_Jump_Chop', 'Melee_1H_Attack_Slice_Diagonal', 'Melee_1H_Attack_Slice_Horizontal', 'Melee_1H_Attack_Stab', 'Melee_2H_Attack_Chop', 'Melee_2H_Attack_Slice', 'Melee_2H_Attack_Spin', 'Melee_2H_Attack_Spinning', 'Melee_2H_Attack_Stab', 'Melee_Dualwield_Attack_Chop', 'Melee_Dualwield_Attack_Slice', 'Melee_Dualwield_Attack_Stab', 'Melee_Unarmed_Attack_Kick', 'Melee_Unarmed_Attack_Punch_A'];
if (process.argv[2] === '--validate') {
  (async () => {
    const G = loadGLB(process.argv[3]); const UMAP = { pelvis: 'hips', spine_01: 'spine', spine_02: 'chest', Head: 'head', upperarm_r: 'rightUpperArm', hand_r: 'rightHand', thigh_l: 'leftUpperLeg', foot_l: 'leftFoot' };
    const mine = bake(G, 'A_TPose', UMAP, ['Sword_Regular_A', 'Sword_Dash'], 30);
    const src = process.argv[4]; const txt = /^https?:/.test(src) ? await (await fetch(src)).text() : fs.readFileSync(src, 'utf8'); const ref = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1).replace(/^window\.UAL_ANIM=/, ''));
    const dec = b => { const buf = Buffer.from(b, 'base64'); return new Int16Array(buf.buffer, buf.byteOffset, buf.length / 2); };
    for (const name of Object.keys(mine.clips)) { const A = mine.clips[name], R = ref.clips[name]; const qa = dec(A.q), qr = dec(R.q), ha = dec(A.hp), hr = dec(R.hp); let mx = 0, hm = 0; for (let f = 0; f < Math.min(A.n, R.n); f++) for (let bi = 0; bi < mine.bones.length; bi++) { const rb = ref.bones.indexOf(mine.bones[bi]); let dot = 0; for (let k = 0; k < 4; k++) dot += qa[(f * mine.bones.length + bi) * 4 + k] * qr[(f * ref.bones.length + rb) * 4 + k] / 32767 / 32767; mx = Math.max(mx, Math.acos(Math.min(1, Math.abs(dot))) * 2 * 180 / Math.PI); } for (let f = 0; f < Math.min(A.n, R.n); f++) hm = Math.max(hm, Math.abs(ha[f * 3 + 1] - hr[f * 3 + 1]) / 10000); console.log(name, 'frames', A.n, R.n, 'maxRotErrDeg', mx.toFixed(3), 'maxHipYErr', hm.toFixed(4)); }
  })();
} else {
  const G = loadGLB(process.argv[2]), out = process.argv[3] || path.join(__dirname, '..', 'assets', 'anim_kk.js');
  const r = bake(G, 'T-Pose', KK_MAP, KEEP, 30);
  fs.writeFileSync(out, 'window.KK_ANIM=' + JSON.stringify({ bones: r.bones, src: 'KayKit Character Animations 1.1 (CC0, Kay Lousberg) Rig_Medium CombatMelee', clips: r.clips }) + ';\n');
  console.log('clips', Object.keys(r.clips).length, 'bytes', fs.statSync(out).size);
}
