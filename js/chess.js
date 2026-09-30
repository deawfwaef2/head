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
  function evalSide(T, S) { // 相对 side 0（白）
    let v = 0;
    for (let i = 0; i < 64; i++) { const t = T[i]; if (!t) continue; const f = i & 7, r = i >> 3; let s = VAL[t];
      if (t === 'P') s += (S[i] === 0 ? r - 1 : 6 - r) * 9 + PST_C[f] * 2; else if (t !== 'K') s += (PST_C[f] + PST_C[r]) * (t === 'N' ? 6 : 3);
      v += S[i] === 0 ? s : -s; }
    return v;
  }
  function makeMove(T, S, m) { const [a, b] = m; const cap = [T[b], S[b]]; const cx = XS[b]; XS[b] = XS[a]; XS[a] = null; T[b] = T[a]; S[b] = S[a]; T[a] = ''; S[a] = -1; let promo = false; if (T[b] === 'P' && ((S[b] === 0 && b >> 3 === 7) || (S[b] === 1 && b >> 3 === 0))) { T[b] = 'Q'; promo = true; } return [cap, promo, cx]; }
  function unmake(T, S, m, u) { const [a, b] = m; XS[a] = XS[b]; XS[b] = u[2] || null; T[a] = u[1] ? 'P' : T[b]; S[a] = S[b]; T[b] = u[0][0]; S[b] = u[0][1]; }
  let nodes = 0, deadline = 0;
  function order(T, ms) { return ms.sort((x, y) => (T[y[1]] ? VAL[T[y[1]]] * 10 - VAL[T[y[0]]] : 0) - (T[x[1]] ? VAL[T[x[1]]] * 10 - VAL[T[x[0]]] : 0)); }
  function qs(T, S, side, a, b, d) {
    const sp = (side === 0 ? 1 : -1) * evalSide(T, S); if (sp >= b) return sp; if (sp > a) a = sp; if (d <= 0) return sp;
    for (const m of order(T, gen(T, S, side, true))) { if (T[m[1]] === 'K') return 50000; const u = makeMove(T, S, m); const v = -qs(T, S, 1 - side, -b, -a, d - 1); unmake(T, S, m, u); if (v >= b) return v; if (v > a) a = v; }
    return a;
  }
  function nega(T, S, side, depth, a, b, q) {
    nodes++;
    if (depth <= 0) return q ? qs(T, S, side, a, b, 3) : (side === 0 ? 1 : -1) * evalSide(T, S);
    const ms = order(T, gen(T, S, side));
    if (!ms.length) return -20000;
    let best = -1e9;
    for (const m of ms) {
      if (T[m[1]] === 'K') return 50000 + depth;
      const u = makeMove(T, S, m); const v = -nega(T, S, 1 - side, depth - 1, -b, -a, q); unmake(T, S, m, u);
      if (v > best) best = v; if (v > a) a = v; if (a >= b) break;
      if (nodes > 400000 || performance.now() > deadline) break;
    }
    return best;
  }
  function think(T, S, side, lv) {
    const L = LEVELS[Math.min(LEVELS.length - 1, lv - 1)]; nodes = 0; deadline = performance.now() + (L.time || 1800);
    const ms = order(T, gen(T, S, side)); if (!ms.length) return null;
    let best = null, bv = -1e9;
    const scored = [];
    for (const m of ms) {
      if (T[m[1]] === 'K') return m;
      const u = makeMove(T, S, m); let v = -nega(T, S, 1 - side, L.depth - 1, -1e9, 1e9, L.q); unmake(T, S, m, u);
      v += (Math.random() - 0.5) * 2 * L.noise; scored.push([v, m]); if (v > bv) { bv = v; best = m; }
    }
    return best;
  }

  // ---------------- 斯尼克的难度阶梯 ----------------
  const LEVELS = [
    { n: '见习·斯尼克', depth: 1, noise: 180, q: false, army: 'K8P' },
    { n: '认真的斯尼克', depth: 1, noise: 70, q: false, army: 'K8P2N' },
    { n: '算计的斯尼克', depth: 2, noise: 60, q: false, army: 'K8P2N2B' },
    { n: '标准棋局', depth: 2, noise: 25, q: true, army: 'STD' },
    { n: '斯尼克·全神贯注', depth: 3, noise: 15, q: true, army: 'STD' },
    { n: '木马奇兵', depth: 3, noise: 10, q: true, army: 'STD+2N' },
    { n: '双后之局', depth: 3, noise: 8, q: true, army: 'STD+Q' },
    { n: '魂后降临', depth: 3, noise: 6, q: true, army: 'STD+A' },
    { n: '地精棋会', depth: 3, noise: 4, q: true, army: 'STD+Q+A', time: 2200 },
    { n: '斯尼克·不眠之夜', depth: 4, noise: 3, q: true, army: 'STD+Q+A', time: 2600 },
    { n: '木之王庭', depth: 4, noise: 2, q: true, army: 'STD+2Q+A', time: 3000 },
    { n: '地精棋圣', depth: 4, noise: 0, q: true, army: 'STD+2A+2Q', time: 3500 }
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
  #chess{position:fixed;inset:0;z-index:30;display:none;background:#07050a;font-family:"Microsoft YaHei","PingFang SC",system-ui,sans-serif;color:#f0e2c8;user-select:none}
  #chess canvas.c3{position:absolute;inset:0;width:100%;height:100%}
  #chess .ch-top{position:absolute;left:50%;top:14px;transform:translateX(-50%);text-align:center;pointer-events:none}
  #chess .ch-title{font-size:24px;font-weight:900;letter-spacing:4px;text-shadow:0 2px 10px #000}
  #chess .ch-turn{margin-top:4px;font-size:16px;padding:4px 16px;border-radius:20px;background:rgba(20,12,8,.75);border:1px solid #6a4a2e;display:inline-block}
  #chess .ch-side{position:absolute;right:14px;top:14px;width:290px;max-height:calc(100% - 100px);overflow:auto;background:rgba(18,11,8,.82);border:1px solid #5a3e28;border-radius:14px;padding:12px 14px;font-size:13px;line-height:1.6}
  #chess .ch-side h4{margin:4px 0 6px;color:#ffcf7a;font-size:14px}
  #chess .ch-snik{display:flex;gap:10px;align-items:flex-start;background:rgba(60,90,30,.18);border:1px solid #4a6a2a;border-radius:10px;padding:8px;margin-bottom:8px;min-height:54px}
  #chess .ch-snik b{color:#b8e070}
  #chess .ch-log{font-size:12px;color:#c8b090;max-height:220px;overflow:auto}
  #chess .ch-info{position:absolute;left:14px;top:14px;width:300px;background:rgba(18,11,8,.82);border:1px solid #5a3e28;border-radius:14px;padding:12px 14px;font-size:13px;line-height:1.6;display:none}
  #chess .ch-info .n{font-size:17px;font-weight:900}
  #chess .ch-bot{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);display:flex;gap:8px}
  #chess button{font:inherit;font-size:15px;font-weight:800;padding:9px 18px;border-radius:10px;border:1px solid #6a4a2e;background:#2e1e14;color:#eadcc4;cursor:pointer}
  #chess button:hover{background:#4a2e1c;border-color:#b08050}
  #chess button.red{background:linear-gradient(180deg,#a01810,#600a06);border-color:#ff6a4a}
  #chess .ch-help{position:absolute;left:14px;bottom:14px;font-size:12px;color:rgba(240,226,200,.55);pointer-events:none}
  #chess .ch-banner{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);font-size:56px;font-weight:900;letter-spacing:8px;text-shadow:0 0 30px rgba(255,120,40,.7),0 4px 0 #3a0a06;opacity:0;transition:opacity .4s;pointer-events:none;text-align:center}
  #chess .ch-banner small{display:block;font-size:20px;letter-spacing:2px;color:#ffd890}
  #chess .ch-banner.on{opacity:1}
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
  function glyphSprite(t, side) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.font = 'bold 96px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = side ? '#4aa8ff' : '#ff6a3a'; g.shadowBlur = 18; g.fillStyle = side ? '#d8e8ff' : '#fff0d8'; g.fillText(GLYPH[t], 64, 70);
    const tx = new THREE.CanvasTexture(c); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, opacity: 0.85 })); sp.scale.setScalar(0.34); return sp; }
  function headPiece(p) { const m = mats(), g = new THREE.Group(), side = p.s;
    // 底座：黑曜石/白骨柱 + 天鹅绒垫，高度按走法
    const hgt = { P: 0.16, N: 0.22, B: 0.26, R: 0.24, Q: 0.3, A: 0.32, K: 0.34 }[p.t];
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.08, 28), side ? m.obs : m.bone); base.position.y = 0.04; base.castShadow = true; g.add(base);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, hgt, 20), side ? m.obs : m.bone); col.position.y = 0.08 + hgt / 2; col.castShadow = true; g.add(col);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 28), m.gold); ring.rotation.x = Math.PI / 2; ring.position.y = 0.09 + hgt; g.add(ring);
    const cush = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.2, 0.05, 24), side ? m.velvetB : m.velvetW); cush.position.y = 0.105 + hgt; g.add(cush);
    const top = 0.13 + hgt;
    let hb = null;
    try { hb = ModelHeads.create(p.rec.look); const S = 2.6; hb.group.scale.setScalar(S); const meta = hb.meta || {}, cut = meta.cut || { x: 0, y: meta.bottom || -0.1, z: 0 };
      hb.group.position.set(-(cut.x || 0) * S, top - cut.y * S - 0.01, -(cut.z || 0) * S); // 面朝 +z（镜头/红方一侧），看得见脸 // 双方都面朝镜头一侧（+z），红方看得见脸，蓝方面朝红方
      hb.group.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.add(hb.group);
    } catch (e) { console.warn('chess head', e); }
    const gs = glyphSprite(p.t, side); gs.position.y = top + 0.78; g.add(gs); g.userData.glyph = gs;
    if (p.rec.c.shiny || p.rec.c.rar >= 3) { const lt = new THREE.PointLight(p.rec.c.shiny ? '#fff2b0' : RCOL[p.rec.c.rar], 0.5, 1.4); lt.position.y = top + 0.4; g.add(lt); }
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
    el.innerHTML = `<canvas class="c3"></canvas><div class="ch-top"><div class="ch-title">♟ 头棋殿</div><div class="ch-turn"></div></div>
      <div class="ch-info"></div>
      <div class="ch-side"><div class="ch-snik"><div style="font-size:30px">🧌</div><div><b>斯尼克</b><div class="ch-say">嘿嘿，摆好你的脑袋们。</div></div></div><h4>棋谱</h4><div class="ch-log"></div><h4>走法（按魂阶）</h4><div class="ch-leg" style="font-size:12px;color:#c8a878"></div></div>
      <div class="ch-bot"><button data-a="flip">🔄 翻转视角</button><button data-a="undo">↩ 悔棋</button><button data-a="resign" class="red">🏳 认输</button><button data-a="quit">离开</button></div>
      <div class="ch-help">左键：选子 / 走子 · 右键拖动 / Q E：旋转镜头 · 滚轮：缩放 · Esc：离开</div><div class="ch-banner"></div>`;
    document.body.appendChild(el);
    el.querySelector('.ch-leg').innerHTML = ['P', 'N', 'B', 'R', 'Q', 'A'].map((t, i) => `<div><b style="color:${RCOL[Math.min(4, i)]}">${GLYPH[t]} ${i < 5 ? RNAME[i] : '异色/双印神魂'} → ${NAME[t]}</b>：${MOVE_DESC[t]}</div>`).join('') + `<div><b>${GLYPH.K} 首领</b>：${MOVE_DESC.K}</div>`;
    R = new THREE.WebGLRenderer({ canvas: el.querySelector('canvas'), antialias: true });
    R.outputEncoding = THREE.sRGBEncoding; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05; R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.querySelector('canvas').addEventListener('mousedown', onDown);
    addEventListener('mousemove', onMove); addEventListener('mouseup', () => { if (st) st.drag = null; });
    el.querySelector('canvas').addEventListener('wheel', e => { if (!st) return; st.cam.d = Math.max(6, Math.min(20, st.cam.d * (e.deltaY > 0 ? 1.08 : 0.93))); }, { passive: true });
    el.querySelector('.ch-bot').addEventListener('click', e => { const a = e.target.closest('button'); if (!a || !st) return; const k = a.dataset.a;
      if (k === 'flip') st.cam.tt += Math.PI; if (k === 'quit') close(); if (k === 'resign') { if (!st.over) finish(1 - st.turn, '认输'); } if (k === 'undo') undo(); });
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
    if (st.T[sq] && st.S[sq] === st.turn) { st.sel = sq; st.targets = gen(st.T, st.S, st.turn).filter(m => m[0] === sq).map(m => m[1]); SFX.click && SFX.click(); showInfo(sq); markTargets(); }
    else { st.sel = -1; st.targets = []; markTargets(); } }
  function onMove(e) { if (!st) return; if (st.drag) { st.cam.tt -= (e.clientX - st.drag.x) * 0.006; st.cam.tp = Math.max(0.35, Math.min(1.35, st.cam.tp + (e.clientY - st.drag.y) * 0.004)); st.drag.x = e.clientX; st.drag.y = e.clientY; return; }
    if (e.target !== el.querySelector('canvas')) return; const sq = pick(e); if (sq !== st.hover) { st.hover = sq; if (sq >= 0 && st.T[sq]) showInfo(sq); else if (st.sel >= 0) showInfo(st.sel); else el.querySelector('.ch-info').style.display = 'none'; } }
  function showInfo(sq) { const p = st.pieces.find(q => q.alive && q.sq === sq); const box = el.querySelector('.ch-info'); if (!p) { box.style.display = 'none'; return; }
    const t = st.T[sq];
    if (p.rec) { const c = p.rec.c; box.innerHTML = `<div class="n" style="color:${RCOL[c.rar]}">${GLYPH[t]} ${esc(c.name)}</div><div>${RNAME[c.rar]}${c.shiny ? ' · ✨异色' : ''} · ${esc(c.raceN)} · ${esc(c.idN)}</div>${c.title ? `<div style="color:#ffcf7a">「${esc(c.title)}」</div>` : ''}<div style="margin-top:6px"><b>${NAME[t]}</b>：${MOVE_DESC[t]}</div>${window.HeadGame && XS[sq] ? `<div style="margin-top:4px;color:#ffcf7a">✦ 她的棋路「${esc(HeadGame.profile(p.rec).chess.style)}」：额外 ${esc(HeadGame.profile(p.rec).chess.shapeNames.join("、"))}（${XS[sq].length} 个落点）</div>` : ''}`; }
    else box.innerHTML = `<div class="n">${GLYPH[t]} 木制${NAME[t]}</div><div style="color:#b8a080">斯尼克亲手削的，缺了个角。</div><div style="margin-top:6px"><b>${NAME[t]}</b>：${MOVE_DESC[t]}</div>`;
    box.style.display = 'block'; }
  let markGroup = null;
  function markTargets() { if (markGroup) { scene.remove(markGroup); markGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    markGroup = new THREE.Group(); scene.add(markGroup);
    const add = (sq, col, r = 0.36, op = 0.8) => { const m = new THREE.Mesh(new THREE.RingGeometry(r - 0.06, r, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; const p = sqPos(sq); m.position.set(p.x, 0.012, p.z); markGroup.add(m); return m; };
    if (st.last) { for (const s of st.last) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.96), new THREE.MeshBasicMaterial({ color: '#ffd060', transparent: true, opacity: 0.18, depthWrite: false })); m.rotation.x = -Math.PI / 2; const p = sqPos(s); m.position.set(p.x, 0.006, p.z); markGroup.add(m); } }
    if (st.sel >= 0) add(st.sel, '#ffe080', 0.46, 1);
    for (const t of st.targets) add(t, st.T[t] ? '#ff3a3a' : '#7aff9a', st.T[t] ? 0.46 : 0.18, 0.85);
    for (const side of [0, 1]) { const k = kingSq(st.T, st.S, side); if (k >= 0 && attacked(st.T, st.S, k, 1 - side)) { const m = add(k, '#ff0020', 0.5, 1); m.userData.pulse = true; } } }
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
  function logMove(m, capT, side) { const nm = sq => 'abcdefgh'[sq & 7] + ((sq >> 3) + 1); const t = st.T[m[1]]; const who = side === 0 ? '⚪' : '⚫';
    const line = document.createElement('div'); line.textContent = `${st.moveN}. ${who} ${GLYPH[t]}${nm(m[0])}→${nm(m[1])}${capT ? ' ×' + NAME[capT] : ''}`; const lg = el.querySelector('.ch-log'); lg.appendChild(line); lg.scrollTop = 1e6; }
  function pieceAt(sq) { return st.pieces.find(p => p.alive && p.sq === sq); }
  function doMove(m) {
    const mover = pieceAt(m[0]), victim = pieceAt(m[1]), capT = st.T[m[1]], side = st.turn;
    st.hist.push({ X: XS.slice(), T: st.T.slice(), S: st.S.slice(), pos: st.pieces.map(p => [p.alive, p.sq, p.t]), last: st.last, turn: st.turn, moveN: st.moveN });
    const u = makeMove(st.T, st.S, m);
    st.sel = -1; st.targets = []; st.last = [m[0], m[1]];
    logMove(m, capT, side); st.moveN++;
    st.busy = true;
    const from = sqPos(m[0]), to = sqPos(m[1]); const jump = mover.t === 'N' ? 1.0 : 0.35 + from.distanceTo(to) * 0.04;
    st.anims.push({ t: 0, dur: 0.55, upd(k) { const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; mover.g.position.lerpVectors(from, to, e); mover.g.position.y = Math.sin(Math.PI * k) * jump; if (mover.rec && mover.hb) mover.hb.group.rotation.z = Math.sin(k * Math.PI * 2) * 0.12; },
      end() { mover.g.position.copy(to); mover.g.position.y = 0; if (mover.hb) mover.hb.group.rotation.z = 0; SFX.thud && SFX.thud(0.5, mover.rec ? 0.8 : 1.3); } });
    mover.sq = m[1];
    if (victim) { victim.alive = false; knockOff(victim, from, to, 0.28); if (side === 1) say(pickS(SN.cap)); else if (st.mode !== 'pvp') say(pickS(SN.lost)); }
    if (u[1]) { mover.t = 'Q'; setTimeout(() => { promoteFx(mover); }, 600); }
    setTimeout(() => {
      st.busy = false;
      if (capT === 'K') { finish(side, '吃掉了首领'); return; }
      st.turn = 1 - st.turn; updTurn(); markTargets();
      const k = kingSq(st.T, st.S, st.turn); if (k >= 0 && attacked(st.T, st.S, k, 1 - st.turn)) { if (st.turn === 0 && st.mode !== 'pvp') say(pickS(SN.check)); SFX.heartbeat && SFX.heartbeat(); }
      if (!gen(st.T, st.S, st.turn).length) { finish(1 - st.turn, '对方无子可动'); return; }
      if (st.mode === 'pvp' && st.autoFlip) st.cam.tt = st.turn === 0 ? 0 : Math.PI;
      if (!human(st.turn)) aiTurn();
    }, 620);
  }
  function knockOff(p, from, to, delay) {
    const dir = new V3().subVectors(to, from).setY(0); if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1); dir.normalize();
    const v = new V3(dir.x * 2.6 + (Math.random() - 0.5) * 1.5, 3.2, dir.z * 2.6 + (Math.random() - 0.5) * 1.5), av = new V3((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 9);
    // 首级从底座上滚落：头与底座分离
    let headObj = null; if (p.hb) { headObj = p.hb.group; const wp = new V3(); headObj.getWorldPosition(wp); const wq = new THREE.Quaternion(); headObj.getWorldQuaternion(wq); const ws = new V3(); headObj.getWorldScale(ws); p.g.remove(headObj); scene.add(headObj); headObj.position.copy(wp); headObj.quaternion.copy(wq); headObj.scale.copy(ws); }
    if (p.g.userData.glyph) p.g.userData.glyph.visible = false;
    const obj = headObj || p.g; const baseObj = headObj ? p.g : null;
    let t = -delay, bounced = 0;
    SFX.chop && setTimeout(() => SFX.chop(), delay * 1000);
    st.anims.push({ t: 0, dur: 99, upd(k, dt) { t += dt; if (t < 0) return; v.y -= 9.8 * dt; obj.position.addScaledVector(v, dt); const w = av.length(); if (w > 1e-3) obj.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(av.clone().divideScalar(w), w * dt));
        const out = Math.abs(obj.position.x) > 4.7 || Math.abs(obj.position.z) > 4.7, fy = out ? -1.52 : 0.12;
        if (obj.position.y < fy) { obj.position.y = fy; if (v.y < -1) { v.y *= -0.35; v.x *= 0.7; v.z *= 0.7; av.multiplyScalar(0.6); bounced++; SFX.thud && SFX.thud(Math.min(1, -v.y / 3), headObj ? 0.9 : 1.4); } else { v.y = 0; v.x *= 0.92; v.z *= 0.92; av.multiplyScalar(0.9); } }
        if (baseObj) { baseObj.scale.multiplyScalar(Math.max(0, 1 - dt * 4)); if (baseObj.scale.x < 0.02) baseObj.visible = false; }
        if (t > 3.5) { v.set(0, 0, 0); av.set(0, 0, 0); return true; } } });
    p.fallen = obj;
  }
  function promoteFx(p) { const lt = new THREE.PointLight('#ffd060', 3, 3); lt.position.copy(p.g.position).setY(1.2); scene.add(lt); SFX.levelup && SFX.levelup();
    if (p.g.userData.glyph) { p.g.remove(p.g.userData.glyph); const gs = glyphSprite('Q', p.s); gs.position.copy(p.g.userData.glyph.position); p.g.add(gs); p.g.userData.glyph = gs; }
    st.anims.push({ t: 0, dur: 1.2, upd(k) { lt.intensity = 3 * (1 - k); }, end() { scene.remove(lt); } }); say(p.rec ? `她晋升了！${p.rec.c.name} 现在是后。` : '我的木兵晋升了！嘿嘿嘿！'); }
  function aiTurn() {
    st.busy = true; say(pickS(['嗯……', '让我想想……', '嘿嘿……', '这步有意思……'])); if (st.scene) st.scene.think = 1;
    setTimeout(() => { if (!st || st.over) return; const T = st.T.slice(), S = st.S.slice(); const m = think(T, S, 1, st.lv); if (st.scene) st.scene.think = 0; st.busy = false; if (!m) { finish(0, '斯尼克无子可动'); return; } doMove(m); }, 450);
  }
  function undo() { if (!st || st.busy || !st.hist.length || st.over) return; let n = st.mode === 'pvp' ? 1 : 2; if (st.hist.length < n) n = st.hist.length; let h; for (let i = 0; i < n; i++) h = st.hist.pop();
    if (h.X) for (let i = 0; i < 64; i++) XS[i] = h.X[i]; st.T = h.T; st.S = h.S; st.turn = h.turn; st.last = h.last; st.moveN = h.moveN;
    st.pieces.forEach((p, i) => { const [alive, sq, t] = h.pos[i]; p.sq = sq; if (p.t !== t) { p.t = t; } if (alive && !p.alive) restore(p); p.alive = alive; const q = sqPos(sq); p.g.position.set(q.x, 0, q.z); });
    st.anims = st.anims.filter(a => a.dur < 99); st.sel = -1; st.targets = []; updTurn(); markTargets(); say('悔棋？嘿嘿，地精很大方的——这次。'); }
  function restore(p) { if (p.fallen && p.fallen !== p.g) { scene.remove(p.fallen); p.g.add(p.fallen); const hb = p.hb; const S = 2.6; hb.group.scale.setScalar(S); hb.group.quaternion.identity(); hb.group.position.copy(p.headPos); }
    p.g.scale.setScalar(1); p.g.visible = true; if (p.g.userData.glyph) p.g.userData.glyph.visible = true; if (p.fallen === p.g) p.g.quaternion.identity(); p.fallen = null; if (!p.g.parent) scene.add(p.g); }
  function updTurn() { const t = el.querySelector('.ch-turn'); if (st.over) return; t.innerHTML = st.mode === 'pvp' ? (st.turn === 0 ? '⚪ 红方（下方）走棋' : '⚫ 蓝方（上方）走棋') : (st.turn === 0 ? '⚪ 你的回合' : '⚫ 斯尼克思考中…'); }
  function finish(winner, why) {
    st.over = true; const bn = el.querySelector('.ch-banner'); let txt, sub = why;
    if (st.mode === 'pvp') { txt = winner === 0 ? '红方胜' : '蓝方胜'; }
    else if (winner === 0) { const S = G.S; S.chess = S.chess || { best: 0, wins: 0 }; const first = st.lv > S.chess.best; const rw = reward(st.lv) * (first ? 3 : 1); G.addCoins(rw); S.chess.wins++; if (first) S.chess.best = st.lv; G.save();
      txt = '胜利！'; sub = `${why} · 🔮 +${G.fmtN ? G.fmtN(rw) : rw}${first ? '（首胜 ×3）' : ''}${first && st.lv < LEVELS.length ? ' · 解锁下一级' : ''}`; say(pickS(SN.lose)); SFX.levelup && SFX.levelup(); }
    else { txt = '败北'; say(pickS(SN.win)); SFX.deny && SFX.deny(); }
    bn.innerHTML = `${txt}<small>${sub}</small>`; bn.classList.add('on'); el.querySelector('.ch-turn').textContent = '对局结束';
    setTimeout(() => bn.classList.remove('on'), 4200);
  }
  function loop(t) {
    if (!st) return; raf = requestAnimationFrame(loop); const now = t / 1000, dt = Math.min(0.05, now - (lastT || now)); lastT = now;
    const c = st.cam; c.t += (c.tt - c.t) * Math.min(1, dt * 5); cam.position.set(Math.sin(c.t) * Math.cos(c.tp) * c.d, Math.sin(c.tp) * c.d, Math.cos(c.t) * Math.cos(c.tp) * c.d); cam.lookAt(0, 0, 0);
    for (let i = st.anims.length - 1; i >= 0; i--) { const a = st.anims[i]; a.t += dt; const k = Math.min(1, a.t / a.dur); const r = a.upd(k, dt); if (k >= 1 || r === true) { a.end && a.end(); st.anims.splice(i, 1); } }
    for (const p of st.pieces) if (p.alive && p.g.userData.glyph) { p.g.userData.glyph.material.opacity = 0.55 + Math.sin(now * 2 + p.sq) * 0.2; }
    if (markGroup) markGroup.children.forEach(m => { if (m.userData.pulse) m.material.opacity = 0.5 + Math.sin(now * 8) * 0.5; });
    const sc = st.scene; if (sc) { sc.fires.forEach(f => { f.pl.intensity = 0.75 + Math.sin(now * 11 + f.k) * 0.15 + Math.sin(now * 23 + f.k) * 0.1; f.fl.scale.y = 1 + Math.sin(now * 13 + f.k) * 0.15; });
      sc.hd.rotation.z = sc.think ? Math.sin(now * 1.5) * 0.15 : Math.sin(now * 0.8) * 0.04; sc.hd.rotation.x = sc.think ? 0.25 : 0.1; sc.gob.position.y = -0.5 + Math.sin(now * 1.3) * 0.03;
      if (sc.talk > 0) { sc.talk -= dt; sc.mouth.scale.y = 1 + Math.abs(Math.sin(now * 18)) * 1.2; } else sc.mouth.scale.y = 1; }
    ModelHeads.tick(now);
    R.render(scene, cam);
  }
  function start(opt) { // opt: {mode:'ai'|'pvp', lv, white:{list,leader}, black:{list,leader}|null(wood)}
    ensure(); hitList.length = 0; if (scene) dispose();
    st = { mode: opt.mode, lv: opt.lv || 1, T: new Array(64).fill(''), S: new Array(64).fill(-1), pieces: [], turn: 0, sel: -1, targets: [], anims: [], hist: [], moveN: 1, cam: { t: 0, tt: 0, tp: 0.62, d: 11 }, autoFlip: opt.mode === 'pvp', over: false, busy: false, last: null };
    st.scene = buildScene(); XS.fill(null);
    const place = (pc, side) => { const sq = pc.r * 8 + pc.f; if (st.T[sq]) return; st.T[sq] = pc.t; st.S[sq] = side; XS[sq] = pc.rec && window.HeadGame ? HeadGame.chessExtra(pc.rec).map(o => o.slice()) : null;
      const p = { t: pc.t, s: side, sq, rec: pc.rec || null, alive: true }; p.g = pc.rec ? headPiece(p) : woodPiece(pc.t, side); p.hb = p.g.userData.hb || null; if (p.hb) p.headPos = p.hb.group.position.clone();
      const q = sqPos(sq); p.g.position.copy(q); scene.add(p.g);
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.2, 8), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 0.6; hit.userData.p = p; p.g.add(hit); p.hit = hit; st.pieces.push(p); };
    headArmy(opt.white.list, opt.white.leader, 0).forEach(pc => place(pc, 0));
    if (opt.black) headArmy(opt.black.list, opt.black.leader, 1).forEach(pc => place(pc, 1)); else woodArmy(LEVELS[st.lv - 1].army).forEach(pc => place(pc, 1));
    el.querySelector('.ch-log').innerHTML = ''; el.querySelector('.ch-snik').style.display = opt.mode === 'pvp' ? 'none' : 'flex';
    el.querySelector('.ch-title').textContent = opt.mode === 'pvp' ? '♟ 头棋殿 · 同屏双人' : `♟ 头棋殿 · 第 ${st.lv} 级「${LEVELS[st.lv - 1].n}」`;
    el.style.display = 'block'; window.__pauseMain = true; G.setUI(true); resize();
    addEventListener('keydown', onKey, true);
    updTurn(); markTargets(); say(opt.mode === 'pvp' ? '' : pickS(SN.start));
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
      ${mode === 'ai' ? `<h3>难度阶梯 <small style="color:#b09070">已击败 ${S.chess.best}/${LEVELS.length} 级 · 胜 ${S.chess.wins} 场</small></h3><div class="lv">${LEVELS.map((l, i) => { const n = i + 1, lock = n > S.chess.best + 1; return `<div class="lvi ${n === lv ? 'on' : ''} ${lock ? 'lock' : ''}" data-a="${lock ? '' : 'lv'}" data-v="${n}"><b>${n}. ${l.n}</b>${lock ? '🔒 击败上一级解锁' : `搜索深度 ${l.depth} · 🔮${G.fmtN ? G.fmtN(reward(n)) : reward(n)}${n > S.chess.best ? ' (首胜×3)' : ''}`}</div>`; }).join('')}</div>`
        : `<div class="row"><span>蓝方（上方）：</span><button data-a="bm" data-v="heads" class="${blackMode === 'heads' ? 'on' : ''}">另一队首级</button><button data-a="bm" data-v="wood" class="${blackMode === 'wood' ? 'on' : ''}">斯尼克的木棋（第 ${lv} 级阵容）</button></div>
           ${blackMode === 'heads' ? `<div class="row"><button data-a="side" data-v="0" class="${side === 0 ? 'on' : ''}">编辑红方</button><button data-a="side" data-v="1" class="${side === 1 ? 'on' : ''}">编辑蓝方</button></div>` : ''}`}
      <h3>${side === 0 || mode === 'ai' || blackMode === 'wood' ? '你的军团' : '蓝方军团'} ${cur.list.length}/16 · 首领：${cur.leader ? esc(cur.leader.c.name) : '（未选）'}</h3>
      <div class="legend">点击首级加入/移出军团 · <b>Shift+点击 或 右键</b> 设为首领 · ${['P', 'N', 'B', 'R', 'Q', 'A'].map((t, i) => `${GLYPH[t]}=${i < 5 ? RNAME[i] : '异色/双印神魂'}`).join(' · ')}</div>
      <div class="army">${recs.slice().sort((a, b) => b.c.rar - a.c.rar).map(r => { const inn = cur.list.includes(r), other = (side === 0 ? armyB : army).list.includes(r) && mode === 'pvp' && blackMode === 'heads'; return `<div class="hc ${inn ? 'in' : ''} ${cur.leader === r ? 'lead' : ''}" style="--c:${RCOL[r.c.rar]};${other ? 'opacity:.35' : ''}" data-a="${other ? '' : 'pick'}" data-v="${r.id}"><span class="t">${cur.leader === r ? GLYPH.K : GLYPH[typeOfRec(r)]}</span><b style="color:${RCOL[r.c.rar]}">${esc(r.c.name)}</b><br>${RNAME[r.c.rar]}${r.c.shiny ? '✨' : ''}<br><small>${esc(r.c.idN)}</small></div>`; }).join('')}</div>
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
  return { lobby, start, close, get active() { return !!st; }, LEVELS, _st: () => st, _move: m => doMove(m), _think: think, _gen: gen, typeOfRec };
})();
