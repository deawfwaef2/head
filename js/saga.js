// R49 MOD saga（默认开，仅中文）：每次进入地区 = 一部“电影”。
//   · 引擎：每次随机抽 地区词库 × 异变原型 × 名字/头衔 × 独白 × 镜头，组合出一段 25~40 秒、字幕 + 运镜 + 宽银幕的开场；每次都不一样。
//   · 剧情：围绕该地点的一个“异变”（枯竭/失声/熄灯/失窃/异兽/祭坛/失踪/叛变/庆典/遗物/异梦）。主线 = 讨伐异变的源头（一名有名有姓的目标）。
//       斩下首级 → 异变平息 → “恩”（敌人变弱 / 魂晶 +35% / 入场回血，持续 2 趟）；放走或没找到 → 异变恶化 → “祸”（敌人更狠 / 仇恨上升 / 损失魂晶）。
//   · 主线：月之魔女。有一半的异变其实是“月使”（月之魔女的使者）——斩下她得到 1 条线索；另有 8 个章节触发“闪回”，同样给线索。线索集齐 7 条才能挑战月之魔女。
//   · 出门结算：回洞后弹出结算卡（异变结局、恩祸、战利品、线索进度）。
// 镜头：在 worlds.js 每帧末尾调用 Saga.cam(cam,dt,now) 接管相机（真 3D 场景里的航拍/推轨/环绕/低角度扫摄）。
window.Saga = (() => {
  const D = window.SagaData;
  const lang = () => { try { return (window.I18N && I18N.lang) || localStorage.getItem('soulhead_lang') || 'zh'; } catch (e) { return 'zh'; } };
  const on = () => (!window.Mods || Mods.on('saga')) && lang() === 'zh';
  const G = () => window.G || window.__game;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const LOC = k => (window.Lore && Lore.LOCS.find(l => l.k === k)) || { n: k, rec: 100, color: '#e7c27a', icon: '' };
  const roleN = id => (window.Lore && Lore.ID && Lore.ID[id] && Lore.ID[id].n) || '女子';
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ================= 存档 =================
  function SS() {
    const g = G(); const S = g.S; S.saga = S.saga || {};
    const s = S.saga; s.v = s.v || {}; s.last = s.last || {}; s.mod = s.mod || {}; s.cl = s.cl || []; s.recent = s.recent || {}; s.chap = s.chap || {};
    s.wins = s.wins || 0; s.fails = s.fails || 0; s.since = s.since || 0; return s;
  }
  const clues = () => { try { return SS().cl.length; } catch (e) { return 0; } };

  // ================= 生成 =================
  const fill = (tpl, c) => String(tpl).replace(/\{(\w+)\}/g, (m, k) => c[k] != null ? c[k] : m);
  function ctxChapters() {
    const S = G().S, s = SS(); const h2 = S.h2 && S.h2.L ? Object.values(S.h2.L) : [];
    return { kills: (S.stats && S.stats.kills) || 0, bosses: Object.keys(S.bosses || {}).length, hunters: h2.filter(x => x.dead).length, elites: Object.keys((S.el && S.el.dead) || {}).filter(k => k !== 'moon').length, fails: s.fails, wins: s.wins, maxVisit: Math.max(0, ...Object.values(s.v)), rare: (S.heads || []).filter(h => h && h.c && h.c.rar >= 3).length };
  }
  function gen(k) {
    const R = D.REG[k] || D.REG.village, s = SS(), L = LOC(k), seed = (Math.random() * 4294967296) >>> 0, r = rng(seed), pk = a => a[Math.floor(r() * a.length)];
    const need = clues() < D.NEED, vis = s.v[k] || 1, prev = s.last[k];
    const envoy = need && vis >= 1 && r() < Math.min(0.85, 0.28 + 0.2 * s.since);
    let arch = D.MOONARCH;
    if (!envoy) { const rc = s.recent[k] || []; const pool = D.ARCH.filter(a => !rc.includes(a.id)); arch = pk(pool.length ? pool : D.ARCH); }
    const name = () => pk(R.names[0]) + pk(R.names[1]);
    const Tn = name(); let Wn = name(), Vn = name(); while (Wn === Tn) Wn = name(); while (Vn === Tn || Vn === Wn) Vn = name();
    const rid = pk(R.roles), wid = pk(R.wit);
    const env = { L: L.n, fac: R.fac, src: pk(R.src), sym: pk(R.sym), craft: pk(R.craft), beast: pk(R.beast), light: pk(R.light), place: pk(R.place), sound: pk(R.sound), sky: pk(R.sky), scent: pk(R.scent), folk: pk(R.folk), num: 3 + Math.floor(r() * 7), mot: pk(D.MOT) };
    const sg = { seed, k, vis, arch, envoy, env, r, pk, prev,
      T: { n: Tn, id: rid, role: roleN(rid), title: envoy ? '月之使者' : pk(D.EPI) + roleN(rid) }, W: { n: Wn, id: wid, role: roleN(wid) }, V: Vn, res: null, fo: null, node: null, done: false, esc: false, shown: false };
    // 章节闪回
    if (need) { const cc = ctxChapters(), cand = D.CHAP.filter(c => !s.chap[c.id] && c.ok(cc)); if (cand.length) sg.chap = cand[0]; }
    sg.ctx = Object.assign({}, env, { T: Tn, Tt: sg.T.title, W: Wn, Wr: sg.W.role, V: Vn });
    return sg;
  }

  // ================= 剧本 =================
  const durOf = t => Math.min(5.6, 0.9 + String(t).length / 11);
  function script(sg) {
    const A = sg.arch, c = sg.ctx, f = t => fill(t, c), pk = sg.pk, r = sg.r, s = SS(), M = D.MONO;
    const vis = sg.vis, lvl = vis <= 2 ? 0 : vis <= 5 ? 1 : 2, short = lvl >= 1;
    const L = (t, w, col, it) => ({ t: f(t), w: w || '', col: col || '', it: !!it });
    const used = new Set(); const pick = arr => { const a = arr.filter(x => !used.has(x)); const v = pk(a.length ? a : arr); used.add(v); return v; };
    const beats = [];
    const prevLine = sg.prev ? (sg.prev.res === 'win' ? M.won : M.fail) : (vis <= 1 ? M.first : M.again);
    const cnum = clues();
    // 章节闪回
    if (sg.chap) {
      beats.push({ shot: 'low', grade: 'flash', tag: '闪回 · ' + sg.chap.nm, lines: sg.chap.t.map(t => L(t, '我', '#e8d8b8', true)).concat([L(D.CLUES[Math.min(cnum, D.CLUES.length - 1)].k, '', '#c8b8ff', true)]), clue: true });
    }
    // 1 开场标题
    beats.push({ shot: pk(['crane', 'top', 'crane']), title: true, lines: [L(pick(M.open), '我', '#fff', true)].concat(lvl === 0 || r() < 0.4 ? [L(pick(prevLine), '我', '#fff', true)] : []) });
    // 2 异变迹象
    if (lvl === 0) beats.push({ shot: pk(['push', 'door']), tag: '异变 · ' + A.nm, lines: [L(pick(A.sign)), L(pick(A.sign))] });
    else if (lvl === 1) beats.push({ shot: 'push', tag: '异变 · ' + A.nm, lines: [L(pick(A.sign))] });
    // 3 目击者
    beats.push({ shot: pk(['low', 'orbit']), lines: [L(pick(A.wit), sg.W.n + ' · ' + sg.W.role, '#ffe0a8'), L(pick(A.wit), sg.W.n, '#ffe0a8')].slice(0, lvl === 2 ? 1 : 2).concat(r() < 0.5 && lvl === 0 ? [L(pick(M.mid), '我', '#fff', true)] : []) });
    // 4 起因
    const cause = [L(pick(A.cause))];
    if (r() < 0.4 && !short) cause.push(L(pick(M.twist), '我', '#fff', true));
    if (sg.envoy) cause.push(L(pick(D.ELINE.meet), sg.T.n + ' · ' + sg.T.title, '#d8d0ff'));
    else if (r() < 0.4 && !short) cause.push(L(pick(D.TLINE.meet), sg.T.n + ' · ' + sg.T.title, '#ffc8c8'));
    if (lvl < 2) beats.push({ shot: pk(['orbit', 'crane', 'top']), tag: '源头', lines: cause });
    // 5 赌注
    const stakeHead = sg.envoy ? `月之线索 ${cnum}/${D.NEED}` : '';
    beats.push({ shot: pk(['top', 'crane', 'low']), stake: { good: f(pk(A.good)), bad: f(pk(A.bad)), head: stakeHead }, lines: [L('若她倒下——', '', '#ffe28a'), L('若她活着——', '', '#ff9a8a')] });
    // 6 出发
    beats.push({ shot: pk(['door', 'push']), finale: true, lines: [L(pick(M.resolve), '我', '#fff', true)] });
    // 时长
    for (const b of beats) { let t = 0.5; for (const l of b.lines) { l.at = t; l.d = durOf(l.t) * (b.stake ? 0.9 : 1); t += l.d + 0.15; } b.dur = Math.max(b.title ? 5.5 : 3.8, t + 0.4); if (b.stake) b.dur = lvl === 2 ? 6.5 : 8; if (b.finale) b.dur = Math.max(4.5, Math.min(b.dur, 6)); }
    return beats;
  }

  // ================= 镜头 =================
  const lerp = (a, b, u) => a + (b - a) * u, sm = u => u * u * (3 - 2 * u), ez = u => 0.5 * u + 0.5 * sm(u);
  function makeShot(type, X) {
    const { A, fw, rt, H, F } = X, gy = (x, z) => { try { return H(x, z); } catch (e) { return 0; } };
    const P = (x, y, z) => [x, Math.max(y, gy(x, z) + 0.55), z];
    const at = (p, d, q, e) => [p[0] + d[0] * q + e[0], p[1], p[2] + d[2] * q + e[2]];
    const z3 = [0, 0, 0];
    const sgn = Math.random() < 0.5 ? -1 : 1;
    switch (type) {
      case 'crane': { const p1x = A[0] - fw[0] * 16 + rt[0] * 5 * sgn, p1z = A[2] - fw[2] * 16 + rt[2] * 5 * sgn; const p0 = P(A[0] - fw[0] * 3, gy(A[0], A[2]) + 1.3, A[2] - fw[2] * 3), p1 = P(p1x, gy(p1x, p1z) + 13, p1z);
        const lk = [A[0] + fw[0] * 10, gy(A[0] + fw[0] * 10, A[2] + fw[2] * 10) + 1.2, A[2] + fw[2] * 10]; return { pos: u => [lerp(p0[0], p1[0], u), lerp(p0[1], p1[1], u), lerp(p0[2], p1[2], u)], look: u => lk, fov: [66, 50], roll: 0 }; }
      case 'push': { const p0 = P(A[0] - fw[0] * 2 - rt[0] * 1.5 * sgn, gy(A[0], A[2]) + 1.3, A[2] - fw[2] * 2 - rt[2] * 1.5 * sgn), p1 = P(A[0] + fw[0] * 11 + rt[0] * 1.0 * sgn, gy(A[0] + fw[0] * 11, A[2] + fw[2] * 11) + 1.6, A[2] + fw[2] * 11 + rt[2] * 1.0 * sgn);
        return { pos: u => [lerp(p0[0], p1[0], u), lerp(p0[1], p1[1], u) + Math.sin(u * 9) * 0.03, lerp(p0[2], p1[2], u)], look: u => { const a = lerp(-0.3, 0.3, u) * sgn, p = [lerp(p0[0], p1[0], u), 0, lerp(p0[2], p1[2], u)]; const dx = fw[0] * Math.cos(a) + rt[0] * Math.sin(a), dz = fw[2] * Math.cos(a) + rt[2] * Math.sin(a); return [p[0] + dx * 10, gy(p[0] + dx * 10, p[2] + dz * 10) + 1.4, p[2] + dz * 10]; }, fov: [70, 60], roll: 0 }; }
      case 'low': { const p0 = P(A[0] - rt[0] * 5 * sgn, 0, A[2] - rt[2] * 5 * sgn), p1 = P(A[0] + rt[0] * 5 * sgn, 0, A[2] + rt[2] * 5 * sgn); const lk = [A[0] + fw[0] * 14, gy(A[0] + fw[0] * 14, A[2] + fw[2] * 14) + 2.4, A[2] + fw[2] * 14];
        return { pos: u => { const x = lerp(p0[0], p1[0], u), z = lerp(p0[2], p1[2], u); return [x, gy(x, z) + 0.5 + u * 0.15, z]; }, look: u => lk, fov: [78, 68], roll: 0.05 * sgn }; }
      case 'orbit': { const fx = F[0], fz = F[1], a0 = Math.random() * 6.28, sw = 1.5 * sgn, fy = gy(fx, fz);
        return { pos: u => { const a = a0 + sw * u, rr = lerp(11, 8, u), x = fx + Math.cos(a) * rr, z = fz + Math.sin(a) * rr; return [x, Math.max(gy(x, z) + 0.8, fy + lerp(3, 5, u)), z]; }, look: u => [fx, fy + 1.5, fz], fov: [54, 50], roll: 0 }; }
      case 'top': { const c0 = [A[0] + fw[0] * 4 - rt[0] * 8 * sgn, A[2] + fw[2] * 4 - rt[2] * 8 * sgn], c1 = [A[0] + fw[0] * 4 + rt[0] * 8 * sgn, A[2] + fw[2] * 4 + rt[2] * 8 * sgn]; const lk = [A[0] + fw[0] * 10, gy(A[0] + fw[0] * 10, A[2] + fw[2] * 10), A[2] + fw[2] * 10];
        return { pos: u => { const x = lerp(c0[0], c1[0], u), z = lerp(c0[1], c1[1], u); return [x, gy(x, z) + lerp(20, 24, u), z]; }, look: u => lk, fov: [58, 46], roll: 0 }; }
      case 'door': { const d = X.door || [A[0] + fw[0] * 16, A[2] + fw[2] * 16]; const dx = d[0] - A[0], dz = d[1] - A[2], dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl, run = Math.min(dl * 0.7, 14);
        return { pos: u => { const x = A[0] + ux * (2 + (run - 2) * u), z = A[2] + uz * (2 + (run - 2) * u); return [x, gy(x, z) + 1.5, z]; }, look: u => [d[0], gy(d[0], d[1]) + 1.8, d[1]], fov: [62, 48], roll: 0 }; }
    }
    return makeShot('push', X);
  }


  // ================= 人设介绍蒙太奇（R49d）：真人特写 + 名牌 + 做事，像二次元女主登场 =================
  const ACT = {
    witch: ['用指尖碾碎一撮干花', '对着小瓶里的液体轻轻吹气', '把药草一片一片码进布袋'], fight: ['慢慢擦拭刀背上的灰', '握紧又松开刀柄', '单手转了一圈短刃又接住'],
    bow: ['数着箭袋里的羽箭', '用拇指试了试弓弦', '把箭尖上的露水抹掉'], holy: ['低头抚平衣摆的褶', '合掌默念着什么', '把烛火护在掌心里'],
    noble: ['整理袖口的刺绣', '看着指尖的戒指出神', '轻轻放下茶盏'], gen: ['把碎发别到耳后', '望着远处出神', '低声哼着一首旧歌', '系紧了靴子的绑带']
  };
  const actOf = c => { const id = (c && c.id) || ''; const g = /witch|hexer|coven|alchem|herbal|shaman|druid/.test(id) ? 'witch' : /merc|knight|guard|assassin|general|slayer|warrior|paladin|chieftess|thief|wolf/.test(id) ? 'fight' : /archer|ranger|hunt|falcon|cross/.test(id) ? 'bow' : /nun|saint|priest|abbess|choir|miko|novice|inquisitor|angel/.test(id) ? 'holy' : /queen|princess|lady|countess|duchess|court|musician|singer|bard/.test(id) ? 'noble' : 'gen'; const a = ACT[g].concat(ACT.gen); return a[Math.floor(Math.random() * a.length)]; };
  const headOf = fo => { try { const b = fo.f.bones && fo.f.bones.head, v = new THREE.Vector3(); b.updateWorldMatrix(true, false); b.getWorldPosition(v); return v; } catch (e) { return new THREE.Vector3(fo.pos.x, fo.pos.y + 1.45, fo.pos.z); } };
  const frontOf = fo => { try { const b = fo.f.bones.head, q = new THREE.Quaternion(); b.getWorldQuaternion(q); const f = new THREE.Vector3(0, 0, 1).applyQuaternion(q); f.y = 0; if (f.lengthSq() < 0.05) fo.f.root.getWorldQuaternion(q), f.set(0, 0, 1).applyQuaternion(q), f.y = 0; return f.normalize().negate(); } catch (e) { return new THREE.Vector3(0, 0, 1); } };
  function castPick(sg) {
    const W = window.Worlds && Worlds._W, P = W && W.pos, out = []; if (!W || !P || !W.foes) return out;
    const ok = fo => fo && !fo.dead && fo.f && fo.f.root && fo.f.bones && fo.f.bones.head && fo.h && fo.h.c && !fo.boss;
    const hu = window.Hunters2 && Hunters2.cur && Hunters2.cur(); if (hu && ok(hu)) out.push({ fo: hu, hunter: hu.hunter2 });
    if (sg.fo && ok(sg.fo) && W.cur === (sg.node && sg.node.i) && !out.some(o => o.fo === sg.fo)) out.push({ fo: sg.fo, target: 1 });
    const near = W.foes.filter(f => ok(f) && !out.some(o => o.fo === f)).map(f => [Math.hypot(f.pos.x - P.x, f.pos.z - P.z), f]).filter(a => a[0] < 50).sort((a, b) => a[0] - b[0]);
    for (const [, f] of near) { if (out.length >= (talkOn() ? 3 : 2)) break; out.push({ fo: f }); }
    return out;
  }
  function castBeats(cast, lvl) {
    const beats = [], L = (t, w, col, it) => ({ t, w: w || '', col: col || '', it: !!it }), bio = c => { try { return window.Overhear && Overhear.bio(c); } catch (e) { return null; } };
    cast.forEach((ct, ci) => {
      const fo = ct.fo, c = fo.h.c, B = bio(c) || {}, nm = c.name || '无名', idn = (window.Lore && Lore.ID && Lore.ID[c.id] && Lore.ID[c.id].n) || c.idN || c.title || '旅人';
      let col = '#ffe0a8', chips = [], title = c.title && c.title !== nm ? c.title : idn, quote = B.catch || '……', sub2 = B.secret ? '秘密 · ' + B.secret : '';
      const AN = (window.Overhear && Overhear.AN) || {}; if (B.arche && AN[B.arche]) chips.push('性格 · ' + AN[B.arche]);
      if (B.like) chips.push('喜欢 · ' + B.like); if (B.fear) chips.push('怕 · ' + B.fear);
      if (ct.hunter && window.Hunters2) { const d = Hunters2.BY[ct.hunter]; col = d.col; title = d.t; chips = ['⚔ 猎手 · Lv.' + Hunters2.lvOf(ct.hunter), d.ic + ' 追猎你的人', ...chips.slice(0, 1)]; quote = d.lines[0]; sub2 = d.style; }
      else if (ct.target) { col = '#ffc8c8'; chips.unshift('🎯 本次讨伐目标'); }
      const act = actOf(c), k = ct.hunter ? '追 猎 者' : ct.target ? '目 标' : (ci ? '另 一 位' : '这 片 土 地 上 的 人');
      const card = { k, n: nm, t: title, ch: chips.slice(0, 3), col };
      const mk = (shot, dur, lines, extra) => beats.push(Object.assign({ shot, castFo: fo, cut: true, cc: card, dur, lines: lines.map((l, i) => Object.assign(l, { at: 0.35 + i * (dur - 0.5) / Math.max(1, lines.length), d: Math.min(2.4, (dur - 0.6) / Math.max(1, lines.length)) })) }, extra || {}));
      mk('cFace', lvl === 2 ? 2.4 : 3.0, [L(quote, nm, col)], { tag: ct.hunter ? '猎 手 登 场' : '人 设' });
      if (lvl < 2) mk('cEyes', 1.7, [], { cc2: 1 });
      mk('cHand', 2.3, [L(`她 ${act}。`, '', '#e8dcc6', true)]);
      mk(ci % 2 ? 'cOver' : 'cLow', 2.7, [L(sub2 || quote, nm, col, !!sub2)], { cc2: 1 });
    });
    if (beats.length) beats[beats.length - 1].cut = false;
    return beats;
  }
  // ================= R57 saga_talk：地区电影改成「这片土地上的女人们」的特写对话（不再在出生点乱转镜头） =================
  const talkOn = () => !window.Mods || Mods.on('saga_talk') !== false;
  const TK = {
    first: ['……那是什么？那么大的个子——', '别看它的眼睛！快，把孩子们带进屋！', '它腰上挂的是……首级？一、二、三……', '是那个食人魔。和悬赏单上画的一模一样。', '站住！……不，别过来，我不是那个意思——'],
    again: ['它又来了。上次它来，{L}少了好几个人。', '把门闩上。它记得路。', '又是你。这次你想要谁的头？', '我认得那把刀。上次就是它。'],
    won: ['上次是你……砍下了{PT}的头。之后{L}安静了好几天。', '我不知道该谢你，还是该怕你。{PT}的事……就当没发生过。'],
    fail: ['哈，上次不是灰溜溜地走了吗？{PT}可还好好的。', '{PT}还活着。她说，你根本不敢靠近她。'],
    hot: ['悬赏单上你的价钱，已经够买下半个{L}了。', '猎魔公会的人刚走。她们说，你一定会来。'],
    reply: ['小声点！它听得见。', '别怕……它要的不是我们。', '你看它的刀，上面的血还没干。', '别乱动。它只砍站着不动的——不对，是乱跑的？', '……它好像在听我们说话。'],
    hook: ['如果你真要砍头……{T}在{place}。去找她。', '你是来找{Tt}{T}的吧？……求你，别弄错人。', '{T}。她就在{place}。别说是我告诉你的。', '去{place}。那里的事，比你可怕。'],
    hookE: ['月亮上的人派来的那个……{T}。她在{place}。', '有个自称“月之使者”的女人，这几天一直待在{place}。'],
    fin: ['{T}，{place}。就这么定了。', '她们怕我。很好——怕我的人，不会挡路。', '首级在{place}等我。走。', '先找到{T}。剩下的，路上再说。']
  };
  function personOf(fo, ci) {
    const c = fo.h.c, B = (() => { try { return (window.Overhear && Overhear.bio(c)) || {}; } catch (e) { return {}; } })(), nm = c.name || '无名';
    const idn = (window.Lore && Lore.ID && Lore.ID[c.id] && Lore.ID[c.id].n) || c.idN || c.title || '旅人', title = c.title && c.title !== nm ? c.title : idn;
    const AN = (window.Overhear && Overhear.AN) || {}, chips = [];
    if (B.arche && AN[B.arche]) chips.push('性格 · ' + AN[B.arche]); if (B.like) chips.push('喜欢 · ' + B.like); if (B.fear) chips.push('怕 · ' + B.fear);
    const col = ['#ffe0a8', '#c8e8ff', '#ffc8e0', '#d8ffc8'][ci % 4];
    return { fo, nm, idn, B, col, card: { k: ci ? '另 一 位' : '这 片 土 地 上 的 人', n: nm, t: title, ch: chips.slice(0, 3), col } };
  }
  function talkScript(sg, cast) {
    const ppl = cast.filter(ct => !ct.hunter).slice(0, 3).map((ct, i) => Object.assign(personOf(ct.fo, i), { target: ct.target })); if (!ppl.length) return null;
    const A = sg.arch, r = sg.r, pk = sg.pk, used = new Set(), pick = arr => { const a = arr.filter(x => !used.has(x)); const v = pk(a.length ? a : arr); used.add(v); return v; };
    const a0 = ppl.find(p => !p.target) || ppl[0], a1 = ppl.find(p => p !== a0 && !p.target) || null, tg = ppl.find(p => p.target) || null;
    if (a1) { a0.fo.pair = a1.fo; a1.fo.pair = a0.fo; } else { a0.fo.pair = null; }
    const c = Object.assign({}, sg.ctx, { W: a0.nm, Wr: a0.idn, PT: (sg.prev && sg.prev.T) || '她' }), f = t => fill(t, c);
    const L = (t, w, col, it) => ({ t: f(t), w: w || '', col: col || '', it: !!it }), q = t => /^“/.test(t) ? t : '“' + t + '”';
    const lvl = sg.vis <= 2 ? 0 : sg.vis <= 5 ? 1 : 2, beats = [];
    let infamy = 0; try { infamy = window.Hunters2 && Hunters2.infamy ? Hunters2.infamy(sg.k) : 0; } catch (e) { }
    const react = sg.prev ? (sg.prev.res === 'win' ? TK.won : TK.fail) : infamy >= 6 ? TK.hot : sg.vis <= 1 ? TK.first : TK.again;
    const B2 = a1 || a0, sp = (p, t, it) => L(it ? t : q(f(t)), it ? '' : p.nm + (p === a0 ? ' · ' + p.idn : ''), it ? '#e8dcc6' : p.col, it);
    // 1 标题：她看见你了
    beats.push({ shot: 'cLow', castFo: a0.fo, title: true, cut: true, lines: [sp(a0, pick(react))], min: 5 });
    beats.push({ shot: 'cFace', castFo: a0.fo, cc: a0.card, cut: true, tag: '异变 · ' + A.nm, lines: [sp(a0, pick(A.sign))] });
    if (a1) {
      beats.push({ shot: 'cOS', castFo: a1.fo, cc: a1.card, cut: true, lines: [sp(a1, pick(TK.reply))].concat(lvl < 2 ? [sp(a1, pick(A.sign))] : []) });
      beats.push({ shot: 'cOS', castFo: a0.fo, cc: a0.card, cc2: 1, cut: true, lines: [sp(a0, pick(A.wit))] });
    } else beats.push({ shot: 'cEyes', castFo: a0.fo, cc: a0.card, cc2: 1, cut: true, lines: [sp(a0, pick(A.wit))] });
    beats.push({ shot: 'cHand', castFo: B2.fo, cut: true, lines: [sp(B2, `${B2.nm}${actOf(B2.fo.h.c)}。`, true)].concat(lvl === 0 ? [sp(B2, pick(A.cause), true)] : []) });
    if (tg) beats.push({ shot: 'cFace', castFo: tg.fo, cc: Object.assign({}, tg.card, { k: '目 标', ch: ['🎯 本次讨伐目标'].concat(tg.card.ch.slice(0, 2)), col: '#ffc8c8' }), cut: true, lines: [L(pick(sg.envoy ? D.ELINE.meet : D.TLINE.meet), sg.T.n + ' · ' + sg.T.title, sg.envoy ? '#d8d0ff' : '#ffc8c8')] });
    if (a1) beats.push({ shot: 'cTwo', castFo: a0.fo, cut: true, lines: [sp(B2, pick(sg.envoy ? TK.hookE : TK.hook))].concat(r() < 0.5 ? [sp(a0, pick(TK.reply))] : []) });
    else beats.push({ shot: 'cFace', castFo: a0.fo, cc: a0.card, cc2: 1, cut: true, lines: [sp(a0, pick(sg.envoy ? TK.hookE : TK.hook))] });
    const cnum = clues(), stakeHead = sg.envoy ? `月之线索 ${cnum}/${D.NEED}` : '';
    beats.push({ shot: 'cEyes', castFo: a0.fo, cut: true, stake: { good: f(pk(A.good)), bad: f(pk(A.bad)), head: stakeHead }, lines: [L('若她倒下——', '', '#ffe28a'), L('若她活着——', '', '#ff9a8a')] });
    beats.push({ shot: a1 ? 'cOver' : 'cLow', castFo: B2.fo, finale: true, lines: [L(pick(TK.fin), '我', '#fff', true)] });
    for (const b of beats) { let t = 0.5; for (const l of b.lines) { l.at = t; l.d = durOf(l.t) * (b.stake ? 0.9 : 1); t += l.d + 0.15; } b.dur = Math.max(b.min || 3.2, t + 0.4); if (b.stake) b.dur = lvl === 2 ? 6.5 : 8; if (b.finale) b.dur = Math.max(4.5, Math.min(b.dur, 6)); }
    return beats;
  }
  function castShot(type, fo) {
    const UP = new THREE.Vector3(0, 1, 0), V = THREE.Vector3, sgn = Math.random() < 0.5 ? -1 : 1, H0 = headOf(fo), F0 = frontOf(fo), hs = fo.f && fo.f.bones && fo.f.bones.rightHand;
    const live = () => { const h = headOf(fo), f = frontOf(fo), side = new V(-f.z, 0, f.x); return { h, f, side }; };
    const gy = (x, z) => { try { return Worlds._W.B.H(x, z); } catch (e) { return 0; } };
    const shot = (camF, lookF, fov, roll) => ({ pos: u => { const c = camF(u); c[1] = Math.max(c[1], gy(c[0], c[2]) + 0.35); return c; }, look: lookF, fov, roll: roll || 0 });
    // 让被拍的人出现在画面右侧（名牌在左）：看向点偏向被拍者左边
    const off = (h, c, k) => { const dx = h.x - c[0], dz = h.z - c[2], d = Math.hypot(dx, dz) || 1; return [h.x + dz / d * k, h.z - dx / d * k]; };
    switch (type) {
      case 'cEyes': return shot(u => { const { h, f, side } = live(); const d = 0.5 - u * 0.08; return [h.x + f.x * d + side.x * 0.06, h.y + 0.02, h.z + f.z * d + side.z * 0.06]; }, u => { const { h, f, side } = live(), c = [h.x + f.x * (0.5 - u * 0.08) + side.x * 0.06, 0, h.z + f.z * (0.5 - u * 0.08) + side.z * 0.06], dx = h.x - c[0], dz = h.z - c[2], d = Math.hypot(dx, dz) || 1, k = 0.11; return [h.x + dz / d * k, h.y + 0.035, h.z - dx / d * k]; }, [24, 17], 0.02 * sgn);
      case 'cHand': return shot(u => { const { h, f, side } = live(); let t = h; try { if (hs) { hs.updateWorldMatrix(true, false); t = new V(); hs.getWorldPosition(t); } else t = new V(h.x, h.y - 0.55, h.z); } catch (e) { } return [t.x + f.x * 0.85 + side.x * 0.45 * sgn * (1 - u * 0.4), t.y + 0.22, t.z + f.z * 0.85 + side.z * 0.45 * sgn * (1 - u * 0.4)]; }, u => { const { h } = live(); let t = new V(h.x, h.y - 0.55, h.z); try { if (hs) { hs.getWorldPosition(t); } } catch (e) { } return [t.x, t.y, t.z]; }, [44, 36], -0.04 * sgn);
      case 'cTwo': if (fo.pair) { const B2 = fo.pair; return shot(u => { const a = headOf(fo), b2 = headOf(B2), m = a.clone().add(b2).multiplyScalar(0.5), dx = b2.x - a.x, dz = b2.z - a.z, dl = Math.hypot(dx, dz) || 1, nx = -dz / dl, nz = dx / dl, F = frontOf(fo), s0 = (nx * F.x + nz * F.z) >= 0 ? 1 : -1, d = 2.5 - u * 0.35, sl = (u - 0.5) * 0.5 * sgn; return [m.x + nx * d * s0 + dx / dl * sl, m.y - 0.05, m.z + nz * d * s0 + dz / dl * sl]; }, u => { const a = headOf(fo), b2 = headOf(B2); return [(a.x + b2.x) / 2, (a.y + b2.y) / 2 - 0.12, (a.z + b2.z) / 2]; }, [44, 38], 0); } /* fallthrough */
      case 'cOS': if (fo.pair) { const B2 = fo.pair; return shot(u => { const a = headOf(B2), b2 = headOf(fo), dx = b2.x - a.x, dz = b2.z - a.z, dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl, k = 0.42 + u * 0.04; return [a.x - ux * 0.55 - uz * k * sgn, a.y + 0.08, a.z - uz * 0.55 + ux * k * sgn]; }, u => { const b2 = headOf(fo); return [b2.x, b2.y - 0.04, b2.z]; }, [36, 31], 0.01 * sgn); } /* fallthrough */
      case 'cLow': return shot(u => { const { h, f, side } = live(); const d = 2.3 - u * 0.5; return [fo.pos.x + f.x * d + side.x * 0.7 * sgn, fo.pos.y + 0.22, fo.pos.z + f.z * d + side.z * 0.7 * sgn]; }, u => { const { h } = live(); return [h.x, h.y - 0.35, h.z]; }, [62, 52], 0.06 * sgn);
      case 'cOver': return shot(u => { const { h, f, side } = live(); return [h.x - f.x * 0.9 + side.x * 0.5 * sgn, h.y + 0.12, h.z - f.z * 0.9 + side.z * 0.5 * sgn]; }, u => { const { h, f } = live(); return [h.x + f.x * 6, h.y - 0.1, h.z + f.z * 6]; }, [48, 40], 0.03 * sgn);
      default: { const cp = u => { const { h, f, side } = live(), d = 1.25 - u * 0.25; return [h.x + f.x * d + side.x * 0.22 * sgn, h.y + 0.05, h.z + f.z * d + side.z * 0.22 * sgn]; };
        return shot(cp, u => { const { h } = live(), c = cp(u), dx = h.x - c[0], dz = h.z - c[2], d = Math.hypot(dx, dz) || 1, k = 0.24; return [h.x + dz / d * k, h.y - 0.02, h.z - dx / d * k]; }, [38, 30], -0.02 * sgn); }
    }
  }

  // ================= 电影播放器 =================
  let CN = null; // { sg, beats, bi, t0, shot, saved, done, wait }
  function css() {
    if (css.done) return; css.done = 1; const s = document.createElement('style'); s.textContent = `
#sgRoot{position:fixed;inset:0;z-index:58;pointer-events:auto;display:none;overflow:hidden;font-family:var(--u-serif,'Noto Serif SC','Songti SC',serif)}
#sgRoot.on{display:block}
#sgRoot .bar{position:absolute;left:0;right:0;background:#000;height:0;transition:height 1.1s cubic-bezier(.2,.7,.2,1);z-index:2}
#sgRoot .bt{top:0}#sgRoot .bb{bottom:0}
#sgRoot.on .bar{height:var(--bh,12vh)}
#sgRoot .vig{position:absolute;inset:0;z-index:1;background:radial-gradient(ellipse at 50% 50%,transparent 52%,rgba(0,0,0,.55) 100%);pointer-events:none}
#sgRoot .tint{position:absolute;inset:0;z-index:1;pointer-events:none;mix-blend-mode:soft-light;opacity:.5;background:linear-gradient(180deg,var(--tc,#e7c27a),transparent 55%,var(--tc,#e7c27a))}
#sgRoot.flash .tint{background:#b89868;mix-blend-mode:color;opacity:.55}#sgRoot.flash .vig{background:radial-gradient(ellipse at 50% 50%,transparent 38%,rgba(20,10,0,.75) 100%)}
#sgRoot .grain{position:absolute;inset:-50px;z-index:1;pointer-events:none;opacity:.13;background-size:128px;animation:sgGr .5s steps(5) infinite}
@keyframes sgGr{0%{transform:translate(0,0)}20%{transform:translate(-30px,18px)}40%{transform:translate(22px,-26px)}60%{transform:translate(-14px,-30px)}80%{transform:translate(28px,22px)}}
#sgRoot .fade{position:absolute;inset:0;background:#000;opacity:1;z-index:3;pointer-events:none;transition:opacity .45s}
#sgRoot .cc{position:absolute;left:6vw;top:calc(var(--bh,12vh) + 11vh);z-index:4;max-width:42vw;opacity:0;transform:translateX(-30px);transition:opacity .35s,transform .5s cubic-bezier(.2,.7,.2,1);text-shadow:0 2px 14px #000}
#sgRoot .cc.on{opacity:1;transform:none}
#sgRoot .cc .k{font-size:clamp(15px,1.4vw,19px);letter-spacing:.5em;color:var(--c,#ffe0a8);padding-left:14px;border-left:4px solid var(--c,#ffe0a8);margin-bottom:10px}
#sgRoot .cc .n{font-size:clamp(46px,6.4vw,104px);font-weight:900;letter-spacing:.1em;color:#fff;line-height:1.05}
#sgRoot .cc .t{font-size:clamp(20px,2vw,30px);letter-spacing:.3em;color:var(--c,#ffe0a8);margin:8px 0 14px}
#sgRoot .cc .ch span{display:inline-block;margin:0 10px 8px 0;padding:5px 14px;font-size:clamp(16px,1.5vw,21px);letter-spacing:.12em;color:#fff;background:rgba(0,0,0,.55);border:1px solid var(--c,#ffe0a8)}
#sgRoot .tag{position:absolute;left:5vw;z-index:4;top:calc(var(--bh,12vh) + 18px);font-size:clamp(15px,1.5vw,19px);letter-spacing:.42em;color:#f0dcae;text-shadow:0 2px 10px #000;opacity:0;transition:opacity .6s;padding-left:14px;border-left:3px solid var(--tc,#e7c27a)}
#sgRoot .tag.on{opacity:1}
#sgRoot .ttl{position:absolute;left:0;right:0;top:32%;text-align:center;z-index:4;opacity:0;transition:opacity 1.2s;pointer-events:none}
#sgRoot .ttl.on{opacity:1}
#sgRoot .ttl .a{font-size:clamp(17px,1.8vw,22px);letter-spacing:.7em;color:var(--tc,#e7c27a);filter:brightness(1.25);text-shadow:0 2px 12px #000;padding-left:.7em}
#sgRoot .ttl .b{font-size:clamp(54px,9vw,132px);font-weight:900;letter-spacing:.22em;color:#fff;text-shadow:0 4px 30px #000,0 0 70px color-mix(in srgb,var(--tc,#e7c27a) 55%,transparent);line-height:1.12;padding-left:.22em;margin:4px 0}
#sgRoot .ttl .c{font-size:clamp(17px,1.7vw,22px);letter-spacing:.35em;color:#e8dcc6;text-shadow:0 2px 10px #000;padding-left:.35em}
#sgRoot .ttl .ln{width:min(520px,60vw);height:2px;margin:10px auto;background:linear-gradient(90deg,transparent,var(--tc,#e7c27a),transparent)}
#sgRoot .sub{position:absolute;left:8vw;right:8vw;bottom:calc(var(--bh,12vh) + 26px);z-index:4;text-align:center;pointer-events:none}
#sgRoot .who{display:inline-block;font-size:clamp(15px,1.45vw,19px);letter-spacing:.3em;padding:3px 16px;margin-bottom:8px;background:rgba(0,0,0,.55);box-shadow:inset 0 0 0 1px currentColor;opacity:0;transition:opacity .4s}
#sgRoot .txt{font-size:clamp(24px,2.7vw,38px);line-height:1.6;font-weight:700;color:#fff;letter-spacing:.06em;text-shadow:0 2px 3px #000,0 0 18px #000,0 0 34px #000a;opacity:0;transform:translateY(8px);transition:opacity .45s,transform .6s;max-width:1200px;margin:0 auto}
#sgRoot .txt.it{font-style:italic;color:#f4ecff}
#sgRoot .txt.on,#sgRoot .who.on{opacity:1;transform:none}
#sgRoot .stake{position:absolute;left:6vw;right:6vw;top:28%;z-index:4;display:flex;gap:4vw;justify-content:center;pointer-events:none}
#sgRoot .stake .sc{flex:1;max-width:560px;padding:20px 26px 22px;background:linear-gradient(160deg,rgba(0,0,0,.72),rgba(0,0,0,.45));box-shadow:inset 0 0 0 1px var(--c),0 0 60px color-mix(in srgb,var(--c) 30%,transparent);opacity:0;transform:translateY(24px) scale(.97);transition:opacity .8s,transform .9s cubic-bezier(.2,.8,.2,1)}
#sgRoot .stake .sc.on{opacity:1;transform:none}
#sgRoot .stake .sc .k{font-size:clamp(17px,1.8vw,23px);letter-spacing:.35em;color:var(--c);font-weight:900;margin-bottom:10px}
#sgRoot .stake .sc .v{font-size:clamp(19px,1.9vw,26px);line-height:1.65;color:#fff;font-weight:600;text-shadow:0 2px 8px #000}
#sgRoot .stake .sc .e{margin-top:12px;font-size:clamp(15px,1.45vw,19px);color:var(--c);font-weight:800;letter-spacing:.06em}
#sgRoot .stakeh{position:absolute;left:0;right:0;top:calc(28% - 50px);z-index:4;text-align:center;font-size:clamp(17px,1.7vw,22px);letter-spacing:.4em;color:#d8d0ff;text-shadow:0 2px 10px #000;opacity:0;transition:opacity .8s}
#sgRoot .stakeh.on{opacity:1}
#sgRoot .hint{position:absolute;right:26px;bottom:calc(var(--bh,12vh) - 38px);z-index:5;font-size:15px;color:#cfc4ab;letter-spacing:.12em;text-shadow:0 1px 4px #000;font-family:inherit}
#sgRoot .go{position:absolute;left:0;right:0;bottom:calc(var(--bh,12vh) + 26px);z-index:6;text-align:center;font-size:clamp(20px,2vw,28px);letter-spacing:.5em;color:#fff;text-shadow:0 2px 14px #000;opacity:0;transition:opacity .8s;pointer-events:none}
#sgRoot .go.on{opacity:1;animation:sgPulse 1.4s ease-in-out infinite}@keyframes sgPulse{50%{opacity:.45}}
#sgRoot .dots{position:absolute;left:0;right:0;bottom:calc(var(--bh,12vh) - 26px);z-index:5;text-align:center;display:flex;justify-content:center;gap:10px}
#sgRoot .dots i{width:30px;height:3px;background:#ffffff33}#sgRoot .dots i.on{background:var(--tc,#e7c27a)}#sgRoot .dots i.d{background:#ffffffaa}
/* 追踪 */
#sgTrack{position:fixed;right:16px;top:150px;z-index:34;width:min(330px,30vw);pointer-events:none;display:none;color:#f3e6cf;text-shadow:0 1px 4px #000;background:linear-gradient(270deg,#0c0810d8,#0c081000);padding:8px 14px 10px 26px;border-right:3px solid var(--tc,#e7c27a)}
#sgTrack .k{font-size:15px;letter-spacing:.3em;color:var(--tc,#e7c27a);font-weight:800}
#sgTrack .n{font-size:20px;font-weight:900;color:#fff;margin:2px 0;letter-spacing:.08em}
#sgTrack .t{font-size:15px;color:#e8dcc6}
#sgTrack .row{display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;justify-content:flex-end}
#sgTrack .c{font-size:15px;font-weight:800;padding:2px 10px;background:rgba(0,0,0,.55);box-shadow:inset 0 0 0 1px currentColor}
#sgTrack .ar{display:inline-block;font-size:22px;transition:transform .2s;vertical-align:middle;margin-right:4px}
#sgTrack.done .n{text-decoration:line-through;opacity:.7}
/* 大横幅 */
#sgBan{position:fixed;left:0;right:0;top:22%;z-index:36;pointer-events:none;text-align:center;opacity:0;transition:opacity .7s;padding:26px 0;background:linear-gradient(90deg,transparent,rgba(6,4,10,.86) 18%,rgba(6,4,10,.86) 82%,transparent);font-family:var(--u-serif,serif)}
#sgBan.on{opacity:1}
#sgBan .a{font-size:clamp(34px,4.2vw,58px);font-weight:900;letter-spacing:.3em;color:var(--c,#ffe28a);text-shadow:0 3px 20px #000;padding-left:.3em}
#sgBan .b{font-size:clamp(19px,2vw,26px);margin-top:8px;color:#fff;letter-spacing:.08em;line-height:1.6;padding:0 8vw}
#sgBan .c{font-size:17px;margin-top:6px;color:#d8c8f0;letter-spacing:.12em}
/* 结算 */
body.sgcine>*:not(canvas):not(script):not(style):not(#sgRoot):not(:has(canvas)){opacity:0!important;pointer-events:none!important}
#sgSet{position:fixed;inset:0;z-index:62;display:none;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 40%,rgba(18,10,24,.6),rgba(0,0,0,.9));backdrop-filter:blur(5px);font-family:var(--u-serif,serif)}
#sgSet.on{display:flex;animation:arIn .5s ease-out}
#sgSet .cd{width:min(1040px,94vw);max-height:97vh;overflow:auto;background:linear-gradient(180deg,#16101c,#0c080e);box-shadow:0 0 0 1px var(--c),0 30px 120px #000,0 0 120px color-mix(in srgb,var(--c) 25%,transparent);color:#eee;position:relative}
#sgSet .hd{padding:18px 40px 6px;text-align:center;background:linear-gradient(180deg,color-mix(in srgb,var(--c) 22%,transparent),transparent)}
#sgSet .hd .a{font-size:16px;letter-spacing:.6em;color:var(--c);padding-left:.6em}
#sgSet .hd .b{font-size:clamp(34px,4.4vw,56px);font-weight:900;letter-spacing:.3em;color:#fff;text-shadow:0 0 50px color-mix(in srgb,var(--c) 60%,transparent);padding-left:.3em;margin:4px 0}
#sgSet .hd .c{font-size:19px;color:#e8dcc6;letter-spacing:.1em;line-height:1.5}
#sgSet .bd{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:6px 34px 4px}
#sgSet .bx{padding:8px 16px;background:rgba(255,255,255,.04);box-shadow:inset 3px 0 0 var(--c2,var(--c))}
#sgSet .bx .k{font-size:15px;letter-spacing:.3em;color:var(--c2,var(--c));font-weight:800}
#sgSet .bx .v{font-size:21px;font-weight:800;color:#fff;margin:2px 0;line-height:1.4}
#sgSet .bx .w{font-size:16px;color:#cbbda6;line-height:1.6}
#sgSet .st{grid-column:1/-1;display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
#sgSet .st div{text-align:center;padding:5px 4px;background:rgba(255,255,255,.04)}
#sgSet .st b{display:block;font-size:26px;color:#fff;font-weight:900}#sgSet .st span{font-size:15px;color:#b8a98f;letter-spacing:.2em}
#sgSet .cl{grid-column:1/-1;display:flex;align-items:center;gap:16px;padding:7px 18px;background:rgba(120,100,200,.12);box-shadow:inset 3px 0 0 #b8a8ff}
#sgSet .cl .pp{display:flex;gap:8px}#sgSet .cl .pp i{width:26px;height:26px;border-radius:50%;box-shadow:inset 0 0 0 2px #8878c8;display:block}#sgSet .cl .pp i.on{background:radial-gradient(circle,#fff,#b8a8ff);box-shadow:0 0 14px #b8a8ff}
#sgSet .cl .tx{font-size:17px;color:#e0d8ff;flex:1;line-height:1.6}
#sgSet .go{text-align:center;padding:10px 0 16px}#sgSet .go button{font-size:20px;letter-spacing:.4em;padding:12px 44px;background:linear-gradient(180deg,#5a1a1a,#3a0e0e);color:#fff;border:1px solid var(--c);cursor:pointer;font-family:inherit}
#sgSet .rw{padding:6px 34px 0}#sgSet .rw .rk{font-size:17px;letter-spacing:.3em;color:#ffe28a;margin:4px 0 6px}#sgSet .rw .rc{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}#sgSet .rw .r{cursor:pointer;text-align:center;padding:8px 8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.18);transition:.2s}#sgSet .rw .r:hover{background:rgba(255,226,138,.12)}#sgSet .rw .r.sel{border-color:#ffe28a;background:rgba(255,226,138,.18);box-shadow:0 0 22px rgba(255,226,138,.3);transform:translateY(-3px)}#sgSet .rw .ri{font-size:32px;line-height:1.2}#sgSet .rw .rn{font-size:19px;font-weight:900;color:#fff;margin:2px 0}#sgSet .rw .rd{font-size:15px;color:#e0d4b8}@media (max-width:820px){#sgSet .bd{grid-template-columns:1fr}#sgSet .st{grid-template-columns:repeat(3,1fr)}}`;
    document.head.appendChild(s);
  }
  let noise = null;
  function grainURL() {
    if (noise) return noise; const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d'), d = x.createImageData(96, 96);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); return (noise = c.toDataURL()); }
  let root = null, el = {};
  function ensure() {
    css(); if (root) return;
    root = document.createElement('div'); root.id = 'sgRoot';
    root.innerHTML = `<div class="tint"></div><div class="vig"></div><div class="grain"></div><div class="bar bt"></div><div class="bar bb"></div><div class="tag"></div><div class="cc"><div class="k"></div><div class="n"></div><div class="t"></div><div class="ch"></div></div>
<div class="ttl"><div class="a"></div><div class="ln"></div><div class="b"></div><div class="c"></div></div><div class="stakeh"></div><div class="stake"><div class="sc" data-w="good" style="--c:#ffe28a"><div class="k">✦ 若她倒下</div><div class="v"></div><div class="e"></div></div><div class="sc" data-w="bad" style="--c:#ff8a7a"><div class="k">✧ 若她活着</div><div class="v"></div><div class="e"></div></div></div>
<div class="sub"><div class="who"></div><div class="txt"></div></div><div class="go">▶ 空格 · 出发</div><div class="dots"></div><div class="hint">空格 / 点击：下一幕　·　Esc：跳过</div><div class="fade"></div>`;
    document.body.appendChild(root);
    root.querySelector('.grain').style.backgroundImage = `url(${grainURL()})`;
    el = { cc: root.querySelector('.cc'), tag: root.querySelector('.tag'), ttl: root.querySelector('.ttl'), a: root.querySelector('.ttl .a'), b: root.querySelector('.ttl .b'), c: root.querySelector('.ttl .c'), stake: root.querySelector('.stake'), sg: root.querySelector('.stake [data-w=good]'), sb: root.querySelector('.stake [data-w=bad]'), sh: root.querySelector('.stakeh'), who: root.querySelector('.who'), txt: root.querySelector('.txt'), go: root.querySelector('.go'), dots: root.querySelector('.dots'), fade: root.querySelector('.fade') };
    ['mousedown', 'pointerdown', 'wheel', 'contextmenu'].forEach(ev => root.addEventListener(ev, e => e.stopPropagation()));
    root.addEventListener('click', () => { if (CN) next(); });
  }
  const FX_TXT = { harvest: ['魂晶 +35%', '本趟结算多得魂晶'], calm: ['敌人伤害 −12%', ''], ward: ['入场回血 30%', ''], plunder: ['损失 6% 魂晶', ''], wrath: ['敌人伤害 +12%', ''], hate: ['猎手仇恨 +6', ''], iron: ['敌人生命 +15%', ''] };
  const FX_LONG = { harvest: '恩：下 2 趟该地区，结算魂晶 +35%', calm: '恩：下 2 趟该地区，敌人伤害 −12%', ward: '恩：下 2 趟该地区，入场回血 30%', plunder: '祸：结算时损失 6% 魂晶', wrath: '祸：下 2 趟该地区，敌人伤害 +12%', hate: '祸：猎手仇恨 +6', iron: '祸：下 2 趟该地区，敌人生命 +15%' };

  function play(sg) {
    const g = G(), W = window.Worlds && Worlds._W; if (!W || !W.B || CN) return false;
    ensure(); sg.shown = true;
    const L = LOC(sg.k); let beats = null;
    if (talkOn()) { try { const cast = castPick(sg); beats = talkScript(sg, cast); if (beats) { const hu = cast.filter(c => c.hunter); if (hu.length) { const cb = castBeats(hu, 1); if (cb.length) { cb[cb.length - 1].cut = true; beats.splice(1, 0, ...cb); } } } } catch (e) { console.warn('Saga talk', e); beats = null; } }
    if (!beats) beats = script(sg);
    if (!talkOn() || !beats.some(b => b.castFo)) try { const cast = castPick(sg), lv = sg.vis <= 2 ? 0 : sg.vis <= 5 ? 1 : 2, cb = castBeats(cast.slice(0, lv === 2 ? 1 : 2), lv); if (cb.length) { let ti = beats.findIndex(b => b.title); ti = ti < 0 ? 0 : ti; beats.splice(ti + 1, 0, ...cb); } } catch (e) { console.warn('Saga cast', e); }
    return startCN(sg, beats, D.REG[sg.k] ? D.REG[sg.k].col : '#e7c27a', 700);
  }
  // R57 nem_story：通用短片播放器（宿敌插曲 / 人物起源），复用本电影的字幕/名牌/黑边/相机接管；beats 格式同 castBeats（castFo 必填），可加 card:{a,b,c} 标题卡
  function reel(o) {
    const W = window.Worlds && Worlds._W; if (!W || !W.B || CN || !o || !o.beats || !o.beats.length) return false; ensure();
    const sg = { reel: 1, k: o.k || '', vis: 9, env: { sky: '' }, T: { n: '', title: '' }, onEnd: o.onEnd, onBeat: o.onBeat, shown: true };
    return startCN(sg, o.beats, o.col || '#e7c27a', 450);
  }
  function startCN(sg, beats, col, delay) {
    const g = G();
    CN = { sg, beats, bi: -1, t0: 0, bt: 0, shot: null, saved: [], done: false, wait: false, fov0: g.camera.fov, hid: [] };
    root.style.setProperty('--tc', col); root.classList.remove('flash');
    const bh = Math.max(window.innerHeight * 0.085, (window.innerHeight - window.innerWidth / 2.39) / 2); root.style.setProperty('--bh', bh + 'px');
    try { g.setUI(true); } catch (e) { }
    // 隐藏 HUD / 第一人称武器
    document.body.classList.add('sgcine'); /* R49b：改用 body 类隐藏 HUD（不再改各元素的行内样式），电影结束/出错时由 tick 兜底移除 */
    try { for (const c of g.camera.children) { CN.saved.push([c, c.visible]); c.visible = false; } } catch (e) { }
    root.classList.add('on'); el.dots.innerHTML = beats.map(() => '<i></i>').join('');
    setTimeout(() => CN && beginBeat(0), delay); CN.raf = requestAnimationFrame(loop);
    return true;
  }
  function shotFor(b) {
    if (b.castFo) { try { return castShot(b.shot, b.castFo); } catch (e) { console.warn('cast shot', e); } }
    const g = G(), W = Worlds._W, B = W.B, P = g.player, yaw = P.yaw;
    const fw = [-Math.sin(yaw), 0, -Math.cos(yaw)], rt = [Math.cos(yaw), 0, -Math.sin(yaw)];
    if (!CN.anchor) CN.anchor = [W.pos.x, W.pos.y, W.pos.z];
    const A = CN.anchor; const doors = (B.doors || []).map(d => [d.x, d.z]);
    let door = null, bd = 1e9; for (const d of doors) { const dx = d[0] - A[0], dz = d[1] - A[2], dd = Math.hypot(dx, dz); if (dd > 5 && dd < bd) { bd = dd; door = d; } }
    const cands = doors.slice(); let big = null; for (const c of B.cols || []) if (!big || c.r > big.r) big = c; if (big) cands.push([big.x, big.z]); cands.push([0, 0]);
    const F = cands[Math.floor(Math.random() * cands.length)];
    const X = { A, fw, rt, H: (x, z) => B.H(x, z), F, door };
    return makeShot(b.shot, X);
  }
  function beginBeat(i) {
    if (!CN) return; const b = CN.beats[i]; if (!b) return finishBeats();
    CN.bi = i; CN.t0 = performance.now(); CN.shot = shotFor(b); CN.ln = -1;
    root.classList.toggle('flash', b.grade === 'flash');
    el.fade.style.opacity = '0';
    if (b.cc && !b.cc2) { const cc = b.cc; el.cc.style.setProperty('--c', cc.col); el.cc.querySelector('.k').textContent = cc.k; el.cc.querySelector('.n').textContent = cc.n; el.cc.querySelector('.t').textContent = cc.t; el.cc.querySelector('.ch').innerHTML = cc.ch.map(x => `<span>${esc(x)}</span>`).join(''); el.cc.classList.remove('on'); void el.cc.offsetWidth; el.cc.classList.add('on'); } else if (b.cc && b.cc2) { /* 同一人的后续镜头：名牌保留 */ } else el.cc.classList.remove('on');
    el.tag.textContent = b.tag || ''; el.tag.classList.toggle('on', !!b.tag);
    el.dots.querySelectorAll('i').forEach((d, j) => { d.className = j < i ? 'd' : j === i ? 'on' : ''; });
    // 标题
    el.ttl.classList.remove('on'); el.stake.style.display = 'none'; el.sg.classList.remove('on'); el.sb.classList.remove('on'); el.sh.classList.remove('on'); el.go.classList.remove('on');
    if (b.title) { const L = LOC(CN.sg.k); el.a.textContent = CN.sg.vis <= 1 ? '初 访' : `第 ${CN.sg.vis} 次 踏 入`; el.b.textContent = L.n; el.c.textContent = CN.sg.env.sky; setTimeout(() => CN && CN.bi === i && el.ttl.classList.add('on'), 500); setTimeout(() => CN && CN.bi === i && el.ttl.classList.remove('on'), Math.max(3000, b.dur * 1000 - 1800)); }
    if (b.stake) {
      el.stake.style.display = 'flex'; const sg = CN.sg, A = sg.arch; el.sg.querySelector('.v').textContent = b.stake.good; el.sb.querySelector('.v').textContent = b.stake.bad;
      el.sg.querySelector('.e').textContent = sg.envoy ? `✦ 月之线索 +1（${clues() + 1}/${D.NEED}）· ${FX_TXT[A.boon][0]}` : '✦ ' + FX_TXT[A.boon][0] + ' · 持续 2 趟';
      el.sb.querySelector('.e').textContent = '✧ ' + FX_TXT[A.bane][0] + (A.bane === 'hate' || A.bane === 'plunder' ? '' : ' · 持续 2 趟');
      el.sh.textContent = b.stake.head || ''; if (b.stake.head) el.sh.classList.add('on');
    }
    if (b.card) { el.a.textContent = b.card.a || ''; el.b.textContent = b.card.b || ''; el.c.textContent = b.card.c || ''; setTimeout(() => CN && CN.bi === i && el.ttl.classList.add('on'), 350); setTimeout(() => CN && CN.bi === i && el.ttl.classList.remove('on'), Math.max(2600, b.dur * 1000 - 1100)); }
    try { if (CN.sg.onBeat) CN.sg.onBeat(b, i); } catch (e) { console.warn('reel beat', e); }
    if (b.finale) { const T = CN.sg.T; el.a.textContent = '讨 伐'; el.b.textContent = T.n; el.c.textContent = `「${T.title}」`; setTimeout(() => CN && CN.bi === i && el.ttl.classList.add('on'), 1000); }
    el.txt.classList.remove('on'); el.who.classList.remove('on');
    CN.fadeOut = false;
  }
  function showLine(l) {
    el.txt.classList.remove('on'); el.who.classList.remove('on');
    setTimeout(() => { if (!CN) return; el.txt.textContent = l.t; el.txt.classList.toggle('it', !!l.it); el.txt.style.color = l.col && !l.it ? l.col : ''; el.txt.classList.add('on'); if (l.w) { el.who.textContent = l.w; el.who.style.color = l.col || '#fff'; el.who.classList.add('on'); } else el.who.classList.remove('on'); }, 260);
  }
  function loop() {
    if (!CN) return; CN.raf = requestAnimationFrame(loop);
    if (CN.bi < 0 || CN.wait) return;
    const b = CN.beats[CN.bi], t = (performance.now() - CN.t0) / 1000;
    // 字幕
    let idx = -1; for (let i = 0; i < b.lines.length; i++) if (t >= b.lines[i].at) idx = i;
    if (b.stake) { if (t > 0.6) el.sg.classList.add('on'); if (t > 3.6) el.sb.classList.add('on'); el.txt.classList.remove('on'); el.who.classList.remove('on'); }
    else if (idx !== CN.ln) { CN.ln = idx; if (idx >= 0) showLine(b.lines[idx]); }
    if (!b.stake && idx >= 0 && t > b.lines[idx].at + b.lines[idx].d) el.txt.classList.remove('on'), el.who.classList.remove('on');
    if (t > b.dur - 0.5 && !CN.fadeOut && !b.cut && CN.bi < CN.beats.length - 1) { CN.fadeOut = true; el.fade.style.opacity = '1'; el.txt.classList.remove('on'); el.who.classList.remove('on'); }
    if (t > b.dur) { if (CN.bi < CN.beats.length - 1) beginBeat(CN.bi + 1); else finishBeats(); }
  }
  function next() { if (!CN || CN.wait) { if (CN && CN.wait) end(); return; } const b = CN.beats[CN.bi]; if (!b) return; const t = (performance.now() - CN.t0) / 1000; if (t < 0.8) return; if (CN.bi >= CN.beats.length - 1) { if (t > b.dur - 0.2 || t > 3.2) finishBeats(); return; } beginBeat(CN.bi + 1); }
  function finishBeats() { if (!CN || CN.wait) return; if (CN.sg.reel) return end(); CN.wait = true; el.go.classList.add('on'); el.txt.classList.remove('on'); el.who.classList.remove('on'); const b = CN.beats[CN.beats.length - 1]; el.ttl.classList.add('on'); }
  function end() {
    if (!CN) return; const c = CN; CN = null; cancelAnimationFrame(c.raf); window.__skipMenuUntil = performance.now() + 1500; // Esc 跳过会触发浏览器解锁鼠标，不要因此弹主菜单
    try { G().camera.fov = c.fov0; G().camera.updateProjectionMatrix(); } catch (e) { }
    root.classList.remove('on'); el.fade.style.opacity = '1';
    document.body.classList.remove('sgcine'); try { for (const [o, v] of c.saved) o.visible = v; } catch (e) { }
    try { G().setUI(false); G().lockPointer && G().lockPointer(); } catch (e) { }
    c.sg.cinDone = true; if (c.sg.onEnd) { try { c.sg.onEnd(); } catch (e) { console.warn('reel end', e); } }
    if (c.sg.chap && !c.sg.chapAwarded) awardChapter(c.sg);
  }
  addEventListener('keydown', e => {
    if (!CN) return; if (/^F\d+$/.test(e.code)) return;
    e.preventDefault(); e.stopImmediatePropagation(); if (e.repeat) return;
    if (e.code === 'Escape') return end();
    if (['Space', 'Enter', 'NumpadEnter', 'KeyE'].includes(e.code)) { if (CN.wait) end(); else next(); }
  }, true);
  addEventListener('keyup', e => { if (CN) e.stopImmediatePropagation(); }, true);

  // ---- 相机钩子（worlds.js 每帧调用）----
  let lastFov = 0;
  function cam(c, dt, now) {
    if (!CN || !CN.shot || CN.bi < 0) return; const b = CN.beats[CN.bi]; const u = Math.max(0, Math.min(1, (performance.now() - CN.t0) / 1000 / b.dur)), e = ez(u);
    try { const S0 = G().S; if (CN.hp0 == null) CN.hp0 = S0.hp; if (S0.hp < CN.hp0) S0.hp = CN.hp0; } catch (e0) { } /* 电影期间不掉血 */
    const s = CN.shot; let p, l; try { p = s.pos(e); l = s.look(e); } catch (e1) { return; }
    c.position.set(p[0], p[1], p[2]); c.lookAt(l[0], l[1], l[2]); if (s.roll) c.rotateZ(s.roll * Math.sin(u * 3.14));
    const fv = lerp(s.fov[0], s.fov[1], e); if (Math.abs(fv - lastFov) > 0.05) { c.fov = fv; c.updateProjectionMatrix(); lastFov = fv; }
  }

  // ================= 线索 =================
  function giveClue(src, sg) {
    const s = SS(); if (s.cl.length >= D.NEED) return null; const d = D.CLUES[s.cl.length];
    s.cl.push({ t: d.t, k: d.k, src, at: Date.now(), r: sg ? sg.k : '' }); s.since = 0; try { G().save(); } catch (e) { }
    return d;
  }
  function awardChapter(sg) {
    if (!sg || !sg.chap || sg.chapAwarded) return; sg.chapAwarded = true; SS().chap[sg.chap.id] = Date.now();
    const d = giveClue('chapter', sg); if (d) setTimeout(() => banner('🌙 月之线索 +1', d.t.replace(/^“|”$/g, ''), `${clues()}/${D.NEED}${clues() >= D.NEED ? ' · 月之魔女的神殿向你敞开了' : ''}`, '#c8b8ff'), 900);
  }

  // ================= 大横幅 =================
  let ban = null;
  function banner(a, b, c, col, ms) {
    css(); if (!ban) { ban = document.createElement('div'); ban.id = 'sgBan'; document.body.appendChild(ban); }
    ban.style.setProperty('--c', col || '#ffe28a'); ban.innerHTML = `<div class="a">${esc(a)}</div><div class="b">${esc(b)}</div><div class="c">${esc(c || '')}</div>`; ban.classList.add('on'); clearTimeout(ban._t); ban._t = setTimeout(() => ban.classList.remove('on'), ms || 5200);
  }

  // ================= 出猎：本趟状态 =================
  let T = null; // 当前 saga
  const cooked = {};
  function setupTrip(trip) {
    if (!on()) { T = null; return; }
    const W = Worlds._W; if (!W || !W.graph || !W.graph.trip) { T = null; return; }
    const k = trip.loc.k, s = SS(); s.v[k] = (s.v[k] || 0) + 1;
    const sg = gen(k); T = sg; sg.t0 = performance.now(); sg.st = { c0: G().S.coins, hp0: G().S.hp };
    // 恩/祸：入场回血
    const m = s.mod[k]; if (m && m.t === 'ward' && m.left > 0) { try { const st = G().st(); G().S.hp = Math.min(st.maxHp, G().S.hp + Math.round(st.maxHp * 0.3)); } catch (e) { } }
    const rc = s.recent[k] = s.recent[k] || []; rc.push(sg.arch.id); while (rc.length > 3) rc.shift();
    if (!sg.envoy) s.since++;
    try { sg.hunterId = window.Hunters2 && Hunters2.rollOmen ? Hunters2.rollOmen(k) : null; } catch (e) { sg.hunterId = null; }
  }
  function pickNode(sg, W) {
    if (sg.node || !W || !W.graph) return; const g = W.graph, bad = n => n.home || n.boss || n.rqMini || n.eliteArena || n.huntArena;
    let cand = g.nodes.filter(n => !bad(n) && n.depth >= 1).sort((a, b) => a.depth - b.depth); if (!cand.length) cand = g.nodes.filter(n => !bad(n));
    if (!cand.length) { sg.noNode = true; return; }
    const n = cand[Math.min(cand.length - 1, Math.floor(cand.length * (sg.envoy ? 0.35 : 0.6)))]; n.sagaT = sg; sg.node = n;
  }
  function wrap() {
    if (window.Worlds && !Worlds.__sg) {
      const s0 = Worlds.start; Worlds.start = function (trip, api) {
        let a2 = api; if (api && on()) { a2 = Object.assign({}, api); const f0 = api.finish, d0 = api.die; a2.finish = function () { try { resolve(); } catch (e) { console.warn('Saga resolve', e); } return f0.apply(this, arguments); }; a2.die = function () { try { T = null; } catch (e) { } return d0.apply(this, arguments); }; }
        const r = s0.call(this, trip, a2); try { setupTrip(trip); } catch (e) { console.warn('Saga setup', e); T = null; } return r;
      }; Worlds.__sg = 1;
    }
    if (window.Foe && !Foe.__sg) {
      const p0 = Foe.populate; let inj = null;
      Foe.populate = async function (ctx, list) {
        if (arguments[2] && arguments[2].keep) return p0.apply(this, arguments); // R54l：中途追加（宿敌/精英）不清场、不重复注入
        inj = null;
        try {
          const W = window.Worlds && Worlds._W, node = W && W.graph && W.graph.nodes[W.cur], sg = on() && T && node && node.sagaT;
          if (sg && !sg.done && window.RPG && RPG.foe) {
            const g = G(), h = node.sagaH || (node.sagaH = RPG.foe(g.S, node.loc, (Math.random() * 4294967296) >>> 0, g.usedNames, g.usedSig));
            Object.assign(h.c, { name: sg.T.n, id: sg.T.id, idN: roleN(sg.T.id), title: sg.T.title, rar: sg.envoy ? 4 : 3 }); h.story = fill(sg.envoy ? D.MOONARCH.cause[0] : sg.arch.cause[0], sg.ctx); h.sagaT = 1;
            const B = W.B; let x = 0, z = 0; if (B) for (let t = 0; t < 60; t++) { const p = B.lp && B.lp.samp ? B.lp.samp(Math.random, 6) : null; if (p) { x = p[0]; z = p[1]; } else { const a = Math.random() * 6.28, d = B.R * (0.2 + Math.random() * 0.4); x = Math.cos(a) * d; z = Math.sin(a) * d; } if (!B.cols || B.cols.every(c => Math.hypot(c.x - x, c.z - z) > c.r + 1)) break; }
            list = list.concat([{ h, pos: new THREE.Vector3(x, 0, z) }]); inj = h;
          }
        } catch (e) { console.warn('Saga inject', e); }
        const out = await p0.call(this, ctx, list);
        try {
          const W = window.Worlds && Worlds._W, node = W && W.graph && W.graph.nodes[W.cur], sg = T;
          if (out && sg && on() && node && !node.eliteArena) {
            const s = SS(), m = s.mod[sg.k];
            for (const fo of out) {
              if (inj && fo.h === inj) { const L = LOC(sg.k), hk = window.FoeAbs && FoeAbs.on ? FoeAbs.hpK(L.rec * 1.1) : 0.77; fo.maxHp = fo.hp = Math.round(130 * hk * (sg.envoy ? 1.25 : 1)); fo.absRec = L.rec * 1.1; fo.iq = Math.max(fo.iq || 0, sg.envoy ? 1.05 : 0.95); fo.brave = true; fo.sagaT = sg; sg.fo = fo; sg.hpMax = fo.maxHp; if (sg.envoy) fo.dmgMul = (fo.dmgMul || 1) * 1.15; setTimeout(() => { try { if (!fo.dead && fo.seen) Foe.say(fo, fill(pick1(sg.envoy ? D.ELINE.meet : D.TLINE.meet), sg.ctx), sg.envoy ? '#d8d0ff' : '#ffc8c8'); } catch (e) { } }, 1500); continue; }
              if (m && m.left > 0) { if (m.t === 'calm') fo.dmgMul = (fo.dmgMul || 1) * 0.88; else if (m.t === 'wrath') fo.dmgMul = (fo.dmgMul || 1) * 1.12; else if (m.t === 'iron') { fo.maxHp = Math.round(fo.maxHp * 1.15); fo.hp = fo.maxHp; } }
            }
          }
        } catch (e) { console.warn('Saga boost', e); }
        inj = null; return out;
      };
      Foe.__sg = 1;
    }
  }
  const pick1 = a => a[Math.floor(Math.random() * a.length)];

  // ================= 结果 / 结算 =================
  function onKill(sg) {
    if (sg.done) return; sg.done = true; sg.res = 'win'; const A = sg.arch, s = SS();
    if (sg.envoy) {
      if (window.MoonTrail && MoonTrail.on()) { MoonTrail.promise(); banner('🌙 月使倒下', '她的血在地上画出一弯月牙——指向某处。', '下一趟必定出现「月之踪迹」：在地区里找齐月痕就能得到线索', '#c8b8ff', 7200); try { Foe.say && sg.fo && Foe.say(sg.fo, fill(pick1(D.ELINE.die), sg.ctx), '#d8d0ff'); } catch (e) { } }
      else {
      const d = giveClue('envoy', sg);
      banner('🌙 月使倒下', d ? d.t.replace(/^“|”$/g, '') : '月之线索已集齐', d ? `月之线索 ${clues()}/${D.NEED}${clues() >= D.NEED ? ' · 月之魔女的神殿向你敞开了' : ''}` : '', '#c8b8ff', 7200);
      try { Foe.say && sg.fo && Foe.say(sg.fo, fill(pick1(D.ELINE.die), sg.ctx), '#d8d0ff'); } catch (e) { }
      }
    } else {
      banner('✦ 异变平息', fill(pick1(A.good), sg.ctx), FX_LONG[A.boon], '#ffe28a', 6200);
      try { Foe.say && sg.fo && Foe.say(sg.fo, fill(pick1(D.TLINE.die), sg.ctx), '#ffc8c8'); } catch (e) { }
    }
    try { window.SFX && SFX.fanfare && SFX.fanfare(3); } catch (e) { }
  }
  function resolve() {
    const sg = T; if (!sg || sg.settled) return; sg.settled = true; const s = SS(), A = sg.arch, sn = sg.snap || { coins: 0, kill: 0, decap: 0 };
    const win = sg.done && sg.res === 'win'; if (!win) sg.res = 'fail';
    const coinsTrip = sn.coins; let extra = 0, fx = A[win ? 'boon' : 'bane'], note = '';
    if (win) { s.wins++; if (fx === 'harvest') { extra = Math.round(coinsTrip * 0.35); if (extra > 0) { G().addCoins(extra); } } }
    else { s.fails++; if (fx === 'plunder') { const loss = Math.min(Math.round(G().S.coins * 0.06), 800); if (loss > 0) { G().addCoins(-loss); extra = -loss; } } if (fx === 'hate') { try { const h = G().S.h2 = G().S.h2 || { hate: 0, L: {} }; h.hate = (h.hate || 0) + 6; } catch (e) { } } }
    // 已有 mod 计数 -1
    const old = s.mod[sg.k]; if (old && old.left > 0) old.left--;
    if (['calm', 'ward', 'iron', 'wrath'].includes(fx) || fx === 'harvest') s.mod[sg.k] = { t: fx, left: 2, win };
    s.last[sg.k] = { res: sg.res, T: sg.T.n, arch: A.id, at: Date.now() }; if (sg.envoy) s.since = 0;
    const tripStat = { coins: coinsTrip + (extra > 0 ? extra : 0), kills: sn.kill, decap: sn.decap, hp: Math.max(0, Math.round((sg.st ? sg.st.hp0 : 0) - G().S.hp)), sec: Math.round((performance.now() - sg.t0) / 1000) };
    try { G().save(); } catch (e) { }
    setTimeout(() => showSettle(sg, win, extra, fx, tripStat), 1600);
  }
  let setEl = null;
  function showSettle(sg, win, extra, fx, ts) {
    sg.tsx = ts;
    css(); if (!setEl) { setEl = document.createElement('div'); setEl.id = 'sgSet'; document.body.appendChild(setEl); ['mousedown', 'pointerdown', 'wheel', 'contextmenu'].forEach(ev => setEl.addEventListener(ev, e => e.stopPropagation())); setEl.addEventListener('click', e => { if (e.target.closest('[data-sgok]')) closeSettle(); }); }
    const A = sg.arch, L = LOC(sg.k), col = win ? '#ffe28a' : '#ff8a7a', cn = clues(), ctx = sg.ctx;
    const line = win ? fill(pick1(A.good), ctx) : fill(pick1(A.bad), ctx);
    const pips = Array.from({ length: D.NEED }, (_, i) => `<i class="${i < cn ? 'on' : ''}"></i>`).join('');
    const lastClue = SS().cl[SS().cl.length - 1];
    setEl.style.setProperty('--c', col);
    setEl.innerHTML = `<div class="cd"><div class="hd"><div class="a">${esc(L.icon || '')} ${esc(L.n)} · ${esc(A.nm)}</div><div class="b">${win ? (sg.envoy ? '月使伏诛' : '异变平息') : (sg.envoy ? '月使逃脱' : '异变恶化')}</div><div class="c">${esc(line)}</div></div>
<div class="bd"><div class="bx" style="--c2:${sg.envoy ? '#c8b8ff' : '#ffb870'}"><div class="k">${sg.envoy ? '🌙 月之使者' : '🎯 讨伐目标'}</div><div class="v">${esc(sg.T.title)} · ${esc(sg.T.n)}</div><div class="w">${win ? '已斩首 ✓' : (sg.fo && !sg.fo.dead ? '仍在 ' + esc(L.n) + ' 的某处活着……' : '你没有找到她。')}</div></div>
<div class="bx" style="--c2:${col}"><div class="k">${win ? '✦ 恩' : '✧ 祸'}</div><div class="v">${esc(sg.envoy && win ? '月之线索 +1' : FX_TXT[fx][0])}${extra ? ` <small style="font-size:17px;color:${extra > 0 ? '#9fe89f' : '#ff9a8a'}">（${extra > 0 ? '+' : ''}${extra} 🔮）</small>` : ''}</div><div class="w">${esc(FX_LONG[fx] || '')}</div></div>
<div class="st"><div><b>${ts.coins}</b><span>🔮 魂晶</span></div><div><b>${ts.kills}</b><span>🗡 放倒</span></div><div><b>${ts.decap}</b><span>💀 斩首</span></div><div><b>${ts.hp}</b><span>❤ 损失</span></div><div><b>${Math.floor(ts.sec / 60)}:${String(ts.sec % 60).padStart(2, '0')}</b><span>⏱ 用时</span></div></div>
<div class="cl"><div class="pp">${pips}</div><div class="tx"><b>月之线索 ${cn}/${D.NEED}</b>${cn >= D.NEED ? ' · 神殿的门已打开——去「精英挑战」里找月之魔女' : lastClue ? `　最新：${esc(lastClue.t.replace(/^“|”$/g, ''))}` : '　斩下月使、触发章节闪回，都能得到线索'}</div></div></div>
${rwHTML(sg, win)}<div class="go"><button data-sgok>收下结算 ▶</button></div></div>`;
    rwSel = 0; setEl.querySelectorAll("[data-rw]").forEach(el => el.addEventListener("click", () => { rwSel = +el.dataset.rw; setEl.querySelectorAll("[data-rw]").forEach(x => x.classList.toggle("sel", x === el)); try { SFX.page && SFX.page(); } catch (e) { } }));
    setEl.classList.add('on'); try { G().setUI(true); SFX.open && SFX.open(); } catch (e) { }
  }
  // ---- 战利品三选一：结算时从随机 3 份里挑 1 份（点击选择，默认第 1 份）----
  let rwSel = 0, rwList = [];
  function rwHTML(sg, win) {
    const ts = sg.tsx || {}, base = Math.max(60, Math.round((ts.coins || 0) * 0.35) + 40);
    const P = [
      { ic: '💰', n: '魂晶袋', d: `+${base} 🔮 魂晶`, f: () => G().addCoins(base) },
      { ic: '📖', n: '旧日手札', d: `经验 +${Math.round(base * 0.8)}`, f: () => { try { RPG.addXp(G().S, Math.round(base * 0.8)); } catch (e) { } } },
      { ic: '🧪', n: '月下泉水', d: '立即回复 45% 生命', f: () => { try { const s0 = G().st(); G().S.hp = Math.min(s0.maxHp, G().S.hp + s0.maxHp * 0.45); } catch (e) { } } },
      { ic: '🪞', n: '镜中残片', d: '回忆重抽券 ×1（下次重抽免费）', f: () => { try { Memory.grantReroll(1); } catch (e) { } }, need: () => !!window.Memory },
      { ic: '🕯️', n: '安魂烛', d: '全境仇恨 −6', f: () => { try { const h = G().S.h2; if (h && typeof h.hate === 'number') h.hate = Math.max(0, h.hate - 6); } catch (e) { } } },
      { ic: '🗡️', n: '磨刀石', d: '魂晶 +' + Math.round(base * 0.6) + '，并回复 20% 生命', f: () => { try { G().addCoins(Math.round(base * 0.6)); const s0 = G().st(); G().S.hp = Math.min(s0.maxHp, G().S.hp + s0.maxHp * 0.2); } catch (e) { } } }
    ].filter(x => !x.need || x.need());
    const a = []; while (a.length < 3 && P.length) a.push(P.splice(Math.floor(Math.random() * P.length), 1)[0]);
    rwList = a;
    return `<div class="rw"><div class="rk">✦ 战利品 · 三选一（点击挑选）</div><div class="rc">${a.map((x, i) => `<div class="r ${i ? '' : 'sel'}" data-rw="${i}"><div class="ri">${x.ic}</div><div class="rn">${x.n}</div><div class="rd">${x.d}</div></div>`).join('')}</div></div>`;
  }
  function applyReward() { const r = rwList[rwSel]; rwList = []; if (!r) return; try { r.f(); G().toast(`${r.ic} ${r.n}：${r.d}`, '#ffe28a', 3); G().save(); } catch (e) { } }
  function closeSettle() { if (!setEl) return; setEl.classList.remove('on'); applyReward(); try { G().setUI(false); G().lockPointer && G().lockPointer(); } catch (e) { } try { window.Memory && Memory.afterSettle(); } catch (e) { } }
  addEventListener('keydown', e => { if (setEl && setEl.classList.contains('on') && ['Space', 'Enter', 'Escape', 'KeyE'].includes(e.code)) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) closeSettle(); } }, true);

  // ================= 追踪 HUD =================
  let trk = null;
  function track(W) {
    css(); if (!trk) { trk = document.createElement('div'); trk.id = 'sgTrack'; document.body.appendChild(trk); }
    const sg = T; if (!sg || CN) { trk.style.display = 'none'; return; }
    trk.style.display = 'block'; trk.style.setProperty('--tc', sg.envoy ? '#c8b8ff' : (D.REG[sg.k] ? D.REG[sg.k].col : '#e7c27a')); trk.classList.toggle('done', !!sg.done);
    let where = '', fo = sg.fo;
    if (sg.done) where = '<span style="color:#9fe89f">✓ 已斩首 · 回洞结算</span>';
    else if (fo && !fo.dead && W.cur === sg.node.i && W.pos && fo.pos) { const dx = fo.pos.x - W.pos.x, dz = fo.pos.z - W.pos.z, d = Math.hypot(dx, dz), P = G().player, ang = Math.atan2(dx, -dz) + P.yaw; where = `<span class="ar" style="transform:rotate(${(-ang).toFixed(2)}rad)">▲</span>${d < 40 ? '距离 ' + Math.round(d) + ' m' : '在这片区域'}`; }
    else where = sg.node && (sg.node.visited || sg.node.known) ? `藏在「${esc(sg.node.name)}」附近` : `在更深处 · 第 ${sg.node ? sg.node.depth : '?'} 层`;
    trk.innerHTML = `<div class="k">${sg.arch.ic} ${sg.envoy ? '月蚀之兆' : '异变 · ' + esc(sg.arch.nm)}</div><div class="n">${esc(sg.T.title)}·${esc(sg.T.n)}</div><div class="t">${where}</div><div class="row">${sg.envoy ? `<span class="c" style="color:#c8b8ff">🌙 线索 +1</span>` : `<span class="c" style="color:#ffe28a">✦ ${esc(FX_TXT[sg.arch.boon][0])}</span>`}<span class="c" style="color:#ff9a8a">✧ ${esc(FX_TXT[sg.arch.bane][0])}</span></div>`;
  }
  function tick() {
    if (!window.G || !G().S) return; document.body.classList.toggle('saga', on()); if (!CN && document.body.classList.contains('sgcine')) document.body.classList.remove('sgcine');
    const W = window.Worlds && Worlds.active && Worlds._W;
    if (!W || !on()) { if (trk) trk.style.display = 'none'; if (!W && T && !T.settled && !CN) { /* 非正常退出：不结算 */ } if (!W) T = null; return; }
    if (!T) return; const sg = T; if (!sg.node && !sg.noNode && W.B) pickNode(sg, W); if (sg.noNode) return;
    if (W.trip && W.stats) sg.snap = { coins: W.trip.coins || 0, kill: W.stats.kill || 0, decap: W.stats.decap || 0 };
    if (!sg.readyAt && W.B && !W.busy) sg.readyAt = performance.now();
    if (window.NemStory && NemStory.hold()) { sg.readyAt = performance.now(); track(W); return; } // R57 nem_story：宿敌插曲先播，地区电影等它
    let hold = false;
    if (sg.hunterId && !sg.hReady && !sg.shown && !W.busy && W.B) { // 猎手入场伏击：先让她出现在场上，再开电影介绍她
      if (!sg.hAt) { sg.hAt = performance.now(); try { Hunters2.ambush(sg.hunterId); } catch (e) { sg.hReady = true; } }
      if ((window.Hunters2 && Hunters2.cur()) || performance.now() - sg.hAt > 9000) { sg.hReady = true; sg.hAt2 = performance.now(); } else hold = true;
    }
    if (!sg.shown && !hold && !W.busy && W.B && !CN) { setTimeout(() => { if (T === sg && !sg.cinDone && !CN && Worlds.active) { const nd = Worlds._W.graph.nodes[Worlds._W.cur]; if ((nd && nd.eliteArena) || (window.Arrival2 && Arrival2.isOpen())) { sg.cinDone = true; return; } try { play(sg); } catch (e) { console.warn('Saga play', e); try { end(); } catch (e2) { CN = null; document.body.classList.remove('sgcine'); } } } }, 700); sg.shown = true; }
    if (sg.fo && !sg.done) { if (sg.fo.dead || sg.fo.hp <= 0) onKill(sg); else if (sg.fo.escaped) { sg.esc = true; } }
    track(W);
  }
  setInterval(() => { try { tick(); } catch (e) { console.warn('Saga', e); } }, 250);

  // ================= 补丁：月之魔女解锁 / 胜利条件 / 面板 =================
  function patchElites() {
    const E = window.Elites; if (!E || E.__sg || !E.MOON) return; E.__sg = 1; const M = E.MOON;
    const nEl = S => Object.keys((S.el && S.el.dead) || {}).filter(k => k !== 'moon').length;
    M.cond = S => on() ? clues() >= D.NEED : nEl(S) >= 13;
    Object.defineProperty(M, 'need', { get: () => on() ? `集齐月之线索 ${clues()}/${D.NEED}` : '击败全部 13 名精英', configurable: true });
    Object.defineProperty(M, 'rumor', { get: () => on() ? '每一条线索都指向同一个地方——月亮里的神殿。' : '月亮变成了血红色，每一颗首级都在同一时刻睁开了眼睛，望向天空。', configurable: true });
  }
  setInterval(() => { try { patchElites(); wrap(); } catch (e) { } }, 500);
  function goalHTML() {
    const cn = clues(), pips = Array.from({ length: D.NEED }, (_, i) => `<i style="display:inline-block;width:20px;height:20px;border-radius:50%;margin-right:6px;vertical-align:middle;${i < cn ? 'background:radial-gradient(circle,#fff,#b8a8ff);box-shadow:0 0 10px #b8a8ff' : 'box-shadow:inset 0 0 0 2px #8878c8'}"></i>`).join('');
    const list = SS().cl.map((c, i) => `<div style="margin:4px 0;font-size:15px;color:#d8d0ff">🌙 ${i + 1}. ${esc(c.t.replace(/^“|”$/g, ''))}</div>`).join('');
    const m = !!(G().S.el && G().S.el.dead && G().S.el.dead.moon);
    return `<div class="r3-goal" style="display:block;padding:14px 18px"><div style="font-size:20px;font-weight:900;color:#e8e0ff;letter-spacing:.2em">🌙 主线 · 月之魔女　${m ? '✔ 已斩杀' : cn >= D.NEED ? '· 神殿已开' : ''}</div><div style="margin:8px 0">${pips}<b style="font-size:20px;color:#fff;margin-left:8px">${cn}/${D.NEED}</b></div>${list || '<div style="font-size:15px;color:#b8a8d8">在各个地区斩下“月之使者”，或触发章节闪回，得到线索。集齐 7 条，月之魔女的神殿向你敞开。</div>'}</div>`;
  }
  const dbgBtn = null;
  return { _talk: (sg, cast) => talkScript(sg, cast), on, cam, reel, castShot: (t, fo) => castShot(t, fo), pendingCine: () => !!CN || !!(on() && T && !T.noNode && !T.cinDone && Worlds.active && (!T.readyAt || performance.now() - T.readyAt < 15000)), get cine() { return CN; }, NEED: D.NEED, clues, giveClue, goalHTML, gen, script, play, end, next, resolve, onKill, SS, banner, showSettle, FX_TXT, _setT: v => { T = v; }, get T() { return T; }, hint: v => `🌙 月之线索 ${clues()}/${D.NEED} · 月之魔女 ${v.m ? '✔' : '✘'}` };
})();
