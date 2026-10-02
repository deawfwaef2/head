// R55 MOD autopsy（默认开）· 3D 解剖台：靠近战场上的角色尸体 →「🔪 解剖」→ 进入解剖台界面。
//   · 尸体躺在台子上，可以真的移动、旋转它；在屏幕上拖出一条线，就沿着这条线所在的平面把身体切开（任意位置、任意角度）。
//   · 切下来的每一块都是独立实体（可继续切、移动、旋转），带走后可以随意摆放在洞穴里。
//   · 开尸时，若干「词条」随机分布在身体各处（手臂偏力量/戳击，腿偏敏捷/体魄，躯干偏体魄/胆魄/光环…）。
//     切下来的那一块带着落在它里面的词条——摆进洞里就有这些词条的效果。头部不分布词条。
//   · 衣着开关：「原衣 / 素麻衣」。注意：只是把衣服换成同形状的素麻布，不会脱成裸体（内容边界：无性内容）。
//   · 切面是素净的蜡色截面，没有血肉内脏细节。
//   模型：用尸体自己的身体模型，按当前材质/贴图把颜色烘到顶点上（块可以独立存进浏览器 IndexedDB，不依赖贴图）。
window.Autopsy = (() => {
  const T = THREE, V3 = T.Vector3, S = 16; // 顶点步长：pos3 nrm3 col3 colB3 uv2 tw1 reg1（tw=贴图权重：壳 1 / 截面 0）
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
  const REGB = ['躯干', '颈', '肩', '上臂', '前臂', '手', '大腿', '小腿', '脚'];
  function regOf(key) {
    const side = key.startsWith('left') ? 1 : key.startsWith('right') ? 2 : 0, k = key.replace(/^(left|right)/, ''); let b = 0;
    if (/^(hips|spine|chest|upperChest)$/.test(k)) b = 0; else if (/^(neck|head|Eye|jaw)/i.test(k)) b = 1; else if (/^Shoulder/i.test(k)) b = 2; else if (/^UpperArm/.test(k)) b = 3; else if (/^LowerArm/.test(k)) b = 4; else if (/^(Hand|Thumb|Index|Middle|Ring|Little)/.test(k)) b = 5; else if (/^UpperLeg/.test(k)) b = 6; else if (/^LowerLeg/.test(k)) b = 7; else if (/^(Foot|Toes)/.test(k)) b = 8;
    return b * 3 + side;
  }
  const grpOf = code => { const b = Math.floor(code / 3); return b === 3 || b === 4 ? 'arm' : b === 5 ? 'hand' : b >= 6 ? 'leg' : 'torso'; };
  function pieceName(part) {
    const h = new Array(27).fill(0); let tot = 0; for (const s of part.sets) { if (s.cap === 2) continue; const V = s.V; for (let i = S - 1; i < V.length; i += S) { h[V[i] | 0]++; tot++; } }
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
      const bReg = o.skeleton.bones.map(b => regOf(keyOf(b))); const groups = geo.groups.length ? geo.groups : [{ start: 0, count: idx ? idx.length : pa.count, materialIndex: 0 }];
      for (const gp of groups) {
        const m = mats[gp.materialIndex] || mats[0]; if (!m) continue; const nm = (m.name || '') + ' ' + o.name; if (!cut && /hair|face|eye|brow|lash/i.test(nm)) continue;
        const td = !cut && m.map ? texData(m.map) : null, mc = m.color || new T.Color(1, 1, 1), remap = new Int32Array(pa.count).fill(-1), V = [], I = [], alpha = [];
        for (let t = gp.start; t < gp.start + gp.count; t += 3) { const tri = [0, 1, 2].map(k => idx ? idx[t + k] : t + k), vi = [];
          for (const x of tri) { if (remap[x] < 0) { remap[x] = V.length / S; tmp.fromBufferAttribute(pa, x); o.boneTransform(x, tmp); tmp.applyMatrix4(o.matrixWorld);
            let r = mc.r, g = mc.g, b = mc.b, a = 1, u0 = 0, v0 = 0; if (uva) { u0 = uva.getX(x); v0 = uva.getY(x); } if (td && uva) { let u = uva.getX(x), v = uva.getY(x); u -= Math.floor(u); v -= Math.floor(v); const px = Math.min(td.w - 1, Math.floor(u * td.w)), py = Math.min(td.h - 1, Math.floor((td.flip ? 1 - v : v) * td.h)), q = (py * td.w + px) * 4; r *= LUT[td.px[q]]; g *= LUT[td.px[q + 1]]; b *= LUT[td.px[q + 2]]; a = td.px[q + 3] / 255; }
            const lum = r * 0.299 + g * 0.587 + b * 0.114, cw = [Math.min(1, lum * 1.12), Math.min(1, lum * 1.04), Math.min(1, lum * 0.88)]; let bi = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = sw.getComponent ? sw.getComponent(x, k) : sw.array[x * 4 + k]; if (w > bw) { bw = w; bi = si.getComponent ? si.getComponent(x, k) : si.array[x * 4 + k]; } }
            const hasT = !!(td && uva); V.push(tmp.x, tmp.y, tmp.z, 0, 1, 0, mc.r, mc.g, mc.b, cw[0], cw[1], cw[2], u0, v0, hasT ? 1 : 0, bReg[bi] || 0); alpha.push(a); bb.expandByPoint(tmp); } vi.push(remap[x]); }
          I.push(vi[0], vi[1], vi[2]); }
        if (I.length < 9) continue; const skin = cut || !!(m.userData && m.userData.skin); sets.push({ V, I, skin, cap: cut ? 2 : skin ? 1 : 0, cloth: false, nm, map: td ? m.map : null, at: m.alphaTest || 0 });
      }
    });
    if (!sets.length) return null; const anySkin = sets.some(s => s.skin); for (const s of sets) { if (!anySkin) s.cap = 1; else if (!s.skin) s.cloth = true; if (s.cap !== 2) calcNormals(s.V, s.I); else calcNormals(s.V, s.I); }
    // 归一：脚底 y=0，x/z 居中
    const c = bb.getCenter(new V3()), dx = -c.x, dy = -bb.min.y, dz = -c.z; for (const s of sets) for (let i = 0; i < s.V.length; i += S) { s.V[i] += dx; s.V[i + 1] += dy; s.V[i + 2] += dz; }
    const BN = {}; for (const [o, k] of bk) { const p = new V3().setFromMatrixPosition(o.matrixWorld); BN[k] = [p.x + dx, p.y + dy, p.z + dz]; }
    return { sets, BN, height: bb.max.y - bb.min.y, hasCloth: sets.some(s => s.cloth) };
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
  function sliceSet(set, n, d) {
    const V = set.V, I = set.I, nv = V.length / S, dist = new Float32Array(nv);
    for (let i = 0; i < nv; i++) dist[i] = n.x * V[i * S] + n.y * V[i * S + 1] + n.z * V[i * S + 2] + d;
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
  const CAPC = [0.86, 0.72, 0.62]; // 蜡色截面
  function addCaps(Q, n, sign) {
    const m = Q.segs.length / 2; if (!m) return; const V = Q.V, start = new Map(); for (let i = 0; i < m; i++) { const s = Q.segs[2 * i]; if (!start.has(s)) start.set(s, []); start.get(s).push(i); }
    const used = new Uint8Array(m), loops = []; const pd = (a, b) => Math.hypot(V[a * S] - V[b * S], V[a * S + 1] - V[b * S + 1], V[a * S + 2] - V[b * S + 2]);
    for (let i = 0; i < m; i++) { if (used[i]) continue; used[i] = 1; const chain = [Q.segs[2 * i]]; let cur = Q.segs[2 * i + 1], closed = false, guard = 0;
      while (guard++ < 200000) { if (cur === chain[0]) { closed = true; break; } chain.push(cur); const L = start.get(cur); let nx = -1; if (L) for (const j of L) if (!used[j]) { nx = j; break; } if (nx < 0) break; used[nx] = 1; cur = Q.segs[2 * nx + 1]; }
      if (chain.length >= 3 && (closed || pd(chain[0], cur) < 0.3)) loops.push(chain); }
    if (!loops.length) return; const e1 = Math.abs(n.x) < 0.9 ? new V3(1, 0, 0).cross(n).normalize() : new V3(0, 1, 0).cross(n).normalize(), e2 = new V3().crossVectors(n, e1);
    const L2 = loops.map(l => { const pts = l.map(i => new T.Vector2(V[i * S] * e1.x + V[i * S + 1] * e1.y + V[i * S + 2] * e1.z, V[i * S] * e2.x + V[i * S + 1] * e2.y + V[i * S + 2] * e2.z)); let ar = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; ar += a.x * b.y - b.x * a.y; } return { l, pts, ar: Math.abs(ar / 2) }; }).filter(x => x.ar > 1e-8).sort((a, b) => b.ar - a.ar);
    const inside = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < (b.x - a.x) * (pt.y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; };
    for (let i = 0; i < L2.length; i++) { const cont = []; for (let j = 0; j < i; j++) if (inside(L2[i].pts[0], L2[j].pts)) cont.push(j); L2[i].depth = cont.length; L2[i].par = cont.length ? cont[cont.length - 1] : -1; L2[i].holes = []; }
    for (const x of L2) if (x.depth % 2 === 1 && x.par >= 0) L2[x.par].holes.push(x);
    const reg = i => V[i * S + S - 1];
    for (const x of L2) { if (x.depth % 2 === 1) continue; const contour = x.pts, holes = x.holes.map(h => h.pts), all = x.l.concat(...x.holes.map(h => h.l));
      let tris; try { tris = T.ShapeUtils.triangulateShape(contour, holes); } catch (e) { continue; } const base = V.length / S;
      for (const vi of all) V.push(V[vi * S], V[vi * S + 1], V[vi * S + 2], n.x * sign, n.y * sign, n.z * sign, CAPC[0], CAPC[1], CAPC[2], CAPC[0], CAPC[1], CAPC[2], 0, 0, 0, reg(vi));
      for (const t of tris) Q.I.push(base + t[0], base + t[1], base + t[2]); }
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
      const bb = bbOf(ns), sz = bb.getSize(new V3()); if (Math.max(sz.x, sz.y, sz.z) < 0.012) continue; out.push({ sets: ns, bb, pts: [] }); }
    return out;
  }
  function cutPart(part, n, d) { // → [partsFront, partsBack] 或 null
    const side = [[], []]; for (const s of part.sets) { const r = sliceSet(s, n, d); for (let k = 0; k < 2; k++) if (r[k].I.length >= 9) { if (s.cap && r[k].segs.length) addCaps(r[k], n, k === 0 ? -1 : 1); side[k].push(compact(r[k], s)); } }
    if (!side[0].length || !side[1].length) return null;
    const res = [0, 1].map(k => { const ps = components(side[k]); for (const p of ps) { for (const s of p.sets) if (s.cap !== undefined) calcNormalsKeepCap(s); } return ps; });
    if (!res[0].length || !res[1].length) return null;
    for (const pt of part.pts) { const k = n.x * pt.p[0] + n.y * pt.p[1] + n.z * pt.p[2] + d >= 0 ? 0 : 1, q = new V3(...pt.p); let best = res[k][0], bd = 1e9; for (const p of res[k]) { const dd = p.bb.distanceToPoint(q); if (dd < bd) { bd = dd; best = p; } } best.pts.push(pt); }
    return res;
  }
  function calcNormalsKeepCap() { /* 切出来的新顶点已带插值法线；平面截面法线已设置，这里不重算（避免截面被平滑成圆角） */ }
  // ---------------------------------------------------------------- 界面
  function mkMat(map, at) { // 顶点色 × (贴图 按 tw 混合)：壳用贴图，截面用纯蜡色
    const m = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0, side: T.DoubleSide, map: map || null, alphaTest: at || 0 });
    m.onBeforeCompile = sh => { sh.vertexShader = 'attribute float tw;\nvarying float vTw;\n' + sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvTw = tw;'); sh.fragmentShader = 'varying float vTw;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#ifdef USE_MAP\nvec4 sampledDiffuseColor = texture2D( map, vUv );\nsampledDiffuseColor = mix( vec4( 1.0 ), sampledDiffuseColor, vTw );\ndiffuseColor *= sampledDiffuseColor;\n#endif'); };
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
#apRoot .tools{position:absolute;left:18px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:10px}
#apRoot .tl{width:108px;padding:10px 6px 8px;text-align:center;border:2px solid rgba(231,194,122,.45);background:rgba(20,12,14,.88);color:#f3d9a0;cursor:pointer}
#apRoot .tl i{display:block;font-style:normal;font-size:34px;line-height:1.1}#apRoot .tl span{display:block;font:800 17px "Noto Serif CJK SC",serif;letter-spacing:.06em}#apRoot .tl small{display:block;font-size:14px;color:#a99d88}
#apRoot .tl:hover{border-color:#ffd27a;filter:brightness(1.2)}#apRoot .tl.on{border-color:#ffd27a;background:linear-gradient(180deg,#8a3a22,#3a140c);color:#fff;box-shadow:0 0 22px rgba(255,150,70,.35)}#apRoot .tl.off{opacity:.4}
#apRoot .pn{position:absolute;right:16px;top:16px;bottom:78px;width:350px;overflow:auto;display:flex;flex-direction:column;gap:10px;padding-right:2px}
#apRoot .pn h2{margin:0;font:800 22px "Noto Serif CJK SC",serif;color:#f3d9a0;letter-spacing:.1em;text-shadow:0 1px 6px #000}
#apRoot .pc{padding:10px 12px;border:2px solid rgba(255,255,255,.16);background:rgba(18,11,14,.9);cursor:pointer}#apRoot .pc.sel{border-color:#ffd27a;box-shadow:0 0 18px rgba(255,160,70,.3)}#apRoot .pc.tk{background:rgba(70,38,20,.92)}
#apRoot .pc .t{display:flex;align-items:center;gap:8px}#apRoot .pc .t b{font:800 21px "Noto Serif CJK SC",serif;color:#fff}#apRoot .pc .t small{margin-left:auto;font-size:15px;color:#a99d88}
#apRoot .ch{display:flex;flex-wrap:wrap;gap:6px;margin:7px 0}#apRoot .ch span{font-size:16px;font-weight:700;padding:3px 9px;border:1px solid rgba(255,255,255,.22);background:rgba(0,0,0,.4)}
#apRoot .pc .no{font-size:16px;color:#8d8170;margin:6px 0}#apRoot .pc button{width:100%;padding:7px;font:800 17px "Noto Serif CJK SC",serif;letter-spacing:.1em;border:2px solid #b8914a;background:linear-gradient(180deg,#3a2a1a,#1d130b);color:#f3d9a0;cursor:pointer}#apRoot .pc.tk button{background:linear-gradient(180deg,#a8452c,#5a1a10);border-color:#ffb070;color:#fff}
#apRoot .ft{position:absolute;left:0;right:0;bottom:0;height:64px;display:flex;align-items:center;gap:16px;padding:0 20px 0 150px;background:linear-gradient(0deg,rgba(0,0,0,.85),rgba(0,0,0,0))}
#apRoot .ft .tip{flex:1;font-size:clamp(17px,2.3vh,20px);color:#e0d4bc;text-shadow:0 1px 6px #000}
#apRoot .bt{font:800 clamp(18px,2.5vh,23px) "Noto Serif CJK SC",serif;letter-spacing:.14em;padding:10px 30px;border:2px solid #b8914a;background:linear-gradient(180deg,#3a2a1a,#1d130b);color:#f3d9a0;cursor:pointer}#apRoot .bt:hover{filter:brightness(1.25)}#apRoot .bt.go{background:linear-gradient(180deg,#a8452c,#5a1a10);border-color:#ffb070;color:#fff}#apRoot .bt:disabled{opacity:.4;cursor:not-allowed}
#apRoot .tt{position:absolute;pointer-events:none;padding:8px 12px;font:700 18px system-ui;background:rgba(10,6,8,.95);border:2px solid #ffd27a;color:#fff;display:none;white-space:nowrap}
#apRoot .toast{position:absolute;left:50%;top:84px;transform:translateX(-50%);padding:8px 20px;font-size:19px;font-weight:700;background:rgba(10,6,8,.92);border:2px solid #ffd27a;display:none}
#apRoot .intro{position:absolute;left:50%;bottom:92px;transform:translateX(-50%);max-width:760px;padding:18px 30px;text-align:center;font-size:clamp(20px,3vh,26px);line-height:1.5;background:rgba(10,6,8,.85);border:2px solid rgba(231,194,122,.5);pointer-events:none;animation:apf 6s forwards}@keyframes apf{0%,70%{opacity:1}100%{opacity:0}}`;
    document.head.appendChild(s); }
  function mkRenderer(cv) { const r = new T.WebGLRenderer({ canvas: cv, antialias: true }); r.outputEncoding = T.sRGBEncoding; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.0; r.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); r.setClearColor(0x120a0c); return r; }
  const MOTEC = { stat: 0x7dff9a, aura: 0x7ac8ff, poke: 0xff9a70, tick: 0xe0a8ff };
  function open(L, done) {
    if (UI) return; if (!canOpen(L)) return; addCss(); try { document.exitPointerLock && document.exitPointerLock(); } catch (e) { }
    const fo = L.fo, f = fo.f; let B = L.apBake; // 只烘一次、词条只掷一次
    if (!B) { let root; try { root = Foe.cloneSkinned(f.root); B = bake(root); } catch (e) { console.warn('autopsy bake', e); B = null; } if (!B) { window.G && G.toast && G.toast('这具尸体没法放上解剖台', '#e88', 2); if (window.Dissect) Dissect.open(L, done); return; } const c = fo.h && fo.h.c, rar = c ? c.rar | 0 : 0; B.pts = rollAffixes(B.BN, rar, !!(fo.boss || fo.isBoss)); L.apBake = B; }
    const c = fo.h && fo.h.c, own = c ? c.name : (L.name || '无名者').replace(/的尸体$/, ''), race = c ? (c.raceN || c.race) : '', rar = c ? c.rar | 0 : 0;
    const root = document.createElement('div'); root.id = 'apRoot'; root.innerHTML = `<canvas id="apCv"></canvas><svg id="apLn"><line id="apL" stroke="#ffe9a8" stroke-width="3" stroke-linecap="round" style="filter:drop-shadow(0 0 6px #ff9a40)" display="none"/></svg>
<div class="hd"><h1>🔪 解剖台</h1><p>尸体：<b>${esc(own)}</b>　${esc(race || '')} · ${(window.Organs && Organs.RN[rar]) || ''}</p></div>
<div class="tools"><div class="tl on" data-tool="cut"><i>🔪</i><span>切割</span><small>1 · 拖线</small></div><div class="tl" data-tool="move"><i>✋</i><span>移动</span><small>2 · 拖动</small></div><div class="tl" data-tool="rot"><i>🔄</i><span>旋转</span><small>3 · 拖动</small></div><div class="tl on" data-act="xray"><i>👁</i><span>词条探查</span><small>V</small></div><div class="tl ${B.hasCloth ? '' : 'off'}" data-act="cloth"><i>👕</i><span>衣着</span><small id="apCl">原衣</small></div><div class="tl" data-act="undo"><i>↩</i><span>撤销</span><small>Ctrl+Z</small></div></div>
<div class="pn" id="apPn"></div><div class="tt" id="apTt"></div><div class="toast" id="apTs"></div>
<div class="intro">在身体上<b style="color:#ffd27a">拖出一条线</b>，沿线切开。右键拖动＝转视角，滚轮＝缩放。<br>身体里发光的小点是<b style="color:#ffd27a">词条</b>——切下带着它的那块，就是你的。</div>
<div class="ft"><div class="tip" id="apTip"></div><button class="bt" id="apX">放弃</button><button class="bt go" id="apGo" disabled>完成</button></div>`;
    document.body.appendChild(root);
    const cv = root.querySelector('#apCv'), R = mkRenderer(cv), sc = new T.Scene(), cam = new T.PerspectiveCamera(42, 1, 0.05, 40);
    sc.fog = new T.Fog(0x120a0c, 4, 9); sc.add(new T.HemisphereLight(0xfff0e0, 0x3a2028, 0.5)); const key = new T.DirectionalLight(0xffe6c8, 0.9); key.position.set(1.2, 3, 1.5); sc.add(key); const rim = new T.DirectionalLight(0x8aa0ff, 0.5); rim.position.set(-2, 1.5, -2); sc.add(rim); const lamp = new T.PointLight(0xffb070, 0.3, 6); lamp.position.set(0, 1.6, 0.3); sc.add(lamp);
    const slab = new T.Mesh(new T.CylinderGeometry(1.25, 1.3, 0.08, 48), new T.MeshStandardMaterial({ color: 0x070504, roughness: 0.95 })); slab.position.y = -0.04; sc.add(slab);
    const ring = new T.Mesh(new T.RingGeometry(1.1, 1.13, 64), new T.MeshBasicMaterial({ color: 0x2a1e10, side: T.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.002; sc.add(ring);
    const mats = {}, haloTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gd = g.createRadialGradient(32, 32, 2, 32, 32, 31); gd.addColorStop(0, 'rgba(255,255,255,1)'); gd.addColorStop(0.3, 'rgba(255,255,255,.55)'); gd.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gd; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c); })();
    const moteMat = k => mats[k] || (mats[k] = new T.SpriteMaterial({ map: haloTex, color: MOTEC[k], transparent: true, depthTest: false, depthWrite: false, blending: T.AdditiveBlending }));
    const st = { tool: 'cut', xray: true, linen: false, yaw: 0.9, pit: 0.62, dist: 2.35, tx: 0, ty: 0.08, tz: 0, pieces: [], sel: null, hist: [], id: 0, drag: null };
    const baseOg = { rar, q: 0.6 };
    // ---- 实体 ----
    function recenter(p) { const bb = bbOf(p.part.sets), c = bb.getCenter(new V3()); for (const s of p.part.sets) for (let i = 0; i < s.V.length; i += S) { s.V[i] -= c.x; s.V[i + 1] -= c.y; s.V[i + 2] -= c.z; s._g = null; } for (const pt of p.part.pts) { pt.p = [pt.p[0] - c.x, pt.p[1] - c.y, pt.p[2] - c.z]; } p.part.bb = bb.translate(c.clone().negate()); return c; }
    function geoOf(s) { if (s._g) return s._g; const V = s.V, n = V.length / S, P = new Float32Array(n * 3), N = new Float32Array(n * 3), Ca = new Float32Array(n * 3), Cb = new Float32Array(n * 3), U = new Float32Array(n * 2), W1 = new Float32Array(n), W0 = new Float32Array(n);
      for (let i = 0; i < n; i++) { for (let k = 0; k < 3; k++) { P[i * 3 + k] = V[i * S + k]; N[i * 3 + k] = V[i * S + 3 + k]; Ca[i * 3 + k] = V[i * S + 6 + k]; Cb[i * 3 + k] = V[i * S + 9 + k]; } U[i * 2] = V[i * S + 12]; U[i * 2 + 1] = V[i * S + 13]; W1[i] = V[i * S + 14]; }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('normal', new T.BufferAttribute(N, 3)); g.setAttribute('color', new T.BufferAttribute(Ca, 3)); g.setAttribute('uv', new T.BufferAttribute(U, 2)); g.setAttribute('tw', new T.BufferAttribute(W1, 1)); g.setIndex(new T.BufferAttribute(n > 65000 ? new Uint32Array(s.I) : new Uint16Array(s.I), 1)); g.userData.ca = g.attributes.color; g.userData.cb = new T.BufferAttribute(Cb, 3); g.userData.w1 = g.attributes.tw; g.userData.w0 = new T.BufferAttribute(W0, 1); g.computeBoundingSphere(); g.computeBoundingBox(); return (s._g = g); }
    const setLinen = (s, geo) => { const l = st.linen && s.cloth; geo.setAttribute('color', l ? geo.userData.cb : geo.userData.ca); geo.setAttribute('tw', l ? geo.userData.w0 : geo.userData.w1); };
    function build(p) { // 由 p.part 生成 Three 对象
      const g = new T.Group(); p.mats = []; p.meshes = []; for (const s of p.part.sets) { const geo = geoOf(s); setLinen(s, geo); const mt = mkMat(s.map, s.at); p.mats.push(mt); const m = new T.Mesh(geo, mt); m.userData.piece = p; g.add(m); p.meshes.push(m); }
      p.motes = []; for (const pt of p.part.pts) { const sp = new T.Sprite(moteMat(AFX[pt.a.id].k)); sp.position.set(...pt.p); const sz = 0.032 + pt.a.t * 0.008; sp.scale.set(sz, sz, 1); sp.renderOrder = 20; sp.userData.pt = pt; g.add(sp); p.motes.push(sp); const core = new T.Mesh(new T.SphereGeometry(0.0075, 8, 6), new T.MeshBasicMaterial({ color: 0xffffff, depthTest: false })); core.position.copy(sp.position); core.renderOrder = 21; g.add(core); p.motes.push(core); }
      p.name = pieceName(p.part); return g;
    }
    function addPiece(part, pos, quat, tgt) { const p = { id: ++st.id, part, take: false, obj: null }; const c = recenter(p); p.obj = build(p); p.obj.quaternion.copy(quat); p.obj.position.copy(pos).add(c.clone().applyQuaternion(quat)); if (tgt) p.tgt = p.obj.position.clone().add(tgt); sc.add(p.obj); st.pieces.push(p); applyXray(); return p; }
    function removePiece(p) { sc.remove(p.obj); p.mats.forEach(m => m.dispose()); const i = st.pieces.indexOf(p); if (i >= 0) st.pieces.splice(i, 1); if (st.sel === p) st.sel = null; }
    function applyXray() { for (const k in mats) mats[k].depthTest = !st.xray; for (const p of st.pieces) for (const m of p.motes) { if (m.isMesh) m.material.depthTest = !st.xray; m.visible = true; } }
    function snap() { st.hist.push(st.pieces.map(p => ({ part: p.part, pos: p.obj.position.clone(), q: p.obj.quaternion.clone(), take: p.take }))); if (st.hist.length > 10) st.hist.shift(); }
    function restore(h) { for (const p of st.pieces.slice()) removePiece(p); for (const e of h) { const p = addPiece(e.part, new V3(), new T.Quaternion()); p.obj.position.copy(e.pos); p.obj.quaternion.copy(e.q); p.take = e.take; const c = new V3(); } st.sel = null; ui(); }
    // 初始：躺在台上，脸朝上
    { const part = { sets: B.sets.map(s => ({ V: s.V.slice(), I: s.I.slice(), skin: s.skin, cap: s.cap, cloth: s.cloth, nm: s.nm, map: s.map, at: s.at })), pts: B.pts.map(x => ({ p: x.p.slice(), a: x.a })) }; part.bb = bbOf(part.sets); const q = new T.Quaternion().setFromAxisAngle(new V3(1, 0, 0), -Math.PI / 2); const p = addPiece(part, new V3(0, 0, 0), q); dropTo(p); p.obj.position.z = 0; }
    function worldMinY(p) { p.obj.updateMatrixWorld(true); let mn = 1e9; const v = new V3(); for (const m of p.meshes) { const pa = m.geometry.attributes.position, mw = p.obj.matrixWorld; for (let i = 0; i < pa.count; i += 2) { v.fromBufferAttribute(pa, i).applyMatrix4(mw); if (v.y < mn) mn = v.y; } } return mn; }
    function dropTo(p) { p.obj.position.y -= worldMinY(p); p.tgt = null; }
    // ---- 视角 / 输入 ----
    const ray = new T.Raycaster(), ndc = new T.Vector2(), lineEl = root.querySelector('#apL'), tt = root.querySelector('#apTt'), tip = root.querySelector('#apTip');
    const setNdc = (x, y) => { const r = cv.getBoundingClientRect(); ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam); return ray; };
    const allMeshes = () => st.pieces.flatMap(p => p.meshes), pickPiece = (x, y) => { cam.updateMatrixWorld(); st.pieces.forEach(p => p.obj.updateMatrixWorld(true)); const h = setNdc(x, y).intersectObjects(allMeshes(), false)[0]; return h ? { p: h.object.userData.piece, pt: h.point } : null; };
    const hints = { cut: '🔪 在身体上按住左键拖出一条线，松开即沿这条线所在的平面切开（转视角后再切，就是另一个角度）。', move: '✋ 拖动一块在台面上移动；松手自动落到台面。', rot: '🔄 拖动一块来旋转它；松手自动落到台面。' };
    const toast = (t) => { const e = root.querySelector('#apTs'); e.textContent = t; e.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => e.style.display = 'none', 2200); };
    function setTool(t) { st.tool = t; root.querySelectorAll('[data-tool]').forEach(e => e.classList.toggle('on', e.dataset.tool === t)); tip.textContent = hints[t]; }
    function doCut(x1, y1, x2, y2) {
      cam.updateMatrixWorld(); const o = cam.position.clone(), d1 = setNdc(x1, y1).ray.direction.clone(), d2 = setNdc(x2, y2).ray.direction.clone(), n = new V3().crossVectors(d1, d2).normalize(); if (!isFinite(n.x) || n.lengthSq() < 0.5) return; const d = -n.dot(o);
      const hit = new Set(); st.pieces.forEach(p => p.obj.updateMatrixWorld(true)); for (let k = 0; k <= 14; k++) { const t = k / 14, h = setNdc(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t).intersectObjects(allMeshes(), false)[0]; if (h) hit.add(h.object.userData.piece); }
      if (!hit.size) { toast('这一刀没碰到身体——从身体上划过去'); return; }
      const jobs = []; for (const p of hit) { const q = p.obj.quaternion, qi = q.clone().invert(), nL = n.clone().applyQuaternion(qi), dL = d + n.dot(p.obj.position); const r = cutPart(p.part, nL, dL); if (r) jobs.push({ p, r }); }
      if (!jobs.length) { toast('没切开——线要完整穿过一块'); return; }
      snap(); for (const j of jobs) { const p = j.p, q = p.obj.quaternion.clone(), pos = p.obj.position.clone(); removePiece(p); [0, 1].forEach(k => j.r[k].forEach(part => { const np = addPiece(part, pos, q, n.clone().multiplyScalar(k ? -0.035 : 0.035)); np.take = false; })); }
      AT.chop(); ui(); const lf = root.querySelector('#apFlash'); toast(`✂ 切开了：现在有 ${st.pieces.length} 块`);
    }
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); const rb = e.button === 2 || e.button === 1; st.drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, rb, shift: e.shiftKey, moved: false };
      if (!rb && st.tool !== 'cut') { const h = pickPiece(e.clientX, e.clientY); if (h) { st.drag.piece = h.p; st.sel = h.p; ui(); const pl = new T.Plane(new V3(0, 1, 0), -h.p.obj.position.y), hp = new V3(); setNdc(e.clientX, e.clientY).ray.intersectPlane(pl, hp); st.drag.off = h.p.obj.position.clone().sub(hp); st.drag.pl = pl; } } });
    cv.addEventListener('pointermove', e => { const D = st.drag; if (!D) { hover(e); return; } const dx = e.clientX - D.lx, dy = e.clientY - D.ly; D.lx = e.clientX; D.ly = e.clientY; if (Math.hypot(e.clientX - D.x, e.clientY - D.y) > 5) D.moved = true;
      if (D.rb) { if (D.shift) { const k = st.dist * 0.0014, r = new V3().setFromMatrixColumn(cam.matrixWorld, 0); st.tx -= r.x * dx * k; st.tz -= r.z * dx * k; st.ty = clamp(st.ty + dy * k, -0.2, 1); } else { st.yaw -= dx * 0.008; st.pit = clamp(st.pit + dy * 0.006, 0.05, 1.5); } return; }
      if (st.tool === 'cut') { lineEl.setAttribute('x1', D.x); lineEl.setAttribute('y1', D.y); lineEl.setAttribute('x2', e.clientX); lineEl.setAttribute('y2', e.clientY); lineEl.setAttribute('display', D.moved ? 'block' : 'none'); }
      else if (D.piece) { const p = D.piece; if (st.tool === 'move') { const hp = new V3(); if (setNdc(e.clientX, e.clientY).ray.intersectPlane(D.pl, hp)) { p.obj.position.x = hp.x + D.off.x; p.obj.position.z = hp.z + D.off.z; p.tgt = null; } } else { const r = new V3().setFromMatrixColumn(cam.matrixWorld, 0); p.obj.rotateOnWorldAxis(new V3(0, 1, 0), dx * 0.01); p.obj.rotateOnWorldAxis(r, dy * 0.01); } } });
    cv.addEventListener('pointerup', e => { const D = st.drag; st.drag = null; if (!D) return; lineEl.setAttribute('display', 'none'); if (D.rb) return;
      if (st.tool === 'cut') { if (D.moved && Math.hypot(e.clientX - D.x, e.clientY - D.y) > 24) doCut(D.x, D.y, e.clientX, e.clientY); else { const h = pickPiece(e.clientX, e.clientY); st.sel = h ? h.p : null; ui(); } }
      else if (D.piece) { if (D.moved) { snapMoveEnd(D.piece); } } else if (!D.moved) { const h = pickPiece(e.clientX, e.clientY); st.sel = h ? h.p : null; ui(); } });
    const snapMoveEnd = p => dropTo(p);
    cv.addEventListener('wheel', e => { e.preventDefault(); st.dist = clamp(st.dist * (1 + Math.sign(e.deltaY) * 0.1), 0.8, 7); }, { passive: false });
    function hover(e) { setNdc(e.clientX, e.clientY); const ms = []; for (const p of st.pieces) for (const m of p.motes) if (m.isSprite) ms.push(m); cam.updateMatrixWorld(); st.pieces.forEach(p => p.obj.updateMatrixWorld(true)); const h = ray.intersectObjects(ms, false)[0];
      if (h && h.object.userData.pt) { const a = h.object.userData.pt.a, d = AFX[a.id]; tt.innerHTML = `${d.ic} ${d.n}　<span style="color:${TC[d.k]}">${affText(a, baseOg)}</span>　<small style="color:#a99d88">${'★'.repeat(a.t)}</small>`; tt.style.display = 'block'; tt.style.left = Math.min(innerWidth - 360, e.clientX + 16) + 'px'; tt.style.top = e.clientY + 16 + 'px'; } else tt.style.display = 'none'; }
    // ---- 面板 ----
    const chips = p => { const m = {}; for (const pt of p.part.pts) { const k = pt.a.id; (m[k] = m[k] || []).push(pt.a); } return Object.entries(m).map(([k, v]) => { const d = AFX[k], a = { id: k, m: v.reduce((s, x) => s + x.m, 0) }; return `<span style="color:${TC[d.k]}">${d.ic} ${d.n}${v.length > 1 ? '×' + v.length : ''} · ${affText(a, baseOg)}</span>`; }).join(''); };
    function ui() { const pn = root.querySelector('#apPn'), tk = st.pieces.filter(p => p.take).length;
      pn.innerHTML = `<h2>🧩 切下的块 · ${st.pieces.length}</h2>` + st.pieces.map(p => { const sz = p.part.bb.getSize(new V3()); const mx = Math.round(Math.max(sz.x, sz.y, sz.z) * 100); return `<div class="pc ${st.sel === p ? 'sel' : ''} ${p.take ? 'tk' : ''}" data-p="${p.id}"><div class="t"><b>${esc(p.name)}</b><small>长 ${mx} cm</small></div>${p.part.pts.length ? `<div class="ch">${chips(p)}</div>` : '<div class="no">没有词条（可炼化成魂尘）</div>'}<button data-take="${p.id}">${p.take ? '✓ 已选取走' : '取走这块'}</button></div>`; }).join('');
      const g = root.querySelector('#apGo'); g.disabled = !tk; g.textContent = tk ? `完成 · 取走 ${tk} 块` : '完成'; st.pieces.forEach(p => { p.mats.forEach(m => m.emissive.setHex(p === st.sel ? 0x4a2a10 : p.take ? 0x2a1a08 : 0)); }); }
    root.addEventListener('click', e => { const t = e.target.closest('[data-tool]'); if (t) { setTool(t.dataset.tool); return; } const a = e.target.closest('[data-act]'); if (a) { act(a.dataset.act, a); return; }
      const tk = e.target.closest('[data-take]'); if (tk) { const p = st.pieces.find(x => x.id == tk.dataset.take); if (p) { if (!p.take && st.pieces.filter(x => x.take).length >= 8) { toast('最多一次带走 8 块'); return; } p.take = !p.take; ui(); } return; }
      const pc = e.target.closest('[data-p]'); if (pc) { st.sel = st.pieces.find(x => x.id == pc.dataset.p) || null; ui(); return; }
      if (e.target.id === 'apX') close(); else if (e.target.id === 'apGo') finish(); });
    function act(k, el) { if (k === 'xray') { st.xray = !st.xray; el.classList.toggle('on', st.xray); applyXray(); } else if (k === 'undo') { if (st.hist.length) restore(st.hist.pop()); else toast('没有可撤销的'); }
      else if (k === 'cloth') { if (!B.hasCloth) { toast('这具身体的衣服画在贴图上，没法换'); return; } st.linen = !st.linen; root.querySelector('#apCl').textContent = st.linen ? '素麻衣' : '原衣'; for (const p of st.pieces) p.part.sets.forEach((s, i) => { if (s.cloth && p.meshes[i]) setLinen(s, p.meshes[i].geometry); }); } }
    const onKey = e => { if (!UI) return; if (e.type === 'keydown') { if (e.code === 'Escape') close(); else if (e.code === 'Digit1') setTool('cut'); else if (e.code === 'Digit2') setTool('move'); else if (e.code === 'Digit3') setTool('rot'); else if (e.code === 'KeyV') act('xray', root.querySelector('[data-act=xray]')); else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) act('undo'); else if (st.sel && (e.code === 'KeyQ' || e.code === 'KeyE')) { st.sel.obj.rotateOnWorldAxis(new V3(0, 1, 0), (e.code === 'KeyQ' ? 1 : -1) * Math.PI / 12); dropTo(st.sel); } else if (st.sel && e.code === 'KeyF') { const r = new V3().setFromMatrixColumn(cam.matrixWorld, 0); st.sel.obj.rotateOnWorldAxis(r, Math.PI); dropTo(st.sel); } } if (e.code !== 'F12') e.stopPropagation(); };
    addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true);
    // ---- 完成：把选中的块变成物品 ----
    function finish() {
      const picks = st.pieces.filter(p => p.take); if (!picks.length) return; const S_ = window.Sack, Og = window.Organs; const items = S_.itemsOf ? S_.itemsOf(L) : (L.items = L.items || []); Og.defsNow && Og.defsNow(); const names = [];
      for (const p of picks) { const rec = pack(p, st.linen), pid = 'ap' + Date.now().toString(36) + p.id + Math.floor(Math.random() * 1e4), aff = p.part.pts.map(x => ({ id: x.a.id, m: x.a.m })), at = p.part.pts.length ? p.part.pts.reduce((s, x) => s + x.a.t, 0) / p.part.pts.length : 0;
        const og = { t: 'piece', own, race, rar, age: c ? c.age : 0, tr: c && c.traits ? c.traits.slice() : [], af: '', q: +clamp(0.4 + (at ? (at - 1) * 0.15 : -0.1) + rnd(-0.05, 0.05), 0.2, 1).toFixed(2), oid: own + '|' + (c ? c.id : 'x'), pid, nm: p.name, aff, dim: rec.dim.map(v => +v.toFixed(4)), note: `在解剖台上切下的「${p.name}」。${aff.length ? '体内带着 ' + aff.length + ' 条词条，摆进洞里生效。' : '里面什么词条也没有，只是一块肉骨。'}` };
        store(pid, rec); items.push(Og.mkItem(og)); names.push(p.name); }
      L.dissected = true; close(); AT.hit(); window.G && G.toast && G.toast(`🔪 取下 <b>${picks.length}</b> 块：${names.join('、')}（已放进尸体旁的战利品）`, '#e88', 3.4); window.G && G.save && G.save(); done && done();
    }
    // ---- 渲染循环 ----
    let raf = 0, last = performance.now(); const loop = () => { raf = requestAnimationFrame(loop); const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; const w = cv.clientWidth, h = cv.clientHeight; if (w && (cv.width !== Math.round(w * R.getPixelRatio()) || cv.height !== Math.round(h * R.getPixelRatio()))) { R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
      for (const p of st.pieces) if (p.tgt) { p.obj.position.lerp(p.tgt, 1 - Math.pow(0.0005, dt)); if (p.obj.position.distanceTo(p.tgt) < 0.0015) { p.obj.position.copy(p.tgt); p.tgt = null; } }
      const t = new V3(st.tx, st.ty, st.tz); cam.position.set(t.x + Math.sin(st.yaw) * Math.cos(st.pit) * st.dist, t.y + Math.sin(st.pit) * st.dist, t.z + Math.cos(st.yaw) * Math.cos(st.pit) * st.dist); cam.lookAt(t); R.render(sc, cam); };
    UI = { root, close: () => { cancelAnimationFrame(raf); removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true); R.forceContextLoss(); R.dispose(); for (const p of st.pieces) { p.mats.forEach(m => m.dispose()); p.part.sets.forEach(s => { if (s._g) s._g.dispose(); }); } root.remove(); }, st, doCut, cam, sc };
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
    for (const s of p.part.sets) { const n = s.V.length / S, P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3), U = new Float32Array(n * 2), W = new Float32Array(n), lin = linen && s.cloth;
      for (let i = 0; i < n; i++) { P[i * 3] = s.V[i * S] - c.x; P[i * 3 + 1] = s.V[i * S + 1] - c.y; P[i * 3 + 2] = s.V[i * S + 2] - c.z; for (let k = 0; k < 3; k++) { N[i * 3 + k] = s.V[i * S + 3 + k]; C[i * 3 + k] = s.V[i * S + (lin ? 9 : 6) + k]; } U[i * 2] = s.V[i * S + 12]; U[i * 2 + 1] = s.V[i * S + 13]; W[i] = lin ? 0 : s.V[i * S + 14]; }
      let tk = null; if (s.map && !lin) { tk = 't' + Object.keys(tex).length; const u = texURL(s.map, (s.at || 0) > 0); if (u) tex[tk] = u; else tk = null; }
      sets.push({ P, N, C, U, W, I: new Uint32Array(s.I), tk, at: s.at || 0 }); }
    return { sets, tex, dim: [sz.x, sz.y, sz.z] };
  }
  function store(pid, rec) { CACHE.set(pid, rec); idb().then(d => { const t = d.transaction('p', 'readwrite'); t.objectStore('p').put(Object.assign({ pid }, rec)); }).catch(e => console.warn('Autopsy IDB', e)); }
  const scaleFor = dim => { const mx = Math.max(...dim) || 0.1; return clamp(0.5, 0.07 / mx, 0.45 / mx); };
  function fill(g, rec) {
    const inner = new T.Group(), texs = {}; for (const k in rec.tex) { const t = new T.TextureLoader().load(rec.tex[k]); t.flipY = false; t.encoding = T.sRGBEncoding; t.anisotropy = 2; texs[k] = t; }
    for (const s of rec.sets) { const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(s.P, 3)); geo.setAttribute('normal', new T.BufferAttribute(s.N, 3)); geo.setAttribute('color', new T.BufferAttribute(s.C, 3)); geo.setAttribute('uv', new T.BufferAttribute(s.U, 2)); geo.setAttribute('tw', new T.BufferAttribute(s.W, 1)); geo.setIndex(new T.BufferAttribute(s.I, 1)); geo.computeBoundingSphere();
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
