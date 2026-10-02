// R55 MOD autopsy（默认开）· 3D 解剖台：靠近战场上的角色尸体 →「🔪 解剖」→ 进入解剖台界面。
//   · 尸体躺在台子上，可以真的移动、旋转它；在屏幕上拖出一条线，就沿着这条线所在的平面把身体切开（任意位置、任意角度）。
//   · 切下来的每一块都是独立实体（可继续切、移动、旋转），带走后可以随意摆放在洞穴里。
//   · 开尸时，若干「词条」随机分布在身体各处（手臂偏力量/戳击，腿偏敏捷/体魄，躯干偏体魄/胆魄/光环…）。
//     切下来的那一块带着落在它里面的词条——摆进洞里就有这些词条的效果。头部不分布词条。
//   · 衣着开关：「原衣 / 素麻衣」。注意：只是把衣服换成同形状的素麻布，不会脱成裸体（内容边界：无性内容）。
//   · 切面是素净的蜡色截面，没有血肉内脏细节。
//   模型：用尸体自己的身体模型，按当前材质/贴图把颜色烘到顶点上（块可以独立存进浏览器 IndexedDB，不依赖贴图）。
window.Autopsy = (() => {
  const T = THREE, V3 = T.Vector3, S = 18; // 顶点步长：pos3 nrm3 col3 colB3 uv2 tw1 cap2 reg1（tw=贴图权重：壳 1；截面 -1；骨截面 -2。cap=截面内的归一化坐标）
  const on = () => !window.Mods || Mods.on('autopsy') !== false;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), rnd = (a, b) => a + Math.random() * (b - a);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // ---------------------------------------------------------------- 词条
  const AFX = {
    str: { n: '蛮力之筋', ic: '💪', k: 'stat', s: 'str', b: 1.2, w: { arm: 3, hand: 1, torso: 1 } },
    con: { n: '不屈之骨', ic: '❤️', k: 'stat', s: 'con', b: 1.2, w: { leg: 3, torso: 3 } },
    agi: { n: '疾风之腱', ic: '💨', k: 'stat', s: 'agi', b: 1.2, w: { leg: 3, hand: 1, arm: 1 } },
    ter: { n: '胆魄之髓', ic: '👹', k: 'stat', s: 'ter', b: 1.0, w: { torso: 3, arm: 1 } },
    soul: { n: '魂脉', ic: '🔮', k: 'stat', s: 'soul', b: 1.0, w: { torso: 2, hand: 2, leg: 1 } },
    aura: { n: '聚魂之息', ic: '◎', k: 'aura', b: 0.06, w: { torso: 3, leg: 1 } },
    poke: { n: '刺骨', ic: '⚔️', k: 'poke', b: 0.1, w: { arm: 2, hand: 3 } },
    herb: { n: '采药人之手', ic: '🌿', k: 'tick', kind: 'herb', every: 55, b: 1, w: { hand: 3, arm: 1 } },
    dust: { n: '灰烬之血', ic: '✨', k: 'tick', kind: 'dust', every: 50, b: 1, w: { torso: 2, leg: 1, hand: 1 } },
    bone: { n: '骨粉', ic: '🦴', k: 'tick', kind: 'bone', every: 60, b: 1, w: { leg: 2, arm: 1 } },
    coin: { n: '贪婪之指', ic: '🪙', k: 'tick', kind: 'coin', every: 70, b: 1, w: { hand: 2, torso: 1 } }
  };
  const SN = { str: '力量', con: '体魄', agi: '敏捷', ter: '胆魄', soul: '魂力' };
  const TC = { stat: '#9fe0a0', aura: '#9ad0ff', poke: '#ffb090', tick: '#e8c8ff' };
  const gr = (og, setN) => (window.Organs ? Organs.grade(og, setN || 1) : 1);
  function effect(og, setN) { // Organs.effect 对 t:'piece' 的实现
    const g = gr(og, setN), e = {}; let au = 0, pk = 0;
    for (const a of og.aff || []) { const d = AFX[a.id]; if (!d) continue; const v = d.b * a.m * g;
      if (d.k === 'stat') { e.stat = e.stat || {}; e.stat[d.s] = Math.round(((e.stat[d.s] || 0) + v) * 10) / 10; }
      else if (d.k === 'aura') au += v; else if (d.k === 'poke') pk += v;
      else { const n = Math.max(1, Math.round(v)); if (!e.tick || (e.tick.kind === d.kind ? (e.tick.n += n, false) : n > e.tick.n)) e.tick = e.tick && e.tick.kind === d.kind ? e.tick : { every: d.every, kind: d.kind, n }; } }
    if (au) e.aura = { r: 3.2, m: +(1 + au).toFixed(3) }; if (pk) e.poke = { r: 3.5, m: +(1 + pk).toFixed(3) }; return e;
  }
  function affText(a, og) { const d = AFX[a.id], g = gr(og || { rar: 0, q: 0.6 }, 1), v = d.b * a.m * g; if (d.k === 'stat') return `${SN[d.s]} +${v.toFixed(1)}`; if (d.k === 'aura') return `光环 ×${(1 + v).toFixed(2)}`; if (d.k === 'poke') return `戳击 ×${(1 + v).toFixed(2)}`;
    const nm = d.kind === 'coin' ? '魂晶' : (window.Sack && Sack.IT[d.kind] ? Sack.IT[d.kind].n : d.kind); return `每${d.every}s ${nm}×${Math.max(1, Math.round(v))}`; }
  // ---------------------------------------------------------------- 部位
  // 布娃娃用的“关节组”：0 躯干(含颈/肩/头) 1,2 左右上臂 3,4 左右前臂+手 5,6 左右大腿 7,8 左右小腿 9,10 左右脚
  function rgOf(key) {
    const side = key.startsWith('left') ? 0 : key.startsWith('right') ? 1 : -1, k = key.replace(/^(left|right)/, ''); if (side < 0) return 0;
    if (/^UpperArm/.test(k)) return 1 + side; if (/^(LowerArm|Hand|Thumb|Index|Middle|Ring|Little)/.test(k)) return 3 + side; if (/^UpperLeg/.test(k)) return 5 + side; if (/^LowerLeg/.test(k)) return 7 + side; if (/^(Foot|Toes)/.test(k)) return 9 + side; return 0;
  }
  function rigOk(BN) { return ['hips', 'leftUpperArm', 'rightUpperArm', 'leftLowerArm', 'rightLowerArm', 'leftHand', 'rightHand', 'leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg', 'leftFoot', 'rightFoot'].every(k => BN[k]) && !!(BN.neck || BN.upperChest); }
  const cloneRig = r => r ? { jn: r.jn, off: r.off.slice(), pp: r.pp ? r.pp.map(a => a.slice()) : null, pts0: r.pts0, bones0: r.bones0 } : null;
  const REGB = ['躯干', '颈', '肩', '上臂', '前臂', '手', '大腿', '小腿', '脚'];
  function regOf(key) {
    const side = key.startsWith('left') ? 1 : key.startsWith('right') ? 2 : 0, k = key.replace(/^(left|right)/, ''); let b = 0;
    if (/^(hips|spine|chest|upperChest)$/.test(k)) b = 0; else if (/^(neck|head|Eye|jaw)/i.test(k)) b = 1; else if (/^Shoulder/i.test(k)) b = 2; else if (/^UpperArm/.test(k)) b = 3; else if (/^LowerArm/.test(k)) b = 4; else if (/^(Hand|Thumb|Index|Middle|Ring|Little)/.test(k)) b = 5; else if (/^UpperLeg/.test(k)) b = 6; else if (/^LowerLeg/.test(k)) b = 7; else if (/^(Foot|Toes)/.test(k)) b = 8;
    return b * 3 + side;
  }
  const grpOf = code => { const b = Math.floor(code / 3); return b === 3 || b === 4 ? 'arm' : b === 5 ? 'hand' : b >= 6 ? 'leg' : 'torso'; };
  function pieceName(part) {
    if (part.rig) return '整具身体';
    const h = new Array(27).fill(0); let tot = 0; for (const s of part.sets) { if (s.cap === 2) continue; const V = s.V; for (let i = S - 1; i < V.length; i += S) { h[(V[i] | 0) & 31]++; tot++; } }
    if (!tot) return '碎块'; let bi = 0; for (let i = 1; i < 27; i++) if (h[i] > h[bi]) bi = i; const share = h[bi] / tot, b = Math.floor(bi / 3), side = bi % 3;
    const dim = part.bb.getSize(new V3()), mx = Math.max(dim.x, dim.y, dim.z); if (mx < 0.06) return '碎块'; if (mx > 1.1) return '整具身体';
    if (share < 0.5) { const tor = [0, 1, 2].reduce((a, k) => a + h[k * 3] + h[k * 3 + 1] + h[k * 3 + 2], 0) / tot; return tor > 0.4 ? '躯干段' : '肢体段'; }
    return (side ? (side === 1 ? '左' : '右') : '') + REGB[b] + (share < 0.8 ? '段' : '');
  }
  // ---------------------------------------------------------------- 烘焙：尸体 → 静态顶点着色网格
  const LUT = new Float32Array(256).map((_, i) => { const c = i / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }), TEXC = new Map();
  function texData(tex) { const img = tex && tex.image; if (!img) return null; if (TEXC.has(img)) return TEXC.get(img); const w0 = img.width || img.naturalWidth, h0 = img.height || img.naturalHeight; if (!w0) return null; const s = Math.min(1, 1024 / Math.max(w0, h0)), w = Math.max(1, Math.round(w0 * s)), h = Math.max(1, Math.round(h0 * s)); let d = null;
    try { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h); d = { w, h, px: g.getImageData(0, 0, w, h).data, flip: !!tex.flipY }; } catch (e) { } TEXC.set(img, d); return d; }
  function calcNormals(V, I) {
    const n = V.length / S; for (let i = 0; i < n; i++) { V[i * S + 3] = V[i * S + 4] = V[i * S + 5] = 0; }
    for (let t = 0; t < I.length; t += 3) { const a = I[t] * S, b = I[t + 1] * S, c = I[t + 2] * S; const ux = V[b] - V[a], uy = V[b + 1] - V[a + 1], uz = V[b + 2] - V[a + 2], vx = V[c] - V[a], vy = V[c + 1] - V[a + 1], vz = V[c + 2] - V[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; for (const k of [a, b, c]) { V[k + 3] += nx; V[k + 4] += ny; V[k + 5] += nz; } }
    for (let i = 0; i < n; i++) { const k = i * S, l = Math.hypot(V[k + 3], V[k + 4], V[k + 5]) || 1; V[k + 3] /= l; V[k + 4] /= l; V[k + 5] /= l; }
  }
  function bake(root) { // root：已克隆的带骨骼模型（调用方负责去掉头与武器）
    root.position.set(0, 0, 0); root.quaternion.identity(); if (root.parent) root.parent.remove(root);
    root.traverse(o => { if (o.isSkinnedMesh && o.skeleton) o.skeleton.pose(); }); root.updateMatrixWorld(true);
    const bk = new Map(); root.traverse(o => { if (o.name && o.name.startsWith('H_')) bk.set(o, o.name.slice(2)); });
    const keyOf = b => { for (let p = b; p; p = p.parent) { const k = bk.get(p); if (k) return k; } return 'hips'; };
    const sets = [], tmp = new V3(), bb = new T.Box3();
    root.traverse(o => {
      if (!o.isSkinnedMesh || o.userData.olHull || !o.geometry.attributes.skinIndex) return; const cut = !!o.userData.cut; if (!o.visible && !cut) return;
      for (let p = o.parent; p; p = p.parent) if (p.name === 'headHolder') return;
      const mats = Array.isArray(o.material) ? o.material : [o.material], geo = o.geometry, pa = geo.attributes.position, uva = geo.attributes.uv, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, idx = geo.index ? geo.index.array : null;
      const bReg = o.skeleton.bones.map(b => regOf(keyOf(b))), bGrp = o.skeleton.bones.map(b => rgOf(keyOf(b))); const groups = geo.groups.length ? geo.groups : [{ start: 0, count: idx ? idx.length : pa.count, materialIndex: 0 }];
      for (const gp of groups) {
        const m = mats[gp.materialIndex] || mats[0]; if (!m) continue; const nm = (m.name || '') + ' ' + o.name; if (!cut && /hair|face|eye|brow|lash/i.test(nm)) continue;
        const td = !cut && m.map ? texData(m.map) : null, mc = m.color || new T.Color(1, 1, 1), remap = new Int32Array(pa.count).fill(-1), V = [], I = [], alpha = [], sk = [];
        for (let t = gp.start; t < gp.start + gp.count; t += 3) { const tri = [0, 1, 2].map(k => idx ? idx[t + k] : t + k), vi = [];
          for (const x of tri) { if (remap[x] < 0) { remap[x] = V.length / S; tmp.fromBufferAttribute(pa, x); o.boneTransform(x, tmp); tmp.applyMatrix4(o.matrixWorld);
            let r = mc.r, g = mc.g, b = mc.b, a = 1, u0 = 0, v0 = 0; if (uva) { u0 = uva.getX(x); v0 = uva.getY(x); } if (td && uva) { let u = uva.getX(x), v = uva.getY(x); u -= Math.floor(u); v -= Math.floor(v); const px = Math.min(td.w - 1, Math.floor(u * td.w)), py = Math.min(td.h - 1, Math.floor((td.flip ? 1 - v : v) * td.h)), q = (py * td.w + px) * 4; r *= LUT[td.px[q]]; g *= LUT[td.px[q + 1]]; b *= LUT[td.px[q + 2]]; a = td.px[q + 3] / 255; }
            const lum = r * 0.299 + g * 0.587 + b * 0.114, cw = [Math.min(1, lum * 1.12), Math.min(1, lum * 1.04), Math.min(1, lum * 0.88)]; let bi = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = sw.getComponent ? sw.getComponent(x, k) : sw.array[x * 4 + k]; if (w > bw) { bw = w; bi = si.getComponent ? si.getComponent(x, k) : si.array[x * 4 + k]; } }
            const gw = new Float32Array(11); for (let k = 0; k < 4; k++) { const w = sw.getComponent ? sw.getComponent(x, k) : sw.array[x * 4 + k], ix = si.getComponent ? si.getComponent(x, k) : si.array[x * 4 + k]; if (w > 0) gw[bGrp[ix] || 0] += w; }
            let g1 = 0, w1 = -1, g2 = 0, w2 = 0; for (let g = 0; g < 11; g++) { if (gw[g] > w1) { g2 = g1; w2 = w1 < 0 ? 0 : w1; g1 = g; w1 = gw[g]; } else if (gw[g] > w2) { g2 = g; w2 = gw[g]; } } const ws = w1 + w2; if (ws < 1e-6) { g1 = 0; w1 = 1; g2 = 0; w2 = 0; } else { w1 /= ws; w2 /= ws; if (w2 < 0.04) { w1 = 1; w2 = 0; g2 = g1; } }
            const hasT = !!(td && uva); V.push(tmp.x, tmp.y, tmp.z, 0, 1, 0, mc.r, mc.g, mc.b, cw[0], cw[1], cw[2], u0, v0, hasT ? 1 : 0, 0, 0, bReg[bi] || 0); alpha.push(a); sk.push(g1, w1, g2, w2); bb.expandByPoint(tmp); } vi.push(remap[x]); }
          I.push(vi[0], vi[1], vi[2]); }
        if (I.length < 9) continue; const skin = cut || !!(m.userData && m.userData.skin); sets.push({ V, I, sk, skin, cap: cut ? 2 : skin ? 1 : 0, cloth: false, nm, map: td ? m.map : null, at: m.alphaTest || 0 });
      }
    });
    if (!sets.length) return null; const anySkin = sets.some(s => s.skin); for (const s of sets) { if (!anySkin) s.cap = 1; else if (!s.skin) s.cloth = true; if (s.cap !== 2) calcNormals(s.V, s.I); else calcNormals(s.V, s.I); }
    // 归一：脚底 y=0，x/z 居中
    const c = bb.getCenter(new V3()), dx = -c.x, dy = -bb.min.y, dz = -c.z; for (const s of sets) for (let i = 0; i < s.V.length; i += S) { s.V[i] += dx; s.V[i + 1] += dy; s.V[i + 2] += dz; }
    for (const s of sets) { const n = s.V.length / S, P = new Float32Array(n * 3), N = new Float32Array(n * 3); for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { P[i * 3 + k] = s.V[i * S + k]; N[i * 3 + k] = s.V[i * S + 3 + k]; } s.rg = { P, N, sk: Float32Array.from(s.sk) }; delete s.sk; }
    const BN = {}; for (const [o, k] of bk) { const p = new V3().setFromMatrixPosition(o.matrixWorld); BN[k] = [p.x + dx, p.y + dy, p.z + dz]; }
    // 「素衣」：只保留躯干到大腿根这一段（用顶点的 reg 低位=0 且高度在带内）；reg 的第 5 位(+32)记为“素衣保留”
    const HH = bb.max.y - bb.min.y, legs = ['leftUpperLeg', 'rightUpperLeg'].map(k => BN[k]).filter(Boolean), nk = BN.neck || BN.upperChest; let hasLin = false;
    if (legs.length && nk) { const hem = legs.reduce((a, b) => a + b[1], 0) / legs.length - 0.17 * HH, top = nk[1] - 0.02 * HH; let n3 = 0, y0 = 1e9, y1 = -1e9;
      for (const s of sets) if (s.cloth) { const V = s.V; for (let i = 0; i < V.length; i += S) { const y = V[i + 1], code = V[i + S - 1] | 0; if ((code === 0 || code === 18 || code === 19 || code === 20) && y >= hem && y <= top) V[i + S - 1] = code + 32; }
        for (let t = 0; t < s.I.length; t += 3) { if (V[s.I[t] * S + S - 1] >= 32 && V[s.I[t + 1] * S + S - 1] >= 32 && V[s.I[t + 2] * S + S - 1] >= 32) { n3++; for (let k = 0; k < 3; k++) { const y = V[s.I[t + k] * S + 1]; if (y < y0) y0 = y; if (y > y1) y1 = y; } } } }
      const sb = new T.Box3(), ab = new T.Box3(), tp = new V3(); for (const q of sets) for (let i = 0; i < q.V.length; i += S) { tp.set(q.V[i], q.V[i + 1], q.V[i + 2]); ab.expandByPoint(tp); if (!q.cloth) sb.expandByPoint(tp); }
      const sbs = sb.getSize(new V3()), abs = ab.getSize(new V3()); // 去掉衣服后，皮肤层必须仍是完整的人形（否则四肢画在衣服层里，去衣就会缺胳膊少腿）
      hasLin = n3 >= 300 && (y1 - y0) >= 0.2 * HH && !sb.isEmpty() && sbs.y >= 0.92 * abs.y && sbs.x >= 0.8 * abs.x; }
    const BONES = [['hips', 'spine', 0.032], ['spine', 'chest', 0.03], ['chest', 'upperChest', 0.028], ['upperChest', 'neck', 0.022], ['leftUpperArm', 'leftLowerArm', 0.014], ['leftLowerArm', 'leftHand', 0.011], ['rightUpperArm', 'rightLowerArm', 0.014], ['rightLowerArm', 'rightHand', 0.011], ['leftUpperLeg', 'leftLowerLeg', 0.026], ['leftLowerLeg', 'leftFoot', 0.019], ['rightUpperLeg', 'rightLowerLeg', 0.026], ['rightLowerLeg', 'rightFoot', 0.019], ['leftFoot', 'leftToes', 0.011], ['rightFoot', 'rightToes', 0.011], ['upperChest', 'leftUpperArm', 0.012], ['upperChest', 'rightUpperArm', 0.012], ['hips', 'leftUpperLeg', 0.02], ['hips', 'rightUpperLeg', 0.02]];
    const bones = BONES.filter(b => BN[b[0]] && BN[b[1]]).map(b => ({ a: BN[b[0]].slice(), b: BN[b[1]].slice(), r: b[2] }));
    return { sets, BN, bones, height: HH, hasCloth: hasLin, rig: rigOk(BN) };
  }
  // ---------------------------------------------------------------- 词条分布
  const SEG = [['hips', 'spine'], ['spine', 'chest'], ['chest', 'upperChest'], ['upperChest', 'neck'], ['leftUpperArm', 'leftLowerArm'], ['leftLowerArm', 'leftHand'], ['rightUpperArm', 'rightLowerArm'], ['rightLowerArm', 'rightHand'], ['leftUpperLeg', 'leftLowerLeg'], ['leftLowerLeg', 'leftFoot'], ['rightUpperLeg', 'rightLowerLeg'], ['rightLowerLeg', 'rightFoot'], ['leftFoot', 'leftToes'], ['rightFoot', 'rightToes']];
  function rollAffixes(BN, rar, boss) {
    const segs = []; for (const [a, b] of SEG) { const A = BN[a], B = BN[b]; if (A && B) segs.push({ A, B, code: regOf(a), len: Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) }); }
    for (const h of ['leftHand', 'rightHand']) { const A = BN[h], E = BN[h.replace('Hand', 'LowerArm')]; if (A && E) { const d = [A[0] - E[0], A[1] - E[1], A[2] - E[2]], l = Math.hypot(...d) || 1; segs.push({ A, B: [A[0] + d[0] / l * 0.09, A[1] + d[1] / l * 0.09, A[2] + d[2] / l * 0.09], code: regOf(h), len: 0.09 }); } }
    if (!segs.length) return []; const tot = segs.reduce((a, s) => a + s.len, 0), n = 5 + (rar >= 1 ? 1 : 0) + (rar >= 2 ? 1 : 0) + (boss ? 2 : 0), out = [];
    for (let i = 0; i < n; i++) {
      let r = Math.random() * tot, sg = segs[0]; for (const s of segs) { if ((r -= s.len) <= 0) { sg = s; break; } }
      const g = grpOf(sg.code), ids = Object.keys(AFX), ws = ids.map(id => (AFX[id].w[g] || 0.15)), W = ws.reduce((a, b) => a + b, 0); let q = Math.random() * W, id = ids[0]; for (let k = 0; k < ids.length; k++) { if ((q -= ws[k]) <= 0) { id = ids[k]; break; } }
      const tier = 1 + (Math.random() < 0.25 + rar * 0.1 ? 1 : 0) + (Math.random() < 0.08 + rar * 0.07 ? 1 : 0), t = Math.random(), j = () => rnd(-0.012, 0.012);
      out.push({ p: [sg.A[0] + (sg.B[0] - sg.A[0]) * t + j(), sg.A[1] + (sg.B[1] - sg.A[1]) * t + j(), sg.A[2] + (sg.B[2] - sg.A[2]) * t + j()], a: { id, t: tier, m: +([0, 1, 1.4, 1.9][tier] * rnd(0.85, 1.15)).toFixed(2) } });
    }
    return out;
  }
  // ---------------------------------------------------------------- 切割引擎
  function sliceSet(set, fn) { // fn(x,y,z) → 有符号距离（≥0 为前侧）
    const V = set.V, I = set.I, nv = V.length / S, dist = new Float32Array(nv);
    for (let i = 0; i < nv; i++) dist[i] = fn(V[i * S], V[i * S + 1], V[i * S + 2]);
    const P = [{ V: [], I: [], map: new Int32Array(nv).fill(-1), segs: [] }, { V: [], I: [], map: new Int32Array(nv).fill(-1), segs: [] }], A = P[0], B = P[1], cache = new Map();
    const cp = (Q, i) => { let m = Q.map[i]; if (m < 0) { m = Q.map[i] = Q.V.length / S; for (let k = 0; k < S; k++) Q.V.push(V[i * S + k]); } return m; };
    const edge = (a, b) => { const key = a < b ? a * nv + b : b * nv + a; let e = cache.get(key); if (e) return e; const t = dist[a] / (dist[a] - dist[b]), row = []; for (let k = 0; k < S; k++) row.push(V[a * S + k] + (V[b * S + k] - V[a * S + k]) * t); row[S - 1] = V[a * S + S - 1];
      const l = Math.hypot(row[3], row[4], row[5]) || 1; row[3] /= l; row[4] /= l; row[5] /= l; e = [A.V.length / S, B.V.length / S]; for (const v of row) { A.V.push(v); B.V.push(v); } cache.set(key, e); return e; };
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t], b = I[t + 1], c = I[t + 2], fa = dist[a] >= 0, fb = dist[b] >= 0, fc = dist[c] >= 0, cnt = fa + fb + fc;
      if (cnt === 3) { A.I.push(cp(A, a), cp(A, b), cp(A, c)); continue; } if (cnt === 0) { B.I.push(cp(B, a), cp(B, b), cp(B, c)); continue; }
      const arr = [a, b, c], fr = [fa, fb, fc], loneFront = cnt === 1; let k = 0; for (let q = 0; q < 3; q++) if (fr[q] === loneFront) k = q;
      const p0 = arr[k], p1 = arr[(k + 1) % 3], p2 = arr[(k + 2) % 3], e01 = edge(p0, p1), e20 = edge(p2, p0);
      if (loneFront) { A.I.push(cp(A, p0), e01[0], e20[0]); B.I.push(e01[1], cp(B, p1), cp(B, p2), e01[1], cp(B, p2), e20[1]); A.segs.push(e01[0], e20[0]); B.segs.push(e20[1], e01[1]); }
      else { B.I.push(cp(B, p0), e01[1], e20[1]); A.I.push(e01[0], cp(A, p1), cp(A, p2), e01[0], cp(A, p2), e20[0]); B.segs.push(e01[1], e20[1]); A.segs.push(e20[0], e01[0]); }
    }
    return P;
  }
  const CAPC = [1, 1, 1]; // 截面颜色由着色器按“皮 / 脂 / 肌 / 骨”分层给出
  function planeTool(n, d) {
    const e1 = Math.abs(n.x) < 0.9 ? new V3(1, 0, 0).cross(n).normalize() : new V3(0, 1, 0).cross(n).normalize(), e2 = new V3().crossVectors(n, e1), nn = [n.x, n.y, n.z];
    return { fn: (x, y, z) => n.x * x + n.y * y + n.z * z + d, proj: (x, y, z) => [x * e1.x + y * e1.y + z * e1.z, x * e2.x + y * e2.y + z * e2.z], nrm: () => nn };
  }
  // 曲线切口：屏幕上拖出的折线（平滑后两端沿切向延长），切面 = 从相机出发、穿过这条线的所有射线（直线时就是平面）
  function makeCurve(path) {
    let pts = [path[0]]; for (const q of path) { const l = pts[pts.length - 1]; if (Math.hypot(q[0] - l[0], q[1] - l[1]) > 6) pts.push(q); } if (pts.length < 2) return null;
    for (let it = 0; it < 2 && pts.length >= 3; it++) { const n = [pts[0]]; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; n.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } n.push(pts[pts.length - 1]); pts = n; }
    const L = pts.length, tang = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
    let k0 = 1; while (k0 < L - 1 && Math.hypot(pts[k0][0] - pts[0][0], pts[k0][1] - pts[0][1]) < 30) k0++; let k1 = L - 2; while (k1 > 0 && Math.hypot(pts[k1][0] - pts[L - 1][0], pts[k1][1] - pts[L - 1][1]) < 30) k1--;
    const t0 = tang(pts[k0], pts[0]), t1 = tang(pts[k1], pts[L - 1]), E = 5000, P = [[pts[0][0] + t0[0] * E, pts[0][1] + t0[1] * E]].concat(pts, [[pts[L - 1][0] + t1[0] * E, pts[L - 1][1] + t1[1] * E]]), sg = []; let cum = -E;
    for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1e-6; sg.push({ ax: a[0], ay: a[1], dx, dy, l, l2: l * l, nx: -dy / l, ny: dx / l, c: cum }); cum += l; }
    const res = { d: 0, s: 0, P };
    res.at = (px, py) => { let bd = 1e18, bi = 0, bt = 0; for (let i = 0; i < sg.length; i++) { const g = sg[i]; let t = ((px - g.ax) * g.dx + (py - g.ay) * g.dy) / g.l2; t = t < 0 ? 0 : t > 1 ? 1 : t; const qx = g.ax + g.dx * t - px, qy = g.ay + g.dy * t - py, d2 = qx * qx + qy * qy; if (d2 < bd) { bd = d2; bi = i; bt = t; } }
      const g = sg[bi]; let nx = g.nx, ny = g.ny; if (bt <= 0 && bi > 0) { nx += sg[bi - 1].nx; ny += sg[bi - 1].ny; } else if (bt >= 1 && bi < sg.length - 1) { nx += sg[bi + 1].nx; ny += sg[bi + 1].ny; }
      const qx = px - (g.ax + g.dx * bt), qy = py - (g.ay + g.dy * bt); res.d = (qx * nx + qy * ny >= 0 ? 1 : -1) * Math.sqrt(bd); res.s = g.c + bt * g.l; return res.d; };
    return res;
  }
  function addCaps(Q, tool, sign) {
    const m = Q.segs.length / 2; if (!m) return; const V = Q.V, start = new Map(); for (let i = 0; i < m; i++) { const s = Q.segs[2 * i]; if (!start.has(s)) start.set(s, []); start.get(s).push(i); }
    const used = new Uint8Array(m), loops = []; const pd = (a, b) => Math.hypot(V[a * S] - V[b * S], V[a * S + 1] - V[b * S + 1], V[a * S + 2] - V[b * S + 2]);
    for (let i = 0; i < m; i++) { if (used[i]) continue; used[i] = 1; const chain = [Q.segs[2 * i]]; let cur = Q.segs[2 * i + 1], closed = false, guard = 0;
      while (guard++ < 200000) { if (cur === chain[0]) { closed = true; break; } chain.push(cur); const L = start.get(cur); let nx = -1; if (L) for (const j of L) if (!used[j]) { nx = j; break; } if (nx < 0) break; used[nx] = 1; cur = Q.segs[2 * nx + 1]; }
      if (chain.length >= 3 && (closed || pd(chain[0], cur) < 0.3)) loops.push(chain); }
    if (!loops.length) return;
    const L2 = loops.map(l => { const pts = l.map(i => { const q = tool.proj(V[i * S], V[i * S + 1], V[i * S + 2]); return new T.Vector2(q[0], q[1]); }); let ar = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; ar += a.x * b.y - b.x * a.y; } return { l, pts, ar: Math.abs(ar / 2) }; }).filter(x => x.ar > 1e-8).sort((a, b) => b.ar - a.ar);
    const inside = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < (b.x - a.x) * (pt.y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; };
    for (let i = 0; i < L2.length; i++) { const cont = []; for (let j = 0; j < i; j++) if (inside(L2[i].pts[0], L2[j].pts)) cont.push(j); L2[i].depth = cont.length; L2[i].par = cont.length ? cont[cont.length - 1] : -1; L2[i].holes = []; }
    for (const x of L2) if (x.depth % 2 === 1 && x.par >= 0) L2[x.par].holes.push(x);
    const reg = i => V[i * S + S - 1];
    for (const x of L2) { if (x.depth % 2 === 1) continue; const contour = x.pts, holes = x.holes.map(h => h.pts), all = x.l.concat(...x.holes.map(h => h.l));
      const all2 = contour.concat(...holes); let tris; try { tris = T.ShapeUtils.triangulateShape(contour, holes); } catch (e) { continue; } const base = V.length / S;
      let u0 = 1e18, u1 = -1e18, w0 = 1e18, w1 = -1e18; for (const q of contour) { if (q.x < u0) u0 = q.x; if (q.x > u1) u1 = q.x; if (q.y < w0) w0 = q.y; if (q.y > w1) w1 = q.y; } const cu = (u0 + u1) / 2, cw = (w0 + w1) / 2, hu = Math.max((u1 - u0) / 2, 1e-6), hw = Math.max((w1 - w0) / 2, 1e-6);
      all.forEach((vi, qi) => { const nn = tool.nrm(V[vi * S], V[vi * S + 1], V[vi * S + 2]); V.push(V[vi * S], V[vi * S + 1], V[vi * S + 2], nn[0] * sign, nn[1] * sign, nn[2] * sign, 1, 1, 1, 1, 1, 1, 0, 0, -1, (all2[qi].x - cu) / hu, (all2[qi].y - cw) / hw, reg(vi)); });
      for (const t of tris) { const a = (base + t[0]) * S, b = (base + t[1]) * S, c = (base + t[2]) * S; const ux = V[b] - V[a], uy = V[b + 1] - V[a + 1], uz = V[b + 2] - V[a + 2], vx = V[c] - V[a], vy = V[c + 1] - V[a + 1], vz = V[c + 2] - V[a + 2];
        const d = (uy * vz - uz * vy) * V[a + 3] + (uz * vx - ux * vz) * V[a + 4] + (ux * vy - uy * vx) * V[a + 5]; if (d >= 0) Q.I.push(base + t[0], base + t[1], base + t[2]); else Q.I.push(base + t[0], base + t[2], base + t[1]); } }
  }
  function addDiscs(Q, discs, tool, sign) { // 骨头的截面：切口里露出的一小圈骨头（象牙色，中心骨髓色）
    const V = Q.V; for (const d of discs) { const nn = tool.nrm(d.p[0], d.p[1], d.p[2]), n = new V3(nn[0] * sign, nn[1] * sign, nn[2] * sign), t1 = new V3().crossVectors(n, Math.abs(n.y) < 0.9 ? new V3(0, 1, 0) : new V3(1, 0, 0)).normalize(), t2 = new V3().crossVectors(n, t1), base = V.length / S, N = 14, r = Math.max(0.006, d.r);
      const row = (x, y, z, cx, cy) => V.push(x, y, z, n.x, n.y, n.z, 1, 1, 1, 1, 1, 1, 0, 0, -2, cx, cy, 0);
      row(d.p[0] + n.x * 0.0009, d.p[1] + n.y * 0.0009, d.p[2] + n.z * 0.0009, 0, 0);
      for (let k = 0; k < N; k++) { const a = k / N * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a); row(d.p[0] + (t1.x * ca + t2.x * sa) * r + n.x * 0.0009, d.p[1] + (t1.y * ca + t2.y * sa) * r + n.y * 0.0009, d.p[2] + (t1.z * ca + t2.z * sa) * r + n.z * 0.0009, ca, sa); }
      for (let k = 0; k < N; k++) Q.I.push(base, base + 1 + k, base + 1 + (k + 1) % N); }
  }
  function compact(Q, set) { return { V: Q.V, I: Q.I, skin: set.skin, cap: set.cap, cloth: set.cloth, nm: set.nm, map: set.map, at: set.at }; }
  function bbOf(sets) { const bb = new T.Box3(), p = new V3(); for (const s of sets) for (let i = 0; i < s.V.length; i += S) { p.set(s.V[i], s.V[i + 1], s.V[i + 2]); bb.expandByPoint(p); } return bb; }
  function components(sets) { // 同侧的不连通块 → 拆成独立实体（不同材质层按包围盒重叠合并）
    const comps = [];
    sets.forEach((s, si) => { const nv = s.V.length / S, par = new Int32Array(nv).map((_, i) => i), find = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
      for (let t = 0; t < s.I.length; t += 3) { const a = find(s.I[t]), b = find(s.I[t + 1]), c = find(s.I[t + 2]); par[b] = a; par[find(c)] = find(a); }
      const m = new Map(); for (let t = 0; t < s.I.length; t += 3) { const r = find(s.I[t]); let c = m.get(r); if (!c) { c = { si, tris: [], bb: new T.Box3() }; m.set(r, c); comps.push(c); } c.tris.push(t); for (let k = 0; k < 3; k++) { const v = s.I[t + k] * S; c.bb.expandByPoint(new V3(s.V[v], s.V[v + 1], s.V[v + 2])); } } });
    const par = comps.map((_, i) => i), find = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
    for (let i = 0; i < comps.length; i++) { const a = comps[i].bb.clone().expandByScalar(0.012); for (let j = i + 1; j < comps.length; j++) if (a.intersectsBox(comps[j].bb)) par[find(j)] = find(i); }
    const gs = new Map(); comps.forEach((c, i) => { const r = find(i); if (!gs.has(r)) gs.set(r, []); gs.get(r).push(c); });
    const out = []; for (const g of gs.values()) { const per = new Map(); let nt = 0; for (const c of g) { if (!per.has(c.si)) per.set(c.si, []); per.get(c.si).push(...c.tris); nt += c.tris.length; }
      if (nt < 30) continue; const ns = []; for (const [si, tris] of per) { const s = sets[si], remap = new Map(), V = [], I = []; for (const t of tris) for (let k = 0; k < 3; k++) { const x = s.I[t + k]; let m = remap.get(x); if (m === undefined) { m = V.length / S; remap.set(x, m); for (let q = 0; q < S; q++) V.push(s.V[x * S + q]); } I.push(m); } ns.push({ V, I, skin: s.skin, cap: s.cap, cloth: s.cloth, nm: s.nm, map: s.map, at: s.at }); }
      const bb = bbOf(ns), sz = bb.getSize(new V3()); if (Math.max(sz.x, sz.y, sz.z) < 0.012) continue; out.push({ sets: ns, bb, pts: [], bones: [] }); }
    return out;
  }
  function cutPart(part, tool) { // → [partsFront, partsBack] 或 null
    const bF = [], bB = [], discs = []; for (const b of part.bones || []) { const da = tool.fn(b.a[0], b.a[1], b.a[2]), db = tool.fn(b.b[0], b.b[1], b.b[2]);
      if (da >= 0 && db >= 0) bF.push(b); else if (da < 0 && db < 0) bB.push(b); else { const t = da / (da - db), m = [b.a[0] + (b.b[0] - b.a[0]) * t, b.a[1] + (b.b[1] - b.a[1]) * t, b.a[2] + (b.b[2] - b.a[2]) * t]; if (da >= 0) { bF.push({ a: b.a, b: m, r: b.r }); bB.push({ a: m, b: b.b, r: b.r }); } else { bB.push({ a: b.a, b: m, r: b.r }); bF.push({ a: m, b: b.b, r: b.r }); } discs.push({ p: m, r: b.r }); } }
    const side = [[], []], dDone = [false, false]; for (const s of part.sets) { const r = sliceSet(s, tool.fn); for (let k = 0; k < 2; k++) if (r[k].I.length >= 9) { if (s.cap && r[k].segs.length) addCaps(r[k], tool, k === 0 ? -1 : 1); if (s.cap === 1 && !dDone[k] && discs.length) { dDone[k] = true; addDiscs(r[k], discs, tool, k === 0 ? -1 : 1); } side[k].push(compact(r[k], s)); } }
    if (!side[0].length || !side[1].length) return null;
    const res = [0, 1].map(k => { const ps = components(side[k]); for (const p of ps) { for (const s of p.sets) if (s.cap !== undefined) calcNormalsKeepCap(s); } return ps; });
    if (!res[0].length || !res[1].length) return null;
    for (const pt of part.pts) { const k = tool.fn(pt.p[0], pt.p[1], pt.p[2]) >= 0 ? 0 : 1, q = new V3(...pt.p); let best = res[k][0], bd = 1e9; for (const p of res[k]) { const dd = p.bb.distanceToPoint(q); if (dd < bd) { bd = dd; best = p; } } best.pts.push(pt); }
    [bF, bB].forEach((L, k) => { for (const b of L) { const q = new V3((b.a[0] + b.b[0]) / 2, (b.a[1] + b.b[1]) / 2, (b.a[2] + b.b[2]) / 2); let best = res[k][0], bd = 1e9; for (const p of res[k]) { const dd = p.bb.distanceToPoint(q); if (dd < bd) { bd = dd; best = p; } } best.bones.push(b); } });
    return res;
  }
  // 换素衣：布料层只留“躯干到大腿根”那一段，颜色换成亚麻色（不会脱成裸体）。深拷贝，以免污染撤销用的旧块
  function linenize(part) {
    const sets = []; for (const s of part.sets) {
      if (!s.cloth) { sets.push({ V: s.V.slice(), I: s.I.slice(), skin: s.skin, cap: s.cap, cloth: false, nm: s.nm, map: s.map, at: s.at, rg: s.rg }); continue; }
      const remap = new Map(), V = [], I = [], rP = [], rN = [], rS = []; for (let t = 0; t < s.I.length; t += 3) { const a = s.I[t], b = s.I[t + 1], c = s.I[t + 2]; if (s.V[a * S + S - 1] < 32 || s.V[b * S + S - 1] < 32 || s.V[c * S + S - 1] < 32) continue;
        for (const x of [a, b, c]) { let m = remap.get(x); if (m === undefined) { m = V.length / S; remap.set(x, m); for (let q = 0; q < S; q++) V.push(s.V[x * S + q]); const o = m * S; V[o + 6] = V[o + 9]; V[o + 7] = V[o + 10]; V[o + 8] = V[o + 11]; V[o + 14] = 0; if (s.rg) { for (let k = 0; k < 3; k++) { rP.push(s.rg.P[x * 3 + k]); rN.push(s.rg.N[x * 3 + k]); } for (let k = 0; k < 4; k++) rS.push(s.rg.sk[x * 4 + k]); } } I.push(m); } }
      if (I.length >= 9) sets.push({ V, I, skin: false, cap: 0, cloth: true, nm: s.nm, map: null, at: 0, rg: s.rg ? { P: Float32Array.from(rP), N: Float32Array.from(rN), sk: Float32Array.from(rS) } : undefined }); }
    return { sets, pts: part.pts.map(x => ({ p: x.p.slice(), a: x.a })), bones: (part.bones || []).map(b => ({ a: b.a.slice(), b: b.b.slice(), r: b.r })), rig: cloneRig(part.rig), bb: bbOf(sets) };
  }
  // 占格：长边 / 0.32m（≤4 格），次长边 / 0.28m（≤3 格）
  const cellsOf = dim => { const a = dim.slice().sort((x, y) => y - x); return [clamp(Math.ceil(a[0] / 0.32 - 0.001), 1, 4), clamp(Math.ceil(a[1] / 0.28 - 0.001), 1, 3)]; };
  function calcNormalsKeepCap() { /* 切出来的新顶点已带插值法线；平面截面法线已设置，这里不重算（避免截面被平滑成圆角） */ }
  // ---------------------------------------------------------------- 界面
  function mkMat(map, at) { // 顶点色 × (贴图 按 tw 混合)：壳用贴图，截面用纯蜡色
    const m = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0, side: T.DoubleSide, map: map || null, alphaTest: at || 0 });
    m.onBeforeCompile = sh => { sh.vertexShader = 'attribute vec2 cp;\nvarying vec2 vCp;\nattribute float tw;\nvarying float vTw;\n' + sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvTw = tw;\nvCp = cp;');
      sh.fragmentShader = 'varying vec2 vCp;\nvarying float vTw;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#ifdef USE_MAP
vec4 sampledDiffuseColor = texture2D( map, vUv );
sampledDiffuseColor = mix( vec4( 1.0 ), sampledDiffuseColor, max( vTw, 0.0 ) );
diffuseColor *= sampledDiffuseColor;
#endif
if ( vTw < -0.5 ) {
  vec2 q = vCp; float r = length( q ); vec3 cc;
  if ( vTw < -1.5 ) { cc = mix( vec3( 0.40, 0.31, 0.22 ), vec3( 0.93, 0.89, 0.76 ), smoothstep( 0.12, 0.6, r ) ); }
  else {
    float fib = 0.5 + 0.5 * sin( atan( q.y, q.x ) * 26.0 + r * 11.0 );
    vec3 skinC = vec3( 0.74, 0.60, 0.52 ), fatC = vec3( 0.90, 0.80, 0.58 ), musC = mix( vec3( 0.40, 0.15, 0.13 ), vec3( 0.58, 0.24, 0.20 ), fib * 0.8 ), deepC = vec3( 0.30, 0.11, 0.10 );
    cc = mix( deepC, musC, smoothstep( 0.10, 0.45, r ) ); cc = mix( cc, fatC, smoothstep( 0.80, 0.86, r ) ); cc = mix( cc, skinC, smoothstep( 0.90, 0.95, r ) );
  }
  diffuseColor.rgb = cc;
}`); };
    return m;
  }
  let UI = null, css = false;
  const AT = { chop: () => { try { window.SFX && SFX.chop && SFX.chop(); } catch (e) { } }, hit: () => { try { window.SFX && SFX.play && SFX.play('hit', 0.4, 0.6); } catch (e) { } } };
  function addCss() { if (css) return; css = true; const s = document.createElement('style'); s.textContent = `
#apRoot{position:fixed;inset:0;z-index:150;background:#0b0608;color:#eadfc8;font-family:system-ui,"Noto Sans CJK SC","PingFang SC","Microsoft YaHei",sans-serif;user-select:none;overflow:hidden}
#apRoot canvas#apCv{position:absolute;inset:0;width:100%;height:100%;display:block}
#apRoot svg#apLn{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
#apRoot .hd{position:absolute;left:24px;top:16px;pointer-events:none}#apRoot h1{margin:0;font:900 clamp(28px,4.4vh,44px)/1 "Noto Serif CJK SC","Songti SC",serif;letter-spacing:.12em;color:#ffe2a8;text-shadow:0 0 22px rgba(220,40,50,.6)}
#apRoot .hd p{margin:8px 0 0;font-size:clamp(17px,2.4vh,21px);color:#cdbfa6}#apRoot .hd b{color:#fff}
#apRoot .tools{position:absolute;left:18px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;flex-wrap:wrap;align-content:flex-start;max-height:calc(100vh - 150px);gap:10px}
#apRoot .tl{width:108px;padding:10px 6px 8px;text-align:center;border:2px solid rgba(231,194,122,.45);background:rgba(20,12,14,.88);color:#f3d9a0;cursor:pointer}
#apRoot .tl i{display:block;font-style:normal;font-size:34px;line-height:1.1}#apRoot .tl span{display:block;font:800 17px "Noto Serif CJK SC",serif;letter-spacing:.06em}#apRoot .tl small{display:block;font-size:14px;color:#a99d88}
#apRoot .tl:hover{border-color:#ffd27a;filter:brightness(1.2)}#apRoot .tl.on{border-color:#ffd27a;background:linear-gradient(180deg,#8a3a22,#3a140c);color:#fff;box-shadow:0 0 22px rgba(255,150,70,.35)}#apRoot .tl.off{opacity:.4}
#apRoot .pn{position:absolute;right:16px;top:16px;bottom:78px;width:350px;overflow:auto;display:flex;flex-direction:column;gap:10px;padding-right:2px}
#apRoot .pn h2{margin:0;font:800 22px "Noto Serif CJK SC",serif;color:#f3d9a0;letter-spacing:.1em;text-shadow:0 1px 6px #000}
#apRoot .pc{padding:10px 12px;border:2px solid rgba(255,255,255,.16);background:rgba(18,11,14,.9);cursor:pointer}#apRoot .pc.sel{border-color:#ffd27a;box-shadow:0 0 18px rgba(255,160,70,.3)}#apRoot .pc.tk{background:rgba(70,38,20,.92)}
#apRoot .pc .t{display:flex;align-items:center;gap:8px}#apRoot .pc .t b{font:800 21px "Noto Serif CJK SC",serif;color:#fff}#apRoot .pc .t small{margin-left:auto;font-size:15px;color:#a99d88}
#apRoot .ch{display:flex;flex-wrap:wrap;gap:6px;margin:7px 0}#apRoot .ch span{font-size:16px;font-weight:700;padding:3px 9px;border:1px solid rgba(255,255,255,.22);background:rgba(0,0,0,.4)}
#apRoot .gdw{display:flex;align-items:center;gap:10px;margin:2px 0 6px}#apRoot .gd{display:inline-grid;gap:2px;padding:3px;background:rgba(0,0,0,.45);border:1px solid rgba(231,194,122,.4)}#apRoot .gd i{width:15px;height:15px;background:linear-gradient(135deg,#d8b068,#8a6428);border:1px solid #4a3010}#apRoot .gdw b{font:800 18px "Noto Serif CJK SC",serif;color:#ffd27a}#apRoot .bagn{font-size:16px;color:#cdbfa6;margin:-2px 0 2px}#apRoot .bagn b{color:#ffd27a}#apRoot .bagn.bad b{color:#ff8a7a}
#apRoot .pc .no{font-size:16px;color:#8d8170;margin:6px 0}#apRoot .pc button{width:100%;padding:7px;font:800 17px "Noto Serif CJK SC",serif;letter-spacing:.1em;border:2px solid #b8914a;background:linear-gradient(180deg,#3a2a1a,#1d130b);color:#f3d9a0;cursor:pointer}#apRoot .pc.tk button{background:linear-gradient(180deg,#a8452c,#5a1a10);border-color:#ffb070;color:#fff}
#apRoot .ft{position:absolute;left:0;right:0;bottom:0;height:64px;display:flex;align-items:center;gap:16px;padding:0 20px 0 150px;background:linear-gradient(0deg,rgba(0,0,0,.85),rgba(0,0,0,0))}
#apRoot .ft .tip{flex:1;font-size:clamp(17px,2.3vh,20px);color:#e0d4bc;text-shadow:0 1px 6px #000}
#apRoot .bt{font:800 clamp(18px,2.5vh,23px) "Noto Serif CJK SC",serif;letter-spacing:.14em;padding:10px 30px;border:2px solid #b8914a;background:linear-gradient(180deg,#3a2a1a,#1d130b);color:#f3d9a0;cursor:pointer}#apRoot .bt:hover{filter:brightness(1.25)}#apRoot .bt.go{background:linear-gradient(180deg,#a8452c,#5a1a10);border-color:#ffb070;color:#fff}#apRoot .bt:disabled{opacity:.4;cursor:not-allowed}
#apRoot #apKn{position:absolute;left:0;top:0;display:none;pointer-events:none;transform-origin:126px 22px;filter:drop-shadow(0 0 10px rgba(255,200,120,.9));z-index:5}
#apRoot .tt{position:absolute;pointer-events:none;padding:8px 12px;font:700 18px system-ui;background:rgba(10,6,8,.95);border:2px solid #ffd27a;color:#fff;display:none;white-space:nowrap}
#apRoot .toast{position:absolute;left:50%;top:84px;transform:translateX(-50%);padding:8px 20px;font-size:19px;font-weight:700;background:rgba(10,6,8,.92);border:2px solid #ffd27a;display:none}
#apRoot .intro{position:absolute;left:50%;bottom:92px;transform:translateX(-50%);max-width:760px;padding:18px 30px;text-align:center;font-size:clamp(20px,3vh,26px);line-height:1.5;background:rgba(10,6,8,.85);border:2px solid rgba(231,194,122,.5);pointer-events:none;animation:apf 6s forwards}@keyframes apf{0%,70%{opacity:1}100%{opacity:0}}
#apRoot #apPb{position:absolute;left:50%;bottom:84px;transform:translateX(-50%);display:none;gap:14px}#apRoot #apPb .bt{padding:12px 28px}
`;
    document.head.appendChild(s); }
  function mkRenderer(cv) { const r = new T.WebGLRenderer({ canvas: cv, antialias: true }); r.outputEncoding = T.sRGBEncoding; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.0; r.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); r.setClearColor(0x120a0c); r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap; return r; }
  const MOTEC = { stat: 0x7dff9a, aura: 0x7ac8ff, poke: 0xff9a70, tick: 0xe0a8ff };
  function open(L, done) {
    if (UI) return; if (!canOpen(L)) return; addCss(); try { document.exitPointerLock && document.exitPointerLock(); } catch (e) { }
    const fo = L.fo, f = fo.f; let B = L.apBake; // 只烘一次、词条只掷一次
    if (!B) { let root; try { root = Foe.cloneSkinned(f.root); B = bake(root); } catch (e) { console.warn('autopsy bake', e); B = null; } if (!B) { window.G && G.toast && G.toast('这具尸体没法放上解剖台', '#e88', 2); if (window.Dissect) Dissect.open(L, done); return; } const c = fo.h && fo.h.c, rar = c ? c.rar | 0 : 0; B.pts = rollAffixes(B.BN, rar, !!(fo.boss || fo.isBoss)); L.apBake = B; }
    const c = fo.h && fo.h.c, own = c ? c.name : (L.name || '无名者').replace(/的尸体$/, ''), race = c ? (c.raceN || c.race) : '', rar = c ? c.rar | 0 : 0;
    const root = document.createElement('div'); root.id = 'apRoot'; root.innerHTML = `<canvas id="apCv"></canvas><svg id="apLn"><polyline id="apLx" fill="none" stroke="#ffe9a8" stroke-opacity=".6" stroke-width="2.5" stroke-dasharray="2 10" stroke-linecap="round" display="none"/><polyline id="apL" fill="none" stroke="#ffe9a8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 0 6px #ff9a40)" display="none"/></svg>
<div class="hd"><h1>🔪 解剖台</h1><p>尸体：<b>${esc(own)}</b>　${esc(race || '')} · ${(window.Organs && Organs.RN[rar]) || ''}</p></div>
<div class="tools"><div class="tl on" data-tool="cut"><i>🔪</i><span>切割</span><small>1 · 拖线</small></div><div class="tl" data-tool="move"><i>🤲</i><span>举起</span><small>2 · 抓住拖</small></div><div class="tl" data-tool="rot"><i>🔄</i><span>旋转</span><small>3 · 拖动</small></div><div class="tl off" data-tool="pose"><i>🧍</i><span>摆姿势</span><small>4 · 拖关节</small></div><div class="tl on" data-act="xray"><i>👁</i><span>词条探查</span><small>V</small></div><div class="tl ${B.hasCloth ? '' : 'off'}" data-act="cloth"><i>👕</i><span>衣着</span><small id="apCl">原衣</small></div><div class="tl" data-act="undo"><i>↩</i><span>撤销</span><small>Ctrl+Z</small></div></div>
<div id="apKn"><svg viewBox="0 0 130 44" width="130" height="44"><path d="M4 22 L28 16 L28 28 Z" fill="#6a4a2a"/><rect x="20" y="15" width="40" height="14" rx="5" fill="#4a3018" stroke="#2a1a0c" stroke-width="2"/><path d="M60 14 L112 12 Q124 18 126 22 Q124 26 112 32 L60 30 Z" fill="#e6edf5" stroke="#ffffff" stroke-width="1.5"/><path d="M62 17 L114 16" stroke="#9fb0c4" stroke-width="2"/></svg></div><div id="apPb"><button class="bt go" data-pb="lock">🔒 固定姿势</button><button class="bt" data-pb="reset">↺ 回到原姿势</button></div><div class="pn" id="apPn"></div><div class="tt" id="apTt"></div><div class="toast" id="apTs"></div>
<div class="intro">在身体上<b style="color:#ffd27a">拖出一条线或曲线</b>，沿线切开。右键拖动＝转视角，滚轮＝缩放。<br>切下的块有重量：用<b style="color:#ffd27a">🤲举起</b>抓住拖走，松手会掉下去。发光的小点是<b style="color:#ffd27a">词条</b>。</div>
<div class="ft"><div class="tip" id="apTip"></div><button class="bt" id="apX">放弃</button><button class="bt go" id="apGo" disabled>完成</button></div>`;
    document.body.appendChild(root);
    const cv = root.querySelector('#apCv'), R = mkRenderer(cv), sc = new T.Scene(), cam = new T.PerspectiveCamera(42, 1, 0.05, 40);
    sc.fog = new T.Fog(0x120a0c, 4, 9); sc.add(new T.HemisphereLight(0xfff0e0, 0x3a2028, 0.5)); const key = new T.DirectionalLight(0xffe6c8, 0.9); key.position.set(1.2, 3, 1.5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -1.8, right: 1.8, top: 1.8, bottom: -1.8, near: 0.5, far: 9 }); key.shadow.bias = -0.002; sc.add(key); const rim = new T.DirectionalLight(0x8aa0ff, 0.5); rim.position.set(-2, 1.5, -2); sc.add(rim); const lamp = new T.PointLight(0xffb070, 0.3, 6); lamp.position.set(0, 1.6, 0.3); sc.add(lamp);
    const slab = new T.Mesh(new T.CylinderGeometry(1.25, 1.3, 0.08, 48), new T.MeshStandardMaterial({ color: 0x070504, roughness: 0.95 })); slab.position.y = -0.04; slab.receiveShadow = true; sc.add(slab);
    const floor = new T.Mesh(new T.CircleGeometry(7, 40), new T.MeshStandardMaterial({ color: 0x050303, roughness: 1 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -1.5; floor.receiveShadow = true; sc.add(floor);
    const ring = new T.Mesh(new T.RingGeometry(1.1, 1.13, 64), new T.MeshBasicMaterial({ color: 0x2a1e10, side: T.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.002; sc.add(ring);
    const mats = {}, haloTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gd = g.createRadialGradient(32, 32, 2, 32, 32, 31); gd.addColorStop(0, 'rgba(255,255,255,1)'); gd.addColorStop(0.3, 'rgba(255,255,255,.55)'); gd.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gd; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c); })();
    const moteMat = k => mats[k] || (mats[k] = new T.SpriteMaterial({ map: haloTex, color: MOTEC[k], transparent: true, depthTest: false, depthWrite: false, blending: T.AdditiveBlending }));
    const st = { tool: 'cut', xray: true, linen: false, acc: 0, yaw: 0.9, pit: 0.62, dist: 2.35, tx: 0, ty: 0.08, tz: 0, pieces: [], sel: null, hist: [], id: 0, drag: null };
    const baseOg = { rar, q: 0.6 };
    // ---- 实体 ----
    function recenter(p) { const bb = bbOf(p.part.sets), c = bb.getCenter(new V3()); for (const s of p.part.sets) for (let i = 0; i < s.V.length; i += S) { s.V[i] -= c.x; s.V[i + 1] -= c.y; s.V[i + 2] -= c.z; s._g = null; } for (const pt of p.part.pts) { pt.p = [pt.p[0] - c.x, pt.p[1] - c.y, pt.p[2] - c.z]; } for (const b of p.part.bones || []) { b.a = [b.a[0] - c.x, b.a[1] - c.y, b.a[2] - c.z]; b.b = [b.b[0] - c.x, b.b[1] - c.y, b.b[2] - c.z]; } if (p.part.rig) p.part.rig.off = p.part.rig.off.map((v, i) => v - c.getComponent(i)); p.part.bb = bb.translate(c.clone().negate()); return c; }
    function geoOf(s) { if (s._g) return s._g; const V = s.V, n = V.length / S, P = new Float32Array(n * 3), N = new Float32Array(n * 3), Ca = new Float32Array(n * 3), Cb = new Float32Array(n * 3), U = new Float32Array(n * 2), W1 = new Float32Array(n), W0 = new Float32Array(n), CP = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) { for (let k = 0; k < 3; k++) { P[i * 3 + k] = V[i * S + k]; N[i * 3 + k] = V[i * S + 3 + k]; Ca[i * 3 + k] = V[i * S + 6 + k]; Cb[i * 3 + k] = V[i * S + 9 + k]; } U[i * 2] = V[i * S + 12]; U[i * 2 + 1] = V[i * S + 13]; W1[i] = V[i * S + 14]; CP[i * 2] = V[i * S + 15]; CP[i * 2 + 1] = V[i * S + 16]; }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('normal', new T.BufferAttribute(N, 3)); g.setAttribute('color', new T.BufferAttribute(Ca, 3)); g.setAttribute('uv', new T.BufferAttribute(U, 2)); g.setAttribute('tw', new T.BufferAttribute(W1, 1)); g.setAttribute('cp', new T.BufferAttribute(CP, 2)); g.setIndex(new T.BufferAttribute(n > 65000 ? new Uint32Array(s.I) : new Uint16Array(s.I), 1)); g.userData.ca = g.attributes.color; g.userData.cb = new T.BufferAttribute(Cb, 3); g.userData.w1 = g.attributes.tw; g.userData.w0 = new T.BufferAttribute(W0, 1); g.computeBoundingSphere(); g.computeBoundingBox(); return (s._g = g); }
    const setLinen = (s, geo) => { const l = st.linen && s.cloth; geo.setAttribute('color', l ? geo.userData.cb : geo.userData.ca); geo.setAttribute('tw', l ? geo.userData.w0 : geo.userData.w1); };
    function build(p) { // 由 p.part 生成 Three 对象
      const g = new T.Group(); p.mats = []; p.meshes = []; for (const s of p.part.sets) { const geo = geoOf(s); setLinen(s, geo); const mt = mkMat(s.map, s.at); p.mats.push(mt); const m = new T.Mesh(geo, mt); m.userData.piece = p; m.castShadow = true; g.add(m); p.meshes.push(m); }
      p.motes = []; for (const pt of p.part.pts) { const sp = new T.Sprite(moteMat(AFX[pt.a.id].k)); sp.position.set(...pt.p); const sz = 0.032 + pt.a.t * 0.008; sp.scale.set(sz, sz, 1); sp.renderOrder = 20; sp.userData.pt = pt; g.add(sp); p.motes.push(sp); const core = new T.Mesh(new T.SphereGeometry(0.0075, 8, 6), new T.MeshBasicMaterial({ color: 0xffffff, depthTest: false })); core.position.copy(sp.position); core.renderOrder = 21; g.add(core); p.motes.push(core); }
      p.boneLine = null; const bs = p.part.bones || []; if (bs.length) { const pos = new Float32Array(bs.length * 6); bs.forEach((b, i) => { pos.set(b.a, i * 6); pos.set(b.b, i * 6 + 3); }); const bg = new T.BufferGeometry(); bg.setAttribute('position', new T.BufferAttribute(pos, 3)); const bl = new T.LineSegments(bg, new T.LineBasicMaterial({ color: 0xf2e6c4, transparent: true, opacity: 0.8, depthTest: false })); bl.renderOrder = 19; g.add(bl); p.boneLine = bl; }
      p.name = pieceName(p.part); return g;
    }
    function addPiece(part, pos, quat) { const p = { id: ++st.id, part, take: false, obj: null }; const c = recenter(p); p.obj = build(p); p.obj.quaternion.copy(quat); p.obj.position.copy(pos).add(c.clone().applyQuaternion(quat)); initRB(p); sc.add(p.obj); st.pieces.push(p); applyXray(); return p; }
    function removePiece(p) { sc.remove(p.obj); p.mats.forEach(m => m.dispose()); const i = st.pieces.indexOf(p); if (i >= 0) st.pieces.splice(i, 1); if (st.sel === p) st.sel = null; }
    function applyXray() { for (const p of st.pieces) if (p.boneLine) p.boneLine.visible = st.xray; for (const k in mats) mats[k].depthTest = !st.xray; for (const p of st.pieces) for (const m of p.motes) { if (m.isMesh) m.material.depthTest = !st.xray; m.visible = true; } }
    function snap(lin) { st.hist.push({ lin: !!lin, linen: st.linen, ps: st.pieces.map(p => ({ part: p.part, pos: p.obj.position.clone(), q: p.obj.quaternion.clone(), take: p.take })) }); if (st.hist.length > 12) st.hist.shift(); }
    function restore(h) { for (const p of st.pieces.slice()) removePiece(p); for (const e of h.ps) { const p = addPiece(e.part, new V3(), new T.Quaternion()); p.obj.position.copy(e.pos); p.obj.quaternion.copy(e.q); p.take = e.take; p.rb.sleep = 0; p.rb.calm = 0; } st.linen = h.linen; const cl = root.querySelector('#apCl'); if (cl) cl.textContent = st.linen ? '素衣' : '原衣'; st.sel = null; ui(); }
    function worldMinY(p) { p.obj.updateMatrixWorld(true); let mn = 1e9; const v = new V3(); for (const m of p.meshes) { const pa = m.geometry.attributes.position, mw = p.obj.matrixWorld; for (let i = 0; i < pa.count; i += 2) { v.fromBufferAttribute(pa, i).applyMatrix4(mw); if (v.y < mn) mn = v.y; } } return mn; }
    function dropTo(p) { p.obj.position.y -= worldMinY(p); }
    // ---- 物理：刚体（重力 / 台面 / 地面 / 块与块碰撞 / 抓起） ----
    const G0 = 9.8, TR = 1.22, FLOORY = -1.5, HS = 1 / 120, MU = 0.7, UP = new V3(0, 1, 0), RBM = new T.Matrix4();
    const _a = new V3(), _t = new V3(), _t2 = new V3(), _t3 = new V3(), _v1 = new V3(), _v2 = new V3(), _vt = new V3(), _J = new V3(), _r2 = new V3(), _l = new V3(), _n = new V3(), _qi = new T.Quaternion();
    const RDIRS = (() => { const out = [], seen = new Set(); for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) for (let z = -2; z <= 2; z++) { if (!x && !y && !z) continue; const m = Math.max(Math.abs(x), Math.abs(y), Math.abs(z)); if (m === 2 && (Math.abs(x) === 2 ? 1 : 0) + (Math.abs(y) === 2 ? 1 : 0) + (Math.abs(z) === 2 ? 1 : 0) > 1) continue; if (Math.abs(x) + Math.abs(y) + Math.abs(z) > 4) continue; const d = new V3(x, y, z).normalize(), k = d.toArray().map(v => v.toFixed(2)).join(); if (seen.has(k)) continue; seen.add(k); out.push(d); } return out; })();
    function hullOf(part) { if (part.hull) return part.hull; const D = RDIRS, bd = new Float32Array(D.length).fill(-1e9), bi = new Array(D.length).fill(null);
      for (const s of part.sets) { if (s.cap === 2) continue; const V = s.V; for (let i = 0; i < V.length; i += S) { const x = V[i], y = V[i + 1], z = V[i + 2]; for (let k = 0; k < D.length; k++) { const d = D[k].x * x + D[k].y * y + D[k].z * z; if (d > bd[k]) { bd[k] = d; bi[k] = [x, y, z]; } } } }
      const seen = new Set(), out = []; for (const q of bi) { if (!q) continue; const key = q.map(v => v.toFixed(3)).join(); if (seen.has(key)) continue; seen.add(key); out.push(new V3(q[0], q[1], q[2])); } return (part.hull = out.length ? out : [new V3()]); }
    function initRB(p) { const bb = p.part.bb, sz = bb.getSize(new V3()), sx = Math.max(sz.x, 0.05), sy = Math.max(sz.y, 0.05), sz2 = Math.max(sz.z, 0.05), hull = hullOf(p.part), mass = clamp(sx * sy * sz2 * 350, 0.3, 70);
      p.rb = { v: new V3(), w: new V3(), hull, rw: hull.map(() => new V3()), iw: new Float64Array(9), I: new V3((sy * sy + sz2 * sz2) / 12, (sx * sx + sz2 * sz2) / 12, (sx * sx + sy * sy) / 12), im: 1 / mass, mass, rad: sz.length() / 2, bmin: bb.min.clone(), bmax: bb.max.clone(), sleep: 1, calm: 0, frozen: false, ign: new Set() }; }
    function prep(p) { const b = p.rb, R = RBM.makeRotationFromQuaternion(p.obj.quaternion).elements;
      for (let i = 0; i < b.hull.length; i++) { const h = b.hull[i]; b.rw[i].set(R[0] * h.x + R[4] * h.y + R[8] * h.z, R[1] * h.x + R[5] * h.y + R[9] * h.z, R[2] * h.x + R[6] * h.y + R[10] * h.z); }
      const I0 = 1 / b.I.x, I1 = 1 / b.I.y, I2 = 1 / b.I.z, m = b.iw; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m[i * 3 + j] = R[i] * R[j] * I0 + R[4 + i] * R[4 + j] * I1 + R[8 + i] * R[8 + j] * I2; }
    const iwMul = (b, v, o) => { const m = b.iw; return o.set(m[0] * v.x + m[1] * v.y + m[2] * v.z, m[3] * v.x + m[4] * v.y + m[5] * v.z, m[6] * v.x + m[7] * v.y + m[8] * v.z); };
    const pvel = (b, r, o) => o.set(b.v.x + b.w.y * r.z - b.w.z * r.y, b.v.y + b.w.z * r.x - b.w.x * r.z, b.v.z + b.w.x * r.y - b.w.y * r.x);
    const applyJ = (b, r, J) => { b.v.addScaledVector(J, b.im); _t.crossVectors(r, J); iwMul(b, _t, _t2); b.w.addScaledVector(_t2, b.im); };
    const effM = (b, r, n) => { _t.crossVectors(r, n); iwMul(b, _t, _t2); _t3.crossVectors(_t2, r); return b.im * (1 + _t3.dot(n)); };
    function solve2(A, rA, B, rB, n, e) { // 接触冲量（B 为 null＝静止的台面）；n 由 B 指向 A
      pvel(A, rA, _v1); if (B) { pvel(B, rB, _v2); _v1.sub(_v2); } const vn = _v1.dot(n); if (vn >= 0) return 0;
      let den = effM(A, rA, n) + (B ? effM(B, rB, n) : 0); const j = -(1 + (vn < -1.2 ? e : 0)) * vn / den; _J.copy(n).multiplyScalar(j); applyJ(A, rA, _J); if (B) { _J.negate(); applyJ(B, rB, _J); }
      _vt.copy(_v1).addScaledVector(n, -vn); const sp = _vt.length(); if (sp > 1e-4) { _vt.multiplyScalar(1 / sp); den = effM(A, rA, _vt) + (B ? effM(B, rB, _vt) : 0); const jt = Math.min(sp / den, MU * j); _J.copy(_vt).multiplyScalar(-jt); applyJ(A, rA, _J); if (B) { _J.negate(); applyJ(B, rB, _J); } }
      return j; }
    const awake = p => !(p.rb.sleep && !p.held) && !p.rb.frozen;
    function wake(p) { p.rb.sleep = 0; p.rb.calm = 0; }
    function ptsIn(pa, pb, resolve, best) { // pa 的凸包点落进 pb 的局部包围盒 → 接触
      const A = pa.rb, B = pb.rb, bb0 = B.bmin, bb1 = B.bmax, m = 0.004; _qi.copy(pb.obj.quaternion).invert(); let cnt = 0;
      for (let i = 0; i < A.hull.length; i++) { const r = A.rw[i]; _l.set(pa.obj.position.x + r.x - pb.obj.position.x, pa.obj.position.y + r.y - pb.obj.position.y, pa.obj.position.z + r.z - pb.obj.position.z); const wx = _l.x, wy = _l.y, wz = _l.z; _l.applyQuaternion(_qi);
        if (_l.x > bb0.x + m && _l.x < bb1.x - m && _l.y > bb0.y + m && _l.y < bb1.y - m && _l.z > bb0.z + m && _l.z < bb1.z - m) { cnt++; if (!resolve) continue;
          const c = [_l.x - bb0.x, bb1.x - _l.x, _l.y - bb0.y, bb1.y - _l.y, _l.z - bb0.z, bb1.z - _l.z]; let k = 0; for (let q = 1; q < 6; q++) if (c[q] < c[k]) k = q; _n.set(0, 0, 0); _n.setComponent(k >> 1, k & 1 ? 1 : -1); _n.applyQuaternion(pb.obj.quaternion);
          _r2.set(wx, wy, wz); solve2(A, r, B, _r2, _n, 0.1); if (c[k] > best.pen) { best.pen = c[k]; best.n.copy(_n); } } }
      return cnt; }
    function rbStep(h) {
      const ps = st.pieces; for (const p of ps) prep(p);
      for (const p of ps) { const b = p.rb; if (b.frozen) { b.v.set(0, 0, 0); b.w.set(0, 0, 0); continue; } if (!awake(p)) continue; b.v.y -= G0 * h;
        if (p.held) { const H = p.held; _t.copy(H.a).applyQuaternion(p.obj.quaternion); const r = _r2.copy(_t); pvel(b, r, _v1); _a.copy(H.t).sub(p.obj.position).sub(r).multiplyScalar(110).addScaledVector(_v1, -15); const l = _a.length(); if (l > 70) _a.multiplyScalar(70 / l); b.v.addScaledVector(_a, h); _t3.crossVectors(r, _a); iwMul(b, _t3, _t2); b.w.addScaledVector(_t2, h); b.sleep = 0; }
        b.v.multiplyScalar(1 - 0.05 * h); b.w.multiplyScalar(1 - 1.5 * h); }
      for (let it = 0; it < 3; it++) {
        for (const p of ps) { if (!awake(p)) continue; const b = p.rb, px = p.obj.position.x, py = p.obj.position.y, pz = p.obj.position.z;
          for (let i = 0; i < b.rw.length; i++) { const r = b.rw[i], y = py + r.y, x = px + r.x, z = pz + r.z; if ((y < 0 && y > -0.3 && x * x + z * z < TR * TR) || (y < FLOORY && y > FLOORY - 0.6)) solve2(b, r, null, null, UP, 0.2); } }
        for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) { const A = ps[i], B = ps[j]; if (A.rb.frozen || B.rb.frozen || (!awake(A) && !awake(B))) continue; if (A.obj.position.distanceTo(B.obj.position) > A.rb.rad + B.rb.rad) continue;
          if (A.rb.ign.has(B.id) || B.rb.ign.has(A.id)) { if (it === 0) { const bs = { pen: 0, n: new V3() }; if (!ptsIn(A, B, false, bs) && !ptsIn(B, A, false, bs)) { A.rb.ign.delete(B.id); B.rb.ign.delete(A.id); } } continue; }
          const bs = { pen: 0, n: new V3() }, cn = ptsIn(A, B, true, bs); const bs2 = { pen: 0, n: new V3() }, cn2 = ptsIn(B, A, true, bs2);
          if (cn || cn2) { wake(A); wake(B); if (it === 2) { const useA = bs.pen >= bs2.pen, pen = Math.min(0.05, useA ? bs.pen : bs2.pen), n = useA ? bs.n : bs2.n.clone().negate(), ia = awake(A) ? A.rb.im : 0, ib = awake(B) ? B.rb.im : 0, tot = ia + ib || 1; A.obj.position.addScaledVector(n, pen * 0.6 * ia / tot); B.obj.position.addScaledVector(n, -pen * 0.6 * ib / tot); } } }
      }
      for (const p of ps) { const b = p.rb; if (!awake(p)) continue; let dep = 0; for (let i = 0; i < b.rw.length; i++) { const r = b.rw[i], y = p.obj.position.y + r.y, x = p.obj.position.x + r.x, z = p.obj.position.z + r.z; if (y < 0 && y > -0.3 && x * x + z * z < TR * TR) dep = Math.max(dep, -y); else if (y < FLOORY && y > FLOORY - 0.6) dep = Math.max(dep, FLOORY - y); } if (dep > 0.002) p.obj.position.y += Math.min(0.08, dep - 0.001) * 0.7;
        p.obj.position.addScaledVector(b.v, h); const q = p.obj.quaternion, w = b.w, hh = h * 0.5, qx = q.x, qy = q.y, qz = q.z, qw = q.w; q.set(qx + hh * (w.x * qw + w.y * qz - w.z * qy), qy + hh * (w.y * qw + w.z * qx - w.x * qz), qz + hh * (w.z * qw + w.x * qy - w.y * qx), qw - hh * (w.x * qx + w.y * qy + w.z * qz)).normalize();
        if (!p.held && b.v.length() < 0.05 && b.w.length() < 0.3) { b.calm += h; if (b.calm > 0.5) { b.sleep = 1; b.v.set(0, 0, 0); b.w.set(0, 0, 0); } } else b.calm = 0; }
    }
    const physics = dt => { st.acc = Math.min(st.acc + dt, 0.08); while (st.acc >= HS) { rbStep(HS); if (rd) rdStep(HS); st.acc -= HS; } if (rd) rdFrame(); };
    // ---- 视角 / 输入 ----
    const ray = new T.Raycaster(), ndc = new T.Vector2(), lineEl = root.querySelector('#apL'), tt = root.querySelector('#apTt'), tip = root.querySelector('#apTip');
    const setNdc = (x, y) => { const r = cv.getBoundingClientRect(); ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam); return ray; };
    const allMeshes = () => st.pieces.flatMap(p => p.meshes), pickPiece = (x, y) => { cam.updateMatrixWorld(); st.pieces.forEach(p => p.obj.updateMatrixWorld(true)); const h = setNdc(x, y).intersectObjects(allMeshes(), false)[0]; return h ? { p: h.object.userData.piece, pt: h.point } : null; };
    const hints = { cut: '🔪 按住左键在身体上划线——可以拐弯、可以随时改方向；金点是落在身体上的刀路，虚线是刀会继续延伸的路径。松手，刀就沿线切过去（切面穿透视线方向；转视角再切＝另一个角度）。', move: '🤲 抓住一块拖动＝举起它（有重量、会晃），松手就掉落；别把它摔出台子。', rot: '🔄 拖动一块来旋转它，松手后会按物理落回台面。', pose: '🧍 抓住身上的关节（青色亮点）拖动：手脚会被牵着走，躯干是一整块，膝和肘只能往正确的方向弯。摆好点「固定姿势」，之后再切、再带走，姿势都会留着。' };
    const toast = (t) => { const e = root.querySelector('#apTs'); e.textContent = t; e.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => e.style.display = 'none', 2200); };
    function setTool(t) { if (st.tool === 'pose' && t !== 'pose') endPose(true); if (t === 'pose' && !startPose()) return; st.tool = t; root.querySelector('#apPb').style.display = t === 'pose' ? 'flex' : 'none'; root.querySelectorAll('[data-tool]').forEach(e => e.classList.toggle('on', e.dataset.tool === t)); tip.textContent = hints[t]; }
    function curveTool(path, p) {
      const cu = makeCurve(path); if (!cu) return null; cam.updateMatrixWorld(); p.obj.updateMatrixWorld(true);
      const e = new T.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse).multiply(p.obj.matrixWorld).elements, rc = cv.getBoundingClientRect(); let sw = 1;
      const fn = (x, y, z) => { let cw = e[3] * x + e[7] * y + e[11] * z + e[15]; if (Math.abs(cw) < 1e-5) cw = 1e-5; sw = cw; const iw = 1 / cw; return cu.at(rc.left + ((e[0] * x + e[4] * y + e[8] * z + e[12]) * iw + 1) / 2 * rc.width, rc.top + (1 - (e[1] * x + e[5] * y + e[9] * z + e[13]) * iw) / 2 * rc.height); };
      return { fn, proj: (x, y, z) => { fn(x, y, z); return [cu.s, sw * 400]; }, nrm: (x, y, z) => { const g = 0.004, a = fn(x + g, y, z) - fn(x - g, y, z), b = fn(x, y + g, z) - fn(x, y - g, z), c = fn(x, y, z + g) - fn(x, y, z - g), l = Math.hypot(a, b, c); return l > 1e-9 ? [a / l, b / l, c / l] : [0, 1, 0]; } };
    }
    function doCut(x1, y1, x2, y2) { doCutPath([[x1, y1], [x2, y2]]); }
    function doCutPath(path) {
      if (!path || path.length < 2) return; if (rd) { endPose(true); setTool('cut'); } const A = path[0], Z = path[path.length - 1], chord = Math.hypot(Z[0] - A[0], Z[1] - A[1]); if (chord < 24) return;
      let dev = 0; for (const q of path) dev = Math.max(dev, Math.abs((q[0] - A[0]) * (Z[1] - A[1]) - (q[1] - A[1]) * (Z[0] - A[0])) / chord); const curved = path.length > 3 && dev > Math.max(10, chord * 0.05);
      cam.updateMatrixWorld(); const o = cam.position.clone(), d1 = setNdc(A[0], A[1]).ray.direction.clone(), d2 = setNdc(Z[0], Z[1]).ray.direction.clone(), n = new V3().crossVectors(d1, d2).normalize(); if (!curved && (!isFinite(n.x) || n.lengthSq() < 0.5)) return; const d = -n.dot(o);
      const hit = new Set(); st.pieces.forEach(p => p.obj.updateMatrixWorld(true)); const N = 30; for (let k = 0; k <= N; k++) { const f = k / N * (path.length - 1), a = Math.floor(f), b = Math.min(path.length - 1, a + 1), t = f - a, x = path[a][0] + (path[b][0] - path[a][0]) * t, y = path[a][1] + (path[b][1] - path[a][1]) * t, h = setNdc(x, y).intersectObjects(allMeshes(), false)[0]; if (h) hit.add(h.object.userData.piece); }
      if (!hit.size) { toast('这一刀没碰到身体——从身体上划过去'); return; }
      const jobs = []; for (const p of hit) { let tool; if (curved) tool = curveTool(path, p); else { const qi = p.obj.quaternion.clone().invert(); tool = planeTool(n.clone().applyQuaternion(qi), d + n.dot(p.obj.position)); } if (!tool) continue; const r = cutPart(p.part, tool); if (r) jobs.push({ p, r }); }
      if (!jobs.length) { toast('没切开——线要完整穿过一块'); return; }
      snap(); for (const j of jobs) { const p = j.p, q = p.obj.quaternion.clone(), pos = p.obj.position.clone(), nw = []; removePiece(p); [0, 1].forEach(k => j.r[k].forEach(part => { const np = addPiece(part, pos, q); np.take = false; wake(np); nw.push(np); }));
        for (const a of nw) { for (const b of nw) if (a !== b) a.rb.ign.add(b.id); const dv = a.obj.position.clone().sub(pos); dv.y = 0; if (dv.length() < 0.02) dv.set(n.x, 0, n.z); if (dv.lengthSq() < 1e-6) dv.set(1, 0, 0); a.rb.v.copy(dv.normalize().multiplyScalar(0.32)); } }
      AT.chop(); ui(); toast(`✂ ${curved ? '沿曲线' : ''}切开了：现在有 ${st.pieces.length} 块`);
    }
    // ---- 划线预览（落在身体表面的光点）+ 刀的动画 ----
    const guide = new T.Group(); sc.add(guide); const gMat = new T.SpriteMaterial({ map: haloTex, color: 0xffd27a, transparent: true, depthTest: false, depthWrite: false, blending: T.AdditiveBlending });
    const addGuide = pt => { if (guide.children.length > 220) return; const sp = new T.Sprite(gMat); sp.position.copy(pt); sp.scale.set(0.05, 0.05, 1); sp.renderOrder = 18; guide.add(sp); };
    const clearGuide = () => { while (guide.children.length) guide.remove(guide.children[0]); };
    const extEl = root.querySelector('#apLx'), knEl = root.querySelector('#apKn');
    function denseExt(path) { const cu = makeCurve(path); if (!cu) return []; const rc = cv.getBoundingClientRect(), P = cu.P, out = [];
      for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(l / 10)); for (let j = 0; j < n; j++) { const x = a[0] + (b[0] - a[0]) * j / n, y = a[1] + (b[1] - a[1]) * j / n; if (x > rc.left - 60 && x < rc.right + 60 && y > rc.top - 60 && y < rc.bottom + 60) out.push([x, y]); } }
      return out; }
    function runKnife(path, after) { // 刀沿着你划的线（含两端延长）切过去，动画结束时才真正切开
      const pts = denseExt(path); if (pts.length < 4) { after(); return; } st.busy = true; extEl.setAttribute('display', 'none'); knEl.style.display = 'block';
      const total = pts.length, dur = clamp(total * 10 / 1500, 0.5, 1.2) * 1000, t0 = performance.now();
      const step = now => { if (!UI) return; const f = Math.min(1, (now - t0) / dur), e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2, i = Math.min(total - 1, Math.floor(e * (total - 1)));
        lineEl.setAttribute('points', pts.slice(0, i + 1).map(q => q[0] + ',' + q[1]).join(' ')); lineEl.setAttribute('display', 'block');
        const a = pts[i], b = pts[Math.min(total - 1, i + 3)], c = pts[Math.max(0, i - 3)], ang = Math.atan2(b[1] - c[1], b[0] - c[0]) * 180 / Math.PI; knEl.style.transform = `translate(${a[0] - 126}px,${a[1] - 22}px) rotate(${ang}deg)`;
        if (f < 1) requestAnimationFrame(step); else { knEl.style.display = 'none'; lineEl.setAttribute('display', 'none'); clearGuide(); st.busy = false; after(); } };
      requestAnimationFrame(step); }
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => { if (st.busy) return; cv.setPointerCapture(e.pointerId); const rb = e.button === 2 || e.button === 1; st.drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, rb, shift: e.shiftKey, moved: false, path: [[e.clientX, e.clientY]] };
      if (!rb && st.tool === 'pose') { poseDown(e); return; }
      if (!rb && st.tool !== 'cut') { const h = pickPiece(e.clientX, e.clientY); if (h) { const p = h.p; st.drag.piece = p; st.sel = p; ui(); wake(p);
        if (st.tool === 'move') { p.obj.updateMatrixWorld(true); const fw = new V3(); cam.getWorldDirection(fw); st.drag.pl = new T.Plane().setFromNormalAndCoplanarPoint(fw, h.pt); p.held = { a: p.obj.worldToLocal(h.pt.clone()), t: h.pt.clone() }; toast('🤲 抓住了「' + p.name + '」——拖动＝举起，松手＝掉落'); } else p.rb.frozen = true; } } });
    cv.addEventListener('pointermove', e => { const D = st.drag; if (!D) { hover(e); return; } const dx = e.clientX - D.lx, dy = e.clientY - D.ly; D.lx = e.clientX; D.ly = e.clientY; if (Math.hypot(e.clientX - D.x, e.clientY - D.y) > 5) D.moved = true;
      if (D.rb) { if (D.shift) { const k = st.dist * 0.0014, r = new V3().setFromMatrixColumn(cam.matrixWorld, 0); st.tx -= r.x * dx * k; st.tz -= r.z * dx * k; st.ty = clamp(st.ty + dy * k, -0.2, 1); } else { st.yaw -= dx * 0.008; st.pit = clamp(st.pit + dy * 0.006, 0.05, 1.5); } return; }
      if (D.pg) { poseMove(e); return; }
      if (st.tool === 'cut') { const l = D.path[D.path.length - 1]; if (Math.hypot(e.clientX - l[0], e.clientY - l[1]) >= 4) D.path.push([e.clientX, e.clientY]); lineEl.setAttribute('points', D.path.map(q => q[0] + ',' + q[1]).join(' ') + ' ' + e.clientX + ',' + e.clientY); lineEl.setAttribute('display', D.moved ? 'block' : 'none');
        if (D.moved) { const now = performance.now(); if (now - (st.gt || 0) > 70) { st.gt = now; const h = pickPiece(e.clientX, e.clientY); if (h) addGuide(h.pt); const dd = denseExt(D.path.concat([[e.clientX, e.clientY]])); extEl.setAttribute('points', dd.map(q => q[0] + ',' + q[1]).join(' ')); extEl.setAttribute('display', 'block'); } } }
      else if (D.piece) { const p = D.piece; if (st.tool === 'move') { const hp = new V3(); if (setNdc(e.clientX, e.clientY).ray.intersectPlane(D.pl, hp)) { hp.y = clamp(hp.y, -1.2, 2.4); if (p.held) p.held.t.copy(hp); wake(p); } } else { const r = new V3().setFromMatrixColumn(cam.matrixWorld, 0); p.obj.rotateOnWorldAxis(new V3(0, 1, 0), dx * 0.01); p.obj.rotateOnWorldAxis(r, dy * 0.01); } } });
    const endDrag = e => { const D = st.drag; st.drag = null; if (!D) return; if (D.rb) { lineEl.setAttribute('display', 'none'); return; } if (D.pg) { poseUp(); return; } if (!(st.tool === 'cut' && D.moved)) lineEl.setAttribute('display', 'none');
      if (D.piece) { const p = D.piece; if (p.held) { p.held = null; wake(p); } if (p.rb.frozen) { p.rb.frozen = false; wake(p); } if (!D.moved) { st.sel = p; ui(); } return; }
      if (st.tool === 'cut') { if (D.moved && Math.hypot(e.clientX - D.x, e.clientY - D.y) > 24) { D.path.push([e.clientX, e.clientY]); const pth = D.path.slice(); runKnife(pth, () => doCutPath(pth)); } else { clearGuide(); extEl.setAttribute('display', 'none'); lineEl.setAttribute('display', 'none'); const h = pickPiece(e.clientX, e.clientY); st.sel = h ? h.p : null; ui(); } }
      else if (!D.moved) { const h = pickPiece(e.clientX, e.clientY); st.sel = h ? h.p : null; ui(); } };
    cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
    cv.addEventListener('wheel', e => { e.preventDefault(); st.dist = clamp(st.dist * (1 + Math.sign(e.deltaY) * 0.1), 0.8, 7); }, { passive: false });
    function hover(e) { setNdc(e.clientX, e.clientY); const ms = []; for (const p of st.pieces) for (const m of p.motes) if (m.isSprite) ms.push(m); cam.updateMatrixWorld(); st.pieces.forEach(p => p.obj.updateMatrixWorld(true)); const h = ray.intersectObjects(ms, false)[0];
      if (h && h.object.userData.pt) { const a = h.object.userData.pt.a, d = AFX[a.id]; tt.innerHTML = `${d.ic} ${d.n}　<span style="color:${TC[d.k]}">${affText(a, baseOg)}</span>　<small style="color:#a99d88">${'★'.repeat(a.t)}</small>`; tt.style.display = 'block'; tt.style.left = Math.min(innerWidth - 360, e.clientX + 16) + 'px'; tt.style.top = e.clientY + 16 + 'px'; } else tt.style.display = 'none'; }
    // ---- 面板 ----
    const chips = p => { const m = {}; for (const pt of p.part.pts) { const k = pt.a.id; (m[k] = m[k] || []).push(pt.a); } return Object.entries(m).map(([k, v]) => { const d = AFX[k], a = { id: k, m: v.reduce((s, x) => s + x.m, 0) }; return `<span style="color:${TC[d.k]}">${d.ic} ${d.n}${v.length > 1 ? '×' + v.length : ''} · ${affText(a, baseOg)}</span>`; }).join(''); };
    function ui() { const pn = root.querySelector('#apPn'), tk = st.pieces.filter(p => p.take).length;
      let cells = 0; st.pieces.forEach(p => { if (p.take) { const z = p.part.bb.getSize(new V3()), c = cellsOf([z.x, z.y, z.z]); cells += c[0] * c[1]; } }); let bag = ''; try { const u = window.Sack && Sack.usage && Sack.usage(); if (u) { const free = u[1] - u[0]; bag = `<div class="bagn ${cells > free ? 'bad' : ''}">🎒 麻袋空位 <b>${free}</b> 格 · 已选占 <b>${cells}</b> 格</div>`; } } catch (e) { }
      pn.innerHTML = `<h2>🧩 切下的块 · ${st.pieces.length}</h2>${bag}` + st.pieces.map(p => { const sz = p.part.bb.getSize(new V3()); const mx = Math.round(Math.max(sz.x, sz.y, sz.z) * 100), cl = cellsOf([sz.x, sz.y, sz.z]); return `<div class="pc ${st.sel === p ? 'sel' : ''} ${p.take ? 'tk' : ''}" data-p="${p.id}"><div class="t"><b>${esc(p.name)}</b><small>长 ${mx} cm</small></div><div class="gdw"><span class="gd" style="grid-template-columns:repeat(${cl[0]},15px)">${'<i></i>'.repeat(cl[0] * cl[1])}</span><b>占 ${cl[0]}×${cl[1]} 格</b></div>${p.part.pts.length ? `<div class="ch">${chips(p)}</div>` : '<div class="no">没有词条（可炼化成魂尘）</div>'}<button data-take="${p.id}">${p.take ? '✓ 已选取走' : '取走这块'}</button></div>`; }).join('');
      const g = root.querySelector('#apGo'); g.disabled = !tk; g.textContent = tk ? `完成 · 取走 ${tk} 块` : '完成'; st.pieces.forEach(p => { p.mats.forEach(m => m.emissive.setHex(p === st.sel ? 0x4a2a10 : p.take ? 0x2a1a08 : 0)); }); const pt = root.querySelector('[data-tool=pose]'); if (pt) pt.classList.toggle('off', !canPose()); }
    root.addEventListener('click', e => { const pb = e.target.closest('[data-pb]'); if (pb) { if (pb.dataset.pb === 'lock') { endPose(true); setTool('cut'); } else rdReset(); return; } const t = e.target.closest('[data-tool]'); if (t) { setTool(t.dataset.tool); return; } const a = e.target.closest('[data-act]'); if (a) { act(a.dataset.act, a); return; }
      const tk = e.target.closest('[data-take]'); if (tk) { const p = st.pieces.find(x => x.id == tk.dataset.take); if (p) { if (!p.take && st.pieces.filter(x => x.take).length >= 8) { toast('最多一次带走 8 块'); return; } p.take = !p.take; ui(); } return; }
      const pc = e.target.closest('[data-p]'); if (pc) { st.sel = st.pieces.find(x => x.id == pc.dataset.p) || null; ui(); return; }
      if (e.target.id === 'apX') close(); else if (e.target.id === 'apGo') finish(); });
    function act(k, el) { if (k === 'xray') { st.xray = !st.xray; el.classList.toggle('on', st.xray); applyXray(); } else if (k === 'undo') { if (rd) { endPose(false); setTool('cut'); toast('放弃了这次摆姿势'); return; } if (st.hist.length) restore(st.hist.pop()); else toast('没有可撤销的'); }
      else if (k === 'cloth') { if (rd) { endPose(true); setTool('cut'); } if (!B.hasCloth) { toast('这具身体没有可换的衣服（衣服画在贴图上，或没有成形的衣物）'); return; }
        if (st.linen) { const top = st.hist[st.hist.length - 1]; if (top && top.lin) restore(st.hist.pop()); else toast('换衣之后又切过——用 Ctrl+Z 逐步撤销可以穿回原衣'); return; }
        snap(true); const old = st.pieces.slice(); for (const p of old) { const np = linenize(p.part), pos = p.obj.position.clone(), q = p.obj.quaternion.clone(), tk = p.take, was = p.rb.sleep; removePiece(p); const n = addPiece(np, pos, q); n.take = tk; n.rb.sleep = was; }
        st.linen = true; root.querySelector('#apCl').textContent = '素衣'; ui(); toast('👕 换上了素麻衣（只保留躯干一段，不会脱光）'); } }
    const onKey = e => { if (!UI) return; if (e.type === 'keydown') { if (e.code === 'Escape') close(); else if (e.code === 'Digit1') setTool('cut'); else if (e.code === 'Digit2') setTool('move'); else if (e.code === 'Digit3') setTool('rot'); else if (e.code === 'Digit4') setTool('pose'); else if (e.code === 'KeyV') act('xray', root.querySelector('[data-act=xray]')); else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) act('undo'); else if (st.sel && (e.code === 'KeyQ' || e.code === 'KeyE')) { st.sel.obj.rotateOnWorldAxis(new V3(0, 1, 0), (e.code === 'KeyQ' ? 1 : -1) * Math.PI / 12); st.sel.obj.position.y += 0.03; wake(st.sel); } else if (st.sel && e.code === 'KeyF') { const r = new V3().setFromMatrixColumn(cam.matrixWorld, 0); st.sel.obj.rotateOnWorldAxis(r, Math.PI); st.sel.obj.position.y += 0.15; wake(st.sel); } } if (e.code !== 'F12') e.stopPropagation(); };
    addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true);
    // ---- 布娃娃：拖关节摆姿势（PBD 关节点 + 按原骨骼权重蒙皮），固定后把姿势写回网格 ----
    // 粒子：0 hips 1 spine 2 chest 3 upper 4 neck | 5/6 肩 7/8 髋 | 9/10 肘 11/12 腕 | 13/14 膝 15/16 踝 17/18 趾 | 19 胸前 20 胸后 21 腹前 22 腹后
    const PCL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 19, 20, 21, 22], SEGG = [null, [5, 9], [6, 10], [9, 11], [10, 12], [7, 13], [8, 14], [13, 15], [14, 16], [15, 17], [16, 18]], PARG = [-1, 0, 0, 1, 2, 0, 0, 5, 6, 7, 8];
    let rd = null;
    const canPose = () => st.pieces.length === 1 && !!st.pieces[0].part.rig && !st.busy;
    const segD = (x, y, z, A, B) => { const ax = B.x - A.x, ay = B.y - A.y, az = B.z - A.z, l2 = ax * ax + ay * ay + az * az || 1e-9; let t = ((x - A.x) * ax + (y - A.y) * ay + (z - A.z) * az) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t; return Math.hypot(x - (A.x + ax * t), y - (A.y + ay * t), z - (A.z + az * t)); };
    function startPose() {
      if (rd) return true; if (!canPose()) { toast(st.pieces.length > 1 ? '已经切开的身体没法再摆姿势——先用 Ctrl+Z 撤回到整具' : '这具身体的骨架不完整，摆不了姿势'); return false; }
      const p = st.pieces[0], rig = p.part.rig, jn = rig.jn, g = k => jn[k] ? new V3(jn[k][0], jn[k][1], jn[k][2]) : null, hips = g('hips'), neck = g('neck') || g('upperChest'), mid = t => hips.clone().lerp(neck, t);
      const P0 = [hips, g('spine') || mid(0.25), g('chest') || mid(0.5), g('upperChest') || mid(0.75), neck, g('leftUpperArm'), g('rightUpperArm'), g('leftUpperLeg'), g('rightUpperLeg'), g('leftLowerArm'), g('rightLowerArm'), g('leftHand'), g('rightHand'), g('leftLowerLeg'), g('rightLowerLeg'), g('leftFoot'), g('rightFoot')];
      const toe = (a, k) => g(k) || a.clone().add(new V3(0, -0.03, 0.12)); P0.push(toe(P0[15], 'leftToes'), toe(P0[16], 'rightToes'));
      const sets = p.part.sets.filter(s => s.rg); if (!sets.length) { toast('这具身体没有骨骼权重数据，摆不了姿势'); return false; }
      const ext = (c, hy, hx) => { let mn = 1e9, mx = -1e9; for (const s of sets) { const P = s.rg.P, sk = s.rg.sk, n = P.length / 3; for (let i = 0; i < n; i += 2) { if (sk[i * 4] !== 0 || sk[i * 4 + 1] < 0.6) continue; if (Math.abs(P[i * 3 + 1] - c.y) < hy && Math.abs(P[i * 3] - c.x) < hx) { const z = P[i * 3 + 2]; if (z < mn) mn = z; if (z > mx) mx = z; } } } return [isFinite(mn) && mn < 1e8 ? clamp(c.z - mn, 0.05, 0.13) : 0.08, isFinite(mx) && mx > -1e8 ? clamp(mx - c.z, 0.05, 0.13) : 0.08]; };
      const eC = ext(P0[2], 0.06, 0.12), eH = ext(P0[0], 0.06, 0.15), at = (c, z) => c.clone().add(new V3(0, 0, z));
      P0.push(at(P0[2], eC[1] - 0.04), at(P0[2], -(eC[0] - 0.04)), at(P0[0], eH[1] - 0.04), at(P0[0], -(eH[0] - 0.04)));
      // 每段的“粗细”：该段主导顶点到骨线的 70% 分位 → 粒子半径（用于台面/互相碰撞）
      const gd = Array.from({ length: 11 }, () => []); for (const s of sets) { const P = s.rg.P, sk = s.rg.sk, n = P.length / 3; for (let i = 0; i < n; i += 4) { const g1 = sk[i * 4]; if (!g1 || sk[i * 4 + 1] < 0.8) continue; const sg = SEGG[g1]; let B = P0[sg[1]]; if (g1 === 3 || g1 === 4) B = B.clone().add(B.clone().sub(P0[sg[0]]).normalize().multiplyScalar(0.09)); gd[g1].push(segD(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], P0[sg[0]], B)); } }
      const gi = gd.map(a => { if (a.length < 8) return 0.04; a.sort((x, y) => x - y); return clamp(a[Math.floor(a.length * 0.7)], 0.02, 0.1); });
      const RAD = [0.06, 0.06, 0.06, 0.05, 0.04, 0.05, 0.05, 0.06, 0.06, (gi[1] + gi[3]) * 0.45, (gi[2] + gi[4]) * 0.45, gi[3] * 0.8, gi[4] * 0.8, (gi[5] + gi[7]) * 0.45, (gi[6] + gi[8]) * 0.45, gi[9] * 0.9, gi[10] * 0.9, gi[9] * 0.7, gi[10] * 0.7, 0.04, 0.04, 0.04, 0.04];
      const W0 = [0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 1, 1, 1.6, 1.6, 0.8, 0.8, 1.2, 1.2, 2, 2, 0.25, 0.25, 0.25, 0.25];
      const CON = [], dist = (i, j) => P0[i].distanceTo(P0[j]), eq = (i, j) => CON.push([i, j, dist(i, j), 0]), mn = (i, j, f) => CON.push([i, j, dist(i, j) * f, 1]);
      for (const [a, b] of [[5, 9], [9, 11], [6, 10], [10, 12], [7, 13], [13, 15], [15, 17], [8, 14], [14, 16], [16, 18]]) eq(a, b);
      for (let a = 0; a < PCL.length; a++) for (let b = a + 1; b < PCL.length; b++) eq(PCL[a], PCL[b]);
      mn(5, 11, 0.42 * (dist(5, 9) + dist(9, 11)) / dist(5, 11)); mn(6, 12, 0.42 * (dist(6, 10) + dist(10, 12)) / dist(6, 12)); mn(7, 15, 0.4 * (dist(7, 13) + dist(13, 15)) / dist(7, 15)); mn(8, 16, 0.4 * (dist(8, 14) + dist(14, 16)) / dist(8, 16));
      // 碰撞对：同在躯干块内 / 相邻两跳以内的不算
      const adj = Array.from({ length: 24 }, () => new Set()), node = i => PCL.includes(i) ? 23 : i; for (const [a, b] of [[5, 9], [9, 11], [6, 10], [10, 12], [7, 13], [13, 15], [15, 17], [8, 14], [14, 16], [16, 18]]) { adj[node(a)].add(node(b)); adj[node(b)].add(node(a)); }
      const hop = (a, b) => { a = node(a); b = node(b); if (a === b) return 0; let fr = [a], seen = new Set([a]); for (let d = 1; d <= 3; d++) { const nx = []; for (const u of fr) for (const v of adj[u]) if (!seen.has(v)) { if (v === b) return d; seen.add(v); nx.push(v); } fr = nx; } return 9; };
      const PAIRS = []; for (let i = 0; i < 19; i++) for (let j = i + 1; j < 19; j++) { const hc = node(i) === 23 && node(j) === 23 ? 0 : hop(i, j); if (hc <= 1 || (node(i) !== 23 && node(j) !== 23 && hc <= 2)) continue; PAIRS.push([i, j, (RAD[i] + RAD[j]) * 0.9]); }
      const M = new T.Matrix4().compose(p.obj.position, p.obj.quaternion, new V3(1, 1, 1)), Mi = M.clone().invert(), off = new V3(...rig.off);
      const toW = r => r.clone().add(off).applyMatrix4(M), toR = w => w.clone().applyMatrix4(Mi).sub(off);
      const X = P0.map((r, i) => toW(rig.pp && rig.pp[i] ? new V3(...rig.pp[i]) : r)), XP = X.map(x => x.clone());
      // 基准坐标系（躯干）：y=髋→颈，x=左右髋肩连线
      const frame = (Q, qo) => { const up = Q[4].clone().sub(Q[0]).normalize(), rt = Q[5].clone().sub(Q[6]).add(Q[7].clone().sub(Q[8])); rt.addScaledVector(up, -rt.dot(up)).normalize(); const z = new V3().crossVectors(rt, up); return qo.setFromRotationMatrix(new T.Matrix4().makeBasis(rt, up, z)); };
      const cen = Q => { const c = new V3(); for (const i of PCL) c.add(Q[i]); return c.multiplyScalar(1 / PCL.length); };
      const qRest = frame(P0, new T.Quaternion()), C0 = cen(P0);
      // 词条光点 / 骨线的蒙皮绑定：取最近的网格顶点的权重；骨线端点直接绑最近的关节粒子
      const ptSk = rig.pts0.map(pp => { let bd = 1e9, bk = [0, 1, 0, 0]; for (const s of sets) { const P = s.rg.P, n = P.length / 3; for (let i = 0; i < n; i++) { const d = (P[i * 3] - pp[0]) ** 2 + (P[i * 3 + 1] - pp[1]) ** 2 + (P[i * 3 + 2] - pp[2]) ** 2; if (d < bd) { bd = d; bk = [s.rg.sk[i * 4], s.rg.sk[i * 4 + 1], s.rg.sk[i * 4 + 2], s.rg.sk[i * 4 + 3]]; } } } return bk; });
      const near = a => { let bi = 0, bd = 1e9; P0.forEach((q, i) => { const d = q.distanceToSquared(new V3(a[0], a[1], a[2])); if (d < bd) { bd = d; bi = i; } }); return bi; };
      const boneIx = rig.bones0.map(b => [near(b.a), near(b.b)]);
      // 蒙皮用的几何体：克隆一份，别弄脏缓存里的原始几何（撤销要用）
      const orig = p.meshes.map(m => m.geometry); p.meshes.forEach((m, i) => { const g2 = new T.BufferGeometry(); const a0 = orig[i].attributes; for (const k in a0) g2.setAttribute(k, a0[k].clone()); g2.setIndex(orig[i].index); g2.userData = orig[i].userData; g2.computeBoundingSphere(); g2.computeBoundingBox(); m.geometry = g2; m.frustumCulled = false; });
      const sp = new T.Group(), spm = new T.SpriteMaterial({ map: haloTex, color: 0x12d8c4, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false }); for (let i = 0; i < 19; i++) { const s = new T.Sprite(spm); s.scale.set(0.07, 0.07, 1); s.renderOrder = 22; sp.add(s); } sc.add(sp);
      p.rb.frozen = true; p.rb.v.set(0, 0, 0); p.rb.w.set(0, 0, 0);
      rd = { p, rig, P0, X, XP, W0, W: W0.slice(), RAD, CON, PAIRS, M, Mi, off, qRest, C0, frame, cen, ptSk, boneIx, orig, sp, grab: null, moved: false, dirty: true, Pr: P0.map(() => new V3()), Rm: new Float64Array(99), Tm: new Float64Array(33), q: p.obj.quaternion.clone(), pos: p.obj.position.clone(), toW, toR, still: 0 };
      applyXray(); rdFrame(true); toast('🧍 抓住青色的关节点拖动；摆好后点「固定姿势」'); return true;
    }
    const _d = new V3(), _e = new V3(), _F = new V3(), _m = new V3(), _o = new V3();
    function rdStep(h) {
      const { X, XP, W, RAD, CON, PAIRS } = rd, n = X.length, gg = 9.8 * h * h, pin = rd.grab ? rd.grab.i : -1, TRR = TR;
      for (let i = 0; i < n; i++) { const x = X[i], xp = XP[i]; if (i === pin) continue; const vx = (x.x - xp.x) * 0.993, vy = (x.y - xp.y) * 0.993, vz = (x.z - xp.z) * 0.993; xp.copy(x); x.x += vx; x.y += vy - gg; x.z += vz; }
      if (pin >= 0) { _d.copy(rd.grab.t).sub(X[pin]); const l = _d.length(); if (l > 0.07) _d.multiplyScalar(0.07 / l); X[pin].add(_d); XP[pin].copy(X[pin]); if (l > 1e-4) rd.moved = true; }
      for (let it = 0; it < 8; it++) {
        for (const c of CON) { const a = X[c[0]], b = X[c[1]], wa = W[c[0]], wb = W[c[1]], ws = wa + wb; if (ws < 1e-9) continue; _d.copy(b).sub(a); const l = _d.length() || 1e-9; if (c[3] === 1 && l >= c[2]) continue; const k = (l - c[2]) / l / ws; a.addScaledVector(_d, k * wa); b.addScaledVector(_d, -k * wb); }
        // 躯干朝向（胸前-胸后 + 腹前-腹后）→ 膝盖只能向前弯、手肘只能向后弯
        _F.copy(X[19]).sub(X[20]).add(_d.copy(X[21]).sub(X[22])).normalize();
        for (const [r, h2, a2, sg] of [[13, 7, 15, 1], [14, 8, 16, 1], [9, 5, 11, -1], [10, 6, 12, -1]]) { _m.copy(X[h2]).add(X[a2]).multiplyScalar(0.5); _o.copy(X[r]).sub(_m); const s = _o.dot(_F) * sg + 0.012; if (s < 0) { const c = -s * 0.6 * sg; X[r].addScaledVector(_F, c * W[r] / (W[r] + 0.5)); X[h2].addScaledVector(_F, -c * 0.3 * W[h2] / (W[h2] + 0.5)); X[a2].addScaledVector(_F, -c * 0.3 * W[a2] / (W[a2] + 0.5)); } }
        for (const pr of PAIRS) { const a = X[pr[0]], b = X[pr[1]], wa = W[pr[0]], wb = W[pr[1]], ws = wa + wb; if (ws < 1e-9) continue; _d.copy(b).sub(a); const l = _d.length(); if (l >= pr[2] || l < 1e-9) continue; const k = (l - pr[2]) / l / ws; a.addScaledVector(_d, k * wa); b.addScaledVector(_d, -k * wb); }
        if (it >= 5) for (let i = 0; i < n; i++) { if (i === pin && rd.grab.t.y > RAD[i]) continue; const x = X[i], r = RAD[i]; let nx = 0, ny = 0, nz = 0, hit = false;
          const rho = Math.hypot(x.x, x.z), cx = rho > TRR ? x.x * TRR / rho : x.x, cz = rho > TRR ? x.z * TRR / rho : x.z, cy = clamp(x.y, -0.08, 0), dx = x.x - cx, dy = x.y - cy, dz = x.z - cz, d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < r * r) { hit = true; if (d2 > 1e-10) { const d = Math.sqrt(d2), k = (r - d) / d; x.x += dx * k; x.y += dy * k; x.z += dz * k; nx = dx / d; ny = dy / d; nz = dz / d; } else { x.y = r; ny = 1; } }
          if (x.y < FLOORY + r) { x.y = FLOORY + r; hit = true; nx = 0; ny = 1; nz = 0; }
          if (hit) { const xp = XP[i], vx = x.x - xp.x, vy = x.y - xp.y, vz = x.z - xp.z, vn = vx * nx + vy * ny + vz * nz, f = 0.3; xp.x += (vx - vn * nx) * f; xp.y += (vy - vn * ny) * f; xp.z += (vz - vn * nz) * f; } }
      }
      let mv = 0; for (let i = 0; i < n; i++) mv = Math.max(mv, Math.abs(X[i].x - XP[i].x) + Math.abs(X[i].y - XP[i].y) + Math.abs(X[i].z - XP[i].z)); if (mv > 2e-5 || rd.grab) { rd.dirty = true; rd.still = 0; } else rd.still++;
    }
    const _qa = new T.Quaternion(), _mm = new T.Matrix4(), _q2 = new T.Quaternion();
    function rdFrame(force) {
      if (!rd || (!rd.dirty && !force)) return; const { p, Pr, P0, Rm, Tm, rig, off } = rd; rd.dirty = false;
      for (let i = 0; i < Pr.length; i++) Pr[i].copy(rd.X[i]).applyMatrix4(rd.Mi).sub(off);
      const Qg = []; Qg[0] = rd.frame(Pr, new T.Quaternion()).multiply(_q2.copy(rd.qRest).invert()); const Cc = rd.cen(Pr);
      const setG = (g, Q, A0, Ac) => { _mm.makeRotationFromQuaternion(Q); const e = _mm.elements, o = g * 9; Rm[o] = e[0]; Rm[o + 1] = e[4]; Rm[o + 2] = e[8]; Rm[o + 3] = e[1]; Rm[o + 4] = e[5]; Rm[o + 5] = e[9]; Rm[o + 6] = e[2]; Rm[o + 7] = e[6]; Rm[o + 8] = e[10]; Tm[g * 3] = Ac.x - (e[0] * A0.x + e[4] * A0.y + e[8] * A0.z); Tm[g * 3 + 1] = Ac.y - (e[1] * A0.x + e[5] * A0.y + e[9] * A0.z); Tm[g * 3 + 2] = Ac.z - (e[2] * A0.x + e[6] * A0.y + e[10] * A0.z); };
      setG(0, Qg[0], rd.C0, Cc);
      for (let g = 1; g < 11; g++) { const [a, b] = SEGG[g], d0 = P0[b].clone().sub(P0[a]).normalize().applyQuaternion(Qg[PARG[g]]), dc = Pr[b].clone().sub(Pr[a]).normalize(); Qg[g] = _qa.clone().setFromUnitVectors(d0, dc).multiply(Qg[PARG[g]]); setG(g, Qg[g], P0[a], Pr[a]); }
      for (let g = 0; g < 11; g++) { Tm[g * 3] += off.x; Tm[g * 3 + 1] += off.y; Tm[g * 3 + 2] += off.z; }
      const sets = p.part.sets;
      sets.forEach((s, si) => { const m = p.meshes[si]; if (!s.rg) return; const geo = m.geometry, PA = geo.attributes.position.array, NA = geo.attributes.normal.array, P = s.rg.P, N = s.rg.N, sk = s.rg.sk, n = P.length / 3;
        for (let i = 0; i < n; i++) { const g1 = sk[i * 4] | 0, w1 = sk[i * 4 + 1], g2 = sk[i * 4 + 2] | 0, w2 = sk[i * 4 + 3], x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], nx = N[i * 3], ny = N[i * 3 + 1], nz = N[i * 3 + 2], a = g1 * 9, t1 = g1 * 3;
          let px = w1 * (Rm[a] * x + Rm[a + 1] * y + Rm[a + 2] * z + Tm[t1]), py = w1 * (Rm[a + 3] * x + Rm[a + 4] * y + Rm[a + 5] * z + Tm[t1 + 1]), pz = w1 * (Rm[a + 6] * x + Rm[a + 7] * y + Rm[a + 8] * z + Tm[t1 + 2]), qx = w1 * (Rm[a] * nx + Rm[a + 1] * ny + Rm[a + 2] * nz), qy = w1 * (Rm[a + 3] * nx + Rm[a + 4] * ny + Rm[a + 5] * nz), qz = w1 * (Rm[a + 6] * nx + Rm[a + 7] * ny + Rm[a + 8] * nz);
          if (w2 > 0) { const b = g2 * 9, t2 = g2 * 3; px += w2 * (Rm[b] * x + Rm[b + 1] * y + Rm[b + 2] * z + Tm[t2]); py += w2 * (Rm[b + 3] * x + Rm[b + 4] * y + Rm[b + 5] * z + Tm[t2 + 1]); pz += w2 * (Rm[b + 6] * x + Rm[b + 7] * y + Rm[b + 8] * z + Tm[t2 + 2]); qx += w2 * (Rm[b] * nx + Rm[b + 1] * ny + Rm[b + 2] * nz); qy += w2 * (Rm[b + 3] * nx + Rm[b + 4] * ny + Rm[b + 5] * nz); qz += w2 * (Rm[b + 6] * nx + Rm[b + 7] * ny + Rm[b + 8] * nz); }
          const il = 1 / (Math.hypot(qx, qy, qz) || 1); PA[i * 3] = px; PA[i * 3 + 1] = py; PA[i * 3 + 2] = pz; NA[i * 3] = qx * il; NA[i * 3 + 1] = qy * il; NA[i * 3 + 2] = qz * il; }
        geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true; geo.computeBoundingSphere(); geo.computeBoundingBox(); });
      // 词条光点 + 骨线跟着动
      rd.ptL = rig.pts0.map((pp, i) => { const k = rd.ptSk[i], g1 = k[0] | 0, g2 = k[2] | 0, a = g1 * 9, b = g2 * 9, w1 = k[1], w2 = k[3], t1 = g1 * 3, t2 = g2 * 3; const f = (o, t, c0) => w1 * (Rm[a + o] * pp[0] + Rm[a + o + 1] * pp[1] + Rm[a + o + 2] * pp[2] + Tm[t1 + t]) + w2 * (Rm[b + o] * pp[0] + Rm[b + o + 1] * pp[1] + Rm[b + o + 2] * pp[2] + Tm[t2 + t]); return [f(0, 0), f(3, 1), f(6, 2)]; });
      rd.ptL.forEach((q, i) => { for (const mt of [p.motes[i * 2], p.motes[i * 2 + 1]]) if (mt) mt.position.set(q[0], q[1], q[2]); });
      if (p.boneLine) { const arr = p.boneLine.geometry.attributes.position.array; rd.boneIx.forEach((bi, i) => { for (let k = 0; k < 2; k++) { const q = Pr[bi[k]]; arr[i * 6 + k * 3] = q.x + off.x; arr[i * 6 + k * 3 + 1] = q.y + off.y; arr[i * 6 + k * 3 + 2] = q.z + off.z; } }); p.boneLine.geometry.attributes.position.needsUpdate = true; }
      for (let i = 0; i < 19; i++) rd.sp.children[i].position.copy(rd.X[i]);
    }
    function rdReset() { if (!rd) return; rd.X.forEach((x, i) => { x.copy(rd.toW(rd.P0[i])); rd.XP[i].copy(x); }); rd.moved = true; rd.dirty = true; if (rd.grab) { rd.W[rd.grab.i] = rd.W0[rd.grab.i]; rd.grab = null; } rdFrame(true); toast('↺ 回到了刚抬上台的姿势'); }
    function poseDown(e) {
      if (!rd) return; const h = pickPiece(e.clientX, e.clientY); st.drag.pg = true; if (!h) return; let bi = 0, bd = 1e9; for (let i = 0; i < 19; i++) { const d = rd.X[i].distanceToSquared(h.pt) * (rd.W0[i] < 0.3 ? 1.6 : 1); if (d < bd) { bd = d; bi = i; } }
      const fw = new V3(); cam.getWorldDirection(fw); st.drag.pl = new T.Plane().setFromNormalAndCoplanarPoint(fw, rd.X[bi]); rd.grab = { i: bi, t: rd.X[bi].clone() }; rd.W[bi] = 0; rd.dirty = true;
    }
    function poseMove(e) { if (!rd || !rd.grab) return; const hp = new V3(); if (setNdc(e.clientX, e.clientY).ray.intersectPlane(st.drag.pl, hp)) { hp.y = clamp(hp.y, 0.03, 2.2); rd.grab.t.copy(hp); } }
    function poseUp() { if (rd && rd.grab) { rd.W[rd.grab.i] = rd.W0[rd.grab.i]; rd.grab = null; } }
    function endPose(lock) {
      if (!rd) return; const r = rd, p = r.p; rd = null; sc.remove(r.sp); r.sp.children.forEach(s => s.material = null);
      const doLock = lock && r.moved; if (doLock) { rd = r; rdFrame(true); rd = null; }
      if (!doLock) { p.meshes.forEach((m, i) => { m.geometry.dispose(); m.geometry = r.orig[i]; m.frustumCulled = true; }); p.motes.forEach(m => { }); p.rb.frozen = false;
        // 光点与骨线回到原位
        p.part.pts.forEach((pt, i) => { for (const mt of [p.motes[i * 2], p.motes[i * 2 + 1]]) if (mt) mt.position.set(...pt.p); }); if (p.boneLine) { const arr = p.boneLine.geometry.attributes.position.array; (p.part.bones || []).forEach((b, i) => { arr.set(b.a, i * 6); arr.set(b.b, i * 6 + 3); }); p.boneLine.geometry.attributes.position.needsUpdate = true; } return; }
      snap(); const off = r.off, sets = p.part.sets.map((s, si) => { const g = p.meshes[si].geometry, PA = g.attributes.position.array, NA = g.attributes.normal.array, V = s.V.slice(), n = V.length / S; for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { V[i * S + k] = PA[i * 3 + k]; V[i * S + 3 + k] = NA[i * 3 + k]; } return { V, I: s.I.slice(), skin: s.skin, cap: s.cap, cloth: s.cloth, nm: s.nm, map: s.map, at: s.at, rg: s.rg }; });
      const pts = p.part.pts.map((pt, i) => ({ p: r.ptL[i].slice(), a: pt.a })), bones = (r.rig.bones0 || []).map((b, i) => { const ix = r.boneIx[i], A = r.Pr[ix[0]], B = r.Pr[ix[1]]; return { a: [A.x + off.x, A.y + off.y, A.z + off.z], b: [B.x + off.x, B.y + off.y, B.z + off.z], r: b.r }; });
      const rig = { jn: r.rig.jn, off: off.toArray(), pp: r.Pr.map(q => q.toArray()), pts0: r.rig.pts0, bones0: r.rig.bones0 }, part = { sets, pts, bones, rig, bb: bbOf(sets) };
      const pos = p.obj.position.clone(), q = p.obj.quaternion.clone(), tk = p.take; r.p.meshes.forEach(m => m.geometry.dispose()); removePiece(p); const np = addPiece(part, pos, q); np.take = tk; st.sel = np; ui(); toast('🔒 姿势固定了：现在可以切、可以带走，姿势会保留');
    }
    // ---- 完成：把选中的块变成物品 ----
    function finish() {
      if (rd) { endPose(true); setTool('cut'); } const picks = st.pieces.filter(p => p.take); if (!picks.length) return; const S_ = window.Sack, Og = window.Organs; const items = S_.itemsOf ? S_.itemsOf(L) : (L.items = L.items || []); Og.defsNow && Og.defsNow(); const names = [];
      for (const p of picks) { const rec = pack(p, false), pid = 'ap' + Date.now().toString(36) + p.id + Math.floor(Math.random() * 1e4), aff = p.part.pts.map(x => ({ id: x.a.id, m: x.a.m })), at = p.part.pts.length ? p.part.pts.reduce((s, x) => s + x.a.t, 0) / p.part.pts.length : 0;
        const og = { t: 'piece', own, race, rar, age: c ? c.age : 0, tr: c && c.traits ? c.traits.slice() : [], af: '', q: +clamp(0.4 + (at ? (at - 1) * 0.15 : -0.1) + rnd(-0.05, 0.05), 0.2, 1).toFixed(2), oid: own + '|' + (c ? c.id : 'x'), pid, nm: p.name, aff, dim: rec.dim.map(v => +v.toFixed(4)), note: `在解剖台上切下的「${p.name}」，占 ${cellsOf(rec.dim)[0]}×${cellsOf(rec.dim)[1]} 格。${aff.length ? '体内带着 ' + aff.length + ' 条词条，摆进洞里生效。' : '里面什么词条也没有，只是一块肉骨。'}` };
        store(pid, rec); const it = Og.mkItem(og); it.sz = cellsOf(rec.dim); items.push(it); names.push(p.name); }
      L.dissected = true; close(); AT.hit(); window.G && G.toast && G.toast(`🔪 取下 <b>${picks.length}</b> 块：${names.join('、')}（已放进尸体旁的战利品）`, '#e88', 3.4); window.G && G.save && G.save(); done && done();
    }
    // ---- 渲染循环 ----
    let raf = 0, last = performance.now(); const loop = () => { raf = requestAnimationFrame(loop); const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; const w = cv.clientWidth, h = cv.clientHeight; if (w && (cv.width !== Math.round(w * R.getPixelRatio()) || cv.height !== Math.round(h * R.getPixelRatio()))) { R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
      physics(dt);
      const t = new V3(st.tx, st.ty, st.tz); cam.position.set(t.x + Math.sin(st.yaw) * Math.cos(st.pit) * st.dist, t.y + Math.sin(st.pit) * st.dist, t.z + Math.cos(st.yaw) * Math.cos(st.pit) * st.dist); cam.lookAt(t); R.render(sc, cam); };
    UI = { root, close: () => { st.busy = false; cancelAnimationFrame(raf); removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true); R.forceContextLoss(); R.dispose(); for (const p of st.pieces) { p.mats.forEach(m => m.dispose()); p.part.sets.forEach(s => { if (s._g) s._g.dispose(); }); } root.remove(); }, st, doCut, doCutPath, cam, sc, physics, wake, linenize, pose: { start: startPose, end: endPose, get rd() { return rd; }, grab: (i, x, y, z) => { if (!rd) return; if (rd.grab) rd.W[rd.grab.i] = rd.W0[rd.grab.i]; rd.grab = { i, t: new V3(x, y, z) }; rd.W[i] = 0; rd.moved = true; }, release: () => { if (rd && rd.grab) { rd.W[rd.grab.i] = rd.W0[rd.grab.i]; rd.grab = null; } }, reset: () => rdReset(), skin: () => rdFrame(true) } };
    // 初始：躺在台上，脸朝上
    { const part = { sets: B.sets.map(s => ({ V: s.V.slice(), I: s.I.slice(), skin: s.skin, cap: s.cap, cloth: s.cloth, nm: s.nm, map: s.map, at: s.at, rg: s.rg })), rig: B.rig ? { jn: B.BN, off: [0, 0, 0], pp: null, pts0: B.pts.map(x => x.p.slice()), bones0: (B.bones || []).map(b => ({ a: b.a.slice(), b: b.b.slice(), r: b.r })) } : null, pts: B.pts.map(x => ({ p: x.p.slice(), a: x.a })), bones: (B.bones || []).map(b => ({ a: b.a.slice(), b: b.b.slice(), r: b.r })) }; part.bb = bbOf(part.sets); const q = new T.Quaternion().setFromAxisAngle(new V3(1, 0, 0), -Math.PI / 2); const p = addPiece(part, new V3(0, 0, 0), q); dropTo(p); p.obj.position.z = 0; }
    setTool('cut'); ui(); loop();
  }
  function close() { if (!UI) return; UI.close(); UI = null; }
  const canOpen = L => on() && !!L && L.kind === 'corpse' && !L.dissected && !!(L.fo && L.fo.f && L.fo.f.root) && !!window.Foe && !!Foe.cloneSkinned && !!window.Sack && !!window.Organs;
  // ---------------------------------------------------------------- 块的存取（IndexedDB）与摆放用模型
  const CACHE = new Map(); let db = null;
  const idb = () => db ? Promise.resolve(db) : new Promise((ok, no) => { try { const q = indexedDB.open('soulhead_pieces', 1); q.onupgradeneeded = () => q.result.createObjectStore('p', { keyPath: 'pid' }); q.onsuccess = () => ok(db = q.result); q.onerror = () => no(q.error); } catch (e) { no(e); } });
  const TURL = new Map();
  function texURL(tex, png) { const img = tex && tex.image; if (!img) return null; const k = png ? 'p' : 'j'; let m = TURL.get(img); if (!m) TURL.set(img, m = {}); if (m[k]) return m[k]; const w0 = img.width || img.naturalWidth, h0 = img.height || img.naturalHeight, sc = Math.min(1, 512 / Math.max(w0, h0)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w0 * sc)); c.height = Math.max(1, Math.round(h0 * sc)); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return (m[k] = c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.85)); }
  function pack(p, linen) { // 每层一个紧凑网格（带 UV 与缩小的贴图），原点移到包围盒中心
    const bb = bbOf(p.part.sets), sz = bb.getSize(new V3()), c = bb.getCenter(new V3()), sets = [], tex = {};
    for (const s of p.part.sets) { const n = s.V.length / S, P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3), U = new Float32Array(n * 2), W = new Float32Array(n), Q = new Float32Array(n * 2), lin = linen && s.cloth;
      for (let i = 0; i < n; i++) { P[i * 3] = s.V[i * S] - c.x; P[i * 3 + 1] = s.V[i * S + 1] - c.y; P[i * 3 + 2] = s.V[i * S + 2] - c.z; for (let k = 0; k < 3; k++) { N[i * 3 + k] = s.V[i * S + 3 + k]; C[i * 3 + k] = s.V[i * S + (lin ? 9 : 6) + k]; } U[i * 2] = s.V[i * S + 12]; U[i * 2 + 1] = s.V[i * S + 13]; W[i] = lin ? 0 : s.V[i * S + 14]; }
      let tk = null; if (s.map && !lin) { tk = 't' + Object.keys(tex).length; const u = texURL(s.map, (s.at || 0) > 0); if (u) tex[tk] = u; else tk = null; }
      for (let i = 0; i < n; i++) { Q[i * 2] = s.V[i * S + 15]; Q[i * 2 + 1] = s.V[i * S + 16]; } sets.push({ P, N, C, U, W, Q, I: new Uint32Array(s.I), tk, at: s.at || 0 }); }
    return { sets, tex, dim: [sz.x, sz.y, sz.z] };
  }
  function store(pid, rec) { CACHE.set(pid, rec); idb().then(d => { const t = d.transaction('p', 'readwrite'); t.objectStore('p').put(Object.assign({ pid }, rec)); }).catch(e => console.warn('Autopsy IDB', e)); }
  const scaleFor = dim => { const mx = Math.max(...dim) || 0.1; return clamp(0.5, 0.07 / mx, 0.45 / mx); };
  function fill(g, rec) {
    const inner = new T.Group(), texs = {}; for (const k in rec.tex) { const t = new T.TextureLoader().load(rec.tex[k]); t.flipY = false; t.encoding = T.sRGBEncoding; t.anisotropy = 2; texs[k] = t; }
    for (const s of rec.sets) { const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(s.P, 3)); geo.setAttribute('normal', new T.BufferAttribute(s.N, 3)); geo.setAttribute('color', new T.BufferAttribute(s.C, 3)); geo.setAttribute('uv', new T.BufferAttribute(s.U, 2)); geo.setAttribute('tw', new T.BufferAttribute(s.W, 1)); geo.setAttribute('cp', new T.BufferAttribute(s.Q || new Float32Array(s.W.length * 2), 2)); geo.setIndex(new T.BufferAttribute(s.I, 1)); geo.computeBoundingSphere();
      const m = new T.Mesh(geo, mkMat(s.tk ? texs[s.tk] : null, s.at)); m.castShadow = true; m.userData.ownGeo = true; inner.add(m); }
    inner.scale.setScalar(scaleFor(rec.dim)); while (g.children.length) g.remove(g.children[0]); g.add(inner);
  }
  function model(og) { // Organs.model 对 t:'piece' 的实现：同步返回，数据没到时先是等大的占位方块
    const g = new T.Group(), dim = og.dim || [0.2, 0.2, 0.2], sc = scaleFor(dim), rec = CACHE.get(og.pid);
    if (rec) fill(g, rec); else { const b = new T.Mesh(new T.BoxGeometry(dim[0] * sc, dim[1] * sc, dim[2] * sc), new T.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.9 })); g.add(b); idb().then(d => new Promise(ok => { const r = d.transaction('p').objectStore('p').get(og.pid); r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); })).then(r => { if (r) { CACHE.set(og.pid, r); fill(g, r); } }).catch(() => { }); }
    g.userData.ext = new V3(dim[0] * sc, dim[1] * sc, dim[2] * sc); return g;
  }
  return { open, close, canOpen, on, effect, affText, model, AFX, bake, rollAffixes, cutPart, sliceSet, get ui() { return UI; }, get isOpen() { return !!UI; } };
})();
