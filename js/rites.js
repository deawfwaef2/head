// 第十八轮（陈列/地图 Agent）：史录陈列 —— 7 座取材人类历史的「首级陈列」建筑（MOD：rites，默认开）
// 用户反馈：第十五轮的奇物“无聊、不够黑色幽默、概念硬拼”。这次走「仪式 + 戏弄」路线：
//   人类历史上真的有人这样陈列首级，而且还郑重其事地搞仪式——荒诞感来自这份一本正经。
//   ① 首実検台（日本战国：战后由大将亲自验首，首级要先洗净、梳发、涂齿黑，按身份分等；眼神不吉的叫「凶首」，要供养）
//   ② 叛徒之门（伦敦桥/圣殿门：叛徒首级插在门顶长矛上示众，挂得越久越“有教育意义”）
//   ③ 缩首工坊（南美舒阿尔人 tsantsa：煮制缩小到拳头大，挂起来当护符）
//   ④ 京观（中国古代：战胜者把敌首堆成高冢以示武功）
//   ⑤ 圣髑贩子（中世纪圣髑买卖：同一位圣人的头骨能同时出现在好几座教堂里；赎罪券）
//   ⑥ 莎乐美之宴（《马可福音》：施洗约翰的头被放在盘子里端上宴席）
//   ⑦ 猎头祭鼓（东南亚与大洋洲历史上的猎头祭仪：带回首级后围着击鼓庆祝）
// 模型全部 Poly Haven CC0；木札/罪状/证书是 CanvasTexture 文字面板（界面元素，不是模型）。只挂 BuildCat.C / Unlocks.R / G.HOOK。
// 首级文本遵守第八轮「首级不说话，只有低频回忆气泡」；不做血腥特写（第三轮基调）。
window.Rites = (() => {
  if (window.Mods && Mods.on && !Mods.on('rites')) return { off: true };
  const BC = window.BuildCat, A = window.Assets;
  if (!BC || !A) return {};
  const C = BC.C, V3 = THREE.Vector3, HS = 1.55, PI = Math.PI;
  const F = (n, o) => (A.has(n) ? A.fit(n, o) : null);
  const add = (g, o) => { if (o) g.add(o); return o; };
  const fl = (g, x, y, z, s, c) => add(g, A.flame ? A.flame(x, y, z, s, c) : null);
  const fmt = n => (window.G && G.fmtN) ? G.fmtN(n) : String(Math.round(n));
  const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const RARC = ['#b8b8c0', '#4aa8ff', '#c05aff', '#ffb020', '#ff4a8a'];
  const later = (ms, f) => setTimeout(() => { try { f(); } catch (e) { console.warn('rites', e); } }, ms);
  const alive = h => h && window.G && G.heads.includes(h);
  const ST = () => { const S = G.S; S.rites = S.rites || {}; const R = S.rites; R.gateT = R.gateT || {}; R.relicNo = R.relicNo || 0; R.best = R.best || 0; return R; };
  const snd = (n, v, r) => { try { SFX.play(n, v, r); } catch (e) {} };
  const hash = s => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

  // ---------- 工具 ----------
  const _rc = new THREE.Raycaster();
  function topAt(obj, x, z, fallback) {
    obj.updateMatrixWorld(true); _rc.set(new V3(x, 5, z), new V3(0, -1, 0)); _rc.far = 10;
    const hit = _rc.intersectObject(obj, true).find(i => i.object.isMesh); return hit ? hit.point.y : fallback;
  }
  function fitR(name, o) { // 先旋转再量尺寸（Assets.fit 的 rx/rz 是量完之后才转）
    const m = A.has(name) ? A.clone(name) : null; if (!m) return null;
    m.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);
    const inner = new THREE.Group(); inner.add(m); const out = new THREE.Group(); out.add(inner);
    out.updateMatrixWorld(true); let bb = new THREE.Box3().setFromObject(inner); const sz = bb.getSize(new V3());
    const s = o.h ? o.h / sz.y : o.w ? o.w / sz.x : o.L ? o.L / Math.max(sz.x, sz.y, sz.z) : 1; inner.scale.setScalar(s); out.updateMatrixWorld(true);
    bb = new THREE.Box3().setFromObject(inner); const c = bb.getCenter(new V3());
    inner.position.set(-c.x, -bb.min.y, -c.z); out.position.set(o.x || 0, o.y || 0, o.z || 0);
    out.userData.size = sz.multiplyScalar(s); return out;
  }
  const _so = new V3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
  function seatAt(h, pos, quat, s = 1) { // 首级切口中心对准 pos（与 game.js seatHead 同一公式，可带缩放）
    h.g.quaternion.copy(quat);
    const m = h.hb.meta || {}, cut = m.cut || { x: 0, y: m.bottom != null ? m.bottom : -0.1, z: 0 };
    _so.set((cut.x || 0) * HS * s, ((cut.y != null ? cut.y : -0.1) * HS - 0.005) * s, (cut.z || 0) * HS * s).applyQuaternion(quat);
    h.g.position.copy(pos).sub(_so);
  }
  function slotWorld(b, s, dy = 0) { const a = -b.rot * PI / 2, c = Math.cos(a), sn = Math.sin(a); return new V3(b.x + s[0] * c + s[2] * sn, s[1] - 0.02 + dy, b.z - s[0] * sn + s[2] * c); }
  function localWorld(b, x, y, z) { const a = -b.rot * PI / 2, c = Math.cos(a), sn = Math.sin(a); return new V3(b.x + x * c + z * sn, y, b.z - x * sn + z * c); }
  function slotQuat(b, s, rx = 0, rz = 0, ry = 0) { _e.set(rx, -b.rot * PI / 2 + (s[3] != null ? s[3] : PI) + ry, rz, 'YXZ'); return _q.setFromEuler(_e).clone(); }
  function reseat(b, i, o = {}) {
    const h = b.heads && b.heads[i]; if (!h || h === G.held) return;
    const s = C[b.type].mount.slots[i];
    seatAt(h, slotWorld(b, s, o.dy || 0).add(o.off || new V3()), slotQuat(b, s, o.rx || 0, o.rz || 0, o.ry || 0), o.s || 1);
  }
  const heads = b => (b.heads || []).filter(Boolean);
  function cool(b, key, sec, label) {
    const now = G.clock.elapsedTime; b._cd = b._cd || {};
    if (b._cd[key] && now < b._cd[key]) { if (label) G.toast(`${label}（${Math.ceil(b._cd[key] - now)} 秒）`, '#bbb', 1.4); return false; }
    b._cd[key] = now + sec; return true;
  }
  const cdLeft = (b, key) => { const t = b._cd && b._cd[key]; return t ? Math.max(0, t - G.clock.elapsedTime) : 0; };
  const ft = (h, t, c, s) => G.floatText(t, h.g.position.clone().add(new V3(0, 0.38, 0)), c, s || 16);
  const MEM = [c => `（……${c.locN || '故乡'}的集市，这个时辰该收摊了……）`, () => '（……有人说过，等麦子熟了就回来……）', () => '（……那首歌的最后一句，是什么来着……）', () => '（……小时候爬过的那棵树，还在吗……）'];
  function memory(h, p = 0.08) { if (Math.random() < p) ft(h, MEM[Math.floor(Math.random() * MEM.length)](h.rec.c || {}), '#cfc6ff', 13); }

  // 文字面板（木札 / 罪状 / 证书）：CanvasTexture，内容变化时才重画
  function panel(w, h, kind) {
    const cv = document.createElement('canvas'); cv.width = kind === 'tag' ? 64 : 192; cv.height = Math.round(cv.width * h / w);
    const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide }));
    m.userData.cv = cv; m.userData.kind = kind; m.castShadow = true; draw(m, null); return m;
  }
  function draw(m, lines, col) {
    const cv = m.userData.cv, g = cv.getContext('2d'), W = cv.width, H = cv.height, k = m.userData.kind;
    const key = JSON.stringify([lines, col]); if (m.userData.key === key) return; m.userData.key = key;
    g.fillStyle = k === 'tag' ? '#d8b98a' : k === 'parch' ? '#e6d2a4' : '#f4efe2'; g.fillRect(0, 0, W, H);
    if (k === 'parch') { g.fillStyle = 'rgba(120,80,30,.25)'; for (let i = 0; i < 6; i++) g.fillRect(0, (i + 0.5) * H / 6, W, 1); }
    g.strokeStyle = k === 'cert' ? '#b8902a' : '#5a3a1a'; g.lineWidth = k === 'cert' ? 6 : 3; g.strokeRect(4, 4, W - 8, H - 8);
    if (k === 'cert') { g.strokeStyle = '#d8b04a'; g.lineWidth = 1.5; g.strokeRect(12, 12, W - 24, H - 24); }
    if (!lines) { m.material.map.needsUpdate = true; return; }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (k === 'tag') { // 竖排木札
      const t = lines[0] || ''; g.fillStyle = col || '#1a1008'; const fs = Math.min(26, (H - 16) / Math.max(1, t.length)); g.font = `bold ${fs}px serif`;
      [...t].forEach((ch, i) => g.fillText(ch, W / 2, 10 + fs * (i + 0.5)));
    } else {
      lines.forEach((t, i) => { const big = i === 0; g.fillStyle = big ? (k === 'cert' ? '#8a5a10' : '#8a1010') : '#2a1a0a'; g.font = `${big ? 'bold ' : ''}${big ? 26 : 17}px serif`;
        let s = String(t); while (g.measureText(s).width > W - 20 && s.length > 2) s = s.slice(0, -2) + '…'; g.fillText(s, W / 2, 26 + i * (i === 0 ? 0 : 1) * 28 + (i ? 12 : 0)); });
    }
    m.material.map.needsUpdate = true;
  }

  // =====================================================================
  // 1) 首実検台
  // =====================================================================
  const KJ_X = [-0.64, -0.32, 0, 0.32, 0.64];
  const KJ_RANK = ['雑兵首', '足軽首', '侍首', '侍大将首', '大将首'];
  const kjRank = h => h.rec.c.boss ? 4 : Math.max(0, Math.min(4, h.rec.c.rar | 0));
  C.kubi_jikken = {
    cat: 'func', n: '首実検台', icon: '🏯', base: 1100, grow: 1.6, fp: [0.95, 0.4], stat: { soul: 3, ter: 2 }, depth: 1, showcase: true,
    desc: '【取材：日本战国「首実検」】打完仗，大将要一本正经地亲自验首：先洗净、梳发、涂齿黑，再按身份分等级。五块砧板，每颗首级面前立一块木札写着她的等级（雑兵首→大将首）。第一颗放上台的是「一番首」，永远 ×2。每 12 秒 ×1.8 产出。空手按 E【首実検】：逐颗验首，等级越高收益越高；偶尔会验出眼神不吉的「凶首」——冷却中再按 E 做【首供养】安抚她，×3。',
    mount: { y: 0.7, period: 12, mult: 1.8, labelY: 1.25, slots: KJ_X.map(x => [x, 0.7, 0.02, 0]) },
    make() {
      const g = new THREE.Group(), d = C.kubi_jikken, U = g.userData;
      const tb = add(g, F('chinese_console_table', { w: 1.7 }));
      const top = tb ? topAt(g, 0, 0, tb.userData.size.y) : 0.66;
      U.tags = [];
      KJ_X.forEach((x, i) => {
        const bd = add(g, F('wooden_cutting_board', { w: 0.28, x, y: top, z: 0.02 }));
        const bt = bd ? bd.userData.size.y : 0.025; d.mount.slots[i][1] = top + bt + 0.01;
        const t = panel(0.07, 0.2, 'tag'); t.position.set(x + 0.1, top + 0.1, 0.13); t.rotation.x = -0.18; g.add(t); U.tags.push(t);
      });
      const kst = add(g, F('katana_stand_01', { w: 0.3, x: 0, y: top, z: -0.12 }));
      const kat = fitR('antique_katana_01', { L: 0.62, rz: PI / 2 }); if (kat) { kat.position.set(0, top + (kst ? kst.userData.size.y * 0.7 : 0.1), -0.12); g.add(kat); }
      fl(g, -0.8, top + 0.02, -0.1, 0.3, '#ffd08a'); fl(g, 0.8, top + 0.02, -0.1, 0.3, '#ffd08a');
      return g;
    },
    cols: () => [[-0.86, 0, -0.18, 0.86, 0.7, 0.18]]
  };
  function kjInspect(b) {
    const hs = heads(b); if (!hs.length) return false;
    if (b._omen && cdLeft(b, 'kj') > 0) { // 首供养
      const h = b._omen; b._omen = null; if (!alive(h) || h.mount !== b) return true;
      const v = G.trigger(h, 'manual', 3); snd('bell', 0.6, 0.7); G.burst(h.g.position.clone().add(new V3(0, 0.1, 0)), '#ffe0a0', 30, 0.8, 1.2, -1.5);
      ft(h, '🙏 首供养', '#ffe7b0', 17); G.toast(`🏯 <b>首供养</b>：点香、诵经、给她换了新发髻——凶首的眼神终于移开了 ×3 · +${fmt(v)} 魂晶`, '#ffe0b0', 3); return true;
    }
    if (!cool(b, 'kj', 18, '🏯 大将还在更衣')) return true;
    let sum = 0, omen = null; const order = b.heads.map((h, i) => [h, i]).filter(x => x[0]);
    order.forEach(([h, i], k) => later(300 + k * 520, () => {
      if (!alive(h) || h.mount !== b) return; b._look = b._look || []; b._look[i] = G.clock.elapsedTime;
      const r = kjRank(h), first = b._first === h.rec.id, m = (1.4 + r * 0.45) * (first ? 2 : 1);
      sum += G.trigger(h, 'manual', m); snd('wood', 0.5, 0.8 + r * 0.08);
      ft(h, `${first ? '一番首 · ' : ''}${KJ_RANK[r]}`, RARC[r], 15 + r);
      if (!omen && Math.random() < 0.15) { omen = h; later(250, () => { ft(h, '👁 凶首', '#ff7070', 17); snd('heavy', 0.3, 0.6); }); }
      memory(h, 0.05);
    }));
    later(300 + order.length * 520, () => {
      b._omen = omen;
      G.toast(`🏯 <b>首実検</b>：验首 ${order.length} 颗（首化粧完毕，齿黑均匀）· +${fmt(sum)} 魂晶${omen ? ' · <b style="color:#ff8080">验出凶首！</b>冷却中再按 E 做首供养' : ''}`, '#ffe0b0', 3.2);
      if (order.length === 5 && order.every(([h]) => kjRank(h) >= 3)) SFX.fanfare(3);
    });
    return true;
  }

  // =====================================================================
  // 2) 叛徒之门
  // =====================================================================
  const TG_X = [-0.66, -0.44, -0.22, 0, 0.22, 0.44, 0.66];
  const CRIMES = ['在茶会上先动了点心', '对地精斯尼克的帽子发笑', '偷吃了祭坛上的供品', '唱歌走调，连续三次', '拒绝在肖像廊站 C 位', '把魂晶藏在鞋里', '睡觉打呼噜，吵醒了京观', '对着城门吐舌头',
    '在首実検时眨眼', '私下议论主人的发型', '被缩首工坊拒收', '长得太像上一个叛徒', '叛国（据说）', '走路太响', '在圣髑证书上涂鸦', '把莎乐美的盘子舔干净了'];
  const crimeOf = h => CRIMES[hash(h.rec.id || h.rec.c.name) % CRIMES.length];
  C.traitor_gate = {
    cat: 'func', n: '叛徒之门', icon: '🚪', base: 1600, grow: 1.6, fp: [0.85, 0.35], showcase: true, aura: 2.2, auraMul: 1.15,
    stat: { ter: 6 }, depth: 2,
    desc: '【取材：伦敦桥 / 圣殿门的示众首级】一扇城门，门顶倒插七柄长剑当矛，首级挂在剑尖上，门板上贴着她们的「罪状」（都是些很严重的罪，比如走路太响）。挂得越久越有教育意义：每颗首级示众时间越长，自动产出越高（最多额外 ×3）。周围 2.2m 首级 ×1.15（威慑）。空手按 E【宣读罪状】：逐条宣读，围观群众扔烂菜叶。',
    mount: { y: 2.8, period: 16, mult: 2.0, labelY: 3.1, slots: TG_X.map(x => [x, 2.8, -0.02, 0]) },
    make() {
      const g = new THREE.Group(), d = C.traitor_gate, U = g.userData;
      const door = add(g, F('large_castle_door', { w: 1.6 }));
      const H = door ? door.userData.size.y : 2.4; d._top = []; U.crime = [];
      const tops = TG_X.map(x => door ? topAt(g, x, -0.02, H) : H), mx = Math.max(...tops);
      TG_X.forEach((x, i) => {
        const base = tops[i] > mx - 0.25 ? tops[i] : mx - 0.08; d._top[i] = base; // 射线偶尔打到门框凹处 → 统一到门顶
        const sp = fitR('antique_estoc', { h: 0.55 }); if (sp) { sp.position.set(x, base - 0.06, -0.02); g.add(sp); } // estoc 自带竖直、剑尖朝上
        d.mount.slots[i][1] = base - 0.06 + 0.47;
        const p = panel(0.19, 0.26, 'parch'); p.position.set(x, base - 0.26, 0.12); p.rotation.z = (i % 2 ? 1 : -1) * 0.05; g.add(p); U.crime.push(p);
      });
      return g;
    },
    cols: () => [[-0.82, 0, -0.14, 0.82, 2.4, 0.1]]
  };
  function gateRead(b) {
    const hs = heads(b); if (!hs.length) return false;
    if (!cool(b, 'gate', 25, '📜 传令官还在润嗓子')) return true;
    const T = ST().gateT; let sum = 0; const order = b.heads.map((h, i) => [h, i]).filter(x => x[0]);
    G.toast('📜 <b>宣读罪状</b>：「肃静！以下罪人，罪不容诛——」', '#ffe0b0', 2);
    order.forEach(([h, i], k) => later(700 + k * 650, () => {
      if (!alive(h) || h.mount !== b) return;
      const t = T[h.rec.id] || 0, m = 1.5 + Math.min(2, t / 600);
      sum += G.trigger(h, 'manual', m); SFX.squish(0.5); b._hit = b._hit || []; b._hit[i] = G.clock.elapsedTime;
      ft(h, `罪状：${crimeOf(h)}`, '#ffd0a0', 13);
      const p = h.g.position.clone().add(new V3(0, 0.05, 0.08)); G.burst(p, ['#6a8a2a', '#8a5a2a', '#a03020'][k % 3], 14, 1.1, 0.7, 5);
    }));
    later(700 + order.length * 650, () => G.toast(`📜 罪状宣读完毕，群众扔完了烂菜叶，心满意足地散去 · +${fmt(sum)} 魂晶`, '#ffe0b0', 3));
    return true;
  }

  // =====================================================================
  // 3) 缩首工坊
  // =====================================================================
  const TS_X = [-0.75, -0.45, -0.15, 0.15, 0.45, 0.75], TS_CORD = [1.28, 1.0], TS_SAG = 0.07, TS_S = 0.42;
  const sagY = (row, x) => TS_CORD[row] - TS_SAG * (1 - (x / 1.05) ** 2);
  C.tsantsa = {
    cat: 'func', n: '缩首工坊', icon: '🏺', base: 2000, grow: 1.6, fp: [1.2, 0.6], stat: { soul: 4, con: 1 }, depth: 2,
    desc: '【取材：南美舒阿尔人 tsantsa】放上来的首级先下铜锅煮一煮，缩到拳头大小，再用细绳挂到两架梯子之间的晾绳上，随风轻轻摆动。优点：省地方，一面墙能挂十二颗（缩过的首级以后拿下来也保持原尺寸，再挂上来就不用重煮）。每 10 秒 ×1.4 产出。空手按 E【摇晃晾绳】：一串风铃似的魂音从低到高响起，挂满 12 颗时 ×3。',
    mount: { y: 1.0, period: 10, mult: 1.4, labelY: 1.7, slots: [0, 1].flatMap(row => TS_X.map(x => [x, sagY(row, x) - 0.2, 0, 0])) },
    make() {
      const g = new THREE.Group();
      for (const sx of [-1, 1]) add(g, F('wooden_ladder', { h: 1.33, x: sx * 1.05, ry: PI / 2 }));
      const lm = new THREE.LineBasicMaterial({ color: '#8a7050' });
      for (let row = 0; row < 2; row++) {
        const pts = []; for (let k = 0; k <= 16; k++) { const x = -1.05 + k / 16 * 2.1; pts.push(new V3(x, sagY(row, x), 0)); }
        g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lm));
        const seg = []; for (const x of TS_X) { const y = sagY(row, x); seg.push(new V3(x, y, 0), new V3(x, y - 0.07, 0)); }
        g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), lm));
      }
      const pz = 0.5, pot = add(g, F('brass_pot_01', { w: 0.34, x: 0, y: 0.08, z: pz }));
      g.userData.potY = 0.08 + (pot ? pot.userData.size.y : 0.3); g.userData.potZ = pz;
      for (let k = 0; k < 8; k++) { const a = k / 8 * PI * 2; add(g, F('stone_01', { w: 0.13, x: Math.cos(a) * 0.24, y: 0, z: pz + Math.sin(a) * 0.24, ry: a })); }
      fl(g, 0, 0.02, pz, 0.35, '#ff9a4a');
      return g;
    },
    cols: () => [[-1.3, 0, -0.3, -0.8, 1.35, 0.3], [0.8, 0, -0.3, 1.3, 1.35, 0.3], [-0.25, 0, 0.25, 0.25, 0.4, 0.75]]
  };
  function tsRattle(b) {
    const hs = heads(b); if (!hs.length) return false;
    if (!cool(b, 'ts', 15, '🏺 晾绳还在晃')) return true;
    const full = hs.length === 12 && hs.every(h => h.rec.shrunk); let sum = 0; b._shake = G.clock.elapsedTime;
    b.heads.forEach((h, i) => { if (!h) return; later(120 + i * 140, () => { if (!alive(h) || h.mount !== b) return; sum += G.trigger(h, 'manual', full ? 3 : 1.5); try { SFX.soul(i, h.rec.c.rar); } catch (e) {} }); });
    later(120 + 12 * 140 + 200, () => { G.toast(`🏺 <b>摇晃晾绳</b>：${hs.length} 颗缩首叮叮当当${full ? ' · <b>十二颗挂满 ×3</b>' : ''} · +${fmt(sum)} 魂晶`, '#ffe0b0', 3); if (full) SFX.fanfare(2); });
    return true;
  }

  // =====================================================================
  // 4) 京观
  // =====================================================================
  const JG = (() => { const s = []; for (let k = 0; k < 6; k++) { const a = k / 6 * PI * 2, x = Math.cos(a) * 0.34, z = Math.sin(a) * 0.34; s.push([x, 0.02, z, Math.atan2(x, z)]); }
    for (let k = 0; k < 3; k++) { const a = k / 3 * PI * 2 + PI / 6, x = Math.cos(a) * 0.17, z = Math.sin(a) * 0.17; s.push([x, 0.25, z, Math.atan2(x, z)]); } s.push([0, 0.48, 0, 0]); return s; })();
  C.jingguan = {
    cat: 'func', n: '京观', icon: '⛰️', base: 3000, grow: 1.65, fp: [0.9, 0.9], stat: { ter: 8 }, depth: 2, aura: 2.6, auraMul: 1.2,
    desc: '【取材：中国古代「京观」】战胜者把首级堆成高冢，昭示武功。十颗首级堆成三层（6+3+1），全部面朝外，外圈一圈石头压阵。周围 2.6m 首级 ×1.2。每 18 秒 ×2.2 产出。空手按 E【擂鼓】：由下而上逐层擂鼓，堆满十颗 ×4；塔顶「冠首」若是全冢最高魂阶，再 ×1.5。',
    mount: { y: 0.02, period: 18, mult: 2.2, labelY: 1.1, slots: JG },
    make() { const g = new THREE.Group(); for (let k = 0; k < 14; k++) { const a = k / 14 * PI * 2; add(g, F('stone_01', { w: 0.2 + (k % 3) * 0.04, x: Math.cos(a) * 0.82, y: 0, z: Math.sin(a) * 0.82, ry: a * 2.3 })); } return g; },
    cols: () => [[-0.5, 0, -0.5, 0.5, 0.7, 0.5]]
  };
  function jgRite(b) {
    const hs = heads(b); if (!hs.length) return false;
    if (!cool(b, 'jg', 30, '⛰️ 鼓手在换鼓皮')) return true;
    const full = hs.length === 10, top = b.heads[9], crown = full && top && hs.every(h => h.rec.c.rar <= top.rec.c.rar);
    let sum = 0; const layers = [[0, 6], [6, 9], [9, 10]];
    layers.forEach(([a, z], L) => later(300 + L * 900, () => {
      SFX.thud(1, 0.7 + L * 0.15); snd('heavy', 0.4, 0.8 + L * 0.1);
      for (let i = a; i < z; i++) { const h = b.heads[i]; if (!alive(h) || h.mount !== b) continue; const m = (full ? 4 : 1.5) * (crown && i === 9 ? 1.5 : 1); sum += G.trigger(h, 'manual', m); G.burst(h.g.position, '#c8a060', 8, 0.8, 0.6, 2); }
      b._drum = G.clock.elapsedTime; b._layer = L;
    }));
    later(300 + 3 * 900, () => {
      G.toast(`⛰️ <b>擂鼓</b>：${hs.length}/10 颗${full ? ' · <b>京观筑成 ×4</b>' : ''}${crown ? ' · 冠首 ×1.5' : ''} · +${fmt(sum)} 魂晶`, '#ffe0b0', 3);
      if (full) { SFX.fanfare(3); G.flash && G.flash('#c8a060'); const R = ST(); if (!R.jg) { R.jg = 1; G.toast('⛰️ 你的第一座京观落成了。消息传开，野外的人远远望见你就开始发抖。', '#ffb070', 5); } }
    });
    return true;
  }

  // =====================================================================
  // 5) 圣髑贩子
  // =====================================================================
  const RL_X = [-0.45, -0.15, 0.15, 0.45];
  C.relic_altar = {
    cat: 'func', n: '圣髑贩子', icon: '🕯️', base: 1800, grow: 1.6, fp: [0.7, 0.7], stat: { soul: 3, con: 2 }, depth: 2, showcase: true,
    desc: '【取材：中世纪圣髑买卖与赎罪券】同一位圣人的头骨，能同时在好几座教堂里被供奉——每颗都有证书。哥特矮桌上四颗首级，每颗面前一张「唯一真品 · 第 N 颗」证书（编号全局递增，永不重复，非常权威）。首级在这里不按时产出，而是慢慢攒香火钱；圣魂/神魂算双倍。空手按 E【兜售赎罪券】：把香火钱一次收走。但卖得太勤信众会起疑：每卖一次信誉 -25%，约 90 秒恢复。',
    mount: { y: 0.55, period: 9999, mult: 0, labelY: 1.1, slots: RL_X.map(x => [x, 0.55, -0.05, 0]) },
    make() {
      const g = new THREE.Group(), d = C.relic_altar, U = g.userData;
      const tb = add(g, F('gothic_coffee_table', { w: 1.3 })); const top = tb ? topAt(g, 0, 0, tb.userData.size.y) : 0.5;
      d.mount.slots.forEach(s => { s[1] = top + 0.01; }); U.cert = [];
      RL_X.forEach(x => { const p = panel(0.24, 0.16, 'cert'); p.position.set(x, top + 0.012, 0.2); p.rotation.x = -PI / 2 + 0.35; g.add(p); U.cert.push(p); });
      for (const sx of [-1, 1]) { const c = add(g, F('brass_candleholders', { h: 0.8, x: sx * 0.95, z: 0 })); if (c) { const hh = c.userData.size.y; fl(g, sx * 0.95 - 0.12, hh, 0, 0.25, '#ffd08a'); fl(g, sx * 0.95 + 0.12, hh * 0.9, 0, 0.22, '#ffd08a'); } }
      return g;
    },
    cols: () => [[-0.66, 0, -0.66, 0.66, 0.55, 0.66]]
  };
  const holy = h => h.rec.c.rar >= 3 || h.rec.c.boss;
  function relicSell(b) {
    const hs = heads(b); if (!hs.length) return false;
    const pot = b._pot || 0, cred = b._cred == null ? 1 : b._cred;
    if (pot < 1) { G.toast('🕯️ 香火箱还是空的——让圣髑们再“显灵”一会儿', '#bbb', 1.8); return true; }
    const v = Math.max(1, Math.round(pot * cred)); G.addCoins(v); b._pot = 0; b._cred = cred * 0.75;
    SFX.coins(); snd('bell', 0.4, 1.3); for (const h of hs) G.burst(h.g.position.clone().add(new V3(0, 0.2, 0)), '#ffd84a', 10, 0.8, 0.8, -1);
    G.floatText('+' + fmt(v), localWorld(b, 0, 1.1, 0), '#ffd84a', 26);
    G.toast(`🕯️ <b>兜售赎罪券</b>：「钱币落进箱底叮当响，灵魂便从炼狱跳出来！」· 信誉 ${Math.round(cred * 100)}% · +${fmt(v)} 魂晶${cred < 0.5 ? ' · 信众开始交头接耳了' : ''}`, '#ffe0b0', 3.2);
    return true;
  }

  // =====================================================================
  // 6) 莎乐美之宴
  // =====================================================================
  const SF = [[0.62, 0.3], [0.62, -0.3], [0, 0.3], [0, -0.3], [-0.62, 0.3], [-0.62, -0.3]]; // 从右端（x+）开始的上菜顺序
  C.salome_feast = {
    cat: 'func', n: '莎乐美之宴', icon: '🍽️', base: 2400, grow: 1.6, fp: [1.1, 0.7], stat: { soul: 4, con: 2 }, depth: 2,
    desc: '【取材：《马可福音》施洗约翰之首】「把他的头放在盘子里，拿来给我。」——长餐桌铺着格子桌布，六只雕花木盘两两相对，首级们端坐盘中，面朝宾客。礼仪很重要：从桌子右端开始按魂阶从高到低摆满 = 礼序井然，×2.5。每 15 秒 ×1.9 产出。空手按 E【开宴】：首级逐一被高高托起、转一圈展示给宾客。',
    mount: { y: 0.8, period: 15, mult: 1.9, labelY: 1.45, slots: SF.map(([x, z]) => [x, 0.8, z, z > 0 ? 0 : PI]) },
    make() {
      const g = new THREE.Group(), d = C.salome_feast;
      const tb = add(g, F('dining_table', { w: 2.0 })); const top = tb ? topAt(g, 0.3, 0.1, tb.userData.size.y) : 0.77;
      SF.forEach(([x, z], i) => { const p = add(g, F('carved_wooden_plate', { w: 0.3, x, y: top, z })); d.mount.slots[i][1] = top + (p ? p.userData.size.y * 0.6 : 0.02); });
      for (const x of [-0.31, 0.31]) add(g, F('brass_goblets', { w: 0.3, x, y: top, z: 0, ry: x > 0 ? 0.4 : -0.3 }));
      fl(g, 0.95, top + 0.02, 0, 0.25, '#ffd08a');
      return g;
    },
    cols: () => [[-1.0, 0, -0.62, 1.0, 0.8, 0.62]]
  };
  const sfOrdered = b => { const hs = b.heads; if (hs.some(h => !h)) return false; for (let i = 1; i < hs.length; i++) if (hs[i].rec.c.rar > hs[i - 1].rec.c.rar) return false; return true; };
  function feast(b) {
    const hs = heads(b); if (!hs.length) return false;
    if (!cool(b, 'sf', 20, '🍽️ 厨房还在摆盘')) return true;
    const ord = sfOrdered(b); let sum = 0; b._lift = b._lift || [];
    G.toast('🍽️ <b>开宴</b>：「把头放在盘子里，拿来给我。」', '#ffe0b0', 2);
    b.heads.forEach((h, i) => { if (!h) return; later(500 + i * 600, () => { if (!alive(h) || h.mount !== b) return; b._lift[i] = G.clock.elapsedTime; sum += G.trigger(h, 'manual', 1.6 * (ord ? 2.5 : 1)); snd('plate', 0.5, 0.9 + i * 0.08); memory(h, 0.05); }); });
    later(500 + 6 * 600 + 400, () => { G.toast(`🍽️ 宴毕，${hs.length} 道“主菜”都展示过了${ord ? ' · <b>礼序井然 ×2.5</b>' : ' · 提示：从右端起按魂阶从高到低摆满可得 ×2.5'} · +${fmt(sum)} 魂晶`, '#ffe0b0', 3.2); if (ord) SFX.fanfare(2); });
    return true;
  }

  // =====================================================================
  // 7) 猎头祭鼓（节奏小游戏）
  // =====================================================================
  const DR = (() => { const s = []; for (let k = 0; k < 6; k++) { const a = k / 6 * PI * 2 + PI / 6, x = Math.cos(a) * 0.85, z = Math.sin(a) * 0.85; s.push([x, 0.1, z, Math.atan2(-x, -z)]); } return s; })();
  const BEAT = 0.75, NB = 8;
  C.drum_rite = {
    cat: 'func', n: '猎头祭鼓', icon: '🥁', base: 1500, grow: 1.6, fp: [1.0, 1.0], stat: { soul: 3, con: 1 }, depth: 1,
    desc: '【取材：东南亚与大洋洲历史上的猎头祭仪】带回首级后，全村围着鼓庆祝。六只藤篮围成一圈，首级们坐在篮里面朝中间一只倒扣的木桶鼓。每 11 秒 ×1.5 产出。空手按 E【起鼓】：金色圆环收缩到鼓面的瞬间再按 E 击鼓，共 8 拍（准 = perfect，稍偏 = good）。倍率 = 1 + 得分 × 0.45，8 拍全 perfect 再 +1.4。',
    mount: { y: 0.1, period: 11, mult: 1.5, labelY: 1.0, slots: DR },
    make() {
      const g = new THREE.Group(), d = C.drum_rite, U = g.userData;
      DR.forEach((s, i) => { const bk = add(g, F('wicker_basket_01', { w: 0.42, x: s[0], z: s[2], ry: s[3] })); d.mount.slots[i][1] = bk ? bk.userData.size.y * 0.55 : 0.07; });
      const drum = fitR('wooden_bucket_02', { w: 0.55, rx: PI }); if (drum) g.add(drum); const dh = drum ? drum.userData.size.y : 0.32; U.drumH = dh;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.235, 40), new THREE.MeshBasicMaterial({ color: '#ffd24a', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -PI / 2; ring.position.y = dh + 0.02; g.add(ring); U.ring = ring;
      const tgt = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.215, 40), new THREE.MeshBasicMaterial({ color: '#fff4c0', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
      tgt.rotation.x = -PI / 2; tgt.position.y = dh + 0.015; g.add(tgt); U.tgt = tgt;
      return g;
    },
    cols: () => [[-0.3, 0, -0.3, 0.3, 0.35, 0.3]]
  };
  let rite = null; // { b, t0, hits:[], score, perfect }
  const rnow = () => performance.now() / 1000;
  function drumE(b) {
    if (rite) return drumHit();
    const hs = heads(b); if (!hs.length) return false;
    if (!cool(b, 'dr', 14, '🥁 鼓手在喝水')) return true;
    rite = { b, t0: rnow() + 1.2, hits: new Array(NB).fill(null), score: 0, perfect: 0 };
    G.toast('🥁 <b>起鼓</b>！金环收缩到鼓面时按 E（8 拍）', '#ffe0b0', 2.2); snd('wood', 0.5, 0.6);
    return true;
  }
  function drumHit() {
    const t = rnow() - rite.t0, k = Math.round(t / BEAT); if (k < 0 || k >= NB || rite.hits[k] != null) { SFX.thud(0.3, 1.4); return true; }
    const dtt = Math.abs(t - k * BEAT), b = rite.b;
    const res = dtt < 0.09 ? 'perfect' : dtt < 0.2 ? 'good' : 'miss'; rite.hits[k] = res;
    if (res === 'perfect') { rite.score += 1; rite.perfect++; } else if (res === 'good') rite.score += 0.5;
    SFX.thud(res === 'miss' ? 0.4 : 1, res === 'perfect' ? 1.1 : 0.9);
    G.floatText(res === 'perfect' ? 'PERFECT' : res === 'good' ? 'GOOD' : 'MISS', localWorld(b, 0, (b.g.userData.drumH || 0.3) + 0.5, 0), res === 'perfect' ? '#ffd24a' : res === 'good' ? '#9fe0ff' : '#ff8080', res === 'perfect' ? 22 : 17);
    if (res !== 'miss') G.burst(localWorld(b, 0, (b.g.userData.drumH || 0.3) + 0.05, 0), res === 'perfect' ? '#ffd24a' : '#c8a060', res === 'perfect' ? 16 : 8, 1, 0.5, 2);
    b._beat = G.clock.elapsedTime;
    return true;
  }
  function drumTick() {
    if (!rite) return; const b = rite.b, U = b.g.userData, t = rnow() - rite.t0;
    if (!G.builds.includes(b)) { rite = null; return; }
    const k = Math.max(0, Math.ceil((t - 0.2) / BEAT)); // 下一个待打的拍
    for (let i = 0; i < NB; i++) if (rite.hits[i] == null && t > i * BEAT + 0.2) rite.hits[i] = 'miss';
    if (U.ring) { if (k < NB) { const until = k * BEAT - t, s = 1 + Math.max(0, until) / BEAT * 1.6; U.ring.scale.setScalar(s); U.ring.material.opacity = 0.9; U.tgt.material.opacity = 0.6; } else { U.ring.material.opacity = 0; U.tgt.material.opacity = 0; } }
    if (t > (NB - 1) * BEAT + 0.35) {
      const r = rite; rite = null; const all = r.perfect === NB, mult = 1 + r.score * 0.45 + (all ? 1.4 : 0); let sum = 0;
      if (U.ring) { U.ring.material.opacity = 0; U.tgt.material.opacity = 0; }
      heads(b).forEach((h, i) => later(i * 110, () => { if (alive(h) && h.mount === b) sum += G.trigger(h, 'manual', mult); }));
      later(heads(b).length * 110 + 100, () => {
        const best = ST().best || 0; if (r.score > best) ST().best = r.score;
        G.toast(`🥁 <b>祭鼓</b>：perfect ${r.perfect} · 得分 ${r.score}/${NB}${all ? ' · <b>全 perfect +1.4</b>' : ''} · ×${mult.toFixed(2)} · +${fmt(sum)} 魂晶${r.score > best ? ' · 新纪录！' : ''}`, '#ffe0b0', 3.2);
        if (all) { SFX.fanfare(3); G.flash && G.flash('#ffd24a'); }
      });
    }
  }

  // =====================================================================
  // 解锁条件
  // =====================================================================
  (function unlocks() {
    if (!window.Unlocks || !Unlocks.R) return;
    const R = Unlocks.R, H = S => S.heads.length, T = S => (S.stats && S.stats.trips) || 0, E = S => (S.stats && S.stats.earned) || 0;
    const maxRar = S => S.heads.reduce((m, r) => Math.max(m, r.c.rar), -1);
    R.kubi_jikken = [S => H(S) >= 5, '五颗首级了。按老规矩，得请大将来验一验——先去打一盆洗首的水。'];
    R.drum_rite = [S => T(S) >= 2 && H(S) >= 6, '出猎归来，按古俗要围着首级击鼓庆祝。你在村口捡到一只还能敲的木桶。'];
    R.traitor_gate = [S => T(S) >= 3 && H(S) >= 7, '你拆回一扇旧城门。门顶那几柄剑，本来就是用来挂东西的。'];
    R.salome_feast = [S => H(S) >= 6 && E(S) >= 3000, '「把头放在盘子里，拿来给我。」——你终于攒够钱买了一张像样的长餐桌。'];
    R.relic_altar = [S => maxRar(S) >= 3, '你有了一颗圣魂。地精斯尼克搓着手：「这可是唯一真品……我们可以多开几张证书。」'];
    R.tsantsa = [S => T(S) >= 4 && H(S) >= 10, '洞里快放不下了。一位远方来的旅人说：他们家乡有一种省地方的办法。'];
    R.jingguan = [S => H(S) >= 15 && (S.depth || 0) >= 2, '首级多到可以堆成山了——古人管这叫「京观」。'];
  })();

  // =====================================================================
  // 每帧：面板刷新 / 动画 / 缩首 / 被动收益
  // =====================================================================
  const _v = new V3();
  function tick(dt, now) {
    if (!G.builds) return;
    drumTick();
    for (const b of G.builds) {
      const t = b.type, d = C[t]; if (!d || !b.heads) continue;
      if (t === 'kubi_jikken') {
        const U = b.g.userData;
        if (!b._first || !b.heads.some(h => h && h.rec.id === b._first)) { const f = b.heads.find(Boolean); b._first = f ? f.rec.id : null; }
        b.heads.forEach((h, i) => { if (U.tags && U.tags[i]) draw(U.tags[i], h ? [KJ_RANK[kjRank(h)]] : null, h ? (kjRank(h) >= 3 ? '#8a1010' : '#1a1008') : null);
          const lk = b._look && b._look[i] ? now - b._look[i] : 9; if (h && h !== G.held && (lk < 1.2 || b._kjDirty)) reseat(b, i, { rx: Math.sin(Math.min(1, lk / 1.2) * PI) * 0.3 }); });
        b._kjDirty = b._look && b._look.some(x => x && now - x < 1.3);
      } else if (t === 'traitor_gate') {
        const T = ST().gateT, U = b.g.userData;
        b.heads.forEach((h, i) => { if (!h) { if (U.crime && U.crime[i]) draw(U.crime[i], null); return; } T[h.rec.id] = (T[h.rec.id] || 0) + dt;
          if (U.crime && U.crime[i]) draw(U.crime[i], ['罪 状', String(h.rec.c.name || '').slice(0, 8), crimeOf(h)]);
          const hk = b._hit && b._hit[i] ? now - b._hit[i] : 9; if (h !== G.held && (hk < 0.6 || b._tgDirty)) reseat(b, i, { rz: Math.sin(hk * 25) * 0.12 * Math.max(0, 1 - hk / 0.6) }); });
        b._tgDirty = b._hit && b._hit.some(x => x && now - x < 0.7);
        if (b.timer < (b._lastT || 0)) for (const h of heads(b)) { const ex = Math.min(2, (T[h.rec.id] || 0) / 600); if (ex > 0.02) G.trigger(h, 'auto', d.mount.mult * ex); }
        b._lastT = b.timer;
      } else if (t === 'tsantsa') {
        const U = b.g.userData, sh = b._shake ? now - b._shake : 99;
        b.heads.forEach((h, i) => {
          if (!h || h === G.held) return;
          const s = d.mount.slots[i];
          if (!h.rec.shrunk) { // 下锅煮
            h._boil = h._boil || now; const k = Math.min(1, (now - h._boil) / 2.6), sc = 1 - (1 - TS_S) * k;
            h.g.scale.setScalar(sc); seatAt(h, localWorld(b, 0, (U.potY || 0.38) - 0.12 + Math.sin(now * 9) * 0.02, U.potZ || 0.5), slotQuat(b, s, 0, Math.sin(now * 5) * 0.2, now * 2), sc);
            if (Math.random() < dt * 8) G.burst(localWorld(b, 0, (U.potY || 0.38) + 0.05, U.potZ || 0.5), '#e8e8e8', 2, 0.25, 0.9, -1.2);
            if (k >= 1) { h.rec.shrunk = 1; h._boil = 0; SFX.squish(0.4); ft(h, '缩好了', '#e8d0a0', 14); }
            return;
          }
          h.g.scale.setScalar(TS_S); h._shr = 1;
          const amp = 0.05 + (sh < 3 ? (1 - sh / 3) * 0.5 : 0), sw = Math.sin(now * (1.6 + (i % 5) * 0.13) + i) * amp;
          seatAt(h, slotWorld(b, s), slotQuat(b, s, 0, sw, Math.sin(now * 0.4 + i) * 0.3), TS_S);
        });
      } else if (t === 'jingguan') {
        const dk = b._drum ? now - b._drum : 9;
        if (dk < 0.5 || b._jgDirty) for (let i = 0; i < 10; i++) { const inL = b._layer === 0 ? i < 6 : b._layer === 1 ? i >= 6 && i < 9 : i === 9; reseat(b, i, { dy: inL ? Math.sin(Math.min(1, dk / 0.5) * PI) * 0.05 : 0 }); }
        b._jgDirty = dk < 0.6;
      } else if (t === 'relic_altar') {
        const U = b.g.userData, R = ST();
        b._cred = Math.min(1, (b._cred == null ? 1 : b._cred) + dt / 360);
        b.heads.forEach((h, i) => { if (h && !h.rec.relic) h.rec.relic = ++R.relicNo; if (U.cert && U.cert[i]) draw(U.cert[i], h ? ['圣髑证书', `圣·${String(h.rec.c.name || '').slice(0, 6)}之首`, `唯一真品 · 第 ${h.rec.relic} 颗`] : null);
          if (h) b._pot = (b._pot || 0) + (h.yield || 1) * (holy(h) ? 2 : 1) * 0.12 * dt; });
      } else if (t === 'salome_feast') {
        const L = b._lift || []; let dirty = false;
        for (let i = 0; i < 6; i++) { const h = b.heads[i]; if (!h || h === G.held) continue; const k = L[i] ? now - L[i] : 9; if (k < 1.3) { dirty = true; const e = Math.sin(Math.min(1, k / 1.3) * PI); reseat(b, i, { dy: e * 0.35, ry: Math.min(1, k / 1.3) * PI * 2 }); } else if (b._sfDirty) reseat(b, i); }
        b._sfDirty = dirty;
      } else if (t === 'drum_rite') {
        const bk = b._beat ? now - b._beat : 9, on = rite && rite.b === b;
        if (on || bk < 0.4 || b._drDirty) b.heads.forEach((h, i) => { if (h && h !== G.held) reseat(b, i, { dy: Math.max(0, 1 - bk / 0.25) * 0.05, rx: on ? Math.sin(now * 8.4 + i) * 0.06 : 0 }); });
        b._drDirty = on || bk < 0.5;
      }
    }
    // 缩首离开工坊后恢复原尺寸
    if (!tick._t || now - tick._t > 0.25) { tick._t = now; for (const h of G.heads) if (h._shr && (!h.mount || h.mount.type !== 'tsantsa')) { h._shr = 0; h.g.scale.setScalar(1); } }
  }

  function onE(hit, held, pickup) {
    if (rite && !held) return drumHit();
    const b = hit && hit.build; if (!b || held || pickup) return false;
    switch (b.type) {
      case 'kubi_jikken': return kjInspect(b);
      case 'traitor_gate': return gateRead(b);
      case 'tsantsa': return tsRattle(b);
      case 'jingguan': return jgRite(b);
      case 'relic_altar': return relicSell(b);
      case 'salome_feast': return feast(b);
      case 'drum_rite': return drumE(b);
    }
    return false;
  }
  function onTip(hit, held) {
    const b = hit && hit.build; if (!b || !C[b.type] || held) return null;
    if (hit.head) return null;
    const hs = heads(b), cnt = `（${hs.length}/${b.heads ? b.heads.length : 0}）`;
    switch (b.type) {
      case 'kubi_jikken': return `<b>🏯 首実検台</b>${cnt} · <b>[E]</b> ${b._omen && cdLeft(b, 'kj') > 0 ? '首供养（凶首 ×3）' : '首実検'} · 手持首级按 E 摆上砧板`;
      case 'traitor_gate': { const T = ST().gateT, m = hs.length ? Math.max(...hs.map(h => T[h.rec.id] || 0)) : 0; return `<b>🚪 叛徒之门</b>${cnt} · 最久示众 ${Math.floor(m / 60)} 分钟（额外 ×${(1 + Math.min(2, m / 600)).toFixed(2)}）· <b>[E]</b> 宣读罪状`; }
      case 'tsantsa': return `<b>🏺 缩首工坊</b>${cnt} · <b>[E]</b> 摇晃晾绳${hs.length === 12 ? '（挂满 ×3）' : ''}`;
      case 'jingguan': return `<b>⛰️ 京观</b>${cnt} · <b>[E]</b> 擂鼓${hs.length === 10 ? '（筑成 ×4）' : ''}`;
      case 'relic_altar': return `<b>🕯️ 圣髑贩子</b>${cnt} · 香火箱 ${fmt(b._pot || 0)} · 信誉 ${Math.round((b._cred == null ? 1 : b._cred) * 100)}% · <b>[E]</b> 兜售赎罪券`;
      case 'salome_feast': return `<b>🍽️ 莎乐美之宴</b>${cnt}${sfOrdered(b) ? ' · 礼序井然 ×2.5' : ''} · <b>[E]</b> 开宴`;
      case 'drum_rite': return `<b>🥁 猎头祭鼓</b>${cnt} · 最佳 ${ST().best || 0}/${NB} · <b>[E]</b> 起鼓`;
    }
    return null;
  }

  const wait = setInterval(() => {
    if (!window.G || !G.HOOK) return;
    clearInterval(wait);
    G.HOOK.frame.push(tick); G.HOOK.e.unshift(onE); G.HOOK.tip.push(onTip);
    if (window.Unlocks && Unlocks.scan && G.S) try { Unlocks.scan(true); } catch (e) {}
  }, 150);

  return { _dbg: { fitR, kjInspect, gateRead, tsRattle, jgRite, relicSell, feast, drumE, get rite() { return rite; } } };
})();
