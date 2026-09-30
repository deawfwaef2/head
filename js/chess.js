// 第八轮：头棋殿 —— 用收集的首级当棋子，按魂阶分配走法，与营地地精斯尼克（木制棋子）对弈 / 同屏双人。
// 独立 WebGLRenderer 全屏覆盖；主场景暂停（window.__pauseMain）。
// 规则（简化国际象棋）：吃掉对方「首领」即胜；兵到底线晋升为后；无王车易位/吃过路兵。
// 走法按魂阶：凡魂=兵 · 灵魂=马 · 英魂=象 · 圣魂=车 · 神魂=后 · 异色神魂 / 双魂印神魂=魂后(后+马)。首领=王。
window.Chess = (() => {
  const B = window.BuildCat, V3 = THREE.Vector3;
  // ---------------- 洞内建筑：头棋殿 ----------------
  if (B) {
    const { M, std, mesh, box, cyl, flame, glowMat } = B;
    const boardTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
      g.fillStyle = '#2a1a10'; g.fillRect(0, 0, 512, 512);
      for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) { g.fillStyle = (r + f) % 2 ? '#1c1614' : '#d8ccb0'; g.fillRect(32 + f * 56, 32 + r * 56, 56, 56); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${(r + f) % 2 ? '80,60,60' : '120,100,80'},${Math.random() * 0.15})`; g.fillRect(32 + f * 56 + Math.random() * 56, 32 + r * 56 + Math.random() * 56, 2 + Math.random() * 6, 1 + Math.random() * 2); } }
      g.strokeStyle = '#c89a3a'; g.lineWidth = 4; g.strokeRect(30, 30, 452, 452);
      const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; })();
    B.C.chess = { cat: 'func', n: '头棋殿', icon: '♟️', base: 1200, grow: 3, max: 1, fp: [1.55, 1.55], stat: { soul: 3, ter: 2 },
      desc: '黑曜石与白骨铺成的大型棋台。用你的首级当棋子（魂阶决定走法），和地精斯尼克对弈，或同屏双人。对着它按 E', chess: true,
      make() { const g = new THREE.Group();
        g.add(box(3.0, 0.3, 3.0, M.dark, 0, 0.15, 0)); g.add(box(3.1, 0.05, 3.1, M.gold, 0, 0.3, 0));
        g.add(box(2.3, 0.12, 2.3, M.stone, 0, 0.38, 0));
        const top = mesh(new THREE.PlaneGeometry(2.2, 2.2), std('#ffffff', { map: boardTex, roughness: 0.35, metalness: 0.1 }), 0, 0.442, 0); top.rotation.x = -Math.PI / 2; g.add(top);
        for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          g.add(cyl(0.11, 0.14, 2.2, M.stone, x * 1.38, 1.1, z * 1.38, 10)); g.add(box(0.34, 0.12, 0.34, M.dark, x * 1.38, 2.2, z * 1.38));
          g.add(cyl(0.16, 0.1, 0.12, M.iron, x * 1.38, 2.32, z * 1.38, 12)); g.add(flame(x * 1.38, 2.36, z * 1.38, 1.4));
        }
        // 小棋子装饰：木兵 + 骨兵
        for (let i = 0; i < 8; i++) { g.add(cyl(0.035, 0.05, 0.12, M.wood, -0.96 + i * 0.275, 0.505, -0.83, 10)); g.add(mesh(new THREE.SphereGeometry(0.04, 10, 8), M.wood, -0.96 + i * 0.275, 0.59, -0.83)); }
        for (let i = 0; i < 8; i++) { g.add(cyl(0.035, 0.05, 0.1, M.bone, -0.96 + i * 0.275, 0.495, 0.83, 10)); B.skull && g.add(B.skull(0.45, -0.96 + i * 0.275, 0.59, 0.83)); }
        // 斯尼克的小凳
        g.add(cyl(0.2, 0.22, 0.45, M.wood, 0, 0.225, -1.9, 10));
        return g; },
      cols: () => [[-1.5, 0, -1.5, 1.5, 0.44, 1.5], [-0.22, 0, -2.12, 0.22, 0.45, -1.68]], surface: 0.44 };
  }

  // ---------------- 规则引擎 ----------------
  const VAL = { P: 100, N: 310, B: 330, R: 500, Q: 900, A: 1250, K: 30000 };
  const NAME = { P: '兵', N: '马', B: '象', R: '车', Q: '后', A: '魂后', K: '首领' };
  const GLYPH = { P: '♟', N: '♞', B: '♝', R: '♜', Q: '♛', A: '✦', K: '♚' };
  const MOVE_DESC = { P: '向前 1 格（首步可 2 格），斜前方吃子，到底线晋升为后', N: '日字跳跃，可越子', B: '斜线任意格', R: '直线任意格', Q: '直线+斜线任意格', A: '后 + 马：直线斜线任意格，还能日字跳', K: '周围 1 格。被吃即输' };
  const KN = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
  const DI = [[1, 1], [1, -1], [-1, 1], [-1, -1]], OR = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const typeOfRec = r => { const c = r.c; if (c.rar >= 4 && (c.shiny || (c.aff && c.aff.length >= 2))) return 'A'; return ['P', 'N', 'B', 'R', 'Q'][Math.min(4, c.rar)]; };
  const XS = new Array(64).fill(null); // 第二十五轮：每颗头的「特殊走法」（HeadGame 按性格随机生成的跳跃偏移，随棋子移动）
  function gen(T, S, side, capsOnly) {
    const out = [];
    for (let i = 0; i < 64; i++) {
      if (!T[i] || S[i] !== side) continue;
      const t = T[i], f = i & 7, r = i >> 3;
      const add = (j) => { if (T[j] && S[j] === side) return false; if (capsOnly && !T[j]) return !T[j]; out.push([i, j]); return !T[j]; };
      if (XS[i] && t !== 'K') { const fw = side === 0 ? 1 : -1; for (const [dx, dy] of XS[i]) { const f1 = f + dx, r1 = r + dy * fw; if (f1 >= 0 && f1 < 8 && r1 >= 0 && r1 < 8) add(r1 * 8 + f1); } }
      if (t === 'P') {
        const d = side === 0 ? 1 : -1, r1 = r + d;
        if (r1 >= 0 && r1 < 8) {
          if (!capsOnly && !T[r1 * 8 + f]) { out.push([i, r1 * 8 + f]); const r2 = r + 2 * d; if ((side === 0 ? r === 1 : r === 6) && !T[r2 * 8 + f]) out.push([i, r2 * 8 + f]); }
          for (const df of [-1, 1]) { const f1 = f + df; if (f1 < 0 || f1 > 7) continue; const j = r1 * 8 + f1; if (T[j] && S[j] !== side) out.push([i, j]); }
        }
        continue;
      }
      if (t === 'N' || t === 'A') for (const [a, b] of KN) { const f1 = f + a, r1 = r + b; if (f1 >= 0 && f1 < 8 && r1 >= 0 && r1 < 8) add(r1 * 8 + f1); }
      if (t === 'K') { for (const [a, b] of DI.concat(OR)) { const f1 = f + a, r1 = r + b; if (f1 >= 0 && f1 < 8 && r1 >= 0 && r1 < 8) add(r1 * 8 + f1); } continue; }
      const dirs = t === 'B' ? DI : t === 'R' ? OR : (t === 'Q' || t === 'A') ? DI.concat(OR) : [];
      for (const [a, b] of dirs) { let f1 = f + a, r1 = r + b; while (f1 >= 0 && f1 < 8 && r1 >= 0 && r1 < 8) { if (!add(r1 * 8 + f1)) break; f1 += a; r1 += b; } }
    }
    return out;
  }
  const kingSq = (T, S, side) => { for (let i = 0; i < 64; i++) if (T[i] === 'K' && S[i] === side) return i; return -1; };
  function attacked(T, S, sq, bySide) { return gen(T, S, bySide, true).some(m => m[1] === sq); }
  const PST_C = [0, 1, 2, 3, 3, 2, 1, 0];
  function evalSide(T, S) { // 相对 side 0（白）。R49：加入兵形、开放线、双象、王安全、残局王活跃、特殊走法加成
    let v = 0; const pf = [new Array(8).fill(0), new Array(8).fill(0)], pr = [[], []], bish = [0, 0], mat = [0, 0]; let k0 = -1, k1 = -1;
    for (let i = 0; i < 64; i++) { const t = T[i]; if (!t) continue; const sd = S[i], f = i & 7, r = i >> 3; if (t === 'P') { pf[sd][f]++; pr[sd].push(i); } else if (t === 'K') { if (sd) k1 = i; else k0 = i; } else { mat[sd] += VAL[t]; if (t === 'B') bish[sd]++; } }
    const endg = mat[0] + mat[1] < 2600;
    for (let i = 0; i < 64; i++) { const t = T[i]; if (!t) continue; const sd = S[i], f = i & 7, r = i >> 3; let s = VAL[t]; const rr = sd === 0 ? r : 7 - r; // rr = 向前推进的行数
      if (t === 'P') {
        s += (rr - 1) * 9 + PST_C[f] * 2;
        if (pf[sd][f] > 1) s -= 12;
        if (!(f > 0 && pf[sd][f - 1]) && !(f < 7 && pf[sd][f + 1])) s -= 9;
        let passed = true; for (const j of pr[1 - sd]) { const jf = j & 7, jr = j >> 3, ar = sd === 0 ? jr > r : jr < r; if (ar && Math.abs(jf - f) <= 1) { passed = false; break; } }
        if (passed) s += 12 + rr * rr * 2 + (endg ? rr * 6 : 0);
        const sdir = sd === 0 ? -1 : 1, bj = (r + sdir) * 8; if (r + sdir >= 0 && r + sdir < 8) { if ((f > 0 && T[bj + f - 1] === 'P' && S[bj + f - 1] === sd) || (f < 7 && T[bj + f + 1] === 'P' && S[bj + f + 1] === sd)) s += 6; }
      } else if (t === 'K') {
        if (endg) { const cd = Math.abs(f - 3.5) + Math.abs(r - 3.5); s += (7 - cd) * 6; }
        else { let sh = 0; const fw = sd === 0 ? 1 : -1; for (let df = -1; df <= 1; df++) { const f1 = f + df, r1 = r + fw; if (f1 >= 0 && f1 < 8 && r1 >= 0 && r1 < 8) { const j = r1 * 8 + f1; if (T[j] && S[j] === sd) sh += T[j] === 'P' ? 10 : 5; } } s += sh; s -= rr * 10; /* 王别乱跑 */ }
      } else {
        s += (PST_C[f] + PST_C[r]) * (t === 'N' ? 6 : 3);
        if ((t === 'N' || t === 'B') && rr === 0) s -= 14; /* 没出动 */
        if (t === 'R') { if (!pf[sd][f]) s += pf[1 - sd][f] ? 10 : 18; if (rr === 6) s += 14; }
        if (t === 'B' && bish[sd] >= 2) s += 14;
        if (!endg && (t === 'Q' || t === 'A') && rr === 0 && false) s += 0;
      }
      if (XS[i] && t !== 'K') s += 18 + 5 * XS[i].length;
      v += sd === 0 ? s : -s; }
    // 王危险：对方重子离我方王近（本变体「首领被吃即输」）
    if (!endg) for (const sd of [0, 1]) { const ks = sd ? k1 : k0; if (ks < 0) continue; const kf = ks & 7, kr = ks >> 3; let d = 0; for (let i = 0; i < 64; i++) { const t = T[i]; if (!t || S[i] === sd || t === 'P' || t === 'K') continue; if (t !== 'Q' && t !== 'A' && t !== 'R' && t !== 'N') continue; const dist = Math.max(Math.abs((i & 7) - kf), Math.abs((i >> 3) - kr)); if (dist <= 3) d += (t === 'Q' || t === 'A' ? 26 : 12) * (4 - dist) / 3; } v += sd === 0 ? -d : d; }
    return v;
  }
  function makeMove(T, S, m) { const [a, b] = m; const cap = [T[b], S[b]]; const cx = XS[b]; XS[b] = XS[a]; XS[a] = null; T[b] = T[a]; S[b] = S[a]; T[a] = ''; S[a] = -1; let promo = false; if (T[b] === 'P' && ((S[b] === 0 && b >> 3 === 7) || (S[b] === 1 && b >> 3 === 0))) { T[b] = 'Q'; promo = true; } return [cap, promo, cx]; }
  function unmake(T, S, m, u) { const [a, b] = m; XS[a] = XS[b]; XS[b] = u[2] || null; T[a] = u[1] ? 'P' : T[b]; S[a] = S[b]; T[b] = u[0][0]; S[b] = u[0][1]; }
  // ---------------- R49：更强的棋 AI（迭代加深 + 置换表 + 杀手/历史启发 + PVS/LMR + 静态搜索 + 更好的评估）----------------
  let nodes = 0, deadline = 0, stopped = false;
  const TI = { P: 1, N: 2, B: 3, R: 4, Q: 5, A: 6, K: 0 };
  const rnd32 = () => (Math.random() * 4294967296) >>> 0;
  const Z1 = new Uint32Array(64 * 7 * 2 + 4).map(rnd32), Z2 = new Uint32Array(64 * 7 * 2 + 4).map(rnd32), ZX1 = new Uint32Array(64).map(rnd32), ZX2 = new Uint32Array(64).map(rnd32);
  const ZS1 = rnd32(), ZS2 = rnd32();
  let H1 = 0, H2 = 0;
  function hashOf(T, S, side) { let a = side ? ZS1 : 0, b = side ? ZS2 : 0; for (let i = 0; i < 64; i++) { const t = T[i]; if (!t) continue; const k = (i * 7 + TI[t]) * 2 + S[i]; a ^= Z1[k]; b ^= Z2[k]; if (XS[i]) { a ^= ZX1[i]; b ^= ZX2[i]; } } H1 = a >>> 0; H2 = b >>> 0; }
  let TT = new Map(), HIST = new Int32Array(4096); const KIL = []; for (let i = 0; i < 40; i++) KIL.push([-1, -1]);
  function order(T, ms, tm, ply) {
    const k = ply >= 0 ? KIL[ply] : null;
    for (const m of ms) { const v = T[m[1]]; m.s = tm && m[0] === tm[0] && m[1] === tm[1] ? 1e9 : v ? 1e6 + VAL[v] * 10 - VAL[T[m[0]]] / 10 : k && ((m[0] === k[0][0] && m[1] === k[0][1]) ? 9e5 : (m[0] === k[1][0] && m[1] === k[1][1]) ? 8e5 : 0) || HIST[m[0] * 64 + m[1]]; }
    return ms.sort((x, y) => y.s - x.s);
  }
  function qs(T, S, side, a, b, d) {
    const sp = (side === 0 ? 1 : -1) * evalSide(T, S); if (sp >= b) return sp; if (sp > a) a = sp; if (d <= 0) return sp;
    for (const m of order(T, gen(T, S, side, true), null, -1)) { if (T[m[1]] === 'K') return 50000; const u = makeMove(T, S, m); const v = -qs(T, S, 1 - side, -b, -a, d - 1); unmake(T, S, m, u); if (v >= b) return v; if (v > a) a = v; }
    return a;
  }
  function nega(T, S, side, depth, a, b, q, ply) {
    if ((++nodes & 1023) === 0 && performance.now() > deadline) stopped = true; if (stopped) return 0;
    if (depth <= 0) return q ? qs(T, S, side, a, b, 6) : (side === 0 ? 1 : -1) * evalSide(T, S);
    hashOf(T, S, side); const h1 = H1, h2 = H2; const e = TT.get(h1); let tm = null;
    if (e && e.h2 === h2) { tm = e.m; if (e.d >= depth && ply > 0) { if (e.f === 0) return e.v; if (e.f === 1 && e.v >= b) return e.v; if (e.f === 2 && e.v <= a) return e.v; } }
    const ms = order(T, gen(T, S, side), tm, ply); if (!ms.length) return -20000 + ply;
    let best = -1e9, bm = null; const a0 = a, K = KIL[ply] || KIL[39], cap = {};
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i]; if (T[m[1]] === 'K') return 50000 + depth;
      const isCap = !!T[m[1]], u = makeMove(T, S, m); let v;
      if (i === 0) v = -nega(T, S, 1 - side, depth - 1, -b, -a, q, ply + 1);
      else {
        const red = (i >= 4 && depth >= 3 && !isCap && m.s < 8e5) ? 1 : 0;
        v = -nega(T, S, 1 - side, depth - 1 - red, -a - 1, -a, q, ply + 1);
        if (v > a && (red || v < b)) v = -nega(T, S, 1 - side, depth - 1, -b, -a, q, ply + 1);
      }
      unmake(T, S, m, u); if (stopped) return 0;
      if (v > best) { best = v; bm = m; } if (v > a) a = v;
      if (a >= b) { if (!isCap) { if (!(K[0][0] === m[0] && K[0][1] === m[1])) { K[1] = K[0]; K[0] = [m[0], m[1]]; } HIST[m[0] * 64 + m[1]] += depth * depth; } break; }
    }
    if (TT.size > 400000) TT.clear();
    TT.set(h1, { h2, d: depth, v: best, f: best <= a0 ? 2 : best >= b ? 1 : 0, m: bm ? [bm[0], bm[1]] : null });
    return best;
  }
  function think(T, S, side, lv) {
    const L = LEVELS[Math.min(LEVELS.length - 1, lv - 1)]; nodes = 0; stopped = false; deadline = performance.now() + (L.time || 1800); HIST.fill(0);
    for (const k of KIL) { k[0] = [-1, -1]; k[1] = [-1, -1]; } if (TT.size > 150000) TT.clear();
    let ms = gen(T, S, side); if (!ms.length) return null;
    for (const m of ms) if (T[m[1]] === 'K') return m;
    for (let i = ms.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ms[i], ms[j]] = [ms[j], ms[i]]; }
    if (!L.md) { // 入门档：固定深度 + 噪声（让新手有赢面）
      let best = null, bv = -1e9;
      for (const m of order(T, ms, null, -1)) { const u = makeMove(T, S, m); let v = -nega(T, S, 1 - side, L.depth - 1, -1e9, 1e9, L.q, 1); unmake(T, S, m, u); v += (Math.random() - 0.5) * 2 * L.noise; if (v > bv) { bv = v; best = m; } }
      return best || ms[0];
    }
    let best = ms[0], pv = null;
    for (let d = 1; d <= L.md; d++) {
      const list = order(T, ms.slice(), pv, -1); let a = -1e9, itBest = null, done = true;
      for (let i = 0; i < list.length; i++) {
        const m = list[i], u = makeMove(T, S, m); let v;
        if (i === 0) v = -nega(T, S, 1 - side, d - 1, -1e9, -a, true, 1);
        else { v = -nega(T, S, 1 - side, d - 1, -a - 1, -a, true, 1); if (v > a && !stopped) v = -nega(T, S, 1 - side, d - 1, -1e9, -a, true, 1); }
        unmake(T, S, m, u); if (stopped) { done = false; break; }
        if (v > a) { a = v; itBest = m; }
      }
      if (itBest && (done || itBest === pv)) { best = itBest; pv = itBest; }
      else if (itBest && !done) { best = itBest; pv = itBest; } // 本层已搜出比上一层 PV 更好的着法时也采用
      if (stopped || a > 40000 || a < -40000) break;
    }
    return best;
  }

  // ---------------- 斯尼克的难度阶梯 ----------------
  const LEVELS = [
    { n: '见习·斯尼克', depth: 1, noise: 180, q: false, army: 'K8P' },
    { n: '认真的斯尼克', depth: 1, noise: 70, q: false, army: 'K8P2N' },
    { n: '算计的斯尼克', depth: 2, noise: 50, q: true, army: 'K8P2N2B' },
    { n: '标准棋局', depth: 3, noise: 14, q: true, army: 'STD' },
    { n: '斯尼克·全神贯注', md: 5, time: 1800, army: 'STD' },
    { n: '木马奇兵', md: 5, time: 2200, army: 'STD+2N' },
    { n: '双后之局', md: 6, time: 2600, army: 'STD+Q' },
    { n: '魂后降临', md: 6, time: 3000, army: 'STD+A' },
    { n: '地精棋会', md: 7, time: 3400, army: 'STD+Q+A' },
    { n: '斯尼克·不眠之夜', md: 8, time: 3800, army: 'STD+Q+A' },
    { n: '木之王庭', md: 9, time: 4300, army: 'STD+2Q+A' },
    { n: '地精棋圣', md: 10, time: 4800, army: 'STD+2A+2Q' }
  ];
  const reward = lv => Math.round(150 * Math.pow(1.85, lv - 1));
  function woodArmy(code) { // 返回 [{t, sq}]（以黑方视角：rank 7 为底线）
    const back = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'], pcs = [];
    if (code === 'K8P') { pcs.push({ t: 'K', f: 4, r: 7 }); for (let f = 0; f < 8; f++) pcs.push({ t: 'P', f, r: 6 }); return pcs; }
    if (code === 'K8P2N') { pcs.push({ t: 'K', f: 4, r: 7 }, { t: 'N', f: 1, r: 7 }, { t: 'N', f: 6, r: 7 }); for (let f = 0; f < 8; f++) pcs.push({ t: 'P', f, r: 6 }); return pcs; }
    if (code === 'K8P2N2B') { pcs.push({ t: 'K', f: 4, r: 7 }, { t: 'N', f: 1, r: 7 }, { t: 'N', f: 6, r: 7 }, { t: 'B', f: 2, r: 7 }, { t: 'B', f: 5, r: 7 }); for (let f = 0; f < 8; f++) pcs.push({ t: 'P', f, r: 6 }); return pcs; }
    back.forEach((t, f) => pcs.push({ t, f, r: 7 })); const pw = ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'];
    const ups = (code.split('+').slice(1)); let k = 0; const slot = [3, 4, 2, 5, 1, 6, 0, 7];
    for (const u of ups) { const m = u.match(/^(\d?)([NQA])$/); if (!m) continue; const n = +(m[1] || 1); for (let i = 0; i < n; i++) pw[slot[k++ % 8]] = m[2]; }
    pw.forEach((t, f) => pcs.push({ t, f, r: 6 })); return pcs;
  }
  // 玩家首级军团：leader=王，其余按价值排：最强者上底线，其余前排
  function headArmy(recs, leader, side) {
    const pcs = []; const rb = side === 0 ? 0 : 7, rf = side === 0 ? 1 : 6;
    pcs.push({ t: 'K', f: 4, r: rb, rec: leader });
    const rest = recs.filter(r => r !== leader).map(r => ({ rec: r, t: typeOfRec(r) })).sort((a, b) => VAL[b.t] - VAL[a.t]).slice(0, 15);
    const backOrder = [3, 2, 5, 1, 6, 0, 7], frontOrder = [3, 4, 2, 5, 1, 6, 0, 7];
    const officers = rest.filter(p => p.t !== 'P'), pawns = rest.filter(p => p.t === 'P');
    const back = officers.slice(0, 7), extra = officers.slice(7);
    back.forEach((p, i) => pcs.push({ t: p.t, f: backOrder[i], r: rb, rec: p.rec }));
    const fr = pawns.concat(extra).slice(0, 8);
    // 兵排在中间，额外军官排两翼
    fr.forEach((p, i) => pcs.push({ t: p.t, f: frontOrder[i], r: rf, rec: p.rec }));
    return pcs;
  }
  function autoPick(recs, exclude = []) {
    const pool = recs.filter(r => !exclude.includes(r)).slice().sort((a, b) => (b.c.rar - a.c.rar) || ((b.c.shiny ? 1 : 0) - (a.c.shiny ? 1 : 0)));
    const pick = pool.slice(0, 16); if (!pick.length) return { list: [], leader: null };
    // 首领：选一颗稀有度中等的（不浪费最强的后），优先有称号的
    const sorted = pick.slice().sort((a, b) => a.c.rar - b.c.rar);
    const leader = sorted.find(r => r.c.title) || sorted[Math.floor(sorted.length / 2)];
    return { list: pick, leader };
  }

  // ---------------- 3D 对局 ----------------
  let el = null, R = null, scene, cam, raf = 0, st = null, lastT = 0;
  const hitList = [];
  const css = `
  #chess{position:fixed;inset:0;z-index:30;display:none;background:#07050a;font-family:"Microsoft YaHei","PingFang SC",system-ui,sans-serif;color:#f0e2c8;user-select:none;overflow:hidden}
  #chess canvas.c3{position:absolute;inset:0;width:100%;height:100%}
  #chess .ch-vig{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .25s;background:radial-gradient(ellipse at 50% 50%,transparent 45%,rgba(255,20,30,.55) 100%)}
  #chess .ch-top{position:absolute;left:50%;top:10px;transform:translateX(-50%);text-align:center;pointer-events:none;width:min(520px,44vw)}
  #chess .ch-title{font-size:15px;letter-spacing:5px;color:#d8b888;text-shadow:0 2px 8px #000}
  #chess .ch-turn{margin:5px auto 0;font-size:20px;font-weight:900;padding:5px 22px;border-radius:26px;background:rgba(20,12,8,.82);border:2px solid var(--tc,#ff9a5a);color:#fff3e0;display:inline-block;box-shadow:0 0 18px var(--tc,#ff9a5a);transition:all .3s}
  #chess .ch-turn.me{animation:chpulse 1.6s ease-in-out infinite}@keyframes chpulse{50%{box-shadow:0 0 30px var(--tc,#ff9a5a),0 0 4px var(--tc,#ff9a5a) inset}}
  #chess .ch-bar{margin:8px auto 0;height:10px;border-radius:6px;overflow:hidden;display:flex;background:#0008;border:1px solid #ffffff30;width:100%}
  #chess .ch-bar i{display:block;height:100%;transition:width .7s cubic-bezier(.2,.8,.2,1)}#chess .ch-bar .a{background:linear-gradient(90deg,#ff7a4a,#ffb070)}#chess .ch-bar .b{background:linear-gradient(90deg,#70b8ff,#3a78d8)}
  #chess .ch-barl{display:flex;justify-content:space-between;font-size:12px;margin-top:3px;color:#d8c8a8;text-shadow:0 1px 4px #000}
  #chess .ch-col{position:absolute;top:10px;bottom:70px;width:clamp(200px,17.5vw,270px);display:flex;flex-direction:column;gap:8px;pointer-events:none}
  #chess .ch-col.l{left:10px}#chess .ch-col.r{right:10px}
  #chess .pn{background:rgba(16,10,7,.86);border:1px solid #6a4a2e;border-radius:12px;padding:10px 12px;font-size:13px;line-height:1.6;pointer-events:auto;backdrop-filter:blur(3px)}
  #chess .pn h4{margin:0 0 6px;color:#ffcf7a;font-size:13px;letter-spacing:2px;font-weight:700}
  #chess .ic{border-color:var(--c,#6a4a2e);box-shadow:0 0 16px -4px var(--c,#0000);transition:opacity .2s}
  #chess .ic-h{display:flex;gap:10px;align-items:center}#chess .ic-g{font-size:34px;line-height:1;color:var(--c);text-shadow:0 0 12px var(--c)}
  #chess .ic-h b{font-size:19px;color:var(--c);display:block;line-height:1.2}#chess .ic-h small{color:#c8b090;font-size:12px}
  #chess .ic-mv{display:grid;grid-template-columns:repeat(8,1fr);gap:1px;margin:8px auto;width:min(100%,168px);aspect-ratio:1;background:#0008;padding:2px;border-radius:6px}
  #chess .ic-mv i{display:block;background:#2a1e18;border-radius:1px;position:relative}#chess .ic-mv i:nth-child(odd){background:#33261e}
  #chess .ic-mv i.m::after,#chess .ic-mv i.x::after,#chess .ic-mv i.me::after{content:"";position:absolute;inset:22%;border-radius:50%;background:#7aff9a}
  #chess .ic-mv i.x::after{background:#ffd040;transform:rotate(45deg);border-radius:2px;inset:18%;box-shadow:0 0 6px #ffd040}#chess .ic-mv i.me::after{background:var(--c);inset:8%;box-shadow:0 0 8px var(--c)}
  #chess .ic-t{font-size:13px}#chess .ic-t b{color:#ffe0a0}#chess .ic-x{margin-top:5px;color:#ffd040;font-size:12px}#chess .ic-q{margin-top:6px;color:#c8b090;font-size:12px;font-style:italic}
  #chess .ic-tip{color:#b8a080;font-size:12px}
  #chess .ch-snik{display:flex;gap:10px;align-items:flex-start;background:rgba(40,64,20,.55);border-color:#4a6a2a}
  #chess .ch-snik b{color:#b8e070}#chess .ch-say{font-size:13px;min-height:2.6em}
  #chess .ch-cap{display:flex;flex-wrap:wrap;gap:4px;min-height:22px}#chess .ch-cap span{padding:1px 6px;border-radius:10px;background:#0008;border:1px solid var(--c);color:var(--c);font-size:12px;animation:chpop .4s}
  @keyframes chpop{from{transform:scale(2);opacity:0}}
  #chess .ch-logw{flex:1;min-height:0;display:flex;flex-direction:column}#chess .ch-log{font-size:12.5px;color:#d8c4a4;overflow:auto;flex:1;line-height:1.75}
  #chess .ch-log div{padding:0 2px;border-left:3px solid var(--c);padding-left:6px;margin-bottom:1px}#chess .ch-log div:last-child{background:#ffffff14}
  #chess .ch-bot{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);display:flex;gap:8px}
  #chess button{font:inherit;font-size:14px;font-weight:800;padding:8px 16px;border-radius:10px;border:1px solid #6a4a2e;background:#2e1e14;color:#eadcc4;cursor:pointer}
  #chess button:hover{background:#4a2e1c;border-color:#b08050}
  #chess button.red{background:linear-gradient(180deg,#a01810,#600a06);border-color:#ff6a4a}
  #chess .ch-help{position:absolute;left:12px;bottom:12px;font-size:12px;color:rgba(240,226,200,.6);pointer-events:none;max-width:24vw;line-height:1.5}
  #chess .ch-leg{position:absolute;inset:0;display:none;place-items:center;background:#000a;z-index:3}#chess .ch-leg.on{display:grid}
  #chess .ch-leg>div{width:min(620px,92vw);max-height:84vh;overflow:auto}#chess .ch-leg p{margin:3px 0;font-size:14px}
  #chess .ch-tag{position:absolute;transform:translate(-50%,-100%);padding:3px 10px;border-radius:12px;background:#140c08e8;border:1px solid var(--c);color:var(--c);font-size:13px;font-weight:700;white-space:nowrap;pointer-events:none;display:none;box-shadow:0 0 12px -2px var(--c)}
  #chess .ch-bub{position:absolute;transform:translate(-50%,-100%);max-width:200px;padding:6px 10px;border-radius:12px 12px 12px 2px;background:#fff6e4;color:#2a1a10;font-size:14px;font-weight:600;line-height:1.4;pointer-events:none;box-shadow:0 4px 14px #000a;border:2px solid var(--c);animation:chbub .25s}
  @keyframes chbub{from{opacity:0;margin-top:14px}}
  #chess .ch-fl{position:absolute;font-size:22px;font-weight:900;color:var(--c);text-shadow:0 0 10px var(--c),0 2px 0 #000,0 0 3px #000;pointer-events:none;animation:chfl 1.3s ease-out forwards;white-space:nowrap}
  @keyframes chfl{0%{transform:translate(-50%,-30%) scale(.3);opacity:0}15%{transform:translate(-50%,-70%) scale(1.3);opacity:1}100%{transform:translate(-50%,-260%) scale(1);opacity:0}}
  #chess .ch-flash{position:absolute;left:50%;top:32%;transform:translate(-50%,-50%);font-size:clamp(40px,6vw,84px);font-weight:900;letter-spacing:10px;color:var(--c,#ffd890);text-shadow:0 0 34px var(--c,#ff8040),0 5px 0 #2a0a06;pointer-events:none;opacity:0;text-align:center}
  #chess .ch-flash.on{animation:chflash 1.5s ease-out}@keyframes chflash{0%{opacity:0;transform:translate(-50%,-50%) scale(2.4)}14%{opacity:1;transform:translate(-50%,-50%) scale(1)}70%{opacity:1}100%{opacity:0;transform:translate(-50%,-62%) scale(1.05)}}
  #chess .ch-flash small{display:block;font-size:.26em;letter-spacing:3px;color:#ffe8c0}
  #chess .ch-banner{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);font-size:56px;font-weight:900;letter-spacing:8px;text-shadow:0 0 30px rgba(255,120,40,.7),0 4px 0 #3a0a06;opacity:0;transition:opacity .4s;pointer-events:none;text-align:center}
  #chess .ch-banner small{display:block;font-size:20px;letter-spacing:2px;color:#ffd890}
  #chess .ch-banner.on{opacity:1}
  #chess .ch-log .mn{opacity:.45;margin-right:5px;font-size:11px}#chess .ch-log em{color:#ff8a6a;font-style:normal}#chess .ch-log .cp{background:#ff3a2a14}
  #chlobby{position:fixed;inset:0;z-index:31;display:flex;align-items:center;justify-content:center;background:rgba(6,3,2,.8);font-family:"Microsoft YaHei","PingFang SC",system-ui,sans-serif;color:#f0e2c8}
  #chlobby .box{width:min(1100px,96vw);max-height:92vh;overflow:auto;background:linear-gradient(180deg,#24160f,#140c08);border:2px solid #6a4a2e;border-radius:20px;padding:18px 22px}
  #chlobby h2{margin:0 0 4px;font-size:28px}#chlobby .sub{color:#b09070;font-size:14px;margin-bottom:10px}
  #chlobby .lv{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;margin:8px 0 14px}
  #chlobby .lvi{border:2px solid #3e2a1a;border-radius:12px;padding:8px 10px;cursor:pointer;background:#1e140e;font-size:13px}
  #chlobby .lvi.on{border-color:#ffcf7a;background:#3a2614}#chlobby .lvi.lock{opacity:.35;cursor:not-allowed}
  #chlobby .lvi b{display:block;font-size:14px}
  #chlobby .army{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:6px;max-height:300px;overflow:auto;padding:4px}
  #chlobby .hc{border:2px solid #3e2a1a;border-radius:10px;padding:6px 7px;cursor:pointer;font-size:12px;background:#1a110c;position:relative}
  #chlobby .hc.in{border-color:var(--c);background:#2a1c10}#chlobby .hc.lead{box-shadow:0 0 0 2px #ffcf7a inset}
  #chlobby .hc .t{position:absolute;right:6px;top:4px;font-size:18px}
  #chlobby .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px}
  #chlobby button{font:inherit;font-size:15px;font-weight:800;padding:9px 18px;border-radius:10px;border:1px solid #6a4a2e;background:#2e1e14;color:#eadcc4;cursor:pointer}
  #chlobby button.on,#chlobby button.red{background:linear-gradient(180deg,#a01810,#600a06);border-color:#ff6a4a}
  #chlobby .legend{font-size:12px;color:#c8a878;line-height:1.7}`;
  const RCOL = ['#b8b8c0', '#4aa8ff', '#c05aff', '#ffb020', '#ff4a8a'], RNAME = ['凡魂', '灵魂', '英魂', '圣魂', '神魂'];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // 木纹 / 大理石纹理
  function woodTex(dark) { const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d'); g.fillStyle = dark ? '#3a2412' : '#b07a44'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 70; i++) { g.strokeStyle = dark ? `rgba(15,6,2,${0.2 + Math.random() * 0.35})` : `rgba(90,50,20,${0.15 + Math.random() * 0.3})`; g.lineWidth = 1 + Math.random() * 2.5; g.beginPath(); const x = Math.random() * 256; g.moveTo(x, 0); for (let y = 0; y <= 256; y += 16) g.lineTo(x + Math.sin(y * 0.03 + i) * 6, y); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
  function marbleTex(base, vein) { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 14; i++) { g.strokeStyle = vein; g.globalAlpha = 0.15 + Math.random() * 0.3; g.lineWidth = 0.6 + Math.random() * 1.8; g.beginPath(); let x = Math.random() * 256, y = 0; g.moveTo(x, y); while (y < 256) { x += (Math.random() - 0.5) * 30; y += 10 + Math.random() * 20; g.lineTo(x, y); } g.stroke(); }
    g.globalAlpha = 1; const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
  let MAT = null;
  function mats() { if (MAT) return MAT;
    MAT = { light: new THREE.MeshStandardMaterial({ map: marbleTex('#e6dcc6', '#8a7a68'), roughness: 0.25, metalness: 0.05 }), dark: new THREE.MeshStandardMaterial({ map: marbleTex('#1e1818', '#6a4a5a'), roughness: 0.2, metalness: 0.15 }),
      frame: new THREE.MeshStandardMaterial({ map: woodTex(true), roughness: 0.55 }), gold: new THREE.MeshStandardMaterial({ color: '#d8a840', metalness: 1, roughness: 0.3 }),
      woodL: new THREE.MeshStandardMaterial({ map: woodTex(false), roughness: 0.45, metalness: 0.02 }), woodD: new THREE.MeshStandardMaterial({ map: woodTex(true), roughness: 0.45 }),
      bone: new THREE.MeshStandardMaterial({ color: '#e8dcc0', roughness: 0.5 }), obs: new THREE.MeshStandardMaterial({ color: '#1a1420', roughness: 0.2, metalness: 0.4 }),
      velvetW: new THREE.MeshStandardMaterial({ color: '#6a0a1a', roughness: 0.95 }), velvetB: new THREE.MeshStandardMaterial({ color: '#1a2a5a', roughness: 0.95 }),
      stone: new THREE.MeshStandardMaterial({ color: '#2e2a28', roughness: 0.95 }) };
    return MAT; }
  // 车床棋子轮廓（经典斯汤顿风格，单位：格）
  const PROF = {
    base: [[0, 0], [0.34, 0], [0.34, 0.05], [0.3, 0.08], [0.3, 0.11], [0.22, 0.15]],
    P: [[0.14, 0.22], [0.1, 0.34], [0.16, 0.37], [0.16, 0.39], [0.09, 0.41], [0.13, 0.47], [0.13, 0.53], [0.08, 0.58], [0, 0.6]],
    R: [[0.2, 0.2], [0.16, 0.3], [0.15, 0.5], [0.22, 0.54], [0.22, 0.66], [0, 0.66]],
    B: [[0.15, 0.24], [0.1, 0.42], [0.18, 0.46], [0.1, 0.49], [0.14, 0.58], [0.12, 0.7], [0.05, 0.77], [0.04, 0.8], [0, 0.82]],
    Q: [[0.16, 0.24], [0.1, 0.52], [0.2, 0.56], [0.12, 0.6], [0.16, 0.66], [0.22, 0.84], [0.14, 0.86], [0.06, 0.9], [0, 0.93]],
    K: [[0.17, 0.24], [0.11, 0.56], [0.21, 0.6], [0.12, 0.64], [0.17, 0.72], [0.19, 0.88], [0.08, 0.9], [0, 0.9]],
    A: [[0.16, 0.24], [0.1, 0.52], [0.2, 0.56], [0.12, 0.6], [0.16, 0.66], [0.22, 0.84], [0.14, 0.86], [0.06, 0.9], [0, 0.93]],
    N: [[0.16, 0.22], [0.14, 0.3], [0, 0.3]]
  };
  const geoCache = {};
  function lathe(k) { if (geoCache[k]) return geoCache[k]; const pts = PROF.base.concat(PROF[k]).map(([x, y]) => new THREE.Vector2(x, y)); const g = new THREE.LatheGeometry(pts, 28); g.computeVertexNormals(); return (geoCache[k] = g); }
  function knightHead() { if (geoCache.kh) return geoCache.kh; const s = new THREE.Shape(); s.moveTo(-0.12, 0); s.lineTo(0.14, 0); s.quadraticCurveTo(0.12, 0.2, 0.06, 0.3); s.lineTo(0.16, 0.32); s.quadraticCurveTo(0.22, 0.38, 0.14, 0.44); s.lineTo(0.0, 0.5); s.quadraticCurveTo(-0.08, 0.52, -0.1, 0.46); s.lineTo(-0.16, 0.34); s.quadraticCurveTo(-0.2, 0.14, -0.12, 0); const g = new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 3 }); g.translate(0, 0, -0.07); g.rotateY(-Math.PI / 2); g.computeVertexNormals(); return (geoCache.kh = g); }
  function woodPiece(t, side) { const m = mats(), mat = side === 1 ? m.woodD : m.woodL, g = new THREE.Group();
    const body = new THREE.Mesh(lathe(t === 'N' ? 'N' : t), mat); body.castShadow = true; g.add(body);
    if (t === 'N') { const h = new THREE.Mesh(knightHead(), mat); h.position.y = 0.28; h.rotation.y = side === 1 ? 0 : Math.PI; h.castShadow = true; g.add(h); }
    if (t === 'K') { const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.05), mat); c1.position.y = 0.98; g.add(c1); const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.05), mat); c2.position.y = 1.0; g.add(c2); }
    if (t === 'Q' || t === 'A') { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), t === 'A' ? m.gold : mat); b.position.set(Math.cos(a) * 0.17, 0.87, Math.sin(a) * 0.17); g.add(b); } }
    if (t === 'R') { for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.06), mat); b.position.set(Math.cos(a) * 0.18, 0.69, Math.sin(a) * 0.18); b.rotation.y = -a; g.add(b); } }
    return g; }
  // 第二十七轮：棋子 = 只有头（没有底座）。脚下只有一圈队色光环 + 软阴影；头悬浮微微起伏，始终转向镜头；头顶是清晰的“棋种徽章”。
  function glyphSprite(t, side, rar) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const col = RCOL[Math.min(4, rar || 0)];
    g.beginPath(); g.arc(64, 64, 56, 0, 7); g.fillStyle = 'rgba(16,10,8,.9)'; g.fill(); g.lineWidth = 10; g.strokeStyle = side ? '#5ab0ff' : '#ff8a52'; g.stroke();
    g.lineWidth = 3; g.strokeStyle = col; g.beginPath(); g.arc(64, 64, 45, 0, 7); g.stroke();
    g.font = 'bold 66px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff3dc'; g.shadowColor = col; g.shadowBlur = 10; g.fillText(GLYPH[t], 64, 70);
    const tx = new THREE.CanvasTexture(c); tx.encoding = THREE.sRGBEncoding; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, depthTest: false })); sp.renderOrder = 10; sp.scale.setScalar(0.36); return sp; }
  function headPiece(p) { const g = new THREE.Group(), side = p.s, yaw = new THREE.Group(); g.add(yaw); g.userData.yaw = yaw;
    const tc = side ? '#5ab0ff' : '#ff8a52';
    const shd = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.42, depthWrite: false })); shd.rotation.x = -Math.PI / 2; shd.position.y = 0.008; g.add(shd); g.userData.shadow = shd;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.375, 40), new THREE.MeshBasicMaterial({ color: tc, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.012; g.add(ring); g.userData.ring = ring;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32), new THREE.MeshBasicMaterial({ color: tc, transparent: true, opacity: 0.16, depthWrite: false })); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.011; g.add(disc);
    const top = 0.06; let hb = null;
    try { hb = ModelHeads.create(p.rec.look); const S = 3.0; hb.group.scale.setScalar(S); const meta = hb.meta || {}, cut = meta.cut || { x: 0, y: meta.bottom || -0.1, z: 0 };
      hb.group.position.set(-(cut.x || 0) * S, top - cut.y * S, -(cut.z || 0) * S); // 面朝 +z，yaw 组负责转向镜头
      hb.group.traverse(o => { if (o.isMesh) o.castShadow = true; }); yaw.add(hb.group);
    } catch (e) { console.warn('chess head', e); }
    const gs = glyphSprite(p.t, side, p.rec.c.rar); gs.position.y = top + 0.9; yaw.add(gs); g.userData.glyph = gs;
    if (p.rec.c.shiny || p.rec.c.rar >= 3) { const lt = new THREE.PointLight(p.rec.c.shiny ? '#fff2b0' : RCOL[p.rec.c.rar], 0.5, 1.4); lt.position.y = top + 0.4; yaw.add(lt); }
    g.userData.hb = hb; return g; }

  function sqPos(i) { return new V3((i & 7) - 3.5, 0, 3.5 - (i >> 3)); }
  function buildScene() {
    scene = new THREE.Scene(); scene.background = new THREE.Color('#07050a'); scene.fog = new THREE.Fog('#07050a', 14, 34);
    cam = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    const m = mats();
    scene.add(new THREE.HemisphereLight('#ffe8d0', '#201028', 0.4));
    const key = new THREE.DirectionalLight('#ffe2c0', 1.25); key.position.set(4, 10, 6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); const sc = key.shadow.camera; sc.left = -7; sc.right = 7; sc.top = 7; sc.bottom = -7; sc.near = 1; sc.far = 30; key.shadow.bias = -0.0008; scene.add(key);
    const rim = new THREE.DirectionalLight('#8a6aff', 0.6); rim.position.set(-6, 5, -8); scene.add(rim);
    // 棋盘
    const board = new THREE.Group(); scene.add(board);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.5, 9.4), m.frame); frame.position.y = -0.27; frame.receiveShadow = true; board.add(frame);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(8.3, 0.06, 8.3), m.gold); trim.position.y = -0.1; board.add(trim);
    const tileG = new THREE.BoxGeometry(0.985, 0.1, 0.985);
    for (let i = 0; i < 64; i++) { const f = i & 7, r = i >> 3; const t = new THREE.Mesh(tileG, (f + r) % 2 ? m.light : m.dark); const p = sqPos(i); t.position.set(p.x, -0.05, p.z); t.receiveShadow = true; t.userData.sq = i; board.add(t); hitList.push(t); }
    // 坐标
    const lbl = (txt, x, z) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#e8c878'; g.font = 'bold 40px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 32, 34); const tx = new THREE.CanvasTexture(c); const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ map: tx, transparent: true })); pl.rotation.x = -Math.PI / 2; pl.position.set(x, -0.015, z); board.add(pl); };
    for (let f = 0; f < 8; f++) { lbl('abcdefgh'[f], f - 3.5, 4.35); lbl('abcdefgh'[f], f - 3.5, -4.35); }
    for (let r = 0; r < 8; r++) { lbl(String(r + 1), -4.35, 3.5 - r); lbl(String(r + 1), 4.35, 3.5 - r); }
    // 石台 + 地面 + 柱子 + 火盆
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48), m.stone); floor.rotation.x = -Math.PI / 2; floor.position.y = -1.6; floor.receiveShadow = true; scene.add(floor);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(5.8, 6.4, 1.1, 8), m.stone); ped.position.y = -1.07; ped.receiveShadow = true; scene.add(ped);
    st && (st.fires = []);
    const fires = [];
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3, x = Math.cos(a) * 10, z = Math.sin(a) * 10;
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 9, 10), m.stone); p.position.set(x, 2.9, z); scene.add(p);
      const bw = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.3, 0.4, 12), m.gold); bw.position.set(x * 0.72, 0.2, z * 0.72); scene.add(bw);
      const fl = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.8, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#ff9a3a', transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false })); fl.position.set(x * 0.72, 0.75, z * 0.72); scene.add(fl);
      const pl = new THREE.PointLight('#ff8a3a', 0.8, 11, 1.6); pl.position.set(x * 0.72, 1.2, z * 0.72); scene.add(pl); fires.push({ fl, pl, k: Math.random() * 10 }); }
    // 斯尼克
    const gob = new THREE.Group(); gob.position.set(0, -0.5, -6.6); scene.add(gob);
    const skin = new THREE.MeshStandardMaterial({ color: '#6a9a3a', roughness: 0.65 }), robe = new THREE.MeshStandardMaterial({ color: '#4a2a5a', roughness: 0.9 });
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 1.0, 12), m.woodD); stool.position.y = -0.1; gob.add(stool);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 0.9, 8, 16), robe); body.position.y = 1.2; gob.add(body);
    const hd = new THREE.Group(); hd.position.y = 2.55; gob.add(hd);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.58, 24, 18), skin); head.scale.set(1.12, 0.95, 1); hd.add(head);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.95, 8), skin); e.position.set(s * 0.72, 0.12, 0); e.rotation.z = -s * 1.25; hd.add(e);
      const ey = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffe040' })); ey.position.set(s * 0.22, 0.06, 0.48); hd.add(ey);
      const pu = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: '#111' })); pu.position.set(s * 0.22, 0.06, 0.575); hd.add(pu);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.8, 6, 10), skin); arm.position.set(s * 0.75, 1.3, 0.45); arm.rotation.x = -1.1; arm.rotation.z = s * 0.3; gob.add(arm); }
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.42, 8), skin); nose.rotation.x = Math.PI / 2; nose.position.set(0, -0.06, 0.66); hd.add(nose);
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 6, 16, Math.PI), new THREE.MeshBasicMaterial({ color: '#2a0a0a' })); mouth.rotation.z = Math.PI; mouth.position.set(0, -0.26, 0.5); hd.add(mouth);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.8, 12), robe); hat.position.y = 0.72; hat.rotation.z = 0.15; hd.add(hat);
    const lamp = new THREE.PointLight('#b8ff70', 0.6, 5); lamp.position.set(0, 2.6, 1.2); gob.add(lamp);
    return { fires, gob, hd, mouth };
  }
  function ensure() {
    if (el) return;
    const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    el = document.createElement('div'); el.id = 'chess';
    el.innerHTML = `<canvas class="c3"></canvas><div class="ch-vig"></div>
      <div class="ch-top"><div class="ch-title">♟ 头棋殿</div><div class="ch-turn"></div><div class="ch-bar"><i class="a" style="width:50%"></i><i class="b" style="width:50%"></i></div><div class="ch-barl"><span class="ba"></span><span>子力对比</span><span class="bb"></span></div></div>
      <div class="ch-col l"><div class="pn ic"></div></div>
      <div class="ch-col r"><div class="pn ch-snik"><div style="font-size:30px">🧌</div><div><b>斯尼克</b><div class="ch-say">嘿嘿，摆好你的脑袋们。</div></div></div><div class="pn"><h4>战果 · 被吃掉的棋子</h4><div class="ch-cap a" style="--c:#ffb070"></div><div class="ch-cap b" style="--c:#70b8ff;margin-top:5px"></div></div><div class="pn ch-logw"><h4>棋谱</h4><div class="ch-log"></div></div></div>
      <div class="ch-tag"></div><div class="ch-flash"></div>
      <div class="ch-bot"><button data-a="flip">🔄 翻转视角</button><button data-a="undo">↩ 悔棋</button><button data-a="leg">📖 走法表</button><button data-a="resign" class="red">🏳 认输</button><button data-a="quit">离开</button></div>
      <div class="ch-help">左键选子 / 走子 · 右键拖动、Q E 旋转 · 滚轮缩放 · Esc 离开<br>绿点=可走 · 红圈=可吃 · <span style="color:#ffd040">金菱=她专属的特殊棋路</span> · 红框=正被威胁</div>
      <div class="ch-leg"><div class="pn"></div></div><div class="ch-banner"></div>`;
    document.body.appendChild(el);
    el.querySelector('.ch-leg .pn').innerHTML = '<h4>走法表（按魂阶）· 点空白处关闭</h4>' + ['P', 'N', 'B', 'R', 'Q', 'A'].map((t, i) => `<p><b style="color:${RCOL[Math.min(4, i)]}">${GLYPH[t]} ${i < 5 ? RNAME[i] : '异色/双印神魂'} → ${NAME[t]}</b>：${MOVE_DESC[t]}</p>`).join('') + `<p><b>${GLYPH.K} 首领</b>：${MOVE_DESC.K}</p><p style="color:#ffd040">✦ 每颗首级还有自己的“棋路”：在常规走法之外多出几格特殊落点（金菱）。</p>`;
    el.querySelector('.ch-leg').addEventListener('click', e => { if (!e.target.closest('button')) el.querySelector('.ch-leg').classList.remove('on'); });
    el.querySelector('.ic').innerHTML = '';
    R = new THREE.WebGLRenderer({ canvas: el.querySelector('canvas'), antialias: true });
    R.outputEncoding = THREE.sRGBEncoding; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05; R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.querySelector('canvas').addEventListener('mousedown', onDown);
    addEventListener('mousemove', onMove); addEventListener('mouseup', () => { if (st) st.drag = null; });
    el.querySelector('canvas').addEventListener('wheel', e => { if (!st) return; st.cam.d = Math.max(6, Math.min(20, st.cam.d * (e.deltaY > 0 ? 1.08 : 0.93))); }, { passive: true });
    el.querySelector('.ch-bot').addEventListener('click', e => { const a = e.target.closest('button'); if (!a || !st) return; const k = a.dataset.a;
      if (k === 'flip') st.cam.tt += Math.PI; if (k === 'leg') el.querySelector('.ch-leg').classList.toggle('on'); if (k === 'quit') close(); if (k === 'resign') { if (!st.over) finish(1 - st.turn, '认输'); } if (k === 'undo') undo(); });
    addEventListener('resize', resize);
  }
  function resize() { if (!R || !st) return; R.setPixelRatio(Math.min(devicePixelRatio, 1.5)); R.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
  function onKey(e) { if (!st) return; e.stopImmediatePropagation(); if (e.code === 'Escape') close(); if (e.code === 'KeyQ') st.cam.tt -= 0.3; if (e.code === 'KeyE') st.cam.tt += 0.3; if (e.code === 'KeyU') undo(); }
  const ray = new THREE.Raycaster(), mv = new THREE.Vector2();
  function pick(e) { mv.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(mv, cam);
    const objs = hitList.concat(st.pieces.filter(p => p.alive).map(p => p.hit)); const h = ray.intersectObjects(objs, false)[0]; if (!h) return -1; return h.object.userData.sq != null ? h.object.userData.sq : h.object.userData.p.sq; }
  function onDown(e) { if (!st) return; if (e.button === 2 || e.button === 1) { st.drag = { x: e.clientX, y: e.clientY }; return; }
    if (st.over || st.busy || !human(st.turn)) return; const sq = pick(e); if (sq < 0) return;
    if (st.sel >= 0 && st.targets.includes(sq)) { doMove([st.sel, sq]); return; }
    if (st.T[sq] && st.S[sq] === st.turn) selectSq(sq); else deselect(); }
  function selectSq(sq) { const p = pieceAt(sq); st.sel = sq; st.selP = p; st.targets = gen(st.T, st.S, st.turn).filter(m => m[0] === sq).map(m => m[1]);
    SFX.select && SFX.select(); showInfo(sq); markTargets(); if (p && p.rec && Math.random() < 0.55) talk(p, pickS(['see', 'fight', 'pack', 'taunt']));
    if (!st.targets.length) floater('无路可走', sq, '#ff9a8a'); }
  function deselect() { st.sel = -1; st.selP = null; st.targets = []; markTargets(); showInfo(st.hover >= 0 && st.T[st.hover] ? st.hover : -1); }
  function onMove(e) { if (!st) return; if (st.drag) { st.cam.tt -= (e.clientX - st.drag.x) * 0.006; st.cam.tp = Math.max(0.3, Math.min(1.35, st.cam.tp + (e.clientY - st.drag.y) * 0.004)); st.drag.x = e.clientX; st.drag.y = e.clientY; return; }
    const cv = el.querySelector('canvas'); if (e.target !== cv) { if (st.hover !== -2) { st.hover = -2; st.hoverP = null; } return; }
    const sq = pick(e); if (sq === st.hover) return; st.hover = sq; st.hoverP = sq >= 0 ? pieceAt(sq) : null;
    cv.style.cursor = sq >= 0 && (st.targets.includes(sq) || (st.T[sq] && st.S[sq] === st.turn && !st.busy)) ? 'pointer' : 'default';
    if (sq >= 0 && st.T[sq]) showInfo(sq); else showInfo(st.sel >= 0 ? st.sel : -1); }
  // ---- 走法示意：空棋盘上这颗棋子能去哪（绿点 = 常规；金菱 = 她专属的棋路）----
  function moveDiagram(t, rec, sq) {
    const T = new Array(64).fill(''), S = new Array(64).fill(-1), f0 = 3, r0 = t === 'P' ? 1 : 3, s0 = r0 * 8 + f0, keep = XS.slice(), ex = rec && XS[sq] ? XS[sq].map(o => o.slice()) : null;
    T[s0] = t === 'N' && false ? 'N' : t; S[s0] = 0; if (t === 'P') { T[(r0 + 1) * 8 + f0 - 1] = 'P'; S[(r0 + 1) * 8 + f0 - 1] = 1; T[(r0 + 1) * 8 + f0 + 1] = 'P'; S[(r0 + 1) * 8 + f0 + 1] = 1; }
    XS.fill(null); const norm = new Set(gen(T, S, 0).filter(m => m[0] === s0).map(m => m[1])); let all = norm;
    if (ex && t !== 'K') { XS[s0] = ex; all = new Set(gen(T, S, 0).filter(m => m[0] === s0).map(m => m[1])); }
    for (let i = 0; i < 64; i++) XS[i] = keep[i];
    let h = ''; for (let r = 7; r >= 0; r--) for (let f = 0; f < 8; f++) { const i = r * 8 + f; h += `<i class="${i === s0 ? 'me' : all.has(i) ? (norm.has(i) ? 'm' : 'x') : ''}"></i>`; }
    return h; }
  function infoHTML(p, sq) {
    const t = st.T[sq], c = p.rec && p.rec.c, col = c ? RCOL[c.rar] : '#c8a070';
    let h = `<div class="ic-h"><div class="ic-g">${GLYPH[t]}</div><div><b>${c ? esc(NM(c)) : '木制' + NAME[t]}</b><small>${c ? `【${RNAME[c.rar]}】${c.shiny ? ' ✨异色' : ''} ${esc(c.raceN)} · ${esc(c.idN)}` : '斯尼克亲手削的，缺了个角'}</small></div></div>`;
    if (c && window.Ranks) h += `<div style="margin-top:5px">${Ranks.badge(c)}</div>`;
    h += `<div class="ic-mv">${moveDiagram(t, p.rec, sq)}</div><div class="ic-t"><b>${p.s ? '蓝方' : '红方'}${NAME[t]}</b>：${MOVE_DESC[t]}</div>`;
    if (c && window.HeadGame && t !== 'K' && XS[sq] && XS[sq].length) { const pr = HeadGame.profile(p.rec).chess; h += `<div class="ic-x">✦ 棋路「${esc(pr.style)}」：额外 ${esc(pr.shapeNames.join('、'))}（金菱 ${XS[sq].length} 格）</div>`; }
    if (c && window.Overhear) { const b = Overhear.bio(c); h += `<div class="ic-q">「${esc(b.catch)}」</div>`; }
    if (st.threat && st.threat.has(sq)) h += `<div style="margin-top:5px;color:#ff7a7a;font-weight:700">⚠ 正被对方威胁</div>`;
    if (st.sel >= 0 && st.targets.includes(sq) && st.T[sq]) { const v = VAL[st.T[sq]]; h += `<div style="margin-top:5px;color:#ff9a6a;font-weight:700">▶ 走到这里 = 吃掉她${st.T[sq] === 'K' ? '（首领！直接获胜）' : `（价值 ${Math.round(v / 100)}）`}</div>`; }
    return [h, col]; }
  function showInfo(sq) { const box = el.querySelector('.ic'); if (!st) return; const p = sq >= 0 ? pieceAt(sq) : null;
    if (!p) { box.style.setProperty('--c', '#6a4a2e'); box.innerHTML = '<div class="ic-tip">把鼠标移到棋子上，看她的走法、阶位和棋路。<br>点选己方棋子开始走棋；绿点是可走的格子，<span style="color:#ff8a7a">红圈</span>是可以吃的，<span style="color:#ffd040">金菱</span>是她专属的特殊棋路。</div>'; return; }
    const [h, col] = infoHTML(p, sq); box.style.setProperty('--c', col); box.innerHTML = h; }
  let markGroup = null;
  function markTargets() { if (markGroup) { scene.remove(markGroup); markGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
    markGroup = new THREE.Group(); scene.add(markGroup);
    const flat = (geo, col, op, sq, kind, y = 0.014) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; const p = sqPos(sq); m.position.set(p.x, y, p.z); m.userData.kind = kind; m.userData.op = op; markGroup.add(m); return m; };
    if (st.last) for (const s of st.last) flat(new THREE.PlaneGeometry(0.96, 0.96), '#ffd060', 0.2, s, 'last', 0.006);
    if (st.sel >= 0) { flat(new THREE.RingGeometry(0.4, 0.49, 40), '#ffe080', 1, st.sel, 'sel'); flat(new THREE.PlaneGeometry(0.96, 0.96), '#ffe080', 0.16, st.sel, 'last', 0.007); }
    let special = new Set(); if (st.sel >= 0 && XS[st.sel]) { const sv = XS[st.sel]; XS[st.sel] = null; const norm = new Set(gen(st.T, st.S, st.turn).filter(m => m[0] === st.sel).map(m => m[1])); XS[st.sel] = sv; special = new Set(st.targets.filter(t => !norm.has(t))); }
    for (const t of st.targets) {
      if (st.T[t]) { flat(new THREE.RingGeometry(0.36, 0.47, 40), '#ff3a3a', 0.95, t, 'cap'); flat(new THREE.PlaneGeometry(0.96, 0.96), '#ff2a2a', 0.22, t, 'capf', 0.008); }
      else if (special.has(t)) { const d = flat(new THREE.CircleGeometry(0.24, 4), '#ffd040', 0.95, t, 'xs'); d.rotation.z = Math.PI / 4; flat(new THREE.RingGeometry(0.3, 0.34, 4), '#fff0a0', 0.9, t, 'xs2').rotation.z = Math.PI / 4; }
      else flat(new THREE.CircleGeometry(0.17, 24), '#7aff9a', 0.9, t, 'mv');
    }
    if (st.threat && human(st.turn)) for (const s of st.threat) if (st.S[s] === st.turn) flat(new THREE.RingGeometry(0.44, 0.5, 4), '#ff3030', 0.9, s, 'thr').rotation.z = Math.PI / 4;
    for (const side of [0, 1]) { const k = kingSq(st.T, st.S, side); if (k >= 0 && attacked(st.T, st.S, k, 1 - side)) { const m = flat(new THREE.RingGeometry(0.42, 0.52, 40), '#ff0020', 1, k, 'chk'); } } }
  function updThreat() { const th = new Set(); for (const s of [0, 1]) gen(st.T, st.S, 1 - s, true).forEach(m => { if (st.S[m[1]] === s && st.T[m[1]]) th.add(m[1]); }); st.threat = th; }
  function mat(s) { let v = 0; for (let i = 0; i < 64; i++) if (st.T[i] && st.S[i] === s && st.T[i] !== 'K') v += VAL[st.T[i]]; return v; }
  function updBar() { const a = mat(0), b = mat(1), tot = Math.max(1, a + b), q = s => el.querySelector(s); q('.ch-bar .a').style.width = Math.round(a / tot * 100) + '%'; q('.ch-bar .b').style.width = (100 - Math.round(a / tot * 100)) + '%';
    const who = st.mode === 'pvp' ? ['红方', '蓝方'] : ['你', '斯尼克']; q('.ba').textContent = `${who[0]} ${Math.round(a / 100)}`; q('.bb').textContent = `${Math.round(b / 100)} ${who[1]}`; }
  // ---- 反馈：表情 / 台词气泡 / 飘字 / 横幅 / 粒子 ----
  const EXMAP = { worry: { sad: 0.45, surprised: 0.2 }, sel: { happy: 0.55 }, hov: { relaxed: 0.45, happy: 0.15 }, happy: { happy: 0.85 }, hurt: { sad: 0.8, surprised: 0.45 }, angry: { angry: 0.75 }, shock: { surprised: 0.5 } };
  const sn = c => String(NM(c)).split('·')[0];
  function face(p, key, dur) { return; /* R37：头颅不变表情 */ if (p && p.hb) { p.exTimed = key; p.exT = dur || 1; } }
  function plLine(c, key) { const PL = window.PERSONA_LINES; if (!PL || !window.Persona) return ''; const d = PL.p[Persona.archOf(c)]; if (!d) return ''; const ix = []; PL.keys.forEach((k, i) => { if (k === key) ix.push(i); }); return ix.length ? d.l[pickS(ix)] || '' : ''; }
  function toScreen(v3) { const v = v3.clone().project(cam); return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, z: v.z }; }
  function talk(p, key, txt) { return; /* R37：用户要求头颅在棋局中不说话（无气泡） */ if (!p || !p.rec || !st) return; const c = p.rec.c; const t = txt || plLine(c, key) || (window.Overhear ? Overhear.bio(c).catch : ''); if (!t) return;
    while (st.bubs.length >= 3) { const o = st.bubs.shift(); o.el.remove(); }
    const d = document.createElement('div'); d.className = 'ch-bub'; d.style.setProperty('--c', RCOL[c.rar]); d.innerHTML = `<b style="color:${RCOL[c.rar]};font-size:12px">${esc(sn(c))}</b><br>${esc(t)}`; el.appendChild(d); st.bubs.push({ el: d, p, t: 2.4 + t.length * 0.05 }); }
  function floater(text, at, col) { const pos = typeof at === 'number' ? sqPos(at) : at.clone(); pos.y += 0.9; const s = toScreen(pos), d = document.createElement('div'); d.className = 'ch-fl'; d.style.cssText = `left:${s.x}px;top:${s.y}px;--c:${col || '#ffe080'}`; d.textContent = text; el.appendChild(d); setTimeout(() => d.remove(), 1400); }
  function flash(text, col, sub) { const f = el.querySelector('.ch-flash'); f.style.setProperty('--c', col || '#ffd890'); f.innerHTML = text + (sub ? `<small>${sub}</small>` : ''); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
  let glowT = null; const glowTex = () => glowT || (glowT = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })());
  function spark(pos, vel, col, life, size, grav) { if (st.parts.length > 160) return; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.setScalar(size); sp.position.copy(pos); scene.add(sp); st.parts.push({ sp, vel, life, t: 0, size, grav: grav == null ? 6 : grav }); }
  function ripple(pos, col, r1) { const m = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.26, 40), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.set(pos.x, 0.02, pos.z); scene.add(m);
    st.anims.push({ t: 0, dur: 0.6, upd(k) { const s = 1 + k * (r1 || 4); m.scale.set(s, s, s); m.material.opacity = 0.9 * (1 - k); }, end() { scene.remove(m); m.geometry.dispose(); m.material.dispose(); } }); }
  function burst(pos, col, n, sp) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = (0.6 + Math.random()) * (sp || 2); spark(pos.clone().setY(0.25), new V3(Math.cos(a) * s, 1.5 + Math.random() * 2.5, Math.sin(a) * s), col, 0.6 + Math.random() * 0.5, 0.14 + Math.random() * 0.1); } }
  const human = side => st.mode === 'pvp' || side === 0;
  function say(t) { if (!el) return; el.querySelector('.ch-say').textContent = t; if (st && st.scene) st.scene.talk = 1.2; }
  const SN = {
    start: ['嘿嘿，摆好你的脑袋们。木头可不怕疼。', '我的木头兵已经饿了。', '别让你的首领掉了——噢，她已经掉过一次了。嘿嘿。'],
    cap: ['咔嚓！又一颗滚下去了。', '嘿嘿，这颗我收下了。', '她的脸撞在棋盘上的声音真好听……开玩笑的。'],
    lost: ['我的木马！我削了三个晚上！', '啧，运气好罢了。', '好吧好吧，这块木头归你。'],
    check: ['将军！你的首领在发抖……哦，她不会抖。', '小心你的首领！'],
    win: ['赢啦！魂晶留下，脑袋带走。嘿嘿。', '地精的智慧，懂吗？'],
    lose: ['……再来一盘！这次我认真了！', '哼，下次我会带更硬的木头。']
  };
  const pickS = a => a[Math.floor(Math.random() * a.length)];
  function logMove(m, capT, side, mover, victim) { const nm = sq => 'abcdefgh'[sq & 7] + ((sq >> 3) + 1); const t = st.T[m[1]];
    const wn = p => p && p.rec ? sn(p.rec.c) : '木' + NAME[p ? p.t : 'P'];
    const line = document.createElement('div'); line.style.setProperty('--c', side ? '#5ab0ff' : '#ff8a52'); if (capT) line.className = 'cp';
    line.innerHTML = `<span class="mn">${st.moveN}</span>${GLYPH[t]} <b>${esc(wn(mover))}</b> ${nm(m[0])}→${nm(m[1])}${capT ? ` <em>斩 ${esc(wn(victim))}</em>` : ''}`;
    const lg = el.querySelector('.ch-log'); lg.appendChild(line); lg.scrollTop = 1e6; }
  function pieceAt(sq) { return st.pieces.find(p => p.alive && p.sq === sq); }
  function trayAdd(v) { const tr = el.querySelector('.ch-cap.' + (v.s ? 'b' : 'a')), s = document.createElement('span'), col = v.rec ? RCOL[v.rec.c.rar] : '#c8a070'; s.style.setProperty('--c', col); s.textContent = GLYPH[v.t] + (v.rec ? sn(v.rec.c) : '木' + NAME[v.t]); tr.appendChild(s); }
  function doMove(m) {
    const mover = pieceAt(m[0]), victim = pieceAt(m[1]), capT = st.T[m[1]], side = st.turn;
    st.hist.push({ X: XS.slice(), T: st.T.slice(), S: st.S.slice(), pos: st.pieces.map(p => [p.alive, p.sq, p.t]), last: st.last, turn: st.turn, moveN: st.moveN });
    const u = makeMove(st.T, st.S, m);
    st.sel = -1; st.selP = null; st.targets = []; st.last = [m[0], m[1]];
    logMove(m, capT, side, mover, victim); st.moveN++;
    st.busy = true; showInfo(-1); markTargets();
    const from = sqPos(m[0]), to = sqPos(m[1]), dist = from.distanceTo(to), jump = mover.t === 'N' ? 1.0 : 0.3 + dist * 0.05, dur = 0.42 + Math.min(0.3, dist * 0.06), tc = side ? '#5ab0ff' : '#ff8a52';
    const yw = mover.g.userData.yaw, hbg = mover.hb && mover.hb.group;
    if (mover.rec) { face(mover, capT ? 'angry' : 'happy', 1.2); if (Math.random() < 0.6) talk(mover, capT ? 'atk' : 'taunt'); }
    SFX.select && SFX.select();
    st.anims.push({ t: 0, dur, upd(k, dt) { const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; mover.g.position.lerpVectors(from, to, e); const y = Math.sin(Math.PI * k) * jump, s = 1 + 0.16 * Math.sin(Math.PI * k);
        if (yw) { mover.jumpY = y; yw.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s)); } else mover.g.position.y = y;
        if (hbg) hbg.rotation.z = Math.sin(k * Math.PI * 2) * 0.12;
        if (dist > 1.2 && Math.random() < 0.8) spark(mover.g.position.clone().setY(0.15 + y * 0.5), new V3((Math.random() - 0.5) * 0.4, 0.3, (Math.random() - 0.5) * 0.4), tc, 0.45, 0.2, 0); },
      end() { mover.g.position.copy(to); if (!yw) mover.g.position.y = 0; mover.jumpY = 0; if (hbg) hbg.rotation.z = 0;
        if (yw) st.anims.push({ t: 0, dur: 0.3, upd(k) { const q = Math.sin(Math.PI * Math.min(1, k * 1.15)) * (1 - k); yw.scale.set(1 + 0.3 * q, 1 - 0.34 * q, 1 + 0.3 * q); }, end() { yw.scale.set(1, 1, 1); } });
        SFX.thud && SFX.thud(capT ? 0.9 : 0.5, mover.rec ? 0.8 : 1.3); ripple(to, capT ? '#ff5040' : tc, capT ? 5 : 3); burst(to, capT ? '#ff7050' : tc, capT ? 26 : 7, capT ? 3 : 1.2); st.shake = Math.max(st.shake || 0, capT ? 0.3 : 0.07); } });
    mover.sq = m[1];
    if (victim) { victim.alive = false; const dl = dur * 0.85; knockOff(victim, from, to, dl); trayAdd(victim);
      if (victim.rec) { face(victim, 'shock', dl); setTimeout(() => { if (!st) return; face(victim, 'hurt', 3); talk(victim, pickS(['die', 'pain', 'hurt'])); }, dl * 1000); }
      st.streak[side] = (st.streak[side] || 0) + 1; const n = st.streak[side], val = Math.round(VAL[capT] / 100);
      setTimeout(() => { if (!st) return; floater(capT === 'K' ? '斩首！' : `斩 +${val}`, to, side ? '#7ab8ff' : '#ffb070'); updBar();
        if (capT === 'K') flash('斩首！', '#ff3a2a', '吃掉了首领'); else if (n >= 2) flash(`连斩 ×${n}`, '#ffb040', mover.rec ? `${esc(sn(mover.rec.c))} 势不可挡` : '地精的木头也会咬人'); else if (VAL[capT] >= 500) flash('重创！', '#ff7a4a', `吃掉${NAME[capT]}（${val}）`); }, dl * 1000);
      if (side === 1) say(pickS(SN.cap)); else if (st.mode !== 'pvp') say(pickS(SN.lost));
    } else st.streak[side] = 0;
    if (u[1]) { mover.t = 'Q'; setTimeout(() => { promoteFx(mover); }, dur * 1000); }
    setTimeout(() => {
      if (!st) return; st.busy = false; updThreat(); updBar();
      if (capT === 'K') { finish(side, '吃掉了首领'); return; }
      st.turn = 1 - st.turn; updTurn(); markTargets();
      const k = kingSq(st.T, st.S, st.turn);
      if (k >= 0 && attacked(st.T, st.S, k, 1 - st.turn)) { flash('将军！', '#ff5a3a', st.turn === 0 || st.mode === 'pvp' ? '首领受到攻击，保护她！' : '斯尼克的首领危险了'); const kp = pieceAt(k); if (kp && kp.rec) { face(kp, 'shock', 2); talk(kp, 'low'); } if (st.turn === 0 && st.mode !== 'pvp') say(pickS(SN.check));
        const v = el.querySelector('.ch-vig'); v.style.opacity = 1; setTimeout(() => { v.style.opacity = 0; }, 1300); SFX.heartbeat && SFX.heartbeat(); }
      if (!gen(st.T, st.S, st.turn).length) { finish(1 - st.turn, '对方无子可动'); return; }
      if (st.mode === 'pvp' && st.autoFlip) st.cam.tt = st.turn === 0 ? 0 : Math.PI;
      if (!human(st.turn)) aiTurn();
    }, Math.round(dur * 1000) + 160);
  }
  function knockOff(p, from, to, delay) {
    const dir = new V3().subVectors(to, from).setY(0); if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1); dir.normalize();
    const v = new V3(dir.x * 2.6 + (Math.random() - 0.5) * 1.5, 3.2, dir.z * 2.6 + (Math.random() - 0.5) * 1.5), av = new V3((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 9);
    // 首级脱离站位：头自己飞出去滚落，脚下的光环/阴影消失
    let headObj = null; if (p.hb) { headObj = p.hb.group; const wp = new V3(); headObj.getWorldPosition(wp); const wq = new THREE.Quaternion(); headObj.getWorldQuaternion(wq); const ws = new V3(); headObj.getWorldScale(ws); headObj.parent.remove(headObj); scene.add(headObj); headObj.position.copy(wp); headObj.quaternion.copy(wq); headObj.scale.copy(ws); }
    if (p.g.userData.glyph) p.g.userData.glyph.visible = false;
    if (p.g.userData.yaw) p.g.children.forEach(ch => { if (ch !== p.g.userData.yaw && ch !== p.hit) ch.visible = false; });
    const obj = headObj || p.g;
    let t = -delay, bounced = 0;
    SFX.chop && setTimeout(() => SFX.chop(), delay * 1000);
    st.anims.push({ t: 0, dur: 99, upd(k, dt) { t += dt; if (t < 0) return; v.y -= 9.8 * dt; obj.position.addScaledVector(v, dt); const w = av.length(); if (w > 1e-3) obj.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(av.clone().divideScalar(w), w * dt));
        const out = Math.abs(obj.position.x) > 4.7 || Math.abs(obj.position.z) > 4.7, fy = out ? -1.52 : 0.12;
        if (obj.position.y < fy) { obj.position.y = fy; if (v.y < -1) { v.y *= -0.35; v.x *= 0.7; v.z *= 0.7; av.multiplyScalar(0.6); bounced++; SFX.thud && SFX.thud(Math.min(1, -v.y / 3), headObj ? 0.9 : 1.4); if (bounced === 1) burst(obj.position.clone().setY(0), '#d8c8a8', 6, 1); } else { v.y = 0; v.x *= 0.92; v.z *= 0.92; av.multiplyScalar(0.9); } }
        if (t > 3.5) { v.set(0, 0, 0); av.set(0, 0, 0); return true; } } });
    p.fallen = obj;
  }
  function promoteFx(p) { const lt = new THREE.PointLight('#ffd060', 3, 3); lt.position.copy(p.g.position).setY(1.2); scene.add(lt); SFX.levelup && SFX.levelup();
    const old = p.g.userData.glyph; if (old) { const par = old.parent; par.remove(old); const gs = glyphSprite('Q', p.s, p.rec ? p.rec.c.rar : 0); gs.position.copy(old.position); par.add(gs); p.g.userData.glyph = gs; }
    burst(p.g.position, '#ffd060', 30, 2.2); ripple(p.g.position, '#ffd060', 5); flash('晋升！', '#ffd060', p.rec ? `${esc(sn(p.rec.c))} 升为后` : '木兵升为后'); if (p.rec) { face(p, 'happy', 2.5); talk(p, 'taunt'); }
    st.anims.push({ t: 0, dur: 1.2, upd(k) { lt.intensity = 3 * (1 - k); }, end() { scene.remove(lt); } }); say(p.rec ? `她晋升了！${NM(p.rec.c)} 现在是后。` : '我的木兵晋升了！嘿嘿嘿！'); }
  function aiTurn() {
    st.busy = true; say(pickS(['嗯……', '让我想想……', '嘿嘿……', '这步有意思……'])); if (st.scene) st.scene.think = 1;
    setTimeout(() => { if (!st || st.over) return; const T = st.T.slice(), S = st.S.slice(); const m = think(T, S, 1, st.lv); if (st.scene) st.scene.think = 0; st.busy = false; if (!m) { finish(0, '斯尼克无子可动'); return; } doMove(m); }, 450);
  }
  function undo() { if (!st || st.busy || !st.hist.length || st.over) return; let n = st.mode === 'pvp' ? 1 : 2; if (st.hist.length < n) n = st.hist.length; let h; for (let i = 0; i < n; i++) h = st.hist.pop();
    if (h.X) for (let i = 0; i < 64; i++) XS[i] = h.X[i]; st.T = h.T; st.S = h.S; st.turn = h.turn; st.last = h.last; st.moveN = h.moveN;
    st.pieces.forEach((p, i) => { const [alive, sq, t] = h.pos[i]; p.sq = sq; if (p.t !== t) { p.t = t; } if (alive && !p.alive) restore(p); p.alive = alive; const q = sqPos(sq); p.g.position.set(q.x, 0, q.z); });
    st.anims = st.anims.filter(a => a.dur < 99); st.sel = -1; st.selP = null; st.targets = []; st.streak = [0, 0]; el.querySelectorAll('.ch-cap').forEach(x => { x.innerHTML = ''; }); st.pieces.forEach(p => { if (!p.alive) trayAdd(p); }); updThreat(); updBar(); showInfo(-1); updTurn(); markTargets(); say('悔棋？嘿嘿，地精很大方的——这次。'); }
  function restore(p) { const yw = p.g.userData.yaw; if (p.fallen && p.fallen !== p.g) { scene.remove(p.fallen); (yw || p.g).add(p.fallen); const hb = p.hb; hb.group.scale.setScalar(3.0); hb.group.quaternion.identity(); hb.group.position.copy(p.headPos); }
    p.g.scale.setScalar(1); p.g.visible = true; p.g.children.forEach(ch => { if (ch !== p.hit) ch.visible = true; }); if (p.g.userData.glyph) p.g.userData.glyph.visible = true; if (yw) yw.scale.set(1, 1, 1); if (p.fallen === p.g) p.g.quaternion.identity(); p.fallen = null; if (!p.g.parent) scene.add(p.g); }
  function updTurn() { const t = el.querySelector('.ch-turn'); if (st.over) return; const pvp = st.mode === 'pvp', me = human(st.turn);
    t.style.setProperty('--tc', st.turn ? '#5ab0ff' : '#ff8a52'); t.className = 'ch-turn' + (me ? ' me' : '');
    t.innerHTML = pvp ? (st.turn === 0 ? '🟠 红方走棋（下方）' : '🔵 蓝方走棋（上方）') : (st.turn === 0 ? '🟠 你的回合' : '🔵 斯尼克思考中…'); }
  function finish(winner, why) {
    st.over = true; const bn = el.querySelector('.ch-banner'); let txt, sub = why;
    if (st.mode === 'pvp') { txt = winner === 0 ? '红方胜' : '蓝方胜'; }
    else if (winner === 0) { const S = G.S; S.chess = S.chess || { best: 0, wins: 0 }; const first = st.lv > S.chess.best; const rw = reward(st.lv) * (first ? 3 : 1); G.addCoins(rw); S.chess.wins++; if (first) S.chess.best = st.lv; G.save();
      txt = '胜利！'; sub = `${why} · 🔮 +${G.fmtN ? G.fmtN(rw) : rw}${first ? '（首胜 ×3）' : ''}${first && st.lv < LEVELS.length ? ' · 解锁下一级' : ''}`; say(pickS(SN.lose)); SFX.levelup && SFX.levelup(); }
    else { txt = '败北'; say(pickS(SN.win)); SFX.deny && SFX.deny(); }
    st.pieces.forEach(p => { if (p.alive && p.rec) face(p, winner === p.s ? 'happy' : 'hurt', 9); });
    const ws = st.pieces.filter(p => p.alive && p.rec && p.s === winner); if (ws.length) { talk(pickS(ws), 'taunt'); if (ws.length > 1) setTimeout(() => { if (st) talk(pickS(ws), 'see'); }, 700); }
    if (winner === 0 || st.mode === 'pvp') for (let i = 0; i < 7; i++) setTimeout(() => { if (st) burst(new V3(Math.random() * 6 - 3, 0.3, Math.random() * 6 - 3), pickS(['#ffd060', '#ff7a4a', '#7aff9a', '#7ab8ff']), 18, 3); }, i * 260);
    bn.innerHTML = `${txt}<small>${sub}</small>`; bn.classList.add('on'); el.querySelector('.ch-turn').textContent = '对局结束';
    setTimeout(() => bn.classList.remove('on'), 4200);
  }
  function loop(t) {
    if (!st) return; raf = requestAnimationFrame(loop); const now = t / 1000, dt = Math.min(0.05, now - (lastT || now)); lastT = now;
    const c = st.cam; c.t += (c.tt - c.t) * Math.min(1, dt * 5);
    st.shake = (st.shake || 0) * Math.pow(0.0008, dt); const sh = st.shake > 0.004 ? st.shake : 0;
    cam.position.set(Math.sin(c.t) * Math.cos(c.tp) * c.d, Math.sin(c.tp) * c.d, Math.cos(c.t) * Math.cos(c.tp) * c.d);
    if (sh) cam.position.add(new V3((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh)); cam.lookAt(0, 0.25, 0);
    for (let i = st.anims.length - 1; i >= 0; i--) { const a = st.anims[i]; a.t += dt; const k = Math.min(1, a.t / a.dur); const r = a.upd(k, dt); if (k >= 1 || r === true) { a.end && a.end(); st.anims.splice(i, 1); } }
    // 棋子：悬浮起伏 / 转向镜头 / 选中抬起 / 表情
    const humTurn = human(st.turn) && !st.busy && !st.over;
    for (const p of st.pieces) { if (!p.alive) continue; const yw = p.g.userData.yaw; if (!yw) continue; const ud = p.g.userData;
      const selp = st.selP === p, hov = st.hoverP === p, thr = humTurn && st.threat && st.threat.has(p.sq) && p.s === st.turn;
      p.lift += ((selp ? 0.26 : hov ? 0.11 : 0) - p.lift) * Math.min(1, dt * 12);
      yw.position.y = p.lift + (p.jumpY || 0) + Math.sin(now * 2 + p.sq * 1.7) * 0.022 + (thr ? Math.sin(now * 16) * 0.012 : 0);
      const base = p.s === 1 ? 0 : Math.PI; let d = base + 0.3 * Math.sin(c.t - base) - yw.rotation.y; /* R37：头朝向对手，仅随镜头小幅偏转（≤0.3rad） */ d = Math.atan2(Math.sin(d), Math.cos(d)); yw.rotation.y += d * Math.min(1, dt * 7);
      const h = yw.position.y; ud.shadow.scale.setScalar(Math.max(0.5, 1 - h * 0.6)); ud.shadow.material.opacity = 0.42 - Math.min(0.2, h * 0.3);
      ud.ring.scale.setScalar(selp ? 1.12 + Math.sin(now * 7) * 0.08 : thr ? 1 + Math.sin(now * 12) * 0.05 : 1); ud.ring.material.color.set(thr ? '#ff3030' : p.s ? '#5ab0ff' : '#ff8a52');
      if (p.exT > 0) p.exT -= dt; const key = ''; /* R37：无表情变化 */
      if (p.hb && key !== p.exKey) { p.exKey = key; try { p.hb.setExpression(EXMAP[key] || {}); } catch (e) {} } }
    // 标记动画
    if (markGroup) markGroup.children.forEach(m => { const k = m.userData.kind, o = m.userData.op; if (k === 'mv') { const s = 1 + Math.sin(now * 5) * 0.15; m.scale.set(s, s, s); } else if (k === 'xs' || k === 'xs2') { m.rotation.z = Math.PI / 4 + Math.sin(now * 3) * 0.25; m.material.opacity = o * (0.7 + 0.3 * Math.sin(now * 6)); }
      else if (k === 'cap' || k === 'capf' || k === 'thr' || k === 'chk') { m.material.opacity = o * (0.5 + 0.5 * Math.abs(Math.sin(now * 5))); } else if (k === 'sel') { m.rotation.z = now * 1.5; } });
    // 粒子
    for (let i = st.parts.length - 1; i >= 0; i--) { const q = st.parts[i]; q.t += dt; const k = q.t / q.life; q.vel.y -= q.grav * dt; q.sp.position.addScaledVector(q.vel, dt); q.sp.material.opacity = Math.max(0, 1 - k); q.sp.scale.setScalar(q.size * (1 - k * 0.5)); if (k >= 1) { scene.remove(q.sp); q.sp.material.dispose(); st.parts.splice(i, 1); } }
    // 气泡 / 悬停标签
    for (let i = st.bubs.length - 1; i >= 0; i--) { const b = st.bubs[i]; b.t -= dt; if (b.t <= 0) { b.el.remove(); st.bubs.splice(i, 1); continue; } const wp = new V3(); b.p.g.getWorldPosition(wp); wp.y += 1.3 + (b.p.lift || 0); const s = toScreen(wp); b.el.style.left = Math.max(110, Math.min(innerWidth - 110, s.x)) + 'px'; b.el.style.top = s.y + 'px'; }
    const tag = el.querySelector('.ch-tag'), hp = st.hoverP;
    if (hp && hp.alive && hp.rec && !st.over) { const wp = new V3(); hp.g.getWorldPosition(wp); wp.y += 1.15 + hp.lift; const s = toScreen(wp), cc = hp.rec.c; tag.style.display = 'block'; tag.style.left = s.x + 'px'; tag.style.top = s.y + 'px'; tag.style.setProperty('--c', RCOL[cc.rar]);
      const k = (hp.s ? '蓝' : '红') + NAME[hp.t] + ' · ' + (window.Ranks ? Ranks.short(cc) : RNAME[cc.rar]); if (tag._k !== NM(cc) + k) { tag._k = NM(cc) + k; tag.textContent = NM(cc) + ' · ' + k; } } else tag.style.display = 'none';
    // 闲聊
    st.chatT -= dt; if (st.chatT < 0 && !st.busy && !st.over) { st.chatT = 7 + Math.random() * 6; const cand = st.pieces.filter(p => p.alive && p.rec); if (cand.length) { const p = pickS(cand), th = st.threat && st.threat.has(p.sq); talk(p, th ? 'fear' : pickS(['see', 'fight', 'taunt', 'pack'])); if (p.rec) face(p, th ? 'shock' : 'happy', 1.4); } }
    const sc = st.scene; if (sc) { sc.fires.forEach(f => { f.pl.intensity = 0.75 + Math.sin(now * 11 + f.k) * 0.15 + Math.sin(now * 23 + f.k) * 0.1; f.fl.scale.y = 1 + Math.sin(now * 13 + f.k) * 0.15; });
      sc.hd.rotation.z = sc.think ? Math.sin(now * 1.5) * 0.15 : Math.sin(now * 0.8) * 0.04; sc.hd.rotation.x = sc.think ? 0.25 : 0.1; sc.gob.position.y = -0.5 + Math.sin(now * 1.3) * 0.03;
      if (sc.talk > 0) { sc.talk -= dt; sc.mouth.scale.y = 1 + Math.abs(Math.sin(now * 18)) * 1.2; } else sc.mouth.scale.y = 1; }
    ModelHeads.tick(now);
    R.render(scene, cam);
  }
  function start(opt) { // opt: {mode:'ai'|'pvp', lv, white:{list,leader}, black:{list,leader}|null(wood)}
    ensure(); hitList.length = 0; if (scene) dispose();
    st = { mode: opt.mode, lv: opt.lv || 1, T: new Array(64).fill(''), S: new Array(64).fill(-1), pieces: [], turn: 0, sel: -1, targets: [], anims: [], hist: [], moveN: 1, cam: { t: 0, tt: 0, tp: 0.5, d: 12.5 }, streak: [0, 0], parts: [], bubs: [], chatT: 6, shake: 0, hover: -1, hoverP: null, selP: null, threat: new Set(), autoFlip: opt.mode === 'pvp', over: false, busy: false, last: null };
    st.scene = buildScene(); XS.fill(null);
    const place = (pc, side) => { const sq = pc.r * 8 + pc.f; if (st.T[sq]) return; st.T[sq] = pc.t; st.S[sq] = side; XS[sq] = pc.rec && window.HeadGame ? HeadGame.chessExtra(pc.rec).map(o => o.slice()) : null;
      const p = { t: pc.t, s: side, sq, rec: pc.rec || null, alive: true, lift: 0, jumpY: 0 }; p.g = pc.rec ? headPiece(p) : woodPiece(pc.t, side); p.hb = p.g.userData.hb || null; if (p.hb) p.headPos = p.hb.group.position.clone();
      const q = sqPos(sq); p.g.position.copy(q); scene.add(p.g);
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.2, 8), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 0.6; hit.userData.p = p; p.g.add(hit); p.hit = hit; st.pieces.push(p); };
    headArmy(opt.white.list, opt.white.leader, 0).forEach(pc => place(pc, 0));
    if (opt.black) headArmy(opt.black.list, opt.black.leader, 1).forEach(pc => place(pc, 1)); else woodArmy(LEVELS[st.lv - 1].army).forEach(pc => place(pc, 1));
    el.querySelectorAll('.ch-bub,.ch-fl').forEach(x => x.remove()); el.querySelectorAll('.ch-cap').forEach(x => { x.innerHTML = ''; }); el.querySelector('.ch-leg').classList.remove('on'); el.querySelector('.ch-flash').classList.remove('on'); el.querySelector('.ch-banner').classList.remove('on'); el.querySelector('.ch-vig').style.opacity = 0;
    el.querySelector('.ch-log').innerHTML = ''; el.querySelector('.ch-snik').style.display = opt.mode === 'pvp' ? 'none' : 'flex';
    el.querySelector('.ch-title').textContent = opt.mode === 'pvp' ? '♟ 头棋殿 · 同屏双人' : `♟ 头棋殿 · 第 ${st.lv} 级「${LEVELS[st.lv - 1].n}」`;
    el.style.display = 'block'; window.__pauseMain = true; G.setUI(true); resize();
    addEventListener('keydown', onKey, true);
    updThreat(); updBar(); showInfo(-1); updTurn(); markTargets(); say(opt.mode === 'pvp' ? '' : pickS(SN.start));
    SFX.duck && SFX.duck(true);
    lastT = 0; raf = requestAnimationFrame(loop);
  }
  function dispose() { scene.traverse(o => { if (o.geometry && !Object.values(geoCache).includes(o.geometry)) o.geometry.dispose(); }); if (st) st.pieces.forEach(p => p.hb && p.hb.dispose()); }
  function close() { if (!st) return; cancelAnimationFrame(raf); removeEventListener('keydown', onKey, true); el.style.display = 'none'; dispose(); st = null; scene = null; window.__pauseMain = false; G.setUI(false); SFX.duck && SFX.duck(false); try { G.lockPointer(); } catch (e) {} }

  // ---------------- 大厅 ----------------
  function lobby() {
    const S = G.S, recs = S.heads.filter(r => !r.inBag);
    if (recs.length < 1) { G.toast('你还没有首级可以当棋子。', '#f88'); return; }
    S.chess = S.chess || { best: 0, wins: 0 };
    ensure();
    let mode = 'ai', lv = Math.min(LEVELS.length, S.chess.best + 1), army = autoPick(recs), blackMode = 'wood', side = 0, armyB = autoPick(recs, army.list);
    const L = document.createElement('div'); L.id = 'chlobby'; document.body.appendChild(L); G.setUI(true);
    const render = () => {
      const cur = side === 0 ? army : armyB;
      L.innerHTML = `<div class="box"><h2>♟ 头棋殿</h2><div class="sub">用你的首级组成军团：<b>魂阶决定走法</b>，选一颗当<b>首领</b>（被吃即输）。最多 16 颗，最强的上底线。</div>
      <div class="row"><button data-a="mode" data-v="ai" class="${mode === 'ai' ? 'on' : ''}">🧌 挑战斯尼克</button><button data-a="mode" data-v="pvp" class="${mode === 'pvp' ? 'on' : ''}">👥 同屏双人（自己和自己下）</button></div>
      ${mode === 'ai' ? `<h3>难度阶梯 <small style="color:#b09070">已击败 ${S.chess.best}/${LEVELS.length} 级 · 胜 ${S.chess.wins} 场</small></h3><div class="lv">${LEVELS.map((l, i) => { const n = i + 1, lock = n > S.chess.best + 1; return `<div class="lvi ${n === lv ? 'on' : ''} ${lock ? 'lock' : ''}" data-a="${lock ? '' : 'lv'}" data-v="${n}"><b>${n}. ${l.n}</b>${lock ? '🔒 击败上一级解锁' : `搜索深度 ${(l.md || l.depth)} · 🔮${G.fmtN ? G.fmtN(reward(n)) : reward(n)}${n > S.chess.best ? ' (首胜×3)' : ''}`}</div>`; }).join('')}</div>`
        : `<div class="row"><span>蓝方（上方）：</span><button data-a="bm" data-v="heads" class="${blackMode === 'heads' ? 'on' : ''}">另一队首级</button><button data-a="bm" data-v="wood" class="${blackMode === 'wood' ? 'on' : ''}">斯尼克的木棋（第 ${lv} 级阵容）</button></div>
           ${blackMode === 'heads' ? `<div class="row"><button data-a="side" data-v="0" class="${side === 0 ? 'on' : ''}">编辑红方</button><button data-a="side" data-v="1" class="${side === 1 ? 'on' : ''}">编辑蓝方</button></div>` : ''}`}
      <h3>${side === 0 || mode === 'ai' || blackMode === 'wood' ? '你的军团' : '蓝方军团'} ${cur.list.length}/16 · 首领：${cur.leader ? esc(NM(cur.leader.c)) : '（未选）'}</h3>
      <div class="legend">点击首级加入/移出军团 · <b>Shift+点击 或 右键</b> 设为首领 · ${['P', 'N', 'B', 'R', 'Q', 'A'].map((t, i) => `${GLYPH[t]}=${i < 5 ? RNAME[i] : '异色/双印神魂'}`).join(' · ')}</div>
      <div class="army">${recs.slice().sort((a, b) => b.c.rar - a.c.rar).map(r => { const inn = cur.list.includes(r), other = (side === 0 ? armyB : army).list.includes(r) && mode === 'pvp' && blackMode === 'heads'; return `<div class="hc ${inn ? 'in' : ''} ${cur.leader === r ? 'lead' : ''}" style="--c:${RCOL[r.c.rar]};${other ? 'opacity:.35' : ''}" data-a="${other ? '' : 'pick'}" data-v="${r.id}"><span class="t">${cur.leader === r ? GLYPH.K : GLYPH[typeOfRec(r)]}</span><b style="color:${RCOL[r.c.rar]}">${esc(NM(r.c))}</b><br>${RNAME[r.c.rar]}${r.c.shiny ? '✨' : ''}<br><small>${esc(r.c.idN)}</small></div>`; }).join('')}</div>
      <div class="row"><button data-a="auto">⚡ 自动编队</button><button data-a="clear">清空</button><span style="flex:1"></span><button data-a="close">关闭</button><button data-a="go" class="red">开始对局 ▶</button></div></div>`;
    };
    render();
    const act = (e, right) => { const b = e.target.closest('[data-a]'); if (!b || !b.dataset.a) return; const a = b.dataset.a, v = b.dataset.v; const cur = side === 0 || mode === 'ai' || blackMode === 'wood' ? army : armyB;
      if (a === 'mode') { mode = v; if (mode === 'ai') side = 0; }
      if (a === 'lv') lv = +v; if (a === 'bm') { blackMode = v; side = 0; } if (a === 'side') side = +v;
      if (a === 'pick') { const r = recs.find(x => x.id === +v); if (right || e.shiftKey) { if (!cur.list.includes(r)) { if (cur.list.length >= 16) cur.list.pop(); cur.list.push(r); } cur.leader = r; } else if (cur.list.includes(r)) { cur.list.splice(cur.list.indexOf(r), 1); if (cur.leader === r) cur.leader = cur.list[0] || null; } else if (cur.list.length < 16) { cur.list.push(r); if (!cur.leader) cur.leader = r; } }
      if (a === 'auto') { const ex = mode === 'pvp' && blackMode === 'heads' ? (cur === army ? armyB.list : army.list) : []; const p = autoPick(recs, ex); cur.list = p.list; cur.leader = p.leader; }
      if (a === 'clear') { cur.list = []; cur.leader = null; }
      if (a === 'close') { L.remove(); G.setUI(false); try { G.lockPointer(); } catch (e2) {} return; }
      if (a === 'go') { if (!army.leader) { G.toast('先选一颗首级当首领', '#f88'); return; } if (mode === 'pvp' && blackMode === 'heads' && !armyB.leader) { G.toast('蓝方还没有首领（不够的话选木棋）', '#f88'); return; }
        L.remove(); start({ mode, lv, white: army, black: mode === 'pvp' && blackMode === 'heads' ? armyB : null }); return; }
      SFX.click && SFX.click(); render(); };
    L.addEventListener('click', e => act(e, false)); L.addEventListener('contextmenu', e => { e.preventDefault(); act(e, true); });
  }
  // 挂到 E 交互
  const wait = setInterval(() => { if (!window.G || !G.HOOK) return; clearInterval(wait);
    G.HOOK.e.push((hit) => { if (hit && hit.build && hit.build.type === 'chess' && !G.held) { lobby(); return true; } return false; });
    G.HOOK.tip.push((hit) => hit && hit.build && hit.build.type === 'chess' ? '<b>[E]</b> 头棋殿：和斯尼克下棋 / 双人对弈' : null);
  }, 200);
  return { lobby, start, close, get active() { return !!st; }, LEVELS, _st: () => st, _scr: sq => toScreen(sqPos(sq).setY(0.45)), _move: m => doMove(m), _think: think, _gen: gen, typeOfRec };
})();
